/**
 * ============================================================================
 * TIER 5 ADVERSARIAL HARDENING & MASTER VERIFICATION SUITE
 * Milestone 6 Phase 2: Final Acceptance & Adversarial Hardening
 * ============================================================================
 * 
 * Orchestrates and executes the complete Tier 5 adversarial hardening suite,
 * combining Challenger 1 (domain modules: templates, resolver, compliance, bulk-packages)
 * and Challenger 2 (API routes, concurrency, multi-tenant isolation, boundaries):
 * 
 * Target Verifications:
 * 1. Challenger 1 Stress Tests (scripts/tier5-challenger1-tests.ts):
 *    - 28 deep adversarial checks across generator, resolver, compliance, importer, bulk-packages
 *    - Validates XML 1.0 control char sanitization ([\x00-\x08\x0B\x0C\x0E-\x1F])
 *    - Validates absence of hireDate autocompletion masquerade in resolver
 *    - Validates medical exam regression protection for historical backfills
 *    - Validates ZIP path traversal sanitization (neutralizing bare '..' and leading dots)
 * 
 * 2. Challenger 2 Stress Tests (scripts/tier5-challenger2-tests.ts):
 *    - 125 deep adversarial checks across employee, training, EIP, risk, hygiene, and batch routes
 *    - Validates rejection of negative numbers (grossSalary, workNorm, probationDays, annualLeaveDays)
 *    - Validates rejection / exclusion of departed employees (status: 'PLECAT') from training protocols
 *    - Validates cross-tenant jobId isolation in risk assessments
 *    - Validates date string validation in hygiene sessions (HTTP 400 on invalid date)
 *    - Validates HTTP 404 on non-existent EIP assignment deletion (Prisma P2025)
 *    - Validates dedicated /api/trainings/documents statutory download route
 * 
 * Execution:
 *   npx tsx scripts/tier5-adversarial-hardening.ts
 * ============================================================================
 */

import { spawn } from 'child_process';
import path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

interface SuiteRunResult {
  suiteName: string;
  scriptPath: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

function runScript(scriptRelativePath: string, suiteName: string): Promise<SuiteRunResult> {
  return new Promise((resolve) => {
    const fullPath = path.join(process.cwd(), scriptRelativePath);
    console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}▶ RUNNING TIER 5 SUITE: ${suiteName}${COLORS.reset}`);
    console.log(`${COLORS.dim}Script: ${scriptRelativePath}${COLORS.reset}`);
    console.log(`${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}\n`);

    const t0 = Date.now();
    const child = spawn('npx', ['tsx', fullPath], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - t0;
      resolve({
        suiteName,
        scriptPath: scriptRelativePath,
        exitCode: exitCode ?? 0,
        stdout: '',
        stderr: '',
        durationMs,
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - t0;
      console.error(`Error executing ${scriptRelativePath}:`, err);
      resolve({
        suiteName,
        scriptPath: scriptRelativePath,
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        durationMs,
      });
    });
  });
}

async function main() {
  const globalStart = Date.now();

  console.log(`${COLORS.bright}${COLORS.blue}`);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       MASTER TIER 5 ADVERSARIAL HARDENING & STRESS TEST ORCHESTRATOR         ║');
  console.log('║               SSM / Igienă / HR Statutory Compliance Engine                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);

  const results: SuiteRunResult[] = [];

  // Suite 1: Challenger 1 Adversarial Tests (28 checks)
  const res1 = await runScript(
    'scripts/tier5-challenger1-tests.ts',
    'Challenger 1: Domain Logic, Generator, XML Escaping & Traversal Hardening'
  );
  results.push(res1);

  // Suite 2: Challenger 2 Adversarial Tests (125 checks)
  const res2 = await runScript(
    'scripts/tier5-challenger2-tests.ts',
    'Challenger 2: API Routes, Concurrency, State Transitions & Error Boundaries'
  );
  results.push(res2);

  const totalDuration = Date.now() - globalStart;

  console.log(`\n${COLORS.bright}${COLORS.blue}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.blue}             TIER 5 ADVERSARIAL HARDENING MASTER SUMMARY                       ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.blue}================================================================================${COLORS.reset}`);

  let allPassed = true;
  for (const r of results) {
    const isOk = r.exitCode === 0;
    if (!isOk) allPassed = false;
    const mark = isOk ? `${COLORS.green}✅ PASS${COLORS.reset}` : `${COLORS.red}❌ FAIL (exit ${r.exitCode})${COLORS.reset}`;
    console.log(`  ${mark} - ${COLORS.bright}${r.suiteName}${COLORS.reset} (${(r.durationMs / 1000).toFixed(2)}s)`);
  }

  console.log(`\n${COLORS.dim}Total execution time: ${(totalDuration / 1000).toFixed(2)}s${COLORS.reset}`);

  if (allPassed) {
    console.log(`\n${COLORS.bright}${COLORS.green}🎉 ALL TIER 5 ADVERSARIAL CHECKS PASSED WITH 100% SUCCESS (EXIT CODE 0)!${COLORS.reset}`);
    console.log(`${COLORS.green}✓ XML 1.0 illegal control characters sanitized cleanly.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Training date resolver fallback to hireDate completely eliminated.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Historical medical exam regression guard operational.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Zip traversal tokens safely neutralized.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Terminated employees (PLECAT) strictly excluded from training protocols.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Cross-tenant risk assessment isolation enforced.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Negative numbers for employee numeric fields strictly rejected.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Invalid date formats in hygiene sessions cleanly handled with HTTP 400.${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Non-existent EIP assignment deletions return HTTP 404 (Prisma P2025).${COLORS.reset}`);
    console.log(`${COLORS.green}✓ Dedicated training documents route active.${COLORS.reset}\n`);
    process.exit(0);
  } else {
    console.error(`\n${COLORS.bright}${COLORS.red}❌ TIER 5 ADVERSARIAL HARDENING VERIFICATION FAILED!${COLORS.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during Tier 5 adversarial hardening execution:', err);
  process.exit(1);
});
