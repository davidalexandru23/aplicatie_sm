# Audit & Implementation Blueprint: Tier 3 (Pairwise Cross-Feature) & Tier 4 (Statutory Real-World Scenarios)

## 1. Observation

### 1.1 Existing Test Suite Analysis (`scripts/e2e-suite.ts` & `scripts/verify-all.ts`)
- **File**: `scripts/e2e-suite.ts:771-915` (Tier 3)
  - Directly contains only **4 isolated test cases**:
    1. Line 771: `Integration - State Renewal Transition` (tests in-memory object `empBefore` and `empAfter` with `calculateEmployeeCompliance`).
    2. Line 801: `Integration - Company Metrics Aggregation` (tests 4 in-memory employee mock objects).
    3. Line 866: `Integration - Document Generation with Compliance Dates` (tests isolated rendering of `hygiene-adeverinta` with `fullSampleData`).
    4. Line 874: `Integration - Multi-Client Tenant Isolation` (tests in-memory arrays `clientA` vs `clientB` with `calculateCompanyMetrics`).
  - **Verdict on Tier 3**: Zero database transactions, zero API calls, zero multi-feature interaction across the 31 statutory features. Does NOT satisfy pairwise coverage requirements.
- **File**: `scripts/e2e-suite.ts:920-1010` (Tier 4)
  - Directly contains only **4 isolated lifecycle test cases**:
    1. Line 922: `Lifecycle - Phase 1: Onboarding Pack` (renders 5 templates in isolation using static sample data dictionary).
    2. Line 939: `Lifecycle - Phase 2 & 3: Medical Exam & Intro Training` (tests isolated math function `calculateItemCompliance`).
    3. Line 951: `Lifecycle - Phase 4 & 5: Workplace Training & Time-Travel Scadențe` (evaluates an in-memory object through 4 dates).
    4. Line 993: `Lifecycle - Phase 6: Full Company SSM Inspection Pack` (renders 6 templates with static sample data).
  - **Verdict on Tier 4**: None of the 8 statutory scenarios defined in `TEST_INFRA.md:48-58` are implemented. No live DB transitions, no API integration, no multi-worksite/job context resolution, no artifact ZIP unpacking with disk/XML assertions.

### 1.2 Fragmented Logic & Legacy Invariants Across Standalone Scripts
- **File**: `scripts/test-batch-generation-compliance.ts:55-72`
  - Explicitly asserts that calling `/api/documents/generate-batch` for an employee with expired training must return **HTTP 400 rejection**:
    ```typescript
    const rejectRes = await fetch('http://localhost:3000/api/documents/generate-batch', { ... });
    if (rejectRes.status === 400 && rejectBody.error.includes('Stan Alexandru')) {
      console.log('✓ SUCCES: Cererea a fost blocată conform legii (Status 400)');
    }
    ```
  - Contradicts updated statutory requirements:
    - **Feature 18**: Eliminates Catch-22 expiry lockout on generating individual sheets.
    - **Feature 26**: Mandates per-employee error isolation and generation of `00_RAPORT_GENERARE_LOT.txt` inside the ZIP rather than throwing HTTP 400.
- **File**: `src/lib/templates/generator.ts:345-372`
  - Scans XML and `.rels` files for `{PLACEHOLDER_KEY}` and performs direct string replacement:
    ```typescript
    const strVal = String(v);
    const curly = `{${k}}`;
    if (text.includes(curly)) {
      text = text.replaceAll(curly, strVal); // Raw string injection without escapeXml!
      changed = true;
    }
    ```
  - When company name or address contains `&`, `<`, `>`, `"`, `'` (e.g. `Pop & Partners S.R.L.`), raw unescaped XML entities corrupt the Word DOCX document (`XML parsing error`).
- **File**: `src/lib/packages/bulk-packages.ts:118-119`
  - Contains context fallbacks that violate Feature 6:
    ```typescript
    const job = employee.currentJob || client.jobs[0] || null;
    const worksite = employee.currentWorksite || client.worksites[0] || null;
    ```
- **File**: `scripts/adversarial-caen-stress.ts` & `scripts/adversarial-excel-dirty-stress.ts`
  - Implement strong validation helpers (e.g. `scanDocxForPlaceholders`, `scanXlsxForPlaceholders`, CAEN 5610 normalization, PLECAT status validation), but these exist as ad-hoc, isolated scripts not integrated into the unified E2E runner.

---

## 2. Logic Chain

1. **Premise 1**: `TEST_INFRA.md` requires Tier 3 pairwise cross-feature coverage across 31 statutory features, and Tier 4 execution of 8 comprehensive real-world scenarios.
2. **Premise 2**: Existing `scripts/e2e-suite.ts` tests only 4 unit-level mock cases in Tier 3 and 4 template rendering cases in Tier 4. The 8 statutory scenarios are 0% implemented in `e2e-suite.ts`.
3. **Premise 3**: Features in Milestone M1 (XML escaping, resolver cleanup, no-fallback context), Milestone M2 (Occupational health exam, CRUD, status PLECAT), Milestone M3 (training sync & scheduler), Milestone M4 (EIP, Risk assessments), and Milestone M5 (Hygiene client link, batch ZIP logging) interact deeply. A change in one directly impacts the validity of another (e.g., medical exam clearance unblocks batch generation; status PLECAT removes employee from company compliance; job risk flags dictate EIP requirements).
4. **Deduction**: A comprehensive blueprint must establish:
   - A pairwise interaction matrix (Tier 3) with at least 15 concrete cross-feature integration test cases.
   - Exact end-to-end data flows, inputs, DB state transitions, and artifact assertions for all 8 statutory real-world scenarios (Tier 4).
   - Test harness architecture allowing Test Writers to execute against both operational HTTP API endpoints and direct service-layer transactions without brittle test environment failures.

