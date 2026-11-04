# Handoff Report: Specification Mining & Architecture for Client Dropdown Persistence, API Dual-Persistence & Template Resolver Integration (Milestone 1 - F3)

**Agent ID**: `m1_r3_spec_miner_3` (teamwork_spec_miner)  
**Milestone**: Milestone 1 (F3: Client Provider & Specialist Persistence & Template Binding)  
**Date**: 2026-11-03  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_spec_miner_3/`  
**Recipient**: `52a3ebb3-f7ef-4302-a871-b663bbb8cd88` (Parent Orchestrator)  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Baseline System Verification
- Ran unified verification runner `scripts/verify-all.ts`:
  - Suite 1 (Document Auto-Completion 25/25): PASS (2094ms)
  - Suite 2 (Compliance Deadlines 45/45): PASS (623ms)
  - Suite 3 (Excel Import/Export 6/6): PASS (924ms)
  - Suite 4 (Comprehensive E2E Tiers 1–4, 53/53): PASS (2556ms)
  - Suite 5 (Next.js Turbopack Production Build): PASS (3419ms)
  - Overall Verdict: 130/130 verified items passing, exit code 0.

### 1.2 Inspection of `src/components/client-intake-modal.tsx`
- **File Path**: `/Users/davidalexandru/Documents/Proiect_SSM/src/components/client-intake-modal.tsx` (371 lines).
- **Initial State (lines 28–30)**:
  ```typescript
  ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  ssmSpecialistName: 'Ing. Mihai Popescu',
  ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
  ```
- **Section 4 Form UI (lines 294–335)**:
  - Three static `<input type="text">` elements for `ssmProviderName`, `ssmSpecialistName`, and `ssmSpecialistCert`.
  - There is NO provider dropdown, NO specialist dropdown, NO fetching from `/api/providers`, and NO state for `providerId` or `specialistId`.
- **Form Submission (lines 47–66)**:
  - Dispatches `POST /api/clients` with raw string values (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`), completely omitting relational foreign keys.

### 1.3 Inspection of `src/components/client-edit-modal.tsx`
- **File Path**: `/Users/davidalexandru/Documents/Proiect_SSM/src/components/client-edit-modal.tsx` (416 lines).
- **Interface Definition (lines 9–30)**:
  `ClientEditModalProps` defines `client` with scalar strings `ssmProviderName?: string | null`, `ssmSpecialistName?: string | null`, `ssmSpecialistCert?: string | null`, but lacks `providerId?: string | null` and `specialistId?: string | null`.
- **Form State & UI (lines 43–59, 339–380)**:
  - Mirrors `client-intake-modal.tsx`: renders 3 plain text inputs for SEPP fields without dropdowns or dynamic provider-to-specialist filtering.
- **Form Submission (lines 97–117)**:
  - Dispatches `PATCH /api/clients/${client.id}` sending only legacy scalar string fields.

### 1.4 Inspection of Client API Routes
- **File Path**: `src/app/api/clients/route.ts` (165 lines):
  - In `GET`: Selects legacy columns `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`. Does not select or include `provider` or `specialist` relations.
  - In `POST` (lines 51–156):
    - Extracts `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`.
    - Does not read or persist `providerId` or `specialistId`.
    - Does not synchronize entity fields with legacy columns if foreign keys are passed.
- **File Path**: `src/app/api/clients/[id]/route.ts` (223 lines):
  - In `GET` (lines 12–26): Includes `worksites`, `jobs`, `_count`, but omits `provider` and `specialist`.
  - In `PATCH` (lines 41–194):
    - Reads only `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`.
    - Lacks handling for `providerId` and `specialistId` (or alias `designatedSpecialistId`).
    - Lacks foreign key validation and backwards-compatibility string synchronization.

### 1.5 Inspection of Client Dossier View (`src/app/clients/[id]/page.tsx`)
- **File Path**: `src/app/clients/[id]/page.tsx` (642 lines):
  - Query (lines 46–71): `prisma.client.findUnique` does not include `provider` or `specialist`.
  - SEPP Card (lines 259–286):
    - Renders only `client.ssmProviderName`, `client.ssmSpecialistName`, `client.ssmSpecialistCert`.
    - Displays no provider corporate information (CUI, RegCom, official address), no ITM accreditation details (certificate number and authorization date), and no specialist contact info (role, phone, email).
  - Modal Integration (lines 154, 196):
    - Passes `client` without `providerId` or `specialistId` to `<ClientEditModal client={client} />`.

