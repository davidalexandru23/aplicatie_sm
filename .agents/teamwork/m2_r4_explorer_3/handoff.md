# Handoff Report: M2 Explorer 3 — /documents/generate UI & API Flow for Hygiene

## 1. Observation

Direct investigation of the codebase revealed the following exact facts, file paths, line numbers, and tool execution outputs:

### A. `/documents/generate/page.tsx`
1. **URL parameter handling (Lines 72–76 & 82–86)**:
   ```typescript
   72: const searchParams = useSearchParams();
   73: const initialClientId = searchParams.get('clientId') || '';
   74: const initialEmployeeId = searchParams.get('employeeId') || '';
   75: const initialTemplateCode = searchParams.get('templateCode') || '';
   ...
   85: const [selectedHygieneSessionId, setSelectedHygieneSessionId] = useState('');
   86: const [selectedHygieneParticipantId, setSelectedHygieneParticipantId] = useState('');
   ```
   The UI completely omits `searchParams.get('hygieneSessionId')` and `searchParams.get('hygieneParticipantId')`. When navigating from `/hygiene` via link `/documents/generate?templateCode=hygiene-tabel-cursanti&hygieneSessionId=${session.id}`, `selectedHygieneSessionId` remains empty (`''`).

2. **Strict Session-Lock Requirement (Lines 170–173 & 190–197)**:
   ```typescript
   170: const isEmployeeRequired = currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job';
   171: const isHygieneRequired = currentTemplate?.contextLevel === 'hygiene_session';
   172: const needsHygieneParticipant = selectedTemplateCode === 'hygiene-adeverinta';
   ...
   190: if (isHygieneRequired && !selectedHygieneSessionId) {
   191:   setError('Selectează sesiunea de igienă folosită pentru document.');
   192:   return;
   193: }
   194: if (needsHygieneParticipant && !selectedHygieneParticipantId) {
   195:   setError('Selectează cursantul pentru adeverința nominală.');
   196:   return;
   197: }
   ```
   All 3 hygiene templates (`hygiene-tabel-cursanti`, `hygiene-anexe-catalog`, `hygiene-adeverinta`) have `contextLevel: 'hygiene_session'`. The UI strictly blocks generation unless a hygiene session is selected, making it impossible for a user to choose a client company and generate the DSVSA/DSP compliance table directly for all client employees.

3. **Global Unfiltered Session Dropdown (Lines 327–346)**:
   The session dropdown displays all sessions across all companies without filtering by or correlating with the selected `selectedClientId`.

4. **Polluted Manual Input Fields (Lines 411–432)**:
   Because `definitions.ts` defines repetitive array tokens (e.g. `PLACEHOLDER_ACT_IDENTITATE_{001–115}`, `PLACEHOLDER_CNP_{001–115}`, `PLACEHOLDER_NUME_COMPLET_{001–115}`) with `source: 'manual'`, the manual fields grid attempts to render up to 20 individual inputs with labels like `Act Identitate {001–115}`, creating clutter instead of presenting relevant document-level settings (e.g., Data Examenului, Perioada Cursului, Comisie).

### B. `src/lib/templates/resolver.ts`
1. **Incomplete Client Relation Loading in `resolveTemplatePlaceholders` (Lines 899–902)**:
   ```typescript
   899: const client = await prisma.client.findUnique({
   900:   where: { id: ctx.clientId },
   901:   include: { jobs: true, worksites: true, employees: true, provider: true, specialist: true },
   902: });
   ```
   `employees: true` only fetches scalar fields. Crucial relations like `identityDocument`, `currentJob`, and `residenceAddress` are `undefined` on `client.employees`.

2. **Hardcoded Single Participant Fallback (Lines 806–832)**:
   When `hygieneSession` is `null` (e.g. when generating directly for a client), `resolver.ts` creates a single hardcoded participant:
   ```typescript
   806: } : {
   807:   participants: [
   808:     {
   809:       rowNumber: 1,
   810:       fullName: fullName || 'Stan Alexandru',
   811:       lastName: employee?.lastName || 'Stan',
   812:       firstName: employee?.firstName || 'Alexandru',
   813:       cnp: employee?.cnp || '1880315410127',
   ...
   831:     ],
   832:   }),
   ```
   Tested via `npx tsx` on `NEXUS SOLUTIONS S.R.L.` (which has 4 employees):
   `Resolved participants count: 1`
   The other 3 employees of the client are completely omitted.

