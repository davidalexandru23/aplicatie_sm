# Handoff Report: Milestone 5 Focus Area 1 (Features 24, 25, 26)

## 1. Observation

### Baseline System State
- Command `npm test` executed cleanly: 416/416 tests passing across all 5 verification suites (31/31 templates, 45/45 compliance tests, 6/6 Excel tests, 333/333 opaque-box E2E tests, Next.js Turbopack build 0 errors).

---

### Feature 24: Worksite & Job Selector
1. **Resolver Implementation (`src/lib/templates/resolver.ts`)**:
   - Lines 1071-1072:
     ```typescript
     const job = context.job || (context.jobId && client?.jobs ? client.jobs.find((j: any) => j.id === context.jobId) : null) || employee?.currentJob || null;
     const worksite = context.worksite || (context.worksiteId && client?.worksites ? client.worksites.find((w: any) => w.id === context.worksiteId) : null) || employee?.currentWorksite || null;
     ```
   - Lines 2789-2823 (`resolveTemplatePlaceholders`):
     - Fallbacks on `client.employees[0]`, `client.jobs[0]`, and `client.worksites[0]` have been removed.
     - `selectedJob` strictly respects `ctx.jobId`, `employee?.currentJob`, or `null`.
     - `selectedWorksite` strictly respects `ctx.worksiteId`, `employee?.currentWorksite`, or `null`.
   - Placeholders populated by `worksite` (lines 2409-2416):
     - `PLACEHOLDER_ADRESA_PUNCT_LUCRU`: `worksite?.address || client?.address || ''`
     - `PLACEHOLDER_PUNCT_LUCRU`: `worksite?.name || (client?.address ? 'Sediu social' : '')`
     - `PLACEHOLDER_DEPARTAMENT`: `worksite?.activity || ''`
     - `PLACEHOLDER_SUBUNITATE`: `worksite?.name || (client?.address ? 'Sediu social' : '')`
     - `PLACEHOLDER_SECTIE_COMPARTIMENT`: `worksite?.activity || ''`
     - `PLACEHOLDER_LOC_MUNCA`: `worksite?.address || client?.address || ''`

2. **API Endpoint Plumbing**:
   - `src/app/api/documents/generate/route.ts`:
     - Line 13-14: Destructures `jobId` and `worksiteId` from request body.
     - Lines 40-41: Passes `jobId` and `worksiteId` into `resolveTemplatePlaceholders`.
     - Lines 53-54: Passes `jobId` and `worksiteId` into `generateDocument`.
   - `src/app/api/templates/[code]/fields/route.ts`:
     - Lines 13-14: Extracts `jobId` and `worksiteId` from URL search parameters.
     - Lines 29-30: Passes `jobId` and `worksiteId` into `resolveTemplatePlaceholders`.

3. **UI Implementation (`src/app/documents/generate/page.tsx`)**:
   - State variables:
     - Line 283: `const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);`
     - Line 284: `const [selectedWorksiteId, setSelectedWorksiteId] = useState<string>(initialWorksiteId);`
   - Job selector JSX (lines 1092-1110):
     ```tsx
     {isJobContext && selectedClientId && jobs.length > 0 && (
       <div className="pt-2 border-t border-slate-100">
         <label className="block text-xs font-semibold text-slate-700 mb-1">
           Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
         </label>
         <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} ...>
     ```
     Predicate `isJobContext` (lines 349-357):
     ```typescript
     const isJobContext =
       !isEmployeeRequired &&
       !isHygieneTemplate &&
       Boolean(
         currentTemplate?.contextLevel === 'job' ||
         currentTemplate?.family === 'risk' ||
         currentTemplate?.code?.includes('loc-munca') ||
         currentTemplate?.fields?.some((f) => f?.source?.startsWith('job.'))
       );
     ```
   - Worksite selector JSX (lines 1113-1131):
     ```tsx
     {selectedClientId && worksites.length > 0 && (
       <div className="pt-2 border-t border-slate-100">
         <label className="block text-xs font-semibold text-slate-700 mb-1">
           Punct de Lucru (opțional - dacă este diferit de sediul social)
         </label>
         <select value={selectedWorksiteId} onChange={(e) => setSelectedWorksiteId(e.target.value)} ...>
     ```
   - **UI Deficiencies Observed**:
     - *Worksite selector condition*: Rendered unconditionally whenever `selectedClientId && worksites.length > 0`. Even when `isHygieneTemplate` is true, the worksite dropdown is displayed, which is irrelevant for hygiene courses and examinations.
     - *Worksite state reset on employee switch* (lines 396-407):
       ```typescript
       const worksiteId = (emp as any)?.currentWorksiteId || (emp?.currentWorksite as any)?.id || '';
       if (worksiteId) setSelectedWorksiteId(worksiteId);
       ```
       If the selected employee has *no* assigned worksite (`worksiteId === ''`), `setSelectedWorksiteId` is not called, leaving the previous employee's worksite selected.
     - *Worksite state reset on template switch* (lines 410-418):
       `selectedWorksiteId` is never reset when switching between templates or switching to hygiene mode.

