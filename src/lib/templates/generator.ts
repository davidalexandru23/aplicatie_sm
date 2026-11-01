import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PDFDocument, StandardFonts, rgb, PDFName } from 'pdf-lib';
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
    for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
      if ('getContents' in obj && typeof (obj as { getContents?: () => Uint8Array }).getContents === 'function') {
        try {
          const raw = Buffer.from((obj as { getContents: () => Uint8Array }).getContents());
          let str = '';
          try {
            str = zlib.inflateSync(raw).toString('latin1');
          } catch {
            str = raw.toString('latin1');
          }
          const unhex = str.replace(/<([0-9A-Fa-f]+)>/g, (_, h) => {
            try {
              return Buffer.from(h, 'hex').toString('latin1');
            } catch {
              return h;
            }
          });
          add(unhex);
        } catch {}
      }
    }
    try {
      for (const field of pdf.getForm().getFields()) {
        const textField = field as typeof field & { getText?: () => string | undefined };
        const val = textField.getText?.() || '';
        if (!val || val.startsWith('PLACEHOLDER_')) {
          found.add(field.getName());
        }
      }
    } catch {}
  }
  return [...found];
}

function placeholderLabel(token: string): string {
  const base = token.replace(/_\d{2,3}$/, '');
  return base === token ? token : `${base} (rânduri cursanți)`;
}

export function parseBirthInfo(birthDate: unknown, cnp?: unknown): {
  year: string;
  month: string;
  day: string;
  dateFormatted: string;
} {
  let year = '';
  let month = '';
  let day = '';
  let dateObj: Date | null = null;

  if (birthDate instanceof Date && !isNaN(birthDate.getTime())) {
    dateObj = birthDate;
  } else if (typeof birthDate === 'string') {
    const trimmed = birthDate.trim();
    const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmy) {
      day = dmy[1].padStart(2, '0');
      month = dmy[2].padStart(2, '0');
      year = dmy[3];
      dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    year = String(dateObj.getFullYear());
    month = String(dateObj.getMonth() + 1).padStart(2, '0');
    day = String(dateObj.getDate()).padStart(2, '0');
  } else if (cnp && /^[1-8]\d{12}$/.test(String(cnp))) {
    const s = String(cnp);
    const sDigit = Number(s[0]);
    let century = 1900;
    if (sDigit === 3 || sDigit === 4) century = 1800;
    else if (sDigit === 5 || sDigit === 6) century = 2000;
    year = String(century + Number(s.substring(1, 3)));
    month = s.substring(3, 5);
    day = s.substring(5, 7);
  }

  return {
    year,
    month,
    day,
    dateFormatted: day && month && year ? `${day}.${month}.${year}` : '',
  };
}

function formatParticipantValue(token: string, participant: Record<string, unknown>): string | undefined {
  const key = token.replace(/_\d{2,3}$/, '').replace(/^PLACEHOLDER_/, '');
  const birth = parseBirthInfo(participant.birthDate, participant.cnp);
  const fullName = [participant.lastName, participant.firstName].filter(Boolean).join(' ');
  const identity = [
    participant.docType,
    participant.docSeries && `seria ${participant.docSeries}`,
    participant.docNumber && `nr. ${participant.docNumber}`,
  ]
    .filter(Boolean)
    .join(' ');

  const map: Record<string, unknown> = {
    NUMAR_ORDINE: participant.rowNumber,
    NUME_COMPLET: participant.fullName || fullName,
    CNP: participant.cnp,
    ACT_IDENTITATE: participant.identityDocument || identity,
    DATA_LOC_NASTERII: [birth.dateFormatted, participant.birthPlace].filter(Boolean).join(', '),
    DATA_NASTERII: birth.dateFormatted,
    LOCALITATE_NASTERII: participant.birthPlace,
    MODUL_NIVEL: [participant.module, participant.level].filter(Boolean).join(' - ') || participant.module,
    NOTA_EXAMEN: participant.examGrade || '10',
    REZULTAT_EXAMEN: participant.examResult || 'Admis',
    DATA_SESIUNE: participant.sessionDate,
    SERIE_NUMAR_CERTIFICAT: [participant.certificateSeries, participant.certificateNumber].filter(Boolean).join(' '),
    MODUL_ABSOLVIT: participant.module,
    PERIOADA_CURS: participant.coursePeriod || participant.sessionDate,
    PRESTATOR_SSM: participant.providerName,
    AN_NASTERII: birth.year,
    LUNA_NASTERII: birth.month,
    ZIUA_NASTERII: birth.day,
    LOC_NASTERII: participant.birthPlace,
    DATA_ELIBERARE: participant.sessionDate || participant.examDate,
  };

  const value = map[key];
  return value === undefined || value === null || value === '' ? undefined : textValue(value);
}

interface PdfFieldPlacement {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
}

const PDF_BASE_TEMPLATES: Record<string, string> = {
  'Cerere angajare.pdf': path.join(process.cwd(), 'sabloane_ssm', 'Cerere angajare.pdf'),
  'Declaratie luare cunostinta RI.pdf': path.join(process.cwd(), 'sabloane_ssm', 'Declaratie luat la cunost. Regulament Intern.pdf'),
  'Declaratie pe proprie raspundere CIM.pdf': path.join(process.cwd(), 'sabloane_ssm', 'Declaratie pe propie raspundere contract de munca.pdf'),
};

