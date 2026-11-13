/**
 * ============================================================================
 * MASTER E2E TEST ORCHESTRATOR: ROMANIAN SSM, HR, AND HYGIENE COMPLIANCE SYSTEM
 * ============================================================================
 * 
 * Requirement-driven 4-tier E2E verification gate.
 * 
 * Normative Standards:
 * - Legea 319/2006 & HG 1425/2006 (Securitatea și Sănătatea în Muncă)
 * - HG 355/2007 (Medicina Muncii)
 * - Legea 307/2006 & OMAI 712/2005 (PSI / Situații de Urgență)
 * - Ordinul MS/ME 2209/4469/2022 (Noțiuni Fundamentale de Igienă)
 * - HG 1048/2006 (Echipament Individual de Protecție - EIP)
 * - Legea 53/2003 (Codul Muncii) & Ordinul MMSS 2171/2022 (Model Cadru CIM)
 * 
 * Tiers:
 * - Tier 1: Functional Feature Isolation (155 tests across 31 features)
 * - Tier 2: Boundary & Corner Cases (155 tests across 31 features)
 * - Tier 3: Pairwise Cross-Feature Interactions (15 complex scenarios)
 * - Tier 4: Statutory Real-World End-to-End Scenarios (8 deep lifecycles)
 * Total: 333 tests
 * 
 * Invocation:
 *   npx tsx scripts/e2e-suite.ts              # Runs all 4 tiers (333 tests)
 *   npx tsx scripts/e2e-suite.ts --tier=1     # Runs Tier 1 only (155 tests)
 *   npx tsx scripts/e2e-suite.ts --tier=2     # Runs Tier 2 only (155 tests)
 *   npx tsx scripts/e2e-suite.ts --tier=3     # Runs Tier 3 only (15 tests)
 *   npx tsx scripts/e2e-suite.ts --tier=4     # Runs Tier 4 only (8 tests)
 *   npx tsx scripts/e2e-suite.ts --grep="EIP" # Grep filter across active tiers
 * ============================================================================
 */

import { spawn } from 'child_process';
import path from 'path';

// ============================================================================
// COLOR PALETTE & ANSI STYLING
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

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

interface TierConfig {
  tierNumber: number;
  name: string;
  scriptPath: string;
  expectedTests: number;
  description: string;
}

const TIERS: TierConfig[] = [
  {
    tierNumber: 1,
    name: 'Tier 1: Functional Feature Acceptance',
    scriptPath: path.join(__dirname, 'e2e-tier1-features.ts'),
    expectedTests: 155,
    description: '31 statutory features × 5 tests in isolation',
  },
  {
    tierNumber: 2,
    name: 'Tier 2: Boundary & Corner Cases',
    scriptPath: path.join(__dirname, 'e2e-tier2-boundaries.ts'),
    expectedTests: 155,
    description: 'Nullability, XML escaping, extreme dates & clamping, empty/large rosters',
  },
  {
    tierNumber: 3,
    name: 'Tier 3: Pairwise Cross-Feature Interactions',
    scriptPath: path.join(__dirname, 'e2e-tier3-pairwise.ts'),
    expectedTests: 15,
    description: '15 complex cross-feature orthogonal combinations (T3-01 to T3-15)',
  },
  {
    tierNumber: 4,
    name: 'Tier 4: Statutory Real-World End-to-End Scenarios',
    scriptPath: path.join(__dirname, 'e2e-tier4-scenarios.ts'),
    expectedTests: 8,
    description: '8 complete Romanian employee and enterprise lifecycles (S1 to S8)',
  },
];

interface TierRunResult {
  tierNumber: number;
  name: string;
  passedCount: number;
  totalCount: number;
  failedCount: number;
  durationMs: number;
  success: boolean;
  featureBreakdown: Map<string, { passed: number; total: number }>;
  failures: Array<{ testId: string; description: string; error: string }>;
}

