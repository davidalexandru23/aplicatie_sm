import ExcelJS from 'exceljs';
import {
  EXCEL_COLORS,
  THIN_BORDER,
  HEADER_BORDER,
  styleCell,
} from '../excel-styles';

function formatDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}.${m}.${y}`;
  }
  const str = String(val).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    return str;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && str.includes('GMT')) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}.${m}.${y}`;
  }
  return str;
}

export interface HygieneParticipantData {
  rowNumber?: number;
  fullName?: string;
  lastName?: string;
  firstName?: string;
  cnp?: string;
  birthDate?: string;
  birthPlace?: string;
  identityDocument?: string;
  docType?: string;
  docSeries?: string;
  docNumber?: string;
  module?: string;
  level?: string;
  sessionDate?: string;
  examDate?: string;
  examGrade?: string;
  examResult?: string;
  certificateSeries?: string;
  certificateNumber?: string;
  certificateDate?: string;
  providerName?: string;
  coursePeriod?: string;
  attendance?: string;
}

export interface HygieneSessionData {
  providerName?: string;
  cui?: string;
  regCom?: string;
  address?: string;
  locality?: string;
  county?: string;
  street?: string;
  streetNumber?: string;
  phone?: string;
  email?: string;
  representativeName?: string;
  representativeRole?: string;
  representativeDoc?: string;
  msAuthorization?: string;
  meAuthorization?: string;
  sessionDate?: string;
  examDate?: string;
  examLocation?: string;
  examRoom?: string;
  examTime?: string;
  commissionPresident?: string;
  commissionMember1?: string;
  commissionMember2?: string;
  commissionSecretary?: string;
  pvSeriesNumber?: string;
  moduleName?: string;
  participants: HygieneParticipantData[];
}

