import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parseClientWorkbook, revalidateParsedWorkbook } from '../src/lib/importer';
import { getBirthDateFromCNP } from '../src/lib/exporter';

async function runTests() {
  console.log('--- TEST 1: getBirthDateFromCNP ---');
  // CNP 1920514410057 -> 14.05.1992
  const b1 = getBirthDateFromCNP('1920514410057');
  assert(b1 !== undefined, 'Should calculate birthdate from valid CNP');
  assert.strictEqual(b1.getFullYear(), 1992);
  assert.strictEqual(b1.getMonth(), 4); // May is 4
  assert.strictEqual(b1.getDate(), 14);

  // Invalid or empty CNP
  assert.strictEqual(getBirthDateFromCNP(''), undefined);
  assert.strictEqual(getBirthDateFromCNP('invalid'), undefined);
  console.log('✓ getBirthDateFromCNP behaves correctly for valid, invalid, and empty strings.');

  console.log('\n--- TEST 2: revalidateParsedWorkbook with Optional CNP, birthDate, docNumber ---');
  const mockWorkbook: any = {
    company: { name: 'Test Corp', cui: 'RO12345678' },
    employees: [
      // 1: Full data
      {
        rowNumber: 13,
        lastName: 'Popa',
        firstName: 'Andrei',
        cnp: '1920514410057',
        birthDate: new Date('1992-05-14'),
        docType: 'CI',
        docSeries: 'RD',
        docNumber: '123456',
        hireDate: new Date('2022-01-01'),
        jobTitle: 'Inginer',
        county: 'Bucuresti',
        locality: 'Sector 1',
        street: 'Str. Lunga',
        streetNumber: '10',
        worksiteName: 'Sediu Central',
        isValid: true,
        errors: [],
      },
      // 2: Completely missing CNP, birthDate, docNumber (Foreign worker or omitted)
      {
        rowNumber: 14,
        lastName: 'Smith',
        firstName: 'John',
        cnp: '', // Omitted
        birthDate: undefined, // Omitted
        docType: 'PASAPORT',
        docSeries: '',
        docNumber: '', // Omitted
        hireDate: new Date('2023-05-10'),
        jobTitle: 'Consultant',
        county: 'Bucuresti',
        locality: 'Sector 1',
        street: 'Str. Lunga',
        streetNumber: '10',
        worksiteName: 'Sediu Central',
        isValid: true,
        errors: [],
      },
      // 3: Second employee also without CNP (Should NOT trigger duplicate CNP error!)
      {
        rowNumber: 15,
        lastName: 'Dupont',
        firstName: 'Jean',
        cnp: undefined,
        birthDate: undefined,
        docType: 'PASAPORT',
        hireDate: new Date('2023-06-01'),
        jobTitle: 'Manager',
        county: 'Bucuresti',
        locality: 'Sector 1',
        street: 'Str. Lunga',
        streetNumber: '10',
        worksiteName: 'Sediu Central',
        isValid: true,
        errors: [],
      },
      // 4: CNP provided, birthDate omitted -> should auto-derive birthDate from CNP
      {
        rowNumber: 16,
        lastName: 'Ionescu',
        firstName: 'Elena',
        cnp: '2950920410044', // 20.09.1995
        birthDate: undefined,
        hireDate: new Date('2021-03-15'),
        jobTitle: 'Contabil',
        county: 'Bucuresti',
        locality: 'Sector 1',
        street: 'Str. Lunga',
        streetNumber: '10',
        worksiteName: 'Sediu Central',
        isValid: true,
        errors: [],
      },
    ],
    worksites: [],
  };

  const revalResult = revalidateParsedWorkbook(mockWorkbook);
  console.log(`Revalidated ${revalResult.totalRows} employees. Valid: ${revalResult.validCount}, Errors: ${revalResult.errorCount}`);

  assert.strictEqual(revalResult.errorCount, 0, 'There should be 0 errors for optional fields');
  assert.strictEqual(revalResult.validCount, 4, 'All 4 rows should be valid');

  const revalEmps = revalResult.revalidatedData.employees;

  const emp1 = revalEmps[0];
  assert.strictEqual(emp1.isValid, true);
  assert.strictEqual(emp1.cnp, '1920514410057');
  assert.strictEqual(emp1.docNumber, '123456');

  const emp2 = revalEmps[1];
  assert.strictEqual(emp2.isValid, true, `Emp 2 (no CNP/birthDate/docNumber) should be valid.`);
  assert.strictEqual(emp2.cnp, undefined);
  assert.strictEqual(emp2.birthDate, undefined);
  assert.strictEqual(emp2.docNumber, undefined);

  const emp3 = revalEmps[2];
  assert.strictEqual(emp3.isValid, true, `Emp 3 (no CNP) should be valid and NOT collide with Emp 2.`);
  assert.strictEqual(emp3.cnp, undefined);

  const emp4 = revalEmps[3];
  assert.strictEqual(emp4.isValid, true);
  assert.strictEqual(emp4.cnp, '2950920410044');
  assert(emp4.birthDate instanceof Date, 'Emp 4 birthDate should be auto-derived from CNP');
  assert.strictEqual(emp4.birthDate.getFullYear(), 1995);

  console.log('✓ revalidateParsedWorkbook successfully validated optional CNP, birthDate, and docNumber.');

  console.log('\n--- TEST 3: parseClientWorkbook on Template File ---');
  const templatePath = path.join(process.cwd(), 'outputs/ssm-client-template/Model_date_client_SSM.xlsx');
  const buf = fs.readFileSync(templatePath);
  const parsedExcel = parseClientWorkbook(buf);
  console.log(`Parsed template company: ${parsedExcel.company.name || 'OK'}, Employees: ${parsedExcel.employees.length}`);
  for (const emp of parsedExcel.employees) {
    console.log(`- ${emp.lastName} ${emp.firstName} (CNP: ${emp.cnp || 'Omitted'}, BirthDate: ${emp.birthDate ? emp.birthDate.toISOString().slice(0, 10) : 'Omitted'}, DocNum: ${emp.docNumber || 'Omitted'}) - Valid: ${emp.isValid}`);
    assert.strictEqual(emp.isValid, true, `Template employee should be valid: ${emp.errors.join(', ')}`);
  }
  console.log('✓ Excel template file parses completely without errors.');

  console.log('\n========================================');
  console.log('ALL OPTIONAL FIELDS TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
