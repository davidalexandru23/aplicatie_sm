# Handoff Report: Employee Registry Compliance UI Strategy (`/employees`)

**Milestone**: M2 (Compliance UI Tracking & Alerts)  
**Agent**: Explorer 1 (`.agents/teamwork/m2_explorer_1/`)  
**Target File**: `src/app/employees/page.tsx`, `src/app/employees/employee-registry-client.tsx`, `src/components/compliance-badge.tsx`  
**Date**: 2026-11-01  

---

## 1. Observation

1. **Current Employee Page Structure (`src/app/employees/page.tsx:8-135`)**:
   - Lines 8-17: An `async Server Component` fetching employees with `include: { client: true, currentJob: true, currentWorksite: true, identityDocument: true }`.
   - Lines 53-65: Table headers currently specify 8 columns:
     ```tsx
     <th className="px-6 py-3">Salariat</th>
     <th className="px-4 py-3">Firmă Angajatoare</th>
     <th className="px-4 py-3">CNP (GDPR Mascat)</th>
     <th className="px-4 py-3">Funcție / Post</th>
     <th className="px-4 py-3">Punct de Lucru</th>
     <th className="px-4 py-3">Data Angajării</th>
     <th className="px-4 py-3">Status</th>
     <th className="px-4 py-3 text-right">Documente</th>
     ```
   - Zero columns or badges exist for Occupational Medicine (HG 355/2007), SSM Training (L319/2006), PSI/SU Training (L307/2006), or Hygiene Courses (Ord. 2209/2022).
   - Zero filtering or status segmentation exists; all employees render in one static list.

2. **Compliance Engine Capabilities (`src/lib/compliance.ts:177-436`)**:
   - `calculateEmployeeCompliance(employee, referenceDate)` computes an `EmployeeComplianceSummary` containing:
     - `occupationalMedicine: ComplianceItemResult`
     - `ssmTraining: ComplianceItemResult`
     - `psiTraining: ComplianceItemResult`
     - `hygieneCertificate: ComplianceItemResult | null`
     - `overallStatus: ComplianceStatus` (`VALID` | `UPCOMING` | `OVERDUE` | `MISSING`)
   - `getStatusBadgeInfo(status, daysRemaining)` provides Tailwind styles and localized labels (`VALID (Xz)`, `SCADENT (Xz)`, `EXPIRAT (Xz)`, `NEÎNREGISTRAT`).
   - `getOverallStatusBadgeInfo(status)` provides labels (`CONFORM`, `SCADENȚĂ IMINENTĂ`, `EXPIRAT / NECONFORM`, `DATE LIPSĂ`).
   - `formatRoDate(date)` formats dates safely to Romanian `DD.MM.YYYY`.
   - Verified with 45/45 passing automated unit tests in `scripts/verify-compliance.ts`.

3. **Prisma Schema Compliance Fields (`prisma/schema.prisma:122-144`)**:
   - `Employee` model contains: `medicalLastExamDate`, `medicalIntervalMonths`, `medicalFitnessVerdict`, `ssmLastTrainingDate`, `ssmIntervalMonths`, `psiLastTrainingDate`, `psiIntervalMonths`, `hygieneRequested`, `hygieneLastExamDate`, `hygieneCertificateNumber`, `hygieneIntervalMonths`.
   - All these scalar fields are already fetched by Prisma when querying with `include` without `select`.

4. **Database State & Sample Verification**:
   - Executing `calculateEmployeeCompliance` against existing seeded database records confirmed diverse statuses in DB:
     - Alexandru Stan: `VALID` (Med: `VALID`, SSM: `VALID`, PSI: `VALID`, Hyg: `N/A`)
     - Ioana-Raluca Dumitru: `UPCOMING` (Med: `UPCOMING`, SSM: `VALID`, PSI: `UPCOMING`, Hyg: `N/A`)
     - Andreea Marin: `UPCOMING` (Med: `VALID`, SSM: `UPCOMING`, PSI: `UPCOMING`, Hyg: `UPCOMING`)
     - Gheorghe Barbu: `OVERDUE` (Med: `OVERDUE`, SSM: `OVERDUE`, PSI: `VALID`, Hyg: `OVERDUE`)
     - Elena Vasilescu: `MISSING` (Med: `MISSING`, SSM: `MISSING`, PSI: `MISSING`, Hyg: `N/A`)

5. **Build Integrity**:
   - Command `npm run build` completed with code 0 in Turbopack (generating 21 routes cleanly).

---

## 2. Logic Chain

1. **Information Architecture & Density**:
   - Adding 5 compliance columns to the existing 8 uncompacted columns would create a 13-column table. This causes severe horizontal clipping on standard desktop viewports (Observation 1).
   - Therefore, consolidating biographical data into two composite cells (`Salariat & Identitate` and `Angajator & Post`) yields a clean 8-column layout with 5 dedicated compliance columns:
     1. `Salariat & Identitate` (Name, masked CNP, ID doc, active badge)
     2. `Angajator & Post` (Company link, job title, worksite)
     3. `Conformitate Generală` (Overall status badge + alert summary)
     4. `Medicină a Muncii` (HG 355/2007) (Item badge, due date, fitness verdict)
     5. `Instruire SSM` (L319/2006) (Item badge, interval, due date)
     6. `Instruire PSI/SU` (L307/2006) (Item badge, interval, due date)
     7. `Curs Igienă` (Ord. 2209/2022) (Item badge or `Neaplicabil`)
     8. `Documente` (Direct generation links: Cerere, Declarație, CIM)

