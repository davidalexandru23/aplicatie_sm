# Task Assignment: Milestone 3 Reviewer 2 (Legal Fidelity & Interface Reviewer)

## 2026-11-02T00:15:00Z

### Mission
Review Milestone 3 implementation for statutory legal fidelity, INCDPM risk calculation accuracy, and interface contract conformance.

### Mandatory References to Read
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_worker_1/handoff.md`
4. Code files:
   - `src/lib/templates/resolver.ts`
   - `src/lib/templates/definitions.ts`

### Review Checks to Perform
1. Verify Romanian statutory profiles in `src/lib/templates/resolver.ts`:
   - `ROMANIAN_LEGAL_SSM_PROVIDER`: Authorized SEPP provider with ITM certificate, CUI, RC, specialist.
   - `ROMANIAN_LEGAL_DECIZII`: Deciziile 01–09 & 11, sequential numbering, designated persons.
   - `INCDPM_30_FACTORS`: 30 factors matching `TESA.docx`, $N_{rg} = \frac{178}{68} = 2.62 \le 3.50$.
   - `ROMANIAN_LEGAL_HYGIENE`: Session dates, avize MS/ME, DSP commission.
   - `ROMANIAN_LEGAL_HR_CIM`: Standard 2026 clauses.
2. Verify strict statutory separation:
   - `PLACEHOLDER_REPREZENTANT_LEGAL` must strictly be the employer/administrator (`client.legalRepresentative`), NEVER the employee.
3. Verify interface contract:
   - `resolveTemplateData` adherence to `PROJECT.md` specification line 149 (`status: 'ready'`, `unresolvedPlaceholders: []`).
   - Backward compatibility of `resolveTemplatePlaceholders`.

### Deliverables
Write `handoff.md` in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_reviewer_2/handoff.md` with your explicit verdict: `APPROVE` or `REQUEST_CHANGES`. Message the orchestrator with your verdict.