3. **Adeverință Token Binding (Lines 835–852)**:
   `PLACEHOLDER_SERIE_ADEVERINTA`, `PLACEHOLDER_NUMAR_ADEVERINTA`, `PLACEHOLDER_MODUL_IGIENA`, and `PLACEHOLDER_DATA_ELIBERARE` are only bound if `participant` is not null. If an `employee` is selected without a hygiene session, these tokens rely on static fallbacks rather than the employee's `hygieneModule`, `hygieneCertificateNumber`, and `hygieneCertificateIssueDate`.

### C. `src/app/hygiene/page.tsx`
1. **Missing `clientId` in Document Links (Lines 574, 684–707)**:
   ```tsx
   685: href={`/documents/generate?templateCode=hygiene-tabel-cursanti&hygieneSessionId=${session.id}`}
   692: href={`/documents/generate?templateCode=hygiene-anexe-catalog&hygieneSessionId=${session.id}`}
   700: href={`/documents/generate?templateCode=hygiene-adeverinta&hygieneSessionId=${session.id}&hygieneParticipantId=${session.participants[0].id}`}
   ```
   None of these links provide `clientId`. When a user clicks them, they arrive on `/documents/generate` with an empty client dropdown, causing immediate validation failure.

2. **No Direct Generation/Download on `/hygiene`**:
   The user must navigate away from `/hygiene` to generate documents even when all session and participant data is already on screen.

### D. `src/lib/templates/generator.ts`
1. **Dynamic Participant Row Formatting Already Implemented (Lines 504–516)**:
   `generator.ts` already correctly supports indexed placeholders (`_001` through `_195`) using `formatParticipantValue(token, participants[index])` and automatically clears unused rows (`if (index >= participants.length) return '';`). It only requires `resolver.ts` to supply the actual list of participants!

---

## 2. Logic Chain

1. **User Requirement**:
   The user explicitly requested:
   *"Cand o sa vreau sa generez ceva legat de igiena, trebuie sa pot sa selectez direct din tabul de generare, Tabel evidenta cursanti igiena trebuie sa genereze un tabel cu toti angajatii care au facut un modul de igiena, ce modul, cand , (vezi ce cere DSV pe internet)..."*
2. **Current Impediment 1 (Validation in `page.tsx`)**:
   Because `currentTemplate?.contextLevel === 'hygiene_session'`, line 190 of `page.tsx` rejects any generation attempt if `selectedHygieneSessionId` is empty. The user cannot choose a client and generate for the client's employees without first having or selecting a session.
3. **Current Impediment 2 (Resolver in `resolver.ts`)**:
   Even if the validation were bypassed, lines 806–832 of `resolver.ts` only construct a 1-row participant array with a fallback person ("Stan Alexandru"), completely ignoring the client's actual employee roster.
4. **Current Impediment 3 (Disjoint Navigation from `/hygiene`)**:
   Links from `/hygiene` pass `hygieneSessionId` but omit `clientId`. `page.tsx` does not read `hygieneSessionId` from `searchParams`, resulting in a broken transition where all dropdowns remain unselected.
5. **Solution Coherence**:
   - In `resolver.ts`: when `hygieneSession` is not specified, dynamically assemble `participants` from `client.employees` (filtering those with `hygieneModule`, `hygieneRequested`, or `hygieneCertificateNumber`, or all active employees), mapping Order 1225/2209 modules, certificate numbers, exam dates, CNP, and identity documents into the participant array.
   - In `page.tsx`: add a **Scope Selector** for hygiene templates:
     * **Scope A ("Toți salariații firmei")**: Generates the DSVSA/DSP compliance table for all client employees with hygiene records. No session required. For `hygiene-adeverinta`, prompts for employee selection.
     * **Scope B ("Sesiune specifică")**: Retains session-based generation, filtering sessions that contain participants from this client.
     * Initialize all query parameters (`clientId`, `templateCode`, `hygieneSessionId`, `hygieneParticipantId`, `employeeId`, `scope`) from `useSearchParams()`.
     * Filter out `{001–...}` indexed placeholder tokens from the manual fields form so the UI remains clean and focused on document-level metadata (exam date, committee members, etc.).
   - In `/hygiene/page.tsx` & `/api/hygiene/sessions/route.ts`:
     * Include `employee.clientId` in session GET API.
     * Pass `clientId` in the document generator links.
     * Add a direct 1-click "Descarcă Direct" action on `/hygiene` that calls `/api/documents/generate` and triggers immediate download.

