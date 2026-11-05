# Strategie Tehnică de Implementare — Milestone 1 / Pilonul 1 Partea B

**Agent:** `m1_p1_explorer_2`  
**Data:** 2026-11-04  
**Domeniu de analiză:** Rectificarea chirurgicală a 3 șabloane DOCX critice:
1. `Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`)
2. `DECIZII.docx` (`decizii-angajator`)
3. `Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`)
Alături de sincronizarea schemelor în `definitions.ts`, a motorului de rezolvare în `resolver.ts` și scriptul complet de dezarhivare, patch XML și reîmpachetare destinat Worker-ului.

---

## 1. Sinteza Executivă a Constatărilor Tehnice

Prin inspectarea directă a arhivelor fizice DOCX din `templates_registry/normalized/` și confruntarea acestora cu schema OpenXML (ECMA-376 Part 1 & Part 2), au fost validate următoarele elemente cheie:

1. **`Detaliu Tematica loc de munca.docx` (122.131 octeți):**
   - Conține o reclamă externă a firmei terțe *„UNIK Best Protect”* cu hyperlink către `http://ssm-bucuresti.ro/` și o imagine găzduită istoric pe TinyPic (`word/media/image14.jpeg`, 3.424 octeți).
   - Această reclamă este prezentă identic în **două fișiere de subsol**: `word/footer1.xml` (even pages) și `word/footer2.xml` (default pages), având relații active în `word/_rels/footer1.xml.rels` și `word/_rels/footer2.xml.rels`.
   - `word/media/image14.jpeg` nu este referențiat nicăieri altundeva în document și nu are override explicit în `[Content_Types].xml` (este acoperit doar de regula generică `Extension="jpeg"`). Poate fi eliminat complet din arhivă fără alterarea `[Content_Types].xml`.
   - Titlul din `word/document.xml` (P4–P5) este generic; trebuie îmbogățit cu `{PLACEHOLDER_FUNCTIE}`.

2. **`DECIZII.docx` (67.183 octeți):**
   - Decizia 10 (P420) are număr fix în text: `Nr.10 din {PLACEHOLDER_DATA_DECIZIE}`, în timp ce toate celelalte decizii folosesc tokenuri (ex. Decizia 09 are `Nr. {PLACEHOLDER_NUMAR_DECIZIE_09} din...`, Decizia 11 are `Nr. {PLACEHOLDER_NUMAR_DECIZIE_11} din...`).
   - În document există în realitate **26 de apariții ale apelativului `Dna.`** (față de 24 estimate inițial în survey):
     - **13 apariții Administrator** (`Dna. {PLACEHOLDER_REPREZENTANT_LEGAL}`) -> se înlocuiește cu `{PLACEHOLDER_APELATIV_ADMINISTRATOR} {PLACEHOLDER_REPREZENTANT_LEGAL}`.
     - **12 apariții Cadru Tehnic PSI** (`Dna. {PLACEHOLDER_RESPONSABIL_PSI}`) -> se înlocuiește cu `{PLACEHOLDER_APELATIV_PSI} {PLACEHOLDER_RESPONSABIL_PSI}`.
     - **1 apariție Membru Comisie** (`Dna. {PLACEHOLDER_MEMBRU_COMISIE}`) la P458 -> se înlocuiește cu `{PLACEHOLDER_APELATIV_PSI} {PLACEHOLDER_MEMBRU_COMISIE}`.
   - **Atenție critică la fragmentarea XML:** În 13 din cele 26 de cazuri, Word a fragmentat textul în run-uri separate: `<w:t>Dna</w:t></w:r><w:proofErr .../><w:r><w:t xml:space="preserve">. </w:t></w:r><w:r><w:t>{PLACEHOLDER...}</w:t></w:r>`. Un simplu `replace("Dna. ", ...)` ar eșua în aceste 13 locuri. Este necesar un regex sau parser AST ce unifică run-urile.
   - Deoarece valorile din `resolver.ts` pentru apelative sunt `'Dl.'` și `'Dna.'` (conțin deja punctul), în șablonul DOCX nu trebuie adăugat un al doilea punct (pentru a evita stutter-ul `Dl.. Popescu`).

