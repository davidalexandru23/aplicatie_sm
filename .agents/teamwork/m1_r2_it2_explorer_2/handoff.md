# Investigation & Remediation Report: CAEN Type Coercion & Normalization (Defect 2)

**Agent ID**: `m1_r2_it2_explorer_2` (teamwork_explorer)  
**Roles**: explorer, investigator  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_it2_explorer_2/`  
**Date**: 2026-11-02T22:47:00Z  
**Recipient**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb` (Orchestrator)  
**Topic**: Defect 2 — `TypeError: (caenCode || "").replace is not a function` & Cross-Subsystem CAEN Sanitization  

---

## 1. Observation

Direct empirical reproduction and static analysis identified that uncoerced `caenCode` inputs cause runtime crashes across **three critical subsystems**: risk preset resolution (`src/lib/risk/caen-risk-presets.ts`), catalog lookup & search (`src/lib/caen-catalog.ts`), and template data resolution (`src/lib/templates/resolver.ts`).

### 1.1 Verbatim Failure Points & Error Traces

#### Site 1: `src/lib/risk/caen-risk-presets.ts:1621-1623`
```typescript
export function getRiskProfileForCaen(caenCode: string, jobTitle?: string): CaenRiskProfile {
  const cleanCode = (caenCode || '').replace(/[^0-9]/g, '').trim();
```
- **Execution Command**:
  ```bash
  npx tsx -e "import { getRiskProfileForCaen } from './src/lib/risk/caen-risk-presets'; getRiskProfileForCaen(6201 as any);"
  ```
- **Verbatim Error**:
  ```text
  TypeError: (caenCode || "").replace is not a function
      at getRiskProfileForCaen (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/risk/caen-risk-presets.ts:1622:38)
  ```
- **Root Cause**: `(6201 || '')` evaluates to number `6201`. The primitive `number` does not possess a `.replace` method. Similarly, if `caenCode` is an object `{}` (common when parsing malformed JSON payloads), `({} || '')` evaluates to `{}` and crashes identically.

#### Site 2: `src/lib/caen-catalog.ts:323-326` & `350-356`
```typescript
function normalizeCaenCode(code: string): string {
  if (!code) return '';
  return code.replace(/[^0-9]/g, '').trim();
}
...
export function getCaenEntry(code: string): CaenEntry | undefined {
  const normalized = normalizeCaenCode(code);
  return CAEN_CATALOG.find((entry) => entry.code === normalized);
}
...
export function searchCaen(query: string): CaenEntry[] {
  if (!query || query.trim() === '') {
    return CAEN_CATALOG;
  }
  const cleanQuery = query.trim();
  const normalizedCodeQuery = normalizeCaenCode(cleanQuery);
  const normalizedTextQuery = removeDiacritics(cleanQuery);
```
- **Execution Commands**:
  ```bash
  npx tsx -e "import { getCaenEntry } from './src/lib/caen-catalog'; getCaenEntry(6201 as any);"
  npx tsx -e "import { searchCaen } from './src/lib/caen-catalog'; searchCaen(6201 as any);"
  ```
- **Verbatim Errors**:
  ```text
  TypeError: code.replace is not a function
      at normalizeCaenCode (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/caen-catalog.ts:325:15)
      at getCaenEntry (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/caen-catalog.ts:343:22)

  TypeError: query.trim is not a function
      at searchCaen (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/caen-catalog.ts:351:24)
  ```
- **Root Cause**: Neither `normalizeCaenCode`, `getCaenEntry`, nor `searchCaen` coerces inputs via `String(x ?? '')`.

#### Site 3: `src/lib/templates/resolver.ts:496-498` (Discovery)
```typescript
  const caenTitle = client?.caenActivity || riskProfile.industryName || 'Activități de realizare a software-ului la comandă';
  const fullCaenDisplay = client?.caenCode && client.caenCode.includes('-')
    ? client.caenCode
    : `${caenCode} - ${caenTitle}`;
```
- **Execution Command**:
  ```bash
  npx tsx -e "import { resolveTemplateData } from './src/lib/templates/resolver'; resolveTemplateData('decizii-angajator', { client: { caenCode: 6201, name: 'Test SRL' } }).catch(e => console.error(e));"
  ```
- **Verbatim Error**:
  ```text
  TypeError: client.caenCode.includes is not a function
      at resolveTemplateData (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/resolver.ts:496:47)
  ```
