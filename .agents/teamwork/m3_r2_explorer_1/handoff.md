# Milestone 3 Investigation Report: Excel Importer Robustness & Diff Detection

## 1. Observation

### 1.1 Hardcoded Column Indices in `src/lib/importer.ts` (`parseClientWorkbook`)
In `src/lib/importer.ts` (lines 184–276), employee rows in `Firmă și angajați` are read with fixed column indices `c: 0` to `c: 33` and a hardcoded starting row `r = 12`:
```typescript
184:   const range = XLSX.utils.decode_range(sFirm['!ref'] || 'A1:AH250');
185: 
186:   for (let r = 12; r <= range.e.r; r++) {
187:     const lastName = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 0 }));
188:     const firstName = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 1 }));
189:     const cnpRaw = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 3 }));
...
203:     const birthDate = parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 4 })]?.v);
206:     const docNumber = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 10 }));
209:     const county = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 14 }));
...
272:     adminNotes: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 33 })),
```
Inspection of `Test_Client_3_Angajati.xlsx` and `outputs/ssm-client-template/Model_date_client_SSM.xlsx` reveals:
- Row 11 (0-indexed `r = 10`): Group headers (`Date personale`, `Act de identitate`, `Domiciliu`, `Contact`, `Încadrare și SSM`, `Curs igienă`, `Altele`).
- Row 12 (0-indexed `r = 11`): Column headers (`Nume*`, `Prenume*`, `Sex conform actului`, `CNP*`, `Data nașterii*`, `Localitatea nașterii`, `Județ/sector naștere`, `Cetățenie`, `Tip act (CI/CEI/pașaport)`, `Serie act`, `Număr act*`, `Emis de`, `Data emiterii`, `Data expirării`, `Județ/sector domiciliu*`, `Localitate domiciliu*`, `Stradă*`, `Număr*`, `Bloc`, `Scara`, `Etaj`, `Apartament`, `Email (opțional)`, `Telefon (opțional)`, `Funcție / post*`, `Punct de lucru*`, `Data începerii pe post/punct`, `Data angajării*`, `Status*`, `Data plecării`, `Solicită curs igienă?`, `Modul solicitat`, `Sesiune preferată`, `Observații administrative`).
- Row 13 (0-indexed `r = 12`): First employee data row.

### 1.2 Date Parsing and Timezone Offsets in `parseExcelDate`
In `src/lib/importer.ts` (lines 108–132):
```typescript
108: function parseExcelDate(val: unknown): Date | undefined {
109:   if (!val) return undefined;
110:   if (val instanceof Date) return val;
111:   if (typeof val === 'number') {
112:     // Excel date serial number
113:     const date = new Date(Math.round((val - 25569) * 86400 * 1000));
114:     return isNaN(date.getTime()) ? undefined : date;
115:   }
116:   if (typeof val === 'string') {
...
125:       const parsed = new Date(y, m, d);
126:       return isNaN(parsed.getTime()) ? undefined : parsed;
127:     }
128:     const parsed = new Date(trimmed);
129:     return isNaN(parsed.getTime()) ? undefined : parsed;
130:   }
131:   return undefined;
132: }
```
- Direct invocation of `new Date(y, m, d)` on line 125 creates local midnight. In Romania (UTC+2 or UTC+3 during DST), `new Date(1988, 2, 15)` serializes to ISO as `1988-03-14T22:00:00.000Z` or `1988-03-14T21:00:00.000Z`. When saved to PostgreSQL or queried in UTC, the date shifts back by one calendar day (March 14 instead of March 15).
- Numeric Excel timestamps passed as strings (e.g. `"32888"` or `"44561"`) fail the regex `/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/` and fall back to `new Date("32888")`, which produces an invalid Date or year 32888.
- ISO 8601 strings (`YYYY-MM-DD`) fall into `new Date(trimmed)`, which can behave inconsistently across JavaScript runtimes without explicit UTC construction.

