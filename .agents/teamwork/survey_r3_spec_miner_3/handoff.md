# Handoff Report: Specification Mining & Verification Architecture (R3 & R4)

**Agent ID**: `survey_r3_spec_miner_3`  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r3_spec_miner_3/`  
**Recipient**: `52a3ebb3-f7ef-4302-a871-b663bbb8cd88` (Parent Orchestrator)  
**Date**: 2026-11-03  
**Scope**: R3 (Comprehensive Template & Business Logic Review) & R4 (Automated Verification Suite and Test Seed Data)

---

## 1. Observation

### 1.1 Template Pack Inventory & Integrity
- **Physical Locations Checked**:
  - `handoff/ssm-template-placeholder-pack/templates/` (28 files: 23 `.docx`, 2 `.xlsx`, 3 complementary `.pdf`).
  - `templates_registry/normalized/` (28 files: exact byte-for-byte identical match confirmed via `diff -r templates_registry/normalized handoff/ssm-template-placeholder-pack/templates` exiting with code 0).
- **Catalog Definitions**: `src/lib/templates/definitions.ts` defines `TEMPLATE_CATALOG` with exactly 25 official templates (23 DOCX and 2 XLSX).
- **Exact 1:1 Placeholder Mapping Verification**:
  - Across all 23 Word (`.docx`) documents, every token physically present in the XML files (`word/document.xml`, `word/header*.xml`, `word/footer*.xml`) matches the exact key definitions in `definitions.ts`.
  - For the 2 Excel (`.xlsx`) documents (`Anexe Curs igiena.xlsx` with 2,314 cell instances and `Tabel Cursanti exemplu.xlsx` with 1,036 cell instances), tokens are indexed with numeric suffixes (`_001` to `_195` / `_115`). In `definitions.ts`, they are declared using compressed bracket notations (e.g. `PLACEHOLDER_NUME_COMPLET_{001–195}`). In `generator.ts` (lines 504–515), regex `_(\d{2,3})$` dynamic expansion correctly maps participant rows up to roster count and clears unused cell capacity without corruption.

### 1.2 Romanian Statutory Framework & Legal Norms Observed
- **ITM / SSM Norms (Legea 319/2006 & HG 1425/2006)**:
  - External Service Provider (SEPP - Serviciu Extern de Prevenire și Protecție) requires: ITM Abilitation Certificate Number and Date (`Certificat de abilitare Serviciu Extern SSM emis de Ministerul Muncii - ITM`), Trade Registry number (`Reg. Com.`), CUI, official corporate address, and designated qualified specialists (`Specialist SSM studii superioare`).
  - Employer Organizational Decisions (Deciziile Interne 01–09 & 11 in `DECIZII.docx`):
    - Decizia 01: Lucrător desemnat SSM / Organizarea activităților (art. 19–25 HG 1425/2006)
    - Decizia 02: Personal instruit prim ajutor (art. 10 Legea 319/2006)
    - Decizia 03: Cadru tehnic / Responsabil cu atribuții PSI (Legea 307/2006, OMAI 712/2005)
    - Decizia 06: Comisia internă cercetare evenimente/accidente ITM (art. 114–124 HG 1425/2006)
    - Permis de lucru cu foc: OMAI 163/2007 (analiză gaze, distanță de siguranță, supraveghere 2h)
  - Risk Evaluation (`TESA.docx`, `EVALUAREA RISCURILOR.docx`): INCDPM "Alexandru Darabont" national method. Evaluates 30 risk factors across 4 work system elements (Executant, Sarcina, Mijloace, Mediu) with severity (1–7), probability/frequency (1–6), partial risk level (1–7), and global risk score ($N_{rg} \le 3.50$).
- **DSP Norms (Ordinul comun MS/MEdC 1225/5031/2003 & Ordinul comun MS/ME 2209/4469/2022)**:
  - Fundamental Hygiene Training Methodology: Modules 1–5 (Modul 1 Food, Modul 2 Cleaning/Healthcare/Hotels, Modul 3 Water, Modul 4 Body Care, Modul 5 DDD).
  - 3-year statutory validity period (36 calendar months) under Art. 20 of Order 2209/2022.
  - DSP examination commission (President, Inspector, Secretary), Proces-Verbal with DSP series/number, Catalog de examen, and Certificate/Adeverință.
- **DSVSA / ANSVSA Norms (Reg. CE 852/2004, Ordinul ANSVSA 111/2008 & HG 984/2005)**:
  - Hygiene records for food business operators (Catering, Restaurants, Retail, Food Production) serving as mandatory compliance evidence for DSP and DSVSA inspections.

### 1.3 External Provider Profile Placeholders
- 15 of the 25 templates reference external consulting provider and specialist placeholders:
  - `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_FURNIZOR_SSM`, `PLACEHOLDER_CUI_PRESTATOR`, `PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`, `PLACEHOLDER_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_STRADA_FURNIZOR`, `PLACEHOLDER_NUMAR_FURNIZOR`, `PLACEHOLDER_BLOC_FURNIZOR`, `PLACEHOLDER_SCARA_FURNIZOR`, `PLACEHOLDER_ETAJ_FURNIZOR`, `PLACEHOLDER_APARTAMENT_FURNIZOR`, `PLACEHOLDER_COD_POSTAL_FURNIZOR`, `PLACEHOLDER_LOCALITATE_FURNIZOR`, `PLACEHOLDER_JUDET_FURNIZOR`, `PLACEHOLDER_TELEFON_PRESTATOR`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_SITE_PRESTATOR`, `PLACEHOLDER_REPREZENTANT_PRESTATOR`, `PLACEHOLDER_CALITATE_REPREZENTANT`, `PLACEHOLDER_ACT_REPREZENTANT`, `PLACEHOLDER_SPECIALIST_SSM`, `PLACEHOLDER_EVALUATOR_RISC`, `PLACEHOLDER_CERTIFICAT_EVALUATOR`.
