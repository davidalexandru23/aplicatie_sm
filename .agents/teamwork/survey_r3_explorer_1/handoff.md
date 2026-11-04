# Investigation Report: R1 Hygiene Training Document Generation Flow (DSP / DSVSA) & Template Architecture (R3)

## 1. Observation

### 1.1 Template Files & Placeholder Inventory
From inspecting `handoff/ssm-template-placeholder-pack/templates` and `templates_registry/normalized/`:

1. **`Adeverinta participare.docx`** (`code: hygiene-adeverinta` in `src/lib/templates/definitions.ts:134`):
   - Format: DOCX (Single-person nominal certificate under Order 1225/5031/2003 as updated by MS/ME Order 2209/4469/2022).
   - Verbatim XML text:
     ```text
     MINISTERUL SANATATII Directia Generala Sanatate Publica si Programe de Sanatate Nr. {PLACEHOLDER_AVIZ_MS}
     MINISTERUL EDUCATIEI Directia Generala Management Resurse Umane si Retea Scolara Nr. {PLACEHOLDER_AVIZ_ME}
     ADEVERINTA DE PARTICIPARE
     Eliberata in conformitate cu prevederile Ordinului Ministrului Sanatatii si al Ministrului Educatiei numarul 2.209/4.469/2022
     Se adevereste prin prezenta, ca domnul/doamna {PLACEHOLDER_NUME_COMPLET}, nascut/nascuta la {PLACEHOLDER_DATA_NASTERII}, in {PLACEHOLDER_LOCALITATE_NASTERII}, judet/sector {PLACEHOLDER_JUDET_NASTERII}, CNP {PLACEHOLDER_CNP}, a urmat cursul de instruire privind insusirea notiunilor fundamentale de igiena, modulul {PLACEHOLDER_MODUL_IGIENA}, nivelul {PLACEHOLDER_NIVEL_IGIENA}, organizat de {PLACEHOLDER_PRESTATOR_SSM}, in baza Avizului Ministerului Sanatatii nr. {PLACEHOLDER_AVIZ_MS} si Ministerului Educatiei, nr. {PLACEHOLDER_AVIZ_ME}, si a promovat examenul de absolvire, fiind declarat/ declarata admis/admisa.
     Seria {PLACEHOLDER_SERIE_ADEVERINTA}, nr. {PLACEHOLDER_NUMAR_ADEVERINTA}
     SOCIETATEA {PLACEHOLDER_PRESTATOR_SSM}
     Data: {PLACEHOLDER_DATA_ELIBERARE}
     Administrator, {PLACEHOLDER_REPREZENTANT_PRESTATOR}
     ```
   - Observed Placeholders (14): `{PLACEHOLDER_AVIZ_ME}`, `{PLACEHOLDER_AVIZ_MS}`, `{PLACEHOLDER_CNP}`, `{PLACEHOLDER_DATA_ELIBERARE}`, `{PLACEHOLDER_DATA_NASTERII}`, `{PLACEHOLDER_JUDET_NASTERII}`, `{PLACEHOLDER_LOCALITATE_NASTERII}`, `{PLACEHOLDER_MODUL_IGIENA}`, `{PLACEHOLDER_NIVEL_IGIENA}`, `{PLACEHOLDER_NUMAR_ADEVERINTA}`, `{PLACEHOLDER_NUME_COMPLET}`, `{PLACEHOLDER_PRESTATOR_SSM}`, `{PLACEHOLDER_REPREZENTANT_PRESTATOR}`, `{PLACEHOLDER_SERIE_ADEVERINTA}`.

2. **`Tabel Cursanti exemplu.xlsx`** (`code: hygiene-tabel-cursanti`, name: `"Tabel evidență cursanți igienă"` in `src/lib/templates/definitions.ts:2173`):
   - Format: XLSX. Contains 2 sheets:
     - Sheet 1 (`Curs (2)`):
       - Row 1: `A1: Examen - PLACEHOLDER_DATA_EXAMEN`
       - Row 2: Headers: `Nr. Crt. | Nume Prenume | Cod Numeric Personal | An nastere | Luna Nastere | Zi Nastere | Loc Nastere | Modul | Serie si nr CI/Permis de sedere/ Pasaport`
       - Rows 3 to 117 (capacity: 115 participants):
         - Col A: `PLACEHOLDER_NUMAR_ORDINE_{001–115}`
         - Col B: `PLACEHOLDER_NUME_COMPLET_{001–115}`
         - Col C: `PLACEHOLDER_CNP_{001–115}`
         - Col D: `PLACEHOLDER_AN_NASTERII_{001–115}`
         - Col E: `PLACEHOLDER_LUNA_NASTERII_{001–115}`
         - Col F: `PLACEHOLDER_ZIUA_NASTERII_{001–115}`
         - Col G: `PLACEHOLDER_LOC_NASTERII_{001–115}`
         - Col H: `PLACEHOLDER_MODUL_NIVEL_{001–115}`
         - Col I: `PLACEHOLDER_ACT_IDENTITATE_{001–115}`
     - Sheet 2 (`Sheet1`): Unused auxiliary cashbook sheet.

