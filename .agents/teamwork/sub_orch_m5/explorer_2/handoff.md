# Raport de Investigație: Subsistemul de Igienă (Features 27, 28, 29)
**Milestone 5 — Focus Area 2**

---

## 1. Observation

### 1.1. Feature 27 — Asociere `HygieneSession` cu `Client`

1. **Schema Prisma (`prisma/schema.prisma`)**:
   - Modelul `Client` (linii 55–67):
     ```prisma
     worksites          Worksite[]
     jobs               Job[]
     employees          Employee[]
     riskAssessments    RiskAssessment[]
     trainingEvents     TrainingEvent[]
     generatedDocuments GeneratedDocument[]
     importBatches      ImportBatch[]
     ```
     `Client` **nu conține** relația `hygieneSessions HygieneSession[]`.
   - Modelul `HygieneSession` (linii 474–492):
     ```prisma
     model HygieneSession {
       id                  String   @id @default(uuid())
       providerName        String   @default("Firma Prestatoare SSM")
       msAuthorization     String?
       meAuthorization     String?
       sessionDate         DateTime
       examDate            DateTime
       location            String
       commissionPresident String?
       commissionMember1   String?
       commissionMember2   String?
       commissionSecretary String?
       pvSeriesNumber      String?
       status              String   @default("programata")
       createdAt           DateTime @default(now())
       updatedAt           DateTime @updatedAt

       participants HygieneParticipant[]
     }
     ```
     `HygieneSession` **nu conține** câmpul `clientId` și nicio relație `@relation` către `Client`.

2. **Starea curentă a bazei de date**:
   - Comanda: `npx tsx -e "import { prisma } from './src/lib/prisma'; async function m() { console.log(await prisma.hygieneSession.count()); } m();"`
   - Rezultat: În baza de date există **4 sesiuni de igienă** persistate fără `clientId` (`PV-EX-2025-0042`, `PV-EX-2026-0089`, `PV-EX-2026-0112`, `PV-DSP-2026-0089`). Dacă s-ar introduce `clientId String` obligatoriu fără default, migrarea/push-ul ar eșua.

3. **Rutele API de Sesiuni (`src/app/api/hygiene/sessions/route.ts`)**:
   - `GET /api/hygiene/sessions` (linii 6–35):
     ```typescript
     export async function GET() {
       const sessions = await prisma.hygieneSession.findMany({
         orderBy: { sessionDate: 'desc' },
         include: {
           participants: {
             select: {
               ...
               employee: {
                 select: { clientId: true },
               },
             },
           },
         },
       });
       return NextResponse.json(sessions);
     }
     ```
     `GET` nu acceptă parametrul de query `clientId` (`searchParams.get('clientId')`) și returnează toate sesiunile fără filtrare.
   - `POST /api/hygiene/sessions` (linii 56–140):
     Nu preia `clientId` din corpul cererii JSON și nu îl atașează la crearea `prisma.hygieneSession.create`.

