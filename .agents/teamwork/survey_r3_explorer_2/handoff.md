# Handoff Report: R2 (SSM External Service Provider Profile & Client Assignment)

**Agent**: `survey_r3_explorer_2`  
**Date**: 2026-11-03  
**Scope**: Investigation of Requirement R2 (SSM External Service Provider Profile) across Prisma Schema, Settings UI & APIs, Client Creation/Edit Forms & APIs, and Template Resolver Data Population.

---

## 1. Observation

### 1.1 Prisma Schema & Database Models
- **File**: `prisma/schema.prisma` (lines 14–59, 37–41)
  - `Client` model only has 3 flat, unnormalized string fields for the SEPP provider:
    ```prisma
    // 2. Serviciu Extern de Prevenire și Protecție (SEPP) & Evaluator Desemnat
    ssmProviderName     String?   // Denumire SEPP abilitat ITM (ex: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.")
    ssmSpecialistName   String?   // Nume specialist SSM / evaluator (ex: "Ing. Mihai Popescu")
    ssmSpecialistCert   String?   // Număr / serie certificat atestare SSM (ex: "Certificat seria EV nr. 10452/2018")
    ```
  - **No `Provider` model exists**.
  - **No `Specialist` model exists**.
  - No relational foreign keys (`providerId`, `specialistId`) exist on `Client`.
  - In `HygieneSession` (line 354): `providerName String @default("Firma Prestatoare SSM")` is stored as an independent string with no relation to any provider entity.
- **File**: `prisma/seed.ts` (lines 29–31, 52–54, 628–630, 651–653)
  - Seeds `Client` records with static string values for `ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'`, `ssmSpecialistName: 'Ing. Mihai Popescu'`, and `ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018'`.
  - Does not instantiate any provider or specialist database tables.

### 1.2 Settings Pages and API Routes
- **Search result for settings routes**:
  - `src/app/settings/` does NOT exist in the repository.
  - `src/app/api/settings/` does NOT exist in the repository.
  - `src/app/api/providers/` does NOT exist in the repository.
- **Top Navigation**: `src/app/layout.tsx` (lines 29–51)
  - Navigation contains: `Clienți`, `Angajați`, `Evaluare Riscuri`, `Instruiri & IPSSM`, `Cursuri Igienă`, `Catalog Șabloane (25)`, and `Documente Emise`.
  - There is **no link to Settings** or Provider Profile.

### 1.3 Client Creation and Edit Forms & Client APIs
- **Client Creation**: `src/components/client-intake-modal.tsx` (rendered in `src/app/clients/page.tsx:36,55`)
  - Lines 28–30 hardcode initial form state:
    ```ts
    ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
    ssmSpecialistName: 'Ing. Mihai Popescu',
    ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
    ```
  - Lines 300–334 render raw free-text `<input>` elements for Prestator SSM, Specialist, and Certificat Atestare.
  - No dropdowns exist; no provider or specialist data is fetched from an API.
- **Client Editing**: `src/components/client-edit-modal.tsx` (rendered in `src/app/clients/[id]/page.tsx:154,196`)
  - Lines 55–57 & lines 340–380 populate and render raw free-text `<input>` elements for Prestator SSM, Specialist, and Certificat Atestare.
  - No dropdowns exist; no specialist options are linked to a provider entity.
- **Client Detail Page**: `src/app/clients/[id]/page.tsx` (lines 268–285)
  - Renders raw values of `client.ssmProviderName`, `client.ssmSpecialistName`, `client.ssmSpecialistCert`.
- **Client API Endpoints**:
  - `src/app/api/clients/route.ts` (lines 23–25, 67–69, 144–146) only selects and writes `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`.
  - `src/app/api/clients/[id]/route.ts` (lines 67–69, 168–176) only selects and updates `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`.