### 1.6 Inspection of Template Resolver (`src/lib/templates/resolver.ts`)
- **File Path**: `src/lib/templates/resolver.ts` (917 lines):
  - Provider Fallback Constant (lines 41–66): `ROMANIAN_LEGAL_SSM_PROVIDER` hardcodes 24 tokens for `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.` (CUI `RO34567890`, ITM cert `4812/2021`, address `Str. Agricultori nr. 35, Sector 2`, specialist `Ing. Mihai Popescu`).
  - Contextual Resolution Query (lines 842–845):
    ```typescript
    const client = await prisma.client.findUnique({
      where: { id: ctx.clientId },
      include: { jobs: true, worksites: true, employees: true },
    });
    ```
    `provider` and `specialist` relations are NOT eagerly loaded.
  - Token Mapping in `verifiedMap` (lines 548–555, 589–595):
    - Only 5 tokens are extracted from `client` (`PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_FURNIZOR_SSM`, `PLACEHOLDER_SPECIALIST_SSM`, `PLACEHOLDER_EVALUATOR_RISC`, `PLACEHOLDER_CERTIFICAT_EVALUATOR`).
    - The remaining 19 provider tokens (CUI, RegCom, ITM cert number, street, number, building, entrance, floor, apartment, postal code, locality, county, phone, email, website, legal representative, representative role, representative act) are NEVER populated from database entities and silently fall back to static constant values.

---

## 2. Logic Chain

1. **Premise 1**: Romanian occupational safety and health regulations (Legea 319/2006 Art. 8, HG 1425/2006 Art. 28–36) mandate that documentation generated by an external prevention and protection service (SEPP) must state the provider's exact legal identification (CUI, Reg. Com., registered office), its Ministry of Labour/ITM accreditation certificate number and date, and the assigned accredited specialist.
2. **Premise 2**: In `ORIGINAL_REQUEST.md` (R2) and `PROJECT.md` (F3), client creation and edit forms must allow assigning an external provider and selecting a designated specialist from a dropdown, with seamless persistence.
3. **Premise 3**: In existing client modals (`client-intake-modal.tsx` and `client-edit-modal.tsx`), SEPP data is currently entered as raw text, which leads to typos, inconsistent spelling, and decoupled records. By implementing dual reactive dropdowns linked to `/api/providers`:
   - Dropdown 1 presents all accredited providers in the system (with default pre-selection).
   - Dropdown 2 dynamically filters specialists to only those employed by the chosen provider.
   - Certificate series and number auto-fill immediately upon specialist selection.