4. **Interfața Utilizator (`src/app/hygiene/page.tsx`)**:
   - În liniile 114–126, aplicația folosește un algoritm euristic fragil pentru a ghici compania unei sesiuni:
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
       return clients[0]?.id || '';
     }, [clients]);
     ```
   - În formularul de creare sesiune (linii 444–446), compania este cerută doar ca text liber (`p_clientName`) pentru primul cursant, fără selector de client `clientId`.
   - În generatorul de documente (`src/app/documents/generate/page.tsx:421–428`), sesiunile sunt filtrate manual prin scanarea participanților:
     ```typescript
     const filteredSessions = hygieneSessions.filter((session) => {
       if (!selectedClient) return true;
       return session.participants.some(
         (p: any) =>
           p.employee?.clientId === selectedClientId ||
           (p.clientName && p.clientName.toLowerCase() === selectedClient.name.toLowerCase())
       );
     });
     ```

---

### 1.2. Feature 28 — Editare Participanți Igienă & Emitere Certificate

1. **Ruta API Dedicată**:
   - `src/app/api/hygiene/sessions/[id]/participants/[participantId]/route.ts` **nu există** în proiect (`find src/app/api/hygiene -type f` listează doar `sessions/route.ts`, `sessions/[id]/route.ts` și `sessions/[id]/participants/route.ts`).
2. **Modelul `HygieneParticipant` (`prisma/schema.prisma:494–522`)**:
   - Câmpurile existente pe model:
     - `attendance` String `@default("prezent")`
     - `examGrade` Float?
     - `examResult` String `@default("admis")`
     - `certificateSeries` String?
     - `certificateNumber` String?
   - Câmpul `certificateDate DateTime?` **nu există** pe modelul `HygieneParticipant` (deși în `Employee` există `hygieneCertificateIssueDate DateTime?`).
3. **Interfața Utilizator (`src/app/hygiene/page.tsx:706–755`)**:
   - În tabelul de cursanți expandați, coloana `Acțiuni` (linii 734–750) conține exclusiv butonul de descărcare directă "Adeverință":
     ```tsx
     <td className="px-3 py-2 text-right">
       <button
         type="button"
         title="Descarcă adeverință cursant"
         onClick={() => handleDirectDownload(session, 'hygiene-adeverinta', p.id)}
         ...
       >
         Adeverință
       </button>
     </td>
     ```
   - **Nu există niciun mecanism UI** (buton, iconiță, formular inline sau modal) pentru editarea notei, a prezenței, a calificativului sau a seriei/numărului de certificat al cursantului.

---

### 1.3. Feature 29 — Conformitate Statutară Igienă (CAEN 5610, `isFoodHandling`, Ordinul MS/ME 2209/4469/2022)

1. **Calculul Curent (`src/lib/compliance.ts:235–253`)**:
   ```typescript
   // 4. Hygiene Course (Ordinul 2209/4469/2022) - conditionally tracked
   const isHygieneApplicable = Boolean(
     employee?.hygieneRequested || employee?.hygieneLastExamDate
   );

   const hygieneLastExam = (employee?.hygieneLastExamDate as Date | string | null | undefined) ?? null;
   const hygieneInterval = typeof employee?.hygieneIntervalMonths === 'number'
     ? employee.hygieneIntervalMonths
     : COMPLIANCE_CONSTANTS.DEFAULT_HYGIENE_INTERVAL; // 36 luni

   const hygieneCertificate = isHygieneApplicable
     ? calculateItemCompliance(
         hygieneLastExam,
         hygieneInterval,
         'Cursuri de Igienă',
         referenceDate
       )
     : null;
   ```
   - `isHygieneApplicable` verifică **exclusiv** `hygieneRequested` sau `hygieneLastExamDate`.
   - **Nu se verifică**:
     - Codul CAEN al companiei (CAEN 5610 — Restaurante sau alte coduri alimentare din catalog cu `requiresHygieneCourse: true`).
     - Flag-ul postului `isFoodHandling === true`.
2. **Consecință directă**:
   - Dacă un angajat lucrează ca ospătar sau bucătar la o companie CAEN 5610 (sau pe un post cu `isFoodHandling === true`), dar nu i s-a bifat manual `hygieneRequested: true` și nu are examen anterior, `isHygieneApplicable` este evaluat ca `false`.
   - `hygieneCertificate` devine `null`, starea este marcată ca `Nerelevant`, iar salariatul **nu este penalizat cu status `MISSING`**, încălcând cerința statutară legală din Ordinul MS/ME 2209/4469/2022.
3. **Tratamentul salariaților fără risc alimentar**:
   - Salariații TESA / birou (ex: la firme IT CAEN 6201, cu `isFoodHandling === false`) primesc `hygieneCertificate: null`. Aceștia nu sunt penalizați și nu contribuie la `totalItemsTracked` în scorul de conformitate al firmei.
4. **Propagarea datelor în apelurile `calculateEmployeeCompliance`**:
   - În `src/app/employees/page.tsx:22–23`, selecția Prisma pentru `client` este `{ select: { id: true, name: true } }` (lipsește `caenCode: true`), iar pentru `currentJob` este `{ select: { id: true, title: true } }` (lipsește `isFoodHandling: true`).
   - În `src/app/api/clients/[id]/employees/route.ts:84–93`, selecția pentru `currentJob` nu include `isFoodHandling: true`.

---

## 2. Logic Chain

1. **Feature 27 — Lanț de Raționament**:
   - *De la Observația 1.1*: `HygieneSession` nu deține o cheie străină către `Client`.
   - *De la Observația 1.1.2*: Există 4 înregistrări existente în DB. O coloană non-nulă `clientId String` ar bloca sincronizarea bazei de date. Prin urmare, câmpul trebuie să fie `clientId String?` cu `@relation(fields: [clientId], references: [id], onDelete: SetNull)` pe `HygieneSession` și `hygieneSessions HygieneSession[]` pe `Client`.
   - *De la Observația 1.1.3 și 1.1.4*: Cu `clientId` persistat, `GET /api/hygiene/sessions?clientId=...` poate filtra nativ în SQL. În UI, euristica `resolveSessionClientId` devine redundantă și poate fi înlocuită direct cu `session.clientId`.
   - În `prisma/seed.ts`, sesiunile demo trebuie actualizate cu `clientId: clientBistro.id` (pentru sesiunile Bistro Gourmet) și `clientId: clientNexus.id` (pentru sesiunea Nexus).

2. **Feature 28 — Lanț de Raționament**:
   - *De la Observația 1.2.1*: Nu există endpoint pentru actualizarea cursantului individual.
   - Conform contractului din `SCOPE.md` (linii 60–63) și testelor E2E Tier 2 (`scripts/e2e-tier2-boundaries.ts:1562–1589`), endpoint-ul `PATCH /api/hygiene/sessions/[id]/participants/[participantId]` trebuie să valideze:
     - `examGrade`: interval statutar [1.0 – 10.0].
     - `attendance`: dacă este `absent`, nu poate avea notă (`examGrade` nul) și rezultatul este obligatoriu `respins`. Nu se pot emite certificate.
     - `examResult`: dacă este `respins`, nu se pot emite certificate (`certificateSeries` și `certificateNumber` devin nule).
     - La promovare (`examResult === 'admis'`), dacă participantul are `employeeId`, se sincronizează automat fișa salariatului în tabelul `Employee` (`hygieneLastExamDate`, `hygieneCertificateNumber`, `hygieneCertificateIssueDate`).
   - *De la Observația 1.2.3*: În `src/app/hygiene/page.tsx`, adăugarea unui buton de editare în tabel și a unui modal `EditParticipantModal` va permite operatorului modificarea facilă a prezenței, notei și seriei certificatului.

3. **Feature 29 — Lanț de Raționament**:
   - *De la Observația 1.3.1*: `isHygieneApplicable` omite cerințele statutare de activitate și post.
   - Conform Ordinului MS/ME 2209/4469/2022, orice activitate din industria alimentară / alimentație publică (CAEN 5610, 5621, 5630, 1071) și orice post cu manipulare de alimente (`isFoodHandling === true`) impune deținerea unui certificat valid cu reînnoire la 36 de luni (3 ani).
   - Prin urmare, `isHygieneApplicable` trebuie definit ca:
     ```typescript
     const rawCaen = (employee as any)?.client?.caenCode ?? (employee as any)?.caenCode;
     const caenCode = rawCaen ? normalizeCaenCode(rawCaen) : '';
     const isFoodCaen = caenCode === '5610' || (Boolean(caenCode) && getCaenEntry(caenCode)?.requiresHygieneCourse === true);
     const isFoodHandlingJob = Boolean(
       (employee as any)?.currentJob?.isFoodHandling ??
       (employee as any)?.job?.isFoodHandling ??
       (employee as any)?.isFoodHandling
     );
     const isHygieneApplicable = Boolean(
       employee?.hygieneRequested ||
       employee?.hygieneLastExamDate ||
       isFoodCaen ||
       isFoodHandlingJob
     );
     ```
   - Dacă `isHygieneApplicable` este `true` și `hygieneLastExamDate` este nul, starea devine automat `MISSING`, iar dacă au trecut > 36 luni, devine `OVERDUE`.
   - Dacă salariatul este din sector non-alimentar (ex: CAEN 6201, `isFoodHandling === false`, fără cerință explicită), `isHygieneApplicable` rămâne `false`, `hygieneCertificate` este `null`, iar salariatul nu este penalizat în scorul de conformitate al firmei.

---

## 3. Caveats

1. **Relația Client pe Sesiuni Externe**: O sesiune de igienă poate fi organizată de un furnizor extern pentru mai multe companii partenere concomitent (sesiune deschisă). De aceea, `clientId String?` (opțional) este mult mai flexibil decât un câmp non-nul obligatoriu, păstrând compatibilitatea și cu sesiuni mixte.
2. **Câmpul `certificateDate` pe `HygieneParticipant`**: Schema Prisma curentă are `certificateSeries` și `certificateNumber`, dar nu are `certificateDate`. Pentru data eliberării certificatului, rezolvitorul și API-ul folosesc implicit `session.examDate` ca fallback. Se recomandă adăugarea opțională a `certificateDate DateTime?` în modelul `HygieneParticipant`.
3. **Compatibilitate Filtrare API**: Pentru sesiunile existente care au cursanți asociați cu angajați ai unei firme, dar nu au încă `clientId` setat pe sesiune, clauza `where` din `GET /api/hygiene/sessions` trebuie să suporte atât `clientId`, cât și potrivirea prin participanți:
   ```typescript
   where: clientId ? {
     OR: [
       { clientId },
       { participants: { some: { employee: { clientId } } } }
     ]
   } : {}
   ```

---

## 4. Conclusion

Investigația confirmă exact punctele de intervenție pentru Finalizarea Milestone-ului 5 (Aria de Focus 2):

1. **Feature 27**:
   - În `prisma/schema.prisma`: adăugare `clientId String?` pe `HygieneSession` cu `@relation` și `@index([clientId])`; adăugare `hygieneSessions HygieneSession[]` pe `Client`.
   - Rulare `npx prisma db push` și `npx prisma generate`.
   - În `prisma/seed.ts`: populare `clientId` pentru cele 3 sesiuni demo.
   - În `src/app/api/hygiene/sessions/route.ts`: suport `clientId` în `GET` (query param) și `POST` (body).
   - În `src/app/hygiene/page.tsx`: selector companie la nivel de pagină și în formularul de sesiune nouă; eliminare euristică `resolveSessionClientId`.
2. **Feature 28**:
   - Creare rută `src/app/api/hygiene/sessions/[id]/participants/[participantId]/route.ts` cu metodă `PATCH` (validare notă 1-10, reguli absență/respingere, persistență certificate, sincronizare cu tabelul `Employee`).
   - În `src/app/hygiene/page.tsx`: adăugare buton "Editează" în tabel și componentă modală `EditParticipantModal`.
3. **Feature 29**:
   - În `src/lib/compliance.ts`: extindere `calculateEmployeeCompliance` cu logica statutară pentru CAEN 5610 / `requiresHygieneCourse` și `job.isFoodHandling === true`.
   - Asigurarea includerii `client.caenCode` și `job.isFoodHandling` în query-urile din `src/app/employees/page.tsx`, `src/app/clients/[id]/page.tsx`, `src/app/api/clients/[id]/employees/route.ts` și `src/app/api/documents/generate-batch/route.ts`.

---

## 5. Verification Method

Pentru a valida implementarea propusă, executați următoarele verificări independente:

1. **Validare Schemă Prisma**:
   ```bash
   npx prisma validate
   ```
   *Criteriu de succes*: Validare curată, 0 erori de sintaxă sau relații orfane.

2. **Suite de Teste Automate de Conformitate**:
   ```bash
   npx tsx scripts/verify-compliance.ts
   ```
   *Criteriu de succes*: 45/45 teste trecute (inclusiv noile scenarii pentru CAEN 5610 și `isFoodHandling`).

3. **Verificare E2E Tiers 1-4**:
   ```bash
   npx tsx scripts/e2e-tier1-features.ts
   npx tsx scripts/e2e-tier2-boundaries.ts
   ```
   *Criteriu de succes*: Testele pentru Feature 27 (T1.1–T1.5, T2.1–T2.5), Feature 28 (T1.1–T1.5, T2.1–T2.5) și Feature 29 (T1.1–T1.5, T2.1–T2.5) trec 100%.

4. **Verificare Compilare Proiect Next.js**:
   ```bash
   npm run build
   ```
   *Criteriu de succes*: Build finalizat cu succes, 0 erori TypeScript și 0 erori pe rutele dinamice.
