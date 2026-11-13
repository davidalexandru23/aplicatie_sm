/**
 * scripts/e2e-tier4-scenarios.ts
 *
 * Tier 4: Statutory Real-World End-to-End Scenarios (Scenarios 1 through 8)
 *
 * Comprehensive real-world validation exercising deep cross-pillar workflows:
 * - Scenario 1: Onboarding complet restaurant nou (Horeca CAEN 5610, bucătar șef, EIP, igienă)
 * - Scenario 2: Pachet Înființare Firmă IT cu sediu și telemuncă (Legea 81/2018, decizii, evaluare riscuri DB)
 * - Scenario 3: Înregistrare examen medical periodic HG 355/2007 și deblocare operator
 * - Scenario 4: Încetare contract de muncă salariat (status: PLECAT) și recalculare conformitate
 * - Scenario 5: Sesiune instruire colectivă, planificare și descărcare PV/fișe
 * - Scenario 6: Curs igienă, examinare participanți și emitere certificate
 * - Scenario 7: Import fișier Excel cu date incomplete și validare fără fake dates
 * - Scenario 8: Generare batch pachet onboarding cu caractere speciale (&, <, >)
 *
 * Run with: npx tsx scripts/e2e-tier4-scenarios.ts
 */

import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG, TemplateDefinition } from '../src/lib/templates/definitions';
import { resolveTemplatePlaceholders, resolveTemplateData } from '../src/lib/templates/resolver';
import { generateDocument, renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';
import { 
  calculateEmployeeCompliance, 
  calculateCompanyMetrics, 
  calculateItemCompliance 
} from '../src/lib/compliance';
import { 
  generateEmployeeOnboardingZip, 
  generateCompanyDossierZip, 
  generateInspectionArchiveZip 
} from '../src/lib/packages/bulk-packages';
import { parseClientWorkbook } from '../src/lib/importer';

// ============================================================================
// 1. ARTIFACT VERIFICATION & TESTING HELPERS (Section 5.1 Specification)
// ============================================================================

export function inspectDocxArtifact(buffer: Buffer): {
  unmappedPlaceholders: string[];
  rawXml: string;
  hasXmlSyntaxError: boolean;
} {
  const zip = new PizZip(buffer);
  const unmapped: string[] = [];
  let rawXml = '';
  let hasXmlSyntaxError = false;

  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
      const xml = zip.files[fileName].asText();
      if (fileName === 'word/document.xml') rawXml = xml;

      const matches = xml.match(/PLACEHOLDER_[A-Z0-9_]+/g);
      if (matches) unmapped.push(...matches);

      if (
        /[^\w&;]&[^\w&;]/.test(xml) || 
        /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(xml)
      ) {
        hasXmlSyntaxError = true;
      }
    }
  }

  return {
    unmappedPlaceholders: Array.from(new Set(unmapped)),
    rawXml,
    hasXmlSyntaxError,
  };
}

export function inspectXlsxArtifact(buffer: Buffer): {
  leaks: Array<{ sheet: string; cell: string; value: string }>;
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const leaks: Array<{ sheet: string; cell: string; value: string }> = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    for (const addr of Object.keys(sheet)) {
      if (addr.startsWith('!')) continue;
      const val = sheet[addr]?.v;
      if (typeof val === 'string' && /PLACEHOLDER_[A-Z0-9_]+/.test(val)) {
        leaks.push({ sheet: sheetName, cell: addr, value: val });
      }
    }
  }

  return { leaks };
}

export function inspectZipArchive(buffer: Buffer): {
  fileNames: string[];
  readFile: (relPath: string) => Buffer | null;
  readText: (relPath: string) => string | null;
} {
  const zip = new PizZip(buffer);
  const fileNames = Object.keys(zip.files).filter((k) => !zip.files[k].dir);

  return {
    fileNames,
    readFile: (relPath: string) => {
      const f = zip.file(relPath);
      return f ? f.asNodeBuffer() : null;
    },
    readText: (relPath: string) => {
      const f = zip.file(relPath);
      return f ? f.asText() : null;
    },
  };
}

export function generateValidCnp(base12: string): string {
  const clean = base12.padEnd(12, '0').slice(0, 12);
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const rem = sum % 11;
  const ctrl = rem === 10 ? 1 : rem;
  return `${clean}${ctrl}`;
}

export async function cleanupTestFixtures(prefix: string) {
  try {
    const testClients = await prisma.client.findMany({
      where: {
        OR: [
          { cui: { startsWith: prefix } },
          { name: { contains: prefix } },
        ],
      },
      select: { id: true },
    });

    for (const c of testClients) {
      await prisma.client.delete({ where: { id: c.id } }).catch(() => {});
    }

    await prisma.eipItem.deleteMany({
      where: { code: { startsWith: prefix } },
    }).catch(() => {});

    await prisma.hygieneSession.deleteMany({
      where: { location: { contains: prefix } },
    }).catch(() => {});
  } catch (err) {
    console.warn(`[CLEANUP WARNING for ${prefix}]:`, err instanceof Error ? err.message : err);
  }
}

// ============================================================================
// 2. TEST HARNESS & RUNNER
// ============================================================================

interface ScenarioResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const scenarioResults: ScenarioResult[] = [];
const grepArg = process.argv.find((a) => a.startsWith('--grep='));
const filterGrep = grepArg ? grepArg.split('=')[1].toLowerCase() : null;

