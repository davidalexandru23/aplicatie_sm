# Task Assignment: M2 Spec Miner 2 - DSVSA/DSP Regulatory Specs & 3 Hygiene Templates

## Objective
Analyze Romanian regulatory requirements for occupational hygiene courses (Ordinul comun MS/ME 1225/5031/2003, Ordinul 2209/4469/2022, DSVSA / DSP official audits) and map them precisely to the 3 official hygiene templates:
1. `hygiene-tabel-cursanti` (`Tabel Cursanti exemplu.xlsx`) - "Tabel evidenta cursanti igiena": must generate a table with all employees who completed a hygiene module, which module, when, exam date, certificate series/no, employer unit, CNP, etc. (per DSVSA demands).
2. `hygiene-anexe-catalog` (`Anexe Curs igiena.xlsx`) - catalog annexes.
3. `hygiene-adeverinta` (`Adeverinta participare.docx`) - individual / session participation certificate.

## Input Files
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts`
- `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/resolver.ts`
- `/Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/generator.ts`
- `/Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/templates/`

## Output Requirements
Identify exact template structure, cell locations/placeholders, dynamic roster formatting for both XLSX and DOCX, and required data fields.
Write your analysis and mapping specification to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_spec_miner_2/handoff.md`
Then notify the orchestrator via `send_message`.

## 2026-11-04T18:54:39Z
You are m2_r4_spec_miner_2, a specification mining subagent.
Your assigned task and scope are described in:
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_spec_miner_2/DISPATCH.md

You MUST read:
1. /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
2. /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
3. /Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/definitions.ts
4. /Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/resolver.ts
5. /Users/davidalexandru/Documents/Proiect_SSM/src/lib/templates/generator.ts
6. Inspect the template files in /Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/templates/ (especially hygiene-tabel-cursanti / Tabel Cursanti exemplu.xlsx, hygiene-anexe-catalog / Anexe Curs igiena.xlsx, hygiene-adeverinta / Adeverinta participare.docx).

Extract Romanian regulatory requirements for occupational hygiene courses (Order 1225/5031/2003, Order 2209/4469/2022, DSVSA / DSP rules) and map them precisely to the placeholders and dynamic table cell logic of the 3 templates.

Your working directory is /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_spec_miner_2.
Write your complete specification and mapping analysis to:
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_spec_miner_2/handoff.md

When finished, send a message to the orchestrator (caller) with a brief summary and notification that handoff.md is ready.
