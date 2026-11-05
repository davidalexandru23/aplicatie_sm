# DISPATCH — m2_p2_explorer_3

## Mission
Investigate specifications and design implementation strategy for:
1. F10 (Part B): `hr-cim-model-cadru-2022` (Contractul Individual de Muncă Model-Cadru conform Ordinului MMSS nr. 2171/2022, Capitolele A-P).
2. F11: Extinderea oficială a catalogului de la 25 la 31 de șabloane în `src/lib/templates/definitions.ts`, sincronizarea resolver-ului în `src/lib/templates/resolver.ts`, și actualizarea seed-ului în `prisma/seed.ts`.

## Context & Inputs
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Plan: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- Legal reference: Ordinul ministrului muncii și solidarității sociale nr. 2171/2022 pentru aprobarea modelului-cadru al contractului individual de muncă (Cap. A: Părțile contractului până la Cap. P: Dispoziții finale).
- Definitions Catalog: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts`
- Resolver: `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/resolver.ts`
- Seed: `/Users/davidalexandru/Documents/Proiect_SSM/prisma/seed.ts`

## Investigation Questions
1. Ordin MMSS 2171/2022: What are the mandatory clauses in the 2022 model contract (elements introduced in 2022: explicit probation period terms, training rights, additional benefits, detailed work location, method of salary payment)?
2. F11 Catalog Integration:
   - What are the exact metadata entries (`TemplateDefinition`) to add to `OFFICIAL_TEMPLATES` in `definitions.ts` for all 6 new templates?
   - How to structure the token definitions for each of the 6 templates?
   - How should `prisma/seed.ts` be updated to seed all 31 templates cleanly?
3. Provide complete TypeScript definitions and concrete implementation recommendations for the Worker in `handoff.md`.
4. Notify orchestrator via `send_message`.


## 2026-11-05T00:42:06Z
You are m2_p2_explorer_3.
Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_explorer_3.
Read your task assignment from /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_p2_explorer_3/DISPATCH.md.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts
- /Users/davidalexandru/Documents/Proiect_SSM/prisma/seed.ts

Investigate F10 Part B (CIM Model-Cadru Ordin MMSS 2171/2022 Cap A-P) and F11 (Catalog expansion to 31 templates in definitions.ts, resolver sync, seed.ts).
Formulate complete TypeScript definitions and implementation instructions for the Worker in handoff.md.
Notify the orchestrator with send_message when complete.
