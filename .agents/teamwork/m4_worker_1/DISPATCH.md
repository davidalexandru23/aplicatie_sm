# Task Assignment: Milestone 4 Worker 1 (Final Verification Suite & 100% E2E Pass)

## 2026-11-02T00:24:00Z

### Mission
Implement the unified verification script `scripts/verify-all.ts`, align `scripts/e2e-suite.ts` with Milestone 3 generator functions, and achieve 100% passing results across all automated suites, fulfilling Acceptance Criteria R1, R2, R3, and R4.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Mandatory References to Read
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/TEST_READY.md`
4. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_worker_1/handoff.md`
5. `scripts/e2e-suite.ts`
6. `scripts/test-all-templates-generation.ts`
7. `scripts/verify-compliance.ts`

### Exclusive File Ownership
You have exclusive write ownership over:
- `scripts/e2e-suite.ts`
- `scripts/verify-all.ts`

### Concrete Tasks
1. **Update `scripts/e2e-suite.ts`**:
   - In `renderAndCheckZeroPlaceholders`, use the central `renderTemplateBuffer` from `@/lib/templates/generator` to ensure all multi-part `.rels` and `.xml` replacements and SheetJS `cell.w` clearing logic are applied identically to production.
   - In Test #53 (Lifecycle Checkpoint 4), fix the test fixture renewal: when renewing `ssmLastTrainingDate`, also renew `psiLastTrainingDate: new Date(2026, 8, 6)` (which had expired on 2026-08-31 under its 6-month interval), ensuring the employee transitions to `VALID` as intended by the test.
   - Run `npx tsx scripts/e2e-suite.ts` and verify that ALL 53/53 tests pass.

2. **Implement `scripts/verify-all.ts`**:
   - Create a single unified verification command `scripts/verify-all.ts` satisfying R4:
     * **Suite 1: Document Auto-Completion (25/25 Templates)**:
       Verifies that 100% of all 25 document templates (23 DOCX, 2 XLSX) generate cleanly with zero remaining placeholders (`{PLACEHOLDER_*}` or `PLACEHOLDER_*`) and achieve `approved_for_print` status.
     * **Suite 2: Compliance Deadline & Expiry Tracking**:
       Verifies exact statutory calculations for Occupational Medicine (12m/6m HG 355/2007), SSM periodic training (6m/12m HG 1425/2006), PSI periodic training (6m OMAI 712/2005), Hygiene certificate (36m Ordinul 2209/4469/2022), safe calendar month clamping, DST-immune midnight day differences, and 4-tier rollup logic.
     * **Suite 3: Opaque-Box E2E Testing Suite (Tiers 1–4)**:
       Executes `scripts/e2e-suite.ts` verifying all 53 requirement-driven test cases pass.
     * **Suite 4: Application Production Build**:
       Executes `npm run build` and verifies exit code 0 without any errors.
   - Format clean, professional console output with a summary table, execution timings, and exit code 0 on complete pass (or 1 on any failure).

3. **Verification**:
   - Run `npx tsx scripts/e2e-suite.ts` -> 53/53 PASS.
   - Run `npx tsx scripts/verify-all.ts` -> 100% PASS across all 4 suites.
   - Run `npx tsc --noEmit` -> exit code 0.
   - Run `npm run build` -> exit code 0.
   - Write handoff report in `.agents/teamwork/m4_worker_1/handoff.md` and message the orchestrator.
