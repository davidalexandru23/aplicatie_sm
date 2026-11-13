# Project: Remedieri Sistem Statutar SSM / Igienă / HR

## Architecture
Aplicația este construită pe Next.js 16 (App Router cu Turbopack), Prisma ORM 6 cu PostgreSQL, docxtemplater și Pizzip pentru generarea șabloanelor statutare DOCX/XLSX.
Arhitectura modulară cuprinde:
1. **Core Data & Persistence Layer (`prisma/schema.prisma`)**:
   - Companii (`Client`), Puncte de lucru (`Worksite`), Funcții/Posturi (`Job`).
   - Salariați (`Employee`), Documente de identitate (`IdentityDocument`), Adrese (`ResidenceAddress`).
   - Evenimente instruire (`TrainingEvent`), Participanți (`TrainingParticipant`).
   - Cursuri și examene de igienă (`HygieneSession`, `HygieneParticipant`).
   - Gestiune EIP (`EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`).
   - Evaluare riscuri și măsuri (`RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`).
   - Audit și import (`AuditEvent`, `ImportBatch`).
2. **Business Logic & Compliance Engine (`src/lib/`)**:
   - `compliance.ts`: calcul conformitate statutare (medicină muncii, instruiri SSM/PSI, igienă) cu excluderea salariaților plecați.
   - `importer.ts`: parsare, validare curată server-side și sincronizare baze de date fără atribuiri arbitrare.
   - `caen-catalog.ts` & `caen-risk-presets.ts`: catalog CAEN cu cerințe statutare de igienă și profilaxie.
   - `packages/bulk-packages.ts`: pachete operaționale ZIP (Onboarding, Dosar SSM Firmă, Arhivă Inspecție) filtrate pe riscuri reale.
3. **Template Engine (`src/lib/templates/`)**:
   - `definitions.ts`: catalogul celor 31 de șabloane statutare.
   - `resolver.ts`: rezolvare strictă a tokenurilor din baza de date, fără date fictive, fără fallback-uri impersonale, cu semnalare sinceră a datelor lipsă.
   - `generator.ts`: injectare date în DOCX/XLSX cu escapare completă XML (`&amp;`, `&lt;`, `&gt;`).
4. **API Routes (`src/app/api/`)**:
   - Rute REST pentru generare (`/api/documents/generate`, `/api/documents/generate-batch`, `/api/templates/[code]/fields`).
   - Rute operaționale pentru salariați (`/api/employees`, `/api/employees/[id]`, `/api/employees/[id]/medical-exam`, `/api/employees/[id]/terminate`).
   - Rute instruiri (`/api/trainings/record`, `/api/trainings/documents`).
   - Rute EIP (`/api/eip/items`, `/api/eip/requirements`, `/api/eip/assignments`).
   - Rute evaluare riscuri (`/api/risk-assessments`, `/api/clients/[id]/jobs/[jobId]/risks`).
   - Rute igienă (`/api/hygiene/sessions`, `/api/hygiene/sessions/[id]/participants`).
   - Rute import Excel (`/api/imports/preview`, `/api/imports/commit`).
