# Analiză Tehnică & Raport de Minare Specificații: Milestone 3 (Catalog Șabloane & Generator)

**Data**: 2026-11-01  
**Autor**: Explorer 1 (Milestone 3 Explorer: Template Catalog & Token Miner)  
**Fișiere de analizat**: `src/lib/templates/definitions.ts` și `src/lib/templates/generator.ts`  
**Referințe autoritare**:
- `handoff/ssm-template-placeholder-pack/templates/` (25 șabloane oficiale normalizate pe disc)
- `.agents/teamwork/survey_spec_miner_2/template_spec.md` (Specificație de bază Explorer 2)
- `.agents/teamwork/ORIGINAL_REQUEST.md` & `.agents/teamwork/PROJECT.md`

---

## 1. Sinteză Executivă

Obiectivul Milestone 3 este asigurarea generării complete, fără erori și fără token-uri nepopulate (`zero {PLACEHOLDER_*}` sau `PLACEHOLDER_*`) pentru toate cele **25 de șabloane oficiale** (23 fișiere Word DOCX și 2 registre Excel XLSX).

Prezenta investigație a inspectat în profunzime fișierele `src/lib/templates/definitions.ts` și `src/lib/templates/generator.ts`, corelându-le bit-cu-bit cu structura internă XML (arhivele zip `.docx` și `.xlsx` de pe disc).

### Constatări Principale:
1. **Sincronizare Token-uri în `definitions.ts`**:
   - `TESA.docx` (`ipssm-tesa`): Este complet aliniat la nivel de chei cu cele **103 token-uri reale** (`PLACEHOLDER_GRAVITATE_RISC_01..30`, `PLACEHOLDER_FRECVENTA_RISC_01..30`, `PLACEHOLDER_NIVEL_PARTIAL_RISC_01..30` și 13 metadate generale). Singura discrepanță minoră este în textul de `description`, care menționa eronat „cei 17 factori de risc” în loc de 30.
   - `Plan de Prevenire TESA.docx` (`risk-plan-prevenire-tesa`): Conține deja cele 4 token-uri reale, inclusiv `{PLACEHOLDER_REPREZENTANT_LEGAL}` (linii 2165–2170), fiind perfect sincronizat.
   - `INFO dosar personal.docx` (`hr-info-dosar`): Conține un câmp mock fictiv `{ key: '_Fără token-uri detectate._', label: ' Fără token-uri detectate. ', ... }` la liniile 1927–1935. Deoarece fișierul fizic conține 0 token-uri (este opis static), acest câmp fals trebuie eliminat (`fields: []`).
   - **Antete și Subsoluri**: Toate cele 6 șabloane Word care conțin token-uri în `word/header*.xml` sau `word/footer*.xml` au câmpurile respective deja mapate în `definitions.ts`.

2. **Quirk Multi-Part DOCX și Hyperlink-uri `.rels` în `generator.ts`**:
   - Docxtemplater v3 procesează în mod nativ fișierele din `word/document.xml`, `word/header*.xml` și `word/footer*.xml`.
   - **LIMITARE CRITICĂ**: Docxtemplater **NU procesează** fișierele `.rels` (relații interne). În `Tematica introductiv generala 4h.docx` și `Tematica loc de munca.docx`, fișierul `word/_rels/footer1.xml.rels` conține atributul `Target="mailto:PLACEHOLDER_EMAIL_PRESTATOR"`. Docxtemplater lasă acest token neatins, iar `collectUnresolvedPlaceholders` îl ignora pentru că verifica doar extensia `.xml`, nu și `.rels`.
   - **Soluție**: `generator.ts` trebuie completat cu un pas de post-procesare pe PizZip care să scaneze toate părțile XML și `.rels` (`word/`, `customXml/`), înlocuind atât `{PLACEHOLDER_*}` cât și token-urile bare `PLACEHOLDER_*` prezente în ținte de hyperlink sau atribute.

3. **Goliere Celule Excel (Excel Blanking) în `generator.ts`**:
   - `Anexe Curs igiena.xlsx` are 8 foi de calcul și 3.232 celule cu token-uri (dintre care 2.314 sunt token-uri de cursanți repetitivi `_001`..`_195`).
   - `Tabel Cursanti exemplu.xlsx` are 1.036 celule cu token-uri (dintre care 1.035 sunt cursanți `_001`..`_115`).
   - **BUG CRITIC IDENTIFICAT**: Linia 474 din `generator.ts` folosea `if (index >= Math.max(1, participants.length)) return '';`. Dacă un apel este făcut fără participanți (`participants.length === 0`), `Math.max(1, 0)` evaluează la `1`. Prin urmare, pentru `index = 0` (cursantul `_001`), celulele NU se goleau și rămâneau populate cu `PLACEHOLDER_*_001`!
   - **BUG CRITIC DE FALLBACK**: Linia 476 folosea `formatParticipantValue(token, participants[index]) || token;`. Dacă un cursant existent nu are completat un anumit câmp opțional (ex. locul nașterii sau actul de identitate), generatorul cădea pe `|| token`, lăsând token-ul brut în celulă. Trebuie folosit `?? ''` pentru a goli celula.
   - **CACHE TEXT SHEETJS (`cell.w`)**: SheetJS creează proprietatea `cell.w` la citire (3.188 de celule au `cell.w` în `Anexe Curs igiena.xlsx`). La modificarea `cell.v`, dacă nu se șterge `cell.w`, anumite funcții de export pot persista stringul vechi formatat.

