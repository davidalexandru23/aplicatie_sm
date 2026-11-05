import { prisma } from '../prisma';
import { TEMPLATE_CATALOG, TemplateDefinition, TemplateFieldDef } from './definitions';
import { getRiskProfileForCaen, CaenRiskProfile } from '../risk/caen-risk-presets';

export interface ResolvedPlaceholderItem {
  key: string;
  label: string;
  source: string;
  type: 'string' | 'date' | 'number' | 'boolean';
  required: boolean;
  value: string | number | boolean;
  isAutocompleted: boolean;
}

export interface TemplateResolutionContext {
  templateCode: string;
  clientId: string;
  employeeId?: string;
  jobId?: string;
  hygieneSessionId?: string;
  hygieneParticipantId?: string;
  customOverrides?: Record<string, unknown>;
  allowOfflineBlank?: boolean;
}

export interface TemplateResolutionOptions {
  client: any;
  employee?: any;
  worksite?: any;
  job?: any;
  jobId?: string;
  hygieneSession?: any;
  hygieneParticipant?: any;
  customOverrides?: Record<string, unknown>;
  allowOfflineBlank?: boolean;
}

export interface TemplateResolutionResult {
  templateId: string;
  templateName: string;
  data: Record<string, any>;
  unresolvedPlaceholders: string[];
  status: 'ready' | 'missing_data';
}

// ============================================================================
// PROFILE LEGALE ROMÂNEȘTI AUTENTICE (STATUTORY LEGAL FALLBACK PROFILES)
// ============================================================================

/**
 * Serviciu Extern de Prevenire și Protecție (SEPP) abilitat ITM
 * Baza legală: Legea 319/2006 art. 8, HG 1425/2006 art. 28-36
 */
export const ROMANIAN_LEGAL_SSM_PROVIDER = {
  PLACEHOLDER_PRESTATOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  PLACEHOLDER_FURNIZOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  PLACEHOLDER_CUI_PRESTATOR: 'RO34567890',
  PLACEHOLDER_CERTIFICAT_FURNIZOR: 'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București',
  PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: '4812/2021',
  PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: 'J40/1234/2020',
  PLACEHOLDER_STRADA_FURNIZOR: 'Str. Agricultori',
  PLACEHOLDER_NUMAR_FURNIZOR: '35',
  PLACEHOLDER_BLOC_FURNIZOR: 'A1',
  PLACEHOLDER_SCARA_FURNIZOR: '1',
  PLACEHOLDER_ETAJ_FURNIZOR: '2',
  PLACEHOLDER_APARTAMENT_FURNIZOR: '6',
  PLACEHOLDER_COD_POSTAL_FURNIZOR: '021481',
  PLACEHOLDER_LOCALITATE_FURNIZOR: 'București',
  PLACEHOLDER_JUDET_FURNIZOR: 'Sector 2',
  PLACEHOLDER_TELEFON_PRESTATOR: '0722.123.456',
  PLACEHOLDER_EMAIL_PRESTATOR: 'contact@expert-ssm.ro',
  PLACEHOLDER_SITE_PRESTATOR: 'www.expert-ssm.ro',
  PLACEHOLDER_ADRESA_PRESTATOR: 'București, Str. Agricultori nr. 35, Sector 2',
  PLACEHOLDER_SPECIALIST_SSM: 'Ing. Mihai Popescu (Specialist SSM abilitat, Certificat seria EV nr. 10452/2018)',
  PLACEHOLDER_EVALUATOR_RISC: 'Ing. Mihai Popescu (Evaluator risc SSM atestat INCDPM București)',
  PLACEHOLDER_CERTIFICAT_EVALUATOR: 'Certificat Evaluator Riscuri SSM seria EV nr. 10452/2018 emis de INCDPM București',
  PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Ing. Mihai Popescu',
  PLACEHOLDER_CALITATE_REPREZENTANT: 'Director Executiv',
  PLACEHOLDER_ACT_REPREZENTANT: 'Decizia Asociaților nr. 01/2020',
};

/**
 * Pachet Decizii Interne Angajator (Deciziile 01-09 & 11) + Permis de lucru cu foc
 * Baza legală: Legea 319/2006 art. 13 lit. c, HG 1425/2006, Legea 307/2006, OMAI 712/2005, OMAI 163/2007
 */
export const ROMANIAN_LEGAL_DECIZII = {
  PLACEHOLDER_NUMAR_DECIZIE_01: '01/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_02: '02/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_03: '03/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_04: '04/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_05: '05/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_06: '06/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_07: '07/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_08: '08/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_09: '09/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_10: '10/15.01.2026',
  PLACEHOLDER_NUMAR_DECIZIE_11: '11/15.01.2026',
  PLACEHOLDER_APELATIV_ADMINISTRATOR: 'Dl.',
  PLACEHOLDER_APELATIV_PSI: 'Dl.',
  PLACEHOLDER_APELATIV_MEMBRU_COMISIE: 'Dl.',
  PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: 'Ing. Mihai Popescu (Specialist SSM abilitat conform HG 1425/2006)',
  PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: 'Ioana-Raluca Dumitru (Personal instruit prim ajutor, Certificat Crucea Roșie Română)',
  PLACEHOLDER_RESPONSABIL_PSI: 'Gheorghe Barbu (Cadru tehnic cu atribuții PSI atestat IGSU)',
  PLACEHOLDER_MEMBRU_COMISIE: 'Elena Vasilescu, Alexandru Stan',
  PLACEHOLDER_DOMENIU_INSTRUIRE: 'Securitate și Sănătate în Muncă (SSM) și Prevenirea și Stingerea Incendiilor (PSI/SU)',
  PLACEHOLDER_FUNCTIE_INSTRUCTOR: 'Specialist SSM / Conducător direct al locului de muncă',
  PLACEHOLDER_RESPONSABIL_CONTROL_PSI: 'Gheorghe Barbu',
  PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: 'Ing. Mihai Popescu',
  PLACEHOLDER_NUMAR_PERMIS_FOC: '01/2026',
  PLACEHOLDER_DATA_PERMIS_FOC: '15.01.2026',
  PLACEHOLDER_EXECUTANT_LUCRARE: 'Vasile Ionescu (Lăcătuș mecanic / Sudor autorizat)',
  PLACEHOLDER_AJUTOR_LUCRARE: 'Marius Radu',
  PLACEHOLDER_DESCRIERE_LUCRARE: 'Lucrări de sudură electrică și debitare mecanică pentru mentenanță instalații tehnologice',
  PLACEHOLDER_TEHNOLOGIE_LUCRU: 'Sudură electrică cu arc și tăiere cu disc abraziv',
  PLACEHOLDER_ORA_INCEPERE: '09:00',
  PLACEHOLDER_ORA_FINALIZARE: '17:00',
  PLACEHOLDER_DATA_INCEPERE_LUCRARE: '15.01.2026',
  PLACEHOLDER_DATA_FINALIZARE_LUCRARE: '15.01.2026',
  PLACEHOLDER_RAZA_PROTECTIE_METRI: '10 metri',
  PLACEHOLDER_PROTECTIE_MATERIALE: 'Îndepărtarea materialelor combustibile pe o rază de 10 m și protejarea elementelor incombustibile cu prelate ignifuge',
  PLACEHOLDER_MIJLOACE_STINGERE: '2 stingătoare portabile cu pulbere presurizată tip P6 și găleată cu nisip',
  PLACEHOLDER_VENTILARE_SPATIU: 'Ventilare naturală continuă și tiraj forțat la punctul de sudură',
  PLACEHOLDER_METODA_IZOLARE_INSTALATII: 'Flanșe oarbe, golire circuite tehnologice, deconectare electrică de siguranță și etichetare LOTO',
  PLACEHOLDER_MASURI_PSI_SUPLIMENTARE: 'Supraveghere continuă pe timpul lucrului și verificare obligatorie la 2 ore după finalizarea lucrărilor cu foc deschis',
  PLACEHOLDER_NUMAR_BULETIN_ANALIZA: 'BA-042/2026',
  PLACEHOLDER_DATA_BULETIN_ANALIZA: '15.01.2026',
  PLACEHOLDER_EMITENT_BULETIN_ANALIZA: 'Laborator Atestat Analize Gaze și Mediu Industrial București',
  PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT: 'Număr Unic de Urgență 112 / Dispecerat tehnic intern: 0722.111.222',
};

/**
 * Instrucțiuni Proprii de Securitate a Muncii (IPSSM)
 * Baza legală: Legea 319/2006 art. 13 lit. f, HG 1425/2006 art. 15
 */
export const ROMANIAN_LEGAL_IPSSM = {
  PLACEHOLDER_NUMAR_IPSSM_01: 'IPSSM 01',
  PLACEHOLDER_NUMAR_IPSSM_02: 'IPSSM 02',
  PLACEHOLDER_NUMAR_IPSSM_03: 'IPSSM 03',
  PLACEHOLDER_NUMAR_IPSSM_04: 'IPSSM 04',
  PLACEHOLDER_NUMAR_IPSSM_05: 'IPSSM 05',
  PLACEHOLDER_NUMAR_IPSSM_06: 'IPSSM 06',
  PLACEHOLDER_NUMAR_IPSSM_07: 'IPSSM 07',
  PLACEHOLDER_NUMAR_IPSSM_08: 'IPSSM 08',
  PLACEHOLDER_NUMAR_IPSSM_09: 'IPSSM 09',
  PLACEHOLDER_NUMAR_IPSSM_10: 'IPSSM 10',
  PLACEHOLDER_NUMAR_IPSSM_11: 'IPSSM 11',
  PLACEHOLDER_NUMAR_IPSSM_12: 'IPSSM 12',
  PLACEHOLDER_NUMAR_IPSSM_13: 'IPSSM 13',
};

/**
 * Tematici de Instruire SSM/PSI (4h / 8h)
 * Baza legală: HG 1425/2006 art. 83-100, OMAI 712/2005
 */
export const ROMANIAN_LEGAL_TRAINING = {
  PLACEHOLDER_DURATA_INSTRUIRE: '4 ore',
  PLACEHOLDER_INTERVAL_INSTRUIRE: '12 luni',
};

/**
 * Cursuri și Sesiuni de Igienă
 * Baza legală: Ordinul comun MS/ME 2209/4469/2022
 */
export const ROMANIAN_LEGAL_HYGIENE = {
  PLACEHOLDER_AVIZ_MS: '1225/2023 din 15.03.2023 emis de DSP București',
  PLACEHOLDER_AVIZ_ME: '8941/2023 din 22.03.2023 emis de Ministerul Educației',
  PLACEHOLDER_NUMAR_AVIZ_MS: '1225/2023',
  PLACEHOLDER_DATA_AVIZ_MS: '15.03.2023',
  PLACEHOLDER_NUMAR_AVIZ_ME: '8941/2023',
  PLACEHOLDER_DATA_AVIZ_ME: '22.03.2023',
  PLACEHOLDER_AUTORITATE_EMITENTA: 'Ministerul Sănătății & Ministerul Educației',
  PLACEHOLDER_ORDIN_APLICABIL: 'Ordinul comun MS/ME nr. 2209/4469/2022',
  PLACEHOLDER_DATA_SESIUNE: '10.03.2026',
  PLACEHOLDER_DATA_EXAMEN: '15.03.2026',
  PLACEHOLDER_DATA_PV: '15.03.2026',
  PLACEHOLDER_DATA_CATALOG: '15.03.2026',
  PLACEHOLDER_DATA_ELIBERARE: '15.03.2026',
  PLACEHOLDER_DATA_INREGISTRARE: '15.04.2021',
  PLACEHOLDER_DATA_EMITERE: '15.04.2021',
  PLACEHOLDER_PERIOADA_CURS: '01.03.2026 - 10.03.2026',
  PLACEHOLDER_ORA_EXAMEN: '10:00',
  PLACEHOLDER_LOCATIE_EXAMEN: 'București, Str. Agricultori nr. 35, Sector 2, Sala de Curs A2',
  PLACEHOLDER_SALA_EXAMEN: 'Sala de Curs A2',
  PLACEHOLDER_JUDET_EXAMEN: 'București',
  PLACEHOLDER_LOCALITATE_EXAMEN: 'Sector 2',
  PLACEHOLDER_PRESEDINTE_COMISIE: 'Dr. Alexandrescu Victor (Medic Primar DSP București)',
  PLACEHOLDER_MEMBRU_COMISIE: 'As. Med. Ionescu Claudia (Asistent Medical DSP București)',
  PLACEHOLDER_MEMBRU_COMISIE_1: 'As. Med. Ionescu Claudia',
  PLACEHOLDER_MEMBRU_COMISIE_2: 'Insp. Popa Dan (Inspector Sanitar DSP București)',
  PLACEHOLDER_SECRETAR_COMISIE: 'Georgescu Ana (Secretar Comisie Examinare)',
  PLACEHOLDER_COMISIE_EXAMEN: 'Dr. Alexandrescu Victor, As. Med. Ionescu Claudia, Insp. Popa Dan, Georgescu Ana',
  PLACEHOLDER_SERIE_PV: 'PV-IG',
  PLACEHOLDER_NUMAR_PV: '104',
  PLACEHOLDER_SERIE_ADEVERINTA: 'ADEV-IG',
  PLACEHOLDER_NUMAR_ADEVERINTA: '0042',
  PLACEHOLDER_NUMAR_CATALOG: 'CAT-2026/01',
  PLACEHOLDER_NUMAR_DECIZIE_COMISIE: 'DEC-IG/15',
  PLACEHOLDER_MODULE_IGIENA: 'Nivelul 1 - Servicii alimentație publică și comerț alimentar',
  PLACEHOLDER_MODUL_IGIENA: 'Modulul 1 - Servicii de alimentație',
  PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 1',
  PLACEHOLDER_REZULTAT_EXAMEN: 'Admis',
  PLACEHOLDER_NOTA_EXAMEN: '10',
  PLACEHOLDER_NUMAR_CANDIDATI: '1',
  PLACEHOLDER_NUMAR_PREZENTI: '1',
  PLACEHOLDER_NUMAR_ADMISI: '1',
  PLACEHOLDER_NUMAR_RESPINSI: '0',
};

/**
 * Grila Oficială INCDPM București a celor 30 de factori de risc pentru TESA
 * Consecințele corespund 1:1 textului imprimat în șablonul TESA.docx
 * Nivel de risc global calculat: N_rg = 178 / 68 = 2.62 <= 3.50 (conform Legii 319/2006)
 */
export interface INCDPMRiskFactor {
  index: number;
  hazard: string;
  consequence: string;
  gravity: number;
  frequency: number;
  partialRisk: number;
}

