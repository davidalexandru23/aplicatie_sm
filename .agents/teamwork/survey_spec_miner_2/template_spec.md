# Catalog și Specificație Tehnică a Șabloanelor SSM / HR / Igienă

**Data investigației**: 2026-11-01  
**Autor**: Explorer 2 (Template Spec Miner)  
**Sursă autoritară**: Inspecție programmatică directă la nivel de XML (zipfile + xml.etree) a celor 25 de fișiere din `handoff/ssm-template-placeholder-pack/templates`.

---

## 1. Sinteză Executivă și Constatări Cheie

Pachetul conține **25 de șabloane normalizate** (23 documente DOCX și 2 registre de calcul XLSX), alături de 3 fișiere PDF complementare (exporturi statice de referință):

- **23 fișiere Word (`.docx`)**: Acoperă formulare HR, contracte de muncă, decizii interne ale angajatorului, instrucțiuni proprii de securitate a muncii (IPSSM), evaluări de riscuri, planuri de prevenire/urgență și tematici de instruire SSM.
- **2 fișiere Excel (`.xlsx`)**: Formulare administrative, cataloage de examen și registre de evidență pentru cursurile de igienă (Anexe Curs igiena.xlsx cu 8 foi de calcul și Tabel Cursanti exemplu.xlsx cu 1 foaie de lucru cu date).
- **3 fișiere PDF complementare (`.pdf`)**: `Cerere angajare.pdf`, `Declaratie luare cunostinta RI.pdf`, `Declaratie pe proprie raspundere CIM.pdf`. Acestea nu conțin câmpuri interactive native AcroForm și nici token-uri text decomprimabile în fluxul intern; sunt render-uri statice de referință vizuală.

---

## 2. Raport de Audit: Discrepanțe între Ground-Truth și Documentația Existentă

Inspecția directă a XML-urilor din arhivele `.docx` și `.xlsx` a identificat discrepanțe semnificative de „drift” între fișierele reale și inventarul textual din `INVENTAR_PLACEHOLDERE.md`:

| Fișier | Ce menționa `INVENTAR_PLACEHOLDERE.md` | Ce conține fișierul real pe disc (Ground Truth) | Impact Tehnic |
|---|---|---|---|
| **TESA.docx** | Serii de factori: `{PLACEHOLDER_G01}`..`G30`, `{PLACEHOLDER_F01}`..`F30`, `{PLACEHOLDER_N01}`..`N30`; plus token-uri `PLACEHOLDER_CATEGORIE_RISC`, `PLACEHOLDER_GRAFIC_*` | Folosește explicit `{PLACEHOLDER_GRAVITATE_RISC_01}`..`_30`, `{PLACEHOLDER_FRECVENTA_RISC_01}`..`_30`, `{PLACEHOLDER_NIVEL_PARTIAL_RISC_01}`..`_30`. Token-urile `CATEGORIE_RISC` și `GRAFIC_*` **nu există** în fișier! | Generatorul care caută token-uri scurte `_G01` eșuează; trebuie mapate token-urile lungi `_GRAVITATE_RISC_xx`. |
| **EVALUAREA RISCURILOR.docx** | Lista includea: `PLACEHOLDER_ADRESA_PRESTATOR`, `PLACEHOLDER_NUMAR_REG_COMERT`, `PLACEHOLDER_TELEFON_PRESTATOR` | Cele 3 token-uri de mai sus **lipsesc** din fișier. În schimb, apar token-urile reale: `{PLACEHOLDER_CONCLUZII_EVALUARE}` și `{PLACEHOLDER_NIVEL_RISC_GLOBAL}`. | Dacă se așteptau câmpuri de contact prestator în corp, ele nu există în document. |
| **Plan de Prevenire TESA.docx** | Enumera doar 3 token-uri: `FIRMA`, `PRESTATOR_SSM`, `SPECIALIST_SSM` | Fișierul conține 4 token-uri: include și `{PLACEHOLDER_REPREZENTANT_LEGAL}` (blocul de aprobare administrator). | Fără inspecția directă, semnatarul legal ar fi rămas ca placeholder nepopulat. |
| **Cerere angajare.docx** | Enumera token-ul `PLACEHOLDER_LOCALITATE_DOMICILIU` | Token-ul `LOCALITATE_DOMICILIU` **lipsește** din DOCX; adresa este cerută unitar prin `{PLACEHOLDER_ADRESA_DOMICILIU}`. | Cartografierea redundantă pe localitate separată este inutilă în Word. |
| **INFO dosar personal.docx** | Menționat: `_Fără token-uri detectate._` | Fișierul este un opis pur informativ (checklist) cu zero token-uri. În `definitions.ts`, stringul `_Fără token-uri detectate._` fusese parsat eronat drept un câmp necesar. | Câmpul fals trebuie eliminat din definițiile de date. |
| **Anexe Curs igiena.xlsx** | Menționa `PLACEHOLDER_MEMBRU_COMISIE_1` și `_2` | În foile 4 și 6, membrii comisiei folosesc sufix cu o singură cifră (`_1`, `_2`), spre deosebire de cursanți care au 3 cifre (`_001` - `_195`). | Logica de indexare regex trebuie să distingă formatele de sufix. |

---

## 3. Caracteristici Tehnice și Convenții de Formatare

### A. Documente Word (`.docx`)
1. **Sintaxă Delimitatori**: În Word, toate variabilele sunt scrise în format `{PLACEHOLDER_NUME_CAMP}` (acolade simple, fără spații interioare, caractere majuscule cu underscore).
2. **Amplasare XML**:
   - Marea majoritate a token-urilor se află în `word/document.xml`.
   - **Excepții critice (Antete și Subsoluri)**:
     - `Detaliu Tematica introductiv generala.docx` conține `{PLACEHOLDER_FIRMA}` în `word/header2.xml`.
     - `Detaliu Tematica loc de munca.docx` conține `{PLACEHOLDER_FIRMA}` în `word/header1.xml` și `word/header2.xml`.
     - `Plan actiune pericol grav si iminent.docx` conține `{PLACEHOLDER_FIRMA}` în `word/header1.xml`.
     - `Tematica introductiv generala 4h.docx` conține `{PLACEHOLDER_EMAIL_PRESTATOR}` și `{PLACEHOLDER_TELEFON_PRESTATOR}` în `word/footer1.xml`.
     - `Tematica loc de munca.docx` conține `{PLACEHOLDER_EMAIL_PRESTATOR}` și `{PLACEHOLDER_TELEFON_PRESTATOR}` în `word/footer1.xml`.
     - `Zone pericol grav si iminent.docx` conține `{PLACEHOLDER_FIRMA}` în `word/header2.xml`.
3. **Quirk de Hyperlink Relațional (`.rels`)**:
   În `Tematica introductiv generala 4h.docx` și `Tematica loc de munca.docx`, fișierul de relații `word/_rels/footer1.xml.rels` conține o țintă de hyperlink hardcodată: `Target="mailto:PLACEHOLDER_EMAIL_PRESTATOR"`. Motoarele de generare (cum e Docxtemplater) înlocuiesc textul din XML-ul principal, dar nu modifică fișierele `.rels`, ceea ce poate lăsa adresa URL brută dacă nu este tratată explicit.
4. **Împărțirea token-urilor între Run-uri (`<w:r>`)**:
   Dacă un document este modificat manual în Microsoft Word, textul `{PLACEHOLDER_XYZ}` poate fi fragmentat în noduri `<w:t>` diferite (ex. `{` într-un run, `PLACEHOLDER` în altul). Generatorul trebuie să utilizeze concatenarea sau un motor compatibil (ex. Docxtemplater cu PizZip) pentru a nu eșua la înlocuire.

