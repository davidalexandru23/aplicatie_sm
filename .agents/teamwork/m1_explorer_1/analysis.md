# Technical Analysis: Prisma Schema Compliance Extension & Database Strategy (Milestone 1)

**Author:** Explorer 1 (Prisma Schema & DB Architecture)  
**Date:** 2026-11-01  
**Milestone:** Milestone 1 — Compliance Engine & Data Layer  
**Target File Artifacts:**
- Proposed Schema Patch: `.agents/teamwork/m1_explorer_1/schema.patch`
- Proposed Seed Script: `.agents/teamwork/m1_explorer_1/seed.ts`
- Handoff Report: `.agents/teamwork/m1_explorer_1/handoff.md`

---

## 1. Executive Summary

This investigation establishes the concrete architecture for extending the data persistence layer in `prisma/schema.prisma` to support Romanian occupational health, safety, emergency, and hygiene compliance tracking. 

Currently, the `Employee` model tracks personal identity, employment contracts, and contact data, but lacks fields for tracking statutory medical examinations, periodic safety trainings, fire safety trainings, and hygiene certifications. Furthermore, the live PostgreSQL database (`ssm_db`) already contains active business data:
- 1 Client: `NEXUS SOLUTIONS S.R.L.` (`RO38765432`)
- 2 Worksites (`Sediul Central`, `Punct de Lucru Vest`)
- 3 Job profiles (`Inginer Sisteme Software`, `Specialist Resurse Umane`, `Tehnician Mentenanță și Suport`)
- 3 Active employees with identity documents and residential addresses (`Alexandru Stan`, `Ioana-Raluca Dumitru`, `Gheorghe Barbu`)

We propose:
1. Extending `model Employee` in `prisma/schema.prisma` with **15 dedicated compliance fields** covering the four statutory pillars.
2. Using `npx prisma db push` as the sole zero-data-loss database update mechanism, preventing the destructive table resets that `prisma migrate dev` would trigger on this un-baselined database.
3. Deploying an idempotent seed script in `prisma/seed.ts` that enriches existing database records and introduces a restaurant/catering client (`BISTRO GOURMET S.R.L.`), providing a comprehensive testbed for all 4 compliance states (`VALID`, `UPCOMING`, `OVERDUE`, `MISSING`).

---

## 2. Prisma Schema Expansion Architecture

### 2.1. Exact Compliance Fields for `model Employee`

The fields must be appended directly to `model Employee` in `prisma/schema.prisma`:

```prisma
  // ------------------------------------------
  // CONFORMITATE & SCADENȚE LEGALE (MILESTONE 1)
  // ------------------------------------------

  // 1. Supravegherea sănătății lucrătorilor (HG nr. 355/2007 - Medicină a Muncii)
  medicalLastExamDate          DateTime? // Data ultimului examen medical (angajare sau periodic)
  medicalIntervalMonths        Int       @default(12) // Periodicitate în luni (standard 12 luni TESA, 6 luni riscuri)
  medicalFitnessVerdict        String?   @default("APT") // APT, APT_CONDITIONAT, INAPT_TEMPORAR, INAPT
  medicalNotes                 String?   // Restricții sau recomandări medicale din fișa de aptitudine

  // 2. Instruire SSM (Legea nr. 319/2006, HG nr. 1425/2006)
  ssmLastTrainingDate          DateTime? // Data ultimei instruiri periodice SSM
  ssmIntervalMonths            Int       @default(6) // Periodicitate în luni (12 TESA, 6 operativ, 1-3 risc ridicat)
  ssmNotes                     String?   // Tematică parcursă / nr. ore consemnate / observații

  // 3. Instruire PSI / Situații de Urgență (Legea nr. 307/2006, OMAI nr. 712/2005)
  psiLastTrainingDate          DateTime? // Data ultimului instructaj periodic PSI/SU
  psiIntervalMonths            Int       @default(6) // Periodicitate în luni (6 TESA, 1-3 operativ/instalații)
  psiNotes                     String?   // Tematică parcursă / exercițiu evacuare

  // 4. Cursuri de Igienă (Ordinul MS/ME nr. 2209/4469/2022)
  hygieneLastExamDate          DateTime? // Data promovării examenului de igienă
  hygieneCertificateNumber     String?   // Număr certificat eliberat de DSP
  hygieneCertificateIssueDate  DateTime? // Data emiterii certificatului DSP
  hygieneIntervalMonths        Int       @default(36) // Valabilitate 3 ani (36 luni) conform art. 20 Ordin 2209/2022
  hygieneNotes                 String?   // Modul curs / serie certificat / dispensă studii medicale
```

