# DISPATCH — m1_p1_worker_1

## Mission
Implement all textual and structural rectifications for the 9 templates in Milestone 1 / Pillar 1, and synchronize `definitions.ts` and `resolver.ts`.

## Write Ownership
You exclusively own and may edit:
1. `templates_registry/normalized/` (and mirror to `handoff/ssm-template-placeholder-pack/templates/`) for the 9 files:
   - `EVALUAREA RISCURILOR.docx`
   - `13 - ACTIVITATI DE BIROU.docx`
   - `11 - ALUNECARI.docx`
   - `Detaliu Tematica loc de munca.docx`
   - `DECIZII.docx`
   - `Anexa fisa postului SSM.docx`
   - `Informare Protectia Datelor.docx`
   - `Tabel Cursanti exemplu.xlsx`
   - `Adeverinta participare.docx`
2. `src/lib/templates/definitions.ts`
3. `src/lib/templates/resolver.ts`
4. Temporary helper patch script in `scripts/` (e.g. `scripts/patch_m1_templates.py` or `.ts`)

## Detailed Requirements & Strategies from Explorers
Read and implement the exact solutions formulated in:
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1/analysis.md` (Risk doc, IPSSM birou & alunecări)
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_2/analysis.md` (Decizii, TinyPic excision in training loc munca, Anexa fisa postului)
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_spec_miner_3/analysis.md` (GDPR text, Excel Sheet1 deletion, Adeverinta Level 1/2, definitions & resolver updates)

## Integrity Requirement
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Completion Criteria
1. All 9 templates rectified and validated without corrupting OpenXML / XLSX zip packages.
2. `definitions.ts` and `resolver.ts` cleanly updated with full TypeScript types and dynamic salutations.
3. Tests run and pass (`npx tsx scripts/test-all-templates-generation.ts` and `npx tsx scripts/verify-all.ts`).
4. `npm run build` succeeds cleanly with exit code 0.
5. Report all changes, commands run, and test outputs in `handoff.md`. Send completion message via `send_message`.

## 2026-11-04T21:13:35Z
[Message] timestamp=2026-11-04T21:13:35Z sender=52975841-0689-40b1-8300-cae22c99f765 priority=MESSAGE_PRIORITY_HIGH content=You are m1_p1_worker_1.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_worker_1.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_worker_1/DISPATCH.md.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_1/analysis.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_explorer_2/analysis.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_p1_spec_miner_3/analysis.md
- /Users/davidalexandru/.gemini/antigravity/brain/7f1f394f-32ac-4074-962e-c4dddf036503/PLAN_STRATEGIC_SSM_IGIENA_HR.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Implement all structural, XML, and text rectifications for the 9 templates in `templates_registry/normalized/` (and mirror to `handoff/ssm-template-placeholder-pack/templates/`).
2. Delete `Sheet1` (Registru de Casă) from `Tabel Cursanti exemplu.xlsx`.
3. Update `src/lib/templates/definitions.ts` and `src/lib/templates/resolver.ts` per the specifications and code provided by the Explorers.
4. Run build and tests:
   - `npx tsx scripts/test-all-templates-generation.ts`
   - `npx tsx scripts/verify-all.ts`
   - `npm run build`
5. Report all changes and verification outputs in `handoff.md`.
Use send_message to notify the orchestrator when you finish.

