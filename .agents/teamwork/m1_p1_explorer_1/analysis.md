# Raport de Analiză Tehnică & Strategie de Implementare: Milestone 1 Partea A

**Data:** 2026-11-04  
**Autor:** `m1_p1_explorer_1`  
**Domeniu:** Milestone 1 / Pilonul 1 Partea A — Rectificarea Textuală și Structurală a Șabloanelor Existente:
1. `EVALUAREA RISCURILOR.docx` (`risk-evaluare`)
2. `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`)
3. `11 - ALUNECARI.docx` (`ipssm-alunecari`)

---

## 1. Sinteza Obiectivelor Tehnice

Prezentul raport oferă echipei de execuție (Worker) strategia exactă, la nivel de octet și tag XML OpenXML (`word/document.xml`, `word/header*.xml`), pentru rectificarea celor 3 șabloane de bază, precum și sincronizarea definițiilor de catalog (`src/lib/templates/definitions.ts`) și a motorului de rezolvare (`src/lib/templates/resolver.ts`).

### Matricea Modificărilor per Fișier

| Fișier Șablon | Cod Catalog | Fișiere XML Interne Afectate | Modificări Cheie Identificate |
|---|---|---|---|
| `EVALUAREA RISCURILOR.docx` | `risk-evaluare` | `word/document.xml` | 1. P69: `{PLACEHOLDER_ADRESA_FIRMA}` -> `{PLACEHOLDER_NR_REG_COM}`<br>2. P69: `Registrul Comertului Bucuresti` -> `Registrul Comertului`<br>3. P336: `in cadrul lucrarii de absolvire` -> `in cadrul prezentei evaluari de securitate si sanatate in munca`<br>4. P175 & P337: Eliminare tokenuri rătăcite din mijlocul frazelor<br>5. P665 & P711: Curățare 5 coruperi `{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`<br>6. P970 & P972: Înlocuire adresă și telefon evaluator hardcodate cu `{PLACEHOLDER_ADRESA_PRESTATOR}`, `{PLACEHOLDER_TELEFON_PRESTATOR}`<br>7. Final (`<w:body>` înainte de `<w:sectPr>`): Reintegrare structurală Capitolele 6 & 7 |
| `13 - ACTIVITATI DE BIROU.docx` | `ipssm-birou` | `word/document.xml`, `word/header1.xml`, `word/header2.xml` | 1. P24: Înlocuire fragmentat „agenților de pază” cu „personalului de birou”<br>2. Adăugare `{PLACEHOLDER_FIRMA}` în running header (`header1.xml`, `header2.xml`) și în antetul corpului documentului (P0)<br>3. Adăugare `PLACEHOLDER_FIRMA` în `definitions.ts` |
| `11 - ALUNECARI.docx` | `ipssm-alunecari` | `word/document.xml`, `word/header1.xml`, `word/header2.xml` | 1. Adăugare `{PLACEHOLDER_FIRMA}` în running header (`header1.xml`, `header2.xml`) și în antetul corpului documentului (P0)<br>2. Adăugare `PLACEHOLDER_FIRMA` în `definitions.ts` |

---

## 2. Analiza Detaliată a Șabloanelor & Snippets XML Exacte

### 2.1. `EVALUAREA RISCURILOR.docx` (`risk-evaluare`)

Documentul sursă conține 1035 paragrafe în `word/document.xml`.

#### A. P69: Corectare Token RegCom și Eliminare Localitate Statică „București”

**Locație:** Paragraful P69 (linia de identificare a companiei client).  
**Fragment XML existent:**
```xml
<w:p>
  <w:pPr><w:jc w:val="both"/></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="28"/><w:sz-cs w:val="28"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"/><w:tab/><w:t xml:space="preserve"/></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Societatea </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>{PLACEHOLDER_FIRMA}</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> cu sediul in </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_ADRESA_FIRMA}, </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">inregistrata la Registrul Comertului Bucuresti sub nr. </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>{PLACEHOLDER_ADRESA_FIRMA}</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">, CUI </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_CUI} </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>este infiintata in anul {PLACEHOLDER_AN_INFIINTARE}.</w:t></w:r>
</w:p>
```

**Snippet XML rectificat:**
```xml
<w:p>
  <w:pPr><w:jc w:val="both"/></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="28"/><w:sz-cs w:val="28"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"/><w:tab/><w:t xml:space="preserve"/></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">Societatea </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>{PLACEHOLDER_FIRMA}</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve"> cu sediul in </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_ADRESA_FIRMA}, </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">inregistrata la Registrul Comertului sub nr. </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>{PLACEHOLDER_NR_REG_COM}</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">, CUI </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_CUI} </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t>este infiintata in anul {PLACEHOLDER_AN_INFIINTARE}.</w:t></w:r>
</w:p>
```