// Subprocess execution wrapper
function executeTier(
  tier: TierConfig,
  grepFilter: string | null
): Promise<TierRunResult> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const args = [tier.scriptPath];
    if (grepFilter) {
      args.push(`--grep=${grepFilter}`);
    }

    console.log(`\n${COLORS.bright}${COLORS.blue}▶ STARTING ${tier.name.toUpperCase()}${COLORS.reset}`);
    console.log(`${COLORS.dim}  Scope: ${tier.description} (${tier.expectedTests} tests)${COLORS.reset}`);
    console.log(`${COLORS.cyan}--------------------------------------------------------------------------------${COLORS.reset}`);

    const child = spawn('npx', ['tsx', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const featureBreakdown = new Map<string, { passed: number; total: number }>();
    const failures: Array<{ testId: string; description: string; error: string }> = [];

    // Stream lines in real-time
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      // Output test lines directly for progress feedback
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('✓') || line.includes('✗') || line.includes('▶ [RULARE') || line.includes('[PASS]') || line.includes('[FAIL]')) {
          console.log(`  ${line.trim()}`);
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - t0;
      const combined = stdout + '\n' + stderr;

      // Extract results based on tier output format
      let passedCount = 0;
      let totalCount = 0;
      let failedCount = 0;

      if (tier.tierNumber === 1 || tier.tierNumber === 2) {
        // Parse "TOTAL: X/Y PASSED (Z%) in Nms"
        const totalMatch = combined.match(/TOTAL:\s*(\d+)\/(\d+)\s*PASSED/i);
        if (totalMatch) {
          passedCount = parseInt(totalMatch[1], 10);
          totalCount = parseInt(totalMatch[2], 10);
          failedCount = totalCount - passedCount;
        }

        // Parse feature summaries: "  F01 (Resolver Integritate Date): 5/5 passed"
        const featMatches = combined.matchAll(/F(\d{2})\s*\(([^)]+)\):\s*(\d+)\/(\d+)\s*passed/g);
        for (const m of featMatches) {
          const fKey = `F${m[1]} (${m[2]})`;
          featureBreakdown.set(fKey, {
            passed: parseInt(m[3], 10),
            total: parseInt(m[4], 10),
          });
        }
      } else if (tier.tierNumber === 3) {
        // Parse "Total teste rulate: X | Trecute: Y | Eșuate: Z"
        const m = combined.match(/Total teste rulate:\s*(\d+)\s*\|\s*Trecute:\s*(\d+)\s*\|\s*Eșuate:\s*(\d+)/i);
        if (m) {
          totalCount = parseInt(m[1], 10);
          passedCount = parseInt(m[2], 10);
          failedCount = parseInt(m[3], 10);
        } else {
          // Fallback: count individual checks
          const passLines = (combined.match(/✓\s*\[PASS\]/g) || []).length;
          const failLines = (combined.match(/✗\s*\[FAIL\]/g) || []).length;
          passedCount = passLines;
          totalCount = passLines + failLines;
          failedCount = failLines;
        }

        // Extract individual pairwise test results
        const testCaseMatches = combined.matchAll(/\[(PASS|FAIL)\]\s*(T3-\d{2}):\s*([^(\n]+)/g);
        for (const tm of testCaseMatches) {
          const status = tm[1];
          const testId = tm[2];
          const desc = tm[3].trim();
          featureBreakdown.set(testId, {
            passed: status === 'PASS' ? 1 : 0,
            total: 1,
          });
          if (status === 'FAIL') {
            failures.push({ testId, description: desc, error: 'Pairwise assertion failed' });
          }
        }
      } else if (tier.tierNumber === 4) {
        // Parse "Total scenarii rulate: X | Trecute: Y | Eșuate: Z"
        const m = combined.match(/Total scenarii rulate:\s*(\d+)\s*\|\s*Trecute:\s*(\d+)\s*\|\s*Eșuate:\s*(\d+)/i);
        if (m) {
          totalCount = parseInt(m[1], 10);
          passedCount = parseInt(m[2], 10);
          failedCount = parseInt(m[3], 10);
        } else {
          const passLines = (combined.match(/✓\s*\[PASS\]/g) || []).length;
          const failLines = (combined.match(/✗\s*\[FAIL\]/g) || []).length;
          passedCount = passLines;
          totalCount = passLines + failLines;
          failedCount = failLines;
        }

        // Extract individual scenario results
        const scenarioMatches = combined.matchAll(/\[(PASS|FAIL)\]\s*(S\d+):\s*([^(\n]+)/g);
        for (const sm of scenarioMatches) {
          const status = sm[1];
          const testId = sm[2];
          const desc = sm[3].trim();
          featureBreakdown.set(testId, {
            passed: status === 'PASS' ? 1 : 0,
            total: 1,
          });
          if (status === 'FAIL') {
            failures.push({ testId, description: desc, error: 'Scenario assertion failed' });
          }
        }
      }

      // If no grep filter was active, verify we got expected test count
      const isClean = (exitCode ?? 0) === 0 && failedCount === 0 && (!grepFilter ? totalCount === tier.expectedTests : totalCount > 0);

      resolve({
        tierNumber: tier.tierNumber,
        name: tier.name,
        passedCount,
        totalCount,
        failedCount,
        durationMs,
        success: isClean,
        featureBreakdown,
        failures,
      });
    });

    child.on('error', (err) => {
      resolve({
        tierNumber: tier.tierNumber,
        name: tier.name,
        passedCount: 0,
        totalCount: tier.expectedTests,
        failedCount: tier.expectedTests,
        durationMs: Date.now() - t0,
        success: false,
        featureBreakdown: new Map(),
        failures: [{ testId: `Tier ${tier.tierNumber}`, description: 'Process Execution Error', error: err.message }],
      });
    });
  });
}

// ============================================================================
// MAIN CLI RUNNER & MULTI-TIER CONTROLLER
// ============================================================================

