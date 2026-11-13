# RAPORT DE AUDIT ȘI SPECIFICAȚIE TEHNICĂ: CERINȚELE R4, R5 ȘI R6

**Autor**: Teamwork Specification Miner  
**Dată**: 2026-11-10  
**Proiect**: Aplicație SSM / Igienă / HR (România)  
**Document Sursă**: `ORIGINAL_REQUEST.md`  
**Stare Bază de Date**: PostgreSQL cu Prisma ORM 6.19.3, Next.js 16 (App Router)

---

## 1. REZUMAT EXECUTIV

Prezentul raport oferă analiza completă, verificată la nivel de fișier, linie de cod și interogare a bazei de date, pentru următoarele trei cerințe strategice:
1. **R4: Sincronizare Modul Instruiri cu Documentele Statutare** (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005);
2. **R5: Gestiunea EIP (HG 1048/2006)**;
3. **R6: Evaluări de Risc și Plan de Prevenire** (Metoda INCDPM Pece, HG 1425/2006 art. 15).

### Descoperiri Critice Majore:
- **R4**: În `resolver.ts` (l. 1747-1758), toate datele instruirilor introductiv-generale (IG) și la locul de muncă (LM) SSM și PSI (`PLACEHOLDER_DATA_INSTRUIRE_IG`, `PLACEHOLDER_DATA_INSTRUIRE_LM`, `PLACEHOLDER_DATA_ADMITERE`) sunt hardcodate la `hireDateRo` (data angajării), ignorând complet evenimentele reale de instruire din baza de date. Mai mult, tipurile de evenimente salvate de API (`PERIODIC_SSM`, `PERIODIC_PSI`) sunt filtrate în `resolver.ts` (l. 1311, 1364) după `e.type === 'ssm'` și `e.type === 'psi' || e.type === 'su'`, ceea ce duce la ignorarea 100% a sesiunilor periodice înregistrate. În plus, `generate/page.tsx` și `generate-batch/route.ts` conțin un blocaj neconform prin care un salariat cu instruirea expirată este blocat de la generarea fișei de instruire (Catch-22).
- **R5**: Tabelele `EipItem`, `JobEipRequirement` și `EmployeeEipAssignment` există în schema Prisma și în baza de date PostgreSQL (8 articole EIP și 8 cerințe pe posturi existente), însă **nu există niciun endpoint API și nicio interfață UI** care să le gestioneze. În `resolver.ts` (l. 450-545, 1658-1712), fișa EIP (`eip-fisa-acordare-individuala`) este complet populată cu date mock hardcodate (inclusiv mărimi fictive 42 / L / 9 și un tabel static de 10 echipamente).
- **R6**: Modelele `RiskAssessment`, `RiskItem`, `PreventionMeasure` și `HazardZone` există în Prisma, însă baza de date are 0 evaluări înregistrate, neexistând niciun flux API de CRUD (`/api/risk-assessments/...`) și niciun formular de creare/editare în UI. Șablonul `risk-evaluare` și `risk-plan-prevenire-tesa` se bazează exclusiv pe preseturi statice din `caen-risk-presets.ts`, generând responsabili hardcodați static (`"CLM / Lucrător desemnat SSM"`) și termene statice (`"Permanent"`), ocolind complet tabelele relaționale din baza de date.

---

## 2. INVESTIGAȚIE DETALIATĂ R4: SINCRONIZARE MODUL INSTRURI CU DOCUMENTELE STATUTARE

### 2.1 Modelele Prisma și Starea Datelor
În `prisma/schema.prisma`:
- `TrainingEvent` (l. 437-454): `id`, `clientId`, `type`, `eventDate`, `durationHours`, `materialOrTopic`, `practicalDemonstration`, `instructorName`, `verifierName`, `location`, `status` (`@default("planned")`).
- `TrainingParticipant` (l. 456-469): `id`, `eventId`, `employeeId`, `result` (`@default("admis")`), `recordedAt`, `scannedSheetUrl`. Relație `@@unique([eventId, employeeId])`.
- `Employee` (l. 240-249): `ssmLastTrainingDate`, `ssmIntervalMonths` (def 6), `ssmNotes`, `psiLastTrainingDate`, `psiIntervalMonths` (def 6), `psiNotes`.
- Relații: `Client.trainingEvents`, `Employee.trainingParticipants`.

