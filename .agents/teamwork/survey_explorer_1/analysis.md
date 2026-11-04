# Raport de Analiză Tehnică: Starea Aplicației și Arhitectura Sistemului SSM

**Data investigației**: 2026-11-01  
**Autor**: Explorer 1 (App Codebase Surveyor)  
**Locație spațiu de lucru**: `/Users/davidalexandru/Documents/Proiect_SSM`  
**Referință misiune**: `DISPATCH.md` & `ORIGINAL_REQUEST.md` (Cerințele R1, R2, R3, R4)

---

## 1. Sinteza Executivă

Aplicația existentă este un monolit modern bazat pe **Next.js 16.4.3 (App Router)** cu **React 19.3.0**, **TypeScript 5**, **Tailwind CSS v4** și **Prisma ORM 6.19.3** conectat la o bază de date relațională **PostgreSQL 16**.

Sistemul implementează deja catalogul complet al celor **25 de șabloane oficiale** (23 DOCX și 2 XLSX), un motor de import Excel (`Model_date_client_SSM.xlsx`) cu reconciliere automată pe bază de CNP și protecție strictă GDPR (mascare CNP `18504********`), precum și generare de documente prin `docxtemplater`, `pizzip`, `xlsx` și `pdf-lib`.

Cu toate acestea, investigația a relevat două discrepanțe majore critice față de cerințele utilizatorului:
1. **Completitudinea Autocompletării Documentelor (R1 & R4)**: Din cele 25 de șabloane, la generarea automată actuală, **16 șabloane rămân în starea `missing_data`** și păstrează token-uri vizibile `{PLACEHOLDER_*}` pe document, din cauză că numeroase câmpuri (reprezentant prestator, date aviz, numere decizii angajator, parametri de risc INCDPM, zone de pericol) sunt etichetate rigid ca `manual` în `definitions.ts` și nu dispun de fallback-uri realiste și autentice din punct de vedere legal românesc.
2. **Urmărirea Scadențelor și Expirărilor (R2)**: În schema bazei de date (`schema.prisma`), în logica de backend și în interfața UI (`/employees`, `/clients/[id]`, `/` dashboard) **nu există suport pentru urmărirea scadențelor de medicina muncii (HG 355/2007), a intervalelor de instruire periodică SSM și PSI/SU (HG 1425/2006, Legea 307/2006) și a valabilității de 3 ani a certificatelor de igienă (Ordinul 1225/5031/2003 / Metodologia 2022)**. Nu există indicatori vizuali (insigne de status Valid / Scadent / Expirat) sau alerte în interfață.

Aplicația se compilează curat (`npm run build` are cod de ieșire 0, cu un singur avertisment Turbopack la citirea fs în `generator.ts`), respectă principiul simplității fără roluri sau semnături electronice (R3), iar testele offline confirmă integritatea structurală a celor 25 de fișiere de șablon.

---

## 2. Configurația Tehnologică și Dependințele (`package.json`)

### Dependințe de producție (`dependencies`)
| Pachet | Versiune | Rol în sistem |
|---|---|---|
| `next` | `16.4.3` | Framework full-stack React cu App Router și Server Actions/Components |
| `react` & `react-dom` | `19.3.0` | Bibliotecă de UI |
| `@prisma/client` | `^6.19.3` | Client ORM tipizat pentru accesul la PostgreSQL |
| `docxtemplater` | `^3.71.1` | Motor de completare șabloane Word (.docx) prin taguri declarative |
| `pizzip` | `^3.3.0` | Decomprimare/recomprimare arhive OOXML (.docx) |
| `xlsx` | `^0.18.5` | Parsare și scriere registre Excel (.xlsx/.xls) |
| `pdf-lib` | `^1.17.1` | Manipulare și completare fișiere PDF |
| `lucide-react` | `^1.66.0` | Set de pictograme SVG pentru interfață |
| `zod` | `^4.6.7` | Validare scheme de date |
| `@tailwindcss/postcss` | `^4.3.3` | Integrare Tailwind CSS v4 |
| `postcss` | `^8.5.32` | Procesare stiluri |

