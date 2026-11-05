# DISPATCH — m3_p3_explorer_1

**Milestone**: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)  
**Assigned Role**: `teamwork_explorer`  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_1`  
**Date**: 2026-11-05T01:35:00Z  

## Objective
Investigate F12 (Stopping mock salaries and generic CIM fabrications) and Challenger 1 finding F-M2-01:
1. Inspect `src/lib/templates/resolver.ts` and `src/lib/templates/generator.ts`:
   - Identify where 6500 lei, fictitious salary figures, or dummy contract numbers are hardcoded or injected.
   - Design the architectural fix: if salary/allowances are not recorded in the DB contract, report `missing_data` with missing fields for real execution, while ensuring offline template generation (`approved_for_print`) can use clean non-fictitious dotted/blank strings or explicit overrides.
2. Inspect the dynamic table row looping in `resolveTemplateData`:
   - Address Finding F-M2-01: Change `for (let i = 0; i < TARGET_SSM_ROWS; i++)` to `Math.max(TARGET_SSM_ROWS, ssmEvents.length)` so an employee with >16 events does not have events truncated.
3. Formulate concrete code changes for the Worker.

## Key Files to Inspect
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `src/lib/templates/resolver.ts`
- `src/lib/templates/definitions.ts`
- `src/lib/templates/generator.ts`

## 2026-11-05T01:34:33Z
You are m3_p3_explorer_1, the Explorer for Feature F12 (Stopping mock salaries and generic CIM fabrications) and Challenger Finding F-M2-01.
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_1

Read DISPATCH.md in your working directory and the following sources:
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `src/lib/templates/resolver.ts`
- `src/lib/templates/definitions.ts`
- `src/lib/templates/generator.ts`

Investigate:
1. Exact occurrences in `resolver.ts` where 6500 lei or arbitrary salaries / allowances / CIM numbers are injected or defaulted.
2. How to ensure real client / employee generation flags missing financial/contractual data as `missing_data` while allowing offline/test generation to print cleanly without fabricating arbitrary facts.
3. Fix for Finding F-M2-01: Update the loop for `instruiriPeriodiceSSM` and `instructajePeriodicePSI` from fixed `i < 16` to `Math.max(TARGET_SSM_ROWS, ssmEvents.length)` so employees with >16 training events in DB are not truncated.

Write your report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_1/handoff.md` and send a message back.
