# Handoff Report: Template Download Route & Exporter Synchronization (Milestone 3)

## 1. Observation

### 1.1 Template Files on Disk
Direct inspection using `ls -la` and `xlsx` inspection script verified that both required Excel workbooks exist on disk:
- **Empty Template**: `/Users/davidalexandru/Documents/Proiect_SSM/outputs/ssm-client-template/Model_date_client_SSM.xlsx` (28,816 bytes).
  - Sheets: `['Instrucțiuni', 'Firmă și angajați', 'Context posturi']`.
  - Parsed by `parseClientWorkbook`: 0 employees, 0 job contexts, clean company structure.
- **Sample Template**: `/Users/davidalexandru/Documents/Proiect_SSM/Test_Client_3_Angajati.xlsx` (30,703 bytes).
  - Sheets: `['Instrucțiuni', 'Firmă și angajați', 'Context posturi']`.
  - Parsed by `parseClientWorkbook`: Company `NEXUS SOLUTIONS S.R.L.`, 3 employees (Stan Alexandru, Dumitru Ioana-Raluca, Barbu Gheorghe), 3 job contexts, 100% valid rows (`isValid: true`, `errors: []`).

### 1.2 Status of Template Route
Direct scan of `src/app/api/` via `find_by_name`:
- `src/app/api/imports/template/route.ts` does **not** exist yet.
- `src/app/api/imports/preview/route.ts` and `src/app/api/imports/commit/route.ts` exist.
- In `src/app/imports/new/page.tsx`: No download links or buttons exist for downloading the blank template or the sample file.

### 1.3 Exporter State (`src/lib/exporter.ts`)
Inspection of `src/lib/exporter.ts`:
- Function `exportClientToExcel(clientId: string): Promise<ClientExportResult>` (lines 45–269):
  - Fetches client with worksites, jobs, and employees (`orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]`).
  - Writes company metadata to `B5:B8` (`name`, `cui`, `regCom`, `address`) and `E5:E8` (`legalRepresentative`, `contactPerson`, `contactEmail`, `contactPhone`).
  - Clears pre-existing rows from `r = 12` to `250` across all 34 columns (Col 0–33, `A` to `AH`).
  - Writes employees starting at row 13 (`r = 12`):
    - Col 0: `lastName`, Col 1: `firstName`, Col 2: `sex`, Col 3: `cnp`, Col 4: `formatDmy(birthDate)`
    - Col 5–7: `birthPlace`, `birthCounty`, `citizenship`
    - Col 8–13: `docType`, `docSeries`, `docNumber`, `docIssuedBy`, `issueDate`, `expiryDate`
    - Col 14–21: `county`, `locality`, `street`, `number`, `building`, `entrance`, `floor`, `apartment`
    - Col 22–23: `email`, `phone`
    - Col 24–25: `jobTitle`, `worksiteName`
    - Col 26–29: `startDateOnJob`, `hireDate`, `status`, `leaveDate`
    - Col 30–33: `hygieneRequested`, `hygieneModule`, `hygienePreferredSession`, `adminNotes`
  - Encodes `sFirm['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastFirmRow, c: 33 } })`.
  - Generates `Context posturi` combining employee assignments and additional client jobs.
  - Generates filename: `Date_Client_${client.cui}_${safeName}.xlsx`.

### 1.4 Timezone Sensitivity in Date Formatting
Direct test under `TZ=America/New_York`:
```bash
TZ=America/New_York npx tsx -e "
const d = new Date('1988-03-15T00:00:00.000Z');
console.log('getDate():', d.getDate());
console.log('getUTCDate():', d.getUTCDate());
"
# Output:
# getDate(): 14
# getUTCDate(): 15
```
Lines 6–14 of `src/lib/exporter.ts` currently use:
```typescript
const day = String(d.getDate()).padStart(2, '0');
const month = String(d.getMonth() + 1).padStart(2, '0');
const year = String(d.getFullYear());
```
Because dates in the database are stored as UTC midnight (`T00:00:00.000Z`), servers or environments located in timezones west of UTC evaluate `d.getDate()` as the previous calendar day.