4. **Premise 4**: For API backwards compatibility (`/api/clients` and `/api/clients/[id]`), existing scripts, imports, or external callers might still submit legacy strings (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`). To prevent breaking changes, the API routes must:
   - Accept both `providerId` / `specialistId` and the legacy strings.
   - When `providerId` / `specialistId` are provided, query the relational entities to automatically synchronize the legacy strings in the same transaction.
   - When foreign keys are omitted, persist the legacy strings as fallback.
5. **Premise 5**: On the client detail page (`/clients/[id]`), rendering the rich SEPP profile (corporate identifiers, ITM authorization badge, specialist role and contact details) provides operational visibility into compliance consulting coverage, fulfilling Requirement R2.
6. **Premise 6**: In `resolver.ts`, `resolveTemplatePlaceholders` is the single point of truth for document generation. By updating the Prisma query to include `provider: true` and `specialist: true`, and dynamically mapping all 24 provider tokens in `verifiedMap`, all 15 official templates requiring external provider details will output authentic, database-driven consulting accreditations.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | UI / Intake | `ClientIntakeModal: Provider & Specialist Fetching & Dropdowns` | Asynchronous retrieval of active provider and specialist profiles from `/api/providers`, rendering dual reactive `<select>` controls for external SSM consulting firm and designated specialist in Section 4 of modal. | User triggers "Client Nou" modal | Populated provider options with corporate CUI and specialist options with role/cert | If `/api/providers` network request fails, falls back gracefully to manual text inputs without modal crash | `src/components/client-intake-modal.tsx`, `PROJECT.md` F3 |
| 2 | UI / Intake | `ClientIntakeModal: Default Provider Pre-Selection & Auto-Sync` | Automatically detects default provider (`isDefault === true` or first entry) and pre-selects default specialist, synchronizing legacy string state (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`) with database entity fields. | Loaded provider catalog array | Form state pre-populated with `providerId`, `specialistId`, and matching legacy strings | If provider has zero active specialists, `specialistId` is cleared and dropdown is disabled with helper text | `src/components/client-intake-modal.tsx`, `PROJECT.md` § Interface Contracts |
| 3 | UI / Intake | `ClientIntakeModal: Dynamic Cascading Specialist Filtering` | On user selection of a different provider in `<select>`, immediately filters available specialists to those belonging to the selected provider's `specialists` array, updating certificate string. | `onChange` event with new `providerId` | Re-rendered specialist `<select>` matching parent provider, auto-selecting first active specialist or clearing | Preserves previously entered custom strings if user switches to manual mode | `src/components/client-intake-modal.tsx` |
| 4 | UI / Edit | `ClientEditModal: Provider & Specialist Prefill & Dynamic Filtering` | Prefills provider and specialist dropdowns from existing client record (`client.providerId`, `client.specialistId`), with fallback matching on `ssmProviderName` and `ssmSpecialistName` for legacy clients. | `client` prop containing relational IDs and legacy strings | Interactive modal pre-selected to client's assigned consulting firm and specialist, allowing portfolio reassignment | If client has legacy strings not matching any database provider, displays provider dropdown with custom option or allows manual override | `src/components/client-edit-modal.tsx` |
| 5 | API / Client | `POST /api/clients: Relational Foreign Key & Legacy String Dual-Persistence` | Accepts `providerId` and `specialistId` (with alias `designatedSpecialistId`), resolves entity records, validates foreign key integrity, and persists both relational IDs and cached legacy strings. | JSON payload with `providerId`, `specialistId`, and client company data | HTTP 201 Created with persisted `Client` including foreign keys and legacy strings | If `providerId` or `specialistId` does not exist in DB, returns HTTP 400 with descriptive error or ignores invalid foreign key | `src/app/api/clients/route.ts` |
| 6 | API / Client | `PATCH /api/clients/[id]: Provider Reassignment & Relation Nullification` | Updates assigned provider and specialist, handles unassignment (null / empty string), and maintains legacy string synchronization. | JSON payload with `providerId`, `specialistId` (or `null` to detach) | HTTP 200 OK with updated client object | Non-existent client returns HTTP 404; duplicate CUI check preserved | `src/app/api/clients/[id]/route.ts` |
| 7 | API / Client | `GET /api/clients & GET /api/clients/[id]: Relational Provider Eager Loading` | Includes `provider: true` and `specialist: true` in client queries so consuming UI components receive full accreditation and specialist data without secondary requests. | Client ID or list query | JSON response with embedded `provider` and `specialist` objects | Graceful null if unassigned | `src/app/api/clients/[id]/route.ts`, `src/app/api/clients/route.ts` |
| 8 | UI / Dossier | `Client Dossier View: Rich Provider & Specialist Accreditation Card` | Renders external SSM provider profile and specialist accreditation in the SEPP card on `/clients/[id]`, displaying ITM certificate number, authorization date, CUI, address, specialist role, contact info, and fallback strings. | `client` with `provider` and `specialist` relations | Polished Tailwind CSS information card with badge and verified status | If unassigned, displays "Nespecificat" in subtle muted italic styling | `src/app/clients/[id]/page.tsx` |
| 9 | Resolver | `resolver.ts: Relational Provider Eager Loading in resolveTemplatePlaceholders` | Extends `prisma.client.findUnique` in `resolveTemplatePlaceholders` to include `provider: true` and `specialist: true`, passing full provider profile into `resolveTemplateData`. | `TemplateResolutionContext` with `clientId` | `Client` object with resolved `provider` and `specialist` | If client missing, throws Error "Clientul nu a fost găsit." | `src/lib/templates/resolver.ts` lines 842-845 |
| 10 | Resolver | `resolver.ts: Dynamic 24-Token Provider & Specialist Placeholder Binding` | Replaces static constant fallbacks in `verifiedMap` with dynamic values from `client.provider` and `client.specialist`: ITM certificate series/number/date, CUI, RegCom, full segmented address (street, number, building, entrance, floor, apartment, postal code, locality, county), phone, email, website, legal representative, and specialist accreditation. | `client.provider` and `client.specialist` entities | 24 dynamically bound `PLACEHOLDER_*` tokens in `verifiedMap` | Gracefully falls back to `ROMANIAN_LEGAL_SSM_PROVIDER` if provider or specialist is unassigned | `src/lib/templates/resolver.ts` lines 41-66, 548-555, 589-595 |
| 11 | API / Templates | `GET /api/templates/[code]/fields: Dynamic Provider Field Reflection` | Exposes resolved template fields to document generation preview UI, reflecting dynamic provider and specialist values. | `code`, `clientId` | Array of resolved placeholder items with `isAutocompleted: true` | Missing `clientId` returns HTTP 400 | `src/app/api/templates/[code]/fields/route.ts` |

