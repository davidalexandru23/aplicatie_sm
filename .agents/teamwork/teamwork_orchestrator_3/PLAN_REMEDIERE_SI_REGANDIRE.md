# PLAN STRATEGIC DE REMEDIERE ȘI REGÂNDIRE A SOLUȚIEI (SSM / IGIENĂ / HR)

**Data auditului:** 5 Noiembrie 2026  
**Autor:** Project Orchestrator (teamwork_orchestrator gen 3)  
**Bază de investigație:** Audit manual amănunțit al codului sursă, șabloanelor statutare, rutelor API, schemelor de date și fluxurilor UI (fără scripturi sintetice).

---

## 1. REZUMAT EXECUTIV ȘI INVENTARUL DEFECTELOR IDENTIFICATE

Sistemul curent deține o fundație avansată: un catalog complet de **31 de șabloane statutare** (29 DOCX și 2 XLSX) conforme cu legislația muncii și protecției muncii din România, un motor puternic de rezolvare a numelor, genului și declinărilor gramaticale, și structuri de calcul conform INCDPM.

Cu toate acestea, experiența de utilizare și generarea efectivă a documentelor sunt grav afectate de **5 erori critice și deficiențe structurale de flux**:

| # | Categorie Defect | Descriere & Simptom Observat | Cauză Rădăcină (Root Cause) | Impact Asupra Utilizatorului |
|---|---|---|---|---|
| **D1** | **Eroare Critică Generare (Crash 500)** | La generarea șabloanelor Excel (`Tabel Cursanti exemplu.xlsx`, `Anexe Curs igiena.xlsx`) apare eroarea: `Cannot access file /.../Tabel Cursanti exemplu.xlsx`. | În `src/lib/templates/generator.ts:419`, funcția `XLSX.readFile(templateFilePath)` apelează metoda internă SheetJS `read_binary`, care depinde de `require('fs')`. În bundle-ul Next.js 16 ESM (Turbopack), `require` este `undefined`. | Blocare completă 100% a generării documentelor de igienă în format Excel. |
| **D2** | **UI Logic Glitch / Inversiune Predicat** | La selectarea șablonului de igienă apare dropdown-ul „Funcție / Post de Lucru” preselectând primul post (ex. „Bucătar”). | În `src/app/documents/generate/page.tsx:470`, condiția de afișare este `!isEmployeeRequired`. Pentru igienă, `isEmployeeRequired` este `false`, deci `!isEmployeeRequired` devine `true`. | Flux fără sens: obligă sau sugerează selectarea unui post de lucru la cursuri colective de igienă. |
| **D3** | **Gaură Model de Date & Status `missing_data`** | Contractele de muncă (`hr-cim-2022`, `hr-cim-2026`) și Fișa Postului (`hr-anexa-fisa-post`) generează cu status `missing_data` și linii punctate în DOCX. | Modelul Prisma `Employee` nu conține coloane pentru `cimNumber`, `cimDate`, `grossSalary`, `probationDays`, `workNorm`, `bankIban`. Generatorul filtrează valorile goale `""`, lăsând tokenurile brute `{PLACEHOLDER_NUMAR_CIM}` în document. | Documentele legale de angajare nu conțin elementele esențiale cerute de Codul Muncii și Ordinul 2171/2022. |
| **D4** | **Inversiune Statutory de Risc & EIP (Mocare statică)** | Bucătarul specialist (Chef) de la Bistro Gourmet primește fișă medicală cu „Sector alimentar: Nu” și „Suprasolicitare vizuală ecran Fișa 243”, cască de șantier și ochelari de protecție la monitor. | În `src/lib/templates/resolver.ts`, medicina muncii și echipamentul de protecție cad pe un fallback static unic TESA/Birou (`ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH` și `ROMANIAN_LEGAL_EIP`), nefiind legate dinamic de postul de lucru sau codul CAEN. | Neconformitate legală gravă la controlul ITM / Medicina Muncii (HG 355/2007 și HG 1048/2006). |
| **D5** | **Fricțiune UI Monolitică & Lipsă CRUD Operativ** | Utilizatorul are un singur formular gigant în `/documents/generate` cu 31 de șabloane amestecate. În `/clients/[id]` și `/employees`, posturile, punctele de lucru și salariații sunt read-only (fără butoane de Adăugare/Editare). Nu există selector de Punct de Lucru (se forțează tacit primul punct de lucru). | Toate cele 5 domenii de documente sunt forțate într-un singur ecran fără tab-uri sau moduri dedicate. Lipsesc componentele modale CRUD din interfață. | Utilizatorul este frustrat, nu poate corecta datele din UI și nu înțelege de ce i se cer câmpuri irelevante. |

