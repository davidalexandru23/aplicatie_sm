# Handoff Report: Template Job Context Investigation & Predicate Architecture

**Agent:** `teamwork_explorer_m1_it2_1`  
**Role:** Explorer / Investigation & Synthesis  
**Recipient:** `8ad1e81b-94c6-4ac7-af81-65ffa2e75726` (Teamwork Orchestrator)  
**Date:** 2026-11-05T18:22:00Z  
**Status:** Task Complete  

---

## 1. Observation

### 1.1 Root Cause of Challenger 2 Rejection
In Milestone 1 Iteration 1, `teamwork_challenger_m1_2` rejected the deliverable (`scripts/adversarial-m1-challenger2-ui-stress.ts`) due to 3 empirical failures:
1. `training-tematica-loc-munca`: Job dropdown was NOT displayed (expected `true`, got `false`).
2. `training-detaliu-loc-munca`: Job dropdown was NOT displayed (expected `true`, got `false`).
3. Catalog contextLevel audit: Zero templates in `TEMPLATE_CATALOG` had `contextLevel === 'job'`.

Verbatim test output from `npx tsx scripts/adversarial-m1-challenger2-ui-stress.ts`:
```
--- TEST SUITE 2: Job-Level Templates per Specification ---
  ✓ [PASS] risk-evaluare: Job dropdown IS displayed
  ✗ [FAIL] training-tematica-loc-munca: Job dropdown IS displayed
         Reason: Expected Job dropdown true, got false. Template family is 'training', contextLevel is 'client', but it requires job fields (PLACEHOLDER_FUNCTIE: job.title)
  ✗ [FAIL] training-detaliu-loc-munca: Job dropdown IS displayed
         Reason: Expected Job dropdown true, got false. Template family is 'training', contextLevel is 'client', but it requires job fields (PLACEHOLDER_FUNCTIE: job.title)

--- TEST SUITE 3: Catalog contextLevel Audit ---
  Catalog distribution: client=16, employee=12, hygiene_session=3, job=0
  ✗ [FAIL] TEMPLATE_CATALOG contains templates with contextLevel === 'job'
         Reason: Zero templates have contextLevel === 'job' in TEMPLATE_CATALOG! The predicate '(currentTemplate?.contextLevel === "job" || currentTemplate?.family === "risk")' can never match on contextLevel === 'job'.
```

### 1.2 Inspection of `src/lib/templates/definitions.ts`
Examining all 31 templates in `TEMPLATE_CATALOG`:
- **Total templates**: 31
- **Hygiene templates (3)**: `hygiene-adeverinta`, `hygiene-anexe-catalog`, `hygiene-tabel-cursanti` (all have `family: 'hygiene'` or `contextLevel: 'hygiene_session'`).
- **Employee-level templates (12)**: `hr-anexa-fisa-post`, `hr-cerere-angajare`, `hr-cim-2026`, `hr-declaratie-regulament`, `hr-declaratie-raspundere`, `hr-gdpr-informare`, `ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`, `med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri`, `eip-fisa-acordare-individuala`, `hr-cim-model-cadru-2022` (all have `contextLevel: 'employee'`).
- **General client templates (9)**: `ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-birou`, `decizii-angajator`, `training-detaliu-introductiv`, `hr-info-dosar`, `ipssm-universale`, `ipssm-opis`, `training-tematica-introductiv` (all have `contextLevel: 'client'`, no `job.*` fields, no `employee.*` fields, family not `risk`).
- **Templates requiring Job Context without Employee Context (7)**:
  1. `training-tematica-loc-munca` (family: `'training'`, contextLevel: `'client'`):
     - 5 job fields: `PLACEHOLDER_FUNCTIE` (source: `job.title`, required: `true`), `PLACEHOLDER_COD_COR` (`job.corCode`), `PLACEHOLDER_ACTIVITATI_POST` (`job.mainActivities`), `PLACEHOLDER_ECHIPAMENTE_POST` (`job.equipmentUsed`), `PLACEHOLDER_CONDITII_POST` (`job.workConditions`).
     - 0 employee fields.
  2. `training-detaliu-loc-munca` (family: `'training'`, contextLevel: `'client'`):
     - 5 job fields identical to above (`job.title` required: `true`).
     - 0 employee fields.
  3. `risk-evaluare` (family: `'risk'`, contextLevel: `'client'`):
     - 1 job field: `PLACEHOLDER_FUNCTIE` (source: `job.title`, required: `true`).
  4. `risk-plan-prevenire-tesa` (family: `'risk'`, contextLevel: `'client'`):
     - 1 job field: `PLACEHOLDER_FUNCTIE` (source: `job.title`, required: `false`).
  5. `ipssm-tesa` (family: `'risk'`, contextLevel: `'client'`):
     - 1 job field: `PLACEHOLDER_FUNCTIE` (source: `job.title`, required: `true`).
  6. `risk-plan-actiune-urgenta` (family: `'risk'`, contextLevel: `'client'`):
     - 0 direct job fields, but in `risk` family.
  7. `risk-zone-pericol` (family: `'risk'`, contextLevel: `'client'`):
     - 0 direct job fields, but in `risk` family.

