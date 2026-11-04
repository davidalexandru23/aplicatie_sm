# Project: Romanian SSM, DSP, and DSVSA Compliance and Document Generation System

## Architecture

The system is a Next.js 15 (App Router, Turbopack) web application with Prisma ORM 6 on PostgreSQL, Tailwind CSS v4, and a dual document generation engine (`docxtemplater` for DOCX, `xlsx` for XLSX, `pdf-lib` for overlays).

### Core Layers
1. **Data Model Layer (`prisma/schema.prisma`)**:
   - PostgreSQL persistence for clients, jobs, worksites, and employees.
   - **External Service Provider Subsystem (R2)**: Dedicated `SsmProvider` and `SsmSpecialist` relational entities linked to `Client` via `providerId` and `specialistId` (with legacy string synchronization for backwards compatibility).
   - **Hygiene Compliance Subsystem (R1)**: `Employee` extensions (`hygieneCertificateSeries`, `hygieneExamResult`, `hygieneExamGrade`, `hygieneExpirationDate`), `HygieneSession` extensions (`clientId`, `trainingModule`, `coursePeriod`), and `HygieneParticipant` extensions (`module`, `expirationDate`, `clientId`).
2. **SSM, DSP & DSVSA Domain Compliance Engine (`src/lib/`)**:
   - `compliance.ts`: Deterministic calculation engine for Romanian legal intervals (HG 355/2007, Legea 319/2006, HG 1425/2006, Legea 307/2006, Ordinul comun MS/ME 1225/5031/2003, 2209/4469/2022) with `addMonthsSafe` 36-month validity clamping.
   - `caen-catalog.ts`: Official Romanian CAEN Rev. 2 catalog with statutory risk tiers and hygiene module designations (Module 1 Food, Module 2 Cleaning/Healthcare, Module 3 Body Care).
   - `risk/caen-risk-presets.ts`: Contextual INCDPM Pece risk factors and prevention measures.
3. **UI / Presentation Layer (`src/app/`)**:
   - `/settings` & `/settings/provider`: External SSM provider profile management (CUI, Reg. Com., official address, ITM authorization number/date) and specialist team CRUD.
   - `/clients` & `/clients/[id]`: Client intake and edit modals with Provider and Specialist dropdown selection and persistence.
   - `/documents/generate`: Direct client-level hygiene document selection and generation flow ("Tabel evidenta cursanti igiena", "Anexe Curs igiena", "Adeverinta participare") with dynamic employee roster assembly.
   - `/employees`, `/trainings`, `/risk-assessments`, `/imports/new`.
4. **Document Generation Engine Layer (`src/lib/templates/`)**:
   - `definitions.ts`: Ground-truth catalog for all 25 official templates (23 DOCX and 2 XLSX).
   - `resolver.ts`: High-fidelity contextual placeholder resolver dynamically binding client data, assigned external provider & specialist data, employee rosters, and graceful handling of missing optional fields (supplying `'-'` for sub-addresses rather than fabricating mock IDs or throwing exceptions).
   - `generator.ts`: Multi-part XML generator and dynamic XLSX cell formatter.
5. **Automated Verification Suite (`scripts/`)**:
   - `verify-provider-and-hygiene.ts`: Dedicated verification script for provider CRUD, client dropdown assignment, hygiene roster generation, and template rendering.
   - `verify-all.ts`: Unified acceptance test runner executing all suites.

---

## Code Layout

```
/Users/davidalexandru/Documents/Proiect_SSM/
├── prisma/
│   ├── schema.prisma                  # Data models including SsmProvider, SsmSpecialist, and Hygiene extensions
│   ├── seed.ts                        # Realistic seed data for providers, specialists, clients, employees
│   └── migrations/                    # Prisma migrations
├── src/
│   ├── app/
│   │   ├── settings/                  # External SSM Provider Profile & Specialist Management UI
│   │   ├── clients/                   # Client directory with Provider/Specialist dropdowns
│   │   ├── documents/generate/        # Document generation catalog & direct Hygiene flow
│   │   └── api/
│   │       ├── settings/provider/     # Provider profile & specialist CRUD APIs
│   │       ├── providers/             # Provider & specialist dropdown query API
│   │       ├── clients/               # Client endpoints persisting provider/specialist
│   │       └── documents/generate/    # Document generation API
│   └── lib/
│       ├── compliance.ts              # Legal deadline calculation engine (36-month hygiene clamping)
│       ├── caen-catalog.ts            # CAEN Rev. 2 catalog with hygiene requirements
│       └── templates/
│           ├── definitions.ts         # Catalog of 25 templates with complete token schemas
│           ├── resolver.ts            # Contextual data resolver with provider & dynamic hygiene binding
│           └── generator.ts           # Multi-part DOCX/XLSX generation engine
├── scripts/
│   ├── verify-provider-and-hygiene.ts # Dedicated verification suite for R1 and R2
│   ├── test-all-templates-generation.ts # 25/25 Zero-placeholder generation test
│   └── verify-all.ts                  # Unified acceptance verification suite
└── handoff/ssm-template-placeholder-pack/templates/ # 25 official templates
```

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | SsmProvider & SsmSpecialist Models | Relational models in Prisma schema for provider corporate data, ITM authorization, and designated specialists | M1 | Survey R2 (Explorer 2) |
| F2 | Provider Settings UI & Specialist CRUD | Dedicated Settings section (`/settings`) for managing provider profile and specialist team | M1 | Survey R2 (Explorer 2) |
| F3 | Client Provider & Specialist Persistence | Dropdown selectors in client intake and edit modals persisting `providerId` and `specialistId` | M1 | Survey R2 (Explorer 2) |
| F4 | Hygiene Data Model Extensions | Extend `Employee`, `HygieneSession`, and `HygieneParticipant` with modules, certificate series, results, and 3-year expiration dates | M2 | Survey R1 (Explorer 1) |
| F5 | Direct Client Hygiene Document Flow | Update `/documents/generate` to directly select and configure hygiene documents for client companies | M2 | Survey R1 (Explorer 1) |
| F6 | Dynamic Hygiene Roster Generation | Dynamically assemble employee rosters with Order 1225/2209 modules, 3-year expiry, and cert data in `resolver.ts` & `generator.ts` | M2 | Survey R1 (Explorer 1) |
| F7 | 25-Template Catalog & Token Review | Full review of all 25 templates in `definitions.ts`, mapping provider placeholders dynamically | M3 | Survey R3 (Spec Miner 3) |
| F8 | Graceful Missing Field Handling | Handle missing optional employee/company fields cleanly (sub-address `'-'`, manual flags for unrecorded IDs, zero exceptions) | M3 | Survey R3 (Spec Miner 3) |
| F9 | Provider & Hygiene Verification Suite | Deliver `scripts/verify-provider-and-hygiene.ts` validating migrations, provider CRUD, client dropdowns, and hygiene rosters | M4 | Survey R4 & R4 |
| F10 | Comprehensive Test Pass & Build | Enhance `prisma/seed.ts`, update `scripts/verify-all.ts`, clean `npm run build`, forensic audit clean verdict | M4 | Project Pattern & R4 |

