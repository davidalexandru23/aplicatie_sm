# Handoff Report: UI Training Management Investigation (`/trainings` & Document Shortcuts)

**Agent**: `explorer_3`  
**Milestone**: Milestone 3 (M3) — Training Module Synchronization & Statutory Docs  
**Focus Area**: `src/app/trainings/page.tsx`, `src/components/training-planner-modal.tsx`, Features 16 & 17  
**Date**: 2026-11-11  

---

## 1. Observation

### 1.1. Display of Sessions in `src/app/trainings/page.tsx`
- **File & Architecture**:
  - `src/app/trainings/page.tsx:8`: `TrainingsPage` is a Next.js Server Component marked with `export const dynamic = 'force-dynamic'`.
  - Data retrieval (lines 9–32):
    ```typescript
    const [events, clients] = await Promise.all([
      prisma.trainingEvent.findMany({
        orderBy: { eventDate: 'desc' },
        include: {
          client: true,
          participants: {
            include: { employee: true },
          },
        },
      }),
      // ...
    ]);
    ```
- **Display Structure (Cards vs Table vs Modal)**:
  - Lines 91–141: Sessions are rendered as a static two-column responsive grid of cards (`grid grid-cols-1 md:grid-cols-2 gap-5`).
  - **No Table View**: There is no table presentation, nor a view switcher (cards/table).
  - **No Details / Drill-down Modal**: Clicking on a card does nothing; cards are static `<div>` elements.
  - **Underutilized Data**: Even though `participants: { include: { employee: true } }` eagerly fetches every participant employee's record from Prisma, the card only prints the participant count (`{ev.participants.length} salariați` at line 128) and completely discards the participant names, jobs, and individual data.
- **Card Content & Metadata**:
  - Header: `ev.materialOrTopic` (line 98), client name with `<Building2>` icon (lines 99–102), and event type badge (lines 104–112).
  - 3-column stats box (lines 115–130):
    - "Data efectuării": `{new Date(ev.eventDate).toLocaleDateString('ro-RO')}` (line 119) — hardcoded label regardless of status.
    - "Durată": `{ev.durationHours} ore` (line 124).
    - "Participanți": `{ev.participants.length} salariați` (line 128).
  - Footer (lines 132–137):
    - Trainer: `ev.instructorName`.
    - Status badge: `<span className="capitalize text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{ev.status === 'recorded' ? 'Consemnat' : ev.status}</span>`.

### 1.2. The Modal for Recording or Planning (`src/components/training-planner-modal.tsx`)
- **Trigger**:
  - Rendered at top of page (lines 68–70) and in empty state (lines 80–82): `<TrainingPlannerModal clients={plannerClients} />`.
  - Button text: "Planifică / Consemnează Instruire" (`<BookOpenCheck>` icon).
- **Form Inputs**:
  1. Client select dropdown (`selectedClientId`, lines 276–295).
  2. Training type radio buttons (`PERIODIC_SSM`, `PERIODIC_PSI`, `LOC_MUNCA`, `INTRODUCTIV`, lines 298–343).
  3. Date input (`eventDate`, line 352).
  4. Duration input (`durationHours`, line 364, default 2h, 4h, or 8h depending on type).
  5. Trainer input (`instructorName`, line 378, auto-filled from `client.designatedWorkerSsm`, `client.psiResponder`, or `client.ssmSpecialistName`).
  6. Topic / Notes textarea (`materialOrTopic`, line 394).
  7. Participant checklist (lines 404–485) with compliance status badge and Select All / Deselect All.
- **Date Validation**:
  - Line 354:
    ```tsx
    <input
      type="date"
      required
      max={new Date().toISOString().split('T')[0]}
      value={eventDate}
      onChange={(e) => setEventDate(e.target.value)}
      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    ```
  - **Direct Observation**: The form has `max={new Date().toISOString().split('T')[0]}`. This **strictly blocks** users from picking any date after today. The browser native datepicker disables all future dates.
  - Furthermore, in the API (`src/app/api/trainings/record/route.ts:43–50`):
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
- **Handling of `status: "planned"` vs `status: "completed"`**:
  - `TrainingPlannerModal` has **NO** `status` state, no toggle, and sends no `status` property in `handleSubmit` (lines 187–195).
  - The API hardcodes `status: 'recorded'` (line 121) and immediately updates employees' `ssmLastTrainingDate` or `psiLastTrainingDate` (lines 135–158).
  - In `src/app/trainings/page.tsx:134–136`:
    ```tsx
    <span className="capitalize text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
      {ev.status === 'recorded' ? 'Consemnat' : ev.status}
    </span>
    ```
    If `ev.status === "planned"`, it displays "Planned" in green, with the label "Data efectuării". There is no visual distinction between a scheduled/future event and an executed/completed event.

### 1.3. Document Download Shortcuts
- **Current Actions on Session Cards**:
  - Lines 95–139: **ZERO buttons or actions**. The card has no download buttons, no participant view button, and no complete action.
