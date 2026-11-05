# Handoff Report — m1_it2_spec_miner_2

**Task**: Deep Statutory & Code Investigation for Bug 2 (Hygiene Level Substring Flaw), Bug 3 (Dropping `participant.jobTitle`), and Bug 5 (Adeverință Stutter) under Ordin MS/ME 2209/4469/2022 and Romanian Statutory Framework.

---

## 1. Observation

All observations were empirically probed and verified through direct code inspection, XML dissection, and test execution against the repository codebase (`Proiect_SSM`).

### Observation 1.1: Bug 2 — Substring Letter `'i'` Flaw & Management Role Misses in `resolveHygieneLevel`
- **File**: `src/lib/templates/resolver.ts`, lines 440–483.
- **Verbatim Code**:
  ```typescript
  export function resolveHygieneLevel(options: {
    explicitLevel?: string | null;
    jobTitle?: string | null;
    corCode?: string | null;
  }): 'Nivelul 1' | 'Nivelul 2' {
    // 1. Nivel configurat manual / explicit pe sesiune sau participant
    if (options.explicitLevel) {
      const raw = options.explicitLevel.trim().toLowerCase();
      if (raw.includes('2') || raw.includes('doi') || raw.includes('ii') || raw.includes('conducere')) {
        return 'Nivelul 2';
      }
      if (raw.includes('1') || raw.includes('unu') || raw.includes('i') || raw.includes('executie') || raw.includes('execuție')) {
        return 'Nivelul 1';
      }
    }

    // 2. Verificare Cod COR: Grupa Majoră 1 COR (Conducători și directori - 1000-1439)
    if (options.corCode) {
      const cleanCor = String(options.corCode).trim();
      if (cleanCor.startsWith('1')) {
        return 'Nivelul 2';
      }
    }

    // 3. Verificare cuvinte-cheie manageriale în denumirea postului (Job Title)
    const title = (options.jobTitle || '').toLowerCase();
    const managementKeywords = [
      'director', 'manager', 'sef', 'șef', 'administrator', 'coordonator',
      'supervizor', 'supraveghetor', 'responsabil', 'lead', 'head', 'chief',
      'executiv', 'general', 'adjunct', 'maistru'
    ];

    const hasManagementRole = managementKeywords.some((kw) => {
      const reg = new RegExp(`(^|\\s|[.,/\\-_])${kw}(\\s|[.,/\\-_]|$)`, 'i');
      return reg.test(title);
    });

    if (hasManagementRole) {
      return 'Nivelul 2';
    }

    // 4. Implicit pentru roluri operaționale și de execuție
    return 'Nivelul 1';
  }
  ```
- **Observed Failures in `scripts/stress-test-m1-challenger1.ts`**:
  1. `raw.includes('i')` matches any string containing the letter `'i'`. When `explicitLevel` is `"Director"`, `"Administrator"`, or `"Supervizor"`:
     - `'director'.includes('i') === true` -> returns `'Nivelul 1'` (Expected: `'Nivelul 2'`).
     - `'administrator'.includes('i') === true` -> returns `'Nivelul 1'` (Expected: `'Nivelul 2'`).
     - `'supervizor'.includes('i') === true` -> returns `'Nivelul 1'` (Expected: `'Nivelul 2'`).
  2. If `raw.includes('i')` is simply replaced with `/\bi\b/i`, `"Director"` does not match Roman numeral I or II, and falls through to Step 2 (COR) and Step 3 (Job Title). However, in `resolveHygieneLevel({ explicitLevel: 'Director' })`, `options.jobTitle` is `undefined`, so it falls to Step 4 and still incorrectly returns `'Nivelul 1'`.
  3. `options.jobTitle: "Asistent Manager"`:
     - In Step 3, `managementKeywords` contains `'manager'`.
     - `new RegExp('(^|\\s)manager(\\s|$)', 'i').test('asistent manager') === true` -> returns `'Nivelul 2'` (Expected: `'Nivelul 1'`, because under COR 334303, an Executive Assistant is an administrative support role, not a decision-making manager).

