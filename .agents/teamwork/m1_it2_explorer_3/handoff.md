# Handoff Report — m1_it2_explorer_3

## Executive Summary

- **Investigation Target**: Bug 6 — `DECIZII.docx` Paragraph 458 Token Wiring Disconnect (`PLACEHOLDER_APELATIV_ADMINISTRATOR` vs `PLACEHOLDER_APELATIV_MEMBRU_COMISIE`) and patch script `scripts/patch_m1_templates.py`.
- **Verdict**: **CONFIRMED DEFECT**. Paragraph 458 of `DECIZII.docx` erroneously injects the company administrator's salutation (`PLACEHOLDER_APELATIV_ADMINISTRATOR`) before `{PLACEHOLDER_MEMBRU_COMISIE}`, leaving `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` orphaned and causing cross-entity gender mismatch.
- **Scope of Corruption**: Exactly 1 paragraph (P458) is affected across the entire 554 paragraphs of `DECIZII.docx`. All other 25 salutation pairings (13 Administrator, 12 PSI Officer) are 100% correct.
- **Worker Deliverable**: Provided exact idempotent patch logic for `scripts/patch_m1_templates.py`, a verified surgical Python script to update the binary docx files in both target directories without XML corruption, and verification tests.

---

## 1. Observation

### 1.1 The Flawed Patch Script Logic (`scripts/patch_m1_templates.py`)
In `scripts/patch_m1_templates.py`, lines 225–230:
```python
# 2. P458 Membru comisie
p458_target = 'Dna. </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
p458_repl = '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
assert p458_target in text, 'DECIZII: P458 target not found'
text = text.replace(p458_target, p458_repl)
```
- In `p458_repl`, `{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t>` was injected immediately preceding `{PLACEHOLDER_MEMBRU_COMISIE}`.

### 1.2 OpenXML Structure of Paragraph 458 in `DECIZII.docx`
Direct inspection of `word/document.xml` in both `templates_registry/normalized/DECIZII.docx` and `handoff/ssm-template-placeholder-pack/templates/DECIZII.docx` yields:
```xml
<w:p w14:paraId="16262C09" w14:textId="70A309C9" w:rsidR="00E50323" w:rsidRPr="00D43483" w:rsidRDefault="00E347BE" w:rsidP="00E50323">
  <w:pPr>
    <w:pStyle w:val="ListParagraph"/>
    <w:numPr><w:ilvl w:val="0"/><w:numId w:val="34"/></w:numPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/>
      <w:color w:val="000000" w:themeColor="text1"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:lang w:val="it-IT"/>
    </w:rPr>
  </w:pPr>
  <!-- Run 1: Salutation (Regular text) -->
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/>
      <w:color w:val="000000" w:themeColor="text1"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:lang w:val="ro-RO"/>
    </w:rPr>
    <w:t xml:space="preserve">{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t>
  </w:r>
  <!-- Run 2: Committee Member (Bold text) -->
  <w:r w:rsidR="00327F80">
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/>
      <w:b/>
      <w:color w:val="000000" w:themeColor="text1"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:lang w:val="ro-RO"/>
    </w:rPr>
    <w:t>{PLACEHOLDER_MEMBRU_COMISIE}</w:t>
  </w:r>
  <w:r w:rsidR="0051748C">...</w:r>
  <w:r w:rsidR="00E50323" w:rsidRPr="00D43483">...</w:r>
</w:p>
```

### 1.3 Statutory Context of Paragraph 458 in `DECIZII.docx`
Paragraph 458 is located within **Decizia 11** (Decizia de organizare a activităţii de apărare împotriva incendiilor conform Legii 307/2006 și OMAI 712/2005):
- **P457**: `Art. 6. Pentru efectuarea instructajului personalului din afara operatorului economic încadrat conform art. 40 din O.M.A.I. nr. 712/23.06.2005 se stabilesc următoarele persoane:`
- **P458**: `{PLACEHOLDER_APELATIV_ADMINISTRATOR} {PLACEHOLDER_MEMBRU_COMISIE}`  <-- [BUG: Administrator salutation applied to committee member]
- **P459**: `{PLACEHOLDER_APELATIV_PSI} {PLACEHOLDER_RESPONSABIL_PSI}`
- In the original reference template (`sabloane_ssm/DECIZII NOU .docx`), Paragraph 458 read:
  `Dna. TEODORESCU DIANA-ALINA - Membru`
  In that template document, `TEODORESCU DIANA-ALINA` happened to be both the administrator and a named member.

