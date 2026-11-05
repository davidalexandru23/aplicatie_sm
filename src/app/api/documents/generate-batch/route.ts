import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import PizZip from 'pizzip';
import { prisma } from '@/lib/prisma';
import { generateDocument } from '@/lib/templates/generator';
import { resolveTemplatePlaceholders } from '@/lib/templates/resolver';
import { calculateEmployeeCompliance, EmployeeComplianceSummary } from '@/lib/compliance';
import { TEMPLATE_CATALOG } from '@/lib/templates/definitions';

const STORAGE_DOCS_DIR = path.join(process.cwd(), 'storage', 'documents');

if (!fs.existsSync(STORAGE_DOCS_DIR)) {
  fs.mkdirSync(STORAGE_DOCS_DIR, { recursive: true });
}

export function checkEmployeeTemplateExpiry(
  templateCode: string,
  compliance: EmployeeComplianceSummary
): { isExpired: boolean; reason?: string } {
  const code = templateCode.toLowerCase();

  // 1. Instruire SSM (Legea 319/2006, HG 1425/2006)
  if (code.includes('ssm') || code.includes('instruire') || code === 'training-detaliu-introductiv' || code === 'training-tematica-loc-munca') {
    if (compliance.ssmTraining.status === 'OVERDUE') {
      const days = Math.abs(compliance.ssmTraining.daysRemaining ?? 0);
      return {
        isExpired: true,
        reason: `Instructajul SSM este expirat (depășit cu ${days} zile conform HG 1425/2006).`,
      };
    }
  }

  // 2. Instruire PSI/SU (Legea 307/2006, OMAI 712/2005)
  if (code.includes('psi')) {
    if (compliance.psiTraining.status === 'OVERDUE') {
      const days = Math.abs(compliance.psiTraining.daysRemaining ?? 0);
      return {
        isExpired: true,
        reason: `Instructajul PSI/SU este expirat (depășit cu ${days} zile conform OMAI 712/2005).`,
      };
    }
  }

  // 3. Medicină a Muncii (HG 355/2007)
  if (code.includes('med-') || code.includes('medical')) {
    if (compliance.occupationalMedicine.status === 'OVERDUE') {
      const days = Math.abs(compliance.occupationalMedicine.daysRemaining ?? 0);
      return {
        isExpired: true,
        reason: `Examenul de Medicină a Muncii este expirat (depășit cu ${days} zile conform HG 355/2007).`,
      };
    }
  }

  // 4. Cursuri Igienă (Ord. 2209/2022)
  if (code.includes('hygiene') || code.includes('igiena')) {
    if (compliance.hygieneCertificate && compliance.hygieneCertificate.status === 'OVERDUE') {
      const days = Math.abs(compliance.hygieneCertificate.daysRemaining ?? 0);
      return {
        isExpired: true,
        reason: `Certificatul de igienă este expirat (depășit cu ${days} zile conform Ord. 2209/2022).`,
      };
    }
  }

  return { isExpired: false };
}

function sanitizeFileName(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      templateCode,
      clientId,
      employeeIds,
      customFields,
      operatorName = 'Operator Colectiv SSM',
    } = body as {
      templateCode: string;
      clientId: string;
      employeeIds: string[];
      customFields?: Record<string, unknown>;
      operatorName?: string;
    };

    if (!templateCode || !clientId) {
      return NextResponse.json(
        { error: 'Codul șablonului și clientul sunt obligatorii.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Trebuie să selectați cel puțin un salariat pentru generarea colectivă.' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    const templateDef = TEMPLATE_CATALOG.find((t) => t.code === templateCode);
    if (!templateDef) {
      return NextResponse.json(
        { error: `Șablonul ${templateCode} nu a fost găsit în catalog.` },
        { status: 404 }
      );
    }

    // Preluare salariați selectați
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        clientId,
      },
      include: {
        currentJob: true,
        currentWorksite: true,
        identityDocument: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'Niciun salariat valid găsit pentru firma selectată.' },
        { status: 400 }
      );
    }

    // Verificare conformitate: NU permite selectarea unui salariat cu termen expirat
    const rejectedEmployees: Array<{ name: string; reason: string }> = [];

    for (const emp of employees) {
      const comp = calculateEmployeeCompliance(emp);
      const expiryCheck = checkEmployeeTemplateExpiry(templateCode, comp);
      if (expiryCheck.isExpired) {
        rejectedEmployees.push({
          name: `${emp.lastName} ${emp.firstName}`,
          reason: expiryCheck.reason || 'Termen legal expirat',
        });
      }
    }

    if (rejectedEmployees.length > 0) {
      const details = rejectedEmployees
        .map((r) => `• ${r.name}: ${r.reason}`)
        .join('\n');
      return NextResponse.json(
        {
          error: `Generarea a fost blocată conform legii. Următorii salariați au termene expirate:\n${details}`,
          rejectedEmployees,
        },
        { status: 400 }
      );
    }

    // Inițializare arhivă ZIP în memorie
    const zip = new PizZip();
    const batchId = crypto.randomUUID();
    const generatedDocuments: Array<{
      documentId: string;
      employeeId: string;
      employeeName: string;
      jobTitle: string;
      fileName: string;
      downloadUrl: string;
      fileSizeBytes: number;
    }> = [];

    // Generare document per salariat
    for (const emp of employees) {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode,
        clientId,
        employeeId: emp.id,
        jobId: emp.currentJobId || undefined,
        customOverrides: customFields && typeof customFields === 'object' ? customFields : {},
      });

      const genResult = await generateDocument({
        templateCode,
        clientId,
        employeeId: emp.id,
        jobId: emp.currentJobId || undefined,
        data: resolvedData,
        operatorName,
      });

      const fileBuffer = fs.readFileSync(genResult.filePath);
      const ext = path.extname(genResult.filePath) || `.${templateDef.format}`;
      const empSafeName = sanitizeFileName(`${emp.lastName}_${emp.firstName}`);
      const tplSafeName = sanitizeFileName(templateDef.name);
      const zipEntryName = `${empSafeName} - ${tplSafeName}${ext}`;

      zip.file(zipEntryName, fileBuffer);

      generatedDocuments.push({
        documentId: genResult.documentId,
        employeeId: emp.id,
        employeeName: `${emp.lastName} ${emp.firstName}`,
        jobTitle: emp.currentJob?.title || 'Salariat',
        fileName: zipEntryName,
        downloadUrl: `/api/documents/${genResult.documentId}/download`,
        fileSizeBytes: genResult.fileSizeBytes,
      });
    }

    // Salvare arhivă ZIP pe disc
    const clientSafeName = sanitizeFileName(client.name);
    const tplSafeCode = sanitizeFileName(templateDef.code);
    const zipFileName = `Pachet_${tplSafeCode}_${clientSafeName}_${employees.length}_salariati.zip`;
    const zipPath = path.join(STORAGE_DOCS_DIR, `batch_${batchId}.zip`);

    const zipBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(zipPath, zipBuffer);

    return NextResponse.json({
      success: true,
      batchId,
      templateCode,
      templateName: templateDef.name,
      clientName: client.name,
      totalGenerated: generatedDocuments.length,
      zipFileName,
      zipDownloadUrl: `/api/documents/batch/${batchId}/download?filename=${encodeURIComponent(zipFileName)}`,
      zipSizeBytes: zipBuffer.length,
      documents: generatedDocuments,
    });
  } catch (error: unknown) {
    console.error('Error in generate-batch route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare la generarea colectivă a documentelor.' },
      { status: 500 }
    );
  }
}
