# HANDOFF REPORT — m3_p3_explorer_1

**Milestone**: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)  
**Agent**: `m3_p3_explorer_1` (Explorer, roles: explorer, specialist)  
**Target Recipient**: Orchestrator conversation ID `d4389872-2ec2-44c4-b4b6-52d9b0f4a82d`  
**Date**: 2026-11-05T01:46:00Z  
**Subject**: Feature F12 (Stopping mock salaries and generic CIM fabrications) & Challenger Finding F-M2-01 (SSM/PSI Periodic Training Row Truncation)  

---

## 1. Observation

Direct empirical observations from line-by-line inspection of `src/lib/templates/resolver.ts`, `src/lib/templates/definitions.ts`, `src/lib/templates/generator.ts`, `prisma/schema.prisma`, and verification test suites:

### 1.1. Exact Occurrences of Hardcoded Fictitious Data in `resolver.ts`
1. **Arbitrary Gross Salary (`6500 lei`)**:
   - `src/lib/templates/resolver.ts:566`:
     ```typescript
     PLACEHOLDER_SALARIU_BRUT: '6500 lei',
     ```
     Defined in `ROMANIAN_LEGAL_HR_CIM` and spread into `ALL_ROMANIAN_LEGAL_FALLBACKS` at line 634 (`...ROMANIAN_LEGAL_HR_CIM`).
   - Line 1732:
     ```typescript
     const mergedData: Record<string, unknown> = {
       ...ALL_ROMANIAN_LEGAL_FALLBACKS,
       ...verifiedMap,
       ...(context.customOverrides || {}),
     };
     ```
     Because `ALL_ROMANIAN_LEGAL_FALLBACKS` unconditionally provides `'6500 lei'`, `mergedData.PLACEHOLDER_SALARIU_BRUT` is always `'6500 lei'` whenever an employee has no salary recorded, silently injecting a fictitious 6500 lei figure into employment contracts.

2. **Arbitrary CIM Number (`CIM-2026-0042`) and Hardcoded Contract Dates**:
   - `src/lib/templates/resolver.ts:552`:
     ```typescript
     PLACEHOLDER_NUMAR_CIM: 'CIM-2026-0042',
     PLACEHOLDER_DATA_CIM: '15.01.2026',
     PLACEHOLDER_DATA_SEMNARII: '15.01.2026',
     ```
   - `src/lib/templates/resolver.ts:1472`:
     ```typescript
     PLACEHOLDER_NUMAR_CIM: (employee as any)?.cimNumber || (context.customOverrides?.PLACEHOLDER_NUMAR_CIM as string) || 'CIM-2026-0042',
     ```
     If the employee has no `cimNumber` in DB or `customOverrides`, it silently defaults to `'CIM-2026-0042'`.

3. **Arbitrary Allowances, Benefits, and Payment Details in `ROMANIAN_LEGAL_HR_CIM`**:
   - `src/lib/templates/resolver.ts:567-572`:
     ```typescript
     PLACEHOLDER_SPORURI_SALARIU: 'Nu este cazul',
     PLACEHOLDER_INDEMNIZATII_SALARIU: 'Nu este cazul',
     PLACEHOLDER_ALTE_ADAOSURI_BENEFICII: 'Tichete de masă conform Legii nr. 165/2018',
     PLACEHOLDER_DATA_PLATA: 'data de 15 a fiecărei luni pentru luna precedentă',
     PLACEHOLDER_METODA_PLATA: 'Virament bancar în contul IBAN al salariatului',
     PLACEHOLDER_ALTE_DREPTURI_SALARIALE: 'Tichete de masă conform Legii 165/2018, servicii medicale private',
     ```

