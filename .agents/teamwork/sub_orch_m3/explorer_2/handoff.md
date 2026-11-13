# Handoff Report: Training Module Synchronization & Statutory Docs (`resolver.ts` & Document Templates)

**Milestone**: M3 — Training Module Synchronization & Statutory Docs  
**Investigator**: explorer_2  
**Target File**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_2/handoff.md`  

---

## 1. Observation

### Obs 1: Training Event Resolution & Type Mismatch in `src/lib/templates/resolver.ts`
- **Location**: `src/lib/templates/resolver.ts:1313–1396` and `src/lib/templates/resolver.ts:2356–2361`
- **Code Quoted**:
  ```typescript
  // src/lib/templates/resolver.ts:1314–1316
  const ssmEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => !e.type || e.type === 'ssm'
  );
  const TARGET_SSM_ROWS = 16;
  const totalSsmRows = Math.max(TARGET_SSM_ROWS, ssmEvents.length);
  const instruiriPeriodiceSSM = [];
  for (let i = 0; i < totalSsmRows; i++) {
    const ev = ssmEvents[i];
    if (ev) {
      instruiriPeriodiceSSM.push({
        nr: i + 1,
        data: formatDateRo(ev.eventDate),
        durata: `${ev.durationHours || 2} ore`,
        ocupatia: ev.jobTitle || job?.title || 'Personal TESA',
        tematica: ev.materialOrTopic || 'Instruire periodică SSM conform tematicii anuale',
        semnaturaInstruit: '',
        semnaturaInstructor: ev.instructorName || designatedWorker,
        semnaturaVerificator: ev.verifierName || legalRepresentativeName,
      });
  ```
  ```typescript
  // src/lib/templates/resolver.ts:1367–1369
  const psiEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => e.type === 'psi' || e.type === 'su'
  );
  ```
  ```typescript
  // src/lib/templates/resolver.ts:2356–2361
  const client = await prisma.client.findUnique({
    where: { id: ctx.clientId },
    include: {
      jobs: true,
      worksites: true,
      trainingEvents: true,
  ```
- **Finding**:
  1. `api/trainings/record/route.ts:27` persists `type` values as: `'INTRODUCTIV' | 'LOC_MUNCA' | 'PERIODIC_SSM' | 'PERIODIC_PSI'`.
  2. `resolver.ts:1315` filters SSM by `!e.type || e.type === 'ssm'`. Real events with `type === 'PERIODIC_SSM'` are rejected by this filter.
  3. `resolver.ts:1368` filters PSI by `e.type === 'psi' || e.type === 'su'`. Real events with `type === 'PERIODIC_PSI'` are rejected by this filter.
  4. `client.trainingEvents` is taken globally for the client. The resolver does not verify if the specific `employee` participated in the event (`participants.some(p => p.employeeId === employee.id)`). This leaks events between different employees.
  5. The query in `resolveTemplatePlaceholders` (`resolver.ts:2361`) loads `trainingEvents: true` without `include: { participants: true }`, making participant-level verification impossible at that stage.

---

### Obs 2: Hard Substitution of `hireDate` for Introductiv and Loc de Muncă
- **Location**: `src/lib/templates/resolver.ts:1631–1636` and `src/lib/templates/resolver.ts:2101–2113`
- **Code Quoted**:
  ```typescript
  // src/lib/templates/resolver.ts:1631–1636
  markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_IG', employee.hireDate);
  markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_LM', employee.hireDate);
  markAutocompleted('PLACEHOLDER_DATA_ADMITERE', employee.hireDate);
  markAutocompleted('PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI', employee.hireDate);
  markAutocompleted('PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI', employee.hireDate);
  markAutocompleted('PLACEHOLDER_DATA_ADMITERE_PSI', employee.hireDate);
  ```
  ```typescript
  // src/lib/templates/resolver.ts:2101–2113
  PLACEHOLDER_DATA_INSTRUIRE_IG: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
  PLACEHOLDER_DATA_INSTRUIRE_LM: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
  PLACEHOLDER_DATA_ADMITERE: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
  PLACEHOLDER_ADMITERE_NUME: legalRepresentativeName,

  PLACEHOLDER_INSTRUCTOR_IG_PSI: psiOfficer,
  PLACEHOLDER_VERIFICATOR_IG_PSI: legalRepresentativeName,
  PLACEHOLDER_INSTRUCTOR_LM_PSI: designatedWorker,
  PLACEHOLDER_VERIFICATOR_LM_PSI: designatedWorker,
  PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
  PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
  PLACEHOLDER_DATA_ADMITERE_PSI: employee?.hireDate ? formatDateRo(employee.hireDate) : '',
  PLACEHOLDER_ADMITERE_NUME_PSI: legalRepresentativeName,
  ```
- **Finding**:
  1. `resolver.ts` never inspects whether a recorded `TrainingEvent` of type `INTRODUCTIV` or `LOC_MUNCA` exists for this employee.
  2. `employee.hireDate` is unconditionally substituted as the date for Introductiv General, Loc de Muncă, and Admitere la Lucru.
  3. `PLACEHOLDER_INSTRUCTOR_IG`, `PLACEHOLDER_TEMATICA_IG`, `PLACEHOLDER_DURATA_INSTRUIRE_IG`, `PLACEHOLDER_INSTRUCTOR_LM`, and `PLACEHOLDER_TEMATICA_LM` use static fallback defaults (e.g. `'8 ore'`, generic specialist name) rather than taking the real `instructorName`, `durationHours`, and `materialOrTopic` from the persisted `TrainingEvent`.

---

### Obs 3: Training Expiration Blocking Catch-22
- **Location 1**: `src/app/api/documents/generate-batch/route.ts:40–59` and `src/app/api/documents/generate-batch/route.ts:180–202`
- **Location 2**: `src/app/documents/generate/page.tsx:123–166`, `507–511`, `573–577`, `868`, `1388`
- **Code Quoted**:
  ```typescript
  // src/app/api/documents/generate-batch/route.ts:40–48
  // 1. Instruire SSM (Legea 319/2006, HG 1425/2006)
  if (code.includes('ssm') || code.includes('instruire') || code === 'training-detaliu-introductiv' || code === 'training-tematica-loc-munca') {
    if (compliance.ssmTraining.status === 'OVERDUE') {
      const days = Math.abs(compliance.ssmTraining.daysRemaining ?? 0);
      return {
        isExpired: true,
        reason: `Instructajul SSM este expirat (depășit cu ${days} zile conform HG 1425/2006).`,
      };
    }
  }
  ```
  ```typescript
  // src/app/api/documents/generate-batch/route.ts:183–201
  if (expiryCheck.isExpired) {
    rejectedEmployees.push({
      name: `${emp.lastName} ${emp.firstName}`,
      reason: expiryCheck.reason || 'Termen legal expirat',
    });
  }
  ...
  if (rejectedEmployees.length > 0) {
    return NextResponse.json(
      { error: `Generarea a fost blocată conform legii. Următorii salariați au termene expirate:\n${details}` },
      { status: 400 }
    );
  }
  ```
  ```typescript
  // src/app/documents/generate/page.tsx:868 & 1388
  <option key={emp.id} value={emp.id} disabled={exp.isExpired}>
  ...
  isGenerateDisabled = ... exp.isExpired;
  ```
- **Finding**:
  1. The string predicate `code.includes('ssm') || code.includes('instruire')` directly matches `ssm-fisa-instruire-individuala`!
  2. The predicate `code.includes('psi')` directly matches `psi-fisa-instructaj-individuala`!
  3. When an employee's periodic training has elapsed (`OVERDUE`), `checkEmployeeTemplateExpiry` and `getEmployeeExpiryInfo` return `isExpired: true`.
  4. This hard-blocks generating the individual training sheet:
     - In batch mode: HTTP 400 error.
     - In single mode: Dropdown option is `disabled`, generate button is `disabled`, and submit displays a red blocking error: `"Generare blocată conform legii: Salariatul ... are termenul expirat"`.
  5. **The Paradox**: Under Romanian law (Legea 319/2006, HG 1425/2006, OMAI 712/2005), the statutory method to reinstate compliance after an expired training interval is to conduct a training session and issue/record it on the individual training sheet. Blocking the sheet because training is expired prevents the employer from complying.

---

### Obs 4: Template Catalog Definitions in `src/lib/templates/definitions.ts`
- **Location**: `src/lib/templates/definitions.ts:3474–3648`
- **Catalog Inspection**:
  1. `ssm-fisa-instruire-individuala` is defined on line 3476. Token `PLACEHOLDER_DATA_INSTRUIRE_IG` has `source: 'employee.hireDate'`, and `PLACEHOLDER_DATA_INSTRUIRE_LM` has `source: 'employee.hireDate'`. Collections: `instruiriPeriodiceSSM`, `instruiriSuplimentareSSM`, `testariSSM`.
  2. `psi-fisa-instructaj-individuala` is defined on line 3576. Token `PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI` has `source: 'employee.hireDate'`, and `PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI` has `source: 'employee.hireDate'`. Collections: `instructajePeriodicePSI`, `exercitiiPracticePSI`.
  3. `training-tematica-introductiv` (line 2493) and `training-tematica-loc-munca` (line 2536) exist in catalog.
  4. Neither `ssm-pv-instruire-colectiva` nor `psi-pv-instruire` exists in `TEMPLATE_CATALOG`.
  5. Neither `ssm-tematica-anuala` nor `psi-tematica-anuala` exists as a distinct catalog code (the annual thematic plans correspond to `training-tematica-loc-munca` and `training-tematica-introductiv`).
  6. `templates_registry/normalized/` contains `ssm-fisa-instruire-individuala.docx` and `psi-fisa-instructaj-individuala.docx`, but does NOT contain `ssm-pv-instruire-colectiva.docx` or `psi-pv-instruire.docx`.

---

## 2. Logic Chain

1. **Premise 1**: The training recording API (`src/app/api/trainings/record/route.ts:27`) saves training events in PostgreSQL with `type` in `['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM', 'PERIODIC_PSI']` (Obs 1).
2. **Premise 2**: `resolver.ts` checks `!e.type || e.type === 'ssm'` for SSM periodic events and `e.type === 'psi' || e.type === 'su'` for PSI periodic events (Obs 1).
3. **Inference 1 (Feature 15 Defect)**: Since `'PERIODIC_SSM'` !== `'ssm'` and `'PERIODIC_PSI'` !== `'psi'`, every recorded periodic training event is discarded during template resolution. The periodic training tables in generated DOCX sheets remain empty.
4. **Premise 3**: `resolver.ts` assigns `employee.hireDate` to `PLACEHOLDER_DATA_INSTRUIRE_IG` and `PLACEHOLDER_DATA_INSTRUIRE_LM` unconditionally (Obs 2).
5. **Inference 2 (Feature 14 Defect)**: Even when a real `INTRODUCTIV` or `LOC_MUNCA` training event exists in PostgreSQL with a specific date (e.g. 15.02.2026), `resolver.ts` ignores it and substitutes `hireDate` (e.g. 01.02.2026), violating Requirement R4 and Feature 14.
6. **Premise 4**: `resolver.ts` reads `client.trainingEvents` globally without filtering by `TrainingParticipant.employeeId` (Obs 1).
7. **Inference 3 (Data Leakage Defect)**: If multiple employees belong to the same client, one employee's training events would appear on another employee's individual sheet if type filtering matched.
8. **Premise 5**: `generate-batch/route.ts` and `generate/page.tsx` classify `OVERDUE` SSM or PSI training as `isExpired: true` for any document matching `ssm`, `instruire`, or `psi` (Obs 3).
9. **Inference 4 (Feature 18 Catch-22)**: An employee with expired training is barred from having their individual training sheet (`ssm-fisa-instruire-individuala` or `psi-fisa-instructaj-individuala`) generated, preventing the statutory reinstatement process from occurring.
10. **Premise 6**: `ssm-pv-instruire-colectiva` and `psi-pv-instruire` are required statutory documents for collective sessions, but are absent from `definitions.ts`, `templates_registry/normalized/`, and `resolver.ts` (Obs 4).
11. **Inference 5 (Statutory Document Gap)**: One-click generation of collective training protocols from recorded sessions cannot function until these templates and their resolution logic are introduced.

---

## 3. Caveats

- **Existing Physical DOCX Files**: `ssm-fisa-instruire-individuala.docx` and `psi-fisa-instructaj-individuala.docx` already exist in `templates_registry/normalized/` with all required OpenXML bookmark and loop tags (`{#instruiriPeriodiceSSM}`, `{#instructajePeriodicePSI}`). No changes to these physical files are needed; only data population in `resolver.ts` is required.
- **Collective Protocol DOCX Files**: `ssm-pv-instruire-colectiva.docx` and `psi-pv-instruire.docx` must either be created in `templates_registry/normalized/` (using a script similar to `scripts/create_m2_templates.ts`) or generated dynamically.
- **Scope Boundary**: As per investigator role, no code in `src/` or `templates_registry/` was altered.

---

## 4. Conclusion

The statutory training document subsystem has 4 key architectural gaps:
1. **Type Mapping**: Case and string mismatch between persisted event types (`'PERIODIC_SSM'`, `'PERIODIC_PSI'`) and resolver filters (`'ssm'`, `'psi'`).
2. **Employee Scoping & Real Dates**: Unchecked global client event loading instead of participant-scoped events; hardcoded substitution of `hireDate` instead of real `INTRODUCTIV` / `LOC_MUNCA` event dates.
3. **Catch-22 Expiration Lock**: Flawed blocking logic in `generate-batch/route.ts` and `generate/page.tsx` that blocks training sheet issuance for overdue employees.
4. **Missing Collective Protocols**: Lack of `ssm-pv-instruire-colectiva` and `psi-pv-instruire` template definitions and resolution support.

---

## 5. Verification Method

### 1. Verification of Code Locations
- Verify type mismatch: `grep -n "ssmEvents" src/lib/templates/resolver.ts` -> line 1314.
- Verify hireDate substitution: `grep -n "PLACEHOLDER_DATA_INSTRUIRE_IG" src/lib/templates/resolver.ts` -> lines 1631, 2101.
- Verify Catch-22 in batch: `sed -n '40,50p' src/app/api/documents/generate-batch/route.ts`.
- Verify Catch-22 in UI: `sed -n '122,135p' src/app/documents/generate/page.tsx`.

### 2. Empirical Invalidation Conditions
- A test recording a `PERIODIC_SSM` session and generating `ssm-fisa-instruire-individuala` fails to populate rows in `instruiriPeriodiceSSM`.
- A test recording an `INTRODUCTIV` session with date different from `hireDate` results in `PLACEHOLDER_DATA_INSTRUIRE_IG` matching `hireDate`, not the event date.
- A test attempting to generate `ssm-fisa-instruire-individuala` for an employee whose `ssmLastTrainingDate` is 13 months ago returns HTTP 400 with `"Generarea a fost blocată conform legii"`.

---

## 6. Concrete Recommendations for Worker

### Recommendation 1: Fix Event Scoping and Type Discrimination in `resolver.ts`
In `src/lib/templates/resolver.ts`:
1. In `resolveTemplatePlaceholders(ctx)`:
   - When fetching `client`, include:
     ```typescript
     trainingEvents: {
       include: {
         participants: {
           include: { employee: true },
         },
       },
       orderBy: { eventDate: 'asc' },
     },
     ```
   - When fetching `employee`, include:
     ```typescript
     trainingParticipants: {
       include: { event: true },
     },
     ```
2. When resolving training data for an employee:
   - Extract only events where the employee participated:
     ```typescript
     const participantEvents = (
       employee?.trainingParticipants?.map((tp: any) => tp.event) ||
       ((client?.trainingEvents || []) as any[]).filter((ev: any) =>
         ev.participants?.some((p: any) => p.employeeId === employee?.id)
       )
     ).filter(Boolean).sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
     ```
3. Map by event type:
   - **`INTRODUCTIV`**:
     ```typescript
     const introEvent = participantEvents.find((e: any) => e.type === 'INTRODUCTIV');
     const dataIntroductiv = introEvent ? formatDateRo(introEvent.eventDate) : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
     const durataIntroductiv = introEvent ? `${introEvent.durationHours} ore` : '8 ore';
     const instructorIntroductiv = introEvent?.instructorName || ssmSpecialistName;
     const tematicaIntroductiv = introEvent?.materialOrTopic || 'Legislația generală SSM (Legea 319/2006, HG 1425/2006)...';
     const verificatorIntroductiv = introEvent?.verifierName || legalRepresentativeName;
     ```
   - **`LOC_MUNCA`**:
     ```typescript
     const lmEvent = participantEvents.find((e: any) => e.type === 'LOC_MUNCA');
     const dataLocMunca = lmEvent ? formatDateRo(lmEvent.eventDate) : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
     const durataLocMunca = lmEvent ? `${lmEvent.durationHours} ore` : '8 ore';
     const instructorLocMunca = lmEvent?.instructorName || designatedWorker;
     const tematicaLocMunca = lmEvent?.materialOrTopic || 'Instrucțiuni proprii specifice SSM...';
     const verificatorLocMunca = lmEvent?.verifierName || designatedWorker;
     const dataAdmitere = lmEvent ? formatDateRo(lmEvent.eventDate) : (employee?.hireDate ? formatDateRo(employee.hireDate) : '');
     ```
   - **`PERIODIC_SSM`**:
     ```typescript
     const ssmPeriodicEvents = participantEvents.filter(
       (e: any) => ['PERIODIC_SSM', 'SSM', 'PERIODIC'].includes(String(e.type || '').toUpperCase())
     );
     // Map into instruiriPeriodiceSSM padded to 16 rows
     ```
   - **`PERIODIC_PSI`**:
     ```typescript
     const psiPeriodicEvents = participantEvents.filter(
       (e: any) => ['PERIODIC_PSI', 'PSI', 'SU'].includes(String(e.type || '').toUpperCase())
     );
     // Map into instructajePeriodicePSI padded to 16 rows
     ```

### Recommendation 2: Eliminate Catch-22 Expiration Blocking (Feature 18)
1. In `src/app/api/documents/generate-batch/route.ts` (`checkEmployeeTemplateExpiry`):
   ```typescript
   // Exclude training documents from statutory overdue blocking
   const isTrainingDoc =
     code.includes('fisa-instruire') ||
     code.includes('fisa-instructaj') ||
     code.includes('pv-instruire') ||
     code.startsWith('training-');

   if (!isTrainingDoc) {
     if (compliance.ssmTraining.status === 'OVERDUE') { ... }
     if (compliance.psiTraining.status === 'OVERDUE') { ... }
   }
   ```
2. In `src/app/documents/generate/page.tsx` (`getEmployeeExpiryInfo`):
   - When `isTrainingDoc` is true and `status === 'OVERDUE'`:
     Return:
     ```typescript
     return {
       isExpired: false, // DO NOT BLOCK
       badgeText: 'Reinstruire Necesară',
       badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
       reason: 'Instructaj precedent depășit — Fișa se emite pentru efectuarea și consemnarea reinstruirii.',
     };
     ```
   - In `<option disabled={exp.isExpired}>`: Option will remain enabled for training documents.
   - In `isGenerateDisabled`: Generation will remain enabled.

### Recommendation 3: Add `ssm-pv-instruire-colectiva` and `psi-pv-instruire`
1. Register templates in `src/lib/templates/definitions.ts`:
   - `code: 'ssm-pv-instruire-colectiva'`, `family: 'training'`, `contextLevel: 'event'`.
   - `code: 'psi-pv-instruire'`, `family: 'training'`, `contextLevel: 'event'`.
   - Collections: `participanti` with `[nr, numeComplet, functie, cnp, rezultat, semnatura]`.
2. Generate base normalized DOCX templates in `templates_registry/normalized/` using OpenXML/PizZip helper.
3. In `TemplateResolutionContext` and `resolver.ts`:
   - Support `trainingEventId?: string;`.
   - Resolve collective session fields (`PLACEHOLDER_DATA_PV`, `PLACEHOLDER_INSTRUCTOR`, `PLACEHOLDER_TEMATICA`, `PLACEHOLDER_DURATA_INSTRUIRE`, `participanti`).