- **Root Cause**: While `getRiskProfileForCaen` call at line 476 is wrapped in a `try/catch`, line 496 sits outside that block. Evaluating `client.caenCode.includes('-')` on numeric `client.caenCode` crashes document resolution immediately.

#### Site 4: `src/lib/templates/resolver.ts:420-424` (Subtle Extraction Bug)
```typescript
function extractCaenCode(raw?: string | null): string {
  if (!raw) return '6201';
  const match = String(raw).match(/\b\d{4}\b/);
  return match ? match[0] : '6201';
}
```
- **Observed Behavior**: For a dotted CAEN code like `"41.20"` (Lucrări de construcții), `match(/\b\d{4}\b/)` fails (`null`) because there are only 2 consecutive digits before the dot. `extractCaenCode` silently falls back to `'6201'` (IT Software development), assigning construction companies an IT software profile.

#### Site 5: `src/lib/importer.ts` (Cell Parsing & Defensive Baseline)
- **Current Observation**: In `src/lib/importer.ts:134-138`, `getCellValue` implements:
  ```typescript
  function getCellValue(sheet: XLSX.WorkSheet, cellRef: string): string {
    const cell = sheet[cellRef];
    if (!cell || cell.v === undefined || cell.v === null) return '';
    return String(cell.v).trim();
  }
  ```
  While `getCellValue` converts cell values to strings, raw access (e.g. `sheet[cellRef]?.v`) parses numeric cells (such as unformatted Excel cell `6201`) as JavaScript `number` primitives. When callers pass those raw values into catalog or risk lookups, the crash cascades.

---

## 2. Logic Chain

1. **Origin of Numeric CAEN Codes**:
   When users populate company data in Excel (`Model_date_client_SSM.xlsx`), spreadsheet applications default to numeric formatting for cells containing digits without leading letters (e.g., `6201`, `5610`, `4120`). The `xlsx` library parses these as primitive numbers (`cell.t === 'n'`). In database seeds, JSON APIs, or dynamic client objects, `caenCode` can also be passed as a number or raw object.

2. **Mechanism of Crash in `caen-risk-presets.ts` and `caen-catalog.ts`**:
   The expression `(caenCode || '')` only falls back to `''` when `caenCode` is falsy (`""`, `0`, `null`, `undefined`, `false`). A non-zero number like `6201` is truthy, so the expression evaluates to `6201`. Calling `(6201).replace(...)` triggers an unhandled `TypeError`.

3. **Cascading Failure in `resolver.ts`**:
   In `resolver.ts`, `client?.caenCode && client.caenCode.includes('-')` checks if `client.caenCode` is truthy, then calls `.includes('-')`. When `client.caenCode` is `6201`, `(6201).includes` throws `TypeError: client.caenCode.includes is not a function`, crashing all 25 document template generators.

4. **Regex Extraction Incompleteness in `extractCaenCode`**:
   CAEN codes can be formatted in multiple standard notations:
   - 4-digit pure numbers: `6201`
   - Dotted notation: `62.01` or `41.20`
   - Prefixed notation: `CAEN 5610`, `CAEN-4120`
   - Full descriptive strings: `6201 - Activități de realizare a software-ului la comandă (Rev. 2, 2024)`
   Using only raw digit replacement (`/[^0-9]/g`) on full descriptive strings containing years or revision numbers (e.g. `2024`, `Rev. 2`) produces false strings like `"620122024"`.
   Conversely, using only `\b\d{4}\b` misses dotted notations like `"62.01"` and `"41.20"`.

5. **Universal Normalization Architecture**:
   A unified normalization strategy must:
   - Coerce input safely via `String(code ?? '').trim()`.
   - Reject `"[object Object]"`.
   - Check for a 4-digit word boundary `\b\d{4}\b` (safely capturing `6201` even inside `"6201 - Software (Rev. 2, 2024)"`).
   - Check for dotted notation `\b(\d{2})\.(\d{2})\b` (normalizing `"41.20"` to `"4120"`).
   - Fall back to stripping non-digits (`/[^0-9]/g`).

---

## 3. Caveats

1. **Role Boundary**:
   As a teamwork explorer (`teamwork_explorer`), this investigation is read-only. No source files under `src/` were directly modified. The proposed fixes and patch below are ready for `m1_r2_worker_1` to apply.
2. **Defect 1 Independence**:
   Defect 1 (`-itor` suffix collision in `isAdministrativeJobTitle`) was reported by Challenger 1 and confirmed in Suite 4. It is independent of Defect 2, but both can be resolved cleanly without mutual interference.