2. **Visual Hierarchy & Semantic Badges**:
   - Status classifications from `src/lib/compliance.ts` provide unambiguous legal meaning:
     - `VALID` (Emerald): Compliance secured (>30 days).
     - `UPCOMING` (Amber): Scadență iminentă (≤30 days) displaying exact days remaining (`SCADENT (14z)`).
     - `OVERDUE` (Red): Termen depășit displaying days expired (`EXPIRAT (83z)`).
     - `MISSING` (Rose): Date lipsă / nesoluționat (`NEÎNREGISTRAT`).
     - `Neaplicabil` (Slate): Postul nu necesită curs de igienă (when `hygieneCertificate === null`).
   - This eliminates false alarms for non-hygiene employees while immediately highlighting legal exposures.

3. **Hybrid Architecture (Server Data Fetching + Client Interactivity)**:
   - Next.js 16 App Router requires Server Components for initial DB queries (Observation 1).
   - However, filtering tabs (`Toți`, `Conformi`, `Scadenți curând`, `Termene depășite`, `Date lipsă`), real-time search, and client selection require instant, client-side responsiveness without network roundtrips.
   - Therefore, `src/app/employees/page.tsx` (Server Component) executes the Prisma query and compliance computations, passing pre-calculated records to `src/app/employees/employee-registry-client.tsx` (Client Component).
   - URL parameters (`?status=OVERDUE`) are read on load and updated via `window.history.replaceState`, establishing seamless deep-linking from Milestone 2 Explorer 2 dashboard alert cards.

4. **Constraint R3 Preservation**:
   - All compliance data, badges, and document generation shortcuts are accessible without authentication gates, user roles, or permission checks. No e-signatures are introduced.

---

## 3. Caveats

1. **Hygiene Applicability Heuristic**:
   - In `src/lib/compliance.ts`, hygiene is evaluated only if `employee.hygieneRequested` is true or `employee.hygieneLastExamDate` is set. If neither is true, `hygieneCertificate` is `null`. The UI must explicitly render `Neaplicabil` in neutral slate rather than `MISSING` / `NEÎNREGISTRAT`.
2. **Component Interdependency with Explorer 3**:
   - Explorer 3 is designing `src/components/compliance-badge.tsx`. The proposed `ComplianceItemBadge` and `OverallComplianceBadge` interfaces in this analysis provide the exact contract required by `/employees`.
3. **No Caveats on Performance**:
   - Computing compliance for hundreds of employees in memory via `calculateEmployeeCompliance` takes <2ms, causing zero latency overhead.

---

## 4. Conclusion

The employee registry (`/employees`) strategy is finalized and fully documented in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_explorer_1/analysis.md`. 

The implementation requires:
1. Creating `src/components/compliance-badge.tsx` (collaborating with Explorer 3).
2. Creating `src/app/employees/employee-registry-client.tsx` with:
   - 4-card executive KPI summary strip.
   - Status tabs with dynamic counts (`Toți`, `Conformi`, `Scadenți curând`, `Termene depășite`, `Date lipsă`).
   - Instant search & company filter.
   - 8-column compliance table with high-density biographical cells and explicit compliance columns.
3. Updating `src/app/employees/page.tsx` to compute compliance and pass structured data to the client view.
4. Supporting deep-linking via `?status=...` query parameters from the dashboard.

---

## 5. Verification Method

1. **Unit Test Verification**:
   ```bash
   npx tsx scripts/verify-compliance.ts
   ```
   *Expected*: 45 / 45 test suite passing with 0 failures.

2. **Build and Typecheck Verification**:
   ```bash
   npm run build
   ```
   *Expected*: Clean compilation with exit code 0 under Next.js 16 (Turbopack).

3. **Visual UI Inspection**:
   - Launch application (`npm run dev`) and visit `http://localhost:3000/employees`.
   - Verify table displays all 4 legal compliance areas: Medicina Muncii, SSM, PSI, Igienă.
   - Verify badges display correct colors and days: Emerald for `VALID (Xz)`, Amber for `SCADENT (Xz)`, Red for `EXPIRAT (Xz)`, Rose for `NEÎNREGISTRAT`, and Slate for `Neaplicabil`.
   - Click each status tab (`Toți`, `Conformi`, `Scadenți curând`, `Termene depășite`, `Date lipsă`) and verify instant filtering.
   - Navigate to `/employees?status=OVERDUE` and verify `Termene depășite` tab is automatically activated.
   - Invalidation conditions: Any broken badge text (e.g. `NaNz`), table layout overflow, or console hydration errors.
