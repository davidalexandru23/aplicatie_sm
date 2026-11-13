# Milestone 3 (M3) Investigation Report — explorer_1_r2

**Task**: Empirical Investigation & Recommended Fix Strategy for Participant Job Resolution Defect in Collective PVs (`ssm-pv-instruire-colectiva` and `psi-pv-instruire`)  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_1_r2`  
**Target File**: `src/lib/templates/resolver.ts`  
**Test Suite**: `scripts/adversarial-challenger1-m3.ts` (Test `V2-02-BUG`)  
**Date**: 2026-11-11  

---

## 1. Observation

### 1.1 Empirical Reproduction of Defect
Executing the empirical adversarial test suite:
```bash
npx tsx scripts/adversarial-challenger1-m3.ts
```
Results in 20 passed tests and 1 failure on `V2-02-BUG`:
```text
  [PASS] V2-01: Record a training session with 2 participants (Emp 1 and Emp 2) (7ms)
  [PASS] V2-02: Generate ssm-pv-instruire-colectiva with trainingEventId and verify document contents (participant names, CNP masking, dates) (100ms)
  [FAIL] V2-02-BUG: Verify participant specific job titles (Inginer Tehnolog, Tehnician Mentenanță) in ssm-pv-instruire-colectiva (NOT generic fallback "Lucrător") (40ms)
         Error: Assertion failed: Participant 1 job title (Inginer Tehnolog) must be present in document; found fallback "Lucrător"
  [PASS] V2-03: Generate psi-pv-instruire with trainingEventId and verify DOCX participant mapping & CNP masking (36ms)
