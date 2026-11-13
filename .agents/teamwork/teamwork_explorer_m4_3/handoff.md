# Handoff Report: Feature 23 - Job Risk Flags & UI Management for EIP & Risk Assessments

## 1. Observation

### 1.1 Prisma Schema (`prisma/schema.prisma`)
In `prisma/schema.prisma` lines 159–188:
```prisma
model Job {
  id              String   @id @default(uuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  title           String   // Funcție / post
  corCode         String?  // Cod COR opțional
  mainActivities  String?  // Activități principale
  equipmentUsed   String?  // Echipamente/utilaje folosite
  workConditions  String?  // Condiții de lucru relevante
  workersCount    Int?     // Număr aproximativ lucrători
  isActive        Boolean  @default(true)

  // Profiling de risc pentru adaptarea automată a medicinei muncii și EIP
  isFoodHandling     Boolean  @default(false) // Alimentație / manipulare alimente (HG 355/2007 Fișa 210)
  isScreenWork       Boolean  @default(false) // Lucru la ecran > 4h/zi (HG 355/2007 Fișa 243)
  isDrivingRequired  Boolean  @default(false) // Conducere auto în interes de serviciu (Fișa 209)
  workPosture        String?  // "standing", "sitting", "mixed"
  maxWeightKg        Float?   // Manipulare manuală mase (kg)
  noiseExposed       Boolean  @default(false) // Expunere la zgomot > 80 dB(A)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  employees          Employee[]
  employmentHistory  EmploymentHistory[]
  riskAssessments    RiskAssessment[]
  eipRequirements    JobEipRequirement[]

  @@unique([clientId, title])
}
```

**Status of statutory risk flags in `Job` model:**
- `isFoodHandling`: PRESENT (`Boolean @default(false)`)
- `isScreenWork`: PRESENT (`Boolean @default(false)`)
- `workPosture`: PRESENT (`String?`)
- `maxWeightKg`: PRESENT (`Float?`)
- `noiseExposed`: PRESENT (`Boolean @default(false)`)
- `isDrivingRequired`: PRESENT (`Boolean @default(false)`)
- `chemicalExposed`: **MISSING** from `prisma/schema.prisma`
- `vibrationExposed`: **MISSING** from `prisma/schema.prisma`
- `heightWork`: **MISSING** from `prisma/schema.prisma`

**Database state check**:
Executing query on active PostgreSQL database (`node -e "p.job.findMany(...)"`):
12 `Job` records exist in the database. `isFoodHandling`, `isScreenWork`, `isDrivingRequired`, `workPosture`, `maxWeightKg`, `noiseExposed` have values for some jobs (e.g. `Bucătar Specialist` has `isFoodHandling: true`, `workPosture: "standing"`, `maxWeightKg: 15`).
Database has 8 `EipItem` records and 14 `JobEipRequirement` records already seeded, but 0 `EmployeeEipAssignment` and 0 `RiskAssessment` records.

### 1.2 Job API Routes
Searching for job API routes:
- `find src/app/api -name "*job*"` returned NO files.
- `grep -rn "prisma.job.create" src/` returned NO occurrences (exit code 1).
- `grep -rn "prisma.job.update" src/` returned NO occurrences (exit code 1).
- `src/app/api/clients/[id]/jobs` does NOT exist.
- `src/app/api/clients/[id]/jobs/[jobId]` does NOT exist.
- `src/app/api/jobs/` does NOT exist.
- Current API routes under `src/app/api/clients/[id]/`:
  - `route.ts` (GET / PATCH client metadata)
  - `employees/route.ts`
  - `export/route.ts`
  - `packages/dossier/route.ts`
  - `packages/inspection-archive/route.ts`
  - `packages/onboarding/route.ts`
No API route currently exists for operators to create, update, or delete jobs, or to modify job risk flags.