#### B. P336: Eliminare Text Rezidual de Diplomă / Lucrare de Licență

**Locație:** Paragraful P336.  
**Fragment XML existent:**
```xml
<w:p>
  <w:pPr><w:jc w:val="both"/><w:ind w:first-line="720"/></w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr>
    <w:t xml:space="preserve">Din multitudinea de metode utilizate pe plan mondial si national pentru evaluarea riscurilor de accidentare si imbolnavire profesionala, in cadrul lucrarii de absolvire s-a optat pentru utilizarea metodei elaborate de I.N.C.D.P.M. Bucuresti. Aceasta metoda a fost avizata de Ministerul Muncii si Solidaritatii Sociale in anul 1993 si a fost experimentata pana in prezent in majoritatea ramurilor industriale, aducandu-i-se permanent imbunatatiri.</w:t>
  </w:r>
</w:p>
```

**Snippet XML rectificat:**
```xml
<w:p>
  <w:pPr><w:jc w:val="both"/><w:ind w:first-line="720"/></w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr>
    <w:t xml:space="preserve">Din multitudinea de metode utilizate pe plan mondial si national pentru evaluarea riscurilor de accidentare si imbolnavire profesionala, in cadrul prezentei evaluari de securitate si sanatate in munca s-a optat pentru utilizarea metodei elaborate de I.N.C.D.P.M. Bucuresti. Aceasta metoda a fost avizata de Ministerul Muncii si Solidaritatii Sociale in anul 1993 si a fost experimentata pana in prezent in majoritatea ramurilor industriale, aducandu-i-se permanent imbunatatiri.</w:t>
  </w:r>
</w:p>
```

#### C. P175 & P337: Eliminare Tokenuri Rătăcite din Mijlocul Teoretic

Paragrafele P175 și P337 conțin doar:
```xml
<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:t>{PLACEHOLDER_NIVEL_RISC_GLOBAL} - {PLACEHOLDER_CONCLUZII_EVALUARE}</w:t></w:r></w:p>
```
Aceste paragrafe sunt complet rătăcite (rup fraze teoretice despre ecuația riscului și finalitatea metodei). Se elimină complet cele două elemente `<w:p>` din XML. Conținutul `{PLACEHOLDER_NIVEL_RISC_GLOBAL}` și `{PLACEHOLDER_CONCLUZII_EVALUARE}` își găsește locul legitim în Capitolul 7 (Concluzii).

#### D. P665 & P711: Curățare Coruperi de Înlocuire Automată

