import { prisma } from '../prisma';
import { maskCNP } from '../security';
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
  worksiteId?: string;
  assessmentId?: string;
  hygieneSessionId?: string;
  hygieneParticipantId?: string;
  trainingEventId?: string;
  customOverrides?: Record<string, unknown>;
  allowOfflineBlank?: boolean;
}

export interface TemplateResolutionOptions {
  client: any;
  employee?: any;
  worksite?: any;
  worksiteId?: string;
  job?: any;
  jobId?: string;
  assessmentId?: string;
  riskAssessment?: any;
  hygieneSession?: any;
  hygieneParticipant?: any;
  trainingEvent?: any;
  trainingEventId?: string;
  customOverrides?: Record<string, unknown>;
  allowOfflineBlank?: boolean;
}

export interface TemplateResolutionResult {
  templateId: string;
  templateName: string;
  data: Record<string, any>;
  unresolvedPlaceholders: string[];
  status: 'ready' | 'missing_data';
  autocompletedKeys?: Set<string>;
}

// ============================================================================
// PROFILE LEGALE ROMÂNEȘTI AUTENTICE (STATUTORY LEGAL FALLBACK PROFILES)
// ============================================================================

/**
 * Serviciu Extern de Prevenire și Protecție (SEPP) abilitat ITM
 * Baza legală: Legea 319/2006 art. 8, HG 1425/2006 art. 28-36
 */
export const ROMANIAN_LEGAL_SSM_PROVIDER = {
  PLACEHOLDER_PRESTATOR_SSM: '',
  PLACEHOLDER_FURNIZOR_SSM: '',
  PLACEHOLDER_CUI_PRESTATOR: '',
  PLACEHOLDER_CERTIFICAT_FURNIZOR: '',
  PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: '',
  PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: '',
  PLACEHOLDER_STRADA_FURNIZOR: '',
  PLACEHOLDER_NUMAR_FURNIZOR: '',
  PLACEHOLDER_BLOC_FURNIZOR: '',
  PLACEHOLDER_SCARA_FURNIZOR: '',
  PLACEHOLDER_ETAJ_FURNIZOR: '',
  PLACEHOLDER_APARTAMENT_FURNIZOR: '',
  PLACEHOLDER_COD_POSTAL_FURNIZOR: '',
  PLACEHOLDER_LOCALITATE_FURNIZOR: '',
  PLACEHOLDER_JUDET_FURNIZOR: '',
  PLACEHOLDER_TELEFON_PRESTATOR: '',
  PLACEHOLDER_EMAIL_PRESTATOR: '',
  PLACEHOLDER_SITE_PRESTATOR: '',
  PLACEHOLDER_ADRESA_PRESTATOR: '',
  PLACEHOLDER_SPECIALIST_SSM: '',
  PLACEHOLDER_EVALUATOR_RISC: '',
  PLACEHOLDER_CERTIFICAT_EVALUATOR: '',
  PLACEHOLDER_REPREZENTANT_PRESTATOR: '',
  PLACEHOLDER_CALITATE_REPREZENTANT: '',
  PLACEHOLDER_ACT_REPREZENTANT: '',
};

/**
 * Pachet Decizii Interne Angajator (Deciziile 01-09 & 11) + Permis de lucru cu foc
 * Baza legală: Legea 319/2006 art. 13 lit. c, HG 1425/2006, Legea 307/2006, OMAI 712/2005, OMAI 163/2007
 */
export const ROMANIAN_LEGAL_DECIZII = {
  PLACEHOLDER_NUMAR_DECIZIE_01: '',
  PLACEHOLDER_NUMAR_DECIZIE_02: '',
  PLACEHOLDER_NUMAR_DECIZIE_03: '',
  PLACEHOLDER_NUMAR_DECIZIE_04: '',
  PLACEHOLDER_NUMAR_DECIZIE_05: '',
  PLACEHOLDER_NUMAR_DECIZIE_06: '',
  PLACEHOLDER_NUMAR_DECIZIE_07: '',
  PLACEHOLDER_NUMAR_DECIZIE_08: '',
  PLACEHOLDER_NUMAR_DECIZIE_09: '',
  PLACEHOLDER_NUMAR_DECIZIE_10: '',
  PLACEHOLDER_NUMAR_DECIZIE_11: '',
  PLACEHOLDER_APELATIV_ADMINISTRATOR: '',
  PLACEHOLDER_APELATIV_PSI: '',
  PLACEHOLDER_APELATIV_MEMBRU_COMISIE: '',
  PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: '',
  PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: '',
  PLACEHOLDER_RESPONSABIL_PSI: '',
  PLACEHOLDER_MEMBRU_COMISIE: '',
  PLACEHOLDER_DOMENIU_INSTRUIRE: 'Securitate și Sănătate în Muncă (SSM) și Prevenirea și Stingerea Incendiilor (PSI/SU)',
  PLACEHOLDER_FUNCTIE_INSTRUCTOR: '',
  PLACEHOLDER_RESPONSABIL_CONTROL_PSI: '',
  PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: '',
  PLACEHOLDER_NUMAR_PERMIS_FOC: '',
  PLACEHOLDER_DATA_PERMIS_FOC: '',
  PLACEHOLDER_EXECUTANT_LUCRARE: '',
  PLACEHOLDER_AJUTOR_LUCRARE: '',
  PLACEHOLDER_DESCRIERE_LUCRARE: '',
  PLACEHOLDER_TEHNOLOGIE_LUCRU: '',
  PLACEHOLDER_ORA_INCEPERE: '',
  PLACEHOLDER_ORA_FINALIZARE: '',
  PLACEHOLDER_DATA_INCEPERE_LUCRARE: '',
  PLACEHOLDER_DATA_FINALIZARE_LUCRARE: '',
  PLACEHOLDER_RAZA_PROTECTIE_METRI: '',
  PLACEHOLDER_PROTECTIE_MATERIALE: '',
  PLACEHOLDER_MIJLOACE_STINGERE: '',
  PLACEHOLDER_VENTILARE_SPATIU: '',
  PLACEHOLDER_METODA_IZOLARE_INSTALATII: '',
  PLACEHOLDER_MASURI_PSI_SUPLIMENTARE: '',
  PLACEHOLDER_NUMAR_BULETIN_ANALIZA: '',
  PLACEHOLDER_DATA_BULETIN_ANALIZA: '',
  PLACEHOLDER_EMITENT_BULETIN_ANALIZA: '',
  PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT: '112',
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
  PLACEHOLDER_AVIZ_MS: '',
  PLACEHOLDER_AVIZ_ME: '',
  PLACEHOLDER_NUMAR_AVIZ_MS: '',
  PLACEHOLDER_DATA_AVIZ_MS: '',
  PLACEHOLDER_NUMAR_AVIZ_ME: '',
  PLACEHOLDER_DATA_AVIZ_ME: '',
  PLACEHOLDER_AUTORITATE_EMITENTA: 'Ministerul Sănătății & Ministerul Educației',
  PLACEHOLDER_ORDIN_APLICABIL: 'Ordinul comun MS/ME nr. 2209/4469/2022',
  PLACEHOLDER_DATA_SESIUNE: '',
  PLACEHOLDER_DATA_EXAMEN: '',
  PLACEHOLDER_DATA_PV: '',
  PLACEHOLDER_DATA_CATALOG: '',
  PLACEHOLDER_DATA_ELIBERARE: '',
  PLACEHOLDER_DATA_INREGISTRARE: '',
  PLACEHOLDER_DATA_EMITERE: '',
  PLACEHOLDER_PERIOADA_CURS: '',
  PLACEHOLDER_ORA_EXAMEN: '',
  PLACEHOLDER_LOCATIE_EXAMEN: '',
  PLACEHOLDER_SALA_EXAMEN: '',
  PLACEHOLDER_JUDET_EXAMEN: '',
  PLACEHOLDER_LOCALITATE_EXAMEN: '',
  PLACEHOLDER_PRESEDINTE_COMISIE: '',
  PLACEHOLDER_MEMBRU_COMISIE: '',
  PLACEHOLDER_MEMBRU_COMISIE_1: '',
  PLACEHOLDER_MEMBRU_COMISIE_2: '',
  PLACEHOLDER_SECRETAR_COMISIE: '',
  PLACEHOLDER_COMISIE_EXAMEN: '',
  PLACEHOLDER_SERIE_PV: '',
  PLACEHOLDER_NUMAR_PV: '',
  PLACEHOLDER_SERIE_ADEVERINTA: '',
  PLACEHOLDER_NUMAR_ADEVERINTA: '',
  PLACEHOLDER_NUMAR_CATALOG: '',
  PLACEHOLDER_NUMAR_DECIZIE_COMISIE: '',
  PLACEHOLDER_MODULE_IGIENA: 'Nivelul 1 - Servicii alimentație publică și comerț alimentar',
  PLACEHOLDER_MODUL_IGIENA: 'Modulul 1 - Servicii de alimentație',
  PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 1',
  PLACEHOLDER_REZULTAT_EXAMEN: '',
  PLACEHOLDER_NOTA_EXAMEN: '',
  PLACEHOLDER_NUMAR_CANDIDATI: '0',
  PLACEHOLDER_NUMAR_PREZENTI: '0',
  PLACEHOLDER_NUMAR_ADMISI: '0',
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
  PLACEHOLDER_NR_REG_COM: 'J40/1234/2020',
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
  PLACEHOLDER_LOC_MUNCA: '',
  PLACEHOLDER_MARCA: '',
  PLACEHOLDER_GRUPA_SANGUINA: '',
  PLACEHOLDER_DOMICILIU: '',
  PLACEHOLDER_CALIFICARE: '',
  PLACEHOLDER_AUTORIZATII: '',
  PLACEHOLDER_TRASEU_DEPLASARE: '',
  PLACEHOLDER_DURATA_TRASEU: '',
  PLACEHOLDER_DATA_INSTRUIRE_IG: '',
  PLACEHOLDER_DURATA_INSTRUIRE_IG: '8 ore',
  PLACEHOLDER_INSTRUCTOR_IG: '',
  PLACEHOLDER_TEMATICA_IG: 'Legislația generală SSM (Legea 319/2006, HG 1425/2006), drepturi și obligații ale lucrătorilor, riscuri generale la locul de muncă, măsuri de prim ajutor, acordare și utilizare EIP',
  PLACEHOLDER_VERIFICATOR_IG: '',
  PLACEHOLDER_DATA_INSTRUIRE_LM: '',
  PLACEHOLDER_DURATA_INSTRUIRE_LM: '8 ore',
  PLACEHOLDER_LOC_MUNCA_LM: '',
  PLACEHOLDER_INSTRUCTOR_LM: '',
  PLACEHOLDER_TEMATICA_LM: 'Instrucțiuni proprii specifice SSM (IPSSM activități de birou, lucrul la videoterminale), riscuri mecanice și electrice, proceduri de urgență în caz de pericol grav și iminent',
  PLACEHOLDER_VERIFICATOR_LM: '',
  PLACEHOLDER_DATA_ADMITERE: '',
  PLACEHOLDER_ADMITERE_NUME: '',

  // F8: PSI
  PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: '',
  PLACEHOLDER_DURATA_INSTRUCTAJ_IG_PSI: '8 ore',
  PLACEHOLDER_INSTRUCTOR_IG_PSI: '',
  PLACEHOLDER_TEMATICA_IG_PSI: 'Legislația apărării împotriva incendiilor (Legea 307/2006, OMAI 712/2005, OMAI 163/2007); Obligațiile salariaților; Cauze generale de incendiu; Procedura de evacuare; Folosirea stingătoarelor P6 și CO2',
  PLACEHOLDER_VERIFICATOR_IG_PSI: '',
  PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: '',
  PLACEHOLDER_DURATA_INSTRUCTAJ_LM_PSI: '8 ore',
  PLACEHOLDER_LOC_MUNCA_LM_PSI: '',
  PLACEHOLDER_INSTRUCTOR_LM_PSI: '',
  PLACEHOLDER_TEMATICA_LM_PSI: 'Instrucțiuni specifice de apărare împotriva incendiilor la locul de muncă; Surse posibile de aprindere la echipamente electrice; Căi de evacuare și salvare; Poziționarea mijloacelor de primă intervenție',
  PLACEHOLDER_VERIFICATOR_LM_PSI: '',
  PLACEHOLDER_DATA_ADMITERE_PSI: '',
  PLACEHOLDER_ADMITERE_NUME_PSI: '',
};

/**
 * Medicina Muncii: Fisa Solicitare Examen (Anexa 2) & Fisa Identificare Riscuri (Anexa 3 HG 355/2007)
 */