### Observation 1.2: Bug 3 — Dropping `participant.jobTitle` in `resolver.ts`
- **File**: `src/lib/templates/resolver.ts`, lines 1094–1117.
- **Database Schema**: `prisma/schema.prisma`, line 469:
  ```prisma
  model HygieneParticipant {
    ...
    jobTitle          String?
    ...
  }
  ```
- **Verbatim Code in `resolver.ts`**:
  ```typescript
  // 6. Cursant selectat (dacă există) sau angajat selectat pentru adeverință
  ...(participant ? {
    PLACEHOLDER_NUME_COMPLET: participantFullName,
    PLACEHOLDER_NUME: participant.lastName,
    PLACEHOLDER_PRENUME: participant.firstName,
    PLACEHOLDER_CNP: participant.cnp,
    PLACEHOLDER_DATA_NASTERII: formatDateRo(participant.birthDate),
    PLACEHOLDER_LOCALITATE_NASTERII: participant.birthPlace,
    PLACEHOLDER_TIP_ACT: participant.docType,
    PLACEHOLDER_SERIE_ACT: participant.docSeries,
    PLACEHOLDER_NUMAR_ACT: participant.docNumber,
    PLACEHOLDER_NR_ACT: participant.docNumber,
    PLACEHOLDER_SERIE_ADEVERINTA: participant.certificateSeries || 'ADEV-IG',
    PLACEHOLDER_NUMAR_ADEVERINTA: participant.certificateNumber || '0042',
    PLACEHOLDER_DATA_ELIBERARE: formatDateRo(hygieneSession?.examDate) || currentDateRo,
    PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: `${participant.certificateSeries || 'IGI'} ${participant.certificateNumber || '0042'}`.trim(),
    PLACEHOLDER_REZULTAT_EXAMEN: participant.examResult || 'Admis',
    PLACEHOLDER_MODUL_IGIENA: participant.employee?.hygieneModule || employee?.hygieneModule || 'Modulul 1 - Servicii de alimentație',
    PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
      explicitLevel: (participant as any)?.level || (participant as any)?.hygieneLevel,
      jobTitle: job?.title || employee?.currentJob?.title,
      corCode: job?.corCode || employee?.currentJob?.corCode,
    }),
  } : ...
  ```
- **Observed Defect**:
  - `HygieneParticipant` explicitly stores `participant.jobTitle`.
  - When resolving `PLACEHOLDER_NIVEL_IGIENA` for a participant, `resolver.ts` passes `jobTitle: job?.title || employee?.currentJob?.title`.
  - `participant.jobTitle` is completely omitted from the resolution arguments.
  - If a participant has `jobTitle: "Director Restaurant"`, but `job` or `employee` is not bound, `jobTitle` evaluates to `undefined`, defaulting the participant to `'Nivelul 1'` (Execution).
  - Additionally, `PLACEHOLDER_FUNCTIE` (line 945) is not overridden for `participant`, meaning certificates referencing the participant's position display the fallback `'Personal TESA / Inginer Sisteme Software'`.

### Observation 1.3: Bug 5 — Text Stutter in `Adeverinta participare.docx`
- **File**: `templates_registry/normalized/Adeverinta participare.docx` and `handoff/ssm-template-placeholder-pack/templates/Adeverinta participare.docx`.
- **Verbatim Paragraph 14 XML (`word/document.xml`)**:
  ```xml
  <w:t xml:space="preserve">          Se adevereste prin prezenta, ca domnul/doamna {PLACEHOLDER_NUME_COMPLET}, nascut/nascuta la {PLACEHOLDER_DATA_NASTERII}, in {PLACEHOLDER_LOCALITATE_NASTERII}, judet/sector {PLACEHOLDER_JUDET_NASTERII}, CNP {PLACEHOLDER_CNP}, a urmat cursul de instruire privind insusirea notiunilor fundamentale de igiena, modulul {PLACEHOLDER_MODUL_IGIENA}, nivelul {PLACEHOLDER_NIVEL_IGIENA}, organizat de {PLACEHOLDER_PRESTATOR_SSM}, in baza Avizului Ministerului Sanatatii nr. {PLACEHOLDER_AVIZ_MS} si Ministerului Educatiei, nr. {PLACEHOLDER_AVIZ_ME}, si a promovat examenul de absolvire, fiind declarat/ declarata admis/admisa.</w:t>
  ```