### B. Registre Excel (`.xlsx`)
1. **Sintaxă Delimitatori**: În Excel, token-urile sunt scrise **fără acolade**, direct ca text: `PLACEHOLDER_NUME_CAMP`.
2. **Tipul Celulei**: În majoritatea foilor din `Anexe Curs igiena.xlsx`, celulele cu text sunt stocate fie ca `t="str"` (inline string în elementul `<v>`), fie ca `t="s"` (referință în `xl/sharedStrings.xml`).
3. **Structură Repetitivă Cursanți**:
   - Seriile repetitive de cursanți folosesc sufixe numerice cu 3 cifre: `_001`, `_002`, ..., până la `_100` (în Anexa 3, 4, 5) sau `_195` (în Anexa 8), respectiv `_115` în `Tabel Cursanti exemplu.xlsx`.
   - **Regulă de capacitate**: Dacă numărul real de cursanți este mai mic decât capacitatea tabelului (de ex. 15 cursanți dintr-un maxim de 100), rândurile neutilizate trebuie curățate (înlocuite cu string vid) pentru a nu afișa token-uri brute în fișierul final descărcat.
4. **Calcul Agregat**: Foile conțin celule pentru totaluri agregate: `PLACEHOLDER_NUMAR_CANDIDATI`, `PLACEHOLDER_NUMAR_PREZENTI`, `PLACEHOLDER_NUMAR_ADMISI`, `PLACEHOLDER_NUMAR_RESPINSI`. Acestea trebuie derivate automat din lista de prezență/rezultate.

---

## 4. Features Discovered (Toate cele 25 Șabloane)

| # | Categorie | Șablon / Caracteristică | Descriere & Scop | Intrări / Contexte | Ieșiri / Structură | Comportament la Lipsă Date | Sursă Descoperire |
|---|---|---|---|---|---|---|---|
| 1 | HR | `Cerere angajare.docx` | Cerere nominală a candidatului către conducere | Salariat (nume, CI, domiciliu), Post, Firmă, Dată angajare | 1 tabel (2x2 semnături), 11 token-uri `{PLACEHOLDER_*}` | Token vizibil; document marcat `missing_data` | `templates/Cerere angajare.docx` |
| 2 | HR | `Contract individual munca 2026.docx` | Model CIM conform legislației române 2026 | Date firmă, Salariat complet, Salariu, Durată, Clauze, Zile concediu/probă | 1 tabel (semnături bilaterale), 29 token-uri | Nu inventează clauze; lasă token necompletat | `templates/Contract individual munca 2026.docx` |
| 3 | HR | `Declaratie luare cunostinta RI.docx` | Confirmare primire/luare la cunoștință Regulament Intern | Salariat (nume, CNP, CI, adresă detaliată pe componente), Firmă, Dată | 1 tabel (semnătură salariat), 17 token-uri | Token vizibil; nu presupune acord fără date | `templates/Declaratie luare cunostinta RI.docx` |
| 4 | HR | `Declaratie pe proprie raspundere CIM.docx` | Declarație funcție de bază, pensie, persoane în întreținere | Salariat, Casa de sănătate, Persoane în întreținere (01 și 02) cu CNP/venit/invaliditate | 2 tabele (tabel persoane întreținute + semnătură), 20 token-uri | Câmpurile terților rămân necompletate dacă nu sunt furnizate | `templates/Declaratie pe proprie raspundere CIM.docx` |
| 5 | HR | `INFO dosar personal.docx` | Opis / checklist cu actele necesare angajării | Niciuna (document pur informativ) | 0 tabele, 0 token-uri (text static standard) | Nu se aplică (complet implicit) | `templates/INFO dosar personal.docx` |
| 6 | HR | `Informare Protectia Datelor.docx` | Notă de informare prelucrare date salariați (GDPR) | Firmă, Administrator, Salariat (nume defalcat: nume, prenume, nume complet, CNP, CI, domiciliu) | 0 tabele, 13 token-uri | Păstrează token-urile vizibile | `templates/Informare Protectia Datelor.docx` |
| 7 | HR | `Anexa fisa postului SSM.docx` | Anexa II la Fișa Postului - Atribuții SSM legale | Salariat (nume complet), Reprezentant legal firmă | 3 tabele (antet atribuții, semnături 4x13, tabel luare la cunoștință), 2 token-uri | Token vizibil în blocul de semnare | `templates/Anexa fisa postului SSM.docx` |
| 8 | Decizii | `DECIZII.docx` | Pachet unificat de 11 Decizii interne SSM/PSI și Permis de lucru cu foc | Firmă, Sediu, Administrator, Responsabili (SSM, PSI, Prim ajutor, Evaluator), Date decizii, Permis foc | 1 tabel, 44 token-uri (`NUMAR_DECIZIE_01`..`11`, date, ore, parametri tehnici de lucru) | Câmpurile nespecificate (ex. permis foc) rămân vizibile | `templates/DECIZII.docx` |
| 9 | IPSSM | `11 - ALUNECARI.docx` | Instrucțiuni proprii: prevenire alunecări și împiedicări | Administrator (aprobare), Specialist SSM (elaborare) | 0 tabele, 2 token-uri | Token vizibil în blocul de aprobare | `templates/11 - ALUNECARI.docx` |
| 10 | IPSSM | `12 - AUTOVEHICULE.docx` | Instrucțiuni proprii: circulația autovehiculelor | Firmă, Administrator, Specialist SSM | 0 tabele, 3 token-uri | Token vizibil în antet și bloc de aprobare | `templates/12 - AUTOVEHICULE.docx` |
| 11 | IPSSM | `13 - ACTIVITATI DE BIROU.docx` | Instrucțiuni proprii: ergonomie și lucru la birou | Administrator, Specialist SSM | 0 tabele, 2 token-uri | Token vizibil în antet/aprobare | `templates/13 - ACTIVITATI DE BIROU.docx` |
| 12 | IPSSM | `IP 01-10 UNIVERSALE.docx` | Pachet de 10 instrucțiuni proprii universale | Firmă, Administrator, Specialist SSM | 0 tabele, 3 token-uri | Token vizibil în pagina de titlu și aprobare | `templates/IP 01-10 UNIVERSALE.docx` |
| 13 | IPSSM | `OPIS IPSSM.docx` | Borderou / index central al instrucțiunilor proprii aplicabile | Firmă, Date contact prestator (email, telefon) | 0 tabele, 3 token-uri | Token vizibil în antetul opisului | `templates/OPIS IPSSM.docx` |
| 14 | Evaluare Riscuri | `EVALUAREA RISCURILOR.docx` | Dosar general de evaluare riscuri (metoda INCDPM) | Firmă, CUI, Adresă, Date prestator, An înființare/evaluare, Număr lucrători, Program, Concluzii | 0 tabele, 16 token-uri | Nu inventează concluzii; evaluatorul le completează profesional | `templates/EVALUAREA RISCURILOR.docx` |
| 15 | Evaluare Riscuri | `Plan de Prevenire TESA.docx` | Planul de măsuri de prevenire și protecție anual | Firmă, Prestator SSM, Specialist SSM, Reprezentant legal | 0 tabele, 4 token-uri | Păstrează măsurile exemplificative; nu atribuie automat fără validare | `templates/Plan de Prevenire TESA.docx` |
| 16 | Evaluare Riscuri | `Plan actiune pericol grav si iminent.docx` | Procedură de urgență, oprire și evacuare la pericol grav | Denumire firmă (inclusiv în antetul paginilor) | 1 tabel (plan acțiune), 1 token în corp + `header1.xml` | Token vizibil în antet | `templates/Plan actiune pericol grav si iminent.docx` |
| 17 | Evaluare Riscuri | `Zone pericol grav si iminent.docx` | Evidența zonelor cu risc ridicat și măsuri specifice | Firmă, Director, Lucrător desemnat, 6 Zone cu risc și măsuri (`DENUMIRE_ZONA_01`..`06`, `MASURI_ZONA_01`..`06`) | 0 tabele, 15 token-uri (inclusiv token în `header2.xml`) | Zonele neutilizate rămân token vizibil sau se completează manual | `templates/Zone pericol grav si iminent.docx` |
| 18 | Evaluare Riscuri | `TESA.docx` | Fișă de evaluare detaliată post TESA (30 factori de risc) | Post, Departament, Persoane expuse, Durată, Nivel global, 30x Gravitate (`GRAVITATE_RISC_01`..`30`), 30x Frecvență (`FRECVENTA_RISC_01`..`30`), 30x Nivel parțial (`NIVEL_PARTIAL_RISC_01`..`30`) | 0 tabele, 103 token-uri | Nu inventează scoruri; necesită matrice validată de evaluator | `templates/TESA.docx` |
| 19 | Instruire SSM/SU | `Tematica introductiv generala 4h.docx` | Programa oficială de instruire SSM introductiv-generală (4 ore) | Firmă, Data aplicării, Contact prestator (email, telefon în footer și rels) | 2 tabele (agenda orară și pauze), 4 token-uri | Token vizibil în corpul tematicii și în subsol | `templates/Tematica introductiv generala 4h.docx` |
| 20 | Instruire SSM/SU | `Detaliu Tematica introductiv generala.docx` | Suport teoretic de instruire introductiv-generală | Firmă (inclusiv în `header2.xml`), Administrator, Specialist SSM | 0 tabele, 3 token-uri | Token vizibil în antet și text | `templates/Detaliu Tematica introductiv generala.docx` |
| 21 | Instruire SSM/SU | `Tematica loc de munca.docx` | Programa de instruire SSM la locul de muncă pe post | Firmă, Post (`PLACEHOLDER_FUNCTIE`), Data aplicării, Contact prestator | 1 tabel, 5 token-uri (inclusiv în `footer1.xml` și `_rels`) | Nu se generează fără selectarea postului | `templates/Tematica loc de munca.docx` |
| 22 | Instruire SSM/SU | `Detaliu Tematica loc de munca.docx` | Ghid detaliat pentru instruirea pe post / periodică | Firmă (inclusiv în `header1.xml` și `header2.xml`), Reprezentant legal | 0 tabele, 2 token-uri | Token vizibil în anteturi | `templates/Detaliu Tematica loc de munca.docx` |
| 23 | Cursuri Igienă | `Adeverinta participare.docx` | Adeverință nominală de absolvire a cursului de igienă | Sesiune (avize MS/ME, date prestator), Cursant (nume, CNP, dată/loc naștere, modul, nivel), Număr/serie adeverință, Dată eliberare | 1 tabel (antet ministere), 14 token-uri | Se emite exclusiv din sesiune + participant cu examen promovat | `templates/Adeverinta participare.docx` |
| 24 | Cursuri Igienă | `Anexe Curs igiena.xlsx` | Pachet complet de 8 anexe oficiale (Cerere, Decizie, Catalog curs, Prezență, Rezultate examen, PV examen, Model certificat, Registru certificate) | Date autorizare furnizor, Comisie examinare, Listă cursanți (până la 195 participanți cu CNP, serie CI, note, rezultate) | 8 foi de calcul, 70 token-uri de bază, 2314 celule cu token-uri | Cursanții inexistenți peste efectivul sesiunii sunt goliți pe rândurile repetitive | `templates/Anexe Curs igiena.xlsx` |
| 25 | Cursuri Igienă | `Tabel Cursanti exemplu.xlsx` | Tabel de lucru / evidență cursanți pentru sesiune | Dată examen (`PLACEHOLDER_DATA_EXAMEN`), Cursanți 001–115 (nume, CNP, dată naștere defalcată: zi, lună, an, loc naștere, CI, modul/nivel) | 2 foi de calcul (`Curs (2)` și `Sheet1`), 10 token-uri de bază, 1036 celule | Rândurile suplimentare se golesc | `templates/Tabel Cursanti exemplu.xlsx` |

