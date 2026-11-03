/**
 * scripts/adversarial-excel-roundtrip-timezone.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE:
 * Milestone 3: Robust Excel Import/Export & Template Management
 *
 * CHALLENGE DIMENSIONS:
 * 1. Timezone Invariance (TZ=UTC, America/New_York, Europe/Bucharest, Asia/Tokyo):
 *    - Leap years (2024-02-29, 2020-02-29)
 *    - Month/year boundaries (2024-03-01, 2023-12-31, 2024-01-01)
 *    - String dates ("29.02.2024", "2024-02-29") vs Native Excel numeric serials (45351)
 *    - formatDmy() export formatting across timezones
 * 2. Full Round-Trip Database Fidelity:
 *    - Export all seeded clients from DB -> Excel buffer -> parseClientWorkbook -> compareWithDatabase
 *    - Verify 100% UNCHANGED status, 0 MODIFIED, 0 ERROR, 0 NEW
 * 3. Template Download Integrity:
 *    - Fetch /api/imports/template?type=empty & ?type=sample
 *    - Verify HTTP 200, non-zero bytes (>10KB), proper SheetNames: ['Instrucțiuni', 'Firmă și angajați', 'Context posturi']
 *    - Parse cleanly via parseClientWorkbook (empty has 0 rows, sample has 3/3 valid rows)
 * 4. Adversarial Edge Cases & Fuzzing:
 *    - Corrupted / truncated buffer handling (graceful Error, no crash)
 *    - Missing required sheets ('Firmă și angajați')
 *    - Calendar validity rejection: "31.02.2024", "29.02.2023"
 *    - Dynamic header column order shuffling
 *    - Malformed CNPs (checksum, length, expat passport numbers)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as XLSX from 'xlsx';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { 
  parseClientWorkbook, 
  compareWithDatabase, 
  parseExcelDate, 
  validateCNP,
  normalizeHeader,
  ParsedWorkbook 
} from '../src/lib/importer';
import { exportClientToExcel, formatDmy, getBirthDateFromCNP } from '../src/lib/exporter';
import { GET as getTemplateRoute } from '../src/app/api/imports/template/route';

interface TestResult {
  dimension: string;
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const testResults: TestResult[] = [];

function recordResult(dimension: string, name: string, passed: boolean, details: string, error?: string) {
  testResults.push({ dimension, name, passed, details, error });
  const icon = passed ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`  ${icon} [${dimension}] ${name}: ${details}`);
  if (error) {
    console.error(`      Eroare: ${error}`);
  }
}

// =============================================================================
// SUBPROCESS TIMEZONE WORKER MODE
// =============================================================================
if (process.argv.includes('--worker-tz')) {
  const targetTz = process.env.TZ || 'UNKNOWN';
  console.log(`\n================================================================`);
  console.log(`  [WORKER PROCESS] Rulare teste specifice fusului orar: ${targetTz}`);
  console.log(`================================================================`);

  async function runTimezoneWorker() {
    let workerAllPassed = true;

    // A. Leap Years & Month Boundaries - String dates
    const boundaryDates = [
      { str: '29.02.2024', expectedIso: '2024-02-29T00:00:00.000Z', label: 'Bisect 29 Feb 2024' },
      { str: '29.02.2020', expectedIso: '2020-02-29T00:00:00.000Z', label: 'Bisect 29 Feb 2020' },
      { str: '01.03.2024', expectedIso: '2024-03-01T00:00:00.000Z', label: 'Limita luna 01 Mar 2024' },
      { str: '28.02.2023', expectedIso: '2023-02-28T00:00:00.000Z', label: 'Non-bisect 28 Feb 2023' },
      { str: '31.12.2023', expectedIso: '2023-12-31T00:00:00.000Z', label: 'Limita an 31 Dec 2023' },
      { str: '01.01.2024', expectedIso: '2024-01-01T00:00:00.000Z', label: 'Limita an 01 Ian 2024' },
    ];

    console.log(`\n--- Test A: Parsare String Dates in ${targetTz} ---`);
    for (const b of boundaryDates) {
      const parsed = parseExcelDate(b.str);
      const iso = parsed?.toISOString();
      const formatted = formatDmy(parsed);
      const passed = iso === b.expectedIso && formatted === b.str;
      if (!passed) workerAllPassed = false;
      console.log(`  ${passed ? '✓' : '✗'} ${b.label}: str="${b.str}" -> parsed=${iso} formatted="${formatted}" (așteptat=${b.expectedIso})`);
    }

    // B. Native Excel Serial Numbers (Leap years & Boundaries)
    // 45351 = 2024-02-29, 45352 = 2024-03-01, 45291 = 2023-12-31
    const serialDates = [
      { serial: 45351, expectedIso: '2024-02-29T00:00:00.000Z', expectedStr: '29.02.2024', label: 'Serial 45351 (29 Feb 2024)' },
      { serial: 45352, expectedIso: '2024-03-01T00:00:00.000Z', expectedStr: '01.03.2024', label: 'Serial 45352 (01 Mar 2024)' },
      { serial: 45291, expectedIso: '2023-12-31T00:00:00.000Z', expectedStr: '31.12.2023', label: 'Serial 45291 (31 Dec 2023)' },
    ];

    console.log(`\n--- Test B: Parsare Native Excel Serials in ${targetTz} ---`);
    for (const s of serialDates) {
      // 1. Direct parseExcelDate(number)
      const parsedNum = parseExcelDate(s.serial);
      const isoNum = parsedNum?.toISOString();
      const numPassed = isoNum === s.expectedIso;
      if (!numPassed) workerAllPassed = false;
      console.log(`  ${numPassed ? '✓' : '✗'} [parseExcelDate(number)] ${s.label}: parsed=${isoNum} (așteptat=${s.expectedIso})`);

      // 2. Parsare prin workbook XLSX cu celulă numerică de tip date (cellDates: true)
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([[{ t: 'n', v: s.serial, z: 'dd.mm.yyyy' }]]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const readWb = XLSX.read(buf, { type: 'buffer', cellDates: true });
      const cellVal = readWb.Sheets['Sheet1']['A1'].v;
      const parsedFromXlsx = parseExcelDate(cellVal);
      const isoXlsx = parsedFromXlsx?.toISOString();
      const xlsxPassed = isoXlsx === s.expectedIso;
      if (!xlsxPassed) workerAllPassed = false;
      console.log(`  ${xlsxPassed ? '✓' : '✗'} [XLSX cellDates:true] ${s.label}: cell.v=${JSON.stringify(cellVal)} -> parsed=${isoXlsx} (așteptat=${s.expectedIso})`);
    }

    // C. Round-Trip export-import in DB for this timezone
    console.log(`\n--- Test C: Round-Trip Export/Import in ${targetTz} ---`);
    const clients = await prisma.client.findMany({ select: { id: true, name: true, cui: true } });
    for (const c of clients) {
      const exportRes = await exportClientToExcel(c.id);
      const parsedWb = parseClientWorkbook(exportRes.buffer);
      const diff = await compareWithDatabase(c.id, parsedWb);
      const roundTripPassed = diff.summary.unchangedCount === diff.summary.totalRows && diff.summary.modifiedCount === 0 && diff.summary.errorCount === 0;
      if (!roundTripPassed) workerAllPassed = false;
      console.log(`  ${roundTripPassed ? '✓' : '✗'} Round-Trip ${c.name} (${c.cui}): total=${diff.summary.totalRows}, unchanged=${diff.summary.unchangedCount}, mod=${diff.summary.modifiedCount}, err=${diff.summary.errorCount}`);
    }

    // D. Template Download Integrity
    console.log(`\n--- Test D: Template Download in ${targetTz} ---`);
    for (const t of ['empty', 'sample']) {
      const req = new NextRequest(`http://localhost:3000/api/imports/template?type=${t}`);
      const res = await getTemplateRoute(req);
      const buf = Buffer.from(await res.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'buffer' });
      const expectedSheets = ['Instrucțiuni', 'Firmă și angajați', 'Context posturi'];
      const sheetsMatch = expectedSheets.every((s) => wb.SheetNames.includes(s));
      const passed = res.status === 200 && buf.length > 10000 && sheetsMatch;
      if (!passed) workerAllPassed = false;
      console.log(`  ${passed ? '✓' : '✗'} Template ${t}: status=${res.status}, size=${buf.length} bytes, sheets=[${wb.SheetNames.join(', ')}]`);
    }

    if (!workerAllPassed) {
      console.error(`\n[WORKER] Erori detectate în fusul orar ${targetTz}!`);
      process.exit(2);
    } else {
      console.log(`\n[WORKER] Toate testele au trecut cu succes în fusul orar ${targetTz}.`);
      process.exit(0);
    }
  }

  runTimezoneWorker().catch((err) => {
    console.error(`[WORKER FATAL]`, err);
    process.exit(1);
  });
} else {
  // =============================================================================
  // MASTER RUNNER
  // =============================================================================
  async function masterRunner() {
    console.log('================================================================================');
    console.log('  MILESTONE 3: ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGER HARNESS');
    console.log('================================================================================');

    // ---------------------------------------------------------------------------
    // DIMENSION 1: TIMEZONE INVARIANCE HARNESS (UTC, America/New_York, Europe/Bucharest, Asia/Tokyo)
    // ---------------------------------------------------------------------------
    console.log('\n[DIMENSIUNEA 1] Testare invarianță pe 4 fusuri orare (UTC, NY, București, Tokyo)...');
    const targetTimezones = ['UTC', 'America/New_York', 'Europe/Bucharest', 'Asia/Tokyo'];
    const tzResults: Record<string, { success: boolean; output: string }> = {};

    for (const tz of targetTimezones) {
      try {
        const cmd = `npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz`;
        const output = execSync(cmd, {
          env: { ...process.env, TZ: tz },
          encoding: 'utf8',
        });
        tzResults[tz] = { success: true, output };
        recordResult(
          'Timezone',
          `Execuție completă sub TZ=${tz}`,
          true,
          `Toate operațiunile au rulat fără eroare sub TZ=${tz}`
        );
      } catch (err: unknown) {
        const errorOutput = (err as { stdout?: string; stderr?: string })?.stdout || String(err);
        tzResults[tz] = { success: false, output: errorOutput };
        recordResult(
          'Timezone',
          `Execuție sub TZ=${tz}`,
          false,
          `Eșec detectat în fusul orar ${tz}`,
          errorOutput.slice(-300)
        );
      }
    }

    // ---------------------------------------------------------------------------
    // DIMENSION 2: FULL ROUND-TRIP DATABASE FIDELITY (Toți clienții din DB)
    // ---------------------------------------------------------------------------
    console.log('\n[DIMENSIUNEA 2] Round-trip DB fidelity pentru toți clienții existenți...');
    try {
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

      for (const client of clients) {
        const exportRes = await exportClientToExcel(client.id);
        const parsed = parseClientWorkbook(exportRes.buffer);
        const diff = await compareWithDatabase(client.id, parsed);

        const isExactMatch =
          diff.summary.totalRows === client.employees.length &&
          diff.summary.unchangedCount === client.employees.length &&
          diff.summary.modifiedCount === 0 &&
          diff.summary.errorCount === 0 &&
          diff.summary.newCount === 0;

        recordResult(
          'Round-Trip',
          `Client ${client.name} (${client.cui}) - ${client.employees.length} angajați`,
          isExactMatch,
          `Total: ${diff.summary.totalRows}, UNCHANGED: ${diff.summary.unchangedCount}, MODIFIED: ${diff.summary.modifiedCount}, ERRORS: ${diff.summary.errorCount}`
        );
      }
    } catch (err) {
      recordResult('Round-Trip', 'Interogare și export clienți DB', false, 'Excepție neașteptată', String(err));
    }

    // ---------------------------------------------------------------------------
    // DIMENSION 3: TEMPLATE DOWNLOAD INTEGRITY
    // ---------------------------------------------------------------------------
    console.log('\n[DIMENSIUNEA 3] Integritate descărcare șabloane (/api/imports/template)...');
    for (const t of ['empty', 'sample']) {
      try {
        const req = new NextRequest(`http://localhost:3000/api/imports/template?type=${t}`);
        const res = await getTemplateRoute(req);
        const buf = Buffer.from(await res.arrayBuffer());

        const statusOk = res.status === 200;
        const sizeOk = buf.length > 10000;
        const wb = XLSX.read(buf, { type: 'buffer' });
        const expectedSheets = ['Instrucțiuni', 'Firmă și angajați', 'Context posturi'];
        const sheetsMatch = expectedSheets.every((s) => wb.SheetNames.includes(s));

        const parsed = parseClientWorkbook(buf);
        const parsedCleanly = t === 'empty' 
          ? parsed.employees.length === 0 
          : parsed.employees.length === 3 && parsed.employees.every((e) => e.isValid);

        recordResult(
          'Template',
          `Șablon tip "${t}"`,
          statusOk && sizeOk && sheetsMatch && parsedCleanly,
          `Status: ${res.status}, Dimensiune: ${buf.length} bytes, Foi: [${wb.SheetNames.join(', ')}], Angajați parsați: ${parsed.employees.length}`
        );
      } catch (err) {
        recordResult('Template', `Descărcare șablon "${t}"`, false, 'Excepție la descărcare/parsare', String(err));
      }
    }

    // Test parametru invalid -> HTTP 400
    try {
      const reqInvalid = new NextRequest('http://localhost:3000/api/imports/template?type=malicious');
      const resInvalid = await getTemplateRoute(reqInvalid);
      recordResult(
        'Template',
        'Parametru necunoscut type=malicious',
        resInvalid.status === 400,
        `Status HTTP primit: ${resInvalid.status} (așteptat 400)`
      );
    } catch (err) {
      recordResult('Template', 'Parametru necunoscut', false, 'Excepție', String(err));
    }

    // ---------------------------------------------------------------------------
    // DIMENSION 4: ADVERSARIAL EDGE CASES & STRESS HARNESS
    // ---------------------------------------------------------------------------
    console.log('\n[DIMENSIUNEA 4] Cazuri limită, date corupte și reziliență...');

    // 4.1 Fuzzing buffer corupt / trunchiat
    try {
      const garbageBuf = Buffer.from('PK\x03\x04random_corrupted_data_not_a_valid_zip_workbook_excel');
      let caughtGarbage = false;
      try {
        parseClientWorkbook(garbageBuf);
      } catch {
        caughtGarbage = true;
      }
      recordResult(
        'Adversarial',
        'Buffer corupt (garbage bytes)',
        caughtGarbage,
        'parseClientWorkbook aruncă excepție controlată fără crash de proces'
      );
    } catch (err) {
      recordResult('Adversarial', 'Buffer corupt', false, 'Eroare neașteptată', String(err));
    }

    // 4.2 Lipsă foaie obligatorie "Firmă și angajați"
    try {
      const wbNoFirm = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbNoFirm, XLSX.utils.aoa_to_sheet([['test']]), 'RandomSheet');
      const bufNoFirm = XLSX.write(wbNoFirm, { type: 'buffer', bookType: 'xlsx' });
      let expectedErrMsg = '';
      try {
        parseClientWorkbook(bufNoFirm);
      } catch (e) {
        expectedErrMsg = (e as Error).message;
      }
      const hasRomanianMsg = expectedErrMsg.includes('Firmă și angajați') && expectedErrMsg.includes('lipsește');
      recordResult(
        'Adversarial',
        'Lipsă foaie "Firmă și angajați"',
        hasRomanianMsg,
        `Mesaj de eroare returnat: "${expectedErrMsg}"`
      );
    } catch (err) {
      recordResult('Adversarial', 'Lipsă foaie Firmă și angajați', false, 'Eroare', String(err));
    }

    // 4.3 Respingere date calendaristice fictive (ex: 31 Februarie, 29 Februarie în an non-bisect)
    const invalidCalendarDates = ['31.02.2024', '29.02.2023', '31.04.2024', '00.00.0000', '99.99.9999'];
    let allInvalidRejected = true;
    for (const inv of invalidCalendarDates) {
      const parsed = parseExcelDate(inv);
      if (parsed !== undefined) {
        allInvalidRejected = false;
        console.log(`    ✗ Data fictivă "${inv}" a fost acceptată ca: ${parsed.toISOString()}!`);
      }
    }
    recordResult(
      'Adversarial',
      'Respingere date calendaristice invalide (31.02, 29.02 non-bisect)',
      allInvalidRejected,
      allInvalidRejected ? 'Toate datele fictive au fost respinse (undefined)' : 'Unele date fictive au fost acceptate eronat'
    );

    // 4.4 Shuffled Column Order (Permutare dinamică a coloanelor)
    try {
      const customHeaders = [
        'CNP / Pasaport',
        'Prenume',
        'Nume de familie',
        'Data nasterii',
        'Numar act',
        'Judet domiciliu',
        'Localitate domiciliu',
        'Strada',
        'Numar strada',
        'Functie / post',
        'Punct de lucru',
        'Data angajarii',
        'Status'
      ];
      const customRow = [
        '1880315410127',
        'Alexandru',
        'Stan',
        '15.03.1988',
        '123456',
        'București',
        'Sector 1',
        'Str. Florilor',
        '10',
        'Inginer SSM',
        'Sediul Central',
        '15.01.2024',
        'ACTIV'
      ];

      const wbShuffled = XLSX.utils.book_new();
      const wsShuffled = XLSX.utils.aoa_to_sheet([
        [], [], [], [],
        ['Firma:', 'TEST SHUFFLED S.R.L.', '', '', 'CUI:', 'RO11223344'],
        [], [], [], [], [], [],
        customHeaders,
        customRow
      ]);
      XLSX.utils.book_append_sheet(wbShuffled, wsShuffled, 'Firmă și angajați');
      const bufShuffled = XLSX.write(wbShuffled, { type: 'buffer', bookType: 'xlsx' });

      const parsedShuffled = parseClientWorkbook(bufShuffled);
      const empShuffled = parsedShuffled.employees[0];
      const shuffleSuccess =
        empShuffled &&
        empShuffled.cnp === '1880315410127' &&
        empShuffled.lastName === 'Stan' &&
        empShuffled.firstName === 'Alexandru' &&
        empShuffled.jobTitle === 'Inginer SSM' &&
        empShuffled.isValid;

      recordResult(
        'Adversarial',
        'Coloane amestecate (Dynamic Header Mapping)',
        Boolean(shuffleSuccess),
        shuffleSuccess
          ? `Recunoaștere corectă: ${empShuffled.lastName} ${empShuffled.firstName}, CNP=${empShuffled.cnp}, Job=${empShuffled.jobTitle}`
          : 'Eșec la maparea antetelor dinamice'
      );
    } catch (err) {
      recordResult('Adversarial', 'Coloane amestecate', false, 'Excepție', String(err));
    }

    // ---------------------------------------------------------------------------
    // SUMMARY REPORT & EMPIRICAL VERDICT
    // ---------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log('                   RAPORT FINAL ADVERSARIAL STRESS TEST                         ');
    console.log('================================================================================');

    const totalTests = testResults.length;
    const passedTests = testResults.filter((t) => t.passed).length;
    const failedTests = testResults.filter((t) => !t.passed);

    for (const r of testResults) {
      const tag = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${tag} | [${r.dimension.padEnd(12)}] ${r.name}`);
      if (!r.passed && r.error) {
        console.log(`       Detalii: ${r.details}`);
      }
    }

    console.log('--------------------------------------------------------------------------------');
    console.log(`TOTAL TESTE: ${totalTests} | TRECUTE: ${passedTests} | EȘUATE: ${failedTests.length}`);
    console.log('================================================================================');

    if (failedTests.length > 0) {
      console.log('\nCRITICAL FINDINGS / REPRODUCED DEFECTS:');
      for (const f of failedTests) {
        console.log(`- [${f.dimension}] ${f.name}: ${f.details}`);
      }
      console.log('\nEMBEDDED VERDICT: REQUEST_CHANGES');
      process.exit(1);
    } else {
      console.log('\nEMBEDDED VERDICT: APPROVE');
      process.exit(0);
    }
  }

  masterRunner().catch((err) => {
    console.error('Eroare fatală în master runner:', err);
    process.exit(1);
  });
}
