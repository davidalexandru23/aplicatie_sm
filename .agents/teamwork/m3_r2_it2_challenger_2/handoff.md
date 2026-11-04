# Empirical Challenger Handoff Report — Milestone 3 Iteration 2
**Verdict**: APPROVE

---

## 1. Observation

### 1.1 Remediation in `src/lib/importer.ts`
- **Dotted CNP header resolution**:
  In `src/lib/importer.ts` lines 265–275:
  ```typescript
  cnp: [
    'cnp',
    'cod numeric personal',
    'c.n.p.',
    'c.n.p',
    'cnp/pasaport',
    'cnp / pasaport',
    'c.n.p. / pasaport',
    'c.n.p./pasaport',
    'identificator',
  ],
  ```
  And in header discovery check (`checkRowHasHeaders`, line 349):
  ```typescript
  if (norm.includes('cnp') || norm.includes('c.n.p') || norm.includes('identificator')) hasCnp = true;
  ```
  Both the discovery scanner and the `dynamicColMap` lookup explicitly accommodate period-separated tokens (`'c.n.p.'`, `'c.n.p. / pasaport'`, etc.).

- **Zero-Phantom Entity Defense in Service Layer**:
  In `src/lib/importer.ts` lines 791–804 (Worksites) and lines 830–841 (Jobs):
  ```typescript
  // Din lista de angajați (doar rândurile valide nu generează puncte de lucru fantomă)
  for (const emp of parsedData.employees) {
    if (!emp.isValid) continue;
    if (emp.worksiteName && !worksiteMap.has(emp.worksiteName.toLowerCase())) {
      const newW = await tx.worksite.create({
        data: {
          clientId,
          name: emp.worksiteName,
          address: 'Conform contract / nespecificat',
        },
      });
      worksiteMap.set(emp.worksiteName.toLowerCase(), newW.id);
    }
  }
  ```
  And for Jobs (lines 830–834):
  ```typescript
  for (const emp of parsedData.employees) {
    if (!emp.isValid) continue;
    if (emp.jobTitle && !jobMap.has(emp.jobTitle.toLowerCase())) {
  ```
  Invalid rows (`!emp.isValid`) are skipped before any worksite or job records are created.

### 1.2 Defense-in-Depth in `src/app/api/imports/commit/route.ts`
- In `src/app/api/imports/commit/route.ts` lines 54–60:
  ```typescript
  // Defensive check: nu permitem commit dacă fișierul nu are niciun rând valid
  if (parsedData.employees.length > 0 && parsedData.employees.every((e) => !e.isValid)) {
    return NextResponse.json(
      { error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.' },
      { status: 400 }
    );
  }
  ```
  The API route immediately rejects commit attempts for all-invalid workbooks with HTTP 400.

### 1.3 Empirical Execution Results
1. **Adversarial Dirty Stress Suite (`npx tsx scripts/adversarial-excel-dirty-stress.ts`)**:
   - Exit Code: `0`
   - Scenario 5 Output:
     ```
     ✓ [PASSED] Scenario 5 completed in 19.4ms
       Observations/Findings:
         • UI semantics: Banner "Import Blocat" displayed, Commit button disabled when newCount + modifiedCount === 0.
         • No phantom worksites or jobs created from invalid rows.
     ```
   - Scenario 7 Output:
     ```
     ✓ [PASSED] Scenario 7 completed in 2.0ms
       Observations/Findings:
         • Header token "C.N.P." matched successfully.
     ```
   - Total Scenarios: 7 | Passed: 7 | Failed: 0.

2. **Direct API Probe & Zero-Phantom Harness (`npx tsx scripts/adversarial-commit-and-dotted-cnp.ts`)**:
   - Exit Code: `0`
   - Probed `POST /api/imports/commit` with all-invalid employee list:
     - Response status: `400`
     - Response body: `{"error":"Niciun rând valid de importat. Toate rândurile conțin erori de validare."}`
     - DB delta: Worksites created = 0, Jobs created = 0, Employees created = 0, Batches created = 0.
   - Probed service layer `commitImport` directly with invalid employees containing new worksite/job titles:
     - Worksites created: 0
     - Jobs created: 0
   - Probed `compareWithDatabase` (preview):
     - `newCount: 0`, `errorCount: 2`, DB records created: 0.
   - Probed 8 dotted `"C.N.P."` permutations:
     - All 8 variants (`"C.N.P."`, `"C.N.P. / Pașaport"`, `"C.N.P. / Pasaport"`, `"C.N.P./Pașaport"`, `"c.n.p."`, `"c.n.p. / pasaport"`, `"  C.N.P.  "`, `"Cod Numeric Personal"`) matched the dynamic column map cleanly on permuted sheets without canonical fallback collision.

