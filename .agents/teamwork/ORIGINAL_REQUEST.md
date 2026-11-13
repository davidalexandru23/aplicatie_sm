# Original User Request

## Parameters
[skip-interview]
How this run was launched; not part of the task.

## Initial Request — 2026-11-04T20:44:28Z
Începeți execuția imediat. Toate detaliile tehnice, cele 5 componente (Pilonii 1-5), cerințele pentru fiecare șablon și funcție sunt deja stabilite și aprobate în planul strategic. Continuați direct cu implementarea secvențială, rularea testelor și verificarea build-ului.

Context relevant din conversația anterioară (Planul Strategic și Raportul de Audit):
---
Planul strategic din artefactul `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md` structurat pe cei 5 piloni:

### Pilonul 1: Rectificarea Textuală a Șabloanelor Existente (Prioritate Maximă)
1. `EVALUAREA RISCURILOR.docx`: Înlocuirea `{PLACEHOLDER_ADRESA_FIRMA}` din antet cu `{PLACEHOLDER_NR_REG_COM}`; eliminarea localității statice „București”; reintegrarea tabelului factorilor de risc (Cap. 6 și 7).
2. `13 - ACTIVITATI DE BIROU.docx`: Înlocuirea sintagmei „agenților de pază” cu „personalului de birou”; adăugarea `{PLACEHOLDER_FIRMA}` în antet.
3. `11 - ALUNECARI.docx`: Adăugarea `{PLACEHOLDER_FIRMA}` în antet.
4. `Detaliu Tematica loc de munca.docx`: Ștergerea imaginii externe TinyPic cu reclama comercială din subsol; adăugarea `{PLACEHOLDER_FUNCTIE}`.
5. `DECIZII.docx`: Introducerea tokenului `{PLACEHOLDER_NUMAR_DECIZIE_10}` și a tokenurilor de apelativ `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` și `{PLACEHOLDER_APELATIV_PSI}` (`Dl.` / `Dna.` dinamic după sex/prenume).
6. `Anexa fisa postului SSM.docx`: Adăugarea `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}` și număr CIM.
7. `Informare Protectia Datelor.docx`: Trecerea la Art. 6(1)(b)/(c) GDPR; eliminarea punctelor de suspensie reziduale.
8. `Tabel Cursanti exemplu.xlsx`: Eliminarea foii de calcul contabile reziduale `Sheet1` (Registru de Casă).
9. `Adeverinta participare.docx`: Corectarea stutter-ului `Nr. Aviz MS nr.` și adaptarea nivelului în funcție de funcție (Nivelul 1 pentru execuție, Nivelul 2 pentru conducere).