3. **`Anexe Curs igiena.xlsx`** (`code: hygiene-anexe-catalog`, name: `"Anexe și Cataloage Curs Igienă (8 Anexe)"` in `src/lib/templates/definitions.ts:276`):
   - Format: XLSX. Contains all 8 statutory Annexes mandated by Order 1225/5031/2003 / 2209/4469/2022:
     - **Sheet 1 (`Anexa nr. 1`)**: Cerere avizare / numire reprezentant furnizor de instruire către DSP / INSP (19 placeholders).
     - **Sheet 2 (`Anexa nr. 2`)**: Aviz comun de funcționare furnizor MS/ME (15 placeholders).
     - **Sheet 3 (`Anexa nr. 3`)**: Catalog de înscriere a candidaților (tabel cursanți înscriși, rows 001–100, Col B..H: Nume, Act identitate, CNP, Data și locul nașterii, Modulul/Nivelul absolvit, Nota Test Grilă).
     - **Sheet 4 (`Anexa nr. 4`)**: Proces-verbal predare/primire lucrări scrise (catalog prezență examen, rows 001–100, Nume cursant).
     - **Sheet 5 (`Anexa nr. 5`)**: Catalog de examen (rows 001–100, Nume, Act identitate, Modulul/Nivelul absolvit, Rezultatul examinării: `PLACEHOLDER_REZULTAT_EXAMEN_{001-100}`).
     - **Sheet 6 (`Anexa nr. 6`)**: Proces-verbal al comisiei de examen de absolvire (sumar candidați, prezenți, admiși, respinși, serie/număr PV, semnături comisie).
     - **Sheet 7 (`Anexa nr. 7`)**: Model Certificat de absolvire (nominal).
     - **Sheet 8 (`Anexa nr. 8`)**: Registru de evidență a certificatelor de absolvire eliberate (DSP) (rows 001–100: Data, Nr/Seria adeverinței `PLACEHOLDER_SERIE_NUMAR_CERTIFICAT_{001-100}`, Nume cursant, CNP, Modulul absolvit `PLACEHOLDER_MODUL_ABSOLVIT_{001-100}`, Perioada `PLACEHOLDER_PERIOADA_CURS_{001-100}`, Prestator).

---

### 1.2 Prisma Schema Observations (`prisma/schema.prisma`)
1. **`Employee` model (`lines 104–179`)**:
   ```prisma
   // Solicitare curs igienă
   hygieneRequested        Boolean  @default(false)
   hygieneModule           String?
   hygienePreferredSession String?
   adminNotes              String?

   // 4. Cursuri de Igienă (Ordinul MS/ME nr. 2209/4469/2022)
   hygieneLastExamDate          DateTime? // Data promovării examenului de igienă
   hygieneCertificateNumber     String?   // Număr certificat eliberat de DSP
   hygieneCertificateIssueDate  DateTime? // Data emiterii certificatului DSP
   hygieneIntervalMonths        Int       @default(36) // Valabilitate 3 ani (36 luni) conform art. 20 Ordin 2209/2022
   hygieneNotes                 String?   // Modul curs / serie certificat / dispensă studii medicale
   ```
   - **Missing fields**:
     - `hygieneCertificateSeries`: No distinct series field (e.g. `IGI`, `ADEV-IG`).
     - `hygieneExamResult`: No evaluation outcome field (`admis` / `respins`).
     - `hygieneExpirationDate`: Not stored as an explicit column (only derived in `compliance.ts`).
     - `hygieneExamGrade`: Optional test grade score (`Float?`, e.g., 10.00).