### 1.3 UI Components: Job Management in `src/app/clients/[id]/page.tsx`
In `src/app/clients/[id]/page.tsx` lines 631–655:
```tsx
        {/* Jobs / Context */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>Posturi & Context SSM ({client.jobs.length})</span>
          </h2>
          {client.jobs.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">Nu există posturi definite.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {client.jobs.map((j) => (
                <div key={j.id} className="py-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-slate-800">{j.title}</span>
                    {j.corCode && <span className="font-mono text-slate-400 text-[11px]">COR: {j.corCode}</span>}
                  </div>
                  {j.mainActivities && (
                    <div className="text-slate-500 mt-0.5 line-clamp-1">{j.mainActivities}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
```
- Direct observation:
  - Jobs are listed read-only with only `title`, `corCode`, and `mainActivities`.
  - NONE of the risk flags are rendered or badged (`isFoodHandling`, `isScreenWork`, `workPosture`, `maxWeightKg`, `noiseExposed`, `isDrivingRequired`, `chemicalExposed`, `vibrationExposed`, `heightWork`).
  - No `AddJobModal` or `EditJobModal` exists in `src/components/` or `src/app/clients/[id]/page.tsx`.
  - No button exists to add or edit a job or configure its risk flags.

### 1.4 UI Components: Risk Assessments in `src/app/risk-assessments/page.tsx`
In `src/app/risk-assessments/page.tsx` lines 9–25:
- Server component querying `prisma.riskAssessment.findMany({ ... })` (currently returns 0 items).
- Renders empty state banner if `assessments.length === 0`, or read-only summary cards if non-empty.
- Bottom half renders static CAEN presets from `CAEN_RISK_PROFILES` (`src/lib/risk/caen-risk-presets.ts`).
- Header buttons redirect to `/documents/generate?templateCode=risk-evaluare` and `/documents/generate?templateCode=risk-plan-prevenire-tesa`.
- Direct observation:
  - There is NO creation button or modal (`CreateRiskAssessmentModal`).
  - There is NO edit modal or page (`EditRiskAssessmentModal`) to edit `RiskItem`s, severity, probability, risk level, or `PreventionMeasure`s (responsibles, deadlines).
  - There are NO API endpoints under `src/app/api/risk-assessments/`.

### 1.5 UI Components: Personal Protective Equipment (EIP - HG 1048/2006)
- `grep -rn "eip" src/app/` reveals NO EIP management pages or routes.
- `src/components/` has `add-employee-modal.tsx` and `edit-employee-modal.tsx` which include basic sizing fields (`shoeSize`, `clothingSize`, `gloveSize`), but:
  - There is NO EIP catalog UI (`EipItem`).
  - There is NO job requirement management UI (`JobEipRequirement`).
  - There is NO employee equipment handover/assignment UI (`EmployeeEipAssignment`).
  - There are NO API routes under `src/app/api/eip/`.

---

## 2. Logic Chain

1. **Prisma Schema Gaps vs Statutory Requirements**:
   - Observation 1.1 confirms that `Job` has 6 flags: `isFoodHandling`, `isScreenWork`, `isDrivingRequired`, `workPosture`, `maxWeightKg`, `noiseExposed`.
   - However, statutory medical surveillance (HG 355/2007) and safety standards require tracking exposure to hazardous chemicals (Fișa 141), mechanical vibrations (Fișa 140), and working at height (Fișa 203). These 3 fields (`chemicalExposed`, `vibrationExposed`, `heightWork`) are explicitly referenced in `SCOPE.md` but are missing in `prisma/schema.prisma`.
   - Therefore, adding these 3 fields (`chemicalExposed Boolean @default(false)`, `vibrationExposed Boolean @default(false)`, `heightWork Boolean @default(false)`) to `Job` and running `npx prisma db push` is necessary to achieve full statutory coverage.

2. **Absence of Job REST API Endpoints**:
   - Observation 1.2 demonstrates that no routes exist under `src/app/api/clients/[id]/jobs/` or `src/app/api/jobs/`.
   - Without an API endpoint, neither UI modals nor external scripts can perform CRUD on jobs or update risk flags.
   - Therefore, implementing `GET & POST /api/clients/[id]/jobs` and `GET, PUT, PATCH, DELETE /api/clients/[id]/jobs/[jobId]` is essential.

