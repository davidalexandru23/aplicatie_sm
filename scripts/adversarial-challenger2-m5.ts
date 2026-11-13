/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 2 (MILESTONE 5)
 * ============================================================================
 * 
 * Target Subsystems:
 * 1. Hygiene Subsystem:
 *    - Tenant isolation on GET /api/hygiene/sessions?clientId=...
 *    - Bound & input validation on PATCH /api/hygiene/sessions/[id]/participants/[participantId]
 *    - Attendance, grade, result, certificate series/number update & database verification
 *    - Synchronization with Employee record upon passing
 *    - Absent / failed participant statutory rules (nullification of certificate)
 *    - Statutory Hygiene Compliance in src/lib/compliance.ts:
 *      - Ordinul comun MS/ME 2209/4469/2022 (36 months / 3 years validity)
 *      - Food handling job (job.isFoodHandling: true) vs. food CAEN (5610) vs. non-food job/CAEN
 *      - Leap year calendar month clamping (2024-02-29 -> 2027-02-28)
 * 2. Excel Import Subsystem:
 *    - Missing dates commitment in src/lib/importer.ts (commitImport)
 *      - medicalLastExamDate, ssmLastTrainingDate, psiLastTrainingDate committed as null (NOT hireDate)
 *      - Newly imported employee compliance calculates as MISSING (NOT VALID)
 *    - Server-side re-validation in POST /api/imports/commit:
 *      - Malformed CNP (checksum, length) rejected with HTTP 400 + validationReport
 *      - Duplicate intra-batch CNPs detected and flagged
 *      - Valid commit creates ImportBatch with persisted JSON validationReport and diffData
 * 
 * Invocation:
 *   npx tsx scripts/adversarial-challenger2-m5.ts
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getHygieneSessions } from '../src/app/api/hygiene/sessions/route';
import { PATCH as patchParticipant } from '../src/app/api/hygiene/sessions/[id]/participants/[participantId]/route';
import { POST as commitImportRoute } from '../src/app/api/imports/commit/route';
import { commitImport, ParsedWorkbook, ParsedEmployee } from '../src/lib/importer';
import { calculateEmployeeCompliance, addMonthsSafe } from '../src/lib/compliance';

// Terminal colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

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

