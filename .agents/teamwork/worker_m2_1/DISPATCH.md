# Dispatch for Worker M2 (teamwork_worker)

## Mission
Implement Milestone 2 (M2): Employee Lifecycle CRUD, Occupational Health & Status PLECAT (Features 7, 8, 9, 10, 11, 12, 13).

## Working Directory
`/Users/davidalexandru/Documents/Proiect_SSM`

## State Folder
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/worker_m2_1`

## Mandatory Documents to Read First
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md`
4. Explorer 1 Findings: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_1/analysis.md` and `handoff.md`
5. Explorer 2 Findings: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2/analysis.md` and `handoff.md`
6. Explorer 3 Findings: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_3/analysis.md` and `handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership (M2 Scope)
- `src/app/api/employees/route.ts` (NEW - Feature 10)
- `src/app/api/employees/[id]/route.ts` (NEW - Feature 11)
- `src/app/api/employees/[id]/medical-exam/route.ts` (NEW - Features 7, 8)
- `src/app/api/employees/[id]/terminate/route.ts` (NEW - Feature 12)
- `src/app/api/clients/[id]/employees/route.ts` (UPDATE - Feature 13)
- `src/lib/compliance.ts` (UPDATE - Features 8, 13)
- `src/components/employees/` (NEW directory and modals - Features 7, 10, 11, 12)
  - `record-medical-exam-modal.tsx`
  - `add-employee-modal.tsx`
  - `edit-employee-modal.tsx`
  - `terminate-employee-modal.tsx`
  - `index.ts`
- `src/app/employees/page.tsx` & `src/app/employees/employee-registry-client.tsx` (UPDATE - Features 7, 10, 11, 12, 13)
- `src/app/clients/[id]/page.tsx` (UPDATE - Features 7, 10, 11, 12)
- `src/app/documents/generate/page.tsx` (UPDATE - Features 9, 13)
- `src/app/api/documents/generate-batch/route.ts` (UPDATE - Feature 13)
- `src/lib/packages/bulk-packages.ts` (UPDATE - Feature 13)
- `src/lib/templates/resolver.ts` (UPDATE - Feature 13)

## Specific Implementation Requirements
1. Feature 7 & 8: Occupational Health
   - Create `src/app/api/employees/[id]/medical-exam/route.ts` (POST)
   - Input: `{ examDate, intervalMonths, verdict, restrictions, clinicName, doctorName }`
   - Updates `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes`
   - IMPORTANT: Creates `AuditEvent` with `action: 'MEDICAL_EXAM_RECORDED'`, `entityType: 'Employee'`, `entityId: id` (matches test assertion in `scripts/e2e-tier1-features.ts:686` and `740`)
   - Returns `{ success: true, employee, compliance }`
2. Feature 10: Manual Employee Creation
   - Create `src/app/api/employees/route.ts` (POST)
   - Supports statutory fields: CIM number & date, gross salary, work norm, probation days, annual leave days, IBAN, bank name, blood type, Rh, qualification, commute, EIP sizes, Identity document, Residence address.
   - Runs in `prisma.$transaction`.
   - Pre-checks `clientId_cnp` uniqueness (returns 409 on conflict).
   - Creates `EmploymentHistory` entry (`validFrom: hireDate`).
   - Logs `AuditEvent` (sanitized, no CNP in details).
3. Feature 11: Employee Profile Retrieval & Update
   - Create `src/app/api/employees/[id]/route.ts`:
     - GET: Returns employee with `identityDocument`, `residenceAddress`, `currentJob`, `currentWorksite`, `client`, `employmentHistory`, and `compliance`.
     - PUT: Full statutory update, upserts `identityDocument` and `residenceAddress`, updates `employmentHistory` if job/worksite changed, logs `AuditEvent`.
4. Feature 12: Employee Termination
   - Create `src/app/api/employees/[id]/terminate/route.ts` (POST)
   - Validates `leaveDate >= hireDate`.
   - Sets `status: "PLECAT"`, `leaveDate`, notes.
   - Closes open `EmploymentHistory` record (`validTo: leaveDate`).
   - Logs `AuditEvent`.
5. Feature 13: Strict Status PLECAT Exclusion
   - `src/lib/compliance.ts`: In `calculateCompanyMetrics`, strictly filter `employees.filter(e => e.status !== 'PLECAT')`. Protect against zero active employees (return 100% score, 0 totals, no NaN). In `calculateEmployeeCompliance`, expose `isTerminated`.
   - `src/app/api/clients/[id]/employees/route.ts`: Filter `status: { not: 'PLECAT' }` by default; support `?includeTerminated=true` or `?status=ALL|ACTIV|PLECAT`.
   - `src/app/documents/generate/page.tsx`: Filter out `status === 'PLECAT'` from selection dropdowns. Block generation on INAPT.
   - Feature 9: In `src/app/documents/generate/page.tsx`, when valid medical exam is recorded (`verdict: 'APT'`), ensure `occupationalMedicine.status === 'VALID'` unlocks generation.
   - `src/app/api/documents/generate-batch/route.ts`: Validate that no requested employee ID has `status === 'PLECAT'`; reject with 400 if any is PLECAT.
   - `src/lib/packages/bulk-packages.ts`: Ensure `generateCompanyDossierZip` queries `where: { status: { not: 'PLECAT' } }`, and `generateEmployeeOnboardingZip` guards against PLECAT.
   - `src/lib/templates/resolver.ts`: In `loadResolverContext`, query `employees: { where: { status: { not: 'PLECAT' } } }` for active worker counts.
6. UI Components & Modals
   - Create `src/components/employees/`:
     - `record-medical-exam-modal.tsx`
     - `add-employee-modal.tsx`
     - `edit-employee-modal.tsx`
     - `terminate-employee-modal.tsx`
     - `index.ts`
   - Update `src/app/employees/page.tsx` & `employee-registry-client.tsx`:
     - Add "Adaugă Salariat" header button.
     - Row action buttons: Exam, Edit, Terminate.
     - Dedicated "Plecați / Arhivă" tab; exclude PLECAT from active compliance counts.
     - Disable generation links for PLECAT employees.
   - Update `src/app/clients/[id]/page.tsx`:
     - Add "Adaugă Salariat" button in Section 6 header.
     - Action buttons in employee table for Exam, Edit, Terminate.

## Verification Required
1. Run `npx prisma validate`
2. Run `npm run build`
3. Run `npm test` (`npx tsx scripts/verify-all.ts`)
4. Verify that all 416 tests pass with 0 failures.
