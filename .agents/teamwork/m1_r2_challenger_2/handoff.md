# Handoff Report — Adversarial Stress Testing of Round-Trip Export/Import and Database Seed Integrity

**Agent ID**: `m1_r2_challenger_2` (teamwork_challenger)  
**Role**: critic, specialist  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_challenger_2/`  
**Date**: 2026-11-02T20:39:00Z  
**Recipient**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb` (Orchestrator)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Test Harness Execution
An independent, comprehensive TypeScript test script was developed and executed:
- **File**: `scripts/adversarial-seed-roundtrip-stress.ts`
- **Execution Command**: `npx tsx scripts/adversarial-seed-roundtrip-stress.ts`
- **Overall Result**: 16 Tests Executed | 14 PASSED | 2 FAILED | 148 Assertions Executed | Execution Time: 504.38ms

```text
========================================================================
ADVERSARIAL STRESS TEST SUMMARY
========================================================================
Suites Run: 5
Total Tests: 16
Passed Tests: 14
Failed Tests: 2
Total Assertions Executed: 148
Execution Time: 504.38ms

FAILURES ENCOUNTERED:
  - 1.2 Statutory Completeness: Identity & Residence for All Active Employees: Assertion failed: Radu Marius (BISTRO GOURMET S.R.L.) has invalid CNP checksum: 1820815410098
  - 1.4 BISTRO GOURMET: Export -> Direct Parse -> compareWithDatabase: Assertion failed: Employee Marin Andreea invalid: CNP-ul este invalid (cifra de control sau lungime incorectă).
```

### 1.2 Concrete Observations & Verbatim Errors

#### Observation 1: Invalid Seed CNP Checksums for Bistro Gourmet Employees
In `prisma/seed.ts`, the seed data defines employees for `BISTRO GOURMET S.R.L.` with mathematically invalid Romanian CNP control digits:
1. `Radu Marius` (`prisma/seed.ts:736`, `782`, `1066`):
   - Seeded CNP: `1820815410098`
   - Modulo 11 checksum calculation on first 12 digits (`182081541009`) using statutory weights `[2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9]`:
     `sum = 1*2 + 8*7 + 2*9 + 0*1 + 8*4 + 1*6 + 5*3 + 4*5 + 1*8 + 0*2 + 0*7 + 9*9 = 238`
     `238 % 11 = 7`.
   - The statutory control digit is **`7`** (valid CNP: `1820815410097`). The seeded CNP has control digit `8`.
   - `validateCNP('1820815410098')` returns `false`.

2. `Marin Andreea` (`prisma/seed.ts:820`, `866`, `1120`):
   - Seeded CNP: `2950920410045`
   - Modulo 11 checksum calculation on first 12 digits (`295092041004`) using statutory weights:
     `sum = 2*2 + 9*7 + 5*9 + 0*1 + 9*4 + 2*6 + 0*3 + 4*5 + 1*8 + 0*2 + 0*7 + 4*9 = 224`
     `224 % 11 = 4`.
   - The statutory control digit is **`4`** (valid CNP: `2950920410044`). The seeded CNP has control digit `5`.
   - `validateCNP('2950920410045')` returns `false`.

#### Observation 2: Export/Re-Import Round-Trip Failure on Bistro Gourmet
When `exportClientToExcel(bistro.id)` is executed on `BISTRO GOURMET S.R.L.` and the exported buffer is passed directly to `parseClientWorkbook(buffer)`:
- `parseClientWorkbook` validates rows using `validateCNP(cnpRaw)` (`src/lib/importer.ts:199-201`):
  ```typescript
  } else if (!validateCNP(cnpRaw)) {
    errors.push('CNP-ul este invalid (cifra de control sau lungime incorectă).');
  }
  ```
- Because both CNPs fail validation, both employee records parse with:
  `isValid: false`
  `errors: ["CNP-ul este invalid (cifra de control sau lungime incorectă)."]`
