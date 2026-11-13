## 2026-11-11T02:51:50Z

You are worker_1 for Milestone 3 (M3): Training Module Synchronization & Statutory Docs.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/worker_1
Original Request: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/SCOPE.md

Explorer handoffs to read before implementing:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_1/handoff.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_2/handoff.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write access to:
- `src/app/api/trainings/record/route.ts`
- `src/app/api/documents/generate/route.ts`
- `src/lib/templates/definitions.ts`
- `src/lib/templates/resolver.ts`
- `src/app/documents/generate/page.tsx`
- `src/app/api/documents/generate-batch/route.ts`
- `src/components/training-planner-modal.tsx`
- `src/app/trainings/page.tsx`
- `src/components/training/training-session-card.tsx` (new component)
- `templates_registry/normalized/ssm-pv-instruire-colectiva.docx` (new template)
- `templates_registry/normalized/psi-pv-instruire.docx` (new template)

IMPLEMENTATION TASKS:

1. Feature 14 & 16: Training Recording API (`src/app/api/trainings/record/route.ts`):
   - Accept payload fields with full backwards compatibility:
     - `trainingType`: `body.trainingType || body.type`
     - `eventDate`: `body.eventDate || body.date`
     - `durationHours`: `body.durationHours`
     - `instructorName`: `body.instructorName || body.trainerName`
     - `participantEmployeeIds`: `body.participantEmployeeIds || body.participantIds`
     - `materialOrTopic`: `body.materialOrTopic || body.topicsCovered || body.notes`
     - `status`: `body.status || (parsedDate.getTime() > endOfToday.getTime() ? 'planned' : 'completed')`
   - Future date validation:
     - If `status === 'planned'`: allow future dates up to 365 days ahead. Reject dates > 365 days ahead with HTTP 400.
     - If `status === 'completed'` or `'recorded'`: reject dates > end of today with HTTP 400.
   - Compliance reset:
     - Only execute `tx.employee.updateMany` if `status !== 'planned'`. If `status === 'planned'`, do NOT update `ssmLastTrainingDate` or `psiLastTrainingDate`.
   - Response: return HTTP 201 with `{ success: true, eventId, event: { ...event, participants }, updatedEmployeesCount, trainingType, eventDate, status, message }`.

2. Feature 14 & 15: Collective PV Templates & Resolver:
   - Create valid physical DOCX templates `templates_registry/normalized/ssm-pv-instruire-colectiva.docx` and `psi-pv-instruire.docx` with tags for company header, event metadata, and `{#participanti}{nr} | {numeComplet} | {functie} | {cnp} | {rezultat} | {semnatura}{/participanti}` (you can write a short helper script using docx/pizzip or create the OpenXML zip).
   - In `src/lib/templates/definitions.ts`: register `ssm-pv-instruire-colectiva` and `psi-pv-instruire` with family `'training'`, contextLevel `'training_event'`, tokens, and collections (`participanti`).
   - In `src/app/api/documents/generate/route.ts`: extract `trainingEventId: body.trainingEventId || body.eventId` and pass to `resolveTemplatePlaceholders` and `generateDocument`.
   - In `src/lib/templates/resolver.ts`:
     - Update `TemplateResolutionContext` to include `trainingEventId?: string;`.
     - In `resolveTemplatePlaceholders`: fetch `trainingParticipants: { include: { event: true } }` on employee and `trainingEvents: { include: { participants: { include: { employee: true } } } }` on client.
     - Scope training events to the specific employee (`p.employeeId === employee.id` or `employee.trainingParticipants`).
     - Map `INTRODUCTIV`: use real `INTRODUCTIV` event if present (`event.eventDate`, `durationHours`, `instructorName`, `materialOrTopic`); fall back to `hireDate` ONLY if no real introductiv event is recorded.
     - Map `LOC_MUNCA`: use real `LOC_MUNCA` event if present; fall back to `hireDate` ONLY if no real event is recorded.
     - Map `PERIODIC_SSM`: match case-insensitively `['PERIODIC_SSM', 'SSM', 'PERIODIC'].includes(String(e.type || '').toUpperCase())` into `instruiriPeriodiceSSM` table array with real event date, duration, instructor, topic.
     - Map `PERIODIC_PSI`: match case-insensitively `['PERIODIC_PSI', 'PSI', 'SU'].includes(String(e.type || '').toUpperCase())` into `instructajePeriodicePSI` table array with real event date, duration, instructor, topic.
     - When `trainingEventId` is present (collective PV): resolve session fields and populate `participanti` collection from `TrainingParticipant` with `nr`, `numeComplet`, `functie`, masked CNP, `rezultat`.

3. Feature 18: Eliminare Blocaj Expirare Instruire (Catch-22):
   - In `src/app/documents/generate/page.tsx` (`getEmployeeExpiryInfo`):
     - For statutory training templates (`code.includes('fisa-instruire')`, `code.includes('fisa-instructaj')`, `code.includes('pv-instruire')`, `code.startsWith('training-')`), set `isExpired: false`.
     - If `status === 'OVERDUE'`, show informative badge (`Reinstruire Necesară`), but NEVER disable the option or the generate button.
   - In `src/app/api/documents/generate-batch/route.ts` (`checkEmployeeTemplateExpiry`):
     - Exclude training templates from the hard `OVERDUE` rejection so that training sheets can always be generated to conduct reinstatement training.

4. Features 16 & 17: Training UI & Shortcuts:
   - In `src/components/training-planner-modal.tsx`:
     - Allow dates up to 365 days ahead (`max={oneYearFromNow}`).
     - Add status toggle: "Consemnare Instruire Efectuată" (`completed`) vs "Planificare Sesiune Viitoare" (`planned`). Auto-select "planned" when date is in the future.
     - Inform operator about compliance reset behavior.
     - Pass `status` in POST payload.
   - In `src/components/training/training-session-card.tsx` (new interactive Client Component) and `src/app/trainings/page.tsx`:
     - Display status badge: "Planificat" (blue/amber, with "Data programată") vs "Consemnat" (emerald, with "Data efectuării").
     - Direct 1-click action buttons on card:
       - "PV Instruire" (downloads `ssm-pv-instruire-colectiva` or `psi-pv-instruire` with `trainingEventId`).
       - "Tematică" (`training-tematica-introductiv` / `training-tematica-loc-munca`).
       - Expandable participant list with individual "Fișă Individuală" download buttons (`ssm-fisa-instruire-individuala` or `psi-fisa-instructaj-individuala`).

5. Build & Test Verification:
   - Run `npx prisma validate`
   - Run `npm run build`
   - Run `npm test`
   - Make sure all verification steps pass.