---

## 2. REGÂNDIREA ARHITECTURII DE FLUX (WORKFLOW REDESIGN)

Pentru a elimina definitiv „fluxurile fără sens”, documentele nu trebuie tratate ca o listă plată de 31 de șabloane într-un singur formular, ci trebuie **segregate strict pe 5 modalități operaționale (domenii de business)**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           CENTRALIZATOR GENERARE DOCUMENTE (/documents/generate)                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         ▼                  ▼                   ▼                   ▼                  ▼
   [MODALITATEA 1]    [MODALITATEA 2]     [MODALITATEA 3]     [MODALITATEA 4]    [MODALITATEA 5]
   Pachet Onboarding    Dosar Înființare    Evaluare Riscuri     Cursuri Igienă      Document Statutar
       Salariat            SSM Firmă         & Fișa Postului       (Sesiune)            Individual
    (1-Click ZIP)        (1-Click ZIP)       (Nivel: Post)      (Nivel: Sesiune)     (Wizard Filtrare)
```

### 2.1. Modalitatea 1: Pachetul de Onboarding Salariat (1-Click ZIP)
- **Scop:** Generarea completă, instantanee, a dosarului de angajare pentru un salariat selectat.
- **Context necesar:** Doar `Client` + `Salariat` (Postul și Punctul de lucru se deduc automat din profilul salariatului).
- **Documente generate în pachetul ZIP:**
  1. Contract Individual de Muncă (CIM Model-Cadru Ordin 2171/2022)
  2. Fișa Individuală de Instruire SSM (HG 1425/2006 Anexa 11)
  3. Fișa Individuală de Instructaj Situații de Urgență / PSI (OMAI 712/2005)
  4. Fișa de Solicitare Examen Medical la Angajare (HG 355/2007 Anexa 2)
  5. Fișa de Identificare a Factorilor de Risc Profesional (HG 355/2007 Anexa 3)
  6. Fișa Individuală de Acordare EIP (HG 1048/2006)
  7. Anexa la Fișa Postului cu atribuții SSM & Situații de Urgență
  8. Informare privind Protecția Datelor cu Caracter Personal (GDPR)
- **Puncte de declanșare în UI:**
  - Buton direct în `/employees` în dreptul fiecărui salariat: `[Descarcă Pachet Onboarding (ZIP)]`.
  - Buton direct în `/clients/[id]` la tab-ul Salariați.
  - Tab dedicat în `/documents/generate`.

### 2.2. Modalitatea 2: Pachetul Dosar SSM Firmă / Start-up Dossier (1-Click ZIP)
- **Scop:** Generarea întregului pachet administrativ-juridic la preluarea unui client nou de către serviciul extern SSM.
- **Context necesar:** Doar `Client` (opțional `Worksite`). **Fără Salariat, Fără Post, Fără Sesiune de Igienă**.
- **Documente generate în pachetul ZIP:**
  1. Decizii Interne Organizare SSM și Situații de Urgență (setul de decizii statutare)
  2. Tematică Instruire Introductiv-Generală SSM
  3. Instrucțiuni Proprii de Securitate a Muncii Generale (IPSSM Birou / Activități Generale)
  4. Tematică și Instrucțiuni Prevenire și Stingere Incendii (PSI)
  5. Regulament Intern (clauze SSM)
  6. Opis Documente Dosar SSM
- **Puncte de declanșare în UI:**
  - Buton direct în antetul `/clients/[id]`: `[Generează Dosar SSM Client (ZIP)]`.
  - Tab dedicat în `/documents/generate`.

### 2.3. Modalitatea 3: Evaluare Riscuri & Profilaxie Post (Nivel: Funcție / Job)
- **Scop:** Generarea documentației analitice specifice unui post de lucru.
- **Context necesar:** `Client` + `Post de Lucru (Job)`. **Fără Salariat**.
- **Documente disponibile:**
  1. Evaluarea Riscurilor de Accidentare și Îmbolnăvire Profesională (Metoda INCDPM)
  2. Planul de Prevenire și Protecție (corelat cu riscurile postului)
  3. Tematică Instruire la Locul de Muncă specifică funcției
  4. Instrucțiuni Proprii SSM specifice meseriei (ex. Bucătar, Tehnician IT, Șofer)
  5. Normativ Intern de Acordare EIP pentru postul respectiv
- **Puncte de declanșare în UI:**
  - Buton direct în `/clients/[id]` în lista de Posturi: `[Documente Post]`.
  - Mod dedicat în `/documents/generate`.

### 2.4. Modalitatea 4: Cursuri de Igienă (Noțiuni Fundamentale de Igienă)
- **Scop:** Gestionarea cursurilor conform Ordinului MS/ME 2209/4469/2022 și emiterea documentelor oficiale de absolvire.
- **Context necesar:** `Client` + `Sesiune de Igienă`. **Interzis să apară selectorul de Funcție / Post!**
- **Documente generate:**
  1. Tabel Cursanți Igienă (`Tabel Cursanti exemplu.xlsx`)
  2. Anexe Catalog Curs Igienă (`Anexe Curs igiena.xlsx`)
  3. Proces Verbal de Instruire Igienă (DOCX)
  4. Tematică Curs Igienă (DOCX)
  5. Adeverințe de Participare / Absolvire Curs Igienă (DOCX per cursant sau ZIP colectiv)
- **Puncte de declanșare în UI:**
  - Buton direct în `/hygiene` pe fiecare sesiune de curs: `[Descarcă Documente Sesiune]`.
  - Tab dedicat în `/documents/generate`.

### 2.5. Modalitatea 5: Generatorul Statutar Individual (Wizard cu Filtrare Logică)
- **Scop:** Generarea unui singur document specific la cerere.
- **Flux:**
  1. Pasul 1: Selectare Client (și opțional Punct de Lucru).
  2. Pasul 2: Filtrare șablon după Categorie (SSM, Situații de Urgență, Medicina Muncii, EIP, HR, Igienă).
  3. Pasul 3: Afișare **DOAR** a câmpurilor strict necesare acelui șablon:
     - Dacă șablonul este de salariat → arată selectorul de salariat (cu post pre-completat dar editabil).
     - Dacă șablonul este de post → arată selectorul de post (fără salariat).
     - Dacă șablonul este de igienă → arată selectorul de sesiune de igienă.
     - Dacă șablonul este de firmă → ascunde toate selectoarele secundare.
  4. Pasul 4: Validare vizuală prietenoasă cu rezumatul datelor înainte de generare.

---

## 3. IMBUNĂTĂȚIRI NECESARE LA NIVEL DE MODEL DE DATE (PRISMA SCHEMA)

Pentru a susține cerințele legale și a elimina apariția statusului `missing_data`, schema Prisma trebuie îmbunătățită cu următoarele câmpuri esențiale:

### 3.1. Extinderea modelului `Employee`
```prisma
model Employee {
  // Câmpuri existente păstrate...
  
  // Date contractuale obligatorii conform Codului Muncii & Ordin 2171/2022
  cimNumber                String?   // Nr. Contract Individual de Muncă
  cimDate                  DateTime? // Data încheierii CIM
  grossSalary              Float?    // Salariu de bază lunar brut (lei)
  workNorm                 Int       @default(8) // Ore/zi (normă întreagă 8h sau parțială)
  probationDays            Int       @default(90) // Perioadă de probă (zile calendaristice)
  annualLeaveDays          Int       @default(20) // Concediu de odihnă anual (zile)
  bankIban                 String?   // Cont IBAN salariat
  bankName                 String?   // Banca
  
  // Date specifice fișelor SSM & Situații de Urgență (HG 1425/2006 Anexa 11)
  bloodType                String?   // Grupa sanguină (ex: AII, 0I, BIII, ABIV)
  rhFactor                 String?   // Rh (+ / -)
  qualification            String?   // Calificarea / Studiile absolvite
  commuteRoute             String?   // Traseu deplasare domiciliu - loc de muncă
  commuteDurationMinutes   Int?      // Durata normală de deplasare (minute)
  
  // Mărimi echipament individual de protecție (HG 1048/2006)
  shoeSize                 String?   // Mărime încălțăminte de protecție (ex: 42)
  clothingSize             String?   // Mărime îmbrăcăminte (ex: M, L, XL, 50)
  gloveSize                String?   // Mărime mănuși (ex: 8, 9, 10)
}
```

### 3.2. Extinderea modelului `Job` pentru profiling de risc
```prisma
model Job {
  // Câmpuri existente păstrate...
  
  // Profiling de risc pentru adaptarea automată a medicinei muncii și EIP
  isFoodHandling           Boolean   @default(false) // Lucru în alimentație / manipulare alimente (HG 355/2007 Fișa 210)
  isScreenWork             Boolean   @default(false) // Lucru la ecran > 4h/zi (HG 355/2007 Fișa 243)
  isDrivingRequired        Boolean   @default(false) // Conducere auto în interes de serviciu (Fișa 209)
  workPosture              String?   // "standing" (ortostatic), "sitting" (așezat), "mixed"
  maxWeightKg              Float?    // Manipulare manuală mase (kg)
  noiseExposed             Boolean   @default(false) // Expunere la zgomot > 80 dB(A)
}
```

### 3.3. Adăugarea modelelor EIP (Echipament Individual de Protecție)
```prisma
model EipItem {
  id               String   @id @default(uuid())
  code             String   @unique
  name             String   // ex: Încălțăminte bucătar antiderapantă, Halat bucătar, Bocanci protecție S3
  standardCode     String   // ex: EN ISO 20345, EN 340
  protectionType   String   // Antialunecare, Mecanic, Termic, Chimic
  replacementMonths Int     @default(12) // Periodicitate acordare (luni)
  requirements     JobEipRequirement[]
  assignments      EmployeeEipAssignment[]
}