3. **Client UI Missing Job Risk Flags and Management Controls**:
   - Observation 1.3 shows `src/app/clients/[id]/page.tsx` renders jobs in a read-only list without displaying risk flags or providing an edit control.
   - An operator inspecting a client cannot see whether a cook is flagged for food handling, whether a developer is flagged for screen work, or what EIP items are required.
   - Therefore, `JobModal` (`AddJobModal` & `EditJobModal`) with risk flag toggles, posture selection, max weight input, and EIP requirement checkboxes must be created, and the job card on `/clients/[id]` must display colored badges for active risk flags.

4. **Risk Assessment UI Missing CRUD and Persistence**:
   - Observation 1.4 shows `src/app/risk-assessments/page.tsx` only lists existing records or presets. Because there are no creation forms and no API routes, an operator cannot create or edit an assessment dossier in the database.
   - Therefore, creating `CreateRiskAssessmentModal` and `EditRiskAssessmentModal` (or an interactive client manager) connected to `GET, POST /api/risk-assessments` and `GET, PUT, DELETE /api/risk-assessments/[id]` is necessary to satisfy Feature 21.

5. **EIP Management UI Missing Across the Application**:
   - Observation 1.5 shows that while the DB has 8 statutory `EipItem`s and 14 `JobEipRequirement`s, there is zero UI to view them, modify job requirements, or record employee handover (`EmployeeEipAssignment`).
   - Therefore, adding `AssignEipModal` on employee rows in `/clients/[id]` and `/employees`, plus EIP requirement management inside `EditJobModal`, is required to operationalize Feature 19.

---

## 3. Caveats

1. **Schema Migration Precaution**:
   - Modifying `prisma/schema.prisma` requires `npx prisma db push`. The active database already contains 12 jobs and real clients/employees. Adding non-destructive optional fields with default values (`@default(false)`) ensures zero data loss.
2. **Template Placeholder Alignment**:
   - In `definitions.ts:3836`, the field is `PLACEHOLDER_MARIME_HAINE`, while in `resolver.ts:2107`, it maps `PLACEHOLDER_MARIME_IMBRACAMINTE`. The Worker must ensure both keys resolve to `employee.clothingSize` so neither template nor resolver encounters missing field mismatches.
3. **EIP Requirement vs Assignment Fallback**:
   - When generating `eip-fisa-acordare-individuala`, if an employee does not yet have direct `EmployeeEipAssignment` rows, the resolver should gracefully fall back to the requirements of their `currentJob` (`JobEipRequirement`).

---

## 4. Conclusion & Implementation Plan for Worker

### Concrete Implementation Blueprint

#### Phase 1: Prisma Schema Extension
1. Update `prisma/schema.prisma` in `model Job`:
   ```prisma
   // Profiling de risc pentru adaptarea automată a medicinei muncii și EIP
   isFoodHandling     Boolean  @default(false) // Alimentație / manipulare alimente (HG 355/2007 Fișa 210)
   isScreenWork       Boolean  @default(false) // Lucru la ecran > 4h/zi (HG 355/2007 Fișa 243)
   isDrivingRequired  Boolean  @default(false) // Conducere auto în interes de serviciu (Fișa 209)
   workPosture        String?  // "standing", "sitting", "mixed"
   maxWeightKg        Float?   // Manipulare manuală mase (kg)
   noiseExposed       Boolean  @default(false) // Expunere la zgomot > 80 dB(A)
   chemicalExposed    Boolean  @default(false) // Expunere la agenți chimici (HG 355/2007 Fișa 141)
   vibrationExposed   Boolean  @default(false) // Expunere la vibrații mecanice (HG 355/2007 Fișa 140)
   heightWork         Boolean  @default(false) // Lucru la înălțime (HG 355/2007 Fișa 203)
   ```
2. Execute `npx prisma db push` to synchronize with PostgreSQL.

