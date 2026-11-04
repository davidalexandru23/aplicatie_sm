# DISPATCH LOG

## 2026-11-01T20:47:07Z

Build an automated document completion and employee compliance deadline tracking system for Romanian SSM, HR, and Hygiene operations, with full autonomy to research external sources, inspect legal models, and modify or rewrite existing project components, keeping the workflow simple without user roles or electronic signatures.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Integrity mode: development

References:
- Romanian SSM, PSI/SU, Labor, and Hygiene legislation and practices: Legea 319/2006 (SSM), Legea 53/2003 (Codul Muncii), HG 355/2007 (Medicina Muncii), Ordinul 1225/5031/2003 (Cursuri Igienă), Legea 307/2006 (Apărarea împotriva incendiilor).
- Template directory: `handoff/ssm-template-placeholder-pack/templates` (25 templates in DOCX and XLSX formats covering HR, Decizii, IPSSM, Evaluare Riscuri, Instruire SSM/SU, and Cursuri Igienă).
- Existing application stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL.

## Requirements

### R1. Comprehensive Document Auto-Completion
Implement complete auto-completion logic for all 25 document templates (DOCX and XLSX) in `handoff/ssm-template-placeholder-pack/templates`, using them as models and suggestions. The team has full autonomy to inspect external online documentation, repositories, and real-world Romanian legal models, and to refactor or rewrite existing project code and mapping logic in any direction needed to produce authentic, fully populated documents.

### R2. Employee Deadline and Expiry Tracking
Implement full tracking and clear visibility over employee compliance scadențe and expiration dates, specifically occupational health checkups (medicină a muncii), periodic SSM and PSI/SU training intervals, and hygiene certificate validity periods. Surfaced deadlines must be visible both in the backend data calculations and through clear status badges and alerts in the Next.js user interface.

### R3. Streamlined and Intuitive Workflow
Keep the system simple, intuitive, and automated without adding user roles, permission hierarchies, or electronic signatures.

### R4. Automated Verification Suite
Provide automated test scripts and verification routines that confirm:
1. Complete generation and placeholder replacement across all 25 templates with realistic data, leaving no unmapped placeholders or malformed files.
2. Accurate calculation of employee compliance deadlines according to Romanian legal intervals.
3. Proper functioning and clean builds of the application (`npm run build`).

## Acceptance Criteria

### Document Auto-Completion
- [ ] All 25 templates (DOCX and XLSX) in `handoff/ssm-template-placeholder-pack/templates` generate without unpopulated template placeholders or corrupted outputs.
- [ ] Generated documents conform to Romanian legal and practical standards for SSM, PSI/SU, HR, Risk Assessments, and Hygiene courses.

### Deadline & Expiry Tracking
- [ ] Occupational medicine (medicină a muncii) validity periods are calculated and tracked per employee.
- [ ] Periodic SSM and PSI/SU training intervals are calculated and tracked per employee.
- [ ] Hygiene certificate (cursuri de igienă) validity dates are calculated and tracked per employee.
- [ ] Clear visual status indicators and alerts for valid, upcoming, and overdue deadlines are present in the user interface.

### Architecture & Usability
- [ ] No user roles, permission hierarchies, or electronic signatures are introduced.
- [ ] The Next.js application compiles cleanly with `npm run build` with zero errors.

### Automated Verification
- [ ] Automated verification script(s) run and pass, confirming document generation for all 25 templates and verifying compliance deadline calculation logic.
