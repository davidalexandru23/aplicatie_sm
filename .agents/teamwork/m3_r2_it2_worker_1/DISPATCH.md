## 2026-11-03T16:16:17Z
You are teamwork_worker for Milestone 3 Iteration 2 Remediation.
Your working directory is: /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_it2_worker_1/
Project root is: /Users/davidalexandru/Documents/Proiect_SSM

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Read the explorer's exact drop-in blueprints at:
/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_it2_explorer_1/handoff.md

EXCLUSIVE WRITE OWNERSHIP:
- src/lib/importer.ts
- src/app/api/imports/commit/route.ts

TASKS TO IMPLEMENT (apply the 8 drop-in chunks from Explorer report):
1. In `src/lib/importer.ts`:
   - Chunk 1 & 2: Update cushion from `+4h` to `+12h` (`val.getTime() + 12 * 3600 * 1000`) in `parseExcelDate()` (lines 140 and 193) so that any Date instance parsed from anywhere in the world falls squarely onto the intended calendar day in UTC.
   - Chunk 3: Add `'c.n.p.'`, `'c.n.p'`, `'c.n.p. / pasaport'`, `'c.n.p./pasaport'` to `HEADER_TOKEN_MAP.cnp`.
   - Chunk 4: In `parseClientWorkbook()`, remove `cellDates: true` (`XLSX.read(buffer, { type: 'buffer' })`) so Excel native date cells are parsed as numbers via `XLSX.SSF.parse_date_code` with 100% mathematical invariance across all 26 world timezones.
   - Chunk 5: In `checkRowHasHeaders()`, check `if (norm.includes('cnp') || norm.includes('c.n.p') || norm.includes('identificator')) hasCnp = true;`.
   - Chunk 6 & 7: In `commitImport()`, add `if (!emp.isValid) continue;` to both worksite and job creation loops (lines 782 & 820) so invalid employee rows do not generate phantom worksites or jobs in the database.
2. In `src/app/api/imports/commit/route.ts`:
   - Chunk 8: Add defensive guard: if `parsedData.employees.length > 0 && parsedData.employees.every((e) => !e.isValid)`, return HTTP 400 (`Niciun rând valid de importat. Toate rândurile conțin erori de validare.`).

VERIFICATION COMMANDS TO RUN AND DOCUMENT:
1. `TZ=Asia/Tokyo npx tsx scripts/adversarial-excel-roundtrip-timezone.ts --worker-tz` (must pass 100%, exit code 0)
2. `npx tsx scripts/adversarial-excel-roundtrip-timezone.ts` (13/13 tests pass, exit code 0)
3. `npx tsx scripts/adversarial-excel-dirty-stress.ts` (7/7 scenarios pass, exit code 0)
4. `npx tsx scripts/verify-excel-import-export.ts` (6/6 tests pass, exit code 0)
5. `npx tsx scripts/test-export-import-roundtrip.ts` (100% pass, exit code 0)
6. `npx tsx scripts/verify-all.ts` (124/124 items pass, exit code 0)
7. `npm run build` (clean Next.js production build, 0 errors, 0 warnings)

When done, write /Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m3_r2_it2_worker_1/handoff.md and notify me via send_message with command outputs and status.