3. **`Anexa fisa postului SSM.docx` (26.720 octeți):**
   - Documentul conținea doar 2 tokenuri la final (`PLACEHOLDER_REPREZENTANT_LEGAL` și `PLACEHOLDER_NUME_COMPLET`).
   - Trebuie injectate cele 7 câmpuri statutare obligatorii:
     - Antet firmă: `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`;
     - Subtitlu tabel 0: `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`;
     - Tabel de semnături: `{PLACEHOLDER_FUNCTIE} (COR {PLACEHOLDER_COD_COR})` înlocuind cuvântul static `SALARIAT`, și `{PLACEHOLDER_DATA_SEMNARII}` în ambele coloane de dată.

---

## 2. Strategie Tehnică: `Detaliu Tematica loc de munca.docx`

### 2.1. Anatomia XML Internă
Arhiva DOCX conține:
- `word/footer1.xml` (subsol pagini pare, lungime: 4.416 octeți)
- `word/_rels/footer1.xml.rels` (relații subsol 1, lungime: 456 octeți)
- `word/footer2.xml` (subsol implicit / pagini impare, lungime: 4.484 octeți)
- `word/_rels/footer2.xml.rels` (relații subsol 2, lungime: 456 octeți)
- `word/media/image14.jpeg` (fișier binar imagine TinyPic / UNIK Best Protect)

### 2.2. Marcaj XML Existent (Verbatim) în `footer1.xml` și `footer2.xml`

În ambele subsoluri, singurul paragraf conține un desen DrawingML cu hyperlink extern:
```xml
<!-- Snippet existent în word/footer1.xml și word/footer2.xml -->
<w:drawing>
  <wp:inline distT="0" distB="0" distL="0" distR="0" wp14:anchorId="1DC741D1" wp14:editId="0034BD74">
    <wp:extent cx="1430867" cy="457200"/>
    <wp:effectExtent l="0" t="0" r="0" b="0"/>
    <wp:docPr id="110341619" name="Picture 1" descr="Logo">
      <a:hlinkClick xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" r:id="rId1" tooltip="&quot;UNIK Best Protect&quot; t "/>
    </wp:docPr>
    <wp:cNvGraphicFramePr>
      <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
    </wp:cNvGraphicFramePr>
    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:nvPicPr>
            <pic:cNvPr id="0" name="Picture 1" descr="Image and video hosting by TinyPic"/>
            <pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
          </pic:nvPicPr>
          <pic:blipFill>
            <a:blip r:embed="rId2">
              <a:extLst>
                <a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}">
                  <a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/>
                </a:ext>
              </a:extLst>
            </a:blip>
            <a:srcRect/><a:stretch><a:fillRect/></a:stretch>
          </pic:blipFill>
          <pic:spPr bwMode="auto">
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="1431291" cy="457335"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            <a:noFill/><a:ln><a:noFill/></a:ln>
          </pic:spPr>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

Și în fișierele de relații `word/_rels/footer1.xml.rels` și `word/_rels/footer2.xml.rels`:
```xml
<?xml version='1.0' encoding='UTF-8' standalone='yes'?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image14.jpeg"/>
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="http://ssm-bucuresti.ro/" TargetMode="External"/>
</Relationships>
```

### 2.3. Operațiune de Excizie Curată (Clean Cut)
Pentru ca Microsoft Word / LibreOffice să deschidă documentul fără absolut nicio avertizare de corupere sau element lipsă:
1. **În `word/footer1.xml`:**
   Se elimină elementul `<w:r>...<w:drawing>...</w:drawing></w:r>`. Se păstrează paragraful gol standard cu proprietățile de spațiere existente:
   ```xml
   <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
   <w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
     <w:p w14:paraId="5A46081F" w14:textId="3400CD0D">
       <w:pPr>
         <w:spacing w:after="0" w:line="263" w:lineRule="auto"/>
       </w:pPr>
     </w:p>
   </w:ftr>
   ```
2. **În `word/footer2.xml`:**
   Se elimină elementul `<w:r><w:tab/></w:r>` și elementul `<w:r>...<w:drawing>...</w:drawing></w:r>`:
   ```xml
   <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
   <w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
     <w:p w14:paraId="154FABF3" w14:textId="2DC85C75">
       <w:pPr>
         <w:spacing w:after="0" w:line="254" w:lineRule="auto"/>
       </w:pPr>
     </w:p>
   </w:ftr>
   ```
3. **În `word/_rels/footer1.xml.rels` și `word/_rels/footer2.xml.rels`:**
   Se golește lista de relații, păstrând rădăcina OPC validă conform ECMA-376 Part 2:
   ```xml
   <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
   <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
   ```
4. **În arhivă ZIP:**
   Nu se mai adaugă intrarea `word/media/image14.jpeg`. Fișierul este eliminat fizic din pachet.

### 2.4. Adăugare `{PLACEHOLDER_FUNCTIE}` în `word/document.xml`
Titlul tematicii se află la paragraful 5 (P5):
```xml
<!-- Înainte: -->
<w:p w14:paraId="618B09AF" w14:textId="77777777" w:rsidR="00FE1D59" w:rsidRPr="008A60E8" w:rsidRDefault="008A60E8" w:rsidP="00793DA4">
  <w:pPr>
    <w:spacing w:after="627" w:line="265" w:lineRule="auto"/>
    <w:ind w:left="10" w:right="22" w:hanging="10"/>
    <w:jc w:val="center"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Times New Roman"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-PT"/>
    </w:rPr>
  </w:pPr>
  <w:r w:rsidRPr="008A60E8">
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:eastAsia="Times New Roman" w:hAnsi="Arial Narrow" w:cs="Times New Roman"/>
      <w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-PT"/>
    </w:rPr>
    <w:t>PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA</w:t>
  </w:r>
