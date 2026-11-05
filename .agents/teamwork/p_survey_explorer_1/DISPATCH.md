# DISPATCH — p_survey_explorer_1

## Mission
Survey codebase and template files for Pillar 1 (Rectificarea Textuală a Șabloanelor Existente) of the Strategic Plan.

## Context
Original Request: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Strategic Plan: /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md
Template files locations:
- `templates_registry/normalized/`
- `handoff/ssm-template-placeholder-pack/templates/`
- `src/lib/templates/definitions.ts`

## Specific Tasks
Examine the 9 templates targeted in Pillar 1 and identify the exact XML, text, and structure issues:
1. `EVALUAREA RISCURILOR.docx` (`risk-evaluare`): inspect header `{PLACEHOLDER_ADRESA_FIRMA}` vs `{PLACEHOLDER_NR_REG_COM}`, check static "București", examine missing Chapters 6 & 7 and how risk factor tables can be restored.
2. `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`): find "agenților de pază" and check header for `{PLACEHOLDER_FIRMA}`.
3. `11 - ALUNECARI.docx` (`ipssm-alunecari`): check header for `{PLACEHOLDER_FIRMA}`.
4. `Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`): inspect `word/footer1.xml` and `footer2.xml` for the TinyPic external image ("UNIK Best Protect"); check for `{PLACEHOLDER_FUNCTIE}`.
5. `DECIZII.docx` (`decizii-angajator`): inspect Decizia 10 (hardcoded "DECIZIA Nr.10 din") and Deciziile 02-11 with hardcoded `Dna.`. Detail exact locations and required token names (`{PLACEHOLDER_NUMAR_DECIZIE_10}`, `{PLACEHOLDER_APELATIV_ADMINISTRATOR}`, `{PLACEHOLDER_APELATIV_PSI}`).
6. `Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`): inspect current placeholders; check missing `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`, CIM number.
7. `Informare Protectia Datelor.docx` (`hr-gdpr-informare`): check paragraph 12 ellipsis `…{PLACEHOLDER_FIRMA}` and legal grounds (Art. 6(1)(b)/(c) vs consent).
8. `Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`): inspect workbook sheets; confirm presence of `Sheet1` (Registru de Casă) and how to cleanly remove it.
9. `Adeverinta participare.docx` (`hygiene-adeverinta`): inspect `Nr. Aviz MS nr.` stutter and how Level 1 vs Level 2 is structured.

## Output
Write your findings to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md` and complete with `handoff.md`. Send a completion message when done.

## 2026-11-04T20:49:05Z
You are p_survey_explorer_1.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/DISPATCH.md.
Also read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md and /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md.
Survey the 9 templates targeted in Pillar 1 of the Strategic Plan:
- `EVALUAREA RISCURILOR.docx` (`risk-evaluare`)
- `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`)
- `11 - ALUNECARI.docx` (`ipssm-alunecari`)
- `Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`)
- `DECIZII.docx` (`decizii-angajator`)
- `Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`)
- `Informare Protectia Datelor.docx` (`hr-gdpr-informare`)
- `Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`)
- `Adeverinta participare.docx` (`hygiene-adeverinta`)

Inspect the actual template files (XML, headers, footers, tables, text) in `templates_registry/normalized/` and `handoff/ssm-template-placeholder-pack/templates/`.
Produce a detailed survey report at `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md` and complete with `handoff.md`.
Use send_message to notify the orchestrator when you finish.
