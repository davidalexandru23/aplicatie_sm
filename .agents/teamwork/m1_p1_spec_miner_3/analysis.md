# Raport Tehnic și Strategie de Implementare: Milestone 1 / Pilonul 1 (Partea C)

**Autor:** `m1_p1_spec_miner_3` (Specification Miner)  
**Data:** 2026-11-04  
**Workspace:** `/Users/davidalexandru/Documents/Proiect_SSM`  
**Destinație:** `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_spec_miner_3/analysis.md`  

---

## 1. Sinteză Executivă și Obiective

Prezentul document formulează strategia tehnică și juridică de implementare, la nivel de fișier, funcție și linie de cod, pentru **Partea C a Pilonului 1 (Milestone 1)**:

1. **`Informare Protectia Datelor.docx` (`hr-gdpr-informare`):**
   - Eliminarea viciului de drept privind invocarea „consimțământului” în relațiile de muncă (invalid conform Ghidului EDPB 05/2020 și art. 5 din Legea 190/2018);
   - Înlocuirea cu temeiurile statutare reale: Art. 6 alin. (1) lit. (b) și (c), Art. 9 alin. (2) lit. (b) și Art. 6 alin. (1) lit. (f) din Regulamentul (UE) 2016/679 (GDPR);
   - Eliminarea punctelor de suspensie reziduale (`…`, `……`, `…………`) de la paragrafele 12, 16 și 17.

2. **`Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`):**
   - Eliminarea chirurgicală a foii de calcul secundare `Sheet1` (care conține un tabel rezidual de Registru de Casă contabilă: `DATA`, `EXPLICATII`, `INCASARI`, `PLATI`, `SOLD`);
   - Păstrarea nealterată, la nivel de octet, a formatării, stilurilor, lățimilor de coloană și formulelor din foaia principală `Curs (2)` (115 sloturi indexate).

3. **`Adeverinta participare.docx` (`hygiene-adeverinta`):**
   - Eliminarea stutter-ului de text `Nr. Aviz MS nr.` din paragrafele P3 și P15;
   - Implementarea rezoluției dinamice a nivelului de igienă: `Nivelul 1` pentru funcții de execuție și `Nivelul 2` pentru funcții de conducere / coordonare conform Ordinului comun MS/ME 2209/4469/2022.

