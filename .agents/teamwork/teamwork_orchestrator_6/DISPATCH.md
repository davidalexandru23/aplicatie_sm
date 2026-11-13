## 2026-11-10T21:26:23Z

Remediază toate problemele identificate din aplicația de SSM / Igienă / HR detaliate mai jos (cu excepția modulului "Arhiva Documente", exclus explicit), eliminând complet datele fabricate din generarea documentelor statutare și implementând fluxurile operaționale lipsă exclusiv pe baza datelor reale și valide.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_orchestrator_6/
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
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
