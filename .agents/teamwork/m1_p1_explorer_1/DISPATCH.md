# DISPATCH — m1_p1_explorer_1

## Mission
Formulate concrete, file-by-file implementation strategy for Milestone 1 / Pillar 1 Part A:
1. `EVALUAREA RISCURILOR.docx` (`risk-evaluare`)
2. `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`)
3. `11 - ALUNECARI.docx` (`ipssm-alunecari`)

## Context & Inputs
- Project Scope: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Survey 1 Report: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md`
- Strategic Plan: `/Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md`
- Template files: `templates_registry/normalized/` and `handoff/ssm-template-placeholder-pack/templates/`

## Specific Tasks
Analyze the exact XML modification approach for the Worker:
1. `EVALUAREA RISCURILOR.docx`:
   - Replace `{PLACEHOLDER_ADRESA_FIRMA}` with `{PLACEHOLDER_NR_REG_COM}` in header paragraph.
   - Remove static „București” from `Registrul Comertului Bucuresti` -> `Registrul Comertului`.
   - Remove hardcoded historical evaluator address and phone (`str Petcu Avram`, `0040 723...`) and replace with `{PLACEHOLDER_ADRESA_PRESTATOR}`, `{PLACEHOLDER_TELEFON_PRESTATOR}`.
   - Replace academic thesis text `in cadrul lucrarii de absolvire` with `in cadrul prezentei evaluari de securitate si sanatate in munca`.
   - Clean corrupted strings like `x2.Contuzie{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx`.
   - Specify how Chapters 6 & 7 (Evaluation grid per job & conclusions) must be restored in the document body.
2. `13 - ACTIVITATI DE BIROU.docx`:
   - Replace „agenților de pază” at P24 with „personalului de birou”.
   - Add `{PLACEHOLDER_FIRMA}` in header.
3. `11 - ALUNECARI.docx`:
   - Add `{PLACEHOLDER_FIRMA}` in header.
4. Python or Node script strategy for Worker to unpack DOCX, patch `word/document.xml` and headers, and repack cleanly without corrupting OpenXML.

## Output
Write report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1/analysis.md` and complete with `handoff.md`. Send completion message when done.


## 2026-11-04T21:00:36Z
You are m1_p1_explorer_1.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1/DISPATCH.md.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_explorer_1/survey_report.md
- /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md

Formulate a concrete, file-by-file implementation strategy for Milestone 1 Part A:
1. `EVALUAREA RISCURILOR.docx` (`risk-evaluare`): RegCom token, remove static Bucuresti, clean historical evaluator contact info, remove thesis text, restore Cap 6-7 tables.
2. `13 - ACTIVITATI DE BIROU.docx` (`ipssm-birou`): replace "agenților de pază" with "personalului de birou", add `{PLACEHOLDER_FIRMA}` in header.
3. `11 - ALUNECARI.docx` (`ipssm-alunecari`): add `{PLACEHOLDER_FIRMA}` in header.
Provide exact XML snippets and the programmatic unpacking/patching script strategy for the Worker.

Write your analysis to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1/analysis.md` and complete with `handoff.md`.
Use send_message to notify the orchestrator when you finish.
