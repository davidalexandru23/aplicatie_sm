/**
 * ============================================================================
 * CAEN REV. 2 CATALOG FOR ROMANIAN OCCUPATIONAL SAFETY AND HEALTH (SSM)
 * ============================================================================
 * 
 * Statutory Classifications & Interval Configurations based on:
 * - Legea nr. 319/2006 a securității și sănătății în muncă
 * - HG nr. 1425/2006 pentru aprobarea Normelor metodologice de aplicare a Legii nr. 319/2006 (art. 15, 22-25, 95)
 * - Legea nr. 307/2006 privind apărarea împotriva incendiilor
 * - OMAI nr. 712/2005 pentru aprobarea Dispozițiilor generale privind instruirea în domeniul situațiilor de urgență
 * - Ordinul comun MS/ME nr. 2209/4469/2022 privind noțiunile fundamentale de igienă
 * - HG nr. 355/2007 privind supravegherea sănătății lucrătorilor
 */

export interface CaenEntry {
  code: string;
  name: string;
  riskClass: 'LOW' | 'MEDIUM' | 'HIGH';
  defaultSsmIntervalMonths: number;
  defaultPsiIntervalMonths: number;
  requiresHygieneCourse: boolean;
  hygieneModule?: string;
  division?: string;
  section?: string;
  description?: string;
  typicalJobTitles?: string[];
}

