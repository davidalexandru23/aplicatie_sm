## 2026-11-04T20:49:21Z
# DISPATCH — p_survey_explorer_3

## Mission
Survey codebase architecture for Pillars 3, 4, and 5 of the Strategic Plan.

## Context
Original Request: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Strategic Plan: /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md
Codebase paths:
- `prisma/schema.prisma`
- `src/lib/templates/resolver.ts`
- `src/lib/templates/generator.ts`
- `src/lib/risk/caen-risk-presets.ts`
- `src/app/documents/generate/`
- `src/app/risk-assessments/`
- `scripts/verify-all.ts`

## Specific Tasks
Examine implementation details for:
1. **Pillar 3: Resolver & Real Data Plumbing**:
   - Where is mock data injected (e.g. `salary: 6500 lei`, placeholder CIM)? How to transition to leaving unspecified fields empty or flagging `missing_data`?
   - How `Client` queries `SsmProvider` and `SsmSpecialist`: how to implement fallback to `isDefault: true` provider and specialist if client lacks explicit link?
   - How `Job` model properties (`mainActivities`, `equipmentUsed`, `workConditions`, `corCode`) can be pulled into `resolver.ts` and mapped to `{PLACEHOLDER_ACTIVITATI_POST}`, `{PLACEHOLDER_ECHIPAMENTE_POST}`, `{PLACEHOLDER_CONDITII_POST}`, `{PLACEHOLDER_COD_COR}`?
   - How `caen-risk-presets.ts` can be dynamically used by `Plan de Prevenire` measures instead of static office measures.
2. **Pillar 4: Bulk Generation Packages (ZIP Workflows)**:
   - "Pachet Onboarding Salariat (1-Click ZIP)" (Cerere angajare + Fișă trimitere med muncii Anexa 2 + Fișă factori risc Anexa 3 + CIM + Informare GDPR + Luare cunostinta RI + Anexă SSM fișă post).
   - "Pachet Înființare Dosar SSM Client (Start-up Dossier ZIP)" (Pachet Decizii + Evaluare Riscuri + Plan Prevenire + Zone Pericol + Tematici Generale).
   - "Export Arhivă Control ITM / ISU (ZIP)".
   - Check how zip files are generated (e.g., `archiver`, `jszip`, or Node `zlib`), API routes needed, and download triggers.
3. **Pillar 5: UI/UX Refinements & Verification**:
   - `/documents/generate`: adding Job/Post selector (`jobId`) to allow generation without an assigned employee.
   - `/risk-assessments`: interactive risk configurator with CAEN & Job selection, adjusting severity/probability.
   - Verification scripts (`scripts/verify-all.ts`, tests, build).

## Output
Write your findings to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_3/survey_report.md` and complete with `handoff.md`. Send a completion message when done.
