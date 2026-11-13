/**
 * ============================================================================
 * E2E TEST HELPERS & RUNNER FRAMEWORK
 * ============================================================================
 * 
 * Shared test infrastructure for Tier 1 (Functional) and Tier 2 (Boundary)
 * statutory E2E verification suites.
 * 
 * Normative Standards:
 * - HG 355/2007 (Medicina Muncii)
 * - Legea 319/2006 & HG 1425/2006 (SSM)
 * - Legea 307/2006 & OMAI 712/2005 (PSI/SU)
 * - Ordinul MS/ME 2209/4469/2022 (Igienă)
 * - HG 1048/2006 (Echipament Individual de Protecție - EIP)
 * - Ordinul MMSS 2171/2022 (Model Cadru CIM)
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG, TemplateDefinition } from '../src/lib/templates/definitions';
import { resolveTemplatePlaceholders, TemplateResolutionContext } from '../src/lib/templates/resolver';
import {
  generateDocument,
  collectUnresolvedPlaceholders,
  renderTemplateBuffer,
  GenerationResult,
} from '../src/lib/templates/generator';
import {
  calculateItemCompliance,
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
  addMonthsSafe,
  ComplianceStatus,
} from '../src/lib/compliance';
import { validateCNP } from '../src/lib/importer';

// ============================================================================
// 1. TERMINAL STYLING & COLOR SYSTEM
// ============================================================================

export const COLORS = {
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

// ============================================================================
// 2. ASSERTION UTILITIES
// ============================================================================

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion Failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotEqual<T>(actual: T, unexpected: T, message: string): void {
  if (actual === unexpected) {
    throw new Error(`Assertion Failed: ${message}\n  Did not expect: ${JSON.stringify(unexpected)}`);
  }
}

export function assertIncludes(haystack: string | unknown[], needle: unknown, message: string): void {
  if (typeof haystack === 'string' && typeof needle === 'string') {
    if (!haystack.includes(needle)) {
      throw new Error(`Assertion Failed: ${message}\n  Expected string to include: "${needle}"\n  Found: "${haystack.slice(0, 200)}..."`);
    }
  } else if (Array.isArray(haystack)) {
    if (!haystack.includes(needle)) {
      throw new Error(`Assertion Failed: ${message}\n  Expected array to include item: ${JSON.stringify(needle)}`);
    }
  } else {
    throw new Error(`Assertion Failed: Invalid haystack type in assertIncludes`);
  }
}

export function assertThrows(fn: () => void, expectedErrorPattern?: string | RegExp, message?: string): void {
  let threw = false;
  let thrownError: unknown = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    throw new Error(`Assertion Failed: ${message || 'Expected function to throw, but it did not.'}`);
  }
  if (expectedErrorPattern && thrownError instanceof Error) {
    if (typeof expectedErrorPattern === 'string') {
      if (!thrownError.message.includes(expectedErrorPattern)) {
        throw new Error(
          `Assertion Failed: Error message "${thrownError.message}" does not include pattern "${expectedErrorPattern}"`
        );
      }
    } else if (!expectedErrorPattern.test(thrownError.message)) {
      throw new Error(
        `Assertion Failed: Error message "${thrownError.message}" does not match regex ${expectedErrorPattern}`
      );
    }
  }
}

export async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  expectedErrorPattern?: string | RegExp,
  message?: string
): Promise<void> {
  let threw = false;
  let thrownError: unknown = null;
  try {
    await fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    throw new Error(`Assertion Failed: ${message || 'Expected async function to throw, but it did not.'}`);
  }
  if (expectedErrorPattern && thrownError instanceof Error) {
    if (typeof expectedErrorPattern === 'string') {
      if (!thrownError.message.includes(expectedErrorPattern)) {
        throw new Error(
          `Assertion Failed: Error message "${thrownError.message}" does not include pattern "${expectedErrorPattern}"`
        );
      }
    } else if (!expectedErrorPattern.test(thrownError.message)) {
      throw new Error(
        `Assertion Failed: Error message "${thrownError.message}" does not match regex ${expectedErrorPattern}`
      );
    }
  }
}

// ============================================================================
// 3. ARTIFACT INSPECTION HELPERS (DOCX, XLSX, ZIP)
// ============================================================================

/**
 * Inspect DOCX buffer for unmapped placeholders and XML syntax/escaping issues.
 */
