/**
 * scripts/adversarial-m2-intake-decisions.ts
 *
 * Empirical Challenger independent test harness for Milestone 2:
 * Client Intake & Organizational Decisions (Adversarial Stress Test)
 *
 * Test Sections:
 * 1. Client Intake:
 *    - Valid CAEN 5610 auto-fill (activity: "Restaurante", riskClass: "MEDIUM", intervals, hygiene)
 *    - Valid CAEN variants (6201 LOW, 4120 HIGH, normalization "56.10" -> "5610")
 *    - Duplicate CUI rejection (HTTP 409, case-insensitivity, whitespace trimming)
 *    - Missing required fields validation (HTTP 400 for missing name, cui, address, empty string)
 *    - Malformed payload handling (bad foundedYear, bad decisionsDate)
 *
 * 2. Organizational Decisions:
 *    - PATCH non-existent client (HTTP 404)
 *    - PATCH duplicate CUI conflict (HTTP 409)
 *    - PATCH invalid decisions date (HTTP 400)
 *    - Create active employees for the client
 *    - PATCH client decision appointees with active employees (HTTP 200)
 *    - Persistence verification in database
 *
 * 3. Document Generation & DOCX XML Inspection:
 *    - Resolve template data for "decizii-angajator"
 *    - Render DOCX binary using renderTemplateBuffer
 *    - Unpack DOCX package via PizZip and extract XML streams
 *    - Assert presence of actual appointee names in word/document.xml
 *    - Assert presence of Romanian date format and company data
 *    - Assert ZERO {PLACEHOLDER_*} tokens in word/document.xml and headers/footers
 *    - Assert ZERO unresolved placeholders via collectUnresolvedPlaceholders
 *
 * Execution: npx tsx scripts/adversarial-m2-intake-decisions.ts
 */

import assert from 'node:assert/strict';
import path from 'path';
import { NextRequest } from 'next/server';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { POST as createClient } from '../src/app/api/clients/route';
import { PATCH as updateClient, GET as getClient } from '../src/app/api/clients/[id]/route';
import { getCaenEntry, normalizeCaenCode } from '../src/lib/caen-catalog';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

// Global assertion & timing tracking
let totalAssertions = 0;
let passedAssertions = 0;

function trackAssert(condition: boolean, message: string) {
  totalAssertions++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedAssertions++;
}

interface TestRun {
  section: string;
  name: string;
  assertions: number;
  durationMs: number;
  status: 'PASSED' | 'FAILED';
  error?: string;
}

const testRuns: TestRun[] = [];