### Dependințe de dezvoltare (`devDependencies`)
- `prisma`: `^6.19.3` (CLI migrații și generare)
- `typescript`: `^5` (verificare tipuri strictă)
- `@types/node`: `^20`, `@types/react`: `^19`, `@types/react-dom`: `^19`, `@types/pizzip`: `^3.0.5`
- `eslint`: `^9`, `eslint-config-next`: `16.4.3`
- `@tailwindcss/turbopack`: `^4`, `tailwindcss`: `^4`
- `tsx`: folosit în scripturile CLI din `scripts/`

### Analiza Compilării și Build-ului
- Verificare TypeScript: `npx tsc --noEmit` rulează cu **cod de ieșire 0** (fără erori de tip).
- Verificare Build Next.js: `npm run build` rulează cu **cod de ieșire 0**.
- **Avertisment detectat la build**:
  În `src/lib/templates/generator.ts:387`:
  ```ts
  const pdfBytes = fs.readFileSync(baseSourcePath);
  ```
  Turbopack raportează un warning de acces dinamic la sistemul de fișiere (`Dynamic filesystem access causes tracing of the whole project`). Acest avertisment este non-blocant, dar trasează întregul proiect în bundle-ul serverului.

---

## 3. Stratul Bazei de Date (`prisma/schema.prisma`)

Baza de date este PostgreSQL 16 (URL: `postgresql://.../ssm_db?schema=public`).
Schema conține 451 de linii și definește 17 modele principale grupate în 6 domenii:

### 3.1. Modele Existente și Structură
1. **Organizațional**:
   - `Client` (L14-37): `id`, `name`, `cui` (@unique), `regCom`, `address`, `legalRepresentative`, `contactPerson`, `contactEmail`, `contactPhone`, `isActive`.
   - `Worksite` (L39-55): punct de lucru legat de `Client`, cu `name`, `address`, `activity`. Constrângere `@@unique([clientId, name])`.
   - `Job` (L57-76): funcție/post legat de `Client`, cu `title`, `corCode`, `mainActivities`, `equipmentUsed`, `workConditions`, `workersCount`. Constrângere `@@unique([clientId, title])`.
2. **Personal & Identitate**:
   - `Employee` (L82-130): `clientId`, `firstName`, `lastName`, `sex`, `cnp` (@unique per client), `birthDate`, `birthPlace`, `birthCounty`, `citizenship`, `email`, `phone`, `currentJobId`, `currentWorksiteId`, `startDateOnJob`, `hireDate`, `status` (`ACTIV` / `PLECAT`), `leaveDate`, `hygieneRequested`, `hygieneModule`, `hygienePreferredSession`, `adminNotes`.
   - `IdentityDocument` (L132-144): relație 1:1 cu `Employee`, cu `docType`, `series`, `number`, `issuedBy`, `issueDate`, `expiryDate`.
   - `ResidenceAddress` (L146-161): relație 1:1 cu `Employee`, cu `county`, `locality`, `street`, `number`, `building`, `entrance`, `floor`, `apartment`, `postalCode`.
   - `EmploymentHistory` (L163-174): istoric transferuri post/punct.
3. **Evaluare Riscuri & Prevenire**:
   - `RiskAssessment` (L180-202): `clientId`, `worksiteId`, `jobId`, `title`, `method` (default `"INCDPM"`), `version`, `evaluatorName`, `conclusions`, `status`.
   - `RiskItem` (L204-220): `assessmentId`, `hazard`, `riskSituation`, `consequence`, `severityScore`, `probabilityScore`, `riskLevel`, `existingMeasures`, `residualRiskLevel`, `sortOrder`.
   - `PreventionMeasure` (L222-238): `assessmentId`, `riskItemId`, `description`, `measureType`, `responsiblePerson`, `deadline`, `status`, `resources`.
   - `HazardZone` (L240-250): `assessmentId`, `zoneName`, `location`, `hazardDescription`, `safetyMeasures`.
4. **Instruire SSM & Cursuri Igienă**:
   - `TrainingMaterial` (L255-267): `type`, `title`, `code`, `contentSummary`, `activityOrJob`.
   - `TrainingEvent` (L269-286): `clientId`, `type`, `eventDate`, `durationHours`, `materialOrTopic`, `instructorName`, `verifierName`, `location`, `status`.
   - `TrainingParticipant` (L288-301): `eventId`, `employeeId`, `result` (default `"admis"`), `scannedSheetUrl`.
   - `HygieneSession` (L303-321): `providerName`, `msAuthorization`, `meAuthorization`, `sessionDate`, `examDate`, `location`, `commissionPresident`, `commissionMember1`, `commissionMember2`, `commissionSecretary`, `pvSeriesNumber`, `status`.
   - `HygieneParticipant` (L323-351): `sessionId`, `employeeId`, `clientName`, `lastName`, `firstName`, `cnp`, `attendance`, `examGrade`, `examResult`, `certificateSeries`, `certificateNumber`.
