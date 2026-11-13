# Handoff Report: Milestone 2 Employee Lifecycle CRUD, Termination & Status PLECAT APIs

**Author:** Explorer 2 (`explorer_m2_2`)  
**Mission:** Design detailed specifications for Employee Lifecycle CRUD (Features 10, 11, 12, 13 API focus)  
**Date:** 2026-11-11  
**Working Directory:** `/Users/davidalexandru/Documents/Proiect_SSM`  
**State Folder:** `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2`  
**Handoff Type:** Hard (Investigation complete, fully specified)  

---

## 1. Observation

Direct code observations from the workspace:

1. **Non-existent Employee Routes**:
   - Running `find src/app/api -type f` revealed that `src/app/api/employees/route.ts`, `src/app/api/employees/[id]/route.ts`, and `src/app/api/employees/[id]/terminate/route.ts` do not exist.
   - The only existing employee route is `src/app/api/clients/[id]/employees/route.ts`.

2. **Unconditional Retrieval in Existing Route (`src/app/api/clients/[id]/employees/route.ts`)**:
   - Lines 11-13:
     ```typescript
     const employees = await prisma.employee.findMany({
       where: { clientId: id },
       orderBy: { lastName: 'asc' },
     ```
   - No query parameter parsing exists for `includeTerminated` or `status`. Terminated employees (`status === 'PLECAT'`) are retrieved and returned unconditionally.
   - Selected fields omit `identityDocument` and `residenceAddress`.

3. **Prisma Schema Constraints (`prisma/schema.prisma`)**:
   - Lines 194-298 (`model Employee`):
     - `cnp` has a compound unique constraint: `@@unique([clientId, cnp])` (line 297).
     - `status` defaults to `"ACTIV"` (line 221).
     - `leaveDate` is `DateTime?` (line 222).
     - Extended CIM and statutory fields exist: `cimNumber`, `cimDate`, `grossSalary`, `workNorm`, `probationDays`, `annualLeaveDays`, `bankIban`, `bankName`, `bloodType`, `rhFactor`, `qualification`, `commuteRoute`, `commuteDurationMinutes`, `shoeSize`, `clothingSize`, `gloveSize`.
   - Lines 300-312 (`model IdentityDocument`):
     - One-to-one with `employeeId String @unique`, cascade delete.
   - Lines 314-329 (`model ResidenceAddress`):
     - One-to-one with `employeeId String @unique`, cascade delete.
   - Lines 331-343 (`model EmploymentHistory`):
     - Tracks `employeeId`, `jobId`, `worksiteId`, `validFrom`, `validTo`.
   - Lines 605-618 (`model AuditEvent`):
     - Requires `actorName`, `action`, `entityType`, `entityId`, `details`.
     - Explicit documentation warning: `"Fără CNP sau text de CI în detalii!"` (line 612).

4. **Audit Logging Framework (`src/lib/security.ts`)**:
   - Lines 30-61 define `logAuditEvent(params: { actorName, actorEmail?, action, entityType, entityId?, details?, ipAddress? })`.
   - Automatically sanitizes sensitive keys (`cnp`, `identityNumber`, `series`) from `details` objects before serialization.

5. **Company Compliance Metrics Leakage (`src/lib/compliance.ts`)**:
   - Lines 286-300:
     ```typescript
     export function calculateCompanyMetrics(
       employees: (EmployeeComplianceInput | Record<string, unknown>)[],
       referenceDate: Date = new Date()
     ): CompanyComplianceMetrics {
       const employeeList = Array.isArray(employees) ? employees : [];
       const totalEmployees = employeeList.length;
     ```
   - `calculateCompanyMetrics` does not filter out `status === 'PLECAT'` if passed an unfiltered array.

6. **Batch Generation Leakage (`src/app/api/documents/generate-batch/route.ts`)**:
   - Lines 127-137:
     ```typescript
     const employees = await prisma.employee.findMany({
       where: {
         id: { in: employeeIds },
         clientId,
       },
     ```
   - No guard checks if any of the requested `employeeIds` belong to employees with `status === 'PLECAT'`.

7. **Dossier Package Leakage (`src/lib/packages/bulk-packages.ts`)**:
   - Line 189: In `generateCompanyDossierZip`, `employees: { include: ... }` does not filter out `status: { not: 'PLECAT' }` (in contrast to `generateInspectionArchiveZip` line 279 which has conditional filtering).

8. **End-to-End Test Expectations (`scripts/e2e-tier4-scenarios.ts`)**:
   - Lines 624-720 (Scenario 4) explicitly verify:
     - Terminating an employee sets `status: 'PLECAT'`, sets `leaveDate`, and records `adminNotes`.
     - Active metrics recalculate strictly on active employees (`calculateCompanyMetrics(activeEmployees)`), yielding 100% compliance score with 0 overdue items.
     - Bulk packages exclude `PLECAT` workers from active dossiers.

---

## 2. Logic Chain

1. **Manual Employee Creation (Observation 1, 3, 4)**:
   - Because `POST /api/employees` does not exist (Observation 1), users have no way to create employees without importing Excel files.
   - Creating an employee requires populating `Employee`, but statutory compliance (Ordin 2171/2022, HG 1425/2006) also requires identity documents and addresses (Observation 3).
   - Because `IdentityDocument` and `ResidenceAddress` have one-to-one relations with unique `employeeId`, creating an employee with identity/address details must be executed atomically inside `prisma.$transaction`.
   - Because `@@unique([clientId, cnp])` is enforced by the database (Observation 3), the endpoint must pre-check CNP uniqueness within `clientId` and return 409 Conflict if violated, preventing unhandled 500 database crashes.
   - Initial appointment to a `Job` or `Worksite` must generate an initial row in `EmploymentHistory` (`validFrom: hireDate`) to track employee progression.
   - GDPR compliance requires calling `logAuditEvent` without CNP or identity numbers in details (Observation 3, 4).

