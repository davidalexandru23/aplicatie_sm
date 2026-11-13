# Handoff Report: Data Model, Seed Completeness & Romanian Statutory Compliance

**Agent:** `explorer_datamodel_3` (Teamwork Explorer)  
**Parent Conversation ID:** `079c0b01-ed76-4103-bb8c-181f17eaa3f3`  
**Timestamp:** 2026-11-05T17:30:00Z  
**Type:** Hard Handoff (Investigation Complete)  
**Deliverable Path:** `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_datamodel_3/analysis.md`

---

## 1. Observation

1. **Excel Template Generation Crash:**
   - **Command executed:**
     ```bash
     curl -s -X POST http://localhost:3000/api/documents/generate \
       -H "Content-Type: application/json" \
       -d '{"templateCode": "hygiene-tabel-cursanti", "clientId": "eb80cd38-7415-4284-a329-b40c5c1ea91b"}'
     ```
   - **Verbatim response:**
     `{"error":"Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx"}`
   - **File and line:** `src/lib/templates/generator.ts:419`:
     ```typescript
     } else if (templateFormat === 'xlsx') {
       const wb = XLSX.readFile(templateFilePath);
     ```
   - **Library line:** `node_modules/xlsx/xlsx.js:3162`:
     ```javascript
     function read_binary(path) {
       if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
       ...
       throw new Error("Cannot access file " + path);
     }
     ```
     In Next.js bundled server runtime, `_fs` is undefined, throwing `Cannot access file`. In contrast, `XLSX.read(fs.readFileSync(templateFilePath), { type: 'buffer' })` executes without error.

2. **Inappropriate Job Dropdown for Hygiene in UI:**
   - **File and line:** `src/app/documents/generate/page.tsx:470`:
     ```tsx
     {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
       <div className="pt-2 border-t border-slate-100">
         <label className="block text-xs font-semibold text-slate-700 mb-1">
           Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
         </label>
     ```
   - When a hygiene template is selected, `isHygieneTemplate === true`, making `isEmployeeRequired === false`. As a consequence, `!isEmployeeRequired` evaluates to `true`, rendering the Job selector when generating hygiene spreadsheets or attendance catalogs.

3. **CIM & Job Description Generation Status "missing_data":**
   - **Command executed:**
     ```bash
     curl -s -X POST http://localhost:3000/api/documents/generate \
       -H "Content-Type: application/json" \
       -d '{"templateCode": "hr-cim-model-cadru-2022", "clientId": "840284f8-2f50-4918-b7bf-5c890072d09e", "employeeId": "71ceb946-b1cb-4e85-8ee0-669f91ee0b18"}'
     ```
   - **Verbatim output:**
     `"status": "missing_data", "missingFields": ["Salariu de bază lunar brut", "PLACEHOLDER_NUMAR_CIM", "PLACEHOLDER_SALARIU_BRUT"]`
   - Similarly, generating `hr-anexa-fisa-post` produces `missing_data` with `["PLACEHOLDER_NUMAR_CIM"]`.
   - Inspection of `prisma/schema.prisma` lines 184-259 confirms that the `Employee` model lacks `cimNumber`, `cimDate`, `grossSalary`, `probationDays`, `workNorm`, `bankIban`, and `bankName`.

4. **Occupational Risk & EIP Inversions in Generated Documents:**
   - Direct extraction of generated DOCX XML text for `Marius Radu` (Bucătar Specialist / Chef at Bistro Gourmet):
     * `med-fisa-identificare-riscuri`: Contains `Sector alimentar: Nu`, `Suprasolicitare vizuală (Fișa 243): Da (>4h/zi)`.
     * `eip-fisa-acordare-individuala`: Contains `Cască de protecție pentru vizite în șantier`, `Ochelari de protecție la ecran cu filtru anti-lumină albastră`, `Vestă avertizoare de mare vizibilitate`.
   - Direct extraction of generated DOCX XML text for `Gheorghe Barbu` (Tehnician Mentenanță at Nexus Solutions, residing in Brașov):
     * `ssm-fisa-instruire-individuala`: Contains `Calificarea: Studii superioare tehnice / Inginer IT`, `Traseul de deplasare: Domiciliu (București, Sector 1) - Metrou - Sediul Central (București, Sector 1) și retur (Durata: 30 minute)`, `Grupa sanguină: AII / Rh+`.
   - Inspection of `prisma/schema.prisma` confirms:
     * There is NO model for EIP (`EipItem`, `JobEipRequirement`, `EmployeeEipAssignment`).
     * `Job` lacks risk category booleans (`isFoodHandling`, `isScreenWork`, `isDriving`, `workPosture`, `maxWeightKg`).
     * `Employee` lacks `bloodType`, `commuteRoute`, `commuteDurationMinutes`, `qualification`, `shoeSize`, `clothingSize`, `gloveSize`.

5. **Seed Completeness Audit:**
   - In `prisma/seed.ts`:
     * Total `RiskAssessment` records created: **0** (verified via grep).
     * Total `RiskItem` records created: **0**.
     * Total `PreventionMeasure` records created: **0**.
     * Total `TrainingEvent` records created: **0**.
     * Total `TrainingParticipant` records created: **0**.
   - Inspection of `/risk-assessments` displays: `Nu există evaluări de risc create în baza de date`.
   - Inspection of `/trainings` displays: `Nu există sesiuni de instruire înregistrate`.
   - Table `instruiriPeriodiceSSM` in generated SSM sheets produces 16 empty rows because `client.trainingEvents` is empty.

