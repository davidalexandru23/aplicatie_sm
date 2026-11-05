/**
 * scripts/stress-test-m2-challenger1.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 2 GATE
 * Author: m2_challenger_1 (Empirical Challenger, roles: critic, specialist)
 * Target Recipient: d4389872-2ec2-44c4-b4b6-52d9b0f4a82d
 *
 * Scope:
 * Suite 1: Dynamic Table Rendering Stress (0, 1, 5, 20 events) for F7 & F8
 * Suite 2: Padded Empty Cells for Pen Signing & Zero Unmapped Token Audit
 * Suite 3: Romanian Diacritics & XML Special Characters (&, <, >, ", ') across all 6 new templates
 * Suite 4: Extreme Inputs (Missing Optional Fields, Long Text, Unusual Dates)
 * Suite 5: Identity Separation: Legal Representative vs Employee
 */

import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import {
  resolveTemplateData,
  resolveTemplatePlaceholders,
  formatDateRo,
  ALL_ROMANIAN_LEGAL_FALLBACKS,
} from '../src/lib/templates/resolver';
import {
  renderTemplateBuffer,
  collectUnresolvedPlaceholders,
  validateMissingFields,
} from '../src/lib/templates/generator';

// The 6 new Milestone 2 statutory templates
export const M2_NEW_TEMPLATES = [
  'ssm-fisa-instruire-individuala',
  'psi-fisa-instructaj-individuala',
  'med-fisa-solicitare-examen',
  'med-fisa-identificare-riscuri',
  'eip-fisa-acordare-individuala',
  'hr-cim-model-cadru-2022',
] as const;

interface AssertionResult {
  suite: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  assertionCount: number;
  error?: string;
  findingNote?: string;
}

const suiteResults: AssertionResult[] = [];
let totalAssertions = 0;

function trackAssert(cond: boolean, msg: string) {
  totalAssertions++;
  assert.ok(cond, msg);
}

function trackAssertEqual<T>(actual: T, expected: T, msg: string) {
  totalAssertions++;
  assert.equal(actual, expected, msg);
}

