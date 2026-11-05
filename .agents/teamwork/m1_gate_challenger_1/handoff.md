# Handoff Report — m1_gate_challenger_1

## Challenge Summary

**Overall risk assessment**: **HIGH**
**Verdict**: **REQUEST_CHANGES**

Empirical stress testing of Milestone 1 / Pillar 1 code and template rendering revealed 6 confirmed, reproducible bugs across salutation heuristics, hygiene level inference, authorization number sanitization, participant job resolution, and template placeholder wiring.

---

## 1. Observation

All findings were empirically reproduced by executing the automated adversarial test harness:
`npx tsx scripts/stress-test-m1-challenger1.ts` (125 test cases across 4 suites: 93 passed, 32 failed, exit code 1).

### Observation 1: Romanian Salutation Heuristic Flaws (`detectRomanianSalutation`)
- **File**: `src/lib/templates/resolver.ts`, lines 375–424.
- **Observed Behavior**:
  1. Male surnames ending in `-a` (e.g. *Florea*, *Chirilă*, *Moga*, *Marica*, *Ciurea*, *Ganea*, *Buruiană*, *Bercea*, *Sporea*, *Mirea*, *Cornea*) are erroneously classified as female (`Dna.`):
     - `detectRomanianSalutation("Ion Florea")` -> returns `"Dna."` (Expected: `"Dl."`).
     - `detectRomanianSalutation("Tudor Chirila")` -> returns `"Dna."` (Expected: `"Dl."`).
     - `detectRomanianSalutation("Marius Moga")` -> returns `"Dna."` (Expected: `"Dl."`).
     - `detectRomanianSalutation("Ciprian Marica")` -> returns `"Dna."` (Expected: `"Dl."`).
  2. Traditional Romanian male given names ending in `-a` (e.g. *Nichita*, *Dănilă*, *Gheorghiță*, *Costică*, *Mitică*, *Irimia*) are not in `maleExceptions` and are classified as female (`Dna.`):
     - `detectRomanianSalutation("Nichita Stanescu")` -> returns `"Dna."` (Expected: `"Dl."`).
     - `detectRomanianSalutation("Danila Popescu")` -> returns `"Dna."` (Expected: `"Dl."`).
     - `detectRomanianSalutation("Gheorghita Tudor")` -> returns `"Dna."` (Expected: `"Dl."`).
  3. Romanian female given names not ending in `-a` (e.g. *Miriam*, *Evelin*, *Eveline*, *Nicole*, *Vivien*) are omitted from `femaleExceptions` and default to male (`Dl.`):
     - `detectRomanianSalutation("Miriam Popescu")` -> returns `"Dl."` (Expected: `"Dna."`).
     - `detectRomanianSalutation("Evelin Popescu")` -> returns `"Dl."` (Expected: `"Dna."`).
  4. Name-order inversion for female employees with a male family name ending in `-a` (e.g. *Mircea Elena* where surname is Mircea and given name is Elena):
     - `detectRomanianSalutation("Mircea Elena")` -> returns `"Dl."` because Token 0 matches `maleExceptions` in Step 1 and immediately short-circuits.

### Observation 2: Substring Letter 'i' Matching Bug in `resolveHygieneLevel`
- **File**: `src/lib/templates/resolver.ts`, lines 451–453:
  ```typescript
  if (raw.includes('1') || raw.includes('unu') || raw.includes('i') || raw.includes('executie') || raw.includes('execuție')) {
    return 'Nivelul 1';
  }
  ```
- **Observed Behavior**:
  The predicate `raw.includes('i')` matches ANY string containing the single character `'i'`.
  When an explicit level or role contains `'i'` without numbers (intended as Roman numeral I):
  - `resolveHygieneLevel({ explicitLevel: "Director" })` -> returns `"Nivelul 1"` (Expected: `"Nivelul 2"`).
  - `resolveHygieneLevel({ explicitLevel: "Administrator" })` -> returns `"Nivelul 1"` (Expected: `"Nivelul 2"`).
  - `resolveHygieneLevel({ explicitLevel: "Supervizor" })` -> returns `"Nivelul 1"` (Expected: `"Nivelul 2"`).

### Observation 3: Dropping `participant.jobTitle` in `resolver.ts` for Hygiene Certificates
- **File**: `src/lib/templates/resolver.ts`, lines 1112–1116:
  ```typescript
  PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
    explicitLevel: (participant as any)?.level || (participant as any)?.hygieneLevel,
    jobTitle: job?.title || employee?.currentJob?.title,
    corCode: job?.corCode || employee?.currentJob?.corCode,
  }),
  ```
