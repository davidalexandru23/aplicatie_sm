/**
 * Adversarial Compliance Engine Stress & Invariant Test Harness
 * 
 * Target: src/lib/compliance.ts
 * Tests:
 * 1. 10,000 Employee Scale & Memory/Latency Profiling
 * 2. 320-Permutation Rollup Priority Matrix & Priority Conflict Invariants
 * 3. Division-by-Zero, Zero-Employee & Score Boundary Fuzzing
 * 4. Corrupted Objects, Malformed Types & Edge-Case Date Arithmetic
 * 5. Monte Carlo Randomized Invariant Preservation (1,000 Batches)
 * 6. UI Helpers & Formatting Invariants
 */

import {
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
  calculateItemCompliance,
  addMonthsSafe,
  formatRoDate,
  getStatusBadgeInfo,
  getOverallStatusBadgeInfo,
  ComplianceStatus,
  EmployeeComplianceInput,
} from '../src/lib/compliance';

// Colors for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const msg = `FAILED: ${testName}${detail ? ` -> ${detail}` : ''}`;
    failureDetails.push(msg);
    console.error(`${RED}  ✗ [FAIL] ${testName}${RESET} ${detail ? `(${detail})` : ''}`);
  }
}

function expectEqual<T>(actual: T, expected: T, testName: string) {
  const match = actual === expected;
  assert(
    match,
    testName,
    match ? undefined : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

// Local date formatter extracting calendar YYYY-MM-DD
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Oracle function for status priority rollup
function oracleRollup(statuses: ComplianceStatus[]): ComplianceStatus {
  if (statuses.includes('OVERDUE')) return 'OVERDUE';
  if (statuses.includes('MISSING')) return 'MISSING';
  if (statuses.includes('UPCOMING')) return 'UPCOMING';
  return 'VALID';
}

console.log(`${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}${CYAN}   ADVERSARIAL STRESS TEST & EMPIRICAL AUDIT HARNESS (M1)       ${RESET}`);
console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

// ============================================================================
// SUITE 1: 10,000 EMPLOYEE SCALE, LATENCY & HEAP PROFILING
// ============================================================================
console.log(`${BOLD}▶ SUITE 1: Massive Scale Stress Test (10,000 Employees)${RESET}`);

const SCALE_COUNT = 10_000;
const refDate = new Date('2026-11-01T12:00:00Z');

const memBefore = process.memoryUsage();
const tStartSetup = performance.now();

// Generate 10,000 employees with diverse randomized compliance states
const scaleEmployees: EmployeeComplianceInput[] = [];

for (let i = 0; i < SCALE_COUNT; i++) {
  const isHygieneRequired = i % 2 === 0;

  // Varied dates relative to refDate:
  // - Valid: 6 months ago (with 12m interval -> 6m remaining > 30d)
  // - Upcoming: 11.5 months ago (with 12m interval -> ~15d remaining <= 30d)
  // - Overdue: 14 months ago (with 12m interval -> -2m remaining < 0d)
  // - Missing: null
  const getDateForState = (seedOffset: number): Date | null => {
    const mod = (i + seedOffset) % 4;
    switch (mod) {
      case 0:
        // Valid: ~180 days ago
        return new Date(refDate.getTime() - 180 * 24 * 3600 * 1000);
      case 1:
        // Upcoming: ~350 days ago (due in ~15 days for 12m interval)
        return new Date(refDate.getTime() - 350 * 24 * 3600 * 1000);
      case 2:
        // Overdue: ~400 days ago (due ~35 days ago for 12m interval)
        return new Date(refDate.getTime() - 400 * 24 * 3600 * 1000);
      case 3:
      default:
        // Missing
        return null;
    }
  };

  scaleEmployees.push({
    id: `emp-scale-${i}`,
    firstName: `Prenume${i}`,
    lastName: `Nume${i}`,
    medicalLastExamDate: getDateForState(0),
    medicalIntervalMonths: 12,
    ssmLastTrainingDate: getDateForState(1),
    ssmIntervalMonths: 6,
    psiLastTrainingDate: getDateForState(2),
    psiIntervalMonths: 6,
    hygieneRequested: isHygieneRequired,
    hygieneLastExamDate: isHygieneRequired ? getDateForState(3) : null,
    hygieneIntervalMonths: 36,
  });
}

const tSetupEnd = performance.now();

// 1. Measure calculateEmployeeCompliance on 10,000 employees individually
const tStartIndiv = performance.now();
const individualSummaries = [];
for (let i = 0; i < SCALE_COUNT; i++) {
  individualSummaries.push(calculateEmployeeCompliance(scaleEmployees[i], refDate));
}
const tEndIndiv = performance.now();
const indivDurationMs = tEndIndiv - tStartIndiv;
const indivThroughput = Math.round((SCALE_COUNT / indivDurationMs) * 1000);

// 2. Measure calculateCompanyMetrics aggregation across all 10,000 employees
const tStartAggr = performance.now();
const companyMetrics = calculateCompanyMetrics(scaleEmployees, refDate);
const tEndAggr = performance.now();
const aggrDurationMs = tEndAggr - tStartAggr;
const aggrThroughput = Math.round((SCALE_COUNT / aggrDurationMs) * 1000);

const memAfter = process.memoryUsage();
const heapDiffMb = ((memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024)).toFixed(2);
const heapTotalMb = (memAfter.heapUsed / (1024 * 1024)).toFixed(2);

console.log(`  ✓ 10,000 Employees generation: ${(tSetupEnd - tStartSetup).toFixed(2)} ms`);
console.log(`  ✓ Individual evaluation time: ${indivDurationMs.toFixed(2)} ms (${indivThroughput.toLocaleString()} evaluations/sec)`);
console.log(`  ✓ Company aggregation time:   ${aggrDurationMs.toFixed(2)} ms (${aggrThroughput.toLocaleString()} employees/sec)`);
console.log(`  ✓ Memory footprint: Heap diff: ${heapDiffMb} MB, Heap used: ${heapTotalMb} MB`);

// Scale Invariant Assertions
assert(indivDurationMs < 2000, 'Performance SLA: 10,000 individual evaluations under 2,000ms', `Actual: ${indivDurationMs.toFixed(2)}ms`);
assert(aggrDurationMs < 2000, 'Performance SLA: 10,000 aggregation rollup under 2,000ms', `Actual: ${aggrDurationMs.toFixed(2)}ms`);
expectEqual(companyMetrics.totalEmployees, 10_000, 'Scale: totalEmployees === 10,000');
expectEqual(
  companyMetrics.validCount +
    companyMetrics.upcomingCount +
    companyMetrics.overdueCount +
    companyMetrics.missingCount,
  companyMetrics.totalItemsTracked,
  'Scale Invariant: valid + upcoming + overdue + missing === totalItemsTracked'
);
// Total tracked items must equal 10,000 * 3 + 5,000 (hygiene) = 35,000
expectEqual(companyMetrics.totalItemsTracked, 35_000, 'Scale: totalItemsTracked === 35,000 (3 mandatory + 50% hygiene)');
assert(
  companyMetrics.complianceScorePercent >= 0 && companyMetrics.complianceScorePercent <= 100,
  'Scale: complianceScorePercent in [0, 100]',
  `Got: ${companyMetrics.complianceScorePercent}%`
);
const expectedCalculatedScore = Math.round((companyMetrics.validCount / companyMetrics.totalItemsTracked) * 10000) / 100;
expectEqual(companyMetrics.complianceScorePercent, expectedCalculatedScore, 'Scale: exact score match with 2-decimal rounding');


// ============================================================================
// SUITE 2: ROLLUP PRIORITY CONFLICTS & PERMUTATION MATRIX (320 COMBINATIONS)
// ============================================================================
console.log(`\n${BOLD}▶ SUITE 2: Rollup Priority Matrix & Priority Conflicts (320 Combinations)${RESET}`);

const STATUSES: ComplianceStatus[] = ['VALID', 'UPCOMING', 'OVERDUE', 'MISSING'];

// Helper to construct a mock lastDate that yields the requested status relative to refDate
function makeDateForStatus(status: ComplianceStatus, intervalMonths: number): Date | null {
  switch (status) {
    case 'VALID':
      // 45 days remaining: refDate + 45 days - intervalMonths
      return new Date(refDate.getTime() - (intervalMonths * 30 - 45) * 24 * 3600 * 1000);
    case 'UPCOMING':
      // 15 days remaining: refDate + 15 days - intervalMonths
      return new Date(refDate.getTime() - (intervalMonths * 30 - 15) * 24 * 3600 * 1000);
    case 'OVERDUE':
      // -10 days remaining: refDate - 10 days - intervalMonths
      return new Date(refDate.getTime() - (intervalMonths * 30 + 10) * 24 * 3600 * 1000);
    case 'MISSING':
    default:
      return null;
  }
}

// 1. Specific Dispatch Conflict Test: 1 OVERDUE, 1 MISSING, 1 UPCOMING, 1 VALID -> OVERDUE
const conflictEmp: EmployeeComplianceInput = {
  id: 'conflict-1',
  medicalLastExamDate: makeDateForStatus('OVERDUE', 12),
  medicalIntervalMonths: 12,
  ssmLastTrainingDate: makeDateForStatus('MISSING', 6),
  ssmIntervalMonths: 6,
  psiLastTrainingDate: makeDateForStatus('UPCOMING', 6),
  psiIntervalMonths: 6,
  hygieneRequested: true,
  hygieneLastExamDate: makeDateForStatus('VALID', 36),
  hygieneIntervalMonths: 36,
};
const conflictSummary = calculateEmployeeCompliance(conflictEmp, refDate);
expectEqual(conflictSummary.overallStatus, 'OVERDUE', 'Dispatch Requirement: OVERDUE + MISSING + UPCOMING + VALID must evaluate to OVERDUE strictly');
expectEqual(conflictSummary.occupationalMedicine.status, 'OVERDUE', 'Item 1 check');
expectEqual(conflictSummary.ssmTraining.status, 'MISSING', 'Item 2 check');
expectEqual(conflictSummary.psiTraining.status, 'UPCOMING', 'Item 3 check');
expectEqual(conflictSummary.hygieneCertificate?.status, 'VALID', 'Item 4 check');

// 2. Specific Sub-Hierarchy Conflicts:
// MISSING + UPCOMING + VALID -> MISSING
const missingUpcomingValid: EmployeeComplianceInput = {
  id: 'conflict-muv',
  medicalLastExamDate: makeDateForStatus('MISSING', 12),
  ssmLastTrainingDate: makeDateForStatus('UPCOMING', 6),
  psiLastTrainingDate: makeDateForStatus('VALID', 6),
  hygieneRequested: false,
};
expectEqual(
  calculateEmployeeCompliance(missingUpcomingValid, refDate).overallStatus,
  'MISSING',
  'Priority Conflict: MISSING + UPCOMING + VALID -> MISSING strictly'
);

// UPCOMING + VALID -> UPCOMING
const upcomingValid: EmployeeComplianceInput = {
  id: 'conflict-uv',
  medicalLastExamDate: makeDateForStatus('UPCOMING', 12),
  ssmLastTrainingDate: makeDateForStatus('VALID', 6),
  psiLastTrainingDate: makeDateForStatus('VALID', 6),
  hygieneRequested: false,
};
expectEqual(
  calculateEmployeeCompliance(upcomingValid, refDate).overallStatus,
  'UPCOMING',
  'Priority Conflict: UPCOMING + VALID + VALID -> UPCOMING strictly'
);

// ALL VALID -> VALID
const allValid: EmployeeComplianceInput = {
  id: 'conflict-all-v',
  medicalLastExamDate: makeDateForStatus('VALID', 12),
  ssmLastTrainingDate: makeDateForStatus('VALID', 6),
  psiLastTrainingDate: makeDateForStatus('VALID', 6),
  hygieneRequested: true,
  hygieneLastExamDate: makeDateForStatus('VALID', 36),
};
expectEqual(
  calculateEmployeeCompliance(allValid, refDate).overallStatus,
  'VALID',
  'Priority Hierarchy: ALL VALID -> VALID strictly'
);

// 3. Test all permutations of 4 items (4^4 = 256)
let permutationFailures = 0;
for (const med of STATUSES) {
  for (const ssm of STATUSES) {
    for (const psi of STATUSES) {
      for (const hyg of STATUSES) {
        const testEmp: EmployeeComplianceInput = {
          id: `perm-${med}-${ssm}-${psi}-${hyg}`,
          medicalLastExamDate: makeDateForStatus(med, 12),
          medicalIntervalMonths: 12,
          ssmLastTrainingDate: makeDateForStatus(ssm, 6),
          ssmIntervalMonths: 6,
          psiLastTrainingDate: makeDateForStatus(psi, 6),
          psiIntervalMonths: 6,
          hygieneRequested: true,
          hygieneLastExamDate: makeDateForStatus(hyg, 36),
          hygieneIntervalMonths: 36,
        };
        const summary = calculateEmployeeCompliance(testEmp, refDate);
        const expected = oracleRollup([
          summary.occupationalMedicine.status,
          summary.ssmTraining.status,
          summary.psiTraining.status,
          summary.hygieneCertificate!.status,
        ]);

        if (summary.overallStatus !== expected) {
          permutationFailures++;
          assert(
            false,
            `Permutation [${med}, ${ssm}, ${psi}, ${hyg}]`,
            `Expected ${expected}, got ${summary.overallStatus}`
          );
        }
      }
    }
  }
}
assert(
  permutationFailures === 0,
  `Exhaustive 256 4-item status permutations matched oracle rollup with 0 failures`
);

// 4. Test all permutations of 3 items (hygiene not requested, 4^3 = 64)
let perm3Failures = 0;
for (const med of STATUSES) {
  for (const ssm of STATUSES) {
    for (const psi of STATUSES) {
      const testEmp: EmployeeComplianceInput = {
        id: `perm3-${med}-${ssm}-${psi}`,
        medicalLastExamDate: makeDateForStatus(med, 12),
        medicalIntervalMonths: 12,
        ssmLastTrainingDate: makeDateForStatus(ssm, 6),
        ssmIntervalMonths: 6,
        psiLastTrainingDate: makeDateForStatus(psi, 6),
        psiIntervalMonths: 6,
        hygieneRequested: false,
      };
      const summary = calculateEmployeeCompliance(testEmp, refDate);
      const expected = oracleRollup([
        summary.occupationalMedicine.status,
        summary.ssmTraining.status,
        summary.psiTraining.status,
      ]);

      if (summary.overallStatus !== expected) {
        perm3Failures++;
        assert(
          false,
          `Permutation 3-item [${med}, ${ssm}, ${psi}]`,
          `Expected ${expected}, got ${summary.overallStatus}`
        );
      }
    }
  }
}
assert(
  perm3Failures === 0,
  `Exhaustive 64 3-item status permutations matched oracle rollup with 0 failures`
);


// ============================================================================
// SUITE 3: ZERO-DIVISION, BOUNDARY & DECIMAL INVARIANTS FUZZING
// ============================================================================
console.log(`\n${BOLD}▶ SUITE 3: Division-by-Zero, Zero-Employee & Score Boundary Fuzzing${RESET}`);

// 1. Zero employees
const zeroMetrics = calculateCompanyMetrics([], refDate);
expectEqual(zeroMetrics.totalEmployees, 0, 'Zero Employees: totalEmployees === 0');
expectEqual(zeroMetrics.totalItemsTracked, 0, 'Zero Employees: totalItemsTracked === 0');
expectEqual(zeroMetrics.validCount, 0, 'Zero Employees: validCount === 0');
expectEqual(zeroMetrics.upcomingCount, 0, 'Zero Employees: upcomingCount === 0');
expectEqual(zeroMetrics.overdueCount, 0, 'Zero Employees: overdueCount === 0');
expectEqual(zeroMetrics.missingCount, 0, 'Zero Employees: missingCount === 0');
expectEqual(zeroMetrics.complianceScorePercent, 100, 'Zero Employees: complianceScorePercent === 100 (Safe fallback, not NaN)');
assert(!Number.isNaN(zeroMetrics.complianceScorePercent), 'Zero Employees: score is NOT NaN');
assert(Number.isFinite(zeroMetrics.complianceScorePercent), 'Zero Employees: score is finite');

// 2. Company with 0% score (all items overdue or missing)
const allOverdueEmp: EmployeeComplianceInput = {
  id: 'zero-score-emp',
  medicalLastExamDate: makeDateForStatus('OVERDUE', 12),
  ssmLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  psiLastTrainingDate: makeDateForStatus('MISSING', 6),
  hygieneRequested: false,
};
const zeroScoreMetrics = calculateCompanyMetrics([allOverdueEmp], refDate);
expectEqual(zeroScoreMetrics.validCount, 0, '0% Score: validCount === 0');
expectEqual(zeroScoreMetrics.complianceScorePercent, 0, '0% Score: complianceScorePercent === 0');

// 3. Repeating decimals and exact 2-decimal rounding
// 1 valid out of 3 tracked (1 / 3 = 33.3333...%)
const thirdEmp: EmployeeComplianceInput = {
  id: 'third-emp',
  medicalLastExamDate: makeDateForStatus('VALID', 12),
  ssmLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  psiLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  hygieneRequested: false,
};
const thirdMetrics = calculateCompanyMetrics([thirdEmp], refDate);
expectEqual(thirdMetrics.totalItemsTracked, 3, '1/3 test: totalItemsTracked === 3');
expectEqual(thirdMetrics.validCount, 1, '1/3 test: validCount === 1');
expectEqual(thirdMetrics.complianceScorePercent, 33.33, '1/3 ratio: rounds strictly to 33.33%');

// 2 valid out of 3 tracked (2 / 3 = 66.6666...%)
const twoThirdsEmp: EmployeeComplianceInput = {
  id: 'twothirds-emp',
  medicalLastExamDate: makeDateForStatus('VALID', 12),
  ssmLastTrainingDate: makeDateForStatus('VALID', 6),
  psiLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  hygieneRequested: false,
};
const twoThirdsMetrics = calculateCompanyMetrics([twoThirdsEmp], refDate);
expectEqual(twoThirdsMetrics.complianceScorePercent, 66.67, '2/3 ratio: rounds strictly to 66.67%');

// 1 valid out of 7 tracked (2 employees: 1 with hygiene, 1 without; 1 valid, 6 overdue)
const empA: EmployeeComplianceInput = {
  id: 'empA',
  medicalLastExamDate: makeDateForStatus('VALID', 12),
  ssmLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  psiLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  hygieneRequested: true,
  hygieneLastExamDate: makeDateForStatus('OVERDUE', 36),
}; // 4 items (1 valid, 3 overdue)
const empB: EmployeeComplianceInput = {
  id: 'empB',
  medicalLastExamDate: makeDateForStatus('OVERDUE', 12),
  ssmLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  psiLastTrainingDate: makeDateForStatus('OVERDUE', 6),
  hygieneRequested: false,
}; // 3 items (3 overdue) -> total 7 items, 1 valid
const seventhMetrics = calculateCompanyMetrics([empA, empB], refDate);
expectEqual(seventhMetrics.totalItemsTracked, 7, '1/7 test: totalItemsTracked === 7');
expectEqual(seventhMetrics.complianceScorePercent, 14.29, '1/7 ratio: rounds strictly to 14.29%');


// ============================================================================
// SUITE 4: CORRUPTED OBJECTS, MALFORMED TYPES & ADVERSARIAL FUZZING
// ============================================================================
console.log(`\n${BOLD}▶ SUITE 4: Corrupted Objects, Malformed Types & Edge-Case Fuzzing${RESET}`);

// 1. Non-array inputs to calculateCompanyMetrics
const nullInputMetrics = calculateCompanyMetrics(null as unknown as EmployeeComplianceInput[], refDate);
expectEqual(nullInputMetrics.totalEmployees, 0, 'calculateCompanyMetrics(null) returns 0 employees');
expectEqual(nullInputMetrics.complianceScorePercent, 100, 'calculateCompanyMetrics(null) returns 100%');

const undefInputMetrics = calculateCompanyMetrics(undefined as unknown as EmployeeComplianceInput[], refDate);
expectEqual(undefInputMetrics.totalEmployees, 0, 'calculateCompanyMetrics(undefined) returns 0 employees');

const stringInputMetrics = calculateCompanyMetrics('garbage' as unknown as EmployeeComplianceInput[], refDate);
expectEqual(stringInputMetrics.totalEmployees, 0, 'calculateCompanyMetrics("garbage") returns 0 employees');

// 2. Array containing corrupted / null / undefined objects
const corruptedArray = [
  null,
  undefined,
  {},
  { id: 123 },
  { lastName: null, firstName: undefined },
  { medicalLastExamDate: 'not a date' },
  { medicalLastExamDate: new Date('invalid') },
  { medicalIntervalMonths: -5 },
  { medicalIntervalMonths: 0 },
  { medicalIntervalMonths: '12' },
  { medicalIntervalMonths: NaN },
  { hygieneRequested: 'invalid boolean' },
  { hygieneRequested: false, hygieneLastExamDate: '2025-01-01' }, // date present triggers hygiene tracking
];

let corruptedRunFailed = false;
let corruptedMetricsResult: unknown = null;
try {
  corruptedMetricsResult = calculateCompanyMetrics(corruptedArray as unknown as EmployeeComplianceInput[], refDate);
} catch (err) {
  corruptedRunFailed = true;
  assert(false, 'calculateCompanyMetrics crashed on corrupted array', String(err));
}
if (!corruptedRunFailed && corruptedMetricsResult) {
  const m = corruptedMetricsResult as ReturnType<typeof calculateCompanyMetrics>;
  assert(true, 'calculateCompanyMetrics handled array of corrupted objects without throwing');
  expectEqual(m.totalEmployees, corruptedArray.length, 'Corrupted: processed all elements');
  expectEqual(
    m.validCount + m.upcomingCount + m.overdueCount + m.missingCount,
    m.totalItemsTracked,
    'Corrupted: invariant valid+upcoming+overdue+missing === totalItemsTracked preserved'
  );
}

// 3. calculateItemCompliance with adversarial inputs
const nanDateResult = calculateItemCompliance('invalid-date-string', 12, 'Test Label', refDate);
expectEqual(nanDateResult.status, 'MISSING', 'Invalid date string returns MISSING');
expectEqual(nanDateResult.dueDate, null, 'Invalid date string returns dueDate === null');
expectEqual(nanDateResult.daysRemaining, null, 'Invalid date string returns daysRemaining === null');

const nullDateResult = calculateItemCompliance(null, 12, 'Test Label', refDate);
expectEqual(nullDateResult.status, 'MISSING', 'null date returns MISSING');

const zeroIntervalResult = calculateItemCompliance(new Date(2026, 0, 1), 0, 'Test Label', refDate);
expectEqual(zeroIntervalResult.intervalMonths, 12, 'intervalMonths === 0 falls back safely to default 12');

const negIntervalResult = calculateItemCompliance(new Date(2026, 0, 1), -6, 'Test Label', refDate);
expectEqual(negIntervalResult.intervalMonths, 12, 'negative intervalMonths falls back safely to default 12');

const nanIntervalResult = calculateItemCompliance(new Date(2026, 0, 1), NaN, 'Test Label', refDate);
expectEqual(nanIntervalResult.intervalMonths, 12, 'NaN intervalMonths falls back safely to default 12');

// 4. Leap years, century boundaries and month clamping
// Leap year 2024 (divisible by 4) -> 2024-02-29 + 12m -> 2025-02-28
const leap2024 = addMonthsSafe(new Date(2024, 1, 29), 12);
expectEqual(formatLocalDate(leap2024), '2025-02-28', '2024-02-29 + 12m -> 2025-02-28');

// Century leap year 2000 (divisible by 400 -> leap year)
const leap2000 = addMonthsSafe(new Date(2000, 1, 29), 12);
expectEqual(formatLocalDate(leap2000), '2001-02-28', '2000-02-29 + 12m -> 2001-02-28');

// Non-leap year 2023 Feb 28 + 12m should remain Feb 28 2024
const nonLeap2023 = addMonthsSafe(new Date(2023, 1, 28), 12);
expectEqual(formatLocalDate(nonLeap2023), '2024-02-28', '2023-02-28 + 12m -> 2024-02-28 (does not drift to 29)');

// December to February across year boundary (Dec 31 + 2m -> Feb 28)
const dec31 = addMonthsSafe(new Date(2025, 11, 31), 2);
expectEqual(formatLocalDate(dec31), '2026-02-28', '2025-12-31 + 2m -> 2026-02-28 (clamped to end of Feb)');

// String input to addMonthsSafe
const stringInputDate = addMonthsSafe('2024-02-29', 12);
expectEqual(formatLocalDate(stringInputDate), '2025-02-28', 'String "2024-02-29" + 12m -> 2025-02-28');

// Invalid date string input to addMonthsSafe must throw
let addMonthsThrew = false;
try {
  addMonthsSafe('corrupted-date', 12);
} catch {
  addMonthsThrew = true;
}
assert(addMonthsThrew, 'addMonthsSafe("corrupted-date") safely throws Error');


// ============================================================================
// SUITE 5: MONTE CARLO RANDOMIZED INVARIANT PRESERVATION (1,000 RUNS)
// ============================================================================
console.log(`\n${BOLD}▶ SUITE 5: Monte Carlo Invariant Stress Fuzzing (1,000 Randomized Batches)${RESET}`);

let invariantViolations = 0;
const MONTE_CARLO_RUNS = 1_000;

for (let run = 0; run < MONTE_CARLO_RUNS; run++) {
  // Random batch size between 0 and 50
  const batchSize = Math.floor(Math.random() * 51);
  const batch: EmployeeComplianceInput[] = [];

  for (let j = 0; j < batchSize; j++) {
    const randState = () => {
      const p = Math.random();
      if (p < 0.25) return new Date(refDate.getTime() + Math.random() * 300 * 86400000); // future
      if (p < 0.50) return new Date(refDate.getTime() - Math.random() * 300 * 86400000); // past
      if (p < 0.75) return null;
      return undefined;
    };

    batch.push({
      id: `mc-${run}-${j}`,
      medicalLastExamDate: randState(),
      medicalIntervalMonths: Math.random() < 0.1 ? 0 : Math.floor(Math.random() * 24) + 1,
      ssmLastTrainingDate: randState(),
      ssmIntervalMonths: Math.random() < 0.1 ? -1 : Math.floor(Math.random() * 12) + 1,
      psiLastTrainingDate: randState(),
      psiIntervalMonths: Math.floor(Math.random() * 12) + 1,
      hygieneRequested: Math.random() < 0.5,
      hygieneLastExamDate: randState(),
      hygieneIntervalMonths: 36,
    });
  }

  const metrics = calculateCompanyMetrics(batch, refDate);

  // Invariant 1: Sum of breakdown counts strictly equals totalItemsTracked
  const sum = metrics.validCount + metrics.upcomingCount + metrics.overdueCount + metrics.missingCount;
  if (sum !== metrics.totalItemsTracked) {
    invariantViolations++;
    assert(false, `Monte Carlo run ${run}: sum !== totalItemsTracked`, `${sum} !== ${metrics.totalItemsTracked}`);
    break;
  }

  // Invariant 2: Score in [0, 100]
  if (metrics.complianceScorePercent < 0 || metrics.complianceScorePercent > 100 || Number.isNaN(metrics.complianceScorePercent)) {
    invariantViolations++;
    assert(false, `Monte Carlo run ${run}: invalid score`, `Score: ${metrics.complianceScorePercent}`);
    break;
  }

  // Invariant 3: Score calculation exact formula match
  const expectedScore = metrics.totalItemsTracked === 0
    ? 100
    : Math.round((metrics.validCount / metrics.totalItemsTracked) * 10000) / 100;
  if (metrics.complianceScorePercent !== expectedScore) {
    invariantViolations++;
    assert(false, `Monte Carlo run ${run}: score mismatch`, `${metrics.complianceScorePercent} !== ${expectedScore}`);
    break;
  }
}

assert(
  invariantViolations === 0,
  `Monte Carlo: 1,000 randomized batches passed all invariants with 0 violations`
);


// ============================================================================
// SUITE 6: UI HELPERS & FORMATTING INVARIANTS
// ============================================================================
console.log(`\n${BOLD}▶ SUITE 6: UI Helpers & Formatting Invariants${RESET}`);

expectEqual(formatRoDate(null), '—', 'formatRoDate(null) === "—"');
expectEqual(formatRoDate(undefined), '—', 'formatRoDate(undefined) === "—"');
expectEqual(formatRoDate('invalid'), '—', 'formatRoDate("invalid") === "—"');
expectEqual(formatRoDate(new Date(2026, 0, 15)), '15.01.2026', 'formatRoDate(2026-01-15) === "15.01.2026"');
expectEqual(formatRoDate(new Date(2026, 11, 31)), '31.12.2026', 'formatRoDate(2026-12-31) === "31.12.2026"');

// Badge info
const badgeValid = getStatusBadgeInfo('VALID', 45);
expectEqual(badgeValid.text, 'VALID (45z)', 'Badge VALID (45z)');
assert(badgeValid.className.includes('emerald'), 'Badge VALID contains emerald styling');

const badgeDueToday = getStatusBadgeInfo('UPCOMING', 0);
expectEqual(badgeDueToday.text, 'SCADENT AZI', 'Badge UPCOMING 0d === "SCADENT AZI"');

const badgeOverdue = getStatusBadgeInfo('OVERDUE', -15);
expectEqual(badgeOverdue.text, 'EXPIRAT (15z)', 'Badge OVERDUE -15d === "EXPIRAT (15z)"');

const badgeMissing = getStatusBadgeInfo('MISSING');
expectEqual(badgeMissing.text, 'NEÎNREGISTRAT', 'Badge MISSING === "NEÎNREGISTRAT"');
assert(badgeMissing.className.includes('rose'), 'Badge MISSING contains rose styling');

// Overall badges
for (const s of STATUSES) {
  const overall = getOverallStatusBadgeInfo(s);
  assert(overall.text.length > 0, `Overall badge for ${s} has text`);
  assert(overall.className.length > 0, `Overall badge for ${s} has styling`);
}


// ============================================================================
// FINAL SUMMARY & EMPIRICAL VERDICT
// ============================================================================
console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
console.log(`${BOLD}ADVERSARIAL STRESS TEST SUMMARY:${RESET}`);
console.log(`  Total Assertions Checked: ${totalAssertions}`);
console.log(`  Passed:                   ${GREEN}${passedAssertions}${RESET}`);
console.log(`  Failed:                   ${failedAssertions > 0 ? RED : GREEN}${failedAssertions}${RESET}`);
if (failedAssertions > 0) {
  console.log(`\n${RED}FAILURES RECORDED:${RESET}`);
  for (const f of failureDetails) {
    console.log(`  ${RED}• ${f}${RESET}`);
  }
  console.log(`\n${BOLD}${RED}EMPIRICAL VERDICT: REJECT${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${BOLD}${GREEN}EMPIRICAL VERDICT: APPROVE${RESET}`);
  console.log(`All mathematical invariants, scale thresholds, and priority hierarchies hold under adversarial stress.`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);
  process.exit(0);
}
