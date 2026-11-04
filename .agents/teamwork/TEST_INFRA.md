# Test Infrastructure & Specification Architecture (TEST_INFRA)

**Document Type:** Test Infrastructure Architecture & Runner Specification  
**System:** Romanian SSM, HR, and Hygiene Document & Compliance Tracking System  
**Track:** E2E Testing Track (Tiers 1–4)  
**Authoritative Normative Standards:**
- **Medicina Muncii:** HG nr. 355/2007, HG nr. 1169/2011, Legea nr. 53/2003 (Codul Muncii) art. 27–28
- **Instruire SSM:** Legea nr. 319/2006 a securității și sănătății în muncă, HG nr. 1425/2006 (art. 74–100)
- **Instruire PSI / Situații de Urgență:** Legea nr. 307/2006, OMAI nr. 712/2005 (art. 24–26), OMAI nr. 163/2007
- **Cursuri Noțiuni Fundamentale de Igienă:** Ordinul comun MS / ME nr. 2209/4469/2022 (art. 18, 20), HG nr. 857/2011
- **Document Templates:** 25 normalized templates (23 DOCX, 2 XLSX) in `templates_registry/normalized/`

---

## 1. Test Architecture & Philosophy

The E2E Test Suite (`scripts/e2e-suite.ts`) provides an **opaque-box, requirement-driven verification gate**. It treats the system as a black box with defined input surfaces (API/function contracts, database persistence, and document renderers) and asserts against legal and domain ground truths derived from Romanian labor legislation.

### Principles:
1. **Opaque-Box Verification:** Tests are written against the interface contracts (`PROJECT.md § Interface Contracts`) and statutory behavior, never against implementation quirks.
2. **Deterministic Mathematical Derivation:** Every expected date, interval, and status threshold is derived from explicit legal articles (e.g. 36 months from Ordin 2209/2022, 12 months from HG 355/2007) and verified using safe calendar arithmetic.
3. **No Facade Tests:** Tests strictly verify actual outcomes (e.g. real ZIP/XML inspection of generated `.docx` and `.xlsx` files to confirm 0 unmapped `{PLACEHOLDER_*}` tokens, and real calculation of remaining days).
4. **Strict Isolation & Idempotence:** Each test suite seeds its own temporary synthetic data, executes in isolation, and tears down all state without polluting production records or colliding with concurrent jobs.
5. **Progressive Testability & Graceful Degradation:** During milestone development, the test runner cleanly identifies implemented vs pending milestones, running all available checks and reporting precise failure diagnostics to guide milestone developers.

---

## 2. The Four-Tier Testing Hierarchy

```
+-----------------------------------------------------------------------------------+
|                        TIER 4: REAL-WORLD SCENARIOS                               |
| Full Romanian Employee Lifecycle: Hire -> Medical -> SSM 8h -> Job 8h -> Scadențe|
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                     TIER 3: CROSS-FEATURE COMBINATIONS                            |
| Multi-Client Isolation, State Transitions, Document Bundling, Metric Aggregation  |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                     TIER 2: BOUNDARY & CORNER CASES                               |
| Leap Years (Feb 29), Month-End Clamping, Exact Day Limits, 0/100 Rosters, Diacritics|
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                     TIER 1: FEATURE ISOLATION & CONTRACTS                         |
| Safe Month Arithmetic, 4 Compliance Pillars, 25 Templates, UI Badge Thresholds    |
+-----------------------------------------------------------------------------------+
```

### Tier 1: Feature Coverage in Isolation
Tests every core capability in isolation against its normative specification:
1. **Medicină a Muncii (HG 355/2007):**
   - Standard periodic interval: 12 months for general/TESA roles.
   - Special risk intervals: 6 months for night shifts or toxic exposure.
   - Medical verdicts: `APT`, `APT CONDIȚIONAT`, `INAPT TEMPORAR`, `INAPT`.
2. **Instruire Periodică SSM (Legea 319/2006 & HG 1425/2006):**
   - 12-month interval for office/administrative (TESA) staff.
   - 6-month or 3-month interval for operational / technical personnel.
   - Duration tracking (minimum 1 hour statutory, 2 hours standard practice).
3. **Instruire Periodică PSI / SU (Legea 307/2006 & OMAI 712/2005):**
   - 6-month interval for administrative / low-risk staff.
   - 1 to 3 months for technical equipment and fire intervention personnel.
4. **Cursuri de Igienă (Ordinul 2209/4469/2022):**
   - Exact 3-year (36 months) validity period calculated from exam date.
   - Applicable exclusively to designated modules (alimentar, curățenie, cosmetică, apă, DDD).