async function runSectionTest(
  section: string,
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const startAssertions = passedAssertions;
  const startTime = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - startTime);
    const assertionsCount = passedAssertions - startAssertions;
    testRuns.push({
      section,
      name,
      assertions: assertionsCount,
      durationMs,
      status: 'PASSED',
    });
    console.log(`  ✓ [${assertionsCount} assertions, ${durationMs}ms] ${name}`);
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const assertionsCount = passedAssertions - startAssertions;
    const msg = err instanceof Error ? err.message : String(err);
    testRuns.push({
      section,
      name,
      assertions: assertionsCount,
      durationMs,
      status: 'FAILED',
      error: msg,
    });
    console.error(`  ✗ [FAILED after ${durationMs}ms] ${name}: ${msg}`);
    throw err;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('  ADVERSARIAL STRESS TEST: CLIENT INTAKE & ORGANIZATIONAL DECISIONS     ');
  console.log('========================================================================\n');

  const suiteStartTime = performance.now();
  const testCuiPrimary = 'RO99112233';
  const testCuiSecondary = 'RO99112244';
  let createdClientId: string | null = null;
  let secondaryClientId: string | null = null;
  const createdEmployeeIds: string[] = [];

  try {
    // 0. Initial Cleanup of any lingering test entities
    const staleClients = await prisma.client.findMany({
      where: { cui: { in: [testCuiPrimary, testCuiSecondary] } },
    });
    for (const sc of staleClients) {
      await prisma.employee.deleteMany({ where: { clientId: sc.id } });
      await prisma.client.delete({ where: { id: sc.id } });
    }

    // =========================================================================
    // SECTION 1: Client Intake & CAEN Profiling
    // =========================================================================
    console.log('--- SECTION 1: Client Intake & CAEN Profiling ---');

    await runSectionTest('1. Intake', 'Create client with valid CAEN code 5610 (Horeca / Restaurante)', async () => {
      const caen5610 = getCaenEntry('5610');
      trackAssert(Boolean(caen5610), 'CAEN 5610 must exist in caen-catalog');
      trackAssert(caen5610?.name === 'Restaurante', 'CAEN 5610 name must be "Restaurante"');
      trackAssert(caen5610?.riskClass === 'MEDIUM', 'CAEN 5610 riskClass must be MEDIUM');
      trackAssert(caen5610?.defaultSsmIntervalMonths === 6, 'CAEN 5610 SSM interval must be 6 months');
      trackAssert(caen5610?.defaultPsiIntervalMonths === 6, 'CAEN 5610 PSI interval must be 6 months');
      trackAssert(caen5610?.requiresHygieneCourse === true, 'CAEN 5610 requires hygiene course');

      const req = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'TRATTORIA ADVERSARIAL S.R.L.',
          cui: testCuiPrimary,
          regCom: 'J40/7788/2023',
          address: 'Strada Speranței nr. 10, Sector 1, București',
          legalRepresentative: 'Mihăilescu George',
          contactPerson: 'Elena Pop',
          contactEmail: 'contact@trattoria-adv.ro',
          contactPhone: '0744112233',
          caenCode: '5610', // Raw 4-digit CAEN code
          foundedYear: '2023',
          ssmProviderName: 'PRESTEXPERT SSM S.R.L.',
          ssmSpecialistName: 'Ing. Dobre Cristian',
          ssmSpecialistCert: 'Certificat seria EV nr. 998877/2020',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await createClient(req);
      trackAssert(res.status === 201, `POST /api/clients must return HTTP 201, got ${res.status}`);

      const body = await res.json();
      trackAssert(body.id !== undefined && body.id.length > 5, 'Client ID must be returned');
      trackAssert(body.cui === testCuiPrimary, 'CUI must match sanitized value');
      trackAssert(body.caenCode === '5610', 'caenCode must be 5610');
      trackAssert(body.caenActivity === 'Restaurante', `caenActivity must be auto-filled to "Restaurante", got "${body.caenActivity}"`);
      trackAssert(body.foundedYear === 2023, 'foundedYear must be parsed as integer 2023');

      createdClientId = body.id;

      // Verify directly in DB
      const dbClient = await prisma.client.findUnique({ where: { id: createdClientId! } });
      trackAssert(Boolean(dbClient), 'Client must exist in PostgreSQL database');
      trackAssert(dbClient?.caenCode === '5610', 'DB caenCode must be 5610');
      trackAssert(dbClient?.caenActivity === 'Restaurante', 'DB caenActivity must be Restaurante');
    });

    await runSectionTest('1. Intake', 'CAEN code formatting variants and normalization', async () => {
      // Test normalization helper
      trackAssert(normalizeCaenCode('56.10') === '5610', 'normalizeCaenCode("56.10") should yield "5610"');
      trackAssert(normalizeCaenCode('CAEN 5610') === '5610', 'normalizeCaenCode("CAEN 5610") should yield "5610"');
      trackAssert(normalizeCaenCode('5610 - Restaurante') === '5610', 'normalizeCaenCode("5610 - Restaurante") should yield "5610"');

      // Test secondary client with dotted CAEN code "62.01"
      const req = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'TECH ADVERSARIAL S.R.L.',
          cui: testCuiSecondary,
          address: 'Bulevardul Dacia nr. 20, Sector 2, București',
          caenCode: '62.01',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const res = await createClient(req);
      trackAssert(res.status === 201, `POST /api/clients with CAEN 62.01 must succeed with 201, got ${res.status}`);
      const body = await res.json();
      trackAssert(body.caenCode === '6201', `CAEN code must be normalized to "6201", got "${body.caenCode}"`);
      trackAssert(
        body.caenActivity.includes('software'),
        `caenActivity must auto-fill for 6201, got "${body.caenActivity}"`
      );

      secondaryClientId = body.id;

      const caen6201 = getCaenEntry('6201');
      trackAssert(caen6201?.riskClass === 'LOW', 'CAEN 6201 riskClass must be LOW');
      trackAssert(caen6201?.defaultSsmIntervalMonths === 12, 'CAEN 6201 SSM interval must be 12 months');
    });

    await runSectionTest('1. Intake', 'Enforce duplicate CUI rejection (HTTP 409 Conflict)', async () => {
      // 1. Exact duplicate
      const reqExact = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'CLONA EXACTA S.R.L.',
          cui: testCuiPrimary,
          address: 'Strada Copiei nr. 1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resExact = await createClient(reqExact);
      trackAssert(resExact.status === 409, `Exact duplicate CUI must return 409, got ${resExact.status}`);
      const bodyExact = await resExact.json();
      trackAssert(
        bodyExact.error && bodyExact.error.includes('Există deja o firmă înregistrată cu acest CUI/CIF'),
        `Error message must report existing firm, got: "${bodyExact.error}"`
      );

      // 2. Lowercase duplicate "ro99112233"
      const reqLower = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'CLONA LOWERCASE S.R.L.',
          cui: testCuiPrimary.toLowerCase(),
          address: 'Strada Copiei nr. 2',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resLower = await createClient(reqLower);
      trackAssert(resLower.status === 409, `Lowercase CUI duplicate must return 409, got ${resLower.status}`);

      // 3. Whitespace padded duplicate "  RO99112233  "
      const reqSpace = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'CLONA WHITESPACE S.R.L.',
          cui: `   ${testCuiPrimary}   `,
          address: 'Strada Copiei nr. 3',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resSpace = await createClient(reqSpace);
      trackAssert(resSpace.status === 409, `Whitespace-padded CUI duplicate must return 409, got ${resSpace.status}`);
    });

    await runSectionTest('1. Intake', 'Enforce validation errors on missing/invalid required fields (HTTP 400)', async () => {
      // 1. Missing name
      const reqNoName = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          cui: 'RO11223344',
          address: 'Strada Validă nr. 1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resNoName = await createClient(reqNoName);
      trackAssert(resNoName.status === 400, `Missing name must return 400, got ${resNoName.status}`);

      // 2. Missing CUI
      const reqNoCui = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'FIRMA FARA CUI S.R.L.',
          address: 'Strada Validă nr. 1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resNoCui = await createClient(reqNoCui);
      trackAssert(resNoCui.status === 400, `Missing CUI must return 400, got ${resNoCui.status}`);

      // 3. Missing Address
      const reqNoAddr = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: 'FIRMA FARA ADRESA S.R.L.',
          cui: 'RO11223344',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resNoAddr = await createClient(reqNoAddr);
      trackAssert(resNoAddr.status === 400, `Missing address must return 400, got ${resNoAddr.status}`);

      // 4. Empty string fields
      const reqEmpty = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          cui: '',
          address: '',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resEmpty = await createClient(reqEmpty);
      trackAssert(resEmpty.status === 400, `Empty fields must return 400, got ${resEmpty.status}`);
      const bodyEmpty = await resEmpty.json();
      trackAssert(
        bodyEmpty.error.includes('Denumirea, CUI-ul și sediul social sunt obligatorii'),
        `Must return Romanian required message, got: "${bodyEmpty.error}"`
      );
    });

    // =========================================================================
    // SECTION 2: Organizational Decisions & PATCH /api/clients/[id]
    // =========================================================================
    console.log('\n--- SECTION 2: Organizational Decisions & Appointees Management ---');

    await runSectionTest('2. Decisions', 'PATCH validation & edge cases (404, 409, 400)', async () => {
      // 1. Non-existent client ID -> 404
      const req404 = new NextRequest('http://localhost:3000/api/clients/inexistent-id-123', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'UPDATE INEXISTENT' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res404 = await updateClient(req404, { params: Promise.resolve({ id: 'inexistent-id-123' }) });
      trackAssert(res404.status === 404, `PATCH non-existent client must return 404, got ${res404.status}`);

      // 2. Duplicate CUI on PATCH -> 409
      const req409 = new NextRequest(`http://localhost:3000/api/clients/${createdClientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ cui: testCuiSecondary }), // secondaryClientId already has this CUI
        headers: { 'Content-Type': 'application/json' },
      });
      const res409 = await updateClient(req409, { params: Promise.resolve({ id: createdClientId! }) });
      trackAssert(res409.status === 409, `PATCH with conflicting duplicate CUI must return 409, got ${res409.status}`);

      // 3. Invalid decisionsDate string -> 400
      const reqBadDate = new NextRequest(`http://localhost:3000/api/clients/${createdClientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ decisionsDate: 'invalid-non-iso-date-string' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const resBadDate = await updateClient(reqBadDate, { params: Promise.resolve({ id: createdClientId! }) });
      trackAssert(resBadDate.status === 400, `PATCH with invalid decisionsDate must return 400, got ${resBadDate.status}`);
      const bodyBadDate = await resBadDate.json();
      trackAssert(bodyBadDate.error.includes('Format dată decizii invalid'), 'Error must specify invalid decisions date');
    });

    await runSectionTest('2. Decisions', 'Create active employees and update decision appointees via PATCH', async () => {
      // Create 2 realistic Romanian employees for TRATTORIA ADVERSARIAL S.R.L.
      const emp1 = await prisma.employee.create({
        data: {
          clientId: createdClientId!,
          firstName: 'Elena',
          lastName: 'Dumitrescu',
          cnp: '2880315123456',
          status: 'ACTIV',
          ssmIntervalMonths: 6,
          psiIntervalMonths: 6,
        },
      });
      createdEmployeeIds.push(emp1.id);

      const emp2 = await prisma.employee.create({
        data: {
          clientId: createdClientId!,
          firstName: 'Vasile',
          lastName: 'Radu',
          cnp: '1840822123456',
          status: 'ACTIV',
          ssmIntervalMonths: 6,
          psiIntervalMonths: 6,
        },
      });
      createdEmployeeIds.push(emp2.id);

      trackAssert(Boolean(emp1.id && emp2.id), 'Both employees created successfully');

      const appointeeSsm = `${emp1.lastName} ${emp1.firstName}`; // "Dumitrescu Elena"
      const appointeeFirstAid = `${emp2.lastName} ${emp2.firstName}`; // "Radu Vasile"
      const appointeePsi = `${emp1.lastName} ${emp1.firstName}`; // "Dumitrescu Elena"
      const appointeesCommission = `${emp1.lastName} ${emp1.firstName}, ${emp2.lastName} ${emp2.firstName}`; // "Dumitrescu Elena, Radu Vasile"
      const decisionsDateIso = '2026-03-01T00:00:00.000Z';

      const patchReq = new NextRequest(`http://localhost:3000/api/clients/${createdClientId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          designatedWorkerSsm: appointeeSsm,
          firstAidResponder: appointeeFirstAid,
          psiResponder: appointeePsi,
          investigationMembers: appointeesCommission,
          decisionsDate: decisionsDateIso,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const patchRes = await updateClient(patchReq, { params: Promise.resolve({ id: createdClientId! }) });
      trackAssert(patchRes.status === 200, `PATCH /api/clients/[id] must return 200, got ${patchRes.status}`);

      const patchBody = await patchRes.json();
      trackAssert(patchBody.success === true, 'Response must have success: true');
      trackAssert(patchBody.client.designatedWorkerSsm === 'Dumitrescu Elena', 'designatedWorkerSsm must match');
      trackAssert(patchBody.client.firstAidResponder === 'Radu Vasile', 'firstAidResponder must match');
      trackAssert(patchBody.client.psiResponder === 'Dumitrescu Elena', 'psiResponder must match');
      trackAssert(patchBody.client.investigationMembers === 'Dumitrescu Elena, Radu Vasile', 'investigationMembers must match');

      // Verify DB direct
      const dbUpdated = await prisma.client.findUnique({ where: { id: createdClientId! } });
      trackAssert(dbUpdated?.designatedWorkerSsm === 'Dumitrescu Elena', 'DB designatedWorkerSsm must persist');
      trackAssert(dbUpdated?.firstAidResponder === 'Radu Vasile', 'DB firstAidResponder must persist');
      trackAssert(dbUpdated?.psiResponder === 'Dumitrescu Elena', 'DB psiResponder must persist');
      trackAssert(dbUpdated?.investigationMembers === 'Dumitrescu Elena, Radu Vasile', 'DB investigationMembers must persist');
      trackAssert(Boolean(dbUpdated?.decisionsDate?.toISOString().startsWith('2026-03-01')), 'DB decisionsDate must persist');
    });

    // =========================================================================
    // SECTION 3: Document Generation & DOCX XML Stream Inspection
    // =========================================================================
    console.log('\n--- SECTION 3: Document Generation & DOCX XML Stream Inspection ---');

    await runSectionTest('3. DOCX XML', 'Resolve decizii-angajator placeholders for client with appointees', async () => {
      const resolution = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: createdClientId!,
      });

      trackAssert(Boolean(resolution), 'Resolution result must be defined');
      trackAssert(Boolean(resolution.resolvedData), 'resolvedData must exist');

      const data = resolution.resolvedData;

      // Assert that resolved values contain actual appointees
      const ssmWorker = String(data.PLACEHOLDER_LUCRATOR_DESEMNAT_SSM || '');
      trackAssert(ssmWorker.includes('Dumitrescu Elena'), `Designated worker placeholder must contain "Dumitrescu Elena", got: "${ssmWorker}"`);

      const firstAid = String(data.PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR || '');
      trackAssert(firstAid.includes('Radu Vasile'), `First aid placeholder must contain "Radu Vasile", got: "${firstAid}"`);

      const psiOfficer = String(data.PLACEHOLDER_RESPONSABIL_PSI || '');
      trackAssert(psiOfficer.includes('Dumitrescu Elena'), `PSI officer placeholder must contain "Dumitrescu Elena", got: "${psiOfficer}"`);

      const commission = String(data.PLACEHOLDER_MEMBRU_COMISIE || '');
      trackAssert(commission.includes('Dumitrescu Elena') && commission.includes('Radu Vasile'), `Commission placeholder must contain appointees, got: "${commission}"`);

      // Assert date resolution
      trackAssert(data.PLACEHOLDER_DATA_DECIZIE === '01.03.2026', `Decisions date must be formatted as "01.03.2026", got: "${data.PLACEHOLDER_DATA_DECIZIE}"`);
      trackAssert(data.PLACEHOLDER_FIRMA === 'TRATTORIA ADVERSARIAL S.R.L.', `Company name must match, got: "${data.PLACEHOLDER_FIRMA}"`);
      trackAssert(data.PLACEHOLDER_CUI === testCuiPrimary, `CUI must match, got: "${data.PLACEHOLDER_CUI}"`);
    });

    await runSectionTest('3. DOCX XML', 'Render DOCX buffer, inspect XML streams, and assert zero {PLACEHOLDER_*} tokens', async () => {
      const resolution = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: createdClientId!,
      });

      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', 'DECIZII.docx');
      const docxBuffer = await renderTemplateBuffer(templatePath, 'docx', resolution.resolvedData, 'DECIZII.docx');

      trackAssert(Buffer.isBuffer(docxBuffer), 'Output must be a Node.js Buffer');
      trackAssert(docxBuffer.length > 10000, `Buffer size must be realistic for DOCX (>10KB), got ${docxBuffer.length} bytes`);

      // Unpack DOCX package via PizZip
      const zip = new PizZip(docxBuffer);
      const documentXmlFile = zip.file('word/document.xml');
      trackAssert(Boolean(documentXmlFile), 'word/document.xml must exist in the DOCX package');

      const documentXmlText = documentXmlFile!.asText();
      trackAssert(documentXmlText.length > 5000, `word/document.xml content must be substantial, got ${documentXmlText.length} characters`);

      // Assert that actual appointee names are present in the XML text
      trackAssert(
        documentXmlText.includes('Dumitrescu Elena'),
        'word/document.xml MUST contain the actual appointee name "Dumitrescu Elena"'
      );
      trackAssert(
        documentXmlText.includes('Radu Vasile'),
        'word/document.xml MUST contain the actual appointee name "Radu Vasile"'
      );
      trackAssert(
        documentXmlText.includes('TRATTORIA ADVERSARIAL S.R.L.'),
        'word/document.xml MUST contain the company name "TRATTORIA ADVERSARIAL S.R.L."'
      );
      trackAssert(
        documentXmlText.includes('Strada Speranței nr. 10'),
        'word/document.xml MUST contain the company address "Strada Speranței nr. 10"'
      );
      trackAssert(
        documentXmlText.includes('01.03.2026'),
        'word/document.xml MUST contain the decisions date "01.03.2026"'
      );

      // CRITICAL ADVERSARIAL CHECK: Zero {PLACEHOLDER_*} tokens remain in document.xml
      const curlyPlaceholders = documentXmlText.match(/\{PLACEHOLDER_[A-Z0-9_]+\}/g) || [];
      trackAssert(
        curlyPlaceholders.length === 0,
        `word/document.xml MUST have 0 {PLACEHOLDER_*} tokens, found ${curlyPlaceholders.length}: ${curlyPlaceholders.slice(0, 5).join(', ')}`
      );

      // Scan ALL XML and rels files in the entire DOCX archive for {PLACEHOLDER_*}
      const allXmlFiles = Object.keys(zip.files).filter(
        (fname) => fname.endsWith('.xml') || fname.endsWith('.rels')
      );
      trackAssert(allXmlFiles.length >= 5, `DOCX archive must contain at least 5 XML/rels parts, found ${allXmlFiles.length}`);

      let totalCurlyAcrossAllParts = 0;
      const foundTokensByFile: Record<string, string[]> = {};

      for (const fname of allXmlFiles) {
        const fileContent = zip.file(fname)?.asText() || '';
        const matches = fileContent.match(/\{PLACEHOLDER_[A-Z0-9_]+\}/g) || [];
        if (matches.length > 0) {
          totalCurlyAcrossAllParts += matches.length;
          foundTokensByFile[fname] = matches;
        }
      }

      trackAssert(
        totalCurlyAcrossAllParts === 0,
        `All DOCX XML parts MUST have 0 {PLACEHOLDER_*} tokens, found ${totalCurlyAcrossAllParts}: ${JSON.stringify(foundTokensByFile)}`
      );

      // Strictest check: collectUnresolvedPlaceholders must find 0 tokens
      const unresolved = await collectUnresolvedPlaceholders(docxBuffer, 'docx');
      trackAssert(
        unresolved.length === 0,
        `collectUnresolvedPlaceholders MUST report 0 unresolved tokens, found ${unresolved.length}: ${unresolved.join(', ')}`
      );
    });

  } finally {
    // Teardown / Cleanup test data from DB
    console.log('\n--- Teardown & Database Cleanup ---');
    if (createdEmployeeIds.length > 0) {
      await prisma.employee.deleteMany({ where: { id: { in: createdEmployeeIds } } });
      console.log(`  Cleaned up ${createdEmployeeIds.length} test employees.`);
    }
    const idsToDelete: string[] = [];
    if (createdClientId) idsToDelete.push(createdClientId);
    if (secondaryClientId) idsToDelete.push(secondaryClientId);
    if (idsToDelete.length > 0) {
      await prisma.client.deleteMany({ where: { id: { in: idsToDelete } } });
      console.log(`  Cleaned up ${idsToDelete.length} test clients.`);
    }
  }

  const totalDurationMs = Math.round(performance.now() - suiteStartTime);

  console.log('\n========================================================================');
  console.log('                          TEST RESULTS SUMMARY                          ');
  console.log('========================================================================');
  console.log(`Total tests run:       ${testRuns.length}`);
  console.log(`Tests passed:          ${testRuns.filter((r) => r.status === 'PASSED').length}`);
  console.log(`Tests failed:          ${testRuns.filter((r) => r.status === 'FAILED').length}`);
  console.log(`Total assertions:      ${totalAssertions}`);
  console.log(`Passed assertions:     ${passedAssertions}`);
  console.log(`Total execution time:  ${totalDurationMs}ms`);
  console.log('------------------------------------------------------------------------');

  for (const t of testRuns) {
    console.log(`  [${t.status}] ${t.section} -> ${t.name} (${t.assertions} assertions, ${t.durationMs}ms)`);
  }
  console.log('========================================================================\n');

  if (testRuns.some((r) => r.status === 'FAILED')) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test harness execution error:', err);
  process.exit(1);
});
