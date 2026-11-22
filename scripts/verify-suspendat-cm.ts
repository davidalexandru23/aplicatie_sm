/**
 * Verification script for Employee Status "Suspendat/CM" (R1)
 * Tests parser logic, exporter headers, compliance calculations, and round-trip fidelity.
 */
import assert from 'assert';
import { parseClientWorkbook } from '../src/lib/importer';
import { calculateEmployeeCompliance, calculateCompanyMetrics } from '../src/lib/compliance';
import { buildStyledClientWorkbook } from '../src/lib/exporter';
import { prisma } from '../src/lib/prisma';

async function run() {
  console.log('====================================================');
  console.log('🧪 VERIFICARE STATUS SALARIAT "Suspendat/CM" (R1)');
  console.log('====================================================\n');

  // 1. Test Exporter Header & Serialization
  console.log('--- 1. Serializare Exporter Excel ---');

  const testClient: any = {
    id: 'test-client-exp',
    name: 'TEST STATUS EXPORT SRL',
    cui: 'RO12345678',
    regCom: 'J40/123/2023',
    address: 'București, Str. Test 1',
    legalRepresentative: 'Director Test',
    jobs: [
      { id: 'job-1', title: 'Inginer' },
      { id: 'job-2', title: 'Contabil' },
      { id: 'job-3', title: 'Tehnician' },
    ],
    worksites: [
      { id: 'ws-1', name: 'Sediu Central' },
    ],
    employees: [
      {
        id: 'emp-1',
        firstName: 'Ion',
        lastName: 'Popescu',
        status: 'Suspendat/CM',
        hireDate: new Date('2023-01-15'),
        currentJob: { title: 'Inginer' },
        currentWorksite: { name: 'Sediu Central' },
        residenceAddress: { county: 'Bucuresti', locality: 'Sector 1', street: 'Victoriei', number: '1' },
      },
      {
        id: 'emp-2',
        firstName: 'Maria',
        lastName: 'Ionescu',
        status: 'ACTIV',
        hireDate: new Date('2023-02-01'),
        currentJob: { title: 'Contabil' },
        currentWorksite: { name: 'Sediu Central' },
        residenceAddress: { county: 'Bucuresti', locality: 'Sector 2', street: 'Mosilor', number: '2' },
      },
      {
        id: 'emp-3',
        firstName: 'Vasile',
        lastName: 'Radu',
        status: 'INCETAT',
        hireDate: new Date('2022-01-01'),
        leaveDate: new Date('2023-12-31'),
        currentJob: { title: 'Tehnician' },
        currentWorksite: { name: 'Sediu Central' },
        residenceAddress: { county: 'Bucuresti', locality: 'Sector 3', street: 'Dristor', number: '3' },
      },
    ],
  };

  const workbook = buildStyledClientWorkbook(testClient);
  const wsFirm = workbook.getWorksheet('Firmă și angajați');
  assert.ok(wsFirm, 'Worksheet "Firmă și angajați" trebuie să existe');

  const statusHeaderCell = wsFirm.getRow(12).getCell(29); // Column 29 is Stare
  assert.strictEqual(
    statusHeaderCell.value,
    'Stare (ACTIV/INCETAT/Suspendat/CM)',
    'Antetul coloanei de stare trebuie să fie "Stare (ACTIV/INCETAT/Suspendat/CM)"'
  );

  const empRow1 = wsFirm.getRow(13);
  const empStatusVal1 = empRow1.getCell(29).value;
  assert.strictEqual(empStatusVal1, 'Suspendat/CM', 'Statusul exportat trebuie să fie "Suspendat/CM"');

  console.log('  ✅ [PASS] Exporterul include antetul "Stare (ACTIV/INCETAT/Suspendat/CM)" și serializează "Suspendat/CM".');

  // 2. Test Round-Trip: Importer reading the exported Excel workbook
  console.log('\n--- 2. Parsare în Importer din Fișier Excel ---');

  const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const parsedWb = parseClientWorkbook(excelBuffer);

  assert.strictEqual(parsedWb.employees.length, 3, 'Toți cei 3 angajați trebuie parsați');

  const parsedSuspended = parsedWb.employees.find((e) => e.lastName === 'Popescu');
  assert.ok(parsedSuspended, 'Salariatul Popescu trebuie găsit');
  assert.strictEqual(parsedSuspended.status, 'Suspendat/CM', 'Statusul parsat trebuie să fie "Suspendat/CM"');
  assert.strictEqual(parsedSuspended.isValid, true, 'Salariatul Suspendat/CM fără leaveDate este valid');

  const parsedActive = parsedWb.employees.find((e) => e.lastName === 'Ionescu');
  assert.ok(parsedActive, 'Salariatul Ionescu trebuie găsit');
  assert.strictEqual(parsedActive.status, 'ACTIV', 'Statusul parsat trebuie să fie "ACTIV"');

  const parsedIncetat = parsedWb.employees.find((e) => e.lastName === 'Radu');
  assert.ok(parsedIncetat, 'Salariatul Radu trebuie găsit');
  assert.strictEqual(parsedIncetat.status, 'INCETAT', 'Statusul parsat trebuie să fie "INCETAT"');

  console.log('  ✅ [PASS] Importerul recunoaște "Suspendat/CM", "ACTIV" și "INCETAT" din fișierul Excel generat.');

  // 3. Test Compliance Calculations with Suspendat/CM
  console.log('\n--- 3. Calcul Conformitate cu Salariați Suspendat/CM ---');

  const compSuspended = calculateEmployeeCompliance({
    id: 'emp-susp-1',
    firstName: 'Ion',
    lastName: 'Popescu',
    status: 'Suspendat/CM',
    hireDate: new Date('2023-01-15'),
    medicalLastExamDate: new Date('2024-01-15'),
    ssmLastTrainingDate: new Date('2024-01-15'),
    psiLastTrainingDate: new Date('2024-01-15'),
  });

  assert.strictEqual(compSuspended.status, 'Suspendat/CM', 'Statusul este returnat corect în rezumat');
  assert.strictEqual(compSuspended.isTerminated, false, 'isTerminated este false pentru salariați suspendați');
  assert.ok(compSuspended.overallStatus, 'overallStatus este calculat fără eroare');

  const compTerminated = calculateEmployeeCompliance({
    id: 'emp-term-1',
    firstName: 'Elena',
    lastName: 'Dumitru',
    status: 'INCETAT',
    hireDate: new Date('2023-01-15'),
  });
  assert.strictEqual(compTerminated.isTerminated, true, 'isTerminated este true pentru INCETAT');

  // Aggregated company metrics: Active + Suspended included, Terminated excluded
  const companyMetrics = calculateCompanyMetrics([
    { id: '1', status: 'ACTIV', ssmLastTrainingDate: new Date() },
    { id: '2', status: 'Suspendat/CM', ssmLastTrainingDate: new Date() },
    { id: '3', status: 'PLECAT', ssmLastTrainingDate: new Date('2020-01-01') },
    { id: '4', status: 'INCETAT', ssmLastTrainingDate: new Date('2020-01-01') },
  ]);

  assert.strictEqual(companyMetrics.totalEmployees, 2, 'Total employees include ACTIV + Suspendat/CM (2), exclude PLECAT + INCETAT');
  console.log('  ✅ [PASS] Calculul de conformitate tratează "Suspendat/CM" ca neterminat și calculează metricele corect.');

  console.log('\n====================================================');
  console.log('🎯 TOATE TESTELE PENTRU "Suspendat/CM" AU TRECUT CU SUCCES!');
  console.log('====================================================\n');
}

run()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
