# Handoff Report — Milestone 3 Adversarial Challenge

**Date**: 2026-11-03T18:04:00Z  
**Agent**: teamwork_challenger (m3_r2_challenger_2)  
**Archetype**: EMPIRICAL CHALLENGER  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_challenger_2/`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Observation 1: Defect in `parseExcelDate()` under `TZ=Asia/Tokyo` (and all timezones with UTC offset > +4h)
In `src/lib/importer.ts`, lines 137–142:
```typescript
137:   if (val instanceof Date) {
138:     if (isNaN(val.getTime())) return undefined;
139:     // Offset cushion (+4h) pentru a preveni devierea în ziua anterioară din cauza fusului orar
140:     const rounded = new Date(val.getTime() + 4 * 3600 * 1000);
141:     return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
142:   }
```
And in `src/lib/importer.ts`, line 306:
```typescript
306:   const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
```

When running `TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz`, the test output reports:
```
--- Test B: Parsare Native Excel Serials in Asia/Tokyo ---
  ✓ [parseExcelDate(number)] Serial 45351 (29 Feb 2024): parsed=2024-02-29T00:00:00.000Z (așteptat=2024-02-29T00:00:00.000Z)
  ✗ [XLSX cellDates:true] Serial 45351 (29 Feb 2024): cell.v="2024-02-28T15:00:00.000Z" -> parsed=2024-02-28T00:00:00.000Z (așteptat=2024-02-29T00:00:00.000Z)
  ✓ [parseExcelDate(number)] Serial 45352 (01 Mar 2024): parsed=2024-03-01T00:00:00.000Z (așteptat=2024-03-01T00:00:00.000Z)
  ✗ [XLSX cellDates:true] Serial 45352 (01 Mar 2024): cell.v="2024-02-29T15:00:00.000Z" -> parsed=2024-02-29T00:00:00.000Z (așteptat=2024-03-01T00:00:00.000Z)
  ✓ [parseExcelDate(number)] Serial 45291 (31 Dec 2023): parsed=2023-12-31T00:00:00.000Z (așteptat=2023-12-31T00:00:00.000Z)
  ✗ [XLSX cellDates:true] Serial 45291 (31 Dec 2023): cell.v="2023-12-30T15:00:00.000Z" -> parsed=2023-12-30T00:00:00.000Z (așteptat=2023-12-31T00:00:00.000Z)
```
Date drift observed: -1 day across leap years (`2024-02-29` -> `2024-02-28`), month boundaries (`2024-03-01` -> `2024-02-29`), and year boundaries (`2023-12-31` -> `2023-12-30`).

### Observation 2: Full Round-Trip Database Fidelity
When running against the Prisma database on all seeded clients (`RO38765432` NEXUS SOLUTIONS S.R.L. and `RO45123987` BISTRO GOURMET S.R.L.):
```
  ✓ [PASS] [Round-Trip] Client NEXUS SOLUTIONS S.R.L. (RO38765432) - 4 angajați: Total: 4, UNCHANGED: 4, MODIFIED: 0, ERRORS: 0
  ✓ [PASS] [Round-Trip] Client BISTRO GOURMET S.R.L. (RO45123987) - 2 angajați: Total: 2, UNCHANGED: 2, MODIFIED: 0, ERRORS: 0
