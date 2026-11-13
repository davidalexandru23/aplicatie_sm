# Handoff Report: Milestone 3 Explorer 1 — Backend Training APIs & Statutory Docs

**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_1`  
**Date**: 2026-11-11  
**Author**: `explorer_1` (Milestone 3 Sub-Orchestration)  
**Target Audience**: `sub_orch_m3`, `worker`

---

## 1. Observation

### 1.1 Prisma Schema (`prisma/schema.prisma`)
1. **`TrainingEvent` (lines 437–454)**:
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
2. **`TrainingParticipant` (lines 456–469)**:
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
3. **`Employee` relations and training deadlines (lines 240–249, 291)**:
   - `ssmLastTrainingDate`: `DateTime?`
   - `ssmIntervalMonths`: `Int @default(6)`
   - `ssmNotes`: `String?`
   - `psiLastTrainingDate`: `DateTime?`
   - `psiIntervalMonths`: `Int @default(6)`
   - `psiNotes`: `String?`
   - `trainingParticipants`: `TrainingParticipant[]`
4. **`GeneratedDocument` (lines 546–556)**:
   - Already contains `eventId String?` (line 553).

### 1.2 Training Recording API (`src/app/api/trainings/record/route.ts`)
1. **Date Validation & Future Date Rejection (lines 43–50)**:
   ```typescript
   const now = new Date();
   const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
   if (parsedDate.getTime() > endOfToday.getTime()) {
     return NextResponse.json(
       { error: 'Data instruirii nu poate fi în viitor.' },
       { status: 400 }
     );
   }
   ```
   *Direct finding*: Rejects every request with date > end of today with HTTP 400, completely blocking future training session scheduling.
2. **Handling of `status` (lines 114–130)**:
   - `status` is **not extracted** from the request body at all (`body` destructuring only takes `clientId, trainingType, eventDate, durationHours, instructorName, participantEmployeeIds, notes, materialOrTopic`).
   - Line 121 explicitly hardcodes `status: 'recorded'`.
   - Lines 134–158: The transaction **unconditionally updates** `ssmLastTrainingDate` or `psiLastTrainingDate` on participating employees. Even if future dates were allowed, creating a planned session would prematurely update employee compliance dates before the training actually happens.
3. **Accepted Payload Fields vs Contract**:
   - Accepts: `clientId`, `trainingType`, `eventDate`, `durationHours`, `instructorName`, `participantEmployeeIds`, `notes`, `materialOrTopic`.
   - Does NOT accept contract aliases specified in `SCOPE.md`: `type`, `date`, `trainerName`, `trainerRole`, `participantIds`, `topicsCovered`, `status`.
4. **Response Format (lines 182–191)**:
   - Currently returns `{ success: true, eventId, updatedEmployeesCount, trainingType, eventDate, message }`.
   - Contract in `SCOPE.md` specifies returning `{ success: true, event: TrainingEvent & { participants: TrainingParticipant[] } }`.
5. **Additional routes under `src/app/api/trainings/`**:
   - `find src/app/api/trainings` returned only `src/app/api/trainings/record/route.ts`.
   - There is NO `src/app/api/trainings/documents/route.ts` or general `GET /api/trainings`.

### 1.3 Document Generation Pipeline & Statutory Training Documents
1. **Document Generation Endpoint (`src/app/api/documents/generate/route.ts`)**:
   - Accepts: `templateCode`, `clientId`, `employeeId`, `jobId`, `worksiteId`, `hygieneSessionId`, `hygieneParticipantId`, `customFields`, `operatorName`.
   - Does NOT accept `trainingEventId` or `eventId`.
2. **Placeholder Resolver (`src/lib/templates/resolver.ts`)**:
   - `TemplateResolutionContext` interface (lines 15–25) does NOT include `trainingEventId` or `eventId`.
   - **Substitution with `hireDate` (lines 1631–1632, 2101–2102)**:
     ```typescript
     PLACEHOLDER_DATA_INSTRUIRE_IG: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
     PLACEHOLDER_DATA_INSTRUIRE_LM: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
     ```
     Real event dates from `TrainingEvent` / `TrainingParticipant` (`type === 'INTRODUCTIV'`, `type === 'LOC_MUNCA'`) are never used.
   - **Broken Periodic Event Population (lines 1314–1316, 1367–1369)**:
     ```typescript
     const ssmEvents = ((client?.trainingEvents || []) as any[]).filter(
       (e: any) => !e.type || e.type === 'ssm'
     );
     ...
     const psiEvents = ((client?.trainingEvents || []) as any[]).filter(
       (e: any) => e.type === 'psi' || e.type === 'su'
     );
     ```
     - Does not query `TrainingParticipant`: all client events are shown on every employee's sheet regardless of whether the employee participated.
     - Type mismatch: filters on `e.type === 'ssm'` and `e.type === 'psi'`, whereas `route.ts` writes `'PERIODIC_SSM'` and `'PERIODIC_PSI'`. As a result, recorded periodic trainings never appear in the sheet tables!
3. **Templates on Disk (`templates_registry/normalized/`) & Catalog (`src/lib/templates/definitions.ts`)**:
   - `ssm-fisa-instruire-individuala` (code 26) and `psi-fisa-instructaj-individuala` (code 27) exist.
   - `ssm-pv-instruire-colectiva` and `psi-pv-instruire` **DO NOT EXIST** in `templates_registry/normalized/` and **DO NOT EXIST** in `TEMPLATE_CATALOG`.

### 1.4 Expired Training Blocking (Catch-22) (Feature 18)
1. **`src/app/documents/generate/page.tsx` (lines 122–165)**:
   ```typescript
   if (code.includes('ssm') || code.includes('instruire') || code === 'training-detaliu-introductiv' || code === 'training-tematica-loc-munca') {
     const ssm = employee.compliance.ssmTraining;
     if (ssm && ssm.status === 'OVERDUE') {
       return {
         isExpired: true,
         badgeText: `Expirat (${days} zile)`,
         reason: `Instructaj SSM depășit la data de ${dueStr} (HG 1425/2006). Conform legii, documentul nu poate fi emis înainte de reinstruire.`,
       };
     }
   }
   ```
   When `isExpired: true`:
   - Line 1388: Single-document generate button is disabled.
   - Lines 992, 1000–1014: In batch mode, the employee checkbox is disabled and dimmed (`cursor-not-allowed select-none`).
2. **`src/app/api/documents/generate-batch/route.ts` (lines 39–59)**:
   Explicitly checks `if (compliance.ssmTraining.status === 'OVERDUE') return { isExpired: true, reason: ... }`, completely rejecting batch generation of training sheets for overdue employees.

### 1.5 UI Session Cards (`src/app/trainings/page.tsx`) & Modal (`src/components/training-planner-modal.tsx`)
1. **`src/app/trainings/page.tsx` (lines 92–140)**:
   - Training session cards display date, duration, participants count, instructor, and status (`recorded`).
   - Cards have **zero action buttons or download shortcuts** (Feature 17 gap).
2. **`src/components/training-planner-modal.tsx` (line 354)**:
   - `<input type="date" required max={new Date().toISOString().split('T')[0]} ... />` explicitly restricts date selection to today or earlier.
   - Form lacks a selector for "Planificare sesiune viitoare" (`status: "planned"`) vs "Consemnare instruire efectuată" (`status: "completed"`).

---

## 2. Logic Chain

1. **Observation 1.1** establishes that the Prisma schema is already equipped with `TrainingEvent`, `TrainingParticipant`, `status` (`@default("planned")`), and `GeneratedDocument.eventId`. Thus, NO schema migrations or table alterations are required.
2. **Observation 1.2.1** demonstrates that `route.ts:45` checks `parsedDate.getTime() > endOfToday.getTime()` and throws HTTP 400. In conjunction with **Observation 1.5.2** (`max={today}` in the modal), any attempt to schedule a future session fails at both frontend and backend levels, violating Feature 16.
3. **Observation 1.2.2** shows that `route.ts` unconditionally resets `ssmLastTrainingDate` / `psiLastTrainingDate`. If a future session were scheduled with `status: "planned"`, resetting compliance immediately would falsely indicate that the employee is currently compliant, which violates Romanian statutory rules (HG 1425/2006 & OMAI 712/2005). Therefore, compliance date updates must execute ONLY when `status === 'completed'` (or `'recorded'`) and `date <= now`.
4. **Observation 1.3.2** demonstrates that `resolver.ts` falls back to `employee.hireDate` for introductory and on-the-job training dates, and filters periodic events on `'ssm'` and `'psi'` instead of `'PERIODIC_SSM'` and `'PERIODIC_PSI'`, while ignoring `TrainingParticipant`. As a direct consequence, recorded training events are completely detached from generated individual training sheets, violating Features 14 and 15.
5. **Observation 1.3.3** shows that `ssm-pv-instruire-colectiva` and `psi-pv-instruire` templates do not exist on disk or in the catalog. Calling `generateDocument` for them would throw `Fișierul șablon fizic lipsește de pe disc`. Thus, DOCX templates must be created in `templates_registry/normalized/` and registered in `TEMPLATE_CATALOG` with collection fields for participants.
6. **Observation 1.4.1 & 1.4.2** show that `getEmployeeExpiryInfo()` in `generate/page.tsx` and `generate-batch/route.ts` flag statutory training templates as `isExpired: true` when training is `OVERDUE`. This creates the Catch-22: an employer cannot generate or print a training sheet to perform required training precisely because the employee needs training. Lifting this block for training templates while keeping informative warnings directly satisfies Feature 18.
7. **Observation 1.5.1** shows `trainings/page.tsx` has no download buttons. Adding direct download shortcuts for PV Colectiv, Tematică, and participant individual sheets directly satisfies Feature 17.

---

## 3. Caveats

1. **Existing Test Suite (`scripts/e2e-tier1-features.ts`)**:
   In `scripts/e2e-tier1-features.ts:1265`, the test for Feature 16 directly created records via `prisma.trainingEvent.create` with `status: 'planned'` rather than calling `POST /api/trainings/record`. When updating `POST /api/trainings/record`, backwards compatibility with existing payload shapes (`trainingType`, `eventDate`, `participantEmployeeIds`) must be maintained alongside the new `SCOPE.md` contract (`type`, `date`, `participantIds`, `status`) to avoid breaking other test scripts (e.g. `scripts/verify-m2-challenger2.ts`).
2. **Adversarial Future Date Boundary**:
   In `scripts/verify-m2-challenger2.ts:444`, a test expects an invalid future date like `'2099-01-01'` to be rejected. Feature 16 allows future dates up to 365 days (12 months) ahead for `status: "planned"`. Any date beyond 365 days should still be rejected with HTTP 400.
3. **Template Registry Integrity**:
   Creating `ssm-pv-instruire-colectiva.docx` and `psi-pv-instruire.docx` must produce valid OpenXML DOCX archives (or use Pizzip template creation like `scripts/create_m2_templates.ts`) so docxtemplater parses them cleanly without corruption.

---

## 4. Conclusion & Concrete Recommendations for Worker

The Worker should implement Milestone 3 across 4 targeted modules without changing the Prisma schema:

### Recommendation 1: Update `src/app/api/trainings/record/route.ts` (Features 14, 16)
1. **Support normalized payload fields with backwards compatibility**:
   - `trainingType`: `body.trainingType || body.type`
   - `eventDate`: `body.eventDate || body.date`
   - `durationHours`: `body.durationHours`
   - `instructorName`: `body.instructorName || body.trainerName`
   - `participantEmployeeIds`: `body.participantEmployeeIds || body.participantIds`
   - `materialOrTopic`: `body.materialOrTopic || body.topicsCovered || body.notes`
   - `status`: `body.status || (parsedDate.getTime() > endOfToday.getTime() ? 'planned' : 'completed')`
2. **Conditional Future Date Validation**:
   - If `status === 'planned'`:
     - Allow future dates up to 365 days ahead: `const maxFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); if (parsedDate > maxFuture) return 400;`
   - If `status === 'completed'` (or `'recorded'`):
     - Disallow future dates: `if (parsedDate > endOfToday) return 400;`
3. **Conditional Employee Compliance Update**:
   - Only execute `tx.employee.updateMany` if `status !== 'planned'`. If `status === 'planned'`, do NOT alter `ssmLastTrainingDate` or `psiLastTrainingDate`.
4. **Response Contract**:
   - Return both contract fields and backwards-compatible fields:
     ```typescript
     return NextResponse.json({
       success: true,
       eventId: result.event.id,
       event: result.event,
       updatedEmployeesCount: result.updatedCount,
       trainingType,
       eventDate: parsedDate.toISOString(),
       status: result.event.status,
       message: result.event.status === 'planned'
         ? 'Sesiunea de instruire a fost planificată cu succes.'
         : `Instruirea a fost înregistrată cu succes, iar scadențele a ${result.updatedCount} salariați au fost actualizate.`
     }, { status: 201 });
     ```

### Recommendation 2: Statutory Templates & Generation Integration (Features 14, 15)
1. **Create Statutory Collective Protocols**:
   - Generate `templates_registry/normalized/ssm-pv-instruire-colectiva.docx` and `psi-pv-instruire.docx` (with header, session info, and `participanti` collection loop: `{#participanti}{nr} | {numeComplet} | {functie} | {cnp} | {rezultat} | {semnatura}{/participanti}`).
   - Register both in `TEMPLATE_CATALOG` (`src/lib/templates/definitions.ts`) with `family: 'training'`, `contextLevel: 'training_event'`, and fields/collections.
2. **Support `trainingEventId` in Document APIs**:
   - In `src/app/api/documents/generate/route.ts`: extract `trainingEventId: body.trainingEventId || body.eventId` and pass to `resolveTemplatePlaceholders` and `generateDocument`.
   - Also implement `src/app/api/trainings/documents/route.ts` as an alias/dedicated shortcut.
3. **Refactor `src/lib/templates/resolver.ts`**:
   - Accept `trainingEventId?: string` in `TemplateResolutionContext`.
   - When resolving training sheets (`ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`):
     - Query employee's actual `TrainingParticipant` entries (with joined `TrainingEvent` sorted by `eventDate ASC`).
     - Map `INTRODUCTIV` strictly to `PLACEHOLDER_DATA_INSTRUIRE_IG`, `PLACEHOLDER_DURATA_INSTRUIRE_IG`, `PLACEHOLDER_INSTRUCTOR_IG`, `PLACEHOLDER_TEMATICA_IG` (fallback to hireDate ONLY if no real introductiv event exists).
     - Map `LOC_MUNCA` strictly to `PLACEHOLDER_DATA_INSTRUIRE_LM`, `PLACEHOLDER_INSTRUCTOR_LM`, etc.
     - Map `PERIODIC_SSM` strictly to `instruiriPeriodiceSSM` table array.
     - Map `PERIODIC_PSI` strictly to `instructajePeriodicePSI` table array.
   - When resolving collective PVs (`trainingEventId` present):
     - Populate session details (`eventDate`, `durationHours`, `materialOrTopic`, `instructorName`, `verifierName`).
     - Populate `participanti` array from `TrainingParticipant` records with employee details (`fullName`, `currentJob.title`, masked CNP, `result`).

### Recommendation 3: Eliminate Expired Training Blocking (Feature 18)
1. In `src/app/documents/generate/page.tsx`:
   - In `getEmployeeExpiryInfo()`: for statutory training templates (`code.includes('ssm-fisa')`, `code.includes('psi-fisa')`, `code.includes('training-')`, `code.includes('pv-instruire')`), set `isExpired: false`.
   - If `ssm.status === 'OVERDUE'`, display an informative warning badge (e.g. `Necesită consemnare reinstruire`, amber/blue), but keep `isExpired: false` so single and batch generation are NEVER disabled.
2. In `src/app/api/documents/generate-batch/route.ts`:
   - Exclude training templates from the `compliance.ssmTraining.status === 'OVERDUE'` and `psiTraining.status === 'OVERDUE'` hard rejection. Allow generating training sheets even when training is overdue.

### Recommendation 4: Session Cards Direct Download Shortcuts & Planner Modal (Features 16, 17)
1. In `src/components/training-planner-modal.tsx`:
   - Allow future dates up to 1 year ahead (`max={oneYearFromNow}`).
   - Add status toggle: "Consemnează Instruire Efectuată" (`completed`) vs "Planifică Sesiune Viitoare" (`planned`).
   - If planned, inform operator that participant scadențe will NOT be reset until the session is completed.
2. In `src/app/trainings/page.tsx`:
   - Add visual badge for `status: "planned"` vs `status: "recorded"` / `"completed"`.
   - On each session card, add direct 1-click action buttons:
     - **Descarcă PV Colectiv** (triggers `POST /api/documents/generate` with `ssm-pv-instruire-colectiva` or `psi-pv-instruire` and `trainingEventId: ev.id`).
     - **Descarcă Tematică** (`training-tematica-loc-munca` or `training-detaliu-loc-munca`).
     - **Fișe Individuale** (dropdown or quick-links for participating employees).

---

## 5. Verification Method

To independently verify the implementation:
1. **Schema Check**:
   ```bash
   npx prisma validate
   ```
   Must exit with code 0.
2. **API Planning & Past Verification**:
   - Send `POST /api/trainings/record` with `date: <tomorrow>`, `status: "planned"`. Assert HTTP 201, `event.status === 'planned'`, and participants' `ssmLastTrainingDate` is NOT changed.
   - Send `POST /api/trainings/record` with `date: <past_date>`, `status: "completed"`. Assert HTTP 201, participants' `ssmLastTrainingDate` is updated to `<past_date>`.
   - Send `POST /api/trainings/record` with `date: '2099-01-01'`. Assert HTTP 400.
3. **Non-Blocking Expired Generation (Feature 18)**:
   - For an employee with `ssmLastTrainingDate` > 12 months ago (`OVERDUE`), attempt to generate `ssm-fisa-instruire-individuala` via `POST /api/documents/generate` and batch route. Assert HTTP 200 (not blocked).
4. **Statutory Document Population (Feature 14 & 15)**:
   - Record training event on date `2026-05-10`.
   - Generate `ssm-pv-instruire-colectiva` with `trainingEventId`. Unzip DOCX / parse XML and assert `10.05.2026` appears in text.
   - Generate `ssm-fisa-instruire-individuala`. Assert row in `instruiriPeriodiceSSM` has date `10.05.2026` and matching topic.
5. **Full Suite Regression Check**:
   ```bash
   npm test
   npm run build
   ```
   Must pass all 5 verification suites with 100% pass rate.