### 1.5 Existing Client Export Route (`src/app/api/clients/[id]/export/route.ts`)
Lines 1–46 of `src/app/api/clients/[id]/export/route.ts`:
- Implements `GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })`.
- Awaits `params`, invokes `exportClientToExcel(id)`.
- Logs audit event via `logAuditEvent({ actorName: 'Operator SSM', action: 'export', entityType: 'Client', entityId: id, details: { clientName, employeesCount, filename } })`.
- Returns binary stream `Response(new Uint8Array(result.buffer))` with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="${result.filename}"`, `Cache-Control: no-store, no-cache, must-revalidate`.
- Wired to `<a href={'/api/clients/${c.id}/export'}>` in `src/app/clients/page.tsx:157` and `src/app/clients/[id]/page.tsx:156`.

### 1.6 Round-Trip Script Execution
Running `npx tsx scripts/test-export-import-roundtrip.ts`:
- Tested both `RO38765432` (Nexus) and `RO45123987` (Bistro).
- Both passed with 100% fidelity: `UNCHANGED: 4` for Nexus, `UNCHANGED: 2` for Bistro, zero errors, modified cells properly discriminated upon mutation.

---

## 2. Logic Chain

1. **Template Download Route (`/api/imports/template`)**:
   - The user workflow in `/imports/new` requires access to both a clean blank register (`Model_date_client_SSM.xlsx`) and an illustrative sample populated with realistic Romanian data (`Test_Client_3_Angajati.xlsx`).
   - By creating `src/app/api/imports/template/route.ts` handling `GET /api/imports/template?type=empty` (default) and `type=sample`, clients and internal operators can download either workbook directly with accurate MIME types (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) and filenames (`Model_date_client_SSM.xlsx` or `Model_date_client_SSM_Exemplu.xlsx`).
   - Integrating download links into `src/app/imports/new/page.tsx` fulfills Feature F7 and makes the onboarding workflow self-contained.

2. **Exporter Synchronization & Timezone Hardening (`src/lib/exporter.ts`)**:
   - As observed in Section 1.4, `formatDmy` using `d.getDate()` causes day slippage when executed on machines where the local timezone is behind UTC.
   - Replacing local date methods with `d.getUTCDate()`, `d.getUTCMonth() + 1`, and `d.getUTCFullYear()` ensures that dates stored at UTC midnight are formatted accurately to Romanian `DD.MM.YYYY` regardless of server timezone.
   - For database records that may have incomplete optional fields:
     - If `birthDate` is null, it can be deterministically calculated from Romanian `cnp` (first digit determines century, digits 2–3 year, 4–5 month, 6–7 day). This prevents `parseClientWorkbook` from raising validation errors on re-import.
     - If `hireDate` is null, fallback to `startDateOnJob || createdAt`.
     - If `currentWorksite` is null, fallback to `client.worksites[0]?.name || 'Sediul Central'`.
     - If `currentJob` is null, fallback to `client.jobs[0]?.title || 'Lucrător'`.
   - In `Context posturi`, iterate through `client.worksites` in addition to `client.jobs` to ensure 100% of defined worksites and jobs are captured even if no employee is currently assigned to them.

3. **Client Export Route Review (`src/app/api/clients/[id]/export/route.ts`)**:
   - The route is already fully functional, compliant with Next.js 15 App Router conventions (async `params` resolution), properly logs audit events without leaking CNP, and streams standard XLSX headers.
   - No architectural changes are needed for the route handler itself; it directly benefits from the fixes to `exporter.ts`.

---

## 3. Caveats

- **Missing Mandatory Fields in Incomplete DB Records**: If an employee in the database is missing an `identityDocument` relation entirely, the exporter outputs empty strings for doc number and series. When re-imported, `parseClientWorkbook` requires `docNumber`. The seed database already provides complete identity documents for all employees, but any programmatic exporter should provide safe fallback text (e.g. `docType: 'CI'`, `number: 'FARA_ACT'`) if strict 100% round-trip is required for corrupted records.
- **`adversarial-seed-roundtrip-stress.ts` Test 4.1**: Test 4.1 in that script assumed `nexus.employees[0]` matched row 13 (`A13`) in the exported sheet. However, `exporter.ts` sorts employees by `lastName asc` (Barbu first), whereas `allClients` was queried without an `orderBy` (returning Dumitru first). The test failed because it mutated row 13 with Dumitru's CNP while Barbu's other fields remained. This is a test-order assumption, not a code defect.

---

## 4. Conclusion

1. **`src/app/api/imports/template/route.ts` Specification**:
   Implement a clean Next.js 15 GET route:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import path from 'path';
   import fs from 'fs';

   export const dynamic = 'force-dynamic';

   export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url);
     const type = searchParams.get('type');
     const isSample = type === 'sample';

     const filePath = isSample
       ? path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx')
       : path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');

     const filename = isSample
       ? 'Model_date_client_SSM_Exemplu.xlsx'
       : 'Model_date_client_SSM.xlsx';

     if (!fs.existsSync(filePath)) {
       return NextResponse.json({ error: 'Șablonul solicitat nu a fost găsit pe server.' }, { status: 404 });
     }

     const buffer = await fs.promises.readFile(filePath);

     return new Response(new Uint8Array(buffer), {
       status: 200,
       headers: {
         'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'Content-Disposition': `attachment; filename="${filename}"`,
         'Content-Length': String(buffer.length),
         'Cache-Control': 'public, max-age=3600, must-revalidate',
       },
     });
   }
   ```

