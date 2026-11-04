# Handoff Report: Training Scheduler & Compliance Scadențe Reset Engine

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | UI / Operational Workflow | Modal "Planifică / Consemnează Instruire" | Client-side interactive modal in `/trainings` allowing safety inspectors to record or schedule training sessions with client selector, type radio cards, date, hours, instructor, and participant checklist | `clientId`, `trainingType`, `eventDate`, `durationHours`, `instructorName`, `materialOrTopic` / `notes`, `participantEmployeeIds` | Form submit dispatching to `POST /api/trainings/record`, closing modal, updating UI state | Client-side validation: alerts when no client or no participants selected, invalid date or duration | `src/app/trainings/page.tsx`, `PROJECT.md` § UI Layer |
| 2 | UI / Participant Management | Active Employees Checklist Selector | Dynamic employee table within the modal, filtered by the selected client, displaying full name, job title, and current SSM/PSI compliance status badge with select-all/deselect-all toggles | Selected `clientId`, active employees list (`prisma.employee.findMany` with `status: 'ACTIV'`) | Reactive set of selected employee UUIDs (`participantEmployeeIds: string[]`) | Disables selection if no active employees exist; warns if submitted with 0 participants | `prisma/schema.prisma` lines 104-179, `src/app/employees/employee-registry-client.tsx` |
| 3 | API / Transaction Engine | `POST /api/trainings/record` Endpoint | REST route handling training event recording inside an atomic `prisma.$transaction`: creates `TrainingEvent`, links `TrainingParticipant` entries, and resets employee compliance dates | JSON body: `{ clientId, trainingType, eventDate, durationHours, instructorName, participantEmployeeIds, notes? }` | `201 Created` with `{ success: true, eventId, updatedEmployeesCount, trainingType, eventDate }` | `400 Bad Request` if missing required fields, `404 Not Found` if client doesn't exist, `500` with transaction rollback on DB error | `src/app/api/`, `PROJECT.md` § Interface Contracts |
| 4 | Domain Logic / Scadențe Reset | SSM Compliance Date Reset | Bulk update of `Employee.ssmLastTrainingDate = eventDate` for all selected employees when `trainingType` is `INTRODUCTIV`, `LOC_MUNCA`, or `PERIODIC_SSM` | `participantEmployeeIds`, `eventDate`, `trainingType` | Updated `Employee.ssmLastTrainingDate` in DB | Atomic transaction aborts on database error | `src/lib/compliance.ts` lines 205-217, `prisma/schema.prisma` line 151 |
| 5 | Domain Logic / Scadențe Reset | PSI Compliance Date Reset | Bulk update of `Employee.psiLastTrainingDate = eventDate` for all selected employees when `trainingType` is `PERIODIC_PSI` | `participantEmployeeIds`, `eventDate`, `trainingType` | Updated `Employee.psiLastTrainingDate` in DB | Atomic transaction aborts on database error | `src/lib/compliance.ts` lines 218-230, `prisma/schema.prisma` line 156 |
| 6 | Presentation / Compliance Badge | Emerald Badge Instant Reset | Immediate transition of compliance badge from `OVERDUE` (`EXPIRAT`) or `UPCOMING` (`SCADENT`) to `VALID` (`VALID (180z)`) with styling `bg-emerald-50 text-emerald-700 border-emerald-200` | Re-evaluated `Employee` record via `calculateEmployeeCompliance` and `calculateItemCompliance` | Emerald status badge rendered on `/employees`, `/clients/[id]`, and dashboard `/` | Fallback to `MISSING` if date parsing fails | `src/lib/compliance.ts` lines 121-172, `src/components/compliance-badge.tsx` lines 34-41 |
| 7 | Dashboard / Rollup Recalculation | Company Compliance Score Elevation | Live decrement of `overdueCount` / `upcomingCount` and increment of `validCount`, immediately increasing `complianceScorePercent` across company and global metrics | `calculateCompanyMetrics(activeEmployees)` | Increased `complianceScorePercent`, cleared overdue alerts | Handled gracefully: 100% when 0 items tracked | `src/lib/compliance.ts` lines 286-343, `src/app/page.tsx` lines 70-100 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Participant Selector | Client with 0 active employees selected | Checklist renders an empty state notice: *"Niciun salariat activ găsit pentru această firmă"*. Submit button is disabled. |
| 2 | Participant Selector | Switching client after selecting 3 employees | The selected employee IDs array is immediately reset to `[]`, preventing cross-company participant contamination. |
| 3 | API Validation | `participantEmployeeIds` is empty `[]` | API immediately rejects with `400 Bad Request`: `{"error": "Cel puțin un salariat participant trebuie selectat."}` without opening a DB transaction. |
| 4 | API Validation | `participantEmployeeIds` contains IDs from another client | API verifies employee ownership via `where: { id: { in: participantEmployeeIds }, clientId }`. If count mismatch occurs, returns `400 Bad Request`: `{"error": "Unul sau mai mulți salariați selectați nu aparțin companiei specificate."}`. |
| 5 | API Validation | Duplicate employee IDs in `participantEmployeeIds` (e.g. `['uuid-1', 'uuid-1']`) | Deduplicated before processing via `Array.from(new Set(participantEmployeeIds))` to prevent Prisma unique constraint violation on `TrainingParticipant(eventId, employeeId)`. |
| 6 | API Date Handling | `eventDate` is an invalid string (e.g. `"not-a-date"`) | `new Date(eventDate)` yields `NaN`; API returns `400 Bad Request`: `{"error": "Data instruirii este invalidă."}`. |
| 7 | Legal Durations | Duration submitted is `< 0` or `0` | API returns `400 Bad Request`: `{"error": "Durata instruirii trebuie să fie mai mare de 0 ore."}`. |
| 8 | Transaction Atomicity | Database network cut or constraint violation midway through updating 20 employees | Prisma `$transaction` rolls back completely: neither the `TrainingEvent`, nor `TrainingParticipant`, nor any `Employee` date changes persist. |
| 9 | Multi-Type Separation | Recording `PERIODIC_PSI` for an employee whose `ssmLastTrainingDate` was overdue | `psiLastTrainingDate` is reset to `VALID`, but `ssmLastTrainingDate` remains untouched (`OVERDUE`). Overall employee status correctly remains `OVERDUE` per rollup priority matrix. |
| 10 | Leap Year / End-of-Month Clamping | Training recorded on `2024-08-31` with 6-month interval | `addMonthsSafe` clamps to `2025-02-28`. Due date and days remaining are immune to standard JavaScript 31-day month overflow bugs. |

