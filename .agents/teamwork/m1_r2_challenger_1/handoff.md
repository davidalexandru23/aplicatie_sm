# Adversarial Stress Testing Report — CAEN Risk Profiles & Template Resolution

**Agent ID**: `m1_r2_challenger_1` (teamwork_challenger)  
**Roles**: critic, specialist  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_challenger_1/`  
**Date**: 2026-11-02T20:39:30Z  
**Recipient**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb` (Orchestrator)  
**Verdict**: **REQUEST_CHANGES** ❌  

---

## 1. Observation

An independent, rigorous TypeScript test harness (`scripts/adversarial-caen-stress.ts`) was authored and executed directly against the codebase. The suite executed **2,990 automated assertions** across 7 distinct test suites covering the entire CAEN Rev. 2 catalog, mathematical invariants, boundary conditions, linguistic edge cases, and multi-scenario document generation.

Command executed:
```bash
npx tsx scripts/adversarial-caen-stress.ts
```

### Empirical Test Execution Summary
| Suite # | Suite Description | Assertions Run | Assertions Passed | Assertions Failed | Suite Status |
|---|---|---|---|---|---|
| Suite 1 | CAEN Catalog Exhaustive Audit (All 22 entries) | 2,751 | 2,751 | 0 | **PASS** |
| Suite 2 | Dedicated Presets Detailed Audit (7 profiles) | 49 | 49 | 0 | **PASS** |
| Suite 3 | Adversarial Edge Cases (Unknown & Malformed CAEN) | 72 | 57 | 15 | **FAIL** ❌ |
| Suite 4 | Job Title Risk Adaptation (Admin vs Operational) | 43 | 39 | 4 | **FAIL** ❌ |
| Suite 5 | Template Resolution Matrix (3 sabloane x 4 CAEN scenarios) | 60 | 60 | 0 | **PASS** |
| Suite 6 | Semantic Disambiguation (CAEN 5610 Restaurant vs 6201 IT) | 9 | 9 | 0 | **PASS** |
| Suite 7 | Physical DOCX Buffer Rendering & Zero Token Leak | 6 | 6 | 0 | **PASS** |
| **Total** | **All 7 Adversarial Suites** | **2,990** | **2,971** | **19** | **REQUEST_CHANGES** |

---

### Detailed Defect Observations

#### Defect 1: Romanian Agent Suffix (`-itor`) Substring Collision in `isAdministrativeJobTitle`
- **File**: `src/lib/risk/caen-risk-presets.ts:1590-1613`
- **Code**:
  ```typescript
  function isAdministrativeJobTitle(title?: string): boolean {
    if (!title) return false;
    const clean = title.toLowerCase();
    const administrativeKeywords = [
      'director', 'administrator', 'manager', 'sef birou', 'contabil',
      'economist', 'secretar', 'asistent manager', 'functionar', 'tesa',
      'resurse umane', 'hr', 'jurist', 'consilier juridic', 'programator',
      'it', 'software',
    ];
    return administrativeKeywords.some((kw) => clean.includes(kw));
  }
  ```
- **Observed Behavior**:
  Because `clean.includes(kw)` performs a raw substring match with 2-letter tokens `'it'` and `'hr'`, ANY Romanian word containing the letter sequence `"it"` triggers `isAdministrativeJobTitle(title) === true`.
  In Romanian grammar, the productive agent noun suffix is `-itor` (masculine singular), `-itori` (plural), as well as words with `-itar` / `-itate`.
  Consequently, core operational, high-risk job titles are falsely classified as administrative/office TESA roles:
  1. `Muncitor necalificat în construcții` -> matched `'it'` inside `munc-IT-or`
  2. `Zidar tencuitor` -> matched `'it'` inside `tencu-IT-or`
  3. `Instalator sanitar` -> matched `'it'` inside `san-IT-ar`
  4. `Vopsitor industrial` -> matched `'it'` inside `vops-IT-or`
  5. `Manipulant mărfuri / depozitar` -> matched `'it'` inside `depoz-IT-ar`
  6. `Îngrijitor clădiri` -> matched `'it'` inside `îngrij-IT-or`
  7. `Paznic / agent de securitate` -> matched `'it'` inside `secur-IT-ate`
  8. `Șofer autocamion / distribuitor marfă` -> matched `'it'` inside `distribu-IT-or`