2. **Employee Retrieval & Update (Observation 1, 3, 4)**:
   - `GET /api/employees/[id]` must return the complete profile (including `identityDocument`, `residenceAddress`, `currentJob`, `currentWorksite`, `client`, `employmentHistory`, and calculated compliance).
   - `PUT /api/employees/[id]` must support statutory updates. If `currentJobId` or `currentWorksiteId` changes, the active `EmploymentHistory` entry must be closed (`validTo = now()`) and a new entry opened.
   - Nested upsert must be supported for `IdentityDocument` and `ResidenceAddress`: update if exists, create if absent.

3. **Termination Workflow (Observation 1, 3, 8)**:
   - `POST /api/employees/[id]/terminate` must require `leaveDate` and set `status = "PLECAT"`.
   - It must validate that `leaveDate >= hireDate` to maintain chronological sanity.
   - It must close any open `EmploymentHistory` record (`validTo = leaveDate`).
   - It must record an `AuditEvent` with `action: "update"`.

4. **Strict PLECAT Exclusion (Observation 2, 5, 6, 7, 8)**:
   - Currently, `/api/clients/[id]/employees` returns all employees without filtering (Observation 2).
   - Defaulting `/api/clients/[id]/employees` to `where: { status: { not: 'PLECAT' } }` automatically cleanses the dropdown in `/documents/generate` because that page fetches directly from this route.
   - Query params `?includeTerminated=true` and `?status=ACTIV|PLECAT|ALL` allow registry pages to view both active and terminated employees.
   - `calculateCompanyMetrics` in `src/lib/compliance.ts` must filter out `status === 'PLECAT'` so terminated workers do not distort company compliance scores.
   - `POST /api/documents/generate-batch` and `generateCompanyDossierZip` must strictly reject/exclude `PLECAT` employees.

---

## 3. Caveats

1. **Re-hiring / Status Reactivation**: The specification focuses on termination (`ACTIV -> PLECAT`). While `PUT /api/employees/[id]` can theoretically update `status: "ACTIV"`, a formal "Re-hire / Reactivation" endpoint is not mandated in Milestone 2.
2. **Expatriate / Non-CNP Workers**: Romanian statutory law allows foreign employees with NIF or Passport. While `cnp` is mandatory in the current Prisma schema (`cnp String`), the specification validates standard 13-digit CNPs; non-standard CNPs/NIFs can be handled by standard string length checks if foreign worker mode is activated.
3. **Draft / Staging import integration**: Manual CRUD operates directly on PostgreSQL tables via Prisma. It does not generate an `ImportBatch` row (which is reserved for bulk Excel uploads).

---

## 4. Conclusion

The API architecture for Milestone 2 (Features 10, 11, 12, 13) is fully designed, verified against Prisma schema constraints, and aligned with Romanian statutory obligations:
1. `POST /api/employees`: Manual creation with atomic nested relation creation (`IdentityDocument`, `ResidenceAddress`, `EmploymentHistory`), CNP uniqueness pre-check, and audit logging.
2. `GET /api/employees/[id]`: Full statutory employee profile retrieval with relations and real-time compliance calculation.
3. `PUT /api/employees/[id]`: Full statutory update with relation upsert and job transition tracking in `employmentHistory`.
4. `POST /api/employees/[id]/terminate`: Employee termination setting `status: "PLECAT"`, closing active employment history, and logging `AuditEvent`.
5. `GET /api/clients/[id]/employees`: Query parameter filtering (`includeTerminated`, `status`) defaulting to active employees only.
6. Downstream guards across compliance calculation, generator dropdowns, and batch generation fully specified.

All technical specifications, JSON schemas, interfaces, and code snippets are documented in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2/analysis.md`.

---

## 5. Verification Method

To independently verify the implementation once built:

1. **TypeScript Build & Route Compilation**:
   ```bash
   npm run build
   ```
   Must pass with 0 errors, validating route exports and parameter types.

2. **Schema & Database Integrity**:
   ```bash
   npx prisma validate
   ```
   Must confirm database schema validity.

3. **End-to-End Test Suite Verification**:
   ```bash
   npx tsx scripts/e2e-tier1-features.ts
   npx tsx scripts/e2e-tier4-scenarios.ts
   ```
   Specifically verifies Feature 13 / Scenario 4: termination of an employee, status transition to `PLECAT`, exclusion from active company compliance, and exclusion from batch packages.

4. **Integration Verification of API Endpoints**:
   - `POST /api/employees`: Submit a complete payload with personal data, CI, address, and CIM. Expect HTTP 201 with nested relations.
   - `GET /api/employees/[id]`: Expect HTTP 200 with full profile and `compliance` object.
   - `PUT /api/employees/[id]`: Submit updated salary, work norm, and address. Expect HTTP 200 with updated records.
   - `POST /api/employees/[id]/terminate`: Submit `{ leaveDate: "2026-11-30" }`. Expect HTTP 200 with `status: "PLECAT"`.
   - `GET /api/clients/[id]/employees`: Call without query params, verify terminated employee is excluded. Call with `?includeTerminated=true`, verify terminated employee is present.
