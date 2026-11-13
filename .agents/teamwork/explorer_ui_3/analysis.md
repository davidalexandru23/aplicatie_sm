# Raport de Analiză UI/UX: Fluxuri de Generare Documente, Gestiune Clienți, Salariați și Cursuri Igienă

**Data:** 05 Noiembrie 2026  
**Autor:** Teamwork Explorer (UI/UX Architecture & Investigation)  
**Destinație:** Orchestrator & Echipele de Implementare  
**Proiect:** SSM & Cursuri Igienă — Platformă Internă  

---

## 1. Executive Summary

Investigația a analizat în detaliu componentele de interfață grafică, logica de interacțiune, validările de formulare și fluxurile utilizator din paginile cheie ale aplicației:
- `/documents/generate` (Generatorul central de documente)
- `/clients/[id]` (Fișa companiei client)
- `/employees` (Registrul centralizat al salariaților)
- `/hygiene` (Modulul de cursuri și examinare igienă)
- `/trainings` (Modulul de instruiri SSM și PSI)

### Constatări Cheie:
1. **Anomalia „Funcție / Post de Lucru” pe șabloanele de igienă și companie:**  
   Este cauzată de un defect logic în `src/app/documents/generate/page.tsx` (liniile 161–163, 185–187 și 470–488). Condiția de afișare `!isEmployeeRequired` este evaluată ca `true` pentru toate șabloanele non-angajat (inclusiv toate șabloanele de igienă, decizii, GDPR, opis). În plus, la selectarea clientului, aplicația preselectează automat primul post (`jobs[0]`), forțând apariția selectorului de funcție cu o valoare arbitrară (ex. „Bucătar”) deasupra controalelor specifice de igienă.
2. **Eroarea critică din captură (`Cannot access file ... Tabel Cursanti exemplu.xlsx`):**  
   Este provocată de utilizarea `XLSX.readFile(templateFilePath)` în `src/lib/templates/generator.ts` (linia 419). În mediul Next.js 16 cu bundling ESM (Turbopack), modulul `xlsx.mjs` nu are acces la variabila internă `_fs`, aruncând direct excepția `"Cannot access file " + path`. Pe de altă parte, metoda `fs.readFileSync(...)` + `XLSX.read(buffer)` (folosită la linia 89) funcționează perfect.
3. **Fricțiunea Formularului Monolitic:**  
   Toate cele 31 de șabloane statutare (din 5 domenii fundamental diferite: Decizii companie, IPSSM generale, Evaluare riscuri per post, Dosar nominal angajat, Sesiuni colective de igienă) sunt înghesuite într-un singur `<select>` cu 31 opțiuni pe o singură pagină. Formularul încearcă să fie „universal”, conducând la apariția/dispariția bruscă a câmpurilor, pierderea contextului, lipsa selectorului de punct de lucru (Worksite) și afișarea de zeci de tokenuri tehnice manuale (`PLACEHOLDER_*`).
4. **Lipsa acțiunilor CRUD esențiale în interfață:**  
   - Punctele de lucru (`Worksite`) și Funcțiile (`Job`) sunt strict **read-only** în `/clients/[id]`. Nu există modal de adăugare/editare post sau punct de lucru.
   - Registrul salariaților (`/employees`) este strict **read-only**. Nu există buton de „Adaugă Salariat” sau „Editează Date Salariat”; singura modalitate este reimportul unui fișier Excel.
   - Pachetul de Onboarding Salariat (1-Click ZIP cu 11 documente) există ca endpoint API (`/api/clients/[id]/packages/onboarding`), dar este disponibil doar pe pagina de client ca link mic, lipsind complet din `/employees` și `/documents/generate`.
5. **Afișarea brută a erorilor de server:**  
   Erorile de sistem și căile interne de disc sunt expuse direct utilizatorului în banere roșii nespecifice, fără ghidaj sau explicații prietenoase.

---

## 2. Radiografia Tehnică a Formularului Monolitic (`src/app/documents/generate/page.tsx`)

### 2.1. De ce a apărut dropdown-ul „Funcție / Post de Lucru” pe șabloanele de igienă?

#### Lanțul Cauzal (Code Trace):
1. **Definirea variabilelor de stare și condițiilor:**
   În `src/app/documents/generate/page.tsx`, liniile 157–163:
   ```typescript
   const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
   const isHygieneTemplate =
     currentTemplate?.family === 'hygiene' ||
     currentTemplate?.contextLevel === 'hygiene_session' ||
     selectedTemplateCode.startsWith('hygiene-');
   const isEmployeeRequired =
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
   ```
   Pentru orice șablon de igienă (ex. `hygiene-tabel-cursanti`, `hygiene-anexe-catalog` sau `hygiene-adeverinta`):
   - `isHygieneTemplate` este `true`.
   - `!isHygieneTemplate` este `false`.
   - Rezultă: `isEmployeeRequired` devine **`false`**!

