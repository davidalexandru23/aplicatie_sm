# Analysis & Specification: Milestone 2 Employee Lifecycle CRUD, Termination & Status PLECAT APIs

**Author:** Explorer 2 (`explorer_m2_2`)  
**Mission:** Design detailed specifications for Employee Lifecycle CRUD (Features 10, 11, 12, 13)  
**Target Milestone:** Milestone 2 (M2)  
**Date:** 2026-11-11  

---

## 1. Executive Summary & Problem Scope

Romanian labor, occupational health, and safety legislation (Codul Muncii - Legea 53/2003, Ordinul MMSS 2171/2022, Legea 319/2006, HG 1425/2006, HG 355/2007, HG 1048/2006) mandates that companies maintain strict, accurate statutory records for every employee.

Prior to Milestone 2:
1. Employee records could only be populated via Excel bulk import (`src/lib/importer.ts`). There was no interactive API to create an employee manually or update statutory data on the fly.
2. The route `src/app/api/clients/[id]/employees/route.ts` unconditionally returned all employees regardless of employment status, polluting active compliance dashboards with terminated workers.
3. Terminated employees (`status: "PLECAT"`) were included in company compliance calculations (`src/lib/compliance.ts`), generating false overdue alarms and artificially depressing client compliance scores.
4. Document batch generation (`src/app/api/documents/generate-batch/route.ts`) and company dossier packages lacked guards against generating active operational documents for departed staff.

This investigation delivers a complete, production-ready technical specification for:
- `POST /api/employees`: Manual employee creation with nested statutory relations (`IdentityDocument`, `ResidenceAddress`, `EmploymentHistory`).
- `GET /api/employees/[id]`: Retrieval of the full employee profile including relations, employment history, and real-time compliance calculation.
- `PUT /api/employees/[id]`: Full statutory update of personal, contractual, job/worksite assignment, address, identity document, and EIP size attributes.
- `POST /api/employees/[id]/terminate`: Employee contract termination with `leaveDate`, transition to `status: "PLECAT"`, closing employment history, and logging GDPR-compliant `AuditEvent`.
- `GET /api/clients/[id]/employees`: Filtering support for active vs. terminated employees via `?includeTerminated=true` and `?status=ACTIV|PLECAT|ALL`.
- System-wide enforcement of `status: "PLECAT"` exclusion across compliance metrics, generator dropdowns, and batch packages.

---

## 2. Architectural Context & Data Model Analysis

### 2.1 Prisma Entity Relationships (`prisma/schema.prisma`)

```
+--------------------+            +-------------------+
|       Client       |<-----------|     Employee      |
+--------------------+ 1        * +-------------------+
| id                 |            | id                |
| name, cui, address |            | clientId          |
+--------------------+            | firstName, lastName|
         |                        | cnp (unique/co)   |
         | 1                      | status (ACTIV/PLECAT)|
         v *                      | hireDate, leaveDate|
+--------------------+            | cimNumber, cimDate|
|    Job / Worksite  |<-----------| grossSalary, norm |
+--------------------+ 0..1     * +-------------------+
                                            | 1
                    +-----------------------+-----------------------+
                    | 1                                             | 1
                    v 0..1                                          v 0..1
          +-------------------+                           +--------------------+
          | IdentityDocument  |                           |  ResidenceAddress  |
          +-------------------+                           +--------------------+
          | employeeId (UQ)   |                           | employeeId (UQ)    |
          | docType, series   |                           | county, locality   |
          | number, issuedBy  |                           | street, number     |
          | issueDate, expiry |                           | building, apt, zip |
          +-------------------+                           +--------------------+
```

### 2.2 Key Database Constraints
1. **CNP Uniqueness per Company**: `@@unique([clientId, cnp])` on `Employee`.
   - Creating or updating an employee's CNP must check for collisions within the same company.