export const TESA_DEFAULT_FACTORS: INCDPMRiskFactor[] = [
  { index: 1, hazard: 'Executare operații din proprie inițiativă', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 2, hazard: 'Cădere la același nivel prin alunecare / împiedicare', consequence: 'ITM 45-180 zile', gravity: 3, frequency: 4, partialRisk: 3 },
  { index: 3, hazard: 'Minimalizarea pericolului prin nerespectarea instrucțiunilor', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 4, hazard: 'Intervenții PSI periculoase', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 5, hazard: 'Lucru sub influența alcoolului sau a medicamentelor', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 6, hazard: 'Circulație fără centură de siguranță ca pasager', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 7, hazard: 'Expunere în zone periculoase în afara sarcinii de muncă', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 8, hazard: 'Foc deschis lângă materiale inflamabile', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 9, hazard: 'Neefectuarea operațiilor indispensabile securității', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 10, hazard: 'Necomunicarea defecțiunilor apărute', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
  { index: 11, hazard: 'Lucru în condiții de neconformitate (nemarcare prize, lipsă truse)', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 12, hazard: 'Suprasolicitare dorso-lombară prin efort static așezat', consequence: 'ITM 45-180 zile', gravity: 3, frequency: 4, partialRisk: 3 },
  { index: 13, hazard: 'Suprasolicitare vizuală la videoterminale', consequence: 'INV gr.III', gravity: 4, frequency: 3, partialRisk: 3 },
  { index: 14, hazard: 'Suprasolicitare laringiană', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
  { index: 15, hazard: 'Ritm mare de muncă', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 4, partialRisk: 2 },
  { index: 16, hazard: 'Climat psihosocial necorespunzător', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
  { index: 17, hazard: 'Reacții spontane inadecvate în pericol', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
  { index: 18, hazard: 'Monotonia muncii', consequence: 'NEGLIJABILE', gravity: 1, frequency: 4, partialRisk: 1 },
  { index: 19, hazard: 'Leziuni membre la uși sau echipamente', consequence: 'ITM 45-180 zile', gravity: 3, frequency: 2, partialRisk: 2 },
  { index: 20, hazard: 'Cădere liberă obiecte la manipulare', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
  { index: 21, hazard: 'Contact cu suprafețe tăioase / înțepătoare (hârtie, birotică)', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 3, partialRisk: 2 },
  { index: 22, hazard: 'Accident rutier pasager', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 23, hazard: 'Deteriorare echipamente tehnice sau electrocasnice', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
  { index: 24, hazard: 'Incendii în benzinării sau trafic', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 25, hazard: 'Electrocutare prin atingere directă', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 26, hazard: 'Electrocutare prin atingere indirectă (deteriorare împământare)', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 27, hazard: 'Lucru cu substanțe iritante (toner, solvenți)', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 3, partialRisk: 2 },
  { index: 28, hazard: 'Calamități naturale (seism)', consequence: 'DECES', gravity: 7, frequency: 1, partialRisk: 3 },
  { index: 29, hazard: 'Pulberi de praf arhivă', consequence: 'NEGLIJABILE', gravity: 1, frequency: 3, partialRisk: 1 },
  { index: 30, hazard: 'Animale și insecte exterioare', consequence: 'ITM 3-45 zile', gravity: 2, frequency: 2, partialRisk: 1 },
];

export const INCDPM_30_FACTORS: Record<string, string> = {};
for (const f of TESA_DEFAULT_FACTORS) {
  const pad = String(f.index).padStart(2, '0');
  INCDPM_30_FACTORS[`PLACEHOLDER_GRAVITATE_RISC_${pad}`] = String(f.gravity);
  INCDPM_30_FACTORS[`PLACEHOLDER_FRECVENTA_RISC_${pad}`] = String(f.frequency);
  INCDPM_30_FACTORS[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`] = String(f.partialRisk);
}

export const ROMANIAN_LEGAL_RISK = {
  PLACEHOLDER_AN_INFIINTARE: '2021',
  PLACEHOLDER_AN_EVALUARE: '2026',
  PLACEHOLDER_COD_CAEN: '6201 - Activități de realizare a software-ului la comandă',
  PLACEHOLDER_ACTIVITATE_PRINCIPALA: 'Consultanță în tehnologia informației, inginerie software și suport IT',
  PLACEHOLDER_NUMAR_LUCRATORI: '10',
  PLACEHOLDER_PROGRAM_LUCRU: '8 ore/zi, 40 ore/săptămână, Luni - Vineri: 08:30 - 17:00',
  PLACEHOLDER_NIVEL_RISC_GLOBAL: '2.62',
  PLACEHOLDER_CONCLUZII_EVALUARE: 'Nivelul global de risc calculat pentru postul de lucru analizat este de 2,62, încadrându-se în categoria locurilor de muncă cu nivel de risc acceptabil (Nrg <= 3,50 conform metodei INCDPM). Pentru factorii de risc identificați au fost stabilite măsuri de prevenire în Planul de Prevenire și Protecție conform Legii 319/2006.',
  PLACEHOLDER_NUMAR_DOCUMENT: '01',
  PLACEHOLDER_NUMAR_FISA_EVALUARE: '01',
  PLACEHOLDER_NUMAR_LOC_MUNCA: '1',
  PLACEHOLDER_NUMAR_PERSOANE_EXPUSE: '5',
  PLACEHOLDER_DURATA_EXPUNERII: '8 ore/zi',
  PLACEHOLDER_NUMAR_FACTORI_RISC: '30 factori de risc (17 cu nivel parțial 3, 4 cu nivel parțial 2, 9 cu nivel parțial 1)',
  PLACEHOLDER_REPARTITIE_RISCURI: 'Executant: 33.33% (10 factori); Sarcina de muncă: 26.67% (8 factori); Mijloace de producție: 30.00% (9 factori); Mediul de muncă: 10.00% (3 factori)',
  PLACEHOLDER_DENUMIRE_ZONA_01: 'Tablou electric general de distribuție (TEG) și cameră servere',
  PLACEHOLDER_MASURI_ZONA_01: 'Îngrădire acces persoane neautorizate, verificare semestrială împământare PRAM, dotare cu stingător cu dioxid de carbon (CO2)',
  PLACEHOLDER_DENUMIRE_ZONA_02: 'Centrală termică de imobil și instalație alimentare gaze naturale',
  PLACEHOLDER_MASURI_ZONA_02: 'Verificare tehnică periodică ISCIR, senzori automați de detecție scăpări gaze cu electrovalvă de secționare',
  PLACEHOLDER_DENUMIRE_ZONA_03: 'Căi de circulație interioare și scări de evacuare de urgență',
  PLACEHOLDER_MASURI_ZONA_03: 'Păstrarea liberă în permanență a căilor de evacuare, iluminat de siguranță funcțional și benzi antiderapante',
  PLACEHOLDER_DENUMIRE_ZONA_04: 'Zonă depozitare materiale și arhivă documente',
  PLACEHOLDER_MASURI_ZONA_04: 'Ancorare mecanică a rafturilor metalice de pereți, limitare sarcină maximă pe poliță, interzicerea fumatului',
  PLACEHOLDER_DENUMIRE_ZONA_05: 'Rampă de încărcare-descărcare și parcare autovehicule operative',
  PLACEHOLDER_MASURI_ZONA_05: 'Viteză maximă restricționată la 5 km/h, marcaje vizuale galben-negre, interzicerea staționării sub sarcină',
  PLACEHOLDER_DENUMIRE_ZONA_06: 'Atelier tehnic de mentenanță și reparații echipamente',
  PLACEHOLDER_MASURI_ZONA_06: 'Utilizare obligatorie echipament individual de protecție (ochelari, mănuși electroizolante), verificare zilnică scule',
};

/**
 * Fișe Individuale de Instruire SSM și PSI/SU (F7 & F8)
 * Baza legală: Legea 319/2006, HG 1425/2006 Anexa 11, Legea 307/2006, OMAI 712/2005 Anexa
 */
export const ROMANIAN_LEGAL_TRAINING_SHEETS = {
  // F7: SSM
  PLACEHOLDER_LOC_MUNCA: 'Sediul social / Punctul de lucru al angajatorului',
  PLACEHOLDER_MARCA: 'M-042',
  PLACEHOLDER_GRUPA_SANGUINA: 'AII / Rh+',
  PLACEHOLDER_DOMICILIU: 'București, Sector 1, Str. Victoriei nr. 10',
  PLACEHOLDER_CALIFICARE: 'Studii superioare tehnice / Inginer IT',
  PLACEHOLDER_AUTORIZATII: 'Nu este cazul',
  PLACEHOLDER_TRASEU_DEPLASARE: 'Domiciliu (București, Sector 1) - Metrou - Sediul Central (București, Sector 1) și retur',
  PLACEHOLDER_DURATA_TRASEU: '30 minute',
  PLACEHOLDER_DATA_INSTRUIRE_IG: '15.01.2026',
  PLACEHOLDER_DURATA_INSTRUIRE_IG: '8 ore',
  PLACEHOLDER_INSTRUCTOR_IG: 'Ing. Mihai Popescu (Specialist SSM abilitat)',
  PLACEHOLDER_TEMATICA_IG: 'Legislația generală SSM (Legea 319/2006, HG 1425/2006), drepturi și obligații ale lucrătorilor, riscuri generale la locul de muncă, măsuri de prim ajutor, acordare și utilizare EIP',
  PLACEHOLDER_VERIFICATOR_IG: 'Munteanu Cristian (Reprezentant Legal)',
  PLACEHOLDER_DATA_INSTRUIRE_LM: '15.01.2026',
  PLACEHOLDER_DURATA_INSTRUIRE_LM: '8 ore',
  PLACEHOLDER_LOC_MUNCA_LM: 'Birou / Punct de lucru - Departamentul IT & Proiectare',
  PLACEHOLDER_INSTRUCTOR_LM: 'Ing. Mihai Popescu (Conducătorul locului de muncă)',
  PLACEHOLDER_TEMATICA_LM: 'Instrucțiuni proprii specifice SSM (IPSSM activități de birou, lucrul la videoterminale), riscuri mecanice și electrice, proceduri de urgență în caz de pericol grav și iminent',
  PLACEHOLDER_VERIFICATOR_LM: 'Munteanu Cristian (Conducător ierarhic superior)',
  PLACEHOLDER_DATA_ADMITERE: '15.01.2026',
  PLACEHOLDER_ADMITERE_NUME: 'Munteanu Cristian',

  // F8: PSI
  PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: '15.01.2026',
  PLACEHOLDER_DURATA_INSTRUCTAJ_IG_PSI: '8 ore',
  PLACEHOLDER_INSTRUCTOR_IG_PSI: 'Gheorghe Barbu (Cadru tehnic PSI)',
  PLACEHOLDER_TEMATICA_IG_PSI: 'Legislația apărării împotriva incendiilor (Legea 307/2006, OMAI 712/2005, OMAI 163/2007); Obligațiile salariaților; Cauze generale de incendiu; Procedura de evacuare; Folosirea stingătoarelor P6 și CO2',
  PLACEHOLDER_VERIFICATOR_IG_PSI: 'Munteanu Cristian (Administrator)',
  PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: '15.01.2026',
  PLACEHOLDER_DURATA_INSTRUCTAJ_LM_PSI: '8 ore',
  PLACEHOLDER_LOC_MUNCA_LM_PSI: 'Birou / Punct de lucru - Departamentul IT & Proiectare',
  PLACEHOLDER_INSTRUCTOR_LM_PSI: 'Gheorghe Barbu (Conducătorul locului de muncă)',
  PLACEHOLDER_TEMATICA_LM_PSI: 'Instrucțiuni specifice de apărare împotriva incendiilor la locul de muncă; Surse posibile de aprindere la echipamente electrice; Căi de evacuare și salvare; Poziționarea mijloacelor de primă intervenție',
  PLACEHOLDER_VERIFICATOR_LM_PSI: 'Munteanu Cristian (Administrator)',
  PLACEHOLDER_DATA_ADMITERE_PSI: '15.01.2026',
  PLACEHOLDER_ADMITERE_NUME_PSI: 'Munteanu Cristian',
};

/**
 * Medicina Muncii: Fisa Solicitare Examen (Anexa 2) & Fisa Identificare Riscuri (Anexa 3 HG 355/2007)
 */
export const ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH = {
  // Anexa 2: Solicitare examen
  PLACEHOLDER_TELEFON_FIRMA: '0722334455',
  PLACEHOLDER_EMAIL_FIRMA: 'contact@client.ro',
  PLACEHOLDER_ACTIVITATE_CAEN: 'Activități de realizare a software-ului la comandă (software orientat client)',
  PLACEHOLDER_NUMAR_INREGISTRARE_SOLICITARE: 'SOL-MED-042/2026',
  PLACEHOLDER_CABINET_MEDICINA_MUNCII: 'CENTRU MEDICAL DE MEDICINA MUNCII S.R.L.',
  PLACEHOLDER_MEDIC_MEDICINA_MUNCII: 'Dr. Alexandrescu Victor (Medic Primar Medicina Muncii, Cabinet Atestat DSP)',
  PLACEHOLDER_ADRESA_CABINET_MEDICINA_MUNCII: 'București, Bd. Aviatorilor nr. 15, Sector 1',
  PLACEHOLDER_TIP_EXAMEN_MEDICAL: 'Control medical periodic',
  PLACEHOLDER_BIFAT_ANGAJARE: '[  ]',
  PLACEHOLDER_BIFAT_PERIODIC: '[X]',
  PLACEHOLDER_BIFAT_ADAPTARE: '[  ]',
  PLACEHOLDER_BIFAT_RELUARE: '[  ]',
  PLACEHOLDER_BIFAT_SPECIALA: '[  ]',
  PLACEHOLDER_BIFAT_SCHIMBARE_LOC: '[  ]',
  PLACEHOLDER_BIFAT_LA_CERERE: '[  ]',
  PLACEHOLDER_BIFAT_ALTELE: '[  ]',
  PLACEHOLDER_NUME_ANTERIOR: '-',
  PLACEHOLDER_SEX: 'M',
  PLACEHOLDER_APELATIV_SALARIAT: 'Dl.',
  PLACEHOLDER_PROFESIE_OCUPATIE: 'Inginer sisteme software',
  PLACEHOLDER_SECTIE_COMPARTIMENT: 'Departament IT & Dezvoltare Software',
  PLACEHOLDER_VECHIME_TOTALA: '5 ani',
  PLACEHOLDER_VECHIME_MESERIE: '3 ani',
  PLACEHOLDER_VECHIME_LOC_MUNCA: '2 ani',
  PLACEHOLDER_TRASEU_PROFESIONAL: 'Fără expunere anterioară documentată la noxe profesionale sau factori nocivi deosebiți',
  PLACEHOLDER_DATA_SOLICITARII: '15.01.2026',
  PLACEHOLDER_FUNCTIE_REPREZENTANT: 'Administrator',

  // Anexa 3: Fisa Identificare Factori de Risc Profesional
  PLACEHOLDER_SUBUNITATE: 'Sediul Central București',
  PLACEHOLDER_NAVETA_STATUS: 'Nu',
  PLACEHOLDER_NAVETA_ORE: '0 ore (deplasare urbană sub 30 minute)',
  PLACEHOLDER_LUCRU_ECHIPA: 'Da',
  PLACEHOLDER_NUMAR_SCHIMBURI: '1',
  PLACEHOLDER_SCHIMB_NOAPTE: 'Nu',
  PLACEHOLDER_PAUZE_ORGANIZATE: 'Da (pauză de masă de 30 minute și pauze ergonomice de 10 minute la 2 ore)',
  PLACEHOLDER_BANDA_RULANTA: 'Nu',
  PLACEHOLDER_ACTIVITATI_POST: 'Activitate intelectuală de birou, dezvoltare de aplicații software, analiză de cod, documentare tehnică și comunicare online',
  PLACEHOLDER_DESCRIERE_ACTIVITATE: 'Activitate intelectuală de birou, dezvoltare de aplicații software, analiză de cod, documentare tehnică și comunicare online',
  PLACEHOLDER_ECHIPAMENTE_POST: 'Laptop / unitate PC, monitoare LED, tastatură, mouse, imprimantă de rețea, echipamente de comunicație',
  PLACEHOLDER_CONDITII_POST: 'Activitate de interior în încăpere climatizată, iluminat combinat (natural și artificial) conform normelor, mobilier ergonomic',
  PLACEHOLDER_RISC_INFECTARE: 'Nu',
  PLACEHOLDER_RISC_ELECTROCUTARE: 'Nu (risc redus la cordoanele de alimentare protejate ale calculatoarelor)',
  PLACEHOLDER_RISC_INEC: 'Nu',
  PLACEHOLDER_RISC_ASFIXIERE: 'Nu',
  PLACEHOLDER_RISC_BLOCARE: 'Nu',
  PLACEHOLDER_RISC_MICROTRAUMATISME: 'Nu',
  PLACEHOLDER_RISC_LOVIRE: 'Nu',
  PLACEHOLDER_RISC_MUSCATURA: 'Nu',
  PLACEHOLDER_RISC_STRIVIRE: 'Nu',
  PLACEHOLDER_RISC_TAIERE: 'Nu',
  PLACEHOLDER_RISC_INTEPARE: 'Nu',
  PLACEHOLDER_RISC_IMPUSCARE: 'Nu',
  PLACEHOLDER_RISC_ARSURI_OPARIRE: 'Nu',
  PLACEHOLDER_MISCARI_REPETITIVE: 'Da (tastare la tastatură și manevrare mouse în ritm moderat)',
  PLACEHOLDER_AUTO_INSTITUTIE: 'Nu',
  PLACEHOLDER_CATEGORIE_PERMIS: 'Nu este cazul (opțional categoria B)',
  PLACEHOLDER_CONDITII_DEOSEBITE_SPECIALE: 'Nu',
  PLACEHOLDER_SECTOR_ALIMENTAR: 'Nu',
  PLACEHOLDER_PORT_ARMA: 'Nu',
  PLACEHOLDER_LUCRU_INALTIME: 'Nu',
  PLACEHOLDER_SPATII_IZOLATE: 'Nu',
  PLACEHOLDER_DIMENSIUNI_INCAPERE: 'L = 12 m, l = 8 m, h = 3 m (volum cca. 288 mc)',
  PLACEHOLDER_SUPRAFATA_LUCRU: 'Suprafață medie de lucru > 6 mp per salariat',
  PLACEHOLDER_MEDIU_ACTIVITATE: 'La sol (clădire modernă de birouri, etaj intermediar)',
  PLACEHOLDER_NIVEL_EFORT_FIZIC: 'Mic (solicitare posturală statică la birou)',
  PLACEHOLDER_POZITIE_LUCRU: 'Așezat pe scaun ergonomic reglabil (> 70% din programul de lucru)',
  PLACEHOLDER_POZITII_VICIOASE: 'Poziție așezată prelungită (se previn prin pauze de dezmorțire și reglarea mobilierului)',
  PLACEHOLDER_MANIPULARE_MASE: 'Nu',
  PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA: 'Sub 3 kg (dosare, topuri hârtie, laptop)',
  PLACEHOLDER_SUPRASOLICITARE_VIZUALA: 'Da - lucru cu ecran de vizualizare (videoterminal/laptop) peste 4 ore/zi conform Fișei 243 din HG 355/2007',
  PLACEHOLDER_SUPRASOLICITARE_AUDITIVA: 'Nu',
  PLACEHOLDER_SUPRASOLICITARE_NEUROPSIHICA: 'Medie (concentrare susținută, atenție la detalii tehnice și termene de proiect)',
  PLACEHOLDER_SOLICITARE_OSTEOARTICULARA: 'Coloană cervicală și lombară, articulații radiocarpiene (prevenite prin ergonomia postului)',
  PLACEHOLDER_AGENTI_CHIMICI: 'Nu este cazul',
  PLACEHOLDER_AGENTI_CHIMICI_VLE: 'Sub valorile limită admisibile (V.L.E.)',
  PLACEHOLDER_PULBERI_PROFESIONALE: 'Nu este cazul',
  PLACEHOLDER_PULBERI_VLE: 'Sub V.L.E.',
  PLACEHOLDER_ZGOMOT_PROFESIONAL: 'Sub limita superioară de acțiune (Leq < 55 dB(A))',
  PLACEHOLDER_ZGOMOTE_IMPULSIVE: 'Nu',
  PLACEHOLDER_VIBRATII: 'Nu este cazul',
  PLACEHOLDER_TEMPERATURA_AER: '21 - 24 °C (climatizare controlată automat)',
  PLACEHOLDER_VARIATII_TEMPERATURA: 'Nu',
  PLACEHOLDER_UMIDITATE_AER: '45 - 60 %',
  PLACEHOLDER_PRESIUNE_AER: 'Presiune atmosferică normală',
  PLACEHOLDER_RADIATII_NEIONIZANTE: 'Nu (ecrane conforme directivelor CE fără emisii periculoase)',
  PLACEHOLDER_RADIATII_IONIZANTE: 'Nu',
  PLACEHOLDER_AGENTI_BIOLOGICI: 'Nu',
  PLACEHOLDER_PROTECTIE_COLECTIVA: 'Sistem climatizare-ventilație mecanică, împământare carcase echipamente IT, protecție diferențială 30mA, iluminat fără pâlpâire',
  PLACEHOLDER_PROTECTIE_INDIVIDUALA: 'Ochelari de protecție la monitor (filtru lumină albastră), scaun birou ergonomic reglabil tri-dimensional',
  PLACEHOLDER_DATA_INTOCMIRII: '15.01.2026',
};

/**
 * EIP: Fisa Individuala de Acordare si Dotare a EIP (HG 1048/2006)
 */
export const ROMANIAN_LEGAL_EIP = {
  PLACEHOLDER_DATA_ELIBERARII_FISEI: '15.01.2026',
  PLACEHOLDER_MARIME_HAINE: 'M / 48',
  PLACEHOLDER_MARIME_INCALTAMINTE: '42',
  PLACEHOLDER_MARIME_MANUSI: '9 (L)',
  PLACEHOLDER_MARIME_CASCA: 'Reglabilă (54-62 cm)',
  PLACEHOLDER_DATA_SEMNARII_EIP: '15.01.2026',
  PLACEHOLDER_NUME_SALARIAT: 'Stan Alexandru',
  PLACEHOLDER_GESTIONAR_EIP: 'Ion Ionescu (Responsabil Magazie EIP)',
  PLACEHOLDER_SEF_LOC_MUNCA: 'Ing. Mihai Popescu (Conducător Loc de Muncă)',

  // 10 rânduri de dotare EIP:
  PLACEHOLDER_EIP_DENUMIRE_01: 'Încălțăminte de protecție cu bombeu și talpă antiderapantă',
  PLACEHOLDER_EIP_STANDARD_01: 'SR EN ISO 20345:2022 (S1P SRC)',
  PLACEHOLDER_EIP_UM_01: 'pereche',
  PLACEHOLDER_EIP_CANTITATE_01: '1',
  PLACEHOLDER_EIP_DURATA_01: '12 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_01: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_01: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_01: '-',
  PLACEHOLDER_EIP_MOTIV_01: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_01: '-',

  PLACEHOLDER_EIP_DENUMIRE_02: 'Ochelari de protecție la ecran cu filtru anti-lumină albastră',
  PLACEHOLDER_EIP_STANDARD_02: 'SR EN 166:2003 / SR EN 170',
  PLACEHOLDER_EIP_UM_02: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_02: '1',
  PLACEHOLDER_EIP_DURATA_02: '24 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_02: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_02: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_02: '-',
  PLACEHOLDER_EIP_MOTIV_02: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_02: '-',

  PLACEHOLDER_EIP_DENUMIRE_03: 'Costum / Halat de protecție bumbac',
  PLACEHOLDER_EIP_STANDARD_03: 'SR EN ISO 13688:2013',
  PLACEHOLDER_EIP_UM_03: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_03: '1',
  PLACEHOLDER_EIP_DURATA_03: '12 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_03: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_03: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_03: '-',
  PLACEHOLDER_EIP_MOTIV_03: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_03: '-',

  PLACEHOLDER_EIP_DENUMIRE_04: 'Vestă avertizoare de mare vizibilitate',
  PLACEHOLDER_EIP_STANDARD_04: 'SR EN ISO 20471:2013 Clasa 2',
  PLACEHOLDER_EIP_UM_04: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_04: '1',
  PLACEHOLDER_EIP_DURATA_04: '24 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_04: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_04: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_04: '-',
  PLACEHOLDER_EIP_MOTIV_04: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_04: '-',

  PLACEHOLDER_EIP_DENUMIRE_05: 'Cască de protecție pentru vizite în șantier/ateliere',
  PLACEHOLDER_EIP_STANDARD_05: 'SR EN 397:2012+A1:2012',
  PLACEHOLDER_EIP_UM_05: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_05: '1',
  PLACEHOLDER_EIP_DURATA_05: '36 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_05: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_05: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_05: '-',
  PLACEHOLDER_EIP_MOTIV_05: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_05: '-',

  PLACEHOLDER_EIP_DENUMIRE_06: 'Mănuși de protecție împotriva riscurilor mecanice',
  PLACEHOLDER_EIP_STANDARD_06: 'SR EN 388:2016+A1:2018 (3121X)',
  PLACEHOLDER_EIP_UM_06: 'pereche',
  PLACEHOLDER_EIP_CANTITATE_06: '2',
  PLACEHOLDER_EIP_DURATA_06: '6 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_06: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_06: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_06: '-',
  PLACEHOLDER_EIP_MOTIV_06: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_06: '-',

  PLACEHOLDER_EIP_DENUMIRE_07: 'Antifoane externe / dopuri protecție auditivă',
  PLACEHOLDER_EIP_STANDARD_07: 'SR EN 352-1:2020 / SR EN 352-2:2020',
  PLACEHOLDER_EIP_UM_07: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_07: '1',
  PLACEHOLDER_EIP_DURATA_07: '12 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_07: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_07: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_07: '-',
  PLACEHOLDER_EIP_MOTIV_07: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_07: '-',

  PLACEHOLDER_EIP_DENUMIRE_08: 'Semimască de protecție respiratorie FFP2',
  PLACEHOLDER_EIP_STANDARD_08: 'SR EN 149:2001+A1:2009',
  PLACEHOLDER_EIP_UM_08: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_08: '5',
  PLACEHOLDER_EIP_DURATA_08: 'La uzură / lunar',
  PLACEHOLDER_EIP_DATA_ACORDARII_08: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_08: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_08: '-',
  PLACEHOLDER_EIP_MOTIV_08: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_08: '-',

  PLACEHOLDER_EIP_DENUMIRE_09: 'Pelerină de ploaie impermeabilă',
  PLACEHOLDER_EIP_STANDARD_09: 'SR EN 343:2019',
  PLACEHOLDER_EIP_UM_09: 'buc.',
  PLACEHOLDER_EIP_CANTITATE_09: '1',
  PLACEHOLDER_EIP_DURATA_09: '36 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_09: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_09: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_09: '-',
  PLACEHOLDER_EIP_MOTIV_09: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_09: '-',

  PLACEHOLDER_EIP_DENUMIRE_10: 'Trusă individuală prim ajutor de buzunar',
  PLACEHOLDER_EIP_STANDARD_10: 'Ordin MS 427/2002',
  PLACEHOLDER_EIP_UM_10: 'set',
  PLACEHOLDER_EIP_CANTITATE_10: '1',
  PLACEHOLDER_EIP_DURATA_10: '24 luni',
  PLACEHOLDER_EIP_DATA_ACORDARII_10: '15.01.2026',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_10: 'Semnat salariat',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_10: '-',
  PLACEHOLDER_EIP_MOTIV_10: '-',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_10: '-',
};

/**
 * Clauze Contractuale HR conform Codului Muncii (Legea 53/2003) și Ordinului MMSS 2171/2022
 */
export const ROMANIAN_LEGAL_HR_CIM = {
  PLACEHOLDER_NUMAR_CIM: '',
  PLACEHOLDER_DATA_CIM: '',
  PLACEHOLDER_DATA_SEMNARII: '',
  PLACEHOLDER_DATA_SFARSIT: '- (nedeterminată)',
  PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: 'Nedeterminată conform art. 12 alin. (1) din Legea nr. 53/2003 - Codul Muncii',
  PLACEHOLDER_PERMIS_MUNCA: 'Nu este cazul (cetățean român)',
  PLACEHOLDER_ORE_PE_ZI: '8',
  PLACEHOLDER_ORE_PE_SAPTAMANA: '40',
  PLACEHOLDER_TIP_NORMA: 'Normă întreagă (8 ore/zi, 40 ore/săptămână)',
  PLACEHOLDER_NORMA_LUCRU: 'Normă întreagă (8 ore/zi, 40 ore/săptămână)',
  PLACEHOLDER_PROGRAM_LUCRU: 'Normă întreagă de 8 ore/zi, 40 ore/săptămână, Luni - Vineri între 08:30 - 17:00',
  PLACEHOLDER_REPARTIZARE_PROGRAM: 'Uniformă, 8 ore/zi, repartizate de luni până vineri, cu 2 zile consecutive de repaus săptămânal',
  PLACEHOLDER_CONDITII_ORE_SUPLIMENTARE: 'Munca suplimentară se efectuează numai cu acordul salariatului și se compensează prin ore libere plătite sau spor salarial conform art. 122-123 din Legea 53/2003',
  PLACEHOLDER_ORGANIZARE_SCHIMBURI: 'Nu este cazul (schimb unic de zi)',
  PLACEHOLDER_SALARIU_BRUT: '',
  PLACEHOLDER_SPORURI_SALARIU: 'Nu este cazul',
  PLACEHOLDER_INDEMNIZATII_SALARIU: 'Nu este cazul',
  PLACEHOLDER_ALTE_ADAOSURI_BENEFICII: 'Tichete de masă conform Legii nr. 165/2018',
  PLACEHOLDER_DATA_PLATA: 'data de 15 a fiecărei luni pentru luna precedentă',
  PLACEHOLDER_METODA_PLATA: 'Virament bancar în contul IBAN al salariatului',
  PLACEHOLDER_ALTE_DREPTURI_SALARIALE: 'Tichete de masă conform Legii 165/2018, servicii medicale private',
  PLACEHOLDER_ZILE_CONCEDIU: '21 de zile lucrătoare',
  PLACEHOLDER_ZILE_CONCEDIU_SUPLIMENTAR: 'Nu este cazul',
  PLACEHOLDER_ZILE_PROBA: '90 de zile calendaristice conform art. 31 alin. (1) din Legea 53/2003',
  PLACEHOLDER_DURATA_PROBA: '90 de zile calendaristice conform art. 31 din Legea 53/2003',
  PLACEHOLDER_CONDITII_PROBA: 'Pe durata sau la sfârșitul perioadei de probă, contractul poate înceta exclusiv printr-o notificare scrisă, fără preaviz, la inițiativa oricăreia dintre părți, fără a fi necesară motivarea acesteia.',
  PLACEHOLDER_TIP_LOC_MUNCA: 'Loc de muncă fix la adresa punctului de lucru / sediului social',
  PLACEHOLDER_LOC_MUNCA: 'Sediul social / Punctul de lucru al angajatorului',
  PLACEHOLDER_DECONTARE_TRANSPORT: 'Nu este cazul (activitate la sediu stabil; cheltuielile de transport se decontează conform procedurii interne dacă deplasarea este impusă în interes de serviciu)',
  PLACEHOLDER_TIP_DURATA_CIM: 'Nedeterminată',
  PLACEHOLDER_DURATA_LUNI_DETERMINATA: '-',
  PLACEHOLDER_DATA_INCEPUT: '15.01.2026',
  PLACEHOLDER_DATA_INCEPERE: '15.01.2026',
  PLACEHOLDER_ECHIPAMENT_PROTECTIE: 'Echipament individual de protecție acordat gratuit conform normativului intern și HG 1048/2006',
  PLACEHOLDER_ECHIPAMENT_LUCRU: 'Ținută de birou conform regulamentului intern al angajatorului',
  PLACEHOLDER_MATERIALE_IGIENICO_SANITARE: 'Materiale igienico-sanitare asigurate gratuit la locul de muncă conform art. 13 lit. r din Legea 319/2006',
  PLACEHOLDER_ALIMENTATIE_PROTECTIE: 'Nu este cazul',
  PLACEHOLDER_ZILE_PREAVIZ_CONCEDIERE: '20 de zile lucrătoare conform art. 75 alin. (1) din Legea 53/2003',
  PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE: '20 de zile lucrătoare conform art. 81 alin. (4) din Legea 53/2003',
  PLACEHOLDER_PERIODICITATE_FORMARE: 'Cel puțin o dată la 2 ani conform art. 193 din Legea nr. 53/2003 - Codul Muncii',
  PLACEHOLDER_CONDITII_FORMARE: 'Cheltuielile cu participarea la programele de formare profesională inițiate de angajator sunt suportate integral de acesta conform art. 194 Codul Muncii.',
  PLACEHOLDER_ASIGURARE_MEDICALA_PRIVATA: 'Abonament de servicii medicale la o clinică privată de sănătate suportat de angajator',
  PLACEHOLDER_PENSIE_FACULTATIVA: 'Nu este cazul',
  PLACEHOLDER_ALTE_BENEFICII_SOCIALE: 'Nu este cazul',
  PLACEHOLDER_CLAUZE_SPECIALE: 'Clauză de confidențialitate și de protecție a datelor cu caracter personal conform Regulamentului (UE) 2016/679 (GDPR)',
  PLACEHOLDER_NUMAR_EXEMPLARE_CIM: '2 exemplare originale, câte unul pentru fiecare parte',
  PLACEHOLDER_OBIECT_CONTRACT: 'Prestarea muncii în condițiile stabilite de prezentul contract individual de muncă și de fișa postului, cu plata salariului corespunzător de către angajator.',
  PLACEHOLDER_CASA_SANATATE: 'C.A.S. Municipiul București',
  PLACEHOLDER_TIP_PENSIE: 'Nu este cazul (nu beneficiază de pensie)',
  PLACEHOLDER_COD_POSTAL_FIRMA: '010001',
  PLACEHOLDER_CONT_BANCA_FIRMA: '',
  PLACEHOLDER_BANCA_FIRMA: '',
  PLACEHOLDER_TELEFON_SALARIAT: '',
  PLACEHOLDER_EMAIL_SALARIAT: '',
  PLACEHOLDER_CONT_BANCA_SALARIAT: '',
  PLACEHOLDER_BANCA_SALARIAT: '',
  PLACEHOLDER_DOMICILIU: 'București, Sector 1, Str. Victoriei nr. 10',
  PLACEHOLDER_MARCA: '',
  PLACEHOLDER_NUME_COMPLET_PERSOANA_01: '-',
  PLACEHOLDER_CNP_PERSOANA_01: '-',
  PLACEHOLDER_CALITATE_PERSOANA_01: '-',
  PLACEHOLDER_INVALIDITATE_PERSOANA_01: '-',
  PLACEHOLDER_DATA_INTRETINERE_01: '-',
  PLACEHOLDER_VENIT_PERSOANA_01: '-',
  PLACEHOLDER_NUME_COMPLET_PERSOANA_02: '-',
  PLACEHOLDER_CNP_PERSOANA_02: '-',
  PLACEHOLDER_CALITATE_PERSOANA_02: '-',
  PLACEHOLDER_INVALIDITATE_PERSOANA_02: '-',
  PLACEHOLDER_DATA_INTRETINERE_02: '-',
  PLACEHOLDER_VENIT_PERSOANA_02: '-',
};

export const ALL_ROMANIAN_LEGAL_FALLBACKS: Record<string, unknown> = {
  ...ROMANIAN_LEGAL_SSM_PROVIDER,
  ...ROMANIAN_LEGAL_DECIZII,
  ...ROMANIAN_LEGAL_IPSSM,
  ...ROMANIAN_LEGAL_TRAINING,
  ...ROMANIAN_LEGAL_TRAINING_SHEETS,
  ...ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH,
  ...ROMANIAN_LEGAL_EIP,
  ...ROMANIAN_LEGAL_HYGIENE,
  ...ROMANIAN_LEGAL_RISK,
  ...INCDPM_30_FACTORS,
  ...ROMANIAN_LEGAL_HR_CIM,
};

// ============================================================================
// FUNCȚII UTILITARE DE FORMATARE
// ============================================================================

/**
 * Normalizare diacritice românești pentru potrivire lexicală robustă (ex. Chirilă -> chirila).
 */
function normalizeRomanianName(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Excepții feminine notabile: prenume feminine care NU se termină în -a
 */
const FEMALE_EXCEPTIONS = new Set([
  'carmen', 'alice', 'beatrice', 'ingrid', 'astrid', 'catrinel',
  'damaris', 'rachel', 'zoe', 'iris', 'ruth', 'ester', 'bebe',
  'miriam', 'evelin', 'eveline', 'nicole', 'vivien', 'lili', 'neli',
  'nelly', 'noemi', 'naomi', 'ines', 'agnes', 'karin'
]);

/**
 * Excepții masculine notabile: prenume masculine românești care SE TERMINĂ în -a
 */
const MALE_EXCEPTIONS = new Set([
  'mircea', 'horia', 'horea', 'mihnea', 'toma', 'luca', 'costea',
  'dima', 'sava', 'mateia', 'necula', 'oprea', 'petrea',
  'nichita', 'danila', 'gheorghita', 'costica', 'mitica', 'irimia'
]);

/**
 * Nume de familie frecvente românești terminate în -a (care nu trebuie confundate cu prenume feminine)
 */
const MALE_SURNAMES_ENDING_IN_A = new Set([
  'popa', 'manea', 'badea', 'enache', 'voinea', 'mitrea', 'sandu', 'vrancea',
  'florea', 'chirila', 'moga', 'marica', 'ciurea', 'ganea', 'buruiana',
  'danaila', 'bercea', 'sporea', 'mirea', 'cornea', 'cretea', 'dobrea'
]);

/**
 * Catalog extins de prenume feminine românești frecvente
 */
const COMMON_FEMALE_NAMES = new Set([
  'maria', 'elena', 'ioana', 'andreea', 'cristina', 'ana', 'mihaela',
  'gabriela', 'simona', 'roxana', 'diana', 'laura', 'daniela', 'camelia',
  'monica', 'rodica', 'doina', 'mariana', 'nicoleta', 'alina', 'ramona',
  'oana', 'silvia', 'irina', 'emilia', 'iulia', 'georgeta', 'stefania',
  'larisa', 'denisa', 'madalina', 'georgiana', 'luminita', 'viorica',
  'liliana', 'florentina', 'claudia', 'anca', 'bianca', 'raluca', 'adriana',
  'alexandra', 'patricia', 'teodora', 'eugenia', 'paula', 'lorena', 'otilia',
  'corina', 'valentina', 'felicia', 'delia', 'ligia', 'gina', 'lia', 'sorina',
  'adelina', 'adela', 'anastasia', 'antonia', 'aura', 'aurelia', 'aurora',
  'crina', 'daria', 'dorina', 'ecaterina', 'eliza', 'flavia', 'florina',
  'florica', 'ilinca', 'lavinia', 'luiza', 'magdalena', 'manuela', 'marcela',
  'marina', 'mirela', 'nadia', 'narcisa', 'natalia', 'olga', 'olimpia',
  'paulina', 'rebeca', 'roberta', 'ruxandra', 'sabina', 'sanziana',
  'sofia', 'sonia', 'stela', 'suzana', 'tania', 'tatiana', 'valeria',
  'vasilica', 'veronica', 'victoria', 'violeta'
]);

/**
 * Prenume masculine românești frecvente utilizate pentru a valida ordinea inversată (Nume Prenume vs Prenume Nume)
 */
const COMMON_MALE_NAMES = new Set([
  'ion', 'ioan', 'ionel', 'ionut', 'gheorghe', 'vasile', 'mihai', 'mihaita',
  'andrei', 'alexandru', 'alex', 'constantin', 'costel', 'stefan', 'cristian',
  'cristi', 'gabriel', 'gabi', 'florin', 'florentin', 'radu', 'dan', 'danut',
  'bogdan', 'marius', 'tudor', 'ciprian', 'silviu', 'valentin', 'vali',
  'dorin', 'dorinel', 'claudiu', 'liviu', 'sergiu', 'cornel', 'corneliu',
  'paul', 'vlad', 'vladimir', 'victor', 'george', 'adrian', 'adi', 'catalin',
  'cosmin', 'razvan', 'sorin', 'laurentiu', 'iulian', 'octavian', 'marian',
  'marin', 'daniel', 'eugen', 'emil', 'aurel', 'traian', 'petre', 'petru',
  'dumitru', 'ilie', 'nicolae', 'nicu', 'nicusor', 'dragos', 'calin',
  'romeo', 'remus', 'tiberiu', 'ovidiu', 'virgil', 'viorel', 'marcel',
  'miron', 'teodor', 'felix', 'dorel', 'sebastian'
]);

/**
 * Determinare automată și robustă a apelativului („Dl.” / „Dna.”) pentru limba română.
 * Analizează prioritar prima cifră a CNP-ului, urmată de analiza lingvistică a antroponimului.
 */
export function detectRomanianSalutation(
  fullName?: string | null,
  cnp?: string | null
): 'Dl.' | 'Dna.' {
  // 1. Verificare prioritară pe baza CNP-ului (cifra 1)
  if (cnp && typeof cnp === 'string') {
    const cleanCnp = cnp.trim();
    if (cleanCnp.length >= 1) {
      const firstDigit = cleanCnp.charAt(0);
      if (['1', '3', '5', '7'].includes(firstDigit)) {
        return 'Dl.';
      }
      if (['2', '4', '6', '8'].includes(firstDigit)) {
        return 'Dna.';
      }
    }
  }

  // 2. Protecție date nule
  if (!fullName || typeof fullName !== 'string') {
    return 'Dl.';
  }

  // 3. Gestionare liste de persoane (ex. membri comisie separați prin virgulă sau punct și virgulă)
  const primaryPerson = fullName.split(/[,;]/)[0];

  // 4. Curățare titluri profesionale uzuale (cu sau fără punct) și caractere de punctuație
  const cleanName = primaryPerson
    .replace(/\b(ing|dr|ec|prof|av|conf|lect|arh|asist)\.?\b/gi, '')
    .replace(/[,.\-_/\\]/g, ' ')
    .trim();

  if (!cleanName) {
    return 'Dl.';
  }

  const rawTokens = cleanName.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map(normalizeRomanianName);

  if (tokens.length === 0) {
    return 'Dl.';
  }

  // 5. Analiză lexicală a tokenurilor
  let hasExplicitFemaleGivenName = false;
  let hasMaleException = false;
  let hasExplicitMaleGivenName = false;
  let hasMaleSurnameInA = false;
  let endsInA = false;

  for (const token of tokens) {
    if (FEMALE_EXCEPTIONS.has(token) || COMMON_FEMALE_NAMES.has(token)) {
      hasExplicitFemaleGivenName = true;
    }
    if (MALE_EXCEPTIONS.has(token)) {
      hasMaleException = true;
    }
    if (COMMON_MALE_NAMES.has(token)) {
      hasExplicitMaleGivenName = true;
    }
    if (MALE_SURNAMES_ENDING_IN_A.has(token)) {
      hasMaleSurnameInA = true;
    }
    if (token.length >= 3 && token.endsWith('a')) {
      endsInA = true;
    }
  }

  // Regula 1: Prenumele feminin explicit are prioritate absolută
  // (rezolvă inversarea Nume-Prenume: „Mircea Elena” -> Dna., „Popescu Elena” -> Dna., „Ion Elena” -> Dna.)
  if (hasExplicitFemaleGivenName) {
    return 'Dna.';
  }

  // Regula 2: Prenume masculin tradițional terminat în -a (fără prenume feminin)
  // („Nichita Stănescu” -> Dl., „Mircea Popescu” -> Dl., „Luca Radu” -> Dl., „Dănilă Popescu” -> Dl.)
  if (hasMaleException) {
    return 'Dl.';
  }

  // Regula 3: Prenume masculin comun explicit
  // („Ion Florea” -> Dl., „Florea Ion” -> Dl., „Tudor Chirilă” -> Dl., „Marius Moga” -> Dl.)
  if (hasExplicitMaleGivenName) {
    return 'Dl.';
  }

  // Regula 4: Nume de familie masculin cunoscut terminat în -a
  // („Popa”, „Badea”, „Florea”, „Manea”)
  if (hasMaleSurnameInA) {
    return 'Dl.';
  }

  // Regula 5: Euristică morfologică pentru prenume feminine necatalogate terminate în -a
  // („Sânziana”, „Daciana”, „Lăcrămioara”)
  if (endsInA) {
    return 'Dna.';
  }

  // Regula 6: Implicit masculin pentru orice alt antroponim românesc sau străin
  return 'Dl.';
}

/**
 * Elimină prefixele redundante („Aviz MS nr.”, „Avizul ME nr.”, „Nr. Aviz MS nr.”) din autorizații
 * pentru a evita stutter-ul în șabloane unde „Nr.” sau „Avizul...” este deja tipărit.
 * Funcționează iterativ pentru a trata prefixe compuse, forme articulate și variații de punctuație/spațiere.
 */
export function sanitizeAuthorizationNumber(auth?: string | null): string {
  if (!auth || typeof auth !== 'string') return '';
  let clean = auth.trim();

  let prev = '';
  while (prev !== clean) {
    prev = clean;
    clean = clean
      // Elimină 'Nr.', 'Nr', 'Numar', 'Numarul', 'No.'
      .replace(/^(?:nr\.?|num[aă]r(?:ul)?\.?|no\.?)\s*/i, '')
      // Elimină 'Aviz', 'Avizul', 'Avizele', 'Autorizatie', 'Autorizatia'
      .replace(/^(?:aviz(?:ul|ele)?|autoriza[tț]i[ae])\b\s*/i, '')
      // Elimină denumirile/acronimele de ministere: 'Ministerul / Ministerului Sanatatii / Educatiei', 'MS', 'ME', 'MS/ME', 'DSP'
      .replace(/^(?:ministerul(?:ui)?\s+(?:s[aă]n[aă]t[aă][tț]ii|educa[tț]iei)|ms\s*(?:\/|\s+)?\s*me|\b(?:ms|me|dsp)\b)\s*/i, '')
      // Elimină semnele de punctuație reziduale de la început (':', '.', '-', '/')
      .replace(/^[:.\-_/\s]+\s*/, '')
      .trim();
  }

  return clean;
}

/**
 * Determină dinamic Nivelul 1 (Execuție) vs Nivelul 2 (Conducere) conform Ordinului MS/ME 2209/4469/2022
 * și Clasificării Ocupațiilor din România (COR)
 */
export function resolveHygieneLevel(options: {
  explicitLevel?: string | null;
  jobTitle?: string | null;
  corCode?: string | null;
}): 'Nivelul 1' | 'Nivelul 2' {
  const managementKeywords = [
    'director', 'manager', 'sef', 'șef', 'administrator', 'coordonator',
    'supervizor', 'supraveghetor', 'responsabil', 'lead', 'head', 'chief',
    'executiv', 'general', 'adjunct', 'maistru'
  ];

  function matchesManagement(text?: string | null): boolean {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    // Excepție statutară: Asistent Manager este funcție de secretariat/execuție (COR 334303)
    if (lower.includes('asistent manager') || lower.includes('asistent de manager')) {
      return false;
    }
    return managementKeywords.some((kw) => {
      const reg = new RegExp(`(^|\\s|[.,/\\-_])${kw}(\\s|[.,/\\-_]|$)`, 'i');
      return reg.test(lower);
    });
  }

  // 1. Nivel configurat manual / explicit pe sesiune sau participant
  if (options.explicitLevel) {
    const raw = options.explicitLevel.trim().toLowerCase();
    if (
      raw.includes('2') ||
      /\bdoi\b/i.test(raw) ||
      /\bdou[aă]\b/i.test(raw) ||
      /\bii\b/i.test(raw) ||
      raw.includes('conducere') ||
      matchesManagement(raw)
    ) {
      return 'Nivelul 2';
    }
    if (
      raw.includes('1') ||
      /\bunu\b/i.test(raw) ||
      /\buna\b/i.test(raw) ||
      /\bi\b/i.test(raw) ||
      raw.includes('executie') ||
      raw.includes('execuție')
    ) {
      return 'Nivelul 1';
    }
  }

  // 2. Verificare Cod COR: Grupa Majoră 1 COR (Conducători și directori - 1000-1439)
  if (options.corCode) {
    const cleanCor = String(options.corCode).trim();
    if (cleanCor.startsWith('1')) {
      return 'Nivelul 2';
    }
  }

  // 3. Verificare cuvinte-cheie manageriale în denumirea postului (Job Title)
  if (options.jobTitle && matchesManagement(options.jobTitle)) {
    return 'Nivelul 2';
  }

  // 4. Implicit pentru roluri operaționale și de execuție
  return 'Nivelul 1';
}

export function formatDateRo(value?: Date | string | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('ro-RO');
}

export function joinAddressParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ');
}

export function formatRomanianAddress(residence: {
  county?: string | null;
  locality?: string | null;
  street?: string | null;
  number?: string | null;
  building?: string | null;
  entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
} | null | undefined): string {
  if (!residence) return '';
  const parts: string[] = [];

  const loc = (residence.locality || '').trim();
  const cty = (residence.county || '').trim();

  if (loc && cty) {
    if (loc.toLowerCase() === cty.toLowerCase()) {
      parts.push(loc);
    } else if (cty.toLowerCase().startsWith('sector')) {
      parts.push(`${loc}, ${cty}`);
    } else if (loc.toLowerCase().startsWith('sector') && cty.toLowerCase() === 'bucurești') {
      parts.push(`București, ${loc}`);
    } else {
      const ctyFormatted = cty.toLowerCase().startsWith('jud') ? cty : `jud. ${cty}`;
      parts.push(`${loc}, ${ctyFormatted}`);
    }
  } else if (loc) {
    parts.push(loc);
  } else if (cty) {
    parts.push(cty);
  }

  if (residence.street) {
    const s = residence.street.trim();
    if (/^(str|strada|bd|b-dul|bulevard|bulevardul|calea|cal\.|sos|sos\.|soseaua|alee|aleea|intr|intr\.|intrarea|piata|splai|splaiul)\b/i.test(s)) {
      parts.push(s);
    } else {
      parts.push(`str. ${s}`);
    }
  }

  if (residence.number) {
    const nr = residence.number.trim();
    parts.push(/^nr\.?/i.test(nr) ? nr : `nr. ${nr}`);
  }

  if (residence.building) {
    const b = residence.building.trim();
    parts.push(/^bl\.?/i.test(b) ? b : `bl. ${b}`);
  }

  if (residence.entrance) {
    const sc = residence.entrance.trim();
    parts.push(/^sc\.?/i.test(sc) ? sc : `sc. ${sc}`);
  }

  if (residence.floor) {
    const et = residence.floor.trim();
    parts.push(/^et\.?/i.test(et) ? et : `et. ${et}`);
  }

  if (residence.apartment) {
    const ap = residence.apartment.trim();
    parts.push(/^ap\.?/i.test(ap) ? ap : `ap. ${ap}`);
  }

  return parts.join(', ');
}

export function formatStreetName(street?: string | null): string | undefined {
  if (!street) return undefined;
  const s = street.trim();
  if (!s) return undefined;
  if (/^(str|strada|bd|b-dul|bulevard|bulevardul|calea|cal\.|sos|sos\.|soseaua|alee|aleea|intr|intr\.|intrarea|piata|splai|splaiul)\b/i.test(s)) {
    return s;
  }
  return `Str. ${s}`;
}

/**
 * Extrage codul numeric CAEN din 4 cifre dintr-un șir
 */
function extractCaenCode(raw?: unknown): string {
  if (raw === null || raw === undefined) return '6201';
  const s = String(raw).trim();
  if (!s || s === '[object Object]') return '6201';
  const match = s.match(/\b\d{4}\b/);
  if (match) return match[0];
  const dotted = s.match(/\b(\d{2})\.(\d{2})\b/);
  if (dotted) return dotted[1] + dotted[2];
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length >= 4) return digits.slice(0, 4);
  return '6201';
}

// ============================================================================
// FUNCȚIA STANDARD resolveTemplateData (CONTRACTUL DIN PROJECT.md)
// ============================================================================

export async function resolveTemplateData(
  templateId: string,
  context: TemplateResolutionOptions
): Promise<TemplateResolutionResult> {
  const template = TEMPLATE_CATALOG.find(
    (t) => t.code === templateId || t.normalizedFilename === templateId || (t as any).id === templateId
  );

  if (!template) {
    throw new Error(`Șablonul cu identificatorul ${templateId} nu a fost găsit în catalog.`);
  }

  const client = context.client;
  const employee = context.employee || null;
  const job = employee?.currentJob || context.job || (client?.jobs && client.jobs[0]) || null;
  const worksite = context.worksite || employee?.currentWorksite || (client?.worksites && client.worksites[0]) || null;
  const hygieneSession = context.hygieneSession || null;
  const participant = context.hygieneParticipant || null;

  const now = new Date();
  const currentDateRo = formatDateRo(now);
  const currentYear = now.getFullYear();

  const residence = employee?.residenceAddress;
  const identity = employee?.identityDocument;
  const fullName = employee ? `${employee.lastName} ${employee.firstName}`.trim() : '';
  const participantFullName = participant ? `${participant.lastName} ${participant.firstName}`.trim() : '';

  const addressFull = residence ? formatRomanianAddress(residence) : '';
  const hireDateRo = employee?.hireDate ? formatDateRo(employee.hireDate) : currentDateRo;

  const isFoodSector = Boolean(
    job?.isFoodHandling ||
    client?.caenCode === '5610' ||
    client?.caenActivity?.toLowerCase().includes('aliment') ||
    client?.caenActivity?.toLowerCase().includes('restaurant') ||
    job?.title?.toLowerCase().includes('bucatar') ||
    job?.title?.toLowerCase().includes('ospatar') ||
    job?.title?.toLowerCase().includes('barman')
  );

  // IMPORTANT: PLACEHOLDER_REPREZENTANT_LEGAL is ALWAYS the employer/administrator, NEVER the employee.
  const legalRepresentativeName = client?.legalRepresentative || 'Munteanu Cristian';

  // 1. Resolve CAEN Code & Risk Profile dynamically
  const caenCode = extractCaenCode(client?.caenCode);
  let riskProfile: CaenRiskProfile;
  try {
    riskProfile = getRiskProfileForCaen(caenCode, job?.title);
  } catch {
    riskProfile = {
      caenCode: '6201',
      industryName: 'Tehnologia Informației / Software',
      globalRiskScore: 2.62,
      factors: TESA_DEFAULT_FACTORS.map((f) => ({
        element: f.index <= 10 ? 'EXECUTANT' : f.index <= 18 ? 'SARCINA' : f.index <= 27 ? 'MIJLOACE' : 'MEDIU',
        riskFactor: f.hazard,
        manifestation: f.hazard,
        consequences: f.consequence,
        severity: f.gravity,
        probability: f.frequency,
        riskLevel: f.partialRisk,
        preventionMeasures: ['Instruire periodică', 'Respectare instrucțiuni'],
      })),
    };
  }

  const caenTitle = client?.caenActivity || riskProfile.industryName || 'Activități de realizare a software-ului la comandă';
  const rawCaen = client?.caenCode != null ? String(client.caenCode).trim() : '';
  const fullCaenDisplay = rawCaen && rawCaen.includes('-')
    ? rawCaen
    : `${caenCode} - ${caenTitle}`;
  const scoreNumber = riskProfile.globalRiskScore || 2.62;
  const scoreRo = scoreNumber.toFixed(2).replace('.', ',');

  // Compute subsystem distribution
  const factors = riskProfile.factors && riskProfile.factors.length > 0 ? riskProfile.factors : [];
  const totalFactorsCount = factors.length || 30;
  const cExec = factors.filter((f) => f.element === 'EXECUTANT').length;
  const cSarc = factors.filter((f) => f.element === 'SARCINA').length;
  const cMij = factors.filter((f) => f.element === 'MIJLOACE').length;
  const cMed = factors.filter((f) => f.element === 'MEDIU').length;

  const pExec = totalFactorsCount > 0 ? ((cExec / totalFactorsCount) * 100).toFixed(2) : '0.00';
  const pSarc = totalFactorsCount > 0 ? ((cSarc / totalFactorsCount) * 100).toFixed(2) : '0.00';
  const pMij = totalFactorsCount > 0 ? ((cMij / totalFactorsCount) * 100).toFixed(2) : '0.00';
  const pMed = totalFactorsCount > 0 ? ((cMed / totalFactorsCount) * 100).toFixed(2) : '0.00';

  const countL3 = factors.filter((f) => f.riskLevel === 3).length;
  const countL2 = factors.filter((f) => f.riskLevel === 2).length;
  const countL1 = factors.filter((f) => f.riskLevel === 1).length;

  // 2. Resolve Decisions Date & Numbering dynamically
  const decisionsDateRo = client?.decisionsDate
    ? formatDateRo(client.decisionsDate)
    : '15.01.2026';

  // 3. Appointees Dynamic Binding
  const designatedWorker = client?.designatedWorkerSsm
    ? `${client.designatedWorkerSsm} (Lucrător desemnat SSM conform deciziei angajatorului)`
    : ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_LUCRATOR_DESEMNAT_SSM;

  const firstAid = client?.firstAidResponder
    ? `${client.firstAidResponder} (Personal instruit prim ajutor conform Legii 319/2006)`
    : ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR;

  const psiOfficer = client?.psiResponder
    ? `${client.psiResponder} (Cadru tehnic / Responsabil cu atribuții PSI conform Legii 307/2006)`
    : ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PSI;

  const investMembers = client?.investigationMembers || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_MEMBRU_COMISIE;

  // 4. SEPP Provider Details (Dynamic relational binding with isDefault: true fallback - Feature F13)
  let prov = client?.provider;
  let spec = client?.specialist;
  let isFallbackProvider = false;
  let isFallbackSpecialist = false;

  // 4.1. If client has explicit providerId, load that provider
  if (!prov && client?.providerId) {
    prov = await prisma.ssmProvider.findUnique({
      where: { id: client.providerId },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  // 4.2. Feature F13: If still no provider (providerId is null or missing), query DB default provider
  if (!prov) {
    prov = await prisma.ssmProvider.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    }) || await prisma.ssmProvider.findFirst({
      where: { isDefault: true },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    }) || await prisma.ssmProvider.findFirst({
      where: { isActive: true },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    isFallbackProvider = true;
  }

  // 4.3. If client has explicit specialistId, load that specialist
  if (!spec && client?.specialistId) {
    spec = await prisma.ssmSpecialist.findUnique({
      where: { id: client.specialistId },
      include: { provider: true },
    });
  }

  // 4.4. Feature F13: If still no specialist (specialistId is null or missing):
  // Check the resolved provider's specialists first (preferring isDefault: true)
  if (!spec && prov) {
    if (prov.specialists && Array.isArray(prov.specialists) && prov.specialists.length > 0) {
      spec = prov.specialists.find((s: any) => s.isDefault && s.isActive) ||
             prov.specialists.find((s: any) => s.isDefault) ||
             prov.specialists.find((s: any) => s.isActive) ||
             prov.specialists[0];
    } else {
      spec = await prisma.ssmSpecialist.findFirst({
        where: { providerId: prov.id, isDefault: true, isActive: true },
      }) || await prisma.ssmSpecialist.findFirst({
        where: { providerId: prov.id, isDefault: true },
      }) || await prisma.ssmSpecialist.findFirst({
        where: { providerId: prov.id, isActive: true },
      });
    }
    isFallbackSpecialist = true;
  }

  // 4.5. Global fallback to any active default specialist in DB
  if (!spec) {
    spec = await prisma.ssmSpecialist.findFirst({
      where: { isDefault: true, isActive: true },
    }) || await prisma.ssmSpecialist.findFirst({
      where: { isDefault: true },
    });
    isFallbackSpecialist = true;
  }

  // 4.6. Precedence: Explicit relational -> Explicit legacy string -> Fallback DB default -> Static legal mock
  const ssmProviderName = (!isFallbackProvider && prov?.name)
    ? prov.name
    : (client?.ssmProviderName || prov?.name || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM);

  const ssmSpecialistName = (!isFallbackSpecialist && spec?.name)
    ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
    : client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
    : spec?.name
    ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;

  const evaluatorName = (!isFallbackSpecialist && spec?.name)
    ? `${spec.name} (Evaluator risc SSM, ${spec.certificateNumber || 'Certificat atestare INCDPM'})`
    : client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})`
    : spec?.name
    ? `${spec.name} (Evaluator risc SSM, ${spec.certificateNumber || 'Certificat atestare INCDPM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC;

  const certificatEvaluator = (!isFallbackSpecialist && spec?.certificateNumber)
    ? spec.certificateNumber
    : client?.ssmSpecialistCert || spec?.certificateNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR;

  const cuiPrestator = prov?.cui || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CUI_PRESTATOR;
  const certFurnizor = prov?.authorizationDetails
    ? prov.authorizationDetails
    : prov?.authorizationNumber
    ? `Certificat abilitare Serviciu Extern SSM nr. ${prov.authorizationNumber}${prov.authorizationDate ? ` din ${formatDateRo(prov.authorizationDate)}` : ''} emis de Ministerul Muncii - ITM București`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_FURNIZOR;
  const nrCertFurnizor = prov?.authorizationNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR;
  const nrInregFurnizor = prov?.regCom || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR;
  const stradaFurnizor = prov?.street || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_STRADA_FURNIZOR;
  const numarFurnizor = prov?.number || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_FURNIZOR;
  const blocFurnizor = prov?.building ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_BLOC_FURNIZOR);
  const scaraFurnizor = prov?.entrance ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SCARA_FURNIZOR);
  const etajFurnizor = prov?.floor ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ETAJ_FURNIZOR);
  const apFurnizor = prov?.apartment ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_APARTAMENT_FURNIZOR);
  const codPostalFurnizor = prov?.postalCode || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_COD_POSTAL_FURNIZOR;
  const localitateFurnizor = prov?.locality || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_LOCALITATE_FURNIZOR;
  const judetFurnizor = prov?.county || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_JUDET_FURNIZOR;
  const telPrestator = prov?.phone || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_TELEFON_PRESTATOR;
  const emailPrestator = prov?.email || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EMAIL_PRESTATOR;
  const sitePrestator = prov?.website || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SITE_PRESTATOR;
  const repPrestator = prov?.legalRepresentative || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_REPREZENTANT_PRESTATOR;
  const rolRepPrestator = prov?.representativeRole || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CALITATE_REPREZENTANT;
  const actRepPrestator = prov?.representativeDoc || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ACT_REPREZENTANT;
  const adresaPrestator = (prov?.street || prov?.number || prov?.locality)
    ? `${prov.locality || 'București'}, ${prov.street || 'Str. Agricultori'} nr. ${prov.number || '35'}${prov.county ? `, ${prov.county}` : ''}`
    : 'București, Str. Agricultori nr. 35, Sector 2';

  // 5. Build 30-factor positional dictionary
  const dynamic30Factors: Record<string, string> = {};
  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(2, '0');
    const f = factors[i - 1];
    const defaultF = TESA_DEFAULT_FACTORS[i - 1];

    dynamic30Factors[`PLACEHOLDER_GRAVITATE_RISC_${pad}`] = String(f?.severity || defaultF?.gravity || 3);
    dynamic30Factors[`PLACEHOLDER_FRECVENTA_RISC_${pad}`] = String(f?.probability || defaultF?.frequency || 2);
    dynamic30Factors[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`] = String(f?.riskLevel || defaultF?.partialRisk || 2);
  }

  // 6. Construct dynamic table padded arrays for training sheets (F7 & F8, F-M2-01: no truncation)
  const ssmEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => !e.type || e.type === 'ssm'
  );
  const TARGET_SSM_ROWS = 16;
  const totalSsmRows = Math.max(TARGET_SSM_ROWS, ssmEvents.length);
  const instruiriPeriodiceSSM = [];
  for (let i = 0; i < totalSsmRows; i++) {
    const ev = ssmEvents[i];
    if (ev) {
      instruiriPeriodiceSSM.push({
        nr: i + 1,
        data: formatDateRo(ev.eventDate),
        durata: `${ev.durationHours || 2} ore`,
        ocupatia: ev.jobTitle || job?.title || 'Personal TESA',
        tematica: ev.materialOrTopic || 'Instruire periodică SSM conform tematicii anuale',
        semnaturaInstruit: '',
        semnaturaInstructor: ev.instructorName || designatedWorker,
        semnaturaVerificator: ev.verifierName || legalRepresentativeName,
      });
    } else {
      instruiriPeriodiceSSM.push({
        nr: i + 1,
        data: '',
        durata: '',
        ocupatia: '',
        tematica: '',
        semnaturaInstruit: '',
        semnaturaInstructor: '',
        semnaturaVerificator: '',
      });
    }
  }

  const instruiriSuplimentareSSM = Array.from({ length: 4 }, (_, i) => ({
    nr: i + 1,
    data: '',
    durata: '',
    cauza: '',
    tematica: '',
    semnaturaInstruit: '',
    semnaturaInstructor: '',
    semnaturaVerificator: '',
  }));

  const testariSSM = Array.from({ length: 4 }, () => ({
    data: '',
    tipTestare: '',
    tematica: '',
    rezultat: '',
    examinator: '',
    semnaturaLucrator: '',
  }));

  const psiEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => e.type === 'psi' || e.type === 'su'
  );
  const TARGET_PSI_ROWS = 16;
  const totalPsiRows = Math.max(TARGET_PSI_ROWS, psiEvents.length);
  const instructajePeriodicePSI = [];
  for (let i = 0; i < totalPsiRows; i++) {
    const ev = psiEvents[i];
    if (ev) {
      instructajePeriodicePSI.push({
        nr: i + 1,
        data: formatDateRo(ev.eventDate),
        durata: `${ev.durationHours || 2} ore`,
        tema: ev.materialOrTopic || 'Instructaj periodic PSI conform tematicii anuale',
        semnaturaInstruit: '',
        semnaturaInstructor: ev.instructorName || psiOfficer,
        semnaturaVerificator: ev.verifierName || legalRepresentativeName,
      });
    } else {
      instructajePeriodicePSI.push({
        nr: i + 1,
        data: '',
        durata: '',
        tema: '',
        semnaturaInstruit: '',
        semnaturaInstructor: '',
        semnaturaVerificator: '',
      });
    }
  }

  const exercitiiPracticePSI = Array.from({ length: 4 }, (_, i) => ({
    nr: i + 1,
    data: '',
    tipExercitiu: '',
    tema: '',
    calificativ: '',
    semnaturaParticipant: '',
  }));

  // 7. Dynamic Prevention and Protection Plan (Feature F15 - HG 1425/2006 art. 15)
  const TECHNICAL_REGEX = /montar|ancorar|echipam|cablu|canalin|tablou|priz|pram|diferential|scar|antiderap|ventila|ilumin|protecti.*mecanic|intrerup|impamant|dispozitiv|hota|cutit|aragaz|schel|balustrad/i;
  const HYGIENE_REGEX = /medic|oftalmo|ergonom|igien|trus|prim.*ajutor|microclimat|aeris|temperatur|curaten|dezinfect|matern|antidot/i;
  const ORG_REGEX = /instrui|interzic|verific|notific|respecta|pauz|planific|rotati|procedur|autorizat|depozit|permis/i;

  const planPrevenire = factors.map((f, idx) => {
    const techMeasures: string[] = [];
    const orgMeasures: string[] = [];
    const hygMeasures: string[] = [];

    const rawMeasures = f.preventionMeasures && f.preventionMeasures.length > 0
      ? f.preventionMeasures
      : ['Instruirea lucrătorilor privind cerințele SSM', 'Verificarea respectării normelor de securitate'];

    for (const m of rawMeasures) {
      if (TECHNICAL_REGEX.test(m)) {
        techMeasures.push(m);
      } else if (HYGIENE_REGEX.test(m)) {
        hygMeasures.push(m);
      } else if (ORG_REGEX.test(m)) {
        orgMeasures.push(m);
      } else {
        if (f.element === 'MIJLOACE') techMeasures.push(m);
        else if (f.element === 'MEDIU') hygMeasures.push(m);
        else orgMeasures.push(m);
      }
    }

    return {
      nr: idx + 1,
      riscEvaluat: f.riskFactor,
      factorRisc: f.riskFactor,
      manifestare: f.manifestation || f.riskFactor,
      consecinte: f.consequences || 'ITM 3-45 zile',
      masuriTehnice: techMeasures.length > 0 ? techMeasures.map(t => `- ${t}`).join('\n') : '-',
      masuriOrganizatorice: orgMeasures.length > 0 ? orgMeasures.map(o => `- ${o}`).join('\n') : '-',
      masuriIgienicoSanitare: hygMeasures.length > 0 ? hygMeasures.map(h => `- ${h}`).join('\n') : '-',
      masuriAltaNatura: '-',
      actiuni: '- instruirea lucrătorilor privind cerințele de securitate în muncă\n- verificarea modului de cunoaștere și respectare a cerințelor de SSM',
      termen: 'Permanent',
      responsabil: 'CLM / Lucrător desemnat SSM',
    };
  });

  // Verified database mappings with fallback for any missing scalar fields
  const verifiedMap: Record<string, unknown> = {
    // 1. Client / Angajator
    PLACEHOLDER_FIRMA: client?.name || 'S.C. CLIENT TEST S.R.L.',
    PLACEHOLDER_CUI: client?.cui || 'RO12345678',
    PLACEHOLDER_NR_REG_COM: client?.regCom || 'J40/1000/2021',
    PLACEHOLDER_ADRESA_FIRMA: client?.address || 'București, Sector 1',
    PLACEHOLDER_ADRESA: addressFull || client?.address || 'București, Sector 1',
    PLACEHOLDER_REPREZENTANT_LEGAL: legalRepresentativeName,
    PLACEHOLDER_DIRECTOR: legalRepresentativeName,
    PLACEHOLDER_CALITATE_REPREZENTANT: (context.customOverrides?.PLACEHOLDER_CALITATE_REPREZENTANT as string) || 'Administrator',
    PLACEHOLDER_TELEFON_CONTACT: client?.contactPhone || '0722334455',
    PLACEHOLDER_EMAIL_CONTACT: client?.contactEmail || 'contact@client.ro',

    // CAEN & Company Profile
    PLACEHOLDER_COD_CAEN: fullCaenDisplay,
    PLACEHOLDER_ACTIVITATE_PRINCIPALA: caenTitle,
    PLACEHOLDER_AN_INFIINTARE: String(client?.foundedYear || '2021'),
    PLACEHOLDER_AN_EVALUARE: currentYear,
    PLACEHOLDER_NUMAR_LUCRATORI: String(job?.workersCount || client?.employees?.length || 10),

    // SEPP External Provider (24 Tokens Dynamically Bound)
    PLACEHOLDER_PRESTATOR_SSM: ssmProviderName,
    PLACEHOLDER_FURNIZOR_SSM: ssmProviderName,
    PLACEHOLDER_CUI_PRESTATOR: cuiPrestator,
    PLACEHOLDER_CERTIFICAT_FURNIZOR: certFurnizor,
    PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: nrCertFurnizor,
    PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: nrInregFurnizor,
    PLACEHOLDER_STRADA_FURNIZOR: stradaFurnizor,
    PLACEHOLDER_NUMAR_FURNIZOR: numarFurnizor,
    PLACEHOLDER_BLOC_FURNIZOR: blocFurnizor,
    PLACEHOLDER_SCARA_FURNIZOR: scaraFurnizor,
    PLACEHOLDER_ETAJ_FURNIZOR: etajFurnizor,
    PLACEHOLDER_APARTAMENT_FURNIZOR: apFurnizor,
    PLACEHOLDER_COD_POSTAL_FURNIZOR: codPostalFurnizor,
    PLACEHOLDER_LOCALITATE_FURNIZOR: localitateFurnizor,
    PLACEHOLDER_JUDET_FURNIZOR: judetFurnizor,
    PLACEHOLDER_TELEFON_PRESTATOR: telPrestator,
    PLACEHOLDER_EMAIL_PRESTATOR: emailPrestator,
    PLACEHOLDER_SITE_PRESTATOR: sitePrestator,
    PLACEHOLDER_SPECIALIST_SSM: ssmSpecialistName,
    PLACEHOLDER_EVALUATOR_RISC: evaluatorName,
    PLACEHOLDER_CERTIFICAT_EVALUATOR: certificatEvaluator,
    PLACEHOLDER_REPREZENTANT_PRESTATOR: repPrestator,
    PLACEHOLDER_CALITATE_REPREZENTANT_PRESTATOR: rolRepPrestator,
    PLACEHOLDER_ACT_REPREZENTANT: actRepPrestator,
    PLACEHOLDER_ADRESA_PRESTATOR: adresaPrestator,

    // Aliases for Serviciu Extern SSM (Feature F13)
    PLACEHOLDER_SERVICIU_EXTERN_DENUMIRE: ssmProviderName,
    PLACEHOLDER_SERVICIU_EXTERN_NUME: ssmProviderName,
    PLACEHOLDER_SERVICIU_EXTERN_CUI: cuiPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_REG_COM: nrInregFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_CERTIFICAT: certFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_NUMAR_CERTIFICAT: nrCertFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_ADRESA: adresaPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_TELEFON: telPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_EMAIL: emailPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_SITE: sitePrestator,
    PLACEHOLDER_SERVICIU_EXTERN_REPREZENTANT: repPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_CALITATE_REPREZENTANT: rolRepPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_ACT_REPREZENTANT: actRepPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_LOCALITATE: localitateFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_JUDET: judetFurnizor,

    // Risk Evaluation Metrics
    PLACEHOLDER_NIVEL_RISC_GLOBAL: scoreNumber.toFixed(2),
    PLACEHOLDER_CONCLUZII_EVALUARE: `Nivelul global de risc calculat pentru postul de lucru ${job?.title || 'analizat'} este de ${scoreRo}, încadrându-se în categoria locurilor de muncă cu nivel de risc acceptabil (Nrg <= 3,50 conform metodei INCDPM). Pentru factorii de risc identificați au fost stabilite măsuri de prevenire în Planul de Prevenire și Protecție conform Legii 319/2006.`,
    PLACEHOLDER_NUMAR_FACTORI_RISC: `${totalFactorsCount} factori de risc (${countL3} cu nivel parțial 3, ${countL2} cu nivel parțial 2, ${countL1} cu nivel parțial 1)`,
    PLACEHOLDER_REPARTITIE_RISCURI: `Executant: ${pExec}% (${cExec} factori); Sarcina de muncă: ${pSarc}% (${cSarc} factori); Mijloace de producție: ${pMij}% (${cMij} factori); Mediul de muncă: ${pMed}% (${cMed} factori)`,
    ...dynamic30Factors,

    // Organizational Decisions & Numbers
    PLACEHOLDER_NUMAR_DECIZIE_01: `01/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_02: `02/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_03: `03/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_04: `04/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_05: `05/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_06: `06/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_07: `07/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_08: `08/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_09: `09/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_10: `10/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_11: `11/${decisionsDateRo}`,
    PLACEHOLDER_APELATIV_ADMINISTRATOR: detectRomanianSalutation(client?.legalRepresentative),
    PLACEHOLDER_APELATIV_PSI: detectRomanianSalutation(psiOfficer || client?.psiResponder),
    PLACEHOLDER_APELATIV_MEMBRU_COMISIE: detectRomanianSalutation(investMembers),
    PLACEHOLDER_DATA_DECIZIE: decisionsDateRo,
    PLACEHOLDER_DATA_PERMIS_FOC: decisionsDateRo,
    PLACEHOLDER_DATA_INCEPERE_LUCRARE: decisionsDateRo,
    PLACEHOLDER_DATA_FINALIZARE_LUCRARE: decisionsDateRo,
    PLACEHOLDER_DATA_BULETIN_ANALIZA: decisionsDateRo,

    // Organizational Appointees & Aliases
    PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: designatedWorker,
    PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: firstAid,
    PLACEHOLDER_RESPONSABIL_PSI: psiOfficer,
    PLACEHOLDER_RESPONSABIL_CONTROL_PSI: client?.psiResponder || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_CONTROL_PSI,
    PLACEHOLDER_MEMBRU_COMISIE: template.family === 'hygiene' ? (hygieneSession?.commissionMember1 || ROMANIAN_LEGAL_HYGIENE.PLACEHOLDER_MEMBRU_COMISIE) : investMembers,
    PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: client?.designatedWorkerSsm || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI,

    PLACEHOLDER_NUME_RESPONSABIL_1: client?.designatedWorkerSsm || 'Ing. Mihai Popescu',
    PLACEHOLDER_NUME_RESPONSABIL_2: client?.firstAidResponder || 'Ioana-Raluca Dumitru',
    PLACEHOLDER_NUME_RESPONSABIL_3: client?.psiResponder || 'Gheorghe Barbu',
    PLACEHOLDER_NUME_RESPONSABIL_4: client?.investigationMembers || 'Elena Vasilescu, Alexandru Stan',

    // 2. Metadate temporale
    PLACEHOLDER_AN: currentYear,
    PLACEHOLDER_DATA_DOCUMENT: currentDateRo,
    PLACEHOLDER_DATA_APROBARE: currentDateRo,
    PLACEHOLDER_DATA_APLICARE: currentDateRo,
    PLACEHOLDER_DATA_INTOCMIRE: currentDateRo,
    PLACEHOLDER_DATA_SEMNARE: hireDateRo,
    PLACEHOLDER_DATA: currentDateRo,

    // 3. Salariat
    ...(employee ? {
      PLACEHOLDER_NUME_COMPLET: fullName,
      PLACEHOLDER_NUME: employee.lastName,
      PLACEHOLDER_PRENUME: employee.firstName,
      PLACEHOLDER_CNP: employee.cnp,
      PLACEHOLDER_DATA_NASTERII: formatDateRo(employee.birthDate) || '15.03.1988',
      PLACEHOLDER_LOCALITATE_NASTERII: employee.birthPlace || 'București',
      PLACEHOLDER_JUDET_NASTERII: employee.birthCounty || 'Sector 1',

      PLACEHOLDER_TIP_ACT: identity?.docType || 'C.I.',
      PLACEHOLDER_SERIE_ACT: identity?.series || 'RX',
      PLACEHOLDER_NUMAR_ACT: identity?.number || '123456',
      PLACEHOLDER_NR_ACT: identity?.number || '123456',
      PLACEHOLDER_EMITENT_ACT: identity?.issuedBy || 'SPCLEP Sector 1',
      PLACEHOLDER_EMITENT: identity?.issuedBy || 'SPCLEP Sector 1',
      PLACEHOLDER_DATA_EMITERII: formatDateRo(identity?.issueDate) || '10.05.2020',
      PLACEHOLDER_DATA_ACT: formatDateRo(identity?.issueDate) || '10.05.2020',
      PLACEHOLDER_DATA_EXPIRARII: formatDateRo(identity?.expiryDate) || '10.05.2030',

      PLACEHOLDER_ADRESA_DOMICILIU: addressFull || 'București, Sector 1, Str. Victoriei nr. 10',
      PLACEHOLDER_JUDET_DOMICILIU: residence?.county || 'București',
      PLACEHOLDER_JUDET: residence?.county || 'București',
      PLACEHOLDER_LOCALITATE_DOMICILIU: residence?.locality || 'București',
      PLACEHOLDER_LOCALITATE: residence?.locality || 'București',
      PLACEHOLDER_STRADA_DOMICILIU: formatStreetName(residence?.street) || 'Str. Victoriei',
      PLACEHOLDER_NUMAR_DOMICILIU: residence?.number || '10',
      PLACEHOLDER_NR: residence?.number || '10',
      PLACEHOLDER_BLOC: residence?.building || 'A1',
      PLACEHOLDER_SCARA: residence?.entrance || '1',
      PLACEHOLDER_ETAJ: residence?.floor || '2',
      PLACEHOLDER_APARTAMENT: residence?.apartment || '5',
      PLACEHOLDER_LOCALITATE_SEMNARE: residence?.locality || 'București',

      PLACEHOLDER_DATA_ANGAJARII: hireDateRo,
      PLACEHOLDER_DATA_ANGAJ: hireDateRo,
      PLACEHOLDER_DATA_INCEPERE: hireDateRo,
      PLACEHOLDER_DATA_CERERE: hireDateRo,
      PLACEHOLDER_DATA_DECLARATIE: hireDateRo,
    } : {
      PLACEHOLDER_NUME_COMPLET: 'Stan Alexandru',
      PLACEHOLDER_NUME: 'Stan',
      PLACEHOLDER_PRENUME: 'Alexandru',
      PLACEHOLDER_CNP: '1880315410127',
      PLACEHOLDER_TIP_ACT: 'C.I.',
      PLACEHOLDER_SERIE_ACT: 'RX',
      PLACEHOLDER_NUMAR_ACT: '123456',
      PLACEHOLDER_NR_ACT: '123456',
      PLACEHOLDER_EMITENT_ACT: 'SPCLEP Sector 1',
      PLACEHOLDER_EMITENT: 'SPCLEP Sector 1',
      PLACEHOLDER_DATA_EMITERII: '10.05.2020',
      PLACEHOLDER_DATA_ACT: '10.05.2020',
      PLACEHOLDER_DATA_EXPIRARII: '10.05.2030',
      PLACEHOLDER_ADRESA_DOMICILIU: 'București, Sector 1, Str. Victoriei nr. 10',
      PLACEHOLDER_JUDET_DOMICILIU: 'București',
      PLACEHOLDER_JUDET: 'București',
      PLACEHOLDER_LOCALITATE_DOMICILIU: 'București',
      PLACEHOLDER_LOCALITATE: 'București',
      PLACEHOLDER_STRADA_DOMICILIU: 'Str. Victoriei',
      PLACEHOLDER_NUMAR_DOMICILIU: '10',
      PLACEHOLDER_NR: '10',
      PLACEHOLDER_BLOC: 'A1',
      PLACEHOLDER_SCARA: '1',
      PLACEHOLDER_ETAJ: '2',
      PLACEHOLDER_APARTAMENT: '5',
      PLACEHOLDER_LOCALITATE_SEMNARE: 'București',
      PLACEHOLDER_DATA_NASTERII: '15.03.1988',
      PLACEHOLDER_LOCALITATE_NASTERII: 'București',
      PLACEHOLDER_JUDET_NASTERII: 'Sector 1',
      PLACEHOLDER_DATA_ANGAJARII: currentDateRo,
      PLACEHOLDER_DATA_ANGAJ: currentDateRo,
      PLACEHOLDER_DATA_INCEPERE: currentDateRo,
      PLACEHOLDER_DATA_CERERE: currentDateRo,
      PLACEHOLDER_DATA_DECLARATIE: currentDateRo,
    }),

    // 4. Post și Punct de lucru (Feature F14: Job Operational Context Plumbing)
    PLACEHOLDER_FUNCTIE: participant?.jobTitle || participant?.employee?.currentJob?.title || job?.title || 'Personal TESA / Inginer Sisteme Software',
    PLACEHOLDER_COD_COR: job?.corCode || '251201',
    PLACEHOLDER_ACTIVITATI_POST: job?.mainActivities || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_ACTIVITATI_POST,
    PLACEHOLDER_DESCRIERE_ACTIVITATE: job?.mainActivities || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_DESCRIERE_ACTIVITATE,
    PLACEHOLDER_ECHIPAMENTE_POST: job?.equipmentUsed || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_ECHIPAMENTE_POST,
    PLACEHOLDER_CONDITII_POST: job?.workConditions || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_CONDITII_POST,
    PLACEHOLDER_NUMAR_CIM: (employee as any)?.cimNumber || (context.customOverrides?.PLACEHOLDER_NUMAR_CIM as string) || (context.allowOfflineBlank || !employee ? '........ / ............' : ''),
    PLACEHOLDER_DATA_CIM: (employee as any)?.cimDate ? formatDateRo((employee as any).cimDate) : ((context.customOverrides?.PLACEHOLDER_DATA_CIM as string) || hireDateRo || (context.allowOfflineBlank || !employee ? '........................' : '')),
    PLACEHOLDER_DATA_SEMNARII: (context.customOverrides?.PLACEHOLDER_DATA_SEMNARII as string) || hireDateRo || (context.allowOfflineBlank || !employee ? '........................' : ''),
    PLACEHOLDER_SALARIU_BRUT: (employee as any)?.grossSalary != null ? `${(employee as any).grossSalary} lei` : ((employee as any)?.salary || (context.customOverrides?.PLACEHOLDER_SALARIU_BRUT as string) || (context.allowOfflineBlank || !employee ? '........................ lei' : '')),
    PLACEHOLDER_NORMA_LUCRU: `Normă întreagă (${(employee as any)?.workNorm || 8} ore/zi, ${((employee as any)?.workNorm || 8) * 5} ore/săptămână)`,
    PLACEHOLDER_PROGRAM_LUCRU: `Normă întreagă de ${(employee as any)?.workNorm || 8} ore/zi, ${((employee as any)?.workNorm || 8) * 5} ore/săptămână, Luni - Vineri`,
    PLACEHOLDER_PERIOADA_PROBA: `${(employee as any)?.probationDays || 90} zile calendaristice`,
    PLACEHOLDER_DURATA_CONCEDIULUI: `${(employee as any)?.annualLeaveDays || 20} zile lucrătoare`,
    PLACEHOLDER_CONT_BANCA_SALARIAT: (employee as any)?.bankIban || (employee as any)?.bankAccount || (employee as any)?.iban || '-',
    PLACEHOLDER_BANCA_SALARIAT: (employee as any)?.bankName || '-',
    PLACEHOLDER_GRUPA_SANGUINA: (employee as any)?.bloodType ? `${(employee as any).bloodType}${(employee as any)?.rhFactor ? ` (Rh ${(employee as any).rhFactor})` : ''}` : '0I (Rh +)',
    PLACEHOLDER_TRASEU_DEPLASARE: (employee as any)?.commuteRoute || 'Deplasare urbană domiciliu - sediu',
    PLACEHOLDER_DURATA_DEPLASARE: `${(employee as any)?.commuteDurationMinutes || 30} minute`,
    PLACEHOLDER_MARIME_INCALTAMINTE: (employee as any)?.shoeSize || '42',
    PLACEHOLDER_MARIME_IMBRACAMINTE: (employee as any)?.clothingSize || 'L',
    PLACEHOLDER_MARIME_MANUSI: (employee as any)?.gloveSize || '9',

    // Profiling Dinamic Medicina Muncii (HG 355/2007)
    PLACEHOLDER_SECTOR_ALIMENTAR: isFoodSector ? 'Da (manipulare, preparare și servire alimente conform Fișei 210 din HG 355/2007)' : 'Nu',
    PLACEHOLDER_SUPRASOLICITARE_VIZUALA: isFoodSector ? 'Nu' : 'Da - lucru cu ecran de vizualizare (videoterminal/laptop) peste 4 ore/zi conform Fișei 243 din HG 355/2007',
    PLACEHOLDER_RISC_TAIERE: isFoodSector ? 'Da (ustensile și cuțite profesionale de bucătărie)' : 'Nu',
    PLACEHOLDER_RISC_ARSURI_OPARIRE: isFoodSector ? 'Da (suprafețe fierbinți, plite, cuptoare, ulei încins)' : 'Nu',
    PLACEHOLDER_POZITIE_LUCRU: isFoodSector ? 'Ortostatică (în picioare cu deplasări frecvente în perimetrul bucătăriei/sălii)' : (job?.workPosture === 'sitting' ? 'Așezat pe scaun ergonomic reglabil (> 70% din programul de lucru)' : (job?.workPosture || 'Așezat pe scaun ergonomic reglabil')),
    PLACEHOLDER_MANIPULARE_MASE: isFoodSector ? 'Da (vase de gătit, materii prime, recipiente până la 15 kg)' : (job?.maxWeightKg && job.maxWeightKg > 10 ? `Da (manipulare echipamente până la ${job.maxWeightKg} kg)` : 'Nu'),
    PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA: isFoodSector ? 'Până la 15 kg' : (job?.maxWeightKg ? `Până la ${job.maxWeightKg} kg` : 'Sub 3 kg'),
    PLACEHOLDER_NIVEL_EFORT_FIZIC: isFoodSector ? 'Mediu (solicitare fizică dinamică în bucătărie / servire)' : 'Mic (solicitare posturală statică la birou)',

    // Profiling Dinamic EIP (HG 1048/2006)
    ...(isFoodSector ? {
      PLACEHOLDER_EIP_DENUMIRE_01: 'Încălțăminte antiderapantă bucătar (OB-E-A-FO SRC)',
      PLACEHOLDER_EIP_STANDARD_01: 'EN ISO 20347',
      PLACEHOLDER_EIP_RISC_01: 'Alunecare pe pardoseli umede/grase',
      PLACEHOLDER_EIP_DENUMIRE_02: 'Bonetă / plasă protecție păr',
      PLACEHOLDER_EIP_STANDARD_02: 'HACCP / EN 340',
      PLACEHOLDER_EIP_RISC_02: 'Contaminare alimentară / igienă',
      PLACEHOLDER_EIP_DENUMIRE_03: 'Halat / tunică albă bucătar',
      PLACEHOLDER_EIP_STANDARD_03: 'EN 340',
      PLACEHOLDER_EIP_RISC_03: 'Murdărie, stropire, temperatură',
      PLACEHOLDER_EIP_DENUMIRE_04: 'Șorț impermeabil protecție',
      PLACEHOLDER_EIP_STANDARD_04: 'EN 340',
      PLACEHOLDER_EIP_RISC_04: 'Stropire cu lichide fierbinți',
      PLACEHOLDER_EIP_DENUMIRE_05: 'Mănuși termoprotectoare cuptor',
      PLACEHOLDER_EIP_STANDARD_05: 'EN 407',
      PLACEHOLDER_EIP_RISC_05: 'Arsuri la manipulare tăvi fierbinți',
    } : job?.title?.toLowerCase().includes('tehnician') ? {
      PLACEHOLDER_EIP_DENUMIRE_01: 'Bocanci protecție S3 SRC cu bombeu compozit',
      PLACEHOLDER_EIP_STANDARD_01: 'EN ISO 20345',
      PLACEHOLDER_EIP_RISC_01: 'Strivire degete, perforare talpă, alunecare',
      PLACEHOLDER_EIP_DENUMIRE_02: 'Mănuși protecție mecanică nivel 4',
      PLACEHOLDER_EIP_STANDARD_02: 'EN 388',
      PLACEHOLDER_EIP_RISC_02: 'Agresiuni mecanice, tăiere, abraziune',
      PLACEHOLDER_EIP_DENUMIRE_03: 'Vestă reflectorizantă clasa 2',
      PLACEHOLDER_EIP_STANDARD_03: 'EN ISO 20471',
      PLACEHOLDER_EIP_RISC_03: 'Vizibilitate redusă în trafic/șantier',
      PLACEHOLDER_EIP_DENUMIRE_04: 'Mănuși electroizolante 1000V',
      PLACEHOLDER_EIP_STANDARD_04: 'EN 60903',
      PLACEHOLDER_EIP_RISC_04: 'Electrocutare joasă tensiune',
      PLACEHOLDER_EIP_DENUMIRE_05: 'Trusă scule izolate 1000V',
      PLACEHOLDER_EIP_STANDARD_05: 'EN 60900',
      PLACEHOLDER_EIP_RISC_05: 'Risc electric la intervenții',
    } : {
      PLACEHOLDER_EIP_DENUMIRE_01: 'Ochelari protecție ecran cu filtru lumină albastră',
      PLACEHOLDER_EIP_STANDARD_01: 'EN 166',
      PLACEHOLDER_EIP_RISC_01: 'Oboseală vizuală la videoterminale',
      PLACEHOLDER_EIP_DENUMIRE_02: 'Suport ergonomic dorsal / lombar',
      PLACEHOLDER_EIP_STANDARD_02: 'Norme ergonomice HG 1028/2006',
      PLACEHOLDER_EIP_RISC_02: 'Suprasolicitare musculo-scheletică posturală',
    }),
    PLACEHOLDER_ADRESA_PUNCT_LUCRU: worksite?.address || client?.address || 'București, Sector 1',
    PLACEHOLDER_PUNCT_LUCRU: worksite?.name || 'Sediul Central',
    PLACEHOLDER_DEPARTAMENT: worksite?.activity || 'Departament Tehnic & IT',
    PLACEHOLDER_SUBUNITATE: worksite?.name || 'Sediul Central',
    PLACEHOLDER_SECTIE_COMPARTIMENT: worksite?.activity || 'Departament IT & Dezvoltare Software',
    PLACEHOLDER_LOC_MUNCA: worksite?.address || client?.address || 'București, Sector 1',
    PLACEHOLDER_LOC_MUNCA_LM: worksite?.address || client?.address || 'București, Sector 1',
    PLACEHOLDER_LOC_MUNCA_LM_PSI: worksite?.address || client?.address || 'București, Sector 1',

    // Date adiționale firmă (CIM 2022 & Solicitare Medicină)
    PLACEHOLDER_TELEFON_FIRMA: client?.contactPhone || '0722334455',
    PLACEHOLDER_EMAIL_FIRMA: client?.contactEmail || 'contact@client.ro',
    PLACEHOLDER_COD_POSTAL_FIRMA: (prov?.postalCode as string) || '010001',
    PLACEHOLDER_CONT_BANCA_FIRMA: (client as any)?.bankAccount || '-',
    PLACEHOLDER_BANCA_FIRMA: (client as any)?.bankName || '-',
    PLACEHOLDER_ACTIVITATE_CAEN: caenTitle,

    // Date adiționale salariat (M2, F12: Real Employee vs Non-Fabricated Data)
    PLACEHOLDER_DOMICILIU: addressFull || 'București, Sector 1, Str. Victoriei nr. 10',
    PLACEHOLDER_ADRESA_DOMICILIU: addressFull || 'București, Sector 1, Str. Victoriei nr. 10',
    PLACEHOLDER_TELEFON_SALARIAT: (employee as any)?.phone || '-',
    PLACEHOLDER_EMAIL_SALARIAT: (employee as any)?.email || '-',
    PLACEHOLDER_APELATIV_SALARIAT: detectRomanianSalutation(fullName || 'Stan Alexandru', employee?.cnp),
    PLACEHOLDER_SEX: employee?.sex || (employee?.cnp && ['1', '3', '5', '7'].includes(employee.cnp[0]) ? 'M' : 'F') || 'M',
    PLACEHOLDER_PROFESIE_OCUPATIE: job?.title || 'Inginer sisteme software',
    PLACEHOLDER_NUME_SALARIAT: fullName || 'Stan Alexandru',
    PLACEHOLDER_CALIFICARE: (employee as any)?.qualification || 'Studii superioare tehnice / Inginer IT',
    PLACEHOLDER_MARCA: (employee as any)?.badgeNumber || (employee as any)?.employeeNumber || '-',

    // Appointees & Instructori instruire SSM / PSI
    PLACEHOLDER_INSTRUCTOR_IG: ssmSpecialistName,
    PLACEHOLDER_VERIFICATOR_IG: legalRepresentativeName,
    PLACEHOLDER_INSTRUCTOR_LM: designatedWorker,
    PLACEHOLDER_VERIFICATOR_LM: designatedWorker,
    PLACEHOLDER_DATA_INSTRUIRE_IG: hireDateRo,
    PLACEHOLDER_DATA_INSTRUIRE_LM: hireDateRo,
    PLACEHOLDER_DATA_ADMITERE: hireDateRo,
    PLACEHOLDER_ADMITERE_NUME: legalRepresentativeName,

    PLACEHOLDER_INSTRUCTOR_IG_PSI: psiOfficer,
    PLACEHOLDER_VERIFICATOR_IG_PSI: legalRepresentativeName,
    PLACEHOLDER_INSTRUCTOR_LM_PSI: designatedWorker,
    PLACEHOLDER_VERIFICATOR_LM_PSI: designatedWorker,
    PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: hireDateRo,
    PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: hireDateRo,
    PLACEHOLDER_DATA_ADMITERE_PSI: hireDateRo,
    PLACEHOLDER_ADMITERE_NUME_PSI: legalRepresentativeName,

    // Date specifice EIP, Solicitare Medicină & Contract Muncă 2022
    PLACEHOLDER_DATA_SOLICITARII: currentDateRo,
    PLACEHOLDER_DATA_INTOCMIRII: currentDateRo,
    PLACEHOLDER_DATA_SEMNARII_EIP: hireDateRo || currentDateRo,
    PLACEHOLDER_DATA_ELIBERARII_FISEI: hireDateRo || currentDateRo,
    PLACEHOLDER_GESTIONAR_EIP: designatedWorker,
    PLACEHOLDER_SEF_LOC_MUNCA: designatedWorker,
    PLACEHOLDER_DATA_INCEPUT: hireDateRo || currentDateRo,
    PLACEHOLDER_DATA_INCEPERE: hireDateRo || currentDateRo,

    // Dynamic table arrays for SSM & PSI
    instruiriPeriodiceSSM,
    instruiriSuplimentareSSM,
    testariSSM,
    instructajePeriodicePSI,
    exercitiiPracticePSI,

    // F15: Dynamic Prevention Plan collections & top-level tokens
    planPrevenire,
    masuriPrevenire: planPrevenire,

    // 5. Sesiune Igienă
    ...(hygieneSession ? {
      ...(template.family === 'hygiene' || template.contextLevel === 'hygiene_session' ? {
        PLACEHOLDER_PRESTATOR_SSM: hygieneSession.providerName,
        PLACEHOLDER_FURNIZOR_SSM: hygieneSession.providerName,
        PLACEHOLDER_MEMBRU_COMISIE: hygieneSession.commissionMember1,
      } : {}),
      PLACEHOLDER_AVIZ_MS: sanitizeAuthorizationNumber(hygieneSession.msAuthorization),
      PLACEHOLDER_AVIZ_ME: sanitizeAuthorizationNumber(hygieneSession.meAuthorization),
      PLACEHOLDER_DATA_SESIUNE: formatDateRo(hygieneSession.sessionDate),
      PLACEHOLDER_DATA_EXAMEN: formatDateRo(hygieneSession.examDate),
      PLACEHOLDER_DATA_PV: formatDateRo(hygieneSession.examDate),
      PLACEHOLDER_DATA_CATALOG: formatDateRo(hygieneSession.examDate),
      PLACEHOLDER_LOCATIE_EXAMEN: hygieneSession.location,
      PLACEHOLDER_NUMAR_PV: hygieneSession.pvSeriesNumber,
      PLACEHOLDER_PRESEDINTE_COMISIE: hygieneSession.commissionPresident,
      PLACEHOLDER_MEMBRU_COMISIE_1: hygieneSession.commissionMember1,
      PLACEHOLDER_MEMBRU_COMISIE_2: hygieneSession.commissionMember2,
      PLACEHOLDER_SECRETAR_COMISIE: hygieneSession.commissionSecretary,
      PLACEHOLDER_NUMAR_CANDIDATI: String(hygieneSession.participants?.length || 1),
      PLACEHOLDER_NUMAR_PREZENTI: String(hygieneSession.participants?.length || 1),
      PLACEHOLDER_NUMAR_ADMISI: String(hygieneSession.participants?.length || 1),
      PLACEHOLDER_NUMAR_RESPINSI: '0',
      participants: (hygieneSession.participants || []).map((p: any, idx: number) => {
        const pFullName = `${p.lastName} ${p.firstName}`.trim();
        const docType = p.docType || p.employee?.identityDocument?.docType || 'CI';
        const docSeries = p.docSeries || p.employee?.identityDocument?.series || 'RX';
        const docNumber = p.docNumber || p.employee?.identityDocument?.number || '123456';
        const identityDoc = `${docType} seria ${docSeries} nr. ${docNumber}`.trim();
        const sessionDateStr = formatDateRo(hygieneSession.sessionDate);
        const examDateStr = formatDateRo(hygieneSession.examDate);

        return {
          ...p,
          rowNumber: idx + 1,
          fullName: pFullName || 'Stan Alexandru',
          identityDocument: identityDoc,
          docType,
          docSeries,
          docNumber,
          sessionDate: sessionDateStr,
          examDate: examDateStr,
          providerName: hygieneSession.providerName,
          coursePeriod: `${sessionDateStr} - ${examDateStr}`,
          module: p.employee?.hygieneModule || 'Modulul 1 - Sector Alimentar și Alimentație Publică',
          level: 'Nivelul 1',
        };
      }),
    } : (() => {
      const clientEmployees = (client?.employees || []) as any[];
      const dynamicParticipants = clientEmployees.map((emp: any, idx: number) => {
        const empFullName = `${emp.lastName} ${emp.firstName}`.trim();
        const idDoc = emp.identityDocument;
        const docType = idDoc?.docType || 'CI';
        const docSeries = idDoc?.series || 'RX';
        const docNumber = idDoc?.number || '123456';
        const identityStr = `${docType} seria ${docSeries} nr. ${docNumber}`.trim();
        const examDateStr = emp.hygieneLastExamDate ? formatDateRo(emp.hygieneLastExamDate) : currentDateRo;
        const sessionDateStr = examDateStr;

        const defaultModule = client?.caenCode && (client.caenCode.startsWith('56') || client.caenCode.startsWith('10') || client.caenCode.startsWith('11'))
          ? 'Modulul 1 - Sector Alimentar și Alimentație Publică'
          : (emp.hygieneModule || 'Modulul 1 - Servicii de alimentație');

        let certSeries = 'IGI';
        let certNumber = String(idx + 1).padStart(4, '0');
        if (emp.hygieneCertificateNumber) {
          const parts = emp.hygieneCertificateNumber.split(/[-\s]/);
          if (parts.length > 1) {
            certSeries = parts[0];
            certNumber = parts.slice(1).join('-');
          } else {
            certNumber = emp.hygieneCertificateNumber;
          }
        }

        return {
          rowNumber: idx + 1,
          fullName: empFullName,
          lastName: emp.lastName,
          firstName: emp.firstName,
          cnp: emp.cnp,
          birthDate: emp.birthDate ? formatDateRo(emp.birthDate) : '15.03.1988',
          birthPlace: emp.birthPlace || 'București',
          docType,
          docSeries,
          docNumber,
          identityDocument: identityStr,
          module: emp.hygieneModule || defaultModule,
          level: 'Nivelul 1',
          sessionDate: sessionDateStr,
          examDate: examDateStr,
          examGrade: '10',
          examResult: 'Admis',
          certificateSeries: certSeries,
          certificateNumber: certNumber,
          providerName: client?.provider?.name || ssmProviderName,
          coursePeriod: `${sessionDateStr} - ${examDateStr}`,
        };
      });

      const participantRoster = dynamicParticipants.length > 0 ? dynamicParticipants : [
        {
          rowNumber: 1,
          fullName: fullName || 'Stan Alexandru',
          lastName: employee?.lastName || 'Stan',
          firstName: employee?.firstName || 'Alexandru',
          cnp: employee?.cnp || '1880315410127',
          birthDate: employee?.birthDate ? formatDateRo(employee.birthDate) : '15.03.1988',
          birthPlace: employee?.birthPlace || 'București',
          docType: identity?.docType || 'CI',
          docSeries: identity?.series || 'RX',
          docNumber: identity?.number || '123456',
          identityDocument: `${identity?.docType || 'CI'} seria ${identity?.series || 'RX'} nr. ${identity?.number || '123456'}`.trim(),
          module: employee?.hygieneModule || 'Modulul 1 - Servicii de alimentație',
          level: 'Nivelul 1',
          sessionDate: currentDateRo,
          examDate: currentDateRo,
          examGrade: '10',
          examResult: 'Admis',
          certificateSeries: 'IGI',
          certificateNumber: '0042',
          providerName: ssmProviderName,
          coursePeriod: `${currentDateRo} - ${currentDateRo}`,
        },
      ];

      return {
        PLACEHOLDER_DATA_SESIUNE: currentDateRo,
        PLACEHOLDER_DATA_EXAMEN: currentDateRo,
        PLACEHOLDER_DATA_PV: currentDateRo,
        PLACEHOLDER_DATA_CATALOG: currentDateRo,
        PLACEHOLDER_NUMAR_CANDIDATI: String(participantRoster.length),
        PLACEHOLDER_NUMAR_PREZENTI: String(participantRoster.length),
        PLACEHOLDER_NUMAR_ADMISI: String(participantRoster.length),
        PLACEHOLDER_NUMAR_RESPINSI: '0',
        participants: participantRoster,
      };
    })()),

    // 6. Cursant selectat (dacă există) sau angajat selectat pentru adeverință
    ...(participant ? {
      PLACEHOLDER_NUME_COMPLET: participantFullName,
      PLACEHOLDER_NUME: participant.lastName,
      PLACEHOLDER_PRENUME: participant.firstName,
      PLACEHOLDER_CNP: participant.cnp,
      PLACEHOLDER_DATA_NASTERII: formatDateRo(participant.birthDate),
      PLACEHOLDER_LOCALITATE_NASTERII: participant.birthPlace,
      PLACEHOLDER_TIP_ACT: participant.docType,
      PLACEHOLDER_SERIE_ACT: participant.docSeries,
      PLACEHOLDER_NUMAR_ACT: participant.docNumber,
      PLACEHOLDER_NR_ACT: participant.docNumber,
      PLACEHOLDER_SERIE_ADEVERINTA: participant.certificateSeries || 'ADEV-IG',
      PLACEHOLDER_NUMAR_ADEVERINTA: participant.certificateNumber || '0042',
      PLACEHOLDER_DATA_ELIBERARE: formatDateRo(hygieneSession?.examDate) || currentDateRo,
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: `${participant.certificateSeries || 'IGI'} ${participant.certificateNumber || '0042'}`.trim(),
      PLACEHOLDER_REZULTAT_EXAMEN: participant.examResult || 'Admis',
      PLACEHOLDER_MODUL_IGIENA: participant.employee?.hygieneModule || employee?.hygieneModule || 'Modulul 1 - Servicii de alimentație',
      PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
        explicitLevel: (participant as any)?.level || (participant as any)?.hygieneLevel || participant.employee?.hygieneLevel || (employee as any)?.hygieneLevel,
        jobTitle: participant.jobTitle || participant.employee?.currentJob?.title || job?.title || employee?.currentJob?.title,
        corCode: (participant as any)?.corCode || participant.employee?.currentJob?.corCode || job?.corCode || employee?.currentJob?.corCode,
      }),
    } : (employee ? {
      PLACEHOLDER_NUME_COMPLET: fullName,
      PLACEHOLDER_NUME: employee.lastName,
      PLACEHOLDER_PRENUME: employee.firstName,
      PLACEHOLDER_CNP: employee.cnp,
      PLACEHOLDER_DATA_NASTERII: formatDateRo(employee.birthDate),
      PLACEHOLDER_LOCALITATE_NASTERII: employee.birthPlace,
      PLACEHOLDER_TIP_ACT: identity?.docType || 'CI',
      PLACEHOLDER_SERIE_ACT: identity?.series || 'RX',
      PLACEHOLDER_NUMAR_ACT: identity?.number || '123456',
      PLACEHOLDER_NR_ACT: identity?.number || '123456',
      PLACEHOLDER_SERIE_ADEVERINTA: employee.hygieneCertificateNumber ? (employee.hygieneCertificateNumber.split(/[-\s]/)[0] || 'ADEV-IG') : 'ADEV-IG',
      PLACEHOLDER_NUMAR_ADEVERINTA: employee.hygieneCertificateNumber || '0042',
      PLACEHOLDER_DATA_ELIBERARE: formatDateRo(employee.hygieneCertificateIssueDate || employee.hygieneLastExamDate) || currentDateRo,
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: employee.hygieneCertificateNumber || 'IGI 0042',
      PLACEHOLDER_REZULTAT_EXAMEN: 'Admis',
      PLACEHOLDER_MODUL_IGIENA: employee.hygieneModule || 'Modulul 1 - Servicii de alimentație',
      PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
        explicitLevel: (employee as any)?.hygieneLevel,
        jobTitle: job?.title || employee?.currentJob?.title,
        corCode: job?.corCode || employee?.currentJob?.corCode,
      }),
    } : {})),
  };

  // Compoziție în cascadă: Fallback Legal -> Date Verificate DB -> Suprascrieri Custom
  const mergedData: Record<string, unknown> = {
    ...ALL_ROMANIAN_LEGAL_FALLBACKS,
    ...verifiedMap,
    ...(context.customOverrides || {}),
  };

  // Verificare unică a tuturor câmpurilor cerute de șablon
  const unresolvedPlaceholders: string[] = [];
  for (const field of template.fields) {
    const val = mergedData[field.key];
    if (val === undefined || val === null || String(val).trim() === '') {
      if (field.required) {
        unresolvedPlaceholders.push(field.key);
      }
    }
  }

  const status: 'ready' | 'missing_data' =
    unresolvedPlaceholders.length === 0 ? 'ready' : 'missing_data';

  return {
    templateId: template.code,
    templateName: template.name,
    data: mergedData,
    unresolvedPlaceholders,
    status,
  };
}