### 2.2. Architectural & Legal Analysis of Field Design

| Field Name | Prisma Type | Default | Romanian Legal Basis & Architectural Rationale |
|---|---|---|---|
| `medicalLastExamDate` | `DateTime?` | `null` | **HG 355/2007 art. 13-24**. Null indicates that an employee has never had a medical examination recorded in the system (`MISSING` status, critical alert). |
| `medicalIntervalMonths` | `Int` | `@default(12)` | **HG 355/2007 Anexa 1**. The statutory maximum periodic medical interval is 12 months for standard and office/VDT posts (Fișa 243). Specific hazardous roles require 6 or 3 months. Providing `@default(12)` guarantees mathematical soundness without forcing downstream null-checks in `compliance.ts`. |
| `medicalFitnessVerdict` | `String?` | `@default("APT")` | **HG 355/2007 art. 9-11 (Fișa de aptitudine)**. Standard statutory conclusions: `APT`, `APT_CONDITIONAT`, `INAPT_TEMPORAR`, `INAPT`. Using a String with default `"APT"` allows seamless expansion without rigid DB enum migrations while maintaining strict domain fidelity. |
| `medicalNotes` | `String?` | `null` | Records medical restrictions specified on the fitness sheet (e.g., *"purtare ochelari de corecție la calculator"*, *"evitare efort fizic intens și ridicare greutăți > 10 kg"*, *"fără ture de noapte"*). |
| `ssmLastTrainingDate` | `DateTime?` | `null` | **HG 1425/2006 art. 96-100**. Date of the last periodic health and safety training recorded in the individual training sheet (Anexa 11). Null represents missing records (`MISSING` status). |
| `ssmIntervalMonths` | `Int` | `@default(6)` | **HG 1425/2006 art. 96 alin. 2**. Maximum periodic training interval: 12 months for TESA/management; 6 months for operational/technical staff; 1 or 3 months for high-risk workstations. `@default(6)` provides a legally cautious baseline. |
| `ssmNotes` | `String?` | `null` | Records training material, hours (e.g. 2 hours), and specific internal instructions (*IPSSM-01..13*). |
| `psiLastTrainingDate` | `DateTime?` | `null` | **OMAI 712/2005 art. 24-28**. Date of the last periodic emergency and fire safety training. Null indicates missing training. |
| `psiIntervalMonths` | `Int` | `@default(6)` | **OMAI 712/2005 art. 26**. Up to 6 months for administrative/office posts; 1–3 months for machinery/electrical/flammable facilities; 1 month for intervention teams. `@default(6)` is the statutory ceiling for general staff. |
| `psiNotes` | `String?` | `null` | Records fire drill attendance, evacuation instructions, or specific hazards. |
| `hygieneLastExamDate` | `DateTime?` | `null` | **Ordinul MS/ME nr. 2209/4469/2022 art. 20 alin. (1)**. The date of the graduation exam before the DSP commission. This is the exact legal anchor date for computing expiry. |
| `hygieneCertificateNumber` | `String?` | `null` | Certificate series and registration number issued by DSP (e.g., *"DSP-B-2025-10442"*). |
| `hygieneCertificateIssueDate` | `DateTime?` | `null` | Date of official certificate issuance by the Public Health Directorate. |
| `hygieneIntervalMonths` | `Int` | `@default(36)` | **Ordinul 2209/4469/2022 art. 20 alin. (1)**: *"Certificatele de absolvire... sunt valabile 3 ani de la data emiterii."* Exactly **36 months**. |
| `hygieneNotes` | `String?` | `null` | Training module (Modulul 1 Alimentar, Modulul 2 Curățenie/Cosmetică, etc.) or exemption grounds under art. 18 (medical graduates). |

### 2.3. Rationale for `Int @default(...)` vs `Int?` for Interval Fields