async function main() {
  const globalStart = Date.now();
  const args = process.argv.slice(2);

  let filterTier: number | null = null;
  let filterGrep: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      filterTier = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--grep=')) {
      filterGrep = arg.split('=')[1].toLowerCase();
    }
  }

  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.white}  ROMANIAN SSM, HR & HYGIENE SYSTEM — MASTER 4-TIER E2E TEST GATES${COLORS.reset}`);
  console.log(`${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.dim}Normative Base:${COLORS.reset} Legea 319/2006, HG 1425/2006, HG 355/2007, OMAI 712/2005, Ord. 2209/2022, HG 1048/2006`);
  console.log(`${COLORS.dim}Environment:${COLORS.reset} Node.js ${process.version} | PostgreSQL 16 (Prisma ORM 6) | Next.js 16 App Router`);
  console.log(`${COLORS.dim}Timestamp:${COLORS.reset} ${new Date().toISOString()}`);
  if (filterTier) console.log(`${COLORS.yellow}Filter: Running Tier ${filterTier} only${COLORS.reset}`);
  if (filterGrep) console.log(`${COLORS.yellow}Filter: Grep "${filterGrep}"${COLORS.reset}`);
  console.log('');

  const tiersToRun = filterTier
    ? TIERS.filter((t) => t.tierNumber === filterTier)
    : TIERS;

  if (tiersToRun.length === 0) {
    console.error(`${COLORS.red}Error: Invalid tier specified: ${filterTier}. Allowed: 1, 2, 3, 4.${COLORS.reset}`);
    process.exit(1);
  }

  const results: TierRunResult[] = [];

  for (const tier of tiersToRun) {
    const res = await executeTier(tier, filterGrep);
    results.push(res);
  }

  const totalDuration = Date.now() - globalStart;
  const overallPassed = results.reduce((acc, r) => acc + r.passedCount, 0);
  const overallTotal = results.reduce((acc, r) => acc + r.totalCount, 0);
  const overallFailed = results.reduce((acc, r) => acc + r.failedCount, 0);
  const allTiersSuccessful = results.every((r) => r.success);

  // ============================================================================
  // SUMMARY REPORTING
  // ============================================================================

  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.white}                           DETAILED BREAKDOWN BY TIER                           ${COLORS.reset}`);
  console.log(`${COLORS.cyan}================================================================================${COLORS.reset}`);

  for (const r of results) {
    const statusColor = r.success ? COLORS.green : COLORS.red;
    const rate = r.totalCount > 0 ? Math.round((r.passedCount / r.totalCount) * 100) : 0;
    console.log(
      `  ${statusColor}${COLORS.bright}Tier ${r.tierNumber}:${COLORS.reset} ${r.name.padEnd(50, ' ')} ` +
      `${statusColor}${r.passedCount}/${r.totalCount} passed (${rate}%)${COLORS.reset} in ${(r.durationMs / 1000).toFixed(2)}s`
    );

    // If tier has feature breakdown (Tier 1 & Tier 2) and verbose output
    if ((r.tierNumber === 1 || r.tierNumber === 2) && r.featureBreakdown.size > 0) {
      const summaryItems: string[] = [];
      for (const [feat, counts] of r.featureBreakdown.entries()) {
        const shortName = feat.split('(')[0].trim();
        summaryItems.push(`${shortName}: ${counts.passed}/${counts.total}`);
      }
      // Print compact 4-column feature matrix
      for (let i = 0; i < summaryItems.length; i += 4) {
        const chunk = summaryItems.slice(i, i + 4).map((s) => s.padEnd(18, ' ')).join(' | ');
        console.log(`    ${COLORS.dim}${chunk}${COLORS.reset}`);
      }
    }
  }

  console.log(`${COLORS.cyan}--------------------------------------------------------------------------------${COLORS.reset}`);
  const overallColor = allTiersSuccessful ? COLORS.bgGreen : COLORS.bgRed;
  const overallPercent = overallTotal > 0 ? Math.round((overallPassed / overallTotal) * 100) : 0;

  console.log(
    `${overallColor}${COLORS.bright}${COLORS.white} TOTAL: ${overallPassed}/${overallTotal} PASSED (${overallPercent}%) in ${totalDuration}ms ${COLORS.reset}`
  );
  console.log(`${COLORS.cyan}================================================================================\n${COLORS.reset}`);

  if (!allTiersSuccessful) {
    console.log(`${COLORS.bright}${COLORS.red}EXECUTION FAILURES DETECTED (${overallFailed} failing test(s)):${COLORS.reset}`);
    for (const r of results) {
      if (!r.success) {
        console.log(`  ${COLORS.red}✗ Tier ${r.tierNumber} failed: ${r.failedCount} failing test(s)${COLORS.reset}`);
        for (const f of r.failures) {
          console.log(`     - [${f.testId}] ${f.description}: ${f.error}`);
        }
      }
    }
    console.log('');
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`\n${COLORS.bgRed}${COLORS.white} UNHANDLED FATAL ERROR IN MASTER E2E RUNNER: ${COLORS.reset}\n`, err);
  process.exit(1);
});
