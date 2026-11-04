# Task Assignment: Milestone 3 Worker 1 (25/25 Template Zero-Placeholder Implementation)

## 2026-11-01T23:59:00Z

### Objective
Implement authentic Romanian legal auto-completion profiles and generator fixes so that all 25 document templates (23 DOCX and 2 XLSX) generate cleanly with zero remaining placeholders (`{PLACEHOLDER_*}` or `PLACEHOLDER_*`) and 100% compliant Romanian legal data.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Mandatory References to Read First
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_explorer_1/handoff.md` and `analysis.md`
4. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_explorer_2/handoff.md` and `analysis.md`
5. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_explorer_3/handoff.md` and `analysis.md`

### Exclusive File Ownership
You have exclusive write ownership over:
- `src/lib/templates/definitions.ts`
- `src/lib/templates/resolver.ts`
- `src/lib/templates/generator.ts`
- `scripts/test-all-templates-generation.ts`

### Concrete Tasks
1. **`src/lib/templates/definitions.ts`**:
   - Remove the fake field `_Fără token-uri detectate._` from `hr-info-dosar` (`fields: []` since the template has 0 tokens on disk).
   - Ensure all 25 template definitions match physical templates.

2. **`src/lib/templates/generator.ts`**:
   - Fix Docxtemplater `.rels` hyperlink bypass: in `generateDocxDocument`, perform a zip pass replacing unresolved tokens (like `PLACEHOLDER_EMAIL_PRESTATOR` in `word/_rels/footer1.xml.rels`).
   - Fix Excel blanking logic in `generateXlsxDocument`:
     - Change `index >= Math.max(1, participants.length)` to `index >= participants.length`.
     - Return `""` on null/undefined participant values (`?? ''`) instead of falling back to the raw token string (`|| token`).
     - Delete `cell.w` when updating `cell.v = ''` so SheetJS clears cached formatted placeholder strings.
   - Update `collectUnresolvedPlaceholders` to inspect `.rels` files in addition to `.xml` files.

3. **`src/lib/templates/resolver.ts`**:
   - Incorporate the complete authentic Romanian legal fallback profiles formulated by Explorer 2 and Explorer 3:
     * `ROMANIAN_LEGAL_SSM_PROVIDER`: Authorized SEPP provider (EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L., cert. abilitare ITM nr. 4812/2021, CUI, RC, sediu, contact).
     * `ROMANIAN_LEGAL_DECIZII`: Decizii 01–09 & 11 preambles, sequential numbers, designated workers (lucrător desemnat, responsabil PSI, prim ajutor, comisie cercetare), permis de lucru cu foc.
     * `ROMANIAN_LEGAL_IPSSM`: IPSSM 01-10 universale, 11-13 specifice, OPIS centralizator.
     * `ROMANIAN_LEGAL_TRAINING`: Tematici introductiv generală 4h/8h and loc de muncă modules.
     * `ROMANIAN_LEGAL_HYGIENE`: Session dates, exam dates, avize MS/ME (MS nr. 1225/2023, ME nr. 8941/2023), DSP commission, candidates count, results.
     * `INCDPM_30_FACTORS`: All 30 risk factors with $G_i$, $F_i$, $r_i$, $N_{rg} = 2.62 \le 3.50$ matching `TESA.docx`, `EVALUAREA RISCURILOR.docx`, `Plan de Prevenire TESA.docx`, and `Zone pericol grav si iminent.docx`.
     * `ROMANIAN_LEGAL_HR_CIM`: CIM 2026 standard statutory clauses, health house, personal file opis.
   - Implement the interface contract `resolveTemplateData` specified in `PROJECT.md` line 149 returning `status: 'ready'` and `unresolvedPlaceholders: []` when all placeholders are resolved.
   - Keep `resolveTemplatePlaceholders` backward-compatible.
   - Ensure `PLACEHOLDER_REPREZENTANT_LEGAL` is ALWAYS the administrator (`client.legalRepresentative`), NEVER the employee.

4. **Verification**:
   - Run `npx tsx scripts/test-all-templates-generation.ts` -> Verify 25/25 templates generate in `approved_for_print` / `ready` status with 0 unresolved placeholders.
   - Run `npx tsc --noEmit` and `npm run build` -> Verify exit code 0.
   - Deliver `handoff.md` in `.agents/teamwork/m3_worker_1/handoff.md`.