2. **Auto-selectarea primului post din baza de date:**
   La liniile 180–189:
   ```typescript
   fetch(`/api/clients/${selectedClientId}`)
     .then((res) => res.json())
     .then((data) => {
       if (data && Array.isArray(data.jobs)) {
         setJobs(data.jobs);
         if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
           setSelectedJobId(data.jobs[0].id); // <--- ATENȚIE: Setează postul automat!
         }
       }
     });
   ```
   Deoarece `isEmployeeRequired` este `false`, efectul secundar consideră greșit că „dacă nu se cere angajat individual, atunci trebuie selectat automat primul post din firmă”. Pentru firma `BISTRO GOURMET S.R.L.`, primul post este „Bucătar”, astfel că `selectedJobId` devine automat ID-ul postului „Bucătar”.

3. **Randarea necondiționată a selectorului:**
   La liniile 469–488:
   ```tsx
   {/* Job / Funcție Selector (DOAR pentru documente de nivel companie/evaluare riscuri unde nu este implicat un angajat individual) */}
   {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
     <div className="pt-2 border-t border-slate-100">
       <label className="block text-xs font-semibold text-slate-700 mb-1">
         Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
       </label>
       <select
         value={selectedJobId}
         onChange={(e) => setSelectedJobId(e.target.value)}
         ...
   ```
   Comentariul afirmă că este „DOAR pentru documente de nivel companie/evaluare riscuri”, dar expresia verifică doar:
   `!isEmployeeRequired && selectedClientId && jobs.length > 0`
   Această expresie este **`true`** pentru:
   - Toate șabloanele de igienă (`hygiene-tabel-cursanti`, `hygiene-anexe-catalog`)
   - Toate deciziile de companie (`decizii-angajator`)
   - Toate instrucțiunile proprii (`ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-birou`, `ipssm-opis`)
   - Informarea GDPR (`hr-gdpr-informare`)

4. **Rezultat vizual aberant:**  
   Când utilizatorul a selectat `BISTRO GOURMET S.R.L.` și șablonul `Tabel Cursanți Igienă (XLSX)`, pe ecran a apărut un câmp obligatoriu/opțional „Funcție / Post de Lucru: Bucătar”, situat chiar deasupra opțiunilor de igienă („Scope A” / „Scope B”). Un tabel colectiv de cursanți la igienă include angajați din toate posturile (ospătari, ajutori de bucătar, barmani), astfel că cererea unei funcții unice este complet lipsită de sens operațional.

---

### 2.2. De ce a apărut eroarea `Cannot access file ... Tabel Cursanti exemplu.xlsx`?

#### Analiza Erorii de Sistem:
- În fișierul `src/lib/templates/generator.ts`, linia 419:
  ```typescript
  } else if (templateFormat === 'xlsx') {
    const wb = XLSX.readFile(templateFilePath);
  ```
- În pachetul SheetJS (`xlsx/xlsx.mjs`, liniile 3225–3234):
  ```javascript
  function read_file(path, options) {
    if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
    if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
    ...
    throw new Error("Cannot access file " + path);
  }
  ```
- În Next.js 16 cu Turbopack, modulele Node.js sunt împachetate ca ESM. În acest mediu de rulare, variabila `_fs` din SheetJS este `undefined`. Când `generator.ts` apelează `XLSX.readFile(templateFilePath)`, SheetJS aruncă instantaneu:
  `Error: Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx`.
- **Dovada rezolvării:**  
  La linia 89 a aceluiași fișier `generator.ts`, autorul a citit corect buffer-ul prin Node `fs`:
  ```typescript
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  ```
  Dacă linia 419 folosea `const buf = fs.readFileSync(templateFilePath); const wb = XLSX.read(buf, { type: 'buffer' });`, fișierul Excel s-ar fi deschis fără nicio problemă.
- **Defectul de UX:**  
  La linia 328 din `generate/page.tsx`, eroarea brută returnată de API a fost injectată nemodificată în interfață:
  `<div className="p-4 bg-rose-50 ..."><span>{error}</span></div>`, afișând utilizatorului calea fizică completă de pe serverul macOS!

---

### 2.3. Analiza Auto-Bind-ului Salariat -> Funcție (Lockup & Stări Incoerente)