- **Current Limitation Observed**:
  - `prisma/schema.prisma` currently lacks dedicated `SsmProvider` and `SsmSpecialist` entity models; `Client` stores only 3 scalar string fields (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`).
  - `resolver.ts` hardcodes static constant `ROMANIAN_LEGAL_SSM_PROVIDER` with Bucharest mock data (`EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.`, ITM Cert `4812/2021`, specialist `Ing. Mihai Popescu`). In `definitions.ts`, 20 of these fields are marked `source: 'manual'`.

### 1.4 Missing Optional Field Handling
- In `src/lib/templates/definitions.ts`: 399 total fields across 25 templates, of which 288 are optional (`required: false`).
- In `src/lib/templates/generator.ts`:
  - `renderTemplateBuffer` uses `nullGetter: (part) => (part.value ? `{${part.value}}` : '')`.
  - Filters out empty keys: `!key.startsWith('PLACEHOLDER_') || (value !== undefined && value !== null && String(value).trim() !== '')`.
  - Scans output buffer with `collectUnresolvedPlaceholders` (regex `/PLACEHOLDER_[A-Z0-9_]+/g`).
  - Sets status to `'missing_data'` if any unresolved placeholders or required fields are detected; otherwise `'approved_for_print'`.
- **Critical Flaw Observed in `resolver.ts`**:
  - Lines 652–675 in `resolver.ts` artificially inject mock defaults (`'C.I.'`, `'RX'`, `'123456'`, `'SPCLEP Sector 1'`, `'Str. Victoriei nr. 10'`, `'A1'`, `'1'`, `'2'`, `'5'`) whenever an employee lacks an `identityDocument` or `residenceAddress`.
  - Consequently, for employees without an ID card or address, documents were generated with fabricated identity data instead of remaining incomplete, and the UI never flagged them under "Câmpuri de completat manual".
  - For single-family home residents (where building/apartment are legitimately null), omitting them caused docxtemplater to leave `{PLACEHOLDER_BLOC}`, falsely triggering `missing_data`. In Romanian administrative practice, non-applicable sub-address components must resolve to `'-'` (cratimă).

### 1.5 Verification Scripts & Seed Data Execution
- Executing `npx tsx scripts/verify-all.ts` ran 5 suites:
  - Suite 1 (Document Generation 25/25): PASS (2.1s)
  - Suite 2 (Compliance Deadlines 45/45): PASS (0.6s)
  - Suite 3 (Excel Import/Export 6/6): PASS (1.0s, when seeded)
  - Suite 4 (E2E Suite 53/53): PASS (2.6s)
  - Suite 5 (Next.js Turbopack Build): PASS (4.8s)
  - Total: 130/130 verification items pass cleanly.
- `prisma/seed.ts` seeds 2 clients (NEXUS SOLUTIONS S.R.L. and BISTRO GOURMET S.R.L.) and 6 employees, but currently lacks:
  - Dedicated `SsmProvider` and `SsmSpecialist` database records.
  - Database-persisted `HygieneSession` and `HygieneParticipant` records.

---

## 2. Logic Chain

1. **Premise 1**: Romanian labor and occupational safety inspections (ITM, DSP, DSVSA) require documents to accurately reflect the employer's genuine legal representative, the authorized external consulting provider (SEPP), accredited specialists, and actual employee certifications. Fabricated mock IDs or hardcoded consulting names in production outputs violate Romanian administrative and compliance standards.
2. **Premise 2**: 15 out of 25 templates require external provider and specialist information. In `definitions.ts`, these are currently classified as `source: 'manual'`. By creating `SsmProvider` and `SsmSpecialist` models and linking `Client` via foreign keys (`providerId`, `designatedSpecialistId`), `resolver.ts` can dynamically resolve all 24 provider placeholders directly from the database, eliminating hardcoded provider constants.
3. **Premise 3**: For hygiene compliance (R1), food, healthcare, and hospitality businesses must maintain employee hygiene training rosters under Order 1225/2003 / Order 2209/2022. The `/documents/generate` route currently blocks generation if a separate `hygieneSessionId` is not selected. Providing a direct flow in `/documents/generate` to select hygiene templates (`hygiene-tabel-cursanti`, `hygiene-anexe-catalog`, `hygiene-adeverinta`) directly for a client company's employees enables DSP/DSVSA compliance document generation on demand.
4. **Premise 4**: For missing optional fields (e.g. employee living in a house without building/apartment numbers), substituting `'-'` satisfies Romanian administrative conventions, allows docxtemplater to replace the token, and prevents false `missing_data` flags. For missing required fields (e.g. unrecorded CNP or ID number), `resolver.ts` must NOT invent fake data (`'RX 123456'`), but leave the field empty so `/documents/generate` presents it as a manual input field and sets `missing_data` status if unresolved.
5. **Premise 5**: Verification integrity (R4) requires an automated test suite verifying: (a) Prisma migrations for Provider/Specialist tables, (b) Provider CRUD and Client dropdown assignment, (c) Direct hygiene roster generation with realistic Order 1225/2003 modules and 36-month expiry clamping, and (d) Zero-placeholder template rendering across all 25 formats without crashing on missing optional data.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | IPSSM | `ipssm-alunecari` | Instruction sheet for slips, trips & same-level falls | Client, Legal Rep, Specialist SSM | DOCX document | Missing rep/specialist flags `missing_data` | `11 - ALUNECARI.docx`, `definitions.ts` |
| 2 | IPSSM | `ipssm-autovehicule` | Transport & company vehicle operation safety rules | Client name, Legal Rep, Specialist SSM | DOCX document | Missing fields retain `{PLACEHOLDER_*}` | `12 - AUTOVEHICULE.docx`, `definitions.ts` |
| 3 | IPSSM | `ipssm-birou` | VDT displays, ergonomics & office work safety rules | Client, Legal Rep, Specialist SSM | DOCX document | Missing fields retain `{PLACEHOLDER_*}` | `13 - ACTIVITATI DE BIROU.docx`, `definitions.ts` |
| 4 | Hygiene | `hygiene-adeverinta` | Nominal hygiene training completion certificate | Employee, Session/Module, Cert series/no, Provider | DOCX document | Missing participant or cert info flags `missing_data` | `Adeverinta participare.docx`, `definitions.ts` |
| 5 | HR / SSM | `hr-anexa-fisa-post` | Job description SSM statutory obligations annex | Employee name, Legal Rep | DOCX document | Reversible signature guard (Rep $\ne$ Emp) | `Anexa fisa postului SSM.docx`, `definitions.ts` |
| 6 | Hygiene | `hygiene-anexe-catalog` | 8 official DSP hygiene annexes & exam catalog | Client/Session, Provider accreditations, Employee roster | XLSX workbook (8 sheets) | Clears unused rows beyond roster count | `Anexe Curs igiena.xlsx`, `generator.ts` |
| 7 | HR | `hr-cerere-angajare` | Official employment application form | Employee personal details, ID card, Job, Dates | DOCX & PDF documents | Missing address or ID flags `missing_data` | `Cerere angajare.docx`, `Cerere angajare.pdf` |
| 8 | HR | `hr-cim-2026` | 2026 Individual Employment Contract (Codul Muncii) | Company & Employee details, Job, Salary, Schedule | DOCX document | Missing mandatory CIM clauses flags `missing_data` | `Contract individual munca 2026.docx` |
| 9 | Decision | `decizii-angajator` | Internal SSM/PSI decisions package (Deciziile 01-09 & 11) | Client, Appointed officers, Decisions date, Hot work data | DOCX document | Falls back to statutory defaults if unappointed | `DECIZII.docx`, `resolver.ts` |
| 10 | HR | `hr-declaratie-regulament` | Internal Regulation acknowledgment statement | Employee address, ID details, Client, Date | DOCX & PDF documents | Missing address components handle `'-'` | `Declaratie luare cunostinta RI.docx/.pdf` |
| 11 | HR | `hr-declaratie-raspundere` | Primary workplace & dependents tax declaration | Employee identity, CAS fund, Dependents details | DOCX & PDF documents | Non-applicable dependents output `'-'` | `Declaratie pe proprie raspundere CIM.docx/.pdf` |
| 12 | Training | `training-detaliu-introductiv` | Introductory general safety curriculum & support | Client name, Legal Rep, Specialist SSM | DOCX document | Missing fields retain `{PLACEHOLDER_*}` | `Detaliu Tematica introductiv generala.docx` |
| 13 | Training | `training-detaliu-loc-munca` | Workplace safety curriculum & didactic support | Client name, Legal Rep | DOCX document | Missing fields retain `{PLACEHOLDER_*}` | `Detaliu Tematica loc de munca.docx` |
| 14 | Risk | `risk-evaluare` | Comprehensive INCDPM risk assessment folder | Company CAEN, Founded year, Evaluation metrics, SEPP | DOCX document | Unresolved CAEN falls back to industry preset | `EVALUAREA RISCURILOR.docx`, `definitions.ts` |
| 15 | HR | `hr-info-dosar` | Personnel file mandatory documentation checklist | Static checklist (no tokens) | DOCX document | None (static informational file) | `INFO dosar personal.docx` |
| 16 | HR | `hr-gdpr-informare` | Employee personal data processing information notice | Client, Legal Rep, Employee identity & ID | DOCX document | Missing employee data flags `missing_data` | `Informare Protectia Datelor.docx` |
| 17 | IPSSM | `ipssm-universale` | Universal internal safety instructions (10 core chapters)| Client name, Legal Rep, Specialist SSM | DOCX document | Missing fields retain `{PLACEHOLDER_*}` | `IP 01-10 UNIVERSALE.docx` |
| 18 | IPSSM | `ipssm-opis` | Master inventory and OPIS of employer's IPSSMs | Client name, Provider phone & email | DOCX document | Missing provider info falls back gracefully | `OPIS IPSSM.docx` |
| 19 | Risk | `risk-plan-actiune-urgenta` | Action plan for serious and imminent danger | Client name | DOCX document | Missing client name retains placeholder | `Plan actiune pericol grav si iminent.docx` |
| 20 | Risk | `risk-plan-prevenire-tesa` | Annual Prevention and Protection Plan (TESA staff) | Client, Legal Rep, SEPP Provider, Specialist | DOCX document | Missing provider data falls back to SEPP profile | `Plan de Prevenire TESA.docx` |
| 21 | Hygiene | `hygiene-tabel-cursanti` | DSP Candidate examination register and attendance roster| Client/Session, Employee roster with modules & birth data| XLSX workbook | Dynamic clearing of rows $N > \text{roster}$ | `Tabel Cursanti exemplu.xlsx`, `generator.ts` |
| 22 | Training | `training-tematica-introductiv`| Introductory-general training thematic syllabus (4h) | Client name, Application date, Provider phone/email | DOCX document | Missing contact details fall back gracefully | `Tematica introductiv generala 4h.docx` |
| 23 | Training | `training-tematica-loc-munca` | Workplace & periodic safety training syllabus by job | Client, Job title, Application date, Provider contact| DOCX document | Missing job title falls back to general TESA | `Tematica loc de munca.docx` |
| 24 | Risk | `ipssm-tesa` | INCDPM workplace risk assessment sheet (30 factors) | Job, workers count, exposure, 30 factor scores (G, F, N)| DOCX document | Derives $N_{rg}$ & distribution without crash | `TESA.docx`, `caen-risk-presets.ts` |
| 25 | Risk | `risk-zone-pericol` | High-risk and specific hazard zones register | Client, Director, Lucrător desemnat, 6 hazard zones | DOCX document | Unconfigured zones retain standard safe defaults | `Zone pericol grav si iminent.docx` |
| 26 | Provider | Provider Profile Settings | Central external consulting provider profile management | Corporate info, ITM cert no/date, Address, Specialists | Database record, Settings UI | Validation error if CUI or cert no invalid | R2 requirement, `schema.prisma` |
| 27 | Provider | Client Provider Assignment | Assign provider & select designated specialist for client | `providerId`, `designatedSpecialistId` in Client | Client Edit UI & Form submission | Cascade delete protection on compliance links | R2 requirement, `client-edit-modal.tsx` |
| 28 | Hygiene | Direct Client Hygiene Flow | Generate hygiene documents directly for client employees | Client ID, selected employees, Order 1225/2209 modules | DOCX/XLSX hygiene documents | Validates 3-year expiration & module validity | R1 requirement, `/documents/generate` |

---

## 4. Edge Cases

| # | Feature | Input / Condition | Observed Behavior | Normative Resolution |
|---|---------|-------------------|-------------------|----------------------|
| 1 | Missing Address Sub-fields | Employee in house (`building`, `entrance`, `floor`, `apartment` are null) | Generator filters empty keys, leaves `{PLACEHOLDER_BLOC}` in text, collector marks `missing_data`. | `resolver.ts` must supply `'-'` for optional sub-address tokens when residence has no building/apartment, keeping document `approved_for_print`. |
| 2 | Unrecorded Identity Card | Employee with `identityDocument === null` in DB | `resolver.ts` previously injected fake `'RX 123456'`, hiding missing data. | Keep fields empty in resolver; UI displays them under manual fields; uncompleted generation retains token and marks `missing_data`. |
| 3 | Unassigned Client Provider | Client with `providerId === null` | Resolver previously used hardcoded static `ROMANIAN_LEGAL_SSM_PROVIDER`. | Use database provider if assigned; if not, use default provider profile with operator warning, allowing manual overrides in UI. |
| 4 | Direct Client Hygiene Generation | Client company with employees needing hygiene, but no `HygieneSession` record | UI blocks generation with "Selectează sesiunea de igienă folosită pentru document." | Allow selecting client employees directly; auto-populate participant roster from `Employee` records (`hygieneModule`, `hireDate`, `hygieneLastExamDate`). |
| 5 | Excel Roster Capacity Overflow | Generating Excel roster for $M$ participants where template has $K$ slots | Rows $1 \dots M$ are populated; rows $M+1 \dots K$ are blanked out cleanly via regex `_(\d{2,3})$`. | Verified working in `generator.ts` (lines 504–515). When $M > K$, split into continuation sheets or validate capacity limit. |
| 6 | Employer vs Employee Separation | Dual-party documents (CIM, Job description annex, Internal Regulation) | `PLACEHOLDER_REPREZENTANT_LEGAL` must resolve to employer, never employee. | Verified strict separation in `resolver.ts` line 477 and verified in `test-all-templates-generation.ts`. |
| 7 | Diacritics & XML Meta-characters | Romanian diacritics (`ș`, `ț`, `ă`, `î`, `â`) and XML special chars (`&`, `<`, `>`) in names | Docxtemplater escapes XML entities; PDF normalizes to ASCII via `pdfText()` to prevent font crash. | Verified in `scripts/e2e-suite.ts` Tier 2 test: clean XML serialization without corruption. |
| 8 | 36-Month Expiry Calendar Clamping | Expiry calculation for hygiene certificates starting on leap day (2024-02-29) | `addMonthsSafe` clamps 2024-02-29 + 36 months to 2027-02-28 without day drift or DST shifting. | Verified in `scripts/verify-compliance.ts` (45/45 tests passing). |

---

## 5. Caveats

- **No Modifications to Production Code During Survey**: This phase was strictly read-only and exploratory. No Prisma migrations or production files were altered.
- **Assumed Single Default Provider for Consulting Practice**: In Romanian SSM consulting practice, an application instance typically belongs to a single primary consulting provider (e.g. `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.`) which may employ multiple specialists assigned to various client portfolios. Supporting multi-provider management in Settings preserves future multi-tenancy.
- **Excel Template Fixed Grid Capacity**: `Anexe Curs igiena.xlsx` has 195 slots and `Tabel Cursanti exemplu.xlsx` has 115 slots. In Romanian practice, typical class batches range from 5 to 50 employees per session, which is well within the 115/195 slot limits.

---

## 6. Conclusion & Architectural Recommendation

To fulfill requirements R1, R2, R3, and R4 completely and cleanly:

1. **Schema Migration (Prisma)**:
   - Add model `SsmProvider` with fields: `id`, `name`, `cui`, `regCom`, `address`, `street`, `number`, `building`, `entrance`, `floor`, `apartment`, `postalCode`, `locality`, `county`, `itmCertificateNumber`, `itmCertificateDate`, `phone`, `email`, `website`, `legalRepresentative`, `representativeRole`, `isActive`.
   - Add model `SsmSpecialist` with fields: `id`, `providerId`, `name`, `cnp`, `role`, `certificateNumber`, `phone`, `email`, `isActive`.
   - In `Client`: add `providerId` (relation to `SsmProvider`, optional) and `designatedSpecialistId` (relation to `SsmSpecialist`, optional).
2. **Provider Profile Settings & Client Assignment (R2)**:
   - Create `/settings` or `/settings/provider` UI for provider corporate and accreditation details and specialist CRUD.
   - Update client intake and edit modals (`client-intake-modal.tsx`, `client-edit-modal.tsx`) with provider dropdown and specialist dropdown.
3. **Template Resolver & Graceful Missing Field Handling (R3)**:
   - Update `resolver.ts` to source provider and specialist placeholders from the assigned `Client.provider` and `Client.designatedSpecialist`.
   - Fix missing optional field handling: supply `'-'` for non-applicable sub-address components (building, scara, etaj, ap); do not inject fake identity data for unrecorded ID cards, allowing `/documents/generate` to prompt for manual input and mark `missing_data` if omitted.
4. **Direct Client Hygiene Document Generation Flow (R1)**:
   - Update `/documents/generate` to allow generating `hygiene-tabel-cursanti`, `hygiene-anexe-catalog`, and `hygiene-adeverinta` directly for client companies, populating the employee roster dynamically from client employees who require hygiene training, including modules, completion dates, and 36-month expiration dates.
5. **Automated Verification Suite & Test Seed Data (R4)**:
   - Enhance `prisma/seed.ts` to seed an accredited `SsmProvider`, 3 designated specialists, and link both Client 1 and Client 2.
   - Add verification script `scripts/verify-provider-and-hygiene.ts` testing schema migrations, provider CRUD, client assignment, and hygiene roster rendering.
   - Wire all tests into `scripts/verify-all.ts` as a unified 6-suite verification gate.

---

## 7. Verification Method

To independently verify all findings and test suite execution:

1. **Seed Database**:
   ```bash
   npx tsx prisma/seed.ts
   ```
   *Expected outcome*: Seeds 2 clients (NEXUS and BISTRO), 3 worksites, 6 jobs, and 6 employees.
2. **Run All-Templates Generation Test**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   *Expected outcome*: 25/25 templates generated into `storage/test_documents/` with 0 unmapped tokens and status `approved_for_print`.
3. **Run Unified Verification Suite**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Expected outcome*: All 5 suites pass (130/130 verified items, exit code 0).
4. **Inspect Physical Normalized Templates**:
   ```bash
   diff -r templates_registry/normalized handoff/ssm-template-placeholder-pack/templates
   ```
   *Expected outcome*: Code 0, no output (100% byte identical).
