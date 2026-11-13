# Investigation & Handoff Report: Excel Import Subsystem (Features 30 & 31)

**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/sub_orch_m5/explorer_3`  
**Milestone**: Milestone 5 — Focus Area 3  
**Features Covered**:
- **Feature 30**: Elimination of `hireDate` Substitution in Excel Import (`src/lib/importer.ts`, `src/lib/compliance.ts`)
- **Feature 31**: Server-Side Re-validation & Diff Persistence in `ImportBatch` (`src/app/api/imports/commit/route.ts`, `src/lib/importer.ts`, `prisma/schema.prisma`)

---

## 1. Observation

### Feature 30: `hireDate` Substitution in Excel Import

1. **Substitution Site in `src/lib/importer.ts`**:
   At lines 891–894, during employee creation in `commitImport`:
   ```typescript
   // src/lib/importer.ts:891-894
   medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate,
   ssmLastTrainingDate: emp.ssmLastTrainingDate || emp.hireDate,
   psiLastTrainingDate: emp.psiLastTrainingDate || emp.hireDate,
   hygieneLastExamDate: emp.hygieneLastExamDate,
   ```
   - When a row in Excel does not specify a medical exam date (`medicalLastExamDate` is `undefined`), the importer falls back to `emp.hireDate`.
   - When a row in Excel does not specify an SSM training date (`ssmLastTrainingDate` is `undefined`), the importer falls back to `emp.hireDate`.
   - When a row in Excel does not specify a PSI training date (`psiLastTrainingDate` is `undefined`), the importer falls back to `emp.hireDate`.
   - In contrast, `hygieneLastExamDate` (line 894) has no fallback and was already correctly assigned `emp.hygieneLastExamDate`.
   - In contrast, lines 963–966 for existing employees (`existing` branch) only update when explicitly present:
     ```typescript
     // src/lib/importer.ts:963-966
     ...(emp.medicalLastExamDate ? { medicalLastExamDate: emp.medicalLastExamDate } : {}),
     ...(emp.ssmLastTrainingDate ? { ssmLastTrainingDate: emp.ssmLastTrainingDate } : {}),
     ...(emp.psiLastTrainingDate ? { psiLastTrainingDate: emp.psiLastTrainingDate } : {}),
     ...(emp.hygieneLastExamDate ? { hygieneLastExamDate: emp.hygieneLastExamDate } : {}),
     ```
     Therefore, the fake date substitution exclusively affected newly created employees.

2. **Compliance Engine Behavior in `src/lib/compliance.ts`**:
   - `calculateItemCompliance` (lines 133–142):
     ```typescript
     if (!lastDate) {
       return {
         lastDate: null,
         intervalMonths: safeInterval,
         dueDate: null,
         daysRemaining: null,
         status: 'MISSING',
         label,
       };
     }
     ```
   - Rollup status logic in `calculateEmployeeCompliance` (lines 268–270):
     ```typescript
     } else if (activeItems.some((i) => i.status === 'MISSING')) {
       overallStatus = 'MISSING';
     ```
   - When `medicalLastExamDate` is set to `emp.hireDate` (e.g. today or 2 weeks ago), `dueDate = hireDate + 12 months`, resulting in `daysRemaining ≈ 350 > 30` and compliance status `'VALID'`. The employee is presented as 100% compliant despite having no medical certificate on record.
   - When `medicalLastExamDate` is `null`, `calculateItemCompliance` immediately returns status `'MISSING'`, which rolls up to `overallStatus: 'MISSING'`, alerting the HR/SSM manager to schedule an occupational medical exam under HG 355/2007.

3. **Existing Verification Suite Asserting Fake Dates**:
   - In `scripts/verify-excel-import-export.ts:299-307`:
     ```typescript
     const empPopescu = dbEmployees.find((e) => e.cnp === '1850101410123')!;
     assert(empPopescu.medicalLastExamDate instanceof Date, 'medicalLastExamDate auto-inițializat');
     assert(empPopescu.ssmLastTrainingDate instanceof Date, 'ssmLastTrainingDate auto-inițializat');
     assert(empPopescu.psiLastTrainingDate instanceof Date, 'psiLastTrainingDate auto-inițializat');
     assertEquals(
       empPopescu.medicalLastExamDate?.toISOString(),
       validEmp1.hireDate.toISOString(),
       'Data medicină inițializată implicit la data angajării'
     );
     ```
     This test in `scripts/verify-excel-import-export.ts` explicitly codified the old behavior. When lines 891–893 are fixed, this test will fail unless the test assertion is updated to check `medicalLastExamDate === null` (or falsy).

---

### Feature 31: Server-Side Re-validation & Diff Persistence in `ImportBatch`

1. **`ImportBatch` Model in `prisma/schema.prisma` (lines 588–606)**:
   ```prisma
   model ImportBatch {
     id                 String   @id @default(uuid())
     clientId           String
     client             Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
     filename           String
     schemaVersion      String   @default("1.0")
     rowCount           Int      @default(0)
     newCount           Int      @default(0)
     updatedCount       Int      @default(0)
     errorCount         Int      @default(0)
     ambiguousCount     Int      @default(0)
     status             String   @default("uploaded") // uploaded, validated, needs_review, confirmed, rejected
     validationReport   String?  // JSON detaliat
     diffData           String?  // JSON cu diferențe preview
     operatorName       String
     createdAt          DateTime @default(now())

     @@index([clientId])
   }
   ```
   - Both `validationReport` and `diffData` fields already exist on `ImportBatch` as nullable `String?` (for JSON serialization).
   - In `src/lib/importer.ts:1056-1068`, `tx.importBatch.create` is invoked without passing `validationReport` or `diffData`. As a result, both fields are stored as `null` in PostgreSQL on every import commit.

2. **Blind Trust in `src/app/api/imports/commit/route.ts`**:
   - Lines 7–18 read `parsedData` directly from the client request body:
     ```typescript
     const body = await request.json();
     let { clientId } = body;
     const { parsedData, filename, operatorName } = body as {
       clientId?: string;
       parsedData: ParsedWorkbook;
       filename: string;
       operatorName?: string;
     };

     if (!parsedData) {
       return NextResponse.json({ error: 'Datele de import lipsesc.' }, { status: 400 });
     }
     ```
   - Lines 54–60 contain only a shallow defensive check:
     ```typescript
     if (parsedData.employees.length > 0 && parsedData.employees.every((e) => !e.isValid)) {
       return NextResponse.json(
         { error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.' },
         { status: 400 }
       );
     }
     ```
   - **Vulnerability**: If an incoming request sends an employee with an invalid CNP (e.g. `0000000000000` or non-existent control digit), missing required fields (e.g. missing `birthDate` or `street`), but sets `isValid: true` in the JSON body, the server currently trusts `isValid: true` and attempts to insert the invalid record into PostgreSQL.
   - Dates in `parsedData` are serialized as ISO strings when crossing HTTP JSON boundaries. The server does not convert or validate them before committing.
   - Intra-batch duplicate CNPs are not checked at commit time.
   - `compareWithDatabase` is called during `/api/imports/preview`, but its diff report is never persisted during `/api/imports/commit`.

---

## 2. Logic Chain

1. **Premise 1 (Statutory Compliance)**: Romanian labor safety laws (Legea 319/2006, Art. 13 lit. j; HG 355/2007) require every employee to hold a valid occupational health aptitude certificate (*Fișă de aptitudine*) prior to starting work. Assigning `hireDate` as the medical exam date creates a false certificate on record, displaying the employee as `VALID` in compliance tracking for up to 12 months, which exposes the company to statutory sanctions.
2. **Premise 2 (Data Truthfulness)**: In `importer.ts`, `medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate` creates fake data. When set to `null` (`emp.medicalLastExamDate ?? null`), `calculateItemCompliance` assigns status `'MISSING'`. This reflects the genuine legal reality: no medical certificate has been uploaded or verified.
3. **Premise 3 (Server-Side Security & Integrity)**: In Next.js client-server architecture, client payloads must be treated as untrusted. Blindly trusting `emp.isValid` sent in the request body of `POST /api/imports/commit` permits invalid CNPs, missing statutory fields, and corrupted records to bypass validation.
4. **Premise 4 (Auditability via Diff & Validation Persistence)**: `ImportBatch` in Prisma was designed with `validationReport String?` and `diffData String?` to provide an immutable forensic audit log of every imported file. Failing to populate these fields leaves the audit trail incomplete.
5. **Deduction & Solution**:
   - In `importer.ts:891-893`, replace `|| emp.hireDate` with `?? null`.
   - Implement `revalidateParsedWorkbook(parsedData: ParsedWorkbook)` in `importer.ts` that enforces all statutory rules server-side regardless of client claims.
   - In `/api/imports/commit/route.ts`, revalidate `parsedData` before commit, recompute the DB diff, build `validationReport` and `diffData` JSON structures, and persist them on `ImportBatch`.

---

## 3. Proposed Implementation Blueprint

### A. Feature 30: `src/lib/importer.ts` Line 891–893 Modification

```typescript
// BEFORE (src/lib/importer.ts:891-894):
medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate,
ssmLastTrainingDate: emp.ssmLastTrainingDate || emp.hireDate,
psiLastTrainingDate: emp.psiLastTrainingDate || emp.hireDate,
hygieneLastExamDate: emp.hygieneLastExamDate,

// AFTER:
medicalLastExamDate: emp.medicalLastExamDate ?? null,
ssmLastTrainingDate: emp.ssmLastTrainingDate ?? null,
psiLastTrainingDate: emp.psiLastTrainingDate ?? null,
hygieneLastExamDate: emp.hygieneLastExamDate ?? null,
```

### B. Feature 31: Server-Side Re-validation & Data Structures

#### 1. JSON Schemas for `validationReport` and `diffData`

```typescript
export interface ImportValidationReport {
  schemaVersion: '1.0';
  validatedAt: string; // ISO 8601
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  operatorName: string;
  filename: string;
  errorsByRow: {
    rowNumber: number;
    cnpMasked: string; // e.g. "18501********"
    name: string;
    errors: string[];
  }[];
}

export interface ImportDiffData {
  schemaVersion: '1.0';
  generatedAt: string; // ISO 8601
  clientId: string;
  summary: {
    totalRows: number;
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
    errorCount: number;
    ambiguousCount: number;
  };
  newWorksites: string[];
  newJobs: string[];
  items: {
    rowNumber: number;
    cnpMasked: string; // Strictly masked for GDPR & audit compliance
    name: string;
    jobTitle: string;
    worksiteName: string;
    status: 'NEW' | 'MODIFIED' | 'UNCHANGED' | 'ERROR';
    errors: string[];
    changes: {
      field: string;
      oldVal: string;
      newVal: string;
    }[];
  }[];
}
```

#### 2. Re-validation Function: `revalidateParsedWorkbook` in `src/lib/importer.ts`

Export a dedicated validation function that can be used both during Excel file parsing and in API routes:

```typescript
export function revalidateParsedWorkbook(
  parsed: ParsedWorkbook,
  operatorName: string = 'Operator Intern',
  filename: string = 'import.xlsx'
): {
  revalidatedData: ParsedWorkbook;
  validationReport: ImportValidationReport;
  hasValidRows: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
} {
  const seenCnpMap = new Map<string, number>();
  const revalidatedEmployees: ParsedEmployee[] = [];
  const errorsByRow: ImportValidationReport['errorsByRow'] = [];

  for (let i = 0; i < parsed.employees.length; i++) {
    const raw = parsed.employees[i];
    const rowNum = raw.rowNumber || i + 1;
    const errors: string[] = [];

    const lastName = raw.lastName?.trim() || '';
    const firstName = raw.firstName?.trim() || '';
    if (!lastName) errors.push('Numele este obligatoriu.');
    if (!firstName) errors.push('Prenumele este obligatoriu.');

    const cnpRaw = raw.cnp?.trim() || '';
    const citizenship = raw.citizenship?.trim() || 'Română';
    const docType = raw.docType?.trim() || 'CI';
    const normCitizenship = normalizeHeader(citizenship);
    const isRomanian = !citizenship || normCitizenship === 'romana' || normCitizenship === 'ro';
    const isPassport = normalizeHeader(docType).includes('pasaport');

    if (!cnpRaw) {
      errors.push('CNP-ul sau numărul de identificare este obligatoriu.');
    } else {
      if (seenCnpMap.has(cnpRaw)) {
        errors.push(`CNP duplicat în fișier (apare deja la rândul ${seenCnpMap.get(cnpRaw)}).`);
      } else {
        seenCnpMap.set(cnpRaw, rowNum);
      }

      if (isRomanian && !isPassport) {
        if (!validateCNP(cnpRaw)) {
          errors.push('CNP-ul este invalid (cifra de control sau lungime incorectă).');
        }
      } else {
        if (cnpRaw.length < 3) {
          errors.push('Numărul actului de identificare/pașaport este prea scurt.');
        }
      }
    }

    const birthDate = parseExcelDate(raw.birthDate);
    if (!birthDate) errors.push('Data nașterii este obligatorie sau invalidă.');

    const docNumber = raw.docNumber?.trim() || '';
    if (!docNumber) errors.push('Numărul actului de identitate este obligatoriu.');

    const county = raw.county?.trim() || '';
    const locality = raw.locality?.trim() || '';
    const street = raw.street?.trim() || '';
    const streetNumber = raw.streetNumber?.trim() || '';
    if (!county) errors.push('Județul de domiciliu este obligatoriu.');
    if (!locality) errors.push('Localitatea de domiciliu este obligatorie.');
    if (!street) errors.push('Strada este obligatorie.');
    if (!streetNumber) errors.push('Numărul străzii este obligatoriu.');

    const jobTitle = raw.jobTitle?.trim() || '';
    const worksiteName = raw.worksiteName?.trim() || '';
    if (!jobTitle) errors.push('Funcția/postul este obligatorie.');
    if (!worksiteName) errors.push('Punctul de lucru este obligatoriu.');

    const hireDate = parseExcelDate(raw.hireDate);
    if (!hireDate) errors.push('Data angajării este obligatorie.');

    const status: 'ACTIV' | 'PLECAT' = raw.status === 'PLECAT' ? 'PLECAT' : 'ACTIV';
    const leaveDate = parseExcelDate(raw.leaveDate);
    if (status === 'PLECAT' && !leaveDate) {
      errors.push('Pentru statusul PLECAT este necesară data plecării.');
    }

    const docIssueDate = parseExcelDate(raw.docIssueDate);
    const docExpiryDate = parseExcelDate(raw.docExpiryDate);
    const startDateOnJob = parseExcelDate(raw.startDateOnJob) || hireDate;
    const medicalLastExamDate = parseExcelDate(raw.medicalLastExamDate);
    const ssmLastTrainingDate = parseExcelDate(raw.ssmLastTrainingDate);
    const psiLastTrainingDate = parseExcelDate(raw.psiLastTrainingDate);
    const hygieneLastExamDate = parseExcelDate(raw.hygieneLastExamDate);

    const isValid = errors.length === 0;

    const validatedEmp: ParsedEmployee = {
      ...raw,
      lastName,
      firstName,
      cnp: cnpRaw,
      birthDate: birthDate!,
      docNumber,
      county,
      locality,
      street,
      streetNumber,
      jobTitle,
      worksiteName,
      hireDate: hireDate!,
      status,
      leaveDate,
      docIssueDate,
      docExpiryDate,
      startDateOnJob,
      medicalLastExamDate,
      ssmLastTrainingDate,
      psiLastTrainingDate,
      hygieneLastExamDate,
      isValid,
      errors,
    };

    revalidatedEmployees.push(validatedEmp);

    if (!isValid) {
      errorsByRow.push({
        rowNumber: rowNum,
        cnpMasked: maskCNP(cnpRaw),
        name: `${lastName} ${firstName}`.trim() || 'Nespecificat',
        errors,
      });
    }
  }

  const validCount = revalidatedEmployees.filter((e) => e.isValid).length;
  const errorCount = revalidatedEmployees.length - validCount;

  const validationReport: ImportValidationReport = {
    schemaVersion: '1.0',
    validatedAt: new Date().toISOString(),
    totalRows: revalidatedEmployees.length,
    validRowsCount: validCount,
    invalidRowsCount: errorCount,
    operatorName,
    filename,
    errorsByRow,
  };

  return {
    revalidatedData: {
      ...parsed,
      employees: revalidatedEmployees,
    },
    validationReport,
    hasValidRows: validCount > 0,
    totalRows: revalidatedEmployees.length,
    validCount,
    errorCount,
  };
}
```

#### 3. Update `commitImport` in `src/lib/importer.ts`

Update `commitImport` to accept optional `validationReport` and `diffData`:
```typescript
export async function commitImport(
  clientId: string,
  parsedData: ParsedWorkbook,
  operatorName: string = 'Operator Intern',
  filename: string = 'import.xlsx',
  extra?: {
    validationReport?: ImportValidationReport | string;
    diffData?: ImportDiffData | string;
  }
): Promise<string>
```
Inside `commitImport`:
```typescript
    // 5. Creare ImportBatch
    const batch = await tx.importBatch.create({
      data: {
        clientId,
        filename,
        schemaVersion: '1.0',
        rowCount: parsedData.employees.length,
        newCount,
        updatedCount,
        errorCount: parsedData.employees.filter((e) => !e.isValid).length,
        status: 'confirmed',
        validationReport: extra?.validationReport
          ? (typeof extra.validationReport === 'string' ? extra.validationReport : JSON.stringify(extra.validationReport))
          : null,
        diffData: extra?.diffData
          ? (typeof extra.diffData === 'string' ? extra.diffData : JSON.stringify(extra.diffData))
          : null,
        operatorName,
      },
    });
```

#### 4. Update `src/app/api/imports/commit/route.ts`

```typescript
// 1. Re-validare strictă server-side
const {
  revalidatedData,
  validationReport,
  hasValidRows,
  totalRows,
} = revalidateParsedWorkbook(parsedData, operatorName || 'Operator Intern', filename);

if (totalRows > 0 && !hasValidRows) {
  return NextResponse.json(
    {
      error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.',
      validationReport,
    },
    { status: 400 }
  );
}

// 2. Calcul diferențe reale cu baza de date
const previewReport = await compareWithDatabase(clientId, revalidatedData);

const diffData: ImportDiffData = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  clientId,
  summary: previewReport.summary,
  newWorksites: previewReport.newWorksites,
  newJobs: previewReport.newJobs,
  items: previewReport.items.map((it) => ({
    rowNumber: it.rowNumber,
    cnpMasked: it.cnpMasked,
    name: it.name,
    jobTitle: it.jobTitle,
    worksiteName: it.worksiteName,
    status: it.status,
    errors: it.errors,
    changes: it.changes,
  })),
};

// 3. Commit atomic cu persistență rapoarte
const batchId = await commitImport(
  clientId,
  revalidatedData,
  operatorName || 'Operator Intern',
  filename || 'Model_date_client_SSM.xlsx',
  { validationReport, diffData }
);

return NextResponse.json({
  success: true,
  batchId,
  clientId,
  summary: previewReport.summary,
});
```

---

## 4. Caveats

1. **Test Update Requirement (`scripts/verify-excel-import-export.ts`)**:
   Lines 298–307 in `scripts/verify-excel-import-export.ts` contain an explicit assertion expecting `medicalLastExamDate instanceof Date` and `assertEquals(empPopescu.medicalLastExamDate?.toISOString(), validEmp1.hireDate.toISOString())`. When Feature 30 is implemented, this assertion must be updated to:
   ```typescript
   assertEquals(empPopescu.medicalLastExamDate, null, 'Data medicină este null în lipsa examenului real');
   assertEquals(empPopescu.ssmLastTrainingDate, null, 'Data instruire SSM este null în lipsa instruirii reale');
   assertEquals(empPopescu.psiLastTrainingDate, null, 'Data instructaj PSI este null în lipsa instructajului real');
   ```
2. **Backward Compatibility of `commitImport`**:
   Any direct script invocations (e.g. `scripts/verify-excel-import-export.ts`) calling `commitImport(clientId, parsedData, ...)` with 4 arguments must continue to work without errors; making `extra` optional preserves complete backward compatibility.
3. **No Database Schema Migration Required**:
   `ImportBatch.validationReport` and `ImportBatch.diffData` already exist as `String?` columns in `prisma/schema.prisma` and in PostgreSQL. No `npx prisma db push` or migration is necessary.
4. **GDPR / Privacy Constraint**:
   `diffData` and `validationReport` must NEVER store unmasked raw Romanian CNPs or identity document serials in JSON strings, in accordance with the project's GDPR compliance standard documented in `AuditEvent` (`// Fără CNP sau text de CI în detalii!`). `maskCNP` must always be applied before persistence.

---

## 5. Conclusion

1. **Feature 30**: The culprit is isolated to `src/lib/importer.ts:891-893` where `emp.medicalLastExamDate || emp.hireDate` substituted `hireDate` for missing medical and training dates. Replacing this fallback with `null` restores genuine compliance evaluation, causing `calculateEmployeeCompliance` in `src/lib/compliance.ts` to output `MISSING` status for employees lacking genuine certificates.
2. **Feature 31**: `/api/imports/commit` currently trusts client JSON payloads without re-validation and neglects to populate `validationReport` and `diffData` on `ImportBatch`. Implementing `revalidateParsedWorkbook` server-side, computing sanitized `diffData` via `compareWithDatabase`, and saving both JSON strings in `tx.importBatch.create` ensures robust data integrity and complete statutory audit logging.

---

## 6. Verification Method

To independently verify these findings:

1. **Inspect substitution lines**:
   ```bash
   sed -n '885,900p' src/lib/importer.ts
   ```
2. **Inspect compliance handling for missing dates**:
   ```bash
   sed -n '133,145p' src/lib/compliance.ts
   sed -n '410,432p' scripts/verify-compliance.ts
   ```
3. **Inspect `ImportBatch` schema**:
   ```bash
   grep -A 20 "model ImportBatch" prisma/schema.prisma
   ```
4. **Inspect current `commit` endpoint**:
   ```bash
   cat src/app/api/imports/commit/route.ts
   ```
5. **Verify existing build and test suite**:
   ```bash
   npm run build
   npx tsx scripts/verify-excel-import-export.ts
   npx tsx scripts/verify-m3-it2-commit-guard.ts
   ```
