## 2026-11-10T21:58:21Z

You are the Worker subagent for Milestone 1 (M1): Template Resolver & Generator Data Integrity.

Working directory: /Users/davidalexandru/Documents/Proiect_SSM
Your state folder: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/worker_m1_1
Request file: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md
Scope document: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m1/SCOPE.md
Project document: /Users/davidalexandru/Documents/Proiect_SSM/PROJECT.md
Explorer handoff reports to consult:
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m1_1/handoff.md (Features 1 & 2)
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m1_2/handoff.md (Features 3 & 5)
- /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_m1_3/handoff.md (Features 4 & 6)

MANDATORY FIRST STEP:
Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before doing any other work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own exclusively:
- `src/lib/templates/resolver.ts`
- `src/lib/templates/generator.ts`
- `src/lib/templates/definitions.ts`
- `src/app/documents/generate/page.tsx`
- `src/app/api/documents/generate/route.ts`
- `src/app/api/templates/[code]/fields/route.ts`
DO NOT modify files outside this ownership without approval.

YOUR IMPLEMENTATION TASKS:

Task 1: Feature 1 (Eliminate all 8 mock blocks & fake fallbacks in `src/lib/templates/resolver.ts`):
- Clean `ROMANIAN_LEGAL_SSM_PROVIDER`: empty strings for company name, CUI, registration, address, specialist, evaluator.
- Clean `ROMANIAN_LEGAL_DECIZII`: empty strings for decision numbers, dates, appointees (specialist, first aid, PSI, investigation members), fire permit, analysis bulletin.
- Clean `ROMANIAN_LEGAL_TRAINING_SHEETS`: empty strings for verifiers, instructors, mock employee addresses, qualifications, travel routes.
- Clean `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`: empty strings for clinic, doctor, phone, email, registration number, and generic TESA descriptions.
- Clean `ROMANIAN_LEGAL_EIP`: empty strings for mock employee `Stan Alexandru`, mock sizes `42`, `M / 48`, `9 (L)`, and clear the 10 static equipment rows with fake dates/signatures.
- Clean `ROMANIAN_LEGAL_HR_CIM`: empty strings for fake dates `'15.01.2026'`, fake address `'Str. Victoriei nr. 10'`, postal code `'010001'`.
- Clean `ROMANIAN_LEGAL_HYGIENE` & hygiene fallback roster: clear mock authorisations, dates, and eliminate fallback roster (lines 1883-1907) that creates fake `Stan Alexandru` with grade 10 and cert 0042.
- Clean `verifiedMap` mocks:
  - `legalRepresentativeName`: `client?.legalRepresentative || ''` (eliminate `'Munteanu Cristian'`).
  - Company: `client?.name || ''`, `client?.cui || ''`, `client?.regCom || ''`, `client?.address || ''`, `client?.contactPhone || ''`, `client?.contactEmail || ''`, `foundedYear || ''`, `numarLucratori || ''` (eliminate `'S.C. CLIENT TEST S.R.L.'`, `'RO12345678'`, etc.).
  - Decision dates: empty if not in DB.
  - Employee: if `employee` is null, resolve all employee placeholders to `""` (eliminate lines 1601-1636 creating fake `Stan Alexandru`).
  - Employee partial: if employee exists, missing DB fields (`birthDate`, `birthPlace`, `birthCounty`, `identityDocument`, `residenceAddress`, sizes `shoeSize`/`clothingSize`/`gloveSize`, `bloodType`, `commuteRoute`, `commuteDuration`, `cimNumber`, `grossSalary`, `workNorm`, `probationDays`, `annualLeaveDays`) must resolve to empty strings `""` or null (eliminate `'RX'`, `'123456'`, `'15.03.1988'`, `'42'`, `'L'`, `'9'`, `'0I (Rh +)'`, etc.).

Task 2: Feature 2 (Authentic `isAutocompleted` Provenance Tracking in `src/lib/templates/resolver.ts`):
- In `resolveTemplateData`, track authentic DB provenance via `autocompletedKeys = new Set<string>()`.
- A key is added to `autocompletedKeys` ONLY when the value originates from an authentic database entity (e.g. `client`, `employee`, `identityDocument`, `residenceAddress`, `ssmProvider`, `job`, `worksite`) AND is non-empty.
- Pass `autocompletedKeys` in `TemplateResolutionResult`.
- In `resolveTemplatePlaceholders` (lines 2097-2113), set `isAutocompleted = autocompletedSet.has(def.key) && hasValue`.
- Missing DB fields must have `isAutocompleted: false` and `value: ''` (or custom override if provided), so that they are routed to `manualFields` in UI.