- **Observed Behavior**:
  `HygieneParticipant` in `prisma/schema.prisma` (line 469) stores the participant's post as `jobTitle`.
  `resolver.ts` checks only `job?.title` and `employee?.currentJob?.title`, completely omitting `participant.jobTitle`.
  - When `resolveTemplatePlaceholders` is invoked for `hygiene-adeverinta` with a participant having `jobTitle: "Director Restaurant"`, `jobTitle` is passed as `undefined`, causing `PLACEHOLDER_NIVEL_IGIENA` to default to `"Nivelul 1"` (Execution).

### Observation 4: Single-Pass Prefix Regex Flaw in `sanitizeAuthorizationNumber`
- **File**: `src/lib/templates/resolver.ts`, lines 430–435:
  ```typescript
  export function sanitizeAuthorizationNumber(auth?: string | null): string {
    if (!auth) return '';
    return auth
      .replace(/^(?:Aviz\s+(?:MS|ME)\s+(?:nr\.?)?|Aviz\s+nr\.?|Nr\.?\s*)/i, '')
      .trim();
  }
  ```
- **Observed Behavior**:
  1. For compound input `"Nr. Aviz MS nr. 123/2022"`, the regex only replaces `"Nr. "` at `^`, leaving `"Aviz MS nr. 123/2022"`. When rendered in `Adeverinta participare.docx` (which has `Nr. {PLACEHOLDER_AVIZ_MS}`), the stutter bug `"Nr. Aviz MS nr. 123/2022"` recurs verbatim.
  2. For articulated input `"Avizul MS nr. 123/2022"`, the pattern does not match `"Avizul"`, leaving the full string uncleaned.

### Observation 5: Rendered Stutter in `Adeverinta participare.docx` (`"nivelul Nivelul 1"`)
- **File**: `templates_registry/normalized/Adeverinta participare.docx`, paragraph text:
  `... modulul {PLACEHOLDER_MODUL_IGIENA}, nivelul {PLACEHOLDER_NIVEL_IGIENA}, organizat de ...`
- **Observed Behavior**:
  Because `resolveHygieneLevel` returns `"Nivelul 1"` or `"Nivelul 2"`, rendering the document produces:
  `... modulul Modulul 1 - Servicii de alimentație, nivelul Nivelul 1, organizat de ...`
  The phrase `"nivelul Nivelul 1"` contains redundant stutter.

### Observation 6: Template Token Wiring Disconnect in `DECIZII.docx` (Paragraph 458)
- **File**: `scripts/patch_m1_templates.py`, line 227:
  ```python
  p458_repl = '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r w:rsidR="00327F80">...<w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
  ```
- **Observed Behavior**:
  `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` was defined in `definitions.ts` and computed in `resolver.ts`. However, the template patcher injected `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` before `{PLACEHOLDER_MEMBRU_COMISIE}`.
  As a result:
  - If the administrator is male (`Dl.`), committee members are addressed as `Dl. Elena Vasilescu, Alexandru Stan`.
  - If the administrator is female (`Dna.`), but committee members are male, they are addressed as `Dna. Ion Popescu, Vasile Radu`.
  - `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` is never used anywhere in `DECIZII.docx`.

---

## 2. Logic Chain

1. In Milestone 1, `detectRomanianSalutation`, `sanitizeAuthorizationNumber`, and `resolveHygieneLevel` were introduced to eliminate manual mock defaults and hardcoded strings (e.g. 26 occurrences of `Dna.` in `DECIZII.docx` and authorization stutter in `Adeverinta participare.docx`).
2. The empirical test suite (`scripts/stress-test-m1-challenger1.ts`) subjected these functions to boundary and adversarial inputs representative of real-world Romanian personnel rosters.
3. In `detectRomanianSalutation`, using a simplistic morphological check (`lower.endsWith('a')`) with only an 8-item surname whitelist misclassifies pervasive Romanian male surnames (such as *Florea*, *Chirilă*, *Moga*, *Marica*), producing incorrect salutations in employer decisions.
4. In `resolveHygieneLevel`, using `raw.includes('i')` without word boundaries to detect Roman numeral "I" turns any management title containing the letter 'i' (e.g. *Director*, *Administrator*, *Supervizor*) into execution level (Nivelul 1).
5. In `resolver.ts`, neglecting `participant.jobTitle` when resolving hygiene certificates drops valid managerial roles from external session participants.
6. In `Adeverinta participare.docx` and `DECIZII.docx`, template text and placeholder pairings produce text stutter (`"nivelul Nivelul 1"`) and cross-field salutation contamination (administrator gender applied to committee members).
7. Therefore, while basic happy paths pass in `verify-all.ts`, the implementation exhibits critical edge-case flaws requiring targeted rectification before proceeding to Milestone 2.