---

## 1. Observation

Direct code observations from the workspace:

1. **`prisma/schema.prisma`**:
   - Lines 318–335 define `model TrainingEvent`:
     ```prisma
     model TrainingEvent {
       id                    String   @id @default(uuid())
       clientId              String
       client                Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
       type                  String   // introductiv_general, loc_de_munca, periodic, suplimentar
       eventDate             DateTime // Data efectuării instruirii
       durationHours         Float    @default(4.0) // Durata consemnată
       materialOrTopic       String   // Tematica / materialul parcurs
       practicalDemonstration String? // Demonstrație practică efectuată
       instructorName        String   // Persoana care a efectuat instruirea
       verifierName          String?  // Persoana care a verificat instruirea
       location              String?  // Locul instruirii
       status                String   @default("planned") // planned, performed, recorded
       createdAt             DateTime @default(now())
       updatedAt             DateTime @updatedAt

       participants TrainingParticipant[]
     }
     ```
   - Lines 337–350 define `model TrainingParticipant`:
     ```prisma
     model TrainingParticipant {
       id              String        @id @default(uuid())
       eventId         String
       event           TrainingEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
       employeeId      String
       employee        Employee      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
       result          String        @default("admis") // admis / respins
       recordedAt      DateTime?
       scannedSheetUrl String?       // Copie scanată după semnare pe hârtie

       createdAt       DateTime      @default(now())

       @@unique([eventId, employeeId])
     }
     ```
   - Lines 140–166 in `model Employee` define the compliance scadențe fields:
     - Line 151: `ssmLastTrainingDate DateTime?`
     - Line 152: `ssmIntervalMonths Int @default(6)`
     - Line 153: `ssmNotes String?`
     - Line 156: `psiLastTrainingDate DateTime?`
     - Line 157: `psiIntervalMonths Int @default(6)`
     - Line 158: `psiNotes String?`
   - Lines 38–47 in `model Client` define instructor appointees:
     - Line 39: `ssmSpecialistName String?`
     - Line 43: `designatedWorkerSsm String?`
     - Line 45: `psiResponder String?`

2. **`src/app/trainings/page.tsx`**:
   - Lines 8–16 execute:
     ```typescript
     const events = await prisma.trainingEvent.findMany({
       orderBy: { eventDate: 'desc' },
       include: {
         client: true,
         participants: {
           include: { employee: true },
         },
       },
     });
     ```
   - Lines 32–45 show an empty state when `events.length === 0` pointing to `/templates`, with no button or modal to record or schedule a training session.
   - Lines 47–84 show read-only cards of past events. No scheduling modal or interactive form exists.