---

## 2. Features Discovered (Catalog Complet 25 Șabloane)

| # | Categorie | Șablon | Descriere | Intrări | Ieșiri | Comportament la Erori / Lipsă Date | Sursă Descoperire |
|---|---|---|---|---|---|---|---|
| 1 | HR | `Cerere angajare.docx` | Cerere de angajare a salariatului | Salariat (nume, CI, domiciliu), Post, Firmă, Dată angajare | 1 tabel (2x2 semnături), 11 token-uri `{PLACEHOLDER_*}` în `document.xml` | Marchează documentul `missing_data`; păstrează token vizibil | `Cerere angajare.docx` |
| 2 | HR | `Contract individual munca 2026.docx` | Contract individual de muncă conform Codului Muncii 2026 | Firmă, Salariat complet, Salariu, Durată, Clauze, Proba, Concediu | 1 tabel (semnături bilaterale), 29 token-uri în `document.xml` | Refuză valori sintetice; câmpurile lipsă semnalate în `missingFields` | `Contract individual munca 2026.docx` |
| 3 | HR | `Declaratie luare cunostinta RI.docx` | Luare la cunoștință a Regulamentului Intern | Salariat (nume, CNP, CI, adresă defalcată pe componente), Firmă, Dată | 1 tabel (semnătură salariat), 17 token-uri în `document.xml` | Token vizibil; semnalat în fluxul de validare | `Declaratie luare cunostinta RI.docx` |
| 4 | HR | `Declaratie pe proprie raspundere CIM.docx` | Declarație funcție de bază, pensie, persoane în întreținere | Salariat, Casa de sănătate, Persoane în întreținere (`_01`, `_02`) | 2 tabele (tabel persoane întreținute + semnătură), 20 token-uri | Rândurile pentru terți necompletați rămân neafectate | `Declaratie pe proprie raspundere CIM.docx` |
| 5 | HR | `INFO dosar personal.docx` | Opis / checklist informativ cu actele dosarului de personal | Fără intrări necesare (document static) | 0 tabele, 0 token-uri (text static standard) | Validat direct ca `approved_for_print` fără cerințe de câmpuri | `INFO dosar personal.docx` |
| 6 | HR | `Informare Protectia Datelor.docx` | Notă informare prelucrare date cu caracter personal GDPR | Firmă, Administrator, Salariat (nume defalcat: nume, prenume, nume complet, CNP, CI, domiciliu) | 0 tabele, 13 token-uri în `document.xml` | Păstrează token-urile necompletate vizibile | `Informare Protectia Datelor.docx` |
| 7 | HR | `Anexa fisa postului SSM.docx` | Anexa II la Fișa Postului - Atribuții SSM legale | Salariat (nume complet), Reprezentant legal firmă | 3 tabele (semnături 4x13, luare la cunoștință), 2 token-uri | Token vizibil în blocul de semnare dacă lipsește | `Anexa fisa postului SSM.docx` |
| 8 | Decizii | `DECIZII.docx` | Set unificat de 11 decizii SSM/PSI și Permis de lucru cu foc | Firmă, Sediu, Administrator, Responsabili (SSM, PSI, Prim ajutor), Decizii 01–11 | 1 tabel (formular permis foc), 44 token-uri în `document.xml` | Câmpurile permisului de foc rămân nepopulate până la intervenție | `DECIZII.docx` |
| 9 | IPSSM | `11 - ALUNECARI.docx` | Instrucțiuni proprii: prevenire alunecări și împiedicări | Administrator (aprobare), Specialist SSM (elaborare) | 0 tabele, 2 token-uri în `document.xml` | Token vizibil în blocul de aprobare | `11 - ALUNECARI.docx` |
| 10 | IPSSM | `12 - AUTOVEHICULE.docx` | Instrucțiuni proprii: circulația autovehiculelor | Firmă, Administrator, Specialist SSM | 0 tabele, 3 token-uri în `document.xml` | Token vizibil în antet și aprobare | `12 - AUTOVEHICULE.docx` |
| 11 | IPSSM | `13 - ACTIVITATI DE BIROU.docx` | Instrucțiuni proprii: ergonomie și lucru la birou | Administrator, Specialist SSM | 0 tabele, 2 token-uri în `document.xml` | Token vizibil în antet/aprobare | `13 - ACTIVITATI DE BIROU.docx` |
| 12 | IPSSM | `IP 01-10 UNIVERSALE.docx` | Culegere de 10 instrucțiuni proprii universale | Firmă, Administrator, Specialist SSM | 0 tabele, 3 token-uri în `document.xml` | Token vizibil pe pagina de titlu și aprobare | `IP 01-10 UNIVERSALE.docx` |
| 13 | IPSSM | `OPIS IPSSM.docx` | Borderou / index central al instrucțiunilor proprii | Firmă, Date contact prestator (email, telefon) | 0 tabele, 3 token-uri în `document.xml` | Token vizibil în antetul opisului | `OPIS IPSSM.docx` |
| 14 | Evaluare Riscuri | `EVALUAREA RISCURILOR.docx` | Dosar general de evaluare riscuri (metoda INCDPM) | Firmă, CUI, Adresă, Prestator SSM, An evaluare, Număr lucrători, Concluzii | 0 tabele, 16 token-uri în `document.xml` | Necesită validare profesionist SSM; concluziile nu sunt fabricate | `EVALUAREA RISCURILOR.docx` |
| 15 | Evaluare Riscuri | `Plan de Prevenire TESA.docx` | Plan anual de măsuri de prevenire și protecție birou | Firmă, Prestator SSM, Reprezentant legal, Specialist SSM | 0 tabele, 4 token-uri în `document.xml` | Semnăturile rămân ca token-uri dacă datele lipsesc | `Plan de Prevenire TESA.docx` |
| 16 | Evaluare Riscuri | `Plan actiune pericol grav si iminent.docx` | Procedură de urgență, oprire și evacuare la pericol grav | Denumire firmă (inclusiv în antetul paginilor) | 1 tabel (plan acțiune), 1 token în `document.xml` + `header1.xml` | Token vizibil în antetul fiecărei pagini | `Plan actiune pericol grav si iminent.docx` |
| 17 | Evaluare Riscuri | `Zone pericol grav si iminent.docx` | Evidența zonelor cu risc ridicat și măsuri specifice | Firmă, Director, Lucrător desemnat, 6 Zone cu risc (`01`..`06`) | 0 tabele, 15 token-uri în `document.xml` + `header2.xml` | Zonele neutilizate rămân vizibile pentru completare manuală | `Zone pericol grav si iminent.docx` |
| 18 | Evaluare Riscuri | `TESA.docx` | Fișă de evaluare riscuri funcționar administrativ (INCDPM) | Post, Departament, Persoane expuse, 30x Gravitate, 30x Frecvență, 30x Nivel parțial, Nivel global | 0 tabele, 103 token-uri în `document.xml` | Fără evaluare, documentul este semnalat `missing_data` | `TESA.docx` |
| 19 | Instruire SSM | `Tematica introductiv generala 4h.docx` | Programa instruirii introductiv-generale SSM (4 ore) | Firmă, Data aplicării, Contact prestator (email, telefon în footer & rels) | 2 tabele (program orar), 4 token-uri în `document.xml`, `footer1.xml`, `footer1.xml.rels` | Token vizibil în corpul paginii și în subsol | `Tematica introductiv generala 4h.docx` |
| 20 | Instruire SSM | `Detaliu Tematica introductiv generala.docx` | Suport teoretic detaliat instruire introductiv-generală | Firmă (inclusiv în `header2.xml`), Administrator, Specialist SSM | 0 tabele, 3 token-uri în `document.xml` + `header2.xml` | Token vizibil în antet și text | `Detaliu Tematica introductiv generala.docx` |
| 21 | Instruire SSM | `Tematica loc de munca.docx` | Programa de instruire SSM la locul de muncă | Firmă, Post (`FUNCTIE`), Data aplicării, Contact prestator | 1 tabel, 5 token-uri în `document.xml`, `footer1.xml`, `footer1.xml.rels` | Necesită selectarea postului salariatului | `Tematica loc de munca.docx` |
| 22 | Instruire SSM | `Detaliu Tematica loc de munca.docx` | Ghid detaliat pentru instruirea la postul de lucru | Firmă (inclusiv în `header1.xml` și `header2.xml`), Reprezentant legal | 0 tabele, 2 token-uri în `document.xml`, `header1.xml`, `header2.xml` | Token vizibil în anteturi | `Detaliu Tematica loc de munca.docx` |
| 23 | Cursuri Igienă | `Adeverinta participare.docx` | Adeverință nominală de absolvire a cursului de igienă | Sesiune (avize MS/ME, prestator), Cursant (nume, CNP, naștere, modul, nivel), Serie/număr adeverință | 1 tabel (antet ministere), 14 token-uri în `document.xml` | Se emite exclusiv din sesiune + cursant promovat | `Adeverinta participare.docx` |
| 24 | Cursuri Igienă | `Anexe Curs igiena.xlsx` | Pachetul oficial de 8 anexe (Cerere, Decizie, Catalog, Prezență, Rezultate, PV, Certificat, Registru) | Date autorizare furnizor, Comisie examen, Listă cursanți (până la 195 cursanți cu note, certificate) | 8 foi de calcul, 59 token-uri scalare, 2.314 celule repetitive cursanți (`_001`..`_195`) | Cursanții peste efectivul sesiunii sunt goliți complet (`""`) | `Anexe Curs igiena.xlsx` |
| 25 | Cursuri Igienă | `Tabel Cursanti exemplu.xlsx` | Tabel centralizator evidență cursanți pentru sesiune | Dată examen (`DATA_EXAMEN`), Cursanți 001–115 (nume, CNP, dată naștere defalcată Z/L/A, loc, CI, modul) | 2 foi de calcul (`Curs (2)` și `Sheet1`), 1 token scalar, 1.035 celule repetitive cursanți | Rândurile neutilizate din cele 115 sunt golite (`""`) | `Tabel Cursanti exemplu.xlsx` |

