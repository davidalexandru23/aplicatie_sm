# DISPATCH — m1_p1_spec_miner_3

## Mission
Formulate concrete, file-by-file implementation strategy for Milestone 1 / Pillar 1 Part C:
1. `Informare Protectia Datelor.docx` (`hr-gdpr-informare`)
2. `Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`)
3. `Adeverinta participare.docx` (`hygiene-adeverinta`)
4. Schema & Resolver Updates in `src/lib/templates/definitions.ts` and `src/lib/templates/resolver.ts` for all 9 rectified templates.

## Context & Inputs
- Project Scope: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Survey 1 Report: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md`
- Strategic Plan: `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md`
- Template files: `templates_registry/normalized/` and `handoff/ssm-template-placeholder-pack/templates/`
- Codebase: `src/lib/templates/definitions.ts` and `src/lib/templates/resolver.ts`

## Specific Tasks
Analyze exact modifications needed:
1. `Informare Protectia Datelor.docx`:
   - Replace consent language with Art. 6(1)(b)/(c) and Art. 9(2)(b) GDPR legal grounds.
   - Remove residual ellipsis `…` at paragraphs 12, 16, 17 (`…{PLACEHOLDER_FIRMA}`).
2. `Tabel Cursanti exemplu.xlsx`:
   - Specify exact method to delete secondary worksheet `Sheet1` (Registru de Casă contabilă) via Python (`openpyxl`) or Node (`xlsx`), preserving formulas and layout on the hygiene participants sheet.
3. `Adeverinta participare.docx`:
   - Fix stutter `Nr. Aviz MS nr.` -> `Nr. Aviz MS`.
   - Formulate resolver logic to dynamically supply `Nivelul 1` for execution roles and `Nivelul 2` for management roles based on `Job` or employee status.
4. `src/lib/templates/definitions.ts` & `src/lib/templates/resolver.ts`:
   - Formulate exact TypeScript definitions to add new tokens:
     - `PLACEHOLDER_NUMAR_DECIZIE_10`
     - `PLACEHOLDER_APELATIV_ADMINISTRATOR` („Dl.” / „Dna.”)
     - `PLACEHOLDER_APELATIV_PSI` („Dl.” / „Dna.”)
     - In `definitions.ts`: add `PLACEHOLDER_FIRMA` to `ipssm-birou` and `ipssm-alunecari`, add `PLACEHOLDER_FUNCTIE` to `training-detaliu-loc-munca`, add new tokens to `hr-anexa-fisa-post` and `decizii-angajator`.
     - In `resolver.ts`: implement dynamic gender detection logic for administrator and PSI representative to return „Dl.” or „Dna.” cleanly without errors.

## Output
Write report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_spec_miner_3/analysis.md` and complete with `handoff.md`. Send completion message when done.