All 10 features are assigned to milestones. Zero unassigned features.

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | SSM Provider Profile & Client Assignment Subsystem | F1, F2, F3: SsmProvider & SsmSpecialist models, Settings UI, Specialist CRUD, Client intake/edit dropdown persistence | none | DONE (Verified: SsmProvider/Specialist models, Settings UI, Client modals dual persistence, 131/131 checks pass) |
| M2 | Hygiene Compliance Engine & Document Generation Flow | F4, F5, F6: Hygiene schema extensions, `/documents/generate` direct client hygiene flow, dynamic employee roster generation | M1 | DONE (Verified: 3 demo sessions seeded, dynamic client/session rosters, Scope Selector, 1-click downloads, 0 unreplaced tokens) |
| M3 | Comprehensive 25-Template & Pipeline Legal Realism Review | F7, F8: 25-template catalog review, provider token binding, graceful missing field handling with zero unhandled exceptions | M1, M2 | DONE (Verified: 25/25 templates generate with 0 missing placeholders, clean array token filtering) |
| M4 | Automated Verification Suite, Seed Data & Acceptance Pass | F9, F10: `verify-provider-and-hygiene.ts`, seed data update, unified `verify-all.ts` pass, clean build, clean forensic audit | M1, M2, M3 | DONE (Verified: 130/130 checks pass across all 5 suites, 0 build errors, CLEAN forensic audit) |

---

## Interface Contracts

### `src/app/api/settings/provider/route.ts` & `src/app/api/providers/route.ts`
- `GET /api/settings/provider`: Returns default/active provider profile including its `specialists`.
- `PUT /api/settings/provider`: Updates corporate info, ITM authorization certificate number, issue date, and address.
- `GET /api/providers`: Returns array of active providers with their active specialists for dropdown options.
- `POST /api/settings/provider/specialists`: Creates a new specialist under the provider.
- `PATCH /api/settings/provider/specialists/[id]`: Updates specialist details.
- `DELETE /api/settings/provider/specialists/[id]`: Deactivates or removes a specialist.

### `src/app/api/clients/route.ts` & `src/app/api/clients/[id]/route.ts`
- Accepts `providerId?: string` and `specialistId?: string` (or `designatedSpecialistId?: string`).
- Persists relations in database and updates cached legacy string fields (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`) for seamless backwards compatibility.

### `src/lib/templates/resolver.ts`
```typescript
export interface TemplateResolutionOptions {
  client: ClientWithRelations;
  employee?: EmployeeWithRelations;
  job?: Job;
  hygieneSession?: HygieneSessionWithRelations;
  manualOverrides?: Record<string, string>;
}

export function resolveTemplateData(
  templateCode: string,
  options: TemplateResolutionOptions
): Promise<TemplateDataResult>;
```
- Populates all 24 provider tokens (`PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_CUI_PRESTATOR`, `PLACEHOLDER_CERTIFICAT_FURNIZOR`, `PLACEHOLDER_ADRESA_PRESTATOR`, etc.) from assigned client provider/specialist.
- Populates hygiene participant rosters dynamically from `client.employees` when `hygieneSession` is not specified.
- Supplies `'-'` for non-applicable sub-addresses and leaves unrecorded required fields for manual entry without throwing unhandled exceptions.

### `scripts/verify-provider-and-hygiene.ts`
- Verifies:
  1. Provider profile CRUD and ITM authorization persistence.
  2. Designated specialist management.
  3. Client dropdown assignment persistence.
  4. Direct client hygiene document generation for "Tabel evidenta cursanti igiena", "Anexe Curs igiena", and "Adeverinta participare".
  5. Hygiene employee roster accuracy: Order 1225/5031/2003 Modules 1–3+, 3-year expiration dates, certificate series/numbers, and evaluation results.
  6. Zero unreplaced placeholders and uncorrupted file outputs.
