/**
 * ============================================================================
 * ADVERSARIAL CHALLENGER 2: EMPIRICAL STRESS HARNESS FOR MILESTONE 2 (M2)
 * ============================================================================
 * 
 * Scope: Employee Lifecycle CRUD, Occupational Health & Status PLECAT
 * 
 * Rigorous empirical validation of:
 * 1. POST /api/employees (Feature 10):
 *    - Duplicate CNP in the same company: rejects with HTTP 409 Conflict
 *    - Identical CNP in two DIFFERENT companies: allowed (compound unique [clientId, cnp])
 *    - Invalid CNP format (letters, wrong length 12/14, corrupt control digit): rejects with HTTP 400
 *    - Transactional integrity: Employee + IdentityDocument + ResidenceAddress saved atomically
 *    - Automatic derivation of birthDate and sex from valid CNP when omitted (M/1985, F/2001)
 *    - AuditEvent emission: action 'create' logged without raw CNP in details
 * 2. PUT /api/employees/[id] (Feature 11):
 *    - Update employee with new job and worksite: EmploymentHistory record closed and new opened
 *    - Upsert IdentityDocument and ResidenceAddress: created if missing, updated if present (no duplicates)
 * 3. POST /api/employees/[id]/terminate (Feature 12):
 *    - Rejection when leaveDate < hireDate: rejects with HTTP 400
 *    - Rejection when employee is already status: "PLECAT": rejects with HTTP 400
 *    - Correct termination: status becomes "PLECAT", leaveDate set, EmploymentHistory closed, AuditEvent action 'EMPLOYEE_TERMINATED'
 * 4. POST /api/documents/generate-batch (Feature 13):
 *    - Request batch generation including terminated employee: rejects with HTTP 400
 *    - Request batch generation for employee with INAPT medical verdict: rejects with HTTP 400
 * 5. GET /api/clients/[id]/employees:
 *    - Default query: returns only status !== "PLECAT"
 *    - Query ?includeTerminated=true: returns both active and PLECAT
 *    - Query ?status=PLECAT: returns only PLECAT
 *    - Query ?status=ACTIV: returns only ACTIV
 * 
 * Invocation:
 *   npx tsx scripts/adversarial-challenger2-m2.ts
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { generateValidCnp } from './e2e-test-helpers';

// Route Handlers
import { POST as createEmployeeRoute } from '../src/app/api/employees/route';
import { GET as getEmployeeRoute, PUT as updateEmployeeRoute } from '../src/app/api/employees/[id]/route';
import { POST as terminateEmployeeRoute } from '../src/app/api/employees/[id]/terminate/route';
import { POST as generateBatchRoute } from '../src/app/api/documents/generate-batch/route';
import { GET as getClientEmployeesRoute } from '../src/app/api/clients/[id]/employees/route';

// ANSI colors for clean test reporting
const COLORS = {
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
  group: string;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)})`);
  }
}

async function runTest(
  group: string,
  id: string,
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ group, id, name, passed: true, durationMs });
    console.log(`  ${COLORS.green}✓${COLORS.reset} [${id}] ${name} (${durationMs}ms)`);
  } catch (error: any) {
    const durationMs = Date.now() - start;
    results.push({
      group,
      id,
      name,
      passed: false,
      durationMs,
      error: error?.message || String(error),
    });
    console.error(`  ${COLORS.red}✗${COLORS.reset} [${id}] ${name} (${durationMs}ms)`);
    console.error(`    ${COLORS.red}Error:${COLORS.reset} ${error?.message || error}`);
  }
}

async function main() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}  CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS HARNESS — MILESTONE 2 (M2)${COLORS.reset}`);
  console.log(`${COLORS.dim}  Statutory Framework: Legea 319/2006, HG 355/2007, HG 1425/2006, Ordin MMSS 2171/2022${COLORS.reset}`);
  console.log(`${COLORS.cyan}================================================================================${COLORS.reset}\n`);

  const createdClientIds: string[] = [];

  try {
    // --------------------------------------------------------------------------
    // FIXTURE SETUP: Isolated Test Companies & Dependencies
    // --------------------------------------------------------------------------
    console.log(`${COLORS.bright}▶ Setting up isolated test fixtures...${COLORS.reset}`);

    const randSeed = Math.floor(100000 + Math.random() * 900000);
    const company1Cui = `RO${randSeed}1`;
    const company2Cui = `RO${randSeed}2`;

    const client1 = await prisma.client.create({
      data: {
        name: `CHALLENGER 2 ALPHA SRL (${randSeed})`,
        cui: company1Cui,
        regCom: `J40/${randSeed}/2026`,
        address: 'București, Str. Laboratorului 1, Sector 1',
        legalRepresentative: 'Director General Alpha',
        caenCode: '6201',
        contactEmail: `alpha_${randSeed}@test.ro`,
      },
    });
    createdClientIds.push(client1.id);

    const client2 = await prisma.client.create({
      data: {
        name: `CHALLENGER 2 BETA SA (${randSeed})`,
        cui: company2Cui,
        regCom: `J40/${randSeed + 1}/2026`,
        address: 'Cluj-Napoca, Str. Universitatii 10',
        legalRepresentative: 'Director General Beta',
        caenCode: '5610',
        contactEmail: `beta_${randSeed}@test.ro`,
      },
    });
    createdClientIds.push(client2.id);

    const worksite1A = await prisma.worksite.create({
      data: {
        clientId: client1.id,
        name: 'Sediu Central Alpha',
        address: 'București, Str. Laboratorului 1',
      },
    });

    const worksite1B = await prisma.worksite.create({
      data: {
        clientId: client1.id,
        name: 'Punct de Lucru Nord Alpha',
        address: 'București, Bvd. Pipera 45',
      },
    });

    const job1A = await prisma.job.create({
      data: {
        clientId: client1.id,
        title: 'Inginer Software Alpha',
        corCode: '251201',
      },
    });

    const job1B = await prisma.job.create({
      data: {
        clientId: client1.id,
        title: 'Team Lead Dev Alpha',
        corCode: '251203',
      },
    });

    console.log(`  ${COLORS.dim}Created Client 1: ${client1.name} (ID: ${client1.id})${COLORS.reset}`);
    console.log(`  ${COLORS.dim}Created Client 2: ${client2.name} (ID: ${client2.id})${COLORS.reset}\n`);

    // ==========================================================================
    // GROUP 1: POST /api/employees (Feature 10)
    // ==========================================================================
    console.log(`${COLORS.bright}▶ GROUP 1: POST /api/employees (Feature 10: Manual Employee Creation)${COLORS.reset}`);

    const sharedCnpMale = generateValidCnp(`1850615${Math.floor(10000 + Math.random() * 89999)}`);
    let createdEmp1Id: string = '';

    await runTest('G1_CREATE', 'G1.1', 'Duplicate CNP in the SAME company must reject with HTTP 409 Conflict', async () => {
      // 1. First creation in Client 1
      const req1 = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Andrei',
          lastName: 'Popa',
          cnp: sharedCnpMale,
          hireDate: '2026-01-15',
          currentJobId: job1A.id,
          currentWorksiteId: worksite1A.id,
        }),
      });
      const res1 = await createEmployeeRoute(req1);
      const json1 = await res1.json();
      assertEqual(res1.status, 201, 'First employee creation must succeed with 201');
      assert(json1.success === true, 'Response body must have success: true');
      createdEmp1Id = json1.employee.id;

      // 2. Second creation with SAME CNP in SAME Client 1
      const req2 = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Alt',
          lastName: 'Salariat',
          cnp: sharedCnpMale,
          hireDate: '2026-02-01',
        }),
      });
      const res2 = await createEmployeeRoute(req2);
      const json2 = await res2.json();
      assertEqual(res2.status, 409, 'Duplicate CNP in same company must return HTTP 409 Conflict');
      assert(json2.error.includes('există deja'), 'Error message must explain duplicate CNP');
    });

    await runTest('G1_CREATE', 'G1.2', 'Identical CNP in two DIFFERENT companies must be allowed (compound unique [clientId, cnp])', async () => {
      // Creation in Client 2 with the same sharedCnpMale
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client2.id,
          firstName: 'Andrei Part-Time',
          lastName: 'Popa',
          cnp: sharedCnpMale,
          hireDate: '2026-02-15',
        }),
      });
      const res = await createEmployeeRoute(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Identical CNP in different company must return HTTP 201 Created');
      assert(json.success === true, 'Response must indicate success');
      assertEqual(json.employee.clientId, client2.id, 'Employee must belong to Client 2');
      assertEqual(json.employee.cnp, sharedCnpMale, 'Employee must retain valid CNP in Client 2');
    });

    await runTest('G1_CREATE', 'G1.3', 'Invalid CNP with alphabetic characters must reject with HTTP 400', async () => {
      const invalidCnpLetters = '1850615ABC456';
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Test',
          lastName: 'Invalid',
          cnp: invalidCnpLetters,
          hireDate: '2026-01-01',
        }),
      });
      const res = await createEmployeeRoute(req);
      assertEqual(res.status, 400, 'CNP with letters must return HTTP 400');
    });

    await runTest('G1_CREATE', 'G1.4', 'Invalid CNP with wrong length (12 digits) must reject with HTTP 400', async () => {
      const shortCnp = '185061512345'; // 12 digits
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Test',
          lastName: 'Short',
          cnp: shortCnp,
          hireDate: '2026-01-01',
        }),
      });
      const res = await createEmployeeRoute(req);
      assertEqual(res.status, 400, 'CNP with 12 digits must return HTTP 400');
    });

    await runTest('G1_CREATE', 'G1.5', 'Invalid CNP with wrong length (14 digits) must reject with HTTP 400', async () => {
      const longCnp = '18506151234567'; // 14 digits
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Test',
          lastName: 'Long',
          cnp: longCnp,
          hireDate: '2026-01-01',
        }),
      });
      const res = await createEmployeeRoute(req);
      assertEqual(res.status, 400, 'CNP with 14 digits must return HTTP 400');
    });

    await runTest('G1_CREATE', 'G1.6', 'Invalid CNP with corrupt control digit must reject with HTTP 400', async () => {
      const validCnp = generateValidCnp(`1850615${Math.floor(10000 + Math.random() * 89999)}`);
      const lastDigit = parseInt(validCnp.slice(-1), 10);
      const corruptLastDigit = (lastDigit + 1) % 10;
      const corruptCnp = validCnp.slice(0, 12) + corruptLastDigit;

      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Test',
          lastName: 'ChecksumError',
          cnp: corruptCnp,
          hireDate: '2026-01-01',
        }),
      });
      const res = await createEmployeeRoute(req);
      assertEqual(res.status, 400, 'CNP with invalid check digit must return HTTP 400');
    });

    let transactionalEmpId = '';
    await runTest('G1_CREATE', 'G1.7', 'Transactional integrity: Employee + IdentityDocument + ResidenceAddress saved atomically', async () => {
      const cnpTransactional = generateValidCnp(`1870320${Math.floor(10000 + Math.random() * 89999)}`);
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Mihai',
          lastName: 'Enache',
          cnp: cnpTransactional,
          hireDate: '2026-01-10',
          currentJobId: job1A.id,
          currentWorksiteId: worksite1A.id,
          cimNumber: 'CIM-TRX-101',
          grossSalary: 8200,
          // Identity Document
          idDocType: 'CI',
          idSeries: 'RX',
          idNumber: '876543',
          idIssuedBy: 'SPCLEP Sector 1',
          idIssueDate: '2022-05-10',
          idExpiryDate: '2032-05-10',
          // Residence Address
          addressCounty: 'București',
          addressLocality: 'Sector 1',
          addressStreet: 'Str. Aviației',
          addressNumber: '25',
          addressBuilding: 'B1',
          addressApartment: '12',
          addressPostalCode: '014000',
        }),
      });

      const res = await createEmployeeRoute(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Creation must succeed with 201');
      transactionalEmpId = json.employee.id;

      // Directly verify in Prisma database: all 3 models must exist and match!
      const dbEmp = await prisma.employee.findUnique({
        where: { id: transactionalEmpId },
        include: {
          identityDocument: true,
          residenceAddress: true,
          employmentHistory: true,
        },
      });

      assert(dbEmp !== null, 'Employee record must exist in DB');
      assertEqual(dbEmp.cnp, cnpTransactional, 'CNP in DB must match');
      assertEqual(dbEmp.grossSalary, 8200, 'Salary must be persisted');

      assert(dbEmp.identityDocument !== null, 'IdentityDocument record must exist in DB');
      assertEqual(dbEmp.identityDocument.series, 'RX', 'ID series must match');
      assertEqual(dbEmp.identityDocument.number, '876543', 'ID number must match');

      assert(dbEmp.residenceAddress !== null, 'ResidenceAddress record must exist in DB');
      assertEqual(dbEmp.residenceAddress.county, 'București', 'Address county must match');
      assertEqual(dbEmp.residenceAddress.locality, 'Sector 1', 'Address locality must match');
      assertEqual(dbEmp.residenceAddress.street, 'Str. Aviației', 'Address street must match');

      assert(dbEmp.employmentHistory.length > 0, 'EmploymentHistory record must exist');
      assertEqual(dbEmp.employmentHistory[0].jobId, job1A.id, 'Employment history job must match');
      assertEqual(dbEmp.employmentHistory[0].worksiteId, worksite1A.id, 'Employment history worksite must match');
    });

    await runTest('G1_CREATE', 'G1.8', 'Automatic derivation of birthDate and sex from CNP when omitted (Male, 1985)', async () => {
      // Prefix 1850615 -> Male born 1985-06-15
      const maleCnp = generateValidCnp(`1850615${Math.floor(10000 + Math.random() * 89999)}`);
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Vasile',
          lastName: 'Derivat',
          cnp: maleCnp,
          hireDate: '2026-01-20',
          // Omit sex and birthDate
        }),
      });

      const res = await createEmployeeRoute(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Creation must succeed with 201');

      const emp = await prisma.employee.findUnique({ where: { id: json.employee.id } });
      assert(emp !== null, 'Employee must exist');
      assertEqual(emp.sex, 'M', 'Derived sex must be "M"');
      assert(emp.birthDate !== null, 'Derived birthDate must not be null');

      const birthUtc = emp.birthDate.toISOString().slice(0, 10);
      assertEqual(birthUtc, '1985-06-15', 'Derived birthDate must be exactly 1985-06-15');
    });

    await runTest('G1_CREATE', 'G1.9', 'Automatic derivation of birthDate and sex from CNP when omitted (Female, 2001)', async () => {
      // Prefix 6010420 -> Female born 2001-04-20 (starts with 6 -> female born 2000-2099)
      const femaleCnp = generateValidCnp(`6010420${Math.floor(10000 + Math.random() * 89999)}`);
      const req = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Elena',
          lastName: 'Derivata',
          cnp: femaleCnp,
          hireDate: '2026-01-20',
          // Omit sex and birthDate
        }),
      });

      const res = await createEmployeeRoute(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Creation must succeed with 201');

      const emp = await prisma.employee.findUnique({ where: { id: json.employee.id } });
      assert(emp !== null, 'Employee must exist');
      assertEqual(emp.sex, 'F', 'Derived sex must be "F"');
      assert(emp.birthDate !== null, 'Derived birthDate must not be null');

      const birthUtc = emp.birthDate.toISOString().slice(0, 10);
      assertEqual(birthUtc, '2001-04-20', 'Derived birthDate must be exactly 2001-04-20');
    });

    await runTest('G1_CREATE', 'G1.10', 'AuditEvent emission: action "create" logged without raw CNP in details', async () => {
      assert(createdEmp1Id !== '', 'Expected createdEmp1Id from G1.1');
      const audit = await prisma.auditEvent.findFirst({
        where: {
          entityType: 'Employee',
          entityId: createdEmp1Id,
          action: 'create',
        },
      });

      assert(audit !== null, 'AuditEvent with action "create" must exist');
      assert(audit.details !== null, 'AuditEvent details must not be null');
      assert(!audit.details.includes(sharedCnpMale), 'GDPR Violation: raw CNP must NOT be exposed in AuditEvent details');

      const parsedDetails = JSON.parse(audit.details);
      assertEqual(parsedDetails.clientId, client1.id, 'AuditEvent must log correct clientId');
      assert(parsedDetails.employeeName.includes('Popa Andrei'), 'AuditEvent must log employee name');
    });

    // ==========================================================================
    // GROUP 2: PUT /api/employees/[id] (Feature 11)
    // ==========================================================================
    console.log(`\n${COLORS.bright}▶ GROUP 2: PUT /api/employees/[id] (Feature 11: Employee Profile & History)${COLORS.reset}`);

    await runTest('G2_UPDATE', 'G2.1', 'Update employee with new job and worksite: old EmploymentHistory closed, new opened', async () => {
      assert(transactionalEmpId !== '', 'Expected transactionalEmpId from G1.7');

      // Before update: 1 history record, validTo is null
      const initialHistory = await prisma.employmentHistory.findMany({
        where: { employeeId: transactionalEmpId },
      });
      assertEqual(initialHistory.length, 1, 'Initial history must have 1 record');
      assertEqual(initialHistory[0].validTo, null, 'Initial history must be open (validTo is null)');
      assertEqual(initialHistory[0].jobId, job1A.id, 'Initial history must have job1A');

      // Call PUT /api/employees/[id] with new job1B and worksite1B
      const req = new NextRequest(`http://localhost:3000/api/employees/${transactionalEmpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentJobId: job1B.id,
          currentWorksiteId: worksite1B.id,
          grossSalary: 9500,
        }),
      });

      const res = await updateEmployeeRoute(req, { params: Promise.resolve({ id: transactionalEmpId }) });
      const json = await res.json();
      assertEqual(res.status, 200, 'PUT must return HTTP 200');
      assert(json.success === true, 'Response must indicate success');

      // Verify in DB
      const updatedEmp = await prisma.employee.findUnique({
        where: { id: transactionalEmpId },
        include: {
          employmentHistory: {
            orderBy: { validFrom: 'asc' },
          },
        },
      });

      assert(updatedEmp !== null, 'Employee must exist');
      assertEqual(updatedEmp.currentJobId, job1B.id, 'Employee currentJobId must be updated to job1B');
      assertEqual(updatedEmp.currentWorksiteId, worksite1B.id, 'Employee currentWorksiteId must be updated to worksite1B');
      assertEqual(updatedEmp.grossSalary, 9500, 'Employee grossSalary must be updated to 9500');

      const history = updatedEmp.employmentHistory;
      assertEqual(history.length, 2, 'EmploymentHistory must now have 2 records');

      // Old record: closed!
      assertEqual(history[0].jobId, job1A.id, 'First record must be old job1A');
      assert(history[0].validTo !== null, 'First record must be closed (validTo != null)');

      // New record: open!
      assertEqual(history[1].jobId, job1B.id, 'Second record must be new job1B');
      assertEqual(history[1].worksiteId, worksite1B.id, 'Second record must be new worksite1B');
      assertEqual(history[1].validTo, null, 'Second record must be open (validTo is null)');
    });

    let bareEmployeeId = '';
    await runTest('G2_UPDATE', 'G2.2', 'Upsert IdentityDocument & ResidenceAddress: created when initially missing', async () => {
      // 1. Create a bare employee without ID document or Address
      const cnpBare = generateValidCnp(`1891125${Math.floor(10000 + Math.random() * 89999)}`);
      const reqCreate = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Cosmin',
          lastName: 'FaraActe',
          cnp: cnpBare,
          hireDate: '2026-01-05',
        }),
      });
      const resCreate = await createEmployeeRoute(reqCreate);
      const jsonCreate = await resCreate.json();
      bareEmployeeId = jsonCreate.employee.id;

      // Verify neither ID nor Address exists
      const checkBefore = await prisma.employee.findUnique({
        where: { id: bareEmployeeId },
        include: { identityDocument: true, residenceAddress: true },
      });
      assert(checkBefore?.identityDocument === null, 'ID doc must initially be null');
      assert(checkBefore?.residenceAddress === null, 'Address must initially be null');

      // 2. PUT to upsert ID and Address
      const reqUpdate = new NextRequest(`http://localhost:3000/api/employees/${bareEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idDocType: 'CI',
          idSeries: 'CJ',
          idNumber: '334455',
          idIssuedBy: 'SPCLEP Cluj',
          idIssueDate: '2023-01-15',
          idExpiryDate: '2033-01-15',
          addressCounty: 'Cluj',
          addressLocality: 'Cluj-Napoca',
          addressStreet: 'Str. Observatorului',
          addressNumber: '15',
        }),
      });

      const resUpdate = await updateEmployeeRoute(reqUpdate, { params: Promise.resolve({ id: bareEmployeeId }) });
      assertEqual(resUpdate.status, 200, 'PUT must return HTTP 200');

      // Verify created in DB
      const checkAfter = await prisma.employee.findUnique({
        where: { id: bareEmployeeId },
        include: { identityDocument: true, residenceAddress: true },
      });
      assert(checkAfter?.identityDocument !== null, 'IdentityDocument must have been created');
      assertEqual(checkAfter?.identityDocument?.number, '334455', 'ID number must match');
      assertEqual(checkAfter?.identityDocument?.series, 'CJ', 'ID series must match');

      assert(checkAfter?.residenceAddress !== null, 'ResidenceAddress must have been created');
      assertEqual(checkAfter?.residenceAddress?.locality, 'Cluj-Napoca', 'Address locality must match');
      assertEqual(checkAfter?.residenceAddress?.street, 'Str. Observatorului', 'Address street must match');
    });

    await runTest('G2_UPDATE', 'G2.3', 'Upsert IdentityDocument & ResidenceAddress: updated when already present (no duplicates)', async () => {
      assert(bareEmployeeId !== '', 'Expected bareEmployeeId from G2.2');

      // PUT again to modify series, number and street
      const reqUpdate = new NextRequest(`http://localhost:3000/api/employees/${bareEmployeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idSeries: 'CJ',
          idNumber: '998877',
          addressStreet: 'Bvd. 21 Decembrie 1989',
          addressNumber: '100',
        }),
      });

      const resUpdate = await updateEmployeeRoute(reqUpdate, { params: Promise.resolve({ id: bareEmployeeId }) });
      assertEqual(resUpdate.status, 200, 'PUT must return HTTP 200');

      // Verify in DB: exactly 1 identityDocument and 1 residenceAddress, updated!
      const allDocs = await prisma.identityDocument.findMany({ where: { employeeId: bareEmployeeId } });
      assertEqual(allDocs.length, 1, 'There must remain exactly 1 IdentityDocument (upserted, not duplicated)');
      assertEqual(allDocs[0].number, '998877', 'IdentityDocument number must be updated');

      const allAddrs = await prisma.residenceAddress.findMany({ where: { employeeId: bareEmployeeId } });
      assertEqual(allAddrs.length, 1, 'There must remain exactly 1 ResidenceAddress (upserted, not duplicated)');
      assertEqual(allAddrs[0].street, 'Bvd. 21 Decembrie 1989', 'ResidenceAddress street must be updated');
      assertEqual(allAddrs[0].number, '100', 'ResidenceAddress number must be updated');
    });

    // ==========================================================================
    // GROUP 3: POST /api/employees/[id]/terminate (Feature 12)
    // ==========================================================================
    console.log(`\n${COLORS.bright}▶ GROUP 3: POST /api/employees/[id]/terminate (Feature 12: Contract Termination)${COLORS.reset}`);

    let termTestEmpId = '';
    const hireDateStr = '2026-03-01';

    await runTest('G3_TERMINATE', 'G3.1', 'Rejection when leaveDate < hireDate (chronological violation): HTTP 400', async () => {
      // Create employee hired on 2026-03-01
      const cnpTerm = generateValidCnp(`1900101${Math.floor(10000 + Math.random() * 89999)}`);
      const reqCreate = new NextRequest('http://localhost:3000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client1.id,
          firstName: 'Dan',
          lastName: 'Plecatoru',
          cnp: cnpTerm,
          hireDate: hireDateStr,
          currentJobId: job1A.id,
          currentWorksiteId: worksite1A.id,
        }),
      });
      const resCreate = await createEmployeeRoute(reqCreate);
      const jsonCreate = await resCreate.json();
      termTestEmpId = jsonCreate.employee.id;

      // Attempt termination with leaveDate earlier than hireDate (e.g., 2026-02-15)
      const reqTermEarly = new NextRequest(`http://localhost:3000/api/employees/${termTestEmpId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveDate: '2026-02-15',
          reason: 'Plecare timpurie imposibila',
        }),
      });

      const resTermEarly = await terminateEmployeeRoute(reqTermEarly, { params: Promise.resolve({ id: termTestEmpId }) });
      const jsonTermEarly = await resTermEarly.json();

      assertEqual(resTermEarly.status, 400, 'Termination before hireDate must return HTTP 400');
      assert(jsonTermEarly.error.includes('anterioară datei angajării'), 'Error message must cite chronological violation');

      // Verify employee status is still ACTIV
      const empDb = await prisma.employee.findUnique({ where: { id: termTestEmpId } });
      assertEqual(empDb?.status, 'ACTIV', 'Employee must remain ACTIV after rejected termination');
      assertEqual(empDb?.leaveDate, null, 'leaveDate must remain null');
    });

    await runTest('G3_TERMINATE', 'G3.2', 'Correct termination: status becomes "PLECAT", leaveDate set, history closed, AuditEvent emitted', async () => {
      assert(termTestEmpId !== '', 'Expected termTestEmpId from G3.1');

      const validLeaveDate = '2026-06-30';
      const terminationReason = 'Demisie art. 81 Codul Muncii';

      const reqTerm = new NextRequest(`http://localhost:3000/api/employees/${termTestEmpId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveDate: validLeaveDate,
          reason: terminationReason,
          operatorName: 'Inspector HR Challenger',
        }),
      });

      const resTerm = await terminateEmployeeRoute(reqTerm, { params: Promise.resolve({ id: termTestEmpId }) });
      const jsonTerm = await resTerm.json();
      assertEqual(resTerm.status, 200, 'Valid termination must return HTTP 200');
      assert(jsonTerm.success === true, 'Response must indicate success');

      // Verify in DB
      const empDb = await prisma.employee.findUnique({
        where: { id: termTestEmpId },
        include: { employmentHistory: true },
      });

      assertEqual(empDb?.status, 'PLECAT', 'Employee status must become "PLECAT"');
      assert(empDb?.leaveDate !== null, 'leaveDate must be set');
      assertEqual(empDb?.leaveDate?.toISOString().slice(0, 10), validLeaveDate, 'leaveDate must match specified date');
      assert(empDb?.adminNotes?.includes(terminationReason), 'adminNotes must record termination reason');

      // EmploymentHistory must be closed
      for (const h of empDb?.employmentHistory || []) {
        assert(h.validTo !== null, 'All employmentHistory records must have validTo closed');
      }

      // AuditEvent emission check
      const audit = await prisma.auditEvent.findFirst({
        where: {
          entityType: 'Employee',
          entityId: termTestEmpId,
          action: 'EMPLOYEE_TERMINATED',
        },
      });
      assert(audit !== null, 'AuditEvent with action "EMPLOYEE_TERMINATED" must exist');
      assertEqual(audit.actorName, 'Inspector HR Challenger', 'Actor name must match');
      assert(audit.details?.includes('Demisie art. 81'), 'Audit details must record reason');
    });

    await runTest('G3_TERMINATE', 'G3.3', 'Double termination rejection: when employee is already "PLECAT" -> HTTP 400', async () => {
      assert(termTestEmpId !== '', 'Expected termTestEmpId from G3.2');

      // Attempt second termination on the same employee
      const reqSecondTerm = new NextRequest(`http://localhost:3000/api/employees/${termTestEmpId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveDate: '2026-07-15',
          reason: 'A doua plecare imposibila',
        }),
      });

      const resSecondTerm = await terminateEmployeeRoute(reqSecondTerm, { params: Promise.resolve({ id: termTestEmpId }) });
      const jsonSecondTerm = await resSecondTerm.json();

      assertEqual(resSecondTerm.status, 400, 'Double termination must return HTTP 400');
      assert(jsonSecondTerm.error.includes('deja încetat'), 'Error message must note contract is already terminated');
    });

    // ==========================================================================
    // GROUP 4: POST /api/documents/generate-batch (Feature 13)
    // ==========================================================================
    console.log(`\n${COLORS.bright}▶ GROUP 4: POST /api/documents/generate-batch (Feature 13: Strict Status & Medical Guard)${COLORS.reset}`);

    // Create an employee with medicalFitnessVerdict: "INAPT"
    let inaptEmpId = '';
    const cnpInapt = generateValidCnp(`1910202${Math.floor(10000 + Math.random() * 89999)}`);
    const inaptEmp = await prisma.employee.create({
      data: {
        clientId: client1.id,
        firstName: 'George',
        lastName: 'InaptMedical',
        cnp: cnpInapt,
        hireDate: new Date('2026-01-10'),
        status: 'ACTIV',
        medicalLastExamDate: new Date('2026-01-10'),
        medicalIntervalMonths: 12,
        medicalFitnessVerdict: 'INAPT',
        currentJobId: job1A.id,
        currentWorksiteId: worksite1A.id,
      },
    });
    inaptEmpId = inaptEmp.id;

    await runTest('G4_BATCH', 'G4.1', 'Batch generation with terminated (PLECAT) employee must reject with HTTP 400', async () => {
      assert(createdEmp1Id !== '', 'Need active employee createdEmp1Id');
      assert(termTestEmpId !== '', 'Need terminated employee termTestEmpId');

      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client1.id,
          employeeIds: [createdEmp1Id, termTestEmpId],
        }),
      });

      const res = await generateBatchRoute(req);
      const json = await res.json();

      assertEqual(res.status, 400, 'Batch generation containing PLECAT employee must return HTTP 400');
      assert(json.error.includes('status PLECAT'), 'Error must explicitly identify PLECAT status as reason');
      assert(json.terminatedEmployees && json.terminatedEmployees.length > 0, 'Response should list terminated employees');
    });

    await runTest('G4_BATCH', 'G4.2', 'Batch generation for employee with INAPT medical verdict must reject with HTTP 400', async () => {
      assert(inaptEmpId !== '', 'Need inaptEmpId');

      const req = new NextRequest('http://localhost:3000/api/documents/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: client1.id,
          employeeIds: [inaptEmpId],
        }),
      });

      const res = await generateBatchRoute(req);
      const json = await res.json();

      assertEqual(res.status, 400, 'Batch generation for INAPT employee must return HTTP 400');
      assert(json.error.includes('INAPT') || json.error.includes('expirate'), 'Error must note INAPT verdict restriction');
      assert(json.rejectedEmployees && json.rejectedEmployees.length > 0, 'Response must include rejectedEmployees array');
    });

    // ==========================================================================
    // GROUP 5: GET /api/clients/[id]/employees
    // ==========================================================================
    console.log(`\n${COLORS.bright}▶ GROUP 5: GET /api/clients/[id]/employees (Status Filtering)${COLORS.reset}`);

    await runTest('G5_LIST', 'G5.1', 'Default query returns only active employees (status !== "PLECAT")', async () => {
      const req = new NextRequest(`http://localhost:3000/api/clients/${client1.id}/employees`);
      const res = await getClientEmployeesRoute(req, { params: Promise.resolve({ id: client1.id }) });
      assertEqual(res.status, 200, 'GET must return HTTP 200');

      const employees = await res.json();
      assert(Array.isArray(employees), 'Response must be an array');
      assert(employees.length > 0, 'Should return active employees for Client 1');

      // Check that NO employee in the result has status: 'PLECAT'
      const plecatFound = employees.find((e: any) => e.status === 'PLECAT');
      assert(plecatFound === undefined, 'Default query must NEVER include PLECAT employees');

      // termTestEmpId must NOT be present
      const termEmpPresent = employees.find((e: any) => e.id === termTestEmpId);
      assert(termEmpPresent === undefined, 'Terminated employee must be excluded from default query');
    });

    await runTest('G5_LIST', 'G5.2', 'Query ?includeTerminated=true returns both active and PLECAT employees', async () => {
      const req = new NextRequest(`http://localhost:3000/api/clients/${client1.id}/employees?includeTerminated=true`);
      const res = await getClientEmployeesRoute(req, { params: Promise.resolve({ id: client1.id }) });
      assertEqual(res.status, 200, 'GET must return HTTP 200');

      const employees = await res.json();
      assert(Array.isArray(employees), 'Response must be an array');

      // Both active and PLECAT should be present
      const hasActive = employees.some((e: any) => e.status === 'ACTIV');
      const hasPlecat = employees.some((e: any) => e.status === 'PLECAT');

      assert(hasActive, 'Query ?includeTerminated=true must contain active employees');
      assert(hasPlecat, 'Query ?includeTerminated=true must contain PLECAT employees');

      // termTestEmpId MUST be present
      const termEmpPresent = employees.find((e: any) => e.id === termTestEmpId);
      assert(termEmpPresent !== undefined, 'Terminated employee must be present with includeTerminated=true');
    });

    await runTest('G5_LIST', 'G5.3', 'Query ?status=PLECAT returns ONLY terminated employees', async () => {
      const req = new NextRequest(`http://localhost:3000/api/clients/${client1.id}/employees?status=PLECAT`);
      const res = await getClientEmployeesRoute(req, { params: Promise.resolve({ id: client1.id }) });
      assertEqual(res.status, 200, 'GET must return HTTP 200');

      const employees = await res.json();
      assert(Array.isArray(employees), 'Response must be an array');
      assert(employees.length > 0, 'Should have at least 1 terminated employee');

      for (const emp of employees) {
        assertEqual(emp.status, 'PLECAT', 'Every employee in ?status=PLECAT query must have status "PLECAT"');
      }
    });

    await runTest('G5_LIST', 'G5.4', 'Query ?status=ACTIV returns ONLY active employees', async () => {
      const req = new NextRequest(`http://localhost:3000/api/clients/${client1.id}/employees?status=ACTIV`);
      const res = await getClientEmployeesRoute(req, { params: Promise.resolve({ id: client1.id }) });
      assertEqual(res.status, 200, 'GET must return HTTP 200');

      const employees = await res.json();
      assert(Array.isArray(employees), 'Response must be an array');
      assert(employees.length > 0, 'Should have active employees');

      for (const emp of employees) {
        assertEqual(emp.status, 'ACTIV', 'Every employee in ?status=ACTIV query must have status "ACTIV"');
      }
    });

  } finally {
    // --------------------------------------------------------------------------
    // TEARDOWN: Clean up test clients and cascading records
    // --------------------------------------------------------------------------
    console.log(`\n${COLORS.bright}▶ Cleaning up test database fixtures...${COLORS.reset}`);
    for (const cid of createdClientIds) {
      try {
        await prisma.generatedDocument.deleteMany({ where: { clientId: cid } });
        await prisma.client.delete({ where: { id: cid } });
        console.log(`  ${COLORS.dim}Cleaned up test Client ID: ${cid}${COLORS.reset}`);
      } catch (err: any) {
        console.error(`  ${COLORS.red}Failed to clean up client ${cid}:${COLORS.reset} ${err?.message}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalCount = results.length;

  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}  CHALLENGER 2: ADVERSARIAL STRESS TEST SUMMARY${COLORS.reset}`);
  console.log(`${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`  Total Test Cases Executed: ${totalCount}`);
  console.log(`  Passed Cases:              ${COLORS.green}${passedCount}${COLORS.reset}`);
  console.log(`  Failed Cases:              ${failedCount > 0 ? COLORS.red : COLORS.green}${failedCount}${COLORS.reset}`);

  if (failedCount > 0) {
    console.log(`\n${COLORS.bgRed}${COLORS.bright} FAILED TESTS DETECTED: ${COLORS.reset}`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - [${r.id}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${COLORS.bgGreen}${COLORS.bright} ALL ${totalCount}/${totalCount} ADVERSARIAL TESTS PASSED (100% STRESS RESILIENCE) ${COLORS.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running adversarial test runner:', err);
  process.exit(1);
});
