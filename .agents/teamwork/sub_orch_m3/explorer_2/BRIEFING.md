# BRIEFING — 2026-11-11T02:49:00Z

## Mission
Investigate resolver.ts and statutory document templates for training data synchronization, event mapping, hireDate fallback/substitution, and training expiration blocking (Features 14, 15, 18).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis, reporting
- Working directory: /Users/davidalexandru/Documents/Proiect_SSM
- State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_2
- Original parent: 161926c2-46f1-42fb-9699-f7abde151318
- Milestone: M3 (Training Module Synchronization & Statutory Docs)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze resolver.ts and document templates for training data
- Address Features 14, 15, 18 in SCOPE.md
- Produce structured handoff.md

## Current Parent
- Conversation ID: 161926c2-46f1-42fb-9699-f7abde151318
- Updated: not yet

## Investigation State
- **Explored paths**: `src/lib/templates/resolver.ts`, `src/lib/templates/definitions.ts`, `src/lib/templates/generator.ts`, `src/app/api/documents/generate-batch/route.ts`, `src/app/documents/generate/page.tsx`, `src/app/api/trainings/record/route.ts`, `src/components/training-planner-modal.tsx`, `scripts/create_m2_templates.ts`, `prisma/schema.prisma`.
- **Key findings**:
  1. `resolver.ts` hardcodes `hireDate` for `PLACEHOLDER_DATA_INSTRUIRE_IG`, `PLACEHOLDER_DATA_INSTRUIRE_LM`, etc., completely bypassing real `TrainingEvent` records (`INTRODUCTIV`, `LOC_MUNCA`).
  2. `resolver.ts` filters periodic SSM events with `!e.type || e.type === 'ssm'` and PSI with `e.type === 'psi' || e.type === 'su'`, which fails to match the actual enum values stored by `api/trainings/record` (`'PERIODIC_SSM'`, `'PERIODIC_PSI'`).
  3. `resolver.ts` pulls `client.trainingEvents` without scoping to the individual `employeeId`, which leaks client-wide sessions into individual sheets.
  4. Expiration check Catch-22: `generate-batch/route.ts` and `generate/page.tsx` hard-block document generation when SSM/PSI is `OVERDUE`, preventing employers from generating the training sheet required to conduct and record reinstatement training.
  5. `ssm-pv-instruire-colectiva` and `psi-pv-instruire` are missing from `definitions.ts`, missing from `templates_registry/normalized`, and unsupported in `TemplateResolutionContext`.
- **Unexplored areas**: None within the scope of this investigation.

## Key Decisions Made
- Analyzed all statutory training template mappings and drafted comprehensive, concrete recommendations for Worker implementation.

## Artifact Index
- DISPATCH.md — Incoming dispatch message
- BRIEFING.md — Working memory
- progress.md — Liveness heartbeat
- handoff.md — Comprehensive handoff report