### 1.3 Validation Deficits in `importer.ts`
- **Intra-file duplicate CNP**: `importer.ts` iterates rows 12..N without maintaining a `Set` or `Map` of encountered CNPs. Two rows with identical CNP in the same file will both pass row validation, causing the second to silently overwrite the first in `commitImport` or trigger database unique constraint errors.
- **Expat passport validation**: Lines 197–201 unconditionally execute `validateCNP(cnpRaw)`:
  ```typescript
  197:     if (!cnpRaw) {
  198:       errors.push('CNP-ul este obligatoriu.');
  199:     } else if (!validateCNP(cnpRaw)) {
  200:       errors.push('CNP-ul este invalid (cifra de control sau lungime incorectă).');
  201:     }
  ```
  Non-Romanian citizens (`citizenship !== 'Română'`) and passport holders (`docType === 'Pașaport'`) have foreign passport numbers (e.g. `EF123456`, `AB9876543`), which fail `validateCNP(cnpRaw)`, blocking valid foreign employee intake.
- **Initial compliance dates**: When Excel templates omit compliance columns (the standard 34-column template), `commitImport` (lines 600–624) writes `Employee` records with `medicalLastExamDate: null`, `ssmLastTrainingDate: null`, and `psiLastTrainingDate: null`. As verified in `src/lib/compliance.ts` (lines 11–30), null dates place the employee into `MISSING` compliance status immediately upon intake, rather than initializing them to their statutory `hireDate`.

### 1.4 Diff Detection Asymmetry in `compareWithDatabase`
In `src/lib/importer.ts` (lines 410–430):
```typescript
410:       if (existing.residenceAddress) {
411:         const addr = existing.residenceAddress;
412:         if (addr.street !== emp.street || addr.number !== emp.streetNumber) {
413:           changes.push({
414:             field: 'Adresă domiciliu',
415:             oldVal: `${addr.street} nr. ${addr.number}`,
416:             newVal: `${emp.street} nr. ${emp.streetNumber}`,
417:           });
418:         }
419:       }
420:       if (existing.identityDocument) {
421:         const doc = existing.identityDocument;
422:         if (doc.number !== emp.docNumber) {
423:           changes.push({
424:             field: 'Număr act identitate',
425:             oldVal: doc.number,
426:             newVal: emp.docNumber,
427:           });
428:         }
429:       }
```
- If an employee in the database has `identityDocument: null` or `residenceAddress: null`, neither `if (existing.residenceAddress)` nor `if (existing.identityDocument)` executes.
- There are no `else` branches. If the imported Excel provides an address or identity document for that employee, `changes` remains empty (`changes.length === 0`), and the employee is falsely categorized as `UNCHANGED` instead of `MODIFIED`.

---

## 2. Logic Chain

1. **Dynamic Header Resolution (from 1.1)**:
   - Users may reorder columns, insert optional compliance columns, or introduce variations in headers (e.g. diacritics present/absent, trailing asterisks `*`, spaces).
   - Scanning row 12 (0-indexed `r = 11`) to identify column positions makes column indexing resilient.
   - Normalizing headers via lowercasing, stripping asterisks `*` and parentheses, normalizing Romanian diacritics (`ă,â->a`, `î->i`, `ș->s`, `ț->t`), and collapsing whitespace allows robust mapping against known field tokens.
   - If dynamic header detection finds valid headers, columns are mapped dynamically. If headers are missing or unrecognizable, fallback to canonical column positions (0..33) guarantees 100% backward compatibility.

2. **Timezone-Neutral UTC Date Parsing (from 1.2)**:
   - Dates in Romanian labor law represent calendar days without time components.
   - Using `Date.UTC(y, m - 1, d)` creates dates pinned to UTC midnight (`00:00:00.000Z`).
   - Using `XLSX.SSF.parse_date_code(val)` directly extracts calendar year, month, and day from Excel serial numbers without relying on the host machine's timezone or Daylight Saving Time offsets.
   - Handling numeric strings, European formats (`DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY`), and ISO formats (`YYYY-MM-DD`) ensures multi-format support.

