# Investigation Report: Test Verification of M2 Future Date Validation Fix

**Agent**: `m2_r2_it2_explorer_3` (Teamwork Explorer / Analyst / Specialist)  
**Parent Agent ID**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`  
**Milestone**: M2 Iteration 2 — SSM Operational Workflows UI & Training Scheduler  
**Date**: 2026-11-02  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_it2_explorer_3/`  
**Handoff Type**: Hard  

---

## 1. Observation

### 1.1 Direct Inspection of `scripts/verify-m2-challenger2.ts` (Scenario 12)
In `scripts/verify-m2-challenger2.ts` (lines 443–481), Scenario 12 tests future date rejection under suite `'ADVERSARIAL_EDGE'`:

```typescript
443:     await runLoggedTest('ADVERSARIAL_EDGE', 'Attempt to record with future date -> assert validation error', async () => {
444:       const futureDate = '2099-01-01';
445:       const req = new NextRequest('http://localhost:3000/api/trainings/record', {
446:         method: 'POST',
447:         headers: { 'Content-Type': 'application/json' },
448:         body: JSON.stringify({
449:           clientId: clientAId,
450:           trainingType: 'PERIODIC_SSM',
451:           eventDate: futureDate,
452:           durationHours: 2,
453:           instructorName: 'Tester Future',
454:           participantEmployeeIds: [employeeIdsA[2]],
455:         }),
456:       });
457: 
458:       const response = await POST(req);
459:       
460:       // EMPIRICAL OBSERVATION & TEST ORACLE:
461:       // An SSM training sheet (fișă de instruire individuală) cannot be legally signed or recorded
462:       // in the future. Attempting to record with a future date should be rejected with HTTP 400.
463:       if (response.status === 201) {
464:         // Clean up the invalid training event created during this probe
465:         const resJson = await response.json();
466:         if (resJson.eventId) {
467:           await prisma.trainingEvent.delete({ where: { id: resJson.eventId } });
468:         }
469:         // Revert employee date
470:         await prisma.employee.update({
471:           where: { id: employeeIdsA[2] },
472:           data: { ssmLastTrainingDate: pastTenMonths },
473:         });
474: 
475:         trackAssert(false, `VULNERABILITY: Endpoint accepted future training date ${futureDate} with HTTP 201 instead of rejecting with HTTP 400 validation error.`);
476:         return `VULNERABILITY DETECTED: Endpoint accepted future date (${futureDate}) without validation.`;
477:       } else {
478:         trackAssertEqual(response.status, 400, 'Future training date must be rejected with HTTP 400');
479:         return 'Future date was correctly rejected with HTTP 400.';
480:       }
481:     });
```

**Key Execution Details**:
- **Invocation**: Direct call to `POST(req)` where `req` is an in-memory `NextRequest` to `http://localhost:3000/api/trainings/record`.
- **Payload**:
  - `clientId`: Valid client UUID (`clientAId`).
  - `trainingType`: `'PERIODIC_SSM'`.
  - `eventDate`: `'2099-01-01'`.
  - `durationHours`: `2`.
  - `instructorName`: `'Tester Future'`.
  - `participantEmployeeIds`: `[employeeIdsA[2]]` (valid employee belonging to `clientA`).
- **Expected Status Code**: Strictly `400` (`HTTP 400 Bad Request`).
- **Current Behavior**: The endpoint returns `201` (`HTTP 201 Created`), persisting a `TrainingEvent` in year 2099 and updating the employee's `ssmLastTrainingDate` to `2099-01-01` with 26,000+ days remaining. The test then executes lines 464–475, cleaning up the orphan and throwing:
  `AssertionError [ERR_ASSERTION]: VULNERABILITY: Endpoint accepted future training date 2099-01-01 with HTTP 201 instead of rejecting with HTTP 400 validation error.`
- **Expected Error Message**: While the test oracle checks `response.status === 400` in line 478, standard error payloads across the route handler use `{ error: string }`. Domain convention requires:
  `{ error: 'Data instruirii nu poate fi în viitor.' }`.

---

### 1.2 Direct Inspection of `src/app/api/trainings/record/route.ts`
In `src/app/api/trainings/record/route.ts` (lines 35–41):
```typescript
35:     const parsedDate = new Date(eventDate);
36:     if (isNaN(parsedDate.getTime())) {
37:       return NextResponse.json(
38:         { error: 'Data instruirii este invalidă.' },
39:         { status: 400 }
40:       );
41:     }
```
There is zero validation comparing `parsedDate` against the current date/time. Once `!isNaN(parsedDate.getTime())`, the route proceeds to write the record into PostgreSQL.