export const CAEN_CATALOG: CaenEntry[] = [
  // 1. Tehnologia Informației (IT / Software)
  {
    code: '6201',
    name: 'Activități de realizare a software-ului la comandă (software orientat client)',
    riskClass: 'LOW',
    defaultSsmIntervalMonths: 12,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '62 - Activități de servicii în tehnologia informației',
    section: 'J - Informații și comunicații',
    description: 'Dezvoltare software, programare aplicații web/mobile, arhitectură IT și sisteme software personalizate.',
    typicalJobTitles: ['Programator', 'Inginer software', 'Dezvoltator web', 'Arhitect software', 'Tester software (QA)', 'Manager proiect IT'],
  },
  {
    code: '6202',
    name: 'Activități de consultanță în tehnologia informației',
    riskClass: 'LOW',
    defaultSsmIntervalMonths: 12,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '62 - Activități de servicii în tehnologia informației',
    section: 'J - Informații și comunicații',
    description: 'Consultanță privind cerințele hardware și software, integrare de sisteme informatice.',
    typicalJobTitles: ['Consultant IT', 'Analist securitate cibernetică', 'Auditor IT'],
  },
  {
    code: '6203',
    name: 'Activități de management (gestiune și exploatare) a mijloacelor de calcul',
    riskClass: 'LOW',
    defaultSsmIntervalMonths: 12,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '62 - Activități de servicii în tehnologia informației',
    section: 'J - Informații și comunicații',
    description: 'Gestiune rețele, administrare centre de date și infrastructură de calcul.',
    typicalJobTitles: ['Administrator rețea', 'Administrator baze de date', 'Inginer DevOps'],
  },
  {
    code: '6209',
    name: 'Alte activități de servicii privind tehnologia informației',
    riskClass: 'LOW',
    defaultSsmIntervalMonths: 12,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '62 - Activități de servicii în tehnologia informației',
    section: 'J - Informații și comunicații',
    description: 'Recuperare date în caz de dezastru, instalare software pe stații de lucru.',
    typicalJobTitles: ['Tehnician suport IT', 'Specialist helpdesk'],
  },

  // 2. Alimentație Publică & Horeca
  {
    code: '5610',
    name: 'Restaurante',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    division: '56 - Restaurante și alte activități de servicii de alimentație',
    section: 'I - Activități de cazare și alimentație publică',
    description: 'Servicii de servire a mesei în restaurante tradiționale, fast-food, bistrouri și cantine.',
    typicalJobTitles: ['Bucătar', 'Ajutor de bucătar', 'Ospătar', 'Barman', 'Șef de sală', 'Pizzar', 'Spălător vase'],
  },
  {
    code: '5621',
    name: 'Activități de alimentație (catering) pentru evenimente',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    division: '56 - Restaurante și alte activități de servicii de alimentație',
    section: 'I - Activități de cazare și alimentație publică',
    description: 'Prepararea și livrarea de preparate culinare pentru evenimente private și corporative.',
    typicalJobTitles: ['Bucătar catering', 'Manipulant alimente', 'Șofer livrator catering'],
  },
  {
    code: '5630',
    name: 'Baruri și alte activități de servire a băuturilor',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    division: '56 - Restaurante și alte activități de servicii de alimentație',
    section: 'I - Activități de cazare și alimentație publică',
    description: 'Prepararea și servirea băuturilor în cafenele, baruri, cluburi și berării.',
    typicalJobTitles: ['Barman', 'Barista', 'Ospătar bar'],
  },

  // 3. Construcții & Instalații
  {
    code: '4120',
    name: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
    riskClass: 'HIGH',
    defaultSsmIntervalMonths: 3,
    defaultPsiIntervalMonths: 3,
    requiresHygieneCourse: false,
    division: '41 - Construcții de clădiri',
    section: 'F - Construcții',
    description: 'Execuție structuri de rezistență, zidărie, finisaje exterioare și interioare pentru clădiri.',
    typicalJobTitles: ['Zidar', 'Dulgher', 'Fierar-betonist', 'Muncitor necalificat în construcții', 'Șef șantier', 'Macaragiu'],
  },
  {
    code: '4321',
    name: 'Lucrări de instalații electrice',
    riskClass: 'HIGH',
    defaultSsmIntervalMonths: 3,
    defaultPsiIntervalMonths: 3,
    requiresHygieneCourse: false,
    division: '43 - Lucrări speciale de construcții',
    section: 'F - Construcții',
    description: 'Instalarea sistemelor electrice de joasă și medie tensiune, branșamente și tablouri de distribuție.',
    typicalJobTitles: ['Electrician instalații', 'Tehnician energetician', 'Montator rețele'],
  },
  {
    code: '4322',
    name: 'Lucrări de instalații sanitare, de încălzire și de aer condiționat',
    riskClass: 'HIGH',
    defaultSsmIntervalMonths: 3,
    defaultPsiIntervalMonths: 3,
    requiresHygieneCourse: false,
    division: '43 - Lucrări speciale de construcții',
    section: 'F - Construcții',
    description: 'Montaj conducte de alimentare cu apă, canalizare, centrale termice și tubulaturi de climatizare.',
    typicalJobTitles: ['Instalator sanitar și gaze', 'Sudor conducte', 'Frigotehnist'],
  },
  {
    code: '4399',
    name: 'Alte lucrări speciale de construcții n.c.a.',
    riskClass: 'HIGH',
    defaultSsmIntervalMonths: 3,
    defaultPsiIntervalMonths: 3,
    requiresHygieneCourse: false,
    division: '43 - Lucrări speciale de construcții',
    section: 'F - Construcții',
    description: 'Montaj schele, lucrări de impermeabilizare, ancorare și armare specială.',
    typicalJobTitles: ['Schelar', 'Izolator termic', 'Alpinist utilitar'],
  },

  // 4. Comerț cu Amănuntul
  {
    code: '4711',
    name: 'Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse alimentare, băuturi și tutun',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    division: '47 - Comerț cu amănuntul',
    section: 'G - Comerț cu ridicata și cu amănuntul',
    description: 'Supermarketuri, hipermarketuri și magazine alimentare de proximitate.',
    typicalJobTitles: ['Lucrător comercial', 'Casier', 'Manipulant marfă', 'Șef tură / magazin'],
  },
  {
    code: '4721',
    name: 'Comerț cu amănuntul al fructelor și legumelor proaspete, în magazine specializate',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    division: '47 - Comerț cu amănuntul',
    section: 'G - Comerț cu ridicata și cu amănuntul',
    description: 'Comercializarea legumelor și fructelor proaspete în aprozare și standuri specializate.',
    typicalJobTitles: ['Vânzător', 'Sortator legume-fructe'],
  },

  // 5. Transporturi Rutiere & Logistică
  {
    code: '4941',
    name: 'Transporturi rutiere de mărfuri',
    riskClass: 'HIGH',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '49 - Transporturi terestre și transporturi prin conducte',
    section: 'H - Transport și depozitare',
    description: 'Transport național și internațional de marfă cu autovehicule și ansambluri articulate (TIR).',
    typicalJobTitles: ['Conducător auto transport rutier marfă', 'Șofer autocamion de mare tonaj', 'Dispecer transport', 'Mecanic auto'],
  },
  {
    code: '5210',
    name: 'Depozitări',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '52 - Depozitare și activități anexe pentru transporturi',
    section: 'H - Transport și depozitare',
    description: 'Operarea depozitelor logistice generale și frigorifice pentru stocarea mărfurilor.',
    typicalJobTitles: ['Stivuitorist', 'Gestionar depozit', 'Manipulant mărfuri'],
  },

  // 6. Consultanță, Administrație & Servicii Profesionale
  {
    code: '7022',
    name: 'Activități de consultanță pentru afaceri și management',
    riskClass: 'LOW',
    defaultSsmIntervalMonths: 12,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '70 - Activități de consultanță în management',
    section: 'M - Activități profesionale, științifice și tehnice',
    description: 'Consultanță strategică, financiară, organizatorică și de optimizare a proceselor de afaceri.',
    typicalJobTitles: ['Consultant management', 'Analist afaceri', 'Consilier juridic', 'Economist', 'Director executiv'],
  },
  {
    code: '6920',
    name: 'Activități de contabilitate și audit financiar; consultanță în domeniul fiscal',
    riskClass: 'LOW',
    defaultSsmIntervalMonths: 12,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '69 - Activități juridice și de contabilitate',
    section: 'M - Activități profesionale, științifice și tehnice',
    description: 'Servicii de evidență contabilă, întocmire bilanțuri, audit statutar și raportare fiscală.',
    typicalJobTitles: ['Contabil', 'Economist', 'Auditor financiar', 'Expert contabil'],
  },

  // 7. Sănătate & Asistență Medicală
  {
    code: '8621',
    name: 'Activități de asistență medicală generală',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 2 - Servicii de curățenie și dezinfecție în unități sanitare',
    division: '86 - Activități referitoare la sănătatea umană',
    section: 'Q - Sănătate și asistență socială',
    description: 'Consultații medicale generale și tratamente de primă linie în cabinete și policlinici.',
    typicalJobTitles: ['Medic medicină generală', 'Asistent medical generalist', 'Recepționer clinică medicală', 'Îngrijitor spații medicale'],
  },
  {
    code: '8622',
    name: 'Activități de asistență medicală specializată',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 2 - Servicii de curățenie și dezinfecție în unități sanitare',
    division: '86 - Activități referitoare la sănătatea umană',
    section: 'Q - Sănătate și asistență socială',
    description: 'Consultații și intervenții ambulatorii în specialități chirurgicale, cardiologie, imagistică etc.',
    typicalJobTitles: ['Medic specialist', 'Asistent medical chirurgie / laborator', 'Tehnician radiologie'],
  },

  // 8. Servicii Personale & Producție Alimentară
  {
    code: '9602',
    name: 'Coafură și alte activități de înfrumusețare',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 3 - Servicii de îngrijire corporală',
    division: '96 - Alte activități de servicii',
    section: 'S - Alte activități de servicii',
    description: 'Saloane de coafură, frizerie, cosmetică, manichiură și pedichiură.',
    typicalJobTitles: ['Coafor', 'Frizer', 'Cosmetician', 'Manichiurist'],
  },
  {
    code: '1071',
    name: 'Fabricarea pâinii; fabricarea prăjiturilor și a produselor proaspete de patiserie',
    riskClass: 'MEDIUM',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: true,
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    division: '10 - Industria alimentară',
    section: 'C - Industria prelucrătoare',
    description: 'Brutării, secții de patiserie și cofetării artizanale.',
    typicalJobTitles: ['Brutar', 'Patiser', 'Cofetar', 'Modelator aluat'],
  },
  {
    code: '4520',
    name: 'Întreținerea și repararea autovehiculelor',
    riskClass: 'HIGH',
    defaultSsmIntervalMonths: 6,
    defaultPsiIntervalMonths: 6,
    requiresHygieneCourse: false,
    division: '45 - Comerț cu ridicata și cu amănuntul, întreținerea și repararea autovehiculelor',
    section: 'G - Comerț cu ridicata și cu amănuntul',
    description: 'Service auto, reparații mecanice, electrice, vulcanizare și vopsitorie auto.',
    typicalJobTitles: ['Mecanic auto', 'Electrician auto', 'Tinichigiu auto', 'Vopsitor auto'],
  },
];