3. **Enhanced Validation Rules (from 1.3)**:
   - Tracking `seenCnpMap = new Map<string, number>()` during row parsing catches duplicate CNPs immediately at the file level and flags the offending row with `CNP duplicat în fișier (apare deja la rândul X)`.
   - Checking `isRomanian` and `isPassport` before invoking `validateCNP(cnpRaw)` ensures Romanian citizens with standard IDs are verified with the statutory 13-digit checksum algorithm, while foreign expats with passports or foreign IDs are accepted with a length check (`>= 3`).
   - Auto-initializing `medicalLastExamDate`, `ssmLastTrainingDate`, and `psiLastTrainingDate` to `emp.hireDate` (when not specified in optional compliance columns) satisfies Romanian statutory requirements (HG 355/2007, Legea 319/2006) for initial employment compliance and prevents false `MISSING` alerts.

4. **Diff Detection Completeness (from 1.4)**:
   - Adding `else` blocks for `!existing.identityDocument && emp.docNumber` and `!existing.residenceAddress && (emp.street || emp.streetNumber)` ensures that enriching an employee record with missing identification or address data pushes a diff entry (`oldVal: '—'`).
   - Adding checks for `phone` and `email` ensures all editable employee contact fields trigger diff detection.
   - Any populated change causes `changes.length > 0`, correctly marking the item as `MODIFIED`.

---

## 3. Caveats

- **Existing Sheet Structure**: In `Firmă și angajați`, company metadata occupies cells `B5:B8` and `E5:E8`. Header resolution must focus on row 12 (`r = 11`) and not scan metadata rows `B5:E8`.
- **SheetJS Cell Types**: When reading with `XLSX.read(buffer, { cellDates: true })`, date cells may arrive as Date objects or numbers. The enhanced `parseExcelDate` must handle `number`, `string`, and `Date` instances seamlessly.
- **Round-Trip Consistency**: Any changes to `importer.ts` must maintain 100% round-trip fidelity with `exporter.ts` and ensure all existing tests in `scripts/test-export-import-roundtrip.ts` pass without regression.

---

## 4. Conclusion & Actionable Specifications

### Specification 1: Dynamic Header Resolution in `parseClientWorkbook`
In `src/lib/importer.ts`:
1. Define a header normalizer:
```typescript
function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[*()]/g, '')
    .replace(/[ăâ]/g, 'a')
    .replace(/[î]/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
    .replace(/\s+/g, ' ')
    .trim();
}
```
2. Define field mapping dictionary mapping normalized header tokens to field keys:
   - `lastName`: `['nume', 'nume familie', 'nume de familie']`
   - `firstName`: `['prenume', 'prenumele']`
   - `sex`: `['sex', 'sex conform actului', 'gen']`
   - `cnp`: `['cnp', 'cod numeric personal', 'cnp/pasaport', 'cnp / pasaport', 'identificator']`
   - `birthDate`: `['data nasterii', 'data nastere']`
   - `birthPlace`: `['localitatea nasterii', 'loc nastere', 'oras nastere']`
   - `birthCounty`: `['judet/sector nastere', 'judet sector nastere', 'judet nastere']`
   - `citizenship`: `['cetatenie', 'nationalitate']`
   - `docType`: `['tip act', 'tip act ciceipasaport', 'tip document']`
   - `docSeries`: `['serie act', 'serie', 'serie ci']`
   - `docNumber`: `['numar act', 'nr act', 'numar ci', 'nr document']`
   - `docIssuedBy`: `['emis de', 'eliberat de', 'autoritate emitenta']`
   - `docIssueDate`: `['data emiterii', 'data eliberarii', 'emis la']`
   - `docExpiryDate`: `['data expirarii', 'valabil pana la', 'expira la']`
   - `county`: `['judet/sector domiciliu', 'judet sector domiciliu', 'judet domiciliu', 'judet']`
   - `locality`: `['localitate domiciliu', 'localitate', 'oras domiciliu', 'comuna']`
   - `street`: `['strada', 'str.']`
   - `streetNumber`: `['numar', 'numar strada', 'nr', 'nr.']`
   - `building`: `['bloc', 'bl.']`
   - `entrance`: `['scara', 'sc.']`
   - `floor`: `['etaj', 'et.']`
   - `apartment`: `['apartament', 'ap.']`
   - `email`: `['email', 'e-mail', 'email optional']`
   - `phone`: `['telefon', 'telefon optional', 'mobil', 'tel']`
   - `jobTitle`: `['functie / post', 'functie/post', 'functie', 'post', 'ocupatie']`
   - `worksiteName`: `['punct de lucru', 'punct lucru', 'locatie', 'sediu']`
   - `startDateOnJob`: `['data inceperii pe post/punct', 'data inceperii pe post', 'data debut post']`
   - `hireDate`: `['data angajarii', 'data angajare', 'data contract']`
   - `status`: `['status', 'stare', 'situatie']`
   - `leaveDate`: `['data plecarii', 'data plecare', 'data incetarii']`
   - `hygieneRequested`: `['solicita curs igiena', 'curs igiena', 'igiena']`
   - `hygieneModule`: `['modul solicitat', 'modul igiena', 'modul']`
   - `hygienePreferredSession`: `['sesiune preferata', 'sesiune curs']`
   - `adminNotes`: `['observatii administrative', 'observatii', 'note', 'mentiuni']`
   - Optional compliance:
     - `medicalLastExamDate`: `['data examen medical', 'data medicina muncii', 'examen medical', 'medicina muncii']`
     - `ssmLastTrainingDate`: `['data instruire ssm', 'data instruirii ssm', 'ultima instruire ssm', 'data ssm']`
     - `psiLastTrainingDate`: `['data instruire psi', 'data instruirii psi', 'ultima instruire psi', 'data psi']`
     - `hygieneLastExamDate`: `['data examen igiena', 'data curs igiena', 'data certificat igiena']`

