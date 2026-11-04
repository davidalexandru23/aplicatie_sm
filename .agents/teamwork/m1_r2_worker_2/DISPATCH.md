## 2026-11-02T20:47:48Z
You are m1_r2_worker_2, a teamwork_worker agent.
Your working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_worker_2/
Project root: /Users/davidalexandru/Documents/Proiect_SSM

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mandatory requirement: Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before starting.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_it2_explorer_1/handoff.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_it2_explorer_2/handoff.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_it2_explorer_3/handoff.md

Write Ownership: You have EXCLUSIVE write ownership of:
- src/lib/risk/caen-risk-presets.ts
- src/lib/caen-catalog.ts
- src/lib/templates/resolver.ts
- prisma/seed.ts
- scripts/adversarial-m1-review.ts
- scripts/test-export-import-roundtrip.ts

Your objective for Milestone 1, Iteration 2 (Surgical Defect Remediation):
1. In `src/lib/risk/caen-risk-presets.ts`:
   - Replace `isAdministrativeJobTitle` with the dual-tier guard architecture from `m1_r2_it2_explorer_1/handoff.md`:
     * Tier 1: operational exclusion regex checking manual/field roles (`muncitor`, `zidar`, `instalator`, `bucatar`, `ospatar`, `sofer`, `manipulant`, etc.) returning `false` immediately so `-itor` agent suffixes are never classified as administrative.
     * Tier 2: word-bounded administrative regex with diacritic stripping (`\b(it|hr)\b`, `director`, `contabil`, `resurse umane`, etc.).
   - Fix `cleanCode = String(caenCode ?? '').replace(/[^0-9]/g, '').trim();` in `getRiskProfileForCaen` so numeric CAEN inputs from Excel do not throw TypeErrors.

2. In `src/lib/caen-catalog.ts`:
   - Fix `normalizeCaenCode` and `searchCaen` with defensive string coercion (`String(code ?? '').trim()`) per `m1_r2_it2_explorer_2/handoff.md`.

3. In `src/lib/templates/resolver.ts`:
   - Fix `String(client?.caenCode ?? '').includes('-')` at line 496.
   - Update `extractCaenCode` to handle dotted formats like `"41.20"` per `m1_r2_it2_explorer_2/handoff.md`.

4. In `prisma/seed.ts`:
   - Update CNP for Radu Marius from `1820815410098` to `1820815410097` (control digit 7).
   - Update CNP for Marin Andreea from `2950920410045` to `2950920410044` (control digit 4).
   - Add pre-seed cleanup for old CNPs if needed, and run `npx prisma db seed`.

5. In `scripts/adversarial-m1-review.ts`:
   - Update lines 71 and 72 with the corrected CNPs.

6. Verification commands:
   - Run `npx tsx scripts/adversarial-caen-stress.ts` (all 7 suites, 2,990 assertions must pass).
   - Run `npx tsx scripts/adversarial-seed-roundtrip-stress.ts` (all 16 tests, 148 assertions must pass).
   - Run `npx tsx scripts/test-export-import-roundtrip.ts` (100% pass).
   - Run `npx tsx scripts/test-all-templates-generation.ts` (25/25 approved for print).
   - Run `npx tsx scripts/verify-all.ts` (124/124 items pass).
   - Run `npx tsc --noEmit` and `npm run build` (clean compilation with 0 errors).