2. **One-to-One Strict Relations**:
   - `IdentityDocument`: `employeeId String @unique`, references `Employee(id)` with `onDelete: Cascade`.
   - `ResidenceAddress`: `employeeId String @unique`, references `Employee(id)` with `onDelete: Cascade`.
3. **Foreign Key Integrity**:
   - `currentJobId` references `Job(id)` with `onDelete: SetNull`. Must belong to the same `clientId`.
   - `currentWorksiteId` references `Worksite(id)` with `onDelete: SetNull`. Must belong to the same `clientId`.
4. **GDPR Masking & Security**:
   - `AuditEvent.details` must never store plain CNP or identity document series/numbers (enforced in `src/lib/security.ts`).

---

## 3. Specification: `POST /api/employees` (Feature 10)

### 3.1 Endpoint Overview
- **URL**: `/api/employees`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authorization**: Session / Internal Operator

### 3.2 Request Payload Interface
```typescript
export interface CreateEmployeeRequest {
  // Required
  clientId: string;
  firstName: string;
  lastName: string;
  cnp: string;
  hireDate: string; // ISO 8601 (YYYY-MM-DD or full timestamp)

  // Demographic / Personal
  sex?: 'M' | 'F' | string;
  birthDate?: string; // ISO 8601
  birthPlace?: string;
  birthCounty?: string;
  citizenship?: string; // Default: "Română"
  phone?: string;
  email?: string;

  // Organizational Placement
  currentJobId?: string;
  currentWorksiteId?: string;
  startDateOnJob?: string;

  // Contract Individual de Muncă (CIM - Ordin 2171/2022)
  cimNumber?: string;
  cimDate?: string;
  grossSalary?: number;
  workNorm?: number; // Default: 8
  probationDays?: number; // Default: 90
  annualLeaveDays?: number; // Default: 20
  bankIban?: string;
  bankName?: string;

  // SSM & Medical Profile (HG 1425/2006)
  bloodType?: string; // "0I", "AII", "BIII", "ABIV"
  rhFactor?: string; // "+", "-"
  qualification?: string;
  commuteRoute?: string;
  commuteDurationMinutes?: number;

  // EIP Sizes (HG 1048/2006)
  shoeSize?: string;
  clothingSize?: string;
  gloveSize?: string;

  // Hygiene Training (Ordin 2209/2022)
  hygieneRequested?: boolean;
  hygieneModule?: string;
  hygienePreferredSession?: string;
  adminNotes?: string;

  // Identity Document (optional nested or flat)
  idDocType?: string; // Default: "CI"
  idSeries?: string;
  idNumber?: string;
  idIssuedBy?: string;
  idIssueDate?: string;
  idExpiryDate?: string;

  // Residence Address (optional nested or flat)
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

### 3.3 Validation & Business Rules
1. **Mandatory Field Checks**:
   - `clientId`: Required string. Verify client exists via `prisma.client.findUnique({ where: { id: clientId } })`. If missing or not found, return 400 or 404.
   - `firstName`: Required string, trimmed, min length 2.
   - `lastName`: Required string, trimmed, min length 2.
   - `cnp`: Required string, trimmed. Must be exactly 13 numeric digits (`/^\d{13}$/`).
   - `hireDate`: Required string. Must parse to a valid Date object.
2. **CNP Uniqueness Check**:
   - Query: `prisma.employee.findUnique({ where: { clientId_cnp: { clientId, cnp: cleanCnp } } })`.
   - If an employee exists with this CNP in this client, return HTTP 409 Conflict:
     `{ error: "Există deja un salariat înregistrat cu acest CNP în cadrul acestei companii." }`.
3. **Cross-Entity Reference Validation**:
   - If `currentJobId` is supplied: ensure `job.clientId === clientId`. If not, return 400.
   - If `currentWorksiteId` is supplied: ensure `worksite.clientId === clientId`. If not, return 400.
4. **Data Normalization & CNP Decoding**:
   - If `birthDate` is omitted, derive from CNP digits 2-7 (considering century prefix: 1/2 -> 1900s, 5/6 -> 2000s).
   - If `sex` is omitted, derive from first CNP digit: 1, 3, 5, 7 -> 'M'; 2, 4, 6, 8 -> 'F'.
   - `status`: Always initialized to `'ACTIV'`.
   - `leaveDate`: Initialized to `null`.
   - `workNorm`: Defaults to 8 if not specified (range: 1-12).
   - `probationDays`: Defaults to 90 if not specified.
   - `annualLeaveDays`: Defaults to 20 if not specified.
   - Initial intervals: `medicalIntervalMonths = 12`, `ssmIntervalMonths = 6`, `psiIntervalMonths = 6`, `hygieneIntervalMonths = 36`.
   - **Crucial Rule**: Do NOT backfill `medicalLastExamDate`, `ssmLastTrainingDate`, or `psiLastTrainingDate` with `hireDate` (prevents fabricated historical dates).
5. **Transaction Execution (`prisma.$transaction`)**:
   - Step 1: Create `Employee` record.
   - Step 2: If `idNumber` is present, create `IdentityDocument` record linked via `employeeId`.
   - Step 3: If address components (`addressCounty`, `addressLocality`, `addressStreet`, `addressNumber`) are present, create `ResidenceAddress` record linked via `employeeId`.
   - Step 4: If `currentJobId` or `currentWorksiteId` is provided, create initial `EmploymentHistory` record:
     `tx.employmentHistory.create({ data: { employeeId: employee.id, jobId: currentJobId || null, worksiteId: currentWorksiteId || null, validFrom: parsedHireDate } })`.
6. **Audit Event**:
   - Call `logAuditEvent` inside/after transaction:
     - `action: "create"`
     - `entityType: "Employee"`
     - `entityId: employee.id`
     - `details`: `{ clientId, employeeName: `${lastName} ${firstName}`, jobTitle, hireDate }` (no CNP or CI series/number in details).

### 3.4 Response Contract
- **Status Code**: `201 Created`
```json
{
  "success": true,
  "employee": {
    "id": "uuid",
    "clientId": "uuid",
    "firstName": "Ion",
    "lastName": "Popescu",
    "cnp": "1850101123456",
    "status": "ACTIV",
    "hireDate": "2026-11-01T00:00:00.000Z",
    "currentJobId": "uuid",
    "currentWorksiteId": "uuid",
    "currentJob": { "id": "uuid", "title": "Bucătar", "corCode": "512001" },
    "currentWorksite": { "id": "uuid", "name": "Bucătărie Centrală" },
    "identityDocument": {
      "id": "uuid",
      "docType": "CI",
      "series": "RX",
      "number": "123456",
      "issuedBy": "SPCLEP Sector 1",
      "issueDate": "2020-01-15T00:00:00.000Z",
      "expiryDate": "2030-01-15T00:00:00.000Z"
    },
    "residenceAddress": {
      "id": "uuid",
      "county": "București",
      "locality": "Sector 1",
      "street": "Str. Victoriei",
      "number": "25"
    },
    "compliance": { ... }
  }
}
```

---

## 4. Specification: `GET /api/employees/[id]` (Feature 11)

### 4.1 Endpoint Overview
- **URL**: `/api/employees/[id]`
- **Method**: `GET`
- **Params**: `{ params }: { params: Promise<{ id: string }> }` (Next.js 15+ App Router)

### 4.2 Query Execution & Includes
```typescript
const employee = await prisma.employee.findUnique({
  where: { id },
  include: {
    client: {
      select: {
        id: true,
        name: true,
        cui: true,
        regCom: true,
        address: true,
        caenCode: true,
        caenActivity: true,
      },
    },
    currentJob: true,
    currentWorksite: true,
    identityDocument: true,
    residenceAddress: true,
    employmentHistory: {
      include: {
        job: { select: { id: true, title: true, corCode: true } },
        worksite: { select: { id: true, name: true, address: true } },
      },
      orderBy: { validFrom: 'desc' },
    },
    eipAssignments: {
      include: { eipItem: true },
      orderBy: { assignedDate: 'desc' },
    },
    trainingParticipants: {
      include: {
        event: {
          select: {
            id: true,
            type: true,
            eventDate: true,
            durationHours: true,
            materialOrTopic: true,
            instructorName: true,
          },
        },
      },
      orderBy: { event: { eventDate: 'desc' } },
      take: 10,
    },
    hygieneParticipants: {
      include: { session: true },
      orderBy: { session: { sessionDate: 'desc' } },
      take: 5,
    },
  },
});
```

### 4.3 Compliance Calculation
- Compute individual compliance summary via `calculateEmployeeCompliance(employee)`.

### 4.4 Error Handling
- If `!employee`, return HTTP 404:
  `{ error: "Salariatul cu ID-ul specificat nu a fost găsit." }`.

### 4.5 Response Contract
- **Status Code**: `200 OK`
```json
{
  "success": true,
  "employee": {
    "id": "uuid",
    "firstName": "Ion",
    "lastName": "Popescu",
    "cnp": "1850101123456",
    "status": "ACTIV",
    "client": { "id": "uuid", "name": "BISTRO GOURMET S.R.L." },
    "currentJob": { "id": "uuid", "title": "Bucătar" },
    "currentWorksite": { "id": "uuid", "name": "Punct de lucru Centru" },
    "identityDocument": { ... },
    "residenceAddress": { ... },
    "employmentHistory": [ ... ],
    "compliance": {
      "overallStatus": "VALID",
      "occupationalMedicine": { "status": "VALID", "dueDate": "2027-01-10" },
      ...
    }
  }
}
```

---

## 5. Specification: `PUT /api/employees/[id]` (Feature 11)

### 5.1 Endpoint Overview
- **URL**: `/api/employees/[id]`
- **Method**: `PUT` (and `PATCH`)
- **Content-Type**: `application/json`

### 5.2 Request Payload Interface
```typescript
export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  cnp?: string;
  sex?: 'M' | 'F' | string;
  birthDate?: string | null;
  birthPlace?: string | null;
  birthCounty?: string | null;
  citizenship?: string | null;
  phone?: string | null;
  email?: string | null;
  hireDate?: string | null;
  startDateOnJob?: string | null;
  currentJobId?: string | null;
  currentWorksiteId?: string | null;

  // CIM & Compensation
  cimNumber?: string | null;
  cimDate?: string | null;
  grossSalary?: number | null;
  workNorm?: number | null;
  probationDays?: number | null;
  annualLeaveDays?: number | null;
  bankIban?: string | null;
  bankName?: string | null;

  // SSM & Health Profile
  bloodType?: string | null;
  rhFactor?: string | null;
  qualification?: string | null;
  commuteRoute?: string | null;
  commuteDurationMinutes?: number | null;

  // EIP Sizes
  shoeSize?: string | null;
  clothingSize?: string | null;
  gloveSize?: string | null;

  // Hygiene
  hygieneRequested?: boolean | null;
  hygieneModule?: string | null;
  hygienePreferredSession?: string | null;
  adminNotes?: string | null;

  // Identity Document (flat or nested)
  idDocType?: string;
  idSeries?: string | null;
  idNumber?: string | null;
  idIssuedBy?: string | null;
  idIssueDate?: string | null;
  idExpiryDate?: string | null;
  identityDocument?: {
    docType?: string;
    series?: string | null;
    number: string;
    issuedBy?: string | null;
    issueDate?: string | null;
    expiryDate?: string | null;
  } | null;

  // Residence Address (flat or nested)
  addressCounty?: string | null;
  addressLocality?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressBuilding?: string | null;
  addressEntrance?: string | null;
  addressFloor?: string | null;
  addressApartment?: string | null;
  addressPostalCode?: string | null;
  residenceAddress?: {
    county: string;
    locality: string;
    street: string;
    number: string;
    building?: string | null;
    entrance?: string | null;
    floor?: string | null;
    apartment?: string | null;
    postalCode?: string | null;
  } | null;
}
```

### 5.3 Validation & Business Rules
1. **Existing Record Verification**:
   - Query: `prisma.employee.findUnique({ where: { id }, include: { identityDocument: true, residenceAddress: true } })`.
   - If not found, return 404: `{ error: "Salariatul nu a fost găsit." }`.
2. **CNP Mutation Guard**:
   - If `cnp` is provided and different from existing:
     - Validate 13-digit format (`/^\d{13}$/`).
     - Check duplicate: `prisma.employee.findFirst({ where: { clientId: existing.clientId, cnp: cleanCnp, NOT: { id } } })`.
     - If duplicate exists, return 409 Conflict: `{ error: "Un alt salariat din această firmă folosește deja acest CNP." }`.
3. **Job / Worksite Transfer Tracking**:
   - If `currentJobId` is passed, verify it belongs to `existing.clientId`.
   - If `currentWorksiteId` is passed, verify it belongs to `existing.clientId`.
   - If `currentJobId` or `currentWorksiteId` changes from the previous values:
     - Close active history row: `tx.employmentHistory.updateMany({ where: { employeeId: id, validTo: null }, data: { validTo: new Date() } })`.
     - Insert new history row: `tx.employmentHistory.create({ data: { employeeId: id, jobId: targetJobId, worksiteId: targetWorksiteId, validFrom: new Date() } })`.
4. **Identity Document Upsert**:
   - Support both nested `identityDocument` object and flattened `id*` fields.
   - If `idNumber` is present:
     - If `existing.identityDocument` exists: update it.
     - Else: create a new `IdentityDocument` record for `employeeId: id`.
5. **Residence Address Upsert**:
   - Support both nested `residenceAddress` object and flattened `address*` fields.
   - If address fields are present:
     - If `existing.residenceAddress` exists: update it.
     - Else: create a new `ResidenceAddress` record for `employeeId: id`.
6. **Transaction Execution**:
   - Wrap all updates (`Employee`, `IdentityDocument`, `ResidenceAddress`, `EmploymentHistory`) inside `prisma.$transaction(async (tx) => { ... })`.
7. **Audit Logging**:
   - Call `logAuditEvent`:
     - `action: "update"`
     - `entityType: "Employee"`
     - `entityId: id`
     - `details`: `{ employeeName: `${updated.lastName} ${updated.firstName}`, updatedFields: Object.keys(body).filter(...) }`.

### 5.4 Response Contract
- **Status Code**: `200 OK`
```json
{
  "success": true,
  "employee": {
    "id": "uuid",
    "firstName": "Ion",
    "lastName": "Popescu",
    "status": "ACTIV",
    "identityDocument": { ... },
    "residenceAddress": { ... },
    "compliance": { ... }
  }
}
```

---

## 6. Specification: `POST /api/employees/[id]/terminate` (Feature 12)

### 6.1 Endpoint Overview
- **URL**: `/api/employees/[id]/terminate`
- **Method**: `POST`
- **Content-Type**: `application/json`

### 6.2 Request Payload Interface
```typescript
export interface TerminateEmployeeRequest {
  leaveDate: string; // ISO 8601 date string (YYYY-MM-DD or full timestamp)
  reason?: string; // e.g. "Demisie conform art. 81 Codul Muncii", "Acordul părților art. 55 lit. b"
  notes?: string; // Optional internal HR/SSM comments
}
```

### 6.3 Validation & Business Rules
1. **Target Verification**:
   - Fetch employee: `prisma.employee.findUnique({ where: { id } })`.
   - If not found -> 404: `{ error: "Salariatul nu a fost găsit." }`.
2. **Leave Date Validation**:
   - `leaveDate` is strictly required. Parse as `new Date(leaveDate)`.
   - If invalid date -> 400: `{ error: "Data încetării contractului este invalidă." }`.
   - Chronological check against `hireDate`:
     - If `employee.hireDate` exists and `parsedLeaveDate.getTime() < employee.hireDate.getTime()`:
       Return 400 Bad Request:
       `{ error: "Data plecării nu poate fi anterioară datei de angajare a salariatului." }`.
3. **Status Check**:
   - If `employee.status === 'PLECAT'`:
     - Allow updating `leaveDate` and reason (for administrative corrections), or return 400 if strictly terminating once. Recommended: Allow update with clear notice in audit log so HR operators can rectify termination date errors without database intervention.
4. **Transaction & Database Mutation**:
   - `prisma.$transaction(async (tx) => { ... })`:
     - Update `Employee`:
       - `status = "PLECAT"`
       - `leaveDate = parsedLeaveDate`
       - If `reason` or `notes` provided, append to `adminNotes`:
         `Motiv plecare: ${reason || 'Nespecificat'}${notes ? ` | Observații: ${notes}` : ''}`
     - Close open employment history:
       `tx.employmentHistory.updateMany({ where: { employeeId: id, validTo: null }, data: { validTo: parsedLeaveDate } })`
5. **Audit Logging**:
   - Call `logAuditEvent`:
     - `action: "update"`
     - `entityType: "Employee"`
     - `entityId: id`
     - `details`: `{ message: "Încetare contract de muncă - status PLECAT", employeeName: `${employee.lastName} ${employee.firstName}`, leaveDate: parsedLeaveDate.toISOString(), reason: reason || null }`

### 6.4 Response Contract
- **Status Code**: `200 OK`
```json
{
  "success": true,
  "employee": {
    "id": "uuid",
    "firstName": "Ion",
    "lastName": "Popescu",
    "status": "PLECAT",
    "leaveDate": "2026-11-30T00:00:00.000Z",
    "adminNotes": "Motiv plecare: Acordul părților art. 55 lit. b"
  },
  "message": "Contractul de muncă al salariatului Popescu Ion a fost încetat cu succes."
}
```

---

## 7. Specification: `src/app/api/clients/[id]/employees/route.ts` (Feature 13)

### 7.1 Existing State vs. Target State
- **Current State**:
  ```typescript
  const employees = await prisma.employee.findMany({
    where: { clientId: id }, // Returns EVERYTHING, including PLECAT
    ...
  });
  ```
- **Target State**:
  Support query parameters:
  - `?includeTerminated=true`: returns all employees (both active and terminated).
  - `?status=ACTIV`: returns only active employees.
  - `?status=PLECAT`: returns only terminated employees.
  - `?status=ALL`: returns all employees.
  - **DEFAULT BEHAVIOR** (no query param or `includeTerminated=false`): strictly filters out `status === "PLECAT"`, returning only active employees (`where: { clientId: id, status: { not: "PLECAT" } }`).

### 7.2 Detailed Implementation Logic
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance } from '@/lib/compliance';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const includeTerminated = searchParams.get('includeTerminated') === 'true';
    const statusParam = searchParams.get('status')?.toUpperCase();

    // Base WHERE clause
    const where: Prisma.EmployeeWhereInput = {
      clientId: id,
    };

    // Status filtering rules
    if (statusParam === 'PLECAT') {
      where.status = 'PLECAT';
    } else if (statusParam === 'ACTIV') {
      where.status = 'ACTIV';
    } else if (statusParam === 'ALL' || includeTerminated) {
      // No status filter applied: includes both ACTIV and PLECAT
    } else {
      // DEFAULT: Strictly active employees only!
      where.status = { not: 'PLECAT' };
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cnp: true,
        sex: true,
        birthDate: true,
        citizenship: true,
        email: true,
        phone: true,
        hireDate: true,
        status: true,
        leaveDate: true,
        medicalLastExamDate: true,
        medicalIntervalMonths: true,
        medicalFitnessVerdict: true,
        medicalNotes: true,
        ssmLastTrainingDate: true,
        ssmIntervalMonths: true,
        psiLastTrainingDate: true,
        psiIntervalMonths: true,
        hygieneRequested: true,
        hygieneLastExamDate: true,
        hygieneIntervalMonths: true,
        hygieneCertificateNumber: true,
        cimNumber: true,
        cimDate: true,
        grossSalary: true,
        workNorm: true,
        shoeSize: true,
        clothingSize: true,
        gloveSize: true,
        currentJobId: true,
        currentJob: {
          select: {
            id: true,
            title: true,
            corCode: true,
            mainActivities: true,
            equipmentUsed: true,
            workConditions: true,
          },
        },
        currentWorksiteId: true,
        currentWorksite: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        identityDocument: {
          select: {
            id: true,
            docType: true,
            series: true,
            number: true,
            issuedBy: true,
            issueDate: true,
            expiryDate: true,
          },
        },
        residenceAddress: {
          select: {
            id: true,
            county: true,
            locality: true,
            street: true,
            number: true,
            building: true,
            entrance: true,
            floor: true,
            apartment: true,
            postalCode: true,
          },
        },
      },
    });

    const enriched = employees.map((emp) => ({
      ...emp,
      fullName: `${emp.lastName} ${emp.firstName}`,
      compliance: calculateEmployeeCompliance(emp),
    }));

    return NextResponse.json(enriched);
  } catch (err: unknown) {
    console.error('GET /api/clients/[id]/employees error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea salariaților.' },
      { status: 500 }
    );
  }
}
```

