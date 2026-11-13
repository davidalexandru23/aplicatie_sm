## 2026-11-10T21:28:39Z
You are teamwork_spec_miner assigned to investigate Requirements R4, R5, and R6.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_spec_miner_survey_2
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md

MANDATORY FIRST STEP:
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before doing any other work.

OBJECTIVE:
Investigate authoritative sources (codebase, Prisma schema, API routes, React UI, template definitions, generator and resolver) for Requirements R4, R5, and R6:
1. R4: Sincronizare Modul Instruiri cu Documentele Statutare
   - Investigate training session registration in /trainings and POST /api/trainings/record, TrainingSession / TrainingParticipant models in Prisma.
   - Trace generation and downloading of statutory training documents: ssm-pv-instruire-colectiva, psi-pv-instruire, tematici, and individual training sheets (ssm-fisa-instruire-individuala, psi-fisa-instructaj-individuala).
   - Check event types in API (INTRODUCTIV, LOC_MUNCA, PERIODIC_SSM, PERIODIC_PSI) vs filters in resolver and individual sheets. Verify where hireDate was inappropriately used instead of the actual event date.
   - Check how future session planning can be supported and how direct download shortcuts/buttons can be added to training cards.
   - Check why/where an expiration block currently prevents issuing a new training sheet when the previous training is expired, and how to eliminate this block.
2. R5: Gestiunea EIP (HG 1048/2006)
   - Inspect Prisma schema for EipItem, JobEipRequirement, and EmployeeEipAssignment models and check if they are migrated/active or pending.
   - Check current API routes and UI components for managing EIP catalog, job EIP requirements, and employee EIP assignments.
   - Inspect eip-fisa-acordare-individuala template definition and resolver implementation: identify all hardcoded placeholder data and specify how to replace them with real database records from JobEipRequirement and EmployeeEipAssignment.
3. R6: Evaluări de Risc și Plan de Prevenire
   - Inspect Prisma schema for RiskAssessment, RiskItem, PreventionMeasure, HazardZone models.
   - Check current CRUD flow (or lack of) in API (/api/risk-assessments/...) and UI (/risk-assessments or /clients/[id]/risk).
   - Check risk-evaluare template generation and resolver: how to link it to the persisted DB risk assessment and prevention plan, eliminating static generic CAEN profile plans with static responsibles and deadlines.
   - Check job risk flags on Job model (isFoodHandling, isScreenWork, workPosture, maxWeightKg, noiseExposed) and their configuration in API and UI.

DELIVERABLES:
1. Keep progress.md in your state folder with heartbeat timestamps.
2. Write a comprehensive survey report to /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_spec_miner_survey_2/survey_report.md detailing exact Prisma models, routes, UI components, data structures, and implementation steps.
3. Write handoff.md in your state folder and send a completion message to the caller with the report path and summary.
