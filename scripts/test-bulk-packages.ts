/**
 * Test script for Milestone 4 (Pillar 4: Bulk Generation Packages)
 * Verifies:
 * - F16: Employee Onboarding Package (11 documents, 0 unmapped tokens)
 * - F17: Company SSM Dossier Package (16 documents, 0 unmapped tokens)
 * - F18: Statutory ITM / ISU Inspection Archive (Structured folders, 0 unmapped tokens)
 */

import assert from 'assert';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { collectUnresolvedPlaceholders } from '../src/lib/templates/generator';
import {
  generateEmployeeOnboardingZip,
  generateCompanyDossierZip,
  generateInspectionArchiveZip,
} from '../src/lib/packages/bulk-packages';

async function main() {
  console.log('========================================================================');
  console.log('VERIFICARE PILONUL 4 (MILESTONE 4): PACHETE BULK 1-CLICK & ARHIVE ZIP');
  console.log('========================================================================\n');

  const client = await prisma.client.findFirst({
    where: { cui: 'RO38765432' },
    include: {
      employees: true,
      jobs: true,
      worksites: true,
    },
  });

  if (!client || client.employees.length === 0) {
    throw new Error('Clientul de test nu a fost găsit în baza de date!');
  }

  const employee = client.employees[0];
  console.log(`[Setup] Client: ${client.name} | Salariat: ${employee.lastName} ${employee.firstName}`);

  // --------------------------------------------------------------------------
  // TEST 1: F16 - Pachet Onboarding Salariat (ZIP 1-Click)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testare F16: Pachet Onboarding Salariat ---');
  const onboarding = await generateEmployeeOnboardingZip({
    clientId: client.id,
    employeeId: employee.id,
  });

  console.log(`  ✓ Nume fișier generat: ${onboarding.filename}`);
  console.log(`  ✓ Dimensiune arhivă: ${(onboarding.buffer.length / 1024).toFixed(1)} KB`);
  assert(onboarding.buffer.length > 50000, 'Arhiva de onboarding trebuie să fie > 50KB');

  const zipOnboarding = new PizZip(onboarding.buffer);
  const filesOnboarding = Object.keys(zipOnboarding.files).filter((f) => !zipOnboarding.files[f].dir);
  console.log(`  ✓ Număr documente în arhivă: ${filesOnboarding.length}`);
  assert.strictEqual(filesOnboarding.length, 11, 'Arhiva de onboarding trebuie să conțină exact 11 documente');

  for (const filename of filesOnboarding) {
    const fileBuf = zipOnboarding.file(filename)!.asNodeBuffer();
    const unmapped = await collectUnresolvedPlaceholders(fileBuf, 'docx');
    assert.strictEqual(
      unmapped.length,
      0,
      `Token-uri necompletate în ${filename}: ${unmapped.join(', ')}`
    );
  }
  console.log('  ✓ [PASS] Toate cele 11 documente de onboarding conțin 0 token-uri necompletate!');

  // --------------------------------------------------------------------------
  // TEST 2: F17 - Pachet Dosar Companie SSM (ZIP 1-Click)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testare F17: Pachet Dosar SSM Companie ---');
  const dossier = await generateCompanyDossierZip({
    clientId: client.id,
  });

  console.log(`  ✓ Nume fișier generat: ${dossier.filename}`);
  console.log(`  ✓ Dimensiune arhivă: ${(dossier.buffer.length / 1024).toFixed(1)} KB`);
  assert(dossier.buffer.length > 100000, 'Arhiva dosar companie trebuie să fie > 100KB');

  const zipDossier = new PizZip(dossier.buffer);
  const filesDossier = Object.keys(zipDossier.files).filter((f) => !zipDossier.files[f].dir);
  console.log(`  ✓ Număr documente în arhivă: ${filesDossier.length}`);
  assert.strictEqual(filesDossier.length, 16, 'Dosarul de companie trebuie să conțină exact 16 documente');

  for (const filename of filesDossier) {
    const fileBuf = zipDossier.file(filename)!.asNodeBuffer();
    const unmapped = await collectUnresolvedPlaceholders(fileBuf, 'docx');
    assert.strictEqual(
      unmapped.length,
      0,
      `Token-uri necompletate în ${filename}: ${unmapped.join(', ')}`
    );
  }
  console.log('  ✓ [PASS] Toate cele 16 documente din dosarul companiei conțin 0 token-uri necompletate!');

  // --------------------------------------------------------------------------
  // TEST 3: F18 - Pachet Arhivă Inspecție ITM / ISU
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testare F18: Pachet Arhivă Inspecție ITM / ISU ---');
  const inspection = await generateInspectionArchiveZip({
    clientId: client.id,
  });

  console.log(`  ✓ Nume fișier generat: ${inspection.filename}`);
  console.log(`  ✓ Dimensiune arhivă: ${(inspection.buffer.length / 1024).toFixed(1)} KB`);
  console.log(`  ✓ Salariați incluși: ${inspection.employeesIncluded}`);
  assert(inspection.buffer.length > 200000, 'Arhiva de inspecție trebuie să fie > 200KB');

  const zipInspection = new PizZip(inspection.buffer);
  const allInspectionPaths = Object.keys(zipInspection.files).filter((f) => !zipInspection.files[f].dir);
  console.log(`  ✓ Total fișiere în structura arhivei: ${allInspectionPaths.length}`);

  const requiredFolders = [
    '01_ORGANIZARE_SSM',
    '02_EVALUARE_RISCURI_SI_PLAN_PREVENIRE',
    '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII',
    '04_FISE_INDIVIDUALE_SALARIATI',
    '05_SITUATII_DE_URGENTA_PSI',
    '06_MEDICINA_MUNCII',
  ];

  for (const folder of requiredFolders) {
    const matching = allInspectionPaths.filter((p) => p.startsWith(folder + '/'));
    assert(matching.length > 0, `Folderul ${folder} lipsește sau este gol în arhivă!`);
    console.log(`    - Folder ${folder}: ${matching.length} documente`);
  }

  // Sample check for unmapped tokens in inspection archive
  for (const filePath of allInspectionPaths) {
    const fileBuf = zipInspection.file(filePath)!.asNodeBuffer();
    const unmapped = await collectUnresolvedPlaceholders(fileBuf, 'docx');
    assert.strictEqual(
      unmapped.length,
      0,
      `Token-uri necompletate în ${filePath}: ${unmapped.join(', ')}`
    );
  }
  console.log('  ✓ [PASS] Toate documentele din arhiva de inspecție sunt valide și au 0 token-uri necompletate!');

  console.log('\n========================================================================');
  console.log('✅ TOATE CELE 3 PACHETE BULK AU FOST GENERATE ȘI VALIDATE CU SUCCES (100% PASS)!');
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('\n❌ EROARE LA TESTAREA PACHETELOR BULK:', err);
  process.exit(1);
});
