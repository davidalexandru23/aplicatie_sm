# Handoff Report: Specification Mining for Import UI UX & Feedback (Milestone 3)

**Agent ID**: `m3_r2_spec_miner_3` (teamwork_spec_miner)  
**Parent / Caller**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_spec_miner_3/`  
**Project Root**: `/Users/davidalexandru/Documents/Proiect_SSM`  
**Target File**: `src/app/imports/new/page.tsx`, `src/app/api/imports/preview/route.ts`, `src/app/api/imports/commit/route.ts`, `src/app/api/imports/template/route.ts`  

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | UI / Downloads | Template Download Buttons | Header toolbar buttons providing instant direct downloads for empty and sample XLSX templates: "Descarcă Șablon Gol (.xlsx)" and "Descarcă Exemplu Completat (.xlsx)" | User click on link (`/api/imports/template?type=empty` or `type=sample`) | Binary `.xlsx` file download triggered via browser with appropriate filenames | HTTP 400 if invalid type, 404 if file missing | Dispatch prompt, `PROJECT.md` F7 |
| 2 | UI / Filtering | Interactive Preview Filter Tabs | Segmented control / filter tab bar above preview table allowing users to filter items by status: `Toate (${items.length})`, `Erori (${errorCount})`, `Noi (${newCount})`, and `Modificați (${modifiedCount})` | Click on tab (`'ALL' \| 'ERROR' \| 'NEW' \| 'MODIFIED'`) or click on KPI cards | Filtered subset of `items` rendered in table | If filtered list is empty, renders dedicated informative empty-state message | Dispatch prompt, `src/app/imports/new/page.tsx` line 229 |
| 3 | UI / Feedback | Visual Row-Level Error Feedback & Badges | Highlight invalid rows in table with red background (`bg-rose-50/70 border-l-4 border-l-rose-500`), red `EROARE` badge, and bulleted tags with `AlertCircle` icons detailing specific field failures | Item row data where `it.status === 'ERROR'` and `it.errors.length > 0` | Rendered rows with prominent visual error cues and field-level diagnosis | Does not crash UI; invalid cells/fields isolated | `src/app/imports/new/page.tsx` line 269, `importer.ts` line 273 |
| 4 | UI / Banners | Safe Partial Commit Policy Banners | Informational banners dynamically rendered above preview table explaining import semantics: confirming that valid rows will be committed while validation error rows are safely skipped; success banner when all rows valid; blocking banner when all rows invalid | `errorCount`, `newCount`, `modifiedCount`, `unchangedCount` from preview summary | Styled context banner (Amber for partial skip, Emerald for 100% valid, Rose for 100% blocked) | Disables commit button when `newCount + modifiedCount === 0` | Dispatch prompt, `src/lib/importer.ts` line 580 |
| 5 | API / Preview | Row Error Reporting with Field Names & Line Numbers | `POST /api/imports/preview` parses workbook and computes diffs, assigning exact Excel 1-based row index (`rowNumber`) and human-readable field errors to every item | `FormData` containing `file` (`.xlsx`) and optional `clientId` | JSON: `{ success: true, clientId, filename, parsedData, previewReport }` | HTTP 400 on missing file, HTTP 500 with descriptive error on corrupted Excel | `src/app/api/imports/preview/route.ts`, `importer.ts` line 186-276 |
| 6 | API / Commit | Atomic Transaction with Safe Error Row Skipping & Rollback | `POST /api/imports/commit` commits confirmed data via `prisma.$transaction`: safely skips invalid rows (`if (!emp.isValid) continue;`), persists valid rows, creates `ImportBatch` with error counts, and cleanly rolls back on fatal failure | JSON body: `{ clientId, parsedData, filename, operatorName }` | JSON: `{ success: true, batchId, clientId }` | HTTP 400 on missing data, HTTP 500 on fatal DB exception with full transaction rollback | `src/app/api/imports/commit/route.ts`, `importer.ts` line 486-810 |
| 7 | API / Template | Excel Template Delivery Route | `GET /api/imports/template` delivers either the empty baseline template (`outputs/ssm-client-template/Model_date_client_SSM.xlsx`) or completed sample (`Test_Client_3_Angajati.xlsx`) | Query param `type`: `'empty'` or `'sample'` | Streamed `.xlsx` binary with `Content-Disposition: attachment; filename=...` | HTTP 400 on invalid type, HTTP 404 if template file not found on disk | Dispatch prompt, `PROJECT.md` F7 |

---

## Edge Cases

| # | Feature | Input | Observed / Specified Behavior |
|---|---------|-------|-------------------|
| 1 | Safe Partial Commit | Workbook with 3 valid employees and 1 row with invalid CNP & missing fields (e.g. 4 total rows) | Preview classifies row as `ERROR` with `rowNumber: 16`, lists 8 specific errors. `summary: { totalRows: 4, errorCount: 1, newCount/modifiedCount: 3 }`. Banner notifies user that valid rows will be committed while row 16 is skipped. On commit, only valid rows are inserted/updated; `ImportBatch.errorCount` is set to 1. |
| 2 | All Rows Invalid (100% Errors) | Workbook where every row has an invalid CNP or missing mandatory fields (`newCount + modifiedCount === 0`, `errorCount > 0`) | Preview marks all rows as `ERROR`. Red AlertOctagon banner informs user: "Import Blocat: Toate rândurile conțin erori critice de validare. Nu există înregistrări valide de salvat." The "Confirmă și Salvează" button is strictly disabled (`disabled={true}`). |
| 3 | 100% Unchanged Rows | Re-uploading an identical export of an existing client without modifications (`newCount: 0, modifiedCount: 0, unchangedCount: N, errorCount: 0`) | Preview flags all rows as `UNCHANGED`. Info banner explains that all records are already synchronized with the database. Commit button is disabled to prevent redundant database writes. |
| 4 | Intra-Workbook Duplicate CNPs | Workbook containing two distinct rows with the exact same valid CNP (e.g., row 13 and row 14 have CNP `1880315410127`) | Dynamic parser tracks seen CNPs within the sheet; row 14 is flagged as `isValid: false` with error: `"CNP duplicat în fișier (rândul 13). Fiecare angajat trebuie să aibă un CNP unic."`. Row 13 remains valid, row 14 is skipped at commit. |
| 5 | Empty Personal Sheet | Workbook with valid company metadata and headers at row 12, but zero employee rows (rows 13+ empty) | `parsed.employees.length === 0`. Preview displays `totalRows: 0`. Table renders empty state: "Nu au fost găsite rânduri de angajați în foaia 'Firmă și angajați'". Commit button is disabled. Company metadata is not overwritten without confirmation. |
| 6 | Missing Mandatory Sheet | Uploaded Excel file without a sheet named "Firmă și angajați" (e.g. random spreadsheet) | `parseClientWorkbook` throws `Error('Foaia "Firmă și angajați" lipsește din registrul Excel.')`. `POST /api/imports/preview` catches and returns HTTP 500 `{ error: '...' }`. UI displays rose alert box with the exact message. |
| 7 | Unregistered Company (New Client Auto-Intake) | Uploaded Excel file with new CUI not in database, no `selectedClientId` chosen in dropdown | `preview` sets `clientId = null` and generates preview diff comparing against empty state (`items` marked as `NEW`). In `commit`, company is upserted automatically in `prisma.client` using metadata from cells B5:B8 and E5:E8, then employees are imported under the newly generated client ID. |
| 8 | Fatal Database Error Mid-Commit | Network disconnect or database constraint failure during `tx.employee.create` in `commitImport` | The interactive transaction `prisma.$transaction` triggers automatic rollback; all inserted worksites, jobs, and employee records in that batch are discarded. `POST /api/imports/commit` returns HTTP 500. UI catches error, displays alert, leaves preview intact for user retry. |
| 9 | Invalid Template Type Query | `GET /api/imports/template?type=malicious` or missing `type` parameter | Returns HTTP 400 Bad Request with JSON `{ error: 'Parametru type invalid. Valori permise: empty, sample.' }`. Prevents arbitrary path resolution. |
| 10 | Mixed Date Encodings in Excel | Column 4 (birth date) or Column 27 (hire date) contains Excel numeric serial (e.g. `32217`), Romanian string (`"15.03.1988"`), or hyphenated ISO (`"1988-03-15"`) | `parseExcelDate` safely normalizes all three variants into valid UTC JavaScript `Date` instances. If invalid text (e.g. `"nespecificat"`), returns `undefined` and triggers row validation error: `"Data nașterii este obligatorie sau invalidă."`. |

---

## 5-Component Handoff Report

### 1. Observation

Direct examination of the workspace revealed:

1. **`src/app/imports/new/page.tsx` (316 lines)**:
   - Line 108–116: Page header currently has title `"Import Registru Client SSM (Model_date_client_SSM.xlsx)"` and brief description, but **completely lacks template download buttons**.
   - Line 172–312: Preview section renders KPI counters (Total Rânduri, Angajați Noi, Modificați, Erori Validare) and a table of employees, but **has no filter tabs** (`Toate`, `Erori`, `Noi`, `Modificați`). All rows are rendered simultaneously without filtering.
   - Line 269–305: Rows are rendered with uniform `<tr className="hover:bg-slate-50/50">`. If `it.status === 'ERROR'`, it renders a small inline badge and joins errors as text (`it.errors.join(', ')`), but does **not visually highlight the table row** nor provide structured, icon-accompanied field-level diagnosis.
   - Line 230–252: Commit button is located in the table header, but **there is no informational banner** explaining the partial commit policy (confirming that valid rows are committed while invalid rows are safely skipped).
   - Line 237: Button disabling logic: `disabled={committing || previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount === 0}`.

2. **`src/app/api/imports/preview/route.ts` (75 lines)**:
   - Line 16: `const parsed = parseClientWorkbook(buffer);`.
   - Line 30–58: Calls `compareWithDatabase(clientId, parsed)` when `clientId` exists, or constructs fallback report for new client.
   - Line 46–56: Line numbers are provided via `emp.rowNumber` (1-indexed based on Excel row `r + 1`).
   - Line 48: When `clientId` is null, CNP masking is implemented via manual slice: `emp.cnp ? emp.cnp.substring(0, 5) + '********' : '—'`, whereas `compareWithDatabase` uses `maskCNP(emp.cnp)` from `@/lib/security`.

3. **`src/app/api/imports/commit/route.ts` (74 lines) & `src/lib/importer.ts` (812 lines)**:
   - Line 486 in `importer.ts`: `return await prisma.$transaction(async (tx) => { ... });`.
   - Line 580 in `importer.ts`: `if (!emp.isValid) continue; // Rândurile invalide nu se importă`.
   - Line 780–792 in `importer.ts`: Creates `ImportBatch` with `rowCount`, `newCount`, `updatedCount`, `errorCount: parsedData.employees.filter((e) => !e.isValid).length`, and `status: 'confirmed'`.
   - Line 67–72 in `commit/route.ts`: Catches errors, logs to console, and returns `{ error: err instanceof Error ? err.message : 'Eroare la salvarea în baza de date.' }` with status 500.