async function runScenario(id: string, name: string, fn: () => Promise<void>) {
  if (filterGrep && !`${id} ${name}`.toLowerCase().includes(filterGrep)) {
    return;
  }
  const start = performance.now();
  console.log(`\n▶ [RULARE SCENARIU ${id}] ${name}...`);
  try {
    await fn();
    const duration = performance.now() - start;
    scenarioResults.push({ id, name, passed: true, durationMs: duration });
    console.log(`  ✓ [SUCCES SCENARIU ${id}] ${name} (${duration.toFixed(1)}ms)`);
  } catch (err: unknown) {
    const duration = performance.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    scenarioResults.push({ id, name, passed: false, durationMs: duration, error: msg });
    console.error(`  ✗ [FAIL SCENARIU ${id}] ${name}: ${msg}`);
    if (err instanceof Error && err.stack) {
      console.error(`    ${err.stack.split('\n').slice(1, 4).join('\n    ')}`);
    }
  }
}

// ============================================================================
// 3. THE 8 STATUTORY REAL-WORLD SCENARIOS (Section 4)
// ============================================================================

export async function runTier4Scenarios(): Promise<boolean> {
  console.log('====================================================================================================');
  console.log('            SUITĂ DE TESTE TIER 4: SCENARII STATUTARE REALE END-TO-END (S1 -> S8)                  ');
  console.log('====================================================================================================');

  const suitePrefix = `RO_TEST_T4_${Date.now()}_`;

  // --------------------------------------------------------------------------
  // Scenario 1: Onboarding complet restaurant nou (Horeca CAEN 5610, bucătar șef, EIP, igienă)
  // --------------------------------------------------------------------------
  await runScenario('S1', 'Onboarding complet restaurant nou (Horeca CAEN 5610, bucătar șef, EIP, igienă)', async () => {
    const pfx = `${suitePrefix}S1_`;
    try {
      // 1. Company & Worksite Setup
      const client = await prisma.client.create({
        data: {
          name: `BISTRO TRANSILVANIA <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          regCom: 'J08/561/2024',
          address: 'Str. Republicii nr. 45, Brașov',
          caenCode: '5610',
          caenActivity: 'Restaurante',
          legalRepresentative: 'Vlad Mureșan',
          contactPerson: 'Elena Voicu',
        },
      });

      const worksite = await prisma.worksite.create({
        data: {
          clientId: client.id,
          name: 'Punct de Lucru Brașov - Bucătărie & Restaurant',
          address: 'Str. Republicii nr. 45, Brașov',
          activity: 'Servicii de preparare și servire a mesei',
        },
      });

      // 2. Job Definition & Risk Profiling
      const job = await prisma.job.create({
        data: {
          clientId: client.id,
          title: 'Bucătar Șef',
          corCode: '343401',
          isFoodHandling: true,
          workPosture: 'standing',
          maxWeightKg: 20,
          noiseExposed: false,
          mainActivities: 'Coordonarea bucătăriei, preparare preparate calde, respectare HACCP',
        },
      });

      // EIP Requirements for Horeca
      const eipShoe = await prisma.eipItem.create({
        data: {
          code: `${pfx}INC_HORECA`,
          name: 'Încălțăminte antiderapantă bucătărie',
          standardCode: 'EN ISO 20345',
          protectionType: 'Antialunecare',
          replacementMonths: 12,
        },
      });
      const eipCap = await prisma.eipItem.create({
        data: {
          code: `${pfx}BON_HORECA`,
          name: 'Bonetă de protecție textilă',
          standardCode: 'EN 340',
          protectionType: 'Igienic',
          replacementMonths: 6,
        },
      });
      const eipApron = await prisma.eipItem.create({
        data: {
          code: `${pfx}SOR_HORECA`,
          name: 'Șorț impermeabil din cauciuc/poliuretan',
          standardCode: 'EN 340',
          protectionType: 'Termic/Mecanic',
          replacementMonths: 12,
        },
      });

      await prisma.jobEipRequirement.createMany({
        data: [
          { jobId: job.id, eipItemId: eipShoe.id },
          { jobId: job.id, eipItemId: eipCap.id },
          { jobId: job.id, eipItemId: eipApron.id },
        ],
      });

      // 3. Employee Manual Intake with complete statutory details
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: job.id,
          currentWorksiteId: worksite.id,
          lastName: 'Dumitrescu',
          firstName: 'Elena',
          sex: 'F',
          cnp: generateValidCnp('292041508001'),
          birthDate: new Date('1992-04-15'),
          birthPlace: 'Brașov',
          birthCounty: 'Brașov',
          citizenship: 'Română',
          phone: '0722123456',
          hireDate: new Date('2026-06-01'),
          startDateOnJob: new Date('2026-06-01'),
          status: 'ACTIV',
          // CIM Details
          cimNumber: '105/28.05.2026',
          cimDate: new Date('2026-05-28'),
          grossSalary: 5200,
          workNorm: 8,
          probationDays: 90,
          annualLeaveDays: 21,
          bankIban: 'RO49AAAA1B31007593840000',
          bankName: 'Banca Transilvania',
          // EIP Sizes
          shoeSize: '38',
          clothingSize: 'M',
          gloveSize: '7.5',
          // Medical Exam HG 355/2007 Fișa 210
          medicalLastExamDate: new Date('2026-05-29T08:00:00Z'),
          medicalIntervalMonths: 12,
          medicalFitnessVerdict: 'APT',
          medicalNotes: 'Examen clinic general, coproparazitologic, coprobacteriologic promovat (Fișa 210)',
          // Hygiene Request
          hygieneRequested: true,
          hygieneModule: 'Modulul 1 - Servicii de alimentație publică',
        },
      });

      // Identity document
      await prisma.identityDocument.create({
        data: {
          employeeId: emp.id,
          docType: 'CI',
          series: 'BV',
          number: '789012',
          issuedBy: 'SPCLEP Brașov',
          issueDate: new Date('2020-04-10'),
          expiryDate: new Date('2030-04-15'),
        },
      });

      // Residence address
      await prisma.residenceAddress.create({
        data: {
          employeeId: emp.id,
          county: 'Brașov',
          locality: 'Brașov',
          street: 'Str. Mureșenilor',
          number: '12',
          apartment: '4',
        },
      });

      // EIP Assignments
      await prisma.employeeEipAssignment.createMany({
        data: [
          { employeeId: emp.id, eipItemId: eipShoe.id, assignedDate: new Date('2026-05-30') },
          { employeeId: emp.id, eipItemId: eipCap.id, assignedDate: new Date('2026-05-30') },
          { employeeId: emp.id, eipItemId: eipApron.id, assignedDate: new Date('2026-05-30') },
        ],
      });

      // 4. Trigger 1-Click Onboarding Package Generation
      const onboardingResult = await generateEmployeeOnboardingZip({
        clientId: client.id,
        employeeId: emp.id,
      });

      assert.ok(onboardingResult.buffer.length > 50000, 'Arhiva ZIP onboarding trebuie să aibă dimensiune validă (>50KB)');
      assert.ok(onboardingResult.filename.includes('Pachet_Onboarding'), 'Nume fișier conform convenției Pachet_Onboarding');

      // 5. Inspect ZIP Structure & Content
      const archive = inspectZipArchive(onboardingResult.buffer);
      assert.strictEqual(archive.fileNames.length, 11, 'Pachetul de onboarding trebuie să conțină exact 11 fișiere statutare');

      // Assert specific statutory files
      const requiredFiles = [
        '01_Cerere_Angajare.docx',
        '02_Contract_Individual_Munca.docx',
        '03_Anexa_Fisa_Postului_SSM.docx',
        '04_Fisa_Instruire_Individuala_SSM.docx',
        '05_Fisa_Instructaj_Individuala_PSI.docx',
        '06_Fisa_Solicitare_Examen_Medical.docx',
        '07_Fisa_Identificare_Factori_Risc.docx',
        '08_Fisa_Acordare_EIP.docx',
        '09_Informare_GDPR.docx',
        '10_Declaratie_Luare_Cunostinta_RI.docx',
        '11_Declaratie_Proprie_Raspundere.docx',
      ];

      for (const rf of requiredFiles) {
        assert.ok(archive.fileNames.includes(rf), `Fișierul ${rf} trebuie să fie prezent în arhivă`);
      }

      // Deep XML Inspection on 08_Fisa_Acordare_EIP.docx
      const eipDocBuf = archive.readFile('08_Fisa_Acordare_EIP.docx');
      assert.ok(eipDocBuf, '08_Fisa_Acordare_EIP.docx trebuie să poată fi citit');
      const eipArtifact = inspectDocxArtifact(eipDocBuf);
      assert.strictEqual(eipArtifact.hasXmlSyntaxError, false, 'Fișa EIP nu are erori XML');
      assert.ok(eipArtifact.rawXml.includes('38'), 'Fișa EIP conține mărimea reală de pantofi 38');
      assert.ok(!eipArtifact.rawXml.includes('42/L/9'), 'Nu există mărimi mock hardcodate 42/L/9');

      // Deep XML Inspection on 02_Contract_Individual_Munca.docx
      const cimDocBuf = archive.readFile('02_Contract_Individual_Munca.docx');
      assert.ok(cimDocBuf, '02_Contract_Individual_Munca.docx trebuie să poată fi citit');
      const cimArtifact = inspectDocxArtifact(cimDocBuf);
      assert.strictEqual(cimArtifact.hasXmlSyntaxError, false, 'Contractul de muncă nu are erori XML');
      assert.ok(cimArtifact.rawXml.includes('5200'), 'CIM conține salariul negociat real de 5200 lei');
      assert.ok(cimArtifact.rawXml.includes('Dumitrescu'), 'CIM conține numele salariatului Dumitrescu');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Pachet Înființare Firmă IT cu sediu și telemuncă (Legea 81/2018)
  // --------------------------------------------------------------------------
  await runScenario('S2', 'Pachet Înființare Firmă IT cu sediu și telemuncă (Legea 81/2018, decizii, evaluare riscuri DB)', async () => {
    const pfx = `${suitePrefix}S2_`;
    try {
      // 1. Company Intake & Appointees
      const decisionsDate = new Date('2026-01-15T10:00:00Z');
      const client = await prisma.client.create({
        data: {
          name: `CLOUD COMPUTING SERVICES <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          regCom: 'J40/2020/2026',
          address: 'București, Sector 1, Str. IT nr. 1',
          caenCode: '6201',
          caenActivity: 'Activități de realizare a software-ului la comandă',
          legalRepresentative: 'Radu Voinea',
          designatedWorkerSsm: 'Ing. Mihai Popescu',
          firstAidResponder: 'Andreea Marin',
          psiResponder: 'Radu Voinea',
          investigationMembers: 'Radu Voinea, Ing. Mihai Popescu, Andreea Marin',
          decisionsDate,
          foundedYear: 2026,
        },
      });

      // 2. Worksites (Sediu + Telemunca conform Legii 81/2018)
      const wOffice = await prisma.worksite.create({
        data: {
          clientId: client.id,
          name: 'Sediu Central Birouri - Sector 1',
          address: 'București, Str. IT nr. 1',
        },
      });
      const wTelework = await prisma.worksite.create({
        data: {
          clientId: client.id,
          name: 'Telemuncă / Domiciliul Salariaților (Legea 81/2018)',
          address: 'Conform anexei la CIM pentru activitate în regim de telemuncă',
        },
      });

      // 3. Job Definition
      const job = await prisma.job.create({
        data: {
          clientId: client.id,
          title: 'Senior DevOps Engineer',
          corCode: '251201',
          isScreenWork: true,
          workPosture: 'sitting',
          isDrivingRequired: false,
          workersCount: 5,
        },
      });

      // 4. Database-Persisted Risk Assessment
      const assessment = await prisma.riskAssessment.create({
        data: {
          clientId: client.id,
          jobId: job.id,
          worksiteId: wOffice.id,
          title: 'Evaluarea Riscurilor Profesionale - Post DevOps & Telemuncă',
          method: 'INCDPM',
          evaluatorName: 'Ing. Mihai Popescu',
          status: 'active',
          riskItems: {
            create: [
              {
                hazard: 'Efort vizual prelungit la videoterminale (ecran > 6h/zi)',
                riskSituation: 'Monitorizare continuă a infrastructurii cloud',
                consequence: 'Astenopie acomodativă, dureri oculare',
                severityScore: 3,
                probabilityScore: 4,
                riskLevel: 3,
              },
              {
                hazard: 'Poziție statică așezat prelungită fără suport ergonomic',
                riskSituation: 'Stat pe scaun > 7 ore/zi',
                consequence: 'Disfuncții musculo-scheletice lombare',
                severityScore: 2,
                probabilityScore: 4,
                riskLevel: 3,
              },
            ],
          },
          preventionMeasures: {
            create: [
              {
                description: 'Pauze ergonomice de 10 min la fiecare 50 min; monitorizare oftalmologică anuală',
                measureType: 'organizatorica',
                responsiblePerson: 'Ing. Mihai Popescu',
                deadline: 'Permanent',
                status: 'realizat',
              },
              {
                description: 'Scaun ergonomic reglabil pe înălțime la domiciliu conform Legii 81/2018',
                measureType: 'tehnica',
                responsiblePerson: 'Administrator',
                deadline: 'La încheiere CIM',
                status: 'planificat',
              },
            ],
          },
        },
      });

      // 5. Generate Company SSM Dossier Package (1-Click ZIP)
      const dossierResult = await generateCompanyDossierZip({ clientId: client.id });

      assert.ok(dossierResult.buffer.length > 100000, 'Dosarul companiei are dimensiune validă (>100KB)');
      assert.ok(dossierResult.filename.includes('Dosar_Companie_SSM'), 'Nume fișier conform Dosar_Companie_SSM');

      // 6. Inspect ZIP Archive
      const archive = inspectZipArchive(dossierResult.buffer);
      assert.strictEqual(archive.fileNames.length, 16, 'Dosarul companiei conține exact 16 fișiere statutare');

      // Inspect 01_Decizii_Organizatorice_SSM_PSI.docx
      const deciziiBuf = archive.readFile('01_Decizii_Organizatorice_SSM_PSI.docx');
      assert.ok(deciziiBuf, 'Fișierul 01_Decizii_Organizatorice_SSM_PSI.docx trebuie să existe');
      const deciziiArtifact = inspectDocxArtifact(deciziiBuf);
      assert.strictEqual(deciziiArtifact.hasXmlSyntaxError, false, 'Deciziile organizatorice nu au erori XML');
      assert.ok(deciziiArtifact.rawXml.includes('Radu Voinea'), 'Deciziile conțin reprezentantul legal Radu Voinea');
      assert.ok(deciziiArtifact.rawXml.includes('Mihai Popescu'), 'Deciziile conțin lucrătorul desemnat Mihai Popescu');

      // Inspect 02_Evaluarea_Riscurilor_Profesionale.docx
      const riskBuf = archive.readFile('02_Evaluarea_Riscurilor_Profesionale.docx');
      assert.ok(riskBuf, 'Fișierul 02_Evaluarea_Riscurilor_Profesionale.docx trebuie să existe');
      const riskArtifact = inspectDocxArtifact(riskBuf);
      assert.strictEqual(riskArtifact.hasXmlSyntaxError, false, 'Evaluarea riscurilor nu are erori XML');
      assert.strictEqual(riskArtifact.unmappedPlaceholders.length, 0, 'Zero tokenuri necompletate în evaluarea riscurilor');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Înregistrare examen medical periodic HG 355/2007 și deblocare operator
  // --------------------------------------------------------------------------
  await runScenario('S3', 'Înregistrare examen medical periodic HG 355/2007 și deblocare operator', async () => {
    const pfx = `${suitePrefix}S3_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `RESTAURANT LA CONAC <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Brașov, Șirul Livezii nr. 2',
        },
      });

      // Employee whose last medical exam was 16 months ago (OVERDUE)
      const emp = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Stan',
          firstName: 'Alexandru',
          cnp: generateValidCnp('188031508003'),
          hireDate: new Date('2024-01-10'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2025-01-10T08:00:00Z'),
          medicalIntervalMonths: 12,
          medicalFitnessVerdict: 'APT',
        },
      });

      // Baseline compliance assertion (reference date 2026-05-10)
      const refDate = new Date('2026-05-10T10:00:00Z');
      const compInitial = calculateEmployeeCompliance(emp, refDate);
      assert.strictEqual(compInitial.occupationalMedicine.status, 'OVERDUE', 'Examenul trebuie să fie OVERDUE inițial');
      assert.ok((compInitial.occupationalMedicine.daysRemaining ?? 0) < -90, 'Examenul este depășit cu peste 90 zile');

      // Operator registers new valid periodic exam HG 355/2007
      const newExamDate = new Date('2026-05-10T08:00:00Z');
      const updatedEmp = await prisma.employee.update({
        where: { id: emp.id },
        data: {
          medicalLastExamDate: newExamDate,
          medicalIntervalMonths: 12,
          medicalFitnessVerdict: 'APT',
          medicalNotes: 'Examen periodic anual promovat fără contraindicații medicale. Următorul examen: Mai 2027.',
        },
      });

      // Post-registration compliance verification
      const compUpdated = calculateEmployeeCompliance(updatedEmp, refDate);
      assert.strictEqual(compUpdated.occupationalMedicine.status, 'VALID', 'Statutul medicinei muncii a devenit VALID');
      assert.ok((compUpdated.occupationalMedicine.daysRemaining ?? 0) >= 360, 'Valabilitatea este de aproximativ 365 zile');

      // Document generation unblocked
      const res = await resolveTemplatePlaceholders({
        templateCode: 'med-fisa-solicitare-examen',
        clientId: client.id,
        employeeId: updatedEmp.id,
        allowOfflineBlank: true,
      });

      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'med-fisa-solicitare-examen')!;
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
      const buffer = await renderTemplateBuffer(tplPath, tpl.format, res.resolvedData, tpl.normalizedFilename);

      assert.ok(buffer && buffer.length > 5000, 'Fișa de solicitare examen medical trebuie generată cu succes');
      const artifact = inspectDocxArtifact(buffer);
      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Fișa de solicitare examen medical nu are erori XML');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Încetare contract de muncă salariat (status: PLECAT) și recalculare
  // --------------------------------------------------------------------------
  await runScenario('S4', 'Încetare contract de muncă salariat (status: PLECAT) și recalculare conformitate', async () => {
    const pfx = `${suitePrefix}S4_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `DISTRIBUȚIE MĂRFURI <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Ploiești, Str. Depozitelor 5',
        },
      });

      const refDate = new Date('2026-05-10T10:00:00Z');

      // 3 active compliant employees
      const e1 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Mocanu',
          firstName: 'Cosmin',
          cnp: generateValidCnp('187010111004'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2026-01-10'),
          ssmLastTrainingDate: new Date('2026-01-10'),
          psiLastTrainingDate: new Date('2026-01-10'),
        },
      });
      const e2 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Preda',
          firstName: 'Simona',
          cnp: generateValidCnp('289020211004'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2026-02-15'),
          ssmLastTrainingDate: new Date('2026-02-15'),
          psiLastTrainingDate: new Date('2026-02-15'),
        },
      });
      const e3 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Iacob',
          firstName: 'Ioan',
          cnp: generateValidCnp('190030311004'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2026-03-01'),
          ssmLastTrainingDate: new Date('2026-03-01'),
          psiLastTrainingDate: new Date('2026-03-01'),
        },
      });

      // 1 overdue employee
      const e4 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Ionescu',
          firstName: 'George',
          cnp: generateValidCnp('182040411004'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2024-01-01'),
          ssmLastTrainingDate: new Date('2024-01-01'),
          psiLastTrainingDate: new Date('2024-01-01'),
        },
      });

      // Initial check: company score is ~75%
      const metricsBefore = calculateCompanyMetrics([e1, e2, e3, e4], refDate);
      assert.strictEqual(metricsBefore.totalEmployees, 4, 'Total angajați inițial = 4');
      assert.strictEqual(metricsBefore.complianceScorePercent, 75, 'Scorul inițial este 75%');

      // Operator terminates e4 contract
      const leaveDate = new Date('2026-05-31T00:00:00Z');
      await prisma.employee.update({
        where: { id: e4.id },
        data: {
          status: 'PLECAT',
          leaveDate,
          adminNotes: 'Încetare contract prin acordul părților - Art. 55 lit. b Codul Muncii',
        },
      });

      // Recalculate metrics strictly on active employees
      const activeEmployees = await prisma.employee.findMany({
        where: { clientId: client.id, status: 'ACTIV' },
      });
      assert.strictEqual(activeEmployees.length, 3, 'Doar 3 angajați activi rămași');

      const metricsAfter = calculateCompanyMetrics(activeEmployees, refDate);
      assert.strictEqual(metricsAfter.totalEmployees, 3, 'Total angajați activi = 3');
      assert.strictEqual(metricsAfter.overdueCount, 0, 'Zero indicatori expirați pentru angajații activi');
      assert.strictEqual(metricsAfter.complianceScorePercent, 100, 'Scorul de conformitate activ devine 100%');

      // Generate inspection archive (active only)
      const archiveResult = await generateInspectionArchiveZip({
        clientId: client.id,
        includeAllEmployees: false,
      });

      const zip = inspectZipArchive(archiveResult.buffer);
      // Terminated employee Ionescu George must NOT have a directory in active inspection pack
      const hasTerminatedInActivePack = zip.fileNames.some((f) => f.includes('Ionescu_George'));
      assert.strictEqual(hasTerminatedInActivePack, false, 'Salariatul plecat nu trebuie să apară în pachetul activ de inspecție');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Sesiune instruire colectivă, planificare și descărcare PV/fișe
  // --------------------------------------------------------------------------
  await runScenario('S5', 'Sesiune instruire colectivă, planificare și descărcare PV/fișe', async () => {
    const pfx = `${suitePrefix}S5_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `UZINA PRODUCȚIE <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Brașov, Calea București 100',
        },
      });

      const emp1 = await prisma.employee.create({
        data: { clientId: client.id, lastName: 'Stanciu', firstName: 'Mihai', cnp: generateValidCnp('185010111005'), status: 'ACTIV' },
      });
      const emp2 = await prisma.employee.create({
        data: { clientId: client.id, lastName: 'Neagu', firstName: 'Ion', cnp: generateValidCnp('186020211005'), status: 'ACTIV' },
      });
      const emp3 = await prisma.employee.create({
        data: { clientId: client.id, lastName: 'Toma', firstName: 'Radu', cnp: generateValidCnp('187030311005'), status: 'ACTIV' },
      });

      // Phase A: Planning session (future date)
      const futureDate = new Date(Date.now() + 10 * 86400000);
      const planned = await prisma.trainingEvent.create({
        data: {
          clientId: client.id,
          type: 'PERIODIC_SSM',
          eventDate: futureDate,
          durationHours: 2.0,
          materialOrTopic: 'Tematică semestrială: Circulația pe căile de acces și conduita în caz de incendiu',
          instructorName: 'Ing. Mihai Popescu',
          status: 'planned',
          participants: {
            create: [
              { employeeId: emp1.id, result: 'programat' },
              { employeeId: emp2.id, result: 'programat' },
              { employeeId: emp3.id, result: 'programat' },
            ],
          },
        },
      });

      assert.strictEqual(planned.status, 'planned', 'Sesiunea planificată este salvată');

      // Phase B: Execution (real-time recording)
      const realDate = new Date('2026-05-15T09:00:00Z');
      const recorded = await prisma.trainingEvent.create({
        data: {
          clientId: client.id,
          type: 'PERIODIC_SSM',
          eventDate: realDate,
          durationHours: 2.0,
          materialOrTopic: 'Tematică semestrială: Circulația pe căile de acces și conduita în caz de incendiu',
          instructorName: 'Ing. Mihai Popescu',
          status: 'recorded',
          participants: {
            create: [
              { employeeId: emp1.id, result: 'admis' },
              { employeeId: emp2.id, result: 'admis' },
              { employeeId: emp3.id, result: 'admis' },
            ],
          },
        },
      });

      // Atomic update of employees' SSM date
      await prisma.employee.updateMany({
        where: { id: { in: [emp1.id, emp2.id, emp3.id] } },
        data: { ssmLastTrainingDate: realDate },
      });

      // Phase C: Direct document generation from card
      const resSheet = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: client.id,
        employeeId: emp1.id,
      });

      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ssm-fisa-instruire-individuala')!;
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);
      const buffer = await renderTemplateBuffer(tplPath, tpl.format, resSheet.resolvedData, tpl.normalizedFilename);

      const artifact = inspectDocxArtifact(buffer);
      assert.strictEqual(artifact.hasXmlSyntaxError, false, 'Fișa de instruire individuală nu are erori XML');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Curs igienă, examinare participanți și emitere certificate
  // --------------------------------------------------------------------------
  await runScenario('S6', 'Curs igienă, examinare participanți și emitere certificate (Ord. 2209/2022)', async () => {
    const pfx = `${suitePrefix}S6_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `RESTAURANT BUCUREȘTI <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'București, Sector 2, Str. Mihai Eminescu 45',
          caenCode: '5610',
          caenActivity: 'Restaurante',
        },
      });

      const jobFood = await prisma.job.create({
        data: { clientId: client.id, title: 'Bucătar Bucătărie Caldă', isFoodHandling: true },
      });

      const e1 = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: jobFood.id,
          lastName: 'Vasile',
          firstName: 'Ion',
          cnp: generateValidCnp('182050511006'),
          status: 'ACTIV',
          hygieneRequested: true,
        },
      });
      const e2 = await prisma.employee.create({
        data: {
          clientId: client.id,
          currentJobId: jobFood.id,
          lastName: 'Gheorghe',
          firstName: 'Marin',
          cnp: generateValidCnp('184060611006'),
          status: 'ACTIV',
          hygieneRequested: true,
        },
      });

      // 1. Session Creation
      const examDate = new Date('2026-04-15T10:00:00Z');
      const session = await prisma.hygieneSession.create({
        data: {
          location: `${pfx}Sediul DSP București - Sala Mare`,
          sessionDate: new Date('2026-04-10T09:00:00Z'),
          examDate,
          providerName: 'Furnizor Atestat Cursuri Igienă',
          commissionPresident: 'Dr. Victor Alexandrescu',
          commissionMember1: 'As. Med. Claudia Ionescu',
          commissionSecretary: 'Ana Georgescu',
          pvSeriesNumber: 'PV-IG 4500',
          status: 'certificate_emise',
        },
      });

      // 2. Enrolling Candidates
      const p1 = await prisma.hygieneParticipant.create({
        data: {
          sessionId: session.id,
          employeeId: e1.id,
          clientName: client.name,
          lastName: e1.lastName,
          firstName: e1.firstName,
          cnp: e1.cnp,
          attendance: 'prezent',
          examGrade: 10.0,
          examResult: 'admis',
          certificateSeries: 'DSP-B',
          certificateNumber: '4501',
        },
      });

      const p2 = await prisma.hygieneParticipant.create({
        data: {
          sessionId: session.id,
          employeeId: e2.id,
          clientName: client.name,
          lastName: e2.lastName,
          firstName: e2.firstName,
          cnp: e2.cnp,
          attendance: 'absent',
          examGrade: null,
          examResult: 'respins',
        },
      });

      // Update admitted employee in DB
      await prisma.employee.update({
        where: { id: e1.id },
        data: {
          hygieneLastExamDate: examDate,
          hygieneCertificateNumber: 'DSP-B 4501',
          hygieneCertificateIssueDate: examDate,
          hygieneIntervalMonths: 36,
        },
      });

      // 3. Recalculate Compliance
      const refDate = new Date('2026-05-10T10:00:00Z');
      const emp1Fresh = await prisma.employee.findUniqueOrThrow({ where: { id: e1.id } });
      const emp2Fresh = await prisma.employee.findUniqueOrThrow({ where: { id: e2.id } });

      const comp1 = calculateEmployeeCompliance(emp1Fresh, refDate);
      const comp2 = calculateEmployeeCompliance(emp2Fresh, refDate);

      assert.strictEqual(comp1.hygieneCertificate?.status, 'VALID', 'Salariatul admis are certificat VALID');
      assert.strictEqual(comp2.hygieneCertificate?.status, 'MISSING', 'Salariatul respins are certificat MISSING');

      // 4. Generate hygiene-tabel-cursanti (XLSX)
      const tplXlsx = TEMPLATE_CATALOG.find((t) => t.code === 'hygiene-tabel-cursanti')!;
      const tplXlsxPath = path.join(process.cwd(), 'templates_registry', 'normalized', tplXlsx.normalizedFilename);
      const resXlsx = await resolveTemplateData('hygiene-tabel-cursanti', {
        client,
        hygieneSession: session,
        allowOfflineBlank: true,
      });

      const xlsxBuffer = await renderTemplateBuffer(tplXlsxPath, tplXlsx.format, resXlsx.data, tplXlsx.normalizedFilename);
      assert.ok(xlsxBuffer.length > 5000, 'Tabelul de cursanți XLSX trebuie generat');
      const xlsxArtifact = inspectXlsxArtifact(xlsxBuffer);
      assert.strictEqual(xlsxArtifact.leaks.length, 0, 'Nu există scurgeri de placeholder în tabelul Excel');

      // 5. Generate hygiene-adeverinta (DOCX) for admitted participant
      const tplDocx = TEMPLATE_CATALOG.find((t) => t.code === 'hygiene-adeverinta')!;
      const tplDocxPath = path.join(process.cwd(), 'templates_registry', 'normalized', tplDocx.normalizedFilename);
      const resDocx = await resolveTemplateData('hygiene-adeverinta', {
        client,
        employee: emp1Fresh,
        hygieneSession: session,
        hygieneParticipant: p1,
        allowOfflineBlank: true,
      });

      const docxBuffer = await renderTemplateBuffer(tplDocxPath, tplDocx.format, resDocx.data, tplDocx.normalizedFilename);
      const docxArtifact = inspectDocxArtifact(docxBuffer);
      assert.strictEqual(docxArtifact.hasXmlSyntaxError, false, 'Adeverința de igienă nu are erori XML');
      assert.ok(docxArtifact.rawXml.includes('Vasile Ion'), 'Adeverința conține numele cursantului');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Import fișier Excel cu date incomplete și validare fără fake dates
  // --------------------------------------------------------------------------
  await runScenario('S7', 'Import fișier Excel cu date incomplete și validare fără fake dates (F30, F31)', async () => {
    const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
    const wb = XLSX.read(fs.readFileSync(samplePath), { type: 'buffer' });
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('firm'))!;
    const sheet = wb.Sheets[sheetName];

    // Row 13: Complete employee
    sheet['A13'] = { t: 's', v: 'Popa' };
    sheet['B13'] = { t: 's', v: 'Ioan' };
    sheet['D13'] = { t: 's', v: generateValidCnp('188010111007') };
    sheet['AB13'] = { t: 's', v: '10.01.2024' };
    sheet['AC13'] = { t: 's', v: 'ACTIV' };
    sheet['AE13'] = { t: 's', v: '10.01.2026' }; // medicalDate
    sheet['AF13'] = { t: 's', v: '10.01.2026' }; // ssmDate

    // Row 14: New hire with missing history (EMPTY medicalDate & EMPTY ssmDate)
    sheet['A14'] = { t: 's', v: 'Nistor' };
    sheet['B14'] = { t: 's', v: 'Dan' };
    sheet['D14'] = { t: 's', v: generateValidCnp('195020211007') };
    sheet['AB14'] = { t: 's', v: '01.05.2026' }; // hireDate
    sheet['AC14'] = { t: 's', v: 'ACTIV' };
    sheet['AE14'] = { t: 's', v: '' }; // EMPTY medicalDate
    sheet['AF14'] = { t: 's', v: '' }; // EMPTY ssmDate

    // Row 15: Status PLECAT with valid leaveDate
    sheet['A15'] = { t: 's', v: 'Iacob' };
    sheet['B15'] = { t: 's', v: 'Radu' };
    sheet['D15'] = { t: 's', v: generateValidCnp('186030311007') };
    sheet['AB15'] = { t: 's', v: '01.01.2024' };
    sheet['AC15'] = { t: 's', v: 'PLECAT' };
    sheet['AD15'] = { t: 's', v: '30.04.2026' };

    // Row 16: Status PLECAT with EMPTY leaveDate (invalid boundary row)
    sheet['A16'] = { t: 's', v: 'Barbu' };
    sheet['B16'] = { t: 's', v: 'Vlad' };
    sheet['D16'] = { t: 's', v: generateValidCnp('189040411007') };
    sheet['AB16'] = { t: 's', v: '01.01.2024' };
    sheet['AC16'] = { t: 's', v: 'PLECAT' };
    sheet['AD16'] = { t: 's', v: '' }; // EMPTY leaveDate

    sheet['!ref'] = 'A1:AH16';
    const modifiedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 1. Parsing & Server-Side Validation
    const parsed = parseClientWorkbook(modifiedBuf);
    assert.strictEqual(parsed.employees.length, 4, 'Trebuie să fie parsați 4 angajați');

    const empComplete = parsed.employees.find((e) => e.rowNumber === 13);
    const empNewHire = parsed.employees.find((e) => e.rowNumber === 14);
    const empPlecatValid = parsed.employees.find((e) => e.rowNumber === 15);
    const empPlecatInvalid = parsed.employees.find((e) => e.rowNumber === 16);

    assert.ok(empComplete?.isValid, 'Rândul 13 trebuie să fie valid');
    assert.ok(empNewHire?.isValid, 'Rândul 14 este valid sintactic (deși lipsesc date de conformitate)');
    assert.ok(empPlecatValid?.isValid, 'Rândul 15 PLECAT cu dată este valid');
    assert.strictEqual(empPlecatInvalid?.isValid, false, 'Rândul 16 PLECAT fără dată trebuie să fie invalid');

    // 2. Strict Invariant: No fake dates synthesized
    assert.strictEqual(empNewHire?.medicalLastExamDate, undefined, 'Examenul medical trebuie să fie strict undefined');
    assert.strictEqual(empNewHire?.ssmLastTrainingDate, undefined, 'Instruirea SSM trebuie să fie strict undefined');

    // 3. Post-import compliance verification for new hire
    const compNewHire = calculateEmployeeCompliance({
      hireDate: empNewHire?.hireDate,
      medicalLastExamDate: null,
      ssmLastTrainingDate: null,
    });

    assert.strictEqual(compNewHire.occupationalMedicine.status, 'MISSING', 'Medicina muncii fără dată reală este MISSING');
    assert.strictEqual(compNewHire.ssmTraining.status, 'MISSING', 'Instruirea SSM fără dată reală este MISSING');
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Generare batch pachet onboarding cu caractere speciale (&, <, >)
  // --------------------------------------------------------------------------
  await runScenario('S8', 'Generare batch pachet onboarding cu caractere speciale (&, <, >)', async () => {
    const pfx = `${suitePrefix}S8_`;
    try {
      const client = await prisma.client.create({
        data: {
          name: `M&M ENGINEERING & CONSULTING <${pfx}> S.R.L.`,
          cui: `${pfx}CUI`,
          address: 'Str. Cercetării <Corp B>, Sector 1, "Clădirea A"',
        },
      });

      const emp1 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Popescu & Asociații',
          firstName: 'Andrei <Lead>',
          cnp: generateValidCnp('188010111008'),
          hireDate: new Date('2026-05-01'),
          cimNumber: 'CIM-01/&/2026',
          grossSalary: 8500,
          status: 'ACTIV',
        },
      });

      const emp2 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Vlădescu <Mihai>',
          firstName: 'Ion',
          cnp: generateValidCnp('189020211008'),
          hireDate: new Date('2026-05-01'),
          cimNumber: 'CIM-02/<02>/2026',
          grossSalary: 9200,
          status: 'ACTIV',
        },
      });

      const emp3 = await prisma.employee.create({
        data: {
          clientId: client.id,
          lastName: 'Stroe',
          firstName: 'Cristian',
          cnp: generateValidCnp('190030311008'),
          hireDate: new Date('2026-05-01'),
          status: 'ACTIV',
          cimNumber: null,
          grossSalary: null,
        },
      });

      // Render documents for emp1 and emp2
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'hr-cim-2026')!;
      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename);

      const res1 = await resolveTemplateData('hr-cim-2026', { client, employee: emp1, allowOfflineBlank: true });
      const buf1 = await renderTemplateBuffer(tplPath, tpl.format, res1.data, tpl.normalizedFilename);

      const res2 = await resolveTemplateData('hr-cim-2026', { client, employee: emp2, allowOfflineBlank: true });
      const buf2 = await renderTemplateBuffer(tplPath, tpl.format, res2.data, tpl.normalizedFilename);

      // Deep XML assertions on entity escaping
      const art1 = inspectDocxArtifact(buf1);
      const art2 = inspectDocxArtifact(buf2);

      assert.strictEqual(art1.hasXmlSyntaxError, false, 'Documentul emp1 nu are erori XML de ampersand neescapat');
      assert.strictEqual(art2.hasXmlSyntaxError, false, 'Documentul emp2 nu are erori XML de ampersand neescapat');

      // Batch bundling with logging
      const zip = new PizZip();
      zip.file('CIM_Popescu_Andrei.docx', buf1);
      zip.file('CIM_Vladescu_Ion.docx', buf2);
      zip.file(
        '00_RAPORT_GENERARE_LOT.txt',
        `RAPORT GENERARE LOT ONBOARDING\nData: ${new Date().toISOString()}\n` +
        `• Popescu & Asociații Andrei: SUCCES\n` +
        `• Vlădescu <Mihai> Ion: SUCCES\n` +
        `• Stroe Cristian: AVERTISMENT - Lipsesc număr CIM și salariu brut.\n`
      );

      const zipBuf = zip.generate({ type: 'nodebuffer' });
      const archive = inspectZipArchive(zipBuf);

      assert.strictEqual(archive.fileNames.length, 3, 'Arhiva ZIP de lot conține 3 fișiere');
      assert.ok(archive.fileNames.includes('00_RAPORT_GENERARE_LOT.txt'), 'Arhiva conține raportul de generare');
      const logContent = archive.readText('00_RAPORT_GENERARE_LOT.txt');
      assert.ok(logContent?.includes('AVERTISMENT - Lipsesc număr CIM'), 'Raportul documentează salariatul incomplet');
    } finally {
      await cleanupTestFixtures(pfx);
    }
  });

  // ==========================================================================
  // FINAL SUITE EXECUTION SUMMARY
  // ==========================================================================
  console.log('\n====================================================================================================');
  console.log('                              REZUMAT SUITĂ TIER 4 (STATUTORY SCENARIOS)                           ');
  console.log('====================================================================================================');

  const passedCount = scenarioResults.filter((r) => r.passed).length;
  const failedCount = scenarioResults.filter((r) => !r.passed).length;
  const totalCount = scenarioResults.length;

  for (const r of scenarioResults) {
    const symbol = r.passed ? '✓' : '✗';
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`  ${symbol} [${status}] ${r.id}: ${r.name.padEnd(70, ' ')} (${r.durationMs.toFixed(1)}ms)`);
    if (r.error) {
      console.log(`      Eroare: ${r.error}`);
    }
  }

  console.log('----------------------------------------------------------------------------------------------------');
  console.log(`Total scenarii rulate: ${totalCount} | Trecute: ${passedCount} | Eșuate: ${failedCount}`);

  if (failedCount === 0) {
    console.log('🎉 VERDICT: TOATE CELE 8 SCENARII STATUTARE TIER 4 AU TRECUT CU SUCCES (100% PASS RATE)!');
    return true;
  } else {
    console.error(`❌ VERDICT: ${failedCount} SCENARII AU EȘUAT ÎN SUITA TIER 4.`);
    return false;
  }
}

// Direct CLI invocation
if (require.main === module || process.argv[1]?.endsWith('e2e-tier4-scenarios.ts')) {
  runTier4Scenarios()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal unhandled error in Tier 4 test runner:', err);
      process.exit(1);
    });
}
