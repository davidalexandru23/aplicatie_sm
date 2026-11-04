# Forensic Audit Report — Milestone 3 Iteration 2

**Work Product**: `src/lib/importer.ts`, `src/app/api/imports/commit/route.ts`  
**Profile**: General Project  
**Integrity Mode**: development (ground-truth per `ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN**

---

## 1. Observation

### Static Analysis Observations

1. **Date Deserialization & Timezone Neutrality (`parseExcelDate` & `cellDates` removal)**:
   - File: `src/lib/importer.ts`, lines 134–199, 316.
   - Buffer reading:
     ```ts
     const wb = XLSX.read(buffer, { type: 'buffer' });
     ```
     `cellDates: true` is intentionally absent. This prevents SheetJS from creating local-timezone-biased JavaScript `Date` instances from Excel numeric date serials.
   - For `val instanceof Date` (and string fallback dates):
     ```ts
     if (val instanceof Date) {
       if (isNaN(val.getTime())) return undefined;
       const rounded = new Date(val.getTime() + 12 * 3600 * 1000);
       return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
     }
     ```
     The +12-hour offset cushion centers midnight timestamps from any timezone in the range $[-11\text{h}, +11\text{h}]$ into the middle of the calendar day, ensuring `getUTCFullYear()`, `getUTCMonth()`, and `getUTCDate()` reflect the civil date without off-by-one errors.
   - For `typeof val === 'number'` and numeric serial strings:
     ```ts
     const parsed = XLSX.SSF.parse_date_code(val);
     if (parsed && parsed.y && parsed.m && parsed.d) {
       return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
     }
     ```
     Pure mathematical decomposition via SSF into UTC year/month/day.
   - European and ISO regex parsing validates date boundaries using:
     ```ts
     const dt = new Date(Date.UTC(y, m - 1, d));
     if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
       return dt;
     }
     return undefined;
     ```
     Calendar anomalies (e.g. `31.02.2024`, `29.02.2023`, `31.04.2024`) correctly evaluate to `undefined`.
   - No hardcoded dates or test mocks exist in `parseExcelDate`.

2. **Phantom Entity Elimination & Relational Database Hygiene**:
   - File: `src/lib/importer.ts`, lines 791–804, 830–841, 847–849.
   - Code:
     ```ts
     // Din lista de angajați (doar rândurile valide nu generează puncte de lucru fantomă)
     for (const emp of parsedData.employees) {
       if (!emp.isValid) continue;
       if (emp.worksiteName && !worksiteMap.has(emp.worksiteName.toLowerCase())) { ... }
     }
     for (const emp of parsedData.employees) {
       if (!emp.isValid) continue;
       if (emp.jobTitle && !jobMap.has(emp.jobTitle.toLowerCase())) { ... }
     }
     for (const emp of parsedData.employees) {
       if (!emp.isValid) continue; // Rândurile invalide nu se importă
       ...
     }
     ```
   - File: `src/app/api/imports/commit/route.ts`, lines 54–60:
     ```ts
     if (parsedData.employees.length > 0 && parsedData.employees.every((e) => !e.isValid)) {
       return NextResponse.json(
         { error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.' },
         { status: 400 }
       );
     }
     ```
   - This prevents invalid or corrupted employee rows from injecting phantom worksites or jobs into the database, while allowing valid rows in mixed workbooks to persist safely.

3. **Dotted CNP & Flexible Header Matching**:
   - File: `src/lib/importer.ts`, lines 261–275, 341–352:
     ```ts
     cnp: [
       'cnp',
       'cod numeric personal',
       'c.n.p.',
       'c.n.p',
       'cnp/pasaport',
       'cnp / pasaport',
       'c.n.p. / pasaport',
       'c.n.p./pasaport',
       'identificator',
     ],
     ```
     `checkRowHasHeaders`:
     ```ts
     if (norm.includes('cnp') || norm.includes('c.n.p') || norm.includes('identificator')) hasCnp = true;
     ```
   - Normalization removes asterisks, parentheses, and diacritics while preserving dots (`normalizeHeader('  C.N.P. / Pașaport *  ') === 'c.n.p. / pasaport'`).
   - Token mapping handles permutations dynamically without hardcoded column indices.

4. **Absence of Test Mocks, Hardcoded Fixtures, or Cheating**:
   - Grep searches for `mock`, test CUIs, or specific test CNPs yielded 0 occurrences in `src/lib/importer.ts` and `src/app/api/imports/commit/route.ts`.
   - No pre-populated result artifacts or fake test outputs exist.

---

### Runtime Execution Observations

1. **`TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz`**:
   - Output:
     - Test A (String dates): 6/6 passed (Leap years 29.02.2024, 29.02.2020; Month boundaries 01.03.2024, 28.02.2023, 31.12.2023, 01.01.2024).
     - Test B (Native Excel serials): 6/6 passed (Serials 45351, 45352, 45291 parsed identically to UTC midnight via both `parseExcelDate(number)` and `XLSX cellDates:true` with cell.v offset).
     - Test C (Round-trip DB export/import): Passed for existing DB clients (`BISTRO GOURMET S.R.L.`: total=2, unchanged=2, mod=0, err=0).
     - Test D (Template download integrity): 2/2 passed (status=200, size >28KB, valid sheets).
   - Exit code: 0.

2. **Master Timezone Suite across 4 Timezones (`UTC`, `America/New_York`, `Europe/Bucharest`, `Asia/Tokyo`)**:
   - Command: `npx tsx scripts/adversarial-excel-roundtrip-timezone.ts`
   - Output: 13/13 passed.
   - EMBEDDED VERDICT: APPROVE. Exit code: 0.

3. **Adversarial Dirty Stress Harness**:
   - Command: `npx tsx scripts/adversarial-excel-dirty-stress.ts`
   - Results:
     - Scenario 1 (Column shift resilience & custom column insertion): PASSED (12.0ms)
     - Scenario 2 (Intra-file duplicate CNP attribution & line-number reporting): PASSED (3.6ms)
     - Scenario 3 (Expat passport edge cases, <3 chars vs >=3 chars, Romanian vs Foreign): PASSED (3.6ms)
     - Scenario 4 (Safe partial commit & atomic rollback, 2 valid, 2 invalid): PASSED (108.2ms)
     - Scenario 5 (All-invalid workbook handling, preview blocking & phantom prevention): PASSED (15.2ms)
     - Scenario 6 (Date parsing boundaries, leap years & status PLECAT invariants): PASSED (2.6ms)
     - Scenario 7 (Header token punctuation probe, C.N.P. vs CNP matching): PASSED (2.6ms)
   - Exit code: 0 (7/7 passed).

4. **Acceptance Verification Suite (`scripts/verify-all.ts`)**:
   - Command: `npx tsx scripts/verify-all.ts`
   - Results:
     - Suite 1: Document Auto-Completion (25/25 templates generated cleanly, 2.3s)
     - Suite 2: Compliance Deadlines & Expiry (45/45 tests passed, 0.6s)
     - Suite 3: Comprehensive E2E Suite Tiers 1–4 (53/53 passed, 2.7s)
     - Suite 4: Production Application Build (Clean Next.js build, 2.9s)
   - Total: 124/124 passed (100% pass rate). Exit code: 0.

5. **Standalone Next.js Production Build**:
   - Command: `npm run build`
   - Output: Compiled cleanly via Turbopack in 437ms, TypeScript typecheck finished in 1204ms, static/dynamic routes generated without warnings or errors. Exit code: 0.

---

## 2. Logic Chain

1. **Integrity Mode Assessment**:
   `ORIGINAL_REQUEST.md` specifies `Integrity mode: development`. Under this standard (and even under demo/benchmark criteria), hardcoded test outputs, facade/dummy stubs, and fabricated logs are strictly prohibited.
2. **Authenticity of Implementation**:
   - The +12h date cushion and removal of `cellDates` were evaluated against the risk of mocking. The code performs uniform mathematical offset shifting and SSF integer arithmetic rather than matching test fixture strings.
   - The phantom entity checks (`if (!emp.isValid) continue;`) verify genuine data sanitization before invoking Prisma create mutations, avoiding orphaned entities.
   - Dynamic header parsing inspects normalized column tokens against a dictionary of valid Romanian terms, accommodating whitespace, punctuation, and ordering permutations.
3. **Empirical Verification**:
   - Timezone invariance was confirmed across 4 real timezones including extreme offsets (Tokyo UTC+9, New York UTC-5), demonstrating that date handling is authentic and does not rely on local server time.
   - All stress test scenarios executed live database queries and transactions, confirming that commit and rollback behaviors function accurately in PostgreSQL via Prisma.
   - All 124 project acceptance checks and the production build passed without exception.

---

## 3. Caveats

- Database tests run against the local configured PostgreSQL database instance specified in `.env`.
- Concurrent multi-user imports on the same company at the exact millisecond were not tested (outside the single-tenant operational requirements).

---

## 4. Conclusion

**Verdict: CLEAN**

The implementation in `src/lib/importer.ts` and `src/app/api/imports/commit/route.ts` is authentic, mathematically sound, free of hardcoded shortcuts, and fully compliant with project integrity standards.

---

## 5. Verification Method

To independently verify this verdict, run:

```bash
# 1. Verify timezone-neutral date parsing in Asia/Tokyo
TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz

# 2. Verify all 4 timezones
npx tsx scripts/adversarial-excel-roundtrip-timezone.ts

# 3. Verify adversarial dirty stress scenarios
npx tsx scripts/adversarial-excel-dirty-stress.ts

# 4. Verify full project acceptance suite (124/124 checks)
npx tsx scripts/verify-all.ts

# 5. Verify production build
npm run build
```