---

## 5. Edge Cases & Particularități Tehnice

| # | Șablon / Caracteristică | Intrare / Situație Limită | Comportament Observat & Constrângere Tehnică |
|---|---|---|---|
| 1 | `Tematica introductiv generala 4h.docx` & `Tematica loc de munca.docx` | Hyperlink de contact prestator în subsolul paginii | Token-ul `{PLACEHOLDER_EMAIL_PRESTATOR}` este prezent atât în `word/footer1.xml`, cât și în `word/_rels/footer1.xml.rels` (`Target="mailto:PLACEHOLDER_EMAIL_PRESTATOR"`). Un generator DOCX standard înlocuiește doar textul vizibil, lăsând ținta URL a linkului neschimbată dacă `.rels` nu este procesat. |
| 2 | `Detaliu Tematica introductiv generala.docx`, `Detaliu Tematica loc de munca.docx`, `Plan actiune pericol grav si iminent.docx`, `Zone pericol grav si iminent.docx` | Token-ul `{PLACEHOLDER_FIRMA}` plasat exclusiv sau duplicat în antetele paginilor (`word/header1.xml`, `header2.xml`) | Dacă generatorul procesează exclusiv `word/document.xml`, antetele generate vor păstra vizibil stringul `{PLACEHOLDER_FIRMA}` pe fiecare pagină tipărită. |
| 3 | `Anexe Curs igiena.xlsx` (Foile 3, 4, 5, 8) | Sesiune cu număr redus de cursanți (ex. 12 cursanți dintr-o capacitate maximă de 100 sau 195) | Foaia are pre-populați token-uri `PLACEHOLDER_NUME_COMPLET_001` .. `_195`. Dacă celulele nefolosite nu sunt suprascrise cu string vid `""`, documentul Excel exportat va conține sute de celule cu textul `PLACEHOLDER_*` vizibil. |
| 4 | `Anexe Curs igiena.xlsx` (Foile 4 și 6) | Numele membrilor comisiei de examinare | În foaia 4 este `PLACEHOLDER_MEMBRU_COMISIE_1`, iar în foaia 6 sunt `PLACEHOLDER_MEMBRU_COMISIE_1` și `PLACEHOLDER_MEMBRU_COMISIE_2` (sufix cu o singură cifră), spre deosebire de cursanți care folosesc 3 cifre (`_001`). O regulă regex rigidă `_\d{3}$` nu prinde membrii comisiei. |
| 5 | `INFO dosar personal.docx` | Solicitare de generare sau validare de date | Documentul nu conține niciun token `{PLACEHOLDER_*}`. Este un checklist pur informativ. Dacă sistemul cere validarea câmpurilor, documentul trebuie marcat direct ca valid și generabil fără parametri de intrare. |
| 6 | `TESA.docx` | Lipsa valorilor de evaluare profesională (gravitate, frecvență, nivel parțial) | Șablonul conține 90 de token-uri pentru cei 30 de factori de risc (`GRAVITATE_RISC_01..30`, `FRECVENTA_RISC_01..30`, `NIVEL_PARTIAL_RISC_01..30`). Conform cerințelor de integritate, dacă evaluatorul uman nu a evaluat un factor, sistemul nu trebuie să genereze scoruri sintetice, ci să lase token-ul vizibil și să marcheze documentul `missing_data`. |
| 7 | `Cerere angajare.pdf`, `Declaratie luare cunostinta RI.pdf`, `Declaratie pe proprie raspundere CIM.pdf` | Solicitare de completare automată direct în PDF | Fișierele PDF nu conțin câmpuri AcroForm (form-fields native) și nici token-uri text decomprimabile. Completarea lor necesită fie tehnologie de overlay cu coordonate vizuale absolute (cum face `pdf-lib` în `generator.ts`), fie utilizarea fișierelor DOCX corespondente ca sursă principală de generare. |