---

## 4. Edge Cases

| # | Feature | Input / Condition | Observed Behavior | Normative Resolution |
|---|---------|-------------------|-------------------|----------------------|
| 1 | Unassigned Provider on Client | Client record has `providerId: null` | `client.provider` is null. Currently, resolver uses static constant `ROMANIAN_LEGAL_SSM_PROVIDER`. | Use `client.ssmProviderName` if present; otherwise fallback to default provider profile. UI displays "Nespecificat" in italics without throwing exceptions. |
| 2 | Provider Assigned, Specialist Unassigned | Client has valid `providerId`, but `specialistId: null` | Provider tokens resolve from DB provider record; specialist tokens lack relation. | Provider tokens bind from `client.provider`; specialist tokens resolve from `client.ssmSpecialistName` / `client.ssmSpecialistCert` or fallback constant. |
| 3 | Provider Switching in Edit Modal | User selects Provider B after Provider A with Specialist A1 was loaded | Specialist A1 does not belong to Provider B. | When `providerId` changes in `<select>`, immediately re-filter specialist list; auto-select first active specialist of Provider B, or set to `''` if none; update certificate field. |
| 4 | Legacy String Synchronization Integrity | API caller passes only legacy strings `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert` (no `providerId`) | Endpoint persists strings without foreign keys. | Persist strings as provided; do not set invalid UUIDs. Resolver continues to bind legacy strings into document generation. |
| 5 | Missing Provider Sub-Address Components | Provider is located in commercial building (`apartment: null`, `entrance: null`) | Sub-address tokens (`PLACEHOLDER_APARTAMENT_FURNIZOR`, `PLACEHOLDER_SCARA_FURNIZOR`) could be omitted or empty. | Supply `'-'` or empty string gracefully so docxtemplater replaces token cleanly without leaving raw `{PLACEHOLDER_*}` syntax in DOCX. |
| 6 | Specialist Deletion / Deactivation | Specialist record is deleted or set `isActive: false` while linked to clients | Foreign key relation triggers Prisma `onDelete: SetNull`. | `client.specialistId` becomes `null`; legacy string columns (`ssmSpecialistName`, `ssmSpecialistCert`) preserve historical audit trail of previous compliance evaluations. |
| 7 | CUI Normalization on Provider / Client | CUI entered with/without "RO" prefix or leading spaces (e.g. ` ro34567890 `) | Inconsistent string casing causes mismatch in unique lookups. | Standardize with `.trim().toUpperCase()`. Strip non-alphanumeric characters if necessary. |
| 8 | Manual Override Precedence | User provides custom override `customFields: { PLACEHOLDER_PRESTATOR_SSM: "PREVENT CONSULT" }` | Both DB provider and manual override are present. | In `resolver.ts`, `customOverrides` are spread last (`...ALL_ROMANIAN_LEGAL_FALLBACKS, ...verifiedMap, ...context.customOverrides`), ensuring user manual edits take absolute final precedence. |

