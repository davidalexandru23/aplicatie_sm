/**
 * scripts/test-challenger1-stress.ts
 * 
 * Adversarial Stress-Test Harness for Milestone 1 Challenger 1:
 * - Centurial leap years (2000, 2100, 2200, 2300, 2400, 1900, 2096, 2104, 2396)
 * - Negative, zero, large, and extreme intervals (-1200m to +12000m, Infinity, NaN)
 * - DST transitions across Europe/Bucharest, Europe/London, Europe/Berlin, UTC, America/New_York, Australia/Sydney
 * - Off-by-one second/millisecond attacks around midnight (23:59:59.999 vs 00:00:00.000)
 * - Exact threshold boundaries (-1d, 0d, +1d, +30d, +31d)
 * - Malformed / hostile inputs (NaN, null, undefined, corrupted objects)
 * - High-volume randomized property testing (10,000 iterations)
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  addMonthsSafe,
  calculateItemCompliance,
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
  formatRoDate,
  getStatusBadgeInfo,
  getOverallStatusBadgeInfo,
  COMPLIANCE_CONSTANTS,
  EmployeeComplianceInput,
} from '../src/lib/compliance';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function runTest(name: string, fn: () => void): void {
  totalAssertions++;
  try {
    fn();
    passedAssertions++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: unknown) {
    failedAssertions++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ [FAIL] ${name}: ${msg}`);
  }
}

console.log('================================================================');
console.log('  CHALLENGER 1: ADVERSARIAL STRESS-TEST HARNESS (COMPLIANCE)    ');
console.log('================================================================\n');

// =============================================================================
// SUITE 1: Centurial Leap Year Edge Cases
// =============================================================================
console.log('▶ SUITE 1: Centurial Leap Year Edge Cases (Centuries 2000..2400, 1900)');

runTest('Year 2000 is leap: 2000-02-29 is valid and preserved', () => {
  const d = new Date(2000, 1, 29);
  assert.equal(d.getDate(), 29);
  assert.equal(d.getMonth(), 1);
  assert.equal(d.getFullYear(), 2000);
});

runTest('Year 2100 is NOT leap: 2000-02-29 + 1200 months (100y) -> 2100-02-28', () => {
  const res = addMonthsSafe(new Date(2000, 1, 29), 1200);
  assert.equal(formatDate(res), '2100-02-28');
});

runTest('Year 2100 is NOT leap: 2096-02-29 + 48 months (4y) -> 2100-02-28', () => {
  const res = addMonthsSafe(new Date(2096, 1, 29), 48);
  assert.equal(formatDate(res), '2100-02-28');
});

runTest('Year 2100 is NOT leap: 2104-02-29 - 48 months (-4y) -> 2100-02-28', () => {
  const res = addMonthsSafe(new Date(2104, 1, 29), -48);
  assert.equal(formatDate(res), '2100-02-28');
});

runTest('Year 2200 is NOT leap: 2100-02-28 + 1200 months -> 2200-02-28', () => {
  const res = addMonthsSafe(new Date(2100, 1, 28), 1200);
  assert.equal(formatDate(res), '2200-02-28');
});

runTest('Year 2300 is NOT leap: 2200-02-28 + 1200 months -> 2300-02-28', () => {
  const res = addMonthsSafe(new Date(2200, 1, 28), 1200);
  assert.equal(formatDate(res), '2300-02-28');
});

runTest('Year 2400 IS leap: 2396-02-29 + 48 months -> 2400-02-29', () => {
  const res = addMonthsSafe(new Date(2396, 1, 29), 48);
  assert.equal(formatDate(res), '2400-02-29');
});

runTest('Year 2400 IS leap: 2000-02-29 + 4800 months (400y) -> 2400-02-29', () => {
  const res = addMonthsSafe(new Date(2000, 1, 29), 4800);
  assert.equal(formatDate(res), '2400-02-29');
});

runTest('Year 1900 was NOT leap: 1904-02-29 - 48 months -> 1900-02-28', () => {
  const res = addMonthsSafe(new Date(1904, 1, 29), -48);
  assert.equal(formatDate(res), '1900-02-28');
});

runTest('Jan 31 in leap 2000: 2000-01-31 + 1 month -> 2000-02-29', () => {
  const res = addMonthsSafe(new Date(2000, 0, 31), 1);
  assert.equal(formatDate(res), '2000-02-29');
});

runTest('Jan 31 in non-leap 2100: 2100-01-31 + 1 month -> 2100-02-28', () => {
  const res = addMonthsSafe(new Date(2100, 0, 31), 1);
  assert.equal(formatDate(res), '2100-02-28');
});

// =============================================================================
// SUITE 2: Negative, Zero, and Extreme Intervals
// =============================================================================
console.log('\n▶ SUITE 2: Negative, Zero, Large, and Extreme Intervals');

runTest('addMonthsSafe with negative 1 month: 2024-03-31 - 1m -> 2024-02-29 (leap)', () => {
  const res = addMonthsSafe(new Date(2024, 2, 31), -1);
  assert.equal(formatDate(res), '2024-02-29');
});

runTest('addMonthsSafe with negative 1 month: 2023-03-31 - 1m -> 2023-02-28 (common)', () => {
  const res = addMonthsSafe(new Date(2023, 2, 31), -1);
  assert.equal(formatDate(res), '2023-02-28');
});

runTest('addMonthsSafe with negative 6 months: 2024-08-31 - 6m -> 2024-02-29', () => {
  const res = addMonthsSafe(new Date(2024, 7, 31), -6);
  assert.equal(formatDate(res), '2024-02-29');
});

runTest('addMonthsSafe with negative 12 months: 2024-02-29 - 12m -> 2023-02-28', () => {
  const res = addMonthsSafe(new Date(2024, 1, 29), -12);
  assert.equal(formatDate(res), '2023-02-28');
});

runTest('addMonthsSafe with negative 1200 months (100y): 2024-06-15 - 1200m -> 1924-06-15', () => {
  const res = addMonthsSafe(new Date(2024, 5, 15), -1200);
  assert.equal(formatDate(res), '1924-06-15');
});

runTest('addMonthsSafe with 0 months: 2024-02-29 + 0m -> 2024-02-29 (identity)', () => {
  const res = addMonthsSafe(new Date(2024, 1, 29), 0);
  assert.equal(formatDate(res), '2024-02-29');
});

runTest('addMonthsSafe with 1200 months (100y): 2024-06-15 + 1200m -> 2124-06-15', () => {
  const res = addMonthsSafe(new Date(2024, 5, 15), 1200);
  assert.equal(formatDate(res), '2124-06-15');
});

runTest('addMonthsSafe with 12000 months (1000y): 2024-06-15 + 12000m -> 3024-06-15', () => {
  const res = addMonthsSafe(new Date(2024, 5, 15), 12000);
  assert.equal(formatDate(res), '3024-06-15');
});

runTest('calculateItemCompliance with intervalMonths <= 0 safely defaults to 12', () => {
  const resZero = calculateItemCompliance(new Date(2024, 0, 1), 0, 'Test');
  assert.equal(resZero.intervalMonths, 12);
  const resNeg = calculateItemCompliance(new Date(2024, 0, 1), -6, 'Test');
  assert.equal(resNeg.intervalMonths, 12);
});

runTest('calculateItemCompliance with intervalMonths = NaN safely defaults to 12', () => {
  const resNaN = calculateItemCompliance(new Date(2024, 0, 1), NaN, 'Test');
  assert.equal(resNaN.intervalMonths, 12);
});

runTest('calculateItemCompliance with intervalMonths = Infinity handles gracefully', () => {
  const resInf = calculateItemCompliance(new Date(2024, 0, 1), Infinity, 'Test');
  // Infinity > 0 so interval is Infinity, dueDate is Invalid Date, daysRemaining is NaN
  assert.ok(resInf.status === 'VALID' || resInf.status === 'MISSING');
});

// =============================================================================
// SUITE 3: Daylight Saving Time Across Multiple Timezones
// =============================================================================
console.log('\n▶ SUITE 3: Daylight Saving Time Transitions Across Multiple Timezones');

const timezones = [
  'Europe/Bucharest',
  'Europe/London',
  'Europe/Berlin',
  'UTC',
  'America/New_York',
  'Australia/Sydney',
];

for (const tz of timezones) {
  runTest(`DST transitions in ${tz}: 23h spring forward and 25h fall back preserve calendar day math`, () => {
    const code = `
      import assert from 'node:assert/strict';
      import { calculateItemCompliance } from './src/lib/compliance';
      
      // Spring forward transition: March 29 to April 2 (4 calendar days)
      const last1 = new Date(2023, 3, 2);
      const ref1 = new Date(2024, 2, 29);
      const res1 = calculateItemCompliance(last1, 12, 'Test', ref1);
      assert.equal(res1.daysRemaining, 4);

      // Fall back transition: Oct 25 to Oct 29 (4 calendar days)
      const last2 = new Date(2023, 9, 29);
      const ref2 = new Date(2024, 9, 25);
      const res2 = calculateItemCompliance(last2, 12, 'Test', ref2);
      assert.equal(res2.daysRemaining, 4);
    `;
    const out = execSync(`TZ=${tz} npx tsx -e "${code.replace(/"/g, '\\"')}"`).toString();
    assert.equal(out.trim(), '');
  });
}

// =============================================================================
// SUITE 4: Off-By-One Second & Millisecond Boundary Attacks Around Midnight
// =============================================================================
console.log('\n▶ SUITE 4: Off-By-One Second/Millisecond Attacks Around Midnight');

runTest('Same calendar day at 23:59:59.999 vs 00:00:00.000 -> 0d remaining (UPCOMING)', () => {
  const ref = new Date(2024, 4, 15, 23, 59, 59, 999);
  const last = new Date(2023, 4, 15, 0, 0, 0, 0);
  const res = calculateItemCompliance(last, 12, 'Medicină', ref);
  assert.equal(res.daysRemaining, 0);
  assert.equal(res.status, 'UPCOMING');
  const badge = getStatusBadgeInfo(res.status, res.daysRemaining);
  assert.equal(badge.text, 'SCADENT AZI');
});

runTest('Same calendar day at 00:00:00.000 vs 23:59:59.999 -> 0d remaining (UPCOMING)', () => {
  const ref = new Date(2024, 4, 15, 0, 0, 0, 0);
  const last = new Date(2023, 4, 15, 23, 59, 59, 999);
  const res = calculateItemCompliance(last, 12, 'Medicină', ref);
  assert.equal(res.daysRemaining, 0);
  assert.equal(res.status, 'UPCOMING');
  const badge = getStatusBadgeInfo(res.status, res.daysRemaining);
  assert.equal(badge.text, 'SCADENT AZI');
});

runTest('Next calendar day 00:00:00.000 vs ref 23:59:59.999 -> +1d remaining (UPCOMING)', () => {
  const ref = new Date(2024, 4, 15, 23, 59, 59, 999);
  const last = new Date(2023, 4, 16, 0, 0, 0, 0);
  const res = calculateItemCompliance(last, 12, 'Medicină', ref);
  assert.equal(res.daysRemaining, 1);
  assert.equal(res.status, 'UPCOMING');
  const badge = getStatusBadgeInfo(res.status, res.daysRemaining);
  assert.equal(badge.text, 'SCADENT (1z)');
});

runTest('Previous calendar day 23:59:59.999 vs ref 00:00:00.000 -> -1d remaining (OVERDUE)', () => {
  const ref = new Date(2024, 4, 16, 0, 0, 0, 0);
  const last = new Date(2023, 4, 15, 23, 59, 59, 999);
  const res = calculateItemCompliance(last, 12, 'Medicină', ref);
  assert.equal(res.daysRemaining, -1);
  assert.equal(res.status, 'OVERDUE');
  const badge = getStatusBadgeInfo(res.status, res.daysRemaining);
  assert.equal(badge.text, 'EXPIRAT (1z)');
});

runTest('Exact 30-day boundary at 23:59:59.999 vs 00:00:00.000 -> +30d remaining (UPCOMING)', () => {
  const ref = new Date(2024, 4, 1, 23, 59, 59, 999);
  const last = new Date(2023, 4, 31, 0, 0, 0, 0);
  const res = calculateItemCompliance(last, 12, 'Medicină', ref);
  assert.equal(res.daysRemaining, 30);
  assert.equal(res.status, 'UPCOMING');
  const badge = getStatusBadgeInfo(res.status, res.daysRemaining);
  assert.equal(badge.text, 'SCADENT (30z)');
});

runTest('Exact 31-day boundary at 00:00:00.000 vs 23:59:59.999 -> +31d remaining (VALID)', () => {
  const ref = new Date(2024, 4, 1, 0, 0, 0, 0);
  const last = new Date(2023, 5, 1, 23, 59, 59, 999);
  const res = calculateItemCompliance(last, 12, 'Medicină', ref);
  assert.equal(res.daysRemaining, 31);
  assert.equal(res.status, 'VALID');
  const badge = getStatusBadgeInfo(res.status, res.daysRemaining);
  assert.equal(badge.text, 'VALID (31z)');
});

// =============================================================================
// SUITE 5: Malformed & Hostile Inputs
// =============================================================================
console.log('\n▶ SUITE 5: Malformed, Null, and Corrupted Inputs');

runTest('addMonthsSafe with invalid date string throws descriptive Error', () => {
  assert.throws(
    () => addMonthsSafe('totally-not-a-date', 12),
    /Invalid date provided to addMonthsSafe/
  );
});

runTest('addMonthsSafe with NaN Date throws descriptive Error', () => {
  assert.throws(
    () => addMonthsSafe(new Date(NaN), 12),
    /Invalid date provided to addMonthsSafe/
  );
});

runTest('calculateItemCompliance with null lastDate returns MISSING without throwing', () => {
  const res = calculateItemCompliance(null, 12, 'Test');
  assert.equal(res.status, 'MISSING');
  assert.equal(res.lastDate, null);
  assert.equal(res.dueDate, null);
  assert.equal(res.daysRemaining, null);
});

runTest('calculateItemCompliance with undefined lastDate returns MISSING without throwing', () => {
  const res = calculateItemCompliance(undefined, 12, 'Test');
  assert.equal(res.status, 'MISSING');
});

runTest('calculateItemCompliance with empty string lastDate returns MISSING without throwing', () => {
  const res = calculateItemCompliance('', 12, 'Test');
  assert.equal(res.status, 'MISSING');
});

runTest('calculateItemCompliance with invalid date string returns MISSING without throwing', () => {
  const res = calculateItemCompliance('invalid-date-string', 12, 'Test');
  assert.equal(res.status, 'MISSING');
});

runTest('calculateEmployeeCompliance with null employee returns safe fallback', () => {
  const res = calculateEmployeeCompliance(null as unknown as EmployeeComplianceInput);
  assert.equal(res.employeeId, '');
  assert.equal(res.employeeName, 'Angajat');
  assert.equal(res.overallStatus, 'MISSING');
  assert.equal(res.occupationalMedicine.status, 'MISSING');
  assert.equal(res.ssmTraining.status, 'MISSING');
  assert.equal(res.psiTraining.status, 'MISSING');
  assert.equal(res.hygieneCertificate, null);
  const overallBadge = getOverallStatusBadgeInfo(res.overallStatus);
  assert.equal(overallBadge.text, 'DATE LIPSĂ');
});

runTest('calculateEmployeeCompliance with undefined employee returns safe fallback', () => {
  const res = calculateEmployeeCompliance(undefined as unknown as EmployeeComplianceInput);
  assert.equal(res.overallStatus, 'MISSING');
});

runTest('calculateEmployeeCompliance with corrupted object returns safe fallback', () => {
  const corrupted: Record<string, unknown> = {
    id: 12345, // number instead of string
    medicalLastExamDate: 'not a date',
    ssmIntervalMonths: -999,
    hygieneRequested: 'yes', // truthy string
    hygieneLastExamDate: null,
  };
  const res = calculateEmployeeCompliance(corrupted);
  assert.equal(res.employeeId, '12345');
  assert.equal(res.occupationalMedicine.status, 'MISSING');
  assert.equal(res.ssmTraining.status, 'MISSING');
  assert.equal(res.hygieneCertificate?.status, 'MISSING');
  assert.equal(res.overallStatus, 'MISSING');
});

runTest('calculateCompanyMetrics with empty array returns score 100% and 0 items', () => {
  const res = calculateCompanyMetrics([]);
  assert.equal(res.totalEmployees, 0);
  assert.equal(res.totalItemsTracked, 0);
  assert.equal(res.complianceScorePercent, 100);
});

runTest('calculateCompanyMetrics with null array returns score 100% and 0 items', () => {
  const res = calculateCompanyMetrics(null as unknown as EmployeeComplianceInput[]);
  assert.equal(res.totalEmployees, 0);
  assert.equal(res.complianceScorePercent, 100);
});

runTest('calculateCompanyMetrics with array of nulls/undefineds preserves invariant', () => {
  const res = calculateCompanyMetrics([
    null as unknown as EmployeeComplianceInput,
    undefined as unknown as EmployeeComplianceInput,
    {} as EmployeeComplianceInput,
  ]);
  assert.equal(res.totalEmployees, 3);
  assert.equal(res.totalItemsTracked, 9); // 3 items each
  assert.equal(res.missingCount, 9);
  assert.equal(res.validCount + res.upcomingCount + res.overdueCount + res.missingCount, res.totalItemsTracked);
  assert.equal(res.complianceScorePercent, 0);
});

runTest('formatRoDate handles date formats, null, and invalid dates safely', () => {
  assert.equal(formatRoDate(new Date(2024, 0, 15)), '15.01.2024');
  assert.equal(formatRoDate(null), '—');
  assert.equal(formatRoDate(undefined), '—');
  assert.equal(formatRoDate('invalid'), '—');
});

// =============================================================================
// SUITE 6: High-Volume Randomized Property Testing (Fuzzing 10,000 iterations)
// =============================================================================
console.log('\n▶ SUITE 6: High-Volume Randomized Property Testing (10,000 iterations)');

runTest('10,000 randomized date + interval pairs satisfy mathematical calendar invariant', () => {
  const testIntervals = [
    -120, -60, -36, -24, -12, -6, -3, -1, 0,
    1, 3, 6, 12, 24, 36, 48, 60, 120, 240, 1200,
  ];

  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    // Generate random date between 1950 and 2150
    const year = 1950 + Math.floor(Math.random() * 200);
    const month = Math.floor(Math.random() * 12);
    const maxDay = daysInMonth(year, month);
    const day = 1 + Math.floor(Math.random() * maxDay);
    const baseDate = new Date(year, month, day);

    // Pick random interval
    const interval = testIntervals[Math.floor(Math.random() * testIntervals.length)];

    const res = addMonthsSafe(baseDate, interval);
    assert.ok(!isNaN(res.getTime()), `Result must not be NaN at iteration ${i}`);

    // Oracle verification:
    // 1. Result day must not exceed days in target month
    const resYear = res.getFullYear();
    const resMonth = res.getMonth();
    const resDay = res.getDate();
    const maxTargetDay = daysInMonth(resYear, resMonth);
    assert.ok(resDay <= maxTargetDay, `Day ${resDay} exceeds max ${maxTargetDay} in ${resYear}-${resMonth + 1}`);

    // 2. Expected target month and year
    const expectedMonthIndex = month + interval;
    const expectedYear = year + Math.floor(expectedMonthIndex / 12);
    const expectedMonth = ((expectedMonthIndex % 12) + 12) % 12;
    assert.equal(resYear, expectedYear, `Year mismatch: got ${resYear}, expected ${expectedYear}`);
    assert.equal(resMonth, expectedMonth, `Month mismatch: got ${resMonth}, expected ${expectedMonth}`);

    // 3. Expected day: clamped to month end
    const expectedDay = Math.min(day, maxTargetDay);
    assert.equal(resDay, expectedDay, `Day mismatch: got ${resDay}, expected ${expectedDay}`);
  }
});

runTest('1,000 randomized calculateItemCompliance calls never produce corrupted status or uncaught throw', () => {
  for (let i = 0; i < 1000; i++) {
    const year = 2020 + Math.floor(Math.random() * 10);
    const month = Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    const lastDate = Math.random() < 0.1 ? null : new Date(year, month, day);
    const interval = Math.random() < 0.1 ? -5 : Math.floor(Math.random() * 36) + 1;
    const refYear = 2024 + Math.floor(Math.random() * 3);
    const refDate = new Date(refYear, 5, 15);

    const res = calculateItemCompliance(lastDate, interval, 'Random', refDate);
    assert.ok(['VALID', 'UPCOMING', 'OVERDUE', 'MISSING'].includes(res.status));
    if (res.status === 'MISSING') {
      assert.equal(res.daysRemaining, null);
      assert.equal(res.dueDate, null);
    } else {
      assert.ok(typeof res.daysRemaining === 'number');
      assert.ok(res.dueDate instanceof Date);
      if (res.daysRemaining < 0) {
        assert.equal(res.status, 'OVERDUE');
      } else if (res.daysRemaining <= COMPLIANCE_CONSTANTS.UPCOMING_THRESHOLD_DAYS) {
        assert.equal(res.status, 'UPCOMING');
      } else {
        assert.equal(res.status, 'VALID');
      }
    }
  }
});

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n================================================================');
console.log(`TOTAL ADVERSARIAL ASSERTIONS: ${totalAssertions}`);
console.log(`PASSED: ${passedAssertions}`);
console.log(`FAILED: ${failedAssertions}`);
console.log(`SUCCESS RATE: ${Math.round((passedAssertions / totalAssertions) * 100)}%`);
console.log('================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
}