---

## 3. Caveats

1. **Multi-Client Hygiene Sessions**:
   A single `HygieneSession` can contain participants from multiple client companies (e.g., a shared training session organized by the external SSM provider). When generating a document from `/hygiene` for a multi-client session:
   - For `hygiene-tabel-cursanti` and `hygiene-anexe-catalog` at the session level, all participants in the session are included, while the corporate header references the provider or the primary client.
   - When generating from `/documents/generate` with Scope A (Client scope), only that client's employees are included, matching DSVSA/DSP inspection requirements for a specific employer.
2. **Missing Employee CNP / Identity Documents**:
   If an employee lacks an `identityDocument` record, Romanian legal fallbacks (e.g. `'CI seria RX nr. 123456'`) prevent XLSX/DOCX corruption, but the compliance status will be flagged as `'missing_data'` instead of `'approved_for_print'`, clearly informing the operator.
3. **No Database Schema Changes Needed**:
   All necessary fields (`Employee.hygieneModule`, `Employee.hygieneLastExamDate`, `Employee.hygieneCertificateNumber`, `Employee.hygieneRequested`, `HygieneSession`, `HygieneParticipant`) already exist in `prisma/schema.prisma`. No migration is required.

---

## 4. Conclusion

The hygiene document generation flow requires coordinated UI and resolver enhancements:
1. **`/documents/generate/page.tsx`**:
   - Add a two-option Scope Selector for hygiene templates: `client` ("Toți angajații firmei cu module de igienă") vs. `session` ("Dintr-o sesiune specifică de igienă").
   - Eliminate the mandatory session block when scope is `client`.
   - Read `hygieneSessionId`, `hygieneParticipantId`, and `clientId` from `useSearchParams()`.
   - Filter out indexed array placeholders (`{001–115}`) from the manual fields customizer.
2. **`src/lib/templates/resolver.ts`**:
   - In `resolveTemplatePlaceholders`, include employee relations (`identityDocument`, `currentJob`, `residenceAddress`).
   - In `resolveTemplateData`, build the `participants` array dynamically from `client.employees` when `hygieneSession` is null, populating Order 1225/2209 modules, DSVSA fields (CNP, birth date/place, cert number, exam date).
   - In `resolveTemplatePlaceholders`, filter out wildcard array field definitions from the returned `fields` list.
3. **`src/app/hygiene/page.tsx` & `src/app/api/hygiene/sessions/route.ts`**:
   - Include participant client metadata in GET sessions.
   - Update quick links to include `clientId`.
   - Add direct 1-click download actions for `hygiene-tabel-cursanti`, `hygiene-anexe-catalog`, and `hygiene-adeverinta`.

---

## 5. Verification Method

To independently verify the implementation:

1. **Direct Node/TypeScript Roster Verification**:
   ```bash
   npx tsx -e '
   import { prisma } from "./src/lib/prisma";
   import { resolveTemplatePlaceholders } from "./src/lib/templates/resolver";

   async function verify() {
     const client = await prisma.client.findFirst({
       where: { cui: "RO38765432" },
       include: { employees: true }
     });
     const res = await resolveTemplatePlaceholders({
       templateCode: "hygiene-tabel-cursanti",
       clientId: client.id,
     });
     console.log("Employees in client:", client.employees.length);
     console.log("Resolved participants count:", res.resolvedData.participants?.length);
     if (res.resolvedData.participants?.length !== client.employees.length) {
       throw new Error("FAIL: Participants count did not match employees count!");
     }
     console.log("SUCCESS: Client-wide hygiene roster dynamically resolved.");
     await prisma.$disconnect();
   }
   verify().catch(console.error);
   '
   ```

2. **Template Generation Test**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   Verify that `TEST_hygiene-tabel-cursanti_Tabel Cursanti exemplu.xlsx`, `TEST_hygiene-anexe-catalog_Anexe Curs igiena.xlsx`, and `TEST_hygiene-adeverinta_Adeverinta participare.docx` generate with 0 unreplaced placeholders.

3. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   Verify TypeScript compilation and Next.js page bundling pass with 0 errors.

4. **Invalidation Conditions**:
   - Any unhandled exception when generating a hygiene document without selecting a session.
   - Any leftover `{PLACEHOLDER_...}` token in generated XLSX/DOCX files.
   - Any single hardcoded participant generated when the client has multiple employees.