- **Existing Document Generation Pattern in Project**:
  - In `src/app/hygiene/page.tsx:143–161` & `739–805`: Session cards contain operative download buttons calling `POST /api/documents/generate`:
    ```typescript
    const res = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateCode,
        clientId,
        hygieneSessionId: session.id,
        hygieneParticipantId: participantId,
      }),
    });
    const data = await res.json();
    if (data.downloadUrl) window.location.href = data.downloadUrl;
    ```
- **Available Statutory Training Templates in `src/lib/templates/definitions.ts`**:
  - `ssm-fisa-instruire-individuala` (Anexa 11 HG 1425/2006, contextLevel: 'employee')
  - `psi-fisa-instructaj-individuala` (Anexa OMAI 712/2005, contextLevel: 'employee')
  - `training-tematica-introductiv` (contextLevel: 'client')
  - `training-tematica-loc-munca` (contextLevel: 'job')
  - `training-detaliu-introductiv` (contextLevel: 'client')
  - `training-detaliu-loc-munca` (contextLevel: 'job')
  - Statutory PVs requested in Milestone 3: `ssm-pv-instruire-colectiva` and `psi-pv-instruire` (linked to `TrainingEvent`).

---

## 2. Logic Chain

1. **Premise 1 (Feature 16 Requirement)**: SCOPE.md Feature 16 dictates support for `status: "planned"` in the API and UI for future sessions, eliminating validation that rejects future dates (allowing up to 12 months ahead).
2. **Finding from Observation 1.2**: In `src/components/training-planner-modal.tsx:354`, `max={new Date().toISOString().split('T')[0]}` prevents the user from selecting any future date. In `src/app/api/trainings/record/route.ts:45–49`, the backend returns HTTP 400 with "Data instruirii nu poate fi în viitor."
3. **Inference 1**: Feature 16 cannot function without removing the frontend `max` date clamp (or extending it to +365 days) and updating the backend date validation to permit future dates when `status === "planned"`.
4. **Premise 2 (Status Semantics)**: A planned future training session has not occurred yet. Legally, an employee's statutory compliance period resets only upon actual completion of the training.
5. **Finding from Observation 1.2**: Currently, the form lacks any status selector; the backend unconditionally updates `ssmLastTrainingDate` / `psiLastTrainingDate` immediately.
6. **Inference 2**: `TrainingPlannerModal` must distinguish between "Instruire Efectuată (Consemnare)" (`status: "completed"`) and "Instruire Planificată (Programare)" (`status: "planned"`). When `status === "planned"`, employee compliance dates must NOT be updated.
7. **Premise 3 (Feature 17 Requirement)**: SCOPE.md Feature 17 dictates direct shortcut buttons on session cards in `/trainings` for downloading the PV Colectiv (`ssm-pv-instruire-colectiva` or `psi-pv-instruire`), Tematică (`training-tematica-introductiv` or `training-tematica-loc-munca`), and individual training sheets for participants (`ssm-fisa-instruire-individuala` or `psi-fisa-instructaj-individuala`).
8. **Finding from Observation 1.1 & 1.3**: Currently, `src/app/trainings/page.tsx` contains zero action buttons on cards and is a Server Component without client-side interactive handlers or download state management.
9. **Inference 3**: Rendering the session card via an interactive Client Component (e.g. `TrainingSessionCard`) is necessary to handle click events, loading spinners (`downloadingDoc`), participant list expansion, and browser downloads.
10. **Finding from Observation 1.1**: The Prisma query in `TrainingsPage` already fetches `participants: { include: { employee: true } }`. The data required to show participant names and download individual training sheets is already loaded on the server; it only needs to be passed to the card component.

---

## 3. Caveats

- **Caveat 1**: Template resolution and physical DOCX generation for `ssm-pv-instruire-colectiva` and `psi-pv-instruire` are investigated by `explorer_1` and `explorer_2`. The UI shortcut buttons will call `POST /api/documents/generate` (or `/api/trainings/documents`), which depends on the backend accepting `trainingEventId`.
- **Caveat 2**: For individual training sheets (`ssm-fisa-instruire-individuala` and `psi-fisa-instructaj-individuala`), a training session may have 1 to dozens of participants. Providing both a per-participant download button in an expandable drawer/accordion and an optional batch ZIP download provides the best UX.
- **Caveat 3**: No existing tests specifically assert UI DOM elements on `/trainings`. The system build (`npm run build`) verifies TypeScript compilation and Next.js page generation.

---

## 4. Conclusion

The training management UI (`src/app/trainings/page.tsx` and `src/components/training-planner-modal.tsx`) currently fails both Feature 16 and Feature 17:
1. **Feature 16 Gaps**: Future planning is blocked by `max={today}` on the date input, lacks a `status` toggle in the modal, lacks conditional logic around employee compliance date resets, and renders planned sessions with misleading labels ("Data efectuării" and emerald badge).
2. **Feature 17 Gaps**: Session cards have zero action buttons, completely hide the already-queried participant employees, and lack download shortcuts for the collective protocol (PV), the training thematic, or individual sheets.

### Concrete Recommendations for Worker