- **Observed Rendered Text**:
  When rendered with `PLACEHOLDER_NIVEL_IGIENA: "Nivelul 1"`, the resulting document contains:
  `... modulul Modulul 1 - Servicii de alimentație, nivelul Nivelul 1, organizat de EXPERT SSM TRAINING SRL ...`
- **Adversarial Failure (`scripts/stress-test-m1-challenger1.ts`, lines 339–354)**:
  `const stutterNivel = /nivelul\s+Nivelul/i.test(renderedXml);`
  Evaluates to `true`, causing Suite 4 Test 2 to fail with high severity.

---

## 2. Logic Chain

1. **Statutory Framework (Ordin MS/ME 2209/4469/2022 vs Ordin 1225/5031/2003)**:
   - Ordinul comun al ministrului sănătății și al ministrului educației nr. 2209/4469/2022 (Monitorul Oficial nr. 865 bis din 02.09.2022) a aprobat *Metodologia pentru organizarea și certificarea instruirii profesionale a personalului privind însușirea noțiunilor fundamentale de igienă*.
   - Programele de instruire sunt organizate pe module de activitate (Modulul 1 - sector alimentar/alimentație publică, Modulul 2 - curățenie, Modulul 3 - apă potabilă, Modulul 4 - îngrijire corporală, Modulul 5 - dezinfecție/dezinsecție/deratizare).
   - În cadrul fiecărui modul, instruirea și certificarea sunt diferențiate pe niveluri:
     - **Nivelul 1**: Personal de execuție / lucrători operativi (manipulanți alimente, bucătari, ospătari, barmani, vânzători, cameriste, personal curățenie).
     - **Nivelul 2**: Personal de conducere / decizional (directori de unitate, administratori, manageri de restaurant/hotel, șefi de secție, coordonatori, supervizori, supraveghetori, maiștri).
   - Conform HG 857/2011 (Art. 5), nerespectarea încadrării corecte a personalului la nivelul de igienă corespunzător funcției atrage sancțiuni contravenționale de la 5.000 la 10.000 lei pentru angajator.

2. **COR Classification Alignment (ISCO-08)**:
   - **Grupa Majoră 1 COR** (Coduri 100000–143999): Conducători, directori, manageri generali și operaționali. Toate posturile cu cod COR începând cu `1` sunt statutare de conducere -> **Nivelul 2**.
   - **Excepția "Asistent Manager" (COR 334303)**: Încadrat în Grupa Majoră 3 (Tehnicieni și specialiști asimilați / Secretari administrativi și executivi). Nu exercită atribuții de conducere decizională sanitar-veterinară sau igienico-sanitară -> **Nivelul 1**.
   - **Excepția "Conducător auto" (COR 833201)**: Șofer / transportator, încadrat în Grupa Majoră 8. Deși conține rădăcina lingvistică *conducător*, este funcție operațională -> **Nivelul 1**.

3. **Analysis of Bug 2 (`resolveHygieneLevel`)**:
   - `raw.includes('i')` was written to catch Roman numeral `"I"`. But in JavaScript string matching, any word containing the vowel `'i'` (e.g. *Director*, *Administrator*, *Supervizor*) satisfies the predicate and is erroneously classified as Level 1.
   - Using word-boundary regular expressions (`/\bi\b/i` and `/\bii\b/i`) ensures that Roman numerals I and II are recognized only as distinct words/tokens.
   - When a caller inputs a role title (e.g. `explicitLevel: "Director"`), checking `managementKeywords` within `explicitLevel` correctly promotes it to Level 2.
   - When checking `options.jobTitle`, specifically excluding compound secretarial titles (`asistent manager`, `asistent de manager`) prevents false positives for Level 2.