---

## 3. Edge Cases & Situații Limită Observate

| # | Șablon / Caracteristică | Intrare / Situație Limită | Comportament Observat | Constrângere Tehnică |
|---|---|---|---|---|
| 1 | `Tematica introductiv generala 4h.docx` & `Tematica loc de munca.docx` | Hyperlink de contact prestator în subsolul paginii | Token-ul `{PLACEHOLDER_EMAIL_PRESTATOR}` este în `word/footer1.xml`, iar ținta `Target="mailto:PLACEHOLDER_EMAIL_PRESTATOR"` este în `word/_rels/footer1.xml.rels`. Docxtemplater înlocuiește doar textul vizibil, lăsând ținta `mailto:` neatinsă. | Generatorul trebuie să execute o trecere directă pe fișierele `.rels` din arhiva PizZip pentru a înlocui `PLACEHOLDER_EMAIL_PRESTATOR` cu adresa de email reală a prestatorului. |
| 2 | `Detaliu Tematica introductiv generala.docx`, `Detaliu Tematica loc de munca.docx`, `Plan actiune pericol grav si iminent.docx`, `Zone pericol grav si iminent.docx` | Token-ul `{PLACEHOLDER_FIRMA}` plasat în antetele paginilor (`word/header1.xml`, `word/header2.xml`) | Docxtemplater v3 procesează headers dacă sunt referite, dar dacă token-ul este într-un run fragmentat, poate rămâne neînlocuit. | Se recomandă o trecere suplimentară pe toate intrările din zip care încep cu `word/header` pentru a garanta înlocuirea. |
| 3 | `Anexe Curs igiena.xlsx` & `Tabel Cursanti exemplu.xlsx` | Sesiune cu număr variabil de cursanți (ex. 0 cursanți sau 3 cursanți dintr-o capacitate de 100/195/115) | Linia veche `Math.max(1, participants.length)` nu golea rândul `_001` când lista era vidă. Iar `formatParticipantValue(...) || token` lăsa token-ul dacă un câmp era null. | Condiția trebuie să fie strict `if (index >= participants.length) return '';`, iar când cursantul există: `formatParticipantValue(...) ?? ''`. |
| 4 | `Anexe Curs igiena.xlsx` | Celule cu stringuri formatate (`cell.w`) stocate de SheetJS | Fișierul fizic conține 3.188 de celule cu proprietatea `cell.w` definită la citire. | La golirea sau modificarea `cell.v`, trebuie șters `cell.w` (`delete cell.w`) pentru a preveni retenția de text vechi la scriere. |
| 5 | `Anexe Curs igiena.xlsx` (Foaia 4 și Foaia 6) | Membrii comisiei de examinare (`PLACEHOLDER_MEMBRU_COMISIE_1`, `PLACEHOLDER_MEMBRU_COMISIE_2`) | Sufixul este `_1` și `_2` (o singură cifră), nu `_001`. Regex-ul `_\d{2,3}$` nu prinde membrii comisiei, aceștia fiind tratați corect ca scalari. | Membrii comisiei trebuie rezolvați prin `directValue = params.data[token]`, nu prin logica de indexare a cursanților. |
| 6 | `INFO dosar personal.docx` | Cerere de generare pe opisul documentelor | Documentul conține 0 token-uri fizice, dar în `definitions.ts` apărea `_Fără token-uri detectate._`. | Șablonul trebuie să aibă `fields: []`, generându-se instant cu status `approved_for_print`. |
| 7 | `TESA.docx` | Structura factorilor de risc 01–30 | Conține 90 de token-uri pentru cei 30 de factori (`GRAVITATE_RISC_01..30`, `FRECVENTA_RISC_01..30`, `NIVEL_PARTIAL_RISC_01..30`). | Nu se inventează valori sintetice; grila completă este mapată în `definitions.ts` și completată cu matrice legală INCDPM. |

