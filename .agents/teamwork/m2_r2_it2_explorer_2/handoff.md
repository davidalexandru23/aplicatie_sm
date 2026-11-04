# Handoff Report: UI Date Boundary Enforcement & Validation Analysis

**Agent**: `m2_r2_it2_explorer_2` (Teamwork Explorer / Investigator / Synthesizer)  
**Parent Agent ID**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`  
**Milestone**: M2 Iteration 2 (SSM Operational Workflows UI & Training Scheduler)  
**Date**: 2026-11-02  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_it2_explorer_2/`  
**Handoff Type**: Hard  

---

## 1. Observation

### 1.1 Direct Source Code Inspection

#### A. Training Planner Modal (`src/components/training-planner-modal.tsx`)
- **Initial State Setup (Lines 108–110)**:
  ```typescript
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  ```
- **Input Render (Lines 351–357)**:
  ```tsx
  <input
    type="date"
    required
    value={eventDate}
    onChange={(e) => setEventDate(e.target.value)}
    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  ```
- **Form Submission Handler (`handleSubmit`, Lines 159–182)**:
  ```typescript
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedClientId) {
      setErrorMessage('Trebuie să selectați o firmă client.');
      setIsSubmitting(false);
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      setErrorMessage('Trebuie să selectați cel puțin un salariat participant.');
      setIsSubmitting(false);
      return;
    }

    if (!instructorName.trim()) {
      setErrorMessage('Numele instructorului este obligatoriu.');
      setIsSubmitting(false);
      return;
    }
  ```
- **Observed Gaps**:
  1. The `<input type="date">` element has **no `max` attribute**. The native calendar picker allows users to navigate and pick any arbitrary date in the future (e.g. `2099-01-01`).
  2. If a user manually types or pastes a future date, there is **zero immediate visual feedback**: no red border indicator, no warning caption, and the submit button remains enabled.
  3. `handleSubmit` does not perform client-side boundary checking on `eventDate`. It immediately dispatches the unvalidated future date payload to `POST /api/trainings/record`.

---

#### B. Timezone Empirical Discrepancy: `toISOString().split('T')[0]` vs. Local Time
I performed an empirical evaluation of date string formatting in the active runtime:
```bash
node -e "console.log('ISO:', new Date().toISOString().split('T')[0], 'Local en-CA:', new Date().toLocaleDateString('en-CA'))"
```
**Empirical Output**:
```
ISO: 2026-11-02 Local en-CA: 2026-11-03
```
- **Analysis**:
  - In Romania (EET = UTC+2, EEST = UTC+3), between 00:00 and 02:00/03:00 local time, `new Date().toISOString()` reports the **previous calendar day** in UTC (`2026-11-02`), while local calendar time is already `2026-11-03`.
  - If `<input max={new Date().toISOString().split('T')[0]}>` is used naively, a Romanian user working past midnight will be **blocked by the browser from picking "today"** because today (`2026-11-03`) is greater than the UTC `max` (`2026-11-02`).
  - Formatting using the client's local calendar (via `new Date().toLocaleDateString('en-CA')` or standard `getFullYear()` / `padStart` construction) resolves this trap cleanly.

---

#### C. Full Codebase Audit of Other Date & Year Inputs

An exhaustive project-wide grep search for `type="date"` and date/year inputs across `src/` revealed two additional components requiring boundary enforcement:

1. **Organizational Decisions Card (`src/components/organizational-decisions-card.tsx`)**:
   - **Line 64**:
     ```typescript
     decisionsDate: initialData.decisionsDate || new Date().toISOString().split('T')[0],
     ```
   - **Lines 356–362**:
     ```tsx
     <input
       type="date"
       value={form.decisionsDate}
       onChange={(e) => setForm({ ...form, decisionsDate: e.target.value })}
       className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
       required
     />
     ```
   - **Observation**:
     - `decisionsDate` represents the emission date of statutory decisions (Deciziile 01–09: Lucrător desemnat, Prim ajutor, PSI, Comisie cercetare).
     - It has **no `max` attribute** and **no client-side validation**.
     - Selecting a future date causes all 9 legal decisions to be generated with a future date (e.g. `01.01.2099`), producing legally defective documentation under Legea 319/2006.

2. **Client Intake & Client Edit Modals (`src/components/client-intake-modal.tsx` & `src/components/client-edit-modal.tsx`)**:
   - **`client-intake-modal.tsx` (Lines 181–189)**:
     ```tsx
     <input
       type="number"
       placeholder="Ex: 2022"
       min="1900"
       max="2099"
       value={formData.foundedYear}
       onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
       className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
     />
     ```
   - **`client-edit-modal.tsx` (Lines 230–238)**:
     ```tsx
     <input
       type="number"
       placeholder="Ex: 2022"
       min="1900"
       max="2099"
       value={formData.foundedYear}
       onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
       className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
     />
     ```
   - **Observation**:
     - Both modals hardcode `max="2099"` for `foundedYear`.
     - A company cannot be founded in 2099. Setting a future year corrupts company profile metadata and downstream document generation.

