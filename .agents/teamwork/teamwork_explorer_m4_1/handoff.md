# Raport de Explorare Tehnică: Gestiunea EIP (HG 1048/2006) - Features 19 & 20

**Data**: 2026-11-11  
**Agent**: `teamwork_explorer_m4_1` (Read-only Investigation)  
**Parent**: `sub_orch_m4` (`bb554252-abb0-448b-ade0-4e03f8aa279d`)  
**Scope**: Milestone 4 — Features 19 (Activare Modele Prisma EIP) & 20 (Conectare Fișă EIP la Baza de Date)

---

## 1. Observation

### 1.1. Modelul de Date Prisma (`prisma/schema.prisma`)
Examinarea modelului de date relevă că structurile de persistență pentru EIP sunt deja definite în schema Prisma, dar parțial utilizate sau inactive în fluxurile superioare:

1. **`EipItem`** (`prisma/schema.prisma:624-636`):
   ```prisma
   model EipItem {
     id                String   @id @default(uuid())
     code              String   @unique
     name              String   // ex: Încălțăminte antiderapantă bucătar, Bonetă protecție, Halat alb
     standardCode      String?  // ex: EN ISO 20345, EN 340
     protectionType    String?  // Antialunecare, Mecanic, Termic, Chimic, Igienic
     replacementMonths Int      @default(12) // Periodicitate acordare (luni)
     createdAt         DateTime @default(now())
     updatedAt         DateTime @updatedAt

     requirements      JobEipRequirement[]
     assignments       EmployeeEipAssignment[]
   }
   ```
2. **`JobEipRequirement`** (`prisma/schema.prisma:638-646`):
   ```prisma
   model JobEipRequirement {
     id        String   @id @default(uuid())
     jobId     String
     job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
     eipItemId String
     eipItem   EipItem  @relation(fields: [eipItemId], references: [id], onDelete: Cascade)

     @@unique([jobId, eipItemId])
   }
   ```
3. **`EmployeeEipAssignment`** (`prisma/schema.prisma:648-658`):
   ```prisma
   model EmployeeEipAssignment {
     id            String    @id @default(uuid())
     employeeId    String
     employee      Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
     eipItemId     String
     eipItem       EipItem   @relation(fields: [eipItemId], references: [id], onDelete: Cascade)
     assignedDate  DateTime  @default(now())
     signatureDate DateTime?

     @@unique([employeeId, eipItemId])
   }
   ```
4. **Câmpurile de mărimi pe modelul `Employee`** (`prisma/schema.prisma:281-283`):
   ```prisma
   shoeSize                     String?   // Mărime încălțăminte
   clothingSize                 String?   // Mărime îmbrăcăminte
   gloveSize                    String?   // Mărime mănuși
   ```
5. **Relațiile pe `Job` și `Employee`**:
   - `Job.eipRequirements`: relație 1-to-many cu `JobEipRequirement` (linia 185).
   - `Employee.eipAssignments`: relație 1-to-many cu `EmployeeEipAssignment` (linia 294).

---

### 1.2. Rutele API Existente (`src/app/api/`)
Executarea comenzii `find src/app/api -name "*eip*"` a confirmat că:
- **Zero rute API dedicate EIP există în prezent**.
- Nu există niciun fișier sub `src/app/api/eip/`. Rutele specificate în contract (`/api/eip/items`, `/api/eip/requirements`, `/api/eip/assignments`) lipsesc complet.
- În rutele existente pentru salariat (`src/app/api/employees/[id]/route.ts`), la `GET` există deja includerea:
  ```typescript
  // src/app/api/employees/[id]/route.ts:38-41
  eipAssignments: {
    include: { eipItem: true },
    orderBy: { assignedDate: 'desc' },
  },
  ```
  Iar la `PUT /api/employees/[id]` și `POST /api/employees`, câmpurile `shoeSize`, `clothingSize`, `gloveSize` sunt deja persistate în baza de date.