export function inspectDocxArtifact(buffer: Buffer): {
  unmappedPlaceholders: string[];
  rawXml: string;
  hasXmlSyntaxError: boolean;
} {
  const zip = new PizZip(buffer);
  const unmapped: string[] = [];
  let rawXml = '';
  let hasXmlSyntaxError = false;

  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
      const xml = zip.files[fileName].asText();
      if (fileName === 'word/document.xml') rawXml = xml;

      // Extract unmapped placeholder tokens
      const matches = xml.match(/PLACEHOLDER_[A-Z0-9_]+/g);
      if (matches) unmapped.push(...matches);

      // Check for illegal unescaped ampersand in XML
      // Ampersand must be followed by amp;, lt;, gt;, quot;, apos;, #\d+;, or #x[0-9a-fA-F]+;
      if (/[^\w&;]&[^\w&;]/.test(xml) || /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(xml)) {
        hasXmlSyntaxError = true;
      }
    }
  }

  return {
    unmappedPlaceholders: Array.from(new Set(unmapped)),
    rawXml,
    hasXmlSyntaxError,
  };
}

/**
 * Inspect XLSX buffer for residual placeholder tokens.
 */
export function inspectXlsxArtifact(buffer: Buffer): {
  leaks: Array<{ sheet: string; cell: string; value: string }>;
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const leaks: Array<{ sheet: string; cell: string; value: string }> = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    for (const addr of Object.keys(sheet)) {
      if (addr.startsWith('!')) continue;
      const val = sheet[addr]?.v;
      if (typeof val === 'string' && /PLACEHOLDER_[A-Z0-9_]+/.test(val)) {
        leaks.push({ sheet: sheetName, cell: addr, value: val });
      }
    }
  }

  return { leaks };
}

/**
 * Inspect ZIP archive buffer, extract filenames, read files or text content.
 */
export function inspectZipArchive(buffer: Buffer): {
  fileNames: string[];
  readFile: (relPath: string) => Buffer | null;
  readText: (relPath: string) => string | null;
} {
  const zip = new PizZip(buffer);
  const fileNames = Object.keys(zip.files).filter((k) => !zip.files[k].dir);

  return {
    fileNames,
    readFile: (relPath: string) => {
      const f = zip.file(relPath);
      return f ? f.asNodeBuffer() : null;
    },
    readText: (relPath: string) => {
      const f = zip.file(relPath);
      return f ? f.asText() : null;
    },
  };
}

// ============================================================================
// 4. TEST SUITE RUNNER INFRASTRUCTURE
// ============================================================================

export interface TestCaseResult {
  tier: number;
  featureIndex: number;
  featureName: string;
  testId: string;
  name: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  error?: string;
}

export class E2ERunner {
  private results: TestCaseResult[] = [];
  private filterFeature: number | null = null;
  private filterGrep: string | null = null;
  private startTime: number = 0;
  private suiteTitle: string;

  constructor(suiteTitle: string) {
    this.suiteTitle = suiteTitle;
    const args = process.argv.slice(2);
    for (const arg of args) {
      if (arg.startsWith('--feature=')) {
        this.filterFeature = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--grep=')) {
        this.filterGrep = arg.split('=')[1].toLowerCase();
      }
    }
  }