---

## 3. Tier 3: Pairwise Cross-Feature Combinations Matrix

The 31 statutory features partition into 5 core functional clusters:
- **Cluster A: Data Integrity & Resolver Engine** (F1, F2, F3, F4, F5, F6)
- **Cluster B: Employee Lifecycle & Occupational Health** (F7, F8, F9, F10, F11, F12, F13)
- **Cluster C: Training Module & Statutory Sheets** (F14, F15, F16, F17, F18)
- **Cluster D: EIP & Risk Assessments** (F19, F20, F21, F22, F23)
- **Cluster E: Context Selection, Hygiene, Packages & Import** (F24, F25, F26, F27, F28, F29, F30, F31)

### 3.1 Pairwise Interaction Specifications (15 High-Risk Intersections)

| Test ID | Intersecting Features | Pairwise Description | Preconditions | Trigger / Operation | Expected Behavior & Invariants |
|---------|----------------------|-----------------------|---------------|---------------------|--------------------------------|
| **T3-01** | **F1/F2/F3 x F10/F11** | Manual Employee CRUD x Resolver Missing Fields & Print Readiness | Client created in DB with no employees. | `POST /api/employees` creates employee with missing CIM & salary. Then `PUT /api/employees/[id]` supplies CIM & salary. | After create: `missingFields` includes `PLACEHOLDER_NUMAR_CIM`, `isAutocompleted` false for CIM, `approvedForPrint: false`. After edit: `missingFields` empty, `approvedForPrint: true`. |
| **T3-02** | **F5 x F10/F24** | XML Escaping x Special Characters in Entity & Post Data | Client named `"ATELIER DESIGN & ARHITECTURĂ S.R.L."` with address `"Str. M&M <B1>"`. | Add employee `"Pop & Radu"` to job `"Arhitect & Urbanist"`. Generate `hr-cim-2026`. | Generated DOCX unpacks with PizZip; `word/document.xml` parses with zero XML syntax errors; `&` replaced by `&amp;`; no text corruption. |
| **T3-03** | **F6 x F24** | Resolver Fallback Elimination x Worksite & Post Disambiguation | Client has 2 Worksites (Sediu, Fabrică) and 2 Jobs (Inginer, Sudor). | Resolve `anexa-fisa-postului-ssm` with explicit `jobId = Sudor.id`. Repeat without `jobId`. | With `jobId`: resolves strictly to "Sudor" risks. Without `jobId`: does NOT fall back to `jobs[0]`; reports `missingFields` or raises clear validation error. |
| **T3-04** | **F7/F8/F9 x F18/F26** | Medical Exam HG 355/2007 x Batch Generation Clearance | Employee with `medicalLastExamDate` 14 months ago (OVERDUE). | Record valid medical exam (`POST /api/employees/[id]/medical-exam`, 12 months, APT). Then run batch generation. | Compliance shifts immediately from `OVERDUE` to `VALID` (365d). Batch generation succeeds without error; ZIP contains generated file and positive log in `00_RAPORT_GENERARE_LOT.txt`. |
| **T3-05** | **F12/F13 x F8/F26** | Employee Termination (`status: PLECAT`) x Compliance Rollup & Batch Exclusion | Client has 3 active employees: 2 valid, 1 overdue on SSM & Medicine. Company score ~67%. | Terminate overdue employee (`POST /api/employees/[id]/terminate`, leaveDate). Then recalculate metrics & run batch. | Employee status becomes `PLECAT`. `calculateCompanyMetrics` ignores terminated employee; company score rises to 100%. Batch generation omits terminated employee. |
| **T3-06** | **F14/F15 x F17** | Training Sync with Real Dates x Direct Card Download | Client has 3 employees. Training recorded with `eventDate: 2026-05-10`. | Call `POST /api/trainings/record`. Then fetch generated documents for this event. | `ssm-pv-instruire-colectiva` contains exact date `10.05.2026` (not hireDate). All 3 employees listed. `ssm-fisa-instruire-individuala` contains row with 10.05.2026 and duration. |
| **T3-07** | **F16 x F14/F8** | Training Planning Future (`status: planned`) x Compliance Invariant | Employee currently OVERDUE on SSM. | Call `POST /api/trainings/record` with future date (`eventDate: today + 10d`), `status: "planned"`. | Event persisted with status `planned`. Employee's `ssmLastTrainingDate` is NOT updated; compliance remains `OVERDUE` until training is performed. |
| **T3-08** | **F18 x F14** | Eliminare Catch-22 Expiry Lockout x Training Sheet Generation | Employee SSM is expired by 45 days. Operator wants to print new training sheet for upcoming session. | Request generation of `ssm-fisa-instruire-individuala`. | Generation SUCCEEDS (status 200). Does not return HTTP 400 error. Training sheet generated with blank or planned entry for the new session. |
| **T3-09** | **F19/F20 x F23** | EIP Models & Assignments x Job Risk Profiling | Job created with `isFoodHandling: true`. Required EIP: Pantofi bucătar, Bonetă, Șorț. | Assign EIP items to Employee with `shoeSize: "39"`, `clothingSize: "M"`. Generate `eip-fisa-acordare-individuala`. | DOCX contains assigned items from DB with sizes 39/M; zero mock 42/L/9; zero unmapped tokens. |
| **T3-10** | **F21/F22 x F23/F25** | Risk Assessment DB Persistence x CAEN & Job Context | Client CAEN 6201 (IT). Job "Programator" with `isScreenWork: true`. | Persist `RiskAssessment`, `RiskItem` (efort vizual), `PreventionMeasure` (pauze ecran) in DB. Generate `risk-evaluare`. | DOCX reflects DB-persisted hazards, scores, and real measures; replaces static generic CAEN profile. |
| **T3-11** | **F24 x F25** | Worksite & Job Selection x IPSSM Filtering | Client has Worksite "Sediu" (birou) and Worksite "Depozit" (manipulare marfă). | Generate dossier or IPSSM pack specifying `worksiteId: Depozit`. | Includes `ipssm-manipulare-manuala` and `ipssm-depozitare`; excludes purely administrative templates. |
| **T3-12** | **F26 x F3** | Batch Error Isolation x Unapproved Print Flag | Batch generation for 3 employees: Emp 1 complete, Emp 2 complete, Emp 3 missing salary & CIM. | Call `POST /api/documents/generate-batch`. | Batch returns 200 with ZIP. ZIP contains DOCX for Emp 1 and Emp 2. ZIP contains `00_RAPORT_GENERARE_LOT.txt` detailing that Emp 3 was flagged for missing fields. |
| **T3-13** | **F27/F28/F29 x F23** | Hygiene Client Association x Food Handling Job Compliance | Client CAEN 5610 has Job with `isFoodHandling: true`. | Link `HygieneSession` to `Client`. Edit participant (`PATCH .../participants/[id]`) with grade 10, admitted, DSP cert. | Employee `hygieneLastExamDate` updated. `compliance.hygieneCertificate.status` transitions from `MISSING` to `VALID` (36 months). |
| **T3-14** | **F30/F31 x F1/F2** | Excel Import Clean Dates x Server Re-Validation & Missing Fields | Import Excel file with new hire lacking medical & SSM dates. | `POST /api/imports/commit`. | Employee saved in DB with `medicalLastExamDate: null` (hireDate NOT used). Resolver flags medical placeholders as missing. |
| **T3-15** | **F31 x F12** | Excel Import Diff & Re-Validation x Status PLECAT Invariants | Import Excel with 2 rows: 1 active, 1 marked PLECAT without leaveDate. | `POST /api/imports/preview` followed by `commit`. | Preview detects error on PLECAT row ("Pentru statusul PLECAT este necesară data plecării"). Commit rejects or skips invalid row with audit log in `ImportBatch`. |