### 2.2 Fluxul Curent de Înregistrare a Sesiunilor
- **UI**: `src/app/trainings/page.tsx` și `src/components/training-planner-modal.tsx`.
- **API**: `POST /api/trainings/record` (`src/app/api/trainings/record/route.ts`).

#### Blocaje și Deficiențe Identificate în Înregistrare:
1. **Interzicerea Planificării Viitoare în API** (`src/app/api/trainings/record/route.ts`, l. 43-50):
   ```typescript
   const now = new Date();
   const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
   if (parsedDate.getTime() > endOfToday.getTime()) {
     return NextResponse.json(
       { error: 'Data instruirii nu poate fi în viitor.' },
       { status: 400 }
     );
   }
   ```
   API-ul respinge orice dată viitoare, făcând imposibilă funcția de **planificare** a instruirilor viitoare, deși modelul Prisma prevede starea `status: "planned"`!
2. **Limitare în Date Picker UI** (`src/components/training-planner-modal.tsx`, l. 354):
   `<input type="date" required max={new Date().toISOString().split('T')[0]} ... />`
   Inputul HTML restricționează data la maximum ziua curentă.
3. **Actualizarea Prematură a Scadențelor**:
   Dacă un eveniment este salvat, API-ul actualizează imediat `ssmLastTrainingDate` / `psiLastTrainingDate` la salariați (l. 141, 153), chiar dacă evenimentul ar trebui doar planificat! Pentru o sesiune planificată (`status: "planned"`), scadența salariatului **nu trebuie actualizată** până când sesiunea nu devine `recorded` / `performed`.

### 2.3 Utilizarea Eronată a `hireDate` în Locul Datei Reale a Evenimentului
În `src/lib/templates/resolver.ts` (l. 1747-1758):
```typescript
PLACEHOLDER_DATA_INSTRUIRE_IG: hireDateRo,
PLACEHOLDER_DATA_INSTRUIRE_LM: hireDateRo,
PLACEHOLDER_DATA_ADMITERE: hireDateRo,
PLACEHOLDER_ADMITERE_NUME: legalRepresentativeName,

PLACEHOLDER_INSTRUCTOR_IG_PSI: psiOfficer,
PLACEHOLDER_VERIFICATOR_IG_PSI: legalRepresentativeName,
PLACEHOLDER_INSTRUCTOR_LM_PSI: designatedWorker,
PLACEHOLDER_VERIFICATOR_LM_PSI: designatedWorker,
PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: hireDateRo,
PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: hireDateRo,
PLACEHOLDER_DATA_ADMITERE_PSI: hireDateRo,
PLACEHOLDER_ADMITERE_NUME_PSI: legalRepresentativeName,
```
**Anomalie Identificată**:
Data instruirii introductiv-generale și la locul de muncă este forțată la data angajării (`hireDateRo`). Dacă un salariat a fost instruit prin eveniment înregistrat de tip `INTRODUCTIV` sau `LOC_MUNCA`, data reală, durata și numele formatorului din eveniment sunt complet ignorate!

Mai mult, în `src/lib/templates/definitions.ts` (l. 3513, 3518, 3524, 3604, 3609, 3615), sursa declarativă a fost eronat documentată ca:
`source: 'employee.hireDate'`!

### 2.4 Nepotrivirea Tipurilor de Evenimente între API și Resolver
- În `POST /api/trainings/record` (l. 27), tipurile permise și salvate în coloana `TrainingEvent.type` sunt:
  `['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM', 'PERIODIC_PSI']`.
- În `src/lib/templates/resolver.ts` (l. 1310-1312 și 1363-1365):
  ```typescript
  const ssmEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => !e.type || e.type === 'ssm'
  );
  ...
  const psiEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => e.type === 'psi' || e.type === 'su'
  );
  ```
  **Consecință Gravă**:
  Niciun eveniment de tip `PERIODIC_SSM` sau `PERIODIC_PSI` nu corespunde filtrelor `'ssm'` sau `'psi'`. Rezultatul este că tabelele multianuale de instruire periodică din Fișa Individuală SSM (`instruiriPeriodiceSSM`) și din Fișa Individuală PSI (`instructajePeriodicePSI`) **rămân complet goale**!
  În plus, resolverul filtra la nivel de client (`client.trainingEvents`), fără a verifica dacă salariatul respectiv a participat efectiv la sesiune (`trainingParticipants`).