---

### 1.3. Rezolvitorul de Șabloane (`src/lib/templates/resolver.ts`)
Investigația codului sursă din `resolver.ts` a relevat o discrepanță majoră între datele din BD și generarea fișelor EIP:

1. **Dicționar static hardcodat (Mock Data)** (`src/lib/templates/resolver.ts:2120-2160`):
   ```typescript
   // Profiling Dinamic EIP (HG 1048/2006)
   ...(isFoodSector ? {
     PLACEHOLDER_EIP_DENUMIRE_01: 'Încălțăminte antiderapantă bucătar (OB-E-A-FO SRC)',
     PLACEHOLDER_EIP_STANDARD_01: 'EN ISO 20347',
     PLACEHOLDER_EIP_RISC_01: 'Alunecare pe pardoseli umede/grase',
     PLACEHOLDER_EIP_DENUMIRE_02: 'Bonetă / plasă protecție păr',
     // ... până la 05
   } : job?.title?.toLowerCase().includes('tehnician') ? {
     PLACEHOLDER_EIP_DENUMIRE_01: 'Bocanci protecție S3 SRC cu bombeu compozit',
     // ...
   } : {
     PLACEHOLDER_EIP_DENUMIRE_01: 'Ochelari protecție ecran cu filtru lumină albastră',
     // ...
   })
   ```
   **Probleme identificate**:
   - Resolver-ul NU interoghează deloc tabelele `EmployeeEipAssignment` sau `JobEipRequirement`.
   - Se folosesc șiruri hardcodate statice bazate pe euristici de text (`isFoodSector`, `job?.title?.includes('tehnician')`).
   - Câmpurile obligatorii din tabelul fișei (`PLACEHOLDER_EIP_UM_01`, `PLACEHOLDER_EIP_CANTITATE_01`, `PLACEHOLDER_EIP_DURATA_01`, `PLACEHOLDER_EIP_DATA_ACORDARII_01`, `PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_01`) sunt lăsate goale în resolver (`ROMANIAN_LEGAL_EIP` liniile 458-567 le inițializează cu `''`, iar blocul dinamic populează doar `DENUMIRE` și `STANDARD`).

2. **Neconcordanță critică la mărimi salariat**:
   - În `ROMANIAN_LEGAL_EIP` (linia 449): `PLACEHOLDER_MARIME_HAINE: ''`.
   - În `resolver.ts` linia 1793: `markAutocompleted('PLACEHOLDER_MARIME_IMBRACAMINTE', (employee as any).clothingSize);`.
   - În `resolver.ts` linia 2107: `PLACEHOLDER_MARIME_IMBRACAMINTE: (employee as any)?.clothingSize || '',`.
   - **Dar în șablonul DOCX (`eip-fisa-acordare-individuala.docx`) și în `definitions.ts:3836`, tokenul este `{PLACEHOLDER_MARIME_HAINE}`!**
   - Drept urmare, `PLACEHOLDER_MARIME_HAINE` rămâne complet gol (`''`) în documentul generat, chiar dacă salariatul are mărimea completată în baza de date!

3. **Interogările Prisma din `loadResolverContext` / `resolveTemplatePlaceholders`** (`resolver.ts:2502-2513` și `2530-2543`):
   - La încărcarea salariatului (`client.employees` și `prisma.employee.findFirst`), sunt incluse doar:
     `identityDocument`, `residenceAddress`, `currentJob`, `currentWorksite`, `trainingParticipants`.
   - **Lipsesc**: `eipAssignments: { include: { eipItem: true } }` pe `employee` și `eipRequirements: { include: { eipItem: true } }` pe `currentJob` / `client.jobs`.

---