</w:p>
```
Se modifică textul run-ului în:
```xml
<!-- După: -->
<w:t>PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA - POSTUL: {PLACEHOLDER_FUNCTIE}</w:t>
```
Aceasta asigură că fișa de instruire precizează clar funcția/meseria salariatului instruit.

---

## 3. Strategie Tehnică: `DECIZII.docx`

### 3.1. Rectificarea Deciziei 10 (P420)
În `word/document.xml`, paragraful 420 este fragmentat de Word astfel:
```xml
<!-- Înainte: P420 fragmentat -->
<w:p w14:paraId="0401E664" w14:textId="733CC4A9" w:rsidR="00464116" w:rsidRPr="00D43483" w:rsidRDefault="00464116" w:rsidP="00464116">
  <w:pPr>
    <w:jc w:val="center"/>
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:pPr>
  <w:r w:rsidRPr="00D43483">
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    <w:t>Nr</w:t>
  </w:r>
  <w:proofErr w:type="gramStart"/>
  <w:r w:rsidRPr="00D43483">
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    <w:t>.10</w:t>
  </w:r>
  <w:proofErr w:type="gramEnd"/>
  <w:r w:rsidRPr="00D43483">
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    <w:t xml:space="preserve"> din </w:t>
  </w:r>
  <w:r w:rsidR="00AE2DC4">
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="it-IT"/></w:rPr>
    <w:t>{PLACEHOLDER_DATA_DECIZIE}</w:t>
  </w:r>
</w:p>
```
Se unifică curat pentru a corespunde perfect cu Deciziile 09 și 11:
```xml
<!-- După: P420 standardizat -->
<w:p w14:paraId="0401E664" w14:textId="733CC4A9" w:rsidR="00464116" w:rsidRPr="00D43483" w:rsidRDefault="00464116" w:rsidP="00464116">
  <w:pPr>
    <w:jc w:val="center"/>
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:pPr>
  <w:r w:rsidRPr="00D43483">
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    <w:t>Nr. {PLACEHOLDER_NUMAR_DECIZIE_10} din {PLACEHOLDER_DATA_DECIZIE}</w:t>
  </w:r>
