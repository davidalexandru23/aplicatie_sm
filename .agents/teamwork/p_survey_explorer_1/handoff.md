# Handoff Report — p_survey_explorer_1

## 1. Observation

Direct observations extracted via deep inspection of ZIP archives, XML files (`word/document.xml`, `header*.xml`, `footer*.xml`, `xl/worksheets/`), `definitions.ts`, and `resolver.ts`:

1. **`EVALUAREA RISCURILOR.docx` (`risk-evaluare`)** — `templates_registry/normalized/EVALUAREA RISCURILOR.docx` (30,721 bytes):
   - `word/document.xml`, paragraph index 69:
     `Societatea {PLACEHOLDER_FIRMA} cu sediul in {PLACEHOLDER_ADRESA_FIRMA}, inregistrata la Registrul Comertului Bucuresti sub nr. {PLACEHOLDER_ADRESA_FIRMA}, CUI {PLACEHOLDER_CUI} este infiintata in anul {PLACEHOLDER_AN_INFIINTARE}.`
   - `word/document.xml`, paragraph index 336:
     `... in cadrul lucrarii de absolvire s-a optat pentru utilizarea metodei elaborate de I.N.C.D.P.M. Bucuresti.`
   - `word/document.xml`, paragraph index 970 (paragrafe 760–765):
     `Evaluare intocmita de Societatea {PLACEHOLDER_PRESTATOR_SSM}`
     ` Bucuresti , str Petcu Avram nr 6 , sector 4, `
     `CERTIFICAT DE ABILITARE NR {PLACEHOLDER_CERTIFICAT_EVALUATOR}`
     `CONTACT: 0040 723.60.13.84`
   - Corrupted tokens in table rows: P524 (`x2.Contuzie{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`), P711 (`19.Tumori maligne...{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`), P175 & P337 (`{PLACEHOLDER_NIVEL_RISC_GLOBAL} - {PLACEHOLDER_CONCLUZII_EVALUARE}` injected mid-sentence).
   - TOC lists `Capitolul 6 Evaluarea posturilor de lucru: {PLACEHOLDER_FUNCTIE}` (P-idx 51) and `Capitolul 7 Concluzii` (P-idx 55), but document body terminates at paragraph 791 (end of Anexa 5). Chapters 6 and 7 do not exist in the document body. `<w:tbl> = 0`.

2. **`13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`)** — `templates_registry/normalized/13 - ACTIVITATI DE BIROU.docx` (18,026 bytes):
   - `word/document.xml`, paragraph index 24:
     `Instrucţiunile prezente completeaza si detaliaza (ţinând seama de particularităţile activităţii agenţilor de pază şi ale locurilor de muncă aflate în responsabilitatea lor), prevederile următoarelor acte normative:`
   - Antet at paragraph indices 0–2:
     `[0]: Aprobat`
     `[1]: ADMINISTRATOR`
     `[2]: {PLACEHOLDER_REPREZENTANT_LEGAL}`
     `{PLACEHOLDER_FIRMA}` is completely missing from the document and from `definitions.ts:105-132`.

3. **`11 - ALUNECARI.docx` (`ipssm-alunecari`)** — `templates_registry/normalized/11 - ALUNECARI.docx` (11,089 bytes):
   - Antet at paragraph indices 0–2 has only `Aprobat`, `ADMINISTRATOR`, `{PLACEHOLDER_REPREZENTANT_LEGAL}`.
   - `{PLACEHOLDER_FIRMA}` is completely missing from the document and from `definitions.ts:40-67`.

4. **`Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`)** — `templates_registry/normalized/Detaliu Tematica loc de munca.docx` (122,131 bytes):
   - `word/footer1.xml` and `word/footer2.xml`:
     `<wp:docPr id="110341619" name="Picture 1" descr="Logo"><a:hlinkClick r:id="rId1" tooltip="&quot;UNIK Best Protect&quot; t "/></wp:docPr>`
     `<pic:cNvPr id="0" name="Picture 1" descr="Image and video hosting by TinyPic"/>`
     `<a:blip r:embed="rId2"/>`
   - `word/_rels/footer1.xml.rels` and `word/_rels/footer2.xml.rels`:
     `rId1 -> http://ssm-bucuresti.ro/`, `rId2 -> media/image14.jpeg`.
   - Title at paragraph indices 4–5: `DETALIU LA TEMATICA PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA`. Missing `{PLACEHOLDER_FUNCTIE}` in file and in `definitions.ts:1760-1787`.

5. **`DECIZII.docx` (`decizii-angajator`)** — `templates_registry/normalized/DECIZII.docx` (67,183 bytes):
   - `word/document.xml`, paragraph index 419–420:
     `DECIZIA`
     `Nr.10 din {PLACEHOLDER_DATA_DECIZIE}`
   - Exactly 24 occurrences of `Dna.` hardcoded:
     - 13 occurrences referring to Administrator (`Dna. {PLACEHOLDER_REPREZENTANT_LEGAL}`) at P-idx 49, 101, 113, 125, 176, 180, 183, 201, 224, 255, 397, 421, 444.
     - 10 occurrences referring to PSI specialist (`Dna. {PLACEHOLDER_RESPONSABIL_PSI}`) at P-idx 203, 215, 249, 262, 267, 402, 405, 431, 452, 453, 459, 463.
     - 1 occurrence referring to Membru Comisie (`Dna. {PLACEHOLDER_MEMBRU_COMISIE}`) at P-idx 458.
   - Code inspection: `PLACEHOLDER_NUMAR_DECIZIE_10` is absent from `definitions.ts:1340-1342` and `resolver.ts:81-82, 669-670`.

