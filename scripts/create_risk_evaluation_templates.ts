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
  if (!str) return '';
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
    size?: number; // half-points, e.g. 20 = 10pt, 22 = 11pt, 24 = 12pt, 28 = 14pt
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
    : '<w:color w:val="0F172A"/>';
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
        : '<w:color w:val="0F172A"/>';
      const rFonts = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>';
      const rPr = `<w:rPr>${rFonts}${bold}${italic}${u}${sz}${color}</w:rPr>`;
      return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
    })
    .join('');

  return `<w:p>${pPr}${runsXml}</w:p>`;
}

function pageBreak(): string {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function tableCell(
  contentXml: string,
  widthDxa: number,
  options: {
    bgColor?: string;
    vAlign?: 'top' | 'center' | 'bottom';
    colSpan?: number;
  } = {}
): string {
  const span = options.colSpan && options.colSpan > 1 ? `<w:gridSpan w:val="${options.colSpan}"/>` : '';
  const shd = options.bgColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.bgColor}"/>` : '';
  const vAlign = `<w:vAlign w:val="${options.vAlign || 'center'}"/>`;
  const tcMar = '<w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar>';

  return `
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${widthDxa}" w:type="dxa"/>
        ${span}
        ${shd}
        ${vAlign}
        ${tcMar}
      </w:tcPr>
      ${contentXml}
    </w:tc>
  `;
}

function tableHeaderRow(
  headers: Array<{ text: string; width: number; align?: 'left' | 'center' | 'right' }>,
  options: { bgColor?: string; textColor?: string; fontSize?: number } = {}
): string {
  const bg = options.bgColor || '1E3A8A'; // Deep Navy
  const fg = options.textColor || 'FFFFFF';
  const sz = options.fontSize || 18; // 9pt

  const cells = headers
    .map((h) => {
      const pXml = p(h.text, {
        bold: true,
        size: sz,
        align: h.align || 'center',
        color: fg,
        spaceBefore: 60,
        spaceAfter: 60,
      });
      return tableCell(pXml, h.width, { bgColor: bg, vAlign: 'center' });
    })
    .join('\n');

  return `
    <w:tr>
      <w:trPr>
        <w:tblHeader/>
        <w:cantSplit/>
      </w:trPr>
      ${cells}
    </w:tr>
  `;
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

function wrapDocumentBodyLandscape(bodyContent: string): string {
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
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

// INCDPM PECE 7x6 Matrix Colors and values
const PECE_MATRIX_DATA = [
  // G=7 (Deces)
  { g: 7, label: 'Clasa 7 - Excepțională\n(Deces)', row: [3, 4, 5, 6, 7, 7] },
  // G=6 (Inv. gr. I)
  { g: 6, label: 'Clasa 6 - Maximă\n(Invaliditate gr. I)', row: [3, 4, 4, 5, 6, 7] },
  // G=5 (Inv. gr. II)
  { g: 5, label: 'Clasa 5 - Foarte mare\n(Invaliditate gr. II)', row: [2, 3, 4, 4, 5, 6] },
  // G=4 (Inv. gr. III)
  { g: 4, label: 'Clasa 4 - Mare\n(Invaliditate gr. III)', row: [2, 3, 3, 4, 4, 5] },
  // G=3 (ITM 45-180 zile)
  { g: 3, label: 'Clasa 3 - Medie\n(ITM 45 - 180 zile)', row: [2, 2, 3, 3, 3, 4] },
  // G=2 (ITM 3-45 zile)
  { g: 2, label: 'Clasa 2 - Mică\n(ITM 3 - 45 zile)', row: [1, 1, 2, 2, 2, 2] },
  // G=1 (ITM < 3 zile)
  { g: 1, label: 'Clasa 1 - Neglijabilă\n(ITM sub 3 zile)', row: [1, 1, 1, 1, 1, 1] },
];

function getPeceCellColor(r: number): { bg: string; fg: string } {
  switch (r) {
    case 1:
      return { bg: 'DCFCE7', fg: '166534' }; // Verde deschis
    case 2:
      return { bg: 'BBF7D0', fg: '14532D' }; // Verde
    case 3:
      return { bg: 'FEF08A', fg: '854D0E' }; // Galben
    case 4:
      return { bg: 'FED7AA', fg: '9A3412' }; // Portocaliu deschis
    case 5:
      return { bg: 'FDBA74', fg: '7C2D12' }; // Portocaliu intens
    case 6:
      return { bg: 'FCA5A5', fg: '991B1B' }; // Rosu
    case 7:
    default:
      return { bg: 'F87171', fg: '7F1D1D' }; // Rosu intens
  }
}

function buildTable1Gravity(): string {
  const headers = [
    { text: 'Clasa de gravitate', width: 1500, align: 'center' as const },
    { text: 'Denumire gravitate', width: 2200, align: 'center' as const },
    { text: 'Consecințe maxime previzibile / Pierderea capacității de muncă', width: 5900, align: 'left' as const },
  ];

  const rows = [
    { c: 'Clasa 1', d: 'Neglijabilă', desc: 'Consecințe minore, leziuni superficiale fără concediu medical sau cu ITM sub 3 zile (prim ajutor la locul de muncă).' },
    { c: 'Clasa 2', d: 'Mică', desc: 'Incapacitate temporară de muncă (ITM) cu durata între 3 și 45 de zile, vindecare completă fără sechele funcționale.' },
    { c: 'Clasa 3', d: 'Medie', desc: 'Incapacitate temporară de muncă (ITM) de durată medie, cuprinsă între 45 și 180 de zile de recuperare medicală.' },
    { c: 'Clasa 4', d: 'Mare', desc: 'Consecințe ireversibile cu pierderea a cel puțin jumătate din capacitatea de muncă: Invaliditate de gradul III conform legii.' },
    { c: 'Clasa 5', d: 'Foarte mare', desc: 'Consecințe grave cu pierderea totală a capacității de muncă, dar cu posibilitatea de autoservire: Invaliditate de gradul II.' },
    { c: 'Clasa 6', d: 'Maximă', desc: 'Consecințe extrem de grave cu pierderea totală a capacității de muncă și de autoservire (necesită îngrijitor): Invaliditate de gradul I.' },
    { c: 'Clasa 7', d: 'Excepțională', desc: 'Consecințe ireversibile fatale: Decesul victimei în urma producerii accidentului de muncă sau îmbolnăvirii profesionale.' },
  ];

  const rowsXml = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    return `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(p(r.c, { bold: true, size: 18, align: 'center' }), 1500, { bgColor: bg })}
        ${tableCell(p(r.d, { bold: true, size: 18, align: 'center' }), 2200, { bgColor: bg })}
        ${tableCell(p(r.desc, { size: 18, align: 'left' }), 5900, { bgColor: bg })}
      </w:tr>
    `;
  }).join('\n');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableHeaderRow(headers)}
      ${rowsXml}
    </w:tbl>
  `;
}

function buildTable2Probability(): string {
  const headers = [
    { text: 'Clasa de probabilitate', width: 1700, align: 'center' as const },
    { text: 'Denumire clasă', width: 2200, align: 'center' as const },
    { text: 'Criteriu temporal / Frecvența de manifestare a evenimentului', width: 5700, align: 'left' as const },
  ];

  const rows = [
    { c: 'Clasa 1', d: 'Extrem de rară', desc: 'Probabilitate mai mică de o dată la 10 ani (P > 10 ani). Eveniment excepțional în activitatea societății.' },
    { c: 'Clasa 2', d: 'Foarte rară', desc: 'Evenimentul se poate produce o dată la un interval de 5 până la 10 ani (5 ani < P <= 10 ani).' },
    { c: 'Clasa 3', d: 'Rară', desc: 'Evenimentul se poate produce o dată la un interval de 2 până la 5 ani (2 ani < P <= 5 ani).' },
    { c: 'Clasa 4', d: 'Puțin frecventă', desc: 'Evenimentul se poate produce o dată la un interval cuprins între 1 și 2 ani (1 an < P <= 2 ani).' },
    { c: 'Clasa 5', d: 'Frecventă', desc: 'Evenimentul se poate produce o dată la câteva luni, între 1 lună și 1 an (1 lună < P <= 1 an).' },
    { c: 'Clasa 6', d: 'Foarte frecventă', desc: 'Evenimentul se produce cvasipermanent sau la intervale mai mici de o lună (P < 1 lună).' },
  ];

  const rowsXml = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    return `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(p(r.c, { bold: true, size: 18, align: 'center' }), 1700, { bgColor: bg })}
        ${tableCell(p(r.d, { bold: true, size: 18, align: 'center' }), 2200, { bgColor: bg })}
        ${tableCell(p(r.desc, { size: 18, align: 'left' }), 5700, { bgColor: bg })}
      </w:tr>
    `;
  }).join('\n');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableHeaderRow(headers)}
      ${rowsXml}
    </w:tbl>
  `;
}

