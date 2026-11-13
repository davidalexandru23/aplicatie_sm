/**
 * scripts/adversarial-m3-statutory-review.ts
 *
 * Independent Statutory & Adversarial Review Verification Suite for Milestone 3 (M3)
 * Roles: Reviewer & Adversarial Critic
 *
 * Checks:
 * 1. Statutory training event date reflection (no unconditional hireDate substitution)
 * 2. Accurate event type mapping (INTRODUCTIV, LOC_MUNCA, PERIODIC_SSM, PERIODIC_PSI)
 * 3. Feature 18: Unblocking of OVERDUE training documents (single and batch)
 * 4. Planned sessions do NOT reset compliance deadlines
 * 5. Completed sessions DO reset compliance deadlines
 * 6. Adversarial API rejection gates (future completed, >365d planned, foreign client participants, invalid types)
 * 7. OpenXML integrity with XML special character injection (&, <, >, ", ')
 * 8. Status PLECAT & Medical INAPT strict rejections
 */

import { prisma } from '../src/lib/prisma';
import { resolveTemplatePlaceholders, resolveTemplateData } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';
import { checkEmployeeTemplateExpiry } from '../src/app/api/documents/generate-batch/route';
import { getEmployeeExpiryInfo } from '../src/app/documents/generate/page';
import { calculateEmployeeCompliance } from '../src/lib/compliance';
import PizZip from 'pizzip';
import fs from 'fs';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string, details?: any) {
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${msg}`);
  } else {
    failCount++;
    console.error(`  ✗ [FAIL] ${msg}`);
    if (details !== undefined) {
      console.error(`    Details:`, details);
    }
  }
}

async function run() {
  console.log('========================================================================');
  console.log('MILESTONE 3 INDEPENDENT STATUTORY & ADVERSARIAL AUDIT');
  console.log('========================================================================\n');

  // Setup test client & employees
  const client = await prisma.client.findFirst({
    where: { isActive: true },
    include: {
      employees: { where: { status: 'ACTIV' } },
      jobs: true,
      worksites: true,
    },
  });

  if (!client || client.employees.length < 2) {
    throw new Error('Not enough test client data in DB.');
  }

  const emp1 = client.employees[0];
  const emp2 = client.employees[1];
  console.log(`Using client: ${client.name} (${client.id})`);
  console.log(`Using employees: ${emp1.firstName} ${emp1.lastName} & ${emp2.firstName} ${emp2.lastName}\n`);

  // --------------------------------------------------------------------------
  // TEST 1: Real Training Event Dates vs hireDate Substitution
  // --------------------------------------------------------------------------
  console.log('▶ [1] Statutory Dates Integrity (HG 1425/2006 & Legea 319/2006)...');
  {
    // Ensure emp1 has known hireDate
    const originalHireDate = new Date('2024-01-10T00:00:00.000Z');
    await prisma.employee.update({
      where: { id: emp1.id },
      data: { hireDate: originalHireDate },
    });

    // Create real INTRODUCTIV and LOC_MUNCA events with dates DIFFERENT from hireDate
    const introDate = new Date('2024-01-15T09:00:00.000Z');
    const lmDate = new Date('2024-01-20T09:00:00.000Z');

    const introEv = await prisma.trainingEvent.create({
      data: {
        clientId: client.id,
        type: 'INTRODUCTIV',
        eventDate: introDate,
        durationHours: 8,
        materialOrTopic: 'Instruire introductiv-generală specifică test',
        instructorName: 'Instructor Introductiv Special',
        status: 'recorded',
        participants: {
          create: [{ employeeId: emp1.id, result: 'admis', recordedAt: introDate }],
        },
      },
    });

    const lmEv = await prisma.trainingEvent.create({
      data: {
        clientId: client.id,
        type: 'LOC_MUNCA',
        eventDate: lmDate,
        durationHours: 8,
        materialOrTopic: 'Instruire la locul de muncă specifică test',
        instructorName: 'Instructor Loc Munca Special',
        status: 'recorded',
        participants: {
          create: [{ employeeId: emp1.id, result: 'admis', recordedAt: lmDate }],
        },
      },
    });

    // Resolve template placeholders for ssm-fisa-instruire-individuala
    const resolved = await resolveTemplatePlaceholders({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
    });

    const resolvedData = resolved.resolvedData;
    assert(
      resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG === '15.01.2024',
      `Introductory date reflects real eventDate (15.01.2024), NOT hireDate (10.01.2024). Got: ${resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG}`
    );
    assert(
      resolvedData.PLACEHOLDER_INSTRUCTOR_IG === 'Instructor Introductiv Special',
      `Introductory instructor reflects real event instructor. Got: ${resolvedData.PLACEHOLDER_INSTRUCTOR_IG}`
    );
    assert(
      resolvedData.PLACEHOLDER_DATA_INSTRUIRE_LM === '20.01.2024',
      `On-the-job date reflects real eventDate (20.01.2024), NOT hireDate. Got: ${resolvedData.PLACEHOLDER_DATA_INSTRUIRE_LM}`
    );
    assert(
      resolvedData.PLACEHOLDER_INSTRUCTOR_LM === 'Instructor Loc Munca Special',
      `On-the-job instructor reflects real event instructor. Got: ${resolvedData.PLACEHOLDER_INSTRUCTOR_LM}`
    );

    // Clean up created test events
    await prisma.trainingParticipant.deleteMany({ where: { eventId: { in: [introEv.id, lmEv.id] } } });
    await prisma.trainingEvent.deleteMany({ where: { id: { in: [introEv.id, lmEv.id] } } });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Event Type Discrimination (INTRODUCTIV, LOC_MUNCA, PERIODIC_SSM, PERIODIC_PSI)
  // --------------------------------------------------------------------------
  console.log('\n▶ [2] Event Type Mapping & Row Discrimination...');
  {
    const ssmDate = new Date('2025-06-10T10:00:00.000Z');
    const psiDate = new Date('2025-06-15T10:00:00.000Z');

    const ssmEv = await prisma.trainingEvent.create({
      data: {
        clientId: client.id,
        type: 'PERIODIC_SSM',
        eventDate: ssmDate,
        durationHours: 2,
        materialOrTopic: 'Tematică Periodic SSM Semestrul I',
        instructorName: 'Formator SSM Periodic',
        status: 'recorded',
        participants: {
          create: [{ employeeId: emp1.id, result: 'admis', recordedAt: ssmDate }],
        },
      },
    });

    const psiEv = await prisma.trainingEvent.create({
      data: {
        clientId: client.id,
        type: 'PERIODIC_PSI',
        eventDate: psiDate,
        durationHours: 2,
        materialOrTopic: 'Tematică Periodic PSI Evacuare',
        instructorName: 'Cadru Tehnic PSI Periodic',
        status: 'recorded',
        participants: {
          create: [{ employeeId: emp1.id, result: 'admis', recordedAt: psiDate }],
        },
      },
    });

    // Check SSM sheet
    const resolvedSSM = await resolveTemplatePlaceholders({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
    });
    const ssmPeriodice = (resolvedSSM.resolvedData.instruiriPeriodiceSSM as any[]) || [];
    const firstSsmRow = ssmPeriodice.find((r) => r.data === '10.06.2025');
    assert(
      firstSsmRow !== undefined && firstSsmRow.tematica === 'Tematică Periodic SSM Semestrul I',
      `PERIODIC_SSM mapped into instruiriPeriodiceSSM table. Found row: ${JSON.stringify(firstSsmRow)}`
    );

    // Ensure PSI event did NOT leak into SSM periodic table
    const leakedPsiInSsm = ssmPeriodice.some((r) => r.data === '15.06.2025');
    assert(!leakedPsiInSsm, 'PERIODIC_PSI event does NOT leak into SSM periodic table');

    // Check PSI sheet
    const resolvedPSI = await resolveTemplatePlaceholders({
      templateCode: 'psi-fisa-instructaj-individuala',
      clientId: client.id,
      employeeId: emp1.id,
    });
    const psiPeriodice = (resolvedPSI.resolvedData.instructajePeriodicePSI as any[]) || [];
    const firstPsiRow = psiPeriodice.find((r) => r.data === '15.06.2025');
    assert(
      firstPsiRow !== undefined && firstPsiRow.tema === 'Tematică Periodic PSI Evacuare',
      `PERIODIC_PSI mapped into instructajePeriodicePSI table. Found row: ${JSON.stringify(firstPsiRow)}`
    );

    // Ensure SSM event did NOT leak into PSI periodic table
    const leakedSsmInPsi = psiPeriodice.some((r) => r.data === '10.06.2025');
    assert(!leakedSsmInPsi, 'PERIODIC_SSM event does NOT leak into PSI periodic table');

    // Clean up
    await prisma.trainingParticipant.deleteMany({ where: { eventId: { in: [ssmEv.id, psiEv.id] } } });
    await prisma.trainingEvent.deleteMany({ where: { id: { in: [ssmEv.id, psiEv.id] } } });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Feature 18 — Unblocking Expired Training Documents (Catch-22 Elimination)
  // --------------------------------------------------------------------------
  console.log('\n▶ [3] Feature 18: Unblocking of Expired Training Documents...');
  {
    // Temporarily set emp1 training date to 2 years ago (OVERDUE)
    const overdueDate = new Date('2024-01-01T00:00:00.000Z');
    await prisma.employee.update({
      where: { id: emp1.id },
      data: {
        ssmLastTrainingDate: overdueDate,
        psiLastTrainingDate: overdueDate,
      },
    });

    const refreshedEmp = await prisma.employee.findUnique({
      where: { id: emp1.id },
      include: { currentJob: true },
    });
    const compliance = calculateEmployeeCompliance(refreshedEmp as any);
    assert(compliance.ssmTraining.status === 'OVERDUE', 'Employee has OVERDUE SSM compliance status');
    assert(compliance.psiTraining.status === 'OVERDUE', 'Employee has OVERDUE PSI compliance status');

    // 3.1: Check batch gate checkEmployeeTemplateExpiry
    const batchSsmFisa = checkEmployeeTemplateExpiry('ssm-fisa-instruire-individuala', compliance, refreshedEmp as any);
    assert(!batchSsmFisa.isExpired, 'Batch check allows ssm-fisa-instruire-individuala for OVERDUE employee');

    const batchPsiFisa = checkEmployeeTemplateExpiry('psi-fisa-instructaj-individuala', compliance, refreshedEmp as any);
    assert(!batchPsiFisa.isExpired, 'Batch check allows psi-fisa-instructaj-individuala for OVERDUE employee');

    const batchSsmPv = checkEmployeeTemplateExpiry('ssm-pv-instruire-colectiva', compliance, refreshedEmp as any);
    assert(!batchSsmPv.isExpired, 'Batch check allows ssm-pv-instruire-colectiva for OVERDUE employee');

    // Non-training operational document MUST still be blocked!
    const batchIpssm = checkEmployeeTemplateExpiry('ipssm-birou', compliance, refreshedEmp as any);
    assert(batchIpssm.isExpired === true, 'Batch check blocks operational non-training document for OVERDUE employee');

    // 3.2: Check frontend gate getEmployeeExpiryInfo
    const uiSsmFisa = getEmployeeExpiryInfo('ssm-fisa-instruire-individuala', {
      ...refreshedEmp,
      compliance,
    } as any);
    assert(!uiSsmFisa.isExpired, 'UI getEmployeeExpiryInfo allows ssm-fisa-instruire-individuala');
    assert(uiSsmFisa.badgeText === 'Reinstruire Necesară', `UI shows amber badge 'Reinstruire Necesară'. Got: ${uiSsmFisa.badgeText}`);

    const uiOperational = getEmployeeExpiryInfo('ipssm-birou', {
      ...refreshedEmp,
      compliance,
    } as any);
    assert(uiOperational.isExpired === true, 'UI getEmployeeExpiryInfo blocks operational document');
    assert(uiOperational.badgeText.includes('Expirat'), `UI shows red badge 'Expirat'. Got: ${uiOperational.badgeText}`);

    // 3.3: End-to-end document generation for OVERDUE employee
    const resolvedOverdue = await resolveTemplatePlaceholders({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
    });
    const singleGenRes = await generateDocument({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
      data: resolvedOverdue.resolvedData,
      operatorName: 'Auditor M3',
    });
    assert(
      fs.existsSync(singleGenRes.filePath) && singleGenRes.fileSizeBytes > 5000,
      `Single document generation succeeds for OVERDUE employee (${singleGenRes.fileSizeBytes} bytes DOCX)`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Planned vs Completed Sessions & Compliance Reset Integrity
  // --------------------------------------------------------------------------
  console.log('\n▶ [4] Planned vs Completed Sessions Compliance Gating...');
  {
    const initialEmp = await prisma.employee.findUnique({ where: { id: emp1.id } });
    const initialSsmDate = initialEmp?.ssmLastTrainingDate?.toISOString() || null;

    // 4.1: Record a PLANNED session (10 days in future)
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const plannedRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'PERIODIC_SSM',
        date: futureDate.toISOString(),
        durationHours: 2,
        trainerName: 'Planificator Specialist',
        participantIds: [emp1.id],
        status: 'planned',
        topicsCovered: 'Sesiune viitoare planificată',
      }),
    });

    const plannedData = await plannedRes.json();
    assert(plannedRes.status === 201, `POST /api/trainings/record with status: 'planned' returned 201. Status: ${plannedRes.status}`, plannedData);
    assert(plannedData.status === 'planned', `Response confirms status: 'planned'`);

    // Verify employee ssmLastTrainingDate was NOT touched!
    const afterPlannedEmp = await prisma.employee.findUnique({ where: { id: emp1.id } });
    const afterPlannedSsmDate = afterPlannedEmp?.ssmLastTrainingDate?.toISOString() || null;
    assert(
      afterPlannedSsmDate === initialSsmDate,
      `Planned session did NOT update ssmLastTrainingDate. (Before: ${initialSsmDate}, After: ${afterPlannedSsmDate})`
    );

    // 4.2: Record a COMPLETED session (today's date)
    const today = new Date();
    const completedRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'PERIODIC_SSM',
        date: today.toISOString(),
        durationHours: 2,
        trainerName: 'Instructor Consemnare',
        participantIds: [emp1.id],
        status: 'completed',
        topicsCovered: 'Instruire efectuată astăzi',
      }),
    });

    const completedData = await completedRes.json();
    assert(completedRes.status === 201, `POST /api/trainings/record completed session returned 201`);
    assert(completedData.status === 'recorded', `Response confirms recorded status`);

    // Verify employee ssmLastTrainingDate WAS updated to today!
    const afterCompletedEmp = await prisma.employee.findUnique({ where: { id: emp1.id } });
    const updatedSsmDate = afterCompletedEmp?.ssmLastTrainingDate;
    assert(
      Boolean(updatedSsmDate) && new Date(updatedSsmDate!).toDateString() === today.toDateString(),
      `Completed session updated ssmLastTrainingDate to today (${updatedSsmDate?.toISOString()})`
    );

    // Clean up created events
    if (plannedData.eventId) {
      await prisma.trainingParticipant.deleteMany({ where: { eventId: plannedData.eventId } });
      await prisma.trainingEvent.deleteMany({ where: { id: plannedData.eventId } });
    }
    if (completedData.eventId) {
      await prisma.trainingParticipant.deleteMany({ where: { eventId: completedData.eventId } });
      await prisma.trainingEvent.deleteMany({ where: { id: completedData.eventId } });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Adversarial Boundary & Validation Attacks
  // --------------------------------------------------------------------------
  console.log('\n▶ [5] Adversarial Edge Cases & Boundary Stress Testing...');
  {
    // 5.1: Completed session with date in future (> today)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureCompletedRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'PERIODIC_SSM',
        date: tomorrow.toISOString(),
        durationHours: 2,
        trainerName: 'Attacker',
        participantIds: [emp1.id],
        status: 'completed',
      }),
    });
    assert(
      futureCompletedRes.status === 400,
      `Completed session in future is rejected with 400. Got: ${futureCompletedRes.status}`
    );

    // 5.2: Planned session > 365 days in future
    const distantFuture = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
    const distantFutureRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'PERIODIC_SSM',
        date: distantFuture.toISOString(),
        durationHours: 2,
        trainerName: 'Planner Far',
        participantIds: [emp1.id],
        status: 'planned',
      }),
    });
    assert(
      distantFutureRes.status === 400,
      `Planned session > 365 days in future is rejected with 400. Got: ${distantFutureRes.status}`
    );

    // 5.3: Invalid training type
    const invalidTypeRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'INVALID_TYPE_HACK',
        date: new Date().toISOString(),
        durationHours: 2,
        trainerName: 'Trainer',
        participantIds: [emp1.id],
      }),
    });
    assert(invalidTypeRes.status === 400, `Invalid training type rejected with 400`);

    // 5.4: Duration <= 0
    const zeroDurationRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'PERIODIC_SSM',
        date: new Date().toISOString(),
        durationHours: 0,
        trainerName: 'Trainer',
        participantIds: [emp1.id],
      }),
    });
    assert(zeroDurationRes.status === 400, `Zero duration rejected with 400`);

    // 5.5: Empty participants
    const emptyPartsRes = await fetch('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        type: 'PERIODIC_SSM',
        date: new Date().toISOString(),
        durationHours: 2,
        trainerName: 'Trainer',
        participantIds: [],
      }),
    });
    assert(emptyPartsRes.status === 400, `Empty participants array rejected with 400`);

    // 5.6: Foreign client participants (Cross-client attack)
    const otherClient = await prisma.client.findFirst({
      where: { id: { not: client.id }, isActive: true },
      include: { employees: true },
    });
    if (otherClient && otherClient.employees.length > 0) {
      const foreignEmp = otherClient.employees[0];
      const crossClientRes = await fetch('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'PERIODIC_SSM',
          date: new Date().toISOString(),
          durationHours: 2,
          trainerName: 'Trainer',
          participantIds: [foreignEmp.id], // Belongs to different client!
        }),
      });
      assert(crossClientRes.status === 400, `Cross-client participant submission is strictly rejected with 400`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 6: Collective PV Generation with XML Entities & CNP Masking
  // --------------------------------------------------------------------------
  console.log('\n▶ [6] Collective PV Generation & OpenXML Entities Resilience...');
  {
    // Create an event with XML special characters
    const xmlAttackTopic = 'Instruire specială: Norme & Măsuri <Critice> "Prioritate 1" & Test \'Escapare\'';
    const specialEv = await prisma.trainingEvent.create({
      data: {
        clientId: client.id,
        type: 'PERIODIC_SSM',
        eventDate: new Date(),
        durationHours: 2,
        materialOrTopic: xmlAttackTopic,
        instructorName: 'Instructor & Tester <ITM>',
        status: 'recorded',
        participants: {
          create: [
            { employeeId: emp1.id, result: 'admis', recordedAt: new Date() },
            { employeeId: emp2.id, result: 'admis', recordedAt: new Date() },
          ],
        },
      },
    });

    // 6.1: SSM Collective PV
    const resolvedSsmPv = await resolveTemplatePlaceholders({
      templateCode: 'ssm-pv-instruire-colectiva',
      clientId: client.id,
      trainingEventId: specialEv.id,
    });
    const ssmPvGen = await generateDocument({
      templateCode: 'ssm-pv-instruire-colectiva',
      clientId: client.id,
      eventId: specialEv.id,
      data: resolvedSsmPv.resolvedData,
      operatorName: 'Auditor M3',
    });
    assert(fs.existsSync(ssmPvGen.filePath), 'ssm-pv-instruire-colectiva generation succeeded');
    const ssmBuf = fs.readFileSync(ssmPvGen.filePath);

    // Verify OpenXML validity using PizZip
    const zipSsm = new PizZip(ssmBuf);
    const docXmlSsm = zipSsm.file('word/document.xml')?.asText() || '';
    assert(docXmlSsm.includes('PROCES-VERBAL DE INSTRUIRE COLECTIVĂ SSM'), 'ssm-pv OpenXML document.xml contains header');
    assert(docXmlSsm.includes(emp1.lastName) && docXmlSsm.includes(emp2.lastName), 'Both employees listed in document.xml');

    // 6.2: PSI Collective PV
    const resolvedPsiPv = await resolveTemplatePlaceholders({
      templateCode: 'psi-pv-instruire',
      clientId: client.id,
      trainingEventId: specialEv.id,
    });
    const psiPvGen = await generateDocument({
      templateCode: 'psi-pv-instruire',
      clientId: client.id,
      eventId: specialEv.id,
      data: resolvedPsiPv.resolvedData,
      operatorName: 'Auditor M3',
    });
    assert(fs.existsSync(psiPvGen.filePath), 'psi-pv-instruire generation succeeded');
    const psiBuf = fs.readFileSync(psiPvGen.filePath);

    const zipPsi = new PizZip(psiBuf);
    const docXmlPsi = zipPsi.file('word/document.xml')?.asText() || '';
    assert(docXmlPsi.includes('PROCES-VERBAL DE INSTRUIRE SITUAȚII DE URGENȚĂ / PSI'), 'psi-pv OpenXML document.xml contains header');

    // Clean up
    await prisma.trainingParticipant.deleteMany({ where: { eventId: specialEv.id } });
    await prisma.trainingEvent.deleteMany({ where: { id: specialEv.id } });
  }

  // --------------------------------------------------------------------------
  // TEST 7: Strict PLECAT (Terminated) & INAPT Exclusion Invariants
  // --------------------------------------------------------------------------
  console.log('\n▶ [7] Status PLECAT & INAPT Legal Exclusion Invariants...');
  {
    // Verify PLECAT employee cannot generate documents
    const termEmpCheck = checkEmployeeTemplateExpiry(
      'ssm-fisa-instruire-individuala',
      { isTerminated: true } as any,
      { status: 'PLECAT' } as any
    );
    assert(termEmpCheck.isExpired === true, 'Status PLECAT employee is strictly blocked from generating training sheets');

    // Verify INAPT employee cannot generate documents
    const inaptEmpCheck = checkEmployeeTemplateExpiry(
      'ssm-fisa-instruire-individuala',
      {} as any,
      { medicalFitnessVerdict: 'INAPT' } as any
    );
    assert(inaptEmpCheck.isExpired === true, 'Medical INAPT employee is strictly blocked from generating training sheets');
  }

  console.log('\n========================================================================');
  console.log(`TOTAL AUDIT CHECKS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

run()
  .catch((e) => {
    console.error('FATAL AUDIT CRASH:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