5. **Catalog Șabloane & Documente Emise**:
   - `Template` (L357-376): `code` (@unique), `name`, `family`, `originalFilename`, `normalizedFilename`, `format`, `contextLevel`, `status`, `version`, `manifestJson`, `reviewer`.
   - `GeneratedDocument` (L378-411): `clientId`, `employeeId`, `templateId`, `title`, `status` (`draft`, `missing_data`, `approved_for_print`), `filePath`, `mimeType`, `fileSizeBytes`, `snapshotData`, `missingFields`, `createdBy`.
6. **Importuri & Audit**:
   - `ImportBatch` (L417-435): istoric importuri Excel cu `validationReport` și `diffData`.
   - `AuditEvent` (L437-451): log securizat fără expunere de CNP.

### 3.2. Goluri Majore în Baza de Date pentru Cerința R2 (Deadline & Expiry Tracking)
- **Medicină a Muncii (HG 355/2007)**: Nu există niciun model sau câmp pentru fișa de aptitudine medicală (`medicalExamDate`, `medicalExpiryDate`, `medicalFitness` - Apt/Apt condiționat/Inapt, `medicalDoctor`, `medicalClinic`).
- **Instruire Periodică SSM & PSI/SU (HG 1425/2006 art. 96, Legea 307/2006)**: Nu există calcul sau evidență a intervalului periodic per angajat (ex. 6 luni pentru TESA, 1-3 luni pentru producție/risc) și a următoarei scadențe (`nextSsmTrainingDate`, `nextPsiTrainingDate`).
- **Valabilitate Cursuri Igienă (Ordinul 1225/5031/2003 / Metodologia 2022)**: Deși `HygieneParticipant` reține `certificateSeries` și `examDate`, nu există câmp sau calcul automat pentru data de expirare a certificatului (care conform legii este strict de **3 ani / 36 luni** de la data examenului).
- **Statut de Conformitate General**: Nu există proprietate calculată pe angajat care să aggregeze conformitatea (Conform / Scadent în 30 de zile / Expirat / Neefectuat).

---

## 4. Stratul Backend și Rutele API (`src/app/api`)

Toate endpoint-urile sunt implementate în Next.js App Router sub `src/app/api`:

| Rută API | Metodă | Descriere & Rol |
|---|---|---|
| `/api/clients` | `GET`, `POST` | Listare clienți cu contorizări de relații; creare client nou |
| `/api/clients/[id]/employees` | `GET` | Listare angajați ai clientului specificat (returnează id, nume, CNP, status, job, worksite) |
| `/api/clients/[id]/export` | `GET` | Exportă registrul complet al clientului în format Excel |
| `/api/documents/generate` | `POST` | Primire solicitare generare, rezolvare placeholdere via central resolver, apel generator, salvare în DB și stocare pe disc |
| `/api/documents/[id]/download` | `GET` | Descărcare binară securizată a documentului generat din `storage/documents/` cu log de audit |
| `/api/templates` | `GET` | Listare șabloane din catalogul PostgreSQL |
| `/api/templates/[code]/fields` | `GET` | Rezolvare dinamică a câmpurilor și valorilor precompletate pentru un șablon în contextul dat |
| `/api/imports/preview` | `POST` | Upload Excel, parsare, validare CNP, comparare cu DB și întoarcere diff preview |
| `/api/imports/commit` | `POST` | Confirmare și salvare tranzacțională a importului în PostgreSQL |
| `/api/hygiene/sessions` | `GET` | Listare sesiuni de cursuri de igienă cu participanți |

### Goluri Backend Identificate
1. **Lipsa Rutei de Scadențe / Conformitate**: Nu există nicio rută (ex. `/api/compliance` sau câmpuri de conformitate în `/api/clients/[id]/employees`) care să returneze statusul scadențelor pe salariat.
2. **Generare doar document-cu-document**: Nu există endpoint de generare în masă (batch generation) a pachetului complet de documente pentru o firmă sau un angajat.