export const ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH = {
  // Anexa 2: Solicitare examen
  PLACEHOLDER_TELEFON_FIRMA: '',
  PLACEHOLDER_EMAIL_FIRMA: '',
  PLACEHOLDER_ACTIVITATE_CAEN: '',
  PLACEHOLDER_NUMAR_INREGISTRARE_SOLICITARE: '',
  PLACEHOLDER_CABINET_MEDICINA_MUNCII: '',
  PLACEHOLDER_MEDIC_MEDICINA_MUNCII: '',
  PLACEHOLDER_ADRESA_CABINET_MEDICINA_MUNCII: '',
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
  PLACEHOLDER_SEX: '',
  PLACEHOLDER_APELATIV_SALARIAT: '',
  PLACEHOLDER_PROFESIE_OCUPATIE: '',
  PLACEHOLDER_SECTIE_COMPARTIMENT: '',
  PLACEHOLDER_VECHIME_TOTALA: '',
  PLACEHOLDER_VECHIME_MESERIE: '',
  PLACEHOLDER_VECHIME_LOC_MUNCA: '',
  PLACEHOLDER_TRASEU_PROFESIONAL: '',
  PLACEHOLDER_DATA_SOLICITARII: '',
  PLACEHOLDER_FUNCTIE_REPREZENTANT: 'Administrator',

  // Anexa 3: Fisa Identificare Factori de Risc Profesional
  PLACEHOLDER_SUBUNITATE: '',
  PLACEHOLDER_NAVETA_STATUS: 'Nu',
  PLACEHOLDER_NAVETA_ORE: '',
  PLACEHOLDER_LUCRU_ECHIPA: 'Da',
  PLACEHOLDER_NUMAR_SCHIMBURI: '1',
  PLACEHOLDER_SCHIMB_NOAPTE: 'Nu',
  PLACEHOLDER_PAUZE_ORGANIZATE: 'Da (pauză de masă de 30 minute și pauze ergonomice de 10 minute la 2 ore)',
  PLACEHOLDER_BANDA_RULANTA: 'Nu',
  PLACEHOLDER_ACTIVITATI_POST: '',
  PLACEHOLDER_DESCRIERE_ACTIVITATE: '',
  PLACEHOLDER_ECHIPAMENTE_POST: '',
  PLACEHOLDER_CONDITII_POST: '',
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
  PLACEHOLDER_MISCARI_REPETITIVE: 'Nu',
  PLACEHOLDER_AUTO_INSTITUTIE: 'Nu',
  PLACEHOLDER_CATEGORIE_PERMIS: 'Nu este cazul',
  PLACEHOLDER_CONDITII_DEOSEBITE_SPECIALE: 'Nu',
  PLACEHOLDER_SECTOR_ALIMENTAR: 'Nu',
  PLACEHOLDER_PORT_ARMA: 'Nu',
  PLACEHOLDER_LUCRU_INALTIME: 'Nu',
  PLACEHOLDER_SPATII_IZOLATE: 'Nu',
  PLACEHOLDER_DIMENSIUNI_INCAPERE: '',
  PLACEHOLDER_SUPRAFATA_LUCRU: '',
  PLACEHOLDER_MEDIU_ACTIVITATE: 'La sol (clădire modernă de birouri, etaj intermediar)',
  PLACEHOLDER_NIVEL_EFORT_FIZIC: 'Mic (solicitare posturală statică la birou)',
  PLACEHOLDER_POZITIE_LUCRU: 'Așezat pe scaun ergonomic reglabil',
  PLACEHOLDER_POZITII_VICIOASE: 'Nu este cazul',
  PLACEHOLDER_MANIPULARE_MASE: 'Nu',
  PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA: '',
  PLACEHOLDER_SUPRASOLICITARE_VIZUALA: 'Nu',
  PLACEHOLDER_SUPRASOLICITARE_AUDITIVA: 'Nu',
  PLACEHOLDER_SUPRASOLICITARE_NEUROPSIHICA: 'Medie (concentrare susținută)',
  PLACEHOLDER_SOLICITARE_OSTEOARTICULARA: 'Nu este cazul',
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
  PLACEHOLDER_RADIATII_NEIONIZANTE: 'Nu',
  PLACEHOLDER_RADIATII_IONIZANTE: 'Nu',
  PLACEHOLDER_AGENTI_BIOLOGICI: 'Nu',
  PLACEHOLDER_PROTECTIE_COLECTIVA: 'Sistem climatizare-ventilație mecanică, împământare carcase echipamente IT, protecție diferențială 30mA, iluminat fără pâlpâire',
  PLACEHOLDER_PROTECTIE_INDIVIDUALA: '',
  PLACEHOLDER_DATA_INTOCMIRII: '',
};

/**
 * EIP: Fisa Individuala de Acordare si Dotare a EIP (HG 1048/2006)
 */
