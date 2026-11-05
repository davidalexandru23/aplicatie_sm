## 2026-11-05T00:52:47Z

You are m2_worker_1, the implementation worker for Milestone 2 (Pillar 2: Catalog Expansion to 31 Statutory Templates, F7–F11).
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_worker_1

MANDATORY FIRST STEPS:
1. Initialize your state in your working directory (.agents/teamwork/m2_worker_1/):
   - Record your task in DISPATCH.md and initialize BRIEFING.md and progress.md with "Last visited: [timestamp]".
2. Read the following authoritative source files:
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_explorer_1/handoff.md` (F7 ssm-fisa-instruire-individuala & F8 psi-fisa-instructaj-individuala)
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_spec_miner_2/handoff.md` (F9 med-fisa-solicitare-examen, med-fisa-identificare-riscuri & F10 Part A eip-fisa-acordare-individuala)
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_explorer_3/handoff.md` (F10 Part B hr-cim-model-cadru-2022 & F11 Catalog expansion to 31 templates in definitions.ts, resolver.ts, and seed.ts)

MANDATORY INTEGRITY WARNING — DO NOT CHEAT:
All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own exclusively:
- `templates_registry/normalized/` (new template files for F7-F11)
- `handoff/ssm-template-placeholder-pack/templates/` (exact mirrors of the new template files)
- `src/lib/templates/definitions.ts`
- `src/lib/templates/resolver.ts`
- `prisma/seed.ts` & `src/lib/templates/seed.ts`
- You may create build/generation helper scripts in `scripts/` (e.g. `scripts/create_m2_templates.py` or `.ts`) to assemble the DOCX templates if needed.

IMPLEMENTATION REQUIREMENTS:
1. Create 6 New Statutory DOCX Templates in `templates_registry/normalized/` and mirror them bit-for-bit into `handoff/ssm-template-placeholder-pack/templates/`:
   - `ssm-fisa-instruire-individuala.docx` (Anexa 11 HG 1425/2006, with 16-row padded dynamic table `{#instruiriPeriodiceSSM}` and non-conflicting loop tokens `{nr}`, `{data}`, `{durata}`, `{ocupatia}`, `{tematica}`, `{semnaturaInstruit}`, `{semnaturaInstructor}`, `{semnaturaVerificator}`)
   - `psi-fisa-instructaj-individuala.docx` (Anexa OMAI 712/2005, with 16-row padded dynamic table `{#instructajePeriodicePSI}` and loop tokens `{nr}`, `{data}`, `{durata}`, `{tema}`, `{semnaturaInstruit}`, `{semnaturaInstructor}`, `{semnaturaVerificator}`)
   - `med-fisa-solicitare-examen.docx` (Anexa 2 HG 355/2007)
   - `med-fisa-identificare-riscuri.docx` (Anexa 3 HG 355/2007, 11 statutory sections)
   - `eip-fisa-acordare-individuala.docx` (HG 1048/2006, 10-row allocation table with harmonized EN standards)
   - `hr-cim-model-cadru-2022.docx` (Ordin MMSS 2171/2022, Chapters A–P with Legea 283/2022 provisions)
2. Update `src/lib/templates/definitions.ts`:
   - Add all 6 `TemplateDefinition` objects to `TEMPLATE_CATALOG` (expanding catalog size from 25 to 31 templates). Ensure `family`, `contextLevel: 'employee'`, and all field definitions exactly match the specifications in the Explorer handoffs.
3. Update `src/lib/templates/resolver.ts`:
   - Ensure all new `{PLACEHOLDER_*}` tokens have robust fallback values.
   - For `ssm-fisa-instruire-individuala` and `psi-fisa-instructaj-individuala`, construct the 16-row padded arrays (`instruiriPeriodiceSSM`, `instructajePeriodicePSI`, `instruiriSuplimentareSSM`, `exercitiiPracticePSI`) so that docxtemplater generates a complete table with empty cells for pen-signing, ensuring `unmappedInFile.length === 0`.
   - Never confuse `PLACEHOLDER_REPREZENTANT_LEGAL` (Munteanu Cristian) with the employee (`Stan Alexandru`).
4. Update `prisma/seed.ts` and `src/lib/templates/seed.ts`:
   - Synchronize all 31 templates in database seeding.
5. Verification Commands:
   - Run `npx tsx scripts/test-all-templates-generation.ts` and verify that ALL 31 templates PASS with `approved_for_print` and `unmappedInFile.length === 0`.
   - Run `npx tsx scripts/verify-all.ts` and verify 130/130 tests pass.
   - Run `npm run build` and verify that the Next.js Turbopack build succeeds with exit code 0.

OUTPUT:
Write your complete report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_worker_1/handoff.md` and send a summary message back to the orchestrator.