/**
 * Elimină caracterele speciale și normalizează un cod CAEN (ex: "62.01" -> "6201", 6201 -> "6201")
 * Asigură coercire defensivă pentru numere, string-uri formatate și obiecte.
 */
export function normalizeCaenCode(code: string | number | unknown): string {
  if (code === null || code === undefined) return '';
  const str = String(code).trim();
  if (!str || str === '[object Object]') return '';

  // 1. Potrivire directă pe cuvânt din 4 cifre (ex: "6201", "CAEN 5610", "6201 - Software (Rev. 2, 2024)")
  const match4 = str.match(/\b\d{4}\b/);
  if (match4) return match4[0];

  // 2. Format cu punct (ex: "62.01" -> "6201", "41.20" -> "4120")
  const matchDotted = str.match(/\b(\d{2})\.(\d{2})\b/);
  if (matchDotted) return matchDotted[1] + matchDotted[2];

  // 3. Fallback pe cifre brute (ex: "99999", "0")
  return str.replace(/[^0-9]/g, '').trim();
}

/**
 * Elimină diacriticele românești pentru căutare flexibilă
 */
export function removeDiacritics(str: string | unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (!s || s === '[object Object]') return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Obține intrarea CAEN după codul oficial din 4 cifre
 */
export function getCaenEntry(code: string | number | unknown): CaenEntry | undefined {
  const normalized = normalizeCaenCode(code);
  if (!normalized) return undefined;
  return CAEN_CATALOG.find((entry) => entry.code === normalized);
}

/**
 * Caută activități CAEN după cod, denumire, diviziune sau meserii specifice
 */
export function searchCaen(query: string | number | unknown): CaenEntry[] {
  if (query === null || query === undefined) {
    return CAEN_CATALOG;
  }

  const cleanQuery = String(query).trim();
  if (!cleanQuery || cleanQuery === '[object Object]') {
    return CAEN_CATALOG;
  }

  const normalizedCodeQuery = normalizeCaenCode(cleanQuery);
  const normalizedTextQuery = removeDiacritics(cleanQuery);

  return CAEN_CATALOG.filter((entry) => {
    // 1. Potrivire pe cod (prefix sau egalitate)
    if (normalizedCodeQuery && entry.code.includes(normalizedCodeQuery)) {
      return true;
    }

    // 2. Potrivire pe denumire (fără diacritice)
    const normalizedName = removeDiacritics(entry.name);
    if (normalizedName.includes(normalizedTextQuery)) {
      return true;
    }

    // 3. Potrivire pe descriere
    if (entry.description && removeDiacritics(entry.description).includes(normalizedTextQuery)) {
      return true;
    }

    // 4. Potrivire pe diviziune
    if (entry.division && removeDiacritics(entry.division).includes(normalizedTextQuery)) {
      return true;
    }

    // 5. Potrivire pe meserii tipice
    if (entry.typicalJobTitles && entry.typicalJobTitles.some((title) => removeDiacritics(title).includes(normalizedTextQuery))) {
      return true;
    }

    return false;
  });
}