---

## 8. Cross-Cutting PLECAT Enforcement Audit (Feature 13)

To ensure zero leakage of terminated employees across all operational pathways, Explorer 2 has audited and specified the necessary guards in every downstream subsystem:

| # | Subsystem / File | Location | Requirement & Guard Specification |
|---|------------------|----------|-----------------------------------|
| 1 | `src/lib/compliance.ts` | `calculateCompanyMetrics()` | Filter `employees.filter(e => (e as any).status !== 'PLECAT')` before accumulating total employees, valid count, and overdue alarms. Terminated staff MUST NOT drag down company score or trigger alerts. |
| 2 | `src/app/api/clients/[id]/employees/route.ts` | `GET` | Default query returns `where: { clientId: id, status: { not: 'PLECAT' } }`. Only returns terminated when explicitly requested via `?includeTerminated=true` or `?status=ALL`. |
| 3 | `src/app/documents/generate/page.tsx` | Client employee dropdown | Consumes `/api/clients/${id}/employees`. Since this endpoint defaults to active employees, the dropdown automatically excludes terminated workers. |
| 4 | `src/app/api/documents/generate-batch/route.ts` | Pre-generation guard | Query `prisma.employee.findMany({ where: { id: { in: employeeIds }, clientId } })`. Check `const terminated = employees.filter(e => e.status === 'PLECAT')`. If `terminated.length > 0`, return HTTP 400 Bad Request with descriptive message. |
| 5 | `src/lib/packages/bulk-packages.ts` | `generateEmployeeOnboardingZip` | Check `employee.status === 'PLECAT'`. If true, throw Error: `"Salariatul are contractul încetat (PLECAT). Pachetul de onboarding se emite exclusiv pentru angajați activi."` |
| 6 | `src/lib/packages/bulk-packages.ts` | `generateCompanyDossierZip` | In client include, specify `employees: { where: { status: { not: 'PLECAT' } }, include: { ... } }`. |
| 7 | `src/lib/templates/resolver.ts` | `loadResolverContext` | Context loader strictly validates `ctx.employeeId`. If an employee has `status === 'PLECAT'` and is passed to an active template without explicit override, flag or handle appropriately. |
| 8 | `src/app/employees/employee-registry-client.tsx` | UI Tabs & KPI Summary | Ensure KPI cards display metrics computed exclusively from active employees. Add status filter tab for `PLECAT` (Plecați / Arhivă) so historical records remain accessible. |

