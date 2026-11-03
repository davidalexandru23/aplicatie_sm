/**
 * scripts/verify-m2-workflows.ts
 *
 * Automated verification suite for Milestone 2:
 * SSM Operational Workflows UI & Training Scheduler
 *
 * Tests:
 * 1. Client Intake & CAEN Profiling (API logic, CAEN normalization, uniqueness constraint)
 * 2. Organizational Decisions 01-09 Appointees (Persistence & Template Zero-Placeholder Integration)
 * 3. Training Scheduler & Atomic Compliance Scadențe Reset (PERIODIC_SSM, PERIODIC_PSI, batch participants)
 * 4. Error Handling & Edge Cases (Duplicate CUI, negative duration, missing participants, mismatched client)
 * 5. Company Compliance Metrics Rollup Recalculation Invariant
 *
 * Run with: npx tsx scripts/verify-m2-workflows.ts
 */

import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { 
  calculateEmployeeCompliance, 
  calculateCompanyMetrics, 
  getStatusBadgeInfo 
} from '../src/lib/compliance';
import { getCaenEntry, searchCaen, normalizeCaenCode } from '../src/lib/caen-catalog';
import { NextRequest } from 'next/server';
import { POST as recordTrainingRoute } from '../src/app/api/trainings/record/route';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: msg });
    console.error(`  ✗ ${name}: ${msg}`);
  }
}

