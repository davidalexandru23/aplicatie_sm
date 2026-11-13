# Dispatch for Explorer 3 (UI Modals & Batch/Document PLECAT Filtering)

Mission: Investigate UI modals wiring in /employees and /clients/[id], generation unlocking in /documents/generate, and PLECAT exclusion across UI, batch generation, and bulk packages.
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_3
Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md
Master project: /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md


## 2026-11-11T02:06:00Z
You are Explorer 3 for Milestone 2 (M2): Employee Lifecycle CRUD, Occupational Health & Status PLECAT.

Your working directory: /Users/davidalexandru/Documents/Proiect_SSM
Your state folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_3

MANDATORY FIRST STEP:
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md,
/Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md, and
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md.

INVESTIGATION MISSION (Features 7, 9, 10, 11, 12, 13 UI & Generation focus):
1. Inspect UI components:
   - `src/app/employees/page.tsx` and `src/app/employees/employee-registry-client.tsx`:
     How employees are listed, metrics displayed, and where buttons/actions for Add Employee, Edit Employee, Record Medical Exam, and Terminate Contract should be placed.
   - `src/app/clients/[id]/page.tsx`:
     How client employee table displays employees, and how modals for Add/Edit/Exam/Terminate can be triggered.
   - Modals needed in `src/components/employees/`:
     `RecordMedicalExamModal`, `AddEmployeeModal`, `EditEmployeeModal`, `TerminateEmployeeModal`.
2. Inspect document generation and batch generation:
   - `src/app/documents/generate/page.tsx`:
     How employee selection works; how `status === 'PLECAT'` must be excluded; how generation is unlocked when a valid medical exam is recorded (Feature 9).
   - `src/app/api/documents/generate-batch/route.ts`:
     How target employees are checked to reject or exclude `status === 'PLECAT'`.
   - `src/lib/packages/bulk-packages.ts`:
     How bulk packages query employees (must query `{ where: { status: { not: 'PLECAT' } } }`).
   - `src/lib/templates/resolver.ts`:
     Ensure any employee resolution checks for `status !== 'PLECAT'`.
3. Recommend exact UI & component architecture and file-by-file integration plans. Do NOT modify source code files yourself (you are a read-only explorer).
4. Write your full analysis to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_3/analysis.md` and your handoff to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_3/handoff.md`.
5. Send a completion message to your parent orchestrator with the summary and artifact paths.