Recent, s-a introdus mecanismul ca pentru documentele nominale de salariat (`isEmployeeRequired === true`), funcția să fie preluată automat din profilul salariatului (`emp.currentJobId`), eliminând dropdown-ul de funcție (linii 412–467).

#### Unde eșuează și unde blochează utilizatorul?
1. **Lipsa oricărei posibilități de override:**  
   Dacă un salariat a fost promovat recent, este în curs de mutare pe alt post, sau contractul se întocmește pentru o funcție nouă care încă nu a fost salvată în profil, operatorul **nu poate schimba funcția** din interfața de generare. Formularul ascunde complet dropdown-ul.
2. **Degradare severă când salariatul nu are post alocat:**  
   Dacă salariatul a fost importat fără post (`currentJobId === null`), interfața afișează un avertisment galben:  
   *„Salariatul selectat nu are un post asociat în profil. Se vor utiliza datele generale ale firmei.”*  
   Șabloane precum `hr-anexa-fisa-post`, `ssm-fisa-instruire-individuala`, `med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri` necesită obligatoriu cod COR, atribuții specifice și factori de risc. Operatorul vede avertismentul, dar **nu are de unde să aleagă postul**! Documentul se generează cu statut `missing_data` și câmpuri goale punctate.
3. **Contaminare încrucișată a stării (`state leakage`):**  
   Când utilizatorul comută între șabloane:
   - Pasul 1: Alege un șablon de companie -> Se auto-selectează `selectedJobId = jobs[0].id`.
   - Pasul 2: Comută pe un șablon de igienă -> `selectedJobId` rămâne setat pe `jobs[0].id` și este transmis în API payload (`POST /api/documents/generate`), alterând contextul rezolvitorului.
   - Pasul 3: Alege `hygiene-adeverinta` în „Scope A” -> Apare selector de salariat (linia 564), dar `onChange` actualizează doar `selectedEmployeeId`, lăsând `selectedJobId` desincronizat față de postul real al salariatului!

---

### 2.4. Fricțiunea Formularului Monolitic: Lipsa Segmentării pe Domenii

Formularul actual din `/documents/generate` încearcă să gestioneze printr-o singură pagină 31 de șabloane cu domenii complet disjuncte:

| Categorie Documente | Destinatar / Nivel | Câmpuri Strict Necesare | Câmpuri Irilevante care apar accidental |
|---|---|---|---|
| **Pachet Decizii & Organizare SSM** (`decizii-angajator`, `ipssm-opis`) | Companie (Angajator) | Client, Reprezentant Legal, Specialist SEPP, Lucrător Desemnat | Salariat, Funcție/Post, Sesiune Igienă, Cursant |
| **Instrucțiuni Proprii Generale** (`ipssm-11`, `ipssm-12`, `ipssm-13`, `ipssm-tesa`) | Companie / Sediu | Client, Punct de Lucru, Specialist SEPP | Salariat, Funcție/Post, Sesiune Igienă |
| **Evaluare Riscuri & Măsuri** (`risk-evaluare`, `risk-plan-prevenire-tesa`) | Post de Lucru / Punct de lucru | Client, Punct de Lucru, Funcție / Post, Evaluator | Salariat individual, Sesiune Igienă |
| **Documente Nominale HR & SSM** (`hr-cim-2026`, `ssm-fisa`, `psi-fisa`, `med-fisa`, `eip-fisa`) | Salariat individual | Client, Salariat, Funcție (cu posibilitate override), Punct de Lucru | Sesiune Igienă, Cursanți colectivi |
| **Documente Cursuri Igienă** (`hygiene-tabel-cursanti`, `hygiene-anexe-catalog`, `hygiene-adeverinta`) | Sesiune de curs / DSP | Sesiune Igienă, Furnizor, Data Examen, Cursant (pt adeverință) | Funcție/Post, Salariat individual din firmă (la nivel colectiv) |

#### Fricțiuni Majore Identificate:
1. **Dropdown masiv și nestructurat:** 31 de opțiuni într-o listă simplă, afișate doar cu un prefix gen `[IPSSM]` sau `[HR]`. Niciun filtru pe categorii, niciun tab, niciun mod de căutare.
2. **Lipsa totală a selectorului de Punct de Lucru (`Worksite`):**  
   Dacă o firmă are 3 puncte de lucru (ex. Sediu social, Punct de lucru Restaurant, Punct de lucru Depozit), formularul nu oferă niciun selector de punct de lucru! Rezolvitorul ia orbește `client.worksites[0]`, făcând imposibilă generarea evaluării riscurilor sau a tematicilor specifice pentru Punctul 2 sau 3.