#### Phase 2: Job API Endpoints
Create `src/app/api/clients/[id]/jobs/route.ts`:
- `GET`: Return all jobs for client with `include: { eipRequirements: { include: { eipItem: true } }, _count: { select: { employees: true } } }`.
- `POST`: Create job with statutory fields, risk flags, and optional initial `eipItemIds`:
  ```typescript
  // Input payload:
  {
    title: string;
    corCode?: string;
    mainActivities?: string;
    equipmentUsed?: string;
    workConditions?: string;
    workersCount?: number;
    isFoodHandling?: boolean;
    isScreenWork?: boolean;
    isDrivingRequired?: boolean;
    workPosture?: string;
    maxWeightKg?: number;
    noiseExposed?: boolean;
    chemicalExposed?: boolean;
    vibrationExposed?: boolean;
    heightWork?: boolean;
    eipItemIds?: string[];
  }
  ```

Create `src/app/api/clients/[id]/jobs/[jobId]/route.ts`:
- `GET`: Return specific job with `eipRequirements` and `riskAssessments`.
- `PUT` / `PATCH`: Atomic update of job fields, risk flags, and synchronization of `eipRequirements` (connect/disconnect relations in transaction).
- `DELETE`: Remove job if no active employees reference it, or return descriptive 409 conflict.

#### Phase 3: EIP API Endpoints
1. `src/app/api/eip/items/route.ts`:
   - `GET`: List statutory EIP catalog items.
   - `POST`: Create new EIP item (`code`, `name`, `standardCode`, `protectionType`, `replacementMonths`).
2. `src/app/api/eip/requirements/route.ts`:
   - `GET?jobId=...`: Return job requirements with item details.
   - `POST`: Add requirement `{ jobId, itemId }`.
   - `DELETE`: Remove requirement.
3. `src/app/api/eip/assignments/route.ts`:
   - `GET?employeeId=...`: Return assignments for employee with item details.
   - `POST`: Record equipment handover `{ employeeId, itemId, assignedDate?, signatureDate? }`.
   - `DELETE`: Remove handover record.

#### Phase 4: Job Management UI Components
1. Create `src/components/jobs/add-job-modal.tsx`:
   - Accessible from `+ Adaugă Post` button in `src/app/clients/[id]/page.tsx`.
   - Sections:
     - Informații Post: `title` (required), `corCode`, `mainActivities`, `equipmentUsed`, `workConditions`, `workersCount`.
     - Flaguri Risc Statutar (Grid de Switch-uri/Checkbox-uri):
       - `isFoodHandling` (Manipulare alimente - Fișa 210)
       - `isScreenWork` (Lucru la monitor > 4h/zi - Fișa 243)
       - `isDrivingRequired` (Conducere auto serviciu - Fișa 209)
       - `noiseExposed` (Zgomot > 80 dB(A))
       - `chemicalExposed` (Agenți chimici - Fișa 141)
       - `vibrationExposed` (Vibrații mecanice - Fișa 140)
       - `heightWork` (Lucru la înălțime - Fișa 203)
     - Ergonomie & Efort:
       - `workPosture`: Dropdown (`Așezat (sitting)`, `Ortostatic / În picioare (standing)`, `Mixt (mixed)`).
       - `maxWeightKg`: Număr kg (ex: 5, 15, 25).
     - Dotare EIP Necesară:
       - Checkbox-uri pentru elementele EIP din catalog (`EipItem`).
2. Create `src/components/jobs/edit-job-modal.tsx`:
   - Accessible via edit icon on each job in `src/app/clients/[id]/page.tsx`.
   - Pre-populates all existing data, risk flags, and selected EIP items; saves via `PATCH /api/clients/[id]/jobs/[jobId]`.
3. Update `src/app/clients/[id]/page.tsx`:
   - Include `eipRequirements: { include: { eipItem: true } }` in `prisma.client.findUnique` query.
   - In section 7 ("Posturi & Context SSM"), add `AddJobModal` trigger in the header.
   - In job list items, render:
     - Title and COR code
     - Risk badges (e.g., green `Alimentație`, blue `Ecran`, amber `Șofat`, red `Zgomot`, purple `Înălțime`, orange `Chimic`)
     - Ergonomic info: posture and max weight
     - Required EIP pill list
     - `EditJobModal` button

