/**
 * ============================================================================
 * ADVERSARIAL CHALLENGER TEST SUITE — MILESTONE 3 (M3)
 * Training Module Synchronization & Statutory Docs
 * ============================================================================
 * 
 * Focus Areas:
 * 1. Feature 18: Eliminare Blocaj Expirare Instruire (Catch-22)
 *    - Overdue employee (ssmLastTrainingDate = 14 months ago)
 *    - POST /api/documents/generate -> assert HTTP 200 (NOT blocked with 400)
 *    - POST /api/documents/generate-batch -> assert HTTP 200 (NOT rejected)
 * 2. Participant Scoping & Leak Prevention:
 *    - Client with Emp A and Emp B
 *    - Training event recorded ONLY for Emp A with a unique marker topic
 *    - Generate ssm-fisa-instruire-individuala for Emp B -> assert event does NOT appear
 *    - Generate ssm-fisa-instruire-individuala for Emp A -> assert event DOES appear
 * 3. Feature 14: Real Event Date vs hireDate:
 *    - Employee with hireDate = 2024-01-01, INTRODUCTIV event on 2024-01-05
 *    - Generate ssm-fisa-instruire-individuala -> assert PLACEHOLDER_DATA_INSTRUIRE_IG is 05.01.2024 (NOT 01.01.2024)
 * 4. Future Session Planning Gating (Feature 16):
 *    - Planning session with future date -> HTTP 201, ssmLastTrainingDate NOT modified
 *    - Completed session with future date -> HTTP 400 rejected
 * 5. Negative Controls & Boundaries:
 *    - Terminated employee (PLECAT) remains strictly blocked even for training docs
 *    - Non-training documents remain properly checked
 * ============================================================================
 */

import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { calculateEmployeeCompliance } from '../src/lib/compliance';
import { POST as recordTrainingRoute } from '../src/app/api/trainings/record/route';
import { POST as generateDocumentRoute } from '../src/app/api/documents/generate/route';
import { POST as generateBatchRoute, checkEmployeeTemplateExpiry } from '../src/app/api/documents/generate-batch/route';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';

interface TestAssertionResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const testResults: TestAssertionResult[] = [];

async function testCase(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    testResults.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    testResults.push({ name, passed: false, error: errorMsg });
    console.error(`  [FAIL] ${name}: ${errorMsg}`);
  }
}

function extractDocxText(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = new PizZip(fileBuffer);
  const xml = zip.file('word/document.xml')?.asText() || '';
  // Strip XML tags to get raw visible text content
  return xml.replace(/<[^>]+>/g, ' ');
}

