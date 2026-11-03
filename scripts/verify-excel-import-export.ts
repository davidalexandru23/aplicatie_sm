/**
 * scripts/verify-excel-import-export.ts
 *
 * Comprehensive Milestone 3 Verification Suite:
 * Robust Excel Import/Export & Template Management
 *
 * Test 1: Clean parsing of Test_Client_3_Angajati.xlsx (3/3 valid, 0 errors)
 * Test 2: Dirty data resilience and line number attribution (corrupted CNP, missing fields, duplicate CNP with exact row)
 * Test 3: Safe partial commit and atomic rollback (valid committed, invalid skipped)
 * Test 4: Expat passport acceptance (non-Romanian citizen / passport length >= 3)
 * Test 5: Template download API returns valid binary files for empty and sample
 * Test 6: Round-trip export-import fidelity (export from DB -> re-import -> 100% valid & UNCHANGED)
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { 
  parseClientWorkbook, 
  compareWithDatabase, 
  commitImport, 
  parseExcelDate, 
  normalizeHeader,
  ParsedWorkbook 
} from '../src/lib/importer';
import { exportClientToExcel, formatDmy, getBirthDateFromCNP } from '../src/lib/exporter';
import { GET as getTemplateRoute } from '../src/app/api/imports/template/route';

interface SuiteResult {
  testName: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const results: SuiteResult[] = [];

async function runTestCase(name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  console.log(`\n▶ [RULARE] ${name}...`);
  try {
    await fn();
    const duration = performance.now() - start;
    results.push({ testName: name, passed: true, durationMs: duration, details: 'OK' });
    console.log(`  ✓ [SUCCES] ${name} (${duration.toFixed(1)}ms)`);
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ testName: name, passed: false, durationMs: duration, details: msg });
    console.error(`  ✗ [EȘUAT] ${name}: ${msg}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Așteptat: ${String(expected)}, Primit: ${String(actual)})`);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('  MILESTONE 3: EXCEL IMPORT/EXPORT & TEMPLATE MANAGEMENT ACCEPTANCE SUITE');
  console.log('================================================================================');

  // ---------------------------------------------------------------------------
  // Test 1: Clean parsing of Test_Client_3_Angajati.xlsx
  // ---------------------------------------------------------------------------
  await runTestCase('Test 1: Clean parsing of Test_Client_3_Angajati.xlsx (3/3 valid, 0 errors)', async () => {
    const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
    assert(fs.existsSync(samplePath), 'Test_Client_3_Angajati.xlsx trebuie să existe pe disc');

    const buffer = fs.readFileSync(samplePath);
    const parsed = parseClientWorkbook(buffer);

    assertEquals(parsed.company.name, 'NEXUS SOLUTIONS S.R.L.', 'Denumire firmă detectată corect');
    assertEquals(parsed.company.cui, 'RO38765432', 'CUI detectat corect');
    assertEquals(parsed.employees.length, 3, 'Număr de angajați parsați (3)');
    assertEquals(parsed.jobContexts.length, 3, 'Număr de posturi în context parsați (3)');

    parsed.employees.forEach((emp, idx) => {
      assertEquals(emp.isValid, true, `Angajatul #${emp.rowNumber} (${emp.lastName}) trebuie să fie valid`);
      assertEquals(emp.errors.length, 0, `Angajatul #${emp.rowNumber} nu trebuie să aibă erori`);
      assert(emp.rowNumber >= 13, `Indexul de rând Excel trebuie să fie >= 13 (primit ${emp.rowNumber})`);
      assert(emp.hireDate instanceof Date, `Data angajării trebuie să fie un Date valid`);
      assert(emp.birthDate instanceof Date, `Data nașterii trebuie să fie un Date valid`);
      assert(emp.cnp.length === 13, `CNP-ul trebuie să aibă 13 caractere`);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Dirty data resilience and line number attribution
  // ---------------------------------------------------------------------------
  await runTestCase('Test 2: Dirty data resilience and line number attribution', async () => {
    const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
    const buffer = fs.readFileSync(samplePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Rândul 16: CNP corupt + lipsă câmpuri obligatorii (stradă, număr act)
    sFirm['A16'] = { t: 's', v: 'Ionescu' };
    sFirm['B16'] = { t: 's', v: 'Mihai' };
    sFirm['D16'] = { t: 's', v: '1234567890123' }; // CNP invalid matematic
    sFirm['E16'] = { t: 's', v: '15.03.1990' };
    sFirm['K16'] = { t: 's', v: '' }; // lipsă număr act
    sFirm['O16'] = { t: 's', v: 'București' };
    sFirm['P16'] = { t: 's', v: 'Sector 1' };
    sFirm['Q16'] = { t: 's', v: '' }; // lipsă stradă
    sFirm['R16'] = { t: 's', v: '10' };
    sFirm['Y16'] = { t: 's', v: 'Programator' };
    sFirm['Z16'] = { t: 's', v: 'Sediul Central' };
    sFirm['AB16'] = { t: 's', v: '01.01.2024' };
    sFirm['AC16'] = { t: 's', v: 'ACTIV' };

    // Rândul 17: CNP duplicat în fișier (identic cu cel de la rândul 13: 1880315410127)
    sFirm['A17'] = { t: 's', v: 'Popa' };
    sFirm['B17'] = { t: 's', v: 'Vasile' };
    sFirm['D17'] = { t: 's', v: '1880315410127' }; // Apare deja la rândul 13 (Stan Alexandru)
    sFirm['E17'] = { t: 's', v: '15.03.1988' };
    sFirm['K17'] = { t: 's', v: '654321' };
    sFirm['O17'] = { t: 's', v: 'București' };
    sFirm['P17'] = { t: 's', v: 'Sector 2' };
    sFirm['Q17'] = { t: 's', v: 'Str. Teiului' };
    sFirm['R17'] = { t: 's', v: '5' };
    sFirm['Y17'] = { t: 's', v: 'Specialist IT' };
    sFirm['Z17'] = { t: 's', v: 'Sediul Central' };
    sFirm['AB17'] = { t: 's', v: '01.02.2024' };
    sFirm['AC17'] = { t: 's', v: 'ACTIV' };

    sFirm['!ref'] = 'A1:AH25';

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    assertEquals(parsed.employees.length, 5, 'Trebuie să parseze 5 angajați în total');

    // Verificare rând 16 (erori multiple și identificare exactă linie)
    const emp16 = parsed.employees.find((e) => e.rowNumber === 16);
    assert(!!emp16, 'Rândul 16 trebuie identificat');
    assertEquals(emp16!.isValid, false, 'Rândul 16 trebuie să fie marcat invalid');
    assert(
      emp16!.errors.some((e) => e.includes('CNP-ul este invalid')),
      'Rândul 16 trebuie să conțină eroare despre CNP invalid'
    );
    assert(
      emp16!.errors.some((e) => e.includes('Numărul actului de identitate')),
      'Rândul 16 trebuie să conțină eroare despre număr act lipsă'
    );
    assert(
      emp16!.errors.some((e) => e.includes('Strada este obligatorie')),
      'Rândul 16 trebuie să conțină eroare despre stradă lipsă'
    );

    // Verificare rând 17 (detectare duplicat intra-fișier cu număr rând referit)
    const emp17 = parsed.employees.find((e) => e.rowNumber === 17);
    assert(!!emp17, 'Rândul 17 trebuie identificat');
    assertEquals(emp17!.isValid, false, 'Rândul 17 trebuie să fie marcat invalid din cauza duplicării');
    assert(
      emp17!.errors.some((e) => e.includes('CNP duplicat în fișier (apare deja la rândul 13)')),
      `Rândul 17 trebuie să specifice rândul unde a apărut prima dată (primit: ${emp17!.errors.join('; ')})`
    );

    // Rândul 13 trebuie să rămână valid
    const emp13 = parsed.employees.find((e) => e.rowNumber === 13);
    assert(!!emp13, 'Rândul 13 trebuie să existe');
    assertEquals(emp13!.isValid, true, 'Prima apariție a CNP-ului la rândul 13 trebuie să rămână validă');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Safe partial commit and atomic rollback
  // ---------------------------------------------------------------------------
  await runTestCase('Test 3: Safe partial commit and atomic rollback', async () => {
    // Creăm un client temporar dedicat testului
    const testCui = 'RO99988811';
    let testClient = await prisma.client.findFirst({ where: { cui: testCui } });
    if (testClient) {
      await prisma.client.delete({ where: { id: testClient.id } });
    }

    testClient = await prisma.client.create({
      data: {
        name: 'TEST PARTIAL COMMIT S.R.L.',
        cui: testCui,
        regCom: 'J40/9999/2026',
        address: 'București, Sector 1, Calea Victoriei 100',
        legalRepresentative: 'Director Test',
        worksites: {
          create: [{ name: 'Sediul Central', address: 'Calea Victoriei 100' }],
        },
        jobs: {
          create: [{ title: 'Specialist Test', corCode: '251201' }],
        },
      },
    });

    // Construim date simulate cu 2 angajați valizi și 1 angajat invalid
    const validEmp1 = {
      rowNumber: 13,
      lastName: 'Popescu',
      firstName: 'Dan',
      cnp: '1850101410123',
      birthDate: new Date('1985-01-01T00:00:00.000Z'),
      docType: 'CI',
      docNumber: '111222',
      county: 'București',
      locality: 'Sector 1',
      street: 'Str. Test 1',
      streetNumber: '10',
      jobTitle: 'Specialist Test',
      worksiteName: 'Sediul Central',
      hireDate: new Date('2024-01-01T00:00:00.000Z'),
      status: 'ACTIV' as const,
      hygieneRequested: false,
      isValid: true,
      errors: [],
    };

    const validEmp2 = {
      rowNumber: 14,
      lastName: 'Ionescu',
      firstName: 'Raluca',
      cnp: '2900202410124',
      birthDate: new Date('1990-02-02T00:00:00.000Z'),
      docType: 'CI',
      docNumber: '333444',
      county: 'București',
      locality: 'Sector 1',
      street: 'Str. Test 2',
      streetNumber: '20',
      jobTitle: 'Specialist Test',
      worksiteName: 'Sediul Central',
      hireDate: new Date('2024-02-01T00:00:00.000Z'),
      status: 'ACTIV' as const,
      hygieneRequested: false,
      isValid: true,
      errors: [],
    };

    const invalidEmp3 = {
      rowNumber: 15,
      lastName: 'Gheorghiu',
      firstName: 'Invalid',
      cnp: '0000000000000',
      birthDate: new Date('1995-03-03T00:00:00.000Z'),
      docType: 'CI',
      docNumber: '555666',
      county: 'București',
      locality: 'Sector 1',
      street: 'Str. Test 3',
      streetNumber: '30',
      jobTitle: 'Specialist Test',
      worksiteName: 'Sediul Central',
      hireDate: new Date('2024-03-01T00:00:00.000Z'),
      status: 'ACTIV' as const,
      hygieneRequested: false,
      isValid: false,
      errors: ['CNP invalid', 'Date incorecte'],
    };

    const mockWorkbook: ParsedWorkbook = {
      company: {
        name: testClient.name,
        cui: testClient.cui,
      },
      employees: [validEmp1, validEmp2, invalidEmp3],
      jobContexts: [],
    };

    // 1. Executăm commitImport: cele 2 valide trebuie salvate, cel invalid trebuie sărit
    await commitImport(testClient.id, mockWorkbook, 'Tester', 'test-partial.xlsx');

    const dbEmployees = await prisma.employee.findMany({
      where: { clientId: testClient.id },
      include: { identityDocument: true, residenceAddress: true },
    });

    assertEquals(dbEmployees.length, 2, 'Doar cele 2 rânduri valide trebuie salvate în DB');
    assert(
      dbEmployees.some((e) => e.cnp === '1850101410123'),
      'Popescu Dan trebuie să fie salvat'
    );
    assert(
      dbEmployees.some((e) => e.cnp === '2900202410124'),
      'Ionescu Raluca trebuie să fie salvată'
    );
    assert(
      !dbEmployees.some((e) => e.cnp === '0000000000000'),
      'Angajatul invalid nu trebuie să fie salvat în DB'
    );

    // Verificăm auto-inițializarea termenelor legale SSM/Medicină
    const empPopescu = dbEmployees.find((e) => e.cnp === '1850101410123')!;
    assert(empPopescu.medicalLastExamDate instanceof Date, 'medicalLastExamDate auto-inițializat');
    assert(empPopescu.ssmLastTrainingDate instanceof Date, 'ssmLastTrainingDate auto-inițializat');
    assert(empPopescu.psiLastTrainingDate instanceof Date, 'psiLastTrainingDate auto-inițializat');
    assertEquals(
      empPopescu.medicalLastExamDate?.toISOString(),
      validEmp1.hireDate.toISOString(),
      'Data medicină inițializată implicit la data angajării'
    );

    // 2. Test Atomic Rollback: dacă tranzacția eșuează forțat, nimic nu rămâne salvat suplimentar
    let rollbackThrew = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.employee.create({
          data: {
            clientId: testClient.id,
            firstName: 'Temp',
            lastName: 'Rollback',
            cnp: '1999999999999',
            hireDate: new Date(),
            status: 'ACTIV',
          },
        });
        throw new Error('Eroare simulată forțată pentru atomic rollback');
      });
    } catch {
      rollbackThrew = true;
    }
    assert(rollbackThrew, 'Tranzacția a aruncat excepția așteptată');

    const countAfterRollback = await prisma.employee.count({ where: { clientId: testClient.id } });
    assertEquals(countAfterRollback, 2, 'Numărul angajaților trebuie să rămână neschimbat (rollback atomic complet)');

    // Curățare date de test
    await prisma.client.delete({ where: { id: testClient.id } });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Expat passport acceptance
  // ---------------------------------------------------------------------------
  await runTestCase('Test 4: Expat passport acceptance', async () => {
    const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
    const buffer = fs.readFileSync(samplePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Adăugăm un angajat expat ucrainean cu pașaport pe rândul 16
    sFirm['A16'] = { t: 's', v: 'Shevchenko' };
    sFirm['B16'] = { t: 's', v: 'Andriy' };
    sFirm['D16'] = { t: 's', v: 'EF9876543' }; // Pașaport internațional
    sFirm['E16'] = { t: 's', v: '29.09.1976' };
    sFirm['H16'] = { t: 's', v: 'Ucraineană' }; // Cetățenie non-română
    sFirm['I16'] = { t: 's', v: 'Pașaport' };
    sFirm['K16'] = { t: 's', v: 'EF9876543' };
    sFirm['O16'] = { t: 's', v: 'Brașov' };
    sFirm['P16'] = { t: 's', v: 'Brașov' };
    sFirm['Q16'] = { t: 's', v: 'Str. Lalelelor' };
    sFirm['R16'] = { t: 's', v: '12' };
    sFirm['Y16'] = { t: 's', v: 'Consultant Tehnic' };
    sFirm['Z16'] = { t: 's', v: 'Sediul Central' };
    sFirm['AB16'] = { t: 's', v: '15.01.2024' };
    sFirm['AC16'] = { t: 's', v: 'ACTIV' };

    // Adăugăm un angajat expat cu număr de pașaport prea scurt pe rândul 17
    sFirm['A17'] = { t: 's', v: 'Dupont' };
    sFirm['B17'] = { t: 's', v: 'Jean' };
    sFirm['D17'] = { t: 's', v: 'A1' }; // Prea scurt (<3 caractere)
    sFirm['E17'] = { t: 's', v: '10.05.1982' };
    sFirm['H17'] = { t: 's', v: 'Franceză' };
    sFirm['I17'] = { t: 's', v: 'Pașaport' };
    sFirm['K17'] = { t: 's', v: 'A1' };
    sFirm['O17'] = { t: 's', v: 'București' };
    sFirm['P17'] = { t: 's', v: 'Sector 1' };
    sFirm['Q17'] = { t: 's', v: 'Str. Paris' };
    sFirm['R17'] = { t: 's', v: '1' };
    sFirm['Y17'] = { t: 's', v: 'Manager Calitate' };
    sFirm['Z17'] = { t: 's', v: 'Sediul Central' };
    sFirm['AB17'] = { t: 's', v: '01.02.2024' };
    sFirm['AC17'] = { t: 's', v: 'ACTIV' };

    sFirm['!ref'] = 'A1:AH25';

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    const expatValid = parsed.employees.find((e) => e.rowNumber === 16);
    assert(!!expatValid, 'Expat valid rândul 16 găsit');
    assertEquals(expatValid!.isValid, true, 'Expat cu pașaport valid trebuie să fie isValid: true');
    assertEquals(expatValid!.errors.length, 0, 'Expat cu pașaport nu trebuie să aibă erori de CNP');

    const expatShort = parsed.employees.find((e) => e.rowNumber === 17);
    assert(!!expatShort, 'Expat invalid rândul 17 găsit');
    assertEquals(expatShort!.isValid, false, 'Expat cu pașaport prea scurt trebuie să fie isValid: false');
    assert(
      expatShort!.errors.some((e) => e.includes('prea scurt')),
      'Eroarea trebuie să specifice că numărul actului este prea scurt'
    );
  });

  // ---------------------------------------------------------------------------
  // Test 5: Template download API returns valid binary files for empty and sample
  // ---------------------------------------------------------------------------
  await runTestCase('Test 5: Template download API returns valid binary files for empty and sample', async () => {
    // 1. Cerere type=empty (șablon gol)
    const reqEmpty = new NextRequest('http://localhost:3000/api/imports/template?type=empty');
    const resEmpty = await getTemplateRoute(reqEmpty);

    assertEquals(resEmpty.status, 200, 'Status HTTP 200 pentru type=empty');
    assertEquals(
      resEmpty.headers.get('Content-Type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'MIME Type corect pentru XLSX'
    );
    assert(
      resEmpty.headers.get('Content-Disposition')?.includes('Model_date_client_SSM_sablon_gol.xlsx') || false,
      'Filename corect pentru șablon gol'
    );

    const bufEmpty = Buffer.from(await resEmpty.arrayBuffer());
    assert(bufEmpty.length > 10000, 'Fișierul șablon gol are dimensiune validă (>10KB)');
    const wbEmpty = XLSX.read(bufEmpty, { type: 'buffer' });
    assert(wbEmpty.SheetNames.includes('Firmă și angajați'), 'Șablonul gol include foaia Firmă și angajați');

    // 2. Cerere type=sample (exemplu completat)
    const reqSample = new NextRequest('http://localhost:3000/api/imports/template?type=sample');
    const resSample = await getTemplateRoute(reqSample);

    assertEquals(resSample.status, 200, 'Status HTTP 200 pentru type=sample');
    assert(
      resSample.headers.get('Content-Disposition')?.includes('Model_date_client_SSM_exemplu_completat.xlsx') || false,
      'Filename corect pentru exemplu completat'
    );

    const bufSample = Buffer.from(await resSample.arrayBuffer());
    assert(bufSample.length > 10000, 'Exemplul completat are dimensiune validă (>10KB)');
    const parsedSample = parseClientWorkbook(bufSample);
    assertEquals(parsedSample.employees.length, 3, 'Exemplul completat se parsează cu 3 angajați');
    assert(parsedSample.employees.every((e) => e.isValid), 'Toți cei 3 angajați din exemplu sunt valizi');

    // 3. Cerere type invalid -> HTTP 400
    const reqInvalid = new NextRequest('http://localhost:3000/api/imports/template?type=unknown');
    const resInvalid = await getTemplateRoute(reqInvalid);
    assertEquals(resInvalid.status, 400, 'Status HTTP 400 pentru type necunoscut');
  });

  // ---------------------------------------------------------------------------
  // Test 6: Round-trip export-import fidelity
  // ---------------------------------------------------------------------------
  await runTestCase('Test 6: Round-trip export-import fidelity', async () => {
    const clients = await prisma.client.findMany({
      include: {
        employees: {
          include: {
            identityDocument: true,
            residenceAddress: true,
            currentJob: true,
            currentWorksite: true,
          },
        },
        jobs: true,
        worksites: true,
      },
    });

    assert(clients.length >= 2, 'Trebuie să existe cel puțin 2 clienți în DB');

    for (const client of clients) {
      console.log(`    Verificare round-trip pentru: ${client.name} (${client.cui})...`);
      const exportRes = await exportClientToExcel(client.id);

      assert(exportRes.buffer.length > 5000, 'Buffer exportat valid');
      assert(exportRes.filename.includes(client.cui), 'Nume fișier conține CUI');

      const parsed = parseClientWorkbook(exportRes.buffer);
      assertEquals(parsed.company.cui, client.cui, 'CUI exportat și re-importat identic');
      assertEquals(parsed.employees.length, client.employees.length, 'Număr de angajați conservat');

      parsed.employees.forEach((emp) => {
        assert(emp.isValid, `Angajatul ${emp.lastName} ${emp.firstName} trebuie să fie 100% valid la re-import`);
        assertEquals(emp.errors.length, 0, 'Fără erori de validare la re-import');
      });

      const diff = await compareWithDatabase(client.id, parsed);
      assertEquals(diff.summary.unchangedCount, client.employees.length, '100% UNCHANGED la re-import direct');
      assertEquals(diff.summary.modifiedCount, 0, '0 rânduri modificate');
      assertEquals(diff.summary.errorCount, 0, '0 erori la re-import');
      assertEquals(diff.summary.newCount, 0, '0 rânduri noi neașteptate');
    }
  });

  // ---------------------------------------------------------------------------
  // Centralizator Rezultate
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('                          REZULTATE VERIFICARE FINALĂ                           ');
  console.log('================================================================================');
  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status.padEnd(8)} | ${r.durationMs.toFixed(1).padStart(7)}ms | ${r.testName}`);
    if (!r.passed) {
      console.log(`         Eroare: ${r.details}`);
      allPassed = false;
    }
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(`Total teste: ${results.length} | Trecute: ${results.filter((r) => r.passed).length} | Eșuate: ${results.filter((r) => !r.passed).length}`);
  console.log('================================================================================');

  if (!allPassed) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