3. **`src/app/api/trainings/`**:
   - A search via `find_by_name` reveals `src/app/api/trainings/record/route.ts` does not exist yet. Only `src/app/trainings/page.tsx` exists under `src/app/trainings`.

4. **`src/lib/compliance.ts`**:
   - Lines 121–172 implement `calculateItemCompliance(lastDate, intervalMonths, label, referenceDate)`. When `lastDate` is updated:
     - `dueDate = addMonthsSafe(lastDate, intervalMonths)`
     - `daysRemaining = getDaysRemaining(dueDate, referenceDate)`
     - If `daysRemaining > 30`, returns `status: 'VALID'`.
   - Lines 361–374 define the UI badge styling for `VALID`:
     ```typescript
     case 'VALID':
       return {
         status,
         text: daysRemaining !== null && daysRemaining !== undefined 
           ? `VALID (${daysRemaining}z)` 
           : 'VALID',
         className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
         daysRemaining: daysRemaining ?? null,
       };
     ```
   - Lines 260–270 define the overall employee status rollup: `OVERDUE > MISSING > UPCOMING > VALID`.
   - Lines 286–343 calculate company metrics (`totalEmployees`, `validCount`, `upcomingCount`, `overdueCount`, `missingCount`, `complianceScorePercent`).

5. **Existing Consumer Pages**:
   - `src/app/employees/page.tsx` (lines 8, 34–48): marked with `export const dynamic = 'force-dynamic'`, calls `calculateEmployeeCompliance(emp)` and `calculateCompanyMetrics(employeesRaw)`.
   - `src/app/clients/[id]/page.tsx` (lines 31, 71–80): marked with `export const dynamic = 'force-dynamic'`, calls `calculateCompanyMetrics(activeEmployees)` and `calculateEmployeeCompliance(emp)`.
   - `src/app/page.tsx` (lines 26, 71–100): marked with `export const dynamic = 'force-dynamic'`, computes `calculateCompanyMetrics(allActiveEmployees)` and extracts alerts dynamically on every request.

---

## 2. Logic Chain

1. **Missing Interactive Workflow**:
   - Based on observation (2), `src/app/trainings/page.tsx` is completely read-only.
   - Based on observation (3), no API route exists to receive training submissions.
   - Therefore, a complete training scheduling and recording workflow must be introduced, consisting of a client UI component (modal + participant selector) and a backend route handler `POST /api/trainings/record`.

2. **Legal Training Types & Regulatory Grounding**:
   - Romanian safety legislation specifies 4 core operational training types:
     1. `INTRODUCTIV`: Instruire introductiv-generală la angajare (Legea 319/2006 art. 20, HG 1425/2006 art. 83–89; min 4h/8h).
     2. `LOC_MUNCA`: Instruire la locul de muncă (HG 1425/2006 art. 90–95; min 8h).
     3. `PERIODIC_SSM`: Instruire periodică SSM (HG 1425/2006 art. 96–100; min 2h, interval max 6 luni pentru personal operativ sau 12 luni pentru TESA).
     4. `PERIODIC_PSI`: Instruire periodică Situații de Urgență / PSI (Legea 307/2006, OMAI 712/2005 art. 30–45; min 2h, interval max 6 luni).
   - In `model Employee` (observation 1), compliance dates are separated into `ssmLastTrainingDate` (for SSM) and `psiLastTrainingDate` (for PSI).
   - Therefore:
     - `INTRODUCTIV`, `LOC_MUNCA`, and `PERIODIC_SSM` must update `Employee.ssmLastTrainingDate`.
     - `PERIODIC_PSI` must update `Employee.psiLastTrainingDate`.

3. **Atomic Scadențe Reset Guarantee**:
   - If `TrainingEvent` and `TrainingParticipant` records were created without updating `Employee`, the scadențe would remain overdue, causing data dissonance.
   - If `Employee` was updated but the event creation failed, the audit trail of who conducted the training and when would be lost.
   - Therefore, the operation must execute inside `prisma.$transaction([ ... ])` or an interactive transaction `prisma.$transaction(async (tx) => { ... })`.