### 1.3 Inspection of `src/app/documents/generate/page.tsx`
Direct inspection of `page.tsx` revealed that the previous predicate `(currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk')` was duplicated across 6 distinct places:
1. **Lines 184–187**: Client change `useEffect` setting initial job from `data.jobs[0].id`.
2. **Lines 209–212**: Template switch `useEffect` resetting `selectedJobId` to `''`.
3. **Lines 241–244**: Fields fetch `useEffect` setting `effectiveJobId` query parameter.
4. **Lines 336–339**: `handleGenerate` submit handler preparing payload `jobId: effectiveJobId`.
5. **Lines 445–448**: Template `<select>` `onChange` handler resetting `selectedJobId` to `''`.
6. **Line 528**: JSX condition rendering the Job dropdown `<select>`.

Furthermore, in `page.tsx`:
- `interface TemplateOption` (lines 27–35) only defines `id`, `code`, `name`, `family`, `format`, `contextLevel`, `manifestJson`. It does NOT declare `fields`.
- If `page.tsx` evaluates `currentTemplate?.fields.some(...)` without declaring optional `fields` on `TemplateOption`, TypeScript throws a compile-time type error.

### 1.4 TypeScript Build Status
`npx tsc --noEmit` and `npm run build` both execute successfully with exit code 0. The previously reported type error in `scripts/test-challenger-m1-xlsx.ts:237` has already been resolved with `Boolean(...)`.

---

## 2. Logic Chain

1. In SSM practice, workplace training syllabi (`training-tematica-loc-munca` and `training-detaliu-loc-munca`) document specific training requirements for a given job/occupation (`job.title`, `job.corCode`, `job.mainActivities`, etc.).
2. In `src/lib/templates/resolver.ts:1986`, when generating a non-employee template, the resolver looks for `client.jobs.find(j => j.id === ctx.jobId)`. If `ctx.jobId` is `undefined`, it falls back to the client's first job in the database.
3. Because `training-tematica-loc-munca` and `training-detaliu-loc-munca` have `family: 'training'` (not `'risk'`) and `contextLevel: 'client'` (not `'job'`), the previous predicate `(currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk')` evaluated to `false`.
4. As a consequence, selecting either workplace syllabus template:
   - Hid the Job selector dropdown.
   - Forcibly cleared `selectedJobId` to `''`.
   - Prevented `jobId` from being passed to `/api/templates/[code]/fields` and `/api/documents/generate`.
5. To completely resolve this without breaking any existing behavior, the job context predicate must return `true` for all 7 job-level templates, return `false` for all 12 employee templates (where job is derived from employee), return `false` for all 3 hygiene templates, and return `false` for all 9 general client templates.
6. The predicate must be centralized to eliminate duplication and ensure that `onChange`, `useEffect` resets, field resolution, payload submission, and UI rendering remain 100% in sync.
7. Updating `contextLevel: 'job'` in `definitions.ts` for `training-detaliu-loc-munca` and `training-tematica-loc-munca` satisfies Challenger 2's Test Suite 3 (`countJobContext > 0`) and aligns the domain metadata with the application's type definition (`'client' | 'employee' | 'job' | 'event' | 'hygiene_session'`).