function buildTable3Matrix(): string {
  const colWidths = [2700, 1150, 1150, 1150, 1150, 1150, 1150]; // Total 9600 dxa

  const headers = [
    { text: 'Clasa de Gravitate / Probabilitate', width: colWidths[0], align: 'center' as const },
    { text: 'P1\n(> 10 ani)', width: colWidths[1], align: 'center' as const },
    { text: 'P2\n(5-10 ani)', width: colWidths[2], align: 'center' as const },
    { text: 'P3\n(2-5 ani)', width: colWidths[3], align: 'center' as const },
    { text: 'P4\n(1-2 ani)', width: colWidths[4], align: 'center' as const },
    { text: 'P5\n(1l - 1 an)', width: colWidths[5], align: 'center' as const },
    { text: 'P6\n(< 1 lună)', width: colWidths[6], align: 'center' as const },
  ];

  const headerRowXml = `
    <w:tr>
      <w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>
      ${headers.map((h) => tableCell(
        p(h.text, { bold: true, size: 17, align: 'center', color: 'FFFFFF' }),
        h.width,
        { bgColor: '0F172A', vAlign: 'center' }
      )).join('')}
    </w:tr>
  `;

  const rowsXml = PECE_MATRIX_DATA.map((rowItem) => {
    const labelLines = rowItem.label.split('\n');
    const labelCellXml = tableCell(
      labelLines.map((l, i) => p(l, { bold: i === 0, size: i === 0 ? 17 : 15, align: 'left', color: '0F172A' })).join(''),
      colWidths[0],
      { bgColor: 'F1F5F9', vAlign: 'center' }
    );

    const dataCellsXml = rowItem.row.map((rVal, pIdx) => {
      const pNum = pIdx + 1;
      const color = getPeceCellColor(rVal);
      const cellContent = `
        ${p(`(${rowItem.g}, ${pNum})`, { size: 14, align: 'center', color: color.fg, spaceBefore: 20, spaceAfter: 10 })}
        ${p(`Nivel ${rVal}`, { bold: true, size: 19, align: 'center', color: color.fg, spaceBefore: 10, spaceAfter: 20 })}
      `;
      return tableCell(cellContent, colWidths[pNum], { bgColor: color.bg, vAlign: 'center' });
    }).join('');

    return `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${labelCellXml}
        ${dataCellsXml}
      </w:tr>
    `;
  }).join('\n');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="475569"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="475569"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="475569"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="475569"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${headerRowXml}
      ${rowsXml}
    </w:tbl>
  `;
}

function buildTable4RiskLevels(): string {
  const headers = [
    { text: 'Nivel Risc', width: 1000, align: 'center' as const },
    { text: 'Nivel Securitate', width: 1200, align: 'center' as const },
    { text: 'Calificativ nivel', width: 2200, align: 'center' as const },
    { text: 'Domeniu de acceptabilitate și cerințe de acțiune', width: 5200, align: 'left' as const },
  ];

  const rows = [
    { r: '1', s: '7', c: 'Risc minim', a: 'ACCEPTABIL. Risc neglijabil; se mențin măsurile uzuale de protecție.', bg: 'DCFCE7', fg: '166534' },
    { r: '2', s: '6', c: 'Risc foarte mic', a: 'ACCEPTABIL. Risc redus; se impune respectarea instrucțiunilor de securitate.', bg: 'BBF7D0', fg: '14532D' },
    { r: '3', s: '5', c: 'Risc mic', a: 'ACCEPTABIL conform INCDPM (Nrg <= 3,50). Monitorizare și instruire periodică.', bg: 'FEF08A', fg: '854D0E' },
    { r: '4', s: '4', c: 'Risc mediu', a: 'TOLERABIL CONDIȚIONAT. Necesită măsuri de reducere în termen de 6-12 luni prin Planul de Prevenire.', bg: 'FED7AA', fg: '9A3412' },
    { r: '5', s: '3', c: 'Risc mare', a: 'INACCEPTABIL. Impune măsuri urgente de securitate tehnică/organizatorică în 1-3 luni.', bg: 'FDBA74', fg: '7C2D12' },
    { r: '6', s: '2', c: 'Risc foarte mare', a: 'INACCEPTABIL. Măsuri imediate în termen de câteva zile; restricționarea temporară a accesului.', bg: 'FCA5A5', fg: '991B1B' },
    { r: '7', s: '1', c: 'Risc maxim (Critic)', a: 'INACCEPTABIL (PERICOL GRAV ȘI IMINENT). Oprirea imediată a activității până la eliminarea pericolului.', bg: 'F87171', fg: '7F1D1D' },
  ];

  const rowsXml = rows.map((item) => {
    return `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(p(item.r, { bold: true, size: 20, align: 'center', color: item.fg }), 1000, { bgColor: item.bg })}
        ${tableCell(p(item.s, { bold: true, size: 20, align: 'center' }), 1200, { bgColor: 'F8FAFC' })}
        ${tableCell(p(item.c, { bold: true, size: 18, align: 'center', color: item.fg }), 2200, { bgColor: item.bg })}
        ${tableCell(p(item.a, { size: 18, align: 'left' }), 5200, { bgColor: 'FFFFFF' })}
      </w:tr>
    `;
  }).join('\n');

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableHeaderRow(headers)}
      ${rowsXml}
    </w:tbl>
  `;
}