export async function runMilestone3AdversarialTests(): Promise<boolean> {
  console.log('\n================================================================');
  console.log('   M3 ADVERSARIAL CHALLENGER SUITE: EMPIRICAL STRESS TESTS       ');
  console.log('================================================================\n');

  const TEST_CLIENT_CUI = 'RO88776655';
  let clientId: string | null = null;
  const createdDocIds: string[] = [];

  try {
    // 0. Clean up stale test data if present
    const existingClient = await prisma.client.findUnique({ where: { cui: TEST_CLIENT_CUI } });
    if (existingClient) {
      await prisma.client.delete({ where: { id: existingClient.id } });
    }

    // 1. Setup Test Client & Job
    const client = await prisma.client.create({
      data: {
        name: 'ADVERSARIAL TESTING LOGISTICS S.R.L.',
        cui: TEST_CLIENT_CUI,
        regCom: 'J40/9999/2024',
        address: 'București, Sector 1, Str. Testelor nr. 99',
        legalRepresentative: 'Director General Popa',
        caenCode: '4941',
        caenActivity: 'Transporturi rutiere de marfuri',
        designatedWorkerSsm: 'Ing. Mihai Securitate',
        psiResponder: 'Capit. Vasile Pompieru',
        decisionsDate: new Date('2024-01-15T00:00:00.000Z'),
        jobs: {
          create: [
            {
              title: 'Șofer Autotren',
              corCode: '833201',
              isDrivingRequired: true,
            },
          ],
        },
      },
      include: { jobs: true },
    });
    clientId = client.id;
    const testJob = client.jobs[0];

    // =========================================================================
    // SUITE 1: FEATURE 18 — CATCH-22 EXPIRY UNBLOCKING
    // =========================================================================
    console.log('\n--- SUITE 1: Feature 18 — Eliminare Blocaj Expirare Instruire (Catch-22) ---');

    // Create overdue employee: ssmLastTrainingDate = 14 months ago
    const now = new Date();
    const fourteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 14, 15);

    const overdueEmployee = await prisma.employee.create({
      data: {
        clientId: client.id,
        firstName: 'Radu',
        lastName: 'Popa',
        cnp: '1850315123456',
        hireDate: new Date('2022-01-10'),
        currentJobId: testJob.id,
        ssmLastTrainingDate: fourteenMonthsAgo,
        psiLastTrainingDate: fourteenMonthsAgo,
        status: 'ACTIV',
        medicalFitnessVerdict: 'APT',
      },
    });

    await testCase('1.1 Confirm employee compliance is strictly OVERDUE', async () => {
      const comp = calculateEmployeeCompliance(overdueEmployee);
      assert.equal(comp.ssmTraining.status, 'OVERDUE', 'SSM status must be OVERDUE');
      assert.equal(comp.psiTraining.status, 'OVERDUE', 'PSI status must be OVERDUE');
      assert.ok(comp.ssmTraining.daysRemaining !== null && comp.ssmTraining.daysRemaining < -180, 'Must be expired by > 180 days');
    });

    await testCase('1.2 POST /api/documents/generate for overdue employee returns HTTP 200 (NOT blocked with 400)', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeId: overdueEmployee.id,
          jobId: testJob.id,
        }),
      });

      const res = await generateDocumentRoute(req);
      assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true, 'Response must indicate success');
      assert.ok(body.result?.documentId, 'Response must include documentId');
      assert.ok(fs.existsSync(body.result.filePath), 'Generated document file must exist on disk');

      createdDocIds.push(body.result.documentId);

      // Verify that Popa Radu was resolved in docx content
      const text = extractDocxText(body.result.filePath);
      assert.ok(text.includes('Popa Radu') || text.includes('Popa'), 'Employee name must appear in generated training sheet');
    });

    await testCase('1.3 POST /api/documents/generate-batch for overdue employee returns HTTP 200 without rejectedEmployees', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeIds: [overdueEmployee.id],
        }),
      });

      const res = await generateBatchRoute(req);
      assert.equal(res.status, 200, `Batch route must return HTTP 200 for training sheet of overdue employee, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true, 'Batch response must indicate success');
      assert.equal(body.totalGenerated, 1, 'Total generated must be 1');
      assert.equal(body.rejectedEmployees, undefined, 'rejectedEmployees must NOT be returned for training sheets');

      // Verify ZIP file exists
      const zipPath = path.join(process.cwd(), 'storage', 'documents', `batch_${body.batchId}.zip`);
      assert.ok(fs.existsSync(zipPath), 'Batch ZIP file must exist on disk');
      const zipBuffer = fs.readFileSync(zipPath);
      const zip = new PizZip(zipBuffer);
      const files = Object.keys(zip.files);
      assert.ok(files.some((f) => f.includes('Popa_Radu')), 'ZIP must contain Popa Radu training sheet');
    });

    await testCase('1.4 Catch-22 unblocking applies equally to PSI training sheet (psi-fisa-instructaj-individuala)', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'psi-fisa-instructaj-individuala',
          clientId: client.id,
          employeeId: overdueEmployee.id,
          jobId: testJob.id,
        }),
      });

      const res = await generateDocumentRoute(req);
      assert.equal(res.status, 200, `PSI training sheet must return HTTP 200 for overdue employee, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
      createdDocIds.push(body.result.documentId);
    });

    await testCase('1.5 Negative Control: Terminated employee (PLECAT) remains strictly blocked with HTTP 400', async () => {
      const terminatedEmp = await prisma.employee.create({
        data: {
          clientId: client.id,
          firstName: 'Ion',
          lastName: 'Plecatul',
          cnp: '1790101123456',
          hireDate: new Date('2020-01-01'),
          currentJobId: testJob.id,
          status: 'PLECAT',
        },
      });

      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeIds: [terminatedEmp.id],
        }),
      });

      const res = await generateBatchRoute(req);
      assert.equal(res.status, 400, 'Terminated employee must be rejected with HTTP 400');
      const body = await res.json();
      assert.ok(body.error.includes('PLECAT'), 'Error message must specify PLECAT status block');
    });

    // =========================================================================
    // SUITE 2: PARTICIPANT SCOPING & LEAK PREVENTION
    // =========================================================================
    console.log('\n--- SUITE 2: Participant Scoping & Leak Prevention ---');

    // Create Emp A and Emp B
    const empA = await prisma.employee.create({
      data: {
        clientId: client.id,
        firstName: 'Andrei',
        lastName: 'Ionescu',
        cnp: '1900101111111',
        hireDate: new Date('2023-01-15'),
        currentJobId: testJob.id,
        status: 'ACTIV',
      },
    });

    const empB = await prisma.employee.create({
      data: {
        clientId: client.id,
        firstName: 'Elena',
        lastName: 'Vasilescu',
        cnp: '2920202222222',
        hireDate: new Date('2023-02-20'),
        currentJobId: testJob.id,
        status: 'ACTIV',
      },
    });

    const SECRET_TOPIC_A = 'CONFIDENTIAL_TOPIC_SPECIAL_SSM_FOR_EMP_A_ONLY';

    let eventAId: string | null = null;

    await testCase('2.1 Record training event with ONLY Emp A as participant', async () => {
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          trainingType: 'PERIODIC_SSM',
          eventDate: '2024-06-15T09:00:00.000Z',
          durationHours: 4,
          instructorName: 'Ing. Mihai Securitate',
          topicsCovered: SECRET_TOPIC_A,
          participantEmployeeIds: [empA.id], // ONLY Emp A
        }),
      });

      const res = await recordTrainingRoute(req);
      assert.equal(res.status, 201, `Expected HTTP 201, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.eventId);
      eventAId = body.eventId;

      // Verify DB participants
      const participants = await prisma.trainingParticipant.findMany({
        where: { eventId: body.eventId },
      });
      assert.equal(participants.length, 1, 'Event must have exactly 1 participant in DB');
      assert.equal(participants[0].employeeId, empA.id, 'Participant must be Emp A');
    });

    await testCase('2.2 Generate ssm-fisa-instruire-individuala for Emp B: assert event does NOT leak onto Emp B sheet', async () => {
      // 1. Check resolved placeholders
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: empB.id,
      });

      const periodicRows = (resolvedData.instruiriPeriodiceSSM as any[]) || [];
      const hasLeakedInRows = periodicRows.some((r) => r.tematica?.includes(SECRET_TOPIC_A));
      assert.equal(hasLeakedInRows, false, 'Emp A event topic must NOT appear in Emp B resolved periodic rows');

      // 2. Generate actual DOCX
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeId: empB.id,
        }),
      });

      const res = await generateDocumentRoute(req);
      assert.equal(res.status, 200);
      const body = await res.json();
      createdDocIds.push(body.result.documentId);

      const docxText = extractDocxText(body.result.filePath);
      assert.ok(!docxText.includes(SECRET_TOPIC_A), 'Emp B DOCX file must NOT contain Emp A secret topic');
    });

    await testCase('2.3 Generate ssm-fisa-instruire-individuala for Emp A: assert event DOES appear on Emp A sheet', async () => {
      // 1. Check resolved placeholders
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: empA.id,
      });

      const periodicRows = (resolvedData.instruiriPeriodiceSSM as any[]) || [];
      const matchingRow = periodicRows.find((r) => r.tematica?.includes(SECRET_TOPIC_A));
      assert.ok(matchingRow, 'Emp A periodic rows MUST contain the recorded event topic');
      assert.equal(matchingRow.data, '15.06.2024', 'Row data must match formatted eventDate');
      assert.equal(matchingRow.durata, '4 ore', 'Row duration must match event duration');

      // 2. Generate actual DOCX
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeId: empA.id,
        }),
      });

      const res = await generateDocumentRoute(req);
      assert.equal(res.status, 200);
      const body = await res.json();
      createdDocIds.push(body.result.documentId);

      const docxText = extractDocxText(body.result.filePath);
      assert.ok(docxText.includes(SECRET_TOPIC_A), 'Emp A DOCX file MUST contain Emp A secret topic');
    });

    await testCase('2.4 Collective PV (ssm-pv-instruire-colectiva) scopes participants strictly to event attendees', async () => {
      assert.ok(eventAId, 'eventAId must exist');
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-pv-instruire-colectiva',
          clientId: client.id,
          trainingEventId: eventAId,
        }),
      });

      const res = await generateDocumentRoute(req);
      assert.equal(res.status, 200, `Collective PV generation must return HTTP 200, got ${res.status}`);
      const body = await res.json();
      createdDocIds.push(body.result.documentId);

      const docxText = extractDocxText(body.result.filePath);
      assert.ok(docxText.includes('Ionescu Andrei') || docxText.includes('Ionescu'), 'Emp A must appear in collective PV');
      assert.ok(!docxText.includes('Vasilescu Elena') && !docxText.includes('Vasilescu'), 'Emp B must NOT appear in collective PV');
    });

    // =========================================================================
    // SUITE 3: FEATURE 14 — REAL EVENT DATE VS HIREDATE
    // =========================================================================
    console.log('\n--- SUITE 3: Feature 14 — Real Event Date vs hireDate ---');

    // Employee C: hireDate = 2024-01-01
    const empC = await prisma.employee.create({
      data: {
        clientId: client.id,
        firstName: 'Mihai',
        lastName: 'Popescu',
        cnp: '1880404123456',
        hireDate: new Date('2024-01-01T00:00:00.000Z'),
        currentJobId: testJob.id,
        status: 'ACTIV',
      },
    });

    await testCase('3.1 Record INTRODUCTIV event on 2024-01-05 for employee hired on 2024-01-01', async () => {
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'INTRODUCTIV',
          date: '2024-01-05T08:00:00.000Z',
          durationHours: 8,
          trainerName: 'Ing. Mihai Securitate',
          topicsCovered: 'Instruire introductiv generala legislatie si prim ajutor',
          participantIds: [empC.id],
        }),
      });

      const res = await recordTrainingRoute(req);
      assert.equal(res.status, 201, `Recording INTRODUCTIV must return HTTP 201, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    await testCase('3.2 Generate ssm-fisa-instruire-individuala: assert PLACEHOLDER_DATA_INSTRUIRE_IG contains 05.01.2024 (NOT 01.01.2024)', async () => {
      // 1. Resolve placeholders
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: empC.id,
      });

      const igDate = resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG;
      console.log(`    Observed resolved PLACEHOLDER_DATA_INSTRUIRE_IG: "${igDate}"`);

      assert.equal(igDate, '05.01.2024', `Expected PLACEHOLDER_DATA_INSTRUIRE_IG to be '05.01.2024', got '${igDate}'`);
      assert.notEqual(igDate, '01.01.2024', 'Must NOT be employee hireDate (01.01.2024)');

      // 2. Generate actual DOCX
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeId: empC.id,
        }),
      });

      const res = await generateDocumentRoute(req);
      assert.equal(res.status, 200);
      const body = await res.json();
      createdDocIds.push(body.result.documentId);

      const docxText = extractDocxText(body.result.filePath);
      assert.ok(docxText.includes('05.01.2024'), 'DOCX text must contain the real event date 05.01.2024');
    });

    await testCase('3.3 Real Event Date for LOC_MUNCA: assert PLACEHOLDER_DATA_INSTRUIRE_LM is 10.01.2024 (NOT hireDate)', async () => {
      // Record LOC_MUNCA on 2024-01-10
      const reqRecord = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'LOC_MUNCA',
          date: '2024-01-10T08:00:00.000Z',
          durationHours: 8,
          trainerName: 'Ing. Mihai Securitate',
          topicsCovered: 'Instruire la locul de munca riscuri specifice transport',
          participantIds: [empC.id],
        }),
      });

      const resRecord = await recordTrainingRoute(reqRecord);
      assert.equal(resRecord.status, 201);

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: empC.id,
      });

      assert.equal(resolvedData.PLACEHOLDER_DATA_INSTRUIRE_LM, '10.01.2024', 'Must match LOC_MUNCA event date 10.01.2024');
      assert.notEqual(resolvedData.PLACEHOLDER_DATA_INSTRUIRE_LM, '01.01.2024', 'Must not match hireDate');
      assert.equal(resolvedData.PLACEHOLDER_DATA_ADMITERE, '10.01.2024', 'Admitere must match LOC_MUNCA event date');
    });

    await testCase('3.4 Contrast verification: Employee with NO recorded training events correctly falls back to hireDate', async () => {
      const empNoEvents = await prisma.employee.create({
        data: {
          clientId: client.id,
          firstName: 'Dan',
          lastName: 'Georgescu',
          cnp: '1950505123456',
          hireDate: new Date('2024-03-01T00:00:00.000Z'),
          currentJobId: testJob.id,
          status: 'ACTIV',
        },
      });

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: empNoEvents.id,
      });

      const igDate = resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG;
      assert.equal(igDate, '01.03.2024', `Without events, must fall back to hireDate 01.03.2024, got '${igDate}'`);
    });

    // =========================================================================
    // SUITE 4: FUTURE SESSION PLANNING VS COMPLIANCE GATING (FEATURE 16)
    // =========================================================================
    console.log('\n--- SUITE 4: Feature 16 — Future Session Planning vs Compliance Gating ---');

    await testCase('4.1 Planning a future session (+30 days, status: planned) succeeds and does NOT update employee ssmLastTrainingDate', async () => {
      const initialEmp = await prisma.employee.findUnique({ where: { id: empA.id } });
      const initialTrainingDate = initialEmp?.ssmLastTrainingDate;

      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'PERIODIC_SSM',
          date: futureDate.toISOString(),
          durationHours: 2,
          trainerName: 'Ing. Mihai Securitate',
          status: 'planned',
          participantIds: [empA.id],
        }),
      });

      const res = await recordTrainingRoute(req);
      assert.equal(res.status, 201, `Planning future session must return HTTP 201, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.status, 'planned');
      assert.equal(body.updatedEmployeesCount, 0, 'updatedEmployeesCount must be 0 for planned sessions');

      // Verify employee ssmLastTrainingDate was NOT changed
      const updatedEmp = await prisma.employee.findUnique({ where: { id: empA.id } });
      assert.deepEqual(
        updatedEmp?.ssmLastTrainingDate?.toISOString(),
        initialTrainingDate?.toISOString(),
        'Employee ssmLastTrainingDate must NOT be modified by planned future training'
      );
    });

    await testCase('4.2 Recording completed session with future date is strictly rejected with HTTP 400', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'PERIODIC_SSM',
          date: futureDate.toISOString(),
          durationHours: 2,
          trainerName: 'Ing. Mihai Securitate',
          status: 'completed', // completed cannot be future
          participantIds: [empA.id],
        }),
      });

      const res = await recordTrainingRoute(req);
      assert.equal(res.status, 400, `Completed future training must return HTTP 400, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.error, 'Data instruirii nu poate fi în viitor.');
    });

    await testCase('4.3 Planning session beyond 365 days into the future is rejected with HTTP 400', async () => {
      const beyondMaxFuture = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);

      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'PERIODIC_SSM',
          date: beyondMaxFuture.toISOString(),
          durationHours: 2,
          trainerName: 'Ing. Mihai Securitate',
          status: 'planned',
          participantIds: [empA.id],
        }),
      });

      const res = await recordTrainingRoute(req);
      assert.equal(res.status, 400, `Session > 365 days ahead must return HTTP 400, got ${res.status}`);
    });

    // =========================================================================
    // SUITE 5: ADVERSARIAL EDGE CASES & INTEGRITY GUARDS
    // =========================================================================
    console.log('\n--- SUITE 5: Adversarial Edge Cases & Integrity Guards ---');

    await testCase('5.1 Batch generation handles mixed compliance (OVERDUE + ACTIVE) for training sheets without rejection', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client.id,
          employeeIds: [overdueEmployee.id, empA.id, empC.id],
        }),
      });

      const res = await generateBatchRoute(req);
      assert.equal(res.status, 200, `Mixed batch must return HTTP 200, got ${res.status}`);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.totalGenerated, 3, 'All 3 employees must be generated');
      assert.equal(body.rejectedEmployees, undefined);
    });

    await testCase('5.2 Collective PV table masks CNPs for employee data privacy', async () => {
      assert.ok(eventAId);
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'ssm-pv-instruire-colectiva',
        clientId: client.id,
        trainingEventId: eventAId,
      });

      const participanti = resolvedData.participanti as any[];
      assert.ok(Array.isArray(participanti) && participanti.length > 0, 'Participanti array must be populated');
      const p1 = participanti[0];
      assert.ok(p1.cnp.includes('*'), `CNP must be masked with *, got: ${p1.cnp}`);
      assert.notEqual(p1.cnp, empA.cnp, 'CNP must NOT be raw unmasked CNP');
    });

    await testCase('5.3 Overdue SSM training STILL blocks non-training documents (protection is preserved)', async () => {
      const comp = calculateEmployeeCompliance(overdueEmployee);
      // Non-training document check: e.g. general SSM decision/instruction template
      const expiryCheck = checkEmployeeTemplateExpiry('ssm-decizie-lucrator-desemnat', comp, overdueEmployee);
      assert.equal(expiryCheck.isExpired, true, 'Non-training document must be expired for overdue employee');
      assert.ok(expiryCheck.reason?.includes('Instructajul SSM este expirat'), 'Must cite HG 1425/2006 expiry reason');
    });

  } finally {
    // Clean up test client and all cascaded entities
    if (clientId) {
      try {
        await prisma.client.delete({ where: { id: clientId } });
      } catch (cleanErr) {
        console.warn('Failed to clean up test client:', cleanErr);
      }
    }
    // Clean up created test document files
    for (const docId of createdDocIds) {
      const docPath = path.join(process.cwd(), 'storage', 'documents', `${docId}.docx`);
      if (fs.existsSync(docPath)) {
        try {
          fs.unlinkSync(docPath);
        } catch (_) {}
      }
    }
  }

  // Summary
  console.log('\n================================================================');
  console.log('   M3 ADVERSARIAL TEST RESULTS SUMMARY                           ');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log(`Total tests:  ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error('\nFAILING TESTS:');
    for (const r of testResults.filter((t) => !t.passed)) {
      console.error(`- ${r.name}: ${r.error}`);
    }
    return false;
  }

  console.log('\nALL ADVERSARIAL CHALLENGER TESTS PASSED SUCCESSFULLY!');
  return true;
}

// Direct CLI invocation
if (require.main === module || process.argv[1]?.includes('adversarial-challenger2-m3')) {
  runMilestone3AdversarialTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal test runner error:', err);
      process.exit(1);
    });
}
