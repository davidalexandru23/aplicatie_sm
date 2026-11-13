# Raport Exhaustiv de Investigare: Cerințele R7, R8 și Infrastructura de Testare & Verificare

**Data:** 10 Noiembrie 2026  
**Autor:** Teamwork Explorer (Survey Agent 3)  
**Workspace:** `/Users/davidalexandru/Documents/Proiect_SSM`  
**State Folder:** `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_explorer_survey_3`  
**Referință Document:** `.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. Sinteză Executivă & Infrastructura de Testare și Verificare

### 1.1. Statusul Configurației de Proiect (`package.json`)
O inspecție a fișierului `package.json` relevă următoarea configurație a scripturilor și dependențelor:
```json
{
  "name": "ssm-internal-system",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3",
    "@tailwindcss/postcss": "^4.3.3",
    "docxtemplater": "^3.71.1",
    "lucide-react": "^1.66.0",
    "next": "16.4.3",
    "pdf-lib": "^1.17.1",
    "pizzip": "^3.3.0",
    "postcss": "^8.5.32",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "xlsx": "^0.18.5",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@tailwindcss/turbopack": "^4",
    "@types/node": "^20",
    "@types/pizzip": "^3.0.5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.3",
    "prisma": "^6.19.3",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

#### Constatări Cheie:
1. **Lipsa framework-urilor clasice de testare**: Nu există `jest`, `vitest` sau `playwright` instalate în `node_modules` și nici declarate în `devDependencies`.
2. **Absența scriptului `"test"`**: `package.json` conține doar `dev`, `build`, `start`, `lint`. Nu există o comandă `npm test`.
3. **Arhitectura Suitelor de Testare Personalizate**: Proiectul utilizează scripturi TypeScript de înaltă precizie executate prin `npx tsx`:
   - `scripts/verify-all.ts` — Poarta unificată de acceptanță (orchestrează cele 5 suite majore).
   - `scripts/test-all-templates-generation.ts` — Generarea și verificarea la nivel de disc a celor 31 de șabloane statutare (29 DOCX, 2 XLSX) cu verificare a 0 token-uri necompletate.
   - `scripts/verify-compliance.ts` — 45 de teste unitare statutare (calcul scadențe, month clamping, imunitate DST, ierarhie de status).
   - `scripts/verify-excel-import-export.ts` — 6 teste de reziliență import/export Excel (parsare curată, parsare date corupte, commit parțial, pașapoarte expați, round-trip).
   - `scripts/e2e-suite.ts` — 53 de cazuri de testare E2E pe 4 nivele (Tier 1-4).
4. **Validarea Schemei Prisma**: Comanda `npx prisma validate` rulează cu succes (`The schema at prisma/schema.prisma is valid 🚀`).
5. **Integritatea Compilării Next.js**: Comanda `npm run build` rulează complet cu succes (Next.js 16.4.3 cu Turbopack, 14 pagini statice și 21 de rute dinamice compilate fără erori).

#### Recomandare Imediată pentru `package.json`:
Adăugarea scripturilor de testare în `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "npx tsx scripts/verify-all.ts",
  "test:compliance": "npx tsx scripts/verify-compliance.ts",
  "test:e2e": "npx tsx scripts/e2e-suite.ts",
  "test:templates": "npx tsx scripts/test-all-templates-generation.ts",
  "test:excel": "npx tsx scripts/verify-excel-import-export.ts"
}
```

---

## 2. Cerința R7: Selecția Contextului și Corectitudinea Pachetelor

### 2.1. Selecția Punctului de Lucru (`worksiteId`) și a Postului (`jobId`)

#### Observații în UI (`src/app/documents/generate/page.tsx`):
1. **Absența Completă a Selectorului de Punct de Lucru**:
   - În `src/app/documents/generate/page.tsx`, căutarea după termenul `worksite` nu returnează niciun rezultat.
   - Interfața permite selectarea Clientului (`selectedClientId`), a Șablonului (`selectedTemplateCode`), a Angajatului (`selectedEmployeeId`) și a Postului (`selectedJobId`), dar **nu conține niciun dropdown sau state pentru `worksiteId`**.
2. **Deficiențe la Selectorul de Post (`selectedJobId`)**:
   - La liniile 313-316:
     ```typescript
     if (isJobContext && data.jobs.length > 0) {
       setSelectedJobId((prev) =>
         data.jobs.some((j: any) => j.id === prev) ? prev : data.jobs[0].id
       );
     }
     ```
     Dacă utilizatorul comută pe un document contextual de post, aplicația auto-selectează forțat primul post al companiei (`data.jobs[0].id`), în loc să oblige utilizatorul să selecteze explicit postul relevant.
   - La liniile 380-383:
     ```typescript
     const effectiveJobId =
       isHygieneTemplate || !isJobContext
         ? undefined
         : (selectedJobId || undefined);
     ```
   - Liniile 1017-1036 afișează dropdown-ul de funcție doar dacă `isJobContext` este adevărat. Totuși, dacă un salariat este selectat pentru un document la nivel de salariat, postul este legat automat din `emp.currentJobId`, dar dacă documentul necesită un punct de lucru specific (ex. clauză CIM, decizie detașare, evaluare risc pe punct de lucru), punctul de lucru este complet inaccesibil.

#### Observații în Rutele API:
1. **`src/app/api/documents/generate/route.ts` (linii 9-36)**:
   ```typescript
   const {
     templateCode,
     clientId,
     employeeId,
     jobId,
     hygieneSessionId,
     hygieneParticipantId,
     customFields,
     operatorName = 'Operator Intern',
   } = body;
   ```
   Ruta `POST /api/documents/generate` extrage `jobId`, dar **ignoră complet `worksiteId`**! Nu îl extrage din request body și nu îl transmite către `resolveTemplatePlaceholders`.
2. **`src/app/api/templates/[code]/fields/route.ts` (linii 10-31)**:
   Ruta `GET /api/templates/[code]/fields` extrage `clientId`, `employeeId`, `jobId`, `hygieneSessionId`, `hygieneParticipantId` din `searchParams`, dar nu citește parametrul `worksiteId`.

### 2.2. Mecanismul de Fallback pe Primul Angajat (`employee[0]`) și Primul Post (`jobs[0]`) din Resolver

#### Observații în `src/lib/templates/resolver.ts`:
1. **Fallback pe `client.employees[0]` (Liniile 2043-2056)**:
   În funcția `loadResolverContext(ctx)`:
   ```typescript
   const employee = ctx.employeeId
     ? (client.employees.find((e) => e.id === ctx.employeeId) ||
         (await prisma.employee.findFirst({
           where: { id: ctx.employeeId, clientId: ctx.clientId },
           include: {
             identityDocument: true,
             residenceAddress: true,
             currentJob: true,
             currentWorksite: true,
           },
         })))
     : client.employees && client.employees.length > 0
     ? client.employees[0]
     : null;
   ```
   **Viciu Critic**: Dacă `ctx.employeeId` nu este specificat (de exemplu, la generarea unui document la nivel de firmă, a unei decizii organizatorice sau dacă utilizatorul a uitat să selecteze un angajat), resolver-ul **îl încarcă automat pe primul angajat al companiei (`client.employees[0]`)**!
   Aceasta duce la:
   - Poluarea contextului documentelor generale cu datele cu caracter personal (Nume, CNP, Adresă, Salariu) ale primului angajat din baza de date.
   - Mascarea erorilor de selecție: un document care necesită date de salariat nu va raporta câmpurile ca fiind lipsă, ci le va completa cu datele lui `client.employees[0]`.

2. **Suprascrierea Selectorului `jobId` și Fallback pe `jobs[0]` (Linia 2058)**:
   ```typescript
   const selectedJob = employee?.currentJob || client.jobs.find((j) => j.id === ctx.jobId) || (client.jobs && client.jobs[0]) || null;
   ```
   **Viciu Dublu**:
   - Dacă a fost încărcat un angajat (inclusiv prin fallback-ul `client.employees[0]`), proprietatea `employee?.currentJob` are prioritate față de `ctx.jobId`. Astfel, **selecția manuală a utilizatorului din dropdown-ul `jobId` este ignorată**!
   - Dacă `ctx.jobId` nu este specificat, resolver-ul apelează la `(client.jobs && client.jobs[0])`, injectând arbitrar atribuțiile și riscurile primului post din firmă.

3. **Fallback pe `client.worksites[0]` și ignorarea `worksiteId` (Linia 2059)**:
   ```typescript
   const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;
   ```
   Resolver-ul nu verifică deloc vreun `ctx.worksiteId`. În plus, dacă angajatul nu are punct de lucru sau generarea este fără angajat, alege primul punct de lucru din firmă (`client.worksites[0]`).

4. **Definiția `TemplateResolutionContext` (Liniile 15-24)**:
   ```typescript
   export interface TemplateResolutionContext {
     templateCode: string;
     clientId: string;
     employeeId?: string;
     jobId?: string;
     hygieneSessionId?: string;
     hygieneParticipantId?: string;
     customOverrides?: Record<string, unknown>;
     allowOfflineBlank?: boolean;
   }
   ```
   Câmpul `worksiteId?: string;` lipsește din interfață.

#### Plan de Eliminare a Fallback-urilor (Roadmap Tehnic):
1. În `TemplateResolutionContext` și `TemplateResolutionOptions`:
   - Adăugare `worksiteId?: string;`.
2. În `loadResolverContext`:
   - Înlocuire fallback angajat:
     ```typescript
     const employee = ctx.employeeId
       ? (client.employees.find((e) => e.id === ctx.employeeId) ||
           (await prisma.employee.findFirst({
             where: { id: ctx.employeeId, clientId: ctx.clientId },
             include: {
               identityDocument: true,
               residenceAddress: true,
               currentJob: true,
               currentWorksite: true,
             },
           })))
       : null; // NICIODATĂ client.employees[0]
     ```
   - Rezolvare post (`selectedJob`):
     Dacă `ctx.jobId` este specificat explicit, acesta trebuie respectat cu prioritate:
     ```typescript
     const selectedJob = (ctx.jobId ? client.jobs.find((j) => j.id === ctx.jobId) : null)
       || employee?.currentJob
       || null; // NICIODATĂ client.jobs[0]
     ```
   - Rezolvare punct de lucru (`selectedWorksite`):
     ```typescript
     const selectedWorksite = (ctx.worksiteId ? client.worksites.find((w) => w.id === ctx.worksiteId) : null)
       || employee?.currentWorksite
       || null; // NICIODATĂ client.worksites[0]
     ```
3. În `resolveTemplateData`:
   - Liniile 1060-1061 trebuie actualizate similar:
     ```typescript
     const job = context.job || employee?.currentJob || null;
     const worksite = context.worksite || employee?.currentWorksite || null;
     ```
4. În `generate/page.tsx`:
   - Adăugare stare `selectedWorksiteId` și încărcare worksites din `/api/clients/${selectedClientId}`.
   - Afișare dropdown `Punct de Lucru (Worksite)`.
   - Eliminare auto-selectare `data.jobs[0].id`. Lăsat gol (`""`) cu opțiunea `-- Alege postul --`.

---

### 2.3. Filtrarea Tematicilor, IPSSM-urilor și Pachetelor de Risc după CAEN și Riscuri Reale

#### Observații în `src/lib/packages/bulk-packages.ts`:
1. **Pachetul Dosar SSM Firmă (`generateCompanyDossierZip`, linii 218-236)**:
   ```typescript
   const companyManifest = [
     { code: 'decizii-angajator', label: '01_Decizii_Organizatorice_SSM_PSI.docx' },
     { code: 'risk-evaluare', label: '02_Evaluarea_Riscurilor_Profesionale.docx' },
     { code: 'risk-plan-prevenire-tesa', label: '03_Plan_Prevenire_si_Protectie.docx' },
     { code: 'risk-plan-actiune-urgenta', label: '04_Plan_Actiune_Pericol_Grav_si_Iminent.docx' },
     { code: 'risk-zone-pericol', label: '05_Delimitare_Zone_Risc_Ridicat.docx' },
     { code: 'training-tematica-introductiv', label: '06_Tematica_Instruire_Introductiv_Generala.docx' },
     { code: 'training-tematica-loc-munca', label: '07_Tematica_Instruire_Loc_Munca.docx' },
     { code: 'training-detaliu-introductiv', label: '08_Detaliu_Tematica_Introductiv_Generala.docx' },
     { code: 'training-detaliu-loc-munca', label: '09_Detaliu_Tematica_Loc_Munca.docx' },
     { code: 'ipssm-birou', label: '10_IPSSM_Activitati_de_Birou.docx' },
     { code: 'ipssm-alunecari', label: '11_IPSSM_Alunecari_si_Impiedicari.docx' },
     { code: 'ipssm-autovehicule', label: '12_IPSSM_Autovehicule_in_Trafic.docx' },
     { code: 'ipssm-tesa', label: '13_IPSSM_Personal_TESA.docx' },
     { code: 'ipssm-universale', label: '14_IPSSM_Universale.docx' },
     { code: 'ipssm-opis', label: '15_Opis_Documente_SSM.docx' },
     { code: 'hr-info-dosar', label: '16_Informare_Dosar_Personal.docx' },
   ];
   ```
2. **Pachetul Arhivă Inspecție ITM/ISU (`generateInspectionArchiveZip`, linii 340-351)**:
   Include aceleași 5 IPSSM-uri fixe pentru absolut orice firmă.

#### Deficiență de Business Logic:
- O firmă exclusiv IT/software de birou primește obligatoriu `12_IPSSM_Autovehicule_in_Trafic.docx`, chiar dacă niciun angajat nu conduce mașina în interes de serviciu (`isDrivingRequired: false`).
- O firmă de alimentație publică (restaurant CAEN 5610) sau atelier mecanic primește `10_IPSSM_Activitati_de_Birou.docx` și `13_IPSSM_Personal_TESA.docx` chiar și pentru bucătari/mecanici, dar nu primește instrucțiuni de igienă sau manipulare echipamente gastronomice.

#### Filtrarea Necesară conform Profilului CAEN și Flag-urilor de Risc din Post:
Trebuie implementată funcția `filterStatutoryTemplatesForContext(client, jobs)`:
- `ipssm-autovehicule`: Se include DOAR dacă firma are CAEN de transport/curierat (4941, 5320, 5621) SAU cel puțin un post are `isDrivingRequired: true`.
- `ipssm-birou`: Se include DOAR dacă firma are CAEN de birou/servicii (6201, 6202, 6920, 7022 etc.) SAU cel puțin un post are `isScreenWork: true`.
- `ipssm-tesa`: Se include DOAR dacă există posturi administrative/conducere în firmă.
- `ipssm-alunecari` & `ipssm-universale`: Se mențin pentru toate entitățile cu sedii/puncte de lucru fizice.

---

### 2.4. Generarea în Lot (Batch ZIP): Tratarea Erorilor per Salariat și Logging Detaliat

#### Analiza Codului Curent din `src/app/api/documents/generate-batch/route.ts`:
1. **Blocarea Totală la Expirare (Liniile 146-171)**:
   ```typescript
   for (const emp of employees) {
     const comp = calculateEmployeeCompliance(emp);
     const expiryCheck = checkEmployeeTemplateExpiry(templateCode, comp);
     if (expiryCheck.isExpired) {
       rejectedEmployees.push({
         name: `${emp.lastName} ${emp.firstName}`,
         reason: expiryCheck.reason || 'Termen legal expirat',
       });
     }
   }

   if (rejectedEmployees.length > 0) {
     return NextResponse.json(
       {
         error: `Generarea a fost blocată conform legii...`,
         rejectedEmployees,
       },
       { status: 400 }
     );
   }
   ```
   Dacă un singur salariat din 100 are un instructaj expirat, **întreaga generare în lot eșuează cu HTTP 400**! Utilizatorul nu poate genera documentele pentru ceilalți 99 de salariați conformi, și nu poate emite o nouă fișă de instruire pentru cel expirat în vederea efectuării reinstruirii statutare.

2. **Lipsa Tratării Erorilor în Bucla de Generare (Liniile 187-222)**:
   ```typescript
   for (const emp of employees) {
     const { resolvedData } = await resolveTemplatePlaceholders({...});
     const genResult = await generateDocument({...});
     ...
     zip.file(zipEntryName, fileBuffer);
   }
   ```
   Dacă generarea documentului eșuează pentru un salariat (ex. fișier DOCX corupt, eroare de memorie sau câmp invalid), bucla este întreruptă, iar întregul endpoint returnează HTTP 500 (`Eroare la generarea colectivă a documentelor.`).

3. **Absența Logging-ului în Arhiva ZIP**:
   Arhiva ZIP rezultată conține doar fișierele DOCX/XLSX. Nu există niciun fișier jurnal (`RAPORT_GENERARE_LOT.txt` sau `manifest.json`) care să ofere trasabilitate operatorului cu privire la cine a fost inclus, ce versiune de șablon s-a folosit și dacă au existat avertismente sau erori.

#### Soluție Arhitecturală:
1. **Separarea Salariaților Eligibili vs. Neeligibili / Cu Avertisment**:
   În loc să blocheze întreaga cerere, API-ul trebuie să permită procesarea lotului, consemnând avertismentele în raport.
2. **Izolare `try/catch` per Salariat**:
   ```typescript
   const generatedDocuments = [];
   const failedEmployees = [];

   for (const emp of employees) {
     try {
       const { resolvedData } = await resolveTemplatePlaceholders({...});
       const genResult = await generateDocument({...});
       zip.file(zipEntryName, fileBuffer);
       generatedDocuments.push({...});
     } catch (empErr: any) {
       console.error(`Eroare generare salariat ${emp.id}:`, empErr);
       failedEmployees.push({
         employeeId: emp.id,
         name: `${emp.lastName} ${emp.firstName}`,
         job: emp.currentJob?.title || 'Nespecificat',
         error: empErr.message || 'Eroare necunoscută',
       });
     }
   }
   ```
3. **Generare Fișier Jurnal în Interiorul Arhivei ZIP**:
   Inserare automată a fișierului `00_RAPORT_GENERARE_LOT.txt`:
   ```text
   ================================================================================
   SISTEM STATUTAR SSM - RAPORT GENERARE PACHET COLECTIV
   ================================================================================
   Firma: [Denumire Client] (CUI: [CUI])
   Șablon: [Denumire Șablon] ([Cod Șablon])
   Data generării: [Data și Ora ISO / RO]
   Operator: [Nume Operator]
   Total solicitați: [N]
   Generați cu succes: [X]
   Eșuați / Cu erori: [Y]

   DETALII SALARIAȚI GENERAȚI CU SUCCES:
   1. Popescu Ion - Funcție: Bucătar - Fișier: Popescu_Ion_Fisa.docx (Stare: approved_for_print)
   ...

   DETALII ERORI (DACĂ EXISTĂ):
   1. Ionescu Dan - Funcție: Ajutor Bucătar - Eroare: Lipsă CNP valid
   ================================================================================
   ```

---

## 3. Cerința R8: Flux Igienă și Import Excel

### 3.1. Modelul `HygieneSession` din `prisma/schema.prisma`

#### Inspecție Model Bază de Date (Liniile 471-519):
```prisma
model HygieneSession {
  id                  String   @id @default(uuid())
  providerName        String   @default("Firma Prestatoare SSM") // Se completează cu furnizorul autorizat
  msAuthorization     String?  // Număr/dată aviz Ministerul Sănătății
  meAuthorization     String?  // Număr/dată aviz Ministerul Educației
  sessionDate         DateTime // Data cursului
  examDate            DateTime // Data examenului
  location            String   // Sediul sau localitatea de examen
  commissionPresident String?  // Președinte comisie
  commissionMember1   String?
  commissionMember2   String?
  commissionSecretary String?
  pvSeriesNumber      String?  // Serie și număr proces-verbal examen
  status              String   @default("programata") // programata, in_desfasurare, finalizata, certificate_emise
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  participants HygieneParticipant[]
}

model HygieneParticipant {
  id                String          @id @default(uuid())
  sessionId         String
  session           HygieneSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  employeeId        String?
  employee          Employee?       @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  
  // Date participant înscrise în catalog
  clientName        String          // Angajator
  lastName          String
  firstName         String
  cnp               String
  birthDate         DateTime?
  birthPlace        String?
  docType           String?         @default("CI")
  docSeries         String?
  docNumber         String?
  jobTitle          String?
  attendance        String          @default("prezent") // prezent / absent
  examGrade         Float?
  examResult        String          @default("admis") // admis / respins
  certificateSeries String?
  certificateNumber String?

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@index([sessionId])
}
```

#### Constatări Critice pe Modelul `HygieneSession`:
1. **Lipsa Relației cu `Client`**:
   `HygieneSession` **nu conține câmpul `clientId`** și nu are o relație Prisma cu modelul `Client`.
2. **Consecințe în UI (`src/app/hygiene/page.tsx:114-126`)**:
   Deoarece sesiunea nu are o companie asociată, interfața este forțată să folosească o euristică fragilă:
   ```typescript
   const resolveSessionClientId = useCallback((session: HygieneSession): string => {
     const pWithClient = session.participants.find((p) => p.employee?.clientId);
     if (pWithClient?.employee?.clientId) return pWithClient.employee.clientId;

     const matchedClient = clients.find((c) =>
       session.participants.some(
         (p) => p.clientName && p.clientName.toLowerCase() === c.name.toLowerCase()
       )
     );
     if (matchedClient) return matchedClient.id;

     return clients[0]?.id || ''; // FALLBACK ARBITRAR PE PRIMUL CLIENT DIN BAZA DE DATE!
   }, [clients]);
   ```
   Dacă sesiunea are cursanți din firme diferite sau cursantul a fost adăugat manual doar cu text, `resolveSessionClientId` returnează `clients[0]?.id`, asociind documentele de igienă unei firme complet străine!
3. **Modificarea Necesară a Schemei**:
   Adăugare în `HygieneSession`:
   ```prisma
   clientId            String?
   client              Client?         @relation(fields: [clientId], references: [id], onDelete: SetNull)
   ```
   Și în `Client`:
   ```prisma
   hygieneSessions    HygieneSession[]
   ```

### 3.2. Vocabularul de Statusuri și Actualizarea Participanților

#### Vocabularul de Statusuri:
- În schema Prisma și UI: `programata` -> `in_desfasurare` -> `finalizata` -> `certificate_emise`.
- În `PATCH /api/hygiene/sessions/[id]/route.ts`:
  ```typescript
  const validTransitions: Record<string, string[]> = {
    programata: ['in_desfasurare'],
    in_desfasurare: ['finalizata'],
    finalizata: ['certificate_emise'],
  };
  ```

#### Problema Tranzacțională la Trecerea în `finalizata`:
La liniile 90-105 din `src/app/api/hygiene/sessions/[id]/route.ts`:
```typescript
if (newStatus === 'finalizata') {
  for (const participant of updated.participants) {
    if (participant.employeeId && participant.examResult.toLowerCase() === 'admis') {
      await prisma.employee.update({
        where: { id: participant.employeeId },
        data: {
          hygieneLastExamDate: updated.examDate,
          hygieneCertificateNumber: participant.certificateNumber || null,
          hygieneCertificateIssueDate: updated.examDate,
          hygieneNotes: `Curs igienă finalizat...`,
        },
      });
    }
  }
}
```
**Anomalie**: Deoarece certificatele se emit abia în faza `certificate_emise`, la trecerea în `finalizata` câmpul `participant.certificateNumber` este de obicei `null`. Astfel, în tabela `Employee` se salvează `hygieneCertificateNumber: null`. Dacă ulterior se introduc seriile și numerele de certificat, tabela `Employee` nu mai este actualizată!

#### Lipsa Endpoint-ului și a Interfeței de Editare Participanți:
1. **Endpoint Lipsă**:
   În `src/app/api/hygiene/sessions/[id]/participants/route.ts` există DOAR metoda `POST` (pentru înscrierea angajaților existenți).
   **Nu există niciun handler `PATCH` sau `PUT`** pentru actualizarea notelor (`examGrade`), a rezultatului (`admis`/`respins`), a prezenței (`prezent`/`absent`) sau a certificatelor (`certificateSeries`, `certificateNumber`).
2. **UI Read-Only**:
   În `src/app/hygiene/page.tsx` (linii 706-751), tabelul de cursanți afișează aceste date exclusiv static, fără câmpuri de input, fără butoane de editare și fără modale.

---

### 3.3. Calculul Conformității de Igienă pe Baza Codului CAEN și a Postului

#### Analiza Codului Curent (`src/lib/compliance.ts`):
La liniile 231-248:
```typescript
// 4. Hygiene Course (Ordinul 2209/4469/2022) - conditionally tracked
const isHygieneApplicable = Boolean(
  employee?.hygieneRequested || employee?.hygieneLastExamDate
);

const hygieneLastExam = (employee?.hygieneLastExamDate as Date | string | null | undefined) ?? null;
const hygieneInterval = typeof employee?.hygieneIntervalMonths === 'number'
  ? employee.hygieneIntervalMonths
  : COMPLIANCE_CONSTANTS.DEFAULT_HYGIENE_INTERVAL;

const hygieneCertificate = isHygieneApplicable
  ? calculateItemCompliance(
      hygieneLastExam,
      hygieneInterval,
      'Cursuri de Igienă',
      referenceDate
    )
  : null;
```

#### Deficiența Identificată:
- În legislația din România (Ordinul Comun MS/ME nr. 2209/4469/2022), cursurile de noțiuni fundamentale de igienă sunt **obligatorii prin efectul legii** pentru toate activitățile din:
  - Alimentație publică și colectivă, restaurante, cantine, catering, baruri (CAEN 5610, 5621, 5630, 1071 etc.).
  - Producție alimentară și manipulare alimente (`isFoodHandling: true`).
  - Servicii de curățenie și dezinfecție în unități sanitare (CAEN 8610, 8621, 8121).
  - Servicii de îngrijire corporală, cosmetică, frizerie, coafură (CAEN 9602).
- În codul actual din `compliance.ts`, dacă un salariat dintr-un restaurant (CAEN 5610, bucătar cu `isFoodHandling: true`) este adăugat fără flag-ul explicit `hygieneRequested: true` și fără să aibă deja o dată de examen, **`isHygieneApplicable` este `false`**! Salariatul apare eronat ca fiind `VALID` / `CONFORM`, deși încalcă grav legislația sanitară.

#### Corecție în `compliance.ts`:
Trebuie integrate datele din `src/lib/caen-catalog.ts` (unde fiecare CAEN are deja `requiresHygieneCourse: boolean` și `hygieneModule: string`) și flag-ul `isFoodHandling` din postul salariatului:
```typescript
import { getCaenByCode } from './caen-catalog';

export function isEmployeeHygieneMandatory(employee: any): boolean {
  if (employee?.hygieneRequested || employee?.hygieneLastExamDate) return true;
  if (employee?.currentJob?.isFoodHandling) return true;
  if (employee?.client?.caenCode) {
    const caenInfo = getCaenByCode(employee.client.caenCode);
    if (caenInfo?.requiresHygieneCourse) return true;
  }
  return false;
}
```
*Notă de compatibilitate:* Pentru a menține trecerea celor 45 de teste unitare din `scripts/verify-compliance.ts` (care transmit obiecte mock de angajați fără proprietățile `client` sau `currentJob`), verificarea trebuie să evalueze `employee?.client` și `employee?.currentJob` opțional (`?.`), astfel încât testele existente să rămână 100% valide.

---

### 3.4. Fluxul de Import Excel (`src/lib/importer.ts` și Rutele `/api/imports/`)

#### 1. Atribuirea Automată a `hireDate` ca Dată de Examen Medical / Instruire
Inspecția în `src/lib/importer.ts` relevă exact liniile incriminate:
**`src/lib/importer.ts`, liniile 891-893**:
```typescript
medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate,
ssmLastTrainingDate: emp.ssmLastTrainingDate || emp.hireDate,
psiLastTrainingDate: emp.psiLastTrainingDate || emp.hireDate,
```

**Mecanismul Erorii**:
La importul unui salariat nou, dacă fișierul Excel nu conține coloane sau valori pentru examenul medical sau instructaje, codul atribuie automat data angajării (`emp.hireDate`). Aceasta face ca toți salariații nou importați să apară fictiv ca având fișă medicală și instructaje efectuate chiar în ziua angajării, acordându-le statusul verde `VALID` fără nicio dovadă legală!

**Soluție Imediată**:
Înlocuirea liniilor 891-893 cu:
```typescript
medicalLastExamDate: emp.medicalLastExamDate || null,
ssmLastTrainingDate: emp.ssmLastTrainingDate || null,
psiLastTrainingDate: emp.psiLastTrainingDate || null,
```
În acest fel, un salariat fără date medicale explicite va primi `medicalLastExamDate: null`, generând corect statusul statutar `MISSING` („Neînregistrat - Necesită fișă de aptitudine la angajare conform HG 355/2007”).

#### 2. Re-validarea pe Server a Datelor Parsate la Commit
În `src/app/api/imports/commit/route.ts`:
```typescript
const { parsedData, filename, operatorName } = body as {
  clientId?: string;
  parsedData: ParsedWorkbook;
  filename: string;
  operatorName?: string;
};
```
Endpoint-ul primește `parsedData` generat anterior în frontend/preview și îl trimite direct funcției `commitImport(clientId, parsedData, ...)`.
În `commitImport` (linia 848):
```typescript
if (!emp.isValid) continue; // Rândurile invalide nu se importă
```
**Vulnerabilitate**: Serverul are încredere oarbă în flag-ul `emp.isValid` trimis prin JSON-ul de request. Dacă un client HTTP trimite un payload alterat unde un rând invalid are `isValid: true`, date corupte vor fi inserate în baza de date fără reverificare.
**Soluție**: Endpoint-ul `commit` sau funcția `commitImport` trebuie să execute o trecere de re-validare (`revalidateParsedWorkbook(parsedData)`) pe server înainte de pornirea tranzacției `prisma.$transaction`.

#### 3. Persistența Raportului de Validare și Diff în `ImportBatch`
În `prisma/schema.prisma` (linii 585-603):
```prisma
model ImportBatch {
  id                 String   @id @default(uuid())
  clientId           String
  client             Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  filename           String
  schemaVersion      String   @default("1.0")
  rowCount           Int      @default(0)
  newCount           Int      @default(0)
  updatedCount       Int      @default(0)
  errorCount         Int      @default(0)
  ambiguousCount     Int      @default(0)
  status             String   @default("uploaded")
  validationReport   String?  // JSON detaliat
  diffData           String?  // JSON cu diferențe preview
  operatorName       String
  createdAt          DateTime @default(now())
}
```
În `src/lib/importer.ts` (linii 1056-1068):
```typescript
const batch = await tx.importBatch.create({
  data: {
    clientId,
    filename,
    schemaVersion: '1.0',
    rowCount: parsedData.employees.length,
    newCount,
    updatedCount,
    errorCount: parsedData.employees.filter((e) => !e.isValid).length,
    status: 'confirmed',
    operatorName,
    // validationReport și diffData LIPSESC COMPLET! Rămân null!
  },
});
```
Raportul detaliat de validare și structura de modificări (diff) calculate în `compareWithDatabase` nu sunt salvate în baza de date.
**Soluție**:
Transmiterea și salvarea raportului:
```typescript
validationReport: JSON.stringify(validationReport),
diffData: JSON.stringify(diffData),
```

---

## 4. Constatări Transversale (R1 & Integritate XML Generator)

### 4.1. Escaparea Caracterelor Speciale XML (`&`, `<`, `>`) în `src/lib/templates/generator.ts`
La liniile 353-365 din `src/lib/templates/generator.ts`:
```typescript
for (const [k, v] of Object.entries(data)) {
  if (v !== undefined && v !== null && String(v).trim() !== '') {
    const strVal = String(v);
    const curly = `{${k}}`;
    if (text.includes(curly)) {
      text = text.replaceAll(curly, strVal);
      changed = true;
    }
    if (relativePath.endsWith('.rels') && text.includes(k)) {
      text = text.replaceAll(k, strVal);
      changed = true;
    }
  }
}
```
**Viciu Critic de Corupere XML**:
Dacă o denumire de firmă conține ampersand (`&`) — de exemplu `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.` sau `BISTRO FOOD & DRINKS` —, injectarea directă a valorii `strVal` în fișierele `.xml` din arhiva docx (`word/document.xml`, `word/header1.xml` etc.) produce XML invalid (`&` ne-escapat în loc de `&amp;`). La deschiderea fișierului, Microsoft Word raportează că documentul este corupt și nu poate fi deschis!
**Soluție**:
Pentru fișierele cu extensia `.xml`, orice înlocuire directă trebuie să folosească o funcție de escapare XML:
```typescript
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

### 4.2. Trunchierea Arbitrară la 20 de Câmpuri Manuale în `generate/page.tsx`
La linia 1222 din `src/app/documents/generate/page.tsx`:
```tsx
{manualFields.slice(0, 20).map((field) => (
```
Șabloanele complexe (precum contractul de muncă `hr-cim-2026` sau `decizii-angajator`) conțin între 25 și 45 de câmpuri configurabile. Limitarea rigidă `.slice(0, 20)` face ca ultimele 5-25 de câmpuri să fie complet invizibile și imposibil de completat de către operator!
**Soluție**: Eliminarea `.slice(0, 20)` și afișarea completă a tuturor câmpurilor manuale (cu paginare vizuală sau scroll curat).

---

## 5. Matricea de Concordanță a Fisiere-Cheie & Linii de Cod

| Cerință | Fișier Sursă | Linii | Descrierea Problemei Identificate | Măsura de Remediere |
|---|---|---|---|---|
| **R7** | `src/app/documents/generate/page.tsx` | 313-316 | Auto-selectare `jobs[0]` în loc de selecție explicită | Eliminare `data.jobs[0].id`, lăsat gol cu placeholder |
| **R7** | `src/app/documents/generate/page.tsx` | - | Lipsă completă dropdown Worksite | Adăugare state `selectedWorksiteId` și dropdown dedicat |
| **R7** | `src/lib/templates/resolver.ts` | 2054-2056 | Fallback pe `client.employees[0]` | Eliminat fallback; `employee` = null când nu se specifică `employeeId` |
| **R7** | `src/lib/templates/resolver.ts` | 2058 | Suprascriere `jobId` de către `employee.currentJob` | Prioritizare `ctx.jobId` specificat manual; eliminare fallback `jobs[0]` |
| **R7** | `src/lib/templates/resolver.ts` | 2059 | Lipsă `worksiteId` și fallback pe `worksites[0]` | Adăugare `ctx.worksiteId` în context; eliminare fallback `worksites[0]` |
| **R7** | `src/lib/packages/bulk-packages.ts` | 228-232 | IPSSM-uri fixe necorelate cu CAEN-ul firmei | Filtrare dinamică după `caenCode` și riscurile posturilor (`isDrivingRequired` etc.) |
| **R7** | `src/app/api/documents/generate-batch/route.ts` | 160-170 | Blocare 400 a întregului lot dacă un angajat e expirat | Tratare per salariat, avertizare și permitere generare |
| **R7** | `src/app/api/documents/generate-batch/route.ts` | 187-222 | Lipsă `try/catch` per angajat și lipsă jurnal în ZIP | `try/catch` izolat și includere fișier `00_RAPORT_GENERARE_LOT.txt` în ZIP |
| **R8** | `prisma/schema.prisma` | 471-489 | `HygieneSession` nu are `clientId` | Adăugare `clientId String?` și relație cu `Client` |
| **R8** | `src/app/hygiene/page.tsx` | 114-126 | Fallback `clients[0]?.id` la generare adeverință | Legare directă prin `session.clientId` |
| **R8** | `src/app/api/hygiene/sessions/[id]/participants/route.ts` | 1-84 | Lipsă metodă PATCH/PUT pentru note/certificate | Implementare endpoint `PATCH` pentru actualizare participanți |
| **R8** | `src/app/hygiene/page.tsx` | 706-751 | Tabel cursanți read-only, fără posibilitate editare | Adăugare acțiuni inline / modal editare participant |
| **R8** | `src/lib/compliance.ts` | 232-234 | `isHygieneApplicable` ignoră CAEN și `isFoodHandling` | Integrare verificare CAEN (5610, 5621 etc.) și `job.isFoodHandling` |
| **R8** | `src/lib/importer.ts` | 891-893 | Atribuire `hireDate` ca examen medical și instruire | Înlocuire cu `null` când lipsesc din Excel |
| **R8** | `src/app/api/imports/commit/route.ts` | 5-65 | Încredere oarbă în `parsedData.employees` din client | Re-validare pe server a rândurilor înainte de commit |
| **R8** | `src/lib/importer.ts` | 1056-1068 | `validationReport` și `diffData` nu sunt persistate | Serializare JSON și salvare în `ImportBatch` |
| **R1** | `src/lib/templates/generator.ts` | 358 | Inserare string ne-escapat în XML (`replaceAll`) | Aplicare `escapeXml` (`&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`) |
| **R1** | `src/app/documents/generate/page.tsx` | 1222 | Trunchiere la primele 20 de câmpuri manuale | Eliminare limitare `.slice(0, 20)` |

---

## 6. Plan Secvențial de Implementare (Roadmap Recomandat)

### Pasul 1: Remedierea Integrității Generatorului și a Resolverului (Quick Fixes R1, R7)
1. **Generator XML Escaping**: Adăugare `escapeXml` în `src/lib/templates/generator.ts:358`.
2. **Eliminare Fallback-uri în Resolver**:
   - În `src/lib/templates/resolver.ts`: eliminare `client.employees[0]`, `client.jobs[0]`, `client.worksites[0]`.
   - Adăugare suport `worksiteId` în interfețele resolverului.
3. **Corecție UI `generate/page.tsx`**:
   - Eliminare trunchiere `.slice(0, 20)`.
   - Adăugare selector `worksiteId` și eliminare auto-selecție `jobs[0]`.

### Pasul 2: Remedierea Fluxului de Import Excel (R8)
1. **Eliminare Atribuire Automată `hireDate`**:
   - În `src/lib/importer.ts:891-893`, setare `medicalLastExamDate: emp.medicalLastExamDate || null`, etc.
2. **Persistență Raport Validare / Diff**:
   - Transmitere și salvare `validationReport` și `diffData` în `tx.importBatch.create`.
3. **Re-validare Server-Side**:
   - Asigurare re-validare strictă a CNP-urilor și câmpurilor obligatorii în `commitImport`.

### Pasul 3: Extindere Schemă Igienă & CRUD Participanți (R8)
1. **Actualizare Schemă Prisma**:
   - Adăugare `clientId` pe `HygieneSession`.
   - Rulare `npx prisma db push` și verificare cu `npx prisma validate`.
2. **API Rute Participanți**:
   - Creare handler `PATCH /api/hygiene/sessions/[id]/participants/[participantId]` pentru notă, prezență, serie/număr certificat.
3. **UI Igienă**:
   - Buton și modal „Editează Rezultate / Certificat” pe fiecare participant în `/hygiene`.
   - Sincronizare automată cu tabela `Employee` când se salvează seria/numărul de certificat.
4. **Calcul Conformitate Igienă**:
   - Extindere `compliance.ts` cu verificarea CAEN-urilor din `caen-catalog.ts` și a flag-ului `job.isFoodHandling`.

### Pasul 4: Rafinare Pachete Bulk și Generare în Lot (R7)
1. **Filtrare IPSSM / Tematici după CAEN și Post**:
   - Condiționare includere `ipssm-autovehicule`, `ipssm-birou` în `bulk-packages.ts`.
2. **Generare în Lot Rezilientă**:
   - Izolare erori per angajat în `generate-batch/route.ts`.
   - Includere `00_RAPORT_GENERARE_LOT.txt` în arhiva ZIP.
   - Eliminare blocaj 400 la expirare.

### Pasul 5: Verificare și Suită de Teste Automată
1. Rulare `npx tsx scripts/verify-compliance.ts` (asigurare 45/45 pass).
2. Rulare `npx tsx scripts/verify-excel-import-export.ts` (asigurare 6/6 pass).
3. Rulare `npx tsx scripts/e2e-suite.ts` (asigurare 53/53 pass).
4. Rulare `npx tsx scripts/test-all-templates-generation.ts` (asigurare 31/31 pass).
5. Rulare `npx prisma validate` și `npm run build`.