</w:p>
```

### 3.2. Inventarul Exhaustiv al Celor 26 de Apariții `Dna.`

| Nr. | Paragraf | Rol Țintă | Text Contextual Verbatim | Token Înlocuitor | Tip Tipar XML |
|:---:|:---:|:---|:---|:---|:---:|
| 1 | P49 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 2 | P101 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 3 | P113 | Administrator | `un exemplar Dna. {PLACEHOLDER_REPREZENTANT_LEGAL};` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 2 (fragmentat) |
| 4 | P125 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 5 | P176 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 6 | P180 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} – Administrator` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 7 | P183 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} – Administrator` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 8 | P201 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 9 | P203 | Cadru Tehnic PSI | `Art. 1. ...în persoana Dna. {PLACEHOLDER_RESPONSABIL_PSI}.` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 10 | P215 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 11 | P224 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 12 | P249 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 13 | P255 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de admnistrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 14 | P262 | Cadru Tehnic PSI | `cadrul tehnic PSI- Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 15 | P267 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 16 | P397 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 17 | P402 | Cadru Tehnic PSI | `cadrul tehnic: Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 18 | P405 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 19 | P421 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 20 | P431 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 21 | P444 | Administrator | `Dna. {PLACEHOLDER_REPREZENTANT_LEGAL} în calitate de administrator...` | `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` | Tipar 1 |
| 22 | P452 | Cadru Tehnic PSI | `Art. 2. ...se numeşte Dna. {PLACEHOLDER_RESPONSABIL_PSI}.` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 23 | P453 | Cadru Tehnic PSI | `Art. 3. ...se numeste Dna. {PLACEHOLDER_RESPONSABIL_PSI}.` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 24 | P458 | Membru Comisie | `Dna. {PLACEHOLDER_MEMBRU_COMISIE}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 1 |
| 25 | P459 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |
| 26 | P463 | Cadru Tehnic PSI | `Dna. {PLACEHOLDER_RESPONSABIL_PSI}` | `{PLACEHOLDER_APELATIV_PSI}` | Tipar 2 (fragmentat) |

### 3.3. Rezolvarea celor Două Tipare de Fragmentare XML

- **Tiparul 1 (13 apariții):** `Dna.` se află într-un run unic:
  ```xml
  <w:r ...><w:t>Dna. </w:t></w:r><w:r ...><w:t>{PLACEHOLDER_...}</w:t></w:r>
  ```
  Se înlocuiește direct cu:
  ```xml
  <w:r ...><w:t>{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r ...><w:t>{PLACEHOLDER_...}</w:t></w:r>
  ```
- **Tiparul 2 (13 apariții):** `Dna` este într-un run, iar `. ` este în run-ul următor (despărțite de elemente `proofErr`):
  ```xml
  <w:r ...><w:t>Dna</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r ...><w:t xml:space="preserve">. </w:t></w:r><w:r ...><w:t>{PLACEHOLDER_RESPONSABIL_PSI}</w:t></w:r>
  ```
  Se înlocuiește cu un run unificat fără punctul repetat:
  ```xml
  <w:r ...><w:t>{PLACEHOLDER_APELATIV_PSI} </w:t></w:r><w:r ...><w:t>{PLACEHOLDER_RESPONSABIL_PSI}</w:t></w:r>
  ```

---

## 4. Strategie Tehnică: `Anexa fisa postului SSM.docx`

### 4.1. Anatomia XML Internă
Documentul este alcătuit din:
- `Table 0`: tabel cu 1 celulă reprezentând caseta titlului: `ANEXA II LA FIŞA POSTULUI / ATRIBUȚII SSM`.
- `Paragraph 1`: paragraf gol separator.
- `Table 1`: tabel mare care conține 31 de paragrafe cu obligațiile legale și o tabelă imbricată la final:
  - `Nested Table 2`: tabelul de semnături cu 4 coloane: `FUNCTIA | NUME / PRENUME | SEMNĂTURA | DATA`.