In TypeScript and Prisma:
- If defined as `Int? @default(12)`, Prisma Client generates `medicalIntervalMonths: number | null`. Downstream calculation logic would always require null checks (`employee.medicalIntervalMonths ?? 12`).
- If defined as `Int @default(12)`, Prisma Client generates `medicalIntervalMonths: number`.
- Under Romanian law, an interval is **never null**: every workstation has a defined periodic interval established by legislation and confirmed by the employer's Internal Decision (*Decizia 02*).
- When PostgreSQL applies `ALTER TABLE "Employee" ADD COLUMN "medicalIntervalMonths" INTEGER NOT NULL DEFAULT 12;`, it automatically populates all existing rows with `12` without any downtime or data modification conflicts.
- Therefore, `Int @default(...)` is mathematically and architecturally superior.

### 2.4. Why Compute Compliance Dynamically Instead of Storing Static Status Flags

A crucial architectural principle:
- **Do NOT store static status columns** like `medicalStatus = "VALID"` or `overallStatus = "VALID"` in the database table.
- A status computed on November 1st as `VALID` (e.g., 31 days remaining) becomes `UPCOMING` on November 2nd (30 days remaining) without any database interaction.
- Storing a static status flag causes severe data drift unless a complex background cron daemon continuously runs `UPDATE` queries on every employee row every night.
- Instead, `src/lib/compliance.ts` computes the status dynamically in memory:
  $$\text{daysRemaining} = \left\lfloor \frac{\text{dueDate} - \text{referenceDate}}{86400000} \right\rfloor$$
- This guarantees real-time, zero-drift accuracy across the entire Next.js application, server components, and API routes.

---

## 3. Safe Database Update Strategy

### 3.1. Live Database Investigation

An empirical inspection of the database via `@prisma/client` and `psql` revealed:
1. `npx prisma migrate status` reports:
   ```
   Datasource "db": PostgreSQL database "ssm_db", schema "public" at "localhost:5432"
   No migration found in prisma/migrations
   The current database is not managed by Prisma Migrate.
   ```
2. The database currently contains real production-like data:
   - 1 Client: `NEXUS SOLUTIONS S.R.L.`
   - 2 Worksites: `Sediul Central`, `Punct de Lucru Vest`
   - 3 Jobs: `Inginer Sisteme Software`, `Specialist Resurse Umane`, `Tehnician Mentenanță și Suport`
   - 3 Employees with active identity documents and residential addresses.

### 3.2. Evaluation: `npx prisma db push` vs `npx prisma migrate dev`

| Dimension | `npx prisma migrate dev` | `npx prisma db push` (RECOMMENDED) |
|---|---|---|
| **Prisma Baseline Compatibility** | ❌ **FAILS**. Fails immediately with error: `The database is not empty. Read more about how to baseline an existing production database`. | ✅ **SUCCEEDS**. Reads live DB catalog directly, computes delta, and applies changes in-place. |
| **Data Loss Risk** | ⚠️ **EXTREMELY DANGEROUS**. Prisma prompts: `We need to reset the PostgreSQL database "ssm_db"... All data will be lost. Do you want to continue?`. An affirmative response deletes all existing rows. | ✅ **ZERO DATA LOSS**. Only adds new columns. No tables are dropped, no rows are deleted. |
| **Execution Speed** | Slower (requires migration baselining, SQL scripts, shadow DB). | Instantaneous (~1 second). |
| **Prisma Client Generation** | Generates client only if migration succeeds. | Automatically invokes `prisma generate` upon push completion. |
| **Project Specification** | Not aligned with `PROJECT.md`. | **Explicitly prescribed in `PROJECT.md` line 88**: *"M1 Scope: F1, F2: Prisma schema compliance fields, `prisma db push`, seed update..."* |

### 3.3. Exact PostgreSQL Statements Executed Under the Hood