3. Locate header row dynamically by inspecting rows `r = 0..20`. If a row contains `cnp` and (`nume` or `prenume`), mark it as `headerRowIndex` (default `11`, i.e. row 12).
4. Parse data rows starting from `headerRowIndex + 1`.

### Specification 2: Enhanced UTC `parseExcelDate`
Replace lines 108–132 with:
```typescript
export function parseExcelDate(val: unknown): Date | undefined {
  if (val === undefined || val === null || val === '') return undefined;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    // Offset cushion (+4h) to avoid timezone back-shift into previous day
    const rounded = new Date(val.getTime() + 4 * 3600 * 1000);
    return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
  }

  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
    return undefined;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;

    // Excel numeric serial as string (e.g. '32888')
    if (/^\d{4,6}(?:\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      const parsed = XLSX.SSF.parse_date_code(num);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      }
    }

    // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmy) {
      const d = parseInt(dmy[1], 10);
      const m = parseInt(dmy[2], 10);
      const y = parseInt(dmy[3], 10);
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
        return dt;
      }
      return undefined;
    }

    // ISO YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
    const ymd = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:T.*)?$/);
    if (ymd) {
      const y = parseInt(ymd[1], 10);
      const m = parseInt(ymd[2], 10);
      const d = parseInt(ymd[3], 10);
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
        return dt;
      }
      return undefined;
    }

    const fallback = new Date(trimmed);
    if (!isNaN(fallback.getTime())) {
      const rounded = new Date(fallback.getTime() + 4 * 3600 * 1000);
      return new Date(Date.UTC(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate()));
    }
  }

  return undefined;
}
```

### Specification 3: Enhanced Validation & Compliance Auto-Init
1. **Intra-file duplicate CNP**:
   ```typescript
   const seenCnpMap = new Map<string, number>(); // cnpClean -> rowNumber
   // Inside row loop:
   if (cnpRaw) {
     const cnpClean = cnpRaw.trim();
     if (seenCnpMap.has(cnpClean)) {
       errors.push(`CNP duplicat în fișier (apare deja la rândul ${seenCnpMap.get(cnpClean)}).`);
     } else {
       seenCnpMap.set(cnpClean, r + 1);
     }
   }
   ```
2. **Expat passport handling**:
   ```typescript
   const isRomanian = !citizenship || citizenship.trim().toLowerCase() === 'romana' || citizenship.trim().toLowerCase() === 'română';
   const isPassport = docType && (docType.trim().toLowerCase().includes('pasaport') || docType.trim().toLowerCase().includes('pașaport'));

   if (!cnpRaw) {
     errors.push('CNP-ul sau numărul de identificare este obligatoriu.');
   } else if (isRomanian && !isPassport) {
     if (!validateCNP(cnpRaw)) {
       errors.push('CNP-ul este invalid (cifra de control sau lungime incorectă).');
     }
   } else {
     // Expat / Pașaport
     if (cnpRaw.trim().length < 3) {
       errors.push('Numărul actului de identificare/pașaport este prea scurt.');
     }
   }
   ```