### 2.5 Documentele Statutare de Instruire
1. **Fișele Individuale Existente**:
   - `ssm-fisa-instruire-individuala` (Anexa 11 HG 1425/2006)
   - `psi-fisa-instructaj-individuala` (Anexa OMAI 712/2005)
2. **Procesele-Verbale Colective Solicitate**:
   - `ssm-pv-instruire-colectiva` (Proces-Verbal de Instruire Colectivă SSM)
   - `psi-pv-instruire` (Proces-Verbal de Instruire în Domeniul Situațiilor de Urgență PSI)
   Aceste două documente sunt procesele-verbale legale care se semnează de toți salariații prezenți la o sesiune de instruire de grup.
3. **Tematici Suport**:
   - `training-tematica-introductiv` (Tematică IG 4 ore)
   - `training-tematica-loc-munca` (Tematică LM și periodică)

### 2.6 Blocajul de Expirare (Catch-22)
În `src/app/documents/generate/page.tsx` (l. 86-97, 1274-1281):
```typescript
if (code.includes('ssm') || code.includes('instruire') || code === 'training-detaliu-introductiv' || code === 'training-tematica-loc-munca') {
  const ssm = employee.compliance.ssmTraining;
  if (ssm && ssm.status === 'OVERDUE') {
    return {
      isExpired: true,
      badgeText: `Expirat (${days} zile)`,
      reason: `Instructaj SSM depășit... Conform legii, documentul nu poate fi emis înainte de reinstruire.`,
    };
  }
}
```
Iar la linia 1280: dacă `isExpired === true`, butonul de generare este dezactivat (`isGenerateDisabled = true`), iar în modul batch checkbox-ul este dezactivat (`disabled={exp.isExpired}`).
În `src/app/api/documents/generate-batch/route.ts` (l. 146-168): dacă salariatul este expirat, ruta returnează `HTTP 422 Unprocessable Entity`!

**Eroare Fundamentală de Logică de Business**:
Fișa de instruire se emite tocmai pentru a realiza și consemna instruirea atunci când cea anterioară a expirat! Blocarea emiterii fișei pentru un salariat expirat împiedică procesul legal de remediere a neconformității.

### 2.7 Soluție Tehnică Recomandată pentru R4:
1. **Modificare API `POST /api/trainings/record`**:
   - Suportă parametrul `status: 'planned' | 'recorded'`.
   - Permite date în viitor dacă `status === 'planned'`.
   - Dacă `status === 'planned'`, **nu** actualizează `ssmLastTrainingDate` / `psiLastTrainingDate`.
   - Permite endpoint suplimentar `PATCH /api/trainings/[id]/complete` pentru a marca o sesiune planificată ca efectuată/consemnată (`recorded`), actualizând atunci scadențele participanților.
2. **Corecție `resolver.ts`**:
   - Filtrează evenimentele după participarea efectivă a salariatului (`employee.trainingParticipants.map(tp => tp.event)`).
   - Normalizează verificarea tipurilor:
     - SSM Periodic: `['PERIODIC_SSM', 'ssm', 'periodic', 'suplimentar'].includes(e.type)`
     - PSI Periodic: `['PERIODIC_PSI', 'psi', 'su'].includes(e.type)`
     - SSM IG: `['INTRODUCTIV', 'introductiv_general'].includes(e.type)`
     - SSM LM: `['LOC_MUNCA', 'loc_de_munca'].includes(e.type)`
   - Înlocuiește `hireDateRo` cu data reală a evenimentului `INTRODUCTIV` / `LOC_MUNCA` dacă există, lăsând fallback curat numai la lipsa oricărei înregistrări.
3. **Eliminare Blocaj Expirare**:
   - În `src/app/documents/generate/page.tsx` și `generate-batch/route.ts`, șabloanele de instruire (`ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`, `ssm-pv-instruire-colectiva`, `psi-pv-instruire`, tematici) **nu trebuie blocate** de statusul `OVERDUE`. Ele pot afișa o alertă informativă galbenă/albastră ("Necesită consemnare reinstruire"), dar generarea rămâne 100% activă.
4. **Acțiuni pe Cardurile din `/trainings`**:
   - Pe fiecare card de sesiune, se adaugă butoane operative:
     - `Descarcă PV Instruire` (generează DOCX proces-verbal colectiv cu toți participanții);
     - `Descarcă Tematică` (link direct la descărcarea tematicii SSM sau PSI asociate);
     - `Generează Fișe Individuale` (descărcare pachet ZIP sau fișă individuală pentru cursanții din grup).