### 1.4. Șablonul Oficial DOCX și Definițiile (`definitions.ts`)
Inspectarea structurală a fișierului `templates_registry/normalized/eip-fisa-acordare-individuala.docx` (prin extragerea XML-ului) a confirmat:
- **Structura tabelului este plată, cu 10 rânduri indexate (de la `01` la `10`)**:
  - `PLACEHOLDER_EIP_DENUMIRE_01` .. `10`
  - `PLACEHOLDER_EIP_STANDARD_01` .. `10`
  - `PLACEHOLDER_EIP_UM_01` .. `10` (U.M.: `per.` / `buc.`)
  - `PLACEHOLDER_EIP_CANTITATE_01` .. `10` (Cantitate: `1`)
  - `PLACEHOLDER_EIP_DURATA_01` .. `10` (ex: `12 luni`)
  - `PLACEHOLDER_EIP_DATA_ACORDARII_01` .. `10`
  - `PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_01` .. `10`
  - `PLACEHOLDER_EIP_DATA_RESTITUIRII_01` .. `10`
  - `PLACEHOLDER_EIP_MOTIV_01` .. `10`
  - `PLACEHOLDER_EIP_SEMNATURA_RETUR_01` .. `10`
- **Mărimi individuale salariat**:
  - `PLACEHOLDER_MARIME_HAINE`
  - `PLACEHOLDER_MARIME_INCALTAMINTE`
  - `PLACEHOLDER_MARIME_MANUSI`
  - `PLACEHOLDER_MARIME_CASCA`
- **Semnături și reprezentare**:
  - `PLACEHOLDER_DATA_ELIBERARII_FISEI`, `PLACEHOLDER_DATA_SEMNARII_EIP`
  - `PLACEHOLDER_NUME_SALARIAT`
  - `PLACEHOLDER_GESTIONAR_EIP`, `PLACEHOLDER_SEF_LOC_MUNCA`
  - `PLACEHOLDER_SPECIALIST_SSM`, `PLACEHOLDER_REPREZENTANT_LEGAL`
- Nu există taguri de buclă docxtemplater (`{#dotare_eip}`) în fișierul DOCX fizic, ci sloturi indexate 01-10. Însă alimentarea paralelă a sloturilor 01-10 și a colecției tabelare (`dotare_eip` / `echipamente`) garantează compatibilitatea 100%.

---

### 1.5. Datele Seed (`prisma/seed.ts`)
1. În `prisma/seed.ts`:
   - Nu există nicio populare pentru `EipItem`, `JobEipRequirement` sau `EmployeeEipAssignment`.
   - Pe salariații din BISTRO GOURMET și NEXUS SOLUTIONS, câmpurile `shoeSize`, `clothingSize`, `gloveSize` lipsesc din `seed.ts`.
2. În baza de date curentă (populată anterior prin scripturi izolate `scripts/patch_seed_data.ts`):
   - Există 8 articole în `EipItem` (`EIP-INC-01`, `EIP-BON-01`, `EIP-HAL-01`, `EIP-SOR-01`, `EIP-MAN-01`, `EIP-BOC-01`, `EIP-MAN-02`, `EIP-OCH-01`).
   - Există 14 cerințe în `JobEipRequirement` (pentru BISTRO GOURMET, NEXUS și RESTAURANT LA CONAC).
   - **Există 0 alocări în `EmployeeEipAssignment`** pentru toți angajații!
   - Dacă se rulează un `db:seed`, toate cerințele și articolele EIP ar fi pierdute deoarece nu sunt integrate în `prisma/seed.ts`.

---

## 2. Logic Chain

1. **De la cerințele statutare la persistență**:
   Conform HG nr. 1048/2006 (art. 10-13) și Legii 319/2006 (art. 13 lit. r), angajatorul este obligat să asigure gratuit EIP adaptat anatomiei fiecărui salariat și riscurilor specifice postului, ținând evidența acordării pe fișă individuală semnată.
   Modelele `EipItem`, `JobEipRequirement` și `EmployeeEipAssignment` sunt concepute special pentru a gestiona acest flux:
   - `JobEipRequirement` reprezintă **normativul de dotare pe funcție** (ce este obligat angajatorul să acorde pentru postul de bucătar, tehnician etc.).
   - `EmployeeEipAssignment` reprezintă **predarea efectivă către salariat** (ce echipament s-a acordat, data predării, semnătura).
   - `Employee` stochează **mărimile fizice** (`shoeSize`, `clothingSize`, `gloveSize`).