3. **Explozia tokenurilor tehnice manuale:**  
   Sub selectorul principal, secțiunea „Câmpuri și Placeholdere Șablon” expune până la 20 de câmpuri manuale cu etichete tehnice brute (ex. `PLACEHOLDER_ORGANIZARE_SSM`, `PLACEHOLDER_NUMAR_DECIZIE_01`), intimidând operatorul care nu știe ce reprezintă aceste variabile interne.
4. **Lipsa Conceptului de „Pachet / Dosar” în Generator:**  
   Pentru a angaja un om, operatorul trebuie să intre de 11 ori în `/documents/generate`, să selecteze firma, șablonul, salariatul și să apese „Generează”, descărcând 11 fișiere separate, deși în backend există deja generatorul de arhivă ZIP (`generateEmployeeOnboardingZip`).

---

## 3. Analiza Paginilor de Gestiune Clienți (`/clients/[id]`)

### 3.1. Acțiuni de Generare Documente Existente
Pe pagina clientului (`/clients/[id]`):
- **În antet:**
  - `Exportă Registru Excel` (`/api/clients/${client.id}/export`) — Funcțional.
  - `Dosar SSM Companie (ZIP)` (`/api/clients/${client.id}/packages/dossier`) — Funcțional, asamblează cele 16 documente de nivel companie.
  - `Arhivă Inspecție ITM/ISU (ZIP)` (`/api/clients/${client.id}/packages/inspection-archive`) — Funcțional, arhivă structurată pe directoare.
  - `Generează Document` — Link extern către generatorul monolitic (`/documents/generate?clientId=${client.id}`).
- **În tabelul de salariați (coloana Documente):**
  - Buton „Cerere” (`hr-cerere-angajare`)
  - Buton „Declarație RI” (`hr-declaratie-regulament`)
  - Buton „CIM” (`hr-cim-2026`)
  - Buton `Onboarding ZIP` (`/api/clients/${client.id}/packages/onboarding?employeeId=${emp.id}`) — Descarcă arhiva ZIP completă cu 11 documente.

### 3.2. Deficiențe și Blocaje UX pe Pagina Clientului
1. **Lipsa gestionării Punctelor de Lucru și a Posturilor:**  
   Secțiunea 7 afișează listele de „Puncte de Lucru” și „Posturi & Context SSM”. Cu toate acestea, **nu există niciun buton de „Adaugă Punct de Lucru” sau „Adaugă Post / Funcție”**. Dacă firma deschide o nouă locație sau angajează pe o funcție nouă, utilizatorul nu are nicio cale în UI să introducă datele; singura soluție este reîncărcarea unui fișier Excel întreg!
2. **Absența noilor documente statutare din tabelul salariaților:**  
   În linia fiecărui salariat apar doar linkuri pentru Cerere, Declarație RI și CIM. Cele 6 documente noi statutare (Fișa SSM, Fișa PSI, Fișa Medicală Solicitare, Fișa Factori Risc, Fișa EIP, Anexa Fișa Postului) **nu au link direct**, forțând operatorul să meargă în generatorul monolitic.
3. **Cardul de Decizii Organizatorice (`OrganizationalDecisionsCard`):**  
   Este o adăugire foarte utilă (permite desemnarea salariaților pentru atribuții SSM, PSI, Prim Ajutor), însă la salvare nu oferă descărcarea imediată a deciziilor actualizate, ci doar afișează data ultimei generări.

---

## 4. Analiza Registrului Salariaților (`/employees`)

### 4.1. Structura și Neajunsurile Paginii
Pagina `/employees` este concepută ca un tablou centralizat de monitorizare a conformității (Medicină a Muncii, SSM, PSI, Igienă) cu pastile de status (Valabil, Scadență Iminentă, Depășit, Lipsă).

Cu toate acestea, din punct de vedere operațional, fluxul este grav trunchiat:
1. **Registru complet read-only:**  
   Nu există buton de „Adaugă Salariat”. Singurul buton din antet este `+ Import Registru Excel`. Nu există modal de editare date salariat (ex. corectare nume, actualizare CNP, schimbare post, schimbare status din ACTIV în PLECAT, actualizare dată examen medical).
2. **Nu există pagină individuală de salariat (`/employees/[id]`):**  
   Fiecare angajat există doar ca un rând într-un tabel mare. Nu se poate vizualiza dosarul personal consolidat, istoricul instruirilor sau fișele medicale anterioare.