- This violates the explicit milestone requirement:
  *"Pass the exported buffer directly to `parseClientWorkbook(buffer)`."*
  *"Assert that every employee parses with `isValid: true` and `errors.length === 0`."*

#### Observation 3: NEXUS SOLUTIONS Round-Trip Passes Cleanly
When `exportClientToExcel(nexus.id)` is executed on `NEXUS SOLUTIONS S.R.L.` (CUI: `RO38765432`) and passed to `parseClientWorkbook(buffer)`:
- All 4 active employees (`Barbu Gheorghe`, `Stan Alexandru`, `Dumitru Ioana-Raluca`, `Vasilescu Elena`) have valid CNPs, complete `IdentityDocument`, and complete `ResidenceAddress` records.
- `parsed.employees.every(e => e.isValid && e.errors.length === 0)` evaluates to `true`.
- `compareWithDatabase(nexus.id, parsed)` returns:
  - `unchangedCount`: 4
  - `modifiedCount`: 0
  - `newCount`: 0
  - `errorCount`: 0
  - Zero false positives.

#### Observation 4: Adversarial Stress Suites Results (All Passed)
The remaining 12 adversarial stress tests all PASSED with 100% fidelity:
1. **Romanian Diacritics Invariance (`ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț`)**:
   - Extreme diacritic injection (`Păpădie-Țârlea`, `Ștefăniță-Împăratul`, `Șoseaua Înfrățirii Românilor nr. Ț-42/Â`, `Târgu Cărbunești`, `Dâmbovița`, `Lăcătuș Șef Mecanic & Îngrijitor Spații Verzi`) into Excel survived round-trip parsing with 100% exact character retention. No mojibake, question marks, or entity escaping corruption.
   - Legacy cedilla characters (`ş`, `ţ`) are parsed and correctly distinguished from modern comma-below diacritics (`ș`, `ț`) by `compareWithDatabase`.
2. **Date Format Conversions & Boundaries**:
   - Numeric serial timestamps (e.g. `32888` for `1990-01-15`, `44197` for `2021-01-01`) parse into native JavaScript `Date` instances with exact year, month, and day.
   - String variations (`DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD` ISO) parse accurately.
   - Leap day (`29.02.2024`) is recognized and parsed cleanly.
   - Malformed dates (e.g. `'data_invalida'`) and missing hire dates are rejected with `isValid: false` and appropriate error strings.
3. **Whitespace Sanitization**:
   - Leading/trailing whitespace and tabs in string cells (names, CNP, street, street number, job, worksite) are safely trimmed by `getCellValue`.
   - Re-importing a trimmed workbook against the database yields 100% `UNCHANGED` and 0 `MODIFIED` (zero false positives).
4. **`compareWithDatabase` Precision & Error Isolation**:
   - Single-field modification sensitivity verified across 8 distinct fields (`Nume`, `Prenume`, `Funcție / post`, `Punct de lucru`, `Adresă domiciliu` [street], `Adresă domiciliu` [number], `Număr act identitate`, `Status` with `leaveDate`). Each was detected with exactly 1 modified row and the exact changed field name.
   - Multi-field mutations captured all modified fields on the same record simultaneously.
   - Brand-new valid employee rows were classified as `status: 'NEW'` and updated `newJobs` summary.
   - Summary conservation invariant (`unchangedCount + modifiedCount + newCount + errorCount + ambiguousCount === totalRows`) held across all mixed-scenario tests.

---

## 2. Logic Chain

1. **Premise 1**: The dispatch mandate requires that calling `exportClientToExcel(client.id)` on *each* client in the database (including NEXUS SOLUTIONS and BISTRO GOURMET) and passing the exported buffer to `parseClientWorkbook(buffer)` must result in every employee parsing with `isValid: true` and `errors.length === 0`.
2. **Premise 2**: In `src/lib/importer.ts:199-201`, `parseClientWorkbook` validates employee CNPs using `validateCNP(cnpRaw)`. If `validateCNP` returns `false`, an error is appended to `errors` and `isValid` is set to `false`.
3. **Observation 1**: The seed file `prisma/seed.ts` contains invalid CNPs for both employees of Bistro Gourmet:
   - Radu Marius: `1820815410098` (computed control digit is 7, not 8)
   - Marin Andreea: `2950920410045` (computed control digit is 4, not 5)