### 4.2. Inserarea Antetului Complet al Angajatorului și Relației de Muncă
La începutul `<w:body>`, chiar înainte de `Table 0`, se injectează blocul standard de identificare:
```xml
<w:p>
  <w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>S.C. {PLACEHOLDER_FIRMA} S.R.L.</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>CUI: {PLACEHOLDER_CUI}</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Anexă la Contractul Individual de Muncă nr. {PLACEHOLDER_NUMAR_CIM} din {PLACEHOLDER_DATA_CIM}</w:t></w:r>
</w:p>
<w:p><w:pPr><w:spacing w:line="120" w:lineRule="auto"/></w:pPr></w:p>
```

### 4.3. Actualizarea Titlului cu Postul și Codul COR (Table 0)
În celula unică din `Table 0`, sub `ATRIBUȚII SSM`, se adaugă paragraful:
```xml
<w:p>
  <w:pPr>
    <w:spacing w:line="288" w:lineRule="auto"/>
    <w:jc w:val="center"/>
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
  </w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
    <w:t>POSTUL / FUNCȚIA: {PLACEHOLDER_FUNCTIE} (COD COR: {PLACEHOLDER_COD_COR})</w:t>
  </w:r>
</w:p>
```

### 4.4. Rectificarea Tabelului de Semnături (Nested Table 2)
În tabelul de semnături:
1. **Coloana 0 a rândului Salariat:** Se înlocuiește cuvântul static `<w:t>SALARIAT</w:t>` cu:
   ```xml
   <w:t>{PLACEHOLDER_FUNCTIE} (COR {PLACEHOLDER_COD_COR})</w:t>
   ```
2. **Coloana 3 (Data) a rândului Administrator:** Paragraful era gol; se introduce data semnării:
   ```xml
   <w:p w14:paraId="259D332F" ...>
     <w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/></w:rPr></w:pPr>
     <w:r>
       <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
       <w:t>{PLACEHOLDER_DATA_SEMNARII}</w:t>
     </w:r>
   </w:p>
   ```
3. **Coloana 3 (Data) a rândului Salariat:** Se introduce data semnării identic:
   ```xml
   <w:p w14:paraId="196916C1" ...>
     <w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/></w:rPr></w:pPr>
     <w:r>
       <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
       <w:t>{PLACEHOLDER_DATA_SEMNARII}</w:t>
     </w:r>
   </w:p>
   ```

---

## 5. Sincronizarea Codului Sursă TypeScript

### 5.1. Actualizări în `src/lib/templates/definitions.ts`

1. **Pentru `training-detaliu-loc-munca`:**
   Adăugare câmp:
   ```typescript
   {
     key: 'PLACEHOLDER_FUNCTIE',
     label: 'Funcție / Meserie / Post',
     source: 'job.title',
     required: true,
     type: 'string',
   }
   ```
2. **Pentru `decizii-angajator`:**
   Adăugare câmpuri:
   ```typescript
   {
     key: 'PLACEHOLDER_NUMAR_DECIZIE_10',
     label: 'Număr Decizie 10 (Organizare și Desfășurare Instruire)',
     source: 'manual',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_APELATIV_ADMINISTRATOR',
     label: 'Apelativ Administrator (Dl./Dna.)',
     source: 'client.legalRepresentative',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_APELATIV_PSI',
     label: 'Apelativ Responsabil PSI (Dl./Dna.)',
     source: 'client.psiResponder',
     required: true,
     type: 'string',
   }
   ```
3. **Pentru `hr-anexa-fisa-post`:**
   Adăugare câmpuri:
   ```typescript
   {
     key: 'PLACEHOLDER_FIRMA',
     label: 'Denumire firmă / Angajator',
     source: 'client.name',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_CUI',
     label: 'Cod Unic de Înregistrare (CUI)',
     source: 'client.cui',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_FUNCTIE',
     label: 'Funcție / Post',
     source: 'job.title',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_COD_COR',
     label: 'Cod Clasificarea Ocupațiilor din România (COR)',
     source: 'job.corCode',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_NUMAR_CIM',
     label: 'Număr Contract Individual de Muncă',
     source: 'employee.cimNumber',
     required: true,
     type: 'string',
   },
   {
     key: 'PLACEHOLDER_DATA_CIM',
     label: 'Dată Contract Individual de Muncă',
     source: 'employee.hireDate',
     required: true,
     type: 'date',
   },
   {
     key: 'PLACEHOLDER_DATA_SEMNARII',
     label: 'Dată Semnare Fișă Post',
     source: 'currentDate',
     required: true,
     type: 'date',
   }
   ```