2. **`HygieneSession` model (`lines 352–370`)**:
   ```prisma
   model HygieneSession {
     id                  String   @id @default(uuid())
     providerName        String   @default("Firma Prestatoare SSM")
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
     status              String   @default("programata")
     createdAt           DateTime @default(now())
     updatedAt           DateTime @updatedAt

     participants HygieneParticipant[]
   }
   ```
   - **Missing relations/fields**:
     - `clientId`: No foreign key linking `HygieneSession` to `Client`.
     - `client`: No relation to `Client`.
     - `trainingModule`: No module indicator on the session (e.g., Module 1 Food, Module 2 Cleaning/Healthcare, Module 3 Body Care).
     - `coursePeriod`: No text field for the period (e.g., "01.03.2026 - 10.03.2026" required for Anexa 8).

3. **`HygieneParticipant` model (`lines 372–400`)**:
   ```prisma
   model HygieneParticipant {
     id                String          @id @default(uuid())
     sessionId         String
     session           HygieneSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
     employeeId        String?
     employee          Employee?       @relation(fields: [employeeId], references: [id], onDelete: SetNull)
     clientName        String          // Raw string angajator
     ...
     jobTitle          String?
     attendance        String          @default("prezent")
     examGrade         Float?
     examResult        String          @default("admis")
     certificateSeries String?
     certificateNumber String?
   }
   ```
   - **Missing fields**:
     - `module`: No module field on the participant!
     - `expirationDate`: No expiration date field (3 years from exam).
     - `clientId`: Only raw string `clientName`, no direct `clientId` filter.

---

### 1.3 UI Workflow Observations (`/src/app/documents/generate/page.tsx`)
1. **Hygiene Session Guarding (`lines 170–197`)**:
   ```typescript
   const isHygieneRequired = currentTemplate?.contextLevel === 'hygiene_session';
   const needsHygieneParticipant = selectedTemplateCode === 'hygiene-adeverinta';
   ```
   - In `definitions.ts`:
     - `hygiene-adeverinta` has `contextLevel: 'hygiene_session'` (`line 140`).
     - `hygiene-anexe-catalog` has `contextLevel: 'hygiene_session'` (`line 282`).
     - `hygiene-tabel-cursanti` has `contextLevel: 'hygiene_session'` (`line 2179`).
   - If `contextLevel === 'hygiene_session'`, the UI forces selection of a `HygieneSessionOption` loaded from `/api/hygiene/sessions`:
     ```typescript
     if (isHygieneRequired && !selectedHygieneSessionId) {
       setError('Selectează sesiunea de igienă folosită pentru document.');
       return;
     }
     ```
   - **Problem**:
     - `/api/hygiene/sessions` fetches all sessions globally without filtering by the chosen `selectedClientId`.
     - If a client company has not had a `HygieneSession` created beforehand, generation of `Tabel evidență cursanți igienă`, `Anexe Curs igiena`, and `Adeverință participare` is completely blocked.
     - For `hygiene-adeverinta` (Adeverință participare), which is a nominal document for an individual employee, the UI demands a `HygieneParticipant` from a pre-existing `HygieneSession` rather than permitting selection of any client company employee directly.

---

### 1.4 Template Resolver & Generator Observations
1. **`src/lib/templates/resolver.ts` (`lines 748–775`)**:
   - When resolving data for hygiene templates:
     - If `hygieneSession` is provided, it uses `hygieneSession.participants`.
     - **If `hygieneSession` is NOT provided**, it falls back to a **single synthetic participant** (`Stan Alexandru`, CNP `1880315410127`):
       ```typescript
       participants: [
         {
           rowNumber: 1,
           fullName: fullName || 'Stan Alexandru',
           ...
           module: employee?.hygieneModule || 'Modulul 1',
         }
       ]
       ```
     - It **never queries the Client's own employees** (`client.employees`) to construct the actual roster for the client company!
2. **`src/lib/templates/generator.ts` (`lines 504–515`)**:
   - The XLSX rendering engine uses indexed token matching:
     ```typescript
     const indexed = token.match(/_(\d{2,3})$/);
     if (indexed) {
       const index = Number(indexed[1]) - 1;
       if (index >= participants.length) return '';
       if (participants[index]) {
         const formatted = formatParticipantValue(token, participants[index]);
         return formatted !== undefined ? formatted : '';
       }
       return '';
     }
     ```
   - This indexed engine is capable of dynamically handling rosters of variable length (1 to 115 cursanți), cleanly clearing unused trailing capacity rows.
   - However, in `formatParticipantValue`:
     - `DATA_EXPIRARE` / `DATA_EXPIRARII` is not in `map` (expiration date 3 years after exam).
     - Trailing cells for `Tabel Cursanti exemplu.xlsx` and `Anexe Curs igiena.xlsx` only get populated if `participants` array is populated with valid employee data.