4. **Residual Fallbacks in `src/lib/packages/bulk-packages.ts`**:
   - Line 121: `const job = employee.currentJob || client.jobs[0] || null;`
   - Line 122: `const worksite = employee.currentWorksite || client.worksites[0] || null;`
   - Line 217: `job: client.jobs[0] || null,`
   - Line 218: `worksite: client.worksites[0] || null,`
   - Line 308: `job: client.jobs[0] || null,`
   - Line 309: `worksite: client.worksites[0] || null,`
   - Line 372: `job: emp.currentJob || client.jobs[0] || null,`
   - Line 373: `worksite: emp.currentWorksite || client.worksites[0] || null,`
   These lines still contain silent fallback on index `[0]`.

---

### Feature 25: Dynamic Filtering of IPSSM/Topics based on CAEN and Job Risk Flags
1. **Catalog of IPSSM Templates (`src/lib/templates/definitions.ts`)**:
   - `ipssm-universale`: "IPSSM 01-10 Generale / Universale" (`IP 01-10 UNIVERSALE.docx`) - general statutory framework (Legea 319/2006, HG 1425/2006).
   - `ipssm-opis`: "OPIS Instrucțiuni Proprii SSM" (`OPIS IPSSM.docx`) - index of applicable instructions.
   - `ipssm-birou`: "IPSSM 13 - Activități de birou și ergonomie" (`13 - ACTIVITATI DE BIROU.docx`) - screen work, ergonomics, VDUs.
   - `ipssm-autovehicule`: "IPSSM 12 - Autovehicule și transport" (`12 - AUTOVEHICULE.docx`) - road traffic, driving in line of duty.
   - `ipssm-alunecari`: "IPSSM 11 - Alunecări și împiedicări" (`11 - ALUNECARI.docx`) - floor hazards, slipping, physical movement.
   - `ipssm-tesa`: "Fișă de Evaluare a Factorilor de Risc - Post TESA" (`TESA.docx`) - TESA office risk profile.

2. **Current Hardcoded Bundling in `src/lib/packages/bulk-packages.ts`**:
   - In `generateCompanyDossierZip` (lines 222-239):
     All 6 IPSSM items (`ipssm-birou`, `ipssm-alunecari`, `ipssm-autovehicule`, `ipssm-tesa`, `ipssm-universale`, `ipssm-opis`) are hardcoded unconditionally in `companyManifest`.
   - In `generateInspectionArchiveZip` (lines 350-355):
     Folder `03_TEMATICI_SI_INSTRUCTIUNI_PROPRII` bundles all 5 IPSSMs unconditionally.
   - In `generateEmployeeOnboardingZip` (lines 134-146):
     Only HR forms and individual training sheets are bundled; no job-specific IPSSMs are bundled for the employee.

3. **Job Risk Profile Model (`prisma/schema.prisma` lines 171-181)**:
   - `isFoodHandling`: Boolean @default(false)
   - `isScreenWork`: Boolean @default(false)
   - `isDrivingRequired`: Boolean @default(false)
   - `workPosture`: String? ("standing", "sitting", "mixed")
   - `maxWeightKg`: Float?
   - `noiseExposed`: Boolean @default(false)
   - `chemicalExposed`: Boolean @default(false)
   - `vibrationExposed`: Boolean @default(false)
   - `heightWork`: Boolean @default(false)

---

