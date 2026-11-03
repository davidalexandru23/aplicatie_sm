/**
 * scripts/adversarial-seed-roundtrip-stress.ts
 *
 * Empirical Adversarial Challenger Test Suite:
 * Round-Trip Export/Import, Database Seed Integrity, and Parser/Diff Robustness
 *
 * Suites:
 * 1. Database Seed Integrity & Multi-Client Full Round-Trip (Nexus & Bistro)
 * 2. Adversarial Stress — Romanian Diacritics Invariance & Character Encoding
 * 3. Adversarial Stress — Date Format Conversions (Serial vs String vs ISO) & Boundaries
 * 4. Adversarial Stress — Trailing & Leading Whitespace Handling (Zero False Positives)
 * 5. Adversarial Stress — compareWithDatabase Sensitivity, Discrimination & Error Isolation
 */

import { performance } from 'perf_hooks';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { exportClientToExcel } from '../src/lib/exporter';
import {
  parseClientWorkbook,
  compareWithDatabase,
  validateCNP,
  ParsedWorkbook,
} from '../src/lib/importer';

type ClientWithRelations = Prisma.ClientGetPayload<{
  include: {
    employees: {
      include: {
        identityDocument: true;
        residenceAddress: true;
        currentJob: true;
        currentWorksite: true;
      };
    };
    jobs: true;
    worksites: true;
  };
}>;

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  assertions: number;
  error?: string;
}

const testResults: TestResult[] = [];
let totalAssertions = 0;
let allClients: ClientWithRelations[] = [];

function assert(condition: boolean, message: string): void {
  totalAssertions++;
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  totalAssertions++;
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected: ${String(expected)}, Got: ${String(actual)})`);
  }
}

function assertDeepEquals<T>(actual: T, expected: T, message: string): void {
  totalAssertions++;
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Assertion failed: ${message} (Expected: ${expectedJson}, Got: ${actualJson})`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  const start = performance.now();
  const assertionsBefore = totalAssertions;
  try {
    await fn();
    const duration = performance.now() - start;
    const count = totalAssertions - assertionsBefore;
    testResults.push({ name, passed: true, durationMs: duration, assertions: count });
    console.log(`  ✓ [PASS] ${name} (${count} assertions, ${duration.toFixed(2)}ms)`);
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const count = totalAssertions - assertionsBefore;
    const msg = err instanceof Error ? err.message : String(err);
    testResults.push({ name, passed: false, durationMs: duration, assertions: count, error: msg });
    console.error(`  ✗ [FAIL] ${name} (${count} assertions, ${duration.toFixed(2)}ms): ${msg}`);
  }
}

/**
 * Generează un CNP românesc valid matematic conform cifrei de control oficiale
 */
function generateValidCNP(base12: string): string {
  if (base12.length !== 12 || !/^\d{12}$/.test(base12)) {
    throw new Error('Baza CNP trebuie să conțină exact 12 cifre');
  }
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base12[i], 10) * weights[i];
  }
  const rem = sum % 11;
  const control = rem === 10 ? 1 : rem;
  return `${base12}${control}`;
}