2. **De la persistență la API**:
   Pentru a activa operarea în aplicație și testarea automată, lipsesc rutele REST operaționale:
   - `/api/eip/items` (Catalog EIP)
   - `/api/eip/requirements` (Normativ post)
   - `/api/eip/assignments` (Fișă individuală / Predare EIP)
   Fără aceste rute, Worker-ul și utilizatorul nu pot crea, actualiza sau lista echipamentele.

3. **De la date reale la generarea documentului (`eip-fisa-acordare-individuala`)**:
   În prezent, fișa EIP afișează 5 rânduri fabricate dintr-un dicționar hardcodat dacă postul conține "bucătar" sau "tehnician", ignorând complet înregistrările din DB.
   Dacă salariatul are alocări reale în `EmployeeEipAssignment`, fișa trebuie să preia acele articole. Dacă nu are încă alocări individuale înregistrate (ex: salariat nou la onboarding), fișa trebuie să preia normativul funcției din `JobEipRequirement`. Dacă niciuna nu este definită, câmpurile trebuie să rămână goale (nu date inventate!), marcate sincer ca date lipsă.
   Totodată, tokenul `{PLACEHOLDER_MARIME_HAINE}` trebuie legat de `employee.clothingSize` (și marcat `isAutocompleted: true` dacă există valoare).

4. **De la dezvoltare la stabilitate seed**:
   Prin mutarea logicii din scripturile ad-hoc în `prisma/seed.ts`, atât BISTRO GOURMET (Horeca), cât și NEXUS SOLUTIONS (IT) vor avea EIP statutar complet configurat la fiecare `db:seed`.

---

## 3. Caveats

1. **Limitare la 10 sloturi fizice în DOCX**:
   Șablonul `eip-fisa-acordare-individuala.docx` are un tabel fix de 10 rânduri cu tokenuri indexate de la `01` la `10`. Un salariat SSM tipic primește între 2 și 6 echipamente. Dacă un post are mai mult de 10 echipamente (caz excepțional în industrie), primele 10 vor fi injectate în tabelul DOCX, iar restul pot fi documentate sau paginate.
2. **Schema `EmployeeEipAssignment`**:
   În `schema.prisma`, `EmployeeEipAssignment` conține doar `assignedDate` și `signatureDate` (fără coloană `quantity` sau `notes`). Cantitatea standard conform normei este `1` (pereche sau bucată). În API, `quantity` poate fi acceptat ca input și mapat sau adăugat în schemă dacă este necesar.
3. **Mărime Cască (`PLACEHOLDER_MARIME_CASCA`)**:
   Modelul `Employee` are `shoeSize`, `clothingSize`, `gloveSize`. Nu există un câmp dedicat `helmetSize` în Prisma (căștile industriale au în general bandă reglabilă universală 52-64 cm). Acest câmp rămâne configurabil manual sau fallback la `'Reglabilă'`.

---

## 4. Conclusion & Implementation Plan for Worker

Planul concret de implementare pentru Worker este structurat pe 5 axe tehnice:

### Pasul 1: Crearea Rutelor API EIP (`src/app/api/eip/`)

#### 1. `src/app/api/eip/items/route.ts`
- **GET**:
  - Acceptă query params: `search` (filtrare după `name` sau `code`), `category` / `protectionType`.
  - Returnează `{ success: true, items: EipItem[] }`.
- **POST**:
  - Validează `code` și `name`.
  - `prisma.eipItem.upsert({ where: { code }, create: {...}, update: {...} })`.
  - Returnează `{ success: true, item: EipItem }` (status 201).

