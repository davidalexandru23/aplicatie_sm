# Dispatch for Explorer 2 (Employee CRUD APIs)

Mission: Investigate existing employee API routes and design POST /api/employees, GET /api/employees/[id], PUT /api/employees/[id], and POST /api/employees/[id]/terminate.
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2
Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md
Master project: /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md


## 2026-11-11T02:05:59Z
You are Explorer 2 for Milestone 2 (M2): Employee Lifecycle CRUD, Occupational Health & Status PLECAT.

Your working directory: /Users/davidalexandru/Documents/Proiect_SSM
Your state folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2

MANDATORY FIRST STEP:
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md,
/Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md, and
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md.

INVESTIGATION MISSION (Features 10, 11, 12, 13 API focus):
1. Inspect existing employee API routes (`src/app/api/employees/`, `src/app/api/clients/[id]/employees/`, etc.).
2. Design detailed specifications for:
   - `POST /api/employees`: Manual employee creation with statutory fields, supporting creation/upsert of `IdentityDocument` and `ResidenceAddress` relations.
   - `GET /api/employees/[id]`: Retrieval of full employee profile including relations.
   - `PUT /api/employees/[id]`: Full statutory update of employee, identity doc, residence address, job, worksite, norm, CIM, IBAN, EIP sizes.
   - `POST /api/employees/[id]/terminate`: Employee termination setting `status: "PLECAT"` with `leaveDate` (ISO) and optional reason/notes, and logging an `AuditEvent`.
   - `src/app/api/clients/[id]/employees/route.ts`: Filtering support for active vs terminated (`?includeTerminated=true`).
3. Detail validation, transactions (`prisma.$transaction`), error responses, and TypeScript types matching `SCOPE.md § Interface Contracts`. Do NOT modify source code files yourself (you are a read-only explorer).
4. Write your full analysis to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2/analysis.md` and your handoff to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m2_2/handoff.md`.
5. Send a completion message to your parent orchestrator with the summary and artifact paths.
