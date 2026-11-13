# Scope: Milestone 2: Employee Lifecycle CRUD, Occupational Health & Status PLECAT

## Architecture
Milestone 2 establishes full employee operational lifecycle management and statutory occupational health compliance according to Romanian labor & health safety legislation (HG 355/2007, Legea 319/2006, Ordinul MMSS 2171/2022, Codul Muncii):
1. **Occupational Health Subsystem (HG 355/2007)**:
   - Dedicated API route `POST /api/employees/[id]/medical-exam` updating `Employee` scalar fields (`medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes`).
   - Audit logging via Prisma model `AuditEvent`.
   - Real-time compliance recalculation via `src/lib/compliance.ts`.
   - Dynamic unlocking of document generation in `src/app/documents/generate/page.tsx` and batch generation `src/app/api/documents/generate-batch/route.ts`.
   - Modal UI `RecordMedicalExamModal` accessible from `/employees` and `/clients/[id]`.
2. **Employee Lifecycle CRUD Subsystem**:
   - `POST /api/employees`: Manual employee creation with transaction-backed creation of `Employee`, `IdentityDocument`, and `ResidenceAddress`.
   - `PUT /api/employees/[id]` (and `GET /api/employees/[id]`): Full update of employee statutory fields (job/worksite assignment, CI series/number/validity, residence address, salary, CIM number/date, work norm, annual leave, IBAN, EIP sizes).
   - `POST /api/employees/[id]/terminate`: Employee contract termination setting `status: "PLECAT"` with `leaveDate` and termination reason.
   - Dedicated UI modals: `AddEmployeeModal`, `EditEmployeeModal`, `TerminateEmployeeModal` accessible from both `/employees` (`employee-registry-client.tsx`) and `/clients/[id]` (`page.tsx`).
