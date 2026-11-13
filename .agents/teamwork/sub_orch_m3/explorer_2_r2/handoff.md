# Milestone 3 (M3) Participant Metadata Gap Investigation Report — explorer_2_r2

**Task**: Deep Investigation of Participant Metadata Gaps in Collective PV Generation (`ssm-pv-instruire-colectiva` and `psi-pv-instruire`)  
**Investigator**: explorer_2_r2 (Milestone 3 Iteration 2)  
**Date**: 2026-11-11  
**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m3/explorer_2_r2`  

---

## 1. Observation

### 1.1 Empirical Failure Observed in Adversarial Challenger 1 Test Suite
Running `npx tsx scripts/adversarial-challenger1-m3.ts` yielded the following failure:
```text
  [PASS] V2-01: Record a training session with 2 participants (Emp 1 and Emp 2) (6ms)
  [PASS] V2-02: Generate ssm-pv-instruire-colectiva with trainingEventId and verify document contents (participant names, CNP masking, dates) (102ms)
  [FAIL] V2-02-BUG: Verify participant specific job titles (Inginer Tehnolog, Tehnician Mentenanță) in ssm-pv-instruire-colectiva (NOT generic fallback "Lucrător") (45ms)
         Error: Assertion failed: Participant 1 job title (Inginer Tehnolog) must be present in document; found fallback "Lucrător"
  [PASS] V2-03: Generate psi-pv-instruire with trainingEventId and verify DOCX participant mapping & CNP masking (37ms)