---

## 2. Logic Chain

1. **Premise (R1 & Acceptance Criteria)**:
   In `/documents/generate`, hygiene compliance documents ("Tabel evidenta cursanti igiena", "Anexe Curs igiena", "Adeverinta participare") must be directly selectable and configurable for client companies, dynamically producing an accurate roster of employees with assigned hygiene modules (Modules 1 Food, 2 Cleaning/Healthcare, 3 Body Care under Order 1225/5031/2003 as updated), graduation dates, 3-year expiration dates, certificate series/number, and evaluation outcome.

2. **Deduction from Schema (`prisma/schema.prisma`)**:
   - `Employee` currently stores `hygieneModule`, `hygieneLastExamDate`, `hygieneCertificateNumber`, and `hygieneIntervalMonths` (36 months).
   - But `Employee` lacks `hygieneCertificateSeries`, `hygieneExamResult` (`admis`/`respins`), and explicit `hygieneExpirationDate`.
   - `HygieneSession` has no relation to `Client` (`clientId`), and `HygieneParticipant` has no `module` or `expirationDate`.
   - *Therefore*: To persist and query hygiene rosters per client company and generate accurate documents, Prisma schema must be extended.

3. **Deduction from UI Flow (`/src/app/documents/generate/page.tsx`)**:
   - All three hygiene templates are currently tagged with `contextLevel: 'hygiene_session'`.
   - This causes the form validation to reject generation unless an existing `HygieneSession` is selected.
   - The user cannot generate hygiene documents directly for a client's employees without an existing standalone session.
   - *Therefore*: `/documents/generate` must support client-level hygiene generation:
     - For `hygiene-adeverinta`: Allow selecting an employee directly from the client company's employee list (`isEmployeeRequired`), populating the adeverință from the employee's hygiene data.
     - For `hygiene-tabel-cursanti` and `hygiene-anexe-catalog`: Allow generating directly from the client's employee roster (all employees or filtered by hygiene request/module), with option to link/select a specific session if desired.

4. **Deduction from Resolver (`src/lib/templates/resolver.ts`)**:
   - Currently, if no session is chosen, `resolver.ts` creates 1 dummy hardcoded row (`Stan Alexandru`).
   - When a client is selected, `resolver.ts` must query `client.employees` (with their `identityDocument`, `currentJob`, and hygiene fields).
   - For every employee who has `hygieneRequested === true` or has an assigned `hygieneModule` (or all active employees if none flagged), construct an accurate participant record with:
     - Full name, CNP, Birth date/place, ID series/number.
     - Assigned module (Modulul 1 Food, Modulul 2 Cleaning, Modulul 3 Body Care) derived from employee or CAEN code preset (`src/lib/caen-catalog.ts`).
     - Graduation date (`hygieneLastExamDate` or session/current date).
     - Expiration date (`graduationDate + 36 months`).
     - Certificate series & number (`hygieneCertificateSeries`, `hygieneCertificateNumber`).
     - Evaluation outcome (`hygieneExamResult`, default 'admis', grade 10).
   - Map these participant records into `participants` array passed to `generateDocument`.

5. **Deduction from Generator (`src/lib/templates/generator.ts`)**:
   - `formatParticipantValue` must be augmented to map:
     - `DATA_EXPIRARE`: Formatted 3-year expiration date.
     - `REZULTAT_EXAMEN`: Outcome ('admis' / 'respins').
     - `SERIE_NUMAR_CERTIFICAT`: Formatted series and number.
     - `MODUL_NIVEL`: Full statutory module name and level.

---

## 3. Caveats

1. **Template Sheet 2 of `Tabel Cursanti exemplu.xlsx`**:
   Sheet 2 (`Sheet1`) contains generic financial columns (`DATA`, `EXPLICATII`, `INCASARI`, `PLATI`, `SOLD`). This is an artifact of the template authoring file; Sheet 1 (`Curs (2)`) is the actual hygiene roster. The generator leaves Sheet 2 uncorrupted and intact.
2. **Template Roster Capacity Limits**:
   `Tabel Cursanti exemplu.xlsx` has 115 indexed rows (`001` to `115`). `Anexe Curs igiena.xlsx` has 100 indexed rows (`001` to `100`). In real-world Romanian hygiene training, DSP exam groups are legally capped at 30–50 students per session. For client rosters with up to 100–115 employees, single-file generation is 100% covered. If a single client has > 115 employees in a single batch, generation truncates at 115 or would require batch splitting.
