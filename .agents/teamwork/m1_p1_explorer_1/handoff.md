# Handoff Report — Milestone 1 Partea A (Explorer)

**De la:** `m1_p1_explorer_1`  
**Către:** Orchestrator & Worker  
**Data:** 2026-11-04  
**Tip handoff:** Hard (Investigation complete, actionable implementation strategy formulated)

---

## 1. Observation

1. **`EVALUAREA RISCURILOR.docx` (`risk-evaluare`):**
   - La P69 (`word/document.xml`), textul conține: `Societatea {PLACEHOLDER_FIRMA} cu sediul in {PLACEHOLDER_ADRESA_FIRMA}, inregistrata la Registrul Comertului Bucuresti sub nr. {PLACEHOLDER_ADRESA_FIRMA}, CUI {PLACEHOLDER_CUI} este infiintata in anul {PLACEHOLDER_AN_INFIINTARE}.`
   - La P336, textul conține: `...in cadrul lucrarii de absolvire s-a optat pentru utilizarea metodei elaborate de I.N.C.D.P.M. Bucuresti.`
   - La P175 și P337, sunt inserate două paragrafe rătăcite conținând exact: `<w:t>{PLACEHOLDER_NIVEL_RISC_GLOBAL} - {PLACEHOLDER_CONCLUZII_EVALUARE}</w:t>`.
   - La P665 și P711, 5 celule de grilă conțin stringul corupt `<w:t>{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx</w:t>` (la Contuzie, Strivire, Tumori maligne, Boala de iradiere, Boli infecțioase).
   - La P970 și P972, adresa și telefonul sunt hardcodate: `<w:t> Bucuresti , str Petcu Avram nr 6 , sector 4, </w:t>` și `<w:t>CONTACT: 0040 723.60.13.84</w:t>`.
   - Cuprinsul documentului (P51–P55) promite `Capitolul 6 Evaluarea posturilor de lucru: {PLACEHOLDER_FUNCTIE}` și `Capitolul 7 Concluzii`, însă corpul documentului se termină brusc la P1031 cu diagrama utilajelor din EN 292. Capitolele 6 și 7 lipsesc în totalitate din corpul documentului.

2. **`13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`):**
   - La P24, textul conține: `Instrucţiunile prezente completeaza si detaliaza (ţinând seama de particularităţile activităţii agenţilor de pază şi ale locurilor de muncă aflate în responsabilitatea lor), prevederile următoarelor acte normative:`. În OpenXML, textul este fragmentat în 3 run-uri diferite: Run 3 (`particularităţile activităţii agenţilor de`), Run 4 (` `), Run 5 (`pază şi ale locurilor de muncă aflate în responsabilitatea lor),`). O simplă înlocuire de string pe XML neconsolidat eșuează.
   - Running header-ul (`word/header1.xml`, `header2.xml`, `header3.xml`) este gol (`<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>`).
   - În corpul documentului (P0–P2) apare doar `Aprobat / ADMINISTRATOR / {PLACEHOLDER_REPREZENTANT_LEGAL}`, fără denumirea angajatorului emitent.
   - În `src/lib/templates/definitions.ts` (l. 105–132), `fields` conține doar `PLACEHOLDER_REPREZENTANT_LEGAL` și `PLACEHOLDER_SPECIALIST_SSM`. `PLACEHOLDER_FIRMA` lipsește din catalog.

3. **`11 - ALUNECARI.docx` (`ipssm-alunecari`):**
   - Running header-ul (`word/header1.xml`, `header2.xml`, `header3.xml`) este gol.
   - În corpul documentului (P0–P2) apare doar `Aprobat / ADMINISTRATOR / {PLACEHOLDER_REPREZENTANT_LEGAL}`, fără denumirea angajatorului emitent.
   - În `src/lib/templates/definitions.ts` (l. 40–67), `fields` conține doar `PLACEHOLDER_REPREZENTANT_LEGAL` și `PLACEHOLDER_SPECIALIST_SSM`. `PLACEHOLDER_FIRMA` lipsește din catalog.

4. **Starea Suitelor de Teste:**
   - `npx tsx scripts/test-all-templates-generation.ts` rulează cu succes (25/25 PASS).
   - `npm run build` compilează curat în sub 4 secunde, 0 erori TypeScript.

---

## 2. Logic Chain