---

## 6. Inventar Detaliat pe Șablon (Profile Complete)

### 6.1. Categoria HR (Resurse Umane)

#### [01] `Cerere angajare.docx`
- **Cod intern**: `hr-cerere-angajare` | **Nivel context**: `employee` | **Format**: `docx`
- **Descriere**: Cerere formulată de salariat pentru angajarea într-o funcție specifică la societate.
- **Tabele**: 1 tabel (1 rând x 2 coloane pentru blocul inferior Dată / Semnătură candidat și Aprobare reprezentant legal).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (11)**:
  `PLACEHOLDER_ADRESA_DOMICILIU`, `PLACEHOLDER_DATA_ANGAJARII`, `PLACEHOLDER_DATA_CERERE`, `PLACEHOLDER_DATA_EMITERII`, `PLACEHOLDER_EMITENT_ACT`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_NUMAR_ACT`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SERIE_ACT`.
- **Note & Particularități**: Token-ul `PLACEHOLDER_LOCALITATE_DOMICILIU` din inventarul vechi nu există în textul real. Adresa completă este preluată de `PLACEHOLDER_ADRESA_DOMICILIU`.

#### [02] `Contract individual munca 2026.docx`
- **Cod intern**: `hr-cim-2026` | **Nivel context**: `employee` | **Format**: `docx`
- **Descriere**: Contract individual de muncă adaptat cerințelor legale actuale (Legea 53/2003 consolidată).
- **Tabele**: 1 tabel (1 rând x 2 coloane pentru semnăturile Angajator și Salariat).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (29)**:
  `PLACEHOLDER_ADRESA_DOMICILIU`, `PLACEHOLDER_ADRESA_FIRMA`, `PLACEHOLDER_ADRESA_PUNCT_LUCRU`, `PLACEHOLDER_ALTE_DREPTURI_SALARIALE`, `PLACEHOLDER_ARTICOL_DURATA_DETERMINATA`, `PLACEHOLDER_CALITATE_REPREZENTANT`, `PLACEHOLDER_CNP`, `PLACEHOLDER_COD_COR`, `PLACEHOLDER_CUI`, `PLACEHOLDER_DATA_INCEPERE`, `PLACEHOLDER_DATA_PLATA`, `PLACEHOLDER_DATA_SEMNARE`, `PLACEHOLDER_DATA_SFARSIT`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_NR_REG_COM`, `PLACEHOLDER_NUMAR_ACT`, `PLACEHOLDER_NUMAR_CIM`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_ORE_PE_ZI`, `PLACEHOLDER_PERMIS_MUNCA`, `PLACEHOLDER_PROGRAM_LUCRU`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SALARIU_BRUT`, `PLACEHOLDER_SERIE_ACT`, `PLACEHOLDER_TELEFON_CONTACT`, `PLACEHOLDER_ZILE_CONCEDIU`, `PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE`, `PLACEHOLDER_ZILE_PROBA`.
- **Note & Particularități**: Câmpurile contractuale (salariu, perioadă probă, preaviz, ore/zi) trebuie introduse explicit sau configurate la nivel de companie/post, fără valori deduse arbitrar.

#### [03] `Declaratie luare cunostinta RI.docx`
- **Cod intern**: `hr-declaratie-regulament` | **Nivel context**: `employee` | **Format**: `docx`
- **Descriere**: Declarația salariatului privind luarea la cunoștință a Regulamentului Intern și a procedurilor interne.
- **Tabele**: 1 tabel (1 rând x 2 coloane: Dată și Semnătură salariat).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (17)**:
  `PLACEHOLDER_APARTAMENT`, `PLACEHOLDER_BLOC`, `PLACEHOLDER_CNP`, `PLACEHOLDER_DATA_DECLARATIE`, `PLACEHOLDER_DATA_EMITERII`, `PLACEHOLDER_EMITENT_ACT`, `PLACEHOLDER_ETAJ`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_JUDET_DOMICILIU`, `PLACEHOLDER_LOCALITATE_DOMICILIU`, `PLACEHOLDER_NUMAR_ACT`, `PLACEHOLDER_NUMAR_DOMICILIU`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_SCARA`, `PLACEHOLDER_SERIE_ACT`, `PLACEHOLDER_STRADA_DOMICILIU`, `PLACEHOLDER_TIP_ACT`.
- **Note & Particularități**: Spre deosebire de alte documente care folosesc adresa concatenată, acest formular descompune adresa de domiciliu pe toate elementele componente (stradă, număr, bloc, scară, etaj, apartament, județ).

#### [04] `Declaratie pe proprie raspundere CIM.docx`
- **Cod intern**: `hr-declaratie-raspundere` | **Nivel context**: `employee` | **Format**: `docx`
- **Descriere**: Declarație privind funcția de bază, casa de asigurări de sănătate, statutul de pensionar și persoanele coasigurate/în întreținere pentru deducere personală.
- **Tabele**: 2 tabele (Tabelul 1: 3 rânduri x 5 coloane pentru persoane în întreținere; Tabelul 2: 1 rând x 2 coloane pentru Dată și Semnătură).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (20)**:
  `PLACEHOLDER_CALITATE_PERSOANA_01`, `PLACEHOLDER_CALITATE_PERSOANA_02`, `PLACEHOLDER_CASA_SANATATE`, `PLACEHOLDER_CNP_PERSOANA_01`, `PLACEHOLDER_CNP_PERSOANA_02`, `PLACEHOLDER_DATA_DECLARATIE`, `PLACEHOLDER_DATA_EMITERII`, `PLACEHOLDER_DATA_INTRETINERE_01`, `PLACEHOLDER_DATA_INTRETINERE_02`, `PLACEHOLDER_EMITENT_ACT`, `PLACEHOLDER_INVALIDITATE_PERSOANA_01`, `PLACEHOLDER_INVALIDITATE_PERSOANA_02`, `PLACEHOLDER_NUMAR_ACT`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_NUME_COMPLET_PERSOANA_01`, `PLACEHOLDER_NUME_COMPLET_PERSOANA_02`, `PLACEHOLDER_SERIE_ACT`, `PLACEHOLDER_TIP_PENSIE`, `PLACEHOLDER_VENIT_PERSOANA_01`, `PLACEHOLDER_VENIT_PERSOANA_02`.
- **Note & Particularități**: Suportă până la 2 persoane în întreținere (`_01` și `_02`). Dacă salariatul nu are persoane în întreținere, câmpurile respective rămân necompletate sau marcate cu linie.

#### [05] `INFO dosar personal.docx`
- **Cod intern**: `hr-info-dosar` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Ghid informativ și opis cu actele obligatorii necesare la dosarul personal de angajare.
- **Tabele**: 0 tabele.
- **Format token-uri**: Nu are token-uri (0 token-uri).
- **Note & Particularități**: Document pur static. În baza de date / catalog trebuie înregistrat cu `fields: []`.