---

### 1.2 Empirical Reproduction of Adversarial Challenger Test

Command executed:
```bash
npx tsx scripts/verify-m2-challenger2.ts
```
**Verbatim Output for Scenario 12**:
```
✗ [FAIL] [ADVERSARIAL_EDGE] Attempt to record with future date -> assert validation error (1 asserts, 11ms)
   Error: VULNERABILITY: Endpoint accepted future training date 2099-01-01 with HTTP 201 instead of rejecting with HTTP 400 validation error.
```
- Total Scenarios: **15** | Passed: **14** | Failed: **1**
- The endpoint `POST /api/trainings/record` accepted `2099-01-01`, created a `TrainingEvent` in 2099, updated `Employee.ssmLastTrainingDate` to `2099-01-01`, and reset the employee's compliance status to `VALID` with over 26,000 days remaining.

---

## 2. Logic Chain

1. **Domain Context (Legea 319/2006, HG 1425/2006, OMAI 712/2005)**:
   - In Romanian SSM operations, recording an event via `POST /api/trainings/record` is the formal act of consemnare in the employee training sheet ("fișă de instruire individuală").
   - By statutory definition, training consemnare certifies that verification of practical knowledge and assimilation occurred. A completed session cannot take place on a future date.
   - Similarly, employer organizational decisions (Decizii 01–09) are signed administrative instruments that take effect upon or prior to issuance; an employer cannot formally emit and sign decisions dated in the future.

2. **Defense-in-Depth Architecture**:
   To ensure resilience against both accidental user error and malicious payload submission, boundary validation must be applied across four coordinated layers:
   - **Layer 1: Native HTML5 Boundary (`max={todayStr}`)**: Disables future dates in the browser date picker UI.
   - **Layer 2: Reactive Client-Side Validation Feedback**: Immediate visual cues (rose border, alert icon, explanatory message) when a user manually inputs or pastes a date `> todayStr`.
   - **Layer 3: Client-Side Form Submission Guard**: `handleSubmit` prevents network requests for future dates and displays an explicit banner error.
   - **Layer 4: Server-Side API Enforcement**: Endpoint rejects payloads where `parsedDate > endOfToday` with HTTP 400.

3. **Timezone Resilience Logic**:
   - Romanian users operate in UTC+2 (winter) or UTC+3 (summer).
   - `new Date().toISOString().split('T')[0]` relies on UTC, which lags behind local Romanian time by 2–3 hours.
   - Using `new Date().toLocaleDateString('en-CA')` (or equivalent local year-month-day construction) guarantees that the browser `max` matches the user's actual calendar date.
   - On the backend, allowing dates up to `endOfToday` (23:59:59.999 local/server time) prevents false rejection of legitimate same-day sessions submitted across timezone edges.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In strict accordance with the Teamwork Explorer archetype instructions ("Read-only investigation — do NOT implement"), I have not modified the source files. The exact before/after implementations are provided below for the implementer worker.
2. **Historical Trainings Allowance**: Romanian SSM permits recording historical past trainings (e.g. consemnarea retroactive a unei instruiri efectuate acum 2 săptămâni pentru a aduce registrul la zi). Therefore, **no `min` date constraint** should be placed on `eventDate` in `training-planner-modal.tsx`, other than ensuring the date is valid.
3. **Decisions Historical Context**: Companies often adopt organizational decisions at the time of founding or at the start of an SSM consulting contract. Therefore, `decisionsDate` should allow past dates (optionally bounded by `foundedYear`), but must not allow future dates.

---

## 4. Conclusion & Recommended Exact Fixes

### A. Fix for `src/components/training-planner-modal.tsx`

#### 1. Add Local Today Helper & Validation State
In `src/components/training-planner-modal.tsx`:
```tsx
// Local timezone date string (YYYY-MM-DD) avoiding UTC midnight shift
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```
Inside component:
```tsx
const todayStr = getTodayStr();
const isFutureDate = Boolean(eventDate && eventDate > todayStr);
```

#### 2. Update Form Submission Guard (`handleSubmit`)
Lines 164–182:
```tsx
    if (!selectedClientId) {
      setErrorMessage('Trebuie să selectați o firmă client.');
      setIsSubmitting(false);
      return;
    }

    if (!eventDate) {
      setErrorMessage('Data efectuării instruirii este obligatorie.');
      setIsSubmitting(false);
      return;
    }

    if (eventDate > todayStr) {
      setErrorMessage('Data instruirii nu poate fi în viitor. Consemnarea instruirii atestă efectuarea verificării practice a cunoștințelor.');
      setIsSubmitting(false);
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      setErrorMessage('Trebuie să selectați cel puțin un salariat participant.');
      setIsSubmitting(false);
      return;
    }

    if (!instructorName.trim()) {
      setErrorMessage('Numele instructorului este obligatoriu.');
      setIsSubmitting(false);
      return;
    }
```