3. **Pachetul de Onboarding ZIP lipsește cu desăvârșire:**  
   Deși în `/clients/[id]` există butonul `Onboarding ZIP`, în `/employees` coloana de documente conține doar linkuri către Cerere, Declarație și CIM. Operatorul care lucrează din registrul de salariați nu poate genera pachetul complet de angajare din această pagină!

### 4.2. Neconcordanțe între Schema Bazei de Date și Documentele Statutare
Investigarea modelului Prisma `Employee` a dezvăluit absența unor câmpuri obligatorii prevăzute de legislația muncii:
- **Lipsă Salariu Brut:** Nu există câmp de salariu (`salary` / `grossSalary`). Rezolvitorul folosește `(employee as any)?.salary`, care este mereu `undefined`, rezultând în documente cu `........................ lei`.
- **Lipsă Număr & Dată CIM:** Nu există câmpuri pentru numărul contractului individual de muncă și data înregistrării în Revisal/Reges.
- **Lipsă Normă de Lucru:** Nu există câmp pentru normă întreagă (8h/zi) sau timp parțial (4h, 2h).
- **Lipsă Nivel Studii:** Obligatoriu în Fișa individuală de instruire SSM (Anexa 11 HG 1425/2006).

---

## 5. Analiza Fluxurilor de Cursuri de Igienă (`/hygiene`) și Instruiri SSM (`/trainings`)

### 5.1. Segregarea Domeniilor: SSM vs Igienă
- Pagina `/trainings` gestionează sesiunile interne de instruire SSM și PSI conform Legii 319/2006 (tematici, durate, instructori, bifare participanți, recalculare automată a scadențelor periodice).
- Pagina `/hygiene` gestionează cursurile externe de „Noțiuni Fundamentale de Igienă” conform Ordinului comun MS/ME nr. 2209/4469/2022 (furnizor avizat MS/ME, președinte comisie DSP, proces-verbal examen, catalog și adeverințe).

Separarea acestor două module în meniuri distincte este **corectă și aliniată cu legislația din România**, deoarece instruirile SSM sunt o obligație internă continuă a angajatorului, în timp ce cursurile de igienă sunt programe formale de atestare susținute în fața unei comisii a Direcției de Sănătate Publică (DSP).

### 5.2. Deficiențe de Flux în `/hygiene`
1. **Redirecționarea eronată către Generatorul Monolitic:**  
   Butonul „Generează” din antetul sesiunii de igienă trimite utilizatorul către:  
   `/documents/generate?templateCode=hygiene-tabel-cursanti&hygieneSessionId=...`  
   Acolo, utilizatorul se izbește direct de cele două erori documentate la Punctul 2 (apariția absurdă a dropdown-ului de „Funcție: Bucătar” și excepția SheetJS `Cannot access file ... Tabel Cursanti exemplu.xlsx`).
2. **Descărcarea Rapidă 1-Click din subsolul sesiunii:**  
   Secțiunea din interiorul sesiunii extinse conține butoane de generare directă:
   - `Tabel Cursanți (XLSX)`
   - `Anexe Catalog (XLSX)`
   - `Adeverință` (per participant)  
   Când aceste butoane apelează API-ul `/api/documents/generate`, apelul eșua cu eroarea SheetJS `Cannot access file`, blocând descărcarea.
3. **Lipsa descărcării în lot a adeverințelor:**  
   Dacă o sesiune are 25 de cursanți admiși, operatorul trebuie să apese pe rând 25 de butoane „Adeverință”. Nu există un buton „Descarcă Toate Adeverințele Sesiunii (ZIP)”.

---

## 6. Catalogul Fluxurilor Broken, Confusing sau „Fără Sens” (UX Issues)