```

### 1.2 OpenXML Inspection of Collective PV Templates
Unzipping and parsing `word/document.xml` from `templates_registry/normalized/ssm-pv-instruire-colectiva.docx` and `templates_registry/normalized/psi-pv-instruire.docx` reveals the following structure:

#### Top-level Placeholders:
- `{PLACEHOLDER_FIRMA}`
- `{PLACEHOLDER_CUI}`
- `{PLACEHOLDER_NR_REG_COM}`
- `{PLACEHOLDER_ADRESA_FIRMA}`
- `{PLACEHOLDER_LOC_MUNCA}`
- `{PLACEHOLDER_DATA_PV}`
- `{PLACEHOLDER_DURATA_INSTRUIRE}`
- `{PLACEHOLDER_INSTRUCTOR}`
- `{PLACEHOLDER_TEMATICA}`
- `{PLACEHOLDER_DEMONSTRATIE_PRACTICA}`
- `{PLACEHOLDER_VERIFICATOR}`
- `{PLACEHOLDER_REPREZENTANT_LEGAL}`

#### Participant Table (Identical in both SSM and PSI templates):
- **Header Row (Row 0)**:
  `Nr.` | `Nume și Prenume` | `Funcția / Ocupația` | `CNP` | `Rezultat` | `Semnătură`
- **Data Row (Row 1)**:
  `{#participanti}{nr}` | `{numeComplet}` | `{functie}` | `{cnp}` | `{rezultat}` | `{semnatura}{/participanti}`

Required per-row tokens in `Docxtemplater`:
1. `nr` (number or string): Row index starting at 1.
2. `numeComplet` (string): Full name of the participant worker (e.g. `"Ionescu Ion"`).
3. `functie` (string): Occupation / specific job title (e.g. `"Inginer Tehnolog"`).
4. `cnp` (string): Masked personal identification code (e.g. `"18805********"`).
5. `rezultat` (string): Examination / knowledge verification result (`"admis"` or `"respins"`).
6. `semnatura` (string): Empty string placeholder (`""`) reserved for wet-ink handwritten signature.

### 1.3 Source Code Audit of `src/lib/templates/resolver.ts`

#### A. Initial Client Query Omits Employee Relations in `trainingEvents`
In `src/lib/templates/resolver.ts` lines 2468–2481:
```typescript
  const client = await prisma.client.findUnique({
    where: { id: ctx.clientId },
    include: {
      jobs: true,
      worksites: true,
      trainingEvents: {
        include: {
          participants: {
            include: { employee: true },
          },
        },
        orderBy: { eventDate: 'asc' },
      },
```
Direct observation:
- `trainingEvents.participants.include` specifies only `{ employee: true }`. This loads ONLY primitive columns on `Employee`.
- It omits `currentJob: true`, `identityDocument: true`, `currentWorksite: true`, and `residenceAddress: true`.

#### B. Fallback `findUnique` Query Is Dead Code
In `src/lib/templates/resolver.ts` lines 2559–2576:
```typescript
  const trainingEvent = ctx.trainingEventId
    ? (client.trainingEvents?.find((e: any) => e.id === ctx.trainingEventId) ||
        (await prisma.trainingEvent.findUnique({
          where: { id: ctx.trainingEventId },
          include: {
            participants: {
              include: {
                employee: {
                  include: {
                    currentJob: true,
                    identityDocument: true,
                  },
                },
              },
            },
          },
        })))
    : null;
```
Direct observation:
- Whenever `ctx.trainingEventId` belongs to the client, `client.trainingEvents?.find(...)` matches the cached object.
- Because `client.trainingEvents?.find(...)` is truthy, the right-hand operand (`prisma.trainingEvent.findUnique(...)`) is NEVER evaluated.
- The training event returned to the caller is the sparsely-populated cached object lacking `employee.currentJob` and `employee.identityDocument`.

#### C. Brittle Participant Mapping in `resolveTemplateData`
In `src/lib/templates/resolver.ts` lines 2395–2409:
```typescript
      participanti: (trainingEvent?.participants || []).map((p: any, idx: number) => {
        const emp = p.employee;
        const empName = emp ? `${emp.lastName} ${emp.firstName}`.trim() : (p.fullName || 'Participant');
        const func = emp?.currentJob?.title || 'Lucrător';
        const cnpVal = emp?.cnp ? maskCNP(emp.cnp) : '';
        const rez = p.result || 'admis';
        return {
          nr: idx + 1,
          numeComplet: empName,
          functie: func,
          cnp: cnpVal,
          rezultat: rez,
          semnatura: '',
        };
      }),
```
Direct observation:
1. `emp.currentJob` is `undefined`, so `emp?.currentJob?.title` returns `undefined`. `func` unconditionally evaluates to `'Lucrător'`.
2. Even though `emp.currentJobId` is present on the primitive `Employee` model, the resolver makes no attempt to resolve the job title via `client.jobs.find(j => j.id === emp.currentJobId)`.
3. Even if `p.employee` were completely null or missing, `client.employees` contains fully hydrated employees (`include: { currentJob: true, identityDocument: true, currentWorksite: true }`), yet the resolver does not look up `client.employees.find(e => e.id === p.employeeId)`.

#### D. Complete Table Stripping on Client-Scoped Resolution
Direct observation:
- If `ssm-pv-instruire-colectiva` or `psi-pv-instruire` is generated without `ctx.trainingEventId` (for example, from `/documents/generate` or batch generation without event):
  `trainingEvent` resolves to `null`.
- In `resolveTemplateData`, `(trainingEvent?.participants || [])` evaluates to `[]`.
- In `Docxtemplater`, when an array mapped to a loop `{#participanti}...{/participanti}` is empty (`[]`), Docxtemplater strips the data row completely. The resulting `.docx` file contains ONLY the table header and zero participant rows.
- The resolver does not attempt to fall back to the client's latest domain training event, nor does it populate active employees from `client.employees`, nor does it emit blank template rows for handwritten use.

#### E. Discarded Training Location in `verifiedMap`
In `src/lib/templates/resolver.ts`:
- Line 1719: `if (trainingEvent.location) markAutocompleted('PLACEHOLDER_LOC_MUNCA', trainingEvent.location);`
- Line 2155 (verifiedMap): `PLACEHOLDER_LOC_MUNCA: worksite?.address || client?.address || '',`
- Lines 2386–2410 (Section 7): `PLACEHOLDER_LOC_MUNCA` is NOT assigned.
Direct observation:
- `trainingEvent.location` is recorded only in `autocompletedKeys` (a metadata set), but is never set in `verifiedMap`.
- If an event was conducted at a specific venue (e.g. `"Sala de instruire - Punct de lucru Ploiești"`), it is completely discarded in the rendered document, which defaults to `worksite.address` or `client.address`.

#### F. PSI Instructor Fallback Defaulting to SSM Worker
In `src/lib/templates/resolver.ts` line 2391:
```typescript
PLACEHOLDER_INSTRUCTOR: trainingEvent?.instructorName || designatedWorker || ssmSpecialistName,
```
Direct observation:
- For `psi-pv-instruire`, if `trainingEvent.instructorName` is omitted, the instructor falls back to `designatedWorker` (SSM Lucrător Desemnat) instead of `psiOfficer` (`client.psiResponder`, Cadru Tehnic PSI conform OMAI 712/2005).

#### G. Grammatical Inaccuracy in Duration Formatting
In `src/lib/templates/resolver.ts` line 2390:
```typescript
PLACEHOLDER_DURATA_INSTRUIRE: trainingEvent?.durationHours ? `${trainingEvent.durationHours} ore` : '2 ore',
```
Direct observation:
- When `durationHours === 1`, it outputs `"1 ore"` instead of Romanian singular `"1 oră"`.

---

## 2. Logic Chain

1. **Prisma Query Loading Mechanics**:
   - `prisma.client.findUnique` queries the database with nested relations.
   - When `trainingEvents: { include: { participants: { include: { employee: true } } } }` is executed, Prisma maps only scalar columns of `Employee`. Relations `currentJob`, `identityDocument`, `currentWorksite`, and `residenceAddress` are not fetched.

2. **Short-Circuit Logical OR Caching Defect**:
   - The expression `client.trainingEvents?.find((e: any) => e.id === ctx.trainingEventId) || await prisma.trainingEvent.findUnique(...)` checks the array in memory first.
   - Because the event exists in `client.trainingEvents`, the truthy array element is returned immediately.
   - The detailed `findUnique` query (which included `currentJob` and `identityDocument`) never executes.
   - Therefore, `trainingEvent.participants[].employee.currentJob` is always `undefined`.

3. **Fallback Failure**:
   - `const func = emp?.currentJob?.title || 'Lucrător';` looks only at `emp.currentJob.title`.
   - Because `currentJob` is `undefined`, it immediately executes the fallback `'Lucrător'`, ignoring the valid `currentJobId` present on `emp` and the cached `client.jobs`.
   - This directly caused the failure in adversarial test `V2-02-BUG`.

4. **Client-Scoped vs. Event-Scoped Context Incoherence**:
   - In `/app/documents/generate/page.tsx`, `ssm-pv-instruire-colectiva` and `psi-pv-instruire` have `contextLevel: 'training_event'`.
   - The page does not have a training event selector, so it generates requests with `{ clientId, templateCode }` and `trainingEventId = undefined`.
   - In `resolver.ts`, missing `trainingEventId` sets `trainingEvent = null`, causing `participanti` to evaluate to `[]`.
   - Consequently, any client-scoped generation of collective PVs produces a broken document with an empty participant table.

5. **Provable Statutory Compliance Gap**:
   - Legea 319/2006 (art. 20) and HG 1425/2006 (art. 88) require collective training minutes to document each worker's specific occupation to verify qualification-relevant risk training.
   - OMAI 712/2005 (art. 42) requires the Cadru Tehnic PSI / Responsabil PSI to be recorded as the instructor for emergency training sessions.
   - Emitting generic `"Lucrător"` and defaulting PSI instructors to the SSM worker violates these statutory requirements.

---

## 3. Caveats

- **No Code Was Modified**: This investigation adhered strictly to read-only constraints.
- **Single Source of Truth**: All findings are based directly on the actual OpenXML template files in `templates_registry/normalized/`, the Prisma schema in `prisma/schema.prisma`, the runtime implementation in `src/lib/templates/resolver.ts`, and reproducible test runs.
- **Alternative Interpretations Considered**:
  - *Could `client.jobs` lookup replace loading `currentJob`?* Yes, as a defense-in-depth fallback, but Prisma eager-loading `currentJob: true` on `client.trainingEvents` is cleaner and eliminates nested lookup overhead.
  - *Should client-scoped collective PVs list all employees or only active employees?* Only active employees (`status !== 'PLECAT'`). Listing departed employees on a blank collective training sheet would be an error.

---

## 4. Conclusion

The participant metadata gaps in collective PV generation stem from 6 interconnected root causes:
1. **Primary Defect**: `client.trainingEvents` omits `currentJob` and `identityDocument` under `participants.employee`.
2. **Dead-Code Query**: The fallback `findUnique` query in `resolver.ts` is masked by an eager `client.trainingEvents.find` lookup.
3. **No Defense-in-Depth Job Resolution**: `emp.currentJobId` is never checked against `client.jobs`, nor is `client.employees` searched.
4. **Client-Scoped Resolution Black Hole**: When `trainingEventId` is omitted, `participanti` defaults to `[]`, wiping the table in OpenXML.
5. **Dropped Venue**: `trainingEvent.location` is not mapped to `PLACEHOLDER_LOC_MUNCA` in `verifiedMap`.
6. **Domain Inversion**: PSI instructor falls back to the SSM designated worker instead of the PSI responder.

### Exact Recommendations for Worker:

#### Recommendation 1: Fix `prisma.client.findUnique` in `resolver.ts` (around line 2473)
Update `trainingEvents` include to eagerly load all participant employee relations:
```typescript
trainingEvents: {
  include: {
    participants: {
      include: {
        employee: {
          include: {
            currentJob: true,
            identityDocument: true,
            currentWorksite: true,
          },
        },
      },
    },
  },
  orderBy: { eventDate: 'asc' },
},
```

#### Recommendation 2: Eliminate Dead Code and Enable Client-Scoped Auto-Resolution (around line 2559)
When `ctx.trainingEventId` is absent, auto-resolve to the latest domain-specific training event of the client:
```typescript
const isPsiTemplate = ctx.templateCode?.includes('psi') || ctx.templateCode?.startsWith('psi-');
let trainingEvent = ctx.trainingEventId
  ? (client.trainingEvents?.find((e: any) => e.id === ctx.trainingEventId) ||
      (await prisma.trainingEvent.findUnique({
        where: { id: ctx.trainingEventId },
        include: {
          participants: {
            include: {
              employee: {
                include: {
                  currentJob: true,
                  identityDocument: true,
                  currentWorksite: true,
                },
              },
            },
          },
        },
      })))
  : null;

// Graceful client-scoped fallback: auto-select latest event matching domain if none explicitly provided
if (!trainingEvent && (template.contextLevel === 'training_event' || ctx.templateCode.includes('pv-instruire'))) {
  const domainEvents = (client.trainingEvents || []).filter((e: any) => {
    const isPsiEvent = ['PERIODIC_PSI', 'PSI', 'SU', 'suplimentar'].includes(String(e.type || '').toUpperCase());
    return isPsiTemplate ? isPsiEvent : !isPsiEvent;
  });
  if (domainEvents.length > 0) {
    trainingEvent = domainEvents[domainEvents.length - 1]; // latest event
  }
}
```

#### Recommendation 3: Multi-Tier Resilient Participant Mapping in `resolveTemplateData` (around line 2395)
Build a resilient participant pipeline with fallbacks:
```typescript
// Determine participants source:
// 1. Explicit trainingEvent participants
// 2. Client active employees (if client-scoped or event has 0 attendees)
// 3. Fallback blank rows for field printing
let participantRows: any[] = [];
if (trainingEvent?.participants && trainingEvent.participants.length > 0) {
  participantRows = trainingEvent.participants.map((p: any, idx: number) => {
    const emp = p.employee || (p.employeeId && client?.employees?.find((e: any) => e.id === p.employeeId)) || null;
    const empName = emp ? `${emp.lastName || ''} ${emp.firstName || ''}`.trim() : (p.fullName || 'Participant');
    const func =
      emp?.currentJob?.title ||
      (emp?.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) ||
      p.jobTitle ||
      'Lucrător';
    const cnpVal = emp?.cnp
      ? maskCNP(emp.cnp)
      : (emp?.identityDocument?.number
          ? `${emp.identityDocument.docType || 'CI'} ${emp.identityDocument.series || ''} ${emp.identityDocument.number}`.trim()
          : '');
    const rez = p.result || 'admis';
    return {
      nr: idx + 1,
      numeComplet: empName,
      functie: func,
      cnp: cnpVal,
      rezultat: rez,
      semnatura: '',
    };
  });
} else if (client?.employees && client.employees.length > 0) {
  // Client-scoped pre-populated attendance list for active employees
  const activeEmps = client.employees.filter((e: any) => e.status !== 'PLECAT');
  participantRows = activeEmps.map((emp: any, idx: number) => ({
    nr: idx + 1,
    numeComplet: `${emp.lastName || ''} ${emp.firstName || ''}`.trim(),
    functie: emp.currentJob?.title || (emp.currentJobId && client?.jobs?.find((j: any) => j.id === emp.currentJobId)?.title) || 'Lucrător',
    cnp: emp.cnp ? maskCNP(emp.cnp) : '',
    rezultat: 'admis',
    semnatura: '',
  }));
}

// Ensure at least 5 blank rows if still empty (so printed forms have table lines)
if (participantRows.length === 0) {
  participantRows = Array.from({ length: 5 }, (_, i) => ({
    nr: i + 1,
    numeComplet: '',
    functie: '',
    cnp: '',
    rezultat: '',
    semnatura: '',
  }));
}
```

#### Recommendation 4: Map Event Location and Domain Instructor in Section 7
In Section 7 of `verifiedMap`:
```typescript
PLACEHOLDER_LOC_MUNCA: trainingEvent?.location || worksite?.name || worksite?.address || client?.address || '',
PLACEHOLDER_DURATA_INSTRUIRE: trainingEvent?.durationHours
  ? `${trainingEvent.durationHours} ${trainingEvent.durationHours === 1 ? 'oră' : 'ore'}`
  : '2 ore',
PLACEHOLDER_INSTRUCTOR:
  trainingEvent?.instructorName ||
  (template.code?.includes('psi')
    ? (psiOfficer || designatedWorker || ssmSpecialistName)
    : (designatedWorker || ssmSpecialistName)),
participanti: participantRows,
```

---

## 5. Verification Method

To independently verify the implementation of these recommendations:

1. **Execute the Adversarial Suite**:
   ```bash
   npx tsx scripts/adversarial-challenger1-m3.ts
   ```
   - **Baseline (Before Fix)**: Exits with code 1, reporting failure on `V2-02-BUG`.
   - **Pass Criterion (After Fix)**: Exits with code 0 (`21 passed (100.0%)`, `0 failed`). Specifically, `V2-02-BUG` passes with participant job titles (`"Inginer Tehnolog"` and `"Tehnician Mentenanță"`) verified in the generated OpenXML.

2. **Execute Full System Regression Test**:
   ```bash
   npm test
   ```
   - Must maintain 100% pass rate across all 5 verification suites (416/416 tests passing).
