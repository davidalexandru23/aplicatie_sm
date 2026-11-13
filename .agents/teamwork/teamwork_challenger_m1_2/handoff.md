# Empirical Challenger Report — Milestone 1 (M1.2)

**Agent:** `teamwork_challenger_m1_2`  
**Role:** Adversarial Challenger / Specialist  
**Recipient:** `8ad1e81b-94c6-4ac7-af81-65ffa2e75726` (Teamwork Orchestrator)  
**Date:** 2026-11-05T18:09:00Z  
**Verdict:** **REJECT**

---

## 1. Observation

1. **Failure on Required Job-Level Template (`training-tematica-loc-munca`):**
   - **Requirement 2, Bullet 3** explicitly states:  
     *"For job-level templates (e.g. `risk-evaluare`, `training-tematica-loc-munca`): Job dropdown IS displayed."*
   - In `src/app/documents/generate/page.tsx:528`, the render predicate is:
     ```tsx
     {!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0 && (
     ```
   - In `src/lib/templates/definitions.ts:2856`, template `training-tematica-loc-munca` is defined with:
     ```typescript
     code: 'training-tematica-loc-munca',
     family: 'training',
     contextLevel: 'client',
     fields: [
       { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcție / Ocupație', source: 'job.title', required: true },
       { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR ocupație', source: 'job.corCode', required: false },
       { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Activități specifice post', source: 'job.mainActivities', required: false },
       ...
     ]
     ```
   - Because `currentTemplate.contextLevel === 'client'` (not `'job'`) and `currentTemplate.family === 'training'` (not `'risk'`), the condition:
     `(currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk')` evaluates to **`false`**.
   - As a result, when `training-tematica-loc-munca` is selected in the UI, the Job dropdown is **NOT displayed**, `selectedJobId` is reset to `''`, and the user is barred from selecting a specific job for the workplace training syllabus. The same defect occurs on `training-detaliu-loc-munca`.

2. **Catalog Inconsistency — Zero Templates with `contextLevel === 'job'`:**
   - Analysis of `src/lib/templates/definitions.ts` across all 31 templates yields:
     - `contextLevel: 'client'` → 16 templates
     - `contextLevel: 'employee'` → 12 templates
     - `contextLevel: 'hygiene_session'` → 3 templates
     - `contextLevel: 'job'` → **0 templates**
   - The sub-clause `currentTemplate?.contextLevel === 'job'` in `page.tsx` (lines 187, 212, 244, 339, 448, 528) is dead code that evaluates to `false` for every template in the application.

3. **Production Build & Typecheck Breakage:**
   - Running `npx tsc --noEmit` fails with exit code 2:
     ```
     scripts/test-challenger-m1-xlsx.ts:237:7 - error TS2345: Argument of type 'boolean | undefined' is not assignable to parameter of type 'boolean'.
       Type 'undefined' is not assignable to type 'boolean'.
     237       contentType?.includes('spreadsheetml') || contentType?.includes('octet-stream'),
     ```
   - Running `npm run build` fails at typecheck with exit code 1:
     ```
     scripts/test-challenger-m1-xlsx.ts(237,7): error TS2345: Argument of type 'boolean | undefined' is not assignable to parameter of type 'boolean'.
     Failed to type check.
     ```

4. **Passing Acceptance Checks:**
   - **Hygiene templates (3/3)** (`hygiene-adeverinta`, `hygiene-anexe-catalog`, `hygiene-tabel-cursanti`): Job dropdown is NEVER displayed, `selectedJobId` is cleanly empty, and `effectiveJobId` is `undefined` (PASS).
   - **General client templates (9/9)** (`decizii-angajator`, `ipssm-birou`, `hr-info-dosar`, `ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-universale`, `ipssm-opis`, `training-detaliu-introductiv`, `training-tematica-introductiv`): Job dropdown is NOT displayed, Employee dropdown is NOT displayed (PASS).
   - **Employee templates (12/12)** (`hr-cim-2026`, `ssm-fisa-instruire-individuala`, etc.): Employee dropdown IS displayed, Job dropdown is NOT displayed, job metadata auto-populates from employee profile (PASS).
   - **Risk templates (5/5 non-employee)** (`risk-evaluare`, `risk-plan-actiune-urgenta`, `risk-plan-prevenire-tesa`, `ipssm-tesa`, `risk-zone-pericol`): Job dropdown IS displayed (PASS).
   - **State transitions:**
     - `risk-evaluare` → `hygiene-tabel-cursanti`: `selectedJobId` cleanly reset to `''`, Job dropdown hidden (PASS).
     - `hr-cim-2026` → `decizii-angajator`: `selectedEmployeeId` cleanly reset to `''`, `selectedJobId` cleanly reset to `''` (PASS).
     - `hygiene-adeverinta` → `ipssm-birou`: `selectedEmployeeId` cleanly reset to `''` (PASS).

