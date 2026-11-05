# Handoff Report — p_survey_explorer_3

**Mission:** Survey codebase architecture for Pillars 3, 4, and 5 of the Strategic Plan.  
**Report Artifact:** [`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_3/survey_report.md`](/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_3/survey_report.md)  
**Date:** 2026-11-04  

---

## 1. Observation

1. **Mock Data Injection in `resolver.ts`:**
   - In [`src/lib/templates/resolver.ts`](/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/resolver.ts) lines 280–306:
     ```typescript
     export const ROMANIAN_LEGAL_HR_CIM = {
       PLACEHOLDER_NUMAR_CIM: 'CIM-2026-0042',
       ...
       PLACEHOLDER_SALARIU_BRUT: '6500 lei',
       ...
     };
     ```
   - In `resolver.ts` lines 962–966:
     ```typescript
     const mergedData: Record<string, unknown> = {
       ...ALL_ROMANIAN_LEGAL_FALLBACKS,
       ...verifiedMap,
       ...(context.customOverrides || {}),
     };
     ```
     `ALL_ROMANIAN_LEGAL_FALLBACKS` contains `ROMANIAN_LEGAL_HR_CIM` and `ROMANIAN_LEGAL_DECIZII`, unconditionally populating transactional variables (`salary`, `cimNumber`) with fake strings, which prevents `unresolvedPlaceholders` from triggering the `missing_data` status.

2. **SEPP Provider & Specialist Fallback Bypass:**
   - In `resolver.ts` lines 548–556:
     ```typescript
     let prov = client?.provider;
     let spec = client?.specialist;

     if (!prov && client?.providerId) {
       prov = await prisma.ssmProvider.findUnique({ where: { id: client.providerId } });
     }
     if (!spec && client?.specialistId) {
       spec = await prisma.ssmSpecialist.findUnique({ where: { id: client.specialistId } });
     }
     ```
   - If `client.providerId` is null, `prov` is not queried from the database using `where: { isDefault: true, isActive: true }`. Instead, lines 558–570 immediately fall back to `ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM` (`'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'` and `'Ing. Mihai Popescu'`), ignoring any user-configured default SEPP in [`src/app/settings/provider`](/Users/davidalexandru/Documents/Proiect_SSM/src/app/settings/provider).

3. **Job Model Properties Unmapped in `resolver.ts`:**
   - In [`prisma/schema.prisma`](/Users/davidalexandru/Documents/Proiect_SSM/prisma/schema.prisma) lines 159–178, `Job` contains `mainActivities`, `equipmentUsed`, `workConditions`, and `corCode`.
   - In `resolver.ts` lines 775–780:
     ```typescript
     PLACEHOLDER_FUNCTIE: job?.title || 'Personal TESA / Inginer Sisteme Software',
     PLACEHOLDER_COD_COR: job?.corCode || '251201',
     PLACEHOLDER_ADRESA_PUNCT_LUCRU: worksite?.address || client?.address || 'București, Sector 1',
     PLACEHOLDER_PUNCT_LUCRU: worksite?.name || 'Sediul Central',
     PLACEHOLDER_DEPARTAMENT: worksite?.activity || 'Departament Tehnic & IT',
     ```
     `mainActivities`, `equipmentUsed`, and `workConditions` are never queried or mapped to any token.

4. **ZIP Engine in Dependencies:**
   - In [`package.json`](/Users/davidalexandru/Documents/Proiect_SSM/package.json) line 18: `"pizzip": "^3.3.0"` and line 28: `"@types/pizzip": "^3.0.5"` are already installed.
   - PizZip supports directory hierarchies and in-memory zip creation:
     `zip.file("01_Acte/Decizii.docx", buffer)` and `zip.generate({ type: "nodebuffer", compression: "DEFLATE" })`.

5. **UI / UX Disconnect for Job Selector:**
   - In [`src/app/documents/generate/page.tsx`](/Users/davidalexandru/Documents/Proiect_SSM/src/app/documents/generate/page.tsx) lines 157–159:
     ```typescript
     const isEmployeeRequired =
       !isHygieneTemplate &&
       (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
     ```
     And line 254:
     ```typescript
     else if (isEmployeeRequired && !selectedEmployeeId) {
       setError('Acest șablon este nominal și necesită selectarea unui salariat.');
       return;
     }
     ```
     There is no `JobOption` state or `<select>` dropdown. Selecting a job independently of an employee is blocked.
   - Conversely, [`src/app/api/documents/generate/route.ts`](/Users/davidalexandru/Documents/Proiect_SSM/src/app/api/documents/generate/route.ts) line 13 and [`src/app/api/templates/[code]/fields/route.ts`](/Users/davidalexandru/Documents/Proiect_SSM/src/app/api/templates/%5Bcode%5D/fields/route.ts) line 13 already accept `jobId`.

6. **Static Risk Assessments Page & Verification Suite:**
   - [`src/app/risk-assessments/page.tsx`](/Users/davidalexandru/Documents/Proiect_SSM/src/app/risk-assessments/page.tsx) is an 84-line read-only list.
   - [`scripts/verify-all.ts`](/Users/davidalexandru/Documents/Proiect_SSM/scripts/verify-all.ts) runs 5 suites with 130 total verified items:
     Suite 1 (25 templates), Suite 2 (45 compliance tests), Suite 3 (6 excel tests), Suite 4 (53 e2e tests), Suite 5 (build).
   - In `package.json`, there is no `"test"` script defined.

---

## 2. Logic Chain