---

## 5. Caveats

- **Scope Boundary**: This investigation is read-only and analytical. No production code in `src/` or `prisma/` was altered during this phase.
- **Dependency on F1 Models**: Feature F3 depends on the Prisma schema migration adding `SsmProvider` and `SsmSpecialist` models and relation fields `providerId` and `specialistId` on `Client`, which is being specified by `m1_r3_explorer_1`.
- **Dependency on F2 API**: The dropdown components in `client-intake-modal.tsx` and `client-edit-modal.tsx` consume `GET /api/providers`, which is being specified by `m1_r3_explorer_2`. If `/api/providers` returns an empty array (before seeding), the modals gracefully fall back to editable text inputs.

---

## 6. Conclusion & Concrete Technical Blueprint

To execute Milestone 1 Feature 3 flawlessly, the worker agent must follow this exact step-by-step implementation blueprint:

### 6.1 `src/components/client-intake-modal.tsx`
1. **Define Provider Interface**:
   ```typescript
   interface ProviderOption {
     id: string;
     name: string;
     cui: string;
     itmCertificateNumber: string;
     isDefault?: boolean;
     specialists: Array<{
       id: string;
       name: string;
       role?: string | null;
       certificateNumber: string;
       isActive: boolean;
     }>;
   }
   ```
2. **Add State Variables**:
   ```typescript
   const [providers, setProviders] = useState<ProviderOption[]>([]);
   const [selectedProviderId, setSelectedProviderId] = useState<string>('');
   const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>('');
   const [isLoadingProviders, setIsLoadingProviders] = useState(false);
   ```
3. **Fetch Providers on Modal Open**:
   In `useEffect` when `isOpen === true`:
   - Fetch `/api/providers`.
   - On response: if `providers.length > 0`:
     - Select default provider (`p.isDefault === true` or `providers[0]`).
     - Set `selectedProviderId(defaultProvider.id)`.
     - Set `formData.ssmProviderName(defaultProvider.name)`.
     - Find active specialists: if any, select first, set `selectedSpecialistId(spec.id)`, `formData.ssmSpecialistName(spec.name)`, and `formData.ssmSpecialistCert(spec.certificateNumber)`.
4. **Provider Dropdown Change Handler**:
   - Updates `selectedProviderId`.
   - Filters specialists for chosen provider.
   - Updates `selectedSpecialistId` to first active specialist (or `''`).
   - Automatically synchronizes `formData.ssmProviderName`, `formData.ssmSpecialistName`, and `formData.ssmSpecialistCert`.
5. **Specialist Dropdown Change Handler**:
   - Updates `selectedSpecialistId`.
   - Automatically synchronizes `formData.ssmSpecialistName` and `formData.ssmSpecialistCert`.
6. **Form Submission Payload**:
   Include `providerId: selectedProviderId || null` and `specialistId: selectedSpecialistId || null` alongside legacy string fields in the `POST /api/clients` body.

### 6.2 `src/components/client-edit-modal.tsx`
1. Update `ClientEditModalProps` to include `providerId?: string | null` and `specialistId?: string | null` on `client`.
2. Initialize `selectedProviderId` from `client.providerId || ''` and `selectedSpecialistId` from `client.specialistId || ''`.
3. In `handleOpen`:
   - Fetch `/api/providers`.
   - If `client.providerId` matches an existing provider, select it. If not, match by `client.ssmProviderName`.
   - Filter specialists and select `client.specialistId` or match by `client.ssmSpecialistName`.
4. Render dual reactive `<select>` elements in Section 4, with certificate auto-fill.
5. In `handleSubmit`:
   Send `PATCH /api/clients/${client.id}` with `providerId`, `specialistId`, and synchronized legacy string columns.