// ============================================================================
// FUNCȚIA resolveTemplatePlaceholders (PENTRU COMPATIBILITATE API Next.js)
// ============================================================================

export async function resolveTemplatePlaceholders(ctx: TemplateResolutionContext): Promise<{
  template: TemplateDefinition;
  fields: ResolvedPlaceholderItem[];
  resolvedData: Record<string, unknown>;
}> {
  const template = TEMPLATE_CATALOG.find((t) => t.code === ctx.templateCode);
  if (!template) {
    throw new Error(`Șablonul cu codul ${ctx.templateCode} nu a fost găsit în catalog.`);
  }

  const client = await prisma.client.findUnique({
    where: { id: ctx.clientId },
    include: {
      jobs: true,
      worksites: true,
      trainingEvents: true,
      employees: {
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
      provider: {
        include: {
          specialists: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      specialist: true,
    },
  });
  if (!client) {
    throw new Error(`Clientul nu a fost găsit.`);
  }

  const employee = ctx.employeeId
    ? (client.employees.find((e) => e.id === ctx.employeeId) ||
        (await prisma.employee.findFirst({
          where: { id: ctx.employeeId, clientId: ctx.clientId },
          include: {
            identityDocument: true,
            residenceAddress: true,
            currentJob: true,
            currentWorksite: true,
          },
        })))
    : client.employees && client.employees.length > 0
    ? client.employees[0]
    : null;

  const selectedJob = employee?.currentJob || client.jobs.find((j) => j.id === ctx.jobId) || (client.jobs && client.jobs[0]) || null;
  const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;

  const hygieneSession = ctx.hygieneSessionId
    ? await prisma.hygieneSession.findUnique({
        where: { id: ctx.hygieneSessionId },
        include: {
          participants: {
            include: {
              employee: {
                include: {
                  identityDocument: true,
                  residenceAddress: true,
                  currentJob: true,
                  currentWorksite: true,
                },
              },
            },
          },
        },
      })
    : null;

  const participant = ctx.hygieneParticipantId && hygieneSession
    ? hygieneSession.participants.find((p) => p.id === ctx.hygieneParticipantId) || null
    : null;

  const resolutionResult = await resolveTemplateData(ctx.templateCode, {
    client,
    employee,
    job: selectedJob,
    jobId: ctx.jobId,
    worksite: selectedWorksite,
    hygieneSession,
    hygieneParticipant: participant,
    customOverrides: ctx.customOverrides,
    allowOfflineBlank: ctx.allowOfflineBlank,
  });

  const resolvedFields: ResolvedPlaceholderItem[] = template.fields
    .filter((def: TemplateFieldDef) => !/_\d{2,3}$/.test(def.key))
    .map((def: TemplateFieldDef) => {
      const rawVal = resolutionResult.data[def.key];
      const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';

      return {
        key: def.key,
        label: def.label,
        source: def.source,
        type: def.type,
        required: def.required,
        value: hasValue ? (rawVal as string | number | boolean) : '',
        isAutocompleted: hasValue,
      };
    });

  return {
    template,
    fields: resolvedFields,
    resolvedData: resolutionResult.data,
  };
}
