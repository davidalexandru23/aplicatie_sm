/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1 (MILESTONE 2)
 * ============================================================================
 * 
 * Normative Standards:
 * - HG nr. 355/2007 (Supravegherea sănătății lucrătorilor - Medicina Muncii)
 * - Legea nr. 319/2006 (Securitatea și sănătatea în muncă)
 * - HG nr. 1425/2006 (Norme metodologice SSM)
 * - Legea nr. 53/2003 (Codul Muncii - Încetare CIM)
 * 
 * Scope of Stress Testing:
 * 1. POST /api/employees/[id]/medical-exam:
 *    - Rejection of invalid examDate (malformed string, non-date, far future)
 *    - Rejection of zero or negative intervalMonths (<= 0, non-numeric)
 *    - Rejection of invalid verdict strings ("SUPER_APT", empty, "HEALTHY")
 *    - Rejection when target employee does not exist (HTTP 404)
 *    - Rejection when target employee has status === "PLECAT" (HTTP 400)
 *    - Verified persistence: medicalLastExamDate, medicalIntervalMonths,
 *      medicalFitnessVerdict, and medicalNotes formatted with clinic & doctor
 *    - AuditEvent emission: verify action 'MEDICAL_EXAM_RECORDED' in database
 *    - Recalculation: verify compliance is calculated and returned in response
 * 2. Compliance Engine & Generation Unlocking:
 *    - calculateCompanyMetrics:
 *      * Test company with 100% PLECAT employees (all departed): 100% score, 0 active total, no NaN
 *      * Test company with mixed active and PLECAT (PLECAT has overdue exam): company score NOT dragged down
 *      * Test company where active employee's exam was overdue, then exam recorded: transitions degraded -> 100%
 *    - Feature 9 Unlocking:
 *      * Employee with OVERDUE medical exam receives APT exam -> status becomes VALID, positive daysRemaining
 *      * Unblocks batch and single document generation
 *      * Re-locks if INAPT verdict is issued
 * 
 * Invocation:
 *   npx tsx scripts/adversarial-challenger1-m2.ts
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import {
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
} from '../src/lib/compliance';
import { POST as medicalExamPost } from '../src/app/api/employees/[id]/medical-exam/route';
import { POST as generateBatchPost, checkEmployeeTemplateExpiry } from '../src/app/api/documents/generate-batch/route';
import { getEmployeeExpiryInfo } from '../src/app/documents/generate/page';
import { generateValidCnp } from './e2e-test-helpers';

// Terminal Styling
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(
  id: string,
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ id, name, passed: true, durationMs: duration });
    console.log(`  ${C.green}✔ PASS${C.reset} [${id}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ id, name, passed: false, error: err?.message || String(err), durationMs: duration });
    console.log(`  ${C.red}✖ FAIL${C.reset} [${id}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
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

const TEST_CUI_1 = 'RO98711122';
const TEST_CUI_2 = 'RO98722233';

async function cleanupTestData() {
  const testClients = await prisma.client.findMany({
    where: { cui: { in: [TEST_CUI_1, TEST_CUI_2] } },
    select: { id: true },
  });
  const clientIds = testClients.map((c) => c.id);

  if (clientIds.length > 0) {
    // Audit events
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          { entityId: { in: clientIds } },
          { actorName: { contains: 'CHALLENGER1' } },
        ],
      },
    });
    // Generated documents
    await prisma.generatedDocument.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    // Cascade clients
    await prisma.client.deleteMany({
      where: { id: { in: clientIds } },
    });
  }
}

