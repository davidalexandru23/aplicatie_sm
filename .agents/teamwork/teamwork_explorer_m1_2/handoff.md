# Handoff Report — Milestone 1: UI Glitch & Dropdown Logic Investigation

**Agent:** `teamwork_explorer_m1_2`  
**Recipient:** `8ad1e81b-94c6-4ac7-af81-65ffa2e75726` (teamwork_orchestrator)  
**Date:** 2026-11-05T19:51:00Z  
**Type:** Hard Handoff (Investigation Complete)

---

## 1. Observation

1. **Exact condition in `src/app/documents/generate/page.tsx:470`:**
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
   Direct quote from line 470: The condition used to show the dropdown is `!isEmployeeRequired && selectedClientId && jobs.length > 0`.

2. **Definition of `isEmployeeRequired` and `isHygieneTemplate` in `src/app/documents/generate/page.tsx:157-164`:**
   ```typescript
   const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
   const isHygieneTemplate =
     currentTemplate?.family === 'hygiene' ||
     currentTemplate?.contextLevel === 'hygiene_session' ||
     selectedTemplateCode.startsWith('hygiene-');
   const isEmployeeRequired =
     !isHygieneTemplate &&
     (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
   const isAdeverinta = selectedTemplateCode === 'hygiene-adeverinta';
   ```
   For any hygiene template, `isHygieneTemplate` is `true`, forcing `isEmployeeRequired` to `false`. Therefore `!isEmployeeRequired` is identically `true`.

3. **Aggressive auto-selection in `useEffect` in `src/app/documents/generate/page.tsx:180-189`:**
   ```typescript
   fetch(`/api/clients/${selectedClientId}`)
     .then((res) => res.json())
     .then((data) => {
       if (data && Array.isArray(data.jobs)) {
         setJobs(data.jobs);
         if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
           setSelectedJobId(data.jobs[0].id);
         }
       }
     });
   ```
   Whenever a client is loaded and no template or a non-employee template is selected, `!isEmployeeRequired` is `true`, forcefully setting `selectedJobId` to `data.jobs[0].id` (e.g. Bucătar).

4. **Template change handler in `src/app/documents/generate/page.tsx:396-407`:**
   ```tsx
   <select
     value={selectedTemplateCode}
     onChange={(e) => setSelectedTemplateCode(e.target.value)}
     className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
   >
   ```
   No state reset for `selectedJobId` or `selectedEmployeeId` exists on `onChange` or in any `useEffect` responding to `selectedTemplateCode`.

5. **API parameter contamination in `src/app/documents/generate/page.tsx:228, 314`:**
   - Line 228 (Fields fetch): `if (selectedJobId) params.append('jobId', selectedJobId);`
   - Line 314 (Generate POST): `jobId: selectedJobId || undefined`
   - Backend `src/lib/templates/generator.ts:604`: `jobId: params.jobId` saved to `prisma.generatedDocument`.

6. **Catalog Inspection in `src/lib/templates/definitions.ts`:**
   Execution of catalog query against `TEMPLATE_CATALOG` (31 templates) and PostgreSQL `Template` table revealed:
   - 12 templates have `contextLevel: 'employee'` (Nominal per salariat; job is auto-bound from employee).
   - 3 templates have `contextLevel: 'hygiene_session'` (Hygiene courses/sessions; NEVER need job).
   - 16 templates have `contextLevel: 'client'`:
     - 5 of them have explicit workstation/job fields (`source: 'job.*'`): `risk-evaluare`, `risk-plan-prevenire-tesa`, `ipssm-tesa`, `training-tematica-loc-munca`, `training-detaliu-loc-munca`.
     - 11 of them have NO job fields: `decizii-angajator`, `ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-birou`, `ipssm-universale`, `ipssm-opis`, `training-tematica-introductiv`, `training-detaliu-introductiv`, `risk-plan-actiune-urgenta`, `risk-zone-pericol`, `hr-info-dosar`.

---

## 2. Logic Chain

