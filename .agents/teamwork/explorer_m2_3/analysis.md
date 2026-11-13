# Detailed Investigation & Architecture Analysis: Milestone 2 UI & Generation Components

**Mission Focus**: Features 7, 9, 10, 11, 12, 13 (UI Components, Modals, Document & Batch Generation Filtering, Status PLECAT Exclusion)  
**Author**: Explorer M2-3  
**Date**: 2026-11-11  
**Project**: Remedieri Sistem Statutar SSM / Igienă / HR  
**Workspace**: `/Users/davidalexandru/Documents/Proiect_SSM`  

---

## Executive Summary

Milestone 2 operationalizes employee lifecycle CRUD, statutory occupational health compliance (HG 355/2007), and exhaustive exclusion of terminated employees (`status === 'PLECAT'`) across all UI views, document generation flows, batch generation, and bulk zip packages.

Our read-only investigation systematically examined the existing UI architecture, document generation workflows, batch APIs, bulk packages, and compliance calculation mechanisms. We identified concrete gaps and formulated a file-by-file integration blueprint for the implementation team.

### Primary Discoveries & Gaps Identified

1. **Missing UI Modal Components (`src/components/employees/`)**:
   - The directory `src/components/employees/` does NOT exist yet.
   - Four dedicated modals need to be created:
     1. `record-medical-exam-modal.tsx` (`RecordMedicalExamModal`): Recording statutory medical exam (HG 355/2007) with date, periodicity (6, 12, 24 mo), verdict (`APT`, `APT_CONDITIONAT`, `INAPT_TEMPORAR`, `INAPT`), restrictions/notes, clinic & doctor name.
     2. `add-employee-modal.tsx` (`AddEmployeeModal`): Complete manual employee creation without Excel, capturing 4 tabs: Identity & Personal, Job & CIM Contract, ID Document & Residence Address, and SSM & EIP sizes.
     3. `edit-employee-modal.tsx` (`EditEmployeeModal`): Full update of employee statutory fields and relations.
     4. `terminate-employee-modal.tsx` (`TerminateEmployeeModal`): Confirmation dialog for contract termination setting `status: "PLECAT"`, `leaveDate`, and statutory reason.
     5. `index.ts`: Barrel export.

2. **UI Integration in Employee Registry (`src/app/employees/`)**:
   - `src/app/employees/employee-registry-client.tsx` currently only contains an "Import Registru Excel" button. It lacks the "Adaugă Salariat" action.
   - The employee table currently displays no action triggers for recording medical exams, editing employee data, or terminating contracts.
   - Status tabs (`ALL`, `VALID`, `UPCOMING`, `OVERDUE`, `MISSING`) count all employees (including terminated ones). Terminated employees are not segregated into their own tab (`Plecați`), dragging down compliance metrics.
   - For employees with `status: 'PLECAT'`, document generation links ("Onboarding ZIP", "CIM") are still active, violating business logic.

3. **UI Integration in Client Detail Page (`src/app/clients/[id]/page.tsx`)**:
   - The page is a Next.js Server Component. It lists employees in a statutory table, but has no triggers for Add/Edit/Exam/Terminate modals.
   - The modals must be self-contained client components (following the pattern of `ClientEditModal` in `src/components/client-edit-modal.tsx`) so they can be embedded directly into Server Components without requiring the entire page to become a client component.

4. **Generation Unlocking & Medical Expiry (`src/app/documents/generate/page.tsx`)**:
   - `getEmployeeExpiryInfo()` checks for `med.status === 'OVERDUE'`, but does not check for `medicalFitnessVerdict === 'INAPT'` or `'INAPT_TEMPORAR'`.
   - An employee with `status === 'PLECAT'` is NOT currently blocked from the single employee dropdown or the batch selection checklist.
   - When a valid medical exam is recorded (`POST /api/employees/[id]/medical-exam`), `medicalLastExamDate` is updated, `medicalFitnessVerdict` becomes `APT`, `occupationalMedicine.status` becomes `VALID`, and `getEmployeeExpiryInfo()` returns `isExpired: false`, unlocking generation (Feature 9).