function buildTable5EvaluationSheet(): string {
  // Widths: Total 9600 dxa
  // Nr (500), Element (1300), FactorRisc (1900), Manifestare (2500), Consecinte (1400), G (600), P (600), R (800)
  const colWidths = [500, 1300, 1900, 2500, 1400, 600, 600, 800];

  const headers = [
    { text: 'Nr. crt.', width: colWidths[0], align: 'center' as const },
    { text: 'Componenta sistemului', width: colWidths[1], align: 'center' as const },
    { text: 'Factor de risc identificat', width: colWidths[2], align: 'left' as const },
    { text: 'Forma concretă de manifestare a factorilor de risc', width: colWidths[3], align: 'left' as const },
    { text: 'Consecința maximă', width: colWidths[4], align: 'center' as const },
    { text: 'Clasa G', width: colWidths[5], align: 'center' as const },
    { text: 'Clasa P', width: colWidths[6], align: 'center' as const },
    { text: 'Nivel Risc', width: colWidths[7], align: 'center' as const },
  ];

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableHeaderRow(headers, { bgColor: '1E3A8A', fontSize: 17 })}
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(p('{#riskItems}{nr}', { bold: true, size: 17, align: 'center' }), colWidths[0], { vAlign: 'center' })}
        ${tableCell(p('{element}', { bold: true, size: 16, align: 'center', color: '1E3A8A' }), colWidths[1], { vAlign: 'center' })}
        ${tableCell(p('{factorRisc}', { bold: true, size: 17, align: 'left' }), colWidths[2], { vAlign: 'top' })}
        ${tableCell(p('{manifestare}', { size: 17, align: 'left' }), colWidths[3], { vAlign: 'top' })}
        ${tableCell(p('{consecinte}', { size: 16, align: 'center' }), colWidths[4], { vAlign: 'center' })}
        ${tableCell(p('{gravitate}', { bold: true, size: 18, align: 'center' }), colWidths[5], { vAlign: 'center' })}
        ${tableCell(p('{probabilitate}', { bold: true, size: 18, align: 'center' }), colWidths[6], { vAlign: 'center' })}
        ${tableCell(p('{nivelRisc}{/riskItems}', { bold: true, size: 20, align: 'center', color: 'B91C1C' }), colWidths[7], { bgColor: 'FEF2F2', vAlign: 'center' })}
      </w:tr>
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(
          p('NIVELUL GLOBAL DE RISC AL LOCULUI DE MUNCĂ (Nrg = Σ Ri² / Σ Ri):', { bold: true, size: 19, align: 'right', color: '0F172A' }),
          colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6],
          { colSpan: 7, bgColor: 'F1F5F9', vAlign: 'center' }
        )}
        ${tableCell(
          p('{PLACEHOLDER_NIVEL_RISC_GLOBAL}', { bold: true, size: 24, align: 'center', color: '166534' }),
          colWidths[7],
          { bgColor: 'DCFCE7', vAlign: 'center' }
        )}
      </w:tr>
    </w:tbl>
  `;
}

function buildTable6PreventionPlan(): string {
  // Widths: Total 9600 dxa
  // Nr (500), Risc (1900), Tehn (1300), Org (1300), Ig (1100), Alta (800), Actiuni (1200), Termen (700), Resp (800)
  const colWidths = [500, 1900, 1300, 1300, 1100, 800, 1200, 700, 800];

  const headers = [
    { text: 'Nr. crt.', width: colWidths[0], align: 'center' as const },
    { text: 'Riscuri evaluate / Factor de risc', width: colWidths[1], align: 'left' as const },
    { text: 'Măsuri tehnice', width: colWidths[2], align: 'left' as const },
    { text: 'Măsuri organizatorice', width: colWidths[3], align: 'left' as const },
    { text: 'Măsuri igienico-sanitare', width: colWidths[4], align: 'left' as const },
    { text: 'Măsuri altă natură', width: colWidths[5], align: 'left' as const },
    { text: 'Acțiuni realizare măsură', width: colWidths[6], align: 'left' as const },
    { text: 'Termen', width: colWidths[7], align: 'center' as const },
    { text: 'Persoana care răspunde', width: colWidths[8], align: 'center' as const },
  ];

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableHeaderRow(headers, { bgColor: '0F172A', fontSize: 16 })}
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(p('{#planPrevenire}{nr}', { bold: true, size: 16, align: 'center' }), colWidths[0], { vAlign: 'center' })}
        ${tableCell(p('{riscEvaluat}', { bold: true, size: 16, align: 'left' }), colWidths[1], { vAlign: 'top' })}
        ${tableCell(p('{masuriTehnice}', { size: 16, align: 'left' }), colWidths[2], { vAlign: 'top' })}
        ${tableCell(p('{masuriOrganizatorice}', { size: 16, align: 'left' }), colWidths[3], { vAlign: 'top' })}
        ${tableCell(p('{masuriIgienicoSanitare}', { size: 16, align: 'left' }), colWidths[4], { vAlign: 'top' })}
        ${tableCell(p('{masuriAltaNatura}', { size: 16, align: 'left' }), colWidths[5], { vAlign: 'top' })}
        ${tableCell(p('{actiuni}', { size: 16, align: 'left' }), colWidths[6], { vAlign: 'top' })}
        ${tableCell(p('{termen}', { size: 16, align: 'center' }), colWidths[7], { vAlign: 'center' })}
        ${tableCell(p('{responsabil}{/planPrevenire}', { size: 16, align: 'center' }), colWidths[8], { vAlign: 'center' })}
      </w:tr>
    </w:tbl>
  `;
}

