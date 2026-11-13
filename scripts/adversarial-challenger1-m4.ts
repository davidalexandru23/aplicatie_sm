/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1 (MILESTONE 4)
 * ============================================================================
 * 
 * Scope: EIP Management (HG 1048/2006) & Risk Assessments (Legea 319/2006)
 * Features: 19, 20, 21, 22, 23
 * 
 * Objectives:
 * 1. EIP Catalog API Stress & Boundaries (/api/eip/items):
 *    - Valid creation with complete statutory fields
 *    - Duplicate code handling (upsert resilience)
 *    - Missing required fields (code, name) -> HTTP 400
 *    - Non-positive replacementMonths (0, negative) -> HTTP 400
 *    - Category & protectionType search & case-insensitive matching
 * 
 * 2. Job EIP Requirements API (/api/eip/requirements):
 *    - Valid requirement assignment (jobId + eipItemId, dual param itemId)
 *    - Idempotency / duplicate upsert resilience
 *    - Nonexistent jobId -> HTTP 404
 *    - Nonexistent eipItemId -> HTTP 404
 *    - Missing required fields -> HTTP 400
 *    - Retrieval and deletion
 * 
 * 3. Employee EIP Assignments API (/api/eip/assignments):
 *    - Valid assignment with dates and signature tracking
 *    - Nonexistent employeeId -> HTTP 404
 *    - Nonexistent eipItemId -> HTTP 404
 *    - Missing required fields -> HTTP 400
 *    - Boundary dates (far future, far past, null signatureDate vs signed)
 *    - Idempotent upsert/re-assignment
 *    - Retrieval by employeeId and clientId
 * 
 * 4. Fisa Individuala EIP Placeholder Resolution & OpenXML Inspection (eip-fisa-acordare-individuala):
 *    - Scenario A: Direct employee assignments (real DB items, U.M. logic, signature, real sizes)
 *    - Scenario B: Fallback to job requirements (hireDate fallback, empty signature)
 *    - Scenario C: No requirements or assignments (no crash, empty strings, ZERO mock data)
 *    - Scenario D: Missing sizing fields (null clothing, shoe, glove sizes resolve to empty string)
 *    - Scenario E: End-to-end DOCX generation and OpenXML inspection for unreplaced tokens
 * 
 * 5. Statutory Risk Assessment & Job Flags (Features 21, 22, 23):
 *    - Risk assessment creation with nested items, measures, hazard zones
 *    - Boundary validation: severityScore (1-7) & probabilityScore (1-6) violations -> HTTP 400
 *    - Invalid clientId -> HTTP 400/404
 *    - PUT update & synchronization
 *    - Job risk flags persistence (7 statutory flags, posture, maxWeightKg negative check)
 *    - Evaluated CAEN risk profile endpoint
 *    - risk-evaluare template resolution: N_rg calculation, 30 factors, prevention measures, hazard zones
 * 
 * Teardown:
 *    - Strict cascading cleanup of all test clients, jobs, employees, and custom EIP items.
 * 
 * Invocation:
 *   npx tsx scripts/adversarial-challenger1-m4.ts
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { generateValidCnp } from './e2e-test-helpers';

// API Handlers
import { GET as getEipItems, POST as postEipItems } from '../src/app/api/eip/items/route';
import { GET as getEipRequirements, POST as postEipRequirements, DELETE as deleteEipRequirements } from '../src/app/api/eip/requirements/route';
import { GET as getEipAssignments, POST as postEipAssignments, DELETE as deleteEipAssignments } from '../src/app/api/eip/assignments/route';
import { GET as getRiskAssessments, POST as postRiskAssessments } from '../src/app/api/risk-assessments/route';
import { GET as getRiskAssessmentById, PUT as putRiskAssessmentById } from '../src/app/api/risk-assessments/[id]/route';
import { GET as getJobs, POST as postJobs } from '../src/app/api/clients/[id]/jobs/route';
import { GET as getJobById, PUT as putJobById } from '../src/app/api/clients/[id]/jobs/[jobId]/route';
import { GET as getJobRisks } from '../src/app/api/clients/[id]/jobs/[jobId]/risks/route';
import { POST as generateDocPost } from '../src/app/api/documents/generate/route';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';

// ANSI terminal colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface TestResult {
  suite: string;
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let currentSuite = '';

function suite(name: string) {
  currentSuite = name;
  console.log(`\n${C.bold}${C.blue}▶ ${name}${C.reset}`);
}

async function runTest(id: string, name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ suite: currentSuite, id, name, passed: true, durationMs: duration });
    console.log(`  ${C.green}✓ PASS${C.reset} [${id}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ suite: currentSuite, id, name, passed: false, error: err?.message || String(err), durationMs: duration });
    console.log(`  ${C.red}✗ FAIL${C.reset} [${id}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
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
    throw new Error(`Assertion failed: ${msg}\n  Expected: ${JSON.stringify(expected)}\n  Got:      ${JSON.stringify(actual)}`);
  }
}

// Track fixture entities for strict cleanup
const createdEipItemCodes: string[] = [];
const createdClientIds: string[] = [];
const createdAssessmentIds: string[] = [];