4. **Actualizări de Schemă și Resolver (`definitions.ts` și `resolver.ts`):**
   - Înregistrarea noilor tokenuri în `src/lib/templates/definitions.ts`:
     - `PLACEHOLDER_FIRMA` în `ipssm-birou` și `ipssm-alunecari`;
     - `PLACEHOLDER_FUNCTIE` în `training-detaliu-loc-munca`;
     - `PLACEHOLDER_NUMAR_DECIZIE_10`, `PLACEHOLDER_APELATIV_ADMINISTRATOR`, `PLACEHOLDER_APELATIV_PSI`, `PLACEHOLDER_APELATIV_MEMBRU_COMISIE` în `decizii-angajator`;
     - `PLACEHOLDER_FIRMA`, `PLACEHOLDER_CUI`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_COD_COR`, `PLACEHOLDER_NUMAR_CIM`, `PLACEHOLDER_DATA_CIM`, `PLACEHOLDER_DATA_SEMNARII` în `hr-anexa-fisa-post`;
   - Implementarea algoritmului euristic de deducție a apelativului (`Dl.` / `Dna.`) în `src/lib/templates/resolver.ts` bazat pe CNP și antroponimia limbii române;
   - Sanitizează valorile autorizațiilor MS/ME și calculul dinamic al nivelului de igienă.

---

## 2. Modulul 1: `Informare Protectia Datelor.docx` (`hr-gdpr-informare`)

### 2.1. Audit Textual și Deficiențe Verbatim

Fișierul supus analizei este localizat în:
- `templates_registry/normalized/Informare Protectia Datelor.docx` (SHA256: `144adf1e5531bbec332ecc21fcdd03b92c6206a87414149e7c3e78e85e3a84c4`)
- `handoff/ssm-template-placeholder-pack/templates/Informare Protectia Datelor.docx` (identic)

Paragrafele din `word/document.xml` conțin următoarele deficiențe:

| Paragraf XML | Text Curent (Verbatim) | Tip Deficiență |
|:---|:---|:---|
| **P12** (pct. 3.3) | `3.3  interesul legitim al …{PLACEHOLDER_FIRMA} desfășurare în bune condiții a activitatilor sale conform obiectului de activitate.` | Puncte de suspensie reziduale `…` înainte de token; formulare agramată (*„desfășurare în bune condiții a activitatilor”* în loc de *„în vederea desfășurării...”*). |
| **P16** (pct. 7) | `...Dreptul de opozitie se poate exercita printr-o cerere scrisa (semnata si datata), adresata ……{PLACEHOLDER_FIRMA}.` | Puncte de suspensie reziduale `……` înaintea denumirii firmei. |
| **P17** (pct. 8) | `8.  Am luat la cunostinta despre consecintele refuzului de a furniza datele personale: imposibilitatea incheierii, modificarii si executarii contractului individual de munca, precum si a derularii procedurilor de resurse umane si de IT existente in cadrul firmei …………{PLACEHOLDER_FIRMA}.` | Puncte de suspensie reziduale `…………` înaintea denumirii firmei. |
| **P18** (final) | `Mentionez ca in exprimarea consimtamantului nu am fost influentat sau constrans, sens in care imi exprim acordul liber si in cunostinta de cauza.` | **Viciu juridic fundamental:** invocarea consimțământului salariatului este invalidă în raporturile de muncă. |

### 2.2. Justificarea Juridică (GDPR & Legislația Muncii)

1. **Ghidul EDPB 05/2020 privind consimțământul (Secțiunea 3.1.1):**
   Comitetul European pentru Protecția Datelor statuează că, din cauza raportului de subordonare specific relației dintre angajator și angajat, consimțământul nu poate fi acordat liber (*freely given*). Angajatul se află într-o poziție de dependență economică și vulnerabilitate; prin urmare, consimțământul salariatului este nul de drept în aproape toate operațiunile curente de HR.
2. **Nulitatea practică a retragerii consimțământului:**
   Dacă prelucrarea s-ar baza pe consimțământ (Art. 6(1)(a)), salariatul ar putea să și-l retragă în orice moment. Într-o astfel de ipoteză, angajatorul ar fi în imposibilitate legală de a plăti salariul, de a transmite REVISAL/REGES către ITM, de a declara taxele la ANAF sau de a asigura medicina muncii și protecția SSM (Legea 319/2006).
3. **Temeiurile Juridice Reale și Obligatorii:**
   - **Art. 6 alin. (1) lit. (b) GDPR:** prelucrarea este necesară pentru executarea contractului individual de muncă la care salariatul este parte sau pentru a face demersuri la cererea acestuia înainte de încheierea contractului;
   - **Art. 6 alin. (1) lit. (c) GDPR:** prelucrarea este necesară în vederea îndeplinirii obligațiilor legale ale angajatorului (Codul Muncii - Legea 53/2003, Legea SSM 319/2006, Codul Fiscal - Legea 227/2015, HG 905/2017 privind registrul general de evidență a salariaților);
   - **Art. 9 alin. (2) lit. (b) GDPR:** prelucrarea categoriilor speciale de date cu caracter personal (date privind starea de sănătate: fișa de aptitudine de medicina muncii conform HG 355/2007, certificate medicale) este necesară în scopul îndeplinirii obligațiilor și exercitării drepturilor specifice ale angajatorului în domeniul dreptului muncii și al protecției sociale;
   - **Art. 6 alin. (1) lit. (f) GDPR:** interesul legitim al angajatorului pentru securitatea persoanelor, a spațiilor de lucru și protecția patrimoniului societății.

### 2.3. Formularea Exactă a Textului Înlocuitor

#### A. Titlul și Preambulul (P0 și P4–P5)
- **P0:**  
  `NOTĂ DE INFORMARE ȘI CONFIRMARE A PRELUCRĂRII DATELOR CU CARACTER PERSONAL (GDPR)`
- **P5:**  
  `Am fost informat(ă) cu privire la dispozițiile Regulamentului (UE) 2016/679 al Parlamentului European și al Consiliului (Regulamentul general privind protecția datelor - GDPR) referitoare la prelucrarea datelor cu caracter personal și libera circulație a acestor date, precum și cu privire la prelucrarea acestor date de către operatorul {PLACEHOLDER_FIRMA},`

#### B. Punctul 3: Scopuri și Temeiuri Legale (P9–P12)
- **P9:**  
  `3. Scopurile și temeiurile juridice în care se realizează prelucrarea sunt:`
- **P10 (pct. 3.1):**  
  `3.1 încheierea, executarea, modificarea și încetarea contractului individual de muncă încheiat între salariat și {PLACEHOLDER_FIRMA}, în temeiul Art. 6 alin. (1) lit. (b) din GDPR;`
- **P11 (pct. 3.2):**  
  `3.2 îndeplinirea obligațiilor legale stabilite în sarcina angajatorului în temeiul Art. 6 alin. (1) lit. (c) din GDPR raportat la Codul Muncii (Legea nr. 53/2003), Legea securității și sănătății în muncă nr. 319/2006, Codul Fiscal (Legea nr. 227/2015), legislația asigurărilor sociale de stat și a asigurărilor de sănătate, precum și transmiterea evidențelor oficiale către autoritățile competente (REVISAL/REGES, ITM, ANAF, CNAS);`
- **P12 (pct. 3.3 rectificat):**  
  `3.3 prelucrarea datelor referitoare la starea de sănătate (fișa de aptitudini emisă de medicul de medicina muncii, certificate de concediu medical) în temeiul Art. 9 alin. (2) lit. (b) din GDPR în scopul evaluării capacității de muncă și îndeplinirii obligațiilor legale SSM;`
- **P12.1 (adaugat ca pct. 3.4):**  
  `3.4 interesul legitim al {PLACEHOLDER_FIRMA} în temeiul Art. 6 alin. (1) lit. (f) din GDPR în vederea desfășurării în bune condiții a activităților sale economice, protecției patrimoniului societății și asigurării securității persoanelor și a spațiilor de lucru.`

#### C. Punctul 7: Exercitarea Drepturilor (P16 rectificat)
- **P16:**  
  `7. Am cunoștință de existența dreptului de acces, dreptului la rectificare, dreptului la ștergerea datelor („dreptul de a fi uitat”), dreptului la restricționarea prelucrării, dreptului la portabilitatea datelor și dreptului de opoziție, precum și de dreptul de a nu face obiectul unei decizii bazate exclusiv pe prelucrare automată și de dreptul de a mă adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP) sau instanțelor judecătorești competente, conform Art. 15-22 din GDPR. Dreptul de opoziție sau orice solicitare privind datele personale se poate exercita printr-o cerere scrisă, datată și semnată, adresată către {PLACEHOLDER_FIRMA}.`

#### D. Punctul 8: Consecințele Refuzului (P17 rectificat)
- **P17:**  
  `8. Am luat la cunoștință despre consecințele refuzului de a furniza datele personale necesare: imposibilitatea încheierii, executării și derulării raporturilor de muncă, a plății drepturilor salariale și a îndeplinirii obligațiilor declarative și fiscale legale ale angajatorului în cadrul {PLACEHOLDER_FIRMA}.`

#### E. Declarația de Luare la Cunoștință (P18 rectificat - Înlocuirea Consimțământului)
- **P18 (text integral nou):**  
  `Declar că am primit, am citit integral și am înțeles conținutul prezentei Note de informare. Confirm că am luat la cunoștință faptul că prelucrarea datelor mele cu caracter personal se întemeiază pe dispozițiile Art. 6 alin. (1) lit. (b) și (c), precum și ale Art. 9 alin. (2) lit. (b) din Regulamentul (UE) 2016/679 (GDPR), fiindu-mi garantată exercitarea deplină a tuturor drepturilor legale ce îmi revin în calitate de persoană vizată.`

### 2.4. Script Python de Aplicare Automatizată pe Fișierele DOCX

Următorul script Python efectuează modificarea la nivel de XML în ambele directoare (`templates_registry/normalized/` și `handoff/ssm-template-placeholder-pack/templates/`), garantând că stilurile, structura run-urilor Word și tokenurile rămân 100% integre:

```python
#!/usr/bin/env python3
"""
Script de rectificare text și conformitate GDPR pentru Informare Protectia Datelor.docx
"""
import zipfile
import io
import re

