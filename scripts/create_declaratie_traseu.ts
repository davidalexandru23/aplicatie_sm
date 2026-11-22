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
    underline?: boolean;
    size?: number; // half-points, e.g. 22 = 11pt, 24 = 12pt, 28 = 14pt
    align?: 'left' | 'center' | 'right' | 'both';
    spaceBefore?: number;
    spaceAfter?: number;
    color?: string;
  } = {}
): string {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const spacing = `<w:spacing w:before="${options.spaceBefore ?? 80}" w:after="${options.spaceAfter ?? 80}" w:line="240" w:lineRule="auto"/>`;
  const pPr = `<w:pPr>${align}${spacing}</w:pPr>`;

  if (!text) return `<w:p>${pPr}</w:p>`;

  const bold = options.bold ? '<w:b/><w:bCs/>' : '';
  const italic = options.italic ? '<w:i/><w:iCs/>' : '';
  const u = options.underline ? '<w:u w:val="single"/>' : '';
  const sz = options.size
    ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`
    : '<w:sz w:val="22"/><w:szCs w:val="22"/>';
  const color = options.color
    ? `<w:color w:val="${options.color}"/>`
    : '<w:color w:val="000000"/>';
  const rFonts = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
  const rPr = `<w:rPr>${rFonts}${bold}${italic}${u}${sz}${color}</w:rPr>`;

  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function pRuns(
  runs: Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
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
  const spacing = `<w:spacing w:before="${options.spaceBefore ?? 80}" w:after="${options.spaceAfter ?? 80}" w:line="240" w:lineRule="auto"/>`;
  const pPr = `<w:pPr>${align}${spacing}</w:pPr>`;

  const runsXml = runs
    .map((r) => {
      const bold = r.bold ? '<w:b/><w:bCs/>' : '';
      const italic = r.italic ? '<w:i/><w:iCs/>' : '';
      const u = r.underline ? '<w:u w:val="single"/>' : '';
      const sz = r.size
        ? `<w:sz w:val="${r.size}"/><w:szCs w:val="${r.size}"/>`
        : '<w:sz w:val="22"/><w:szCs w:val="22"/>';
      const color = r.color
        ? `<w:color w:val="${r.color}"/>`
        : '<w:color w:val="000000"/>';
      const rFonts = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
      const rPr = `<w:rPr>${rFonts}${bold}${italic}${u}${sz}${color}</w:rPr>`;
      return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
    })
    .join('');

  return `<w:p>${pPr}${runsXml}</w:p>`;
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

function generateDeclaratieTraseuXml(): string {
  const b: string[] = [];

  // Antet angajator
  b.push(pRuns([
    { text: 'Angajator: ', bold: true, color: '003399', size: 20 },
    { text: '{PLACEHOLDER_NUME_COMPANIE}', bold: true, color: '003399', size: 20 },
    { text: ' | C.U.I.: ', size: 20 },
    { text: '{PLACEHOLDER_CUI_COMPANIE}', bold: true, size: 20 },
  ], { align: 'left', spaceBefore: 0, spaceAfter: 180 }));

  // Titlu principal
  b.push(p('DECLARAȚIE', { bold: true, size: 28, align: 'center', spaceBefore: 120, spaceAfter: 40 }));
  b.push(p('pe proprie răspundere privind traseul de deplasare la/de la serviciu', { bold: true, underline: true, size: 22, align: 'center', spaceBefore: 40, spaceAfter: 240 }));

  // Paragraf identificare lucrător
  b.push(pRuns([
    { text: 'Subsemnatul/a ' },
    { text: '{PLACEHOLDER_NUME_COMPLET}', bold: true },
    { text: ', posesor al C.I. Seria ' },
    { text: '{PLACEHOLDER_CI_SERIE}', bold: true },
    { text: ', Nr. ' },
    { text: '{PLACEHOLDER_CI_NUMAR}', bold: true },
    { text: ', CNP: ' },
    { text: '{PLACEHOLDER_CNP}', bold: true },
    { text: ', declar pe propria răspundere că am domiciliul în Localitatea ' },
    { text: '{PLACEHOLDER_LOCALITATE}', bold: true },
    { text: ', Strada ' },
    { text: '{PLACEHOLDER_STRADA}', bold: true },
    { text: ', Nr. ' },
    { text: '{PLACEHOLDER_NUMAR_STRADA}', bold: true },
    { text: ', Bl. ' },
    { text: '{PLACEHOLDER_BLOC}', bold: true },
    { text: ', Sc. ' },
    { text: '{PLACEHOLDER_SCARA}', bold: true },
    { text: ', Ap. ' },
    { text: '{PLACEHOLDER_APARTAMENT}', bold: true },
    { text: '.' },
  ], { align: 'both', spaceBefore: 120, spaceAfter: 200 }));

  // Secțiunea Traseul de deplasare
  b.push(p('Traseul de deplasare la/de la serviciu:', { bold: true, underline: true, size: 22, align: 'left', spaceBefore: 160, spaceAfter: 120 }));

  // Punctul 1: Mijloace de transport
  b.push(p('Mijloace de transport utilizate (enumerați toate mijloacele utilizate specificând categoria: tramvai, autobuz, maxi-taxi, cu auto firmă, cu auto personal, cu bicicleta, cu rolele, pietonal, etc.):', {
    bold: true,
    size: 21,
    spaceBefore: 100,
    spaceAfter: 40,
  }));
  b.push(p('{PLACEHOLDER_MIJLOACE_TRANSPORT}', {
    bold: true,
    size: 21,
    color: '002060',
    spaceBefore: 20,
    spaceAfter: 160,
  }));

  // Punctul 2: Durata deplasării
  b.push(p('Perioada de timp alocată deplasării de acasă la locul de muncă / de la locul de muncă spre casă (în ore/minute):', {
    bold: true,
    size: 21,
    spaceBefore: 100,
    spaceAfter: 40,
  }));
  b.push(p('{PLACEHOLDER_DURATA_DEPLASARE}', {
    bold: true,
    size: 21,
    color: '002060',
    spaceBefore: 20,
    spaceAfter: 160,
  }));

  // Punctul 3: Traseul detaliat de deplasare
  b.push(p('Enumerați traseul de deplasare de acasă la locul de muncă / de la locul de muncă spre casă (adresa domiciliu - reper 1 - reper 2 - ..... - adresa loc de muncă):', {
    bold: true,
    size: 21,
    spaceBefore: 100,
    spaceAfter: 40,
  }));
  b.push(p('{PLACEHOLDER_TRASEU_DEPLASARE}', {
    bold: true,
    size: 21,
    color: '002060',
    spaceBefore: 20,
    spaceAfter: 200,
  }));

  // Angajament legal conform Legii 319/2006
  b.push(p(
    'Prin prezenta, mă oblig să aduc la cunoștința angajatorului orice modificare apărută în declarația pe proprie răspundere privind traseul de deplasare la/de la serviciu (schimbarea domiciliului, schimbarea mijlocului de transport, schimbarea traseului de deplasare la/de la serviciu sau durata deplasării).',
    { bold: true, size: 21, align: 'both', spaceBefore: 160, spaceAfter: 260 }
  ));

  // Tabel semnături pe două coloane
  const signColWidths = [4800, 4800];
  const signTableXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="${signColWidths[0]}" w:type="dxa"/></w:tcPr>
          ${p('Semnătura lucrătorului,', { bold: true, size: 21, align: 'left', spaceBefore: 40, spaceAfter: 180 })}
          ${p('________________________________', { size: 21, align: 'left', spaceBefore: 120, spaceAfter: 0 })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="${signColWidths[1]}" w:type="dxa"/></w:tcPr>
          ${p('Data,', { bold: true, size: 21, align: 'left', spaceBefore: 40, spaceAfter: 180 })}
          ${p('{PLACEHOLDER_DATA_CURENTA}', { bold: true, size: 21, align: 'left', spaceBefore: 120, spaceAfter: 0 })}
        </w:tc>
      </w:tr>
    </w:tbl>
  `;
  b.push(signTableXml);

  return wrapDocumentBody(b.join('\n'));
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

async function main() {
  console.log('Generating Declaratie traseu deplasare.docx...');
  const xml = generateDeclaratieTraseuXml();
  saveDocxTemplate('Declaratie traseu deplasare.docx', xml);
  console.log('✓ Successfully generated Declaratie traseu deplasare.docx in both locations!');
}

main().catch(console.error);