1. **Step 1 (Why dropdown appeared):**
   - Observation 2 shows `isEmployeeRequired` is `false` for all hygiene templates and all client-level templates.
   - Observation 1 shows the JSX condition at line 470 was `!isEmployeeRequired && selectedClientId && jobs.length > 0`.
   - Since `!isEmployeeRequired` is `!false = true`, the JSX condition evaluated to `true` whenever a client had jobs, rendering the Job dropdown on hygiene templates and general client templates.

2. **Step 2 (Why "Bucătar" was pre-selected):**
   - Observation 3 shows that on client fetch, line 185 checked `if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0)` and assigned `setSelectedJobId(data.jobs[0].id)`.
   - Because `!isEmployeeRequired` was `true`, `selectedJobId` was set to the first job in the client's list.
   - Observation 4 shows no cleanup occurred when selecting a hygiene template, leaving the pre-selected job in state and visible in the dropdown.

3. **Step 3 (Why backend received `jobId` for hygiene):**
   - Observation 5 shows `selectedJobId` was blindly appended to the fields query parameters and passed in the generate POST request body, saving an erroneous `jobId` in `GeneratedDocument`.

4. **Step 4 (Solution formulation):**
   - Based on Observation 6, templates partition into 4 distinct categories.
   - The Job selector must be displayed ONLY when `isJobContextTemplate` is `true` (Category 3).
   - Hygiene templates (`isHygieneTemplate`) and general client templates must NEVER render the Job dropdown.
   - `selectedJobId` must be immediately reset to `''` whenever switching to a hygiene template or non-job template.
   - `jobId` in outgoing API payloads must be sanitized to `undefined` for hygiene and non-job client templates.

---

## 3. Caveats

- In `src/lib/templates/definitions.ts`, `risk-evaluare`, `training-tematica-loc-munca`, `training-detaliu-loc-munca`, `risk-plan-prevenire-tesa`, and `ipssm-tesa` are currently labeled with `contextLevel: 'client'`. The proposed predicate `isJobContextTemplate` handles this both via `currentTemplate.contextLevel === 'job'`, via explicit array `JOB_CONTEXT_TEMPLATE_CODES`, and via `manifestJson.includes('"source":"job.')`. Updating `contextLevel` in `definitions.ts` to `'job'` is recommended for Milestone 2/3 but the UI fix will work immediately regardless.
- No caveats regarding investigation completeness; all call sites and lifecycle states were mapped.

---

## 4. Conclusion

The glitch is caused by an overly permissive inverted boolean `!isEmployeeRequired` at line 470 combined with aggressive defaulting at line 185 and missing state reset on template change.
The issue is completely resolved by:
1. Defining `isJobContextTemplate` to specifically identify non-employee templates that require a job context.
2. Replacing the condition at line 470 with `isJobContextTemplate && selectedClientId && jobs.length > 0 && (`.
3. Updating client fetch line 185 to only default `selectedJobId` if `isJobContextTemplate` is true.
4. Adding an effect and `onChange` handler that resets `selectedJobId = ''` (and `selectedEmployeeId = ''`) when switching to a hygiene or general client template.
5. Sanitizing outgoing API payloads in `fields` fetch and `handleGenerate`.

Complete code diffs and architectural documentation are recorded in `.agents/teamwork/teamwork_explorer_m1_2/analysis.md`.

---

## 5. Verification Method

To verify the remediation after implementation by the implementer agent:
1. **Manual / UI Verification:**
   - Navigate to `/documents/generate`.
   - Select client `BISTRO GOURMET S.R.L.`.
   - Select template `Tabel evidență cursanți igienă` (`hygiene-tabel-cursanti`).
   - Verify that the "Funcție / Post de Lucru" dropdown does NOT display.
   - Verify that `selectedJobId` is empty.
   - Select template `Pachet Decizii Interne SSM` (`decizii-angajator`).
   - Verify that the "Funcție / Post de Lucru" dropdown does NOT display.
   - Select template `Dosar Evaluare a Riscurilor` (`risk-evaluare`).
   - Verify that the "Funcție / Post de Lucru" dropdown DOES display.
   - Select template `Contract individual de muncă 2026` (`hr-cim-2026`).
   - Verify that the employee dropdown displays, and the job is automatically bound from the employee profile badge, without a manual job dropdown.
2. **Automated Verification:**
   - Run `npm run build` to verify Next.js TypeScript and JSX compilation without lint or build errors.
