# BRIEFING — 2026-11-02T22:46:00Z

## Mission
Investigate and design a robust fix for `isAdministrativeJobTitle` naive substring matching ('it', 'hr') in `src/lib/risk/caen-risk-presets.ts`.

## 🔒 My Identity
- Archetype: teamwork_explorer
- Roles: investigation, synthesis
- Working directory: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_it2_explorer_1
- Original parent: e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb
- Milestone: m1_r2_it2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in source code
- Target file: src/lib/risk/caen-risk-presets.ts
- Address Defect 1 identified by Challenger 1 regarding isAdministrativeJobTitle naive substring matching ('it', 'hr')
- Ensure words like `muncitor`, `tencuitor`, `instalator`, `ospatar`, `bucatar`, `sofer`, `manipulant` are NEVER matched as administrative
- Recommend exact, robust fix with regex word boundary and test against standard Romanian COR titles

## Current Parent
- Conversation ID: e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/lib/risk/caen-risk-presets.ts:1590-1635` (`isAdministrativeJobTitle`, `getRiskProfileForCaen`)
  - `scripts/adversarial-caen-stress.ts` (Suite 3 & 4 failure reproduction)
  - `prisma/seed.ts` (job title catalog)
  - Romanian COR catalog across major groups 1, 2, 3, 4, 5, 7, 8, 9
  - JavaScript RegExp boundary mechanics with Romanian diacritics and NFD decomposition
- **Key findings**:
  - Substring `clean.includes('it')` matches any word containing `it` (e.g. Romanian agent suffix `-itor` in `muncitor`, `tencuitor`, `vopsitor`, `distribuitor`, Latin roots in `sanitar`, `depozitar`, `securitate`, `calitate`).
  - Standard JavaScript `\b(it|hr)\b` without diacritic stripping falsely matches words like `hrănitor` (because `ă` is a non-word char in ASCII regex) and `sfârșit`.
  - Normalizing with `normalize('NFD').replace(/[\u0300-\u036f]/g, '')` cleanly decomposes Romanian characters (both standard comma and legacy cedilla) into ASCII, rendering `\b` 100% reliable.
  - A two-tier defense (Tier 1: Operational exclusion guard, Tier 2: Word-bounded administrative regex) achieves 100% accuracy on Romanian COR benchmarks and eliminates all 19 failures in `adversarial-caen-stress.ts`.
- **Unexplored areas**: None for Defect 1.

## Key Decisions Made
- Recommend a Dual-Tier Guard architecture:
  1. Input normalization: NFD diacritic stripping + lowercase + trim.
  2. Operational exclusion guard (`OPERATIONAL_REGEX`): returns `false` if title contains operational keywords (`muncitor`, `tencuitor`, `instalator`, `ospatar`, `bucatar`, `sofer`, `manipulant`, etc.).
  3. Administrative regex (`ADMINISTRATIVE_REGEX`): returns `true` for bounded keywords/acronyms (`\b(it|hr)\b`, `resurse umane`, `director`, `contabil`, etc.).
  4. Default fallback: returns `false` (precautionary SSM principle).

## Artifact Index
- DISPATCH.md — Initial task dispatch
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Comprehensive 5-component investigation and recommendation report
