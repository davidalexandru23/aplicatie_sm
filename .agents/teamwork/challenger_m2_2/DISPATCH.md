# Dispatch for Challenger 2 (Employee CRUD & PLECAT Challenger)

Mission: Write and execute empirical stress-testing script scripts/adversarial-challenger2-m2.ts attacking manual employee creation (CNP uniqueness 409, invalid CNP, relation transactions), profile update (job transition in EmploymentHistory, relation upserts), contract termination (leaveDate < hireDate rejection, double termination, history closure), and batch generation PLECAT rejection (HTTP 400).
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/challenger_m2_2
Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md
Master project: /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md
Worker Handoff: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/worker_m2_1/handoff.md


## 2026-11-11T02:31:33Z
[Message] timestamp=2026-11-11T02:31:33Z sender=e92f81d2-28b4-417a-912c-8c83543acb1b priority=MESSAGE_PRIORITY_HIGH content=You are Challenger 2 for Milestone 2 (M2): Employee Lifecycle CRUD, Occupational Health & Status PLECAT.

Your working directory: /Users/davidalexandru/Documents/Proiect_SSM
Your state folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/challenger_m2_2

MANDATORY FIRST STEP:
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/challenger_m2_2/DISPATCH.md
and all referenced files:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m2_gen2/SCOPE.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/worker_m2_1/handoff.md

CHALLENGE MISSION:
You are an empirical adversarial verifier. Write an adversarial stress-testing script at `/Users/davidalexandru/Documents/Proiect_SSM/scripts/adversarial-challenger2-m2.ts` and run it with `npx tsx scripts/adversarial-challenger2-m2.ts`.
Your test script must rigorously test:
1. `POST /api/employees` (Feature 10):
   - Duplicate CNP in the same company: must reject with HTTP 409 Conflict
   - Identical CNP in two DIFFERENT companies: allowed (compound unique constraint on clientId_cnp)
   - Invalid CNP format (letters, wrong length): must reject with HTTP 400
   - Transactional integrity: verify that creating employee with IdentityDocument and ResidenceAddress succeeds and all 3 records are saved
   - Automatic derivation of birthDate and sex from valid CNP when omitted
   - AuditEvent emission: verify action: 'create' logged without raw CNP in details
2. `PUT /api/employees/[id]` (Feature 11):
   - Update employee with new job and worksite: verify EmploymentHistory record is closed and new record opened
   - Upsert IdentityDocument and ResidenceAddress: verify records are created if they didn't exist, updated if they did
3. `POST /api/employees/[id]/terminate` (Feature 12):
   - Rejection when leaveDate < hireDate (chronological violation): must reject with HTTP 400
   - Rejection when employee is already status: "PLECAT" (double termination): must reject with HTTP 400
   - Correct termination: status becomes "PLECAT", leaveDate is set, EmploymentHistory validTo is closed, AuditEvent action: 'EMPLOYEE_TERMINATED' emitted
4. `POST /api/documents/generate-batch` (Feature 13):
   - Request batch generation for a list of employee IDs including one terminated employee: must reject with HTTP 400
   - Request batch generation for an employee with INAPT medical verdict: must reject with HTTP 400
5. `GET /api/clients/[id]/employees`:
   - Default query: returns only status !== "PLECAT"
   - Query `?includeTerminated=true`: returns both active and PLECAT

Decide your verdict: APPROVE or REQUEST_CHANGES.
Write your full report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/challenger_m2_2/handoff.md` with explicit Verdict.
Send a completion message to the parent orchestrator with your verdict and findings summary.
