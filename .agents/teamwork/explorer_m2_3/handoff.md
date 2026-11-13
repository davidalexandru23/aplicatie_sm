# Handoff Report: Milestone 2 UI Modals & Generation Filtering Architecture

**Agent**: Explorer M2-3  
**Mission**: Investigation of UI Modals (`src/components/employees/`), UI Integration (`/employees`, `/clients/[id]`), and Document/Batch PLECAT Filtering & Medical Exam Unlocking  
**Target Milestone**: Milestone 2 (M2) — Employee Lifecycle CRUD, Occupational Health & Status PLECAT  
**Recipient**: Sub-Orchestrator M2 (`e92f81d2-28b4-417a-912c-8c83543acb1b`)  
**Date**: 2026-11-11  

---

## 1. Observation

Direct code observations from the workspace:

1. **Absence of Employee Modals Directory**:
   - `ls -la src/components/` returns:
     `caen-selector.tsx`, `client-edit-modal.tsx`, `client-intake-modal.tsx`, `compliance-alerts.tsx`, `compliance-badge.tsx`, `organizational-decisions-card.tsx`, `training-planner-modal.tsx`.
   - The directory `src/components/employees/` does **not exist**.
   - No modal components exist for `RecordMedicalExamModal`, `AddEmployeeModal`, `EditEmployeeModal`, or `TerminateEmployeeModal`.

2. **Employee Registry UI (`src/app/employees/employee-registry-client.tsx`)**:
   - Lines 207–215: The header action strip only contains:
     ```tsx
     <div className="flex items-center gap-2">
       <Link href="/imports/new" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition">
         <span>Import Registru Excel</span>
       </Link>
     </div>
     ```
     No "Adaugă Salariat" button exists.
   - Lines 420–550: Table rows contain no action triggers to record a medical exam, edit an employee, or terminate a contract.
   - Lines 530–547: Document download links ("Onboarding ZIP", "CIM") are rendered unconditionally, even when `emp.status === 'PLECAT'`.
   - Lines 104–120: `tabCounts` counts all employees, including `PLECAT`, into `ALL`. No tab or filter exists for `PLECAT` / past employees.

3. **Client Detail Page (`src/app/clients/[id]/page.tsx`)**:
   - Lines 409–420: Header of Section 6 ("Registru Salariați & Monitorizare Scadențe ({client.employees.length})") has no "Adaugă Salariat" button.
   - Lines 534–565: Employee table rows have links ("Cerere", "Declarație RI", "CIM", "Onboarding ZIP"), but no buttons for recording medical exams, editing employee profiles, or contract termination.
   - The page is an async Server Component; modal components must be client components with self-contained triggers (like `ClientEditModal`).

4. **Document Generation UI (`src/app/documents/generate/page.tsx`)**:
   - Lines 322–326: `fetch('/api/clients/${selectedClientId}/employees')` loads all client employees without filtering out `status === 'PLECAT'`.
   - Lines 85–182: `getEmployeeExpiryInfo()` checks for `med.status === 'OVERDUE'`, but does not check for `employee.status === 'PLECAT'` or `employee.medicalFitnessVerdict === 'INAPT'` / `'INAPT_TEMPORAR'`.
   - Lines 837–852 and 970–1035: In both single and batch mode, employees with `status === 'PLECAT'` are listed and can be selected.
   - When a valid medical exam is recorded (`verdict === 'APT'`, `examDate` within 12 months), `occupationalMedicine.status` becomes `'VALID'`, `isExpired` evaluates to `false`, and `isGenerateDisabled` (line 1371) becomes `false`, unlocking generation.

5. **Batch Generation Route (`src/app/api/documents/generate-batch/route.ts`)**:
   - Lines 127–137:
     ```typescript
     const employees = await prisma.employee.findMany({
       where: {
         id: { in: employeeIds },
         clientId,
       },
       ...
     });
     ```
     Does not filter or validate against `status === 'PLECAT'`.
   - No error is returned when an employee in `employeeIds` is terminated.

