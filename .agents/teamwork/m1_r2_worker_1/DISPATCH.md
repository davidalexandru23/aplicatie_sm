## 2026-11-02T20:18:34Z
You are m1_r2_worker_1, a teamwork_worker agent.
Your working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_worker_1/
Project root: /Users/davidalexandru/Documents/Proiect_SSM

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mandatory requirement: Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before starting.
Also read:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_explorer_1/handoff.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_explorer_2/handoff.md
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_spec_miner_3/handoff.md

Write Ownership: You have EXCLUSIVE write ownership of:
- prisma/schema.prisma
- prisma/seed.ts
- src/lib/caen-catalog.ts
- src/lib/risk/caen-risk-presets.ts
- src/lib/templates/resolver.ts
- src/lib/templates/definitions.ts

Your objective for Milestone 1 (SSM Domain Schema & Contextual CAEN Engine):
1. Update `prisma/schema.prisma`:
   Add the 11 nullable fields to `model Client`:
   - `caenCode            String?`
   - `caenActivity        String?`
   - `foundedYear         Int?`
   - `ssmProviderName     String?`
   - `ssmSpecialistName   String?`
   - `ssmSpecialistCert   String?`
   - `designatedWorkerSsm String?`
   - `firstAidResponder   String?`
   - `psiResponder        String?`
   - `investigationMembers String?`
   - `decisionsDate       DateTime?`
   Run `npx prisma db push` to synchronize the PostgreSQL database and regenerate Prisma Client.

2. Update `prisma/seed.ts`:
   - Populate `caenCode`, `caenActivity`, `foundedYear`, `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`, `designatedWorkerSsm`, `firstAidResponder`, `psiResponder`, `investigationMembers`, `decisionsDate` for NEXUS SOLUTIONS S.R.L. (CAEN 6201) and BISTRO GOURMET S.R.L. (CAEN 5610) as specified in `m1_r2_explorer_1/handoff.md`.
   - Add complete `IdentityDocument` and `ResidenceAddress` records for all employees (Stan, Dumitru, Barbu, Radu, Marin) so all employees have valid identity documents and addresses.
   Run `npx prisma db seed` to seed the database.

3. Create `src/lib/caen-catalog.ts`:
   Use the tested implementation from `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_explorer_2/proposed_caen_catalog.ts`. Ensure it exports `CAEN_CATALOG`, `getCaenEntry(code)`, `searchCaen(query)`.

4. Create `src/lib/risk/caen-risk-presets.ts`:
   Use the tested implementation from `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_explorer_2/proposed_caen_risk_presets.ts`. Ensure it exports `getRiskProfileForCaen(caenCode, jobTitle)`, `INCDPM_RISK_PROFILES`.

5. Update `src/lib/templates/resolver.ts` and `definitions.ts`:
   Follow the blueprint in `m1_r2_spec_miner_3/handoff.md`:
   - Connect `context.client.caenCode` dynamically to `getRiskProfileForCaen`.
   - Populate `PLACEHOLDER_COD_CAEN`, `PLACEHOLDER_ACTIVITATE_PRINCIPALA`, `PLACEHOLDER_AN_INFIINTARE`, `PLACEHOLDER_NIVEL_RISC_GLOBAL`, and the risk factor tables using the dynamic profile.
   - Connect `context.client.designatedWorkerSsm`, `firstAidResponder`, `psiResponder`, `investigationMembers`, `decisionsDate` to populate organizational decision placeholders.
   - Maintain fallback to CAEN 6201 only if `client.caenCode` is absent.
   - Ensure zero unmapped `{PLACEHOLDER_*}` tokens across all 25 templates.

6. Verification commands:
   - Run `npx tsx scripts/test-all-templates-generation.ts` (25/25 approved_for_print, 0 unmapped tokens).
   - Run `npx tsx scripts/test-export-import-roundtrip.ts` (must pass 100%).
   - Run `npx tsx scripts/verify-all.ts` (124/124 items pass).
   - Run `npx tsc --noEmit` and `npm run build` (clean build with 0 errors).

Write your handoff report to:
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_worker_1/handoff.md
Include Observation, Logic Chain, Caveats, Conclusion, Verification Method with command outputs.
When finished, send a coordination message back to the orchestrator.
