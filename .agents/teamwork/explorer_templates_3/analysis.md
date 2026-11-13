# Raport Tehnic de Investigare: Motorul de Generare a Documentelor și Catalogul Celor 31 de Șabloane SSM / Igienă / HR

**Data investigației:** 05.11.2026  
**Agent Investigator:** teamwork_explorer (`explorer_templates_3`)  
**Autoritate & Context:** Conform `ORIGINAL_REQUEST.md` și solicitării de testare / auditare a fluxurilor de generare documente.

---

## 1. Inventar Complet al Celor 31 de Șabloane Statutare

Tabelul de mai jos inventariază toate cele 31 de șabloane oficiale definite în `src/lib/templates/definitions.ts`, corelate cu fișierele fizice de pe disc din directorul `templates_registry/normalized/` și starea generării acestora prin API-ul `/api/documents/generate`.

| Nr | Cod Șablon | Denumire Oficială | Familie / Domeniu | Nivel Context | Cale Configuratǎ & Nume Fișier Fizic | Ext. | Pe Disc? | Mărime Fizică | Motor Generare | Placeholdere Găsite | Status Generare API | Observații / Diagnostic |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ipssm-alunecari` | IPSSM 11 - Alunecări și împiedicări | IPSSM | client | `templates_registry/normalized/11 - ALUNECARI.docx` | .docx | **DA** | 11.4 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Completat 100%. |
| 2 | `ipssm-autovehicule` | IPSSM 12 - Autovehicule și transport | IPSSM | client | `templates_registry/normalized/12 - AUTOVEHICULE.docx` | .docx | **DA** | 15.4 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Completat 100%. |
| 3 | `ipssm-birou` | IPSSM 13 - Activități de birou și ergonomie | IPSSM | client | `templates_registry/normalized/13 - ACTIVITATI DE BIROU.docx` | .docx | **DA** | 18.3 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Sintagmă pază eliminată, antet firma adăugat. |
| 4 | `hygiene-adeverinta` | Adeverință participare curs igienă | Hygiene | hygiene_session | `templates_registry/normalized/Adeverinta participare.docx` | .docx | **DA** | 25.2 KB | Docxtemplater + PizZip | 14 | **approved_for_print** | OK. Nivel 1/2 dinamic, avize igienizate fără stutter. |
| 5 | `hr-anexa-fisa-post` | Anexă la fișa postului - Atribuții SSM | HR | employee | `templates_registry/normalized/Anexa fisa postului SSM.docx` | .docx | **DA** | 27.0 KB | Docxtemplater + PizZip | 9 | **missing_data** | Lipsă `PLACEHOLDER_NUMAR_CIM` (schema Employee nu stochează nr CIM). |
| 6 | `hygiene-anexe-catalog` | Anexe și Cataloage Curs Igienă (8 Anexe) | Hygiene | hygiene_session | `templates_registry/normalized/Anexe Curs igiena.xlsx` | .xlsx | **DA** | 48.3 KB | SheetJS (xlsx) | 2,314 | **EROARE 500** | Crash în Turbopack: `Cannot access file ...`. |
| 7 | `hr-cerere-angajare` | Cerere de angajare | HR | employee | `templates_registry/normalized/Cerere angajare.docx` | .docx | **DA** | 37.2 KB | Docxtemplater + PizZip | 11 | **approved_for_print** | OK. Date buletin, adresă, firmă injectate complet. |
| 8 | `hr-cim-2026` | Contract individual de muncă 2026 | HR | employee | `templates_registry/normalized/Contract individual munca 2026.docx` | .docx | **DA** | 18.3 KB | Docxtemplater + PizZip | 29 | **missing_data** | Lipsă `PLACEHOLDER_NUMAR_CIM` și `PLACEHOLDER_SALARIU_BRUT`. |
| 9 | `decizii-angajator` | Pachet Decizii Interne SSM ale Angajatorului | Decision | client | `templates_registry/normalized/DECIZII.docx` | .docx | **DA** | 67.2 KB | Docxtemplater + PizZip | 48 | **approved_for_print** | OK. Toate deciziile 01-11 + permis foc + apelative dinamice. |
| 10 | `hr-declaratie-regulament` | Declarație luare la cunoștință Regulament Intern | HR | employee | `templates_registry/normalized/Declaratie luare cunostinta RI.docx` | .docx | **DA** | 37.5 KB | Docxtemplater + PizZip | 17 | **approved_for_print** | OK. Completat 100%. |
| 11 | `hr-declaratie-raspundere` | Declarație pe proprie răspundere la angajare (CIM) | HR | employee | `templates_registry/normalized/Declaratie pe proprie raspundere CIM.docx` | .docx | **DA** | 37.9 KB | Docxtemplater + PizZip | 20 | **approved_for_print** | OK. Completat 100%. |
| 12 | `training-detaliu-introductiv` | Detaliu suport la tematica introductiv-generală | Training | client | `templates_registry/normalized/Detaliu Tematica introductiv generala.docx` | .docx | **DA** | 95.9 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Completat 100%. |
| 13 | `training-detaliu-loc-munca` | Detaliu suport la tematica la locul de muncă | Training | client | `templates_registry/normalized/Detaliu Tematica loc de munca.docx` | .docx | **DA** | 115.3 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Reclama TinyPic eliminată, antet curat. |
| 14 | `risk-evaluare` | Dosar Evaluare Riscuri Accidentare & Îmbolnăvire | Risk | client | `templates_registry/normalized/EVALUAREA RISCURILOR.docx` | .docx | **DA** | 31.2 KB | Docxtemplater + PizZip | 23 | **approved_for_print** | OK. Scor CAEN dinamic, SEPP prestator legat. |
| 15 | `hr-info-dosar` | Informare conținut dosar personal salariat | HR | client | `templates_registry/normalized/INFO dosar personal.docx` | .docx | **DA** | 16.6 KB | Docxtemplater + PizZip | 0 | **approved_for_print** | OK. Document informativ static (fără tokenuri variabile). |
| 16 | `hr-gdpr-informare` | Notă de informare prelucrare date GDPR | HR | employee | `templates_registry/normalized/Informare Protectia Datelor.docx` | .docx | **DA** | 9.1 KB | Docxtemplater + PizZip | 13 | **approved_for_print** | OK. Art. 6(1)(b)/(c) GDPR integrat, puncte suspensie eliminate. |
| 17 | `ipssm-universale` | IPSSM 01-10 Generale / Universale | IPSSM | client | `templates_registry/normalized/IP 01-10 UNIVERSALE.docx` | .docx | **DA** | 48.0 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Completat 100%. |
| 18 | `ipssm-opis` | OPIS Instrucțiuni Proprii SSM | IPSSM | client | `templates_registry/normalized/OPIS IPSSM.docx` | .docx | **DA** | 7.4 KB | Docxtemplater + PizZip | 3 | **approved_for_print** | OK. Completat 100%. |
| 19 | `risk-plan-actiune-urgenta` | Plan de acțiune în caz de pericol grav și iminent | Risk | client | `templates_registry/normalized/Plan actiune pericol grav si iminent.docx` | .docx | **DA** | 70.2 KB | Docxtemplater + PizZip | 1 | **approved_for_print** | OK. Antet firmă completat. |
| 20 | `risk-plan-prevenire-tesa` | Plan de Prevenire și Protecție - Personal TESA | Risk | client | `templates_registry/normalized/Plan de Prevenire TESA.docx` | .docx | **DA** | 7.8 KB | Docxtemplater + PizZip | 4 | **approved_for_print** | OK. Tabel dinamic `{#planPrevenire}` populat din profilul CAEN. |
| 21 | `hygiene-tabel-cursanti` | Tabel evidență cursanți igienă | Hygiene | hygiene_session | `templates_registry/normalized/Tabel Cursanti exemplu.xlsx` | .xlsx | **DA** | 52.4 KB | SheetJS (xlsx) | 1,036 | **EROARE 500** | Crash în Turbopack: `Cannot access file ...`. |
| 22 | `training-tematica-introductiv` | Tematică instruire introductiv-generală (4 ore) | Training | client | `templates_registry/normalized/Tematica introductiv generala 4h.docx` | .docx | **DA** | 91.0 KB | Docxtemplater + PizZip | 4 | **approved_for_print** | OK. Completat 100%. |
| 23 | `training-tematica-loc-munca` | Tematică instruire la locul de muncă și periodică | Training | client | `templates_registry/normalized/Tematica loc de munca.docx` | .docx | **DA** | 91.4 KB | Docxtemplater + PizZip | 5 | **approved_for_print** | OK. Completat 100%. |
| 24 | `ipssm-tesa` | Fișă de Evaluare a Factorilor de Risc - Post TESA | Risk | client | `templates_registry/normalized/TESA.docx` | .docx | **DA** | 20.1 KB | Docxtemplater + PizZip | 103 | **approved_for_print** | OK. Grilă completă INCDPM 30 factori (gravitate, frecvență, parțial). |
| 25 | `risk-zone-pericol` | Evidența zonelor cu risc ridicat și specific | Risk | client | `templates_registry/normalized/Zone pericol grav si iminent.docx` | .docx | **DA** | 34.5 KB | Docxtemplater + PizZip | 15 | **approved_for_print** | OK. Zonele 01-06 și măsuri profilate. |
| 26 | `ssm-fisa-instruire-individuala` | Fișă Individuală de Instruire SSM (Anexa 11 HG 1425) | Training | employee | `templates_registry/normalized/ssm-fisa-instruire-individuala.docx` | .docx | **DA** | 21.0 KB | Docxtemplater + PizZip | 38 | **approved_for_print** | OK. Tabele buclă `{#instruiriPeriodiceSSM}`, traseu, IG, LM. |
| 27 | `psi-fisa-instructaj-individuala` | Fișă Individuală de Instructaj PSI/SU (OMAI 712) | Training | employee | `templates_registry/normalized/psi-fisa-instructaj-individuala.docx` | .docx | **DA** | 20.6 KB | Docxtemplater + PizZip | 29 | **approved_for_print** | OK. Tabele buclă `{#instructajePeriodicePSI}`, tematici OMAI. |
| 28 | `med-fisa-solicitare-examen` | Fișă de Solicitare Examen Medical (Anexa 2 HG 355) | HR | employee | `templates_registry/normalized/med-fisa-solicitare-examen.docx` | .docx | **DA** | 20.2 KB | Docxtemplater + PizZip | 49 | **approved_for_print** | OK. Casete bifate, cabinet medicina muncii, vechime. |
| 29 | `med-fisa-identificare-riscuri` | Fișă Identificare Factori Risc Profesional (Anexa 3) | Risk | employee | `templates_registry/normalized/med-fisa-identificare-riscuri.docx` | .docx | **DA** | 21.0 KB | Docxtemplater + PizZip | 76 | **approved_for_print** | OK. Ergonomie videoterminal, iluminat, zgomot, chimici VLE. |
| 30 | `eip-fisa-acordare-individuala` | Fișă Individuală de Dotare și Acordare EIP (HG 1048) | HR | employee | `templates_registry/normalized/eip-fisa-acordare-individuala.docx` | .docx | **DA** | 21.0 KB | Docxtemplater + PizZip | 122 | **approved_for_print** | OK. 10 poziții EIP normate cu standarde SR EN și durate. |
| 31 | `hr-cim-model-cadru-2022` | CIM Model-Cadru (Ordin MMSS 2171/2022) | HR | employee | `templates_registry/normalized/hr-cim-model-cadru-2022.docx` | .docx | **DA** | 21.5 KB | Docxtemplater + PizZip | 69 | **missing_data** | Lipsă `PLACEHOLDER_NUMAR_CIM` și `PLACEHOLDER_SALARIU_BRUT`. |

---

## 2. Diagnoza Detaliată a Erorii `Tabel Cursanti exemplu.xlsx`

### 2.1. Manifestare Verbatim
La încercarea de generare a documentului de igienă pe baza șablonului `hygiene-tabel-cursanti` pentru clientul `BISTRO GOURMET S.R.L.` (sau oricare alt client), utilizatorul primește în UI bannerul de eroare:
```
Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx
```
Aceeași eroare identică apare și la generarea șablonului `hygiene-anexe-catalog`:
```
Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Anexe Curs igiena.xlsx
```

### 2.2. Cauza Tehnică Exactă (Root Cause)
1. **Fișierul există pe disc**: Calea este corectă, permisiunile sunt `644`, fișierul are `52,403` bytes și conține foaia `Curs (2)` cu 1,036 de tokenuri indexate.
2. **Originea mesajului de eroare**:
   - Mesajul provine direct din biblioteca `xlsx` (SheetJS), fișierul `node_modules/xlsx/xlsx.js`, linia 3162:
     ```javascript
     function read_binary(path) {
       if (typeof _fs !== 'undefined') return _fs.readFileSync(path);
       if (typeof Deno !== 'undefined') return Deno.readFileSync(path);
       // ...
       throw new Error("Cannot access file " + path);
     }
     ```
   - SheetJS încearcă inițializarea variabilei interne `_fs` la linia 3098:
     ```javascript
     if (typeof require !== 'undefined') try { _fs = require('fs'); } catch(e) {}
     ```
   - **Mecanismul de eșec**: În **Next.js 16 (cu Turbopack / Webpack ESM Server Components)**, modulele de pe server sunt împachetate în context ESM strict, unde `typeof require === 'undefined'`.
   - Ca urmare, `_fs` nu este inițializat niciodată în runtime-ul SheetJS din serverul Next.js!
   - Când `src/lib/templates/generator.ts` apelează la linia 419:
     ```typescript
     const wb = XLSX.readFile(templateFilePath);
     ```
     `XLSX.readFile` intră pe ramura `o.type === 'file'`, apelează `read_binary(path)`, constată că `_fs` este `undefined`, că `Deno` este `undefined`, și aruncă excepția nativă `throw new Error("Cannot access file " + path)`.
3. **Contrastul revelator**:
   - În același fișier `generator.ts`, la linia 50 (`listTemplatePlaceholders`) și linia 89 (`collectUnresolvedPlaceholders`), dezvoltatorul a folosit `fs.readFileSync(templatePath)` (modulul nativ `import fs from 'fs'` din Node) urmat de `XLSX.read(buffer, { type: 'buffer' })`.
   - Din acest motiv, **inspectarea câmpurilor din API (`GET /api/templates/[code]/fields`) funcționează perfect pentru fișierele XLSX**, dar **generarea (`POST /api/documents/generate`) eșuează instantaneu** din cauza apelului unic greșit la `XLSX.readFile` de la linia 419.

---

## 3. Evaluarea Arhitecturii de Generare XLSX vs DOCX

### 3.1. DOCX (Docxtemplater + PizZip)
- **Funcționare**: Încarcă fișierul binar cu `fs.readFileSync`, dezarhivează XML-urile interne cu `PizZip`, parsează structura AST cu `Docxtemplater`, procesează bucle dinamice (`{#planPrevenire}`, `{#instruiriPeriodiceSSM}`), aplică `nullGetter` și efectuează un post-processing pe toate părțile `.xml` și `.rels`.
- **Comportament**: Robust, flexibil, suportă tabele dinamice cu număr arbitrar de rânduri (nu trunchiază).
- **Limitare identificată**: Tratează valorile șir vid `""` prin filtrare la linia 336 (`renderData`). Când o variabilă din DB este `""` (ex. `PLACEHOLDER_NUMAR_CIM`), `nullGetter` păstrează tokenul `{PLACEHOLDER_NUMAR_CIM}` brut în fișierul Word, ceea ce duce la marcarea eronată a documentului ca `missing_data`.

### 3.2. XLSX (SheetJS / xlsx)
- **Funcționare**: Caută și înlocuiește prin regex (`/PLACEHOLDER_[A-Z0-9_]+/g`) direct în valorile text ale celulelor (`cell.v`).
- **Probleme arhitecturale majore**:
  1. **Capacitate statică fixată pe rânduri indexate**: Șabloanele Excel conțin celule cu sufixe predefinite `_001` până la `_100` sau `_195`. Dacă o firmă are 120 de cursanți, dar șablonul a fost preformatat doar până la 100, cursanții peste 100 nu sunt adăugați (nu există inserare dinamică de rânduri în SheetJS fără reconstrucția formulelor și stilurilor).
  2. **Pierderea stilurilor avansate**: Versiunea Community a `xlsx` (SheetJS) poate pierde stiluri avansate de celulă, borduri custom sau înălțimi de rând la rescrierea cu `XLSX.write`.
  3. **Comportament asimetric la citire**: Utilizarea `XLSX.readFile` în loc de `XLSX.read(fs.readFileSync(...))` blochează complet generarea în orice bundler ESM Next.js.

---

## 4. Lista Deficiențelor, Presupunerilor Eronate și Gâtuirilor Identificate

### 4.1. Deficiențe Critice (Bugs)
1. **Apelul la `XLSX.readFile` în loc de `fs.readFileSync` + `XLSX.read` (Bug Critic)**:
   - *Fișier*: `src/lib/templates/generator.ts:419`
   - *Impact*: Blocarea totală (eroare 500) a generării pentru ambele șabloane Excel (`Tabel Cursanti exemplu.xlsx` și `Anexe Curs igiena.xlsx`).
2. **Condiția eronată de afișare a selectorului „Funcție / Post” în UI (Bug de Logică / UX)**:
   - *Fișier*: `src/app/documents/generate/page.tsx:470`
   - *Cod*: `!isEmployeeRequired && selectedClientId && jobs.length > 0`
   - *Eroare*: Pentru documentele de igienă, `isEmployeeRequired` este setat explicit pe `false`. Prin urmare, `!isEmployeeRequired` devine `true`, forțând afișarea dropdown-ului „Funcție / Post de Lucru” pentru șabloane de igienă (cum s-a văzut în screenshot-ul utilizatorului la generarea tabelului de cursanți pentru BISTRO GOURMET S.R.L.).
3. **Filtrarea valorilor goale în Docxtemplater lăsând tokenuri nerezolvate (Bug de Status)**:
   - *Fișier*: `src/lib/templates/generator.ts:335-339`
   - *Eroare*: Dacă un câmp opțional (cum ar fi `PLACEHOLDER_NUMAR_CIM` în fișa postului) este evaluat la `""` din lipsa datelor în DB, acesta este exclus din `renderData`. Docxtemplater lasă `{PLACEHOLDER_NUMAR_CIM}` în document, scannerul de tokenuri îl găsește, iar documentul este salvat cu statusul `missing_data` în loc de `approved_for_print`.

### 4.2. Neconcordanțe între Schema Bazei de Date și Șabloanele HR
1. **Lipsa atributelor contractuale din modelul `Employee`**:
   - Modelul `Employee` din `prisma/schema.prisma` nu conține câmpurile:
     * `salary` (Salariu brut de bază)
     * `cimNumber` (Număr contract individual de muncă)
     * `cimDate` (Data încheierii contractului)
     * `qualification` (Studii / calificare salariat)
     * `badgeNumber` / `employeeNumber` (Marcă salariat)
     * `bankAccount` / `iban` (Cont IBAN salariat)
     * `bankName` (Banca salariatului)
   - *Consecință*: La generarea contractelor de muncă (`hr-cim-2026`, `hr-cim-model-cadru-2022`) sau a anexei la fișa postului (`hr-anexa-fisa-post`), resolverul trebuie să returneze `""` (după ce s-au interzis datele fictive în Pilonul 3), determinând eșecul validării și etichetarea documentului ca `missing_data`.

### 4.3. Presupuneri Eronate în Resolver
1. **Asignarea automată a primului angajat pentru documente la nivel de client**:
   - *Fișier*: `src/lib/templates/resolver.ts:1982-1984`
   - *Comportament*: Când `employeeId` nu este furnizat (ex. pentru documente la nivel de firmă: `ipssm-birou`, `decizii-angajator`, `risk-evaluare`), resolverul atribuie automat `employee = client.employees[0]`.
   - *Risc*: Creează confuzie dacă un șablon de client are din greșeală un token de salariat, preluând nesolicitat datele primului angajat din baza de date.

---

## 5. Recomandări Concrete de Remediere și Redesenare a Arhitecturii

### 5.1. Remediere Imediată (Hotfix fără riscuri)
1. **Înlocuirea `XLSX.readFile` în `generator.ts`**:
   - Modificarea liniei 419 din `src/lib/templates/generator.ts`:
     ```typescript
     // Înainte:
     const wb = XLSX.readFile(templateFilePath);
     
     // După:
     const fileBuffer = fs.readFileSync(templateFilePath);
     const wb = XLSX.read(fileBuffer, { type: 'buffer' });
     ```
   - Acest patch de 2 linii deblochează instantaneu generarea celor 2 șabloane de calcul tabelar (`Tabel Cursanti exemplu.xlsx` și `Anexe Curs igiena.xlsx`).

2. **Corectarea condiției din UI pentru dropdown-ul de Post/Funcție**:
   - În `src/app/documents/generate/page.tsx:470`:
     ```tsx
     // Înainte:
     {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
     
     // După:
     {!isEmployeeRequired && !isHygieneTemplate && selectedClientId && jobs.length > 0 && currentTemplate?.family === 'risk' && (
     ```
   - Elimină complet apariția absurdă a dropdown-ului de post la documentele de igienă și la instrucțiunile universale.

3. **Tratarea elegantă a placeholderelor necompletate în Docxtemplater**:
   - În loc de filtrarea cheilor cu `""` din `renderData`, să se permită transmiterea unui șir de rezervă (de exemplu `""` sau linie punctată pentru semnare manuală `"—"` / `"........................"`) atunci când documentul este generat fără date CIM/salariu existente în profil.

### 5.2. Redesenare Arhitecturală a Generării (Medium-Term Plan)
1. **Completarea schemei Prisma pentru profilul complet al salariatului**:
   - Adăugarea în `model Employee`:
     * `cimNumber String?`
     * `cimDate DateTime?`
     * `salary Decimal?`
     * `qualification String?`
     * `badgeNumber String?`
     * `iban String?`
     * `bankName String?`
   - Astfel, șabloanele HR (`hr-cim-2026`, `hr-cim-model-cadru-2022`, `hr-anexa-fisa-post`) vor putea trece pe statusul **`approved_for_print`** cu date reale extrase din profilul salariatului.

2. **Migrarea motorului Excel către `exceljs`**:
   - Biblioteca `exceljs` oferă suport nativ pentru:
     * Inserare și duplicare dinamică de rânduri (păstrând formulele, stilurile, fonturile și bordurile originale).
     * Bucle de tip `{#each participants}` în Excel, similar cu Docxtemplater în Word.
     * Compatibilitate 100% cu fluxurile Buffer / Stream din Node.js și Next.js fără dependențe de `require('fs')`.

3. **Normalizarea fluxurilor pe 3 categorii distincte în Generator UI**:
   - **Fluxul A - Documente Angajator / Generale**: Necesită exclusiv selectarea firmei client (și opțional a postului pentru evaluarea de risc).
   - **Fluxul B - Documente Salariat**: Necesită selectarea salariatului; postul, atribuțiile și echipamentele se auto-completează din profilul acestuia.
   - **Fluxul C - Documente Igienă**: Necesită selectarea regimului (Scope A: toți angajații firmei pentru dosarul sanitar DSVSA; Scope B: curs / sesiune DSP specifică). Dropdown-ul de post de lucru este ascuns implicit.