3. **Legal Regulatory Reference Updates**:
   The templates refer to Order 1225/5031/2003 and Order 2209/4469/2022. Both orders govern Romanian hygiene training (Order 2209/2022 updated the methodology while retaining the 3 modules and 3-year validity from Order 1225/2003).

---

## 4. Conclusion & Specific Recommendations

### 4.1 Prisma Schema Modifications (`prisma/schema.prisma`)
Add the following fields:

```prisma
// 1. In model Employee:
model Employee {
  ...
  hygieneCertificateSeries    String?   // Serie certificat/adeverință (ex: "IGI", "ADEV-IG")
  hygieneExamResult           String?   @default("admis") // Rezultat evaluare: admis / respins
  hygieneExamGrade            Float?    @default(10.0) // Notă test grilă (1-10)
  hygieneExpirationDate       DateTime? // Data expirării valabilității (data examen + 36 luni)
  ...
}

// 2. In model HygieneSession:
model HygieneSession {
  ...
  clientId            String?   // Asignare opțională la o firmă client specifică
  client              Client?   @relation(fields: [clientId], references: [id], onDelete: SetNull)
  trainingModule      String?   // Modulul sesiunii (ex: "Modulul 1 - Servicii de alimentație")
  coursePeriod        String?   // Perioada de desfășurare curs (ex: "01.03.2026 - 10.03.2026")
  ...
}

// 3. In model HygieneParticipant:
model HygieneParticipant {
  ...
  module              String?   // Modulul atribuit cursantului (Modulul 1, 2, 3)
  expirationDate      DateTime? // Data expirării (3 ani)
  clientId            String?   // ID client pentru filtrare rapidă
  ...
}

// 4. In model Client:
model Client {
  ...
  hygieneSessions     HygieneSession[]
  ...
}
```

### 4.2 Template Catalog Changes (`src/lib/templates/definitions.ts`)
- Update `hygiene-adeverinta`: Change `contextLevel` from `'hygiene_session'` to `'employee'`. This allows `/documents/generate` to treat it as an employee nominal certificate, selectable directly with `selectedEmployeeId`.
- Update `hygiene-tabel-cursanti` and `hygiene-anexe-catalog`: Allow `contextLevel: 'client'` or hybrid (`'client' | 'hygiene_session'`).
- Add field definitions for `PLACEHOLDER_DATA_EXPIRARE`, `PLACEHOLDER_REZULTAT_EXAMEN`, `PLACEHOLDER_SERIE_ADEVERINTA`.

### 4.3 Template Resolver Changes (`src/lib/templates/resolver.ts`)
In `resolveTemplateData` / `resolveTemplatePlaceholders`:
- When generating `hygiene-tabel-cursanti` or `hygiene-anexe-catalog`:
  - If `hygieneSession` is provided, map its participants.
  - If `hygieneSession` is NOT provided (client-level generation):
    - Query `client.employees` (with `identityDocument`, `residenceAddress`, `currentJob`).
    - Filter for employees with `hygieneRequested === true` or `hygieneModule !== null` (or all active employees if none specific).
    - Map each employee to a participant record with:
      - `rowNumber`: index + 1
      - `fullName`: `${e.lastName} ${e.firstName}`
      - `cnp`: e.cnp
      - `birthDate`: e.birthDate
      - `birthPlace`: e.birthPlace
      - `identityDocument`: `${docType} seria ${series} nr. ${number}`
      - `module`: e.hygieneModule || caenHygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă'
      - `level`: 'Nivelul 1'
      - `sessionDate`: formatDateRo(e.hygieneLastExamDate || new Date())
      - `examDate`: formatDateRo(e.hygieneLastExamDate || new Date())
      - `expirationDate`: formatDateRo(addYears(e.hygieneLastExamDate || new Date(), 3))
      - `certificateSeries`: e.hygieneCertificateSeries || 'IGI'
      - `certificateNumber`: e.hygieneCertificateNumber || String(100 + index)
      - `examResult`: e.hygieneExamResult || 'admis'
      - `examGrade`: e.hygieneExamGrade || 10
      - `providerName`: client.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM
      - `coursePeriod`: calculateCoursePeriod(e.hygieneLastExamDate || new Date())
