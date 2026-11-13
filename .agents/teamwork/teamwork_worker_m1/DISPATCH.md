## 2026-11-05T17:53:17Z

You are teamwork_worker_m1.
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_worker_m1/
The original user request is at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
The scope document is at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_orchestrator_4/SCOPE.md
The master remediation plan is at: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_orchestrator_3/PLAN_REMEDIERE_SI_REGANDIRE.md

Explorer handoffs to review:
- Explorer 1 (XLSX fix): `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_explorer_m1_1/handoff.md` and `analysis.md`
- Explorer 2 (UI predicate fix): `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_explorer_m1_2/handoff.md` and `analysis.md`
- Explorer 3 (Verification & harness): `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_explorer_m1_3/handoff.md` and `analysis.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You have exclusive write access to:
- `src/lib/templates/generator.ts`
- `src/app/documents/generate/page.tsx`
(Do not touch other source files unless strictly needed for these fixes).

Task Description:
Implement Milestone 1 (Quick Fixes Imediate):
1. In `src/lib/templates/generator.ts`:
   Around line 419, replace:
   `const wb = XLSX.readFile(templateFilePath);`
   with:
   `const fileBuffer = fs.readFileSync(templateFilePath);`
   `const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });`
2. In `src/app/documents/generate/page.tsx`:
   - Fix the Job dropdown display predicate around line 470:
     Ensure the Job dropdown NEVER displays on hygiene templates (`!isHygieneTemplate`) or general client templates without a job context.
     Specifically display only when:
     `!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0`
   - In `useEffect` (around line 185) where `jobs[0].id` is defaulted: do not set `selectedJobId` if it is a hygiene template or non-job template (`!isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk')`).
   - Add state reset logic: when `selectedTemplateCode` changes, if the new template is a hygiene template (`isHygieneTemplate`) or does not require a job, reset `selectedJobId` to `''`. Also if switching away from an employee template, clean `selectedEmployeeId` if appropriate.
   - When calling fields API and generate API: ensure `jobId` is `undefined` (omitted) for hygiene templates and non-job templates.
3. Verification:
   - Run `npx tsc --noEmit`
   - Run `npm run build`
   - Run `npx tsx scripts/verify-all.ts`
   - Test generating both Excel templates (`hygiene-tabel-cursanti` and `hygiene-anexe-catalog`) and confirm valid binary buffers.
4. Deliver your handoff report in your working directory at `handoff.md` including exact commands run and verification results, then send a message back.