4. **Arbitrary Bank Accounts, Emails, Phones, and Badge Numbers**:
   - Employer IBAN / Bank:
     - `src/lib/templates/resolver.ts:602-603`:
       ```typescript
       PLACEHOLDER_CONT_BANCA_FIRMA: 'RO49AAAA1B31007593840001',
       PLACEHOLDER_BANCA_FIRMA: 'Banca Comercială Română',
       ```
     - `src/lib/templates/resolver.ts:1488-1489`:
       ```typescript
       PLACEHOLDER_CONT_BANCA_FIRMA: (client as any)?.bankAccount || 'RO49AAAA1B31007593840001',
       PLACEHOLDER_BANCA_FIRMA: (client as any)?.bankName || 'Banca Comercială Română',
       ```
   - Employee IBAN, Bank, Phone, Email, Badge:
     - `src/lib/templates/resolver.ts:604-607`:
       ```typescript
       PLACEHOLDER_TELEFON_SALARIAT: '0722123456',
       PLACEHOLDER_EMAIL_SALARIAT: 'salariat@client.ro',
       PLACEHOLDER_CONT_BANCA_SALARIAT: 'RO98AAAA1B31007593840002',
       PLACEHOLDER_BANCA_SALARIAT: 'Banca Transilvania',
       ```
     - `src/lib/templates/resolver.ts:1495-1498`:
       ```typescript
       PLACEHOLDER_TELEFON_SALARIAT: (employee as any)?.phone || '0722123456',
       PLACEHOLDER_EMAIL_SALARIAT: (employee as any)?.email || 'salariat@client.ro',
       PLACEHOLDER_CONT_BANCA_SALARIAT: (employee as any)?.bankAccount || (employee as any)?.iban || 'RO98AAAA1B31007593840002',
       PLACEHOLDER_BANCA_SALARIAT: (employee as any)?.bankName || 'Banca Transilvania',
       ```
     - `src/lib/templates/resolver.ts:1504`:
       ```typescript
       PLACEHOLDER_MARCA: (employee as any)?.badgeNumber || (employee as any)?.employeeNumber || 'M-042',
       ```

### 1.2. Observations on `definitions.ts` and `generator.ts` Status Evaluation
1. In `src/lib/templates/definitions.ts`:
   - `hr-cim-model-cadru-2022` (line 3807) and `hr-cim-2026` (line 1131):
     `PLACEHOLDER_SALARIU_BRUT` is currently marked `{ required: false }`.
   - Because `required` is false, `validateMissingFields` in `generator.ts` (lines 29–43) and `resolveTemplateData` (lines 1738–1746) never flag missing salary as an unresolved field.
2. In `src/lib/templates/generator.ts`:
   - Lines 587–590:
     ```typescript
     const finalMissingFields = [...missingFields];
     const status: 'draft' | 'missing_data' | 'approved_for_print' =
       finalMissingFields.length === 0 ? 'approved_for_print' : 'missing_data';
     ```
   - When a required field is empty string `""` or unresolved, docxtemplater leaves `{PLACEHOLDER_*}` (lines 331–339), `collectUnresolvedPlaceholders` collects it, and `status` becomes `'missing_data'`.

### 1.3. Observations on Challenger Finding F-M2-01 (Training Row Truncation)
In `src/lib/templates/resolver.ts`:
- Lines 1205–1232:
  ```typescript
  const ssmEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => !e.type || e.type === 'ssm'
  );
  const TARGET_SSM_ROWS = 16;
  const instruiriPeriodiceSSM = [];
  for (let i = 0; i < TARGET_SSM_ROWS; i++) {
    const ev = ssmEvents[i];
    ...
  }
  ```
- Lines 1257–1282:
  ```typescript
  const psiEvents = ((client?.trainingEvents || []) as any[]).filter(
    (e: any) => e.type === 'psi' || e.type === 'su'
  );
  const TARGET_PSI_ROWS = 16;
  const instructajePeriodicePSI = [];
  for (let i = 0; i < TARGET_PSI_ROWS; i++) {
    const ev = psiEvents[i];
    ...
  }
  ```
- When `ssmEvents.length > 16` or `psiEvents.length > 16`, the loops iterate strictly `i < 16`, silently discarding all training events beyond index 15.
- Furthermore, in `resolveTemplatePlaceholders` lines 1774–1790, `prisma.client.findUnique` does not include `trainingEvents: true`, which means database training events are not loaded into `client.trainingEvents` by default unless explicitly included.

---

