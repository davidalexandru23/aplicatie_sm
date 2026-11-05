# Handoff Report — Feature F13: Automatic Fallback to `isDefault: true` External SSM Provider Subsystem

**Agent**: `m3_p3_explorer_2`  
**Milestone**: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)  
**Topic**: F13 External SSM Provider (`SsmProvider` & `SsmSpecialist`) Automatic Fallback Resolution  
**Date**: 2026-11-05T01:42:00Z  

---

## 1. Observation

### 1.1 Data Schema in `prisma/schema.prisma`
In `prisma/schema.prisma`:
- **Model `SsmProvider`** (lines 73–114):
  ```prisma
  model SsmProvider {
    id                    String         @id @default(uuid())
    name                  String         // Denumire prestator SEPP (ex: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.")
    cui                   String         @unique // CUI / CIF prestator
    regCom                String?        // Nr. Registrul Comerțului (ex: "J40/1234/2020")
    address               String         // Sediu social complet prestator
    street                String?        // Stradă (ex: "Str. Agricultori")
    number                String?        // Număr (ex: "35")
    building              String?        // Bloc (ex: "A1")
    entrance              String?        // Scara (ex: "1")
    floor                 String?        // Etaj (ex: "2")
    apartment             String?        // Apartament (ex: "6")
    postalCode            String?        // Cod poștal (ex: "021481")
    locality              String?        // Localitate (ex: "București")
    county                String?        // Județ / Sector (ex: "Sector 2")
    authorizationNumber   String?        // Nr. certificat abilitare ITM (ex: "4812/2021")
    authorizationDate     DateTime?      // Data emiterii autorizației ITM
    authorizationDetails  String?        // Mențiune completă certificat
    phone                 String?        // Telefon contact
    email                 String?        // Email contact
    website               String?        // Website prestator
    legalRepresentative   String?        // Nume reprezentant legal prestator
    representativeRole    String?        // Calitate reprezentant
    representativeDoc     String?        // Act reprezentare
    isDefault             Boolean        @default(false) // Profilul principal/activ în Setări
    isActive              Boolean        @default(true)
    createdAt             DateTime       @default(now())
    updatedAt             DateTime       @updatedAt

    specialists           SsmSpecialist[]
    clients               Client[]

    @@index([isActive])
  }
  ```

