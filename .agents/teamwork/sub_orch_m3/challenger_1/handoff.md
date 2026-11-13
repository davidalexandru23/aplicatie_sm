# Milestone 3 (M3) Adversarial Challenge Report — challenger_1

**Task**: Empirical Stress Testing & Adversarial Verification of Milestone 3  
**Verdict**: **`REQUEST_CHANGES`**  
**Date**: 2026-11-11  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/challenger_1`  
**Test Suite**: `scripts/adversarial-challenger1-m3.ts` (21 empirical tests executed)

---

## 1. Observation

### 1.1 Test Suite Execution Results
The automated adversarial suite `scripts/adversarial-challenger1-m3.ts` was written and executed directly against the live PostgreSQL database and Next.js route handlers.
Execution command:
```bash
npx tsx scripts/adversarial-challenger1-m3.ts
```

Verbatim scorecard output:
```
================================================================================
  FINAL SCORECARD — ADVERSARIAL CHALLENGER 1 (MILESTONE 3)
================================================================================
  [PASS] V1-01: POST /api/trainings/record with status: "planned" and date +30 days succeeds HTTP 201 (15ms)
  [PASS] V1-02: Verify participating employees ssmLastTrainingDate / psiLastTrainingDate were NOT modified by planned session (3ms)
  [PASS] V1-03: POST /api/trainings/record with status: "planned" and date +400 days fails HTTP 400 (1ms)
  [PASS] V1-04: POST /api/trainings/record with status: "completed" and date tomorrow fails HTTP 400 (1ms)
  [PASS] V1-05: POST /api/trainings/record with omitted status and date +15 days auto-defaults to "planned" and does NOT update employee dates (7ms)
  [PASS] V1-06: POST /api/trainings/record at exact boundary +364 days succeeds (201), at +366 days fails (400) (7ms)
  [PASS] V1-07: POST /api/trainings/record with status: "completed" updates ssmLastTrainingDate (and NOT psiLastTrainingDate) (9ms)
  [PASS] V1-08: POST /api/trainings/record with status: "completed" and type: "PERIODIC_PSI" updates psiLastTrainingDate only (7ms)
  [PASS] V1-09: POST /api/trainings/record rejects non-existent client with HTTP 404 (2ms)
  [PASS] V1-10: POST /api/trainings/record rejects invalid trainingType with HTTP 400 (0ms)
  [PASS] V1-11: POST /api/trainings/record rejects negative or zero durationHours with HTTP 400 (0ms)
  [PASS] V1-12: POST /api/trainings/record rejects cross-client participant employee IDs with HTTP 400 (17ms)
  [PASS] V2-01: Record a training session with 2 participants (Emp 1 and Emp 2) (7ms)
  [PASS] V2-02: Generate ssm-pv-instruire-colectiva with trainingEventId and verify document contents (participant names, CNP masking, dates) (96ms)
  [FAIL] V2-02-BUG: Verify participant specific job titles (Inginer Tehnolog, Tehnician Mentenanță) in ssm-pv-instruire-colectiva (NOT generic fallback "Lucrător") (50ms)
         Error: Assertion failed: Participant 1 job title (Inginer Tehnolog) must be present in document; found fallback "Lucrător"
  [PASS] V2-03: Generate psi-pv-instruire with trainingEventId and verify DOCX participant mapping & CNP masking (43ms)
  [PASS] V3-01: Create Employee 3 with hireDate 15.01.2025 and 4 distinct training event types (7ms)
  [PASS] V3-02: Resolve placeholders for ssm-fisa-instruire-individuala: verify exact event date mapping & table discrimination (9ms)
  [PASS] V3-03: Resolve placeholders for psi-fisa-instructaj-individuala: verify exact event date mapping & table discrimination (10ms)
  [PASS] V3-04: Physically generate ssm-fisa-instruire-individuala and psi-fisa-instructaj-individuala DOCX files and verify XML tokens (103ms)
  [PASS] V4-01: Verify employee with expired training (OVERDUE) is NOT blocked from generating statutory training sheets (48ms)
--------------------------------------------------------------------------------
Total tests executed: 21
Total passed:          20 (95.2%)
Total failed:          1
================================================================================
 VERDICT: REQUEST_CHANGES (1 adversarial tests failed) 
