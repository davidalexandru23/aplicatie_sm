/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1 (MILESTONE 5)
 * ============================================================================
 * 
 * Scope: Context Selection, Bulk Packages, Hygiene Flow & Excel Import
 * Features: 24, 25, 26, 27, 28, 29, 30, 31
 * 
 * Objectives:
 * 1. Context Selection & Fallback Elimination (Features 24 & 6):
 *    - Verify generateDocument / resolveTemplatePlaceholders with explicit worksiteId and jobId
 *      populates the exact selected worksite and job data.
 *    - Verify that when no job is passed and the employee has no job, it does NOT silently fall back to client.jobs[0].
 *    - Verify explicit worksiteId / jobId overrides employee default job / worksite.
 *    - Verify generateCompanyDossierZip respects explicit jobId and worksiteId without client.jobs[0] fallback.
 * 
 * 2. Dynamic IPSSM Filtering in Bulk Packages (Feature 25):
 *    - Test BISTRO GOURMET S.R.L. (CAEN 5610, restaurant without drivers):
 *      verify ipssm-autovehicule is NOT present, while ipssm-alunecari and ipssm-universale ARE present.
 *    - Test NEXUS SOLUTIONS S.R.L. (CAEN 6201 with driving technician):
 *      verify ipssm-autovehicule, ipssm-birou, ipssm-alunecari, ipssm-tesa, and ipssm-universale ARE present.
 *    - Test adversarial edge cases: CAEN 4941 (freight transport), CAEN 6920 (accounting), empty jobs, targetJob override.
 * 
 * 3. Batch Generation Error Isolation & ZIP Logging (Feature 26):
 *    - Test POST /api/documents/generate-batch with ALL expired employees -> HTTP 400.
 *    - Test with mixed employees (1 valid + 1 expired) -> HTTP 200, returns valid ZIP archive.
 *    - Inspect returned ZIP archive: verify 00_RAPORT_GENERARE_LOT.txt exists at root,
 *      contains valid header, employer metadata, success/failure counts, nominal status lines ([SUCCES], [OMIS - EXPIRAT]).
 *    - Test with PLECAT employee -> [OMIS - PLECAT] in log file, HTTP 200 for mixed, HTTP 400 for all-PLECAT.
 * 
 * 4. Hygiene Subsystem Stress & Compliance (Features 27, 28, 29):
 *    - HygieneSession clientId association & filter.
 *    - PATCH /api/hygiene/sessions/[id]/participants/[participantId] statutory constraints:
 *      grade validation (1.0-10.0), attendance (prezent/absent), auto-rejection & cert clearing on absent,
 *      and automatic synchronization of hygieneLastExamDate & hygieneCertificateNumber to Employee on admis.
 *    - calculateEmployeeCompliance for CAEN 5610 (mandatory 36 months validity) vs CAEN 6201 (null unless food handling).
 * 
 * 5. Excel Import Integrity & Server-Side Re-validation (Features 30, 31):
 *    - importer.ts sets medicalLastExamDate to null when missing (never hireDate).
 *    - POST /api/imports/commit runs server-side revalidation, rejects 100% invalid rows with HTTP 400,
 *      and saves validationReport + diffData on ImportBatch.
 * 
 * Teardown:
 *    - Cascading cleanup of all temporary test entities created during testing.
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';
import {
  resolveApplicableIpssms,
  generateCompanyDossierZip,
  generateEmployeeOnboardingZip,
} from '../src/lib/packages/bulk-packages';
import { POST as postGenerateBatch } from '../src/app/api/documents/generate-batch/route';
import { GET as getHygieneSessions, POST as postHygieneSessions } from '../src/app/api/hygiene/sessions/route';
import {
  GET as getHygieneParticipant,
  PATCH as patchHygieneParticipant,
} from '../src/app/api/hygiene/sessions/[id]/participants/[participantId]/route';
import { calculateEmployeeCompliance, calculateCompanyMetrics } from '../src/lib/compliance';
import { parseClientWorkbook, revalidateParsedWorkbook } from '../src/lib/importer';
import { POST as postImportCommit } from '../src/app/api/imports/commit/route';

// Terminal Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface TestResult {
  suite: string;
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let currentSuite = '';

function suite(name: string) {
  currentSuite = name;
  console.log(`\n${C.bold}${C.blue}▶ ${name}${C.reset}`);
}

async function runTest(id: string, name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ suite: currentSuite, id, name, passed: true, durationMs: duration });
    console.log(`  ${C.green}✓ PASS${C.reset} [${id}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ suite: currentSuite, id, name, passed: false, error: err?.message || String(err), durationMs: duration });
    console.log(`  ${C.red}✗ FAIL${C.reset} [${id}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
    console.log(`    ${C.red}Error: ${err?.message || err}${C.reset}`);
  }
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
  }
}

// Track fixture entities for strict cleanup
const cleanupClientIds: string[] = [];
const cleanupBatchZipPaths: string[] = [];
const cleanupHygieneSessionIds: string[] = [];
const cleanupImportBatchIds: string[] = [];

async function cleanupFixtures() {
  console.log(`\n${C.dim}Teardown: Cleaning up test fixtures...${C.reset}`);

  // Delete generated ZIP files
  for (const p of cleanupBatchZipPaths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }

  // Delete hygiene participants & sessions
  if (cleanupHygieneSessionIds.length > 0) {
    try {
      await prisma.hygieneParticipant.deleteMany({
        where: { sessionId: { in: cleanupHygieneSessionIds } },
      });
      await prisma.hygieneSession.deleteMany({
        where: { id: { in: cleanupHygieneSessionIds } },
      });
    } catch {}
  }

  // Delete import batches
  if (cleanupImportBatchIds.length > 0) {
    try {
      await prisma.importBatch.deleteMany({
        where: { id: { in: cleanupImportBatchIds } },
      });
    } catch {}
  }

  // Delete test clients (cascades to employees, jobs, worksites, documents)
  if (cleanupClientIds.length > 0) {
    try {
      await prisma.generatedDocument.deleteMany({
        where: { clientId: { in: cleanupClientIds } },
      });
      await prisma.client.deleteMany({
        where: { id: { in: cleanupClientIds } },
      });
    } catch {}
  }
}