4. **Template Resources On Disk**:
   - `outputs/ssm-client-template/Model_date_client_SSM.xlsx`: Verified with Node.js `xlsx`. Sheets: `[ 'Instrucțiuni', 'Firmă și angajați', 'Context posturi' ]`. Headers at row 12 (`Nume*`, `Prenume*`, `CNP*`), row 13 is empty (`undefined`). This is the clean **Empty Template**.
   - `Test_Client_3_Angajati.xlsx` (and `public/Test_Client_3_Angajati.xlsx`): Verified with Node.js `xlsx`. Sheets: `[ 'Instrucțiuni', 'Firmă și angajați', 'Context posturi' ]`. Company: `NEXUS SOLUTIONS S.R.L.` (CUI: `RO38765432`), 3 complete valid employees on rows 13, 14, 15. This is the **Completed Sample**.
   - `src/app/api/imports/template/route.ts`: Does **not exist** yet; needs implementation as part of F7.

---

### 2. Logic Chain

1. **User Requirement & UX Flow**:
   - Users importing SSM registries need to download the official templates directly from the import page before filling them out. Providing "Descarcă Șablon Gol (.xlsx)" and "Descarcă Exemplu Completat (.xlsx)" reduces friction and eliminates formatting errors.
   - When a user uploads a sheet with 50 employees where 3 have invalid CNPs, the user needs to inspect *only the 3 errors* without scrolling through 47 valid rows. Filter tabs (`Toate (${items.length})`, `Erori (${errorCount})`, `Noi (${newCount})`, `Modificați (${modifiedCount})`) allow instant isolation of problematic rows.
   - When errors are present, users fear data corruption or loss. An explicit **Information Banner** explaining that *"Validele vor fi salvate, erorile vor fi omise în siguranță"* provides psychological safety and conforms to non-destructive import principles.

