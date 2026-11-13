# Handoff Report: Template Generator Data Integrity (Features 3 & 5)

**Milestone**: Milestone 1 (M1) — Template Resolver & Generator Data Integrity  
**Explorer Agent**: `explorer_m1_2`  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m1_2`  
**Target Files Analyzed**:
- `src/lib/templates/generator.ts` (Lines 20-43, 70-132, 325-377, 540-620)
- `src/lib/templates/definitions.ts` (Lines 4-13, 310-330, 1100-1160, 3880-3950)
- `src/lib/templates/resolver.ts` (Lines 54-80, 565-600, 1640-1655, 1970-1976)
- `scripts/test-all-templates-generation.ts` (Lines 170-226)

---

## 1. Observation

### Observation 1.1: Raw String Replacement in XML Without Escaping (Feature 5)
In `src/lib/templates/generator.ts` (lines 345-373), after `docxtemplater` runs, a multi-part post-processing loop inspects all `.xml` and `.rels` files in the DOCX zip archive:
```typescript
// Multi-part post-processing: scan all XML and .rels parts for unresolved tokens & bare rels targets
for (const [relativePath, file] of Object.entries(docZip.files)) {
  if (
    (relativePath.startsWith('word/') || relativePath.startsWith('customXml/')) &&
    (relativePath.endsWith('.xml') || relativePath.endsWith('.rels'))
  ) {
    let text = file.asText();
    let changed = false;

    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const strVal = String(v);
        const curly = `{${k}}`;
        if (text.includes(curly)) {
          text = text.replaceAll(curly, strVal);
          changed = true;
        }
        if (relativePath.endsWith('.rels') && text.includes(k)) {
          text = text.replaceAll(k, strVal);
          changed = true;
        }
      }
    }

    if (changed) {
      docZip.file(relativePath, text);
    }
  }
}
```
**Direct finding**:
1. When a template contains placeholders in headers or footers (e.g. `11 - ALUNECARI.docx`, `13 - ACTIVITATI DE BIROU.docx`, `Detaliu Tematica introductiv generala.docx`, `Detaliu Tematica loc de munca.docx`, `Plan actiune pericol grav si iminent.docx`, `Zone pericol grav si iminent.docx` contain `{PLACEHOLDER_FIRMA}` in `word/header1.xml`, `word/header2.xml`, `word/header3.xml`), or in footers (`Tematica introductiv generala 4h.docx` and `Tematica loc de munca.docx` contain `{PLACEHOLDER_EMAIL_PRESTATOR}` and `{PLACEHOLDER_TELEFON_PRESTATOR}` in `word/footer1.xml`), `docxtemplater` may not process them depending on configuration.
2. The loop replaces `{${k}}` with raw `strVal`.
3. If `strVal` contains XML special characters:
   - `&` (e.g. `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.`, `JOHN & DOE S.R.L.`, `AT&T ROMANIA`): raw `&` is injected into XML (`<w:t>EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.</w:t>`). In XML 1.0 (W3C Section 2.4/4.6), a bare `&` violates entity syntax. Strict XML parsers (including Microsoft Word, LibreOffice, Python `xml.etree.ElementTree`) fail immediately with:
     ```
     ElementTree parse error: not well-formed (invalid token): line 1, column 25
     ```
     Word reports: *"Word found unreadable content in <file>.docx. Do you want to recover the contents of this document?"* and strips parts or refuses to open.
   - `<` (e.g. `Nrg <= 3.50`, `Salariu < 4000`, `Distanta < 1.5m`): raw `<` opens an invalid XML tag, causing XML parser errors:
     ```
     invalid attribute:<
     ```
   - `>` (e.g. `Nivel > 2`): breaks XML tags or CDATA delimiters.
   - `"` and `'` (e.g. `Decizie "Conducere"`, `l'Oreal`): inside `.rels` files (`Target="..."`), raw quotes prematurely terminate attributes, producing invalid XML attributes:
     ```
     Target="http://site.ro/link"quote""
     ```