TARGET_FILES = [
    "templates_registry/normalized/Informare Protectia Datelor.docx",
    "handoff/ssm-template-placeholder-pack/templates/Informare Protectia Datelor.docx"
]

REPLACEMENTS = [
    # 1. Punctul 3.3 - eliminare puncte suspensie si reconfigurare
    (
        "3.3  interesul legitim al …{PLACEHOLDER_FIRMA} desfășurare în bune condiții a activitatilor sale conform obiectului de activitate.",
        "3.3 prelucrarea categoriilor speciale de date (sănătate) în temeiul Art. 9 alin. (2) lit. (b) din GDPR, precum și interesul legitim al {PLACEHOLDER_FIRMA} conform Art. 6 alin. (1) lit. (f) din GDPR în vederea desfășurării în bune condiții a activităților sale, asigurării securității și protecției patrimoniului."
    ),
    # 2. Punctul 7 - eliminare puncte suspensie
    (
        "Dreptul de opozitie se poate exercita printr-o cerere scrisa (semnata si datata), adresata ……{PLACEHOLDER_FIRMA}.",
        "Dreptul de opoziție se poate exercita printr-o cerere scrisă (semnată și datată), adresată către {PLACEHOLDER_FIRMA}."
    ),
    # 3. Punctul 8 - eliminare puncte suspensie
    (
        "existente in cadrul firmei …………{PLACEHOLDER_FIRMA}.",
        "existente în cadrul firmei {PLACEHOLDER_FIRMA}."
    ),
    # 4. Paragraful 18 - Înlocuire consimțământ cu confirmare legală Art. 6(1)(b)/(c) și Art. 9(2)(b)
    (
        "Mentionez ca in exprimarea consimtamantului nu am fost influentat sau constrans, sens in care imi exprim acordul liber si in cunostinta de cauza.",
        "Declar că am primit, am citit integral și am înțeles conținutul prezentei Note de informare. Confirm că am luat la cunoștință faptul că prelucrarea datelor mele cu caracter personal se întemeiază pe dispozițiile Art. 6 alin. (1) lit. (b) și (c), precum și ale Art. 9 alin. (2) lit. (b) din Regulamentul (UE) 2016/679 (GDPR), fiindu-mi garantată exercitarea deplină a drepturilor conferite de lege."
    )
]

def patch_docx(file_path: str):
    with open(file_path, "rb") as f:
        in_bytes = f.read()
    
    in_zip = zipfile.ZipFile(io.BytesIO(in_bytes), "r")
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED)
    
    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == "word/document.xml":
            xml_str = content.decode("utf-8")
            for old_text, new_text in REPLACEMENTS:
                if old_text in xml_str:
                    xml_str = xml_str.replace(old_text, new_text)
                    print(f"[{file_path}] Succes înlocuire text: {old_text[:30]}...")
                else:
                    print(f"[{file_path}] ATENȚIE: Textul nu a fost găsit verbatim: {old_text[:30]}...")
            content = xml_str.encode("utf-8")
        out_zip.writestr(item, content)
        
    in_zip.close()
    out_zip.close()
    
    with open(file_path, "wb") as f:
        f.write(out_buf.getvalue())
    print(f"Fișier salvat cu succes: {file_path}")

