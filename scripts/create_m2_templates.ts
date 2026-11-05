import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const BASE_TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates_registry',
  'normalized',
  'Anexa fisa postului SSM.docx'
);

const TARGET_DIRS = [
  path.join(process.cwd(), 'templates_registry', 'normalized'),
  path.join(process.cwd(), 'handoff', 'ssm-template-placeholder-pack', 'templates'),
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function p(
  text: string,
  options: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    align?: 'left' | 'center' | 'right' | 'both';
    spaceBefore?: number;
    spaceAfter?: number;
    color?: string;
  } = {}
): string {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const spacing = `<w:spacing w:before="${options.spaceBefore ?? 60}" w:after="${options.spaceAfter ?? 60}" w:line="240" w:lineRule="auto"/>`;
  const pPr = `<w:pPr>${align}${spacing}</w:pPr>`;

  if (!text) return `<w:p>${pPr}</w:p>`;

  const bold = options.bold ? '<w:b/><w:bCs/>' : '';
  const italic = options.italic ? '<w:i/><w:iCs/>' : '';
  const sz = options.size
    ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`
    : '<w:sz w:val="21"/><w:szCs w:val="21"/>';
  const color = options.color
    ? `<w:color w:val="${options.color}"/>`
    : '<w:color w:val="222222"/>';
  const rFonts = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
  const rPr = `<w:rPr>${rFonts}${bold}${italic}${sz}${color}</w:rPr>`;

  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function pRuns(
  runs: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    size?: number;
    color?: string;
  }>,
  options: {
    align?: 'left' | 'center' | 'right' | 'both';
    spaceBefore?: number;
    spaceAfter?: number;
  } = {}
): string {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const spacing = `<w:spacing w:before="${options.spaceBefore ?? 60}" w:after="${options.spaceAfter ?? 60}" w:line="240" w:lineRule="auto"/>`;
  const pPr = `<w:pPr>${align}${spacing}</w:pPr>`;

  const runsXml = runs
    .map((r) => {
      const bold = r.bold ? '<w:b/><w:bCs/>' : '';
      const italic = r.italic ? '<w:i/><w:iCs/>' : '';
      const sz = r.size
        ? `<w:sz w:val="${r.size}"/><w:szCs w:val="${r.size}"/>`
        : '<w:sz w:val="21"/><w:szCs w:val="21"/>';
      const color = r.color
        ? `<w:color w:val="${r.color}"/>`
        : '<w:color w:val="222222"/>';
      const rFonts = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
      const rPr = `<w:rPr>${rFonts}${bold}${italic}${sz}${color}</w:rPr>`;
      return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
    })
    .join('');

  return `<w:p>${pPr}${runsXml}</w:p>`;
}

interface CellDef {
  text?: string;
  runs?: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    size?: number;
    color?: string;
  }>;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  fill?: string;
  width?: number; // dxa
}

function cell(def: CellDef, defaultWidth: number): string {
  const w = def.width || defaultWidth;
  const tcPr = [
    `<w:tcW w:w="${w}" w:type="dxa"/>`,
    def.fill
      ? `<w:shd w:val="clear" w:color="auto" w:fill="${def.fill}"/>`
      : '',
    `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>`,
    `<w:vAlign w:val="center"/>`,
  ].join('');

  let pXml = '';
  if (def.runs) {
    pXml = pRuns(def.runs, {
      align: def.align || 'left',
      spaceBefore: 20,
      spaceAfter: 20,
    });
  } else {
    pXml = p(def.text || '', {
      bold: def.bold,
      align: def.align || 'left',
      spaceBefore: 20,
      spaceAfter: 20,
    });
  }

  return `<w:tc>${tcPr}${pXml}</w:tc>`;
}

function row(
  cells: CellDef[],
  colWidths: number[],
  isHeader: boolean = false
): string {
  const trPr = isHeader
    ? '<w:trPr><w:tblHeader/></w:trPr>'
    : '<w:trPr><w:cantSplit/></w:trPr>';
  const cellsXml = cells
    .map((c, idx) => cell(c, colWidths[idx] || 1500))
    .join('');
  return `<w:tr>${trPr}${cellsXml}</w:tr>`;
}

function buildTable(
  headers: string[],
  rowsData: string[][],
  colWidths: number[]
): string {
  const tblPr = `
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D0D0D0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D0D0D0"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
  `;

  const headerRow = row(
    headers.map((h) => ({
      text: h,
      bold: true,
      align: 'center',
      fill: 'F0F2F5',
    })),
    colWidths,
    true
  );

  const bodyRows = rowsData
    .map((r) =>
      row(
        r.map((c, idx) => ({
          text: c,
          align: idx === 0 ? 'center' : 'left',
        })),
        colWidths
      )
    )
    .join('');

  return `<w:tbl>${tblPr}${headerRow}${bodyRows}</w:tbl>`;
}

function wrapDocumentBody(bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
            xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
            mc:Ignorable="w14 w15">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function saveDocxTemplate(filename: string, documentXml: string) {
  const baseContent = fs.readFileSync(BASE_TEMPLATE_PATH);
  const zip = new PizZip(baseContent);
  zip.file('word/document.xml', documentXml);

  const outBuf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const targetFile = path.join(dir, filename);
    fs.writeFileSync(targetFile, outBuf);
    console.log(`Saved: ${targetFile} (${outBuf.length} bytes)`);
  }
}

// ============================================================================
// 1. F7: ssm-fisa-instruire-individuala.docx
// ============================================================================
function generateSsmFisaInstruire(): string {
  const b: string[] = [];

  // Antet
  b.push(p('ROMÂNIA', { bold: true, align: 'center', size: 24, spaceAfter: 20 }));
  b.push(p('MINISTERUL MUNCII ȘI SOLIDARITĂȚII SOCIALE — INSPECȚIA MUNCII', { bold: true, align: 'center', size: 20, spaceAfter: 40 }));
  b.push(p('Anexa nr. 11 la Normele metodologice (HG nr. 1425/2006)', { italic: true, align: 'center', size: 18, spaceAfter: 120 }));

  b.push(p('FIȘĂ DE INSTRUIRE INDIVIDUALĂ', { bold: true, align: 'center', size: 28, spaceBefore: 60, spaceAfter: 20 }));
  b.push(p('privind securitatea și sănătatea în muncă', { bold: true, align: 'center', size: 22, spaceAfter: 180 }));

  // Date angajator
  b.push(pRuns([
    { text: 'Unitatea / Întreprinderea: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'CUI / CIF: ', bold: true },
    { text: '{PLACEHOLDER_CUI}' },
    { text: ' | Nr. Reg. Com.: ', bold: true },
    { text: '{PLACEHOLDER_NR_REG_COM}' },
  ]));
  b.push(pRuns([
    { text: 'Sediul social: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'Punctul de lucru / Secția: ', bold: true },
    { text: '{PLACEHOLDER_LOC_MUNCA}' },
  ]));

  // Sectiunea I
  b.push(p('I. DATE PERSONALE ALE LUCRĂTORULUI', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Numele și prenumele: ', bold: true },
    { text: '{PLACEHOLDER_NUME_COMPLET}' },
    { text: ' (Nume: {PLACEHOLDER_NUME}, Prenume: {PLACEHOLDER_PRENUME})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Cod Numeric Personal (CNP): ', bold: true },
    { text: '{PLACEHOLDER_CNP}' },
    { text: ' | Grupa sanguină: ', bold: true },
    { text: '{PLACEHOLDER_GRUPA_SANGUINA}' },
    { text: ' | Marca/Legitimația: ', bold: true },
    { text: '{PLACEHOLDER_MARCA}' },
  ]));
  b.push(pRuns([
    { text: 'Data și locul nașterii: ', bold: true },
    { text: '{PLACEHOLDER_DATA_NASTERII}, {PLACEHOLDER_LOCALITATE_NASTERII}, jud. {PLACEHOLDER_JUDET_NASTERII}' },
  ]));
  b.push(pRuns([
    { text: 'Act identitate: ', bold: true },
    { text: '{PLACEHOLDER_TIP_ACT} seria {PLACEHOLDER_SERIE_ACT} nr. {PLACEHOLDER_NUMAR_ACT}' },
    { text: ' | Domiciliul: ', bold: true },
    { text: '{PLACEHOLDER_DOMICILIU}' },
  ]));
  b.push(pRuns([
    { text: 'Calificarea / Pregătirea profesională: ', bold: true },
    { text: '{PLACEHOLDER_CALIFICARE}' },
  ]));
  b.push(pRuns([
    { text: 'Funcția / Meseria: ', bold: true },
    { text: '{PLACEHOLDER_FUNCTIE}' },
    { text: ' (Cod COR: {PLACEHOLDER_COD_COR})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Autorizații deținute (ISCIR/ANRE/conducere): ', bold: true },
    { text: '{PLACEHOLDER_AUTORIZATII}' },
  ]));
  b.push(pRuns([
    { text: 'Traseul normal de deplasare la/de la serviciu: ', bold: true },
    { text: '{PLACEHOLDER_TRASEU_DEPLASARE}' },
    { text: ' (Durata: {PLACEHOLDER_DURATA_TRASEU})', italic: true },
  ]));

  // Sectiunea II
  b.push(p('II. INSTRUIREA INTRODUCTIV-GENERALĂ', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(p('Efectuată în conformitate cu prevederile art. 83-89 din Normele metodologice aprobate prin HG nr. 1425/2006.', { italic: true, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Data instruirii: ', bold: true },
    { text: '{PLACEHOLDER_DATA_INSTRUIRE_IG}' },
    { text: ' | Durata: ', bold: true },
    { text: '{PLACEHOLDER_DURATA_INSTRUIRE_IG}' },
  ]));
  b.push(pRuns([
    { text: 'Instructor SSM (Nume și funcție): ', bold: true },
    { text: '{PLACEHOLDER_INSTRUCTOR_IG}' },
  ]));
  b.push(pRuns([
    { text: 'Conținutul instruirii (materialul predat): ', bold: true },
    { text: '{PLACEHOLDER_TEMATICA_IG}' },
  ]));
  b.push(pRuns([
    { text: 'Verificator însușire cunoștințe: ', bold: true },
    { text: '{PLACEHOLDER_VERIFICATOR_IG}' },
  ]));
  b.push(pRuns([
    { text: 'Semnătura celui instruit: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura instructorului: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura verificatorului: ', bold: true },
    { text: '...........................' },
  ], { spaceBefore: 60, spaceAfter: 100 }));

  // Sectiunea III
  b.push(p('III. INSTRUIREA LA LOCUL DE MUNCĂ', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(p('Efectuată în conformitate cu prevederile art. 90-95 din Normele metodologice aprobate prin HG nr. 1425/2006.', { italic: true, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Data instruirii: ', bold: true },
    { text: '{PLACEHOLDER_DATA_INSTRUIRE_LM}' },
    { text: ' | Durata: ', bold: true },
    { text: '{PLACEHOLDER_DURATA_INSTRUIRE_LM}' },
  ]));
  b.push(pRuns([
    { text: 'Locul de muncă / Postul: ', bold: true },
    { text: '{PLACEHOLDER_LOC_MUNCA_LM}' },
  ]));
  b.push(pRuns([
    { text: 'Conducătorul locului de muncă (Instructor LM): ', bold: true },
    { text: '{PLACEHOLDER_INSTRUCTOR_LM}' },
  ]));
  b.push(pRuns([
    { text: 'Conținutul instruirii (IPSSM specifice, riscuri, echipamente): ', bold: true },
    { text: '{PLACEHOLDER_TEMATICA_LM}' },
  ]));
  b.push(pRuns([
    { text: 'Persoana care a verificat instruirea: ', bold: true },
    { text: '{PLACEHOLDER_VERIFICATOR_LM}' },
  ]));
  b.push(pRuns([
    { text: 'Semnătura celui instruit: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura instructorului: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura verificatorului: ', bold: true },
    { text: '...........................' },
  ], { spaceBefore: 60, spaceAfter: 100 }));

  // Sectiunea IV
  b.push(p('IV. ADMITEREA LA LUCRU', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Salariatul a dovedit însușirea cunoștințelor de securitate și sănătate în muncă necesare postului. Se admite lucrul la data de: ', bold: false },
    { text: '{PLACEHOLDER_DATA_ADMITERE}', bold: true },
  ]));
  b.push(pRuns([
    { text: 'Aprobat de conducătorul ierarhic superior: ', bold: true },
    { text: '{PLACEHOLDER_ADMITERE_NUME}' },
    { text: ' (Reprezentant Legal Angajator: {PLACEHOLDER_REPREZENTANT_LEGAL})', bold: true },
  ]));
  b.push(pRuns([
    { text: 'Semnătura și ștampila: ', bold: true },
    { text: '..................................................' },
  ], { spaceBefore: 60, spaceAfter: 120 }));

  // Sectiunea V: Tabel Periodic Multianual (16 randuri padded)
  b.push(p('V. INSTRUIREA PERIODICĂ SSM (EVIDENȚĂ MULTIANUALĂ)', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(p('Instruirea periodică se efectuează conform art. 96-100 din HG nr. 1425/2006 pe baza tematicilor anuale aprobate.', { italic: true, spaceAfter: 60 }));

  const ssmTableWidths = [450, 1100, 700, 1600, 3100, 950, 950, 950];
  const ssmTableHeaders = [
    'Nr.',
    'Data',
    'Durata',
    'Ocupația / Funcția',
    'Materialul predat / Tematica',
    'Semnătură instruit',
    'Semnătură instructor',
    'Semnătură verificator',
  ];

  const ssmTblPr = `
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
  `;

  const ssmHeaderRow = row(
    ssmTableHeaders.map((h) => ({
      text: h,
      bold: true,
      align: 'center',
      fill: 'EAEAEA',
    })),
    ssmTableWidths,
    true
  );

  const ssmLoopRow = `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[0]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{#instruiriPeriodiceSSM}{nr}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[1]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{data}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[2]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{durata}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[3]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{ocupatia}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[4]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tematica}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[5]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaInstruit}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[6]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaInstructor}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${ssmTableWidths[7]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaVerificator}{/instruiriPeriodiceSSM}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
  `;

  b.push(`<w:tbl>${ssmTblPr}${ssmHeaderRow}${ssmLoopRow}</w:tbl>`);

  // Sectiunea VI: Instruiri Periodice Suplimentare
  b.push(p('VI. INSTRUIREA PERIODICĂ SUPLIMENTARĂ', { bold: true, size: 22, spaceBefore: 160, spaceAfter: 60 }));
  b.push(p('Conform art. 98 din HG nr. 1425/2006 (după concediu medical > 30 zile, accident de muncă, modificări tehnologice).', { italic: true, spaceAfter: 60 }));

  const suplWidths = [450, 1100, 700, 2000, 2600, 950, 950, 950];
  const suplHeaderRow = row(
    ['Nr.', 'Data', 'Durata', 'Motivul / Cauza', 'Materialul predat', 'Instruit', 'Instructor', 'Verificator'].map(h => ({
      text: h, bold: true, align: 'center', fill: 'EAEAEA',
    })),
    suplWidths,
    true
  );
  const suplLoopRow = `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[0]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{#instruiriSuplimentareSSM}{nr}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[1]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{data}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[2]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{durata}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[3]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{cauza}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[4]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tematica}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[5]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaInstruit}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[6]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaInstructor}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${suplWidths[7]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaVerificator}{/instruiriSuplimentareSSM}</w:t></w:r></w:p></w:tc>
    </w:tr>
  `;
  b.push(`<w:tbl>${ssmTblPr}${suplHeaderRow}${suplLoopRow}</w:tbl>`);

  // Sectiunea VII: Testari Anuale
  b.push(p('VII. REZULTATELE TESTĂRILOR PERIODICE ANUALE', { bold: true, size: 22, spaceBefore: 160, spaceAfter: 60 }));
  const testWidths = [1200, 1600, 3600, 1000, 1200, 1100];
  const testHeaderRow = row(
    ['Data', 'Tip testare', 'Materialul examinat', 'Calificativ', 'Examinator', 'Semnătură'].map(h => ({
      text: h, bold: true, align: 'center', fill: 'EAEAEA',
    })),
    testWidths,
    true
  );
  const testLoopRow = `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${testWidths[0]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{#testariSSM}{data}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${testWidths[1]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tipTestare}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${testWidths[2]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tematica}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${testWidths[3]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{rezultat}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${testWidths[4]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{examinator}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${testWidths[5]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaLucrator}{/testariSSM}</w:t></w:r></w:p></w:tc>
    </w:tr>
  `;
  b.push(`<w:tbl>${ssmTblPr}${testHeaderRow}${testLoopRow}</w:tbl>`);

  return wrapDocumentBody(b.join('\n'));
}

// ============================================================================
// 2. F8: psi-fisa-instructaj-individuala.docx
// ============================================================================
function generatePsiFisaInstructaj(): string {
  const b: string[] = [];

  // Antet
  b.push(p('MINISTERUL AFACERILOR INTERNE', { bold: true, align: 'center', size: 22, spaceAfter: 20 }));
  b.push(p('INSPECTORATUL GENERAL PENTRU SITUAȚII DE URGENȚĂ', { bold: true, align: 'center', size: 20, spaceAfter: 40 }));
  b.push(p('Anexa la Dispozițiile generale aprobate prin OMAI nr. 712/2005 (modificat prin OMAI 786/2005)', { italic: true, align: 'center', size: 18, spaceAfter: 120 }));

  b.push(p('FIȘĂ INDIVIDUALĂ DE INSTRUCTAJ', { bold: true, align: 'center', size: 28, spaceBefore: 60, spaceAfter: 20 }));
  b.push(p('în domeniul situațiilor de urgență (apărare împotriva incendiilor și protecție civilă)', { bold: true, align: 'center', size: 22, spaceAfter: 180 }));

  // Date operator economic
  b.push(pRuns([
    { text: 'Operatorul economic / Instituția: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'CUI / CIF: ', bold: true },
    { text: '{PLACEHOLDER_CUI}' },
    { text: ' | Nr. Reg. Com.: ', bold: true },
    { text: '{PLACEHOLDER_NR_REG_COM}' },
  ]));
  b.push(pRuns([
    { text: 'Sediul operatorului economic: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'Reprezentant Legal / Conducător: ', bold: true },
    { text: '{PLACEHOLDER_REPREZENTANT_LEGAL}' },
  ]));

  // Sectiunea I: Date salariat
  b.push(p('I. DATE PRIVIND SALARIATUL', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Numele și prenumele: ', bold: true },
    { text: '{PLACEHOLDER_NUME_COMPLET}' },
    { text: ' (Nume: {PLACEHOLDER_NUME}, Prenume: {PLACEHOLDER_PRENUME})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Cod Numeric Personal (CNP): ', bold: true },
    { text: '{PLACEHOLDER_CNP}' },
  ]));
  b.push(pRuns([
    { text: 'Data și locul nașterii: ', bold: true },
    { text: '{PLACEHOLDER_DATA_NASTERII}, {PLACEHOLDER_LOCALITATE_NASTERII}, jud. {PLACEHOLDER_JUDET_NASTERII}' },
  ]));
  b.push(pRuns([
    { text: 'Domiciliul: ', bold: true },
    { text: '{PLACEHOLDER_DOMICILIU}' },
  ]));
  b.push(pRuns([
    { text: 'Funcția / Ocupația: ', bold: true },
    { text: '{PLACEHOLDER_FUNCTIE}' },
    { text: ' (Cod COR: {PLACEHOLDER_COD_COR})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Locul de muncă / Atelier / Punct de lucru: ', bold: true },
    { text: '{PLACEHOLDER_LOC_MUNCA}' },
  ]));

  // Sectiunea II: Instructaj Introductiv General PSI
  b.push(p('II. INSTRUCTAJUL INTRODUCTIV GENERAL PSI/SU', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(p('Efectuat conform OMAI nr. 712/2005 art. 15-28 privind instruirea în domeniul situațiilor de urgență.', { italic: true, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Data instructajului: ', bold: true },
    { text: '{PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI}' },
    { text: ' | Durata: ', bold: true },
    { text: '{PLACEHOLDER_DURATA_INSTRUCTAJ_IG_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Persoana care a efectuat instructajul (Cadru Tehnic / Responsabil PSI): ', bold: true },
    { text: '{PLACEHOLDER_INSTRUCTOR_IG_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Tematica instructajului (Legea 307/2006, reguli evacuare, stingătoare): ', bold: true },
    { text: '{PLACEHOLDER_TEMATICA_IG_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Persoana care a verificat însușirea cunoștințelor: ', bold: true },
    { text: '{PLACEHOLDER_VERIFICATOR_IG_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Semnătura salariatului: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura instructorului: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura verificatorului: ', bold: true },
    { text: '...........................' },
  ], { spaceBefore: 60, spaceAfter: 100 }));

  // Sectiunea III: Instructaj Specific Locului de Munca PSI
  b.push(p('III. INSTRUCTAJUL SPECIFIC LOCULUI DE MUNCĂ PSI/SU', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(p('Efectuat conform OMAI nr. 712/2005 art. 29-35.', { italic: true, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Data instructajului: ', bold: true },
    { text: '{PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI}' },
    { text: ' | Durata: ', bold: true },
    { text: '{PLACEHOLDER_DURATA_INSTRUCTAJ_LM_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Locul de muncă instruit: ', bold: true },
    { text: '{PLACEHOLDER_LOC_MUNCA_LM_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Conducătorul locului de muncă care a instruit: ', bold: true },
    { text: '{PLACEHOLDER_INSTRUCTOR_LM_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Tematica specifică (măsuri concrete, instalații electrice, stingătoare): ', bold: true },
    { text: '{PLACEHOLDER_TEMATICA_LM_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Persoana care a verificat cunoștințele: ', bold: true },
    { text: '{PLACEHOLDER_VERIFICATOR_LM_PSI}' },
  ]));
  b.push(pRuns([
    { text: 'Semnătura salariatului: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura instructorului: ', bold: true },
    { text: '...........................' },
    { text: '   Semnătura verificatorului: ', bold: true },
    { text: '...........................' },
  ], { spaceBefore: 60, spaceAfter: 100 }));

  // Sectiunea IV: Admiterea la Lucru PSI
  b.push(p('IV. ADMITEREA LA LUCRU', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(pRuns([
    { text: 'Salariatul a fost testat și a dovedit cunoașterea măsurilor de apărare împotriva incendiilor. Se admite începerea activității de la data de: ', bold: false },
    { text: '{PLACEHOLDER_DATA_ADMITERE_PSI}', bold: true },
  ]));
  b.push(pRuns([
    { text: 'Aprobat de conducătorul unității: ', bold: true },
    { text: '{PLACEHOLDER_ADMITERE_NUME_PSI}' },
    { text: ' (Reprezentant Legal Angajator: {PLACEHOLDER_REPREZENTANT_LEGAL})', bold: true },
  ]));
  b.push(pRuns([
    { text: 'Semnătura și ștampila: ', bold: true },
    { text: '..................................................' },
  ], { spaceBefore: 60, spaceAfter: 120 }));

  // Sectiunea V: Instructaj Periodic PSI (16 randuri padded)
  b.push(p('V. INSTRUCTAJUL PERIODIC PSI/SU (EVIDENȚĂ MULTIANUALĂ)', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 60 }));
  b.push(p('Efectuat periodic conform OMAI nr. 712/2005 art. 36-40 (minim 2 ore la intervalele stabilite).', { italic: true, spaceAfter: 60 }));

  const psiTableWidths = [500, 1300, 800, 4200, 1000, 1000, 1000];
  const psiTableHeaders = [
    'Nr.',
    'Data',
    'Durata',
    'Tema predată / Materialul parcurs',
    'Semnătură instruit',
    'Semnătură instructor',
    'Semnătură verificator',
  ];

  const psiTblPr = `
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
  `;

  const psiHeaderRow = row(
    psiTableHeaders.map((h) => ({
      text: h,
      bold: true,
      align: 'center',
      fill: 'EAEAEA',
    })),
    psiTableWidths,
    true
  );

  const psiLoopRow = `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[0]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{#instructajePeriodicePSI}{nr}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[1]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{data}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[2]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{durata}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[3]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tema}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[4]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaInstruit}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[5]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaInstructor}</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${psiTableWidths[6]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaVerificator}{/instructajePeriodicePSI}</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
  `;

  b.push(`<w:tbl>${psiTblPr}${psiHeaderRow}${psiLoopRow}</w:tbl>`);

  // Sectiunea VI: Exercitii practice / simulari
  b.push(p('VI. EXERCIȚII PRACTICE ȘI APLICAȚII PRIVIND SITUAȚIILE DE URGENȚĂ', { bold: true, size: 22, spaceBefore: 160, spaceAfter: 60 }));
  const exWidths = [500, 1300, 1800, 3400, 1200, 1200, 1200];
  const exHeaderRow = row(
    ['Nr.', 'Data', 'Tip exercițiu', 'Scenariul / Tema aplicației', 'Calificativ', 'Participant', 'Conducător'].map(h => ({
      text: h, bold: true, align: 'center', fill: 'EAEAEA',
    })),
    exWidths,
    true
  );
  const exLoopRow = `
    <w:tr>
      <w:trPr><w:cantSplit/></w:trPr>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[0]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{#exercitiiPracticePSI}{nr}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[1]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{data}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[2]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tipExercitiu}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[3]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{tema}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[4]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{calificativ}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[5]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaParticipant}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${exWidths[6]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{semnaturaConducator}{/exercitiiPracticePSI}</w:t></w:r></w:p></w:tc>
    </w:tr>
  `;
  b.push(`<w:tbl>${psiTblPr}${exHeaderRow}${exLoopRow}</w:tbl>`);

  return wrapDocumentBody(b.join('\n'));
}

// ============================================================================
// 3. F9: med-fisa-solicitare-examen.docx
// ============================================================================
function generateMedFisaSolicitare(): string {
  const b: string[] = [];

  // Antet
  b.push(p('MINISTERUL SĂNĂTĂȚII PUBLICE', { bold: true, align: 'center', size: 22, spaceAfter: 20 }));
  b.push(p('Conform Hotărârii Guvernului nr. 355/2007 privind supravegherea sănătății lucrătorilor', { italic: true, align: 'center', size: 18, spaceAfter: 40 }));
  b.push(p('ANEXA nr. 2', { bold: true, align: 'center', size: 20, spaceAfter: 120 }));

  b.push(p('FIȘĂ DE SOLICITARE A EXAMENULUI MEDICAL', { bold: true, align: 'center', size: 28, spaceBefore: 60, spaceAfter: 20 }));
  b.push(p('(la angajare, control medical periodic, adaptare, reluarea muncii, supraveghere specială)', { italic: true, align: 'center', size: 18, spaceAfter: 180 }));

  // Date angajator
  b.push(pRuns([
    { text: 'Unitatea / Societatea: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'CUI / CIF: ', bold: true },
    { text: '{PLACEHOLDER_CUI}' },
    { text: ' | Nr. Reg. Com.: ', bold: true },
    { text: '{PLACEHOLDER_NR_REG_COM}' },
  ]));
  b.push(pRuns([
    { text: 'Sediul social: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_FIRMA}' },
    { text: ' | Telefon: ', bold: true },
    { text: '{PLACEHOLDER_TELEFON_FIRMA}' },
    { text: ' | E-mail: ', bold: true },
    { text: '{PLACEHOLDER_EMAIL_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'Cod CAEN: ', bold: true },
    { text: '{PLACEHOLDER_COD_CAEN}' },
    { text: ' | Domeniu de activitate: ', bold: true },
    { text: '{PLACEHOLDER_ACTIVITATE_CAEN}' },
  ]));
  b.push(pRuns([
    { text: 'Nr. înregistrare solicitare angajator: ', bold: true },
    { text: '{PLACEHOLDER_NUMAR_INREGISTRARE_SOLICITARE}' },
  ]));

  // Destinatar
  b.push(p('CĂTRE CABINETUL DE MEDICINA MUNCII', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Cabinet / Unitate Medicală: ', bold: true },
    { text: '{PLACEHOLDER_CABINET_MEDICINA_MUNCII}' },
  ]));
  b.push(pRuns([
    { text: 'În atenția: Dr. ', bold: true },
    { text: '{PLACEHOLDER_MEDIC_MEDICINA_MUNCII}' },
    { text: ' (Adresă cabinet: {PLACEHOLDER_ADRESA_CABINET_MEDICINA_MUNCII})', italic: true },
  ]));

  // Tip examen
  b.push(p('TIPUL EXAMENULUI MEDICAL SOLICITAT:', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: ' {PLACEHOLDER_BIFAT_ANGAJARE} ', bold: true },
    { text: 'Examen medical la angajare' },
    { text: '       {PLACEHOLDER_BIFAT_PERIODIC} ', bold: true },
    { text: 'Control medical periodic' },
  ]));
  b.push(pRuns([
    { text: ' {PLACEHOLDER_BIFAT_ADAPTARE} ', bold: true },
    { text: 'Examen medical de adaptare' },
    { text: '      {PLACEHOLDER_BIFAT_RELUARE} ', bold: true },
    { text: 'Examen medical la reluarea muncii' },
  ]));
  b.push(pRuns([
    { text: ' {PLACEHOLDER_BIFAT_SPECIALA} ', bold: true },
    { text: 'Supraveghere medicală specială' },
    { text: '  {PLACEHOLDER_BIFAT_SCHIMBARE_LOC} ', bold: true },
    { text: 'Schimbarea locului de muncă' },
  ]));
  b.push(pRuns([
    { text: ' {PLACEHOLDER_BIFAT_LA_CERERE} ', bold: true },
    { text: 'Examen medical la cerere' },
    { text: '       {PLACEHOLDER_BIFAT_ALTELE} ', bold: true },
    { text: 'Altele (specificare: {PLACEHOLDER_TIP_EXAMEN_MEDICAL})' },
  ]));

  // Date salariat
  b.push(p('DATE PRIVIND PERSOANA EXAMINATĂ:', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Numele și prenumele: ', bold: true },
    { text: '{PLACEHOLDER_APELATIV_SALARIAT} {PLACEHOLDER_NUME_COMPLET}' },
    { text: ' (Nume anterior: {PLACEHOLDER_NUME_ANTERIOR})', italic: true },
    { text: ' | Sexul: ', bold: true },
    { text: '{PLACEHOLDER_SEX}' },
  ]));
  b.push(pRuns([
    { text: 'Data și locul nașterii: ', bold: true },
    { text: '{PLACEHOLDER_DATA_NASTERII}, localitatea {PLACEHOLDER_LOCALITATE_NASTERII}, jud. {PLACEHOLDER_JUDET_NASTERII}' },
  ]));
  b.push(pRuns([
    { text: 'Cod Numeric Personal (CNP): ', bold: true },
    { text: '{PLACEHOLDER_CNP}' },
  ]));
  b.push(pRuns([
    { text: 'Act identitate: ', bold: true },
    { text: '{PLACEHOLDER_TIP_ACT} seria {PLACEHOLDER_SERIE_ACT} nr. {PLACEHOLDER_NUMAR_ACT}, eliberat de {PLACEHOLDER_EMITENT_ACT} la data de {PLACEHOLDER_DATA_EMITERII}' },
  ]));
  b.push(pRuns([
    { text: 'Adresa de domiciliu: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_DOMICILIU}' },
  ]));
  b.push(pRuns([
    { text: 'Profesiunea / Ocupația de bază: ', bold: true },
    { text: '{PLACEHOLDER_PROFESIE_OCUPATIE}' },
  ]));

  // Post si conditii
  b.push(p('POSTUL ȘI CONDIȚIILE DE MUNCĂ:', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Funcția în care este/urmează a fi încadrat: ', bold: true },
    { text: '{PLACEHOLDER_FUNCTIE}' },
    { text: ' (Cod COR: {PLACEHOLDER_COD_COR})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Locul de muncă / Punctul de lucru: ', bold: true },
    { text: '{PLACEHOLDER_PUNCT_LUCRU}' },
    { text: ' | Adresă: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_PUNCT_LUCRU}' },
  ]));
  b.push(pRuns([
    { text: 'Secția / Atelierul / Compartimentul: ', bold: true },
    { text: '{PLACEHOLDER_SECTIE_COMPARTIMENT}' },
  ]));
  b.push(pRuns([
    { text: 'Vechimea în muncă: ', bold: true },
    { text: 'Totală: {PLACEHOLDER_VECHIME_TOTALA} | În profesie: {PLACEHOLDER_VECHIME_MESERIE} | La locul actual: {PLACEHOLDER_VECHIME_LOC_MUNCA}' },
  ]));
  b.push(pRuns([
    { text: 'Traseu profesional anterior / Expunere la noxe: ', bold: true },
    { text: '{PLACEHOLDER_TRASEU_PROFESIONAL}' },
  ]));

  // Clauza legala de trimitere
  b.push(p('CLAUZĂ LEGALĂ DE CONFORMITATE (HG 355/2007 art. 16 alin. 1):', { bold: true, size: 20, spaceBefore: 140, spaceAfter: 40 }));
  b.push(p('Persoana examinată urmează să efectueze activitatea profesională la un loc/post de muncă ce prezintă factorii de risc profesional detaliați în Fișa de identificare a factorilor de risc profesional conform Anexei nr. 3 la HG nr. 355/2007, anexată obligatoriu prezentei solicitări.', { italic: true, spaceAfter: 120 }));

  // Semnaturi
  b.push(pRuns([
    { text: 'Data întocmirii solicitării: ', bold: true },
    { text: '{PLACEHOLDER_DATA_SOLICITARII}' },
  ]));
  b.push(pRuns([
    { text: 'Specialist SSM desemnat: ', bold: true },
    { text: '{PLACEHOLDER_SPECIALIST_SSM}' },
  ]));
  b.push(pRuns([
    { text: 'Reprezentant Legal Angajator: ', bold: true },
    { text: '{PLACEHOLDER_REPREZENTANT_LEGAL}' },
    { text: ' ({PLACEHOLDER_FUNCTIE_REPREZENTANT})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Semnătura și ștampila angajatorului: ', bold: true },
    { text: '..................................................' },
  ], { spaceBefore: 80, spaceAfter: 60 }));

  return wrapDocumentBody(b.join('\n'));
}

// ============================================================================
// 4. F9: med-fisa-identificare-riscuri.docx
// ============================================================================
function generateMedFisaRiscuri(): string {
  const b: string[] = [];

  // Antet
  b.push(p('MINISTERUL SĂNĂTĂȚII PUBLICE', { bold: true, align: 'center', size: 22, spaceAfter: 20 }));
  b.push(p('Conform Hotărârii Guvernului nr. 355/2007 privind supravegherea sănătății lucrătorilor', { italic: true, align: 'center', size: 18, spaceAfter: 40 }));
  b.push(p('ANEXA nr. 3', { bold: true, align: 'center', size: 20, spaceAfter: 120 }));

  b.push(p('FIȘĂ DE IDENTIFICARE A FACTORILOR DE RISC PROFESIONAL', { bold: true, align: 'center', size: 28, spaceBefore: 60, spaceAfter: 20 }));
  b.push(p('(anexă obligatorie și indisolubilă la fișa de solicitare a examenului medical)', { italic: true, align: 'center', size: 18, spaceAfter: 180 }));

  // 1. Date Identificare
  b.push(p('1. DATE DE IDENTIFICARE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Unitatea / Societatea: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}' },
    { text: ' | CUI: ', bold: true },
    { text: '{PLACEHOLDER_CUI}' },
  ]));
  b.push(pRuns([
    { text: 'Sediul social: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_FIRMA}' },
    { text: ' | Telefon: ', bold: true },
    { text: '{PLACEHOLDER_TELEFON_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'Subunitatea / Punctul de lucru: ', bold: true },
    { text: '{PLACEHOLDER_SUBUNITATE}' },
    { text: ' | Adresă: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_PUNCT_LUCRU}' },
  ]));
  b.push(pRuns([
    { text: 'Numele și prenumele lucrătorului: ', bold: true },
    { text: '{PLACEHOLDER_NUME_COMPLET}' },
    { text: ' | CNP: ', bold: true },
    { text: '{PLACEHOLDER_CNP}' },
    { text: ' | Data nașterii: ', bold: true },
    { text: '{PLACEHOLDER_DATA_NASTERII}' },
  ]));
  b.push(pRuns([
    { text: 'Denumirea postului / Funcția: ', bold: true },
    { text: '{PLACEHOLDER_FUNCTIE}' },
    { text: ' (Cod COR: {PLACEHOLDER_COD_COR})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Secția / Atelierul / Compartimentul: ', bold: true },
    { text: '{PLACEHOLDER_SECTIE_COMPARTIMENT}' },
    { text: ' | Navetă: ', bold: true },
    { text: '{PLACEHOLDER_NAVETA_STATUS} ({PLACEHOLDER_NAVETA_ORE} ore/zi)' },
  ]));

  // 2. Organizarea muncii
  b.push(p('2. ORGANIZAREA MUNCII', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Lucru în echipă: ', bold: true },
    { text: '{PLACEHOLDER_LUCRU_ECHIPA}' },
    { text: ' | Durata muncii: ', bold: true },
    { text: '{PLACEHOLDER_ORE_PE_ZI} ore/zi' },
    { text: ' | Număr schimburi: ', bold: true },
    { text: '{PLACEHOLDER_NUMAR_SCHIMBURI}' },
  ]));
  b.push(pRuns([
    { text: 'Schimb de noapte: ', bold: true },
    { text: '{PLACEHOLDER_SCHIMB_NOAPTE}' },
    { text: ' | Pauze organizate: ', bold: true },
    { text: '{PLACEHOLDER_PAUZE_ORGANIZATE}' },
    { text: ' | Muncă la bandă rulantă: ', bold: true },
    { text: '{PLACEHOLDER_BANDA_RULANTA}' },
  ]));

  // 3. Activitate & Echipamente
  b.push(p('3. DESCRIEREA OPERAȚIUNILOR ȘI ECHIPAMENTELOR UTILIZATE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Operațiuni executate în procesul muncii: ', bold: true },
    { text: '{PLACEHOLDER_DESCRIERE_ACTIVITATE}' },
  ]));
  b.push(pRuns([
    { text: 'Echipamente / utilaje / instalații folosite: ', bold: true },
    { text: '{PLACEHOLDER_ECHIPAMENTE_POST}' },
  ]));
  b.push(pRuns([
    { text: 'Condiții generale ale postului de lucru: ', bold: true },
    { text: '{PLACEHOLDER_CONDITII_POST}' },
  ]));

  // 4. Riscuri potentiale de accidentare
  b.push(p('4. FACTORI DE RISC DE ACCIDENTARE IDENTIFICAȚI', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Risc infectare: ', bold: true },
    { text: '{PLACEHOLDER_RISC_INFECTARE}' },
    { text: ' | Risc electrocutare: ', bold: true },
    { text: '{PLACEHOLDER_RISC_ELECTROCUTARE}' },
  ]));
  b.push(pRuns([
    { text: 'Risc înec: ', bold: true },
    { text: '{PLACEHOLDER_RISC_INEC}' },
    { text: ' | Risc asfixiere: ', bold: true },
    { text: '{PLACEHOLDER_RISC_ASFIXIERE}' },
    { text: ' | Blocare în spații înguste: ', bold: true },
    { text: '{PLACEHOLDER_RISC_BLOCARE}' },
  ]));
  b.push(pRuns([
    { text: 'Risc lovire: ', bold: true },
    { text: '{PLACEHOLDER_RISC_LOVIRE}' },
    { text: ' | Risc strivire: ', bold: true },
    { text: '{PLACEHOLDER_RISC_STRIVIRE}' },
    { text: ' | Risc tăiere: ', bold: true },
    { text: '{PLACEHOLDER_RISC_TAIERE}' },
    { text: ' | Risc înțepare: ', bold: true },
    { text: '{PLACEHOLDER_RISC_INTEPARE}' },
  ]));
  b.push(pRuns([
    { text: 'Mușcătură / zgâriere: ', bold: true },
    { text: '{PLACEHOLDER_RISC_MUSCATURA}' },
    { text: ' | Împușcare: ', bold: true },
    { text: '{PLACEHOLDER_RISC_IMPUSCARE}' },
    { text: ' | Arsuri/opărire: ', bold: true },
    { text: '{PLACEHOLDER_RISC_ARSURI_OPARIRE}' },
  ]));
  b.push(pRuns([
    { text: 'Microtraumatisme repetate: ', bold: true },
    { text: '{PLACEHOLDER_RISC_MICROTRAUMATISME}' },
    { text: ' | Mișcări repetitive: ', bold: true },
    { text: '{PLACEHOLDER_MISCARI_REPETITIVE}' },
  ]));

  // 5. Conditii speciale
  b.push(p('5. CONDIȚII SPECIALE DE MUNCĂ', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Conducere mașină instituție: ', bold: true },
    { text: '{PLACEHOLDER_AUTO_INSTITUTIE} (Permis Cat. {PLACEHOLDER_CATEGORIE_PERMIS})' },
  ]));
  b.push(pRuns([
    { text: 'Condiții deosebite / speciale de muncă: ', bold: true },
    { text: '{PLACEHOLDER_CONDITII_DEOSEBITE_SPECIALE}' },
  ]));
  b.push(pRuns([
    { text: 'Sector alimentar: ', bold: true },
    { text: '{PLACEHOLDER_SECTOR_ALIMENTAR}' },
    { text: ' | Port-armă: ', bold: true },
    { text: '{PLACEHOLDER_PORT_ARMA}' },
    { text: ' | Lucru la înălțime: ', bold: true },
    { text: '{PLACEHOLDER_LUCRU_INALTIME}' },
    { text: ' | Spații izolate: ', bold: true },
    { text: '{PLACEHOLDER_SPATII_IZOLATE}' },
  ]));

  // 6. Spatiu & Biomecanica
  b.push(p('6. DESCRIEREA SPAȚIULUI DE LUCRU ȘI BIOMECANICĂ', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Dimensiuni încăpere: ', bold: true },
    { text: '{PLACEHOLDER_DIMENSIUNI_INCAPERE}' },
    { text: ' | Suprafață de lucru: ', bold: true },
    { text: '{PLACEHOLDER_SUPRAFATA_LUCRU}' },
    { text: ' | Mediu de activitate: ', bold: true },
    { text: '{PLACEHOLDER_MEDIU_ACTIVITATE}' },
  ]));
  b.push(pRuns([
    { text: 'Nivel efort fizic: ', bold: true },
    { text: '{PLACEHOLDER_NIVEL_EFORT_FIZIC}' },
    { text: ' | Poziție preponderentă de lucru: ', bold: true },
    { text: '{PLACEHOLDER_POZITIE_LUCRU}' },
  ]));
  b.push(pRuns([
    { text: 'Poziții vicioase / forțate: ', bold: true },
    { text: '{PLACEHOLDER_POZITII_VICIOASE}' },
  ]));
  b.push(pRuns([
    { text: 'Manipulare manuală de mase: ', bold: true },
    { text: '{PLACEHOLDER_MANIPULARE_MASE}' },
    { text: ' | Greutate maximă manipulată: ', bold: true },
    { text: '{PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA}' },
  ]));

  // 7. Suprasolicitari
  b.push(p('7. SUPRASOLICITĂRI SENZORIALE ȘI NEUROPSIHICE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Suprasolicitare vizuală (Fișa 243 HG 355/2007 - lucrul la ecran de vizualizare): ', bold: true },
    { text: '{PLACEHOLDER_SUPRASOLICITARE_VIZUALA}' },
  ]));
  b.push(pRuns([
    { text: 'Suprasolicitare auditivă: ', bold: true },
    { text: '{PLACEHOLDER_SUPRASOLICITARE_AUDITIVA}' },
    { text: ' | Suprasolicitare neuropsihică: ', bold: true },
    { text: '{PLACEHOLDER_SUPRASOLICITARE_NEUROPSIHICA}' },
  ]));
  b.push(pRuns([
    { text: 'Suprasolicitare osteoarticulară / musculoscheletică: ', bold: true },
    { text: '{PLACEHOLDER_SOLICITARE_OSTEOARTICULARA}' },
  ]));

  // 8. Factori de mediu profesional
  b.push(p('8. FACTORI DE MEDIU PROFESIONAL', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Agenți chimici: ', bold: true },
    { text: '{PLACEHOLDER_AGENTI_CHIMICI} (VLE: {PLACEHOLDER_AGENTI_CHIMICI_VLE})' },
  ]));
  b.push(pRuns([
    { text: 'Pulberi profesionale: ', bold: true },
    { text: '{PLACEHOLDER_PULBERI_PROFESIONALE} (VLE: {PLACEHOLDER_PULBERI_VLE})' },
  ]));
  b.push(pRuns([
    { text: 'Zgomot profesional: ', bold: true },
    { text: '{PLACEHOLDER_ZGOMOT_PROFESIONAL}' },
    { text: ' | Zgomote impulsive: ', bold: true },
    { text: '{PLACEHOLDER_ZGOMOTE_IMPULSIVE}' },
    { text: ' | Vibrații mecanice: ', bold: true },
    { text: '{PLACEHOLDER_VIBRATII}' },
  ]));
  b.push(pRuns([
    { text: 'Microclimat: Temperatură: ', bold: true },
    { text: '{PLACEHOLDER_TEMPERATURA_AER}' },
    { text: ' | Variații repetate temperatură: ', bold: true },
    { text: '{PLACEHOLDER_VARIATII_TEMPERATURA}' },
    { text: ' | Umiditate: ', bold: true },
    { text: '{PLACEHOLDER_UMIDITATE_AER}' },
    { text: ' | Presiune: ', bold: true },
    { text: '{PLACEHOLDER_PRESIUNE_AER}' },
  ]));
  b.push(pRuns([
    { text: 'Radiații neionizante: ', bold: true },
    { text: '{PLACEHOLDER_RADIATII_NEIONIZANTE}' },
    { text: ' | Radiații ionizante: ', bold: true },
    { text: '{PLACEHOLDER_RADIATII_IONIZANTE}' },
    { text: ' | Agenți biologici: ', bold: true },
    { text: '{PLACEHOLDER_AGENTI_BIOLOGICI}' },
  ]));

  // 9. Mijloace de protectie
  b.push(p('9. MIJLOACE DE PROTECȚIE PREVĂZUTE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Mijloace de protecție colectivă: ', bold: true },
    { text: '{PLACEHOLDER_PROTECTIE_COLECTIVA}' },
  ]));
  b.push(pRuns([
    { text: 'Mijloace de protecție individuală (EIP): ', bold: true },
    { text: '{PLACEHOLDER_PROTECTIE_INDIVIDUALA}' },
  ]));

  // 10. Asumarea documentului
  b.push(p('10. ASUMAREA ȘI VALIDAREA DOCUMENTULUI', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Data completării fișei: ', bold: true },
    { text: '{PLACEHOLDER_DATA_INTOCMIRII}' },
  ]));
  b.push(pRuns([
    { text: 'Întocmit de Specialist SSM: ', bold: true },
    { text: '{PLACEHOLDER_SPECIALIST_SSM}' },
    { text: '   Semnătura: .......................................' },
  ]));
  b.push(pRuns([
    { text: 'Asumat de Reprezentant Legal Angajator: ', bold: true },
    { text: '{PLACEHOLDER_REPREZENTANT_LEGAL}' },
    { text: '   Semnătura și ștampila: .......................................' },
  ]));
  b.push(pRuns([
    { text: 'Luat la cunoștință Medic Medicina Muncii: ', bold: true },
    { text: '{PLACEHOLDER_MEDIC_MEDICINA_MUNCII}' },
    { text: '   Semnătura și parafa: .......................................' },
  ], { spaceBefore: 60, spaceAfter: 60 }));

  return wrapDocumentBody(b.join('\n'));
}

// ============================================================================
// 5. F10 Part A: eip-fisa-acordare-individuala.docx
// ============================================================================
function generateEipFisaAcordare(): string {
  const b: string[] = [];

  // Antet
  b.push(p('MINISTERUL MUNCII, FAMILIEI ȘI PROTECȚIEI SOCIALE', { bold: true, align: 'center', size: 22, spaceAfter: 20 }));
  b.push(p('Conform Hotărârii Guvernului nr. 1048/2006 privind cerințele minime de securitate și sănătate pentru utilizarea de către lucrători a echipamentelor individuale de protecție și Legii nr. 319/2006 art. 13 lit. r, art. 22-23', { italic: true, align: 'center', size: 18, spaceAfter: 80 }));

  b.push(p('FIȘĂ INDIVIDUALĂ DE DOTARE ȘI ACORDARE A ECHIPAMENTULUI INDIVIDUAL DE PROTECȚIE (EIP)', { bold: true, align: 'center', size: 26, spaceBefore: 60, spaceAfter: 160 }));

  // Date angajator
  b.push(pRuns([
    { text: 'Angajator / Unitate: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}' },
    { text: ' | CUI: ', bold: true },
    { text: '{PLACEHOLDER_CUI}' },
    { text: ' | Nr. Reg. Com.: ', bold: true },
    { text: '{PLACEHOLDER_NR_REG_COM}' },
  ]));
  b.push(pRuns([
    { text: 'Sediul social: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_FIRMA}' },
  ]));
  b.push(pRuns([
    { text: 'Punctul de lucru / Șantier: ', bold: true },
    { text: '{PLACEHOLDER_PUNCT_LUCRU}' },
    { text: ' | Adresă: ', bold: true },
    { text: '{PLACEHOLDER_ADRESA_PUNCT_LUCRU}' },
  ]));

  // I. Date Lucrator & Marimi
  b.push(p('I. DATELE LUCRĂTORULUI BENEFICIAR ȘI MĂRIMI INDIVIDUALE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Numele și prenumele: ', bold: true },
    { text: '{PLACEHOLDER_NUME_COMPLET}' },
    { text: ' | CNP: ', bold: true },
    { text: '{PLACEHOLDER_CNP}' },
  ]));
  b.push(pRuns([
    { text: 'Funcția / Ocupația: ', bold: true },
    { text: '{PLACEHOLDER_FUNCTIE}' },
    { text: ' (Cod COR: {PLACEHOLDER_COD_COR})', italic: true },
  ]));
  b.push(pRuns([
    { text: 'Data angajării: ', bold: true },
    { text: '{PLACEHOLDER_DATA_ANGAJARII}' },
    { text: ' | Data deschiderii fișei EIP: ', bold: true },
    { text: '{PLACEHOLDER_DATA_ELIBERARII_FISEI}' },
  ]));
  b.push(pRuns([
    { text: 'Mărimi înregistrate: ', bold: true },
    { text: 'Costum/Haine: {PLACEHOLDER_MARIME_HAINE} | Încălțăminte: {PLACEHOLDER_MARIME_INCALTAMINTE} | Mănuși: {PLACEHOLDER_MARIME_MANUSI} | Cască: {PLACEHOLDER_MARIME_CASCA}' },
  ]));

  // II. Tabel 10 Randuri EIP
  b.push(p('II. EVIDENȚA ACORDĂRII ȘI RESTITUIRII SORTIMENTELOR DE EIP', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));

  const eipWidths = [450, 2000, 1300, 500, 600, 800, 950, 750, 950, 1100, 750];
  const eipHeaders = [
    'Nr.',
    'Denumire sortiment EIP',
    'Standard EN',
    'U.M.',
    'Cant.',
    'Durată',
    'Data acordării',
    'Semnătură primire',
    'Data restituirii',
    'Motiv restituire',
    'Semnătură retur',
  ];

  const eipTblPr = `
    <w:tblPr>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
  `;

  const eipHeaderRow = row(
    eipHeaders.map((h) => ({
      text: h,
      bold: true,
      align: 'center',
      fill: 'EAEAEA',
    })),
    eipWidths,
    true
  );

  let eipBodyRows = '';
  for (let i = 1; i <= 10; i++) {
    const idx = String(i).padStart(2, '0');
    eipBodyRows += `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[0]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">${i}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[1]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_DENUMIRE_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[2]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_STANDARD_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[3]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_UM_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[4]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_CANTITATE_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[5]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_DURATA_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[6]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_DATA_ACORDARII_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[7]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[8]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_DATA_RESTITUIRII_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[9]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_MOTIV_${idx}}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="${eipWidths[10]}" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_EIP_SEMNATURA_RETUR_${idx}}</w:t></w:r></w:p></w:tc>
      </w:tr>
    `;
  }
  b.push(`<w:tbl>${eipTblPr}${eipHeaderRow}${eipBodyRows}</w:tbl>`);

  // III. Angajamentul lucratorului
  b.push(p('III. ANGAJAMENTUL JURIDIC PRIVIND UTILIZAREA EIP', { bold: true, size: 22, spaceBefore: 140, spaceAfter: 40 }));
  b.push(p('Subsemnatul {PLACEHOLDER_NUME_SALARIAT}, având funcția de {PLACEHOLDER_FUNCTIE}, declar că am primit articolele de EIP menționate mai sus, conforme cu standardele europene de securitate și în stare perfectă de utilizare. Mă oblig să le port pe toată durata programului de lucru, să le păstrez în bune condiții, să nu le înstrăinez și să raportez de îndată orice defecțiune conducătorului locului de muncă conform art. 22-23 din Legea nr. 319/2006.', { italic: true, spaceAfter: 120 }));

  // Semnaturi
  b.push(pRuns([
    { text: 'Data semnării fișei EIP: ', bold: true },
    { text: '{PLACEHOLDER_DATA_SEMNARII_EIP}' },
  ]));
  b.push(pRuns([
    { text: 'Semnătura salariatului beneficiar: ', bold: true },
    { text: '..................................................' },
  ]));
  b.push(pRuns([
    { text: 'Gestionar / Responsabil distribuire EIP: ', bold: true },
    { text: '{PLACEHOLDER_GESTIONAR_EIP}' },
    { text: '   Semnătura: .......................................' },
  ]));
  b.push(pRuns([
    { text: 'Conducător direct loc de muncă: ', bold: true },
    { text: '{PLACEHOLDER_SEF_LOC_MUNCA}' },
    { text: '   Semnătura: .......................................' },
  ]));
  b.push(pRuns([
    { text: 'Specialist SSM verificator: ', bold: true },
    { text: '{PLACEHOLDER_SPECIALIST_SSM}' },
    { text: '   Semnătura: .......................................' },
  ]));
  b.push(pRuns([
    { text: 'Reprezentant Legal Angajator: ', bold: true },
    { text: '{PLACEHOLDER_REPREZENTANT_LEGAL}' },
    { text: '   Semnătura și ștampila: .......................................' },
  ], { spaceBefore: 60, spaceAfter: 60 }));

  return wrapDocumentBody(b.join('\n'));
}

// ============================================================================
// 6. F10 Part B: hr-cim-model-cadru-2022.docx
// ============================================================================
function generateHrCim2022(): string {
  const b: string[] = [];

  // Antet
  b.push(p('MINISTERUL MUNCII ȘI SOLIDARITĂȚII SOCIALE', { bold: true, align: 'center', size: 22, spaceAfter: 20 }));
  b.push(p('ORDINUL nr. 2171 din 25 noiembrie 2022 pentru aprobarea modelului-cadru al contractului individual de muncă', { italic: true, align: 'center', size: 18, spaceAfter: 40 }));
  b.push(p('(Publicat în Monitorul Oficial al României nr. 1180 din 9 decembrie 2022)', { italic: true, align: 'center', size: 16, spaceAfter: 80 }));

  b.push(p('CONTRACT INDIVIDUAL DE MUNCĂ MODEL-CADRU', { bold: true, align: 'center', size: 28, spaceBefore: 60, spaceAfter: 20 }));
  b.push(p('încheiat și înregistrat sub nr. {PLACEHOLDER_NUMAR_CIM} la data de {PLACEHOLDER_DATA_SEMNARE} în registrul general de evidență a salariaților', { italic: true, align: 'center', size: 20, spaceAfter: 180 }));

  // Cap A: Partile contractului
  b.push(p('A. PĂRȚILE CONTRACTULUI', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(pRuns([
    { text: 'Angajator - persoană juridică: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}' },
    { text: ', cu sediul în {PLACEHOLDER_ADRESA_FIRMA}, cod poștal {PLACEHOLDER_COD_POSTAL_FIRMA}, telefon {PLACEHOLDER_TELEFON_CONTACT}, e-mail {PLACEHOLDER_EMAIL_CONTACT}, cod unic de înregistrare (CUI/CIF) {PLACEHOLDER_CUI}, număr de înregistrare la registrul comerțului {PLACEHOLDER_NR_REG_COM}, cont bancar (IBAN) {PLACEHOLDER_CONT_BANCA_FIRMA} deschis la {PLACEHOLDER_BANCA_FIRMA}, reprezentată legal prin {PLACEHOLDER_APELATIV_ADMINISTRATOR} {PLACEHOLDER_REPREZENTANT_LEGAL}, în calitate de {PLACEHOLDER_CALITATE_REPREZENTANT},' },
  ]));
  b.push(p('și', { italic: true, align: 'center', spaceBefore: 20, spaceAfter: 20 }));
  b.push(pRuns([
    { text: 'Salariatul(a): ', bold: true },
    { text: '{PLACEHOLDER_APELATIV_SALARIAT} {PLACEHOLDER_NUME_COMPLET}' },
    { text: ', domiciliat(ă) în {PLACEHOLDER_ADRESA_DOMICILIU}, telefon {PLACEHOLDER_TELEFON_SALARIAT}, e-mail {PLACEHOLDER_EMAIL_SALARIAT}, posesor/posesoare al/a actului de identitate {PLACEHOLDER_TIP_ACT} seria {PLACEHOLDER_SERIE_ACT} nr. {PLACEHOLDER_NUMAR_ACT}, eliberat de {PLACEHOLDER_EMITENT_ACT} la data de {PLACEHOLDER_DATA_EMITERII}, având Codul Numeric Personal (CNP) {PLACEHOLDER_CNP}, autorizație/permis de muncă: {PLACEHOLDER_PERMIS_MUNCA},' },
  ]));
  b.push(p('am încheiat prezentul contract individual de muncă în următoarele condiții asupra cărora am convenit:', { spaceBefore: 40, spaceAfter: 80 }));

  // Cap B: Obiectul contractului
  b.push(p('B. OBIECTUL CONTRACTULUI', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('{PLACEHOLDER_OBIECT_CONTRACT}'));

  // Cap C: Durata contractului
  b.push(p('C. DURATA CONTRACTULUI', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Contractul se încheie pe durată: {PLACEHOLDER_TIP_DURATA_CIM}, începând cu data de {PLACEHOLDER_DATA_INCEPERE}.'));
  b.push(p('b) În cazul contractului pe durată determinată: durata este de {PLACEHOLDER_DURATA_LUNI_DETERMINATA} luni, expirând la data de {PLACEHOLDER_DATA_SFARSIT}, în temeiul legal: {PLACEHOLDER_ARTICOL_DURATA_DETERMINATA}.'));

  // Cap D: Perioada de proba (NOU 2022)
  b.push(p('D. PERIOADA DE PROBĂ', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Durata perioadei de probă este de: {PLACEHOLDER_ZILE_PROBA}.'));
  b.push(p('b) Condițiile perioadei de probă: {PLACEHOLDER_CONDITII_PROBA}.'));

  // Cap E: Locul de munca (NOU 2022)
  b.push(p('E. LOCUL DE MUNCĂ', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Activitatea se desfășoară la sediul / punctul de lucru situat în: {PLACEHOLDER_ADRESA_PUNCT_LUCRU}.'));
  b.push(p('b) Modalitatea de lucru (la punct fix, activitate de teren, sau telemuncă): {PLACEHOLDER_TIP_LOC_MUNCA}.'));
  b.push(p('c) Decontarea / Asigurarea transportului de către angajator conform art. 17 alin. 3 lit. b^1 din Legea 53/2003: {PLACEHOLDER_DECONTARE_TRANSPORT}.'));

  // Cap F: Felul muncii
  b.push(p('F. FELUL MUNCII', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('Funcția / Ocupația conform Clasificării Ocupațiilor din România (COR): {PLACEHOLDER_FUNCTIE}, având codul COR: {PLACEHOLDER_COD_COR}.'));

  // Cap G: Durata muncii (NOU 2022)
  b.push(p('G. DURATA MUNCII', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) O normă întreagă: {PLACEHOLDER_TIP_NORMA}, durata normală a timpului de muncă fiind de {PLACEHOLDER_ORE_PE_ZI} ore/zi, respectiv {PLACEHOLDER_ORE_PE_SAPTAMANA} ore/săptămână.'));
  b.push(p('b) Repartizarea programului de lucru: {PLACEHOLDER_REPARTIZARE_PROGRAM}.'));
  b.push(p('c) Programul normal de lucru: {PLACEHOLDER_PROGRAM_LUCRU}.'));
  b.push(p('d) Condițiile de efectuare și compensare a orelor suplimentare: {PLACEHOLDER_CONDITII_ORE_SUPLIMENTARE}.'));
  b.push(p('e) Organizarea muncii în schimburi: {PLACEHOLDER_ORGANIZARE_SCHIMBURI}.'));

  // Cap H: Concediul
  b.push(p('H. CONCEDIUL', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Durata concediului de odihnă anual este de {PLACEHOLDER_ZILE_CONCEDIU}.'));
  b.push(p('b) Zile suplimentare de concediu (condiții grele/vătămătoare/deosebite): {PLACEHOLDER_ZILE_CONCEDIU_SUPLIMENTAR}.'));

  // Cap I: Salariul si alte elemente constitutive (NOU 2022)
  b.push(p('I. SALARIUL ȘI ALTE ELEMENTE CONSTITUTIVE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Salariul de bază lunar brut: {PLACEHOLDER_SALARIU_BRUT}.'));
  b.push(p('b) Sporuri la salariul de bază: {PLACEHOLDER_SPORURI_SALARIU}.'));
  b.push(p('c) Indemnizații: {PLACEHOLDER_INDEMNIZATII_SALARIU}.'));
  b.push(p('d) Alte adaosuri / beneficii în bani sau natură: {PLACEHOLDER_ALTE_ADAOSURI_BENEFICII}.'));
  b.push(p('e) Data plății salariului: {PLACEHOLDER_DATA_PLATA}.'));
  b.push(p('f) Metoda de plată a drepturilor salariale: {PLACEHOLDER_METODA_PLATA}, în contul IBAN {PLACEHOLDER_CONT_BANCA_SALARIAT} deschis la {PLACEHOLDER_BANCA_SALARIAT}.'));

  // Cap J: Drepturi si obligatii SSM
  b.push(p('J. DREPTURI ȘI OBLIGAȚII PRIVIND SECURITATEA ȘI SĂNĂTATEA ÎN MUNCĂ', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Echipament individual de protecție asigurat gratuit de angajator: {PLACEHOLDER_ECHIPAMENT_PROTECTIE}.'));
  b.push(p('b) Echipament individual de lucru: {PLACEHOLDER_ECHIPAMENT_LUCRU}.'));
  b.push(p('c) Materiale igienico-sanitare asigurate: {PLACEHOLDER_MATERIALE_IGIENICO_SANITARE}.'));
  b.push(p('d) Alimentație de protecție: {PLACEHOLDER_ALIMENTATIE_PROTECTIE}.'));

  // Cap K: Alte clauze
  b.push(p('K. ALTE CLAUZE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Perioada de preaviz în cazul concedierii: {PLACEHOLDER_ZILE_PREAVIZ_CONCEDIERE}.'));
  b.push(p('b) Perioada de preaviz în cazul demisiei: {PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE}.'));
  b.push(p('c) Clauze speciale (confidențialitate, neconcurență, mobilitate): {PLACEHOLDER_CLAUZE_SPECIALE}.'));

  // Cap L: Formarea profesionala (NOU 2022)
  b.push(p('L. FORMAREA PROFESIONALĂ', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Periodicitatea formării profesionale: {PLACEHOLDER_PERIODICITATE_FORMARE}.'));
  b.push(p('b) Condițiile privind suportarea cheltuielilor de către angajator: {PLACEHOLDER_CONDITII_FORMARE}.'));

  // Cap M: Asigurare medicala privata, pensii facultative (NOU 2022)
  b.push(p('M. ASIGURARE MEDICALĂ PRIVATĂ, PENSII FACULTATIVE SAU ALTE PRESTAȚII', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('a) Asigurare medicală privată suportată de angajator: {PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA}.'));
  b.push(p('b) Contribuții suplimentare la pensie facultativă sau ocupațională: {PLACEHOLDER_PENSIE_FACULTATIVA}.'));
  b.push(p('c) Alte beneficii sociale acordate din inițiativa angajatorului: {PLACEHOLDER_ALTE_BENEFICII_SOCIALE}.'));

  // Cap N: Drepturi si obligatii generale
  b.push(p('N. DREPTURILE ȘI OBLIGAȚIILE GENERALE ALE PĂRȚILOR', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('Drepturile și obligațiile salariatului și ale angajatorului sunt cele instituite prin art. 39 și 40 din Legea nr. 53/2003 - Codul Muncii, republicată, cu modificările și completările ulterioare.'));

  // Cap O: Dispozitii comune
  b.push(p('O. DISPOZIȚII COMUNE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('Prevederile prezentului contract individual de muncă se completează cu dispozițiile Legii nr. 53/2003 - Codul Muncii, republicată, cu ale Regulamentului Intern și, după caz, cu ale Contractului Colectiv de Muncă aplicabil.'));

  // Cap P: Dispozitii finale
  b.push(p('P. DISPOZIȚII FINALE', { bold: true, size: 22, spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('Prezentul contract individual de muncă s-a încheiat în {PLACEHOLDER_NUMAR_EXEMPLARE_CIM} exemplare originale, câte unul pentru fiecare parte, producând efecte de la data de {PLACEHOLDER_DATA_INCEPERE}.'));

  // Semnaturi
  b.push(pRuns([
    { text: 'ANGAJATOR,                                                            ', bold: true },
    { text: 'SALARIAT,', bold: true },
  ], { spaceBefore: 160, spaceAfter: 40 }));
  b.push(pRuns([
    { text: '{PLACEHOLDER_FIRMA}                                      ', bold: true },
    { text: '{PLACEHOLDER_NUME_COMPLET}', bold: true },
  ]));
  b.push(pRuns([
    { text: 'Reprezentat legal prin: ', bold: false },
    { text: '{PLACEHOLDER_REPREZENTANT_LEGAL}', bold: true },
  ]));
  b.push(pRuns([
    { text: 'Semnătura și ștampila:                                               ', bold: false },
    { text: 'Semnătura: .......................................', bold: false },
  ], { spaceBefore: 60, spaceAfter: 60 }));

  return wrapDocumentBody(b.join('\n'));
}

// ============================================================================
// MAIN GENERATION CONTROLLER
// ============================================================================
async function main() {
  console.log('Generating 6 statutory DOCX templates for M2 (F7-F10)...');

  // 1. F7
  const ssmXml = generateSsmFisaInstruire();
  saveDocxTemplate('ssm-fisa-instruire-individuala.docx', ssmXml);

  // 2. F8
  const psiXml = generatePsiFisaInstructaj();
  saveDocxTemplate('psi-fisa-instructaj-individuala.docx', psiXml);

  // 3. F9 (Part A)
  const medSolicitareXml = generateMedFisaSolicitare();
  saveDocxTemplate('med-fisa-solicitare-examen.docx', medSolicitareXml);

  // 4. F9 (Part B)
  const medRiscuriXml = generateMedFisaRiscuri();
  saveDocxTemplate('med-fisa-identificare-riscuri.docx', medRiscuriXml);

  // 5. F10 (Part A)
  const eipXml = generateEipFisaAcordare();
  saveDocxTemplate('eip-fisa-acordare-individuala.docx', eipXml);

  // 6. F10 (Part B)
  const cimXml = generateHrCim2022();
  saveDocxTemplate('hr-cim-model-cadru-2022.docx', cimXml);

  console.log('✓ Successfully generated all 6 templates in both targets!');
}

main().catch((err) => {
  console.error('Fatal error generating templates:', err);
  process.exit(1);
});