#### 2. `src/app/api/eip/requirements/route.ts`
- **GET**:
  - Query params: `jobId` (sau `clientId`).
  - Interoghează `prisma.jobEipRequirement.findMany({ where: { jobId }, include: { eipItem: true, job: { select: { id: true, title: true } } } })`.
  - Returnează `{ success: true, requirements: reqs, items: reqs.map(r => ({ ...r, item: r.eipItem })) }` (compatibilitate duală cu ambele convenții).
- **POST**:
  - Body: `{ jobId: string, eipItemId?: string, itemId?: string }`.
  - Validează existența `jobId` și a articolului EIP.
  - `prisma.jobEipRequirement.upsert({ where: { jobId_eipItemId: { jobId, eipItemId } }, ... })`.
  - Returnează `{ success: true, requirement: req }` (status 201).
- **DELETE**:
  - Query params sau body: `{ id?: string, jobId?: string, itemId?: string }`.
  - Șterge cerința și returnează `{ success: true }`.

#### 3. `src/app/api/eip/assignments/route.ts`
- **GET**:
  - Query params: `employeeId` (sau `clientId`).
  - Interoghează `prisma.employeeEipAssignment.findMany({ where: { employeeId }, include: { eipItem: true, employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { assignedDate: 'desc' } })`.
  - Returnează `{ success: true, assignments: assigns }`.
- **POST**:
  - Body: `{ employeeId: string, eipItemId?: string, itemId?: string, assignedDate?: string, signatureDate?: string }`.
  - Validează existența angajatului și a articolului EIP.
  - `prisma.employeeEipAssignment.upsert({ where: { employeeId_eipItemId: { employeeId, eipItemId } }, ... })`.
  - Returnează `{ success: true, assignment: assign }` (status 201).
- **DELETE**:
  - Șterge alocarea și returnează `{ success: true }`.

---

### Pasul 2: Conectarea Rezolvitorului (`src/lib/templates/resolver.ts`)

1. **Extinderea încărcării contextului în `resolveTemplatePlaceholders`**:
   - În interogarea `prisma.client.findUnique`:
     ```typescript
     jobs: {
       include: {
         eipRequirements: { include: { eipItem: true } },
       },
     },
     employees: {
       where: { status: { not: 'PLECAT' } },
       include: {
         identityDocument: true,
         residenceAddress: true,
         currentJob: {
           include: {
             eipRequirements: { include: { eipItem: true } },
           },
         },
         currentWorksite: true,
         trainingParticipants: { include: { event: true } },
         eipAssignments: {
           include: { eipItem: true },
           orderBy: { assignedDate: 'asc' },
         },
       },
     },
     ```
   - Asemănător în `prisma.employee.findFirst` când `ctx.employeeId` este interogat direct.