---

## 4. Audit Detaliat: Token Synchronization în `definitions.ts`

### 4.1. `TESA.docx` (`ipssm-tesa`)
- **Stare curentă în `definitions.ts`**: Conține exact 103 câmpuri (linii 2370–3092).
- **Corelație cu fișierul fizic**:
  - 13 câmpuri generale: `DEPARTAMENT`, `DURATA_EXPUNERII`, `EVALUATOR_RISC`, `FIRMA`, `FUNCTIE`, `NIVEL_RISC_GLOBAL`, `NUMAR_DOCUMENT`, `NUMAR_FACTORI_RISC`, `NUMAR_FISA_EVALUARE`, `NUMAR_LOC_MUNCA`, `NUMAR_PERSOANE_EXPUSE`, `REPARTITIE_RISCURI`, `REPREZENTANT_LEGAL`.
  - 30x `GRAVITATE_RISC_01` .. `GRAVITATE_RISC_30`
  - 30x `FRECVENTA_RISC_01` .. `FRECVENTA_RISC_30`
  - 30x `NIVEL_PARTIAL_RISC_01` .. `NIVEL_PARTIAL_RISC_30`
- **Discrepanță identificată**: Linia 2368 conține `description: 'Grilă detaliată cu cei 17 factori de risc identificați pentru postul de lucru funcționar administrativ / TESA.'`. Șablonul conține în realitate **30 de factori de risc**. Descrierea trebuie actualizată pentru acuratețe profesională.