2. **Backend Transactional Integrity**:
   - `importer.ts` line 580 executes `if (!emp.isValid) continue;`. Thus, partial commit is already naturally supported by the engine!
   - Enclosing the entire sequence inside `prisma.$transaction` guarantees atomic rollback on any unhandled failure (e.g. database connection dropped, unique key collision). If any fatal error occurs, Prisma guarantees 0 orphaned records.
   - In `preview/route.ts`, `rowNumber` corresponds directly to the Excel row visible in Microsoft Excel / LibreOffice (row 13 = first employee), and `emp.errors` contains human-readable Romanian field explanations.

3. **Template Endpoint Architecture**:
   - `GET /api/imports/template?type=empty` serves `outputs/ssm-client-template/Model_date_client_SSM.xlsx` as attachment `Model_date_client_SSM_sablon_gol.xlsx`.
   - `GET /api/imports/template?type=sample` serves `Test_Client_3_Angajati.xlsx` as attachment `Model_date_client_SSM_exemplu_completat.xlsx`.
   - Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

---

### 3. Caveats

1. **Client Selection Ambiguity**: If an Excel file has no CUI in cell B6 and no client is selected in the dropdown, the commit route returns HTTP 400. The UI handles this via `error` state, but the template instructions must remind users that CUI in B6 is required.
2. **Dynamic Range Calculation (`!ref`)**: In `importer.ts`, row parsing uses `XLSX.utils.decode_range(sFirm['!ref'] || 'A1:AH250')`. If a user manually copies and pastes rows into Excel without expanding the sheet range or if a third-party generator produces an incomplete `!ref`, rows past `range.e.r` could be skipped. The specification recommends scanning until 10 consecutive empty rows are encountered, or defaulting to `AH500`.
3. **No Database Writes in Spec Miner Phase**: This report is read-only specification; no source files have been modified.