2. **În `resolveTemplateData`**:
   - Preluare sigură `assignments` și `requirements`:
     ```typescript
     let eipAssignments = (employee as any)?.eipAssignments;
     if (!eipAssignments && employee?.id) {
       try {
         eipAssignments = await prisma.employeeEipAssignment.findMany({
           where: { employeeId: employee.id },
           include: { eipItem: true },
           orderBy: { assignedDate: 'asc' },
         });
       } catch {}
     }

     let jobRequirements = (job as any)?.eipRequirements;
     if (!jobRequirements && job?.id) {
       try {
         jobRequirements = await prisma.jobEipRequirement.findMany({
           where: { jobId: job.id },
           include: { eipItem: true },
         });
       } catch {}
     }
     ```
   - **Logica de populare a rândurilor (01-10)**:
     - Dacă există `eipAssignments` cu lungime > 0: se populează articolele efectiv predate salariatului.
     - Altfel, dacă există `jobRequirements` cu lungime > 0: se populează normativul postului.
     - Altfel: sloturile rămân `''` (șiruri goale), fără inventarea de echipamente inexistente.
   - **Calculul U.M. și Cantitate**:
     - Denumire cu pantofi/bocanci/încălțăminte/mănuși -> `UM: 'per.'`.
     - Bonetă/halat/șorț/ochelari/vestă -> `UM: 'buc.'`.
     - Cantitate: `'1'`.
     - Durată: `${item.replacementMonths} luni`.
     - Data acordării: data predării din asignare, sau fallback la data angajării salariatului.
     - Semnătură: `assignment?.signatureDate ? 'Semnat' : ''`.
   - **Autocompletare și Mărimi**:
     - Corectare token haine:
       ```typescript
       PLACEHOLDER_MARIME_HAINE: (employee as any)?.clothingSize || '',
       PLACEHOLDER_MARIME_IMBRACAMINTE: (employee as any)?.clothingSize || '',
       PLACEHOLDER_MARIME_INCALTAMINTE: (employee as any)?.shoeSize || '',
       PLACEHOLDER_MARIME_MANUSI: (employee as any)?.gloveSize || '',
       PLACEHOLDER_MARIME_CASCA: '',
       ```
     - Marcare autocompleted pentru mărimi:
       ```typescript
       if ((employee as any)?.clothingSize) {
         markAutocompleted('PLACEHOLDER_MARIME_HAINE', (employee as any).clothingSize);
         markAutocompleted('PLACEHOLDER_MARIME_IMBRACAMINTE', (employee as any).clothingSize);
       }
       if ((employee as any)?.shoeSize) markAutocompleted('PLACEHOLDER_MARIME_INCALTAMINTE', (employee as any).shoeSize);
       if ((employee as any)?.gloveSize) markAutocompleted('PLACEHOLDER_MARIME_MANUSI', (employee as any).gloveSize);
       ```
     - Marcare autocompleted pentru fiecare rând de EIP provenit din BD (`PLACEHOLDER_EIP_DENUMIRE_01` etc.).
   - **Generare array-uri de buclă**:
     Alimentare `dotare_eip` și `echipamente` ca array de obiecte `{ nr, denumire, standard, um, cantitate, termen, durata, dataPredare, semnaturaPrimire }` pentru consumatori externi și compatibilitate cu viitoare șabloane.

---

### Pasul 3: Actualizarea Definițiilor (`src/lib/templates/definitions.ts`)
- În definiția `eip-fisa-acordare-individuala`:
  - Schimbare `source`:
    - `PLACEHOLDER_MARIME_HAINE` -> `source: 'employee.clothingSize'`
    - `PLACEHOLDER_MARIME_INCALTAMINTE` -> `source: 'employee.shoeSize'`
    - `PLACEHOLDER_MARIME_MANUSI` -> `source: 'employee.gloveSize'`
  - Păstrare `required: false` pentru a permite generarea parțială dacă angajatul nu are toate mărimile trecute.

---

### Pasul 4: Actualizarea Datelor de Seed (`prisma/seed.ts`)
1. Inserare Catalog Statutar EIP în `seed.ts`:
   - `EIP-INC-01`: Încălțăminte antiderapantă bucătar (EN ISO 20347, 12 luni)
   - `EIP-BON-01`: Bonetă bucătar / beretă protecție păr (HACCP / EN 340, 6 luni)
   - `EIP-HAL-01`: Halat / tunică albă bucătar bumbac (EN 340, 12 luni)
   - `EIP-SOR-01`: Șorț impermeabil protecție stropire (EN 340, 12 luni)
   - `EIP-MAN-01`: Mănuși termoprotectoare cuptor (EN 407, 12 luni)
   - `EIP-BOC-01`: Bocanci protecție S3 SRC bombeu compozit (EN ISO 20345, 12 luni)
   - `EIP-MAN-02`: Mănuși electroizolante joasă tensiune (EN 60903, 12 luni)
   - `EIP-OCH-01`: Ochelari protecție ecran filtru lumină albastră (EN 166, 24 luni)