### 1.4 Template Resolver & Template Definitions
- **File**: `src/lib/templates/resolver.ts`
  - Lines 41–66 define `ROMANIAN_LEGAL_SSM_PROVIDER` as a static constant object holding fallback provider data:
    - `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_FURNIZOR_SSM`: `'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'`
    - `PLACEHOLDER_CUI_PRESTATOR`: `'RO34567890'`
    - `PLACEHOLDER_CERTIFICAT_FURNIZOR`: `'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București'`
    - `PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`: `'4812/2021'`
    - `PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`: `'J40/1234/2020'`
    - Address tokens: `PLACEHOLDER_STRADA_FURNIZOR`, `PLACEHOLDER_NUMAR_FURNIZOR`, `PLACEHOLDER_BLOC_FURNIZOR`, `PLACEHOLDER_SCARA_FURNIZOR`, `PLACEHOLDER_ETAJ_FURNIZOR`, `PLACEHOLDER_APARTAMENT_FURNIZOR`, `PLACEHOLDER_COD_POSTAL_FURNIZOR`, `PLACEHOLDER_LOCALITATE_FURNIZOR`, `PLACEHOLDER_JUDET_FURNIZOR`
    - Contacts: `PLACEHOLDER_TELEFON_PRESTATOR`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_SITE_PRESTATOR`
    - Representative: `PLACEHOLDER_REPREZENTANT_PRESTATOR`, `PLACEHOLDER_CALITATE_REPREZENTANT`, `PLACEHOLDER_ACT_REPREZENTANT`
  - In `resolveTemplatePlaceholders` (lines 842–848):
    - Client query only includes `jobs: true, worksites: true, employees: true`. It does not include any provider or specialist relations.
  - In `resolveTemplateData` (lines 548–554, 590–595):
    - Only 5 tokens are dynamically bound from `client`:
      - `PLACEHOLDER_PRESTATOR_SSM` = `client?.ssmProviderName`
      - `PLACEHOLDER_FURNIZOR_SSM` = `client?.ssmProviderName`
      - `PLACEHOLDER_SPECIALIST_SSM` = formatted `client?.ssmSpecialistName` + cert
      - `PLACEHOLDER_EVALUATOR_RISC` = formatted `client?.ssmSpecialistName` + cert
      - `PLACEHOLDER_CERTIFICAT_EVALUATOR` = `client?.ssmSpecialistCert`
    - **All remaining provider tokens** (CUI, RegCom, official address, detailed address breakdown for XLSX catalogs, ITM authorization cert number and issue date, phone, email, website, legal representative) **are never dynamically bound** from database records; they permanently rely on the static hardcoded fallback.
    - In `handoff/ssm-template-placeholder-pack/INVENTAR_PLACEHOLDERE.md`:
      - `Anexe Curs igiena.xlsx` requires 21 distinct provider tokens (`PLACEHOLDER_CUI_PRESTATOR`, `PLACEHOLDER_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`, street, number, building, entrance, floor, apartment, postal code, city, county, email, phone, etc.).
      - `EVALUAREA RISCURILOR.docx` requires `PLACEHOLDER_ADRESA_PRESTATOR`, `PLACEHOLDER_NUMAR_REG_COMERT`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_SITE_PRESTATOR`, `PLACEHOLDER_TELEFON_PRESTATOR`. Currently, `PLACEHOLDER_ADRESA_PRESTATOR` is neither defined in `src/lib/templates/definitions.ts` nor bound in `resolver.ts`.

---

## 2. Logic Chain