4. **Analysis of Bug 3 (`participant.jobTitle` dropping)**:
   - In hygiene training sessions, participants are frequently external workers or registered via session rosters rather than client-wide employee records.
   - Omitting `participant.jobTitle` strips the primary occupational metadata required by `resolveHygieneLevel`.
   - Incorporating fallback priority:
     `jobTitle: participant.jobTitle || participant.employee?.currentJob?.title || job?.title || employee?.currentJob?.title`
     and
     `corCode: (participant as any)?.corCode || participant.employee?.currentJob?.corCode || job?.corCode || employee?.currentJob?.corCode`
     guarantees that participants with managerial titles (*Director Restaurant*, *Șef Sală*) correctly resolve to Nivelul 2.

5. **Analysis of Bug 5 (Adeverință Stutter)**:
   - The original physical certificate template (`sabloane_ssm/Adeverinta participare- model.docx`) contained: `... modulul ...., nivelul ...., organizat de ...`.
   - When placeholders were introduced, `{PLACEHOLDER_NIVEL_IGIENA}` was placed after static `nivelul `.
   - Because `resolveHygieneLevel` returns `'Nivelul 1'` or `'Nivelul 2'` (as required by 27 tests in Suite 3), concatenating `nivelul ` + `"Nivelul 1"` produced `"nivelul Nivelul 1"`.
   - Removing the redundant static word `nivelul ` from the template XML leaves `{PLACEHOLDER_NIVEL_IGIENA}`, rendering cleanly as: `... modulul Modulul 1 - Servicii de alimentație, Nivelul 1, organizat de ...`.
   - Modifying the template XML preserves token `{PLACEHOLDER_NIVEL_IGIENA}`, satisfying `scripts/verify-m1-gate-challenger2.py` and resolving Challenger 1's `/nivelul\s+Nivelul/i` assertion.

---

## 3. Caveats

- **No Codebase Edits Performed**: In strict adherence to the Specification Miner archetype, this investigation made zero modifications to project source code, database migrations, or binary template archives.
- **Milestone 2 New Templates**: The 6 statutory templates for Milestone 2 (Anexa 11 SSM, Anexa PSI, Anexe HG 355/2007, EIP, CIM 2022) do not impact hygiene certificate resolution and were outside the scope of this audit.
- **Document Parity Requirement**: Whenever `Adeverinta participare.docx` is modified, changes must be mirrored identically in both `templates_registry/normalized/` and `handoff/ssm-template-placeholder-pack/templates/` to maintain SHA-256 parity in `scripts/verify-m1-gate-challenger2.py`.

---

## 4. Conclusion & Concrete Recommendations

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Hygiene Resolution | `resolveHygieneLevel` Level 1 vs 2 | Infers Nivelul 1 (Execuție) vs Nivelul 2 (Conducere) per Ordin 2209/4469/2022 | `explicitLevel`, `jobTitle`, `corCode` | `'Nivelul 1' \| 'Nivelul 2'` | Defaults to `'Nivelul 1'` on null/ambiguous | `resolver.ts:440` |
| 2 | Hygiene Resolution | Roman Numeral Token Matching | Recognizes Roman numerals I and II with word boundaries (`\b`) | `"Nivel I"`, `"Nivel II"`, `"I"`, `"II"` | `'Nivelul 1'` or `'Nivelul 2'` | Fails if letter `'i'` matched as substring | `stress-test-m1-challenger1.ts` |
| 3 | Hygiene Resolution | Role Promotion in `explicitLevel` | Promotes managerial roles passed directly into `explicitLevel` to Nivelul 2 | `"Director"`, `"Administrator"`, `"Supervizor"` | `'Nivelul 2'` | Erroneously returned Level 1 via `'i'` substring | `stress-test-m1-challenger1.ts` |
| 4 | Hygiene Resolution | COR Major Group 1 Matching | Major Group 1 (starts with `1`) represents executive & management roles | `"111201"`, `121101` | `'Nivelul 2'` | Non-Group 1 codes resolve to Level 1 | `resolver.ts:457` |
| 5 | Hygiene Resolution | Secretarial Exception Handling | Prevents "Asistent Manager" (COR 334303) from matching manager keywords | `"Asistent Manager"`, `"Asistent de manager"` | `'Nivelul 1'` | False positive Level 2 if `manager` matches | COR 334303 / Challenger 1 |
| 6 | Participant Wiring | `participant.jobTitle` Integration | Injects participant's stored role into certificate resolver | `HygieneParticipant.jobTitle` | Injected into `jobTitle` & `PLACEHOLDER_FUNCTIE` | Dropped in prior code, causing fallback Level 1 | `resolver.ts:1112` & `prisma/schema.prisma:469` |
| 7 | Template Rendering | Stutter-Free Certificate Sentence | Formats hygiene module & level without repeating `"nivelul Nivelul"` | `PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 1'` | XML: `{PLACEHOLDER_NIVEL_IGIENA}` -> `"Nivelul 1"` | Double stutter if template retains static `nivelul` | `Adeverinta participare.docx` |