#### [06] `Informare Protectia Datelor.docx`
- **Cod intern**: `hr-gdpr-informare` | **Nivel context**: `employee` | **Format**: `docx`
- **Descriere**: Notă de informare privind prelucrarea datelor cu caracter personal ale salariatului conform Regulamentului (UE) 2016/679 (GDPR).
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (13)**:
  `PLACEHOLDER_ADRESA_DOMICILIU`, `PLACEHOLDER_ADRESA_FIRMA`, `PLACEHOLDER_CNP`, `PLACEHOLDER_DATA_EMITERII`, `PLACEHOLDER_EMITENT_ACT`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_LOCALITATE_SEMNARE`, `PLACEHOLDER_NUMAR_ACT`, `PLACEHOLDER_NUME`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_PRENUME`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SERIE_ACT`.
- **Note & Particularități**: Conține atât `PLACEHOLDER_NUME_COMPLET`, cât și componentele separate `PLACEHOLDER_NUME` (nume de familie) și `PLACEHOLDER_PRENUME`.

#### [07] `Anexa fisa postului SSM.docx`
- **Cod intern**: `hr-anexa-fisa-post` | **Nivel context**: `employee` | **Format**: `docx`
- **Descriere**: Anexa II la Fișa Postului cuprinzând atribuțiile și răspunderile în domeniul SSM conform art. 22-23 din Legea 319/2006.
- **Tabele**: 3 tabele (Tabel 1: titlu; Tabel 2: 4 rânduri x 13 coloane conținând semnătura administratorului și a salariatului; Tabel 3: 3 rânduri x 4 coloane pentru evidența luării la cunoștință).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în celulele tabelului 2.
- **Lista completă token-uri (2)**:
  `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_REPREZENTANT_LEGAL`.
- **Note & Particularități**: Celulele destinate semnăturii olografe rămân goale; numele este inserat sub rolul respectiv.

---

### 6.2. Categoria Decizii Angajator

#### [08] `DECIZII.docx`
- **Cod intern**: `decizii-angajator` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Set cuprinzător de 11 decizii interne ale angajatorului pentru organizarea activității SSM și PSI:
  1. Organizarea activității de securitate și sănătate în muncă (Decizia 01)
  2. Desemnarea persoanelor responsabile cu acordarea primului ajutor (Decizia 02)
  3. Desemnarea responsabilului de stingere a incendiilor / PSI (Decizia 03)
  4. Instruirea lucrătorilor în domeniul SSM și periodicitatea instruirilor (Decizia 04)
  5. Acordarea echipamentului individual de protecție (Decizia 05)
  6. Comisia de cercetare a incidentelor / accidentelor ușoare (Decizia 06)
  7. Desemnarea persoanelor cu atribuții la oprirea/evacuarea de urgență (Decizia 07)
  8. Aprobarea instrucțiunilor proprii de securitate a muncii (Decizia 08)
  9. Evaluarea riscurilor profesionale (Decizia 09)
  10. Interzicerea fumatului în spațiile închise (Decizia 10)
  11. Reglementarea lucrului cu foc deschis și emiterea permisului de lucru cu foc (Decizia 11 + Formular Permis de lucru cu foc)
- **Tabele**: 1 tabel (formularul Permis de lucru cu foc).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (44)**:
  `PLACEHOLDER_ADRESA_FIRMA`, `PLACEHOLDER_AJUTOR_LUCRARE`, `PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT`, `PLACEHOLDER_DATA_BULETIN_ANALIZA`, `PLACEHOLDER_DATA_DECIZIE`, `PLACEHOLDER_DATA_FINALIZARE_LUCRARE`, `PLACEHOLDER_DATA_INCEPERE_LUCRARE`, `PLACEHOLDER_DATA_INTOCMIRE`, `PLACEHOLDER_DATA_PERMIS_FOC`, `PLACEHOLDER_DESCRIERE_LUCRARE`, `PLACEHOLDER_DOMENIU_INSTRUIRE`, `PLACEHOLDER_EMITENT_BULETIN_ANALIZA`, `PLACEHOLDER_EVALUATOR_RISC`, `PLACEHOLDER_EXECUTANT_LUCRARE`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_FUNCTIE_INSTRUCTOR`, `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`, `PLACEHOLDER_MASURI_PSI_SUPLIMENTARE`, `PLACEHOLDER_MEMBRU_COMISIE`, `PLACEHOLDER_METODA_IZOLARE_INSTALATII`, `PLACEHOLDER_MIJLOACE_STINGERE`, `PLACEHOLDER_NUMAR_BULETIN_ANALIZA`, `PLACEHOLDER_NUMAR_DECIZIE_01`, `PLACEHOLDER_NUMAR_DECIZIE_02`, `PLACEHOLDER_NUMAR_DECIZIE_03`, `PLACEHOLDER_NUMAR_DECIZIE_04`, `PLACEHOLDER_NUMAR_DECIZIE_05`, `PLACEHOLDER_NUMAR_DECIZIE_06`, `PLACEHOLDER_NUMAR_DECIZIE_07`, `PLACEHOLDER_NUMAR_DECIZIE_08`, `PLACEHOLDER_NUMAR_DECIZIE_09`, `PLACEHOLDER_NUMAR_DECIZIE_11`, `PLACEHOLDER_NUMAR_PERMIS_FOC`, `PLACEHOLDER_ORA_FINALIZARE`, `PLACEHOLDER_ORA_INCEPERE`, `PLACEHOLDER_PROTECTIE_MATERIALE`, `PLACEHOLDER_RAZA_PROTECTIE_METRI`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_RESPONSABIL_CONTROL_PSI`, `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`, `PLACEHOLDER_RESPONSABIL_PSI`, `PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI`, `PLACEHOLDER_TEHNOLOGIE_LUCRU`, `PLACEHOLDER_VENTILARE_SPATIU`.
- **Note & Particularități**: Numerotarea deciziilor (`NUMAR_DECIZIE_01`..`11`) trebuie să fie secvențială per companie. Câmpurile specifice permisului de foc se completează la intervenție.

---

### 6.3. Categoria Instrucțiuni Proprii SSM (IPSSM)

#### [09] `11 - ALUNECARI.docx`
- **Cod intern**: `ipssm-alunecari` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Instrucțiuni proprii pentru prevenirea alunecărilor și căderilor de la același nivel.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (2)**:
  `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`.

#### [10] `12 - AUTOVEHICULE.docx`
- **Cod intern**: `ipssm-autovehicule` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Instrucțiuni proprii pentru circulația autovehiculelor pe teritoriul societății și deplasări în misiune.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (3)**:
  `PLACEHOLDER_FIRMA`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`.

#### [11] `13 - ACTIVITATI DE BIROU.docx`
- **Cod intern**: `ipssm-birou` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Instrucțiuni proprii de securitate a muncii pentru activități de birou și ecrane de vizualizare (ergonomie).
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (2)**:
  `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`.

#### [12] `IP 01-10 UNIVERSALE.docx`
- **Cod intern**: `ipssm-universale` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Culegere generală de instrucțiuni proprii universale pentru echipamente de muncă, riscuri electrice, manipulare mase etc.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (3)**:
  `PLACEHOLDER_FIRMA`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`.

#### [13] `OPIS IPSSM.docx`
- **Cod intern**: `ipssm-opis` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Opisul / indexul instrucțiunilor proprii de securitate a muncii aplicabile la nivelul societății.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (3)**:
  `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_TELEFON_PRESTATOR`.

---

### 6.4. Categoria Evaluare Riscuri & Planuri de Urgență

#### [14] `EVALUAREA RISCURILOR.docx`
- **Cod intern**: `risk-evaluare` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Dosar oficial de evaluare globală a riscurilor profesionale la nivelul întreprinderii conform metodei INCDPM.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (16)**:
  `PLACEHOLDER_ACTIVITATE_PRINCIPALA`, `PLACEHOLDER_ADRESA_FIRMA`, `PLACEHOLDER_AN_EVALUARE`, `PLACEHOLDER_AN_INFIINTARE`, `PLACEHOLDER_CERTIFICAT_EVALUATOR`, `PLACEHOLDER_COD_CAEN`, `PLACEHOLDER_CONCLUZII_EVALUARE`, `PLACEHOLDER_CUI`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_NIVEL_RISC_GLOBAL`, `PLACEHOLDER_NUMAR_LUCRATORI`, `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_PROGRAM_LUCRU`, `PLACEHOLDER_SITE_PRESTATOR`.
