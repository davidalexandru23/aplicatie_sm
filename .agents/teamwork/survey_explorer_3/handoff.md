# Handoff Report — Legal Compliance Surveyor (Explorer 3)

## 1. Observation

1. **Schema Deficiencies in Employee Tracking**:
   - In `/Users/davidalexandru/Documents/Proiect_SSM/prisma/schema.prisma` (lines 82–130), the `Employee` model contains:
     ```prisma
     model Employee {
       id              String   @id @default(uuid())
       clientId        String
       firstName       String
       lastName        String
       cnp             String
       // ...
       startDateOnJob  DateTime?
       hireDate        DateTime?
       status          String   @default("ACTIV")
       leaveDate       DateTime?
       hygieneRequested Boolean  @default(false)
       hygieneModule   String?
     ```
     There are **no fields** for storing the last examination date, periodic interval, or calculated expiration dates for:
     - Occupational Medicine (`Medicina Muncii` - HG 355/2007)
     - Periodic SSM Training (`Instruire SSM` - Legea 319/2006, HG 1425/2006)
     - Periodic Fire Safety / Emergency Situations Training (`Instruire PSI/SU` - Legea 307/2006, OMAI 712/2005)
     - Hygiene Certificate Expiration (`Cursuri de Igienă` - Ordinul 2209/4469/2022)

2. **Absence of Compliance Deadlines in UI**:
   - In `/Users/davidalexandru/Documents/Proiect_SSM/src/app/employees/page.tsx` (lines 53–65), the table headers only display:
     `Salariat`, `Firmă Angajatoare`, `CNP (GDPR Mascat)`, `Funcție / Post`, `Punct de Lucru`, `Data Angajării`, `Status`, `Documente`.
     No status badges, warning indicators, or days-remaining columns exist.
   - In `/Users/davidalexandru/Documents/Proiect_SSM/src/app/page.tsx` (lines 74–116), metric cards track only counts of clients, active employees, templates, and generated documents. No compliance scores or overdue alert widgets exist.

3. **Template Placeholders & Romanian Legal Conventions**:
   - In `/Users/davidalexandru/Documents/Proiect_SSM/handoff/ssm-template-placeholder-pack/INVENTAR_PLACEHOLDERE.md`:
     - Lines 29–31: `DECIZII.docx` contains internal decision tokens (`PLACEHOLDER_NUMAR_DECIZIE_01` through `11`, `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`, `PLACEHOLDER_RESPONSABIL_PSI`, `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`).
     - Lines 53–58: `IP 01-10 UNIVERSALE.docx` and `OPIS IPSSM.docx` reflect the structure required by HG 1425/2006 art. 15.
     - Lines 44–46 & 74–80: `EVALUAREA RISCURILOR.docx` and `TESA.docx` use INCDPM method tokens: `{PLACEHOLDER_G01}`–`{PLACEHOLDER_G30}` (gravitate), `{PLACEHOLDER_F01}`–`{PLACEHOLDER_F30}` (frecvență), `{PLACEHOLDER_N01}`–`{PLACEHOLDER_N30}` (nivel parțial), `PLACEHOLDER_NIVEL_RISC_GLOBAL`.
     - Lines 20–22: `Anexe Curs igiena.xlsx` contains registers, exam PVs, and certificates with series and numbers.

4. **Romanian Legislation Specifics**:
   - **HG 355/2007 (Medicina Muncii)**: Default 12 months for general/TESA employees; 6 months or specific intervals for night shifts, hazardous chemicals, working at heights, mass handling. Verdicts: `APT`, `APT CONDIȚIONAT`, `INAPT TEMPORAR`, `INAPT`.
   - **Legea 319/2006 & HG 1425/2006 (SSM Training)**: General introductory training $\ge 8$ hours; on-the-job training $\ge 8$ hours; periodic training $\ge 1$ hour. Periodic interval: maximum 12 months for TESA; maximum 6 months for operative/manual workers (customary 1 or 3 months by internal decision for high-risk positions).
   - **Legea 307/2006 & OMAI 712/2005 (PSI/SU Training)**: Operative/emergency intervention teams: 1 month; technical/machinery: 1–3 months; administrative/TESA: up to 6 months.
   - **Ordinul MS/ME nr. 2209/4469/2022 (Cursuri de Igienă)**: Replaced and abrogated Ordinul 1225/5031/2003. Certificate validity is strictly **3 years (36 months)** from exam date. Applicable to food production/service, hospital/school/hotel cleaning, personal beauty/barber/tattoos, drinking water, and DDD services.

---

## 2. Logic Chain

1. **Premise**: Requirement R2 of the original user request states:
   *„Implement full tracking and clear visibility over employee compliance scadențe and expiration dates, specifically occupational health checkups (medicină a muncii), periodic SSM and PSI/SU training intervals, and hygiene certificate validity periods. Surfaced deadlines must be visible both in the backend data calculations and through clear status badges and alerts in the Next.js user interface.”*
2. **From Observation 1**: The current Prisma schema lacks compliance date fields and intervals on the `Employee` model. Downstream implementers must add fields for `medicalLastExamDate`, `ssmLastTrainingDate`, `psiLastTrainingDate`, and `hygieneLastExamDate` with their corresponding interval months.
3. **From Observation 4**: In Romanian law, compliance periods are not arbitrary:
   - Medicina muncii is 12 months for office/general, but 6 months for special risks (HG 355/2007 Anexa 1).
   - SSM training interval is bounded by HG 1425/2006 art. 96 (max 12 months for TESA, max 6 months for workers).
   - PSI training interval is bounded by OMAI 712/2005 art. 26 (1 month for emergency response, 1-3 months for tech/machinery, 6 months for TESA).
   - Hygiene certificate validity is strictly 36 months (Ordinul 2209/4469/2022 art. 20).