const PDF_FIELD_PLACEMENTS: Record<string, PdfFieldPlacement[]> = {
  'Cerere angajare.pdf': [
    { key: 'PLACEHOLDER_NUME_COMPLET', x: 155, y: 626, width: 152, height: 13, size: 9 },
    { key: 'PLACEHOLDER_LOCALITATE_DOMICILIU', x: 374, y: 626, width: 132, height: 13, size: 9 },
    { key: 'PLACEHOLDER_ADRESA_DOMICILIU', x: 90, y: 599, width: 405, height: 13, size: 9 },
    { key: 'PLACEHOLDER_SERIE_ACT', x: 255, y: 565, width: 34, height: 13, size: 8 },
    { key: 'PLACEHOLDER_NUMAR_ACT', x: 333, y: 565, width: 54, height: 13, size: 8 },
    { key: 'PLACEHOLDER_EMITENT_ACT', x: 420, y: 565, width: 155, height: 13, size: 8 },
    { key: 'PLACEHOLDER_DATA_EMITERII', x: 143, y: 538, width: 132, height: 13, size: 9 },
    { key: 'PLACEHOLDER_FIRMA', x: 178, y: 503, width: 128, height: 13, size: 9 },
    { key: 'PLACEHOLDER_FUNCTIE', x: 362, y: 503, width: 125, height: 13, size: 9 },
    { key: 'PLACEHOLDER_DATA_ANGAJARII', x: 91, y: 476, width: 140, height: 13, size: 9 },
    { key: 'PLACEHOLDER_DATA_CERERE', x: 91, y: 389, width: 115, height: 13, size: 9 },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', x: 91, y: 291, width: 180, height: 13, size: 9 },
  ],
  'Declaratie luare cunostinta RI.pdf': [
    { key: 'PLACEHOLDER_NUME_COMPLET', x: 192, y: 638, width: 150, height: 13, size: 8 },
    { key: 'PLACEHOLDER_LOCALITATE_DOMICILIU', x: 447, y: 638, width: 100, height: 13, size: 8 },
    { key: 'PLACEHOLDER_STRADA_DOMICILIU', x: 72, y: 617, width: 154, height: 13, size: 8 },
    { key: 'PLACEHOLDER_NUMAR_DOMICILIU', x: 235, y: 617, width: 36, height: 13, size: 8 },
    { key: 'PLACEHOLDER_BLOC', x: 295, y: 617, width: 30, height: 13, size: 8 },
    { key: 'PLACEHOLDER_SCARA', x: 370, y: 617, width: 29, height: 13, size: 8 },
    { key: 'PLACEHOLDER_ETAJ', x: 428, y: 617, width: 27, height: 13, size: 8 },
    { key: 'PLACEHOLDER_APARTAMENT', x: 478, y: 617, width: 34, height: 13, size: 8 },
    { key: 'PLACEHOLDER_JUDET_DOMICILIU', x: 72, y: 596, width: 130, height: 13, size: 8 },
    { key: 'PLACEHOLDER_TIP_ACT', x: 277, y: 596, width: 30, height: 13, size: 8 },
    { key: 'PLACEHOLDER_SERIE_ACT', x: 343, y: 596, width: 38, height: 13, size: 8 },
    { key: 'PLACEHOLDER_NUMAR_ACT', x: 398, y: 596, width: 52, height: 13, size: 8 },
    { key: 'PLACEHOLDER_EMITENT_ACT', x: 72, y: 575, width: 150, height: 13, size: 8 },
    { key: 'PLACEHOLDER_DATA_EMITERII', x: 250, y: 575, width: 110, height: 13, size: 8 },
    { key: 'PLACEHOLDER_CNP', x: 380, y: 575, width: 175, height: 13, size: 8 },
    { key: 'PLACEHOLDER_FIRMA', x: 142, y: 554, width: 390, height: 13, size: 8 },
    { key: 'PLACEHOLDER_DATA_DECLARATIE', x: 72, y: 329, width: 110, height: 13, size: 8 },
  ],
  'Declaratie pe proprie raspundere CIM.pdf': [
    { key: 'PLACEHOLDER_NUME_COMPLET', x: 162, y: 774, width: 155, height: 13, size: 8 },
    { key: 'PLACEHOLDER_SERIE_ACT', x: 418, y: 774, width: 50, height: 13, size: 8 },
    { key: 'PLACEHOLDER_NUMAR_ACT', x: 95, y: 755, width: 92, height: 13, size: 8 },
    { key: 'PLACEHOLDER_EMITENT_ACT', x: 245, y: 755, width: 142, height: 13, size: 8 },
    { key: 'PLACEHOLDER_DATA_EMITERII', x: 392, y: 755, width: 112, height: 13, size: 8 },
    { key: 'PLACEHOLDER_DATA_DECLARATIE', x: 72, y: 736, width: 108, height: 13, size: 8 },
    { key: 'PLACEHOLDER_NUME_COMPLET_PERSOANA_01', x: 72, y: 517, width: 118, height: 13, size: 7 },
    { key: 'PLACEHOLDER_CNP_PERSOANA_01', x: 191, y: 517, width: 103, height: 13, size: 7 },
    { key: 'PLACEHOLDER_CALITATE_PERSOANA_01', x: 296, y: 517, width: 63, height: 13, size: 7 },
    { key: 'PLACEHOLDER_INVALIDITATE_PERSOANA_01', x: 360, y: 517, width: 62, height: 13, size: 7 },
    { key: 'PLACEHOLDER_DATA_INTRETINERE_01', x: 423, y: 517, width: 66, height: 13, size: 7 },
    { key: 'PLACEHOLDER_VENIT_PERSOANA_01', x: 490, y: 517, width: 70, height: 13, size: 7 },
    { key: 'PLACEHOLDER_NUME_COMPLET_PERSOANA_02', x: 72, y: 493, width: 118, height: 13, size: 7 },
    { key: 'PLACEHOLDER_CNP_PERSOANA_02', x: 191, y: 493, width: 103, height: 13, size: 7 },
    { key: 'PLACEHOLDER_CALITATE_PERSOANA_02', x: 296, y: 493, width: 63, height: 13, size: 7 },
    { key: 'PLACEHOLDER_INVALIDITATE_PERSOANA_02', x: 360, y: 493, width: 62, height: 13, size: 7 },
    { key: 'PLACEHOLDER_DATA_INTRETINERE_02', x: 423, y: 493, width: 66, height: 13, size: 7 },
    { key: 'PLACEHOLDER_VENIT_PERSOANA_02', x: 490, y: 493, width: 70, height: 13, size: 7 },
    { key: 'PLACEHOLDER_TIP_PENSIE', x: 258, y: 464, width: 220, height: 13, size: 8 },
    { key: 'PLACEHOLDER_CASA_SANATATE', x: 399, y: 362, width: 158, height: 13, size: 8 },
  ],
};