model JobEipRequirement {
  id               String   @id @default(uuid())
  jobId            String
  job              Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  eipItemId        String
  eipItem          EipItem  @relation(fields: [eipItemId], references: [id], onDelete: Cascade)
}

model EmployeeEipAssignment {
  id               String   @id @default(uuid())
  employeeId       String
  employee         Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  eipItemId        String
  eipItem          EipItem  @relation(fields: [eipItemId], references: [id], onDelete: Cascade)
  assignedDate     DateTime @default(now())
  signatureDate    DateTime?
}
```

---

## 4. PLAN DE IMPLEMENTARE ȘI REMEDIERE TEHNICĂ (ROADMAP PE MILESTONE-URI)

Implementarea se va desfășura în **4 faze secvențiale**, fiecare cu criterii clare de acceptanță:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FOAIA DE PARCURS (ROADMAP)                             │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ FAZA 1: Quick Fixes & Deblocare│ - Remediere buffer XLSX în generator.ts               │
│         Generare Imediată      │ - Corecție condiție afișare dropdown Job în UI        │
│         (Timp estimat: Rapid)  │ - Garanție: Generarea ambelor fișiere Excel 200 OK    │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ FAZA 2: Schema Prisma & Date   │ - Adăugare câmpuri CIM, SSM, EIP pe Employee & Job    │
│         Reale în Seed          │ - Actualizare seed.ts cu date complete Nexus & Bistro │
│                                │ - Populare RiskAssessments și TrainingEvents          │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ FAZA 3: Conectare Resolver &   │ - Eliminare mock-uri TESA din medicina muncii & EIP   │
│         Business Logic Corect  │ - Legare dinamică de CAEN și caracteristicile Job-ului│
│                                │ - Status approved_for_print pe 100% din 31 șabloane   │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ FAZA 4: Redesign UI/UX &       │ - Implementare cele 5 modalități tabbed în UI         │
│         Modale CRUD Operative  │ - Modale Adăugare/Editare Salariat, Post, Punct Lucru │
│                                │ - Selector Punct de Lucru și butoane 1-Click ZIP      │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

### ETAPA 1: Remedierea Imediată a Crash-ului Excel și a Dropdown-ului de Igienă (Faza 1)
1. **Modificare în `src/lib/templates/generator.ts` (Linia 419):**
   - Înlocuire:
     ```typescript
     const wb = XLSX.readFile(templateFilePath);
     ```
   - Cu:
     ```typescript
     const fileBuffer = fs.readFileSync(templateFilePath);
     const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
     ```
   - **Efect:** Deblochează instantaneu generarea șabloanelor `hygiene-tabel-cursanti` și `hygiene-anexe-catalog` în mediul Turbopack ESM.

2. **Modificare în `src/app/documents/generate/page.tsx` (Linia 470):**
   - Înlocuire condiție:
     ```tsx
     {!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0 && (
     ```
   - În plus, la selectarea unui șablon de igienă, resetarea `selectedJobId = ''`.
   - **Efect:** Elimină definitiv apariția selectorului de funcție la documentele de igienă și documentele generale de firmă.

---

### ETAPA 2: Schema Prisma, Migrare și Actualizare Seed (Faza 2)
1. **Actualizare `prisma/schema.prisma`:**
   - Adăugare câmpuri `cimNumber`, `grossSalary`, `cimDate`, `probationDays`, `workNorm`, `bankIban`, `bloodType`, `qualification`, `commuteRoute`, `shoeSize` pe `Employee`.
   - Adăugare câmpuri `isFoodHandling`, `isScreenWork`, `workPosture` pe `Job`.
   - Adăugare modele `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`.
2. **Execuție sincronizare schemă:** `npx prisma db push`.
3. **Actualizare `prisma/seed.ts`:**
   - Populare contracte de muncă reale pentru toți cei 6 salariați (ex: `cimNumber: "142/2024"`, `grossSalary: 4500` pentru bucătar la Bistro Gourmet, `grossSalary: 12000` pentru inginer IT la Nexus Solutions).
   - Populare evaluări de risc reale (`RiskAssessment`) pentru ambele firme.
   - Populare sesiuni de instruire SSM (`TrainingEvent`) cu participanți înregistrați.
   - Populare cerințe EIP reale pe posturi (șorț, bonetă, încălțăminte bucătar pentru alimentație; ochelari și ergonomic pentru IT).

---

### ETAPA 3: Rafinarea Resolverului de Șabloane (Faza 3)
1. În `src/lib/templates/resolver.ts`:
   - Conectarea valorilor din `Employee` (`grossSalary`, `cimNumber`, `cimDate`, `workNorm`) la tokenurile `{PLACEHOLDER_SALARIU_BRUT}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`.
   - Înlocuirea mock-ului static `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`:
     - Dacă `job.isFoodHandling === true` sau CAEN client 5610 (Restaurante): bifat `Sector alimentar: Da`, fișa 210, control coproparazitologic și pulmonar; `Suprasolicitare vizuală: Nu`.
     - Dacă `job.isScreenWork === true` sau CAEN 6201 (IT): bifat `Suprasolicitare vizuală: Da`, fișa 243; `Sector alimentar: Nu`.
   - Înlocuirea mock-ului static `ROMANIAN_LEGAL_EIP`:
     - Generarea tabelelor EIP din `EmployeeEipAssignment` / `JobEipRequirement` specifice postului.

---

### ETAPA 4: Redesign Interfață Utilizator & Modale CRUD (Faza 4)
1. **Redesign `/documents/generate`:**
   - Introducere tab-uri superioare pentru cele 5 modalități.
   - Adăugare selector de **Punct de Lucru (Worksite)** la nivelul clientului.
   - Formatare prietenoasă a erorilor (fără căi absolute `/Users/...` în alert banners; mesaje explicative clare).
2. **Adăugare Modale CRUD Operative:**
   - Pe `/clients/[id]`: Modale `Adaugă Punct de Lucru` și `Adaugă Post de Lucru`.
   - Pe `/employees`: Modale `Adaugă Salariat` și `Editează Salariat` cu toate datele necesare pentru CIM, SSM și EIP.
   - Pe `/employees`: Buton direct `[Pachet Onboarding ZIP]`.
   - Pe `/hygiene`: Buton direct `[Generează Toate Documentele Sesiunii (ZIP)]`.

---

## 5. REZULTATE ESTIMATE DUPĂ REMEDIERE

1. **Rată de succes generare:** **100% din cele 31 de șabloane statutare** vor genera cu status `approved_for_print` (0 missing fields, 0 erori 500).
2. **Conformitate legislativă:** 100% conformitate cu Codul Muncii (Ordin 2171/2022), Normele SSM (HG 1425/2006), Medicina Muncii (HG 355/2007), Normele EIP (HG 1048/2006) și Normele Igienă (Ordin 2209/2022).
3. **Experiență utilizator (UX):** Separare clară a sarcinilor, fără câmpuri irelevante, viteză de operare prin pachete 1-Click ZIP și posibilitate de completare completă a datelor direct din UI.