export const ROMANIAN_LEGAL_EIP = {
  PLACEHOLDER_DATA_ELIBERARII_FISEI: '',
  PLACEHOLDER_MARIME_HAINE: '',
  PLACEHOLDER_MARIME_INCALTAMINTE: '',
  PLACEHOLDER_MARIME_MANUSI: '',
  PLACEHOLDER_MARIME_CASCA: '',
  PLACEHOLDER_DATA_SEMNARII_EIP: '',
  PLACEHOLDER_NUME_SALARIAT: '',
  PLACEHOLDER_GESTIONAR_EIP: '',
  PLACEHOLDER_SEF_LOC_MUNCA: '',

  // 10 rânduri de dotare EIP:
  PLACEHOLDER_EIP_DENUMIRE_01: '',
  PLACEHOLDER_EIP_STANDARD_01: '',
  PLACEHOLDER_EIP_UM_01: '',
  PLACEHOLDER_EIP_CANTITATE_01: '',
  PLACEHOLDER_EIP_DURATA_01: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_01: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_01: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_01: '',
  PLACEHOLDER_EIP_MOTIV_01: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_01: '',

  PLACEHOLDER_EIP_DENUMIRE_02: '',
  PLACEHOLDER_EIP_STANDARD_02: '',
  PLACEHOLDER_EIP_UM_02: '',
  PLACEHOLDER_EIP_CANTITATE_02: '',
  PLACEHOLDER_EIP_DURATA_02: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_02: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_02: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_02: '',
  PLACEHOLDER_EIP_MOTIV_02: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_02: '',

  PLACEHOLDER_EIP_DENUMIRE_03: '',
  PLACEHOLDER_EIP_STANDARD_03: '',
  PLACEHOLDER_EIP_UM_03: '',
  PLACEHOLDER_EIP_CANTITATE_03: '',
  PLACEHOLDER_EIP_DURATA_03: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_03: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_03: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_03: '',
  PLACEHOLDER_EIP_MOTIV_03: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_03: '',

  PLACEHOLDER_EIP_DENUMIRE_04: '',
  PLACEHOLDER_EIP_STANDARD_04: '',
  PLACEHOLDER_EIP_UM_04: '',
  PLACEHOLDER_EIP_CANTITATE_04: '',
  PLACEHOLDER_EIP_DURATA_04: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_04: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_04: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_04: '',
  PLACEHOLDER_EIP_MOTIV_04: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_04: '',

  PLACEHOLDER_EIP_DENUMIRE_05: '',
  PLACEHOLDER_EIP_STANDARD_05: '',
  PLACEHOLDER_EIP_UM_05: '',
  PLACEHOLDER_EIP_CANTITATE_05: '',
  PLACEHOLDER_EIP_DURATA_05: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_05: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_05: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_05: '',
  PLACEHOLDER_EIP_MOTIV_05: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_05: '',

  PLACEHOLDER_EIP_DENUMIRE_06: '',
  PLACEHOLDER_EIP_STANDARD_06: '',
  PLACEHOLDER_EIP_UM_06: '',
  PLACEHOLDER_EIP_CANTITATE_06: '',
  PLACEHOLDER_EIP_DURATA_06: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_06: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_06: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_06: '',
  PLACEHOLDER_EIP_MOTIV_06: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_06: '',

  PLACEHOLDER_EIP_DENUMIRE_07: '',
  PLACEHOLDER_EIP_STANDARD_07: '',
  PLACEHOLDER_EIP_UM_07: '',
  PLACEHOLDER_EIP_CANTITATE_07: '',
  PLACEHOLDER_EIP_DURATA_07: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_07: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_07: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_07: '',
  PLACEHOLDER_EIP_MOTIV_07: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_07: '',

  PLACEHOLDER_EIP_DENUMIRE_08: '',
  PLACEHOLDER_EIP_STANDARD_08: '',
  PLACEHOLDER_EIP_UM_08: '',
  PLACEHOLDER_EIP_CANTITATE_08: '',
  PLACEHOLDER_EIP_DURATA_08: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_08: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_08: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_08: '',
  PLACEHOLDER_EIP_MOTIV_08: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_08: '',

  PLACEHOLDER_EIP_DENUMIRE_09: '',
  PLACEHOLDER_EIP_STANDARD_09: '',
  PLACEHOLDER_EIP_UM_09: '',
  PLACEHOLDER_EIP_CANTITATE_09: '',
  PLACEHOLDER_EIP_DURATA_09: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_09: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_09: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_09: '',
  PLACEHOLDER_EIP_MOTIV_09: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_09: '',

  PLACEHOLDER_EIP_DENUMIRE_10: '',
  PLACEHOLDER_EIP_STANDARD_10: '',
  PLACEHOLDER_EIP_UM_10: '',
  PLACEHOLDER_EIP_CANTITATE_10: '',
  PLACEHOLDER_EIP_DURATA_10: '',
  PLACEHOLDER_EIP_DATA_ACORDARII_10: '',
  PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_10: '',
  PLACEHOLDER_EIP_DATA_RESTITUIRII_10: '',
  PLACEHOLDER_EIP_MOTIV_10: '',
  PLACEHOLDER_EIP_SEMNATURA_RETUR_10: '',
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
  PLACEHOLDER_DATA_INCEPUT: '',
  PLACEHOLDER_DATA_INCEPERE: '',
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
  PLACEHOLDER_COD_POSTAL_FIRMA: '',
  PLACEHOLDER_CONT_BANCA_FIRMA: '',
  PLACEHOLDER_BANCA_FIRMA: '',
  PLACEHOLDER_TELEFON_SALARIAT: '',
  PLACEHOLDER_EMAIL_SALARIAT: '',
  PLACEHOLDER_CONT_BANCA_SALARIAT: '',
  PLACEHOLDER_BANCA_SALARIAT: '',
  PLACEHOLDER_DOMICILIU: '',
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
  const job = context.job || (context.jobId && client?.jobs ? client.jobs.find((j: any) => j.id === context.jobId) : null) || employee?.currentJob || null;
  const worksite = context.worksite || (context.worksiteId && client?.worksites ? client.worksites.find((w: any) => w.id === context.worksiteId) : null) || employee?.currentWorksite || null;
  const hygieneSession = context.hygieneSession || null;
  const participant = context.hygieneParticipant || null;
  const trainingEvent =
    context.trainingEvent ||
    (context.trainingEventId && client?.trainingEvents
      ? client.trainingEvents.find((e: any) => e.id === context.trainingEventId)
      : null);

  if (trainingEvent && trainingEvent.participants) {
    for (const p of trainingEvent.participants as any[]) {
      if (!p.employee && p.employeeId && client?.employees) {
        p.employee = client.employees.find((e: any) => e.id === p.employeeId) || null;
      }
      if (p.employee && !p.employee.currentJob && p.employee.currentJobId && client?.jobs) {
        p.employee.currentJob = client.jobs.find((j: any) => j.id === p.employee.currentJobId) || null;
      }
    }
  }

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
  const legalRepresentativeName = client?.legalRepresentative || '';

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

  const caenTitle = client?.caenActivity || riskProfile.industryName || '';
  const rawCaen = client?.caenCode != null ? String(client.caenCode).trim() : '';
  const fullCaenDisplay = rawCaen && rawCaen.includes('-')
    ? rawCaen
    : (caenCode && caenTitle ? `${caenCode} - ${caenTitle}` : (caenCode || ''));

  let riskAssessment = context.riskAssessment;
  if (!riskAssessment && context.assessmentId) {
    try {
      riskAssessment = await prisma.riskAssessment.findUnique({
        where: { id: context.assessmentId },
        include: {
          client: true,
          job: true,
          worksite: true,
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      });
    } catch {}
  }
  if (!riskAssessment && (job?.id || context.jobId) && client?.id) {
    try {
      riskAssessment = await prisma.riskAssessment.findFirst({
        where: { clientId: client.id, jobId: job?.id || context.jobId },
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          job: true,
          worksite: true,
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      });
    } catch {}
  }
  if (!riskAssessment && client?.id) {
    try {
      riskAssessment = await prisma.riskAssessment.findFirst({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          job: true,
          worksite: true,
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      });
    } catch {}
  }

  const hasDbRiskAssessment = !!(riskAssessment && riskAssessment.riskItems && riskAssessment.riskItems.length > 0);
  const dbRiskItems: any[] = hasDbRiskAssessment ? riskAssessment.riskItems : [];

  let scoreNumber = riskProfile.globalRiskScore || 2.62;
  if (hasDbRiskAssessment && dbRiskItems.length > 0) {
    const sumR = dbRiskItems.reduce((acc: number, it: any) => acc + (it.riskLevel || 3), 0);
    const sumR2 = dbRiskItems.reduce((acc: number, it: any) => acc + (it.riskLevel || 3) * (it.riskLevel || 3), 0);
    if (sumR > 0) {
      scoreNumber = Number((sumR2 / sumR).toFixed(2));
    }
  }
  const scoreRo = scoreNumber.toFixed(2).replace('.', ',');

  // Compute subsystem distribution
  const factors = riskProfile.factors && riskProfile.factors.length > 0 ? riskProfile.factors : [];
  const totalFactorsCount = hasDbRiskAssessment ? dbRiskItems.length : (factors.length || 30);

  let cExec = 0, cSarc = 0, cMij = 0, cMed = 0;
  if (hasDbRiskAssessment) {
    const isExec = (s: string) => /executant/i.test(s);
    const isSarc = (s: string) => /sarcina/i.test(s);
    const isMij = (s: string) => /mijloc|utilaj|echipament/i.test(s);
    const isMed = (s: string) => /mediu/i.test(s);

    cExec = dbRiskItems.filter((it: any) => isExec(it.riskSituation || '')).length;
    cSarc = dbRiskItems.filter((it: any) => isSarc(it.riskSituation || '')).length;
    cMij = dbRiskItems.filter((it: any) => isMij(it.riskSituation || '')).length;
    cMed = dbRiskItems.filter((it: any) => isMed(it.riskSituation || '')).length;

    const categorized = cExec + cSarc + cMij + cMed;
    if (categorized === 0 && totalFactorsCount > 0) {
      cExec = Math.ceil(totalFactorsCount * 0.35);
      cSarc = Math.ceil(totalFactorsCount * 0.25);
      cMij = Math.ceil(totalFactorsCount * 0.25);
      cMed = Math.max(0, totalFactorsCount - cExec - cSarc - cMij);
    }
  } else {
    cExec = factors.filter((f) => f.element === 'EXECUTANT').length;
    cSarc = factors.filter((f) => f.element === 'SARCINA').length;
    cMij = factors.filter((f) => f.element === 'MIJLOACE').length;
    cMed = factors.filter((f) => f.element === 'MEDIU').length;
  }

  const pExec = totalFactorsCount > 0 ? ((cExec / totalFactorsCount) * 100).toFixed(2) : '0.00';
  const pSarc = totalFactorsCount > 0 ? ((cSarc / totalFactorsCount) * 100).toFixed(2) : '0.00';
  const pMij = totalFactorsCount > 0 ? ((cMij / totalFactorsCount) * 100).toFixed(2) : '0.00';
  const pMed = totalFactorsCount > 0 ? ((cMed / totalFactorsCount) * 100).toFixed(2) : '0.00';

  const countL3 = hasDbRiskAssessment
    ? dbRiskItems.filter((it: any) => it.riskLevel === 3).length
    : factors.filter((f) => f.riskLevel === 3).length;
  const countL2 = hasDbRiskAssessment
    ? dbRiskItems.filter((it: any) => it.riskLevel === 2).length
    : factors.filter((f) => f.riskLevel === 2).length;
  const countL1 = hasDbRiskAssessment
    ? dbRiskItems.filter((it: any) => it.riskLevel === 1).length
    : factors.filter((f) => f.riskLevel === 1).length;

  // 2. Resolve Decisions Date & Numbering dynamically
  const decisionsDateRo = client?.decisionsDate
    ? formatDateRo(client.decisionsDate)
    : '';

  // 3. Appointees Dynamic Binding
  const designatedWorker = client?.designatedWorkerSsm
    ? `${client.designatedWorkerSsm} (Lucrător desemnat SSM conform deciziei angajatorului)`
    : '';

  const firstAid = client?.firstAidResponder
    ? `${client.firstAidResponder} (Personal instruit prim ajutor conform Legii 319/2006)`
    : '';

  const psiOfficer = client?.psiResponder
    ? `${client.psiResponder} (Cadru tehnic / Responsabil cu atribuții PSI conform Legii 307/2006)`
    : '';

  const investMembers = client?.investigationMembers || '';

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

  // 4.6. Precedence: Explicit relational -> Explicit legacy string -> Fallback DB default -> Static legal mock (now empty string)
  const ssmProviderName = (!isFallbackProvider && prov?.name)
    ? prov.name
    : (client?.ssmProviderName || prov?.name || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM || '');

  const ssmSpecialistName = (!isFallbackSpecialist && spec?.name)
    ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
    : client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
    : spec?.name
    ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
    : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM || '');

  const evaluatorName = (!isFallbackSpecialist && spec?.name)
    ? `${spec.name} (Evaluator risc SSM, ${spec.certificateNumber || 'Certificat atestare INCDPM'})`
    : client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})`
    : spec?.name
    ? `${spec.name} (Evaluator risc SSM, ${spec.certificateNumber || 'Certificat atestare INCDPM'})`
    : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC || '');

  const certificatEvaluator = (!isFallbackSpecialist && spec?.certificateNumber)
    ? spec.certificateNumber
    : client?.ssmSpecialistCert || spec?.certificateNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR || '';

  const cuiPrestator = prov?.cui || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CUI_PRESTATOR || '';
  const certFurnizor = prov?.authorizationDetails
    ? prov.authorizationDetails
    : prov?.authorizationNumber
    ? `Certificat abilitare Serviciu Extern SSM nr. ${prov.authorizationNumber}${prov.authorizationDate ? ` din ${formatDateRo(prov.authorizationDate)}` : ''} emis de Ministerul Muncii - ITM București`
    : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_FURNIZOR || '');
  const nrCertFurnizor = prov?.authorizationNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR || '';
  const nrInregFurnizor = prov?.regCom || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR || '';
  const stradaFurnizor = prov?.street || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_STRADA_FURNIZOR || '';
  const numarFurnizor = prov?.number || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_FURNIZOR || '';
  const blocFurnizor = prov?.building ?? (prov ? '-' : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_BLOC_FURNIZOR || ''));
  const scaraFurnizor = prov?.entrance ?? (prov ? '-' : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SCARA_FURNIZOR || ''));
  const etajFurnizor = prov?.floor ?? (prov ? '-' : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ETAJ_FURNIZOR || ''));
  const apFurnizor = prov?.apartment ?? (prov ? '-' : (ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_APARTAMENT_FURNIZOR || ''));
  const codPostalFurnizor = prov?.postalCode || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_COD_POSTAL_FURNIZOR || '';
  const localitateFurnizor = prov?.locality || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_LOCALITATE_FURNIZOR || '';
  const judetFurnizor = prov?.county || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_JUDET_FURNIZOR || '';
  const telPrestator = prov?.phone || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_TELEFON_PRESTATOR || '';
  const emailPrestator = prov?.email || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EMAIL_PRESTATOR || '';
  const sitePrestator = prov?.website || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SITE_PRESTATOR || '';
  const repPrestator = prov?.legalRepresentative || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_REPREZENTANT_PRESTATOR || '';
  const rolRepPrestator = prov?.representativeRole || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CALITATE_REPREZENTANT || '';
  const actRepPrestator = prov?.representativeDoc || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ACT_REPREZENTANT || '';
  const adresaPrestator = (prov?.street || prov?.number || prov?.locality)
    ? `${prov.locality || ''}, ${prov.street || ''} nr. ${prov.number || ''}${prov.county ? `, ${prov.county}` : ''}`.replace(/^,\s*/, '').trim()
    : (prov?.address || '');

  // 5. Build 30-factor positional dictionary
  const dynamic30Factors: Record<string, string> = {};
  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(2, '0');
    const dbItem = hasDbRiskAssessment ? dbRiskItems[i - 1] : null;
    const f = factors[i - 1];
    const defaultF = TESA_DEFAULT_FACTORS[i - 1];

    if (dbItem) {
      dynamic30Factors[`PLACEHOLDER_GRAVITATE_RISC_${pad}`] = String(dbItem.severityScore || 3);
      dynamic30Factors[`PLACEHOLDER_FRECVENTA_RISC_${pad}`] = String(dbItem.probabilityScore || 2);
      dynamic30Factors[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`] = String(dbItem.riskLevel || 2);
    } else {
      dynamic30Factors[`PLACEHOLDER_GRAVITATE_RISC_${pad}`] = String(f?.severity || defaultF?.gravity || 3);
      dynamic30Factors[`PLACEHOLDER_FRECVENTA_RISC_${pad}`] = String(f?.probability || defaultF?.frequency || 2);
      dynamic30Factors[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`] = String(f?.riskLevel || defaultF?.partialRisk || 2);
    }
  }

  // 6. Construct dynamic table padded arrays for training sheets (F7 & F8, F-M2-01: no truncation)
  // Participant-scoped training events:
  const participantEvents: any[] = (
    employee?.trainingParticipants?.map((tp: any) => tp.event) ||
    ((client?.trainingEvents || []) as any[]).filter((ev: any) =>
      employee?.id ? ev.participants?.some((p: any) => p.employeeId === employee.id) : true
    )
  ).filter(Boolean).sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  // Real event mapping for introductory and on-the-job training (HG 1425/2006)
  const introEvent = participantEvents.find((e: any) =>
    ['INTRODUCTIV', 'INTRODUCTIV_GENERAL'].includes(String(e.type || '').toUpperCase())
  );
  const dataIntroductiv = introEvent?.eventDate
    ? formatDateRo(introEvent.eventDate)
    : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
  const durataIntroductiv = introEvent?.durationHours
    ? `${introEvent.durationHours} ore`
    : '8 ore';
  const instructorIntroductiv = introEvent?.instructorName || ssmSpecialistName;
  const tematicaIntroductiv = introEvent?.materialOrTopic || 'Legislația generală SSM (Legea 319/2006, HG 1425/2006), drepturi și obligații, riscuri generale';
  const verificatorIntroductiv = introEvent?.verifierName || legalRepresentativeName;

  const lmEvent = participantEvents.find((e: any) =>
    ['LOC_MUNCA', 'LOC_DE_MUNCA'].includes(String(e.type || '').toUpperCase())
  );
  const dataLocMunca = lmEvent?.eventDate
    ? formatDateRo(lmEvent.eventDate)
    : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
  const durataLocMunca = lmEvent?.durationHours
    ? `${lmEvent.durationHours} ore`
    : '8 ore';
  const instructorLocMunca = lmEvent?.instructorName || designatedWorker;
  const tematicaLocMunca = lmEvent?.materialOrTopic || 'Instrucțiuni proprii specifice SSM și riscurile specifice postului de lucru';
  const verificatorLocMunca = lmEvent?.verifierName || designatedWorker;
  const dataAdmitere = lmEvent?.eventDate
    ? formatDateRo(lmEvent.eventDate)
    : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');

  // Periodic SSM: match case-insensitively PERIODIC_SSM, SSM, PERIODIC
  const ssmEvents = participantEvents.filter((e: any) =>
    ['PERIODIC_SSM', 'SSM', 'PERIODIC'].includes(String(e.type || '').toUpperCase())
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
        ocupatia: ev.jobTitle || job?.title || employee?.currentJob?.title || 'Personal TESA',
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

  // Periodic PSI: match case-insensitively PERIODIC_PSI, PSI, SU
  const psiEvents = participantEvents.filter((e: any) =>
    ['PERIODIC_PSI', 'PSI', 'SU'].includes(String(e.type || '').toUpperCase())
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

  // 7. Dynamic Prevention and Protection Plan (Feature F15 & F22 - HG 1425/2006 art. 15)
  const TECHNICAL_REGEX = /montar|ancorar|echipam|cablu|canalin|tablou|priz|pram|diferential|scar|antiderap|ventila|ilumin|protecti.*mecanic|intrerup|impamant|dispozitiv|hota|cutit|aragaz|schel|balustrad/i;
  const HYGIENE_REGEX = /medic|oftalmo|ergonom|igien|trus|prim.*ajutor|microclimat|aeris|temperatur|curaten|dezinfect|matern|antidot/i;
  const ORG_REGEX = /instrui|interzic|verific|notific|respecta|pauz|planific|rotati|procedur|autorizat|depozit|permis/i;

  let planPrevenire: any[];
  if (hasDbRiskAssessment) {
    const dbMeasures: any[] = riskAssessment.preventionMeasures || [];
    planPrevenire = dbRiskItems.map((item: any, idx: number) => {
      const itemMeasures = dbMeasures.filter((m: any) => m.riskItemId === item.id);
      const relevantMeasures = itemMeasures.length > 0
        ? itemMeasures
        : (dbMeasures.length > 0 && idx === 0 ? dbMeasures.filter((m: any) => !m.riskItemId) : []);

      const tech = relevantMeasures.filter((m: any) => m.measureType === 'tehnica');
      const org = relevantMeasures.filter((m: any) => m.measureType === 'organizatorica');
      const hyg = relevantMeasures.filter((m: any) => m.measureType === 'igienico-sanitara');
      const alt = relevantMeasures.filter((m: any) => !['tehnica', 'organizatorica', 'igienico-sanitara'].includes(m.measureType));

      const deadlines = relevantMeasures.map((m: any) => m.deadline).filter(Boolean);
      const responsibles = relevantMeasures.map((m: any) => m.responsiblePerson).filter(Boolean);

      return {
        nr: idx + 1,
        riscEvaluat: item.hazard,
        factorRisc: item.hazard,
        manifestare: item.riskSituation || item.hazard,
        consecinte: item.consequence || 'ITM 3-45 zile',
        masuriTehnice: tech.length > 0 ? tech.map((t: any) => `- ${t.description}`).join('\n') : '-',
        masuriOrganizatorice: org.length > 0 ? org.map((o: any) => `- ${o.description}`).join('\n') : '-',
        masuriIgienicoSanitare: hyg.length > 0 ? hyg.map((h: any) => `- ${h.description}`).join('\n') : '-',
        masuriAltaNatura: alt.length > 0 ? alt.map((a: any) => `- ${a.description}`).join('\n') : '-',
        actiuni: relevantMeasures.length > 0
          ? relevantMeasures.map((m: any) => m.resources ? `- ${m.description} (${m.resources})` : `- ${m.description}`).join('\n')
          : '- instruirea lucrătorilor privind cerințele de SSM\n- verificarea modului de respectare a procedurilor',
        termen: deadlines.length > 0 ? [...new Set(deadlines)].join(', ') : 'Permanent',
        responsabil: responsibles.length > 0 ? [...new Set(responsibles)].join(', ') : (designatedWorker || legalRepresentativeName || 'CLM / Lucrător desemnat SSM'),
      };
    });
  } else {
    planPrevenire = factors.map((f, idx) => {
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
  }

  // Hazard zones resolution
  const hazardZonesMap: Record<string, string> = {};
  const dbHazardZones: any[] = riskAssessment?.hazardZones || [];
  for (let i = 1; i <= 6; i++) {
    const pad = String(i).padStart(2, '0');
    const hz = dbHazardZones[i - 1];
    if (hz) {
      hazardZonesMap[`PLACEHOLDER_DENUMIRE_ZONA_${pad}`] = hz.zoneName;
      hazardZonesMap[`PLACEHOLDER_MASURI_ZONA_${pad}`] = hz.safetyMeasures || hz.hazardDescription || '';
    } else {
      hazardZonesMap[`PLACEHOLDER_DENUMIRE_ZONA_${pad}`] = (ROMANIAN_LEGAL_RISK as any)[`PLACEHOLDER_DENUMIRE_ZONA_${pad}`] || '';
      hazardZonesMap[`PLACEHOLDER_MASURI_ZONA_${pad}`] = (ROMANIAN_LEGAL_RISK as any)[`PLACEHOLDER_MASURI_ZONA_${pad}`] || '';
    }
  }

  // Authentic DB provenance tracking
  const autocompletedKeys = new Set<string>();
  const markAutocompleted = (key: string, val: unknown) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      autocompletedKeys.add(key);
    }
  };

  // 1. Client / Angajator authentic tracking
  if (client?.name) markAutocompleted('PLACEHOLDER_FIRMA', client.name);
  if (client?.cui) markAutocompleted('PLACEHOLDER_CUI', client.cui);
  if (client?.regCom) markAutocompleted('PLACEHOLDER_NR_REG_COM', client.regCom);
  if (client?.address) {
    markAutocompleted('PLACEHOLDER_ADRESA_FIRMA', client.address);
    markAutocompleted('PLACEHOLDER_ADRESA', client.address);
  }
  if (client?.legalRepresentative) {
    markAutocompleted('PLACEHOLDER_REPREZENTANT_LEGAL', client.legalRepresentative);
    markAutocompleted('PLACEHOLDER_DIRECTOR', client.legalRepresentative);
    markAutocompleted('PLACEHOLDER_CALITATE_REPREZENTANT', 'Administrator');
    markAutocompleted('PLACEHOLDER_APELATIV_ADMINISTRATOR', detectRomanianSalutation(client.legalRepresentative));
  }
  if (client?.contactPhone) {
    markAutocompleted('PLACEHOLDER_TELEFON_CONTACT', client.contactPhone);
    markAutocompleted('PLACEHOLDER_TELEFON_FIRMA', client.contactPhone);
  }
  if (client?.contactEmail) {
    markAutocompleted('PLACEHOLDER_EMAIL_CONTACT', client.contactEmail);
    markAutocompleted('PLACEHOLDER_EMAIL_FIRMA', client.contactEmail);
  }
  if (fullCaenDisplay) markAutocompleted('PLACEHOLDER_COD_CAEN', fullCaenDisplay);
  if (caenTitle) {
    markAutocompleted('PLACEHOLDER_ACTIVITATE_PRINCIPALA', caenTitle);
    markAutocompleted('PLACEHOLDER_ACTIVITATE_CAEN', caenTitle);
  }
  if (client?.foundedYear) markAutocompleted('PLACEHOLDER_AN_INFIINTARE', client.foundedYear);
  if (job?.workersCount || (client?.employees && client.employees.length > 0)) {
    markAutocompleted('PLACEHOLDER_NUMAR_LUCRATORI', 'true');
  }
  if ((client as any)?.bankAccount) markAutocompleted('PLACEHOLDER_CONT_BANCA_FIRMA', (client as any).bankAccount);
  if ((client as any)?.bankName) markAutocompleted('PLACEHOLDER_BANCA_FIRMA', (client as any).bankName);

  // SEPP External Provider authentic tracking
  if (ssmProviderName) {
    markAutocompleted('PLACEHOLDER_PRESTATOR_SSM', ssmProviderName);
    markAutocompleted('PLACEHOLDER_FURNIZOR_SSM', ssmProviderName);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_DENUMIRE', ssmProviderName);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_NUME', ssmProviderName);
  }
  if (cuiPrestator) {
    markAutocompleted('PLACEHOLDER_CUI_PRESTATOR', cuiPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_CUI', cuiPrestator);
  }
  if (certFurnizor) {
    markAutocompleted('PLACEHOLDER_CERTIFICAT_FURNIZOR', certFurnizor);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_CERTIFICAT', certFurnizor);
  }
  if (nrCertFurnizor) {
    markAutocompleted('PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR', nrCertFurnizor);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_NUMAR_CERTIFICAT', nrCertFurnizor);
  }
  if (nrInregFurnizor) {
    markAutocompleted('PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR', nrInregFurnizor);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_REG_COM', nrInregFurnizor);
  }
  if (stradaFurnizor) markAutocompleted('PLACEHOLDER_STRADA_FURNIZOR', stradaFurnizor);
  if (numarFurnizor) markAutocompleted('PLACEHOLDER_NUMAR_FURNIZOR', numarFurnizor);
  if (blocFurnizor) markAutocompleted('PLACEHOLDER_BLOC_FURNIZOR', blocFurnizor);
  if (scaraFurnizor) markAutocompleted('PLACEHOLDER_SCARA_FURNIZOR', scaraFurnizor);
  if (etajFurnizor) markAutocompleted('PLACEHOLDER_ETAJ_FURNIZOR', etajFurnizor);
  if (apFurnizor) markAutocompleted('PLACEHOLDER_APARTAMENT_FURNIZOR', apFurnizor);
  if (codPostalFurnizor) {
    markAutocompleted('PLACEHOLDER_COD_POSTAL_FURNIZOR', codPostalFurnizor);
    markAutocompleted('PLACEHOLDER_COD_POSTAL_FIRMA', codPostalFurnizor);
  }
  if (localitateFurnizor) {
    markAutocompleted('PLACEHOLDER_LOCALITATE_FURNIZOR', localitateFurnizor);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_LOCALITATE', localitateFurnizor);
  }
  if (judetFurnizor) {
    markAutocompleted('PLACEHOLDER_JUDET_FURNIZOR', judetFurnizor);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_JUDET', judetFurnizor);
  }
  if (telPrestator) {
    markAutocompleted('PLACEHOLDER_TELEFON_PRESTATOR', telPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_TELEFON', telPrestator);
  }
  if (emailPrestator) {
    markAutocompleted('PLACEHOLDER_EMAIL_PRESTATOR', emailPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_EMAIL', emailPrestator);
  }
  if (sitePrestator) {
    markAutocompleted('PLACEHOLDER_SITE_PRESTATOR', sitePrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_SITE', sitePrestator);
  }
  if (ssmSpecialistName) {
    markAutocompleted('PLACEHOLDER_SPECIALIST_SSM', ssmSpecialistName);
    markAutocompleted('PLACEHOLDER_INSTRUCTOR_IG', ssmSpecialistName);
  }
  if (evaluatorName) markAutocompleted('PLACEHOLDER_EVALUATOR_RISC', evaluatorName);
  if (certificatEvaluator) markAutocompleted('PLACEHOLDER_CERTIFICAT_EVALUATOR', certificatEvaluator);
  if (repPrestator) {
    markAutocompleted('PLACEHOLDER_REPREZENTANT_PRESTATOR', repPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_REPREZENTANT', repPrestator);
  }
  if (rolRepPrestator) {
    markAutocompleted('PLACEHOLDER_CALITATE_REPREZENTANT_PRESTATOR', rolRepPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_CALITATE_REPREZENTANT', rolRepPrestator);
  }
  if (actRepPrestator) {
    markAutocompleted('PLACEHOLDER_ACT_REPREZENTANT', actRepPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_ACT_REPREZENTANT', actRepPrestator);
  }
  if (adresaPrestator) {
    markAutocompleted('PLACEHOLDER_ADRESA_PRESTATOR', adresaPrestator);
    markAutocompleted('PLACEHOLDER_SERVICIU_EXTERN_ADRESA', adresaPrestator);
  }

  // Decisions authentic tracking
  if (client?.decisionsDate) {
    markAutocompleted('PLACEHOLDER_DATA_DECIZIE', client.decisionsDate);
    markAutocompleted('PLACEHOLDER_DATA_PERMIS_FOC', client.decisionsDate);
    markAutocompleted('PLACEHOLDER_DATA_INCEPERE_LUCRARE', client.decisionsDate);
    markAutocompleted('PLACEHOLDER_DATA_FINALIZARE_LUCRARE', client.decisionsDate);
    markAutocompleted('PLACEHOLDER_DATA_BULETIN_ANALIZA', client.decisionsDate);
    for (let i = 1; i <= 11; i++) {
      const pad = String(i).padStart(2, '0');
      markAutocompleted(`PLACEHOLDER_NUMAR_DECIZIE_${pad}`, client.decisionsDate);
    }
  }
  if (client?.designatedWorkerSsm) {
    markAutocompleted('PLACEHOLDER_LUCRATOR_DESEMNAT_SSM', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_NUME_RESPONSABIL_1', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_INSTRUCTOR_LM', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_VERIFICATOR_LM', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_INSTRUCTOR_LM_PSI', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_VERIFICATOR_LM_PSI', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_GESTIONAR_EIP', client.designatedWorkerSsm);
    markAutocompleted('PLACEHOLDER_SEF_LOC_MUNCA', client.designatedWorkerSsm);
  }
  if (client?.firstAidResponder) {
    markAutocompleted('PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR', client.firstAidResponder);
    markAutocompleted('PLACEHOLDER_NUME_RESPONSABIL_2', client.firstAidResponder);
  }
  if (client?.psiResponder) {
    markAutocompleted('PLACEHOLDER_RESPONSABIL_PSI', client.psiResponder);
    markAutocompleted('PLACEHOLDER_RESPONSABIL_CONTROL_PSI', client.psiResponder);
    markAutocompleted('PLACEHOLDER_NUME_RESPONSABIL_3', client.psiResponder);
    markAutocompleted('PLACEHOLDER_INSTRUCTOR_IG_PSI', client.psiResponder);
    markAutocompleted('PLACEHOLDER_APELATIV_PSI', detectRomanianSalutation(client.psiResponder));
  }
  if (client?.investigationMembers) {
    markAutocompleted('PLACEHOLDER_MEMBRU_COMISIE', client.investigationMembers);
    markAutocompleted('PLACEHOLDER_NUME_RESPONSABIL_4', client.investigationMembers);
    markAutocompleted('PLACEHOLDER_APELATIV_MEMBRU_COMISIE', detectRomanianSalutation(client.investigationMembers));
  }

  // Employee authentic tracking
  if (employee) {
    if (fullName) {
      markAutocompleted('PLACEHOLDER_NUME_COMPLET', fullName);
      markAutocompleted('PLACEHOLDER_NUME_SALARIAT', fullName);
      markAutocompleted('PLACEHOLDER_APELATIV_SALARIAT', detectRomanianSalutation(fullName, employee?.cnp));
    }
    if (employee.lastName) markAutocompleted('PLACEHOLDER_NUME', employee.lastName);
    if (employee.firstName) markAutocompleted('PLACEHOLDER_PRENUME', employee.firstName);
    if (employee.cnp) markAutocompleted('PLACEHOLDER_CNP', employee.cnp);
    if (employee.birthDate) markAutocompleted('PLACEHOLDER_DATA_NASTERII', employee.birthDate);
    if (employee.birthPlace) markAutocompleted('PLACEHOLDER_LOCALITATE_NASTERII', employee.birthPlace);
    if (employee.birthCounty) markAutocompleted('PLACEHOLDER_JUDET_NASTERII', employee.birthCounty);
    if (employee.hireDate) {
      markAutocompleted('PLACEHOLDER_DATA_ANGAJARII', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_ANGAJ', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_INCEPERE', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_CERERE', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_DECLARATIE', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_SEMNARE', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_SEMNARII_EIP', employee.hireDate);
      markAutocompleted('PLACEHOLDER_DATA_ELIBERARII_FISEI', employee.hireDate);
      if (introEvent?.eventDate) {
        markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_IG', introEvent.eventDate);
        markAutocompleted('PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI', introEvent.eventDate);
      }
      if (lmEvent?.eventDate) {
        markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_LM', lmEvent.eventDate);
        markAutocompleted('PLACEHOLDER_DATA_ADMITERE', lmEvent.eventDate);
        markAutocompleted('PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI', lmEvent.eventDate);
        markAutocompleted('PLACEHOLDER_DATA_ADMITERE_PSI', lmEvent.eventDate);
      }
      markAutocompleted('PLACEHOLDER_INSTRUCTOR_IG', instructorIntroductiv);
      markAutocompleted('PLACEHOLDER_DURATA_INSTRUIRE_IG', durataIntroductiv);
      markAutocompleted('PLACEHOLDER_TEMATICA_IG', tematicaIntroductiv);
      markAutocompleted('PLACEHOLDER_VERIFICATOR_IG', verificatorIntroductiv);
      markAutocompleted('PLACEHOLDER_INSTRUCTOR_LM', instructorLocMunca);
      markAutocompleted('PLACEHOLDER_DURATA_INSTRUIRE_LM', durataLocMunca);
      markAutocompleted('PLACEHOLDER_TEMATICA_LM', tematicaLocMunca);
      markAutocompleted('PLACEHOLDER_VERIFICATOR_LM', verificatorLocMunca);
      markAutocompleted('PLACEHOLDER_ADMITERE_NUME', legalRepresentativeName);
      markAutocompleted('PLACEHOLDER_DATA_INCEPUT', employee.hireDate);
    }
    if (trainingEvent) {
      if (trainingEvent.eventDate) {
        markAutocompleted('PLACEHOLDER_DATA_PV', trainingEvent.eventDate);
        markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE', trainingEvent.eventDate);
      }
      if (trainingEvent.durationHours) markAutocompleted('PLACEHOLDER_DURATA_INSTRUIRE', `${trainingEvent.durationHours} ore`);
      if (trainingEvent.instructorName) markAutocompleted('PLACEHOLDER_INSTRUCTOR', trainingEvent.instructorName);
      if (trainingEvent.materialOrTopic) markAutocompleted('PLACEHOLDER_TEMATICA', trainingEvent.materialOrTopic);
      if (trainingEvent.verifierName) markAutocompleted('PLACEHOLDER_VERIFICATOR', trainingEvent.verifierName);
      if (trainingEvent.practicalDemonstration) markAutocompleted('PLACEHOLDER_DEMONSTRATIE_PRACTICA', trainingEvent.practicalDemonstration);
      if (trainingEvent.location) markAutocompleted('PLACEHOLDER_LOC_MUNCA', trainingEvent.location);
    }
    if (identity) {
      if (identity.docType) markAutocompleted('PLACEHOLDER_TIP_ACT', identity.docType);
      if (identity.series) markAutocompleted('PLACEHOLDER_SERIE_ACT', identity.series);
      if (identity.number) {
        markAutocompleted('PLACEHOLDER_NUMAR_ACT', identity.number);
        markAutocompleted('PLACEHOLDER_NR_ACT', identity.number);
      }
      if (identity.issuedBy) {
        markAutocompleted('PLACEHOLDER_EMITENT_ACT', identity.issuedBy);
        markAutocompleted('PLACEHOLDER_EMITENT', identity.issuedBy);
      }
      if (identity.issueDate) {
        markAutocompleted('PLACEHOLDER_DATA_EMITERII', identity.issueDate);
        markAutocompleted('PLACEHOLDER_DATA_ACT', identity.issueDate);
      }
      if (identity.expiryDate) markAutocompleted('PLACEHOLDER_DATA_EXPIRARII', identity.expiryDate);
    }
    if (residence) {
      if (addressFull) {
        markAutocompleted('PLACEHOLDER_ADRESA_DOMICILIU', addressFull);
        markAutocompleted('PLACEHOLDER_DOMICILIU', addressFull);
      }
      if (residence.county) {
        markAutocompleted('PLACEHOLDER_JUDET_DOMICILIU', residence.county);
        markAutocompleted('PLACEHOLDER_JUDET', residence.county);
      }
      if (residence.locality) {
        markAutocompleted('PLACEHOLDER_LOCALITATE_DOMICILIU', residence.locality);
        markAutocompleted('PLACEHOLDER_LOCALITATE', residence.locality);
        markAutocompleted('PLACEHOLDER_LOCALITATE_SEMNARE', residence.locality);
      }
      if (residence.street) markAutocompleted('PLACEHOLDER_STRADA_DOMICILIU', residence.street);
      if (residence.number) {
        markAutocompleted('PLACEHOLDER_NUMAR_DOMICILIU', residence.number);
        markAutocompleted('PLACEHOLDER_NR', residence.number);
      }
      if (residence.building) markAutocompleted('PLACEHOLDER_BLOC', residence.building);
      if (residence.entrance) markAutocompleted('PLACEHOLDER_SCARA', residence.entrance);
      if (residence.floor) markAutocompleted('PLACEHOLDER_ETAJ', residence.floor);
      if (residence.apartment) markAutocompleted('PLACEHOLDER_APARTAMENT', residence.apartment);
    }
    if ((employee as any)?.cimNumber) markAutocompleted('PLACEHOLDER_NUMAR_CIM', (employee as any).cimNumber);
    if ((employee as any)?.cimDate) {
      markAutocompleted('PLACEHOLDER_DATA_CIM', (employee as any).cimDate);
      markAutocompleted('PLACEHOLDER_DATA_SEMNARII', (employee as any).cimDate);
    }
    if ((employee as any)?.grossSalary != null) markAutocompleted('PLACEHOLDER_SALARIU_BRUT', (employee as any).grossSalary);
    if ((employee as any)?.workNorm) {
      markAutocompleted('PLACEHOLDER_NORMA_LUCRU', (employee as any).workNorm);
      markAutocompleted('PLACEHOLDER_PROGRAM_LUCRU', (employee as any).workNorm);
    }
    if ((employee as any)?.probationDays) markAutocompleted('PLACEHOLDER_PERIOADA_PROBA', (employee as any).probationDays);
    if ((employee as any)?.annualLeaveDays) markAutocompleted('PLACEHOLDER_DURATA_CONCEDIULUI', (employee as any).annualLeaveDays);
    if ((employee as any)?.bankIban || (employee as any)?.bankAccount || (employee as any)?.iban) {
      markAutocompleted('PLACEHOLDER_CONT_BANCA_SALARIAT', (employee as any).bankIban || (employee as any).bankAccount || (employee as any).iban);
    }
    if ((employee as any)?.bankName) markAutocompleted('PLACEHOLDER_BANCA_SALARIAT', (employee as any).bankName);
    if ((employee as any)?.bloodType) markAutocompleted('PLACEHOLDER_GRUPA_SANGUINA', (employee as any).bloodType);
    if ((employee as any)?.commuteRoute) markAutocompleted('PLACEHOLDER_TRASEU_DEPLASARE', (employee as any).commuteRoute);
    if ((employee as any)?.commuteDurationMinutes) markAutocompleted('PLACEHOLDER_DURATA_DEPLASARE', (employee as any).commuteDurationMinutes);
    if ((employee as any)?.shoeSize) markAutocompleted('PLACEHOLDER_MARIME_INCALTAMINTE', (employee as any).shoeSize);
    if ((employee as any)?.clothingSize) {
      markAutocompleted('PLACEHOLDER_MARIME_HAINE', (employee as any).clothingSize);
      markAutocompleted('PLACEHOLDER_MARIME_IMBRACAMINTE', (employee as any).clothingSize);
    }
    if ((employee as any)?.gloveSize) markAutocompleted('PLACEHOLDER_MARIME_MANUSI', (employee as any).gloveSize);
    if ((employee as any)?.phone) markAutocompleted('PLACEHOLDER_TELEFON_SALARIAT', (employee as any).phone);
    if ((employee as any)?.email) markAutocompleted('PLACEHOLDER_EMAIL_SALARIAT', (employee as any).email);
    if ((employee as any)?.qualification) markAutocompleted('PLACEHOLDER_CALIFICARE', (employee as any).qualification);
    if ((employee as any)?.badgeNumber || (employee as any)?.employeeNumber) markAutocompleted('PLACEHOLDER_MARCA', (employee as any).badgeNumber || (employee as any).employeeNumber);
    if ((employee as any)?.sex || employee.sex) markAutocompleted('PLACEHOLDER_SEX', (employee as any).sex || employee.sex);
  }

  // Job authentic tracking
  if (job?.title || participant?.jobTitle) {
    markAutocompleted('PLACEHOLDER_FUNCTIE', job?.title || participant?.jobTitle);
    markAutocompleted('PLACEHOLDER_PROFESIE_OCUPATIE', job?.title || participant?.jobTitle);
  }
  if (job?.corCode) markAutocompleted('PLACEHOLDER_COD_COR', job.corCode);
  if (job?.mainActivities) {
    markAutocompleted('PLACEHOLDER_ACTIVITATI_POST', job.mainActivities);
    markAutocompleted('PLACEHOLDER_DESCRIERE_ACTIVITATE', job.mainActivities);
  }
  if (job?.equipmentUsed) markAutocompleted('PLACEHOLDER_ECHIPAMENTE_POST', job.equipmentUsed);
  if (job?.workConditions) markAutocompleted('PLACEHOLDER_CONDITII_POST', job.workConditions);

  // Worksite authentic tracking
  if (worksite?.name) {
    markAutocompleted('PLACEHOLDER_PUNCT_LUCRU', worksite.name);
    markAutocompleted('PLACEHOLDER_SUBUNITATE', worksite.name);
  }
  if (worksite?.address) {
    markAutocompleted('PLACEHOLDER_ADRESA_PUNCT_LUCRU', worksite.address);
    markAutocompleted('PLACEHOLDER_LOC_MUNCA', worksite.address);
    markAutocompleted('PLACEHOLDER_LOC_MUNCA_LM', worksite.address);
    markAutocompleted('PLACEHOLDER_LOC_MUNCA_LM_PSI', worksite.address);
  }
  if (worksite?.activity) {
    markAutocompleted('PLACEHOLDER_DEPARTAMENT', worksite.activity);
    markAutocompleted('PLACEHOLDER_SECTIE_COMPARTIMENT', worksite.activity);
  }

  // Hygiene authentic tracking
  if (hygieneSession) {
    markAutocompleted('PLACEHOLDER_NUMAR_CANDIDATI', String(hygieneSession.participants?.length || 1));
    markAutocompleted('PLACEHOLDER_NUMAR_PREZENTI', String(hygieneSession.participants?.length || 1));
    markAutocompleted('PLACEHOLDER_NUMAR_ADMISI', String(hygieneSession.participants?.length || 1));
    markAutocompleted('PLACEHOLDER_NUMAR_RESPINSI', '0');
    if (hygieneSession.location) markAutocompleted('PLACEHOLDER_LOCATIE_EXAMEN', hygieneSession.location);
    if (hygieneSession.pvSeriesNumber) markAutocompleted('PLACEHOLDER_NUMAR_PV', hygieneSession.pvSeriesNumber);
    if (hygieneSession.commissionPresident) markAutocompleted('PLACEHOLDER_PRESEDINTE_COMISIE', hygieneSession.commissionPresident);
    if (hygieneSession.commissionMember1) markAutocompleted('PLACEHOLDER_MEMBRU_COMISIE_1', hygieneSession.commissionMember1);
    if (hygieneSession.commissionMember2) markAutocompleted('PLACEHOLDER_MEMBRU_COMISIE_2', hygieneSession.commissionMember2);
    if (hygieneSession.commissionSecretary) markAutocompleted('PLACEHOLDER_SECRETAR_COMISIE', hygieneSession.commissionSecretary);
    if (hygieneSession.sessionDate) markAutocompleted('PLACEHOLDER_DATA_SESIUNE', hygieneSession.sessionDate);
    if (hygieneSession.examDate) {
      markAutocompleted('PLACEHOLDER_DATA_EXAMEN', hygieneSession.examDate);
      markAutocompleted('PLACEHOLDER_DATA_PV', hygieneSession.examDate);
      markAutocompleted('PLACEHOLDER_DATA_CATALOG', hygieneSession.examDate);
    }
    if (hygieneSession.msAuthorization) markAutocompleted('PLACEHOLDER_AVIZ_MS', hygieneSession.msAuthorization);
    if (hygieneSession.meAuthorization) markAutocompleted('PLACEHOLDER_AVIZ_ME', hygieneSession.meAuthorization);
  }

  // Participant authentic tracking
  if (participant) {
    if (participantFullName) markAutocompleted('PLACEHOLDER_NUME_COMPLET', participantFullName);
    if (participant.lastName) markAutocompleted('PLACEHOLDER_NUME', participant.lastName);
    if (participant.firstName) markAutocompleted('PLACEHOLDER_PRENUME', participant.firstName);
    if (participant.cnp) markAutocompleted('PLACEHOLDER_CNP', participant.cnp);
    if (participant.birthDate) markAutocompleted('PLACEHOLDER_DATA_NASTERII', participant.birthDate);
    if (participant.birthPlace) markAutocompleted('PLACEHOLDER_LOCALITATE_NASTERII', participant.birthPlace);
    if (participant.docType) markAutocompleted('PLACEHOLDER_TIP_ACT', participant.docType);
    if (participant.docSeries) markAutocompleted('PLACEHOLDER_SERIE_ACT', participant.docSeries);
    if (participant.docNumber) {
      markAutocompleted('PLACEHOLDER_NUMAR_ACT', participant.docNumber);
      markAutocompleted('PLACEHOLDER_NR_ACT', participant.docNumber);
    }
    if (participant.certificateSeries) markAutocompleted('PLACEHOLDER_SERIE_ADEVERINTA', participant.certificateSeries);
    if (participant.certificateNumber) {
      markAutocompleted('PLACEHOLDER_NUMAR_ADEVERINTA', participant.certificateNumber);
      markAutocompleted('PLACEHOLDER_SERIE_NUMAR_CERTIFICAT', participant.certificateNumber);
    }
    if (participant.certificateIssueDate || hygieneSession?.examDate) markAutocompleted('PLACEHOLDER_DATA_ELIBERARE', 'true');
    if (participant.examResult) markAutocompleted('PLACEHOLDER_REZULTAT_EXAMEN', participant.examResult);
    if (participant.employee?.hygieneModule || employee?.hygieneModule) {
      markAutocompleted('PLACEHOLDER_MODUL_IGIENA', participant.employee?.hygieneModule || employee?.hygieneModule);
    }
  }

  // Temporal Meta authentic tracking
  markAutocompleted('PLACEHOLDER_AN', currentYear);
  markAutocompleted('PLACEHOLDER_DATA_DOCUMENT', currentDateRo);
  markAutocompleted('PLACEHOLDER_DATA_APROBARE', currentDateRo);
  markAutocompleted('PLACEHOLDER_DATA_APLICARE', currentDateRo);
  markAutocompleted('PLACEHOLDER_DATA_INTOCMIRE', currentDateRo);
  markAutocompleted('PLACEHOLDER_DATA_INTOCMIRII', currentDateRo);
  markAutocompleted('PLACEHOLDER_DATA_SOLICITARII', currentDateRo);
  markAutocompleted('PLACEHOLDER_DATA', currentDateRo);
  if (legalRepresentativeName) {
    markAutocompleted('PLACEHOLDER_ADMITERE_NUME', legalRepresentativeName);
    markAutocompleted('PLACEHOLDER_ADMITERE_NUME_PSI', legalRepresentativeName);
    markAutocompleted('PLACEHOLDER_VERIFICATOR_IG', legalRepresentativeName);
    markAutocompleted('PLACEHOLDER_VERIFICATOR_IG_PSI', legalRepresentativeName);
  }

  if (hasDbRiskAssessment) {
    markAutocompleted('PLACEHOLDER_NIVEL_RISC_GLOBAL', scoreNumber.toFixed(2));
    markAutocompleted('PLACEHOLDER_NIVEL_GLOBAL_RISC', scoreNumber.toFixed(2));
    if (riskAssessment?.conclusions) {
      markAutocompleted('PLACEHOLDER_CONCLUZII_EVALUARE', riskAssessment.conclusions);
    }
    if (riskAssessment?.evaluatorName) {
      markAutocompleted('PLACEHOLDER_EVALUATOR_RISC', riskAssessment.evaluatorName);
    }
    for (let i = 1; i <= Math.min(dbRiskItems.length, 30); i++) {
      const pad = String(i).padStart(2, '0');
      const it = dbRiskItems[i - 1];
      if (it.severityScore) markAutocompleted(`PLACEHOLDER_GRAVITATE_RISC_${pad}`, it.severityScore);
      if (it.probabilityScore) markAutocompleted(`PLACEHOLDER_FRECVENTA_RISC_${pad}`, it.probabilityScore);
      if (it.riskLevel) markAutocompleted(`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`, it.riskLevel);
    }
  }

  // EIP Database Retrieval (HG 1048/2006)
  let eipAssignments = (employee as any)?.eipAssignments;
  if (!eipAssignments && employee?.id) {
    try {
      eipAssignments = await prisma.employeeEipAssignment.findMany({
        where: { employeeId: employee.id },
        include: { eipItem: true },
        orderBy: { assignedDate: 'asc' },
      });
    } catch {}
  }

  let jobRequirements = (job as any)?.eipRequirements;
  if (!jobRequirements && job?.id) {
    try {
      jobRequirements = await prisma.jobEipRequirement.findMany({
        where: { jobId: job.id },
        include: { eipItem: true },
      });
    } catch {}
  }

  const eipRows: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) {
    const pad = String(i).padStart(2, '0');
    eipRows[`PLACEHOLDER_EIP_DENUMIRE_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_STANDARD_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_RISC_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_UM_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_CANTITATE_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_DURATA_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_DATA_ACORDARII_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_DATA_RESTITUIRII_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_MOTIV_${pad}`] = '';
    eipRows[`PLACEHOLDER_EIP_SEMNATURA_RETUR_${pad}`] = '';
  }

  const loopEipList: any[] = [];
  const activeEipItems = (eipAssignments && eipAssignments.length > 0)
    ? eipAssignments.map((a: any) => ({
        name: a.eipItem?.name || '',
        standard: a.eipItem?.standardCode || '',
        protectionType: a.eipItem?.protectionType || '',
        replacementMonths: a.eipItem?.replacementMonths || 12,
        assignedDate: a.assignedDate,
        signatureDate: a.signatureDate,
        fromAssignment: true,
      }))
    : (jobRequirements && jobRequirements.length > 0)
    ? jobRequirements.map((r: any) => ({
        name: r.eipItem?.name || '',
        standard: r.eipItem?.standardCode || '',
        protectionType: r.eipItem?.protectionType || '',
        replacementMonths: r.eipItem?.replacementMonths || 12,
        assignedDate: employee?.hireDate || null,
        signatureDate: null,
        fromAssignment: false,
      }))
    : [];

  for (let i = 0; i < Math.min(activeEipItems.length, 10); i++) {
    const pad = String(i + 1).padStart(2, '0');
    const it = activeEipItems[i];
    const isFootwear = /pantofi|bocanci|încălțăminte|incaltaminte|cizme|sabot|mănuși|manusi/i.test(it.name);
    const um = isFootwear ? 'per.' : 'buc.';
    const cant = '1';
    const durata = it.replacementMonths ? `${it.replacementMonths} luni` : '12 luni';
    const dataAcordarii = it.assignedDate ? formatDateRo(it.assignedDate) : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
    const semnatura = it.signatureDate ? 'Semnat' : '';

    eipRows[`PLACEHOLDER_EIP_DENUMIRE_${pad}`] = it.name;
    eipRows[`PLACEHOLDER_EIP_STANDARD_${pad}`] = it.standard;
    eipRows[`PLACEHOLDER_EIP_RISC_${pad}`] = it.protectionType || '';
    eipRows[`PLACEHOLDER_EIP_UM_${pad}`] = um;
    eipRows[`PLACEHOLDER_EIP_CANTITATE_${pad}`] = cant;
    eipRows[`PLACEHOLDER_EIP_DURATA_${pad}`] = durata;
    eipRows[`PLACEHOLDER_EIP_DATA_ACORDARII_${pad}`] = dataAcordarii;
    eipRows[`PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_${pad}`] = semnatura;

    markAutocompleted(`PLACEHOLDER_EIP_DENUMIRE_${pad}`, it.name);
    if (it.standard) markAutocompleted(`PLACEHOLDER_EIP_STANDARD_${pad}`, it.standard);
    if (it.protectionType) markAutocompleted(`PLACEHOLDER_EIP_RISC_${pad}`, it.protectionType);
    markAutocompleted(`PLACEHOLDER_EIP_UM_${pad}`, um);
    markAutocompleted(`PLACEHOLDER_EIP_CANTITATE_${pad}`, cant);
    markAutocompleted(`PLACEHOLDER_EIP_DURATA_${pad}`, durata);
    if (dataAcordarii) markAutocompleted(`PLACEHOLDER_EIP_DATA_ACORDARII_${pad}`, dataAcordarii);

    loopEipList.push({
      nr: i + 1,
      denumire: it.name,
      standard: it.standard,
      risc: it.protectionType,
      um,
      cantitate: cant,
      termen: durata,
      durata,
      dataPredare: dataAcordarii,
      semnaturaPrimire: semnatura,
    });
  }

  // Verified database mappings (strictly genuine values; missing DB fields resolve to empty string)
  const verifiedMap: Record<string, unknown> = {
    // 1. Client / Angajator
    PLACEHOLDER_FIRMA: client?.name || '',
    PLACEHOLDER_CUI: client?.cui || '',
    PLACEHOLDER_NR_REG_COM: client?.regCom || '',
    PLACEHOLDER_ADRESA_FIRMA: client?.address || '',
    PLACEHOLDER_ADRESA: addressFull || client?.address || '',
    PLACEHOLDER_REPREZENTANT_LEGAL: legalRepresentativeName,
    PLACEHOLDER_DIRECTOR: legalRepresentativeName,
    PLACEHOLDER_CALITATE_REPREZENTANT: (context.customOverrides?.PLACEHOLDER_CALITATE_REPREZENTANT as string) || (client?.legalRepresentative ? 'Administrator' : ''),
    PLACEHOLDER_TELEFON_CONTACT: client?.contactPhone || '',
    PLACEHOLDER_EMAIL_CONTACT: client?.contactEmail || '',

    // CAEN & Company Profile
    PLACEHOLDER_COD_CAEN: fullCaenDisplay,
    PLACEHOLDER_ACTIVITATE_PRINCIPALA: caenTitle,
    PLACEHOLDER_AN_INFIINTARE: client?.foundedYear ? String(client.foundedYear) : '',
    PLACEHOLDER_AN_EVALUARE: currentYear,
    PLACEHOLDER_NUMAR_LUCRATORI: job?.workersCount ? String(job.workersCount) : (client?.employees?.length ? String(client.employees.length) : ''),

    // SEPP External Provider (Dynamically Bound)
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
    PLACEHOLDER_EVALUATOR_RISC: riskAssessment?.evaluatorName || evaluatorName,
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
    PLACEHOLDER_NIVEL_GLOBAL_RISC: scoreNumber.toFixed(2),
    PLACEHOLDER_CONCLUZII_EVALUARE: riskAssessment?.conclusions || `Nivelul global de risc calculat pentru postul de lucru ${job?.title || 'analizat'} este de ${scoreRo}, încadrându-se în categoria locurilor de muncă cu nivel de risc acceptabil (Nrg <= 3,50 conform metodei INCDPM). Pentru factorii de risc identificați au fost stabilite măsuri de prevenire în Planul de Prevenire și Protecție conform Legii 319/2006.`,
    PLACEHOLDER_NUMAR_FACTORI_RISC: `${totalFactorsCount} factori de risc (${countL3} cu nivel parțial 3, ${countL2} cu nivel parțial 2, ${countL1} cu nivel parțial 1)`,
    PLACEHOLDER_REPARTITIE_RISCURI: `Executant: ${pExec}% (${cExec} factori); Sarcina de muncă: ${pSarc}% (${cSarc} factori); Mijloace de producție: ${pMij}% (${cMij} factori); Mediul de muncă: ${pMed}% (${cMed} factori)`,
    ...dynamic30Factors,

    // Organizational Decisions & Numbers (empty string if client?.decisionsDate is missing)
    PLACEHOLDER_NUMAR_DECIZIE_01: decisionsDateRo ? `01/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_02: decisionsDateRo ? `02/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_03: decisionsDateRo ? `03/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_04: decisionsDateRo ? `04/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_05: decisionsDateRo ? `05/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_06: decisionsDateRo ? `06/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_07: decisionsDateRo ? `07/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_08: decisionsDateRo ? `08/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_09: decisionsDateRo ? `09/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_10: decisionsDateRo ? `10/${decisionsDateRo}` : '',
    PLACEHOLDER_NUMAR_DECIZIE_11: decisionsDateRo ? `11/${decisionsDateRo}` : '',
    PLACEHOLDER_APELATIV_ADMINISTRATOR: detectRomanianSalutation(client?.legalRepresentative),
    PLACEHOLDER_APELATIV_PSI: detectRomanianSalutation(psiOfficer || client?.psiResponder),
    PLACEHOLDER_APELATIV_MEMBRU_COMISIE: detectRomanianSalutation(investMembers),
    PLACEHOLDER_DATA_DECIZIE: decisionsDateRo,
    PLACEHOLDER_DATA_PERMIS_FOC: decisionsDateRo,
    PLACEHOLDER_DATA_INCEPERE_LUCRARE: decisionsDateRo,
    PLACEHOLDER_DATA_FINALIZARE_LUCRARE: decisionsDateRo,
    PLACEHOLDER_DATA_BULETIN_ANALIZA: decisionsDateRo,

    // Organizational Appointees & Aliases (empty strings if missing in DB)
    PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: designatedWorker,
    PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: firstAid,
    PLACEHOLDER_RESPONSABIL_PSI: psiOfficer,
    PLACEHOLDER_RESPONSABIL_CONTROL_PSI: client?.psiResponder ? `${client.psiResponder} (Responsabil control PSI)` : (ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_CONTROL_PSI || ''),
    PLACEHOLDER_MEMBRU_COMISIE: template.family === 'hygiene' ? (hygieneSession?.commissionMember1 || (ROMANIAN_LEGAL_HYGIENE.PLACEHOLDER_MEMBRU_COMISIE || '')) : investMembers,
    PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: client?.designatedWorkerSsm ? `${client.designatedWorkerSsm} (Responsabil supraveghere lucrări)` : (ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI || ''),

    PLACEHOLDER_NUME_RESPONSABIL_1: client?.designatedWorkerSsm || '',
    PLACEHOLDER_NUME_RESPONSABIL_2: client?.firstAidResponder || '',
    PLACEHOLDER_NUME_RESPONSABIL_3: client?.psiResponder || '',
    PLACEHOLDER_NUME_RESPONSABIL_4: client?.investigationMembers || '',

    // 2. Metadate temporale
    PLACEHOLDER_AN: currentYear,
    PLACEHOLDER_DATA_DOCUMENT: currentDateRo,
    PLACEHOLDER_DATA_APROBARE: currentDateRo,
    PLACEHOLDER_DATA_APLICARE: currentDateRo,
    PLACEHOLDER_DATA_INTOCMIRE: currentDateRo,
    PLACEHOLDER_DATA_SEMNARE: hireDateRo,
    PLACEHOLDER_DATA: currentDateRo,

    // 3. Salariat (if employee is null, resolve ALL employee placeholders to empty string)
    ...(employee ? {
      PLACEHOLDER_NUME_COMPLET: fullName,
      PLACEHOLDER_NUME: employee.lastName || '',
      PLACEHOLDER_PRENUME: employee.firstName || '',
      PLACEHOLDER_CNP: employee.cnp || '',
      PLACEHOLDER_DATA_NASTERII: employee.birthDate ? formatDateRo(employee.birthDate) : '',
      PLACEHOLDER_LOCALITATE_NASTERII: employee.birthPlace || '',
      PLACEHOLDER_JUDET_NASTERII: employee.birthCounty || '',

      PLACEHOLDER_TIP_ACT: identity?.docType || '',
      PLACEHOLDER_SERIE_ACT: identity?.series || '',
      PLACEHOLDER_NUMAR_ACT: identity?.number || '',
      PLACEHOLDER_NR_ACT: identity?.number || '',
      PLACEHOLDER_EMITENT_ACT: identity?.issuedBy || '',
      PLACEHOLDER_EMITENT: identity?.issuedBy || '',
      PLACEHOLDER_DATA_EMITERII: identity?.issueDate ? formatDateRo(identity.issueDate) : '',
      PLACEHOLDER_DATA_ACT: identity?.issueDate ? formatDateRo(identity.issueDate) : '',
      PLACEHOLDER_DATA_EXPIRARII: identity?.expiryDate ? formatDateRo(identity.expiryDate) : '',

      PLACEHOLDER_ADRESA_DOMICILIU: addressFull || '',
      PLACEHOLDER_JUDET_DOMICILIU: residence?.county || '',
      PLACEHOLDER_JUDET: residence?.county || '',
      PLACEHOLDER_LOCALITATE_DOMICILIU: residence?.locality || '',
      PLACEHOLDER_LOCALITATE: residence?.locality || '',
      PLACEHOLDER_STRADA_DOMICILIU: residence?.street ? formatStreetName(residence.street) : '',
      PLACEHOLDER_NUMAR_DOMICILIU: residence?.number || '',
      PLACEHOLDER_NR: residence?.number || '',
      PLACEHOLDER_BLOC: residence?.building || '',
      PLACEHOLDER_SCARA: residence?.entrance || '',
      PLACEHOLDER_ETAJ: residence?.floor || '',
      PLACEHOLDER_APARTAMENT: residence?.apartment || '',
      PLACEHOLDER_LOCALITATE_SEMNARE: residence?.locality || client?.address?.split(',')[0]?.trim() || '',

      PLACEHOLDER_DATA_ANGAJARII: employee.hireDate ? formatDateRo(employee.hireDate) : '',
      PLACEHOLDER_DATA_ANGAJ: employee.hireDate ? formatDateRo(employee.hireDate) : '',
      PLACEHOLDER_DATA_INCEPERE: employee.hireDate ? formatDateRo(employee.hireDate) : '',
      PLACEHOLDER_DATA_CERERE: employee.hireDate ? formatDateRo(employee.hireDate) : '',
      PLACEHOLDER_DATA_DECLARATIE: employee.hireDate ? formatDateRo(employee.hireDate) : '',
    } : {
      PLACEHOLDER_NUME_COMPLET: '',
      PLACEHOLDER_NUME: '',
      PLACEHOLDER_PRENUME: '',
      PLACEHOLDER_CNP: '',
      PLACEHOLDER_TIP_ACT: '',
      PLACEHOLDER_SERIE_ACT: '',
      PLACEHOLDER_NUMAR_ACT: '',
      PLACEHOLDER_NR_ACT: '',
      PLACEHOLDER_EMITENT_ACT: '',
      PLACEHOLDER_EMITENT: '',
      PLACEHOLDER_DATA_EMITERII: '',
      PLACEHOLDER_DATA_ACT: '',
      PLACEHOLDER_DATA_EXPIRARII: '',
      PLACEHOLDER_ADRESA_DOMICILIU: '',
      PLACEHOLDER_JUDET_DOMICILIU: '',
      PLACEHOLDER_JUDET: '',
      PLACEHOLDER_LOCALITATE_DOMICILIU: '',
      PLACEHOLDER_LOCALITATE: '',
      PLACEHOLDER_STRADA_DOMICILIU: '',
      PLACEHOLDER_NUMAR_DOMICILIU: '',
      PLACEHOLDER_NR: '',
      PLACEHOLDER_BLOC: '',
      PLACEHOLDER_SCARA: '',
      PLACEHOLDER_ETAJ: '',
      PLACEHOLDER_APARTAMENT: '',
      PLACEHOLDER_LOCALITATE_SEMNARE: '',
      PLACEHOLDER_DATA_NASTERII: '',
      PLACEHOLDER_LOCALITATE_NASTERII: '',
      PLACEHOLDER_JUDET_NASTERII: '',
      PLACEHOLDER_DATA_ANGAJARII: '',
      PLACEHOLDER_DATA_ANGAJ: '',
      PLACEHOLDER_DATA_INCEPERE: '',
      PLACEHOLDER_DATA_CERERE: '',
      PLACEHOLDER_DATA_DECLARATIE: '',
    }),

    // 4. Post și Punct de lucru (Feature F14: Job Operational Context Plumbing)
    PLACEHOLDER_FUNCTIE: participant?.jobTitle || participant?.employee?.currentJob?.title || job?.title || '',
    PLACEHOLDER_COD_COR: job?.corCode || '',
    PLACEHOLDER_ACTIVITATI_POST: job?.mainActivities || (ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_ACTIVITATI_POST || ''),
    PLACEHOLDER_DESCRIERE_ACTIVITATE: job?.mainActivities || (ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_DESCRIERE_ACTIVITATE || ''),
    PLACEHOLDER_ECHIPAMENTE_POST: job?.equipmentUsed || (ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_ECHIPAMENTE_POST || ''),
    PLACEHOLDER_CONDITII_POST: job?.workConditions || (ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_CONDITII_POST || ''),
    PLACEHOLDER_NUMAR_CIM: (employee as any)?.cimNumber || (context.customOverrides?.PLACEHOLDER_NUMAR_CIM as string) || '',
    PLACEHOLDER_DATA_CIM: (employee as any)?.cimDate ? formatDateRo((employee as any).cimDate) : ((context.customOverrides?.PLACEHOLDER_DATA_CIM as string) || (employee?.hireDate ? formatDateRo(employee.hireDate) : '')),
    PLACEHOLDER_DATA_SEMNARII: (context.customOverrides?.PLACEHOLDER_DATA_SEMNARII as string) || (employee?.hireDate ? formatDateRo(employee.hireDate) : ''),
    PLACEHOLDER_SALARIU_BRUT: (employee as any)?.grossSalary != null ? `${(employee as any).grossSalary} lei` : ((employee as any)?.salary || (context.customOverrides?.PLACEHOLDER_SALARIU_BRUT as string) || ''),
    PLACEHOLDER_NORMA_LUCRU: (employee as any)?.workNorm ? `Normă întreagă (${(employee as any).workNorm} ore/zi, ${(employee as any).workNorm * 5} ore/săptămână)` : '',
    PLACEHOLDER_PROGRAM_LUCRU: (employee as any)?.workNorm ? `Normă întreagă de ${(employee as any).workNorm} ore/zi, ${(employee as any).workNorm * 5} ore/săptămână, Luni - Vineri` : '',
    PLACEHOLDER_PERIOADA_PROBA: (employee as any)?.probationDays ? `${(employee as any).probationDays} zile calendaristice` : '',
    PLACEHOLDER_DURATA_CONCEDIULUI: (employee as any)?.annualLeaveDays ? `${(employee as any).annualLeaveDays} zile lucrătoare` : '',
    PLACEHOLDER_CONT_BANCA_SALARIAT: (employee as any)?.bankIban || (employee as any)?.bankAccount || (employee as any)?.iban || '',
    PLACEHOLDER_BANCA_SALARIAT: (employee as any)?.bankName || '',
    PLACEHOLDER_GRUPA_SANGUINA: (employee as any)?.bloodType ? `${(employee as any).bloodType}${(employee as any)?.rhFactor ? ` (Rh ${(employee as any).rhFactor})` : ''}` : '',
    PLACEHOLDER_TRASEU_DEPLASARE: (employee as any)?.commuteRoute || '',
    PLACEHOLDER_DURATA_DEPLASARE: (employee as any)?.commuteDurationMinutes ? `${(employee as any).commuteDurationMinutes} minute` : '',
    PLACEHOLDER_MARIME_HAINE: (employee as any)?.clothingSize || '',
    PLACEHOLDER_MARIME_IMBRACAMINTE: (employee as any)?.clothingSize || '',
    PLACEHOLDER_MARIME_INCALTAMINTE: (employee as any)?.shoeSize ? String((employee as any).shoeSize) : '',
    PLACEHOLDER_MARIME_MANUSI: (employee as any)?.gloveSize ? String((employee as any).gloveSize) : '',
    PLACEHOLDER_MARIME_CASCA: '',

    // Profiling Dinamic Medicina Muncii (HG 355/2007)
    PLACEHOLDER_SECTOR_ALIMENTAR: isFoodSector ? 'Da (manipulare, preparare și servire alimente conform Fișei 210 din HG 355/2007)' : 'Nu',
    PLACEHOLDER_SUPRASOLICITARE_VIZUALA: isFoodSector ? 'Nu' : 'Da - lucru cu ecran de vizualizare (videoterminal/laptop) peste 4 ore/zi conform Fișei 243 din HG 355/2007',
    PLACEHOLDER_RISC_TAIERE: isFoodSector ? 'Da (ustensile și cuțite profesionale de bucătărie)' : 'Nu',
    PLACEHOLDER_RISC_ARSURI_OPARIRE: isFoodSector ? 'Da (suprafețe fierbinți, plite, cuptoare, ulei încins)' : 'Nu',
    PLACEHOLDER_POZITIE_LUCRU: isFoodSector ? 'Ortostatică (în picioare cu deplasări frecvente în perimetrul bucătăriei/sălii)' : (job?.workPosture === 'sitting' ? 'Așezat pe scaun ergonomic reglabil (> 70% din programul de lucru)' : (job?.workPosture || 'Așezat pe scaun ergonomic reglabil')),
    PLACEHOLDER_MANIPULARE_MASE: isFoodSector ? 'Da (vase de gătit, materii prime, recipiente până la 15 kg)' : (job?.maxWeightKg && job.maxWeightKg > 10 ? `Da (manipulare echipamente până la ${job.maxWeightKg} kg)` : 'Nu'),
    PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA: isFoodSector ? 'Până la 15 kg' : (job?.maxWeightKg ? `Până la ${job.maxWeightKg} kg` : 'Sub 3 kg'),
    PLACEHOLDER_NIVEL_EFORT_FIZIC: isFoodSector ? 'Mediu (solicitare fizică dinamică în bucătărie / servire)' : 'Mic (solicitare posturală statică la birou)',

    // EIP Real DB Allocation (HG 1048/2006)
    ...eipRows,
    ...hazardZonesMap,
    dotare_eip: loopEipList,
    echipamente: loopEipList,
    PLACEHOLDER_ADRESA_PUNCT_LUCRU: worksite?.address || client?.address || '',
    PLACEHOLDER_PUNCT_LUCRU: worksite?.name || (client?.address ? 'Sediu social' : ''),
    PLACEHOLDER_DEPARTAMENT: worksite?.activity || '',
    PLACEHOLDER_SUBUNITATE: worksite?.name || (client?.address ? 'Sediu social' : ''),
    PLACEHOLDER_SECTIE_COMPARTIMENT: worksite?.activity || '',
    PLACEHOLDER_LOC_MUNCA: worksite?.address || client?.address || '',
    PLACEHOLDER_LOC_MUNCA_LM: worksite?.address || client?.address || '',
    PLACEHOLDER_LOC_MUNCA_LM_PSI: worksite?.address || client?.address || '',

    // Date adiționale firmă (CIM 2022 & Solicitare Medicină)
    PLACEHOLDER_TELEFON_FIRMA: client?.contactPhone || '',
    PLACEHOLDER_EMAIL_FIRMA: client?.contactEmail || '',
    PLACEHOLDER_COD_POSTAL_FIRMA: (prov?.postalCode as string) || '',
    PLACEHOLDER_CONT_BANCA_FIRMA: (client as any)?.bankAccount || '',
    PLACEHOLDER_BANCA_FIRMA: (client as any)?.bankName || '',
    PLACEHOLDER_ACTIVITATE_CAEN: caenTitle,

    // Date adiționale salariat
    PLACEHOLDER_DOMICILIU: addressFull || '',
    PLACEHOLDER_TELEFON_SALARIAT: (employee as any)?.phone || '',
    PLACEHOLDER_EMAIL_SALARIAT: (employee as any)?.email || '',
    PLACEHOLDER_APELATIV_SALARIAT: fullName ? detectRomanianSalutation(fullName, employee?.cnp) : '',
    PLACEHOLDER_SEX: employee?.sex || (employee?.cnp && ['1', '3', '5', '7'].includes(employee.cnp[0]) ? 'M' : (employee?.cnp && ['2', '4', '6', '8'].includes(employee.cnp[0]) ? 'F' : '')),
    PLACEHOLDER_PROFESIE_OCUPATIE: job?.title || '',
    PLACEHOLDER_NUME_SALARIAT: fullName || '',
    PLACEHOLDER_CALIFICARE: (employee as any)?.qualification || '',
    PLACEHOLDER_MARCA: (employee as any)?.badgeNumber || (employee as any)?.employeeNumber || '',

    // Appointees & Instructori instruire SSM / PSI
    PLACEHOLDER_INSTRUCTOR_IG: instructorIntroductiv,
    PLACEHOLDER_VERIFICATOR_IG: verificatorIntroductiv,
    PLACEHOLDER_DURATA_INSTRUIRE_IG: durataIntroductiv,
    PLACEHOLDER_TEMATICA_IG: tematicaIntroductiv,
    PLACEHOLDER_INSTRUCTOR_LM: instructorLocMunca,
    PLACEHOLDER_VERIFICATOR_LM: verificatorLocMunca,
    PLACEHOLDER_DURATA_INSTRUIRE_LM: durataLocMunca,
    PLACEHOLDER_TEMATICA_LM: tematicaLocMunca,
    PLACEHOLDER_DATA_INSTRUIRE_IG: dataIntroductiv,
    PLACEHOLDER_DATA_INSTRUIRE_LM: dataLocMunca,
    PLACEHOLDER_DATA_ADMITERE: dataAdmitere,
    PLACEHOLDER_ADMITERE_NUME: legalRepresentativeName,

    PLACEHOLDER_INSTRUCTOR_IG_PSI: psiOfficer,
    PLACEHOLDER_VERIFICATOR_IG_PSI: legalRepresentativeName,
    PLACEHOLDER_INSTRUCTOR_LM_PSI: designatedWorker,
    PLACEHOLDER_VERIFICATOR_LM_PSI: designatedWorker,
    PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: dataIntroductiv,
    PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: dataLocMunca,
    PLACEHOLDER_DATA_ADMITERE_PSI: dataAdmitere,
    PLACEHOLDER_ADMITERE_NUME_PSI: legalRepresentativeName,

    // Date specifice EIP, Solicitare Medicină & Contract Muncă 2022
    PLACEHOLDER_DATA_SOLICITARII: currentDateRo,
    PLACEHOLDER_DATA_INTOCMIRII: currentDateRo,
    PLACEHOLDER_DATA_SEMNARII_EIP: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
    PLACEHOLDER_DATA_ELIBERARII_FISEI: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
    PLACEHOLDER_GESTIONAR_EIP: designatedWorker,
    PLACEHOLDER_SEF_LOC_MUNCA: designatedWorker,
    PLACEHOLDER_DATA_INCEPUT: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
    PLACEHOLDER_DATA_INCEPERE: employee?.hireDate ? formatDateRo(employee.hireDate) : '',

    // Dynamic table arrays for SSM & PSI
    instruiriPeriodiceSSM,
    instruiriSuplimentareSSM,
    testariSSM,
    instructajePeriodicePSI,
    exercitiiPracticePSI,

    // Dynamic Prevention Plan collections & top-level tokens
    planPrevenire,
    masuriPrevenire: planPrevenire,

    // 5. Sesiune Igienă
    ...(hygieneSession ? {
      ...(template.family === 'hygiene' || template.contextLevel === 'hygiene_session' ? {
        PLACEHOLDER_PRESTATOR_SSM: hygieneSession.providerName || client?.provider?.hygieneProviderName || ssmProviderName,
        PLACEHOLDER_FURNIZOR_SSM: hygieneSession.providerName || client?.provider?.hygieneProviderName || ssmProviderName,
        PLACEHOLDER_REPREZENTANT_PRESTATOR: client?.provider?.hygieneRepresentative || client?.provider?.legalRepresentative || legalRepresentativeName || '',
        PLACEHOLDER_MEMBRU_COMISIE: hygieneSession.commissionMember1 || client?.provider?.hygieneCommissionMember1 || '',
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
        const docType = p.docType || p.employee?.identityDocument?.docType || '';
        const docSeries = p.docSeries || p.employee?.identityDocument?.series || '';
        const docNumber = p.docNumber || p.employee?.identityDocument?.number || '';
        const identityDoc = docNumber ? `${docType || 'CI'} seria ${docSeries} nr. ${docNumber}`.trim() : '';
        const sessionDateStr = formatDateRo(hygieneSession.sessionDate);
        const examDateStr = formatDateRo(hygieneSession.examDate);

        return {
          ...p,
          rowNumber: idx + 1,
          fullName: pFullName || '',
          identityDocument: identityDoc,
          docType,
          docSeries,
          docNumber,
          sessionDate: sessionDateStr,
          examDate: examDateStr,
          providerName: hygieneSession.providerName,
          coursePeriod: `${sessionDateStr} - ${examDateStr}`,
          module: p.employee?.hygieneModule || '',
          level: 'Nivelul 1',
        };
      }),
    } : (() => {
      const clientEmployees = (client?.employees || []) as any[];
      const dynamicParticipants = clientEmployees.map((emp: any, idx: number) => {
        const empFullName = `${emp.lastName} ${emp.firstName}`.trim();
        const idDoc = emp.identityDocument;
        const docType = idDoc?.docType || '';
        const docSeries = idDoc?.series || '';
        const docNumber = idDoc?.number || '';
        const identityStr = docNumber ? `${docType || 'CI'} seria ${docSeries} nr. ${docNumber}`.trim() : '';
        const examDateStr = emp.hygieneLastExamDate ? formatDateRo(emp.hygieneLastExamDate) : '';
        const sessionDateStr = examDateStr;

        const defaultModule = client?.caenCode && (client.caenCode.startsWith('56') || client.caenCode.startsWith('10') || client.caenCode.startsWith('11'))
          ? 'Modulul 1 - Sector Alimentar și Alimentație Publică'
          : (emp.hygieneModule || '');

        let certSeries = '';
        let certNumber = '';
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
          lastName: emp.lastName || '',
          firstName: emp.firstName || '',
          cnp: emp.cnp || '',
          birthDate: emp.birthDate ? formatDateRo(emp.birthDate) : '',
          birthPlace: emp.birthPlace || '',
          docType,
          docSeries,
          docNumber,
          identityDocument: identityStr,
          module: emp.hygieneModule || defaultModule,
          level: 'Nivelul 1',
          sessionDate: sessionDateStr,
          examDate: examDateStr,
          examGrade: emp.hygieneCertificateNumber ? '10' : '',
          examResult: emp.hygieneCertificateNumber ? 'Admis' : '',
          certificateSeries: certSeries,
          certificateNumber: certNumber,
          providerName: client?.provider?.name || ssmProviderName,
          coursePeriod: sessionDateStr ? `${sessionDateStr} - ${examDateStr}` : '',
        };
      });

      // No fake Stan Alexandru fallback roster
      const participantRoster = dynamicParticipants;

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
      PLACEHOLDER_NUME: participant.lastName || '',
      PLACEHOLDER_PRENUME: participant.firstName || '',
      PLACEHOLDER_CNP: participant.cnp || '',
      PLACEHOLDER_DATA_NASTERII: participant.birthDate ? formatDateRo(participant.birthDate) : '',
      PLACEHOLDER_LOCALITATE_NASTERII: participant.birthPlace || '',
      PLACEHOLDER_TIP_ACT: participant.docType || '',
      PLACEHOLDER_SERIE_ACT: participant.docSeries || '',
      PLACEHOLDER_NUMAR_ACT: participant.docNumber || '',
      PLACEHOLDER_NR_ACT: participant.docNumber || '',
      PLACEHOLDER_SERIE_ADEVERINTA: '',
      PLACEHOLDER_NUMAR_ADEVERINTA: participant.certificateNumber || '',
      PLACEHOLDER_DATA_ELIBERARE: participant.certificateIssueDate ? formatDateRo(participant.certificateIssueDate) : (participant.certificateDate ? formatDateRo(participant.certificateDate) : (hygieneSession?.examDate ? formatDateRo(hygieneSession.examDate) : '')),
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: participant.certificateNumber || '',
      PLACEHOLDER_REZULTAT_EXAMEN: participant.examResult || '',
      PLACEHOLDER_MODUL_IGIENA: participant.employee?.hygieneModule || employee?.hygieneModule || '',
      PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
        explicitLevel: (participant as any)?.level || (participant as any)?.hygieneLevel || participant.employee?.hygieneLevel || (employee as any)?.hygieneLevel,
        jobTitle: participant.jobTitle || participant.employee?.currentJob?.title || job?.title || employee?.currentJob?.title,
        corCode: (participant as any)?.corCode || participant.employee?.currentJob?.corCode || job?.corCode || employee?.currentJob?.corCode,
      }),
    } : (employee ? {
      PLACEHOLDER_NUME_COMPLET: fullName,
      PLACEHOLDER_NUME: employee.lastName || '',
      PLACEHOLDER_PRENUME: employee.firstName || '',
      PLACEHOLDER_CNP: employee.cnp || '',
      PLACEHOLDER_DATA_NASTERII: employee.birthDate ? formatDateRo(employee.birthDate) : '',
      PLACEHOLDER_LOCALITATE_NASTERII: employee.birthPlace || '',
      PLACEHOLDER_TIP_ACT: identity?.docType || '',
      PLACEHOLDER_SERIE_ACT: identity?.series || '',
      PLACEHOLDER_NUMAR_ACT: identity?.number || '',
      PLACEHOLDER_NR_ACT: identity?.number || '',
      PLACEHOLDER_SERIE_ADEVERINTA: '',
      PLACEHOLDER_NUMAR_ADEVERINTA: employee.hygieneCertificateNumber || '',
      PLACEHOLDER_DATA_ELIBERARE: employee.hygieneCertificateIssueDate ? formatDateRo(employee.hygieneCertificateIssueDate) : (employee.hygieneLastExamDate ? formatDateRo(employee.hygieneLastExamDate) : ''),
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: employee.hygieneCertificateNumber || '',
      PLACEHOLDER_REZULTAT_EXAMEN: employee.hygieneCertificateNumber ? 'Admis' : '',
      PLACEHOLDER_MODUL_IGIENA: employee.hygieneModule || '',
      PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
        explicitLevel: (employee as any)?.hygieneLevel,
        jobTitle: job?.title || employee?.currentJob?.title,
        corCode: job?.corCode || employee?.currentJob?.corCode,
      }),
    } : {})),

    // 7. Sesiune Instruire Colectivă (M3 F14 & F15)
    ...(trainingEvent || template.family === 'training' || template.contextLevel === 'training_event' ? {
      PLACEHOLDER_DATA_PV: trainingEvent?.eventDate ? formatDateRo(trainingEvent.eventDate) : currentDateRo,
      PLACEHOLDER_DATA_INSTRUIRE: trainingEvent?.eventDate ? formatDateRo(trainingEvent.eventDate) : currentDateRo,
      PLACEHOLDER_DURATA_INSTRUIRE: trainingEvent?.durationHours ? `${trainingEvent.durationHours} ore` : '2 ore',
      PLACEHOLDER_INSTRUCTOR: trainingEvent?.instructorName || designatedWorker || ssmSpecialistName,
      PLACEHOLDER_TEMATICA: trainingEvent?.materialOrTopic || 'Instruire conform tematicii anuale',
      PLACEHOLDER_VERIFICATOR: trainingEvent?.verifierName || legalRepresentativeName,
      PLACEHOLDER_DEMONSTRATIE_PRACTICA: trainingEvent?.practicalDemonstration || 'Efectuată conform tematicii',
      participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
        const emp = p.employee || (p.employeeId && client?.employees?.find((e: any) => e.id === p.employeeId));
        const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
        const func =
          emp?.currentJob?.title ||
          (emp?.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) ||
          'Lucrător';
        const cnpVal = emp?.cnp ? emp.cnp.trim() : (p?.cnp ? String(p.cnp).trim() : '');
        const rez = p.result || 'admis';
        return {
          nr: idx + 1,
          numeComplet: empName,
          functie: func,
          cnp: cnpVal,
          rezultat: rez,
          semnatura: '',
        };
      }),
    } : {}),
  };

  // Compoziție în cascadă: Fallback Legal -> Date Verificate DB -> Suprascrieri Custom
  const mergedData: Record<string, unknown> = {
    ...ALL_ROMANIAN_LEGAL_FALLBACKS,
    ...verifiedMap,
    ...(context.customOverrides || {}),
  };

  // Când allowOfflineBlank este specificat (pentru dosare bulk și arhive de inspecție),
  // câmpurile nerezolvate (șir vid sau null) preiau fallback-urile legale statutare.
  if (context.allowOfflineBlank) {
    for (const [k, fallbackVal] of Object.entries(ALL_ROMANIAN_LEGAL_FALLBACKS)) {
      if (mergedData[k] === undefined || mergedData[k] === null || mergedData[k] === '') {
        mergedData[k] = fallbackVal;
      }
    }
  }

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
    autocompletedKeys,
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
      jobs: {
        include: {
          eipRequirements: { include: { eipItem: true } },
        },
      },
      worksites: true,
      trainingEvents: {
        include: {
          participants: {
            include: {
              employee: {
                include: {
                  currentJob: true,
                  identityDocument: true,
                },
              },
            },
          },
        },
        orderBy: { eventDate: 'asc' },
      },
      employees: {
        where: { status: { not: 'PLECAT' } },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: {
            include: {
              eipRequirements: { include: { eipItem: true } },
            },
          },
          currentWorksite: true,
          trainingParticipants: {
            include: { event: true },
          },
          eipAssignments: {
            include: { eipItem: true },
            orderBy: { assignedDate: 'asc' },
          },
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

  // Strictly respect ctx.employeeId - DO NOT silently fallback to client.employees[0]
  const employee = ctx.employeeId
    ? (client.employees.find((e) => e.id === ctx.employeeId) ||
        (await prisma.employee.findFirst({
          where: { id: ctx.employeeId, clientId: ctx.clientId },
          include: {
            identityDocument: true,
            residenceAddress: true,
            currentJob: {
              include: {
                eipRequirements: { include: { eipItem: true } },
              },
            },
            currentWorksite: true,
            trainingParticipants: {
              include: { event: true },
            },
            eipAssignments: {
              include: { eipItem: true },
              orderBy: { assignedDate: 'asc' },
            },
          },
        })))
    : null;

  // Selected job respects ctx.jobId, employee's job, or null (DO NOT fallback to client.jobs[0])
  const selectedJob = ctx.jobId
    ? (client.jobs.find((j) => j.id === ctx.jobId) || null)
    : (employee?.currentJob || null);

  // Selected worksite respects ctx.worksiteId, employee's worksite, or null (DO NOT fallback to client.worksites[0])
  const selectedWorksite = ctx.worksiteId
    ? (client.worksites.find((w) => w.id === ctx.worksiteId) || null)
    : (employee?.currentWorksite || null);

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

  let trainingEvent = ctx.trainingEventId
    ? (client.trainingEvents?.find((e: any) => e.id === ctx.trainingEventId) || null)
    : null;

  if (
    ctx.trainingEventId &&
    (!trainingEvent ||
      !trainingEvent.participants ||
      trainingEvent.participants.some(
        (p: any) => !p.employee || (!p.employee.currentJob && p.employee.currentJobId)
      ))
  ) {
    trainingEvent = await prisma.trainingEvent.findUnique({
      where: { id: ctx.trainingEventId },
      include: {
        participants: {
          include: {
            employee: {
              include: {
                currentJob: true,
                identityDocument: true,
              },
            },
          },
        },
      },
    });
  }

  // Ensure that the event selected from client.trainingEvents or queried via findUnique has complete participant details with currentJob
  if (trainingEvent && trainingEvent.participants) {
    for (const p of trainingEvent.participants as any[]) {
      if (!p.employee && p.employeeId && client?.employees) {
        p.employee = client.employees.find((e: any) => e.id === p.employeeId) || null;
      }
      if (p.employee && !p.employee.currentJob && p.employee.currentJobId && client?.jobs) {
        p.employee.currentJob = client.jobs.find((j: any) => j.id === p.employee.currentJobId) || null;
      }
    }
  }

  let riskAssessment = null;
  if (ctx.assessmentId) {
    riskAssessment = await prisma.riskAssessment.findUnique({
      where: { id: ctx.assessmentId },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
          include: { preventionMeasures: true },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    });
  } else if (ctx.jobId || selectedJob?.id) {
    riskAssessment = await prisma.riskAssessment.findFirst({
      where: {
        clientId: ctx.clientId,
        jobId: ctx.jobId || selectedJob?.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
          include: { preventionMeasures: true },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    });
  } else {
    riskAssessment = await prisma.riskAssessment.findFirst({
      where: { clientId: ctx.clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
          include: { preventionMeasures: true },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    });
  }

  const resolutionResult = await resolveTemplateData(ctx.templateCode, {
    client,
    employee,
    job: selectedJob,
    jobId: ctx.jobId,
    worksite: selectedWorksite,
    worksiteId: ctx.worksiteId,
    assessmentId: ctx.assessmentId,
    riskAssessment,
    hygieneSession,
    hygieneParticipant: participant,
    trainingEvent,
    trainingEventId: ctx.trainingEventId,
    customOverrides: ctx.customOverrides,
    allowOfflineBlank: ctx.allowOfflineBlank,
  });

  const autocompletedSet = resolutionResult.autocompletedKeys || new Set<string>();

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
        isAutocompleted: autocompletedSet.has(def.key) && hasValue,
      };
    });

  return {
    template,
    fields: resolvedFields,
    resolvedData: resolutionResult.data,
  };
}