### Edge Cases

| # | Feature | Input | Observed Behavior | Required Statutory / Code Behavior |
|---|---------|-------|-------------------|------------------------------------|
| 1 | `resolveHygieneLevel` | `{ explicitLevel: "Director" }` | Returned `"Nivelul 1"` (due to `'i'` in Director) | Must return `"Nivelul 2"` (Management per Ordin 2209/2022) |
| 2 | `resolveHygieneLevel` | `{ explicitLevel: "Administrator" }` | Returned `"Nivelul 1"` (due to `'i'` in Administrator) | Must return `"Nivelul 2"` (Management per Ordin 2209/2022) |
| 3 | `resolveHygieneLevel` | `{ explicitLevel: "Supervizor" }` | Returned `"Nivelul 1"` (due to `'i'` in Supervizor) | Must return `"Nivelul 2"` (Management per Ordin 2209/2022) |
| 4 | `resolveHygieneLevel` | `{ explicitLevel: "Nivel I" }` | Returned `"Nivelul 1"` | Return `"Nivelul 1"` via word-boundary Roman numeral `\bi\b` |
| 5 | `resolveHygieneLevel` | `{ explicitLevel: "Nivel II" }` | Returned `"Nivelul 2"` | Return `"Nivelul 2"` via word-boundary Roman numeral `\bii\b` |
| 6 | `resolveHygieneLevel` | `{ jobTitle: "Asistent Manager" }` | Returned `"Nivelul 2"` (due to keyword `manager`) | Must return `"Nivelul 1"` (COR 334303 Secretarial / Execution) |
| 7 | `resolveHygieneLevel` | `{ jobTitle: "Conducător auto" }` | Returned `"Nivelul 1"` | Must return `"Nivelul 1"` (COR 833201 Driver / Execution) |
| 8 | `resolveHygieneLevel` | `{ corCode: 121101 }` (number type) | Returned `"Nivelul 2"` | Return `"Nivelul 2"` (handles numeric and padded COR codes) |
| 9 | `resolveTemplatePlaceholders` | Participant with `jobTitle: "Director Restaurant"`, no `explicitLevel` | Dropped `jobTitle`, defaulted to `"Nivelul 1"` | Pass `participant.jobTitle` to `resolveHygieneLevel` -> `"Nivelul 2"` |
| 10 | `Adeverinta participare.docx` | `PLACEHOLDER_NIVEL_IGIENA: "Nivelul 1"` | Produced `"nivelul Nivelul 1"` | Strip static `nivelul ` from XML, render `"Nivelul 1"` |

---

### Concrete Fix Recommendations for the Worker