1. **Mock Data Removal -> `missing_data` State (ref: Observation 1):**
   - By removing transactional values from `ALL_ROMANIAN_LEGAL_FALLBACKS`, any missing required field will remain empty unless provided by DB or `customOverrides`.
   - `resolveTemplateData` checks `template.fields` where `field.required === true`; if empty, it adds the key to `unresolvedPlaceholders`, setting `status: 'missing_data'`.
   - `Docxtemplater` with `nullGetter: (part) => (part.value ? '{' + part.value + '}' : '')` preserves `{PLACEHOLDER_...}` in output XML.
   - `collectUnresolvedPlaceholders` detects unreplaced tokens and `generateDocument` saves the record as `status: 'missing_data'` with `missingFields` JSON.
   - The UI displays amber warning banners indicating exactly which inputs need completion.

2. **Default SEPP Provider Fallback (ref: Observation 2):**
   - In `schema.prisma`, `SsmProvider` and `SsmSpecialist` models include `isDefault: Boolean @default(false)` and `isActive: Boolean @default(true)`.
   - Adding a query fallback in `resolver.ts` to `findFirst({ where: { isDefault: true, isActive: true } })` ensures that any client without explicit SEPP links inherits the system's active provider and specialist rather than static text.

3. **Job Model Field Integration (ref: Observation 3):**
   - The `Job` model contains `mainActivities`, `equipmentUsed`, `workConditions`, `corCode`.
   - Mapping these to `{PLACEHOLDER_ACTIVITATI_POST}`, `{PLACEHOLDER_ECHIPAMENTE_POST}`, `{PLACEHOLDER_CONDITII_POST}`, `{PLACEHOLDER_COD_COR}` in `resolver.ts` and updating template definitions (`hr-anexa-fisa-post`, `training-detaliu-loc-munca`, `training-tematica-loc-munca`) connects job reality to the generated documents.

4. **1-Click ZIP Packaging using Existing Dependencies (ref: Observation 4):**
   - Because `pizzip` is already installed and proven in docx generation, it can build multi-file and multi-folder zip archives in memory.
   - No new npm packages (`jszip` or `archiver`) need to be installed, completely eliminating package churn, React 19 peer dependency conflicts, or Next.js 16 build regressions.
   - Creating route handlers (`/api/documents/packages/...`) wrapping `generateDocument()` allows both immediate zip downloads and individual database audit logging.

5. **Decoupled Job Selection in UI (ref: Observation 5):**
   - Since the backend endpoints already support `jobId`, introducing a `JobOption` dropdown in `/documents/generate/page.tsx` and updating `isEmployeeRequired` so that selecting a Job satisfies `contextLevel === 'job'` allows template generation by post independently of an assigned employee.

6. **Interactive Risk Assessment & Verification Gate (ref: Observation 6):**
   - Replacing the static 84-line `/risk-assessments/page.tsx` with an interactive configurator using `getRiskProfileForCaen` and `calculatePecePartialRisk` empowers specialists to calibrate gravity and probability before saving and generating DOCX.
   - Adding `"test": "npx tsx scripts/verify-all.ts"` in `package.json` formalizes the test command.

---

## 3. Caveats

- **Catalog Expansion Dependency:** `scripts/verify-all.ts` Suite 1 currently tests 25 templates. When Pillar 2 completes the 6 new templates (raising the catalog to 31 templates), `test-all-templates-generation.ts` and `verify-all.ts` must be updated to expect 31 passed items (raising the total from 130 to 136).
- **Client Job Data Availability:** If a client has zero jobs in the database, the job selector should provide an inline prompt or fallback to allow typing custom post activities via overrides.
- **Archive Size Considerations:** For normal usage (5 to 30 documents), in-memory zip buffering via `pizzip` uses < 25 MB RAM. If an archive exceeds thousands of files, streaming via Node streams would be needed; for Romanian SME SSM compliance, this is not an issue.

---

## 4. Conclusion

The architectural investigation for Pillars 3, 4, and 5 is complete. All mechanisms, files, lines of code, and data flows have been surveyed and mapped into an actionable implementation plan:
1. **Pillar 3:** Ready for mock data elimination, `isDefault: true` SEPP fallback, `Job` field mapping, and dynamic CAEN prevention measures.
2. **Pillar 4:** Ready for 1-Click ZIP workflows using existing `pizzip` without new dependencies.
3. **Pillar 5:** Ready for Job selector in UI, interactive risk configurator, and formal test script integration.

Full architectural details are documented in [`survey_report.md`](/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_3/survey_report.md).

---

## 5. Verification Method

To independently verify the findings in this report:

1. **Check Mock Data Locations:**
   ```bash
   grep -n "6500 lei" src/lib/templates/resolver.ts
   grep -n "CIM-2026-0042" src/lib/templates/resolver.ts
   grep -n "Ing. Mihai Popescu" src/lib/templates/resolver.ts
   ```
2. **Verify `pizzip` Availability:**
   ```bash
   node -e "const P = require('pizzip'); console.log('PizZip version:', P.version || 'installed');"
   ```
3. **Inspect Job Selector Gap in UI:**
   ```bash
   grep -n "isEmployeeRequired" src/app/documents/generate/page.tsx
   grep -n "jobId" src/app/api/documents/generate/route.ts
   ```
4. **Run Verification Gate:**
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Expected result: 130/130 verified items pass across all 5 suites.*
5. **Check Production Build:**
   ```bash
   npm run build
   ```
   *Expected result: Next.js Turbopack compiles successfully with 0 errors.*
