# BRIEFING — 2026-11-03T17:26:00Z

## Mission
Investigate R2 (SSM External Service Provider Profile) and its end-to-end integration across Prisma, Settings UI/API, Client Forms UI/API, and template resolver.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, analysis, synthesis
- Working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r3_explorer_2
- Original parent: 52a3ebb3-f7ef-4302-a871-b663bbb8cd88
- Milestone: survey_r2_provider_profile

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect Prisma schema, Settings, Client forms, API endpoints, and template resolver for R2 requirements.

## Current Parent
- Conversation ID: 52a3ebb3-f7ef-4302-a871-b663bbb8cd88
- Updated: not yet

## Investigation State
- **Explored paths**: `prisma/schema.prisma`, `prisma/seed.ts`, `src/app/layout.tsx`, `src/app/clients/page.tsx`, `src/app/clients/[id]/page.tsx`, `src/components/client-intake-modal.tsx`, `src/components/client-edit-modal.tsx`, `src/app/api/clients/route.ts`, `src/app/api/clients/[id]/route.ts`, `src/lib/templates/resolver.ts`, `src/lib/templates/definitions.ts`, `src/lib/templates/generator.ts`, `handoff/ssm-template-placeholder-pack/INVENTAR_PLACEHOLDERE.md`.
- **Key findings**:
  1. `Provider` and `Specialist` models do not exist; `Client` stores only 3 flat strings (`ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`).
  2. No `/settings` page or `/api/settings` routes exist; navigation lacks a Settings link.
  3. Client creation/editing modals use free-text inputs without provider/specialist dropdowns.
  4. Template resolver only binds 5 provider tokens from `Client`; all detailed tokens (CUI, RegCom, address breakdown, ITM cert/date, contacts) default to static fallback constants.
  5. `PLACEHOLDER_ADRESA_PRESTATOR` is required by `EVALUAREA RISCURILOR.docx` but missing in resolver and definitions.
- **Unexplored areas**: None within the R2 scope.

## Key Decisions Made
- Produced a complete architectural blueprint for `Provider` and `Specialist` Prisma models, CRUD API routes, Settings UI, Client modal dropdowns, and template resolver bindings.
- Detailed migration and backward compatibility strategy to preserve existing client data and prevent breakage.

## Artifact Index
- handoff.md — Comprehensive findings and actionable recommendations for R2