| ID | Locație | Comportament Observat | De ce este „fără sens” / confuz | Severitate |
|---|---|---|---|---|
| **UX-01** | `/documents/generate` | La alegerea oricărui șablon de igienă sau companie, apare dropdown-ul „Funcție / Post de Lucru” preselectat automat cu primul post din firmă. | Un tabel colectiv de cursanți sau o decizie de companie nu au nicio legătură cu o funcție specifică de execuție. | **Critic** |
| **UX-02** | `/documents/generate` | Generarea șablonului `Tabel Cursanți Igienă (XLSX)` se oprește într-o eroare roșie: `Cannot access file ... Tabel Cursanti exemplu.xlsx`. | Excepție internă de modul SheetJS în runtime ESM, expusă direct ca eroare de utilizator. | **Blocant** |
| **UX-03** | `/documents/generate` | La șabloanele nominale, dacă angajatul nu are post alocat în BD, utilizatorul este blocat: nu poate alege un post pentru document. | Documentul se generează incomplet, deși operatorul cunoaște postul și ar putea să-l selecteze. | **Major** |
| **UX-04** | `/documents/generate` | Toate cele 31 de șabloane sunt într-un singur dropdown imens, fără categorii, fără căutare și fără indicarea datelor necesare. | Operatorul trebuie să caute manual prin 31 de opțiuni cu denumiri amestecate. | **Major** |
| **UX-05** | `/documents/generate` | Nu există selector de Punct de Lucru (`Worksite`). | Dacă o firmă are 5 puncte de lucru, este imposibil să generezi documente specifice pentru punctele 2-5. | **Critic** |
| **UX-06** | `/documents/generate` | Afișarea a zeci de câmpuri de override cu tokenuri tehnice (`PLACEHOLDER_*`). | Operatorul este copleșit de denumiri interne de variabile pe care nu știe cum să le completeze. | **Mediu** |
| **UX-07** | `/clients/[id]` | Punctele de lucru și Funcțiile sunt strict read-only. Nu există butoane de adăugare/editare. | Modificările organizatorice nu pot fi operate din interfață, ci doar prin reimport de Excel. | **Major** |
| **UX-08** | `/employees` | Registrul este 100% read-only. Nu există buton de adăugare salariat nou sau editare salariat existent. | Nu se poate corecta o greșeală de tipar sau înregistra un nou angajat fără un fișier Excel extern. | **Critic** |
| **UX-09** | `/employees` | Lipsește butonul de „Onboarding ZIP” din tabelul salariaților. | Operatorul trebuie să navigheze în pagina clientului pentru a genera pachetul de angajare. | **Mediu** |
| **UX-10** | `/hygiene` | Linkul „Generează” trimite în generatorul monolitic defect, în loc să descarce direct fișierele sesiunii. | Rupe fluxul natural de lucru: utilizatorul iese din modulul de igienă și ajunge pe o pagină cu erori. | **Major** |
| **UX-11** | `/layout.tsx` & `/templates` | Meniul și pagina de catalog afișează „Catalog Șabloane (25)”, deși sunt 31 de șabloane active. | Incoerență vizuală care induce confuzie privind acoperirea legală a aplicației. | **Minor** |

---

## 7. Arhitectura Propusă pentru Redesenarea UI/UX

Pentru a elimina definitiv formularele confuze și stările invalide, propunem o arhitectură orientată pe **moduri clare de lucru (Workflows)** și **generare contextuală 1-Click**.

```
                           ┌──────────────────────────────────────────────┐
                           │          PANOU CENTRAL DE GENERARE           │
                           │            (/documents/generate)             │
                           └──────────────────────┬───────────────────────┘
                                                  │
         ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
         ▼                        ▼                               ▼                        ▼
┌──────────────────┐    ┌──────────────────┐            ┌──────────────────┐     ┌──────────────────┐
│     TABUL 1      │    │     TABUL 2      │            │     TABUL 3      │     │     TABUL 4      │
│ Pachet Angajare  │    │ Dosar SSM Firmă  │            │ Evaluare Riscuri │     │ Sesiune Igienă   │
│ (Onboarding Sal) │    │  (Start-up Pack) │            │   & Fișe Post    │     │  (Tabele & DSP)  │
├──────────────────┤    ├──────────────────┤            ├──────────────────┤     ├──────────────────┤
│• Firmă Client    │    │• Firmă Client    │            │• Firmă Client    │     │• Sesiune Igienă  │
│• Salariat        │    │• Punct de Lucru  │            │• Post / Funcție  │     │• Cursanți admiși │
│• Post (Override) │    │• Specialist SEPP │            │• Punct de Lucru  │     │• Opțiune:        │
│• Punct de Lucru  │    │• Decizii 01-09   │            │• Profil CAEN     │     │  - Tabel XLSX    │
│• Opțiune CIM     │    │                  │            │                  │     │  - Catalog XLSX  │
│                  │    │                  │            │                  │     │  - ZIP Adeverințe│
│  [DESCARCĂ ZIP]  │    │  [DESCARCĂ ZIP]  │            │ [GENEREAZĂ DOCX] │     │  [DESCARCĂ DOC]  │
└──────────────────┘    └──────────────────┘            └──────────────────┘     └──────────────────┘
                                                  │
                                                  ▼
                                       ┌──────────────────────┐
                                       │       TABUL 5        │
                                       │ Document Individual  │
                                       │ (Wizard în 3 Pași)   │
                                       ├──────────────────────┤
                                       │Pas 1: Alege Domeniul │
                                       │Pas 2: Alege Șablonul │
                                       │Pas 3: Date Gated     │
                                       └──────────────────────┘
```