### Feature 26: Per-Employee Error Handling & ZIP Logging in Batch Generation
1. **Current Batch Route (`src/app/api/documents/generate-batch/route.ts`)**:
   - Strict termination rejection (lines 170-183):
     If any employee in `employeeIds` has `status === 'PLECAT'`, the route aborts with HTTP 400.
   - Strict compliance rejection (lines 186-210):
     ```typescript
     for (const emp of employees) {
       const comp = calculateEmployeeCompliance(emp);
       const expiryCheck = checkEmployeeTemplateExpiry(templateCode, comp, emp);
       if (expiryCheck.isExpired) {
         rejectedEmployees.push({ name: `${emp.lastName} ${emp.firstName}`, reason: expiryCheck.reason || 'Termen legal expirat' });
       }
     }
     if (rejectedEmployees.length > 0) {
       return NextResponse.json({ error: `Generarea a fost blocată conform legii...`, rejectedEmployees }, { status: 400 });
     }
     ```
     If even 1 employee out of 50 has an expired training or medical interval, all 50 fail with HTTP 400.
   - Loop without per-employee `try/catch` (lines 226-261):
     If `resolveTemplatePlaceholders` or `generateDocument` throws for employee #5, the entire loop crashes to line 284, returning HTTP 500. No ZIP is generated.
   - No log file in ZIP archive:
     Only DOCX files (`${empSafeName} - ${tplSafeName}${ext}`) are placed into the ZIP. `00_RAPORT_GENERARE_LOT.txt` is missing.

2. **Existing Batch Test Contract (`scripts/test-batch-generation-compliance.ts`)**:
   - Lines 56-72 verify that if a request contains *only* an expired employee (`employeeIds: [stan.id]`), it returns HTTP 400.
   - Lines 76-94 verify that if a request contains valid employees (`employeeIds: [vasile.id, gheorghe.id]`), it returns HTTP 200 with ZIP.
   - Line 111 checks: `if (fileNames.length !== 2) throw new Error(...)`.
     *CRITICAL NOTE*: Adding `00_RAPORT_GENERARE_LOT.txt` to the ZIP will increase file count by 1 (to 3). We must check if `scripts/test-batch-generation-compliance.ts` is in active use or if it filters out `.txt` files.

---

## 2. Logic Chain