---

## 5. Motorul de Generare și Catalogul Celor 25 de Șabloane

Motorul este compus din trei fișiere principale în `src/lib/templates/`:
- `definitions.ts`: Definirea celor 25 de șabloane și a listei exhaustive a placeholderelor aferente.
- `generator.ts`: Implementarea tehnică a generării pentru DOCX (`Docxtemplater`), XLSX (`XLSX`) și PDF (`PDFDocument`).
- `resolver.ts`: Logica de extragere a valorilor din DB și mapare pe chei `PLACEHOLDER_*`.

### 5.1. Inventarul Celor 25 de Șabloane Oficiale
Toate cele 25 de fișiere fizice există în `templates_registry/normalized/` (și identice în `handoff/ssm-template-placeholder-pack/templates/`):

| Nr | Cod Intern | Nume Șablon | Format | Fișier Normalizat | Nivel Context |
|---|---|---|---|---|---|
| 1 | `ipssm-alunecari` | IPSSM 11 - Alunecări și împiedicări | DOCX | `11 - ALUNECARI.docx` | client |
| 2 | `ipssm-autovehicule` | IPSSM 12 - Autovehicule și transport | DOCX | `12 - AUTOVEHICULE.docx` | client |
| 3 | `ipssm-birou` | IPSSM 13 - Activități de birou | DOCX | `13 - ACTIVITATI DE BIROU.docx` | client |
| 4 | `hygiene-adeverinta` | Adeverință participare curs igienă | DOCX | `Adeverinta participare.docx` | hygiene_session |
| 5 | `hr-anexa-fisa-post` | Anexă SSM la fișa de post | DOCX | `Anexa fisa postului SSM.docx` | employee |
| 6 | `hygiene-anexe-catalog` | Pachet Anexe Curs Igienă (Anexe 1-8) | XLSX | `Anexe Curs igiena.xlsx` | hygiene_session |
| 7 | `hr-cerere-angajare` | Cerere de angajare | DOCX | `Cerere angajare.docx` | employee |
| 8 | `hr-cim-2026` | Contract Individual de Muncă 2026 | DOCX | `Contract individual munca 2026.docx` | employee |
| 9 | `decizii-angajator` | Pachet Decizii Organizare SSM Angajator | DOCX | `DECIZII.docx` | client |
| 10 | `hr-declaratie-regulament` | Declarație luare la cunoștință RI | DOCX | `Declaratie luare cunostinta RI.docx` | employee |
| 11 | `hr-declaratie-raspundere` | Declarație pe proprie răspundere CIM | DOCX | `Declaratie pe proprie raspundere CIM.docx` | employee |
| 12 | `training-detaliu-introductiv`| Detaliu tematică instruire introductiv-gen.| DOCX | `Detaliu Tematica introductiv generala.docx`| client |
| 13 | `training-detaliu-loc-munca` | Detaliu tematică instruire loc de muncă | DOCX | `Detaliu Tematica loc de munca.docx` | client |
| 14 | `risk-evaluare` | Evaluarea Riscurilor Profesionale | DOCX | `EVALUAREA RISCURILOR.docx` | client |
| 15 | `hr-info-dosar` | Checklist acte dosar de personal | DOCX | `INFO dosar personal.docx` | client |
| 16 | `hr-gdpr-informare` | Informare protecția datelor personale | DOCX | `Informare Protectia Datelor.docx` | employee |
| 17 | `ipssm-universale` | IPSSM 01-10 Generale / Universale | DOCX | `IP 01-10 UNIVERSALE.docx` | client |
| 18 | `ipssm-opis` | OPIS Instrucțiuni Proprii SSM | DOCX | `OPIS IPSSM.docx` | client |
| 19 | `risk-plan-actiune-urgenta` | Plan acțiune pericol grav și iminent | DOCX | `Plan actiune pericol grav si iminent.docx` | client |
| 20 | `risk-plan-prevenire-tesa` | Plan de Prevenire și Protecție TESA | DOCX | `Plan de Prevenire TESA.docx` | client |
| 21 | `hygiene-tabel-cursanti` | Tabel Cursanți Igienă (Exemplu) | XLSX | `Tabel Cursanti exemplu.xlsx` | hygiene_session |
| 22 | `training-tematica-introductiv`| Tematică instruire introductiv-generală 4h| DOCX | `Tematica introductiv generala 4h.docx` | client |
| 23 | `training-tematica-loc-munca` | Tematică instruire la locul de muncă | DOCX | `Tematica loc de munca.docx` | job |
| 24 | `ipssm-tesa` | Ghid de instruire și evaluare TESA | DOCX | `TESA.docx` | client |
| 25 | `risk-zone-pericol` | Zone cu risc ridicat și specific | DOCX | `Zone pericol grav si iminent.docx` | client |

