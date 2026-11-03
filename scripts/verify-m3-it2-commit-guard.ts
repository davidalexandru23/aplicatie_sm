import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/imports/commit/route';
import { prisma } from '../src/lib/prisma';
import { ParsedWorkbook, ParsedEmployee } from '../src/lib/importer';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('M3 IT2 REVIEWER INDEPENDENT VERIFICATION — COMMIT ROUTE & PARTIAL IMPORT');
  console.log('========================================================================\n');

  const testCui = 'RO99881122';
  // Clean up any test artifact from prior runs
  await prisma.client.deleteMany({ where: { cui: testCui } });

  try {
    // 1. Create a test client in DB
    const client = await prisma.client.create({
      data: {
        name: 'TEST COMMIT GUARD S.R.L.',
        cui: testCui,
        regCom: 'J40/9988/2026',
        address: 'București, Str. Reviewer 1',
        legalRepresentative: 'Director Guard',
      },
    });

    console.log(`[TEST SETUP] Created test client: ${client.name} (ID: ${client.id})`);

    // -------------------------------------------------------------------------
    // TEST 1: All employees invalid -> Expect HTTP 400 with Romanian message
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: All employees invalid (length > 0 && every !isValid) ---');
    const invalidEmp1: ParsedEmployee = {
      rowNumber: 13,
      lastName: 'Popa',
      firstName: 'Ion',
      cnp: '0000000000000', // Invalid CNP
      birthDate: new Date('1985-05-15'),
      docType: 'CI',
      docNumber: '111111',
      county: 'București',
      locality: 'Sector 1',
      street: 'Str. Test 1',
      streetNumber: '10',
      jobTitle: 'Muncitor Fantoma',
      worksiteName: 'Punct Fantoma',
      hireDate: new Date('2024-01-01'),
      status: 'ACTIV',
      hygieneRequested: false,
      isValid: false,
      errors: ['CNP-ul este invalid.'],
    };

    const invalidEmp2: ParsedEmployee = {
      rowNumber: 14,
      lastName: 'Ionescu',
      firstName: 'Ana',
      cnp: '1111111111111', // Invalid CNP
      birthDate: new Date('1990-06-20'),
      docType: 'CI',
      docNumber: '222222',
      county: 'București',
      locality: 'Sector 1',
      street: 'Str. Test 2',
      streetNumber: '11',
      jobTitle: 'Specialist Fantoma',
      worksiteName: 'Punct Fantoma 2',
      hireDate: new Date('2024-02-01'),
      status: 'ACTIV',
      hygieneRequested: false,
      isValid: false,
      errors: ['CNP-ul este invalid.'],
    };

    const allInvalidWorkbook: ParsedWorkbook = {
      company: { name: client.name, cui: client.cui },
      employees: [invalidEmp1, invalidEmp2],
      jobContexts: [],
    };

    const req1 = new NextRequest('http://localhost:3000/api/imports/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        parsedData: allInvalidWorkbook,
        filename: 'all-invalid.xlsx',
        operatorName: 'Reviewer Test',
      }),
    });

    const res1 = await POST(req1);
    const json1 = await res1.json();

    console.log(`Response Status: ${res1.status}`);
    console.log('Response JSON:', json1);

    assert(res1.status === 400, `Expected status 400, got ${res1.status}`);
    assert(
      json1.error === 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.',
      `Expected exact Romanian error message, got: "${json1.error}"`
    );
    console.log('✓ TEST 1 PASSED: HTTP 400 returned with exact Romanian error message.');

    // Verify DB remains untouched (0 employees, 0 phantom worksites/jobs)
    const empCount1 = await prisma.employee.count({ where: { clientId: client.id } });
    assert(empCount1 === 0, `Expected 0 employees, found ${empCount1}`);
    const worksites1 = await prisma.worksite.findMany({ where: { clientId: client.id } });
    assert(worksites1.length === 0, `Expected 0 worksites, found ${worksites1.length}`);
    console.log('✓ Database integrity verified: no employees or phantom worksites created.');

    // -------------------------------------------------------------------------
    // TEST 2: Partial commit (1 valid row, 1 invalid row) -> Expect HTTP 200 and only valid saved
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Partial commit (1 valid row, 1 invalid row) ---');
    const validEmp: ParsedEmployee = {
      rowNumber: 15,
      lastName: 'Stanescu',
      firstName: 'Radu',
      cnp: '1850101410123', // Valid CNP
      birthDate: new Date('1985-01-01'),
      docType: 'CI',
      docSeries: 'RD',
      docNumber: '654321',
      county: 'București',
      locality: 'Sector 1',
      street: 'Str. Valid',
      streetNumber: '5',
      jobTitle: 'Inginer SSM Valid',
      worksiteName: 'Punct de Lucru Valid',
      hireDate: new Date('2024-03-01'),
      status: 'ACTIV',
      hygieneRequested: false,
      isValid: true,
      errors: [],
    };

    const mixedWorkbook: ParsedWorkbook = {
      company: { name: client.name, cui: client.cui },
      employees: [validEmp, invalidEmp1], // 1 valid, 1 invalid
      jobContexts: [],
    };

    const req2 = new NextRequest('http://localhost:3000/api/imports/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        parsedData: mixedWorkbook,
        filename: 'partial-valid.xlsx',
        operatorName: 'Reviewer Partial Test',
      }),
    });

    const res2 = await POST(req2);
    const json2 = await res2.json();

    console.log(`Response Status: ${res2.status}`);
    console.log('Response JSON:', json2);

    assert(res2.status === 200, `Expected status 200, got ${res2.status}`);
    assert(json2.success === true, `Expected json.success === true`);
    assert(typeof json2.batchId === 'string', `Expected valid batchId`);

    // Verify DB has exactly 1 employee (the valid one)
    const empList = await prisma.employee.findMany({ where: { clientId: client.id } });
    assert(empList.length === 1, `Expected 1 employee in DB, found ${empList.length}`);
    assert(empList[0].cnp === '1850101410123', `Expected CNP 1850101410123, got ${empList[0].cnp}`);

    // Verify worksites & jobs: ONLY valid worksite/job created, NO phantom worksite/job
    const worksites = await prisma.worksite.findMany({ where: { clientId: client.id } });
    assert(worksites.length === 1, `Expected exactly 1 worksite, found ${worksites.length}`);
    assert(worksites[0].name === 'Punct de Lucru Valid', `Expected 'Punct de Lucru Valid', got ${worksites[0].name}`);

    const jobs = await prisma.job.findMany({ where: { clientId: client.id } });
    assert(jobs.length === 1, `Expected exactly 1 job, found ${jobs.length}`);
    assert(jobs[0].title === 'Inginer SSM Valid', `Expected 'Inginer SSM Valid', got ${jobs[0].title}`);

    // Verify Batch stats
    const batch = await prisma.importBatch.findUnique({ where: { id: json2.batchId } });
    assert(!!batch, 'Batch record exists');
    assert(batch!.rowCount === 2, `Expected rowCount 2, got ${batch!.rowCount}`);
    assert(batch!.newCount === 1, `Expected newCount 1, got ${batch!.newCount}`);
    assert(batch!.errorCount === 1, `Expected errorCount 1, got ${batch!.errorCount}`);
    assert(batch!.status === 'confirmed', `Expected status confirmed, got ${batch!.status}`);

    console.log('✓ TEST 2 PASSED: Partial commit succeeded, saved only valid row, zero phantom entities.');

    // -------------------------------------------------------------------------
    // TEST 3: Edge Case - Missing parsedData -> Expect HTTP 400
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Missing parsedData ---');
    const req3 = new NextRequest('http://localhost:3000/api/imports/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    });
    const res3 = await POST(req3);
    const json3 = await res3.json();
    assert(res3.status === 400, `Expected 400, got ${res3.status}`);
    assert(json3.error === 'Datele de import lipsesc.', `Expected 'Datele de import lipsesc.', got "${json3.error}"`);
    console.log('✓ TEST 3 PASSED: Missing parsedData returns HTTP 400.');

    console.log('\n========================================================================');
    console.log('ALL INDEPENDENT REVIEWER TESTS PASSED WITH 100% SUCCESS');
    console.log('========================================================================');
  } finally {
    // Cleanup
    await prisma.client.deleteMany({ where: { cui: testCui } });
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test run failed:', e);
    process.exit(1);
  });
