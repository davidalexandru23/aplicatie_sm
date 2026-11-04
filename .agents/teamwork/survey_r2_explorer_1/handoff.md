# Raport de Investigație Tehnică & Arhitectură SSM: Fluxuri Operaționale (R1) și Generare Contextuală Documente (R2)

**Agent**: `survey_r2_explorer_1`  
**Director de lucru**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r2_explorer_1/`  
**Data**: 2026-11-02T22:05:00Z  

---

## 1. Observații Directe (Observation)

### 1.1. Structura Rutelor și Paginilor UI din `src/app/`
În urma parcurgerii arborelui `src/app/`, au fost identificate următoarele pagini și rute:

1. **Panou Executiv (`/`, `src/app/page.tsx`)**:
   - Afișează KPI-uri globale (`clientCount`, `employeeCount`, `documentCount`, `templateCount`).
   - Calculează metrici globale de conformitate utilizând `calculateCompanyMetrics(allActiveEmployees)`.
   - Conține `ComplianceAlerts` pentru alerte plate: `OVERDUE` (roșu), `UPCOMING` (chihlimbar), `MISSING` (roz) împărțite pe cele 4 domenii (Medicină Muncii, SSM, PSI, Igienă).
   - Afișează portofoliul clienților ordonat după scorul de conformitate.

2. **Registrul Clienților (`/clients`, `src/app/clients/page.tsx`)**:
   - Listează firmele cliente cu contoare: angajați, posturi, puncte de lucru, documente.
   - Acțiuni prezente: "Deschide Dosar" (`/clients/[id]`), "Export Excel" (`/api/clients/[id]/export`), "Import" (`/imports/new?clientId=...`).
   - **Observație critică**: În interfață **NU există buton sau formular de adăugare manuală a unui client nou** (există doar butonul de "Import Nou din Excel").

3. **Dosar Client (`/clients/[id]`, `src/app/clients/[id]/page.tsx`)**:
   - Afișează metadatele firmei: `name`, `cui`, `regCom`, `address`, `legalRepresentative`, `contactPerson`, `contactPhone`.
   - Conține gauge-ul de conformitate al firmei (`ComplianceScoreBadge`) și pastilele de distribuție (`ComplianceBreakdownPills`).
   - Include tabelul salariaților activi cu badge-uri inline pentru: Medicină a Muncii, Instruire SSM, Instruire PSI, Curs Igienă.
   - Secțiuni pentru Puncte de Lucru (`client.worksites`), Posturi (`client.jobs`) și Arhiva de Documente emise (`client.generatedDocuments`).
   - **Observație critică**: Nu există nicio vizibilitate sau configurare pentru Codul CAEN al firmei, deciziile organizatorice (01-09) sau planificarea instruirilor periodice SSM/PSI.

4. **Registrul Salariaților (`/employees`, `src/app/employees/page.tsx` & `employee-registry-client.tsx`)**:
   - Tabel unificat cu filtrare pe companie, căutare text și taburi de stare: `ALL`, `VALID`, `UPCOMING`, `OVERDUE`, `MISSING`.
   - Afișează salariatul, CNP mascat conform GDPR (`maskCNP`), postul, punct de lucru și badge-urile colorate cu zile rămase până la scadență.
   - Butoane rapide de generare: "Cerere" (`hr-cerere-angajare`), "Declarație RI" (`hr-declaratie-regulament`), "CIM" (`hr-cim-2026`).

5. **Evaluări de Risc (`/risk-assessments`, `src/app/risk-assessments/page.tsx`)**:
   - Afișează lista evaluărilor din baza de date (`prisma.riskAssessment.findMany()`).
   - **Observație critică**: Este doar o listă de vizualizare (read-only). Nu există niciun formular sau buton pentru crearea unei evaluări noi de risc, asocierea pe post/punct de lucru sau configurarea factorilor de risc.

6. **Instruiri SSM & IPSSM (`/trainings`, `src/app/trainings/page.tsx`)**:
   - Listează sesiunile de instruire din baza de date (`prisma.trainingEvent.findMany()`).
   - **Observație critică**: Pagină strict de afișare. Nu există mecanism UI de planificare a unei sesiuni de instruire, de selecție a participanților dintr-o firmă sau de consemnare a efectuării instruirii pentru actualizarea automată a scadențelor salariaților.

7. **Cursuri de Igienă (`/hygiene`, `src/app/hygiene/page.tsx`)**:
   - Listează sesiunile de igienă (`prisma.hygieneSession.findMany()`).
   - Nu conține formular de creare sesiune nouă (sesiunile se populează momentan doar via seed/API).

8. **Generator Documente (`/documents/generate`, `src/app/documents/generate/page.tsx`)**:
   - Permite selectarea clientului, șablonului, angajatului/cursantului și inspectarea câmpurilor autocompletate prin apel la `/api/templates/[code]/fields`.
   - Apelează `POST /api/documents/generate` pentru producerea fișierului DOCX/XLSX/PDF și oferă link de descărcare.

9. **Import Registru Excel (`/imports/new`, `src/app/imports/new/page.tsx`)**:
   - Upload fișier `.xlsx`, preview diferențe (`/api/imports/preview`) și confirmare salvare (`/api/imports/commit`).

---

### 1.2. Modelele din `prisma/schema.prisma`
Structura curentă a bazei de date evidențiază următoarele detalii exacte:

- **Modelul `Client`** (linii 14–37):
  ```prisma
  model Client {
    id                  String   @id @default(uuid())
    name                String   // Denumire firmă
    cui                 String   @unique // CUI / CIF
    regCom              String?  // Nr. Registrul Comerțului
    address             String   // Sediu social complet
    legalRepresentative String?  // Reprezentant legal
    contactPerson       String?  // Persoană de contact
    contactEmail        String?  // Email contact
    contactPhone        String?  // Telefon contact
    isActive            Boolean  @default(true)
    createdAt           DateTime @default(now())
    updatedAt           DateTime @updatedAt
  ...
  ```
  **Descoperire majoră**: Câmpurile pentru profilul de activitate **LIPSESC COMPLET din modelul `Client`**:
  - Nu există `caenCode` (Cod CAEN, ex: "6201", "5610", "4120").
  - Nu există `caenActivity` (Descriere activitate CAEN, ex: "Activități de realizare a software-ului la comandă").
  - Nu există `anInfiintare` (Anul înființării firmei, necesar în fișa de evaluare a riscurilor).
  - Nu există setări pentru prestatorul de servicii SSM sau deciziile organizatorice.

- **Modelul `Employee`** (linii 82–157):
  - Conține date de identificare, post (`currentJobId`), punct de lucru (`currentWorksiteId`), status (`ACTIV`/`PLECAT`).
  - Extensiile de conformitate (Milestone 1):
    - Medicină: `medicalLastExamDate`, `medicalIntervalMonths` (def 12), `medicalFitnessVerdict`, `medicalNotes`.
    - SSM: `ssmLastTrainingDate`, `ssmIntervalMonths` (def 6), `ssmNotes`.
    - PSI: `psiLastTrainingDate`, `psiIntervalMonths` (def 6), `psiNotes`.
    - Igienă: `hygieneLastExamDate`, `hygieneCertificateNumber`, `hygieneCertificateIssueDate`, `hygieneIntervalMonths` (def 36), `hygieneNotes`.

- **Modelele `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`** (linii 207–276):
  - Structură completă conform metodei INCDPM: severitate (1-7), probabilitate (1-6), nivel risc (1-7), măsuri tehnice/organizatorice/igienico-sanitare.
  - **Dar**: Niciun `RiskAssessment` nu este legat de un Cod CAEN, iar în `resolver.ts` generarea documentelor de risc ignoră înregistrările din DB și folosește un set hardcodat de constante (`TESA_DEFAULT_FACTORS` și `ROMANIAN_LEGAL_RISK`).

- **Modelele `TrainingMaterial`, `TrainingEvent`, `TrainingParticipant`** (linii 282–328):
  - Modelele există pentru tipuri de instruire, durată, tematică, instructor și participanți.
  - **Dar**: Nu există nicio legătură automată între finalizarea unui `TrainingEvent` și actualizarea câmpurilor `ssmLastTrainingDate` / `psiLastTrainingDate` din `Employee`.

---

### 1.3. Mecanismul de Rezolvare Date și Fallback-uri (`src/lib/templates/resolver.ts`)
Inspectarea `resolver.ts` (linii 40–110, 245–274, 463–485, 640–650) arată următoarea ierarhie:

1. `ALL_ROMANIAN_LEGAL_FALLBACKS` grupează profile statice:
   - `ROMANIAN_LEGAL_SSM_PROVIDER`: Furnizor fix `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.`, RO34567890, specialist `Ing. Mihai Popescu`.
   - `ROMANIAN_LEGAL_DECIZII`: Deciziile 01-09 & 11 cu numere fixe `01/15.01.2026` ... `11/15.01.2026`.
   - `ROMANIAN_LEGAL_RISK`: Hardcodează:
     ```typescript
     PLACEHOLDER_COD_CAEN: '6201 - Activități de realizare a software-ului la comandă',
     PLACEHOLDER_ACTIVITATE_PRINCIPALA: 'Consultanță în tehnologia informației, inginerie software și suport IT',
     PLACEHOLDER_AN_INFIINTARE: '2021',
     PLACEHOLDER_AN_EVALUARE: '2026',
     PLACEHOLDER_NIVEL_RISC_GLOBAL: '2.62',
     ```
2. În `resolveTemplateData`:
   - Dacă `templateId` este `risk-evaluare` sau `ipssm-tesa`, valoarea pentru `PLACEHOLDER_COD_CAEN` vine **exclusiv** din `ROMANIAN_LEGAL_RISK`! Modelul `client` nu furnizează niciun Cod CAEN real.
   - Astfel, pentru orice client din alt domeniu (ex. `BISTRO GOURMET S.R.L.`, cod CAEN 5610 Restaurante), documentul generat afirmă că firma se ocupă de software IT (6201)!

---

### 1.4. Importul și Exportul Excel (`importer.ts`, `exporter.ts`, `Test_Client_3_Angajati.xlsx`)
- Fișierul `Test_Client_3_Angajati.xlsx` conține:
  - Foaia `Firmă și angajați`: Metadate firmă (B5:E8: Denumire, CUI, RegCom, Sediu, Reprezentant, Contact, Email, Telefon). Tabel angajați (rândul 12 antete, coloanele A-AH: date personale, act, domiciliu, contact, post, punct, dată angajare, status, curs igienă solicitat).
  - Foaia `Context posturi`: Punct de lucru, Adresă, Activitate la punct, Funcție/post, Cod COR, Activități principale, Echipamente, Condiții de lucru, Nr. lucrători.
- **Lipsuri în Excel Import/Export**:
  1. Nu există celulă pentru Cod CAEN sau An înființare în antetul foii `Firmă și angajați`.
  2. Nu există coloane pentru datele de conformitate ale angajaților: data ultimului examen medical (`medicalLastExamDate`), data instruirii SSM (`ssmLastTrainingDate`), data instruirii PSI (`psiLastTrainingDate`) sau seria certificatului de igienă.
  3. În `importer.ts:commitImport` (linii 580–650), la crearea sau actualizarea unui salariat, câmpurile de scadență nu sunt atinse; toți angajații noi importați din Excel pornesc cu `status: MISSING` la toate cerințele de securitate.

---

## 2. Lanțul Logic al Constatărilor (Logic Chain)

1. **Premisa R1.1 (Client Intake & CAEN Profile)**:
   - Un flux operațional complet pentru o firmă de servicii SSM impune ca la preluarea unui client să fie înregistrat Codul CAEN principal (și eventualele activități secundare pe puncte de lucru).
   - *Fapt demonstrat*: Modelul `Client` din `prisma/schema.prisma` nu are coloanele `caenCode` și `caenActivity`.
   - *Consecință*: Nu există persistență pentru profilul CAEN al clientului, iar `resolver.ts` este forțat să recurgă la codul IT 6201 hardcodat.

2. **Premisa R1.2 & R2 (Evaluare Riscuri Contextuală pe CAEN și Post)**:
   - Evaluarea riscurilor profesionale (Legea 319/2006 art. 12) diferă radical între un inginer software (CAEN 6201, riscuri de birou/ecran), un bucătar/ospătar (CAEN 5610, arsuri, tăieturi, alunecare pe pardoseli umede/grăsimi) și un muncitor în construcții (CAEN 4120, cădere de la înălțime, electrocutare, zgomot).
   - *Fapt demonstrat*: Baza de date conține tabelele `RiskAssessment` și `RiskItem`, dar nu există nicio bibliotecă/catalog de riscuri preconfigurate pe coduri CAEN. Șablonul `risk-evaluare` și `ipssm-tesa` se bazează exclusiv pe grila statică `TESA_DEFAULT_FACTORS` (30 de factori TESA IT).
   - *Consecință*: Documentele generate nu sunt contextuale pentru alte domenii de activitate, încălcând cerința R2 ("eliminate formatting artifacts, empty gaps, and incoherent text across all 25 templates... matching the client's CAEN profile").

3. **Premisa R1.3 (Decizii Organizatorice SSM/SU 01-09)**:
   - La deschiderea contractului SSM, angajatorul trebuie să emită setul de decizii interne (01: Lucrător desemnat SSM / SEPP; 02: Prim ajutor; 03: Responsabil PSI; 04: Periodicitate instruiri; 05: Conducători locuri de muncă; 06: Fumat; 07: Cercetare accidente; 08: Zone risc; 09: Lucru cu foc).
   - *Fapt demonstrat*: În aplicație nu există un model de date pentru Decizii Organizatorice pe client și nici interfață dedicată. În `resolver.ts`, aceste decizii sunt injectate dintr-un profil static `ROMANIAN_LEGAL_DECIZII` cu date fictive.
   - *Consecință*: Emiterea deciziilor nu reflectă structura reală a personalului clientului (ex: salvatorul de prim ajutor sau cadrul tehnic PSI selectat din salariații activi).

4. **Premisa R1.4 & R1.5 (Planificare Tematici & Închiderea Buclei de Scadențe)**:
   - Instruirea periodică SSM și PSI este ciclică (la 6 sau 12 luni conform HG 1425/2006 și OMAI 712/2005). Când se desfășoară o sesiune de instruire, consemnarea acesteia trebuie să actualizeze automat `ssmLastTrainingDate` și `psiLastTrainingDate` pentru participanți.
   - *Fapt demonstrat*: `TrainingEvent` și `Employee` sunt decuplate operațional în interfață. Pagina `/trainings` este doar un viewer fără formulare de planificare sau acțiuni de înregistrare prezență.
   - *Consecință*: Operatorul nu are cum să reseteze scadențele decât modificând direct baza de date, generând un blocaj în fluxul de lucru zilnic.

5. **Premisa R3 (Excel Import/Export Robustețe)**:
   - Clientul trimite registrul Excel. Dacă acesta nu conține coloane de scadență, la import toți salariații devin `MISSING`.
   - *Fapt demonstrat*: `Model_date_client_SSM.xlsx` din `outputs/ssm-client-template/` nu conține coloane pentru examene medicale sau instruiri SSM.
   - *Consecință*: Sistemul depinde de seed-uri sintetice pentru a afișa date de conformitate, iar importul real nu populează scadențele.

---

## 3. Limite și Ipoteze (Caveats)

1. **Regim Read-Only**: Prezenta investigație a fost strict analitică. Nicio modificare de cod sursă nu a fost efectuată în fișierele de producție ale aplicației (în afară de rularea testelor existente și popularea bazei de date cu seed-ul standard).
2. **Baza de Date**: PostgreSQL este activ și migrațiile curente sunt aplicate.
3. **Validitatea Șabloanelor**: Toate cele 25 de șabloane din `handoff/ssm-template-placeholder-pack/templates` sunt structural valide și generează cu zero token-uri `{PLACEHOLDER_*}` neînlocuite (demonstrat de trecerea cu succes a suitei `scripts/verify-all.ts` 124/124 teste). Problema rezidă în *contextualitatea datelor* (hardcodate la IT 6201), nu în motorul de inserție XML/XLSX.
4. **Fără Roluri sau Semnături Electronice**: S-a menținut cu strictețe cerința R3 (fără roluri de utilizator, ierarhii de permisiuni sau semnături electronice calificate; documentele se generează pregătite pentru printare și semnare olografă).

---

## 4. Concluzie și Recomandări Arhitecturale (Conclusion)

Sistemul deține o fundație tehnică robustă:
- Motorul de calcul al scadențelor (`src/lib/compliance.ts`) este complet implementat și respectă cu strictețe legislația română (HG 355/2007, Legea 319/2006, OMAI 712/2005, Ordinul 2209/2022, clamping corect la sfârșit de lună).
- Componentele UI pentru badge-uri și alerte (`compliance-badge.tsx`, `compliance-alerts.tsx`) sunt clare și funcționale.
- Generatorul de documente multi-part (`generator.ts`) rezolvă cu succes toate cele 25 de șabloane fără a lăsa token-uri corupte.

Totuși, **pentru a îndeplini cerințele R1 (Fluxuri Operaționale SSM End-to-End) și R2 (Generare Documente Contextuale)**, sunt necesare următoarele intervenții concrete:

### Recomandare 1: Extinderea Modelului `Client` și Gestiunea Profilului CAEN
1. Modificare în `prisma/schema.prisma` pe modelul `Client`:
   ```prisma
   model Client {
     // ... câmpuri existente
     caenCode            String?  // Ex: "6201", "5610", "4120", "4711"
     caenActivity        String?  // Ex: "Activități de realizare a software-ului la comandă"
     foundedYear         Int?     // Ex: 2021
     ssmProviderName     String?  // Ex: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L."
     ssmSpecialistName   String?  // Ex: "Ing. Mihai Popescu"
     ssmSpecialistCert   String?  // Ex: "Certificat seria EV nr. 10452/2018"
   ```
2. Adăugarea unui catalog standard de coduri CAEN uzuale în `src/lib/caen-catalog.ts` (ex: 6201 - Software, 5610 - Restaurante, 4120 - Construcții, 4711 - Comerț alimentar, 4941 - Transport marfă, 8621 - Asistență medicală, 7022 - Consultanță afaceri).
3. În UI:
   - Adăugare buton "Client Nou" în `/clients` și modal/formular de editare profil în `/clients/[id]`.
   - Câmp de selectare/căutare Cod CAEN cu autocompletarea automată a descrierii activității.

### Recomandare 2: Catalog de Factori de Risc Contextuali pe Coduri CAEN (R1.2 & R2)
1. Crearea unui modul `src/lib/risk/caen-risk-presets.ts`:
   - Pentru **6201 (IT / TESA)**: Factori de videoterminal, sedentarism, efort dorso-lombar, electrocutare birotică, climat psihosocial.
   - Pentru **5610 (Horeca / Restaurante)**: Factori de arsuri termice, suprafețe umede/alunecoase, tăiere cu ustensile/cuțite, agenți chimici de igienizare, manipulare oale fierbinți, ventilație/abur.
   - Pentru **4120 (Construcții)**: Factori de lucru la înălțime, cădere de obiecte, scule electrice, zgomot/vibrații, praf/silicoză, circulație utilaje.
   - Pentru **4711 (Comerț)**: Factori de manipulare manuală greutăți, depozitare rafturi înalte, transpalete, agresiune/tâlhărie.
2. Legarea `RiskAssessment` de client și job în baza de date.
3. Actualizarea `resolver.ts`: Când se generează `risk-evaluare`, `ipssm-tesa` sau `risk-plan-prevenire-tesa`, resolverul va prelua `client.caenCode`, `client.caenActivity`, `client.foundedYear` și factorii asociați profilului CAEN al clientului, eliminând datele false de IT din evaluările altor companii.

### Recomandare 3: Modul Decizii Organizatorice SSM/SU (R1.3)
1. Adăugare model `CompanyAppointments` sau câmpuri de decizii în `Client`:
   ```prisma
   designatedWorkerSsm    String? // Lucrător desemnat / Nume specialist
   firstAidResponder      String? // Responsabil prim ajutor (nume salariat)
   psiResponder           String? // Responsabil PSI (nume salariat)
   investigationMembers   String? // Membri comisie cercetare evenimente
   decisionsDate          DateTime? // Data emiterii deciziilor (implicit data contractului)
   ```
2. În UI `/clients/[id]`: Secțiune dedicată "Decizii Organizatorice SSM (01-09)":
   - Dropdown-uri simple pentru alegerea rapidă a salariaților responsabili (ex: selectează din salariații activi ai firmei pentru Prim Ajutor și PSI).
   - Buton "Generează Pachet Decizii 01-09 (DOCX)" care populează direct `decizii-angajator` cu persoanele desemnate reale.

### Recomandare 4: Planificator de Instruiri și Închiderea Buclei de Scadențe (R1.4 & R1.5)
1. În `/trainings`:
   - Formular/Modal "Planifică / Consemnează Instruire":
     - Selectare client.
     - Tip instruire: Introductiv Generală (4h/8h), La locul de muncă, Periodică SSM, Periodică PSI.
     - Data efectuării și durată.
     - Selecție participanți (checkbox-uri salariați activi).
     - Buton "Salvare & Actualizează Scadențe Salariați".
2. API endpoint `POST /api/trainings/record`:
   - Creează înregistrarea `TrainingEvent` + `TrainingParticipant`.
   - **Efectuează automat `tx.employee.update`** setând `ssmLastTrainingDate: eventDate` sau `psiLastTrainingDate: eventDate`.
   - Imediat, badge-urile din interfață trec din `OVERDUE`/`UPCOMING` în `VALID` (verde), oferind un flux complet funcțional.

### Recomandare 5: Extinderea Importului/Exportului Excel pentru Scadențe și CAEN (R3)
1. În foaia `Firmă și angajați` din `Model_date_client_SSM.xlsx`:
   - Adăugare celulă Cod CAEN (ex. B9) și An înființare (B10).
   - Adăugare coloane opționale pentru datele de conformitate în tabelul de angajați:
     - `Col AJ: Data ultimului examen medical`
     - `Col AK: Verdict aptitudine (APT / APT CONDITIONAT)`
     - `Col AL: Data ultimei instruiri SSM`
     - `Col AM: Data ultimei instruiri PSI`
2. În `src/lib/importer.ts`:
   - Parsarea acestor câmpuri dacă sunt completate în fișier.
   - La `commitImport`, salvarea lor în `Employee.medicalLastExamDate`, `ssmLastTrainingDate`, etc.
   - Astfel, importul din Excel va reflecta fidel dosarul istoric de securitate al firmei.

---

## 5. Metodă de Verificare Independentă (Verification Method)

Oricine dorește să verifice independent aceste concluzii poate rula următoarele comenzi și inspecții:

### 1. Verificarea Integrității Tehnice & a Testelor Existente
Rulați suita unificată de acceptanță:
```bash
npx tsx scripts/verify-all.ts
```
*Rezultat așteptat*: 124/124 teste trecute (25/25 documente generate fără token-uri libere, 45/45 teste matematice de scadențe, 53/53 cazuri E2E, Next.js build fără erori).

### 2. Verificarea Absenței Codului CAEN din Schema Bazei de Date
Inspectați direct schema Prisma:
```bash
grep -n "caen" prisma/schema.prisma
```
*Rezultat*: Niciun rezultat returnat (ieșire goală), confirmând că modelul `Client` nu deține proprietăți pentru Codul CAEN.

### 3. Verificarea Hardcodării Datelor în `resolver.ts`
Căutați instanțele Codului CAEN în codul sursă:
```bash
grep -n "PLACEHOLDER_COD_CAEN" src/lib/templates/resolver.ts
```
*Rezultat*: Linia 248 conține constanta statică `'6201 - Activități de realizare a software-ului la comandă'`, demonstrând decuplarea de la profilul real al clientului.

### 4. Verificarea Rutelor UI Read-Only pentru Risc și Instruire
Inspectați fișierele:
- `src/app/risk-assessments/page.tsx`
- `src/app/trainings/page.tsx`
*Rezultat*: Ambele conțin doar apeluri `prisma.*.findMany()` și structură statică de tabele/carduri, fără formulare de inserție `POST` sau acțiuni de actualizare scadențe.

### 5. Verificarea Structurii Excel Import/Export
Verificați coloanele foii `Firmă și angajați` din `Test_Client_3_Angajati.xlsx`:
```bash
node -e "
const XLSX = require('xlsx');
const wb = XLSX.readFile('Test_Client_3_Angajati.xlsx');
const s = wb.Sheets['Firmă și angajați'];
console.log('Antete rând 12:', XLSX.utils.sheet_to_json(s, { header: 1 })[11]);
"
```
*Rezultat*: Coloanele se opresc la indexul 33 (`Observații administrative`), lipsind coloanele pentru datele de examen medical, instruire SSM și instruire PSI.