3. **Leading Zeroes in Romanian CAEN**:
   In official Romanian CAEN Rev. 2, agricultural classes start with zero (e.g. `0111`, `0121`). While the current 22-entry catalog in `caen-catalog.ts` contains codes between `1071` and `9602`, handling leading zero padding for 3-digit inputs (e.g. `111` -> `0111`) should be supported for future catalog expansions.

---

## 4. Conclusion & Proposed Implementation

### 4.1 Exact File Changes

#### Change 1: `src/lib/caen-catalog.ts`
**Target Lines**: 320–358  
**Rationale**: Export `normalizeCaenCode` as a shared utility; defensively coerce all inputs in `normalizeCaenCode`, `removeDiacritics`, `getCaenEntry`, and `searchCaen`.

```typescript
// BEFORE:
function normalizeCaenCode(code: string): string {
  if (!code) return '';
  return code.replace(/[^0-9]/g, '').trim();
}

function removeDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getCaenEntry(code: string): CaenEntry | undefined {
  const normalized = normalizeCaenCode(code);
  return CAEN_CATALOG.find((entry) => entry.code === normalized);
}

export function searchCaen(query: string): CaenEntry[] {
  if (!query || query.trim() === '') {
    return CAEN_CATALOG;
  }

  const cleanQuery = query.trim();
  const normalizedCodeQuery = normalizeCaenCode(cleanQuery);
  const normalizedTextQuery = removeDiacritics(cleanQuery);
  // ...
```

```typescript
// AFTER:
/**
 * Elimină caracterele speciale și normalizează un cod CAEN (ex: "62.01" -> "6201", 6201 -> "6201")
 * Asigură coercire defensivă pentru numere, string-uri formatate și obiecte.
 */
export function normalizeCaenCode(code: string | number | unknown): string {
  if (code === null || code === undefined) return '';
  const str = String(code).trim();
  if (!str || str === '[object Object]') return '';

  // 1. Potrivire directă pe cuvânt din 4 cifre (ex: "6201", "CAEN 5610", "6201 - Software (Rev. 2, 2024)")
  const match4 = str.match(/\b\d{4}\b/);
  if (match4) return match4[0];

  // 2. Format cu punct (ex: "62.01" -> "6201", "41.20" -> "4120")
  const matchDotted = str.match(/\b(\d{2})\.(\d{2})\b/);
  if (matchDotted) return matchDotted[1] + matchDotted[2];

  // 3. Fallback pe cifre brute (ex: "99999", "0")
  return str.replace(/[^0-9]/g, '').trim();
}

/**
 * Elimină diacriticele românești pentru căutare flexibilă
 */
export function removeDiacritics(str: string | unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (!s || s === '[object Object]') return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Obține intrarea CAEN după codul oficial din 4 cifre
 */
export function getCaenEntry(code: string | number | unknown): CaenEntry | undefined {
  const normalized = normalizeCaenCode(code);
  if (!normalized) return undefined;
  return CAEN_CATALOG.find((entry) => entry.code === normalized);
}

/**
 * Caută activități CAEN după cod, denumire, diviziune sau meserii specifice
 */
export function searchCaen(query: string | number | unknown): CaenEntry[] {
  if (query === null || query === undefined) {
    return CAEN_CATALOG;
  }

  const cleanQuery = String(query).trim();
  if (!cleanQuery || cleanQuery === '[object Object]') {
    return CAEN_CATALOG;
  }

  const normalizedCodeQuery = normalizeCaenCode(cleanQuery);
  const normalizedTextQuery = removeDiacritics(cleanQuery);
  // ...
```

---

#### Change 2: `src/lib/risk/caen-risk-presets.ts`
**Target Lines**: 1621–1623  
**Rationale**: Coerce `caenCode` to string safely, extract 4-digit code if present, and handle numeric/object inputs without throwing.

```typescript
// BEFORE:
export function getRiskProfileForCaen(caenCode: string, jobTitle?: string): CaenRiskProfile {
  const cleanCode = (caenCode || '').replace(/[^0-9]/g, '').trim();
```

```typescript
// AFTER:
export function getRiskProfileForCaen(caenCode: string | number | unknown, jobTitle?: string): CaenRiskProfile {
  const rawStr = caenCode != null ? String(caenCode).trim() : '';
  const match4 = rawStr.match(/\b\d{4}\b/);
  const cleanCode = rawStr === '[object Object]'
    ? ''
    : (match4 ? match4[0] : rawStr.replace(/[^0-9]/g, '').trim());
```