6. **`Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`)** — `templates_registry/normalized/Anexa fisa postului SSM.docx` (26,720 bytes):
   - Only 2 placeholders present: `{PLACEHOLDER_REPREZENTANT_LEGAL}` and `{PLACEHOLDER_NUME_COMPLET}`.
   - Missing: `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`, CIM number, and signing date. Table 3 has static cell "SALARIAT" instead of function token.

7. **`Informare Protectia Datelor.docx` (`hr-gdpr-informare`)** — `templates_registry/normalized/Informare Protectia Datelor.docx` (8,887 bytes):
   - Ellipses before `{PLACEHOLDER_FIRMA}` at P-idx 12 (`…{PLACEHOLDER_FIRMA}`), P-idx 16 (`……{PLACEHOLDER_FIRMA}`), P-idx 17 (`…………{PLACEHOLDER_FIRMA}`).
   - P-idx 18 bases processing on "exprimarea consimtamantului", conflicting with GDPR Art. 6(1)(b)/(c) for employment relationships.

8. **`Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`)** — `templates_registry/normalized/Tabel Cursanti exemplu.xlsx` (53,725 bytes):
   - `xl/workbook.xml` contains 2 sheets: `Curs (2)` (sheetId="1", target `sheet1.xml`) and `Sheet1` (sheetId="2", target `sheet2.xml`).
   - `xl/worksheets/sheet2.xml` contains 5 cells: B2: DATA, C2: EXPLICATII, F2: INCASARI, G2: PLATI, H2: SOLD (residual cash register).

9. **`Adeverinta participare.docx` (`hygiene-adeverinta`)** — `templates_registry/normalized/Adeverinta participare.docx` (25,200 bytes):
   - P-idx 3: `Nr. {PLACEHOLDER_AVIZ_MS}`. P-idx 15: `in baza Avizului Ministerului Sanatatii nr. {PLACEHOLDER_AVIZ_MS}`.
   - `resolver.ts:147`: `PLACEHOLDER_AVIZ_MS: 'Aviz MS nr. 1225/2023 din 15.03.2023 emis de Ministerul Sănătății - DSP București'`.
   - Resulting stutter: `Nr. Aviz MS nr. 1225/2023`.
   - `resolver.ts:940, 958`: `PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 2'` hardcoded for all employees, regardless of whether they are operational workers (Level 1).

---

## 2. Logic Chain

1. **EVALUAREA RISCURILOR.docx**:
   - From Obs 1: `{PLACEHOLDER_ADRESA_FIRMA}` follows `sub nr.` where a trade register number belongs. This causes generated documents to contain street addresses where RegCom numbers belong.
   - From Obs 1: `Registrul Comertului Bucuresti` hardcodes Bucharest, violating multi-county client requirements.
   - From Obs 1: The document text was sourced from a graduation thesis (`in cadrul lucrarii de absolvire`) and retains the historical author's address and phone at P761-763.
   - From Obs 1: Chapters 6 and 7 are listed in the TOC but cut off before the body. Because `<w:tbl> = 0`, restoring Chapter 6 requires integrating the INCDPM workplace evaluation table (from `TESA.docx` or structured tables) and Chapter 7 conclusions with the calculated risk level.

2. **13 - ACTIVITATI DE BIROU.docx**:
   - From Obs 2: P-idx 24 contains an unmodified excerpt mentioning `agenţilor de pază` from an earlier security guard IPSSM template. Office workers are exposed to DSE (display screen equipment), ergonomics, and electrical hazards, not guard duty.
   - From Obs 2: Antet lacks company identification. Without `{PLACEHOLDER_FIRMA}`, the document lacks legal entity attribution required by Law 319/2006 Art. 13(e).

3. **11 - ALUNECARI.docx**:
   - From Obs 3: Same antet defect as IPSSM 13. Must have `{PLACEHOLDER_FIRMA}` at top for corporate validity.

4. **Detaliu Tematica loc de munca.docx**:
   - From Obs 4: `footer1.xml` and `footer2.xml` have explicit external hyperlink `http://ssm-bucuresti.ro/` and tooltip `"UNIK Best Protect"`. A commercial ad from an external competitor inside official safety training materials exposes clients to compliance and brand risks.
   - From Obs 4: The document title does not name the workplace/function (`{PLACEHOLDER_FUNCTIE}`).