### Observation 1.2: Spurious `approved_for_print` Status with Missing Mandatory Data (Feature 3)
In `src/lib/templates/generator.ts` (lines 550-591):
```typescript
const manifest = JSON.parse(template.manifestJson || '{}');
const fieldDefs: TemplateFieldDef[] = manifest.fields || catalogDef?.fields || [];

const missingFields = new Set(validateMissingFields(fieldDefs, params.data));
...
const outputBuffer = await renderTemplateBuffer(
  templateFilePath,
  templateFormat,
  params.data,
  templateFilename
);

// Scan output file for any remaining unmapped tokens
for (const token of await collectUnresolvedPlaceholders(outputBuffer, templateFormat)) {
  missingFields.add(placeholderLabel(token));
}

const finalMissingFields = [...missingFields];
const status: 'draft' | 'missing_data' | 'approved_for_print' =
  finalMissingFields.length === 0 ? 'approved_for_print' : 'missing_data';
```
And in `src/lib/templates/generator.ts` (lines 29-43):
```typescript
export function validateMissingFields(
  fieldDefs: TemplateFieldDef[],
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];
  for (const f of fieldDefs) {
    if (f.required) {
      const val = data[f.key];
      if (val === undefined || val === null || val === '') {
        missing.push(f.label);
      }
    }
  }
  return missing;
}
```
**Direct finding**:
1. In `src/lib/templates/definitions.ts`:
   - Line 1110 (`hr-cim-2026`): `PLACEHOLDER_NUMAR_CIM` has `required: false`!
   - Line 3944 (`hr-cim-model-cadru-2022`): `PLACEHOLDER_NUMAR_CIM` has `required: false`!
   - Line 323 (`hr-anexa-fisa-post`): `PLACEHOLDER_NUMAR_CIM` has `required: false`!
2. In the PostgreSQL database, `Template.manifestJson` for `hr-cim-model-cadru-2022` also stores `required: false` for `PLACEHOLDER_NUMAR_CIM`. Because line 552 prioritizes `manifest.fields || catalogDef?.fields`, the database manifest with `required: false` takes precedence over any updates.
3. In `src/lib/templates/resolver.ts` (lines 1645-1648), when `employee.cimNumber` or `employee.grossSalary` is null or undefined in the database:
   ```typescript
   PLACEHOLDER_NUMAR_CIM: (employee as any)?.cimNumber || (context.customOverrides?.PLACEHOLDER_NUMAR_CIM as string) || (context.allowOfflineBlank || !employee ? '........ / ............' : ''),
   PLACEHOLDER_SALARIU_BRUT: (employee as any)?.grossSalary != null ? `${(employee as any).grossSalary} lei` : ((employee as any)?.salary || (context.customOverrides?.PLACEHOLDER_SALARIU_BRUT as string) || (context.allowOfflineBlank || !employee ? '........................ lei' : '')),
   ```
   When `allowOfflineBlank: true` (as called in test scripts or default contexts):
   `PLACEHOLDER_NUMAR_CIM` resolves to `'........ / ............'`.
   `PLACEHOLDER_SALARIU_BRUT` resolves to `'........................ lei'`.
4. In `validateMissingFields`:
   `val === undefined || val === null || val === ''` evaluates to `false` for `'........................ lei'` because the string is non-empty!
5. In `renderTemplateBuffer`:
   The string `'........................ lei'` replaces `{PLACEHOLDER_SALARIU_BRUT}`. No literal token `PLACEHOLDER_` remains in the file.
6. In `collectUnresolvedPlaceholders`:
   Regex `/PLACEHOLDER_[A-Z0-9_]+/g` finds 0 unmapped tokens.
7. Result:
   `finalMissingFields.length === 0` evaluates to `true`!
   `status` is granted `'approved_for_print'`!
   **Verification confirmed**: We verified with the live database that `Stan Alexandru` currently has `cimNumber: null` and `grossSalary: null`, yet `hr-cim-model-cadru-2022` generated for him passes as `approved_for_print`!

---

## 2. Logic Chain

```
[Observation 1.1: Post-processing loop in generator.ts:358, 362 inserts raw strVal into XML/rels]
      │
      ▼
[XML 1.0 Spec: & begins entity; < begins element tag; " and ' delimit attributes]
      │
      ▼
[When company name contains & (e.g. EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.) or condition has < (Nrg <= 3.50)]
      │
      ▼
[Raw XML becomes ill-formed -> Fatal XML parser error -> OpenXML DOCX corrupted -> Word recovery error]
      │
      ▼
[Logic Step 1: Every string value inserted into DOCX .xml / .rels parts MUST pass through escapeXml()]
```

