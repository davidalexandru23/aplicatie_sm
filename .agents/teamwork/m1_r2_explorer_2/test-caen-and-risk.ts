import assert from 'assert';
import {
  CAEN_CATALOG,
  getCaenEntry,
  searchCaen,
  CaenEntry,
} from './proposed_caen_catalog';
import {
  getRiskProfileForCaen,
  calculatePecePartialRisk,
  calculateGlobalRiskScore,
  PECE_RISK_MATRIX,
  CAEN_RISK_PROFILES,
} from './proposed_caen_risk_presets';

console.log('--- STARTING VERIFICATION OF CAEN CATALOG & PECE RISK PRESETS ---');

// 1. Verify 7 Core CAEN Codes
const requiredCodes = ['6201', '5610', '4120', '4711', '4941', '7022', '8621'];
for (const code of requiredCodes) {
  const entry = getCaenEntry(code);
  assert(entry, `CAEN code ${code} must exist in CAEN_CATALOG`);
  console.log(`✓ CAEN ${code} found: ${entry.name} [Risk: ${entry.riskClass}, SSM: ${entry.defaultSsmIntervalMonths}m, PSI: ${entry.defaultPsiIntervalMonths}m, Igiena: ${entry.requiresHygieneCourse}]`);
}

// 2. Verify Specific Statutory Attributes
const c6201 = getCaenEntry('6201')!;
assert.strictEqual(c6201.riskClass, 'LOW');
assert.strictEqual(c6201.defaultSsmIntervalMonths, 12);
assert.strictEqual(c6201.defaultPsiIntervalMonths, 6);
assert.strictEqual(c6201.requiresHygieneCourse, false);

const c5610 = getCaenEntry('5610')!;
assert.strictEqual(c5610.riskClass, 'MEDIUM');
assert.strictEqual(c5610.defaultSsmIntervalMonths, 6);
assert.strictEqual(c5610.defaultPsiIntervalMonths, 6);
assert.strictEqual(c5610.requiresHygieneCourse, true);
assert(c5610.hygieneModule?.includes('Modulul 1'));

const c4120 = getCaenEntry('4120')!;
assert.strictEqual(c4120.riskClass, 'HIGH');
assert.strictEqual(c4120.defaultSsmIntervalMonths, 3);
assert.strictEqual(c4120.defaultPsiIntervalMonths, 3);
assert.strictEqual(c4120.requiresHygieneCourse, false);

const c4711 = getCaenEntry('4711')!;
assert.strictEqual(c4711.riskClass, 'MEDIUM');
assert.strictEqual(c4711.defaultSsmIntervalMonths, 6);
assert.strictEqual(c4711.defaultPsiIntervalMonths, 6);
assert.strictEqual(c4711.requiresHygieneCourse, true);

const c4941 = getCaenEntry('4941')!;
assert.strictEqual(c4941.riskClass, 'HIGH');
assert.strictEqual(c4941.defaultSsmIntervalMonths, 6);
assert.strictEqual(c4941.defaultPsiIntervalMonths, 6);
assert.strictEqual(c4941.requiresHygieneCourse, false);

const c7022 = getCaenEntry('7022')!;
assert.strictEqual(c7022.riskClass, 'LOW');
assert.strictEqual(c7022.defaultSsmIntervalMonths, 12);
assert.strictEqual(c7022.defaultPsiIntervalMonths, 6);
assert.strictEqual(c7022.requiresHygieneCourse, false);

const c8621 = getCaenEntry('8621')!;
assert.strictEqual(c8621.riskClass, 'MEDIUM');
assert.strictEqual(c8621.defaultSsmIntervalMonths, 6);
assert.strictEqual(c8621.defaultPsiIntervalMonths, 6);
assert.strictEqual(c8621.requiresHygieneCourse, true);

console.log('✓ All 7 statutory CAEN attributes verified.');

// 3. Search Helper Checks
assert.strictEqual(getCaenEntry('62.01')?.code, '6201');
assert.strictEqual(getCaenEntry('9999'), undefined);

const searchSoftware = searchCaen('software');
assert(searchSoftware.some((c) => c.code === '6201'));

const searchConstructii = searchCaen('constructii');
assert(searchConstructii.some((c) => c.code === '4120'));

const searchRestaurant = searchCaen('restaurant');
assert(searchRestaurant.some((c) => c.code === '5610'));
console.log('✓ CAEN search and normalization helpers verified.');

// 4. Pece Matrix & Subsystems Checks
for (const code of requiredCodes) {
  const profile = getRiskProfileForCaen(code);
  assert(profile, `Profile for ${code} must exist`);
  assert(profile.globalRiskScore <= 3.50, `Global risk score for ${code} must be <= 3.50, got ${profile.globalRiskScore}`);
  assert(profile.factors.length >= 10, `Profile ${code} must have at least 10 factors, got ${profile.factors.length}`);

  const subsystems = new Set(profile.factors.map((f) => f.element));
  assert(subsystems.has('EXECUTANT'), `Profile ${code} missing EXECUTANT`);
  assert(subsystems.has('SARCINA'), `Profile ${code} missing SARCINA`);
  assert(subsystems.has('MIJLOACE'), `Profile ${code} missing MIJLOACE`);
  assert(subsystems.has('MEDIU'), `Profile ${code} missing MEDIU`);

  // Verify each factor partial risk matches Pece matrix
  for (const factor of profile.factors) {
    const expectedR = calculatePecePartialRisk(factor.severity, factor.probability);
    assert.strictEqual(factor.riskLevel, expectedR, `Factor "${factor.riskFactor}" riskLevel mismatch: got ${factor.riskLevel}, expected ${expectedR}`);
    assert(factor.preventionMeasures.length > 0, `Factor "${factor.riskFactor}" must have prevention measures`);
  }

  // Verify calculated score matches
  const recomputed = calculateGlobalRiskScore(profile.factors);
  assert.strictEqual(profile.globalRiskScore, recomputed, `Score mismatch on ${code}`);

  console.log(`✓ Profile ${code} [${profile.industryName}]: ${profile.factors.length} factors across 4 subsystems, N_rg = ${profile.globalRiskScore} <= 3.50`);
}

// 5. Job Title Customization & Administrative Role Adaptation
const constructionWorker = getRiskProfileForCaen('4120', 'Dulgher');
assert.strictEqual(constructionWorker.jobTitle, 'Dulgher');
assert.strictEqual(constructionWorker.globalRiskScore, 3.36);

const constructionAccountant = getRiskProfileForCaen('4120', 'Contabil');
assert.strictEqual(constructionAccountant.jobTitle, 'Contabil');
assert.strictEqual(constructionAccountant.globalRiskScore, CAEN_RISK_PROFILES['7022'].globalRiskScore); // Adapted to TESA
console.log(`✓ Role adaptation verified: Construction worker N_rg=3.36 vs Construction accountant N_rg=${constructionAccountant.globalRiskScore} (TESA adapted)`);

// 6. Fallback Behavior
const unknownCaen = getRiskProfileForCaen('9999', 'Agent vanzari');
assert(unknownCaen.globalRiskScore <= 3.50);
console.log(`✓ Unknown CAEN fallback verified: N_rg = ${unknownCaen.globalRiskScore} <= 3.50`);

console.log('--- ALL CAEN & RISK PRESET TESTS PASSED CLEANLY ---');