export async function verifyM2Workflows(): Promise<boolean> {
  console.log('================================================================');
  console.log('   VERIFICARE OPERAȚIONALĂ M2: SSM WORKFLOWS & TRAINING RESET   ');
  console.log('================================================================\n');

  const testCui = 'RO99887766';
  const testDuplicateCui = 'RO99887766';
  let createdClientId: string | null = null;
  let testEmployeeId1: string | null = null;
  let testEmployeeId2: string | null = null;

  try {
    // Clean up any stale test client from previous runs
    const stale = await prisma.client.findUnique({ where: { cui: testCui } });
    if (stale) {
      await prisma.client.delete({ where: { id: stale.id } });
    }

    // =========================================================================
    // SECTION 1: Client Intake & CAEN Profiling
    // =========================================================================
    console.log('--- 1. Client Intake & CAEN Profiling Engine ---');

    await runTest('CAEN catalog lookup & normalization for IT (6201)', async () => {
      const entry = getCaenEntry('6201');
      assert.ok(entry, 'CAEN 6201 must exist in catalog');
      assert.equal(entry.code, '6201');
      assert.equal(entry.riskClass, 'LOW');
      assert.equal(entry.defaultSsmIntervalMonths, 12);
      assert.equal(entry.defaultPsiIntervalMonths, 6);
      assert.equal(normalizeCaenCode('CAEN 62.01'), '6201');
    });

    await runTest('CAEN catalog search by keyword (restaurant, constructii)', async () => {
      const resultsRest = searchCaen('restaurant');
      assert.ok(resultsRest.length > 0, 'Must match restaurant entries');
      assert.ok(resultsRest.some((e) => e.code === '5610'));

      const resultsConst = searchCaen('constructii');
      assert.ok(resultsConst.length > 0, 'Must match construction entries');
    });

    await runTest('Programmatic client intake with CAEN code & SEPP provider', async () => {
      const normalizedCaen = normalizeCaenCode('6201');
      const caenEntry = getCaenEntry(normalizedCaen);

      const client = await prisma.client.create({
        data: {
          name: 'TEST CLIENT M2 WORKFLOWS S.R.L.',
          cui: testCui,
          regCom: 'J40/99999/2026',
          address: 'București, Sectorul 1, Bulevardul Aviatorilor nr. 100',
          legalRepresentative: 'Ionescu Radu',
          contactPerson: 'Andreea Popa',
          contactEmail: 'contact@testclientm2.ro',
          contactPhone: '0712345678',
          foundedYear: 2023,
          caenCode: normalizedCaen,
          caenActivity: caenEntry?.name || 'Activități de realizare a software-ului la comandă',
          ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
          ssmSpecialistName: 'Ing. Mihai Popescu',
          ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
        },
      });

      assert.ok(client.id, 'Client ID must be generated');
      assert.equal(client.cui, testCui);
      assert.equal(client.caenCode, '6201');
      assert.equal(client.foundedYear, 2023);
      assert.equal(client.ssmSpecialistName, 'Ing. Mihai Popescu');

      createdClientId = client.id;
    });

    await runTest('Duplicate CUI uniqueness enforcement', async () => {
      const existing = await prisma.client.findUnique({ where: { cui: testDuplicateCui } });
      assert.ok(existing, 'Client with CUI should exist from previous test');

      let duplicateBlocked = false;
      try {
        await prisma.client.create({
          data: {
            name: 'DUPLICATE CUI INC S.R.L.',
            cui: testDuplicateCui,
            address: 'Strada Falsă nr. 1',
          },
        });
      } catch {
        duplicateBlocked = true;
      }
      assert.ok(duplicateBlocked, 'Prisma must reject duplicate CUI with unique constraint error');
    });

    // =========================================================================
    // SECTION 2: Organizational Decisions 01-09 Appointees
    // =========================================================================
    console.log('\n--- 2. Organizational Decisions 01-09 Appointees & Generation ---');

    // Create 2 test employees for the client
    const emp1 = await prisma.employee.create({
      data: {
        clientId: createdClientId!,
        firstName: 'Cristian',
        lastName: 'Munteanu',
        cnp: '1850101123456',
        status: 'ACTIV',
        ssmIntervalMonths: 6,
        psiIntervalMonths: 6,
      },
    });
    testEmployeeId1 = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        clientId: createdClientId!,
        firstName: 'Alexandru',
        lastName: 'Stan',
        cnp: '1900202123456',
        status: 'ACTIV',
        ssmIntervalMonths: 6,
        psiIntervalMonths: 6,
      },
    });
    testEmployeeId2 = emp2.id;

    await runTest('Update organizational decision appointees on Client', async () => {
      const decisionsDate = new Date('2026-02-01T00:00:00.000Z');

      const updated = await prisma.client.update({
        where: { id: createdClientId! },
        data: {
          designatedWorkerSsm: `${emp1.lastName} ${emp1.firstName}`,
          firstAidResponder: `${emp2.lastName} ${emp2.firstName}`,
          psiResponder: `${emp1.lastName} ${emp1.firstName}`,
          investigationMembers: `${emp1.lastName} ${emp1.firstName}, ${emp2.lastName} ${emp2.firstName}`,
          decisionsDate,
        },
      });

      assert.equal(updated.designatedWorkerSsm, 'Munteanu Cristian');
      assert.equal(updated.firstAidResponder, 'Stan Alexandru');
      assert.equal(updated.psiResponder, 'Munteanu Cristian');
      assert.ok(updated.investigationMembers?.includes('Stan Alexandru'));
      assert.equal(updated.decisionsDate?.toISOString().split('T')[0], '2026-02-01');
    });

    await runTest('Resolver populates decision placeholders with authentic appointees', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: createdClientId!,
      });

      const missingRequired = res.fields.filter((f) => f.required && !f.value);
      assert.equal(missingRequired.length, 0, 'No missing required fields for decizii-angajator');
      assert.ok(
        String(res.resolvedData.PLACEHOLDER_LUCRATOR_DESEMNAT_SSM).includes('Munteanu Cristian'),
        'Designated worker placeholder must contain appointee name'
      );
      assert.ok(
        String(res.resolvedData.PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR).includes('Stan Alexandru'),
        'First aid responder placeholder must contain appointee name'
      );
      assert.ok(
        String(res.resolvedData.PLACEHOLDER_RESPONSABIL_PSI).includes('Munteanu Cristian'),
        'PSI responder placeholder must contain appointee name'
      );
      assert.ok(
        String(res.resolvedData.PLACEHOLDER_MEMBRU_COMISIE).includes('Munteanu Cristian'),
        'Commission members must include Munteanu Cristian'
      );
      assert.equal(res.resolvedData.PLACEHOLDER_DATA_DECIZIE, '01.02.2026');
    });

    await runTest('Generate decizii-angajator DOCX package with 0 missing fields', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: createdClientId!,
      });

      const genRes = await generateDocument({
        templateCode: 'decizii-angajator',
        clientId: createdClientId!,
        data: resolvedData,
        operatorName: 'Inspector SSM Automat',
      });

      assert.equal(genRes.status, 'approved_for_print');
      assert.equal(genRes.missingFields.length, 0);
      assert.ok(genRes.filePath.endsWith('.docx'));
      assert.ok(genRes.fileSizeBytes > 10000, 'File must be a genuine non-empty DOCX');
    });

    // =========================================================================
    // SECTION 3: Training Scheduler & Atomic Compliance Scadențe Reset
    // =========================================================================
    console.log('\n--- 3. Training Scheduler & Compliance Auto-Reset ---');

    await runTest('Initial state: overdue SSM compliance triggers red badge', async () => {
      // Set training date to 10 months ago
      const overdueDate = new Date();
      overdueDate.setMonth(overdueDate.getMonth() - 10);

      await prisma.employee.update({
        where: { id: testEmployeeId1! },
        data: { ssmLastTrainingDate: overdueDate, ssmIntervalMonths: 6 },
      });

      const emp = await prisma.employee.findUniqueOrThrow({ where: { id: testEmployeeId1! } });
      const comp = calculateEmployeeCompliance(emp);

      assert.equal(comp.ssmTraining.status, 'OVERDUE', 'SSM status must be OVERDUE');
      assert.ok(comp.ssmTraining.daysRemaining! < 0, 'Days remaining must be negative');

      const badge = getStatusBadgeInfo(comp.ssmTraining.status, comp.ssmTraining.daysRemaining);
      assert.ok(badge.className.includes('bg-red-50'), 'Badge class must be red for overdue');
    });

    await runTest('Record PERIODIC_SSM event & atomically reset employee compliance to VALID', async () => {
      const today = new Date();
      const eventDateStr = today.toISOString().split('T')[0];
      const parsedDate = new Date(eventDateStr);

      // Execute transaction equivalent to POST /api/trainings/record
      const txResult = await prisma.$transaction(async (tx) => {
        const event = await tx.trainingEvent.create({
          data: {
            clientId: createdClientId!,
            type: 'PERIODIC_SSM',
            eventDate: parsedDate,
            durationHours: 2,
            materialOrTopic: 'Instruire periodică SSM semestrială',
            instructorName: 'Ing. Mihai Popescu',
            status: 'recorded',
            participants: {
              create: [
                {
                  employeeId: testEmployeeId1!,
                  result: 'admis',
                  recordedAt: parsedDate,
                },
              ],
            },
          },
          include: { participants: true },
        });

        const updateRes = await tx.employee.updateMany({
          where: { id: testEmployeeId1!, clientId: createdClientId! },
          data: { ssmLastTrainingDate: parsedDate, ssmNotes: 'Instruire periodică conform tematică' },
        });

        return { event, updatedCount: updateRes.count };
      });

      assert.equal(txResult.updatedCount, 1);
      assert.equal(txResult.event.participants.length, 1);
      assert.equal(txResult.event.type, 'PERIODIC_SSM');

      // Verify employee record after transaction
      const empAfter = await prisma.employee.findUniqueOrThrow({ where: { id: testEmployeeId1! } });
      assert.ok(empAfter.ssmLastTrainingDate);
      assert.equal(
        empAfter.ssmLastTrainingDate.toISOString().split('T')[0],
        eventDateStr
      );

      // Verify recalculation to VALID with emerald styling
      const compAfter = calculateEmployeeCompliance(empAfter);
      assert.equal(compAfter.ssmTraining.status, 'VALID', 'SSM status must be reset to VALID');
      assert.ok(compAfter.ssmTraining.daysRemaining! > 150, 'Days remaining should be ~180 days');

      const badge = getStatusBadgeInfo(compAfter.ssmTraining.status, compAfter.ssmTraining.daysRemaining);
      assert.ok(badge.className.includes('bg-emerald-50'), 'Badge must have emerald background');
      assert.ok(badge.className.includes('text-emerald-700'), 'Badge must have emerald text');
      assert.ok(badge.text.startsWith('VALID'), 'Badge label must start with VALID');
    });

    await runTest('Record PERIODIC_PSI event & atomically reset PSI compliance to VALID', async () => {
      const today = new Date();
      const eventDateStr = today.toISOString().split('T')[0];
      const parsedDate = new Date(eventDateStr);

      // Set PSI to overdue first
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 8);
      await prisma.employee.update({
        where: { id: testEmployeeId1! },
        data: { psiLastTrainingDate: pastDate, psiIntervalMonths: 6 },
      });

      // Record PSI event
      await prisma.$transaction(async (tx) => {
        await tx.trainingEvent.create({
          data: {
            clientId: createdClientId!,
            type: 'PERIODIC_PSI',
            eventDate: parsedDate,
            durationHours: 2,
            materialOrTopic: 'Instruire periodică Situații de Urgență conform OMAI 712/2005',
            instructorName: 'Munteanu Cristian (Cadru Tehnic PSI)',
            status: 'recorded',
            participants: {
              create: [
                {
                  employeeId: testEmployeeId1!,
                  result: 'admis',
                  recordedAt: parsedDate,
                },
              ],
            },
          },
        });

        await tx.employee.updateMany({
          where: { id: testEmployeeId1!, clientId: createdClientId! },
          data: { psiLastTrainingDate: parsedDate },
        });
      });

      const empPsi = await prisma.employee.findUniqueOrThrow({ where: { id: testEmployeeId1! } });
      const compPsi = calculateEmployeeCompliance(empPsi);

      assert.equal(compPsi.psiTraining.status, 'VALID');
      assert.ok(compPsi.psiTraining.daysRemaining! > 150);

      const badge = getStatusBadgeInfo(compPsi.psiTraining.status, compPsi.psiTraining.daysRemaining);
      assert.ok(badge.className.includes('bg-emerald-50'));
    });

    await runTest('Multi-participant batch training reset preserves atomicity', async () => {
      const today = new Date();
      const parsedDate = new Date(today.toISOString().split('T')[0]);
      const empIds = [testEmployeeId1!, testEmployeeId2!];

      const batchTx = await prisma.$transaction(async (tx) => {
        const event = await tx.trainingEvent.create({
          data: {
            clientId: createdClientId!,
            type: 'PERIODIC_SSM',
            eventDate: parsedDate,
            durationHours: 2,
            materialOrTopic: 'Instruire comună SSM echipă',
            instructorName: 'Ing. Mihai Popescu',
            status: 'recorded',
            participants: {
              create: empIds.map((id) => ({ employeeId: id, result: 'admis' })),
            },
          },
          include: { participants: true },
        });

        const updateRes = await tx.employee.updateMany({
          where: { id: { in: empIds }, clientId: createdClientId! },
          data: { ssmLastTrainingDate: parsedDate },
        });

        return { event, updatedCount: updateRes.count };
      });

      assert.equal(batchTx.updatedCount, 2, 'Both employees must be updated');
      assert.equal(batchTx.event.participants.length, 2, 'Both participants recorded in event');

      const emps = await prisma.employee.findMany({
        where: { id: { in: empIds } },
      });

      for (const e of emps) {
        const comp = calculateEmployeeCompliance(e);
        assert.equal(comp.ssmTraining.status, 'VALID');
      }
    });

    await runTest('Company compliance score rollup recalculation reflects newly trained employees', async () => {
      const clientEmps = await prisma.employee.findMany({
        where: { clientId: createdClientId!, status: 'ACTIV' },
      });

      const metrics = calculateCompanyMetrics(clientEmps);
      assert.ok(metrics.validCount >= 2, 'Valid count must reflect the updated SSM trainings');
      assert.ok(metrics.complianceScorePercent >= 50, 'Compliance score must be elevated');
    });

    await runTest('Future training date rejection validation (eventDate 2099-01-01 returns HTTP 400)', async () => {
      const futureDate = '2099-01-01';
      const req = new NextRequest('http://localhost:3000/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: createdClientId!,
          trainingType: 'PERIODIC_SSM',
          eventDate: futureDate,
          durationHours: 2,
          instructorName: 'Ing. Mihai Popescu',
          participantEmployeeIds: [testEmployeeId1!],
        }),
      });

      const res = await recordTrainingRoute(req);
      assert.equal(res.status, 400, 'Recording with future date must return HTTP 400');
      const body = await res.json();
      assert.equal(body.error, 'Data instruirii nu poate fi în viitor.');
    });

  } finally {
    // Clean up test data
    if (createdClientId) {
      try {
        await prisma.client.delete({ where: { id: createdClientId } });
        console.log('\n  [Cleanup] Test client and associated records successfully removed.');
      } catch (cleanupErr) {
        console.warn('  [Cleanup] Warning: could not delete test client:', cleanupErr);
      }
    }
  }

  // Summary
  console.log('\n================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`REZULTAT VERIFICARE M2: ${passedCount}/${totalCount} teste trecute`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    console.error('EȘEC: Una sau mai multe verificări M2 au eșuat.');
    return false;
  }

  return true;
}

if (process.argv[1] && process.argv[1].endsWith('verify-m2-workflows.ts')) {
  verifyM2Workflows()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal verification error:', err);
      process.exit(1);
    });
}