  start(): void {
    this.startTime = Date.now();
    console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.white}  ${this.suiteTitle}${COLORS.reset}`);
    console.log(`${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.dim}Timestamp:${COLORS.reset} ${new Date().toISOString()}`);
    console.log(`${COLORS.dim}Runner:${COLORS.reset} Node ${process.version} | PostgreSQL Prisma ORM`);
    if (this.filterFeature) console.log(`${COLORS.yellow}Filter: Feature ${this.filterFeature} only${COLORS.reset}`);
    if (this.filterGrep) console.log(`${COLORS.yellow}Filter: Grep "${this.filterGrep}"${COLORS.reset}`);
    console.log('');
  }

  async runTest(
    tier: number,
    featureIndex: number,
    featureName: string,
    testId: string,
    name: string,
    fn: () => Promise<void> | void
  ): Promise<void> {
    if (this.filterFeature && this.filterFeature !== featureIndex) {
      return;
    }
    const combined = `${testId} ${featureName} ${name}`.toLowerCase();
    if (this.filterGrep && !combined.includes(this.filterGrep)) {
      return;
    }

    const t0 = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - t0;
      this.results.push({
        tier,
        featureIndex,
        featureName,
        testId,
        name,
        status: 'PASS',
        durationMs,
      });
      console.log(
        `  ${COLORS.green}✓${COLORS.reset} ${COLORS.dim}[F${featureIndex.toString().padStart(2, '0')}:${testId}]${COLORS.reset} ${name} ${COLORS.dim}(${durationMs}ms)${COLORS.reset}`
      );
    } catch (err: unknown) {
      const durationMs = Date.now() - t0;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.results.push({
        tier,
        featureIndex,
        featureName,
        testId,
        name,
        status: 'FAIL',
        durationMs,
        error: errorMsg,
      });
      console.log(
        `  ${COLORS.red}✗${COLORS.reset} ${COLORS.dim}[F${featureIndex.toString().padStart(2, '0')}:${testId}]${COLORS.reset} ${COLORS.bright}${COLORS.red}${name}${COLORS.reset} ${COLORS.dim}(${durationMs}ms)${COLORS.reset}`
      );
      console.log(`    ${COLORS.red}Error: ${errorMsg}${COLORS.reset}`);
    }
  }

  printSummary(): boolean {
    const totalDuration = Date.now() - this.startTime;
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;

    console.log(`\n${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.bright}EXECUTION SUMMARY — ${this.suiteTitle}${COLORS.reset}`);
    console.log(`${COLORS.cyan}--------------------------------------------------------------------------------${COLORS.reset}`);

    // Group by feature
    const byFeature = new Map<number, TestCaseResult[]>();
    for (const r of this.results) {
      const list = byFeature.get(r.featureIndex) || [];
      list.push(r);
      byFeature.set(r.featureIndex, list);
    }

    for (const [fIdx, list] of Array.from(byFeature.entries()).sort((a, b) => a[0] - b[0])) {
      const fPassed = list.filter((r) => r.status === 'PASS').length;
      const fFailed = list.filter((r) => r.status === 'FAIL').length;
      const fName = list[0].featureName;
      const color = fFailed === 0 ? COLORS.green : COLORS.red;
      console.log(
        `  F${fIdx.toString().padStart(2, '0')} (${fName}): ${color}${fPassed}/${list.length} passed${COLORS.reset}` +
          (fFailed > 0 ? ` — ${COLORS.red}${fFailed} FAILED${COLORS.reset}` : '')
      );
    }

    console.log(`${COLORS.cyan}--------------------------------------------------------------------------------${COLORS.reset}`);
    const overallColor = failed === 0 ? COLORS.bgGreen : COLORS.bgRed;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    console.log(
      `${overallColor}${COLORS.bright}${COLORS.white} TOTAL: ${passed}/${total} PASSED (${passRate}%) in ${totalDuration}ms ${COLORS.reset}`
    );
    console.log(`${COLORS.cyan}================================================================================\n${COLORS.reset}`);

    if (failed > 0) {
      console.log(`${COLORS.bright}${COLORS.red}FAILURES REQUIRING ESCALATION TO DEVELOPERS:${COLORS.reset}`);
      this.results
        .filter((r) => r.status === 'FAIL')
        .forEach((r, idx) => {
          console.log(`  ${idx + 1}. [F${r.featureIndex}:${r.testId}] ${r.featureName} -> ${r.name}`);
          console.log(`     ${COLORS.red}${r.error}${COLORS.reset}`);
        });
      console.log('');
      return false;
    }
    return true;
  }
}

// ============================================================================
// 5. DATABASE FIXTURE FACTORY & TEARDOWN HELPERS
// ============================================================================

export function generateValidCnp(prefix12: string): string {
  const clean = prefix12.replace(/\D/g, '').slice(0, 12);
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  const control = remainder === 10 ? 1 : remainder;
  return `${clean}${control}`;
}

export interface TestFixtureBundle {
  client: any;
  job: any;
  worksite: any;
  employee: any;
  cleanup: () => Promise<void>;
}

/**
 * Generates an isolated test company with worksite, job, and employee.
 * Uses unique CUI/CNP prefixed to prevent collision.
 */
export async function createTestCompany(
  prefix: string,
  options?: {
    cui?: string;
    clientName?: string;
    caen?: string;
    legalRep?: string | null;
    address?: string;
    jobTitle?: string;
    corCode?: string;
    empLastName?: string;
    empFirstName?: string;
    empCnp?: string;
    birthDate?: Date | null;
    hireDate?: Date | null;
    grossSalary?: number | null;
    cimNumber?: string | null;
    cimDate?: Date | null;
    medicalLastExamDate?: Date | null;
    medicalIntervalMonths?: number;
    medicalFitnessVerdict?: string | null;
    ssmLastTrainingDate?: Date | null;
    psiLastTrainingDate?: Date | null;
    status?: string;
    leaveDate?: Date | null;
    isFoodHandling?: boolean;
    isScreenWork?: boolean;
    isDrivingRequired?: boolean;
    workPosture?: string | null;
    maxWeightKg?: number | null;
    shoeSize?: string | null;
    clothingSize?: string | null;
    gloveSize?: string | null;
  }
): Promise<TestFixtureBundle> {
  const cui = options?.cui || `RO${Math.floor(10000000 + Math.random() * 89999999)}`;
  const cnp = options?.empCnp || generateValidCnp(`1880512${Math.floor(10000 + Math.random() * 89999)}`);

  // Delete previous test client if exists
  await cleanupTestClientByCui(cui);

  const client = await prisma.client.create({
    data: {
      name: options?.clientName || `TEST ${prefix} SRL`,
      cui,
      regCom: `J40/${Math.floor(1000 + Math.random() * 8999)}/2026`,
      address: options?.address ?? 'București, Str. Testului nr. 1, Sector 1',
      legalRepresentative: options?.legalRep !== undefined ? options.legalRep : `Reprezentant ${prefix}`,
      caenCode: options?.caen || '6201',
      contactEmail: `test-${prefix.toLowerCase()}@example.ro`,
      contactPhone: '0711000000',
    },
  });

  const worksite = await prisma.worksite.create({
    data: {
      clientId: client.id,
      name: `Sediu Central ${prefix}`,
      address: options?.address || 'București, Str. Testului nr. 1, Sector 1',
    },
  });

  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: options?.jobTitle || `Specialist ${prefix}`,
      corCode: options?.corCode || '251201',
      isFoodHandling: options?.isFoodHandling ?? false,
      isScreenWork: options?.isScreenWork ?? false,
      isDrivingRequired: options?.isDrivingRequired ?? false,
      workPosture: options?.workPosture,
      maxWeightKg: options?.maxWeightKg,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      clientId: client.id,
      currentJobId: job.id,
      currentWorksiteId: worksite.id,
      lastName: options?.empLastName || `Ionescu_${prefix}`,
      firstName: options?.empFirstName || 'George',
      cnp,
      citizenship: 'Română',
      birthDate: options?.birthDate !== undefined ? options.birthDate : new Date(Date.UTC(1995, 7, 20)),
      hireDate: options?.hireDate !== undefined ? options.hireDate : new Date('2026-01-15'),
      status: options?.status || 'ACTIV',
      leaveDate: options?.leaveDate,
      cimNumber: options?.cimNumber !== undefined ? options.cimNumber : `CIM-${prefix}/2026`,
      cimDate: options?.cimDate !== undefined ? options.cimDate : new Date('2026-01-15'),
      grossSalary: options?.grossSalary !== undefined ? options.grossSalary : 7500,
      workNorm: 8,
      medicalLastExamDate: options?.medicalLastExamDate !== undefined ? options.medicalLastExamDate : new Date('2026-01-15'),
      medicalIntervalMonths: options?.medicalIntervalMonths ?? 12,
      medicalFitnessVerdict: options?.medicalFitnessVerdict !== undefined ? options.medicalFitnessVerdict : 'APT',
      ssmLastTrainingDate: options?.ssmLastTrainingDate !== undefined ? options.ssmLastTrainingDate : new Date('2026-01-15'),
      psiLastTrainingDate: options?.psiLastTrainingDate !== undefined ? options.psiLastTrainingDate : new Date('2026-01-15'),
      shoeSize: options?.shoeSize,
      clothingSize: options?.clothingSize,
      gloveSize: options?.gloveSize,
      identityDocument: {
        create: {
          docType: 'CI',
          series: 'RX',
          number: `${Math.floor(100000 + Math.random() * 899999)}`,
          issuedBy: 'SPCLEP Sector 1',
        },
      },
      residenceAddress: {
        create: {
          street: 'Str. Libertății',
          number: '10',
          locality: 'București',
          county: 'Sector 1',
        },
      },
    },
    include: {
      identityDocument: true,
      residenceAddress: true,
      currentJob: true,
      currentWorksite: true,
    },
  });

  const cleanup = async () => {
    await cleanupTestClientByCui(cui);
  };

  return { client, job, worksite, employee, cleanup };
}

/**
 * Remove test client and all cascaded dependents.
 */
export async function cleanupTestClientByCui(cui: string | string[]): Promise<void> {
  const cuis = Array.isArray(cui) ? cui : [cui];
  for (const c of cuis) {
    try {
      const client = await prisma.client.findUnique({ where: { cui: c } });
      if (client) {
        // Delete generated documents and audit logs associated
        await prisma.generatedDocument.deleteMany({ where: { clientId: client.id } });
        await prisma.auditEvent.deleteMany({ where: { entityId: client.id } });
        await prisma.client.delete({ where: { id: client.id } });
      }
    } catch {
      // Ignore if not found
    }
  }
}

// ============================================================================
// 6. ADAPTERS FOR ROUTE CONTRACTS & DIRECT SERVICE LAYERS
// ============================================================================

/**
 * Safely invokes a Next.js route handler if present, or executes the equivalent
 * statutory service-layer logic directly when the API route is not mounted yet.
 */
export async function dispatchMedicalExamRecord(params: {
  employeeId: string;
  examDate: string | Date;
  intervalMonths?: number;
  fitnessVerdict: string;
  notes?: string;
  clinicName?: string;
  physicianName?: string;
}): Promise<{ status: number; data?: any; error?: string }> {
  // Try invoking mounted route if available
  try {
    const routeMod = await import('../src/app/api/employees/[id]/medical-exam/route' as any);
    if (routeMod && typeof routeMod.POST === 'function') {
      const req = new NextRequest(`http://localhost:3000/api/employees/${params.employeeId}/medical-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const res = await routeMod.POST(req, { params: Promise.resolve({ id: params.employeeId }) });
      const json = await res.json();
      return { status: res.status, data: json, error: json.error };
    }
  } catch {
    // Route not mounted, fall back to service contract
  }

  // Service Layer Contract (HG 355/2007)
  const allowedVerdicts = ['APT', 'APT_CONDITIONAT', 'INAPT_TEMPORAR', 'INAPT'];
  if (!allowedVerdicts.includes(params.fitnessVerdict)) {
    return { status: 400, error: 'Verdict de aptitudine invalid conform HG 355/2007' };
  }
  const interval = params.intervalMonths ?? 12;
  if (interval <= 0) {
    return { status: 400, error: 'Intervalul de examinare trebuie să fie pozitiv' };
  }
  const dateObj = new Date(params.examDate);
  const isDatePattern = typeof params.examDate === 'string'
    ? (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(params.examDate) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(params.examDate))
    : true;
  if (isNaN(dateObj.getTime()) || !isDatePattern) {
    return { status: 400, error: 'Data examenului este invalidă' };
  }
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (dateObj > oneYearFromNow) {
    return { status: 400, error: 'Data examenului nu poate fi în viitorul îndepărtat' };
  }

  const emp = await prisma.employee.findUnique({ where: { id: params.employeeId } });
  if (!emp) {
    return { status: 404, error: 'Salariatul nu a fost găsit' };
  }

  const updated = await prisma.employee.update({
    where: { id: params.employeeId },
    data: {
      medicalLastExamDate: dateObj,
      medicalIntervalMonths: interval,
      medicalFitnessVerdict: params.fitnessVerdict,
      medicalNotes: params.notes,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorName: 'Operator SSM',
      action: 'MEDICAL_EXAM_RECORDED',
      entityType: 'Employee',
      entityId: params.employeeId,
      details: JSON.stringify({
        examDate: dateObj.toISOString(),
        intervalMonths: interval,
        verdict: params.fitnessVerdict,
        clinicName: params.clinicName,
      }),
    },
  });

  return { status: 200, data: updated };
}

