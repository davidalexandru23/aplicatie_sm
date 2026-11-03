/**
 * scripts/verify-m2-challenger2.ts
 *
 * Independent Empirical Adversarial Challenger Test Harness for M2:
 * Training Scheduler and Compliance Scadențe Reset
 *
 * Tests:
 * 1. Expired Employee SSM Training Recording & Compliance Recalculation
 * 2. Expired Employee PSI Training Recording & Compliance Recalculation
 * 3. Adversarial Edge Case: Non-existent employee ID rollback & orphan check
 * 4. Adversarial Edge Case: Cross-client employee ID rejection & orphan check
 * 5. Adversarial Edge Case: Empty participant list validation
 * 6. Adversarial Edge Case: Future date recording validation
 * 7. Adversarial Edge Case: Invalid inputs (negative duration, invalid type, missing fields)
 * 8. Concurrency Test: Simultaneous training recordings across multiple employees
 * 9. Concurrency Test: Race condition test on same employee
 *
 * Author: m2_r2_challenger_2 (Teamwork Challenger)
 */

import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { POST } from '../src/app/api/trainings/record/route';
import { 
  calculateItemCompliance, 
  calculateEmployeeCompliance,
  addMonthsSafe 
} from '../src/lib/compliance';

interface AssertionLog {
  suite: string;
  testName: string;
  assertionsPassed: number;
  durationMs: number;
  passed: boolean;
  error?: string;
  findingNote?: string;
}

const executionLogs: AssertionLog[] = [];
let globalAssertionCount = 0;

function trackAssert(condition: boolean, message?: string) {
  globalAssertionCount++;
  assert.ok(condition, message);
}

function trackAssertEqual<T>(actual: T, expected: T, message?: string) {
  globalAssertionCount++;
  assert.equal(actual, expected, message);
}

async function runLoggedTest(
  suite: string,
  testName: string,
  fn: () => Promise<string | void>
): Promise<boolean> {
  const t0 = Date.now();
  const startAssertions = globalAssertionCount;
  try {
    const findingNote = (await fn()) || undefined;
    const durationMs = Date.now() - t0;
    const assertionsPassed = globalAssertionCount - startAssertions;
    executionLogs.push({
      suite,
      testName,
      assertionsPassed,
      durationMs,
      passed: true,
      findingNote,
    });
    console.log(`  ✓ [PASS] ${testName} (${assertionsPassed} assertions, ${durationMs}ms)`);
    if (findingNote) {
      console.log(`    ⚠ FINDING: ${findingNote}`);
    }
    return true;
  } catch (err: unknown) {
    const durationMs = Date.now() - t0;
    const assertionsPassed = globalAssertionCount - startAssertions;
    const errorMsg = err instanceof Error ? err.message : String(err);
    executionLogs.push({
      suite,
      testName,
      assertionsPassed,
      durationMs,
      passed: false,
      error: errorMsg,
    });
    console.error(`  ✗ [FAIL] ${testName} (${assertionsPassed} passed before failure, ${durationMs}ms): ${errorMsg}`);
    return false;
  }
}

