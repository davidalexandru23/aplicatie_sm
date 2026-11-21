import * as XLSX from 'xlsx';

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
  building?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  representativeName?: string;
  representativeRole?: string;
  representativeDoc?: string;
  msAuthorization?: string;
  meAuthorization?: string;
  dspNumber?: string;
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

export function buildHygieneCatalogWorkbook(data: Record<string, any>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Normalize session parameters
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

  // Extract raw participants list
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
      examGrade: pGrade,
      examResult: pResult,
      certificateNumber: certNum,
      certificateDate: p.certificateDate || examDate,
      coursePeriod: pPeriod,
      providerName: p.providerName || providerName,
      attendance: p.attendance || 'prezent',
    };
  });

  const totalCandidates = participants.length;
  const presentCandidates = participants.filter(p => p.attendance !== 'absent').length || totalCandidates;
  const passedCandidates = participants.filter(p => p.examResult !== 'RESPINS').length || totalCandidates;

  // ==========================================
  // SHEET 1: Anexa nr. 1 (Cerere Avizare INSP)
  // ==========================================
  const s1Rows: (string | null)[][] = [
    ['ANEXA NR. 1'],
    ['la metodologie'],
    [providerName],
    ['(Denumirea furnizorului de instruire)'],
    [`Nr. ${regCom} / ${sessionDate}`],
    ['Către'],
    ['INSTITUTUL NAȚIONAL DE SĂNĂTATE PUBLICĂ'],
    [],
    [
      `${providerName}, cu sediul în localitatea ${locality}, județul/sectorul ${county}, str. ${street} nr. ${streetNumber}, telefon ${phone}, e-mail ${email}, cod unic de înregistrare/cod fiscal ${cui}, reprezentat prin ${representative}, în calitate de ${representativeRole}, posesor al actului de reprezentare ${representativeDoc}, prin prezenta solicit avizarea ca furnizor de instruire în domeniul noțiunilor fundamentale de igienă, pentru următoarele module și niveluri:`
    ],
    [],
    ['[X] Modulul nr. 1 - Nivelul I - Instruirea managerilor, directorilor pentru asigurarea calității din unitățile cu profil alimentar'],
    ['[X] Modulul nr. 1 - Nivelul II - Instruirea operatorilor din industria alimentară și din unitățile de alimentație publică'],
    ['[X] Modulul nr. 1 - Nivelul III - Instruirea personalului de îngrijire din sectorul alimentar și alimentație colectivă'],
    ['[X] Modulul nr. 2 - Instruirea personalului din unități care prestează servicii de curățenie (medicale, copii, cazare, înfrumusețare)'],
    ['[X] Modulul nr. 3 - Instruirea personalului din domeniul apei destinate consumului uman și apă îmbuteliată'],
    ['[X] Modulul nr. 4 - Instruirea personalului pentru spații de îmbăiere, piscine și bazine de înot'],
    ['[X] Modulul nr. 5 - Nivelul I - Servicii de tratament și machiaj cosmetic, epilare, frizerie, coafură și bărbierit'],
    ['[X] Modulul nr. 5 - Nivelul II - Servicii de manichiură și pedichiură'],
    ['[X] Modulul nr. 5 - Nivelul III - Servicii de piercing, tatuaj și micropigmentare'],
    ['[X] Modulul nr. 6 - Nivelul I - Servicii de dezinfecție'],
    ['[X] Modulul nr. 6 - Nivelul II - Servicii de dezinsecție și deratizare'],
    [],
    ['Precizez că am luat cunoștință de prevederile Ordinului comun al ministrului sănătății și ministrului educației nr. 2209/4469/2022.'],
    ['Anexez documentația prevăzută în metodologia de autorizare, conform opisului.'],
    [],
    ['Semnătura solicitantului,'],
    [representative],
    ['L.S.'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(s1Rows);
  ws1['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Anexa nr. 1');

  // ==========================================
  // SHEET 2: Anexa nr. 2 (Aviz de Funcționare)
  // ==========================================
  const s2Rows: (string | null)[][] = [
    ['Anexa nr. 2'],
    ['la metodologie'],
    [],
    [
      'MINISTERUL SĂNĂTĂȚII\nDirecția Generală Sănătate Publică și Programe de Sănătate\nNr. ' + msAuth,
      null,
      null,
      'MINISTERUL EDUCAȚIEI\nDirecția Generală Management Resurse Umane și Rețea Școlară\nNr. ' + meAuth
    ],
    [],
    ['AVIZ DE FUNCȚIONARE'],
    [
      `Furnizorul de instruire ${providerName}, cu sediul în localitatea ${locality}, str. ${street} nr. ${streetNumber}, județul/sectorul ${county}, conform certificatului de înregistrare ${regCom}, este avizat să realizeze programe de instruire privind însușirea noțiunilor fundamentale de igienă în conformitate cu Ordinul comun MS/ME nr. 2209/4469/2022.`
    ],
    [],
    ['Direcția Generală Sănătate Publică și Programe de Sănătate', null, null, 'Direcția Generală Management Resurse Umane și Rețea Școlară'],
    ['Director general, ....................', null, null, 'Director general, ....................'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(s2Rows);
  ws2['!cols'] = [{ wch: 45 }, { wch: 10 }, { wch: 10 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Anexa nr. 2');

  // ==========================================
  // SHEET 3: Anexa nr. 3 (Catalog Înscriere Candidați)
  // ==========================================
  const s3Rows: (string | number | null)[][] = [
    ['Anexa nr. 3'],
    ['la metodologie'],
    [`Furnizorul de instruire ${providerName}`],
    [`Aviz de funcționare eliberat de Ministerul Sănătății nr. ${msAuth}`],
    [`Aviz de funcționare eliberat de Ministerul Educației nr. ${meAuth}`],
    [`Nr. ${pvNumber || '1'} din ${catalogDate}`],
    ['CATALOG'],
    ['de înscriere a candidaților pentru susținerea'],
    ['examinării privind însușirea noțiunilor fundamentale de igienă'],
    [],
    [
      'Nr. Crt.',
      'Numele și prenumele',
      'Actul de identitate seria/ nr',
      'Codul Numeric Personal',
      'Data și locul nașterii',
      'Modulul/ Nivelul absolvit',
      'Nota Test Grilă'
    ]
  ];

  participants.forEach((p, i) => {
    const birthStr = p.birthDate && p.birthPlace ? `${p.birthDate}, ${p.birthPlace}` : (p.birthDate || p.birthPlace || '-');
    s3Rows.push([
      i + 1,
      p.fullName || '',
      p.identityDocument || '',
      p.cnp || '',
      birthStr,
      p.module || moduleDefault,
      p.examGrade || '10'
    ]);
  });

  // Dynamic signature footer right after table
  s3Rows.push([]);
  s3Rows.push(['Semnătura furnizorului de instruire']);
  s3Rows.push([providerName]);
  s3Rows.push(['L.S.']);

  const ws3 = XLSX.utils.aoa_to_sheet(s3Rows);
  ws3['!cols'] = [
    { wch: 9 },   // Nr. Crt.
    { wch: 32 },  // Nume prenume
    { wch: 22 },  // Act identitate
    { wch: 16 },  // CNP
    { wch: 24 },  // Data si locul nasterii
    { wch: 40 },  // Modul
    { wch: 15 },  // Nota
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'Anexa nr. 3');

  // ==========================================
  // SHEET 4: Anexa nr. 4 (PV Predare/Primire Lucrări)
  // ==========================================
  const s4Rows: (string | number | null)[][] = [
    ['Anexa nr. 4'],
    ['la metodologie'],
    [providerName],
    ['(Comisia de examen)'],
    ['PROCES- VERBAL'],
    ['de predare/primire a lucrărilor scrise la examenul de absolvire'],
    [`Data: ${examDate}`],
    [`Ora: ${examTime}`],
    [`Sala: ${examRoom}`],
    [],
    [
      'Nr. Crt.',
      'Numele și prenumele candidatului',
      'Semnătura candidatului',
      'Observații'
    ]
  ];

  participants.forEach((p, i) => {
    s4Rows.push([
      i + 1,
      p.fullName || '',
      '',
      ''
    ]);
  });

  // Footer with examination commission members
  s4Rows.push([]);
  s4Rows.push(['Comisia de examen:']);
  s4Rows.push([`Membru: ${member1}`]);
  s4Rows.push([`Membru: ${member2}`]);
  s4Rows.push(['………………………………………………..............']);

  const ws4 = XLSX.utils.aoa_to_sheet(s4Rows);
  ws4['!cols'] = [
    { wch: 9 },   // Nr. Crt.
    { wch: 36 },  // Nume candidat
    { wch: 25 },  // Semnatura
    { wch: 25 },  // Observatii
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'Anexa nr. 4');

  // ==========================================
  // SHEET 5: Anexa nr. 5 (Catalog de Examen DSP)
  // ==========================================
  const s5Rows: (string | number | null)[][] = [
    ['Anexa nr. 5'],
    ['la metodologie'],
    ['DIRECȚIA DE SĂNĂTATE PUBLICĂ'],
    [examLocation || 'BUCUREȘTI'],
    [`(COMISIA DE EXAMEN)…………………… Decizia …………………..`],
    [`Furnizorul de instruire ${providerName}`],
    [`Aviz de funcționare eliberat de Ministerul Sănătății nr. ${msAuth}`],
    [`Aviz de funcționare eliberat de Ministerul Educației nr. ${meAuth}`],
    [],
    ['CATALOG DE EXAMEN'],
    [],
    [
      'Nr. Crt.',
      'Numele și prenumele',
      'Actul de identitate seria/nr',
      'Modulul/ Nivelul absolvit',
      'Rezultatul examinării admis/ respins'
    ]
  ];

  participants.forEach((p, i) => {
    s5Rows.push([
      i + 1,
      p.fullName || '',
      p.identityDocument || '',
      p.module || moduleDefault,
      p.examResult || 'ADMIS'
    ]);
  });

  // Commission signatures
  s5Rows.push([]);
  s5Rows.push(['Președintele comisiei de examen,', null, `Membru: ${member1}`]);
  s5Rows.push([president || '......................................................', null, `Membru: ${member2}`]);
  s5Rows.push(['L.S.', null, `Secretar: ${secretary}`]);

  const ws5 = XLSX.utils.aoa_to_sheet(s5Rows);
  ws5['!cols'] = [
    { wch: 9 },   // Nr. Crt.
    { wch: 34 },  // Nume
    { wch: 24 },  // Act identitate
    { wch: 42 },  // Modul
    { wch: 26 },  // Rezultat admis/respins
  ];
  XLSX.utils.book_append_sheet(wb, ws5, 'Anexa nr. 5');

  // ==========================================
  // SHEET 6: Anexa nr. 6 (Proces-Verbal Examen Sinteză)
  // ==========================================
  const s6Rows: (string | number | null)[][] = [
    ['Anexa nr. 6'],
    ['la metodologie'],
    [`PROCES-VERBAL SERIA UNK NR. ${pvNumber || '19/ 29.09.2026'}`],
    [],
    [
      `Încheiat astăzi, ${examDate}, cu ocazia desfășurării examenului de absolvire a cursului de instruire privind însușirea noțiunilor fundamentale de igienă, organizat de ${providerName} la data de ${sessionDate} la sediul ${examLocation}, pentru care s-a constituit următoarea comisie de examen:`
    ],
    [`Presedinte: ${president}`],
    [`Membru: ${member1}`],
    [`Membru: ${member2}`],
    [`Secretar: ${secretary}`],
    [],
    [
      `La examenul de absolvire au fost înregistrați ${totalCandidates} participanți, dintre care ${passedCandidates} au fost declarați admiși la examenul de absolvire, conform prevederilor art. 13 alin. (3) din Metodologia pentru organizarea și certificarea instruirii profesionale a personalului privind însușirea noțiunilor fundamentale de igienă.`
    ],
    ['Situația la examenul de absolvire este reflectată de catalogul/cataloagele de examen anexat/anexate și se prezintă sintetic astfel:'],
    [],
    ['FURNIZOR DE INSTRUIRE', null, 'CANDIDAȚI'],
    [null, 'ÎNSCRIȘI', 'PREZENȚI', 'PROMOVAȚI'],
    [providerName, totalCandidates, presentCandidates, passedCandidates],
    ['TOTAL:', totalCandidates, presentCandidates, passedCandidates],
    [],
    ['Observații:'],
    ['………………………………………………………………………………………………….'],
    [],
    [`Președintele comisiei de examen: ${president}`],
    [`Membru: ${member1}`],
    [`Membru: ${member2}`],
    [`Secretar: ${secretary}`]
  ];

  const ws6 = XLSX.utils.aoa_to_sheet(s6Rows);
  ws6['!cols'] = [
    { wch: 38 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws6, 'Anexa nr. 6');

  // ==========================================
  // SHEET 7: Anexa nr. 7 (Certificat de Absolvire Model)
  // ==========================================
  const firstP = participants[0] || {};
  const s7Rows: (string | null)[][] = [
    ['Anexa nr. 7'],
    ['la metodologie'],
    ['MINISTERUL SĂNĂTĂȚII\nDirecția Generală Sănătate Publică și Programe de Sănătate', null, 'MINISTERUL EDUCAȚIEI\nDirecția Generală Management Resurse Umane și Rețea Școlară'],
    [],
    ['CERTIFICAT DE ABSOLVIRE'],
    ['eliberat în conformitate cu prevederile Ordinului'],
    ['ministrului sănătății și al ministrului educației nr. 2209/4469/2022'],
    [],
    [
      `Se adeverește prin prezentul certificat de absolvire că domnul/doamna ${firstP.fullName || '…………'}, cod numeric personal ${firstP.cnp || '…………'}, a urmat cursul de instruire privind însușirea noțiunilor fundamentale de igienă, modulul ${firstP.module || moduleDefault}, organizat de ${providerName}, în baza Avizului Ministerului Sănătății nr. ${msAuth} și Ministerului Educației nr. ${meAuth}, și a promovat examenul de absolvire, fiind declarat/declarată admis.`
    ],
    [],
    ['Președintele comisiei de examen,', null, 'Secretar,'],
    ['………………………………………………………………..', null, '………………………………………………………………..'],
    ['L.S.'],
    [`Nr. ${firstP.certificateNumber || '………………'} / ${examDate}`],
    [`Data eliberării: ${examDate}`]
  ];

  const ws7 = XLSX.utils.aoa_to_sheet(s7Rows);
  ws7['!cols'] = [{ wch: 45 }, { wch: 10 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws7, 'Anexa nr. 7');

  // ==========================================
  // SHEET 8: Anexa nr. 8 (Registru de Evidență Certificate)
  // ==========================================
  const s8Rows: (string | number | null)[][] = [
    ['Anexa nr. 8'],
    ['la metodologie'],
    ['Direcția de Sănătate Publică a Municipiului București'],
    [],
    ['REGISTRU DE EVIDENȚĂ'],
    ['a certificatelor de absolvire a cursurilor de'],
    ['instruire privind însușirea noțiunilor fundamentale de igienă'],
    [],
    [
      'Nr. Crt.',
      'Data',
      'Nr./ Seria adeverinței',
      'Numele și prenumele absolventului',
      'Codul numeric personal',
      'Modulul absolvit',
      'Perioada',
      'Organizatorul programului absolvit',
      'Data eliberării',
      'Semnătura de primire',
      'Mențiuni'
    ]
  ];

  participants.forEach((p, i) => {
    s8Rows.push([
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
      ''
    ]);
  });

  const ws8 = XLSX.utils.aoa_to_sheet(s8Rows);
  ws8['!cols'] = [
    { wch: 8 },   // Nr. Crt.
    { wch: 13 },  // Data
    { wch: 22 },  // Nr./Seria
    { wch: 32 },  // Nume absolvent
    { wch: 18 },  // CNP
    { wch: 35 },  // Modul
    { wch: 22 },  // Perioada
    { wch: 30 },  // Organizator
    { wch: 14 },  // Data eliberare
    { wch: 20 },  // Semnatura primire
    { wch: 15 },  // Mentiuni
  ];
  XLSX.utils.book_append_sheet(wb, ws8, 'Anexa nr. 8');

  return wb;
}

export function buildHygieneParticipantsTableWorkbook(data: Record<string, any>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const examDate = String(data.PLACEHOLDER_DATA_EXAMEN || data.examDate || data.sessionDate || '21.11.2026').trim();
  const moduleDefault = String(data.PLACEHOLDER_MODULE_IGIENA || data.hygieneModule || 'Modulul 1 - Nivelul 2').trim();

  const rawParts: any[] = Array.isArray(data.participants) ? data.participants : [];
  const rows: (string | number | null)[][] = [
    [`Examen - ${examDate}`],
    [
      'Nr. Crt.',
      'Nume Prenume',
      'Cod Numeric Personal',
      'An naștere',
      'Luna Naștere',
      'Zi Naștere',
      'Loc Naștere',
      'Modul'
    ]
  ];

  rawParts.forEach((p, idx) => {
    const fn = p.fullName || `${p.lastName || ''} ${p.firstName || ''}`.trim() || `Cursant ${idx + 1}`;
    const cnp = p.cnp || '';
    
    // Parse birth date parts from cnp or birthDate
    let an = '';
    let luna = '';
    let zi = '';

    if (cnp && cnp.length === 13) {
      const s = cnp[0];
      const century = (s === '1' || s === '2') ? '19' : (s === '5' || s === '6') ? '20' : (s === '3' || s === '4') ? '18' : '19';
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

    rows.push([
      idx + 1,
      fn,
      cnp,
      an,
      luna,
      zi,
      p.birthPlace || '',
      p.module || moduleDefault
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },   // Nr. Crt.
    { wch: 32 },  // Nume
    { wch: 18 },  // CNP
    { wch: 12 },  // An
    { wch: 14 },  // Luna
    { wch: 12 },  // Zi
    { wch: 22 },  // Loc nastere
    { wch: 38 },  // Modul
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Cursanti');

  return wb;
}