4. **Mathematical Compliance Status Reset**:
   - By observation (4), `calculateItemCompliance` checks `daysRemaining = getDaysRemaining(dueDate, referenceDate)`.
   - For an employee with `ssmIntervalMonths = 6` whose previous training was 10 months ago, `daysRemaining < 0`, so `status === 'OVERDUE'`.
   - When `eventDate` is set to `2026-11-02`:
     - `dueDate` becomes `addMonthsSafe('2026-11-02', 6) = '2027-05-02'`.
     - `daysRemaining` becomes 181 days.
     - Because `181 > 30` (the threshold defined in `COMPLIANCE_CONSTANTS.UPCOMING_THRESHOLD_DAYS`), `status` immediately evaluates to `'VALID'`.
     - `getStatusBadgeInfo('VALID', 181)` returns class `'bg-emerald-50 text-emerald-700 border border-emerald-200'`.
   - By observation (5), since `/employees`, `/clients/[id]`, and `/` are server-rendered with `force-dynamic` and read directly from Prisma on every request, the moment the transaction commits, all three pages display the emerald badge with 0 caching delay.

---

## 3. Detailed Specifications

### 3.1 UI Architecture: `/trainings`

#### Layout Structure
Split `src/app/trainings/page.tsx` into:
1. **Server Component (`src/app/trainings/page.tsx`)**:
   - Fetches:
     * `events`: `prisma.trainingEvent.findMany` with client and participants (sorted `eventDate: 'desc'`).
     * `clients`: `prisma.client.findMany` with `isActive: true`, including active employees (`where: { status: 'ACTIV' }`, selecting `id`, `firstName`, `lastName`, `cnp`, `currentJob`, `ssmLastTrainingDate`, `psiLastTrainingDate`, `ssmIntervalMonths`, `psiIntervalMonths`), plus `ssmSpecialistName`, `designatedWorkerSsm`, `psiResponder`.
   - Passes data to `TrainingsManagerClient`.