---

## 4. Tier 4: The 8 Statutory Real-World Scenarios Detailed Specifications

### Scenario 1: Onboarding Complet Restaurant Nou (Horeca CAEN 5610)
- **Features Exercised**: F1-F6, F10, F11, F19, F20, F27, F29, F24, F25.
- **Statutory Framework**: Legea 319/2006, HG 1425/2006, HG 355/2007 (Fișa 210 - Alimentație Publică), HG 1048/2006 (EIP), Ordinul MS/ME 2209/4469/2022 (Igienă).
- **End-to-End Data Flow**:
  1. **Company & Worksite Setup**:
     - Client: `BISTRO TRANSILVANIA S.R.L.`, CUI `RO56101234`, RegCom `J08/561/2024`, CAEN `5610` ("Restaurante"), Risk Class `MEDIUM`.
     - Worksite: `Punct de Lucru Brașov - Restaurant & Bucătărie Centrală`, Adresă: `Str. Republicii nr. 45, Brașov`.
     - SEPP Provider: Linked to default provider (`SsmProvider`) and default specialist (`SsmSpecialist`).
  2. **Job Definition & Risk Profiling**:
     - Job: `Bucătar Șef` (COR 343401), `isFoodHandling: true`, `workPosture: "standing"`, `maxWeightKg: 20`, `noiseExposed: false`.
     - EIP Requirements configured for Job (`JobEipRequirement`):
       - `EIP-INC-01`: Încălțăminte antiderapantă bucătărie (EN ISO 20345)
       - `EIP-BON-01`: Bonetă de protecție textilă
       - `EIP-SOR-01`: Șorț impermeabil din cauciuc/poliuretan
  3. **Employee Manual Intake**:
     - Employee: `Dumitrescu Elena`, CNP `2920415080012`, CI seria `BV` nr `789012`, Hire Date `2026-06-01`.
     - CIM: `105/28.05.2026`, Salariu brut: `5200 LEI`, Normă: 8h, IBAN: `RO49AAAA1B31007593840000`.
     - Mărimi EIP: `shoeSize: "38"`, `clothingSize: "M"`, `gloveSize: "7.5"`.
  4. **Occupational Medicine Pre-Employment Check**:
     - Medical Exam HG 355/2007 Fișa 210: Examen clinic general, coproparazitologic, coprobacteriologic, RPS.
     - Fitness verdict: `APT`, Date: `2026-05-29`, Interval: 12 luni.
  5. **Hygiene Session Linkage & Enrollment**:
     - Session linked to Client (`clientId: client.id`), module: "Nivelul 1 - Servicii de alimentație publică".
     - Participant status: `programata`.
  6. **1-Click Onboarding Package Generation**:
     - Trigger: `generateEmployeeOnboardingZip({ clientId, employeeId })`.
