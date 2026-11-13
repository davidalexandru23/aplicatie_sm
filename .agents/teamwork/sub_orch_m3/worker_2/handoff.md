# Milestone 3 (M3) Iteration 2 Implementation Report — worker_2

**Task**: Fix collective PV participant job title resolution bug in `src/lib/templates/resolver.ts`  
**Worker**: worker_2 (implementer, qa, specialist)  
**Date**: 2026-11-11  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/worker_2`  
**Modified File**: `src/lib/templates/resolver.ts` (Exclusive Write Ownership)

---

## 1. Observation

### 1.1 Initial Failure in Adversarial Challenger 1 Suite
Running `npx tsx scripts/adversarial-challenger1-m3.ts` before the fix reproduced the following defect:
```text
  [PASS] V2-01: Record a training session with 2 participants (Emp 1 and Emp 2) (7ms)
  [PASS] V2-02: Generate ssm-pv-instruire-colectiva with trainingEventId and verify document contents (participant names, CNP masking, dates) (99ms)
  [FAIL] V2-02-BUG: Verify participant specific job titles (Inginer Tehnolog, Tehnician Mentenanță) in ssm-pv-instruire-colectiva (NOT generic fallback "Lucrător") (45ms)
         Error: Assertion failed: Participant 1 job title (Inginer Tehnolog) must be present in document; found fallback "Lucrător"
```

### 1.2 Code Inspection Observations in `src/lib/templates/resolver.ts`
1. **Initial Query Relation Omission (`resolveTemplatePlaceholders`, lines ~2473-2480)**:
   ```typescript
   trainingEvents: {
     include: {
       participants: {
         include: { employee: true },
       },
     },
     orderBy: { eventDate: 'asc' },
   },
   ```
   `employee: true` loaded only primitive scalar columns of `Employee`. The relations `currentJob` and `identityDocument` were omitted.

2. **Dead-Code Fallback in Training Event Lookup (lines ~2559-2576)**:
   ```typescript
   const trainingEvent = ctx.trainingEventId
     ? (client.trainingEvents?.find((e: any) => e.id === ctx.trainingEventId) ||
         (await prisma.trainingEvent.findUnique({
           where: { id: ctx.trainingEventId },
           include: {
             participants: {
               include: {
                 employee: {
                   include: {
                     currentJob: true,
                     identityDocument: true,
                   },
                 },
               },
             },
           },
         })))
     : null;
   ```
   Because `client.trainingEvents` already contained the event, `client.trainingEvents.find(...)` returned true, short-circuiting the OR operator. The detailed query with `currentJob` was never evaluated.

3. **Brittle Job Title Mapping in `resolveTemplateData` (lines ~2395-2409)**:
   ```typescript
   participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
     const emp = p.employee;
     const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
     const func = emp?.currentJob?.title || 'Lucrător';
   ```
   When `emp.currentJob` was undefined, `func` defaulted to `'Lucrător'`, ignoring `emp.currentJobId` and `client.jobs`.

---

## 2. Logic Chain

1. **Root Cause**: The client-level Prisma query loaded `trainingEvents.participants.employee` without including `currentJob`. In-memory evaluation matched the event in `client.trainingEvents`, causing the detailed `findUnique` query to be skipped. In `participanti` mapping, `emp?.currentJob?.title` was undefined, so `'Lucrător'` was emitted instead of the actual statutory job title (`"Inginer Tehnolog"`).
2. **First Line of Defense**: In `prisma.client.findUnique`, update `trainingEvents` include so that `participants.employee` eagerly loads `currentJob: true` and `identityDocument: true`. This ensures cached events already contain relation data.
3. **Second Line of Defense**: In `participanti` mapping, make job title resolution resilient:
   ```typescript
   const func =
     emp?.currentJob?.title ||
     (emp?.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) ||
     'Lucrător';
   ```
   Additionally, resolve `emp` via `p.employee || (p.employeeId && client?.employees?.find((e: any) => e.id === p.employeeId))` in case `p.employee` was not populated.
4. **Third Line of Defense**: In `resolveTemplatePlaceholders` and `resolveTemplateData`, inspect `trainingEvent.participants`. If any participant is missing `employee` or `employee.currentJob`, query `prisma.trainingEvent.findUnique` with full includes and hydrate `p.employee` and `p.employee.currentJob` from `client.employees` and `client.jobs`.
5. **Compilation and Integrity**: Typed all assignments to conform strictly with TypeScript type definitions (`as any[]`, `|| null`) to ensure clean zero-warning builds under Next.js 16 Turbopack.

---

## 3. Caveats

- **Scope Adherence**: Only `src/lib/templates/resolver.ts` was edited, respecting exclusive write boundaries.
- **No Hardcoding**: No test fixture names, job titles, or CNP patterns are hardcoded. All logic queries real Prisma models and dynamic database records.
- **No Side Effects**: Individual training sheet generation (`ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`), batch document generation, and non-training compliance validations are completely preserved without regressions.

---

## 4. Conclusion

The collective PV participant job title resolution bug is fully resolved. Participant specific occupations/job titles (e.g., `Inginer Tehnolog`, `Tehnician Mentenanță`) are correctly resolved and populated into collective training minutes (`ssm-pv-instruire-colectiva` and `psi-pv-instruire`), satisfying Romanian statutory requirements (Legea 319/2006 art. 20, HG 1425/2006 art. 88).

All verification gates have passed with 100% success rate:
- Adversarial Challenger 1 Suite: 21/21 passed (including `V2-02-BUG`).
- Adversarial Challenger 2 Suite: 19/19 passed.
- Prisma schema validation: 0 errors.
- Production build (`npm run build`): 0 compilation errors.
- Unified Acceptance Suite (`npm test`): 416/416 passed across all 5 verification suites.

---

## 5. Verification Method

Independent reproduction commands:

```bash
# 1. Verify bug fix against Adversarial Challenger 1 (21/21 passed, including V2-02-BUG)
npx tsx scripts/adversarial-challenger1-m3.ts

# 2. Verify regression safety against Adversarial Challenger 2 (19/19 passed)
npx tsx scripts/adversarial-challenger2-m3.ts

# 3. Verify Prisma schema validity
npx prisma validate

# 4. Verify Next.js production build and TypeScript compilation
npm run build

# 5. Verify full test suite across all 5 suites (416/416 passed)
npm test
```
