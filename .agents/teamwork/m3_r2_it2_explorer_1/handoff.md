# Milestone 3 (Iteration 2 Remediation) Explorer Handoff Report

**Agent**: `m3_r2_it2_explorer_1` (teamwork_explorer)  
**Parent / Caller**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_it2_explorer_1/`  
**Project Root**: `/Users/davidalexandru/Documents/Proiect_SSM`  
**Scope**: Milestone 3 Remediation — Root Cause Analysis & Drop-In Fix Blueprints for Worker  
**Status**: COMPLETE  

---

## 1. Observation

### 1.1 Direct Defect Reproduction: Timezone Date Shift under `TZ=Asia/Tokyo`
Running `TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz` produced:
```
================================================================
  [WORKER PROCESS] Rulare teste specifice fusului orar: Asia/Tokyo
================================================================

--- Test A: Parsare String Dates in Asia/Tokyo ---
  ✓ Bisect 29 Feb 2024: str="29.02.2024" -> parsed=2024-02-29T00:00:00.000Z formatted="29.02.2024" (așteptat=2024-02-29T00:00:00.000Z)
  ...
--- Test B: Parsare Native Excel Serials in Asia/Tokyo ---
  ✓ [parseExcelDate(number)] Serial 45351 (29 Feb 2024): parsed=2024-02-29T00:00:00.000Z (așteptat=2024-02-29T00:00:00.000Z)
  ✗ [XLSX cellDates:true] Serial 45351 (29 Feb 2024): cell.v="2024-02-28T15:00:00.000Z" -> parsed=2024-02-28T00:00:00.000Z (așteptat=2024-02-29T00:00:00.000Z)
  ✓ [parseExcelDate(number)] Serial 45352 (01 Mar 2024): parsed=2024-03-01T00:00:00.000Z (așteptat=2024-03-01T00:00:00.000Z)
  ✗ [XLSX cellDates:true] Serial 45352 (01 Mar 2024): cell.v="2024-02-29T15:00:00.000Z" -> parsed=2024-02-29T00:00:00.000Z (așteptat=2024-03-01T00:00:00.000Z)
  ✓ [parseExcelDate(number)] Serial 45291 (31 Dec 2023): parsed=2023-12-31T00:00:00.000Z (așteptat=2023-12-31T00:00:00.000Z)
  ✗ [XLSX cellDates:true] Serial 45291 (31 Dec 2023): cell.v="2023-12-30T15:00:00.000Z" -> parsed=2023-12-30T00:00:00.000Z (așteptat=2023-12-31T00:00:00.000Z)