---

## 3. Caveats

- **No employee templates should show the Job selector**: In all 12 employee templates, `employee.currentJob` is used. Showing a separate Job dropdown for employee templates would create state conflicts. The predicate must strictly exclude `isEmployeeRequired`.
- **Hygiene templates must never show Job selector**: Even if a hygiene template has participants, it uses `hygieneScope` and `hygieneSessionId`/`hygieneParticipantId`. The predicate must strictly exclude `isHygieneTemplate`.
- **Database synchronization**: Updating `definitions.ts` updates static definitions and seed data. If the database was previously seeded with `contextLevel: 'client'`, the predicate must also match on `code.includes('loc-munca')` and `family === 'risk'` so that the UI works seamlessly whether or not `npx tsx src/lib/templates/seed.ts` is re-run.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Templates Requiring Job Context Without Employee Context (Catalog)
| Code | Family | Current contextLevel | Proposed contextLevel | Required Job Fields | Optional Job Fields |
|---|---|---|---|---|---|
| `training-tematica-loc-munca` | `training` | `client` | `job` | `job.title` | `job.corCode`, `job.mainActivities`, `job.equipmentUsed`, `job.workConditions` |
| `training-detaliu-loc-munca` | `training` | `client` | `job` | `job.title` | `job.corCode`, `job.mainActivities`, `job.equipmentUsed`, `job.workConditions` |
| `risk-evaluare` | `risk` | `client` | `client` (or `job`) | `job.title` | none |
| `risk-plan-prevenire-tesa` | `risk` | `client` | `client` (or `job`) | none | `job.title` |
| `ipssm-tesa` | `risk` | `client` | `client` (or `job`) | `job.title` | none |
| `risk-plan-actiune-urgenta` | `risk` | `client` | `client` | none | none |
| `risk-zone-pericol` | `risk` | `client` | `client` | none | none |

### 4.2 Exact Robust Predicate & Helper Function
Define a centralized helper function in `src/app/documents/generate/page.tsx`:

```typescript
function checkIsJobContext(tpl?: {
  family?: string;
  contextLevel?: string;
  code?: string;
  fields?: Array<{ source?: string }>;
} | null): boolean {
  if (!tpl) return false;

  // 1. Hygiene templates never use job context
  const isHygiene =
    tpl.family === 'hygiene' ||
    tpl.contextLevel === 'hygiene_session' ||
    Boolean(tpl.code?.startsWith('hygiene-'));
  if (isHygiene) return false;

  // 2. Employee templates infer job automatically from employee profile
  if (tpl.contextLevel === 'employee') return false;

  // 3. Robust matching for job context:
  // - Explicit contextLevel === 'job'
  // - Risk assessment family
  // - Workplace training templates (loc-munca)
  // - Any template with job.* placeholder fields
  return Boolean(
    tpl.contextLevel === 'job' ||
    tpl.family === 'risk' ||
    tpl.code?.includes('loc-munca') ||
    tpl.fields?.some((f) => f.source?.startsWith('job.'))
  );
}
```

### 4.3 Detailed Line-by-Line Changes for `src/app/documents/generate/page.tsx`

1. **Line 27–35: Update `TemplateOption` interface**:
   Add optional `fields?: Array<{ source?: string; key?: string }>;`:
   ```typescript
   interface TemplateOption {
     id: string;
     code: string;
     name: string;
     family: string;
     format: string;
     contextLevel: string;
     manifestJson: string;
     fields?: Array<{ source?: string; key?: string }>;
   }
   ```

2. **Line 164: Define `isJobContext` at component top level**:
   ```typescript
   const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
   const isHygieneTemplate =
     currentTemplate?.family === 'hygiene' ||
     currentTemplate?.contextLevel === 'hygiene_session' ||
     selectedTemplateCode.startsWith('hygiene-');
   const isEmployeeRequired =
     !isHygieneTemplate && currentTemplate?.contextLevel === 'employee';
   const isAdeverinta = selectedTemplateCode === 'hygiene-adeverinta';
   const isJobContext = checkIsJobContext(currentTemplate);
   ```