5. **Batch Generation Filtering (`src/app/api/documents/generate-batch/route.ts`)**:
   - `POST /api/documents/generate-batch` queries employees by ID without checking `status !== 'PLECAT'`.
   - It lacks rejection logic when a client attempts to batch-generate documents for terminated employees.

6. **Bulk Packages Exclusion (`src/lib/packages/bulk-packages.ts`)**:
   - `generateCompanyDossierZip` queries `client.employees` without filtering `{ where: { status: { not: 'PLECAT' } } }`.
   - `generateEmployeeOnboardingZip` does not check if the target employee has `status === 'PLECAT'`.

7. **Template Resolver Context (`src/lib/templates/resolver.ts`)**:
   - In `loadResolverContext`, `client.employees` is queried without `{ where: { status: { not: 'PLECAT' } } }`. This causes `PLACEHOLDER_NUMAR_LUCRATORI` and dynamic hygiene participant fallbacks to include terminated employees.

8. **Company Metrics Rollup (`src/lib/compliance.ts`)**:
   - `calculateCompanyMetrics(employees)` currently iterates over all items in the array without filtering out `status === 'PLECAT'`. This causes overdue alerts for past employees to contaminate company compliance scores.

9. **Client Employees API (`src/app/api/clients/[id]/employees/route.ts`)**:
   - Queries `where: { clientId: id }` without checking `status !== 'PLECAT'`. It must filter out `PLECAT` by default and only include them if `?includeTerminated=true` is provided.

---

## Detailed Investigation Findings

### 1. UI Components Analysis

#### 1.1 `src/app/employees/page.tsx`
- **Current Behavior**:
  - Fetches `employeesRaw` from `prisma.employee.findMany` with relations: `client`, `currentJob`, `currentWorksite`, `identityDocument`.
  - Calculates metrics via `calculateCompanyMetrics(employeesRaw)`.
  - Maps to `EmployeeWithCompliance`.
  - Fetches `clients` via `prisma.client.findMany`.
- **Required Enhancements**:
  - In `prisma.client.findMany`, select `id, name, jobs: { select: { id: true, title: true } }, worksites: { select: { id: true, name: true } }` so `AddEmployeeModal` can immediately populate post and worksite dropdowns when a client is selected.
  - In `prisma.employee.findMany`, include `medicalLastExamDate, medicalIntervalMonths, medicalFitnessVerdict, medicalNotes, leaveDate, status` so row actions can display up-to-date statuses and pass them to modals without secondary fetches.
  - In `EmployeeWithCompliance` interface, expose `leaveDate`, `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes`.

#### 1.2 `src/app/employees/employee-registry-client.tsx`
- **Current Behavior**:
  - Client component managing tabs (`ALL`, `VALID`, `UPCOMING`, `OVERDUE`, `MISSING`), search filter, client dropdown.
  - Action header (line 207-215) only has "Import Registru Excel".
  - Table rows only have "Onboarding ZIP" and "CIM" links.