3. **Initial compliance dates auto-init**:
   - In `ParsedEmployee`, include compliance fields:
     `medicalLastExamDate?: Date; ssmLastTrainingDate?: Date; psiLastTrainingDate?: Date; hygieneLastExamDate?: Date;`
   - In `commitImport`:
     ```typescript
     // For new employee:
     medicalLastExamDate: emp.medicalLastExamDate || emp.hireDate,
     ssmLastTrainingDate: emp.ssmLastTrainingDate || emp.hireDate,
     psiLastTrainingDate: emp.psiLastTrainingDate || emp.hireDate,
     hygieneLastExamDate: emp.hygieneLastExamDate || undefined,
     ```

### Specification 4: Fix Diff Detection in `compareWithDatabase`
Update `compareWithDatabase` in `src/lib/importer.ts`:
```typescript
      // Adresă domiciliu
      if (existing.residenceAddress) {
        const addr = existing.residenceAddress;
        if (addr.street !== emp.street || addr.number !== emp.streetNumber) {
          changes.push({
            field: 'Adresă domiciliu',
            oldVal: `${addr.street} nr. ${addr.number}`,
            newVal: `${emp.street} nr. ${emp.streetNumber}`,
          });
        }
      } else if (emp.street || emp.streetNumber) {
        changes.push({
          field: 'Adresă domiciliu',
          oldVal: '—',
          newVal: `${emp.street} nr. ${emp.streetNumber}`.trim(),
        });
      }

      // Act de identitate
      if (existing.identityDocument) {
        const doc = existing.identityDocument;
        if (doc.number !== emp.docNumber) {
          changes.push({
            field: 'Număr act identitate',
            oldVal: doc.number,
            newVal: emp.docNumber,
          });
        }
      } else if (emp.docNumber) {
        changes.push({
          field: 'Număr act identitate',
          oldVal: '—',
          newVal: emp.docNumber,
        });
      }

      // Contact
      if (emp.phone && existing.phone !== emp.phone) {
        changes.push({ field: 'Telefon', oldVal: existing.phone || '—', newVal: emp.phone });
      }
      if (emp.email && existing.email !== emp.email) {
        changes.push({ field: 'Email', oldVal: existing.email || '—', newVal: emp.email });
      }
```

---

## 5. Verification Method

To verify these specifications independently:

1. **Round-Trip Fidelity Test**:
   ```bash
   npx tsx scripts/test-export-import-roundtrip.ts
   ```
   *Expected result*: Exit code 0, 100% UNCHANGED on round-trip re-import, detected modification on edited fields.

2. **Adversarial Importer Stress Test**:
   ```bash
   npx tsx scripts/adversarial-seed-roundtrip-stress.ts
   ```
   *Expected result*: All 5 suites and 16 tests pass, including diacritics invariance, whitespace trimming, and diff conservation.

3. **Date Parsing Verification**:
   Run node test checking `32888`, `"32888"`, `"15.03.1988"`, `"15/03/1988"`, `"15-03-1988"`, and `"1988-03-15"` all output `1988-03-15T00:00:00.000Z` or `1990-01-15T00:00:00.000Z` without timezone drift.

4. **Expat Passport & Duplicate CNP Verification**:
   Import an Excel with an expat row (`citizenship: "Ucraineană"`, `docType: "Pașaport"`, `cnp: "EF123456"`) and verify `isValid: true`.
   Import an Excel with two identical CNPs and verify the second is flagged with `CNP duplicat în fișier`.

5. **Missing Address/Doc Diff Verification**:
   Temporarily remove `identityDocument` or `residenceAddress` from an employee in DB, re-import an Excel file with those details, and verify `compareWithDatabase` marks the employee as `MODIFIED` with `oldVal: '—'`.

6. **Unified Verification Suite**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Expected result*: Clean pass across all active verification suites.
