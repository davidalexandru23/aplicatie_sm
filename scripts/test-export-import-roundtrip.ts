import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';
import { exportClientToExcel } from '../src/lib/exporter';
import { parseClientWorkbook, compareWithDatabase } from '../src/lib/importer';

async function testClientRoundTrip(cui: string) {
  console.log(`\n--- Testare Round-Trip pentru Client CUI: ${cui} ---`);

  // 1. Găsește clientul din baza de date
  const client = await prisma.client.findFirst({
    where: { cui },
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

  if (!client) {
    throw new Error(`Clientul ${cui} nu există în DB!`);
  }

  console.log(`[1] Client găsit: ${client.name} (${client.cui})`);
  console.log(`    Administrator: ${client.legalRepresentative}`);
  console.log(`    Număr angajați în DB: ${client.employees.length}`);

  // 2. Exportă în Excel
  console.log('\n[2] Executare exportClientToExcel()...');
  const exportResult = await exportClientToExcel(client.id);
  console.log(`    ✓ Fișier generat: ${exportResult.filename} (${exportResult.buffer.length} bytes)`);

  const outDir = path.join(process.cwd(), 'storage', 'test_documents');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, exportResult.filename);
  fs.writeFileSync(outPath, exportResult.buffer);
  console.log(`    ✓ Salvat pe disc: ${outPath}`);

  // 3. Parsare fișier exportat cu parseClientWorkbook() (re-import)
  console.log('\n[3] Executare parseClientWorkbook(buffer) (simulare re-import)...');
  const parsed = parseClientWorkbook(exportResult.buffer);

  console.log(`    Firmă detectată: ${parsed.company.name} | CUI: ${parsed.company.cui} | Admin: ${parsed.company.legalRepresentative}`);
  console.log(`    Angajați parsați: ${parsed.employees.length}`);
  console.log(`    Context posturi parsat: ${parsed.jobContexts.length} rânduri`);

  // Verificări de consistență companie
  if (parsed.company.cui !== client.cui) {
    throw new Error(`CUI nepotrivit! Așteptat: ${client.cui}, obținut: ${parsed.company.cui}`);
  }
  if (parsed.company.name !== client.name) {
    throw new Error(`Nume nepotrivit! Așteptat: ${client.name}, obținut: ${parsed.company.name}`);
  }
  if (parsed.company.legalRepresentative !== client.legalRepresentative) {
    throw new Error(`Administrator nepotrivit! Așteptat: ${client.legalRepresentative}, obținut: ${parsed.company.legalRepresentative}`);
  }

  // Verificări de consistență angajați
  if (parsed.employees.length !== client.employees.length) {
    throw new Error(`Număr angajați nepotrivit! Așteptat: ${client.employees.length}, obținut: ${parsed.employees.length}`);
  }

  parsed.employees.forEach((emp, i) => {
    console.log(`      [${i + 1}] ${emp.lastName} ${emp.firstName} | CNP: ${emp.cnp} | Funcție: ${emp.jobTitle} | Punct: ${emp.worksiteName} | Valid: ${emp.isValid}`);
    if (!emp.isValid) {
      throw new Error(`Angajatul ${emp.lastName} are erori de validare: ${emp.errors.join(', ')}`);
    }
  });

  // 4. Executare compareWithDatabase()
  console.log('\n[4] Executare compareWithDatabase(clientId, parsed)...');
  const diffReport = await compareWithDatabase(client.id, parsed);

  console.log('    Rezumat Diff:');
  console.log(`      Total rânduri: ${diffReport.summary.totalRows}`);
  console.log(`      Neschimbate (UNCHANGED): ${diffReport.summary.unchangedCount}`);
  console.log(`      Modificate (MODIFIED): ${diffReport.summary.modifiedCount}`);
  console.log(`      Noi (NEW): ${diffReport.summary.newCount}`);
  console.log(`      Erori (ERROR): ${diffReport.summary.errorCount}`);

  if (diffReport.summary.unchangedCount !== client.employees.length) {
    throw new Error(`Toți cei ${client.employees.length} angajați ar trebui să fie UNCHANGED la re-import direct!`);
  }
  if (diffReport.summary.errorCount > 0) {
    throw new Error(`Re-importul a generat ${diffReport.summary.errorCount} erori neașteptate!`);
  }

  console.log('\n[5] Test modificare date în Excel și detectare diferențe...');
  const modWb = XLSX.read(exportResult.buffer, { type: 'buffer' });
  const sFirm = modWb.Sheets['Firmă și angajați'];

  // Modificăm telefonul și strada primului angajat (rândul 13)
  sFirm['Q13'] = { t: 's', v: 'Str. Victoriei Nouă' }; // Strada (Col 16)
  sFirm['X13'] = { t: 's', v: '0799111222' }; // Telefon (Col 23)

  const modBuffer = XLSX.write(modWb, { type: 'buffer', bookType: 'xlsx' });
  const modParsed = parseClientWorkbook(modBuffer);
  const modDiff = await compareWithDatabase(client.id, modParsed);

  console.log(`    Rezumat Diff după modificare:`);
  console.log(`      Neschimbate: ${modDiff.summary.unchangedCount}`);
  console.log(`      Modificate: ${modDiff.summary.modifiedCount}`);

  const modifiedItem = modDiff.items.find((item) => item.status === 'MODIFIED');
  if (!modifiedItem) {
    throw new Error('Modificarea adresei/telefonului nu a fost detectată ca MODIFIED!');
  }
  console.log(`    ✓ Câmpuri modificate detectate pentru ${modifiedItem.name}:`);
  modifiedItem.changes.forEach((c) => {
    console.log(`        • ${c.field}: "${c.oldVal}" -> "${c.newVal}"`);
  });

  console.log(`✓ Client ${client.name} (${cui}) a trecut cu succes 100% testul round-trip!`);
}

async function testRoundTrip() {
  console.log('================================================================');
  console.log('TEST ROUND-TRIP: EXPORT CLIENT ÎN EXCEL -> RE-IMPORT ÎN APLICAȚIE');
  console.log('================================================================');

  const testClients = ['RO38765432', 'RO45123987'];
  for (const cui of testClients) {
    await testClientRoundTrip(cui);
  }

  console.log('\n================================================================');
  console.log('✓ TEST ROUND-TRIP TRECUT CU SUCCES 100% PENTRU TOȚI CLIENȚII!');
  console.log('  Exportul produce registre complete, valide și 100% compatibile.');
  console.log('================================================================');
}

testRoundTrip()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Round-Trip eșuat:', err);
    process.exit(1);
  });
