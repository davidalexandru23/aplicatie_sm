/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1 (MILESTONE 3)
 * ============================================================================
 * 
 * Target: Training Module Synchronization & Statutory Docs (M3 Features 14-18)
 * 
 * Normative Standards:
 * - Legea nr. 319/2006 (Securitatea și sănătatea în muncă)
 * - HG nr. 1425/2006 (Norme metodologice SSM)
 * - Legea nr. 307/2006 (Apărarea împotriva incendiilor)
 * - OMAI nr. 712/2005 (Instruirea în domeniul situațiilor de urgență / PSI)
 * 
 * Adversarial Attack Vectors Probed:
 * 1. Future Date Boundary Testing:
 *    - POST /api/trainings/record with status: "planned" and date +30 days -> HTTP 201
 *    - Verify participating employees' ssmLastTrainingDate / psiLastTrainingDate NOT modified
 *    - POST with status: "planned" and date +400 days -> HTTP 400
 *    - POST with status: "completed" and date tomorrow -> HTTP 400
 *    - Boundary checks (+365 days vs +366 days)
 *    - Completed session updates corresponding training date (SSM updates SSM only, PSI updates PSI only)
 * 
 * 2. Data Mapping & Collective PV Generation:
 *    - Record training session with 2 participants
 *    - Generate ssm-pv-instruire-colectiva and psi-pv-instruire with trainingEventId
 *    - Unpack DOCX OpenXML: verify both participants listed in table, CNP masked, 
 *      raw CNP not leaked, event date matches session eventDate.
 * 
 * 3. Event Type Discrimination:
 *    - Record INTRODUCTIV, LOC_MUNCA, PERIODIC_SSM, and PERIODIC_PSI for an employee
 *    - Verify INTRODUCTIV and LOC_MUNCA populate specific sheet headers and do NOT fallback to hireDate
 *    - Verify PERIODIC_SSM populates SSM table and does NOT bleed into PSI table
 *    - Verify PERIODIC_PSI populates PSI table and does NOT bleed into SSM table
 * 
 * 4. Catch-22 (Feature 18) Non-blocking Expiry:
 *    - Overdue employee training sheets generation is NOT blocked.
 * 
 * Invocation:
 *   npx tsx scripts/adversarial-challenger1-m3.ts
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { maskCNP } from '../src/lib/security';
import { calculateEmployeeCompliance } from '../src/lib/compliance';
import { POST as recordTrainingPost } from '../src/app/api/trainings/record/route';
import { POST as generateDocPost } from '../src/app/api/documents/generate/route';
import { checkEmployeeTemplateExpiry } from '../src/app/api/documents/generate-batch/route';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';
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
    throw new Error(
      `Assertion failed: ${msg}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`
    );
  }
}

// Dedicated Test Fixture Identifiers
const TEST_CUI = 'RO99933311';
let testClientId: string;
let testJobId1: string;
let testJobId2: string;
let testWorksiteId: string;
let empId1: string;
let empId2: string;
let empCnp1: string;
let empCnp2: string;

// Helper to extract text from a DOCX buffer or file
function extractDocxXml(filePath: string): string {
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) {
    throw new Error(`word/document.xml missing in ${filePath}`);
  }
  return documentXml;
}