async function cleanupFixtures() {
  console.log(`\n${C.dim}Teardown: Cleaning up test fixtures...${C.reset}`);

  // Delete generated documents for test clients
  if (createdClientIds.length > 0) {
    try {
      await prisma.generatedDocument.deleteMany({
        where: { clientId: { in: createdClientIds } },
      });
    } catch {}
  }

  // Delete risk assessments created directly
  if (createdAssessmentIds.length > 0) {
    try {
      await prisma.hazardZone.deleteMany({ where: { assessmentId: { in: createdAssessmentIds } } });
      await prisma.preventionMeasure.deleteMany({ where: { assessmentId: { in: createdAssessmentIds } } });
      await prisma.riskItem.deleteMany({ where: { assessmentId: { in: createdAssessmentIds } } });
      await prisma.riskAssessment.deleteMany({ where: { id: { in: createdAssessmentIds } } });
    } catch {}
  }

  // Delete clients (cascades jobs, employees, assignments, requirements, assessments)
  if (createdClientIds.length > 0) {
    try {
      await prisma.client.deleteMany({
        where: { id: { in: createdClientIds } },
      });
    } catch {}
  }

  // Delete custom EIP test items
  if (createdEipItemCodes.length > 0) {
    try {
      await prisma.employeeEipAssignment.deleteMany({
        where: { eipItem: { code: { in: createdEipItemCodes } } },
      });
      await prisma.jobEipRequirement.deleteMany({
        where: { eipItem: { code: { in: createdEipItemCodes } } },
      });
      await prisma.eipItem.deleteMany({
        where: { code: { in: createdEipItemCodes } },
      });
    } catch {}
  }

  // Also clean any leftover items prefixed with EIP-CHALLENGE-
  try {
    await prisma.eipItem.deleteMany({
      where: { code: { startsWith: 'EIP-CHALLENGE-' } },
    });
  } catch {}
}

