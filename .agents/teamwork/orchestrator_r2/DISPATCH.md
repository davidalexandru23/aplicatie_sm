# Dispatch Tasks for Orchestrator R2

## 2026-11-02T19:57:07Z

Model and implement end-to-end production-ready operational workflows for a Romanian Occupational Safety and Health (SSM) service company—from client intake, risk assessment by NACE/CAEN code, organizational decisions, training schedules, to compliance deadlines and hygiene/occupational medicine tracking—ensuring all 25 document templates generate fully and contextually without formatting errors or empty spaces, and providing an intuitive, stable Excel import/export workflow.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Integrity mode: development

## References
- Application stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL.
- Database models: Client, Angajați, Acte, Adrese, Posturi, Puncte de lucru, Evaluări de risc, Sesiuni igienă, Documente generate, Import/Export Excel.
- Template directory: `handoff/ssm-template-placeholder-pack/templates` (25 templates in DOCX and XLSX formats covering HR, Decizii, IPSSM, Evaluare Riscuri, Instruire SSM/SU, and Cursuri Igienă).
- Inspiration benchmarks: easyssm.ro, ssm.ro, cloudssm.ro, and open-source SSM platforms.

## Verification Resources
- Template pack: `handoff/ssm-template-placeholder-pack/templates` (25 DOCX/XLSX templates).
- Test data: `Test_Client_3_Angajati.xlsx` in workspace root.
- Verification methodology: The team must construct its own automated test suites and programmatic verification scripts verifying template population, deadline calculations, and Excel import/export flows.

## Requirements

### R1. SSM Operational Workflow Modeling & Implementation
Analyze and implement the full end-to-end operational workflows of a Romanian SSM service company:
1. Client intake and company profile setup (incorporating CAEN activity codes).
2. Contextual risk factor identification and allocation based on CAEN activity codes and job roles (posturi de lucru).
3. Automated generation of organizational decisions (decizii organizatorice SSM/SU).
4. Scheduling and tracking of periodic training topics (tematici de instruire SSM și Situații de Urgență / PSI).
5. Comprehensive tracking of compliance deadlines (scadențe): occupational medicine (medicină a muncii), periodic training intervals, and hygiene certificates/courses.

### R2. Contextual & Complete Document Generation
Eliminate formatting artifacts, empty gaps, and incoherent text across all 25 document templates (DOCX and XLSX) in `handoff/ssm-template-placeholder-pack/templates`. All placeholders must be replaced contextually with authentic data matching the client's CAEN profile, employees, and risk evaluations. Refactor or rewrite existing mapping and document generation logic as needed to achieve clean, professional documents.

### R3. Stable & Intuitive Excel Import/Export
Design and implement an intuitive, robust, and stable Excel import/export system for client and employee data. The Excel template must be simple to complete, resilient to formatting variations, and provide clear validation feedback and error reporting.

### R4. Automated Verification Suite
Implement programmatic verification scripts and automated tests that independently validate:
1. Successful document generation across all 25 templates with realistic data, leaving no unmapped placeholders, broken formatting, or empty gaps.
2. Correct calculation of compliance deadlines according to Romanian legal intervals.
3. Successful import and export of employee and client data via Excel, including error handling for invalid rows.
4. Clean application compilation (`npm run build`) without errors.

## Acceptance Criteria

### SSM Workflows & Compliance Tracking
- [ ] End-to-end workflows are implemented and functional in the application: client intake, risk factor assignment by CAEN/post, organizational decisions, training schedule management, and compliance deadline tracking.
- [ ] Compliance deadlines for occupational health (medicină a muncii), periodic training (SSM/SU), and hygiene certificates are automatically computed and clearly surfaced with status indicators in the user interface.

### Document Generation
- [ ] All 25 document templates (DOCX and XLSX) in `handoff/ssm-template-placeholder-pack/templates` generate without unpopulated template placeholders, blank sections, or formatting defects.
- [ ] Generated document contents are contextually coherent and populated with realistic legal and operational data appropriate to the client's activity and risk profile.

### Excel Import / Export
- [ ] The Excel import/export template is intuitive to fill in, parses data accurately into Prisma database models, and handles edge cases without crashes.
- [ ] Meaningful error messages are displayed for invalid rows or missing required fields during Excel import.

### Automated Verification & Build
- [ ] Automated verification script(s) run and pass, programmatically confirming document generation across all 25 templates, Excel import/export round-tripping, and deadline calculation logic.
- [ ] Next.js application builds cleanly with `npm run build` with zero TypeScript or build errors.

## 2026-11-03T04:56:01Z

Liveness nudge from Sentinel: Your progress.md has not been updated in over 20 minutes. Please provide a status update on Milestone 3 execution and update progress.md.

## 2026-11-03T15:45:35Z

Liveness nudge from Sentinel: Please provide a status update on Milestone 3 execution (m3_r2_worker_1) and update progress.md with the latest progress.