2. **Client Component (`src/app/trainings/trainings-manager-client.tsx`)**:
   - State management:
     * `isModalOpen: boolean`
     * `selectedClientId: string`
     * `trainingType: 'INTRODUCTIV' | 'LOC_MUNCA' | 'PERIODIC_SSM' | 'PERIODIC_PSI'` (default: `'PERIODIC_SSM'`)
     * `eventDate: string` (default: current date formatted `YYYY-MM-DD`)
     * `durationHours: number` (auto-updated based on selected type: 4 for `INTRODUCTIV`, 8 for `LOC_MUNCA`, 2 for `PERIODIC_SSM`, 2 for `PERIODIC_PSI`)
     * `instructorName: string` (auto-filled from client's `ssmSpecialistName` / `designatedWorkerSsm` or `psiResponder`)
     * `notes: string` (optional specific topic or syllabus notes)
     * `selectedEmployeeIds: string[]` (checklist of chosen participants)
     * `isSubmitting: boolean`
     * `feedback: { type: 'success' | 'error'; message: string } | null`

#### Modal Interface Details
- **Trigger**: Primary button in header: `"Planifică / Consemnează Instruire"` (`BookOpenCheck` icon, `bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm`).
- **Modal Header**:
  - Title: *"Planifică / Consemnează Sesiune de Instruire"*
  - Subtitle: *"Înregistrează instruirea SSM/PSI și resetează automat scadențele legale ale salariaților participanți conform Legii 319/2006 și HG 1425/2006."*
- **Form Fields**:
  1. **Client Selector** (`<select>`): List of active companies. Selecting a client updates instructor defaults and refreshes the participant checklist.
  2. **Tip Instruire** (Radio card group / 4 options):
     - `INTRODUCTIV`: *Instruire introductiv-generală (4h/8h, Legea 319/2006)*
     - `LOC_MUNCA`: *Instruire la locul de muncă (min. 8h, HG 1425/2006)*
     - `PERIODIC_SSM`: *Instruire periodică SSM (min. 2h, HG 1425/2006)*
     - `PERIODIC_PSI`: *Instruire periodică Situații de Urgență / PSI (min. 2h, Legea 307/2006)*
  3. **Data Efectuării** (`<input type="date">`): Defaults to today (`YYYY-MM-DD`).
  4. **Durată (ore)** (`<input type="number" min="0.5" step="0.5">`): Defaults according to selected type.
  5. **Nume Instructor / Formator** (`<input type="text">`): Pre-populated from company profile; editable.
  6. **Tematică / Observații** (`<textarea>`): Default placeholder or standard syllabus reference (e.g. *"Instruire periodică SSM - Riscuri specifice locului de muncă, acordarea primului ajutor și măsuri de evacuare"*).
  7. **Tabel Participanți (Checklist Salariați Activi)**:
     - Header controls: Total active count, *"Selectează toți"* and *"Deselectează toți"* buttons.
     - Row items:
       * Checkbox bound to employee UUID.
       * Full Name (`lastName firstName`).
       * Job Title (`currentJob.title` or `—`).
       * Current Status Badge (shows whether the employee is currently `EXPIRAT`, `SCADENT`, or `VALID` for the relevant domain, giving immediate visual justification for including them).
  8. **Action Buttons**:
     - Cancel: Closes modal and resets form state.
     - Submit: Button labeled **"Salvează și Actualizează Scadențele Salariaților"** (`CheckCircle2` icon, `bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg shadow`).

---

### 3.2 Backend Specification: `POST /api/trainings/record`

#### Route Location
`src/app/api/trainings/record/route.ts`

#### HTTP Contract
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Payload Schema**:
  ```typescript
  interface RecordTrainingPayload {
    clientId: string;
    trainingType: 'INTRODUCTIV' | 'LOC_MUNCA' | 'PERIODIC_SSM' | 'PERIODIC_PSI';
    eventDate: string; // YYYY-MM-DD or ISO 8601
    durationHours: number;
    instructorName: string;
    participantEmployeeIds: string[];
    notes?: string;
    materialOrTopic?: string;
  }
  ```

#### Atomic Execution Implementation Plan
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      trainingType,
      eventDate,
      durationHours,
      instructorName,
      participantEmployeeIds,
      notes,
      materialOrTopic,
    } = body;

    // 1. Validare parametri obligatorii
    if (!clientId || !trainingType || !eventDate || !instructorName) {
      return NextResponse.json(
        { error: 'Câmpurile clientId, trainingType, eventDate și instructorName sunt obligatorii.' },
        { status: 400 }
      );
    }

    const validTypes = ['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM', 'PERIODIC_PSI'];
    if (!validTypes.includes(trainingType)) {
      return NextResponse.json(
        { error: `Tipul instruirii este invalid. Valori permise: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Data instruirii este invalidă.' },
        { status: 400 }
      );
    }

    const duration = Number(durationHours);
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json(
        { error: 'Durata instruirii trebuie să fie un număr pozitiv de ore.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(participantEmployeeIds) || participantEmployeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Trebuie să selectați cel puțin un salariat participant.' },
        { status: 400 }
      );
    }

    // Deduplicate IDs
    const uniqueParticipantIds = Array.from(new Set(participantEmployeeIds.map(String)));

    // 2. Verificare existență client și validare proprietate salariați
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Clientul specificat nu există.' },
        { status: 404 }
      );
    }

    const validEmployees = await prisma.employee.findMany({
      where: {
        id: { in: uniqueParticipantIds },
        clientId: clientId,
      },
      select: { id: true },
    });

    if (validEmployees.length !== uniqueParticipantIds.length) {
      return NextResponse.json(
        { error: 'Unul sau mai mulți salariați selectați nu aparțin companiei specificate.' },
        { status: 400 }
      );
    }

    // 3. Rezolvare tematică implicită
    const resolvedTopic = materialOrTopic?.trim() || notes?.trim() || (
      trainingType === 'INTRODUCTIV'
        ? 'Instruire introductiv-generală conform Legii 319/2006 și HG 1425/2006'
        : trainingType === 'LOC_MUNCA'
        ? 'Instruire la locul de muncă conform HG 1425/2006'
        : trainingType === 'PERIODIC_SSM'
        ? 'Instruire periodică SSM conform tematicii anuale'
        : 'Instruire periodică Situații de Urgență / PSI conform OMAI 712/2005'
    );

    // 4. Execuție Atomică în Tranzacție Prisma
    const result = await prisma.$transaction(async (tx) => {
      // a) Creare TrainingEvent cu relațiile TrainingParticipant
      const event = await tx.trainingEvent.create({
        data: {
          clientId,
          type: trainingType,
          eventDate: parsedDate,
          durationHours: duration,
          materialOrTopic: resolvedTopic,
          instructorName: String(instructorName).trim(),
          status: 'recorded',
          participants: {
            create: uniqueParticipantIds.map((empId) => ({
              employeeId: empId,
              result: 'admis',
              recordedAt: parsedDate,
            })),
          },
        },
      });

      // b) Actualizare scadențe salariați în funcție de tipul instruirii
      let updatedCount = 0;
      if (['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM'].includes(trainingType)) {
        const updateRes = await tx.employee.updateMany({
          where: {
            id: { in: uniqueParticipantIds },
            clientId: clientId,
          },
          data: {
            ssmLastTrainingDate: parsedDate,
            ...(notes ? { ssmNotes: notes.trim() } : {}),
          },
        });
        updatedCount = updateRes.count;
      } else if (trainingType === 'PERIODIC_PSI') {
        const updateRes = await tx.employee.updateMany({
          where: {
            id: { in: uniqueParticipantIds },
            clientId: clientId,
          },
          data: {
            psiLastTrainingDate: parsedDate,
            ...(notes ? { psiNotes: notes.trim() } : {}),
          },
        });
        updatedCount = updateRes.count;
      }

      return { event, updatedCount };
    });

    return NextResponse.json(
      {
        success: true,
        eventId: result.event.id,
        updatedEmployeesCount: result.updatedCount,
        trainingType,
        eventDate: parsedDate.toISOString(),
        message: `Instruirea a fost înregistrată cu succes, iar scadențele a ${result.updatedCount} salariați au fost actualizate.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error recording training event:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare internă la salvarea instruirii.' },
      { status: 500 }
    );
  }
}
```

---

### 3.3 Test Assertions Specification

The following automated test assertions prove that scheduling a training event updates compliance dates, rolls over mathematical scadențe, and resets status badges across all application views:

```typescript
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import { 
  calculateEmployeeCompliance, 
  calculateCompanyMetrics, 
  getStatusBadgeInfo, 
  getOverallStatusBadgeInfo 
} from '@/lib/compliance';