### 4.2. `Plan de Prevenire TESA.docx` (`risk-plan-prevenire-tesa`)
- **Stare curentă în `definitions.ts`**: Liniile 2149–2180 conțin exact cele 4 câmpuri reale:
  - `PLACEHOLDER_FIRMA` (`client.name`)
  - `PLACEHOLDER_PRESTATOR_SSM` (`hygieneSession.providerName`)
  - `PLACEHOLDER_REPREZENTANT_LEGAL` (`client.legalRepresentative`) -> **deja prezent la linia 2165**
  - `PLACEHOLDER_SPECIALIST_SSM` (`manual`)
- **Concluzie**: Nu necesită adăugare de câmpuri, token-ul fiind deja sincronizat.

### 4.3. `INFO dosar personal.docx` (`hr-info-dosar`)
- **Stare curentă în `definitions.ts`**: Liniile 1927–1935 conțin:
  ```typescript
  fields: [
    {
      key: '_Fără token-uri detectate._',
      label: ' Fără token-uri detectate. ',
      source: 'manual',
      required: false,
      type: 'string',
    }
  ],
  ```
- **Problema**: `_Fără token-uri detectate._` este un artefact parsat dintr-un comentariu markdown vechi. Șablonul fizic `templates_registry/normalized/INFO dosar personal.docx` are **0 token-uri**.
- **Remediere**: Curățarea proprietății `fields` la `fields: []`.

### 4.4. Antete și Subsoluri în cele 6 Șabloane DOCX
S-a verificat că în toate cele 6 șabloane care folosesc `header*.xml`, `footer*.xml` și `_rels/`, token-urile sunt corect declarate în `definitions.ts`:
1. `Detaliu Tematica introductiv generala.docx` (`header2.xml`): `PLACEHOLDER_FIRMA` declarat.
2. `Detaliu Tematica loc de munca.docx` (`header1.xml`, `header2.xml`): `PLACEHOLDER_FIRMA` declarat.
3. `Plan actiune pericol grav si iminent.docx` (`header1.xml`): `PLACEHOLDER_FIRMA` declarat.
4. `Tematica introductiv generala 4h.docx` (`footer1.xml`, `footer1.xml.rels`): `PLACEHOLDER_EMAIL_PRESTATOR` și `PLACEHOLDER_TELEFON_PRESTATOR` declarate.
5. `Tematica loc de munca.docx` (`footer1.xml`, `footer1.xml.rels`): `PLACEHOLDER_EMAIL_PRESTATOR` și `PLACEHOLDER_TELEFON_PRESTATOR` declarate.
6. `Zone pericol grav si iminent.docx` (`header2.xml`): `PLACEHOLDER_FIRMA` declarat.