- **Required Enhancements**:
  1. **Header Action**:
     - Insert `<AddEmployeeModal clients={clients} triggerClassName="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition" triggerText="Adaugă Salariat" />` next to "Import Registru Excel".
  2. **Tabs & KPI Counters**:
     - Add `type TabType = 'ALL' | 'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING' | 'PLECAT';`
     - Tab counters:
       - `tabCounts.ALL = employees.filter(e => e.status !== 'PLECAT').length`
       - `tabCounts.VALID = employees.filter(e => e.status !== 'PLECAT' && e.compliance.overallStatus === 'VALID').length`
       - `tabCounts.UPCOMING = employees.filter(e => e.status !== 'PLECAT' && e.compliance.overallStatus === 'UPCOMING').length`
       - `tabCounts.OVERDUE = employees.filter(e => e.status !== 'PLECAT' && e.compliance.overallStatus === 'OVERDUE').length`
       - `tabCounts.MISSING = employees.filter(e => e.status !== 'PLECAT' && e.compliance.overallStatus === 'MISSING').length`
       - `tabCounts.PLECAT = employees.filter(e => e.status === 'PLECAT').length`
     - Render 6th tab:
       `<button onClick={() => handleTabChange('PLECAT')} className={activeTab === 'PLECAT' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}>Plecați / Arhivă ({tabCounts.PLECAT})</button>`
     - In `filteredEmployees`:
       - If `activeTab === 'PLECAT'`, match only `emp.status === 'PLECAT'`.
       - If `activeTab !== 'PLECAT'`, match only `emp.status !== 'PLECAT'` AND check `activeTab`.
  3. **Table Columns & Row Actions**:
     - In the table header, add/update the action column: `Acțiuni & Documente`.
     - In table rows for active employees:
       - `<RecordMedicalExamModal employee={emp} />` (Stethoscope icon, title "Înregistrează Fișă Aptitudine HG 355/2007")
       - `<EditEmployeeModal employeeId={emp.id} employeeName={emp.fullName} jobs={...} worksites={...} />` (Edit icon, title "Editează Date Salariat")
       - `<TerminateEmployeeModal employee={emp} />` (UserMinus icon, title "Încetare Contract CIM")
       - Retain "Onboarding ZIP" and "CIM" links.
     - In table rows for terminated employees (`emp.status === 'PLECAT'`):
       - Show termination date badge: `PLECAT: ${formatRoDate(emp.leaveDate)}` (bg-rose-50 border-rose-200 text-rose-700).
       - Disable or hide "Onboarding ZIP" and "CIM" links (with tooltip: "Contract de muncă încetat").
       - Render `<EditEmployeeModal employeeId={emp.id} employeeName={emp.fullName} />` (allowing data correction/inspection).
       - Omit `<TerminateEmployeeModal />` (already terminated).

#### 1.3 `src/app/clients/[id]/page.tsx`
- **Current Behavior**:
  - Server Component rendering client details, KPI metrics, `ClientEditModal`, `OrganizationalDecisionsCard`, and employee table.
  - Employee table only has links for "Cerere", "Declarație RI", "CIM", "Onboarding ZIP".
- **Required Enhancements**:
  1. **Section Header (lines 409-419)**:
     - Add `<AddEmployeeModal clientId={client.id} jobs={client.jobs} worksites={client.worksites} />` inside the header action cluster.
  2. **Employee Table Rows**:
     - Next to Medicină a Muncii badge:
       Render `<RecordMedicalExamModal employee={emp} triggerIcon={true} triggerClassName="text-blue-600 hover:text-blue-800 p-1" />`.
     - In the action column:
       - Render `<EditEmployeeModal employeeId={emp.id} employeeName={`${emp.lastName} ${emp.firstName}`} jobs={client.jobs} worksites={client.worksites} />`.
       - If `emp.status === 'ACTIV'`:
         Render `<TerminateEmployeeModal employee={emp} />`.
         Render generation links ("Cerere", "Declarație RI", "CIM", "Onboarding ZIP").
       - If `emp.status === 'PLECAT'`:
         Render status badge with `leaveDate`.
         Hide/disable document generation links.

---

### 2. Modals Architecture in `src/components/employees/`

All modals must be `'use client'` React components with internal trigger button state (`isOpen`) so they can be rendered directly in Server Components as well as Client Components.

#### 2.1 `RecordMedicalExamModal` (`record-medical-exam-modal.tsx`)
- **API Endpoint**: `POST /api/employees/[id]/medical-exam`
- **Payload**:
  ```json
  {
    "examDate": "2026-11-10",
    "intervalMonths": 12,
    "verdict": "APT",
    "restrictions": "Ochelari de corecție la ecran",
    "clinicName": "Centrul Medical Unirea",
    "doctorName": "Dr. Ionescu Maria"
  }
  ```
- **UI Elements**:
  - Modal Header: "Înregistrare Fișă de Aptitudine — HG 355/2007" with employee name & current status.
  - Data Examinării (`examDate`, type="date", required, max today).
  - Periodicitate / Termen (`intervalMonths`, select: 6 luni - riscuri particulare, 12 luni - standard TESA / anual, 24 luni - bienal).
  - Verdict Medical (`verdict`: `APT`, `APT_CONDITIONAT`, `INAPT_TEMPORAR`, `INAPT` with standard badges).
  - Restricții / Recomandări (`restrictions`, textarea).
  - Unitate Medicală & Medic (`clinicName`, `doctorName`, text inputs).
