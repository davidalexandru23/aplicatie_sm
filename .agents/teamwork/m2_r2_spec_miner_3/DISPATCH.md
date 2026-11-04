## 2026-11-02T21:01:21Z
You are m2_r2_spec_miner_3, a teamwork_spec_miner agent.
Your working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_spec_miner_3/
Project root: /Users/davidalexandru/Documents/Proiect_SSM

Mandatory requirement: Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before starting.
Also inspect /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md.

Your objective for Milestone 2 (SSM Operational Workflows UI & Training Scheduler):
Investigate and specify the Training Scheduler and Compliance Scadențe Reset Engine:
1. Examine `src/app/trainings/page.tsx` and models `TrainingEvent`, `TrainingParticipant`, `Employee` in `prisma/schema.prisma`.
2. Design the operational training scheduling workflow:
   - In `/trainings`: Form/Modal "Planifică / Consemnează Instruire":
     * Client selector
     * Training type:
       - `INTRODUCTIV` (Instruire introductiv-generală 4h/8h, Legea 319/2006)
       - `LOC_MUNCA` (Instruire la locul de muncă min 8h)
       - `PERIODIC_SSM` (Instruire periodică SSM min 2h)
       - `PERIODIC_PSI` (Instruire periodică Situații de Urgență / PSI)
     * Event date, duration in hours, instructor name, notes.
     * Participant selector: checklist of active employees from the selected client.
     * Button "Salvează și Actualizează Scadențele Salariaților".
3. Design API endpoint `POST /api/trainings/record`:
   - Within an atomic Prisma transaction:
     * Creates `TrainingEvent` and `TrainingParticipant` records.
     * If type is `PERIODIC_SSM`, `INTRODUCTIV`, or `LOC_MUNCA`, updates `Employee.ssmLastTrainingDate = eventDate`.
     * If type is `PERIODIC_PSI`, updates `Employee.psiLastTrainingDate = eventDate`.
   - Verify that this immediately resets employee status from `OVERDUE` or `UPCOMING` to `VALID` (emerald badge) in `/employees`, `/clients/[id]`, and dashboard `/`.
4. Define test assertions to prove that scheduling a training event updates employee compliance dates and status badges.

Write your findings and actionable specifications to:
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_spec_miner_3/handoff.md
When finished, send a coordination message back to the orchestrator.