5. **Document Auto-Completion (25 Templates):**
   - 23 DOCX and 2 XLSX templates verified individually.
   - Validates that output files are created, non-empty, and valid ZIP packages.
   - Inspects `word/document.xml`, `header*.xml`, `footer*.xml`, and Excel sheets for remaining `PLACEHOLDER_*` tokens.
   - Enforces the **strict legal separation** of Legal Representative (`PLACEHOLDER_REPREZENTANT_LEGAL`) and Employee (`PLACEHOLDER_NUME_COMPLET`).
6. **UI Status Badge & Alert Contracts:**
   - Evaluates mapping: `VALID` (>30 days), `UPCOMING` (0..30 days), `OVERDUE` (<0 days), and `MISSING` (null date).
   - Verifies compliance with R3: no user roles, permission hierarchies, or electronic signature barriers.

### Tier 2: Boundary & Corner Cases
Stresses edge conditions that frequently cause arithmetic or rendering failures:
1. **Leap Year Calculations (Feb 29):**
   - Leap year base date (`2024-02-29`) + 12 months must clamp cleanly to `2025-02-28`.
   - Leap year base date (`2024-02-29`) + 36 months (hygiene) must clamp to `2027-02-28`.
   - Non-leap base (`2023-02-28`) + 12 months must resolve to `2024-02-28` without unwanted drift.
2. **Month-End Clamping (Unequal Month Lengths):**
   - Jan 31 + 1 month -> Feb 28 (or Feb 29 in leap year), NEVER March 2 or 3.
   - Mar 31 + 1 month -> Apr 30.
   - May 31 + 1 month -> Jun 30.
   - Aug 31 + 1 month -> Sep 30.
   - Oct 31 + 1 month -> Nov 30.
3. **Exact Day Threshold Boundaries:**
   - Due date equals reference date at midnight (`daysRemaining = 0`) -> `UPCOMING`.
   - Exactly 30 days remaining (`daysRemaining = 30`) -> `UPCOMING`.
   - Exactly 31 days remaining (`daysRemaining = 31`) -> `VALID`.
   - Due date yesterday (`daysRemaining = -1`) -> `OVERDUE`.
   - Due date far in the past (`daysRemaining = -365`) -> `OVERDUE`.
4. **Missing & Malformed Data:**
   - `lastDate === null` or `undefined` -> `MISSING`, `daysRemaining = null`, `dueDate = null`.
   - Invalid date objects or malformed strings handled gracefully without unhandled exceptions.
5. **XLSX Participant Roster Limits & Blanking:**
   - Empty roster (`participants: []`): generation succeeds, unused template rows are wiped clean without displaying raw `PLACEHOLDER_*` strings.
   - Single participant (`participants.length = 1`): row 1 populated, rows 2–100 or 2–195 wiped.
   - Maximum roster capacity (100 participants in `Anexe Curs igiena.xlsx`, 115 in `Tabel Cursanti exemplu.xlsx`): all rows populated, totals matched.
6. **Romanian Diacritics & Special Characters:**
   - Full support for Romanian diacritics: `ș`, `ț`, `ă`, `î`, `â`, `Ș`, `Ț`, `Ă`, `Î`, `Â` (both standard comma-below and legacy cedilla).
   - Escaping of XML reserved characters (`<`, `>`, `&`, `"`, `'`) in generated DOCX runs.

### Tier 3: Cross-Feature Combinations
Tests system behavior across interdependent modules and state transitions:
1. **Dynamic State Transitions & Expiration Cycles:**
   - Simulates employee medical check renewal: starting at `OVERDUE` -> recording new medical exam -> transitioning synchronously to `VALID`.
   - Company-wide metrics automatically re-aggregate upon employee state mutation.
2. **Document Generation with Live Compliance Context:**
   - Generates employee training files embedding real compliance dates and certificate numbers.
   - Generates Hygiene session registers embedding session dates, exam dates, and participant evaluation grades.
3. **Multi-Client & Multi-Employee Metric Aggregation:**
   - Aggregates company metrics for complex employee distributions (e.g. 5 Valid, 2 Upcoming, 2 Overdue, 1 Missing).
   - Verifies mathematical exactness of `complianceScorePercent = (valid / totalItemsTracked) * 100`.
   - Multi-tenant client isolation: updates to Client A never alter Client B's compliance metrics or employee rosters.

### Tier 4: Real-World Scenarios (Romanian Employee Lifecycle)
Executes a full, authentic, end-to-end employee lifecycle simulation under Romanian law:
1. **Phase 1: Recruitment & Employment Formalization (Codul Muncii)**
   - Candidate application: generate `Cerere angajare.docx`.
   - GDPR notification: generate `Informare Protectia Datelor.docx`.
   - Internal regulation acknowledgement: generate `Declaratie luare cunostinta RI.docx`.
   - Dual-employment & tax deduction statement: generate `Declaratie pe proprie raspundere CIM.docx`.
   - Individual employment contract: generate `Contract individual munca 2026.docx`.
