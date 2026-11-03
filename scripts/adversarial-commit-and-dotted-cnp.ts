/**
 * scripts/adversarial-commit-and-dotted-cnp.ts
 *
 * Empirical verification harness for Milestone 3 Iteration 2:
 * 1. Direct probe of POST /api/imports/commit with all-invalid employee payloads (verify HTTP 400).
 * 2. Zero-phantom guarantee for Worksites and Jobs in database upon preview, direct commit, and API probe.
 * 3. Deep probe of dotted "C.N.P." headers on row 12 under permuted column layouts.
 */

import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';
import {
  parseClientWorkbook,
  normalizeHeader,
  compareWithDatabase,
  commitImport,
  ParsedWorkbook,
  ParsedEmployee,
} from '../src/lib/importer';
import { POST as commitRoute } from '../src/app/api/imports/commit/route';
import { NextRequest } from 'next/server';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${msg}`);
  }
}

function assertEquals<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`[ASSERTION FAILED] ${msg} (Expected: ${String(expected)}, Actual: ${String(actual)})`);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('   EMPIRICAL PROBE: POST /api/imports/commit & ZERO-PHANTOM DEFENSE VERIFICATION');
  console.log('================================================================================\n');

  const testCui = 'RO99887766';
  // Cleanup test client if existing
  const existing = await prisma.client.findFirst({ where: { cui: testCui } });
  if (existing) {
    await prisma.client.delete({ where: { id: existing.id } });
  }

  const testClient = await prisma.client.create({
    data: {
      name: 'PHANTOM TEST PROBE S.R.L.',
      cui: testCui,
      regCom: 'J40/9988/2026',
      address: 'București, Sector 1',
      legalRepresentative: 'Director Probe',
    },
  });

  const baselineWorksites = await prisma.worksite.count({ where: { clientId: testClient.id } });
  const baselineJobs = await prisma.job.count({ where: { clientId: testClient.id } });
  const baselineEmployees = await prisma.employee.count({ where: { clientId: testClient.id } });
  const baselineBatches = await prisma.importBatch.count({ where: { clientId: testClient.id } });

  console.log(`Baseline counts for test client: Worksites=${baselineWorksites}, Jobs=${baselineJobs}, Employees=${baselineEmployees}, Batches=${baselineBatches}`);

  // ---------------------------------------------------------------------------
  // TEST 1: Direct probe of POST /api/imports/commit with all-invalid employee list
  // ---------------------------------------------------------------------------
  console.log('\n▶ [1] Probing POST /api/imports/commit with all-invalid employee payload...');
  const invalidEmp1: ParsedEmployee = {
    rowNumber: 13,
    lastName: 'EronatUnu',
    firstName: 'Vasile',
    cnp: '0000000000000', // Invalid CNP
    docType: 'CI',
    docNumber: '111222',
    county: 'București',
    locality: 'Sector 1',
    street: 'Strada Fantoma 1',
    streetNumber: '10',
    jobTitle: 'Inginer Fantoma 1',
    worksiteName: 'Punct de Lucru Fantoma 1',
    status: 'ACTIV',
    hygieneRequested: false,
    isValid: false,
    errors: ['CNP-ul este invalid (cifra de control sau lungime incorectă).'],
  };

  const invalidEmp2: ParsedEmployee = {
    rowNumber: 14,
    lastName: '', // Missing name
    firstName: 'Necunoscut',
    cnp: '1111111111111',
    docType: 'CI',
    docNumber: '333444',
    county: 'București',
    locality: 'Sector 1',
    street: 'Strada Fantoma 2',
    streetNumber: '20',
    jobTitle: 'Tehnician Fantoma 2',
    worksiteName: 'Punct de Lucru Fantoma 2',
    status: 'ACTIV',
    hygieneRequested: false,
    isValid: false,
    errors: ['Numele este obligatoriu.', 'CNP-ul este invalid.'],
  };

  const allInvalidPayload = {
    clientId: testClient.id,
    filename: 'all-invalid-probe.xlsx',
    operatorName: 'Adversarial Challenger',
    parsedData: {
      company: {
        name: testClient.name,
        cui: testClient.cui,
      },
      employees: [invalidEmp1, invalidEmp2],
      jobContexts: [],
    },
  };

  const req = new NextRequest('http://localhost:3000/api/imports/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allInvalidPayload),
  });

  const response = await commitRoute(req);
  console.log(`  Response Status Code: ${response.status}`);
  assertEquals(response.status, 400, 'POST /api/imports/commit must return HTTP 400 when all rows are invalid');

  const json = await response.json();
  console.log(`  Response JSON body: ${JSON.stringify(json)}`);
  assert(
    json.error === 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.',
    `Expected exact error message, got: ${json.error}`
  );

  // Verify database integrity: zero phantom entities created
  const postApiWorksites = await prisma.worksite.count({ where: { clientId: testClient.id } });
  const postApiJobs = await prisma.job.count({ where: { clientId: testClient.id } });
  const postApiEmployees = await prisma.employee.count({ where: { clientId: testClient.id } });
  const postApiBatches = await prisma.importBatch.count({ where: { clientId: testClient.id } });

  assertEquals(postApiWorksites, baselineWorksites, 'Zero phantom worksites created in DB after rejected API call');
  assertEquals(postApiJobs, baselineJobs, 'Zero phantom jobs created in DB after rejected API call');
  assertEquals(postApiEmployees, baselineEmployees, 'Zero employees created in DB after rejected API call');
  assertEquals(postApiBatches, baselineBatches, 'Zero import batches created in DB after rejected API call');
  console.log('  ✓ Verified: POST /api/imports/commit returned HTTP 400 and left DB completely pristine.');

  // ---------------------------------------------------------------------------
  // TEST 2: Defense-in-depth within commitImport service layer
  // ---------------------------------------------------------------------------
  console.log('\n▶ [2] Probing service layer commitImport with invalid rows having distinct worksite/job titles...');
  const serviceBatchId = await commitImport(
    testClient.id,
    {
      company: { name: testClient.name, cui: testClient.cui },
      employees: [invalidEmp1, invalidEmp2],
      jobContexts: [],
    },
    'Challenger Direct Service',
    'direct-service.xlsx'
  );

  const directWorksites = await prisma.worksite.findMany({
    where: { clientId: testClient.id, name: { in: ['Punct de Lucru Fantoma 1', 'Punct de Lucru Fantoma 2'] } },
  });
  const directJobs = await prisma.job.findMany({
    where: { clientId: testClient.id, title: { in: ['Inginer Fantoma 1', 'Tehnician Fantoma 2'] } },
  });

  assertEquals(directWorksites.length, 0, 'Zero phantom worksites created by commitImport for invalid employees');
  assertEquals(directJobs.length, 0, 'Zero phantom jobs created by commitImport for invalid employees');

  const directBatch = await prisma.importBatch.findUnique({ where: { id: serviceBatchId } });
  assert(!!directBatch, 'Batch record exists');
  assertEquals(directBatch!.newCount, 0, 'Batch newCount must be 0');
  assertEquals(directBatch!.errorCount, 2, 'Batch errorCount must be 2');
  console.log('  ✓ Verified: commitImport defense-in-depth created 0 phantom worksites and 0 phantom jobs.');

  // ---------------------------------------------------------------------------
  // TEST 3: compareWithDatabase read-only guarantee
  // ---------------------------------------------------------------------------
  console.log('\n▶ [3] Probing compareWithDatabase preview with all-invalid employee workbook...');
  const previewReport = await compareWithDatabase(testClient.id, {
    company: { name: testClient.name, cui: testClient.cui },
    employees: [invalidEmp1, invalidEmp2],
    jobContexts: [],
  });

  assertEquals(previewReport.summary.totalRows, 2, 'Total rows = 2');
  assertEquals(previewReport.summary.newCount, 0, 'newCount = 0');
  assertEquals(previewReport.summary.modifiedCount, 0, 'modifiedCount = 0');
  assertEquals(previewReport.summary.errorCount, 2, 'errorCount = 2');

  const postPreviewWorksites = await prisma.worksite.count({
    where: { clientId: testClient.id, name: { in: ['Punct de Lucru Fantoma 1', 'Punct de Lucru Fantoma 2'] } },
  });
  const postPreviewJobs = await prisma.job.count({
    where: { clientId: testClient.id, title: { in: ['Inginer Fantoma 1', 'Tehnician Fantoma 2'] } },
  });
  assertEquals(postPreviewWorksites, 0, 'Preview does not persist worksites to DB');
  assertEquals(postPreviewJobs, 0, 'Preview does not persist jobs to DB');
  console.log('  ✓ Verified: compareWithDatabase creates zero records in DB and flags all rows as ERROR.');

  // ---------------------------------------------------------------------------
  // TEST 4: Dotted "C.N.P." Header Permutation Stress Test
  // ---------------------------------------------------------------------------
  console.log('\n▶ [4] Testing Dotted "C.N.P." Header Variants on row 12 under permuted layouts...');

  const cnpVariants = [
    'C.N.P.',
    'C.N.P. / Pașaport',
    'C.N.P. / Pasaport',
    'C.N.P./Pașaport',
    'c.n.p.',
    'c.n.p. / pasaport',
    '  C.N.P.  ',
    'Cod Numeric Personal',
  ];

  for (let idx = 0; idx < cnpVariants.length; idx++) {
    const cnpHeader = cnpVariants[idx];
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    for (let r = 0; r < 11; r++) aoa.push([]);

    // Heavily permuted columns: Functie at col 0, Punct Lucru at col 1, CNP at col 2, Nume at col 3, Prenume at col 4
    aoa.push([
      'Functie / Post',
      'Punct Lucru',
      cnpHeader,
      'Nume de familie',
      'Prenume',
      'Data Nasterii',
      'Tip Act',
      'Numar Act',
      'Judet',
      'Localitate',
      'Strada',
      'Numar',
      'Data Angajarii',
      'Status',
    ]);

    aoa.push([
      'Arhitect Sistem',
      'Punct Alpha',
      '1880315410127',
      'Ionescu',
      'Mihai',
      '15.03.1988',
      'CI',
      '987654',
      'București',
      'Sector 1',
      'Calea Victoriei',
      '100',
      '01.01.2023',
      'ACTIV',
    ]);

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, sheet, 'Firmă și angajați');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsed = parseClientWorkbook(buf);
    assertEquals(parsed.employees.length, 1, `Workbook with header "${cnpHeader}" parsed 1 employee`);
    const emp = parsed.employees[0];

    assert(
      emp.lastName === 'Ionescu',
      `Header "${cnpHeader}": lastName must be "Ionescu", got "${emp.lastName}" (indicates canonical fallback collision)`
    );
    assert(
      emp.firstName === 'Mihai',
      `Header "${cnpHeader}": firstName must be "Mihai", got "${emp.firstName}"`
    );
    assert(
      emp.cnp === '1880315410127',
      `Header "${cnpHeader}": cnp must be "1880315410127", got "${emp.cnp}"`
    );
    assert(
      emp.jobTitle === 'Arhitect Sistem',
      `Header "${cnpHeader}": jobTitle must be "Arhitect Sistem", got "${emp.jobTitle}"`
    );
    assert(
      emp.worksiteName === 'Punct Alpha',
      `Header "${cnpHeader}": worksiteName must be "Punct Alpha", got "${emp.worksiteName}"`
    );
    assert(
      emp.isValid === true,
      `Header "${cnpHeader}": employee must be valid, got errors: ${emp.errors.join(', ')}`
    );
    console.log(`  ✓ Variant "${cnpHeader}": Dynamic mapping resolved correctly without fallback.`);
  }

  // Cleanup
  await prisma.client.delete({ where: { id: testClient.id } });
  console.log('\n================================================================================');
  console.log('   ALL EMPIRICAL PROBES PASSED SUCCESSFULLY — ZERO PHANTOMS & DOTTED CNP OK');
  console.log('================================================================================');
}

main().catch((err) => {
  console.error('Fatal probe failure:', err);
  process.exit(1);
});