```
[Observation 1.2: definitions.ts marks PLACEHOLDER_NUMAR_CIM as required: false]
      │
      ▼
[Observation 1.2: resolver.ts substitutes dots ('........ / ............', '........................ lei')]
      │
      ▼
[Observation 1.2: validateMissingFields only tests val === '' (fails to catch whitespace and dot patterns)]
      │
      ▼
[Observation 1.2: collectUnresolvedPlaceholders finds no remaining PLACEHOLDER_ token because dots replaced it]
      │
      ▼
[generator.ts line 590: finalMissingFields.length === 0 -> evaluates TRUE]
      │
      ▼
[Status set to 'approved_for_print' despite missing statutory salary & CIM number -> DIRECT VIOLATION of R1]
      │
      ▼
[Logic Step 2: Fix require 4-layer defense:
  1. Helper isBlankOrPlaceholderMarker(val) to reject dot patterns and whitespace
  2. Enhanced validateMissingFields utilizing isBlankOrPlaceholderMarker
  3. STATUTORY_MANDATORY_FIELDS safety table in generator.ts for CIM & employee templates
  4. Set required: true in definitions.ts for PLACEHOLDER_NUMAR_CIM in CIM & job annex templates
  5. Prioritize catalogDef?.fields in generator.ts so code definitions override stale DB manifests]
```

---

## 3. Caveats

1. **docxtemplater internal escaping vs post-processing loop**:
   `docxtemplater` already encodes XML entities for values evaluated during `doc.render(renderData)`. However, `docxtemplater` does not process headers/footers in templates where they are not linked in the main document flow or when `nullGetter` preserves tokens. The multi-part post-processing loop in `generator.ts` (lines 345-373) is the critical junction where unescaped string injection occurs. Applying `escapeXml` in lines 358 and 362 guarantees complete XML validity across all parts.
2. **XLSX & PDF handling**:
   `XLSX` (SheetJS) handles XML encoding internally when serializing cells; pre-escaping strings for XLSX would cause double-escaping (`&amp;amp;`). PDF (`pdf-lib`) uses standard glyph drawing and diacritic replacement (`pdfText`), with no XML involved. `escapeXml` must ONLY be applied to XML-based formats (DOCX OpenXML files).
3. **Database seed state**:
   The current database contains employees with `null` `cimNumber` and `grossSalary`. When the strict `approved_for_print` rules are implemented, test runs using unseeded employees will legitimately result in `missing_data` unless `patch_seed_data.ts` or complete seed data is loaded. This is the intended statutory behavior.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Recommendation for Feature 5 (XML Escaping in `generator.ts`)

#### 1. Implement `escapeXml` function in `src/lib/templates/generator.ts`:
```typescript
/**
 * Escapes the 5 XML predefined entities to prevent OpenXML document corruption.
 * Note: Ampersand (&) MUST be replaced first to avoid double-escaping.
 */
export function escapeXml(unsafe: unknown): string {
  if (unsafe === undefined || unsafe === null) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

#### 2. Apply `escapeXml` in `renderTemplateBuffer` (lines 345-373):
```typescript
    // Multi-part post-processing: scan all XML and .rels parts for unresolved tokens & bare rels targets
    for (const [relativePath, file] of Object.entries(docZip.files)) {
      if (
        (relativePath.startsWith('word/') || relativePath.startsWith('customXml/') || relativePath.startsWith('docProps/')) &&
        (relativePath.endsWith('.xml') || relativePath.endsWith('.rels'))
      ) {
        let text = file.asText();
        let changed = false;

        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            const strVal = String(v);
            const escapedVal = escapeXml(strVal);
            const curly = `{${k}}`;
            if (text.includes(curly)) {
              text = text.replaceAll(curly, escapedVal);
              changed = true;
            }
            if (relativePath.endsWith('.rels') && text.includes(k)) {
              text = text.replaceAll(k, escapedVal);
              changed = true;
            }
          }
        }

        if (changed) {
          docZip.file(relativePath, text);
        }
      }
    }
```

---

### 4.2 Recommendation for Feature 3 (`approved_for_print` Status Integrity)

#### 1. Implement `isBlankOrPlaceholderMarker` in `src/lib/templates/generator.ts`:
```typescript
/**
 * Determines if a field value is missing, empty, or consists of blank/placeholder markers
 * (e.g. dots, slashes, dashes, dots with currency units, or literal missing indicators).
 */