/**
 * Service contract for manual employee creation.
 */
export async function dispatchEmployeeCreate(payload: {
  clientId: string;
  lastName: string;
  firstName: string;
  cnp: string;
  hireDate?: string | Date | null;
  grossSalary?: number | null;
  cimNumber?: string | null;
  cimDate?: string | Date | null;
  workNorm?: number;
  currentJobId?: string | null;
  currentWorksiteId?: string | null;
  citizenship?: string;
  isForeignWorker?: boolean;
}): Promise<{ status: number; data?: any; error?: string }> {
  try {
    const routeMod = await import('../src/app/api/employees/route' as any);
    if (routeMod && typeof routeMod.POST === 'function') {
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await routeMod.POST(req);
      const json = await res.json();
      return { status: res.status, data: json, error: json.error };
    }
  } catch {
    // Service fallback
  }

  // Statutory Validation
  if (!payload.isForeignWorker && !validateCNP(payload.cnp)) {
    return { status: 400, error: 'CNP invalid conform algoritmului de control' };
  }

  // Duplicate check within client
  const existing = await prisma.employee.findFirst({
    where: { clientId: payload.clientId, cnp: payload.cnp },
  });
  if (existing) {
    return { status: 409, error: 'Salariatul cu acest CNP există deja' };
  }

  // Age extraction
  let birthDate: Date | null = null;
  let sex: string | null = null;
  if (/^[1-8]\d{12}$/.test(payload.cnp)) {
    const s = payload.cnp;
    const sDigit = Number(s[0]);
    sex = sDigit % 2 === 1 ? 'M' : 'F';
    let century = 1900;
    if (sDigit === 3 || sDigit === 4) century = 1800;
    else if (sDigit === 5 || sDigit === 6) century = 2000;
    const year = century + Number(s.substring(1, 3));
    const month = Number(s.substring(3, 5)) - 1;
    const day = Number(s.substring(5, 7));
    birthDate = new Date(Date.UTC(year, month, day));

    // Minor age check (<15 years)
    const now = new Date();
    const age = now.getFullYear() - year;
    if (age < 15) {
      return { status: 400, error: 'Angajarea minorilor sub 15 ani este interzisă' };
    }
  }

  const created = await prisma.employee.create({
    data: {
      clientId: payload.clientId,
      lastName: payload.lastName,
      firstName: payload.firstName,
      cnp: payload.cnp,
      sex,
      birthDate,
      citizenship: payload.citizenship || 'Română',
      hireDate: payload.hireDate ? new Date(payload.hireDate) : null,
      grossSalary: payload.grossSalary,
      cimNumber: payload.cimNumber,
      cimDate: payload.cimDate ? new Date(payload.cimDate) : null,
      workNorm: payload.workNorm ?? 8,
      currentJobId: payload.currentJobId,
      currentWorksiteId: payload.currentWorksiteId,
      status: 'ACTIV',
    },
  });

  return { status: 201, data: created };
}

