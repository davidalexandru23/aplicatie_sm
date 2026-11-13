# Handoff Report — UI/UX Investigation & Redesign Architecture

**Agent:** `explorer_ui_3` (UI & User Interaction Flows Explorer)  
**Recipient:** Orchestrator (`079c0b01-ed76-4103-bb8c-181f17eaa3f3`)  
**Date:** 2026-11-05T17:28:00Z  
**Type:** Hard Handoff (Investigation Complete)  

---

## 1. Observation

Direct observations and evidence gathered from the codebase and runtime inspection:

### O1: Job Selector Glitch on Non-Employee / Hygiene Templates
- In `src/app/documents/generate/page.tsx`:
  - Lines 161–163:
    ```typescript
    const isEmployeeRequired =
      !isHygieneTemplate &&
      (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
    ```
  - Lines 185–187:
    ```typescript
    if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
      setSelectedJobId(data.jobs[0].id);
    }
    ```
  - Lines 470–479:
    ```tsx
    {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
      <div className="pt-2 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
    ```
  - For any hygiene template (`isHygieneTemplate === true`), `isEmployeeRequired` evaluates to `false`. Therefore, `!isEmployeeRequired` evaluates to `true`.
  - When `selectedClientId` is chosen and the client has jobs (`jobs.length > 0`), line 186 automatically selects the first job (`jobs[0].id`, e.g. "Bucătar"), and lines 470–488 render the Job selector immediately above the hygiene session inputs.

### O2: Excel File Access Crash in Next.js Server Bundle
- In `src/lib/templates/generator.ts`:
  - Line 419:
    ```typescript
    } else if (templateFormat === 'xlsx') {
      const wb = XLSX.readFile(templateFilePath);
    ```
  - In `node_modules/xlsx/xlsx.mjs` (lines 3225–3234):
    ```javascript
    if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
    if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
    ...
    throw new Error("Cannot access file " + path);
    ```
  - When packaged in ESM by Next.js Turbopack, `_fs` is undefined in `xlsx.mjs`. Calling `XLSX.readFile(templateFilePath)` directly executes `throw new Error("Cannot access file " + path)`.
  - In contrast, line 89 of `src/lib/templates/generator.ts` uses:
    ```typescript
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    ```
    which parses buffer in memory and does not fail.
  - In `src/app/documents/generate/page.tsx` (lines 321–328, 358–363), the catch block dumps `err.message` verbatim into a red banner, displaying the macOS filesystem path directly to the end user.

### O3: Job Auto-Bind Lockup & Missing Overrides
- In `src/app/documents/generate/page.tsx` (lines 412–467):
  - When `isEmployeeRequired` is `true`, the Job `<select>` element is removed from the DOM.
  - If the employee has no assigned job in the database (`currentJobId === null`), the UI shows an amber warning banner (*"Salariatul selectat nu are un post asociat în profil..."*), but gives the user **no control to select or assign a job**. As a result, statutory documents requiring job data (`hr-anexa-fisa-post`, `ssm-fisa-instruire-individuala`, `med-fisa-solicitare-examen`, `med-fisa-identificare-riscuri`) generate with empty job placeholders.

### O4: Missing Worksite Selector in `/documents/generate`
- Searching `src/app/documents/generate/page.tsx` for `worksite` returned 0 results.
- In `src/lib/templates/resolver.ts` line 1987:
  ```typescript
  const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;
  ```
  If a client has multiple worksites, an operator cannot choose which worksite to generate documents for; it silently defaults to `worksites[0]`.

### O5: Missing CRUD for Worksites, Jobs, and Employees
- `src/app/clients/[id]/page.tsx` displays Worksites (Section 7) and Jobs (Section 7) as static text without any "Add" or "Edit" buttons. `ClientEditModal` does not include worksites or jobs.
- `src/app/employees/page.tsx` and `src/app/employees/employee-registry-client.tsx` are strictly read-only lists. There is no `Add Employee` modal, no `Edit Employee` modal, and no individual employee profile route (`/employees/[id]` does not exist).
- Bulk onboarding pack generation (`/api/clients/[id]/packages/onboarding?employeeId=...`) exists on `/clients/[id]`, but is completely missing from `/employees` and `/documents/generate`.

### O6: Missing Schema Fields for Statutory Employment Documents
- In `prisma/schema.prisma` (lines 184–260), the `Employee` model lacks:
  - `salary` / `grossSalary`
  - `cimNumber`
  - `cimDate`
  - `workingHours` / `norm`
  - `education` / `studies`
- In `src/lib/templates/resolver.ts` lines 1635 and 1638, the code casts `(employee as any)?.salary` and `(employee as any)?.cimNumber`, which are always undefined, causing generated CIMs to output blank lines (`........................ lei`).

---

## 2. Logic Chain

1. **Premise 1 (From O1):** The condition `!isEmployeeRequired` in `generate/page.tsx:470` is logically flawed. It treats all non-employee documents (including hygiene tables, decizii, and GDPR) as if they were job-level risk assessments, while line 186 automatically sets `selectedJobId = jobs[0].id`.
   - **Inference 1:** This is the exact reason why "Funcție / Post de Lucru: Bucătar" appeared on the user's screen when attempting to generate `Tabel Cursanți Igienă (XLSX)`.