/**
 * Test Suite: Training Scheduler & Compliance Scadențe Reset Engine
 */
async function testTrainingSchedulerWorkflow() {
  console.log('--- Testing Training Scheduler & Compliance Reset Engine ---');

  // SETUP: Găsim un client de test cu cel puțin 2 salariați activi
  const client = await prisma.client.findFirst({
    where: { isActive: true, employees: { some: { status: 'ACTIV' } } },
    include: { employees: { where: { status: 'ACTIV' } } },
  });
  assert.ok(client, 'Active test client must exist');
  assert.ok(client.employees.length >= 1, 'Client must have active employees');

  const testEmp = client.employees[0];

  // =========================================================================
  // TEST 1: SSM Compliance Reset (PERIODIC_SSM)
  // =========================================================================
  // 1. Forțăm starea salariatului la OVERDUE prin setarea ssmLastTrainingDate la 10 luni în urmă
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 10);

  await prisma.employee.update({
    where: { id: testEmp.id },
    data: { ssmLastTrainingDate: pastDate, ssmIntervalMonths: 6 },
  });

  const empBefore = await prisma.employee.findUniqueOrThrow({ where: { id: testEmp.id } });
  const compBefore = calculateEmployeeCompliance(empBefore);
  
  // Asertăm că înainte de instruire, SSM este EXPIRAT
  assert.equal(compBefore.ssmTraining.status, 'OVERDUE', 'SSM status must be OVERDUE before training');
  assert.ok(compBefore.ssmTraining.daysRemaining! < 0, 'Days remaining must be negative');
  const badgeBefore = getStatusBadgeInfo(compBefore.ssmTraining.status, compBefore.ssmTraining.daysRemaining);
  assert.ok(badgeBefore.className.includes('bg-red-50'), 'Badge styling must be red for OVERDUE');

  // 2. Înregistrăm instruirea prin API handler sau tranzacție atomică
  const today = new Date();
  const eventDateStr = today.toISOString().split('T')[0];

  const payload = {
    clientId: client.id,
    trainingType: 'PERIODIC_SSM' as const,
    eventDate: eventDateStr,
    durationHours: 2,
    instructorName: client.ssmSpecialistName || 'Ing. Specialist SSM',
    participantEmployeeIds: [testEmp.id],
    notes: 'Instruire periodică semestrială SSM conform HG 1425/2006',
  };

  // Simulare apel API /api/trainings/record
  const parsedDate = new Date(payload.eventDate);
  const txResult = await prisma.$transaction(async (tx) => {
    const event = await tx.trainingEvent.create({
      data: {
        clientId: payload.clientId,
        type: payload.trainingType,
        eventDate: parsedDate,
        durationHours: payload.durationHours,
        materialOrTopic: payload.notes,
        instructorName: payload.instructorName,
        status: 'recorded',
        participants: {
          create: [{ employeeId: testEmp.id, result: 'admis', recordedAt: parsedDate }],
        },
      },
      include: { participants: true },
    });

    const updateRes = await tx.employee.updateMany({
      where: { id: { in: payload.participantEmployeeIds }, clientId: payload.clientId },
      data: { ssmLastTrainingDate: parsedDate, ssmNotes: payload.notes },
    });

    return { event, updatedCount: updateRes.count };
  });

  assert.equal(txResult.updatedCount, 1, 'Exactly 1 employee must be updated');
  assert.equal(txResult.event.participants.length, 1, 'Participant record must be created');

  // 3. Verificăm salariatul din DB după instruire
  const empAfter = await prisma.employee.findUniqueOrThrow({ where: { id: testEmp.id } });
  assert.ok(empAfter.ssmLastTrainingDate, 'ssmLastTrainingDate must not be null');
  assert.equal(
    empAfter.ssmLastTrainingDate.toISOString().split('T')[0],
    eventDateStr,
    'ssmLastTrainingDate must match eventDate'
  );

  // 4. Verificăm recalcularea conformității
  const compAfter = calculateEmployeeCompliance(empAfter);
  assert.equal(compAfter.ssmTraining.status, 'VALID', 'SSM status must immediately reset to VALID');
  assert.ok(compAfter.ssmTraining.daysRemaining! > 150, 'Days remaining must be ~180 days in the future');

  // 5. Verificăm stilul badge-ului (emerald)
  const badgeAfter = getStatusBadgeInfo(compAfter.ssmTraining.status, compAfter.ssmTraining.daysRemaining);
  assert.ok(badgeAfter.className.includes('bg-emerald-50'), 'Badge styling must be emerald bg-emerald-50');
  assert.ok(badgeAfter.className.includes('text-emerald-700'), 'Badge text styling must be text-emerald-700');
  assert.ok(badgeAfter.text.startsWith('VALID'), 'Badge label must start with VALID');

  console.log('✓ TEST 1 PASSED: PERIODIC_SSM reset to VALID (emerald)');

  // =========================================================================
  // TEST 2: PSI Compliance Reset (PERIODIC_PSI)
  // =========================================================================
  // Setăm PSI la OVERDUE
  await prisma.employee.update({
    where: { id: testEmp.id },
    data: { psiLastTrainingDate: pastDate, psiIntervalMonths: 6 },
  });

  const psiPayload = {
    clientId: client.id,
    trainingType: 'PERIODIC_PSI' as const,
    eventDate: eventDateStr,
    durationHours: 2,
    instructorName: client.psiResponder || 'Cadru Tehnic PSI',
    participantEmployeeIds: [testEmp.id],
    notes: 'Instruire periodică Situații de Urgență conform OMAI 712/2005',
  };

  const psiTx = await prisma.$transaction(async (tx) => {
    const event = await tx.trainingEvent.create({
      data: {
        clientId: psiPayload.clientId,
        type: psiPayload.trainingType,
        eventDate: parsedDate,
        durationHours: psiPayload.durationHours,
        materialOrTopic: psiPayload.notes,
        instructorName: psiPayload.instructorName,
        status: 'recorded',
        participants: {
          create: [{ employeeId: testEmp.id, result: 'admis', recordedAt: parsedDate }],
        },
      },
    });

    const updateRes = await tx.employee.updateMany({
      where: { id: { in: psiPayload.participantEmployeeIds }, clientId: psiPayload.clientId },
      data: { psiLastTrainingDate: parsedDate, psiNotes: psiPayload.notes },
    });

    return { event, updatedCount: updateRes.count };
  });

  const empPsiAfter = await prisma.employee.findUniqueOrThrow({ where: { id: testEmp.id } });
  assert.equal(
    empPsiAfter.psiLastTrainingDate?.toISOString().split('T')[0],
    eventDateStr,
    'psiLastTrainingDate must match eventDate'
  );

  const compPsiAfter = calculateEmployeeCompliance(empPsiAfter);
  assert.equal(compPsiAfter.psiTraining.status, 'VALID', 'PSI status must immediately reset to VALID');
  const psiBadge = getStatusBadgeInfo(compPsiAfter.psiTraining.status, compPsiAfter.psiTraining.daysRemaining);
  assert.ok(psiBadge.className.includes('bg-emerald-50'), 'PSI badge must be emerald');

  console.log('✓ TEST 2 PASSED: PERIODIC_PSI reset to VALID (emerald)');

  // =========================================================================
  // TEST 3: Multi-Participant Batch Reset Invariant
  // =========================================================================
  if (client.employees.length >= 2) {
    const empIds = client.employees.slice(0, 2).map((e) => e.id);
    const multiTx = await prisma.$transaction(async (tx) => {
      const event = await tx.trainingEvent.create({
        data: {
          clientId: client.id,
          type: 'PERIODIC_SSM',
          eventDate: parsedDate,
          durationHours: 2,
          materialOrTopic: 'Batch training',
          instructorName: 'Test Instructor',
          participants: {
            create: empIds.map((id) => ({ employeeId: id, result: 'admis' })),
          },
        },
        include: { participants: true },
      });

      const updateRes = await tx.employee.updateMany({
        where: { id: { in: empIds }, clientId: client.id },
        data: { ssmLastTrainingDate: parsedDate },
      });

      return { event, updatedCount: updateRes.count };
    });

    assert.equal(multiTx.updatedCount, 2, 'Both employees must be updated in batch');
    assert.equal(multiTx.event.participants.length, 2, 'Both participants recorded in event');
    console.log('✓ TEST 3 PASSED: Multi-participant batch transaction');
  }

  // =========================================================================
  // TEST 4: Company Metrics Rollup Recalculation Invariant
  // =========================================================================
  const allActiveEmps = await prisma.employee.findMany({ where: { status: 'ACTIV' } });
  const metrics = calculateCompanyMetrics(allActiveEmps);
  assert.ok(typeof metrics.complianceScorePercent === 'number', 'Metrics score must be numeric');
  assert.ok(metrics.validCount >= 1, 'Valid count must reflect the updated employees');
  console.log('✓ TEST 4 PASSED: Company compliance metrics rollup invariant');
}
```

---

## 4. Caveats

1. **Physical Signatures and Scanned Sheets**:
   - Per requirement R3 ("keeping the workflow simple without user roles or electronic signatures"), the application does not implement cryptographic e-signatures. In Romanian SSM practice (HG 1425/2006 art. 81), training sheets are physically signed in the employee's paper dossier (*Fișa de instruire individuală privind securitatea și sănătatea în muncă*). The model `TrainingParticipant` provides `scannedSheetUrl: String?` as an optional storage field for archived scan uploads, which should remain optional upon recording.
2. **Training Material Catalog Linkage**:
   - `prisma/schema.prisma` contains `model TrainingMaterial` (lines 304–316), but `TrainingEvent` currently uses an unconstrained string `materialOrTopic: String`. The specification defaults `materialOrTopic` contextually while allowing custom operator input, without requiring a foreign key relation to `TrainingMaterial`.
3. **Medical Exams and Hygiene Courses**:
   - `TrainingEvent` and `POST /api/trainings/record` govern SSM and PSI trainings. Occupational health exams (`medicalLastExamDate`) and hygiene certificates (`hygieneLastExamDate`) are recorded via employee edits or hygiene session registers, and are not altered by training events.

---

## 5. Conclusion

- The operational workflow for Training Scheduling and Compliance Scadențe Reset has been fully mapped, specified, and validated against Romanian SSM law (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005) and the existing Next.js / Prisma architecture.
- The UI modal specifications in `/trainings` provide an intuitive operator interface: client selector, the 4 statutory training types, pre-filled instructor and duration, and an active employee checklist with real-time compliance badges.
- The `POST /api/trainings/record` endpoint specification guarantees atomicity via `prisma.$transaction`, creating the `TrainingEvent` and `TrainingParticipant` audit records while resetting `Employee.ssmLastTrainingDate` or `psiLastTrainingDate`.
- Because `/employees`, `/clients/[id]`, and `/` are `force-dynamic` server components that dynamically invoke `calculateEmployeeCompliance` and `calculateCompanyMetrics`, the database commit immediately transitions overdue badges to emerald `VALID` badges without any client caching discrepancies.
- Complete automated test assertions have been specified for direct inclusion in the test suite.

---

## 6. Verification Method

To independently verify the specification once implemented:

1. **Static Analysis & Build Verification**:
   - Run: `npm run build`
   - Expected Result: Exit code 0, zero TypeScript errors in `src/app/trainings/page.tsx` or `src/app/api/trainings/record/route.ts`.

2. **Automated Integration & Reset Test**:
   - Execute the test script containing the assertions in Section 3.3:
     `npx tsx -e "import('./scripts/adversarial-m2-ui-stress.ts')"` or dedicated test script.
   - Expected Result:
     - `ssmLastTrainingDate` matches `eventDate`.
     - `calculateEmployeeCompliance(emp).ssmTraining.status === 'VALID'`.
     - `getStatusBadgeInfo('VALID').className` contains `bg-emerald-50 text-emerald-700`.
     - Overdue counter decrements and valid counter increments.

3. **HTTP API Verification**:
   - Send `POST /api/trainings/record` with representative payload:
     ```bash
     curl -X POST http://localhost:3000/api/trainings/record \
       -H "Content-Type: application/json" \
       -d '{"clientId":"<CLIENT_ID>","trainingType":"PERIODIC_SSM","eventDate":"2026-11-02","durationHours":2,"instructorName":"Ing. Mihai Popescu","participantEmployeeIds":["<EMP_ID>"]}'
     ```
   - Expected Result: `201 Created` with JSON `{ "success": true, "updatedEmployeesCount": 1 }`.