## 2. Logic Chain

1. **Why arbitrary defaults violate Romanian statutory compliance**:
   - Under Art. 17 alin. (3) lit. k and Art. 159-160 from Codul Muncii (Legea 53/2003) and Ordin MMSS 2171/2022, an individual employment contract (CIM) cannot legally state a fictitious salary. Defaulting to `6500 lei` or dummy IBANs creates high legal liability and invalid document records.
   - For contracts before registration in REVISAL, the CIM number is either not yet assigned or entered into the register. Fabricating `'CIM-2026-0042'` pollutes real employer records.
   - Therefore, real document generation must detect when essential financial/contractual data is missing and flag `missing_data` rather than inventing data (Observation 1.1).

2. **How to differentiate real generation from offline / test blank printing**:
   - In **Real Execution** (invoked with an employee/client to produce a binding document):
     - If `(employee as any)?.salary` or `customOverrides.PLACEHOLDER_SALARIU_BRUT` is absent, salary must remain empty string `''`.
     - In `definitions.ts`, `PLACEHOLDER_SALARIU_BRUT` must be `{ required: true }` for `hr-cim-model-cadru-2022` and `hr-cim-2026`.
     - `resolveTemplateData` reports `unresolvedPlaceholders: ['PLACEHOLDER_SALARIU_BRUT']` and `status: 'missing_data'`.
     - `generateDocument` persists the document as `status: 'missing_data'` and lists `'Salariu de bază lunar brut'` in `missingFields`.
     - `/api/templates/[code]/fields` presents the gross salary field as empty and required, prompting the operator for real input.
   - In **Offline / Test Blank Generation** (`allowOfflineBlank: true` or offline form printing mode):
     - The goal is to print physical blank forms for manual physical signing with ink.
     - Instead of fabricating `'6500 lei'`, the resolver supplies clean non-fictitious dotted strings:
       - `PLACEHOLDER_SALARIU_BRUT: '........................ lei'`
       - `PLACEHOLDER_NUMAR_CIM: '........ / ............'` (or `'........................'`)
       - `PLACEHOLDER_DATA_CIM: '........................'`
       - `PLACEHOLDER_DATA_SEMNARII: '........................'`
       - `PLACEHOLDER_CONT_BANCA_FIRMA: '-'`
       - `PLACEHOLDER_BANCA_FIRMA: '-'`
       - `PLACEHOLDER_CONT_BANCA_SALARIAT: '-'`
       - `PLACEHOLDER_BANCA_SALARIAT: '-'`
       - `PLACEHOLDER_TELEFON_SALARIAT: '-'`
       - `PLACEHOLDER_EMAIL_SALARIAT: '-'`
       - `PLACEHOLDER_MARCA: '-'`
     - Because these are non-empty strings (not raw `{PLACEHOLDER_*}`), Docxtemplater renders the dotted underline without unmapped token leakage, satisfying `validateMissingFields` and achieving `approved_for_print` cleanly.
   - In **Explicit Overrides Mode**:
     - When an operator or automated test supplies explicit overrides in `customOverrides`:
       ```typescript
       customOverrides: {
         PLACEHOLDER_SALARIU_BRUT: '5200 lei',
         PLACEHOLDER_NUMAR_CIM: '101/2026',
       }
       ```
     - The resolver prioritizes `customOverrides`, satisfying `required: true`, resulting in `status: 'ready'` and `approved_for_print`.

3. **Resolution of Finding F-M2-01**:
   - `ssmEvents` and `psiEvents` are arrays of events.
   - By setting `totalSsmRows = Math.max(TARGET_SSM_ROWS, ssmEvents.length)` and looping `i < totalSsmRows`, the resolver guarantees:
     - For $\le 16$ events: Exactly 16 rows (matching the physical 16-row booklet page, padded with blank rows for hand-signing).
     - For $> 16$ events (e.g. 20, 25, 40 events): All events are preserved and rendered into dynamic rows in `instruiriPeriodiceSSM`.
   - Docxtemplater XML table rendering (`{#instruiriPeriodiceSSM}`) supports dynamic row expansion across page breaks without corruption (verified empirically in Suite 1 test case 4 of `scripts/stress-test-m2-challenger1.ts`).