#### 3. Update Input JSX with `max` and Reactive Visual Feedback
Replace Lines 347–358 with:
```tsx
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Data Efectuării *
                    </label>
                    {isFutureDate && (
                      <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        Dată în viitor
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    max={todayStr}
                    value={eventDate}
                    onChange={(e) => {
                      setEventDate(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                      isFutureDate
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30 text-rose-900 ring-1 ring-rose-300'
                        : 'border-slate-300 focus:ring-blue-500 bg-white'
                    }`}
                  />
                  {isFutureDate && (
                    <p className="text-[10px] text-rose-600 mt-1 flex items-start gap-1 font-medium leading-tight">
                      <span>Data instruirii nu poate fi ulterioară datei curente ({todayStr}).</span>
                    </p>
                  )}
                </div>
```

#### 4. Update Modal Submit Button
Disable button when `isFutureDate` is true:
```tsx
<button
  type="submit"
  disabled={isSubmitting || isFutureDate || selectedEmployeeIds.length === 0}
  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
>
```

---

### B. Fix for `src/components/organizational-decisions-card.tsx`

#### 1. Add Today Helper & Derived Flag
Lines 64–75:
```tsx
const todayStr = (() => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
})();

const isFutureDecisionsDate = Boolean(form.decisionsDate && form.decisionsDate > todayStr);
```

#### 2. Add Guard in `handleSave` and `handleGenerate`
```tsx
const handleSave = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (isFutureDecisionsDate) {
    setErrorMessage('Data emiterii deciziilor nu poate fi în viitor.');
    return;
  }
  ...
```

#### 3. Update Input JSX with `max` and Warning Message
Replace Lines 352–363 with:
```tsx
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Data Emiterii Deciziilor *
                  </label>
                  {isFutureDecisionsDate && (
                    <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      Dată în viitor
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  max={todayStr}
                  value={form.decisionsDate}
                  onChange={(e) => {
                    setForm({ ...form, decisionsDate: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`w-full text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition ${
                    isFutureDecisionsDate
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30 text-rose-900 ring-1 ring-rose-300'
                      : 'border-slate-300 focus:ring-indigo-500 bg-white'
                  }`}
                  required
                />
                {isFutureDecisionsDate && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium text-[10px]">
                    Data emiterii deciziilor angajatorului nu poate fi în viitor.
                  </p>
                )}
              </div>
```

---

### C. Fix for `client-intake-modal.tsx` and `client-edit-modal.tsx`

Replace hardcoded `max="2099"` with dynamic current year:
```tsx
<input
  type="number"
  placeholder="Ex: 2022"
  min="1900"
  max={new Date().getFullYear()}
  value={formData.foundedYear}
  onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```
And in `handleSubmit`:
```tsx
if (formData.foundedYear) {
  const yr = parseInt(formData.foundedYear, 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(yr) || yr < 1900 || yr > currentYear) {
    setErrorMessage(`Anul înființării trebuie să fie între 1900 și ${currentYear}.`);
    setIsSubmitting(false);
    return;
  }
}
```

---

### D. Backend API Harmonization: `src/app/api/trainings/record/route.ts`

Lines 41–42:
```typescript
    const now = new Date();
    // Allow up to end of today UTC/local to accommodate timezone differences
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (parsedDate.getTime() > endOfToday.getTime()) {
      return NextResponse.json(
        { error: 'Data instruirii nu poate fi în viitor.' },
        { status: 400 }
      );
    }
```

---

## 5. Verification Method

Once the implementer applies the recommended changes, verify with the following commands:

1. **Adversarial Stress Test Suite**:
   ```bash
   npx tsx scripts/verify-m2-challenger2.ts
   ```
   - **Expected Outcome**: **15/15 test scenarios pass (100%)**, 0 failures. Scenario 12 cleanly asserts HTTP 400 validation rejection for `eventDate: '2099-01-01'`.

2. **Workflows Verification Suite**:
   ```bash
   npx tsx scripts/verify-m2-workflows.ts
   ```
   - **Expected Outcome**: **12/12 tests pass** (exit code 0).

3. **Unified Acceptance Verification Gate**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   - **Expected Outcome**: **124/124 checks pass across all 4 suites** (100%).

4. **Production TypeScript Build**:
   ```bash
   npm run build
   ```
   - **Expected Outcome**: Clean Turbopack compilation with 0 TypeScript or lint errors.
