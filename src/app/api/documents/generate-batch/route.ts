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
import { parseSessionFromCookieHeader, UserRole } from '@/lib/auth';
import { isTemplateAllowedForRole, ROLE_CONFIG } from '@/lib/rbac';

const STORAGE_DOCS_DIR = path.join(process.cwd(), 'storage', 'documents');

if (!fs.existsSync(STORAGE_DOCS_DIR)) {
  fs.mkdirSync(STORAGE_DOCS_DIR, { recursive: true });
}

export function checkEmployeeTemplateExpiry(
  templateCode: string,
  compliance: EmployeeComplianceSummary,
  employee?: { status?: string | null; medicalFitnessVerdict?: string | null }
): { isExpired: boolean; reason?: string } {
  if (employee?.status === 'PLECAT' || compliance.isTerminated) {
    return {
      isExpired: true,
      reason: 'Salariatul are contractul de muncă încetat (status PLECAT). Generarea documentelor este interzisă conform legii.',
    };
  }

  if (employee?.medicalFitnessVerdict === 'INAPT' || employee?.medicalFitnessVerdict === 'INAPT_TEMPORAR') {
    return {
      isExpired: true,
      reason: 'Aviz medical: INAPT conform HG 355/2007. Generarea documentelor operaționale este blocată.',
    };
  }

  const code = templateCode.toLowerCase();

  // Exclude statutory training templates from hard overdue rejection (HG 1425/2006, OMAI 712/2005):
  // Training sheets must be generated to conduct and record reinstatement training.
  const isTrainingTemplate =
    code.includes('fisa-instruire') ||
    code.includes('fisa-instructaj') ||
    code.includes('pv-instruire') ||
    code.startsWith('training-');

  // 1. Instruire SSM (Legea 319/2006, HG 1425/2006)
  if (!isTrainingTemplate && (code.includes('ssm') || code.includes('instruire') || code === 'training-detaliu-introductiv' || code === 'training-tematica-loc-munca')) {
    if (compliance.ssmTraining.status === 'OVERDUE') {
      const days = Math.abs(compliance.ssmTraining.daysRemaining ?? 0);
      return {
        isExpired: true,
        reason: `Instructajul SSM este expirat (depășit cu ${days} zile conform HG 1425/2006).`,
      };
    }
  }

  // 2. Instruire PSI/SU (Legea 307/2006, OMAI 712/2005)
  if (!isTrainingTemplate && code.includes('psi')) {
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

    // Role-Based Access Control (RBAC) validation for batch generation
    const sessionCookie = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(sessionCookie);
    const userRole: UserRole = session?.role || 'ADMIN';

    if (!isTemplateAllowedForRole({ code: templateCode }, userRole)) {
      return NextResponse.json(
        { error: `Rolul dumneavoastră (${ROLE_CONFIG[userRole].label}) nu are permisiunea de a genera documente pentru șablonul "${templateCode}".` },
        { status: 403 }
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

    // Clasificare salariați: Terminați (PLECAT), Expirați (Overdue), Eligibili
    const terminatedEmployees = employees.filter((e) => e.status === 'PLECAT');
    const activeEmployees = employees.filter((e) => e.status !== 'PLECAT');

    const overdueEmployees: Array<{ name: string; reason: string; emp: (typeof employees)[0] }> = [];
    const eligibleEmployees: Array<(typeof employees)[0]> = [];

    for (const emp of activeEmployees) {
      const comp = calculateEmployeeCompliance(emp);
      const expiryCheck = checkEmployeeTemplateExpiry(templateCode, comp, emp);
      if (expiryCheck.isExpired) {
        overdueEmployees.push({
          name: `${emp.lastName} ${emp.firstName}`,
          reason: expiryCheck.reason || 'Termen legal expirat',
          emp,
        });
      } else {
        eligibleEmployees.push(emp);
      }
    }

    // Compatibilitate înapoi: dacă NICIUN salariat cerut nu este eligibil, respinge cu HTTP 400
    if (eligibleEmployees.length === 0) {
      if (terminatedEmployees.length > 0 && overdueEmployees.length === 0) {
        const names = terminatedEmployees.map((e) => `${e.lastName} ${e.firstName}`).join(', ');
        return NextResponse.json(
          {
            error: `Generarea colectivă a fost respinsă. Următorii salariați au contractul de muncă încetat (status PLECAT): ${names}. Documentele statutare pot fi emise exclusiv pentru salariați activi.`,
            terminatedEmployees: terminatedEmployees.map((e) => ({
              id: e.id,
              name: `${e.lastName} ${e.firstName}`,
            })),
          },
          { status: 400 }
        );
      }

      if (overdueEmployees.length > 0) {
        const details = overdueEmployees
          .map((r) => `• ${r.name}: ${r.reason}`)
          .join('\n');
        return NextResponse.json(
          {
            error: `Generarea a fost blocată conform legii. Următorii salariați au termene expirate:\n${details}`,
            rejectedEmployees: overdueEmployees.map((r) => ({ name: r.name, reason: r.reason })),
          },
          { status: 400 }
        );
      }
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
    const failedDocuments: Array<{
      employeeId: string;
      employeeName: string;
      jobTitle: string;
      error: string;
    }> = [];
    const logEntries: Array<{
      name: string;
      jobTitle: string;
      status: 'SUCCES' | 'EROARE' | 'OMIS - EXPIRAT' | 'OMIS - PLECAT';
      details: string;
    }> = [];

    // Jurnalizare salariați omiși din start (PLECAT sau termen expirat)
    for (const termEmp of terminatedEmployees) {
      logEntries.push({
        name: `${termEmp.lastName} ${termEmp.firstName}`,
        jobTitle: termEmp.currentJob?.title || 'Salariat',
        status: 'OMIS - PLECAT',
        details: 'Contract de muncă încetat (status PLECAT)',
      });
    }

    for (const ovEmp of overdueEmployees) {
      logEntries.push({
        name: ovEmp.name,
        jobTitle: ovEmp.emp.currentJob?.title || 'Salariat',
        status: 'OMIS - EXPIRAT',
        details: ovEmp.reason,
      });
    }

    // Generare document per salariat eligibil cu izolare try/catch
    for (const emp of eligibleEmployees) {
      try {
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

        logEntries.push({
          name: `${emp.lastName} ${emp.firstName}`,
          jobTitle: emp.currentJob?.title || 'Salariat',
          status: 'SUCCES',
          details: `Generat cu succes (${zipEntryName}, ${(genResult.fileSizeBytes / 1024).toFixed(1)} KB)`,
        });
      } catch (empErr: unknown) {
        console.error(`Eroare la generarea documentului pentru salariatul ${emp.id}:`, empErr);
        const errMsg = empErr instanceof Error ? empErr.message : String(empErr);
        failedDocuments.push({
          employeeId: emp.id,
          employeeName: `${emp.lastName} ${emp.firstName}`,
          jobTitle: emp.currentJob?.title || 'Salariat',
          error: errMsg,
        });
        logEntries.push({
          name: `${emp.lastName} ${emp.firstName}`,
          jobTitle: emp.currentJob?.title || 'Salariat',
          status: 'EROARE',
          details: `Eșec generare: ${errMsg}`,
        });
      }
    }

    if (generatedDocuments.length === 0 && eligibleEmployees.length > 0) {
      return NextResponse.json(
        {
          error: 'Toate încercările de generare din acest lot au eșuat.',
          failedDocuments,
        },
        { status: 500 }
      );
    }

    // Generare fișier jurnal structurat 00_RAPORT_GENERARE_LOT.txt în rădăcina ZIP-ului
    const nowRo = new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
    const totalRequested = employees.length;
    const successCount = generatedDocuments.length;
    const failedCount = failedDocuments.length;
    const omittedCount = terminatedEmployees.length + overdueEmployees.length;
    const successRate = totalRequested > 0 ? Math.round((successCount / totalRequested) * 100) : 0;

    const reportLines: string[] = [
      '================================================================================',
      'RAPORT GENERARE COLECTIVĂ DOCUMENTE STATUTARE SSM / HR',
      '================================================================================',
      `Data generării         : ${nowRo}`,
      `Companie / Angajator   : ${client.name} (CUI: ${client.cui})`,
      `Șablon statutar        : ${templateDef.name} (${templateDef.code})`,
      `Operator SSM           : ${operatorName || 'Operator Intern'}`,
      '--------------------------------------------------------------------------------',
      `Total salariați ceruți : ${totalRequested}`,
      `Generări reușite       : ${successCount}`,
      `Generări eșuate        : ${failedCount}`,
      `Salariați omiși        : ${omittedCount} (${overdueEmployees.length} expirați, ${terminatedEmployees.length} contract încetat)`,
      `Rată de succes         : ${successRate}%`,
      '================================================================================',
      'DETALII SALARIAȚI:',
      '--------------------------------------------------------------------------------',
    ];

    for (const item of logEntries) {
      const statusTag = `[${item.status}]`.padEnd(18, ' ');
      reportLines.push(`${statusTag} ${item.name} (${item.jobTitle}) - ${item.details}`);
    }

    reportLines.push('================================================================================');
    reportLines.push('Document emis automat conform Legii 319/2006 și HG 1425/2006.');
    reportLines.push('================================================================================');

    const reportContent = reportLines.join('\n');
    zip.file('00_RAPORT_GENERARE_LOT.txt', Buffer.from(reportContent, 'utf-8'));

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
      totalRequested,
      totalGenerated: generatedDocuments.length,
      totalFailed: failedDocuments.length,
      totalOmitted: omittedCount,
      zipFileName,
      zipDownloadUrl: `/api/documents/batch/${batchId}/download?filename=${encodeURIComponent(zipFileName)}`,
      zipSizeBytes: zipBuffer.length,
      documents: generatedDocuments,
      failedDocuments,
    });
  } catch (error: unknown) {
    console.error('Error in generate-batch route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare la generarea colectivă a documentelor.' },
      { status: 500 }
    );
  }
}
