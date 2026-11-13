# Raport de Analiză Tehnică & Conformitate Statutară: Data Model, Seed Completeness și Legislație Românească (SSM, SU, MedMuncii, EIP, CIM, Igienă)

**Data investigației:** 05 Noiembrie 2026  
**Agent Investigator:** `explorer_datamodel_3` (Teamwork Explorer Archetype)  
**Workspace:** `/Users/davidalexandru/Documents/Proiect_SSM`  
**Referință Solicitare:** `.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. Rezumat Executiv

Investigația aprofundată a schemei Prisma (`prisma/schema.prisma`), a datelor de seed (`prisma/seed.ts`), a motorului de rezolvare (`src/lib/templates/resolver.ts`), a generatorului fizic (`src/lib/templates/generator.ts`) și a interfeței UI (`src/app/documents/generate/page.tsx`) a evidențiat **discrepanțe structurale majore** între cerințele statutare din legislația muncii din România și modelul de date actual. Deși sistemul conține 31 de șabloane statutare și un catalog bogat de profile de risc CAEN, documentele generate depind excesiv de valori simulate statice (*hardcoded legal mocks*) deoarece entitățile `Employee`, `Job` și `Client` nu stochează atribute esențiale (număr/dată CIM, salariu brut, mărimi EIP, riscuri ocupaționale specifice, grupă sanguină, traseu de deplasare). Mai mult, baza de date nu conține în seed nicio înregistrare pentru `RiskAssessment`, `RiskItem`, `PreventionMeasure` sau `TrainingEvent`, ceea ce lasă registrele oficiale goale. În plus, au fost identificate și reproduse 2 erori critice active de generare: blocajul la citirea șabloanelor Excel (`Cannot access file ... Tabel Cursanti exemplu.xlsx`) provocat de apelul `XLSX.readFile` în runtime-ul Next.js bundled, și afișarea nejustificată a selectorului de „Funcție / Post de Lucru” la șabloanele de igienă.

---

## 2. Matricea de Conformitate Statutară (Statutory Compliance Matrix)

Tabelul de mai jos sintetizează cerințele imperative din legislația muncii din România, mapate pe modelele Prisma actuale, evidențiind gradul de acoperire și golurile de date (*gap analysis*):

| Domeniu & Act Normativ | Document Obligatoriu | Câmpuri Statutare Obligatorii | Suport Prisma Curent | Analiză Discrepanțe & Consecințe Juridice |
| :--- | :--- | :--- | :---: | :--- |
| **SSM**<br>Legea 319/2006<br>HG 1425/2006 (art. 83-100) | **Fișă Individuală de Instruire SSM**<br>*(Anexa 11 la HG 1425/2006)* | • Date identificare: Nume, prenume, CNP, data/loc naștere, domiciliu, CI.<br>• **Grupa sanguină** & Rh.<br>• **Traseu normal de deplasare** (tur-retur, mijloc transport, durată minute).<br>• **Calificare / Pregătire profesională**.<br>• **Autorizații deținute** (ISCIR, ANRE, auto).<br>• **Marca / Legitimație / Nr. dosar**.<br>• Date instruire IG & LM: data, durata (min. 8h), instructor, tematică, verificator, admitere la lucru.<br>• Registru instruiri periodice multianual (min. 16 rânduri). | **PARȚIAL**<br>*(60%)* | • `Employee` nu stochează: `bloodType`, `qualification`, `badgeNumber`, `commuteRoute`, `commuteDurationMinutes`, `specialAuthorizations`.<br>• În consecință, `resolver.ts` injectează pentru toți salariații aceeași grupă sanguină (`AII / Rh+`), aceeași calificare de birou (`Inginer IT`) și același traseu de deplasare urban (București Aviatorilor), chiar dacă salariatul locuiește în Brașov sau este bucătar.<br>• `seed.ts` nu populează niciun `TrainingEvent`, astfel încât tabelul de instruiri periodice conține 16 rânduri complet goale. |
| **Situații de Urgență (PSI)**<br>Legea 307/2006<br>OMAI 712/2005<br>OMAI 786/2005 | **Fișă Individuală de Instructaj în Domeniul SU**<br>*(Anexă OMAI 712/2005)*<br>**Permis de lucru cu foc**<br>*(OMAI 163/2007)* | • Date identificare salariat, funcție, punct lucru.<br>• Instructaj introductiv general PSI: data, durată, instructor (cadru tehnic PSI), tematică, verificator.<br>• Instructaj la locul de muncă PSI: data, durată, conducător loc de muncă, tematică, admitere la lucru.<br>• Registru instructaje periodice PSI (min. 16 rânduri).<br>• **Evidență exerciții practice de evacuare și intervenție** (tip, temă, calificativ).<br>• Decizii de numire responsabil intervenție/evacuare. | **PARȚIAL**<br>*(55%)* | • `Client` are `psiResponder`, însă nu există o legătură clară între instructorul PSI de la angajare și dosarul salariatului.<br>• Nu există un model în schemă pentru **exerciții practice și aplicații de evacuare** (`EmergencyDrill`), acestea fiind reprezentate exclusiv ca matrice oarbă de 4 rânduri goale.<br>• Permisul de lucru cu foc folosește date statice (`ROMANIAN_LEGAL_DECIZII`), neexistând o entitate `HotWorkPermit`. |
| **Medicina Muncii**<br>HG 355/2007<br>Codul Muncii art. 27 | **Fișa de Solicitare a Examenului Medical**<br>*(Anexa 2 HG 355/2007)* | • Angajator: denumire, CUI, sediu, CAEN.<br>• **Cabinet / Medic de medicina muncii desemnat**.<br>• **Tip examen**: la angajare, periodic, de adaptare, reluarea muncii, supraveghere specială, schimbare post.<br>• Date salariat: nume, prenume, CNP, sex, data/loc naștere, act identitate, adresă.<br>• Funcție (COR), punct lucru, atelier.<br>• **Vechime în muncă**: totală, în profesie, la actualul loc de muncă.<br>• **Traseu profesional anterior și expunere anterioară la noxe**. | **PARȚIAL**<br>*(50%)* | • `Client` nu conține câmpuri pentru clinica de medicina muncii (`occupationalHealthClinic`, `occupationalHealthDoctor`).<br>• `Employee` nu conține istoricul vechimii (`totalSeniorityYears`, `professionSeniorityYears`). În resolver, se injectează static `5 ani total`, `3 ani profesie`.<br>• Nu există selecție dinamică pentru tipul de examen medical (la onboarding se bifează implicit `[X] Periodic` în loc de `[X] La Angajare`). |
| **Medicina Muncii**<br>HG 355/2007<br>Fișele 210, 218, 240, 241, 243 | **Fișa de Identificare a Factorilor de Risc Profesional**<br>*(Anexa 3 HG 355/2007)* | • Descriere operațiuni, utilaje, echipamente.<br>• Regim muncă: navetă, schimburi, noapte, pauze.<br>• **Factori de risc specifici**: risc electrocutare, asfixiere, mecanic, tăiere, arsuri.<br>• **Biomecanică & Ergonomie**: poziție predominantă (așezat / ortostatic), efort fizic, manipulare mase (kg max), **lucru la monitor peste 4h/zi (Fișa 243)**.<br>• **Condiții specifice**: **Sector alimentar (Fișa 210)**, înălțime (Fișa 241), auto (Fișa 218).<br>• Agenți nocivi: zgomot (dB), pulberi, agenți chimici (VLE), microclimat. | **LIPSĂ / CRITIC**<br>*(25%)* | • `Job` conține doar 3 câmpuri text libere (`mainActivities`, `equipmentUsed`, `workConditions`).<br>• Nu există indicatori booleeni sau enum-uri pentru factori de risc pe post (`isScreenWork`, `isFoodHandling`, `isNightShift`, `isDriving`, `workPosture`, `maxWeightKg`).<br>• **Anomalia gravă depistată:** Bucătarul (`Marius Radu`, Bistro Gourmet) primește fișa de riscuri cu `Sector alimentar: Nu` și `Suprasolicitare vizuală la monitor: Da (Fișa 243)`, deoarece resolverul aplică șablonul TESA/Birou pentru toate posturile din sistem! |
| **Echipament Individual de Protecție (EIP)**<br>HG 1048/2006<br>Legea 319/2006 art. 13 lit. r | **Fișă Individuală de Dotare și Acordare EIP**<br>*(Normativ intern conform HG 1048/2006)* | • Date identificare salariat, post, loc de muncă.<br>• **Mărimi individuale**: haine, încălțăminte, mănuși, cască.<br>• **Tabel acordare EIP corelat cu postul**: denumire sortiment, standard EN aplicabil, UM, cantitate, durată normată folosință (luni), data acordării, semnătură primire, data și motivul restituirii.<br>• Angajament de purtare și întreținere. | **LIPSĂ**<br>*(10%)* | • **Schema Prisma NU are niciun model pentru EIP** (lipsește `EipItem`, lipsește relația dintre `Job` și EIP necesar, lipsește atribuirea către salariat).<br>• `Employee` nu stochează mărimi (`shoeSize`, `clothingSize`, `gloveSize`, `helmetSize`).<br>• Resolverul folosește un mock static de 10 sortimente: un programator software primește cască de șantier, mănuși mecanice și bocanci cu bombeu (mărimea 42), iar un bucătar primește ochelari de monitor și vestă reflectorizantă în loc de saboți antiderapanți de bucătărie și mănuși antităiere din zale de inox. |
| **Dreptul Muncii (HR)**<br>Codul Muncii (Legea 53/2003)<br>Ordinul MMSS 2171/2022<br>Legea 283/2022 | **Contract Individual de Muncă (CIM Model-Cadru 2022)**<br>*(Capitolele A - P)*<br>**Anexă la Fișa Postului SSM** | • **Număr și dată înregistrare CIM**.<br>• Tip durată (nedeterminată / determinată), temei legal art. 83.<br>• **Perioadă de probă** (zile și condiții clare cf. Legii 283/2022).<br>• **Locul de muncă** (fix / mobil), mențiune decontare transport.<br>• Funcție & Cod COR din 6 cifre.<br>• **Salariul de bază brut lunar (LEI)**, sporuri, data plății salariului, metodă plată, cont IBAN salariat, bancă.<br>• Durata muncii: normă întreagă (8h/zi, 40h/săpt), program de lucru, repartizare.<br>• Concediu de odihnă anual (zile).<br>• Formare profesională (periodicitate și condiții suportare cheltuieli).<br>• Număr exemplare originale. | **PARȚIAL / DEFICITAR**<br>*(45%)* | • `Employee` nu conține câmpurile esențiale CIM: `cimNumber`, `grossSalary`, `bankIban`, `bankName`, `probationDays`, `workNorm`, `workSchedule`, `salaryPaymentDay`.<br>• `Client` nu conține contul bancar (`bankAccount`, `bankName`).<br>• **Eroare la generare:** La generarea `hr-cim-model-cadru-2022`, documentul iese cu status `missing_data` având 3 câmpuri lipsă (`Salariu de bază lunar brut`, `PLACEHOLDER_NUMAR_CIM`, `PLACEHOLDER_SALARIU_BRUT`), iar `hr-anexa-fisa-post` iese cu status `missing_data` din cauza lipsei `PLACEHOLDER_NUMAR_CIM`. |
| **Igienă Publică**<br>Ordinul comun MS/ME 2209/4469/2022<br>Ordinul 1225/2003 | **Adeverință de participare curs igienă**<br>**Tabel cursanți**<br>*(Tabel Cursanti exemplu.xlsx)*<br>**Catalog & Proces-verbal examen**<br>*(Anexe Curs igiena.xlsx)* | • Date furnizor de formare avizat (denumire, CUI, adresă, reprezentant).<br>• **Număr și dată Aviz Ministerul Sănătății (DSP)**.<br>• **Număr și dată Aviz Ministerul Educației**.<br>• Date sesiune: data cursului, data examenului, locație sală, comisie DSP (președinte medic primar DSP, membri, secretar).<br>• Date cursant: nume, prenume, CNP, serie/număr CI, funcție, angajator.<br>• **Modulul de instruire** (Modulele 1-5).<br>• **Nivelul de instruire**: **Nivelul 1** (execuție) vs **Nivelul 2** (conducere/coordonare).<br>• Rezultat examen (notă, admis/respins), serie și număr adeverință/certificat (valabilitate 3 ani). | **PARȚIAL**<br>*(60%)* | • `HygieneSession` nu are relație cu `SsmProvider` (`providerId` lipsește, are doar `providerName: String`).<br>• `HygieneParticipant` are doar `clientName: String` în loc de relație `clientId` cu `Client`.<br>• `HygieneParticipant` nu stochează `hygieneLevel` (`NIVEL_1` vs `NIVEL_2`).<br>• **Blocaj critic de execuție:** La generarea `hygiene-tabel-cursanti` și `hygiene-anexe-catalog` apare crash cu `Cannot access file ... Tabel Cursanti exemplu.xlsx` din cauza utilizării `XLSX.readFile` în loc de `XLSX.read(fs.readFileSync(...))`.<br>• În UI, selectorul de funcție/post apare la șabloanele de igienă unde nu are sens. |

---

## 3. Analiza Rădăcină a Defecțiunilor Active (Root Cause Analysis)

### 3.1. Eroarea Critică: „Cannot access file ... Tabel Cursanti exemplu.xlsx”
* **Simptom:** La încercarea de a genera documentul `hygiene-tabel-cursanti` (sau `hygiene-anexe-catalog`) pentru `BISTRO GOURMET S.R.L.`, API-ul întoarce `500 Internal Server Error` cu mesajul: `Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx`.
* **Mecanismul intern constatat:**
  În fișierul `src/lib/templates/generator.ts`, la linia 419:
  ```typescript
  } else if (templateFormat === 'xlsx') {
    const wb = XLSX.readFile(templateFilePath);
  ```
  Biblioteca `xlsx` (SheetJS) implementează funcția internă `read_binary(path)`:
  ```javascript
  function read_binary(path) {
    if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
    if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
    ...
    throw new Error("Cannot access file " + path);
  }
  ```
  În mediul de bundling al Next.js 16 (Turbopack / Webpack Server Components), variabila internă `_fs` din modulul `xlsx` este `undefined`. Drept urmare, `XLSX.readFile(path)` eșuează sistematic și aruncă excepția `Cannot access file ...`.
* **Dovada verificării:** La linia 89 a aceluiași fișier (`generator.ts`), funcția `collectUnresolvedPlaceholders` folosea deja corect:
  ```typescript
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  ```
  Când se folosește `fs.readFileSync(templateFilePath)` combinat cu `XLSX.read(buffer, { type: 'buffer' })`, fișierul este citit direct prin API-ul nativ Node.js, ocolind complet eroarea din SheetJS.

---

### 3.2. Selectorul Eronat de Funcție / Post în Pagina de Generare
* **Simptom:** În `/documents/generate`, la selectarea oricărui șablon de igienă (ex. `hygiene-tabel-cursanti`, `hygiene-anexe-catalog`), în interfață apare dropdown-ul `Funcție / Post de Lucru (opțional)`.
* **Mecanismul intern constatat:**
  În `src/app/documents/generate/page.tsx`, la liniile 161-164 și 470:
  ```typescript
  const isEmployeeRequired =
    !isHygieneTemplate &&
    (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
  
  // Linia 470:
  {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
    <div className="pt-2 border-t border-slate-100">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
      </label>
      <select ...>
  ```
  Deoarece pentru șabloanele de igienă `isHygieneTemplate === true`, variabila `isEmployeeRequired` devine `false`. Astfel, condiția `!isEmployeeRequired` este evaluată la `true` pentru toate șabloanele de igienă, provocând randarea nejustificată a selectorului de posturi.

---

### 3.3. Eșecul la Generarea Documentelor de Muncă (CIM & Fișa Postului)
* **Simptom:** Generarea șabloanelor `hr-cim-model-cadru-2022`, `hr-cim-2026` și `hr-anexa-fisa-post` produce documente cu status `missing_data`.
* **Mecanismul intern constatat:**
  1. În `definitions.ts`, câmpurile `PLACEHOLDER_NUMAR_CIM` și `PLACEHOLDER_SALARIU_BRUT` sunt configurate cu `required: true`.
  2. În modelul Prisma `Employee`, aceste atribute **nu există**.
  3. În `resolver.ts`, `PLACEHOLDER_NUMAR_CIM` și `PLACEHOLDER_SALARIU_BRUT` sunt evaluate la `''` dacă salariatul nu are proprietățile respective în baza de date.
  4. Când `validateMissingFields()` scanează dicționarul de date, semnalează lipsa salariului și a numărului de contract, marcând documentul ca incomplet.

---

### 3.4. Inversiunea Grotescă a Profilelor Ocupaționale și EIP
* **Simptom:**
  * Bucătarul specialist `Marius Radu` (Bistro Gourmet - Horeca) primește în fișa de riscuri (`med-fisa-identificare-riscuri`):
    * `Sector alimentar: Nu`
    * `Suprasolicitare vizuală la monitor (Fișa 243): Da (>4h/zi)`
    * `Manipulare mase: Nu (sub 3 kg)`
    * EIP acordat: Cască de protecție de șantier, ochelari de monitor cu protecție la lumină albastră, vestă reflectorizantă, bocanci cu bombeu (mărimea 42).
  * Programatorul software `Alexandru Stan` (Nexus Solutions - IT) primește în fișa de EIP:
    * Cască de șantier, vestă reflectorizantă de mare vizibilitate, bocanci S1P, deși lucrează exclusiv la birou.
* **Mecanismul intern constatat:**
  În `resolver.ts`, profilele de fallback `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH` și `ROMANIAN_LEGAL_EIP` sunt obiecte statice unice create după profilul de birou TESA. Deși în `src/lib/risk/caen-risk-presets.ts` există definit un profil complet pentru CAEN 5610 (`RISK_PROFILE_5610`), acesta a fost conectat numai la evaluarea de riscuri INCDPM, fiind ignorat complet în fișele medicale și fișele EIP!

---

## 4. Planul de Refactorizare a Modelului de Date (Data Model Refactoring Plan)

Pentru a asigura conformitatea deplină cu legislația românească și a elimina generarea de date fictive sau incomplete, se propune extinderea schemei Prisma (`prisma/schema.prisma`):

### 4.1. Extinderi pe Modelele Existente

#### Modelul `Client`
Se adaugă atributele financiare, de contact formal și de medicina muncii:
```prisma
model Client {
  // ... câmpuri existente ...

  // Date Bancare & Sediu Oficial (pentru CIM & Acte Oficiale)
  bankAccount               String?   // Cont IBAN firmă (ex: "RO49AAAA1B31007593840001")
  bankName                  String?   // Denumire bancă firmă (ex: "Banca Transilvania")
  postalCode                String?   // Cod poștal sediu social (ex: "011855")

  // Serviciu de Medicina Muncii Desemnat (HG 355/2007)
  occupationalHealthClinic  String?   // Denumire cabinet / clinică medicina muncii (ex: "Centrul Medical Unirea")
  occupationalHealthDoctor  String?   // Medic primar medicina muncii desemnat (ex: "Dr. Victor Alexandrescu")
  
  // Relații de Muncă Colective
  collectiveLaborContract   String?   // Număr / Mențiune Contract Colectiv de Muncă sau Regulament Intern
}
```

#### Modelul `Job`
Se adaugă atributele de profil ocupațional pentru medicina muncii, ergonomie și EIP:
```prisma
model Job {
  // ... câmpuri existente ...

  hierarchyLevel          String   @default("EXECUTIE") // "EXECUTIE" | "CONDUCERE" (critic pentru Nivelul Igienă 1 vs 2, probă 90 vs 120 zile)
  workPosture             String   @default("ASEZAT")   // "ASEZAT" | "ORTOSTATIC" | "MIXT" | "EFORT_DINAMIC"
  
  // Bife Factori de Risc Profesional (HG 355/2007 - Fișele Medicale 210, 218, 240, 241, 243)
  isScreenWork            Boolean  @default(false)      // Fișa 243: Lucru la monitor / videoterminal > 4 ore/zi
  isFoodHandling          Boolean  @default(false)      // Fișa 210: Sector alimentar, manipulare alimente, bucătărie
  isNightShift            Boolean  @default(false)      // Fișa 240: Muncă de noapte (interval 22:00 - 06:00)
  isHeightWork            Boolean  @default(false)      // Fișa 241: Lucru la înălțime (peste 2 metri)
  isDriving               Boolean  @default(false)      // Fișa 218: Conducători auto / deplasări operative
  isHighRisk              Boolean  @default(false)      // Zonă cu risc ridicat și specific conform Legii 319/2006
  
  maxWeightKg             Int      @default(5)          // Greutate maximă manipulată manual (conform HG 1051/2006)
  
  // Periodicități Standard Recomandate pentru Post
  defaultSsmIntervalMonths Int     @default(6)          // 12 TESA, 6 operativ, 3 risc
  defaultPsiIntervalMonths Int     @default(6)          // 6 birou, 3 operativ/bucătărie
  defaultMedicalIntervalMonths Int @default(12)         // 12 luni standard, 6 luni riscuri speciale

  eipRequirements         JobEipRequirement[]
}
```

#### Modelul `Employee`
Se adaugă atributele contractuale (CIM), mărimile EIP și detaliile de instruire individuală:
```prisma
model Employee {
  // ... câmpuri existente ...

  // 1. Clauze Contractuale Individuale de Muncă (Ordinul MMSS 2171/2022)
  cimNumber                 String?   // Număr contract individual de muncă (ex: "104/2026")
  cimDate                   DateTime? // Data încheierii contractului
  contractType              String    @default("NEDETERMINATA") // "NEDETERMINATA" | "DETERMINATA"
  contractDurationMonths    Int?      // Număr luni dacă este pe durată determinată
  probationDays             Int       @default(90)              // Zile probă: 90 execuție, 120 conducere
  grossSalary               Float?    // Salariu de bază lunar brut în LEI (ex: 5500.0)
  salaryPaymentDay          Int       @default(15)              // Ziua din lună a plății salariului
  salaryPaymentMethod       String    @default("VIRAMENT_BANCAR")// "VIRAMENT_BANCAR" | "NUMERAR"
  bankIban                  String?   // Cont bancar IBAN salariat
  bankName                  String?   // Denumire bancă salariat
  workNorm                  String    @default("NORMA_INTREAGA_8H") // "NORMA_INTREAGA_8H", "PART_TIME_4H", etc.
  workingHoursPerDay        Int       @default(8)
  workingHoursPerWeek       Int       @default(40)
  workSchedule              String?   @default("08:30 - 17:00, Luni - Vineri")
  annualLeaveDays           Int       @default(21)              // Zile concediu anual de odihnă
  mealTickets               Boolean   @default(true)            // Acordare tichete de masă (Legea 165/2018)
  privateHealthInsurance    Boolean   @default(false)           // Servicii medicale private suportate de angajator

  // 2. Date Personale & Traseu SSM (Anexa 11 HG 1425/2006)
  bloodType                 String?   // Grupa sanguină și Rh (ex: "0I / Rh+", "AII / Rh+")
  qualification             String?   // Pregătire profesională / Calificare (ex: "Inginer Software", "Bucătar Specialist")
  badgeNumber               String?   // Marca / Număr legitimație / Nr. dosar personal (ex: "M-042")
  commuteRoute              String?   // Traseu deplasare acasă - serviciu (ex: "București Sector 1 - Metrou - Aviatorilor")
  commuteDurationMinutes    Int?      // Durată deplasare în minute (ex: 30)
  specialAuthorizations     String?   // Autorizații speciale deținute (ISCIR, ANRE, permis conducere cat. B)

  // 3. Mărimi Echipament Individual de Protecție (HG 1048/2006)
  clothingSize              String?   // Mărime costum / halat / haine (ex: "M / 48", "L / 52")
  shoeSize                  String?   // Mărime încălțăminte de protecție (ex: "42", "38")
  gloveSize                 String?   // Mărime mănuși de protecție (ex: "8", "9 (L)", "10 (XL)")
  helmetSize                String?   // Mărime cască protecție (ex: "Reglabilă 54-62 cm")

  // 4. Instruire Igienă Nivel
  hygieneLevel              String    @default("NIVEL_1") // "NIVEL_1" (execuție) | "NIVEL_2" (conducere)

  // Relații EIP
  eipAssignments            EmployeeEipAssignment[]
}
```

#### Modelele `HygieneSession` & `HygieneParticipant`
Îmbunătățirea integrității relaționale:
```prisma
model HygieneSession {
  // ... câmpuri existente ...
  
  providerId          String?
  provider            SsmProvider? @relation(fields: [providerId], references: [id], onDelete: SetNull)
  clientId            String?
  client              Client?      @relation(fields: [clientId], references: [id], onDelete: SetNull)
}

model HygieneParticipant {
  // ... câmpuri existente ...

  clientId            String?
  client              Client?      @relation(fields: [clientId], references: [id], onDelete: SetNull)
  jobId               String?
  job                 Job?         @relation(fields: [jobId], references: [id], onDelete: SetNull)
  hygieneLevel        String       @default("NIVEL_1") // "NIVEL_1" | "NIVEL_2"
}
```

---

### 4.2. Modele Noi Esențiale: Modulul EIP (HG 1048/2006)

Pentru a asigura evidența legală a echipamentelor individuale de protecție prevăzută la art. 13 lit. r din Legea 319/2006, se propun 3 modele relaționale:

```prisma
// Nomenclator Oficial Sortimente EIP
model EipItem {
  id                    String   @id @default(uuid())
  name                  String   // Denumire EIP (ex: "Saboți de protecție bucătărie antiderapanți SRC", "Ochelari monitor")
  standard              String   // Standard aplicabil (ex: "SR EN ISO 20345", "SR EN 166")
  unit                  String   @default("buc.") // "pereche", "buc.", "set"
  defaultDurationMonths Int      @default(12) // Durata normată standard de folosință (luni)
  riskCategory          String   // "MECANIC", "TERMIC", "CHIMIC", "ERGONOMIC", "ELECTRIC", "BIOLOGIC"
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())

  jobRequirements       JobEipRequirement[]
  assignments           EmployeeEipAssignment[]
}

// Normativul Intern de Acordare EIP pe Funcție / Post de Lucru (Normativ cadru HG 1048/2006)
model JobEipRequirement {
  id              String   @id @default(uuid())
  jobId           String
  job             Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  eipItemId       String
  eipItem         EipItem  @relation(fields: [eipItemId], references: [id], onDelete: Cascade)
  quantity        Int      @default(1)
  durationMonths  Int      @default(12)
  isMandatory     Boolean  @default(true)

  @@unique([jobId, eipItemId])
}

// Fisa Individuală de Evidență și Acordare EIP Salariat
model EmployeeEipAssignment {
  id              String    @id @default(uuid())
  employeeId      String
  employee        Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  eipItemId       String
  eipItem         EipItem   @relation(fields: [eipItemId], references: [id], onDelete: Cascade)
  grantedDate     DateTime  // Data acordării în folosință
  quantity        Int       @default(1)
  durationMonths  Int       @default(12)
  expiryDate      DateTime? // Data expirării duratei normate
  returnedDate    DateTime? // Data restituirii la magazie
  returnReason    String?   // "uzura", "deteriorat", "incetare_cim"
  status          String    @default("activ") // "activ", "restituit", "uzat"

  createdAt       DateTime  @default(now())
}
```

---

## 5. Auditul Datelor de Seed (Seed Data Completeness Audit)

### 5.1. Situația Entităților în Seed-ul Actual (`prisma/seed.ts`)
* **Lipsesc complet din seed:**
  1. `RiskAssessment`: **0 înregistrări** în seed pentru ambele companii (pagina `/risk-assessments` afișează `Nu există evaluări de risc create în baza de date`).
  2. `RiskItem`: **0 înregistrări**.
  3. `PreventionMeasure`: **0 înregistrări**.
  4. `TrainingEvent`: **0 înregistrări** în seed (pagina `/trainings` afișează `Nu există sesiuni de instruire înregistrate`).
  5. `TrainingParticipant`: **0 înregistrări**.
  6. `EipItem` & cerințe EIP pe post: **nu există**.

---

### 5.2. Audit Salariați & Date Specifice pe Companii

#### A. NEXUS SOLUTIONS S.R.L. (Profil IT / TESA, CAEN 6201)
* **Ce conține seed-ul actual:**
  * 4 posturi (`Inginer Sisteme Software`, `Specialist HR`, `Tehnician Mentenanță`, `Asistent Administrativ`).
  * 4 salariați cu CNP-uri, adrese, CI și stări de conformitate variate (`OVERDUE`, `UPCOMING`, `VALID`, `MISSING`).
* **Ce lipsește din seed pentru generare fără fallback-uri statice:**
  1. **Salarii și Contracte Muncă:** Salariații nu au `cimNumber` (ex: `101/2026`), `grossSalary` (ex: 9500 lei pentru Dev, 6500 lei pentru HR, 5000 lei pentru Tehnician), conturi IBAN și bănci.
  2. **Profil SSM:** Lipsesc grupa sanguină (ex: `0I / Rh+`), traseul real de deplasare (Gheorghe Barbu are domiciliul în Brașov, dar primește traseul cu metroul din București!).
  3. **Evaluare de Risc pe Post:** Lipsește crearea dosarului de evaluare de risc conform profilului CAEN 6201 (`RISK_PROFILE_6201`) cu cele 30 de riscuri INCDPM și măsurile de prevenire.
  4. **Istoric Sesiuni de Instruire:** Lipsesc evenimentele de instruire introductiv-generală și periodică din `TrainingEvent` pentru a popula registrele de instruire.

#### B. BISTRO GOURMET S.R.L. (Profil HORECA / Bucătărie & Alimentație Publică, CAEN 5610)
* **Ce conține seed-ul actual:**
  * 2 posturi (`Bucătar Specialist`, `Ospătar / Chelner`).
  * 2 salariați (`Marius Radu`, `Andreea Marin`) cu analize de medicina muncii consemnate în text și certificate de igienă.
  * 3 sesiuni de igienă în diverse stări (`certificate_emise`, `in_desfasurare`, `programata`).
* **Ce lipsește din seed pentru conformitate statutară:**
  1. **Indicatori de Factori de Risc pe Post:** Postul de bucătar și ospătar trebuie marcat cu `isFoodHandling: true`, `isScreenWork: false`, `workPosture: "ORTOSTATIC"`, `maxWeightKg: 25`, pentru a forța generarea corectă a Fișei de identificare factori de risc (Fișa 210 cu examen coprobacteriologic și coproparazitologic) în locul fișei de birou.
  2. **Evaluare de Risc Horeca:** Lipsește dosarul de evaluare INCDPM conform profilului CAEN 5610 (`RISK_PROFILE_5610` din `caen-risk-presets.ts`) care tratează riscurile reale: ulei încins, arsuri termice, pardoseli grase antiderapante, mașini de tocat, foc deschis.
  3. **Normativ EIP de Bucătărie:** Bucătarii au nevoie în baza de date de EIP specific: saboți de bucătărie antiderapanți SRC, mănuși termoizolante pentru cuptor (250°C), mănuși antităiere din zale de inox, șorț impermeabil, bonetă de bucătărie.

---

## 6. Recomandări de Arhitectură & Logică de Business

### 6.1. Remedierea Tehnică Imediată a Generatorului Excel (`generator.ts`)
În `src/lib/templates/generator.ts`, la linia 419, înlocuirea apelului vulnerabil `XLSX.readFile` cu citirea nativă a bufferului:
```typescript
// ÎNAINTE (Provoacă crash "Cannot access file"):
} else if (templateFormat === 'xlsx') {
  const wb = XLSX.readFile(templateFilePath);

// DUPĂ (Funcționează 100% stabil în Next.js Server Runtime):
} else if (templateFormat === 'xlsx') {
  const fileBuffer = fs.readFileSync(templateFilePath);
  const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
```

---

### 6.2. Condiționarea Vizibilității Selectorului de Posturi în UI (`generate/page.tsx`)
În `src/app/documents/generate/page.tsx`, linia 470 trebuie rectificată astfel încât selectorul de posturi să fie afișat **exclusiv** când șablonul este de nivel post sau evaluare de riscuri, excluzând șabloanele de igienă și deciziile generale:
```tsx
// ÎNAINTE:
{!isEmployeeRequired && selectedClientId && jobs.length > 0 && (

// DUPĂ:
{!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0 && (
```

---

### 6.3. Moștenirea Dinamică a Specialistului și Prestatorului SEPP
Ierarhia de rezolvare a prestatorului și specialistului în `src/lib/templates/resolver.ts` trebuie să respecte strict regula:
1. **Prioritate 1:** Specialistul / Prestatorul asociat explicit clientului prin relație (`client.specialistId`, `client.providerId`).
2. **Prioritate 2:** Prestatorul implicit activ din baza de date (`SsmProvider` cu `isDefault: true, isActive: true`) și specialistul implicit al acestuia (`SsmSpecialist` cu `isDefault: true, isActive: true`).
3. **Prioritate 3:** Câmpurile textuale moștenite (`client.ssmSpecialistName`, `client.ssmProviderName`).
4. **Prioritate 4 (Ultima instanță):** Constantele de fallback `ROMANIAN_LEGAL_SSM_PROVIDER`.

---

### 6.4. Adaptarea Contextuală a Fișei de Factori de Risc Medical (HG 355/2007)
În loc de injectarea oarbă a obiectului static `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`, `resolveTemplateData` trebuie să deriveze câmpurile Anexei 3 din:
* Profilul CAEN al firmei (`getRiskProfileForCaen(client.caenCode, job.title)`):
  * Dacă firma are CAEN din diviziunea 56 (Restaurante), 10 (Alimente) sau postul are `isFoodHandling: true`:
    * `PLACEHOLDER_SECTOR_ALIMENTAR = 'Da'`
    * `PLACEHOLDER_SUPRASOLICITARE_VIZUALA = 'Nu'`
    * `PLACEHOLDER_POZITIE_LUCRU = 'Ortostatic (> 70% din timp)'`
    * `PLACEHOLDER_RISC_ARSURI_OPARIRE = 'Da (contact cu suprafețe fierbinți, cuptoare, ulei încins)'`
    * `PLACEHOLDER_RISC_TAIERE = 'Da (utilizare cuțite profesionale și mașini de tranșat)'`
  * Dacă postul are `isScreenWork: true` (IT / TESA):
    * `PLACEHOLDER_SECTOR_ALIMENTAR = 'Nu'`
    * `PLACEHOLDER_SUPRASOLICITARE_VIZUALA = 'Da - lucru cu ecran de vizualizare peste 4h/zi (Fișa 243 HG 355/2007)'`
    * `PLACEHOLDER_POZITIE_LUCRU = 'Așezat pe scaun ergonomic'`

---

### 6.5. Declanșatori Automate pentru Pachete Operaționale (Triggers)
1. **Onboarding Salariat Nou (1-Click ZIP):** La salvarea unui salariat nou sau la accesarea fișei salariatului, generarea automată a pachetului complet din 11 documente cu date 100% preluate din profilul salariatului și al postului (CIM cu salariu real, anexa fișei postului cu număr CIM completat, fișele medicale adaptate la profilul CAEN, fișa EIP cu sortimente specifice postului).
2. **Generare Dosar Inițial Client (Start-up Dossier):** La înrolarea unei firme client noi, generarea pachetului de 11 decizii interne, IPSSM specifice CAEN-ului și evaluarea de riscuri INCDPM.
3. **Actualizare Scadențe la Consemnare Instruire:** La înregistrarea unui eveniment în `TrainingEvent`, actualizarea automată a datelor `ssmLastTrainingDate` și `psiLastTrainingDate` pe salariații participanți, eliminând restanțele.

---

## 7. Concluzii și Pași Următori

Modelul actual de date deține deja bazele necesare pentru operare (clienți, puncte de lucru, posturi, salariați, catalog de 31 de șabloane, calcul de scadențe). Prin implementarea extinderilor de schemă identificate (atribute CIM, mărimi și modele EIP, indicatori de riscuri pe post), corectarea erorii de citire a fișierelor Excel (`XLSX.read`) și popularea completă a bazei de date cu evaluări de risc și instruiri reale în `prisma/seed.ts`, aplicația va atinge un nivel de conformitate statutară de 100%, eliminând complet textele simulate și documentele cu date lipsă.