#### Recommendation 1: Refactor Session Card to a Client Component (`TrainingSessionCard`)
- Create `src/components/training/training-session-card.tsx` (marked `'use client'`).
- Props:
  ```typescript
  interface TrainingSessionCardProps {
    event: {
      id: string;
      clientId: string;
      type: string;
      eventDate: string | Date;
      durationHours: number;
      materialOrTopic: string;
      instructorName: string;
      status: string;
      client: { id: string; name: string };
      participants: Array<{
        id: string;
        employeeId: string;
        result: string;
        employee: {
          id: string;
          firstName: string;
          lastName: string;
          currentJob?: { title: string } | null;
        };
      }>;
    };
  }
  ```
- Keep `src/app/trainings/page.tsx` as a Server Component, mapping `events.map(ev => <TrainingSessionCard key={ev.id} event={ev} />)`.

#### Recommendation 2: Visual Differentiation for `planned` vs `completed` (Feature 16)
- **Status Badge**:
  - `ev.status === 'planned'`: Display "Planificat" in an amber/blue badge (`bg-blue-50 text-blue-700 border-blue-200` or `bg-amber-50 text-amber-700 border-amber-200`) with `<Clock className="w-3 h-3" />`.
  - `ev.status === 'recorded'` or `'completed'`: Display "Consemnat" in an emerald badge (`bg-emerald-50 text-emerald-700 border-emerald-200`) with `<CheckCircle2 className="w-3 h-3" />`.
- **Date Label**:
  - If `status === 'planned'`: Label as **"Data programată"**.
  - If `status !== 'planned'`: Label as **"Data efectuării"**.
- **Action for Planned Sessions**:
  - Add an operative action: "Consemnează Efectuarea" (or "Marchează Efectuată") to convert the planned session to completed and update employee scadențe.

#### Recommendation 3: Add Document Download Shortcuts to Session Card (Feature 17)
- Add an action toolbar at the bottom of each card with 3 key download shortcuts:
  1. **Buton "PV Instruire" (Proces-Verbal Colectiv)**:
     - Downloads `isPsi ? 'psi-pv-instruire' : 'ssm-pv-instruire-colectiva'`.
     - Request: `POST /api/documents/generate` with `{ templateCode, clientId: ev.clientId, trainingEventId: ev.id }`.
  2. **Buton "Tematică"**:
     - Downloads `ev.type === 'INTRODUCTIV' ? 'training-tematica-introductiv' : 'training-tematica-loc-munca'` (or PSI tematică for PSI sessions).
     - Request: `POST /api/documents/generate` with `{ templateCode, clientId: ev.clientId }`.
  3. **Participant Drawer / Expandable List with "Fișă Individuală" Shortcuts**:
     - Accordion toggle: `Vezi participanți (${ev.participants.length})`.
     - When expanded, renders each participant row (`lastName firstName`, job title).
     - Next to each participant, a button: `[Fișă Individuală]` (`<Download className="w-3 h-3" />`).
     - Request: `POST /api/documents/generate` with `{ templateCode: isPsi ? 'psi-fisa-instructaj-individuala' : 'ssm-fisa-instruire-individuala', clientId: ev.clientId, employeeId: p.employeeId, trainingEventId: ev.id }`.
- Provide loading feedback (`downloadingDoc === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download ... />`).

#### Recommendation 4: Update `TrainingPlannerModal` (Feature 16)
- **Date Picker**:
  - Remove `max={today}` on the date input.
  - Set `max` to 365 days ahead (e.g. `new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]`).
- **Status Selection & UI Feedback**:
  - Add segmented control or radio buttons:
    - `[●] Instruire Efectuată (Consemnare imediată)` -> sets `status = "completed"`.
    - `[○] Instruire Planificată (Programare viitoare)` -> sets `status = "planned"`.
  - Auto-select `status = "planned"` if the user chooses a future date.
  - If `status === "planned"`, show informational notice: "Sesiunea va fi salvată ca planificată. Scadențele salariaților vor fi actualizate numai după consemnarea efectuării instruirii."
  - Pass `status` in the `POST /api/trainings/record` request body.

---

## 5. Verification Method

To verify these findings and any future implementation:

1. **Static Build Check**:
   ```bash
   npm run build
   ```
   Ensures TypeScript compilation and page rendering succeed without syntax or typing errors.

2. **UI Inspection Checklist**:
   - Navigate to `/trainings`:
     - Open modal: Verify user can pick a date 3 months in the future.
     - Switch between "Consemnare" and "Planificare": verify status parameter is included in network request payload to `POST /api/trainings/record`.
     - Inspect session cards:
       - Verify planned sessions display "Data programată" and an amber/blue badge.
       - Verify completed sessions display "Data efectuării" and an emerald badge.
       - Verify PV Colectiv download button triggers generation.
       - Verify Tematică download button triggers generation.
       - Verify expanding participants reveals individual "Fișă Individuală" download buttons.

3. **Invalidation Conditions**:
   - If the date picker still disables future dates in `/trainings`, Feature 16 is invalid.
   - If planned sessions immediately reset employee `ssmLastTrainingDate` / `psiLastTrainingDate`, compliance logic is violated.
   - If session cards lack clickable download buttons for PV and individual sheets, Feature 17 is invalid.