3. **Lines 184–193: Client change `useEffect`**:
   Replace:
   ```typescript
   const isJobContext =
     !isEmployeeRequired &&
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk');
   if (isJobContext && data.jobs.length > 0) {
     setSelectedJobId((prev) => prev || data.jobs[0].id);
   }
   ```
   With:
   ```typescript
   if (isJobContext && data.jobs.length > 0) {
     setSelectedJobId((prev) => prev || data.jobs[0].id);
   }
   ```
   (And include `isJobContext` in the dependency array `[selectedClientId, isEmployeeRequired, isHygieneTemplate, isJobContext]`).

4. **Lines 207–219: Template reset `useEffect`**:
   Replace:
   ```typescript
   const isJobContext =
     !isEmployeeRequired &&
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk');
   if (isHygieneTemplate || !isJobContext) {
     setSelectedJobId('');
   }
   ```
   With:
   ```typescript
   if (isHygieneTemplate || !isJobContext) {
     setSelectedJobId('');
   }
   ```
   (And update deps to `[selectedTemplateCode, isHygieneTemplate, isEmployeeRequired, isAdeverinta, isJobContext]`).

5. **Lines 241–248: Field query `useEffect`**:
   Replace:
   ```typescript
   const isJobContext =
     !isEmployeeRequired &&
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk');
   const effectiveJobId =
     isHygieneTemplate || (!isEmployeeRequired && !isJobContext)
       ? undefined
       : (selectedJobId || undefined);
   ```
   With:
   ```typescript
   const effectiveJobId =
     isHygieneTemplate || !isJobContext
       ? undefined
       : (selectedJobId || undefined);
   ```

6. **Lines 336–343: Submit handler `handleGenerate`**:
   Replace:
   ```typescript
   const isJobContext =
     !isEmployeeRequired &&
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk');
   const effectiveJobId =
     isHygieneTemplate || (!isEmployeeRequired && !isJobContext)
       ? undefined
       : (selectedJobId || undefined);
   ```
   With:
   ```typescript
   const effectiveJobId =
     isHygieneTemplate || !isJobContext
       ? undefined
       : (selectedJobId || undefined);
   ```

7. **Lines 445–452: Template `<select>` `onChange` handler**:
   Replace:
   ```typescript
   const isNextJob =
     !isNextEmployee &&
     !isNextHygiene &&
     (nextTpl?.contextLevel === 'job' || nextTpl?.family === 'risk');

   if (isNextHygiene || !isNextJob) {
     setSelectedJobId('');
   }
   ```
   With:
   ```typescript
   const isNextJob = checkIsJobContext(nextTpl);

   if (isNextHygiene || !isNextJob) {
     setSelectedJobId('');
   }
   ```

8. **Line 528: Job selector JSX render condition**:
   Replace:
   ```tsx
   {!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0 && (
   ```
   With:
   ```tsx
   {isJobContext && selectedClientId && jobs.length > 0 && (
   ```

### 4.4 Catalog Update in `src/lib/templates/definitions.ts`
1. Line 1878: Change `contextLevel: 'client'` to `contextLevel: 'job'` for `training-detaliu-loc-munca`.
2. Line 2542: Change `contextLevel: 'client'` to `contextLevel: 'job'` for `training-tematica-loc-munca`.

### 4.5 Test Suite Alignment in `scripts/adversarial-m1-challenger2-ui-stress.ts`
Update `simulatePageLogic` (lines 38–44 and 50–54) and `simulateTemplateSwitch` (lines 98–101 and 114–118) to use `checkIsJobContext(currentTemplate)` instead of the old hardcoded `(contextLevel === 'job' || family === 'risk')`.

---

## 5. Verification Method

Once the implementer applies the changes:

1. **Run Challenger 2 test harness**:
   ```bash
   npx tsx scripts/adversarial-m1-challenger2-ui-stress.ts
   ```
   *Expected result*: Exit code 0, 62 passed, 0 failed, `VERDICT: APPROVE`.

2. **Run TypeScript check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 type errors.

3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected result*: Compiled successfully, 13/13 static pages generated, exit code 0.