### Pilonul 2: Adăugarea a 6 Șabloane Noi Esențiale în Catalog (Extindere de la 25 la 31)
1. `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006).
2. `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - Anexa OMAI 712/2005).
3. `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007).
4. `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007).
5. `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006).
6. `hr-cim-model-cadru-2022` (Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022).

### Pilonul 3: Reconfigurarea Resolverului & Conectarea Datelor Reale
1. Oprirea generării cu date fictive (salariu fictiv 6500 lei etc.).
2. Prioritizarea specialistului implicit (`isDefault: true`) din baza de date (`SsmProvider` și `SsmSpecialist`) dacă clientul nu are alocat explicit unul.
3. Conectarea contextului din post (`Job`): `mainActivities`, `equipmentUsed`, `workConditions`, `corCode` injectate în tematici și fișa postului.
4. Corelarea dinamică a măsurilor din Planul de Prevenire cu profilul de risc CAEN al postului.

### Pilonul 4: Generare în Lot pe Fluxuri Operaționale (Bulk Workflows)
- Pachet Onboarding Salariat (1-Click ZIP)
- Pachet Înființare Dosar SSM Client (Start-up Dossier)
- Export Arhivă Control ITM / ISU (ZIP)

### Pilonul 5: Rafinarea Interfeței (UI/UX) și Serviciul de Alerte
- Selector de Funcție / Post (`jobId`) în `/documents/generate`
- Configurator vizual de evaluare a riscurilor în `/risk-assessments`
- Sincronizare seed și verificare automată a suitei de teste (`npm run build`, `npm test`).


## Follow-up — 2026-11-05T17:14:25Z

Inca sunt erori si fluxuri fara sens. Vreau sa testezi tu (fara scripturi) toate functiile de generare, evidenta, si completare a documentelor si angajatilor din punct de vedere business logic, UI, generare document. Apoi sa scrii un plan de remediere, regandire a solutiei.

Context from the current conversation:
- This is a Romanian SSM (Securitate și Sănătate în Muncă), Hygiene, and HR externalized application built with Next.js 16, Prisma ORM 6, PostgreSQL, and docxtemplater.
- The app has 31 statutory DOCX/XLSX templates for generating legal documents.
- The dev server is running on localhost:3000.
- The database was just reset and re-seeded with test data (2 clients: NEXUS SOLUTIONS S.R.L. and BISTRO GOURMET S.R.L., 6 employees, 6 jobs, 3 worksites, 3 hygiene sessions, SSM provider, etc.).
- The user attached a screenshot showing an error on the document generation page: "Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx" when trying to generate a hygiene document for BISTRO GOURMET S.R.L.
- The screenshot also shows a "Funcție / Post de Lucru" dropdown appearing for hygiene templates where it shouldn't be relevant.
- Recent changes made the Job selector auto-bind from employee profile for employee-level documents, but the Job dropdown still shows for non-employee templates (including hygiene ones where it makes no sense).

Key files:
- src/app/documents/generate/page.tsx - Document generation UI
- src/lib/templates/definitions.ts - Template catalog definitions
- src/lib/templates/resolver.ts - Template placeholder resolver
- src/lib/templates/generator.ts - Document generator
- src/app/api/documents/generate/route.ts - Generation API
- src/app/api/templates/[code]/fields/route.ts - Template fields API
- src/app/clients/[id]/page.tsx - Client detail page
- src/app/employees/page.tsx - Employees list
- src/app/trainings/page.tsx - Trainings
- prisma/schema.prisma - Database schema
- prisma/seed.ts - Seed data

The user wants a MANUAL test (not scripts) of every function — generation flows, employee/client management, document completeness, business logic correctness — and then a remediation plan.

## Follow-up — 2026-11-05T17:40:23Z

Incepeti implementarea planului strategic de remediere si regandire a solutiei (SSM / Igiena / HR).

Context & Approved Plan:
The master plan is written and approved at: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_orchestrator_3/PLAN_REMEDIERE_SI_REGANDIRE.md`

Summary of Phases to Implement:
- Faza 1: Quick Fixes Imediate
  1. Fix XLSX crash in `src/lib/templates/generator.ts:419`: replace `XLSX.readFile(templateFilePath)` with `const fileBuffer = fs.readFileSync(templateFilePath); const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });`.
  2. Fix UI predicate in `src/app/documents/generate/page.tsx:470`: ensure Job dropdown NEVER displays on hygiene templates (`!isHygieneTemplate`) or general client templates without a job context. Reset `selectedJobId = ''` when switching to hygiene.

- Faza 2: Extindere Schema Prisma & Seed Realist
  1. Update `prisma/schema.prisma`:
     - On `Employee`: add `cimNumber`, `cimDate`, `grossSalary`, `workNorm`, `probationDays`, `annualLeaveDays`, `bankIban`, `bankName`, `bloodType`, `rhFactor`, `qualification`, `commuteRoute`, `commuteDurationMinutes`, `shoeSize`, `clothingSize`, `gloveSize`.
     - On `Job`: add `isFoodHandling` (Boolean @default(false)), `isScreenWork` (Boolean @default(false)), `isDrivingRequired` (Boolean @default(false)), `workPosture` (String?), `maxWeightKg` (Float?), `noiseExposed` (Boolean @default(false)).
     - Add EIP models: `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`.
  2. Run `npx prisma db push`.
  3. Update `prisma/seed.ts` with complete real statutory data for NEXUS SOLUTIONS (IT) and BISTRO GOURMET (Horeca) without empty/missing fields.

- Faza 3: Rafinare Resolver & Conectare Dinamica
  1. In `src/lib/templates/resolver.ts`:
     - Bind `grossSalary`, `cimNumber`, `cimDate`, `workNorm` to `{PLACEHOLDER_SALARIU_BRUT}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`.
     - Replace static TESA mock in occupational health and EIP: if job is in food sector or CAEN 5610, check Food Sector, Fisa 210, specific exams, Horeca EIP; if screen work or IT CAEN 6201, check Fisa 243.
     - Ensure 31/31 templates resolve cleanly with approved_for_print and zero unmapped tokens.