- **Impact on Risk Evaluation**:
  When a construction company (CAEN 4120, statutory score $N_{rg} = 3.36$) evaluates a bricklayer (`Zidar tencuitor`) or laborer (`Muncitor necalificat în construcții`), `getRiskProfileForCaen('4120', 'Zidar tencuitor')` intercepts the call at line 1625:
  ```typescript
  if (jobTitle && isAdministrativeJobTitle(jobTitle) && cleanCode !== '6201') {
    return {
      ...RISK_PROFILE_7022,
      caenCode: cleanCode || '7022',
      jobTitle: jobTitle,
    };
  }
  ```
  The worker is assigned the **Business Consulting / Office TESA profile (`RISK_PROFILE_7022`)**, which has an artificially low risk score of **$N_{rg} = 2.60$** instead of **$3.36$**, and receives office laptop/desk hazards:
  * Assigned: *"Deplasare pe scări și pardoseli netede în clădirile de birouri"*, *"Nerespectarea posturii corecte la lucrul prelungit pe laptop în deplasare"*, *"Efort static prelungit în poziție așezat la birou"*.
  * Omitted: *"Lucru sau deplasare la înălțime fără centură de siguranță ham ancorată"*, *"Prăbușirea pereților de pământ la săpături de fundații și șanțuri"*, *"Pătrunderea în raza de manevră a utilajelor grele sau sub sarcina macaralei"*.
  This constitutes a severe occupational safety compliance breach under Legea 319/2006 art. 12 and HG 1425/2006 art. 15.

---

#### Defect 2: Type Coercion Crash on Numeric CAEN Code Inputs
- **File**: `src/lib/risk/caen-risk-presets.ts:1622` and `src/lib/caen-catalog.ts:325`
- **Code**:
  ```typescript
  // src/lib/risk/caen-risk-presets.ts:1622
  const cleanCode = (caenCode || '').replace(/[^0-9]/g, '').trim();

  // src/lib/caen-catalog.ts:325
  function normalizeCaenCode(code: string): string {
    if (!code) return '';
    return code.replace(/[^0-9]/g, '').trim();
  }
  ```
- **Observed Behavior**:
  When `caenCode` is passed as a number (e.g. integer `6201` or `5610`, which frequently occurs when `xlsx` reads unformatted numeric Excel cells) or an object:
  ```text
  TypeError: (caenCode || "").replace is not a function
      at getRiskProfileForCaen (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/risk/caen-risk-presets.ts:1622:38)
  ```
  and
  ```text
  TypeError: code.replace is not a function
      at normalizeCaenCode (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/caen-catalog.ts:325:15)
      at getCaenEntry (/Users/davidalexandru/Documents/Proiect_SSM/src/lib/caen-catalog.ts:343:22)
  ```
  Neither function defensively coerces input via `String(code ?? '')`.

---

## 2. Logic Chain

1. **Verification of Invariants & Catalog Completeness (Suite 1 & 2)**:
   - Observation shows that all 22 entries in `CAEN_CATALOG` have valid 4-digit codes, valid risk classes, statutory intervals, and valid hygiene modules where required.
   - For every entry, `getRiskProfileForCaen` produced a non-empty factors array where each factor conforms to the 7x6 Pece matrix lookup: $R_i = \text{PECE\_RISK\_MATRIX}[G_i - 1][P_i - 1]$.
   - The mathematical invariant $N_{rg} = \frac{\sum R_i^2}{\sum R_i}$ holds within 0.01 precision across all 22 catalog entries, and all scores fall within $1.0 < N_{rg} \le 3.50$.
   - All 7 dedicated presets in `CAEN_RISK_PROFILES` ('6201', '5610', '4120', '4711', '4941', '7022', '8621') contain all 4 system subsystems (`EXECUTANT`, `SARCINA`, `MIJLOACE`, `MEDIU`).

2. **Verification of Template Data Resolution (Suite 5, 6 & 7)**:
   - For all 12 combinations of templates (`risk-evaluare`, `ipssm-tesa`, `decizii-angajator`) across 4 client scenarios (CAEN 6201 IT, CAEN 5610 Restaurant, CAEN 4120 Construction, and Null/Empty CAEN), `unresolvedPlaceholders` was strictly empty `[]` and `status === 'ready'`.
   - For CAEN 5610 (Restaurant), the generated content properly binds `'5610 - Restaurante'` and restaurant-specific conclusions, without IT software leakage.
   - Physical rendering of the 3 DOCX files completed cleanly with zero remaining `{PLACEHOLDER_*}` tokens in the underlying XML.