---

## 3. INVESTIGAȚIE DETALIATĂ R5: GESTIUNEA EIP (HG 1048/2006)

### 3.1 Modelele Prisma și Starea Datelor
Modelele există în `prisma/schema.prisma` (l. 624-658):
```prisma
model EipItem {
  id                String   @id @default(uuid())
  code              String   @unique
  name              String   
  standardCode      String?  
  protectionType    String?  
  replacementMonths Int      @default(12)
  requirements      JobEipRequirement[]
  assignments       EmployeeEipAssignment[]
}

model JobEipRequirement {
  id        String   @id @default(uuid())
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  eipItemId String
  eipItem   EipItem  @relation(fields: [eipItemId], references: [id], onDelete: Cascade)
  @@unique([jobId, eipItemId])
}

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
Pe modelul `Employee` (l. 281-283):
- `shoeSize` (String?)
- `clothingSize` (String?)
- `gloveSize` (String?)

**Interogare Bază de Date**:
- `EipItem`: 8 înregistrări active (`EIP-INC-01`, `EIP-BON-01`, `EIP-HAL-01`, `EIP-SOR-01`, `EIP-MAN-01`, `EIP-BOC-01`, `EIP-MAN-02`, `EIP-OCH-01`).
- `JobEipRequirement`: 8 cerințe alocate (pe posturile de Bucătar și Ajutor Bucătar).
- `EmployeeEipAssignment`: **0 înregistrări**.

### 3.2 Lipsa Rutelor API și a Componentelor UI
O căutare globală în `src/` confirmă:
- **0 rute API** pentru EIP (nu există `/api/eip`, `/api/eip/items`, `/api/jobs/[id]/eip`, `/api/employees/[id]/eip`).
- **0 componente UI** pentru vizualizarea catalogului EIP, configurarea cerințelor pe post sau alocarea echipamentului la salariați.

### 3.3 Șablonul `eip-fisa-acordare-individuala` și Hardcodările din Resolver
În `src/lib/templates/definitions.ts` (l. 3812-3862):
Șablonul are 10 rânduri de dotare: `PLACEHOLDER_EIP_DENUMIRE_01` .. `10`, `PLACEHOLDER_EIP_STANDARD_01` .. `10`, etc.

În `src/lib/templates/resolver.ts`:
1. **Mărimi corporale fictive** (l. 1658-1660):
   ```typescript
   PLACEHOLDER_MARIME_INCALTAMINTE: (employee as any)?.shoeSize || '42',
   PLACEHOLDER_MARIME_IMBRACAMINTE: (employee as any)?.clothingSize || 'L',
   PLACEHOLDER_MARIME_MANUSI: (employee as any)?.gloveSize || '9',
   ```
   Dacă baza de date nu are mărimi, resolverul injectează arbitrar 42 / L / 9! În plus, în `definitions.ts`, câmpul pentru haine se numește `PLACEHOLDER_MARIME_HAINE`, astfel că tokenul cădea pe dicționarul static de fallback (l. 441: `'M / 48'`)!
2. **Tabelul de Echipamente Hardcodat** (l. 450-545 și 1673-1712):
   Resolverul injectează fie 10 rânduri mock statice, fie dacă postul conține "bucătar" / "barman", suprascrie cu 5 articole de bucătar scrise manual în cod, iar dacă conține "tehnician", suprascrie cu alte 5 articole scrise manual în cod.
   Tabelele `JobEipRequirement` și `EmployeeEipAssignment` **nu sunt interogate niciodată**!

### 3.4 Soluție Tehnică Recomandată pentru R5:
1. **Creare Rute API EIP**:
   - `GET /api/eip/items`: returnează catalogul complet de articole EIP.
   - `POST /api/eip/items`: adăugare articol nou de protecție (nume, cod standard, tip protecție, durată luni).
   - `GET /api/jobs/[id]/eip` și `PUT /api/jobs/[id]/eip`: gestionarea necesarului de dotare pe post (`JobEipRequirement`).
   - `GET /api/employees/[id]/eip` și `POST /api/employees/[id]/eip`: gestionarea predării efective de EIP către salariat (`EmployeeEipAssignment`), inclusiv data predării și data semnăturii.
2. **Corecție `resolver.ts` pentru `eip-fisa-acordare-individuala`**:
   - Încarcă `employee.eipAssignments` (cu `include: { eipItem: true }`).
   - Dacă salariatul nu are atribuiri efective consemnate, încarcă norma pe post: `job.eipRequirements` (cu `include: { eipItem: true }`).
   - Mapează primele până la 10 articole în tokenurile `PLACEHOLDER_EIP_DENUMIRE_01..10`, `PLACEHOLDER_EIP_STANDARD_01..10`, `PLACEHOLDER_EIP_UM_01..10`, `PLACEHOLDER_EIP_DURATA_01..10`, `PLACEHOLDER_EIP_DATA_ACORDARII_01..10` din DB.
   - Rândurile nealocate rămân șiruri vide `""`, fără texte inventate.
   - Leagă `PLACEHOLDER_MARIME_HAINE` de `employee.clothingSize`, `PLACEHOLDER_MARIME_INCALTAMINTE` de `employee.shoeSize` și `PLACEHOLDER_MARIME_MANUSI` de `employee.gloveSize`. Fără fallback-uri inventate (dacă lipsesc, rămân goale și raportate sincer ca lipsă).
3. **Componente UI**:
   - Tab / Secțiune EIP în fișa de detalii angajat (`/employees` sau modal editare): afișează mărimile (încălțăminte, haine, mănuși) și tabelul de echipamente predate.
   - Selector EIP în configuratorul postului de lucru din `/clients/[id]`.

---

## 4. INVESTIGAȚIE DETALIATĂ R6: EVALUĂRI DE RISC ȘI PLAN DE PREVENIRE

### 4.1 Modelele Prisma și Starea Datelor
În `prisma/schema.prisma` (l. 348-418):
- `RiskAssessment`: `id`, `clientId`, `worksiteId`, `jobId`, `title`, `method` (`"INCDPM"`), `version`, `evaluatorName`, `conclusions`, `status` (`draft, field_data_complete, expert_review, active`).
- `RiskItem`: `id`, `assessmentId`, `hazard`, `riskSituation`, `consequence`, `severityScore` (1-7), `probabilityScore` (1-6), `riskLevel` (1-7), `existingMeasures`, `residualRiskLevel`, `sortOrder`.
- `PreventionMeasure`: `id`, `assessmentId`, `riskItemId`, `description`, `measureType` (`tehnica, organizatorica, igienico-sanitara, altul`), `responsiblePerson`, `deadline`, `status` (`planificat, in_curs, realizat`), `resources`.
- `HazardZone`: `id`, `assessmentId`, `zoneName`, `location`, `hazardDescription`, `safetyMeasures`.

**Interogare Bază de Date**:
- `RiskAssessment`: **0 înregistrări**.
- `RiskItem`: **0 înregistrări**.
- `PreventionMeasure`: **0 înregistrări**.
- `HazardZone`: **0 înregistrări**.

### 4.2 Analiza Paginilor `/risk-assessments` și `/clients/[id]`
- În `src/app/risk-assessments/page.tsx`:
  - Afișează un card gol dacă `assessments.length === 0`.
  - Nu există **niciun buton de adăugare/creare a unui dosar de evaluare**.
  - Nu există nicio rută API `/api/risk-assessments`.
- În `src/app/clients/[id]/page.tsx`:
  - `riskAssessments` este interogat la linia 66, dar **nu este randat nicăieri în pagină**.

### 4.3 Generarea Șabloanelor `risk-evaluare` și `risk-plan-prevenire-tesa`
În `src/lib/templates/resolver.ts` (l. 1090-1137, 1408-1445):
- Evaluarea se bazează exclusiv pe funcția statică `getRiskProfileForCaen(caenCode, job?.title)` din `src/lib/risk/caen-risk-presets.ts`.
- Planul de prevenire (`planPrevenire`) construiește rândurile exclusiv din factorii statici din preset:
  ```typescript
  return {
    nr: idx + 1,
    riscEvaluat: f.riskFactor,
    ...
    termen: 'Permanent',
    responsabil: 'CLM / Lucrător desemnat SSM',
  };
  ```
  **Consecințe**:
  Termenul și responsabilul sunt 100% statice și generice, indiferent de companie, punct de lucru sau specificul activității. Tabelele persistate `RiskAssessment` și `PreventionMeasure` sunt complet ignorate la generare!

### 4.4 Flagurile de Risc pe Modelul `Job`
Pe modelul `Job` (l. 172-177):
- `isFoodHandling` (Boolean @default(false))
- `isScreenWork` (Boolean @default(false))
- `isDrivingRequired` (Boolean @default(false))
- `workPosture` (String?)
- `maxWeightKg` (Float?)
- `noiseExposed` (Boolean @default(false))

**Stare Curentă**:
Aceste câmpuri au fost adăugate în schemă, dar:
- Nu există niciun formular în UI unde utilizatorul să poată bifa aceste flaguri sau introduce postura / greutatea maximă!
- Nu există nicio rută API dedicată pentru CRUD posturi (`/api/jobs` sau `/api/clients/[id]/jobs`).

### 4.5 Soluție Tehnică Recomandată pentru R6:
1. **Rute API CRUD pentru Evaluări de Risc**:
   - `GET /api/risk-assessments`: listare dosare (cu filtrare după `clientId`, `jobId`).
   - `POST /api/risk-assessments`: creare dosar nou de evaluare. Opțional, poate accepta parametrul `initializeFromPreset: true`, preluând factorii și măsurile din `CAEN_RISK_PROFILES` pentru a le persista în tabelele `RiskItem` și `PreventionMeasure`, unde operatorul le poate edita.
   - `GET /api/risk-assessments/[id]`: detalii complete ale dosarului, factorilor și măsurilor.
   - `PUT /api/risk-assessments/[id]`: actualizare titlu, concluzii, evaluator, factori de risc (gravitate, probabilitate) și măsuri de prevenire (tip, descriere, responsabil specific, termen specific).
   - `DELETE /api/risk-assessments/[id]`: ștergere dosar.
2. **Rute API pentru Posturi (`Job`)**:
   - `POST /api/clients/[id]/jobs` și `PUT /api/clients/[id]/jobs/[jobId]`: configurare funcție, COR, activități, precum și flagurile de risc: `isFoodHandling`, `isScreenWork`, `isDrivingRequired`, `workPosture`, `maxWeightKg`, `noiseExposed`.
3. **Conectare Resolver la Dosarul Persistat**:
   - În `resolver.ts`, dacă pentru clientul și postul selectat există un `RiskAssessment` în baza de date:
     - Calculează scorul global de risc din `riskItems` reale salvate:
       $N_{rg} = \frac{\sum_{i=1}^n r_i \cdot R_i}{\sum_{i=1}^n r_i}$ conform formulei INCDPM;
     - Populează `dynamic30Factors` din `riskItems`;
     - Populează colecția `planPrevenire` din `preventionMeasures` salvate în DB, utilizând `responsiblePerson` și `deadline` specifice introduse de utilizator;
     - Preluarea concluziilor din `assessment.conclusions` și a numelui evaluatorului din `assessment.evaluatorName`.
4. **Interfață UI**:
   - În `/risk-assessments`: buton "Evaluare Nouă" cu modal de configurare și tabel interactiv de factori și măsuri.
   - În `/clients/[id]`: tab de Evaluări de Risc și modal "Adaugă / Editează Post de Lucru" cu comutatoare pentru riscurile specifice (alimente, ecran, conducere, zgomot, postură, greutate).

---

## 5. TABEL DE CORELAȚIE CÂMPURI, RUTE ȘI COMPONENTE

| Cerință | Componentă / Fișier | Stare Curentă | Deficiență Identificată | Măsură Necesară |
|---|---|---|---|---|
| **R4** | `src/app/api/trainings/record/route.ts` | Existent | Respinge datele viitoare (l. 45-50); forțează `status: recorded` și actualizează scadențele imediat | Permitere `status: planned` fără actualizarea scadențelor; acceptare date viitoare |
| **R4** | `src/components/training-planner-modal.tsx` | Existent | `max={today}` pe input dată; lipsește selectorul planificat/efectuat | Eliminare `max`; adăugare comutator "Planificare" vs "Consemnare Efectuată" |
| **R4** | `src/lib/templates/resolver.ts` | Existent | Hardcodează `hireDateRo` pentru IG și LM (l. 1747-1758); filtrează după `ssm`/`psi` în loc de `PERIODIC_SSM`/`PERIODIC_PSI` (l. 1311, 1364) | Legare la datele reale din `TrainingEvent`; extindere filtru tipuri eveniment |
| **R4** | `src/app/documents/generate/page.tsx` & `generate-batch` | Existent | Blochează emiterea fișei de instruire dacă salariatul este `OVERDUE` (Catch-22) | Eliminare blocaj `isExpired` pentru șabloanele de instruire |
| **R4** | `src/app/trainings/page.tsx` | Existent | Cardurile de sesiune nu au acțiuni de descărcare documente | Adăugare butoane: Descarcă PV, Descarcă Tematică, Fișe Individuale |
| **R5** | `prisma/schema.prisma` | Existent | Modele `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment` create dar neutilizate | Păstrare schemă; creare rute API și UI |
| **R5** | `src/lib/templates/resolver.ts` | Existent | Mărimi fallback arbitrare 42/L/9 (l. 1658); tabel static mock de 10 rânduri (l. 450) | Înlocuire cu date reale din `EmployeeEipAssignment` și `JobEipRequirement`; eliminare mărimi mock |
| **R5** | `src/app/api/eip/...` | Lipsă | Nu există rute pentru catalog EIP, cerințe post sau atribuiri salariați | Implementare `GET/POST /api/eip/items`, `GET/PUT /api/jobs/[id]/eip`, `GET/POST /api/employees/[id]/eip` |
| **R6** | `prisma/schema.prisma` | Existent | Modele `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone` există dar au 0 înregistrări | Creare flux complet de salvare și editare |
| **R6** | `src/app/api/risk-assessments/...` | Lipsă | Nu există rute API pentru dosarele de evaluare a riscurilor | Implementare CRUD complet `/api/risk-assessments` |
| **R6** | `src/lib/templates/resolver.ts` | Existent | Generează din preseturi CAEN cu responsabili și termene statice ("Permanent", "CLM") | Preluare date din dosarul persistat `RiskAssessment` și `PreventionMeasure` |
| **R6** | `src/app/clients/[id]/page.tsx` | Existent | Nu permite editarea flagurilor de risc pe post (`isFoodHandling`, `isScreenWork`, etc.) | Modal "Adaugă / Editează Post" cu configurator de riscuri |

---

## 6. SPECIFICAȚIE PENTRU PROCESELE-VERBALE DE INSTRUIRE COLECTIVĂ

Pentru `ssm-pv-instruire-colectiva` și `psi-pv-instruire`, documentele statutare generate pentru fiecare sesiune consemnată trebuie să respecte structura:
1. **Antet Companie**: Denumire, CUI, Reg. Com., Sediu Social, Punct de Lucru.
2. **Titlu Oficial**:
   - `PROCES-VERBAL DE INSTRUIRE COLECTIVĂ PRIVIND SECURITATEA ȘI SĂNĂTATEA ÎN MUNCĂ` (conform Legii 319/2006 și HG 1425/2006);
   - `PROCES-VERBAL DE INSTRUCTAJ ÎN DOMENIUL SITUAȚIILOR DE URGENȚĂ (PSI / SU)` (conform Legii 307/2006 și OMAI 712/2005).
3. **Date de Identificare Sesiune**:
   - Data desfășurării, Durata consemnată (ore), Locația instruirii;
   - Instructor / Formator: Nume, calitatea (Specialist SSM abilitat, Lucrător Desemnat, Cadru Tehnic PSI);
   - Tematica / Materialul predat și demonstrațiile practice efectuate.
4. **Tabel Colectiv Participanți**:
   - Nr. crt.
   - Nume și prenume salariat
   - Funcția / Postul de lucru
   - CNP (mascat conform GDPR)
   - Rezultat verificare cunoștințe (`Admis`)
   - Spațiu pentru semnătură olografă
5. **Bloc Semnături Subsol**:
   - Întocmit: Formator / Instructor SSM sau PSI;
   - Verificat / Aprobat: Administrator / Reprezentant Legal.

---

## 7. CONCLUZIE

Toate cerințele R4, R5 și R6 au la bază modele de date deja bine structurate în schema Prisma, însă legăturile funcționale din API, resolver și interfețele UI au fost fie omise, fie simulate prin fallback-uri mock hardcodate. Urmând specificațiile tehnice de mai sus, echipa de implementare poate conecta curat datele reale din PostgreSQL în fluxul de generare docx/pdf, eliminând toate blocajele neconforme și datele fictive.