2. **Phase 2: Medical Clearance (HG 355/2007)**
   - Pre-employment occupational health examination (Examen medical la angajare).
   - Verdict recorded: `APT`, interval: 12 months.
   - Verify initial compliance status is `VALID` (365 days).
3. **Phase 3: Introductory SSM & PSI Training (HG 1425/2006)**
   - 8-hour introductory-general training performed on Day 1 before assignment to workplace.
   - Verification test passed.
   - Document generation: `Tematica introductiv generala 4h.docx`, `Detaliu Tematica introductiv generala.docx`.
   - Job description annex: generate `Anexa fisa postului SSM.docx`.
4. **Phase 4: Workplace-Specific Training (Instruire la Locul de Muncă)**
   - 8-hour workplace training performed on Day 2 by direct supervisor.
   - Specific IPSSMs applied: `13 - ACTIVITATI DE BIROU.docx`, `11 - ALUNECARI.docx`, `12 - AUTOVEHICULE.docx`.
   - Document generation: `Tematica loc de munca.docx`, `Detaliu Tematica loc de munca.docx`.
5. **Phase 5: Time Travel & Periodic Compliance Monitoring**
   - Simulation t + 5 months: all pillars remain `VALID`.
   - Simulation t + 11 months, 10 days: 20 days remaining -> state triggers `UPCOMING` (Amber badge, dashboard alert).
   - Simulation t + 12 months, 5 days without renewal: deadline expired (-5 days) -> state triggers `OVERDUE` (Red badge, critical dashboard alert).
   - Periodic exam performed: recorded in database -> state immediately resets to `VALID` (Green badge).
6. **Phase 6: Comprehensive Inspection Audit Pack**
   - Employer organization decisions: generate `DECIZII.docx` (Deciziile 01–09).
   - Risk assessment files: generate `EVALUAREA RISCURILOR.docx`, `TESA.docx`, `Plan de Prevenire TESA.docx`.
   - Emergency and hazard procedures: generate `Plan actiune pericol grav si iminent.docx`, `Zone pericol grav si iminent.docx`.
   - Full bundle inspection: 0 placeholders, 100% valid files.

---

## 3. Test Runner Invocation & CLI Interface

The runner is invoked via standard TypeScript execution:

```bash
# Run the complete 4-tier E2E test suite
npx tsx scripts/e2e-suite.ts

# Run with specific tier filter
npx tsx scripts/e2e-suite.ts --tier=1
npx tsx scripts/e2e-suite.ts --tier=2
npx tsx scripts/e2e-suite.ts --tier=3
npx tsx scripts/e2e-suite.ts --tier=4

# Run with keyword filter
npx tsx scripts/e2e-suite.ts --grep="Leap"
npx tsx scripts/e2e-suite.ts --grep="Lifecycle"
```

### Exit Codes:
- `0`: All executed test assertions passed successfully.
- `1`: One or more test assertions failed (or an unhandled runtime error occurred).

### Output Format:
The runner emits a structured, colorized report indicating:
- Suite header with timestamp and environment details
- Tier-by-tier execution status (`✓ PASS`, `✗ FAIL`, `○ SKIP`)
- Test name, elapsed time (ms), and diagnostic details on failure
- Summary table with total tests, passed, failed, and completion percentage

---

## 4. Coverage Thresholds & Acceptance Criteria

| Metric | Target Threshold | Strictness | Gate For |
|---|---|---|---|
| **Tier 1 Pass Rate** | 100% | Mandatory | M1 / M3 Acceptance |
| **Tier 2 Pass Rate** | 100% | Mandatory | Boundary Hardening |
| **Tier 3 Pass Rate** | 100% | Mandatory | Cross-Feature Integration |
| **Tier 4 Pass Rate** | 100% | Mandatory | Final M4 Acceptance |
| **Template Zero-Placeholder** | 25 / 25 Templates | 0 Unmapped Tokens | Document Generation M3/M4 |
| **Calendar Clamping Exactness**| 100% (0 day drift) | Strict | Legal Accuracy M1/M4 |
| **Legal Separation Integrity** | 100% | Strict (Admin != Employee) | Legal Compliance M3/M4 |
| **Build Integrity** | Clean (`npm run build`) | Zero Errors | Final M4 Release |

---

## 5. Test Isolation & Database Hygiene Protocol

1. **Unique Test Tenant:** All database tests operate on designated test clients with distinct CUIs (e.g. `RO-TEST-E2E-001`, `RO-TEST-E2E-002`) to prevent data contamination.
2. **Automated Teardown:** Every test execution cleans up its temporary synthetic entities upon completion or caught error, using targeted queries:
   ```sql
   DELETE FROM "Client" WHERE cui LIKE 'RO-TEST-E2E-%';
   ```
3. **No File Pollution:** Generated test artifacts are stored in `storage/test_documents/` and cleaned or overwritten idempotently on subsequent runs.
