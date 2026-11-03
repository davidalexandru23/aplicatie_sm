/**
 * ============================================================================
 * UNIFIED VERIFICATION SUITE: ROMANIAN SSM, HR, AND HYGIENE COMPLIANCE SYSTEM
 * ============================================================================
 * 
 * Unified Acceptance Verification Gate (Requirement R4 & Milestone 4 F8).
 * Executes and verifies all 5 foundational acceptance pillars:
 * 
 * 1. Document Auto-Completion: 25/25 official templates (23 DOCX, 2 XLSX)
 *    generate cleanly with 0 unmapped placeholders and achieve 'approved_for_print'
 *    (calls scripts/test-all-templates-generation.ts).
 * 2. Compliance Tracking & Statutory Calculation: 45/45 statutory unit tests pass
 *    verifying HG 355/2007 (Medicina Muncii), Legea 319/2006 & HG 1425/2006 (SSM),
 *    Legea 307/2006 & OMAI 712/2005 (PSI), Ordinul MS/ME 2209/4469/2022 (Igienă),
 *    safe calendar month clamping, DST immunity, and 4-tier status rollups
 *    (calls scripts/verify-compliance.ts).
 * 3. Excel Import/Export Resilience & Round-Trip: 6/6 tests pass verifying
 *    dynamic header resolution, dirty data resilience, line attribution, safe partial
 *    commit with atomic rollback, expat passport validation, template downloads,
 *    and 100% round-trip fidelity (calls scripts/verify-excel-import-export.ts).
 * 4. Comprehensive Opaque-Box E2E Suite: 53/53 requirement-driven test cases pass
 *    across Tiers 1–4 (Feature isolation, Boundaries, Cross-feature combinations,
 *    and Full Romanian Employee Lifecycle) (calls scripts/e2e-suite.ts).
 * 5. Production Application Build: Executes npm run build verifying clean
 *    compilation under Next.js Turbopack with 0 errors.
 * 
 * Invocation:
 *   npx tsx scripts/verify-all.ts
 * ============================================================================
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

// ============================================================================
// COLOR PALETTE & FORMATTING
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

interface SuiteExecutionResult {
  id: number;
  name: string;
  scope: string;
  passedCount: number;
  totalCount: number;
  durationMs: number;
  status: 'PASS' | 'FAIL';
  details: string;
}

// Helper to execute external command and capture output & timings
function runSubprocess(
  command: string,
  args: string[],
  extraEnv?: Record<string, string>,
  cwd: string = process.cwd()
): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '1', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - t0;
      resolve({
        exitCode: exitCode ?? 0,
        stdout,
        stderr,
        durationMs,
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - t0;
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message,
        durationMs,
      });
    });
  });
}

// ============================================================================
// MAIN EXECUTION CONTROLLER
// ============================================================================

async function runUnifiedVerification() {
  const globalStart = Date.now();

  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.white}  ROMANIAN SSM, HR & HYGIENE SYSTEM — UNIFIED ACCEPTANCE VERIFICATION SUITE${COLORS.reset}`);
  console.log(`${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.dim}Statutory Framework:${COLORS.reset} Legea 319/2006, HG 1425/2006, HG 355/2007, OMAI 712/2005, Ordin 2209/2022`);
  console.log(`${COLORS.dim}Environment:${COLORS.reset} Node.js ${process.version} | Next.js 16 App Router (Turbopack) | Prisma ORM 6`);
  console.log(`${COLORS.dim}Working Directory:${COLORS.reset} ${process.cwd()}`);
  console.log(`${COLORS.dim}Timestamp:${COLORS.reset} ${new Date().toISOString()}`);
  console.log(`${COLORS.cyan}================================================================================\n${COLORS.reset}`);

  const results: SuiteExecutionResult[] = [];

  // --------------------------------------------------------------------------
  // SUITE 1: 25/25 Document Templates Auto-Completion & Zero Placeholders
  // --------------------------------------------------------------------------
  console.log(`${COLORS.bright}${COLORS.blue}▶ SUITE 1: Document Auto-Completion (25/25 Official Templates)${COLORS.reset}`);
  console.log(`${COLORS.dim}  Executing scripts/test-all-templates-generation.ts...${COLORS.reset}`);

  const s1 = await runSubprocess('npx', ['tsx', 'scripts/test-all-templates-generation.ts']);

  // Programmatic disk verification of all 25 generated files
  const testDocsDir = path.join(process.cwd(), 'storage', 'test_documents');
  let diskUnmappedTotal = 0;
  let diskMissingFiles = 0;

  for (const tpl of TEMPLATE_CATALOG) {
    const filePath = path.join(testDocsDir, `TEST_${tpl.code}_${tpl.normalizedFilename}`);
    if (!fs.existsSync(filePath)) {
      diskMissingFiles++;
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const unmapped = await collectUnresolvedPlaceholders(buf, tpl.format);
    diskUnmappedTotal += unmapped.length;
  }

  const s1Passed =
    s1.exitCode === 0 &&
    diskMissingFiles === 0 &&
    diskUnmappedTotal === 0 &&
    s1.stdout.includes('TRECUTE (PASS): 25') &&
    s1.stdout.includes('EȘUATE (FAIL): 0');

  results.push({
    id: 1,
    name: 'Document Auto-Completion (25/25)',
    scope: '23 DOCX + 2 XLSX Templates',
    passedCount: s1Passed ? 25 : 0,
    totalCount: 25,
    durationMs: s1.durationMs,
    status: s1Passed ? 'PASS' : 'FAIL',
    details: s1Passed
      ? 'All 25 templates approved_for_print with 0 unmapped tokens on disk'
      : `Exit code: ${s1.exitCode}, missing: ${diskMissingFiles}, unmapped tokens: ${diskUnmappedTotal}`,
  });

  if (s1Passed) {
    console.log(`  ${COLORS.green}✓${COLORS.reset} Suite 1 Passed: 25/25 templates generated cleanly (${s1.durationMs}ms)`);
  } else {
    console.log(`  ${COLORS.red}✗${COLORS.reset} Suite 1 Failed (${s1.durationMs}ms)`);
    console.error(s1.stderr || s1.stdout);
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Compliance Deadline & Expiry Tracking (Statutory Engine)
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}▶ SUITE 2: Compliance Deadline & Expiry Tracking (Statutory Engine)${COLORS.reset}`);
  console.log(`${COLORS.dim}  Executing scripts/verify-compliance.ts...${COLORS.reset}`);

  const s2 = await runSubprocess('npx', ['tsx', 'scripts/verify-compliance.ts']);
  const s2Match = s2.stdout.match(/REZULTAT SUITĂ COMPLIANCE: (\d+) \/ (\d+) teste trecute/);
  const s2PassedCount = s2Match ? parseInt(s2Match[1], 10) : 0;
  const s2TotalCount = s2Match ? parseInt(s2Match[2], 10) : 45;
  const s2Passed = s2.exitCode === 0 && s2PassedCount === s2TotalCount && s2TotalCount > 0;

  results.push({
    id: 2,
    name: 'Compliance Deadlines & Expiry',
    scope: 'Statutory Intervals & Month Clamping',
    passedCount: s2PassedCount,
    totalCount: s2TotalCount,
    durationMs: s2.durationMs,
    status: s2Passed ? 'PASS' : 'FAIL',
    details: s2Passed
      ? '45/45 statutory tests passed (clamping, DST, intervals, rollups)'
      : `Exit code: ${s2.exitCode}, passed: ${s2PassedCount}/${s2TotalCount}`,
  });

  if (s2Passed) {
    console.log(`  ${COLORS.green}✓${COLORS.reset} Suite 2 Passed: ${s2PassedCount}/${s2TotalCount} compliance tests passed (${s2.durationMs}ms)`);
  } else {
    console.log(`  ${COLORS.red}✗${COLORS.reset} Suite 2 Failed (${s2.durationMs}ms)`);
    console.error(s2.stderr || s2.stdout);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Excel Import/Export Resilience & Round-Trip
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}▶ SUITE 3: Excel Import/Export Resilience & Round-Trip${COLORS.reset}`);
  console.log(`${COLORS.dim}  Executing scripts/verify-excel-import-export.ts...${COLORS.reset}`);

  const s3 = await runSubprocess('npx', ['tsx', 'scripts/verify-excel-import-export.ts']);
  const s3Match = s3.stdout.match(/Total teste:\s*(\d+)\s*\|\s*Trecute:\s*(\d+)\s*\|\s*Eșuate:\s*(\d+)/i);
  const s3TotalCount = s3Match ? parseInt(s3Match[1], 10) : 6;
  const s3PassedCount = s3Match ? parseInt(s3Match[2], 10) : 0;
  const s3FailedCount = s3Match ? parseInt(s3Match[3], 10) : 0;
  const s3Passed = s3.exitCode === 0 && s3PassedCount === s3TotalCount && s3FailedCount === 0 && s3TotalCount === 6;

  results.push({
    id: 3,
    name: 'Excel Import/Export Resilience',
    scope: 'Round-Trip, Parsing & Validation',
    passedCount: s3PassedCount,
    totalCount: s3TotalCount,
    durationMs: s3.durationMs,
    status: s3Passed ? 'PASS' : 'FAIL',
    details: s3Passed
      ? '6/6 tests passed (clean parsing, dirty resilience, partial commit, expat, templates, round-trip)'
      : `Exit code: ${s3.exitCode}, passed: ${s3PassedCount}/${s3TotalCount}, failed: ${s3FailedCount}`,
  });

  if (s3Passed) {
    console.log(`  ${COLORS.green}✓${COLORS.reset} Suite 3 Passed: ${s3PassedCount}/${s3TotalCount} Excel tests passed (${s3.durationMs}ms)`);
  } else {
    console.log(`  ${COLORS.red}✗${COLORS.reset} Suite 3 Failed (${s3.durationMs}ms)`);
    console.error(s3.stderr || s3.stdout);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Comprehensive Opaque-Box E2E Testing Suite (Tiers 1–4)
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}▶ SUITE 4: Comprehensive Opaque-Box E2E Testing Suite (Tiers 1–4)${COLORS.reset}`);
  console.log(`${COLORS.dim}  Executing scripts/e2e-suite.ts...${COLORS.reset}`);

  const s4 = await runSubprocess('npx', ['tsx', 'scripts/e2e-suite.ts']);
  const s4Match = s4.stdout.match(/TOTAL:\s*(\d+)\/(\d+)\s*PASSED/i);
  const s4PassedCount = s4Match ? parseInt(s4Match[1], 10) : 0;
  const s4TotalCount = s4Match ? parseInt(s4Match[2], 10) : 53;
  const s4Passed = s4.exitCode === 0 && s4PassedCount === s4TotalCount && s4TotalCount === 53;

  results.push({
    id: 4,
    name: 'Comprehensive E2E Suite (Tiers 1–4)',
    scope: 'Isolation, Boundaries, Combinations, Lifecycles',
    passedCount: s4PassedCount,
    totalCount: s4TotalCount,
    durationMs: s4.durationMs,
    status: s4Passed ? 'PASS' : 'FAIL',
    details: s4Passed
      ? '53/53 requirement-driven E2E tests passed across all 4 tiers'
      : `Exit code: ${s4.exitCode}, passed: ${s4PassedCount}/${s4TotalCount}`,
  });

  if (s4Passed) {
    console.log(`  ${COLORS.green}✓${COLORS.reset} Suite 4 Passed: 53/53 E2E test cases passed (${s4.durationMs}ms)`);
  } else {
    console.log(`  ${COLORS.red}✗${COLORS.reset} Suite 4 Failed (${s4.durationMs}ms)`);
    console.error(s4.stderr || s4.stdout);
  }

  // --------------------------------------------------------------------------
  // SUITE 5: Application Production Build Integrity
  // --------------------------------------------------------------------------
  console.log(`\n${COLORS.bright}${COLORS.blue}▶ SUITE 5: Application Production Build Integrity (Next.js Turbopack)${COLORS.reset}`);
  console.log(`${COLORS.dim}  Executing npm run build...${COLORS.reset}`);

  const s5 = await runSubprocess('npm', ['run', 'build'], { NODE_ENV: 'production' });
  const s5Passed =
    s5.exitCode === 0 &&
    (s5.stdout.includes('Compiled successfully') || s5.stdout.includes('Generating static pages')) &&
    !s5.stderr.toLowerCase().includes('failed to compile');

  results.push({
    id: 5,
    name: 'Production Application Build',
    scope: 'Next.js 16 + Turbopack + TypeScript',
    passedCount: s5Passed ? 1 : 0,
    totalCount: 1,
    durationMs: s5.durationMs,
    status: s5Passed ? 'PASS' : 'FAIL',
    details: s5Passed
      ? 'Next.js 16 App Router production build succeeded cleanly with 0 errors'
      : `Build failed with exit code ${s5.exitCode}: ${s5.stderr.slice(0, 200)}`,
  });

  if (s5Passed) {
    console.log(`  ${COLORS.green}✓${COLORS.reset} Suite 5 Passed: Production build completed cleanly (${s5.durationMs}ms)`);
  } else {
    console.log(`  ${COLORS.red}✗${COLORS.reset} Suite 5 Failed (${s5.durationMs}ms)`);
    console.error(s5.stderr || s5.stdout);
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT & FINAL ACCEPTANCE VERDICT
  // --------------------------------------------------------------------------
  const totalDuration = Date.now() - globalStart;
  const allSuitesPassed = results.every((r) => r.status === 'PASS');
  const totalPassedItems = results.reduce((acc, r) => acc + r.passedCount, 0);
  const totalItemsCount = results.reduce((acc, r) => acc + r.totalCount, 0);

  console.log(`\n${COLORS.bright}${COLORS.cyan}==========================================================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.white}                                           FINAL ACCEPTANCE VERIFICATION REPORT                                           ${COLORS.reset}`);
  console.log(`${COLORS.cyan}==========================================================================================================================${COLORS.reset}`);
  console.log(
    `${COLORS.bright}${'#'.padEnd(4)}${'Verification Suite'.padEnd(38)}${'Scope'.padEnd(48)}${'Pass Rate'.padEnd(14)}${'Time'.padEnd(10)}${'Status'}${COLORS.reset}`
  );
  console.log(`${COLORS.cyan}--------------------------------------------------------------------------------------------------------------------------${COLORS.reset}`);

  for (const r of results) {
    const statusColor = r.status === 'PASS' ? COLORS.green : COLORS.red;
    const rate = `${r.passedCount}/${r.totalCount}`;
    const timeSec = `${(r.durationMs / 1000).toFixed(1)}s`;
    console.log(
      `${String(r.id).padEnd(4)}` +
      `${r.name.padEnd(38)}` +
      `${r.scope.padEnd(48)}` +
      `${rate.padEnd(14)}` +
      `${timeSec.padEnd(10)}` +
      `${statusColor}${COLORS.bright}${r.status}${COLORS.reset}`
    );
  }

  console.log(`${COLORS.cyan}--------------------------------------------------------------------------------------------------------------------------${COLORS.reset}`);
  console.log(`${COLORS.dim}Total Elapsed Time:${COLORS.reset} ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`${COLORS.dim}Total Verified Items:${COLORS.reset} ${totalPassedItems} / ${totalItemsCount} passed`);

  if (allSuitesPassed && totalPassedItems === 130 && totalItemsCount === 130) {
    console.log(`\n${COLORS.bgGreen}${COLORS.bright}${COLORS.white}                                                                                                                          ${COLORS.reset}`);
    console.log(`${COLORS.bgGreen}${COLORS.bright}${COLORS.white}   ✓ OVERALL VERDICT: ACCEPTANCE PASSED (100% PASS RATE ACROSS ALL 5 SUITES — 130/130 ITEMS)                               ${COLORS.reset}`);
    console.log(`${COLORS.bgGreen}${COLORS.bright}${COLORS.white}     Acceptance Criteria R1, R2, R3, and R4 are completely and demonstrably satisfied.                                   ${COLORS.reset}`);
    console.log(`${COLORS.bgGreen}${COLORS.bright}${COLORS.white}                                                                                                                          ${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${COLORS.bgRed}${COLORS.bright}${COLORS.white}                                                                                                                          ${COLORS.reset}`);
    console.log(`${COLORS.bgRed}${COLORS.bright}${COLORS.white}   ✗ OVERALL VERDICT: ACCEPTANCE FAILED — ONE OR MORE SUITES DID NOT PASS                                                ${COLORS.reset}`);
    console.log(`${COLORS.bgRed}${COLORS.bright}${COLORS.white}                                                                                                                          ${COLORS.reset}\n`);
    process.exit(1);
  }
}

runUnifiedVerification().catch((err) => {
  console.error(`\n${COLORS.bgRed}${COLORS.white} FATAL ERROR IN VERIFICATION CONTROLLER: ${COLORS.reset}`, err);
  process.exit(1);
});