### 6.3 `src/app/api/clients/route.ts` & `src/app/api/clients/[id]/route.ts`
1. **In `POST /api/clients`**:
   - Extract `providerId`, `specialistId`, `designatedSpecialistId`.
   - Resolve effective specialist ID: `const effSpecialistId = specialistId || designatedSpecialistId || null;`
   - If `providerId` provided, verify existence in `prisma.ssmProvider`; auto-sync `ssmProviderName = ssmProviderName || provider.name`.
   - If `effSpecialistId` provided, verify existence in `prisma.ssmSpecialist`; auto-sync `ssmSpecialistName = ssmSpecialistName || specialist.name` and `ssmSpecialistCert = ssmSpecialistCert || specialist.certificateNumber`.
   - Save to `prisma.client.create`:
     ```typescript
     data: {
       ...
       providerId: providerId || null,
       specialistId: effSpecialistId,
       ssmProviderName: ssmProviderName ? String(ssmProviderName).trim() : null,
       ssmSpecialistName: ssmSpecialistName ? String(ssmSpecialistName).trim() : null,
       ssmSpecialistCert: ssmSpecialistCert ? String(ssmSpecialistCert).trim() : null,
     }
     ```
2. **In `PATCH /api/clients/[id]`**:
   - Handle `providerId` (updating to new ID or nullifying if empty/null).
   - Handle `specialistId` / `designatedSpecialistId`.
   - Keep legacy string columns synchronized when foreign keys change.
3. **In `GET /api/clients` & `GET /api/clients/[id]`**:
   - Include `provider: true` and `specialist: true`.

### 6.4 `src/app/clients/[id]/page.tsx`
1. Update `prisma.client.findUnique({ where: { id }, include: { ... } })`:
   Add `provider: true` and `specialist: true`.
2. Pass complete `client` object to `<ClientEditModal client={client} />`.
3. In SEPP Card (lines 259–286):
   - Prestator Abilitat ITM:
     Display `client.provider?.name || client.ssmProviderName || 'Nespecificat'`.
     If `client.provider`: show CUI badge, Reg. Com., ITM Abilitation Certificate number and date (`formatRoDate(client.provider.itmCertificateDate)`), and address.
   - Specialist / Evaluator Desemnat:
     Display `client.specialist?.name || client.ssmSpecialistName || 'Nespecificat'`.
     If `client.specialist`: show role badge, phone, and email.
   - Certificat Atestare / Abilitare:
     Display `client.specialist?.certificateNumber || client.ssmSpecialistCert || 'Nespecificat'`.

### 6.5 `src/lib/templates/resolver.ts`
1. In `resolveTemplatePlaceholders(ctx: TemplateResolutionContext)` (lines 842–845):
   ```typescript
   const client = await prisma.client.findUnique({
     where: { id: ctx.clientId },
     include: {
       jobs: true,
       worksites: true,
       employees: true,
       provider: true,
       specialist: true,
     },
   });
   ```