```
This was also verified by running `npx tsx scripts/test-export-import-roundtrip.ts`, which exited with code 0 and confirmed 100% UNCHANGED for all clients, plus correct diff attribution on intentional modifications.

### Observation 3: Template Download Integrity
Fetching `GET(new NextRequest('http://localhost:3000/api/imports/template?type=' + type))` produced:
- `?type=empty`: HTTP 200, Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, Size 28,816 bytes, SheetNames `['Instrucțiuni', 'Firmă și angajați', 'Context posturi']`. Parsed cleanly with `parseClientWorkbook()` (0 employees, empty company metadata).
- `?type=sample`: HTTP 200, Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, Size 30,703 bytes, SheetNames `['Instrucțiuni', 'Firmă și angajați', 'Context posturi']`. Parsed cleanly with `parseClientWorkbook()` (3 employees, 3/3 valid, 0 errors).
- `?type=malicious`: HTTP 400 with `{ error: 'Parametru type invalid. Valori permise: empty, sample.' }`.

### Observation 4: Existing Acceptance Suites Execution
- `npx tsx scripts/test-export-import-roundtrip.ts`: Exited with code 0.
- `npx tsx scripts/verify-excel-import-export.ts`: Exited with code 0 (6/6 tests passed).

### Observation 5: Adversarial Edge Cases
- Buffer corupt (random garbage bytes): `parseClientWorkbook` throws controlled Error without process crash.
- Missing sheet `Firmă și angajați`: Returns Romanian error `Foaia "Firmă și angajați" lipsește din registrul Excel.`
- Calendar invalidity: `31.02.2024`, `29.02.2023`, `31.04.2024`, `00.00.0000` are strictly rejected (return `undefined`).
- Shuffled columns: Correctly maps headers dynamically even when column order is completely permuted.

---

## 2. Logic Chain

1. **Step 1 (Why `Asia/Tokyo` drifts - Obs 1)**:
   In `src/lib/importer.ts`, line 306 specifies `XLSX.read(buffer, { type: 'buffer', cellDates: true })`.
   When `cellDates: true` is enabled, the `xlsx` library parses any numeric Excel date code (e.g. `45351` for 2024-02-29) into a JavaScript `Date` instance using the environment's local timezone: `new Date(year, month, day, 0, 0, 0)`.
   In `Asia/Tokyo` (UTC+9), local midnight is `15:00:00 UTC` of the *previous* calendar day (`2024-02-28T15:00:00.000Z`).

2. **Step 2 (The flawed cushion - Obs 1)**:
   In `src/lib/importer.ts`, line 140 applies a hardcoded `+ 4 * 3600 * 1000` (+4 hour) cushion.
   This was calibrated for `Europe/Bucharest` (UTC+2 in winter, UTC+3 in summer), where local midnight is `22:00:00 UTC` or `21:00:00 UTC` on the previous day. Adding +4 hours in Bucharest rolls the UTC timestamp forward to `02:00:00 UTC` or `01:00:00 UTC` of the *current* day, allowing `rounded.getUTCDate()` to match the intended day.
   However, for any timezone with a positive offset greater than +4 hours (such as `Asia/Tokyo` UTC+9, `Asia/Kolkata` UTC+5:30, `Asia/Shanghai` UTC+8, `Australia/Sydney` UTC+10):
   `15:00:00 UTC + 4h = 19:00:00 UTC` on the *previous* day.
   `rounded.getUTCDate()` evaluates to `28` instead of `29`, introducing an automatic -1 day drift.

3. **Step 3 (Why round-trip export passed despite the bug - Obs 1 & 2)**:
   `src/lib/exporter.ts` writes date cells as formatted text strings (via `formatDmy`: `{ t: 's', v: '29.02.2024' }`) rather than native Excel date serial numbers.
   When `parseClientWorkbook` parses text strings, it bypasses the `val instanceof Date` branch and enters the string regex branch (`/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/`), which constructs `new Date(Date.UTC(y, m - 1, d))` and is 100% timezone-invariant.
   Consequently, round-trip files generated by `exportClientToExcel` never hit line 140. However, *any client or employee uploading an Excel workbook formatted with standard Excel date cells from an environment with UTC offset > +4* will experience data corruption via silent 1-day date regressions.

4. **Step 4 (Remediation)**:
   There are two clean ways to fix line 140:
   - **Option A (Noon cushion)**: Use a 12-hour cushion instead of 4 hours:
     `const rounded = new Date(val.getTime() + 12 * 3600 * 1000);`
     Since no standard timezone is shifted by more than 12 hours from midnight, adding 12 hours moves all local midnights (between -12h and +12h) to noon UTC on the intended calendar day.
   - **Option B (Disable cellDates in XLSX.read)**: Remove `cellDates: true` from `XLSX.read(buffer, { type: 'buffer' })` in `importer.ts` line 306. Excel date serials will remain as numbers (e.g. `45351`), which `parseExcelDate(number)` already handles via `XLSX.SSF.parse_date_code(val)` with 100% mathematical timezone invariance (as proven by `[parseExcelDate(number)] Serial 45351: parsed=2024-02-29T00:00:00.000Z` passing in Obs 1).

---

## 3. Caveats

1. **Review-only role constraint**: Under Teamwork Key Constraints, the challenger agent is forbidden from modifying application source code (`src/lib/importer.ts`). The defect was identified, documented, and reproduced empirically; the fix must be committed by the implementing agent.
2. **Standard Template pack formatting**: The official templates (`outputs/ssm-client-template/Model_date_client_SSM.xlsx` and `Test_Client_3_Angajati.xlsx`) use text strings (`t: 's'`) for dates. The bug exclusively manifests when user-edited or third-party generated XLSX files format date columns using native Excel date formatting (`t: 'd'` or `t: 'n'` with date number format).

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

While the round-trip database fidelity (100% UNCHANGED), template download endpoints, dirty data resilience, expat passport parsing, and string date parsing are fully robust and compliant, Milestone 3 requirement 1 for complete timezone invariance is violated under `TZ=Asia/Tokyo` due to the hardcoded `+4h` cushion in `src/lib/importer.ts:140`.

Required changes:
1. Fix `src/lib/importer.ts` line 140 to use a 12-hour cushion (`+ 12 * 3600 * 1000`) or disable `cellDates: true` in `parseClientWorkbook` so native Excel date numbers are decoded via `XLSX.SSF.parse_date_code`.
2. Verify that `npx tsx scripts/adversarial-excel-roundtrip-timezone.ts` completes with 13/13 PASS and exit code 0.

---

## 5. Verification Method

To independently verify this defect and resolution:

1. **Directly reproduce the defect in `Asia/Tokyo`**:
   ```bash
   TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz
   ```
   *Expected result before fix*: Exits with code 2, failing on `Serial 45351 (29 Feb 2024) -> parsed=2024-02-28T00:00:00.000Z`.

2. **Run full adversarial test suite across all 4 timezones**:
   ```bash
   npx tsx scripts/adversarial-excel-roundtrip-timezone.ts
   ```
   *Expected result after fix*: 13/13 tests pass with `EMBEDDED VERDICT: APPROVE` and exit code 0.

3. **Run existing test suites**:
   ```bash
   npx tsx scripts/test-export-import-roundtrip.ts
   npx tsx scripts/verify-excel-import-export.ts
   ```
   *Expected result*: Both exit with code 0.