3. **Strict PLECAT Status Exclusion Subsystem**:
   - `src/lib/compliance.ts`: `calculateCompanyMetrics` must filter out `status === 'PLECAT'` so terminated employees do not drag down company compliance scores or create spurious overdue alerts.
   - `src/app/employees/page.tsx` and `employee-registry-client.tsx`: Metrics must exclude terminated workers; terminated workers must have distinct UI presentation/tab or clear filtering.
   - `src/app/api/clients/[id]/employees/route.ts`: Default filtering of active vs. terminated employees.
   - `src/app/documents/generate/page.tsx`: Terminates excluded from active selection dropdowns.
   - `src/app/api/documents/generate-batch/route.ts`: Reject or exclude terminated employees from batch generation packages.
   - `src/lib/packages/bulk-packages.ts`: Exclude terminated employees from startup/annual company dossiers.
   - `src/lib/templates/resolver.ts`: Ensure any fallback on company employees only selects active employees (`status !== 'PLECAT'`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 7 | Înregistrare Examen Medical HG 355/2007 | API `POST /api/employees/[id]/medical-exam` și modal UI pentru fișă de aptitudine (dată, termen, verdict, restricții) | M2 | IN_PROGRESS |
| 8 | Actualizare `medicalLastExamDate` | Salvare în DB, înregistrare `AuditEvent` și recalculare automată a conformității active în `compliance.ts` | M2 | IN_PROGRESS |
| 9 | Deblocare Generare la Examen Valabil | Deblocare în UI (`generate/page.tsx`) și API batch când examenul medical este conform | M2 | IN_PROGRESS |
| 10 | Adăugare Manuală Angajat | API `POST /api/employees` și modal UI (`AddEmployeeModal`) pentru creare salariat nou fără Excel | M2 | IN_PROGRESS |
| 11 | Editare Salariat Extinsă | API `PUT /api/employees/[id]` (și `GET`) și modal UI (`EditEmployeeModal`) pentru editare funcție, CI, adresă, salariu, CIM, normă, IBAN, mărimi EIP | M2 | IN_PROGRESS |
| 12 | Încetare Contract (`status: PLECAT`) | API `POST /api/employees/[id]/terminate` cu `leaveDate` și modal UI de confirmare plecare | M2 | IN_PROGRESS |
| 13 | Excludere PLECAT din Conformitate & Batch | Filtrare `status === 'PLECAT'` din `compliance.ts`, `/employees`, `/generate`, `/generate-batch`, `bulk-packages.ts` | M2 | IN_PROGRESS |

---

## Interface Contracts

### 1. Occupational Health: `POST /api/employees/[id]/medical-exam`
- **Request URL**: `/api/employees/[id]/medical-exam`
- **Method**: `POST`
- **Body**:
  ```typescript
  {
    examDate: string; // ISO 8601 string, e.g. "2026-11-10"
    intervalMonths?: number; // default: 12
    verdict: "APT" | "APT_CONDITIONAT" | "INAPT_TEMPORAR" | "INAPT";
    restrictions?: string; // e.g. "Ochelari de corecție la ecran"
    clinicName?: string;
    doctorName?: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: true;
    employee: Employee;
    compliance: EmployeeCompliance;
  }
  ```
- **Side Effects**:
  - Updates `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `medicalNotes` on `Employee`.
  - Creates `AuditEvent` with `action: "RECORD_MEDICAL_EXAM"`, `entityType: "Employee"`, `entityId: id`.

### 2. Manual Employee Creation: `POST /api/employees`
- **Request URL**: `/api/employees`
- **Method**: `POST`
- **Body**:
  ```typescript
  {
    clientId: string;
    firstName: string;
    lastName: string;
    cnp: string;
    sex?: "M" | "F";
    birthDate?: string;
    birthPlace?: string;
    birthCounty?: string;
    citizenship?: string;
    hireDate: string;
    currentJobId?: string;
    currentWorksiteId?: string;
    phone?: string;
    email?: string;
    grossSalary?: number;
    cimNumber?: string;
    cimDate?: string;
    workNorm?: number;
    probationDays?: number;
    annualLeaveDays?: number;
    bankIban?: string;
    bankName?: string;
    bloodType?: string;
    rhFactor?: string;
    qualification?: string;
    commuteRoute?: string;
    commuteDurationMinutes?: number;
    shoeSize?: string;
    clothingSize?: string;
    gloveSize?: string;
    // Identity document
    idDocType?: string;
    idSeries?: string;
    idNumber?: string;
    idIssuedBy?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    // Residence address
    addressCounty?: string;
    addressLocality?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressBuilding?: string;
    addressEntrance?: string;
    addressFloor?: string;
    addressApartment?: string;
    addressPostalCode?: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: true;
    employee: Employee & { identityDocument?: IdentityDocument, residenceAddress?: ResidenceAddress };
  }
  ```

### 3. Employee Retrieval & Update: `GET /api/employees/[id]` & `PUT /api/employees/[id]`
- **`GET /api/employees/[id]`**:
  - Returns full employee profile with `identityDocument`, `residenceAddress`, `currentJob`, `currentWorksite`, `client`.
- **`PUT /api/employees/[id]`**:
  - Accepts full update payload for statutory fields and nested relations (`identityDocument`, `residenceAddress`).
  - Response: `{ success: true, employee: Employee }`.

### 4. Employee Termination: `POST /api/employees/[id]/terminate`
- **Request URL**: `/api/employees/[id]/terminate`
- **Method**: `POST`
- **Body**:
  ```typescript
  {
    leaveDate: string; // ISO 8601 string
    reason?: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: true;
    employee: Employee; // status: "PLECAT", leaveDate set
  }
  ```

### 5. Compliance & Status PLECAT Filtering Contracts
- `src/lib/compliance.ts`:
  - `calculateCompanyMetrics(employees, referenceDate)`: must compute `totalEmployees`, `validCompliance`, `overdueCompliance`, `upcomingCompliance`, `missingCompliance` strictly over `employees.filter(e => e.status !== 'PLECAT')`.
  - In individual employee compliance calculations, if `employee.status === 'PLECAT'`, their compliance status is marked as non-active or ignored in company rollups.
- `src/app/api/clients/[id]/employees/route.ts`:
  - Support query param `?includeTerminated=true` (or `?status=all`); default returns `status !== 'PLECAT'`.
- `src/app/documents/generate/page.tsx`:
  - Employee dropdown filters out employees where `status === 'PLECAT'` unless explicitly searching past employees.
- `src/app/api/documents/generate-batch/route.ts`:
  - Validates that none of the target employee IDs belong to `status: 'PLECAT'`. If one does, exclude or fail with descriptive error.
- `src/lib/packages/bulk-packages.ts`:
  - Only queries `employees: { where: { status: { not: 'PLECAT' } } }`.

---

## Code Layout
- `src/app/api/employees/route.ts` — `POST /api/employees` (Feature 10).
- `src/app/api/employees/[id]/route.ts` — `GET /api/employees/[id]`, `PUT /api/employees/[id]` (Feature 11).
- `src/app/api/employees/[id]/medical-exam/route.ts` — `POST /api/employees/[id]/medical-exam` (Features 7, 8).
- `src/app/api/employees/[id]/terminate/route.ts` — `POST /api/employees/[id]/terminate` (Feature 12).
- `src/app/api/clients/[id]/employees/route.ts` — Update for status filtering (Feature 13).
- `src/lib/compliance.ts` — Recalculation & PLECAT exclusion (Features 8, 13).
- `src/app/documents/generate/page.tsx` — Unlocking generation & PLECAT filtering (Features 9, 13).
- `src/app/api/documents/generate-batch/route.ts` — PLECAT exclusion & validation (Feature 13).
- `src/lib/packages/bulk-packages.ts` — PLECAT filtering in dossier generation (Feature 13).
- `src/app/employees/page.tsx` & `src/app/employees/employee-registry-client.tsx` — UI modals integration, tabs & metrics (Features 7, 9, 10, 11, 12, 13).
- `src/app/clients/[id]/page.tsx` — Client employee table actions & modals integration (Features 7, 10, 11, 12).
- `src/components/employees/` — Modals: `record-medical-exam-modal.tsx`, `add-employee-modal.tsx`, `edit-employee-modal.tsx`, `terminate-employee-modal.tsx`.
