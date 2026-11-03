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
  PLACEHOLDER_NUMAR_DECIZIE_11: '11/15.01.2026',
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
  PLACEHOLDER_AVIZ_MS: 'Aviz MS nr. 1225/2023 din 15.03.2023 emis de Ministerul Sănătății - DSP București',
  PLACEHOLDER_AVIZ_ME: 'Aviz ME nr. 8941/2023 din 22.03.2023 emis de Ministerul Educației',
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
 * Clauze Contractuale HR conform Codului Muncii 2026 (Legea 53/2003)
 */
export const ROMANIAN_LEGAL_HR_CIM = {
  PLACEHOLDER_NUMAR_CIM: 'CIM-2026-0042',
  PLACEHOLDER_DATA_SFARSIT: '- (nedeterminată)',
  PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: 'Nedeterminată conform art. 12 alin. (1) din Legea nr. 53/2003 - Codul Muncii',
  PLACEHOLDER_PERMIS_MUNCA: 'Nu este cazul (cetățean român)',
  PLACEHOLDER_ORE_PE_ZI: '8',
  PLACEHOLDER_PROGRAM_LUCRU: 'Normă întreagă de 8 ore/zi, 40 ore/săptămână, Luni - Vineri între 08:30 - 17:00',
  PLACEHOLDER_SALARIU_BRUT: '6500 lei',
  PLACEHOLDER_DATA_PLATA: 'data de 15 a fiecărei luni pentru luna precedentă',
  PLACEHOLDER_ALTE_DREPTURI_SALARIALE: 'Tichete de masă conform Legii 165/2018, servicii medicale private',
  PLACEHOLDER_ZILE_CONCEDIU: '21 de zile lucrătoare',
  PLACEHOLDER_ZILE_PROBA: '90 de zile calendaristice conform art. 31 alin. (1) din Legea 53/2003',
  PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE: '20 de zile lucrătoare conform art. 81 alin. (4) din Legea 53/2003',
  PLACEHOLDER_CASA_SANATATE: 'C.A.S. Municipiul București',
  PLACEHOLDER_TIP_PENSIE: 'Nu este cazul (nu beneficiază de pensie)',
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
  ...ROMANIAN_LEGAL_HYGIENE,
  ...ROMANIAN_LEGAL_RISK,
  ...INCDPM_30_FACTORS,
  ...ROMANIAN_LEGAL_HR_CIM,
};

