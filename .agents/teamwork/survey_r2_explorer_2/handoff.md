# Handoff Report: Excel Import/Export (R3) & Data Model Synchronization

**Author**: survey_r2_explorer_2 (teamwork_explorer)  
**Date**: 2026-11-02T20:06:00Z  
**Target Milestone**: R3 (Stable & Intuitive Excel Import/Export)  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/survey_r2_explorer_2/`  

---

## 1. Observation

### 1.1 Test File Forensics: `/Users/davidalexandru/Documents/Proiect_SSM/Test_Client_3_Angajati.xlsx`
Direct programmatic inspection via `xlsx` (SheetJS) revealed:
- **Workbook Sheets**: 3 sheets:
  1. `Instrucțiuni` (Cell Range: `A1:B11`, 11 rows)
  2. `Firmă și angajați` (Cell Range: `A1:AH15`, 15 rows)
  3. `Context posturi` (Cell Range: `A1:I7`, 7 rows)
- **Sheet 1 (`Instrucțiuni`)**: Contains guidance for clients on:
  - Single company rule (CUI / company filled once at top of sheet 2).
  - 1 row per employee.
  - Identity document requirements: enter CNP and document numbers as text to preserve leading zeros.
  - Secure transmission warnings, data minimization, leaving employees (`PLECAT` + `Data plecării`), and hygiene course registrations.
- **Sheet 2 (`Firmă și angajați`)**:
  - **Company Metadata Block (Cells A5:E8)**:
    - B5 (`Denumire firmă*`): `"NEXUS SOLUTIONS S.R.L."` [type: `'s'`]
    - B6 (`CUI*`): `"RO38765432"` [type: `'s'`]
    - B7 (`Nr. Registrul Comerțului`): `"J40/5678/2021"` [type: `'s'`]
    - B8 (`Sediu social*`): `"București, Bd. Aviatorilor nr. 45, Sector 1"` [type: `'s'`]
    - E5 (`Reprezentant legal`): `"Munteanu Cristian"` [type: `'s'`]
    - E6 (`Persoană de contact*`): `"Simona Georgescu"` [type: `'s'`]
    - E7 (`Email contact`): `"contact@nexus-solutions.ro"` [type: `'s'`]
    - E8 (`Telefon contact`): `"0722334455"` [type: `'s'`]
  - **Group Headers (Row 11)**:
    - `A11:H11` ("Date personale", cols 0-7)
    - `I11:N11` ("Act de identitate", cols 8-13)
    - `O11:V11` ("Domiciliu", cols 14-21)
    - `W11:X11` ("Contact", cols 22-23)
    - `Y11:AD11` ("Încadrare și SSM", cols 24-29)
    - `AE11:AG11` ("Curs igienă", cols 30-32)
    - `AH11` ("Altele", col 33)
  - **Column Headers (Row 12, 34 Columns)**:
    - `A12` (col 0): `Nume*`
    - `B12` (col 1): `Prenume*`
    - `C12` (col 2): `Sex conform actului`
    - `D12` (col 3): `CNP*`
    - `E12` (col 4): `Data nașterii*`
    - `F12` (col 5): `Localitatea nașterii`
    - `G12` (col 6): `Județ/sector naștere`
    - `H12` (col 7): `Cetățenie`
    - `I12` (col 8): `Tip act (CI/CEI/pașaport)`
    - `J12` (col 9): `Serie act`
    - `K12` (col 10): `Număr act*`
    - `L12` (col 11): `Emis de`
    - `M12` (col 12): `Data emiterii`
    - `N12` (col 13): `Data expirării`
    - `O12` (col 14): `Județ/sector domiciliu*`
    - `P12` (col 15): `Localitate domiciliu*`
    - `Q12` (col 16): `Stradă*`
    - `R12` (col 17): `Număr*`
    - `S12` (col 18): `Bloc`
    - `T12` (col 19): `Scara`
    - `U12` (col 20): `Etaj`
    - `V12` (col 21): `Apartament`
    - `W12` (col 22): `Email (opțional)`
    - `X12` (col 23): `Telefon (opțional)`
    - `Y12` (col 24): `Funcție / post*`
    - `Z12` (col 25): `Punct de lucru*`
    - `AA12` (col 26): `Data începerii pe post/punct`
    - `AB12` (col 27): `Data angajării*`
    - `AC12` (col 28): `Status*`
    - `AD12` (col 29): `Data plecării`
    - `AE12` (col 30): `Solicită curs igienă?`
    - `AF12` (col 31): `Modul solicitat`
    - `AG12` (col 32): `Sesiune preferată`
    - `AH12` (col 33): `Observații administrative`
  - **Employee Data (Rows 13-15)**:
    - **Row 13 (Alexandru Stan)**: Nume: `Stan`, Prenume: `Alexandru`, Sex: `M`, CNP: `'1880315410127'`, DoB: `'15.03.1988'`, Loc: `București`, Jud/Sec: `Sector 1`, Cetățenie: `Română`, Act: `CI` `RD` `'876543'`, Emis: `SPCLEP S1`, EmisLa: `'10.04.2021'`, Expira: `'15.03.2031'`, Dom: `București`, `București`, `Str. Dorobanți` nr. `24` Bl `B2` Sc `A` Et `4` Ap `18`, Email: `alexandru.stan@nexus-solutions.ro`, Tel: `'0744111222'`, Post: `Inginer Sisteme Software`, Punct: `Sediul Central`, Inceput: `'15.01.2026'`, Angajare: `'15.01.2026'`, Status: `ACTIV`, Igiena: `DA`, Modul: `Modulul 1 - Servicii Generale`, Sesiune: `Noiembrie 2026`, Obs: `Normă întreagă 8h/zi`.
    - **Row 14 (Ioana-Raluca Dumitru)**: Nume: `Dumitru`, Prenume: `Ioana-Raluca`, Sex: `F`, CNP: `'2941124120456'`, DoB: `'24.11.1994'`, Loc: `Cluj-Napoca`, Jud/Sec: `Cluj`, Cetățenie: `Română`, Act: `CI` `KX` `'234567'`, Emis: `SPCLEP Cluj`, EmisLa: `'05.12.2019'`, Expira: `'24.11.2029'`, Dom: `Ilfov`, `Otopeni`, `Str. 23 August` nr. `112`, Email: `ioana.dumitru@nexus-solutions.ro`, Tel: `'0755888999'`, Post: `Specialist Resurse Umane`, Punct: `Sediul Central`, Inceput: `'01.02.2026'`, Angajare: `'01.02.2026'`, Status: `ACTIV`, Igiena: `NU`, Obs: `Responsabil dosare personal`.
    - **Row 15 (Gheorghe Barbu)**: Nume: `Barbu`, Prenume: `Gheorghe`, Sex: `M`, CNP: `'1790608080231'`, DoB: `'08.06.1979'`, Loc: `Brașov`, Jud/Sec: `Brașov`, Cetățenie: `Română`, Act: `CI` `BV` `'456789'`, Emis: `SPCLEP Brasov`, EmisLa: `'12.07.2018'`, Expira: `'08.06.2028'`, Dom: `București`, `București`, `Bd. Iuliu Maniu` nr. `78` Bl `M3` Sc `2` Et `1` Ap `35`, Email: `gheorghe.barbu@nexus-solutions.ro`, Tel: `'0722999000'`, Post: `Tehnician Mentenanță și Suport`, Punct: `Punct de Lucru Vest`, Inceput: `'10.02.2026'`, Angajare: `'10.02.2026'`, Status: `ACTIV`, Igiena: `DA`, Modul: `Modulul 2 - Mentenanță și Instalații`, Sesiune: `Decembrie 2026`, Obs: `Echipament de protecție alocat`.
- **Sheet 3 (`Context posturi`)**:
  - **Headers (Row 4, 9 Columns)**:
    `A4`: `Punct de lucru*`, `B4`: `Adresă punct de lucru*`, `C4`: `Activitate la punct*`, `D4`: `Funcție / post*`, `E4`: `Cod COR (dacă este cunoscut)`, `F4`: `Activități principale*`, `G4`: `Echipamente/utilaje folosite`, `H4`: `Condiții de lucru relevante`, `I4`: `Număr aproximativ lucrători`.
  - **Data Rows (Rows 5-7)**:
    - Row 5: `Sediul Central`, `București, Bd. Aviatorilor nr. 45, Sector 1`, `Consultanță, dezvoltare software și management`, `Inginer Sisteme Software`, COR `251201`, `Dezvoltare aplicații, analiză date, lucru la videoterminale`, `Laptop, monitoare LCD, tastatură, mouse ergonomic`, `Activitate de birou, climatizare, iluminat natural și artificial adecvat`, `5` workers.
    - Row 6: `Sediul Central`, `București, Bd. Aviatorilor nr. 45, Sector 1`, `Consultanță, dezvoltare software și management`, `Specialist Resurse Umane`, COR `242314`, `Recrutare, administrare personal, evidență SSM/HR, instruiri`, `PC, imprimantă, telefon, dulap arhivă`, `Activitate sedentară de birou, ecrane de vizualizare`, `2` workers.
    - Row 7: `Punct de Lucru Vest`, `București, Bd. Iuliu Maniu nr. 78, Sector 6`, `Laborator tehnic și mentenanță echipamente`, `Tehnician Mentenanță și Suport`, COR `311305`, `Verificare instalații, montaj echipamente hardware, mentenanță rețele`, `Truse scule manuale și electrice izolate, multimetru`, `Deplasări locale, lucru cu echipamente electrice de joasă tensiune, EIP necesar`, `3` workers.
- **Empty Template Location**: `/Users/davidalexandru/Documents/Proiect_SSM/outputs/ssm-client-template/Model_date_client_SSM.xlsx` contains the identical 3-sheet structure with pre-styled empty rows (rows 13-212 in `Firmă și angajați`).

### 1.2 Codebase & Dependency Audit
- **Libraries in `package.json`**:
  `"xlsx": "^0.18.5"` (SheetJS) is installed and active. No `exceljs` is installed.
- **Existing Files & Implementation**:
  - `src/lib/importer.ts` (812 lines):
    - `parseExcelDate(val)`: Lines 108–132.
    - `validateCNP(cnp)`: Lines 143–155.
    - `parseClientWorkbook(buffer)`: Lines 160–306.
    - `compareWithDatabase(clientId, parsedData)`: Lines 311–475.
    - `commitImport(clientId, parsedData, operatorName, filename)`: Lines 480–811.
  - `src/lib/exporter.ts` (270 lines):
    - `exportClientToExcel(clientId)`: Lines 45–270.
  - `src/app/api/imports/preview/route.ts` (75 lines): Accepts file upload, generates preview report.
  - `src/app/api/imports/commit/route.ts` (74 lines): Commits validated import inside Prisma transaction.
  - `src/app/api/clients/[id]/export/route.ts` (47 lines): Streams `.xlsx` client register file.
  - `src/app/imports/new/page.tsx` (316 lines): UI for file upload, KPI summary, and diff table.
  - `src/app/clients/[id]/page.tsx`: Line 132 links to `/api/clients/${client.id}/export`, line 140 links to `/imports/new?clientId=${client.id}`.

### 1.3 Forensic Flaw Discovered in Database Seed vs Round-Trip Export
When testing `exportClientToExcel` on `RO38765432` and re-importing the resulting `.xlsx`:
```
  Emp 1: Barbu Gheorghe, CNP: 1790608080231, Valid: false, Errors: Numărul actului de identitate este obligatoriu.; Județul de domiciliu este obligatoriu.; Localitatea de domiciliu este obligatorie.; Strada este obligatorie.; Numărul străzii este obligatoriu.
  Emp 2: Dumitru Ioana-Raluca, CNP: 2941124120456, Valid: false, Errors: Numărul actului de identitate este obligatoriu.; Județul de domiciliu este obligatoriu.; Localitatea de domiciliu este obligatorie.; Strada este obligatorie.; Numărul străzii este obligatoriu.
  Emp 3: Stan Alexandru, CNP: 1880315410127, Valid: false, Errors: Numărul actului de identitate este obligatoriu.; Județul de domiciliu este obligatoriu.; Localitatea de domiciliu este obligatorie.; Strada este obligatorie.; Numărul străzii este obligatoriu.
  Emp 4: Vasilescu Elena, CNP: 2980514410023, Valid: true, Errors: 