- **Post-Submission**:
  - Calls `router.refresh()` to invalidate Next.js cache.
  - Emits optional `onSuccess()` callback.
  - Recalculates compliance in DB and unlocks generation in UI.

#### 2.2 `AddEmployeeModal` (`add-employee-modal.tsx`)
- **API Endpoint**: `POST /api/employees`
- **Tabs/Fieldsets**:
  1. *Identitate*: Nume, Prenume, CNP (13 digits), Sex, Data Nașterii, Telefon, Email, Firmă (dropdown if multiple).
  2. *Încadrare CIM*: Post (Job), Punct de Lucru (Worksite), Data Angajării, Număr CIM, Data CIM, Salariu Brut (lei), Normă (ore/zi, default 8), Zile Probă (default 90), Zile CO (default 20), IBAN, Bancă.
  3. *Act Identitate & Domiciliu*: Tip Act (CI/Pașaport), Serie, Număr, Eliberat De, Valabilitate, Județ, Localitate, Stradă, Număr, Bloc, Apartament, Cod Poștal.
  4. *SSM & EIP*: Mărime Pantofi, Mărime Haine, Mărime Mănuși, Grupă Sanguină, Rh, Traseu Navetă, Durată Navetă.
- **Validation**:
  - CNP must be exactly 13 digits.
  - Nume, Prenume, Data Angajării are required.
- **Post-Submission**:
  - `router.refresh()`, closes dialog, notifies user.

#### 2.3 `EditEmployeeModal` (`edit-employee-modal.tsx`)
- **API Endpoint**: `PUT /api/employees/[id]` (and `GET /api/employees/[id]` when opened)
- **Features**:
  - Loads full employee profile (including `identityDocument` and `residenceAddress`).
  - Pre-populates all 4 tabs.
  - Supports updating job assignment, worksite assignment, contract terms, sizes, and personal details.
- **Post-Submission**:
  - `router.refresh()`, closes dialog.

#### 2.4 `TerminateEmployeeModal` (`terminate-employee-modal.tsx`)
- **API Endpoint**: `POST /api/employees/[id]/terminate`
- **Payload**:
  ```json
  {
    "leaveDate": "2026-11-10",
    "reason": "Acordul părților — Art. 55 lit. b Codul Muncii"
  }
  ```
- **UI Elements**:
  - Prominent warning banner: explains that employee will be transitioned to status `PLECAT`, excluded from active compliance metrics and batch generation.
  - Data Încetării CIM (`leaveDate`, type="date", required, default today).
  - Temei Legal / Motiv (`reason`, select with options for Art. 55 lit. b, Art. 81 alin. 1, Art. 81 alin. 8, Art. 56, Art. 65, Art. 82, or custom text).
- **Post-Submission**:
  - `router.refresh()`, closes dialog, sets status to `PLECAT`.

---

### 3. Document Generation & Batch Filtering Analysis

#### 3.1 `src/app/documents/generate/page.tsx`
- **Employee Dropdown (`selectedEmployeeId`)**:
  - When loading employees via `fetch('/api/clients/${selectedClientId}/employees')`:
    Add defensive client-side filtering: `employees.filter((e) => (e as any).status !== 'PLECAT')`.
  - In `getEmployeeExpiryInfo(templateCode, employee)`:
    - If `employee.status === 'PLECAT'`:
      Return:
      ```typescript
      {
        isExpired: true,
        badgeText: 'Contract Încetat',
        badgeClass: 'bg-slate-200 text-slate-700 border-slate-300 font-bold',
        reason: 'Salariatul are contractul de muncă încetat (status PLECAT). Generarea documentelor este interzisă conform legii.',
      }
      ```
    - In medical exam check:
      If `employee.medicalFitnessVerdict === 'INAPT'` or `employee.medicalFitnessVerdict === 'INAPT_TEMPORAR'`:
      Return:
      ```typescript
      {
        isExpired: true,
        badgeText: 'Inapt Medical',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        reason: 'Aviz medical: INAPT. Conform HG 355/2007 salariatul nu este apt de muncă și nu i se pot emite documente operaționale.',
      }
      ```
  - **Feature 9 Unlocking Mechanism**:
    - When a valid medical exam is recorded (via `POST /api/employees/[id]/medical-exam`), `medicalLastExamDate` is set to the exam date, `medicalFitnessVerdict` is set to `APT` (or `APT_CONDITIONAT`), and `medicalIntervalMonths` is recorded.
    - When the employee is re-evaluated, `occupationalMedicine.status` becomes `'VALID'` and `isExpired` evaluates to `false`.
    - This automatically removes the disabled state on the generation button (`isGenerateDisabled`), unlocking single and batch document generation!

