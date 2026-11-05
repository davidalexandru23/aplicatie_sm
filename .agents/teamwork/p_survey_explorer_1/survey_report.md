# Raport Exhaustiv de Audit și Survey: Șabloanele din Pilonul 1

**Data auditului:** 2026-11-04  
**Auditor:** `p_survey_explorer_1` (Teamwork Explorer)  
**Obiectiv:** Investigarea detaliată, la nivel de fișier fizic, arhivă ZIP, scheme XML (`word/document.xml`, `header*.xml`, `footer*.xml`, `xl/worksheets/`), tabele, relații (`.rels`) și text a celor 9 șabloane vizate de **Pilonul 1 (Rectificarea Textuală a Șabloanelor Existente)** din Planul Strategic SSM / Igienă / HR.  
**Locație fișiere inspectate:**
- `templates_registry/normalized/` (șabloanele utilizate direct de generatorul aplicației)
- `handoff/ssm-template-placeholder-pack/templates/` (verificat identic byte-cu-byte SHA256)
- `src/lib/templates/definitions.ts` (catalogul de definiții)
- `src/lib/templates/resolver.ts` (motorul de mapare și injectare a datelor)

---

## 1. Sinteza Executivă a Constatărilor

Toate cele 9 șabloane au fost dezarhivate, inspectate la nivel de XML și confruntate cu motorul de rezolvare și catalogul de definiții. Au fost identificate 5 tipuri majore de deficiențe:
1. **Erori materiale de tokenizare:** tokenuri duplicate greșit (ex. adresa firmei injectată în locul numărului de înregistrare la Registrul Comerțului în `EVALUAREA RISCURILOR.docx`);
2. **Reziduuri istorice din documente sursă:** texte aparținând unor companii terțe, lucrări de diplomă universitare („în cadrul lucrării de absolvire”), reclame comerciale externe în subsol (`UNIK Best Protect` via TinyPic), referințe inadecvate la „agenți de pază” în instrucțiuni de birou și foi contabile de „Registru de Casă” în tabele de igienă;
3. **Erori sistematice de gen:** apelativul feminin `Dna.` forțat static în 24 de locuri în `DECIZII.docx`, generând formulări de gen greșite pentru administratori bărbați;
4. **Vicii juridice GDPR:** invocarea consimțământului în loc de Art. 6(1)(b)/(c) GDPR în relațiile de muncă, alături de puncte de suspensie reziduale;
5. **Decuplare structurală în cod:** tokenuri absente din `definitions.ts` și `resolver.ts` (ex. `PLACEHOLDER_NUMAR_DECIZIE_10`, apelativele `Dl.`/`Dna.`, codurile COR și CIM în fișa postului).

---

## 2. Matricea de Sinteză a Celor 9 Șabloane