2. **`src/lib/exporter.ts` Hardening**:
   - Update `formatDmy`:
     ```typescript
     export function formatDmy(val?: Date | string | null): string {
       if (!val) return '';
       const d = typeof val === 'string' ? new Date(val) : val;
       if (isNaN(d.getTime())) return String(val);
       const day = String(d.getUTCDate()).padStart(2, '0');
       const month = String(d.getUTCMonth() + 1).padStart(2, '0');
       const year = String(d.getUTCFullYear());
       return `${day}.${month}.${year}`;
     }
     ```
   - Add CNP-based birthDate derivation and fallback worksite/job mappings to guarantee 100% valid re-import rows.
   - Include unassociated worksites in `Context posturi`.

3. **`src/app/imports/new/page.tsx` UI Enhancement**:
   - Add template download buttons linking to `/api/imports/template?type=empty` and `/api/imports/template?type=sample`.

---

## 5. Verification Method

To verify these specifications independently:

1. **Verify Template Route & Streaming**:
   ```bash
   # Test empty template download
   curl -I "http://localhost:3000/api/imports/template?type=empty"
   # Verify Content-Type is application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   # Verify filename is Model_date_client_SSM.xlsx

   # Test sample template download
   curl -I "http://localhost:3000/api/imports/template?type=sample"
   # Verify filename is Model_date_client_SSM_Exemplu.xlsx
   ```

2. **Verify Round-Trip Integrity**:
   ```bash
   npx tsx scripts/test-export-import-roundtrip.ts
   ```
   Must exit with code 0 and output:
   `✓ TEST ROUND-TRIP TRECUT CU SUCCES 100% PENTRU TOȚI CLIENȚII!`

3. **Verify Timezone Invariance**:
   ```bash
   TZ=America/New_York npx tsx scripts/test-export-import-roundtrip.ts
   TZ=Europe/Bucharest npx tsx scripts/test-export-import-roundtrip.ts
   TZ=UTC npx tsx scripts/test-export-import-roundtrip.ts
   ```
   All three timezone executions must pass with 0 date shift errors.

4. **Verify Application Build**:
   ```bash
   npm run build
   ```
   Must compile cleanly with 0 TypeScript or Next.js build errors.
