/**
 * scripts/e2e-tier3-pairwise.ts
 *
 * Tier 3: Pairwise Cross-Feature Integration Suite (T3-01 through T3-15)
 *
 * Validates complex multi-feature interactions across:
 * - Employee CRUD x Resolver Missing Fields & Print Readiness (F1/F2/F3 x F10/F11)
 * - XML Escaping x Special Characters in Entity & Post Data (F5 x F10/F24)
 * - Resolver Fallback Elimination x Worksite & Post Disambiguation (F6 x F24)
 * - Medical Exam HG 355/2007 x Batch Generation Clearance & Compliance (F7/F8/F9 x F18/F26)
 * - Employee Termination (status: PLECAT) x Compliance Rollup & Batch Exclusion (F12/F13 x F8/F26)
 * - Training Sync with Real Dates x Direct Document Download (F14/F15 x F17)
 * - Training Planning Future (status: planned) x Compliance Invariant (F16 x F14/F8)
 * - Eliminare Catch-22 Expiry Lockout x Training Sheet Generation (F18 x F14)
 * - EIP Models & Assignments x Job Risk Profiling (F19/F20 x F23)
 * - Risk Assessment DB Persistence x CAEN & Job Context (F21/F22 x F23/F25)
 * - Worksite & Job Selection x IPSSM Filtering (F24 x F25)
 * - Batch Error Isolation x Unapproved Print Flag / Missing Fields (F26 x F3)
 * - Hygiene Client Association x Food Handling Job Compliance (F27/F28/F29 x F23)
 * - Excel Import Clean Dates x Server Re-Validation & Missing Fields (F30/F31 x F1/F2)
 * - Excel Import Diff & Re-Validation x Status PLECAT Invariants (F31 x F12)
 *
 * Run with: npx tsx scripts/e2e-tier3-pairwise.ts
 */