În Anexa 2 a INCDPM (Scala de cotare a gravității și probabilității), tokenul `{PLACEHOLDER_ADRESA_FIRMA}` a fost injectat eronat peste celulele grilei:
- P665: `2.Contuzie{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
- P665: `4.Strivire{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
- P711: `19.Tumori maligne, cancer profesional{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
- P711: `28.Boala de iradiere{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`
- P711: `30.Boli infectioase si parazitare{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`

În XML, fiecare apariție este:
```xml
<w:t>{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx</w:t>
```
**Snippet XML rectificat:**
Se înlocuiește fiecare `<w:t>{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx</w:t>` cu reprezentarea standard a celulei de grilă neafectate:
```xml
<w:t>---------xxxxxx-------</w:t>
```
Această corecție elimină riscul ca generatorul să injecteze adresa clientului (`Str. Victoriei nr. 10`) în interiorul tabelului de boli profesionale.

#### E. P970 & P972: Înlocuire Date Istorice Evaluator

**Locație:** Pagina de final a metodologiei (P969–P974).  
**Fragment XML existent:**
```xml
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t>Evaluare intocmita de Societatea {PLACEHOLDER_PRESTATOR_SSM}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve"> Bucuresti , str Petcu Avram nr 6 , sector 4, </w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t>CERTIFICAT DE ABILITARE NR {PLACEHOLDER_CERTIFICAT_EVALUATOR}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">CONTACT: 0040 723.60.13.84</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">e-mail: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/><w:u w:val="single"/><w:color w:val="0000FF"/></w:rPr><w:t>{PLACEHOLDER_EMAIL_PRESTATOR}</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve"/></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">Website: {PLACEHOLDER_SITE_PRESTATOR}</w:t></w:r></w:p>
```

**Snippet XML rectificat:**
```xml
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t>Evaluare intocmita de Societatea {PLACEHOLDER_PRESTATOR_SSM}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_ADRESA_PRESTATOR}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t>CERTIFICAT DE ABILITARE NR {PLACEHOLDER_CERTIFICAT_EVALUATOR}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">CONTACT: {PLACEHOLDER_TELEFON_PRESTATOR}</w:t></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">e-mail: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/><w:u w:val="single"/><w:color w:val="0000FF"/></w:rPr><w:t>{PLACEHOLDER_EMAIL_PRESTATOR}</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve"/></w:r></w:p>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="19"/><w:sz-cs w:val="19"/></w:rPr><w:t xml:space="preserve">Website: {PLACEHOLDER_SITE_PRESTATOR}</w:t></w:r></w:p>
```

#### F. Reintegrarea Capitolelor 6 & 7 în Corpul Documentului

**Poziționare în XML:** În `word/document.xml`, exact înainte de tag-ul `<w:sectPr>` de final al secțiunii (`<w:sectPr><w:headerReference...`).  
**Structura adăugată:**
1. Separator pagină nouă: `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`
2. **Capitolul 6: Evaluarea posturilor de lucru: {PLACEHOLDER_FUNCTIE}**
   - Paragrafe de identificare loc de muncă: funcție, CAEN `{PLACEHOLDER_COD_CAEN}`, activitate `{PLACEHOLDER_ACTIVITATE_PRINCIPALA}`, număr lucrători `{PLACEHOLDER_NUMAR_LUCRATORI}`, program `{PLACEHOLDER_PROGRAM_LUCRU}`.
   - Tabel OpenXML standard (`<w:tbl>`) sau secțiune structurată de evaluare INCDPM pe cele 4 elemente ale sistemului de muncă (Executant, Sarcina de muncă, Mijloace de producție, Mediu de muncă) cu tokenurile de nivel parțial și clase de gravitate/frecvență: `{PLACEHOLDER_GRAVITATE_RISC_01}`..`30`, `{PLACEHOLDER_FRECVENTA_RISC_01}`..`30`, `{PLACEHOLDER_NIVEL_PARTIAL_RISC_01}`..`30`.
3. **Capitolul 7: Concluzii privind nivelul global de risc**
   - Titlu capitol: `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>CAPITOLUL 7: CONCLUZII PRIVIND EVALUAREA RISCURILOR</w:t></w:r></w:p>`
   - Nivelul global calculat: `<w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">Nivelul de risc global calculat (Nrg): </w:t></w:r><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>{PLACEHOLDER_NIVEL_RISC_GLOBAL}</w:t></w:r></w:p>`
   - Sinteza repartiției: `<w:p><w:r><w:t xml:space="preserve">Repartiția factorilor identificați: {PLACEHOLDER_REPARTITIE_RISCURI}</w:t></w:r></w:p>`
   - Sinteza concluziilor și măsurilor: `<w:p><w:r><w:t xml:space="preserve">{PLACEHOLDER_CONCLUZII_EVALUARE}</w:t></w:r></w:p>`
   - Bloc de semnături comisie:
     - Evaluator Risc SSM: `{PLACEHOLDER_PRESTATOR_SSM}` / `{PLACEHOLDER_CERTIFICAT_EVALUATOR}`
     - Angajator: `{PLACEHOLDER_FIRMA}` / `{PLACEHOLDER_REPREZENTANT_LEGAL}`
     - Data: `{PLACEHOLDER_DATA_DOCUMENT}` / An `{PLACEHOLDER_AN_EVALUARE}`

---

### 2.2. `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`)

#### A. P24: Înlocuire Fragmentată „agenților de pază” -> „personalului de birou”

**Constatare critică:** În XML, cuvintele sunt fragmentate în 3 run-uri diferite din cauza formatării Helvetica/Arial Narrow:
- Run 3: `<w:t xml:space="preserve">particularităţile activităţii agenţilor de</w:t>`
- Run 4: `<w:t xml:space="preserve"> </w:t>`
- Run 5: `<w:t xml:space="preserve">pază şi ale locurilor de muncă aflate în responsabilitatea lor),</w:t>`

**Fragment XML existent în P24:**
```xml
<w:p>
  <w:pPr><w:jc w:val="both"/><w:ind w:left="890"/></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Helvetica"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve">Instrucţiunile prezente completeaza si detaliaza (ţinând seama de</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Helvetica"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve">particularităţile activităţii agenţilor de</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Helvetica"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve">pază şi ale locurilor de muncă aflate în responsabilitatea lor),</w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>
  <w:r><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Helvetica"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve">prevederile următoarelor acte normative:</w:t></w:r>
</w:p>
```

**Snippet XML rectificat:**
Se consolidează paragraful curat, fără fragmentare de run-uri:
```xml
<w:p>
  <w:pPr><w:jc w:val="both"/><w:ind w:left="890"/></w:pPr>
  <w:r>
    <w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Helvetica"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr>
    <w:t xml:space="preserve">Instrucţiunile prezente completează şi detaliază (ţinând seama de particularităţile activităţilor de birou, lucrului cu echipamente cu ecran de vizualizare şi ale locurilor de muncă aflate în responsabilitatea salariaţilor), prevederile următoarelor acte normative:</w:t>
  </w:r>
</w:p>
```

#### B. Adăugare `{PLACEHOLDER_FIRMA}` în Antet

1. **În Running Header (`word/header1.xml` și `word/header2.xml`):**
Înlocuire `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>` cu:
```xml
<w:p>
  <w:pPr><w:pStyle w:val="Header"/></w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/>
      <w:b/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr>
    <w:t xml:space="preserve">{PLACEHOLDER_FIRMA}   </w:t>
  </w:r>
</w:p>
```

2. **În Corpul Documentului (`word/document.xml`), ca primul paragraf de identificare înainte de `Aprobat`:**
```xml
<w:p>
  <w:pPr><w:jc w:val="left"/><w:spacing w:after="120"/></w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/>
      <w:b/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr>
    <w:t>{PLACEHOLDER_FIRMA}</w:t>
  </w:r>
</w:p>
```

---

### 2.3. `11 - ALUNECARI.docx` (`ipssm-alunecari`)

#### A. Adăugare `{PLACEHOLDER_FIRMA}` în Antet

1. **În Running Header (`word/header1.xml` și `word/header2.xml`):**
Înlocuire `<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>` cu:
```xml
<w:p>
  <w:pPr><w:pStyle w:val="Header"/></w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/>
      <w:b/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr>
    <w:t xml:space="preserve">{PLACEHOLDER_FIRMA}   </w:t>
  </w:r>
</w:p>
```

2. **În Corpul Documentului (`word/document.xml`), ca primul paragraf de identificare înainte de `Aprobat`:**
```xml
<w:p>
  <w:pPr><w:jc w:val="left"/><w:spacing w:after="120"/></w:pPr>
  <w:r>
    <w:rPr>
      <w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/>
      <w:b/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
    </w:rPr>
    <w:t>{PLACEHOLDER_FIRMA}</w:t>
  </w:r>
</w:p>
```

---

## 3. Sincronizarea Codului TypeScript (`definitions.ts` & `resolver.ts`)

### 3.1. `src/lib/templates/definitions.ts`

Trebuie actualizate câmpurile `fields` pentru cele 3 coduri de șablon:

1. **Pentru `ipssm-birou` (l. 105–132):**
Adăugare câmp `PLACEHOLDER_FIRMA`:
```typescript
{
  key: 'PLACEHOLDER_FIRMA',
  label: 'Denumire firmă / Angajator',
  source: 'client.name',
  required: true,
  type: 'string',
},
```

2. **Pentru `ipssm-alunecari` (l. 40–67):**
Adăugare câmp `PLACEHOLDER_FIRMA`:
```typescript
{
  key: 'PLACEHOLDER_FIRMA',
  label: 'Denumire firmă / Angajator',
  source: 'client.name',
  required: true,
  type: 'string',
},
```

3. **Pentru `risk-evaluare` (l. 1789–1914):**
Adăugare câmpuri specifice:
```typescript
{
  key: 'PLACEHOLDER_NR_REG_COM',
  label: 'Nr. Reg. Comerțului (Jxx/xxx/xxxx)',
  source: 'client.regCom',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_ADRESA_PRESTATOR',
  label: 'Adresă prestator SSM',
  source: 'manual',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_TELEFON_PRESTATOR',
  label: 'Telefon prestator SSM',
  source: 'manual',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_NUMAR_FACTORI_RISC',
  label: 'Număr total factori de risc identificați',
  source: 'riskProfile.factorsCount',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_REPARTITIE_RISCURI',
  label: 'Repartiție factori de risc pe subsisteme',
  source: 'riskProfile.distribution',
  required: false,
  type: 'string',
},
```

### 3.2. `src/lib/templates/resolver.ts`

În `resolver.ts`, `verifiedMap` conține deja `PLACEHOLDER_NR_REG_COM` (l. 612), `PLACEHOLDER_TELEFON_PRESTATOR` (l. 644), `PLACEHOLDER_NUMAR_FACTORI_RISC` (l. 656) și `PLACEHOLDER_REPARTITIE_RISCURI` (l. 657).  
Trebuie adăugat explicit:
```typescript
const adresaPrestator = prov
  ? `${prov.locality || 'București'}, ${prov.street || 'Str. Agricultori'} nr. ${prov.number || '35'}${prov.county ? `, ${prov.county}` : ''}`
  : 'București, Str. Agricultori nr. 35, Sector 2';
```
și mapat în `verifiedMap`:
```typescript
PLACEHOLDER_ADRESA_PRESTATOR: adresaPrestator,
```

---

## 4. Strategia Programatică de Unpack, Patch & Repack (Python Script)

Workerul va folosi un script Python dedicat care va opera pe ambele locații:
- `templates_registry/normalized/`
- `handoff/ssm-template-placeholder-pack/templates/`

### Arhitectura Scriptului:
```python
#!/usr/bin/env python3
"""
patch_m1_templates.py: Script automat de dezarhivare, patch XML și reîmpachetare curată
fără alterarea schemei OpenXML.
"""
import zipfile
import os
import shutil
import xml.etree.ElementTree as ET

def patch_docx_parts(docx_path: str, part_patches: dict[str, callable]):
    """
    Deschide un DOCX, citește părțile specificate ca string UTF-8, aplică funcția de transformare,
    verifică validitatea XML prin ElementTree și reîmpachetează arhiva ZIP.
    """
    backup_path = docx_path + ".bak"
    shutil.copyfile(docx_path, backup_path)
    
    temp_zip_path = docx_path + ".tmp"
    
    with zipfile.ZipFile(docx_path, 'r') as zin, zipfile.ZipFile(temp_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename in part_patches:
                text = content.decode('utf-8')
                new_text = part_patches[item.filename](text)
                # Validare XML
                if item.filename.endswith('.xml'):
                    try:
                        ET.fromstring(new_text.encode('utf-8'))
                    except Exception as e:
                        raise ValueError(f"Eroare sintaxă XML generată în {item.filename}: {e}")
                zout.writestr(item, new_text.encode('utf-8'))
            else:
                zout.writestr(item, content)
                
    os.replace(temp_zip_path, docx_path)
    print(f"✓ Succes patch: {docx_path}")
```

### Reguli de Păstrare a Integrității OpenXML:
1. `zipfile.ZIP_DEFLATED` garantează compresia standard compatibilă cu Microsoft Word, LibreOffice și `pizzip`.
2. Validarea `ET.fromstring(new_text.encode('utf-8'))` garantează că nu rămân tag-uri deschise sau entități neînchise.
3. Se menține declarația XML `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>`.
4. Copierea exactă a fișierelor rezultate din `templates_registry/normalized/` în `handoff/ssm-template-placeholder-pack/templates/` pentru a asigura sincronizarea la nivel de hash SHA-256.

---

## 5. Matricea de Testare & Criterii de Validare

După implementarea modificărilor de către Worker, vor fi executate următoarele verificări riguroase:

1. **Rularea suitei de generare:**
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   *Criteriu de acceptanță:* 25/25 șabloane `PASS` cu status `approved_for_print` și 0 tokenuri nepopulate în fișierele generate.

2. **Verificarea conținutului generat în fișierele DOCX:**
   Inspectarea directă a fișierelor generate în `storage/test_documents/`:
   - `TEST_risk-evaluare_EVALUAREA RISCURILOR.docx`:
     - Antetul conține `sub nr. J40/1000/2021` (sau numărul real RegCom) și `Registrul Comertului` (fără `Bucuresti` forțat).
     - Nu mai conține `lucrarii de absolvire`.
     - Nu mai conține adresa `str Petcu Avram` sau telefonul `0040 723...`, ci datele dinamice ale prestatorului.
     - Capitolele 6 și 7 sunt prezente în document și conțin nivelul de risc calculat și concluziile.
   - `TEST_ipssm-birou_13 - ACTIVITATI DE BIROU.docx`:
     - P24 conține `particularităţile activităţilor de birou...` (fără `agenților de pază`).
     - Antetul conține denumirea firmei angajatoare (`S.C. NEXUS SOLUTIONS S.R.L.`).
   - `TEST_ipssm-alunecari_11 - ALUNECARI.docx`:
     - Antetul conține denumirea firmei angajatoare (`S.C. NEXUS SOLUTIONS S.R.L.`).

3. **Verificarea compilării Next.js:**
   ```bash
   npm run build
   ```
   *Criteriu de acceptanță:* Exit code 0, 0 erori TypeScript Turbopack.