async function main() {
  console.log(`${C.bold}${C.magenta}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.magenta}  ADVERSARIAL CHALLENGER 1 — MILESTONE 4 EMPIRICAL STRESS TEST SUITE${C.reset}`);
  console.log(`${C.bold}${C.magenta}  EIP Management (HG 1048/2006) & Risk Assessments (Legea 319/2006)${C.reset}`);
  console.log(`${C.bold}${C.magenta}================================================================================${C.reset}\n`);

  try {
    // --------------------------------------------------------------------------
    // SUITE 1: EIP Catalog API Resilience & Boundaries (/api/eip/items)
    // --------------------------------------------------------------------------
    suite('SUITE 1: EIP Catalog API Resilience & Boundaries (/api/eip/items)');

    const testItemCode1 = 'EIP-CHALLENGE-BOOTS-01';
    const testItemCode2 = 'EIP-CHALLENGE-HELMET-01';
    createdEipItemCodes.push(testItemCode1, testItemCode2);

    await runTest('T1-01', 'POST /api/eip/items with complete valid payload returns 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testItemCode1,
          name: 'Bocanci de protecție S3 SRC Challenger',
          standardCode: 'EN ISO 20345:2011',
          protectionType: 'Mecanic, Antialunecare, Perforație',
          replacementMonths: 12,
        }),
      });
      const res = await postEipItems(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Status code must be 201');
      assert(json.success === true, 'Response must have success: true');
      assertEqual(json.item.code, testItemCode1, 'Created item code must match');
      assertEqual(json.item.replacementMonths, 12, 'Replacement months must match');
    });

    await runTest('T1-02', 'POST /api/eip/items duplicate code upserts cleanly without 500 or crash', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testItemCode1,
          name: 'Bocanci de protecție S3 SRC Challenger Updated',
          standardCode: 'EN ISO 20345:2022',
          protectionType: 'Mecanic, Antialunecare',
          replacementMonths: 18,
        }),
      });
      const res = await postEipItems(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Upsert status must be 201');
      assertEqual(json.item.name, 'Bocanci de protecție S3 SRC Challenger Updated', 'Name should be updated');
      assertEqual(json.item.replacementMonths, 18, 'Replacement months should be updated to 18');
    });

    await runTest('T1-03', 'POST /api/eip/items with missing code rejects with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Casca fara cod',
          standardCode: 'EN 397',
        }),
      });
      const res = await postEipItems(req);
      assertEqual(res.status, 400, 'Status must be 400 when code is missing');
      const json = await res.json();
      assert(typeof json.error === 'string' && json.error.length > 0, 'Must return error message');
    });

    await runTest('T1-04', 'POST /api/eip/items with missing name rejects with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'EIP-CHALLENGE-NONAME',
        }),
      });
      const res = await postEipItems(req);
      assertEqual(res.status, 400, 'Status must be 400 when name is missing');
    });

    await runTest('T1-05', 'POST /api/eip/items with negative or zero replacementMonths rejects with 400', async () => {
      const reqZero = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'EIP-CHALLENGE-ZERO',
          name: 'Item zero luni',
          replacementMonths: 0,
        }),
      });
      const resZero = await postEipItems(reqZero);
      assertEqual(resZero.status, 400, 'Status must be 400 when replacementMonths is 0');

      const reqNeg = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'EIP-CHALLENGE-NEG',
          name: 'Item luni negative',
          replacementMonths: -12,
        }),
      });
      const resNeg = await postEipItems(reqNeg);
      assertEqual(resNeg.status, 400, 'Status must be 400 when replacementMonths is negative');
    });

    await runTest('T1-06', 'GET /api/eip/items supports case-insensitive search and protectionType filter', async () => {
      // Create second item
      const reqCreate = new NextRequest('http://localhost:3000/api/eip/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testItemCode2,
          name: 'Cască de protecție dielectrică Challenger',
          standardCode: 'EN 397:2012',
          protectionType: 'Electrocutare, Mecanic',
          replacementMonths: 36,
        }),
      });
      await postEipItems(reqCreate);

      // Search by partial text 'challenger' (case-insensitive)
      const reqSearch = new NextRequest('http://localhost:3000/api/eip/items?search=challenger');
      const resSearch = await getEipItems(reqSearch);
      const jsonSearch = await resSearch.json();
      assertEqual(resSearch.status, 200, 'Search must return 200');
      assert(jsonSearch.items.length >= 2, 'Search should find both created items');

      // Search by protectionType
      const reqFilter = new NextRequest('http://localhost:3000/api/eip/items?protectionType=Electrocutare,%20Mecanic');
      const resFilter = await getEipItems(reqFilter);
      const jsonFilter = await resFilter.json();
      assertEqual(resFilter.status, 200, 'Filter must return 200');
      assert(jsonFilter.items.some((i: any) => i.code === testItemCode2), 'Filtered items must include testItemCode2');
    });

    // --------------------------------------------------------------------------
    // SUITE 2: Job EIP Requirements API (/api/eip/requirements)
    // --------------------------------------------------------------------------
    suite('SUITE 2: Job EIP Requirements API (/api/eip/requirements)');

    // Create an isolated test client and job
    const cuiTest = `RO${Math.floor(10000000 + Math.random() * 89999999)}`;
    const client = await prisma.client.create({
      data: {
        name: 'SC ADVERSARIAL CHALLENGER M4 SRL',
        cui: cuiTest,
        regCom: 'J40/9999/2026',
        address: 'București, Str. Adversarială nr. 4',
        legalRepresentative: 'Director General Test',
        caenCode: '4120',
      },
    });
    createdClientIds.push(client.id);

    const job = await prisma.job.create({
      data: {
        clientId: client.id,
        title: 'Muncitor Constructor Specialist',
        corCode: '711101',
      },
    });

    const bootsItem = await prisma.eipItem.findUnique({ where: { code: testItemCode1 } });
    const helmetItem = await prisma.eipItem.findUnique({ where: { code: testItemCode2 } });
    assert(bootsItem !== null && helmetItem !== null, 'Items must exist in DB');

    await runTest('T2-01', 'POST /api/eip/requirements creates job requirement with HTTP 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          eipItemId: bootsItem.id,
        }),
      });
      const res = await postEipRequirements(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Status must be 201');
      assert(json.success === true, 'Must succeed');
      assertEqual(json.requirement.jobId, job.id, 'jobId must match');
      assertEqual(json.requirement.eipItemId, bootsItem.id, 'eipItemId must match');
    });

    await runTest('T2-02', 'POST /api/eip/requirements supports alternate itemId field name', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          itemId: helmetItem.id,
        }),
      });
      const res = await postEipRequirements(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Status must be 201 with itemId');
      assertEqual(json.requirement.eipItemId, helmetItem.id, 'eipItemId must be set');
    });

    await runTest('T2-03', 'POST /api/eip/requirements is idempotent on duplicate allocation (upsert)', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          eipItemId: bootsItem.id,
        }),
      });
      const res = await postEipRequirements(req);
      assertEqual(res.status, 201, 'Idempotent call must return 201 without constraint error');
    });

    await runTest('T2-04', 'POST /api/eip/requirements with nonexistent jobId returns HTTP 404', async () => {
      const fakeJobId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest('http://localhost:3000/api/eip/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: fakeJobId,
          eipItemId: bootsItem.id,
        }),
      });
      const res = await postEipRequirements(req);
      assertEqual(res.status, 404, 'Status must be 404 for nonexistent job');
      const json = await res.json();
      assert(json.error.includes('Postul') || json.error.includes('nu există'), 'Error must identify missing job');
    });

    await runTest('T2-05', 'POST /api/eip/requirements with nonexistent eipItemId returns HTTP 404', async () => {
      const fakeItemId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest('http://localhost:3000/api/eip/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          eipItemId: fakeItemId,
        }),
      });
      const res = await postEipRequirements(req);
      assertEqual(res.status, 404, 'Status must be 404 for nonexistent EIP item');
      const json = await res.json();
      assert(json.error.includes('Articolul EIP') || json.error.includes('nu există'), 'Error must identify missing item');
    });

    await runTest('T2-06', 'POST /api/eip/requirements with missing payload fields returns HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
        }),
      });
      const res = await postEipRequirements(req);
      assertEqual(res.status, 400, 'Status must be 400 when eipItemId missing');
    });

    await runTest('T2-07', 'GET /api/eip/requirements?jobId returns requirements and items list', async () => {
      const req = new NextRequest(`http://localhost:3000/api/eip/requirements?jobId=${job.id}`);
      const res = await getEipRequirements(req);
      const json = await res.json();
      assertEqual(res.status, 200, 'GET must return 200');
      assert(Array.isArray(json.requirements), 'Must have requirements array');
      assert(Array.isArray(json.items), 'Must have items array for dual client compatibility');
      assertEqual(json.requirements.length, 2, 'Should have 2 requirements for job');
    });

    await runTest('T2-08', 'DELETE /api/eip/requirements deletes requirement cleanly', async () => {
      const req = new NextRequest(`http://localhost:3000/api/eip/requirements?jobId=${job.id}&eipItemId=${helmetItem.id}`, {
        method: 'DELETE',
      });
      const res = await deleteEipRequirements(req);
      assertEqual(res.status, 200, 'DELETE must return 200');

      // Verify deletion in DB
      const count = await prisma.jobEipRequirement.count({
        where: { jobId: job.id, eipItemId: helmetItem.id },
      });
      assertEqual(count, 0, 'Requirement must be deleted from DB');

      // Re-add helmet for subsequent tests
      await prisma.jobEipRequirement.create({
        data: { jobId: job.id, eipItemId: helmetItem.id },
      });
    });

    // --------------------------------------------------------------------------
    // SUITE 3: Employee EIP Assignments API (/api/eip/assignments)
    // --------------------------------------------------------------------------
    suite('SUITE 3: Employee EIP Assignments API (/api/eip/assignments)');

    const cnpEmp1 = generateValidCnp(`1880512${Math.floor(10000 + Math.random() * 89999)}`);
    const worksite = await prisma.worksite.create({
      data: {
        clientId: client.id,
        name: 'Șantier Sector 1',
        address: 'București, Str. Adversarială nr. 4',
      },
    });

    const employee1 = await prisma.employee.create({
      data: {
        clientId: client.id,
        currentJobId: job.id,
        currentWorksiteId: worksite.id,
        firstName: 'Vasile',
        lastName: 'Popa',
        cnp: cnpEmp1,
        hireDate: new Date('2026-02-01'),
        clothingSize: 'XXL',
        shoeSize: '45',
        gloveSize: '11',
        cimNumber: 'CIM-ADV-01',
        cimDate: new Date('2026-02-01'),
        grossSalary: 6000,
        workNorm: 8,
      },
    });

    await runTest('T3-01', 'POST /api/eip/assignments creates assignment with signature tracking HTTP 201', async () => {
      const assignedDate = new Date('2026-02-02');
      const signatureDate = new Date('2026-02-02T10:30:00Z');

      const req = new NextRequest('http://localhost:3000/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee1.id,
          eipItemId: bootsItem.id,
          assignedDate: assignedDate.toISOString(),
          signatureDate: signatureDate.toISOString(),
        }),
      });
      const res = await postEipAssignments(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Assignment must return 201');
      assert(json.success === true, 'Success must be true');
      assertEqual(json.assignment.employeeId, employee1.id, 'employeeId must match');
      assertEqual(json.assignment.eipItemId, bootsItem.id, 'eipItemId must match');
      assert(json.assignment.signatureDate !== null, 'signatureDate must be set');
    });

    await runTest('T3-02', 'POST /api/eip/assignments supports alternate itemId field name', async () => {
      const req = new NextRequest('http://localhost:3000/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee1.id,
          itemId: helmetItem.id,
          assignedDate: new Date('2026-02-03').toISOString(),
          signatureDate: null, // Pending signature
        }),
      });
      const res = await postEipAssignments(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Status must be 201');
      assertEqual(json.assignment.eipItemId, helmetItem.id, 'eipItemId must match');
      assertEqual(json.assignment.signatureDate, null, 'signatureDate should be null');
    });

    await runTest('T3-03', 'POST /api/eip/assignments nonexistent employeeId returns HTTP 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest('http://localhost:3000/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: fakeId,
          eipItemId: bootsItem.id,
        }),
      });
      const res = await postEipAssignments(req);
      assertEqual(res.status, 404, 'Must return 404 for nonexistent employee');
      const json = await res.json();
      assert(json.error.includes('Salariatul') || json.error.includes('nu există'), 'Must state employee not found');
    });

    await runTest('T3-04', 'POST /api/eip/assignments nonexistent eipItemId returns HTTP 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const req = new NextRequest('http://localhost:3000/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee1.id,
          eipItemId: fakeId,
        }),
      });
      const res = await postEipAssignments(req);
      assertEqual(res.status, 404, 'Must return 404 for nonexistent item');
    });

    await runTest('T3-05', 'POST /api/eip/assignments boundary dates (future/past/null signature) handle cleanly', async () => {
      // Future date +5 years
      const futureDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);
      const reqFuture = new NextRequest('http://localhost:3000/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee1.id,
          eipItemId: helmetItem.id,
          assignedDate: futureDate.toISOString(),
          signatureDate: new Date().toISOString(),
        }),
      });
      const resFuture = await postEipAssignments(reqFuture);
      assertEqual(resFuture.status, 201, 'Future assignedDate should update cleanly');

      // Past date (year 2000)
      const pastDate = new Date('2000-01-01');
      const reqPast = new NextRequest('http://localhost:3000/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee1.id,
          eipItemId: bootsItem.id,
          assignedDate: pastDate.toISOString(),
          signatureDate: pastDate.toISOString(),
        }),
      });
      const resPast = await postEipAssignments(reqPast);
      assertEqual(resPast.status, 201, 'Past assignedDate should update cleanly');
    });

    await runTest('T3-06', 'GET /api/eip/assignments by employeeId and clientId returns relations', async () => {
      const reqByEmp = new NextRequest(`http://localhost:3000/api/eip/assignments?employeeId=${employee1.id}`);
      const resByEmp = await getEipAssignments(reqByEmp);
      const jsonByEmp = await resByEmp.json();
      assertEqual(resByEmp.status, 200, 'GET by employeeId must return 200');
      assertEqual(jsonByEmp.assignments.length, 2, 'Must have 2 assignments');
      assert(jsonByEmp.assignments[0].eipItem !== undefined, 'Must include eipItem relation');
      assert(jsonByEmp.assignments[0].employee !== undefined, 'Must include employee relation with sizes');

      const reqByClient = new NextRequest(`http://localhost:3000/api/eip/assignments?clientId=${client.id}`);
      const resByClient = await getEipAssignments(reqByClient);
      const jsonByClient = await resByClient.json();
      assertEqual(resByClient.status, 200, 'GET by clientId must return 200');
      assert(jsonByClient.assignments.length >= 2, 'Must return client assignments');
    });

    await runTest('T3-07', 'DELETE /api/eip/assignments deletes assignment cleanly', async () => {
      const req = new NextRequest(`http://localhost:3000/api/eip/assignments?employeeId=${employee1.id}&eipItemId=${helmetItem.id}`, {
        method: 'DELETE',
      });
      const res = await deleteEipAssignments(req);
      assertEqual(res.status, 200, 'DELETE must return 200');

      const count = await prisma.employeeEipAssignment.count({
        where: { employeeId: employee1.id, eipItemId: helmetItem.id },
      });
      assertEqual(count, 0, 'Assignment must be deleted from DB');

      // Re-create assignment with signature for Scenario A testing
      await prisma.employeeEipAssignment.create({
        data: {
          employeeId: employee1.id,
          eipItemId: helmetItem.id,
          assignedDate: new Date('2026-02-05'),
          signatureDate: new Date('2026-02-05'),
        },
      });
    });

    // --------------------------------------------------------------------------
    // SUITE 4: Placeholder Resolution & DOCX OpenXML Fidelity
    // --------------------------------------------------------------------------
    suite('SUITE 4: Placeholder Resolution & DOCX OpenXML Fidelity (eip-fisa-acordare-individuala)');

    // Employee 1: DIRECT ASSIGNMENTS (Scenario A)
    await runTest('T4-01', 'Scenario A (Direct Assignments): Resolves DB equipment, U.M., and employee sizing', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: client.id,
        employeeId: employee1.id,
        jobId: job.id,
      });

      // Check sizing tokens
      assertEqual(resolvedData.PLACEHOLDER_MARIME_HAINE, 'XXL', 'Clothing size must match employee DB value');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_IMBRACAMINTE, 'XXL', 'Clothing size alt must match');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_INCALTAMINTE, '45', 'Shoe size must match employee DB value');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_MANUSI, '11', 'Glove size must match employee DB value');

      // Check assigned EIP rows
      const name01 = resolvedData.PLACEHOLDER_EIP_DENUMIRE_01 as string;
      const name02 = resolvedData.PLACEHOLDER_EIP_DENUMIRE_02 as string;
      assert(name01.length > 0, 'Row 01 must have item name');
      assert(name02.length > 0, 'Row 02 must have item name');

      // Check UM logic: boots should be 'per.', helmet should be 'buc.'
      const itemNames = [name01, name02];
      const bootsRowIdx = itemNames.findIndex((n) => /bocanci|pantofi/i.test(n)) + 1;
      const helmetRowIdx = itemNames.findIndex((n) => /casc/i.test(n)) + 1;

      assert(bootsRowIdx > 0, 'Boots item must be in assigned rows');
      assert(helmetRowIdx > 0, 'Helmet item must be in assigned rows');

      const padBoots = String(bootsRowIdx).padStart(2, '0');
      const padHelmet = String(helmetRowIdx).padStart(2, '0');

      assertEqual(resolvedData[`PLACEHOLDER_EIP_UM_${padBoots}`], 'per.', 'Boots UM must be per.');
      assertEqual(resolvedData[`PLACEHOLDER_EIP_UM_${padHelmet}`], 'buc.', 'Helmet UM must be buc.');

      // Check signature tracking: both were signed
      assertEqual(resolvedData[`PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_${padBoots}`], 'Semnat', 'Signed item must show Semnat');
      assertEqual(resolvedData[`PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_${padHelmet}`], 'Semnat', 'Signed item must show Semnat');

      // Unassigned rows 03-10 must be empty
      for (let i = 3; i <= 10; i++) {
        const pad = String(i).padStart(2, '0');
        assertEqual(resolvedData[`PLACEHOLDER_EIP_DENUMIRE_${pad}`], '', `Row ${pad} must be empty`);
      }

      // Check loop collections
      const dotareList = resolvedData.dotare_eip as any[];
      assert(Array.isArray(dotareList), 'dotare_eip must be an array');
      assertEqual(dotareList.length, 2, 'dotare_eip must have exactly 2 items');
    });

    // Employee 2: ONLY JOB REQUIREMENTS (Scenario B Fallback)
    const cnpEmp2 = generateValidCnp(`1900320${Math.floor(10000 + Math.random() * 89999)}`);
    const employee2 = await prisma.employee.create({
      data: {
        clientId: client.id,
        currentJobId: job.id, // Job has boots and helmet requirements
        currentWorksiteId: worksite.id,
        firstName: 'Ion',
        lastName: 'Dumitrescu',
        cnp: cnpEmp2,
        hireDate: new Date('2026-03-01'),
        clothingSize: 'L',
        shoeSize: '42',
        gloveSize: '9',
        cimNumber: 'CIM-ADV-02',
        cimDate: new Date('2026-03-01'),
        grossSalary: 5500,
        workNorm: 8,
      },
    });

    await runTest('T4-02', 'Scenario B (Job Requirements Fallback): Populates job requirements with hireDate', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: client.id,
        employeeId: employee2.id,
        jobId: job.id,
      });

      // Employee 2 has NO assignments -> fallback to job requirements
      const name01 = resolvedData.PLACEHOLDER_EIP_DENUMIRE_01 as string;
      const name02 = resolvedData.PLACEHOLDER_EIP_DENUMIRE_02 as string;
      assert(name01.length > 0, 'Fallback Row 01 must have item name');
      assert(name02.length > 0, 'Fallback Row 02 must have item name');

      // Date should fall back to employee hireDate (01.03.2026)
      assertEqual(resolvedData.PLACEHOLDER_EIP_DATA_ACORDARII_01, '01.03.2026', 'Data acordarii must fall back to hireDate');
      // Signature should be empty because equipment was not physically signed for yet
      assertEqual(resolvedData.PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_01, '', 'Fallback signature must be empty');

      // Check sizing
      assertEqual(resolvedData.PLACEHOLDER_MARIME_HAINE, 'L', 'Clothing size must match employee DB value');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_INCALTAMINTE, '42', 'Shoe size must match employee DB value');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_MANUSI, '9', 'Glove size must match employee DB value');

      // dotare_eip should contain both job requirement items
      const dotareList = resolvedData.dotare_eip as any[];
      assertEqual(dotareList.length, 2, 'Fallback dotare_eip must have 2 items');
    });

    // Employee 3: NO REQUIREMENTS & NO ASSIGNMENTS (Scenario C)
    const jobEmpty = await prisma.job.create({
      data: {
        clientId: client.id,
        title: 'Consultant Juridic Fara EIP',
        corCode: '261101',
      },
    });

    const cnpEmp3 = generateValidCnp(`2920615${Math.floor(10000 + Math.random() * 89999)}`);
    const employee3 = await prisma.employee.create({
      data: {
        clientId: client.id,
        currentJobId: jobEmpty.id, // Has ZERO requirements
        currentWorksiteId: worksite.id,
        firstName: 'Elena',
        lastName: 'Marin',
        cnp: cnpEmp3,
        hireDate: new Date('2026-03-10'),
        clothingSize: 'M',
        shoeSize: '38',
        gloveSize: '7',
        cimNumber: 'CIM-ADV-03',
        cimDate: new Date('2026-03-10'),
        grossSalary: 7000,
        workNorm: 8,
      },
    });

    await runTest('T4-03', 'Scenario C (No Requirements or Assignments): No crash, empty strings, ZERO mock data', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: client.id,
        employeeId: employee3.id,
        jobId: jobEmpty.id,
      });

      // Must NOT contain fake fallback items (e.g. "Casca protectie", "Bocanci")
      for (let i = 1; i <= 10; i++) {
        const pad = String(i).padStart(2, '0');
        assertEqual(resolvedData[`PLACEHOLDER_EIP_DENUMIRE_${pad}`], '', `Row ${pad} must be strictly empty string`);
        assertEqual(resolvedData[`PLACEHOLDER_EIP_STANDARD_${pad}`], '', `Standard ${pad} must be empty string`);
        assertEqual(resolvedData[`PLACEHOLDER_EIP_CANTITATE_${pad}`], '', `Cantitate ${pad} must be empty string`);
      }

      // dotare_eip array must be empty
      const dotareList = resolvedData.dotare_eip as any[];
      assertEqual(dotareList.length, 0, 'dotare_eip must be empty array');
      const echipamente = resolvedData.echipamente as any[];
      assertEqual(echipamente.length, 0, 'echipamente must be empty array');
    });

    // Employee 4: MISSING SIZING FIELDS (Scenario D)
    const cnpEmp4 = generateValidCnp(`1950810${Math.floor(10000 + Math.random() * 89999)}`);
    const employee4 = await prisma.employee.create({
      data: {
        clientId: client.id,
        currentJobId: jobEmpty.id,
        currentWorksiteId: worksite.id,
        firstName: 'Mihai',
        lastName: 'Stanescu',
        cnp: cnpEmp4,
        hireDate: new Date('2026-03-15'),
        clothingSize: null, // MISSING
        shoeSize: null,     // MISSING
        gloveSize: null,    // MISSING
        cimNumber: 'CIM-ADV-04',
        cimDate: new Date('2026-03-15'),
        grossSalary: 6200,
        workNorm: 8,
      },
    });

    await runTest('T4-04', 'Scenario D (Missing Sizing Fields): Resolves cleanly to empty strings without mock values', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: client.id,
        employeeId: employee4.id,
        jobId: jobEmpty.id,
      });

      assertEqual(resolvedData.PLACEHOLDER_MARIME_HAINE, '', 'Missing clothing size must resolve to empty string');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_IMBRACAMINTE, '', 'Missing clothing alt size must resolve to empty string');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_INCALTAMINTE, '', 'Missing shoe size must resolve to empty string');
      assertEqual(resolvedData.PLACEHOLDER_MARIME_MANUSI, '', 'Missing glove size must resolve to empty string');
    });

    // DOCX Generation & OpenXML Inspection (Scenario E)
    await runTest('T4-05', 'Scenario E (DOCX OpenXML Inspection): Generated document contains genuine values & no unreplaced tokens', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'eip-fisa-acordare-individuala',
          clientId: client.id,
          employeeId: employee1.id,
          jobId: job.id,
        }),
      });

      const res = await generateDocPost(req);
      const json = await res.json();
      assertEqual(res.status, 200, 'POST /api/documents/generate must return 200');
      assert(json.success === true, 'Success must be true');
      const filePath = json.result?.filePath || json.filePath;
      assert(filePath && fs.existsSync(filePath), 'Generated file must exist on disk');

      // Read DOCX and inspect OpenXML
      const buffer = fs.readFileSync(filePath);
      const zip = new PizZip(buffer);
      const docXml = zip.file('word/document.xml')?.asText() || '';

      assert(docXml.length > 0, 'word/document.xml must not be empty');

      // Must contain real employee and company data
      assert(docXml.includes('Vasile Popa') || (docXml.includes('Popa') && docXml.includes('Vasile')), 'Must contain employee name');
      assert(docXml.includes(client.name), 'Must contain client name');
      assert(docXml.includes(client.cui), 'Must contain client CUI');

      // Must contain sizing in XML
      assert(docXml.includes('XXL'), 'Must contain clothing size XXL in XML');
      assert(docXml.includes('45'), 'Must contain shoe size 45 in XML');
      assert(docXml.includes('11'), 'Must contain glove size 11 in XML');

      // Check for raw unreplaced placeholders
      const rawPlaceholderMatch = docXml.match(/\{PLACEHOLDER_[A-Z0-9_]+\}/g);
      if (rawPlaceholderMatch && rawPlaceholderMatch.length > 0) {
        throw new Error(`Found unreplaced raw placeholder tokens in XML: ${rawPlaceholderMatch.join(', ')}`);
      }
    });

    // --------------------------------------------------------------------------
    // SUITE 5: Statutory Risk Assessments & Job Flags (Features 21, 22, 23)
    // --------------------------------------------------------------------------
    suite('SUITE 5: Statutory Risk Assessments & Job Flags (Features 21, 22, 23)');

    let createdAssessmentId = '';

    await runTest('T5-01', 'POST /api/risk-assessments creates dossier with nested items, measures, and zones HTTP 201', async () => {
      const req = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          jobId: job.id,
          worksiteId: worksite.id,
          title: 'Dosar Evaluare Riscuri Constructor Test',
          method: 'INCDPM',
          evaluatorName: 'Ing. Evaluator SSM Adversarial',
          conclusions: 'Locul de muncă se încadrează în nivelul de risc global acceptabil.',
          items: [
            {
              hazard: 'Cădere de la înălțime prin pășire în gol de pe schelă',
              riskSituation: 'EXECUTANT',
              consequence: 'Deces',
              severityScore: 7,
              probabilityScore: 2, // r = 4 (PECE table)
              existingMeasures: 'Schele conforme, centuri de siguranță',
            },
            {
              hazard: 'Lovire de către corpuri în mișcare (macara/stivuitor)',
              riskSituation: 'MIJLOACE_PRODUCTIE',
              consequence: 'ITM 45-180 zile',
              severityScore: 4,
              probabilityScore: 3, // r = 3
              existingMeasures: 'Delimitare căi de circulație',
            },
            {
              hazard: 'Zgomot intens produs de utilaje de compactare',
              riskSituation: 'MEDIUL_MUNCA',
              consequence: 'Hipoacuzie profesională',
              severityScore: 3,
              probabilityScore: 4, // r = 3
              existingMeasures: 'Antifoane externe',
            },
          ],
          measures: [
            {
              itemIndex: 0,
              description: 'Verificarea zilnică a balustradelor schelei și ancorarea corespunzătoare',
              measureType: 'TEHNICA',
              responsiblePerson: 'Șef șantier',
              deadline: 'Permanent',
            },
            {
              itemIndex: 1,
              description: 'Instruirea semnalizatorilor de legare a sarcinilor',
              measureType: 'ORGANIZATORICA',
              responsiblePerson: 'Specialist SSM',
              deadline: 'Lunar',
            },
          ],
          hazardZones: [
            {
              zoneName: 'Zona Schelă Fațadă Nord',
              location: 'Fațada principală nivel 3-8',
              hazardDescription: 'Risc iminent de cădere de la cote peste 10m',
              safetyMeasures: 'Sisteme de oprire a căderii, plasă de protecție',
            },
          ],
        }),
      });

      const res = await postRiskAssessments(req);
      const json = await res.json();
      assertEqual(res.status, 201, 'Status must be 201');
      assert(json.success === true, 'Success must be true');
      assert(typeof json.assessment.id === 'string', 'Must return assessment id');
      createdAssessmentId = json.assessment.id;
      createdAssessmentIds.push(createdAssessmentId);

      // Verify nested creations
      assertEqual(json.assessment.riskItems.length, 3, 'Must have 3 riskItems');
      assertEqual(json.assessment.preventionMeasures.length, 2, 'Must have 2 preventionMeasures');
      assertEqual(json.assessment.hazardZones.length, 1, 'Must have 1 hazardZone');
      assertEqual(json.assessment.riskItems[0].severityScore, 7, 'First item severity must be 7');
      assertEqual(json.assessment.riskItems[0].probabilityScore, 2, 'First item probability must be 2');
    });

    await runTest('T5-02', 'POST /api/risk-assessments boundary checks on severity (1-7) reject violations with 400', async () => {
      // Severity 0
      const reqLow = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: 'Test Severity 0',
          items: [{ hazard: 'Hazard test', severityScore: 0, probabilityScore: 3 }],
        }),
      });
      const resLow = await postRiskAssessments(reqLow);
      assertEqual(resLow.status, 400, 'Severity 0 must reject with 400');

      // Severity 8
      const reqHigh = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: 'Test Severity 8',
          items: [{ hazard: 'Hazard test', severityScore: 8, probabilityScore: 3 }],
        }),
      });
      const resHigh = await postRiskAssessments(reqHigh);
      assertEqual(resHigh.status, 400, 'Severity 8 must reject with 400');
    });

    await runTest('T5-03', 'POST /api/risk-assessments boundary checks on probability (1-6) reject violations with 400', async () => {
      // Probability 0
      const reqLow = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: 'Test Prob 0',
          items: [{ hazard: 'Hazard test', severityScore: 4, probabilityScore: 0 }],
        }),
      });
      const resLow = await postRiskAssessments(reqLow);
      assertEqual(resLow.status, 400, 'Probability 0 must reject with 400');

      // Probability 7
      const reqHigh = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          title: 'Test Prob 7',
          items: [{ hazard: 'Hazard test', severityScore: 4, probabilityScore: 7 }],
        }),
      });
      const resHigh = await postRiskAssessments(reqHigh);
      assertEqual(resHigh.status, 400, 'Probability 7 must reject with 400');
    });

    await runTest('T5-04', 'POST /api/risk-assessments with missing or nonexistent clientId rejects appropriately', async () => {
      // Missing clientId
      const reqMissing = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Fara client' }),
      });
      const resMissing = await postRiskAssessments(reqMissing);
      assertEqual(resMissing.status, 400, 'Missing clientId must return 400');

      // Nonexistent clientId
      const reqFake = new NextRequest('http://localhost:3000/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: '00000000-0000-0000-0000-000000000000', title: 'Fake client' }),
      });
      const resFake = await postRiskAssessments(reqFake);
      assertEqual(resFake.status, 404, 'Nonexistent clientId must return 404');
    });

    await runTest('T5-05', 'PUT /api/risk-assessments/[id] synchronizes items and validates boundary', async () => {
      // Boundary violation on PUT
      const reqBad = new NextRequest(`http://localhost:3000/api/risk-assessments/${createdAssessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ hazard: 'Factor invalid', severityScore: 9, probabilityScore: 2 }],
        }),
      });
      const resBad = await putRiskAssessmentById(reqBad, { params: Promise.resolve({ id: createdAssessmentId }) });
      assertEqual(resBad.status, 400, 'Boundary violation on PUT must return 400');

      // Valid PUT update
      const reqGood = new NextRequest(`http://localhost:3000/api/risk-assessments/${createdAssessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Dosar Evaluare Riscuri Constructor Modificat',
          status: 'active',
        }),
      });
      const resGood = await putRiskAssessmentById(reqGood, { params: Promise.resolve({ id: createdAssessmentId }) });
      assertEqual(resGood.status, 200, 'Valid PUT must return 200');
      const jsonGood = await resGood.json();
      assertEqual(jsonGood.assessment.title, 'Dosar Evaluare Riscuri Constructor Modificat', 'Title must be updated');
      assertEqual(jsonGood.assessment.status, 'active', 'Status must be updated');
    });

    await runTest('T5-06', 'Job Statutory Risk Flags API: 7 flags, posture, maxWeightKg validation and persistence', async () => {
      // Test POST job with all 7 risk flags
      const reqCreateJob = new NextRequest(`http://localhost:3000/api/clients/${client.id}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Muncitor Asfaltare și Utilaje Grele',
          corCode: '834201',
          chemicalExposed: true,
          vibrationExposed: true,
          heightWork: true,
          noiseExposed: true,
          isFoodHandling: false,
          isScreenWork: false,
          isDrivingRequired: true,
          workPosture: 'Ortostatic cu deplasări frecvente',
          maxWeightKg: 25,
        }),
      });

      const resCreateJob = await postJobs(reqCreateJob, { params: Promise.resolve({ id: client.id }) });
      const jsonCreateJob = await resCreateJob.json();
      assertEqual(resCreateJob.status, 201, 'Job creation must return 201');
      assert(jsonCreateJob.job.chemicalExposed === true, 'chemicalExposed must be true');
      assert(jsonCreateJob.job.vibrationExposed === true, 'vibrationExposed must be true');
      assert(jsonCreateJob.job.heightWork === true, 'heightWork must be true');
      assert(jsonCreateJob.job.noiseExposed === true, 'noiseExposed must be true');
      assert(jsonCreateJob.job.isDrivingRequired === true, 'isDrivingRequired must be true');
      assertEqual(jsonCreateJob.job.maxWeightKg, 25, 'maxWeightKg must be 25');

      const asphaltJobId = jsonCreateJob.job.id;

      // Negative maxWeightKg validation
      const reqNegWeight = new NextRequest(`http://localhost:3000/api/clients/${client.id}/jobs/${asphaltJobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxWeightKg: -10,
        }),
      });
      const resNegWeight = await putJobById(reqNegWeight, { params: Promise.resolve({ id: client.id, jobId: asphaltJobId }) });
      assertEqual(resNegWeight.status, 400, 'Negative weight must return 400');

      // Test GET /risks endpoint
      const reqRisks = new NextRequest(`http://localhost:3000/api/clients/${client.id}/jobs/${asphaltJobId}/risks`);
      const resRisks = await getJobRisks(reqRisks, { params: Promise.resolve({ id: client.id, jobId: asphaltJobId }) });
      const jsonRisks = await resRisks.json();
      assertEqual(resRisks.status, 200, 'GET /risks must return 200');
      assert(jsonRisks.success === true, 'Must have success: true');
    });

    await runTest('T5-07', 'Template Resolver for risk-evaluare: Binds to persisted assessment, calculates N_rg, maps planPrevenire', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: client.id,
        jobId: job.id,
        assessmentId: createdAssessmentId,
      });

      // Verify that N_rg is calculated from items:
      // Item 1: r=4, Item 2: r=3, Item 3: r=3
      // sum(r^2) = 16 + 9 + 9 = 34
      // sum(r) = 4 + 3 + 3 = 10
      // N_rg = 34 / 10 = 3.4
      assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, '3.40', 'N_rg must match mathematical formula sum(R_i^2)/sum(R_i)');
      assertEqual(resolvedData.PLACEHOLDER_NIVEL_RISC_GLOBAL, '3.40', 'N_rg alias must match');

      // Verify dynamic 30 factors positional tokens
      assertEqual(resolvedData.PLACEHOLDER_GRAVITATE_RISC_01, '7', 'Severity 01 must be 7');
      assertEqual(resolvedData.PLACEHOLDER_FRECVENTA_RISC_01, '2', 'Probability 01 must be 2');
      assertEqual(resolvedData.PLACEHOLDER_NIVEL_PARTIAL_RISC_01, '4', 'Partial risk 01 must be 4');

      assertEqual(resolvedData.PLACEHOLDER_GRAVITATE_RISC_02, '4', 'Severity 02 must be 4');
      assertEqual(resolvedData.PLACEHOLDER_FRECVENTA_RISC_02, '3', 'Probability 02 must be 3');
      assertEqual(resolvedData.PLACEHOLDER_NIVEL_PARTIAL_RISC_02, '3', 'Partial risk 02 must be 3');

      // Verify planPrevenire array mapped to real measures and responsibles
      const planPrevenire = resolvedData.planPrevenire as any[];
      assert(Array.isArray(planPrevenire), 'planPrevenire must be an array');
      assertEqual(planPrevenire.length, 3, 'Must contain 3 prevention plan rows');
      assert(planPrevenire[0].factorRisc.includes('Cădere de la înălțime'), 'First row factorRisc must match item 0 hazard');
      assert(planPrevenire[0].masuriTehnice.includes('Verificarea zilnică a balustradelor'), 'Technical measure must match');
      assertEqual(planPrevenire[0].responsabil, 'Șef șantier', 'Responsible person must match');
      assertEqual(planPrevenire[0].termen, 'Permanent', 'Deadline must match');

      // Verify hazard zones
      assertEqual(resolvedData.PLACEHOLDER_DENUMIRE_ZONA_01, 'Zona Schelă Fațadă Nord', 'Hazard zone 01 must match');
    });

  } finally {
    // --------------------------------------------------------------------------
    // TEARDOWN: Strictly clean up all test records
    // --------------------------------------------------------------------------
    await cleanupFixtures();
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log(`\n${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}                     ADVERSARIAL VERIFICATION SUMMARY REPORT                   ${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}`);

  const passedTests = results.filter((r) => r.passed);
  const failedTests = results.filter((r) => !r.passed);

  console.log(`Total Adversarial Probes Run : ${results.length}`);
  console.log(`Passed Probes                : ${C.green}${passedTests.length}${C.reset}`);
  console.log(`Failed Probes                : ${failedTests.length > 0 ? C.red : C.green}${failedTests.length}${C.reset}`);

  if (failedTests.length > 0) {
    console.log(`\n${C.bold}${C.red}Failed Tests Details:${C.reset}`);
    for (const f of failedTests) {
      console.log(`  - [${f.id}] ${f.suite} -> ${f.name}`);
      console.log(`    ${C.red}${f.error}${C.reset}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${C.bold}${C.green}✓ ALL ${results.length} ADVERSARIAL STRESS PROBES PASSED CLEANLY (100% PASS RATE)${C.reset}`);
    console.log(`${C.bold}${C.green}  Milestone 4 (EIP & Risk Assessments) is demonstrably resilient & authentic.${C.reset}\n`);
    process.exit(0);
  }
}

main().catch(async (e) => {
  console.error('Fatal crash in test runner:', e);
  try {
    await cleanupFixtures();
  } catch {}
  process.exit(1);
});