---

## 2. Logic Chain

1. From Observation 1, `XLSX.readFile(templateFilePath)` fails because SheetJS cannot resolve its internal `_fs` in the Next.js bundled runtime. Replacing this with `XLSX.read(fs.readFileSync(templateFilePath), { type: 'buffer' })` directly solves the crash for all `.xlsx` templates (`Tabel Cursanti exemplu.xlsx` and `Anexe Curs igiena.xlsx`).
2. From Observation 2, `!isEmployeeRequired` was intended to show the Job selector for company-level risk templates, but because `isHygieneTemplate` sets `isEmployeeRequired = false`, the condition erroneously matched hygiene templates. Adding `!isHygieneTemplate` and restricting to `contextLevel === 'job' || family === 'risk'` eliminates the irrelevant dropdown.
3. From Observation 3, the CIM and Job Description templates define mandatory fields (`PLACEHOLDER_NUMAR_CIM`, `PLACEHOLDER_SALARIU_BRUT`), which do not exist as columns on the Prisma `Employee` table. Without these columns and their population in seed, document validation flags them as missing data.
4. From Observation 4, because neither `Job` nor `Employee` captures statutory risk flags (food sector, screen work, standing posture) or equipment sizes, the resolver falls back to a single hardcoded office/TESA mock (`ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH` and `ROMANIAN_LEGAL_EIP`). This causes chefs to be certified as office computer workers without food handling duties, creating severe statutory non-compliance under HG 355/2007 (Fișa 210) and HG 1048/2006.
5. From Observation 5, because `prisma/seed.ts` omits `RiskAssessment` and `TrainingEvent` seeding, the UI pages `/risk-assessments` and `/trainings` appear empty, and the multianual training tables in generated SSM/PSI sheets are left blank rather than reflecting the employees' recorded training events.
6. Therefore, full Romanian statutory compliance and 100% clean document generation require:
   - Fixing the `generator.ts` Excel reading call.
   - Adjusting the UI conditional check in `generate/page.tsx`.
   - Adding missing fields to `Client`, `Employee`, and `Job`, plus adding the `EipItem` models to `prisma/schema.prisma`.
   - Enhancing `prisma/seed.ts` with real risk assessments, training events, EIP items, and employee contract/salary data.
   - Connecting `caen-risk-presets.ts` dynamically in `resolver.ts` to adapt medical risk sheets and EIP sheets based on CAEN and Job characteristics.

---

## 3. Caveats

- **Scope Boundary:** This investigation was strictly read-only. No application code or schema files were modified; all findings and proposed schema snippets are documented in `analysis.md`.
- **Existing Tests:** Existing unit and adversarial test suites were not altered during this investigation turn.
- **Database Migrations:** Modifying `schema.prisma` will require running `npx prisma migrate dev` or `npx prisma db push`, followed by `npx prisma db seed`.

---

## 4. Conclusion

The application possesses an impressive foundation: 31 official statutory templates, sophisticated Romanian name and salutation parsing, and INCDPM risk profiles. However, it currently suffers from:
1. An active runtime crash on Excel document generation (`generator.ts:419`).
2. A UI context leak (Job selector shown on hygiene documents).
3. A data model gap that prevents real CIM data (salary, contract number, norm), EIP sizes/allocations, and occupational health factors from persisting in the database.
4. A seed deficit where no risk assessments or training sessions are populated in the database.

Implementing the concrete data model refactoring plan and seed additions specified in `analysis.md` will resolve all active errors, eliminate hardcoded mock fallbacks, and deliver 100% clean statutory document generation across all 31 templates.

---

## 5. Verification Method

To independently verify the observations:

1. **Reproduce the Excel Generation Crash:**
   ```bash
   curl -s -X POST http://localhost:3000/api/documents/generate \
     -H "Content-Type: application/json" \
     -d '{"templateCode": "hygiene-tabel-cursanti", "clientId": "eb80cd38-7415-4284-a329-b40c5c1ea91b"}'
   ```
   *Expected result:* `Cannot access file ... Tabel Cursanti exemplu.xlsx`.

2. **Verify CIM Missing Data:**
   ```bash
   curl -s -X POST http://localhost:3000/api/documents/generate \
     -H "Content-Type: application/json" \
     -d '{"templateCode": "hr-cim-model-cadru-2022", "clientId": "840284f8-2f50-4918-b7bf-5c890072d09e", "employeeId": "71ceb946-b1cb-4e85-8ee0-669f91ee0b18"}'
   ```
   *Expected result:* `"status": "missing_data"`, missing `PLACEHOLDER_NUMAR_CIM` and `PLACEHOLDER_SALARIU_BRUT`.

3. **Verify Chef Medical Inversion:**
   Inspect `storage/documents/<docId>.docx` for `med-fisa-identificare-riscuri` generated for Marius Radu (`cnp: 1820815410097`):
   *Expected result:* Contains `Sector alimentar: Nu` and `Suprasolicitare vizuală (Fișa 243)`.

4. **Verify Seed Gaps:**
   Run in terminal:
   ```bash
   npx prisma studio --browser none &
   # or
   node -e 'const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); Promise.all([p.riskAssessment.count(), p.trainingEvent.count()]).then(([r, t]) => console.log({ riskAssessments: r, trainingEvents: t })).finally(() => p.$disconnect());'
   ```
   *Expected result:* `{ riskAssessments: 0, trainingEvents: 0 }`.
