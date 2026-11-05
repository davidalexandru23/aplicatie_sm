# DISPATCH — m2_p2_explorer_1

## Mission
Investigate specifications and design generation strategy for the 2 individual training sheets:
1. F7: `ssm-fisa-instruire-individuala` (Fișa Individuală de Instruire în domeniul SSM conform Anexei 11 din HG 1425/2006).
2. F8: `psi-fisa-instructaj-individuala` (Fișa Individuală de Instructaj în domeniul Situațiilor de Urgență conform Anexei la OMAI 712/2005).

## Context & Inputs
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Plan: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- Definitions Catalog: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts`
- Resolver Engine: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/resolver.ts`
- Existing training templates: `templates_registry/normalized/`

## Investigation Questions
1. What are the mandatory legal sections of Anexa 11 HG 1425/2006 (General Information, Introductory General Training, Workplace Training, Periodic Training multiannual table, Re-training/Test)?
2. What are the mandatory legal sections of Anexa OMAI 712/2005 (General Introductory Training, Workplace Training, Periodic Training, Practical Exercises/Simulations)?
3. How should the dynamic tables and `{PLACEHOLDER_*}` tokens be structured so docxtemplater renders clean, uncorrupted DOCX files?
4. Provide complete token schemas, table definitions, and template creation strategy for the Worker in `handoff.md`.
5. Notify orchestrator via `send_message`.


## 2026-11-05T00:42:06Z
You are m2_p2_explorer_1.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_explorer_1.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_explorer_1/DISPATCH.md.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts

Investigate F7 (Fișă individuală instruire SSM - Anexa 11 HG 1425/2006) and F8 (Fișă individuală instructaj PSI/SU - Anexa OMAI 712/2005).
Formulate layout, multiannual periodic tables, and token schemas for the Worker in handoff.md.
Notify the orchestrator with send_message when complete.