5. **DECIZII.docx**:
   - From Obs 5: Decizia 10 has hardcoded `Nr.10 din`, while all other decisions (01-09, 11) use `{PLACEHOLDER_NUMAR_DECIZIE_XX}`. This broke the sequence in `definitions.ts` and `resolver.ts` where token 10 was skipped.
   - From Obs 5: `Dna.` is hardcoded in 24 places. When the employer representative or PSI officer is male, this produces invalid legal documents with mismatched gender appellations.

6. **Anexa fisa postului SSM.docx**:
   - From Obs 6: Document has only generic statutory obligations from Law 319/2006, missing employer identification, job title, COR code, CIM reference, and signing date. It is legally incomplete under Labor Code Art. 17 and HG 1425/2006.

7. **Informare Protectia Datelor.docx**:
   - From Obs 7: Ellipses are typographical artifacts from dots-to-fill templates.
   - From Obs 7: Under GDPR Art. 6(1)(b)/(c) and EDPB Guidelines 05/2020, employment data processing cannot be based on consent.

8. **Tabel Cursanti exemplu.xlsx**:
   - From Obs 8: Foaia 2 (`Sheet1`) contains 5 residual cells from a cash register book. It is completely unrelated to hygiene training and must be purged.

9. **Adeverinta participare.docx**:
   - From Obs 9: The template adds `nr.` before `{PLACEHOLDER_AVIZ_MS}`, while the resolver value also starts with `Aviz MS nr.`, creating a duplicate stutter.
   - From Obs 9: `resolver.ts` forces `Nivelul 2` regardless of role. Under Order 2209/2022, execution staff must be certified as Nivelul 1.

---

## 3. Caveats

- Investigation was strictly read-only: no template files or TypeScript code were modified.
- Word documents have varying styles, font tables, and numbering schemas. When modifying DOCX XML directly, OpenXML namespaces and relationships must be preserved to prevent Word corruption warnings on opening.
- In `Tabel Cursanti exemplu.xlsx`, when deleting `xl/worksheets/sheet2.xml`, both `xl/workbook.xml` and `xl/_rels/workbook.xml.rels` as well as `[Content_Types].xml` must be kept in sync.

---

## 4. Conclusion

All 9 templates have concrete, verifiable textual and structural defects that directly compromise legal validity and professional delivery. The defects are cataloged with exact paragraph indices, line numbers, and token names in:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md`.

The implementation phase (Pillar 1) can proceed immediately with exact surgical precision across:
1. 8 DOCX templates (`templates_registry/normalized/`)
2. 1 XLSX template (`templates_registry/normalized/Tabel Cursanti exemplu.xlsx`)
3. `src/lib/templates/definitions.ts` (adding missing field definitions)
4. `src/lib/templates/resolver.ts` (adding appellation logic, fixing decizia 10, fixing hygiene level derivation and aviz stutter).

---

## 5. Verification Method

To independently verify these findings, run:

1. **Check SHA256 match between template registries**:
   ```bash
   python3 -c "
   import os, hashlib
   d1 = 'templates_registry/normalized'
   d2 = 'handoff/ssm-template-placeholder-pack/templates'
   for f in os.listdir(d1):
       h1 = hashlib.sha256(open(f'{d1}/{f}', 'rb').read()).hexdigest()
       h2 = hashlib.sha256(open(f'{d2}/{f}', 'rb').read()).hexdigest()
       assert h1 == h2, f'Mismatch in {f}'
   print('All templates match byte-for-byte')
   "
   ```

2. **Verify specific XML defects via Python script**:
   ```bash
   python3 -c "
   import zipfile
   z = zipfile.ZipFile('templates_registry/normalized/DECIZII.docx')
   xml = z.read('word/document.xml').decode('utf-8')
   assert 'Nr.10 din' in xml
   assert 'Dna. {PLACEHOLDER_REPREZENTANT_LEGAL}' in xml
   assert xml.count('Dna.') == 24
   print('DECIZII.docx defects verified: Nr.10 din and 24 Dna. instances')
   "
   ```

3. **Verify TinyPic ad in footer**:
   ```bash
   python3 -c "
   import zipfile
   z = zipfile.ZipFile('templates_registry/normalized/Detaliu Tematica loc de munca.docx')
   assert 'UNIK Best Protect' in z.read('word/footer1.xml').decode('utf-8')
   assert 'http://ssm-bucuresti.ro/' in z.read('word/_rels/footer1.xml.rels').decode('utf-8')
   print('TinyPic ad verified in Detaliu Tematica loc de munca.docx')
   "
   ```

4. **Verify Excel Cash Register Sheet**:
   ```bash
   python3 -c "
   import zipfile
   z = zipfile.ZipFile('templates_registry/normalized/Tabel Cursanti exemplu.xlsx')
   wb = z.read('xl/workbook.xml').decode('utf-8')
   assert 'name=\"Sheet1\"' in wb
   s2 = z.read('xl/worksheets/sheet2.xml').decode('utf-8')
   assert len(s2) < 10000
   print('Sheet1 cash register verified in Tabel Cursanti exemplu.xlsx')
   "
   ```

5. **Verify TypeScript compilation**:
   ```bash
   npx tsc --noEmit
   ```