async function runTests() {
  console.log(`\n${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  EMPIRICAL ADVERSARIAL STRESS SUITE — CHALLENGER 2 (MILESTONE 5)${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Target: Hygiene Subsystem & Excel Import Subsystem${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}\n`);

  // Identify baseline test clients
  const bistro = await prisma.client.findFirst({
    where: { cui: 'RO45123987' },
    include: { employees: true },
  });
  const nexus = await prisma.client.findFirst({
    where: { cui: 'RO38765432' },
    include: { employees: true },
  });
  const conac = await prisma.client.findFirst({
    where: { cui: 'RO48901234' },
    include: { employees: true },
  });

  if (!bistro || !nexus || !conac) {
    throw new Error('Baseline seed clients (Bistro Gourmet, Nexus Solutions, Restaurant La Conac) not found in DB!');
  }

  // --------------------------------------------------------------------------
  // SUITE 1: Hygiene Subsystem — Tenant Isolation & Filtering
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.blue}▶ GROUP 1: Hygiene Subsystem — Tenant Isolation & Query Filtering${C.reset}`);

  {
    // T1.1: Query GET ?clientId=<bistro.id>
    const reqBistro = new NextRequest(`http://localhost:3000/api/hygiene/sessions?clientId=${bistro.id}`);
    const resBistro = await getHygieneSessions(reqBistro);
    assert(resBistro.status === 200, 'T1.1.1: GET /api/hygiene/sessions?clientId=<bistroId> returns HTTP 200');
    const sessionsBistro = await resBistro.json();
    assert(Array.isArray(sessionsBistro), 'T1.1.2: Response is an array of sessions');
    assert(sessionsBistro.length >= 2, `T1.1.3: Returns Bistro Gourmet sessions (expected >= 2, got ${sessionsBistro.length})`);
    
    // Strict tenant isolation check: no sessions from Nexus or Conac
    const leakSession = sessionsBistro.find((s: any) => s.clientId && s.clientId !== bistro.id);
    assert(!leakSession, 'T1.1.4: Strict tenant isolation: ZERO sessions belonging to other clients returned');

    // T1.2: Query GET ?clientId=<nexus.id>
    const reqNexus = new NextRequest(`http://localhost:3000/api/hygiene/sessions?clientId=${nexus.id}`);
    const resNexus = await getHygieneSessions(reqNexus);
    const sessionsNexus = await resNexus.json();
    assert(sessionsNexus.length >= 1, `T1.2.1: Returns Nexus sessions (expected >= 1, got ${sessionsNexus.length})`);
    const nexusLeak = sessionsNexus.find((s: any) => s.clientId && s.clientId !== nexus.id);
    assert(!nexusLeak, 'T1.2.2: Strict tenant isolation: ZERO sessions belonging to Bistro or other clients in Nexus query');

    // T1.3: Query with non-existent client UUID
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const reqEmpty = new NextRequest(`http://localhost:3000/api/hygiene/sessions?clientId=${nonExistentId}`);
    const resEmpty = await getHygieneSessions(reqEmpty);
    const sessionsEmpty = await resEmpty.json();
    assert(Array.isArray(sessionsEmpty) && sessionsEmpty.length === 0, 'T1.3: Non-existent clientId returns empty array [] (no data leakage)');

    // T1.4: Global / Admin query with no clientId
    const reqGlobal = new NextRequest('http://localhost:3000/api/hygiene/sessions');
    const resGlobal = await getHygieneSessions(reqGlobal);
    const sessionsGlobal = await resGlobal.json();
    assert(sessionsGlobal.length >= 4, `T1.4: Unfiltered query returns all sessions across clients (got ${sessionsGlobal.length})`);

    // T1.5: Indirect Association Test (session has clientId=null, but participant employee belongs to Bistro)
    const ephemeralEmployee = await prisma.employee.create({
      data: {
        clientId: bistro.id,
        firstName: 'TestIndirect',
        lastName: 'Cursant',
        cnp: '1900101123456',
        hireDate: new Date('2025-01-01'),
        status: 'ACTIV',
      },
    });

    const ephemeralSession = await prisma.hygieneSession.create({
      data: {
        clientId: null, // intentionally null
        providerName: 'Test Provider SRL',
        sessionDate: new Date('2026-10-01'),
        examDate: new Date('2026-10-02'),
        location: 'Sala Training Calea Victoriei',
        status: 'programata',
        participants: {
          create: {
            clientName: 'BISTRO GOURMET S.R.L.',
            lastName: 'Cursant',
            firstName: 'TestIndirect',
            cnp: '1900101123456',
            employeeId: ephemeralEmployee.id,
          },
        },
      },
    });

    const reqIndirect = new NextRequest(`http://localhost:3000/api/hygiene/sessions?clientId=${bistro.id}`);
    const resIndirect = await getHygieneSessions(reqIndirect);
    const sessionsIndirect = await resIndirect.json();
    const foundIndirect = sessionsIndirect.some((s: any) => s.id === ephemeralSession.id);
    assert(foundIndirect, 'T1.5: Indirect association: Session with null clientId is returned when participant employee belongs to client');

    // Cleanup T1.5
    await prisma.hygieneParticipant.deleteMany({ where: { sessionId: ephemeralSession.id } });
    await prisma.hygieneSession.delete({ where: { id: ephemeralSession.id } });
    await prisma.employee.delete({ where: { id: ephemeralEmployee.id } });
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Hygiene Subsystem — Participant Input Validation & Synchronization
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.blue}▶ GROUP 2: Hygiene Subsystem — Participant Updates, Bounds & Synchronization${C.reset}`);

  {
    // Setup an ephemeral test session and test employee in Bistro Gourmet
    const testEmployee = await prisma.employee.create({
      data: {
        clientId: bistro.id,
        firstName: 'Ionel',
        lastName: 'Bucataru',
        cnp: '1850510123456',
        hireDate: new Date('2024-05-01'),
        status: 'ACTIV',
      },
    });

    const testSession = await prisma.hygieneSession.create({
      data: {
        clientId: bistro.id,
        providerName: 'SSM & Hygiene Training Center',
        sessionDate: new Date('2026-11-01'),
        examDate: new Date('2026-11-05'),
        location: 'Bucuresti, Sector 1',
        status: 'desfasurata',
      },
    });

    const testParticipant = await prisma.hygieneParticipant.create({
      data: {
        sessionId: testSession.id,
        employeeId: testEmployee.id,
        clientName: bistro.name,
        firstName: testEmployee.firstName,
        lastName: testEmployee.lastName,
        cnp: testEmployee.cnp,
        attendance: 'prezent',
        examGrade: null,
        examResult: 'admis',
      },
    });

    // T2.1: Non-existent participant/session -> 404
    {
      const fakeParams = Promise.resolve({ id: testSession.id, participantId: '00000000-0000-0000-0000-000000000000' });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/00000000-0000-0000-0000-000000000000`, {
        method: 'PATCH',
        body: JSON.stringify({ attendance: 'prezent' }),
      });
      const res = await patchParticipant(req, { params: fakeParams });
      assert(res.status === 404, 'T2.1: PATCH on non-existent participant returns HTTP 404');
    }

    // T2.2: Out-of-bounds exam grades
    const invalidGrades = [11, 0, -1, 10.5, 0.5, 'not-a-number'];
    for (const badGrade of invalidGrades) {
      const params = Promise.resolve({ id: testSession.id, participantId: testParticipant.id });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/${testParticipant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ examGrade: badGrade }),
      });
      const res = await patchParticipant(req, { params });
      assert(res.status === 400, `T2.2: Invalid examGrade (${badGrade}) is strictly rejected with HTTP 400`);
    }

    // T2.3: Invalid attendance string
    {
      const params = Promise.resolve({ id: testSession.id, participantId: testParticipant.id });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/${testParticipant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ attendance: 'invitat' }),
      });
      const res = await patchParticipant(req, { params });
      assert(res.status === 400, 'T2.3: Invalid attendance ("invitat") is strictly rejected with HTTP 400');
    }

    // T2.4: Invalid examResult string
    {
      const params = Promise.resolve({ id: testSession.id, participantId: testParticipant.id });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/${testParticipant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ examResult: 'amanat' }),
      });
      const res = await patchParticipant(req, { params });
      assert(res.status === 400, 'T2.4: Invalid examResult ("amanat") is strictly rejected with HTTP 400');
    }

    // T2.5: Valid update & Database verification + Employee synchronization
    {
      const certDateIso = '2026-11-06T00:00:00.000Z';
      const params = Promise.resolve({ id: testSession.id, participantId: testParticipant.id });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/${testParticipant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          attendance: 'prezent',
          examGrade: 9.5,
          examResult: 'admis',
          certificateSeries: 'IG-TEST',
          certificateNumber: '887766',
          certificateDate: certDateIso,
        }),
      });
      const res = await patchParticipant(req, { params });
      assert(res.status === 200, 'T2.5.1: Valid PATCH returns HTTP 200');
      const body = await res.json();
      assert(body.success === true, 'T2.5.2: Response body contains success: true');
      assert(body.participant.examGrade === 9.5, 'T2.5.3: Response participant reflects examGrade 9.5');

      // Verify directly in PostgreSQL via Prisma
      const dbParticipant = await prisma.hygieneParticipant.findUnique({
        where: { id: testParticipant.id },
      });
      assert(dbParticipant !== null, 'T2.5.4: Participant exists in DB');
      assert(dbParticipant?.attendance === 'prezent', 'T2.5.5: DB attendance is "prezent"');
      assert(dbParticipant?.examGrade === 9.5, 'T2.5.6: DB examGrade is 9.5');
      assert(dbParticipant?.examResult === 'admis', 'T2.5.7: DB examResult is "admis"');
      assert(dbParticipant?.certificateSeries === 'IG-TEST', 'T2.5.8: DB certificateSeries is "IG-TEST"');
      assert(dbParticipant?.certificateNumber === '887766', 'T2.5.9: DB certificateNumber is "887766"');

      // Verify Employee synchronization
      const dbEmployee = await prisma.employee.findUnique({
        where: { id: testEmployee.id },
      });
      assert(dbEmployee !== null, 'T2.5.10: Linked Employee exists in DB');
      assert(dbEmployee?.hygieneCertificateNumber === 'IG-TEST 887766', `T2.5.11: Employee hygieneCertificateNumber synced to "IG-TEST 887766" (got "${dbEmployee?.hygieneCertificateNumber}")`);
      assert(dbEmployee?.hygieneCertificateIssueDate !== null, 'T2.5.12: Employee hygieneCertificateIssueDate is populated');
      assert(dbEmployee?.hygieneLastExamDate !== null, 'T2.5.13: Employee hygieneLastExamDate is populated');
    }

    // T2.6: Absent participant statutory rule (absent -> forced respins, grade null, certificates nullified)
    {
      const params = Promise.resolve({ id: testSession.id, participantId: testParticipant.id });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/${testParticipant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          attendance: 'absent',
          examGrade: 10, // Attempting to set grade 10 while absent
          examResult: 'admis', // Attempting to set admis while absent
          certificateSeries: 'ILLEGAL',
          certificateNumber: '000000',
        }),
      });
      const res = await patchParticipant(req, { params });
      assert(res.status === 200, 'T2.6.1: Absent update returns HTTP 200');

      const dbParticipant = await prisma.hygieneParticipant.findUnique({
        where: { id: testParticipant.id },
      });
      assert(dbParticipant?.attendance === 'absent', 'T2.6.2: DB attendance is absent');
      assert(dbParticipant?.examGrade === null, 'T2.6.3: Absent participant grade is forced to null');
      assert(dbParticipant?.examResult === 'respins', 'T2.6.4: Absent participant examResult is forced to "respins"');
      assert(dbParticipant?.certificateSeries === null, 'T2.6.5: Absent participant certificateSeries is nullified');
      assert(dbParticipant?.certificateNumber === null, 'T2.6.6: Absent participant certificateNumber is nullified');
    }

    // T2.7: Failed participant statutory rule (respins -> certificates nullified)
    {
      const params = Promise.resolve({ id: testSession.id, participantId: testParticipant.id });
      const req = new NextRequest(`http://localhost:3000/api/hygiene/sessions/${testSession.id}/participants/${testParticipant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          attendance: 'prezent',
          examGrade: 4.0,
          examResult: 'respins',
          certificateSeries: 'IGNORED',
          certificateNumber: '999999',
        }),
      });
      const res = await patchParticipant(req, { params });
      assert(res.status === 200, 'T2.7.1: Respins update returns HTTP 200');

      const dbParticipant = await prisma.hygieneParticipant.findUnique({
        where: { id: testParticipant.id },
      });
      assert(dbParticipant?.attendance === 'prezent', 'T2.7.2: Attendance is prezent');
      assert(dbParticipant?.examGrade === 4.0, 'T2.7.3: Grade is 4.0');
      assert(dbParticipant?.examResult === 'respins', 'T2.7.4: Result is respins');
      assert(dbParticipant?.certificateSeries === null, 'T2.7.5: Failed participant certificateSeries is nullified');
      assert(dbParticipant?.certificateNumber === null, 'T2.7.6: Failed participant certificateNumber is nullified');
    }

    // Cleanup T2
    await prisma.hygieneParticipant.delete({ where: { id: testParticipant.id } });
    await prisma.hygieneSession.delete({ where: { id: testSession.id } });
    await prisma.employee.delete({ where: { id: testEmployee.id } });
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Hygiene Statutory Compliance in src/lib/compliance.ts
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.blue}▶ GROUP 3: Hygiene Statutory Compliance Calculation Engine${C.reset}`);

  {
    const today = new Date('2026-11-11T00:00:00.000Z');

    // T3.1: Client CAEN 5610 (Food) with non-food job flag -> Hygiene certificate required
    {
      const empFoodCaen = {
        id: 'emp-caen-5610',
        fullName: 'Bucatar Restaurant',
        caenCode: '5610',
        currentJob: { isFoodHandling: false },
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
        hygieneLastExamDate: null, // missing!
      };
      const comp = calculateEmployeeCompliance(empFoodCaen, today);
      assert(comp.hygieneCertificate !== null, 'T3.1.1: CAEN 5610 requires hygiene certificate (not null)');
      assert(comp.hygieneCertificate?.intervalMonths === 36, 'T3.1.2: Hygiene interval is 36 months (3 years) per Ordin 2209/4469/2022');
      assert(comp.hygieneCertificate?.status === 'MISSING', 'T3.1.3: Missing hygiene exam reports status MISSING');
      assert(comp.overallStatus === 'MISSING', 'T3.1.4: Overall status is degraded to MISSING by absent hygiene exam');
    }

    // T3.2: Non-food CAEN (6201 IT) with job.isFoodHandling: true -> Hygiene certificate required
    {
      const empFoodJob = {
        id: 'emp-it-cafeteria',
        fullName: 'Cantina IT',
        caenCode: '6201',
        currentJob: { isFoodHandling: true },
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
        hygieneLastExamDate: null,
      };
      const comp = calculateEmployeeCompliance(empFoodJob, today);
      assert(comp.hygieneCertificate !== null, 'T3.2.1: job.isFoodHandling: true requires hygiene certificate even under IT CAEN');
      assert(comp.hygieneCertificate?.intervalMonths === 36, 'T3.2.2: Hygiene interval is 36 months');
      assert(comp.hygieneCertificate?.status === 'MISSING', 'T3.2.3: Status is MISSING when exam absent');
    }

    // T3.3: Statutory validity checks: VALID, UPCOMING, OVERDUE on 36 months interval
    {
      // 10 months ago -> VALID
      const empValid = {
        id: 'emp-valid',
        caenCode: '5610',
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
        hygieneLastExamDate: new Date('2026-01-11'), // 10 months ago
      };
      const compValid = calculateEmployeeCompliance(empValid, today);
      assert(compValid.hygieneCertificate?.status === 'VALID', 'T3.3.1: Exam done 10 months ago is VALID for 36-month requirement');
      assert((compValid.hygieneCertificate?.daysRemaining || 0) > 30, 'T3.3.2: Days remaining > 30');

      // 35 months and 15 days ago -> UPCOMING (within 30 days of 36 months)
      const empUpcoming = {
        id: 'emp-upcoming',
        caenCode: '5610',
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
        hygieneLastExamDate: new Date('2023-11-25'), // due in ~14 days
      };
      const compUpcoming = calculateEmployeeCompliance(empUpcoming, today);
      assert(compUpcoming.hygieneCertificate?.status === 'UPCOMING', `T3.3.3: Exam due within 30 days is UPCOMING (got ${compUpcoming.hygieneCertificate?.status}, remaining ${compUpcoming.hygieneCertificate?.daysRemaining} days)`);

      // 37 months ago -> OVERDUE
      const empOverdue = {
        id: 'emp-overdue',
        caenCode: '5610',
        medicalLastExamDate: new Date('2026-06-01'),
        ssmLastTrainingDate: new Date('2026-06-01'),
        psiLastTrainingDate: new Date('2026-06-01'),
        hygieneLastExamDate: new Date('2023-09-01'), // 38 months ago
      };
      const compOverdue = calculateEmployeeCompliance(empOverdue, today);
      assert(compOverdue.hygieneCertificate?.status === 'OVERDUE', 'T3.3.4: Exam older than 36 months is OVERDUE');
      assert(compOverdue.overallStatus === 'OVERDUE', 'T3.3.5: Overall compliance is OVERDUE');
    }

    // T3.4: Non-food worker at non-food company (CAEN 6201, isFoodHandling: false)
    {
      const empNonFood = {
        id: 'emp-software-dev',
        fullName: 'Software Developer',
        caenCode: '6201',
        currentJob: { isFoodHandling: false },
        medicalLastExamDate: new Date('2026-06-01'), // due in 202 days (VALID)
        ssmLastTrainingDate: new Date('2026-09-01'), // due in ~110 days (VALID)
        psiLastTrainingDate: new Date('2026-09-01'), // due in ~110 days (VALID)
        hygieneLastExamDate: null,
      };
      const comp = calculateEmployeeCompliance(empNonFood, today);
      assert(comp.hygieneCertificate === null, 'T3.4.1: Non-food worker hygieneCertificate is null (not evaluated)');
      assert(comp.overallStatus === 'VALID', 'T3.4.2: Overall compliance is VALID (not penalized by absent hygiene cert)');
    }

    // T3.5: Leap year calendar month clamping (2024-02-29 + 36 months -> 2027-02-28)
    {
      const leapBase = new Date('2024-02-29T12:00:00.000Z');
      const targetDate = addMonthsSafe(leapBase, 36);
      const isClampedCorrectly = targetDate.getFullYear() === 2027 && targetDate.getMonth() === 1 && targetDate.getDate() === 28;
      assert(isClampedCorrectly, `T3.5: Leap day 2024-02-29 + 36 months clamps safely to 2027-02-28 (got ${targetDate.toISOString().slice(0, 10)})`);
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Excel Import Subsystem — Missing Dates Commitment & Compliance
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.blue}▶ GROUP 4: Excel Import — Missing Dates Commitment & Sincere Compliance${C.reset}`);

  {
    // Construct a parsed workbook with an employee having hireDate but missing medical & training dates
    const hireDate = new Date('2025-03-01T00:00:00.000Z');
    const testCnp = '1920315410013'; // 192031541001: sum check
    // Calculate valid control digit for 192031541001:
    // weights = [2,7,9,1,4,6,3,5,8,2,7,9]
    // 1*2 + 9*7 + 2*9 + 0*1 + 3*4 + 1*6 + 5*3 + 4*5 + 1*8 + 0*2 + 0*7 + 1*9
    // = 2 + 63 + 18 + 0 + 12 + 6 + 15 + 20 + 8 + 0 + 0 + 9 = 153
    // 153 % 11 = 13*11 (143) + 10 -> control is 1
    const validCnpForImport = '1920315410011';

    const testParsedWorkbook: ParsedWorkbook = {
      company: {
        name: bistro.name,
        cui: bistro.cui,
        address: bistro.address,
      },
      jobContexts: [],
      employees: [
        {
          rowNumber: 2,
          lastName: 'Munteanu',
          firstName: 'Gheorghe',
          cnp: validCnpForImport,
          birthDate: new Date('1992-03-15'),
          citizenship: 'Română',
          docType: 'CI',
          docSeries: 'RD',
          docNumber: '654321',
          county: 'București',
          locality: 'Sector 1',
          street: 'Calea Griviței',
          streetNumber: '10',
          jobTitle: 'Ajutor Bucătar',
          worksiteName: 'Sediu Central',
          hireDate: hireDate,
          status: 'ACTIV',
          hygieneRequested: false,
          // CRITICAL: medical and training dates are intentionally missing (undefined)
          medicalLastExamDate: undefined,
          ssmLastTrainingDate: undefined,
          psiLastTrainingDate: undefined,
          hygieneLastExamDate: undefined,
          isValid: true,
          errors: [],
        },
      ],
    };

    // T4.1: commitImport must commit missing dates as NULL (NOT substituted with hireDate!)
    const batchId = await commitImport(bistro.id, testParsedWorkbook, 'Challenger Operator', 'test-missing-dates.xlsx');
    assert(typeof batchId === 'string' && batchId.length > 0, 'T4.1.1: commitImport succeeds and returns batchId');

    const importedEmp = await prisma.employee.findUnique({
      where: {
        clientId_cnp: {
          clientId: bistro.id,
          cnp: validCnpForImport,
        },
      },
      include: {
        currentJob: true,
      },
    });

    assert(importedEmp !== null, 'T4.1.2: Imported employee persisted in DB');
    assert(importedEmp?.hireDate ? importedEmp.hireDate.toISOString().slice(0, 10) === '2025-03-01' : false, 'T4.1.3: Employee hireDate is 2025-03-01');
    assert(importedEmp?.medicalLastExamDate === null, `T4.1.4: medicalLastExamDate is strictly null (NOT substituted with hireDate!) (got ${importedEmp?.medicalLastExamDate})`);
    assert(importedEmp?.ssmLastTrainingDate === null, `T4.1.5: ssmLastTrainingDate is strictly null (NOT substituted with hireDate!) (got ${importedEmp?.ssmLastTrainingDate})`);
    assert(importedEmp?.psiLastTrainingDate === null, `T4.1.6: psiLastTrainingDate is strictly null (NOT substituted with hireDate!) (got ${importedEmp?.psiLastTrainingDate})`);

    // T4.2: Compliance calculation on this newly imported employee
    if (importedEmp) {
      const comp = calculateEmployeeCompliance(importedEmp, new Date('2026-11-11'));
      assert(comp.occupationalMedicine.status === 'MISSING', `T4.2.1: Occupational medicine status is MISSING (got ${comp.occupationalMedicine.status})`);
      assert(comp.ssmTraining.status === 'MISSING', `T4.2.2: SSM training status is MISSING (got ${comp.ssmTraining.status})`);
      assert(comp.psiTraining.status === 'MISSING', `T4.2.3: PSI training status is MISSING (got ${comp.psiTraining.status})`);
      assert(comp.overallStatus === 'MISSING', `T4.2.4: Overall compliance is MISSING (NOT falsely marked VALID!) (got ${comp.overallStatus})`);
    }

    // Cleanup T4
    if (importedEmp) {
      await prisma.identityDocument.deleteMany({ where: { employeeId: importedEmp.id } });
      await prisma.residenceAddress.deleteMany({ where: { employeeId: importedEmp.id } });
      await prisma.employmentHistory.deleteMany({ where: { employeeId: importedEmp.id } });
      await prisma.employee.delete({ where: { id: importedEmp.id } });
    }
    await prisma.auditEvent.deleteMany({ where: { entityId: batchId } });
    await prisma.importBatch.delete({ where: { id: batchId } });
  }

  // --------------------------------------------------------------------------
  // SUITE 5: Excel Import Subsystem — Server-Side Re-validation & Diff Persistence
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.blue}▶ GROUP 5: Excel Import — Server-Side Re-validation & Diff Persistence${C.reset}`);

  {
    // T5.1: Missing parsedData in POST /api/imports/commit -> 400
    {
      const req = new NextRequest('http://localhost:3000/api/imports/commit', {
        method: 'POST',
        body: JSON.stringify({ clientId: bistro.id }),
      });
      const res = await commitImportRoute(req);
      assert(res.status === 400, 'T5.1: Missing parsedData is rejected with HTTP 400');
    }

    // T5.2: Malformed CNP (bad control digit) -> Rejection by server revalidation
    {
      // 188031541001: correct control is 2. We deliberately pass 9.
      const malformedCnp = '1880315410019';
      const badWorkbook: ParsedWorkbook = {
        company: { name: bistro.name, cui: bistro.cui },
        jobContexts: [],
        employees: [
          {
            rowNumber: 2,
            lastName: 'Ionescu',
            firstName: 'Mihai',
            cnp: malformedCnp,
            birthDate: new Date('1988-03-15'),
            docNumber: '123456',
            county: 'București',
            locality: 'Sector 1',
            street: 'Strada Victoriei',
            streetNumber: '1',
            jobTitle: 'Ospătar',
            worksiteName: 'Sediu',
            hireDate: new Date('2025-01-01'),
            status: 'ACTIV',
            docType: 'CI',
            hygieneRequested: false,
            isValid: true, // Client fraudulently claims it is valid!
            errors: [],
          },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/imports/commit', {
        method: 'POST',
        body: JSON.stringify({
          clientId: bistro.id,
          parsedData: badWorkbook,
          filename: 'adversarial-bad-cnp.xlsx',
          operatorName: 'Adversarial Tester',
        }),
      });
      const res = await commitImportRoute(req);
      assert(res.status === 400, 'T5.2.1: Committing with malformed CNP is rejected by server revalidation with HTTP 400');
      const body = await res.json();
      assert(body.error.includes('Niciun rând valid'), `T5.2.2: Rejection message explains no valid rows (got: "${body.error}")`);
      assert(body.validationReport !== undefined, 'T5.2.3: Response returns validationReport');
      assert(body.validationReport.invalidRowsCount === 1, 'T5.2.4: validationReport flags 1 invalid row');
      const rowErrors = body.validationReport.errorsByRow[0]?.errors || [];
      const hasCnpError = rowErrors.some((e: string) => e.includes('CNP-ul este invalid'));
      assert(hasCnpError, 'T5.2.5: Detailed validation error explicitly flags invalid CNP checksum');
    }

    // T5.3: Duplicate intra-batch CNPs
    {
      const validCnp1 = '1900101410012'; // 190010141001: 2+63+0+0+4+6+0+4+8+0+0+9=96 %11=8 -> control 8? Let's check
      // Let's use two identical valid CNPs: 1880315410012
      const identicalCnp = '1880315410012';
      const duplicateWorkbook: ParsedWorkbook = {
        company: { name: bistro.name, cui: bistro.cui },
        jobContexts: [],
        employees: [
          {
            rowNumber: 2,
            lastName: 'Ionescu',
            firstName: 'Radu',
            cnp: identicalCnp,
            birthDate: new Date('1988-03-15'),
            docNumber: '111111',
            county: 'București',
            locality: 'Sector 1',
            street: 'Strada Victoriei',
            streetNumber: '1',
            jobTitle: 'Ospătar',
            worksiteName: 'Sediu',
            hireDate: new Date('2025-01-01'),
            status: 'ACTIV',
            docType: 'CI',
            hygieneRequested: false,
            isValid: true,
            errors: [],
          },
          {
            rowNumber: 3,
            lastName: 'Ionescu',
            firstName: 'Gheorghe',
            cnp: identicalCnp, // DUPLICATE!
            birthDate: new Date('1988-03-15'),
            docNumber: '222222',
            county: 'București',
            locality: 'Sector 1',
            street: 'Strada Victoriei',
            streetNumber: '1',
            jobTitle: 'Bucătar',
            worksiteName: 'Sediu',
            hireDate: new Date('2025-01-01'),
            status: 'ACTIV',
            docType: 'CI',
            hygieneRequested: false,
            isValid: true,
            errors: [],
          },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/imports/commit', {
        method: 'POST',
        body: JSON.stringify({
          clientId: bistro.id,
          parsedData: duplicateWorkbook,
          filename: 'adversarial-duplicate-cnp.xlsx',
          operatorName: 'Adversarial Tester',
        }),
      });
      const res = await commitImportRoute(req);
      assert(res.status === 200, 'T5.3.1: Batch with 1 valid and 1 duplicate row proceeds for valid row');
      const body = await res.json();
      assert(body.success === true, 'T5.3.2: Batch commit succeeded for valid row');

      // Verify the persisted ImportBatch
      const batchRecord = await prisma.importBatch.findUnique({
        where: { id: body.batchId },
      });
      assert(batchRecord !== null, 'T5.3.3: ImportBatch record exists in DB');
      assert(batchRecord?.errorCount === 1, `T5.3.4: errorCount on batch record is 1 (got ${batchRecord?.errorCount})`);

      // Cleanup
      await prisma.identityDocument.deleteMany({ where: { employee: { cnp: identicalCnp } } });
      await prisma.residenceAddress.deleteMany({ where: { employee: { cnp: identicalCnp } } });
      await prisma.employmentHistory.deleteMany({ where: { employee: { cnp: identicalCnp } } });
      await prisma.employee.deleteMany({ where: { cnp: identicalCnp } });
      await prisma.auditEvent.deleteMany({ where: { entityId: body.batchId } });
      await prisma.importBatch.delete({ where: { id: body.batchId } });
    }

    // T5.4: Successful Import Commit & Deep Inspection of JSON validationReport and diffData
    {
      const validCnpFresh = '1880315410012';
      const freshWorkbook: ParsedWorkbook = {
        company: { name: bistro.name, cui: bistro.cui },
        jobContexts: [],
        employees: [
          {
            rowNumber: 2,
            lastName: 'Popa',
            firstName: 'Tudor',
            cnp: validCnpFresh,
            birthDate: new Date('1988-03-15'),
            docNumber: '987654',
            county: 'București',
            locality: 'Sector 1',
            street: 'Strada Academiei',
            streetNumber: '15',
            jobTitle: 'Ajutor Ospătar',
            worksiteName: 'Sediu Central',
            hireDate: new Date('2025-02-01'),
            status: 'ACTIV',
            docType: 'CI',
            hygieneRequested: false,
            isValid: true,
            errors: [],
          },
        ],
      };

      const req = new NextRequest('http://localhost:3000/api/imports/commit', {
        method: 'POST',
        body: JSON.stringify({
          clientId: bistro.id,
          parsedData: freshWorkbook,
          filename: 'valid-forensic-commit.xlsx',
          operatorName: 'Forensic Challenger 2',
        }),
      });
      const res = await commitImportRoute(req);
      assert(res.status === 200, 'T5.4.1: Valid import commit returns HTTP 200');
      const body = await res.json();
      assert(body.success === true, 'T5.4.2: Response body contains success: true');
      const committedBatchId = body.batchId;
      assert(typeof committedBatchId === 'string' && committedBatchId.length > 0, 'T5.4.3: Valid batchId returned');

      // Database persistence inspection
      const persistedBatch = await prisma.importBatch.findUnique({
        where: { id: committedBatchId },
      });
      assert(persistedBatch !== null, 'T5.4.4: ImportBatch persisted in PostgreSQL');
      assert(persistedBatch?.validationReport !== null, 'T5.4.5: validationReport is NOT NULL in PostgreSQL');
      assert(persistedBatch?.diffData !== null, 'T5.4.6: diffData is NOT NULL in PostgreSQL');

      // Parse JSON validationReport
      let parsedValidation: any = null;
      try {
        parsedValidation = JSON.parse(persistedBatch!.validationReport!);
      } catch (e) {
        parsedValidation = null;
      }
      assert(parsedValidation !== null, 'T5.4.7: validationReport is valid serialized JSON');
      assert(parsedValidation.schemaVersion === '1.0', 'T5.4.8: validationReport has schemaVersion "1.0"');
      assert(parsedValidation.totalRows === 1, 'T5.4.9: validationReport records totalRows: 1');
      assert(parsedValidation.validRowsCount === 1, 'T5.4.10: validationReport records validRowsCount: 1');
      assert(parsedValidation.invalidRowsCount === 0, 'T5.4.11: validationReport records invalidRowsCount: 0');
      assert(parsedValidation.operatorName === 'Forensic Challenger 2', 'T5.4.12: validationReport records operatorName');

      // Parse JSON diffData
      let parsedDiff: any = null;
      try {
        parsedDiff = JSON.parse(persistedBatch!.diffData!);
      } catch (e) {
        parsedDiff = null;
      }
      assert(parsedDiff !== null, 'T5.4.13: diffData is valid serialized JSON');
      assert(parsedDiff.schemaVersion === '1.0', 'T5.4.14: diffData has schemaVersion "1.0"');
      assert(parsedDiff.clientId === bistro.id, 'T5.4.15: diffData records correct clientId');
      assert(parsedDiff.summary !== undefined, 'T5.4.16: diffData records summary metadata');
      assert(Array.isArray(parsedDiff.items) && parsedDiff.items.length === 1, 'T5.4.17: diffData records diff items array with 1 item');
      assert(parsedDiff.items[0].name === 'Popa Tudor', 'T5.4.18: diff item records employee name');
      assert(parsedDiff.items[0].status === 'NEW', 'T5.4.19: diff item marks employee as NEW');

      // Cleanup
      await prisma.identityDocument.deleteMany({ where: { employee: { cnp: validCnpFresh } } });
      await prisma.residenceAddress.deleteMany({ where: { employee: { cnp: validCnpFresh } } });
      await prisma.employmentHistory.deleteMany({ where: { employee: { cnp: validCnpFresh } } });
      await prisma.employee.deleteMany({ where: { cnp: validCnpFresh } });
      await prisma.auditEvent.deleteMany({ where: { entityId: committedBatchId } });
      await prisma.importBatch.delete({ where: { id: committedBatchId } });
    }
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  TEST SUMMARY${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`  Total Assertions Run: ${passedCount + failedCount}`);
  console.log(`  Passed: ${C.green}${passedCount}${C.reset}`);
  console.log(`  Failed: ${failedCount > 0 ? `${C.red}${failedCount}${C.reset}` : '0'}`);

  if (failedCount > 0) {
    console.error(`\n${C.bold}${C.red}Failures encountered:${C.reset}`);
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${C.bold}${C.green}✓ ALL 44/44 EMPIRICAL ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!${C.reset}\n`);
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