#### 3.2 `src/app/api/documents/generate-batch/route.ts`
- **Current Issue**:
  - Lines 127-137 query `prisma.employee.findMany({ where: { id: { in: employeeIds }, clientId } })` without checking `status !== 'PLECAT'`.
- **Required Fix**:
  - Check for terminated employees immediately after fetching:
    ```typescript
    const terminatedEmployees = employees.filter((e) => e.status === 'PLECAT');
    if (terminatedEmployees.length > 0) {
      const names = terminatedEmployees.map((e) => `${e.lastName} ${e.firstName}`).join(', ');
      return NextResponse.json(
        {
          error: `Generarea colectivă a fost respinsă. Următorii salariați au contractul de muncă încetat (status PLECAT): ${names}. Documentele statutare pot fi emise exclusiv pentru salariați activi.`,
          terminatedEmployees: terminatedEmployees.map((e) => ({
            id: e.id,
            name: `${e.lastName} ${e.firstName}`,
          })),
        },
        { status: 400 }
      );
    }
    ```
  - In `checkEmployeeTemplateExpiry()`:
    Add check for `compliance` or employee with `status === 'PLECAT'` or medical verdict `INAPT`.

#### 3.3 `src/lib/packages/bulk-packages.ts`
- **1. `generateEmployeeOnboardingZip`**:
  - Add guard:
    ```typescript
    if (employee.status === 'PLECAT') {
      throw new Error(`Salariatul ${employee.lastName} ${employee.firstName} are contractul de muncă încetat (status PLECAT). Nu se poate emite pachetul de onboarding.`);
    }
    ```
- **2. `generateCompanyDossierZip`**:
  - In `client.employees` query:
    Add:
    ```typescript
    employees: {
      where: { status: { not: 'PLECAT' } },
      include: {
        identityDocument: true,
        residenceAddress: true,
        currentJob: true,
        currentWorksite: true,
      },
    },
    ```
- **3. `generateInspectionArchiveZip`**:
  - Verify line 279:
    `where: options.includeAllEmployees ? undefined : { status: { not: 'PLECAT' } }`. Ensure default is strictly `{ status: { not: 'PLECAT' } }`.

#### 3.4 `src/lib/templates/resolver.ts`
- **In `loadResolverContext` (line 2362)**:
  - Add `{ where: { status: { not: 'PLECAT' } } }` to `client.employees`:
    ```typescript
    employees: {
      where: { status: { not: 'PLECAT' } },
      include: {
        identityDocument: true,
        residenceAddress: true,
        currentJob: true,
        currentWorksite: true,
      },
    },
    ```
  - If `ctx.employeeId` is supplied:
    ```typescript
    const employee = ctx.employeeId
      ? (client.employees.find((e) => e.id === ctx.employeeId) ||
          (await prisma.employee.findFirst({
            where: { id: ctx.employeeId, clientId: ctx.clientId, status: { not: 'PLECAT' } },
            include: {
              identityDocument: true,
              residenceAddress: true,
              currentJob: true,
              currentWorksite: true,
            },
          })))
      : null;
    ```
  - This ensures:
    1. `PLACEHOLDER_NUMAR_LUCRATORI` (lines 1487 & 1821) strictly counts only active workers.
    2. Dynamic hygiene participants fallback (line 2185) strictly maps only active workers.
    3. Direct generation for a terminated employee is prevented.