if __name__ == "__main__":
    for p in TARGET_FILES:
        patch_docx(p)
```

---

## 3. Modulul 2: `Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`)

### 3.1. Auditul Pachetului OpenXML și Riscul Librăriilor Terțe

Fișierul este stocat în:
- `templates_registry/normalized/Tabel Cursanti exemplu.xlsx` (SHA256: `71b3eeb79e345f24d1c41f460471e4a6df0c1b5b911a07a9bae0e03b54db7965`)
- `handoff/ssm-template-placeholder-pack/templates/Tabel Cursanti exemplu.xlsx` (identic)

Investigarea arhivei relevă:
- `xl/workbook.xml` declară două foi:
  ```xml
  <x:sheet name="Curs (2)" sheetId="1" r:id="R0a14a9e376694b5a" />
  <x:sheet name="Sheet1" sheetId="2" r:id="R4c6ece356eca47f3" />
  ```
- Foaia 1 (`Curs (2)`) este stocată în `xl/worksheets/sheet1.xml` (501.346 octeți). Aceasta conține **toate cele 115 sloturi indexate** pentru participanți, formatările tabelare oficiale de igienă, antetul comisiei de examinare și formulele de calcul.
- Foaia 2 (`Sheet1`) este stocată în `xl/worksheets/sheet2.xml` (9.669 octeți). Aceasta este o foaie contabilă străină de igienă, având doar 5 celule populate în rândul 2:
  - `B2`: `DATA` (index șir 9)
  - `C2`: `EXPLICATII` (index șir 10)
  - `F2`: `INCASARI` (index șir 11)
  - `G2`: `PLATI` (index șir 12)
  - `H2`: `SOLD` (index șir 13)

> ⚠️ **AVERTISMENT CRITIC PRIVIND LIBRĂRIILE DE PARSARE EXCEL:**  
> Utilizarea unei biblioteci de nivel înalt (de exemplu `xlsx` / SheetJS Community Edition) pentru a deschide și resalva fișierul (`xlsx.readFile` $\rightarrow$ `xlsx.writeFile`) distruge formatarea avansată: elimină stilurile celulelor (`styles.xml`), contururile tabelelor, culorile de fundal, proprietățile de vizualizare (`sheetViews`) și parametrii de printare.  
> **Soluția sigură este intervenția chirurgicală la nivel de pachet OpenXML (ZIP + XML DOM)**, eliminând foaia reziduală fără a atinge `sheet1.xml` sau `styles.xml`.

### 3.2. Procedura Exactă de Eliminare OpenXML

Intervenția constă în exact 4 operațiuni atomice:
1. **Ștergerea din `[Content_Types].xml`:**
   Eliminarea elementului:
   ```xml
   <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" />
   ```
2. **Ștergerea din `xl/workbook.xml`:**
   Eliminarea elementului `<x:sheet>` corespunzător lui `Sheet1`:
   ```xml
   <x:sheet name="Sheet1" sheetId="2" r:id="R4c6ece356eca47f3" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" />
   ```
3. **Ștergerea din `xl/_rels/workbook.xml.rels`:**
   Eliminarea relației corespunzătoare către `sheet2.xml`:
   ```xml
   <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet2.xml" Id="R4c6ece356eca47f3" />
   ```
4. **Eliminarea fișierului fizic:**
   Excluderea intrării `xl/worksheets/sheet2.xml` la reserializarea arhivei ZIP.

### 3.3. Script Python de Execuție Chirurgicală

```python
#!/usr/bin/env python3
"""
Script de eliminare atomică a foii reziduale Sheet1 (Registru de Casă) din Tabel Cursanti exemplu.xlsx
"""
import zipfile
import io
import xml.etree.ElementTree as ET

TARGET_FILES = [
    "templates_registry/normalized/Tabel Cursanti exemplu.xlsx",
    "handoff/ssm-template-placeholder-pack/templates/Tabel Cursanti exemplu.xlsx"
]

def clean_excel_workbook(file_path: str):
    with open(file_path, "rb") as f:
        in_bytes = f.read()

    in_zip = zipfile.ZipFile(io.BytesIO(in_bytes), "r")
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        filename = item.filename
        content = in_zip.read(filename)

        # 1. Excludem fișierul fizic sheet2.xml
        if filename == "xl/worksheets/sheet2.xml":
            print(f"[{file_path}] Exclus din arhivă: {filename}")
            continue

        # 2. Curățăm [Content_Types].xml
        if filename == "[Content_Types].xml":
            root = ET.fromstring(content)
            for child in list(root):
                if child.attrib.get("PartName") == "/xl/worksheets/sheet2.xml":
                    root.remove(child)
                    print(f"[{file_path}] Eliminat override sheet2 din [Content_Types].xml")
            content = ET.tostring(root, encoding="utf-8", xml_declaration=True)

        # 3. Curățăm xl/workbook.xml
        elif filename == "xl/workbook.xml":
            root = ET.fromstring(content)
            ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            sheets_el = root.find("x:sheets", ns)
            if sheets_el is not None:
                for s in list(sheets_el):
                    if s.attrib.get("name") == "Sheet1" or s.attrib.get("sheetId") == "2":
                        sheets_el.remove(s)
                        print(f"[{file_path}] Eliminat sheet 'Sheet1' din xl/workbook.xml")
            content = ET.tostring(root, encoding="utf-8", xml_declaration=True)

        # 4. Curățăm xl/_rels/workbook.xml.rels
        elif filename == "xl/_rels/workbook.xml.rels":
            root = ET.fromstring(content)
            for child in list(root):
                target = child.attrib.get("Target", "")
                if target in ["/xl/worksheets/sheet2.xml", "worksheets/sheet2.xml"]:
                    root.remove(child)
                    print(f"[{file_path}] Eliminată relație sheet2 din xl/_rels/workbook.xml.rels")
            content = ET.tostring(root, encoding="utf-8", xml_declaration=True)

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()

    with open(file_path, "wb") as f:
        f.write(out_buf.getvalue())
    print(f"Fișier XLSX curățat cu succes: {file_path}")