function resolvePdfFieldValue(name: string, data: Record<string, unknown>): string | undefined {
  let val = data[name];
  if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  if (name === 'PLACEHOLDER_NUME_COMPLET') val = data.PLACEHOLDER_NUME_COMPLET || data.PLACEHOLDER_NUME;
  else if (name === 'PLACEHOLDER_LOCALITATE_DOMICILIU') val = data.PLACEHOLDER_LOCALITATE_DOMICILIU || data.PLACEHOLDER_LOCALITATE;
  else if (name === 'PLACEHOLDER_ADRESA_DOMICILIU') val = data.PLACEHOLDER_ADRESA_DOMICILIU || data.PLACEHOLDER_ADRESA;
  else if (name === 'PLACEHOLDER_NUMAR_ACT') val = data.PLACEHOLDER_NUMAR_ACT || data.PLACEHOLDER_NR_ACT;
  else if (name === 'PLACEHOLDER_EMITENT_ACT') val = data.PLACEHOLDER_EMITENT_ACT || data.PLACEHOLDER_EMITENT;
  else if (name === 'PLACEHOLDER_DATA_EMITERII') val = data.PLACEHOLDER_DATA_EMITERII || data.PLACEHOLDER_DATA_ACT;
  else if (name === 'PLACEHOLDER_DATA_ANGAJARII') val = data.PLACEHOLDER_DATA_ANGAJARII || data.PLACEHOLDER_DATA_ANGAJ;
  else if (name === 'PLACEHOLDER_JUDET_DOMICILIU') val = data.PLACEHOLDER_JUDET_DOMICILIU || data.PLACEHOLDER_JUDET;
  else if (name === 'PLACEHOLDER_NUMAR_DOMICILIU') val = data.PLACEHOLDER_NUMAR_DOMICILIU || data.PLACEHOLDER_NR;
  if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  return undefined;
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

    const baseSourcePath = PDF_BASE_TEMPLATES[templateFilename] || templateFilePath;
    const pdfBytes = fs.readFileSync(baseSourcePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPage(0);
    const placements = PDF_FIELD_PLACEMENTS[templateFilename] || [];

    for (const f of placements) {
      const val = resolvePdfFieldValue(f.key, params.data);
      const textToDraw = val ? pdfText(val) : `{${f.key}}`;
      const fontSize = f.size || 8;
      const textWidth = font.widthOfTextAtSize(textToDraw, fontSize);
      const boxWidth = Math.max(f.width, textWidth + 4);

      page.drawRectangle({
        x: f.x - 2,
        y: f.y - 1,
        width: boxWidth,
        height: f.height || 14,
        color: rgb(1, 1, 1),
      });

      page.drawText(textToDraw, {
        x: f.x,
        y: f.y + 1,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    // Clean any annotations and AcroForm dicts so generated PDF is 100% normal flat text
    for (const p of pdfDoc.getPages()) {
      p.node.delete(PDFName.of('Annots'));
    }
    pdfDoc.catalog.delete(PDFName.of('AcroForm'));

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
