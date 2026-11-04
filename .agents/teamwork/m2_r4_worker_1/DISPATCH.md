# Dispatch: Milestone 2 Implementation Worker (m2_r4_worker_1)

## Mandatory Documents to Read First
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. Explorer Findings:
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_explorer_1/handoff.md` (Seed data & Prisma schema findings)
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_spec_miner_2/handoff.md` (DSVSA/DSP compliance & template mapping)
   - `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_explorer_3/handoff.md` (UI/API flow & resolver bug analysis)

## File Write Ownership
You exclusively own and may edit the following files:
- `prisma/seed.ts`
- `src/lib/templates/resolver.ts`
- `src/app/documents/generate/page.tsx`
- `src/app/hygiene/page.tsx`
- `src/app/api/hygiene/sessions/route.ts`

## Mandatory Tasks
1. **Extend `prisma/seed.ts`**:
   - Add demo `HygieneSession` and `HygieneParticipant` records for `BISTRO GOURMET S.R.L.` (Modulul 1 Food, CAEN 5610) and `NEXUS SOLUTIONS S.R.L.` (Modulul 2 Services, CAEN 6201) across 3 distinct UI lifecycle states: `certificate_emise`, `in_desfasurare`, `programata`.
   - Link participants to existing employees (`empRadu`, `empMarin`, `empBarbu`, `empStan`).
   - Implement idempotent pre-cleanup of demo PVs (`PV-EX-2025-0042`, `PV-EX-2026-0089`, `PV-EX-2026-0112`).
   - Execute `npx prisma db seed` and verify 3 sessions and 4 participants are seeded cleanly.

2. **Refine `src/lib/templates/resolver.ts`**:
   - In `resolveTemplatePlaceholders`: include employee relations (`identityDocument`, `currentJob`, `residenceAddress`).
   - In `resolveTemplateData`:
     * When `hygieneSession` is null (client-level direct generation), dynamically assemble `participants` from `client.employees` (Order 2209/2022 modules, CNP/birth dates, cert series/number, exam date, identity doc), replacing the single hardcoded fallback ("Stan Alexandru").
     * When `hygieneSession` is present, enrich participants with `rowNumber`, `fullName`, `sessionDate`, `examDate`, `providerName`, `coursePeriod`, `identityDocument`, `module`, `level`.
     * In `resolveTemplatePlaceholders`, filter out indexed array placeholder definitions (`_001` - `_115`) from the returned manual fields list so the UI stays uncluttered.

3. **Enhance `/documents/generate/page.tsx`**:
   - Add a Scope Selector for hygiene templates:
     * Scope A ("Toți salariații firmei"): Allows generating `hygiene-tabel-cursanti` and `hygiene-anexe-catalog` directly for the selected client without requiring a hygiene session.
     * Scope B ("Sesiune specifică de igienă"): Filters sessions for that client and binds the session.
   - For `hygiene-adeverinta`: allow selecting the employee (Scope A) or participant (Scope B).
   - Read `hygieneSessionId`, `hygieneParticipantId`, and `clientId` from `useSearchParams()`.
   - Filter out repetitive array tokens (`_001` - `_115`) from manual fields form.

4. **Refine `/hygiene/page.tsx` and API**:
   - Ensure document links pass `clientId`.
   - Add direct 1-click download actions for `hygiene-tabel-cursanti`, `hygiene-anexe-catalog`, and `hygiene-adeverinta`.

5. **Verify All Verification Suites and Build**:
   - `npx prisma db seed`
   - `npx tsx scripts/test-all-templates-generation.ts` (all 25 templates generate without errors or unreplaced tokens)
   - `npx tsx scripts/verify-all.ts`
   - `npm run build` (Next.js build passes with 0 errors)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
Write your handoff report to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r4_worker_1/handoff.md`
Report the exact commands executed and outputs.

## 2026-11-04T19:05:13Z
Message received from orchestrator (19a9ebd9-cbc8-4be9-b2eb-6b30bd0e8394): Implement Milestone 2 tasks.
