# Scope: Milestone 5: Context Selection, Bulk Packages, Hygiene Flow & Excel Import

## Architecture
Milestone 5 ties together cross-cutting operational context selection, statutory bulk packages generation, hygiene compliance & certificates, and clean, uncorrupted Excel data onboarding:
1. **Context Selection & Worksite/Job Plumbing (Features 24 & 6)**:
   - In `src/app/documents/generate/page.tsx` and `/api/documents/generate`:
     - Explicit dropdown selection for `worksiteId` and `jobId`.
     - Completely eliminates resolver fallback on `client.employees[0]`, `client.jobs[0]`, `client.worksites[0]`. If no employee or job is chosen for an employee-specific or job-specific template, require explicit selection or leave unpopulated.
2. **Bulk Packages Dynamic Filtering & Error Resilience (Features 25 & 26)**:
   - In `src/lib/packages/bulk-packages.ts`:
     - Filter IPSSMs, internal decisions, and safety topics conditionally based on the company's real CAEN code and job risk flags (`isDrivingRequired`, `chemicalExposed`, `heightWork`, `isFoodHandling`, `isScreenWork`).
   - In `src/app/api/documents/generate-batch/route.ts`:
     - Isolate errors per employee inside a `try/catch` block.
     - Add a structured log file `00_RAPORT_GENERARE_LOT.txt` inside the returned ZIP archive listing all processed employees, successes, and individual errors without failing the entire batch (no blind HTTP 400 when one employee has missing optional data).
3. **Hygiene Subsystem: Company Association, Evaluation & Certificates (Features 27, 28, 29)**:
   - Model `HygieneSession` connected to `Client` (`clientId` relation).
   - API endpoints:
     - `GET & POST /api/hygiene/sessions`: Filtered by company `clientId`.
     - `PATCH /api/hygiene/sessions/[id]/participants/[participantId]`: Update attendance (`prezent`/`absent`), exam grade (1-10), exam result (`admis`/`respins`), certificate series & number.
   - UI views in `src/app/hygiene/` for company selection, participant examination grading, and certificate emission.
   - Statutory compliance calculation in `src/lib/compliance.ts`:
     - Mandatory hygiene compliance for CAEN 5610 (Restaurante/Alimentație publică) and food-handling workers (`job.isFoodHandling === true`).
     - Certificate valid for 36 months (3 years) conform Ordinul MS/ME 2209/4469/2022.
4. **Excel Import Integrity & Server-Side Re-validation (Features 30 & 31)**:
   - In `src/lib/importer.ts`:
     - Eliminate automatic substitution of `hireDate` for missing medical examination or training dates. Missing dates in Excel must import as `null`, preserving sincere `MISSING` compliance status.
   - In `src/app/api/imports/commit/route.ts`:
     - Strict server-side re-validation of parsed rows before committing.
     - Persist `validationReport` (JSON) and `diffData` (JSON) directly onto `ImportBatch` in PostgreSQL.

---

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 24 | Selector Punct de Lucru & Post | Selector explicit `worksiteId` și `jobId` în UI și propagat în API și resolver | M5 | DONE |
| 25 | Filtrare Tematici / IPSSM pe Riscuri Reale | Includere condiționată a IPSSM-urilor în `bulk-packages.ts` pe baza CAEN și flagurilor postului | M5 | DONE |
| 26 | Tratare Erori per Salariat & Logging ZIP | Izolare `try/catch` per salariat în batch generation și includere fișier `00_RAPORT_GENERARE_LOT.txt` în ZIP | M5 | DONE |
| 27 | Asociere `HygieneSession` cu `Client` | Legătură `HygieneSession.clientId` în Prisma, actualizare API și UI pentru selecție companie | M5 | DONE |
| 28 | Editare Participanți Igienă & Certificate | Endpoint PATCH și UI pentru notă, prezență, serie certificat în sesiuni de igienă | M5 | DONE |
| 29 | Conformitate Igienă pe Baza CAEN / Post | Calcul conformitate igienă în `compliance.ts` pe baza CAEN 5610 și `job.isFoodHandling` (valabilitate 3 ani) | M5 | DONE |
| 30 | Eliminare Atribuire `hireDate` la Import | Setare `null` pentru examen medical și instruiri când lipsesc dovezi reale în Excel | M5 | DONE |
| 31 | Re-validare Server-Side & Persistență Diff | Re-validare server-side în commit și salvare `validationReport` + `diffData` în `ImportBatch` | M5 | DONE |

---

## Interface Contracts

### 1. Context Selection:
- `POST /api/documents/generate`:
  - Input: `{ templateCode, clientId, employeeId?, jobId?, worksiteId?, ... }`
  - Explicit selection respected; no blind fallback to first employee or first job.

### 2. Batch Generation & ZIP Logging:
- `POST /api/documents/generate-batch`:
  - Generates ZIP with individual employee folders/documents.
  - Generates `00_RAPORT_GENERARE_LOT.txt` containing generation timestamp, total requested, success count, failure count, and per-employee status lines.

### 3. Hygiene APIs:
- `PATCH /api/hygiene/sessions/[id]/participants/[participantId]`:
  - Body: `{ attendance?: "prezent" | "absent", examGrade?: number, examResult?: "admis" | "respins", certificateSeries?: string, certificateNumber?: string }`
  - Response: `{ success: true, participant: HygieneParticipant }`

### 4. Excel Import Commit:
- `POST /api/imports/commit`:
  - Input: `{ batchId: string }`
  - Re-validates server-side; persists diff and validation summary on `ImportBatch`.

---

## Code Layout
- `src/app/documents/generate/page.tsx` — Worksite & job selector updates
- `src/lib/packages/bulk-packages.ts` — Conditional IPSSM packaging on CAEN & job flags
- `src/app/api/documents/generate-batch/route.ts` — Per-employee try/catch and `00_RAPORT_GENERARE_LOT.txt`
- `src/app/api/hygiene/sessions/route.ts` & `[id]/participants/[participantId]/route.ts` — Hygiene API routes
- `src/app/hygiene/` — Hygiene management UI
- `src/lib/compliance.ts` — Hygiene compliance calculation (CAEN 5610, food handling, 36 months validity)
- `src/lib/importer.ts` — Excel import logic (null instead of hireDate)
- `src/app/api/imports/commit/route.ts` — Server-side revalidation & diff persistence