export function buildHygieneCatalogWorkbook(data: Record<string, any>): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem SSM & Igiena';
  wb.lastModifiedBy = 'Sistem SSM & Igiena';
  wb.created = new Date();
  wb.modified = new Date();

  // Parametri sesiune și prestator
  const providerName = String(
    data.PLACEHOLDER_FURNIZOR_SSM ||
    data.PLACEHOLDER_PRESTATOR_SSM ||
    data.providerName ||
    'UNIK BEST PROTECT S.R.L.'
  ).trim();

  const cui = String(data.PLACEHOLDER_CUI_PRESTATOR || data.cui || '30891216').trim();
  const regCom = String(data.PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR || data.regCom || 'J40/1234/2020').trim();
  const address = String(data.PLACEHOLDER_ADRESA_FURNIZOR || data.address || 'București, România').trim();
  const locality = String(data.PLACEHOLDER_LOCALITATE_FURNIZOR || data.locality || 'București').trim();
  const county = String(data.PLACEHOLDER_JUDET_FURNIZOR || data.county || 'Sector 1').trim();
  const street = String(data.PLACEHOLDER_STRADA_FURNIZOR || data.street || 'Str. Principală').trim();
  const streetNumber = String(data.PLACEHOLDER_NUMAR_FURNIZOR || data.number || '1').trim();
  const phone = String(data.PLACEHOLDER_TELEFON_PRESTATOR || data.phone || '0722000000').trim();
  const email = String(data.PLACEHOLDER_EMAIL_PRESTATOR || data.email || 'contact@unikbestprotect.ro').trim();
  const representative = String(data.PLACEHOLDER_REPREZENTANT_PRESTATOR || data.representativeName || 'Administrator').trim();
  const representativeRole = String(data.PLACEHOLDER_CALITATE_REPREZENTANT || data.representativeRole || 'Administrator').trim();
  const representativeDoc = String(data.PLACEHOLDER_ACT_REPREZENTANT || data.representativeDoc || 'Decizia Asociaților nr. 01/2020').trim();

  const msAuth = String(data.PLACEHOLDER_AVIZ_MS || data.msAuthorization || 'REG1/25711/16.09.2025').trim();
  const meAuth = String(data.PLACEHOLDER_AVIZ_ME || data.meAuthorization || '31160/ 14.10.2025').trim();

  const sessionDate = formatDate(data.PLACEHOLDER_DATA_SESIUNE || data.sessionDate) || '21.11.2026';
  const examDate = formatDate(data.PLACEHOLDER_DATA_EXAMEN || data.examDate) || sessionDate;
  const catalogDate = formatDate(data.PLACEHOLDER_DATA_CATALOG) || examDate;
  const examLocation = String(data.PLACEHOLDER_LOCATIE_EXAMEN || data.location || 'BUCURESTI').trim();
  const examTime = String(data.PLACEHOLDER_ORA_EXAMEN || data.examTime || '10:00').trim();
  const examRoom = String(data.PLACEHOLDER_SALA_EXAMEN || data.examRoom || '1').trim();

  const president = String(data.PLACEHOLDER_PRESEDINTE_COMISIE || data.commissionPresident || 'Dr. Alexandru Ionescu - Medic Primar DSP București').trim();
  const member1 = String(data.PLACEHOLDER_MEMBRU_COMISIE_1 || data.commissionMember1 || 'PREDA MIHAELA').trim();
  const member2 = String(data.PLACEHOLDER_MEMBRU_COMISIE_2 || data.commissionMember2 || 'VLASCEANU ALEXANDRA').trim();
  const secretary = String(data.PLACEHOLDER_SECRETAR_COMISIE || data.commissionSecretary || 'Mirela Iacob').trim();

  const pvNumber = String(data.PLACEHOLDER_NUMAR_PV || data.pvSeriesNumber || '19/ 29.09.2026').trim();
  const moduleDefault = String(data.PLACEHOLDER_MODULE_IGIENA || data.hygieneModule || 'Modulul 1 - Nivelul 2').trim();

  const rawParts: any[] = Array.isArray(data.participants) ? data.participants : [];
  const participants: HygieneParticipantData[] = rawParts.map((p, idx) => {
    const fn = p.fullName || `${p.lastName || ''} ${p.firstName || ''}`.trim() || `Cursant ${idx + 1}`;
    const idDoc = p.identityDocument || (p.docNumber ? `${p.docType || 'CI'} ${p.docSeries || ''} ${p.docNumber}`.trim() : (p.docType || 'CI'));
    const certNum = p.certificateNumber ? (p.certificateSeries ? `${p.certificateSeries}-${p.certificateNumber}` : p.certificateNumber) : `2026-${String(idx + 1).padStart(4, '0')}`;
    const pGrade = p.examGrade || '10';
    const pResult = (p.examResult || 'Admis').toUpperCase();
    const pModule = p.module || moduleDefault;
    const bDate = formatDate(p.birthDate);
    const bPlace = p.birthPlace || '';
    const birthInfo = bDate && bPlace ? `${bDate}, ${bPlace}` : (bDate || bPlace || '-');
    const pPeriod = p.coursePeriod || (sessionDate !== examDate ? `${sessionDate} - ${examDate}` : examDate);

    return {
      rowNumber: idx + 1,
      fullName: fn,
      identityDocument: idDoc,
      cnp: p.cnp || '',
      birthDate: bDate,
      birthPlace: bPlace,
      module: pModule,
      examGrade: String(pGrade),
      examResult: pResult,
      certificateNumber: certNum,
      certificateDate: examDate,
      coursePeriod: pPeriod,
    };
  });

  const totalCandidates = participants.length;
  const passedCandidates = participants.filter((p) => p.examResult !== 'RESPINS').length;
  const presentCandidates = totalCandidates;

  // Helper local pentru antet formal de anexă
  const addAnnexHeader = (ws: ExcelJS.Worksheet, annexNumber: number, title: string, maxCol = 7) => {
    const endColLetter = String.fromCharCode(64 + maxCol);
    ws.mergeCells(`A1:${endColLetter}1`);
    const c1 = ws.getCell('A1');
    c1.value = `ANEXA NR. ${annexNumber} - ${title.toUpperCase()}`;
    styleCell(c1, {
      font: { size: 12, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'left' },
    });
    ws.getRow(1).height = 28;

    ws.mergeCells(`A2:${endColLetter}2`);
    const c2 = ws.getCell('A2');
    c2.value = 'Conform Metodologiei aprobate prin Ordinul comun MS/ME nr. 2209/4469/2022';
    styleCell(c2, {
      font: { size: 9, italic: true, color: { argb: EXCEL_COLORS.TEXT_MUTED } },
      alignment: { vertical: 'middle', horizontal: 'left' },
    });
    ws.getRow(2).height = 18;
  };

  // ==========================================
  // FOAIA 1: Anexa nr. 1 (Cerere Solicitare Avizare)
  // ==========================================
  const ws1 = wb.addWorksheet('Anexa nr. 1', { views: [{ showGridLines: true }] });
  ws1.getColumn(1).width = 30;
  ws1.getColumn(2).width = 80;
  addAnnexHeader(ws1, 1, 'Cerere de Solicitare a Avizării ca Furnizor de Instruire', 2);

  ws1.mergeCells('A4:B4');
  const dspTarget = ws1.getCell('A4');
  dspTarget.value = 'Către: INSTITUTUL NAȚIONAL DE SĂNĂTATE PUBLICĂ / DSP BUCUREȘTI';
  styleCell(dspTarget, {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  ws1.getRow(4).height = 24;

  const s1Meta = [
    ['Denumire furnizor:', providerName],
    ['Cod Unic Înregistrare (CUI):', cui],
    ['Nr. Înregistrare Reg. Comerțului:', regCom],
    ['Sediul social:', `${locality}, str. ${street} nr. ${streetNumber}, ${county}`],
    ['Telefon & Email:', `${phone} / ${email}`],
    ['Reprezentant legal:', `${representative} (${representativeRole})`],
    ['Act împuternicire reprezentant:', representativeDoc],
  ];

  s1Meta.forEach(([lbl, val], idx) => {
    const rowNum = 5 + idx;
    ws1.getRow(rowNum).height = 22;

    const cL = ws1.getCell(`A${rowNum}`);
    cL.value = lbl;
    styleCell(cL, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_LABEL_BG,
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: THIN_BORDER,
    });

    const cV = ws1.getCell(`B${rowNum}`);
    cV.value = val;
    styleCell(cV, {
      font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_VALUE_BG,
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: THIN_BORDER,
    });
  });

  ws1.mergeCells('A13:B13');
  const mTitle = ws1.getCell('A13');
  mTitle.value = 'Module și niveluri solicitate pentru avizare:';
  styleCell(mTitle, {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.NAVY_ACCENT } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  ws1.getRow(13).height = 24;

  const modulesList = [
    '[X] Modulul 1 - Nivelul II: Operatorii din industria alimentară, alimentație publică și vânzători alimentari',
    '[X] Modulul 1 - Nivelul I: Manageri și directori din sectorul alimentar și colectivități',
    '[X] Modulul 2: Personal din unități de curățenie (medical, copii, cazare, cabinete înfrumusețare)',
    '[ ] Modulul 3: Personal din producția și distribuția apei potabile și îmbuteliate',
    '[ ] Modulul 4: Personal din unități de îmbăiere, piscine și bazine de înot',
    '[X] Modulul 5 - Nivelul I & II: Servicii de cosmetică, coafură, frizerie, manichiură și pedichiură',
    '[ ] Modulul 6: Personal pentru servicii de dezinfecție, dezinsecție și deratizare',
  ];

  modulesList.forEach((mText, idx) => {
    const rowNum = 14 + idx;
    ws1.mergeCells(`A${rowNum}:B${rowNum}`);
    const cell = ws1.getCell(`A${rowNum}`);
    cell.value = mText;
    styleCell(cell, {
      font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: idx % 2 === 0 ? EXCEL_COLORS.WHITE : EXCEL_COLORS.ZEBRA_BG,
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: THIN_BORDER,
    });
    ws1.getRow(rowNum).height = 20;
  });

  const signRow1 = 14 + modulesList.length + 1;
  ws1.getCell(`A${signRow1}`).value = 'Semnătura solicitantului & Ștampila:';
  styleCell(ws1.getCell(`A${signRow1}`), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } } });
  ws1.getCell(`B${signRow1}`).value = `${providerName} - ${representative}`;
  styleCell(ws1.getCell(`B${signRow1}`), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } } });

  // ==========================================
  // FOAIA 2: Anexa nr. 2 (Aviz de Funcționare)
  // ==========================================
  const ws2 = wb.addWorksheet('Anexa nr. 2', { views: [{ showGridLines: true }] });
  ws2.getColumn(1).width = 45;
  ws2.getColumn(2).width = 10;
  ws2.getColumn(3).width = 10;
  ws2.getColumn(4).width = 45;
  addAnnexHeader(ws2, 2, 'Aviz de Funcționare Furnizor Instruire Igienă', 4);

  ws2.mergeCells('A4:B5');
  const msBox = ws2.getCell('A4');
  msBox.value = `MINISTERUL SĂNĂTĂȚII\nDirecția Generală Sănătate Publică\nNr. ${msAuth}`;
  styleCell(msBox, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
    fillColor: EXCEL_COLORS.CARD_LABEL_BG,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: THIN_BORDER,
  });

  ws2.mergeCells('C4:D5');
  const meBox = ws2.getCell('C4');
  meBox.value = `MINISTERUL EDUCAȚIEI\nDirecția Generală Management Resurse Umane\nNr. ${meAuth}`;
  styleCell(meBox, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
    fillColor: EXCEL_COLORS.CARD_LABEL_BG,
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: THIN_BORDER,
  });

  ws2.mergeCells('A7:D7');
  const avizTitle = ws2.getCell('A7');
  avizTitle.value = 'AVIZ DE FUNCȚIONARE';
  styleCell(avizTitle, {
    font: { size: 14, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });
  ws2.getRow(7).height = 28;

  ws2.mergeCells('A9:D10');
  const avizBody = ws2.getCell('A9');
  avizBody.value = `Furnizorul de instruire ${providerName}, cu sediul în localitatea ${locality}, str. ${street} nr. ${streetNumber}, județul/sectorul ${county}, CUI ${cui}, conform certificatului de înregistrare ${regCom}, este avizat să realizeze programe de instruire privind însușirea noțiunilor fundamentale de igienă în conformitate cu Ordinul comun MS/ME nr. 2209/4469/2022.`;
  styleCell(avizBody, {
    font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    border: THIN_BORDER,
  });

  // ==========================================
  // FOAIA 3: Anexa nr. 3 (Catalog Înscriere Candidați)
  // ==========================================
  const ws3 = wb.addWorksheet('Anexa nr. 3', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5, showGridLines: true }],
  });
  ws3.getColumn(1).width = 9;   // Nr. Crt.
  ws3.getColumn(2).width = 32;  // Nume prenume
  ws3.getColumn(3).width = 22;  // Act identitate
  ws3.getColumn(4).width = 18;  // CNP
  ws3.getColumn(5).width = 24;  // Data si locul nasterii
  ws3.getColumn(6).width = 40;  // Modul
  ws3.getColumn(7).width = 15;  // Nota
  addAnnexHeader(ws3, 3, 'Catalog de Înscriere a Candidaților la Examen', 7);

  // Subtitlu bar cu date sesiune
  ws3.mergeCells('A4:G4');
  const s3Sub = ws3.getCell('A4');
  s3Sub.value = `Furnizor: ${providerName} | Aviz MS: ${msAuth} | Aviz ME: ${meAuth} | Nr. ${pvNumber} din ${catalogDate}`;
  styleCell(s3Sub, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    fillColor: EXCEL_COLORS.ICE_BLUE,
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: THIN_BORDER,
  });
  ws3.getRow(4).height = 22;

  // Header tabel (Rândul 5)
  ws3.getRow(5).height = 28;
  const s3Headers = [
    'Nr. Crt.',
    'Numele și prenumele',
    'Act identitate seria/nr',
    'Codul Numeric Personal',
    'Data și locul nașterii',
    'Modulul / Nivelul absolvit',
    'Nota Test Grilă',
  ];

  s3Headers.forEach((title, idx) => {
    const cell = ws3.getRow(5).getCell(idx + 1);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: HEADER_BORDER,
    });
  });

  participants.forEach((p, i) => {
    const rowNum = 6 + i;
    const r = ws3.getRow(rowNum);
    r.height = 22;
    const isEven = i % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const birthStr = p.birthDate && p.birthPlace ? `${p.birthDate}, ${p.birthPlace}` : (p.birthDate || p.birthPlace || '-');

    const vals = [
      i + 1,
      p.fullName || '',
      p.identityDocument || '',
      p.cnp || '',
      birthStr,
      p.module || moduleDefault,
      p.examGrade || '10',
    ];

    vals.forEach((v, vIdx) => {
      const cell = r.getCell(vIdx + 1);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10, bold: vIdx === 6, color: { argb: EXCEL_COLORS.TEXT_DARK } },
        fillColor: rowBg,
        alignment: {
          vertical: 'middle',
          horizontal: vIdx === 0 || vIdx === 2 || vIdx === 3 || vIdx === 4 || vIdx === 6 ? 'center' : 'left',
        },
        border: THIN_BORDER,
      });
    });
  });

  const s3SignRow = 6 + participants.length + 1;
  ws3.getCell(`B${s3SignRow}`).value = 'Semnătura furnizorului de instruire & Ștampila:';
  styleCell(ws3.getCell(`B${s3SignRow}`), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } } });
  ws3.getCell(`B${s3SignRow + 1}`).value = `${providerName} - Administrator`;
  styleCell(ws3.getCell(`B${s3SignRow + 1}`), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } } });

  // ==========================================
  // FOAIA 4: Anexa nr. 4 (PV Predare/Primire Lucrări Scrise)
  // ==========================================
  const ws4 = wb.addWorksheet('Anexa nr. 4', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5, showGridLines: true }],
  });
  ws4.getColumn(1).width = 9;   // Nr. Crt.
  ws4.getColumn(2).width = 36;  // Nume candidat
  ws4.getColumn(3).width = 25;  // Semnatura
  ws4.getColumn(4).width = 25;  // Observatii
  addAnnexHeader(ws4, 4, 'Proces-Verbal Predare/Primire Lucrări Scrise Examen', 4);

  ws4.mergeCells('A4:D4');
  const s4Sub = ws4.getCell('A4');
  s4Sub.value = `Furnizor: ${providerName} | Data Examen: ${examDate} | Ora: ${examTime} | Sala: ${examRoom}`;
  styleCell(s4Sub, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    fillColor: EXCEL_COLORS.ICE_BLUE,
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: THIN_BORDER,
  });
  ws4.getRow(4).height = 22;

  ws4.getRow(5).height = 28;
  const s4Headers = [
    'Nr. Crt.',
    'Numele și prenumele candidatului',
    'Semnătura candidatului',
    'Observații',
  ];

  s4Headers.forEach((title, idx) => {
    const cell = ws4.getRow(5).getCell(idx + 1);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: HEADER_BORDER,
    });
  });

  participants.forEach((p, i) => {
    const rowNum = 6 + i;
    const r = ws4.getRow(rowNum);
    r.height = 24;
    const isEven = i % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const vals = [i + 1, p.fullName || '', '', ''];
    vals.forEach((v, vIdx) => {
      const cell = r.getCell(vIdx + 1);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
        fillColor: rowBg,
        alignment: { vertical: 'middle', horizontal: vIdx === 0 ? 'center' : 'left' },
        border: THIN_BORDER,
      });
    });
  });

  const s4SignRow = 6 + participants.length + 1;
  ws4.getCell(`B${s4SignRow}`).value = 'Comisia de examen:';
  styleCell(ws4.getCell(`B${s4SignRow}`), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } } });
  ws4.getCell(`B${s4SignRow + 1}`).value = `Membru 1: ${member1}`;
  ws4.getCell(`B${s4SignRow + 2}`).value = `Membru 2: ${member2}`;
  ws4.getCell(`B${s4SignRow + 3}`).value = `Secretar: ${secretary}`;

  // ==========================================
  // FOAIA 5: Anexa nr. 5 (Catalog Examen de Absolvire DSP)
  // ==========================================
  const ws5 = wb.addWorksheet('Anexa nr. 5', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5, showGridLines: true }],
  });
  ws5.getColumn(1).width = 9;   // Nr. Crt.
  ws5.getColumn(2).width = 34;  // Nume
  ws5.getColumn(3).width = 24;  // Act identitate
  ws5.getColumn(4).width = 42;  // Modul
  ws5.getColumn(5).width = 26;  // Rezultat
  addAnnexHeader(ws5, 5, 'Catalog Examen de Absolvire DSP', 5);

  ws5.mergeCells('A4:E4');
  const s5Sub = ws5.getCell('A4');
  s5Sub.value = `DIRECȚIA DE SĂNĂTATE PUBLICĂ ${examLocation} | Furnizor: ${providerName} | Aviz MS: ${msAuth}`;
  styleCell(s5Sub, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    fillColor: EXCEL_COLORS.ICE_BLUE,
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: THIN_BORDER,
  });
  ws5.getRow(4).height = 22;

  ws5.getRow(5).height = 28;
  const s5Headers = [
    'Nr. Crt.',
    'Numele și prenumele',
    'Actul de identitate seria/nr',
    'Modulul / Nivelul absolvit',
    'Rezultatul examinării',
  ];

  s5Headers.forEach((title, idx) => {
    const cell = ws5.getRow(5).getCell(idx + 1);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: HEADER_BORDER,
    });
  });

  participants.forEach((p, i) => {
    const rowNum = 6 + i;
    const r = ws5.getRow(rowNum);
    r.height = 22;
    const isEven = i % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const isAdmis = p.examResult !== 'RESPINS';
    const vals = [
      i + 1,
      p.fullName || '',
      p.identityDocument || '',
      p.module || moduleDefault,
      p.examResult || 'ADMIS',
    ];

    vals.forEach((v, vIdx) => {
      const cell = r.getCell(vIdx + 1);
      cell.value = v;

      if (vIdx === 4) {
        // Badge colorat pentru rezultat
        styleCell(cell, {
          font: { size: 10, bold: true, color: { argb: isAdmis ? EXCEL_COLORS.ADMIS_TEXT : EXCEL_COLORS.RESPINS_TEXT } },
          fillColor: isAdmis ? EXCEL_COLORS.ADMIS_BG : EXCEL_COLORS.RESPINS_BG,
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });
      } else {
        styleCell(cell, {
          font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
          fillColor: rowBg,
          alignment: { vertical: 'middle', horizontal: vIdx === 0 || vIdx === 2 ? 'center' : 'left' },
          border: THIN_BORDER,
        });
      }
    });
  });

  const s5SignRow = 6 + participants.length + 1;
  ws5.getCell(`B${s5SignRow}`).value = 'Comisia de examen DSP:';
  styleCell(ws5.getCell(`B${s5SignRow}`), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } } });
  ws5.getCell(`B${s5SignRow + 1}`).value = `Președinte: ${president}`;
  ws5.getCell(`B${s5SignRow + 2}`).value = `Membru 1: ${member1}`;
  ws5.getCell(`B${s5SignRow + 3}`).value = `Membru 2: ${member2}`;
  ws5.getCell(`B${s5SignRow + 4}`).value = `Secretar: ${secretary}`;

  // ==========================================
  // FOAIA 6: Anexa nr. 6 (Proces-Verbal Sinteză Examen)
  // ==========================================
  const ws6 = wb.addWorksheet('Anexa nr. 6', { views: [{ showGridLines: true }] });
  ws6.getColumn(1).width = 38;
  ws6.getColumn(2).width = 18;
  ws6.getColumn(3).width = 18;
  ws6.getColumn(4).width = 22;
  addAnnexHeader(ws6, 6, 'Proces-Verbal Examen de Absolvire (Sinteză)', 4);

  ws6.mergeCells('A4:D4');
  const s6Pv = ws6.getCell('A4');
  s6Pv.value = `PROCES-VERBAL SERIA UNK NR. ${pvNumber || '19/ 29.09.2026'}`;
  styleCell(s6Pv, {
    font: { size: 11, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  ws6.getRow(4).height = 24;

  ws6.mergeCells('A6:D7');
  const s6Desc = ws6.getCell('A6');
  s6Desc.value = `Încheiat astăzi, ${examDate}, cu ocazia examenului de absolvire a cursului privind însușirea noțiunilor fundamentale de igienă, organizat de ${providerName} la data de ${sessionDate} la ${examLocation}.`;
  styleCell(s6Desc, {
    font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    border: THIN_BORDER,
  });

  // Tabel Statistici (Rândul 9)
  ws6.getRow(9).height = 28;
  const s6Headers = ['FURNIZOR DE INSTRUIRE', 'CANDIDAȚI ÎNSCRIȘI', 'CANDIDAȚI PREZENȚI', 'PROMOVAȚI (ADMIȘI)'];
  s6Headers.forEach((title, idx) => {
    const cell = ws6.getRow(9).getCell(idx + 1);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: HEADER_BORDER,
    });
  });

  const s6RowVals = [providerName, totalCandidates, presentCandidates, passedCandidates];
  const r10 = ws6.getRow(10);
  r10.height = 24;
  s6RowVals.forEach((v, idx) => {
    const cell = r10.getCell(idx + 1);
    cell.value = v;
    styleCell(cell, {
      font: { size: 10, bold: idx > 0, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.WHITE,
      alignment: { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' },
      border: THIN_BORDER,
    });
  });

  // Rând TOTAL
  const r11 = ws6.getRow(11);
  r11.height = 24;
  ['TOTAL:', totalCandidates, presentCandidates, passedCandidates].forEach((v, idx) => {
    const cell = r11.getCell(idx + 1);
    cell.value = v;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.TEXT_DARK } },
      fillColor: EXCEL_COLORS.CARD_LABEL_BG,
      alignment: { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' },
      border: THIN_BORDER,
    });
  });

  ws6.getCell('A13').value = 'Comisia de examinare:';
  styleCell(ws6.getCell('A13'), { font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } } });
  ws6.getCell('A14').value = `Președinte: ${president}`;
  ws6.getCell('A15').value = `Membru 1: ${member1}`;
  ws6.getCell('A16').value = `Membru 2: ${member2}`;
  ws6.getCell('A17').value = `Secretar: ${secretary}`;

  // ==========================================
  // FOAIA 7: Anexa nr. 7 (Model Certificat de Absolvire)
  // ==========================================
  const ws7 = wb.addWorksheet('Anexa nr. 7', { views: [{ showGridLines: true }] });
  ws7.getColumn(1).width = 45;
  ws7.getColumn(2).width = 10;
  ws7.getColumn(3).width = 45;
  addAnnexHeader(ws7, 7, 'Model Certificat de Absolvire Igienă', 3);

  ws7.mergeCells('A4:C4');
  const certHeader = ws7.getCell('A4');
  certHeader.value = 'CERTIFICAT DE ABSOLVIRE (SPECIMEN OFICIAL)';
  styleCell(certHeader, {
    font: { size: 13, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });
  ws7.getRow(4).height = 28;

  const firstP = participants[0] || {};
  ws7.mergeCells('A6:C8');
  const certBody = ws7.getCell('A6');
  certBody.value = `Se adeverește prin prezentul certificat de absolvire că domnul/doamna ${firstP.fullName || '…………'}, cod numeric personal ${firstP.cnp || '…………'}, a urmat cursul de instruire privind însușirea noțiunilor fundamentale de igienă, modulul ${firstP.module || moduleDefault}, organizat de ${providerName}, în baza Avizului Ministerului Sănătății nr. ${msAuth} și Ministerului Educației nr. ${meAuth}, și a promovat examenul de absolvire din data de ${examDate}.`;
  styleCell(certBody, {
    font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
    border: THIN_BORDER,
  });

  // ==========================================
  // FOAIA 8: Anexa nr. 8 (Registru Unic de Evidență)
  // ==========================================
  const ws8 = wb.addWorksheet('Anexa nr. 8', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5, showGridLines: true }],
  });
  ws8.getColumn(1).width = 8;   // Nr. Crt.
  ws8.getColumn(2).width = 13;  // Data
  ws8.getColumn(3).width = 22;  // Nr./Seria
  ws8.getColumn(4).width = 32;  // Nume absolvent
  ws8.getColumn(5).width = 18;  // CNP
  ws8.getColumn(6).width = 35;  // Modul
  ws8.getColumn(7).width = 20;  // Perioada
  ws8.getColumn(8).width = 28;  // Organizator
  ws8.getColumn(9).width = 14;  // Data eliberare
  ws8.getColumn(10).width = 20; // Semnatura primire
  ws8.getColumn(11).width = 15; // Mentiuni
  addAnnexHeader(ws8, 8, 'Registru de Evidență a Certificatelor de Absolvire Igienă', 11);

  ws8.mergeCells('A4:K4');
  const s8Sub = ws8.getCell('A4');
  s8Sub.value = `Direcția de Sănătate Publică | Furnizor autorizat: ${providerName}`;
  styleCell(s8Sub, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    fillColor: EXCEL_COLORS.ICE_BLUE,
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: THIN_BORDER,
  });
  ws8.getRow(4).height = 22;

  ws8.getRow(5).height = 28;
  const s8Headers = [
    'Nr. Crt.',
    'Data',
    'Nr./Seria adeverinței',
    'Numele și prenumele absolventului',
    'Codul numeric personal',
    'Modulul absolvit',
    'Perioada',
    'Organizatorul programului',
    'Data eliberării',
    'Semnătura de primire',
    'Mențiuni',
  ];

  s8Headers.forEach((title, idx) => {
    const cell = ws8.getRow(5).getCell(idx + 1);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: HEADER_BORDER,
    });
  });

  participants.forEach((p, i) => {
    const rowNum = 6 + i;
    const r = ws8.getRow(rowNum);
    r.height = 22;
    const isEven = i % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const vals = [
      i + 1,
      examDate,
      p.certificateNumber || '',
      p.fullName || '',
      p.cnp || p.identityDocument || '',
      p.module || moduleDefault,
      p.coursePeriod || examDate,
      providerName,
      p.certificateDate || examDate,
      '',
      '',
    ];

    vals.forEach((v, vIdx) => {
      const cell = r.getCell(vIdx + 1);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
        fillColor: rowBg,
        alignment: {
          vertical: 'middle',
          horizontal: vIdx === 0 || vIdx === 1 || vIdx === 2 || vIdx === 4 || vIdx === 6 || vIdx === 8 ? 'center' : 'left',
        },
        border: THIN_BORDER,
      });
    });
  });

  return wb;
}