---

## 3. Caveats

- Milestone 2 statutory templates (6 new templates: Anexa 11 SSM, Anexa PSI, Anexa 2/3 Med, Fișă EIP, CIM 2022) are part of Milestone 2 and were not evaluated here.
- Bulk ZIP packaging (`/api/documents/packages/`) is part of Milestone 4 and was not tested.
- `verify-all.ts` passes 130/130 because its test fixtures use clean mock data that matches the happy path; the adversarial edge cases surfaced here were not covered by the existing test suite.

---

## 4. Conclusion & Recommended Mitigations

**Verdict**: **REQUEST_CHANGES**

The worker must address the following 6 actionable fixes:

1. **Fix `detectRomanianSalutation`**:
   - Expand `maleSurnamesEndingInA` with common Romanian surnames ending in `-a`: `florea`, `chirila`, `moga`, `marica`, `ciurea`, `ganea`, `buruiana`, `danaila`, `bercea`, `sporea`, `mirea`, `cornea`, `cretea`, `dobrea`.
   - Expand `maleExceptions` with traditional male given names ending in `-a`: `nichita`, `danila`, `gheorghita`, `costica`, `mitica`, `irimia`.
   - Expand `femaleExceptions` with non-`-a` female names: `miriam`, `evelin`, `eveline`, `nicole`, `vivien`, `lili`, `neli`.
   - For compound / reversed names, evaluate tokens prioritizing known female given names over surname heuristics.

2. **Fix `resolveHygieneLevel`**:
   - Replace `raw.includes('i')` with a word-boundary regex for Roman numeral I: `/\b(nivelul\s+)?i\b/i` or `/(?:^|\s)i(?:$|\s)/`.
   - Ensure managerial keywords (*director*, *administrator*, *supervizor*) are checked before execution heuristics.

3. **Fix `resolver.ts` Participant Job Title**:
   - In lines 1114–1115, include `participant?.jobTitle`:
     `jobTitle: participant?.jobTitle || job?.title || employee?.currentJob?.title`
     `corCode: (participant as any)?.corCode || job?.corCode || employee?.currentJob?.corCode`

4. **Fix `sanitizeAuthorizationNumber`**:
   - Support compound prefixes, articulated forms, and iterative stripping:
     ```typescript
     export function sanitizeAuthorizationNumber(auth?: string | null): string {
       if (!auth) return '';
       let clean = auth.trim();
       clean = clean.replace(/^(?:nr\.?\s*)+/i, '');
       clean = clean.replace(/^(?:aviz(?:ul)?\s+(?:ms|me)?\s*(?:nr\.?)?\s*)/i, '');
       clean = clean.replace(/^(?:nr\.?\s*)+/i, '');
       return clean.trim();
     }
     ```

5. **Fix `Adeverinta participare.docx` Stutter**:
   - In `resolver.ts`, ensure `PLACEHOLDER_NIVEL_IGIENA` is formatted harmoniously with the template sentence (e.g. returning `'1'` / `'2'` if the template already has `'nivelul '`, or adjusting the template to `{PLACEHOLDER_NIVEL_IGIENA}`).

6. **Fix `DECIZII.docx` P458 Token Wiring**:
   - Update `scripts/patch_m1_templates.py` and the normalized template so that P458 uses `{PLACEHOLDER_APELATIV_MEMBRU_COMISIE} {PLACEHOLDER_MEMBRU_COMISIE}` instead of `{PLACEHOLDER_APELATIV_ADMINISTRATOR}`.

---

## 5. Verification Method

To independently reproduce the failures:
```bash
# 1. Run Challenger 1 empirical stress test harness:
npx tsx scripts/stress-test-m1-challenger1.ts

# 2. Verify specific failure categories:
# - Salutations: inspect failures for "Ion Florea", "Nichita Stanescu", "Miriam Popescu"
# - Hygiene level: inspect failure for explicitLevel: "Director" returning "Nivelul 1"
# - Authorization stutter: inspect failure for "Nr. Aviz MS nr. 123/2022"
# - Template token mismatch: inspect DECIZII.docx P458 containing PLACEHOLDER_APELATIV_ADMINISTRATOR before PLACEHOLDER_MEMBRU_COMISIE
```
Invalidation condition: When the worker fixes the 6 items, re-running `npx tsx scripts/stress-test-m1-challenger1.ts` must pass 125/125 with exit code 0, and `npm run build` + `npx tsx scripts/verify-all.ts` must remain 100% green.
