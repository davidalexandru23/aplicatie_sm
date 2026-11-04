/**
 * scripts/adversarial-m2-r4-challenger.ts
 *
 * Empirical Adversarial Challenger Verification Suite for Milestone 2:
 * 1. Database Seeding Idempotency & Cleanliness
 * 2. Relational Integrity & Foreign Key Invariants
 * 3. Cascade Deletion vs SetNull Employee Retention
 * 4. Status Progression Lifecycle & Employee Compliance Synchronization
 * 5. Adversarial Error Boundary Stress Tests (Negative / Malformed Payloads)
 *
 * Author: m2_r4_challenger_1
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getSessionsRoute, POST as createSessionRoute } from '../src/app/api/hygiene/sessions/route';
import { GET as getSessionByIdRoute, PATCH as patchSessionByIdRoute, DELETE as deleteSessionByIdRoute } from '../src/app/api/hygiene/sessions/[id]/route';
import { POST as addParticipantsRoute } from '../src/app/api/hygiene/sessions/[id]/participants/route';
import { calculateEmployeeCompliance, addMonthsSafe } from '../src/lib/compliance';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];
let totalAssertions = 0;

function trackAssert(condition: boolean, msg: string) {
  totalAssertions++;
  assert.ok(condition, msg);
}

function trackAssertEqual<T>(actual: T, expected: T, msg: string) {
  totalAssertions++;
  assert.equal(actual, expected, `${msg} -> Expected: ${expected}, Actual: ${actual}`);
}

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - t0;
    results.push({ category, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] [${category}] ${name} (${durationMs}ms)`);
  } catch (err: unknown) {
    const durationMs = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ category, name, passed: false, durationMs, error: msg });
    console.error(`  ✗ [FAIL] [${category}] ${name} (${durationMs}ms): ${msg}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('  M2 EMPIRICAL ADVERSARIAL CHALLENGER VERIFICATION SUITE       ');
  console.log('================================================================\n');

  // Pre-cleanup of any lingering test sessions from prior interrupted test runs
  await prisma.hygieneSession.deleteMany({
    where: {
      pvSeriesNumber: { in: ['PV-STATUS-TEST-001', 'PV-TEMP-TEST-001'] },
    },
  });

  // ===========================================================================
  // CATEGORY 1: SEED IDEMPOTENCY
  // ===========================================================================
  console.log('--- CATEGORY 1: SEED IDEMPOTENCY ---');

  await runTest('Seed Idempotency', 'Repeated seed executions produce invariant counts', async () => {
    // Run seed twice to test consecutive idempotency
    execSync('npx prisma db seed', { stdio: 'pipe' });
    const count1Sessions = await prisma.hygieneSession.count();
    const count1Participants = await prisma.hygieneParticipant.count();
    const count1Employees = await prisma.employee.count();
    const count1Clients = await prisma.client.count();

    execSync('npx prisma db seed', { stdio: 'pipe' });
    const count2Sessions = await prisma.hygieneSession.count();
    const count2Participants = await prisma.hygieneParticipant.count();
    const count2Employees = await prisma.employee.count();
    const count2Clients = await prisma.client.count();

    trackAssertEqual(count2Sessions, count1Sessions, 'HygieneSession count must be invariant across seeds');
    trackAssertEqual(count2Participants, count1Participants, 'HygieneParticipant count must be invariant across seeds');
    trackAssertEqual(count2Employees, count1Employees, 'Employee count must be invariant across seeds');
    trackAssertEqual(count2Clients, count1Clients, 'Client count must be invariant across seeds');

    trackAssertEqual(count2Sessions, 3, 'Demo HygieneSession count must be exactly 3');
    trackAssertEqual(count2Participants, 4, 'Demo HygieneParticipant count must be exactly 4');
  });

  await runTest('Seed Idempotency', 'PV numbers are unique and un-duplicated in DB', async () => {
    const expectedPvs = ['PV-EX-2025-0042', 'PV-EX-2026-0089', 'PV-EX-2026-0112'];
    for (const pv of expectedPvs) {
      const matching = await prisma.hygieneSession.findMany({
        where: { pvSeriesNumber: pv },
      });
      trackAssertEqual(matching.length, 1, `Session with PV ${pv} must appear exactly once`);
    }
  });

  await runTest('Seed Idempotency', 'Zero orphan participants exist in database', async () => {
    const participants = await prisma.hygieneParticipant.findMany({
      include: { session: true },
    });
    for (const p of participants) {
      trackAssert(Boolean(p.session), `Participant ${p.id} must be attached to a valid session`);
    }
  });

  // ===========================================================================
  // CATEGORY 2: RELATIONAL INTEGRITY
  // ===========================================================================
  console.log('\n--- CATEGORY 2: RELATIONAL INTEGRITY ---');

  await runTest('Relational Integrity', 'Every HygieneParticipant links to valid Employee with matching attributes', async () => {
    const participants = await prisma.hygieneParticipant.findMany({
      include: {
        employee: {
          include: {
            client: true,
            currentJob: true,
          },
        },
      },
    });

    trackAssert(participants.length >= 4, 'There must be at least 4 seeded participants');

    for (const p of participants) {
      trackAssert(Boolean(p.employeeId), `Participant ${p.id} must have a non-null employeeId`);
      trackAssert(Boolean(p.employee), `Participant ${p.id} employee must exist`);
      if (p.employee) {
        trackAssertEqual(p.clientName, p.employee.client.name, `clientName must match employee company`);
        trackAssertEqual(p.cnp, p.employee.cnp, `cnp must match employee cnp`);
        trackAssertEqual(p.lastName, p.employee.lastName, `lastName must match employee lastName`);
        trackAssertEqual(p.firstName, p.employee.firstName, `firstName must match employee firstName`);
        if (p.employee.currentJob) {
          trackAssertEqual(p.jobTitle, p.employee.currentJob.title, `jobTitle must match employee currentJob.title`);
        }
      }
    }
  });

  await runTest('Relational Integrity', 'Foreign key constraints block invalid sessionId and employeeId', async () => {
    // Non-existent sessionId
    let invalidSessionBlocked = false;
    try {
      await prisma.hygieneParticipant.create({
        data: {
          sessionId: '00000000-0000-0000-0000-000000000000',
          clientName: 'Test Inc',
          lastName: 'Pop',
          firstName: 'Ioan',
          cnp: '1900101123456',
        },
      });
    } catch (err: unknown) {
      invalidSessionBlocked = true;
    }
    trackAssert(invalidSessionBlocked, 'DB must reject HygieneParticipant with invalid sessionId');

    // Non-existent employeeId
    const validSession = await prisma.hygieneSession.findFirst();
    trackAssert(Boolean(validSession), 'Valid session must exist');
    let invalidEmployeeBlocked = false;
    try {
      await prisma.hygieneParticipant.create({
        data: {
          sessionId: validSession!.id,
          employeeId: '00000000-0000-0000-0000-000000000000',
          clientName: 'Test Inc',
          lastName: 'Pop',
          firstName: 'Ioan',
          cnp: '1900101123456',
        },
      });
    } catch (err: unknown) {
      invalidEmployeeBlocked = true;
    }
    trackAssert(invalidEmployeeBlocked, 'DB must reject HygieneParticipant with invalid employeeId');
  });

  await runTest('Relational Integrity', 'Employee deletion triggers SetNull on participant employeeId without deleting participant', async () => {
    // Create a temporary client and employee
    const tempClient = await prisma.client.create({
      data: {
        name: 'TEMPORARY CLIENT SRL',
        cui: 'RO99999001',
        address: 'Str. Test 1, Sector 1, București',
      },
    });

    const tempEmployee = await prisma.employee.create({
      data: {
        clientId: tempClient.id,
        firstName: 'Dorel',
        lastName: 'Temporar',
        cnp: '1850101123456',
        hireDate: new Date('2024-01-01'),
      },
    });

    const tempSession = await prisma.hygieneSession.create({
      data: {
        providerName: 'Test Provider',
        sessionDate: new Date('2026-12-01'),
        examDate: new Date('2026-12-05'),
        location: 'Bucuresti',
        status: 'programata',
        participants: {
          create: [
            {
              employeeId: tempEmployee.id,
              clientName: tempClient.name,
              lastName: tempEmployee.lastName,
              firstName: tempEmployee.firstName,
              cnp: tempEmployee.cnp,
            },
          ],
        },
      },
      include: { participants: true },
    });

    const participantId = tempSession.participants[0].id;

    // Delete temp employee
    await prisma.employee.delete({ where: { id: tempEmployee.id } });

    // Verify participant still exists but employeeId is NULL (onDelete: SetNull)
    const retainedParticipant = await prisma.hygieneParticipant.findUnique({
      where: { id: participantId },
    });
    trackAssert(Boolean(retainedParticipant), 'Participant must survive employee deletion');
    trackAssertEqual(retainedParticipant!.employeeId, null, 'Participant employeeId must be set to null');

    // Clean up
    await prisma.hygieneSession.delete({ where: { id: tempSession.id } });
    await prisma.client.delete({ where: { id: tempClient.id } });
  });

  // ===========================================================================
  // CATEGORY 3: SESSION DELETION & CASCADE
  // ===========================================================================
  console.log('\n--- CATEGORY 3: SESSION DELETION & CASCADE BEHAVIOR ---');

  await runTest('Cascade Deletion', 'Session deletion cascades to participants and preserves employees', async () => {
    // Pick an existing client and employee
    const employee = await prisma.employee.findFirst({
      include: { client: true },
    });
    trackAssert(Boolean(employee), 'Employee must exist');

    // Create a temporary session with 2 participants
    const session = await prisma.hygieneSession.create({
      data: {
        providerName: 'Test Provider S.R.L.',
        sessionDate: new Date('2026-12-10T09:00:00Z'),
        examDate: new Date('2026-12-12T10:00:00Z'),
        location: 'Str. Test 10',
        pvSeriesNumber: 'PV-TEMP-TEST-001',
        status: 'programata',
        participants: {
          create: [
            {
              employeeId: employee!.id,
              clientName: employee!.client.name,
              lastName: employee!.lastName,
              firstName: employee!.firstName,
              cnp: employee!.cnp,
            },
            {
              clientName: 'Direct Client',
              lastName: 'External',
              firstName: 'Cursant',
              cnp: '2900101998877',
            },
          ],
        },
      },
      include: { participants: true },
    });

    const sessionId = session.id;
    const participantIds = session.participants.map((p) => p.id);
    trackAssertEqual(participantIds.length, 2, 'Two participants created');

    // Call API DELETE route
    const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    const res = await deleteSessionByIdRoute(req, {
      params: Promise.resolve({ id: sessionId }),
    });

    trackAssertEqual(res.status, 200, 'DELETE response should be 200 OK');
    const resJson = await res.json();
    trackAssertEqual(resJson.success, true, 'Response JSON should indicate success');

    // Verify session is deleted
    const sessionInDb = await prisma.hygieneSession.findUnique({ where: { id: sessionId } });
    trackAssertEqual(sessionInDb, null, 'Session must no longer exist in DB');

    // Verify participants are cascade deleted
    const participantsInDb = await prisma.hygieneParticipant.findMany({
      where: { id: { in: participantIds } },
    });
    trackAssertEqual(participantsInDb.length, 0, 'All participants must be cascade deleted');

    // Verify employee was NOT deleted
    const employeeStillExists = await prisma.employee.findUnique({ where: { id: employee!.id } });
    trackAssert(Boolean(employeeStillExists), 'Employee must remain intact after session deletion');
  });

  await runTest('Cascade Deletion', 'DELETE on non-existent session returns 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${fakeId}`, {
      method: 'DELETE',
    });
    const res = await deleteSessionByIdRoute(req, {
      params: Promise.resolve({ id: fakeId }),
    });
    trackAssertEqual(res.status, 404, 'DELETE non-existent session must return 404');
  });

  // ===========================================================================
  // CATEGORY 4: STATUS PROGRESSION & COMPLIANCE SYNCHRONIZATION
  // ===========================================================================
  console.log('\n--- CATEGORY 4: STATUS PROGRESSION & COMPLIANCE SYNC ---');

  await runTest('Status Progression & Sync', 'Strict lifecycle state machine enforcement and compliance synchronization', async () => {
    // Find two employees from Bistro Gourmet
    const clientBistro = await prisma.client.findFirst({
      where: { cui: 'RO45123987' },
      include: { employees: true },
    });
    trackAssert(Boolean(clientBistro), 'Client Bistro Gourmet must exist');
    trackAssert(clientBistro!.employees.length >= 2, 'Bistro must have at least 2 employees');

    const empAdmis = clientBistro!.employees[0];
    const empRespins = clientBistro!.employees[1];

    // Record original compliance dates
    const origAdmisExamDate = empAdmis.hygieneLastExamDate;
    const origRespinsExamDate = empRespins.hygieneLastExamDate;

    const examDate = new Date('2026-11-20T10:00:00.000Z');

    // Create session in 'programata'
    const testSession = await prisma.hygieneSession.create({
      data: {
        providerName: 'EXPERT SSM S.R.L.',
        sessionDate: new Date('2026-11-18T09:00:00.000Z'),
        examDate,
        location: 'Str. Testare Status',
        pvSeriesNumber: 'PV-STATUS-TEST-001',
        status: 'programata',
        participants: {
          create: [
            {
              employeeId: empAdmis.id,
              clientName: clientBistro!.name,
              lastName: empAdmis.lastName,
              firstName: empAdmis.firstName,
              cnp: empAdmis.cnp,
              jobTitle: 'Bucătar Specialist',
              attendance: 'prezent',
              examResult: 'admis',
              examGrade: 9.85,
              certificateSeries: 'DSP-TEST',
              certificateNumber: '2026-99991',
            },
            {
              employeeId: empRespins.id,
              clientName: clientBistro!.name,
              lastName: empRespins.lastName,
              firstName: empRespins.firstName,
              cnp: empRespins.cnp,
              jobTitle: 'Ospătar / Chelner',
              attendance: 'prezent',
              examResult: 'respins',
              examGrade: 4.00,
              certificateSeries: null,
              certificateNumber: null,
            },
          ],
        },
      },
      include: { participants: true },
    });

    const sId = testSession.id;

    // Helper for PATCH
    async function patchStatus(targetStatus: string) {
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${sId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      return await patchSessionByIdRoute(req, {
        params: Promise.resolve({ id: sId }),
      });
    }

    try {
      // 4.1 Test invalid transitions from 'programata'
      const resProgToFinal = await patchStatus('finalizata');
      trackAssertEqual(resProgToFinal.status, 400, 'programata -> finalizata directly must be rejected');

      const resProgToCert = await patchStatus('certificate_emise');
      trackAssertEqual(resProgToCert.status, 400, 'programata -> certificate_emise directly must be rejected');

      const resProgToBogus = await patchStatus('bogus_status');
      trackAssertEqual(resProgToBogus.status, 400, 'programata -> bogus_status must be rejected');

      // 4.2 Test participant addition while 'programata'
      // Attempt to add empAdmis again -> duplicate check
      const reqDup = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${sId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: [empAdmis.id] }),
      });
      const resDup = await addParticipantsRoute(reqDup, {
        params: Promise.resolve({ id: sId }),
      });
      trackAssertEqual(resDup.status, 400, 'Adding already enrolled employee must be rejected');

      // 4.3 Advance programata -> in_desfasurare
      const resProgToDesf = await patchStatus('in_desfasurare');
      trackAssertEqual(resProgToDesf.status, 200, 'programata -> in_desfasurare must be allowed');
      const sDesf = await prisma.hygieneSession.findUnique({ where: { id: sId } });
      trackAssertEqual(sDesf!.status, 'in_desfasurare', 'DB status must be in_desfasurare');

      // 4.4 Attempt to add participants while 'in_desfasurare' -> should fail
      const reqAddDuringDesf = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${sId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: [empAdmis.id] }),
      });
      const resAddDuringDesf = await addParticipantsRoute(reqAddDuringDesf, {
        params: Promise.resolve({ id: sId }),
      });
      trackAssertEqual(resAddDuringDesf.status, 400, 'Adding participant during in_desfasurare must be blocked');

      // 4.5 Test invalid transitions from 'in_desfasurare'
      const resDesfToProg = await patchStatus('programata');
      trackAssertEqual(resDesfToProg.status, 400, 'in_desfasurare -> programata (backward) must be rejected');

      const resDesfToCert = await patchStatus('certificate_emise');
      trackAssertEqual(resDesfToCert.status, 400, 'in_desfasurare -> certificate_emise directly must be rejected');

      // 4.6 Advance in_desfasurare -> finalizata (triggers compliance sync)
      const resDesfToFinal = await patchStatus('finalizata');
      trackAssertEqual(resDesfToFinal.status, 200, 'in_desfasurare -> finalizata must be allowed');
      const sFinal = await prisma.hygieneSession.findUnique({ where: { id: sId } });
      trackAssertEqual(sFinal!.status, 'finalizata', 'DB status must be finalizata');

      // VERIFY COMPLIANCE SYNCHRONIZATION:
      // empAdmis should have updated hygieneLastExamDate, hygieneCertificateNumber, hygieneCertificateIssueDate
      const refreshedAdmis = await prisma.employee.findUnique({ where: { id: empAdmis.id } });
      trackAssert(Boolean(refreshedAdmis?.hygieneLastExamDate), 'Admis employee must have hygieneLastExamDate set');
      trackAssertEqual(
        refreshedAdmis!.hygieneLastExamDate!.toISOString(),
        examDate.toISOString(),
        'hygieneLastExamDate must match session.examDate'
      );
      trackAssertEqual(
        refreshedAdmis!.hygieneCertificateNumber,
        '2026-99991',
        'hygieneCertificateNumber must match participant certificateNumber'
      );
      trackAssert(
        Boolean(refreshedAdmis!.hygieneNotes?.includes('admis') && refreshedAdmis!.hygieneNotes?.includes('9.85')),
        'hygieneNotes must record exam outcome and grade'
      );

      // Verify compliance calculations via calculateEmployeeCompliance
      const complianceAdmis = calculateEmployeeCompliance(refreshedAdmis!, new Date('2026-11-21T00:00:00Z'));
      trackAssert(Boolean(complianceAdmis.hygieneCertificate), 'Hygiene compliance item must exist');
      trackAssertEqual(complianceAdmis.hygieneCertificate!.status, 'VALID', 'Hygiene status must be VALID');
      // Expiration date must be 36 months after exam date
      const expectedExpiryYear = examDate.getFullYear() + 3;
      trackAssertEqual(
        complianceAdmis.hygieneCertificate!.dueDate!.getFullYear(),
        expectedExpiryYear,
        'Hygiene expiration year must be +3 years (36 months)'
      );

      // empRespins should NOT have updated hygieneLastExamDate
      const refreshedRespins = await prisma.employee.findUnique({ where: { id: empRespins.id } });
      trackAssertEqual(
        refreshedRespins!.hygieneLastExamDate?.toISOString() ?? null,
        origRespinsExamDate?.toISOString() ?? null,
        'Respins employee must NOT have hygieneLastExamDate updated'
      );

      // 4.7 Test invalid transitions from 'finalizata'
      const resFinalToProg = await patchStatus('programata');
      trackAssertEqual(resFinalToProg.status, 400, 'finalizata -> programata must be rejected');

      const resFinalToDesf = await patchStatus('in_desfasurare');
      trackAssertEqual(resFinalToDesf.status, 400, 'finalizata -> in_desfasurare must be rejected');

      // 4.8 Advance finalizata -> certificate_emise
      const resFinalToCert = await patchStatus('certificate_emise');
      trackAssertEqual(resFinalToCert.status, 200, 'finalizata -> certificate_emise must be allowed');
      const sCert = await prisma.hygieneSession.findUnique({ where: { id: sId } });
      trackAssertEqual(sCert!.status, 'certificate_emise', 'DB status must be certificate_emise');

      // 4.9 Terminal state: certificate_emise cannot transition anywhere
      const resCertToAny = await patchStatus('finalizata');
      trackAssertEqual(resCertToAny.status, 400, 'certificate_emise cannot transition to any status');
    } finally {
      // Clean up test session
      await prisma.hygieneSession.deleteMany({ where: { id: sId } });

      // Restore original employee states
      await prisma.employee.update({
        where: { id: empAdmis.id },
        data: {
          hygieneLastExamDate: origAdmisExamDate,
          hygieneCertificateNumber: empAdmis.hygieneCertificateNumber,
          hygieneCertificateIssueDate: empAdmis.hygieneCertificateIssueDate,
          hygieneNotes: empAdmis.hygieneNotes,
        },
      });
    }
  });

  // ===========================================================================
  // CATEGORY 5: ADVERSARIAL API PAYLOADS & BOUNDARIES
  // ===========================================================================
  console.log('\n--- CATEGORY 5: ADVERSARIAL API BOUNDARIES ---');

  await runTest('API Boundaries', 'POST /api/hygiene/sessions rejects empty or missing required fields', async () => {
    // Missing sessionDate
    const req1 = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examDate: '2026-11-20',
        location: 'Bucuresti',
        participants: [{ clientName: 'C', firstName: 'A', lastName: 'B', cnp: '123' }],
      }),
    });
    const res1 = await createSessionRoute(req1);
    trackAssertEqual(res1.status, 400, 'Missing sessionDate must return 400');

    // Missing participants
    const req2 = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionDate: '2026-11-18',
        examDate: '2026-11-20',
        location: 'Bucuresti',
        participants: [],
      }),
    });
    const res2 = await createSessionRoute(req2);
    trackAssertEqual(res2.status, 400, 'Empty participants array must return 400');

    // Incomplete participant payload (missing cnp)
    const req3 = new NextRequest('http://localhost:3000/api/hygiene/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionDate: '2026-11-18',
        examDate: '2026-11-20',
        location: 'Bucuresti',
        participants: [{ clientName: 'C', firstName: 'A', lastName: 'B' }],
      }),
    });
    const res3 = await createSessionRoute(req3);
    trackAssertEqual(res3.status, 400, 'Participant missing CNP must return 400');
  });

  await runTest('API Boundaries', 'GET /api/hygiene/sessions returns all sessions with participant employee clientId', async () => {
    const res = await getSessionsRoute();
    trackAssertEqual(res.status, 200, 'GET /api/hygiene/sessions must return 200');
    const sessions = await res.json();
    trackAssert(Array.isArray(sessions), 'Response must be an array');
    trackAssert(sessions.length >= 3, 'Must return at least 3 sessions');
    for (const s of sessions) {
      trackAssert(Array.isArray(s.participants), 'Session must include participants array');
      for (const p of s.participants) {
        if (p.employeeId) {
          trackAssert(Boolean(p.employee?.clientId), 'Participant with employeeId must expose employee.clientId');
        }
      }
    }
  });

  // ===========================================================================
  // CATEGORY 6: CONCURRENCY & RACE CONDITIONS
  // ===========================================================================
  console.log('\n--- CATEGORY 6: CONCURRENCY & RACE CONDITIONS ---');

  await runTest('Concurrency', 'Parallel status advance requests do not corrupt database session state', async () => {
    // Create test session
    const concurrentSession = await prisma.hygieneSession.create({
      data: {
        providerName: 'CONCURRENT TEST PROVIDER',
        sessionDate: new Date('2026-11-20'),
        examDate: new Date('2026-11-22'),
        location: 'Sala Concurrency',
        pvSeriesNumber: 'PV-CONCURRENCY-001',
        status: 'programata',
      },
    });

    const sId = concurrentSession.id;

    try {
      // Dispatch 5 concurrent requests attempting to advance status to 'in_desfasurare'
      const promises = Array.from({ length: 5 }, async () => {
        const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${sId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_desfasurare' }),
        });
        return await patchSessionByIdRoute(req, {
          params: Promise.resolve({ id: sId }),
        });
      });

      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      
      // At least one request must succeed (200)
      const successCount = statuses.filter((s) => s === 200).length;
      trackAssert(successCount >= 1, 'At least one concurrent advance request must succeed');

      // The final state in DB must be valid 'in_desfasurare'
      const finalSession = await prisma.hygieneSession.findUnique({ where: { id: sId } });
      trackAssertEqual(finalSession!.status, 'in_desfasurare', 'Final state must be strictly in_desfasurare');
    } finally {
      await prisma.hygieneSession.deleteMany({ where: { id: sId } });
    }
  });

  // ===========================================================================
  // CATEGORY 7: DATE ARITHMETIC & 36-MONTH STATUTORY CLAMPING
  // ===========================================================================
  console.log('\n--- CATEGORY 7: STATUTORY DATE ARITHMETIC & LEAP YEAR CLAMPING ---');

  await runTest('Date Arithmetic', 'Leap day (Feb 29) + 36 months clamps strictly to Feb 28 in non-leap year', async () => {
    // Leap day in 2024
    const leapDay2024 = new Date('2024-02-29T12:00:00Z');
    // +36 months -> 2027 (not a leap year). Must clamp to Feb 28, NOT rollover to March 1.
    const clampedDate = addMonthsSafe(leapDay2024, 36);
    trackAssertEqual(clampedDate.getFullYear(), 2027, 'Year must be 2027');
    trackAssertEqual(clampedDate.getMonth(), 1, 'Month must remain February (index 1)');
    trackAssertEqual(clampedDate.getDate(), 28, 'Day must be clamped to 28');
  });

  await runTest('Date Arithmetic', 'End of month (Aug 31) + 6 months clamps to Feb 28/29 without March bleed', async () => {
    const aug31 = new Date('2025-08-31T12:00:00Z');
    const feb2026 = addMonthsSafe(aug31, 6);
    trackAssertEqual(feb2026.getFullYear(), 2026, 'Year must be 2026');
    trackAssertEqual(feb2026.getMonth(), 1, 'Month must remain February (index 1)');
    trackAssertEqual(feb2026.getDate(), 28, 'Day must be clamped to 28 in non-leap 2026');
  });

  // ===========================================================================
  // CATEGORY 8: DOCUMENT GENERATION INTEGRATION WITH SEED DATA
  // ===========================================================================
  console.log('\n--- CATEGORY 8: DOCUMENT GENERATION INTEGRATION ---');

  await runTest('Document Generation', 'Direct client-level and session-level hygiene documents generate with zero placeholder leakage', async () => {
    const clientBistro = await prisma.client.findFirst({
      where: { cui: 'RO45123987' },
      include: { employees: true },
    });
    trackAssert(Boolean(clientBistro), 'Bistro Gourmet must exist');

    // 1. Client-level Scope A generation (Tabel Evidenta Cursanti)
    const resolvedScopeA = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: clientBistro!.id,
    });
    trackAssert(Array.isArray(resolvedScopeA.resolvedData.participants), 'Scope A participants must be an array');
    trackAssert(
      (resolvedScopeA.resolvedData.participants as any[]).length >= clientBistro!.employees.length,
      'Scope A participants array must include all client employees'
    );

    const docA = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: clientBistro!.id,
      data: resolvedScopeA.resolvedData,
      operatorName: 'Empirical Challenger',
    });
    trackAssert(docA.fileSizeBytes > 0, 'Generated XLSX fileSizeBytes must be > 0');
    trackAssert(docA.missingFields.length === 0, 'Scope A missingFields must be 0');

    // 2. Session-level Scope B generation (Tabel Evidenta Cursanti for Sesiune 2 - Nexus)
    const clientNexus = await prisma.client.findFirst({
      where: { cui: 'RO38765432' },
    });
    trackAssert(Boolean(clientNexus), 'Nexus Solutions must exist');

    const sessionNexus = await prisma.hygieneSession.findFirst({
      where: { pvSeriesNumber: 'PV-EX-2026-0089' },
      include: { participants: true },
    });
    trackAssert(Boolean(sessionNexus), 'Nexus hygiene session must exist');

    const resolvedScopeB = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: clientNexus!.id,
      hygieneSessionId: sessionNexus!.id,
    });
    const docB = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: clientNexus!.id,
      hygieneSessionId: sessionNexus!.id,
      data: resolvedScopeB.resolvedData,
      operatorName: 'Empirical Challenger',
    });
    trackAssert(docB.fileSizeBytes > 0, 'Generated session XLSX fileSizeBytes must be > 0');
    trackAssert(docB.missingFields.length === 0, 'Scope B missingFields must be 0');

    // 3. Nominal Adeverinta generation (hygiene-adeverinta for Marius Radu)
    const empRadu = clientBistro!.employees.find((e) => e.lastName === 'Radu');
    trackAssert(Boolean(empRadu), 'Marius Radu must exist');

    const resolvedAdeverinta = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-adeverinta',
      clientId: clientBistro!.id,
      employeeId: empRadu!.id,
    });
    const docAdeverinta = await generateDocument({
      templateCode: 'hygiene-adeverinta',
      clientId: clientBistro!.id,
      employeeId: empRadu!.id,
      data: resolvedAdeverinta.resolvedData,
      operatorName: 'Empirical Challenger',
    });
    trackAssert(docAdeverinta.fileSizeBytes > 0, 'Generated Adeverinta DOCX fileSizeBytes must be > 0');
    trackAssert(docAdeverinta.missingFields.length === 0, 'Adeverinta missingFields must be 0');

    // Clean up test generated documents
    await prisma.generatedDocument.deleteMany({
      where: { id: { in: [docA.documentId, docB.documentId, docAdeverinta.documentId] } },
    });
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log('  EMPIRICAL CHALLENGER VERIFICATION SUMMARY                      ');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Tests:      ${results.length}`);
  console.log(`Passed:           ${passedCount}`);
  console.log(`Failed:           ${failedCount}`);
  console.log(`Total Assertions: ${totalAssertions}`);

  if (failedCount > 0) {
    console.error('\nFAILURES DETECTED:');
    for (const f of results.filter((r) => !r.passed)) {
      console.error(`  - [${f.category}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ ALL EMPIRICAL CHALLENGER ASSERTIONS PASSED WITH ZERO ERRORS.');
  }

  // Restore seed to pristine state
  console.log('\nRestoring database seed to pristine baseline...');
  execSync('npx prisma db seed', { stdio: 'pipe' });
  console.log('Database restored successfully.');
}

main()
  .catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
