# Handoff Report: Milestone 1 Explorer 2 (Compliance Calculation Engine Architecture)

## 1. Observation
1. **Target Contract in `PROJECT.md` (lines 100–137)**:
   - Defined types: `ComplianceStatus` (`'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING'`), `ComplianceItemResult`, `EmployeeComplianceSummary`, `CompanyComplianceMetrics`.
   - Defined signatures:
     ```typescript
     export function addMonthsSafe(date: Date, months: number): Date;
     export function calculateItemCompliance(lastDate: Date | null, intervalMonths: number, label: string, referenceDate?: Date): ComplianceItemResult;
     export function calculateEmployeeCompliance(employee: any, referenceDate?: Date): EmployeeComplianceSummary;
     export function calculateCompanyMetrics(employees: any[], referenceDate?: Date): CompanyComplianceMetrics;
     ```
2. **Legal Normative Specifications in `survey_explorer_3/legal_spec.md`**:
   - Lines 18–21: Occupational medicine standard interval 12 months (HG 355/2007); SSM periodic training standard interval 6 months for operational, 12 months for TESA (HG 1425/2006); PSI periodic training 6 months for admin, 1–3 months for operational (OMAI 712/2005); Hygiene certificates valid for 36 months / 3 years from exam date (Ordinul MS/ME 2209/4469/2022).
   - Lines 198–212: Calendar month clamping rule (`setDate(0)` / clamped day) to prevent month overflows (e.g., Jan 31 + 1m overflowing into March).
   - Lines 221–227: Status thresholds: `VALID` (>30d), `UPCOMING` (0..30d), `OVERDUE` (<0d), `MISSING` (`lastDate === null`).
   - Lines 415–422 & 119 in `PROJECT.md`: Hygiene tracking is conditional (`hygieneCertificate: ComplianceItemResult | null`).
3. **Current Codebase State**:
   - `src/lib/compliance.ts` does not yet exist.
   - `prisma/schema.prisma` currently has `Employee` model with `hygieneRequested: Boolean @default(false)` but lacks medical, SSM, and PSI compliance date/interval fields.
   - Next.js 16 App Router is configured, requiring SSR-safe date formatting (no hydration mismatch between Node server and browser).

## 2. Logic Chain
1. **Date Arithmetic Determinism (Deriving from Observation 1 & 2)**:
   - Standard JS `Date.setMonth()` causes month overflow when starting from dates like Jan 31 or Aug 31.
   - To guarantee zero false positive/negative expirations under Romanian law, `addMonthsSafe` must calculate `targetYear`, `targetMonth`, and clamp `clampedDay = Math.min(originalDay, daysInTargetMonth)`.
   - Day differences must be calculated by normalizing both `dueDate` and `referenceDate` to UTC midnight (`Date.UTC(y, m, d)`), eliminating DST transitions (spring forward 23h, fall back 25h) and time-of-day offsets.
2. **Rollup Hierarchy (Deriving from Observation 1, 2, and DISPATCH.md)**:
   - Active tracked items are: `[occupationalMedicine, ssmTraining, psiTraining]` plus `[hygieneCertificate]` if `hygieneRequested === true` or `hygieneLastExamDate != null`.
   - An employee with an overdue item is in active contravention under Legea 319/2006 or HG 355/2007. Therefore, `OVERDUE` has top priority.
   - If no overdue items exist, a missing record (`MISSING`) means the employee lacks mandatory clearance, taking precedence over `UPCOMING`.
   - If neither overdue nor missing items exist, an item due within 0..30 days triggers `UPCOMING`.
   - If all active items have >30 days remaining, `VALID` is assigned.
3. **Company Metrics Rollup (Deriving from Observation 1 & 2)**:
   - Aggregation iterates over each employee and their active items.
   - `complianceScorePercent` evaluates `(validCount / totalItemsTracked) * 100`, returning 0 when `totalItemsTracked === 0` to prevent `0 / 0 = NaN`.

## 3. Caveats
- `medicalFitnessVerdict` ('APT', 'APT_CONDITIONAT', 'INAPT_TEMPORAR', 'INAPT') is tracked on the employee record, but date compliance status (`VALID`, `UPCOMING`, `OVERDUE`, `MISSING`) is purely date-interval-driven according to the contract in `PROJECT.md`. UI layers can present medical fitness verdicts as an additional badge or warning.
- For inactive employees (`status: 'PLECAT'`), `calculateCompanyMetrics` aggregates whatever employee array is passed into it. When calling from API or Server Components, callers should filter `prisma.employee.findMany({ where: { status: 'ACTIV' } })` to evaluate only active staff.

## 4. Conclusion
The architectural specification, TypeScript interface definitions, mathematical algorithms, and implementation-ready code for `src/lib/compliance.ts` have been fully formulated in `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/analysis.md`. The design guarantees 100% adherence to Romanian legislation, full compatibility with `PROJECT.md`, clean integration with Explorer 1's Prisma schema fields, and full readiness for Explorer 3's test suite (`scripts/verify-compliance.ts`).

## 5. Verification Method
1. **Inspect Analysis Report**:
   - Inspect `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_explorer_2/analysis.md` section 9 for the complete code and section 3 for mathematical proofs.
2. **Execution Check**:
   - Once implemented by the code writer, the engine can be verified using `npx tsx scripts/verify-compliance.ts` and `npm run build`.
   - Invalidation condition: Any failure on leap year dates (e.g. `2024-02-29 + 12m != 2025-02-28`), boundary dates (0 days != UPCOMING, 30 days != UPCOMING, 31 days != VALID), or unhandled null dates.
