# Scope: Milestone 4: EIP Management (HG 1048/2006) & Risk Assessments

## Architecture
Milestone 4 establishes full statutory compliance for Personal Protective Equipment (HG 1048/2006) and Occupational Risk Assessment & Prevention Planning (Legea 319/2006 art. 7-13, HG 1425/2006):
1. **Personal Protective Equipment (EIP) Subsystem (HG 1048/2006)**:
   - Full activation of Prisma models: `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`.
   - API endpoints:
     - `GET & POST /api/eip/items`: Catalog of statutory EIP items (name, standard/norm, replacement period in months, body category).
     - `GET & POST /api/eip/requirements`: Job-level statutory equipment allocation requirements (`jobId`, `itemId`, mandatory flag).
     - `GET & POST /api/eip/assignments`: Handover of equipment to individual employee (`employeeId`, `itemId`, `handoverDate`, `quantity`, `expiryDate`, `notes`).
   - Authentic template data resolution in `src/lib/templates/resolver.ts` for `eip-fisa-acordare-individuala`:
     - Populates actual assigned equipment rows from DB (`EmployeeEipAssignment` joined with `EipItem`), or fallback to job requirements when no assignment has been made yet.
     - Uses real employee sizing (`shoeSize`, `clothingSize`, `gloveSize`) from `Employee` record, eliminating all mock dictionaries and static sizes (42/L/9).
2. **Occupational Risk Assessment & Prevention Plan Subsystem (Legea 319/2006)**:
   - Full activation and persistence for Prisma models: `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`.
   - API endpoints:
     - `GET & POST /api/risk-assessments`: List assessments for a client/job/worksite and create new assessment dossier with nested `items`, `measures`, `hazardZones`.
     - `GET, PUT, DELETE /api/risk-assessments/[id]`: Retrieve full dossier, update evaluation items, prevention measures, responsibles, and deadlines.
   - Authentic template data resolution in `src/lib/templates/resolver.ts` for `risk-evaluare`:
     - Binds directly to the persisted `RiskAssessment` in PostgreSQL, generating the statutory evaluation matrix and prevention/protection plan with real risk factors, identified hazards, gravity/probability scores, assigned responsible persons, and calendar deadlines (eliminating static/generic CAEN preset plans).
3. **Job Risk Flag Configuration**:
   - Extended API and UI support on `Job` for statutory medical & safety risk flags:
     - `isFoodHandling`, `isScreenWork`, `workPosture`, `maxWeightKg`, `noiseExposed`, `chemicalExposed`, `vibrationExposed`, `heightWork`, `isDrivingRequired`.
   - Enables ergonomic, occupational medicine (HG 355/2007 tabele specifice), and safety filtering based on real job parameters.

---

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 19 | Activare Modele Prisma EIP | API și interfețe pentru `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment` | M4 | DONE |
| 20 | Conectare Fișă EIP la Baza de Date | Rezolvare `eip-fisa-acordare-individuala` pe baza dotării postului și a predărilor reale din DB cu mărimi reale din profil | M4 | DONE |
| 21 | Evaluare Riscuri CRUD & Persistență | API și UI pentru salvare, listare și editare completă a dosarelor de evaluare a riscurilor în `RiskAssessment`, `RiskItem`, `PreventionMeasure` | M4 | DONE |
| 22 | Conectare `risk-evaluare` la Dosar DB | Înlocuire plan CAEN static cu dosarul real persistat în DB (responsabili și termene reale) | M4 | DONE |
| 23 | Configurare Flaguri Risc pe Post | API și UI pentru flagurile de risc pe post (`isFoodHandling`, `isScreenWork`, `workPosture`, etc.) | M4 | DONE |

---

## Interface Contracts

### 1. EIP APIs:
- `GET /api/eip/items` & `POST /api/eip/items`:
  - Body: `{ code: string, name: string, category?: string, standard?: string, replacementMonths?: number, description?: string }`
- `GET /api/eip/requirements?jobId=...` & `POST /api/eip/requirements`:
  - Body: `{ jobId: string, itemId: string, isMandatory?: boolean, quantityPerYear?: number, notes?: string }`
- `GET /api/eip/assignments?employeeId=...` & `POST /api/eip/assignments`:
  - Body: `{ employeeId: string, itemId: string, handoverDate: string, quantity: number, condition?: string, notes?: string }`

### 2. Risk Assessment APIs:
- `POST /api/risk-assessments`:
  - Body:
    ```typescript
    {
      clientId: string;
      jobId?: string;
      worksiteId?: string;
      assessmentDate: string; // ISO
      evaluatorName: string;
      evaluatorRole?: string;
      overallRiskLevel?: number;
      items: {
        hazardZone?: string;
        riskElement: string;
        riskFactor: string;
        manifestationForm?: string;
        consequences?: string;
        severityLevel: number;
        probabilityLevel: number;
        riskScore: number;
      }[];
      measures: {
        riskItemId?: string;
        measureType: "TEHNICA" | "ORGANIZATORICA" | "IGIENICO_SANITARA" | "ALTA";
        description: string;
        responsiblePerson: string;
        deadline: string;
      }[];
    }
    ```
- `GET /api/risk-assessments/[id]` & `PUT /api/risk-assessments/[id]`:
  - Retrieval and full atomic update of assessment with relations.

### 3. Job Risk Flags API:
- `PUT /api/clients/[id]/jobs/[jobId]` (or `PATCH /api/jobs/[id]`):
  - Updates: `{ isFoodHandling?: boolean, isScreenWork?: boolean, workPosture?: string, maxWeightKg?: number, noiseExposed?: boolean, isDrivingRequired?: boolean, heightWork?: boolean }`

### 4. Template Resolver Contracts:
- `eip-fisa-acordare-individuala`:
  - Resolves actual assigned items or job requirements from DB.
  - Generates loop table `{#dotare_eip}` / `{#echipamente}` with `{ nr, denumire, standard, termen, cantitate, dataPredare }`.
  - Injects `shoeSize`, `clothingSize`, `gloveSize` directly from employee.
- `risk-evaluare`:
  - Resolves persisted `RiskAssessment` when `assessmentId` or `jobId` context is provided, injecting real evaluated factors and the Prevention and Protection Plan table (`{#masuri}`).

---

## Code Layout
- `src/app/api/eip/items/route.ts` — EIP items catalog API
- `src/app/api/eip/requirements/route.ts` — Job EIP requirements API
- `src/app/api/eip/assignments/route.ts` — Employee EIP assignments API
- `src/app/api/risk-assessments/route.ts` & `[id]/route.ts` — Risk assessments CRUD API
- `src/lib/templates/resolver.ts` — Resolution of EIP items, employee sizes, and DB-backed risk evaluation & prevention plan
- `src/app/risk-assessments/` — UI for risk assessment creation and inspection
- `src/components/` or pages for EIP management and job risk flags
