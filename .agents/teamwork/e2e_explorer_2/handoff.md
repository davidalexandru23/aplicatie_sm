# Audit Report & Test Case Specifications: Tier 1 (Functional) & Tier 2 (Boundary) Coverage Across 31 Statutory Features

**Auditor Agent**: `teamwork_explorer` (`e2e_explorer_2`)  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/e2e_explorer_2/`  
**Target Specifications**: `TEST_INFRA.md`, `PROJECT.md`, `ORIGINAL_REQUEST.md`  
**Date**: 2026-11-10T21:55:00Z  

---

## 1. Observation

### 1.1 Examination of Existing Test Suites in `scripts/`
A comprehensive inspection of all executable test files in `scripts/` revealed the following factual distribution:

1. **`scripts/e2e-suite.ts`** (Unified E2E Runner):
   - Claims 4 tiers with 53 test cases total (`scripts/verify-all.ts:259`).
   - **Tier 1 (Lines 516–604)**: Contains 31 tests total:
     * 6 tests on `src/lib/compliance.ts` (`addMonthsSafe`, `calculateItemCompliance` for Medicina Muncii, SSM, PSI, Hygiene, UI status badges enum).
     * 25 tests on template rendering in isolation (`TEMPLATE_CATALOG.slice(0, 25)`). These tests pass a static synthetic dictionary `fullSampleData` (`scripts/e2e-suite.ts:253-488`) directly to docxtemplater and XLSX. They do **not** test database resolution, and only cover 25 out of the 31 statutory templates (omitting the 6 newly added statutory templates from Pillar 2: `ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`, `med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri`, `eip-fisa-acordare-individuala`, `hr-cim-model-cadru-2022`).
   - **Tier 2 (Lines 606–765)**: Contains 14 tests total:
     * 6 calendar month clamping tests (`addMonthsSafe` on leap years, Jan 31, 30-day months).
     * 4 days remaining boundary tests (Day 0, Day 30, Day 31, Day -1).
     * 1 null date test (`calculateItemCompliance(null, 12)`).
     * 2 Excel roster boundary tests (empty roster, 100 participants).
     * 1 XML diacritics & escaping test on `ipssm-alunecari`.
   - **Coverage Deficit**: Out of the 31 statutory features defined in `TEST_INFRA.md`, `scripts/e2e-suite.ts` covers aspects of only 3 features in Tier 1 (F8, F29, and template generation syntax) and 3 features in Tier 2 (F8, F5, F28). 28 statutory features have zero presence in `scripts/e2e-suite.ts`.

2. **`scripts/test-all-templates-generation.ts`**:
   - Loops through all 31 templates in `TEMPLATE_CATALOG`.
   - Resolves data via `resolveTemplatePlaceholders` using `allowOfflineBlank: true` (`scripts/test-all-templates-generation.ts:129`).
   - Relies on default fallback to first employee:
     ```typescript
     // scripts/test-all-templates-generation.ts:66-68
     const employee = client.employees[0];
     const job = employee.currentJob || client.jobs[0];
     const worksite = employee.currentWorksite || client.worksites[0];
     ```
   - Verifies disk output for zero unmapped tokens. Does not test isolated failure modes or boundary payloads.

3. **`scripts/verify-compliance.ts`**:
   - 45 unit tests specifically targeting pure functions in `src/lib/compliance.ts`.
   - Validates `addMonthsSafe` (18 tests), item compliance, employee compliance, and company metrics.
   - Does not touch database persistence, Next.js API routes, or statutory template generation.

4. **`scripts/verify-excel-import-export.ts`**:
   - 6 integration tests: clean parse, dirty data line attribution, safe partial commit, expat passport, template download, and round-trip export/import.
   - Verifies server-side validation, but does **not** assert the elimination of automatic `hireDate` fallback when medical/training dates are blank (`src/lib/importer.ts:891-893`).

5. **`scripts/verify-m2-workflows.ts`**:
   - 5 workflow scenarios: client intake, decision appointees, training scadențe reset, error handling, company metrics.
   - Training test operates directly via `prisma.$transaction` rather than the public HTTP API `POST /api/trainings/record`.
   - Does not test future-dated sessions with `status: 'planned'`.

6. **`scripts/test-batch-generation-compliance.ts`**:
   - Verifies that expired employees are **blocked** from generating `ssm-fisa-instruire-individuala` (`scripts/test-batch-generation-compliance.ts:40-44`).
   - Directly contradicts statutory Requirement R4 / Feature 18, which mandates *eliminating* the Catch-22 expiry block so that operators can emit a new training sheet for an expired worker.

7. **`scripts/adversarial-*.ts` Scripts**:
   - Focus on specific isolated adversarial edge cases (e.g. `adversarial-caen-stress.ts` for Pece formulas, `adversarial-excel-dirty-stress.ts` for corrupted Excel cells, `adversarial-m1-challenger-edge-cases.ts` for UI state emulation).
   - None provide systematic 5x Tier 1 and 5x Tier 2 suites for all 31 statutory features.

### 1.2 Inspection of Implementation Code (`src/` and `prisma/`)
Direct inspection of the source code confirms several critical discrepancies and missing endpoints:

- **Mock Fallbacks in `src/lib/templates/resolver.ts`**:
  * Line 1088: `const legalRepresentativeName = client?.legalRepresentative || 'Munteanu Cristian';`
  * Line 1450: `PLACEHOLDER_FIRMA: client?.name || 'S.C. CLIENT TEST S.R.L.',`
  * Line 1568: `PLACEHOLDER_DATA_NASTERII: formatDateRo(employee.birthDate) || '15.03.1988',`
  * Lines 312, 318, 320, 327, 333, 335: hardcoded `'Munteanu Cristian'`.
- **First Element Fallback in `src/lib/templates/resolver.ts`**:
  * Lines 2054–2059:
    ```typescript
    : client.employees && client.employees.length > 0
    ? client.employees[0]
    : null;
    const selectedJob = employee?.currentJob || client.jobs.find((j) => j.id === ctx.jobId) || (client.jobs && client.jobs[0]) || null;
    const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;
    ```
- **Automatic `hireDate` Fallback in `src/lib/importer.ts`**:
  * Lines 891–893:
    ```typescript
    medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate,
    ssmLastTrainingDate: emp.ssmLastTrainingDate || emp.hireDate,
    psiLastTrainingDate: emp.psiLastTrainingDate || emp.hireDate,
    ```
- **Prisma Schema `prisma/schema.prisma`**:
  * Lines 471–489: `model HygieneSession` does **not** contain `clientId` or a relation to `Client`.
  * Lines 624–658: Models `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment` exist in schema, but have 0 queries in `scripts/` and no endpoints in `src/app/api/eip/`.
- **API Routes**:
  * `src/app/api/employees/` directory does not exist. Endpoints `POST /api/employees`, `PUT /api/employees/[id]`, `POST /api/employees/[id]/medical-exam`, and `POST /api/employees/[id]/terminate` are entirely unbuilt.
  * `src/app/api/risk-assessments/` does not exist.

---

## 2. Logic Chain

1. **Premise 1 (Statutory Standard)**: `TEST_INFRA.md` lines 60–64 establishes that full coverage requires:
   - Tier 1: $\ge 5$ functional test cases per feature (31 features $\times 5 = 155$ tests).
   - Tier 2: $\ge 5$ boundary/corner cases per feature (null values, edge dates, special characters, max length, invalid status) ($31 \times 5 = 155$ tests).
2. **Premise 2 (Current Test Distribution)**: The existing `scripts/e2e-suite.ts` contains only 31 Tier 1 tests (of which 25 are hardcoded template renders) and 14 Tier 2 tests (of which 10 are date math checks).
3. **Premise 3 (Feature Mapping)**: Cross-referencing the 31 statutory features against all test files in `scripts/`:
   - 15 features have **0** tests in both Tier 1 and Tier 2.
   - 16 features have **partial** tests (1 to 4 tests), but none reach the required 5 Tier 1 + 5 Tier 2 threshold.
   - **0** features meet the complete statutory test criteria.
4. **Premise 4 (Implementation Dependency)**: Several statutory features (F7–F13 employee CRUD and medical exams, F19–F20 EIP, F21–F23 Risk Assessments, F27 Hygiene Client link) lack both tests and production API routes. Test writers need explicit opaque-box specifications that define inputs, actions, and expected responses so tests can be authored immediately to drive TDD and acceptance.
5. **Conclusion**: The test suite must be dramatically expanded with a 310-test specification matrix (155 Tier 1 functional cases and 155 Tier 2 boundary cases).

---

## 3. Caveats

1. **Execution Environment**: Tests requiring HTTP endpoints (`fetch('http://localhost:3000/...')`) assume a running Next.js server or must be authored as Next.js route handler direct invocations (`POST(request)`). Direct route invocation is strongly recommended for unit/isolated speed and determinism.
2. **Database Cleanliness**: Tests involving database writes must utilize test transactions or unique CUI/CNP fixtures with cleanup (`beforeEach`/`afterEach`) to avoid contaminating seeded demonstration clients (`NEXUS SOLUTIONS S.R.L.` and `BISTRO GOURMET S.R.L.`).
3. **No Caveats on Specifications**: All 31 statutory features have been analyzed, and 10 concrete test specifications (5 Tier 1 + 5 Tier 2) are provided below for each feature.

---

## 4. Conclusion & Actionable Specifications

### 4.1 Comprehensive 31-Feature Gap Matrix

| # | Statutory Feature | Req | Current T1 Count | Current T2 Count | T1 Status | T2 Status | Overall Verdict | Priority |
|---|-------------------|:---:|:----------------:|:----------------:|:---------:|:---------:|:---------------:|:--------:|
| 1 | Resolver Integritate Date (Fără Mock) | R1 | 1 | 0 | Partial | Missing | **INCOMPLETE** | P1 |
| 2 | Semnalare Date Lipsă (`isAutocompleted`) | R1 | 0 | 0 | Missing | Missing | **MISSING (0)** | P1 |
| 3 | Blocare `approved_for_print` la date lipsă | R1 | 1 | 0 | Partial | Missing | **INCOMPLETE** | P1 |
| 4 | Câmpuri Manuale Complete în UI | R1 | 1 | 0 | Partial | Missing | **INCOMPLETE** | P1 |
| 5 | Escapare Caractere Speciale XML (`&`, `<`, `>`) | R1 | 2 | 1 | Partial | Partial | **INCOMPLETE** | P1 |
| 6 | Eliminare Fallback `employee[0]`/`jobs[0]` | R7 | 1 | 0 | Partial | Missing | **INCOMPLETE** | P1 |
| 7 | Înregistrare Fișă Aptitudine HG 355/2007 | R2 | 0 | 0 | Missing | Missing | **MISSING (0)** | P1 |
| 8 | Actualizare `medicalLastExamDate` & Conformitate | R2 | 2 | 4 | Partial | Partial | **INCOMPLETE** | P1 |
| 9 | Deblocare Generare la Examen Valabil | R2 | 0 | 0 | Missing | Missing | **MISSING (0)** | P1 |
| 10 | Adăugare Manuală Salariat | R3 | 0 | 0 | Missing | Missing | **MISSING (0)** | P1 |
| 11 | Editare Salariat (Toate Câmpurile Statutare) | R3 | 0 | 0 | Missing | Missing | **MISSING (0)** | P1 |
| 12 | Încetare Contract (`status: PLECAT`) | R3 | 1 | 1 | Partial | Partial | **INCOMPLETE** | P1 |
| 13 | Excludere Salariați PLECAT din Conformitate & Batch | R3 | 1 | 1 | Partial | Partial | **INCOMPLETE** | P1 |
| 14 | Sincronizare Evenimente Instruire cu Documente | R4 | 2 | 0 | Partial | Missing | **INCOMPLETE** | P2 |
| 15 | Filtrare Tipuri Evenimente în Fișe | R4 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 16 | Planificare Sesiuni Viitoare (`status: planned`) | R4 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 17 | Descărcare PV Colectiv & Fișă Direct din Card | R4 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 18 | Eliminare Blocaj Expirare Instruire la Emitere Fișă | R4 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 19 | Activare Modele Prisma EIP | R5 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 20 | Generare Fișă Dotare EIP din Date Reale | R5 | 1 | 0 | Partial | Missing | **INCOMPLETE** | P2 |
| 21 | Evaluare Riscuri CRUD & Persistență | R6 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 22 | Conectare `risk-evaluare` la Dosar DB Persistat | R6 | 1 | 0 | Partial | Missing | **INCOMPLETE** | P2 |
| 23 | Configurare Flaguri Risc pe Post (`Job`) | R6 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 24 | Selector Punct de Lucru & Post în UI | R7 | 2 | 0 | Partial | Missing | **INCOMPLETE** | P2 |
| 25 | Filtrare IPSSM / Tematici pe CAEN & Riscuri Reale | R7 | 2 | 1 | Partial | Partial | **INCOMPLETE** | P2 |
| 26 | Tratare Erori per Salariat & Logging ZIP în Batch | R7 | 0 | 0 | Missing | Missing | **MISSING (0)** | P2 |
| 27 | Asociere `HygieneSession` cu `Client` | R8 | 0 | 0 | Missing | Missing | **MISSING (0)** | P3 |
| 28 | Editare Participanți Igienă & Certificate | R8 | 1 | 1 | Partial | Partial | **INCOMPLETE** | P3 |
| 29 | Calcul Conformitate Igienă pe CAEN / Post | R8 | 2 | 2 | Partial | Partial | **INCOMPLETE** | P3 |
| 30 | Eliminare Atribuire `hireDate` la Import | R8 | 0 | 0 | Missing | Missing | **MISSING (0)** | P3 |
| 31 | Re-validare Server-Side & Persistență Raport Diff | R8 | 3 | 2 | Partial | Partial | **INCOMPLETE** | P3 |
| **TOTAL** | **31 Statutory Features** | - | **24** | **13** | **0 Suff.** | **0 Suff.** | **0 / 31 Complete** | - |

---

### 4.2 Detailed Test Case Specifications (Features 1 to 31)

Below are the 310 concrete test case specifications (5 Tier 1 functional cases and 5 Tier 2 boundary cases per feature) designed for immediate implementation by Test Writers.

---

#### Feature 1: Resolver Integritate Date (Fără Mock) (Req: R1)
- **T1.1: Client Name Integrity**: Invoke `resolveTemplatePlaceholders({ templateCode: 'decizii-angajator', clientId })` on client with `name: 'ACME LOGISTICS SRL'`. Assert `PLACEHOLDER_FIRMA === 'ACME LOGISTICS SRL'`, never `'S.C. CLIENT TEST S.R.L.'`.
- **T1.2: Legal Representative Integrity**: On client with `legalRepresentative: 'Ion Vasile'`, assert `PLACEHOLDER_REPREZENTANT_LEGAL === 'Ion Vasile'`, never `'Munteanu Cristian'`.
- **T1.3: Natural Person Birth Info**: On employee with birth date `1995-08-20` in Craiova, assert `PLACEHOLDER_DATA_NASTERII === '20.08.1995'`, never `'15.03.1988'`.
- **T1.4: Real Identity Card Tokens**: On employee with CI series `KL` and number `987654`, assert `PLACEHOLDER_SERIE_ACT === 'KL'` and `PLACEHOLDER_NUMAR_ACT === '987654'`, never `'RX'` or `'123456'`.
- **T1.5: Medical Parameters Integrity**: On employee without blood type recorded in DB, assert `PLACEHOLDER_GRUPA_SANGUINA === ''`, never defaulting to `'0I(Rh+)'`.
- **T2.1 (Null Client Fields)**: Client created with `legalRepresentative: null`. Assert resolver returns empty string `''` and reports missing field, never injecting mock names.
- **T2.2 (Empty String Edge)**: Employee with `identityDocument.series: ''`. Assert resolved token is `''` and not replaced with `'RX'`.
- **T2.3 (Special Characters in Names)**: Client name `D&G "TRANS-EUROPA" <S.R.L.>`. Assert resolved string preserves authentic raw value without mock fallback or corruption.
- **T2.4 (Max Length Text)**: Client address of 250 characters. Assert resolver preserves the exact string without truncating or falling back to static Bucharest addresses.
- **T2.5 (Unassigned Relations)**: Employee with `currentJobId: null`. Assert job placeholders (`PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_COD_COR`) resolve to `''` with zero crash and zero mock insertion.

---

#### Feature 2: Semnalare Date Lipsă (`isAutocompleted`) (Req: R1)
- **T1.1: Genuine DB Value Flagged True**: When `client.cui` exists (`'RO99887766'`), assert `fields.find(f => f.key === 'PLACEHOLDER_CUI').isAutocompleted === true`.
- **T1.2: Absent DB Value Flagged False**: When employee has `cimNumber: null`, assert `fields.find(f => f.key === 'PLACEHOLDER_NUMAR_CIM').isAutocompleted === false`.
- **T1.3: Missing Salary Flagged False**: When `employee.grossSalary === null`, assert `PLACEHOLDER_SALARIU_BRUT` has `isAutocompleted === false`.
- **T1.4: Unlinked Worksite Flagged False**: When `employee.currentWorksiteId === null`, assert `PLACEHOLDER_ADRESA_PUNCT_LUCRU` has `isAutocompleted === false`.
- **T1.5: Missing CI Details Flagged False**: When employee lacks `identityDocument` record, assert all CI tokens (`SERIE_ACT`, `NUMAR_ACT`, `EMITENT_ACT`) have `isAutocompleted === false`.
- **T2.1 (Empty String In DB)**: Field value in DB is empty string `""`. Assert `isAutocompleted === false`.
- **T2.2 (Whitespace Only In DB)**: Field value in DB is `"   "`. Assert `isAutocompleted === false` (whitespace is not valid statutory data).
- **T2.3 (Numeric Zero)**: Gross salary in DB is `0`. Assert `isAutocompleted === true` (valid numeric value, though boundary) and value is `'0'`.
- **T2.4 (Custom Overrides vs DB)**: Pass `customOverrides: { PLACEHOLDER_NUMAR_CIM: '999' }`. Assert field value is `'999'` and `isAutocompleted === false` (marked as manual override, not autocompleted from DB).
- **T2.5 (Nullable Date Time)**: Employee with `hireDate: null`. Assert `PLACEHOLDER_DATA_ANGAJARII` has `value: ''` and `isAutocompleted === false`.

---

#### Feature 3: Blocare `approved_for_print` la date lipsă (Req: R1)
- **T1.1: Approved When Fully Populated**: Invoke resolver for `hr-cim-2026` with complete employee and client data. Assert `status === 'ready'` and `approvedForPrint === true`.
- **T1.2: Blocked When CIM Number Missing**: Set `employee.cimNumber = null`. Resolve `hr-cim-2026`. Assert `approvedForPrint === false`, `status === 'missing_data'`, and `unresolvedPlaceholders` includes `'PLACEHOLDER_NUMAR_CIM'`.
- **T1.3: Blocked When Salary Missing**: Set `employee.grossSalary = null`. Resolve `hr-cim-2026`. Assert `approvedForPrint === false` and `status === 'missing_data'`.
- **T1.4: Blocked When Hire Date Missing**: Set `employee.hireDate = null`. Resolve `ssm-fisa-instruire-individuala`. Assert `approvedForPrint === false`.
- **T1.5: Blocked When Legal Representative Missing**: Set `client.legalRepresentative = null`. Resolve `decizii-angajator`. Assert `approvedForPrint === false`.
- **T2.1 (Multiple Missing Fields)**: Nullify `cimNumber`, `grossSalary`, and `cimDate`. Assert `approvedForPrint === false` and `unresolvedPlaceholders` accurately contains all 3 missing keys.
- **T2.2 (Partial Override Boundary)**: Overriding only 1 of 2 missing fields. Assert `approvedForPrint` remains `false` until all required fields are satisfied.
- **T2.3 (Non-Mandatory Field Missing)**: Nullify optional note or secondary email. Assert `approvedForPrint === true` (optional metadata does not block statutory compliance).
- **T2.4 (Whitespace String In Mandatory Field)**: Set `cimNumber: "   "`. Assert `approvedForPrint === false`.
- **T2.5 (Offline Blank Mode Invariant)**: Call with `allowOfflineBlank: true`. Assert generator produces physical document for blank completion, but API status explicitly logs `offline_blank_generated`, never false `approved_for_print`.

---

#### Feature 4: Câmpuri Manuale Complete în UI (Req: R1)
- **T1.1: Zero Slice Truncation**: Render `/documents/generate` component with a template having 35 placeholders (e.g. `TESA.docx` or `decizii-angajator`). Assert DOM contains 35 editable input elements (no `.slice(0, 20)` limit).
- **T1.2: Dynamic Field Count Verification**: On template with 28 missing fields, assert UI displays badge `"28 câmpuri de completat"` and renders all 28 form controls.
- **T1.3: Value Propagation**: Type into 25th manual field input. Assert updated state is preserved and sent in generation payload.
- **T1.4: Grouped Field Categories**: Verify UI groups all unresolved fields logically (Client, Angajat, Post, Decizii) without hiding fields past index 20.
- **T1.5: Batch Generation Unresolved Indicator**: In batch tab, verify all manual placeholders required across selected templates are displayed in full list.
- **T2.1 (Exactly 20 Fields Boundary)**: Mock template with exactly 20 fields. Assert all 20 render cleanly.
- **T2.2 (Boundary at 21 Fields)**: Mock template with 21 fields. Assert 21 fields render (previously field #21 was truncated).
- **T2.3 (Large Field Volume - 60 Fields)**: Mock template with 60 placeholders. Assert scrollable container renders all 60 fields without React rendering crash.
- **T2.4 (Zero Fields Empty State)**: Completely resolved template (0 missing fields). Assert UI renders `"Toate datele statutare sunt prezente"` alert with 0 manual input boxes.
- **T2.5 (Long Field Labels)**: Field with label > 100 characters. Assert label wraps correctly and does not break layout or truncate input.

---

#### Feature 5: Escapare Caractere Speciale XML (`&`, `<`, `>`) (Req: R1)
- **T1.1: Standalone Ampersand**: Render DOCX with `PLACEHOLDER_FIRMA: 'M&D CONSULTING S.R.L.'`. Unzip DOCX buffer, inspect `word/document.xml`. Assert contains `'M&amp;D CONSULTING S.R.L.'`, never unescaped `'M&D'`.
- **T1.2: Less-Than and Greater-Than**: Render DOCX with `PLACEHOLDER_FUNCTIE: '<Specialist SSM>'`. Assert XML contains `'&lt;Specialist SSM&gt;'`.
- **T1.3: Double Quotes in Company Name**: Render DOCX with `PLACEHOLDER_FIRMA: 'S.C. "ROBOTICS" S.R.L.'`. Assert XML contains `'S.C. &quot;ROBOTICS&quot; S.R.L.'` or valid XML entity.
- **T1.4: Single Quote / Apostrophe**: Render DOCX with `PLACEHOLDER_NUME: "D'Angelo"`. Assert XML parses validly in Word parser without error.
- **T1.5: Multi-Token XML Integrity**: Render template with 10 fields containing mixed `&`, `<`, `>`. Parse generated buffer with `new PizZip(buffer)` and `new Docxtemplater(zip)`. Assert zero XML parsing exceptions.
- **T2.1 (Malicious HTML/XML Injection)**: Value `<w:p><w:r><w:t>HACKED</w:t></w:r></w:p>`. Assert literal text is displayed and not parsed as raw OpenXML nodes.
- **T2.2 (Script Tag Injection)**: Value `<script>alert(1)</script>`. Assert XML escaped to `&lt;script&gt;alert(1)&lt;/script&gt;`.
- **T2.3 (Consecutive Ampersands)**: Value `'A && B &&& C'`. Assert escaped to `'A &amp;&amp; B &amp;&amp;&amp; C'`.
- **T2.4 (Ampersand at Boundaries)**: Value `'&Start and End&'`. Assert escaped cleanly.
- **T2.5 (XLSX Cell Special Characters)**: Render Excel template with `&`, `<`, `>` in participant name. Open with `XLSX.read`. Assert cell value matches raw input string exactly without XML corruption.

---

#### Feature 6: Eliminare Fallback `employee[0]`/`jobs[0]` (Req: R7)
- **T1.1: General Client Template Without Employee Context**: Call `resolveTemplatePlaceholders({ templateCode: 'decizii-angajator', clientId })` without `employeeId`. Assert `employee` in context is `null`, and employee-specific tokens remain unresolved.
- **T1.2: Job Context Isolation**: Call resolver for `training-tematica-loc-munca` without `jobId`. Assert `selectedJob` is `null`, never defaulting to `client.jobs[0]`.
- **T1.3: Explicit Employee Respected**: Call resolver with explicit `employeeId`. Assert tokens resolve specifically for that employee (e.g. employee #3), not employee #1.
- **T1.4: Explicit Job Respected**: Call resolver with explicit `jobId`. Assert job tokens resolve for that specific job, not first job in DB.
- **T1.5: Explicit Worksite Respected**: Call resolver with explicit `worksiteId`. Assert worksite address matches the selected worksite, not `client.worksites[0]`.
- **T2.1 (Client With 0 Employees)**: Call resolver on newly created client with 0 employees. Assert executes cleanly without throwing `TypeError: Cannot read properties of undefined (reading 'currentJob')`.
- **T2.2 (Client With 0 Jobs)**: Call resolver on client with 0 jobs. Assert job tokens resolve to empty string with zero crash.
- **T2.3 (Non-Existent Employee ID)**: Pass `employeeId: 'invalid-uuid-9999'`. Assert resolver throws HTTP 404 / Error `"Salariatul specificat nu există"`.
- **T2.4 (Cross-Client Employee Tamper)**: Pass `clientId: 'client-A'` and `employeeId: 'emp-from-client-B'`. Assert resolver rejects with security mismatch error.
- **T2.5 (Employee With Null Job)**: Employee has `currentJobId: null`. Resolve employee document. Assert `PLACEHOLDER_FUNCTIE` is `''` and reported missing, not populated from another employee's job.

---

#### Feature 7: Înregistrare Fișă Aptitudine HG 355/2007 (Req: R2)
- **T1.1: Successful Medical Exam Recording**: Call `POST /api/employees/[id]/medical-exam` with `{ examDate: '2026-05-10', intervalMonths: 12, fitnessVerdict: 'APT' }`. Assert HTTP 200, DB updated with `medicalLastExamDate == 2026-05-10`.
- **T1.2: Periodic Interval 6 Months**: Call with `{ examDate: '2026-05-10', intervalMonths: 6, fitnessVerdict: 'APT' }`. Assert `medicalIntervalMonths === 6` in DB.
- **T1.3: Verdict APT CONDITIONAT with Restrictions**: Call with `{ examDate: '2026-05-10', intervalMonths: 12, fitnessVerdict: 'APT_CONDITIONAT', restrictions: 'Fără lucru la înălțime' }`. Assert restrictions stored in DB.
- **T1.4: Verdict INAPT TEMPORAR**: Call with `{ examDate: '2026-05-10', intervalMonths: 3, fitnessVerdict: 'INAPT_TEMPORAR' }`. Assert compliance reflects temporary inaptitude.
- **T1.5: Medical Clinic & Physician Record**: Call with optional `{ clinicName: 'Centrul Medico-Militar', physicianName: 'Dr. Popa' }`. Assert stored in medical exam audit trail.
- **T2.1 (Invalid Verdict String)**: Call with `fitnessVerdict: 'SUPER_FIT'`. Assert HTTP 400 with validation error.
- **T2.2 (Negative or Zero Interval)**: Call with `intervalMonths: 0` or `-6`. Assert HTTP 400.
- **T2.3 (Future Exam Date Beyond Today + 1 Year)**: Call with `examDate: '2030-01-01'`. Assert HTTP 400 (medical exam cannot be recorded years in advance).
- **T2.4 (Malformed Date String)**: Call with `examDate: '10/05/2026'`. Assert HTTP 400 (strict ISO date required).
- **T2.5 (Non-Existent Employee ID)**: Call on random UUID. Assert HTTP 404.

---

#### Feature 8: Actualizare `medicalLastExamDate` & Conformitate (Req: R2)
- **T1.1: Recalculation from OVERDUE to VALID**: Employee has overdue exam (exam date 14 months ago). Post new exam. Assert `calculateEmployeeCompliance(emp).occupationalMedicine.status === 'VALID'`.
- **T1.2: Days Remaining Computation**: Set exam date to today, interval 12m. Assert `daysRemaining === 365` (or 366 in leap year).
- **T1.3: Status Rollup Transition**: Company compliance score recalculates and increases immediately after single employee medical renewal.
- **T1.4: Due Date Safe Month Addition**: Exam on `2026-01-31` + 1 month. Assert `dueDate == 2026-02-28`.
- **T1.5: Audit Event Persistence**: Verify recording medical exam creates an `AuditEvent` with action `'MEDICAL_EXAM_RECORDED'`.
- **T2.1 (Leap Year Exam Date 29 Feb)**: Exam on `2024-02-29` + 12m. Assert `dueDate == 2025-02-28`.
- **T2.2 (Boundary Day 30 Remaining)**: Reference date exactly 30 days before due date. Assert status is `UPCOMING`.
- **T2.3 (Boundary Day 31 Remaining)**: Reference date exactly 31 days before due date. Assert status is `VALID`.
- **T2.4 (Boundary Day 0 Remaining - Due Today)**: Reference date equals due date. Assert status is `UPCOMING` (daysRemaining: 0).
- **T2.5 (Boundary Day -1 Remaining - Expired Yesterday)**: Reference date is 1 day after due date. Assert status is `OVERDUE` (daysRemaining: -1).

---

#### Feature 9: Deblocare Generare la Examen Valabil (Req: R2)
- **T1.1: Generation Unblocked After Exam**: Prior to exam, document generation for employee with overdue medical check fails or prompts warning. After recording valid exam, generation succeeds with HTTP 200.
- **T1.2: Template `med-fisa-solicitare-examen` Populated**: Generating occupational medicine request sheet embeds newly updated exam parameters cleanly.
- **T1.3: Batch Generation Inclusion**: Employee previously excluded or flagged in batch is cleanly processed once exam is valid.
- **T1.4: Onboarding ZIP Unblock**: 1-Click Onboarding ZIP completes with 0 medical warnings after valid exam.
- **T1.5: Medical Fitness Form Generation**: Generate `med-fisa-identificare-riscuri`. Assert reflects up-to-date medical validity status.
- **T2.1 (Verdict INAPT Blocks Generation)**: Employee has exam recorded, but verdict is `INAPT`. Assert generation of standard work authorization templates is blocked with legal warning.
- **T2.2 (Exam Due in 1 Day)**: Status is `UPCOMING` (1 day left). Assert generation is permitted (still legally valid).
- **T2.3 (Exam Expired Exactly 1 Minute Ago)**: Due date was yesterday. Assert generation flags expired status and requires confirmation or blocks print approval.
- **T2.4 (Null Interval Fallback)**: Exam recorded with `intervalMonths: null`. Assert defaults to statutory 12 months per HG 355/2007.
- **T2.5 (Specialist Signature Required)**: Medical document generation with missing occupational physician name leaves signature placeholder blank for offline physician sign-off without crashing.

---

#### Feature 10: Adăugare Manuală Salariat (Req: R3)
- **T1.1: Standard Romanian Employee Creation**: Call `POST /api/employees` with `{ clientId, lastName: 'Popa', firstName: 'Ion', cnp: '1880512123456', hireDate: '2026-03-01' }`. Assert HTTP 201, employee created in DB.
- **T1.2: Complete Contract Profile**: Call with gross salary `8500`, CIM number `'204/2026'`, CIM date `'2026-03-01'`, work norm `8`. Assert all contract fields saved in DB.
- **T1.3: Automatic Birth Date Extraction from CNP**: Send CNP `1880512123456`. Assert `birthDate` is automatically extracted as `1988-05-12`.
- **T1.4: Automatic Gender Extraction from CNP**: Send CNP starting with `1`. Assert gender `'M'` is assigned. Send CNP starting with `2`. Assert gender `'F'`.
- **T1.5: Job and Worksite Association**: Pass valid `currentJobId` and `currentWorksiteId`. Assert foreign keys correctly set.
- **T2.1 (Duplicate CNP Within Client)**: Post employee with CNP already existing in same company. Assert HTTP 409 / 400 error `"Salariatul cu acest CNP există deja"`.
- **T2.2 (Invalid CNP Control Digit)**: Pass CNP with invalid 13th control digit (cifra de control). Assert HTTP 400 `"CNP invalid conform algoritmului de control"`.
- **T2.3 (Foreign Worker / Expat Passport)**: Pass `{ cnp: 'PASSPORT-US-998822', citizenship: 'US', isForeignWorker: true }`. Assert employee created successfully without Romanian CNP validation failure.
- **T2.4 (Minor Employee Age Boundary)**: CNP indicating age < 15 years. Assert HTTP 400 error (illegal employment age in Romania).
- **T2.5 (Extreme Past Hire Date)**: Hire date before company incorporation date. Assert HTTP 400 or warning.

---

#### Feature 11: Editare Salariat (Toate Câmpurile Statutare) (Req: R3)
- **T1.1: Update Personal & Contact Info**: Call `PUT /api/employees/[id]` with new phone, email, and residence address. Assert updated in DB.
- **T1.2: Update Contractual Parameters**: Update `grossSalary` from 5000 to 7500, `cimNumber` to '55/2026'. Assert updated.
- **T1.3: Update Identity Card Details**: Update CI series, number, issuer, and expiry date. Assert nested `identityDocument` record updated.
- **T1.4: Update Worksite and Job Promotion**: Change `currentJobId` to new position. Assert new job and COR code reflected in employee profile.
- **T1.5: Update EIP Sizes**: Update `shoeSize: '43'`, `clothingSize: 'XL'`, `gloveSize: '10'`. Assert saved.
- **T2.1 (Cross-Client ID Tamper)**: User authenticated for Client A attempts `PUT /api/employees/[idOfClientB]`. Assert HTTP 403 / 404 forbidden.
- **T2.2 (Update CNP to Duplicate Existing)**: Attempt updating employee CNP to another employee's CNP. Assert HTTP 409 conflict.
- **T2.3 (Zero Gross Salary)**: Update salary to `0`. Assert accepted (unpaid leave or apprentice scenario) without crash.
- **T2.4 (Max Length Address String)**: Update address to 300 characters. Assert stored and truncated gracefully in document layout.
- **T2.5 (Empty Partial Payload)**: Call `PUT /api/employees/[id]` with empty object `{}`. Assert HTTP 200 with unchanged record (safe no-op).

---

#### Feature 12: Încetare Contract (`status: PLECAT`) (Req: R3)
- **T1.1: Standard Contract Termination**: Call `POST /api/employees/[id]/terminate` with `{ leaveDate: '2026-06-30', reason: 'Demisie art. 81 Codul Muncii' }`. Assert `status === 'PLECAT'`, `leaveDate == 2026-06-30`.
- **T1.2: Mutual Agreement Termination**: Call with reason `'Acordul părților art. 55 lit. b'`. Assert reason stored.
- **T1.3: Immediate Status Reflection in Employee List**: Query active employees list. Assert terminated employee has badge `PLECAT`.
- **T1.4: Audit Trail on Termination**: Verify `AuditEvent` logged with operator name, employee ID, and termination reason.
- **T1.5: Re-activation Flow Guard**: Verify employee status cannot be set to active without explicit audit log.
- **T2.1 (Leave Date Prior to Hire Date)**: Send `leaveDate: '2025-01-01'` when `hireDate == '2026-01-01'`. Assert HTTP 400 `"Data plecării nu poate fi anterioară datei angajării"`.
- **T2.2 (Missing Leave Date)**: Call endpoint with empty payload `{}`. Assert HTTP 400 `"Data plecării este obligatorie"`.
- **T2.3 (Already Terminated Employee)**: Call terminate on employee already having `status === 'PLECAT'`. Assert HTTP 400 `"Contractul salariatului este deja încetat"`.
- **T2.4 (Future Leave Date Beyond Notice Period)**: Leave date set to 60 days in the future. Assert status remains `ACTIV` until effective date, or marked `PREAVIZ_PLECARE`.
- **T2.5 (Special Characters in Reason)**: Reason containing `&`, `<`, `>` (e.g. `'Art. 55(b) & art. 81 <Demisie>'`). Assert safely stored and sanitized.

---

#### Feature 13: Excludere Salariați PLECAT din Conformitate & Batch (Req: R3)
- **T1.1: Compliance Metric Calculation Excludes PLECAT**: Company has 3 active employees (100% compliant) and 1 PLECAT employee (overdue medical check). Assert `calculateCompanyMetrics` reports `complianceScorePercent: 100%` and `totalEmployees: 3`.
- **T1.2: Batch Document Generation Excludes PLECAT**: Trigger `POST /api/documents/generate-batch` for entire company. Assert generated ZIP contains documents ONLY for active employees, 0 files for PLECAT employee.
- **T1.3: Bulk Onboarding Excludes PLECAT**: Query onboarding candidate list. Assert PLECAT employees are filtered out.
- **T1.4: Inspection Archive Excludes Active Files for PLECAT**: Inspection archive places PLECAT employee records into dedicated archive subfolder `Arhiva_Plecați/` without counting them in active headcounts.
- **T1.5: Direct Single Generation Prompt**: Attempting to generate current individual training sheet for a PLECAT worker prompts `"Salariatul este inactiv (PLECAT)"`.
- **T2.1 (Company With 100% PLECAT Workers)**: Company with 5 employees, all with `status: 'PLECAT'`. Assert `calculateCompanyMetrics` returns `totalEmployees: 0, complianceScorePercent: 100%` without division by zero `NaN` error.
- **T2.2 (Transition Day Expiry Boundary)**: Employee leaves today (`leaveDate == today`). Assert excluded from tomorrow's active compliance tracking.
- **T2.3 (Batch Filter Toggle Invariant)**: Pass explicit option `{ includeInactive: true }`. Assert batch includes PLECAT employees when explicitly demanded by legal auditor.
- **T2.4 (Null Leave Date on Legacy Inactive)**: Legacy employee record with `status: 'PLECAT'` but null `leaveDate`. Assert still safely excluded from active compliance metrics.
- **T2.5 (Bulk Zip Report Integrity)**: Verify `00_RAPORT_GENERARE_LOT.txt` explicitly logs `"Salariat [Nume] ignorat: status PLECAT la data [Data]"`.

---

#### Feature 14: Sincronizare Evenimente Instruire cu Documente (Req: R4)
- **T1.1: Record Event and Generate Collective Protocol**: Call `POST /api/trainings/record` with 3 participants on `2026-04-15`. Generate `ssm-pv-instruire-colectiva`. Assert protocol date in document matches `15.04.2026`, not employee hire dates.
- **T1.2: Individual Sheet Training Row Insertion**: After recording `PERIODIC_SSM` event, generate `ssm-fisa-instruire-individuala`. Assert table contains new row with event date, 2 hours duration, and instructor name.
- **T1.3: PSI Training Protocol Sync**: Record `PERIODIC_PSI` event. Generate `psi-pv-instruire`. Assert document embeds PSI topic, duration, and participant roster accurately.
- **T1.4: Atomic Date Sync Across All Participants**: Verify all 3 participants in training event have their `ssmLastTrainingDate` updated simultaneously to event date.
- **T1.5: Historical Training Log Integrity**: Add second training 6 months later. Assert individual training sheet displays both historical training rows chronologically.
- **T2.1 (Training on Exact Hire Date)**: Event date equals employee `hireDate`. Assert introductory training resolves cleanly without duplication.
- **T2.2 (Zero Duration Hours)**: Call record training with `durationHours: 0`. Assert HTTP 400 error (statutory training must be > 0 hours).
- **T2.3 (Extreme Duration Hours)**: Call with `durationHours: 24`. Assert HTTP 400 error (cannot exceed statutory daily work limits).
- **T2.4 (Training on Weekend / Legal Holiday)**: Training date on official Romanian holiday (e.g. 1 Decembrie). Assert permitted if company has continuous shift schedule, with warning.
- **T2.5 (Empty Participants Array)**: Call `POST /api/trainings/record` with `participantIds: []`. Assert HTTP 400 `"Sesiunea de instruire trebuie să conțină cel puțin un participant"`.

---

#### Feature 15: Filtrare Tipuri Evenimente în Fișe (Req: R4)
- **T1.1: Introductory Event in Introductory Table Only**: Record `type: 'INTRODUCTIV'`. Generate `ssm-fisa-instruire-individuala`. Assert entry appears exclusively in Cap. 1 (Instruirea Introductiv Generală) and NOT in Cap. 3 (Instruirea Periodică).
- **T1.2: Workplace Event in Workplace Table Only**: Record `type: 'LOC_MUNCA'`. Assert entry appears exclusively in Cap. 2 (Instruirea la Locul de Muncă).
- **T1.3: Periodic SSM in Periodic Table Only**: Record `type: 'PERIODIC_SSM'`. Assert entry appears exclusively in Cap. 3 (Instruirea Periodică).
- **T1.4: PSI Training in PSI Sheet Only**: Record `type: 'PERIODIC_PSI'`. Generate `psi-fisa-instructaj-individuala`. Assert entry appears in PSI sheet, not SSM sheet.
- **T1.5: Chronological Ordering Within Tables**: Record 3 periodic events out of order. Assert rendered table displays them sorted strictly by date ascending.
- **T2.1 (Duplicate Same-Day Event Types)**: Record two different periodic events on the same day. Assert both appear as distinct rows without overwriting.
- **T2.2 (Unrecognized Event Type)**: Inject invalid type `'RANDOM_TRAINING'`. Assert resolver throws error or excludes from statutory tables.
- **T2.3 (Table Row Capacity Overflow - 25 Rows)**: Employee with 25 periodic trainings over 12 years. Assert table rows expand cleanly in Word document without breaking layout.
- **T2.4 (Null Instructor Name)**: Event recorded with null instructor. Assert cell renders blank line for physical signature, no crash.
- **T2.5 (Special Characters in Material Topic)**: Topic name: `"Norme SSM & PSI: Lucrul cu unelte electrice <Clasa II>"`. Assert topic title XML escaped cleanly in table row.

---

#### Feature 16: Planificare Sesiuni Viitoare (`status: planned`) (Req: R4)
- **T1.1: Schedule Future Session**: Call `POST /api/trainings/record` with `eventDate: '2026-12-15'` (future date) and `status: 'planned'`. Assert HTTP 201, session stored in DB.
- **T1.2: Compliance Unaltered by Planned Session**: Verify employee compliance status remains `UPCOMING` or `OVERDUE` (not set to `VALID` prematurely by a future uncompleted session).
- **T1.3: Completion Transition**: When session date arrives, operator calls `POST /api/trainings/[id]/complete`. Assert `status` becomes `'recorded'` and employee compliance updates to `VALID`.
- **T1.4: Future Training Schedule View**: Query `/trainings?view=planned`. Assert displays planned session card with participant count and countdown.
- **T1.5: Editable Participant Roster for Planned Session**: Add/remove participants from a planned session before execution date. Assert roster updates cleanly.
- **T2.1 (Planning Beyond 1 Year)**: Event date planned 2 years in advance. Assert accepted as long-term training schedule.
- **T2.2 (Planning with Event Date in the Past)**: Call with `status: 'planned'` but `eventDate < today`. Assert HTTP 400 error `"O sesiune planificată nu poate avea o dată din trecut"`.
- **T2.3 (Immediate Re-calculation Guard)**: Confirm that `employee.ssmLastTrainingDate` in DB is NOT modified when creating a `'planned'` event.
- **T2.4 (Cancel Planned Session)**: Call `DELETE /api/trainings/[id]`. Assert session removed and 0 impact on employee compliance history.
- **T2.5 (Participant Leaves Company Before Planned Date)**: Employee becomes `PLECAT` before planned training date. Assert automatically removed from planned session roster.

---

#### Feature 17: Descărcare PV Colectiv & Fișă Direct din Card (Req: R4)
- **T1.1: Download Collective PV Endpoint**: Call `GET /api/trainings/[id]/documents?type=pv-colectiv`. Assert HTTP 200, Content-Type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- **T1.2: Download Thematic Material Endpoint**: Call `GET /api/trainings/[id]/documents?type=tematica`. Assert returns valid DOCX thematic material.
- **T1.3: Download Individual Training Sheets ZIP**: Call `GET /api/trainings/[id]/documents?type=fise-individuale-zip`. Assert returns ZIP containing all individual participant sheets.
- **T1.4: Card UI Button Functional State**: Check training card component in `/trainings`. Assert action buttons for PV, Tematică, and Fișe are present and enabled for completed sessions.
- **T1.5: Content Integrity of Downloaded PV**: Open downloaded PV document buffer. Assert contains table listing all participant names and CNPs accurately.
- **T2.1 (Download on Planned Session)**: Attempt downloading collective PV on session with `status: 'planned'`. Assert returns draft preview or blocks with message `"Sesiunea nu a fost încă finalizată"`.
- **T2.2 (Download for Deleted Training Event)**: Query with non-existent training event ID. Assert HTTP 404.
- **T2.3 (Session With 100 Participants ZIP Performance)**: Session with 100 participants. Call ZIP download. Assert completes within < 5000ms with all 100 files intact.
- **T2.4 (Filename Sanitization on Download)**: Verify HTTP Header `Content-Disposition` uses safe ASCII filename (no unescaped Romanian diacritics causing HTTP protocol errors).
- **T2.5 (Unauthorized Client Access)**: Attempt to download training documents belonging to Client A using Client B credentials. Assert HTTP 403 Forbidden.

---

#### Feature 18: Eliminare Blocaj Expirare Instruire la Emitere Fișă (Req: R4)
- **T1.1: Emission Allowed for Expired Employee**: Employee has `ssmLastTrainingDate` expired 60 days ago. Call document generator for `ssm-fisa-instruire-individuala`. Assert HTTP 200 (document generated successfully), zero 400 block.
- **T1.2: Emission Allowed for Expired Medical Check**: Employee has expired medical check. Call generator for `med-fisa-solicitare-examen`. Assert HTTP 200 (allows emitting exam request to resolve the expiration).
- **T1.3: Batch Generation Continues for Expired Workers**: Call `/api/documents/generate-batch` for company with expired workers. Assert ZIP generated with files for all active workers.
- **T1.4: Warning Banner Instead of Hard Block**: UI displays amber notice `"Instruire expirată - fișa emisă va servi la consemnarea noului instructaj"` without disabling the generate button.
- **T1.5: Offline Training Blank Allowed**: Worker with zero prior training history can generate initial training sheet.
- **T2.1 (Extreme Expiry - 5 Years Overdue)**: Training overdue by 1800 days. Assert generation succeeds without infinite loops or integer overflows.
- **T2.2 (Missing Last Training Date Completely - Null)**: Employee with `ssmLastTrainingDate: null`. Assert generation of new training sheet succeeds cleanly.
- **T2.3 (Batch Log Details Overdue Status)**: In `00_RAPORT_GENERARE_LOT.txt`, assert entry notes `"Salariat [Nume] are instruirea expirată la data [Data]; documentul a fost generat pentru conformare"`.
- **T2.4 (Simultaneous Medical and Training Expiry)**: Both medical and SSM expired. Assert both request/training sheets can be generated simultaneously.
- **T2.5 (Print Approval Semantics)**: Verify `approvedForPrint` remains `true` for the purpose of printing physical blank/fillable statutory forms.

---

#### Feature 19: Activare Modele Prisma EIP (Req: R5)
- **T1.1: EipItem Entity Creation**: Call `POST /api/eip/items` with `{ name: 'Casca protectie UVEX', category: 'PROTECTIE_CAP', standard: 'EN 397' }`. Assert record created in DB `EipItem`.
- **T1.2: JobEipRequirement Link**: Link EipItem to `Job` with `{ jobId, eipItemId, replacementIntervalMonths: 24, isMandatory: true }`. Assert record created in DB `JobEipRequirement`.
- **T1.3: EmployeeEipAssignment Record**: Assign item to employee with `{ employeeId, eipItemId, handoverDate: '2026-03-01', quantity: 1 }`. Assert record created in DB `EmployeeEipAssignment`.
- **T1.4: Query Requirements by Job**: Call `GET /api/eip/requirements?jobId=[id]`. Assert returns list of all required items for that position.
- **T1.5: Query Employee Current Equipment**: Call `GET /api/eip/assignments?employeeId=[id]`. Assert returns assigned equipment with handover dates.
- **T2.1 (Duplicate Item Name In Catalog)**: Attempt creating duplicate item name. Assert handled cleanly or rejected per schema uniqueness.
- **T2.2 (Negative Replacement Interval)**: Link job requirement with `replacementIntervalMonths: -12`. Assert HTTP 400 validation error.
- **T2.3 (Cascade Delete Job Retains Catalog Item)**: Delete a job having requirements. Assert `JobEipRequirement` deleted but `EipItem` catalog entry preserved.
- **T2.4 (Zero Quantity Assignment)**: Hand over equipment with `quantity: 0`. Assert HTTP 400 `"Cantitatea trebuie să fie minim 1"`.
- **T2.5 (Handover Date in Future)**: Handover date set to next month. Assert HTTP 400 error.

---

#### Feature 20: Generare Fișă Dotare EIP din Date Reale (Req: R5)
- **T1.1: Real Database Rows in Document**: Employee assigned 3 items in `EmployeeEipAssignment`. Generate `eip-fisa-acordare-individuala`. Assert generated DOCX table has exactly 3 equipment rows matching DB names.
- **T1.2: Elimination of Mock 10-Row Dictionary**: Assert generic mock rows (e.g. `'Bocanci protecție'`, `'Mănuși piele'` from static preset) do NOT appear unless actually present in DB.
- **T1.3: Actual Sizes Injected**: Employee with `shoeSize: '44'`, `clothingSize: 'XXL'`. Assert `PLACEHOLDER_MARIME_INCALTAMINTE === '44'` and `PLACEHOLDER_MARIME_COSTUM === 'XXL'`.
- **T1.4: Norm and Statutory Standard Injected**: Table includes statutory norm (e.g. `HG 1048/2006`) and standard (`EN ISO 20345`).
- **T1.5: Handover Date and Signature Blank**: Table displays handover date formatted as `DD.MM.YYYY` and blank space for employee receipt signature.
- **T2.1 (Employee with 0 EIP Items Assigned)**: Employee in IT position with 0 EIP items. Generate `eip-fisa-acordare-individuala`. Assert table renders clean message `"Nu sunt prevăzute echipamente individuale de protecție pentru acest post"` without crash.
- **T2.2 (Employee with Null Sizes)**: Employee sizes not recorded (null). Assert size tokens resolve to empty string or line for manual entry.
- **T2.3 (Large Equipment Roster - 15 Items)**: Construction worker assigned 15 distinct EIP items. Assert all 15 rows render cleanly across pages.
- **T2.4 (Special Characters in Equipment Name)**: Item name: `'Mănuși electroizolante 1000V & anti-acid <Clasa 0>'`. Assert XML escaped cleanly.
- **T2.5 (Item With Expired Replacement Term)**: Item handed over 3 years ago with 12m term. Assert sheet generates with historical handover date and flags renewal needed.

---

#### Feature 21: Evaluare Riscuri CRUD & Persistență (Req: R6)
- **T1.1: Create Risk Assessment Entity**: Call `POST /api/risk-assessments` with `{ clientId, jobId, evaluatorName: 'Ing. Radu', evaluationDate: '2026-02-15' }`. Assert `RiskAssessment` created in DB.
- **T1.2: Persist Risk Items**: Pass array of 5 risk items with factor of risk, gravity (1–7), probability (1–6). Assert calculated partial risk stored.
- **T1.3: Persist Prevention Measures**: Pass prevention measures linked to risk items with deadlines and responsibilities. Assert saved in DB `PreventionMeasure`.
- **T1.4: Update Risk Assessment**: Call `PUT /api/risk-assessments/[id]` updating evaluation conclusions. Assert saved in DB.
- **T1.5: Calculate Global Risk Level Invariant**: Assert system calculates Pece formula $N_{rg} = \frac{\sum R_i^2}{\sum R_i}$ and stores value in `RiskAssessment.globalRiskLevel`.
- **T2.1 (Gravity Out of Range - 0 or 8)**: Send `gravity: 8`. Assert HTTP 400 `"Gravitatea trebuie să fie între 1 și 7 conform metodei Pece"`.
- **T2.2 (Probability Out of Range - 0 or 7)**: Send `probability: 7`. Assert HTTP 400 `"Probabilitatea trebuie să fie între 1 și 6 conform metodei Pece"`.
- **T2.3 (Zero Risk Items Payload)**: Send `items: []`. Assert HTTP 400 `"Dosarul de evaluare trebuie să conțină cel puțin un factor de risc"`.
- **T2.4 (Non-Existent Job ID)**: Link assessment to non-existent `jobId`. Assert HTTP 404.
- **T2.5 (Special Characters in Risk Descriptions)**: Risk description with quotes and `<>` tags. Assert stored and retrieved without HTML corruption.

---

#### Feature 22: Conectare `risk-evaluare` la Dosar DB Persistat (Req: R6)
- **T1.1: Generate from Persisted Assessment**: Generate `risk-evaluare` passing assessment ID. Assert document reflects persisted evaluator name, evaluation date, and exact risk items.
- **T1.2: Dynamic Measures Replacement**: Assert prevention plan table in document contains exact measures, deadlines, and responsibles from `PreventionMeasure` table.
- **T1.3: Global Risk Score Dynamic Token**: Assert `PLACEHOLDER_NIVEL_RISC_GLOBAL` in document matches the computed DB score (e.g. `'2.85'`).
- **T1.4: Danger Zones Dynamic Token**: Persist `HazardZone` entities for client. Generate `risk-zone-pericol`. Assert zones 01..06 in document populated from DB records.
- **T1.5: Workstation Identification**: Document header includes real workstation name, department, and exposed worker headcount from DB.
- **T2.1 (Assessment Without Persisted Measures)**: Assessment has risk items but 0 prevention measures. Assert document generates with notice `"Măsurile de prevenire urmează a fi stabilite de comisie"`.
- **T2.2 (Max Risk Factor Count - 50 Items)**: Assessment with 50 risk factors. Assert all 50 rows render across tables with proper pagination.
- **T2.3 (Single Risk Factor Boundary)**: Assessment with exactly 1 risk factor. Assert Pece formula calculates correctly ($N_{rg} = R_1$).
- **T2.4 (Unapproved Assessment Status)**: Assessment in `'draft'` status. Assert document header displays draft watermark or status notice.
- **T2.5 (Cross-Client Assessment Tamper)**: Pass client A ID with assessment belonging to client B. Assert HTTP 403 Forbidden.

---

#### Feature 23: Configurare Flaguri Risc pe Post (`Job`) (Req: R6)
- **T1.1: Toggle Food Handling Flag**: Call `PUT /api/clients/[id]/jobs/[jobId]` with `{ isFoodHandling: true }`. Assert DB `Job.isFoodHandling === true`.
- **T1.2: Toggle Screen Work Flag**: Call with `{ isScreenWork: true }`. Assert DB `Job.isScreenWork === true`.
- **T1.3: Toggle Driving Required Flag**: Call with `{ isDrivingRequired: true }`. Assert DB `Job.isDrivingRequired === true`.
- **T1.4: Configure Ergonomic Posture and Weight**: Call with `{ workPosture: 'Ortostatic prelungit', maxWeightKg: 15.0, noiseExposed: false }`. Assert saved in DB.
- **T1.5: Auto-Activation of Statutory Obligations**: When `isFoodHandling` is set to true, verify employee compliance engine automatically activates hygiene certificate tracking.
- **T2.1 (Negative Max Weight)**: Send `maxWeightKg: -10`. Assert HTTP 400 validation error.
- **T2.2 (Excessive Weight Over Statutory Limits)**: Send `maxWeightKg: 100` (exceeds HG 1051/2006 manual handling limits). Assert warning or validation error.
- **T2.3 (Null Posture String)**: Send `workPosture: null`. Assert stored cleanly.
- **T2.4 (Boolean String Coercion)**: Send `{ isScreenWork: "true" }`. Assert API properly parses or coerces to boolean `true`.
- **T2.5 (All Flags False Default)**: Create new job without flags. Assert all boolean risk flags default to `false`.

---

#### Feature 24: Selector Punct de Lucru & Post în UI (Req: R7)
- **T1.1: Worksite Dropdown Populated**: Render `/documents/generate` with client having 3 worksites. Assert worksite `<select>` contains all 3 worksites with addresses.
- **T1.2: Job Dropdown Populated**: Assert job dropdown contains all jobs for the selected client.
- **T1.3: Reset On Client Change**: Change selected client from Client A to Client B. Assert `selectedWorksiteId` and `selectedJobId` reset immediately to `''`.
- **T1.4: Auto-Fill From Employee Profile**: Select an employee who has an assigned worksite and job. Assert UI auto-selects their worksite and job.
- **T1.5: Propagation to Generation Payload**: Click generate document. Assert outgoing POST body contains `worksiteId` and `jobId`.
- **T2.1 (Client with 0 Worksites)**: Select client without worksites. Assert dropdown renders `"Fără puncte de lucru înregistrate"` and does not throw React error.
- **T2.2 (Switching to Hygiene Template)**: Select a hygiene template. Assert Job dropdown is hidden or disabled (hygiene is independent of job context).
- **T2.3 (Worksite with Special Characters in Address)**: Worksite address: `'Str. Uzinei nr. 4 & 5 <Poarta 2>'`. Assert rendered cleanly in option label.
- **T2.4 (Unassigning Selected Worksite)**: User re-selects empty option `""`. Assert payload sends undefined/null and resolver treats as unselected.
- **T2.5 (Cross-Client Worksite Leak Guard)**: Verify worksites belonging to Client A never appear in dropdown when Client B is active.

---

#### Feature 25: Filtrare IPSSM / Tematici pe CAEN & Riscuri Reale (Req: R7)
- **T1.1: Office / Screen Work Filtering**: For IT company (CAEN 6201), bulk package includes `ipssm-activitati-birou` and `ipssm-telemunca`, excludes industrial IPSSMs.
- **T1.2: Restaurant / Food Sector Filtering**: For Horeca (CAEN 5610), bulk package includes `ipssm-alunecari` and food hygiene instructions, excludes IT-only IPSSMs.
- **T1.3: Driving IPSSM on Flag Condition**: Employee position has `isDrivingRequired: true`. Assert onboarding ZIP includes driving safety instructions (`ipssm-conducere-auto`).
- **T1.4: Manual Handling IPSSM on Weight Condition**: Position has `maxWeightKg > 10`. Assert package includes manual handling instructions (`ipssm-manipulare-mase`).
- **T1.5: Tematică loc de muncă Correlated to COR Code**: Template `training-detaliu-loc-munca` reflects specific tasks associated with employee's COR code.
- **T2.1 (Unknown CAEN Code)**: Client with unregistered CAEN `'9999'`. Assert bulk package defaults to universal baseline IPSSM pack without crashing.
- **T2.2 (Job with 0 Risk Flags)**: Job with all risk flags false. Assert package includes only baseline mandatory instructions.
- **T2.3 (Job with All Risk Flags True)**: Job with screen work, driving, food handling, and noise. Assert package includes comprehensive combined instruction pack without duplication.
- **T2.4 (Empty String CAEN)**: Client with `caen: ''`. Assert warning logged in ZIP report and generic package delivered.
- **T2.5 (CAEN with Dot Formatting)**: CAEN provided as `'62.01'` vs `'6201'`. Assert normalized seamlessly by catalog engine.

---

#### Feature 26: Tratare Erori per Salariat & Logging ZIP în Batch (Req: R7)
- **T1.1: Partial Batch Success (2 Valid, 1 Invalid)**: Call `/api/documents/generate-batch` for 3 employees where 1 employee has corrupted data. Assert HTTP 200 (not 400), ZIP returned containing documents for the 2 valid employees.
- **T1.2: Audit Report Presence in ZIP**: Open returned ZIP. Assert root directory contains `00_RAPORT_GENERARE_LOT.txt`.
- **T1.3: Detailed Failure Attribution in Report**: Read `00_RAPORT_GENERARE_LOT.txt`. Assert explicitly documents: `"Salariat: [Nume Invalid] | Eroare: [Cauza specifică]"`.
- **T1.4: Success Metrics in Report**: Assert log summarizes: `"Total salariați: 3 | Generați cu succes: 2 | Eșuați: 1"`.
- **T1.5: Isolated File Structure in ZIP**: Each employee has documents in dedicated subfolder `[Nume]_[Prenume]_[CNP]/`.
- **T2.1 (All Employees Fail in Batch)**: All 3 selected employees have unrecoverable errors. Assert HTTP 200 returning ZIP with ONLY `00_RAPORT_GENERARE_LOT.txt` detailing all failures (or structured HTTP 422 with full report).
- **T2.2 (Batch with 0 Employees Selected)**: Call with `employeeIds: []`. Assert HTTP 400 `"Niciun salariat selectat pentru generare"`.
- **T2.3 (Large Batch - 50 Employees)**: Run batch with 50 employees. Assert process completes within timeout and error isolation prevents cascade abort.
- **T2.4 (Special Characters in Employee Names in ZIP Paths)**: Employee named `Ștefănescu & Fiii`. Assert ZIP entry paths are sanitized to valid filesystem characters.
- **T2.5 (Memory Leak Guard on Large Batches)**: Verify Node.js memory remains stable without buffer accumulation across 50 documents.

---

#### Feature 27: Asociere `HygieneSession` cu `Client` (Req: R8)
- **T1.1: Create Session Linked to Client**: Call `POST /api/hygiene/sessions` with `{ clientId, sessionDate: '2026-05-10', examDate: '2026-05-15', location: 'București' }`. Assert `HygieneSession.clientId` saved in DB.
- **T1.2: Query Sessions Filtered by Client**: Call `GET /api/hygiene/sessions?clientId=[id]`. Assert returns only sessions belonging to that company.
- **T1.3: Client Info Injected in Hygiene Documents**: Generate `hygiene-tabel-cursanti`. Assert company name and CUI in header match linked client.
- **T1.4: Client Switch in Hygiene UI**: In `/hygiene`, select Client A. Assert session list shows only Client A sessions.
- **T1.5: Cascade Rules**: When client is deleted, verify attached hygiene sessions are either protected or handled per business rule.
- **T2.1 (Missing Client ID on Session Creation)**: Call `POST /api/hygiene/sessions` without `clientId`. Assert HTTP 400 `"Compania este obligatorie pentru crearea unei sesiuni de igienă"`.
- **T2.2 (Non-Existent Client ID)**: Pass `clientId: 'invalid-client-id'`. Assert HTTP 404.
- **T2.3 (Cross-Client Participant Guard)**: Attempt adding employee from Client B as participant in session of Client A. Assert HTTP 400 `"Salariatul nu aparține companiei organizatoare"`.
- **T2.4 (Session with Participants from Multiple Branches)**: Client with multiple worksites. Assert participants from any valid worksite of that client can be enrolled.
- **T2.5 (Null Location String)**: Call with `location: ''`. Assert HTTP 400 `"Locația desfășurării examenului este obligatorie"`.

---

#### Feature 28: Editare Participanți Igienă & Certificate (Req: R8)
- **T1.1: Record Attendance and Exam Grade**: Call `PATCH /api/hygiene/sessions/[id]/participants/[participantId]` with `{ attendance: 'prezent', examGrade: 10, examResult: 'admis' }`. Assert DB updated.
- **T1.2: Emit Certificate Series and Number**: Call with `{ certificateSeries: 'IGI', certificateNumber: '2026-0042' }`. Assert certificate data stored in DB.
- **T1.3: Propagate Certificate to Adeverință DOCX**: Generate `hygiene-adeverinta`. Assert document embeds certificate series `IGI` and number `2026-0042`.
- **T1.4: Propagate to Exam Catalog XLSX**: Generate `hygiene-anexe-catalog`. Assert row for participant reflects grade 10, 'Admis', and certificate number.
- **T1.5: Automatic Compliance Sync**: When participant receives certificate, assert employee's `hygieneCertificateDate` updates and hygiene compliance status switches to `VALID` (36m).
- **T2.1 (Grade Less Than 1 or Greater Than 10)**: Send `examGrade: 11` or `examGrade: 0`. Assert HTTP 400 `"Nota trebuie să fie între 1 și 10"`.
- **T2.2 (Result Respins with Certificate Emitted Invariant)**: Send `{ examResult: 'respins', certificateNumber: '2026-999' }`. Assert HTTP 400 `"Nu se poate emite certificat pentru un participant respins"`.
- **T2.3 (Marked Absent with Grade Recorded)**: Send `{ attendance: 'absent', examGrade: 9 }`. Assert HTTP 400 `"Un participant absent nu poate avea notă la examen"`.
- **T2.4 (Duplicate Certificate Number)**: Emit certificate number already existing in session. Assert HTTP 409 conflict.
- **T2.5 (Non-Existent Participant ID)**: Call PATCH on random UUID. Assert HTTP 404.

---

#### Feature 29: Calcul Conformitate Igienă pe CAEN / Post (Req: R8)
- **T1.1: Auto-Tracking for Horeca CAEN 5610**: Create client with CAEN `5610` (Restaurante). Assert `calculateCompanyMetrics` includes hygiene tracking for all food handlers.
- **T1.2: Auto-Tracking for Food Handling Post**: Client in general retail (CAEN 4711), but employee job has `isFoodHandling: true`. Assert hygiene tracking active for this employee.
- **T1.3: Exemption for Pure Office Work**: Client in software (CAEN 6201), `isFoodHandling: false`. Assert hygiene tracking NOT required (`hygieneCertificate: null`).
- **T1.4: 36 Months Validity Window**: Hygiene certificate dated `2023-04-10`. Reference date `2026-04-01`. Assert status is `UPCOMING` (due in 9 days).
- **T1.5: Expired Certificate Triggers Overdue**: Reference date `2026-04-15`. Assert status is `OVERDUE` (-5 days).
- **T2.1 (Leap Day Certificate Date - 29 Feb 2024)**: Certificate issued `2024-02-29` + 36 months. Assert clamps cleanly to `2027-02-28`.
- **T2.2 (Day 0 Remaining Boundary)**: Reference date exactly equals 36 months after issue. Assert status is `UPCOMING` (daysRemaining: 0).
- **T2.3 (Missing Certificate on Food Handler)**: Food handler with `hygieneCertificateDate: null`. Assert status is `MISSING` and overall status is `MISSING` / alert.
- **T2.4 (Food Handler Becomes Inactive)**: Food handler leaves (`status: 'PLECAT'`). Assert immediately excluded from hygiene compliance score.
- **T2.5 (Manual Override Hygiene Tracking)**: Company without food CAEN explicitly requests hygiene audit (`hygieneRequested: true`). Assert engine activates tracking.

---

#### Feature 30: Eliminare Atribuire `hireDate` la Import (Req: R8)
- **T1.1: Excel Without Medical Date Imports Null**: Parse Excel file where column "Data examen medical" is empty. Commit import. Query DB. Assert `employee.medicalLastExamDate === null`, never equal to `hireDate`.
- **T1.2: Excel Without SSM Training Imports Null**: Column "Data instruire SSM" is empty. Commit import. Assert `employee.ssmLastTrainingDate === null`, never equal to `hireDate`.
- **T1.3: Excel Without PSI Training Imports Null**: Column "Data instruire PSI" is empty. Commit import. Assert `employee.psiLastTrainingDate === null`, never equal to `hireDate`.
- **T1.4: Genuine Dates Preserved When Present**: Excel has real date `2025-11-20` for medical check and `2026-01-10` for hire date. Assert `medicalLastExamDate == 2025-11-20` and `hireDate == 2026-01-10`.
- **T1.5: Sincere Compliance Status on Import**: Employee imported with missing dates immediately shows `MISSING` badge in UI, clearly alerting operator that pre-employment medical checks must be completed.
- **T2.1 (Text "N/A" or "-" in Date Cells)**: Excel cell contains text `"N/A"` or `"-"` or `"lipsa"`. Assert parsed as `null` with zero errors, not falling back to `hireDate`.
- **T2.2 (Corrupted Date String "31.02.2026")**: Excel cell contains invalid date. Assert flagged in import preview error report, not silently overwritten with `hireDate`.
- **T2.3 (Hire Date Itself is Missing)**: Row has employee name and CNP but empty hire date. Assert row is flagged as invalid (`"Data angajării este obligatorie"`).
- **T2.4 (Space Padded Date Cell)**: Cell contains `"  15.01.2026  "`. Assert parsed cleanly as date without fallback.
- **T2.5 (Batch Import Invariant - 20 Employees)**: Import 20 employees with mixed date completeness. Assert exactly those with real dates have non-null fields in DB.

---

#### Feature 31: Re-validare Server-Side & Persistență Raport Diff (Req: R8)
- **T1.1: Server-Side Re-validation in Commit**: Upload Excel. Preview returns valid. In commit request, tamper payload with invalid CNP. Assert `/api/imports/commit` re-validates server-side and returns HTTP 400, rejecting corrupted data.
- **T1.2: Persistence of `ImportBatch` Record**: Complete valid import. Assert record created in `ImportBatch` table with `totalRows`, `successCount`, `errorCount`.
- **T1.3: Persistence of `validationReport` JSON**: Inspect `ImportBatch.validationReport`. Assert contains structured summary of all validated rows.
- **T1.4: Persistence of `diffData` JSON**: Inspect `ImportBatch.diffData`. Assert contains precise diff of newly created vs updated employees.
- **T1.5: Atomic Rollback on Severe Database Failure**: Force database constraint failure during commit transaction. Assert entire batch rolls back atomically (0 phantom employees inserted).
- **T2.1 (All Invalid Workbook Commit Attempt)**: Call commit on workbook where 100% of rows fail validation. Assert HTTP 400 with `newCount: 0` and 0 DB insertions.
- **T2.2 (Safe Partial Commit Boundary)**: Workbook with 3 valid and 2 invalid rows. Assert exactly 3 employees inserted, 2 reported in `ImportBatch.errorCount`.
- **T2.3 (Very Large Diff JSON - 100 Employees)**: Commit 100 employees. Assert `diffData` JSON stores cleanly in PostgreSQL JSONB column without truncation.
- **T2.4 (Dotted Header Permutations Row 12)**: Excel with headers `"C.N.P."`, `"Nume & Prenume"`, `"Data Angaj."`. Assert parsed and re-validated cleanly server-side.
- **T2.5 (Session Expiry / Mismatched Batch ID)**: Call commit with expired or forged `batchId`. Assert HTTP 404 / 400 error.

---

## 5. Verification Method

### 5.1 Independent Verification Commands
To verify the findings of this audit independently:

1. **Check Existing Test Suite Composition**:
   ```bash
   # Count total tests in e2e-suite.ts
   npx tsx scripts/e2e-suite.ts --tier=1 | grep -E "✓|✗" | wc -l
   npx tsx scripts/e2e-suite.ts --tier=2 | grep -E "✓|✗" | wc -l
   ```
2. **Verify Mock Values in Codebase**:
   ```bash
   # Check residual mock data in resolver.ts and generator.ts
   grep -rn "Munteanu Cristian" src/
   grep -rn "CLIENT TEST" src/
   grep -rn "15.03.1988" src/
   ```
3. **Verify Context Fallback in Resolver**:
   ```bash
   # Inspect resolver.ts lines 2050-2065 for employee[0] and jobs[0]
   sed -n '2050,2065p' src/lib/templates/resolver.ts
   ```
4. **Verify Automatic hireDate Fallback in Importer**:
   ```bash
   # Inspect importer.ts lines 890-895
   sed -n '890,895p' src/lib/importer.ts
   ```
5. **Verify Prisma Schema Gaps**:
   ```bash
   # Check HygieneSession model for missing clientId
   grep -A 20 "model HygieneSession" prisma/schema.prisma
   ```

### 5.2 Invalidation Conditions
This audit's conclusions would be invalidated only if:
- An existing, undetected automated test runner in the workspace already executes 5 isolated functional tests and 5 boundary tests for all 31 features (disproven by repository grep and `scripts/` inspection).
- The statutory requirement of 5 Tier 1 and 5 Tier 2 tests per feature was rescinded (refuted by `TEST_INFRA.md` § Feature Inventory & Test Coverage).
