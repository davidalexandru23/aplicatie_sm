# DISPATCH: Legal Compliance Surveyor

## Assignment
You are Explorer 3 (Legal Compliance Surveyor) for the Romanian SSM, HR, and Hygiene Document & Compliance System.
Your task is to analyze Romanian legal frameworks and compliance practices for employee compliance deadline tracking and document accuracy.

## Mandatory Reading
Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md` before starting.

## Scope of Investigation
1. Occupational Medicine (Medicina Muncii - HG 355/2007):
   - Legal validity period of the medical examination (Fișa de aptitudine): default 12 months for general employees, 6 months for special categories/risks (night work, hazardous chemicals, etc.).
   - Examination types: angajare (on hire), periodic, reluarea muncii (return to work), adaptare.
   - Required status tracking: expiration date, days remaining, status (Valid, Upcoming/Expiring soon within 30 days, Expired/Overdue).
2. SSM and PSI/SU Periodic Training (Legea 319/2006, HG 1425/2006, Legea 307/2006):
   - Training types: introductiv-generală, la locul de muncă, periodică.
   - Periodic intervals set by employer depending on risks (common standards: 1, 3, 6, 12 months; typical office is 6 or 12 months, high risk/technical 1 or 3 months).
   - Training logbook (Fișa individuală de instruire SSM/SU) records, testare periodică, and deadline calculation logic.
3. Hygiene Courses (Cursuri de Igienă - Ordinul 1225/5031/2003, Ordinul 2209/4462/2024):
   - Validity period: 3 years.
   - Applicable sectors: food production/service, cleaning services, personal care/cosmetics, water distribution.
   - Certificate tracking requirements.
4. Mathematical & Logical Rules for Deadline Calculation:
   - Inputs: `lastDate`, `intervalMonths` (or fixed validity), reference `currentDate`.
   - Outputs: `dueDate`, `daysRemaining`, `status` ('VALID', 'UPCOMING', 'OVERDUE').
   - Alert thresholds: e.g., OVERDUE if < 0 days, UPCOMING if 0 <= days <= 30, VALID if > 30 days.
   - Aggregated compliance metrics: Company compliance score / percentage, total upcoming, total overdue.
5. Romanian Document Conventions:
   - Decizii interne (număr decizie, data deciziei, temei legal).
   - Instrucțiuni Proprii de Securitate a Muncii (IPSSM) conventions.
   - Evaluare Riscuri (metoda INCDPM, factori de risc, nivel de risc global).

## Output Requirements
Write your legal analysis and calculation specification to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/legal_spec.md`
And summarize in:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/handoff.md`

Maintain `progress.md` with timestamps in your working directory.
When finished, send a message to orchestrator with your summary and file paths.


## 2026-11-01T20:48:39Z
You are Explorer 3 (Legal Compliance Surveyor) in .agents/teamwork/survey_explorer_3/.
Read your dispatch instructions in /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/DISPATCH.md and the original user request at /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md.
Investigate Romanian legislation and operational standards for SSM, PSI/SU, Medicina Muncii (HG 355/2007), and Cursuri de Igienă (Ordinul 1225/5031/2003, 2209/2024). Detail exact expiration logic, interval calculation, status thresholds (VALID, UPCOMING, OVERDUE), and document conventions for Decizii, IPSSM, and Evaluare Riscuri.
Write legal_spec.md and handoff.md in your working directory /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/.
Keep progress.md updated. When done, send a message to orchestrator with your findings.
