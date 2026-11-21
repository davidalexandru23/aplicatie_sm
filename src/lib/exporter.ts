import ExcelJS from 'exceljs';
import { prisma } from './prisma';
import {
  EXCEL_COLORS,
  THIN_BORDER,
  HEADER_BORDER,
  styleCell,
} from './excel-styles';

export function formatDmy(val?: Date | string | null): string {
  if (!val) return '';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear());
  return `${day}.${month}.${year}`;
}

/**
 * Derivare dată de naștere din CNP românesc în caz că lipsește din baza de date.
 */
export function getBirthDateFromCNP(cnp: string): Date | undefined {
  if (!cnp || cnp.length !== 13 || !/^\d{13}$/.test(cnp)) return undefined;
  const s = parseInt(cnp[0], 10);
  let century = 1900;
  if (s === 1 || s === 2) century = 1900;
  else if (s === 3 || s === 4) century = 1800;
  else if (s === 5 || s === 6) century = 2000;
  else if (s === 7 || s === 8 || s === 9) century = 1900;

  const year = century + parseInt(cnp.substring(1, 3), 10);
  const month = parseInt(cnp.substring(3, 5), 10);
  const day = parseInt(cnp.substring(5, 7), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day) {
    return dt;
  }
  return undefined;
}

export interface ClientExportResult {
  filename: string;
  buffer: Buffer;
  clientName: string;
  employeesCount: number;
}

export interface ClientDataForWorkbook {
  name?: string | null;
  cui?: string | null;
  regCom?: string | null;
  address?: string | null;
  legalRepresentative?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  worksites?: { name: string; address: string; activity?: string | null }[];
  jobs?: {
    title: string;
    corCode?: string | null;
    mainActivities?: string | null;
    equipmentUsed?: string | null;
    workConditions?: string | null;
    workersCount?: number | null;
  }[];
  employees?: Array<{
    lastName: string;
    firstName: string;
    sex?: string | null;
    cnp?: string | null;
    birthDate?: Date | string | null;
    birthPlace?: string | null;
    birthCounty?: string | null;
    citizenship?: string | null;
    identityDocument?: {
      docType?: string | null;
      series?: string | null;
      number?: string | null;
      issuedBy?: string | null;
      issueDate?: Date | string | null;
      expiryDate?: Date | string | null;
    } | null;
    residenceAddress?: {
      county?: string | null;
      locality?: string | null;
      street?: string | null;
      number?: string | null;
      building?: string | null;
      entrance?: string | null;
      floor?: string | null;
      apartment?: string | null;
    } | null;
    email?: string | null;
    phone?: string | null;
    currentJob?: { title: string } | null;
    currentWorksite?: { name: string } | null;
    startDateOnJob?: Date | string | null;
    hireDate?: Date | string | null;
    createdAt?: Date | string | null;
    status?: string | null;
    leaveDate?: Date | string | null;
    hygieneRequested?: boolean | null;
    hygieneModule?: string | null;
    hygienePreferredSession?: string | null;
    adminNotes?: string | null;
  }>;
}

/**
 * Generează un ExcelJS.Workbook complet stilizat cu culori, borduri, antete tematice și freeze panes.
 * Poate fi folosit atât pentru generarea șablonului gol oficial, cât și pentru exportul oricărui client.
 */
