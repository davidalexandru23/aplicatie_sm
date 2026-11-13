## 2026-11-05T17:42:33Z
Incepeti implementarea planului strategic de remediere si regandire a solutiei (SSM / Igiena / HR).

Context & Approved Plan:
The master plan is written and approved at: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_orchestrator_3/PLAN_REMEDIERE_SI_REGANDIRE.md`

Summary of Phases to Implement:
- Faza 1: Quick Fixes Imediate
  1. Fix XLSX crash in `src/lib/templates/generator.ts:419`: replace `XLSX.readFile(templateFilePath)` with `const fileBuffer = fs.readFileSync(templateFilePath); const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });`.
  2. Fix UI predicate in `src/app/documents/generate/page.tsx:470`: ensure Job dropdown NEVER displays on hygiene templates (`!isHygieneTemplate`) or general client templates without a job context. Reset `selectedJobId = ''` when switching to hygiene.

- Faza 2: Extindere Schema Prisma & Seed Realist
  1. Update `prisma/schema.prisma`:
     - On `Employee`: add `cimNumber`, `cimDate`, `grossSalary`, `workNorm`, `probationDays`, `annualLeaveDays`, `bankIban`, `bankName`, `bloodType`, `rhFactor`, `qualification`, `commuteRoute`, `commuteDurationMinutes`, `shoeSize`, `clothingSize`, `gloveSize`.
     - On `Job`: add `isFoodHandling` (Boolean @default(false)), `isScreenWork` (Boolean @default(false)), `isDrivingRequired` (Boolean @default(false)), `workPosture` (String?), `maxWeightKg` (Float?), `noiseExposed` (Boolean @default(false)).
     - Add EIP models: `EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`.
  2. Run `npx prisma db push`.
  3. Update `prisma/seed.ts` with complete real statutory data for NEXUS SOLUTIONS (IT) and BISTRO GOURMET (Horeca) without empty/missing fields.

- Faza 3: Rafinare Resolver & Conectare Dinamica
  1. In `src/lib/templates/resolver.ts`:
     - Bind `grossSalary`, `cimNumber`, `cimDate`, `workNorm` to `{PLACEHOLDER_SALARIU_BRUT}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`.
     - Replace static TESA mock in occupational health and EIP: if job is in food sector or CAEN 5610, check Food Sector, Fisa 210, specific exams, Horeca EIP; if screen work or IT CAEN 6201, check Fisa 243.
     - Ensure 31/31 templates resolve cleanly with approved_for_print and zero unmapped tokens.

- Faza 4: Redesign UI & Modale CRUD Operative
  1. Refactor `/documents/generate` to support the 5 dedicated operational modes/tabs (Pachet Onboarding Salariat 1-Click ZIP, Dosar SSM Firma 1-Click ZIP, Evaluare Riscuri & Profilaxie Post, Cursuri Igiena Sesiune, Generator Statutar Individual).
  2. Add Worksite (Punct de Lucru) selector.
  3. Add modal dialogs for CRUD operations:
     - Add/Edit Employee in `/employees`
     - Add Worksite & Add Job in `/clients/[id]`
     - 1-Click Onboarding ZIP button on employee rows
     - 1-Click Hygiene Session ZIP button in `/hygiene`.