export async function runChallenger2Suite() {
  console.log('================================================================');
  console.log('  CHALLENGER 2: ADVERSARIAL STRESS TEST - TRAINING SCHEDULER   ');
  console.log('================================================================\n');

  const suiteStart = Date.now();
  const testCuiA = 'RO88112233';
  const testCuiB = 'RO88445566';
  let clientAId = '';
  let clientBId = '';

  const employeeIdsA: string[] = [];
  const employeeIdsB: string[] = [];

  try {
    // 0. Clean any stale records
    await prisma.client.deleteMany({ where: { cui: { in: [testCuiA, testCuiB] } } });

    // Setup Test Client A (IT company, CAEN 6201)
    const clientA = await prisma.client.create({
      data: {
        name: 'TEST CHALLENGER CLIENT A S.R.L.',
        cui: testCuiA,
        address: 'București, Str. Test 1',
        caenCode: '6201',
        caenActivity: 'Activități de realizare a software-ului la comandă',
        ssmProviderName: 'EXPERT SSM TEST S.R.L.',
        ssmSpecialistName: 'Ing. Andrei Popescu',
      },
    });
    clientAId = clientA.id;

    // Setup Test Client B (Construction company, CAEN 4120)
    const clientB = await prisma.client.create({
      data: {
        name: 'TEST CHALLENGER CLIENT B S.R.L.',
        cui: testCuiB,
        address: 'Cluj-Napoca, Str. Test 2',
        caenCode: '4120',
        caenActivity: 'Lucrări de construcție a clădirilor',
        ssmProviderName: 'CONSTRUCT SSM TEST S.R.L.',
        ssmSpecialistName: 'Ing. Mihai Radu',
      },
    });
    clientBId = clientB.id;

    // Create 6 employees for Client A with expired dates
    const pastTenMonths = new Date();
    pastTenMonths.setMonth(pastTenMonths.getMonth() - 10);

    const pastEightMonths = new Date();
    pastEightMonths.setMonth(pastEightMonths.getMonth() - 8);

    for (let i = 1; i <= 6; i++) {
      const emp = await prisma.employee.create({
        data: {
          clientId: clientAId,
          firstName: `Salariat${i}`,
          lastName: 'Test',
          cnp: `190010100000${i}`,
          status: 'ACTIV',
          ssmLastTrainingDate: pastTenMonths,
          ssmIntervalMonths: 6,
          psiLastTrainingDate: pastEightMonths,
          psiIntervalMonths: 6,
        },
      });
      employeeIdsA.push(emp.id);
    }

    // Create 1 employee for Client B
    const empB = await prisma.employee.create({
      data: {
        clientId: clientBId,
        firstName: 'SalariatExt',
        lastName: 'ClientB',
        cnp: '1900101999999',
        status: 'ACTIV',
        ssmLastTrainingDate: pastTenMonths,
        ssmIntervalMonths: 6,
      },
    });
    employeeIdsB.push(empB.id);

    // =========================================================================
    // SUITE 1: Expired Employee SSM Training Recording & Compliance Recalculation
    // =========================================================================
    console.log('--- 1. SSM Training Recording & Recalculation via API Logic ---');

    await runLoggedTest('SSM_TRAINING', 'Initial state: expired SSM training triggers OVERDUE', async () => {
      const emp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeIdsA[0] } });
      const compliance = calculateItemCompliance(emp.ssmLastTrainingDate, emp.ssmIntervalMonths, 'Instruire SSM');
      
      trackAssertEqual(compliance.status, 'OVERDUE', 'Compliance status must be OVERDUE prior to training');
      trackAssert(compliance.daysRemaining !== null && compliance.daysRemaining < 0, 'daysRemaining must be negative for overdue item');
      trackAssertEqual(emp.ssmIntervalMonths, 6, 'SSM interval must be 6 months');
    });

    await runLoggedTest('SSM_TRAINING', 'Record SSM training via POST /api/trainings/record and verify scadențe reset', async () => {
      const today = new Date();
      const todayIsoDate = today.toISOString().split('T')[0];
      const targetEmpId = employeeIdsA[0];

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: todayIsoDate,
          durationHours: 2,
          instructorName: 'Ing. Andrei Popescu',
          participantEmployeeIds: [targetEmpId],
          materialOrTopic: 'Instruire SSM semestrială Legea 319/2006',
          notes: 'Test notă instruire SSM',
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 201, 'Endpoint must return HTTP 201 Created');
      
      const responseData = await response.json();
      trackAssertEqual(responseData.success, true, 'Response must indicate success');
      trackAssertEqual(responseData.updatedEmployeesCount, 1, 'Exactly 1 employee must be reported as updated');
      trackAssert(typeof responseData.eventId === 'string' && responseData.eventId.length > 0, 'Event ID must be returned');

      // Query database directly to verify persistence
      const empAfter = await prisma.employee.findUniqueOrThrow({ where: { id: targetEmpId } });
      trackAssert(empAfter.ssmLastTrainingDate !== null, 'ssmLastTrainingDate must not be null');
      
      const empDateIso = empAfter.ssmLastTrainingDate!.toISOString().split('T')[0];
      trackAssertEqual(empDateIso, todayIsoDate, 'ssmLastTrainingDate must match the recorded event date');
      trackAssertEqual(empAfter.ssmNotes, 'Test notă instruire SSM', 'ssmNotes must be saved');

      // Recalculate compliance via calculateItemCompliance
      const recalculated = calculateItemCompliance(
        empAfter.ssmLastTrainingDate,
        empAfter.ssmIntervalMonths,
        'Instruire SSM'
      );
      trackAssertEqual(recalculated.status, 'VALID', 'Compliance status must transition from OVERDUE to VALID');
      
      // Expected due date is today + 6 months
      const expectedDueDate = addMonthsSafe(new Date(todayIsoDate), empAfter.ssmIntervalMonths);
      trackAssert(recalculated.dueDate !== null, 'Due date must be calculated');
      trackAssertEqual(
        recalculated.dueDate!.toISOString().split('T')[0],
        expectedDueDate.toISOString().split('T')[0],
        'Due date must be exactly 6 months from eventDate'
      );
      trackAssert(recalculated.daysRemaining !== null && recalculated.daysRemaining > 150, 'daysRemaining must be > 150 days');
    });

    // =========================================================================
    // SUITE 2: Expired Employee PSI Training Recording & Compliance Recalculation
    // =========================================================================
    console.log('\n--- 2. PSI Training Recording & Recalculation via API Logic ---');

    await runLoggedTest('PSI_TRAINING', 'Initial state: expired PSI training triggers OVERDUE', async () => {
      const emp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeIdsA[1] } });
      const compliance = calculateItemCompliance(emp.psiLastTrainingDate, emp.psiIntervalMonths, 'Instruire PSI/SU');
      
      trackAssertEqual(compliance.status, 'OVERDUE', 'Compliance status must be OVERDUE prior to PSI training');
      trackAssert(compliance.daysRemaining !== null && compliance.daysRemaining < 0, 'daysRemaining must be negative');
    });

    await runLoggedTest('PSI_TRAINING', 'Record PSI training via POST /api/trainings/record and verify scadențe reset', async () => {
      const today = new Date();
      const todayIsoDate = today.toISOString().split('T')[0];
      const targetEmpId = employeeIdsA[1];

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_PSI',
          eventDate: todayIsoDate,
          durationHours: 2,
          instructorName: 'Cadru Tehnic PSI Radu V.',
          participantEmployeeIds: [targetEmpId],
          materialOrTopic: 'Instruire Situații de Urgență conform OMAI 712/2005',
          notes: 'Test notă instruire PSI',
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 201, 'Endpoint must return HTTP 201 Created');

      const responseData = await response.json();
      trackAssertEqual(responseData.success, true);
      trackAssertEqual(responseData.updatedEmployeesCount, 1);

      // Query database directly
      const empAfter = await prisma.employee.findUniqueOrThrow({ where: { id: targetEmpId } });
      trackAssert(empAfter.psiLastTrainingDate !== null, 'psiLastTrainingDate must not be null');
      
      const empDateIso = empAfter.psiLastTrainingDate!.toISOString().split('T')[0];
      trackAssertEqual(empDateIso, todayIsoDate, 'psiLastTrainingDate must match event date');
      trackAssertEqual(empAfter.psiNotes, 'Test notă instruire PSI');

      // Recalculate compliance via calculateItemCompliance
      const recalculated = calculateItemCompliance(
        empAfter.psiLastTrainingDate,
        empAfter.psiIntervalMonths,
        'Instruire PSI/SU'
      );
      trackAssertEqual(recalculated.status, 'VALID', 'PSI status must transition to VALID');
      trackAssert(recalculated.daysRemaining !== null && recalculated.daysRemaining > 150, 'daysRemaining must be > 150 days');
    });

    // =========================================================================
    // SUITE 3: Adversarial Edge Cases & Transaction Integrity
    // =========================================================================
    console.log('\n--- 3. Adversarial Edge Cases & Transaction Rollback ---');

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record with non-existent employee ID -> clean rollback with 0 orphans', async () => {
      const initialEventsCount = await prisma.trainingEvent.count();
      const initialParticipantsCount = await prisma.trainingParticipant.count();

      const fakeEmpId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [fakeEmpId],
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 400, 'Must return HTTP 400 for non-existent employee');

      const finalEventsCount = await prisma.trainingEvent.count();
      const finalParticipantsCount = await prisma.trainingParticipant.count();

      trackAssertEqual(finalEventsCount, initialEventsCount, 'TrainingEvent count must remain strictly unchanged (0 orphans)');
      trackAssertEqual(finalParticipantsCount, initialParticipantsCount, 'TrainingParticipant count must remain strictly unchanged (0 orphans)');
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record cross-client employee ID injection -> clean rollback with 0 orphans', async () => {
      const initialEventsCount = await prisma.trainingEvent.count();
      const initialParticipantsCount = await prisma.trainingParticipant.count();

      // Pass employee from Client B to Client A's training
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsB[0]], // from Client B
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 400, 'Must return HTTP 400 when employee does not belong to client');

      const finalEventsCount = await prisma.trainingEvent.count();
      const finalParticipantsCount = await prisma.trainingParticipant.count();

      trackAssertEqual(finalEventsCount, initialEventsCount, 'TrainingEvent count must remain unchanged (0 orphans)');
      trackAssertEqual(finalParticipantsCount, initialParticipantsCount, 'TrainingParticipant count must remain unchanged (0 orphans)');
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record mixed batch (1 valid + 1 non-existent) -> entire batch rejected with 0 orphans', async () => {
      const initialEventsCount = await prisma.trainingEvent.count();
      const initialParticipantsCount = await prisma.trainingParticipant.count();

      const validEmp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeIdsA[2] } });
      const originalDate = validEmp.ssmLastTrainingDate;

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsA[2], 'non-existent-uuid-999'],
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 400, 'Must return HTTP 400 when any employee in batch is invalid');

      const finalEventsCount = await prisma.trainingEvent.count();
      const finalParticipantsCount = await prisma.trainingParticipant.count();

      trackAssertEqual(finalEventsCount, initialEventsCount, 'TrainingEvent count must remain unchanged');
      trackAssertEqual(finalParticipantsCount, initialParticipantsCount, 'TrainingParticipant count must remain unchanged');

      // Valid employee must NOT have been updated
      const validEmpAfter = await prisma.employee.findUniqueOrThrow({ where: { id: employeeIdsA[2] } });
      trackAssertEqual(
        validEmpAfter.ssmLastTrainingDate?.toISOString(),
        originalDate?.toISOString(),
        'Valid employee date must NOT be modified when batch fails'
      );
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record with empty participant list -> validation error HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [],
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 400, 'Must return HTTP 400 for empty participant list');
      const data = await response.json();
      trackAssert(data.error.includes('cel puțin un salariat'), 'Error message must specify participant requirement');
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record with non-array participant list -> validation error HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: 'not-an-array',
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 400, 'Must return HTTP 400 for non-array participants');
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record with future date -> assert validation error', async () => {
      const futureDate = '2099-01-01';
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: futureDate,
          durationHours: 2,
          instructorName: 'Tester Future',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });

      const response = await POST(req);
      
      // EMPIRICAL OBSERVATION & TEST ORACLE:
      // An SSM training sheet (fișă de instruire individuală) cannot be legally signed or recorded
      // in the future. Attempting to record with a future date should be rejected with HTTP 400.
      if (response.status === 201) {
        // Clean up the invalid training event created during this probe
        const resJson = await response.json();
        if (resJson.eventId) {
          await prisma.trainingEvent.delete({ where: { id: resJson.eventId } });
        }
        // Revert employee date
        await prisma.employee.update({
          where: { id: employeeIdsA[2] },
          data: { ssmLastTrainingDate: pastTenMonths },
        });

        trackAssert(false, `VULNERABILITY: Endpoint accepted future training date ${futureDate} with HTTP 201 instead of rejecting with HTTP 400 validation error.`);
        return `VULNERABILITY DETECTED: Endpoint accepted future date (${futureDate}) without validation.`;
      } else {
        trackAssertEqual(response.status, 400, 'Future training date must be rejected with HTTP 400');
        return 'Future date was correctly rejected with HTTP 400.';
      }
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record with invalid inputs (zero/negative duration, invalid type, missing client)', async () => {
      // 1. Zero duration
      const reqZeroDur = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 0,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });
      const resZeroDur = await POST(reqZeroDur);
      trackAssertEqual(resZeroDur.status, 400, 'Zero duration must return HTTP 400');

      // 2. Negative duration
      const reqNegDur = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: -5,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });
      const resNegDur = await POST(reqNegDur);
      trackAssertEqual(resNegDur.status, 400, 'Negative duration must return HTTP 400');

      // 3. Invalid training type
      const reqInvType = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'RANDOM_NON_EXISTENT_TYPE',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });
      const resInvType = await POST(reqInvType);
      trackAssertEqual(resInvType.status, 400, 'Invalid training type must return HTTP 400');

      // 4. Missing instructor name
      const reqNoInst = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: '',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });
      const resNoInst = await POST(reqNoInst);
      trackAssertEqual(resNoInst.status, 400, 'Missing instructor name must return HTTP 400');

      // 5. Invalid date string
      const reqInvDate = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: 'not-a-valid-date-string',
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });
      const resInvDate = await POST(reqInvDate);
      trackAssertEqual(resInvDate.status, 400, 'Invalid date string must return HTTP 400');

      // 6. Non-existent client ID
      const reqNoClient = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: '00000000-0000-0000-0000-000000000000',
          trainingType: 'PERIODIC_SSM',
          eventDate: new Date().toISOString().split('T')[0],
          durationHours: 2,
          instructorName: 'Tester',
          participantEmployeeIds: [employeeIdsA[2]],
        }),
      });
      const resNoClient = await POST(reqNoClient);
      trackAssertEqual(resNoClient.status, 404, 'Non-existent client ID must return HTTP 404');
    });

    await runLoggedTest('ADVERSARIAL_EDGE', 'Duplicate participant IDs in request payload are gracefully deduplicated', async () => {
      const today = new Date().toISOString().split('T')[0];
      const targetEmp = employeeIdsA[2];

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'PERIODIC_SSM',
          eventDate: today,
          durationHours: 2,
          instructorName: 'Tester Dedup',
          participantEmployeeIds: [targetEmp, targetEmp, targetEmp], // triplicated
        }),
      });

      const response = await POST(req);
      trackAssertEqual(response.status, 201, 'Endpoint must handle duplicate IDs gracefully with HTTP 201');
      const resData = await response.json();
      trackAssertEqual(resData.updatedEmployeesCount, 1, 'Only 1 employee record updated');

      // Assert that exactly 1 participant was created for the event
      const participants = await prisma.trainingParticipant.findMany({
        where: { eventId: resData.eventId },
      });
      trackAssertEqual(participants.length, 1, 'Only 1 participant row created (no duplicate key crash)');
    });

    await runLoggedTest('SSM_TRAINING', 'Record INTRODUCTIV and LOC_MUNCA training events & verify ssmLastTrainingDate resets', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Test INTRODUCTIV
      const reqIntro = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'INTRODUCTIV',
          eventDate: today,
          durationHours: 8,
          instructorName: 'Tester Intro',
          participantEmployeeIds: [employeeIdsA[3]],
        }),
      });
      const resIntro = await POST(reqIntro);
      trackAssertEqual(resIntro.status, 201, 'INTRODUCTIV must succeed with HTTP 201');

      const empIntro = await prisma.employee.findUniqueOrThrow({ where: { id: employeeIdsA[3] } });
      trackAssertEqual(empIntro.ssmLastTrainingDate?.toISOString().split('T')[0], today, 'INTRODUCTIV resets ssmLastTrainingDate');

      // Test LOC_MUNCA
      const reqLoc = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientAId,
          trainingType: 'LOC_MUNCA',
          eventDate: today,
          durationHours: 8,
          instructorName: 'Tester Loc Munca',
          participantEmployeeIds: [employeeIdsA[4]],
        }),
      });
      const resLoc = await POST(reqLoc);
      trackAssertEqual(resLoc.status, 201, 'LOC_MUNCA must succeed with HTTP 201');

      const empLoc = await prisma.employee.findUniqueOrThrow({ where: { id: employeeIdsA[4] } });
      trackAssertEqual(empLoc.ssmLastTrainingDate?.toISOString().split('T')[0], today, 'LOC_MUNCA resets ssmLastTrainingDate');
    });

    // =========================================================================
    // SUITE 4: Concurrency Testing
    // =========================================================================
    console.log('\n--- 4. Concurrency & Parallel Execution Harness ---');

    await runLoggedTest('CONCURRENCY', 'Simultaneous training recordings for multiple employees (5 parallel requests)', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const parallelEmps = [employeeIdsA[2], employeeIdsA[3], employeeIdsA[4], employeeIdsA[5]];

      // Dispatch 4 parallel training recordings across employees 2-5
      const requests = parallelEmps.map((empId, idx) => {
        const type = idx % 2 === 0 ? 'PERIODIC_SSM' : 'PERIODIC_PSI';
        return POST(
          new NextRequest('http://localhost:3000/api/trainings/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: clientAId,
              trainingType: type,
              eventDate: todayStr,
              durationHours: 2,
              instructorName: `Instructor Paralel ${idx + 1}`,
              participantEmployeeIds: [empId],
              materialOrTopic: `Instruire concurentă thread #${idx + 1}`,
            }),
          })
        );
      });

      const responses = await Promise.all(requests);

      // Verify all responses returned HTTP 201
      for (const res of responses) {
        trackAssertEqual(res.status, 201, 'All parallel requests must succeed with HTTP 201');
      }

      // Verify that all employees were correctly updated
      const empsAfter = await prisma.employee.findMany({
        where: { id: { in: parallelEmps } },
      });

      trackAssertEqual(empsAfter.length, 4, 'All 4 employees must exist');
      const empMap = new Map(empsAfter.map((e) => [e.id, e]));

      for (let idx = 0; idx < parallelEmps.length; idx++) {
        const empId = parallelEmps[idx];
        const emp = empMap.get(empId)!;
        trackAssert(emp !== undefined, `Employee ${empId} must be in database`);

        if (idx % 2 === 0) {
          trackAssert(emp.ssmLastTrainingDate !== null, 'ssmLastTrainingDate must be populated');
          const compliance = calculateItemCompliance(emp.ssmLastTrainingDate, emp.ssmIntervalMonths, 'Instruire SSM');
          trackAssertEqual(compliance.status, 'VALID', 'SSM compliance must be VALID');
        } else {
          trackAssert(emp.psiLastTrainingDate !== null, 'psiLastTrainingDate must be populated');
          const compliance = calculateItemCompliance(emp.psiLastTrainingDate, emp.psiIntervalMonths, 'Instruire PSI/SU');
          trackAssertEqual(compliance.status, 'VALID', 'PSI compliance must be VALID');
        }
      }
    });

    await runLoggedTest('CONCURRENCY', 'Simultaneous race condition: 4 concurrent recordings for the SAME employee', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const targetEmpId = employeeIdsA[0];

      // Dispatch 4 concurrent requests all targeting employeeIdsA[0]
      const raceRequests = [
        POST(new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientAId,
            trainingType: 'PERIODIC_SSM',
            eventDate: todayStr,
            durationHours: 2,
            instructorName: 'Race Tester 1',
            participantEmployeeIds: [targetEmpId],
            notes: 'Race 1',
          }),
        })),
        POST(new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientAId,
            trainingType: 'PERIODIC_PSI',
            eventDate: todayStr,
            durationHours: 2,
            instructorName: 'Race Tester 2',
            participantEmployeeIds: [targetEmpId],
            notes: 'Race 2',
          }),
        })),
        POST(new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientAId,
            trainingType: 'PERIODIC_SSM',
            eventDate: todayStr,
            durationHours: 3,
            instructorName: 'Race Tester 3',
            participantEmployeeIds: [targetEmpId],
            notes: 'Race 3',
          }),
        })),
        POST(new NextRequest('http://localhost:3000/api/trainings/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientAId,
            trainingType: 'PERIODIC_PSI',
            eventDate: todayStr,
            durationHours: 2,
            instructorName: 'Race Tester 4',
            participantEmployeeIds: [targetEmpId],
            notes: 'Race 4',
          }),
        })),
      ];

      const raceResponses = await Promise.all(raceRequests);

      // Verify that all concurrent requests succeeded without transaction serialization failure or deadlocks
      for (const res of raceResponses) {
        trackAssertEqual(res.status, 201, 'All race condition requests must complete with HTTP 201');
      }

      // Employee must end up in a valid, uncorrupted state
      const empFinal = await prisma.employee.findUniqueOrThrow({ where: { id: targetEmpId } });
      trackAssert(empFinal.ssmLastTrainingDate !== null, 'ssmLastTrainingDate must be set');
      trackAssert(empFinal.psiLastTrainingDate !== null, 'psiLastTrainingDate must be set');

      const ssmComp = calculateItemCompliance(empFinal.ssmLastTrainingDate, empFinal.ssmIntervalMonths, 'Instruire SSM');
      const psiComp = calculateItemCompliance(empFinal.psiLastTrainingDate, empFinal.psiIntervalMonths, 'Instruire PSI/SU');
      trackAssertEqual(ssmComp.status, 'VALID', 'SSM must be VALID');
      trackAssertEqual(psiComp.status, 'VALID', 'PSI must be VALID');
    });

  } finally {
    // Teardown: Clean up test clients and cascading records
    console.log('\n--- Cleanup: Removing Test Data ---');
    try {
      if (clientAId) {
        await prisma.client.delete({ where: { id: clientAId } });
      }
      if (clientBId) {
        await prisma.client.delete({ where: { id: clientBId } });
      }
      console.log('  ✓ Test clients and associated records cleaned up successfully.');
    } catch (cleanupErr) {
      console.warn('  ⚠ Warning during cleanup:', cleanupErr);
    }
  }

  // Summary Report
  const totalDuration = Date.now() - suiteStart;
  const passedTests = executionLogs.filter((l) => l.passed).length;
  const failedTests = executionLogs.filter((l) => !l.passed).length;
  const totalTests = executionLogs.length;

  console.log('\n================================================================');
  console.log('       CHALLENGER 2 TEST EXECUTION SUMMARY REPORT               ');
  console.log('================================================================');
  console.log(`Total Test Scenarios:   ${totalTests}`);
  console.log(`Passed:                 ${passedTests}`);
  console.log(`Failed:                 ${failedTests}`);
  console.log(`Global Assertions:      ${globalAssertionCount}`);
  console.log(`Total Duration:         ${totalDuration}ms`);
  console.log('----------------------------------------------------------------');

  for (const log of executionLogs) {
    const statusIcon = log.passed ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`  ${statusIcon} [${log.suite}] ${log.testName} (${log.assertionsPassed} asserts, ${log.durationMs}ms)`);
    if (log.error) {
      console.log(`     Error: ${log.error}`);
    }
    if (log.findingNote) {
      console.log(`     Note:  ${log.findingNote}`);
    }
  }
  console.log('================================================================\n');

  return {
    totalTests,
    passedTests,
    failedTests,
    globalAssertionCount,
    totalDuration,
    logs: executionLogs,
  };
}

if (process.argv[1] && process.argv[1].endsWith('verify-m2-challenger2.ts')) {
  runChallenger2Suite()
    .then((result) => {
      process.exit(result.failedTests > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal suite failure:', err);
      process.exit(1);
    });
}