export function buildHygieneParticipantsTableWorkbook(data: Record<string, any>): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistem SSM & Igiena';
  wb.lastModifiedBy = 'Sistem SSM & Igiena';
  wb.created = new Date();
  wb.modified = new Date();

  const examDate = String(data.PLACEHOLDER_DATA_EXAMEN || data.examDate || data.sessionDate || '21.11.2026').trim();
  const moduleDefault = String(data.PLACEHOLDER_MODULE_IGIENA || data.hygieneModule || 'Modulul 1 - Nivelul 2').trim();
  const providerName = String(data.PLACEHOLDER_FURNIZOR_SSM || data.providerName || 'UNIK BEST PROTECT S.R.L.').trim();

  const ws = wb.addWorksheet('Cursanți', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4, showGridLines: true }],
  });

  ws.getColumn(1).width = 8;   // Nr. Crt.
  ws.getColumn(2).width = 32;  // Nume
  ws.getColumn(3).width = 20;  // CNP
  ws.getColumn(4).width = 12;  // An
  ws.getColumn(5).width = 14;  // Luna
  ws.getColumn(6).width = 12;  // Zi
  ws.getColumn(7).width = 22;  // Loc nastere
  ws.getColumn(8).width = 38;  // Modul

  // Banner titlu
  ws.mergeCells('A1:H1');
  const tCell = ws.getCell('A1');
  tCell.value = 'TABEL NOMINAL CURSANȚI - CURS DE IGIENĂ';
  styleCell(tCell, {
    font: { size: 13, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
    fillColor: EXCEL_COLORS.NAVY_ACCENT,
    alignment: { vertical: 'middle', horizontal: 'left' },
  });
  ws.getRow(1).height = 28;

  // Subtitlu bar
  ws.mergeCells('A2:H2');
  const stCell = ws.getCell('A2');
  stCell.value = `Data Examen: ${examDate} | Furnizor Instruire: ${providerName}`;
  styleCell(stCell, {
    font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
    fillColor: EXCEL_COLORS.ICE_BLUE,
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: THIN_BORDER,
  });
  ws.getRow(2).height = 22;

  // Header tabel (Rândul 4)
  ws.getRow(4).height = 28;
  const headers = [
    'Nr. Crt.',
    'Nume Prenume',
    'Cod Numeric Personal',
    'An naștere',
    'Luna Naștere',
    'Zi Naștere',
    'Loc Naștere',
    'Modul',
  ];

  headers.forEach((title, idx) => {
    const cell = ws.getRow(4).getCell(idx + 1);
    cell.value = title;
    styleCell(cell, {
      font: { size: 10, bold: true, color: { argb: EXCEL_COLORS.WHITE } },
      fillColor: EXCEL_COLORS.NAVY_ACCENT,
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: HEADER_BORDER,
    });
  });

  const rawParts: any[] = Array.isArray(data.participants) ? data.participants : [];
  rawParts.forEach((p, idx) => {
    const rowNum = 5 + idx;
    const r = ws.getRow(rowNum);
    r.height = 22;

    const isEven = idx % 2 === 1;
    const rowBg = isEven ? EXCEL_COLORS.ZEBRA_BG : EXCEL_COLORS.WHITE;

    const fn = p.fullName || `${p.lastName || ''} ${p.firstName || ''}`.trim() || `Cursant ${idx + 1}`;
    const cnp = p.cnp || '';

    let an = '';
    let luna = '';
    let zi = '';

    if (cnp && cnp.length === 13) {
      const s = cnp[0];
      const century = s === '1' || s === '2' ? '19' : s === '5' || s === '6' ? '20' : s === '3' || s === '4' ? '18' : '19';
      an = `${century}${cnp.slice(1, 3)}`;
      luna = cnp.slice(3, 5);
      zi = cnp.slice(5, 7);
    } else if (p.birthDate) {
      const dStr = formatDate(p.birthDate);
      const parts = dStr.split('.');
      if (parts.length === 3) {
        zi = parts[0];
        luna = parts[1];
        an = parts[2];
      }
    }

    const vals = [
      idx + 1,
      fn,
      cnp,
      an,
      luna,
      zi,
      p.birthPlace || '',
      p.module || moduleDefault,
    ];

    vals.forEach((v, vIdx) => {
      const cell = r.getCell(vIdx + 1);
      cell.value = v;
      styleCell(cell, {
        font: { size: 10, color: { argb: EXCEL_COLORS.TEXT_DARK } },
        fillColor: rowBg,
        alignment: {
          vertical: 'middle',
          horizontal: vIdx === 0 || vIdx === 2 || vIdx === 3 || vIdx === 4 || vIdx === 5 ? 'center' : 'left',
        },
        border: THIN_BORDER,
      });
    });
  });

  return wb;
}