- **Database State Transitions**:
  - `Client`: Created with CAEN 5610.
  - `Job`: Created with `isFoodHandling: true` and 3 `JobEipRequirement` records.
  - `Employee`: Created with status `ACTIV`, complete CIM details, EIP sizes, and `medicalLastExamDate: 2026-05-29`.
  - `EmployeeEipAssignment`: 3 records created mapping employee to required EIP items.
- **Generated Artifact Assertions**:
  - ZIP Name: `Pachet_Onboarding_BISTRO_TRANSILVANIA_S.R.L._Dumitrescu_Elena.zip`.
  - ZIP Structure: Exactly 11 documents present (`01_Cerere_Angajare.docx` through `11_Declaratie_Proprie_Raspundere.docx`).
  - Zero Unmapped Tokens: `collectUnresolvedPlaceholders` returns `[]` across all 11 files.
  - Deep XML Assertions:
    - In `08_Fisa_Acordare_EIP.docx` (`word/document.xml`): contains `"Încălțăminte antiderapantă bucătărie"`, size `"38"`, quantity `"1"`. Zero occurrences of mock string `"42/L/9"`.
    - In `06_Fisa_Solicitare_Examen_Medical.docx`: contains checkmark or indication for Fișa 210 (Alimentație), NOT Fișa 243 (Ecran TESA).
    - In `02_Contract_Individual_Munca.docx`: contains `"5200"`, `"105/28.05.2026"`, `"Dumitrescu Elena"`, `"Bucătar Șef"`.

---

### Scenario 2: Pachet Înființare Firmă IT cu Sediu și Telemuncă
- **Features Exercised**: F1-F6, F21-F25.
- **Statutory Framework**: Legea 319/2006, HG 1425/2006, Legea 81/2018 (Telemuncă), HG 355/2007 (Fișa 243 - Lucru la Ecran).
- **End-to-End Data Flow**:
  1. **Company Intake**:
     - Client: `CLOUD COMPUTING SERVICES S.R.L.`, CUI `RO62019999`, CAEN `6201` ("Activități de realizare a software-ului la comandă"), Risk Class `LOW`.
     - Worksite 1: `Sediu Social Central - Birouri`, București, Sector 1.
     - Worksite 2: `Telemuncă / Domiciliul Salariaților (Legea 81/2018)`.
  2. **Job Definition**:
     - Job: `Senior DevOps Engineer` (COR 251201), `isScreenWork: true`, `workPosture: "sitting"`, `isDrivingRequired: false`.
  3. **Organizational Decisions Appointees (Deciziile 01-09)**:
     - Administrator: `Radu Voinea`.
     - Lucrător desemnat SSM: `Ing. Mihai Popescu`.
     - Responsabil Prim Ajutor: `Andreea Marin`.
     - Responsabil PSI: `Radu Voinea`.
     - Data emiterii deciziilor: `2026-01-15`.
  4. **Database-Persisted Risk Assessment**:
     - Persist `RiskAssessment` in DB:
       - Title: `Evaluarea Riscurilor Profesionale - Post DevOps & Telemuncă`.
       - Method: `INCDPM`. Evaluator: `Ing. Mihai Popescu`.
       - `RiskItem 1`: "Efort vizual prelungit la videoterminale (ecran > 6h/zi)", gravitate 3, probabilitate 4, nivel risc 3.
       - `RiskItem 2`: "Poziție statică așezat prelungită fără suport ergonomic adecvat", gravitate 2, probabilitate 4, nivel risc 3.
       - `PreventionMeasure 1`: "Pauze ergonomice de 10 min la fiecare 50 min; reglaj luminozitate ecran; control oftalmologic anual".
       - `PreventionMeasure 2`: "Scaun ergonomic reglabil pe înălțime și suport lombar la domiciliu conform Legii 81/2018".
  5. **Company SSM Dossier Package Generation**:
     - Trigger: `generateCompanyDossierZip({ clientId })`.
- **Database State Transitions**:
  - `Client` created with CAEN 6201, appointees, and `decisionsDate: 2026-01-15`.
  - `RiskAssessment` created with 2 `RiskItem` and 2 `PreventionMeasure` child records.
- **Generated Artifact Assertions**:
  - ZIP Structure: Exactly 16 statutory documents generated.
  - Deep XML Assertions:
    - In `01_Decizii_Organizatorice.docx`: Appointees reflect `Radu Voinea`, `Ing. Mihai Popescu`, `Andreea Marin`. Date reflects `15.01.2026`.
    - In `02_Evaluarea_Riscurilor.docx`: Contains "Efort vizual prelungit la videoterminale" and "Pauze ergonomice de 10 min", directly loaded from DB records, NOT static hardcoded TESA preset.
    - In `03_IPSSM_Telemunca.docx`: Includes references to Legea 81/2018 and telework safety rules.
    - Zero unresolved tokens across all 16 files.