3. **Discovery and Blast Radius of Defect 1 (Linguistic Collision)**:
   - While the happy-path test with job title `"Bucătar"` passed because the word "bucătar" does not contain `"it"`, testing standard Romanian construction and operational job titles (`"Muncitor necalificat"`, `"Zidar tencuitor"`, `"Instalator sanitar"`) triggered false-positive administrative classification due to `clean.includes('it')`.
   - The blast radius affects all Romanian job titles containing the agent suffix `-itor` or words with `-itar` / `-itate`. In production, this causes manual laborers in construction, manufacturing, and transport to be assigned office consulting risk assessments with deflated scores ($N_{rg} = 2.60$ instead of $3.36$), invalidating legal workplace risk assessments under Romanian labor law.

4. **Discovery and Blast Radius of Defect 2 (Type Coercion Crash)**:
   - `xlsx` parses unformatted numeric table cells as JavaScript `number` primitives. Calling `getRiskProfileForCaen(row.caenCode)` or `getCaenEntry(row.caenCode)` with an uncast numeric cell (`6201`) throws an unhandled `TypeError`, crashing worker import pipelines or API endpoints.

5. **Logical Link to Verdict**:
   Because Defect 1 silently produces legally invalid risk evaluations for core operational workers, and Defect 2 causes runtime exceptions on numeric Excel data, the work product cannot be approved in its current state.

---

## 3. Caveats

1. **Non-Regressed Core Features**:
   The database schema, seed data, unified acceptance suite (`verify-all.ts` with 124/124 passing items), Next.js production build (`npm run build`), and template generation pipeline are functionally stable and well-architected.
2. **Worker Role Adherence**:
   As an empirical challenger with a strict `Review-only — do NOT modify implementation code` constraint, no code edits have been applied to `src/lib/`. The required surgical fixes are detailed below for the worker agent to apply.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES ❌**

The CAEN risk presets and catalog implementation is 99.36% complete and mathematically sound, but requires two focused corrections before proceeding to Milestone 2:

### Required Action Items for Worker (`m1_r2_worker_1`):

1. **Fix Job Title Boundary Matching in `src/lib/risk/caen-risk-presets.ts`**:
   Replace substring matching (`clean.includes(kw)`) with word-boundary regex matching so that short acronyms (`it`, `hr`) only match standalone words:
   ```typescript
   function isAdministrativeJobTitle(title?: string): boolean {
     if (!title) return false;
     const clean = title.toLowerCase();
     const administrativeRegex = /\b(director|administrator|manager|sef birou|contabil|economist|secretar|asistent manager|functionar|tesa|resurse umane|hr|jurist|consilier juridic|programator|it|software)\b/i;
     return administrativeRegex.test(clean);
   }
   ```

2. **Add Safe String Coercion to CAEN Code Normalizers**:
   - In `src/lib/risk/caen-risk-presets.ts:1622`:
     ```typescript
     const cleanCode = String(caenCode ?? '').replace(/[^0-9]/g, '').trim();
     ```
   - In `src/lib/caen-catalog.ts:323-326`:
     ```typescript
     function normalizeCaenCode(code: string | number | unknown): string {
       if (!code) return '';
       return String(code).replace(/[^0-9]/g, '').trim();
     }
     ```
   - In `src/lib/caen-catalog.ts:350-355` (`searchCaen`):
     ```typescript
     export function searchCaen(query: string | unknown): CaenEntry[] {
       const cleanQuery = String(query ?? '').trim();
       if (!cleanQuery) return CAEN_CATALOG;
       ...
     ```

---

## 5. Verification Method

To independently verify this evaluation and reproduce all 19 failing assertions:

```bash
# 1. Execute the comprehensive adversarial stress test harness
npx tsx scripts/adversarial-caen-stress.ts

# 2. Directly reproduce the job title false-positive misclassification
npx tsx -e "
import { getRiskProfileForCaen } from './src/lib/risk/caen-risk-presets';
const p = getRiskProfileForCaen('4120', 'Muncitor necalificat în construcții');
console.log('Score:', p.globalRiskScore, '(Expected: 3.36, Actual:', p.globalRiskScore, ')');
console.log('Industry:', p.industryName, '(Expected: Lucrări de construcții, Actual:', p.industryName, ')');
"

# 3. Directly reproduce the numeric type crash
npx tsx -e "
import { getRiskProfileForCaen } from './src/lib/risk/caen-risk-presets';
getRiskProfileForCaen(6201 as any);
"
```

**Invalidation / Resolution Conditions**:
- When `getRiskProfileForCaen('4120', 'Muncitor necalificat în construcții')` returns the construction profile with score `3.36` and physical construction hazards.
- When `getRiskProfileForCaen(6201 as any)` succeeds without throwing a TypeError.
- When `npx tsx scripts/adversarial-caen-stress.ts` exits with code 0 and reports `VERDICT: APPROVE ✅` (2,990/2,990 assertions passing).