### For Feature 24 (Worksite & Job Selector):
1. **Observation**: In `resolver.ts:2814-2823`, `ctx.jobId` and `ctx.worksiteId` are respected, and index fallback `[0]` was eliminated.
2. **Observation**: In `generate/page.tsx:1113`, the worksite selector has condition `{selectedClientId && worksites.length > 0 && (` with no `!isHygieneTemplate` guard.
3. **Logic**: A hygiene course or certificate is organized by the training provider for client employees; a client worksite dropdown on a hygiene template is confusing and cluttering.
4. **Observation**: In `generate/page.tsx:401`, `if (worksiteId) setSelectedWorksiteId(worksiteId);` does not clear `selectedWorksiteId` when switching to an employee without a worksite.
5. **Logic**: State leakage occurs between employee selections. Setting `setSelectedWorksiteId(worksiteId || '')` ensures clean state synchronisation.
6. **Observation**: In `bulk-packages.ts:121, 122, 217, 218, 308, 309, 372, 373`, `client.jobs[0]` and `client.worksites[0]` remain.
7. **Logic**: If an employee has no assigned job or worksite, resolving against an arbitrary first job (e.g. assigning a cook's job to an accountant) produces statutory document corruptions. Explicit fallback to `null` or explicit job is required.

### For Feature 25 (Dynamic Filtering of IPSSM/Topics based on CAEN and Job Risk Flags):
1. **Observation**: `bulk-packages.ts` includes `ipssm-autovehicule` for all companies, even those with zero vehicles, zero drivers, and CAEN 6201 (IT) or CAEN 5610 (Restaurant).
2. **Logic**: Statutory OSH rules (Legea 319/2006, art. 13 lit. e) mandate employer instructions specific to the actual hazards of the workplace. Bundling vehicle traffic instructions for a pure desk-bound software team or kitchen staff is legally defective.
3. **Observation**: Company CAEN code and job flags (`isDrivingRequired`, `isFoodHandling`, `isScreenWork`, `workPosture`, `maxWeightKg`, `heightWork`, `chemicalExposed`) provide exact indicators:
   - Driving hazards: `job.isDrivingRequired === true` or CAEN in transport (4941, 4932, 5320).
   - Display screen & sedentary: `job.isScreenWork === true` or `job.workPosture === 'sitting'` or CAEN in IT / consulting / admin (6201, 7022, 6920).
   - Food & slipping hazards: `job.isFoodHandling === true` or CAEN in Horeca (5610) / food retail (4711).
   - General slip hazards: Common in physical workspaces, construction (4120), warehousing (5210).
   - Universal IPSSMs: `ipssm-universale` and `ipssm-opis` apply to all companies and employees.
4. **Logic**: In `generateCompanyDossierZip` and `generateInspectionArchiveZip`, the manifest should evaluate the union of the company CAEN and all active jobs in the company. In `generateEmployeeOnboardingZip`, only the IPSSMs relevant to the onboarding employee's specific job should be included.

### For Feature 26 (Per-Employee Error Handling & ZIP Logging in Batch Generation):
1. **Observation**: In `src/app/api/documents/generate-batch/route.ts`, pre-loop checks fail the whole batch with HTTP 400 if any employee is `PLECAT` or overdue, and the inner generation loop has no `try/catch`.
2. **Logic**: In operational SSM practice, batch generation is used for departments of dozens or hundreds of employees. If 49 employees are compliant and 1 has an overdue medical exam, rejecting the entire batch prevents issuing statutory documents to the 49 compliant workers.
3. **Observation**: Scope requirement specifies: "Isolate errors per employee inside a `try/catch` block. Add a structured log file `00_RAPORT_GENERARE_LOT.txt` inside the returned ZIP archive listing all processed employees, successes, and individual errors without failing the entire batch (no blind HTTP 400 when one employee has missing optional data)."
4. **Logic**:
   - If *all* requested employees are ineligible (e.g., all 1 requested employee is overdue or PLECAT), returning HTTP 400 preserves backwards compatibility with existing test assertions (`scripts/test-batch-generation-compliance.ts:67`).
   - If there is at least one eligible employee, isolate each employee in a `try/catch` block during generation.
   - Generate `00_RAPORT_GENERARE_LOT.txt` with execution summary, success/failure counts, and nominal line-by-line employee reports, and include it at the root of the ZIP.
   - Return HTTP 200 with the ZIP archive and JSON response reporting successes and failures.

---

## 3. Caveats
1. **Test Assertion on ZIP File Count in `scripts/test-batch-generation-compliance.ts`**:
   Line 111 of `scripts/test-batch-generation-compliance.ts` contains:
   `if (fileNames.length !== 2) throw new Error(...)`.
   If `00_RAPORT_GENERARE_LOT.txt` is added to the ZIP, `fileNames.length` will be 3. The test does not run as part of `npm test` (it is an ad-hoc test), but any test that asserts `fileNames.length === employeeCount` must be updated or filter for `.docx`/`.xlsx` files.
2. **Onboarding ZIP File Count in `scripts/test-bulk-packages.ts`**:
   `scripts/test-bulk-packages.ts:56` asserts `assert.strictEqual(filesOnboarding.length, 11)`.
   If IPSSMs are added to the onboarding manifest, this assertion would fail if the test expects exactly 11 files.
   *Resolution*: For `generateEmployeeOnboardingZip`, keep the core 11 statutory forms and conditionally add IPSSMs only if an option `includeJobIpssm?: boolean` is passed or if specifically configured, or update `test-bulk-packages.ts` if onboarding is expanded.
3. **Company Dossier File Count in `scripts/test-bulk-packages.ts`**:
   `scripts/test-bulk-packages.ts:84` asserts `assert.strictEqual(filesDossier.length, 16)`.
   For client `RO38765432` (Nexus Solutions), the company has an IT technician with `isDrivingRequired: true` and software engineers with `isScreenWork: true`, so all 16 documents are legitimately required. Dynamic filtering preserves 16 documents for Nexus Solutions, keeping `test-bulk-packages.ts` green.

---

## 4. Conclusion & Proposed Implementation Blueprint

### Blueprint 1: Worksite & Job Selector (`src/app/documents/generate/page.tsx`)
1. Guard worksite dropdown with `!isHygieneTemplate`:
   ```tsx
   {selectedClientId && worksites.length > 0 && !isHygieneTemplate && (
   ```
2. Reset `selectedWorksiteId` cleanly:
   - When switching to a hygiene template in `useEffect` (line 410):
     ```typescript
     if (isHygieneTemplate) {
       setSelectedJobId('');
       setSelectedWorksiteId('');
     }
     ```
   - When switching employee in `useEffect` (lines 396-407):
     ```typescript
     const worksiteId = (emp as any)?.currentWorksiteId || (emp?.currentWorksite as any)?.id || '';
     setSelectedWorksiteId(worksiteId || '');
     ```
3. Remove residual fallbacks in `src/lib/packages/bulk-packages.ts`:
   - Replace `client.jobs[0] || null` with `options.jobId ? (client.jobs.find(j => j.id === options.jobId) || null) : null`.
   - Replace `client.worksites[0] || null` with `options.worksiteId ? (client.worksites.find(w => w.id === options.worksiteId) || null) : null`.

### Blueprint 2: Dynamic IPSSM Filtering (`src/lib/packages/bulk-packages.ts`)
1. Create a helper function `resolveApplicableIpssms(client: Client & { jobs: Job[] }, specificJob?: Job | null)`:
   ```typescript
   export function resolveApplicableIpssms(
     caenCode: string | null | undefined,
     jobs: Array<{
       isDrivingRequired?: boolean;
       isFoodHandling?: boolean;
       isScreenWork?: boolean;
       workPosture?: string | null;
       heightWork?: boolean;
       title?: string;
     }>,
     targetJob?: {
       isDrivingRequired?: boolean;
       isFoodHandling?: boolean;
       isScreenWork?: boolean;
       workPosture?: string | null;
       heightWork?: boolean;
       title?: string;
     } | null
   ): string[] {
     const caen = caenCode ? String(caenCode).trim() : '6201';
     const relevantJobs = targetJob ? [targetJob] : jobs;

     const hasDriving = relevantJobs.some((j) => j.isDrivingRequired) || ['4941', '4932', '5320'].includes(caen);
     const hasScreenWork = relevantJobs.some((j) => j.isScreenWork || j.workPosture === 'sitting') || ['6201', '6202', '7022', '6920'].includes(caen);
     const hasFoodOrSlip = relevantJobs.some((j) => j.isFoodHandling || j.heightWork || j.workPosture === 'standing' || j.workPosture === 'mixed') || ['5610', '4711', '4120'].includes(caen);
     const hasTesa = relevantJobs.some((j) => isAdministrativeJobTitle(j.title)) || ['6201', '7022', '6920'].includes(caen);

     const items: string[] = ['ipssm-universale']; // Foundation IP 01-10 always included
     if (hasScreenWork) items.push('ipssm-birou');
     if (hasFoodOrSlip) items.push('ipssm-alunecari');
     if (hasDriving) items.push('ipssm-autovehicule');
     if (hasTesa) items.push('ipssm-tesa');
     items.push('ipssm-opis'); // Always index after IPSSMs

     return items;
   }
   ```
2. In `generateCompanyDossierZip`:
   Build `companyManifest` dynamically:
   - Core organizational & risk templates: `decizii-angajator`, `risk-evaluare`, `risk-plan-prevenire-tesa`, `risk-plan-actiune-urgenta`, `risk-zone-pericol`.
   - Core training templates: `training-tematica-introductiv`, `training-tematica-loc-munca`, `training-detaliu-introductiv`, `training-detaliu-loc-munca`.
   - Dynamically filtered IPSSMs via `resolveApplicableIpssms(client.caenCode, client.jobs)`.
   - Core HR informare: `hr-info-dosar`.
3. In `generateInspectionArchiveZip`:
   In Folder `03_TEMATICI_SI_INSTRUCTIUNI_PROPRII`, dynamically populate the IPSSMs based on `resolveApplicableIpssms`.

### Blueprint 3: Per-Employee Isolation & Log File in Batch Generation (`src/app/api/documents/generate-batch/route.ts`)
1. Separate input employees into:
   - `terminatedEmployees`: `status === 'PLECAT'`
   - `overdueEmployees`: `checkEmployeeTemplateExpiry().isExpired === true`
   - `eligibleEmployees`: Active and compliant employees
2. Backwards-compatible Guard:
   - If `eligibleEmployees.length === 0`:
     Return HTTP 400 with the exact rejection error message expected by tests (`scripts/test-batch-generation-compliance.ts`).
3. For `eligibleEmployees`, iterate in a `try/catch` block:
   ```typescript
   for (const emp of eligibleEmployees) {
     try {
       const { resolvedData } = await resolveTemplatePlaceholders({
         templateCode,
         clientId,
         employeeId: emp.id,
         jobId: emp.currentJobId || undefined,
         customOverrides: customFields && typeof customFields === 'object' ? customFields : {},
       });
       const genResult = await generateDocument({
         templateCode,
         clientId,
         employeeId: emp.id,
         jobId: emp.currentJobId || undefined,
         data: resolvedData,
         operatorName,
       });
       const fileBuffer = fs.readFileSync(genResult.filePath);
       const ext = path.extname(genResult.filePath) || `.${templateDef.format}`;
       const empSafeName = sanitizeFileName(`${emp.lastName}_${emp.firstName}`);
       const tplSafeName = sanitizeFileName(templateDef.name);
       const zipEntryName = `${empSafeName} - ${tplSafeName}${ext}`;
       zip.file(zipEntryName, fileBuffer);
       generatedDocuments.push({ ... });
       logEntries.push({ status: 'SUCCES', emp, fileName: zipEntryName, sizeBytes: genResult.fileSizeBytes });
     } catch (empErr: any) {
       console.error(`Error generating document for employee ${emp.id}:`, empErr);
       failedDocuments.push({
         employeeId: emp.id,
         employeeName: `${emp.lastName} ${emp.firstName}`,
         jobTitle: emp.currentJob?.title || 'Salariat',
         error: empErr instanceof Error ? empErr.message : String(empErr),
       });
       logEntries.push({ status: 'EROARE', emp, error: empErr instanceof Error ? empErr.message : String(empErr) });
     }
   }
   ```
4. Build `00_RAPORT_GENERARE_LOT.txt` content:
   ```
   ================================================================================
   RAPORT GENERARE COLECTIVĂ DOCUMENTE STATUTARE SSM / HR
   ================================================================================
   Data generării         : [Formatted Romanian timestamp]
   Companie / Angajator   : [client.name] (CUI: [client.cui])
   Șablon statutar        : [templateDef.name] ([templateDef.code])
   Operator SSM           : [operatorName]
   --------------------------------------------------------------------------------
   Total salariați ceruți : [totalRequested]
   Generări reușite       : [generatedDocuments.length]
   Generări eșuate/omise  : [totalFailed]
   Rată de succes         : [successPercent]%
   ================================================================================
   DETALII SALARIAȚI:
   --------------------------------------------------------------------------------
   ... nominal entries for each employee with status [SUCCES], [EROARE], [OMIS - EXPIRAT], [OMIS - PLECAT] ...
   ================================================================================
   Document emis automat conform Legii 319/2006 și HG 1425/2006.
   ================================================================================
   ```
   Inject into ZIP:
   `zip.file('00_RAPORT_GENERARE_LOT.txt', reportText);`

---

## 5. Verification Method

1. **Static Analysis & Build Verification**:
   ```bash
   npm run build
   npx prisma validate
   ```
   Verifies that Next.js routes and Prisma schema compile with zero TypeScript or packaging errors.

2. **Unified Verification Suite**:
   ```bash
   npm test
   ```
   Must pass 100% (all 5 suites: 31 templates, 45 compliance tests, 6 Excel tests, 333 E2E tests, build).

3. **Batch Generation Endpoint Verification**:
   - Send `POST /api/documents/generate-batch` with a single expired employee -> Assert response is HTTP 400 with the overdue notice.
   - Send `POST /api/documents/generate-batch` with 1 expired employee + 2 valid employees -> Assert response is HTTP 200, ZIP contains `00_RAPORT_GENERARE_LOT.txt` and the 2 valid DOCX files.
   - Inspect `00_RAPORT_GENERARE_LOT.txt` to verify header, counts (Total: 3, Reușite: 2, Eșuate/Omise: 1), and nominal status lines.

4. **Bulk Packages Dynamic Filtering Verification**:
   - Call `generateCompanyDossierZip` for NEXUS SOLUTIONS S.R.L. (CAEN 6201 with driving technician) -> Assert all applicable IPSSMs (`ipssm-birou`, `ipssm-autovehicule`, `ipssm-tesa`, `ipssm-alunecari`, `ipssm-universale`, `ipssm-opis`) are generated.
   - Call `generateCompanyDossierZip` for BISTRO GOURMET S.R.L. (CAEN 5610, restaurant) -> Assert `ipssm-autovehicule` is NOT generated, while `ipssm-alunecari` and `ipssm-universale` ARE generated.

5. **UI Worksite & Job Context Verification**:
   - In `/documents/generate`, select a hygiene template -> Verify neither the Job selector nor the Worksite selector is visible, and `selectedJobId`/`selectedWorksiteId` are empty.
   - Select an employee with a worksite -> Verify worksite is bound; switch to an employee without a worksite -> Verify worksite resets to empty ("Sediu social (implicit)").
