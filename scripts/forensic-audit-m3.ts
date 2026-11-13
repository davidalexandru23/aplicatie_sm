import assert from 'node:assert';
import fs from 'node:fs';
import { prisma } from '../src/lib/prisma';
import { NextRequest } from 'next/server';
import { POST as recordTraining } from '../src/app/api/trainings/record/route';
import { resolveTemplatePlaceholders, resolveTemplateData } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';
import { checkEmployeeTemplateExpiry } from '../src/app/api/documents/generate-batch/route';
import { calculateEmployeeCompliance } from '../src/lib/compliance';
import PizZip from 'pizzip';

async function runForensicAudit() {
  console.log('================================================================================');
  console.log('FORENSIC INTEGRITY AUDIT — MILESTONE 3 (TRAINING MODULE & STATUTORY DOCS)');
  console.log('================================================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function recordPass(desc: string) {
    passedChecks++;
    totalChecks++;
    console.log(`  ✓ PASS: ${desc}`);
  }

  function recordFail(desc: string, err: any) {
    totalChecks++;
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(err);
  }

  // 1. Setup client and employees for testing
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'NEXUS' } },
    include: {
      employees: {
        where: { status: 'ACTIV' },
        include: { currentJob: true, identityDocument: true },
      },
    },
  });

  assert(client, 'NEXUS test client must exist');
  assert(client.employees.length >= 2, 'Client must have at least 2 active employees');

  const emp1 = client.employees[0];
  const emp2 = client.employees[1];
  const originalSsmDate1 = emp1.ssmLastTrainingDate;
  const originalPsiDate1 = emp1.psiLastTrainingDate;

  console.log('--- PHASE 1: API /api/trainings/record Endpoint Verification ---');

  // Check 1.1: Reject invalid client
  try {
    const req = new NextRequest('http://localhost/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: 'invalid-client-id-000',
        trainingType: 'PERIODIC_SSM',
        eventDate: '2026-05-01',
        durationHours: 2,
        instructorName: 'Test Instructor',
        participantEmployeeIds: [emp1.id],
      }),
    });
    const res = await recordTraining(req);
    assert.strictEqual(res.status, 404, 'Must return 404 for non-existent client');
    recordPass('Reject non-existent client with HTTP 404');
  } catch (err) {
    recordFail('Reject non-existent client with HTTP 404', err);
  }

  // Check 1.2: Reject employee not belonging to client
  try {
    const otherClient = await prisma.client.findFirst({
      where: { id: { not: client.id } },
      include: { employees: true },
    });
    if (otherClient && otherClient.employees.length > 0) {
      const foreignEmp = otherClient.employees[0];
      const req = new NextRequest('http://localhost/api/trainings/record', {
        method: 'POST',
        body: JSON.stringify({
          clientId: client.id,
          trainingType: 'PERIODIC_SSM',
          eventDate: '2026-05-01',
          durationHours: 2,
          instructorName: 'Test Instructor',
          participantEmployeeIds: [emp1.id, foreignEmp.id],
        }),
      });
      const res = await recordTraining(req);
      assert.strictEqual(res.status, 400, 'Must return 400 for foreign employee');
      recordPass('Reject employee not belonging to client with HTTP 400');
    }
  } catch (err) {
    recordFail('Reject employee not belonging to client with HTTP 400', err);
  }

  // Check 1.3: Plan future session (status: "planned")
  let plannedEventId = '';
  try {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const req = new NextRequest('http://localhost/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: client.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: futureDate,
        durationHours: 2,
        instructorName: 'Ing. Planificator Viitor',
        participantEmployeeIds: [emp1.id, emp2.id],
        status: 'planned',
        materialOrTopic: 'Instruire Planificată Viitoare SSM',
      }),
    });
    const res = await recordTraining(req);
    assert.strictEqual(res.status, 201, 'Must return 201 Created for planned session');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'planned');
    plannedEventId = data.eventId;

    // Verify DB state: event status is 'planned'
    const dbEvent = await prisma.trainingEvent.findUnique({
      where: { id: plannedEventId },
      include: { participants: true },
    });
    assert(dbEvent, 'Event must exist in DB');
    assert.strictEqual(dbEvent.status, 'planned');
    assert.strictEqual(dbEvent.participants.length, 2);

    // Verify participant employee ssmLastTrainingDate is NOT updated
    const freshEmp1 = await prisma.employee.findUnique({ where: { id: emp1.id } });
    const freshEmpDate = freshEmp1?.ssmLastTrainingDate ? freshEmp1.ssmLastTrainingDate.toISOString() : null;
    const origEmpDate = originalSsmDate1 ? originalSsmDate1.toISOString() : null;
    assert.strictEqual(freshEmpDate, origEmpDate, 'ssmLastTrainingDate must NOT be updated for planned sessions');
    recordPass('Plan future session: creates event as planned, does NOT touch employee last training date');
  } catch (err) {
    recordFail('Plan future session', err);
  }

  // Check 1.4: Reject future session > 365 days ahead
  try {
    const farFutureDate = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const req = new NextRequest('http://localhost/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: client.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: farFutureDate,
        durationHours: 2,
        instructorName: 'Test Instructor',
        participantEmployeeIds: [emp1.id],
        status: 'planned',
      }),
    });
    const res = await recordTraining(req);
    assert.strictEqual(res.status, 400, 'Must return 400 for date > 365 days in future');
    recordPass('Reject planned session > 365 days in future with HTTP 400');
  } catch (err) {
    recordFail('Reject planned session > 365 days in future with HTTP 400', err);
  }

  // Check 1.5: Reject completed session with future date
  try {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const req = new NextRequest('http://localhost/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: client.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: futureDate,
        durationHours: 2,
        instructorName: 'Test Instructor',
        participantEmployeeIds: [emp1.id],
        status: 'completed',
      }),
    });
    const res = await recordTraining(req);
    assert.strictEqual(res.status, 400, 'Must return 400 for completed session with future date');
    const data = await res.json();
    assert.strictEqual(data.error, 'Data instruirii nu poate fi în viitor.');
    recordPass('Reject completed session with future date with HTTP 400 ("Data instruirii nu poate fi în viitor.")');
  } catch (err) {
    recordFail('Reject completed session with future date with HTTP 400', err);
  }

  // Check 1.6: Record completed session (updates employee last training date)
  let recordedEventId = '';
  const recordedDate = new Date().toISOString().split('T')[0];
  try {
    const req = new NextRequest('http://localhost/api/trainings/record', {
      method: 'POST',
      body: JSON.stringify({
        clientId: client.id,
        trainingType: 'PERIODIC_SSM',
        eventDate: recordedDate,
        durationHours: 2,
        instructorName: 'Ing. Formator Consemnare',
        participantEmployeeIds: [emp1.id],
        status: 'completed',
        materialOrTopic: 'Instruire Consemnată Efectiv SSM',
      }),
    });
    const res = await recordTraining(req);
    assert.strictEqual(res.status, 201, 'Must return 201 Created for recorded session');
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'recorded');
    recordedEventId = data.eventId;

    // Verify DB state: employee ssmLastTrainingDate IS updated
    const freshEmp1 = await prisma.employee.findUnique({ where: { id: emp1.id } });
    assert(freshEmp1?.ssmLastTrainingDate, 'ssmLastTrainingDate must be populated');
    const dateStr = freshEmp1.ssmLastTrainingDate.toISOString().split('T')[0];
    assert.strictEqual(dateStr, recordedDate, 'ssmLastTrainingDate must match eventDate');
    recordPass('Record completed session: creates event as recorded, updates employee last training date');
  } catch (err) {
    recordFail('Record completed session', err);
  }

  console.log('\n--- PHASE 2: Collective PV Document Generation Verification ---');

  // Check 2.1: ssm-pv-instruire-colectiva generation
  try {
    const resolved = await resolveTemplatePlaceholders({
      templateCode: 'ssm-pv-instruire-colectiva',
      clientId: client.id,
      trainingEventId: plannedEventId || recordedEventId,
    });

    assert(resolved.template, 'Template definition must be resolved');
    assert.strictEqual(resolved.template.code, 'ssm-pv-instruire-colectiva');
    assert(resolved.resolvedData.PLACEHOLDER_FIRMA, 'Company name placeholder must be populated');
    assert(resolved.resolvedData.PLACEHOLDER_CUI, 'CUI placeholder must be populated');
    assert(resolved.resolvedData.PLACEHOLDER_INSTRUCTOR, 'Instructor placeholder must be populated');
    assert(Array.isArray(resolved.resolvedData.participanti), 'participanti collection array must exist');
    assert((resolved.resolvedData.participanti as any[]).length >= 1, 'participanti must have rows');

    const participant0 = (resolved.resolvedData.participanti as any[])[0];
    assert(participant0.numeComplet, 'Participant must have numeComplet');
    assert(participant0.nr === 1, 'First participant must have nr === 1');
    assert(participant0.rezultat, 'Participant must have rezultat');

    // Generate binary
    const docxResult = await generateDocument({
      templateCode: 'ssm-pv-instruire-colectiva',
      clientId: client.id,
      eventId: plannedEventId || recordedEventId,
      data: resolved.resolvedData,
      operatorName: 'Forensic Auditor',
    });

    assert(docxResult.fileSizeBytes > 5000, 'DOCX binary fileSizeBytes must be > 5KB');
    const docxBuffer = fs.readFileSync(docxResult.filePath);
    assert(docxBuffer.length > 5000, 'DOCX binary buffer must be valid and > 5KB');

    // Inspect binary with PizZip
    const zip = new PizZip(docxBuffer);
    const docXml = zip.file('word/document.xml')?.asText();
    assert(docXml, 'word/document.xml must exist in docx archive');
    assert(!docXml.includes('{PLACEHOLDER_FIRMA}'), 'Token {PLACEHOLDER_FIRMA} must be replaced');
    assert(!docXml.includes('{#participanti}'), 'Collection loop {#participanti} must be evaluated');
    assert(docXml.includes(participant0.numeComplet), `Document must contain participant name "${participant0.numeComplet}"`);

    recordPass('ssm-pv-instruire-colectiva: resolves placeholders, populates participants table, generates valid DOCX binary');
  } catch (err) {
    recordFail('ssm-pv-instruire-colectiva generation', err);
  }

  // Check 2.2: psi-pv-instruire generation
  try {
    const resolved = await resolveTemplatePlaceholders({
      templateCode: 'psi-pv-instruire',
      clientId: client.id,
      trainingEventId: plannedEventId || recordedEventId,
    });

    assert.strictEqual(resolved.template.code, 'psi-pv-instruire');
    assert(resolved.resolvedData.PLACEHOLDER_FIRMA, 'Company name placeholder must be populated');
    assert(Array.isArray(resolved.resolvedData.participanti), 'participanti collection array must exist');

    const docxResult = await generateDocument({
      templateCode: 'psi-pv-instruire',
      clientId: client.id,
      eventId: plannedEventId || recordedEventId,
      data: resolved.resolvedData,
      operatorName: 'Forensic Auditor',
    });

    assert(docxResult.fileSizeBytes > 5000, 'PSI PV DOCX fileSizeBytes must be > 5KB');
    const docxBuffer = fs.readFileSync(docxResult.filePath);
    assert(docxBuffer.length > 5000, 'PSI PV DOCX buffer must be valid and > 5KB');

    const zip = new PizZip(docxBuffer);
    const docXml = zip.file('word/document.xml')?.asText();
    assert(docXml, 'word/document.xml must exist in docx archive');
    assert(!docXml.includes('{PLACEHOLDER_FIRMA}'), 'Token {PLACEHOLDER_FIRMA} must be replaced');
    assert(!docXml.includes('{#participanti}'), 'Collection loop {#participanti} must be evaluated');

    recordPass('psi-pv-instruire: resolves placeholders, populates participants table, generates valid DOCX binary');
  } catch (err) {
    recordFail('psi-pv-instruire generation', err);
  }

  console.log('\n--- PHASE 3: Catch-22 (Feature 18) Expiry Elimination Verification ---');

  // Check 3.1: checkEmployeeTemplateExpiry allows overdue employee for statutory training templates
  try {
    const overdueEmp = {
      ...emp1,
      status: 'ACTIV',
      medicalFitnessVerdict: 'APT',
      ssmLastTrainingDate: new Date('2024-01-01'), // Long expired
    };
    const comp = calculateEmployeeCompliance(overdueEmp);
    assert.strictEqual(comp.ssmTraining.status, 'OVERDUE', 'Employee SSM training must be OVERDUE');

    // Training templates must NOT be expired
    const ssmFisaCheck = checkEmployeeTemplateExpiry('ssm-fisa-instruire-individuala', comp, overdueEmp);
    assert.strictEqual(ssmFisaCheck.isExpired, false, 'ssm-fisa-instruire-individuala must NOT be blocked when training is OVERDUE');

    const psiFisaCheck = checkEmployeeTemplateExpiry('psi-fisa-instructaj-individuala', comp, overdueEmp);
    assert.strictEqual(psiFisaCheck.isExpired, false, 'psi-fisa-instructaj-individuala must NOT be blocked when training is OVERDUE');

    const pvSsmCheck = checkEmployeeTemplateExpiry('ssm-pv-instruire-colectiva', comp, overdueEmp);
    assert.strictEqual(pvSsmCheck.isExpired, false, 'ssm-pv-instruire-colectiva must NOT be blocked when training is OVERDUE');

    // Non-training operational template SHOULD be expired/blocked when training is overdue
    const nonTrainingCheck = checkEmployeeTemplateExpiry('ipssm-birou', comp, overdueEmp);
    assert.strictEqual(nonTrainingCheck.isExpired, true, 'Non-training template must be blocked when training is OVERDUE');

    recordPass('Catch-22 checkEmployeeTemplateExpiry: allows training sheets for overdue employees while enforcing on non-training docs');
  } catch (err) {
    recordFail('Catch-22 checkEmployeeTemplateExpiry', err);
  }

  // Check 3.2: Generate ssm-fisa-instruire-individuala for overdue employee
  try {
    const resolved = await resolveTemplatePlaceholders({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
    });
    const docxResult = await generateDocument({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
      data: resolved.resolvedData,
      operatorName: 'Forensic Auditor',
    });
    assert(docxResult.fileSizeBytes > 5000, 'DOCX binary fileSizeBytes must be > 5KB');
    recordPass('Generate ssm-fisa-instruire-individuala for employee with overdue compliance');
  } catch (err) {
    recordFail('Generate ssm-fisa-instruire-individuala for overdue employee', err);
  }

  console.log('\n--- PHASE 4: Specific Event Type History Mapping (Features 14 & 15) ---');

  // Check 4.1: Record an explicit INTRODUCTIV event with a specific date and verify resolver picks that date over hireDate
  try {
    const introDate = new Date('2025-06-15');
    const introDateRo = '15.06.2025';
    
    // Create dedicated INTRODUCTIV event
    const introEvent = await prisma.trainingEvent.create({
      data: {
        clientId: client.id,
        type: 'INTRODUCTIV',
        eventDate: introDate,
        durationHours: 8,
        materialOrTopic: 'Instruire Introductiv Generală Oficială Verificată',
        instructorName: 'Dr. Expert Introductiv',
        status: 'recorded',
        participants: {
          create: [{
            employeeId: emp1.id,
            result: 'admis',
            recordedAt: introDate,
          }],
        },
      },
    });

    const resolved = await resolveTemplatePlaceholders({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeId: emp1.id,
    });

    const dataIntro = String(resolved.resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG || '');
    assert.strictEqual(dataIntro, introDateRo, `PLACEHOLDER_DATA_INSTRUIRE_IG must be "${introDateRo}", got "${dataIntro}"`);

    const durataIntro = String(resolved.resolvedData.PLACEHOLDER_DURATA_INSTRUIRE_IG || '');
    assert(durataIntro.includes('8'), `PLACEHOLDER_DURATA_INSTRUIRE_IG must include 8 ore, got "${durataIntro}"`);

    const instructorIntro = String(resolved.resolvedData.PLACEHOLDER_INSTRUCTOR_IG || '');
    assert.strictEqual(instructorIntro, 'Dr. Expert Introductiv', `PLACEHOLDER_INSTRUCTOR_IG must match event instructor, got "${instructorIntro}"`);

    recordPass('ssm-fisa-instruire-individuala resolves real INTRODUCTIV event date, duration, and instructor instead of hireDate');

    // Clean up test intro event
    await prisma.trainingParticipant.deleteMany({ where: { eventId: introEvent.id } });
    await prisma.trainingEvent.delete({ where: { id: introEvent.id } });
  } catch (err) {
    recordFail('INTRODUCTIV event resolution', err);
  }

  // Cleanup planned and recorded test events
  if (plannedEventId) {
    await prisma.trainingParticipant.deleteMany({ where: { eventId: plannedEventId } });
    await prisma.trainingEvent.delete({ where: { id: plannedEventId } });
  }
  if (recordedEventId) {
    await prisma.trainingParticipant.deleteMany({ where: { eventId: recordedEventId } });
    await prisma.trainingEvent.delete({ where: { id: recordedEventId } });
  }

  // Restore emp1 original last training date if needed
  if (originalSsmDate1 !== undefined) {
    await prisma.employee.update({
      where: { id: emp1.id },
      data: { ssmLastTrainingDate: originalSsmDate1 },
    });
  }

  console.log('\n================================================================================');
  console.log(`FORENSIC AUDIT SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  console.log('================================================================================');

  if (passedChecks === totalChecks) {
    console.log('AUDIT VERDICT: CLEAN');
    process.exit(0);
  } else {
    console.log('AUDIT VERDICT: INTEGRITY VIOLATION');
    process.exit(1);
  }
}

runForensicAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