6. **Bulk Packages (`src/lib/packages/bulk-packages.ts`)**:
   - Lines 189–196 (`generateCompanyDossierZip`):
     ```typescript
     employees: {
       include: {
         identityDocument: true,
         residenceAddress: true,
         currentJob: true,
         currentWorksite: true,
       },
     },
     ```
     Missing `{ where: { status: { not: 'PLECAT' } } }`.
   - Lines 93–101 (`generateEmployeeOnboardingZip`): No check to reject generating an onboarding zip for a `PLECAT` employee.

7. **Template Resolver (`src/lib/templates/resolver.ts`)**:
   - Line 2362 (`loadResolverContext`):
     ```typescript
     employees: {
       include: {
         identityDocument: true,
         residenceAddress: true,
         currentJob: true,
         currentWorksite: true,
       },
     },
     ```
     Missing `{ where: { status: { not: 'PLECAT' } } }`.
   - Lines 1487 & 1821: `PLACEHOLDER_NUMAR_LUCRATORI` relies on `client.employees.length`, which includes terminated employees if not filtered.

8. **Compliance Engine (`src/lib/compliance.ts`)**:
   - Lines 286–343 (`calculateCompanyMetrics`):
     ```typescript
     const employeeList = Array.isArray(employees) ? employees : [];
     const totalEmployees = employeeList.length;
     ```
     Does not filter out `status === 'PLECAT'`. Overdue items of past employees are counted in company totals.

9. **Existing Baseline Test Suite (`npm test`)**:
   - Executed `npm test` (`npx tsx scripts/verify-all.ts`).
   - Output: 416/416 items passed (Suite 1: 31/31 templates, Suite 2: 45/45 compliance tests, Suite 3: 6/6 Excel tests, Suite 4: 333/333 E2E tests, Suite 5: 1/1 Next.js production build).

---

## 2. Logic Chain

1. **UI Accessibility & Modals**:
   - Romanian labor regulations (HG 355/2007, Legea 319/2006, Ordinul MMSS 2171/2022) require recording medical fitness certificates, managing CIM particulars, and documenting contract terminations.
   - Because `src/components/employees/` does not exist, users have no interactive UI dialogs to perform these statutory operations.
   - Creating self-contained client modals (`RecordMedicalExamModal`, `AddEmployeeModal`, `EditEmployeeModal`, `TerminateEmployeeModal`) with internal trigger buttons enables them to be seamlessly imported into both Next.js Server Components (`src/app/clients/[id]/page.tsx`) and Client Components (`src/app/employees/employee-registry-client.tsx`).

2. **Status PLECAT Segregation**:
   - Terminated employees are no longer active workers; statutory compliance tracking (HG 355/2007 medical visits, Legea 319/2006 periodic training) only applies to active staff.
   - If `calculateCompanyMetrics()` includes `PLECAT` workers, expired visits of former employees artificially lower company compliance scores and trigger false ITM risk warnings.
   - Therefore, `calculateCompanyMetrics()` must filter `employees.filter(e => e.status !== 'PLECAT')`.
   - Similarly, in `employee-registry-client.tsx`, terminated employees must be isolated into a dedicated tab (`Plecați / Arhivă`) so active compliance is uncluttered.

3. **Document & Batch Generation Integrity**:
   - Statutory documents (CIM, Onboarding packages, Training sheets, Company Dossiers) must never be issued for terminated workers as active personnel.
   - In `generate/page.tsx`, `generate-batch/route.ts`, and `bulk-packages.ts`, querying or accepting `status: 'PLECAT'` violates business logic.
   - In `generate-batch/route.ts`, if any target employee is `PLECAT`, the API must reject the request with HTTP 400 and descriptive feedback.
   - In `bulk-packages.ts`, `generateCompanyDossierZip` must strictly query `where: { status: { not: 'PLECAT' } }`, and `generateEmployeeOnboardingZip` must fail if the employee is `PLECAT`.
   - In `resolver.ts`, `loadResolverContext` must query `employees: { where: { status: { not: 'PLECAT' } } }` so `PLACEHOLDER_NUMAR_LUCRATORI` and dynamic fallbacks only reflect active staff.