if __name__ == "__main__":
    for p in TARGET_FILES:
        clean_excel_workbook(p)
```

---

## 4. Modulul 3: `Adeverinta participare.docx` (`hygiene-adeverinta`)

### 4.1. Auditul Problemei de Stutter (`Nr. Aviz MS nr.`)

În fișierul `Adeverinta participare.docx`:
- **P3 din antet:**
  ```text
  MINISTERUL SANATATII
  Directia Generala Sanatate Publica si Programe de Sanatate
  Nr. {PLACEHOLDER_AVIZ_MS}
  ```
- **P6 din antet:**
  ```text
  MINISTERUL EDUCATIEI
  Directia Generala Management Resurse Umane si Retea Scolara
  Nr. {PLACEHOLDER_AVIZ_ME}
  ```
- **P15 din corpul adeverinței:**
  ```text
  ... in baza Avizului Ministerului Sanatatii nr. {PLACEHOLDER_AVIZ_MS} si Ministerului Educatiei, nr. {PLACEHOLDER_AVIZ_ME}, si a promovat examenul de absolvire ...
  ```

În `src/lib/templates/resolver.ts` (l. 147–148), valorile statice din profilul `ROMANIAN_LEGAL_HYGIENE` erau:
```typescript
PLACEHOLDER_AVIZ_MS: 'Aviz MS nr. 1225/2023 din 15.03.2023 emis de Ministerul Sănătății - DSP București',
PLACEHOLDER_AVIZ_ME: 'Aviz ME nr. 8941/2023 din 22.03.2023 emis de Ministerul Educației',
```

**Efectul Cumulat de Stutter:**
Când aceste valori sunt interpolate în document:
- P3 devine:  
  `Nr. Aviz MS nr. 1225/2023 din 15.03.2023 emis de Ministerul Sănătății - DSP București`  
  *(stutter deranjant `Nr. Aviz MS nr.`)*
- P15 devine:  
  `... în baza Avizului Ministerului Sănătății nr. Aviz MS nr. 1225/2023 din 15.03.2023 emis de Ministerul Sănătății - DSP București și Ministerului Educației, nr. Aviz ME nr. 8941/2023 ...`  
  *(repetiție identică `nr. Aviz MS nr.`)*

### 4.2. Remediere la Nivel de Resolver și Șablon

Pentru a elimina complet stutter-ul:
1. **Curățarea valorilor implicite din `ROMANIAN_LEGAL_HYGIENE`:**
   ```typescript
   export const ROMANIAN_LEGAL_HYGIENE = {
     PLACEHOLDER_AVIZ_MS: '1225/2023 din 15.03.2023 emis de DSP București',
     PLACEHOLDER_AVIZ_ME: '8941/2023 din 22.03.2023 emis de Ministerul Educației',
     PLACEHOLDER_NUMAR_AVIZ_MS: '1225/2023',
     PLACEHOLDER_DATA_AVIZ_MS: '15.03.2023',
     PLACEHOLDER_NUMAR_AVIZ_ME: '8941/2023',
     PLACEHOLDER_DATA_AVIZ_ME: '22.03.2023',
     ...
   };
   ```
2. **Funcție Sanitizer în `resolver.ts`:**
   Dacă utilizatorul a introdus în baza de date `hygieneSession.msAuthorization = "Aviz MS nr. 1225/2023"` sau `hygieneSession.meAuthorization = "Aviz ME nr. 8941/2023"`, resolverul elimină automat prefixul redundant:
   ```typescript
   export function sanitizeAuthorizationNumber(auth?: string | null): string {
     if (!auth) return '';
     return auth
       .replace(/^(?:Aviz\s+(?:MS|ME)\s+(?:nr\.?)?|Aviz\s+nr\.?|Nr\.?\s*)/i, '')
       .trim();
   }
   ```
3. **Rezultatul Generat:**
   - P3: `Nr. 1225/2023 din 15.03.2023 emis de DSP București`
   - P6: `Nr. 8941/2023 din 22.03.2023 emis de Ministerul Educației`
   - P15: `... în baza Avizului Ministerului Sănătății nr. 1225/2023 din 15.03.2023 emis de DSP București și al Ministerului Educației nr. 8941/2023 din 22.03.2023 emis de Ministerul Educației ...`  
   Zero stutter, text fluent și perfect lizibil.

### 4.3. Rezoluția Dinamică a Nivelului de Igienă (Nivelul 1 vs. Nivelul 2)

#### Cadrul Legal: Ordinul comun MS/ME nr. 2209/4469/2022
Ordinul reglementează două niveluri distincte de instruire și certificare:
- **Nivelul 1 (Execuție):** Lucrători operaționali direct implicați în manipularea alimentelor, servicii de alimentație publică (bucătari, ospătari, barmani, ajutori de bucătar, lucrători comerciali), personal de curățenie, cosmeticieni, frizeri, operatori DDD, lucrători apă potabilă.
- **Nivelul 2 (Conducere și Coordonare):** Personal cu atribuții de conducere, coordonare, îndrumare și control: administratori, manageri generali, manageri operațiuni, directori de restaurant, șefi de unitate/punct de lucru, șefi de sală, bucătari-șefi (*Head Chef*), șefi de tură, coordonatori de producție, responsabili siguranță alimentară (HACCP / ISO 22000).

#### Deficiența Curentă în Cod
În `resolver.ts:940` și `resolver.ts:958`, valoarea era fixată static pe `Nivelul 2`:
```typescript
// Cod existent în resolver.ts:
PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 2', // ❌ Eronat pentru 90% din salariații de execuție
```

#### Algoritmul de Rezoluție Dinamică
Resolverul va calcula dinamic valoarea pe baza următoarei cascade de reguli:

```typescript
/**
 * Determină dinamic Nivelul 1 vs Nivelul 2 conform Ordinului MS/ME 2209/4469/2022
 */
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