1. Din Observația 1, tokenul `{PLACEHOLDER_ADRESA_FIRMA}` din P69 generează adresa fizică a firmei în loc de Jxx/xxx/xxxx, iar mențiunea `Bucuresti` invalidează documentul pentru clienți din restul țării. Înlocuirea cu `{PLACEHOLDER_NR_REG_COM}` și eliminarea cuvântului „București” asigură conformitatea legală a oricărei societăți comerciale.
2. Din Observația 1, prezența expresiilor academice („lucrării de absolvire”) și a datelor de contact particulare ale evaluatorului istoric („str Petcu Avram”, „0040 723...”) constituie reziduuri inacceptabile într-un produs comercial; înlocuirea lor cu formulare profesională și tokenuri dinamice (`{PLACEHOLDER_ADRESA_PRESTATOR}`, `{PLACEHOLDER_TELEFON_PRESTATOR}`) leagă documentul direct de prestatorul SEPP alocat în baza de date.
3. Din Observația 1, coruperile din P665 și P711 (`{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`) sunt rezultatul unor substituții automate grosiere peste matricea INCDPM; înlocuirea lor cu `---------xxxxxx-------` redă aspectul curat al scalei de cotare.
4. Din Observația 1, lipsa Capitolelor 6 și 7 face ca documentul de evaluare a riscurilor să fie incomplet (doar o broșură de teorie fără evaluarea efectivă a postului); reintegrarea grilei de risc INCDPM (30 factori) și a secțiunii de concluzii cu `{PLACEHOLDER_NIVEL_RISC_GLOBAL}` și `{PLACEHOLDER_CONCLUZII_EVALUARE}` onorează promisiunea cuprinsului și conferă valoare juridică dosarului.
5. Din Observația 2, mențiunea „agenților de pază” într-o instrucțiune IPSSM pentru birou/IT este o eroare gravă de redactare; fragmentarea run-urilor OpenXML impune consolidarea într-un singur `<w:r>` curat cu textul actualizat pentru personalul de birou.
6. Din Observațiile 2 și 3, lipsa `{PLACEHOLDER_FIRMA}` atât din antetul documentelor cât și din `definitions.ts` lasă actele oficiale fără identificarea angajatorului emitent; introducerea tokenului în running header (`header1.xml`), la începutul corpului (`document.xml`) și în `definitions.ts` asigură afișarea numelui firmei pe toate paginile și validarea în schema de generare.
7. Din Observația 4, întrucât testele și build-ul funcționează perfect în prezent, toate modificările aduse trebuie să mențină 100% rata de succes a generării și a compilării.

---

## 3. Caveats

1. **Sincronizarea ambelor directoare de șabloane:** Proiectul deține două seturi identice de șabloane: `templates_registry/normalized/` (folosit direct de Next.js runtime) și `handoff/ssm-template-placeholder-pack/templates/`. Modificările trebuie aplicate sau copiate în ambele locații pentru a preveni deviațiile.
2. **Integritatea XML:** Toate modificările trebuie să respecte structura OpenXML (închiderea tag-urilor, entități XML escapate precum `&amp;`, menținerea namespace-urilor).
3. **Definiții de câmpuri:** Orice token nou introdus în șablon (`PLACEHOLDER_FIRMA`, `PLACEHOLDER_NR_REG_COM`, etc.) trebuie să aibă valoare corespondentă în `resolver.ts` și intrare în `definitions.ts`, altfel validatorul `validateMissingFields` sau `collectUnresolvedPlaceholders` va semnala starea `missing_data`.

---

## 4. Conclusion

Planul tehnic pentru Milestone 1 Partea A este complet definit și validat la nivel de XML și TypeScript.
- **Fișiere țintă:**
  - `templates_registry/normalized/EVALUAREA RISCURILOR.docx`
  - `templates_registry/normalized/13 - ACTIVITATI DE BIROU.docx`
  - `templates_registry/normalized/11 - ALUNECARI.docx`
  - `handoff/ssm-template-placeholder-pack/templates/` (sincronizare oglindă)
  - `src/lib/templates/definitions.ts`
  - `src/lib/templates/resolver.ts`
- **Raport tehnic complet cu cod XML și script Python:** A fost redactat la `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1/analysis.md`.
- **Workerul poate proceda imediat la execuție** folosind scriptul Python de dezarhivare, patch și reîmpachetare descris în raport.

---

## 5. Verification Method

Pentru verificarea independentă a implementării:

1. **Rularea suitei complete de generare:**
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   *Condiție de invalidare:* Dacă vreunul dintre cele 25 de șabloane eșuează sau apare cu `missing_data` / `FAIL`, implementarea este invalidă.

2. **Verificarea compilării curate:**
   ```bash
   npm run build
   ```
   *Condiție de invalidare:* Dacă Next.js Turbopack sau TypeScript raportează erori (exit code != 0), handoff-ul este invalidat.

3. **Inspecția vizuală / text a fișierelor generate în `storage/test_documents/`:**
   - Rulare script python de inspecție a conținutului:
     ```bash
     python3 -c "
     import zipfile, xml.etree.ElementTree as ET
     for f in ['TEST_risk-evaluare_EVALUAREA RISCURILOR.docx', 'TEST_ipssm-birou_13 - ACTIVITATI DE BIROU.docx', 'TEST_ipssm-alunecari_11 - ALUNECARI.docx']:
         z = zipfile.ZipFile(f'storage/test_documents/{f}')
         txt = ''.join(ET.fromstring(z.read('word/document.xml')).itertext())
         print(f, 'has pază?', 'agenților de pază' in txt, 'has absolvire?', 'absolvire' in txt, 'has Petcu?', 'Petcu' in txt)
     "
     ```
   *Condiție de invalidare:* Dacă `TEST_ipssm-birou` conține `agenților de pază` sau `TEST_risk-evaluare` conține `absolvire` ori `Petcu`, verificarea a eșuat.