When `npx prisma db push` is run, PostgreSQL executes only safe `ADD COLUMN` operations:
```sql
ALTER TABLE "Employee" ADD COLUMN "medicalLastExamDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "medicalIntervalMonths" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "Employee" ADD COLUMN "medicalFitnessVerdict" TEXT DEFAULT 'APT';
ALTER TABLE "Employee" ADD COLUMN "medicalNotes" TEXT;

ALTER TABLE "Employee" ADD COLUMN "ssmLastTrainingDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "ssmIntervalMonths" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "Employee" ADD COLUMN "ssmNotes" TEXT;

ALTER TABLE "Employee" ADD COLUMN "psiLastTrainingDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "psiIntervalMonths" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "Employee" ADD COLUMN "psiNotes" TEXT;

ALTER TABLE "Employee" ADD COLUMN "hygieneLastExamDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "hygieneCertificateNumber" TEXT;
ALTER TABLE "Employee" ADD COLUMN "hygieneCertificateIssueDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN "hygieneIntervalMonths" INTEGER NOT NULL DEFAULT 36;
ALTER TABLE "Employee" ADD COLUMN "hygieneNotes" TEXT;
```
Because:
1. Every new column is either nullable (`TIMESTAMP(3)`, `TEXT`) or has an explicit `DEFAULT` value (`INTEGER NOT NULL DEFAULT ...`).
2. No existing columns are renamed or deleted.
3. No foreign keys or unique indices are modified.

**Result: 100% zero data loss guarantee.**

### 3.4. Operational Execution Runbook

The implementer must follow this exact 4-step sequence:

#### Step 1: Pre-Execution Count Verification
```bash
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); Promise.all([p.client.count(), p.employee.count()]).then(([c, e]) => console.log('PRE-PUSH COUNTS -> Clients:', c, 'Employees:', e)).finally(() => p.\$disconnect());"
```
*Expected: `Clients: 1, Employees: 3`*

#### Step 2: Apply Schema Delta
```bash
npx prisma db push
```
*Expected output: `🚀 Your database is now in sync with your Prisma schema. Done in ...ms` and `✔ Generated Prisma Client`.*

#### Step 3: Post-Execution Verification
```bash
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); async function check() { const c = await p.client.count(); const e = await p.employee.count(); const sample = await p.employee.findFirst({ select: { id: true, lastName: true, medicalIntervalMonths: true, ssmIntervalMonths: true, psiIntervalMonths: true, hygieneIntervalMonths: true } }); console.log('POST-PUSH COUNTS -> Clients:', c, 'Employees:', e); console.log('Sample Row Intervals ->', sample); } check().finally(() => p.\$disconnect());"
```
*Expected: Exact same record count (1 client, 3 employees), with new interval columns having values `12, 6, 6, 36`.*

#### Step 4: Run Next.js Build Sanity Check
```bash
npm run build
```
Confirms that `@prisma/client` types match the application code and compilation succeeds with 0 errors.

---

## 4. Realistic Seed Strategy (`prisma/seed.ts`)

### 4.1. Configuration in `package.json`

To enable standard `npx prisma db seed` command execution, add the following to `package.json`:
```json
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
```
*Note: `tsx` is already installed and verified operational in the repository (`tsx v4.23.15`).*

### 4.2. Test Matrix Coverage

To test and demonstrate the UI badges (Milestone 2) and verification scripts (Milestones 1 & 4), the seed data must cover every possible combination of compliance status and interval:

| Client | Employee | Job / Role | Med Muncii | SSM Periodic | PSI/SU | Igienă (36m) | Overall Status |
|---|---|---|---|---|---|---|---|
| **NEXUS SOLUTIONS S.R.L.** | **Alexandru Stan** | Inginer Software (TESA) | `VALID` (+226d) | `VALID` (+190d) | `VALID` (+49d) | *N/A (false)* | 🟢 **VALID** |
| **NEXUS SOLUTIONS S.R.L.** | **Ioana-Raluca Dumitru** | Specialist HR (TESA) | `UPCOMING` (+14d) | `VALID` (+195d) | `UPCOMING` (+19d) | *N/A (false)* | 🟡 **UPCOMING** |
| **NEXUS SOLUTIONS S.R.L.** | **Gheorghe Barbu** | Tehnician Mentenanță (Tehnic) | `OVERDUE` (-83d) | `OVERDUE` (-61d) | `VALID` (+44d) | `OVERDUE` (-61d) | 🔴 **OVERDUE** |
| **NEXUS SOLUTIONS S.R.L.** | **Elena Vasilescu** | Asistent Admin (Nou angajat) | `MISSING` (null) | `MISSING` (null) | `MISSING` (null) | *N/A (false)* | 🟣 **MISSING** |
| **BISTRO GOURMET S.R.L.** | **Marius Radu** | Bucătar Specialist (Alimentar) | `VALID` (+160d) | `VALID` (+70d) | `VALID` (+70d) | `VALID` (+526d) | 🟢 **VALID** |
| **BISTRO GOURMET S.R.L.** | **Andreea Marin** | Ospătar / Servire (Alimentar) | `VALID` (+190d) | `UPCOMING` (+9d) | `VALID` (+75d) | `UPCOMING` (+19d) | 🟡 **UPCOMING** |

