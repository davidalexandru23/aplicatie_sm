# DISPATCH: Milestone 1 Worker (Compliance Engine & Data Layer Implementer)

## Assignment
You are the implementation Worker for Milestone 1: Compliance Engine & Data Layer.
Your task is to implement the database schema extension, seed data, the core compliance calculation engine (`src/lib/compliance.ts`), and unit test suite (`scripts/verify-compliance.ts`).

## Exclusive File Ownership
You exclusively own and may edit or create:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `package.json` (only adding `"prisma": { "seed": "tsx prisma/seed.ts" }` if needed)
- `src/lib/compliance.ts`
- `scripts/verify-compliance.ts`

Do NOT touch any other source files or templates in this milestone.

## Mandatory Inputs & Reports to Read
Read these reports carefully before writing code:
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_1/handoff.md` and `.agents/teamwork/m1_explorer_1/analysis.md` (and `schema.patch`, `seed.ts`)
4. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/handoff.md` and `.agents/teamwork/m1_explorer_2/analysis.md`
5. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_3/handoff.md` and `.agents/teamwork/m1_explorer_3/analysis.md`

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Action Steps
1. Apply the 15 compliance fields to `Employee` in `prisma/schema.prisma` (medicina muncii, SSM training, PSI training, hygiene certificates).
2. Run `npx prisma db push` to synchronize PostgreSQL. Verify existing rows are preserved.
3. Place `prisma/seed.ts` with idempotent upserts covering all 4 compliance states (`VALID`, `UPCOMING`, `OVERDUE`, `MISSING`) and run `npx tsx prisma/seed.ts`.
4. Create `src/lib/compliance.ts` implementing `addMonthsSafe` (month-end clamping), DST-immune calendar midnight normalization, status classification (`OVERDUE` <0d, `UPCOMING` 0..30d, `VALID` >30d, `MISSING` null), `calculateItemCompliance`, `calculateEmployeeCompliance`, and `calculateCompanyMetrics`.
5. Create `scripts/verify-compliance.ts` containing the 45-assertion test suite.
6. Execute `npx tsx scripts/verify-compliance.ts` and verify 45/45 assertions pass with exit code 0.
7. Execute `npm run build` and `npx tsc --noEmit` and verify exit code 0.
8. Document all commands, execution outputs, and file diffs in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_worker_1/handoff.md`.

Keep `progress.md` updated with timestamps in your folder. Send a message to orchestrator upon completion.
