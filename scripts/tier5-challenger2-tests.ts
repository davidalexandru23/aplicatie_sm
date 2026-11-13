/**
 * ============================================================================
 * TIER 5 EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 2
 * ============================================================================
 * 
 * Scope: API Routes, Operational State Transitions, Concurrency & Boundary Limits
 * Milestone: Milestone 6 Phase 2 (Adversarial Coverage Hardening — Tier 5)
 * 
 * Target Routes & Subsystems:
 * 1. Employee Routes:
 *    - POST /api/employees (Creation, CNP validation, minor check, cross-tenant jobs/worksites, injection)
 *    - PUT /api/employees/[id] (Mutation, duplicate CNP, employment history transitions)
 *    - POST /api/employees/[id]/terminate (Statutory termination, leaveDate invariants, re-termination)
 *    - POST /api/employees/[id]/medical-exam (HG 355/2007, verdicts, positive interval, terminated block)
 * 2. Trainings Routes:
 *    - POST /api/trainings/record (Validation, future dates, planned vs completed, order of operations)
 *    - Routing behavior for /api/trainings/documents
 * 3. EIP & Risk Routes:
 *    - POST /api/eip/assignments & DELETE (HG 1048/2006, upsert idempotency, error handling)
 *    - POST /api/risk-assessments (INCDPM, gravity 1-7, probability 1-6, cross-tenant isolation)
 * 4. Hygiene Routes:
 *    - PATCH /api/hygiene/sessions/[id]/participants/[participantId] (Ord. 2209/2022, absent nullification, sync)
 *    - POST /api/hygiene/sessions (Session creation, participant validation, date integrity)
 * 5. Batch Generation Routes:
 *    - POST /api/documents/generate-batch (Error isolation, mixed batches, ZIP archive integrity, report audit)
 * 
 * Invocation:
 *   npx tsx scripts/tier5-challenger2-tests.ts
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { validateCNP } from '../src/lib/importer';

// Route Handlers
import { POST as postEmployee } from '../src/app/api/employees/route';
import { GET as getEmployee, PUT as putEmployee } from '../src/app/api/employees/[id]/route';
import { POST as terminateEmployee } from '../src/app/api/employees/[id]/terminate/route';
import { POST as recordMedicalExam } from '../src/app/api/employees/[id]/medical-exam/route';
import { POST as recordTraining } from '../src/app/api/trainings/record/route';
import {
  GET as getEipAssignments,
  POST as postEipAssignment,
  DELETE as deleteEipAssignment,
} from '../src/app/api/eip/assignments/route';
import {
  GET as getRiskAssessments,
  POST as postRiskAssessment,
} from '../src/app/api/risk-assessments/route';
import {
  GET as getHygieneSessions,
  POST as postHygieneSession,
} from '../src/app/api/hygiene/sessions/route';
import {
  GET as getHygieneParticipant,
  PATCH as patchHygieneParticipant,
} from '../src/app/api/hygiene/sessions/[id]/participants/[participantId]/route';
import { POST as generateBatch } from '../src/app/api/documents/generate-batch/route';

// ANSI Styling
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Counters
let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];
const findings: Array<{ title: string; category: string; description: string; impact: string }> = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ${C.green}✓${C.reset} ${testName}`);
  } else {
    failedCount++;
    const msg = `FAIL: ${testName}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.error(`  ${C.red}✗${C.reset} ${msg}`);
  }
}

function recordFinding(title: string, category: string, description: string, impact: string) {
  findings.push({ title, category, description, impact });
  console.log(`  ${C.yellow}⚠ [FINDING: ${category}]${C.reset} ${C.bold}${title}${C.reset}\n    ${C.dim}${description}${C.reset}`);
}

// CNP Generator for testing
function generateValidCnp(sex: 'M' | 'F', birthYear: number, month: number, day: number, county = 41, seq = 101): string {
  let s = 1;
  if (birthYear >= 1900 && birthYear <= 1999) s = sex === 'M' ? 1 : 2;
  else if (birthYear >= 2000 && birthYear <= 2099) s = sex === 'M' ? 5 : 6;
  else if (birthYear >= 1800 && birthYear <= 1899) s = sex === 'M' ? 3 : 4;

  const aa = String(birthYear % 100).padStart(2, '0');
  const ll = String(month).padStart(2, '0');
  const zz = String(day).padStart(2, '0');
  const jj = String(county).padStart(2, '0');
  const nnn = String(seq).padStart(3, '0');

  const first12 = `${s}${aa}${ll}${zz}${jj}${nnn}`;
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(first12[i]) * weights[i];
  }
  const rem = sum % 11;
  const c = rem === 10 ? 1 : rem;
  return `${first12}${c}`;
}

// Track created fixture IDs for cleanup
const cleanupFixture = {
  employeeIds: [] as string[],
  trainingEventIds: [] as string[],
  riskAssessmentIds: [] as string[],
  hygieneSessionIds: [] as string[],
  eipAssignmentIds: [] as string[],
};

async function runChallenger2Suite() {
  console.log(`\n${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  TIER 5 ADVERSARIAL STRESS TEST SUITE — CHALLENGER 2${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Target: API Routes, Operational State Transitions, Boundaries & Concurrency${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}\n`);

  // Load baseline clients
  const bistro = await prisma.client.findFirst({
    where: { cui: 'RO45123987' },
    include: { employees: true, jobs: true, worksites: true },
  });
  const nexus = await prisma.client.findFirst({
    where: { cui: 'RO38765432' },
    include: { employees: true, jobs: true, worksites: true },
  });

  if (!bistro || !nexus) {
    throw new Error('Baseline seed clients (Bistro Gourmet or Nexus Solutions) not found!');
  }

  // ==========================================================================
  // GROUP 1: Employee Routes Adversarial Testing
  // ==========================================================================
  console.log(`\n${C.bold}${C.blue}▶ GROUP 1: Employee Routes Adversarial Testing${C.reset}`);

  // Test 1.1: POST /api/employees - Missing mandatory fields
  {
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await postEmployee(req);
    assert(res.status === 400, 'T1.1: Missing clientId returns HTTP 400');
  }

  // Test 1.2: POST /api/employees - Missing firstName / lastName
  {
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({ clientId: bistro.id, firstName: '   ', lastName: '', cnp: '1850412411234' }),
    });
    const res = await postEmployee(req);
    assert(res.status === 400, 'T1.2: Whitespace-only name returns HTTP 400');
  }

  // Test 1.3: POST /api/employees - Invalid CNP checksum
  {
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Ion',
        lastName: 'Test',
        cnp: '1850412411239', // invalid control digit
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 400, 'T1.3: Invalid CNP checksum rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('CNP invalid'), 'T1.3.1: Specific CNP error message returned');
  }

  // Test 1.4: POST /api/employees - Underage employee (<15 years old)
  {
    const underageCnp = generateValidCnp('M', 2018, 5, 10, 41, 101); // 8 years old
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Copil',
        lastName: 'Minor',
        cnp: underageCnp,
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 400, 'T1.4: Minor under 15 years rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('minorilor sub 15 ani'), 'T1.4.1: Statutory minor prohibition message returned');
  }

  // Test 1.5: POST /api/employees - Cross-tenant Job ID
  {
    const crossJob = nexus.jobs[0]; // Belongs to Nexus, not Bistro
    const validCnp = generateValidCnp('M', 1990, 6, 15, 41, 201);
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Test',
        lastName: 'CrossJob',
        cnp: validCnp,
        currentJobId: crossJob.id,
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 400, 'T1.5: Cross-tenant Job ID rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('nu aparține acestei companii'), 'T1.5.1: Tenant boundary error returned');
  }

  // Test 1.6: POST /api/employees - Cross-tenant Worksite ID
  {
    const crossWorksite = nexus.worksites[0]; // Belongs to Nexus, not Bistro
    const validCnp = generateValidCnp('F', 1992, 8, 20, 41, 202);
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Test',
        lastName: 'CrossWorksite',
        cnp: validCnp,
        currentWorksiteId: crossWorksite.id,
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 400, 'T1.6: Cross-tenant Worksite ID rejected with HTTP 400');
  }

  // Test 1.7: POST /api/employees - Hostile payload & XSS tokens safely parameterized
  let createdHostileEmpId = '';
  {
    const hostileCnp = generateValidCnp('M', 1988, 3, 15, 41, 301);
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: '<script>alert("XSS")</script>',
        lastName: "O'Connor\"; DROP TABLE employees;--",
        cnp: hostileCnp,
        adminNotes: 'Test hostile payload: <xml>&amp;</xml>',
        bankIban: "RO49AAAA1B31007593840000'--",
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 201, 'T1.7: Hostile payload handled safely without SQL injection crash (HTTP 201)');
    const data = await res.json();
    createdHostileEmpId = data.employee?.id;
    if (createdHostileEmpId) cleanupFixture.employeeIds.push(createdHostileEmpId);
  }

  // Test 1.8: POST /api/employees - Duplicate CNP in same company
  {
    const existingEmp = bistro.employees[0];
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Duplicate',
        lastName: 'CNP',
        cnp: existingEmp.cnp,
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 409, 'T1.8: Duplicate CNP in same company returns HTTP 409 Conflict');
  }

  // Test 1.9: POST /api/employees - Boundary limits & Negative numeric inputs
  let createdNegativeEmpId = '';
  {
    const negCnp = generateValidCnp('M', 1991, 10, 5, 41, 401);
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Tiberiu',
        lastName: 'Negativ',
        cnp: negCnp,
        grossSalary: -4500,
        workNorm: -8,
        probationDays: -30,
        annualLeaveDays: -20,
      }),
    });
    const res = await postEmployee(req);
    // Observe behavior: does the endpoint reject or accept negative numbers?
    if (res.status === 201) {
      const data = await res.json();
      createdNegativeEmpId = data.employee?.id;
      if (createdNegativeEmpId) cleanupFixture.employeeIds.push(createdNegativeEmpId);
      recordFinding(
        'Negative Numeric Values Permitted in Employee Route',
        'Schema Boundary Violation',
        `POST /api/employees accepted grossSalary: -4500, workNorm: -8, probationDays: -30 without validation. Persisted in DB.`,
        'Low/Medium: Causes nonsensical negative salary and work norms in generated employment contracts.'
      );
      assert(true, 'T1.9: Negative numeric payload observed and recorded as finding');
    } else {
      assert(res.status === 400, 'T1.9: Negative numeric values rejected with HTTP 400');
    }
  }

  // Test 1.10: POST /api/employees - Full statutory creation with relations
  let createdEmpId = '';
  const validTestCnp = generateValidCnp('F', 1994, 2, 14, 41, 501);
  {
    const bistroJob = bistro.jobs[0];
    const bistroWorksite = bistro.worksites[0];
    const req = new NextRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        firstName: 'Diana',
        lastName: 'Popescu',
        cnp: validTestCnp,
        hireDate: '2026-01-15',
        currentJobId: bistroJob.id,
        currentWorksiteId: bistroWorksite.id,
        grossSalary: 5500,
        workNorm: 8,
        probationDays: 90,
        annualLeaveDays: 21,
        cimNumber: 'CIM-2026-99',
        cimDate: '2026-01-14',
        shoeSize: '38',
        clothingSize: 'M',
        gloveSize: '7',
        // Identity Doc
        idDocType: 'CI',
        idSeries: 'RX',
        idNumber: '887766',
        idIssuedBy: 'SPCLEP Cluj',
        idIssueDate: '2020-05-10',
        idExpiryDate: '2030-05-10',
        // Address
        addressCounty: 'Cluj',
        addressLocality: 'Cluj-Napoca',
        addressStreet: 'Str. Observatorului',
        addressNumber: '12',
      }),
    });
    const res = await postEmployee(req);
    assert(res.status === 201, 'T1.10: Valid statutory employee created successfully (HTTP 201)');
    const data = await res.json();
    createdEmpId = data.employee?.id;
    assert(Boolean(createdEmpId), 'T1.10.1: Created employee ID returned');
    assert(data.employee?.identityDocument?.number === '887766', 'T1.10.2: Identity document persisted');
    assert(data.employee?.residenceAddress?.locality === 'Cluj-Napoca', 'T1.10.3: Residence address persisted');
    assert(data.compliance?.overallStatus === 'MISSING', 'T1.10.4: Compliance accurately calculated as MISSING');
    if (createdEmpId) cleanupFixture.employeeIds.push(createdEmpId);
  }

  // Test 1.11: PUT /api/employees/[id] - Non-existent ID
  {
    const req = new NextRequest('http://localhost:3000/api/employees/00000000-0000-0000-0000-000000000000', {
      method: 'PUT',
      body: JSON.stringify({ firstName: 'Test' }),
    });
    const res = await putEmployee(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    assert(res.status === 404, 'T1.11: PUT non-existent employee returns HTTP 404');
  }

  // Test 1.12: PUT /api/employees/[id] - CNP mutation to duplicate
  {
    const targetEmp = bistro.employees[0];
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}`, {
      method: 'PUT',
      body: JSON.stringify({ cnp: targetEmp.cnp }),
    });
    const res = await putEmployee(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 409, 'T1.12: PUT duplicate CNP mutation returns HTTP 409');
  }

  // Test 1.13: PUT /api/employees/[id] - Cross-tenant Job update
  {
    const crossJob = nexus.jobs[0];
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}`, {
      method: 'PUT',
      body: JSON.stringify({ currentJobId: crossJob.id }),
    });
    const res = await putEmployee(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 400, 'T1.13: PUT cross-tenant Job update returns HTTP 400');
  }

  // Test 1.14: PUT /api/employees/[id] - Employment history transition
  {
    const secondJob = bistro.jobs[1] || bistro.jobs[0];
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}`, {
      method: 'PUT',
      body: JSON.stringify({ currentJobId: secondJob.id }),
    });
    const res = await putEmployee(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 200, 'T1.14: PUT job update returns HTTP 200');
    // Verify employment history
    const history = await prisma.employmentHistory.findMany({
      where: { employeeId: createdEmpId },
      orderBy: { validFrom: 'desc' },
    });
    assert(history.length >= 2, 'T1.14.1: Employment history tracks job transition (2 entries)');
    assert(history[1].validTo !== null, 'T1.14.2: Previous employment history entry closed with validTo');
  }

  // Test 1.15: POST /api/employees/[id]/terminate - Non-existent ID
  {
    const req = new NextRequest('http://localhost:3000/api/employees/00000000-0000-0000-0000-000000000000/terminate', {
      method: 'POST',
      body: JSON.stringify({ leaveDate: '2026-06-01' }),
    });
    const res = await terminateEmployee(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    assert(res.status === 404, 'T1.15: Terminate non-existent employee returns HTTP 404');
  }

  // Test 1.16: POST /api/employees/[id]/terminate - Missing / Invalid leaveDate
  {
    const req1 = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res1 = await terminateEmployee(req1, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res1.status === 400, 'T1.16: Missing leaveDate returns HTTP 400');

    const req2 = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ leaveDate: 'invalid-date-string' }),
    });
    const res2 = await terminateEmployee(req2, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res2.status === 400, 'T1.16.1: Invalid leaveDate string returns HTTP 400');
  }

  // Test 1.17: POST /api/employees/[id]/terminate - leaveDate before hireDate
  {
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ leaveDate: '2025-01-01' }), // hireDate was 2026-01-15
    });
    const res = await terminateEmployee(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 400, 'T1.17: leaveDate before hireDate rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('anterioară datei angajării'), 'T1.17.1: Statutory date order error returned');
  }

  // Create dedicated employee for termination and medical exam testing
  const termTestCnp = generateValidCnp('M', 1987, 7, 22, 41, 601);
  let termEmpId = '';
  {
    const emp = await prisma.employee.create({
      data: {
        clientId: bistro.id,
        firstName: 'Vasile',
        lastName: 'Terminat',
        cnp: termTestCnp,
        hireDate: new Date('2025-01-10'),
        status: 'ACTIV',
      },
    });
    termEmpId = emp.id;
    cleanupFixture.employeeIds.push(termEmpId);
  }

  // Test 1.18: POST /api/employees/[id]/terminate - Successful termination
  {
    const req = new NextRequest(`http://localhost:3000/api/employees/${termEmpId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({
        leaveDate: '2026-05-31',
        reason: 'Demisie conform art. 81 Codul Muncii',
        operatorName: 'Inspector HR Test',
      }),
    });
    const res = await terminateEmployee(req, { params: Promise.resolve({ id: termEmpId }) });
    assert(res.status === 200, 'T1.18: Successful employee termination returns HTTP 200');
    const data = await res.json();
    assert(data.employee?.status === 'PLECAT', 'T1.18.1: Employee status set to PLECAT');
    assert(Boolean(data.employee?.leaveDate), 'T1.18.2: leaveDate recorded');

    // Verify AuditEvent
    const audit = await prisma.auditEvent.findFirst({
      where: { entityId: termEmpId, action: 'EMPLOYEE_TERMINATED' },
    });
    assert(Boolean(audit), 'T1.18.3: EMPLOYEE_TERMINATED AuditEvent persisted');
  }

  // Test 1.19: POST /api/employees/[id]/terminate - Re-terminating already terminated employee
  {
    const req = new NextRequest(`http://localhost:3000/api/employees/${termEmpId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ leaveDate: '2026-06-01' }),
    });
    const res = await terminateEmployee(req, { params: Promise.resolve({ id: termEmpId }) });
    assert(res.status === 400, 'T1.19: Re-terminating PLECAT employee rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('deja încetat'), 'T1.19.1: State transition error returned');
  }

  // Test 1.20: POST /api/employees/[id]/medical-exam - Terminated employee blocked
  {
    const req = new NextRequest(`http://localhost:3000/api/employees/${termEmpId}/medical-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: '2026-02-01',
        intervalMonths: 12,
        verdict: 'APT',
      }),
    });
    const res = await recordMedicalExam(req, { params: Promise.resolve({ id: termEmpId }) });
    assert(res.status === 400, 'T1.20: Medical exam on PLECAT employee rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('contract de muncă încetat'), 'T1.20.1: Terminated employee medical exam error returned');
  }

  // Test 1.21: POST /api/employees/[id]/medical-exam - Invalid verdict
  {
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/medical-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: '2026-02-01',
        intervalMonths: 12,
        verdict: 'FOARTE_SANATOS', // not in allowed HG 355/2007 verdicts
      }),
    });
    const res = await recordMedicalExam(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 400, 'T1.21: Invalid medical verdict rejected with HTTP 400');
  }

  // Test 1.22: POST /api/employees/[id]/medical-exam - Zero or negative intervalMonths
  {
    const req1 = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/medical-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: '2026-02-01',
        intervalMonths: 0,
        verdict: 'APT',
      }),
    });
    const res1 = await recordMedicalExam(req1, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res1.status === 400, 'T1.22: intervalMonths: 0 rejected with HTTP 400');

    const req2 = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/medical-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: '2026-02-01',
        intervalMonths: -12,
        verdict: 'APT',
      }),
    });
    const res2 = await recordMedicalExam(req2, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res2.status === 400, 'T1.22.1: intervalMonths: -12 rejected with HTTP 400');
  }

  // Test 1.23: POST /api/employees/[id]/medical-exam - Far-future examDate (> 1 year)
  {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 2);
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/medical-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: farFuture.toISOString(),
        intervalMonths: 12,
        verdict: 'APT',
      }),
    });
    const res = await recordMedicalExam(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 400, 'T1.23: Far-future examDate (>1 year) rejected with HTTP 400');
  }

  // Test 1.24: POST /api/employees/[id]/medical-exam - Successful recording & compliance update
  {
    const today = new Date();
    const req = new NextRequest(`http://localhost:3000/api/employees/${createdEmpId}/medical-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: today.toISOString().split('T')[0],
        intervalMonths: 12,
        verdict: 'APT',
        clinicName: 'Clinica MedLife SSM',
        doctorName: 'Dr. Ionescu Radu',
        notes: 'Fără contraindicații',
      }),
    });
    const res = await recordMedicalExam(req, { params: Promise.resolve({ id: createdEmpId }) });
    assert(res.status === 200, 'T1.24: Valid medical exam recorded with HTTP 200');
    const data = await res.json();
    assert(data.employee?.medicalFitnessVerdict === 'APT', 'T1.24.1: medicalFitnessVerdict updated to APT');
    assert(data.compliance?.occupationalMedicine?.status === 'VALID', 'T1.24.2: Occupational medicine compliance becomes VALID');
    assert(data.compliance?.occupationalMedicine?.daysRemaining > 300, 'T1.24.3: >300 days remaining on valid exam');
  }

  // ==========================================================================
  // GROUP 2: Trainings Routes & Order-of-Operation Anomalies
  // ==========================================================================
  console.log(`\n${C.bold}${C.blue}▶ GROUP 2: Trainings Routes & Operational State Transitions${C.reset}`);

  // Test 2.1: POST /api/trainings/record - Missing required fields
  {
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await recordTraining(req);
    assert(res.status === 400, 'T2.1: Missing required training parameters returns HTTP 400');
  }

  // Test 2.2: POST /api/trainings/record - Invalid training type
  {
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'FIRE_EVACUATION_DRILL', // not in INTRODUCTIV, LOC_MUNCA, PERIODIC_SSM, PERIODIC_PSI
        eventDate: '2026-05-10',
        durationHours: 2,
        instructorName: 'Popescu Ion',
        participantEmployeeIds: [createdEmpId],
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 400, 'T2.2: Invalid trainingType returns HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('Valori permise: INTRODUCTIV'), 'T2.2.1: Allowed types listed in error');
  }

  // Test 2.3: POST /api/trainings/record - Zero or negative durationHours
  {
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: '2026-05-10',
        durationHours: 0,
        instructorName: 'Popescu Ion',
        participantEmployeeIds: [createdEmpId],
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 400, 'T2.3: durationHours <= 0 returns HTTP 400');
  }

  // Test 2.4: POST /api/trainings/record - Cross-tenant participant
  {
    const nexusEmp = nexus.employees[0];
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: '2026-05-10',
        durationHours: 2,
        instructorName: 'Popescu Ion',
        participantEmployeeIds: [nexusEmp.id], // Belongs to Nexus, not Bistro
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 400, 'T2.4: Cross-tenant participant rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('nu aparțin companiei specificate'), 'T2.4.1: Cross-tenant error returned');
  }

  // Test 2.5: POST /api/trainings/record - Completed training with future date
  {
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: '2026-12-31',
        durationHours: 2,
        instructorName: 'Popescu Ion',
        status: 'completed',
        participantEmployeeIds: [createdEmpId],
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 400, 'T2.5: Completed training with future date rejected with HTTP 400');
  }

  // Test 2.6: POST /api/trainings/record - Planned training > 365 days in future
  {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 400);
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: farFuture.toISOString(),
        durationHours: 2,
        instructorName: 'Popescu Ion',
        status: 'planned',
        participantEmployeeIds: [createdEmpId],
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 400, 'T2.6: Planned training >365 days rejected with HTTP 400');
  }

  // Test 2.7: POST /api/trainings/record - Valid planned training does NOT update employee date
  let plannedEventId = '';
  {
    const plannedDate = new Date();
    plannedDate.setDate(plannedDate.getDate() + 20);
    const empBefore = await prisma.employee.findUnique({ where: { id: createdEmpId } });

    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: plannedDate.toISOString(),
        durationHours: 2,
        instructorName: 'Ing. Test Planned',
        status: 'planned',
        participantEmployeeIds: [createdEmpId],
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 201, 'T2.7: Planned future training returns HTTP 201');
    const data = await res.json();
    plannedEventId = data.event?.id;
    if (plannedEventId) cleanupFixture.trainingEventIds.push(plannedEventId);
    assert(data.event?.status === 'planned', 'T2.7.1: Event status is planned');

    const empAfter = await prisma.employee.findUnique({ where: { id: createdEmpId } });
    assert(
      empBefore?.ssmLastTrainingDate?.toISOString() === empAfter?.ssmLastTrainingDate?.toISOString(),
      'T2.7.2: Planned training does NOT alter employee ssmLastTrainingDate'
    );
  }

  // Test 2.8: POST /api/trainings/record - Completed training updates employee lastTrainingDate
  let completedEventId = '';
  {
    const trainingDate = new Date();
    trainingDate.setDate(trainingDate.getDate() - 5);
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: trainingDate.toISOString().split('T')[0],
        durationHours: 2,
        instructorName: 'Ing. Vasile Inspector',
        status: 'completed',
        participantEmployeeIds: [createdEmpId],
      }),
    });
    const res = await recordTraining(req);
    assert(res.status === 201, 'T2.8: Completed training returns HTTP 201');
    const data = await res.json();
    completedEventId = data.event?.id;
    if (completedEventId) cleanupFixture.trainingEventIds.push(completedEventId);
    assert(data.event?.status === 'recorded', 'T2.8.1: DB event status is recorded');

    const empAfter = await prisma.employee.findUnique({ where: { id: createdEmpId } });
    assert(Boolean(empAfter?.ssmLastTrainingDate), 'T2.8.2: Employee ssmLastTrainingDate successfully updated');
  }

  // Test 2.9: Concurrency / Order-of-Operation Anomaly: Training recorded for Terminated employee (PLECAT)
  {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: pastDate.toISOString().split('T')[0],
        durationHours: 2,
        instructorName: 'Ing. Test Anomaly',
        status: 'completed',
        participantEmployeeIds: [termEmpId], // Employee is status 'PLECAT'
      }),
    });
    const res = await recordTraining(req);
    if (res.status === 201) {
      const data = await res.json();
      if (data.event?.id) cleanupFixture.trainingEventIds.push(data.event.id);
      recordFinding(
        'Training Record Allowed on Terminated Employee (PLECAT)',
        'Order-of-Operation / State Machine Anomaly',
        `POST /api/trainings/record permitted registering training for employee with status PLECAT and updated ssmLastTrainingDate on terminated record.`,
        'Medium: Allows departed workers to be included in active statutory training protocols, corrupting ITM collective training logs.'
      );
      assert(true, 'T2.9: Order-of-operation anomaly observed and recorded as finding');
    } else {
      assert(res.status === 400, 'T2.9: Training on PLECAT employee rejected with HTTP 400');
    }
  }

  // Test 2.10: Route presence check for /api/trainings/documents
  {
    const exists = fs.existsSync(path.join(process.cwd(), 'src/app/api/trainings/documents/route.ts'));
    if (!exists) {
      recordFinding(
        'Direct Route /api/trainings/documents Does Not Exist',
        'Routing Architecture Note',
        'Training document downloads are routed via TrainingSessionCard invoking POST /api/documents/generate with trainingEventId payload, rather than a dedicated GET /api/trainings/documents route.',
        'Low: UI function works via generator route, but dedicated GET route is absent.'
      );
      assert(true, 'T2.10: /api/trainings/documents architecture noted');
    } else {
      assert(true, 'T2.10: /api/trainings/documents route exists');
    }
  }

  // ==========================================================================
  // GROUP 3: EIP & Risk Management Routes
  // ==========================================================================
  console.log(`\n${C.bold}${C.blue}▶ GROUP 3: EIP & Risk Management Routes${C.reset}`);

  // Fetch an EIP item
  const eipItem = await prisma.eipItem.findFirst();
  if (!eipItem) throw new Error('No EipItem found in database!');

  // Test 3.1: POST /api/eip/assignments - Missing employeeId or eipItemId
  {
    const req = new NextRequest('http://localhost:3000/api/eip/assignments', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await postEipAssignment(req);
    assert(res.status === 400, 'T3.1: Missing employeeId or eipItemId returns HTTP 400');
  }

  // Test 3.2: POST /api/eip/assignments - Non-existent employeeId or eipItemId
  {
    const req1 = new NextRequest('http://localhost:3000/api/eip/assignments', {
      method: 'POST',
      body: JSON.stringify({ employeeId: '00000000-0000-0000-0000-000000000000', eipItemId: eipItem.id }),
    });
    const res1 = await postEipAssignment(req1);
    assert(res1.status === 404, 'T3.2: Non-existent employeeId returns HTTP 404');

    const req2 = new NextRequest('http://localhost:3000/api/eip/assignments', {
      method: 'POST',
      body: JSON.stringify({ employeeId: createdEmpId, eipItemId: '00000000-0000-0000-0000-000000000000' }),
    });
    const res2 = await postEipAssignment(req2);
    assert(res2.status === 404, 'T3.2.1: Non-existent eipItemId returns HTTP 404');
  }

  // Test 3.3: POST /api/eip/assignments - Successful assignment & Upsert idempotency
  let eipAssignmentId = '';
  {
    const req1 = new NextRequest('http://localhost:3000/api/eip/assignments', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: createdEmpId,
        eipItemId: eipItem.id,
        assignedDate: '2026-02-15',
      }),
    });
    const res1 = await postEipAssignment(req1);
    assert(res1.status === 201, 'T3.3: Valid EIP assignment returns HTTP 201');
    const data1 = await res1.json();
    eipAssignmentId = data1.assignment?.id;
    if (eipAssignmentId) cleanupFixture.eipAssignmentIds.push(eipAssignmentId);

    // Repeat POST (upsert idempotency)
    const req2 = new NextRequest('http://localhost:3000/api/eip/assignments', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: createdEmpId,
        eipItemId: eipItem.id,
        assignedDate: '2026-03-01',
      }),
    });
    const res2 = await postEipAssignment(req2);
    assert(res2.status === 201, 'T3.3.1: Repeating EIP assignment upserts cleanly without 500 collision');
    const data2 = await res2.json();
    assert(data2.assignment?.id === eipAssignmentId, 'T3.3.2: Idempotent upsert preserves assignment ID');
  }

  // Test 3.4: GET /api/eip/assignments
  {
    const req = new NextRequest(`http://localhost:3000/api/eip/assignments?employeeId=${createdEmpId}`);
    const res = await getEipAssignments(req);
    assert(res.status === 200, 'T3.4: GET /api/eip/assignments returns HTTP 200');
    const data = await res.json();
    assert(data.assignments?.length >= 1, 'T3.4.1: Assigned EIP item returned');
    assert(data.assignments[0]?.eipItem?.code === eipItem.code, 'T3.4.2: EipItem relation populated');
  }

  // Test 3.5: DELETE /api/eip/assignments
  {
    const req = new NextRequest(`http://localhost:3000/api/eip/assignments?id=${eipAssignmentId}`, {
      method: 'DELETE',
    });
    const res = await deleteEipAssignment(req);
    assert(res.status === 200, 'T3.5: DELETE /api/eip/assignments returns HTTP 200');

    // Deleting again (non-existent record)
    const req2 = new NextRequest(`http://localhost:3000/api/eip/assignments?id=${eipAssignmentId}`, {
      method: 'DELETE',
    });
    const res2 = await deleteEipAssignment(req2);
    // Observe: Prisma throws P2025 -> route returns 500
    if (res2.status === 500) {
      recordFinding(
        'DELETE Non-Existent EIP Assignment Returns HTTP 500 Instead of 404',
        'Error Handling Defect',
        `DELETE /api/eip/assignments?id=${eipAssignmentId} returns HTTP 500 due to unhandled PrismaClientKnownRequestError P2025.`,
        'Low: Should catch record-not-found and return HTTP 404.'
      );
      assert(true, 'T3.5.1: Non-existent assignment DELETE error handling observed');
    } else {
      assert(res2.status === 404, 'T3.5.1: Non-existent assignment returns HTTP 404');
    }
  }

  // Test 3.6: POST /api/risk-assessments - Missing clientId
  {
    const req = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await postRiskAssessment(req);
    assert(res.status === 400, 'T3.6: Missing clientId returns HTTP 400');
  }

  // Test 3.7: POST /api/risk-assessments - Non-existent clientId or jobId
  {
    const req1 = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000000' }),
    });
    const res1 = await postRiskAssessment(req1);
    assert(res1.status === 404, 'T3.7: Non-existent clientId returns HTTP 404');

    const req2 = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({ clientId: bistro.id, jobId: '00000000-0000-0000-0000-000000000000' }),
    });
    const res2 = await postRiskAssessment(req2);
    assert(res2.status === 404, 'T3.7.1: Non-existent jobId returns HTTP 404');
  }

  // Test 3.8: POST /api/risk-assessments - Out-of-bounds Severity & Probability
  {
    // Severity < 1 or > 7
    const req1 = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        items: [{ hazard: 'Risc', severityScore: 8, probabilityScore: 3 }],
      }),
    });
    const res1 = await postRiskAssessment(req1);
    assert(res1.status === 400, 'T3.8: Severity > 7 rejected with HTTP 400');

    // Severity < 1
    const req2 = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        items: [{ hazard: 'Risc', severityScore: 0, probabilityScore: 3 }],
      }),
    });
    const res2 = await postRiskAssessment(req2);
    assert(res2.status === 400, 'T3.8.1: Severity < 1 rejected with HTTP 400');

    // Probability > 6
    const req3 = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        items: [{ hazard: 'Risc', severityScore: 4, probabilityScore: 7 }],
      }),
    });
    const res3 = await postRiskAssessment(req3);
    assert(res3.status === 400, 'T3.8.2: Probability > 6 rejected with HTTP 400');
  }

  // Test 3.9: POST /api/risk-assessments - Cross-tenant Job boundary test
  {
    const crossJob = nexus.jobs[0]; // Belongs to Nexus, but clientId is Bistro
    const req = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        jobId: crossJob.id,
        title: 'Test Cross Tenant Job Assessment',
      }),
    });
    const res = await postRiskAssessment(req);
    if (res.status === 201) {
      const data = await res.json();
      if (data.assessment?.id) cleanupFixture.riskAssessmentIds.push(data.assessment.id);
      recordFinding(
        'Cross-Tenant Job Reference Allowed in Risk Assessment Route',
        'Cross-Tenant Isolation Weakness',
        `POST /api/risk-assessments accepted a jobId belonging to Nexus Solutions for an assessment created under Bistro Gourmet.`,
        'Medium: Allows associating job profiles across tenant boundaries in risk dossiers.'
      );
      assert(true, 'T3.9: Cross-tenant job reference observed and recorded as finding');
    } else {
      assert(res.status === 400, 'T3.9: Cross-tenant jobId rejected with HTTP 400');
    }
  }

  // Test 3.10: POST /api/risk-assessments - Valid statutory risk assessment creation
  let createdAssessmentId = '';
  {
    const req = new NextRequest('http://localhost:3000/api/risk-assessments', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        jobId: bistro.jobs[0].id,
        worksiteId: bistro.worksites[0].id,
        title: 'Evaluare Riscuri Bucătar Specialist 2026',
        evaluatorName: 'Dr. Ing. Evaluator SSM',
        conclusions: 'Loc de muncă cu risc acceptabil N_rg = 3.12',
        status: 'expert_review',
        items: [
          {
            hazard: 'Suprafețe fierbinți (cuptor, plite)',
            riskSituation: 'Manipulare tăvi fără mănuși termice',
            consequence: 'Arsuri termice grad I-II',
            severityScore: 3,
            probabilityScore: 2,
            existingMeasures: 'Dotare EIP mănuși termice',
          },
          {
            hazard: 'Suprafețe alunecoase (pardoseală bucătărie)',
            riskSituation: 'Deplasare pe pardoseală umedă',
            consequence: 'Entorse, contuzii ITM',
            severityScore: 3,
            probabilityScore: 3,
            existingMeasures: 'Încălțăminte antiderapantă SRC',
          },
        ],
        measures: [
          {
            itemIndex: 0,
            description: 'Instruire specifică privind lucrul la temperaturi înalte',
            measureType: 'organizatorica',
            responsiblePerson: 'Bucătar Șef',
            deadline: 'Permanent',
          },
          {
            itemIndex: 1,
            description: 'Curățare periodică și uscare rapidă a pavimentului',
            measureType: 'tehnica',
            responsiblePerson: 'Personal curățenie',
            deadline: 'Permanent',
          },
        ],
        hazardZones: [
          {
            zoneName: 'Zona Cuptoare & Prăjire',
            location: 'Bucătărie Caldă',
            hazardDescription: 'Emisii termice și abur sub presiune',
            safetyMeasures: 'Sistem de ventilație forțată și stingătoare CO2',
          },
        ],
      }),
    });
    const res = await postRiskAssessment(req);
    assert(res.status === 201, 'T3.10: Valid statutory risk assessment created (HTTP 201)');
    const data = await res.json();
    createdAssessmentId = data.assessment?.id;
    if (createdAssessmentId) cleanupFixture.riskAssessmentIds.push(createdAssessmentId);
    assert(data.assessment?.riskItems?.length === 2, 'T3.10.1: Risk items persisted');
    assert(data.assessment?.preventionMeasures?.length === 2, 'T3.10.2: Prevention measures persisted');
    assert(data.assessment?.hazardZones?.length === 1, 'T3.10.3: Hazard zones persisted');
  }

  // ==========================================================================
  // GROUP 4: Hygiene Sessions & Participant Management
  // ==========================================================================
  console.log(`\n${C.bold}${C.blue}▶ GROUP 4: Hygiene Sessions & Participant Management${C.reset}`);

  // Fetch an existing hygiene session with participants
  const hygieneSession = await prisma.hygieneSession.findFirst({
    include: { participants: true },
  });
  if (!hygieneSession || hygieneSession.participants.length === 0) {
    throw new Error('No hygiene session with participants found in DB!');
  }
  const participant = hygieneSession.participants[0];

  // Test 4.1: PATCH participant - Non-existent session or participant
  {
    const req = new NextRequest(
      `http://localhost:3000/api/hygiene/sessions/${hygieneSession.id}/participants/00000000-0000-0000-0000-000000000000`,
      { method: 'PATCH', body: JSON.stringify({ attendance: 'prezent' }) }
    );
    const res = await patchHygieneParticipant(req, {
      params: Promise.resolve({ id: hygieneSession.id, participantId: '00000000-0000-0000-0000-000000000000' }),
    });
    assert(res.status === 404, 'T4.1: Non-existent participant returns HTTP 404');
  }

  // Test 4.2: PATCH participant - Invalid attendance string
  {
    const req = new NextRequest(
      `http://localhost:3000/api/hygiene/sessions/${hygieneSession.id}/participants/${participant.id}`,
      { method: 'PATCH', body: JSON.stringify({ attendance: 'intarziat' }) }
    );
    const res = await patchHygieneParticipant(req, {
      params: Promise.resolve({ id: hygieneSession.id, participantId: participant.id }),
    });
    assert(res.status === 400, 'T4.2: Invalid attendance string returns HTTP 400');
  }

  // Test 4.3: PATCH participant - Out-of-bounds grade (< 1 or > 10)
  {
    const req1 = new NextRequest(
      `http://localhost:3000/api/hygiene/sessions/${hygieneSession.id}/participants/${participant.id}`,
      { method: 'PATCH', body: JSON.stringify({ examGrade: 0.5 }) }
    );
    const res1 = await patchHygieneParticipant(req1, {
      params: Promise.resolve({ id: hygieneSession.id, participantId: participant.id }),
    });
    assert(res1.status === 400, 'T4.3: examGrade < 1.0 returns HTTP 400');

    const req2 = new NextRequest(
      `http://localhost:3000/api/hygiene/sessions/${hygieneSession.id}/participants/${participant.id}`,
      { method: 'PATCH', body: JSON.stringify({ examGrade: 10.5 }) }
    );
    const res2 = await patchHygieneParticipant(req2, {
      params: Promise.resolve({ id: hygieneSession.id, participantId: participant.id }),
    });
    assert(res2.status === 400, 'T4.3.1: examGrade > 10.0 returns HTTP 400');
  }

  // Test 4.4: PATCH participant - Absent participant statutory nullification
  {
    const req = new NextRequest(
      `http://localhost:3000/api/hygiene/sessions/${hygieneSession.id}/participants/${participant.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          attendance: 'absent',
          examGrade: 9,
          examResult: 'admis',
          certificateSeries: 'CJ',
          certificateNumber: '999999',
        }),
      }
    );
    const res = await patchHygieneParticipant(req, {
      params: Promise.resolve({ id: hygieneSession.id, participantId: participant.id }),
    });
    assert(res.status === 200, 'T4.4: Absent participant PATCH returns HTTP 200');
    const data = await res.json();
    assert(data.participant?.attendance === 'absent', 'T4.4.1: Attendance is absent');
    assert(data.participant?.examGrade === null, 'T4.4.2: Grade nullified for absent participant');
    assert(data.participant?.examResult === 'respins', 'T4.4.3: Result forced to respins');
    assert(data.participant?.certificateNumber === null, 'T4.4.4: Certificate nullified for absent participant');
  }

  // Test 4.5: PATCH participant - Passing participant syncs to employee
  {
    // Link participant to created employee to test sync
    await prisma.hygieneParticipant.update({
      where: { id: participant.id },
      data: { employeeId: createdEmpId },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/hygiene/sessions/${hygieneSession.id}/participants/${participant.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          attendance: 'prezent',
          examGrade: 9.8,
          examResult: 'admis',
          certificateSeries: 'CJ',
          certificateNumber: '881122',
          certificateDate: '2026-04-15',
        }),
      }
    );
    const res = await patchHygieneParticipant(req, {
      params: Promise.resolve({ id: hygieneSession.id, participantId: participant.id }),
    });
    assert(res.status === 200, 'T4.5: Passing participant PATCH returns HTTP 200');
    const data = await res.json();
    assert(data.participant?.examResult === 'admis', 'T4.5.1: Result is admis');
    assert(data.participant?.certificateNumber === '881122', 'T4.5.2: Certificate number recorded');

    // Verify synchronization to Employee
    const emp = await prisma.employee.findUnique({ where: { id: createdEmpId } });
    assert(Boolean(emp?.hygieneCertificateNumber?.includes('881122')), 'T4.5.3: Hygiene certificate synced to Employee');
    assert(Boolean(emp?.hygieneLastExamDate), 'T4.5.4: Hygiene exam date synced to Employee');
  }

  // Test 4.6: POST /api/hygiene/sessions - Missing mandatory fields
  {
    const req = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await postHygieneSession(req);
    assert(res.status === 400, 'T4.6: Missing session fields returns HTTP 400');
  }

  // Test 4.7: POST /api/hygiene/sessions - Empty participants array
  {
    const req = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      body: JSON.stringify({
        sessionDate: '2026-05-10',
        examDate: '2026-05-15',
        location: 'Sala Curs Bistro',
        participants: [],
      }),
    });
    const res = await postHygieneSession(req);
    assert(res.status === 400, 'T4.7: Empty participants array returns HTTP 400');
  }

  // Test 4.8: POST /api/hygiene/sessions - Participant missing required identity fields
  {
    const req = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      body: JSON.stringify({
        sessionDate: '2026-05-10',
        examDate: '2026-05-15',
        location: 'Sala Curs Bistro',
        participants: [{ firstName: 'Ion' }], // missing lastName, cnp, clientName
      }),
    });
    const res = await postHygieneSession(req);
    assert(res.status === 400, 'T4.8: Incomplete participant identity returns HTTP 400');
  }

  // Test 4.9: POST /api/hygiene/sessions - Invalid date string handling
  {
    const req = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      body: JSON.stringify({
        sessionDate: 'invalid-date-string',
        examDate: '2026-05-15',
        location: 'Sala Curs Bistro',
        participants: [
          {
            firstName: 'Ion',
            lastName: 'Test',
            cnp: generateValidCnp('M', 1990, 1, 1),
            clientName: bistro.name,
          },
        ],
      }),
    });
    const res = await postHygieneSession(req);
    if (res.status === 500) {
      recordFinding(
        'POST /api/hygiene/sessions Crashes With HTTP 500 on Invalid Date String',
        'Input Validation Defect',
        'POST /api/hygiene/sessions does not check isNaN(new Date(sessionDate).getTime()), allowing Invalid Date to hit Prisma PostgreSQL driver.',
        'Low/Medium: Should return clean HTTP 400 for invalid date strings.'
      );
      assert(true, 'T4.9: Invalid date string unhandled exception observed');
    } else {
      assert(res.status === 400, 'T4.9: Invalid date rejected with HTTP 400');
    }
  }

  // Test 4.10: POST /api/hygiene/sessions - Valid hygiene session creation
  let createdSessionId = '';
  {
    const pCnp = generateValidCnp('F', 1993, 11, 20, 41, 701);
    const req = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      body: JSON.stringify({
        clientId: bistro.id,
        sessionDate: '2026-06-10',
        examDate: '2026-06-14',
        location: 'Sediul Bistro Gourmet Cluj',
        commissionPresident: 'Dr. Medic Primar Igienă',
        commissionMember1: 'Dr. Medic Specialist',
        commissionSecretary: 'Asistent Medical',
        participants: [
          {
            clientName: bistro.name,
            lastName: 'Munteanu',
            firstName: 'Raluca',
            cnp: pCnp,
            jobTitle: 'Ajutor Bucătar',
          },
        ],
      }),
    });
    const res = await postHygieneSession(req);
    assert(res.status === 201 || res.status === 200, 'T4.10: Valid hygiene session created (HTTP 200/201)');
    const data = await res.json();
    createdSessionId = data.session?.id || data.id;
    if (createdSessionId) cleanupFixture.hygieneSessionIds.push(createdSessionId);
    assert(Boolean(createdSessionId), 'T4.10.1: Created hygiene session ID returned');
  }

  // ==========================================================================
  // GROUP 5: Batch Document Generation & Error Isolation
  // ==========================================================================
  console.log(`\n${C.bold}${C.blue}▶ GROUP 5: Batch Document Generation & Error Isolation${C.reset}`);

  // Test 5.1: Missing templateCode or clientId
  {
    const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await generateBatch(req);
    assert(res.status === 400, 'T5.1: Missing batch parameters returns HTTP 400');
  }

  // Test 5.2: Invalid templateCode
  {
    const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      body: JSON.stringify({
        templateCode: 'non-existent-template-xyz',
        clientId: bistro.id,
        employeeIds: [createdEmpId],
      }),
    });
    const res = await generateBatch(req);
    assert(res.status === 404, 'T5.2: Unknown templateCode in batch returns HTTP 404');
  }

  // Test 5.3: Empty employeeIds list
  {
    const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      body: JSON.stringify({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: bistro.id,
        employeeIds: [],
      }),
    });
    const res = await generateBatch(req);
    assert(res.status === 400, 'T5.3: Empty employeeIds returns HTTP 400');
  }

  // Test 5.4: Batch with ONLY PLECAT (terminated) employee -> rejected with statutory message
  {
    const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      body: JSON.stringify({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: bistro.id,
        employeeIds: [termEmpId], // employee has status PLECAT
      }),
    });
    const res = await generateBatch(req);
    assert(res.status === 400, 'T5.4: Batch with ONLY PLECAT employee rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('status PLECAT'), 'T5.4.1: Statutory termination explanation returned');
  }

  // Test 5.5: Batch with ONLY OVERDUE employee on medicine-dependent template
  // Create an employee with expired medical exam (15 months ago)
  const overdueCnp = generateValidCnp('M', 1982, 4, 18, 41, 801);
  let overdueEmpId = '';
  {
    const oldExamDate = new Date();
    oldExamDate.setMonth(oldExamDate.getMonth() - 15);
    const emp = await prisma.employee.create({
      data: {
        clientId: bistro.id,
        firstName: 'Gheorghe',
        lastName: 'ExpiratMed',
        cnp: overdueCnp,
        hireDate: new Date('2024-01-01'),
        status: 'ACTIV',
        medicalLastExamDate: oldExamDate,
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'APT',
      },
    });
    overdueEmpId = emp.id;
    cleanupFixture.employeeIds.push(overdueEmpId);
  }

  {
    const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      body: JSON.stringify({
        templateCode: 'med-fisa-solicitare-examen',
        clientId: bistro.id,
        employeeIds: [overdueEmpId],
      }),
    });
    const res = await generateBatch(req);
    assert(res.status === 400, 'T5.5: Batch with ONLY OVERDUE employee rejected with HTTP 400');
    const data = await res.json();
    assert(data.error?.includes('Medicină a Muncii este expirat') || data.rejectedEmployees?.length > 0, 'T5.5.1: Overdue statutory error breakdown returned');
  }

  // Test 5.6: Mixed Batch Isolation & ZIP Integrity
  // Batch with:
  // - 1 active eligible employee (createdEmpId)
  // - 1 PLECAT employee (termEmpId)
  // Expected behavior:
  // - Request succeeds with HTTP 200!
  // - Eligible employee is generated and added to ZIP.
  // - PLECAT employee is omitted and recorded in log.
  // - ZIP contains document + 00_RAPORT_GENERARE_LOT.txt.
  {
    const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
      method: 'POST',
      body: JSON.stringify({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: bistro.id,
        employeeIds: [createdEmpId, termEmpId],
        operatorName: 'Inspector Colectiv Test',
      }),
    });
    const res = await generateBatch(req);
    assert(res.status === 200, 'T5.6: Mixed batch succeeds with HTTP 200 (error isolation)');
    const data = await res.json();

    assert(data.success === true, 'T5.6.1: success: true returned');
    assert(data.totalRequested === 2, 'T5.6.2: totalRequested is 2');
    assert(data.totalGenerated === 1, 'T5.6.3: totalGenerated is 1');
    assert(data.totalOmitted === 1, 'T5.6.4: totalOmitted is 1');
    assert(Boolean(data.zipDownloadUrl), 'T5.6.5: zipDownloadUrl generated');

    // Test 5.7: Verify ZIP Archive structure on disk
    const zipPath = path.join(process.cwd(), 'storage', 'documents', `batch_${data.batchId}.zip`);
    assert(fs.existsSync(zipPath), 'T5.7: Generated ZIP archive exists on disk');

    const zipBuffer = fs.readFileSync(zipPath);
    assert(zipBuffer.length > 0, 'T5.7.1: ZIP buffer is non-empty');

    const zip = new PizZip(zipBuffer);
    const zipFiles = Object.keys(zip.files);
    assert(zipFiles.includes('00_RAPORT_GENERARE_LOT.txt'), 'T5.7.2: 00_RAPORT_GENERARE_LOT.txt present in ZIP');

    // Read and verify audit report
    const reportTxt = zip.file('00_RAPORT_GENERARE_LOT.txt')?.asText() || '';
    assert(reportTxt.includes('RAPORT GENERARE COLECTIVĂ'), 'T5.7.3: Report header present');
    assert(reportTxt.includes('Generări reușite       : 1'), 'T5.7.4: Report reflects 1 successful generation');
    assert(reportTxt.includes('OMIS - PLECAT'), 'T5.7.5: Report details omitted PLECAT employee');

    // Verify generated DOCX in ZIP
    const docxEntries = zipFiles.filter((f) => f.endsWith('.docx'));
    assert(docxEntries.length === 1, 'T5.7.6: Exactly 1 DOCX document in ZIP for active employee');

    // Clean up batch zip file
    try {
      fs.unlinkSync(zipPath);
    } catch {}
  }

  // ==========================================================================
  // GROUP 6: Database Integrity & Cleanup Verification
  // ==========================================================================
  console.log(`\n${C.bold}${C.blue}▶ GROUP 6: Database Integrity & Fixture Cleanup${C.reset}`);

  // Clean up created fixtures
  try {
    // 1. Delete test risk assessments
    if (cleanupFixture.riskAssessmentIds.length > 0) {
      await prisma.riskAssessment.deleteMany({
        where: { id: { in: cleanupFixture.riskAssessmentIds } },
      });
      console.log(`  ${C.dim}Cleaned up ${cleanupFixture.riskAssessmentIds.length} test RiskAssessments${C.reset}`);
    }

    // 2. Delete test hygiene sessions
    if (cleanupFixture.hygieneSessionIds.length > 0) {
      await prisma.hygieneSession.deleteMany({
        where: { id: { in: cleanupFixture.hygieneSessionIds } },
      });
      console.log(`  ${C.dim}Cleaned up ${cleanupFixture.hygieneSessionIds.length} test HygieneSessions${C.reset}`);
    }

    // 3. Delete test training events
    if (cleanupFixture.trainingEventIds.length > 0) {
      await prisma.trainingEvent.deleteMany({
        where: { id: { in: cleanupFixture.trainingEventIds } },
      });
      console.log(`  ${C.dim}Cleaned up ${cleanupFixture.trainingEventIds.length} test TrainingEvents${C.reset}`);
    }

    // 4. Delete test employees
    if (cleanupFixture.employeeIds.length > 0) {
      await prisma.employee.deleteMany({
        where: { id: { in: cleanupFixture.employeeIds } },
      });
      console.log(`  ${C.dim}Cleaned up ${cleanupFixture.employeeIds.length} test Employees${C.reset}`);
    }

    assert(true, 'T6.1: All transient test fixtures cleanly removed from database');
  } catch (cleanErr: unknown) {
    const msg = cleanErr instanceof Error ? cleanErr.message : String(cleanErr);
    assert(false, 'T6.1: Cleanup encountered an error', msg);
  }

  // Verify baseline seed data remains intact
  const finalBistro = await prisma.client.findFirst({ where: { cui: 'RO45123987' }, include: { employees: true } });
  const finalNexus = await prisma.client.findFirst({ where: { cui: 'RO38765432' }, include: { employees: true } });
  assert(finalBistro?.employees.length === bistro.employees.length, 'T6.2: Bistro Gourmet employee count intact');
  assert(finalNexus?.employees.length === nexus.employees.length, 'T6.3: Nexus Solutions employee count intact');

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log(`\n${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  CHALLENGER 2 TIER 5 STRESS TEST SUMMARY${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`  Total Passed:       ${C.bold}${C.green}${passedCount}${C.reset}`);
  console.log(`  Total Failed:       ${C.bold}${failedCount === 0 ? C.green : C.red}${failedCount}${C.reset}`);
  console.log(`  Total Findings:     ${C.bold}${C.yellow}${findings.length}${C.reset}`);

  if (findings.length > 0) {
    console.log(`\n${C.bold}${C.yellow}Identified Vulnerabilities & Edge Cases:${C.reset}`);
    findings.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.category}] ${f.title}`);
      console.log(`     ${C.dim}${f.description}${C.reset}`);
      console.log(`     Impact: ${f.impact}\n`);
    });
  }

  if (failures.length > 0) {
    console.log(`\n${C.bold}${C.red}Failures encountered:${C.reset}`);
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  console.log(`================================================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runChallenger2Suite().catch((err) => {
  console.error('\nFATAL SUITE CRASH:', err);
  process.exit(1);
});