export function buildStyledClientWorkbook(data?: ClientDataForWorkbook | null): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem SSM & Igiena';
  wb.lastModifiedBy = 'Sistem SSM & Igiena';
  wb.created = new Date();
  wb.modified = new Date();

  // ==========================================
  // FOAIA 1: Instrucțiuni
  // ==========================================
  const wsInst = wb.addWorksheet('Instrucțiuni', {
    views: [{ showGridLines: true }],
  });

  wsInst.getColumn(1).width = 26;
  wsInst.getColumn(2).width = 85;

  // Banner titlu
  wsInst.mergeCells('A1:B1');
  const tCell1 = wsInst.getCell('A1');
  tCell1.value = 'Instrucțiuni de completare a registrului SSM & HR';
  styleCell(tCell1, {
    font: { size: 14, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
    fillColor: EXCEL_COLORS.NAVY_PRIMARY,
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsInst.getRow(1).height = 30;

  wsInst.mergeCells('A2:B2');
  const stCell1 = wsInst.getCell('A2');
  stCell1.value = 'Citiți cu atenție recomandările înainte de importul sau exportul datelor.';
  styleCell(stCell1, {
    font: { size: 10, italic: true, color: { argb: EXCEL_COLORS.TEXT_MUTED } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsInst.getRow(2).height = 20;

  // Header tabel instrucțiuni
  wsInst.getRow(4).height = 24;
  const hInstA = wsInst.getCell('A4');
  hInstA.value = 'Subiect';
  styleCell(hInstA, {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
    fillColor: EXCEL_COLORS.NAVY_ACCENT,
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: HEADER_BORDER,
  });

  const hInstB = wsInst.getCell('B4');
  hInstB.value = 'Instrucțiune detaliată';
  styleCell(hInstB, {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
    fillColor: EXCEL_COLORS.NAVY_ACCENT,
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: HEADER_BORDER,
  });

  const instructions = [
    {
      topic: 'O singură firmă per fișier',
      desc: 'Acest registru este dedicat unei singure companii cliente. Datele firmei se completează o singură dată în antetul foii „Firmă și angajați”.',
    },
    {
      topic: 'Un rând per salariat',
      desc: 'Fiecare linie din tabelul de angajați reprezintă un salariat distinct. Numele, prenumele, postul și punctul de lucru sunt esențiale pentru dosarele SSM.',
    },
    {
      topic: 'Câmpuri opționale (GDPR)',
      desc: 'CNP-ul, data nașterii și numărul actului de identitate sunt opționale. Dacă nu sunt completate, sistemul generează documentele SSM cu identificare după nume, post și serie act.',
    },
    {
      topic: 'Format dată calendaristică',
      desc: 'Datele calendaristice se introduc în format ZZ.LL.AAAA (de exemplu: 15.03.1990 sau 01.10.2023).',
    },
    {
      topic: 'Cursuri de Igienă DSP',
      desc: 'Pentru angajații din alimentație publică, producție alimentară, curățenie, servicii de apă sau cosmetică/înfrumusețare, bifați „DA” la Curs igienă și selectați Modulul dorit (1 - 6).',
    },
    {
      topic: 'Foaia Context Posturi',
      desc: 'Descrierea echipamentelor, utilajelor și condițiilor de muncă din a doua foaie este utilizată automat la elaborarea Fișelor de Identificare a Factorilor de Risc și a instruirilor introductive.',
    },
    {
      topic: 'Re-importul fișierului',
      desc: 'Registrul descărcat poate fi modificat și re-importat oricând în sistem. Toate modificările de date sunt actualizate automat.',
    },
  ];

  instructions.forEach((ins, idx) => {
    const rowIdx = 5 + idx;
    const r = wsInst.getRow(rowIdx);
    r.height = 36;
    const isEven = idx % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const cellA = wsInst.getCell(`A${rowIdx}`);
    cellA.value = ins.topic;
    styleCell(cellA, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: rowBg,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: THIN_BORDER,
    });

    const cellB = wsInst.getCell(`B${rowIdx}`);
    cellB.value = ins.desc;
    styleCell(cellB, {
      font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: rowBg,
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: THIN_BORDER,
    });
  });

  // ==========================================
  // FOAIA 2: Firmă și angajați
  // ==========================================
  const wsFirm = wb.addWorksheet('Firmă și angajați', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 12, showGridLines: true }],
  });

  // Banner titlu A1:AH1
  wsFirm.mergeCells('A1:AH1');
  const tCell2 = wsFirm.getCell('A1');
  tCell2.value = 'Datele firmei și ale angajaților';
  styleCell(tCell2, {
    font: { size: 14, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
    fillColor: EXCEL_COLORS.NAVY_PRIMARY,
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsFirm.getRow(1).height = 32;

  // Subtitlu A2:AH2
  wsFirm.mergeCells('A2:AH2');
  const stCell2 = wsFirm.getCell('A2');
  stCell2.value =
    'Completați datele angajatorului o singură dată, apoi un rând per angajat. Câmpurile cu * sunt obligatorii. CNP, data nașterii și număr act sunt opționale.';
  styleCell(stCell2, {
    font: { size: 10, italic: true, color: { argb: EXCEL_COLORS.TEXT_MUTED } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsFirm.getRow(2).height = 20;

  // Secțiuni Angajator și Persoană de contact (Rândul 4)
  wsFirm.getCell('A4').value = 'Date Angajator';
  styleCell(wsFirm.getCell('A4'), {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsFirm.getCell('D4').value = 'Date Contact & Reprezentant';
  styleCell(wsFirm.getCell('D4'), {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsFirm.getRow(4).height = 22;

  // Casete metadate companie (Rândurile 5-8)
  const metaRows = [
    {
      colLabel1: 'A5', label1: 'Denumire firmă*', colVal1: 'B5', val1: data?.name || '',
      colLabel2: 'D5', label2: 'Reprezentant legal', colVal2: 'E5', val2: data?.legalRepresentative || '',
    },
    {
      colLabel1: 'A6', label1: 'CUI*', colVal1: 'B6', val1: data?.cui || '',
      colLabel2: 'D6', label2: 'Persoană de contact*', colVal2: 'E6', val2: data?.contactPerson || '',
    },
    {
      colLabel1: 'A7', label1: 'Nr. Registrul Comerțului', colVal1: 'B7', val1: data?.regCom || '',
      colLabel2: 'D7', label2: 'Email contact', colVal2: 'E7', val2: data?.contactEmail || '',
    },
    {
      colLabel1: 'A8', label1: 'Sediu social*', colVal1: 'B8', val1: data?.address || '',
      colLabel2: 'D8', label2: 'Telefon contact', colVal2: 'E8', val2: data?.contactPhone || '',
    },
  ];

  metaRows.forEach((m, idx) => {
    const rowNum = 5 + idx;
    wsFirm.getRow(rowNum).height = 22;

    const cL1 = wsFirm.getCell(m.colLabel1);
    cL1.value = m.label1;
    styleCell(cL1, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_LABEL_BG,
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: THIN_BORDER,
    });

    const cV1 = wsFirm.getCell(m.colVal1);
    cV1.value = m.val1;
    styleCell(cV1, {
      font: { size: 10, bold: rowNum === 5, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_VALUE_BG,
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: THIN_BORDER,
    });

    const cL2 = wsFirm.getCell(m.colLabel2);
    cL2.value = m.label2;
    styleCell(cL2, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_LABEL_BG,
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: THIN_BORDER,
    });

    const cV2 = wsFirm.getCell(m.colVal2);
    cV2.value = m.val2;
    styleCell(cV2, {
      font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_VALUE_BG,
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: THIN_BORDER,
    });
  });

  // Notă tabel angajați (Rândul 10)
  wsFirm.mergeCells('A10:AH10');
  const nCell10 = wsFirm.getCell('A10');
  nCell10.value =
    'Lista angajaților — introduceți valorile din actele de identitate și situația curentă de muncă. CNP-ul, data nașterii și numărul actului sunt opționale.';
  styleCell(nCell10, {
    font: { size: 10, italic: true, color: { argb: EXCEL_COLORS.TEXT_MUTED } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsFirm.getRow(10).height = 20;

  // Rândul 11: Categorii de coloane colorate tematic
  wsFirm.getRow(11).height = 24;
  const categories = [
    { range: 'A11:H11', label: 'Date personale', color: EXCEL_COLORS.BLUE_DEEP },
    { range: 'I11:N11', label: 'Act de identitate', color: EXCEL_COLORS.BLUE_OCEAN },
    { range: 'O11:V11', label: 'Domiciliu', color: EXCEL_COLORS.TEAL },
    { range: 'W11:X11', label: 'Contact', color: EXCEL_COLORS.INDIGO },
    { range: 'Y11:AD11', label: 'Situație & Post', color: EXCEL_COLORS.SLATE_DARK },
    { range: 'AE11:AH11', label: 'Cursuri Igienă', color: EXCEL_COLORS.EMERALD },
  ];

  categories.forEach((cat) => {
    wsFirm.mergeCells(cat.range);
    const firstCell = wsFirm.getCell(cat.range.split(':')[0]);
    firstCell.value = cat.label;
    styleCell(firstCell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: cat.color,
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: THIN_BORDER,
    });
  });

  // Rândul 12: Antete coloane tabel
  wsFirm.getRow(12).height = 32;
  const colHeaders = [
    'Nume de familie*',
    'Prenume*',
    'Sex (M/F)',
    'CNP (opțional)',
    'Data nașterii (opțional)',
    'Locul nașterii',
    'Județ naștere',
    'Cetățenie',
    'Tip act (CI/Pass/CEI)',
    'Serie act',
    'Număr act (opțional)',
    'Emis de',
    'Data emiterii',
    'Data expirării',
    'Județ domiciliu',
    'Localitate domiciliu',
    'Stradă',
    'Număr',
    'Bloc',
    'Scară',
    'Etaj',
    'Apartament',
    'Email',
    'Telefon',
    'Funcție / Post (COR)*',
    'Punct de lucru*',
    'Data numire post',
    'Data angajării',
    'Stare (ACTIV/INCETAT)',
    'Data încetării',
    'Curs igienă solicitat (DA/NU)',
    'Modul solicitat',
    'Sesiune preferată',
    'Observații SSM / HR',
  ];

  colHeaders.forEach((title, idx) => {
    const colNum = idx + 1;
    const cell = wsFirm.getRow(12).getCell(colNum);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_LABEL_BG,
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: HEADER_BORDER,
    });
  });

  // Lățimi definite pe fiecare coloană
  const colWidths = [
    18, 18, 10, 18, 16, 18, 16, 14, // A-H
    12, 10, 16, 16, 14, 14,         // I-N
    16, 20, 24, 10, 10, 10, 10, 12, // O-V
    24, 16,                         // W-X
    26, 22, 16, 16, 14, 16,         // Y-AD
    18, 20, 18, 26,                 // AE-AH
  ];

  colWidths.forEach((w, idx) => {
    wsFirm.getColumn(idx + 1).width = w;
  });

  // Rândurile de angajați (începând de la rândul 13)
  const employees = data?.employees || [];
  employees.forEach((emp, i) => {
    const rowNum = 13 + i;
    const r = wsFirm.getRow(rowNum);
    r.height = 22;

    const isEven = i % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const birthDate = emp.birthDate || (emp.cnp ? getBirthDateFromCNP(emp.cnp) : undefined);
    const hireDate = emp.hireDate || emp.startDateOnJob || emp.createdAt;
    const startDateOnJob = emp.startDateOnJob || hireDate;
    const jobTitle = emp.currentJob?.title || data?.jobs?.[0]?.title || 'Lucrător';
    const worksiteName = emp.currentWorksite?.name || data?.worksites?.[0]?.name || 'Sediul Central';

    const values = [
      emp.lastName || '',
      emp.firstName || '',
      emp.sex || '',
      emp.cnp || '',
      formatDmy(birthDate),
      emp.birthPlace || '',
      emp.birthCounty || '',
      emp.citizenship || 'Română',
      emp.identityDocument?.docType || 'CI',
      emp.identityDocument?.series || '',
      emp.identityDocument?.number || '',
      emp.identityDocument?.issuedBy || '',
      formatDmy(emp.identityDocument?.issueDate),
      formatDmy(emp.identityDocument?.expiryDate),
      emp.residenceAddress?.county || '',
      emp.residenceAddress?.locality || '',
      emp.residenceAddress?.street || '',
      emp.residenceAddress?.number || '',
      emp.residenceAddress?.building || '',
      emp.residenceAddress?.entrance || '',
      emp.residenceAddress?.floor || '',
      emp.residenceAddress?.apartment || '',
      emp.email || '',
      emp.phone || '',
      jobTitle,
      worksiteName,
      formatDmy(startDateOnJob),
      formatDmy(hireDate),
      emp.status || 'ACTIV',
      formatDmy(emp.leaveDate),
      emp.hygieneRequested ? 'DA' : 'NU',
      emp.hygieneModule || '',
      emp.hygienePreferredSession || '',
      emp.adminNotes || '',
    ];

    // Coloane centrate vs aliniate la stânga
    const centeredCols = new Set([3, 4, 5, 8, 9, 10, 11, 13, 14, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33]);

    values.forEach((v, vIdx) => {
      const colNum = vIdx + 1;
      const cell = r.getCell(colNum);
      cell.value = v;

      styleCell(cell, {
        font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
        fillColor: rowBg,
        alignment: {
          vertical: 'middle',
          horizontal: centeredCols.has(colNum) ? 'center' : 'left',
        },
        border: THIN_BORDER,
      });
    });
  });

  // ==========================================
  // FOAIA 3: Context posturi
  // ==========================================
  const wsCtx = wb.addWorksheet('Context posturi', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4, showGridLines: true }],
  });

  // Banner titlu A1:I1
  wsCtx.mergeCells('A1:I1');
  const tCell3 = wsCtx.getCell('A1');
  tCell3.value = 'Context posturi și condiții de muncă';
  styleCell(tCell3, {
    font: { size: 14, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
    fillColor: EXCEL_COLORS.NAVY_PRIMARY,
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsCtx.getRow(1).height = 30;

  wsCtx.mergeCells('A2:I2');
  const stCell3 = wsCtx.getCell('A2');
  stCell3.value =
    'Descrierea factorilor de risc, utilajelor și condițiilor de muncă per punct de lucru și funcție.';
  styleCell(stCell3, {
    font: { size: 10, italic: true, color: { argb: EXCEL_COLORS.TEXT_MUTED } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  wsCtx.getRow(2).height = 20;

  // Header tabel context (Rândul 4)
  wsCtx.getRow(4).height = 28;
  const ctxHeaders = [
    'Punct de lucru',
    'Adresă punct de lucru',
    'Activitate punct de lucru',
    'Funcție / Post',
    'Cod COR',
    'Activități principale',
    'Echipamente / utilaje utilizate',
    'Condiții de muncă',
    'Număr lucrători',
  ];

  ctxHeaders.forEach((title, idx) => {
    const colNum = idx + 1;
    const cell = wsCtx.getRow(4).getCell(colNum);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.SLATE_DARK,
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: HEADER_BORDER,
    });
  });

  const ctxWidths = [22, 28, 24, 24, 12, 32, 32, 28, 16];
  ctxWidths.forEach((w, idx) => {
    wsCtx.getColumn(idx + 1).width = w;
  });

  // Construire linii context din date
  interface ContextRowData {
    worksiteName: string;
    worksiteAddress: string;
    worksiteActivity: string;
    jobTitle: string;
    corCode: string;
    mainActivities: string;
    equipmentUsed: string;
    workConditions: string;
    workersCount?: number | null;
  }
  const contextMap = new Map<string, ContextRowData>();

  if (data?.employees) {
    for (const emp of data.employees) {
      const worksite = emp.currentWorksite || data.worksites?.[0];
      const job = emp.currentJob || data.jobs?.[0];
      if (worksite && job) {
        const key = `${worksite.name.toLowerCase()}:::${job.title.toLowerCase()}`;
        if (!contextMap.has(key)) {
          contextMap.set(key, {
            worksiteName: worksite.name,
            worksiteAddress: (worksite as any).address || data.address || '',
            worksiteActivity: (worksite as any).activity || '',
            jobTitle: job.title,
            corCode: (job as any).corCode || '',
            mainActivities: (job as any).mainActivities || '',
            equipmentUsed: (job as any).equipmentUsed || '',
            workConditions: (job as any).workConditions || '',
            workersCount: (job as any).workersCount,
          });
        }
      }
    }
  }

  if (data?.jobs) {
    for (const job of data.jobs) {
      const existing = [...contextMap.values()].find((c) => c.jobTitle.toLowerCase() === job.title.toLowerCase());
      if (!existing) {
        const defaultWorksite = data.worksites?.[0] || {
          name: 'Sediul Central',
          address: data.address || '',
          activity: 'Activități generale',
        };
        const key = `${defaultWorksite.name.toLowerCase()}:::${job.title.toLowerCase()}`;
        contextMap.set(key, {
          worksiteName: defaultWorksite.name,
          worksiteAddress: defaultWorksite.address,
          worksiteActivity: defaultWorksite.activity || '',
          jobTitle: job.title,
          corCode: job.corCode || '',
          mainActivities: job.mainActivities || '',
          equipmentUsed: job.equipmentUsed || '',
          workConditions: job.workConditions || '',
          workersCount: job.workersCount,
        });
      }
    }
  }

  let ctxRowIdx = 0;
  for (const row of contextMap.values()) {
    const rowNum = 5 + ctxRowIdx;
    const r = wsCtx.getRow(rowNum);
    r.height = 24;

    const isEven = ctxRowIdx % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const vals = [
      row.worksiteName,
      row.worksiteAddress,
      row.worksiteActivity,
      row.jobTitle,
      row.corCode,
      row.mainActivities,
      row.equipmentUsed,
      row.workConditions,
      typeof row.workersCount === 'number' ? row.workersCount : '',
    ];

    vals.forEach((v, vIdx) => {
      const cell = r.getCell(vIdx + 1);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
        fillColor: rowBg,
        alignment: {
          vertical: 'middle',
          horizontal: vIdx === 4 || vIdx === 8 ? 'center' : 'left',
          wrapText: vIdx >= 5 && vIdx <= 7,
        },
        border: THIN_BORDER,
      });
    });

    ctxRowIdx++;
  }

  return wb;
}

/**
 * Exportă dosarul complet al unei firme (date firmă, toți angajații cu date extinse,
 * acte de identitate, domiciliu, posturi, puncte de lucru, cursuri igienă și context).
 * Registrul generat respectă 100% schema `Model_date_client_SSM.xlsx`, păstrează toate stilurile vizuale
 * și poate fi reimportat oricând.
 */
export async function exportClientToExcel(clientId: string): Promise<ClientExportResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      worksites: { orderBy: { name: 'asc' } },
      jobs: { orderBy: { title: 'asc' } },
      employees: {
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error(`Clientul cu ID-ul ${clientId} nu a fost găsit.`);
  }

  // Generare workbook complet stilizat prin ExcelJS
  const wb = buildStyledClientWorkbook({
    name: client.name,
    cui: client.cui,
    regCom: client.regCom,
    address: client.address,
    legalRepresentative: client.legalRepresentative,
    contactPerson: client.contactPerson,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    worksites: client.worksites.map((w) => ({
      name: w.name,
      address: w.address,
      activity: w.activity,
    })),
    jobs: client.jobs.map((j) => ({
      title: j.title,
      corCode: j.corCode,
      mainActivities: j.mainActivities,
      equipmentUsed: j.equipmentUsed,
      workConditions: j.workConditions,
      workersCount: j.workersCount,
    })),
    employees: client.employees,
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Date_Client_${client.cui}_${safeName}.xlsx`;

  return {
    filename,
    buffer,
    clientName: client.name,
    employeesCount: client.employees.length,
  };
}