- **Note & Particularități**: Token-urile `CONCLUZII_EVALUARE` și `NIVEL_RISC_GLOBAL` sunt prezente în corpul documentului și cer validare profesională de către evaluatorul de risc atestat.

#### [15] `Plan de Prevenire TESA.docx`
- **Cod intern**: `risk-plan-prevenire-tesa` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Plan de prevenire și protecție anual pentru personalul TESA / birou, decurgând din evaluarea riscurilor.
- **Tabele**: 0 tabele (formatat tabelar prin paragrafe tabulare sau text structurat).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (4)**:
  `PLACEHOLDER_FIRMA`, `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`.
- **Note & Particularități**: Măsurile pentru factorii 11–19 sunt descrise ca model standard de bune practici.

#### [16] `Plan actiune pericol grav si iminent.docx`
- **Cod intern**: `risk-plan-actiune-urgenta` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Plan de acțiune în caz de pericol grav și iminent: atribuții de evacuare, oprire utilaje, prim ajutor.
- **Tabele**: 1 tabel (planul efectiv de acțiune).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml` și `word/header1.xml`.
- **Lista completă token-uri (1)**:
  `PLACEHOLDER_FIRMA`.
- **Note & Particularități**: Apare în antetul `header1.xml`.

#### [17] `Zone pericol grav si iminent.docx`
- **Cod intern**: `risk-zone-pericol` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Evidența nominală a zonelor cu risc ridicat și specific și a măsurilor tehnico-organizatorice aferente.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml` și `word/header2.xml`.
- **Lista completă token-uri (15)**:
  `PLACEHOLDER_DENUMIRE_ZONA_01`, `PLACEHOLDER_DENUMIRE_ZONA_02`, `PLACEHOLDER_DENUMIRE_ZONA_03`, `PLACEHOLDER_DENUMIRE_ZONA_04`, `PLACEHOLDER_DENUMIRE_ZONA_05`, `PLACEHOLDER_DENUMIRE_ZONA_06`, `PLACEHOLDER_DIRECTOR`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`, `PLACEHOLDER_MASURI_ZONA_01`, `PLACEHOLDER_MASURI_ZONA_02`, `PLACEHOLDER_MASURI_ZONA_03`, `PLACEHOLDER_MASURI_ZONA_04`, `PLACEHOLDER_MASURI_ZONA_05`, `PLACEHOLDER_MASURI_ZONA_06`.
- **Note & Particularități**: `{PLACEHOLDER_FIRMA}` se află în antetul `header2.xml`. Conține 6 zone predefinite asociate cu măsurile respective (`_01` la `_06`).

#### [18] `TESA.docx`
- **Cod intern**: `ipssm-tesa` | **Nivel context**: `job` / `client` | **Format**: `docx`
- **Descriere**: Fișă detaliată de evaluare a riscurilor profesionale pentru postul TESA conform metodei INCDPM, acoperind 30 de factori de risc pe componentele sistemului de muncă (Executant, Sarcină de muncă, Mijloace de producție, Mediu de muncă).
- **Tabele**: 0 tabele (structurat ca blocuri de text).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (103)**:
  - **13 Câmpuri generale**: `PLACEHOLDER_DEPARTAMENT`, `PLACEHOLDER_DURATA_EXPUNERII`, `PLACEHOLDER_EVALUATOR_RISC`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_NIVEL_RISC_GLOBAL`, `PLACEHOLDER_NUMAR_DOCUMENT`, `PLACEHOLDER_NUMAR_FACTORI_RISC`, `PLACEHOLDER_NUMAR_FISA_EVALUARE`, `PLACEHOLDER_NUMAR_LOC_MUNCA`, `PLACEHOLDER_NUMAR_PERSOANE_EXPUSE`, `PLACEHOLDER_REPARTITIE_RISCURI`, `PLACEHOLDER_REPREZENTANT_LEGAL`.
  - **30x Clasă de gravitate**: `PLACEHOLDER_GRAVITATE_RISC_01` până la `PLACEHOLDER_GRAVITATE_RISC_30`.
  - **30x Clasă de frecvență / probabilitate**: `PLACEHOLDER_FRECVENTA_RISC_01` până la `PLACEHOLDER_FRECVENTA_RISC_30`.
  - **30x Nivel parțial de risc**: `PLACEHOLDER_NIVEL_PARTIAL_RISC_01` până la `PLACEHOLDER_NIVEL_PARTIAL_RISC_30`.
- **Note & Particularități**: Nivelul de gravitate variază de la 1 la 7, frecvența de la 1 la 6, iar nivelul parțial de la 1 la 7 (conform grilei 7x6 INCDPM). Nivelul de risc global este media ponderată a nivelurilor parțiale. Nu există token-uri grafice în XML.

---

### 6.5. Categoria Instruire SSM / PSI (Tematici & Detalii)

#### [19] `Tematica introductiv generala 4h.docx`
- **Cod intern**: `training-tematica-introductiv` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Tematica și programul orar pentru instruirea introductiv-generală în domeniul securității și sănătății în muncă (durată 4 ore conform HG 1425/2006).
- **Tabele**: 2 tabele (Tabel 1: programul instruirii pe capitole; Tabel 2: detalierea pauzelor și modulelor).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`, `word/footer1.xml` și `word/_rels/footer1.xml.rels`.
- **Lista completă token-uri (4)**:
  `PLACEHOLDER_DATA_APLICARE`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_TELEFON_PRESTATOR`.
- **Note & Particularități**: Datele de contact ale prestatorului sunt în subsolul paginii.

#### [20] `Detaliu Tematica introductiv generala.docx`
- **Cod intern**: `training-detaliu-introductiv` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Material suport detaliat care conține conținutul teoretic complet al tematicii introductiv-generale (legislație, drepturi, obligații, prim ajutor).
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml` și `word/header2.xml`.
- **Lista completă token-uri (3)**:
  `PLACEHOLDER_FIRMA`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`.
- **Note & Particularități**: Denumirea firmei apare în antetul `header2.xml`.

#### [21] `Tematica loc de munca.docx`
- **Cod intern**: `training-tematica-loc-munca` | **Nivel context**: `job` / `client` | **Format**: `docx`
- **Descriere**: Programa de instruire la locul de muncă specifică funcției / postului salariatului.
- **Tabele**: 1 tabel (organizarea instruirii practice și teoretice).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`, `word/footer1.xml` și `word/_rels/footer1.xml.rels`.
- **Lista completă token-uri (5)**:
  `PLACEHOLDER_DATA_APLICARE`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_FIRMA`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_TELEFON_PRESTATOR`.
- **Note & Particularități**: Include `{PLACEHOLDER_FUNCTIE}` pentru adaptarea pe post.

#### [22] `Detaliu Tematica loc de munca.docx`
- **Cod intern**: `training-detaliu-loc-munca` | **Nivel context**: `client` | **Format**: `docx`
- **Descriere**: Ghid complet și suport explicativ pentru efectuarea instruirii la locul de muncă și a instruirilor periodice SSM.
- **Tabele**: 0 tabele.
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`, `word/header1.xml` și `word/header2.xml`.
- **Lista completă token-uri (2)**:
  `PLACEHOLDER_FIRMA`, `PLACEHOLDER_REPREZENTANT_LEGAL`.