*Notă*: În folder există și 3 fișiere PDF (`Cerere angajare.pdf`, `Declaratie luare cunostinta RI.pdf`, `Declaratie pe proprie raspundere CIM.pdf`), însă șabloanele oficiale active sunt configurate în format DOCX și XLSX, respectând cerința R1 din `ORIGINAL_REQUEST.md` (toate cele 25 în formate DOCX și XLSX).

### 5.2. Discrepanța Tehnică Critică la Autocompletare (Cerința R1)
Când s-a rulat `scripts/test-all-templates-generation.ts`, rezultatul a arătat:
- **9 șabloane au ieșit `approved_for_print`** (complet populate).
- **16 șabloane au ieșit `missing_data`** (au rămas cu token-uri nepopulate vizibile în document):
  1. `ipssm-alunecari`: lipsește `PLACEHOLDER_SPECIALIST_SSM`
  2. `ipssm-autovehicule`: lipsește `PLACEHOLDER_SPECIALIST_SSM`
  3. `ipssm-birou`: lipsește `PLACEHOLDER_SPECIALIST_SSM`
  4. `hygiene-anexe-catalog`: lipsesc date prestator (adresă, avize, comisie)
  5. `hr-cim-2026`: lipsesc clauze contractuale (salariu brut, program lucru, zile concediu etc.)
  6. `decizii-angajator`: lipsesc numere decizii 01–11, persoane responsabile prim ajutor/PSI
  7. `hr-declaratie-raspundere`: lipsesc date persoane în întreținere (persoane fictive / declarație nulă)
  8. `training-detaliu-introductiv`: lipsește `PLACEHOLDER_SPECIALIST_SSM`
  9. `risk-evaluare`: lipsesc date prestator, evaluator, CAEN, an înființare
  10. `ipssm-universale`: lipsește `PLACEHOLDER_SPECIALIST_SSM`
  11. `ipssm-opis`: lipsesc telefon/email prestator
  12. `risk-plan-prevenire-tesa`: lipsește `PLACEHOLDER_SPECIALIST_SSM`
  13. `training-tematica-introductiv`: lipsesc telefon/email prestator
  14. `training-tematica-loc-munca`: lipsesc telefon/email prestator
  15. `ipssm-tesa`: lipsesc clasele de gravitate/frecvență și graficele
  16. `risk-zone-pericol`: lipsesc denumirile zonelor 01-06 și măsurile

**Cauza identificată în cod**:
În `src/lib/templates/definitions.ts`, câmpurile menționate sunt marcate cu `source: 'manual'`, iar în `src/lib/templates/resolver.ts` (L325-339), dacă un câmp este `manual` și nu se regăsește în `customOverrides`, el devine șir vid `""`, determinând validatorul din `generator.ts` (L488-495) să marcheze documentul ca `missing_data` și să lase token-ul `{PLACEHOLDER_*}` neatins.

Cerința R1 stipulează clar autonomia echipei de a inspecta modele legale și de a refactoriza logica de mapping astfel încât **toate cele 25 de șabloane să se genereze fără placeholdere necompletate sau fișiere malformate**.

---

## 6. Interfața Utilizator (`src/app`)