---

### Scenario 3: Înregistrare Examen Medical Periodic și Deblocare Operator
- **Features Exercised**: F7, F8, F9, F2.
- **Statutory Framework**: HG 355/2007 privind supravegherea sănătății lucrătorilor.
- **End-to-End Data Flow**:
  1. **Pre-State**:
     - Employee `Stan Alexandru` at `Restaurant La Conac S.R.L.`.
     - `medicalLastExamDate: 2025-01-10` (16 months ago).
     - Calculation check: `occupationalMedicine.status === 'OVERDUE'`, `daysRemaining === -120`, `overallStatus === 'OVERDUE'`.
     - Document generation check: Attempting to resolve `med-fisa-solicitare-examen` marks `approved_for_print: false` due to expired medical status.
  2. **Operator Action (API Registration)**:
     - Request: `POST /api/employees/[id]/medical-exam`
     - Payload:
       ```json
       {
         "examDate": "2026-05-10T08:00:00.000Z",
         "intervalMonths": 12,
         "fitnessVerdict": "APT",
         "notes": "Examen periodic anual promovat fără contraindicații medicale. Următorul examen: Mai 2027."
       }
       ```
  3. **Post-State Recalculation**:
     - Database record updated.
     - Compliance recomputed at reference date `2026-05-11`.
- **Database State Transitions**:
  - `employee.medicalLastExamDate` becomes `2026-05-10T08:00:00.000Z`.
  - `employee.medicalIntervalMonths` = 12.
  - `employee.medicalFitnessVerdict` = "APT".
  - `employee.medicalNotes` contains the physician notes.
- **Verification & Invariants**:
  - `occupationalMedicine.status` transitions from `OVERDUE` to `VALID`.
  - `occupationalMedicine.dueDate` becomes `2027-05-10`.
  - `occupationalMedicine.daysRemaining` becomes ~364.
  - `overallStatus` becomes `VALID` (assuming SSM/PSI valid).
  - Resolver generates `med-fisa-solicitare-examen` with `approved_for_print: true` and zero missing required fields.

---

### Scenario 4: Încetare Contract de Muncă Salariat și Recalculare Conformitate
- **Features Exercised**: F12, F13, F26.
- **Statutory Framework**: Legea 53/2003 (Codul Muncii) art. 55-81, Legea 319/2006.
- **End-to-End Data Flow**:
  1. **Initial Baseline State**:
     - Client has 4 employees.
     - 3 employees are active and 100% compliant.
     - 1 employee (`Ionescu George`) has expired SSM training and expired medical exam.
     - Initial `calculateCompanyMetrics`: Total employees = 4, Overdue items = 2, Overall compliance score = 75%.
  2. **Operator Action (Contract Termination)**:
     - Request: `POST /api/employees/[id]/terminate`
     - Payload:
       ```json
       {
         "leaveDate": "2026-05-31T00:00:00.000Z",
         "reason": "Încetare contract prin acordul părților - Art. 55 lit. b Codul Muncii"
       }
       ```
  3. **Compliance Recalculation**:
     - Motor `compliance.ts` filters out `status === 'PLECAT'`.
     - Recomputed `calculateCompanyMetrics`: Total employees = 3, Overdue items = 0, Compliance score = 100%!
  4. **Batch Generation Verification**:
     - Call `POST /api/documents/generate-batch` for the client.
- **Database State Transitions**:
  - `employee.status` changes from `"ACTIV"` to `"PLECAT"`.
  - `employee.leaveDate` is set to `2026-05-31`.
- **Verification & Invariants**:
  - Terminated employee is strictly excluded from active employee queries (`where: { clientId, status: 'ACTIV' }`).
  - Company dashboard compliance score increases from 75% to 100%.
  - Batch generation package ZIP does NOT contain a folder or file for `Ionescu George`.
  - `00_RAPORT_GENERARE_LOT.txt` documents 3 processed employees, showing zero errors.

---

### Scenario 5: Sesiune Instruire Colectivă, Planificare și Descărcare PV/Fișe
- **Features Exercised**: F14, F15, F16, F17, F18.
- **Statutory Framework**: Legea 319/2006 art. 20, HG 1425/2006 art. 83-100, OMAI 712/2005.
- **End-to-End Data Flow**:
  1. **Phase A: Planning Session (Future Date)**:
     - Request: `POST /api/trainings/record` with:
       - `clientId`: client.id
       - `type`: "PERIODIC_SSM"
       - `eventDate`: `2026-06-20T09:00:00.000Z` (future date)
       - `durationHours`: 2.0
       - `materialOrTopic`: "Tematică semestrială: Circulația pe căile de acces, ergonomia muncii de birou și conduita în caz de incendiu"
       - `instructorName`: "Ing. Mihai Popescu"
       - `participantIds`: [emp1.id, emp2.id, emp3.id]
       - `status`: "planned"
     - Assert: Saved in `TrainingEvent` with `status: "planned"`. Employees' `ssmLastTrainingDate` is UNCHANGED.
  2. **Phase B: Performing Session (Real-Time Execution)**:
     - Request: `POST /api/trainings/record` with:
       - Same payload but `eventDate`: `2026-05-15T09:00:00.000Z` (today) and `status`: "recorded" (completed).
     - Atomic Transaction:
       - `TrainingEvent` created with 3 `TrainingParticipant` entries (`result: "admis"`).
       - All 3 employees have `ssmLastTrainingDate` updated to `2026-05-15`.
  3. **Phase C: Direct Document Download from Card**:
     - Generate `ssm-pv-instruire-colectiva` and `ssm-fisa-instruire-individuala`.