### 4.3. Key Seed Design Features

1. **Strict Idempotency**:
   - Uses `prisma.client.upsert({ where: { cui } })`
   - Uses `prisma.employee.upsert({ where: { clientId_cnp: { clientId, cnp } } })`
   - Re-running the seed script never throws unique constraint errors and never duplicates rows.
2. **Valid Romanian CNP Checksums**:
   - Every synthetic CNP passes the official 12-weight modulo 11 algorithm (`validateCNP`).
3. **Realistic Romanian Legal Preambles & Details**:
   - Real SPCLEP issuance locations (`SPCLEP S1`, `SPCLEP Cluj`, `SPCLEP Brasov`, `SPCLEP S3`).
   - Authentic medical verdict notations (*"Apt complet conform Fișei 243 HG 355/2007"*, *"Purtare ochelari de corecție"*).
   - Real DSP certificate series (*"DSP-B-2025-10442"*).

---

## 5. Downstream Integration & Harmonization

### 5.1. Harmonization with Explorer 2 (`src/lib/compliance.ts`)

Explorer 2 defines the interface:
```typescript
export interface EmployeeComplianceSummary {
  employeeId: string;
  employeeName: string;
  occupationalMedicine: ComplianceItemResult;
  ssmTraining: ComplianceItemResult;
  psiTraining: ComplianceItemResult;
  hygieneCertificate: ComplianceItemResult | null;
  overallStatus: ComplianceStatus;
}
```
The fields we have added to `Employee` directly map to these results:
- `medicalLastExamDate` & `medicalIntervalMonths` $\to$ `occupationalMedicine`
- `ssmLastTrainingDate` & `ssmIntervalMonths` $\to$ `ssmTraining`
- `psiLastTrainingDate` & `psiIntervalMonths` $\to$ `psiTraining`
- `hygieneLastExamDate` & `hygieneIntervalMonths` $\to$ `hygieneCertificate` (only if `hygieneRequested === true`)

### 5.2. Harmonization with Explorer 3 (`scripts/verify-compliance.ts`)

Explorer 3 tests boundary edge cases:
- `daysRemaining = 31` $\to$ `VALID`
- `daysRemaining = 30` $\to$ `UPCOMING`
- `daysRemaining = 0` $\to$ `UPCOMING`
- `daysRemaining = -1` $\to$ `OVERDUE`
- `lastDate = null` $\to$ `MISSING`
- Leap year: `2024-02-29` + 12 months = `2025-02-28`
- 31-day month end-clamping: `2026-01-31` + 1 month = `2026-02-28`
- Hygiene course: 36 months validity (Ordin 2209/2022).

Our seed data and schema fields provide the exact persistence attributes needed by these tests.

### 5.3. Backwards Compatibility with Existing Code

Inspection of existing files showed:
- `src/lib/importer.ts`: Inserts employees from Excel without compliance fields. Because all new compliance columns are nullable or have defaults, `commitImport` continues to work seamlessly with zero modifications required.
- `src/lib/templates/resolver.ts`: Pulls `firstName`, `lastName`, `cnp`, `hireDate`, `birthDate`. All remain intact.
- `src/app/employees/page.tsx`: Currently selects employee fields for table display. In Milestone 2, it will simply render the new compliance badges alongside existing data.

---

## 6. Recommendations & Action Items for Implementation Agent

1. **Apply Schema Patch**: Apply `.agents/teamwork/m1_explorer_1/schema.patch` to `prisma/schema.prisma`.
2. **Execute DB Push**: Run `npx prisma db push` to synchronize the PostgreSQL database and regenerate `@prisma/client`.
3. **Deploy Seed File**: Copy `.agents/teamwork/m1_explorer_1/seed.ts` to `prisma/seed.ts`.
4. **Configure `package.json`**: Add `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to `package.json`.
5. **Run Seed**: Execute `npx prisma db seed` to populate realistic Romanian test records.
6. **Verify Build**: Run `npm run build` to ensure clean TypeScript compilation across the entire project.