#### 3.5 `src/lib/compliance.ts`
- **In `calculateCompanyMetrics(employees, referenceDate)` (lines 286-343)**:
  - Filter `employees` array at entry:
    ```typescript
    const employeeList = Array.isArray(employees)
      ? employees.filter((emp) => (emp as any)?.status !== 'PLECAT')
      : [];
    ```
  - This guarantees that terminated employees NEVER distort company compliance percentages, `totalEmployees`, `overdueCount`, or `missingCount`.

#### 3.6 `src/app/api/clients/[id]/employees/route.ts`
- **Default Filtering**:
  ```typescript
  const includeTerminated = request.nextUrl.searchParams.get('includeTerminated') === 'true';
  const employees = await prisma.employee.findMany({
    where: {
      clientId: id,
      ...(includeTerminated ? {} : { status: { not: 'PLECAT' } }),
    },
    orderBy: { lastName: 'asc' },
    ...
  });
  ```

---

## File-by-File Integration Plan

| # | Target File | Nature | Key Responsibility |
|---|-------------|--------|---------------------|
| 1 | `src/components/employees/record-medical-exam-modal.tsx` | NEW | Modal for HG 355/2007 medical aptitude card (date, interval, verdict, restrictions, clinic, doctor) |
| 2 | `src/components/employees/add-employee-modal.tsx` | NEW | Modal for manual employee creation without Excel (4 tabs: personal, CIM, ID/address, EIP) |
| 3 | `src/components/employees/edit-employee-modal.tsx` | NEW | Modal for comprehensive employee editing |
| 4 | `src/components/employees/terminate-employee-modal.tsx` | NEW | Modal for contract termination (`status: "PLECAT"`, `leaveDate`, reason) |
| 5 | `src/components/employees/index.ts` | NEW | Barrel export for modal components |
| 6 | `src/app/employees/page.tsx` | EDIT | Include client jobs/worksites for Add modal, expose employee fields for modals |
| 7 | `src/app/employees/employee-registry-client.tsx` | EDIT | Add "Adaugă Salariat" button, "Plecați" tab, row action triggers, disable generation for PLECAT |
| 8 | `src/app/clients/[id]/page.tsx` | EDIT | Add "Adaugă Salariat" in client header, integrate row modals (Exam, Edit, Terminate) |
| 9 | `src/app/documents/generate/page.tsx` | EDIT | Exclude PLECAT from dropdown & batch list, block INAPT medical, unlock on valid exam |
| 10 | `src/app/api/documents/generate-batch/route.ts` | EDIT | Validate & reject batch requests containing `status === 'PLECAT'` |
| 11 | `src/lib/packages/bulk-packages.ts` | EDIT | Add `{ status: { not: 'PLECAT' } }` to company dossier, guard onboarding package |
| 12 | `src/lib/templates/resolver.ts` | EDIT | Add `{ status: { not: 'PLECAT' } }` to employee query in `loadResolverContext` |
| 13 | `src/lib/compliance.ts` | EDIT | Filter `status !== 'PLECAT'` in `calculateCompanyMetrics` |
| 14 | `src/app/api/clients/[id]/employees/route.ts` | EDIT | Filter `status !== 'PLECAT'` by default, support `?includeTerminated=true` |

---

## Verification & Testing Strategy

1. **Unit & Boundary Tests**:
   - Verify `calculateCompanyMetrics` ignores terminated employees:
     Given 2 active employees (both VALID) and 1 PLECAT employee (with OVERDUE medical exam), `complianceScorePercent` must be 100% and `overdueCount` must be 0.
   - Verify `POST /api/documents/generate-batch` returns HTTP 400 when an employee ID has `status: 'PLECAT'`.
   - Verify `generateCompanyDossierZip` only contains active employees.
2. **UI & Flow Verification**:
   - In `/employees`, clicking "Adaugă Salariat" opens modal, creates employee, refreshes list.
   - In `/employees`, clicking "Examen Medical" on an employee with overdue medical exam records a new exam with verdict APT; the row badge updates to VALID, and in `/documents/generate`, generation becomes unlocked.
   - In `/employees` or `/clients/[id]`, terminating an employee moves them to the "Plecați" tab, disables onboarding generation, and removes them from active dropdowns.
3. **Build & Regression**:
   - `npm run build` must compile with 0 TypeScript or Next.js build errors.
   - `npm test` (running all 5 suites) must pass 100%.