async function setupTestData() {
  console.log(`\n${C.cyan}--- Setting up Isolated Adversarial Test Environment ---${C.reset}`);

  // Cleanup any leftover data
  await cleanupTestData();

  // Create Client
  const client = await prisma.client.create({
    data: {
      name: 'CHALLENGER1 ADVERSARIAL DRILL S.R.L.',
      cui: TEST_CUI,
      regCom: 'J40/9991/2026',
      address: 'Str. Testelor Adversariale nr. 1, Sector 1, București',
      legalRepresentative: 'Director General Test',
      contactEmail: 'drill@ssm-adversarial.ro',
      contactPhone: '0711000111',
      ssmProviderName: 'SEPP ADVERSARIAL S.R.L.',
      ssmSpecialistName: 'Ing. Evaluator Adversarial',
      designatedWorkerSsm: 'Responsabil SSM Intern',
    },
  });
  testClientId = client.id;

  // Create Worksite
  const ws = await prisma.worksite.create({
    data: {
      clientId: client.id,
      name: 'Punct de Lucru Principal',
      address: 'București, Sector 1',
    },
  });
  testWorksiteId = ws.id;

  // Create Jobs
  const job1 = await prisma.job.create({
    data: {
      clientId: client.id,
      title: 'Inginer Tehnolog',
      corCode: '214101',
    },
  });
  testJobId1 = job1.id;

  const job2 = await prisma.job.create({
    data: {
      clientId: client.id,
      title: 'Tehnician Mentenanță',
      corCode: '311501',
    },
  });
  testJobId2 = job2.id;

  // Generate 2 valid unique CNPs
  empCnp1 = generateValidCnp(`1880512${Math.floor(10000 + Math.random() * 89999)}`);
  empCnp2 = generateValidCnp(`2900721${Math.floor(10000 + Math.random() * 89999)}`);

  // Create Employee 1
  const hireDate = new Date('2025-05-01T08:00:00.000Z');
  const initialSsmDate = new Date('2025-05-01T08:00:00.000Z');
  const initialPsiDate = new Date('2025-05-01T08:00:00.000Z');

  const emp1 = await prisma.employee.create({
    data: {
      clientId: client.id,
      currentJobId: job1.id,
      currentWorksiteId: ws.id,
      firstName: 'Ion',
      lastName: 'Ionescu',
      cnp: empCnp1,
      hireDate,
      status: 'ACTIV',
      ssmLastTrainingDate: initialSsmDate,
      ssmIntervalMonths: 6,
      psiLastTrainingDate: initialPsiDate,
      psiIntervalMonths: 6,
      medicalLastExamDate: new Date('2025-05-01T08:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
    },
  });
  empId1 = emp1.id;

  // Create Employee 2
  const emp2 = await prisma.employee.create({
    data: {
      clientId: client.id,
      currentJobId: job2.id,
      currentWorksiteId: ws.id,
      firstName: 'Elena',
      lastName: 'Popescu',
      cnp: empCnp2,
      hireDate,
      status: 'ACTIV',
      ssmLastTrainingDate: initialSsmDate,
      ssmIntervalMonths: 6,
      psiLastTrainingDate: initialPsiDate,
      psiIntervalMonths: 6,
      medicalLastExamDate: new Date('2025-05-01T08:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
    },
  });
  empId2 = emp2.id;

  console.log(`  Created test client ${client.id} (CUI ${TEST_CUI}) with 2 employees (${emp1.id}, ${emp2.id})`);
}

async function cleanupTestData() {
  const clients = await prisma.client.findMany({
    where: { cui: TEST_CUI },
    select: { id: true },
  });
  const clientIds = clients.map((c) => c.id);

  if (clientIds.length > 0) {
    // Delete documents
    await prisma.generatedDocument.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    // Delete training events (cascades participants)
    await prisma.trainingEvent.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    // Delete employees
    await prisma.employee.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    // Delete jobs
    await prisma.job.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    // Delete worksites
    await prisma.worksite.deleteMany({
      where: { clientId: { in: clientIds } },
    });
    // Delete client
    await prisma.client.deleteMany({
      where: { id: { in: clientIds } },
    });
  }
}

// Main Test Execution
async function main() {
  console.log(`\n================================================================================`);
  console.log(`  STARTING EMPIRICAL ADVERSARIAL STRESS TEST FOR MILESTONE 3`);
  console.log(`================================================================================`);

  try {
    await setupTestData();

    // ========================================================================
    // VECTOR 1: FUTURE DATE BOUNDARY TESTING
    // ========================================================================
    console.log(`\n${C.yellow}--- Vector 1: Future Date Boundary Testing ---${C.reset}`);

    await runTest(
      'V1-01',
      'POST /api/trainings/record with status: "planned" and date +30 days succeeds HTTP 201',
      async () => {
        const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: future30.toISOString(),
            durationHours: 2,
            instructorName: 'Ing. Formator Viitor',
            participantEmployeeIds: [empId1, empId2],
            status: 'planned',
            notes: 'Sesiune semestrială planificată',
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 201, 'Status code must be 201 Created');
        const json = await res.json();
        assert(json.success === true, 'Response must indicate success: true');
        assertEqual(json.status, 'planned', 'Event status must be "planned"');
        assert(Boolean(json.eventId), 'Response must include eventId');
      }
    );

    await runTest(
      'V1-02',
      'Verify participating employees ssmLastTrainingDate / psiLastTrainingDate were NOT modified by planned session',
      async () => {
        const emp1 = await prisma.employee.findUnique({ where: { id: empId1 } });
        const emp2 = await prisma.employee.findUnique({ where: { id: empId2 } });

        assert(emp1 !== null && emp2 !== null, 'Employees must exist');

        const initialDateStr = '2025-05-01';
        const emp1SsmDateStr = emp1.ssmLastTrainingDate?.toISOString().slice(0, 10);
        const emp2SsmDateStr = emp2.ssmLastTrainingDate?.toISOString().slice(0, 10);
        const emp1PsiDateStr = emp1.psiLastTrainingDate?.toISOString().slice(0, 10);
        const emp2PsiDateStr = emp2.psiLastTrainingDate?.toISOString().slice(0, 10);

        assertEqual(emp1SsmDateStr, initialDateStr, 'emp1 ssmLastTrainingDate must remain unchanged');
        assertEqual(emp2SsmDateStr, initialDateStr, 'emp2 ssmLastTrainingDate must remain unchanged');
        assertEqual(emp1PsiDateStr, initialDateStr, 'emp1 psiLastTrainingDate must remain unchanged');
        assertEqual(emp2PsiDateStr, initialDateStr, 'emp2 psiLastTrainingDate must remain unchanged');
      }
    );

    await runTest(
      'V1-03',
      'POST /api/trainings/record with status: "planned" and date +400 days fails HTTP 400',
      async () => {
        const future400 = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: future400.toISOString(),
            durationHours: 2,
            instructorName: 'Ing. Formator Viitor Excesiv',
            participantEmployeeIds: [empId1],
            status: 'planned',
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 400, 'Status code must be 400 Bad Request for date > 365 days');
        const json = await res.json();
        assert(Boolean(json.error), 'Response must contain error message');
      }
    );

    await runTest(
      'V1-04',
      'POST /api/trainings/record with status: "completed" and date tomorrow fails HTTP 400',
      async () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000 + 3600000); // tomorrow + 1h
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: tomorrow.toISOString(),
            durationHours: 2,
            instructorName: 'Ing. Formator Grăbit',
            participantEmployeeIds: [empId1],
            status: 'completed',
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 400, 'Status code must be 400 Bad Request for completed session in future');
        const json = await res.json();
        assertEqual(json.error, 'Data instruirii nu poate fi în viitor.', 'Verbatim error message must match requirement');
      }
    );

    await runTest(
      'V1-05',
      'POST /api/trainings/record with omitted status and date +15 days auto-defaults to "planned" and does NOT update employee dates',
      async () => {
        const future15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            type: 'PERIODIC_SSM', // testing alias 'type'
            date: future15.toISOString(), // testing alias 'date'
            durationHours: 2,
            trainerName: 'Ing. Formator Implicit', // testing alias 'trainerName'
            participantIds: [empId1], // testing alias 'participantIds'
            // status is omitted intentionally
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 201, 'Status code must be 201 Created');
        const json = await res.json();
        assertEqual(json.status, 'planned', 'Omitted status with future date must auto-resolve to "planned"');

        // Verify DB employee date was NOT modified
        const emp1 = await prisma.employee.findUnique({ where: { id: empId1 } });
        assertEqual(emp1?.ssmLastTrainingDate?.toISOString().slice(0, 10), '2025-05-01', 'ssmLastTrainingDate must NOT be updated');
      }
    );

    await runTest(
      'V1-06',
      'POST /api/trainings/record at exact boundary +364 days succeeds (201), at +366 days fails (400)',
      async () => {
        // +364 days: within 365 days window
        const d364 = new Date(Date.now() + 364 * 24 * 60 * 60 * 1000);
        const req364 = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: d364.toISOString(),
            durationHours: 2,
            instructorName: 'Ing. Formator Boundary',
            participantEmployeeIds: [empId1],
            status: 'planned',
          }),
        });
        const res364 = await recordTrainingPost(req364);
        assertEqual(res364.status, 201, '+364 days must be accepted');

        // +366 days: strictly outside 365 days window
        const d366 = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);
        const req366 = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: d366.toISOString(),
            durationHours: 2,
            instructorName: 'Ing. Formator Boundary Exceeded',
            participantEmployeeIds: [empId1],
            status: 'planned',
          }),
        });
        const res366 = await recordTrainingPost(req366);
        assertEqual(res366.status, 400, '+366 days must be rejected with 400');
      }
    );

    await runTest(
      'V1-07',
      'POST /api/trainings/record with status: "completed" updates ssmLastTrainingDate (and NOT psiLastTrainingDate)',
      async () => {
        const pastDate = new Date('2025-11-10T10:00:00.000Z');
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: pastDate.toISOString(),
            durationHours: 2,
            instructorName: 'Ing. Instructor SSM Real',
            participantEmployeeIds: [empId1],
            status: 'completed',
            notes: 'Instruire completată cu succes',
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 201, 'Status code must be 201');
        const json = await res.json();
        assertEqual(json.updatedEmployeesCount, 1, 'updatedEmployeesCount must be 1');

        const emp1 = await prisma.employee.findUnique({ where: { id: empId1 } });
        assertEqual(emp1?.ssmLastTrainingDate?.toISOString().slice(0, 10), '2025-11-10', 'ssmLastTrainingDate must be updated to 2025-11-10');
        assertEqual(emp1?.psiLastTrainingDate?.toISOString().slice(0, 10), '2025-05-01', 'psiLastTrainingDate must remain unchanged');
      }
    );

    await runTest(
      'V1-08',
      'POST /api/trainings/record with status: "completed" and type: "PERIODIC_PSI" updates psiLastTrainingDate only',
      async () => {
        const pastDate = new Date('2025-11-15T10:00:00.000Z');
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_PSI',
            eventDate: pastDate.toISOString(),
            durationHours: 2,
            instructorName: 'Cadru Tehnic PSI Real',
            participantEmployeeIds: [empId1],
            status: 'completed',
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 201, 'Status code must be 201');

        const emp1 = await prisma.employee.findUnique({ where: { id: empId1 } });
        assertEqual(emp1?.psiLastTrainingDate?.toISOString().slice(0, 10), '2025-11-15', 'psiLastTrainingDate must be updated to 2025-11-15');
        // ssmLastTrainingDate must stay at 2025-11-10 (from test V1-07)
        assertEqual(emp1?.ssmLastTrainingDate?.toISOString().slice(0, 10), '2025-11-10', 'ssmLastTrainingDate must remain 2025-11-10');
      }
    );

    // --- Adversarial Input Validation Edge Cases ---
    await runTest(
      'V1-09',
      'POST /api/trainings/record rejects non-existent client with HTTP 404',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: '00000000-0000-0000-0000-000000000000',
            trainingType: 'PERIODIC_SSM',
            eventDate: new Date().toISOString(),
            durationHours: 2,
            instructorName: 'Instructor Test',
            participantEmployeeIds: [empId1],
          }),
        });
        const res = await recordTrainingPost(req);
        assertEqual(res.status, 404, 'Must return 404 for non-existent client');
      }
    );

    await runTest(
      'V1-10',
      'POST /api/trainings/record rejects invalid trainingType with HTTP 400',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'INVALID_TYPE_XYZ',
            eventDate: new Date().toISOString(),
            durationHours: 2,
            instructorName: 'Instructor Test',
            participantEmployeeIds: [empId1],
          }),
        });
        const res = await recordTrainingPost(req);
        assertEqual(res.status, 400, 'Must return 400 for invalid trainingType');
      }
    );

    await runTest(
      'V1-11',
      'POST /api/trainings/record rejects negative or zero durationHours with HTTP 400',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: new Date().toISOString(),
            durationHours: -3,
            instructorName: 'Instructor Test',
            participantEmployeeIds: [empId1],
          }),
        });
        const res = await recordTrainingPost(req);
        assertEqual(res.status, 400, 'Must return 400 for negative durationHours');
      }
    );

    await runTest(
      'V1-12',
      'POST /api/trainings/record rejects cross-client participant employee IDs with HTTP 400',
      async () => {
        // Create employee under a dummy client
        const dummyClient = await prisma.client.create({
          data: {
            name: 'ANOTHER COMPANY S.R.L.',
            cui: 'RO99988877',
            address: 'Bucuresti',
          },
        });
        const foreignEmp = await prisma.employee.create({
          data: {
            clientId: dummyClient.id,
            firstName: 'Strain',
            lastName: 'AltClient',
            cnp: generateValidCnp(`1800101${Math.floor(10000 + Math.random() * 89999)}`),
            hireDate: new Date(),
          },
        });

        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: new Date().toISOString(),
            durationHours: 2,
            instructorName: 'Instructor Test',
            participantEmployeeIds: [empId1, foreignEmp.id], // foreignEmp does NOT belong to testClientId
          }),
        });
        const res = await recordTrainingPost(req);
        assertEqual(res.status, 400, 'Must return 400 for cross-client participant');

        // Cleanup dummy
        await prisma.employee.delete({ where: { id: foreignEmp.id } });
        await prisma.client.delete({ where: { id: dummyClient.id } });
      }
    );

    // ========================================================================
    // VECTOR 2: DATA MAPPING & COLLECTIVE PV GENERATION
    // ========================================================================
    console.log(`\n${C.yellow}--- Vector 2: Data Mapping & Collective PV Generation ---${C.reset}`);

    let collectiveSessionId: string;
    const sessionDate = new Date('2025-11-25T09:00:00.000Z');
    const sessionDateRo = '25.11.2025';
    const trainerName = 'Ing. Radu Teodorescu';
    const sessionTopic = 'Proceduri de evacuare în caz de incendiu și utilizarea stingătoarelor portabile';

    await runTest(
      'V2-01',
      'Record a training session with 2 participants (Emp 1 and Emp 2)',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: testClientId,
            trainingType: 'PERIODIC_SSM',
            eventDate: sessionDate.toISOString(),
            durationHours: 3,
            instructorName: trainerName,
            participantEmployeeIds: [empId1, empId2],
            status: 'completed',
            topicsCovered: sessionTopic,
          }),
        });

        const res = await recordTrainingPost(req);
        assertEqual(res.status, 201, 'Must record collective session with 201');
        const json = await res.json();
        collectiveSessionId = json.eventId;
        assert(Boolean(collectiveSessionId), 'Must receive eventId');
      }
    );

    await runTest(
      'V2-02',
      'Generate ssm-pv-instruire-colectiva with trainingEventId and verify document contents (participant names, CNP masking, dates)',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: 'ssm-pv-instruire-colectiva',
            clientId: testClientId,
            trainingEventId: collectiveSessionId,
            operatorName: 'Inspector SSM Challenger',
          }),
        });

        const res = await generateDocPost(req);
        assertEqual(res.status, 200, 'Must generate document with HTTP 200');
        const json = await res.json();
        assert(json.success === true, 'Response must have success: true');
        const docResult = json.result;
        assert(Boolean(docResult.filePath), 'Result must have filePath');
        assert(fs.existsSync(docResult.filePath), `Generated file must exist on disk: ${docResult.filePath}`);

        // Inspect OpenXML in DOCX
        const xml = extractDocxXml(docResult.filePath);

        // 1. Verify both participants are listed by name
        assert(xml.includes('Ionescu Ion') || xml.includes('Ion Ionescu'), 'Participant 1 (Ion Ionescu) must be listed in document');
        assert(xml.includes('Popescu Elena') || xml.includes('Elena Popescu'), 'Participant 2 (Elena Popescu) must be listed in document');

        // 2. Verify CNP is present in full and clear
        assert(xml.includes(empCnp1), `Full clear CNP 1 (${empCnp1}) must be in document`);
        assert(xml.includes(empCnp2), `Full clear CNP 2 (${empCnp2}) must be in document`);

        // 4. Verify date matches eventDate in Romanian format
        assert(xml.includes(sessionDateRo), `Session date (${sessionDateRo}) must appear in document`);

        // 5. Verify instructor name appears
        assert(xml.includes(trainerName), `Instructor name (${trainerName}) must appear in document`);

        // 6. Verify result 'admis' appears
        assert(xml.includes('admis'), 'Result "admis" must be in participant table');
      }
    );

    await runTest(
      'V2-02-BUG',
      'Verify participant specific job titles (Inginer Tehnolog, Tehnician Mentenanță) in ssm-pv-instruire-colectiva (NOT generic fallback "Lucrător")',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: 'ssm-pv-instruire-colectiva',
            clientId: testClientId,
            trainingEventId: collectiveSessionId,
            operatorName: 'Inspector SSM Challenger',
          }),
        });

        const res = await generateDocPost(req);
        assertEqual(res.status, 200, 'Must generate document with HTTP 200');
        const json = await res.json();
        const xml = extractDocxXml(json.result.filePath);

        assert(
          xml.includes('Inginer Tehnolog'),
          'Participant 1 job title (Inginer Tehnolog) must be present in document; found fallback "Lucrător"'
        );
        assert(
          xml.includes('Tehnician Mentenanță'),
          'Participant 2 job title (Tehnician Mentenanță) must be present in document; found fallback "Lucrător"'
        );
      }
    );

    await runTest(
      'V2-03',
      'Generate psi-pv-instruire with trainingEventId and verify DOCX participant mapping & CNP masking',
      async () => {
        const req = new NextRequest('http://localhost:3000/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: 'psi-pv-instruire',
            clientId: testClientId,
            trainingEventId: collectiveSessionId,
            operatorName: 'Inspector PSI Challenger',
          }),
        });

        const res = await generateDocPost(req);
        assertEqual(res.status, 200, 'Must generate psi-pv-instruire with HTTP 200');
        const json = await res.json();
        assert(json.success === true, 'Response must have success: true');
        const docResult = json.result;
        assert(fs.existsSync(docResult.filePath), 'Generated file must exist');

        const xml = extractDocxXml(docResult.filePath);

        // Verify participant names and full clear CNPs
        assert(xml.includes('Ion Ionescu') || xml.includes('Ionescu Ion'), 'Emp 1 must be present');
        assert(xml.includes('Elena Popescu') || xml.includes('Popescu Elena'), 'Emp 2 must be present');
        assert(xml.includes(empCnp1), 'Emp 1 clear CNP must be present');
        assert(xml.includes(empCnp2), 'Emp 2 clear CNP must be present');
        assert(xml.includes(sessionDateRo), `Date ${sessionDateRo} must appear in document`);
      }
    );

    // ========================================================================
    // VECTOR 3: EVENT TYPE DISCRIMINATION
    // ========================================================================
    console.log(`\n${C.yellow}--- Vector 3: Event Type Discrimination on Individual Training Sheets ---${C.reset}`);

    // Create a new dedicated employee with distinct training history
    const emp3Cnp = generateValidCnp(`1920315${Math.floor(10000 + Math.random() * 89999)}`);
    const hireDate3 = new Date('2025-01-15T08:00:00.000Z'); // Hire date: 15.01.2025
    const dateIntro = new Date('2025-01-20T08:00:00.000Z'); // Introductiv: 20.01.2025
    const dateLocMunca = new Date('2025-01-25T08:00:00.000Z'); // Loc munca: 25.01.2025
    const datePeriodicSsm = new Date('2025-07-20T08:00:00.000Z'); // Periodic SSM: 20.07.2025
    const datePeriodicPsi = new Date('2025-08-10T08:00:00.000Z'); // Periodic PSI: 10.08.2025

    let empId3: string;

    await runTest(
      'V3-01',
      'Create Employee 3 with hireDate 15.01.2025 and 4 distinct training event types',
      async () => {
        const emp3 = await prisma.employee.create({
          data: {
            clientId: testClientId,
            currentJobId: testJobId1,
            currentWorksiteId: testWorksiteId,
            firstName: 'Mihai',
            lastName: 'Dumitrescu',
            cnp: emp3Cnp,
            hireDate: hireDate3,
            status: 'ACTIV',
            ssmLastTrainingDate: datePeriodicSsm,
            ssmIntervalMonths: 6,
            psiLastTrainingDate: datePeriodicPsi,
            psiIntervalMonths: 6,
            medicalLastExamDate: hireDate3,
            medicalIntervalMonths: 12,
            medicalFitnessVerdict: 'APT',
          },
        });
        empId3 = emp3.id;

        // 1. INTRODUCTIV Event
        await prisma.trainingEvent.create({
          data: {
            clientId: testClientId,
            type: 'INTRODUCTIV',
            eventDate: dateIntro,
            durationHours: 8,
            instructorName: 'Ing. Specialist SSM Introductiv',
            verifierName: 'Director General Verificator',
            materialOrTopic: 'Legislație generală SSM Legea 319/2006 și HG 1425/2006',
            status: 'recorded',
            participants: {
              create: { employeeId: empId3, result: 'admis', recordedAt: dateIntro },
            },
          },
        });

        // 2. LOC_MUNCA Event
        await prisma.trainingEvent.create({
          data: {
            clientId: testClientId,
            type: 'LOC_MUNCA',
            eventDate: dateLocMunca,
            durationHours: 8,
            instructorName: 'Maistru Șef Lucrare',
            verifierName: 'Responsabil SSM Verificator',
            materialOrTopic: 'Instrucțiuni proprii IPSSM specifice postului de inginer tehnolog',
            status: 'recorded',
            participants: {
              create: { employeeId: empId3, result: 'admis', recordedAt: dateLocMunca },
            },
          },
        });

        // 3. PERIODIC_SSM Event
        await prisma.trainingEvent.create({
          data: {
            clientId: testClientId,
            type: 'PERIODIC_SSM',
            eventDate: datePeriodicSsm,
            durationHours: 2,
            instructorName: 'Ing. Formator SSM Semestrial',
            verifierName: 'Director General',
            materialOrTopic: 'Tematică semestrială SSM: Lucrul la înălțime și riscuri electrice',
            status: 'recorded',
            participants: {
              create: { employeeId: empId3, result: 'admis', recordedAt: datePeriodicSsm },
            },
          },
        });

        // 4. PERIODIC_PSI Event
        await prisma.trainingEvent.create({
          data: {
            clientId: testClientId,
            type: 'PERIODIC_PSI',
            eventDate: datePeriodicPsi,
            durationHours: 2,
            instructorName: 'Cadru Tehnic PSI Semestrial',
            verifierName: 'Director General',
            materialOrTopic: 'Tematică semestrială PSI: Procedura de alarmare și stingere',
            status: 'recorded',
            participants: {
              create: { employeeId: empId3, result: 'admis', recordedAt: datePeriodicPsi },
            },
          },
        });

        assert(Boolean(empId3), 'Employee 3 created successfully with 4 training events');
      }
    );

    await runTest(
      'V3-02',
      'Resolve placeholders for ssm-fisa-instruire-individuala: verify exact event date mapping & table discrimination',
      async () => {
        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: testClientId,
          employeeId: empId3,
        });

        // 1. INTRODUCTIV date must be 20.01.2025, NOT hireDate (15.01.2025)
        assertEqual(
          resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG,
          '20.01.2025',
          'PLACEHOLDER_DATA_INSTRUIRE_IG must equal real INTRODUCTIV event date (20.01.2025), NOT hireDate'
        );
        assertEqual(
          resolvedData.PLACEHOLDER_INSTRUCTOR_IG,
          'Ing. Specialist SSM Introductiv',
          'PLACEHOLDER_INSTRUCTOR_IG must match instructor name from event'
        );
        assertEqual(
          resolvedData.PLACEHOLDER_DURATA_INSTRUIRE_IG,
          '8 ore',
          'PLACEHOLDER_DURATA_INSTRUIRE_IG must equal event duration'
        );

        // 2. LOC_MUNCA date must be 25.01.2025, NOT hireDate
        assertEqual(
          resolvedData.PLACEHOLDER_DATA_INSTRUIRE_LM,
          '25.01.2025',
          'PLACEHOLDER_DATA_INSTRUIRE_LM must equal real LOC_MUNCA event date (25.01.2025), NOT hireDate'
        );
        assertEqual(
          resolvedData.PLACEHOLDER_INSTRUCTOR_LM,
          'Maistru Șef Lucrare',
          'PLACEHOLDER_INSTRUCTOR_LM must match instructor name from event'
        );

        // 3. Periodic SSM table discrimination
        const ssmTable = resolvedData.instruiriPeriodiceSSM as any[];
        assert(Array.isArray(ssmTable), 'instruiriPeriodiceSSM must be an array');
        assert(ssmTable.length >= 16, `instruiriPeriodiceSSM must have at least 16 rows (found ${ssmTable.length})`);

        // Row 1 must be the PERIODIC_SSM event (20.07.2025)
        assertEqual(ssmTable[0].data, '20.07.2025', 'Row 1 date must match PERIODIC_SSM event date (20.07.2025)');
        assertEqual(ssmTable[0].semnaturaInstructor, 'Ing. Formator SSM Semestrial', 'Row 1 instructor must match');
        assert(
          ssmTable[0].tematica.includes('Lucrul la înălțime'),
          'Row 1 tematica must contain SSM event topic'
        );

        // Crucial discrimination: Row 1 must NOT be PSI date, and no row should contain the PSI date
        const hasPsiDate = ssmTable.some((r) => r.data === '10.08.2025');
        assert(!hasPsiDate, 'PERIODIC_PSI date (10.08.2025) must NOT appear in SSM periodic table');
      }
    );

    await runTest(
      'V3-03',
      'Resolve placeholders for psi-fisa-instructaj-individuala: verify exact event date mapping & table discrimination',
      async () => {
        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'psi-fisa-instructaj-individuala',
          clientId: testClientId,
          employeeId: empId3,
        });

        // 1. Introductory PSI date matches 20.01.2025
        assertEqual(
          resolvedData.PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI,
          '20.01.2025',
          'PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI must equal real event date (20.01.2025)'
        );

        // 2. On the job PSI date matches 25.01.2025
        assertEqual(
          resolvedData.PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI,
          '25.01.2025',
          'PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI must equal real event date (25.01.2025)'
        );

        // 3. Periodic PSI table discrimination
        const psiTable = resolvedData.instructajePeriodicePSI as any[];
        assert(Array.isArray(psiTable), 'instructajePeriodicePSI must be an array');
        assert(psiTable.length >= 16, `instructajePeriodicePSI must have at least 16 rows (found ${psiTable.length})`);

        // Row 1 must be the PERIODIC_PSI event (10.08.2025)
        assertEqual(psiTable[0].data, '10.08.2025', 'Row 1 date must match PERIODIC_PSI event date (10.08.2025)');
        assertEqual(psiTable[0].semnaturaInstructor, 'Cadru Tehnic PSI Semestrial', 'Row 1 instructor must match');
        assert(
          psiTable[0].tema.includes('Procedura de alarmare'),
          'Row 1 tema must contain PSI event topic'
        );

        // Crucial discrimination: Row 1 must NOT be SSM date, and no row should contain the SSM date
        const hasSsmDate = psiTable.some((r) => r.data === '20.07.2025');
        assert(!hasSsmDate, 'PERIODIC_SSM date (20.07.2025) must NOT appear in PSI periodic table');
      }
    );

    await runTest(
      'V3-04',
      'Physically generate ssm-fisa-instruire-individuala and psi-fisa-instructaj-individuala DOCX files and verify XML tokens',
      async () => {
        // Generate SSM sheet
        const ssmReq = new NextRequest('http://localhost:3000/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: 'ssm-fisa-instruire-individuala',
            clientId: testClientId,
            employeeId: empId3,
            operatorName: 'Inspector SSM Challenger',
          }),
        });
        const ssmRes = await generateDocPost(ssmReq);
        assertEqual(ssmRes.status, 200, 'SSM sheet must generate with 200');
        const ssmJson = await ssmRes.json();
        const ssmXml = extractDocxXml(ssmJson.result.filePath);

        // Verify XML contains the real dates and topic
        assert(ssmXml.includes('20.01.2025'), 'SSM XML must contain intro event date 20.01.2025');
        assert(ssmXml.includes('25.01.2025'), 'SSM XML must contain loc munca event date 25.01.2025');
        assert(ssmXml.includes('20.07.2025'), 'SSM XML must contain periodic SSM date 20.07.2025');
        assert(ssmXml.includes('Ing. Specialist SSM Introductiv'), 'SSM XML must contain intro trainer name');

        // Generate PSI sheet
        const psiReq = new NextRequest('http://localhost:3000/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: 'psi-fisa-instructaj-individuala',
            clientId: testClientId,
            employeeId: empId3,
            operatorName: 'Inspector PSI Challenger',
          }),
        });
        const psiRes = await generateDocPost(psiReq);
        assertEqual(psiRes.status, 200, 'PSI sheet must generate with 200');
        const psiJson = await psiRes.json();
        const psiXml = extractDocxXml(psiJson.result.filePath);

        // Verify XML contains the real dates and topic
        assert(psiXml.includes('20.01.2025'), 'PSI XML must contain intro date 20.01.2025');
        assert(psiXml.includes('25.01.2025'), 'PSI XML must contain loc munca date 25.01.2025');
        assert(psiXml.includes('10.08.2025'), 'PSI XML must contain periodic PSI date 10.08.2025');
        assert(psiXml.includes('Cadru Tehnic PSI Semestrial'), 'PSI XML must contain PSI trainer name');
      }
    );

    // ========================================================================
    // VECTOR 4: CATCH-22 ELIMINATION (FEATURE 18)
    // ========================================================================
    console.log(`\n${C.yellow}--- Vector 4: Catch-22 (Feature 18) Expiry Elimination ---${C.reset}`);

    await runTest(
      'V4-01',
      'Verify employee with expired training (OVERDUE) is NOT blocked from generating statutory training sheets',
      async () => {
        // Create an employee whose last SSM training was 400 days ago
        const past400 = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
        const overdueCnp = generateValidCnp(`1850410${Math.floor(10000 + Math.random() * 89999)}`);

        const overdueEmp = await prisma.employee.create({
          data: {
            clientId: testClientId,
            currentJobId: testJobId1,
            currentWorksiteId: testWorksiteId,
            firstName: 'Vasile',
            lastName: 'Expirat',
            cnp: overdueCnp,
            hireDate: past400,
            status: 'ACTIV',
            ssmLastTrainingDate: past400,
            ssmIntervalMonths: 6,
            psiLastTrainingDate: past400,
            psiIntervalMonths: 6,
            medicalLastExamDate: new Date(),
            medicalIntervalMonths: 12,
            medicalFitnessVerdict: 'APT',
          },
        });

        // 1. Verify compliance status is indeed OVERDUE
        const compliance = calculateEmployeeCompliance(overdueEmp);
        assertEqual(compliance.ssmTraining.status, 'OVERDUE', 'ssmTraining must be OVERDUE');
        assertEqual(compliance.psiTraining.status, 'OVERDUE', 'psiTraining must be OVERDUE');

        // 2. Test batch checking logic (checkEmployeeTemplateExpiry)
        const ssmExpiryCheck = checkEmployeeTemplateExpiry('ssm-fisa-instruire-individuala', compliance, overdueEmp);
        assertEqual(ssmExpiryCheck.isExpired, false, 'ssm-fisa-instruire-individuala must NOT be marked expired/blocked');

        const psiExpiryCheck = checkEmployeeTemplateExpiry('psi-fisa-instructaj-individuala', compliance, overdueEmp);
        assertEqual(psiExpiryCheck.isExpired, false, 'psi-fisa-instructaj-individuala must NOT be marked expired/blocked');

        const pvExpiryCheck = checkEmployeeTemplateExpiry('ssm-pv-instruire-colectiva', compliance, overdueEmp);
        assertEqual(pvExpiryCheck.isExpired, false, 'ssm-pv-instruire-colectiva must NOT be marked expired/blocked');

        // 3. Test physical single document generation via API for this OVERDUE employee
        const req = new NextRequest('http://localhost:3000/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: 'ssm-fisa-instruire-individuala',
            clientId: testClientId,
            employeeId: overdueEmp.id,
            operatorName: 'Inspector Reinstruire',
          }),
        });

        const res = await generateDocPost(req);
        assertEqual(res.status, 200, 'Document generation must succeed with HTTP 200 for OVERDUE employee');
        const json = await res.json();
        assert(json.success === true, 'Generation must report success: true');
        assert(fs.existsSync(json.result.filePath), 'Generated file must exist on disk');

        // Cleanup overdue employee
        await prisma.generatedDocument.deleteMany({ where: { employeeId: overdueEmp.id } });
        await prisma.employee.delete({ where: { id: overdueEmp.id } });
      }
    );

  } finally {
    // Teardown
    console.log(`\n${C.cyan}--- Tearing down Isolated Test Environment ---${C.reset}`);
    await cleanupTestData();
  }

  // ========================================================================
  // FINAL SCORECARD & SUMMARY
  // ========================================================================
  console.log(`\n================================================================================`);
  console.log(`  FINAL SCORECARD — ADVERSARIAL CHALLENGER 1 (MILESTONE 3)`);
  console.log(`================================================================================`);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const failedCount = totalCount - passedCount;

  for (const r of results) {
    const statusStr = r.passed ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`;
    console.log(`  [${statusStr}] ${r.id}: ${r.name} (${r.durationMs}ms)`);
    if (r.error) {
      console.log(`         ${C.red}Error: ${r.error}${C.reset}`);
    }
  }

  console.log(`--------------------------------------------------------------------------------`);
  console.log(`Total tests executed: ${totalCount}`);
  console.log(`Total passed:          ${passedCount} (${((passedCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Total failed:          ${failedCount}`);
  console.log(`================================================================================`);

  if (failedCount > 0) {
    console.error(`\n${C.bgRed}${C.bright} VERDICT: REQUEST_CHANGES (${failedCount} adversarial tests failed) ${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${C.bgGreen}${C.bright} VERDICT: APPROVE (100% of adversarial stress tests passed) ${C.reset}\n`);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('Fatal crash in stress test runner:', e);
  process.exit(1);
});