- Faza 4: Redesign UI & Modale CRUD Operative
  1. Refactor `/documents/generate` to support the 5 dedicated operational modes/tabs (Pachet Onboarding Salariat 1-Click ZIP, Dosar SSM Firma 1-Click ZIP, Evaluare Riscuri & Profilaxie Post, Cursuri Igiena Sesiune, Generator Statutar Individual).
  2. Add Worksite (Punct de Lucru) selector.
  3. Add modal dialogs for CRUD operations:
     - Add/Edit Employee in `/employees`
     - Add Worksite & Add Job in `/clients/[id]`
     - 1-Click Onboarding ZIP button on employee rows
     - 1-Click Hygiene Session ZIP button in `/hygiene`.


## Follow-up — 2026-11-10T21:25:03Z

Remediază toate problemele identificate din aplicația de SSM / Igienă / HR detaliate mai jos (cu excepția modulului "Arhiva Documente", exclus explicit), eliminând complet datele fabricate din generarea documentelor statutare și implementând fluxurile operaționale lipsă exclusiv pe baza datelor reale și valide.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Integrity mode: development

## Verification Resources
- `npm run build` pentru verificarea integrității compilării TypeScript și a rutelor Next.js
- `npx prisma validate` pentru verificarea schemei Prisma
- Suita de teste automată a proiectului și teste unitare/de integrare rulate de echipă pentru noile rute API și modificările aduse în `resolver.ts`

## Requirements

### R1. Eliminare Date Fabricate și Asigurarea Integrității Documentelor
- Elimină complet fallback-urile inventate și valorile mock din `resolver.ts` (reprezentant legal generic "Munteanu Cristian", date firmă "S.C. CLIENT TEST S.R.L."/RO12345678, acte RX/123456, data nașterii fictivă 15.03.1988, grupa 0I(Rh+), mărimi arbitrare 42/L/9, decizii hardcodate 01-11/15.01.2026).
- Corectează semnalarea datelor lipsă: `isAutocompleted` nu trebuie să marcheze valorile fallback ca date preluate automat din DB. Câmpurile fără date reale în DB trebuie semnalate sincer ca lipsă și lăsate editabile pentru operator.
- Elimină setarea automată a flag-ului `approved_for_print` atunci când lipsesc date esențiale (precum `cimNumber`, `grossSalary`).
- Permite completarea tuturor câmpurilor manuale în interfața de generare (eliminând limitarea arbitrară la primele 20 de câmpuri din `generate/page.tsx`).
- Asigură escaparea caracterelor speciale (`&`, `<`, `>`) la înlocuirea tokenurilor în XML la generarea fișierelor DOCX (`generator.ts`) pentru a preveni coruperea documentelor.

### R2. Medicină a Muncii – Înregistrare Examen și Deblocare Flux
- Implementează endpoint API și interfață/modal în UI pentru înregistrarea unei Fișe de Aptitudine noi conform HG 355/2007 (data examen, termen în luni, verdict Apt / Apt condiționat, restricții).
- Permite actualizarea `medicalLastExamDate` și a parametrilor aferenți direct din aplicație, fără a depinde exclusiv de importul Excel inițial.
- Recalculează automat conformitatea și deblochează generarea documentelor când este înregistrat un examen medical valabil.

### R3. Ciclul de Viață al Angajaților – CRUD și Plecări / Demisii
- Implementează endpoint-uri și componente UI pentru:
  a) Adăugarea manuală a unui angajat nou fără fișier Excel;
  b) Editarea completă a datelor salariatului (funcție/post, date CI, adresă, telefon, salariu brut, număr și dată CIM, normă, concediu, IBAN, mărimi EIP);
  c) Încetarea contractului de muncă prin trecerea în `status: "PLECAT"` cu `leaveDate`.
- Exclude automat salariații cu status `PLECAT` din calculul conformității active și din listele de generare curentă sau în lot (batch).

### R4. Sincronizare Modul Instruiri cu Documentele Statutare
- Conectează înregistrarea sesiunilor de instruire (`/trainings`, `POST /api/trainings/record`) cu generarea și descărcarea proceselor-verbale aferente (`ssm-pv-instruire-colectiva`, `psi-pv-instruire`, tematici) și a fișelor individuale de instruire.
- Asigură corelarea tipurilor de evenimente din API (`INTRODUCTIV`, `LOC_MUNCA`, `PERIODIC_SSM`, `PERIODIC_PSI`) cu filtrele din resolver și fișa individuală, folosind data reală a evenimentului (nu `hireDate`).
- Permite planificarea sesiunilor viitoare și adăugarea butonului/scurtăturii de descărcare a documentelor direct din cardurile sesiunilor.
- Elimină blocajul de expirare care împiedică emiterea unei fișe de instruire noi atunci când instruirea precedentă este expirată.

