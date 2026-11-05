# DISPATCH — m3_p3_explorer_2

**Milestone**: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)  
**Assigned Role**: `teamwork_explorer`  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2`  
**Date**: 2026-11-05T01:35:00Z  

## Objective
Investigate F13 (Automatic fallback to `isDefault: true` external SSM provider):
1. Inspect `prisma/schema.prisma`, `src/lib/templates/resolver.ts`, and database seed (`prisma/seed.ts`):
   - Analyze how `SsmProvider` and `SsmSpecialist` models are structured with `isDefault: Boolean`.
   - Analyze how `resolveTemplatePlaceholders` currently retrieves `client.provider` / `client.specialist`.
2. Design the automatic resolution logic:
   - If `client.providerId == null` or `client.specialistId == null`, query `prisma.ssmProvider.findFirst({ where: { isDefault: true }, include: { specialists: true } })`.
   - Bind the default provider name, CIF, registration, authorization number, and default specialist name into `{PLACEHOLDER_SERVICIU_EXTERN_*}` and `{PLACEHOLDER_SPECIALIST_SSM}`.
3. Formulate concrete TypeScript code changes for `src/lib/templates/resolver.ts`.

## Key Files to Inspect
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/templates/resolver.ts`


## 2026-11-05T01:34:33Z
You are m3_p3_explorer_2, the Explorer for Feature F13 (Automatic fallback to isDefault: true external SSM provider subsystem).
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2

Read DISPATCH.md in your working directory and the following sources:
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
- `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/templates/resolver.ts`

Investigate:
1. The schema of `SsmProvider` and `SsmSpecialist` in `prisma/schema.prisma` and their seed data in `prisma/seed.ts`.
2. How `resolveTemplatePlaceholders` currently looks up external SSM providers and specialists.
3. Formulate the exact Prisma queries and fallback resolution when `client.providerId` or `client.specialistId` is null, resolving the default provider (`isDefault: true`) and default specialist, and populating `{PLACEHOLDER_SERVICIU_EXTERN_*}` and `{PLACEHOLDER_SPECIALIST_SSM}`.

Write your report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_2/handoff.md` and send a message back.