1. **Premise 1 (Current Flat Storage)**: `prisma/schema.prisma` stores only three string fields on `Client` (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`). There is no relational entity representing the external provider organization or its team of specialists (Observation 1.1).
2. **Premise 2 (Requirement R2)**: Requirement R2 demands a dedicated Settings section for the external SSM consulting provider capturing corporate data (company name, CUI, Trade Registry number, official address, Labour Ministry/ITM authorization certificate number and issue date) and designated SSM specialists with contact information. Furthermore, client company forms must allow assigning the provider and selecting a designated specialist from a dropdown.
3. **Inference 1 (Relational Data Model)**: To support multiple specialists under a provider, accreditation dates/numbers, and dropdown assignments, two new models (`Provider` and `Specialist`) must be added to `prisma/schema.prisma`, with foreign keys `providerId` and `specialistId` on `Client`. Legacy flat strings must be retained as cached/fallback fields to prevent breaking existing records, imports, or exports.
4. **Inference 2 (API and UI Layer)**: Because neither `/settings` nor `/api/settings/provider` currently exists (Observation 1.2), new CRUD endpoints must be built:
   - `GET/PUT /api/settings/provider` (Provider profile)
   - `GET/POST /api/settings/provider/specialists` and `PATCH/DELETE /api/settings/provider/specialists/[id]` (Specialist team)
   - `GET /api/providers` (Option list with active specialists for dropdown consumption)
   - UI page `/src/app/settings/page.tsx` with top navbar integration in `src/app/layout.tsx`.
5. **Inference 3 (Client Form Modernization)**: `client-intake-modal.tsx` and `client-edit-modal.tsx` currently render free-text inputs (Observation 1.3). They must fetch `/api/providers`, render a Provider `<select>` dropdown and a Specialist `<select>` dropdown (filtered by the selected provider), auto-populate certificate numbers and contact info, and submit `providerId` and `specialistId` to the client APIs.
6. **Inference 4 (End-to-End Template Resolver Propagation)**: Currently, only 5 provider tokens are mapped from `Client`, while detailed tokens (CUI, RegCom, address breakdown, ITM authorization number/date, contacts) default to static fallbacks (Observation 1.4). `resolveTemplatePlaceholders` must include `provider` and `specialist` relations, and `resolveTemplateData` must populate all 20+ provider/specialist tokens dynamically from the assigned provider record (with fallback to default provider and then to static legal constants).

---

## 3. Caveats

1. **Single vs. Multi-Provider Architecture**: Most SSM consulting instances operate as a single SEPP entity servicing many clients. However, the database design should support multiple providers (via an `isDefault: Boolean @default(true)` flag) so that client companies can select an alternate provider if applicable, satisfying both single-tenant consulting and multi-provider operational setups.
2. **Legacy Data Compatibility**: Existing client records in `prisma/seed.ts` have flat string values. Migration must seed a default `Provider` record (matching "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.") and specialists ("Ing. Mihai Popescu", "Ing. Elena Vasilescu"), and update existing clients with `providerId` and `specialistId` while keeping string columns populated for backwards compatibility.
3. **Hygiene Session Provider Linking**: `HygieneSession` currently stores `providerName String`. While R2 focuses on client company forms and provider profile management, `HygieneSession` can optionally reference `providerId` or inherit the default provider's name/authorizations.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Schema Additions (`prisma/schema.prisma`)
Add `Provider` and `Specialist` models, and update `Client`:

```prisma
model Provider {
  id                    String      @id @default(uuid())
  name                  String      // Denumire SEPP abilitat ITM
  cui                   String      @unique // CUI / CIF
  regCom                String?     // Nr. Reg. Comerțului
  address               String      // Sediu social complet oficial

  // Componente adresă detaliate (pentru mapare directă în Anexe Curs igiena.xlsx)
  street                String?
  number                String?
  building              String?
  entrance              String?
  floor                 String?
  apartment             String?
  postalCode            String?
  locality              String?
  county                String?

  // Contact & Online
  phone                 String?
  email                 String?
  website               String?

  // Acreditare Ministerul Muncii / ITM
  itmAuthNumber         String?     // Nr. certificat abilitare SEPP
  itmAuthDate           DateTime?   // Data emiterii certificatului abilitare
  itmAuthDetails        String?     // Text complet certificat / autoritate emitentă

  // Reprezentant legal prestator
  legalRepresentative   String?
  representativeRole    String?     @default("Director Executiv")
  representativeDoc     String?     @default("Decizia Asociaților nr. 01/2020")

  isDefault             Boolean     @default(true)
  isActive              Boolean     @default(true)
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  specialists           Specialist[]
  clients               Client[]

  @@index([cui])
}

model Specialist {
  id                String    @id @default(uuid())
  providerId        String
  provider          Provider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
  name              String    // Nume specialist (ex: "Ing. Mihai Popescu")
  role              String?   @default("Specialist SSM / Evaluator Risc")
  certificateNumber String?   // Serie/număr certificat abilitare/atestare
  phone             String?
  email             String?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  clients           Client[]

  @@index([providerId])
}
```

Update `Client` in `prisma/schema.prisma`:
```prisma
  providerId          String?
  provider            Provider?   @relation(fields: [providerId], references: [id], onDelete: SetNull)
  specialistId        String?
  specialist          Specialist? @relation(fields: [specialistId], references: [id], onDelete: SetNull)

  @@index([providerId])
  @@index([specialistId])
```

### 4.2 Seed Update (`prisma/seed.ts`)
1. Create default `Provider`:
   - Name: `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.`
   - CUI: `RO34567890`, RegCom: `J40/1234/2020`
   - Address: `București, Str. Agricultori nr. 35, Sector 2`
   - Street: `Str. Agricultori`, Number: `35`, Building: `A1`, Entrance: `1`, Floor: `2`, Apt: `6`, PostalCode: `021481`, Locality: `București`, County: `Sector 2`
   - Phone: `0722.123.456`, Email: `contact@expert-ssm.ro`, Website: `www.expert-ssm.ro`
   - ITM Auth Number: `4812/2021`, Issue Date: `2021-04-15`
   - ITM Auth Details: `Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București`
   - Legal Rep: `Ing. Mihai Popescu`, Role: `Director Executiv`, Doc: `Decizia Asociaților nr. 01/2020`
2. Create `Specialists`:
   - `Ing. Mihai Popescu` (Specialist SSM & Evaluator Risc, Certificat seria EV nr. 10452/2018, tel: 0722.123.456, email: mihai.popescu@expert-ssm.ro)
   - `Ing. Elena Vasilescu` (Specialist SSM Senior, Certificat seria EV nr. 11234/2020, tel: 0722.654.321, email: elena.vasilescu@expert-ssm.ro)
3. Associate seeded clients (`clientNexus` and `clientBistro`) with the seeded provider and specialist.

### 4.3 API Routes
- Create `src/app/api/settings/provider/route.ts`:
  - `GET`: Returns the active provider profile with specialists.
  - `PUT`: Updates corporate and accreditation information.
- Create `src/app/api/settings/provider/specialists/route.ts`:
  - `POST`: Adds a specialist.
- Create `src/app/api/settings/provider/specialists/[id]/route.ts`:
  - `PATCH`: Modifies specialist details.
  - `DELETE`: Deactivates/deletes a specialist.
- Create `src/app/api/providers/route.ts`:
  - `GET`: Returns active providers with active specialists for form dropdowns.
- Update `src/app/api/clients/route.ts` & `src/app/api/clients/[id]/route.ts`:
  - Accept `providerId` and `specialistId`, and auto-sync legacy string fields.

### 4.4 UI Components
- Update `src/app/layout.tsx`: Add "Setări SEPP" link in navigation.
- Create `src/app/settings/page.tsx`:
  - Provider Corporate Profile Card
  - ITM / Labour Ministry Accreditation Card
  - Designated Specialists Card (table with add/edit/delete modals)
  - Preview of document headers & signatures.
- Update `src/components/client-intake-modal.tsx`:
  - Replace free-text inputs with Provider `<select>` and Specialist `<select>` dropdowns.
  - Pre-select the default provider.
- Update `src/components/client-edit-modal.tsx`:
  - Replace free-text inputs with Provider and Specialist dropdowns.
- Update `src/app/clients/[id]/page.tsx`:
  - Display relational Provider and Specialist details (accreditation number/date, contact info).

### 4.5 Template Resolver Updates (`src/lib/templates/resolver.ts` & `definitions.ts`)
- In `resolveTemplatePlaceholders`:
  - Include `provider: { include: { specialists: true } }` and `specialist: true` in `prisma.client.findUnique`.
- In `resolveTemplateData`:
  - Resolve active provider (`client.provider || defaultProvider`) and active specialist (`client.specialist || activeProvider.specialists[0]`).
  - Map dynamic provider tokens:
    - `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_FURNIZOR_SSM` = `activeProvider.name`
    - `PLACEHOLDER_CUI_PRESTATOR` = `activeProvider.cui`
    - `PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`, `PLACEHOLDER_NUMAR_REG_COMERT` = `activeProvider.regCom`
    - `PLACEHOLDER_ADRESA_PRESTATOR` = `activeProvider.address`
    - Detailed address tokens (`PLACEHOLDER_STRADA_FURNIZOR`, `PLACEHOLDER_NUMAR_FURNIZOR`, `PLACEHOLDER_BLOC_FURNIZOR`, `PLACEHOLDER_SCARA_FURNIZOR`, `PLACEHOLDER_ETAJ_FURNIZOR`, `PLACEHOLDER_APARTAMENT_FURNIZOR`, `PLACEHOLDER_COD_POSTAL_FURNIZOR`, `PLACEHOLDER_LOCALITATE_FURNIZOR`, `PLACEHOLDER_JUDET_FURNIZOR`)
    - Contacts (`PLACEHOLDER_TELEFON_PRESTATOR`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_SITE_PRESTATOR`)
    - ITM accreditation (`PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_CERTIFICAT_FURNIZOR`)
    - Representation (`PLACEHOLDER_REPREZENTANT_PRESTATOR`, `PLACEHOLDER_CALITATE_REPREZENTANT`, `PLACEHOLDER_ACT_REPREZENTANT`)
    - Specialist tokens (`PLACEHOLDER_SPECIALIST_SSM`, `PLACEHOLDER_EVALUATOR_RISC`, `PLACEHOLDER_CERTIFICAT_EVALUATOR`)
