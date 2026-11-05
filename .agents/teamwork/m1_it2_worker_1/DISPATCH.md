# DISPATCH — m1_it2_worker_1

## Mission
Implement the fixes for all 6 defects identified by Challenger 1, based on the verified recommendations from Explorers 1, 2, and 3.

## Context & Inputs
- Challenger 1 Report: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_gate_challenger_1/handoff.md`
- Explorer 1 Report (Bugs 1 & 4): `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_it2_explorer_1/handoff.md`
- Spec Miner 2 Report (Bugs 2, 3, 5): `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_it2_spec_miner_2/handoff.md`
- Explorer 3 Report (Bug 6): `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_it2_explorer_3/handoff.md`
- Original Request: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- Project Plan: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You exclusively own:
- `src/lib/templates/resolver.ts`
- `scripts/patch_m1_templates.py`
- `templates_registry/normalized/DECIZII.docx` and mirrored in `handoff/ssm-template-placeholder-pack/templates/DECIZII.docx`
- `templates_registry/normalized/Adeverinta participare.docx` and mirrored in `handoff/ssm-template-placeholder-pack/templates/Adeverinta participare.docx`
- `scripts/stress-test-m1-challenger1.ts`

## Tasks
1. Apply `detectRomanianSalutation` and `sanitizeAuthorizationNumber` fixes from Explorer 1 in `src/lib/templates/resolver.ts`.
2. Apply `resolveHygieneLevel` and `participant.jobTitle` fixes from Spec Miner 2 in `src/lib/templates/resolver.ts`.
3. Apply `Adeverinta participare.docx` XML patch (`nivelul {PLACEHOLDER_NIVEL_IGIENA}` -> `{PLACEHOLDER_NIVEL_IGIENA}`) in both directories and in `scripts/patch_m1_templates.py`.
4. Apply `DECIZII.docx` Paragraph 458 XML patch (`PLACEHOLDER_APELATIV_ADMINISTRATOR` -> `PLACEHOLDER_APELATIV_MEMBRU_COMISIE`) in both directories and in `scripts/patch_m1_templates.py`.
5. Run test verification:
   - `npx tsx scripts/stress-test-m1-challenger1.ts` (confirm 125/125 PASS)
   - `npx tsx scripts/test-all-templates-generation.ts` (confirm 25/25 PASS)
   - `npx tsx scripts/verify-all.ts` (confirm 130/130 PASS)
   - `npm run build` (confirm exit code 0)
6. Write full handoff report in `handoff.md` with verification commands and outputs.
7. Notify orchestrator via `send_message`.