```
Inspection of `prisma/seed.ts` (line 529) confirmed: `prisma.identityDocument` and `prisma.residenceAddress` were seeded ONLY for Elena Vasilescu! Employees 1-3 (Stan, Dumitru, Barbu) had null identity documents and residence addresses in the database seed.

---

## 2. Logic Chain

1. **Test Data Compatibility**:
   - `Test_Client_3_Angajati.xlsx` aligns with `Model_date_client_SSM.xlsx`. When parsed with `parseClientWorkbook`, all 3 employees and 3 job contexts parsed with 100% validity (`isValid: true`, `errors: []`).
   - However, the cells are string-formatted (`DD.MM.YYYY`). If a user inputs standard Excel date serial numbers or alternative string formats (e.g. `YYYY-MM-DD` or `DD/MM/YYYY`), a brittle parser will fail.

2. **Column Hardcoding Risk**:
   - In `src/lib/importer.ts`, employee parsing reads fixed column offsets (`c: 0` for name, `c: 3` for CNP, `c: 10` for doc number, `c: 24` for job, etc.).
   - If a client alters column positions, inserts a notes column, or deletes an optional column, all subsequent columns are corrupted.
   - Dynamic header mapping (scanning Row 12 for header names normalized without asterisks or spaces) eliminates this vulnerability.

3. **Milestone 1 Compliance Field Gap**:
   - Milestone 1 added 14 compliance columns to `Employee` (`medicalLastExamDate`, `ssmLastTrainingDate`, `psiLastTrainingDate`, `hygieneLastExamDate`, intervals, verdicts).
   - Neither `Test_Client_3_Angajati.xlsx` nor `Model_date_client_SSM.xlsx` contains compliance date columns.
   - In consequence, importing a new employee sets all compliance dates to `null`, resulting in a `MISSING` compliance badge in the dashboard.
   - Under Romanian law (HG 355/2007, Legea 319/2006), medical examination at hiring and introductory SSM/PSI training are legally mandated on `hireDate`. Initializing initial compliance dates to `hireDate` when compliance dates are omitted (or allowing optional compliance columns AI–AQ) harmonizes the import with the compliance engine.

4. **Seed Database Synchronization**:
   - Because `seed.ts` only created `IdentityDocument` and `ResidenceAddress` for Elena Vasilescu, exporting the company via `/api/clients/[id]/export` produces rows without ID numbers or addresses for Stan, Dumitru, and Barbu.
   - Re-importing that exported file immediately triggers validation errors.
   - Synchronizing `seed.ts` to populate identity documents and residence addresses for all seeded employees ensures round-trip export-import fidelity.

5. **Missing Template Download Route**:
   - The user cannot currently download the blank `Model_date_client_SSM.xlsx` or the sample file `Test_Client_3_Angajati.xlsx` from within the web interface.
   - Creating `GET /api/imports/template?type=empty|sample` and linking it in `src/app/imports/new/page.tsx` fulfills the requirement for a downloadable template.

6. **Missing Automated Verification for Import/Export**:
   - Requirement R4 explicitly mandates automated verification of "Successful import and export of employee and client data via Excel, including error handling for invalid rows".
   - `scripts/verify-all.ts` currently verifies template auto-completion, compliance intervals, and `npm run build`, but lacks an import/export test gate.
   - Creating `scripts/verify-excel-import-export.ts` and wiring it into `scripts/verify-all.ts` closes the verification gap.

---

## 3. Caveats

- **No Caveats on Structure**: The Excel format and schema models are completely explored and verified.
- **Assumption regarding Expatriates**: Foreign workers may not hold a standard 13-digit Romanian CNP. The validator should permit non-Romanian citizens holding passports/residence permits to pass with an informational notice rather than blocking import.
- **Read-Only Investigation**: In compliance with subagent rules, no source files were modified during this investigation.

---

## 4. Conclusion

The Excel import/export subsystem (`src/lib/importer.ts`, `src/lib/exporter.ts`, `src/app/imports/new/page.tsx`, and `/api/imports/*`) already possesses a solid architectural foundation with atomic database transactions, audit logging, and CNP masking. To achieve production readiness under R3 and acceptance under R4, the following concrete implementation plan must be executed:

### Concrete Implementation Plan:

#### 1. Resilient Parsing Engine (`src/lib/importer.ts`)
- **Dynamic Header Resolution**: Scan row 12 of `Firmă și angajați` and map normalized column names (`nume`, `prenume`, `cnp`, `data nasterii`, `numar act`, `judet/sector domiciliu`, `strada`, `numar`, `functie / post`, `punct de lucru`, `data angajarii`, `status`, etc.) to column indices, removing reliance on hardcoded column numbers.
- **UTC-Safe Date Parsing**: Support Excel serial numbers, `DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY`, and ISO `YYYY-MM-DD` using `Date.UTC(y, m, d)` to prevent 1-day timezone rollover.
- **Intra-File Duplicate Detection**: Identify and flag duplicate CNPs appearing multiple times within the same uploaded Excel file.
- **Expat Resilience**: If `citizenship !== 'Română'` or `docType === 'Pașaport'`, bypass strict 13-digit CNP checksum validation.
- **Compliance Field Synchronization**: If compliance dates are missing for a new employee, initialize initial medical exam and SSM/PSI training dates to `hireDate`, or parse optional compliance columns (Cols AI–AQ) if present.
- **Diff Detection Fix**: Fix `compareWithDatabase` so that adding an identity document or address to an employee who previously lacked one is marked as `MODIFIED` rather than `UNCHANGED`.

#### 2. Seed Data Alignment (`prisma/seed.ts`)
- Add `identityDocument` and `residenceAddress` records for Alexandru Stan, Ioana-Raluca Dumitru, Gheorghe Barbu, Marius Radu, and Andreea Marin to ensure 100% round-trip export fidelity.

#### 3. Template Download API (`src/app/api/imports/template/route.ts`)
- Implement `GET /api/imports/template`:
  - `?type=empty`: Serves `/outputs/ssm-client-template/Model_date_client_SSM.xlsx`.
  - `?type=sample`: Serves `/Test_Client_3_Angajati.xlsx` as `Model_date_client_SSM_Exemplu.xlsx`.

#### 4. UI Component Enhancements (`src/app/imports/new/page.tsx`)
- Add "Descarcă Șablon Gol (.xlsx)" and "Descarcă Exemplu Completat (.xlsx)" buttons at the top of the import screen.
- Add drag-and-drop file upload target.
- Add status filter buttons on the preview table: `Toate (${items.length})`, `Erori (${errorCount})`, `Noi (${newCount})`, `Modificați (${modifiedCount})`.
- Display a summary of detected new worksites and jobs that will be auto-created upon commit.
- Clear error notification stating that rows with validation errors will be skipped while valid rows will be committed.

#### 5. Automated Verification Suite (`scripts/verify-excel-import-export.ts` & `scripts/verify-all.ts`)
- Implement `scripts/verify-excel-import-export.ts` covering:
  - Test 1: Full parse of `Test_Client_3_Angajati.xlsx` (3/3 valid).
  - Test 2: Dirty data parsing (extra spaces, serial dates, `DD/MM/YYYY`, numeric CNP).
  - Test 3: Rejection of invalid rows (bad CNP, missing required fields, PLECAT without leaveDate, duplicate intra-file CNP).
  - Test 4: Database import & atomic rollback test.
  - Test 5: Round-trip export-import fidelity (export -> re-import -> 100% valid rows).
- Integrate this script into `scripts/verify-all.ts` as Suite 5.

---

## 5. Verification Method

To independently verify these findings, run the following commands:

```bash
# 1. Inspect sheet names and cell formatting in Test_Client_3_Angajati.xlsx
node -e '
const XLSX = require("xlsx");
const wb = XLSX.readFile("Test_Client_3_Angajati.xlsx");
console.log("Sheets:", wb.SheetNames);
const s = wb.Sheets["Firmă și angajați"];
console.log("Headers:", s["A12"].v, "...", s["AH12"].v);
console.log("Stan CNP:", s["D13"].v, "Stan Post:", s["Y13"].v);
'

# 2. Test current importer against Test_Client_3_Angajati.xlsx
npx tsx -e '
import fs from "fs";
import { parseClientWorkbook } from "./src/lib/importer";
const buf = fs.readFileSync("./Test_Client_3_Angajati.xlsx");
const res = parseClientWorkbook(buf);
console.log("Company:", res.company.name, res.company.cui);
console.log("Employees valid:", res.employees.every(e => e.isValid));
'

# 3. Reproduce round-trip export validation issue
npx tsx -e '
import { exportClientToExcel } from "./src/lib/exporter";
import { parseClientWorkbook } from "./src/lib/importer";
import { prisma } from "./src/lib/prisma";
async function test() {
  const c = await prisma.client.findFirst({ where: { cui: "RO38765432" } });
  const exp = await exportClientToExcel(c.id);
  const parsed = parseClientWorkbook(exp.buffer);
  console.log("Exported count:", parsed.employees.length);
  parsed.employees.forEach(e => console.log(e.lastName, e.isValid, e.errors));
}
test().finally(() => prisma.$disconnect());
'
```

**Invalidation conditions**:
- If `Test_Client_3_Angajati.xlsx` does not contain 3 sheets named `Instrucțiuni`, `Firmă și angajați`, and `Context posturi`.
- If `exportClientToExcel` on the existing database records passes re-import validation without adding identity documents and addresses to Stan, Dumitru, and Barbu.
