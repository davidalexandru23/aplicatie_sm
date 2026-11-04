# DISPATCH: Milestone 1 Explorer 2 (Compliance Calculation Engine Architecture)

## Assignment
You are Explorer 2 for Milestone 1: Compliance Engine & Data Layer.
Your task is to recommend the concrete implementation strategy for `src/lib/compliance.ts`.

## Mandatory Reading
Read:
1. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md`
3. `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/legal_spec.md`

## Focus Areas
- Architecture and exported signatures of `src/lib/compliance.ts`.
- Safe month arithmetic (`addMonthsSafe` with month clamping for leap years e.g. Feb 28/29, 31-day months).
- Status classification: `OVERDUE` (<0d), `UPCOMING` (0..30d), `VALID` (>30d), `MISSING` (null/unrecorded).
- Comprehensive employee compliance evaluation (`calculateEmployeeCompliance`) covering:
  1. Occupational Medicine (Medicină a Muncii HG 355/2007)
  2. Periodic SSM Training (Legea 319/2006, HG 1425/2006)
  3. Periodic PSI/SU Training (Legea 307/2006, OMAI 712/2005)
  4. Hygiene Courses (Cursuri de Igienă - Ordinul 2209/4469/2022, 36 months validity, only when requested/applicable)
- Overall status rollup logic (if any item is OVERDUE -> OVERDUE; else if any UPCOMING -> UPCOMING; etc.).
- Company-wide aggregated metrics (`calculateCompanyMetrics`).

## Output Requirements
Write your recommendations to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/analysis.md`
And summarize in:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/handoff.md`

Keep `progress.md` updated. Send message when complete.

## 2026-11-01T21:00:54Z
You are Explorer 2 for Milestone 1 in .agents/teamwork/m1_explorer_2/.
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/DISPATCH.md, /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md, /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md, and /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/legal_spec.md.
Formulate the exact architecture, types, and logic for src/lib/compliance.ts.
Write analysis.md and handoff.md in /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/.
Keep progress.md updated. Send message when complete.