function buildTableSignatures(): string {
  const colWidth = 3200; // 3 columns = 9600 dxa
  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(
          `
            ${p('ÎNTOCMIT,', { bold: true, size: 18, align: 'center', color: '1E3A8A' })}
            ${p('Evaluator de Risc SSM', { bold: true, size: 17, align: 'center' })}
            ${p('{PLACEHOLDER_EVALUATOR_RISC}', { bold: true, size: 18, align: 'center', color: '002060', spaceBefore: 60, spaceAfter: 40 })}
            ${p('Certificat: {PLACEHOLDER_CERTIFICAT_EVALUATOR}', { size: 15, align: 'center', color: '475569' })}
            ${p('Semnătura: __________________', { size: 16, align: 'center', spaceBefore: 120, spaceAfter: 40 })}
          `,
          colWidth,
          { bgColor: 'F8FAFC' }
        )}
        ${tableCell(
          `
            ${p('VERIFICAT,', { bold: true, size: 18, align: 'center', color: '1E3A8A' })}
            ${p('Lucrător Desemnat SSM', { bold: true, size: 17, align: 'center' })}
            ${p('{PLACEHOLDER_LUCRATOR_DESEMNAT_SSM}', { bold: true, size: 18, align: 'center', color: '002060', spaceBefore: 60, spaceAfter: 40 })}
            ${p('Serviciu SSM: {PLACEHOLDER_PRESTATOR_SSM}', { size: 15, align: 'center', color: '475569' })}
            ${p('Semnătura: __________________', { size: 16, align: 'center', spaceBefore: 120, spaceAfter: 40 })}
          `,
          colWidth,
          { bgColor: 'F8FAFC' }
        )}
        ${tableCell(
          `
            ${p('APROBAT,', { bold: true, size: 18, align: 'center', color: '166534' })}
            ${p('Reprezentant Legal / Administrator', { bold: true, size: 17, align: 'center' })}
            ${p('{PLACEHOLDER_REPREZENTANT_LEGAL}', { bold: true, size: 18, align: 'center', color: '002060', spaceBefore: 60, spaceAfter: 40 })}
            ${p('Societatea: {PLACEHOLDER_FIRMA}', { size: 15, align: 'center', color: '475569' })}
            ${p('Semnătura & Ștampila: ________', { size: 16, align: 'center', spaceBefore: 120, spaceAfter: 40 })}
          `,
          colWidth,
          { bgColor: 'F0FDF4' }
        )}
      </w:tr>
    </w:tbl>
  `;
}

function generateEvaluareRiscuriXml(): string {
  const b: string[] = [];

  // Antet societate / aprobare
  b.push(`
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="5400" w:type="dxa"/></w:tcPr>
          ${p('S.C. {PLACEHOLDER_FIRMA}', { bold: true, size: 21, color: '1E3A8A' })}
          ${p('C.U.I.: {PLACEHOLDER_CUI} | Reg. Com.: {PLACEHOLDER_NR_REG_COM}', { size: 17, color: '475569' })}
          ${p('Sediu: {PLACEHOLDER_ADRESA_FIRMA}', { size: 17, color: '475569' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          ${p('APROBAT,', { bold: true, size: 20, align: 'right', color: '166534' })}
          ${p('Reprezentant Legal: {PLACEHOLDER_REPREZENTANT_LEGAL}', { bold: true, size: 18, align: 'right' })}
          ${p('Data: {PLACEHOLDER_DATA_DOCUMENT}', { size: 17, align: 'right', color: '475569' })}
        </w:tc>
      </w:tr>
    </w:tbl>
  `);

  // Spacing
  b.push(p('', { spaceBefore: 200, spaceAfter: 200 }));

  // Titlu Principal
  b.push(p('DOSAR DE EVALUARE A RISCURILOR DE ACCIDENTARE ȘI ÎMBOLNĂVIRE PROFESIONALĂ', {
    bold: true,
    size: 28,
    align: 'center',
    color: '1E3A8A',
    spaceBefore: 200,
    spaceAfter: 120,
  }));

  b.push(p('PENTRU LOCUL DE MUNCĂ / POSTUL:', {
    bold: true,
    size: 22,
    align: 'center',
    color: '0F172A',
    spaceBefore: 60,
    spaceAfter: 60,
  }));

  b.push(p('{PLACEHOLDER_FUNCTIE}', {
    bold: true,
    size: 30,
    align: 'center',
    color: 'B91C1C',
    spaceBefore: 60,
    spaceAfter: 120,
  }));

  b.push(p('Domeniu CAEN: {PLACEHOLDER_COD_CAEN} - {PLACEHOLDER_ACTIVITATE_PRINCIPALA}', {
    bold: true,
    italic: true,
    size: 20,
    align: 'center',
    color: '475569',
    spaceBefore: 60,
    spaceAfter: 200,
  }));

  b.push(p('Metoda de evaluare: I.N.C.D.P.M. București (Metoda Pece)', {
    bold: true,
    size: 21,
    align: 'center',
    color: '1E3A8A',
    spaceBefore: 60,
    spaceAfter: 40,
  }));

  b.push(p('Elaborat în conformitate cu Legea securității și sănătății în muncă nr. 319/2006 și Normele metodologice aprobate prin H.G. nr. 1425/2006 cu modificările ulterioare.', {
    italic: true,
    size: 18,
    align: 'center',
    color: '475569',
    spaceBefore: 40,
    spaceAfter: 300,
  }));

  // Foaie de gardă detalii
  b.push(`
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="8000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          ${p('Evaluator de Risc SSM:', { bold: true, size: 18, align: 'left' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>
          ${p('{PLACEHOLDER_EVALUATOR_RISC}', { bold: true, size: 18, color: '1E3A8A' })}
          ${p('Certificat atestare: {PLACEHOLDER_CERTIFICAT_EVALUATOR}', { size: 16, color: '475569' })}
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          ${p('Serviciu Extern SSM (SEPP):', { bold: true, size: 18, align: 'left' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>
          ${p('{PLACEHOLDER_PRESTATOR_SSM}', { bold: true, size: 18 })}
          ${p('Specialist SSM: {PLACEHOLDER_SPECIALIST_SSM}', { size: 16, color: '475569' })}
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="3200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:tcPr>
          ${p('Anul Evaluării:', { bold: true, size: 18, align: 'left' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>
          ${p('{PLACEHOLDER_AN_EVALUARE}', { bold: true, size: 18, color: '166534' })}
        </w:tc>
      </w:tr>
    </w:tbl>
  `);

  b.push(pageBreak());

  // CAPITOLUL 1
  b.push(p('CAPITOLUL 1: PREZENTAREA SOCIETĂȚII ȘI DESCRIEREA LOCULUI DE MUNCĂ', {
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 120,
  }));

  b.push(pRuns([
    { text: '1.1 Date generale de identificare ale persoanei juridice:\n', bold: true },
    { text: 'Societatea ' },
    { text: '{PLACEHOLDER_FIRMA}', bold: true },
    { text: ', având Codul Unic de Înregistrare (C.U.I.) ' },
    { text: '{PLACEHOLDER_CUI}', bold: true },
    { text: ', număr de ordine în Registrul Comerțului ' },
    { text: '{PLACEHOLDER_NR_REG_COM}', bold: true },
    { text: ', cu sediul social înregistrat la adresa: ' },
    { text: '{PLACEHOLDER_ADRESA_FIRMA}', bold: true },
    { text: ', reprezentată legal prin dl./dna ' },
    { text: '{PLACEHOLDER_REPREZENTANT_LEGAL}', bold: true },
    { text: ', în calitate de Administrator / Director General.' },
  ], { spaceBefore: 60, spaceAfter: 100 }));

  b.push(pRuns([
    { text: '1.2 Descrierea activității și a postului evaluat:\n', bold: true },
    { text: 'Activitatea principală a unității se desfășoară conform codului CAEN ' },
    { text: '{PLACEHOLDER_COD_CAEN}', bold: true },
    { text: ' - ' },
    { text: '{PLACEHOLDER_ACTIVITATE_PRINCIPALA}', bold: true },
    { text: '. Postul de lucru supus prezentei proceduri de evaluare a factorilor de risc profesional este ' },
    { text: '{PLACEHOLDER_FUNCTIE}', bold: true, color: '1E3A8A' },
    { text: '. Numărul total de salariați care își desfășoară activitatea pe acest post sau posturi similare este de ' },
    { text: '{PLACEHOLDER_NUMAR_LUCRATORI}', bold: true },
    { text: ', iar regimul de lucru stabilit este de ' },
    { text: '{PLACEHOLDER_PROGRAM_LUCRU}', bold: true },
    { text: '.' },
  ], { spaceBefore: 60, spaceAfter: 100 }));

  b.push(p('1.3 Elementele componente ale sistemului de muncă analizat:', { bold: true, size: 21, spaceBefore: 100, spaceAfter: 60 }));

  b.push(p('a) Executantul (Lucrătorul): salariatul încadrat pe funcția evaluată. Își desfășoară atribuțiile conform fișei postului, are calificare profesională corespunzătoare și a efectuat instruirile SSM (introductiv-generală, la locul de muncă și periodice). Executantul este apt medical din punct de vedere al medicinei muncii pentru exercitarea profesiei.', {
    size: 20,
    spaceBefore: 40,
    spaceAfter: 60,
  }));

  b.push(p('b) Sarcina de muncă: totalitatea acțiunilor și operațiunilor repartizate executantului prin procedurile interne și regulamentul de organizare. Cuprinde preluarea dispozițiilor, executarea sarcinilor specifice de birou, operative sau tehnologice, manevrarea echipamentelor și respectarea termenelor impuse.', {
    size: 20,
    spaceBefore: 40,
    spaceAfter: 60,
  }));

  b.push(p('c) Mijloacele de producție: echipamente tehnice, mașini, utilaje, unelte de lucru, calculatoare, periferice, mobilier de birou, instalații electrice și sanitare utilizate direct sau indirect în realizarea sarcinilor de muncă.', {
    size: 20,
    spaceBefore: 40,
    spaceAfter: 60,
  }));

  b.push(p('d) Mediul de muncă: spațiul fizic în care executantul își desfășoară activitatea, caracterizat prin parametrii de microclimat (temperatură, umiditate, viteza curenților de aer), nivelul de iluminare naturală și artificială, nivelul de zgomot, vibrații, calitatea aerului și condițiile igienico-sanitare generale.', {
    size: 20,
    spaceBefore: 40,
    spaceAfter: 160,
  }));

  // CAPITOLUL 2
  b.push(p('CAPITOLUL 2: DESCRIEREA METODEI I.N.C.D.P.M. BUCUREȘTI (METODA PECE)', {
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 140,
    spaceAfter: 120,
  }));

  b.push(p(
    'Metoda utilizată pentru evaluarea securității și sănătății în muncă este metoda avizată de Ministerul Muncii și Protecției Sociale, elaborată de Institutul Național de Cercetare - Dezvoltare pentru Protecția Muncii „Alexandru Darabont” București (INCDPM).',
    { size: 20, spaceBefore: 40, spaceAfter: 80 }
  ));

  b.push(p(
    '2.1 Principiul Metodei:\nMetoda are la bază identificarea exhaustivă a tuturor factorilor de risc de accidentare și îmbolnăvire profesională existenți în cadrul celor patru componente ale sistemului de muncă (Executant, Sarcină de muncă, Mijloace de producție, Mediu de muncă). Pentru fiecare factor identificat se stabilește consecința maximă previzibilă și se cuantifică riscul asociat prin determinarea cuplului Gravitate (G) și Probabilitate (P), obținându-se Nivelul Parțial de Risc (R_i).',
    { size: 20, spaceBefore: 40, spaceAfter: 80 }
  ));

  b.push(p(
    '2.2 Formula Matematică de Calcul a Nivelului Global de Risc (Nrg):\nNivelul global de risc al locului de muncă se calculează ca o medie ponderată a nivelurilor parțiale de risc stabilite pentru toți factorii de risc identificați, acordând pondere maximă factorilor cu gravitate și probabilitate ridicată (formula Pece):',
    { size: 20, spaceBefore: 40, spaceAfter: 80 }
  ));

  b.push(p('Nrg = ( Σ Ri² ) / ( Σ Ri )', {
    bold: true,
    size: 26,
    align: 'center',
    color: '1E3A8A',
    spaceBefore: 100,
    spaceAfter: 100,
  }));

  b.push(p(
    'unde: Ri reprezintă nivelul parțial de risc determinat pentru factorul de risc „i” prin intersecția coordonatelor (G, P) în matricea de evaluare, iar suma se calculează pentru toți cei „n” factori de risc identificați.',
    { italic: true, size: 18, align: 'center', spaceBefore: 40, spaceAfter: 80 }
  ));

  b.push(p(
    '2.3 Criteriul Statutar de Acceptabilitate:\nConform standardului INCDPM, un loc de muncă este considerat cu nivel de risc ACCEPTABIL dacă Nivelul Global de Risc calculat respectă condiția imperativă:\nNrg <= 3,50.\nÎn situația în care anumiți factori individuali înregistrează un nivel parțial de risc Ri >= 4, aceștia constituie factori de risc prioritar și impun măsuri obligatorii de prevenire și protecție cuprinse în planul anual al întreprinderii.',
    { size: 20, spaceBefore: 40, spaceAfter: 160 }
  ));

  b.push(pageBreak());

  // CAPITOLUL 3
  b.push(p('CAPITOLUL 3: SCĂRILE DE COTARE ȘI MATRICELE STATUTARE INCDPM', {
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 120,
  }));

  b.push(p('3.1 Scala Claselor de Gravitate a Consecințelor Acțiunii Factorilor de Risc (1 - 7):', {
    bold: true,
    size: 21,
    color: '0F172A',
    spaceBefore: 80,
    spaceAfter: 60,
  }));
  b.push(buildTable1Gravity());

  b.push(p('', { spaceBefore: 120, spaceAfter: 120 }));

  b.push(p('3.2 Scala Claselor de Probabilitate a Manifestării Evenimentelor Periculoase (1 - 6):', {
    bold: true,
    size: 21,
    color: '0F172A',
    spaceBefore: 100,
    spaceAfter: 60,
  }));
  b.push(buildTable2Probability());

  b.push(pageBreak());

  b.push(p('3.3 Matricea Bidimensională INCDPM de Evaluare a Riscurilor (7 x 6):', {
    bold: true,
    size: 21,
    color: '1E3A8A',
    spaceBefore: 100,
    spaceAfter: 60,
  }));
  b.push(p(
    'Fiecare casetă a matricei corespunde cuplului format din clasa de gravitate (axa verticală G=1..7) și clasa de probabilitate (axa orizontală P=1..6), determinând Nivelul Parțial de Risc rezultat (R = 1..7). Celulele sunt diferențiate cromatic conform codificării naționale INCDPM:',
    { size: 19, spaceBefore: 40, spaceAfter: 80 }
  ));
  b.push(buildTable3Matrix());

  // Legendă cromatică sub matrice
  b.push(`
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="DCFCE7"/></w:tcPr>
          ${p('Nivel 1 - 2: Risc minim / mic\n(Acceptabil)', { bold: true, size: 16, align: 'center', color: '166534' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FEF08A"/></w:tcPr>
          ${p('Nivel 3: Risc acceptabil\n(Monitorizare)', { bold: true, size: 16, align: 'center', color: '854D0E' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FED7AA"/></w:tcPr>
          ${p('Nivel 4 - 5: Risc mediu / mare\n(Măsuri prioritare)', { bold: true, size: 16, align: 'center', color: '9A3412' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FCA5A5"/></w:tcPr>
          ${p('Nivel 6 - 7: Risc foarte mare / critic\n(Pericol iminent)', { bold: true, size: 16, align: 'center', color: '7F1D1D' })}
        </w:tc>
      </w:tr>
    </w:tbl>
  `);

  b.push(p('', { spaceBefore: 120, spaceAfter: 120 }));

  b.push(p('3.4 Scala de Încadrare a Nivelurilor de Risc și Securitate a Muncii:', {
    bold: true,
    size: 21,
    color: '0F172A',
    spaceBefore: 100,
    spaceAfter: 60,
  }));
  b.push(buildTable4RiskLevels());

  b.push(pageBreak());

  // CAPITOLUL 4: FIȘA DE EVALUARE
  b.push(p('CAPITOLUL 4: FIȘA DE EVALUARE A LOCULUI DE MUNCĂ', {
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 80,
  }));

  b.push(pRuns([
    { text: 'Unitatea: ', bold: true },
    { text: '{PLACEHOLDER_FIRMA}', bold: true, color: '1E3A8A' },
    { text: ' | Loc de muncă / Post: ' },
    { text: '{PLACEHOLDER_FUNCTIE}', bold: true, color: 'B91C1C' },
    { text: ' | Evaluator: ' },
    { text: '{PLACEHOLDER_EVALUATOR_RISC}', bold: true },
  ], { spaceBefore: 40, spaceAfter: 80 }));

  b.push(buildTable5EvaluationSheet());

  b.push(pageBreak());

  // CAPITOLUL 5: SINTEZĂ ȘI CONCLUZII
  b.push(p('CAPITOLUL 5: SINTEZA EVALUĂRII ȘI CONCLUZII PRIVIND NIVELUL DE RISC', {
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 100,
  }));

  b.push(p('5.1 Repartiția Factorilor de Risc pe Subsistemele Sistemului de Muncă:', {
    bold: true,
    size: 21,
    color: '0F172A',
    spaceBefore: 80,
    spaceAfter: 60,
  }));

  b.push(p('{PLACEHOLDER_REPARTITIE_RISCURI}', {
    bold: true,
    size: 20,
    color: '1E3A8A',
    spaceBefore: 40,
    spaceAfter: 80,
  }));

  b.push(pRuns([
    { text: 'Total factori de risc identificați și evaluați: ', bold: true },
    { text: '{PLACEHOLDER_NUMAR_FACTORI_RISC}', bold: true, color: '002060' },
  ], { spaceBefore: 40, spaceAfter: 100 }));

  b.push(p('5.2 Concluzia Generală a Raportului de Evaluare:', {
    bold: true,
    size: 21,
    color: '0F172A',
    spaceBefore: 80,
    spaceAfter: 60,
  }));

  b.push(p('{PLACEHOLDER_CONCLUZII_EVALUARE}', {
    size: 20,
    spaceBefore: 60,
    spaceAfter: 120,
  }));

  b.push(p(
    'În baza analizei cantitative și calitative efectuate prin Metoda INCDPM, postul de muncă analizat corespunde cerințelor de securitate și sănătate în muncă prevăzute de legislația națională în vigoare, cu condiția aplicării integrale și permanente a măsurilor stabilite în Planul de Prevenire și Protecție.',
    { italic: true, size: 19, spaceBefore: 40, spaceAfter: 160 }
  ));

  b.push(pageBreak());

  // CAPITOLUL 6: PLANUL DE PREVENIRE ȘI PROTECȚIE
  b.push(p('CAPITOLUL 6: PLANUL DE PREVENIRE ȘI PROTECȚIE', {
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 60,
  }));

  b.push(p('Elaborat în temeiul Art. 15 alin. (1) pct. 2 din H.G. nr. 1425/2006 pentru locul de muncă / postul {PLACEHOLDER_FUNCTIE}', {
    italic: true,
    size: 18,
    color: '475569',
    spaceBefore: 20,
    spaceAfter: 100,
  }));

  b.push(buildTable6PreventionPlan());

  b.push(p('', { spaceBefore: 200, spaceAfter: 200 }));

  // CAPITOLUL 7: COMISIA DE EVALUARE ȘI APROBĂRI
  b.push(p('CAPITOLUL 7: COMISIA DE EVALUARE ȘI SEMNĂTURI', {
    bold: true,
    size: 22,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 100,
  }));

  b.push(buildTableSignatures());

  return wrapDocumentBody(b.join('\n'));
}

function generateTesaXml(): string {
  const b: string[] = [];

  // Antet societate / aprobare
  b.push(`
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="5400" w:type="dxa"/></w:tcPr>
          ${p('S.C. {PLACEHOLDER_FIRMA}', { bold: true, size: 21, color: '1E3A8A' })}
          ${p('C.U.I.: {PLACEHOLDER_CUI} | Reg. Com.: {PLACEHOLDER_NR_REG_COM}', { size: 17, color: '475569' })}
          ${p('Sediu: {PLACEHOLDER_ADRESA_FIRMA}', { size: 17, color: '475569' })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4200" w:type="dxa"/></w:tcPr>
          ${p('APROBAT,', { bold: true, size: 20, align: 'right', color: '166534' })}
          ${p('Administrator: {PLACEHOLDER_REPREZENTANT_LEGAL}', { bold: true, size: 18, align: 'right' })}
          ${p('Data: {PLACEHOLDER_DATA_DOCUMENT}', { size: 17, align: 'right', color: '475569' })}
        </w:tc>
      </w:tr>
    </w:tbl>
  `);

  b.push(p('', { spaceBefore: 160, spaceAfter: 160 }));

  // Titlu TESA
  b.push(p('FIȘĂ DE EVALUARE A FACTORILOR DE RISC PROFESIONAL', {
    bold: true,
    size: 28,
    align: 'center',
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 60,
  }));

  b.push(p('POSTUL DE LUCRU: FUNCȚIONAR ADMINISTRATIV / PERSONAL TESA', {
    bold: true,
    size: 24,
    align: 'center',
    color: 'B91C1C',
    spaceBefore: 60,
    spaceAfter: 80,
  }));

  b.push(p('Activități de birou, utilizare echipamente cu ecran de vizualizare (IT / TESA) conform Legii 319/2006 și HG 1028/2006. Metoda INCDPM București.', {
    italic: true,
    size: 19,
    align: 'center',
    color: '475569',
    spaceBefore: 40,
    spaceAfter: 200,
  }));

  b.push(p('1. Matricea de Evaluare a Riscurilor INCDPM Pece (7 x 6):', {
    bold: true,
    size: 21,
    color: '1E3A8A',
    spaceBefore: 100,
    spaceAfter: 60,
  }));
  b.push(buildTable3Matrix());

  b.push(p('', { spaceBefore: 160, spaceAfter: 160 }));

  b.push(p('2. Fișa de Evaluare a Factorilor de Risc la Locul de Muncă:', {
    bold: true,
    size: 21,
    color: '1E3A8A',
    spaceBefore: 100,
    spaceAfter: 60,
  }));
  b.push(buildTable5EvaluationSheet());

  b.push(p('', { spaceBefore: 160, spaceAfter: 160 }));

  b.push(p('3. Sinteza Evaluării și Interpretarea Nivelului de Risc:', {
    bold: true,
    size: 21,
    color: '1E3A8A',
    spaceBefore: 100,
    spaceAfter: 60,
  }));

  b.push(p('{PLACEHOLDER_CONCLUZII_EVALUARE}', {
    size: 20,
    spaceBefore: 60,
    spaceAfter: 80,
  }));

  b.push(pRuns([
    { text: 'Repartiția factorilor: ', bold: true },
    { text: '{PLACEHOLDER_REPARTITIE_RISCURI}', bold: true, color: '1E3A8A' },
  ], { spaceBefore: 40, spaceAfter: 160 }));

  b.push(p('4. Aprobări și Semnături:', {
    bold: true,
    size: 21,
    color: '1E3A8A',
    spaceBefore: 120,
    spaceAfter: 80,
  }));
  b.push(buildTableSignatures());

  return wrapDocumentBody(b.join('\n'));
}

export function generatePlanPrevenireXml(): string {
  const b: string[] = [];

  // 1. Formal Company & Legal Header Table (14800 dxa)
  const headerXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="14800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:bottom w:val="none"/>
          <w:left w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(
          `
            ${p('S.C. {PLACEHOLDER_FIRMA}', { bold: true, size: 22, color: '1E3A8A', spaceBefore: 0, spaceAfter: 40 })}
            ${p('C.U.I.: {PLACEHOLDER_CUI} | Nr. Reg. Com.: {PLACEHOLDER_NR_REG_COM}', { size: 19, color: '475569', spaceBefore: 20, spaceAfter: 40 })}
            ${p('Sediu social: {PLACEHOLDER_ADRESA_FIRMA}', { size: 19, color: '475569', spaceBefore: 20, spaceAfter: 40 })}
            ${p('Punct de lucru: {PLACEHOLDER_PUNCT_LUCRU}', { size: 19, color: '475569', spaceBefore: 20, spaceAfter: 40 })}
          `,
          9500,
          { vAlign: 'top' }
        )}
        ${tableCell(
          `
            ${p('APROBAT,', { bold: true, size: 20, align: 'center', color: '1E3A8A', spaceBefore: 0, spaceAfter: 20 })}
            ${p('ADMINISTRATOR / ANGAJATOR', { bold: true, size: 17, align: 'center', color: '0F172A', spaceBefore: 20, spaceAfter: 40 })}
            ${p('{PLACEHOLDER_REPREZENTANT_LEGAL}', { bold: true, size: 20, align: 'center', color: 'B91C1C', spaceBefore: 20, spaceAfter: 40 })}
            ${p('Semnătura și ștampila: ........................', { size: 16, align: 'center', color: '64748B', spaceBefore: 60, spaceAfter: 40 })}
            ${p('Data aprobării: {PLACEHOLDER_DATA_DOCUMENT}', { size: 18, align: 'center', color: '334155', spaceBefore: 40, spaceAfter: 20 })}
          `,
          5300,
          { bgColor: 'F8FAFC', vAlign: 'center' }
        )}
      </w:tr>
    </w:tbl>
  `;
  b.push(headerXml);

  b.push(p('', { spaceBefore: 120, spaceAfter: 120 }));

  // 2. Title Block (Statutory HG 1425/2006 Art. 15)
  b.push(p('PLANUL DE PREVENIRE ȘI PROTECȚIE', {
    bold: true,
    size: 28,
    align: 'center',
    color: '1E3A8A',
    spaceBefore: 80,
    spaceAfter: 40,
  }));

  b.push(p('PENTRU LOCUL DE MUNCĂ / POSTUL: {PLACEHOLDER_FUNCTIE}', {
    bold: true,
    size: 22,
    align: 'center',
    color: 'B91C1C',
    spaceBefore: 40,
    spaceAfter: 60,
  }));

  b.push(p('Elaborat în temeiul Art. 15 alin. (1) pct. 2 din H.G. nr. 1425/2006 pentru punerea în aplicare a Legii securității și sănătății în muncă nr. 319/2006', {
    italic: true,
    size: 18,
    align: 'center',
    color: '475569',
    spaceBefore: 20,
    spaceAfter: 40,
  }));

  b.push(p('Domeniu de activitate CAEN: {PLACEHOLDER_DOMENIU_ACTIVITATE}', {
    size: 18,
    align: 'center',
    color: '64748B',
    spaceBefore: 20,
    spaceAfter: 160,
  }));

  // 3. Prevention Plan Table (14800 dxa) - 9 statutory columns
  const colWidths = [600, 2600, 2100, 2100, 1700, 1200, 2300, 1000, 1200];
  const headers = [
    { text: 'Nr. crt.', width: colWidths[0], align: 'center' as const },
    { text: 'Loc de muncă / Riscuri evaluate', width: colWidths[1], align: 'left' as const },
    { text: 'Măsuri tehnice', width: colWidths[2], align: 'left' as const },
    { text: 'Măsuri organizatorice', width: colWidths[3], align: 'left' as const },
    { text: 'Măsuri igienico-sanitare', width: colWidths[4], align: 'left' as const },
    { text: 'Măsuri de altă natură', width: colWidths[5], align: 'left' as const },
    { text: 'Acțiuni realizare măsură', width: colWidths[6], align: 'left' as const },
    { text: 'Termen', width: colWidths[7], align: 'center' as const },
    { text: 'Persoana care răspunde', width: colWidths[8], align: 'center' as const },
  ];

  const tableXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="14800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      ${tableHeaderRow(headers, { bgColor: '1E3A8A', fontSize: 17 })}
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(p('{#planPrevenire}{nr}', { bold: true, size: 17, align: 'center' }), colWidths[0], { vAlign: 'center' })}
        ${tableCell(p('{riscEvaluat}', { bold: true, size: 17, align: 'left' }), colWidths[1], { vAlign: 'top' })}
        ${tableCell(p('{masuriTehnice}', { size: 17, align: 'left' }), colWidths[2], { vAlign: 'top' })}
        ${tableCell(p('{masuriOrganizatorice}', { size: 17, align: 'left' }), colWidths[3], { vAlign: 'top' })}
        ${tableCell(p('{masuriIgienicoSanitare}', { size: 17, align: 'left' }), colWidths[4], { vAlign: 'top' })}
        ${tableCell(p('{masuriAltaNatura}', { size: 17, align: 'left' }), colWidths[5], { vAlign: 'top' })}
        ${tableCell(p('{actiuni}', { size: 17, align: 'left' }), colWidths[6], { vAlign: 'top' })}
        ${tableCell(p('{termen}', { size: 17, align: 'center' }), colWidths[7], { vAlign: 'center' })}
        ${tableCell(p('{responsabil}{/planPrevenire}', { size: 17, align: 'center' }), colWidths[8], { vAlign: 'center' })}
      </w:tr>
    </w:tbl>
  `;
  b.push(tableXml);

  // 4. Statutory Revision Footnote
  b.push(p('Notă: Prezentul Plan de Prevenire și Protecție se revizuiește cel puțin o dată pe an, ori de câte ori intervin modificări ale condițiilor de muncă, la apariția unor riscuri noi sau în urma producerii unui accident de muncă / eveniment, conform art. 15 alin. (2) din H.G. nr. 1425/2006.', {
    italic: true,
    size: 16,
    color: '475569',
    spaceBefore: 120,
    spaceAfter: 140,
  }));

  // 5. Signatures Table (14800 dxa / 3 = 4933 dxa each)
  const sigColWidth = 4933;
  const signaturesXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="14800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${tableCell(
          `
            ${p('ÎNTOCMIT,', { bold: true, size: 19, align: 'center', color: '1E3A8A' })}
            ${p('Serviciu Extern de Prevenire și Protecție (SEPP)', { bold: true, size: 17, align: 'center', color: '475569' })}
            ${p('{PLACEHOLDER_PRESTATOR_SSM}', { bold: true, size: 18, align: 'center', color: '0F172A', spaceBefore: 40, spaceAfter: 20 })}
            ${p('Specialist SSM: {PLACEHOLDER_SPECIALIST_SSM}', { size: 17, align: 'center', color: '334155' })}
            ${p('Semnătura: __________________', { size: 16, align: 'center', spaceBefore: 100, spaceAfter: 20 })}
          `,
          sigColWidth,
          { bgColor: 'F8FAFC', vAlign: 'top' }
        )}
        ${tableCell(
          `
            ${p('VERIFICAT,', { bold: true, size: 19, align: 'center', color: '1E3A8A' })}
            ${p('Lucrător Desemnat SSM / Reprezentant Lucrători', { bold: true, size: 17, align: 'center', color: '475569' })}
            ${p('{PLACEHOLDER_LUCRATOR_DESEMNAT_SSM}', { bold: true, size: 18, align: 'center', color: '0F172A', spaceBefore: 40, spaceAfter: 20 })}
            ${p('Semnătura: __________________', { size: 16, align: 'center', spaceBefore: 120, spaceAfter: 20 })}
          `,
          sigColWidth,
          { bgColor: 'F8FAFC', vAlign: 'top' }
        )}
        ${tableCell(
          `
            ${p('APROBAT,', { bold: true, size: 19, align: 'center', color: '1E3A8A' })}
            ${p('Administrator / Angajator', { bold: true, size: 17, align: 'center', color: '475569' })}
            ${p('{PLACEHOLDER_REPREZENTANT_LEGAL}', { bold: true, size: 18, align: 'center', color: 'B91C1C', spaceBefore: 40, spaceAfter: 20 })}
            ${p('Semnătura și ștampila: __________________', { size: 16, align: 'center', spaceBefore: 120, spaceAfter: 20 })}
          `,
          sigColWidth + 34,
          { bgColor: 'F8FAFC', vAlign: 'top' }
        )}
      </w:tr>
    </w:tbl>
  `;
  b.push(signaturesXml);

  return wrapDocumentBodyLandscape(b.join('\n'));
}

function saveDocxTemplate(filename: string, documentXml: string) {
  const baseContent = fs.readFileSync(BASE_TEMPLATE_PATH);
  const zip = new PizZip(baseContent);
  zip.file('word/document.xml', documentXml);

  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const targetPath = path.join(dir, filename);
    fs.writeFileSync(targetPath, buffer);
    console.log(`Saved template: ${targetPath} (${buffer.length} bytes)`);
  }
}

export function generateRiskTemplates() {
  console.log('Generating EVALUAREA RISCURILOR.docx...');
  const evaluareXml = generateEvaluareRiscuriXml();
  saveDocxTemplate('EVALUAREA RISCURILOR.docx', evaluareXml);

  console.log('Generating TESA.docx...');
  const tesaXml = generateTesaXml();
  saveDocxTemplate('TESA.docx', tesaXml);

  console.log('Generating Plan de Prevenire TESA.docx (A4 Landscape)...');
  const planPrevenireXml = generatePlanPrevenireXml();
  saveDocxTemplate('Plan de Prevenire TESA.docx', planPrevenireXml);

  console.log('Finished generating clean statutory INCDPM risk evaluation templates!');
}

if (require.main === module) {
  generateRiskTemplates();
}