---

## 5. Audit Detaliat: Multi-Part DOCX & Hyperlink-uri `.rels` în `generator.ts`

### 5.1. Comportament Observat
La rularea unui test cu Docxtemplater pe `Tematica introductiv generala 4h.docx`:
- `word/footer1.xml` a fost procesat cu succes, token-ul text fiind înlocuit.
- `word/_rels/footer1.xml.rels` **A RĂMAS NESCHIMBAT**:
  ```xml
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="mailto:PLACEHOLDER_EMAIL_PRESTATOR" TargetMode="External"/>
  ```
- În plus, funcția `collectUnresolvedPlaceholders` (linia 81) verifica:
  ```typescript
  if (file.name.startsWith('word/') && file.name.endsWith('.xml')) {
    add(file.asText());
  }
  ```
  Această condiție **ignora** fișierele `.rels`, mascând faptul că în arhivă rămânea un placeholder nerezolvat.

### 5.2. Mecanism de Înlocuire Recomandat
După executarea `doc.render(renderData)` în ramura DOCX din `generateDocument`, se accesează arhiva zip rezultată (`const zip = doc.getZip()`) și se parcurg toate intrările din zip:
```typescript
for (const [relativePath, file] of Object.entries(zip.files)) {
  if (
    (relativePath.startsWith('word/') || relativePath.startsWith('customXml/')) &&
    (relativePath.endsWith('.xml') || relativePath.endsWith('.rels'))
  ) {
    let text = file.asText();
    let changed = false;

    for (const [k, v] of Object.entries(params.data)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        const strVal = String(v);
        const curlyToken = `{${k}}`;
        // Înlocuire token cu acolade (dacă un run a fost fragmentat și Docxtemplater l-a omis)
        if (text.includes(curlyToken)) {
          text = text.replaceAll(curlyToken, strVal);
          changed = true;
        }
        // În fișierele .rels, token-ul apare direct ca text în URL (fără acolade)
        if (relativePath.endsWith('.rels') && text.includes(k)) {
          text = text.replaceAll(k, strVal);
          changed = true;
        }
      }
    }

    if (changed) {
      zip.file(relativePath, text);
    }
  }
}
```

Iar în `collectUnresolvedPlaceholders`:
```typescript
  if (format === 'docx') {
    const zip = new PizZip(buffer);
    for (const file of Object.values(zip.files)) {
      if (
        (file.name.startsWith('word/') || file.name.startsWith('customXml/')) &&
        (file.name.endsWith('.xml') || file.name.endsWith('.rels'))
      ) {
        add(file.asText());
      }
    }
  }
```

---

## 6. Audit Detaliat: Excel Spreadsheet Cell Blanking în `generator.ts`

### 6.1. Structura Fișierelor Excel
1. **`Anexe Curs igiena.xlsx`**:
   - 8 foi:
     - `Anexa nr. 1`: 19 token-uri scalare de autorizare furnizor
     - `Anexa nr. 2`: 15 token-uri scalare decizie sesiune
     - `Anexa nr. 3`: 5 scalari + 7 serii x 100 cursanți (`_001`..`_100`) = 705 token-uri
     - `Anexa nr. 4`: 5 scalari + 1 membru + 2 serii x 100 cursanți (`_001`..`_100`) = 206 token-uri
     - `Anexa nr. 5`: 5 scalari + 5 serii x 100 cursanți (`_001`..`_100`) = 505 token-uri
     - `Anexa nr. 6`: 12 scalari + 2 membri comisie = 14 token-uri
     - `Anexa nr. 7`: 11 scalari certificat de absolvire
     - `Anexa nr. 8`: 2 scalari + 9 serii x 195 cursanți (`_001`..`_195`) = 1.757 token-uri
2. **`Tabel Cursanti exemplu.xlsx`**:
   - Foaia `Curs (2)`: 1 scalar (`PLACEHOLDER_DATA_EXAMEN`) + 9 serii x 115 cursanți (`_001`..`_115`) = 1.036 token-uri.
   - Foaia `Sheet1`: 0 token-uri.

### 6.2. Analiza Deficiențelor de Golire (Blanking)

1. **Bug-ul `Math.max(1, participants.length)`**:
   În `generator.ts` linia 474:
   ```typescript
   if (index >= Math.max(1, participants.length)) return '';
   ```
   Dacă utilizatorul generează șablonul fără a specifica participanți (`participants = []`), expresia devine `index >= 1`.
   Pentru `index = 0` (cursantul `_001`), condiția este **falsă** (`0 >= 1` e fals).
   Apoi linia 476 `if (participants[index])` este de asemenea falsă.
   Rezultat: Funcția returnează `token`! Toate celulele pentru `_001` rămân populate cu textul `PLACEHOLDER_NUME_COMPLET_001`, `PLACEHOLDER_CNP_001` etc.!
   **Corecție**: Condiția trebuie să fie strict:
   ```typescript
   if (index >= participants.length) return '';
   ```