| Nr. | Șablon / Fișier | Cod Catalog | Format | Nr. Tabele (`<w:tbl>`) | Deficiențe Critice Identificate |
|:---:|:---|:---|:---:|:---:|:---|
| 1 | `EVALUAREA RISCURILOR.docx` | `risk-evaluare` | DOCX | 0 | Token RegCom eronat (`{PLACEHOLDER_ADRESA_FIRMA}`); text static „București”; date de contact evaluator hardcodate; text de licență („lucrării de absolvire”); Capitolele 6 și 7 lipsesc complet din corpul documentului. |
| 2 | `13 - ACTIVITATI DE BIROU.docx` | `ipssm-birou` | DOCX | 0 | Reziduu „agenților de pază” la P24; `{PLACEHOLDER_FIRMA}` lipsește complet din antet și text; lipsește din `definitions.ts`. |
| 3 | `11 - ALUNECARI.docx` | `ipssm-alunecari` | DOCX | 0 | `{PLACEHOLDER_FIRMA}` lipsește complet din antet și din `definitions.ts`. |
| 4 | `Detaliu Tematica loc de munca.docx` | `training-detaliu-loc-munca` | DOCX | 0 | Reclamă TinyPic comercială cu link `http://ssm-bucuresti.ro/` în `footer1.xml` și `footer2.xml`; lipsește `{PLACEHOLDER_FUNCTIE}`. |
| 5 | `DECIZII.docx` | `decizii-angajator` | DOCX | 1 | Decizia 10 are număr fix („Nr.10 din”); 24 de apariții `Dna.` hardcodat; `PLACEHOLDER_NUMAR_DECIZIE_10` și apelativele lipsesc din `definitions.ts` și `resolver.ts`. |
| 6 | `Anexa fisa postului SSM.docx` | `hr-anexa-fisa-post` | DOCX | 3 | Doar 2 tokenuri prezente; lipsesc `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`, număr CIM și data semnării. |
| 7 | `Informare Protectia Datelor.docx` | `hr-gdpr-informare` | DOCX | 0 | Bază legală pe consimțământ (invalid EDPB); puncte de suspensie reziduale `…` la P12, P16, P17. |
| 8 | `Tabel Cursanti exemplu.xlsx` | `hygiene-tabel-cursanti` | XLSX | N/A | Foaia secundară `Sheet1` conține un tabel rezidual de Registru de Casă contabilă. |
| 9 | `Adeverinta participare.docx` | `hygiene-adeverinta` | DOCX | 1 | Stutter de text `Nr. Aviz MS nr.`; forțare statică pe `Nivelul 2` pentru toți salariații de execuție în `resolver.ts`. |

---

## 3. Investigarea Detaliată a Fiecărui Șablon

### 3.1. `EVALUAREA RISCURILOR.docx` (`risk-evaluare`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/EVALUAREA RISCURILOR.docx` (30.721 octeți)
- Fișiere XML interne: `word/document.xml`, `word/header1.xml` (gol), `word/header2.xml` (gol), `word/header3.xml` (gol), `word/footer1.xml` (gol), `word/footer2.xml` (gol), `word/footer3.xml` (gol).
- Tabele Word native: `<w:tbl> = 0`. Documentul folosește taburi și spații pentru alinierea tabelelor de metodologie.

#### Observații Verbatim & Erori Identificate

1. **Eroarea de Token RegCom și Județ Static (Antet):**
   - **Locație:** `word/document.xml`, P-idx 69 (paragraful 18 de text).
   - **Text verbatim:**
     ```text
     Societatea {PLACEHOLDER_FIRMA} cu sediul in {PLACEHOLDER_ADRESA_FIRMA}, inregistrata la Registrul Comertului Bucuresti sub nr. {PLACEHOLDER_ADRESA_FIRMA}, CUI {PLACEHOLDER_CUI} este infiintata in anul {PLACEHOLDER_AN_INFIINTARE}.
     ```
   - **Probleme:**
     - Tokenul `{PLACEHOLDER_ADRESA_FIRMA}` este duplicat după sintagma `sub nr.`, în loc de `{PLACEHOLDER_NR_REG_COM}`. Documentul generat va afișa: *„sub nr. Str. Exemplu nr. 1, Sector 1...”*.
     - Sintagma `Registrul Comertului Bucuresti` conține localitatea statică *București*, fiind eronată pentru orice societate din provincie (ex. Cluj, Timiș, Iași).
   - **Remediere:**
     ```text
     Societatea {PLACEHOLDER_FIRMA} cu sediul in {PLACEHOLDER_ADRESA_FIRMA}, inregistrata la Registrul Comertului sub nr. {PLACEHOLDER_NR_REG_COM}, CUI {PLACEHOLDER_CUI} este infiintata in anul {PLACEHOLDER_AN_INFIINTARE}.
     ```