4. **Observation 2**: Running `scripts/adversarial-seed-roundtrip-stress.ts` confirms that when exporting Bistro Gourmet to Excel and re-importing the buffer, both employees fail validation with:
   `Assertion failed: Employee Marin Andreea invalid: CNP-ul este invalid (cifra de control sau lungime incorectă).`
5. **Conclusion**: While the core exporter and importer engines are resilient to diacritics, date formats, whitespace, and diffing, the database seed contains invalid CNP data for Bistro Gourmet that breaks the round-trip contract for that client.

---

## 3. Caveats

- **Scope of Defect**: The bug is isolated entirely to the seed data in `prisma/seed.ts` (and a reference in `scripts/adversarial-m1-review.ts`). The exporter (`exporter.ts`), importer (`importer.ts`), and diffing logic (`compareWithDatabase`) are architecturally sound, robust, and correctly enforce Romanian CNP validation.
- **Review-Only Constraint**: Adhering to the strictly enforced constraint *"Review-only — do NOT modify implementation code"*, this agent has documented the defect and root cause without modifying `prisma/seed.ts`.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The exporter, importer, and diffing engines passed 14 out of 16 rigorous adversarial stress tests with high fidelity. However, Milestone 1 cannot be approved in its current state because the seeded data for `BISTRO GOURMET S.R.L.` contains invalid CNP checksums, causing the exported workbook to fail re-import validation.

### Required Changes for Implementer (`m1_r2_worker_1`):
1. In `prisma/seed.ts`:
   - Change Radu Marius's CNP from `1820815410098` to **`1820815410097`** (lines 736, 782, 1066).
   - Change Marin Andreea's CNP from `2950920410045` to **`2950920410044`** (lines 820, 866, 1120).
2. In `scripts/adversarial-m1-review.ts`:
   - Update CNP references on lines 71 and 72 to `1820815410097` and `2950920410044`.
3. Execute database re-seeding:
   ```bash
   npx prisma db seed
   ```
4. Re-run verification suite:
   ```bash
   npx tsx scripts/adversarial-seed-roundtrip-stress.ts
   ```

---

## 5. Verification Method

To independently reproduce the finding and verify the fix:

```bash
# 1. Reproduce the failure with the current seed data
npx tsx scripts/adversarial-seed-roundtrip-stress.ts
# Observe:
#   ✗ [FAIL] 1.2 Statutory Completeness: Identity & Residence for All Active Employees: Assertion failed: Radu Marius (BISTRO GOURMET S.R.L.) has invalid CNP checksum: 1820815410098
#   ✗ [FAIL] 1.4 BISTRO GOURMET: Export -> Direct Parse -> compareWithDatabase: Assertion failed: Employee Marin Andreea invalid: CNP-ul este invalid (cifra de control sau lungime incorectă).

# 2. Verify standalone CNP validation of the seed values
npx tsx -e "
import { validateCNP } from './src/lib/importer';
console.log('Radu Marius (1820815410098):', validateCNP('1820815410098')); // prints false
console.log('Marin Andreea (2950920410045):', validateCNP('2950920410045')); // prints false
console.log('Corrected Radu (1820815410097):', validateCNP('1820815410097')); // prints true
console.log('Corrected Marin (2950920410044):', validateCNP('2950920410044')); // prints true
"

# 3. Invalidation condition:
# Upon applying the single-digit CNP checksum fixes and running `npx prisma db seed`,
# `npx tsx scripts/adversarial-seed-roundtrip-stress.ts` must exit code 0 with 16/16 tests passed.
```