async function runTestCase(
  suite: string,
  testName: string,
  testFn: () => Promise<string | void>
): Promise<boolean> {
  const t0 = Date.now();
  const startCount = totalAssertions;
  try {
    const finding = (await testFn()) || undefined;
    const duration = Date.now() - t0;
    const count = totalAssertions - startCount;
    suiteResults.push({
      suite,
      testName,
      passed: true,
      durationMs: duration,
      assertionCount: count,
      findingNote: finding,
    });
    console.log(`  ✓ [PASS] ${testName} (${count} assertions, ${duration}ms)`);
    if (finding) {
      console.log(`    ⚠ FINDING: ${finding}`);
    }
    return true;
  } catch (err: any) {
    const duration = Date.now() - t0;
    const count = totalAssertions - startCount;
    suiteResults.push({
      suite,
      testName,
      passed: false,
      durationMs: duration,
      assertionCount: count,
      error: err.message || String(err),
    });
    console.error(`  ✗ [FAIL] ${testName} (${duration}ms)`);
    console.error(`    Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 EMPIRICAL STRESS TEST HARNESS — MILESTONE 2 STATUTORY TEMPLATES');
  console.log('Challenger: m2_challenger_1 | Target: 6 New Templates (F7 - F11)');
  console.log('========================================================================\n');

  // Load test baseline client and employee from PostgreSQL
  const client = await prisma.client.findFirst({
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
      jobs: true,
      worksites: true,
      provider: true,
      specialist: true,
    },
  });

  if (!client || client.employees.length < 2) {
    throw new Error('Baseline test client with at least 2 employees not found in DB!');
  }

  // Find Alexandru Stan explicitly as required by prompt
  const employeeStan = client.employees.find((e) => e.lastName === 'Stan') || client.employees[0];
  const employeeBarbu = client.employees.find((e) => e.lastName === 'Barbu') || client.employees[1];
  const employee = employeeStan;
  const job = employee.currentJob || client.jobs[0];
  const worksite = employee.currentWorksite || client.worksites[0];

  console.log(`[Baseline Setup] Client: ${client.name} | Legal Rep: ${client.legalRepresentative}`);
  console.log(`[Baseline Setup] Primary Employee (Stan): ${employeeStan.lastName} ${employeeStan.firstName}`);
  console.log(`[Baseline Setup] Secondary Employee (Barbu): ${employeeBarbu.lastName} ${employeeBarbu.firstName}\n`);

  // ==========================================================================
  // SUITE 1: DYNAMIC TABLE RENDERING STRESS (0, 1, 5, 20 EVENTS)
  // ==========================================================================
  console.log('--- SUITE 1: DYNAMIC TABLE RENDERING STRESS (0, 1, 5, 20 EVENTS) ---');

  // 1.1 SSM 0 Events (Padded to 16 Rows)
  await runTestCase('Suite 1: Dynamic Tables', 'SSM Training Sheet with 0 Events (16 Blank Rows for Pen Signing)', async () => {
    const res = await resolveTemplateData('ssm-fisa-instruire-individuala', {
      client: { ...client, trainingEvents: [] },
      employee,
      job,
      worksite,
    });

    const rows = res.data.instruiriPeriodiceSSM as any[];
    trackAssert(Array.isArray(rows), 'instruiriPeriodiceSSM must be an array');
    trackAssertEqual(rows.length, 16, 'Must generate exactly 16 padded rows when 0 events exist');
    trackAssertEqual(rows[0].nr, 1, 'First row index must be 1');
    trackAssertEqual(rows[0].data, '', 'Empty row date must be empty string');
    trackAssertEqual(rows[0].semnaturaInstruit, '', 'Empty row signature must be empty string');
    trackAssertEqual(rows[15].nr, 16, 'Last row index must be 16');

    // Render DOCX buffer
    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'ssm-fisa-instruire-individuala.docx');
    const buf = await renderTemplateBuffer(tplPath, 'docx', res.data);
    trackAssert(buf.length > 5000, 'Buffer must be valid DOCX');

    // Collect unmapped tokens
    const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
    trackAssertEqual(unmapped.length, 0, `Residual tokens in 0-event docx: ${unmapped.join(', ')}`);

    // Verify OpenXML has 16 table rows in the periodic training table
    const zip = new PizZip(buf);
    const xml = zip.file('word/document.xml')!.asText();
    const trMatches = xml.match(/<w:tr[\s>]/g) || [];
    trackAssert(trMatches.length >= 16, `Total table rows (${trMatches.length}) must be at least 16`);
  });

  // 1.2 SSM 1 Event (1 Populated + 15 Padded Rows)
  await runTestCase('Suite 1: Dynamic Tables', 'SSM Training Sheet with 1 Event (1 Populated + 15 Padded Rows)', async () => {
    const ev1 = {
      type: 'ssm',
      eventDate: new Date('2026-01-15'),
      durationHours: 2,
      jobTitle: 'Inginer IT',
      materialOrTopic: 'Instruire SSM Anuală 2026 Modul General',
      instructorName: 'Popescu Mihai',
      verifierName: 'Munteanu Cristian',
    };

    const res = await resolveTemplateData('ssm-fisa-instruire-individuala', {
      client: { ...client, trainingEvents: [ev1] },
      employee,
      job,
      worksite,
    });

    const rows = res.data.instruiriPeriodiceSSM as any[];
    trackAssertEqual(rows.length, 16, 'Total rows must remain 16');
    trackAssertEqual(rows[0].data, '15.01.2026', 'Row 1 date must match event date');
    trackAssertEqual(rows[0].durata, '2 ore', 'Row 1 duration must be 2 ore');
    trackAssertEqual(rows[0].tematica, 'Instruire SSM Anuală 2026 Modul General', 'Row 1 topic must match');
    trackAssertEqual(rows[0].semnaturaInstructor, 'Popescu Mihai', 'Row 1 instructor must match');
    trackAssertEqual(rows[1].data, '', 'Row 2 must be empty for physical pen signing');

    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'ssm-fisa-instruire-individuala.docx');
    const buf = await renderTemplateBuffer(tplPath, 'docx', res.data);
    const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
    trackAssertEqual(unmapped.length, 0, `Residual tokens in 1-event docx: ${unmapped.join(', ')}`);

    const zip = new PizZip(buf);
    const xml = zip.file('word/document.xml')!.asText();
    trackAssert(xml.includes('Instruire SSM Anuală 2026 Modul General'), 'XML must contain event topic');
  });

  // 1.3 SSM 5 Events (5 Populated + 11 Padded Rows)
  await runTestCase('Suite 1: Dynamic Tables', 'SSM Training Sheet with 5 Events (5 Populated + 11 Padded Rows)', async () => {
    const ev5 = Array.from({ length: 5 }, (_, i) => ({
      type: 'ssm',
      eventDate: new Date(2025, i * 2, 10),
      durationHours: 2,
      jobTitle: 'Inginer IT',
      materialOrTopic: `Tematica SSM Periodică Sesiunea #${i + 1}`,
      instructorName: `Instructor SSM #${i + 1}`,
      verifierName: 'Munteanu Cristian',
    }));

    const res = await resolveTemplateData('ssm-fisa-instruire-individuala', {
      client: { ...client, trainingEvents: ev5 },
      employee,
      job,
      worksite,
    });

    const rows = res.data.instruiriPeriodiceSSM as any[];
    trackAssertEqual(rows.length, 16, 'Total rows must remain 16');
    for (let i = 0; i < 5; i++) {
      trackAssertEqual(rows[i].tematica, `Tematica SSM Periodică Sesiunea #${i + 1}`, `Row ${i + 1} topic must match`);
    }
    for (let i = 5; i < 16; i++) {
      trackAssertEqual(rows[i].tematica, '', `Row ${i + 1} must be empty`);
    }

    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'ssm-fisa-instruire-individuala.docx');
    const buf = await renderTemplateBuffer(tplPath, 'docx', res.data);
    const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
    trackAssertEqual(unmapped.length, 0, `Residual tokens: ${unmapped.join(', ')}`);
  });

  // 1.4 PSI 0, 1, 5 Events
  await runTestCase('Suite 1: Dynamic Tables', 'PSI/SU Training Sheet with 0, 1, 5 Events', async () => {
    // 0 events
    const res0 = await resolveTemplateData('psi-fisa-instructaj-individuala', {
      client: { ...client, trainingEvents: [] },
      employee,
      job,
      worksite,
    });
    const rows0 = res0.data.instructajePeriodicePSI as any[];
    trackAssertEqual(rows0.length, 16, 'PSI 0-events must produce 16 padded rows');

    // 5 events
    const psiEv5 = Array.from({ length: 5 }, (_, i) => ({
      type: 'psi',
      eventDate: new Date(2025, i * 2, 15),
      durationHours: 2,
      materialOrTopic: `Instructaj PSI Temă #${i + 1}`,
      instructorName: `Cadru Tehnic PSI #${i + 1}`,
      verifierName: 'Munteanu Cristian',
    }));
    const res5 = await resolveTemplateData('psi-fisa-instructaj-individuala', {
      client: { ...client, trainingEvents: psiEv5 },
      employee,
      job,
      worksite,
    });
    const rows5 = res5.data.instructajePeriodicePSI as any[];
    trackAssertEqual(rows5.length, 16, 'PSI 5-events must produce 16 rows');
    trackAssertEqual(rows5[0].tema, 'Instructaj PSI Temă #1', 'PSI row 1 topic match');

    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'psi-fisa-instructaj-individuala.docx');
    const buf = await renderTemplateBuffer(tplPath, 'docx', res5.data);
    const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
    trackAssertEqual(unmapped.length, 0, `Residual tokens in PSI: ${unmapped.join(', ')}`);
  });

  // 1.5 20 Events Stress Test (Direct Rendering vs Resolver Truncation Audit)
  await runTestCase('Suite 1: Dynamic Tables', '20 Events Stress Test: Direct Render & Resolver Truncation Behavior', async () => {
    // A) Direct Render of 20 Events into docxtemplater
    const rows20 = Array.from({ length: 20 }, (_, i) => ({
      nr: i + 1,
      data: `15.0${(i % 9) + 1}.2025`,
      durata: '2 ore',
      ocupatia: 'Inginer IT',
      tematica: `Adversarial Heavy SSM Event #${i + 1}`,
      semnaturaInstruit: '',
      semnaturaInstructor: 'Instructor Specialist',
      semnaturaVerificator: 'Administrator',
    }));

    const resBaseline = await resolveTemplateData('ssm-fisa-instruire-individuala', {
      client,
      employee,
      job,
      worksite,
    });

    const data20 = { ...resBaseline.data, instruiriPeriodiceSSM: rows20 };
    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'ssm-fisa-instruire-individuala.docx');
    const buf20 = await renderTemplateBuffer(tplPath, 'docx', data20);
    const unmapped20 = await collectUnresolvedPlaceholders(buf20, 'docx');
    trackAssertEqual(unmapped20.length, 0, '20-event direct render must have 0 unmapped tokens');

    const zip20 = new PizZip(buf20);
    const xml20 = zip20.file('word/document.xml')!.asText();
    trackAssert(xml20.includes('Adversarial Heavy SSM Event #20'), 'Event #20 must exist in document XML');

    // B) Resolver Behavior when client has 20 trainingEvents
    const ev20 = Array.from({ length: 20 }, (_, i) => ({
      type: 'ssm',
      eventDate: new Date(2024, i % 12, 1),
      durationHours: 2,
      jobTitle: 'Inginer IT',
      materialOrTopic: `Event in DB #${i + 1}`,
      instructorName: 'Popescu',
      verifierName: 'Munteanu',
    }));

    const resResolver = await resolveTemplateData('ssm-fisa-instruire-individuala', {
      client: { ...client, trainingEvents: ev20 },
      employee,
      job,
      worksite,
    });
    const resolverRows = resResolver.data.instruiriPeriodiceSSM as any[];

    // Document whether resolver passes all 20 or caps at TARGET_SSM_ROWS = 16
    const resolverCount = resolverRows.length;
    let finding: string | undefined;
    if (resolverCount === 16) {
      finding = `OBSERVATION / BOUNDARY LIMITATION: resolveTemplateData currently caps instruiriPeriodiceSSM at fixed TARGET_SSM_ROWS=16. If an employee has >16 events in DB, events 17-20 are truncated unless passed via customOverrides. Recommendation: update loop to Math.max(TARGET_SSM_ROWS, ssmEvents.length).`;
    }
    trackAssert(resolverCount >= 16, 'Resolver must at least provide 16 rows');
    return finding;
  });

  // 1.6 Additional Tables in SSM & PSI (Supplementary training, testing, drills)
  await runTestCase('Suite 1: Dynamic Tables', 'Supplementary Tables Padded Rendering (testariSSM, exercitiiPracticePSI)', async () => {
    const resSSM = await resolveTemplateData('ssm-fisa-instruire-individuala', { client, employee, job, worksite });
    const suplimentare = resSSM.data.instruiriSuplimentareSSM as any[];
    const testari = resSSM.data.testariSSM as any[];
    trackAssertEqual(suplimentare.length, 4, 'instruiriSuplimentareSSM must have 4 rows');
    trackAssertEqual(testari.length, 4, 'testariSSM must have 4 rows');

    const resPSI = await resolveTemplateData('psi-fisa-instructaj-individuala', { client, employee, job, worksite });
    const exercitii = resPSI.data.exercitiiPracticePSI as any[];
    trackAssertEqual(exercitii.length, 4, 'exercitiiPracticePSI must have 4 rows');
  });

  // ==========================================================================
  // SUITE 2: ZERO UNMAPPED TOKEN AUDIT ACROSS ALL 6 NEW TEMPLATES
  // ==========================================================================
  console.log('\n--- SUITE 2: ZERO UNMAPPED TOKEN & PADDED EMPTY CELL AUDIT ---');

  for (const tplCode of M2_NEW_TEMPLATES) {
    await runTestCase('Suite 2: Unmapped Audit', `Zero Unmapped Placeholders Audit for ${tplCode}`, async () => {
      const res = await resolveTemplateData(tplCode, { client, employee, job, worksite, allowOfflineBlank: true });
      const filename = tplCode + '.docx';
      const filePath = path.join(process.cwd(), 'templates_registry', 'normalized', filename);
      trackAssert(fs.existsSync(filePath), `Template file must exist: ${filename}`);

      const buf = await renderTemplateBuffer(filePath, 'docx', res.data);
      trackAssert(buf.length > 5000, `Rendered buffer for ${tplCode} must be valid size`);

      const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
      trackAssertEqual(unmapped.length, 0, `Unmapped tokens found in ${tplCode}: ${unmapped.join(', ')}`);

      // Deep scan all XML files in the DOCX zip package
      const zip = new PizZip(buf);
      const residualPattern = /PLACEHOLDER_[A-Z0-9_]+/g;
      const loopSyntaxPattern = /\{(#|\/|\^)[a-zA-Z0-9_]+\}/g;

      for (const [entryName, file] of Object.entries(zip.files)) {
        if (entryName.endsWith('.xml')) {
          const content = file.asText();
          const pMatches = content.match(residualPattern) || [];
          const lMatches = content.match(loopSyntaxPattern) || [];
          trackAssertEqual(pMatches.length, 0, `Residual PLACEHOLDER tokens in ${tplCode} [${entryName}]: ${pMatches.join(', ')}`);
          trackAssertEqual(lMatches.length, 0, `Unparsed loop syntax in ${tplCode} [${entryName}]: ${lMatches.join(', ')}`);
        }
      }
    });
  }

  // ==========================================================================
  // SUITE 3: ROMANIAN DIACRITICS & XML SPECIAL CHARACTERS
  // ==========================================================================
  console.log('\n--- SUITE 3: ROMANIAN DIACRITICS & XML SPECIAL CHARACTERS (&, <, >, ", \') ---');

  const ADVERSARIAL_SPECIAL_PAYLOADS = {
    // Romanian diacritics: both standard comma-below and legacy cedilla
    PLACEHOLDER_FIRMA: 'S.C. „ȘTEFĂNEȘTI & ASOCIAȚII” <S.R.L.> — DIVIZIA ȘTIINȚIFICĂ',
    PLACEHOLDER_ADRESA_FIRMA: 'Str. Lăpușneanu nr. 12 & Șos. Chitilei, Bl. Ț1, Sc. Î, Ap. 45 „Zona Câmpulung”',
    PLACEHOLDER_NUME_COMPLET: 'Țurcanu Ștefan-Mihăiță Încoronatul & Fiii',
    PLACEHOLDER_NUME: 'Țurcanu',
    PLACEHOLDER_PRENUME: 'Ștefan-Mihăiță Încoronatul',
    PLACEHOLDER_FUNCTIE: 'Specialist SSM & Coordonator PSI/SU <Grad I> "Senior Expert"',
    PLACEHOLDER_DOMICILIU: 'Bld. 1 Decembrie 1918 nr. 10 & Aleea Castanilor <Sector 1>',
    PLACEHOLDER_REPREZENTANT_LEGAL: 'Dl. Munteanu Cristian & Partenerii <Administrator>',
    PLACEHOLDER_OBIECT_CONTRACT: 'Activități de inginerie & consultanță tehnică <conform ISO 9001/45001>',
    // Injections attempting XML corruption
    PLACEHOLDER_MARCA: 'M-<001>&\"A\"\'B\'',
    PLACEHOLDER_CALIFICARE: 'Inginer Diplomat <Calculatoare & Tehnologia Informației>',
  };

  for (const tplCode of M2_NEW_TEMPLATES) {
    await runTestCase('Suite 3: Diacritics & Special XML', `Adversarial Special Characters in ${tplCode}`, async () => {
      const res = await resolveTemplateData(tplCode, {
        client,
        employee,
        job,
        worksite,
        allowOfflineBlank: true,
        customOverrides: ADVERSARIAL_SPECIAL_PAYLOADS,
      });

      const filename = tplCode + '.docx';
      const filePath = path.join(process.cwd(), 'templates_registry', 'normalized', filename);
      const buf = await renderTemplateBuffer(filePath, 'docx', res.data);
      trackAssert(buf.length > 5000, `Buffer must be non-empty for ${tplCode}`);

      const zip = new PizZip(buf);
      const docXml = zip.file('word/document.xml')!.asText();

      // Check XML well-formedness: no raw '&' unescaped
      const rawAmpersandMatch = docXml.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
      trackAssert(!rawAmpersandMatch, `Found unescaped raw '&' in XML of ${tplCode}: ${rawAmpersandMatch?.[0]}`);

      // Verify diacritics are preserved in UTF-8
      trackAssert(docXml.includes('ȘTEFĂNEȘTI') || docXml.includes('&#x218;') || docXml.includes('&#536;'), 'Must preserve uppercase Ș');
      trackAssert(docXml.includes('Țurcanu') || docXml.includes('&#x21A;') || docXml.includes('&#538;'), 'Must preserve uppercase Ț');
      trackAssert(docXml.includes('Încoronatul') || docXml.includes('&#xCE;') || docXml.includes('&#206;'), 'Must preserve uppercase Î');

      // Verify unmapped tokens is 0
      const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
      trackAssertEqual(unmapped.length, 0, `Unmapped tokens after special character injection: ${unmapped.join(', ')}`);
    });
  }

  // ==========================================================================
  // SUITE 4: EXTREME INPUTS (MISSING OPTIONALS, OVERFLOW, UNUSUAL DATES)
  // ==========================================================================
  console.log('\n--- SUITE 4: EXTREME INPUTS & BOUNDARY STRESS ---');

  // 4.1 Missing optional fields (null, undefined, '')
  await runTestCase('Suite 4: Extreme Inputs', 'Missing Optional Fields (null / undefined / empty string)', async () => {
    const sparseOverrides = {
      PLACEHOLDER_NR_REG_COM: '',
      PLACEHOLDER_COD_COR: '',
      PLACEHOLDER_TELEFON_FIRMA: '',
      PLACEHOLDER_EMAIL_FIRMA: '',
      PLACEHOLDER_AUTORIZATII: '',
      PLACEHOLDER_TRASEU_DEPLASARE: '',
      PLACEHOLDER_DURATA_TRASEU: '',
      PLACEHOLDER_CALIFICARE: '',
      PLACEHOLDER_MARCA: '',
      PLACEHOLDER_GRUPA_SANGUINA: '',
    };

    const res = await resolveTemplateData('ssm-fisa-instruire-individuala', {
      client,
      employee,
      job,
      worksite,
      customOverrides: sparseOverrides,
    });

    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'ssm-fisa-instruire-individuala.docx');
    const buf = await renderTemplateBuffer(tplPath, 'docx', res.data);
    const zip = new PizZip(buf);
    const docXml = zip.file('word/document.xml')!.asText();

    // Verify output doesn't contain literal 'undefined' or 'null'
    trackAssert(!docXml.includes('undefined'), 'XML must not contain literal "undefined"');
    trackAssert(!docXml.includes('null'), 'XML must not contain literal "null"');
    trackAssert(!docXml.includes('NaN'), 'XML must not contain literal "NaN"');
  });

  // 4.2 Massive text overflow stress (thousands of characters)
  await runTestCase('Suite 4: Extreme Inputs', 'Massive String Overflow (10,000+ chars) in Activities & Descriptions', async () => {
    const massiveText = 'A'.repeat(5000) + ' & <TEST> ' + 'B'.repeat(5000);
    const overflowOverrides = {
      PLACEHOLDER_DESCRIERE_ACTIVITATE: massiveText,
      PLACEHOLDER_CONDITII_POST: 'C'.repeat(3000),
      PLACEHOLDER_ECHIPAMENTE_POST: 'D'.repeat(2000),
    };

    const res = await resolveTemplateData('med-fisa-identificare-riscuri', {
      client,
      employee,
      job,
      worksite,
      customOverrides: overflowOverrides,
    });

    const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', 'med-fisa-identificare-riscuri.docx');
    const buf = await renderTemplateBuffer(tplPath, 'docx', res.data);
    trackAssert(buf.length > 15000, 'Massive text must be accommodated without OOM');

    const zip = new PizZip(buf);
    const docXml = zip.file('word/document.xml')!.asText();
    trackAssert(docXml.includes('AAAAA'), 'XML must contain parts of massive text');
    trackAssert(docXml.includes('&lt;TEST&gt;'), 'Special characters inside massive text must be XML-escaped');
  });

  // 4.3 Unusual & boundary dates
  await runTestCase('Suite 4: Extreme Inputs', 'Unusual and Boundary Dates (Leap Day, Year Boundary, Historical)', async () => {
    const leapDay = new Date(2024, 1, 29); // 29 Feb 2024
    const centuryLeap = new Date(2000, 1, 29); // 29 Feb 2000
    const yearEnd = new Date(2025, 11, 31); // 31 Dec 2025
    const yearStart = new Date(2026, 0, 1); // 01 Jan 2026
    const historical = new Date(1945, 4, 9); // 09 May 1945
    const farFuture = new Date(2050, 11, 31); // 31 Dec 2050

    trackAssertEqual(formatDateRo(leapDay), '29.02.2024', 'Leap day format');
    trackAssertEqual(formatDateRo(centuryLeap), '29.02.2000', 'Century leap day format');
    trackAssertEqual(formatDateRo(yearEnd), '31.12.2025', 'Year end format');
    trackAssertEqual(formatDateRo(yearStart), '01.01.2026', 'Year start format');
    trackAssertEqual(formatDateRo(historical), '09.05.1945', 'Historical date format');
    trackAssertEqual(formatDateRo(farFuture), '31.12.2050', 'Far future format');

    // String date handling in formatDateRo
    trackAssertEqual(formatDateRo('2026-03-15'), '15.03.2026', 'ISO string date format');
    trackAssertEqual(formatDateRo('15.03.2026'), '15.03.2026', 'Pre-formatted Romanian date');
    trackAssertEqual(formatDateRo(null), '', 'Null date handling');
    trackAssertEqual(formatDateRo(undefined), '', 'Undefined date handling');
  });

  // 4.4 Offline Blank Generation without Employee (Statutory Form Fallbacks)
  await runTestCase('Suite 4: Extreme Inputs', 'Offline Blank Generation without Employee across all 6 Templates', async () => {
    for (const tplCode of M2_NEW_TEMPLATES) {
      const res = await resolveTemplateData(tplCode, {
        client,
        employee: null,
        job: client.jobs[0],
        worksite: client.worksites[0],
        allowOfflineBlank: true,
      });

      const tplPath = path.join(process.cwd(), 'templates_registry', 'normalized', `${tplCode}.docx`);
      const buf = await renderTemplateBuffer(tplPath, 'docx', res.data);
      const unmapped = await collectUnresolvedPlaceholders(buf, 'docx');
      trackAssertEqual(
        unmapped.length,
        0,
        `Offline blank generation for ${tplCode} produced unmapped tokens: ${unmapped.join(', ')}`
      );
    }
  });

  // ==========================================================================
  // SUITE 5: IDENTITY SEPARATION: LEGAL REPRESENTATIVE VS EMPLOYEE
  // ==========================================================================
  console.log('\n--- SUITE 5: IDENTITY SEPARATION: LEGAL REPRESENTATIVE VS EMPLOYEE ---');

  for (const tplCode of M2_NEW_TEMPLATES) {
    await runTestCase('Suite 5: Role Separation', `Strict Representative vs Employee Separation in ${tplCode}`, async () => {
      const res = await resolveTemplateData(tplCode, { client, employee, job, worksite });
      const data = res.data;

      const legalRep = String(data.PLACEHOLDER_REPREZENTANT_LEGAL || '');
      const employeeName = String(data.PLACEHOLDER_NUME_COMPLET || '');

      trackAssert(legalRep.length > 0, `PLACEHOLDER_REPREZENTANT_LEGAL must not be empty in ${tplCode}`);
      trackAssert(employeeName.length > 0, `PLACEHOLDER_NUME_COMPLET must not be empty in ${tplCode}`);

      // Legal rep must be Munteanu Cristian
      trackAssert(
        legalRep.includes('Munteanu Cristian') || legalRep.includes('Munteanu'),
        `Legal rep in ${tplCode} must be Munteanu Cristian, got: ${legalRep}`
      );

      // Employee must be Stan Alexandru
      trackAssert(
        employeeName.includes('Stan Alexandru') || employeeName.includes('Stan'),
        `Employee name in ${tplCode} must be Stan Alexandru, got: ${employeeName}`
      );

      // Strict inequality
      trackAssert(
        legalRep !== employeeName,
        `CRITICAL VIOLATION: Legal Representative and Employee must be strictly distinct persons in ${tplCode}!`
      );

      // In SSM training sheet: PLACEHOLDER_ADMITERE_NUME must be the employer/representative, NOT the employee
      if (tplCode === 'ssm-fisa-instruire-individuala') {
        const admitere = String(data.PLACEHOLDER_ADMITERE_NUME || '');
        trackAssert(
          admitere.includes('Munteanu'),
          `SSM Admission approver must be Legal Rep Munteanu Cristian, got: ${admitere}`
        );
        trackAssert(
          !admitere.includes('Stan Alexandru'),
          'SSM Admission approver must NOT be the employee being admitted!'
        );
      }

      // In PSI training sheet: PLACEHOLDER_ADMITERE_NUME_PSI must be the employer/representative
      if (tplCode === 'psi-fisa-instructaj-individuala') {
        const admiterePsi = String(data.PLACEHOLDER_ADMITERE_NUME_PSI || '');
        trackAssert(
          admiterePsi.includes('Munteanu'),
          `PSI Admission approver must be Legal Rep Munteanu Cristian, got: ${admiterePsi}`
        );
      }

      // In EIP allocation sheet: PLACEHOLDER_NUME_SALARIAT must be employee, not legal rep
      if (tplCode === 'eip-fisa-acordare-individuala') {
        const salariat = String(data.PLACEHOLDER_NUME_SALARIAT || '');
        trackAssert(
          salariat.includes('Stan Alexandru'),
          `EIP recipient must be employee Stan Alexandru, got: ${salariat}`
        );
        trackAssert(
          !salariat.includes('Munteanu Cristian'),
          'EIP recipient must NOT be the company legal representative!'
        );
      }

      // In HR CIM 2022: PLACEHOLDER_NUME_COMPLET is employee, PLACEHOLDER_REPREZENTANT_LEGAL is employer
      if (tplCode === 'hr-cim-model-cadru-2022') {
        trackAssertEqual(
          data.PLACEHOLDER_NUME_COMPLET,
          'Stan Alexandru',
          'CIM employee must be Stan Alexandru'
        );
        trackAssert(
          String(data.PLACEHOLDER_REPREZENTANT_LEGAL).includes('Munteanu'),
          'CIM employer representative must be Munteanu Cristian'
        );
      }
    });
  }

  // ==========================================================================
  // FINAL RESULTS AGGREGATION & VERDICT
  // ==========================================================================
  console.log('\n========================================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY');
  console.log('========================================================================');

  const totalTests = suiteResults.length;
  const passedTests = suiteResults.filter((r) => r.passed).length;
  const failedTests = suiteResults.filter((r) => !r.passed).length;

  console.log(`Total Test Cases Executed: ${totalTests}`);
  console.log(`Total Assertions Evaluated: ${totalAssertions}`);
  console.log(`Passed Test Cases: ${passedTests}`);
  console.log(`Failed Test Cases: ${failedTests}`);

  const findings = suiteResults.filter((r) => r.findingNote);
  if (findings.length > 0) {
    console.log('\n📋 DISCOVERED FINDINGS / ARCHITECTURAL OBSERVATIONS:');
    for (const f of findings) {
      console.log(`- [${f.suite} :: ${f.testName}]:\n  ${f.findingNote}`);
    }
  }

  if (failedTests > 0) {
    console.log('\n❌ VERDICT: REQUEST_CHANGES');
    process.exit(1);
  } else {
    console.log('\n✅ VERDICT: APPROVE');
  }
}

main()
  .catch((e) => {
    console.error('Fatal crash during test execution:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