4. **Mathematical Formulation**:
   - `dueDate = addMonthsSafe(lastDate, intervalMonths)` with end-of-month clamping (e.g. 31 Jan + 1 month = 28/29 Feb).
   - `daysRemaining = floor((dueDate - currentDate) / (1000 * 60 * 60 * 24))`.
   - Status mapping:
     - `daysRemaining < 0` $\rightarrow$ **OVERDUE** (Red badge)
     - `0 <= daysRemaining <= 30` $\rightarrow$ **UPCOMING** (Amber badge)
     - `daysRemaining > 30` $\rightarrow$ **VALID** (Emerald badge)
     - `lastDate === null` $\rightarrow$ **MISSING** (Rose alert)
5. **From Observation 2**: To satisfy the UI requirement of R2, `src/app/employees/page.tsx` must render badges for each of the 4 compliance areas, and `src/app/page.tsx` must show alert cards for overdue deadlines and expiring items.
6. **From Observation 3**: Document auto-completion (R1) for `DECIZII.docx`, `IPSSM`, and `EVALUAREA RISCURILOR.docx` must conform to Romanian standards: sequential decision numbering, complete legal preambles, INCDPM risk formulas ($N_{rg} = \frac{\sum r_i^2}{\sum r_i} \le 3.50$), and structured OPIS indices.

---

## 3. Caveats

1. **Electronic Signatures Excluded**: Per user requirement R3 (*„keeping the workflow simple without user roles or electronic signatures”*), document generation produces printable paper drafts. Consemnarea oficială a instruirii rămâne olografă pe suport de hârtie; atașarea scanului semnat reprezintă dovada conformității.
2. **Individual Risk Variance**: HG 355/2007 Anexa 1 allows the occupational health physician to prescribe intervals shorter than 12 months (e.g., 3 or 6 months) for employees with conditional fitness (`APT CONDIȚIONAT`). The system must allow overriding default intervals per employee.
3. **Hygiene Exemption**: Under Ordinul 2209/4469/2022 art. 18, medical/pharmacy graduates or vocational school graduates with hygiene curricula are exempt for 3 years from graduation. The system should allow marking `isExempt: true` with an exemption reason.

---

## 4. Conclusion

1. **Comprehensive Legal Specification Completed**: Full legal and technical specifications have been compiled in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/legal_spec.md`.
2. **Exact Mathematical and State Machine Logic Defined**:
   - Safe month arithmetic algorithm designed to eliminate leap-year and end-of-month bugs.
   - Status thresholds defined: `OVERDUE` ($<0$ days), `UPCOMING` ($0 \dots 30$ days), `VALID` ($>30$ days), `MISSING` (unrecorded).
   - Company aggregate metrics formulated: Total Mandatory, Total Valid, Total Upcoming, Total Overdue, Compliance Score (%), and Legal Risk Index.
3. **Romanian Document Conventions Detailed**:
   - Internal decisions (Deciziile 01–09) with statutory legal preambles (Legea 319/2006, HG 1425/2006, Legea 307/2006, OMAI 712/2005).
   - IPSSM 7-part operational structure and OPIS centralizer index.
   - INCDPM risk assessment method: 4 work system components, 7 gravity classes, 6 frequency classes, and global risk formula $N_{rg} = \frac{\sum r_i^2}{\sum r_i} \le 3.50$.
4. **Actionable Implementation Guidance Provided**:
   - Proposed Prisma schema additions for `Employee`.
   - Ready-to-use TypeScript computation engine (`computeComplianceItem`, `addMonthsSafe`).
   - Tailwind badge classes and UI component layouts for Next.js views.

---

## 5. Verification Method

To verify the accuracy of the findings and the mathematical logic:

1. **Inspect Documentation Artifacts**:
   - Read `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_explorer_3/legal_spec.md` and check:
     * Section 2: HG 355/2007 examination types and Anexa 1 intervals.
     * Section 3: Legea 319/2006, HG 1425/2006 art. 74-100, and OMAI 712/2005 art. 26.
     * Section 4: Ordinul 2209/4469/2022 art. 20 (3-year hygiene validity).
     * Section 5: Safe month addition algorithm and status thresholds.
     * Section 6: Decizii 01-09, IPSSM structure, and INCDPM formula $N_{rg}$.
2. **Verify Legal Citations**:
   - Confirm HG 355/2007 art. 21 (periodic interval max 12 months).
   - Confirm HG 1425/2006 art. 96 alin. 2 (periodic training max 6 months general, max 12 months TESA).
   - Confirm OMAI 712/2005 art. 26 (emergency 1 month, technical 1-3 months, TESA up to 6 months).
   - Confirm Ordinul 2209/4469/2022 art. 20 alin. 1 (validity 3 years).
3. **Invalidation Conditions**:
   - If any legal norm states that periodic hygiene certificates are valid for 1 or 5 years instead of 3 years under Romanian law, this conclusion is invalidated.
   - If HG 1425/2006 allows periodic SSM training for operative workers to exceed 6 months without special dispensation, this conclusion is invalidated.