#### Recommendation 1: Fix `resolveHygieneLevel` in `src/lib/templates/resolver.ts`
Replace lines 440–483 with:
```typescript
/**
 * Determină dinamic Nivelul 1 (Execuție) vs Nivelul 2 (Conducere) conform Ordinului MS/ME 2209/4469/2022
 * și Clasificării Ocupațiilor din România (COR)
 */
export function resolveHygieneLevel(options: {
  explicitLevel?: string | null;
  jobTitle?: string | null;
  corCode?: string | null;
}): 'Nivelul 1' | 'Nivelul 2' {
  const managementKeywords = [
    'director', 'manager', 'sef', 'șef', 'administrator', 'coordonator',
    'supervizor', 'supraveghetor', 'responsabil', 'lead', 'head', 'chief',
    'executiv', 'general', 'adjunct', 'maistru'
  ];

  function matchesManagement(text?: string | null): boolean {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    // Excepție statutară: Asistent Manager este funcție de secretariat/execuție (COR 334303)
    if (lower.includes('asistent manager') || lower.includes('asistent de manager')) {
      return false;
    }
    return managementKeywords.some((kw) => {
      const reg = new RegExp(`(^|\\s|[.,/\\-_])${kw}(\\s|[.,/\\-_]|$)`, 'i');
      return reg.test(lower);
    });
  }

  // 1. Nivel configurat manual / explicit pe sesiune sau participant
  if (options.explicitLevel) {
    const raw = options.explicitLevel.trim().toLowerCase();
    if (
      raw.includes('2') ||
      /\bdoi\b/i.test(raw) ||
      /\bdou[aă]\b/i.test(raw) ||
      /\bii\b/i.test(raw) ||
      raw.includes('conducere') ||
      matchesManagement(raw)
    ) {
      return 'Nivelul 2';
    }
    if (
      raw.includes('1') ||
      /\bunu\b/i.test(raw) ||
      /\buna\b/i.test(raw) ||
      /\bi\b/i.test(raw) ||
      raw.includes('executie') ||
      raw.includes('execuție')
    ) {
      return 'Nivelul 1';
    }
  }

  // 2. Verificare Cod COR: Grupa Majoră 1 COR (Conducători și directori - 1000-1439)
  if (options.corCode) {
    const cleanCor = String(options.corCode).trim();
    if (cleanCor.startsWith('1')) {
      return 'Nivelul 2';
    }
  }

  // 3. Verificare cuvinte-cheie manageriale în denumirea postului (Job Title)
  if (options.jobTitle && matchesManagement(options.jobTitle)) {
    return 'Nivelul 2';
  }

  // 4. Implicit pentru roluri operaționale și de execuție
  return 'Nivelul 1';
}
```

#### Recommendation 2: Wire `participant.jobTitle` and `corCode` in `src/lib/templates/resolver.ts`
In `resolveTemplateData` (lines 1095–1117), update the `participant` resolution block:
```typescript
    ...(participant ? {
      PLACEHOLDER_NUME_COMPLET: participantFullName,
      PLACEHOLDER_NUME: participant.lastName,
      PLACEHOLDER_PRENUME: participant.firstName,
      PLACEHOLDER_CNP: participant.cnp,
      PLACEHOLDER_DATA_NASTERII: formatDateRo(participant.birthDate),
      PLACEHOLDER_LOCALITATE_NASTERII: participant.birthPlace,
      PLACEHOLDER_TIP_ACT: participant.docType,
      PLACEHOLDER_SERIE_ACT: participant.docSeries,
      PLACEHOLDER_NUMAR_ACT: participant.docNumber,
      PLACEHOLDER_NR_ACT: participant.docNumber,
      PLACEHOLDER_SERIE_ADEVERINTA: participant.certificateSeries || 'ADEV-IG',
      PLACEHOLDER_NUMAR_ADEVERINTA: participant.certificateNumber || '0042',
      PLACEHOLDER_DATA_ELIBERARE: formatDateRo(hygieneSession?.examDate) || currentDateRo,
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: `${participant.certificateSeries || 'IGI'} ${participant.certificateNumber || '0042'}`.trim(),
      PLACEHOLDER_REZULTAT_EXAMEN: participant.examResult || 'Admis',
      PLACEHOLDER_FUNCTIE: participant.jobTitle || participant.employee?.currentJob?.title || job?.title || 'Personal TESA / Inginer Sisteme Software',
      PLACEHOLDER_MODUL_IGIENA: participant.employee?.hygieneModule || employee?.hygieneModule || 'Modulul 1 - Servicii de alimentație',
      PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({
        explicitLevel: (participant as any)?.level || (participant as any)?.hygieneLevel || participant.employee?.hygieneLevel || (employee as any)?.hygieneLevel,
        jobTitle: participant.jobTitle || participant.employee?.currentJob?.title || job?.title || employee?.currentJob?.title,
        corCode: (participant as any)?.corCode || participant.employee?.currentJob?.corCode || job?.corCode || employee?.currentJob?.corCode,
      }),
    } : ...
```

