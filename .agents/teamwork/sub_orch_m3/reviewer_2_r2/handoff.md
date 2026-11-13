# Independent Statutory & Adversarial Review Report — Milestone 3 (Iteration 2)

**Reviewer**: reviewer_2_r2 (reviewer, critic)  
**Date**: 2026-11-11  
**Target Milestone**: M3 Iteration 2 (Collective Training Minutes Job Title Resolution & Statutory Conformance)  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/reviewer_2_r2`  
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Code Modifications Observed in `src/lib/templates/resolver.ts`
Inspection of `git diff src/lib/templates/resolver.ts` shows targeted fixes applied to resolve participant job title extraction:

1. **Eager Loading of Job and Identity Relations (`resolveTemplatePlaceholders`, lines ~2487-2500)**:
   ```typescript
   trainingEvents: {
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
     orderBy: { eventDate: 'asc' },
   },
   ```

2. **On-Demand Hydration Fallback (`resolveTemplatePlaceholders`, lines ~2577-2620)**:
   ```typescript
   let trainingEvent = ctx.trainingEventId
     ? (client.trainingEvents?.find((e: any) => e.id === ctx.trainingEventId) || null)
     : null;

   if (
     ctx.trainingEventId &&
     (!trainingEvent ||
       !trainingEvent.participants ||
       trainingEvent.participants.some(
         (p: any) => !p.employee || (!p.employee.currentJob && p.employee.currentJobId)
       ))
   ) {
     trainingEvent = await prisma.trainingEvent.findUnique({
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
     });
   }
   ```

3. **Multi-Tier Robust Job Title Mapping in `participanti` Collection (lines ~2406-2423)**:
   ```typescript
   participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
     const emp = p.employee || (p.employeeId && client?.employees?.find((e: any) => e.id === p.employeeId));
     const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
     const func =
       emp?.currentJob?.title ||
       (emp?.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) ||
       'Lucrător';
     const cnpVal = emp?.cnp ? maskCNP(emp.cnp) : '';
     const rez = p.result || 'admis';
     return {
       nr: idx + 1,
       numeComplet: empName,
       functie: func,
       cnp: cnpVal,
       rezultat: rez,
       semnatura: '',
     };
   }),
   ```

### 1.2 Verification Commands Executed and Results

1. **Prisma Schema Validation**:
   - Command: `npx prisma validate`
   - Result: `The schema at prisma/schema.prisma is valid 🚀` (Exit code 0).

2. **TypeScript & Turbopack Production Build**:
   - Command: `npm run build`
   - Result: Compiled successfully in 990ms; TypeScript finished in 1775ms; 15 static routes and 25 dynamic routes generated with 0 errors (Exit code 0).

3. **Adversarial Challenger 1 Suite**:
   - Command: `npx tsx scripts/adversarial-challenger1-m3.ts`
   - Result: 21/21 passed (100.0%), including `V2-02-BUG` verifying participant job titles (`Inginer Tehnolog`, `Tehnician Mentenanță`) instead of fallback `"Lucrător"`.

4. **Adversarial Challenger 2 Suite**:
   - Command: `npx tsx scripts/adversarial-challenger2-m3.ts`
   - Result: 19/19 passed (100.0%). Confirmed Catch-22 unblocking for overdue employees, CNP masking, and participant scoping.

5. **Milestone 3 Independent Statutory Audit Suite**:
   - Command: `npx tsx scripts/adversarial-m3-statutory-review.ts`
   - Result: 38/38 audit checks passed (100.0%).

6. **Unified Acceptance Test Suite**:
   - Command: `npm test` (`npx tsx scripts/verify-all.ts`)
   - Result: 416/416 verified items passed across all 5 suites:
     - Suite 1 (Document Auto-Completion): 31/31 passed
     - Suite 2 (Compliance Deadlines & Expiry): 45/45 passed
     - Suite 3 (Excel Import/Export Resilience): 6/6 passed
     - Suite 4 (Comprehensive 4-Tier E2E Suite): 333/333 passed (T1: 155, T2: 155, T3: 15, T4: 8)
     - Suite 5 (Production Build Integrity): 1/1 passed

7. **Direct Physical DOCX XML Inspection**:
   - Generated actual DOCX files for `ssm-pv-instruire-colectiva` and `psi-pv-instruire` with participants having jobs `Ospătar / Chelner` and `Bucătar Specialist`.
   - Result: Extracted OpenXML `word/document.xml` confirmed exact presence of `Ospătar / Chelner` and `Bucătar Specialist`. Zero fallback to generic `"Lucrător"`.

---

## 2. Logic Chain

1. **Statutory Non-Conformance Identified in Iteration 1**:
   Under HG 1425/2006 art. 88 and OMAI 712/2005 art. 42, collective training minutes must consemn and identify the exact job title / occupation (`funcția / ocupația`) of each attendee. Generic designations like `"Lucrător"` violate inspection mandates because occupational health and safety hazards are legally bound to specific COR codes and job duties.

2. **Root Cause Analysis**:
   When resolving collective minutes (`ssm-pv-instruire-colectiva` and `psi-pv-instruire`), the training event was queried through `client.trainingEvents` where `participants.employee` had only scalar columns loaded. The fallback query with `include: { currentJob: true }` was unreachable due to short-circuiting. Consequently, `emp.currentJob` was `undefined`, triggering the fallback string `'Lucrător'`.

3. **Verification of the Remedy**:
   - The fix addresses the root cause at all three architectural layers:
     - *Query Layer*: Eagerly loads `currentJob` and `identityDocument` in the initial `trainingEvents` include.
     - *Hydration Layer*: Explicitly detects missing relation models and re-fetches via `prisma.trainingEvent.findUnique` or links from `client.jobs`.
     - *Mapping Layer*: Traverses `emp.currentJob.title`, then `client.jobs` via `emp.currentJobId`, before falling back.
   - The implementation was verified empirically through OpenXML extraction of real DOCX artifacts, proving that actual job titles appear in the generated document tables.

4. **Integrity & Security Invariant Checks**:
   - *No Hardcoded Hacks*: Verified that test strings (e.g., `Inginer Tehnolog`) are not hardcoded in `src/lib/templates/resolver.ts`. All data is dynamically resolved from Prisma models.
   - *CNP Privacy*: Verified that all participant CNPs in collective minutes are masked (`1******4567`) in compliance with GDPR Art. 6 and Legea 190/2018. Raw CNPs never leak into collective tables.
   - *Scadențe Isolation*: Verified that future planned training (`status: "planned"`) does not update `ssmLastTrainingDate` or `psiLastTrainingDate`, preserving compliance integrity.
   - *Catch-22 Elimination*: Verified that employees with overdue training can immediately generate new training sheets to record reinstatement sessions without application lockouts.

---

## 3. Caveats

- **Existing Legacy Seed Records**: If an employee has no `currentJobId` assigned in the database, the resolver will legitimately default to `'Lucrător'`. This is correct application behavior when job data is genuinely absent.
- **Scope Isolation**: Milestone 3 scope is restricted to training event synchronization and collective/individual training documents. Employee profile management and medical exam updates remain governed by Milestones 1 and 2.

---

## 4. Conclusion

The implementation by worker_2 in Milestone 3 Iteration 2 fully and demonstrably resolves the collective PV participant job title resolution bug. All requirements under Legea 319/2006 art. 20, HG 1425/2006 art. 88, and OMAI 712/2005 art. 42 are satisfied. 

Zero integrity violations, zero regressions, and zero compilation errors were detected. 416/416 tests across the unified test suite and 78/78 adversarial/statutory stress tests passed.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

Independent verification can be reproduced with the following commands:

```bash
# 1. Verify Prisma schema integrity
npx prisma validate

# 2. Verify Next.js 16 Turbopack production compilation
npm run build

# 3. Verify bug resolution against Adversarial Challenger 1 (21/21 passed)
npx tsx scripts/adversarial-challenger1-m3.ts

# 4. Verify regression safety against Adversarial Challenger 2 (19/19 passed)
npx tsx scripts/adversarial-challenger2-m3.ts

# 5. Verify Milestone 3 independent statutory audit (38/38 checks passed)
npx tsx scripts/adversarial-m3-statutory-review.ts

# 6. Verify full unified acceptance test suite (416/416 passed across all 5 suites)
npm test
```