- **Database State Transitions**:
  - 1 `TrainingEvent` created.
  - 3 `TrainingParticipant` records created.
  - 3 `Employee` records updated with `ssmLastTrainingDate: 2026-05-15`.
- **Generated Artifact Assertions**:
  - In `ssm-pv-instruire-colectiva.docx`:
    - Table of participants lists all 3 employees with full names and CNPs.
    - Topic matches "Circulația pe căile de acces...".
    - Instructor name matches "Ing. Mihai Popescu".
    - Date equals `15.05.2026`.
  - In `ssm-fisa-instruire-individuala.docx`:
    - Periodic training log table contains a row dated `15.05.2026`, duration `2 ore`, verified signature column.
    - Zero lockout Catch-22 (F18): Even if employee was overdue prior to this session, generation succeeds cleanly with status 200.

---

### Scenario 6: Curs Igienă, Examinare Participanți și Emitere Certificate
- **Features Exercised**: F27, F28, F29.
- **Statutory Framework**: Ordinul comun MS/ME nr. 2209/4469/2022.
- **End-to-End Data Flow**:
  1. **Session Creation & Client Association**:
     - Create `HygieneSession` linked to `Client` (`clientId: client.id`).
     - Session date: `2026-04-10`, Exam date: `2026-04-15`.
     - Location: "Sediul DSP București - Sala Mare".
     - Commission: Președinte `Dr. Victor Alexandrescu`, Membru `As. Med. Claudia Ionescu`, Secretar `Ana Georgescu`.
  2. **Enrolling Candidates**:
     - Enroll 2 kitchen workers: `Vasile Ion` and `Gheorghe Marin`.
  3. **Updating Participant Exam Results (`PATCH`)**:
     - Request: `PATCH /api/hygiene/sessions/[id]/participants/[participantId1]`
       - Payload: `{ "attendance": "prezent", "examGrade": 10.0, "examResult": "admis", "certificateSeries": "DSP-B", "certificateNumber": "4501" }`
     - Request: `PATCH /api/hygiene/sessions/[id]/participants/[participantId2]`
       - Payload: `{ "attendance": "absent", "examGrade": null, "examResult": "respins", "certificateSeries": null, "certificateNumber": null }`
  4. **Recalculate Hygiene Compliance**:
     - Participant 1 (`Vasile Ion`): `hygieneCertificate.status === 'VALID'`, valid until `2029-04-15` (36 months per Ord. 2209/2022).
     - Participant 2 (`Gheorghe Marin`): `hygieneCertificate.status === 'OVERDUE'` (or `MISSING`).
  5. **Artifact Generation**:
     - Generate `hygiene-tabel-cursanti` (XLSX).
     - Generate `hygiene-adeverinta` (DOCX).
- **Database State Transitions**:
  - `HygieneParticipant 1` updated: `examGrade: 10`, `examResult: "admis"`, `certificateSeries: "DSP-B"`, `certificateNumber: "4501"`.
  - `Employee 1` updated: `hygieneLastExamDate: 2026-04-15`, `hygieneCertificateNumber: "DSP-B 4501"`, `hygieneIntervalMonths: 36`.
- **Generated Artifact Assertions**:
  - In `hygiene-tabel-cursanti.xlsx`:
    - Row 1: Vasile Ion, Grade 10, Admis, DSP-B 4501.
    - Row 2: Gheorghe Marin, Absent, Respins.
    - Unused rows: Completely cleaned, zero formula leaks, zero `#VALUE!` or residual placeholders.
  - In `hygiene-adeverinta.docx`:
    - Participant name: `Vasile Ion`.
    - Exam date: `15.04.2026`.
    - Certificate: `DSP-B nr. 4501`.
    - Zero unresolved tokens.

---

