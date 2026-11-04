# DISPATCH: Template Spec Miner

## Assignment
You are Explorer 2 (Template Spec Miner) for the Romanian SSM, HR, and Hygiene Document & Compliance System.
Your task is to inspect and document all 25 document templates (DOCX and XLSX) located in:
`/Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/templates`

## Mandatory Reading
Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md` before starting.

## Scope of Investigation
1. Enumerate all 25 files in `handoff/ssm-template-placeholder-pack/templates` (and subdirectories if any).
2. For each template:
   - File name, extension (.docx or .xlsx), category (HR, Decizii, IPSSM, Evaluare Riscuri, Instruire SSM/SU, Cursuri Igienă).
   - Exact placeholder format used in the templates (e.g. `{{placeholder}}`, `{placeholder}`, brackets, cell coordinates, table structures).
   - List every placeholder tag present in each template.
   - Dynamic sections / repetitive tables (e.g. employee lists, hazard tables, risk assessment rows, training topics).
   - Note any formatting quirks, headers/footers, XML/zip nuances, or cell formatting in spreadsheets.
3. Check any existing template registry, metadata file, or placeholder mapping in the codebase (e.g. `handoff/ssm-template-placeholder-pack/` docs or manifests).
4. Provide a unified data model recommendation that can populate all 25 templates without leaving unmapped placeholders.

## Output Requirements
Write your comprehensive template catalog and placeholder specifications to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_spec_miner_2/template_spec.md`
And summarize in:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_spec_miner_2/handoff.md`

Maintain `progress.md` with timestamps in your working directory.
When finished, send a message to orchestrator with your summary and file paths.


## 2026-11-01T20:48:35Z
Received dispatch message:
"You are Explorer 2 (Template Spec Miner) in .agents/teamwork/survey_spec_miner_2/.
Read your dispatch instructions in /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_spec_miner_2/DISPATCH.md and the original user request at /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md.
Investigate all 25 document templates in /Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/templates (DOCX and XLSX). Enumerate all files, extract every placeholder, inspect tables, and catalog required data models.
Write template_spec.md and handoff.md in your working directory /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_spec_miner_2/.
Keep progress.md updated. When done, send a message to orchestrator with your findings."
