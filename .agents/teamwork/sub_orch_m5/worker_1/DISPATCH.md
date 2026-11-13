## 2026-11-11T07:59:18Z

You are teamwork_worker for Milestone 5 (Features 24, 25, 26, 27, 28, 29, 30, 31).
Working directory: /Users/davidalexandru/Documents/Proiect_SSM
State folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/worker_1
Original request: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/SCOPE.md
Project plan: /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md

Explorer Reports:
- Explorer 1 (Features 24, 25, 26): /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/explorer_1/handoff.md
- Explorer 2 (Features 27, 28, 29): /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/explorer_2/handoff.md
- Explorer 3 (Features 30, 31): /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/explorer_3/handoff.md

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md, SCOPE.md, PROJECT.md, and the three explorer handoff reports.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write ownership of:
- `prisma/schema.prisma`
- `src/app/documents/generate/page.tsx`
- `src/lib/packages/bulk-packages.ts`
- `src/app/api/documents/generate-batch/route.ts`
- `src/lib/compliance.ts`
- `src/app/api/hygiene/sessions/route.ts`
- `src/app/api/hygiene/sessions/[id]/participants/[participantId]/route.ts`
- `src/app/hygiene/` (pages and components)
- `src/lib/importer.ts`
- `src/app/api/imports/commit/route.ts`
- `scripts/verify-excel-import-export.ts` (test assertion update for null exam dates)

IMPLEMENTATION TASKS (Features 24–31):

1. Feature 24: Worksite & Job Selector
   - In `src/app/documents/generate/page.tsx`:
     - Hide Worksite selector when `isHygieneTemplate` is true (`!isHygieneTemplate`).
     - Reset `selectedWorksiteId` to `''` when switching to a hygiene template or switching to an employee with no worksite (`setSelectedWorksiteId(worksiteId || '')`).
   - In `src/lib/packages/bulk-packages.ts`:
     - Remove residual silent fallbacks on `client.jobs[0]` and `client.worksites[0]` (lines 121, 122, 217, 218, 308, 309, 372, 373). Use options/explicit job or null.

2. Feature 25: Dynamic Filtering of IPSSM/Topics based on CAEN and Job Risk Flags
   - In `src/lib/packages/bulk-packages.ts`:
     - Implement helper `resolveApplicableIpssms(caenCode, jobs, targetJob)` based on CAEN and risk flags (`isDrivingRequired`, `isFoodHandling`, `isScreenWork`, `workPosture`, `heightWork`).
     - In `generateCompanyDossierZip` and `generateInspectionArchiveZip`, dynamically build the list of IPSSMs based on applicable hazards rather than bundling all 5 unconditionally. Ensure Nexus Solutions (CAEN 6201 + driving tech) keeps the full set to keep tests green, while companies without driving omit vehicle IPSSM.

3. Feature 26: Per-Employee Error Handling & ZIP Logging in Batch Generation
   - In `src/app/api/documents/generate-batch/route.ts`:
     - Preserve HTTP 400 rejection if ALL requested employees are ineligible (for backwards-compatibility with existing tests).
     - For batches with at least one eligible employee, isolate each employee in a `try/catch` block so one failure does not abort the entire batch.
     - Generate structured log file `00_RAPORT_GENERARE_LOT.txt` inside the returned ZIP archive containing execution metadata, client name, success/failure counts, and nominal line-by-line status for each employee.

4. Feature 27: Association of HygieneSession with Client
   - In `prisma/schema.prisma`:
     - Add `clientId String?` to `HygieneSession` with `@relation(fields: [clientId], references: [id], onDelete: SetNull)`.
     - Add `hygieneSessions HygieneSession[]` to `Client`.
     - Run `npx prisma db push` and `npx prisma generate`.
   - In `src/app/api/hygiene/sessions/route.ts`:
     - Support `clientId` query parameter in `GET` to filter sessions by company.
     - Persist `clientId` in `POST` when creating new sessions.
   - In `src/app/hygiene/`:
     - Add company selection dropdown in session creation/filtering UI and replace heuristic `resolveSessionClientId` with direct `session.clientId`.

5. Feature 28: Edit Hygiene Participants & Certificate Emission
   - Create route `src/app/api/hygiene/sessions/[id]/participants/[participantId]/route.ts`:
     - Support `PATCH` for attendance (`prezent` | `absent`), `examGrade` (number 1-10), `examResult` (`admis` | `respins`), `certificateSeries`, `certificateNumber`, `certificateDate`.
     - If the participant is an admitted employee (`examResult === 'admis'`), synchronize certificate data with employee records where applicable.
   - In `src/app/hygiene/`:
     - Add UI modal/form (`EditParticipantModal`) to update participant attendance, grade, result, and certificate series/number.

6. Feature 29: Hygiene Statutory Compliance on CAEN & Job Flags
   - In `src/lib/compliance.ts`:
     - Compute hygiene compliance for companies with CAEN `5610` or jobs with `job.isFoodHandling === true`.
     - Statutory validity: 36 months (3 years) per Ordinul MS/ME 2209/4469/2022.
     - Non-food workers / companies are not penalized (`hygieneCertificate: null`).

7. Feature 30: Eliminate hireDate Fallback in Excel Import
   - In `src/lib/importer.ts` (lines 891–893 in `commitImport`):
     - Replace `medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate` with `?? null`.
     - Replace `ssmLastTrainingDate: emp.ssmLastTrainingDate || emp.hireDate` with `?? null`.
     - Replace `psiLastTrainingDate: emp.psiLastTrainingDate || emp.hireDate` with `?? null`.
   - In `scripts/verify-excel-import-export.ts`:
     - Update lines 299-307 so the test asserts `medicalLastExamDate` is null when missing from Excel, keeping tests passing.

8. Feature 31: Server-Side Re-validation & Diff Persistence in ImportBatch
   - In `src/lib/importer.ts`:
     - Export `revalidateParsedWorkbook(parsedData: ParsedWorkbook)` validating CNP checksums, mandatory fields, intra-batch duplicates, etc.
   - In `src/app/api/imports/commit/route.ts`:
     - Strictly re-validate parsed workbook data on the server before committing.
     - Persist `JSON.stringify(validationReport)` and `JSON.stringify(diffData)` directly on `ImportBatch` in PostgreSQL.

VERIFICATION REQUIRED BEFORE HANDOFF:
- Run `npx prisma validate`
- Run `npm run build` (must pass with 0 TypeScript/Next.js build errors)
- Run `npm test` (must pass 100%)
- Document all modified files, commands run, and verification outputs in your `handoff.md`.

OUTPUT:
Write your handoff report to `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/worker_1/handoff.md`.
Notify caller via `send_message`.