async function main() {
  console.log('========================================================================');
  console.log('ADVERSARIAL STRESS TEST: EXPORT/IMPORT ROUND-TRIP & SEED INTEGRITY');
  console.log('========================================================================\n');

  const suiteStart = performance.now();

  // =========================================================================
  // SUITE 1: DATABASE SEED INTEGRITY & MULTI-CLIENT ROUND-TRIP
  // =========================================================================
  console.log('--- SUITE 1: Database Seed Integrity & Multi-Client Round-Trip ---');

  await runTest('1.1 Query All Seeded Clients and Relations', async () => {
    allClients = await prisma.client.findMany({
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
      orderBy: { name: 'asc' },
    });

    assert(allClients.length >= 2, `Seeded clients must be >= 2, found ${allClients.length}`);
    const clientNames = allClients.map((c) => c.name);
    assert(clientNames.some((n) => n.includes('NEXUS')), 'NEXUS SOLUTIONS must be present');
    assert(clientNames.some((n) => n.includes('BISTRO')), 'BISTRO GOURMET must be present');
  });

  await runTest('1.2 Statutory Completeness: Identity & Residence for All Active Employees', () => {
    let totalActiveEmployees = 0;

    for (const client of allClients) {
      assert(!!client.cui, `Client ${client.name} missing CUI`);
      assert(!!client.caenCode, `Client ${client.name} missing CAEN code`);
      assert(!!client.legalRepresentative, `Client ${client.name} missing legalRepresentative`);

      const activeEmployees = client.employees.filter((e) => e.status === 'ACTIV');
      assert(activeEmployees.length > 0, `Client ${client.name} has no active employees`);

      for (const emp of activeEmployees) {
        totalActiveEmployees++;
        const empLabel = `${emp.lastName} ${emp.firstName} (${client.name})`;

        // CNP check
        assert(!!emp.cnp, `${empLabel} missing CNP`);
        assert(validateCNP(emp.cnp), `${empLabel} has invalid CNP checksum: ${emp.cnp}`);

        // Identity Document check
        assert(emp.identityDocument !== null, `${empLabel} is missing IdentityDocument relation`);
        assert(!!emp.identityDocument?.number, `${empLabel} missing IdentityDocument.number`);
        assert(!!emp.identityDocument?.docType, `${empLabel} missing IdentityDocument.docType`);

        // Residence Address check
        assert(emp.residenceAddress !== null, `${empLabel} is missing ResidenceAddress relation`);
        assert(!!emp.residenceAddress?.county, `${empLabel} missing ResidenceAddress.county`);
        assert(!!emp.residenceAddress?.locality, `${empLabel} missing ResidenceAddress.locality`);
        assert(!!emp.residenceAddress?.street, `${empLabel} missing ResidenceAddress.street`);
        assert(!!emp.residenceAddress?.number, `${empLabel} missing ResidenceAddress.number`);

        // Job and Worksite check
        assert(emp.currentJob !== null, `${empLabel} missing currentJob relation`);
        assert(!!emp.currentJob?.title, `${empLabel} missing currentJob.title`);
        assert(emp.currentWorksite !== null, `${empLabel} missing currentWorksite relation`);
        assert(!!emp.currentWorksite?.name, `${empLabel} missing currentWorksite.name`);
      }
    }

    assert(totalActiveEmployees >= 6, `Total active employees must be >= 6, got ${totalActiveEmployees}`);
  });

  await runTest('1.3 NEXUS SOLUTIONS: Export -> Direct Parse -> compareWithDatabase', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    assert(!!nexus, 'Nexus Solutions client not found');

    const exportRes = await exportClientToExcel(nexus.id);
    assert(exportRes.buffer.length > 5000, `Export buffer too small: ${exportRes.buffer.length} bytes`);
    assert(exportRes.filename.endsWith('.xlsx'), `Filename must end in .xlsx: ${exportRes.filename}`);

    const parsed = parseClientWorkbook(exportRes.buffer);
    assertEquals(parsed.company.cui, nexus.cui, 'Company CUI mismatch');
    assertEquals(parsed.company.name, nexus.name, 'Company Name mismatch');
    assertEquals(parsed.employees.length, nexus.employees.length, 'Employees count mismatch');

    for (const emp of parsed.employees) {
      assert(emp.isValid, `Employee ${emp.lastName} ${emp.firstName} invalid: ${emp.errors.join(', ')}`);
      assertEquals(emp.errors.length, 0, `Employee ${emp.lastName} has errors`);
    }

    const diff = await compareWithDatabase(nexus.id, parsed);
    assertEquals(diff.summary.totalRows, nexus.employees.length, 'Total rows mismatch');
    assertEquals(diff.summary.unchangedCount, nexus.employees.length, 'All rows must be UNCHANGED');
    assertEquals(diff.summary.modifiedCount, 0, 'Modified count must be 0 (no false positives)');
    assertEquals(diff.summary.newCount, 0, 'New count must be 0');
    assertEquals(diff.summary.errorCount, 0, 'Error count must be 0');
    assertEquals(diff.summary.ambiguousCount, 0, 'Ambiguous count must be 0');
  });

  await runTest('1.4 BISTRO GOURMET: Export -> Direct Parse -> compareWithDatabase', async () => {
    const bistro = allClients.find((c) => c.cui === 'RO45123987')!;
    assert(!!bistro, 'Bistro Gourmet client not found');

    const exportRes = await exportClientToExcel(bistro.id);
    assert(exportRes.buffer.length > 5000, `Export buffer too small: ${exportRes.buffer.length} bytes`);
    assert(exportRes.filename.endsWith('.xlsx'), `Filename must end in .xlsx: ${exportRes.filename}`);

    const parsed = parseClientWorkbook(exportRes.buffer);
    assertEquals(parsed.company.cui, bistro.cui, 'Company CUI mismatch');
    assertEquals(parsed.company.name, bistro.name, 'Company Name mismatch');
    assertEquals(parsed.employees.length, bistro.employees.length, 'Employees count mismatch');

    for (const emp of parsed.employees) {
      assert(emp.isValid, `Employee ${emp.lastName} ${emp.firstName} invalid: ${emp.errors.join(', ')}`);
      assertEquals(emp.errors.length, 0, `Employee ${emp.lastName} has errors`);
      assert(validateCNP(emp.cnp), `Employee CNP invalid: ${emp.cnp}`);
    }

    const diff = await compareWithDatabase(bistro.id, parsed);
    assertEquals(diff.summary.totalRows, bistro.employees.length, 'Total rows mismatch');
    assertEquals(diff.summary.unchangedCount, bistro.employees.length, 'All rows must be UNCHANGED');
    assertEquals(diff.summary.modifiedCount, 0, 'Modified count must be 0 (no false positives)');
    assertEquals(diff.summary.newCount, 0, 'New count must be 0');
    assertEquals(diff.summary.errorCount, 0, 'Error count must be 0');
    assertEquals(diff.summary.ambiguousCount, 0, 'Ambiguous count must be 0');
  });

  // =========================================================================
  // SUITE 2: ADVERSARIAL STRESS — ROMANIAN DIACRITICS INVARIANCE
  // =========================================================================
  console.log('\n--- SUITE 2: Romanian Diacritics Invariance & Character Encoding ---');

  await runTest('2.1 Extreme Romanian Diacritics Injection and Exact Retention', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Inserăm diacritice complexe românești (standard comma-below și căciulă/circumflex)
    const diacriticLastName = 'Păpădie-Țârlea';
    const diacriticFirstName = 'Ștefăniță-Împăratul';
    const diacriticStreet = 'Șoseaua Înfrățirii Românilor';
    const diacriticStreetNumber = 'Ț-42/Â';
    const diacriticLocality = 'Târgu Cărbunești';
    const diacriticCounty = 'Dâmbovița';
    const diacriticJobTitle = 'Lăcătuș Șef Mecanic & Îngrijitor Spații Verzi';

    // Rândul 13 (index r = 12 în Excel)
    sFirm['A13'] = { t: 's', v: diacriticLastName };
    sFirm['B13'] = { t: 's', v: diacriticFirstName };
    sFirm['O13'] = { t: 's', v: diacriticCounty };
    sFirm['P13'] = { t: 's', v: diacriticLocality };
    sFirm['Q13'] = { t: 's', v: diacriticStreet };
    sFirm['R13'] = { t: 's', v: diacriticStreetNumber };
    sFirm['Y13'] = { t: 's', v: diacriticJobTitle };

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    const targetEmp = parsed.employees[0];
    assertEquals(targetEmp.lastName, diacriticLastName, 'Diacritic last name retention');
    assertEquals(targetEmp.firstName, diacriticFirstName, 'Diacritic first name retention');
    assertEquals(targetEmp.county, diacriticCounty, 'Diacritic county retention');
    assertEquals(targetEmp.locality, diacriticLocality, 'Diacritic locality retention');
    assertEquals(targetEmp.street, diacriticStreet, 'Diacritic street retention');
    assertEquals(targetEmp.streetNumber, diacriticStreetNumber, 'Diacritic street number retention');
    assertEquals(targetEmp.jobTitle, diacriticJobTitle, 'Diacritic job title retention');
    assert(targetEmp.isValid, `Diacritic row must be valid: ${targetEmp.errors.join(', ')}`);

    // Verificăm detecția în compareWithDatabase
    const diff = await compareWithDatabase(nexus.id, parsed);
    assertEquals(diff.summary.modifiedCount, 1, 'Exactly 1 modified row expected');
    const modItem = diff.items.find((i) => i.status === 'MODIFIED')!;
    assert(!!modItem, 'Modified item must exist');

    const fieldNames = modItem.changes.map((c) => c.field);
    assert(fieldNames.includes('Nume'), 'Should report Nume changed');
    assert(fieldNames.includes('Prenume'), 'Should report Prenume changed');
    assert(fieldNames.includes('Funcție / post'), 'Should report Funcție changed');
    assert(fieldNames.includes('Adresă domiciliu'), 'Should report Adresă changed');

    const numeChange = modItem.changes.find((c) => c.field === 'Nume')!;
    assertEquals(numeChange.newVal, diacriticLastName, 'NewVal must preserve exact diacritics');
  });

  await runTest('2.2 Legacy Cedilla vs Comma-Below Distinguishability', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Barbu Gheorghe -> folosim cedilla veche (ş, ţ) în loc de virgulă (ș, ț)
    // În DB: "Stan Alexandru" (fără diacritice) -> testăm diferențiere exactă
    const cedillaName = 'Ştefan'; // U+015E (LATIN CAPITAL LETTER S WITH CEDILLA)
    sFirm['B13'] = { t: 's', v: cedillaName };

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);
    assertEquals(parsed.employees[0].firstName, cedillaName, 'Cedilla string preserved');

    const diff = await compareWithDatabase(nexus.id, parsed);
    assertEquals(diff.summary.modifiedCount, 1, 'Cedilla name variation correctly flagged as MODIFIED');
  });

  // =========================================================================
  // SUITE 3: ADVERSARIAL STRESS — DATE CONVERSIONS & BOUNDARIES
  // =========================================================================
  console.log('\n--- SUITE 3: Date Format Conversions & Boundaries ---');

  await runTest('3.1 Excel Serial Number Dates (Numeric Timestamps)', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Serial 32888 = 1990-01-15 (conform epoch 1899-12-30)
    // Serial 44197 = 2021-01-01
    // Serial 42005 = 2015-01-01
    // Serial 45657 = 2025-01-01
    sFirm['E13'] = { t: 'n', v: 32888 }; // birthDate (Col 4)
    sFirm['M13'] = { t: 'n', v: 42005 }; // docIssueDate (Col 12)
    sFirm['N13'] = { t: 'n', v: 45657 }; // docExpiryDate (Col 13)
    sFirm['AB13'] = { t: 'n', v: 44197 }; // hireDate (Col 27)

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    const emp = parsed.employees[0];
    assert(emp.birthDate instanceof Date, 'birthDate must be a Date instance');
    assert(emp.hireDate instanceof Date, 'hireDate must be a Date instance');
    assert(emp.docIssueDate instanceof Date, 'docIssueDate must be a Date instance');
    assert(emp.docExpiryDate instanceof Date, 'docExpiryDate must be a Date instance');

    assertEquals(emp.birthDate!.getUTCFullYear(), 1990, 'birthDate year');
    assertEquals(emp.birthDate!.getUTCMonth(), 0, 'birthDate month (Jan)');
    assertEquals(emp.birthDate!.getUTCDate(), 15, 'birthDate day');

    assertEquals(emp.hireDate!.getUTCFullYear(), 2021, 'hireDate year');
    assertEquals(emp.hireDate!.getUTCMonth(), 0, 'hireDate month (Jan)');
    assertEquals(emp.hireDate!.getUTCDate(), 1, 'hireDate day');

    assert(emp.isValid, `Row with numeric serial dates must be valid: ${emp.errors.join(', ')}`);
  });

  await runTest('3.2 Heterogeneous String Date Formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    sFirm['E13'] = { t: 's', v: '25/08/1988' }; // slash format
    sFirm['AB13'] = { t: 's', v: '10-06-2020' }; // dash format
    sFirm['E14'] = { t: 's', v: '1995-12-31' }; // ISO format
    sFirm['AB14'] = { t: 's', v: '2022-03-15' }; // ISO format

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    const emp1 = parsed.employees[0];
    assert(emp1.birthDate instanceof Date, 'emp1 birthDate parsed');
    assertEquals(emp1.birthDate!.getFullYear(), 1988, 'emp1 birth year');
    assertEquals(emp1.birthDate!.getMonth(), 7, 'emp1 birth month (Aug)');
    assertEquals(emp1.birthDate!.getDate(), 25, 'emp1 birth day');
    assert(emp1.isValid, 'emp1 must be valid');

    const emp2 = parsed.employees[1];
    assert(emp2.birthDate instanceof Date, 'emp2 birthDate parsed');
    assertEquals(emp2.birthDate!.getFullYear(), 1995, 'emp2 birth year');
    assertEquals(emp2.birthDate!.getMonth(), 11, 'emp2 birth month (Dec)');
    assertEquals(emp2.birthDate!.getDate(), 31, 'emp2 birth day');
    assert(emp2.isValid, 'emp2 must be valid');
  });

  await runTest('3.3 Leap Day Handling (29.02.2024)', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    sFirm['AB13'] = { t: 's', v: '29.02.2024' }; // leap day hire date

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);
    const emp = parsed.employees[0];

    assert(emp.hireDate instanceof Date, 'Leap day parsed as Date');
    assertEquals(emp.hireDate!.getFullYear(), 2024, 'Leap year');
    assertEquals(emp.hireDate!.getMonth(), 1, 'February');
    assertEquals(emp.hireDate!.getDate(), 29, 'Day 29');
    assert(emp.isValid, 'Leap day row must be valid');
  });

  await runTest('3.4 Malformed Date Rejection and Error Reporting', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    sFirm['E13'] = { t: 's', v: 'data_invalida' }; // bad birthDate
    sFirm['AB14'] = { t: 's', v: '' }; // missing hireDate
    sFirm['AC15'] = { t: 's', v: 'PLECAT' }; // status PLECAT without leaveDate
    sFirm['AD15'] = { t: 's', v: '' };

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    const emp1 = parsed.employees[0];
    assert(!emp1.isValid, 'emp1 must be invalid due to bad birthDate');
    assert(
      emp1.errors.some((e) => e.includes('Data nașterii')),
      'Must contain birthDate error message'
    );

    const emp2 = parsed.employees[1];
    assert(!emp2.isValid, 'emp2 must be invalid due to missing hireDate');
    assert(
      emp2.errors.some((e) => e.includes('Data angajării')),
      'Must contain hireDate error message'
    );

    const emp3 = parsed.employees[2];
    assert(!emp3.isValid, 'emp3 must be invalid due to PLECAT without leaveDate');
    assert(
      emp3.errors.some((e) => e.includes('data plecării')),
      'Must contain leaveDate error message'
    );

    const diff = await compareWithDatabase(nexus.id, parsed);
    assertEquals(diff.summary.errorCount, 3, 'Must report 3 ERROR rows');
  });

  // =========================================================================
  // SUITE 4: ADVERSARIAL STRESS — TRAILING & LEADING WHITESPACE
  // =========================================================================
  console.log('\n--- SUITE 4: Trailing & Leading Whitespace Handling ---');

  await runTest('4.1 Whitespace Sanitization and Zero False Positives', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);

    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Inserăm spații de jur împrejur în rândul 13
    const emp0 = nexus.employees[0];
    sFirm['A13'] = { t: 's', v: `   ${emp0.lastName}   ` };
    sFirm['B13'] = { t: 's', v: `\t${emp0.firstName}\t ` };
    sFirm['D13'] = { t: 's', v: `   ${emp0.cnp}   ` };
    sFirm['Q13'] = { t: 's', v: `   ${emp0.residenceAddress!.street}   ` };
    sFirm['R13'] = { t: 's', v: `  ${emp0.residenceAddress!.number}  ` };
    sFirm['Y13'] = { t: 's', v: `   ${emp0.currentJob!.title}   ` };
    sFirm['Z13'] = { t: 's', v: `   ${emp0.currentWorksite!.name}   ` };

    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(modifiedBuf);

    const parsedEmp = parsed.employees[0];
    assertEquals(parsedEmp.lastName, emp0.lastName, 'Trimmed last name');
    assertEquals(parsedEmp.firstName, emp0.firstName, 'Trimmed first name');
    assertEquals(parsedEmp.cnp, emp0.cnp, 'Trimmed CNP');
    assertEquals(parsedEmp.street, emp0.residenceAddress!.street, 'Trimmed street');
    assertEquals(parsedEmp.streetNumber, emp0.residenceAddress!.number, 'Trimmed streetNumber');
    assertEquals(parsedEmp.jobTitle, emp0.currentJob!.title, 'Trimmed jobTitle');
    assertEquals(parsedEmp.worksiteName, emp0.currentWorksite!.name, 'Trimmed worksiteName');

    const diff = await compareWithDatabase(nexus.id, parsed);
    assertEquals(diff.summary.unchangedCount, nexus.employees.length, 'Must remain 100% UNCHANGED');
    assertEquals(diff.summary.modifiedCount, 0, 'Zero false positives on whitespace variation');
    assertEquals(diff.summary.errorCount, 0, 'Zero errors');
  });

  // =========================================================================
  // SUITE 5: ADVERSARIAL STRESS — compareWithDatabase SENSITIVITY & ERROR ISOLATION
  // =========================================================================
  console.log('\n--- SUITE 5: compareWithDatabase Sensitivity, Discrimination & Error Isolation ---');

  await runTest('5.1 Fine-Grained Single-Field Modification Sensitivity (8 Fields)', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;

    const fieldTests = [
      { cell: 'A13', val: 'Barbu-Ionescu', expectedField: 'Nume', desc: 'Last Name modification' },
      { cell: 'B13', val: 'George', expectedField: 'Prenume', desc: 'First Name modification' },
      { cell: 'Y13', val: 'Arhitect Cloud', expectedField: 'Funcție / post', desc: 'Job Title modification' },
      { cell: 'Z13', val: 'Sediul Central', expectedField: 'Punct de lucru', desc: 'Worksite modification' },
      { cell: 'Q13', val: 'Str. Republicii Modificată', expectedField: 'Adresă domiciliu', desc: 'Street modification' },
      { cell: 'R13', val: '999B', expectedField: 'Adresă domiciliu', desc: 'Street Number modification' },
      { cell: 'K13', val: '888999', expectedField: 'Număr act identitate', desc: 'ID Number modification' },
    ];

    for (const ft of fieldTests) {
      const exportRes = await exportClientToExcel(nexus.id);
      const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
      const sFirm = wb.Sheets['Firmă și angajați'];

      sFirm[ft.cell] = { t: 's', v: ft.val };

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const parsed = parseClientWorkbook(buf);
      const diff = await compareWithDatabase(nexus.id, parsed);

      assertEquals(diff.summary.modifiedCount, 1, `Must detect single modification for ${ft.desc}`);
      assertEquals(diff.summary.unchangedCount, nexus.employees.length - 1, `Remaining must be UNCHANGED for ${ft.desc}`);
      const modItem = diff.items.find((i) => i.status === 'MODIFIED')!;
      assert(!!modItem, `Modified item exists for ${ft.desc}`);
      assert(
        modItem.changes.some((c) => c.field === ft.expectedField),
        `Must capture field ${ft.expectedField} in changes for ${ft.desc}`
      );
    }
  });

  await runTest('5.2 Status Modification with Leave Date', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);
    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    sFirm['AC13'] = { t: 's', v: 'PLECAT' };
    sFirm['AD13'] = { t: 's', v: '01.02.2026' };

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(buf);
    const diff = await compareWithDatabase(nexus.id, parsed);

    assertEquals(diff.summary.modifiedCount, 1, 'Status change detected');
    const modItem = diff.items.find((i) => i.status === 'MODIFIED')!;
    assert(
      modItem.changes.some((c) => c.field === 'Status' && c.newVal === 'PLECAT'),
      'Status change captured'
    );
  });

  await runTest('5.3 Multi-Field Simultaneous Mutation', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);
    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Mutăm concomitent: Nume, Funcție, Stradă, Act număr
    sFirm['A13'] = { t: 's', v: 'Popa' };
    sFirm['Y13'] = { t: 's', v: 'Manager Tehnic' };
    sFirm['Q13'] = { t: 's', v: 'Bd. Unirii' };
    sFirm['K13'] = { t: 's', v: '777111' };

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(buf);
    const diff = await compareWithDatabase(nexus.id, parsed);

    assertEquals(diff.summary.modifiedCount, 1, '1 employee modified');
    const modItem = diff.items.find((i) => i.status === 'MODIFIED')!;
    assertEquals(modItem.changes.length, 4, 'All 4 modified fields recorded');

    const fields = modItem.changes.map((c) => c.field);
    assert(fields.includes('Nume'), 'Nume captured');
    assert(fields.includes('Funcție / post'), 'Funcție captured');
    assert(fields.includes('Adresă domiciliu'), 'Adresă captured');
    assert(fields.includes('Număr act identitate'), 'Act identitate captured');
  });

  await runTest('5.4 Ingestion and Discrimination of Brand-New Employee Row (status: NEW)', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);
    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Adăugăm un angajat nou pe rândul 17 (după cei 4 existenți)
    const newCNP = generateValidCNP('195041212345');
    const r = 16; // 1-indexed rândul 17

    sFirm[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: 'Mocanu' };
    sFirm[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: 'Adrian' };
    sFirm[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 's', v: 'M' };
    sFirm[XLSX.utils.encode_cell({ r, c: 3 })] = { t: 's', v: newCNP };
    sFirm[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: '12.04.1995' };
    sFirm[XLSX.utils.encode_cell({ r, c: 8 })] = { t: 's', v: 'CI' };
    sFirm[XLSX.utils.encode_cell({ r, c: 9 })] = { t: 's', v: 'RK' };
    sFirm[XLSX.utils.encode_cell({ r, c: 10 })] = { t: 's', v: '334455' };
    sFirm[XLSX.utils.encode_cell({ r, c: 14 })] = { t: 's', v: 'București' };
    sFirm[XLSX.utils.encode_cell({ r, c: 15 })] = { t: 's', v: 'Sector 3' };
    sFirm[XLSX.utils.encode_cell({ r, c: 16 })] = { t: 's', v: 'Str. Dristorului' };
    sFirm[XLSX.utils.encode_cell({ r, c: 17 })] = { t: 's', v: '12' };
    sFirm[XLSX.utils.encode_cell({ r, c: 24 })] = { t: 's', v: 'Inginer DevOps' };
    sFirm[XLSX.utils.encode_cell({ r, c: 25 })] = { t: 's', v: 'Sediul Central' };
    sFirm[XLSX.utils.encode_cell({ r, c: 27 })] = { t: 's', v: '01.03.2026' };
    sFirm[XLSX.utils.encode_cell({ r, c: 28 })] = { t: 's', v: 'ACTIV' };

    // Actualizăm range
    sFirm['!ref'] = `A1:AH17`;

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(buf);
    assertEquals(parsed.employees.length, 5, '5 employees parsed');

    const diff = await compareWithDatabase(nexus.id, parsed);
    assertEquals(diff.summary.totalRows, 5, 'Total rows = 5');
    assertEquals(diff.summary.unchangedCount, 4, '4 unchanged');
    assertEquals(diff.summary.newCount, 1, '1 new employee');
    assertEquals(diff.summary.modifiedCount, 0, '0 modified');
    assertEquals(diff.summary.errorCount, 0, '0 error');

    const newItem = diff.items.find((i) => i.status === 'NEW')!;
    assert(!!newItem, 'New item exists');
    assertEquals(newItem.name, 'Mocanu Adrian', 'New employee name');
    assert(diff.newJobs.includes('Inginer DevOps'), 'New job detected in summary');
  });

  await runTest('5.5 Conservation of Summary Totals (Invariant: sum === totalRows)', async () => {
    const nexus = allClients.find((c) => c.cui === 'RO38765432')!;
    const exportRes = await exportClientToExcel(nexus.id);
    const wb = XLSX.read(exportRes.buffer, { type: 'buffer' });
    const sFirm = wb.Sheets['Firmă și angajați'];

    // Rând 13: MODIFIED (schimbăm numele)
    sFirm['A13'] = { t: 's', v: 'Modificat' };
    // Rând 14: UNCHANGED (lăsat intact)
    // Rând 15: ERROR (CNP greșit)
    sFirm['D15'] = { t: 's', v: '9999999999999' };
    // Rând 16: UNCHANGED (lăsat intact)
    // Rând 17: NEW (adăugăm un angajat nou valid)
    const newCNP = generateValidCNP('296062012345');
    const r = 16;
    sFirm[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: 'Enache' };
    sFirm[XLSX.utils.encode_cell({ r, c: 1 })] = { t: 's', v: 'Elena' };
    sFirm[XLSX.utils.encode_cell({ r, c: 3 })] = { t: 's', v: newCNP };
    sFirm[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 's', v: '20.06.1996' };
    sFirm[XLSX.utils.encode_cell({ r, c: 10 })] = { t: 's', v: '112233' };
    sFirm[XLSX.utils.encode_cell({ r, c: 14 })] = { t: 's', v: 'Ilfov' };
    sFirm[XLSX.utils.encode_cell({ r, c: 15 })] = { t: 's', v: 'Otopeni' };
    sFirm[XLSX.utils.encode_cell({ r, c: 16 })] = { t: 's', v: 'Str. 23 August' };
    sFirm[XLSX.utils.encode_cell({ r, c: 17 })] = { t: 's', v: '5' };
    sFirm[XLSX.utils.encode_cell({ r, c: 24 })] = { t: 's', v: 'Specialist Resurse Umane' };
    sFirm[XLSX.utils.encode_cell({ r, c: 25 })] = { t: 's', v: 'Sediul Central' };
    sFirm[XLSX.utils.encode_cell({ r, c: 27 })] = { t: 's', v: '10.01.2026' };
    sFirm['!ref'] = `A1:AH17`;

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const parsed = parseClientWorkbook(buf);
    const diff = await compareWithDatabase(nexus.id, parsed);

    const sum =
      diff.summary.unchangedCount +
      diff.summary.modifiedCount +
      diff.summary.newCount +
      diff.summary.errorCount +
      diff.summary.ambiguousCount;

    assertEquals(sum, diff.summary.totalRows, 'Invariant: sum of categories must equal totalRows');
    assertEquals(diff.summary.totalRows, 5, 'Total rows = 5');
    assertEquals(diff.summary.unchangedCount, 2, '2 unchanged');
    assertEquals(diff.summary.modifiedCount, 1, '1 modified');
    assertEquals(diff.summary.errorCount, 1, '1 error');
    assertEquals(diff.summary.newCount, 1, '1 new');
    assertEquals(diff.summary.ambiguousCount, 0, '0 ambiguous');
  });

  const suiteDuration = performance.now() - suiteStart;
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log('ADVERSARIAL STRESS TEST SUMMARY');
  console.log('========================================================================');
  console.log(`Suites Run: 5`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed Tests: ${passedCount}`);
  console.log(`Failed Tests: ${failedCount}`);
  console.log(`Total Assertions Executed: ${totalAssertions}`);
  console.log(`Execution Time: ${suiteDuration.toFixed(2)}ms`);

  if (failedCount > 0) {
    console.error('\nFAILURES ENCOUNTERED:');
    testResults
      .filter((r) => !r.passed)
      .forEach((f) => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('\n>>> ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% FIDELITY! <<<');
    process.exit(0);
  }
}

main()
  .catch((err) => {
    console.error('Fatal crash in adversarial test runner:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