- When generating `hygiene-adeverinta`:
  - If `employee` is provided:
    - Map all employee fields (`PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_CNP`, `PLACEHOLDER_DATA_NASTERII`, `PLACEHOLDER_LOCALITATE_NASTERII`, `PLACEHOLDER_JUDET_NASTERII`).
    - Map module: `employee.hygieneModule` (or CAEN default).
    - Map series & number: `employee.hygieneCertificateSeries || 'ADEV-IG'`, `employee.hygieneCertificateNumber || '0042'`.
    - Map provider: `client.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM`.
    - Map specialist/representative: `client.ssmSpecialistName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_REPREZENTANT_PRESTATOR`.
    - Map aviz: `hygieneSession?.msAuthorization || ROMANIAN_LEGAL_HYGIENE.PLACEHOLDER_AVIZ_MS`, `hygieneSession?.meAuthorization || ROMANIAN_LEGAL_HYGIENE.PLACEHOLDER_AVIZ_ME`.

### 4.4 Template Generator Changes (`src/lib/templates/generator.ts`)
In `formatParticipantValue`:
- Add mappings for:
  - `DATA_EXPIRARE`: `participant.expirationDate` (DD.MM.YYYY, 3 years from exam date).
  - `DATA_EXPIRARII`: alias.
  - `REZULTAT_EXAMEN`: `participant.examResult || 'Admis'`.
  - `NOTA_EXAMEN`: `String(participant.examGrade || '10')`.
  - `SERIE_NUMAR_CERTIFICAT`: `[participant.certificateSeries || 'IGI', participant.certificateNumber || '0042'].join(' ')`.

### 4.5 UI Generator Changes (`src/app/documents/generate/page.tsx`)
- Detect hygiene templates:
  - If `selectedTemplateCode === 'hygiene-adeverinta'`: require `selectedEmployeeId` (direct nominal adeverință from client company employees).
  - If `selectedTemplateCode === 'hygiene-tabel-cursanti'` or `'hygiene-anexe-catalog'`:
    - Display an employee roster card showing the number of employees included from the client company (with their assigned modules, exam dates, 3-year expiration dates, certificate series/numbers).
    - Provide an optional toggle to pick an existing `HygieneSession` (filtered by `clientId`) or generate dynamically from the client's employee roster.
- Avoid rendering 115 repetitive array fields (`PLACEHOLDER_NUME_COMPLET_001..115`) in the manual input form by filtering out indexed keys (`/_(\d{2,3})$/`).

### 4.6 API Routes Changes
- `src/app/api/documents/generate/route.ts`: Allow `employeeIds?: string[]` in request body.
- `src/app/api/hygiene/sessions/route.ts`: Support `?clientId=...` filter.

---

## 5. Verification Method

1. **Prisma Migration & Database Verification**:
   ```bash
   npx prisma migrate dev --name add_hygiene_module_roster_fields
   # or in test/ci:
   npx prisma db push
   ```

2. **Template Generation Verification Command**:
   Execute the automated test suite verifying all 25 templates with realistic client hygiene data:
   ```bash
   npx tsx scripts/test-all-25-templates.ts
   ```
   *Expected output*: `Reușite: 25 / 25` with `hygiene-adeverinta`, `hygiene-tabel-cursanti`, and `hygiene-anexe-catalog` producing valid outputs without corruption or unreplaced placeholder tokens.

3. **Adversarial & Structural Integrity Oracle Command**:
   ```bash
   npx tsx scripts/adversarial-template-stress.ts
   ```
   *Expected output*: `ADVERSARIAL STRESS TEST RESULTS: Passed Assertions: >= 321, Failed Assertions: 0. EMPIRICAL VERDICT: APPROVE`.

4. **Document Inspection**:
   - Inspect generated `Adeverinta participare.docx` with Python `zipfile` / `xml.etree.ElementTree`: verify zero `{PLACEHOLDER_...}` tokens remain.
   - Inspect generated `Tabel Cursanti exemplu.xlsx` and `Anexe Curs igiena.xlsx`: verify employee names, CNPs, assigned modules (Modules 1–3), completion dates, 3-year expiration dates, certificate series/numbers, and 'admis' evaluation outcomes are populated in rows 1..N and trailing capacity rows (N+1..115) are blanked.

5. **Conditions of Invalidation**:
   - If generating `hygiene-adeverinta` fails when only `clientId` and `employeeId` are provided (without a session).
   - If generating `hygiene-tabel-cursanti` fails or produces dummy 'Stan Alexandru' when a client with real employees is selected.
   - If output DOCX or XLSX contains unreplaced `PLACEHOLDER_` tokens.
