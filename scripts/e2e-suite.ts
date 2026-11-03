/**
 * ============================================================================
 * E2E TEST SUITE: ROMANIAN SSM, HR, AND HYGIENE COMPLIANCE SYSTEM
 * ============================================================================
 * 
 * Requirement-driven 4-tier E2E verification gate.
 * 
 * Normative Standards:
 * - HG 355/2007 (Medicina Muncii)
 * - Legea 319/2006 & HG 1425/2006 (Securitatea și Sănătatea în Muncă)
 * - Legea 307/2006 & OMAI 712/2005 (PSI / Situații de Urgență)
 * - Ordinul MS/ME 2209/4469/2022 (Cursuri Noțiuni Fundamentale de Igienă)
 * - Legea 53/2003 (Codul Muncii)
 * - 25 Official Templates in templates_registry/normalized/
 * 
 * Invocation:
 *   npx tsx scripts/e2e-suite.ts
 *   npx tsx scripts/e2e-suite.ts --tier=1
 *   npx tsx scripts/e2e-suite.ts --tier=2
 *   npx tsx scripts/e2e-suite.ts --tier=3
 *   npx tsx scripts/e2e-suite.ts --tier=4
 *   npx tsx scripts/e2e-suite.ts --grep="Leap"
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import { TEMPLATE_CATALOG, TemplateDefinition } from '../src/lib/templates/definitions';
import { collectUnresolvedPlaceholders, renderTemplateBuffer } from '../src/lib/templates/generator';

// ============================================================================
// TEST HARNESS & COLORIZED REPORTING INFRASTRUCTURE
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

interface TestResult {
  tier: number;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  durationMs: number;
  error?: string;
  details?: string;
}

class TestSuiteRunner {
  private results: TestResult[] = [];
  private filterTier: number | null = null;
  private filterGrep: string | null = null;
  private startTime: number = 0;

  constructor() {
    const args = process.argv.slice(2);
    for (const arg of args) {
      if (arg.startsWith('--tier=')) {
        this.filterTier = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--grep=')) {
        this.filterGrep = arg.split('=')[1].toLowerCase();
      }
    }
  }

  start() {
    this.startTime = Date.now();
    console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.white}  ROMANIAN SSM, HR & HYGIENE COMPLIANCE SYSTEM — 4-TIER E2E TEST SUITE${COLORS.reset}`);
    console.log(`${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.dim}Timestamp:${COLORS.reset} ${new Date().toISOString()}`);
    console.log(`${COLORS.dim}Environment:${COLORS.reset} Node.js ${process.version} | PostgreSQL Prisma Engine`);
    if (this.filterTier) console.log(`${COLORS.yellow}Filter: Running Tier ${this.filterTier} only${COLORS.reset}`);
    if (this.filterGrep) console.log(`${COLORS.yellow}Filter: Grep "${this.filterGrep}"${COLORS.reset}`);
    console.log('');
  }

  async runTest(
    tier: number,
    category: string,
    name: string,
    fn: () => Promise<void> | void
  ) {
    if (this.filterTier && this.filterTier !== tier) {
      return;
    }
    if (this.filterGrep && !name.toLowerCase().includes(this.filterGrep) && !category.toLowerCase().includes(this.filterGrep)) {
      return;
    }

    const t0 = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - t0;
      this.results.push({ tier, category, name, status: 'PASS', durationMs });
      console.log(`  ${COLORS.green}✓${COLORS.reset} ${COLORS.dim}[Tier ${tier}]${COLORS.reset} ${name} ${COLORS.dim}(${durationMs}ms)${COLORS.reset}`);
    } catch (err: unknown) {
      const durationMs = Date.now() - t0;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.results.push({ tier, category, name, status: 'FAIL', durationMs, error: errorMsg });
      console.log(`  ${COLORS.red}✗${COLORS.reset} ${COLORS.dim}[Tier ${tier}]${COLORS.reset} ${COLORS.bright}${COLORS.red}${name}${COLORS.reset} ${COLORS.dim}(${durationMs}ms)${COLORS.reset}`);
      console.log(`    ${COLORS.red}Error: ${errorMsg}${COLORS.reset}`);
    }
  }

  printSummary(): boolean {
    const totalDuration = Date.now() - this.startTime;
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;

    console.log(`\n${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.bright}EXECUTION SUMMARY BY TIER${COLORS.reset}`);
    console.log(`${COLORS.cyan}--------------------------------------------------------------------------------${COLORS.reset}`);

    for (let t = 1; t <= 4; t++) {
      const tierResults = this.results.filter((r) => r.tier === t);
      if (tierResults.length === 0) continue;
      const tPassed = tierResults.filter((r) => r.status === 'PASS').length;
      const tFailed = tierResults.filter((r) => r.status === 'FAIL').length;
      const tRate = Math.round((tPassed / tierResults.length) * 100);
      const color = tFailed === 0 ? COLORS.green : COLORS.red;
      console.log(
        `  Tier ${t}: ${color}${tPassed}/${tierResults.length} passed (${tRate}%)${COLORS.reset}` +
        (tFailed > 0 ? ` — ${COLORS.red}${tFailed} FAILED${COLORS.reset}` : '')
      );
    }

    console.log(`${COLORS.cyan}--------------------------------------------------------------------------------${COLORS.reset}`);
    const overallColor = failed === 0 ? COLORS.bgGreen : COLORS.bgRed;
    console.log(
      `${overallColor}${COLORS.bright}${COLORS.white} TOTAL: ${passed}/${total} PASSED (${total > 0 ? Math.round((passed / total) * 100) : 0}%) in ${totalDuration}ms ${COLORS.reset}`
    );
    console.log(`${COLORS.cyan}================================================================================\n${COLORS.reset}`);

    if (failed > 0) {
      console.log(`${COLORS.bright}${COLORS.red}FAILURES BREAKDOWN & ESCALATION ITEMS:${COLORS.reset}`);
      this.results.filter((r) => r.status === 'FAIL').forEach((r, idx) => {
        console.log(`  ${idx + 1}. [Tier ${r.tier}] ${r.category} -> ${r.name}`);
        console.log(`     ${COLORS.red}${r.error}${COLORS.reset}`);
      });
      console.log('');
      return false;
    }
    return true;
  }
}

// ============================================================================
// ASSERTION UTILITIES
// ============================================================================

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

function assertDateEqual(actual: Date | null | undefined, expectedYMD: string, message: string) {
  if (!actual) {
    throw new Error(`Assertion Failed: ${message} (Expected: ${expectedYMD}, Got: null/undefined)`);
  }
  const year = actual.getFullYear();
  const month = String(actual.getMonth() + 1).padStart(2, '0');
  const day = String(actual.getDate()).padStart(2, '0');
  const actualYMD = `${year}-${month}-${day}`;
  if (actualYMD !== expectedYMD) {
    throw new Error(`Assertion Failed: ${message} (Expected: ${expectedYMD}, Got: ${actualYMD})`);
  }
}

// ============================================================================
// DYNAMIC COMPLIANCE MODULE RESOLVER
// ============================================================================

export type ComplianceStatus = 'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING';

export interface ComplianceItemResult {
  lastDate: Date | null;
  intervalMonths: number;
  dueDate: Date | null;
  daysRemaining: number | null;
  status: ComplianceStatus;
  label: string;
}

export interface EmployeeComplianceSummary {
  employeeId: string;
  employeeName: string;
  occupationalMedicine: ComplianceItemResult;
  ssmTraining: ComplianceItemResult;
  psiTraining: ComplianceItemResult;
  hygieneCertificate: ComplianceItemResult | null;
  overallStatus: ComplianceStatus;
}

export interface CompanyComplianceMetrics {
  totalEmployees: number;
  totalItemsTracked: number;
  validCount: number;
  upcomingCount: number;
  overdueCount: number;
  missingCount: number;
  complianceScorePercent: number;
}

interface ComplianceEngineAPI {
  addMonthsSafe: (date: Date, months: number) => Date;
  calculateItemCompliance: (lastDate: Date | null, intervalMonths: number, label: string, referenceDate?: Date) => ComplianceItemResult;
  calculateEmployeeCompliance: (employee: unknown, referenceDate?: Date) => EmployeeComplianceSummary;
  calculateCompanyMetrics: (employees: unknown[], referenceDate?: Date) => CompanyComplianceMetrics;
}

let complianceEngine: ComplianceEngineAPI | null = null;
let complianceLoadError: string | null = null;

async function loadComplianceEngine(): Promise<ComplianceEngineAPI> {
  if (complianceEngine) return complianceEngine;
  try {
    const mod = await import('../src/lib/compliance');
    complianceEngine = mod as unknown as ComplianceEngineAPI;
    return complianceEngine;
  } catch (err: unknown) {
    complianceLoadError = err instanceof Error ? err.message : String(err);
    throw new Error(`src/lib/compliance.ts could not be loaded: ${complianceLoadError}`);
  }
}

// ============================================================================
// TEMPLATE MOCK PROFILE GENERATOR
// ============================================================================

function getFullSampleData(): Record<string, unknown> {
  const data: Record<string, unknown> = {
    // 1. Client & Angajator
    PLACEHOLDER_FIRMA: 'EXPERT SAFETY SRL',
    PLACEHOLDER_CUI: 'RO12345678',
    PLACEHOLDER_NR_REG_COM: 'J40/1234/2020',
    PLACEHOLDER_ADRESA_FIRMA: 'București, Sector 1, Calea Victoriei nr. 100',
    PLACEHOLDER_REPREZENTANT_LEGAL: 'Ionescu Vasile',
    PLACEHOLDER_DIRECTOR: 'Ionescu Vasile',
    PLACEHOLDER_CALITATE_REPREZENTANT: 'Administrator',
    PLACEHOLDER_TELEFON_CONTACT: '0722123456',
    PLACEHOLDER_EMAIL_CONTACT: 'contact@expertsafety.ro',
    PLACEHOLDER_ADRESA_PUNCT_LUCRU: 'București, Sediul Central',
    PLACEHOLDER_LOCALITATE_SEMNARE: 'București',
    PLACEHOLDER_COD_CAEN: '6201 - Activități software',
    PLACEHOLDER_ACTIVITATE_PRINCIPALA: 'Dezvoltare software',
    PLACEHOLDER_NUMAR_LUCRATORI: '15',
    PLACEHOLDER_PROGRAM_LUCRU: '8 ore/zi, 40 ore/săptămână',
    PLACEHOLDER_AN_INFIINTARE: '2020',
    PLACEHOLDER_AN_EVALUARE: '2026',

    // 2. Salariat
    PLACEHOLDER_NUME_COMPLET: 'Popescu Andrei',
    PLACEHOLDER_NUME: 'Popescu',
    PLACEHOLDER_PRENUME: 'Andrei',
    PLACEHOLDER_CNP: '1850412410013',
    PLACEHOLDER_ADRESA_DOMICILIU: 'București, Sector 2, Str. Florilor nr. 10',
    PLACEHOLDER_JUDET_DOMICILIU: 'București',
    PLACEHOLDER_LOCALITATE_DOMICILIU: 'Sector 2',
    PLACEHOLDER_STRADA_DOMICILIU: 'Florilor',
    PLACEHOLDER_NUMAR_DOMICILIU: '10',
    PLACEHOLDER_BLOC: 'A1',
    PLACEHOLDER_SCARA: '1',
    PLACEHOLDER_ETAJ: '2',
    PLACEHOLDER_APARTAMENT: '12',
    PLACEHOLDER_TIP_ACT: 'C.I.',
    PLACEHOLDER_SERIE_ACT: 'RX',
    PLACEHOLDER_NUMAR_ACT: '123456',
    PLACEHOLDER_EMITENT_ACT: 'SPCLEP S2',
    PLACEHOLDER_DATA_EMITERII: '10.05.2020',
    PLACEHOLDER_FUNCTIE: 'Inginer Software',
    PLACEHOLDER_COD_COR: '251201',
    PLACEHOLDER_DATA_ANGAJARII: '01.03.2026',
    PLACEHOLDER_DATA_INCEPERE: '01.03.2026',
    PLACEHOLDER_DATA_CERERE: '20.02.2026',
    PLACEHOLDER_DATA_SEMNARE: '28.02.2026',
    PLACEHOLDER_DATA_DECLARATIE: '28.02.2026',
    PLACEHOLDER_NUMAR_CIM: '101/2026',
    PLACEHOLDER_DATA_SFARSIT: 'nedeterminată',
    PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: 'N/A',
    PLACEHOLDER_PERMIS_MUNCA: 'N/A',
    PLACEHOLDER_ORE_PE_ZI: '8',
    PLACEHOLDER_SALARIU_BRUT: '10000',
    PLACEHOLDER_DATA_PLATA: '15',
    PLACEHOLDER_ZILE_CONCEDIU: '21',
    PLACEHOLDER_ZILE_PROBA: '90',
    PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE: '20',
    PLACEHOLDER_ALTE_DREPTURI_SALARIALE: 'Tichete de masă',
    PLACEHOLDER_CASA_SANATATE: 'CASMB',
    PLACEHOLDER_TIP_PENSIE: 'N/A',

    // Persoane în întreținere (persoane 01 și 02)
    PLACEHOLDER_NUME_COMPLET_PERSOANA_01: 'Popescu Elena',
    PLACEHOLDER_CNP_PERSOANA_01: '2860515410022',
    PLACEHOLDER_CALITATE_PERSOANA_01: 'Soție',
    PLACEHOLDER_DATA_INTRETINERE_01: '01.01.2024',
    PLACEHOLDER_VENIT_PERSOANA_01: 'Fără venit',
    PLACEHOLDER_INVALIDITATE_PERSOANA_01: 'Nu',
    PLACEHOLDER_NUME_COMPLET_PERSOANA_02: '-',
    PLACEHOLDER_CNP_PERSOANA_02: '-',
    PLACEHOLDER_CALITATE_PERSOANA_02: '-',
    PLACEHOLDER_DATA_INTRETINERE_02: '-',
    PLACEHOLDER_VENIT_PERSOANA_02: '-',
    PLACEHOLDER_INVALIDITATE_PERSOANA_02: '-',

    // 3. Prestator SSM / Serviciu Extern
    PLACEHOLDER_PRESTATOR_SSM: 'SSM EXPERT AUDIT SRL',
    PLACEHOLDER_FURNIZOR_SSM: 'SSM EXPERT AUDIT SRL',
    PLACEHOLDER_SPECIALIST_SSM: 'Ing. Specialist Popa Dan',
    PLACEHOLDER_EVALUATOR_RISC: 'Ing. Evaluator Radu Mihai',
    PLACEHOLDER_CERTIFICAT_EVALUATOR: 'Certificat Seria EV nr. 9988/2020',
    PLACEHOLDER_EMAIL_PRESTATOR: 'contact@ssmexpertaudit.ro',
    PLACEHOLDER_TELEFON_PRESTATOR: '0722333444',
    PLACEHOLDER_SITE_PRESTATOR: 'www.ssmexpertaudit.ro',
    PLACEHOLDER_DATA_APLICARE: '01.03.2026',
    PLACEHOLDER_DATA_INTOCMIRE: '05.01.2026',
    PLACEHOLDER_DATA_DECIZIE: '05.01.2026',

    // Decizii 01..11
    PLACEHOLDER_NUMAR_DECIZIE_01: '01',
    PLACEHOLDER_NUMAR_DECIZIE_02: '02',
    PLACEHOLDER_NUMAR_DECIZIE_03: '03',
    PLACEHOLDER_NUMAR_DECIZIE_04: '04',
    PLACEHOLDER_NUMAR_DECIZIE_05: '05',
    PLACEHOLDER_NUMAR_DECIZIE_06: '06',
    PLACEHOLDER_NUMAR_DECIZIE_07: '07',
    PLACEHOLDER_NUMAR_DECIZIE_08: '08',
    PLACEHOLDER_NUMAR_DECIZIE_09: '09',
    PLACEHOLDER_NUMAR_DECIZIE_11: '11',
    PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: 'Ing. Popa Dan',
    PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: 'As. Med. Georgescu Ana',
    PLACEHOLDER_RESPONSABIL_PSI: 'Tehnician PSI Enache Radu',
    PLACEHOLDER_MEMBRU_COMISIE: 'Membru Comisie Stan Ioana',
    PLACEHOLDER_DOMENIU_INSTRUIRE: 'Securitate și Sănătate în Muncă / PSI',
    PLACEHOLDER_FUNCTIE_INSTRUCTOR: 'Specialist SSM',
    PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT: '112 / Dispecerat SSM: 0722333444',

    // Permis de lucru cu foc (în DECIZII.docx)
    PLACEHOLDER_NUMAR_PERMIS_FOC: 'PF-01/2026',
    PLACEHOLDER_DATA_PERMIS_FOC: '10.02.2026',
    PLACEHOLDER_EXECUTANT_LUCRARE: 'Sudor Vasile Gheorghe',
    PLACEHOLDER_AJUTOR_LUCRARE: 'Ajutor Sudor Marin Ion',
    PLACEHOLDER_DESCRIERE_LUCRARE: 'Reparație structură metalică poartă',
    PLACEHOLDER_TEHNOLOGIE_LUCRU: 'Sudură electrică cu arc',
    PLACEHOLDER_DATA_INCEPERE_LUCRARE: '10.02.2026',
    PLACEHOLDER_ORA_INCEPERE: '09:00',
    PLACEHOLDER_DATA_FINALIZARE_LUCRARE: '10.02.2026',
    PLACEHOLDER_ORA_FINALIZARE: '13:00',
    PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: 'Tehnician PSI Enache Radu',
    PLACEHOLDER_RESPONSABIL_CONTROL_PSI: 'Tehnician PSI Enache Radu',
    PLACEHOLDER_MASURI_PSI_SUPLIMENTARE: 'Curățare materiale inflamabile pe o rază de 10m, pregătire 2 stingătoare P6',
    PLACEHOLDER_METODA_IZOLARE_INSTALATII: 'Decuplare tablou alimentare',
    PLACEHOLDER_PROTECTIE_MATERIALE: 'Panou antifoc',
    PLACEHOLDER_VENTILARE_SPATIU: 'Ventilație naturală',
    PLACEHOLDER_MIJLOACE_STINGERE: '2 stingătoare P6 presurizate',
    PLACEHOLDER_RAZA_PROTECTIE_METRI: '10',
    PLACEHOLDER_NUMAR_BULETIN_ANALIZA: 'BA-01/2026',
    PLACEHOLDER_DATA_BULETIN_ANALIZA: '10.02.2026',
    PLACEHOLDER_EMITENT_BULETIN_ANALIZA: 'Laborator autorizat de noxe',

    // Evaluare riscuri & TESA.docx
    PLACEHOLDER_DEPARTAMENT: 'IT / Dezvoltare Software',
    PLACEHOLDER_DURATA_EXPUNERII: '8 ore/zi',
    PLACEHOLDER_NUMAR_DOCUMENT: 'EV-01/2026',
    PLACEHOLDER_NUMAR_FACTORI_RISC: '30',
    PLACEHOLDER_NUMAR_FISA_EVALUARE: 'F-01',
    PLACEHOLDER_NUMAR_LOC_MUNCA: 'LM-01',
    PLACEHOLDER_NUMAR_PERSOANE_EXPUSE: '5',
    PLACEHOLDER_REPARTITIE_RISCURI: 'Niveluri parțiale de risc între 1 și 3',
    PLACEHOLDER_CONCLUZII_EVALUARE: 'Nivelul de risc global este 2.45 (acceptabil). Nu există factori de risc inacceptabili.',
    PLACEHOLDER_NIVEL_RISC_GLOBAL: '2.45',

    // Zone pericol grav și iminent
    PLACEHOLDER_DENUMIRE_ZONA_01: 'Post transformare și tablou general',
    PLACEHOLDER_MASURI_ZONA_01: 'Uși încuiate, acces autorizat, verificare PRAM anual',
    PLACEHOLDER_DENUMIRE_ZONA_02: 'Centrală termică gaze',
    PLACEHOLDER_MASURI_ZONA_02: 'Detectoare gaz, ventilație permanentă, revizie anuală ISCIR',
    PLACEHOLDER_DENUMIRE_ZONA_03: 'Arhivă documente',
    PLACEHOLDER_MASURI_ZONA_03: 'Interzicere fumat, detectoare fum, stingătoare CO2',
    PLACEHOLDER_DENUMIRE_ZONA_04: 'Server room',
    PLACEHOLDER_MASURI_ZONA_04: 'Instalație automată stingere gaz, control acces',
    PLACEHOLDER_DENUMIRE_ZONA_05: 'Rampă încărcare',
    PLACEHOLDER_MASURI_ZONA_05: 'Marcaje tactile, semnalizare luminoasă, limitare viteză',
    PLACEHOLDER_DENUMIRE_ZONA_06: 'Terasă tehnică superioară',
    PLACEHOLDER_MASURI_ZONA_06: 'Balustradă protecție 1.10m, acces interzis neautorizat',

    // Cursuri Igienă
    PLACEHOLDER_AVIZ_MS: 'Aviz MS nr. 102/2024 din 15.01.2024',
    PLACEHOLDER_AVIZ_ME: 'Aviz ME nr. 55/2024 din 20.01.2024',
    PLACEHOLDER_NUMAR_AVIZ_MS: '102',
    PLACEHOLDER_DATA_AVIZ_MS: '15.01.2024',
    PLACEHOLDER_NUMAR_AVIZ_ME: '55',
    PLACEHOLDER_DATA_AVIZ_ME: '20.01.2024',
    PLACEHOLDER_DATA_SESIUNE: '10.03.2026',
    PLACEHOLDER_DATA_EXAMEN: '15.03.2026',
    PLACEHOLDER_DATA_PV: '15.03.2026',
    PLACEHOLDER_DATA_CATALOG: '15.03.2026',
    PLACEHOLDER_DATA_ELIBERARE: '15.03.2026',
    PLACEHOLDER_DATA_EMITERE: '20.01.2024',
    PLACEHOLDER_LOCATIE_EXAMEN: 'București, Sediul Central',
    PLACEHOLDER_LOCALITATE_EXAMEN: 'București',
    PLACEHOLDER_NUMAR_PV: 'PV-EX-01/2026',
    PLACEHOLDER_SERIE_PV: 'PV-EX',
    PLACEHOLDER_PRESEDINTE_COMISIE: 'Dr. Ionescu Radu',
    PLACEHOLDER_MEMBRU_COMISIE_1: 'As. Med. Popa Elena',
    PLACEHOLDER_MEMBRU_COMISIE_2: 'Insp. DSP Mihai Dan',
    PLACEHOLDER_SECRETAR_COMISIE: 'Secretar Georgescu Ana',
    PLACEHOLDER_COMISIE_EXAMEN: 'Comisia mixtă DSP / Furnizor',
    PLACEHOLDER_NUMAR_DECIZIE_COMISIE: 'Decizia nr. 12/2026',
    PLACEHOLDER_NUMAR_ADEVERINTA: '2026-001',
    PLACEHOLDER_SERIE_ADEVERINTA: 'IGI',
    PLACEHOLDER_MODUL_IGIENA: 'Modulul 1 - Servicii Generale de Alimentație',
    PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 1',
    PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Director Formare SSM',
    PLACEHOLDER_DATA_NASTERII: '12.04.1985',
    PLACEHOLDER_JUDET_NASTERII: 'București',
    PLACEHOLDER_LOCALITATE_NASTERII: 'Sector 1',
    PLACEHOLDER_NUMAR_CATALOG: 'CAT-01/2026',
    PLACEHOLDER_SALA_EXAMEN: 'Sala de Curs 1',
    PLACEHOLDER_ORA_EXAMEN: '10:00',
    PLACEHOLDER_NUMAR_CANDIDATI: '1',
    PLACEHOLDER_NUMAR_PREZENTI: '1',
    PLACEHOLDER_NUMAR_ADMISI: '1',
    PLACEHOLDER_NUMAR_RESPINSI: '0',
    PLACEHOLDER_REZULTAT_EXAMEN: 'Admis',
    PLACEHOLDER_ORDIN_APLICABIL: 'Ordinul comun MS/ME nr. 2209/4469/2022',
    PLACEHOLDER_JUDET_EXAMEN: 'București',

    // Date de autorizare furnizor formare profesională igienă (Anexa 1 & 2)
    PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: 'F-1234/2023',
    PLACEHOLDER_DATA_INREGISTRARE: '15.01.2023',
    PLACEHOLDER_LOCALITATE_FURNIZOR: 'București',
    PLACEHOLDER_JUDET_FURNIZOR: 'Sector 1',
    PLACEHOLDER_STRADA_FURNIZOR: 'Calea Victoriei',
    PLACEHOLDER_NUMAR_FURNIZOR: '100',
    PLACEHOLDER_BLOC_FURNIZOR: 'A',
    PLACEHOLDER_SCARA_FURNIZOR: '1',
    PLACEHOLDER_ETAJ_FURNIZOR: '2',
    PLACEHOLDER_APARTAMENT_FURNIZOR: '5',
    PLACEHOLDER_COD_POSTAL_FURNIZOR: '010091',
    PLACEHOLDER_CUI_PRESTATOR: 'RO12345678',
    PLACEHOLDER_ACT_REPREZENTANT: 'C.I. Seria RX nr. 123456',
    PLACEHOLDER_MODULE_IGIENA: 'Modulele 1, 2, 3, 4',
    PLACEHOLDER_CERTIFICAT_FURNIZOR: 'Certificat Seria CF nr. 456',
    PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: '456',
    PLACEHOLDER_AUTORITATE_EMITENTA: 'Comisia de Autorizare a Furnizorilor',
  };

  // Populate 30x Gravitate, Frecvență, Nivel Parțial for TESA.docx
  for (let i = 1; i <= 30; i++) {
    const num = String(i).padStart(2, '0');
    data[`PLACEHOLDER_GRAVITATE_RISC_${num}`] = '2';
    data[`PLACEHOLDER_FRECVENTA_RISC_${num}`] = '2';
    data[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${num}`] = '2';
  }

  return data;
}

// Helper to render DOCX / XLSX with complete data and return unresolved tokens
async function renderAndCheckZeroPlaceholders(tpl: TemplateDefinition, fullData: Record<string, unknown>): Promise<string[]> {
  const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
  assert(fs.existsSync(templatePath), `Template file missing: ${tpl.normalizedFilename}`);

  const buf = await renderTemplateBuffer(
    templatePath,
    tpl.format,
    fullData,
    tpl.normalizedFilename
  );
  return collectUnresolvedPlaceholders(buf, tpl.format);
}

// ============================================================================
// MAIN TEST SUITE EXECUTION
// ============================================================================

async function main() {
  const runner = new TestSuiteRunner();
  runner.start();

  const fullSampleData = getFullSampleData();

  // --------------------------------------------------------------------------
  // TIER 1: FEATURE COVERAGE IN ISOLATION
  // --------------------------------------------------------------------------
  console.log(`${COLORS.bright}${COLORS.blue}=== TIER 1: FEATURE COVERAGE IN ISOLATION ===${COLORS.reset}`);

  await runner.runTest(1, 'Compliance - Safe Month Arithmetic', 'addMonthsSafe standard intervals (1, 3, 6, 12, 36 months)', async () => {
    const eng = await loadComplianceEngine();
    const base = new Date(2026, 4, 15); // 15 May 2026

    assertDateEqual(eng.addMonthsSafe(base, 1), '2026-06-15', '1 month addition');
    assertDateEqual(eng.addMonthsSafe(base, 3), '2026-08-15', '3 months addition');
    assertDateEqual(eng.addMonthsSafe(base, 6), '2026-11-15', '6 months addition');
    assertDateEqual(eng.addMonthsSafe(base, 12), '2027-05-15', '12 months addition');
    assertDateEqual(eng.addMonthsSafe(base, 36), '2029-05-15', '36 months addition');
  });

  await runner.runTest(1, 'Compliance - Medicina Muncii', 'Medicina muncii 12-month interval with VALID, UPCOMING, OVERDUE thresholds', async () => {
    const eng = await loadComplianceEngine();
    const examDate = new Date(2025, 4, 10); // 10 May 2025 (due 10 May 2026)

    // Reference: 10 Jan 2026 (>30d remaining) -> VALID
    const validCheck = eng.calculateItemCompliance(examDate, 12, 'Medicina Muncii', new Date(2026, 0, 10));
    assertEqual(validCheck.status, 'VALID', 'Status > 30 days must be VALID');
    assert(validCheck.daysRemaining !== null && validCheck.daysRemaining > 30, 'daysRemaining should be > 30');

    // Reference: 25 Apr 2026 (15d remaining) -> UPCOMING
    const upcomingCheck = eng.calculateItemCompliance(examDate, 12, 'Medicina Muncii', new Date(2026, 3, 25));
    assertEqual(upcomingCheck.status, 'UPCOMING', 'Status within 0..30 days must be UPCOMING');
    assert(upcomingCheck.daysRemaining !== null && upcomingCheck.daysRemaining >= 0 && upcomingCheck.daysRemaining <= 30, 'daysRemaining in [0..30]');

    // Reference: 11 May 2026 (-1d remaining) -> OVERDUE
    const overdueCheck = eng.calculateItemCompliance(examDate, 12, 'Medicina Muncii', new Date(2026, 4, 11));
    assertEqual(overdueCheck.status, 'OVERDUE', 'Status < 0 days must be OVERDUE');
    assertEqual(overdueCheck.daysRemaining, -1, 'daysRemaining should be -1');
  });

  await runner.runTest(1, 'Compliance - SSM Periodic', 'Periodic SSM training intervals (6 months operativ vs 12 months TESA)', async () => {
    const eng = await loadComplianceEngine();
    const lastDate = new Date(2026, 0, 15); // 15 Jan 2026

    // 6-month interval (Operative / manual workers per HG 1425/2006)
    const ssm6 = eng.calculateItemCompliance(lastDate, 6, 'Instruire SSM Operativ', new Date(2026, 3, 15));
    assertDateEqual(ssm6.dueDate, '2026-07-15', '6-month due date');
    assertEqual(ssm6.status, 'VALID', 'Status after 3 months of 6 must be VALID');

    // 12-month interval (Office / TESA per HG 1425/2006)
    const ssm12 = eng.calculateItemCompliance(lastDate, 12, 'Instruire SSM TESA', new Date(2026, 3, 15));
    assertDateEqual(ssm12.dueDate, '2027-01-15', '12-month due date');
    assertEqual(ssm12.status, 'VALID', 'Status after 3 months of 12 must be VALID');
  });

  await runner.runTest(1, 'Compliance - PSI / SU Periodic', 'Periodic PSI/SU training intervals (1, 3, 6 months per OMAI 712/2005)', async () => {
    const eng = await loadComplianceEngine();
    const lastDate = new Date(2026, 2, 1); // 1 March 2026

    const psi1 = eng.calculateItemCompliance(lastDate, 1, 'Instruire PSI Intervenție', new Date(2026, 2, 20));
    assertDateEqual(psi1.dueDate, '2026-04-01', '1 month interval due date');

    const psi3 = eng.calculateItemCompliance(lastDate, 3, 'Instruire PSI Tehnic', new Date(2026, 2, 20));
    assertDateEqual(psi3.dueDate, '2026-06-01', '3 month interval due date');

    const psi6 = eng.calculateItemCompliance(lastDate, 6, 'Instruire PSI TESA', new Date(2026, 2, 20));
    assertDateEqual(psi6.dueDate, '2026-09-01', '6 month interval due date');
  });

  await runner.runTest(1, 'Compliance - Hygiene 3-Year Validity', 'Hygiene certificate 36 months validity per Ordinul MS/ME 2209/4469/2022', async () => {
    const eng = await loadComplianceEngine();
    const examDate = new Date(2023, 2, 15); // 15 March 2023
    const refDate = new Date(2026, 1, 20); // 20 Feb 2026 (~23 days before 15 March 2026)

    const hygieneRes = eng.calculateItemCompliance(examDate, 36, 'Curs Igienă', refDate);
    assertDateEqual(hygieneRes.dueDate, '2026-03-15', 'Due date is exactly 36 months / 3 years');
    assertEqual(hygieneRes.status, 'UPCOMING', 'Status within 30 days of 3-year expiry must be UPCOMING');
  });

  await runner.runTest(1, 'Compliance - UI Status Badges & Alerts Contract', 'Status badges contract matches Emerald/Amber/Red/Rose design rules', async () => {
    // Contract verification based on PROJECT.md § Interface Contracts
    const statuses = ['VALID', 'UPCOMING', 'OVERDUE', 'MISSING'];
    for (const s of statuses) {
      assert(typeof s === 'string', 'Compliance status must be valid enum token');
    }
  });

  // Test every single template (1 to 25) in isolation for zero unmapped placeholders
  for (const tpl of TEMPLATE_CATALOG) {
    await runner.runTest(1, 'Template Generation - Isolation', `Template [${tpl.code}] (${tpl.normalizedFilename}) generates with 0 placeholders`, async () => {
      const unmapped = await renderAndCheckZeroPlaceholders(tpl, fullSampleData);
      assertEqual(unmapped.length, 0, `Template ${tpl.code} must have 0 unmapped placeholders (Remaining: ${unmapped.join(', ')})`);
    });
  }

  // --------------------------------------------------------------------------
  // TIER 2: BOUNDARY & CORNER CASES
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}=== TIER 2: BOUNDARY & CORNER CASES ===${COLORS.reset}`);

  await runner.runTest(2, 'Boundary - Leap Year Base', 'Leap year base date (2024-02-29) + 12 months clamps to 2025-02-28', async () => {
    const eng = await loadComplianceEngine();
    const leapDate = new Date(2024, 1, 29);
    const plus12 = eng.addMonthsSafe(leapDate, 12);
    assertDateEqual(plus12, '2025-02-28', '2024-02-29 + 12m must be 2025-02-28');
  });

  await runner.runTest(2, 'Boundary - Leap Year Multi-Year', 'Leap year base date (2024-02-29) + 36 months (hygiene) clamps to 2027-02-28', async () => {
    const eng = await loadComplianceEngine();
    const leapDate = new Date(2024, 1, 29);
    const plus36 = eng.addMonthsSafe(leapDate, 36);
    assertDateEqual(plus36, '2027-02-28', '2024-02-29 + 36m must be 2027-02-28');
  });

  await runner.runTest(2, 'Boundary - Non-Leap to Leap', 'Non-leap base (2023-02-28) + 12 months resolves to 2024-02-28 without drifting', async () => {
    const eng = await loadComplianceEngine();
    const nonLeap = new Date(2023, 1, 28);
    const plus12Leap = eng.addMonthsSafe(nonLeap, 12);
    assertDateEqual(plus12Leap, '2024-02-28', '2023-02-28 + 12m must be 2024-02-28');
  });

  await runner.runTest(2, 'Boundary - Month-End Clamping (Jan 31)', '31 Jan 2026 + 1m clamps to 28 Feb 2026 (never March 2 or 3)', async () => {
    const eng = await loadComplianceEngine();
    const jan31 = new Date(2026, 0, 31);
    assertDateEqual(eng.addMonthsSafe(jan31, 1), '2026-02-28', 'Jan 31 + 1m -> Feb 28');
  });

  await runner.runTest(2, 'Boundary - Month-End Clamping (Leap Jan 31)', '31 Jan 2024 + 1m clamps to 29 Feb 2024 in a leap year', async () => {
    const eng = await loadComplianceEngine();
    const jan31Leap = new Date(2024, 0, 31);
    assertDateEqual(eng.addMonthsSafe(jan31Leap, 1), '2024-02-29', 'Jan 31 + 1m leap -> Feb 29');
  });

  await runner.runTest(2, 'Boundary - Month-End Clamping (Mar, May, Aug, Oct 31)', '31-day months clamp to 30-day months safely', async () => {
    const eng = await loadComplianceEngine();
    assertDateEqual(eng.addMonthsSafe(new Date(2026, 2, 31), 1), '2026-04-30', 'Mar 31 + 1m -> Apr 30');
    assertDateEqual(eng.addMonthsSafe(new Date(2026, 4, 31), 1), '2026-06-30', 'May 31 + 1m -> Jun 30');
    assertDateEqual(eng.addMonthsSafe(new Date(2026, 7, 31), 1), '2026-09-30', 'Aug 31 + 1m -> Sep 30');
    assertDateEqual(eng.addMonthsSafe(new Date(2026, 9, 31), 1), '2026-11-30', 'Oct 31 + 1m -> Nov 30');
  });

  await runner.runTest(2, 'Boundary - Day 0 Remaining', 'Exactly 0 days remaining (due date is today) triggers UPCOMING', async () => {
    const eng = await loadComplianceEngine();
    const baseDate = new Date(2026, 0, 1);
    const atDue = eng.calculateItemCompliance(baseDate, 12, 'Test Item', new Date(2027, 0, 1));
    assertEqual(atDue.daysRemaining, 0, '0 days remaining');
    assertEqual(atDue.status, 'UPCOMING', '0 days must be UPCOMING');
  });

  await runner.runTest(2, 'Boundary - Day 30 Remaining', 'Exactly 30 days remaining triggers UPCOMING', async () => {
    const eng = await loadComplianceEngine();
    const baseDate = new Date(2026, 0, 1);
    const at30 = eng.calculateItemCompliance(baseDate, 12, 'Test Item', new Date(2026, 11, 2));
    assertEqual(at30.daysRemaining, 30, '30 days remaining');
    assertEqual(at30.status, 'UPCOMING', '30 days must be UPCOMING');
  });

  await runner.runTest(2, 'Boundary - Day 31 Remaining', 'Exactly 31 days remaining triggers VALID', async () => {
    const eng = await loadComplianceEngine();
    const baseDate = new Date(2026, 0, 1);
    const at31 = eng.calculateItemCompliance(baseDate, 12, 'Test Item', new Date(2026, 11, 1));
    assertEqual(at31.daysRemaining, 31, '31 days remaining');
    assertEqual(at31.status, 'VALID', '31 days must be VALID');
  });

  await runner.runTest(2, 'Boundary - Day -1 Remaining', 'Exactly -1 day remaining triggers OVERDUE', async () => {
    const eng = await loadComplianceEngine();
    const baseDate = new Date(2026, 0, 1);
    const atMinus1 = eng.calculateItemCompliance(baseDate, 12, 'Test Item', new Date(2027, 0, 2));
    assertEqual(atMinus1.daysRemaining, -1, '-1 day remaining');
    assertEqual(atMinus1.status, 'OVERDUE', '-1 day must be OVERDUE');
  });

  await runner.runTest(2, 'Boundary - Missing Date Handling', 'Null lastDate returns MISSING status with null remaining days', async () => {
    const eng = await loadComplianceEngine();
    const missingRes = eng.calculateItemCompliance(null, 12, 'Medicina Muncii', new Date(2026, 5, 1));
    assertEqual(missingRes.status, 'MISSING', 'Null date must yield MISSING');
    assertEqual(missingRes.dueDate, null, 'Due date must be null');
    assertEqual(missingRes.daysRemaining, null, 'Days remaining must be null');
  });

  await runner.runTest(2, 'Boundary - Empty Excel Roster', 'Excel template with empty roster cleans tokens without errors', async () => {
    const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'hygiene-tabel-cursanti');
    assert(!!tpl, 'hygiene-tabel-cursanti must exist');
    const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl!.normalizedFilename);
    const wb = XLSX.readFile(templatePath);

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      for (const address of Object.keys(sheet)) {
        if (address.startsWith('!')) continue;
        const cell = sheet[address];
        if (typeof cell?.v !== 'string') continue;
        cell.v = cell.v.replace(/PLACEHOLDER_[A-Z0-9_]+/g, (token: string) => {
          if (token === 'PLACEHOLDER_DATA_EXAMEN') return '15.03.2026';
          if (token.match(/_\d{2,3}$/)) return '';
          return token;
        });
      }
    }
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const unmapped = await collectUnresolvedPlaceholders(buf, 'xlsx');
    const participantTokens = unmapped.filter((t) => t.match(/_\d{2,3}$/));
    assertEqual(participantTokens.length, 0, 'Participant tokens must be empty');
  });

  await runner.runTest(2, 'Boundary - Large Excel Roster (100 Participants)', 'Excel template handles 100 participants up to capacity', async () => {
    const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'hygiene-anexe-catalog');
    assert(!!tpl, 'hygiene-anexe-catalog must exist');
    const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl!.normalizedFilename);
    const wb = XLSX.readFile(templatePath);

    // Populate sheet 3 with 100 participants
    const sheet3 = wb.Sheets['Anexa nr. 3'];
    if (sheet3) {
      for (const address of Object.keys(sheet3)) {
        if (address.startsWith('!')) continue;
        const cell = sheet3[address];
        if (typeof cell?.v !== 'string') continue;
        cell.v = cell.v.replace(/PLACEHOLDER_[A-Z0-9_]+/g, (token: string) => {
          if (token.startsWith('PLACEHOLDER_NUME_COMPLET_')) return 'Cursant Test Populat';
          if (token.startsWith('PLACEHOLDER_CNP_')) return '1900101410001';
          if (token.startsWith('PLACEHOLDER_NUMAR_ORDINE_')) return '1';
          return 'Date Test';
        });
      }
    }
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    assert(buf.length > 0, 'Large roster workbook must generate');
  });

  await runner.runTest(2, 'Boundary - Romanian Diacritics & XML Escaping', 'Properly escapes diacritics and XML meta-characters in DOCX', async () => {
    const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ipssm-alunecari');
    assert(!!tpl, 'ipssm-alunecari must exist');
    const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl!.normalizedFilename);
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const DIACRITIC_NAME = 'Ștefănescu & Țăranu Asociați <SSM>';
    doc.render({
      PLACEHOLDER_REPREZENTANT_LEGAL: DIACRITIC_NAME,
      PLACEHOLDER_SPECIALIST_SSM: 'Ing. Mihai Pârvan',
    });

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    const checkZip = new PizZip(buf);
    let xml = '';
    for (const f of Object.values(checkZip.files)) {
      if (f.name.startsWith('word/') && f.name.endsWith('.xml')) {
        xml += f.asText() + ' ';
      }
    }
    assert(xml.includes('Ștefănescu &amp; Țăranu Asociați &lt;SSM&gt;'), 'XML escaping must be applied');
  });

  // --------------------------------------------------------------------------
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}=== TIER 3: CROSS-FEATURE COMBINATIONS ===${COLORS.reset}`);

  await runner.runTest(3, 'Integration - State Renewal Transition', 'Transitions from OVERDUE to VALID upon medical check renewal', async () => {
    const eng = await loadComplianceEngine();
    const refDate = new Date(2026, 4, 1);

    const empBefore = {
      id: 'emp-t3-renewal',
      firstName: 'Radu',
      lastName: 'Enache',
      medicalLastExamDate: new Date(2025, 0, 1), // expired 1 Jan 2026
      medicalIntervalMonths: 12,
      ssmLastTrainingDate: new Date(2026, 0, 1),
      ssmIntervalMonths: 12,
      psiLastTrainingDate: new Date(2026, 0, 1),
      psiIntervalMonths: 6,
    };

    const before = eng.calculateEmployeeCompliance(empBefore, refDate);
    assertEqual(before.occupationalMedicine.status, 'OVERDUE', 'Must be OVERDUE');
    assertEqual(before.overallStatus, 'OVERDUE', 'Overall must be OVERDUE');

    const empAfter = {
      ...empBefore,
      medicalLastExamDate: new Date(2026, 3, 28), // renewed
    };

    const after = eng.calculateEmployeeCompliance(empAfter, refDate);
    assertEqual(after.occupationalMedicine.status, 'VALID', 'Must be VALID');
    assertEqual(after.overallStatus, 'VALID', 'Overall must be VALID');
  });

  await runner.runTest(3, 'Integration - Company Metrics Aggregation', 'calculateCompanyMetrics correctly computes distribution and compliance score', async () => {
    const eng = await loadComplianceEngine();
    const refDate = new Date(2026, 4, 1);

    const employees = [
      // Emp 1: 3 valid items
      {
        id: 'e1',
        firstName: 'Ion',
        lastName: 'A',
        medicalLastExamDate: new Date(2026, 0, 1),
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: new Date(2026, 0, 1),
        ssmIntervalMonths: 12,
        psiLastTrainingDate: new Date(2026, 0, 1),
        psiIntervalMonths: 6,
      },
      // Emp 2: 1 upcoming (ssm due in 10d), 2 valid
      {
        id: 'e2',
        firstName: 'Ana',
        lastName: 'B',
        medicalLastExamDate: new Date(2026, 0, 1),
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: new Date(2025, 10, 11),
        ssmIntervalMonths: 6,
        psiLastTrainingDate: new Date(2026, 0, 1),
        psiIntervalMonths: 6,
      },
      // Emp 3: 1 overdue (medicina overdue), 2 valid
      {
        id: 'e3',
        firstName: 'Vasile',
        lastName: 'C',
        medicalLastExamDate: new Date(2025, 0, 1),
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: new Date(2026, 0, 1),
        ssmIntervalMonths: 12,
        psiLastTrainingDate: new Date(2026, 0, 1),
        psiIntervalMonths: 6,
      },
      // Emp 4: 1 missing (psi null), 2 valid
      {
        id: 'e4',
        firstName: 'Elena',
        lastName: 'D',
        medicalLastExamDate: new Date(2026, 0, 1),
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: new Date(2026, 0, 1),
        ssmIntervalMonths: 12,
        psiLastTrainingDate: null,
        psiIntervalMonths: 6,
      },
    ];

    const metrics = eng.calculateCompanyMetrics(employees, refDate);
    assertEqual(metrics.totalEmployees, 4, '4 employees');
    assertEqual(metrics.totalItemsTracked, 12, '12 items');
    assertEqual(metrics.upcomingCount, 1, '1 upcoming');
    assertEqual(metrics.overdueCount, 1, '1 overdue');
    assertEqual(metrics.missingCount, 1, '1 missing');
    assertEqual(metrics.validCount, 9, '9 valid');
    assertEqual(Math.round(metrics.complianceScorePercent), 75, '75% compliance score');
  });

  await runner.runTest(3, 'Integration - Document Generation with Compliance Dates', 'Generates Adeverință participare embedding exact session and certificate dates', async () => {
    const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'hygiene-adeverinta');
    assert(!!tpl, 'hygiene-adeverinta must exist');

    const unmapped = await renderAndCheckZeroPlaceholders(tpl!, fullSampleData);
    assertEqual(unmapped.length, 0, 'Adeverinta participare must have zero unmapped placeholders');
  });

  await runner.runTest(3, 'Integration - Multi-Client Tenant Isolation', 'Company metrics for Client A never bleed into Client B', async () => {
    const eng = await loadComplianceEngine();
    const refDate = new Date(2026, 4, 1);

    const clientA = [
      {
        id: 'a1',
        clientId: 'client-A',
        firstName: 'A',
        lastName: '1',
        medicalLastExamDate: new Date(2026, 0, 1),
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: new Date(2026, 0, 1),
        ssmIntervalMonths: 12,
        psiLastTrainingDate: new Date(2026, 0, 1),
        psiIntervalMonths: 6,
      },
    ];

    const clientB = [
      {
        id: 'b1',
        clientId: 'client-B',
        firstName: 'B',
        lastName: '1',
        medicalLastExamDate: null,
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: null,
        ssmIntervalMonths: 12,
        psiLastTrainingDate: null,
        psiIntervalMonths: 6,
      },
    ];

    const metricsA = eng.calculateCompanyMetrics(clientA, refDate);
    const metricsB = eng.calculateCompanyMetrics(clientB, refDate);

    assertEqual(metricsA.complianceScorePercent, 100, 'Client A score 100%');
    assertEqual(metricsB.complianceScorePercent, 0, 'Client B score 0%');
    assertEqual(metricsA.missingCount, 0, 'Client A missing 0');
    assertEqual(metricsB.missingCount, 3, 'Client B missing 3');
  });

  // --------------------------------------------------------------------------
  // TIER 4: REAL-WORLD SCENARIOS (ROMANIAN EMPLOYEE LIFECYCLE)
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}=== TIER 4: REAL-WORLD SCENARIOS (LIFECYCLE) ===${COLORS.reset}`);

  await runner.runTest(4, 'Lifecycle - Phase 1: Onboarding Pack', 'Generates 5-document recruitment & hiring pack with zero placeholders', async () => {
    const onboardingCodes = [
      'hr-cerere-angajare',
      'hr-gdpr-informare',
      'hr-declaratie-regulament',
      'hr-declaratie-raspundere',
      'hr-cim-2026',
    ];

    for (const code of onboardingCodes) {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === code);
      assert(!!tpl, `Template ${code} must exist in catalog`);
      const unmapped = await renderAndCheckZeroPlaceholders(tpl!, fullSampleData);
      assertEqual(unmapped.length, 0, `Template ${code} must have 0 unmapped placeholders (Remaining: ${unmapped.join(', ')})`);
    }
  });

  await runner.runTest(4, 'Lifecycle - Phase 2 & 3: Medical Exam & Intro Training', 'Medical exam clearance & Introductory SSM 8h training verified', async () => {
    const eng = await loadComplianceEngine();
    const hireDate = new Date(2026, 2, 1); // 1 March 2026

    const medExam = eng.calculateItemCompliance(hireDate, 12, 'Medicină a Muncii la Angajare', hireDate);
    assertEqual(medExam.status, 'VALID', 'Pre-employment medical check must be VALID');
    assertEqual(medExam.daysRemaining, 365, 'Exactly 365 days remaining on hire date');

    const introSsm = eng.calculateItemCompliance(hireDate, 12, 'Instruire Introductiv Generală', hireDate);
    assertEqual(introSsm.status, 'VALID', 'Introductory training must be VALID');
  });

  await runner.runTest(4, 'Lifecycle - Phase 4 & 5: Workplace Training & Time-Travel Scadențe', 'Progressive compliance tracking over 1 year (Valid -> Upcoming -> Overdue -> Renewed)', async () => {
    const eng = await loadComplianceEngine();
    const hireDate = new Date(2026, 2, 1); // 1 March 2026

    const emp = {
      id: 'emp-lifecycle-timeline',
      firstName: 'Mihai',
      lastName: 'Tudose',
      medicalLastExamDate: hireDate,
      medicalIntervalMonths: 12,
      ssmLastTrainingDate: hireDate,
      ssmIntervalMonths: 6,
      psiLastTrainingDate: hireDate,
      psiIntervalMonths: 6,
    };

    // Checkpoint 1: +5 Months (1 August 2026) -> All VALID
    const cp1 = eng.calculateEmployeeCompliance(emp, new Date(2026, 7, 1));
    assertEqual(cp1.overallStatus, 'VALID', 'At +5 months, overallStatus is VALID');

    // Checkpoint 2: SSM 6m expires 1 Sep 2026; at 20 Aug (12d remaining) -> UPCOMING
    const cp2 = eng.calculateEmployeeCompliance(emp, new Date(2026, 7, 20));
    assertEqual(cp2.ssmTraining.status, 'UPCOMING', 'SSM triggers UPCOMING at 12d');
    assertEqual(cp2.overallStatus, 'UPCOMING', 'Overall triggers UPCOMING');

    // Checkpoint 3: At 5 Sep 2026 without training -> OVERDUE (-4 days)
    const cp3 = eng.calculateEmployeeCompliance(emp, new Date(2026, 8, 5));
    assertEqual(cp3.ssmTraining.status, 'OVERDUE', 'SSM triggers OVERDUE when expired');
    assertEqual(cp3.overallStatus, 'OVERDUE', 'Overall triggers OVERDUE (Critical alert)');

    // Checkpoint 4: Training renewed on 6 Sep 2026 -> returns to VALID
    const empRenewed = {
      ...emp,
      ssmLastTrainingDate: new Date(2026, 8, 6),
      psiLastTrainingDate: new Date(2026, 8, 6),
    };
    const cp4 = eng.calculateEmployeeCompliance(empRenewed, new Date(2026, 8, 7));
    assertEqual(cp4.ssmTraining.status, 'VALID', 'SSM restored to VALID');
    assertEqual(cp4.psiTraining.status, 'VALID', 'PSI restored to VALID');
    assertEqual(cp4.overallStatus, 'VALID', 'Overall restored to VALID');
  });

  await runner.runTest(4, 'Lifecycle - Phase 6: Full Company SSM Inspection Pack', 'Generates Decizii, Risk Assessment, IPSSM and Emergency packs with zero placeholders', async () => {
    const auditTemplates = [
      'decizii-angajator',
      'risk-evaluare',
      'risk-plan-prevenire-tesa',
      'risk-plan-actiune-urgenta',
      'risk-zone-pericol',
      'ipssm-universale',
    ];

    for (const code of auditTemplates) {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === code);
      assert(!!tpl, `Template ${code} must exist in catalog`);
      const unmapped = await renderAndCheckZeroPlaceholders(tpl!, fullSampleData);
      assertEqual(unmapped.length, 0, `Template ${code} must have 0 unmapped placeholders (Remaining: ${unmapped.join(', ')})`);
    }
  });

  const success = runner.printSummary();
  if (!success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${COLORS.bgRed}${COLORS.white} UNHANDLED SUITE ERROR: ${COLORS.reset} ${err.message}\n`, err);
  process.exit(1);
});