3. **Acceptance Test Suite (`npx tsx scripts/verify-excel-import-export.ts`)**:
   - Exit Code: `0`
   - Tests: 6 | Passed: 6 | Failed: 0.

4. **Production Build Integrity (`npm run build`)**:
   - Exit Code: `0`
   - Next.js 16.4.3 (Turbopack) production compilation completed cleanly with 0 TypeScript or build errors.

5. **Unified System Acceptance (`npx tsx scripts/verify-all.ts`)**:
   - Exit Code: `0`
   - Total Verified Items: 124 / 124 passed (Document generation 25/25, Compliance 45/45, E2E 53/53, Build 1/1).

---

## 2. Logic Chain

1. **Premise 1 (Phantom Entity Elimination)**: In Iteration 1, challenger observed that `commitImport` looped over `parsedData.employees` without checking `emp.isValid`, causing phantom worksites and jobs to be inserted even when the employees themselves were rejected.
   - *Direct Evidence*: Observation 1.1 reveals lines 793 and 831 where `if (!emp.isValid) continue;` is now placed prior to worksite and job creation in `commitImport`. Observation 1.2 reveals lines 55–60 in `POST /api/imports/commit` enforcing HTTP 400 rejection before transaction dispatch.
   - *Empirical Confirmation*: Running `scripts/adversarial-excel-dirty-stress.ts` (Scenario 5) and `scripts/adversarial-commit-and-dotted-cnp.ts` (Test 1, Test 2, Test 3) proves zero phantom worksites and zero phantom jobs are created in the database across preview, direct commit, and API routes.

2. **Premise 2 (Dotted CNP Header Matching)**: In Iteration 1, challenger observed that `normalizeHeader` retained dots in `"C.N.P."`, preventing match against tokens expecting only `"cnp"`, which caused fallback to canonical columns on permuted sheets.
   - *Direct Evidence*: Observation 1.1 confirms `'c.n.p.'`, `'c.n.p'`, `'c.n.p. / pasaport'`, and `'c.n.p./pasaport'` were added to `HEADER_TOKEN_MAP.cnp`, and `checkRowHasHeaders` was updated to test `norm.includes('c.n.p')`.
   - *Empirical Confirmation*: Both Scenario 7 in `adversarial-excel-dirty-stress.ts` and Test 4 in `adversarial-commit-and-dotted-cnp.ts` verified across 8 real-world permutations that dotted headers are correctly recognized, `dynamicColMap.cnp` is established, and no canonical column fallback or field misalignment occurs.

3. **Premise 3 (Regression Absence & Build Health)**:
   - *Direct Evidence*: Observation 1.3 confirms all 6 Excel import/export acceptance tests pass, all 124 system-wide verification checks pass, and Next.js builds cleanly with zero errors.

---

## 3. Caveats

- **No caveats**: All adversarial attack vectors identified in Iteration 1 (phantom entities upon invalid imports and dotted CNP header resolution) were empirically tested and proven robust.

---

## 4. Conclusion

The defense-in-depth remediation in `src/lib/importer.ts` and `src/app/api/imports/commit/route.ts` is empirically verified and operates with high integrity:
1. Zero phantom worksites and zero phantom jobs are created in PostgreSQL under all-invalid employee imports.
2. Direct probe of `POST /api/imports/commit` with all-invalid employee records cleanly rejects the payload with HTTP 400.
3. Dotted `"C.N.P."` headers in all common permutations match dynamically on row 12 without reverting to canonical column indices.
4. The application builds cleanly and passes all verification suites.

**Verdict: APPROVE**.

---

## 5. Verification Method

To independently reproduce the empirical verification, execute the following commands in the workspace root:

```bash
# 1. Run the dirty Excel adversarial stress harness (confirms Scenario 5 and Scenario 7)
npx tsx scripts/adversarial-excel-dirty-stress.ts

# 2. Run the direct API probe & dotted CNP test harness
npx tsx scripts/adversarial-commit-and-dotted-cnp.ts

# 3. Run the official Excel import/export acceptance suite
npx tsx scripts/verify-excel-import-export.ts

# 4. Verify Next.js production build integrity
npm run build

# 5. Run the unified end-to-end acceptance suite
npx tsx scripts/verify-all.ts
```

**Invalidation conditions**:
- Any phantom worksite or job inserted into PostgreSQL when an invalid employee row is processed.
- `POST /api/imports/commit` returning HTTP 200 or 500 when given an all-invalid employee list.
- Header `"C.N.P."` or `"C.N.P. / Pașaport"` causing column fallback on permuted sheets.
- Non-zero exit code on any of the verification commands above.