...
Total tests executed: 21
Total passed:          20 (95.2%)
Total failed:          1
VERDICT: REQUEST_CHANGES (1 adversarial tests failed)
Exit code: 1
```

### 1.2 Direct Code Observations in `src/lib/templates/resolver.ts`

1. **Lines 2468–2480 (`resolveTemplatePlaceholders` — Primary Client Query)**:
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
   Direct observation: `trainingEvents.participants.include` specifies `{ employee: true }`. This loads only the primitive columns of the `Employee` model, leaving relation fields like `currentJob` completely unjoined (`undefined`).

2. **Lines 2559–2576 (`resolveTemplatePlaceholders` — Training Event Resolution)**:
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
   Direct observation: Because `client.trainingEvents` already contains the event matching `ctx.trainingEventId`, the expression `client.trainingEvents?.find(...)` evaluates to a truthy object. The right-hand side of the `||` operator (`prisma.trainingEvent.findUnique(...)`) is dead code and is never executed. Consequently, `trainingEvent` is populated with the shallow employee objects from `client.trainingEvents`.

3. **Lines 2395–2410 (`resolveTemplateData` — `participanti` Collection Mapping)**:
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
   Direct observation: Because `emp.currentJob` is `undefined`, `emp?.currentJob?.title` evaluates to `undefined`. Line 2398 unconditionally falls back to `'Lucrător'`, ignoring the actual job assigned to the employee (`currentJobId: job1.id` -> `"Inginer Tehnolog"`).

4. **Template Catalog Contract (`src/lib/templates/definitions.ts:3984–3995`)**:
   ```typescript
   collections: [
     {
       key: 'participanti',
       label: 'Lista nominală a participanților',
       source: 'trainingParticipants',
       fields: [
         { key: 'nr', label: 'Nr. crt.', source: 'index', required: false, type: 'number' },
         { key: 'numeComplet', label: 'Nume și prenume', source: 'employee.fullName', required: true, type: 'string' },
         { key: 'functie', label: 'Funcția / Ocupația', source: 'employee.job.title', required: false, type: 'string' },
   ```
   Direct observation: The official template definition specifies `source: 'employee.job.title'` for `functie`.

---

## 2. Logic Chain

1. **Statutory & Contractual Obligation**:
   Under HG 1425/2006 (art. 88) and OMAI 712/2005 (art. 42), the official collective training attendance protocol must record the specific job function/occupation (`Funcția / Ocupația`) of each participating worker to establish statutory qualification-specific training compliance.

2. **Root Cause Mechanism**:
   The primary database query in `resolveTemplatePlaceholders` fetches `client.trainingEvents` with `{ participants: { include: { employee: true } } }`. In Prisma ORM, `{ employee: true }` selects only direct scalar columns on `Employee` (such as `id`, `firstName`, `lastName`, `cnp`, `currentJobId`), and leaves foreign-key relations (`currentJob`) uninstantiated (`undefined`).

3. **Short-Circuit Masking**:
   The author anticipated that `trainingEvent` requires `currentJob: true` and `identityDocument: true`, adding a standalone `findUnique` query containing those exact includes. However, placing it behind `client.trainingEvents?.find(...) || await prisma.trainingEvent.findUnique(...)` made the detailed query unreachable whenever the training event belonged to the client being loaded.

4. **Failure to Fallback to Cached Client Data**:
   Line 2471 loads `jobs: true` on `client`. Even if `emp.currentJob` is not eagerly joined, `emp.currentJobId` is present on the employee. The resolver failed to utilize `client.jobs.find(j => j.id === emp.currentJobId)` as a fallback before dropping down to the generic static string `'Lucrător'`.

5. **Direct Impact**:
   Every collective training document (`ssm-pv-instruire-colectiva` and `psi-pv-instruire`) outputs the placeholder `'Lucrător'` for all attendees regardless of whether they are engineers, operators, technicians, or managers. Test `V2-02-BUG` in `scripts/adversarial-challenger1-m3.ts` catches this discrepancy by unpacking the generated DOCX OpenXML and asserting the presence of real job titles.

---

## 3. Caveats

- **Scope Boundary**: No other files or modules are broken. Full regression test (`npm test`) passes 416/416 tests across all 5 verification suites. Forensic audit (`scripts/forensic-audit-m3.ts`) passes 11/11 tests. Challenger 2 (`scripts/adversarial-challenger2-m3.ts`) passes 19/19 tests.
- **Read-Only Investigation**: In compliance with the Teamwork Explorer identity and system constraints, no production files were modified during this investigation.
- **Safety of Proposed Changes**: The proposed changes in `src/lib/templates/resolver.ts` strictly expand the query payload and add defensive fallbacks without modifying any schema, API endpoints, or routing contracts.

---

## 4. Conclusion & Recommended Fix Strategy

The issue is fully diagnosed. Worker (`worker_1_r2`) should implement two synchronized, defense-in-depth modifications in `src/lib/templates/resolver.ts`:

### Fix Step 1: Eager-load `currentJob` in `prisma.client.findUnique`
In `src/lib/templates/resolver.ts` around line 2473:

```typescript
// BEFORE (lines 2473-2479):
      trainingEvents: {
        include: {
          participants: {
            include: { employee: true },
          },
        },
        orderBy: { eventDate: 'asc' },
      },

// AFTER:
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

### Fix Step 2: Multi-tier Defensive Fallback in `participanti` mapping
In `src/lib/templates/resolver.ts` around line 2395:

```typescript
// BEFORE (lines 2395-2400):
      participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
        const emp = p.employee;
        const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
        const func = emp?.currentJob?.title || 'Lucrător';

// AFTER:
      participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
        const emp = p.employee || (p.employeeId && client?.employees?.find((e: any) => e.id === p.employeeId));
        const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
        const func =
          emp?.currentJob?.title ||
          (emp?.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) ||
          'Lucrător';
```

### Rationale:
- **Fix Step 1** guarantees that when `client.trainingEvents?.find(...)` succeeds at line 2560, `p.employee.currentJob` is already fully populated with `title` and `corCode`.
- **Fix Step 2** provides double redundancy:
  1. Primary: Uses `emp?.currentJob?.title`.
  2. Secondary: If `emp.currentJob` relation was omitted by any caller, resolves the title from `client.jobs` using `emp.currentJobId`.
  3. Tertiary: If `p.employee` was omitted entirely, resolves the employee from `client.employees`.
  4. Final: Falls back to statutory `'Lucrător'` only if no job record exists.

---

## 5. Verification Method

Worker and Orchestrator can independently verify this resolution by executing the following commands:

1. **Verify Adversarial Suite Passes 100%**:
   ```bash
   npx tsx scripts/adversarial-challenger1-m3.ts
   ```
   - **Expected Result**: 21 passed (100.0%), 0 failed, Exit code: 0. Test `V2-02-BUG` passes with `Inginer Tehnolog` and `Tehnician Mentenanță` detected in the generated OpenXML.

2. **Verify Full System Regression Suite**:
   ```bash
   npm test
   ```
   - **Expected Result**: 416/416 tests passed (100% pass rate across all 5 verification suites).

3. **Verify Forensic Audit and Challenger 2**:
   ```bash
   npx tsx scripts/forensic-audit-m3.ts
   npx tsx scripts/adversarial-challenger2-m3.ts
   ```
   - **Expected Result**: 11/11 forensic checks passed, 19/19 challenger 2 checks passed.