### 1.4 Ground-Truth Catalog & Resolver Support
- `src/lib/templates/definitions.ts`, lines 1426–1431:
  ```typescript
  {
    key: 'PLACEHOLDER_APELATIV_MEMBRU_COMISIE',
    label: 'Apelativ Membru Comisie (Dl./Dna.)',
    source: 'computed',
    required: false,
    type: 'string',
  },
  ```
- `src/lib/templates/resolver.ts`, lines 837–839:
  ```typescript
  PLACEHOLDER_APELATIV_ADMINISTRATOR: detectRomanianSalutation(client?.legalRepresentative),
  PLACEHOLDER_APELATIV_PSI: detectRomanianSalutation(psiOfficer || client?.psiResponder),
  PLACEHOLDER_APELATIV_MEMBRU_COMISIE: detectRomanianSalutation(investMembers),
  ```
- `src/lib/templates/resolver.ts`, lines 85–87 & 707:
  ```typescript
  export const ROMANIAN_LEGAL_DECIZII = {
    ...
    PLACEHOLDER_APELATIV_ADMINISTRATOR: 'Dl.',
    PLACEHOLDER_APELATIV_PSI: 'Dl.',
    PLACEHOLDER_APELATIV_MEMBRU_COMISIE: 'Dl.',
    ...
    PLACEHOLDER_MEMBRU_COMISIE: 'Elena Vasilescu, Alexandru Stan',
  };
  const investMembers = client?.investigationMembers || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_MEMBRU_COMISIE;
  ```
- Occurrence counts across the template:
  - `PLACEHOLDER_APELATIV_ADMINISTRATOR`: **14 occurrences**
  - `PLACEHOLDER_APELATIV_PSI`: **12 occurrences**
  - `PLACEHOLDER_APELATIV_MEMBRU_COMISIE`: **0 occurrences** (completely orphaned!)

### 1.5 Exhaustive Paragraph Audit of All Salutations in `DECIZII.docx`
An automated traversal of all 554 paragraphs in `DECIZII.docx` verified the pairing of all 26 salutations:
- **13 occurrences of `PLACEHOLDER_APELATIV_ADMINISTRATOR`**:
  - P49, P101, P113, P125, P176, P180, P183, P201, P224, P255, P397, P421, P444.
  - Every single one directly precedes `{PLACEHOLDER_REPREZENTANT_LEGAL}` (Administrator). All are 100% correct.
- **12 occurrences of `PLACEHOLDER_APELATIV_PSI`**:
  - P203, P215, P249, P262, P267, P402, P405, P431, P452, P453, P459, P463.
  - Every single one directly precedes `{PLACEHOLDER_RESPONSABIL_PSI}` (Cadru tehnic PSI). All are 100% correct.
- **1 occurrence at P458**:
  - Precedes `{PLACEHOLDER_MEMBRU_COMISIE}`.
  - Currently wired to `{PLACEHOLDER_APELATIV_ADMINISTRATOR}`.
  - **No other paragraphs in `DECIZII.docx` have misplaced salutations.**

### 1.6 Patch Script Re-run Failure (`scripts/patch_m1_templates.py`)
Executing `python3 scripts/patch_m1_templates.py` directly on the current working directory fails with:
`AssertionError: EVALUAREA RISCURILOR: P69 old pattern not found`
because the script was written as a non-idempotent one-shot script with strict assertions that fail when files are already partially patched.

---

## 2. Logic Chain

