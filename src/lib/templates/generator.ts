import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PDFDocument, StandardFonts } from 'pdf-lib';
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

export async function listTemplatePlaceholders(templateCode: string): Promise<string[]> {
  const definition = TEMPLATE_CATALOG.find((item) => item.code === templateCode);
  if (!definition) throw new Error(`Șablonul ${templateCode} nu există în catalog.`);
  const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', definition.normalizedFilename);
  if (!fs.existsSync(templatePath)) throw new Error(`Fișierul șablon lipsește: ${definition.normalizedFilename}`);
  return collectUnresolvedPlaceholders(fs.readFileSync(templatePath), definition.format);
}

function textValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  return value instanceof Date ? value.toLocaleDateString('ro-RO') : String(value);
}

export function pdfText(value: unknown): string {
  return textValue(value)
    .replace(/[șş]/g, 's')
    .replace(/[ȘŞ]/g, 'S')
    .replace(/[țţ]/g, 't')
    .replace(/[ȚŢ]/g, 'T')
    .replace(/[ăâ]/g, 'a')
    .replace(/[ĂÂ]/g, 'A')
    .replace(/[î]/g, 'i')
    .replace(/[Î]/g, 'I');
}

export async function collectUnresolvedPlaceholders(buffer: Buffer, format: string): Promise<string[]> {
  const found = new Set<string>();
  const add = (text: string) => {
    for (const match of text.matchAll(/PLACEHOLDER_[A-Z0-9_]+/g)) {
      found.add(match[0]);
    }
  };

  if (format === 'docx') {
    const zip = new PizZip(buffer);
    for (const file of Object.values(zip.files)) {
      if (file.name.startsWith('word/') && file.name.endsWith('.xml')) {
        add(file.asText());
      }
    }
  } else if (format === 'xlsx') {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      for (const key of Object.keys(sheet)) {
        if (key.startsWith('!')) continue;
        const value = sheet[key]?.v;
        if (typeof value === 'string') add(value);
      }
    }
  } else if (format === 'pdf') {
    const pdf = await PDFDocument.load(buffer);
    for (const field of pdf.getForm().getFields()) {
      const textField = field as typeof field & { getText?: () => string | undefined };
      const val = textField.getText?.() || '';
      if (!val || val.startsWith('PLACEHOLDER_')) {
        found.add(field.getName());
      }
    }
  }
  return [...found];
}

function placeholderLabel(token: string): string {
  const base = token.replace(/_\d{2,3}$/, '');
  return base === token ? token : `${base} (rânduri cursanți)`;
}