2. **Date de Contact Hardcodate ale Evaluatorului / Prestatorului Istoric:**
   - **Locație:** `word/document.xml`, P-idx 970 (paragrafele 760–765).
   - **Text verbatim:**
     ```text
     Evaluare intocmita de Societatea {PLACEHOLDER_PRESTATOR_SSM}
      Bucuresti , str Petcu Avram nr 6 , sector 4, 
     CERTIFICAT DE ABILITARE NR {PLACEHOLDER_CERTIFICAT_EVALUATOR}
     CONTACT: 0040 723.60.13.84
     e-mail: {PLACEHOLDER_EMAIL_PRESTATOR}
     Website: {PLACEHOLDER_SITE_PRESTATOR}
     ```
   - **Probleme:** Adresa `Bucuresti , str Petcu Avram nr 6 , sector 4, ` și numărul de telefon `0040 723.60.13.84` sunt hardcodate în corpul documentului.
   - **Remediere:** Înlocuire cu tokenuri sau date configurabile: `{PLACEHOLDER_ADRESA_PRESTATOR}`, `{PLACEHOLDER_TELEFON_PRESTATOR}`.

3. **Text Rezidual din Lucrare Academică („lucrării de absolvire”):**
   - **Locație:** `word/document.xml`, P-idx 336 (paragraful 200).
   - **Text verbatim:**
     ```text
     Din multitudinea de metode utilizate pe plan mondial si national pentru evaluarea riscurilor de accidentare si imbolnavire profesionala, in cadrul lucrarii de absolvire s-a optat pentru utilizarea metodei elaborate de I.N.C.D.P.M. Bucuresti.
     ```
   - **Remediere:** Înlocuire `in cadrul lucrarii de absolvire` cu `in cadrul prezentei evaluari de securitate si sanatate in munca`.