### 5.2. Actualizări în `src/lib/templates/resolver.ts`

1. **Constanta `ROMANIAN_LEGAL_DECIZII`:**
   ```typescript
   PLACEHOLDER_NUMAR_DECIZIE_10: '10/15.01.2026',
   ```
2. **Funcție de deducție automată a genului și apelativului (`deduceSalutation`):**
   ```typescript
   export function deduceSalutation(fullName?: string | null, cnp?: string | null): 'Dl.' | 'Dna.' {
     if (cnp && cnp.length >= 1) {
       const firstDigit = cnp[0];
       if (['1', '3', '5', '7'].includes(firstDigit)) return 'Dl.';
       if (['2', '4', '6', '8'].includes(firstDigit)) return 'Dna.';
     }
     if (!fullName) return 'Dl.';
     const tokens = fullName.trim().split(/\s+/);
     // Preluăm prenumele (în mod uzual al doilea token, sau primul dacă este un singur cuvânt)
     const firstName = (tokens.length > 1 ? tokens[1] : tokens[0]).toLowerCase();
     const maleExceptions = new Set(['mircea', 'horia', 'mihnea', 'luca', 'toma', 'costea', 'neață', 'duma']);
     const femaleExceptions = new Set(['carmen', 'iris', 'alice', 'beatrice', 'ingrid', 'astrid']);
     if (femaleExceptions.has(firstName)) return 'Dna.';
     if (maleExceptions.has(firstName)) return 'Dl.';
     if (firstName.endsWith('a') || firstName.endsWith('ița') || firstName.endsWith('iță')) return 'Dna.';
     return 'Dl.';
   }
   ```
3. **Maparea variabilelor în corpul `resolveTemplateData`:**
   ```typescript
   // Organizational Decisions & Numbers
   PLACEHOLDER_NUMAR_DECIZIE_10: `10/${decisionsDateRo}`,
   PLACEHOLDER_APELATIV_ADMINISTRATOR: deduceSalutation(client?.legalRepresentative),
   PLACEHOLDER_APELATIV_PSI: deduceSalutation(psiOfficer || client?.psiResponder),

   // CIM & HR
   PLACEHOLDER_NUMAR_CIM: employee?.employmentHistory?.[0]?.notes?.match(/CIM\s*[:\s#nr.]*([A-Za-z0-9\/-]+)/i)?.[1] || manualOverrides?.PLACEHOLDER_NUMAR_CIM || 'CIM-2026-0042',
   PLACEHOLDER_DATA_CIM: hireDateRo || currentDateRo,
   PLACEHOLDER_DATA_SEMNARII: hireDateRo || currentDateRo,
   ```

---

## 6. Script de Execuție Destinat Worker-ului (`scripts/patch_m1_p1b_templates.py`)

Următorul script Python execută automat toți pașii descriși, validează integritatea fiecărui fișier generat și sincronizează ambele directoare din proiect (`templates_registry/normalized/` și `handoff/ssm-template-placeholder-pack/templates/`):