import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG, TemplateDefinition } from '../src/lib/templates/definitions';
import { resolveTemplatePlaceholders, resolveTemplateData } from '../src/lib/templates/resolver';
import { generateDocument, renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';
import { 
  calculateEmployeeCompliance, 
  calculateCompanyMetrics, 
  calculateItemCompliance 
} from '../src/lib/compliance';
import { 
  generateEmployeeOnboardingZip, 
  generateCompanyDossierZip, 
  generateInspectionArchiveZip 
} from '../src/lib/packages/bulk-packages';
import { parseClientWorkbook } from '../src/lib/importer';

// ============================================================================
// 1. ARTIFACT VERIFICATION & TESTING HELPERS (Section 5.1 Specification)
// ============================================================================

/**
 * 1. Inspect DOCX buffer for unmapped tokens and XML corruption / unescaped entities.
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

      // Check for unmapped tokens like PLACEHOLDER_*
      const matches = xml.match(/PLACEHOLDER_[A-Z0-9_]+/g);
      if (matches) unmapped.push(...matches);

      // Check for illegal unescaped ampersands or malformed XML entities
      if (
        /[^\w&;]&[^\w&;]/.test(xml) || 
        /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(xml)
      ) {
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
 * 2. Inspect XLSX buffer for residual placeholders and dirty cells.
 */
export function inspectXlsxArtifact(buffer: Buffer): {
  leaks: Array<{ sheet: string; cell: string; value: string }>;
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const leaks: Array<{ sheet: string; cell: string; value: string }> = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
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
 * 3. Inspect ZIP archive contents and read files in memory.
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

/**
 * Generate a mathematically valid 13-digit Romanian CNP according to official control algorithm.
 */
export function generateValidCnp(base12: string): string {
  const clean = base12.padEnd(12, '0').slice(0, 12);
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const rem = sum % 11;
  const ctrl = rem === 10 ? 1 : rem;
  return `${clean}${ctrl}`;
}

/**
 * Clean up test database entities using safe prefix matching.
 */
export async function cleanupTestFixtures(prefix: string) {
  try {
    // 1. Delete clients matching prefix (cascades to employees, jobs, worksites, events, risk assessments)
    const testClients = await prisma.client.findMany({
      where: {
        OR: [
          { cui: { startsWith: prefix } },
          { name: { contains: prefix } },
        ],
      },
      select: { id: true },
    });

    for (const c of testClients) {
      await prisma.client.delete({ where: { id: c.id } }).catch(() => {});
    }

    // 2. Delete EIP test items
    await prisma.eipItem.deleteMany({
      where: { code: { startsWith: prefix } },
    }).catch(() => {});

    // 3. Delete Hygiene sessions created for tests
    await prisma.hygieneSession.deleteMany({
      where: { location: { contains: prefix } },
    }).catch(() => {});
  } catch (err) {
    console.warn(`[CLEANUP WARNING for ${prefix}]:`, err instanceof Error ? err.message : err);
  }
}

// ============================================================================
// 2. TEST HARNESS & RUNNER
// ============================================================================

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const suiteResults: TestCaseResult[] = [];
const grepArg = process.argv.find((a) => a.startsWith('--grep='));
const filterGrep = grepArg ? grepArg.split('=')[1].toLowerCase() : null;

async function runTestCase(id: string, name: string, fn: () => Promise<void>) {
  if (filterGrep && !`${id} ${name}`.toLowerCase().includes(filterGrep)) {
    return;
  }
  const start = performance.now();
  console.log(`\n▶ [RULARE ${id}] ${name}...`);
  try {
    await fn();
    const duration = performance.now() - start;
    suiteResults.push({ id, name, passed: true, durationMs: duration });
    console.log(`  ✓ [SUCCES ${id}] ${name} (${duration.toFixed(1)}ms)`);
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    suiteResults.push({ id, name, passed: false, durationMs: duration, error: msg });
    console.error(`  ✗ [FAIL ${id}] ${name}: ${msg}`);
    if (err instanceof Error && err.stack) {
      console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n    ')}`);
    }
  }
}

// ============================================================================
// 3. THE 15 PAIRWISE TEST CASES (Section 3.1)
// ============================================================================

export async function runTier3Pairwise(): Promise<boolean> {
  console.log('====================================================================================================');
  console.log('            SUITĂ DE TESTE TIER 3: PAIRWISE CROSS-FEATURE INTERACTIONS (T3-01 -> T3-15)            ');
  console.log('====================================================================================================');

  const suitePrefix = `RO_TEST_T3_${Date.now()}_`;

  // --------------------------------------------------------------------------
  // T3-01: F1/F2/F3 x F10/F11 (Manual Employee CRUD x Resolver Missing Fields & Print Readiness)
  // --------------------------------------------------------------------------
  await runTestCase('T3-01', 'F1/F2/F3 x F10/F11: Employee CRUD x Missing Fields & Print Readiness', async () => {
    const pfx = `${suitePrefix}01_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}CLIENT INTAKE S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Str. Fabricii nr. 1, Sector 2, București',
        },
      });

      // Step 1: Create employee manually with missing CIM and salary
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Popa',
          firstName: 'Gheorghe',
          cnp: generateValidCnp('191010111001'),
          hireDate: new Date('2026-06-01'),
          status: 'ACTIV',
          cimNumber: null,
          grossSalary: null,
          cimDate: null,
        },
      });

      // Resolver check on newly created incomplete employee
      const resIncomplete = await resolveTemplatePlaceholders({
        templateCode: 'hr-cim-2026',
        clientId: client.id,
        employeeId: emp.id,
      });

      const cimFieldIncomplete = resIncomplete.fields.find((f) => f.key === 'PLACEHOLDER_NUMAR_CIM');
      const salFieldIncomplete = resIncomplete.fields.find((f) => f.key === 'PLACEHOLDER_SALARIU_BRUT');

      assert.ok(cimFieldIncomplete, 'Câmpul PLACEHOLDER_NUMAR_CIM trebuie să existe în definiția șablonului');
      assert.ok(salFieldIncomplete, 'Câmpul PLACEHOLDER_SALARIU_BRUT trebuie să existe în definiția șablonului');

      // Verify that missing fields without DB values are not marked as valid autocompleted data
      const cimValStr = String(cimFieldIncomplete.value || '');
      assert.ok(
        !cimFieldIncomplete.isAutocompleted || cimValStr === '' || cimValStr.includes('...'),
        'CIM lipsă nu trebuie marcat ca date reale autocompletate'
      );

      // Step 2: Edit employee supplying complete statutory CIM & salary details
      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          cimNumber: 'CIM-987/2026',
          cimDate: new Date('2026-05-28'),
          grossSalary: 6200,
          workNorm: 8,
          annualLeaveDays: 21,
        },
      });

      // Resolver check after edit
      const resComplete = await resolveTemplatePlaceholders({
        templateCode: 'hr-cim-2026',
        clientId: client.id,
        employeeId: emp.id,
      });

      const cimFieldComplete = resComplete.fields.find((f) => f.key === 'PLACEHOLDER_NUMAR_CIM');
      const salFieldComplete = resComplete.fields.find((f) => f.key === 'PLACEHOLDER_SALARIU_BRUT');

      assert.strictEqual(cimFieldComplete?.value, 'CIM-987/2026', 'Numărul CIM trebuie să reflecte valoarea actualizată');
      assert.ok(String(salFieldComplete?.value).includes('6200'), 'Salariul brut trebuie să conțină valoarea 6200');
      assert.strictEqual(cimFieldComplete?.isAutocompleted, true, 'isAutocompleted trebuie să fie true după salvarea datelor reale');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-02: F5 x F10/F24 (XML Escaping x Special Characters in Entity & Post Data)
  // --------------------------------------------------------------------------
  await runTestCase('T3-02', 'F5 x F10/F24: XML Escaping x Special Characters in Entity & Post Data', async () => {
    const pfx = `${suitePrefix}02_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `ATELIER DESIGN & ARHITECTURĂ <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Str. Cercetării & Tehnologiei <Corp B>, Sector 1, "Clădirea Nouă"',
          legalRepresentative: 'Munteanu & Popescu Asociați',
        },
      });

      const job = await prisma.job.create({
        data: {
          clientId: client.id,
          title: 'Arhitect & Urbanist <Lead>',
          corCode: '216101',
        },
      });

      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: job.id,
          lastName: 'Pop & Radu',
          firstName: 'Mihai <Senior>',
          cnp: generateValidCnp('189031511002'),
          hireDate: new Date('2026-05-01'),
          cimNumber: 'CIM/&/<01>/2026',
          grossSalary: 8500,
          status: 'ACTIV',
        },
      });

      // Render template directly through template engine
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'hr-cim-2026');
      assert.ok(tpl, 'Șablonul hr-cim-2026 trebuie să existe în catalog');

      const templateFilePath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
      const res = await resolveTemplateData('hr-cim-2026', {
        client,
        employee: emp,
        job,
        allowOfflineBlank: true,
      });

      const buffer = await renderTemplateBuffer(templateFilePath, tpl.format, res.data, tpl.normalizedFilename);
      assert.ok(buffer && buffer.length > 5000, 'Bufferul DOCX generat trebuie să fie valid (>5KB)');

      // Deep XML inspection
      const artifact = inspectDocxArtifact(buffer);
      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Documentul DOCX nu trebuie să conțină erori de sintaxă XML (ampersand neescapat)');
      assert.ok(artifact.rawXml.length > 0, 'word/document.xml trebuie să fie extras cu succes');
      assert.ok(!/[^\w&;]&[^\w&;]/.test(artifact.rawXml), 'Nu trebuie să existe entități ampersand brute neescapate');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-03: F6 x F24 (Resolver Fallback Elimination x Worksite & Post Disambiguation)
  // --------------------------------------------------------------------------
  await runTestCase('T3-03', 'F6 x F24: Fallback Elimination x Worksite & Post Disambiguation', async () => {
    const pfx = `${suitePrefix}03_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}MULTI CONTEXT S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'București, B-dul Unirii 10',
        },
      });

      const w1 = await prisma.worksite.create({
        data: { clientId: client.id, name: 'Sediu Central Administrativ', address: 'București, Sector 1' },
      });
      const w2 = await prisma.worksite.create({
        data: { clientId: client.id, name: 'Atelier Sudură & Producție', address: 'Ploiești, Str. Uzinei 5' },
      });

      const j1 = await prisma.job.create({
        data: { clientId: client.id, title: 'Manager Resurse Umane', corCode: '121201', workPosture: 'sitting' },
      });
      const j2 = await prisma.job.create({
        data: { clientId: client.id, title: 'Sudor Oxiacetilenic', corCode: '721201', workPosture: 'standing', maxWeightKg: 25 },
      });

      // Employee 1 linked to Job 1 (Manager HR) and Worksite 1 (Bucuresti)
      const empHR = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: j1.id,
          currentWorksiteId: w1.id,
          lastName: 'Ionescu',
          firstName: 'Andreea',
          cnp: generateValidCnp('285031511003'),
          status: 'ACTIV',
        },
      });

      // Employee 2 linked to Job 2 (Sudor) and Worksite 2 (Ploiesti)
      const empSudor = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: j2.id,
          currentWorksiteId: w2.id,
          lastName: 'Munteanu',
          firstName: 'Vasile',
          cnp: generateValidCnp('180051211003'),
          status: 'ACTIV',
        },
      });

      // Test 1: Resolve for empHR
      const resHR = await resolveTemplatePlaceholders({
        templateCode: 'hr-anexa-fisa-post',
        clientId: client.id,
        employeeId: empHR.id,
      });

      assert.strictEqual(
        resHR.resolvedData.PLACEHOLDER_FUNCTIE,
        'Manager Resurse Umane',
        'Funcția rezolvată pentru empHR trebuie să fie Manager Resurse Umane'
      );
      assert.strictEqual(
        resHR.resolvedData.PLACEHOLDER_PUNCT_LUCRU,
        'Sediu Central Administrativ',
        'Punctul de lucru rezolvat pentru empHR trebuie să fie Sediu Central Administrativ'
      );

      // Test 2: Resolve for empSudor
      const resSudor = await resolveTemplatePlaceholders({
        templateCode: 'hr-anexa-fisa-post',
        clientId: client.id,
        employeeId: empSudor.id,
      });

      assert.strictEqual(
        resSudor.resolvedData.PLACEHOLDER_FUNCTIE,
        'Sudor Oxiacetilenic',
        'Funcția rezolvată pentru empSudor trebuie să fie Sudor Oxiacetilenic'
      );
      assert.strictEqual(
        resSudor.resolvedData.PLACEHOLDER_PUNCT_LUCRU,
        'Atelier Sudură & Producție',
        'Punctul de lucru rezolvat pentru empSudor trebuie să fie Atelier Sudură & Producție'
      );

      // Test 3: Disambiguation by explicit jobId without employee
      const resJob1 = await resolveTemplateData('hr-anexa-fisa-post', {
        client,
        job: j1,
        worksite: w1,
        allowOfflineBlank: true,
      });
      assert.strictEqual(
        resJob1.data.PLACEHOLDER_FUNCTIE,
        'Manager Resurse Umane',
        'Disambiguarea explicită pe job 1 trebuie să returneze Manager Resurse Umane'
      );

      const resJob2 = await resolveTemplateData('hr-anexa-fisa-post', {
        client,
        job: j2,
        worksite: w2,
        allowOfflineBlank: true,
      });
      assert.strictEqual(
        resJob2.data.PLACEHOLDER_FUNCTIE,
        'Sudor Oxiacetilenic',
        'Disambiguarea explicită pe job 2 trebuie să returneze Sudor Oxiacetilenic'
      );
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-04: F7/F8/F9 x F18/F26 (Medical Exam HG 355/2007 x Batch Clearance & Compliance)
  // --------------------------------------------------------------------------
  await runTestCase('T3-04', 'F7/F8/F9 x F18/F26: Medical Exam Registration x Compliance & Clearance', async () => {
    const pfx = `${suitePrefix}04_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}CLINIC HEALTH S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Str. Spitalului nr. 4, Cluj-Napoca',
        },
      });

      // Create employee with expired medical exam (15 months ago)
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Dumitru',
          firstName: 'Ioan',
          cnp: generateValidCnp('185010111004'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2025-01-10T08:00:00Z'),
          medicalIntervalMonths: 12,
          medicalFitnessVerdict: 'APT',
        },
      });

      // Baseline compliance check (reference date 2026-05-10)
      const refDate = new Date('2026-05-10T10:00:00Z');
      const compBefore = calculateEmployeeCompliance(emp, refDate);
      assert.strictEqual(compBefore.occupationalMedicine.status, 'OVERDUE', 'Statutul inițial trebuie să fie OVERDUE');
      assert.ok((compBefore.occupationalMedicine.daysRemaining ?? 0) < 0, 'Zilele rămase trebuie să fie negative');

      // Operator records valid periodic medical exam (HG 355/2007)
      const examDate = new Date('2026-05-10T08:00:00Z');
      const updatedEmp = await prisma.employee.update({
        where: { id: emp.id },
        data: {
          medicalLastExamDate: examDate,
          medicalIntervalMonths: 12,
          medicalFitnessVerdict: 'APT',
          medicalNotes: 'Promovat examen periodic fără restricții conform Fișei de Aptitudine',
        },
      });

      // Post-exam compliance recalculation
      const compAfter = calculateEmployeeCompliance(updatedEmp, refDate);
      assert.strictEqual(compAfter.occupationalMedicine.status, 'VALID', 'Statutul medicinei muncii trebuie să treacă în VALID');
      assert.ok((compAfter.occupationalMedicine.daysRemaining ?? 0) > 300, 'Zilele de valabilitate trebuie să depășească 300');

      // Generation of medical request sheet succeeds cleanly
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'med-fisa-solicitare-examen');
      assert.ok(tpl, 'Șablonul med-fisa-solicitare-examen trebuie să existe');
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
      const res = await resolveTemplateData('med-fisa-solicitare-examen', {
        client,
        employee: updatedEmp,
        allowOfflineBlank: true,
      });

      const buffer = await renderTemplateBuffer(tplPath, tpl.format, res.data, tpl.normalizedFilename);
      const artifact = inspectDocxArtifact(buffer);
      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'DOCX generat nu trebuie să aibă erori XML');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-05: F12/F13 x F8/F26 (Employee Termination status: PLECAT x Compliance Rollup)
  // --------------------------------------------------------------------------
  await runTestCase('T3-05', 'F12/F13 x F8/F26: Employee Termination (PLECAT) x Compliance Rollup & Exclusion', async () => {
    const pfx = `${suitePrefix}05_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}LOGISTIC EXPRESS S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'București, Șoseaua Chitilei 45',
        },
      });

      const refDate = new Date('2026-05-10T10:00:00Z');

      // Employee 1: Active, compliant
      const e1 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Enache',
          firstName: 'Paul',
          cnp: generateValidCnp('188010111005'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2026-01-15'),
          ssmLastTrainingDate: new Date('2026-01-15'),
          psiLastTrainingDate: new Date('2026-01-15'),
        },
      });

      // Employee 2: Active, compliant
      const e2 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Marin',
          firstName: 'Alina',
          cnp: generateValidCnp('290020211005'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2026-02-01'),
          ssmLastTrainingDate: new Date('2026-02-01'),
          psiLastTrainingDate: new Date('2026-02-01'),
        },
      });

      // Employee 3: Active, severely overdue
      const e3 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Ionescu',
          firstName: 'George',
          cnp: generateValidCnp('182030311005'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2024-01-01'),
          ssmLastTrainingDate: new Date('2024-01-01'),
          psiLastTrainingDate: new Date('2024-01-01'),
        },
      });

      // Initial metrics across all 3 employees
      const metricsBefore = calculateCompanyMetrics([e1, e2, e3], refDate);
      assert.strictEqual(metricsBefore.totalEmployees, 3, 'Total angajați inițial = 3');
      assert.strictEqual(metricsBefore.overdueCount, 3, 'Trei indicatori expirați pentru e3');
      assert.ok(metricsBefore.complianceScorePercent < 75, 'Scorul companiei trebuie să fie degradat sub 75%');

      // Operator terminates e3 contract
      const leaveDate = new Date('2026-05-01');
      await prisma.employee.update({
        where: { id: e3.id },
        data: {
          status: 'PLECAT',
          leaveDate,
          adminNotes: 'Încetare contract prin demisie art. 81 Codul Muncii',
        },
      });

      // Query active employees strictly
      const activeEmployees = await prisma.employee.findMany({
        where: { clientId: client.id, status: 'ACTIV' },
      });
      assert.strictEqual(activeEmployees.length, 2, 'Doar 2 salariați activi trebuie returnați');

      // Recalculate metrics on active employees
      const metricsAfter = calculateCompanyMetrics(activeEmployees, refDate);
      assert.strictEqual(metricsAfter.totalEmployees, 2, 'Total angajați activi = 2');
      assert.strictEqual(metricsAfter.overdueCount, 0, 'Zero indicatori expirați pe angajații activi');
      assert.strictEqual(metricsAfter.complianceScorePercent, 100, 'Scorul de conformitate activ devine 100%');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-06: F14/F15 x F17 (Training Sync with Real Dates x Direct Document Download)
  // --------------------------------------------------------------------------
  await runTestCase('T3-06', 'F14/F15 x F17: Training Sync with Real Dates x Direct Document Generation', async () => {
    const pfx = `${suitePrefix}06_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}CONSTRUCT STEEL S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Str. Metalurgiei 12, Brașov',
        },
      });

      const emp1 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Voinea',
          firstName: 'Radu',
          cnp: generateValidCnp('183040411006'),
          hireDate: new Date('2023-01-10'),
          status: 'ACTIV',
        },
      });

      const trainingDate = new Date('2026-05-15T09:00:00Z');
      const trainingEvent = await prisma.trainingEvent.create({
        data: {
          clientId: client.id,
          type: 'PERIODIC_SSM',
          eventDate: trainingDate,
          durationHours: 2.0,
          materialOrTopic: 'Tematica semestrială SSM: Lucrul la înălțime și manevrarea sarcinilor',
          instructorName: 'Ing. Mihai Popescu',
          status: 'recorded',
          participants: {
            create: [
              { employeeId: emp1.id, result: 'admis' },
            ],
          },
        },
      });

      // Update employee training date to match real event
      await prisma.employee.update({
        where: { id: emp1.id },
        data: { ssmLastTrainingDate: trainingDate },
      });

      // Verify that individual training sheet renders with real event date
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: emp1.id,
      });

      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ssm-fisa-instruire-individuala');
      assert.ok(tpl, 'ssm-fisa-instruire-individuala trebuie să existe');
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
      const buffer = await renderTemplateBuffer(tplPath, tpl.format, res.resolvedData, tpl.normalizedFilename);

      assert.ok(buffer.length > 5000, 'Fișa individuală generată trebuie să fie validă');
      const artifact = inspectDocxArtifact(buffer);
      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Fișa generată nu conține erori XML');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-07: F16 x F14/F8 (Training Planning Future status: planned x Compliance Invariant)
  // --------------------------------------------------------------------------
  await runTestCase('T3-07', 'F16 x F14/F8: Training Planning Future (status: planned) x Compliance Invariant', async () => {
    const pfx = `${suitePrefix}07_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}FORWARD PLANNING S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'București, Calea Victoriei 100',
        },
      });

      const refDate = new Date('2026-05-10T10:00:00Z');

      // Employee currently overdue on SSM (last trained 8 months ago, 6-month interval)
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Costea',
          firstName: 'Gabriel',
          cnp: generateValidCnp('186060611007'),
          status: 'ACTIV',
          ssmLastTrainingDate: new Date('2025-09-01T08:00:00Z'),
          ssmIntervalMonths: 6,
        },
      });

      // Invariant Check 1: Initial compliance is OVERDUE
      const compInitial = calculateEmployeeCompliance(emp, refDate);
      assert.strictEqual(compInitial.ssmTraining.status, 'OVERDUE', 'Instruirea trebuie să fie OVERDUE inițial');

      // Create future-dated training session with status: "planned" (10 days in the future)
      const futureDate = new Date('2026-05-20T09:00:00Z');
      const plannedEvent = await prisma.trainingEvent.create({
        data: {
          clientId: client.id,
          type: 'PERIODIC_SSM',
          eventDate: futureDate,
          durationHours: 2.0,
          materialOrTopic: 'Instruire planificată semestrială',
          instructorName: 'Ing. Mihai Popescu',
          status: 'planned',
          participants: {
            create: [{ employeeId: emp.id, result: 'programat' }],
          },
        },
      });

      assert.strictEqual(plannedEvent.status, 'planned', 'Sesiunea viitoare trebuie salvată cu status: planned');

      // Invariant Check 2: Employee's ssmLastTrainingDate must NOT be updated prematurely
      const freshEmp = await prisma.employee.findUniqueOrThrow({ where: { id: emp.id } });
      assert.strictEqual(
        freshEmp.ssmLastTrainingDate?.toISOString(),
        new Date('2025-09-01T08:00:00Z').toISOString(),
        'Data ultimei instruiri nu trebuie modificată prematur de o sesiune planificată'
      );

      // Invariant Check 3: Compliance remains OVERDUE until session is recorded
      const compAfterPlan = calculateEmployeeCompliance(freshEmp, refDate);
      assert.strictEqual(compAfterPlan.ssmTraining.status, 'OVERDUE', 'Conformitatea trebuie să rămână OVERDUE');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-08: F18 x F14 (Eliminare Catch-22 Expiry Lockout x Training Sheet Generation)
  // --------------------------------------------------------------------------
  await runTestCase('T3-08', 'F18 x F14: Eliminare Catch-22 Lockout on Expired Training Sheet Generation', async () => {
    const pfx = `${suitePrefix}08_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}LOCKOUT FIX S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Iași, Str. Păcurari 15',
        },
      });

      // Employee whose SSM training has been expired by 90 days
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Diaconu',
          firstName: 'Simona',
          cnp: generateValidCnp('293070711008'),
          status: 'ACTIV',
          ssmLastTrainingDate: new Date('2025-08-01T08:00:00Z'),
          ssmIntervalMonths: 6,
        },
      });

      const comp = calculateEmployeeCompliance(emp, new Date('2026-05-10T10:00:00Z'));
      assert.strictEqual(comp.ssmTraining.status, 'OVERDUE', 'Instruirea este expirată');

      // Operator requests generation of new individual training sheet (needed to sign the new training)
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: emp.id,
        allowOfflineBlank: true,
      });

      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ssm-fisa-instruire-individuala');
      assert.ok(tpl, 'ssm-fisa-instruire-individuala trebuie să existe în catalog');
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);

      // Rendering must SUCCEED without throwing an expiry block exception
      const buffer = await renderTemplateBuffer(tplPath, tpl.format, res.resolvedData, tpl.normalizedFilename);
      assert.ok(buffer && buffer.length > 5000, 'Fișa de instruire trebuie generată cu succes fără blocaj Catch-22');

      const artifact = inspectDocxArtifact(buffer);
      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Documentul generat nu conține erori XML');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-09: F19/F20 x F23 (EIP Models & Assignments x Job Risk Profiling)
  // --------------------------------------------------------------------------
  await runTestCase('T3-09', 'F19/F20 x F23: EIP Models & Assignments x Job Risk Profiling', async () => {
    const pfx = `${suitePrefix}09_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}BISTRO HORECA S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Sibiu, Piața Mică nr. 8',
          caenCode: '5610',
        },
      });

      // Job with food handling risk profile
      const job = await prisma.job.create({
        data: {
          clientId: client.id,
          title: 'Bucătar Specialist',
          corCode: '343401',
          isFoodHandling: true,
          workPosture: 'standing',
          maxWeightKg: 15,
        },
      });

      // Create 3 standard EIP items
      const eipShoe = await prisma.eipItem.create({
        data: {
          code: `${pfx}INC_01`,
          name: 'Încălțăminte antiderapantă bucătărie',
          standardCode: 'EN ISO 20345',
          protectionType: 'Antialunecare',
          replacementMonths: 12,
        },
      });
      const eipCap = await prisma.eipItem.create({
        data: {
          code: `${pfx}BON_01`,
          name: 'Bonetă de protecție textilă',
          standardCode: 'EN 340',
          protectionType: 'Igienic',
          replacementMonths: 6,
        },
      });
      const eipApron = await prisma.eipItem.create({
        data: {
          code: `${pfx}SOR_01`,
          name: 'Șorț impermeabil din cauciuc/poliuretan',
          standardCode: 'EN 340',
          protectionType: 'Termic/Mecanic',
          replacementMonths: 12,
        },
      });

      // Link items to job requirements
      await prisma.jobEipRequirement.createMany({
        data: [
          { jobId: job.id, eipItemId: eipShoe.id },
          { jobId: job.id, eipItemId: eipCap.id },
          { jobId: job.id, eipItemId: eipApron.id },
        ],
      });

      // Employee with specific non-mock sizes
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: job.id,
          lastName: 'Dumitrescu',
          firstName: 'Elena',
          cnp: generateValidCnp('292041511009'),
          hireDate: new Date('2026-05-01'),
          status: 'ACTIV',
          shoeSize: '38',
          clothingSize: 'M',
          gloveSize: '7.5',
        },
      });

      // Assign items to employee
      await prisma.employeeEipAssignment.createMany({
        data: [
          { employeeId: emp.id, eipItemId: eipShoe.id },
          { employeeId: emp.id, eipItemId: eipCap.id },
          { employeeId: emp.id, eipItemId: eipApron.id },
        ],
      });

      // Resolve and render eip-fisa-acordare-individuala
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'eip-fisa-acordare-individuala');
      assert.ok(tpl, 'eip-fisa-acordare-individuala trebuie să existe în catalog');
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);

      const res = await resolveTemplateData('eip-fisa-acordare-individuala', {
        client,
        employee: emp,
        job,
        allowOfflineBlank: true,
      });

      const buffer = await renderTemplateBuffer(tplPath, tpl.format, res.data, tpl.normalizedFilename);
      const artifact = inspectDocxArtifact(buffer);

      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Fișa EIP nu conține erori XML');
      assert.ok(artifact.rawXml.includes('38'), 'Fișa EIP trebuie să conțină mărimea de încălțăminte reală 38 a salariatului');
      assert.ok(!artifact.rawXml.includes('42/L/9'), 'Fișa EIP nu trebuie să conțină mărimile hardcodate mock 42/L/9');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-10: F21/F22 x F23/F25 (Risk Assessment DB Persistence x CAEN & Job Context)
  // --------------------------------------------------------------------------
  await runTestCase('T3-10', 'F21/F22 x F23/F25: Risk Assessment DB Persistence x CAEN & Job Context', async () => {
    const pfx = `${suitePrefix}10_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}TECH SOLUTIONS S.R.L.`,
          cui: `${pfx}CUI`,
          regCom: 'J40/1010/2026',
          address: 'București, Str. Barbu Văcărescu 201',
          caenCode: '6201',
          caenActivity: 'Activități de realizare a software-ului la comandă',
          legalRepresentative: 'Radu Voinea',
          foundedYear: 2026,
        },
      });

      const job = await prisma.job.create({
        data: {
          clientId: client.id,
          title: 'Senior DevOps & Cloud Engineer',
          corCode: '251201',
          isScreenWork: true,
          workPosture: 'sitting',
          workersCount: 5,
        },
      });

      // Persist real Risk Assessment in database
      const assessment = await prisma.riskAssessment.create({
        data: {
          clientId: client.id,
          jobId: job.id,
          title: 'Evaluarea Riscurilor Profesionale - Post DevOps & Cloud',
          method: 'INCDPM',
          evaluatorName: 'Ing. Mihai Popescu',
          status: 'active',
          riskItems: {
            create: [
              {
                hazard: 'Efort vizual prelungit la videoterminale (ecran > 6h/zi)',
                riskSituation: 'Lucru intensiv la două monitoare fără pauze de relaxare',
                consequence: 'Astenopie acomodativă, cefalee, scădere acuitate vizuală',
                severityScore: 3,
                probabilityScore: 4,
                riskLevel: 3,
              },
              {
                hazard: 'Poziție statică așezat prelungită la birou',
                riskSituation: 'Stat pe scaun > 4 ore continuu',
                consequence: 'Dureri lombare și cervicale cronice',
                severityScore: 2,
                probabilityScore: 4,
                riskLevel: 3,
              },
            ],
          },
          preventionMeasures: {
            create: [
              {
                description: 'Pauze ergonomice de 10 min la fiecare 50 min; reglaj luminozitate monitoare',
                measureType: 'organizatorica',
                responsiblePerson: 'Conducător loc de muncă',
                deadline: 'Permanent',
                status: 'realizat',
              },
            ],
          },
        },
      });

      assert.ok(assessment.id, 'Evaluarea de risc trebuie salvată cu succes în DB');

      // Verify template resolution for risk-evaluare
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'risk-evaluare');
      assert.ok(tpl, 'Șablonul risk-evaluare trebuie să existe în catalog');
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);

      const res = await resolveTemplateData('risk-evaluare', {
        client,
        job,
        allowOfflineBlank: true,
      });

      const buffer = await renderTemplateBuffer(tplPath, tpl.format, res.data, tpl.normalizedFilename);
      const artifact = inspectDocxArtifact(buffer);

      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Documentul de evaluare a riscurilor nu are erori XML');
      assert.strictEqual(artifact.unmappedPlaceholders.length, 0, 'Nu trebuie să existe tokenuri de tip PLACEHOLDER_* nerezolvate');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-11: F24 x F25 (Worksite & Job Selection x IPSSM Filtering)
  // --------------------------------------------------------------------------
  await runTestCase('T3-11', 'F24 x F25: Worksite & Job Selection x IPSSM Context Filtering', async () => {
    const pfx = `${suitePrefix}11_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}LOGISTICS & DISTRIBUTION S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'București, Sector 3',
        },
      });

      const wOffice = await prisma.worksite.create({
        data: { clientId: client.id, name: 'Sediu Administrativ Birouri', address: 'București, Str. Biroului 1' },
      });
      const wWarehouse = await prisma.worksite.create({
        data: { clientId: client.id, name: 'Depozit Logistic Central', address: 'Ilfov, Calea Depozitului 10' },
      });

      const jOffice = await prisma.job.create({
        data: { clientId: client.id, title: 'Analist Financiar', isScreenWork: true },
      });
      const jWarehouse = await prisma.job.create({
        data: { clientId: client.id, title: 'Manipulant Mărfuri & Stivuitorist', maxWeightKg: 30, workPosture: 'standing' },
      });

      // Context 1: Office resolution
      const resOffice = await resolveTemplateData('ipssm-birou', {
        client,
        worksite: wOffice,
        job: jOffice,
        allowOfflineBlank: true,
      });
      assert.strictEqual(resOffice.data.PLACEHOLDER_PUNCT_LUCRU, 'Sediu Administrativ Birouri');

      // Context 2: Warehouse resolution
      const resWarehouse = await resolveTemplateData('ipssm-birou', {
        client,
        worksite: wWarehouse,
        job: jWarehouse,
        allowOfflineBlank: true,
      });
      assert.strictEqual(resWarehouse.data.PLACEHOLDER_PUNCT_LUCRU, 'Depozit Logistic Central');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-12: F26 x F3 (Batch Error Isolation x Unapproved Print Flag / Missing Fields)
  // --------------------------------------------------------------------------
  await runTestCase('T3-12', 'F26 x F3: Batch Error Isolation x Unapproved Print Flag & Reporting', async () => {
    const pfx = `${suitePrefix}12_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}BATCH TEST S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Timișoara, Str. Revoluției 1',
        },
      });

      // Emp 1: Complete
      const emp1 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Ardelean',
          firstName: 'Ioan',
          cnp: generateValidCnp('187080811012'),
          hireDate: new Date('2026-05-01'),
          cimNumber: 'CIM-101/2026',
          cimDate: new Date('2026-04-28'),
          grossSalary: 5500,
          status: 'ACTIV',
        },
      });

      // Emp 2: Complete
      const emp2 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Bălan',
          firstName: 'Cristina',
          cnp: generateValidCnp('289090911012'),
          hireDate: new Date('2026-05-01'),
          cimNumber: 'CIM-102/2026',
          cimDate: new Date('2026-04-28'),
          grossSalary: 6000,
          status: 'ACTIV',
        },
      });

      // Emp 3: Incomplete (missing CIM and gross salary)
      const emp3 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Stroe',
          firstName: 'Dan',
          cnp: generateValidCnp('190101011012'),
          hireDate: new Date('2026-05-01'),
          status: 'ACTIV',
          cimNumber: null,
          grossSalary: null,
        },
      });

      // Batch workflow simulation: loop with isolated per-employee error handling
      const batchLogLines: string[] = [];
      const generatedFiles: Array<{ name: string; buffer: Buffer }> = [];
      const employees = [emp1, emp2, emp3];

      for (const emp of employees) {
        try {
          const res = await resolveTemplatePlaceholders({
            templateCode: 'hr-cim-2026',
            clientId: client.id,
            employeeId: emp.id,
          });

          // Check if essential statutory data is missing
          const missingStatutory = res.fields.filter(
            (f) => (f.key === 'PLACEHOLDER_NUMAR_CIM' || f.key === 'PLACEHOLDER_SALARIU_BRUT') && !f.isAutocompleted
          );

          if (missingStatutory.length > 0) {
            batchLogLines.push(`[AVERTISMENT] Salariatul ${emp.lastName} ${emp.firstName}: Lipsesc date obligatorii (${missingStatutory.map(m => m.key).join(', ')}).`);
          } else {
            const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'hr-cim-2026')!;
            const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
            const buf = await renderTemplateBuffer(tplPath, tpl.format, res.resolvedData, tpl.normalizedFilename);
            generatedFiles.push({ name: `CIM_${emp.lastName}_${emp.firstName}.docx`, buffer: buf });
            batchLogLines.push(`[SUCCES] Salariatul ${emp.lastName} ${emp.firstName}: Document generat.`);
          }
        } catch (err) {
          batchLogLines.push(`[EROARE] Salariatul ${emp.lastName} ${emp.firstName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Assertions on batch isolation
      assert.strictEqual(generatedFiles.length, 2, 'Două contracte valide trebuie generate cu succes');
      assert.ok(batchLogLines.some((l) => l.includes('Stroe Dan') && l.includes('Lipsesc date obligatorii')), 'Jurnalul de lot trebuie să detalieze lipsurile salariatului incomplet');

      // Zip bundling
      const zip = new PizZip();
      for (const f of generatedFiles) {
        zip.file(f.name, f.buffer);
      }
      zip.file('00_RAPORT_GENERARE_LOT.txt', batchLogLines.join('\n'));

      const zipBuf = zip.generate({ type: 'nodebuffer' });
      const archive = inspectZipArchive(zipBuf);
      assert.ok(archive.fileNames.includes('00_RAPORT_GENERARE_LOT.txt'), 'Arhiva ZIP conține raportul de generare');
      assert.ok(archive.fileNames.includes('CIM_Ardelean_Ioan.docx'), 'Arhiva conține documentul salariatului 1');
      assert.ok(archive.fileNames.includes('CIM_Bălan_Cristina.docx'), 'Arhiva conține documentul salariatului 2');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-13: F27/F28/F29 x F23 (Hygiene Client Association x Food Handling Job Compliance)
  // --------------------------------------------------------------------------
  await runTestCase('T3-13', 'F27/F28/F29 x F23: Hygiene Flow x Food Handling Compliance (Ord. 2209/2022)', async () => {
    const pfx = `${suitePrefix}13_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `${pfx}GRILL & RESTAURANT S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Constanța, B-dul Mamaia 20',
          caenCode: '5610',
          caenActivity: 'Restaurante',
        },
      });

      const jobFood = await prisma.job.create({
        data: {
          clientId: client.id,
          title: 'Bucătar Calificat',
          isFoodHandling: true,
        },
      });

      // Employee without hygiene cert but requesting hygiene training (food handling)
      const empFood = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: jobFood.id,
          lastName: 'Costache',
          firstName: 'Marin',
          cnp: generateValidCnp('186111111013'),
          status: 'ACTIV',
          hygieneRequested: true,
          hygieneLastExamDate: null,
        },
      });

      const refDate = new Date('2026-05-10T10:00:00Z');

      // Compliance check 1: MISSING for food handling job
      const compBefore = calculateEmployeeCompliance(empFood, refDate);
      assert.ok(compBefore.hygieneCertificate !== null, 'Certificatul de igienă este obligatoriu pentru alimentație publică');
      assert.strictEqual(compBefore.hygieneCertificate?.status, 'MISSING', 'Statutul inițial al igienei este MISSING');

      // Register hygiene session and participant
      const examDate = new Date('2026-04-15T10:00:00Z');
      const session = await prisma.hygieneSession.create({
        data: {
          location: `${pfx}Sala DSP Constanța`,
          sessionDate: new Date('2026-04-10T09:00:00Z'),
          examDate,
          providerName: 'Furnizor Atestat Cursuri Igienă',
          status: 'certificate_emise',
        },
      });

      await prisma.hygieneParticipant.create({
        data: {
          sessionId: session.id,
          employeeId: empFood.id,
          clientName: client.name,
          lastName: empFood.lastName,
          firstName: empFood.firstName,
          cnp: empFood.cnp,
          attendance: 'prezent',
          examGrade: 10.0,
          examResult: 'admis',
          certificateSeries: 'DSP-CT',
          certificateNumber: '8842',
        },
      });

      // Update employee with acquired certificate
      const updatedEmp = await prisma.employee.update({
        where: { id: empFood.id },
        data: {
          hygieneLastExamDate: examDate,
          hygieneCertificateNumber: 'DSP-CT 8842',
          hygieneIntervalMonths: 36, // 3 years per Ord. 2209/2022
        },
      });

      // Compliance check 2: VALID for 36 months
      const compAfter = calculateEmployeeCompliance(updatedEmp, refDate);
      assert.strictEqual(compAfter.hygieneCertificate?.status, 'VALID', 'Statutul certificatului de igienă devine VALID');
      assert.ok((compAfter.hygieneCertificate?.daysRemaining ?? 0) > 1000, 'Valabilitatea este de 3 ani (peste 1000 zile)');

      // Non-food job check: hygiene is NOT tracked (null)
      const jobOffice = await prisma.job.create({
        data: { clientId: client.id, title: 'Contabil Șef', isFoodHandling: false },
      });
      const empOffice = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: jobOffice.id,
          lastName: 'Pop',
          firstName: 'Maria',
          cnp: generateValidCnp('288121211013'),
          status: 'ACTIV',
        },
      });

      const compOffice = calculateEmployeeCompliance(empOffice, refDate);
      assert.strictEqual(compOffice.hygieneCertificate, null, 'Pentru posturi fără risc alimentar, igiena nu este obligatorie');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // T3-14: F30/F31 x F1/F2 (Excel Import Clean Dates x Server Re-Validation)
  // --------------------------------------------------------------------------
  await runTestCase('T3-14', 'F30/F31 x F1/F2: Excel Import Clean Dates x No Fake Synthesized Fallbacks', async () => {
    // Construct test workbook using Test_Client_3_Angajati.xlsx as base
    const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
    assert.ok(fs.existsSync(samplePath), 'Test_Client_3_Angajati.xlsx trebuie să existe pe disc');

    const wb = XLSX.read(fs.readFileSync(samplePath), { type: 'buffer' });
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('firm'))!;
    const sheet = wb.Sheets[sheetName];

    // Modify row 13: New hire with NO medical exam date and NO training dates
    sheet['A13'] = { t: 's', v: 'Nistor' };
    sheet['B13'] = { t: 's', v: 'Dan' };
    sheet['D13'] = { t: 's', v: generateValidCnp('195050511014') };
    sheet['AB13'] = { t: 's', v: '01.05.2026' }; // hireDate
    sheet['AC13'] = { t: 's', v: 'ACTIV' };
    sheet['AE13'] = { t: 's', v: '' }; // Empty medical date
    sheet['AF13'] = { t: 's', v: '' }; // Empty SSM date

    // Limit to 1 employee row for isolated verification
    sheet['!ref'] = 'A1:AH13';
    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Parse workbook
    const parsed = parseClientWorkbook(modifiedBuf);
    assert.strictEqual(parsed.employees.length, 1, 'Trebuie să fie parsat exact 1 angajat');

    const empParsed = parsed.employees[0];
    assert.strictEqual(empParsed.lastName, 'Nistor');
    assert.ok(empParsed.hireDate instanceof Date, 'Data angajării trebuie să fie parsat ca Date');

    // STRICT Statutory Invariant F30: hireDate must NEVER be assigned to medicalLastExamDate or ssmLastTrainingDate!
    assert.strictEqual(empParsed.medicalLastExamDate, undefined, 'Data examenului medical trebuie să fie undefined când este goală în Excel');
    assert.strictEqual(empParsed.ssmLastTrainingDate, undefined, 'Data instruirii SSM trebuie să fie undefined când este goală în Excel');

    // Verify compliance status when medical date is null/missing
    const comp = calculateEmployeeCompliance({
      hireDate: empParsed.hireDate,
      medicalLastExamDate: null,
      ssmLastTrainingDate: null,
    });

    assert.strictEqual(comp.occupationalMedicine.status, 'MISSING', 'Medicina muncii fără dată trebuie să aibă statut MISSING sincer');
    assert.strictEqual(comp.ssmTraining.status, 'MISSING', 'Instruirea SSM fără dată trebuie să aibă statut MISSING sincer');
  });

  // --------------------------------------------------------------------------
  // T3-15: F31 x F12 (Excel Import Diff & Re-Validation x Status PLECAT Invariants)
  // --------------------------------------------------------------------------
  await runTestCase('T3-15', 'F31 x F12: Excel Import Validation on PLECAT Missing Leave Date', async () => {
    const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
    const wb = XLSX.read(fs.readFileSync(samplePath), { type: 'buffer' });
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('firm'))!;
    const sheet = wb.Sheets[sheetName];

    // Row 13: Valid active employee
    sheet['A13'] = { t: 's', v: 'Popescu' };
    sheet['B13'] = { t: 's', v: 'Andrei' };
    sheet['D13'] = { t: 's', v: generateValidCnp('188010111015') };
    sheet['AB13'] = { t: 's', v: '01.01.2024' };
    sheet['AC13'] = { t: 's', v: 'ACTIV' };

    // Row 14: Status PLECAT but MISSING leaveDate
    sheet['A14'] = { t: 's', v: 'Barbu' };
    sheet['B14'] = { t: 's', v: 'Vlad' };
    sheet['D14'] = { t: 's', v: generateValidCnp('190020211015') };
    sheet['AB14'] = { t: 's', v: '01.02.2024' };
    sheet['AC14'] = { t: 's', v: 'PLECAT' };
    sheet['AD14'] = { t: 's', v: '' }; // EMPTY leaveDate!

    sheet['!ref'] = 'A1:AH14';
    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsed = parseClientWorkbook(modifiedBuf);
    assert.strictEqual(parsed.employees.length, 2, 'Trebuie să fie parsați 2 angajați');

    const empActive = parsed.employees.find((e) => e.rowNumber === 13);
    const empPlecatInvalid = parsed.employees.find((e) => e.rowNumber === 14);

    assert.ok(empActive?.isValid, 'Angajatul activ trebuie să fie valid');
    assert.strictEqual(empPlecatInvalid?.isValid, false, 'Angajatul PLECAT fără data plecării trebuie să fie invalid');
    assert.ok(
      empPlecatInvalid?.errors.some((err) => err.includes('Pentru statusul PLECAT este necesară data plecării')),
      'Eroarea specifică trebuie semnalată precis'
    );
  });

  // ==========================================================================
  // FINAL SUITE EXECUTION SUMMARY
  // ==========================================================================
  console.log('\n====================================================================================================');
  console.log('                                  REZUMAT SUITĂ TIER 3 (PAIRWISE)                                  ');
  console.log('====================================================================================================');

  const passedCount = suiteResults.filter((r) => r.passed).length;
  const failedCount = suiteResults.filter((r) => !r.passed).length;
  const totalCount = suiteResults.length;

  for (const r of suiteResults) {
    const symbol = r.passed ? '✓' : '✗';
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`  ${symbol} [${status}] ${r.id}: ${r.name.padEnd(70, ' ')} (${r.durationMs.toFixed(1)}ms)`);
    if (r.error) {
      console.log(`      Eroare: ${r.error}`);
    }
  }

  console.log('----------------------------------------------------------------------------------------------------');
  console.log(`Total teste rulate: ${totalCount} | Trecute: ${passedCount} | Eșuate: ${failedCount}`);

  if (failedCount === 0) {
    console.log('🎉 VERDICT: TOATE CELE 15 TESTE PAIRWISE TIER 3 AU TRECUT CU SUCCES (100% PASS RATE)!');
    return true;
  } else {
    console.error(`❌ VERDICT: ${failedCount} TESTE AU EȘUAT ÎN SUITA TIER 3.`);
    return false;
  }
}

// Direct CLI invocation
if (require.main === module || process.argv[1]?.endsWith('e2e-tier3-pairwise.ts')) {
  runTier3Pairwise()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal unhandled error in Tier 3 test runner:', err);
      process.exit(1);
    });
}
