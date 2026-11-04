# Handoff Report: Template Specification & Placeholder Catalog

**Agent**: Explorer 2 (Template Spec Miner)  
**Workspace**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_spec_miner_2/`  
**Recipient**: Orchestrator (`24ce85c8-5dd2-4649-94bf-3b3a1567784b`)  
**Data**: 2026-11-01  
**Tip Handoff**: Hard (Misiune completă)

---

## 1. Observation

1. **Enumerarea fizică a șabloanelor**:
   În directorul `/Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/templates` au fost identificate exact **28 de fișiere**:
   - 23 șabloane Word (`.docx`)
   - 2 registre Excel (`.xlsx`): `Anexe Curs igiena.xlsx` (8 foi) și `Tabel Cursanti exemplu.xlsx` (2 foi)
   - 3 fișiere PDF complementare: `Cerere angajare.pdf`, `Declaratie luare cunostinta RI.pdf`, `Declaratie pe proprie raspundere CIM.pdf`.
   Un număr identic de fișiere (28) este replicat în `/Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/`.

2. **Inspecție programmatică directă la nivel de XML (zipfile + ElementTree)**:
   - Toate cele 23 de fișiere `.docx` folosesc delimitatorul de tip acoladă simplă: `{PLACEHOLDER_NUME_CAMP}`.
   - Ambele fișiere `.xlsx` folosesc token-uri text simple fără acolade: `PLACEHOLDER_NUME_CAMP`, iar seriile de cursanți folosesc sufixe numerice cu 3 cifre (`_001` până la `_195`).
   - Cele 3 fișiere `.pdf` **nu au câmpuri AcroForm** (`Has /AcroForm: False`, `Has /Fields: False`) și nu conțin token-uri în fluxurile comprimate/decomprimate; sunt randări vizuale statice de referință.

3. **Discrepanțe critice de drift față de `INVENTAR_PLACEHOLDERE.md`**:
   - `TESA.docx`: Conține exact 103 token-uri unice. Seria factorilor de risc folosește numele lungi `{PLACEHOLDER_GRAVITATE_RISC_01..30}`, `{PLACEHOLDER_FRECVENTA_RISC_01..30}`, `{PLACEHOLDER_NIVEL_PARTIAL_RISC_01..30}`. Token-urile scurte menționate în documentație (`G01`, `F01`, `N01`), precum și token-urile `PLACEHOLDER_CATEGORIE_RISC` și `PLACEHOLDER_GRAFIC_*` **nu există** în fișierul real.
   - `EVALUAREA RISCURILOR.docx`: Conține 16 token-uri. În fișier apar `{PLACEHOLDER_CONCLUZII_EVALUARE}` și `{PLACEHOLDER_NIVEL_RISC_GLOBAL}`, dar **lipsesc** `PLACEHOLDER_ADRESA_PRESTATOR`, `PLACEHOLDER_NUMAR_REG_COMERT`, `PLACEHOLDER_TELEFON_PRESTATOR`.
   - `Plan de Prevenire TESA.docx`: Conține 4 token-uri: `FIRMA`, `PRESTATOR_SSM`, `SPECIALIST_SSM` și `{PLACEHOLDER_REPREZENTANT_LEGAL}` (ultimul fiind omis în documentația scrisă).
   - `Cerere angajare.docx`: Conține 11 token-uri. Token-ul `PLACEHOLDER_LOCALITATE_DOMICILIU` lipsește, fiind utilizat exclusiv `{PLACEHOLDER_ADRESA_DOMICILIU}`.
   - `INFO dosar personal.docx`: Conține 0 token-uri (este checklist informativ static). În `src/lib/templates/definitions.ts` fusese introdus eronat câmpul fals `_Fără token-uri detectate._`.

4. **Amplasare în Antete/Subsoluri și Quirk-uri Relaționale**:
   - `word/footer1.xml` în `Tematica introductiv generala 4h.docx` și `Tematica loc de munca.docx` conține `{PLACEHOLDER_EMAIL_PRESTATOR}` și `{PLACEHOLDER_TELEFON_PRESTATOR}`.
   - În plus, `word/_rels/footer1.xml.rels` din ambele fișiere conține legătura `Target="mailto:PLACEHOLDER_EMAIL_PRESTATOR"`.
   - `word/header1.xml` și `word/header2.xml` în `Detaliu Tematica introductiv generala.docx`, `Detaliu Tematica loc de munca.docx`, `Plan actiune pericol grav si iminent.docx` și `Zone pericol grav si iminent.docx` conțin `{PLACEHOLDER_FIRMA}`.

---

## 2. Logic Chain

1. **Premisă**: Pentru ca sistemul să genereze toate cele 25 de șabloane fără token-uri nepopulate (Acceptance Criteria R1 & R4), generatorul trebuie să cunoască lista exactă a token-urilor existente pe disc, nu specificații textuale desincronizate.
2. **Constatare**: Compararea programmatică a token-urilor extrase din XML-ul fișierelor cu `INVENTAR_PLACEHOLDERE.md` a dovedit existența a 5 discrepanțe majore (în special TESA cu 90 de token-uri lungi în loc de forme abreviate, token-ul de aprobare din Planul de Prevenire și token-urile din antete/subsoluri).
3. **Deducție**: Dacă un motor de generare ar fi implementat bazându-se pe `INVENTAR_PLACEHOLDERE.md`, documentele `TESA.docx`, `EVALUAREA RISCURILOR.docx` și `Plan de Prevenire TESA.docx` ar fi fost marcate perpetuu ca având erori / câmpuri lipsă (`missing_data`), iar antetele și subsolurile nu ar fi fost populate.
4. **Validare cod existent**: În `src/lib/templates/definitions.ts`, catalogul tehnic a fost parțial aliniat anterior cu fișierele reale, dar necesită curățarea câmpului fictiv din `INFO dosar personal.docx` și asigurarea că `generator.ts` scanează toate părțile XML (document, headers, footers, rels).
5. **Concluzie**: Catalogul complet, exhaustiv și corect al tuturor celor 25 de șabloane a fost redactat în `template_spec.md`, incluzând modelul de date necesar pentru a asigura auto-completarea integrală.

---

## 3. Caveats

- **Generarea PDF**: Cele 3 PDF-uri nu sunt formulare fillable. Pentru a le genera cu date, aplicația trebuie fie să folosească overlay vizual (cum este implementat în `generator.ts` cu `pdf-lib`), fie să convertească variantele DOCX corespondente în PDF.
- **Date profesionale de risc**: În `TESA.docx` și `EVALUAREA RISCURILOR.docx`, factorii de risc și măsurile cer input sau confirmare de la evaluatorul uman atestat; sistemul nu trebuie să genereze scoruri sintetice arbitrare în absența evaluării.
- **Capacitate Excel**: În foile de catalog din `Anexe Curs igiena.xlsx`, dacă o sesiune are mai puțini de 100 sau 195 de cursanți, celulele excedentare trebuie setate la string vid (`""`), altfel vor rămâne token-uri brute vizibile.

---

## 4. Conclusion

- Toate cele 25 de șabloane DOCX și XLSX au fost catalogate cu succes și fără excepții.
- Fișierul `template_spec.md` din `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_spec_miner_2/template_spec.md` constituie sursa unică autoritară de specificație tehnică pentru faza de implementare.
- Recomandările privind modelul unificat de date permit maparea completă a datelor de Firmă, Angajat, Post, Punct de lucru, Evaluare Risc și Sesiune de Igienă.

---

## 5. Verification Method

Oricare agent sau dezvoltator poate verifica instant acuratețea acestui raport rulând următoarele comenzi în terminal:

1. **Verificare total token-uri DOCX**:
   ```bash
   python3 -c "import zipfile, re, os; dir='handoff/ssm-template-placeholder-pack/templates'; [print(f, len(set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', zipfile.ZipFile(os.path.join(dir, f)).read('word/document.xml').decode('utf-8'))))) for f in sorted(os.listdir(dir)) if f.endswith('.docx')]"
   ```
2. **Verificare token-uri TESA.docx**:
   ```bash
   python3 -c "import zipfile, re; z=zipfile.ZipFile('handoff/ssm-template-placeholder-pack/templates/TESA.docx'); tokens=set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', z.read('word/document.xml').decode('utf-8'))); print('Total:', len(tokens)); print('Are GRAVITATE_RISC_01:', 'PLACEHOLDER_GRAVITATE_RISC_01' in tokens); print('Are G01:', 'PLACEHOLDER_G01' in tokens)"
   ```
   *Rezultat așteptat*: `Total: 103`, `Are GRAVITATE_RISC_01: True`, `Are G01: False`.
3. **Verificare antete și subsoluri cu token-uri**:
   ```bash
   python3 -c "import zipfile, re, os; dir='handoff/ssm-template-placeholder-pack/templates'; [print(f, n, set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', zipfile.ZipFile(os.path.join(dir, f)).read(n).decode('utf-8')))) for f in os.listdir(dir) if f.endswith('.docx') for n in zipfile.ZipFile(os.path.join(dir, f)).namelist() if ('header' in n or 'footer' in n) and set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', zipfile.ZipFile(os.path.join(dir, f)).read(n).decode('utf-8')))]"
   ```