### R5. Gestiunea EIP (HG 1048/2006)
- Activează și integrează în UI și API modelele Prisma `EipItem`, `JobEipRequirement` și `EmployeeEipAssignment`.
- Înlocuiește datele placeholder hardcodate din fișa de acordare EIP (`eip-fisa-acordare-individuala`) cu dotarea specifică postului și echipamentele predate efectiv salariatului conform bazei de date.

### R6. Evaluări de Risc și Plan de Prevenire
- Implementează fluxul complet de creare, salvare și editare al unei evaluări de risc în tabelele `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`.
- Conectează generarea șablonului `risk-evaluare` la dosarul persistat în baza de date, eliminând planul generic din profilul CAEN cu responsabili și termene statice.
- Asigură configurarea flagurilor de risc pe post (`isFoodHandling`, `isScreenWork`, `workPosture`) prin API și interfață.

### R7. Selecția Contextului și Corectitudinea Pachetelor
- Asigură selectarea corectă a postului (`jobId`) și a punctului de lucru în interfața de generare, eliminând fallback-ul resolver-ului pe primul angajat sau primul post al firmei.
- Filtrează tematicile, IPSSM-urile și pachetele de risc pe baza CAEN-ului și riscurilor reale ale activității.
- Implementează tratarea erorilor per salariat la generarea în lot (batch) și logging detaliat în pachetele ZIP.

### R8. Flux Igienă și Import Excel
- Asociază sesiunea de igienă (`HygieneSession`) cu compania corespunzătoare (`clientId`), unifică vocabularul de statusuri și implementează actualizarea participanților (prezență, notă, rezultate, serii/numere certificat).
- Calculează conformitatea de igienă pe baza codului CAEN / cerințelor postului.
- Îmbunătățește importul Excel: re-validare server-side a datelor parsate, persistență raport validare/diff și eliminarea atribuirii automate a datei de angajare ca dată de examen medical/instruire la angajați noi fără dovezi reale.

*(Excludere strictă: Modulul "Arhiva Documente" / încărcarea scanurilor semnate nu face parte din cerințe).*

## Acceptance Criteria

### Verificare Build și Integritate Cod
- [ ] `npm run build` rulează cu succes, fără erori de compilare TypeScript sau erori de build Next.js.
- [ ] `npx prisma validate` confirmă validitatea schemei Prisma.
- [ ] Suitele de teste automate trec fără erori.

### Acuratețea Datelor și a Documentelor
- [ ] Căutarea în cod confirmă eliminarea completă a fallback-urilor mock din `resolver.ts` (reprezentant "Munteanu Cristian", date firmă CLIENT TEST, buletine RX fictive etc.).
- [ ] Documentele generate nu conțin date inventate când baza de date are câmpuri goale; câmpurile lipsă sunt semnalate sincer pentru completare manuală.
- [ ] Niciun document cu date esențiale lipsă nu primește automat statusul `approved_for_print`.
- [ ] Fișierele DOCX generate ce conțin caractere speciale (`&`, `<`, `>`) sunt valide și nu sunt corupte.

### Funcționalități Operaționale
- [ ] Examenul medical periodic (HG 355/2007) poate fi înregistrat prin UI și API, actualizând `medicalLastExamDate` și deblocând statusul salariatului.
- [ ] Angajații pot fi adăugați manual, editați complet și trecuți în status `PLECAT` prin interfață și API.
- [ ] Salariații cu status `PLECAT` sunt excluși din calculul conformității active și din generările de documente curente/batch.
- [ ] Sesiunile de instruire salvate au scurtături/butoane de descărcare pentru PV-uri și fișe individuale, iar datele evenimentului sunt reflectate corect în documente.
- [ ] Modelele EIP sunt funcționale în API și UI, iar fișa de acordare EIP reflectă dotările reale din BD.
- [ ] Evaluările de risc sunt salvate în baza de date și reflectate fidel în documentele generate.
- [ ] Selectorul de post și punct de lucru este funcțional și respectat la generarea documentelor.
- [ ] Sesiunile de igienă sunt asociate cu clientul corect, permit editarea participanților și emiterea certificatelor conform datelor reale.