2. Legare cerințe pe posturi (`JobEipRequirement`):
   - `Bucătar Specialist` (BISTRO GOURMET) -> `EIP-INC-01`, `EIP-BON-01`, `EIP-HAL-01`, `EIP-SOR-01`, `EIP-MAN-01`.
   - `Ospătar / Chelner` (BISTRO GOURMET) -> `EIP-INC-01`, `EIP-SOR-01`.
   - `Tehnician Mentenanță` (NEXUS SOLUTIONS) -> `EIP-BOC-01`, `EIP-MAN-02`.
   - `Inginer Sisteme Software` (NEXUS SOLUTIONS) -> `EIP-OCH-01`.
3. Setare mărimi și asignări pe salariați (`EmployeeEipAssignment`):
   - Marius Radu: `shoeSize: '42'`, `clothingSize: 'L'`, `gloveSize: '9'`, alocare EIP Bucătar.
   - Andreea Marin: `shoeSize: '37'`, `clothingSize: 'M'`, `gloveSize: '7'`, alocare EIP Ospătar.
   - Gheorghe Barbu: `shoeSize: '43'`, `clothingSize: 'L'`, `gloveSize: '10'`, alocare EIP Tehnician.
   - Alexandru Stan: `shoeSize: '42'`, `clothingSize: 'L'`, `gloveSize: '9'`, alocare EIP Birou.

---

## 5. Verification Method

Pentru verificarea independentă a implementării de către Worker:

1. **Validare Schemă și Compilare**:
   ```bash
   npx prisma validate
   npm run build
   ```

2. **Testare API Endpoints**:
   - `GET /api/eip/items`: verifică lista completă de articole statutare (cod, denumire, standard, periodicitate).
   - `POST /api/eip/items`: testează crearea unui articol nou și răspunsul 201/409.
   - `GET /api/eip/requirements?jobId=...`: verifică normativul funcției.
   - `POST /api/eip/requirements`: testează asocierea unui echipament la funcție.
   - `GET /api/eip/assignments?employeeId=...`: verifică echipamentele predate salariatului.
   - `POST /api/eip/assignments`: testează predarea unui echipament și data alocării.

3. **Verificare Rezolvitor și Generare Document DOCX**:
   Rularea generării pentru `eip-fisa-acordare-individuala`:
   ```bash
   npx tsx -e '
   const { resolveTemplatePlaceholders } = require("./src/lib/templates/resolver");
   const { renderTemplateBuffer } = require("./src/lib/templates/generator");
   const { PrismaClient } = require("@prisma/client");
   const fs = require("fs");
   const prisma = new PrismaClient();
   async function test() {
     const emp = await prisma.employee.findFirst({ where: { lastName: "Radu" } });
     const res = await resolveTemplatePlaceholders({
       templateCode: "eip-fisa-acordare-individuala",
       clientId: emp.clientId,
       employeeId: emp.id,
     });
     console.log("Marime Haine:", res.resolvedData.PLACEHOLDER_MARIME_HAINE);
     console.log("Marime Pantofi:", res.resolvedData.PLACEHOLDER_MARIME_INCALTAMINTE);
     console.log("Marime Manusi:", res.resolvedData.PLACEHOLDER_MARIME_MANUSI);
     console.log("EIP 01:", res.resolvedData.PLACEHOLDER_EIP_DENUMIRE_01);
     console.log("EIP 02:", res.resolvedData.PLACEHOLDER_EIP_DENUMIRE_02);
   }
   test();
   '
   ```
   **Condiții de invalidare**:
   - `PLACEHOLDER_MARIME_HAINE` este gol deși salariatul are `clothingSize` în BD.
   - `PLACEHOLDER_EIP_DENUMIRE_01` conține valori mock atunci când salariatul nu are atribuiri sau cerințe reale în BD.
   - Lipsesc articolele din `EmployeeEipAssignment` când salariatul are echipamente predate în BD.