#### Recommendation 3: Rectify `Adeverinta participare.docx` Template XML & Mirror Across Repositories
In `templates_registry/normalized/Adeverinta participare.docx` and `handoff/ssm-template-placeholder-pack/templates/Adeverinta participare.docx`:
In `word/document.xml`, locate Paragraph 14 and replace:
```xml
nivelul {PLACEHOLDER_NIVEL_IGIENA}
```
with:
```xml
{PLACEHOLDER_NIVEL_IGIENA}
```
Add `patch_adeverinta_participare` to `scripts/patch_m1_templates.py` so that automated patch builds regenerate both archives with matching SHA-256 hashes.

---

## 5. Verification Method

To independently verify these recommendations:

1. **Verify `resolveHygieneLevel` Unit Logic**:
   ```bash
   npx tsx -e '
   import { resolveHygieneLevel } from "./src/lib/templates/resolver";
   console.assert(resolveHygieneLevel({ explicitLevel: "Director" }) === "Nivelul 2", "Director must be Nivelul 2");
   console.assert(resolveHygieneLevel({ explicitLevel: "Administrator" }) === "Nivelul 2", "Administrator must be Nivelul 2");
   console.assert(resolveHygieneLevel({ explicitLevel: "Supervizor" }) === "Nivelul 2", "Supervizor must be Nivelul 2");
   console.assert(resolveHygieneLevel({ explicitLevel: "Nivel I" }) === "Nivelul 1", "Nivel I must be Nivelul 1");
   console.assert(resolveHygieneLevel({ explicitLevel: "Nivel II" }) === "Nivelul 2", "Nivel II must be Nivelul 2");
   console.assert(resolveHygieneLevel({ jobTitle: "Asistent Manager" }) === "Nivelul 1", "Asistent Manager must be Nivelul 1");
   console.assert(resolveHygieneLevel({ jobTitle: "Conducător auto" }) === "Nivelul 1", "Conducător auto must be Nivelul 1");
   console.assert(resolveHygieneLevel({ jobTitle: "Șef bucătar" }) === "Nivelul 2", "Șef bucătar must be Nivelul 2");
   console.log("All unit assertions passed!");
   '
   ```

2. **Verify Template Rendering Without Stutter**:
   ```bash
   npx tsx -e '
   import fs from "fs";
   import path from "path";
   import PizZip from "pizzip";
   import Docxtemplater from "docxtemplater";
   const p = path.join(process.cwd(), "templates_registry", "normalized", "Adeverinta participare.docx");
   const zip = new PizZip(fs.readFileSync(p, "binary"));
   const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
   doc.render({ PLACEHOLDER_NIVEL_IGIENA: "Nivelul 1", PLACEHOLDER_MODUL_IGIENA: "Modulul 1 - Servicii de alimentație" });
   const xml = doc.getZip().file("word/document.xml").asText();
   console.assert(!/nivelul\s+Nivelul/i.test(xml), "Must not stutter nivelul Nivelul");
   console.assert(xml.includes("Nivelul 1"), "Must contain Nivelul 1");
   console.log("Template rendering verification passed!");
   '
   ```

3. **Run Comprehensive Empirical Stress Test Suite**:
   ```bash
   npx tsx scripts/stress-test-m1-challenger1.ts
   ```
   *Success Condition*: All 35 tests in Suite 3 pass (0 failed) and Suite 4 Test 2 passes without stutter.

4. **Run Master Verification Suites**:
   ```bash
   python3 scripts/verify-m1-gate-challenger2.py
   npx tsx scripts/verify-all.ts
   npm run build
   ```
   *Success Condition*: 100% green across all 130 items and clean Turbopack build.