- In `src/lib/templates/definitions.ts`:
  - Add missing `PLACEHOLDER_ADRESA_PRESTATOR` to `risk-evaluare` template fields.

---

## 5. Verification Method

To independently verify these findings and subsequent implementation:

1. **Prisma Validation**:
   ```bash
   npx prisma validate
   ```
   *Expected*: Passes without syntax or schema errors.
2. **Type Checking**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Zero TypeScript compilation errors.
3. **Database Migration & Seed Check**:
   ```bash
   npx prisma db push --skip-generate
   npx tsx prisma/seed.ts
   ```
   *Expected*: Tables `Provider` and `Specialist` created; default provider and specialists seeded and linked to clients.
4. **Provider API Route Check**:
   ```bash
   curl -s http://localhost:3000/api/settings/provider | jq .
   curl -s http://localhost:3000/api/providers | jq .
   ```
   *Expected*: Returns JSON with company info, ITM certificate, and specialist list.
5. **Client Assignment Check**:
   - Inspect `POST /api/clients` and `PATCH /api/clients/[id]` payloads with `providerId` and `specialistId`.
   - Open `/clients` -> Client Intake Modal -> Verify dropdown options populated.
   - Open `/clients/[id]` -> Client Edit Modal -> Verify provider and specialist selection.
6. **Template Generation Verification**:
   - Generate `Anexe Curs igiena.xlsx` and `EVALUAREA RISCURILOR.docx` via `POST /api/documents/generate`.
   - Inspect generated document snapshot data to confirm that `PLACEHOLDER_CUI_PRESTATOR`, `PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_ADRESA_PRESTATOR`, and `PLACEHOLDER_SPECIALIST_SSM` match the assigned provider and specialist database records.

**Invalidation Conditions**:
- If `prisma.client.findUnique` cannot query `provider` or `specialist`, the schema migration is incomplete.
- If generated documents still output static fallback values when client provider data changes, the template resolver mapping is incomplete.
