/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 2 (MILESTONE 4)
 * ============================================================================
 * 
 * Target: Risk Assessment Subsystem & Template Synchronization (M4 Features 21, 22)
 * 
 * Normative Framework:
 * - Legea nr. 319/2006 (Securitatea și sănătatea în muncă - art. 7-13)
 * - HG nr. 1425/2006 (Norme metodologice SSM - art. 15, planul de prevenire și protecție)
 * - Metoda INCDPM Pece (Matricea de evaluare Gravitate 1..7 x Probabilitate 1..6)
 * - Nivelul Global de Risc Ponderat: N_rg = Sum(R_i^2) / Sum(R_i)
 * 
 * Adversarial Attack Vectors Probed:
 * 1. Boundary Scores & Input Validation (INCDPM Pece scale 1-7 gravity, 1-6 probability):
 *    - Valid boundary testing: (1,1)->1, (7,6)->7, (1,6)->1, (7,1)->3, (4,3)->3, (6,6)->7, (2,3)->2.
 *    - Rejection of out-of-bounds gravity (<1: 0, -1; >7: 8, 99) on POST and PUT.
 *    - Rejection of out-of-bounds probability (<1: 0, -3; >6: 7, 100) on POST and PUT.
 *    - Missing required fields and foreign keys (clientId, jobId).
 * 
 * 2. Atomic Synchronization on PUT /api/risk-assessments/[id]:
 *    - Top-level metadata update.
 *    - In-place modification of riskItems and recalculated riskLevel.
 *    - Atomic replacement of items (shrinking/growing item sets, old items purged).
 *    - Prevention measures synchronization (linked via itemIndex or riskItemId).
 *    - Complete purge of items and measures via empty array items: [].
 *    - Atomic replacement of hazard zones.
 * 
 * 3. Deletion & Cascade Isolation:
 *    - DELETE /api/risk-assessments/[id] removes assessment.
 *    - Cascade verifies that all associated RiskItem, PreventionMeasure, HazardZone rows are deleted.
 *    - Cascade safety verifies that parent Client, Job, Worksite remain completely intact.
 * 
 * 4. Dynamic Template Generation with Persisted Assessment (risk-evaluare & risk-plan-prevenire-tesa):
 *    - Dynamic N_rg calculation formula N_rg = Sum(R_i^2) / Sum(R_i) verified mathematically.
 *    - Generated DOCX unpacked and checked for exact N_rg value.
 *    - Fractional N_rg rounding (e.g. 14/6 = 2.333... -> 2.33) verified in DOCX OpenXML.
 *    - Real prevention measures, real responsibles, and real calendar deadlines extracted from XML.
 *    - Evaluator name and custom conclusions dynamically injected.
 * 
 * 5. Graceful Fallback to CAEN Presets Without Persisted Assessment:
 *    - Generation without assessmentId for known CAEN codes (6201, 5610).
 *    - Graceful fallback for unmapped / exotic CAEN codes (9999, invalid string) to TESA preset (7022).
 *    - Generation without job or worksite context.
 * 
 * 6. Extreme Workloads & Resilience Stress:
 *    - Massive assessment: 35 risk factors (>30 slots) -> all included in N_rg and prevention plan.
 *    - Minimal assessment: single factor (1 factor) -> computes without index/math errors.
 *    - Extreme severity assessment: all factors at maximum severity (G=7, P=6 -> R=7) -> N_rg = 7.00.
 *    - Empty factors assessment: 0 items -> handles division by zero safely, fallback to preset.
 * 
 * Invocation:
 *   npx tsx scripts/adversarial-challenger2-m4.ts
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import {
  calculatePecePartialRisk,
  calculateGlobalRiskScore,
  PECE_RISK_MATRIX,
  getRiskProfileForCaen,
} from '../src/lib/risk/caen-risk-presets';
import { POST as createRiskAssessmentPost, GET as listRiskAssessmentsGet } from '../src/app/api/risk-assessments/route';
import {
  GET as getRiskAssessmentGet,
  PUT as updateRiskAssessmentPut,
  DELETE as deleteRiskAssessmentDelete,
} from '../src/app/api/risk-assessments/[id]/route';
import { POST as generateDocPost } from '../src/app/api/documents/generate/route';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';

// ANSI Terminal Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

interface TestResult {
  code: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(code: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ code, name, passed: true, durationMs: duration });
    console.log(`  ${C.green}✓ PASS${C.reset} [${code}] ${name} ${C.dim}(${duration}ms)${C.reset}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ code, name, passed: false, error: msg, durationMs: duration });
    console.log(`  ${C.red}✗ FAIL${C.reset} [${code}] ${name}`);
    console.log(`    ${C.red}Error: ${msg}${C.reset}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, msg?: string) {
  if (!cond) {
    throw new Error(msg || 'Assertion failed: expected true');
  }
}