2. **Premise 2 (From O2):** Calling `XLSX.readFile(templateFilePath)` inside an ESM Next.js server route triggers SheetJS's internal fallback `throw new Error("Cannot access file " + path)` because `_fs` is undefined in ESM bundle.
   - **Inference 2:** This is the exact root cause of the error banner shown in the screenshot. Reading the file with native `fs.readFileSync(templateFilePath)` and passing the buffer to `XLSX.read(buf, { type: 'buffer' })` resolves the issue completely.

3. **Premise 3 (From O1, O3, O4, O5, O6):** The current architecture forces 31 different templates from 5 distinct legal scopes (Company governance, General IPSSM, Job-level risk evaluation, Individual employee statutory dossier, Collective hygiene training) into a single monolithic form on `/documents/generate`.
   - **Inference 3:** A monolithic form cannot cleanly handle the varying permutations of Client, Worksite, Job, Employee, and Hygiene Session without complex conditional logic that breaks or introduces conflicting state.

4. **Premise 4 (From O5, O6):** Operators cannot manage employees, jobs, or worksites through the UI and cannot generate bulk onboarding packs from the employee registry.
   - **Inference 4:** The UI requires modular redesign: tabbed modalities on `/documents/generate`, in-app CRUD modals for Worksites, Jobs, and Employees, and contextual 1-Click generation buttons directly inside `/clients/[id]`, `/employees`, and `/hygiene`.

---

## 3. Caveats

1. **Read-Only Scope:** In accordance with the Explorer archetype, no source files were modified during this investigation. Remediation must be executed by an implementer agent.
2. **Prisma Migration Scope:** Adding fields such as `grossSalary`, `cimNumber`, and `cimDate` to `Employee` requires running a Prisma schema migration (`npx prisma db push` or migration).
3. **Database Population:** Existing seeded test data currently lacks salary and CIM registration numbers; seeds must be updated alongside any schema change.

---

## 4. Conclusion

The application's business logic, document templates, and bulk generation engines (`generateCompanyDossierZip`, `generateEmployeeOnboardingZip`) are functional, but are severely obstructed by:
1. A boolean inversion bug in `generate/page.tsx` that forces a Job dropdown onto hygiene and company templates.
2. A single line in `generator.ts:419` (`XLSX.readFile`) that crashes on all XLSX templates in Next.js Turbopack ESM.
3. A monolithic generator interface that mixes incompatible scopes and exposes raw placeholder tokens.
4. Missing in-app CRUD forms for Worksites, Jobs, and Employees.

### Recommended Remediation Architecture:
1. **Fix Immediate Technical Bugs:**
   - In `src/lib/templates/generator.ts:419`: Replace `XLSX.readFile(templateFilePath)` with `XLSX.read(fs.readFileSync(templateFilePath), { type: 'buffer' })`.
   - In `src/app/documents/generate/page.tsx`: Restrict Job selector to templates where `contextLevel === 'job'` or `family === 'risk'`; strictly hide Job selector for `isHygieneTemplate`.
2. **Redesign `/documents/generate` into 5 Tabbed Modalities:**
   - Tab 1: Pachet Onboarding Salariat (1-Click ZIP)
   - Tab 2: Pachet Dosar SSM Firmă (1-Click ZIP)
   - Tab 3: Evaluare Riscuri & Fișă Post (Job-scoped)
   - Tab 4: Sesiune Curs Igienă (Session-scoped)
   - Tab 5: Document Individual Statutar (Wizard cu filtrare pe domenii)
3. **Add Contextual 1-Click Actions:**
   - Add "Onboarding ZIP" and individual statutory document links to `/employees`.
   - Fix direct 1-Click downloads in `/hygiene` and add "Descarcă Toate Adeverințele (ZIP)".
4. **Add In-App CRUD Modals:**
   - `JobModal` on `/clients/[id]`
   - `WorksiteModal` on `/clients/[id]`
   - `EmployeeModal` on `/clients/[id]` and `/employees`
5. **Add Worksite Selector:** Add Worksite dropdown whenever a client has multiple worksites.
6. **Friendly Error Handling:** Intercept raw filesystem paths and format missing fields into structured categories.

---

## 5. Verification Method

To independently verify the findings and any future fixes:
1. **Verify XLSX Reading in Next.js ESM:**
   - Command: Test generating `hygiene-tabel-cursanti` via `POST /api/documents/generate` with payload:
     `{"templateCode":"hygiene-tabel-cursanti","clientId":"<bistro_id>","hygieneSessionId":"<session_id>"}`
   - Invalidation condition: If the API returns `{ error: "Cannot access file..." }`, the ESM SheetJS bug is present. If it returns 200 with `downloadUrl`, the fix works.
2. **Verify Job Selector Gating:**
   - Open `/documents/generate` in browser.
   - Select client `BISTRO GOURMET S.R.L.`, then select șablon `[HYGIENE] Tabel Cursanți Igienă (XLSX)`.
   - Invalidation condition: If the dropdown "Funcție / Post de Lucru" is rendered, the gating bug persists. If only Hygiene scope and session selectors appear, the fix works.
3. **Verify Build and Test Commands:**
   - Run `npm run build` to verify Next.js TypeScript and JSX compilation.
   - Run `npm test` to verify regression test suite.

---

### Detailed Deliverable Reference:
Full in-depth analysis, code line references, and redesign sketches are available in:  
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_ui_3/analysis.md`
