# Task Assignment: Survey Spec Miner 3 (Templates, Legal Realism & Verification Suite)

## 2026-11-03T17:17:21Z
Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`.
Investigate R3 and R4:
- Inspect all 25 templates in `handoff/ssm-template-placeholder-pack/templates` and compare with `src/lib/templates/definitions.ts` and `src/lib/templates/resolver.ts`.
- Verify template placeholder mappings, Romanian legal & operational norms (ITM, DSP, DSVSA/ANSVSA), external provider profile placeholders, and designated specialist placeholders.
- Inspect how missing optional employee or company fields are handled in `resolver.ts` and `generator.ts` (ensuring graceful handling without crashes).
- Inspect verification scripts (`scripts/verify-all.ts`, `scripts/e2e-suite.ts`, `scripts/test-all-templates-generation.ts`) and test seed data (`prisma/seed.ts`).
- Determine what automated tests, seed data, and verification scripts are needed to validate migrations, provider CRUD, client assignment, hygiene roster generation, and template rendering.
- Write your comprehensive findings to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r3_spec_miner_3/handoff.md`.
- Report completion via send_message.
