## 2026-11-10T22:42:30Z
You are Explorer 3 for Milestone 2 (M2): Employee Lifecycle CRUD, Occupational Health & Status PLECAT.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_explorer_m2_3
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2/SCOPE.md
Project document: /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md

MANDATORY FIRST STEP:
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md before starting your technical exploration.

YOUR SPECIFIC FOCUS:
Features 9, 10, 11, 12, and 13: UI Modals Subsystem & Strict Exclusion of Status PLECAT.
1. Inspect UI pages and components:
   - `src/app/employees/page.tsx` and `src/app/employees/employee-registry-client.tsx`
   - `src/app/clients/[id]/page.tsx`
   - `src/app/documents/generate/page.tsx`
2. Design the 4 UI Modals (in `src/components/employees/`):
   - `RecordMedicalExamModal`: Form for exam date, interval (months), verdict (`APT`, `APT_CONDITIONAT`, `INAPT_TEMPORAR`, `INAPT`), medical restrictions, clinic/doctor. Calls `POST /api/employees/[id]/medical-exam`, triggers state refresh, shows success toast/notification.
   - `AddEmployeeModal`: Clean multi-section modal for creating a new employee without Excel. Covers identification (name, CNP, sex, birth date/place), assignment (job, worksite), contract/statutory (hire date, CIM number/date, gross salary, work norm, probation, leave days, IBAN), ID document, residence address, and EIP sizes. Calls `POST /api/employees`.
   - `EditEmployeeModal`: Pre-fills existing employee data, allows editing all statutory fields, calls `PUT /api/employees/[id]`.
   - `TerminateEmployeeModal`: Confirmation modal to record termination (`leaveDate`, notes/reason), calls `POST /api/employees/[id]/terminate`.
3. Plan integration of these modals and trigger action buttons:
   - In `src/app/employees/employee-registry-client.tsx`: Header button "Adaugă Salariat" + Row action buttons (Edit, Medical Exam, Terminate).
   - In `src/app/clients/[id]/page.tsx`: "Adaugă Salariat" button on employee card/table header + Row action buttons.
4. Exhaustively audit and locate every place where `status === 'PLECAT'` must be excluded:
   - `src/lib/compliance.ts` (`calculateCompanyMetrics` must ignore `PLECAT` employees so terminated workers don't drag down active scores).
   - `src/app/employees/page.tsx` (metrics calculated only on active employees; registry client should show active employees or have a distinct tab/filter for "Plecați").
   - `src/app/api/clients/[id]/employees/route.ts` (default returns active employees, support `?includeTerminated=true`).
   - `src/app/documents/generate/page.tsx` (employee dropdown selector must not display `PLECAT` employees).
   - `src/app/api/documents/generate-batch/route.ts` (reject batch generation for `PLECAT` employees or exclude them).
   - `src/lib/packages/bulk-packages.ts` (`generateClientDossierZip` must exclude `PLECAT` employees).
   - `src/lib/templates/resolver.ts` (any employee fallback in `loadResolverContext` must use active employees only).
5. Write your detailed technical specifications, exact UI component designs, and filtering lines to `.agents/teamwork/teamwork_explorer_m2_3/report.md` and complete handoff at `.agents/teamwork/teamwork_explorer_m2_3/handoff.md`.
Communicate back to orchestrator via send_message when done.