// Helper to generate a valid CNP
function generateValidCnp(sex: 'M' | 'F' = 'M', birthYear = 1990, birthMonth = 5, birthDay = 15): string {
  const s = sex === 'M' ? (birthYear >= 2000 ? '5' : '1') : (birthYear >= 2000 ? '6' : '2');
  const yy = String(birthYear % 100).padStart(2, '0');
  const mm = String(birthMonth).padStart(2, '0');
  const dd = String(birthDay).padStart(2, '0');
  const jj = '41'; // București Sector 1
  const nnn = String(Math.floor(Math.random() * 899) + 100);
  const first12 = `${s}${yy}${mm}${dd}${jj}${nnn}`;

  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(first12[i], 10) * weights[i];
  }
  const rem = sum % 11;
  const c = rem === 10 ? 1 : rem;
  return `${first12}${c}`;
}

async function main() {
  console.log(`${C.bold}================================================================================${C.reset}`);
  console.log(`${C.bold}  EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 5 (CHALLENGER 1)${C.reset}`);
  console.log(`${C.bold}================================================================================${C.reset}`);
  console.log(`Environment: Node.js ${process.version} | Timestamp: ${new Date().toISOString()}`);

  try {
    // ------------------------------------------------------------------------
    // SUITE 1: CONTEXT SELECTION & FALLBACK ELIMINATION
    // ------------------------------------------------------------------------
    suite('SUITE 1: Context Selection & Fallback Elimination (Features 24 & 6)');

    // Set up test client with multiple worksites & jobs
    const ctxClient = await prisma.client.create({
      data: {
        name: 'TEST CONTEXT SELECTION S.R.L.',
        cui: 'RO99112233',
        regCom: 'J40/9911/2026',
        caenCode: '6201',
        address: 'Bucuresti, Str. Tehnologiei 10',
        legalRepresentative: 'Mihai Director',
        contactPerson: 'Elena Resurse',
        contactEmail: 'contact@testcontext.ro',
        contactPhone: '0711000111',
        worksites: {
          create: [
            { name: 'Sediul Principal - Parter', address: 'Bucuresti, Str. Tehnologiei 10' },
            { name: 'Punct de Lucru Nord - Etaj 3', address: 'Bucuresti, Str. Aviatiei 45' },
          ],
        },
        jobs: {
          create: [
            {
              title: 'Arhitect Software Cloud',
              corCode: '251201',
              mainActivities: 'Design arhitecturi cloud distribuite',
              isScreenWork: true,
            },
            {
              title: 'Inginer Securitate Informationala',
              corCode: '251401',
              mainActivities: 'Audituri de securitate si hardening',
              isScreenWork: true,
            },
          ],
        },
      },
      include: {
        worksites: true,
        jobs: true,
      },
    });
    cleanupClientIds.push(ctxClient.id);

    const ws1 = ctxClient.worksites[0];
    const ws2 = ctxClient.worksites[1];
    const job1 = ctxClient.jobs[0];
    const job2 = ctxClient.jobs[1];

    // Employee 1 has job1 and ws1
    const emp1 = await prisma.employee.create({
      data: {
        clientId: ctxClient.id,
        firstName: 'Andrei',
        lastName: 'Contextianu',
        cnp: generateValidCnp('M', 1988, 4, 12),
        hireDate: new Date('2024-01-15'),
        currentJobId: job1.id,
        currentWorksiteId: ws1.id,
        status: 'ACTIV',
        grossSalary: 12000,
        cimNumber: 'CIM-CTX-01',
        cimDate: new Date('2024-01-15'),
        workNorm: 8,
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
      },
    });

    // Employee 2 has NO job and NO worksite
    const empNoJob = await prisma.employee.create({
      data: {
        clientId: ctxClient.id,
        firstName: 'Stefan',
        lastName: 'FaraJob',
        cnp: generateValidCnp('M', 1995, 8, 20),
        hireDate: new Date('2025-02-01'),
        currentJobId: null,
        currentWorksiteId: null,
        status: 'ACTIV',
        grossSalary: 5000,
        cimNumber: 'CIM-CTX-02',
        cimDate: new Date('2025-02-01'),
        workNorm: 8,
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
      },
    });

    await runTest('T1.1', 'Explicit jobId & worksiteId override employee defaults', async () => {
      // emp1 default is job1 and ws1. We explicitly pass job2 and ws2!
      const resolved = await resolveTemplatePlaceholders({
        templateCode: 'training-tematica-loc-munca',
        clientId: ctxClient.id,
        employeeId: emp1.id,
        jobId: job2.id,
        worksiteId: ws2.id,
      });

      assertEqual(
        resolved.resolvedData.PLACEHOLDER_FUNCTIE,
        'Inginer Securitate Informationala',
        'PLACEHOLDER_FUNCTIE must match explicitly passed jobId (job2)'
      );
      assertEqual(
        resolved.resolvedData.PLACEHOLDER_COD_COR,
        '251401',
        'PLACEHOLDER_COD_COR must match explicitly passed jobId (job2)'
      );
      assertEqual(
        resolved.resolvedData.PLACEHOLDER_PUNCT_LUCRU,
        'Punct de Lucru Nord - Etaj 3',
        'PLACEHOLDER_PUNCT_LUCRU must match explicitly passed worksiteId (ws2)'
      );
    });

    await runTest('T1.2', 'When no job is passed and employee has no job, it does NOT fall back to client.jobs[0]', async () => {
      // empNoJob has no job. Pass no jobId.
      const resolved = await resolveTemplatePlaceholders({
        templateCode: 'training-tematica-loc-munca',
        clientId: ctxClient.id,
        employeeId: empNoJob.id,
        // jobId omitted
      });

      const functie = resolved.resolvedData.PLACEHOLDER_FUNCTIE;
      const codCor = resolved.resolvedData.PLACEHOLDER_COD_COR;

      assert(
        functie !== job1.title && functie !== job2.title,
        `PLACEHOLDER_FUNCTIE must NOT fall back to client.jobs[0] ("${job1.title}"). Got: "${functie}"`
      );
      assert(
        !codCor || codCor === '',
        `PLACEHOLDER_COD_COR must be empty when no job is assigned. Got: "${codCor}"`
      );
    });

    await runTest('T1.3', 'Client-level template without employee and without job does NOT fall back to client.jobs[0]', async () => {
      const resolved = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: ctxClient.id,
        // employeeId and jobId omitted
      });

      const functie = resolved.resolvedData.PLACEHOLDER_FUNCTIE;
      assert(
        !functie || (functie !== job1.title && functie !== job2.title),
        `PLACEHOLDER_FUNCTIE must NOT fall back to client.jobs[0]. Got: "${functie}"`
      );
    });

    await runTest('T1.4', 'End-to-end generateDocument creates valid DOCX with explicit worksiteId & jobId', async () => {
      const resolved = await resolveTemplatePlaceholders({
        templateCode: 'hr-anexa-fisa-post',
        clientId: ctxClient.id,
        employeeId: emp1.id,
        jobId: job2.id,
        worksiteId: ws2.id,
      });

      const gen = await generateDocument({
        templateCode: 'hr-anexa-fisa-post',
        clientId: ctxClient.id,
        employeeId: emp1.id,
        jobId: job2.id,
        worksiteId: ws2.id,
        data: resolved.resolvedData,
        operatorName: 'Challenger 1',
      });

      assert(fs.existsSync(gen.filePath), 'Generated document file must exist on disk');
      cleanupBatchZipPaths.push(gen.filePath);

      // Inspect DOCX contents with PizZip
      const docBuffer = fs.readFileSync(gen.filePath);
      const zip = new PizZip(docBuffer);
      const xml = zip.file('word/document.xml')?.asText() || '';

      assert(
        xml.includes('Inginer Securitate Informationala'),
        'Generated document XML must contain explicit job title'
      );
      assert(
        !xml.includes('Arhitect Software Cloud'),
        'Generated document XML must NOT contain employee default job title'
      );
    });

    // ------------------------------------------------------------------------
    // SUITE 2: DYNAMIC IPSSM FILTERING IN BULK PACKAGES
    // ------------------------------------------------------------------------
    suite('SUITE 2: Dynamic IPSSM Filtering in Bulk Packages (Feature 25)');

    // Find BISTRO GOURMET S.R.L.
    const bistroClient = await prisma.client.findFirst({
      where: { name: { contains: 'BISTRO GOURMET', mode: 'insensitive' } },
      include: { jobs: true },
    });
    assert(bistroClient, 'BISTRO GOURMET S.R.L. must exist in the database');

    // Find NEXUS SOLUTIONS S.R.L.
    const nexusClient = await prisma.client.findFirst({
      where: { name: { contains: 'NEXUS SOLUTIONS', mode: 'insensitive' } },
      include: { jobs: true },
    });
    assert(nexusClient, 'NEXUS SOLUTIONS S.R.L. must exist in the database');

    await runTest('T2.1', 'BISTRO GOURMET (CAEN 5610, restaurant without drivers): resolveApplicableIpssms', async () => {
      const ipssms = resolveApplicableIpssms(bistroClient.caenCode, bistroClient.jobs);
      console.log(`    BISTRO GOURMET resolved IPSSMs:`, ipssms);

      assert(!ipssms.includes('ipssm-autovehicule'), 'ipssm-autovehicule MUST NOT be present for restaurant without drivers');
      assert(ipssms.includes('ipssm-alunecari'), 'ipssm-alunecari MUST be present for CAEN 5610 food handling');
      assert(ipssms.includes('ipssm-universale'), 'ipssm-universale MUST be present');
      assert(ipssms.includes('ipssm-opis'), 'ipssm-opis MUST be present');
    });

    await runTest('T2.2', 'BISTRO GOURMET: generateCompanyDossierZip strictly omits driving IPSSM', async () => {
      const dossier = await generateCompanyDossierZip({ clientId: bistroClient.id });
      assert(dossier.buffer && dossier.buffer.length > 0, 'Dossier ZIP buffer must not be empty');

      const zip = new PizZip(dossier.buffer);
      const fileNames = Object.keys(zip.files);
      console.log(`    BISTRO GOURMET Dossier files in ZIP (${fileNames.length}):`, fileNames);

      const hasDrivingFile = fileNames.some((f) => f.toLowerCase().includes('autovehicule'));
      const hasAlunecariFile = fileNames.some((f) => f.toLowerCase().includes('alunecari'));
      const hasUniversaleFile = fileNames.some((f) => f.toLowerCase().includes('universale'));

      assert(!hasDrivingFile, 'Company dossier ZIP for BISTRO GOURMET must NOT contain autovehicule IPSSM');
      assert(hasAlunecariFile, 'Company dossier ZIP for BISTRO GOURMET must contain alunecari IPSSM');
      assert(hasUniversaleFile, 'Company dossier ZIP for BISTRO GOURMET must contain universale IPSSM');
    });

    await runTest('T2.3', 'NEXUS SOLUTIONS (CAEN 6201 with driving technician): resolveApplicableIpssms', async () => {
      const ipssms = resolveApplicableIpssms(nexusClient.caenCode, nexusClient.jobs);
      console.log(`    NEXUS SOLUTIONS resolved IPSSMs:`, ipssms);

      assert(ipssms.includes('ipssm-autovehicule'), 'ipssm-autovehicule MUST be present for NEXUS SOLUTIONS (CAEN 6201 + driving technician)');
      assert(ipssms.includes('ipssm-birou'), 'ipssm-birou MUST be present for IT office work');
      assert(ipssms.includes('ipssm-alunecari'), 'ipssm-alunecari MUST be present');
      assert(ipssms.includes('ipssm-tesa'), 'ipssm-tesa MUST be present for engineer/management staff');
      assert(ipssms.includes('ipssm-universale'), 'ipssm-universale MUST be present');
      assert(ipssms.includes('ipssm-opis'), 'ipssm-opis MUST be present');
    });

    await runTest('T2.4', 'NEXUS SOLUTIONS: generateCompanyDossierZip includes all 5 statutory IPSSMs', async () => {
      const dossier = await generateCompanyDossierZip({ clientId: nexusClient.id });
      assert(dossier.buffer && dossier.buffer.length > 0, 'Dossier ZIP buffer must not be empty');

      const zip = new PizZip(dossier.buffer);
      const fileNames = Object.keys(zip.files);
      console.log(`    NEXUS SOLUTIONS Dossier files in ZIP (${fileNames.length}):`, fileNames);

      assert(fileNames.some((f) => f.toLowerCase().includes('autovehicule')), 'NEXUS dossier ZIP must contain autovehicule IPSSM');
      assert(fileNames.some((f) => f.toLowerCase().includes('birou')), 'NEXUS dossier ZIP must contain birou IPSSM');
      assert(fileNames.some((f) => f.toLowerCase().includes('alunecari')), 'NEXUS dossier ZIP must contain alunecari IPSSM');
      assert(fileNames.some((f) => f.toLowerCase().includes('tesa')), 'NEXUS dossier ZIP must contain tesa IPSSM');
      assert(fileNames.some((f) => f.toLowerCase().includes('universale')), 'NEXUS dossier ZIP must contain universale IPSSM');
    });

    await runTest('T2.5', 'Adversarial IPSSM variations: freight transport (4941) vs accounting (6920) vs empty jobs', async () => {
      // 1. CAEN 4941 (Transport rutier de marfa) with zero jobs: MUST have driving IPSSM
      const freightIpssm = resolveApplicableIpssms('4941', []);
      assert(freightIpssm.includes('ipssm-autovehicule'), 'CAEN 4941 must include driving IPSSM even with empty jobs list');

      // 2. CAEN 6920 (Contabilitate) with zero driving jobs: MUST NOT have driving IPSSM
      const accountingIpssm = resolveApplicableIpssms('6920', [
        { title: 'Contabil Sef', isScreenWork: true, isDrivingRequired: false },
      ]);
      assert(!accountingIpssm.includes('ipssm-autovehicule'), 'CAEN 6920 without driving jobs must NOT include driving IPSSM');
      assert(accountingIpssm.includes('ipssm-birou'), 'CAEN 6920 must include office IPSSM');
      assert(accountingIpssm.includes('ipssm-tesa'), 'CAEN 6920 must include tesa IPSSM');

      // 3. CAEN 5610 with targetJob that requires driving: MUST include driving IPSSM
      const targetDriverIpssm = resolveApplicableIpssms('5610', [], {
        title: 'Curier Livrator Restaurant',
        isDrivingRequired: true,
      });
      assert(targetDriverIpssm.includes('ipssm-autovehicule'), 'Target job with isDrivingRequired must trigger driving IPSSM in restaurant');
    });

    // ------------------------------------------------------------------------
    // SUITE 3: BATCH GENERATION ERROR ISOLATION & ZIP LOGGING
    // ------------------------------------------------------------------------
    suite('SUITE 3: Batch Generation Error Isolation & ZIP Logging (Feature 26)');

    // Create 3 test employees under ctxClient:
    // 1) empValid: medical exam and training completely valid
    // 2) empExpired: medical exam expired (2021)
    // 3) empTerminated: status 'PLECAT'
    const empValid = await prisma.employee.create({
      data: {
        clientId: ctxClient.id,
        firstName: 'Valentin',
        lastName: 'Conform',
        cnp: generateValidCnp('M', 1991, 3, 10),
        hireDate: new Date('2024-01-01'),
        currentJobId: job1.id,
        currentWorksiteId: ws1.id,
        status: 'ACTIV',
        grossSalary: 8500,
        cimNumber: 'CIM-BTCH-01',
        cimDate: new Date('2024-01-01'),
        workNorm: 8,
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
      },
    });

    const empExpired = await prisma.employee.create({
      data: {
        clientId: ctxClient.id,
        firstName: 'Tiberiu',
        lastName: 'Expirat',
        cnp: generateValidCnp('M', 1985, 7, 19),
        hireDate: new Date('2020-01-01'),
        currentJobId: job1.id,
        currentWorksiteId: ws1.id,
        status: 'ACTIV',
        grossSalary: 6000,
        cimNumber: 'CIM-BTCH-02',
        cimDate: new Date('2020-01-01'),
        workNorm: 8,
        medicalLastExamDate: new Date('2021-05-10'), // Expired > 4 years ago!
        ssmLastTrainingDate: new Date('2021-05-10'),
        psiLastTrainingDate: new Date('2021-05-10'),
      },
    });

    const empTerminated = await prisma.employee.create({
      data: {
        clientId: ctxClient.id,
        firstName: 'Mihai',
        lastName: 'Plecatu',
        cnp: generateValidCnp('M', 1989, 11, 25),
        hireDate: new Date('2022-01-01'),
        leaveDate: new Date('2024-12-31'),
        currentJobId: job1.id,
        currentWorksiteId: ws1.id,
        status: 'PLECAT',
        grossSalary: 7000,
        cimNumber: 'CIM-BTCH-03',
        cimDate: new Date('2022-01-01'),
        workNorm: 8,
        medicalLastExamDate: new Date('2026-06-01'),
      },
    });

    await runTest('T3.1', 'POST /api/documents/generate-batch with ALL expired employees -> HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'med-fisa-solicitare-examen',
          clientId: ctxClient.id,
          employeeIds: [empExpired.id],
          operatorName: 'Challenger 1',
        }),
      });

      const res = await postGenerateBatch(req);
      const json = await res.json();
      console.log(`    Response status: ${res.status}, body:`, json);

      assertEqual(res.status, 400, 'Batch generation for ALL expired employees must return HTTP 400');
      assert(
        json.error && json.error.includes('expirat'),
        'Error message must state that medical examination / training is expired'
      );
    });

    await runTest('T3.2', 'POST /api/documents/generate-batch with ALL terminated employees -> HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'hr-anexa-fisa-post',
          clientId: ctxClient.id,
          employeeIds: [empTerminated.id],
          operatorName: 'Challenger 1',
        }),
      });

      const res = await postGenerateBatch(req);
      const json = await res.json();
      console.log(`    Response status: ${res.status}, body:`, json);

      assertEqual(res.status, 400, 'Batch generation for ALL terminated employees must return HTTP 400');
      assert(
        json.error && json.error.includes('PLECAT'),
        'Error message must state that employee is terminated (PLECAT)'
      );
    });

    let generatedBatchZipPath = '';
    await runTest('T3.3', 'POST /api/documents/generate-batch with mixed employees (1 valid + 1 expired) -> HTTP 200 & valid ZIP', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'med-fisa-solicitare-examen',
          clientId: ctxClient.id,
          employeeIds: [empValid.id, empExpired.id],
          operatorName: 'Challenger 1 Empirical Tester',
        }),
      });

      const res = await postGenerateBatch(req);
      const json = await res.json();
      console.log(`    Response status: ${res.status}, body:`, {
        success: json.success,
        totalRequested: json.totalRequested,
        totalGenerated: json.totalGenerated,
        totalOmitted: json.totalOmitted,
        zipFileName: json.zipFileName,
        batchId: json.batchId,
      });

      assertEqual(res.status, 200, 'Mixed batch generation must return HTTP 200');
      assertEqual(json.success, true, 'json.success must be true');
      assertEqual(json.totalRequested, 2, 'totalRequested must be 2');
      assertEqual(json.totalGenerated, 1, 'totalGenerated must be 1');
      assertEqual(json.totalOmitted, 1, 'totalOmitted must be 1');

      generatedBatchZipPath = path.join(process.cwd(), 'storage', 'documents', `batch_${json.batchId}.zip`);
      assert(fs.existsSync(generatedBatchZipPath), `ZIP file must exist at: ${generatedBatchZipPath}`);
      cleanupBatchZipPaths.push(generatedBatchZipPath);
    });

    await runTest('T3.4', 'Inspect returned ZIP: verify 00_RAPORT_GENERARE_LOT.txt, header, counts, status lines', async () => {
      assert(fs.existsSync(generatedBatchZipPath), 'Batch ZIP file must exist on disk');

      const zipBuffer = fs.readFileSync(generatedBatchZipPath);
      const zip = new PizZip(zipBuffer);
      const files = Object.keys(zip.files);
      console.log(`    ZIP entry list:`, files);

      assert(files.includes('00_RAPORT_GENERARE_LOT.txt'), '00_RAPORT_GENERARE_LOT.txt must exist at the root of the ZIP');

      const reportTxt = zip.file('00_RAPORT_GENERARE_LOT.txt')?.asText() || '';
      console.log(`\n    --- 00_RAPORT_GENERARE_LOT.txt Content Preview ---\n${reportTxt.split('\n').map(l => '    ' + l).join('\n')}\n`);

      // Verify header
      assert(
        reportTxt.includes('RAPORT GENERARE COLECTIVĂ DOCUMENTE STATUTARE SSM / HR'),
        'Report header must match statutory pattern'
      );

      // Verify employer metadata
      assert(
        reportTxt.includes(ctxClient.name),
        `Report must contain client name: ${ctxClient.name}`
      );
      assert(
        reportTxt.includes(ctxClient.cui),
        `Report must contain client CUI: ${ctxClient.cui}`
      );

      // Verify totals
      assert(reportTxt.includes('Total salariați ceruți : 2'), 'Report must state 2 requested');
      assert(reportTxt.includes('Generări reușite       : 1'), 'Report must state 1 success');
      assert(reportTxt.includes('Salariați omiși        : 1'), 'Report must state 1 omitted');

      // Verify nominal statuses
      assert(
        reportTxt.includes('[SUCCES]') && reportTxt.includes('Conform Valentin'),
        'Report must list [SUCCES] for valid employee'
      );
      assert(
        reportTxt.includes('[OMIS - EXPIRAT]') && reportTxt.includes('Expirat Tiberiu'),
        'Report must list [OMIS - EXPIRAT] for expired employee'
      );

      // Verify statutory footer
      assert(
        reportTxt.includes('Document emis automat conform Legii 319/2006 și HG 1425/2006.'),
        'Report must contain statutory closing footer'
      );

      // Verify generated DOCX file for valid employee
      const docxEntry = files.find((f) => f.includes('Conform_Valentin') && f.endsWith('.docx'));
      assert(docxEntry, 'ZIP must contain generated DOCX for valid employee Conform Valentin');

      const docxBuffer = zip.file(docxEntry!)?.asNodeBuffer();
      assert(docxBuffer && docxBuffer.length > 0, 'Generated DOCX buffer must be non-empty');

      // Ensure docx is valid OpenXML
      const docxZip = new PizZip(docxBuffer!);
      const docXml = docxZip.file('word/document.xml')?.asText() || '';
      assert(docXml.length > 0, 'Generated DOCX must contain valid word/document.xml');
    });

    await runTest('T3.5', 'POST /api/documents/generate-batch with mixed (1 valid + 1 PLECAT) -> HTTP 200 & [OMIS - PLECAT]', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'hr-anexa-fisa-post',
          clientId: ctxClient.id,
          employeeIds: [empValid.id, empTerminated.id],
          operatorName: 'Challenger 1',
        }),
      });

      const res = await postGenerateBatch(req);
      const json = await res.json();
      assertEqual(res.status, 200, 'Batch with 1 valid + 1 PLECAT must return HTTP 200');

      const zipPath = path.join(process.cwd(), 'storage', 'documents', `batch_${json.batchId}.zip`);
      cleanupBatchZipPaths.push(zipPath);

      const zip = new PizZip(fs.readFileSync(zipPath));
      const reportTxt = zip.file('00_RAPORT_GENERARE_LOT.txt')?.asText() || '';

      assert(reportTxt.includes('[OMIS - PLECAT]'), 'Report must label terminated employee as [OMIS - PLECAT]');
      assert(reportTxt.includes('Plecatu Mihai'), 'Report must name the terminated employee');
    });

    // ------------------------------------------------------------------------
    // SUITE 4: HYGIENE SUBSYSTEM STRESS & BOUNDARIES
    // ------------------------------------------------------------------------
    suite('SUITE 4: Hygiene Subsystem Stress & Compliance (Features 27, 28, 29)');

    // Create a dedicated hygiene session linked to bistroClient
    const sessionDate = new Date('2026-05-15');
    const examDate = new Date('2026-05-16');
    const hygieneSession = await prisma.hygieneSession.create({
      data: {
        sessionDate,
        examDate,
        location: 'Sala de Curs Bistro',
        status: 'finalizata',
        clientId: bistroClient.id,
        participants: {
          create: [
            {
              firstName: 'Marinela',
              lastName: 'Ospatareasca',
              cnp: generateValidCnp('F', 1993, 6, 20),
              clientName: bistroClient.name,
              jobTitle: 'Ospătar / Chelner',
              attendance: 'prezent',
              examGrade: 8.5,
              examResult: 'admis',
              certificateSeries: 'IG-2026',
              certificateNumber: '00441',
              certificateDate: examDate,
              employeeId: bistroClient.jobs[0] ? (await prisma.employee.findFirst({ where: { clientId: bistroClient.id } }))?.id : null,
            },
            {
              firstName: 'Gheorghe',
              lastName: 'Absentache',
              cnp: generateValidCnp('M', 1987, 2, 14),
              clientName: bistroClient.name,
              jobTitle: 'Ajutor Bucătar',
              attendance: 'prezent',
              examGrade: 5.0,
              examResult: 'admis',
              certificateSeries: 'IG-2026',
              certificateNumber: '00442',
              certificateDate: examDate,
            },
          ],
        },
      },
      include: {
        participants: true,
      },
    });
    cleanupHygieneSessionIds.push(hygieneSession.id);

    const part1 = hygieneSession.participants[0];
    const part2 = hygieneSession.participants[1];

    await runTest('T4.1', 'GET /api/hygiene/sessions?clientId=... filters sessions by company', async () => {
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions?clientId=${bistroClient.id}`);
      const res = await getHygieneSessions(req);
      const sessions = await res.json();

      assert(Array.isArray(sessions), 'Response must be an array of sessions');
      assert(
        sessions.some((s: any) => s.id === hygieneSession.id),
        'Created hygiene session must be present in filtered results'
      );
    });

    await runTest('T4.2', 'PATCH participant: grade bounds violation (< 1.0 or > 10.0) -> HTTP 400', async () => {
      const routeParams = { params: Promise.resolve({ id: hygieneSession.id, participantId: part1.id }) };

      // Test grade 15.0
      const req1 = new NextRequest('http://localhost:3000/api/hygiene/sessions/p', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examGrade: 15.0 }),
      });
      const res1 = await patchHygieneParticipant(req1, routeParams);
      assertEqual(res1.status, 400, 'Grade > 10 must return HTTP 400');

      // Test grade -2.0
      const req2 = new NextRequest('http://localhost:3000/api/hygiene/sessions/p', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examGrade: -2.0 }),
      });
      const res2 = await patchHygieneParticipant(req2, routeParams);
      assertEqual(res2.status, 400, 'Grade < 1 must return HTTP 400');
    });

    await runTest('T4.3', 'PATCH participant: absent attendance automatically forces result respins and clears cert', async () => {
      const routeParams = { params: Promise.resolve({ id: hygieneSession.id, participantId: part2.id }) };

      const req = new NextRequest('http://localhost:3000/api/hygiene/sessions/p', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance: 'absent',
        }),
      });

      const res = await patchHygieneParticipant(req, routeParams);
      assertEqual(res.status, 200, 'Updating attendance to absent must return HTTP 200');

      const json = await res.json();
      assertEqual(json.participant.attendance, 'absent', 'Attendance must be absent');
      assertEqual(json.participant.examResult, 'respins', 'Result must be automatically forced to respins');
      assertEqual(json.participant.examGrade, null, 'Grade must be cleared to null');
      assertEqual(json.participant.certificateSeries, null, 'Certificate series must be null');
      assertEqual(json.participant.certificateNumber, null, 'Certificate number must be null');
    });

    await runTest('T4.4', 'PATCH participant: passing exam (admis) updates participant & synchronizes Employee record', async () => {
      // Find or create employee linked to part1
      assert(part1.employeeId, 'part1 must have an associated employeeId');

      const routeParams = { params: Promise.resolve({ id: hygieneSession.id, participantId: part1.id }) };
      const req = new NextRequest('http://localhost:3000/api/hygiene/sessions/p', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance: 'prezent',
          examGrade: 9.8,
          examResult: 'admis',
          certificateSeries: 'IG-2026',
          certificateNumber: '998877',
          certificateDate: '2026-05-16T00:00:00.000Z',
        }),
      });

      const res = await patchHygieneParticipant(req, routeParams);
      assertEqual(res.status, 200, 'Valid passing participant update must return HTTP 200');

      const linkedEmp = await prisma.employee.findUnique({
        where: { id: part1.employeeId },
      });
      assert(linkedEmp, 'Linked employee must exist');
      assertEqual(
        linkedEmp.hygieneCertificateNumber,
        'IG-2026 998877',
        'Employee hygieneCertificateNumber must be synchronized'
      );
    });

    await runTest('T4.5', 'Statutory hygiene compliance: CAEN 5610 (mandatory 36 months) vs CAEN 6201 (null unless food)', async () => {
      const refDate = new Date('2026-06-01');

      // 1. Restaurant employee (CAEN 5610) with exam in 2026-05-16 -> VALID (15 days old)
      const foodEmpValid = {
        clientCaen: '5610',
        hygieneLastExamDate: new Date('2026-05-16'),
        hygieneIntervalMonths: 36,
      };
      const comp1 = calculateEmployeeCompliance(foodEmpValid, refDate);
      assert(comp1.hygieneCertificate !== null, 'Hygiene must be evaluated for CAEN 5610');
      assertEqual(comp1.hygieneCertificate!.status, 'VALID', 'Recent hygiene exam must be VALID');
      assertEqual(comp1.hygieneCertificate!.intervalMonths, 36, 'Statutory hygiene interval must be 36 months');

      // 2. Restaurant employee with exam in 2022-01-01 -> OVERDUE (> 36 months)
      const foodEmpExpired = {
        clientCaen: '5610',
        hygieneLastExamDate: new Date('2022-01-01'),
      };
      const comp2 = calculateEmployeeCompliance(foodEmpExpired, refDate);
      assert(comp2.hygieneCertificate !== null, 'Hygiene must be evaluated for CAEN 5610');
      assertEqual(comp2.hygieneCertificate!.status, 'OVERDUE', 'Hygiene exam older than 36 months must be OVERDUE');

      // 3. IT Developer (CAEN 6201, no food handling) -> null (not evaluated, no penalty)
      const itEmp = {
        clientCaen: '6201',
        job: { isFoodHandling: false },
        hygieneLastExamDate: null,
      };
      const comp3 = calculateEmployeeCompliance(itEmp, refDate);
      assertEqual(comp3.hygieneCertificate, null, 'Hygiene must be null for non-food IT staff');

      // 4. IT employee with isFoodHandling: true -> evaluated!
      const itEmpFood = {
        clientCaen: '6201',
        isFoodHandling: true,
        hygieneLastExamDate: null,
      };
      const comp4 = calculateEmployeeCompliance(itEmpFood, refDate);
      assert(comp4.hygieneCertificate !== null, 'Hygiene must be evaluated when isFoodHandling is true');
      assertEqual(comp4.hygieneCertificate!.status, 'MISSING', 'Missing hygiene exam must be MISSING for food handler');
    });

    // ------------------------------------------------------------------------
    // SUITE 5: EXCEL IMPORT INTEGRITY & SERVER-SIDE REVALIDATION
    // ------------------------------------------------------------------------
    suite('SUITE 5: Excel Import Integrity & Server-Side Re-validation (Features 30, 31)');

    await runTest('T5.1', 'revalidateParsedWorkbook strictly detects CNP checksum failures and missing mandatory fields', async () => {
      const mockParsedWorkbook: any = {
        company: {
          name: 'ACME IMPORT S.R.L.',
          cui: 'RO12345678',
        },
        employees: [
          {
            rowNumber: 2,
            lastName: 'Ionescu',
            firstName: 'Ion',
            cnp: '1880315123456', // Valid format but invalid checksum
            hireDate: new Date('2024-01-01'),
            jobTitle: 'Programator',
            isValid: true,
            errors: [],
          },
          {
            rowNumber: 3,
            lastName: '', // Empty last name!
            firstName: 'Vasile',
            cnp: generateValidCnp('M', 1990, 1, 1),
            hireDate: new Date('2024-01-01'),
            jobTitle: 'Tester',
            isValid: true,
            errors: [],
          },
        ],
        jobContexts: [],
        rawSheets: {},
      };

      const reval = revalidateParsedWorkbook(mockParsedWorkbook, 'Challenger 1', 'test.xlsx');
      console.log(`    Validation Report errorsByRow count:`, reval.validationReport.errorsByRow.length);

      assertEqual(reval.totalRows, 2, 'Total rows must be 2');
      assertEqual(reval.hasValidRows, false, 'hasValidRows must be false when all rows have statutory violations');
      assert(reval.validationReport.errorsByRow.length >= 2, 'Validation report must contain errorsByRow for both rows');
    });

    await runTest('T5.2', 'POST /api/imports/commit rejects 100% invalid rows with HTTP 400', async () => {
      const mockParsedWorkbook: any = {
        company: {
          name: 'ALL BAD ROWS S.R.L.',
          cui: 'RO55443322',
        },
        employees: [
          {
            rowNumber: 2,
            lastName: '',
            firstName: '',
            cnp: '0000000000000',
            isValid: false,
            errors: ['Invalid CNP', 'Missing Name'],
          },
        ],
        jobContexts: [],
        rawSheets: {},
      };

      const req = new NextRequest('http://localhost:3000/api/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedData: mockParsedWorkbook,
          filename: 'invalid_batch.xlsx',
          operatorName: 'Challenger 1',
        }),
      });

      const res = await postImportCommit(req);
      const json = await res.json();
      console.log(`    Response status: ${res.status}, body:`, json);

      assertEqual(res.status, 400, 'Commit with 0 valid rows must be rejected with HTTP 400');
      assert(json.validationReport, 'Response must return validationReport');
    });

    await runTest('T5.3', 'POST /api/imports/commit persists validationReport & diffData in ImportBatch', async () => {
      const validCnp1 = generateValidCnp('M', 1992, 7, 10);
      const validWorkbook: any = {
        company: {
          name: 'IMPORT INTEGRITY TEST S.R.L.',
          cui: 'RO88990011',
          regCom: 'J40/8899/2026',
          address: 'Bucuresti, Str. Importului 1',
        },
        employees: [
          {
            rowNumber: 2,
            lastName: 'Dumitrescu',
            firstName: 'Radu',
            cnp: validCnp1,
            sex: 'M',
            birthDate: new Date('1992-07-10T00:00:00.000Z'),
            docType: 'CI',
            docNumber: '112233',
            county: 'București',
            locality: 'Sector 1',
            street: 'Str. Tehnologiei',
            streetNumber: '10',
            jobTitle: 'Inginer DevOps',
            worksiteName: 'Sediul Central Import',
            hireDate: new Date('2024-03-01T00:00:00.000Z'),
            status: 'ACTIV',
            department: 'IT',
            grossSalary: 11000,
            cimNumber: 'CIM-IMP-01',
            workNorm: 8,
            medicalLastExamDate: null, // Intentionally null!
            ssmLastTrainingDate: null, // Intentionally null!
            psiLastTrainingDate: null,
            isValid: true,
            errors: [],
          },
        ],
        jobContexts: [
          {
            worksiteName: 'Sediul Central Import',
            jobTitle: 'Inginer DevOps',
            department: 'IT',
            corCode: '251203',
          },
        ],
        rawSheets: {},
      };

      const req = new NextRequest('http://localhost:3000/api/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedData: validWorkbook,
          filename: 'valid_import.xlsx',
          operatorName: 'Challenger 1',
        }),
      });

      const res = await postImportCommit(req);
      const json = await res.json();
      console.log(`    Commit Response status: ${res.status}, body:`, json);

      assertEqual(res.status, 200, 'Valid import commit must return HTTP 200');
      assert(json.batchId, 'Commit must return batchId');
      assert(json.clientId, 'Commit must return clientId');

      cleanupImportBatchIds.push(json.batchId);
      cleanupClientIds.push(json.clientId);

      // Verify ImportBatch in database
      const importBatch = await prisma.importBatch.findUnique({
        where: { id: json.batchId },
      });
      assert(importBatch, 'ImportBatch record must exist in PostgreSQL');
      assert(importBatch.validationReport, 'ImportBatch must persist validationReport');
      assert(importBatch.diffData, 'ImportBatch must persist diffData');

      const parsedValidation = JSON.parse(importBatch.validationReport!);
      assertEqual(parsedValidation.filename, 'valid_import.xlsx', 'validationReport filename matches');

      const parsedDiff = JSON.parse(importBatch.diffData!);
      assertEqual(parsedDiff.schemaVersion, '1.0', 'diffData schemaVersion is 1.0');
      assertEqual(parsedDiff.items.length, 1, 'diffData contains 1 item');

      // Verify that imported employee in DB has null medicalLastExamDate (Feature 30 check)
      const importedEmp = await prisma.employee.findFirst({
        where: { cnp: validCnp1 },
      });
      assert(importedEmp, 'Imported employee must exist in DB');
      assertEqual(
        importedEmp.medicalLastExamDate,
        null,
        'medicalLastExamDate must be strictly NULL when omitted in Excel (no fallback to hireDate)'
      );
      assertEqual(
        importedEmp.ssmLastTrainingDate,
        null,
        'ssmLastTrainingDate must be strictly NULL when omitted in Excel (no fallback to hireDate)'
      );
    });

  } finally {
    await cleanupFixtures();
  }

  // --------------------------------------------------------------------------
  // TEST SUMMARY & FINAL VERDICT
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}================================================================================${C.reset}`);
  console.log(`${C.bold}  CHALLENGER 1 EMPIRICAL VERIFICATION REPORT — MILESTONE 5${C.reset}`);
  console.log(`${C.bold}================================================================================${C.reset}`);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total empirical tests executed: ${total}`);
  console.log(`Passed                        : ${passed}`);
  console.log(`Failed                        : ${failed}`);

  if (failed > 0) {
    console.log(`\n${C.red}${C.bold}Failed Tests:${C.reset}`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - [${r.id}] ${r.name}: ${r.error}`);
    }
    console.log(`\n${C.red}${C.bold}VERDICT: REQUEST_CHANGES${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bold}VERDICT: APPROVE (100% EMPIRICAL PASS RATE)${C.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal unhandled error during stress test execution:', err);
  process.exit(1);
});