### 7.1. Segregarea Generatorului Central pe Moduri Operaționale (Tab-uri Dedicate)

Înlocuirea formularului monolitic din `/documents/generate` cu o interfață bazată pe 5 tab-uri clare:

#### Tabul 1: Pachet Onboarding Salariat (1-Click ZIP)
- **Scop:** Generarea întregului dosar de angajare (11 documente) pentru un salariat.
- **Controale afișate:**
  1. Selector Firmă Client
  2. Selector Salariat
  3. Selector Funcție / Post (preselectat cu postul salariatului, dar **modificabil liber**)
  4. Selector Punct de Lucru
  5. Câmpuri rapide de completare: Salariu brut negociat, Număr CIM, Dată începere activitate, Model CIM (Ordin 2171/2022 vs Standard 2026).
- **Acțiune:** Buton mare `Generează Pachet Onboarding (ZIP cu 11 documente)`.
- **Avantaj:** Rezolvă dintr-un singur click 11 documente obligatorii fără repetarea selecțiilor.

#### Tabul 2: Dosar Înființare SSM Companie (Start-up Dossier ZIP)
- **Scop:** Generarea setului complet de documente de organizare a securității muncii pentru firmă (16 documente).
- **Controale afișate:**
  1. Selector Firmă Client
  2. Selector Punct de Lucru (pentru stabilirea sediului analizat)
  3. Confirmare Specialist SEPP și Reprezentant Legal
  4. Data emiterii deciziilor (implicit data curentă)
- **Acțiune:** Buton mare `Descarcă Dosar SSM Companie (ZIP cu 16 documente)`.

#### Tabul 3: Evaluare Riscuri & Fișa Postului (Job-Level)
- **Scop:** Generarea documentelor centrate pe funcție și riscuri profesionale.
- **Controale afișate:**
  1. Selector Firmă Client
  2. Selector Post / Funcție (obligatoriu)
  3. Selector Punct de Lucru
  4. Selector Șablon (filtrat strict la: `EVALUAREA RISCURILOR.docx`, `Anexa fisa postului SSM.docx`, `Plan de Prevenire TESA.docx`, `Tematica loc de munca.docx`).
- **Acțiune:** Buton `Generează Document`.

#### Tabul 4: Cursuri și Sesiuni de Igienă (Hygiene Session Level)
- **Scop:** Generarea documentelor oficiale pentru DSP și cursanți.
- **Controale afișate:**
  1. Selector Sesiune de Igienă (cu afișare furnizor, dată examen, număr cursanți).
  2. Opțiune document:
     - Tabel Centralizator Cursanți (`Tabel Cursanti exemplu.xlsx`)
     - Anexe Catalog Examinare (`Anexe Curs igiena.xlsx`)
     - Adeverință Individuală (selectează cursantul)
     - **NOU:** Arhivă ZIP cu toate adeverințele cursanților admiși
- **Regulă strictă de gating:** Niciun selector de angajat sau funcție nu va fi afișat în acest tab!

#### Tabul 5: Șablon Individual Statutar (Customizer Wizard)
- Pentru situația în care operatorul vrea să ajusteze sau să regenereze un singur document specific.
- **Wizard în 3 pași:**
  - *Pasul 1:* Selectează domeniul (Companie / Salariat / Post de Lucru / Sesiune Igienă).
  - *Pasul 2:* Selectează șablonul (lista afișează doar șabloanele din domeniul ales).
  - *Pasul 3:* Completează doar câmpurile strict necesare acelui șablon (fără variabile tehnice neinteligibile).

---

### 7.2. Butoane Contextuale Direct în Entități (Fără Ocolire prin Generator)

Pentru o experiență de utilizare fluidă, operatorul nu ar trebui să părăsească pagina pe care lucrează:

1. **În Fișa Salariatului (`/clients/[id]` și `/employees`):**
   - Adăugarea unui meniu dropdown `Acțiuni Documente`:
     - `Descarcă Dosar Onboarding Complet (ZIP)`
     - `Generează CIM`
     - `Generează Fișă SSM (Anexa 11)`
     - `Generează Fișă PSI`
     - `Generează Solicitare Examen Medical (Anexa 2)`
     - `Generează Fișă Factori Risc (Anexa 3)`
     - `Generează Fișă EIP`
     - `Generează Anexă Fișa Postului`
