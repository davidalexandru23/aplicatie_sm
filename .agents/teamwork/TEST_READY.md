# TEST_READY: Comprehensive 4-Tier E2E Test Suite Specification & Readiness Report

**Status:** PUBLISHED & READY  
**Track:** E2E Testing Track Lead (`teamwork_test_writer`)  
**Test Suite Script:** `scripts/e2e-suite.ts`  
**Architecture Spec:** `.agents/teamwork/TEST_INFRA.md`  
**Execution Command:** `npx tsx scripts/e2e-suite.ts`  
**Date:** 2026-11-01  

---

## 1. Executive Summary

The comprehensive, requirement-driven, 4-tier E2E test suite has been designed, implemented, and verified at `scripts/e2e-suite.ts`. It acts as the definitive automated acceptance gate for the Romanian SSM, HR, and Hygiene Document & Compliance System, testing against statutory standards (HG 355/2007, Legea 319/2006, HG 1425/2006, Legea 307/2006, Ordinul MS/ME 2209/4469/2022, Legea 53/2003).

The suite operates as an **opaque-box verification runner**, enforcing interface contracts, mathematical accuracy, zero unmapped placeholders across all 25 official templates, safe calendar clamping, edge cases, and the full Romanian employee lifecycle.

---

## 2. Test Suite Architecture & Inventory

### Four-Tier Test Structure

| Tier | Focus | Test Count | Current Status | Gate For |
|---|---|:---:|:---:|---|
| **Tier 1** | Feature Coverage in Isolation | 31 tests | 26 PASS / 5 Pending M1 | M1 / M3 Acceptance |
| **Tier 2** | Boundary & Corner Cases | 14 tests | 3 PASS / 11 Pending M1 | Boundary Hardening |
| **Tier 3** | Cross-Feature Combinations | 4 tests | 1 PASS / 3 Pending M1 | Integration Acceptance |
| **Tier 4** | Real-World Scenarios (Lifecycle) | 4 tests | 2 PASS / 2 Pending M1 | Final M4 Acceptance |
| **TOTAL** | **Comprehensive E2E Gate** | **53 tests** | **32 PASS / 21 Pending M1** | **System Release** |

---

## 3. Current Baseline Execution Verdict

```bash
$ npx tsx scripts/e2e-suite.ts
```

### Passing Capabilities (32 / 53 passed — 60.4% ready):
1. **Zero-Placeholder Document Generation (All 25 Templates in Isolation):**
   - 23 DOCX and 2 XLSX templates verified individually on disk.
   - 100% of generated files verified for **0 unmapped `{PLACEHOLDER_*}` tokens**.
   - Includes complex 103-token `TESA.docx`, 44-token `DECIZII.docx`, 8-sheet `Anexe Curs igiena.xlsx`, and 115-row `Tabel Cursanti exemplu.xlsx`.
2. **Legal Entity Separation:**
   - Strict verification that `PLACEHOLDER_REPREZENTANT_LEGAL` and `PLACEHOLDER_NUME_COMPLET` are cleanly segregated.
   - Verified that employee name is never substituted into employer approval or decision blocks.
3. **Romanian Diacritics & XML Meta-Character Escaping:**
   - Validated handling of `ș`, `ț`, `ă`, `î`, `â`, `Ș`, `Ț`, `Ă`, `Î`, `Â` and XML entities (`<`, `>`, `&`, `"`, `'`).
4. **Excel Participant Boundary Scalability:**
   - Empty roster (`participants: []`) generates cleanly with unused placeholder rows wiped.
   - Large rosters (50 and 100 participants) generate without cell truncation or formatting errors.
5. **Phase 1 Lifecycle Recruitment Pack:**
   - 5-document recruitment & onboarding pack (`Cerere angajare`, `Informare GDPR`, `Declaratie RI`, `Declaratie CIM`, `Contract CIM 2026`) generates with 0 unmapped tokens.
6. **Phase 6 Lifecycle Audit Pack:**
   - 6-document company SSM audit dossier (`DECIZII`, `EVALUAREA RISCURILOR`, `Plan Prevenire TESA`, `Plan Pericol Grav`, `Zone Pericol`, `IPSSM Universale`) generates with 0 unmapped tokens.

### Pending Implementation Items (Escalated to Milestone Tracks):
The 21 failing tests are strictly due to `src/lib/compliance.ts` not yet existing in the workspace (assigned to Milestone M1):
- **Missing Module:** `Cannot find module 'src/lib/compliance'`
- **Required Interface Contract (`PROJECT.md § Interface Contracts`):**
  ```typescript
  export function addMonthsSafe(date: Date, months: number): Date;
  export function calculateItemCompliance(lastDate: Date | null, intervalMonths: number, label: string, referenceDate?: Date): ComplianceItemResult;
  export function calculateEmployeeCompliance(employee: any, referenceDate?: Date): EmployeeComplianceSummary;
  export function calculateCompanyMetrics(employees: any[], referenceDate?: Date): CompanyComplianceMetrics;
  ```
- **Action Required by Milestone M1 Lead:** Implement `src/lib/compliance.ts` implementing `addMonthsSafe` with month-end clamping (28/29 Feb, 30 Apr/Jun/Sep/Nov) and threshold calculations (`VALID` >30d, `UPCOMING` 0..30d, `OVERDUE` <0d, `MISSING` null).
- As soon as M1 delivers `src/lib/compliance.ts`, re-running `npx tsx scripts/e2e-suite.ts` will immediately execute all 21 pending tests.

---

## 4. Runner Invocation & Verification Commands

```bash
# Full suite execution
npx tsx scripts/e2e-suite.ts

# Filter by tier
npx tsx scripts/e2e-suite.ts --tier=1
npx tsx scripts/e2e-suite.ts --tier=2
npx tsx scripts/e2e-suite.ts --tier=3
npx tsx scripts/e2e-suite.ts --tier=4

# Filter by keyword
npx tsx scripts/e2e-suite.ts --grep="Template"
npx tsx scripts/e2e-suite.ts --grep="Leap"
npx tsx scripts/e2e-suite.ts --grep="Lifecycle"
```

---

## 5. Acceptance Gate Definition for Milestone Release

For Milestone M4 signoff and release:
- `npx tsx scripts/e2e-suite.ts` must exit with **code 0** (53/53 tests passing).
- Zero unmapped `{PLACEHOLDER_*}` tokens across all generated documents.
- `npm run build` must compile cleanly with 0 TypeScript and Next.js errors.
