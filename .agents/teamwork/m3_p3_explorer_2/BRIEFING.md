# BRIEFING — 2026-11-05T01:43:00Z

## Mission
Investigate Feature F13: Schema and implementation for automatic fallback to default external SSM provider (`isDefault: true`) and default specialist in `resolver.ts`.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: teamwork explorer
- Working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2
- Original parent: d4389872-2ec2-44c4-b4b6-52d9b0f4a82d
- Milestone: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigate F13: SsmProvider & SsmSpecialist fallback resolution in resolver.ts

## Current Parent
- Conversation ID: d4389872-2ec2-44c4-b4b6-52d9b0f4a82d
- Updated: 2026-11-05T01:43:00Z

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma` (lines 42–46, 73–139)
  - `prisma/seed.ts` (lines 19–132, 740–795)
  - `src/lib/templates/resolver.ts` (lines 1141–1188, 1315–1342, 1760–1870)
  - `src/lib/templates/definitions.ts`
  - `scripts/test-adversarial-provider-tokens.ts`
  - `scripts/test-reviewer1-independent-audit.ts`
  - `scripts/test-m1-provider-e2e.ts`
- **Key findings**:
  - `SsmProvider` and `SsmSpecialist` have `isDefault: Boolean @default(false)` and `isActive: Boolean @default(true)`.
  - Currently `resolveTemplatePlaceholders` queries `provider: true`, but not `specialists: true`.
  - In `resolveTemplateData` lines 1145–1150, if `client.providerId` is null, Prisma is not queried at all, falling back to static in-memory constants `ROMANIAN_LEGAL_SSM_PROVIDER`, bypassing any DB updates in `/settings`.
  - In DB, multiple specialists can have `isDefault: true` (e.g. `Ing. Preda Gabriela` and `Ing. Mihai Popescu` in dev DB), necessitating deterministic ordering (`orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]`).
  - Formulated 4-level precedence resolution supporting legacy client strings (`ssmProviderName`), modern explicit IDs (`providerId`), automatic database fallback (`isDefault: true`), and statutory in-memory defaults.
- **Unexplored areas**: None for F13.

## Key Decisions Made
- Fully documented exact schema, seed data, current resolver flaws, and concrete replacement code for `src/lib/templates/resolver.ts`.
- Mapped 15 `{PLACEHOLDER_SERVICIU_EXTERN_*}` aliases alongside 24 standard provider tokens.
- Produced self-contained handoff report at `.agents/teamwork/m3_p3_explorer_2/handoff.md`.

## Artifact Index
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2/DISPATCH.md — Incoming directives
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2/progress.md — Progress and heartbeat
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2/handoff.md — Final investigation report