---

## 2. Logic Chain

1. From Observation 1, the user dispatch instruction explicitly demanded verification that: *"For job-level templates (e.g. `risk-evaluare`, `training-tematica-loc-munca`): Job dropdown IS displayed."*
2. From Observation 1 and 2, `src/app/documents/generate/page.tsx` line 528 conditions the Job dropdown on `(currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk')`.
3. Because `TEMPLATE_CATALOG` contains zero templates with `contextLevel === 'job'`, only templates with `family === 'risk'` trigger the dropdown.
4. Because `training-tematica-loc-munca` belongs to `family: 'training'`, the predicate evaluates to `false`, hiding the Job dropdown.
5. In practice, when a user selects a company with multiple jobs (e.g. Nexus Solutions with 4 jobs or Bistro Gourmet with 2 jobs) and chooses `training-tematica-loc-munca` or `training-detaliu-loc-munca`, the user cannot select a specific job; the UI submits `jobId: undefined`, and the resolver arbitrarily defaults to the client's first job in the database.
6. From Observation 3, the repository fails `npm run build` and `npx tsc --noEmit` due to a type error in `scripts/test-challenger-m1-xlsx.ts:237`.
7. Because both Requirement 2.3 and the build gate fail, the work product cannot be approved in its current state.

---

## 3. Caveats

- The worker's Excel generation fix (`fs.readFileSync` + `XLSX.read`) is completely sound and functional.
- The state reset cleanup hooks and payload sanitization in `page.tsx` are well-crafted and work correctly for all covered transitions.
- The defect on `training-tematica-loc-munca` originates from the initial recommendation in `PLAN_REMEDIERE_SI_REGANDIRE.md` line 239, which overlooked that `training-tematica-loc-munca` has `family: 'training'` rather than `family: 'risk'` and has `contextLevel: 'client'` in definitions.

---

## 4. Conclusion

**Verdict: REJECT.**

The Milestone 1 deliverable fails two mandatory criteria:
1. **Functional / UI Logic Defect:** `training-tematica-loc-munca` (and `training-detaliu-loc-munca`) fails to render the Job dropdown, violating Milestone 1 acceptance criteria.
2. **Build Gate Defect:** `npm run build` and `npx tsc --noEmit` fail due to a type error in `scripts/test-challenger-m1-xlsx.ts:237`.

### Recommended Actionable Remediations

1. **In `src/app/documents/generate/page.tsx`:**  
   Update the definition of `isJobContext` (and `isNextJob` in lines 184-187, 209-212, 241-244, 336-339, 445-448, 528) to include templates with job-dependent fields:
   ```typescript
   const isJobContext =
     !isEmployeeRequired &&
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'job' ||
      currentTemplate?.family === 'risk' ||
      Boolean(currentTemplate?.fields.some((f) => f.source.startsWith('job.'))));
   ```
   Or explicitly include `'training-tematica-loc-munca'` and `'training-detaliu-loc-munca'`.

2. **In `scripts/test-challenger-m1-xlsx.ts:237`:**  
   Cast or validate the boolean condition:
   ```typescript
   check(
     Boolean(contentType?.includes('spreadsheetml') || contentType?.includes('octet-stream')),
     `Unexpected content-type: ${contentType}`
   );
   ```

---

## 5. Verification Method

To independently verify these findings:

1. **Run the empirical challenger test harness:**
   ```bash
   npx tsx scripts/adversarial-m1-challenger2-ui-stress.ts
   ```
   *Observed result:* 59 passed, 3 failed, exit code 1. Specifically catches `training-tematica-loc-munca` failure and `contextLevel === 'job'` absence.

2. **Run TypeScript typecheck:**
   ```bash
   npx tsc --noEmit
   ```
   *Observed result:* Fails with TS2345 in `scripts/test-challenger-m1-xlsx.ts:237`.

3. **Run production build:**
   ```bash
   npm run build
   ```
   *Observed result:* Build fails at type check stage.