function formatParticipantValue(token: string, participant: Record<string, unknown>): string | undefined {
  const key = token.replace(/_\d{2,3}$/, '').replace(/^PLACEHOLDER_/, '');
  const birth = participant.birthDate ? new Date(String(participant.birthDate)) : null;
  const fullName = [participant.lastName, participant.firstName].filter(Boolean).join(' ');
  const identity = [
    participant.docType,
    participant.docSeries && `seria ${participant.docSeries}`,
    participant.docNumber && `nr. ${participant.docNumber}`,
  ]
    .filter(Boolean)
    .join(' ');
  const month = birth ? String(birth.getMonth() + 1).padStart(2, '0') : '';
  const day = birth ? String(birth.getDate()).padStart(2, '0') : '';
  const year = birth ? String(birth.getFullYear()) : '';

  const map: Record<string, unknown> = {
    NUMAR_ORDINE: participant.rowNumber,
    NUME_COMPLET: participant.fullName || fullName,
    CNP: participant.cnp,
    ACT_IDENTITATE: participant.identityDocument || identity,
    DATA_LOC_NASTERII: [birth ? birth.toLocaleDateString('ro-RO') : '', participant.birthPlace].filter(Boolean).join(', '),
    DATA_NASTERII: birth ? birth.toLocaleDateString('ro-RO') : '',
    LOCALITATE_NASTERII: participant.birthPlace,
    MODUL_NIVEL: [participant.module, participant.level].filter(Boolean).join(' - '),
    NOTA_EXAMEN: participant.examGrade || '10',
    REZULTAT_EXAMEN: participant.examResult || 'Admis',
    DATA_SESIUNE: participant.sessionDate,
    SERIE_NUMAR_CERTIFICAT: [participant.certificateSeries, participant.certificateNumber].filter(Boolean).join(' '),
    MODUL_ABSOLVIT: participant.module,
    PERIOADA_CURS: participant.coursePeriod || participant.sessionDate,
    PRESTATOR_SSM: participant.providerName,
    AN_NASTERII: year,
    LUNA_NASTERII: month,
    ZIUA_NASTERII: day,
    LOC_NASTERII: participant.birthPlace,
    DATA_ELIBERARE: participant.sessionDate || participant.examDate,
  };

  const value = map[key];
  return value === undefined || value === null || value === '' ? undefined : textValue(value);
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
  const templateFilename = catalogDef?.normalizedFilename || template.normalizedFilename;
  const templateFormat = catalogDef?.format || template.format;
  const manifest = JSON.parse(template.manifestJson || '{}');
  const fieldDefs: TemplateFieldDef[] = manifest.fields || catalogDef?.fields || [];

  const missingFields = new Set(validateMissingFields(fieldDefs, params.data));

  const docId = crypto.randomUUID();
  const templateFilePath = path.join(
    process.cwd(),
    'templates_registry',
    'normalized',
    templateFilename
  );

  if (!fs.existsSync(templateFilePath)) {
    throw new Error(`Fișierul șablon fizic lipsește de pe disc: ${templateFilePath}`);
  }

  let outputBuffer: Buffer;
  let ext = 'docx';
  let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (templateFormat === 'docx') {
    ext = 'docx';
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const content = fs.readFileSync(templateFilePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // Retain {PLACEHOLDER_KEY} visibly in the document if no value was provided
      nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
    });

    const renderData = Object.fromEntries(
      Object.entries(params.data).filter(([key, value]) =>
        !key.startsWith('PLACEHOLDER_') || (value !== undefined && value !== null && String(value).trim() !== '')
      )
    );

    doc.render(renderData);
    outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  } else if (templateFormat === 'pdf') {
    ext = 'pdf';
    mimeType = 'application/pdf';

    const pdfBytes = fs.readFileSync(templateFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const form = pdfDoc.getForm();

    for (const field of form.getFields()) {
      const editableField = field as typeof field & { setText?: (value: string) => void };
      const name = field.getName();

      // Look up by direct field name or standard aliases
      let val = params.data[name];
      if (val === undefined || val === null || String(val).trim() === '') {
        if (name === 'PLACEHOLDER_NUME_COMPLET') val = params.data.PLACEHOLDER_NUME_COMPLET || params.data.PLACEHOLDER_NUME;
        else if (name === 'PLACEHOLDER_LOCALITATE_DOMICILIU') val = params.data.PLACEHOLDER_LOCALITATE_DOMICILIU || params.data.PLACEHOLDER_LOCALITATE;
        else if (name === 'PLACEHOLDER_ADRESA_DOMICILIU') val = params.data.PLACEHOLDER_ADRESA_DOMICILIU || params.data.PLACEHOLDER_ADRESA;
        else if (name === 'PLACEHOLDER_NUMAR_ACT') val = params.data.PLACEHOLDER_NUMAR_ACT || params.data.PLACEHOLDER_NR_ACT;
        else if (name === 'PLACEHOLDER_EMITENT_ACT') val = params.data.PLACEHOLDER_EMITENT_ACT || params.data.PLACEHOLDER_EMITENT;
        else if (name === 'PLACEHOLDER_DATA_EMITERII') val = params.data.PLACEHOLDER_DATA_EMITERII || params.data.PLACEHOLDER_DATA_ACT;
        else if (name === 'PLACEHOLDER_DATA_ANGAJARII') val = params.data.PLACEHOLDER_DATA_ANGAJARII || params.data.PLACEHOLDER_DATA_ANGAJ;
        else if (name === 'PLACEHOLDER_JUDET_DOMICILIU') val = params.data.PLACEHOLDER_JUDET_DOMICILIU || params.data.PLACEHOLDER_JUDET;
        else if (name === 'PLACEHOLDER_NUMAR_DOMICILIU') val = params.data.PLACEHOLDER_NUMAR_DOMICILIU || params.data.PLACEHOLDER_NR;
      }

      if (val !== undefined && val !== null && String(val).trim() !== '' && editableField.setText) {
        editableField.setText(pdfText(val));
      }
    }

    form.updateFieldAppearances(font);
    outputBuffer = Buffer.from(await pdfDoc.save());
  } else if (templateFormat === 'xlsx') {
    ext = 'xlsx';
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const wb = XLSX.readFile(templateFilePath);
    let participants = Array.isArray(params.data.participants)
      ? (params.data.participants as Record<string, unknown>[])
      : [];

    // Fallback: If generating for an individual employee, populate 1st participant row
    if (participants.length === 0 && params.data.PLACEHOLDER_NUME_COMPLET) {
      participants = [
        {
          rowNumber: 1,
          fullName: params.data.PLACEHOLDER_NUME_COMPLET,
          lastName: params.data.PLACEHOLDER_NUME,
          firstName: params.data.PLACEHOLDER_PRENUME,
          cnp: params.data.PLACEHOLDER_CNP,
          birthDate: params.data.PLACEHOLDER_DATA_NASTERII,
          birthPlace: params.data.PLACEHOLDER_LOCALITATE_NASTERII,
          identityDocument: `${params.data.PLACEHOLDER_TIP_ACT || 'C.I.'} ${params.data.PLACEHOLDER_SERIE_ACT || ''} ${params.data.PLACEHOLDER_NUMAR_ACT || ''}`.trim(),
          module: params.data.PLACEHOLDER_MODUL_IGIENA || 'Nivelul 1',
          sessionDate: params.data.PLACEHOLDER_DATA_SESIUNE,
          examDate: params.data.PLACEHOLDER_DATA_EXAMEN,
          examGrade: '10',
          examResult: 'Admis',
          certificateSeries: params.data.PLACEHOLDER_SERIE_ADEVERINTA || 'IGI',
          certificateNumber: params.data.PLACEHOLDER_NUMAR_ADEVERINTA || '101',
          providerName: params.data.PLACEHOLDER_PRESTATOR_SSM || 'SC EXPERT SSM TRAINING SRL',
        },
      ];
    }

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      for (const address of Object.keys(sheet)) {
        if (address.startsWith('!')) continue;
        const cell = sheet[address];
        if (typeof cell?.v !== 'string') continue;

        cell.v = cell.v.replace(/PLACEHOLDER_[A-Z0-9_]+/g, (token: string) => {
          const directValue = params.data[token];
          if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
            return textValue(directValue);
          }

          const indexed = token.match(/_(\d{2,3})$/);
          if (indexed) {
            const index = Number(indexed[1]) - 1;
            // Clear unused capacity rows beyond the actual participant count
            if (index >= Math.max(1, participants.length)) return '';
            if (participants[index]) {
              return formatParticipantValue(token, participants[index]) || token;
            }
          }
          return token;
        });
      }
    }
    outputBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  } else {
    throw new Error(`Formatul șablonului ${template.format} nu este suportat.`);
  }

  // Scan output file for any remaining unmapped tokens
  for (const token of await collectUnresolvedPlaceholders(outputBuffer, templateFormat)) {
    missingFields.add(placeholderLabel(token));
  }

  const finalMissingFields = [...missingFields];
  const status: 'draft' | 'missing_data' | 'approved_for_print' =
    finalMissingFields.length === 0 ? 'approved_for_print' : 'missing_data';

  const outputFileName = `${docId}.${ext}`;
  const outPath = path.join(STORAGE_DOCS_DIR, outputFileName);
  fs.writeFileSync(outPath, outputBuffer);

  const documentTitle = `${template.name} - ${
    params.data.PLACEHOLDER_NUME_COMPLET || params.data.PLACEHOLDER_FIRMA || 'Generat'
  }`;

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
      missingFields: finalMissingFields.length > 0 ? JSON.stringify(finalMissingFields) : null,
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
      missingFieldsCount: finalMissingFields.length,
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
    missingFields: finalMissingFields,
  };
}