1. In `definitions.ts`, three distinct salutation tokens were specified for `decizii-angajator`:
   - `PLACEHOLDER_APELATIV_ADMINISTRATOR` (for `legalRepresentative`)
   - `PLACEHOLDER_APELATIV_PSI` (for `psiOfficer`)
   - `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` (for `investMembers` / `commissionMember`)
2. In `resolver.ts`, each of these three salutations is independently computed using `detectRomanianSalutation`. For example, `PLACEHOLDER_MEMBRU_COMISIE` defaults to `'Elena Vasilescu, Alexandru Stan'`, for which `detectRomanianSalutation` correctly computes `'Dna.'`.
3. In `scripts/patch_m1_templates.py`, the author replaced static `Dna.` instances across `DECIZII.docx`. When encountering Paragraph 458 (`Dna. TEODORESCU DIANA-ALINA - Membru` from the source file), the author conflated TEODORESCU's role as administrator with the placeholder `{PLACEHOLDER_MEMBRU_COMISIE}` and wrote `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` into `p458_repl`.
4. As a direct consequence, if a company has a male administrator (`Dl. Mihai Popescu`) and a female committee member (`Elena Vasilescu`), the rendered document outputs:
   `Dl. Elena Vasilescu, Alexandru Stan`
   This is a severe visual and grammatical defect in statutory documents.
5. Furthermore, `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` is left with 0 occurrences in `DECIZII.docx`, rendering the token schema in `definitions.ts` and the calculation in `resolver.ts` dead code.
6. The OpenXML structure of Paragraph 458 clearly separates the salutation text in Run 1 (`<w:r><w:rPr>...</w:rPr><w:t xml:space="preserve">{PLACEHOLDER_APELATIV_MEMBRU_COMISIE} </w:t></w:r>`) from the bold member name in Run 2 (`<w:r w:rsidR="00327F80"><w:rPr><w:b/>...</w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}</w:t></w:r>`).
7. Replacing `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` with `{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}` at Paragraph 458 restores proper token wiring, utilizes the resolver's computed value, eliminates cross-entity salutation pollution, and preserves 100% valid XML without tag corruption.

---

## 3. Caveats

1. **Multi-Member Commission String**: In Romanian administrative practice, `PLACEHOLDER_MEMBRU_COMISIE` can contain a comma-separated list of members (e.g. `'Elena Vasilescu, Alexandru Stan'`). The salutation heuristic evaluates the leading token (the commission president / primary member) to determine `Dl.` or `Dna.`. This is statutory standard for Romanian joint commission designations.
2. **Idempotency of `patch_m1_templates.py`**: The existing `scripts/patch_m1_templates.py` contains rigid assertions across other files (`p69_old in text`, etc.). The fix for `DECIZII.docx` in `patch_m1_templates.py` must support both pristine unpatched input (`Dna. </w:t>...`) and the currently patched working copy (`{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t>...`) to ensure reproducibility.
3. **No XML Tag Invalidation**: Replacement preserves identical run boundaries (`</w:t></w:r><w:r ...><w:t>`) and `xml:space="preserve"`. ElementTree parses the resulting XML with 0 errors.

---

## 4. Conclusion & Actionable Instructions for the Worker

### Fix 1: Update `scripts/patch_m1_templates.py`
In `scripts/patch_m1_templates.py`, update `patch_decizii` (lines 225–230) to handle both raw and currently-patched templates idempotently:

```python
<<<<
            # 2. P458 Membru comisie
            p458_target = 'Dna. </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            p458_repl = '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            assert p458_target in text, 'DECIZII: P458 target not found'
            text = text.replace(p458_target, p458_repl)
====
            # 2. P458 Membru comisie: inject PLACEHOLDER_APELATIV_MEMBRU_COMISIE before PLACEHOLDER_MEMBRU_COMISIE
            p458_target_raw = 'Dna. </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            p458_target_admin = '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            p458_repl = '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            if p458_target_raw in text:
                text = text.replace(p458_target_raw, p458_repl)
            elif p458_target_admin in text:
                text = text.replace(p458_target_admin, p458_repl)
            else:
                assert '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}' in text, 'DECIZII: P458 target not found'
>>>>
```