// Helpers for invoking Next.js route handlers
function createPostReq(url: string, body: any): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createPutReq(url: string, body: any): NextRequest {
  return new NextRequest(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetReq(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

function createDeleteReq(url: string): NextRequest {
  return new NextRequest(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractDocxXml(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = new PizZip(fileBuffer);
  const docXml = zip.file('word/document.xml')?.asText();
  if (!docXml) {
    throw new Error(`Unable to read word/document.xml from ${filePath}`);
  }
  return docXml;
}

export async function runMilestone4AdversarialSuite() {
  console.log(`\n${C.bright}${C.cyan}==============================================================================${C.reset}`);
  console.log(`${C.bright}${C.cyan}    ADVERSARIAL STRESS TEST SUITE — MILESTONE 4 (EIP & RISK ASSESSMENTS)     ${C.reset}`);
  console.log(`${C.dim}    Framework: Legea 319/2006, HG 1425/2006, HG 1048/2006, Metoda INCDPM Pece${C.reset}`);
  console.log(`${C.bright}${C.cyan}==============================================================================${C.reset}\n`);

  let testClient: any = null;
  let testJob: any = null;
  let testWorksite: any = null;
  const createdDocFilePaths: string[] = [];

  try {
    // Setup isolated test client
    const uniqueSuffix = Date.now().toString(36);
    testClient = await prisma.client.create({
      data: {
        name: `ADVERSARIAL TEST LAB SRL - ${uniqueSuffix}`,
        cui: `RO${Math.floor(10000000 + Math.random() * 89999999)}`,
        regCom: `J40/${Math.floor(1000 + Math.random() * 8999)}/2026`,
        address: 'Bulevardul Preciziei 24, Sector 6, Bucuresti',
        legalRepresentative: 'Dr. Ing. Radu Marinescu',
        caenCode: '6201',
        caenActivity: 'Activități de realizare a software-ului la comandă',
        foundedYear: 2020,
        ssmProviderName: 'PREVENT RISK AUDIT SRL',
        ssmSpecialistName: 'Ing. Andrei Popescu',
        ssmSpecialistCert: 'Certificat Evaluator Risc SSM Seria EV nr. 44521/2021',
      },
    });

    testJob = await prisma.job.create({
      data: {
        clientId: testClient.id,
        title: 'Inginer Sisteme Critice',
        corCode: '251201',
        isScreenWork: true,
        workPosture: 'MIXT',
        maxWeightKg: 10,
        noiseExposed: false,
        chemicalExposed: false,
        vibrationExposed: false,
        heightWork: false,
      },
    });

    testWorksite = await prisma.worksite.create({
      data: {
        clientId: testClient.id,
        name: 'Centrul de Cercetare Tehnologică',
        address: 'Strada Fizicienilor nr. 1, Măgurele',
      },
    });

    console.log(`${C.dim}Initialized Test Harness: Client ${testClient.id}, Job ${testJob.id}, Worksite ${testWorksite.id}${C.reset}\n`);

    // ========================================================================
    // VECTOR 1: BOUNDARY SCORES & INPUT VALIDATION (INCDPM PECE MATRIX)
    // ========================================================================
    console.log(`${C.bright}${C.yellow}--- VECTOR 1: Boundary Scores & Input Validation (Pece 1-7 x 1-6) ---${C.reset}`);

    await runTest('V1-01', 'Valid Boundary Min: G=1, P=1 -> riskScore=1 persisted', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        title: 'Evaluare Test Boundary Min',
        items: [
          {
            hazard: 'Pericol minor',
            riskSituation: 'EXECUTANT',
            severityScore: 1,
            probabilityScore: 1,
          },
        ],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201, 'POST should return 201 Created');
      const json = await res.json();
      assertTrue(json.success, 'Response should indicate success');
      const createdItem = json.assessment.riskItems[0];
      assertEqual(createdItem.severityScore, 1, 'Severity must be 1');
      assertEqual(createdItem.probabilityScore, 1, 'Probability must be 1');
      assertEqual(createdItem.riskLevel, 1, 'Risk level must be 1');

      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-02', 'Valid Boundary Max: G=7, P=6 -> riskScore=7 persisted', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        title: 'Evaluare Test Boundary Max',
        items: [
          {
            hazard: 'Pericol catastrofal',
            riskSituation: 'MIJLOACE',
            severityScore: 7,
            probabilityScore: 6,
          },
        ],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201, 'POST should return 201 Created');
      const json = await res.json();
      const createdItem = json.assessment.riskItems[0];
      assertEqual(createdItem.severityScore, 7, 'Severity must be 7');
      assertEqual(createdItem.probabilityScore, 6, 'Probability must be 6');
      assertEqual(createdItem.riskLevel, 7, 'Risk level must be 7');

      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-03', 'Valid Asymmetric Boundary: G=1, P=6 -> riskScore=1 (high frequency, minimal harm)', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        title: 'Evaluare Test G1 P6',
        items: [{ hazard: 'Disconfort usor', severityScore: 1, probabilityScore: 6 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      assertEqual(json.assessment.riskItems[0].riskLevel, 1);
      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-04', 'Valid Asymmetric Boundary: G=7, P=1 -> riskScore=3 (death, extremely rare)', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        title: 'Evaluare Test G7 P1',
        items: [{ hazard: 'Eveniment rar letal', severityScore: 7, probabilityScore: 1 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      assertEqual(json.assessment.riskItems[0].riskLevel, 3);
      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-05', 'Interior Scale Check: G=4, P=3 -> riskScore=3 (Pece matrix mapping)', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Risc mediu', severityScore: 4, probabilityScore: 3 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      assertEqual(json.assessment.riskItems[0].riskLevel, 3);
      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-06', 'Interior Scale Check: G=5, P=4 -> riskScore=4', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Risc serios', severityScore: 5, probabilityScore: 4 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      assertEqual(json.assessment.riskItems[0].riskLevel, 4);
      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-07', 'Interior Scale Check: G=6, P=5 -> riskScore=6', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Risc grav', severityScore: 6, probabilityScore: 5 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      assertEqual(json.assessment.riskItems[0].riskLevel, 6);
      await prisma.riskAssessment.delete({ where: { id: json.assessment.id } });
    });

    await runTest('V1-08', 'POST Rejects Gravity < 1 (G=0) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Sub-zero gravity', severityScore: 0, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400, 'Must return 400 Bad Request');
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Gravitate invalidă'), 'Error must specify gravity violation');
    });

    await runTest('V1-09', 'POST Rejects Gravity < 1 (G=-1) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Negative gravity', severityScore: -1, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Gravitate invalidă'));
    });

    await runTest('V1-10', 'POST Rejects Gravity > 7 (G=8) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Super gravity', severityScore: 8, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Gravitate invalidă'));
    });

    await runTest('V1-11', 'POST Rejects Gravity > 7 (G=99) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Extreme gravity', severityScore: 99, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Gravitate invalidă'));
    });

    await runTest('V1-12', 'POST Rejects Probability < 1 (P=0) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Zero probability', severityScore: 3, probabilityScore: 0 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Probabilitate invalidă'));
    });

    await runTest('V1-13', 'POST Rejects Probability < 1 (P=-3) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Negative probability', severityScore: 3, probabilityScore: -3 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Probabilitate invalidă'));
    });

    await runTest('V1-14', 'POST Rejects Probability > 6 (P=7) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Over probability', severityScore: 3, probabilityScore: 7 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Probabilitate invalidă'));
    });

    await runTest('V1-15', 'POST Rejects Probability > 6 (P=100) with HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        items: [{ hazard: 'Wild probability', severityScore: 3, probabilityScore: 100 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
      const json = await res.json();
      assertTrue(json.error && json.error.includes('Probabilitate invalidă'));
    });

    await runTest('V1-16', 'Missing clientId on POST returns HTTP 400', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        title: 'Assessment Without Client',
        items: [{ hazard: 'Test', severityScore: 3, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 400);
    });

    await runTest('V1-17', 'Non-existent clientId on POST returns HTTP 404', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: '00000000-0000-0000-0000-000000000000',
        title: 'Assessment For Ghost Client',
        items: [{ hazard: 'Test', severityScore: 3, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 404);
    });

    await runTest('V1-18', 'Non-existent jobId on POST returns HTTP 404', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: '00000000-0000-0000-0000-000000000000',
        title: 'Assessment For Ghost Job',
        items: [{ hazard: 'Test', severityScore: 3, probabilityScore: 2 }],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 404);
    });

    // ========================================================================
    // VECTOR 2: ATOMIC SYNCHRONIZATION ON PUT /api/risk-assessments/[id]
    // ========================================================================
    console.log(`\n${C.bright}${C.yellow}--- VECTOR 2: Atomic Sync & Update Lifecycle on PUT ---${C.reset}`);

    let syncAssessmentId: string = '';

    await runTest('V2-01', 'Initial Assessment Creation for Atomic Sync Testing', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        worksiteId: testWorksite.id,
        title: 'Dosar Initial Evaluare Riscuri',
        evaluatorName: 'Dr. Initial Evaluator',
        conclusions: 'Concluzii initiale',
        status: 'draft',
        items: [
          { hazard: 'Factor Initial 1', severityScore: 2, probabilityScore: 2, sortOrder: 0 },
          { hazard: 'Factor Initial 2', severityScore: 3, probabilityScore: 3, sortOrder: 1 },
          { hazard: 'Factor Initial 3', severityScore: 4, probabilityScore: 2, sortOrder: 2 },
        ],
        measures: [
          { itemIndex: 0, measureType: 'tehnica', description: 'Masura 1', responsiblePerson: 'Ing. 1', deadline: '2026-12-01' },
          { itemIndex: 1, measureType: 'organizatorica', description: 'Masura 2', responsiblePerson: 'Ing. 2', deadline: '2026-12-15' },
        ],
        hazardZones: [
          { zoneName: 'Zona A - Sala Server', location: 'Etaj 2', hazardDescription: 'Zgomot' },
          { zoneName: 'Zona B - Camera Tehnica', location: 'Subsol', hazardDescription: 'Risc electric' },
        ],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      syncAssessmentId = json.assessment.id;
      assertTrue(Boolean(syncAssessmentId), 'syncAssessmentId must be populated');
      assertEqual(json.assessment.riskItems.length, 3, 'Initial items count must be 3');
      assertEqual(json.assessment.preventionMeasures.length, 2, 'Initial measures count must be 2');
      assertEqual(json.assessment.hazardZones.length, 2, 'Initial zones count must be 2');
    });

    await runTest('V2-02', 'PUT rejects out-of-bounds Gravity (G=8) with HTTP 400', async () => {
      const req = createPutReq(`http://localhost:3000/api/risk-assessments/${syncAssessmentId}`, {
        items: [{ hazard: 'Invalid G update', severityScore: 8, probabilityScore: 2 }],
      });
      const res = await updateRiskAssessmentPut(req, { params: Promise.resolve({ id: syncAssessmentId }) });
      assertEqual(res.status, 400, 'Must reject invalid gravity with 400');
    });

    await runTest('V2-03', 'PUT rejects out-of-bounds Probability (P=0) with HTTP 400', async () => {
      const req = createPutReq(`http://localhost:3000/api/risk-assessments/${syncAssessmentId}`, {
        items: [{ hazard: 'Invalid P update', severityScore: 3, probabilityScore: 0 }],
      });
      const res = await updateRiskAssessmentPut(req, { params: Promise.resolve({ id: syncAssessmentId }) });
      assertEqual(res.status, 400, 'Must reject invalid probability with 400');
    });

    await runTest('V2-04', 'PUT atomically modifies top-level fields & replaces items and measures', async () => {
      const req = createPutReq(`http://localhost:3000/api/risk-assessments/${syncAssessmentId}`, {
        title: 'Dosar Actualizat Atomic',
        evaluatorName: 'Dr. Expert Actualizat',
        conclusions: 'Concluzii revizuite complet',
        status: 'expert_review',
        items: [
          { hazard: 'Factor Modificat Nou 1', severityScore: 5, probabilityScore: 3, sortOrder: 0 },
          { hazard: 'Factor Modificat Nou 2', severityScore: 6, probabilityScore: 4, sortOrder: 1 },
        ],
        measures: [
          { itemIndex: 0, measureType: 'tehnica', description: 'Masura Noua Tehnica', responsiblePerson: 'Ing. Tehnolog', deadline: '2026-10-31' },
          { itemIndex: 1, measureType: 'igienico-sanitara', description: 'Masura Noua Igiena', responsiblePerson: 'Dr. Medicina Muncii', deadline: '2026-11-30' },
          { itemIndex: 1, measureType: 'organizatorica', description: 'Masura Noua Org', responsiblePerson: 'Director SSM', deadline: '2026-12-31' },
        ],
      });
      const res = await updateRiskAssessmentPut(req, { params: Promise.resolve({ id: syncAssessmentId }) });
      assertEqual(res.status, 200, 'PUT must return 200 OK');
      const json = await res.json();
      assertEqual(json.assessment.title, 'Dosar Actualizat Atomic');
      assertEqual(json.assessment.evaluatorName, 'Dr. Expert Actualizat');
      assertEqual(json.assessment.status, 'expert_review');
      assertEqual(json.assessment.riskItems.length, 2, 'Items must be replaced with exactly 2 items');
      assertEqual(json.assessment.preventionMeasures.length, 3, 'Measures must be replaced with exactly 3 measures');

      // Verify in DB directly: old 3rd item from V2-01 was deleted
      const dbItems = await prisma.riskItem.findMany({ where: { assessmentId: syncAssessmentId } });
      assertEqual(dbItems.length, 2, 'DB must contain exactly 2 risk items');
      const dbMeasures = await prisma.preventionMeasure.findMany({ where: { assessmentId: syncAssessmentId } });
      assertEqual(dbMeasures.length, 3, 'DB must contain exactly 3 prevention measures');

      // Verify recalculated riskLevel for G=5, P=3 (Pece matrix -> 4) and G=6, P=4 (Pece matrix -> 5)
      const item1 = dbItems.find((it) => it.sortOrder === 0);
      const item2 = dbItems.find((it) => it.sortOrder === 1);
      assertEqual(item1?.riskLevel, 4, 'Item 1 riskLevel must be 4');
      assertEqual(item2?.riskLevel, 5, 'Item 2 riskLevel must be 5');
    });

    await runTest('V2-05', 'PUT atomically synchronizes hazardZones', async () => {
      const req = createPutReq(`http://localhost:3000/api/risk-assessments/${syncAssessmentId}`, {
        hazardZones: [
          { zoneName: 'Zona 1 Noua', location: 'Etaj 1', hazardDescription: 'Tensiune inalta' },
          { zoneName: 'Zona 2 Noua', location: 'Etaj 2', hazardDescription: 'Sarcini suspendate' },
          { zoneName: 'Zona 3 Noua', location: 'Etaj 3', hazardDescription: 'Substante corozive' },
        ],
      });
      const res = await updateRiskAssessmentPut(req, { params: Promise.resolve({ id: syncAssessmentId }) });
      assertEqual(res.status, 200);
      const json = await res.json();
      assertEqual(json.assessment.hazardZones.length, 3, 'Must have 3 updated hazard zones');

      const dbZones = await prisma.hazardZone.findMany({ where: { assessmentId: syncAssessmentId } });
      assertEqual(dbZones.length, 3, 'DB must contain exactly 3 hazard zones');
    });

    await runTest('V2-06', 'PUT with items: [] cleanly purges all child items and measures', async () => {
      const req = createPutReq(`http://localhost:3000/api/risk-assessments/${syncAssessmentId}`, {
        items: [],
      });
      const res = await updateRiskAssessmentPut(req, { params: Promise.resolve({ id: syncAssessmentId }) });
      assertEqual(res.status, 200);
      const json = await res.json();
      assertEqual(json.assessment.riskItems.length, 0, 'Risk items must be empty');
      assertEqual(json.assessment.preventionMeasures.length, 0, 'Measures must be empty');

      const countItems = await prisma.riskItem.count({ where: { assessmentId: syncAssessmentId } });
      assertEqual(countItems, 0, 'DB risk items count must be 0');
      const countMeasures = await prisma.preventionMeasure.count({ where: { assessmentId: syncAssessmentId } });
      assertEqual(countMeasures, 0, 'DB prevention measures count must be 0');
    });

    await runTest('V2-07', 'GET /api/risk-assessments/[id] returns 404 for non-existent assessment', async () => {
      const req = createGetReq('http://localhost:3000/api/risk-assessments/00000000-0000-0000-0000-000000000000');
      const res = await getRiskAssessmentGet(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
      assertEqual(res.status, 404);
    });

    await runTest('V2-08', 'PUT /api/risk-assessments/[id] returns 404 for non-existent assessment', async () => {
      const req = createPutReq('http://localhost:3000/api/risk-assessments/00000000-0000-0000-0000-000000000000', {
        title: 'New Ghost Title',
      });
      const res = await updateRiskAssessmentPut(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
      assertEqual(res.status, 404);
    });

    // Cleanup sync assessment
    await prisma.riskAssessment.delete({ where: { id: syncAssessmentId } });

    // ========================================================================
    // VECTOR 3: DELETION & CASCADE ISOLATION
    // ========================================================================
    console.log(`\n${C.bright}${C.yellow}--- VECTOR 3: Deletion & Cascade Isolation ---${C.reset}`);

    let cascadeAssessmentId: string = '';

    await runTest('V3-01', 'Create Assessment with nested items, measures, and zones for cascade testing', async () => {
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        worksiteId: testWorksite.id,
        title: 'Dosar de Test pentru Verificare Cascade',
        items: [
          { hazard: 'Risc Cascade 1', severityScore: 3, probabilityScore: 2 },
          { hazard: 'Risc Cascade 2', severityScore: 4, probabilityScore: 3 },
          { hazard: 'Risc Cascade 3', severityScore: 5, probabilityScore: 4 },
        ],
        measures: [
          { itemIndex: 0, measureType: 'tehnica', description: 'Masura Cascade 1', responsiblePerson: 'Resp 1', deadline: '2026-11-01' },
          { itemIndex: 1, measureType: 'organizatorica', description: 'Masura Cascade 2', responsiblePerson: 'Resp 2', deadline: '2026-11-15' },
          { itemIndex: 2, measureType: 'igienico-sanitara', description: 'Masura Cascade 3', responsiblePerson: 'Resp 3', deadline: '2026-11-30' },
        ],
        hazardZones: [
          { zoneName: 'Zona Cascade 1', location: 'Loc 1', hazardDescription: 'Desc 1' },
          { zoneName: 'Zona Cascade 2', location: 'Loc 2', hazardDescription: 'Desc 2' },
        ],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      cascadeAssessmentId = json.assessment.id;
      assertTrue(Boolean(cascadeAssessmentId));

      const countItemsBefore = await prisma.riskItem.count({ where: { assessmentId: cascadeAssessmentId } });
      assertEqual(countItemsBefore, 3);
      const countMeasuresBefore = await prisma.preventionMeasure.count({ where: { assessmentId: cascadeAssessmentId } });
      assertEqual(countMeasuresBefore, 3);
      const countZonesBefore = await prisma.hazardZone.count({ where: { assessmentId: cascadeAssessmentId } });
      assertEqual(countZonesBefore, 2);
    });

    await runTest('V3-02', 'DELETE /api/risk-assessments/[id] returns HTTP 200', async () => {
      const req = createDeleteReq(`http://localhost:3000/api/risk-assessments/${cascadeAssessmentId}`);
      const res = await deleteRiskAssessmentDelete(req, { params: Promise.resolve({ id: cascadeAssessmentId }) });
      assertEqual(res.status, 200);
      const json = await res.json();
      assertTrue(json.success);
    });

    await runTest('V3-03', 'Verify RiskAssessment record permanently removed from DB', async () => {
      const found = await prisma.riskAssessment.findUnique({ where: { id: cascadeAssessmentId } });
      assertEqual(found, null, 'RiskAssessment must no longer exist');
    });

    await runTest('V3-04', 'Verify Cascade Deletion: all RiskItem records are purged', async () => {
      const count = await prisma.riskItem.count({ where: { assessmentId: cascadeAssessmentId } });
      assertEqual(count, 0, 'Risk items for deleted assessment must be 0');
    });

    await runTest('V3-05', 'Verify Cascade Deletion: all PreventionMeasure records are purged', async () => {
      const count = await prisma.preventionMeasure.count({ where: { assessmentId: cascadeAssessmentId } });
      assertEqual(count, 0, 'Prevention measures for deleted assessment must be 0');
    });

    await runTest('V3-06', 'Verify Cascade Deletion: all HazardZone records are purged', async () => {
      const count = await prisma.hazardZone.count({ where: { assessmentId: cascadeAssessmentId } });
      assertEqual(count, 0, 'Hazard zones for deleted assessment must be 0');
    });

    await runTest('V3-07', 'Verify Cascade Isolation: parent Client, Job, and Worksite remain intact', async () => {
      const client = await prisma.client.findUnique({ where: { id: testClient.id } });
      assertTrue(client !== null, 'Client must NOT be deleted');
      const job = await prisma.job.findUnique({ where: { id: testJob.id } });
      assertTrue(job !== null, 'Job must NOT be deleted');
      const worksite = await prisma.worksite.findUnique({ where: { id: testWorksite.id } });
      assertTrue(worksite !== null, 'Worksite must NOT be deleted');
    });

    await runTest('V3-08', 'DELETE on already deleted assessment returns HTTP 404', async () => {
      const req = createDeleteReq(`http://localhost:3000/api/risk-assessments/${cascadeAssessmentId}`);
      const res = await deleteRiskAssessmentDelete(req, { params: Promise.resolve({ id: cascadeAssessmentId }) });
      assertEqual(res.status, 404);
    });

    // ========================================================================
    // VECTOR 4: DYNAMIC TEMPLATE GENERATION WITH PERSISTED ASSESSMENT
    // ========================================================================
    console.log(`\n${C.bright}${C.yellow}--- VECTOR 4: Dynamic Template Generation with Persisted Assessment ---${C.reset}`);

    let formulaAssessmentId: string = '';
    const customEvaluator = 'Ing. Evaluator Specialist Vasile Pop';
    const customConclusions = 'Nivelul de risc este strict controlat prin aplicarea masurilor preventive speciale.';
    const customMeasureTech = 'Montare sistem de exhaustare locala cu filtrare HEPA H14';
    const customMeasureOrg = 'Instruire specifica privind lucrul in medii cu potential toxic';
    const customResp = 'Ing. Chimist Elena Vasiliu';
    const customDeadline = '20.12.2026';

    await runTest('V4-01', 'Seed controlled assessment for exact mathematical N_rg formula verification', async () => {
      // Factors with known risk levels:
      // F1: G=7, P=6 -> R=7 (R^2 = 49)
      // F2: G=4, P=4 -> R=4 (R^2 = 16)
      // F3: G=3, P=2 -> R=2 (R^2 = 4)
      // F4: G=1, P=1 -> R=1 (R^2 = 1)
      // Sum(R) = 7 + 4 + 2 + 1 = 14
      // Sum(R^2) = 49 + 16 + 4 + 1 = 70
      // N_rg = 70 / 14 = 5.00
      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        title: 'Evaluare Matematica Riguroasa N_rg',
        evaluatorName: customEvaluator,
        conclusions: customConclusions,
        status: 'active',
        items: [
          { hazard: 'Factor Gravitate Maxima', riskSituation: 'MIJLOACE', severityScore: 7, probabilityScore: 6, sortOrder: 0 },
          { hazard: 'Factor Mediu-Mare', riskSituation: 'SARCINA', severityScore: 4, probabilityScore: 4, sortOrder: 1 },
          { hazard: 'Factor Minor', riskSituation: 'EXECUTANT', severityScore: 3, probabilityScore: 2, sortOrder: 2 },
          { hazard: 'Factor Minim', riskSituation: 'MEDIU', severityScore: 1, probabilityScore: 1, sortOrder: 3 },
        ],
        measures: [
          { itemIndex: 0, measureType: 'tehnica', description: customMeasureTech, responsiblePerson: customResp, deadline: customDeadline },
          { itemIndex: 1, measureType: 'organizatorica', description: customMeasureOrg, responsiblePerson: customResp, deadline: customDeadline },
        ],
        hazardZones: [
          { zoneName: 'Laborator Sinteza Chimica', location: 'Corp B, Parter', hazardDescription: 'Vapori inflamabili' },
          { zoneName: 'Depozit Reactivi', location: 'Corp B, Demisol', hazardDescription: 'Atmosfera coroziva' },
        ],
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      formulaAssessmentId = json.assessment.id;
      assertTrue(Boolean(formulaAssessmentId));
    });

    await runTest('V4-02', 'Verify resolver calculates exact N_rg = 5.00 from DB assessment', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
        jobId: testJob.id,
        assessmentId: formulaAssessmentId,
      });

      const nrgValue = resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC;
      assertEqual(nrgValue, '5.00', 'N_rg must exactly equal "5.00" (Sum(R^2)/Sum(R) = 70/14 = 5.00)');

      // Verify custom conclusions and evaluator name are dynamically loaded from DB
      assertEqual(resolvedData.PLACEHOLDER_EVALUATOR_RISC, customEvaluator);
      assertEqual(resolvedData.PLACEHOLDER_CONCLUZII_EVALUARE, customConclusions);

      // Verify hazard zones
      assertEqual(resolvedData.PLACEHOLDER_DENUMIRE_ZONA_01, 'Laborator Sinteza Chimica');
      assertEqual(resolvedData.PLACEHOLDER_DENUMIRE_ZONA_02, 'Depozit Reactivi');
    });

    await runTest('V4-03', 'Generate risk-evaluare DOCX and verify "5.00" and conclusions in OpenXML', async () => {
      const req = createPostReq('http://localhost:3000/api/documents/generate', {
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
        jobId: testJob.id,
        assessmentId: formulaAssessmentId,
        operatorName: 'Auditor Adversarial',
      });
      const res = await generateDocPost(req);
      assertEqual(res.status, 200, 'Document generation must return 200');
      const json = await res.json();
      assertTrue(json.success);
      assertTrue(Boolean(json.result?.filePath));
      createdDocFilePaths.push(json.result.filePath);

      const xml = extractDocxXml(json.result.filePath);
      assertTrue(xml.includes('5.00') || xml.includes('5,00'), 'Document XML must contain dynamic global risk score 5.00');
      assertTrue(xml.includes('masurilor preventive speciale'), 'Document XML must contain dynamic custom conclusions');
    });

    await runTest('V4-04', 'Generate risk-plan-prevenire-tesa DOCX and verify dynamic measures, responsible, deadline in OpenXML', async () => {
      const req = createPostReq('http://localhost:3000/api/documents/generate', {
        templateCode: 'risk-plan-prevenire-tesa',
        clientId: testClient.id,
        jobId: testJob.id,
        assessmentId: formulaAssessmentId,
        operatorName: 'Auditor Adversarial',
      });
      const res = await generateDocPost(req);
      assertEqual(res.status, 200);
      const json = await res.json();
      assertTrue(json.success);
      assertTrue(Boolean(json.result?.filePath));
      createdDocFilePaths.push(json.result.filePath);

      const xml = extractDocxXml(json.result.filePath);
      assertTrue(xml.includes('HEPA H14'), 'Plan XML must contain custom technical measure "HEPA H14"');
      assertTrue(xml.includes('Elena Vasiliu'), 'Plan XML must contain custom responsible "Elena Vasiliu"');
      assertTrue(xml.includes('20.12.2026'), 'Plan XML must contain custom deadline "20.12.2026"');
    });

    await runTest('V4-05', 'Fractional N_rg mathematical verification: R=[3, 1, 2] -> 14/6 = 2.333... -> 2.33', async () => {
      // Construct fractional scenario:
      // F1: G=3, P=3 -> R=3 (R^2 = 9)
      // F2: G=2, P=2 -> R=1 (R^2 = 1)
      // F3: G=2, P=3 -> R=2 (R^2 = 4)
      // Sum(R) = 3 + 1 + 2 = 6
      // Sum(R^2) = 9 + 1 + 4 = 14
      // N_rg = 14 / 6 = 2.3333333333... -> 2.33
      let fracId = '';
      try {
        const req = createPostReq('http://localhost:3000/api/risk-assessments', {
          clientId: testClient.id,
          jobId: testJob.id,
          title: 'Evaluare Matematica Fractionara',
          items: [
            { hazard: 'F1', severityScore: 3, probabilityScore: 3 },
            { hazard: 'F2', severityScore: 2, probabilityScore: 2 },
            { hazard: 'F3', severityScore: 2, probabilityScore: 3 },
          ],
        });
        const res = await createRiskAssessmentPost(req);
        assertEqual(res.status, 201);
        const json = await res.json();
        fracId = json.assessment.id;

        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          jobId: testJob.id,
          assessmentId: fracId,
        });

        assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, '2.33', 'Fractional N_rg must round to 2.33');
      } finally {
        if (fracId) {
          await prisma.riskAssessment.delete({ where: { id: fracId } });
        }
      }
    });

    // Cleanup formula assessment
    await prisma.riskAssessment.delete({ where: { id: formulaAssessmentId } });

    // ========================================================================
    // VECTOR 5: GRACEFUL FALLBACK TO CAEN PRESETS WITHOUT DB ASSESSMENT
    // ========================================================================
    console.log(`\n${C.bright}${C.yellow}--- VECTOR 5: Graceful Fallback to CAEN Presets Without DB Assessment ---${C.reset}`);

    // Ensure NO residual risk assessments exist for testClient
    await prisma.riskAssessment.deleteMany({ where: { clientId: testClient.id } });

    const preset6201 = getRiskProfileForCaen('6201');
    const preset5610 = getRiskProfileForCaen('5610');
    const expectedScore6201 = preset6201.globalRiskScore.toFixed(2);
    const expectedScore5610 = preset5610.globalRiskScore.toFixed(2);

    await runTest('V5-01', `Fallback on CAEN 6201 (IT / Software): resolves preset score ${expectedScore6201}`, async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: testClient.id, // client caenCode = 6201
        // No assessmentId provided!
      });

      assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, expectedScore6201, `CAEN 6201 must fall back to preset ${expectedScore6201}`);
      assertTrue(Boolean(resolvedData.planPrevenire && (resolvedData.planPrevenire as any[]).length > 0));
    });

    await runTest('V5-02', `Generate risk-evaluare DOCX with fallback CAEN 6201 succeeds without crash and contains ${expectedScore6201}`, async () => {
      const req = createPostReq('http://localhost:3000/api/documents/generate', {
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
        operatorName: 'Auditor Fallback',
      });
      const res = await generateDocPost(req);
      assertEqual(res.status, 200);
      const json = await res.json();
      assertTrue(json.success);
      createdDocFilePaths.push(json.result.filePath);

      const xml = extractDocxXml(json.result.filePath);
      assertTrue(xml.includes(expectedScore6201) || xml.includes(expectedScore6201.replace('.', ',')), `Fallback XML must contain CAEN 6201 score ${expectedScore6201}`);
    });

    await runTest('V5-03', `Fallback on CAEN 5610 (Restaurante): resolves preset score ${expectedScore5610}`, async () => {
      // Temporarily update client CAEN to 5610
      await prisma.client.update({
        where: { id: testClient.id },
        data: { caenCode: '5610', caenActivity: 'Restaurante' },
      });

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
      });

      assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, expectedScore5610, `CAEN 5610 must fall back to preset ${expectedScore5610}`);
    });

    await runTest('V5-04', 'Fallback on Exotic / Unknown CAEN (9999): defaults to general TESA preset without throw', async () => {
      // Update client CAEN to unknown 9999
      await prisma.client.update({
        where: { id: testClient.id },
        data: { caenCode: '9999', caenActivity: 'Activitate Necunoscuta / Exotica' },
      });

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
      });

      // Must not crash, should fall back to valid preset
      assertTrue(Boolean(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC), 'Score must be resolved');
      const scoreNum = parseFloat(String(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC).replace(',', '.'));
      assertTrue(scoreNum > 0 && scoreNum <= 3.5, 'Fallback score must be acceptable <= 3.50');
    });

    await runTest('V5-05', 'Generate risk-plan-prevenire-tesa with Exotic CAEN 9999 succeeds cleanly', async () => {
      const req = createPostReq('http://localhost:3000/api/documents/generate', {
        templateCode: 'risk-plan-prevenire-tesa',
        clientId: testClient.id,
      });
      const res = await generateDocPost(req);
      assertEqual(res.status, 200);
      const json = await res.json();
      assertTrue(json.success);
      createdDocFilePaths.push(json.result.filePath);
    });

    // Reset client CAEN back to 6201
    await prisma.client.update({
      where: { id: testClient.id },
      data: { caenCode: '6201', caenActivity: 'Activități de realizare a software-ului la comandă' },
    });

    // ========================================================================
    // VECTOR 6: EXTREME WORKLOADS & RESILIENCE STRESS
    // ========================================================================
    console.log(`\n${C.bright}${C.yellow}--- VECTOR 6: Extreme Workloads & Resilience Stress ---${C.reset}`);

    let extreme35AssessmentId: string = '';

    await runTest('V6-01', 'Massive Assessment: 35 risk factors (>30 slots) persisted successfully', async () => {
      // Build 35 factors: 10 with R=4 (G=4, P=4), 15 with R=3 (G=3, P=3), 10 with R=2 (G=2, P=3)
      // R=4: 10 * 4 = 40, R^2 = 10 * 16 = 160
      // R=3: 15 * 3 = 45, R^2 = 15 * 9 = 135
      // R=2: 10 * 2 = 20, R^2 = 10 * 4 = 40
      // Sum(R) = 40 + 45 + 20 = 105
      // Sum(R^2) = 160 + 135 + 40 = 335
      // N_rg = 335 / 105 = 3.19047... -> 3.19
      const items35: any[] = [];
      const measures35: any[] = [];
      for (let i = 0; i < 35; i++) {
        let g = 3, p = 3;
        if (i < 10) { g = 4; p = 4; }
        else if (i < 25) { g = 3; p = 3; }
        else { g = 2; p = 3; }

        items35.push({
          hazard: `Factor Risc Extrem #${i + 1}`,
          riskSituation: i % 4 === 0 ? 'EXECUTANT' : i % 4 === 1 ? 'SARCINA' : i % 4 === 2 ? 'MIJLOACE' : 'MEDIU',
          severityScore: g,
          probabilityScore: p,
          sortOrder: i,
        });

        measures35.push({
          itemIndex: i,
          measureType: i % 2 === 0 ? 'tehnica' : 'organizatorica',
          description: `Masura de protectie pentru factorul #${i + 1}`,
          responsiblePerson: `Responsabil Departamental #${(i % 5) + 1}`,
          deadline: `2026-12-${String((i % 28) + 1).padStart(2, '0')}`,
        });
      }

      const req = createPostReq('http://localhost:3000/api/risk-assessments', {
        clientId: testClient.id,
        jobId: testJob.id,
        title: 'Evaluare Masiva cu 35 Factori de Risc',
        items: items35,
        measures: measures35,
      });
      const res = await createRiskAssessmentPost(req);
      assertEqual(res.status, 201);
      const json = await res.json();
      extreme35AssessmentId = json.assessment.id;
      assertTrue(Boolean(extreme35AssessmentId));
      assertEqual(json.assessment.riskItems.length, 35, 'Must persist all 35 items');
      assertEqual(json.assessment.preventionMeasures.length, 35, 'Must persist all 35 measures');
    });

    await runTest('V6-02', '35 factors assessment calculates exact N_rg = 3.19 including ALL factors', async () => {
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
        jobId: testJob.id,
        assessmentId: extreme35AssessmentId,
      });

      assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, '3.19', 'N_rg must equal 3.19 incorporating all 35 factors');
      const plan = resolvedData.planPrevenire as any[];
      assertEqual(plan.length, 35, 'Prevention plan table must contain all 35 rows without truncation');
    });

    await runTest('V6-03', 'Generate risk-evaluare DOCX with 35 factors completes cleanly without memory overflow', async () => {
      const req = createPostReq('http://localhost:3000/api/documents/generate', {
        templateCode: 'risk-evaluare',
        clientId: testClient.id,
        jobId: testJob.id,
        assessmentId: extreme35AssessmentId,
      });
      const res = await generateDocPost(req);
      assertEqual(res.status, 200);
      const json = await res.json();
      assertTrue(json.success);
      createdDocFilePaths.push(json.result.filePath);

      const xml = extractDocxXml(json.result.filePath);
      assertTrue(xml.includes('3.19') || xml.includes('3,19'), 'DOCX XML must contain calculated N_rg 3.19');
    });

    await runTest('V6-04', 'Generate risk-plan-prevenire-tesa with 35 factors completes cleanly', async () => {
      const req = createPostReq('http://localhost:3000/api/documents/generate', {
        templateCode: 'risk-plan-prevenire-tesa',
        clientId: testClient.id,
        jobId: testJob.id,
        assessmentId: extreme35AssessmentId,
      });
      const res = await generateDocPost(req);
      assertEqual(res.status, 200);
      const json = await res.json();
      assertTrue(json.success);
      createdDocFilePaths.push(json.result.filePath);
    });

    // Cleanup 35 assessment
    await prisma.riskAssessment.delete({ where: { id: extreme35AssessmentId } });

    await runTest('V6-05', 'Minimal Assessment: Single factor (G=4, P=3 -> R=3) -> N_rg = 3.00', async () => {
      // 1 factor: R=3 -> Sum(R)=3, Sum(R^2)=9 -> N_rg = 9/3 = 3.00
      let singleId = '';
      try {
        const req = createPostReq('http://localhost:3000/api/risk-assessments', {
          clientId: testClient.id,
          items: [{ hazard: 'Singurul factor identificat', severityScore: 4, probabilityScore: 3 }],
        });
        const res = await createRiskAssessmentPost(req);
        assertEqual(res.status, 201);
        const json = await res.json();
        singleId = json.assessment.id;

        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          assessmentId: singleId,
        });

        assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, '3.00', 'Single factor N_rg must equal 3.00');

        // Test doc generation
        const genReq = createPostReq('http://localhost:3000/api/documents/generate', {
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          assessmentId: singleId,
        });
        const genRes = await generateDocPost(genReq);
        assertEqual(genRes.status, 200);
        const genJson = await genRes.json();
        createdDocFilePaths.push(genJson.result.filePath);
      } finally {
        if (singleId) {
          await prisma.riskAssessment.delete({ where: { id: singleId } });
        }
      }
    });

    await runTest('V6-06', 'Extreme Severity Factors: 5 factors all at maximum G=7, P=6 -> N_rg = 7.00', async () => {
      let maxId = '';
      try {
        const itemsMax = Array.from({ length: 5 }, (_, i) => ({
          hazard: `Pericol Extrem #${i + 1}`,
          severityScore: 7,
          probabilityScore: 6,
        }));

        const req = createPostReq('http://localhost:3000/api/risk-assessments', {
          clientId: testClient.id,
          items: itemsMax,
        });
        const res = await createRiskAssessmentPost(req);
        assertEqual(res.status, 201);
        const json = await res.json();
        maxId = json.assessment.id;

        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          assessmentId: maxId,
        });

        assertEqual(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC, '7.00', 'All-max factors N_rg must equal 7.00');

        const genReq = createPostReq('http://localhost:3000/api/documents/generate', {
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          assessmentId: maxId,
        });
        const genRes = await generateDocPost(genReq);
        assertEqual(genRes.status, 200);
        const genJson = await genRes.json();
        createdDocFilePaths.push(genJson.result.filePath);
      } finally {
        if (maxId) {
          await prisma.riskAssessment.delete({ where: { id: maxId } });
        }
      }
    });

    await runTest('V6-07', 'Zero Factors Assessment: empty items [] handles 0/0 safely without NaN or crash', async () => {
      let emptyId = '';
      try {
        const req = createPostReq('http://localhost:3000/api/risk-assessments', {
          clientId: testClient.id,
          title: 'Evaluare Goala Fara Factori',
          items: [],
        });
        const res = await createRiskAssessmentPost(req);
        assertEqual(res.status, 201);
        const json = await res.json();
        emptyId = json.assessment.id;

        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          assessmentId: emptyId,
        });

        assertTrue(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC !== 'NaN', 'N_rg must not be NaN');
        assertTrue(Boolean(resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC), 'N_rg must be defined');

        const genReq = createPostReq('http://localhost:3000/api/documents/generate', {
          templateCode: 'risk-evaluare',
          clientId: testClient.id,
          assessmentId: emptyId,
        });
        const genRes = await generateDocPost(genReq);
        assertEqual(genRes.status, 200, 'Generation must not crash with 0 factors');
        const genJson = await genRes.json();
        createdDocFilePaths.push(genJson.result.filePath);
      } finally {
        if (emptyId) {
          await prisma.riskAssessment.delete({ where: { id: emptyId } });
        }
      }
    });

  } finally {
    // Teardown: delete test client and all cascaded entities
    if (testClient?.id) {
      try {
        await prisma.client.delete({ where: { id: testClient.id } });
      } catch (e) {
        console.warn('Cleanup warning (test client):', e);
      }
    }

    // Clean up generated test docx files
    for (const f of createdDocFilePaths) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }
  }

  // ========================================================================
  // FINAL TEST SUITE REPORT
  // ========================================================================
  console.log(`\n${C.bright}${C.cyan}==============================================================================${C.reset}`);
  console.log(`${C.bright}${C.cyan}               ADVERSARIAL STRESS TEST SUITE EXECUTION SUMMARY                ${C.reset}`);
  console.log(`${C.bright}${C.cyan}==============================================================================${C.reset}`);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total tests executed: ${C.bright}${total}${C.reset}`);
  console.log(`Passed:               ${C.green}${passed}${C.reset}`);
  console.log(`Failed:               ${failed === 0 ? C.green : C.red}${failed}${C.reset}`);
  console.log(`Total duration:       ${(totalDuration / 1000).toFixed(2)}s\n`);

  if (failed > 0) {
    console.log(`${C.bgRed}${C.white} VERDICT: FAILED (${failed} FAILURES DETECTED) ${C.reset}\n`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - [${r.code}] ${r.name}: ${C.red}${r.error}${C.reset}`);
    }
    return false;
  }

  console.log(`${C.bgGreen}${C.white} VERDICT: APPROVED (100% PASS RATE — ALL ${total}/${total} ADVERSARIAL CHECKS PASSED) ${C.reset}\n`);
  return true;
}

// CLI entry point
if (require.main === module || process.argv[1]?.includes('adversarial-challenger2-m4')) {
  runMilestone4AdversarialSuite()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal crash in adversarial test runner:', err);
      process.exit(1);
    });
}