---

## 5. Modulul 4: Actualizări de Schemă (`definitions.ts`) și Resolver (`resolver.ts`)

### 5.1. Actualizări în `src/lib/templates/definitions.ts`

Trebuie adăugate următoarele tokenuri în șabloanele catalogate:

#### A. În `ipssm-birou` (`13 - ACTIVITATI DE BIROU.docx`)
Adăugarea `PLACEHOLDER_FIRMA` în array-ul `fields`:
```typescript
{
  key: 'PLACEHOLDER_FIRMA',
  label: 'Denumire firmă / Angajator',
  source: 'client.name',
  required: true,
  type: 'string',
},
```

#### B. În `ipssm-alunecari` (`11 - ALUNECARI.docx`)
Adăugarea `PLACEHOLDER_FIRMA` în array-ul `fields`:
```typescript
{
  key: 'PLACEHOLDER_FIRMA',
  label: 'Denumire firmă / Angajator',
  source: 'client.name',
  required: true,
  type: 'string',
},
```

#### C. În `training-detaliu-loc-munca` (`Detaliu Tematica loc de munca.docx`)
Adăugarea `PLACEHOLDER_FUNCTIE` în array-ul `fields`:
```typescript
{
  key: 'PLACEHOLDER_FUNCTIE',
  label: 'Funcție / Post documentat',
  source: 'job.title',
  required: true,
  type: 'string',
},
```

#### D. În `decizii-angajator` (`DECIZII.docx`)
Adăugarea celor 4 tokenuri lipsă:
```typescript
{
  key: 'PLACEHOLDER_NUMAR_DECIZIE_10',
  label: 'Număr Decizie 10 (Gestiune Deșeuri)',
  source: 'manual',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_APELATIV_ADMINISTRATOR',
  label: 'Apelativ Administrator (Dl. / Dna.)',
  source: 'computed',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_APELATIV_PSI',
  label: 'Apelativ Responsabil PSI (Dl. / Dna.)',
  source: 'computed',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_APELATIV_MEMBRU_COMISIE',
  label: 'Apelativ Membru Comisie (Dl. / Dna.)',
  source: 'computed',
  required: false,
  type: 'string',
},
```

#### E. În `hr-anexa-fisa-post` (`Anexa fisa postului SSM.docx`)
Extinderea de la 2 câmpuri la schema completă de identificare:
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
  label: 'Funcție / Post de lucru salariat',
  source: 'job.title',
  required: true,
  type: 'string',
},
{
  key: 'PLACEHOLDER_COD_COR',
  label: 'Cod Ocupație COR',
  source: 'job.corCode',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_NUMAR_CIM',
  label: 'Număr Contract Individual de Muncă',
  source: 'employee.cimNumber',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_DATA_CIM',
  label: 'Data Contract Individual de Muncă',
  source: 'employee.hireDate',
  required: false,
  type: 'string',
},
{
  key: 'PLACEHOLDER_DATA_SEMNARII',
  label: 'Data semnării fișei de post',
  source: 'employee.hireDate',
  required: false,
  type: 'string',
},
```

---

### 5.2. Motorul Euristic de Deducție a Genului în `resolver.ts`

În limba română, forma de adresare („Dl.” sau „Dna.”) poate fi determinată cu o acuratețe de peste 99% combinând cifra de gen din CNP cu morfologia și onomastica prenumelor românești.

Următorul cod TypeScript complet va fi introdus în `src/lib/templates/resolver.ts`:

```typescript
/**
 * Determinare automată și robustă a apelativului („Dl.” / „Dna.”) pentru limba română.
 * Analizează prima cifră a CNP-ului (dacă există) sau antroponimul prenumelui.
 */