export function isBlankOrPlaceholderMarker(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  const str = String(val).trim();
  if (str === '') return true;

  // Patterns composed solely of dots, dashes, slashes, underscores (e.g. "........ / ............", "---", "N/A")
  if (/^[\s.\-_/–—…]+$/.test(str)) return true;

  // Dot patterns followed by currency or time units (e.g. "........................ lei", ".... lei")
  if (/^[\s.\-_/–—…]+(\s*(lei|ron|luni|zile|ore|ani))?$/i.test(str)) return true;

  // Explicit missing markers
  const upper = str.toUpperCase();
  if (['[LIPSĂ DATE]', 'LIPSA DATE', 'N/A', 'UNDEFINED', 'NULL', 'NECUNOSCUT'].includes(upper)) return true;

  // Raw placeholder tokens (e.g. "PLACEHOLDER_NUMAR_CIM", "{PLACEHOLDER_NUMAR_CIM}")
  if (str.startsWith('PLACEHOLDER_') || str.startsWith('{PLACEHOLDER_')) return true;

  return false;
}
```

#### 2. Update `validateMissingFields` in `src/lib/templates/generator.ts`:
```typescript
export function validateMissingFields(
  fieldDefs: TemplateFieldDef[],
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];
  for (const f of fieldDefs) {
    if (f.required) {
      const val = data[f.key];
      if (isBlankOrPlaceholderMarker(val)) {
        missing.push(f.label || f.key);
      }
    }
  }
  return missing;
}
```

#### 3. Define Statutory Mandatory Fields in `src/lib/templates/generator.ts`:
```typescript
export const STATUTORY_MANDATORY_FIELDS: Record<string, { key: string; label: string }[]> = {
  // Model Cadru CIM Ordin MMSS 2171/2022
  'hr-cim-model-cadru-2022': [
    { key: 'PLACEHOLDER_NUMAR_CIM', label: 'Număr contract individual de muncă' },
    { key: 'PLACEHOLDER_SALARIU_BRUT', label: 'Salariu de bază lunar brut' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)' },
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat' },
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator' },
    { key: 'PLACEHOLDER_CUI', label: 'Cod de identificare fiscală (CUI)' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant legal angajator' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția conform COR' },
    { key: 'PLACEHOLDER_DATA_INCEPERE', label: 'Data începerii activității' },
  ],
  // CIM 2026
  'hr-cim-2026': [
    { key: 'PLACEHOLDER_NUMAR_CIM', label: 'Număr contract individual de muncă' },
    { key: 'PLACEHOLDER_SALARIU_BRUT', label: 'Salariu de bază lunar brut' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)' },
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat' },
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator' },
    { key: 'PLACEHOLDER_CUI', label: 'Cod de identificare fiscală (CUI)' },
    { key: 'PLACEHOLDER_REPREZENTANT_LEGAL', label: 'Reprezentant legal angajator' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția conform COR' },
  ],
  // Anexa Fisa Postului SSM
  'hr-anexa-fisa-post': [
    { key: 'PLACEHOLDER_NUMAR_CIM', label: 'Număr contract individual de muncă' },
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția conform COR' },
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator' },
  ],
  // Fisa Instruire Individuala SSM (Anexa 11 HG 1425/2006)
  'ssm-fisa-instruire-individuala': [
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)' },
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator' },
    { key: 'PLACEHOLDER_CUI', label: 'Cod de identificare fiscală (CUI)' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția / Ocupația' },
  ],
  // Fisa Instructaj PSI (OMAI 712/2005)
  'psi-fisa-instructaj-individuala': [
    { key: 'PLACEHOLDER_NUME_COMPLET', label: 'Nume și prenume salariat' },
    { key: 'PLACEHOLDER_CNP', label: 'Cod Numeric Personal (CNP)' },
    { key: 'PLACEHOLDER_FIRMA', label: 'Denumire firmă / Angajator' },
    { key: 'PLACEHOLDER_CUI', label: 'Cod de identificare fiscală (CUI)' },
    { key: 'PLACEHOLDER_FUNCTIE', label: 'Funcția / Ocupația' },
  ],
};
```

#### 4. Update `generateDocument` in `src/lib/templates/generator.ts`:
```typescript
  const catalogDef = TEMPLATE_CATALOG.find((t) => t.code === params.templateCode);
  const templateFilename = catalogDef?.normalizedFilename || template.normalizedFilename;
  const templateFormat = catalogDef?.format || template.format;
  const manifest = JSON.parse(template.manifestJson || '{}');
  // Canonical code definitions take priority over DB manifest to avoid stale requirement flags
  const fieldDefs: TemplateFieldDef[] = catalogDef?.fields || manifest.fields || [];

  const missingFields = new Set(validateMissingFields(fieldDefs, params.data));

  // Enforce statutory mandatory fields per template
  const statutoryReqs = STATUTORY_MANDATORY_FIELDS[params.templateCode] || [];
  for (const req of statutoryReqs) {
    const val = params.data[req.key];
    if (isBlankOrPlaceholderMarker(val)) {
      missingFields.add(req.label);
    }
  }
  ...
  // Scan output file for any remaining unmapped tokens
  for (const token of await collectUnresolvedPlaceholders(outputBuffer, templateFormat)) {
    missingFields.add(placeholderLabel(token));
  }

  const finalMissingFields = [...missingFields];
  const status: 'draft' | 'missing_data' | 'approved_for_print' =
    finalMissingFields.length === 0 ? 'approved_for_print' : 'missing_data';
```

#### 5. Update `src/lib/templates/definitions.ts`:
Set `required: true` for `PLACEHOLDER_NUMAR_CIM` on:
- `hr-cim-model-cadru-2022` (line 3944)
- `hr-cim-2026` (line 1110)
- `hr-anexa-fisa-post` (line 323)

---

## 5. Verification Method

### 5.1 XML Escaping Verification Command
Create and execute a standalone test script verifying that strings with `&`, `<`, `>`, `"`, `'` are cleanly escaped in generated DOCX files and that `xml.etree.ElementTree` or `@xmldom/xmldom` parses every `.xml` part without throwing:
```bash
npx tsx -e '
import { renderTemplateBuffer } from "./src/lib/templates/generator";
import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";

async function testXmlEscaping() {
  const data = {
    PLACEHOLDER_FIRMA: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L. <Nrg <= 3.50>",
    PLACEHOLDER_REPREZENTANT_LEGAL: "Popescu \"Director\" & Co",
    PLACEHOLDER_SPECIALIST_SSM: "Ionescu & Asociații",
  };
  const buf = await renderTemplateBuffer("templates_registry/normalized/11 - ALUNECARI.docx", "docx", data);
  const zip = new PizZip(buf);
  let errorCount = 0;
  for (const [path, file] of Object.entries(zip.files)) {
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      const xml = file.asText();
      const parser = new DOMParser({ onError: (level, msg) => { console.error(path, level, msg); errorCount++; } });
      parser.parseFromString(xml, "text/xml");
      if (xml.includes("EXPERT SSM & SITUAȚII")) {
        console.error("FAIL: Raw unescaped ampersand found in", path);
        errorCount++;
      }
    }
  }
  if (errorCount === 0) console.log("SUCCESS: All XML parts parsed cleanly without corruption!");
  else process.exit(1);
}
testXmlEscaping();
'
```

### 5.2 `approved_for_print` Integrity Verification Command
Test that when `cimNumber` or `grossSalary` is empty or dots, `generateDocument` returns `status: 'missing_data'` and includes the missing labels:
```bash
npx tsx -e '
import { generateDocument } from "./src/lib/templates/generator";
import { prisma } from "./src/lib/prisma";

async function testStatusIntegrity() {
  const client = await prisma.client.findFirst();
  const res = await generateDocument({
    templateCode: "hr-cim-model-cadru-2022",
    clientId: client.id,
    data: {
      PLACEHOLDER_FIRMA: client.name,
      PLACEHOLDER_NUMAR_CIM: "", // missing CIM
      PLACEHOLDER_SALARIU_BRUT: "........................ lei", // dot marker
      PLACEHOLDER_CNP: "1880315410127",
    },
    operatorName: "Test Operator",
  });
  console.log("Status with missing CIM/salary:", res.status);
  console.log("Missing fields:", res.missingFields);
  if (res.status === "approved_for_print") {
    console.error("FAIL: approved_for_print granted when CIM/salary are missing!");
    process.exit(1);
  } else {
    console.log("SUCCESS: approved_for_print correctly withheld (status: missing_data)!");
  }
}
testStatusIntegrity();
'
```

### 5.3 Global Build & Validation
```bash
npm run build
npx prisma validate
npx tsx scripts/test-all-templates-generation.ts
```

### 5.4 Invalidation Conditions
This analysis is invalidated if:
1. Microsoft OpenXML standard changes to permit bare unescaped ampersands or less-than characters in XML text (impossible per W3C XML 1.0).
2. Romanian statutory labor regulations abolish the requirement for CIM number and gross salary on employment contracts.