---

### 4. Conclusion

The existing backend architecture (`importer.ts`, `preview/route.ts`, and `commit/route.ts`) already implements atomic transactions, safe error row skipping, and row-level line numbering. However:
1. `src/app/imports/new/page.tsx` must be enhanced with:
   - Two top-level download buttons linking to `/api/imports/template?type=empty` and `type=sample`.
   - Filter tabs above the preview table (`Toate`, `Erori`, `Noi`, `Modificați`) driven by an active tab state.
   - Visual row highlighting (`bg-rose-50/70 border-l-4 border-l-rose-500`) and structured error badges for invalid rows.
   - Three dynamic information banners (Safe Partial Commit, 100% Valid, and 100% Blocked).
2. `src/app/api/imports/template/route.ts` must be created to serve the blank and sample Excel files with proper MIME headers.
3. `importer.ts` should enforce intra-sheet duplicate CNP detection to avoid ambiguous overwrites.

---

### 5. Concrete UI & API Design Specifications

#### A. UI Design for `src/app/imports/new/page.tsx`

```tsx
// 1. Template Download Toolbar (Right side of header or sub-header)
<div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-slate-100">
  <span className="text-xs font-semibold text-slate-500">Șabloane oficiale:</span>
  <a
    href="/api/imports/template?type=empty"
    download="Model_date_client_SSM_sablon_gol.xlsx"
    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
  >
    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
    <span>Descarcă Șablon Gol (.xlsx)</span>
  </a>
  <a
    href="/api/imports/template?type=sample"
    download="Model_date_client_SSM_exemplu_completat.xlsx"
    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg shadow-sm transition"
  >
    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
    <span>Descarcă Exemplu Completat (.xlsx)</span>
  </a>
</div>

// 2. Safe Partial Commit Information Banners
{previewResult && (
  <>
    {/* State A: Partial Commit (Errors exist, but there are valid rows to import) */}
    {previewResult.previewReport.summary.errorCount > 0 && 
     (previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount > 0) && (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Regim de Import Parțial Sigur:</span>{' '}
          Au fost identificate <strong>{previewResult.previewReport.summary.errorCount} rânduri cu erori de validare</strong> (marcate cu roșu).
          La confirmare, sistemul va salva exclusiv cele{' '}
          <strong>{previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount} rânduri valide</strong>{' '}
          ({previewResult.previewReport.summary.newCount} noi, {previewResult.previewReport.summary.modifiedCount} modificate).
          Rândurile cu erori vor fi omise în siguranță, fără a corupe baza de date. Puteți descărca registrul, corecta erorile și reîncărca doar angajații omiși ulterior.
        </div>
      </div>
    )}

    {/* State B: 100% Valid Rows */}
    {previewResult.previewReport.summary.errorCount === 0 && 
     (previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount > 0) && (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 text-xs leading-relaxed shadow-sm">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Fișier validat cu succes:</span>{' '}
          Toate cele <strong>{previewResult.previewReport.summary.totalRows} rânduri</strong> respectă cerințele de integritate
          (CNP valid, acte de identitate, domiciliu și post). Apăsați butonul de confirmare pentru a sincroniza datele în dosarul firmei.
        </div>
      </div>
    )}

    {/* State C: 100% Errors / Blocked */}
    {previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount === 0 && (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs leading-relaxed shadow-sm">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Import Blocat:</span>{' '}
          {previewResult.previewReport.summary.errorCount > 0 ? (
            <>Toate cele <strong>{previewResult.previewReport.summary.errorCount} rânduri</strong> conțin erori critice de validare. Nu există înregistrări valide de salvat. Consultați lista erorilor din tab-ul <em>Erori</em> și remediați fișierul Excel înainte de a reîncărca.</>
          ) : (
            <>Toate înregistrările din fișier sunt deja identice cu cele din baza de date. Nu au fost detectate modificări.</>
          )}
        </div>
      </div>
    )}
  </>
)}

// 3. Interactive Filter Tabs (State: activeFilterTab: 'ALL' | 'ERROR' | 'NEW' | 'MODIFIED')
<div className="flex items-center gap-1 border-b border-slate-200 px-6 py-2 bg-slate-50/50">
  <button
    onClick={() => setActiveFilterTab('ALL')}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
      activeFilterTab === 'ALL'
        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
        : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    <span>Toate</span>
    <span className="px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] text-slate-600">
      {previewResult.previewReport.items.length}
    </span>
  </button>

  <button
    onClick={() => setActiveFilterTab('ERROR')}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
      activeFilterTab === 'ERROR'
        ? 'bg-rose-50 text-rose-800 shadow-sm border border-rose-200'
        : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    <span>Erori</span>
    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
      previewResult.previewReport.summary.errorCount > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-500'
    }`}>
      {previewResult.previewReport.summary.errorCount}
    </span>
  </button>

  <button
    onClick={() => setActiveFilterTab('NEW')}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
      activeFilterTab === 'NEW'
        ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200'
        : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    <span>Noi</span>
    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full text-[10px]">
      {previewResult.previewReport.summary.newCount}
    </span>
  </button>

  <button
    onClick={() => setActiveFilterTab('MODIFIED')}
    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
      activeFilterTab === 'MODIFIED'
        ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-200'
        : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    <span>Modificați</span>
    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px]">
      {previewResult.previewReport.summary.modifiedCount}
    </span>
  </button>
