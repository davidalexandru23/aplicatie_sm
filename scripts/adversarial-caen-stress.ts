/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST HARNESS: CAEN RISK PROFILES & TEMPLATE RESOLUTION
 * ============================================================================
 * 
 * Independent Verification Suite for Milestone 1 Round 2:
 * 1. CAEN Catalog Exhaustive Audit (all entries in CAEN_CATALOG)
 * 2. Pece Formula Mathematical Invariant Verification: N_rg == Sum(R_i^2) / Sum(R_i)
 * 3. 7x6 Matrix Conformance: R_i == PECE_RISK_MATRIX[G_i - 1][P_i - 1]
 * 4. Adversarial Edge Cases: Unknown CAENs ("9999", "ABCD", "", numbers, objects)
 * 5. Job Title Adaptations: Administrative, Executive, Operational, Field
 * 6. Template Resolution Matrix (risk-evaluare, ipssm-tesa, decizii-angajator x 4 CAEN scenarios)
 * 7. Content Disambiguation: CAEN 5610 (Restaurant) vs CAEN 6201 (IT / Software)
 * 8. Physical DOCX Buffer Generation & Zero-Token Leak Audit
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { CAEN_CATALOG, CaenEntry, getCaenEntry, searchCaen } from '../src/lib/caen-catalog';
import {
  getRiskProfileForCaen,
  CAEN_RISK_PROFILES,
  PECE_RISK_MATRIX,
  calculatePecePartialRisk,
  calculateGlobalRiskScore,
  CaenRiskProfile,
  RiskPresetItem,
} from '../src/lib/risk/caen-risk-presets';
import { resolveTemplateData, TemplateResolutionResult } from '../src/lib/templates/resolver';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, description: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    failureDetails.push(description);
    console.error(`  ❌ ASSERTION FAILED: ${description}`);
  }
}

function assertCloseTo(actual: number, expected: number, delta: number, description: string) {
  totalAssertions++;
  const diff = Math.abs(actual - expected);
  if (diff <= delta) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const msg = `${description} -> expected ${expected} ± ${delta}, got ${actual} (diff: ${diff.toFixed(6)})`;
    failureDetails.push(msg);
    console.error(`  ❌ ASSERTION FAILED: ${msg}`);
  }
}

