import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { prisma } from '../prisma';
import { logAuditEvent } from '../security';
import { TEMPLATE_CATALOG, TemplateDefinition, TemplateFieldDef } from './definitions';

const STORAGE_DOCS_DIR = path.join(process.cwd(), 'storage', 'documents');

if (!fs.existsSync(STORAGE_DOCS_DIR)) {
  fs.mkdirSync(STORAGE_DOCS_DIR, { recursive: true });
}

export interface GenerationResult {
  documentId: string;
  templateCode: string;
  title: string;
  status: 'draft' | 'missing_data' | 'approved_for_print';
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  missingFields: string[];
}

function cleanPdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[șş]/g, 's')
    .replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't')
    .replace(/[ȚŢ]/g, 'T')
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A');
}

export function validateMissingFields(
  fieldDefs: TemplateFieldDef[],
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];
  for (const f of fieldDefs) {
    if (f.required) {
      const val = data[f.key];
      if (val === undefined || val === null || val === '') {
        missing.push(f.label);
      }
    }
  }
  return missing;
}

export async function generateDocument(params: {
  templateCode: string;
  clientId: string;
  employeeId?: string;
  jobId?: string;
  eventId?: string;
  hygieneSessionId?: string;
  data: Record<string, unknown>;
  operatorName: string;
}): Promise<GenerationResult> {
  const template = await prisma.template.findUnique({
    where: { code: params.templateCode },
  });

  if (!template) {
    throw new Error(`Șablonul cu codul ${params.templateCode} nu a fost găsit în catalog.`);
  }

  const catalogDef = TEMPLATE_CATALOG.find((t) => t.code === params.templateCode);
  const manifest = JSON.parse(template.manifestJson || '{}');
  const fieldDefs: TemplateFieldDef[] = manifest.fields || catalogDef?.fields || [];

  const missingFields = validateMissingFields(fieldDefs, params.data);
  const isComplete = missingFields.length === 0;
  const status: 'draft' | 'missing_data' | 'approved_for_print' = isComplete
    ? 'approved_for_print'
    : 'missing_data';

  const docId = crypto.randomUUID();
  const templateFilePath = path.join(
    process.cwd(),
    'templates_registry',
    'normalized',
    template.normalizedFilename
  );

  if (!fs.existsSync(templateFilePath)) {
    throw new Error(`Fișierul șablon fizic lipsește de pe disc: ${templateFilePath}`);
  }

  let outputBuffer: Buffer;
  let ext = 'docx';
  let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (template.format === 'docx') {
    ext = 'docx';
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const content = fs.readFileSync(templateFilePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '_______________',
    });

    doc.render(params.data);
    outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  } else if (template.format === 'pdf') {
    ext = 'pdf';
    mimeType = 'application/pdf';

    const pdfBytes = fs.readFileSync(templateFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { height } = firstPage.getSize();

    if (params.templateCode === 'hr-cerere-angajare') {
      const empName = cleanPdfText(String(params.data.employee_name || ''));
      const addr = cleanPdfText(String(params.data.address_full || ''));
      const docSeries = cleanPdfText(String(params.data.doc_series || ''));
      const docNum = cleanPdfText(String(params.data.doc_number || ''));
      const docIssued = cleanPdfText(String(params.data.doc_issued_by || ''));
      const docDate = cleanPdfText(String(params.data.doc_issue_date || ''));
      const company = cleanPdfText(String(params.data.client_name || ''));
      const job = cleanPdfText(String(params.data.job_title || ''));
      const hireDate = cleanPdfText(String(params.data.hire_date || ''));

      firstPage.drawText(empName, { x: 190, y: height - 128, size: 10, font: fontBold, color: rgb(0, 0, 0.7) });
      firstPage.drawText(addr, { x: 380, y: height - 128, size: 9, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(`${docSeries}  ${docNum}`, { x: 260, y: height - 156, size: 10, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(docIssued, { x: 420, y: height - 156, size: 9, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(docDate, { x: 120, y: height - 170, size: 10, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(company, { x: 230, y: height - 184, size: 10, font: fontBold, color: rgb(0, 0, 0.7) });
      firstPage.drawText(job, { x: 390, y: height - 184, size: 10, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(hireDate, { x: 120, y: height - 198, size: 10, font, color: rgb(0, 0, 0.7) });
    } else if (params.templateCode === 'hr-declaratie-regulament') {
      const empName = cleanPdfText(String(params.data.employee_name || ''));
      const locality = cleanPdfText(String(params.data.locality || ''));
      const street = cleanPdfText(String(params.data.street || ''));
      const num = cleanPdfText(String(params.data.street_number || ''));
      const county = cleanPdfText(String(params.data.county || ''));
      const docSeries = cleanPdfText(String(params.data.doc_series || ''));
      const docNum = cleanPdfText(String(params.data.doc_number || ''));
      const docIssued = cleanPdfText(String(params.data.doc_issued_by || ''));
      const docDate = cleanPdfText(String(params.data.doc_issue_date || ''));
      const cnp = cleanPdfText(String(params.data.cnp || ''));
      const company = cleanPdfText(String(params.data.client_name || ''));

      firstPage.drawText(empName, { x: 180, y: height - 142, size: 10, font: fontBold, color: rgb(0, 0, 0.7) });
      firstPage.drawText(`${locality}, Str. ${street} nr. ${num}, ${county}`, { x: 100, y: height - 168, size: 9, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(`${docSeries} ${docNum} emis de ${docIssued} la ${docDate}`, { x: 100, y: height - 195, size: 9, font, color: rgb(0, 0, 0.7) });
      firstPage.drawText(cnp, { x: 150, y: height - 208, size: 10, font: fontBold, color: rgb(0, 0, 0.7) });
      firstPage.drawText(company, { x: 160, y: height - 222, size: 10, font: fontBold, color: rgb(0, 0, 0.7) });
    } else {
      firstPage.drawText(cleanPdfText(`Document generat pentru: ${params.data.employee_name || params.data.client_name || ''}`), {
        x: 50,
        y: 50,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    outputBuffer = Buffer.from(await pdfDoc.save());
  } else if (template.format === 'xlsx') {
    ext = 'xlsx';
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const wb = XLSX.readFile(templateFilePath);
    if (params.templateCode === 'hygiene-anexe-catalog') {
      const s1 = wb.Sheets[wb.SheetNames[0]];
      if (s1 && params.data.provider_name) {
        s1['A3'] = { v: String(params.data.provider_name), t: 's' };
      }
    }
    outputBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } else {
    throw new Error(`Formatul șablonului ${template.format} nu este suportat.`);
  }

  const outputFileName = `${docId}.${ext}`;
  const outPath = path.join(STORAGE_DOCS_DIR, outputFileName);
  fs.writeFileSync(outPath, outputBuffer);

  const documentTitle = `${template.name} - ${params.data.employee_name || params.data.client_name || 'Generat'}`;

  const savedDoc = await prisma.generatedDocument.create({
    data: {
      id: docId,
      clientId: params.clientId,
      employeeId: params.employeeId,
      jobId: params.jobId,
      eventId: params.eventId,
      hygieneSessionId: params.hygieneSessionId,
      templateId: template.id,
      templateVersion: template.version,
      title: documentTitle,
      status,
      filePath: outPath,
      mimeType,
      fileSizeBytes: outputBuffer.length,
      snapshotData: JSON.stringify(params.data),
      missingFields: missingFields.length > 0 ? JSON.stringify(missingFields) : null,
      createdBy: params.operatorName,
    },
  });

  await logAuditEvent({
    actorName: params.operatorName,
    action: 'generate',
    entityType: 'GeneratedDocument',
    entityId: savedDoc.id,
    details: {
      templateCode: params.templateCode,
      status,
      clientId: params.clientId,
      employeeId: params.employeeId,
      missingFieldsCount: missingFields.length,
    },
  });

  return {
    documentId: savedDoc.id,
    templateCode: params.templateCode,
    title: documentTitle,
    status,
    filePath: outPath,
    mimeType,
    fileSizeBytes: outputBuffer.length,
    missingFields,
  };
}