---

## 9. Error Response Catalog & HTTP Status Codes

All API endpoints must follow uniform JSON error formats matching project standards:

| Status Code | Scenario | JSON Response Body |
|-------------|----------|-------------------|
| `400 Bad Request` | Missing mandatory fields (`firstName`, `lastName`, `cnp`, `hireDate`, `leaveDate`) | `{"error": "Câmpurile Nume, Prenume, CNP și Data angajării sunt obligatorii."}` |
| `400 Bad Request` | Invalid CNP format (not 13 digits) | `{"error": "CNP-ul trebuie să conțină exact 13 cifre numerice."}` |
| `400 Bad Request` | Invalid date string or chronological inconsistency (`leaveDate < hireDate`) | `{"error": "Data plecării nu poate fi anterioară datei de angajare a salariatului."}` |
| `400 Bad Request` | Foreign key mismatch (Job or Worksite belongs to another company) | `{"error": "Funcția sau punctul de lucru selectat nu aparține acestei companii."}` |
| `400 Bad Request` | Batch generation requested for terminated employee | `{"error": "Nu se pot genera documente pentru salariați cu contractul încetat: Popescu Ion"}` |
| `404 Not Found` | Target `Client` or `Employee` does not exist | `{"error": "Salariatul cu ID-ul specificat nu a fost găsit."}` |
| `409 Conflict` | CNP collision within the same company | `{"error": "Există deja un salariat înregistrat cu acest CNP în cadrul acestei companii."}` |
| `500 Server Error` | Database error, unhandled exception | `{"error": "Eroare internă la salvarea datelor salariatului: <mesaj>"}` |