5. **UI Layer (`src/app/`, `src/components/`)**:
   - Generare documente (`/documents/generate`) cu selectori de firmă, punct de lucru, post, salariat, și afișare completă a câmpurilor manuale.
   - Registru salariați (`/employees`) cu modale de adăugare manuală, editare completă, examen medical și încetare contract.
   - Gestiune instruiri (`/trainings`) cu planificare și descărcare directă PV-uri / fișe.
   - Gestiune igienă (`/hygiene`) cu asociere firmă și editare note/certificate.
   - Evaluare riscuri (`/risk-assessments`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Eliminare Mock Resolver | Curățare 8 blocuri fallback fictive din `resolver.ts` (Munteanu Cristian, CLIENT TEST, RO12345678, RX 123456, 15.03.1988, 0I(Rh+), 42/L/9, decizii 01-11) | M1 | R1, Survey 1 |
| 2 | Corectare `isAutocompleted` | Setare `true` doar dacă datele reale există în DB; câmpurile lipsă semnalate sincer ca needitate | M1 | R1, Survey 1 |
| 3 | Corectare `approved_for_print` | Neacordare flag când lipsesc date statutare esențiale (`cimNumber`, `grossSalary` etc.) | M1 | R1, Survey 1 |
| 4 | Deblocare Câmpuri Manuale UI | Eliminare `.slice(0, 20)` din `generate/page.tsx` pentru afișarea tuturor câmpurilor manuale | M1 | R1, Survey 1 |
| 5 | Escapare Caractere Speciale XML | Adăugare `escapeXml` în `generator.ts` pentru `&`, `<`, `>`, `"`, `'` la înlocuirea tokenurilor în XML | M1 | R1, Survey 3 |
| 6 | Eliminare Fallback Context Resolver | Eliminare fallback implicit pe `client.employees[0]`, `client.jobs[0]`, `client.worksites[0]` în `loadResolverContext` | M1 | R7, Survey 3 |
| 7 | Înregistrare Examen Medical HG 355/2007 | API `POST /api/employees/[id]/medical-exam` și modal UI pentru fișă de aptitudine (dată, termen, verdict, restricții) | M2 | R2, Survey 1 |
| 8 | Actualizare `medicalLastExamDate` | Salvare în DB și recalculare automată a conformității active | M2 | R2, Survey 1 |
| 9 | Deblocare Generare la Examen Valabil | Permite generarea documentelor fără blocaj când examenul medical este conform | M2 | R2, Survey 1 |
| 10 | Adăugare Manuală Angajat | API `POST /api/employees` și modal UI pentru creare salariat nou fără Excel | M2 | R3, Survey 1 |
| 11 | Editare Salariat Extinsă | API `PUT /api/employees/[id]` și modal UI pentru editare funcție, CI, adresă, salariu, CIM, normă, IBAN, mărimi EIP | M2 | R3, Survey 1 |
| 12 | Încetare Contract (`status: PLECAT`) | API `POST /api/employees/[id]/terminate` cu `leaveDate` și modal UI de confirmare plecare | M2 | R3, Survey 1 |
| 13 | Excludere PLECAT din Conformitate & Batch | Filtrare `status === 'PLECAT'` din `compliance.ts`, `/employees`, `/generate`, `/generate-batch`, `bulk-packages.ts` | M2 | R3, Survey 1 |
| 14 | Sincronizare Evenimente Instruire cu Doc | Corelare date reale eveniment în loc de `hireDate` pentru `ssm-pv-instruire-colectiva`, `psi-pv-instruire`, fișe | M3 | R4, Survey 2 |
| 15 | Filtrare Tipuri Evenimente Resolver | Mapare corectă a tipurilor `INTRODUCTIV`, `LOC_MUNCA`, `PERIODIC_SSM`, `PERIODIC_PSI` în tabelele din fișe | M3 | R4, Survey 2 |
| 16 | Planificare Sesiuni Viitoare | Eliminare validare dată viitoare din API și UI modal pentru instruiri cu status `planned` | M3 | R4, Survey 2 |
| 17 | Scurtături Descărcare PV/Fișă în Card | Butoane operative directe de descărcare PV colectiv, tematică și fișă individuală în `/trainings` | M3 | R4, Survey 2 |
| 18 | Eliminare Blocaj Expirare Instruire | Eliminare Catch-22 care bloca emiterea unei fișe noi dacă instruirea precedentă era expirată | M3 | R4, Survey 2 |
| 19 | Activare Modele Prisma EIP | Integrare API și UI pentru modelele `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment` | M4 | R5, Survey 2 |
| 20 | Conectare Fișă EIP la Baza de Date | Înlocuire dicționar mock 10 rânduri și mărimi 42/L/9 în `eip-fisa-acordare-individuala` cu date reale din DB | M4 | R5, Survey 2 |
| 21 | Evaluare Riscuri CRUD & Persistență | API și UI pentru creare, salvare, editare în `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone` | M4 | R6, Survey 2 |
| 22 | Conectare `risk-evaluare` la Dosar DB | Înlocuire preset CAEN static cu datele persistate în baza de date (responsabili și termene reale) | M4 | R6, Survey 2 |
| 23 | Configurare Flaguri Risc pe Post | API și formular UI pentru flagurile `Job` (`isFoodHandling`, `isScreenWork`, `workPosture`, `maxWeightKg`, `noiseExposed`) | M4 | R6, Survey 2 |
| 24 | Selector Punct de Lucru & Post | Dropdown `worksiteId` și selecție explicită `jobId` în `generate/page.tsx`, propagat în API și resolver | M5 | R7, Survey 3 |
| 25 | Filtrare Tematici / IPSSM pe Riscuri Reale | Includere condiționată a IPSSM-urilor în `bulk-packages.ts` pe baza CAEN și flagurilor postului (`isDrivingRequired` etc.) | M5 | R7, Survey 3 |
| 26 | Tratare Erori per Salariat & Logging ZIP | Izolare `try/catch` per salariat în `generate-batch/route.ts` și adăugare fișier jurnal `00_RAPORT_GENERARE_LOT.txt` în ZIP | M5 | R7, Survey 3 |
| 27 | Asociere `HygieneSession` cu `Client` | Adăugare `clientId` pe `HygieneSession` în Prisma, actualizare API și UI pentru selecție companie | M5 | R8, Survey 3 |
| 28 | Editare Participanți Igienă & Certificate | Endpoint `PATCH /api/hygiene/sessions/[id]/participants/[participantId]` și UI pentru notă, prezență, serie certificat | M5 | R8, Survey 3 |
| 29 | Conformitate Igienă pe Baza CAEN / Post | Calcul conformitate igienă în `compliance.ts` pe baza codului CAEN (5610 etc.) și a flag-ului `job.isFoodHandling` | M5 | R8, Survey 3 |
| 30 | Eliminare Atribuire `hireDate` la Import | În `importer.ts:891-893`, setare `null` pentru examen medical și instruiri când lipsesc dovezi reale | M5 | R8, Survey 3 |
| 31 | Re-validare Server-Side & Persistență Diff | Re-validare strictă în `/api/imports/commit` și salvare `validationReport` + `diffData` în `ImportBatch` | M5 | R8, Survey 3 |
| 32 | Suită E2E Tiers 1-4 & Întărire Tier 5 | Rulare și trecere 100% a testelor E2E opaque-box (Tiers 1-4) urmată de întărire adversarială (Tier 5) | M6 | Acceptance Criteria |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Template Resolver & Generator Data Integrity | Features 1, 2, 3, 4, 5, 6: Curățare completă fallback-uri mock în `resolver.ts`, semnalare sinceră lipsuri, reparare `approved_for_print`, afișare toate câmpurile în UI, `escapeXml` în `generator.ts`, eliminare fallback pe `employee[0]`/`jobs[0]`/`worksites[0]` | none | DONE |
| M2 | Employee Lifecycle CRUD, Occupational Health & Status PLECAT | Features 7, 8, 9, 10, 11, 12, 13: Rute API și modale UI pentru fișă de aptitudine (HG 355/2007), adăugare manuală salariat, editare completă, încetare contract (`status: PLECAT`) și filtrare exhaustivă a celor plecați din calculul de conformitate și generări | M1 | DONE |
| M3 | Training Module Synchronization & Statutory Docs | Features 14, 15, 16, 17, 18: Sincronizare date reale evenimente instruire cu PV colectiv și fișe individuale, mapare tipuri evenimente în resolver, planificare sesiuni viitoare, butoane descărcare în UI, eliminare blocaj expirare | M1 | DONE |
| M4 | EIP Management (HG 1048/2006) & Risk Assessments | Features 19, 20, 21, 22, 23: Activare API și UI pentru modelele EIP (`EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`), conectare fișă EIP la date reale, CRUD complet evaluări de risc (`RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`), conectare `risk-evaluare` la dosar DB, configurare flaguri de risc pe post | M1 | DONE |
| M5 | Context Selection, Bulk Packages, Hygiene Flow & Excel Import | Features 24, 25, 26, 27, 28, 29, 30, 31: Selector punct de lucru și post în UI, filtrare dinamică IPSSM pe CAEN și riscuri, tratare erori per salariat și log ZIP în batch, legătură `HygieneSession.clientId`, actualizare participanți/certificate igienă, conformitate igienă pe CAEN/post, eliminare atribuire automată `hireDate` la import, re-validare server-side și persistență rapoarte diff | M2, M3, M4 | DONE |
| M6 | Final Acceptance: E2E Test Suite (Tiers 1-4) & Adversarial Hardening (Tier 5) | Feature 32: Validare 100% E2E teste opaque-box din `TEST_READY.md` și rulare ciclu adversarial Challenger / Worker / Reviewer / Forensic Auditor | M1, M2, M3, M4, M5 | DONE |

---

## Interface Contracts

### M1 ↔ M2, M3, M4, M5: Resolver & Generator Context
- `TemplateResolutionContext`:
  ```typescript
  export interface TemplateResolutionContext {
    templateCode: string;
    clientId: string;
    employeeId?: string;
    jobId?: string;
    worksiteId?: string;
    hygieneSessionId?: string;
    hygieneParticipantId?: string;
    customOverrides?: Record<string, unknown>;
    allowOfflineBlank?: boolean;
  }
  ```
- `ResolvedTemplateData`:
  - `data: Record<string, unknown>` (fără date fabricate; câmpurile absente rămân `''` sau `undefined`).
  - `isAutocompleted: boolean` per placeholder (doar dacă valoarea provine dintr-o entitate reală din DB).
  - `missingFields: string[]` (lista tokenurilor statutare obligatorii care nu au valoare în DB).
  - `approvedForPrint: boolean` (`true` doar dacă `missingFields.length === 0` și datele esențiale precum CIM și salariu sunt prezente).

### M2: Employee Lifecycle & Occupational Health Contracts
- `POST /api/employees/[id]/medical-exam`:
  - Input: `{ examDate: string (ISO), intervalMonths: number, fitnessVerdict: "APT" | "APT_CONDITIONAT" | "INAPT_TEMPORAR" | "INAPT", notes?: string }`
  - Output: `{ success: true, employee: Employee, compliance: EmployeeCompliance }`
- `POST /api/employees`:
  - Input: `{ clientId: string, lastName: string, firstName: string, cnp: string, hireDate: string, currentJobId?: string, currentWorksiteId?: string, grossSalary?: number, cimNumber?: string, cimDate?: string, workNorm?: number, ... }`
  - Output: `{ success: true, employee: Employee }`
- `POST /api/employees/[id]/terminate`:
  - Input: `{ leaveDate: string (ISO), reason?: string }`
  - Output: `{ success: true, employee: Employee (status: "PLECAT") }`

### M3: Trainings Module Contracts
- `POST /api/trainings/record`:
  - Input: `{ clientId: string, type: "INTRODUCTIV" | "LOC_MUNCA" | "PERIODIC_SSM" | "PERIODIC_PSI", date: string (ISO), durationHours: number, trainerName: string, participantIds: string[], status?: "completed" | "planned", notes?: string }`
  - Output: `{ success: true, event: TrainingEvent }`

### M4: EIP & Risk Assessment Contracts
- `GET /api/eip/requirements?jobId=...`:
  - Output: `{ requirements: (JobEipRequirement & { item: EipItem })[] }`
- `POST /api/eip/assignments`:
  - Input: `{ employeeId: string, itemId: string, handoverDate: string, quantity: number, notes?: string }`
- `POST /api/risk-assessments`:
  - Input: `{ clientId: string, jobId?: string, worksiteId?: string, evaluationDate: string, evaluatorName: string, items: RiskItemInput[], measures: PreventionMeasureInput[] }`
  - Output: `{ success: true, assessment: RiskAssessment }`

### M5: Hygiene & Batch Generation Contracts
- `PATCH /api/hygiene/sessions/[id]/participants/[participantId]`:
  - Input: `{ attendance?: "prezent" | "absent", examGrade?: number, examResult?: "admis" | "respins", certificateSeries?: string, certificateNumber?: string }`
  - Output: `{ success: true, participant: HygieneParticipant }`
- `POST /api/documents/generate-batch`:
  - Output: Blob ZIP cu `00_RAPORT_GENERARE_LOT.txt` și fișierele DOCX/XLSX generate cu succes; raport detaliat de erori per salariat fără blocaj 400.

---

## Code Layout
- `prisma/schema.prisma` — Schema bazei de date (PostgreSQL).
- `src/lib/templates/definitions.ts` — Catalog definiții șabloane statutare.
- `src/lib/templates/resolver.ts` — Rezolvitor tokenuri statutare.
- `src/lib/templates/generator.ts` — Generator DOCX/XLSX cu XML escaping.
- `src/lib/compliance.ts` — Motor calcul conformitate statutare (medicină, instruiri, igienă).
- `src/lib/importer.ts` — Motor import și validare date Excel.
- `src/lib/packages/bulk-packages.ts` — Generatoare pachete operative (Onboarding, Dosar, Arhivă).
- `src/app/api/` — Rute API backend Next.js.
- `src/app/documents/generate/page.tsx` — Generator documente individual și batch.
- `src/app/employees/` — Registru și gestiune salariați.
- `src/app/trainings/` — Modul evidență și planificare instruiri.
- `src/app/hygiene/` — Modul cursuri și certificate igienă.
- `src/app/risk-assessments/` — Modul dosare evaluare riscuri și plan de prevenire.
- `scripts/` — Suite de verificare și testare automată (`verify-all.ts`, `e2e-suite.ts`, etc.).