- **Model `SsmSpecialist`** (lines 116–139):
  ```prisma
  model SsmSpecialist {
    id                String       @id @default(uuid())
    providerId        String
    provider          SsmProvider  @relation(fields: [providerId], references: [id], onDelete: Cascade)
    name              String       // Nume și prenume specialist
    role              String?      // Rol / Funcție
    certificateNumber String?      // Număr / serie certificat atestare SSM / evaluator
    qualification     String?      // Calificare / studii tehnice
    phone             String?      // Telefon direct
    email             String?      // Email contact
    cnp               String?      // CNP
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

- **Relations in Model `Client`** (lines 42–46):
  ```prisma
    providerId          String?
    provider            SsmProvider?   @relation(fields: [providerId], references: [id], onDelete: SetNull)
    specialistId        String?
    specialist          SsmSpecialist? @relation(fields: [specialistId], references: [id], onDelete: SetNull)
  ```
  Along with legacy mirror fields (lines 38–40):
  ```prisma
    ssmProviderName     String?   // Denumire SEPP abilitat ITM
    ssmSpecialistName   String?   // Nume specialist SSM / evaluator
    ssmSpecialistCert   String?   // Număr / serie certificat atestare SSM
  ```

### 1.2 Seed Configuration in `prisma/seed.ts`
In `prisma/seed.ts` (lines 19–132):
- Default provider seeded with `isDefault: true`, `isActive: true`:
  - `name`: `'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'`
  - `cui`: `'RO34567890'`
  - `authorizationNumber`: `'4812/2021'`
  - `authorizationDate`: `new Date('2021-06-15T00:00:00.000Z')`
  - `authorizationDetails`: `'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București'`
  - `legalRepresentative`: `'Ing. Mihai Popescu'`
- Default specialist seeded with `isDefault: true`, `isActive: true`:
  - `name`: `'Ing. Mihai Popescu'`
  - `role`: `'Specialist Principal SSM & Evaluator Riscuri'`
  - `certificateNumber`: `'Certificat seria EV nr. 10452/2018'`
- Secondary specialist seeded with `isDefault: false`:
  - `name`: `'Ing. Elena Vasilescu'`

### 1.3 Current Implementation in `src/lib/templates/resolver.ts`
1. **In `resolveTemplatePlaceholders`** (lines 1774–1790):
   ```typescript
   const client = await prisma.client.findUnique({
     where: { id: ctx.clientId },
     include: {
       jobs: true,
       worksites: true,
       employees: {
         include: {
           identityDocument: true,
           residenceAddress: true,
           currentJob: true,
           currentWorksite: true,
         },
       },
       provider: true,
       specialist: true,
     },
   });
   ```
   Notice that `provider: true` does NOT include `specialists: true`. If `client.providerId` is null, both `client.provider` and `client.specialist` are null.

2. **In `resolveTemplateData`** (lines 1141–1188):
   ```typescript
   // 4. SEPP Provider Details (Dynamic relational binding with fallback)
   let prov = client?.provider;
   let spec = client?.specialist;

   if (!prov && client?.providerId) {
     prov = await prisma.ssmProvider.findUnique({ where: { id: client.providerId } });
   }
   if (!spec && client?.specialistId) {
     spec = await prisma.ssmSpecialist.findUnique({ where: { id: client.specialistId } });
   }

   const ssmProviderName = prov?.name || client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM;
   const ssmSpecialistName = spec?.name
     ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
     : client?.ssmSpecialistName
     ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
     : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;
   ```
   **Defect Observed**: When `client.providerId == null` and `client.specialistId == null`, `prov` and `spec` remain `undefined`. The code does **NOT** query the database for the active default provider (`prisma.ssmProvider.findFirst({ where: { isDefault: true } })`) or the active default specialist. Instead, it falls back to in-memory hardcoded constants in `ROMANIAN_LEGAL_SSM_PROVIDER`. Any custom default provider credentials configured by users in the database (`/settings`) are bypassed.

3. **Current Token Dictionary** (lines 1315–1342):
   ```typescript
   // SEPP External Provider (24 Tokens Dynamically Bound)
   PLACEHOLDER_PRESTATOR_SSM: ssmProviderName,
   PLACEHOLDER_FURNIZOR_SSM: ssmProviderName,
   PLACEHOLDER_CUI_PRESTATOR: cuiPrestator,
   PLACEHOLDER_CERTIFICAT_FURNIZOR: certFurnizor,
   PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: nrCertFurnizor,
   PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: nrInregFurnizor,
   PLACEHOLDER_STRADA_FURNIZOR: stradaFurnizor,
   PLACEHOLDER_NUMAR_FURNIZOR: numarFurnizor,
   PLACEHOLDER_BLOC_FURNIZOR: blocFurnizor,
   PLACEHOLDER_SCARA_FURNIZOR: scaraFurnizor,
   PLACEHOLDER_ETAJ_FURNIZOR: etajFurnizor,
   PLACEHOLDER_APARTAMENT_FURNIZOR: apFurnizor,
   PLACEHOLDER_COD_POSTAL_FURNIZOR: codPostalFurnizor,
   PLACEHOLDER_LOCALITATE_FURNIZOR: localitateFurnizor,
   PLACEHOLDER_JUDET_FURNIZOR: judetFurnizor,
   PLACEHOLDER_TELEFON_PRESTATOR: telPrestator,
   PLACEHOLDER_EMAIL_PRESTATOR: emailPrestator,
   PLACEHOLDER_SITE_PRESTATOR: sitePrestator,
   PLACEHOLDER_SPECIALIST_SSM: ssmSpecialistName,
   PLACEHOLDER_EVALUATOR_RISC: evaluatorName,
   PLACEHOLDER_CERTIFICAT_EVALUATOR: certificatEvaluator,
   PLACEHOLDER_REPREZENTANT_PRESTATOR: repPrestator,
   PLACEHOLDER_ACT_REPREZENTANT: actRepPrestator,
   PLACEHOLDER_ADRESA_PRESTATOR: (prov?.street || prov?.number || prov?.locality)
     ? `${prov.locality || 'București'}, ${prov.street || 'Str. Agricultori'} nr. ${prov.number || '35'}${prov.county ? `, ${prov.county}` : ''}`
     : 'București, Str. Agricultori nr. 35, Sector 2',
   ```
   Notice that while 24 tokens are mapped, `{PLACEHOLDER_SERVICIU_EXTERN_*}` aliases are currently absent from the dictionary.

---

## 2. Logic Chain

1. **Client Resolution Flow**:
   - `resolveTemplatePlaceholders` receives `ctx.clientId`.
   - It fetches `client` from Prisma. When the client is created without explicit provider allocation (e.g., intake without provider selection, batch Excel imports, API creations where `providerId` is omitted), `client.providerId` is `null` and `client.provider` is `null`.
2. **Current Resolution Limitation**:
   - In `resolveTemplateData`, `prov` is only looked up if `client?.providerId` is truthy.
   - If `client.providerId` is `null`, `prov` remains `undefined`.
   - The resolver then evaluates `ssmProviderName = prov?.name || client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM`.
   - If the user had customized the default SEPP provider in PostgreSQL (e.g. changing company name to "SAFETY EXPERT CONSULTING SRL", CUI to "RO12345678", authorization to "9999/2026"), these values are never loaded. The resolver outputs the static Bucharest mock constants from `ROMANIAN_LEGAL_SSM_PROVIDER`.
3. **Database as Single Source of Truth**:
   - Milestone 3 / Feature F13 requires that if `client.providerId` or `client.specialistId` is null, the resolver automatically queries `prisma.ssmProvider.findFirst({ where: { isDefault: true } })` and `prisma.ssmSpecialist.findFirst({ where: { isDefault: true } })`.
4. **Resolution Precedence Hierarchy**:
   To satisfy all backward compatibility requirements (specifically test 6 in `scripts/test-reviewer1-independent-audit.ts` where a legacy client has `providerId: null` but `ssmProviderName: 'LEGACY PRESTATOR SRL'`), the resolution must follow this exact precedence order:
   - **Level 1 (Explicit Relational)**: If `client.provider` or `client.providerId` is set, fetch and bind the specific provider and its specialist.
   - **Level 2 (Explicit Legacy String)**: If relational provider is absent, but `client.ssmProviderName` is non-empty, respect `client.ssmProviderName` for provider name tokens.
   - **Level 3 (Database Default `isDefault: true`)**: If neither relational provider nor legacy string exists, query `prisma.ssmProvider.findFirst({ where: { isDefault: true, isActive: true }, include: { specialists: true } })`. The provider's CUI, authorization number, address, and default specialist (`isDefault: true`) populate the document tokens.
   - **Level 4 (In-Memory Statutory Legal Fallback)**: If the database contains zero providers (e.g. prior to seeding or in stripped unit test fixtures), fallback gracefully to `ROMANIAN_LEGAL_SSM_PROVIDER`.

---

## 3. Caveats

1. **Legacy Client Backward Compatibility**:
   In `scripts/test-reviewer1-independent-audit.ts`, check 6 tests `legacyClient` where `providerId: null`, `ssmProviderName: 'LEGACY PRESTATOR SRL'`.
   If the default provider fallback were applied indiscriminately, `res.data.PLACEHOLDER_PRESTATOR_SSM` would be overwritten with `'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'`, causing check 6 to fail. Distinguishing `isFallbackProvider` ensures explicit legacy strings take priority over default provider fallback names.
2. **Multiple Specialists Marked `isDefault: true`**:
   During our database inspection, we observed that the development database had multiple specialists under the default provider with `isDefault: true` (`Ing. Preda Gabriela` and `Ing. Mihai Popescu`).
   Therefore, fallback queries MUST employ deterministic ordering:
   `orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]` or `orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]`.
3. **Sparse Sub-Addresses**:
   Real providers operating from individual houses may have `building: null`, `entrance: null`, `floor: null`, `apartment: null`. As verified in `scripts/test-adversarial-provider-tokens.ts`, these must resolve to `'-'` rather than `'null'` or `'undefined'`.
4. **Token Aliases**:
   While DOCX templates in the repository use `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_FURNIZOR_SSM`, `PLACEHOLDER_SPECIALIST_SSM`, etc., providing full alias support for `PLACEHOLDER_SERVICIU_EXTERN_*` ensures zero breaking changes across any consumer or statutory report.

---

## 4. Conclusion

### Concrete TypeScript Implementation for `src/lib/templates/resolver.ts`

#### Step A: Optimize `resolveTemplatePlaceholders` Relational Include
In `src/lib/templates/resolver.ts` around line 1787:
```typescript
      provider: {
        include: {
          specialists: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      specialist: true,
```

#### Step B: Implement Robust Fallback in `resolveTemplateData`
Replace lines 1141–1188 with:

```typescript
  // 4. SEPP Provider Details (Dynamic relational binding with isDefault: true fallback - Feature F13)
  let prov = client?.provider;
  let spec = client?.specialist;
  let isFallbackProvider = false;
  let isFallbackSpecialist = false;

  // 4.1. If client has explicit providerId, load that provider
  if (!prov && client?.providerId) {
    prov = await prisma.ssmProvider.findUnique({
      where: { id: client.providerId },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  // 4.2. Feature F13: If still no provider (providerId is null or missing), query DB default provider
  if (!prov) {
    prov = await prisma.ssmProvider.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    }) || await prisma.ssmProvider.findFirst({
      where: { isDefault: true },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    }) || await prisma.ssmProvider.findFirst({
      where: { isActive: true },
      include: {
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    isFallbackProvider = true;
  }

  // 4.3. If client has explicit specialistId, load that specialist
  if (!spec && client?.specialistId) {
    spec = await prisma.ssmSpecialist.findUnique({
      where: { id: client.specialistId },
      include: { provider: true },
    });
  }

  // 4.4. Feature F13: If still no specialist (specialistId is null or missing):
  // Check the resolved provider's specialists first (preferring isDefault: true)
  if (!spec && prov) {
    if (prov.specialists && Array.isArray(prov.specialists) && prov.specialists.length > 0) {
      spec = prov.specialists.find((s: any) => s.isDefault && s.isActive) ||
             prov.specialists.find((s: any) => s.isDefault) ||
             prov.specialists.find((s: any) => s.isActive) ||
             prov.specialists[0];
    } else {
      spec = await prisma.ssmSpecialist.findFirst({
        where: { providerId: prov.id, isDefault: true, isActive: true },
      }) || await prisma.ssmSpecialist.findFirst({
        where: { providerId: prov.id, isDefault: true },
      }) || await prisma.ssmSpecialist.findFirst({
        where: { providerId: prov.id, isActive: true },
      });
    }
    isFallbackSpecialist = true;
  }

  // 4.5. Global fallback to any active default specialist in DB
  if (!spec) {
    spec = await prisma.ssmSpecialist.findFirst({
      where: { isDefault: true, isActive: true },
    }) || await prisma.ssmSpecialist.findFirst({
      where: { isDefault: true },
    });
    isFallbackSpecialist = true;
  }

  // 4.6. Precedence: Explicit relational -> Explicit legacy string -> Fallback DB default -> Static legal mock
  const ssmProviderName = (!isFallbackProvider && prov?.name)
    ? prov.name
    : (client?.ssmProviderName || prov?.name || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM);

  const ssmSpecialistName = (!isFallbackSpecialist && spec?.name)
    ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
    : client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
    : spec?.name
    ? `${spec.name} (${spec.role || 'Specialist SSM abilitat'}, ${spec.certificateNumber || 'Certificat abilitare SSM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;

  const evaluatorName = (!isFallbackSpecialist && spec?.name)
    ? `${spec.name} (Evaluator risc SSM, ${spec.certificateNumber || 'Certificat atestare INCDPM'})`
    : client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})`
    : spec?.name
    ? `${spec.name} (Evaluator risc SSM, ${spec.certificateNumber || 'Certificat atestare INCDPM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC;

  const certificatEvaluator = (!isFallbackSpecialist && spec?.certificateNumber)
    ? spec.certificateNumber
    : client?.ssmSpecialistCert || spec?.certificateNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR;

  const cuiPrestator = prov?.cui || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CUI_PRESTATOR;
  const certFurnizor = prov?.authorizationDetails
    ? prov.authorizationDetails
    : prov?.authorizationNumber
    ? `Certificat abilitare Serviciu Extern SSM nr. ${prov.authorizationNumber}${prov.authorizationDate ? ` din ${formatDateRo(prov.authorizationDate)}` : ''} emis de Ministerul Muncii - ITM București`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_FURNIZOR;
  const nrCertFurnizor = prov?.authorizationNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR;
  const nrInregFurnizor = prov?.regCom || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR;
  const stradaFurnizor = prov?.street || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_STRADA_FURNIZOR;
  const numarFurnizor = prov?.number || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_FURNIZOR;
  const blocFurnizor = prov?.building ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_BLOC_FURNIZOR);
  const scaraFurnizor = prov?.entrance ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SCARA_FURNIZOR);
  const etajFurnizor = prov?.floor ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ETAJ_FURNIZOR);
  const apFurnizor = prov?.apartment ?? (prov ? '-' : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_APARTAMENT_FURNIZOR);
  const codPostalFurnizor = prov?.postalCode || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_COD_POSTAL_FURNIZOR;
  const localitateFurnizor = prov?.locality || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_LOCALITATE_FURNIZOR;
  const judetFurnizor = prov?.county || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_JUDET_FURNIZOR;
  const telPrestator = prov?.phone || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_TELEFON_PRESTATOR;
  const emailPrestator = prov?.email || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EMAIL_PRESTATOR;
  const sitePrestator = prov?.website || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SITE_PRESTATOR;
  const repPrestator = prov?.legalRepresentative || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_REPREZENTANT_PRESTATOR;
  const rolRepPrestator = prov?.representativeRole || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CALITATE_REPREZENTANT;
  const actRepPrestator = prov?.representativeDoc || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ACT_REPREZENTANT;
  const adresaPrestator = (prov?.street || prov?.number || prov?.locality)
    ? `${prov.locality || 'București'}, ${prov.street || 'Str. Agricultori'} nr. ${prov.number || '35'}${prov.county ? `, ${prov.county}` : ''}`
    : 'București, Str. Agricultori nr. 35, Sector 2';
```

#### Step C: Inject Complete Dictionary & `{PLACEHOLDER_SERVICIU_EXTERN_*}` Aliases
In the returned data dictionary:
```typescript
    // SEPP External Provider (Standard & F13 Tokens Dynamically Bound)
    PLACEHOLDER_PRESTATOR_SSM: ssmProviderName,
    PLACEHOLDER_FURNIZOR_SSM: ssmProviderName,
    PLACEHOLDER_CUI_PRESTATOR: cuiPrestator,
    PLACEHOLDER_CERTIFICAT_FURNIZOR: certFurnizor,
    PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: nrCertFurnizor,
    PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: nrInregFurnizor,
    PLACEHOLDER_STRADA_FURNIZOR: stradaFurnizor,
    PLACEHOLDER_NUMAR_FURNIZOR: numarFurnizor,
    PLACEHOLDER_BLOC_FURNIZOR: blocFurnizor,
    PLACEHOLDER_SCARA_FURNIZOR: scaraFurnizor,
    PLACEHOLDER_ETAJ_FURNIZOR: etajFurnizor,
    PLACEHOLDER_APARTAMENT_FURNIZOR: apFurnizor,
    PLACEHOLDER_COD_POSTAL_FURNIZOR: codPostalFurnizor,
    PLACEHOLDER_LOCALITATE_FURNIZOR: localitateFurnizor,
    PLACEHOLDER_JUDET_FURNIZOR: judetFurnizor,
    PLACEHOLDER_TELEFON_PRESTATOR: telPrestator,
    PLACEHOLDER_EMAIL_PRESTATOR: emailPrestator,
    PLACEHOLDER_SITE_PRESTATOR: sitePrestator,
    PLACEHOLDER_SPECIALIST_SSM: ssmSpecialistName,
    PLACEHOLDER_EVALUATOR_RISC: evaluatorName,
    PLACEHOLDER_CERTIFICAT_EVALUATOR: certificatEvaluator,
    PLACEHOLDER_REPREZENTANT_PRESTATOR: repPrestator,
    PLACEHOLDER_CALITATE_REPREZENTANT_PRESTATOR: rolRepPrestator,
    PLACEHOLDER_ACT_REPREZENTANT: actRepPrestator,
    PLACEHOLDER_ADRESA_PRESTATOR: adresaPrestator,

    // Aliases for Serviciu Extern SSM
    PLACEHOLDER_SERVICIU_EXTERN_DENUMIRE: ssmProviderName,
    PLACEHOLDER_SERVICIU_EXTERN_NUME: ssmProviderName,
    PLACEHOLDER_SERVICIU_EXTERN_CUI: cuiPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_REG_COM: nrInregFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_CERTIFICAT: certFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_NUMAR_CERTIFICAT: nrCertFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_ADRESA: adresaPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_TELEFON: telPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_EMAIL: emailPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_SITE: sitePrestator,
    PLACEHOLDER_SERVICIU_EXTERN_REPREZENTANT: repPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_CALITATE_REPREZENTANT: rolRepPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_ACT_REPREZENTANT: actRepPrestator,
    PLACEHOLDER_SERVICIU_EXTERN_LOCALITATE: localitateFurnizor,
    PLACEHOLDER_SERVICIU_EXTERN_JUDET: judetFurnizor,
```

---

## 5. Verification Method

To independently verify this implementation:
1. **Adversarial Provider Token Test**:
   Run:
   ```bash
   npx tsx scripts/test-adversarial-provider-tokens.ts
   ```
   Verifies that explicitly assigned custom providers (e.g. Cluj-Napoca) are NEVER overwritten by fallback defaults.
2. **Naked Client Fallback Test**:
   Execute a test with a client having `providerId: null` and `specialistId: null`:
   ```typescript
   const client = await prisma.client.create({
     data: { name: 'FALLBACK TEST SRL', cui: 'RO99990001', address: 'Str. Test 1' }
   });
   const res = await resolveTemplateData('ipssm-birou', { client });
   const defaultProvider = await prisma.ssmProvider.findFirst({ where: { isDefault: true } });
   assert.strictEqual(res.data.PLACEHOLDER_PRESTATOR_SSM, defaultProvider.name);
   assert.strictEqual(res.data.PLACEHOLDER_CUI_PRESTATOR, defaultProvider.cui);
   assert.strictEqual(res.data.PLACEHOLDER_SERVICIU_EXTERN_NUME, defaultProvider.name);
   assert(res.data.PLACEHOLDER_SPECIALIST_SSM.includes(defaultProvider.specialists[0].name));
   ```
3. **Legacy String Compatibility Test**:
   Execute test on a client with `providerId: null` but `ssmProviderName: 'CUSTOM LEGACY'`:
   ```typescript
   assert.strictEqual(resLegacy.data.PLACEHOLDER_PRESTATOR_SSM, 'CUSTOM LEGACY');
   ```
4. **Invalidation Condition**:
   The solution is invalidated if any of the following occur:
   - A client with `providerId: null` outputs undefined or blank provider tokens.
   - A legacy client with explicit `ssmProviderName` has its name replaced by the default provider.
   - Multiple `isDefault: true` specialists crash the resolver or result in non-deterministic string output.
