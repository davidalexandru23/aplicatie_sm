# DISPATCH — m1_p1_explorer_2

## Mission
Formulate concrete, file-by-file implementation strategy for Milestone 1 / Pillar 1 Part B:
1. `Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`)
2. `DECIZII.docx` (`decizii-angajator`)
3. `Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`)

## Context & Inputs
- Project Scope: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Survey 1 Report: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md`
- Strategic Plan: `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md`
- Template files: `templates_registry/normalized/` and `handoff/ssm-template-placeholder-pack/templates/`

## Specific Tasks
Analyze the exact XML modification approach for the Worker:
1. `Detaliu Tematica loc de munca.docx`:
   - Inspect `word/footer1.xml`, `word/footer2.xml`, and `word/_rels/` for the TinyPic external image relationship (`http://ssm-bucuresti.ro/` / `UNIK Best Protect`).
   - Specify how to completely excise the drawing/image XML and relationship target so Word opens without warnings.
   - Add `{PLACEHOLDER_FUNCTIE}` in header/body.
2. `DECIZII.docx`:
   - Replace static "DECIZIA Nr.10 din" with "DECIZIA Nr. {PLACEHOLDER_NUMAR_DECIZIE_10} din".
   - Replace all 24 occurrences of static `Dna.` with dynamic `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` and `{PLACEHOLDER_APELATIV_PSI}`. Provide the exact list of occurrences and contexts.
3. `Anexa fisa postului SSM.docx`:
   - Add `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`, `{PLACEHOLDER_DATA_SEMNARII}`.
4. Python or Node script strategy for Worker to unpack DOCX, patch XML and footers, and repack cleanly.

## Output
Write report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_2/analysis.md` and complete with `handoff.md`. Send completion message when done.


## 2026-11-04T21:00:42Z
You are m1_p1_explorer_2.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_2.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_2/DISPATCH.md.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md
- /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md

Formulate a concrete, file-by-file implementation strategy for Milestone 1 Part B:
1. `Detaliu Tematica loc de munca.docx` (`training-detaliu-loc-munca`): excising TinyPic external image/relationship in footer1.xml and footer2.xml, adding `{PLACEHOLDER_FUNCTIE}`.
2. `DECIZII.docx` (`decizii-angajator`): replacing static "DECIZIA Nr.10 din" with `{PLACEHOLDER_NUMAR_DECIZIE_10}`, replacing all 24 static `Dna.` with dynamic gender salutations `{PLACEHOLDER_APELATIV_ADMINISTRATOR}` and `{PLACEHOLDER_APELATIV_PSI}`.
3. `Anexa fisa postului SSM.docx` (`hr-anexa-fisa-post`): adding `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_COD_COR}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`, `{PLACEHOLDER_DATA_SEMNARII}`.
Provide exact XML snippets and the programmatic unpacking/patching script strategy for the Worker.

Write your analysis to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_2/analysis.md` and complete with `handoff.md`.
Use send_message to notify the orchestrator when you finish.
