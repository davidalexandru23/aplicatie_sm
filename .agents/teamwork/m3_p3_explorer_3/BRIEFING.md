# BRIEFING — 2026-11-05T01:45:00Z

## Mission
Investigate F14 (Connecting Job operational context) and F15 (Dynamic correlation of Prevention Plan measures with CAEN risk profile) in Proiect_SSM.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigation, synthesis
- Working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_p3_explorer_3
- Original parent: d4389872-2ec2-44c4-b4b6-52d9b0f4a82d
- Milestone: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigate Job operational attributes plumbing into resolver tokens
- Investigate CAEN risk presets correlation with Prevention Plan measures
- Output structured 5-component handoff report

## Current Parent
- Conversation ID: d4389872-2ec2-44c4-b4b6-52d9b0f4a82d
- Updated: 2026-11-05T01:45:00Z

## Investigation State
- **Explored paths**:
  - `prisma/schema.prisma` Job model (`title`, `corCode`, `mainActivities`, `equipmentUsed`, `workConditions`, `workersCount`)
  - `src/lib/risk/caen-risk-presets.ts` (`getRiskProfileForCaen`, `isAdministrativeJobTitle`, 7 risk profiles: 6201, 5610, 4120, 4711, 4941, 7022, 8621)
  - `src/lib/templates/resolver.ts` (`resolveTemplateData`, `resolveTemplatePlaceholders`, `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`, `ALL_ROMANIAN_LEGAL_FALLBACKS`)
  - `src/lib/templates/definitions.ts` (catalog of 31 templates, fields, collections)
  - `templates_registry/normalized/` (`Plan de Prevenire TESA.docx`, `Detaliu Tematica loc de munca.docx`, `Tematica loc de munca.docx`, `Anexa fisa postului SSM.docx`, `med-fisa-identificare-riscuri.docx`)
  - Scripts: `patch_m1_templates.py`, `create_m2_templates.ts`, `adversarial-caen-stress.ts`, `test-adversarial-provider-tokens.ts`, `test-all-templates-generation.ts`
- **Key findings**:
  - **F14 Gap**: `prisma/schema.prisma` has `Job` attributes (`mainActivities`, `equipmentUsed`, `workConditions`, `corCode`), and `resolveTemplatePlaceholders` correctly resolves `selectedJob` via `ctx.jobId` or employee's `currentJob`. BUT `resolveTemplateData` only maps `job?.title` and `job?.corCode`, completely omitting `job.mainActivities`, `job.equipmentUsed`, and `job.workConditions` from `verifiedMap`. `{PLACEHOLDER_ACTIVITATI_POST}` doesn't exist in `resolver.ts` or `definitions.ts`, and `{PLACEHOLDER_DESCRIERE_ACTIVITATE}`, `{PLACEHOLDER_ECHIPAMENTE_POST}`, `{PLACEHOLDER_CONDITII_POST}` only exist as static fallbacks.
  - **F15 Gap**: `src/lib/risk/caen-risk-presets.ts` defines 7 complete industry risk profiles with 13-17 factors each, and each factor contains specific prevention measures (`preventionMeasures: string[]`). However, `Plan de Prevenire TESA.docx` (`risk-plan-prevenire-tesa`) currently contains 19 hardcoded static office paragraphs that never change regardless of `client.caenCode` (e.g. CAEN 5610 Restaurant or CAEN 4120 Construction still get office measures).
  - **Plumbing Solution**:
    - For F14: Add `PLACEHOLDER_ACTIVITATI_POST` to legal fallbacks; map `PLACEHOLDER_ACTIVITATI_POST`, `PLACEHOLDER_DESCRIERE_ACTIVITATE`, `PLACEHOLDER_ECHIPAMENTE_POST`, `PLACEHOLDER_CONDITII_POST`, and `PLACEHOLDER_COD_COR` in `verifiedMap` using `job` fields with statutory fallbacks; register fields in `definitions.ts`.
    - For F15: Construct `planPrevenire` / `masuriPrevenire` array in `resolver.ts` categorized into technical, organizational, hygiene-sanitary, and other measures; update `definitions.ts` with the collection; update `Plan de Prevenire TESA.docx` with a dynamic docxtemplater table loop `{#planPrevenire}...{/planPrevenire}` while preserving provider and client header/footer tokens.
- **Unexplored areas**: None within the scope of F14 and F15.

## Key Decisions Made
- Analyzed exact token mappings and identified all missing bindings in `resolver.ts` and `definitions.ts`.
- Outlined precise measure categorization algorithm (technical, organizational, hygiene) for CAEN prevention plan.
- Designed docxtemplater loop table structure matching `ssm-fisa-instruire-individuala.docx` precedent.

## Artifact Index
- DISPATCH.md — Task assignment
- progress.md — Liveness heartbeat
- BRIEFING.md — Situational awareness
- handoff.md — Complete 5-component investigation report