async function main() {
  console.log(`\n${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bright}EMPIRICAL ADVERSARIAL STRESS SUITE — CHALLENGER 1 (MILESTONE 2)${C.reset}`);
  console.log(`${C.dim}Testing Occupational Health (HG 355/2007), Status PLECAT & Generation Unlocking${C.reset}`);
  console.log(`${C.cyan}================================================================================\n${C.reset}`);

  // Setup test environment
  console.log(`${C.blue}▶ Setting up isolated test fixture clients...${C.reset}`);
  await cleanupTestData();

  // Client 1: Primary testing company
  const client1 = await prisma.client.create({
    data: {
      name: 'CHALLENGER 1 MEDICAL LABS S.R.L.',
      cui: TEST_CUI_1,
      regCom: 'J40/9991/2026',
      address: 'București, B-dul Aviatorilor nr. 50, Sector 1',
      legalRepresentative: 'Dr. Radu Vasilescu',
      caenCode: '8621',
      contactEmail: 'contact@challenger1-med.ro',
      contactPhone: '0722111222',
      worksites: {
        create: {
          name: 'Sediu Principal',
          address: 'București, B-dul Aviatorilor nr. 50',
        },
      },
      jobs: {
        create: {
          title: 'Tehnician Laborator',
          corCode: '321201',
          isFoodHandling: false,
          isScreenWork: true,
        },
      },
    },
    include: { worksites: true, jobs: true },
  });

  const worksiteId = client1.worksites[0].id;
  const jobId = client1.jobs[0].id;

  // Active employee for boundary stress
  const activeEmp = await prisma.employee.create({
    data: {
      clientId: client1.id,
      currentJobId: jobId,
      currentWorksiteId: worksiteId,
      lastName: 'Marinescu',
      firstName: 'Vlad',
      cnp: generateValidCnp('190031512345'),
      hireDate: new Date('2025-01-10'),
      status: 'ACTIV',
      medicalLastExamDate: new Date('2024-01-10'), // severely overdue (2+ years)
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      ssmLastTrainingDate: new Date(), // currently valid
      ssmIntervalMonths: 6,
      psiLastTrainingDate: new Date(), // currently valid
      psiIntervalMonths: 6,
    },
  });

  // Terminated employee
  const terminatedEmp = await prisma.employee.create({
    data: {
      clientId: client1.id,
      currentJobId: jobId,
      currentWorksiteId: worksiteId,
      lastName: 'Stanciu',
      firstName: 'Mihai',
      cnp: generateValidCnp('185062012345'),
      hireDate: new Date('2023-03-01'),
      status: 'PLECAT',
      leaveDate: new Date('2025-12-31'),
      medicalLastExamDate: new Date('2024-01-01'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
    },
  });

  console.log(`${C.green}✔ Fixtures initialized: Client ${client1.name} (Active: ${activeEmp.id}, Terminated: ${terminatedEmp.id})${C.reset}\n`);

  // ==========================================================================
  // SECTION 1: POST /api/employees/[id]/medical-exam Adversarial Stress
  // ==========================================================================
  console.log(`${C.bright}${C.yellow}--- SECTION 1: POST /api/employees/[id]/medical-exam ADVERSARIAL STRESS ---${C.reset}`);

  // Helper for medical exam route
  const invokeMedicalExam = async (empId: string, body: any) => {
    const req = new NextRequest(`http://localhost:3000/api/employees/${empId}/medical-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await medicalExamPost(req, { params: Promise.resolve({ id: empId }) });
    const json = await res.json();
    return { status: res.status, json };
  };

  // 1.1 Invalid examDate Rejection
  await runTest('C1.1.1', 'Rejects malformed string examDate ("not-a-date")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: 'not-a-date',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for malformed string');
    assert(json.error?.includes('invalid'), 'Error message should indicate invalid date');
  });

  await runTest('C1.1.2', 'Rejects nonsensical calendar date ("2026-99-99")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-99-99',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for nonsensical date');
    assert(json.error?.includes('invalid'), 'Error message should indicate invalid date');
  });

  await runTest('C1.1.3', 'Rejects omitted/empty string examDate ("")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for empty examDate');
    assert(json.error?.includes('obligatorie') || json.error?.includes('invalid'), 'Expected mandatory/invalid error message');
  });

  await runTest('C1.1.4', 'Rejects non-date arbitrary text ("random_word_123")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: 'random_word_123',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for non-date string');
  });

  await runTest('C1.1.5', 'Rejects distant future examDate (> 1 year ahead: 2099-01-01)', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2099-01-01',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for far-future date');
    assert(json.error?.includes('viitor'), 'Error message should mention distant future');
  });

  // 1.2 Zero or Negative intervalMonths Rejection (<= 0)
  await runTest('C1.2.1', 'Rejects zero intervalMonths (intervalMonths: 0)', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 0,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for zero interval');
    assert(json.error?.includes('pozitiv'), 'Error message should mention positive interval requirement');
  });

  await runTest('C1.2.2', 'Rejects negative intervalMonths (intervalMonths: -1)', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: -1,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for negative interval');
    assert(json.error?.includes('pozitiv'), 'Error message should mention positive interval');
  });

  await runTest('C1.2.3', 'Rejects large negative intervalMonths (intervalMonths: -12)', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: -12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for large negative interval');
    assert(json.error?.includes('pozitiv'), 'Error message should mention positive interval');
  });

  await runTest('C1.2.4', 'Rejects non-numeric intervalMonths ("invalid_number")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 'invalid_number' as any,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for non-numeric intervalMonths');
    assert(json.error?.includes('pozitiv'), 'Error message should reject non-positive interval');
  });

  // 1.3 Invalid Verdict Strings Rejection
  await runTest('C1.3.1', 'Rejects invented verdict string ("SUPER_APT")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 12,
      verdict: 'SUPER_APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for SUPER_APT');
    assert(json.error?.includes('invalid') || json.error?.includes('HG 355/2007'), 'Expected HG 355/2007 verdict error');
  });

  await runTest('C1.3.2', 'Rejects empty verdict string ("")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 12,
      verdict: '',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for empty verdict');
  });

  await runTest('C1.3.3', 'Rejects colloquial verdict string ("HEALTHY")', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 12,
      verdict: 'HEALTHY',
    });
    assertEqual(status, 400, 'Expected HTTP 400 for HEALTHY');
  });

  await runTest('C1.3.4', 'Rejects omitted verdict field', async () => {
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 12,
    });
    assertEqual(status, 400, 'Expected HTTP 400 for omitted verdict');
  });

  // 1.4 Non-existent Employee Rejection (404)
  await runTest('C1.4.1', 'Rejects non-existent employee UUID with HTTP 404', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const { status, json } = await invokeMedicalExam(nonExistentId, {
      examDate: '2026-11-01',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 404, 'Expected HTTP 404 for non-existent employee');
    assert(json.error?.includes('nu a fost găsit'), 'Expected employee not found error');
  });

  // 1.5 Terminated Employee Rejection (400)
  await runTest('C1.5.1', 'Rejects medical exam recording for terminated employee (status === "PLECAT") with HTTP 400', async () => {
    const { status, json } = await invokeMedicalExam(terminatedEmp.id, {
      examDate: '2026-11-01',
      intervalMonths: 12,
      verdict: 'APT',
    });
    assertEqual(status, 400, 'Expected HTTP 400 when attempting exam on PLECAT employee');
    assert(
      json.error?.includes('PLECAT') || json.error?.includes('încetat'),
      'Error message must state contract is terminated / status PLECAT'
    );
  });

  // 1.6 Verified Persistence with Clinic & Doctor Formatting
  await runTest('C1.6.1', 'Verified persistence: records exam, clinic & doctor formatted in medicalNotes', async () => {
    const examDateStr = '2026-11-01';
    const clinic = 'Clinica Regina Maria Pipera';
    const doctor = 'Dr. Popescu Alexandru';
    const operator = 'CHALLENGER1 Inspector SSM';

    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: examDateStr,
      intervalMonths: 6,
      verdict: 'APT',
      clinicName: clinic,
      doctorName: doctor,
      operatorName: operator,
    });

    assertEqual(status, 200, 'Expected HTTP 200 for valid exam recording');
    assert(json.success === true, 'Response should contain success: true');

    // Query DB to verify persistence directly
    const dbEmp = await prisma.employee.findUnique({
      where: { id: activeEmp.id },
    });
    assert(dbEmp !== null, 'Employee must exist in DB');

    assertEqual(
      dbEmp!.medicalLastExamDate?.toISOString().slice(0, 10),
      examDateStr,
      'medicalLastExamDate must match input'
    );
    assertEqual(dbEmp!.medicalIntervalMonths, 6, 'medicalIntervalMonths must be persisted as 6');
    assertEqual(dbEmp!.medicalFitnessVerdict, 'APT', 'medicalFitnessVerdict must be persisted as APT');
    assertEqual(
      dbEmp!.medicalNotes,
      `[Clinica: ${clinic}, Medic: ${doctor}]`,
      'medicalNotes must be formatted with [Clinica: ..., Medic: ...]'
    );
  });

  // 1.7 AuditEvent Emission Verification
  await runTest('C1.7.1', 'AuditEvent emission: verifies action "MEDICAL_EXAM_RECORDED" in DB', async () => {
    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityId: activeEmp.id,
        action: 'MEDICAL_EXAM_RECORDED',
      },
      orderBy: { createdAt: 'desc' },
    });

    assert(auditEvent !== null, 'AuditEvent with action MEDICAL_EXAM_RECORDED must exist in DB');
    assertEqual(auditEvent!.entityType, 'Employee', 'AuditEvent entityType must be Employee');
    assertEqual(auditEvent!.actorName, 'CHALLENGER1 Inspector SSM', 'AuditEvent actorName must match operatorName');

    const details = JSON.parse(auditEvent!.details || '{}');
    assertEqual(details.verdict, 'APT', 'AuditEvent details must contain verdict APT');
    assertEqual(details.intervalMonths, 6, 'AuditEvent details must contain intervalMonths 6');
    assertEqual(details.clinicName, 'Clinica Regina Maria Pipera', 'AuditEvent details must contain clinicName');
    assertEqual(details.physicianName, 'Dr. Popescu Alexandru', 'AuditEvent details must contain physicianName');
  });

  // 1.8 Recalculation Returned in API Response
  await runTest('C1.8.1', 'Compliance recalculation: verified real-time compliance in response payload', async () => {
    // Record exam with 12 months from today
    const todayStr = new Date().toISOString().slice(0, 10);
    const { status, json } = await invokeMedicalExam(activeEmp.id, {
      examDate: todayStr,
      intervalMonths: 12,
      verdict: 'APT',
    });

    assertEqual(status, 200, 'Expected HTTP 200');
    assert(json.compliance !== undefined, 'Response must include compliance object');

    const medComp = json.compliance.occupationalMedicine;
    assert(medComp !== undefined, 'Compliance must include occupationalMedicine item');
    assertEqual(medComp.status, 'VALID', 'occupationalMedicine status must recalculate to VALID');
    assertEqual(medComp.intervalMonths, 12, 'occupationalMedicine intervalMonths must be 12');
    assert(typeof medComp.daysRemaining === 'number' && medComp.daysRemaining > 300, 'daysRemaining must be > 300');
  });

  // ==========================================================================
  // SECTION 2: Compliance Engine & Generation Unlocking
  // ==========================================================================
  console.log(`\n${C.bright}${C.yellow}--- SECTION 2: COMPLIANCE ENGINE & GENERATION UNLOCKING ---${C.reset}`);

  // 2.1 calculateCompanyMetrics with 100% PLECAT Employees
  await runTest('C2.1.1', 'calculateCompanyMetrics with 100% PLECAT company: returns 100% score, 0 active, NO NaN', async () => {
    const plecatEmployees = [
      {
        id: 'plecat-1',
        fullName: 'Plecat 1',
        status: 'PLECAT',
        leaveDate: new Date('2025-01-01'),
        medicalLastExamDate: new Date('2023-01-01'), // 3 years overdue
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'APT',
      },
      {
        id: 'plecat-2',
        fullName: 'Plecat 2',
        status: 'PLECAT',
        leaveDate: new Date('2025-06-01'),
        medicalLastExamDate: null, // missing
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: null,
      },
      {
        id: 'plecat-3',
        fullName: 'Plecat 3',
        status: 'PLECAT',
        leaveDate: new Date('2025-10-01'),
        medicalLastExamDate: new Date('2024-05-01'),
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'INAPT',
      },
    ];

    const metrics = calculateCompanyMetrics(plecatEmployees, new Date());

    assertEqual(metrics.totalEmployees, 0, 'Total active employees must be 0 for all-PLECAT company');
    assertEqual(metrics.totalItemsTracked, 0, 'Total items tracked must be 0');
    assertEqual(metrics.validCount, 0, 'Valid count must be 0');
    assertEqual(metrics.overdueCount, 0, 'Overdue count must be 0');
    assertEqual(metrics.missingCount, 0, 'Missing count must be 0');
    assertEqual(metrics.upcomingCount, 0, 'Upcoming count must be 0');
    assertEqual(metrics.complianceScorePercent, 100, 'Score must be 100% for 0 active employees');
    assert(!isNaN(metrics.complianceScorePercent), 'Score must NOT be NaN');
    assert(isFinite(metrics.complianceScorePercent), 'Score must be finite');
  });

  // 2.2 calculateCompanyMetrics with Mixed Active and PLECAT (Overdue PLECAT does NOT drag down company)
  await runTest('C2.2.1', 'Mixed company: overdue PLECAT employees do NOT drag down active company score', async () => {
    const today = new Date();
    const mixedEmployees = [
      // Active employee 1: 100% compliant
      {
        id: 'act-1',
        fullName: 'Activ Unu',
        status: 'ACTIV',
        medicalLastExamDate: today,
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'APT',
        ssmLastTrainingDate: today,
        ssmIntervalMonths: 6,
        psiLastTrainingDate: today,
        psiIntervalMonths: 6,
      },
      // Active employee 2: 100% compliant
      {
        id: 'act-2',
        fullName: 'Activ Doi',
        status: 'ACTIV',
        medicalLastExamDate: today,
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'APT',
        ssmLastTrainingDate: today,
        ssmIntervalMonths: 6,
        psiLastTrainingDate: today,
        psiIntervalMonths: 6,
      },
      // Departed employee 1: Severely overdue medical & SSM
      {
        id: 'plec-1',
        fullName: 'Plecat Overdue 1',
        status: 'PLECAT',
        leaveDate: new Date('2025-01-01'),
        medicalLastExamDate: new Date('2023-01-01'), // 3 years overdue
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: new Date('2023-01-01'), // 3 years overdue
        ssmIntervalMonths: 6,
      },
      // Departed employee 2: Severely overdue
      {
        id: 'plec-2',
        fullName: 'Plecat Overdue 2',
        status: 'PLECAT',
        leaveDate: new Date('2025-01-01'),
        medicalLastExamDate: new Date('2022-01-01'),
        medicalIntervalMonths: 12,
      },
    ];

    // Standard call (defaults to excluding PLECAT)
    const metricsActiveOnly = calculateCompanyMetrics(mixedEmployees, today);
    assertEqual(metricsActiveOnly.totalEmployees, 2, 'Must count only 2 active employees');
    assertEqual(metricsActiveOnly.overdueCount, 0, 'Overdue count must be 0 for active staff');
    assertEqual(metricsActiveOnly.validCount, 6, 'All 6 tracked items must be valid (3 per employee)');
    assertEqual(metricsActiveOnly.complianceScorePercent, 100, 'Company score must remain 100%');

    // Contrast check: when explicitly including terminated
    const metricsAll = calculateCompanyMetrics(mixedEmployees, today, { includeTerminated: true });
    assertEqual(metricsAll.totalEmployees, 4, 'Must count all 4 employees when includeTerminated is true');
    assert(metricsAll.overdueCount > 0, 'Overdue count must be > 0 when terminated employees are included');
    assert(metricsAll.complianceScorePercent < 100, 'Score is dragged down when includeTerminated is true');
  });

  // 2.3 Score Transitions from Degraded to 100% upon Medical Exam Recording
  await runTest('C2.3.1', 'Score transition: company transitions from degraded score to 100% upon recording medical exam', async () => {
    // Setup test company with 1 active employee who has overdue medical exam, but valid SSM and PSI
    const cuiTrans = TEST_CUI_2;
    await cleanupTestData();

    const clientTrans = await prisma.client.create({
      data: {
        name: 'TRANSITION TEST COMPANY S.R.L.',
        cui: cuiTrans,
        regCom: 'J40/9992/2026',
        address: 'București, Str. Progresului nr. 10',
        legalRepresentative: 'Director Pop',
        caenCode: '6201',
      },
    });

    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    const empTrans = await prisma.employee.create({
      data: {
        clientId: clientTrans.id,
        lastName: 'Pop',
        firstName: 'Andrei',
        cnp: generateValidCnp('192081512345'),
        hireDate: new Date('2024-01-01'),
        status: 'ACTIV',
        medicalLastExamDate: twoYearsAgo, // OVERDUE
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'APT',
        ssmLastTrainingDate: now, // VALID
        ssmIntervalMonths: 6,
        psiLastTrainingDate: now, // VALID
        psiIntervalMonths: 6,
      },
    });

    // Step 1: Initial degraded score
    const initialEmployees = await prisma.employee.findMany({ where: { clientId: clientTrans.id } });
    const initialMetrics = calculateCompanyMetrics(initialEmployees, now);

    assertEqual(initialMetrics.totalEmployees, 1, 'Total employees = 1');
    assertEqual(initialMetrics.totalItemsTracked, 3, 'Items tracked = 3 (Med, SSM, PSI)');
    assertEqual(initialMetrics.overdueCount, 1, 'Overdue count = 1 (Medicina muncii)');
    assertEqual(initialMetrics.validCount, 2, 'Valid count = 2 (SSM + PSI)');
    assertEqual(initialMetrics.complianceScorePercent, 66.67, 'Score must be degraded to 66.67%');

    // Step 2: Record valid medical exam via API
    const todayStr = now.toISOString().slice(0, 10);
    const { status, json } = await invokeMedicalExam(empTrans.id, {
      examDate: todayStr,
      intervalMonths: 12,
      verdict: 'APT',
      clinicName: 'Clinica Regenerare',
      doctorName: 'Dr. Test',
    });

    assertEqual(status, 200, 'Medical exam recording must succeed');
    assertEqual(json.compliance.occupationalMedicine.status, 'VALID', 'Occupational medicine must become VALID');

    // Step 3: Recompute company metrics from fresh DB state
    const refreshedEmployees = await prisma.employee.findMany({ where: { clientId: clientTrans.id } });
    const refreshedMetrics = calculateCompanyMetrics(refreshedEmployees, now);

    assertEqual(refreshedMetrics.totalEmployees, 1, 'Total employees = 1');
    assertEqual(refreshedMetrics.overdueCount, 0, 'Overdue count must become 0');
    assertEqual(refreshedMetrics.validCount, 3, 'Valid count must become 3');
    assertEqual(refreshedMetrics.complianceScorePercent, 100, 'Company score must transition to 100%');
  });

  // 2.4 Feature 9 Unlocking: Generation Unlocking Verification
  await runTest('C2.4.1', 'Feature 9 Unlocking: overdue medical exam blocks generation; valid exam unlocks generation', async () => {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    // Create client and employee with overdue medical exam
    const client = await prisma.client.create({
      data: {
        name: 'FEATURE 9 UNLOCKING S.R.L.',
        cui: `RO${Math.floor(10000000 + Math.random() * 89999999)}`,
        regCom: 'J40/9993/2026',
        address: 'București, Str. Unirii nr. 1',
        legalRepresentative: 'Director Test',
        caenCode: '6201',
      },
    });

    const emp = await prisma.employee.create({
      data: {
        clientId: client.id,
        lastName: 'Dumitrescu',
        firstName: 'Cristian',
        cnp: generateValidCnp('193041012345'),
        hireDate: new Date('2024-01-01'),
        status: 'ACTIV',
        medicalLastExamDate: twoYearsAgo, // OVERDUE
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'APT',
        ssmLastTrainingDate: now,
        ssmIntervalMonths: 6,
        psiLastTrainingDate: now,
        psiIntervalMonths: 6,
      },
    });

    // 1. Check initial overdue state in compliance & UI helper
    const compOverdue = calculateEmployeeCompliance(emp, now);
    assertEqual(compOverdue.occupationalMedicine.status, 'OVERDUE', 'Occupational medicine status must be OVERDUE');
    assert(
      compOverdue.occupationalMedicine.daysRemaining !== null && compOverdue.occupationalMedicine.daysRemaining < 0,
      'daysRemaining must be negative'
    );

    // checkEmployeeTemplateExpiry check
    const expiryOverdue = checkEmployeeTemplateExpiry('med-fisa-solicitare-examen', compOverdue, emp);
    assertEqual(expiryOverdue.isExpired, true, 'checkEmployeeTemplateExpiry must return isExpired: true');
    assert(expiryOverdue.reason?.includes('expirat'), 'Reason must indicate expired occupational medicine');

    // UI helper getEmployeeExpiryInfo check
    const uiInfoOverdue = getEmployeeExpiryInfo('med-fisa-solicitare-examen', {
      ...emp,
      compliance: compOverdue as any,
    });
    assertEqual(uiInfoOverdue.isExpired, true, 'UI getEmployeeExpiryInfo must return isExpired: true');
    assert(uiInfoOverdue.badgeText.includes('Expirat'), 'UI badge must say Expirat');

    // API batch generation attempt -> must reject with HTTP 400
    const reqOverdue = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateCode: 'med-fisa-solicitare-examen',
        clientId: client.id,
        employeeIds: [emp.id],
      }),
    });
    const resOverdue = await generateBatchPost(reqOverdue);
    const jsonOverdue = await resOverdue.json();
    assertEqual(resOverdue.status, 400, 'Batch generation must be blocked (HTTP 400) for overdue medical exam');
    assert(jsonOverdue.error?.includes('blocată'), 'Error message must state generation was blocked');

    // 2. Record valid medical exam via POST /api/employees/[id]/medical-exam
    const todayStr = now.toISOString().slice(0, 10);
    const { status: examStatus } = await invokeMedicalExam(emp.id, {
      examDate: todayStr,
      intervalMonths: 12,
      verdict: 'APT',
      clinicName: 'Clinica Sanador',
      doctorName: 'Dr. Ionescu Radu',
    });
    assertEqual(examStatus, 200, 'Exam recording must succeed with HTTP 200');

    // 3. Re-fetch employee and verify generation is UNLOCKED
    const updatedEmp = await prisma.employee.findUnique({ where: { id: emp.id } });
    const compUnlocked = calculateEmployeeCompliance(updatedEmp!, now);

    assertEqual(compUnlocked.occupationalMedicine.status, 'VALID', 'Occupational medicine must now be VALID');
    assert(
      compUnlocked.occupationalMedicine.daysRemaining !== null && compUnlocked.occupationalMedicine.daysRemaining > 0,
      'daysRemaining must now be positive'
    );

    // checkEmployeeTemplateExpiry check
    const expiryUnlocked = checkEmployeeTemplateExpiry('med-fisa-solicitare-examen', compUnlocked, updatedEmp!);
    assertEqual(expiryUnlocked.isExpired, false, 'checkEmployeeTemplateExpiry must now return isExpired: false');

    // UI helper getEmployeeExpiryInfo check
    const uiInfoUnlocked = getEmployeeExpiryInfo('med-fisa-solicitare-examen', {
      ...updatedEmp!,
      compliance: compUnlocked as any,
    });
    assertEqual(uiInfoUnlocked.isExpired, false, 'UI getEmployeeExpiryInfo must now return isExpired: false');
    assertEqual(uiInfoUnlocked.badgeText, 'Conform', 'UI badge must now say Conform');

    // API batch generation attempt -> now UNBLOCKED (does not reject with HTTP 400 for medical expiry)
    const reqUnlocked = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateCode: 'med-fisa-solicitare-examen',
        clientId: client.id,
        employeeIds: [emp.id],
      }),
    });
    const resUnlocked = await generateBatchPost(reqUnlocked);
    // Should NOT be blocked due to compliance expiry
    assertEqual(resUnlocked.status, 200, 'Batch generation should now succeed with HTTP 200');

    // 4. Hostile test: Record INAPT verdict -> must re-lock generation!
    const { status: inaptStatus } = await invokeMedicalExam(emp.id, {
      examDate: todayStr,
      intervalMonths: 12,
      verdict: 'INAPT',
      clinicName: 'Clinica Sanador',
      doctorName: 'Dr. Ionescu Radu',
      restrictions: 'Inapt medical definitiv',
    });
    assertEqual(inaptStatus, 200, 'INAPT recording must succeed');

    const inaptEmp = await prisma.employee.findUnique({ where: { id: emp.id } });
    const compInapt = calculateEmployeeCompliance(inaptEmp!, now);

    const expiryInapt = checkEmployeeTemplateExpiry('med-fisa-solicitare-examen', compInapt, inaptEmp!);
    assertEqual(expiryInapt.isExpired, true, 'INAPT employee must be marked isExpired: true');
    assert(expiryInapt.reason?.includes('INAPT'), 'Reason must mention INAPT verdict');

    const uiInfoInapt = getEmployeeExpiryInfo('med-fisa-solicitare-examen', {
      ...inaptEmp!,
      compliance: compInapt as any,
    });
    assertEqual(uiInfoInapt.isExpired, true, 'UI must mark INAPT employee as isExpired: true');
    assertEqual(uiInfoInapt.badgeText, 'Inapt Medical', 'UI badge must show Inapt Medical');

    // Clean up test client
    await prisma.client.delete({ where: { id: client.id } });
  });

  // Teardown
  console.log(`\n${C.blue}▶ Tearing down test fixtures...${C.reset}`);
  await cleanupTestData();

  // Print Summary
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bright}EXECUTION SUMMARY — CHALLENGER 1 ADVERSARIAL STRESS SUITE${C.reset}`);
  console.log(`${C.cyan}--------------------------------------------------------------------------------${C.reset}`);
  console.log(`  Total tests executed: ${total}`);
  console.log(`  Tests passed:         ${C.green}${passed}${C.reset}`);
  console.log(`  Tests failed:         ${failed > 0 ? C.red + failed : C.green + '0'}${C.reset}`);

  const overallColor = failed === 0 ? C.bgGreen : C.bgRed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  console.log(
    `\n${overallColor}${C.bright} TOTAL: ${passed}/${total} PASSED (${passRate}%) ${C.reset}\n`
  );

  if (failed > 0) {
    console.log(`${C.red}${C.bright}FAILED TESTS:${C.reset}`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  - [${r.id}] ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log(`${C.green}${C.bright}ALL EMPIRICAL ADVERSARIAL CHALLENGES PASSED! VERDICT: APPROVE${C.reset}\n`);
    process.exit(0);
  }
}

main()
  .catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