Paginile existente în App Router:
- `/` (`page.tsx`): Dashboard cu contorizări agregate (clienți, angajați, șabloane, documente), listă documente recente și importuri recente. Nu afișează nicio alertă de expirare sau scadență.
- `/clients` (`clients/page.tsx`): Tabel cu toți clienții înregistrați.
- `/clients/[id]` (`clients/[id]/page.tsx`): Vizualizare dosar client cu puncte de lucru, posturi, angajați și arhivă documente.
- `/employees` (`employees/page.tsx`): Tabel centralizat cu toți salariații activi și plecați, cu mascare GDPR pentru CNP (`18504********`).
- `/documents` (`documents/page.tsx`): Arhiva documentelor emise, cu status (`Aprobat Tipărire` / `Draft / Lipsuri`) și buton de descărcare.
- `/documents/generate` (`documents/generate/page.tsx`): Formular interactiv cu selecție firmă, șablon, salariat/sesiune și câmpuri de override.
- `/imports/new` (`imports/new/page.tsx`): Formular drag-and-drop pentru `Model_date_client_SSM.xlsx`, cu preview diferențe înainte de salvare.
- `/templates` (`templates/page.tsx`): Catalogul vizual al celor 25 de șabloane grupate pe familii (IPSSM, HR, Decizii, Risc, Training, Igienă).
- `/trainings` (`trainings/page.tsx`): Evidența sesiunilor de instruire consemnate conform HG 1425/2006.
- `/hygiene` (`hygiene/page.tsx`): Evidența sesiunilor de cursuri de igienă și a cursanților înscriși.
- `/risk-assessments` (`risk-assessments/page.tsx`): Evidența evaluărilor de riscuri profesionale.

### Analiza Respectării Cerinței R3 (Simplitate & Fără Roluri / Semnături)
- **Zero roluri de utilizator**: Nu există tabele de utilizatori, permisiuni complexe sau loginuri fragmentate. Operatorul este pur și simplu „Operator Intern”.
- **Zero semnături electronice**: Toate formularele generează documente pregătite pentru tipărire pe hârtie și semnare olografă, permițând ulterior atașarea scanului semnat.
- Cerința R3 este respectată 100%.

### Analiza Deficiențelor pe Cerința R2 (UI Badges & Alerts)
- În `/employees/page.tsx` există doar coloanele: Salariat, Firmă, CNP, Funcție, Punct de lucru, Data angajării, Status (ACTIV/PLECAT), Documente.
- **Lipsesc cu desăvârșire**:
  - Insigne de stare colorate pentru Medicina Muncii (Verde: Valabil > 30z, Galben: Scadent în 30z, Roșu: Expirat / Depășit).
  - Insigne de stare pentru Instruire Periodică SSM.
  - Insigne de stare pentru Instruire Periodică PSI/SU.
  - Insigne de stare pentru Certificat Igienă (3 ani).
  - Panou de alertă rapidă la nivel de Dashboard / Header (ex: „X salariați cu medicina muncii expirată”).

---

## 7. Suita de Teste și Verificare (`scripts/`)

Fișiere existente în `scripts/`:
1. `scripts/verify-offline-catalog.ts`: Verifică offline existența pe disc și validitatea structurală a celor 25 de șabloane. Rulează cu succes (25/25 fișiere prezente).
2. `scripts/test-all-templates-generation.ts`: Rulează un test de generare pentru toate cele 25 de șabloane pe datele clientului real din DB (`RO38765432`). Se finalizează cu succes tehnic, dar raportează 16 documente cu `missing_data`.
3. `scripts/test-all-25-templates.ts`: Creează date sintetice și testează generarea, însă conține instrucțiunea distructivă `TRUNCATE TABLE ... CASCADE;` la final, care șterge toate datele din baza de date locală dacă este rulat!
4. `scripts/test-e2e.ts`: Testează fluxul de import Excel sintetic, reconciliere și generare.
5. `scripts/create-test-excel.ts` și `scripts/test-export-import-roundtrip.ts`: Teste utilitare pentru registrul Excel.

### Goluri pentru Cerința R4 (Automated Verification Suite)
- Nu există un test de verificare automată care să valideze că **toate cele 25 de șabloane generează 0 placeholdere nepopulate** pe date realiste.
- Nu există un test de verificare automată a **corectitudinii calculului scadențelor legale** (HG 355/2007: 12 luni, HG 1425/2006: interval periodic SSM, Metodologie 2022: 3 ani curs igienă).

---

## 8. Plan Tehnic Recomandat pentru Implementare

Pentru atingerea completă a criteriilor de acceptare (R1, R2, R3, R4), recomandăm următoarea strategie arhitecturală:

### Pasul 1: Extinderea Schemei Prisma pentru Cerința R2 (Scadențe)
Extinderea modelului `Employee` cu câmpuri pentru sănătate și instruire periodică:
```prisma
// În model Employee:
medicalExamDate       DateTime?   // Data ultimei examinări de medicina muncii
medicalFitness        String?     @default("APT") // APT, APT_CONDITIONAT, INAPT_TEMPORAR, INAPT
medicalDoctor         String?     // Nume medic medicina muncii
medicalClinic         String?     // Clinica / Cabinetul medical

lastSsmTrainingDate   DateTime?   // Data ultimei instruiri periodice SSM
ssmIntervalMonths     Int?        @default(6) // Interval periodic SSM (luni, ex: 6 pentru TESA, 1-3 pentru producție)

lastPsiTrainingDate   DateTime?   // Data ultimei instruiri periodice PSI/SU
psiIntervalMonths     Int?        @default(6) // Interval periodic PSI/SU (luni, ex: 6)

hygieneCertificateDate DateTime?  // Data absolvirii cursului de igienă (scadență fixă 36 luni / 3 ani)
hygieneCertificateNumber String?  // Serie și număr certificat igienă
```
*Notă*: Se va rula `npx prisma db push` și `npx prisma generate`.

### Pasul 2: Modul Unificat de Calcul Scadențe (`src/lib/compliance.ts`)
Crearea unui utilitar centralizat care:
- Calculează datele de expirare pe baza legislației:
  - Medicină a muncii: `medicalExamDate + 12 luni`
  - Instruire SSM: `lastSsmTrainingDate + ssmIntervalMonths`
  - Instruire PSI: `lastPsiTrainingDate + psiIntervalMonths`
  - Curs igienă: `hygieneCertificateDate + 36 luni`
- Calculează statusul conformității:
  - `OVERDUE` (Roșu): Data expirării < Astăzi
  - `UPCOMING` (Galben): Data expirării este în următoarele 30 de zile
  - `VALID` (Verde): Data expirării > 30 de zile în viitor
  - `MISSING` (Gri): Nu există consemnare înregistrată
- Oferă funcții helper pentru backend și frontend.

### Pasul 3: Autocompletarea Totală a Celor 25 de Șabloane (Cerința R1)
Refactorizarea `src/lib/templates/resolver.ts` și furnizarea unui profil complet de prestator SSM & evaluator de risc realist pentru generare:
- Date prestator SSM prestabilite (Furnizor autorizat, CUI, aviz Ministerul Sănătății, aviz Ministerul Educației, specialist SSM desemnat, telefon, email).
- Valori prestabilite conforme pentru deciziile angajatorului (numere decizii 01-11, comisie, responsabili numiți).
- Valori de referință INCDPM pentru evaluarea riscurilor TESA și zone de risc (gravitate, frecvență, nivel parțial, nivel global 2.45 - risc mic/mediu acceptabil, măsuri tehnico-organizatorice).
- Clauze contractuale uzuale pentru CIM și declarații HR.
- Astfel, toate cele 25 de șabloane se vor genera cu `status: 'approved_for_print'` și **0 placeholdere necompletate**.

### Pasul 4: Îmbunătățirea UI-ului cu Insigne și Alerte (Cerința R2)
- Adăugarea coloanelor de scadență și a insignelor de status în `/employees` și `/clients/[id]`.
- Adăugarea unui card de sinteză a conformității pe Dashboard (`/`), evidențiind numărul de angajați conformi, scadențele apropiate și cele depășite.
- Asigurarea unui formular simplu de actualizare a datelor medicale și de instruire pentru salariați.

### Pasul 5: Suită de Teste Automate (Cerința R4)
- Crearea scriptului `scripts/verify-all.ts` care verifică:
  1. `verifyOfflineCatalog()`: integritatea celor 25 de fișiere de șablon.
  2. `verifyDocumentAutoCompletion()`: generarea completă a tuturor celor 25 de șabloane cu date realiste și confirmarea că **niciun token `{PLACEHOLDER_*}` nu a rămas neînlocuit**.
  3. `verifyComplianceDeadlines()`: teste unitare pe logica de calcul a intervalelor legale (HG 355/2007, HG 1425/2006, Metodologia 2022).
  4. Rularea și trecerea curată a `npm run build`.