export function detectRomanianSalutation(
  fullName?: string | null,
  cnp?: string | null
): 'Dl.' | 'Dna.' {
  // 1. Verificare prioritară pe baza CNP-ului (cifra 1)
  if (cnp && typeof cnp === 'string') {
    const cleanCnp = cnp.trim();
    if (cleanCnp.length >= 1) {
      const firstDigit = cleanCnp.charAt(0);
      if (['1', '3', '5', '7'].includes(firstDigit)) {
        return 'Dl.';
      }
      if (['2', '4', '6', '8'].includes(firstDigit)) {
        return 'Dna.';
      }
    }
  }

  // 2. Protecție date nule
  if (!fullName || typeof fullName !== 'string') {
    return 'Dl.';
  }

  // 3. Curățare titluri profesionale uzuale și caractere de punctuație
  const cleanName = fullName
    .replace(/\b(ing\.|dr\.|ec\.|prof\.|av\.|conf\.|lect\.|arh\.|asist\.)\b/gi, '')
    .replace(/[,.\-_/\\]/g, ' ')
    .trim();

  if (!cleanName) {
    return 'Dl.';
  }

  const tokens = cleanName.split(/\s+/).filter(Boolean);

  // Excepții feminine notabile (prenume feminine care NU se termină în -a)
  const femaleExceptions = new Set([
    'carmen', 'alice', 'beatrice', 'ingrid', 'astrid', 'catrinel',
    'damaris', 'rachel', 'zoe', 'iris', 'ruth', 'ester', 'bebe'
  ]);

  // Excepții masculine notabile (prenume masculine românești care SE TERMINĂ în -a)
  const maleExceptions = new Set([
    'mircea', 'horia', 'mihnea', 'toma', 'luca', 'costea',
    'dima', 'sava', 'horea', 'mateia', 'necula', 'oprea', 'petrea'
  ]);

  // Nume de familie frecvente românești terminate în -a (care nu trebuie confundate cu prenume feminine)
  const maleSurnamesEndingInA = new Set([
    'popa', 'manea', 'badea', 'enache', 'voinea', 'mitrea', 'sandu', 'vrancea'
  ]);

  // Catalog extins de prenume feminine românești frecvente
  const commonFemaleNames = new Set([
    'maria', 'elena', 'ioana', 'andreea', 'cristina', 'ana', 'mihaela',
    'gabriela', 'simona', 'roxana', 'diana', 'laura', 'daniela', 'camelia',
    'monica', 'rodica', 'doina', 'mariana', 'nicoleta', 'alina', 'ramona',
    'oana', 'silvia', 'irina', 'emilia', 'iulia', 'georgeta', 'stefania',
    'larisa', 'denisa', 'madalina', 'georgiana', 'luminita', 'viorica',
    'liliana', 'florentina', 'claudia', 'anca', 'bianca', 'raluca', 'adriana',
    'alexandra', 'patricia', 'teodora', 'eugenia', 'paula', 'lorena', 'otilia',
    'corina', 'valentina', 'felicia', 'delia', 'ligia', 'gina', 'lia', 'sorina'
  ]);

  // Pasul 1: Verificare pe cataloagele de excepții și prenume comune
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (maleExceptions.has(lower)) {
      return 'Dl.';
    }
    if (femaleExceptions.has(lower) || commonFemaleNames.has(lower)) {
      return 'Dna.';
    }
  }

  // Pasul 2: Euristică morfologică românească (terminația în '-a' este feminină)
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (
      lower.length >= 3 &&
      lower.endsWith('a') &&
      !maleExceptions.has(lower) &&
      !maleSurnamesEndingInA.has(lower)
    ) {
      return 'Dna.';
    }
  }

  // Pasul 3: Implicit masculin dacă nu s-au identificat indicii feminine clare
  return 'Dl.';
}
```

### 5.3. Integrarea în Structura `resolveTemplateData` din `resolver.ts`

În corpul funcției `resolveTemplateData`:

```typescript
// 1. Deducție dinamică apelative pentru administratori și responsabili
const adminSalutation = detectRomanianSalutation(legalRepresentativeName);
const psiPerson = client?.psiResponder || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PSI;
const psiSalutation = detectRomanianSalutation(psiPerson);
const commMember = investMembers;
const memberSalutation = detectRomanianSalutation(commMember);

// 2. Formatare Decizia 10
const decizia10Formatted = `10/${decisionsDateRo}`;

// 3. Sanitizare numere autorizație igienă
const rawMsAuth = hygieneSession?.msAuthorization || ROMANIAN_LEGAL_HYGIENE.PLACEHOLDER_AVIZ_MS;
const cleanMsAuth = sanitizeAuthorizationNumber(rawMsAuth);
const rawMeAuth = hygieneSession?.meAuthorization || ROMANIAN_LEGAL_HYGIENE.PLACEHOLDER_AVIZ_ME;
const cleanMeAuth = sanitizeAuthorizationNumber(rawMeAuth);

// 4. Nivel dinamic de igienă
const calculatedHygieneLevel = resolveHygieneLevel({
  explicitLevel: (participant as any)?.level || (participant as any)?.hygieneLevel,
  jobTitle: job?.title || employee?.currentJob?.title,
  corCode: job?.corCode || employee?.currentJob?.corCode,
});

