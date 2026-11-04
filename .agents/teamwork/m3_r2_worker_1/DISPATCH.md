## 2026-11-03T03:14:29Z
You are teamwork_worker for Milestone 3 (Robust Excel Import/Export & Template Management).
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_worker_1/
Project root is: /Users/davidalexandru/Documents/Proiect_SSM

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Read the specifications and analysis in:
1. /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/PROJECT.md
2. /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_explorer_1/handoff.md
3. /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_explorer_2/handoff.md
4. /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_spec_miner_3/handoff.md

EXCLUSIVE WRITE OWNERSHIP:
- src/lib/importer.ts
- src/lib/exporter.ts
- src/app/api/imports/template/route.ts
- src/app/imports/new/page.tsx
- scripts/verify-excel-import-export.ts

YOUR IMPLEMENTATION TASKS:
1. `src/lib/importer.ts`:
   - Implement dynamic header mapping on row 12 of `Firmă și angajați` with fallback to canonical column layout if headers cannot be resolved. Use diacritic stripping, lowercasing, and whitespace normalization.
   - Implement timezone-neutral UTC `parseExcelDate(val)` supporting numeric serials (via XLSX.SSF.parse_date_code), string serials ('32888'), DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, and ISO YYYY-MM-DD.
   - Add intra-file duplicate CNP detection (`seenCnpMap`) flagging subsequent rows with `CNP duplicat în fișier (apare deja la rândul X)`.
   - Add expat passport handling: if non-Romanian citizenship or docType is passport, validate passport length (>= 3 chars) instead of statutory 13-digit CNP checksum.
   - Add initial compliance dates auto-init: in `ParsedEmployee`, accept optional compliance dates; on `commitImport` for new employees, default `medicalLastExamDate`, `ssmLastTrainingDate`, and `psiLastTrainingDate` to `emp.hireDate` if omitted.
   - Fix diff detection in `compareWithDatabase` for employees lacking identityDocument or residenceAddress relations, plus phone and email diffs.

2. `src/app/api/imports/template/route.ts`:
   - Implement GET route with `type=empty` (serves `outputs/ssm-client-template/Model_date_client_SSM.xlsx` as `Model_date_client_SSM_sablon_gol.xlsx`) and `type=sample` (serves `Test_Client_3_Angajati.xlsx` as `Model_date_client_SSM_exemplu_completat.xlsx`). Return 400 for invalid type, 404 if file missing, with MIME type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

3. `src/lib/exporter.ts`:
   - Harden `formatDmy` using `d.getUTCDate()`, `d.getUTCMonth() + 1`, and `d.getUTCFullYear()` so dates do not drift when running in timezones behind UTC.
   - Ensure complete round-trip fidelity: fallback birthDate from CNP if missing, fallback worksite/job mappings to ensure exported workbooks re-import with 100% valid rows.
   - Include unassociated worksites/jobs in `Context posturi`.

4. `src/app/imports/new/page.tsx`:
   - Add template download buttons linking to `/api/imports/template?type=empty` ("Descarcă Șablon Gol (.xlsx)") and `/api/imports/template?type=sample` ("Descarcă Exemplu Completat (.xlsx)").
   - Add interactive filter tabs above preview table: `Toate (${items.length})`, `Erori (${errorCount})`, `Noi (${newCount})`, `Modificați (${modifiedCount})`.
   - Add dynamic information banners for: Safe Partial Commit (explaining valid rows are committed while invalid rows are skipped), 100% Valid, and 100% Blocked.
   - Enhance row-level error styling: red row highlight (`bg-rose-50/70 border-l-4 border-l-rose-500`), red `EROARE` badge, and bulleted tags with AlertTriangle/AlertCircle icons for field failures.

5. `scripts/verify-excel-import-export.ts`:
   - Create comprehensive verification script testing:
     * Test 1: Clean parsing of `Test_Client_3_Angajati.xlsx` (3/3 valid, 0 errors).
     * Test 2: Dirty data resilience and line number attribution (corrupted CNP, missing fields, intra-file duplicate CNP flagged with exact Excel row number).
     * Test 3: Safe partial commit and atomic rollback (valid rows committed, invalid skipped).
     * Test 4: Expat passport acceptance.
     * Test 5: Template download API returns valid binary files for empty and sample.
     * Test 6: Round-trip export-import fidelity.
   - Must output clear test results and exit with code 0 on success.

VERIFICATION COMMANDS TO RUN AND DOCUMENT:
1. `npx tsx scripts/verify-excel-import-export.ts`
2. `npx tsx scripts/test-export-import-roundtrip.ts`
3. `npx tsx scripts/adversarial-seed-roundtrip-stress.ts`
4. `npx tsx scripts/verify-all.ts`
5. `npm run build`

When done, write /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_worker_1/handoff.md and notify me via send_message with command outputs and status.