### Scenario 7: Import Fișier Excel cu Date Incomplete și Validare Fără Fake Dates
- **Features Exercised**: F30, F31, F1, F2.
- **Statutory Framework**: Legea 319/2006, HG 1425/2006, HG 355/2007.
- **End-to-End Data Flow**:
  1. **Synthesize Incomplete Excel File**:
     - 4 Employee Rows:
       - Row 1: `Popa Ioan` — Complete (hireDate: 2024-01-10, medicalDate: 2026-01-10, ssmDate: 2026-01-10).
       - Row 2: `Nistor Dan` — New hire with missing history (hireDate: 2026-05-01, medicalDate: EMPTY, ssmDate: EMPTY).
       - Row 3: `Iacob Radu` — Status `PLECAT` with valid leaveDate (`2026-04-30`).
       - Row 4: `Barbu Vlad` — Status `PLECAT` with EMPTY leaveDate (invalid boundary row).
  2. **Preview API Call**:
     - `POST /api/imports/preview` with multipart workbook.
     - Assert: Row 4 flagged with validation error ("Pentru statusul PLECAT este necesară data plecării").
     - Assert: Row 2 has `medicalDate: null` and `ssmDate: null`. **Hire date is NOT assigned to medicalDate!**
  3. **Commit API Call**:
     - `POST /api/imports/commit` with validated rows.
     - Server-side revalidation executes.
     - `ImportBatch` recorded with `validationReport` JSON and `diffData` JSON.
  4. **Post-Import Verification**:
     - Employee `Nistor Dan` in DB: `hireDate: 2026-05-01`, `medicalLastExamDate: null`, `ssmLastTrainingDate: null`.
     - Compliance calculation for `Nistor Dan`:
       - `occupationalMedicine.status === 'MISSING'`
       - `ssmTraining.status === 'MISSING'`
       - `overallStatus === 'MISSING'`
     - Resolver verification for `Nistor Dan`:
       - `isAutocompleted` is `false` for `PLACEHOLDER_DATA_EXAMEN_MEDICAL` and `PLACEHOLDER_DATA_INSTRUIRE`.
       - Token listed in `missingFields`.
       - `approved_for_print: false`.
- **Database State Transitions**:
  - `ImportBatch` created with `status: "confirmed"`, `rowCount: 3`, `errorCount: 1`.
  - `Employee` created with authentic `null` dates. Zero synthesized data.

---

### Scenario 8: Generare Batch Pachet Onboarding cu Caractere Speciale (&)
- **Features Exercised**: F5, F26, F3.
- **Statutory Framework**: OpenXML ISO/IEC 29500-1, Legea 319/2006.
- **End-to-End Data Flow**:
  1. **Company & Employee Setup with Special XML Entities**:
     - Client: `M&M ENGINEERING & CONSULTING S.R.L.`, CUI `RO88991122`, Sediu: `Str. Cercetării <Corp B>, Sector 1, "Clădirea A"`.
     - Employee 1: `Popescu & Asociații Andrei`, Job: `Senior R&D Specialist`, CIM: `01/2026`, Salariu: `8500 LEI`.
     - Employee 2: `Vlădescu <Mihai>`, Job: `Software & Cloud Architect`, CIM: `02/2026`, Salariu: `9200 LEI`.
     - Employee 3: `Stroe Cristian`, Job: `Junior Developer`, missing CIM and salary.
  2. **Batch Request**:
     - `POST /api/documents/generate-batch`
     - Payload:
       ```json
       {
         "templateCode": "hr-cim-2026",
         "clientId": client.id,
         "employeeIds": [emp1.id, emp2.id, emp3.id],
         "operatorName": "Inspector SSM & HR"
       }
       ```
  3. **Batch Execution & Error Isolation (F26)**:
     - Per-employee `try/catch` executes inside loop.
     - Does NOT return HTTP 400!
     - Emp 1: Generation succeeds.
     - Emp 2: Generation succeeds.
     - Emp 3: Fails or flagged with missing statutory fields (`approved_for_print: false`).
     - Response status: `200 OK` with ZIP blob.
  4. **ZIP Archive Inspection**:
     - Unpack ZIP using `PizZip`.
     - Assert presence of `00_RAPORT_GENERARE_LOT.txt`.
     - Read `00_RAPORT_GENERARE_LOT.txt`: Contains detailed breakdown for all 3 employees, documenting successes for Emp 1 & 2, and exact missing fields for Emp 3.
  5. **Deep XML Parsing Inspection (F5)**:
     - Unpack `word/document.xml` from DOCX of Emp 1 and Emp 2.
     - Verify:
       - No unescaped `&` exists in XML text outside of entities (`&amp;`, `&lt;`, `&gt;`).
       - XML parses cleanly without syntax exceptions using standard XML parser.
       - Text inside `<w:t>` displays `M&M ENGINEERING & CONSULTING S.R.L.` and `Popescu & Asociații Andrei`.
       - Document opens cleanly in Microsoft Word without "The file is corrupt and cannot be opened" warning.

---

## 5. Blueprint for Test Writers

Test Writers should create two primary test files in `scripts/`:
1. `scripts/e2e-tier3-pairwise.ts`: Pairwise integration tests (T3-01 through T3-15).
2. `scripts/e2e-tier4-scenarios.ts`: The 8 statutory real-world scenarios (S1 through S8).
And wire them into `scripts/e2e-suite.ts` and `scripts/verify-all.ts`.

### 5.1 Reusable Test Helper Kit

Test Writers should use the following battle-tested helper functions for opaque-box artifact inspection:

```typescript
import PizZip from 'pizzip';
import * as XLSX from 'xlsx';
import fs from 'fs';

// 1. Inspect DOCX for unmapped tokens and XML corruption
export function inspectDocxArtifact(buffer: Buffer): {
  unmappedPlaceholders: string[];
  rawXml: string;
  hasXmlSyntaxError: boolean;
} {
  const zip = new PizZip(buffer);
  const unmapped: string[] = [];
  let rawXml = '';
  let hasXmlSyntaxError = false;

  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
      const xml = zip.files[fileName].asText();
      if (fileName === 'word/document.xml') rawXml = xml;
      
      // Check for unmapped tokens
      const matches = xml.match(/PLACEHOLDER_[A-Z0-9_]+/g);
      if (matches) unmapped.push(...matches);

      // Check for illegal unescaped ampersand in XML
      if (/[^\w&;]&[^\w&;]/.test(xml) || /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(xml)) {
        hasXmlSyntaxError = true;
      }
    }
  }

  return {
    unmappedPlaceholders: Array.from(new Set(unmapped)),
    rawXml,
    hasXmlSyntaxError,
  };
}

// 2. Inspect XLSX for residual tokens and dirty cells
export function inspectXlsxArtifact(buffer: Buffer): {
  leaks: Array<{ sheet: string; cell: string; value: string }>;
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const leaks: Array<{ sheet: string; cell: string; value: string }> = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    for (const addr of Object.keys(sheet)) {
      if (addr.startsWith('!')) continue;
      const val = sheet[addr]?.v;
      if (typeof val === 'string' && /PLACEHOLDER_[A-Z0-9_]+/.test(val)) {
        leaks.push({ sheet: sheetName, cell: addr, value: val });
      }
    }
  }

  return { leaks };
}

// 3. Inspect ZIP archive contents and read file by relative path
export function inspectZipArchive(buffer: Buffer): {
  fileNames: string[];
  readFile: (relPath: string) => Buffer | null;
  readText: (relPath: string) => string | null;
} {
  const zip = new PizZip(buffer);
  const fileNames = Object.keys(zip.files).filter((k) => !zip.files[k].dir);

  return {
    fileNames,
    readFile: (relPath: string) => {
      const f = zip.file(relPath);
      return f ? f.asNodeBuffer() : null;
    },
    readText: (relPath: string) => {
      const f = zip.file(relPath);
      return f ? f.asText() : null;
    },
  };
}
```

### 5.2 Test Architecture & Execution Mode
- **Dual-Mode Execution**:
  1. **Direct Service/Prisma Mode (Default for CLI suite)**:
     - Imports `prisma`, `resolveTemplatePlaceholders`, `generateDocument`, `calculateEmployeeCompliance`, `bulk-packages`.
     - Executes entirely in Node/tsx without requiring `npm run dev` to be listening on port 3000.
     - Transactions ensure tests are deterministic and self-cleaning.
  2. **HTTP API Mode (Integration / End-to-End)**:
     - Uses `NextRequest` directly via route handlers (e.g. `POST as generateBatchRoute`) or fetch if dev server is running.
- **Teardown & Isolation Invariant**:
  - Every scenario creates test records with unique prefixed CUIs (e.g. `RO-T4-SCEN1-5610`) and deletes them in a `finally` block or at the start of each test.

---

## 6. Caveats

1. **API Endpoints in Planned Milestones (M2-M5)**:
   - Routes like `POST /api/employees/[id]/medical-exam`, `POST /api/employees/[id]/terminate`, `POST /api/risk-assessments`, and `PATCH /api/hygiene/sessions/[id]/participants/[participantId]` are part of Milestones M2-M5 and may not yet exist in `src/app/api/`.
   - **Mitigation**: The blueprint provides test specifications that operate against the underlying service contracts (Prisma schema + compliance + resolver) immediately, while specifying the exact API payload formats for when the routes are wired.
2. **Batch Expiry Lockout Fix**:
   - `src/app/api/documents/generate-batch/route.ts` currently blocks expired employees with HTTP 400. Test Writers must verify that M3/M5 changes remove this lockout and replace it with `00_RAPORT_GENERARE_LOT.txt` logging before asserting batch success for expired employees.

---

## 7. Conclusion

- **Tier 3 Coverage Assessment**: Existing Tier 3 in `e2e-suite.ts` consists of only 4 isolated in-memory unit tests. It lacks pairwise cross-feature validation. The 15 pairwise test cases outlined in Section 3 will close this gap completely.
- **Tier 4 Coverage Assessment**: The 8 statutory real-world scenarios defined in `TEST_INFRA.md` are currently 0% implemented in `e2e-suite.ts`.
- **Implementation Path**: The detailed data flows, database state transitions, and artifact assertion specifications provided in Section 4 and Section 5 give Test Writers a direct, turn-key blueprint to implement complete, rock-solid Tier 3 and Tier 4 E2E verification.

---

## 8. Verification Method

To independently verify the findings and blueprint:
1. **Check existing Tier 3 and Tier 4 lines in `scripts/e2e-suite.ts`**:
   ```bash
   grep -n -C 5 "TIER 3" scripts/e2e-suite.ts
   grep -n -C 5 "TIER 4" scripts/e2e-suite.ts
   ```
   *Expected*: Shows only 4 tests in Tier 3 (lines 771-915) and 4 tests in Tier 4 (lines 920-1010), none of which cover Scenarios 1-8.
2. **Check batch generation route for Catch-22 lockout and missing log**:
   ```bash
   grep -n -C 10 "checkEmployeeTemplateExpiry" src/app/api/documents/generate-batch/route.ts
   ```
   *Expected*: Confirms lines 146-171 return 400 instead of isolating errors per employee.
3. **Check generator for unescaped XML string injection**:
   ```bash
   grep -n -C 5 "text.replaceAll" src/lib/templates/generator.ts
   ```
   *Expected*: Confirms lines 358 and 362 perform unescaped string replacement in XML files.