2. In `resolveTemplateData`:
   Extract `provider = client?.provider` and `specialist = client?.specialist`.
   Dynamically populate all 24 provider tokens into `verifiedMap`:
   - `PLACEHOLDER_PRESTATOR_SSM`: `provider?.name || client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM`
   - `PLACEHOLDER_FURNIZOR_SSM`: `provider?.name || client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_FURNIZOR_SSM`
   - `PLACEHOLDER_CUI_PRESTATOR`: `provider?.cui || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CUI_PRESTATOR`
   - `PLACEHOLDER_CERTIFICAT_FURNIZOR`: `provider?.itmCertificateNumber ? `Certificat abilitare Serviciu Extern SSM nr. ${provider.itmCertificateNumber}${provider.itmCertificateDate ? ` din ${formatDateRo(provider.itmCertificateDate)}` : ''} emis de Ministerul Muncii - ITM` : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_FURNIZOR`
   - `PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`: `provider?.itmCertificateNumber || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR`
   - `PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`: `provider?.regCom || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`
   - `PLACEHOLDER_STRADA_FURNIZOR`: `provider?.street || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_STRADA_FURNIZOR`
   - `PLACEHOLDER_NUMAR_FURNIZOR`: `provider?.number || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_FURNIZOR`
   - `PLACEHOLDER_BLOC_FURNIZOR`: `provider?.building || '-'`
   - `PLACEHOLDER_SCARA_FURNIZOR`: `provider?.entrance || '-'`
   - `PLACEHOLDER_ETAJ_FURNIZOR`: `provider?.floor || '-'`
   - `PLACEHOLDER_APARTAMENT_FURNIZOR`: `provider?.apartment || '-'`
   - `PLACEHOLDER_COD_POSTAL_FURNIZOR`: `provider?.postalCode || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_COD_POSTAL_FURNIZOR`
   - `PLACEHOLDER_LOCALITATE_FURNIZOR`: `provider?.locality || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_LOCALITATE_FURNIZOR`
   - `PLACEHOLDER_JUDET_FURNIZOR`: `provider?.county || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_JUDET_FURNIZOR`
   - `PLACEHOLDER_TELEFON_PRESTATOR`: `provider?.phone || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_TELEFON_PRESTATOR`
   - `PLACEHOLDER_EMAIL_PRESTATOR`: `provider?.email || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EMAIL_PRESTATOR`
   - `PLACEHOLDER_SITE_PRESTATOR`: `provider?.website || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SITE_PRESTATOR`
   - `PLACEHOLDER_REPREZENTANT_PRESTATOR`: `provider?.legalRepresentative || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_REPREZENTANT_PRESTATOR`
   - `PLACEHOLDER_CALITATE_REPREZENTANT`: `provider?.representativeRole || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CALITATE_REPREZENTANT`
   - `PLACEHOLDER_ACT_REPREZENTANT`: `provider?.representativeAct || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_ACT_REPREZENTANT`
   - `PLACEHOLDER_SPECIALIST_SSM`: `specialist ? `${specialist.name} (${specialist.role || 'Specialist SSM abilitat'}, ${specialist.certificateNumber || 'Certificat abilitare SSM'})` : client?.ssmSpecialistName ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})` : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM`
   - `PLACEHOLDER_EVALUATOR_RISC`: `specialist ? `${specialist.name} (Evaluator risc SSM, ${specialist.certificateNumber || 'Certificat atestare INCDPM'})` : client?.ssmSpecialistName ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})` : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC`
   - `PLACEHOLDER_CERTIFICAT_EVALUATOR`: `specialist?.certificateNumber || client?.ssmSpecialistCert || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR`

---

## 7. Verification Method

Once implemented, the reviewer and auditor can independently verify this feature using the following procedures:

1. **Verify API Provider Dropdown Contract**:
   ```bash
   curl -s http://localhost:3000/api/providers | jq .
   ```
   *Expected outcome*: Returns array of active providers with their nested active specialists.

2. **Verify Client Creation with Provider & Specialist Assignment**:
   ```bash
   curl -s -X POST http://localhost:3000/api/clients \
     -H "Content-Type: application/json" \
     -d '{
       "name": "TEST COMPLIANCE CORP S.R.L.",
       "cui": "RO99887766",
       "address": "București, Sector 3, Bvd. Unirii nr. 10",
       "providerId": "<VALID_PROVIDER_ID>",
       "specialistId": "<VALID_SPECIALIST_ID>"
     }' | jq .
   ```
   *Expected outcome*: Returns HTTP 201 with `providerId` and `specialistId` set, and `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert` automatically synchronized from the DB entities.

3. **Verify Client Patching & Legacy String Sync**:
   ```bash
   curl -s -X PATCH http://localhost:3000/api/clients/<CLIENT_ID> \
     -H "Content-Type: application/json" \
     -d '{
       "specialistId": "<NEW_SPECIALIST_ID>"
     }' | jq .
   ```
   *Expected outcome*: Returns HTTP 200 with updated `specialistId` and synchronized `ssmSpecialistName` and `ssmSpecialistCert`.

4. **Verify Template Resolver Data Binding**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   *Expected outcome*: All 25 templates generate into `storage/test_documents/` with 0 unresolved placeholders; templates referencing provider tokens (`Plan de Prevenire TESA.docx`, `EVALUAREA RISCURILOR.docx`, `DECIZII.docx`) bind the assigned provider's CUI, ITM certificate, and specialist credentials.

5. **Run Unified Acceptance Runner**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Expected outcome*: All 5 verification suites pass (130/130 items, exit code 0).