- **Note & Particularități**: Antetele conțin denumirea firmei pe fiecare pagină.

---

### 6.6. Categoria Cursuri de Igienă (Conform Ordin 1225/5031/2003 & Metodologia 2022)

#### [23] `Adeverinta participare.docx`
- **Cod intern**: `hygiene-adeverinta` | **Nivel context**: `hygiene_session` (nominal per cursant) | **Format**: `docx`
- **Descriere**: Adeverință nominală eliberată absolventului cursului de instruire privind însușirea noțiunilor fundamentale de igienă, valabilă până la emiterea certificatului oficial.
- **Tabele**: 1 tabel (1 rând x 2 coloane: antetul oficial Ministerul Sănătății / Ministerul Educației).
- **Format token-uri**: Inline curly `{PLACEHOLDER_*}` în `word/document.xml`.
- **Lista completă token-uri (14)**:
  `PLACEHOLDER_AVIZ_ME`, `PLACEHOLDER_AVIZ_MS`, `PLACEHOLDER_CNP`, `PLACEHOLDER_DATA_ELIBERARE`, `PLACEHOLDER_DATA_NASTERII`, `PLACEHOLDER_JUDET_NASTERII`, `PLACEHOLDER_LOCALITATE_NASTERII`, `PLACEHOLDER_MODUL_IGIENA`, `PLACEHOLDER_NIVEL_IGIENA`, `PLACEHOLDER_NUMAR_ADEVERINTA`, `PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_REPREZENTANT_PRESTATOR`, `PLACEHOLDER_SERIE_ADEVERINTA`.
- **Note & Particularități**: Se emite strict pe baza unei sesiuni de igienă cu participare și examen final promovat.

#### [24] `Anexe Curs igiena.xlsx`
- **Cod intern**: `hygiene-anexe-catalog` | **Nivel context**: `hygiene_session` | **Format**: `xlsx`
- **Descriere**: Registru de lucru oficial compus din 8 foi de calcul conținând formularele administrative obligatorii conform metodologiei de autorizare și derulare a cursurilor de igienă:
  - **Foaia 1 ("Anexa nr. 1")**: Înștiințare / Cerere organizare sesiune transmisă către DSP. Conține 19 token-uri scalare privind datele de autorizare ale furnizorului: denumire, adresă sediu completă (stradă, număr, bloc, scară, etaj, apartament, cod poștal, județ, localitate), CUI, telefon, email, reprezentant legal și calitatea acestuia, act reprezentant, module de igienă autorizate, număr și dată înregistrare furnizor.
  - **Foaia 2 ("Anexa nr. 2")**: Decizie organizare sesiune de instruire și examinare. Conține 15 token-uri scalare privind avizele MS și ME, numărul și data certificatului de autorizare al furnizorului, ordinul aplicabil și adresa furnizorului.
  - **Foaia 3 ("Anexa nr. 3")**: Catalogul cursului de instruire. Conține 5 token-uri scalare de antet (`PRESTATOR_SSM`, `AVIZ_MS`, `AVIZ_ME`, `NUMAR_CATALOG`, `DATA_CATALOG`) și 7 serii repetitive de până la 100 de cursanți (`_001` la `_100`): `NUMAR_ORDINE`, `NUME_COMPLET`, `CNP`, `DATA_LOC_NASTERII`, `ACT_IDENTITATE`, `MODUL_NIVEL`, `NOTA_EXAMEN`. (Total 705 token-uri).
  - **Foaia 4 ("Anexa nr. 4")**: Listă de prezență la curs și examen. Conține 5 token-uri scalare (`PRESTATOR_SSM`, `DATA_EXAMEN`, `ORA_EXAMEN`, `SALA_EXAMEN`, `PRESEDINTE_COMISIE`), un token pentru membru comisie (`PLACEHOLDER_MEMBRU_COMISIE_1`), și 2 serii repetitive de până la 100 de cursanți (`_001` la `_100`): `NUMAR_ORDINE`, `NUME_COMPLET`. (Total 206 token-uri).
  - **Foaia 5 ("Anexa nr. 5")**: Borderou de notare / Tabel centralizator al rezultatelor examenului. Conține 5 token-uri scalare (`PRESTATOR_SSM`, `AVIZ_MS`, `AVIZ_ME`, `COMISIE_EXAMEN`, `NUMAR_DECIZIE_COMISIE`) și 5 serii repetitive de 100 de cursanți: `NUMAR_ORDINE`, `NUME_COMPLET`, `ACT_IDENTITATE`, `MODUL_NIVEL`, `REZULTAT_EXAMEN`. (Total 505 token-uri).
  - **Foaia 6 ("Anexa nr. 6")**: Proces-Verbal al comisiei de examinare. Conține 12 token-uri scalare (`SERIE_PV`, `NUMAR_PV`, `DATA_PV`, `PRESTATOR_SSM`, `DATA_EXAMEN`, `LOCATIE_EXAMEN`, `NUMAR_CANDIDATI`, `NUMAR_PREZENTI`, `NUMAR_ADMISI`, `NUMAR_RESPINSI`, `PRESEDINTE_COMISIE`, `SECRETAR_COMISIE`) și 2 token-uri pentru membrii comisiei: `PLACEHOLDER_MEMBRU_COMISIE_1`, `PLACEHOLDER_MEMBRU_COMISIE_2`.
  - **Foaia 7 ("Anexa nr. 7")**: Model tipizat de certificat de absolvire a cursului de igienă (format certificat). Conține 11 token-uri scalare: `PRESTATOR_SSM`, `AVIZ_MS`, `AVIZ_ME`, `NUME_COMPLET`, `CNP`, `DATA_NASTERII`, `LOCALITATE_NASTERII`, `MODUL_IGIENA`, `NIVEL_IGIENA`, `REZULTAT_EXAMEN`, `ORDIN_APLICABIL`.
  - **Foaia 8 ("Anexa nr. 8")**: Registrul de evidență a certificatelor de absolvire eliberate. Conține 2 token-uri scalare (`JUDET_EXAMEN`, `LOCALITATE_EXAMEN`) și 9 serii repetitive de până la 195 de înregistrări (`_001` la `_195`): `NUMAR_ORDINE`, `NUME_COMPLET`, `CNP`, `DATA_SESIUNE`, `PERIOADA_CURS`, `MODUL_ABSOLVIT`, `SERIE_NUMAR_CERTIFICAT`, `DATA_ELIBERARE`, `PRESTATOR_SSM`. (Total 1757 token-uri).
- **Format token-uri**: Text direct în celule, fără acolade (`PLACEHOLDER_*`).
- **Total celule cu token-uri în fișier**: 3.232 celule.

#### [25] `Tabel Cursanti exemplu.xlsx`
- **Cod intern**: `hygiene-tabel-cursanti` | **Nivel context**: `hygiene_session` | **Format**: `xlsx`
- **Descriere**: Tabel de colectare și centralizare a datelor cursanților înscriși la o sesiune de igienă.
- **Foi de calcul**: 2 foi (`Curs (2)` cu date și `Sheet1` fără token-uri).
- **Format token-uri**: Text direct în celule, fără acolade.
- **Total celule cu token-uri**: 1.036 celule în foaia `Curs (2)`:
  - 1 token scalar: `PLACEHOLDER_DATA_EXAMEN`
  - 9 serii repetitive de 115 cursanți (`_001` la `_115`):
    `PLACEHOLDER_NUMAR_ORDINE_xxx`, `PLACEHOLDER_NUME_COMPLET_xxx`, `PLACEHOLDER_CNP_xxx`, `PLACEHOLDER_ZIUA_NASTERII_xxx`, `PLACEHOLDER_LUNA_NASTERII_xxx`, `PLACEHOLDER_AN_NASTERII_xxx`, `PLACEHOLDER_LOC_NASTERII_xxx`, `PLACEHOLDER_ACT_IDENTITATE_xxx`, `PLACEHOLDER_MODUL_NIVEL_xxx`.

