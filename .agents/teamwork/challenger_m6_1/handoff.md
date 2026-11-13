# Handoff Report — Challenger 1: Milestone 6 Phase 2 (Adversarial Coverage Hardening — Tier 5)

## 1. Observation

Direct empirical observations made during white-box source code analysis and the execution of the adversarial stress test suite (`npx tsx scripts/tier5-challenger1-tests.ts`):

### Target Files Inspected
- `src/lib/templates/generator.ts` (lines 33-42, 415-465, 645-690)
- `src/lib/templates/resolver.ts` (lines 1450-1456, 1850-1865, 1931-1936, 2375-2380, 2789-2812)
- `src/lib/compliance.ts` (lines 88-175, 235-304, 310-377)
- `src/lib/importer.ts` (lines 181-246, 257-269, 362-520, 597-625)
- `src/lib/packages/bulk-packages.ts` (lines 23-30, 86-156, 167-255, 478-509)
- `src/app/api/employees/[id]/medical-exam/route.ts` (lines 49-54, 73-92, 116-130)

### Empirical Execution Results
Suite execution command:
```bash
npx tsx scripts/tier5-challenger1-tests.ts
```
Summary Output:
```
Total Adversarial Checks: 28
  ✅ Passed Robustness Invariants: 24
  ⚠️ Confirmed Bugs / Vulnerabilities Discovered: 4
  ❌ Test Execution Failures: 0
Pass Rate: 86%
```

### Specific Empirical Findings

1. **Vulnerability 1 (Generator Crash on Null Byte / Control Characters)**:
   - In `src/lib/templates/generator.ts:33-42`, `escapeXml` only escapes `&`, `<`, `>`, `"`, `'`.
   - In `src/lib/templates/generator.ts:425-429`, raw strings from `data` are passed into `doc.render(renderData)`.
   - In `scripts/tier5-challenger1-tests.ts` (Test `C1-S1-06`): Passing a string containing `\x00` (`'Control\x00Null\x08Backspace\x1bEscape Worker'`) causes `doc.render()` to throw an unhandled `Multi error` (`XmlParseError`).
   - Verbatim error from `Docxtemplater`:
     ```
     Multi error: "Multi error" (XmlParseError: illegal XML character 0x0)
     ```

2. **Vulnerability 2 (Introductory Training Date Masquerade in Resolver)**:
   - In `src/lib/templates/resolver.ts:1849-1855`:
     ```typescript
     if (introEvent?.eventDate) {
       markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_IG', introEvent.eventDate);
       markAutocompleted('PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI', introEvent.eventDate);
     } else {
       markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_IG', employee.hireDate);
       markAutocompleted('PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI', employee.hireDate);
     }
     ```
   - In `scripts/tier5-challenger1-tests.ts` (Test `C1-S2-06`): On a fresh employee with ZERO training events in the database, `resolveTemplatePlaceholders` populates `PLACEHOLDER_DATA_INSTRUIRE_IG` with `"10.01.2026"` (`employee.hireDate`) AND marks `isAutocompleted: true`.
   - This directly violates Requirement R1 ("`isAutocompleted` nu trebuie să marcheze valorile fallback ca date preluate automat din DB") and Requirement R4 ("folosind data reală a evenimentului (nu hireDate)").

3. **Vulnerability 3 (Medical Exam Regression via Out-of-Order / Historical Exam Backfill)**:
   - In `src/app/api/employees/[id]/medical-exam/route.ts:116-123`:
     ```typescript
     const updatedEmployee = await prisma.employee.update({
       where: { id },
       data: {
         medicalLastExamDate: parsedExamDate,
         medicalIntervalMonths: parsedInterval,
         medicalFitnessVerdict: rawVerdict,
         medicalNotes: finalNotes,
       },
     ```
   - In `scripts/tier5-challenger1-tests.ts` (Test `C1-S3-04`): An active employee has a valid occupational medicine exam dated `2026-05-01` (`VALID`). An operator records an older historical exam dated `2024-01-01` (e.g. while digitizing legacy records). The endpoint executes `update` unconditionally, overwriting `medicalLastExamDate` to `2024-01-01` and regressing the employee's active compliance status to `OVERDUE` (overdue by 518 days).