2. **Bug-ul de Fallback pe Cursant**:
   În `generator.ts` linia 476:
   ```typescript
   if (participants[index]) {
     return formatParticipantValue(token, participants[index]) || token;
   }
   ```
   Dacă există un cursant la indexul 0, dar acesta nu are specificat `examGrade` sau `birthPlace`, `formatParticipantValue` returnează `undefined`.
   Operatorul `|| token` determină returnarea stringului brut `PLACEHOLDER_NOTA_EXAMEN_001`.
   **Corecție**: Trebuie returnat `formatParticipantValue(token, participants[index]) ?? ''`. Dacă valoarea nu există, celula se golește (`""`), fără a lăsa token-ul brut.

3. **Curățarea `cell.w` din SheetJS**:
   În SheetJS, dacă `cell.w` este prezent, unele funcționalități pot prefera textul formatat deja existent.
   **Corecție**:
   ```typescript
   cell.v = newVal;
   if (cell.w) delete cell.w;
   ```

4. **Derivarea Automată a Scalarilor Agregați**:
   Pe Foaia 6 și Foaia 7 din `Anexe Curs igiena.xlsx`, dacă parametrii nu sunt transmiși explicit, pot fi derivați automat:
   - `PLACEHOLDER_NUMAR_CANDIDATI`: `String(participants.length)`
   - `PLACEHOLDER_NUMAR_PREZENTI`: `String(participants.filter(p => p.attendance !== 'absent').length || participants.length)`
   - `PLACEHOLDER_NUMAR_ADMISI`: `String(participants.filter(p => p.examResult !== 'Respins' && p.examResult !== 'respins').length || participants.length)`
   - `PLACEHOLDER_NUMAR_RESPINSI`: `'0'`
   - Dacă `PLACEHOLDER_NUME_COMPLET` nu este transmis scalar pe foaia 7, dar există `participants[0]`, se preia din primul cursant.

---

## 7. Recomandare Exactă de Modificare a Codului

### 7.1. Modificări în `src/lib/templates/definitions.ts`

#### Modificarea 1: Curățarea câmpului fals din `INFO dosar personal.docx`
- **Locație**: Liniile 1927–1935
- **Cod existent**:
  ```typescript
  fields: [
    {
      key: '_Fără token-uri detectate._',
      label: ' Fără token-uri detectate. ',
      source: 'manual',
      required: false,
      type: 'string',
    }
  ],
  ```
- **Cod propus**:
  ```typescript
  fields: [],
  ```

#### Modificarea 2: Corectarea descrierii `ipssm-tesa`
- **Locație**: Linia 2368
- **Cod existent**:
  ```typescript
  description: 'Grilă detaliată cu cei 17 factori de risc identificați pentru postul de lucru funcționar administrativ / TESA.',
  ```
- **Cod propus**:
  ```typescript
  description: 'Grilă detaliată cu cei 30 de factori de risc identificați pentru postul de lucru funcționar administrativ / TESA conform metodei INCDPM.',
  ```

---

### 7.2. Modificări în `src/lib/templates/generator.ts`

#### Modificarea 1: `collectUnresolvedPlaceholders` să scaneze și fișierele `.rels`
- **Locație**: Liniile 78–84
- **Cod propus**:
  ```typescript
  if (format === 'docx') {
    const zip = new PizZip(buffer);
    for (const file of Object.values(zip.files)) {
      if (
        (file.name.startsWith('word/') || file.name.startsWith('customXml/')) &&
        (file.name.endsWith('.xml') || file.name.endsWith('.rels'))
      ) {
        add(file.asText());
      }
    }
  }
  ```

#### Modificarea 2: Multi-part XML & `.rels` Replacement după Docxtemplater
- **Locație**: Liniile 377–381
- **Cod propus**:
  ```typescript
    doc.render(renderData);
    const docZip = doc.getZip();

    // Multi-part post-processing: scan all XML and .rels parts for unresolved tokens & bare rels targets
    for (const [relativePath, file] of Object.entries(docZip.files)) {
      if (
        (relativePath.startsWith('word/') || relativePath.startsWith('customXml/')) &&
        (relativePath.endsWith('.xml') || relativePath.endsWith('.rels'))
      ) {
        let text = file.asText();
        let changed = false;

        for (const [k, v] of Object.entries(params.data)) {
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

    outputBuffer = docZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  ```