[WORKER] Erori detectate în fusul orar Asia/Tokyo!
Process exited with code 2.
```

Code inspection in `src/lib/importer.ts:137-142`:
```typescript
137:   if (val instanceof Date) {
138:     if (isNaN(val.getTime())) return undefined;
139:     // Offset cushion (+4h) pentru a preveni devierea în ziua anterioară din cauza fusului orar
140:     const rounded = new Date(val.getTime() + 4 * 3600 * 1000);
141:     return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
142:   }
```
And line 191–195:
```typescript
191:     const fallback = new Date(trimmed);
192:     if (!isNaN(fallback.getTime())) {
193:       const rounded = new Date(fallback.getTime() + 4 * 3600 * 1000);
194:       return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
195:     }
```
And line 306:
```typescript
306:   const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
```

### 1.2 Direct Observation: Phantom Worksites and Jobs from Invalid Rows
In `src/lib/importer.ts:781-793` and `819-829`:
```typescript
781:     // Din lista de angajați
782:     for (const emp of parsedData.employees) {
783:       if (emp.worksiteName && !worksiteMap.has(emp.worksiteName.toLowerCase())) {
784:         const newW = await tx.worksite.create({
...
819:     for (const emp of parsedData.employees) {
820:       if (emp.jobTitle && !jobMap.has(emp.jobTitle.toLowerCase())) {
821:         const newJ = await tx.job.create({
```
Notice: Neither loop checks `if (!emp.isValid) continue;`.
In `scripts/adversarial-excel-dirty-stress.ts:719-723`:
```
VULNERABILITY/DEFENSE GAP OBSERVED: commitImport created 2 phantom worksites and 2 phantom jobs from invalid employee rows (lines 782 & 820 lack "!emp.isValid" check).
```

### 1.3 Direct Observation: Dotted Header Acronym `"C.N.P."` Matching
In `src/lib/importer.ts:265` and `339`:
```typescript
265:   cnp: ['cnp', 'cod numeric personal', 'cnp/pasaport', 'cnp / pasaport', 'identificator'],
...
339:       if (norm.includes('cnp') || norm.includes('identificator')) hasCnp = true;
```
In `scripts/adversarial-excel-dirty-stress.ts:811-814` and `834-845`:
```typescript
    // Probe normalizeHeader behavior on dots
    const dottedNorm = normalizeHeader('  C.N.P. / Pașaport *  ');
    assertEquals(dottedNorm, 'c.n.p. / pasaport', 'Dots are preserved by normalizeHeader');
```
Because `normalizeHeader` retains dots (`"c.n.p. / pasaport"`), `"c.n.p."` is neither identical to nor starts with any token in `HEADER_TOKEN_MAP.cnp`, and `norm.includes('cnp')` returns `false`. This triggers fallback to canonical columns, misaligning permuted columns on row 12.

---

## 2. Logic Chain

### 2.1 Mechanics of the Timezone Drift (Why `+4h` Failed and Why `+12h` + Disabling `cellDates` is the Optimal Remediation)
1. **SheetJS `cellDates: true` Internal Architecture**:
   When `cellDates: true` is supplied to `XLSX.read`, SheetJS executes `numdate(v)` in `xlsx.js`:
   `out.setTime(v * 24 * 60 * 60 * 1000 + dnthresh)`.
   SheetJS attempts to construct a Date object representing local midnight (`00:00:00`) on the target day in the runtime's local timezone.
2. **UTC Shift across Longitudes**:
   - In `Asia/Tokyo` (`UTC+9`), local midnight of `2024-02-29 00:00:00` corresponds to `2024-02-28 15:00:00 UTC` (-9 hours into the previous calendar day).
   - The hardcoded cushion of `+4h` added 4 hours to UTC: `15:00:00 + 4h = 19:00:00 UTC` on `2024-02-28`.
   - `rounded.getUTCDate()` evaluated to `28` instead of `29`, causing a silent -1 day regression.
   - For all timezones with UTC offset > +4 (e.g. `Asia/Kolkata` +5:30, `Asia/Shanghai` +8, `Asia/Tokyo` +9, `Australia/Sydney` +10), `+4h` always leaves the timestamp on the previous day.
3. **Evaluating Option A (+12h Cushion) vs Option B (Disabling `cellDates: true`)**:
   - **Option A (+12h cushion)**: Adding 12 hours shifts any local midnight between `UTC-11` and `UTC+11` into the correct calendar day in UTC. For example, in Tokyo: `15:00:00 UTC + 12h = 03:00:00 UTC` on `2024-02-29`, producing `2024-02-29T00:00:00.000Z` perfectly.
     *Empirical Limit*: On extreme timezones like `Etc/GMT+12` (UTC-12) or `Pacific/Kiritimati` (UTC+14), a fixed millisecond offset cannot span the 26-hour global day span.
   - **Option B (Disabling `cellDates: true` in `parseClientWorkbook`)**:
     When `XLSX.read(buffer, { type: 'buffer' })` is called without `cellDates: true`, SheetJS leaves date cells as pure Excel serial numbers (e.g. `45351`).
     `parseExcelDate(number)` executes `XLSX.SSF.parse_date_code(val)` (lines 144–150), which is pure integer calendar arithmetic. It returns `{ y: 2024, m: 2, d: 29 }` with **zero dependence on timezones, zero dependence on runtime environment, zero daylight saving issues, and zero historical offset glitches**.
   - **The Optimal Remediation: IMPLEMENT BOTH (Option A + Option B)**:
     - **In `src/lib/importer.ts:306`**: Remove `cellDates: true`. This ensures that all real Excel file uploads decode dates via `parseExcelDate(number)` and `XLSX.SSF.parse_date_code`, guaranteeing 100% mathematical invariance across all 26 world timezones (from UTC-12 to UTC+14).
     - **In `src/lib/importer.ts:140 & 193`**: Change `+ 4 * 3600 * 1000` to `+ 12 * 3600 * 1000`. This ensures that whenever a native `Date` instance is passed (including in `scripts/adversarial-excel-roundtrip-timezone.ts` Test B or programmatic API calls), it converts reliably across all tested timezones (`UTC`, `America/New_York`, `Europe/Bucharest`, `Asia/Tokyo`).

### 2.2 Mechanics of Phantom Worksite / Job Creation
1. In `commitImport()`, worksites and jobs are upserted before employees are inserted.
2. In lines 782 and 820, the loops iterate over `parsedData.employees` without checking `emp.isValid`.
3. If an invalid row (e.g., corrupt CNP or incomplete data) contains a non-existent worksite name (e.g. `"Punct Fantoma 1"`) or job title (e.g. `"Post Fantoma 1"`), those entities are committed to the PostgreSQL database, even though the employee itself is skipped at line 836 (`if (!emp.isValid) continue;`).
4. Adding `if (!emp.isValid) continue;` in both loops guarantees that only valid employees cause new worksites and jobs to be provisioned.
5. In addition, in `src/app/api/imports/commit/route.ts`, a defensive guard should reject import requests where 100% of rows are invalid (`400 Bad Request: Niciun rând valid de importat.`).

### 2.3 Mechanics of Dotted Header Token Matching
1. In `scripts/adversarial-excel-dirty-stress.ts:813`, the test explicitly asserts:
   `assertEquals(dottedNorm, 'c.n.p. / pasaport', 'Dots are preserved by normalizeHeader');`
   Therefore, modifying `normalizeHeader` to strip periods (`.replace(/[.*()]/g, '')`) would directly fail this assertion.
2. In `src/lib/importer.ts:265`, `HEADER_TOKEN_MAP.cnp` lists only undotted tokens: `['cnp', 'cod numeric personal', 'cnp/pasaport', 'cnp / pasaport', 'identificator']`.
3. In `src/lib/importer.ts:339`, `checkRowHasHeaders` checks: `norm.includes('cnp') || norm.includes('identificator')`.
4. By:
   a. Adding `'c.n.p.'`, `'c.n.p'`, `'c.n.p. / pasaport'`, `'c.n.p./pasaport'` to `HEADER_TOKEN_MAP.cnp`, and
   b. Updating line 339 to `if (norm.includes('cnp') || norm.includes('c.n.p') || norm.includes('identificator')) hasCnp = true;`
   `normalizeHeader` continues to preserve dots as asserted by existing tests, while column matching recognizes both dotted (`C.N.P.`) and standard (`CNP`) headers dynamically on row 12.

---

## 3. Caveats

1. **Read-Only Explorer Protocol**: As an explorer agent, no production files in `src/` were directly modified. All proposed changes are presented below as drop-in replacement chunks with line numbers for the implementing Worker.
2. **Standard Templates Format**: Official template packs (`Model_date_client_SSM.xlsx`, `Test_Client_3_Angajati.xlsx`) write date values as text strings (`t: 's'`), which pass through the ISO/DMY string regex branch. The timezone serial defect only manifested when opening/saving files via Excel desktop software that converts text dates into native Excel date numbers or when `cellDates: true` generated native Date objects.
3. **No Database Migration Required**: All proposed remediation changes are purely in application code (`src/lib/importer.ts` and `src/app/api/imports/commit/route.ts`). No Prisma schema alterations or database migrations are necessary.

---

## 4. Conclusion & Drop-In Code Chunks for Worker

### Recommendation Summary:
1. **Apply Both Option A & Option B for Date Invariance**:
   - `src/lib/importer.ts:140`: Change cushion to `+ 12 * 3600 * 1000`.
   - `src/lib/importer.ts:193`: Change fallback cushion to `+ 12 * 3600 * 1000`.
   - `src/lib/importer.ts:306`: Remove `cellDates: true` (`XLSX.read(buffer, { type: 'buffer' })`).
2. **Prevent Phantom Entities from Invalid Rows**:
   - `src/lib/importer.ts:782`: Add `if (!emp.isValid) continue;`.
   - `src/lib/importer.ts:820`: Add `if (!emp.isValid) continue;`.
3. **Recognize Dotted Header Acronyms**:
   - `src/lib/importer.ts:265`: Add `'c.n.p.'`, `'c.n.p'`, `'c.n.p. / pasaport'`, `'c.n.p./pasaport'` to `HEADER_TOKEN_MAP.cnp`.
   - `src/lib/importer.ts:339`: Update `checkRowHasHeaders` to check `norm.includes('c.n.p')`.
4. **Defensive API Guard**:
   - `src/app/api/imports/commit/route.ts:53`: Return HTTP 400 if `parsedData.employees.length > 0 && parsedData.employees.every(e => !e.isValid)`.

---

### Drop-In Chunks for the Worker

#### Chunk 1: `src/lib/importer.ts` (Lines 137–142)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Lines**: 137–142  
```typescript
<<<< BEFORE (lines 137-142)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    // Offset cushion (+4h) pentru a preveni devierea în ziua anterioară din cauza fusului orar
    const rounded = new Date(val.getTime() + 4 * 3600 * 1000);
    return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
  }
====
>>>> AFTER (lines 137-142)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    // Offset cushion (+12h) pentru a aduce miezul nopții din orice fus orar (-11h .. +11h) la amiaza aceleiași zile UTC
    const rounded = new Date(val.getTime() + 12 * 3600 * 1000);
    return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
  }
```

#### Chunk 2: `src/lib/importer.ts` (Lines 191–196)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Lines**: 191–196  
```typescript
<<<< BEFORE (lines 191-196)
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      const rounded = new Date(fallback.getTime() + 4 * 3600 * 1000);
      return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
    }
  }
====
>>>> AFTER (lines 191-196)
    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      const rounded = new Date(fallback.getTime() + 12 * 3600 * 1000);
      return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
    }
  }
```

#### Chunk 3: `src/lib/importer.ts` (Lines 261–266)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Lines**: 261–266  
```typescript
<<<< BEFORE (lines 261-266)
const HEADER_TOKEN_MAP: Record<string, string[]> = {
  lastName: ['nume', 'nume familie', 'nume de familie'],
  firstName: ['prenume', 'prenumele'],
  sex: ['sex', 'sex conform actului', 'gen'],
  cnp: ['cnp', 'cod numeric personal', 'cnp/pasaport', 'cnp / pasaport', 'identificator'],
  birthDate: ['data nasterii', 'data nastere'],
====
>>>> AFTER (lines 261-266)
const HEADER_TOKEN_MAP: Record<string, string[]> = {
  lastName: ['nume', 'nume familie', 'nume de familie'],
  firstName: ['prenume', 'prenumele'],
  sex: ['sex', 'sex conform actului', 'gen'],
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
  birthDate: ['data nasterii', 'data nastere'],
```

#### Chunk 4: `src/lib/importer.ts` (Line 306)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Line**: 306  
```typescript
<<<< BEFORE (line 306)
export function parseClientWorkbook(buffer: Buffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
====
>>>> AFTER (line 306)
export function parseClientWorkbook(buffer: Buffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: 'buffer' });
```

#### Chunk 5: `src/lib/importer.ts` (Lines 337–342)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Lines**: 337–342  
```typescript
<<<< BEFORE (lines 337-342)
      const norm = normalizeHeader(raw);
      if (norm.includes('nume')) hasName = true;
      if (norm.includes('cnp') || norm.includes('identificator')) hasCnp = true;
    }
====
>>>> AFTER (lines 337-342)
      const norm = normalizeHeader(raw);
      if (norm.includes('nume')) hasName = true;
      if (norm.includes('cnp') || norm.includes('c.n.p') || norm.includes('identificator')) hasCnp = true;
    }
```

#### Chunk 6: `src/lib/importer.ts` (Lines 781–786)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Lines**: 781–786  
```typescript
<<<< BEFORE (lines 781-786)
    // Din lista de angajați
    for (const emp of parsedData.employees) {
      if (emp.worksiteName && !worksiteMap.has(emp.worksiteName.toLowerCase())) {
        const newW = await tx.worksite.create({
====
>>>> AFTER (lines 781-786)
    // Din lista de angajați (doar rândurile valide nu generează puncte de lucru fantomă)
    for (const emp of parsedData.employees) {
      if (!emp.isValid) continue;
      if (emp.worksiteName && !worksiteMap.has(emp.worksiteName.toLowerCase())) {
        const newW = await tx.worksite.create({
```

#### Chunk 7: `src/lib/importer.ts` (Lines 819–824)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/importer.ts`  
**Lines**: 819–824  
```typescript
<<<< BEFORE (lines 819-824)
    for (const emp of parsedData.employees) {
      if (emp.jobTitle && !jobMap.has(emp.jobTitle.toLowerCase())) {
        const newJ = await tx.job.create({
====
>>>> AFTER (lines 819-824)
    for (const emp of parsedData.employees) {
      if (!emp.isValid) continue;
      if (emp.jobTitle && !jobMap.has(emp.jobTitle.toLowerCase())) {
        const newJ = await tx.job.create({
```

#### Chunk 8: `src/app/api/imports/commit/route.ts` (Lines 51–56)
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/src/app/api/imports/commit/route.ts`  
**Lines**: 51–56  
```typescript
<<<< BEFORE (lines 51-56)
      clientId = newClient.id;
    }

    const batchId = await commitImport(
      clientId,
====
>>>> AFTER (lines 51-58)
      clientId = newClient.id;
    }

    // Defensive check: nu permitem commit dacă fișierul nu are niciun rând valid
    if (parsedData.employees.length > 0 && parsedData.employees.every((e) => !e.isValid)) {
      return NextResponse.json(
        { error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.' },
        { status: 400 }
      );
    }

    const batchId = await commitImport(
      clientId,
```

---

## 5. Verification Method

Once the Worker applies the chunks above, verify with the following commands:

1. **Verify Timezone Invariance across All 4 Target Timezones**:
   ```bash
   npx tsx scripts/adversarial-excel-roundtrip-timezone.ts
   ```
   *Expected Outcome*: 13/13 tests pass with `EMBEDDED VERDICT: APPROVE` and exit code 0.

2. **Verify Subprocess Worker under `TZ=Asia/Tokyo` directly**:
   ```bash
   TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz
   ```
   *Expected Outcome*: Exits with code 0; all leap year serials (45351, 45352, 45291) output `✓ [PASS]`.

3. **Verify Dirty Stress Harness**:
   ```bash
   npx tsx scripts/adversarial-excel-dirty-stress.ts
   ```
   *Expected Outcome*: 7/7 scenarios pass with code 0.
   - Scenario 5 confirms: `No phantom worksites or jobs created from invalid rows.`
   - Scenario 7 confirms: `Header token "C.N.P." matched successfully.`

4. **Verify Round-Trip & Export Acceptance Tests**:
   ```bash
   npx tsx scripts/test-export-import-roundtrip.ts
   npx tsx scripts/verify-excel-import-export.ts
   npx tsx scripts/reviewer-m3-adversarial-stress.ts
   ```
   *Expected Outcome*: All exit with code 0.

5. **Verify Clean Production Compilation**:
   ```bash
   npm run build
   ```
   *Expected Outcome*: Next.js build succeeds with Turbopack and TypeScript, exit code 0.