---

## 3. Caveats

1. **Prisma Schema Scope**: `Employee` in `prisma/schema.prisma` does not currently contain a `salary` column. Therefore, real salary data enters either via `(employee as any)?.salary` (if schema is migrated in the future) or through `customOverrides?.PLACEHOLDER_SALARIU_BRUT` (via `/documents/generate` form input).
2. **Backward Compatibility of Existing Acceptance Tests**: `scripts/test-all-templates-generation.ts` runs without arguments and asserts `missingDataStatus === 'approved_for_print'` across all 31 templates. To maintain 100% pass rate in `scripts/verify-all.ts`, `test-all-templates-generation.ts` must pass `allowOfflineBlank: true` (or explicit sample salary) so that the offline print mode is exercised rather than failing on absent database salary.
3. No other caveats.

---

## 4. Conclusion

1. **Concrete Locations for F12 Removal**:
   - Remove `'6500 lei'` from `ROMANIAN_LEGAL_HR_CIM` in `src/lib/templates/resolver.ts:566`.
   - Remove `'CIM-2026-0042'` from `resolver.ts:552` and `resolver.ts:1472`.
   - Remove fake bank accounts, phones, and emails from `ROMANIAN_LEGAL_HR_CIM` and `verifiedMap`.
   - Update `definitions.ts`: set `required: true` for `PLACEHOLDER_SALARIU_BRUT` in `hr-cim-model-cadru-2022` and `hr-cim-2026`.
   - Add `allowOfflineBlank?: boolean` to `TemplateResolutionOptions` and `TemplateResolutionContext`.
   - If `allowOfflineBlank: true`: use dotted strings (`........................ lei`, `........ / ............`).
   - If `allowOfflineBlank !== true` and no salary/CIM is provided: leave empty string `""` and flag `missing_data`.

2. **Concrete Implementation for Finding F-M2-01**:
   - In `src/lib/templates/resolver.ts` line 1207:
     ```typescript
     const totalSsmRows = Math.max(TARGET_SSM_ROWS, ssmEvents.length);
     for (let i = 0; i < totalSsmRows; i++) {
     ```
   - In `src/lib/templates/resolver.ts` line 1259:
     ```typescript
     const totalPsiRows = Math.max(TARGET_PSI_ROWS, psiEvents.length);
     for (let i = 0; i < totalPsiRows; i++) {
     ```
   - In `resolveTemplatePlaceholders` line 1776, add `trainingEvents: true` to the `prisma.client.findUnique` query.

---

## 5. Verification Method

To independently verify the implementation once applied by the Worker:

1. **Execute Unified Verification Suite**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
   *Expected result*: All 5 suites pass (130 / 130 items passed, exit code 0).

2. **Execute Challenger Stress Test Suite**:
   ```bash
   npx tsx scripts/stress-test-m2-challenger1.ts
   ```
   *Expected result*: Finding F-M2-01 test case passes with 20/20 events rendered in `instruiriPeriodiceSSM`.

3. **Verify Zero Fictitious Strings**:
   ```bash
   grep -n "6500" src/lib/templates/resolver.ts
   grep -n "CIM-2026-0042" src/lib/templates/resolver.ts
   ```
   *Expected result*: 0 matches found.

4. **Verify `missing_data` Flagging for Real Execution**:
   Call `resolveTemplateData('hr-cim-model-cadru-2022', { client, employee })` without salary override or `allowOfflineBlank`.
   *Expected result*:
   - `res.status === 'missing_data'`
   - `res.unresolvedPlaceholders.includes('PLACEHOLDER_SALARIU_BRUT') === true`.

5. **Verify `approved_for_print` for Offline Blank Print**:
   Call `resolveTemplateData('hr-cim-model-cadru-2022', { client, employee, allowOfflineBlank: true })`.
   *Expected result*:
   - `res.status === 'ready'`
   - `res.data.PLACEHOLDER_SALARIU_BRUT === '........................ lei'`.
