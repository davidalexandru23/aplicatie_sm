# Handoff Report: Milestone 1 - F1 (Prisma Data Models & Seed Data for External Provider & Specialists)

## 1. Observation

Direct observations from codebase inspection:

### 1.1 Existing Client Model in `prisma/schema.prisma`
In `prisma/schema.prisma` lines 37–59:
```prisma
  // 2. Serviciu Extern de Prevenire și Protecție (SEPP) & Evaluator Desemnat
  ssmProviderName     String?   // Denumire SEPP abilitat ITM (ex: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.")
  ssmSpecialistName   String?   // Nume specialist SSM / evaluator (ex: "Ing. Mihai Popescu")
  ssmSpecialistCert   String?   // Număr / serie certificat atestare SSM (ex: "Certificat seria EV nr. 10452/2018")

  // 3. Numiri Decizii Organizatorice Angajator (Deciziile 01-09)
  designatedWorkerSsm String?   // Lucrător desemnat SSM (Decizia 01)
  firstAidResponder   String?   // Responsabil acordare prim ajutor (Decizia 02)
  psiResponder        String?   // Cadru tehnic / responsabil PSI/SU (Decizia 03)
  investigationMembers String?  // Membri comisie cercetare evenimente / accidente (Decizia 06)
  decisionsDate       DateTime? // Data emiterii pachetului de decizii organizatorice

  worksites          Worksite[]
  jobs               Job[]
  employees          Employee[]
  riskAssessments    RiskAssessment[]
  trainingEvents     TrainingEvent[]
  generatedDocuments GeneratedDocument[]
  importBatches      ImportBatch[]

  @@index([cui])
  @@index([caenCode])
```
- No `SsmProvider` model currently exists in `prisma/schema.prisma`.
- No `SsmSpecialist` model currently exists in `prisma/schema.prisma`.
- `Client` only possesses legacy string fields (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`), with no foreign keys or relational bindings to an external provider or specialist entity.

### 1.2 Legacy Fields Dependencies Across the Codebase
Grep search across the codebase reveals extensive direct reliance on `ssmProviderName`, `ssmSpecialistName`, and `ssmSpecialistCert`:
- `scripts/adversarial-m1-review.ts` lines 43–45:
  ```typescript
  assert(!!clientNexus?.ssmProviderName, 'Nexus ssmProviderName is populated');
  assert(!!clientNexus?.ssmSpecialistName, 'Nexus ssmSpecialistName is populated');
  assert(!!clientNexus?.ssmSpecialistCert, 'Nexus ssmSpecialistCert is populated');
  ```
- `src/lib/templates/resolver.ts` lines 548–554 & 590–594:
  ```typescript
  const ssmProviderName = client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM;
  const ssmSpecialistName = client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;
  const evaluatorName = client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC;
  ```
- `src/lib/templates/definitions.ts` lines 1895, 2152, 2166, 1832: mappings reference `client.ssmProviderName`, `client.ssmSpecialistName`, and `client.ssmSpecialistCert`.
- `src/app/api/clients/route.ts` (lines 23–25, 67–69, 144–146) and `src/app/api/clients/[id]/route.ts` (lines 67–69, 168–176): select and persist `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`.
- `src/components/client-intake-modal.tsx` (lines 28–30, 62–64) & `src/components/client-edit-modal.tsx` (lines 23–25, 112–114): populate and submit `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`.

### 1.3 Provider & Legal Constants in `src/lib/templates/resolver.ts`
In `src/lib/templates/resolver.ts` lines 41–66, the ground-truth Romanian legal external provider specification is defined as:
```typescript
export const ROMANIAN_LEGAL_SSM_PROVIDER = {
  PLACEHOLDER_PRESTATOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  PLACEHOLDER_FURNIZOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  PLACEHOLDER_CUI_PRESTATOR: 'RO34567890',
  PLACEHOLDER_CERTIFICAT_FURNIZOR: 'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București',
  PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: '4812/2021',
  PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: 'J40/1234/2020',
  PLACEHOLDER_STRADA_FURNIZOR: 'Str. Agricultori',
  PLACEHOLDER_NUMAR_FURNIZOR: '35',
  PLACEHOLDER_BLOC_FURNIZOR: 'A1',
  PLACEHOLDER_SCARA_FURNIZOR: '1',
  PLACEHOLDER_ETAJ_FURNIZOR: '2',
  PLACEHOLDER_APARTAMENT_FURNIZOR: '6',
  PLACEHOLDER_COD_POSTAL_FURNIZOR: '021481',
  PLACEHOLDER_LOCALITATE_FURNIZOR: 'București',
  PLACEHOLDER_JUDET_FURNIZOR: 'Sector 2',
  PLACEHOLDER_TELEFON_PRESTATOR: '0722.123.456',
  PLACEHOLDER_EMAIL_PRESTATOR: 'contact@expert-ssm.ro',
  PLACEHOLDER_SITE_PRESTATOR: 'www.expert-ssm.ro',
  PLACEHOLDER_SPECIALIST_SSM: 'Ing. Mihai Popescu (Specialist SSM abilitat, Certificat seria EV nr. 10452/2018)',
  PLACEHOLDER_EVALUATOR_RISC: 'Ing. Mihai Popescu (Evaluator risc SSM atestat INCDPM București)',
  PLACEHOLDER_CERTIFICAT_EVALUATOR: 'Certificat Evaluator Riscuri SSM seria EV nr. 10452/2018 emis de INCDPM București',
  PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Ing. Mihai Popescu',
  PLACEHOLDER_CALITATE_REPREZENTANT: 'Director Executiv',
  PLACEHOLDER_ACT_REPREZENTANT: 'Decizia Asociaților nr. 01/2020',
};
```

### 1.4 Current Seed Logic in `prisma/seed.ts`
- Currently seeds two clients:
  1. `NEXUS SOLUTIONS S.R.L.` (`cui: 'RO38765432'`) at lines 13–61.
  2. `BISTRO GOURMET S.R.L.` (`cui: 'RO45123987'`) at lines 613–660.
- Both clients hardcode legacy strings:
  ```typescript
  ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  ssmSpecialistName: 'Ing. Mihai Popescu',
  ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
  ```
- Neither provider nor specialists are seeded as independent database entities.

### 1.5 Database & CLI Environment
- Database: PostgreSQL on port 5432 (`DATABASE_URL` in `.env`). Connectivity verified via `npx tsx` (`Client count: 2`).
- Prisma CLI: version 6.19.3.
- `prisma/migrations` does not exist; migration and sync convention is `npx prisma db push` (documented in `README.md` line 62).
- Validation test: Created `.agents/teamwork/m1_r3_explorer_1/proposed_schema.prisma` and executed `npx prisma validate --schema=.agents/teamwork/m1_r3_explorer_1/proposed_schema.prisma`. Output: `The schema ... is valid 🚀` (Exit code: 0).

---

## 2. Logic Chain

1. **Model Requirement Derivation (R2 & F1)**:
   - Observation 1.1 shows `Client` only has scalar text columns. Requirement R2 dictates managing provider corporate data (name, CUI, Reg. Com., address, ITM certificate number/date) and multiple designated specialists with contact information.
   - Observation 1.3 demonstrates that document generation requires 24 provider tokens including structured sub-address (`street`, `number`, `building`, `entrance`, `floor`, `apartment`, `postalCode`, `locality`, `county`), legal representative fields (`legalRepresentative`, `representativeRole`, `representativeDoc`), and contact channels (`phone`, `email`, `website`).
   - Therefore, `SsmProvider` must include these fields as scalar columns, with `cui` marked `@unique` and `isDefault Boolean @default(false)` to identify the primary consulting provider in Settings.

2. **Specialist Relation & Idempotence Derivation**:
   - Each provider employs one or more specialists (`SsmSpecialist[]`).
   - In accordance with existing schema patterns (e.g. `Worksite` having `@@unique([clientId, name])` and `Job` having `@@unique([clientId, title])`), `SsmSpecialist` must have `@@unique([providerId, name])` and `@@index([providerId])`.
   - This allows deterministic `upsert` calls in `prisma/seed.ts` and prevents duplicate specialist registrations under the same provider.
   - `onDelete: Cascade` on `SsmSpecialist.provider` ensures clean lifecycle management if a provider entity is removed.

3. **Client Relation & Backwards Compatibility**:
   - Observation 1.2 demonstrates that numerous existing test suites (`scripts/adversarial-m1-review.ts`, `scripts/adversarial-seed-roundtrip-stress.ts`, `verify-all.ts`) and generator pipelines directly assert or read `client.ssmProviderName`, `client.ssmSpecialistName`, and `client.ssmSpecialistCert`.
   - Therefore, removing or renaming these columns would immediately break existing regression suites.
   - Instead, `Client` must add:
     - `providerId String?`
     - `provider SsmProvider? @relation(fields: [providerId], references: [id], onDelete: SetNull)`
     - `specialistId String?`
     - `specialist SsmSpecialist? @relation(fields: [specialistId], references: [id], onDelete: SetNull)`
     - `@@index([providerId])`
     - `@@index([specialistId])`
   - Using `onDelete: SetNull` ensures that clients are preserved even if an external provider or specialist record is deleted or unassigned.
   - Downstream client APIs (`POST /api/clients`, `PATCH /api/clients/[id]`) and seed scripts can sync `ssmProviderName = provider.name`, `ssmSpecialistName = specialist.name`, and `ssmSpecialistCert = specialist.certificateNumber`, achieving 100% backwards compatibility while enabling full relational integrity.

4. **Seed Strategy Derivation**:
   - In `prisma/seed.ts`, `SsmProvider` and `SsmSpecialist` must be seeded before `clientNexus` and `clientBistro` so that their resulting IDs (`defaultProvider.id`, `specialistPopescu.id`, `specialistVasilescu.id`) are available.
   - `defaultProvider` is upserted with `cui: 'RO34567890'` and `isDefault: true`.
   - `specialistPopescu` ("Ing. Mihai Popescu", EV 10452/2018) and `specialistVasilescu` ("Ing. Elena Vasilescu", SSM 8765/2020) are upserted under `defaultProvider.id`.
   - `clientNexus` is linked to `defaultProvider.id` and `specialistPopescu.id`.
   - `clientBistro` is linked to `defaultProvider.id` and `specialistPopescu.id` (or `specialistVasilescu.id`), while retaining populated legacy strings.

---

## 3. Caveats

1. **Prisma Client Regeneration**:
   - When modifying `prisma/schema.prisma`, `npx prisma db push` must be executed to push DDL changes to PostgreSQL and regenerate `@prisma/client`.
   - Code referencing `prisma.ssmProvider` or `prisma.ssmSpecialist` will encounter TypeScript compilation errors until `@prisma/client` is regenerated.
2. **`scripts/wipe-db.ts` Extension**:
   - If `scripts/wipe-db.ts` is run, it currently only deletes `HygieneSession`, `Client`, and `AuditEvent`.
   - When implementing F1, `wipe-db.ts` should be updated to also wipe `ssmSpecialist` and `ssmProvider` (or preserve them if treating provider profile as persistent settings), to avoid orphaned or unmanaged records during full db resets.
3. **No Caveats on Backwards Compatibility**:
   - Retaining scalar fields `ssmProviderName`, `ssmSpecialistName`, and `ssmSpecialistCert` alongside `providerId` and `specialistId` completely isolates existing tests and template generation from breaking changes.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Schema Definitions (`prisma/schema.prisma`)
Apply the unified diff documented in `.agents/teamwork/m1_r3_explorer_1/schema.patch`.

#### Exact Model: `SsmProvider`
```prisma
model SsmProvider {
  id                    String         @id @default(uuid())
  name                  String         // Denumire prestator SEPP (ex: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.")
  cui                   String         @unique // CUI / CIF prestator
  regCom                String?        // Nr. Registrul Comerțului (ex: "J40/1234/2020")
  address               String         // Sediu social complet prestator
  
  // Defalcare adresă pentru completare câmpuri șabloane
  street                String?        // Stradă (ex: "Str. Agricultori")
  number                String?        // Număr (ex: "35")
  building              String?        // Bloc (ex: "A1")
  entrance              String?        // Scara (ex: "1")
  floor                 String?        // Etaj (ex: "2")
  apartment             String?        // Apartament (ex: "6")
  postalCode            String?        // Cod poștal (ex: "021481")
  locality              String?        // Localitate (ex: "București")
  county                String?        // Județ / Sector (ex: "Sector 2")

  // Date acreditare / abilitare Ministerul Muncii - ITM
  authorizationNumber   String?        // Nr. certificat abilitare ITM (ex: "4812/2021")
  authorizationDate     DateTime?      // Data emiterii autorizației ITM
  authorizationDetails  String?        // Mențiune completă certificat (ex: "Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București")

  // Contact & Reprezentare
  phone                 String?        // Telefon contact
  email                 String?        // Email contact
  website               String?        // Website prestator
  legalRepresentative   String?        // Nume reprezentant legal prestator (ex: "Ing. Mihai Popescu")
  representativeRole    String?        // Calitate reprezentant (ex: "Director Executiv", "Administrator")
  representativeDoc     String?        // Act reprezentare (ex: "Decizia Asociaților nr. 01/2020")

  // Stare & Configurare
  isDefault             Boolean        @default(false) // Profilul principal/activ în Setări
  isActive              Boolean        @default(true)
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  specialists           SsmSpecialist[]
  clients               Client[]

  @@index([isActive])
}
```

#### Exact Model: `SsmSpecialist`
```prisma
model SsmSpecialist {
  id                String       @id @default(uuid())
  providerId        String
  provider          SsmProvider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  name              String       // Nume și prenume specialist (ex: "Ing. Mihai Popescu")
  role              String?      // Rol / Funcție (ex: "Specialist Principal SSM & Evaluator Riscuri", "Cadru Tehnic PSI")
  certificateNumber String?      // Număr / serie certificat atestare SSM / evaluator (ex: "Certificat seria EV nr. 10452/2018")
  qualification     String?      // Calificare / studii tehnice
  phone             String?      // Telefon direct
  email             String?      // Email contact
  cnp               String?      // CNP (pentru acte oficiale, opțional)
  
  isDefault         Boolean      @default(false) // Specialist selectat implicit
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  clients           Client[]

  @@unique([providerId, name])
  @@index([providerId])
  @@index([isActive])
}
```

#### Exact Relation Additions on `Client`
```prisma
  // Relații SEPP & Specialist Desemnat (Milestone 1 - F1)
  providerId          String?
  provider            SsmProvider?   @relation(fields: [providerId], references: [id], onDelete: SetNull)
  specialistId        String?
  specialist          SsmSpecialist? @relation(fields: [specialistId], references: [id], onDelete: SetNull)
```
And add indexes:
```prisma
  @@index([providerId])
  @@index([specialistId])
```

### 4.2 Seed Strategy (`prisma/seed.ts`)
Insert Section 0 before Client 1 in `prisma/seed.ts` (as provided in `.agents/teamwork/m1_r3_explorer_1/proposed_seed_snippet.ts`):
1. Upsert `defaultProvider` (`cui: 'RO34567890'`) with all 24 legal fields from `ROMANIAN_LEGAL_SSM_PROVIDER`.
2. Upsert `specialistPopescu` ("Ing. Mihai Popescu", `isDefault: true`).
3. Upsert `specialistVasilescu` ("Ing. Elena Vasilescu", `isDefault: false`).
4. Link `clientNexus` and `clientBistro` to `defaultProvider.id` and designated `specialistId`, while preserving `ssmProviderName`, `ssmSpecialistName`, and `ssmSpecialistCert`.
5. Update summary at end of `prisma/seed.ts` with counts for `ssmProvider` and `ssmSpecialist`.

---

## 5. Verification Method

To independently verify this implementation:

1. **Schema Validation**:
   ```bash
   npx prisma validate
   ```
   *Expected result*: Exit code 0, `The schema at prisma/schema.prisma is valid 🚀`.

2. **Database Push & Client Generation**:
   ```bash
   npx prisma db push
   ```
   *Expected result*: Generates SQL DDL on PostgreSQL, creates `SsmProvider` and `SsmSpecialist` tables, creates foreign key constraints on `Client` (`providerId`, `specialistId`), and regenerates `@prisma/client`.

3. **Seed Execution**:
   ```bash
   npx tsx prisma/seed.ts
   ```
   *Expected result*: Runs cleanly without errors. Outputs:
   `- Prestatori SSM: 1`
   `- Specialiști SSM: 2`
   `- Clienți: 2`

4. **Idempotence & Regression Pass**:
   Re-run seed to confirm upsert idempotence:
   ```bash
   npx tsx prisma/seed.ts
   ```
   Run existing regression suites to confirm zero regressions:
   ```bash
   npx tsx scripts/adversarial-m1-review.ts
   npx tsx scripts/verify-all.ts
   ```
   *Expected result*: All assertions pass.

5. **Invalidation Conditions**:
   - If `npx prisma validate` reports missing back-relation fields on `SsmProvider` or `SsmSpecialist`.
   - If deleting a provider cascades to delete clients (prevented by `onDelete: SetNull`).
   - If legacy string fields are missing from `Client`, causing `adversarial-m1-review.ts` to fail.