</div>

// 4. Row-Level Styling for Invalid Rows in Table
<tr 
  key={it.rowNumber} 
  className={`transition ${
    it.status === 'ERROR' 
      ? 'bg-rose-50/60 hover:bg-rose-100/60 border-l-4 border-l-rose-500' 
      : 'hover:bg-slate-50/50'
  }`}
>
  <td className="px-4 py-3 font-mono text-slate-400">
    <div className="flex items-center gap-1">
      {it.status === 'ERROR' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
      <span>#{it.rowNumber}</span>
    </div>
  </td>
  {/* Differences / Errors Column */}
  <td className="px-4 py-3">
    {it.errors && it.errors.length > 0 ? (
      <div className="space-y-1">
        {it.errors.map((err: string, i: number) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded border border-rose-200">
            <span className="font-semibold">•</span>
            <span>{err}</span>
          </div>
        ))}
      </div>
    ) : ...}
  </td>
</tr>
```

#### B. API Route Implementation Spec for `src/app/api/imports/template/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'empty';

    let relativePath = '';
    let downloadFilename = '';

    if (type === 'empty') {
      relativePath = path.join('outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
      downloadFilename = 'Model_date_client_SSM_sablon_gol.xlsx';
    } else if (type === 'sample') {
      relativePath = path.join('Test_Client_3_Angajati.xlsx');
      downloadFilename = 'Model_date_client_SSM_exemplu_completat.xlsx';
    } else {
      return NextResponse.json(
        { error: 'Parametru type invalid. Valori permise: empty, sample.' },
        { status: 400 }
      );
    }

    const fullPath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: `Fișierul șablon nu a fost găsit la calea: ${relativePath}` },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la descărcarea șablonului.' },
      { status: 500 }
    );
  }
}
```

---

### 6. Verification Method

To independently verify all specified behaviors:

1. **Verify Template Files & Column Resolution**:
   ```bash
   node -e "
   const xlsx = require('xlsx');
   const wb = xlsx.readFile('outputs/ssm-client-template/Model_date_client_SSM.xlsx');
   console.log('Empty sheets:', wb.SheetNames);
   const wb2 = xlsx.readFile('Test_Client_3_Angajati.xlsx');
   console.log('Sample rows:', wb2.Sheets['Firmă și angajați']['A13']?.v, wb2.Sheets['Firmă și angajați']['A14']?.v);
   "
   ```

2. **Verify Dirty Row Parsing & Line Number Attribution**:
   ```bash
   npx tsx -e "
   import fs from 'fs';
   import * as XLSX from 'xlsx';
   import { parseClientWorkbook } from './src/lib/importer';
   const buf = fs.readFileSync('Test_Client_3_Angajati.xlsx');
   const wb = XLSX.read(buf, { type: 'buffer' });
   const s = wb.Sheets['Firmă și angajați'];
   s['A16'] = { t: 's', v: 'Popescu' };
   s['D16'] = { t: 's', v: '0000000000000' };
   s['!ref'] = 'A1:AH20';
   const parsed = parseClientWorkbook(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
   const bad = parsed.employees.find(e => e.rowNumber === 16);
   console.log('Row:', bad.rowNumber, 'Valid:', bad.isValid, 'Errors count:', bad.errors.length);
   if (bad.rowNumber !== 16 || bad.isValid !== false) process.exit(1);
   "
   ```

3. **Verify Safe Partial Commit Filter in `importer.ts`**:
   Inspect line 580 in `src/lib/importer.ts` confirming:
   ```typescript
   for (const emp of parsedData.employees) {
     if (!emp.isValid) continue; // Rândurile invalide nu se importă
   ```

4. **Verify Application Build**:
   ```bash
   npm run build
   ```