Task 3: Feature 3 (Fix `approved_for_print` in `src/lib/templates/generator.ts`):
- Implement `isBlankOrPlaceholderMarker(val: unknown): boolean` detecting whitespace, dots (`"........ / ............"`, `"........................ lei"`, etc.), missing markers (`"[LIPSĂ DATE]"`, `"N/A"`, `"UNDEFINED"`, `"NULL"`), and raw placeholder tokens (`"PLACEHOLDER_"`).
- In `validateMissingFields`, use `isBlankOrPlaceholderMarker(val)` to detect missing required fields.
- Define `STATUTORY_MANDATORY_FIELDS` in `generator.ts` enforcing core legal fields (CIM number, gross salary, CNP, employee name, company name, CUI, legal rep, COR code) on employment/statutory templates (`hr-cim-model-cadru-2022`, `hr-cim-2026`, `hr-anexa-fisa-post`, `ssm-fisa-instruire-individuala`, `psi-fisa-instructaj-individuala`).
- Prioritize canonical catalog definitions (`catalogDef?.fields || manifest.fields || []`) over stale DB manifests.
- In `src/lib/templates/definitions.ts`: ensure `required: true` for `PLACEHOLDER_NUMAR_CIM` on `hr-cim-model-cadru-2022`, `hr-cim-2026`, and `hr-anexa-fisa-post`.
- Documents with missing statutory required fields must receive `status: 'missing_data'`, NEVER `approved_for_print`.

Task 4: Feature 4 (Un-truncate UI Manual Fields in `src/app/documents/generate/page.tsx`):
- Remove `.slice(0, 20)` at line 1222 so all manual fields are accessible.
- Wrap the grid in an internal scrollable container (`max-h-[460px] overflow-y-auto pr-1`).
- Add inline search/filter when `manualFields.length > 8`.
- Display full label in `title={`${field.label} (${field.key})`}`.
- Add statutory required indicator (`field.required && <span className="text-rose-500 font-bold ml-1">*</span>`).

Task 5: Feature 5 (XML Special Character Escaping in `src/lib/templates/generator.ts`):
- Implement `escapeXml(unsafe: unknown): string` replacing `&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`, `"` -> `&quot;`, `'` -> `&apos;`.
- In lines 345-373 of `generator.ts` (inside `renderTemplateBuffer`), apply `escapeXml` to `strVal` for all replacements in `.xml` and `.rels` files.

Task 6: Feature 6 (Eliminate Context Fallbacks & Add Worksite Support):
- In `src/lib/templates/resolver.ts`:
  - Add `worksiteId?: string` to `TemplateResolutionContext` and `TemplateResolutionOptions`.
  - In `resolveTemplatePlaceholders` (lines 2043-2060):
    - `employee`: strictly `ctx.employeeId ? ... : null` (ELIMINATE `client.employees[0]`).
    - `selectedJob`: `ctx.jobId ? client.jobs.find(j => j.id === ctx.jobId) : (employee?.currentJob || null)` (ELIMINATE `client.jobs[0]`).
    - `selectedWorksite`: `ctx.worksiteId ? client.worksites.find(w => w.id === ctx.worksiteId) : (employee?.currentWorksite || null)` (ELIMINATE `client.worksites[0]`).
  - In `resolveTemplateData` (lines 1060-1061): eliminate fallback on `client.jobs[0]` and `client.worksites[0]`.
  - Update token bindings for worksite (lines 1713-1720) so missing worksite falls back cleanly to client address / "Sediu social", not "Sediul Central".
- In `src/app/api/templates/[code]/fields/route.ts`: extract `worksiteId` from `searchParams` and forward to `resolveTemplatePlaceholders`.
- In `src/app/api/documents/generate/route.ts`: extract `worksiteId` from request `body` and forward to `resolveTemplatePlaceholders`.
- In `src/app/documents/generate/page.tsx`:
  - Eliminate forced auto-select of `data.jobs[0].id` (lines 313-317); allow empty selection `""`.
  - Add `worksites` state and `selectedWorksiteId`.
  - Load worksites from `/api/clients/${selectedClientId}`.
  - Add Punct de Lucru (Worksite) dropdown selector.
  - Forward `worksiteId` in `/api/templates/[code]/fields` and `/api/documents/generate`.

VERIFICATION COMMANDS (You must run and verify all of them):
1. `npx prisma validate`
2. `npm run build`
3. `npx tsx scripts/test-all-templates-generation.ts`
4. Verify XML escaping by generating a document with `&` in client name.
5. Verify `approved_for_print` gating by checking that missing CIM/salary produces `missing_data`.

OUTPUT:
Write your complete report to:
`/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/worker_m1_1/handoff.md`
Include:
- Files modified with summary of changes
- Exact commands executed and their full outputs
- Verification evidence confirming mock elimination, authentic isAutocompleted, XML escaping, and approved_for_print gating.
Then send a completion message to the caller (`sub_orch_m1`).


## 2026-11-10T22:13:47Z
**Context**: Milestone 1 Implementation
**Content**: Heartbeat and status check on Milestone 1 tasks (Features 1-6). Please report your current progress, files touched so far, and any blockers.
**Action**: Update progress.md with your latest timestamp and reply with current status.


## 2026-11-10T22:28:01Z
**Context**: Milestone 1 Implementation
**Content**: Heartbeat check. How are tasks 1, 2, 6 in resolver.ts and the UI/API tasks progressing? Any issues encountered?
**Action**: Please provide a quick status update and update your progress.md timestamp.
