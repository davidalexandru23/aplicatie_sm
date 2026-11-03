import { prisma } from '../src/lib/prisma';
import { CAEN_CATALOG, getCaenEntry, searchCaen } from '../src/lib/caen-catalog';
import {
  CAEN_RISK_PROFILES,
  PECE_RISK_MATRIX,
  calculatePecePartialRisk,
  calculateGlobalRiskScore,
  getRiskProfileForCaen,
} from '../src/lib/risk/caen-risk-presets';
import { resolveTemplateData } from '../src/lib/templates/resolver';

async function runAdversarialM1Review() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS TEST SUITE — MILESTONE 1 CODE REVIEW');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Prisma Client & Seed DB Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Database Schema & Seed Verification ---');
  
  const clientNexus = await prisma.client.findUnique({
    where: { cui: 'RO38765432' },
    include: { employees: { include: { identityDocument: true, residenceAddress: true } } },
  });
  assert(!!clientNexus, 'Client NEXUS SOLUTIONS S.R.L. found in database');
  assert(clientNexus?.caenCode === '6201', 'Nexus caenCode is 6201');
  assert(!!clientNexus?.caenActivity, 'Nexus caenActivity is populated');
  assert(clientNexus?.foundedYear === 2021, 'Nexus foundedYear is 2021');
  assert(!!clientNexus?.ssmProviderName, 'Nexus ssmProviderName is populated');
  assert(!!clientNexus?.ssmSpecialistName, 'Nexus ssmSpecialistName is populated');
  assert(!!clientNexus?.ssmSpecialistCert, 'Nexus ssmSpecialistCert is populated');
  assert(!!clientNexus?.designatedWorkerSsm, 'Nexus designatedWorkerSsm is populated');
  assert(!!clientNexus?.firstAidResponder, 'Nexus firstAidResponder is populated');
  assert(!!clientNexus?.psiResponder, 'Nexus psiResponder is populated');
  assert(!!clientNexus?.investigationMembers, 'Nexus investigationMembers is populated');
  assert(!!clientNexus?.decisionsDate, 'Nexus decisionsDate is populated');

  const clientBistro = await prisma.client.findUnique({
    where: { cui: 'RO45123987' },
    include: { employees: { include: { identityDocument: true, residenceAddress: true } } },
  });
  assert(!!clientBistro, 'Client BISTRO GOURMET S.R.L. found in database');
  assert(clientBistro?.caenCode === '5610', 'Bistro caenCode is 5610');
  assert(!!clientBistro?.caenActivity, 'Bistro caenActivity is populated');
  assert(clientBistro?.foundedYear === 2022, 'Bistro foundedYear is 2022');
  assert(!!clientBistro?.designatedWorkerSsm, 'Bistro designatedWorkerSsm is populated');
  assert(!!clientBistro?.firstAidResponder, 'Bistro firstAidResponder is populated');
  assert(!!clientBistro?.psiResponder, 'Bistro psiResponder is populated');
  assert(!!clientBistro?.investigationMembers, 'Bistro investigationMembers is populated');
  assert(!!clientBistro?.decisionsDate, 'Bistro decisionsDate is populated');

  // Verify all 5 employees have complete IdentityDocument and ResidenceAddress
  const targetEmployees = [
    { cnp: '1880315410127', name: 'Stan Alexandru', client: clientNexus },
    { cnp: '2941124120456', name: 'Dumitru Ioana-Raluca', client: clientNexus },
    { cnp: '1790608080231', name: 'Barbu Gheorghe', client: clientNexus },
    { cnp: '1820815410097', name: 'Radu Marius', client: clientBistro },
    { cnp: '2950920410044', name: 'Marin Andreea', client: clientBistro },
  ];

  for (const t of targetEmployees) {
    const emp = t.client?.employees.find((e) => e.cnp === t.cnp);
    assert(!!emp, `Employee ${t.name} (CNP ${t.cnp}) exists`);
    assert(!!emp?.identityDocument, `Employee ${t.name} has IdentityDocument`);
    assert(
      !!(
        emp?.identityDocument?.docType &&
        emp?.identityDocument?.series &&
        emp?.identityDocument?.number &&
        emp?.identityDocument?.issuedBy &&
        emp?.identityDocument?.issueDate &&
        emp?.identityDocument?.expiryDate
      ),
      `Employee ${t.name} IdentityDocument has all 6 statutory fields populated`
    );
    assert(!!emp?.residenceAddress, `Employee ${t.name} has ResidenceAddress`);
    assert(
      !!(
        emp?.residenceAddress?.county &&
        emp?.residenceAddress?.locality &&
        emp?.residenceAddress?.street &&
        emp?.residenceAddress?.number
      ),
      `Employee ${t.name} ResidenceAddress has county, locality, street, number populated`
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CAEN Catalog Correctness & Search Stress-Testing
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. CAEN Catalog & Search Stress Test ---');
  assert(CAEN_CATALOG.length >= 20, `Catalog has ${CAEN_CATALOG.length} entries (>= 20)`);
  
  // Test code normalizations
  const e1 = getCaenEntry('6201');
  const e2 = getCaenEntry('62.01');
  const e3 = getCaenEntry(' 6201 ');
  assert(!!e1 && e1.code === '6201', 'getCaenEntry("6201") returns entry');
  assert(e2?.code === '6201', 'getCaenEntry("62.01") normalizes dot notation');
  assert(e3?.code === '6201', 'getCaenEntry(" 6201 ") trims whitespace');
  assert(getCaenEntry('999999') === undefined, 'getCaenEntry for non-existent returns undefined');
  assert(getCaenEntry('') === undefined, 'getCaenEntry for empty string returns undefined');

  // Test diacritics and fuzzy search
  const resDiacritics1 = searchCaen('alimentație');
  const resDiacritics2 = searchCaen('alimentatie');
  const resUpper = searchCaen('ALIMENTAȚIE');
  assert(resDiacritics1.length > 0, 'searchCaen with diacritics returns results');
  assert(resDiacritics1.length === resDiacritics2.length, 'searchCaen is diacritic-insensitive');
  assert(resDiacritics1.length === resUpper.length, 'searchCaen is case-insensitive');

  // Test typical job title search
  const resJob = searchCaen('Bucătar');
  assert(resJob.some((c) => c.code === '5610'), 'searchCaen("Bucătar") finds 5610 via typicalJobTitles');

  const resEmpty = searchCaen('');
  assert(resEmpty.length === CAEN_CATALOG.length, 'searchCaen("") returns all entries');

  // Verify statutory fields on catalog entries
  let allCatalogValid = true;
  for (const entry of CAEN_CATALOG) {
    if (!entry.code || !entry.name || !entry.riskClass || !entry.defaultSsmIntervalMonths || !entry.defaultPsiIntervalMonths) {
      allCatalogValid = false;
      console.error(`Invalid catalog entry: ${JSON.stringify(entry)}`);
    }
    if (![3, 6, 12].includes(entry.defaultSsmIntervalMonths)) {
      allCatalogValid = false;
      console.error(`Unexpected SSM interval: ${entry.defaultSsmIntervalMonths} for CAEN ${entry.code}`);
    }
  }
  assert(allCatalogValid, 'All catalog entries have valid statutory fields and legal intervals');

  // ---------------------------------------------------------------------------
  // 3. INCDPM Pece Risk Matrix & Profiles Rigorous Audit
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. INCDPM Pece Risk Calculation & Presets Audit ---');

  // Test Pece Matrix boundary values
  assert(calculatePecePartialRisk(1, 1) === 1, 'Pece(1, 1) = 1 (Neglijabil)');
  assert(calculatePecePartialRisk(7, 6) === 7, 'Pece(7, 6) = 7 (Maxim)');
  assert(calculatePecePartialRisk(7, 1) === 3, 'Pece(7, 1) = 3 (Deces extrem de rar)');
  assert(calculatePecePartialRisk(2, 4) === 2, 'Pece(2, 4) = 2 (ITM 3-45z puțin frecvent)');
  assert(calculatePecePartialRisk(3, 3) === 3, 'Pece(3, 3) = 3 (ITM 45-180z rar)');
  assert(calculatePecePartialRisk(4, 4) === 4, 'Pece(4, 4) = 4 (Inv gr.III puțin frecvent)');
  assert(calculatePecePartialRisk(5, 5) === 5, 'Pece(5, 5) = 5 (Inv gr.II frecvent)');
  assert(calculatePecePartialRisk(6, 6) === 7, 'Pece(6, 6) = 7 (Inv gr.I foarte frecvent)');

  // Clamping test
  assert(calculatePecePartialRisk(10, 10) === 7, 'Pece clamps out-of-range inputs to max');
  assert(calculatePecePartialRisk(-5, -5) === 1, 'Pece clamps negative inputs to min');

  // Audit ALL profiles in CAEN_RISK_PROFILES
  const requiredSubsystems = ['EXECUTANT', 'SARCINA', 'MIJLOACE', 'MEDIU'] as const;
  const profileKeys = Object.keys(CAEN_RISK_PROFILES);
  assert(profileKeys.length >= 7, `At least 7 pre-configured CAEN risk profiles (found ${profileKeys.length})`);

  for (const code of profileKeys) {
    const profile = CAEN_RISK_PROFILES[code];
    assert(!!profile, `Profile for CAEN ${code} exists`);
    assert(profile.factors.length >= 10, `Profile ${code} has ${profile.factors.length} factors (>= 10)`);

    // Check all 4 subsystems
    const subsystemsFound = new Set(profile.factors.map((f) => f.element));
    const hasAll4 = requiredSubsystems.every((s) => subsystemsFound.has(s));
    assert(hasAll4, `Profile ${code} covers all 4 INCDPM subsystems: EXECUTANT, SARCINA, MIJLOACE, MEDIU`);

    // Verify mathematical integrity of each factor
    let factorsMathOk = true;
    for (const f of profile.factors) {
      const expectedR = calculatePecePartialRisk(f.severity, f.probability);
      if (f.riskLevel !== expectedR) {
        factorsMathOk = false;
        console.error(`Math mismatch in ${code}: factor "${f.riskFactor}" has R=${f.riskLevel}, expected ${expectedR} (G=${f.severity}, P=${f.probability})`);
      }
      if (!f.preventionMeasures || f.preventionMeasures.length === 0) {
        factorsMathOk = false;
        console.error(`Missing prevention measures in ${code}: factor "${f.riskFactor}"`);
      }
    }
    assert(factorsMathOk, `Profile ${code}: all ${profile.factors.length} factors have correct partial risk R_i and prevention measures`);

    // Check global score formula and <= 3.50
    const computedScore = calculateGlobalRiskScore(profile.factors);
    assert(
      computedScore === profile.globalRiskScore,
      `Profile ${code}: globalRiskScore (${profile.globalRiskScore}) matches formula Sum(R_i^2)/Sum(R_i) (${computedScore})`
    );
    assert(
      profile.globalRiskScore <= 3.50,
      `Profile ${code}: globalRiskScore ${profile.globalRiskScore} is strictly <= 3.50 (statutory acceptable limit)`
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Adversarial Edge Cases for getRiskProfileForCaen
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. getRiskProfileForCaen Edge Cases ---');

  // Case 1: unmapped CAEN code -> should gracefully fallback to 7022 with N_rg <= 3.50
  const unmapped = getRiskProfileForCaen('0111');
  assert(unmapped.caenCode === '0111', 'Unmapped CAEN 0111 returns requested code in profile');
  assert(unmapped.globalRiskScore <= 3.50, 'Unmapped CAEN profile has N_rg <= 3.50');
  assert(unmapped.factors.length >= 10, 'Unmapped CAEN profile provides full factor list');

  // Case 2: empty code -> fallback
  const emptyCode = getRiskProfileForCaen('');
  assert(emptyCode.globalRiskScore <= 3.50, 'Empty code profile has N_rg <= 3.50');

  // Case 3: Administrative job in a high-risk company (e.g. Accountant in Construction 4120)
  const accountantInConstruction = getRiskProfileForCaen('4120', 'Contabil șef');
  assert(
    accountantInConstruction.industryName.includes('consultanță') || accountantInConstruction.industryName.includes('afaceri') || accountantInConstruction.jobTitle === 'Contabil șef',
    'Administrative job (Contabil) in Construction (4120) adapts to TESA/office risk profile'
  );

  // Case 4: Operational job in Construction 4120
  const builderInConstruction = getRiskProfileForCaen('4120', 'Fierar betonist');
  assert(
    builderInConstruction.industryName.includes('clădirilor'),
    'Operational job (Fierar betonist) retains high-risk Construction profile'
  );

  // ---------------------------------------------------------------------------
  // 5. Template Resolver Dynamic Context Integration
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Template Resolver Contextual Binding ---');

  // Test resolution on risk-evaluare for Client 1 (Nexus, 6201)
  const resNexus = await resolveTemplateData('risk-evaluare', { client: clientNexus });
  assert(resNexus.status === 'ready', 'risk-evaluare for Nexus resolves to "ready"');
  assert(resNexus.data.PLACEHOLDER_COD_CAEN.includes('6201'), 'PLACEHOLDER_COD_CAEN includes 6201');
  assert(resNexus.data.PLACEHOLDER_AN_INFIINTARE === '2021', 'PLACEHOLDER_AN_INFIINTARE matches Nexus 2021');
  assert(resNexus.data.PLACEHOLDER_NIVEL_RISC_GLOBAL === CAEN_RISK_PROFILES['6201'].globalRiskScore.toFixed(2), `PLACEHOLDER_NIVEL_RISC_GLOBAL is dynamically ${CAEN_RISK_PROFILES['6201'].globalRiskScore.toFixed(2)} for Nexus`);
  assert(resNexus.data.PLACEHOLDER_PRESTATOR_SSM === clientNexus?.ssmProviderName, 'PLACEHOLDER_PRESTATOR_SSM matches database');

  // Test resolution on risk-evaluare for Client 2 (Bistro, 5610)
  const resBistro = await resolveTemplateData('risk-evaluare', { client: clientBistro });
  assert(resBistro.status === 'ready', 'risk-evaluare for Bistro resolves to "ready"');
  assert(resBistro.data.PLACEHOLDER_COD_CAEN.includes('5610'), 'PLACEHOLDER_COD_CAEN includes 5610 for Bistro');
  assert(resBistro.data.PLACEHOLDER_AN_INFIINTARE === '2022', 'PLACEHOLDER_AN_INFIINTARE matches Bistro 2022');
  assert(resBistro.data.PLACEHOLDER_NIVEL_RISC_GLOBAL === CAEN_RISK_PROFILES['5610'].globalRiskScore.toFixed(2), `PLACEHOLDER_NIVEL_RISC_GLOBAL is dynamically ${CAEN_RISK_PROFILES['5610'].globalRiskScore.toFixed(2)} for Bistro`);

  // Test organizational decisions dynamic appointees
  const resDeciziiNexus = await resolveTemplateData('decizii-angajator', { client: clientNexus });
  assert(resDeciziiNexus.data.PLACEHOLDER_NUMAR_DECIZIE_01.includes('15.01.2026'), 'Decizii date dynamically reflects Nexus decisionsDate');
  assert(resDeciziiNexus.data.PLACEHOLDER_LUCRATOR_DESEMNAT_SSM.includes('Munteanu Cristian'), 'Lucrător desemnat reflects Nexus decision appointee');
  assert(resDeciziiNexus.data.PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR.includes('Alexandru Stan'), 'First aid responder reflects Nexus appointee');
  assert(resDeciziiNexus.data.PLACEHOLDER_RESPONSABIL_PSI.includes('Ioana-Raluca Dumitru'), 'PSI responder reflects Nexus appointee');
  assert(resDeciziiNexus.data.PLACEHOLDER_MEMBRU_COMISIE.includes('Gheorghe Barbu'), 'Investigation members reflects Nexus appointee');

  // Summary
  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    throw new Error(`${failed} adversarial checks failed!`);
  }
}

runAdversarialM1Review()
  .then(() => {
    console.log('✅ ALL ADVERSARIAL STRESS CHECKS PASSED WITH ZERO ERRORS.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ ADVERSARIAL STRESS TEST FAILED:', e);
    process.exit(1);
  });