---

## 7. Recomandare Model Unificat de Date

Pentru a asigura auto-completarea tuturor celor 25 de șabloane fără a lăsa token-uri nerezolvate și fără inventarea de date nevalidate, este necesară o schemă relațională precisă organizată pe 5 domenii de date:

```
+-----------------------------------------------------------------------------------+
|                                 1. CLIENT & SEDIU                                 |
| - name (PLACEHOLDER_FIRMA)                                                        |
| - cui (PLACEHOLDER_CUI)                                                           |
| - regCom (PLACEHOLDER_NR_REG_COM)                                                 |
| - address (PLACEHOLDER_ADRESA_FIRMA)                                              |
| - legalRepresentative (PLACEHOLDER_REPREZENTANT_LEGAL, PLACEHOLDER_DIRECTOR)      |
| - contactPhone (PLACEHOLDER_TELEFON_CONTACT)                                      |
| - contactEmail (PLACEHOLDER_EMAIL_CONTACT)                                        |
| - caenCode (PLACEHOLDER_COD_CAEN)                                                 |
| - mainActivity (PLACEHOLDER_ACTIVITATE_PRINCIPALA)                                |
| - foundedYear (PLACEHOLDER_AN_INFIINTARE)                                         |
| - employeesCount (PLACEHOLDER_NUMAR_LUCRATORI)                                    |
| - workSchedule (PLACEHOLDER_PROGRAM_LUCRU)                                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                             2. SALARIAT, ACTE & ADRESĂ                            |
| - lastName + firstName (PLACEHOLDER_NUME_COMPLET, PLACEHOLDER_NUME, PRENUME)     |
| - cnp (PLACEHOLDER_CNP)                                                           |
| - birthDate (PLACEHOLDER_DATA_NASTERII, ZIUA/LUNA/AN)                              |
| - birthPlace, birthCounty (PLACEHOLDER_LOCALITATE_NASTERII, JUDET_NASTERII)       |
| - IdentityDocument: docType, series, number, issuedBy, issueDate                  |
|   (PLACEHOLDER_TIP_ACT, SERIE_ACT, NUMAR_ACT, EMITENT_ACT, DATA_EMITERII)        |
| - ResidenceAddress: county, locality, street, number, building, entrance, floor,  |
|   apartment (PLACEHOLDER_ADRESA_DOMICILIU, STRADA, NR, BLOC, SCARA, ETAJ, AP)     |
| - Employment: hireDate (DATA_ANGAJARII, DATA_INCEPERE, DATA_CERERE, DATA_SEMNARE) |
|   contractNo (NUMAR_CIM), salary (SALARIU_BRUT), hoursPerDay (ORE_PE_ZI)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        3. POST & PUNCT DE LUCRU (CONTEXT)                         |
| - Job.title (PLACEHOLDER_FUNCTIE)                                                 |
| - Job.corCode (PLACEHOLDER_COD_COR)                                               |
| - Worksite.address (PLACEHOLDER_ADRESA_PUNCT_LUCRU)                               |
| - Worksite.activity (PLACEHOLDER_DEPARTAMENT)                                     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                             4. SESIUNE CURSURI IGIENĂ                             |
| - HygieneProvider: name (PLACEHOLDER_PRESTATOR_SSM, FURNIZOR_SSM), cui, address   |
|   phone, email, msAuthorization (AVIZ_MS), meAuthorization (AVIZ_ME)               |
| - HygieneSession: sessionDate (DATA_SESIUNE), examDate (DATA_EXAMEN, DATA_PV)     |
|   location (LOCATIE_EXAMEN, SALA_EXAMEN), examTime (ORA_EXAMEN)                   |
|   president (PRESEDINTE_COMISIE), member1, member2 (MEMBRU_COMISIE_1, _2)        |
|   secretary (SECRETAR_COMISIE), pvNumber (NUMAR_PV, SERIE_PV)                     |
| - HygieneParticipants (Listă 1..N):                                               |
|   rowNumber, fullName, cnp, birthDate, birthPlace, identityDocument, module,      |
|   grade (NOTA_EXAMEN), result (REZULTAT_EXAMEN), certificateSeries/Number         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       5. EVALUARE RISCURI & SPECIALIST SSM                        |
| - RiskAssessment: globalRiskLevel (PLACEHOLDER_NIVEL_RISC_GLOBAL), evaluatorName  |
|   evaluatorCert (CERTIFICAT_EVALUATOR), evaluationYear (AN_EVALUARE)              |
|   conclusions (CONCLUZII_EVALUARE), documentNumber (NUMAR_DOCUMENT, FISA)         |
|   exposedWorkers (NUMAR_PERSOANE_EXPUSE), exposureDuration (DURATA_EXPUNERII)     |
| - RiskItems (Factori 01..30):                                                     |
|   severity (GRAVITATE_RISC_01..30), frequency (FRECVENTA_RISC_01..30),            |
|   partialLevel (NIVEL_PARTIAL_RISC_01..30)                                        |
| - HazardZones (01..06):                                                           |
|   zoneName (DENUMIRE_ZONA_01..06), measures (MASURI_ZONA_01..06)                  |
| - CompanyDecisions (01..11):                                                      |
|   decisionNumbers (NUMAR_DECIZIE_01..11), decisionDate, firePermit fields         |
| - SSM Specialist / Provider:                                                      |
|   specialistName (PLACEHOLDER_SPECIALIST_SSM), designatedWorker (LUCRATOR_DESEMNAT) |
+-----------------------------------------------------------------------------------+
```

---

## 8. Verificare și Validare

Pentru a verifica în mod independent specificațiile de mai sus:

1. **Numărare și Extragere Token-uri DOCX**:
   ```bash
   python3 -c "import zipfile, re; [print(f, len(set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', zipfile.ZipFile('handoff/ssm-template-placeholder-pack/templates/' + f).read('word/document.xml').decode('utf-8'))))) for f in sorted(os.listdir('handoff/ssm-template-placeholder-pack/templates')) if f.endswith('.docx')]"
   ```
2. **Inspecție Antete și Subsoluri DOCX**:
   ```bash
   python3 -c "import zipfile, re, os; [print(f, name, set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', zipfile.ZipFile('handoff/ssm-template-placeholder-pack/templates/' + f).read(name).decode('utf-8')))) for f in os.listdir('handoff/ssm-template-placeholder-pack/templates') if f.endswith('.docx') for name in zipfile.ZipFile('handoff/ssm-template-placeholder-pack/templates/' + f).namelist() if ('header' in name or 'footer' in name) and set(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', zipfile.ZipFile('handoff/ssm-template-placeholder-pack/templates/' + f).read(name).decode('utf-8')))]"
   ```
3. **Verificare foi Excel și celule**:
   ```bash
   python3 -c "import zipfile, re; z=zipfile.ZipFile('handoff/ssm-template-placeholder-pack/templates/Anexe Curs igiena.xlsx'); print([(n, len(re.findall(r'PLACEHOLDER_[A-Za-z0-9_]+', z.read(n).decode('utf-8')))) for n in z.namelist() if 'sheet' in n])"
   ```