#### Phase 5: Employee EIP Handover UI
1. Create `src/components/employees/manage-eip-modal.tsx`:
   - Triggered from an "EIP" button on active employee rows in `/clients/[id]` and `/employees`.
   - Displays:
     - Employee sizing badges: Încălțăminte (`shoeSize`), Haine (`clothingSize`), Mănuși (`gloveSize`).
     - List of equipment already assigned to employee (`EmployeeEipAssignment`).
     - Quick "Predare Echipament Nou" section: select from job requirements or catalog, set `assignedDate` (default today), mark `signatureDate`.
     - Direct button to generate `eip-fisa-acordare-individuala` DOCX.

#### Phase 6: Risk Assessment UI in `src/app/risk-assessments/`
1. Create `src/app/api/risk-assessments/route.ts` & `[id]/route.ts`:
   - Full CRUD endpoints supporting nested `items`, `measures`, and `hazardZones`.
2. Create `src/components/risk/create-risk-assessment-modal.tsx`:
   - Client selector, Job selector, Worksite selector.
   - Evaluator name, method (default "INCDPM"), assessment date.
   - "Preia din Profil CAEN": auto-populates initial risk items from `CAEN_RISK_PROFILES`.
   - Table of `RiskItem`s: Factor de risc, Situație, Consecință, Gravitate (1-7), Probabilitate (1-6), Nivel de risc (calculat automat).
   - Table of `PreventionMeasure`s: Tip (tehnica, organizatorica, igienico-sanitara), Descriere, Responsabil, Termen.
   - Saves to DB via `POST /api/risk-assessments`.
3. Update `src/app/risk-assessments/page.tsx`:
   - Add "+ Creează Evaluare Nouă" button opening `CreateRiskAssessmentModal`.
   - On existing assessment cards, add "Editează" and "Șterge" actions.
   - Link "Generează Raport DOCX" with `assessmentId` and `jobId` context.

---

## 5. Verification Method

### 5.1 Compilation & Schema Validation
1. Verify Prisma schema validity:
   ```bash
   npx prisma validate
   ```
   *Expected outcome*: `The schema at prisma/schema.prisma is valid 🚀`.

2. Push schema changes:
   ```bash
   npx prisma db push
   ```
   *Expected outcome*: Database schema synchronized without errors.

3. Verify Next.js and TypeScript build:
   ```bash
   npm run build
   ```
   *Expected outcome*: Exit code 0, 0 TypeScript errors, all new API routes and pages compiled.

### 5.2 API Verification Commands
1. Job creation with statutory risk flags:
   ```bash
   curl -s -X POST http://localhost:3000/api/clients/<CLIENT_ID>/jobs \
     -H "Content-Type: application/json" \
     -d '{"title":"Sudor Specialist","corCode":"721201","isFoodHandling":false,"isScreenWork":false,"isDrivingRequired":false,"noiseExposed":true,"chemicalExposed":true,"vibrationExposed":true,"heightWork":true,"workPosture":"standing","maxWeightKg":20}'
   ```
   *Expected outcome*: HTTP 200/201, created job returned with all risk flags set.

2. Job update:
   ```bash
   curl -s -X PATCH http://localhost:3000/api/clients/<CLIENT_ID>/jobs/<JOB_ID> \
     -H "Content-Type: application/json" \
     -d '{"isScreenWork":true,"workPosture":"mixed"}'
   ```
   *Expected outcome*: HTTP 200, updated job returned.

3. EIP items list and assignment:
   ```bash
   curl -s http://localhost:3000/api/eip/items
   ```
   *Expected outcome*: HTTP 200, array of at least 8 statutory items.

### 5.3 UI Flow Verification
1. Navigate to `/clients/[id]`:
   - Inspect "Posturi & Context SSM" section. Verify `+ Adaugă Post` is visible.
   - Verify risk badges (Alimentație, Ecran, Zgomot, etc.) appear on respective job cards.
   - Click "Editează" on a job; toggle risk flags, change posture/max weight, select EIP items, click Save; verify UI updates immediately.
2. Navigate to `/risk-assessments`:
   - Verify "+ Creează Evaluare Risc" button is available.
   - Open modal, select Client and Job, populate risk items and prevention measures, click Save; verify assessment card appears in list.