---

### 1.3 Direct Inspection of `src/components/training-planner-modal.tsx`
In `src/components/training-planner-modal.tsx` (lines 351–357):
```tsx
351:                   <input
352:                     type="date"
353:                     required
354:                     value={eventDate}
355:                     onChange={(e) => setEventDate(e.target.value)}
356:                     className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
357:                   />
```
The date input lacks the `max` attribute. Consequently, users are allowed to pick future dates in the browser datepicker without client-side constraint.

---

### 1.4 Direct Inspection of `scripts/verify-m2-workflows.ts`
In `scripts/verify-m2-workflows.ts`:
- **Current Suite Composition**: 12 tests across 3 sections:
  - Section 1: Client Intake & CAEN Profiling (4 tests)
  - Section 2: Organizational Decisions 01–09 Appointees & Generation (3 tests)
  - Section 3: Training Scheduler & Compliance Auto-Reset (5 tests)
- **Observed Limitation**: In Section 3 (lines 244–429), training recording is tested strictly through direct `prisma.$transaction(...)` invocations (e.g. line 270: `// Execute transaction equivalent to POST /api/trainings/record`).
- **Discrepancy with Header Intent**: The file's top docstring (lines 10–12) states:
  ```typescript
  * 3. Training Scheduler & Atomic Compliance Scadențe Reset (PERIODIC_SSM, PERIODIC_PSI, batch participants)
  * 4. Error Handling & Edge Cases (Duplicate CUI, negative duration, missing participants, mismatched client)
  * 5. Company Compliance Metrics Rollup Recalculation Invariant
  ```
  However, Section 4 ("Error Handling & Edge Cases") was never implemented in `verify-m2-workflows.ts`. It does not test the Next.js API route handler, nor does it test future dates, negative durations, or invalid participant arrays.

---

### 1.5 Empirical Finding: Timezone Boundary Conditions
We conducted empirical Node.js execution to evaluate timezone behavior between UTC and Romanian local time (Bucharest is UTC+2 winter / UTC+3 summer EEST).
- If the server runs in UTC (e.g., standard in containerized deployments or CI) and a user in Bucharest submits a training session completed "today" at 00:15 local time (which corresponds to 22:15 UTC of the preceding day):
  - User's date input: `'2026-11-03'`
  - `new Date('2026-11-03')` evaluates to `2026-11-03T00:00:00.000Z`
  - Server's current UTC time: `2026-11-02T22:15:00.000Z`
  - A naive check `parsedDate.getTime() > Date.now()` evaluates to **TRUE** and would **falsely reject today's legitimate training**!
- Therefore, the boundary check must accommodate local and UTC "end-of-today".

---

## 2. Logic Chain

1. **Regulatory & Domain Rule**: Under Romanian Law 319/2006 (Art. 20) and HG 1425/2006 (Art. 81), individual training sheets (*fișe de instruire individuală SSM*) and verification of knowledge can only be consemnate and signed *after* or *upon* completion of the training. Recording a completed training event in the future is invalid in law and corrupts compliance deadline projections.
2. **Current Defect in Route Handler**: `src/app/api/trainings/record/route.ts` parses `eventDate` using `new Date(eventDate)` but fails to verify that `parsedDate <= now`.
3. **Challenger Harness Detection**: `scripts/verify-m2-challenger2.ts` (Scenario 12) submits `eventDate: '2099-01-01'`. Because no check exists, the database transaction executes, returns HTTP 201 Created, sets `Employee.ssmLastTrainingDate` to 2099-01-01, and fails the test assertion with:
   `VULNERABILITY: Endpoint accepted future training date 2099-01-01 with HTTP 201 instead of rejecting with HTTP 400 validation error.`
4. **Primary Runner Alignment**: `scripts/verify-m2-workflows.ts` was designed to be the primary operational verification runner for M2, but it currently tests raw Prisma transactions rather than route validations. Incorporating an API validation test (including future date rejection) in `verify-m2-workflows.ts`:
   - Closes the gap between stated header requirements and actual implementation.
   - Provides dual-track verification where both `verify-m2-workflows.ts` and `verify-m2-challenger2.ts` enforce future date rejection.