4. **Vulnerability 4 (Zip Path Traversal Token Retention in `sanitizeZipPath`)**:
   - In `src/lib/packages/bulk-packages.ts:23-30`:
     ```typescript
     export function sanitizeZipPath(raw: string): string {
       return raw
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[<>:"/\\|?*]/g, '_')
         .replace(/\s+/g, '_')
         .trim();
     }
     ```
   - In `scripts/tier5-challenger1-tests.ts` (Test `C1-S5-01b`): `sanitizeZipPath("..")` returns `".."`.
   - In `src/lib/packages/bulk-packages.ts:490`, paths are constructed as:
     ```typescript
     path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Fisa_Instruire_Individuala_SSM.docx`
     ```
   - If `empNameClean` is `..`, the path resolves to `04_FISE_INDIVIDUALE_SALARIATI/../Fisa_Instruire_Individuala_SSM.docx`, which escapes `04_FISE_INDIVIDUALE_SALARIATI` into root.

---

## 2. Logic Chain

1. **Observation 1 & Vulnerability 1**:
   - OpenXML / W3C XML 1.0 explicitly forbids C0 control characters (ASCII 0x00 to 0x1F, with the sole exceptions of 0x09 tab, 0x0A LF, and 0x0D CR).
   - In `src/lib/templates/generator.ts`, `renderData` values are fed directly to `doc.render(renderData)` without filtering or stripping illegal control characters.
   - When input contains `\x00` (e.g. from corrupt database imports, copy-pasted strings, or hostile payloads), `Docxtemplater` crashes synchronously.
   - **Conclusion**: An unhandled 500 error / application crash occurs when untrusted input contains null bytes or illegal control characters.

2. **Observation 2 & Vulnerability 2**:
   - The system prompt and requirement R1 explicitly mandate: "`isAutocompleted` nu trebuie să marcheze valorile fallback ca date preluate automat din DB. Câmpurile fără date reale în DB trebuie semnalate sincer ca lipsă și lăsate editabile pentru operator."
   - In `src/lib/templates/resolver.ts:1853-1854`, the code contains an `else` branch that executes `markAutocompleted('PLACEHOLDER_DATA_INSTRUIRE_IG', employee.hireDate)`.
   - As observed empirically in test `C1-S2-06`, this causes `PLACEHOLDER_DATA_INSTRUIRE_IG` to be presented in UI as automatically sourced from DB (`isAutocompleted: true`), falsely misleading operators that an introductory training was recorded.
   - **Conclusion**: Fallback masquerading is still present in `resolver.ts:1853-1865` for introductory and on-the-job training dates.

3. **Observation 3 & Vulnerability 3**:
   - In `src/app/api/employees/[id]/medical-exam/route.ts`, the endpoint validates future dates (`parsedExamDate > maxFuture`), but does NOT check if `parsedExamDate < employee.medicalLastExamDate`.
   - A company maintaining audit archives may digitize past exams. Submitting an older exam overwrites `medicalLastExamDate` unconditionally.
   - In test `C1-S3-04`, this regressed a 100% compliant employee to `OVERDUE`.
   - **Conclusion**: `POST /api/employees/[id]/medical-exam` lacks a guard preventing regression of `medicalLastExamDate` when recording historical exams.

4. **Observation 4 & Vulnerability 4**:
   - In `src/lib/packages/bulk-packages.ts`, `sanitizeZipPath` replaces slashes with underscores, but does not strip relative directory navigation tokens (`..`, `.`).
   - If a caller passes `..` or interpolates `empNameClean` into folder paths, relative path traversal inside the zip archive occurs.
   - **Conclusion**: `sanitizeZipPath` needs a regex or token sanitizer to strip leading/standalone `.` and `..` segments.

---

## 3. Caveats

- **Multi-user concurrency race conditions**: High-concurrency simultaneous requests on ZIP streams were not tested under multi-process clustering (within Challenger 2 scope).
- **DOCX viewing in proprietary Microsoft Word**: Document XML integrity was empirically verified using standard Python `xml.etree.ElementTree` and OpenXML schema parsers. Visual fidelity in proprietary Office 365 desktop was not tested via GUI automation.
- **Zero code modifications**: In accordance with the Challenger role constraints ("Review-only — do NOT modify implementation code"), no production files in `src/` were edited. All vulnerabilities are reported as findings for the Worker agent to remediate.

---

## 4. Conclusion & Challenge Report

**Overall Risk Assessment**: MEDIUM-HIGH

The platform shows high resilience in its core statutory invariants (24 of 28 adversarial checks passed cleanly):
- XML escaping against XSS tags (`<script>`, `<img>`), unclosed brackets, and SQL-like quotes is robust in OpenXML.
- Sincere missing field signaling for `cimNumber` and `grossSalary` reliably prevents premature `approved_for_print`.
- Calendar arithmetic for leap years (Feb 29 clamping) and exact statutory warning windows (31z, 30z, 0z, -1z) is 100% accurate.
- CNP validation algorithms and intra-batch duplicate detection function properly.
- Employees marked `PLECAT` are strictly excluded from compliance rollups, operational exam endpoints, and individual onboarding packages.

However, **4 concrete vulnerabilities were empirically reproduced and must be remediated**:

### Discovered Vulnerabilities

#### Challenge 1 [HIGH]: Generator crash on non-printable control characters (C1-S1-06)
- **Assumption challenged**: Docxtemplater gracefully handles any string passed in `data`.
- **Attack scenario**: An employee name, job description, or company field containing `\x00` (NUL) or illegal XML 1.0 control characters (`\x00-\x08`, `\x0B-\x0C`, `\x0E-\x1F`) is generated.
- **Blast radius**: Unhandled 500 server crash during DOCX rendering.
- **Mitigation**: In `src/lib/templates/generator.ts`, sanitize strings before passing to `doc.render()`:
  ```typescript
  export function sanitizeXmlString(val: string): string {
    return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
  ```

#### Challenge 2 [MEDIUM]: Introductory training date masquerading as autocompleted (C1-S2-06)
- **Assumption challenged**: `isAutocompleted` is only true if verified DB records exist.
- **Attack scenario**: An employee with zero training events in DB is resolved. The UI displays `PLACEHOLDER_DATA_INSTRUIRE_IG` as autocompleted with `hireDate`.
- **Blast radius**: Misleads compliance officers that statutory introductory training was completed on `hireDate` when no training occurred.
- **Mitigation**: In `src/lib/templates/resolver.ts:1852-1866`, remove `markAutocompleted` from the `else` branches (or only mark autocompleted when `introEvent?.eventDate` or `lmEvent?.eventDate` actually exists).

#### Challenge 3 [MEDIUM]: Medical exam regression on historical record entry (C1-S3-04)
- **Assumption challenged**: Calling `POST /api/employees/[id]/medical-exam` always represents the latest exam.
- **Attack scenario**: Operator records an older historical exam (e.g. 2024) for an employee who already has a valid 2026 exam.
- **Blast radius**: `medicalLastExamDate` is overwritten with the older date, unexpectedly turning a compliant employee into `OVERDUE`.
- **Mitigation**: In `src/app/api/employees/[id]/medical-exam/route.ts`, only update `medicalLastExamDate` if `!employee.medicalLastExamDate || parsedExamDate >= employee.medicalLastExamDate`. If older, record the audit event but preserve `medicalLastExamDate`.

#### Challenge 4 [LOW]: Directory navigation token retention in `sanitizeZipPath` (C1-S5-01b)
- **Assumption challenged**: `sanitizeZipPath` guarantees safe path interpolation in ZIP entries.
- **Attack scenario**: An employee name or client name consists of or starts with `..`.
- **Blast radius**: Can cause sub-folder escape when interpolated as `04_FISE_INDIVIDUALE/${empNameClean}/`.
- **Mitigation**: In `src/lib/packages/bulk-packages.ts:23-30`, add `.replace(/^\.+/g, '').replace(/\.{2,}/g, '_')` to strip leading dots and double dots.

---

## 5. Verification Method

To independently reproduce all 28 checks and confirm the 4 reported findings:

1. **Execute the adversarial test suite**:
   ```bash
   npx tsx scripts/tier5-challenger1-tests.ts
   ```
2. **Expected Suite Output**:
   - Total Checks: 28
   - Passed: 24
   - Bugs Discovered: 4 (C1-S1-06, C1-S2-06, C1-S3-04, C1-S5-01b)
   - Failures: 0
3. **Invalidation Condition**:
   - If running `npx tsx scripts/tier5-challenger1-tests.ts` fails to report all 4 findings, or exits with an unhandled fatal error, the conclusions of this report are invalidated.
