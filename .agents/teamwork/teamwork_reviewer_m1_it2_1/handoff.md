# Review & Adversarial Challenge Report — Milestone 1 Iteration 2

**Agent:** `teamwork_reviewer_m1_it2_1`  
**Role:** Reviewer & Adversarial Critic  
**Recipient:** `8ad1e81b-94c6-4ac7-af81-65ffa2e75726` (Teamwork Orchestrator)  
**Date:** 2026-11-05T18:35:00Z  
**Verdict:** `REQUEST_CHANGES`

---

## 1. Observation

### 1.1 Verified Requirements
1. **Workplace Training Syllabi `contextLevel` in `src/lib/templates/definitions.ts`**:
   - Line 1878 (`training-detaliu-loc-munca`): `contextLevel: 'job'`.
   - Line 2542 (`training-tematica-loc-munca`): `contextLevel: 'job'`.
   - Both templates specify fields sourced from `job.*` (`PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_COD_COR`, `PLACEHOLDER_ACTIVITATI_POST`, etc.).
   - Verified via `TEMPLATE_CATALOG` query: `countJobContext === 2`.
2. **Job Selector Rendering Without Employee in `src/app/documents/generate/page.tsx`**:
   - Lines 167–175: `isJobContext` predicate correctly recognizes `'job'` contextLevel, `'risk'` family, `'loc-munca'` code token, and `job.*` field sources while excluding employee-required and hygiene templates.
   - Lines 530–545: Job selector renders when `isJobContext && selectedClientId && jobs.length > 0` is true, without requiring an employee dropdown.
   - Single-template UI simulation in `scripts/adversarial-m1-challenger2-ui-stress.ts` passed 62/62 assertions.
3. **Integrity Check**:
   - No hardcoded test responses, fake mock facades, or bypassed logic detected in worker commits.

---

### 1.2 Observed Defects