5. **Robust Timezone Oracle**: By defining `maxAllowedTimestamp` as the greater of end-of-today in local server time and end-of-today in UTC (or UTC+14h buffer), the validation safely rejects tomorrow and future years (such as `2099-01-01`) while never falsely rejecting legitimate same-day sessions regardless of server-client timezone skew.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In accordance with the Explorer archetype, this agent did not modify any source code files (`src/app/api/...`, `src/components/...`, or `scripts/...`). The concrete code modifications are formulated below for Worker 2.
2. **Test Oracle Assertion Specificity**: Scenario 12 in `scripts/verify-m2-challenger2.ts` asserts `trackAssertEqual(response.status, 400)`. It does not perform string matching on the JSON body message. However, returning `{ error: 'Data instruirii nu poate fi în viitor.' }` maintains architectural consistency with the other error messages in `route.ts`.
3. **Client-Side vs Server-Side**: Setting `max` in `training-planner-modal.tsx` enhances user experience by disabling future days in the browser calendar, but the canonical enforcement is the server-side check in `route.ts`.

---

## 4. Conclusion & Required Worker 2 Fixes

### 4.1 Required Fix 1: Route Handler Future Date Validation
**File**: `src/app/api/trainings/record/route.ts`  
**Location**: Insert immediately after line 41:

```typescript
    const now = new Date();
    // Allow up to end of today UTC and local timezone to safely accommodate timezone skew (e.g. Europe/Bucharest UTC+2/UTC+3)
    const endOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const endOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
    const maxAllowedTimestamp = Math.max(endOfTodayLocal, endOfTodayUtc);

    if (parsedDate.getTime() > maxAllowedTimestamp) {
      return NextResponse.json(
        { error: 'Data instruirii nu poate fi în viitor.' },
        { status: 400 }
      );
    }
```

### 4.2 Required Fix 2: UI Date Input `max` Constraint
**File**: `src/components/training-planner-modal.tsx`  
**Location**: Line 351:

```tsx
<input
  type="date"
  required
  max={new Date().toISOString().split('T')[0]}
  value={eventDate}
  onChange={(e) => setEventDate(e.target.value)}
  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

### 4.3 Required Fix 3: Primary Runner (`scripts/verify-m2-workflows.ts`) Inclusion
**File**: `scripts/verify-m2-workflows.ts`  
**Action**: Add Section 4 testing the API Route directly using `NextRequest` and `POST`:
- Import `NextRequest` from `next/server` and `{ POST }` from `../src/app/api/trainings/record/route`.
- Add test: `Attempt to record training with future date returns HTTP 400`:
  ```typescript
  await runTest('Attempt to record training with future date returns HTTP 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/trainings/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: createdClientId!,
        trainingType: 'PERIODIC_SSM',
        eventDate: '2099-01-01',
        durationHours: 2,
        instructorName: 'Test Instructor',
        participantEmployeeIds: [testEmployeeId1!],
      }),
    });
    const res = await POST(req);
    assert.equal(res.status, 400, 'Future training date must return HTTP 400');
    const data = await res.json();
    assert.ok(data.error.includes('viitor'), 'Error must mention future date');
  });
  ```
- This elevates `verify-m2-workflows.ts` from 12 to 13 passed tests and achieves complete verification coverage.

---

## 5. Verification Method

Once Worker 2 applies the patches, run the following verification suite commands:

### Step 1: Challenger 2 Suite (Must yield 15/15 passed - 100%)
```bash
npx tsx scripts/verify-m2-challenger2.ts
```
**Success Criteria**:
- Exit code: `0`
- Console output:
  ```
  Total Test Scenarios:   15
  Passed:                 15
  Failed:                 0
  Global Assertions:      76 assertions
  ```
- Scenario 12 status:
  `✓ [PASS] [ADVERSARIAL_EDGE] Attempt to record with future date -> assert validation error (1 asserts)`

### Step 2: Primary M2 Workflows Runner
```bash
npx tsx scripts/verify-m2-workflows.ts
```
**Success Criteria**:
- Exit code: `0`
- Console output:
  `REZULTAT VERIFICARE M2: 13/13 teste trecute` (or `12/12 teste trecute`)

### Step 3: Project Acceptance Gate
```bash
npx tsx scripts/verify-all.ts
```
**Success Criteria**:
- Exit code: `0`
- Pass rate: `100% across all 4 suites` (Suite 1: 25/25, Suite 2: 45/45, Suite 3: 53/53, Suite 4: clean build).

### Step 4: Next.js Production Build
```bash
npm run build
```
**Success Criteria**:
- Exit code: `0`
- Clean Turbopack compilation with 0 TypeScript or build errors.

### Invalidation Conditions
- If `npx tsx scripts/verify-m2-challenger2.ts` reports any failures or fewer than 15 passed scenarios.
- If legitimate same-day training recordings (today UTC or today local) return HTTP 400.
- If `npm run build` fails with type or syntax errors.