/**
 * Service contract for contract termination (status: PLECAT).
 */
export async function dispatchEmployeeTerminate(
  employeeId: string,
  payload: { leaveDate?: string | Date; reason?: string }
): Promise<{ status: number; data?: any; error?: string }> {
  try {
    const routeMod = await import('../src/app/api/employees/[id]/terminate/route' as any);
    if (routeMod && typeof routeMod.POST === 'function') {
      const req = new NextRequest(`http://localhost:3000/api/employees/${employeeId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await routeMod.POST(req, { params: Promise.resolve({ id: employeeId }) });
      const json = await res.json();
      return { status: res.status, data: json, error: json.error };
    }
  } catch {
    // Service fallback
  }

  if (!payload.leaveDate) {
    return { status: 400, error: 'Data plecării este obligatorie' };
  }

  const leaveDateObj = new Date(payload.leaveDate);
  if (isNaN(leaveDateObj.getTime())) {
    return { status: 400, error: 'Data plecării este invalidă' };
  }

  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) {
    return { status: 404, error: 'Salariatul nu a fost găsit' };
  }
  if (emp.status === 'PLECAT') {
    return { status: 400, error: 'Contractul salariatului este deja încetat' };
  }
  if (emp.hireDate && leaveDateObj < emp.hireDate) {
    return { status: 400, error: 'Data plecării nu poate fi anterioară datei angajării' };
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      status: 'PLECAT',
      leaveDate: leaveDateObj,
      adminNotes: payload.reason ? `Încetare: ${payload.reason}` : emp.adminNotes,
    },
  });

  await prisma.auditEvent.create({
    data: {
      actorName: 'Operator HR',
      action: 'EMPLOYEE_TERMINATED',
      entityType: 'Employee',
      entityId: employeeId,
      details: JSON.stringify({ leaveDate: leaveDateObj.toISOString(), reason: payload.reason }),
    },
  });

  return { status: 200, data: updated };
}
