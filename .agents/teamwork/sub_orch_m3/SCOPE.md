# Scope: Milestone 3: Training Module Synchronization & Statutory Docs

## Architecture
Milestone 3 synchronizes the training management subsystem with Romanian statutory occupational safety and fire protection training regulations (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005):
1. **Statutory Training Events & Protocols**:
   - Connection of recorded sessions (`TrainingEvent`, `TrainingParticipant`) with official statutory documents:
     - `ssm-pv-instruire-colectiva` (Proces-Verbal Instruire Colectivă SSM)
     - `psi-pv-instruire` (Proces-Verbal Instruire PSI)
     - `ssm-tematica-anuala` / `psi-tematica-anuala`
     - `ssm-fisa-instruire-individuala` (Fișă individuală de instruire SSM)
     - `psi-fisa-instructaj-individuala` (Fișă individuală de instructaj PSI)
   - Real event dates reflected faithfully in documents (eliminating fallback or substitution with `hireDate`).
2. **Resolver Event Type Discrimination**:
   - Precise filtering and population of statutory training history in `resolver.ts` according to event type:
     - `INTRODUCTIV`: Instruire introductiv generală (la angajare, minim 8 ore)
     - `LOC_MUNCA`: Instruire la locul de muncă (înainte de începerea lucrului, minim 8 ore)
     - `PERIODIC_SSM`: Instruire periodică SSM (la intervalul stabilit prin instrucțiuni proprii / evaluare riscuri: 1/3/6/12 luni)
     - `PERIODIC_PSI`: Instruire periodică PSI (conform riscului de incendiu)
3. **Future Session Planning**:
   - Support for `status: "planned"` in `POST /api/trainings/record` and UI, allowing dates in the future (e.g. up to 12 months ahead) without triggering premature completion or validation rejection.
4. **Direct UI Shortcuts in Session Cards**:
   - One-click statutory document download buttons directly on training session cards in `src/app/trainings/page.tsx` (PV Colectiv, Tematică, Fișe Individuale pentru participanți).
5. **Elimination of Expired Training Blocking (Catch-22)**:
   - When prior training has expired, generating or recording a new training session must NOT be blocked. The statutory purpose of conducting a new training is precisely to restore compliance when the previous interval has elapsed.

---

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 14 | Sincronizare Evenimente Instruire cu Documente | Conectare `POST /api/trainings/record` și evenimente persistate cu generarea PV-urilor și a fișelor, folosind data reală a evenimentului (nu `hireDate`) | M3 | DONE |
| 15 | Filtrare Tipuri Evenimente în Fișe | Mapare precisă în `resolver.ts` a tipurilor `INTRODUCTIV`, `LOC_MUNCA`, `PERIODIC_SSM`, `PERIODIC_PSI` în tabelele din fișele individuale | M3 | DONE |
| 16 | Planificare Sesiuni Viitoare | Suport `status: "planned"` în API și UI pentru sesiuni viitoare, eliminând validarea eronată ce interzicea datele viitoare | M3 | DONE |
| 17 | Scurtături Descărcare PV/Fișă în Card | Butoane operative directe de descărcare PV colectiv, tematică și fișe individuale direct din cardul sesiunii în `/trainings` | M3 | DONE |
| 18 | Eliminare Blocaj Expirare Instruire | Eliminare blocaj care împiedica emiterea unei fișe de instruire noi atunci când instruirea precedentă era expirată | M3 | DONE |

---

## Interface Contracts

### 1. Training Recording & Planning: `POST /api/trainings/record`
- **Request Body**:
  ```typescript
  {
    clientId: string;
    type: "INTRODUCTIV" | "LOC_MUNCA" | "PERIODIC_SSM" | "PERIODIC_PSI";
    date: string; // ISO 8601 string, past or future
    durationHours: number;
    trainerName: string;
    trainerRole?: string;
    topicsCovered?: string;
    participantIds: string[];
    status?: "completed" | "planned"; // default: "completed" if date <= now, else "planned"
    notes?: string;
  }
  ```
- **Validation**:
  - `status: "planned"` allows future dates (up to 365 days ahead).
  - `status: "completed"` requires date <= now (or within today).
- **Response**:
  ```typescript
  {
    success: true;
    event: TrainingEvent & { participants: TrainingParticipant[] };
  }
  ```

### 2. Training Document Generation Endpoint / Shortcuts:
- Direct generation/download for:
  - PV Colectiv SSM (`templateCode: "ssm-pv-instruire-colectiva"`, `trainingEventId: id`)
  - PV PSI (`templateCode: "psi-pv-instruire"`, `trainingEventId: id`)
  - Fișă individuală (`templateCode: "ssm-fisa-instruire-individuala"` or `psi-fisa-instructaj-individuala"`, `employeeId: id`)

### 3. Resolver Training Population:
- `src/lib/templates/resolver.ts`:
  - When resolving training tables for an employee, query real `TrainingParticipant` & `TrainingEvent` records sorted by `date ASC`.
  - Map `INTRODUCTIV` strictly to General Introductive rows with real `event.date`, `event.durationHours`, `event.trainerName`.
  - Map `LOC_MUNCA` strictly to On-the-job training rows with real `event.date`, `event.durationHours`, `event.trainerName`.
  - Map `PERIODIC_SSM` and `PERIODIC_PSI` strictly to Periodic training history rows with real `event.date`, `event.durationHours`, `event.topicsCovered`.
  - Never substitute `hireDate` when `event.date` is available.
  - Never block generation of an individual training sheet just because previous periodic training has expired.

---

## Code Layout
- `src/app/api/trainings/record/route.ts` — API recording and planning training events (Features 14, 16).
- `src/app/api/trainings/documents/route.ts` (or direct document generation integration) — Endpoint for training documents (Feature 14).
- `src/lib/templates/resolver.ts` — Training event resolution, filtering by type, non-blocking expired checks (Features 14, 15, 18).
- `src/app/trainings/page.tsx` — Training management UI, future session planning modal, and direct download shortcut buttons on session cards (Features 16, 17).