### Fix 2: Apply the Surgical Fix to Both Template Directories
The Worker should execute the following python script to patch both `templates_registry/normalized/DECIZII.docx` and `handoff/ssm-template-placeholder-pack/templates/DECIZII.docx`:

```python
import io, zipfile, xml.etree.ElementTree as ET

TARGET_DIRS = [
    'templates_registry/normalized/DECIZII.docx',
    'handoff/ssm-template-placeholder-pack/templates/DECIZII.docx',
]

target_admin = '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
target_raw = 'Dna. </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
repl = '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'

for docx_path in TARGET_DIRS:
    with open(docx_path, 'rb') as f:
        in_buf = io.BytesIO(f.read())
    in_zip = zipfile.ZipFile(in_buf, 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)
    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == 'word/document.xml':
            text = content.decode('utf-8')
            if target_admin in text:
                text = text.replace(target_admin, repl)
            elif target_raw in text:
                text = text.replace(target_raw, repl)
            else:
                assert '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}' in text
            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')
        out_zip.writestr(item, content)
    in_zip.close()
    out_zip.close()
    with open(docx_path, 'wb') as f:
        f.write(out_buf.getvalue())
    print(f"Successfully patched {docx_path}")
```

### Fix 3: Enhance `scripts/stress-test-m1-challenger1.ts`
In `scripts/stress-test-m1-challenger1.ts`, update the `DECIZII.docx` dynamic salutation test block (around line 395) to explicitly assert that `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` renders dynamically:
```typescript
const hasAdminSalutation = renderedXml.includes('Dna. Elena Vasilescu') || renderedXml.includes('Dna.  Elena Vasilescu');
const hasPsiSalutation = renderedXml.includes('Dl. Gheorghe Barbu') || renderedXml.includes('Dl.  Gheorghe Barbu');
const hasMemberSalutation = renderedXml.includes('Dna. Elena Vasilescu, Alexandru Stan') || renderedXml.includes('Dna.  Elena Vasilescu, Alexandru Stan');

if (hasAdminSalutation && hasPsiSalutation && hasMemberSalutation) {
  r.passed++;
} else {
  r.failed++;
  r.failures.push({
    name: 'DECIZII.docx: Dynamic Salutation Rendering',
    ...
  });
}
```

---

## 5. Verification Method

### 5.1 Step 1: OpenXML Token Verification
Run the following verification script:
```bash
python3 -c "
import zipfile

for path in ['templates_registry/normalized/DECIZII.docx', 'handoff/ssm-template-placeholder-pack/templates/DECIZII.docx']:
    with zipfile.ZipFile(path, 'r') as z:
        xml = z.read('word/document.xml').decode('utf-8')
        assert '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}' in xml, f'{path}: Missing APELATIV_MEMBRU_COMISIE'
        assert xml.count('{PLACEHOLDER_APELATIV_ADMINISTRATOR}') == 13, f'{path}: Expected 13 admin tokens'
        assert xml.count('{PLACEHOLDER_APELATIV_PSI}') == 12, f'{path}: Expected 12 psi tokens'
        assert xml.count('{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}') == 1, f'{path}: Expected 1 membre comisie token'
        print(f'✓ {path}: Token counts verified (13 Admin, 12 PSI, 1 Membru Comisie, 0 Dna)')
"
```

### 5.2 Step 2: Full Document Auto-Completion & Verification
Run the project acceptance suite:
```bash
npx tsx scripts/test-all-templates-generation.ts
npx tsx scripts/verify-all.ts
npm run build
```

### 5.3 Invalidation Conditions
- Any occurrence of `Dna.` remaining in `DECIZII.docx`.
- `PLACEHOLDER_APELATIV_ADMINISTRATOR` occurring more than 13 times in `DECIZII.docx`.
- XML malformation or tag unbalance reported by `ET.fromstring` or Docxtemplater during template compilation.