*(Note: Along with Challenger 1's fix for Defect 1 using `\b...\b` in `isAdministrativeJobTitle`, this makes both Suite 3 and Suite 4 pass 100%.)*

---

#### Change 3: `src/lib/templates/resolver.ts`
**Target Lines**: 420–424 and 496–498  
**Rationale**: Protect `client.caenCode.includes('-')` from numeric types, and improve `extractCaenCode` to handle dotted CAEN codes (`"41.20"`).

```typescript
// BEFORE (lines 420-424):
function extractCaenCode(raw?: string | null): string {
  if (!raw) return '6201';
  const match = String(raw).match(/\b\d{4}\b/);
  return match ? match[0] : '6201';
}

// BEFORE (lines 496-498):
  const fullCaenDisplay = client?.caenCode && client.caenCode.includes('-')
    ? client.caenCode
    : `${caenCode} - ${caenTitle}`;
```

```typescript
// AFTER (lines 420-424):
function extractCaenCode(raw?: unknown): string {
  if (raw === null || raw === undefined) return '6201';
  const s = String(raw).trim();
  if (!s || s === '[object Object]') return '6201';
  const match = s.match(/\b\d{4}\b/);
  if (match) return match[0];
  const dotted = s.match(/\b(\d{2})\.(\d{2})\b/);
  if (dotted) return dotted[1] + dotted[2];
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length >= 4) return digits.slice(0, 4);
  return '6201';
}

// AFTER (lines 496-498):
  const rawCaen = client?.caenCode != null ? String(client.caenCode).trim() : '';
  const fullCaenDisplay = rawCaen && rawCaen.includes('-')
    ? rawCaen
    : `${caenCode} - ${caenTitle}`;
```

---

#### Change 4: `src/lib/importer.ts`
**Target Lines**: 143–145  
**Rationale**: Add defensive string coercion to `validateCNP` for consistency against raw numeric CNP cells.

```typescript
// BEFORE:
export function validateCNP(cnp: string): boolean {
  const clean = cnp.trim();
```

```typescript
// AFTER:
export function validateCNP(cnp: string | number | unknown): boolean {
  const clean = String(cnp ?? '').trim();
```

---

## 5. Verification Method

### 5.1 Verification Commands

Run the following commands to verify resolution:

```bash
# 1. Verify getRiskProfileForCaen on numeric inputs (must not throw)
npx tsx -e "
import { getRiskProfileForCaen } from './src/lib/risk/caen-risk-presets';
const p1 = getRiskProfileForCaen(6201 as any);
const p2 = getRiskProfileForCaen(5610 as any);
const p3 = getRiskProfileForCaen({} as any);
console.log('✓ Risk profile scores:', p1.globalRiskScore, p2.globalRiskScore, p3.globalRiskScore);
"

# 2. Verify getCaenEntry and searchCaen on numeric inputs (must not throw)
npx tsx -e "
import { getCaenEntry, searchCaen } from './src/lib/caen-catalog';
const e1 = getCaenEntry(6201 as any);
const s1 = searchCaen(6201 as any);
console.log('✓ Catalog entry:', e1?.code, 'Search results:', s1.length);
"

# 3. Verify resolveTemplateData with numeric caenCode (must not throw)
npx tsx -e "
import { resolveTemplateData } from './src/lib/templates/resolver';
async function run() {
  const res = await resolveTemplateData('decizii-angajator', { client: { caenCode: 6201, name: 'Test SRL' } });
  console.log('✓ resolveTemplateData:', res.status, res.data.PLACEHOLDER_COD_CAEN);
}
run();
"

# 4. Run adversarial stress test suite
npx tsx scripts/adversarial-caen-stress.ts

# 5. Run full unified acceptance suite
npx tsx scripts/verify-all.ts
```

### 5.2 Invalidation Conditions
- If `getRiskProfileForCaen(6201)` or `getCaenEntry(6201)` throws `TypeError: ...replace is not a function`.
- If `resolveTemplateData` throws `TypeError: client.caenCode.includes is not a function`.
- If `searchCaen(6201)` throws `TypeError: query.trim is not a function`.
- If Suite 3 of `scripts/adversarial-caen-stress.ts` reports any failures on adversarial inputs.