---

## 10. Implementation Plan & File Checklist for Builders

The implementation phase should proceed in the following modular order:

1. **Create `src/app/api/employees/route.ts`**:
   - Implements `POST /api/employees` (Feature 10).
   - Validates scalar fields, CNP uniqueness, and client foreign key.
   - Executes `prisma.$transaction` creating `Employee`, `IdentityDocument`, `ResidenceAddress`, and `EmploymentHistory`.
   - Emits `logAuditEvent`.
2. **Create `src/app/api/employees/[id]/route.ts`**:
   - Implements `GET /api/employees/[id]` (Feature 11).
   - Implements `PUT /api/employees/[id]` and `PATCH /api/employees/[id]` (Feature 11).
   - Handles relation upsert for `identityDocument` and `residenceAddress`.
   - Handles job/worksite transition in `employmentHistory`.
   - Emits `logAuditEvent`.
3. **Create `src/app/api/employees/[id]/terminate/route.ts`**:
   - Implements `POST /api/employees/[id]/terminate` (Feature 12).
   - Validates `leaveDate` and chronological consistency.
   - Updates `status: "PLECAT"`, sets `leaveDate`, closes `employmentHistory`.
   - Emits `logAuditEvent`.
4. **Update `src/app/api/clients/[id]/employees/route.ts`**:
   - Adds query parameter parsing (`includeTerminated`, `status`) (Feature 13).
   - Enforces default active filter (`where.status = { not: 'PLECAT' }`).
   - Expands relation selection (`identityDocument`, `residenceAddress`, statutory CIM fields).
5. **Update Downstream Guards (Feature 13)**:
   - `src/lib/compliance.ts`: add `status !== 'PLECAT'` filter in `calculateCompanyMetrics`.
   - `src/app/api/documents/generate-batch/route.ts`: add PLECAT pre-check.
   - `src/lib/packages/bulk-packages.ts`: enforce PLECAT exclusion in dossier and onboarding ZIPs.