4. **Corupere de Text în Tabelele Anexei INCDPM (Înlocuiri Automate Eronate):**
   - **Locații:** P-idx 524, 711.
   - **Exemple:**
     - `x2.Contuzie{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx3.Entorsa---------xxxxxx-------4.Strivire{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
     - `19.Tumori maligne, cancer profesional{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
     - `28.Boala de iradiere{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
     - `30.Boli infectioase si parazitare{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
     - La P-idx 175 și 337: `{PLACEHOLDER_NIVEL_RISC_GLOBAL} - {PLACEHOLDER_CONCLUZII_EVALUARE}` a fost injectat în mijlocul frazelor.
   - **Remediere:** Restaurarea tabelelor curate INCDPM și eliminarea tokenurilor rătăcite din mijlocul frazelor.

5. **Capitolele 6 și 7 Lipsesc Complet din Corpul Documentului:**
   - **Locație:** Cuprinsul (P-idx 51–55) promite:
     - `Capitolul 5 Anexe utilizate in evaluarea riscurilor profesionale`
     - `Capitolul 6 Evaluarea posturilor de lucru: {PLACEHOLDER_FUNCTIE}`
     - `Capitolul 7 Concluzii`
   - **Realitate:** Documentul se termină brusc la paragraful 791 cu diagrama utilajelor din EN 292. Capitolele 6 și 7 nu există deloc în corpul documentului!
   - **Soluție de Reintegrare:**
     - **Capitolul 6:** Se introduce secțiunea de evaluare efectivă pe post (fișa INCDPM Pece cu componentele sistemului de muncă, factori de risc, gravitate, probabilitate și nivel parțial de risc, structură identică cu fișa din `TESA.docx`).
     - **Capitolul 7:** Se introduce secțiunea de concluzii cu nivelul global de risc calculat (`{PLACEHOLDER_NIVEL_RISC_GLOBAL}`), sinteza măsurilor recomandate (`{PLACEHOLDER_CONCLUZII_EVALUARE}`) și blocul de semnături al comisiei de evaluare.

---

### 3.2. `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/13 - ACTIVITATI DE BIROU.docx` (18.026 octeți)
- Fișiere XML interne: `word/document.xml` (177 paragrafe), headers/footers fără text.
- Tabele Word native: `<w:tbl> = 0`.

#### Observații Verbatim & Erori Identificate

1. **Reziduu Istoric „agenților de pază”:**
   - **Locație:** `word/document.xml`, P-idx 24.
   - **Text verbatim:**
     ```text
     Instrucţiunile prezente completeaza si detaliaza (ţinând seama de particularităţile activităţii agenţilor de pază şi ale locurilor de muncă aflate în responsabilitatea lor), prevederile următoarelor acte normative:
     ```
   - **Problemă:** Într-o instrucțiune de SSM destinată personalului de birou/IT, textul face referire la paznici.
   - **Remediere:**
     ```text
     Instrucţiunile prezente completează şi detaliază (ţinând seama de particularităţile activităţilor de birou, lucrului cu echipamente cu ecran de vizualizare şi ale locurilor de muncă aflate în responsabilitatea salariaţilor), prevederile următoarelor acte normative:
     ```

2. **Lipsa Totală a Denumirii Firmei (`{PLACEHOLDER_FIRMA}`):**
   - **Locație:** Antet (P-idx 0–2):
     ```text
     Aprobat
     ADMINISTRATOR
     {PLACEHOLDER_REPREZENTANT_LEGAL}
     ```
   - **Probleme:**
     - Documentul nu conține nicăieri denumirea angajatorului (`PLACEHOLDER_FIRMA`).
     - În `definitions.ts` (l. 105–132), `fields` conține doar `PLACEHOLDER_REPREZENTANT_LEGAL` și `PLACEHOLDER_SPECIALIST_SSM`.
   - **Remediere:**
     - Adăugare `{PLACEHOLDER_FIRMA}` în blocul antetului:
       ```text
       {PLACEHOLDER_FIRMA}
       Aprobat,
       ADMINISTRATOR
       {PLACEHOLDER_REPREZENTANT_LEGAL}
       ```
     - Adăugare `PLACEHOLDER_FIRMA` în `definitions.ts` (source: `client.name`, required: `true`).

---

### 3.3. `11 - ALUNECARI.docx` (`ipssm-alunecari`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/11 - ALUNECARI.docx` (11.089 octeți)
- Fișiere XML interne: `word/document.xml` (60 paragrafe), headers/footers fără text.
- Tabele Word native: `<w:tbl> = 0`.

#### Observații Verbatim & Erori Identificate

1. **Lipsa Totală a Denumirii Firmei (`{PLACEHOLDER_FIRMA}`):**
   - **Locație:** Antet (P-idx 0–2):
     ```text
     Aprobat
     ADMINISTRATOR
     {PLACEHOLDER_REPREZENTANT_LEGAL}
     ```
   - **Final (P-idx 68–69):**
     ```text
     Serviciu extern de prevenire şi protecţie
     {PLACEHOLDER_SPECIALIST_SSM}
     ```
   - **Probleme:**
     - Documentul nu conține identificarea angajatorului emitent.
     - În `definitions.ts` (l. 40–67), șablonul are mapate doar două câmpuri: `PLACEHOLDER_REPREZENTANT_LEGAL` și `PLACEHOLDER_SPECIALIST_SSM`.
   - **Remediere:**
     - Adăugare `{PLACEHOLDER_FIRMA}` la începutul documentului:
       ```text
       {PLACEHOLDER_FIRMA}
       Aprobat,
       ADMINISTRATOR
       {PLACEHOLDER_REPREZENTANT_LEGAL}
       ```
     - Adăugare `PLACEHOLDER_FIRMA` în `definitions.ts` (source: `client.name`, required: `true`).

---

### 3.4. `Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/Detaliu Tematica loc de munca.docx` (122.131 octeți)
- Fișiere XML interne: `word/document.xml`, `word/header1.xml`, `word/header2.xml`, `word/footer1.xml`, `word/footer2.xml`, `word/_rels/footer1.xml.rels`, `word/_rels/footer2.xml.rels`.

#### Observații Verbatim & Erori Identificate

1. **Reclamă Comercială Externe în Subsol (`UNIK Best Protect` / TinyPic):**
   - **Locație XML:** `word/footer1.xml` și `word/footer2.xml`.
   - **Marcaj XML verbatim:**
     ```xml
     <wp:docPr id="110341619" name="Picture 1" descr="Logo">
       <a:hlinkClick r:id="rId1" tooltip="&quot;UNIK Best Protect&quot; t "/>
     </wp:docPr>
     <pic:nvPicPr>
       <pic:cNvPr id="0" name="Picture 1" descr="Image and video hosting by TinyPic"/>
     </pic:nvPicPr>
     <pic:blipFill>
       <a:blip r:embed="rId2"/>
     </pic:blipFill>
     ```
   - **Fișiere de relații (`footer1.xml.rels` și `footer2.xml.rels`):**
     ```xml
     <Relationship Id="rId2" Type=".../relationships/image" Target="media/image14.jpeg"/>
     <Relationship Id="rId1" Type=".../relationships/hyperlink" Target="http://ssm-bucuresti.ro/" TargetMode="External"/>
     ```
   - **Probleme:** În fiecare subsol există o imagine de reclamă comercială a unei alte firme de protecția muncii („UNIK Best Protect”), găzduită istoric pe TinyPic și cu link extern către `http://ssm-bucuresti.ro/`.
   - **Remediere:**
     - Eliminarea desenului `<w:drawing>` din `word/footer1.xml` și `word/footer2.xml`;
     - Ștergerea relațiilor `rId1` și `rId2` din `word/_rels/footer1.xml.rels` și `word/_rels/footer2.xml.rels`;
     - Eliminarea fișierului `word/media/image14.jpeg`.

2. **Lipsa Funcției / Postului Documentat (`{PLACEHOLDER_FUNCTIE}`):**
   - **Locație:** `word/document.xml`, P-idx 4–5:
     ```text
     DETALIU LA TEMATICA
     PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA
     ```
   - **Probleme:** Titlul este generic, fără a preciza funcția sau postul pentru care este emis documentul. În `definitions.ts` (l. 1760–1787) lipsesc postul și funcția.
   - **Remediere:**
     - Actualizare titlu în:
       ```text
       DETALIU LA TEMATICA PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA
       PENTRU POSTUL DE: {PLACEHOLDER_FUNCTIE}
       ```
     - Adăugare `PLACEHOLDER_FUNCTIE` în `definitions.ts` (source: `job.title`, required: `true`).

---

### 3.5. `DECIZII.docx` (`decizii-angajator`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/DECIZII.docx` (67.183 octeți)
- Fișiere XML interne: `word/document.xml` (332 paragrafe), 1 tabel (`<w:tbl> = 1`).

#### Observații Verbatim & Erori Identificate

1. **Decizia 10 cu Număr Fix în Text:**
   - **Locație:** `word/document.xml`, P-idx 419–420.
   - **Text verbatim:**
     ```text
     [419]: DECIZIA
     [420]: Nr.10 din {PLACEHOLDER_DATA_DECIZIE}
     ```
   - **Comparație:**
     - Decizia 09: `Nr. {PLACEHOLDER_NUMAR_DECIZIE_09} din {PLACEHOLDER_DATA_DECIZIE}`
     - Decizia 10: `Nr.10 din {PLACEHOLDER_DATA_DECIZIE}` ❌
     - Decizia 11: `Nr. {PLACEHOLDER_NUMAR_DECIZIE_11} din {PLACEHOLDER_DATA_DECIZIE}`
   - **Stare în cod:**
     - În `definitions.ts` (l. 1340–1342): sare direct de la `PLACEHOLDER_NUMAR_DECIZIE_09` la `PLACEHOLDER_NUMAR_DECIZIE_11`. `PLACEHOLDER_NUMAR_DECIZIE_10` lipsește!
     - În `resolver.ts` (l. 81–82, 669–670): sare direct de la 09 la 11.
   - **Remediere:**
     - În DOCX: `Nr. {PLACEHOLDER_NUMAR_DECIZIE_10} din {PLACEHOLDER_DATA_DECIZIE}`
     - În `definitions.ts`: adăugare câmp `PLACEHOLDER_NUMAR_DECIZIE_10`.
     - În `resolver.ts`: adăugare generare `PLACEHOLDER_NUMAR_DECIZIE_10: 10/${decisionsDateRo}`.

2. **Apelativ Feminin Hardcodat (`Dna.`) în 24 de Locuri:**
   - **Inventar exact:**
     - **13 apariții Administrator (`Dna. {PLACEHOLDER_REPREZENTANT_LEGAL}`):**
       - Decizia 02: P-idx 49
       - Decizia 03: P-idx 101, 113
       - Decizia 04: P-idx 125
       - Decizia 05: P-idx 176, 180, 183
       - Decizia 06: P-idx 201
       - Decizia 07: P-idx 224
       - Decizia 08: P-idx 255
       - Decizia 09: P-idx 397
       - Decizia 10: P-idx 421
       - Decizia 11: P-idx 444
     - **10 apariții Cadru Tehnic PSI (`Dna. {PLACEHOLDER_RESPONSABIL_PSI}`):**
       - Decizia 06: P-idx 203, 215
       - Decizia 07: P-idx 249
       - Decizia 08: P-idx 262, 267
       - Decizia 09: P-idx 402, 405
       - Decizia 10: P-idx 431
       - Decizia 11: P-idx 452, 453, 459, 463
     - **1 apariție Membru Comisie (`Dna. {PLACEHOLDER_MEMBRU_COMISIE}`):**
       - Decizia 11: P-idx 458
   - **Probleme:** Pentru administratori și responsabili bărbați (ex. *Popescu Ion*), documentul generează: *„Dna. Popescu Ion în calitate de administrator...”*.
   - **Remediere:**
     - Înlocuire `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL}` cu `{PLACEHOLDER_APELATIV_ADMINISTRATOR} {PLACEHOLDER_REPREZENTANT_LEGAL}`.
     - Înlocuire `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` cu `{PLACEHOLDER_APELATIV_PSI} {PLACEHOLDER_RESPONSABIL_PSI}`.
     - Înlocuire `Dna. {PLACEHOLDER_MEMBRU_COMISIE}` cu `{PLACEHOLDER_APELATIV_MEMBRU_COMISIE} {PLACEHOLDER_MEMBRU_COMISIE}`.
     - Implementare funcție de deducție automată a apelativului (`Dl.` / `Dna.`) în `resolver.ts` după prenume / CNP / configurare explicită.

---

### 3.6. `Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/Anexa fisa postului SSM.docx` (26.720 octeți)
- Fișiere XML interne: `word/document.xml` (37 paragrafe), 3 tabele (`<w:tbl> = 3`).

#### Observații Verbatim & Erori Identificate

1. **Lipsește Identificarea Completă a Relației de Muncă:**
   - **Tokenuri curente:** Conține doar 2 tokenuri: `{PLACEHOLDER_REPREZENTANT_LEGAL}` și `{PLACEHOLDER_NUME_COMPLET}`.
   - **Tabelul 3 (final):**
     ```text
     FUNCTIA | NUME / PRENUME | SEMNĂTURA | DATA
     ADMINISTRATOR | {PLACEHOLDER_REPREZENTANT_LEGAL} | |
     SALARIAT | {PLACEHOLDER_NUME_COMPLET} | |
     ```
   - **Probleme:**
     - Lipsesc: `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`, numărul CIM și data semnării.
     - În coloana „FUNCTIA” pentru salariat este scris cuvântul static *SALARIAT* în loc de funcția efectivă a postului.
   - **Remediere:**
     - Adăugare antet firmă la începutul actului:
       ```text
       S.C. {PLACEHOLDER_FIRMA} S.R.L.
       CUI: {PLACEHOLDER_CUI}
       Anexă la Contractul Individual de Muncă nr. {PLACEHOLDER_NUMAR_CIM} din {PLACEHOLDER_DATA_CIM}
       ```
     - Actualizare Tabelul 3:
       ```text
       {PLACEHOLDER_FUNCTIE} (COR {PLACEHOLDER_COD_COR}) | {PLACEHOLDER_NUME_COMPLET} | | {PLACEHOLDER_DATA_SEMNARII}
       ```
     - Adăugare câmpuri în `definitions.ts`.

---

### 3.7. `Informare Protectia Datelor.docx` (`hr-gdpr-informare`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/Informare Protectia Datelor.docx` (8.887 octeți)
- Fișiere XML interne: `word/document.xml` (22 paragrafe), `<w:tbl> = 0`.

#### Observații Verbatim & Erori Identificate

1. **Puncte de Suspensie Reziduale (`…`):**
   - **P-idx 12 (punctul 3.3):**
     `3.3  interesul legitim al …{PLACEHOLDER_FIRMA} desfășurare în bune condiții a activitatilor sale conform obiectului de activitate.`
   - **P-idx 16 (punctul 7):**
     `...adresata ……{PLACEHOLDER_FIRMA}.`
   - **P-idx 17 (punctul 8):**
     `...cadrul firmei …………{PLACEHOLDER_FIRMA}.`
   - **Remediere:** Eliminarea caracterelor `…`, `……`, `…………`.

2. **Viciu Legal de Conformitate GDPR (Consimțământ vs Obligație Legală):**
   - **P-idx 18:**
     ```text
     Mentionez ca in exprimarea consimtamantului nu am fost influentat sau constrans, sens in care imi exprim acordul liber si in cunostinta de cauza.
     ```
   - **Problema de Drept:** Conform Ghidului EDPB 05/2020 și practicii ANSPDCP, în relațiile de muncă consimțământul salariatului nu este valabil din cauza dezechilibrului de putere. Temeiul juridic real este:
     - Art. 6 alin. (1) lit. (b) GDPR — executarea contractului de muncă;
     - Art. 6 alin. (1) lit. (c) GDPR — îndeplinirea obligațiilor legale (Codul Muncii, Legea 319/2006 SSM, Codul Fiscal);
     - Art. 9 alin. (2) lit. (b) GDPR — date privind starea de sănătate (medicina muncii).
   - **Remediere:** Înlocuirea textului cu declarația de luare la cunoștință a informării (și nu „acord/consimțământ”).

---

### 3.8. `Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/Tabel Cursanti exemplu.xlsx` (53.725 octeți)
- Fișiere XML interne: `xl/workbook.xml`, `xl/worksheets/sheet1.xml` (501.346 octeți), `xl/worksheets/sheet2.xml` (9.669 octeți), `xl/sharedStrings.xml`.

#### Observații Verbatim & Erori Identificate

1. **Prezența Foii Reziduale Contabile `Sheet1` (Registru de Casă):**
   - În `xl/workbook.xml`:
     - Foaia 1: `name="Curs (2)"`, `sheetId="1"`, `r:id="R0a14a9e376694b5a"` (foaia reală de examen igienă, cu 115 sloturi indexate).
     - Foaia 2: `name="Sheet1"`, `sheetId="2"`, `r:id="R4c6ece356eca47f3"`.
   - În `xl/worksheets/sheet2.xml`: conține exact 5 celule:
     - B2: `DATA`
     - C2: `EXPLICATII`
     - F2: `INCASARI`
     - G2: `PLATI`
     - H2: `SOLD`
   - **Remediere:**
     1. Ștergere element `<x:sheet name="Sheet1" ... />` din `xl/workbook.xml`;
     2. Ștergere relație `R4c6ece356eca47f3` din `xl/_rels/workbook.xml.rels`;
     3. Ștergere override din `[Content_Types].xml`;
     4. Eliminare fișier fizic `xl/worksheets/sheet2.xml` din arhivă.

---

### 3.9. `Adeverinta participare.docx` (`hygiene-adeverinta`)

#### Structură Arhivă & Fișiere
- Fișier: `templates_registry/normalized/Adeverinta participare.docx` (25.200 octeți)
- Fișiere XML interne: `word/document.xml` (14 paragrafe), 1 tabel (`<w:tbl> = 1`).

#### Observații Verbatim & Erori Identificate

1. **Stutter de Text `Nr. Aviz MS nr.`:**
   - **Locații în DOCX:**
     - P-idx 3: `Nr. {PLACEHOLDER_AVIZ_MS}`
     - P-idx 15: `in baza Avizului Ministerului Sanatatii nr. {PLACEHOLDER_AVIZ_MS} si Ministerului Educatiei, nr. {PLACEHOLDER_AVIZ_ME}`
   - **Valoare în `resolver.ts:147`:**
     `PLACEHOLDER_AVIZ_MS: 'Aviz MS nr. 1225/2023 din 15.03.2023...'`
   - **Efect generat:** Textul rezultat conține repetiția: *„in baza Avizului Ministerului Sanatatii nr. Aviz MS nr. 1225/2023...”*.
   - **Remediere:** Standardizarea valorii injectate pentru `{PLACEHOLDER_AVIZ_MS}` și `{PLACEHOLDER_AVIZ_ME}` să conțină doar numărul și data (fără prefixul repetat `Aviz MS nr.`), adică `1225/2023 din 15.03.2023`.

2. **Forțarea Statică pe `Nivelul 2` în `resolver.ts`:**
   - **Locație în cod:** `resolver.ts:940` și `resolver.ts:958`:
     `PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 2'` (scris fix cu litere, ignorând funcția).
   - **Cadrul Legal (Ordinul comun MS/ME 2209/4469/2022):**
     - **Nivelul 1:** Lucrători de execuție din alimentație, coafură, curățenie (bucătari, ospătari, etc.);
     - **Nivelul 2:** Personal de conducere / coordonare.
   - **Remediere:** Determinare dinamică în `resolver.ts`: dacă funcția este de conducere sau participantul are marcat nivelul 2 -> `Nivelul 2`, altfel implicit `Nivelul 1`.

---

## 4. Plan de Rectificare Tehnică (Ghid pentru Implementator)

| Pas | Fișier Țintă | Tip Modificare | Răspundere |
|:---:|:---|:---|:---|
| 1 | `EVALUAREA RISCURILOR.docx` | Înlocuire token RegCom, eliminare `Bucuresti` static, ștergere text diplomă, adăugare capitole 6 și 7 cu tabel riscuri și concluzii. | XML / DOCX |
| 2 | `13 - ACTIVITATI DE BIROU.docx` | Înlocuire sintagmă „agenților de pază” cu „personalului de birou”; adăugare `{PLACEHOLDER_FIRMA}` în antet. | XML / DOCX |
| 3 | `11 - ALUNECARI.docx` | Adăugare `{PLACEHOLDER_FIRMA}` în antet. | XML / DOCX |
| 4 | `Detaliu Tematica loc de munca.docx` | Ștergere imagine TinyPic și hyperlink `ssm-bucuresti.ro` din `footer1.xml` și `footer2.xml`; adăugare `{PLACEHOLDER_FUNCTIE}` în titlu. | XML / DOCX |
| 5 | `DECIZII.docx` | Înlocuire `Nr.10 din` cu `Nr. {PLACEHOLDER_NUMAR_DECIZIE_10} din`; înlocuire 24 x `Dna.` cu `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` și `{PLACEHOLDER_APELATIV_PSI}`. | XML / DOCX |
| 6 | `Anexa fisa postului SSM.docx` | Inserare antet firmă, CUI, funcție, cod COR, număr CIM și dată semnare. | XML / DOCX |
| 7 | `Informare Protectia Datelor.docx` | Eliminare puncte de suspensie reziduale; trecere temei legal la Art. 6(1)(b)/(c) GDPR. | XML / DOCX |
| 8 | `Tabel Cursanti exemplu.xlsx` | Eliminare foaie `Sheet1` (Registru de Casă) din `workbook.xml`, `.rels` și `[Content_Types].xml`. | XML / XLSX |
| 9 | `Adeverinta participare.docx` & `resolver.ts` | Corectare stutter `Nr. Aviz MS nr.`; calcul dinamic `Nivelul 1` vs `Nivelul 2`. | XML / TS |
| 10 | `src/lib/templates/definitions.ts` | Sincronizare câmpuri noi: `PLACEHOLDER_FIRMA` (birou, alunecări), `PLACEHOLDER_FUNCTIE` (detaliu tematică), `PLACEHOLDER_NUMAR_DECIZIE_10`, `PLACEHOLDER_APELATIV_*`, `PLACEHOLDER_COD_COR`, etc. | TypeScript |
| 11 | `src/lib/templates/resolver.ts` | Adăugare apelative dinamice `Dl.`/`Dna.`, eliminare date fictive, corectare avize igienă. | TypeScript |

---

*Raport întocmit în mod riguros și verificat direct pe arhivele sursă din proiect.*