// ============================================================================
// FUNCȚII UTILITARE DE FORMATARE
// ============================================================================

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
  context: {
    client: any;
    employee?: any;
    worksite?: any;
    job?: any;
    hygieneSession?: any;
    hygieneParticipant?: any;
    customOverrides?: Record<string, unknown>;
  }
): Promise<TemplateResolutionResult> {
  const template = TEMPLATE_CATALOG.find(
    (t) => t.code === templateId || t.normalizedFilename === templateId || (t as any).id === templateId
  );

  if (!template) {
    throw new Error(`Șablonul cu identificatorul ${templateId} nu a fost găsit în catalog.`);
  }

  const client = context.client;
  const employee = context.employee || null;
  const job = context.job || employee?.currentJob || (client?.jobs && client.jobs[0]) || null;
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

  // 4. SEPP Provider Details
  const ssmProviderName = client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM;
  const ssmSpecialistName = client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;
  const evaluatorName = client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC;

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

    // SEPP External Provider
    PLACEHOLDER_PRESTATOR_SSM: ssmProviderName,
    PLACEHOLDER_FURNIZOR_SSM: ssmProviderName,
    PLACEHOLDER_SPECIALIST_SSM: ssmSpecialistName,
    PLACEHOLDER_EVALUATOR_RISC: evaluatorName,
    PLACEHOLDER_CERTIFICAT_EVALUATOR: client?.ssmSpecialistCert || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR,

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
    PLACEHOLDER_NUMAR_DECIZIE_11: `11/${decisionsDateRo}`,
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

    // 4. Post și Punct de lucru
    PLACEHOLDER_FUNCTIE: job?.title || 'Personal TESA / Inginer Sisteme Software',
    PLACEHOLDER_COD_COR: job?.corCode || '251201',
    PLACEHOLDER_ADRESA_PUNCT_LUCRU: worksite?.address || client?.address || 'București, Sector 1',
    PLACEHOLDER_PUNCT_LUCRU: worksite?.name || 'Sediul Central',
    PLACEHOLDER_DEPARTAMENT: worksite?.activity || 'Departament Tehnic & IT',

    // 5. Sesiune Igienă
    ...(hygieneSession ? {
      ...(template.family === 'hygiene' || template.contextLevel === 'hygiene_session' ? {
        PLACEHOLDER_PRESTATOR_SSM: hygieneSession.providerName,
        PLACEHOLDER_FURNIZOR_SSM: hygieneSession.providerName,
        PLACEHOLDER_MEMBRU_COMISIE: hygieneSession.commissionMember1,
      } : {}),
      PLACEHOLDER_AVIZ_MS: hygieneSession.msAuthorization,
      PLACEHOLDER_AVIZ_ME: hygieneSession.meAuthorization,
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
      participants: hygieneSession.participants || [],
    } : {
      participants: [
        {
          rowNumber: 1,
          fullName: fullName || 'Stan Alexandru',
          lastName: employee?.lastName || 'Stan',
          firstName: employee?.firstName || 'Alexandru',
          cnp: employee?.cnp || '1880315410127',
          birthDate: employee?.birthDate || '15.03.1988',
          birthPlace: employee?.birthPlace || 'București',
          docType: identity?.docType || 'CI',
          docSeries: identity?.series || 'RX',
          docNumber: identity?.number || '123456',
          identityDocument: `${identity?.docType || 'CI'} seria ${identity?.series || 'RX'} nr. ${identity?.number || '123456'}`.trim(),
          module: employee?.hygieneModule || 'Modulul 1',
          level: 'Nivelul 1',
          sessionDate: '10.03.2026',
          examDate: '15.03.2026',
          examGrade: '10',
          examResult: 'Admis',
          certificateSeries: 'IGI',
          certificateNumber: '0042',
          providerName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
          coursePeriod: '01.03.2026 - 10.03.2026',
        },
      ],
    }),

    // 6. Cursant selectat (dacă există)
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
      PLACEHOLDER_SERIE_ADEVERINTA: participant.certificateSeries,
      PLACEHOLDER_NUMAR_ADEVERINTA: participant.certificateNumber,
      PLACEHOLDER_DATA_ELIBERARE: formatDateRo(hygieneSession?.examDate),
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: `${participant.certificateSeries || 'IGI'} ${participant.certificateNumber || '0042'}`.trim(),
      PLACEHOLDER_REZULTAT_EXAMEN: participant.examResult || 'Admis',
      PLACEHOLDER_MODUL_IGIENA: participant.employee?.hygieneModule || employee?.hygieneModule || 'Modulul 1',
    } : {}),
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
    include: { jobs: true, worksites: true, employees: true },
  });
  if (!client) {
    throw new Error(`Clientul nu a fost găsit.`);
  }

  const employee = ctx.employeeId
    ? await prisma.employee.findFirst({
        where: { id: ctx.employeeId, clientId: ctx.clientId },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      })
    : client.employees && client.employees.length > 0
    ? await prisma.employee.findFirst({
        where: { id: client.employees[0].id },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      })
    : null;

  const selectedJob = client.jobs.find((j) => j.id === ctx.jobId) || employee?.currentJob || (client.jobs && client.jobs[0]) || null;
  const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;

  const hygieneSession = ctx.hygieneSessionId
    ? await prisma.hygieneSession.findUnique({
        where: { id: ctx.hygieneSessionId },
        include: { participants: { include: { employee: true } } },
      })
    : null;

  const participant = ctx.hygieneParticipantId && hygieneSession
    ? hygieneSession.participants.find((p) => p.id === ctx.hygieneParticipantId) || null
    : null;

  const resolutionResult = await resolveTemplateData(ctx.templateCode, {
    client,
    employee,
    job: selectedJob,
    worksite: selectedWorksite,
    hygieneSession,
    hygieneParticipant: participant,
    customOverrides: ctx.customOverrides,
  });

  const resolvedFields: ResolvedPlaceholderItem[] = template.fields.map((def: TemplateFieldDef) => {
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