async function runAdversarialCaenStressTest() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('⚡ ADVERSARIAL STRESS TEST: CAEN RISK PROFILES & TEMPLATES');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: CAEN Catalog Exhaustive Audit & Mathematical Invariants
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: CAEN Catalog Exhaustive Audit (All Entries) ---');
  assert(CAEN_CATALOG.length >= 20, `CAEN_CATALOG contains at least 20 entries (actual: ${CAEN_CATALOG.length})`);

  for (const entry of CAEN_CATALOG) {
    const code = entry.code;
    assert(/^\d{4}$/.test(code), `[${code}] CAEN code is exactly 4 digits`);
    assert(['LOW', 'MEDIUM', 'HIGH'].includes(entry.riskClass), `[${code}] riskClass is valid: ${entry.riskClass}`);
    assert([3, 6, 12].includes(entry.defaultSsmIntervalMonths), `[${code}] SSM interval is valid: ${entry.defaultSsmIntervalMonths}`);
    assert([3, 6, 12].includes(entry.defaultPsiIntervalMonths), `[${code}] PSI interval is valid: ${entry.defaultPsiIntervalMonths}`);
    if (entry.requiresHygieneCourse) {
      assert(!!entry.hygieneModule && entry.hygieneModule.length > 5, `[${code}] requiresHygieneCourse has valid hygieneModule: ${entry.hygieneModule}`);
    }

    // Call risk profile
    const profile = getRiskProfileForCaen(code);
    assert(!!profile, `[${code}] getRiskProfileForCaen returns profile`);
    assert(profile.globalRiskScore > 1.0, `[${code}] globalRiskScore (${profile.globalRiskScore}) > 1.0`);
    assert(profile.globalRiskScore <= 3.50, `[${code}] globalRiskScore (${profile.globalRiskScore}) <= 3.50 (acceptable risk)`);
    assert(Array.isArray(profile.factors) && profile.factors.length >= 10, `[${code}] factors array length >= 10 (actual: ${profile.factors?.length})`);

    // Invariant: sum(R_i^2) / sum(R_i)
    let sumR = 0;
    let sumR2 = 0;
    for (let i = 0; i < profile.factors.length; i++) {
      const f = profile.factors[i];
      assert(['EXECUTANT', 'SARCINA', 'MIJLOACE', 'MEDIU'].includes(f.element), `[${code} factor #${i + 1}] element valid: ${f.element}`);
      assert(Number.isInteger(f.severity) && f.severity >= 1 && f.severity <= 7, `[${code} factor #${i + 1}] severity 1-7 (actual: ${f.severity})`);
      assert(Number.isInteger(f.probability) && f.probability >= 1 && f.probability <= 6, `[${code} factor #${i + 1}] probability 1-6 (actual: ${f.probability})`);
      assert(Number.isInteger(f.riskLevel) && f.riskLevel >= 1 && f.riskLevel <= 7, `[${code} factor #${i + 1}] riskLevel 1-7 (actual: ${f.riskLevel})`);

      // Verify Pece matrix lookup invariant
      const expectedPece = PECE_RISK_MATRIX[f.severity - 1][f.probability - 1];
      assert(f.riskLevel === expectedPece, `[${code} factor #${i + 1}] riskLevel matches Pece matrix (G=${f.severity}, P=${f.probability} -> expected ${expectedPece}, got ${f.riskLevel})`);

      assert(Array.isArray(f.preventionMeasures) && f.preventionMeasures.length >= 1, `[${code} factor #${i + 1}] non-empty preventionMeasures`);
      for (const m of f.preventionMeasures) {
        assert(typeof m === 'string' && m.trim().length > 5, `[${code} factor #${i + 1}] prevention measure is non-trivial string`);
      }

      sumR += f.riskLevel;
      sumR2 += f.riskLevel * f.riskLevel;
    }

    const calculatedNrg = sumR2 / sumR;
    assertCloseTo(profile.globalRiskScore, calculatedNrg, 0.01, `[${code}] Mathematical invariant N_rg == sum(R^2)/sum(R)`);
  }
  console.log(`  ✓ Completed Suite 1: All ${CAEN_CATALOG.length} catalog profiles mathematically validated.`);

  // --------------------------------------------------------------------------
  // SUITE 2: Dedicated Presets Audit (All 7 Preconfigured Profiles)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Dedicated Presets Detailed Audit ---');
  const dedicatedCodes = Object.keys(CAEN_RISK_PROFILES);
  assert(dedicatedCodes.length >= 7, `At least 7 dedicated profiles in CAEN_RISK_PROFILES (actual: ${dedicatedCodes.length})`);

  for (const c of dedicatedCodes) {
    const prof = CAEN_RISK_PROFILES[c];
    assert(prof.caenCode === c, `[Preset ${c}] caenCode matches key`);
    assert(prof.industryName.length > 0, `[Preset ${c}] industryName non-empty`);
    assert(prof.globalRiskScore <= 3.50 && prof.globalRiskScore > 1.0, `[Preset ${c}] score in [1.0, 3.50]`);

    // Verify all 4 subsystems are populated
    const subsystems = new Set(prof.factors.map((f) => f.element));
    assert(subsystems.has('EXECUTANT'), `[Preset ${c}] contains EXECUTANT subsystem`);
    assert(subsystems.has('SARCINA'), `[Preset ${c}] contains SARCINA subsystem`);
    assert(subsystems.has('MIJLOACE'), `[Preset ${c}] contains MIJLOACE subsystem`);
    assert(subsystems.has('MEDIU'), `[Preset ${c}] contains MEDIU subsystem`);
  }
  console.log(`  ✓ Completed Suite 2: All ${dedicatedCodes.length} dedicated presets contain all 4 subsystems.`);

  // --------------------------------------------------------------------------
  // SUITE 3: Adversarial Edge Cases for CAEN Codes
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Adversarial Edge Cases (Unknown / Malformed CAEN) ---');
  const adversarialCodes = [
    { label: 'String 9999', val: '9999' },
    { label: 'String ABCD', val: 'ABCD' },
    { label: 'Empty string', val: '' },
    { label: 'Whitespace string', val: '   ' },
    { label: '5-digit string', val: '99999' },
    { label: 'Single-digit string', val: '0' },
    { label: 'Dotted string 62.01', val: '62.01' },
    { label: 'Prefixed string CAEN 5610', val: 'CAEN 5610' },
    { label: 'Prefixed string CAEN-4120', val: 'CAEN-4120' },
    { label: 'Null value', val: null as any },
    { label: 'Undefined value', val: undefined as any },
    { label: 'Integer 6201 (from Excel)', val: 6201 as any },
    { label: 'Integer 5610 (from Excel)', val: 5610 as any },
    { label: 'Empty object {}', val: {} as any },
  ];

  for (const item of adversarialCodes) {
    let result: CaenRiskProfile | null = null;
    let didThrow = false;
    let errorMsg = '';
    try {
      result = getRiskProfileForCaen(item.val);
    } catch (e: any) {
      didThrow = true;
      errorMsg = e.message;
    }

    assert(!didThrow, `getRiskProfileForCaen(${item.label}) must not throw (error: ${errorMsg})`);
    assert(result !== null && result !== undefined, `getRiskProfileForCaen(${item.label}) returns non-null`);
    assert(!isNaN(result?.globalRiskScore || NaN), `getRiskProfileForCaen(${item.label}) score is not NaN`);
    assert(
      (result?.globalRiskScore || 0) <= 3.50 && (result?.globalRiskScore || 0) > 1.0,
      `getRiskProfileForCaen(${item.label}) score in [1.0, 3.50] (actual: ${result?.globalRiskScore})`
    );
    assert(
      Array.isArray(result?.factors) && (result?.factors.length || 0) > 0,
      `getRiskProfileForCaen(${item.label}) factors array non-empty`
    );
  }

  // Normalization resilience: "62.01" -> 6201, "CAEN 5610" -> 5610
  const normalized6201 = getRiskProfileForCaen('62.01');
  assert(normalized6201.caenCode === '6201', 'Normalizes "62.01" to "6201"');
  const normalized5610 = getRiskProfileForCaen('CAEN 5610');
  assert(normalized5610.caenCode === '5610', 'Normalizes "CAEN 5610" to "5610"');
  console.log('  ✓ Completed Suite 3: Malformed, unknown, and dirty CAEN inputs tested.');

  // --------------------------------------------------------------------------
  // SUITE 4: Adversarial Job Title Adaptation
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Job Title Adaptation (Administrative vs Operational) ---');
  const adminJobTitles = [
    'Director General',
    'Administrator',
    'Manager Proiect',
    'Sef Birou Contabilitate',
    'Contabil Sef',
    'Economist',
    'Secretar Executiv',
    'Asistent Manager',
    'Functionar Administrativ',
    'Personal TESA',
    'Specialist Resurse Umane',
    'Manager HR',
    'Consilier Juridic',
    'Jurist',
    'Programator Software',
  ];

  // In Construction (4120), administrative titles should adapt to TESA/Office (7022) factors
  for (const title of adminJobTitles) {
    const prof = getRiskProfileForCaen('4120', title);
    assert(prof.caenCode === '4120', `[Admin title: ${title}] caenCode preserved as 4120`);
    assert(prof.jobTitle === title, `[Admin title: ${title}] jobTitle set to ${title}`);
    assert(prof.globalRiskScore <= 3.50, `[Admin title: ${title}] score <= 3.50 (got ${prof.globalRiskScore})`);
    const hasFallFromHeight = prof.factors.some((f) => f.riskFactor.toLowerCase().includes('inaltime fara centura'));
    assert(!hasFallFromHeight, `[Admin title: ${title}] Construction physical fall risk omitted for office staff`);
  }

  // Operational titles in Construction (4120) MUST keep construction physical risks
  const constructionOperationalTitles = [
    'Muncitor necalificat în construcții',
    'Muncitor necalificat',
    'Zidar tencuitor',
    'Instalator sanitar',
    'Fierar-betonist',
    'Dulgher',
    'Macaragiu',
  ];

  for (const title of constructionOperationalTitles) {
    const prof = getRiskProfileForCaen('4120', title);
    assert(prof.caenCode === '4120', `[Construction operational: ${title}] caenCode 4120`);
    assert(prof.jobTitle === title, `[Construction operational: ${title}] jobTitle set`);
    const hasConstructionRisks = prof.factors.some(
      (f) => f.riskFactor.toLowerCase().includes('inaltime') || f.riskFactor.toLowerCase().includes('macaral') || f.riskFactor.toLowerCase().includes('sapaturi')
    );
    assert(
      hasConstructionRisks,
      `[Construction operational: ${title}] Construction physical risks retained (NOT replaced by office desk risks)`
    );
  }

  // In Restaurant (5610), "Bucatar" must get kitchen risks, whereas "Contabil" gets office risks
  const cookProfile = getRiskProfileForCaen('5610', 'Bucatar');
  const accountantProfile = getRiskProfileForCaen('5610', 'Contabil');
  assert(
    cookProfile.factors.some((f) => f.riskFactor.toLowerCase().includes('cutite') || f.riskFactor.toLowerCase().includes('friteuz') || f.riskFactor.toLowerCase().includes('ulei')),
    'Cook gets kitchen-specific risk factors'
  );
  assert(
    !accountantProfile.factors.some((f) => f.riskFactor.toLowerCase().includes('cutite') || f.riskFactor.toLowerCase().includes('friteuz')),
    'Accountant does not get kitchen-specific cut risk factors'
  );
  console.log('  ✓ Completed Suite 4: Contextual job title risk adaptation tested.');

  // --------------------------------------------------------------------------
  // SUITE 5: Template Resolution Under Multiple CAEN Codes
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Template Resolution Under Multiple CAEN Scenarios ---');
  const templatesToTest = ['risk-evaluare', 'ipssm-tesa', 'decizii-angajator'];

  const testScenarios = [
    {
      name: 'Scenario A (CAEN 6201 - IT)',
      client: {
        id: 'client-it-6201',
        name: 'CYBER TECH SOLUTIONS S.R.L.',
        cui: 'RO38765432',
        regCom: 'J40/1234/2021',
        address: 'București, Sector 2, Str. Tehnologiei nr. 10',
        caenCode: '6201',
        caenActivity: 'Activități de realizare a software-ului la comandă (software orientat client)',
        foundedYear: 2021,
        legalRepresentative: 'Munteanu Cristian',
        ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
        ssmSpecialistName: 'Ing. Mihai Popescu',
        designatedWorkerSsm: 'Ing. Mihai Popescu',
        firstAidResponder: 'Ioana-Raluca Dumitru',
        psiResponder: 'Gheorghe Barbu',
        investigationMembers: 'Elena Vasilescu, Alexandru Stan',
        decisionsDate: new Date('2026-01-15'),
      },
    },
    {
      name: 'Scenario B (CAEN 5610 - Restaurant)',
      client: {
        id: 'client-horeca-5610',
        name: 'BISTRO GOURMET S.R.L.',
        cui: 'RO45678901',
        regCom: 'J40/5610/2022',
        address: 'București, Sector 1, Calea Victoriei nr. 88',
        caenCode: '5610',
        caenActivity: 'Restaurante',
        foundedYear: 2022,
        legalRepresentative: 'Radu George',
        ssmProviderName: 'HORECA SAFETY CONSULT S.R.L.',
        ssmSpecialistName: 'Ing. Vasile Marin',
        designatedWorkerSsm: 'Radu George',
        firstAidResponder: 'Marius Radu',
        psiResponder: 'Marius Radu',
        investigationMembers: 'Andreea Marin, Mirela Iacob',
        decisionsDate: new Date('2026-01-20'),
      },
    },
    {
      name: 'Scenario C (CAEN 4120 - Construction)',
      client: {
        id: 'client-construct-4120',
        name: 'CONSTRUCT MASTER BUILD S.R.L.',
        cui: 'RO56789012',
        regCom: 'J40/4120/2019',
        address: 'București, Sector 3, Bd. Constructorilor nr. 5',
        caenCode: '4120',
        caenActivity: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
        foundedYear: 2019,
        legalRepresentative: 'Ing. Ionescu Petre',
        ssmProviderName: 'PRO CONSTRUCT SSM S.R.L.',
        ssmSpecialistName: 'Ing. Dan Gheorghiu',
        designatedWorkerSsm: 'Ing. Ionescu Petre',
        firstAidResponder: 'Mihai Sandu',
        psiResponder: 'Constantin Dobre',
        investigationMembers: 'Traian Pop, Victor Dinu',
        decisionsDate: new Date('2026-01-10'),
      },
    },
    {
      name: 'Scenario D (Null / Empty CAEN Code)',
      client: {
        id: 'client-empty-caen',
        name: 'NOVO CONSULT S.R.L.',
        cui: 'RO67890123',
        regCom: 'J40/9999/2023',
        address: 'București, Sector 4, Sos. Berceni nr. 12',
        caenCode: null as any,
        caenActivity: null as any,
        foundedYear: null as any,
        legalRepresentative: 'Andrei Popa',
      },
    },
  ];

  const resolutionResults: Record<string, TemplateResolutionResult> = {};

  for (const scenario of testScenarios) {
    for (const tCode of templatesToTest) {
      const key = `${scenario.name}::${tCode}`;
      const res = await resolveTemplateData(tCode, {
        client: scenario.client,
      });
      resolutionResults[key] = res;

      assert(res.status === 'ready', `[${key}] status is strictly 'ready' (actual: ${res.status})`);
      assert(
        res.unresolvedPlaceholders.length === 0,
        `[${key}] unresolvedPlaceholders is strictly empty [] (actual: ${JSON.stringify(res.unresolvedPlaceholders)})`
      );

      // Verify essential placeholders are not empty
      assert(typeof res.data.PLACEHOLDER_FIRMA === 'string' && res.data.PLACEHOLDER_FIRMA.length > 0, `[${key}] PLACEHOLDER_FIRMA is populated`);
      assert(typeof res.data.PLACEHOLDER_CUI === 'string' && res.data.PLACEHOLDER_CUI.length > 0, `[${key}] PLACEHOLDER_CUI is populated`);
      assert(typeof res.data.PLACEHOLDER_ADRESA_FIRMA === 'string' && res.data.PLACEHOLDER_ADRESA_FIRMA.length > 0, `[${key}] PLACEHOLDER_ADRESA_FIRMA is populated`);
      assert(typeof res.data.PLACEHOLDER_REPREZENTANT_LEGAL === 'string' && res.data.PLACEHOLDER_REPREZENTANT_LEGAL.length > 0, `[${key}] PLACEHOLDER_REPREZENTANT_LEGAL is populated`);
    }
  }
  console.log(`  ✓ Completed Suite 5: All 12 template resolution combinations tested.`);

  // --------------------------------------------------------------------------
  // SUITE 6: Deep Content Disambiguation for CAEN 5610 (Restaurant vs IT)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Deep Content Disambiguation (CAEN 5610 Restaurant vs IT) ---');
  const restaurantEvaluare = resolutionResults['Scenario B (CAEN 5610 - Restaurant)::risk-evaluare'];
  const itEvaluare = resolutionResults['Scenario A (CAEN 6201 - IT)::risk-evaluare'];
  const constructionEvaluare = resolutionResults['Scenario C (CAEN 4120 - Construction)::risk-evaluare'];

  assert(!!restaurantEvaluare, 'Restaurant risk-evaluare resolution exists');
  assert(!!itEvaluare, 'IT risk-evaluare resolution exists');

  const restCaen = String(restaurantEvaluare.data.PLACEHOLDER_COD_CAEN);
  const itCaen = String(itEvaluare.data.PLACEHOLDER_COD_CAEN);
  const constCaen = String(constructionEvaluare.data.PLACEHOLDER_COD_CAEN);

  assert(restCaen.includes('5610'), `Restaurant PLACEHOLDER_COD_CAEN contains '5610' (actual: "${restCaen}")`);
  assert(itCaen.includes('6201'), `IT PLACEHOLDER_COD_CAEN contains '6201' (actual: "${itCaen}")`);
  assert(constCaen.includes('4120'), `Construction PLACEHOLDER_COD_CAEN contains '4120' (actual: "${constCaen}")`);

  const restActivity = String(restaurantEvaluare.data.PLACEHOLDER_ACTIVITATE_PRINCIPALA);
  const itActivity = String(itEvaluare.data.PLACEHOLDER_ACTIVITATE_PRINCIPALA);
  assert(restActivity.toLowerCase().includes('restaurant'), `Restaurant activity contains 'restaurant' (actual: "${restActivity}")`);
  assert(!restActivity.toLowerCase().includes('software'), `Restaurant activity does NOT contain 'software'`);
  assert(itActivity.toLowerCase().includes('software'), `IT activity contains 'software' (actual: "${itActivity}")`);

  // Verify that conclusions differ appropriately
  const restConclusions = String(restaurantEvaluare.data.PLACEHOLDER_CONCLUZII_EVALUARE);
  const itConclusions = String(itEvaluare.data.PLACEHOLDER_CONCLUZII_EVALUARE);
  assert(restConclusions.length > 50, 'Restaurant conclusions populated');
  assert(itConclusions.length > 50, 'IT conclusions populated');

  // Verify that 30 factors for Restaurant in ipssm-tesa are properly populated numbers
  const restTesa = resolutionResults['Scenario B (CAEN 5610 - Restaurant)::ipssm-tesa'];
  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(2, '0');
    const grav = restTesa.data[`PLACEHOLDER_GRAVITATE_RISC_${pad}`];
    const freq = restTesa.data[`PLACEHOLDER_FRECVENTA_RISC_${pad}`];
    const part = restTesa.data[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`];

    assert(/^\d+$/.test(String(grav)), `Factor ${pad} gravity is numeric string (actual: ${grav})`);
    assert(/^\d+$/.test(String(freq)), `Factor ${pad} frequency is numeric string (actual: ${freq})`);
    assert(/^\d+$/.test(String(part)), `Factor ${pad} partial risk is numeric string (actual: ${part})`);
  }
  console.log('  ✓ Completed Suite 6: Semantic separation between Restaurant and IT profiles verified.');

  // --------------------------------------------------------------------------
  // SUITE 7: Physical DOCX Buffer Rendering & Zero-Token Leak Audit
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Physical DOCX Buffer Rendering & Zero Unmapped Tokens ---');
  const tempOutputDir = path.join(process.cwd(), 'storage', 'adversarial_test_output');
  if (!fs.existsSync(tempOutputDir)) {
    fs.mkdirSync(tempOutputDir, { recursive: true });
  }

  const templatesToRender = [
    { code: 'risk-evaluare', scenarioKey: 'Scenario B (CAEN 5610 - Restaurant)::risk-evaluare' },
    { code: 'ipssm-tesa', scenarioKey: 'Scenario B (CAEN 5610 - Restaurant)::ipssm-tesa' },
    { code: 'decizii-angajator', scenarioKey: 'Scenario B (CAEN 5610 - Restaurant)::decizii-angajator' },
  ];

  for (const item of templatesToRender) {
    const tDef = TEMPLATE_CATALOG.find((t) => t.code === item.code);
    assert(!!tDef, `Template definition found for ${item.code}`);
    if (!tDef) continue;

    const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', tDef.normalizedFilename);
    assert(fs.existsSync(templatePath), `Normalized template file exists: ${tDef.normalizedFilename}`);

    const resData = resolutionResults[item.scenarioKey].data;
    const renderedBuf = await renderTemplateBuffer(
      templatePath,
      tDef.format,
      resData,
      tDef.normalizedFilename
    );

    assert(renderedBuf instanceof Buffer && renderedBuf.length > 1000, `[${item.code}] Rendered buffer is valid non-empty buffer (${renderedBuf.length} bytes)`);

    // Verify zero unresolved tokens in the rendered document
    const unresolved = await collectUnresolvedPlaceholders(renderedBuf, tDef.format);
    assert(
      unresolved.length === 0,
      `[${item.code}] Zero unresolved tokens in rendered document (found: ${JSON.stringify(unresolved)})`
    );

    // Save rendered buffer for inspection
    const outPath = path.join(tempOutputDir, `TEST_${item.code}_5610.docx`);
    fs.writeFileSync(outPath, renderedBuf);
    assert(fs.existsSync(outPath), `Saved test document to: ${outPath}`);

    // Inspect XML directly inside the docx zip
    const zip = new PizZip(renderedBuf);
    const mainXml = zip.file('word/document.xml')?.asText() || '';
    assert(mainXml.length > 500, `[${item.code}] word/document.xml is non-empty (${mainXml.length} chars)`);
    assert(!mainXml.includes('{PLACEHOLDER_'), `[${item.code}] No raw {PLACEHOLDER_...} token remains in XML`);

    if (item.code === 'risk-evaluare') {
      assert(mainXml.includes('5610') || mainXml.includes('Restaurante') || mainXml.includes('BISTRO GOURMET'), `[${item.code}] word/document.xml contains Restaurant metadata`);
    }
  }
  console.log('  ✓ Completed Suite 7: Physical DOCX rendering and zero-token leak verified.');

  // --------------------------------------------------------------------------
  // SUMMARY & VERDICT
  // --------------------------------------------------------------------------
  const durationMs = Date.now() - startTime;
  console.log('\n================================================================');
  console.log('🏁 ADVERSARIAL STRESS TEST SUMMARY');
  console.log('================================================================');
  console.log(`Total Assertions:    ${totalAssertions}`);
  console.log(`Passed Assertions:   ${passedAssertions}`);
  console.log(`Failed Assertions:   ${failedAssertions}`);
  console.log(`Execution Duration:  ${(durationMs / 1000).toFixed(2)}s`);

  if (failedAssertions > 0) {
    console.error('\nFAILURES RECORDED:');
    failureDetails.forEach((f, idx) => console.error(`  [${idx + 1}] ${f}`));
    console.log('\nVERDICT: REQUEST_CHANGES ❌');
    process.exit(1);
  } else {
    console.log('\nVERDICT: APPROVE ✅');
    process.exit(0);
  }
}

runAdversarialCaenStressTest().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