4. **Medical Exam Unlocking (Feature 9)**:
   - When an employee has an overdue medical exam or is missing an aptitude card, `getEmployeeExpiryInfo()` marks them as `isExpired: true`, disabling generation.
   - Once a statutory medical exam is recorded via `POST /api/employees/[id]/medical-exam`, `medicalLastExamDate` is updated, `medicalFitnessVerdict` is set to `APT`, and `compliance.occupationalMedicine.status` becomes `VALID`.
   - Consequently, `getEmployeeExpiryInfo()` returns `isExpired: false`, and generation is immediately unlocked.

---

## 3. Caveats

1. **Read-Only Scope**:
   - As an explorer agent, no source code files in `src/` were modified. Implementation must be carried out by Worker 1 and Worker 2.
2. **Database Migrations**:
   - The Prisma schema already includes all required fields on `Employee` (`medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes`, `cimNumber`, `grossSalary`, `shoeSize`, etc.) and `AuditEvent`. No new schema migration is required.
3. **GDPR Masking**:
   - CNP masking (`maskCNP`) must be respected in table views; modals should allow CNP entry for new employees while preserving audit logging via `AuditEvent`.

---

## 4. Conclusion

The exact architecture and file-by-file integration plan for Milestone 2 UI components, modals, and generation filtering is fully detailed:

1. **4 New Modals** in `src/components/employees/`:
   - `record-medical-exam-modal.tsx`: HG 355/2007 Aptitude Card (date, 6/12/24 mo, verdict APT/APT_CONDITIONAT/INAPT, restrictions, clinic, doctor).
   - `add-employee-modal.tsx`: Manual Employee Creation (4 tabs: Identity, CIM Contract, ID/Address, SSM/EIP).
   - `edit-employee-modal.tsx`: Full Employee Profile Update.
   - `terminate-employee-modal.tsx`: Contract Termination (`status: "PLECAT"`, `leaveDate`, reason).
   - `index.ts`: Barrel export.
2. **UI Integration in Employee Registry**:
   - `src/app/employees/page.tsx`: Fetch client jobs/worksites for the Add modal, include employee health fields.
   - `src/app/employees/employee-registry-client.tsx`: "Adaugă Salariat" header button, "Plecați" tab (excluding PLECAT from active tabs), row action buttons, disabling generation for PLECAT.
3. **UI Integration in Client Detail Page**:
   - `src/app/clients/[id]/page.tsx`: "Adaugă Salariat" in Section 6 header, inline triggers for Exam/Edit/Terminate modals.
4. **Generation & Batch Filtering**:
   - `src/app/documents/generate/page.tsx`: Exclude PLECAT from dropdown & batch list, block on INAPT verdict, unlock on valid exam.
   - `src/app/api/documents/generate-batch/route.ts`: Reject batch requests containing `status === 'PLECAT'`.
   - `src/lib/packages/bulk-packages.ts`: `{ where: { status: { not: 'PLECAT' } } }` on company dossier, guard onboarding zip.
   - `src/lib/templates/resolver.ts`: `{ where: { status: { not: 'PLECAT' } } }` on `loadResolverContext` employees.
   - `src/lib/compliance.ts`: Filter `status !== 'PLECAT'` in `calculateCompanyMetrics`.
   - `src/app/api/clients/[id]/employees/route.ts`: Default filter `{ status: { not: 'PLECAT' } }`.

---

## 5. Verification Method

1. **Component Existence & Compilation**:
   - Verify `src/components/employees/` contains the 4 modal files and `index.ts`.
   - Run `npm run build` to verify clean compilation without TypeScript errors.
2. **PLECAT Exclusion Verification**:
   - In `scripts/verify-compliance.ts`, verify that an employee with `status: 'PLECAT'` and overdue dates does not alter `calculateCompanyMetrics()` output.
   - Run batch generation test (`scripts/test-batch-generation-compliance.ts`) with a `status: 'PLECAT'` employee ID and verify HTTP 400 rejection.
3. **Full Project Test Suite**:
   - Run `npm test` (`npx tsx scripts/verify-all.ts`) to ensure all 5 acceptance suites pass 100%.