2. **În Fișa Sesiunii de Igienă (`/hygiene`):**
   - Menținerea butoanelor de descărcare directă 1-Click din tabel:
     - `Tabel Cursanți (XLSX)` -> descărcare directă prin streaming buffer.
     - `Anexe Catalog (XLSX)` -> descărcare directă prin streaming buffer.
     - `Descarcă Toate Adeverințele (ZIP)` -> arhivă ZIP cu adeverințele nominale ale tuturor cursanților declarați „Admis”.
   - Eliminarea linkurilor care trimit în generatorul monolitic.

---

### 7.3. Dynamic Field Gating (Reguli de Randare Condiționată)

Pentru a garanta că nicio stare invalidă nu mai poate fi generată:
1. **Regula Funcției (`Job`):**  
   Selectorul de `Job` se randează **EXCLUSIV** dacă:
   - Șablonul selectat are `contextLevel === 'job'` sau aparține familiei `risk` / `fisa_postului`.
   - SAU dacă este un șablon de salariat (`contextLevel === 'employee'`), unde apare ca un câmp editabil precompletat din profil, permițând operatorului să atribuie un post dacă acesta lipsește din BD.
   - **Interdicție absolută:** Selectorul de `Job` este complet interzis pe șabloane de igienă (`family === 'hygiene'`), decizii de angajator și instrucțiuni proprii generale.
2. **Regula Punctului de Lucru (`Worksite`):**  
   Dacă firma client are mai mult de 1 punct de lucru, se afișează obligatoriu un selector de `Worksite`. Nicio adresă nu va mai fi aleasă la întâmplare.
3. **Regula Câmpurilor Opționale/Manuale:**  
   Câmpurile din document care nu pot fi deduse din baza de date vor fi afișate cu etichete prietenoase în limba română (ex. „Număr Decizie SSM”, „Salariu de Bază Brut Negociat (lei)”, „Perioadă de Probă (zile)”), ascunzând cheile brute de tipul `PLACEHOLDER_SALARIU_BRUT`.

---

### 7.4. Modale CRUD Esențiale pentru Autonomie în Operare

Pentru a elimina dependența de reîncărcarea fișierelor Excel:
1. **Modal „Adaugă / Editează Post de Lucru” (`JobModal`):**  
   Permite definirea titlului postului, codului COR, atribuțiilor principale, echipamentelor utilizate și condițiilor de lucru direct din tabul de posturi al clientului.
2. **Modal „Adaugă / Editează Punct de Lucru” (`WorksiteModal`):**  
   Permite definirea numelui punctului de lucru, adresei complete și activității specifice.
3. **Modal „Adaugă / Editează Salariat” (`EmployeeModal`):**  
   Disponibil atât în `/clients/[id]` cât și în `/employees`. Permite introducerea datelor de identitate, atribuirea postului și a punctului de lucru, introducerea salariului și numărului CIM, precum și consemnarea directă a avizului medical și a instruirilor.

---

### 7.5. Tratarea Prietenoasă a Erorilor (User-Friendly Error Handling)

1. **Fără căi interne de sistem în interfață:**  
   Nicio eroare de tip `Cannot access file /Users/...` nu va fi propagată în UI. Dacă generatorul întâmpină o problemă de citire a șablonului fizic, utilizatorul va primi:  
   *„Fișierul șablon solicitat nu a putut fi procesat. Vă rugăm să contactați administratorul tehnic.”*
2. **Panou structurat pentru date lipsă:**  
   Când un document nu poate fi declarat `approved_for_print` deoarece lipsesc câmpuri obligatorii, interfața nu va mai afișa un șir lung de 50 de variabile separate prin virgulă. Câmpurile vor fi grupate vizual:
   - 🔴 **Date Salariat Lipsă:** CNP, Adresă domiciliu, Dată angajare.
   - 🟡 **Date Post Lipsă:** Cod COR, Atribuții specifice.
   - 🔵 **Date Firmă Lipsă:** Număr înregistrare Registrul Comerțului.

---

## 8. Concluzii și Pași Imediați

Investigația a demonstrat că defecțiunile raportate de utilizator nu reprezintă limitări fundamentale ale logicii de afaceri, ci sunt consecința directă a:
1. Unei greșeli de logică booleeană în `page.tsx` (`!isEmployeeRequired`),
2. Incompatibilității `XLSX.readFile` cu runtime-ul ESM din Next.js 16 (rezolvabilă trivial prin `fs.readFileSync`),
3. Forțării a 31 de fluxuri distincte într-un formular monolitic generic.

Adoptarea arhitecturii pe 5 moduri operaționale, cu generare contextuală 1-Click din paginile de entități și dynamic field gating, va elimina toate stările aberante, oferind o experiență de utilizare robustă, intuitivă și perfect conformă cu legislația SSM și de igienă din România.
