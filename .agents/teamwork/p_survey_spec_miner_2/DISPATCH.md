# DISPATCH — p_survey_spec_miner_2

## Mission
Survey authoritative Romanian legal specifications and project catalog for Pillar 2 (Adăugarea a 6 Șabloane Noi Esențiale în Catalog: Extindere de la 25 la 31).

## Context
Original Request: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Strategic Plan: /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md
Template catalog definitions: `src/lib/templates/definitions.ts`
Storage & registries: `templates_registry/normalized/`, `handoff/ssm-template-placeholder-pack/templates/`

## Specific Tasks
Investigate the 6 new statutory document templates required:
1. `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006):
   - Legal structure, required sections (Date salariat, Instructaj introductiv general, Instructaj la locul de muncă, Admitere la lucru, Consemnarea instruirilor periodice), placeholders needed.
2. `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - Anexa OMAI 712/2005):
   - Legal structure, standard fields and periodic training logging table, placeholders needed.
3. `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007):
   - Official form sent to occupational medicine clinic, fields (angajator, salariat, post, noxe/riscuri, tip examen: angajare/periodic/reluare), placeholders needed.
4. `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007):
   - Official risk checkbox sheet (riscuri fizice, chimice, biologice, suprasolicitare, ecrane de vizualizare, ture de noapte, etc.), placeholders needed.
5. `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006):
   - Individual equipment distribution sheet (denumire EIP, data acordării, durata normată, semnătură primire), placeholders needed.
6. `hr-cim-model-cadru-2022` (Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022):
   - Complete statutory framework with Chapters A through P (replacing truncated 7-article version), placeholders needed (probation, notice, leave, salary, working hours, etc.).

Investigate:
- Are there reference models already present in `handoff/` or other project directories?
- Exactly what modifications are needed in `src/lib/templates/definitions.ts` (new template codes, titles, category, token arrays)?
- What generator requirements exist (DOCX generation via `docx` library or base docx templates)?

## Output
Write your findings to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_spec_miner_2/spec_mining_report.md` and complete with `handoff.md`. Send a completion message when done.
## 2026-11-04T20:49:12Z
You are p_survey_spec_miner_2.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_spec_miner_2.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_spec_miner_2/DISPATCH.md.
Also read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md and /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md.
Survey the legal specifications and catalog requirements for the 6 new statutory templates for Pillar 2:
1. `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire SSM - Anexa 11 HG 1425/2006)
2. `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în Domeniul Situațiilor de Urgență - Anexa OMAI 712/2005)
3. `med-fisa-solicitare-examen` (Fișa de Solicitare a Examenului Medical - Anexa 2 HG 355/2007)
4. `med-fisa-identificare-riscuri` (Fișa de Identificare a Factorilor de Risc Profesional - Anexa 3 HG 355/2007)
5. `eip-fisa-acordare-individuala` (Fișa Individuală de Dotare și Acordare EIP - HG 1048/2006)
6. `hr-cim-model-cadru-2022` (Contract Individual de Muncă Model-Cadru conform Ordinului MMSS 2171/2022)

Inspect if any reference files or drafts exist in `handoff/` or codebase, determine the exact token schemas, definitions in `src/lib/templates/definitions.ts`, and template creation strategy.
Produce a comprehensive report at `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/p_survey_spec_miner_2/spec_mining_report.md` and complete with `handoff.md`.
Use send_message to notify the orchestrator when you finish.