```

### 1.2 Observed Bug in Collective PV Participant Function Resolution
In `src/lib/templates/resolver.ts`:
1. Lines 2468–2480:
   ```typescript
   const client = await prisma.client.findUnique({
     where: { id: ctx.clientId },
     include: {
       jobs: true,
       worksites: true,
       trainingEvents: {
         include: {
           participants: {
             include: { employee: true },
           },
         },
         orderBy: { eventDate: 'asc' },
       },
   ```
   `client.trainingEvents` includes `employee: true`, which loads only primitive columns of the `Employee` model, omitting the relation `currentJob`.

2. Lines 2559–2575:
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
   Because `client.trainingEvents?.find(...)` succeeds for any training event belonging to the client, the right side of `||` (`prisma.trainingEvent.findUnique`) is never reached.

3. Lines 2395–2409:
   ```typescript
   participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
     const emp = p.employee;
     const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
     const func = emp?.currentJob?.title || 'Lucrător';
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
   Because `emp.currentJob` is `undefined`, `emp?.currentJob?.title` evaluates to `undefined`, and `func` unconditionally falls back to `"Lucrător"`.

4. Document Inspection:
   Unpacking the OpenXML of the generated `ssm-pv-instruire-colectiva.docx` reveals:
   ```text
   Nr. Nume și Prenume Funcția / Ocupația CNP Rezultat Semnătură
   1 Ionescu Ion Lucrător 18805******** admis
   2 Popescu Elena Lucrător 29007******** admis
   ```
   Even though Participant 1 was created with `job: { title: "Inginer Tehnolog" }` and Participant 2 with `job: { title: "Tehnician Mentenanță" }`, both participants are labeled with the generic placeholder `"Lucrător"`.

---

## 2. Logic Chain

1. **Regulatory Requirement**:
   HG nr. 1425/2006 (art. 88) and OMAI nr. 712/2005 (art. 42) require that collective training records and statutory training protocols list the specific occupation/position (`funcția / ocupația`) of each participating worker to verify qualification-specific safety training.

2. **Data Model Integrity**:
   In `prisma/schema.prisma`, each `Employee` has a foreign key `currentJobId` linking to the `Job` model (`title`, `corCode`). The database contains authentic job titles for these employees.

3. **Resolver Execution Path**:
   When `resolveTemplatePlaceholders` is called with `trainingEventId`, `client.trainingEvents` already holds the event cached from the initial client lookup. Because `client.trainingEvents` did not include `{ employee: { include: { currentJob: true } } }`, the `employee.currentJob` relation is `undefined`.

4. **Masked Dead-Code Fallback**:
   The code author wrote a standalone `findUnique` query containing `{ employee: { include: { currentJob: true } } }`, but placed it behind a logical OR (`client.trainingEvents?.find(...) || await prisma.trainingEvent.findUnique(...)`). This made the detailed query dead code, masking the omission of `currentJob` in the primary query.

5. **Empirical Failure**:
   Test `V2-02-BUG` empirically proves that generated collective PVs (`ssm-pv-instruire-colectiva` and `psi-pv-instruire`) fail to reflect real job titles, producing generic `"Lucrător"` for all participants regardless of database records.

---

## 3. Caveats

- **No Caveats on Verified Areas**: 20 out of 21 tests passed cleanly and conclusively:
  - Future date boundaries (V1-01 to V1-06) strictly enforce 365 days max for planned sessions, and block future dates for completed sessions.
  - Profile synchronization (V1-02, V1-07, V1-08) correctly prevents premature date advancement on planned sessions and properly updates the correct domain date (SSM vs PSI) on completion.
  - Zero raw CNP leakage (V2-02, V2-03): CNPs are strictly masked in all rendered tables.
  - Event discrimination (V3-01 to V3-04): `INTRODUCTIV`, `LOC_MUNCA`, `PERIODIC_SSM`, and `PERIODIC_PSI` map cleanly to their exact individual sheet sections and do not fall back to `hireDate` when events exist.
  - Catch-22 elimination (V4-01): Overdue status never blocks training document generation.
- **Scope of Defect**: The bug is localized strictly to the participant table function mapping in collective PVs (`src/lib/templates/resolver.ts`).

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

While the core functionality of Milestone 3 is robust and passes 20 adversarial challenges, worker_1 must resolve the participant job title resolution bug in `src/lib/templates/resolver.ts` before Milestone 3 can be approved:

### Required Action for Worker:
In `src/lib/templates/resolver.ts`:
1. In `prisma.client.findUnique` (around line 2475), update `trainingEvents` include to:
   ```typescript
   trainingEvents: {
     include: {
       participants: {
         include: {
           employee: {
             include: {
               currentJob: true,
             },
           },
         },
       },
     },
     orderBy: { eventDate: 'asc' },
   },
   ```
2. In `participanti` mapping (around line 2398), ensure robust job title resolution with fallback to `client.jobs`:
   ```typescript
   const func = emp?.currentJob?.title || (emp?.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) || 'Lucrător';
   ```

---

## 5. Verification Method

To independently verify the bug and subsequent fix:

1. **Run the Adversarial Stress Test**:
   ```bash
   npx tsx scripts/adversarial-challenger1-m3.ts
   ```
   - Current status: Exits with code 1, reporting failure on `V2-02-BUG`.
   - Invalidation condition (Fixed): All 21 tests must pass (`21 passed (100.0%)`, Exit code 0).

2. **Run Full System Regression Suite**:
   ```bash
   npm test
   ```
   - Must maintain 100% pass rate across all 5 suites (416/416 tests).
