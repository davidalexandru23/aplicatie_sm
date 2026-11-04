import { prisma } from '../../../src/lib/prisma';
import { exportClientToExcel } from '../../../src/lib/exporter';
import { parseClientWorkbook, compareWithDatabase, validateCNP } from '../../../src/lib/importer';
import * as XLSX from 'xlsx';

async function testFixSimulation() {
  console.log('Testing Round-Trip simulation with corrected CNPs...\n');

  // Test Nexus Solutions (already valid)
  const nexus = await prisma.client.findFirst({
    where: { cui: 'RO38765432' },
    include: {
      employees: {
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
    },
  });
  if (!nexus) throw new Error('Nexus not found');

  const expNexus = await exportClientToExcel(nexus.id);
  const parsedNexus = parseClientWorkbook(expNexus.buffer);
  const diffNexus = await compareWithDatabase(nexus.id, parsedNexus);
  console.log('Nexus Export/Import:');
  console.log('  Employees count:', parsedNexus.employees.length);
  console.log('  All valid:', parsedNexus.employees.every(e => e.isValid && e.errors.length === 0));
  console.log('  Diff unchanged:', diffNexus.summary.unchangedCount, 'modified:', diffNexus.summary.modifiedCount, 'errors:', diffNexus.summary.errorCount);

  // Test Bistro Gourmet with simulated DB update
  const bistro = await prisma.client.findFirst({
    where: { cui: 'RO45123987' },
    include: {
      employees: {
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
    },
  });
  if (!bistro) throw new Error('Bistro not found');

  // Simulate export with corrected CNPs
  const expBistro = await exportClientToExcel(bistro.id);
  const wb = XLSX.read(expBistro.buffer, { type: 'buffer' });
  const sheet = wb.Sheets['Firmă și angajați'];

  for (let r = 12; r <= 14; r++) {
    const cnpRef = XLSX.utils.encode_cell({ r, c: 3 });
    const cell = sheet[cnpRef];
    if (cell) {
      if (cell.v === '1820815410098') cell.v = '1820815410097';
      if (cell.v === '2950920410045') cell.v = '2950920410044';
    }
  }
  const fixedBistroBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const parsedBistro = parseClientWorkbook(fixedBistroBuf);

  console.log('\nBistro Gourmet (with corrected CNPs 1820815410097 & 2950920410044):');
  console.log('  Employees count:', parsedBistro.employees.length);
  for (const emp of parsedBistro.employees) {
    console.log(`    - ${emp.lastName} ${emp.firstName} | CNP: ${emp.cnp} | isValid: ${emp.isValid} | errors: ${JSON.stringify(emp.errors)}`);
  }

  const allBistroValid = parsedBistro.employees.every(e => e.isValid && e.errors.length === 0 && validateCNP(e.cnp));
  console.log('  All Bistro employees valid & 0 errors:', allBistroValid);

  if (!allBistroValid) {
    throw new Error('Simulation failed: not all Bistro employees are valid');
  }
  console.log('\n✓ Simulation successful! Fixed CNPs pass 100% of importer validation.');
}

testFixSimulation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