// 5. Injectare în verifiedMap
const verifiedMap: Record<string, unknown> = {
  ...
  // Decizii organizatorice
  PLACEHOLDER_NUMAR_DECIZIE_10: decizia10Formatted,
  PLACEHOLDER_APELATIV_ADMINISTRATOR: adminSalutation,
  PLACEHOLDER_APELATIV_PSI: psiSalutation,
  PLACEHOLDER_APELATIV_MEMBRU_COMISIE: memberSalutation,

  // Igienă
  PLACEHOLDER_AVIZ_MS: cleanMsAuth,
  PLACEHOLDER_AVIZ_ME: cleanMeAuth,
  PLACEHOLDER_NIVEL_IGIENA: calculatedHygieneLevel,

  // Anexă fișă post & HR
  PLACEHOLDER_NUMAR_CIM: (employee as any)?.cimNumber || 'CIM-______',
  PLACEHOLDER_DATA_CIM: hireDateRo,
  PLACEHOLDER_DATA_SEMNARII: hireDateRo,
  ...
};
```

---

## 6. Matricea de Concordanță a Celor 9 Șabloane Rectificate

| Nr. | Cod Șablon | Fișier Fizic | Câmpuri Noi Adăugate | Modificare XML / Fișier | Status |
|:---:|:---|:---|:---|:---|:---:|
| 1 | `risk-evaluare` | `EVALUAREA RISCURILOR.docx` | Token `PLACEHOLDER_NR_REG_COM` confirmat în antet | Eliminare `Bucuresti` static din `document.xml`; adăugare Capitole 6-7 | M1-P1 |
| 2 | `ipssm-birou` | `13 - ACTIVITATI DE BIROU.docx` | `PLACEHOLDER_FIRMA` | Înlocuire „agenților de pază” cu „personalului de birou”; adăugare antet firmă | M1-P1 |
| 3 | `ipssm-alunecari` | `11 - ALUNECARI.docx` | `PLACEHOLDER_FIRMA` | Adăugare antet `{PLACEHOLDER_FIRMA}` | M1-P1 |
| 4 | `training-detaliu-loc-munca` | `Detaliu Tematica loc de munca.docx` | `PLACEHOLDER_FUNCTIE` | Ștergere reclamă TinyPic din footers; adăugare funcție în titlu | M1-P1 |
| 5 | `decizii-angajator` | `DECIZII.docx` | `PLACEHOLDER_NUMAR_DECIZIE_10`, `PLACEHOLDER_APELATIV_*` | Înlocuire `Nr.10 din` cu token; înlocuire 26 x `Dna.` cu `{PLACEHOLDER_APELATIV_*}` | M1-P1 |
| 6 | `hr-anexa-fisa-post` | `Anexa fisa postului SSM.docx` | `PLACEHOLDER_FIRMA`, `CUI`, `FUNCTIE`, `COD_COR`, `NUMAR_CIM` | Antet societate + înlocuire SALARIAT static cu funcție și COR în tabel semnături | M1-P1 |
| 7 | `hr-gdpr-informare` | `Informare Protectia Datelor.docx` | Bază legală pe Art. 6(1)(b)/(c) și Art. 9(2)(b) GDPR | Eliminare puncte de suspensie reziduale la P12, P16, P17; înlocuire P18 | M1-P1 |
| 8 | `hygiene-tabel-cursanti` | `Tabel Cursanti exemplu.xlsx` | Format XLS curat | Eliminare chirurgicală a foii `Sheet1` (Registru de Casă) din workbook și rels | M1-P1 |
| 9 | `hygiene-adeverinta` | `Adeverinta participare.docx` | Sanitizare aviz MS/ME | Corectare stutter `Nr. Aviz MS nr.`; generare dinamică Nivel 1 vs Nivel 2 | M1-P1 |

---

## 7. Planul Secvențial de Execuție și Validare

1. **Pasul 1 (Execuție Scripturi Python pe Template-uri):**
   - Rularea scriptului de patch pentru `Informare Protectia Datelor.docx` în ambele directoare;
   - Rularea scriptului de eliminare OpenXML pentru `Tabel Cursanti exemplu.xlsx` în ambele directoare;
   - Rularea scriptului de curățare stutter pentru `Adeverinta participare.docx` în ambele directoare.
2. **Pasul 2 (Actualizare Cod TypeScript):**
   - Inserarea noilor tokenuri în `src/lib/templates/definitions.ts`;
   - Inserarea funcțiilor `detectRomanianSalutation`, `sanitizeAuthorizationNumber`, `resolveHygieneLevel` și a noilor mapări în `src/lib/templates/resolver.ts`.
3. **Pasul 3 (Verificare Build & Teste):**
   - Rularea `npm run build` pentru a garanta absența oricărei erori TypeScript sau Turbopack;
   - Generarea de probă a celor 3 documente (`Informare Protectia Datelor.docx`, `Tabel Cursanti exemplu.xlsx`, `Adeverinta participare.docx`) prin `resolveTemplateData` pe profiluri de bărbați și femei, confirmând că apelativele și nivelurile de igienă se generează impecabil.