#### Defect 1 (Major): Cross-Client Stale `selectedJobId` State Leakage in `src/app/documents/generate/page.tsx`
- **Location**: `src/app/documents/generate/page.tsx:410-414` & `src/app/documents/generate/page.tsx:196-198`.
- **Direct Observation**:
  - In `src/app/documents/generate/page.tsx:410-414`:
    ```tsx
    <select
      value={selectedClientId}
      onChange={(e) => {
        setSelectedClientId(e.target.value);
        setSelectedEmployeeId('');
        setSelectedHygieneParticipantId('');
      }}
    ```
    `setSelectedJobId('')` is omitted.
  - In `src/app/documents/generate/page.tsx:196-198`:
    ```tsx
    if (isJobContext && data.jobs.length > 0) {
      setSelectedJobId((prev) => prev || data.jobs[0].id);
    }
    ```
    When switching from Client A (which has jobs and an active `selectedJobId`) to Client B:
    - If Client B has jobs: `(prev || data.jobs[0].id)` retains `prev` (Client A's `jobId`), which does not belong to Client B.
    - If Client B has 0 jobs: `data.jobs.length > 0` evaluates to `false`, so `setSelectedJobId` is never called and `selectedJobId` remains Client A's `jobId`.
    - At submission (`handleGenerate`), `effectiveJobId` is `selectedJobId` (Client A's `jobId`), sending an invalid or foreign `jobId` for Client B.
- **Empirical Test Results** (`npx tsx scripts/adversarial-m1-challenger-edge-cases.ts`):
  ```
  --- GROUP 2: Switching Between Clients With/Without Jobs ---
    ✓ [PASS] Initial Client A state: Job dropdown displayed and effectiveJobId is job-A1
    ✓ [PASS] Client B (0 jobs): Job dropdown is NOT displayed
    ✗ [FAIL] Client B (0 jobs): selectedJobId must NOT retain stale job-A1 from Client A
           Reason: CRITICAL STALE STATE: selectedJobId is still 'job-A1' after switching to client with 0 jobs!
    ✗ [FAIL] Client B (0 jobs): effectiveJobId must be undefined
           Reason: CRITICAL LEAK: effectiveJobId is 'job-A1' for a client with 0 jobs!
    ✗ [FAIL] Client C: selectedJobId must not remain Client A job-A1
           Reason: CRITICAL STALE STATE: selectedJobId retained 'job-A1' from previous client!
    ✗ [FAIL] Client C: selectedJobId should auto-select Client C job-C1 or empty
           Reason: Expected 'job-C1' or '', got 'job-A1'
  ```

#### Defect 2 (Major): TypeScript Compilation Error Breaks Production Build
- **Location**: `scripts/challenger-m1-it2-verdict.ts:292:63`.
- **Direct Observation**:
  - Executing `npm run build` or `npx tsx scripts/verify-all.ts`:
    ```
    scripts/challenger-m1-it2-verdict.ts(292,63): error TS2367: This comparison appears to be unintentional because the types '"draft" | "missing_data" | "approved_for_print"' and '"incomplete_draft"' have no overlap.
    Failed to type check.
    ```
  - In `scripts/verify-all.ts`:
    ```
    ▶ SUITE 5: Application Production Build Integrity (Next.js Turbopack)
      Executing npm run build...
      ✗ Suite 5 Failed (2083ms)
      Failed to type check.
    Total Verified Items: 135 / 136 passed
    ✗ OVERALL VERDICT: ACCEPTANCE FAILED — ONE OR MORE SUITES DID NOT PASS
    ```

---

## 2. Logic Chain

1. In Romanian statutory document generation, every document must strictly bind attributes of the selected employer (`client`) and their corresponding post (`job`).
2. When an operator working on Client A switches to Client B in `/documents/generate`, all state specific to Client A must be reliably discarded.
3. Because line 410 in `src/app/documents/generate/page.tsx` does not clear `selectedJobId` and line 197 preserves `prev`, any pre-existing `selectedJobId` from Client A leaks into Client B's context.
4. If Client B has no jobs or different jobs, the UI or backend submission transmits Client A's `jobId` alongside Client B's `clientId`, violating client data isolation boundaries.
5. In addition, the repository test script `scripts/challenger-m1-it2-verdict.ts` contains an invalid union comparison (`status === 'incomplete_draft'`) which causes `next build` (and thus `verify-all.ts` Suite 5) to fail typecheck under TypeScript strict mode.
6. Therefore, the implementation cannot be approved in its current state until both issues are rectified.

---

## 3. Caveats

- **Isolated Single-Client Usage**: For single client sessions without client-switching, `training-tematica-loc-munca` and `training-detaliu-loc-munca` function properly, display the Job dropdown, and pass all 62 assertions of `adversarial-m1-challenger2-ui-stress.ts`.
- **Database Template Synchronization**: `TEMPLATE_CATALOG` was synchronized into the PostgreSQL `Template` table by executing `src/lib/templates/seed.ts`.
- **XLSX Generation**: Buffer handling in `generator.ts` is fully verified and stable across all 12 test suites in `test-challenger-m1-xlsx.ts` (60/60 assertions passed).

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Required changes:
1. **Fix Client Switching in `src/app/documents/generate/page.tsx`**:
   - In `<select value={selectedClientId} onChange=...>` (around line 410): add `setSelectedJobId('');`.
   - In the client load `useEffect` (around line 197): replace `setSelectedJobId((prev) => prev || data.jobs[0].id)` with `setSelectedJobId(data.jobs[0]?.id || '')` so that switching clients always resets or re-initializes `selectedJobId` strictly from the new client's job list.
2. **Fix Type Error in `scripts/challenger-m1-it2-verdict.ts:292`**:
   - Cast `(genNoJob.status as string) === 'incomplete_draft'` or remove `'incomplete_draft'` to eliminate `TS2367`.
   - Ensure `npm run build` and `npx tsx scripts/verify-all.ts` pass 136/136 with exit code 0.

---

## 5. Verification Method

To verify these findings independently:

1. **Reproduce Client-Switch State Leakage**:
   ```bash
   npx tsx scripts/adversarial-m1-challenger-edge-cases.ts
   ```
   *Expected outcome before fix*: 4 test failures in Group 2.
   *Expected outcome after fix*: 30/30 tests pass.

2. **Reproduce Build / Typecheck Breakage**:
   ```bash
   npm run build
   ```
   *Expected outcome before fix*: Fails with `TS2367` on `scripts/challenger-m1-it2-verdict.ts:292:63`.
   *Expected outcome after fix*: Compiles cleanly in Turbopack.

3. **Verify Full Unified Acceptance Suite**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Expected outcome after fix*: 136/136 passed (100% pass rate).