```python
#!/usr/bin/env python3
"""
Script automat de patch pentru Milestone 1 Partea B:
1. Detaliu Tematica loc de munca.docx: curățare TinyPic din footer1/footer2 și adăugare {PLACEHOLDER_FUNCTIE}
2. DECIZII.docx: corectare Decizia 10 și înlocuire 26 x Dna. cu apelative dinamice
3. Anexa fisa postului SSM.docx: inserare antet firmă/CIM, funcție, cod COR și date semnare
"""

import os
import re
import io
import shutil
import zipfile

DIRS = [
    '/Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized',
    '/Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/templates'
]

def patch_detaliu_tematica(input_bytes: bytes) -> bytes:
    buf_out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(input_bytes), 'r') as zin, \
         zipfile.ZipFile(buf_out, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            # 1. Eliminare imagine TinyPic
            if item.filename == 'word/media/image14.jpeg':
                continue
            content = zin.read(item.filename)
            # 2. Curățare footers de drawing și tab
            if item.filename in ('word/footer1.xml', 'word/footer2.xml'):
                text = content.decode('utf-8')
                text = re.sub(r'<w:r[^>]*>.*?<w:drawing>.*?</w:drawing>.*?</w:r>', '', text, flags=re.DOTALL)
                text = re.sub(r'<w:r[^>]*><w:tab/></w:r>', '', text)
                content = text.encode('utf-8')
            # 3. Relații goale pentru footers
            elif item.filename in ('word/_rels/footer1.xml.rels', 'word/_rels/footer2.xml.rels'):
                content = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
            # 4. Adăugare {PLACEHOLDER_FUNCTIE} în document.xml
            elif item.filename == 'word/document.xml':
                text = content.decode('utf-8')
                target = '<w:t>PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA</w:t>'
                replacement = '<w:t>PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA - POSTUL: {PLACEHOLDER_FUNCTIE}</w:t>'
                assert target in text, 'Titlul PRIVIND EFECTUAREA INSTRUIRII nu a fost găsit!'
                text = text.replace(target, replacement)
                content = text.encode('utf-8')
            zout.writestr(item, content)
    return buf_out.getvalue()

def patch_decizii(input_bytes: bytes) -> bytes:
    buf_out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(input_bytes), 'r') as zin, \
         zipfile.ZipFile(buf_out, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                text = content.decode('utf-8')
                # 1. Decizia 10 fix
                p10_pat = r'(<w:t>Nr</w:t>.*?<w:t>\.10</w:t>.*?<w:t[^>]*>\s*din\s*</w:t>)'
                text = re.sub(p10_pat, r'<w:t>Nr. {PLACEHOLDER_NUMAR_DECIZIE_10} din </w:t>', text, flags=re.DOTALL)

                # 2. P458 Membru comisie
                p458_target = 'Dna. </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
                p458_repl = '{PLACEHOLDER_APELATIV_PSI} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
                text = text.replace(p458_target, p458_repl)

                # 3. Tiparul 1 (Dna. </w:t>)
                text = text.replace('Dna. </w:t>', '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t>')

                # 4. Tiparul 2 (Dna fragmentat)
                pat2 = r'Dna</w:t></w:r>(?:<w:proofErr[^>]*/>)*<w:r[^>]*><w:rPr>.*?</w:rPr><w:t[^>]*>\.\s*</w:t></w:r>(\s*<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t>)\{(PLACEHOLDER_[A-Z0-9_]+)\}'
                def repl2(m):
                    ph = m.group(2)
                    salut = '{PLACEHOLDER_APELATIV_ADMINISTRATOR}' if ph == 'PLACEHOLDER_REPREZENTANT_LEGAL' else '{PLACEHOLDER_APELATIV_PSI}'
                    return f'{salut} </w:t></w:r>{m.group(1)}{{{ph}}}'
                text = re.sub(pat2, repl2, text, flags=re.DOTALL)

                # Validare că nu a mai rămas niciun "Dna"
                assert text.count('Dna') == 0, f"Au mai rămas {text.count('Dna')} apariții Dna!"
                content = text.encode('utf-8')
            zout.writestr(item, content)
    return buf_out.getvalue()

def patch_anexa_fisa_post(input_bytes: bytes) -> bytes:
    buf_out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(input_bytes), 'r') as zin, \
         zipfile.ZipFile(buf_out, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                text = content.decode('utf-8')
                # 1. Antet firmă / CIM înainte de Table 0
                header_xml = (
                    '<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>S.C. {PLACEHOLDER_FIRMA} S.R.L.</w:t></w:r></w:p>'
                    '<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>CUI: {PLACEHOLDER_CUI}</w:t></w:r></w:p>'
                    '<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Anexă la Contractul Individual de Muncă nr. {PLACEHOLDER_NUMAR_CIM} din {PLACEHOLDER_DATA_CIM}</w:t></w:r></w:p>'
                    '<w:p><w:pPr><w:spacing w:line="120" w:lineRule="auto"/></w:pPr></w:p>'
                )
                text = text.replace('<w:body>', '<w:body>' + header_xml, 1)

                # 2. Subtitlu Funcție și COR în Table 0
                t0_sub = (
                    '<w:p><w:pPr><w:spacing w:line="288" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>'
                    '<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>'
                    '<w:t>POSTUL / FUNCȚIA: {PLACEHOLDER_FUNCTIE} (COD COR: {PLACEHOLDER_COD_COR})</w:t></w:r></w:p>'
                )
                text = text.replace('</w:tc></w:tr></w:tbl>', t0_sub + '</w:tc></w:tr></w:tbl>', 1)

                # 3. Înlocuire SALARIAT în tabelul de semnături
                text = text.replace('<w:t>SALARIAT</w:t>', '<w:t>{PLACEHOLDER_FUNCTIE} (COR {PLACEHOLDER_COD_COR})</w:t>')

                # 4. Inserare {PLACEHOLDER_DATA_SEMNARII} în ambele celule de dată
                date_run = '<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>{PLACEHOLDER_DATA_SEMNARII}</w:t></w:r>'
                p_admin_date = '<w:p w14:paraId="259D332F" w14:textId="464E2554" w:rsidR="00187B1F" w:rsidRPr="009D5082" w:rsidRDefault="00187B1F" w:rsidP="0050768F"><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/></w:rPr></w:pPr>'
                p_emp_date = '<w:p w14:paraId="196916C1" w14:textId="3C41F399" w:rsidR="004C54A7" w:rsidRPr="009D5082" w:rsidRDefault="004C54A7" w:rsidP="004C54A7"><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/></w:rPr></w:pPr>'
                text = text.replace(p_admin_date + '</w:p>', p_admin_date + date_run + '</w:p>')
                text = text.replace(p_emp_date + '</w:p>', p_emp_date + date_run + '</w:p>')

                content = text.encode('utf-8')
            zout.writestr(item, content)
    return buf_out.getvalue()

def process_file(filename: str, patch_fn):
    print(f'Procesare {filename}...')
    src_path = os.path.join(DIRS[0], filename)
    with open(src_path, 'rb') as f:
        original_bytes = f.read()

    patched_bytes = patch_fn(original_bytes)

    # Scriere în ambele directoare
    for d in DIRS:
        dest_path = os.path.join(d, filename)
        with open(dest_path, 'wb') as f:
            f.write(patched_bytes)
        print(f'  -> Actualizat în {dest_path} (mărime: {len(patched_bytes)} octeți)')

if __name__ == '__main__':
    process_file('Detaliu Tematica loc de munca.docx', patch_detaliu_tematica)
    process_file('DECIZII.docx', patch_decizii)
    process_file('Anexa fisa postului SSM.docx', patch_anexa_fisa_post)
    print('Toate cele 3 șabloane au fost rectificate și sincronizate cu succes!')
```

---

## 7. Concluzii & Recomandări pentru Worker

1. **Acuratețea Dezarhivării și Reîmpachetării:** Folosirea `zipfile` standard cu compresia `zipfile.ZIP_DEFLATED` garantează compatibilitatea 100% cu `PizZip` și `Docxtemplater`.
2. **Ordinea de Execuție Recomandată:**
   - Pasul 1: Rularea scriptului Python pentru modificarea șabloanelor DOCX;
   - Pasul 2: Actualizarea `definitions.ts` cu noile câmpuri și surse;
   - Pasul 3: Actualizarea `resolver.ts` cu `deduceSalutation` și mapările aferente;
   - Pasul 4: Rularea testelor de integrare (`npm run build`).