#### Modificarea 3: Corectarea logicii de Blanking Excel și curățarea `cell.w`
- **Locație**: Liniile 457–483
- **Cod propus**:
  ```typescript
    // Auto-derive aggregate totals and scalar participant defaults if not explicitly provided
    const effectiveData: Record<string, unknown> = { ...params.data };
    if (participants.length > 0) {
      const p0 = participants[0];
      if (!effectiveData.PLACEHOLDER_NUMAR_CANDIDATI) {
        effectiveData.PLACEHOLDER_NUMAR_CANDIDATI = String(participants.length);
      }
      if (!effectiveData.PLACEHOLDER_NUMAR_PREZENTI) {
        effectiveData.PLACEHOLDER_NUMAR_PREZENTI = String(
          participants.filter((p) => p.attendance !== 'absent').length || participants.length
        );
      }
      if (!effectiveData.PLACEHOLDER_NUMAR_ADMISI) {
        effectiveData.PLACEHOLDER_NUMAR_ADMISI = String(
          participants.filter((p) => String(p.examResult).toLowerCase() !== 'respins').length || participants.length
        );
      }
      if (!effectiveData.PLACEHOLDER_NUMAR_RESPINSI) {
        effectiveData.PLACEHOLDER_NUMAR_RESPINSI = String(
          participants.filter((p) => String(p.examResult).toLowerCase() === 'respins').length
        );
      }
      if (!effectiveData.PLACEHOLDER_NUME_COMPLET && p0.fullName) {
        effectiveData.PLACEHOLDER_NUME_COMPLET = p0.fullName;
      }
      if (!effectiveData.PLACEHOLDER_CNP && p0.cnp) {
        effectiveData.PLACEHOLDER_CNP = p0.cnp;
      }
      if (!effectiveData.PLACEHOLDER_DATA_NASTERII && p0.birthDate) {
        const b = parseBirthInfo(p0.birthDate, p0.cnp);
        effectiveData.PLACEHOLDER_DATA_NASTERII = b.dateFormatted;
      }
      if (!effectiveData.PLACEHOLDER_LOCALITATE_NASTERII && p0.birthPlace) {
        effectiveData.PLACEHOLDER_LOCALITATE_NASTERII = p0.birthPlace;
      }
      if (!effectiveData.PLACEHOLDER_MODUL_IGIENA && p0.module) {
        effectiveData.PLACEHOLDER_MODUL_IGIENA = p0.module;
      }
      if (!effectiveData.PLACEHOLDER_REZULTAT_EXAMEN && p0.examResult) {
        effectiveData.PLACEHOLDER_REZULTAT_EXAMEN = p0.examResult;
      }
    }

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      for (const address of Object.keys(sheet)) {
        if (address.startsWith('!')) continue;
        const cell = sheet[address];
        if (typeof cell?.v !== 'string') continue;

        const replaced = cell.v.replace(/PLACEHOLDER_[A-Z0-9_]+/g, (token: string) => {
          const directValue = effectiveData[token];
          if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
            return textValue(directValue);
          }

          const indexed = token.match(/_(\d{2,3})$/);
          if (indexed) {
            const index = Number(indexed[1]) - 1;
            // Clear unused capacity rows beyond the actual participant count
            if (index >= participants.length) return '';
            if (participants[index]) {
              const formatted = formatParticipantValue(token, participants[index]);
              return formatted !== undefined ? formatted : '';
            }
            return '';
          }
          return token;
        });

        cell.v = replaced;
        if (cell.w) delete cell.w;
      }
    }
  ```

---

## 8. Verificare și Validare

Modificările de mai sus pot fi verificate prin:
1. Rularea testului unitar de generare pe toate cele 25 de șabloane:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
2. Scanarea fișierelor rezultate pentru confirmarea eliminării exhaustive a token-urilor din `.rels` și Excel:
   ```bash
   npx tsx -e "
   import fs from 'fs';
   import PizZip from 'pizzip';
   const z = new PizZip(fs.readFileSync('storage/test_documents/TEST_training-tematica-introductiv_Tematica introductiv generala 4h.docx'));
   console.log('Rels has placeholder:', z.file('word/_rels/footer1.xml.rels')?.asText().includes('PLACEHOLDER_'));
   "
   ```
   *Rezultat scontat*: `Rels has placeholder: false`.
3. Verificarea numărului de câmpuri în catalog pentru `INFO dosar personal.docx`:
   ```bash
   npx tsx -e "
   import { TEMPLATE_CATALOG } from './src/lib/templates/definitions';
   const t = TEMPLATE_CATALOG.find(x => x.code === 'hr-info-dosar');
   console.log('Fields count:', t?.fields.length);
   "
   ```
   *Rezultat scontat*: `Fields count: 0`.
