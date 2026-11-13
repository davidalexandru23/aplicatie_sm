# Handoff Report: Template Resolver & Generator Data Integrity Investigation (Features 1 & 2)

**Author**: Explorer Subagent `explorer_m1_1`  
**Milestone**: Milestone 1 (M1) — Template Resolver & Generator Data Integrity  
**Target Recipient**: Caller `sub_orch_m1` (`77a27a77-3471-4d39-9006-680a56247379`)  
**Investigated Files**:
- `src/lib/templates/resolver.ts` (2119 lines)
- `src/lib/templates/generator.ts` (645 lines)
- `src/app/documents/generate/page.tsx` (1465 lines)
- `src/app/api/templates/[code]/fields/route.ts` (52 lines)
- `src/app/api/documents/generate/route.ts` (60 lines)
- `src/lib/templates/definitions.ts` (3950 lines)

---

## 1. Observation

### 1.1 The 8 Mock Dictionaries and Fallback Structures in `src/lib/templates/resolver.ts`

Through direct inspection of `src/lib/templates/resolver.ts`, we located all 8 mock dictionaries, fallback profiles, and hardcoded values:

#### 1. `ROMANIAN_LEGAL_SSM_PROVIDER` (Lines 54–80)
- **Direct Code**:
  ```typescript
  export const ROMANIAN_LEGAL_SSM_PROVIDER = {
    PLACEHOLDER_PRESTATOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
    PLACEHOLDER_FURNIZOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
    PLACEHOLDER_CUI_PRESTATOR: 'RO34567890',
    PLACEHOLDER_CERTIFICAT_FURNIZOR: 'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București',
    PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: '4812/2021',
    PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: 'J40/1234/2020',
    PLACEHOLDER_STRADA_FURNIZOR: 'Str. Agricultori',
    PLACEHOLDER_NUMAR_FURNIZOR: '35',
    PLACEHOLDER_BLOC_FURNIZOR: 'A1',
    PLACEHOLDER_SCARA_FURNIZOR: '1',
    PLACEHOLDER_ETAJ_FURNIZOR: '2',
    PLACEHOLDER_APARTAMENT_FURNIZOR: '6',
    PLACEHOLDER_COD_POSTAL_FURNIZOR: '021481',
    PLACEHOLDER_LOCALITATE_FURNIZOR: 'București',
    PLACEHOLDER_JUDET_FURNIZOR: 'Sector 2',
    PLACEHOLDER_TELEFON_PRESTATOR: '0722.123.456',
    PLACEHOLDER_EMAIL_PRESTATOR: 'contact@expert-ssm.ro',
    PLACEHOLDER_SITE_PRESTATOR: 'www.expert-ssm.ro',
    PLACEHOLDER_ADRESA_PRESTATOR: 'București, Str. Agricultori nr. 35, Sector 2',
    PLACEHOLDER_SPECIALIST_SSM: 'Ing. Mihai Popescu (Specialist SSM abilitat, Certificat seria EV nr. 10452/2018)',
    PLACEHOLDER_EVALUATOR_RISC: 'Ing. Mihai Popescu (Evaluator risc SSM atestat INCDPM București)',
    PLACEHOLDER_CERTIFICAT_EVALUATOR: 'Certificat Evaluator Riscuri SSM seria EV nr. 10452/2018 emis de INCDPM București',
    PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Ing. Mihai Popescu',
    PLACEHOLDER_CALITATE_REPREZENTANT: 'Director Executiv',
    PLACEHOLDER_ACT_REPREZENTANT: 'Decizia Asociaților nr. 01/2020',
  };
  ```
- **Propagation in `resolveTemplateData`**:
  - Lines 1248, 1256, 1264, 1268, 1270, 1275, 1276, 1277, 1278, 1279, 1280, 1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290, 1291, 1292, 1295.
  - Injected as static fallbacks whenever `prov` or `spec` is null or missing fields in the database.

#### 2. `ROMANIAN_LEGAL_DECIZII` (Lines 86–129)
- **Direct Code**:
  - Static decision numbers: `PLACEHOLDER_NUMAR_DECIZIE_01: '01/15.01.2026'` through `PLACEHOLDER_NUMAR_DECIZIE_11: '11/15.01.2026'`.
  - Appointees:
    - `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: 'Ing. Mihai Popescu (Specialist SSM abilitat conform HG 1425/2006)'`
    - `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: 'Ioana-Raluca Dumitru (Personal instruit prim ajutor, Certificat Crucea Roșie Română)'`
    - `PLACEHOLDER_RESPONSABIL_PSI: 'Gheorghe Barbu (Cadru tehnic cu atribuții PSI atestat IGSU)'`
    - `PLACEHOLDER_MEMBRU_COMISIE: 'Elena Vasilescu, Alexandru Stan'`
    - `PLACEHOLDER_RESPONSABIL_CONTROL_PSI: 'Gheorghe Barbu'`
    - `PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: 'Ing. Mihai Popescu'`
  - Hardcoded Fire Permit & Analysis Bulletins:
    - `PLACEHOLDER_NUMAR_PERMIS_FOC: '01/2026'`
    - `PLACEHOLDER_DATA_PERMIS_FOC: '15.01.2026'`
    - `PLACEHOLDER_EXECUTANT_LUCRARE: 'Vasile Ionescu (Lăcătuș mecanic / Sudor autorizat)'`
    - `PLACEHOLDER_AJUTOR_LUCRARE: 'Marius Radu'`
    - `PLACEHOLDER_NUMAR_BULETIN_ANALIZA: 'BA-042/2026'`
    - `PLACEHOLDER_DATA_BULETIN_ANALIZA: '15.01.2026'`
    - `PLACEHOLDER_EMITENT_BULETIN_ANALIZA: 'Laborator Atestat Analize Gaze și Mediu Industrial București'`
    - `PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT: 'Număr Unic de Urgență 112 / Dispecerat tehnic intern: 0722.111.222'`
- **Propagation in `resolveTemplateData`**:
  - Line 1141: `decisionsDateRo = client?.decisionsDate ? formatDateRo(client.decisionsDate) : '15.01.2026'`
  - Lines 1144–1157: `designatedWorker`, `firstAid`, `psiOfficer`, `investMembers` fallback to `ROMANIAN_LEGAL_DECIZII`
  - Lines 1520–1530: Decision numbers formatted as `01/${decisionsDateRo}`, hardcoding date `15.01.2026`
  - Lines 1548–1551: Responsibles fallback to `'Ing. Mihai Popescu'`, `'Ioana-Raluca Dumitru'`, `'Gheorghe Barbu'`, `'Elena Vasilescu, Alexandru Stan'`.

#### 3. `ROMANIAN_LEGAL_TRAINING_SHEETS` (Lines 298–336)
- **Direct Code**:
  - SSM Sheet:
    - `PLACEHOLDER_LOC_MUNCA: 'Sediul social / Punctul de lucru al angajatorului'`
    - `PLACEHOLDER_MARCA: 'M-042'`
    - `PLACEHOLDER_GRUPA_SANGUINA: 'AII / Rh+'`
    - `PLACEHOLDER_DOMICILIU: 'București, Sector 1, Str. Victoriei nr. 10'`
    - `PLACEHOLDER_CALIFICARE: 'Studii superioare tehnice / Inginer IT'`
    - `PLACEHOLDER_TRASEU_DEPLASARE: 'Domiciliu (București, Sector 1) - Metrou - Sediul Central (București, Sector 1) și retur'`
    - `PLACEHOLDER_DURATA_TRASEU: '30 minute'`
    - `PLACEHOLDER_DATA_INSTRUIRE_IG: '15.01.2026'`, `PLACEHOLDER_DURATA_INSTRUIRE_IG: '8 ore'`
    - `PLACEHOLDER_INSTRUCTOR_IG: 'Ing. Mihai Popescu (Specialist SSM abilitat)'`
    - `PLACEHOLDER_VERIFICATOR_IG: 'Munteanu Cristian (Reprezentant Legal)'`
    - `PLACEHOLDER_DATA_INSTRUIRE_LM: '15.01.2026'`, `PLACEHOLDER_DURATA_INSTRUIRE_LM: '8 ore'`
    - `PLACEHOLDER_LOC_MUNCA_LM: 'Birou / Punct de lucru - Departamentul IT & Proiectare'`
    - `PLACEHOLDER_INSTRUCTOR_LM: 'Ing. Mihai Popescu (Conducătorul locului de muncă)'`
    - `PLACEHOLDER_VERIFICATOR_LM: 'Munteanu Cristian (Conducător ierarhic superior)'`
    - `PLACEHOLDER_DATA_ADMITERE: '15.01.2026'`, `PLACEHOLDER_ADMITERE_NUME: 'Munteanu Cristian'`
  - PSI Sheet:
    - Identical fake dates `'15.01.2026'`, instructor `'Gheorghe Barbu'`, verifier `'Munteanu Cristian'`.
- **Propagation in `resolveTemplateData`**:
  - Lines 1743–1760: Instructor, verifier, admission dates and names fallback directly to these values and `legalRepresentativeName` (which itself defaults to `'Munteanu Cristian'`).

#### 4. `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH` (Lines 341–434)
- **Direct Code**:
  - Medical Office & Request:
    - `PLACEHOLDER_TELEFON_FIRMA: '0722334455'`
    - `PLACEHOLDER_EMAIL_FIRMA: 'contact@client.ro'`
    - `PLACEHOLDER_ACTIVITATE_CAEN: 'Activități de realizare a software-ului la comandă (software orientat client)'`
    - `PLACEHOLDER_NUMAR_INREGISTRARE_SOLICITARE: 'SOL-MED-042/2026'`
    - `PLACEHOLDER_CABINET_MEDICINA_MUNCII: 'CENTRU MEDICAL DE MEDICINA MUNCII S.R.L.'`
    - `PLACEHOLDER_MEDIC_MEDICINA_MUNCII: 'Dr. Alexandrescu Victor (Medic Primar Medicina Muncii, Cabinet Atestat DSP)'`
    - `PLACEHOLDER_ADRESA_CABINET_MEDICINA_MUNCII: 'București, Bd. Aviatorilor nr. 15, Sector 1'`
    - `PLACEHOLDER_DATA_SOLICITARII: '15.01.2026'`, `PLACEHOLDER_DATA_INTOCMIRII: '15.01.2026'`
  - Job Risk Identification (Anexa 3 HG 355/2007):
    - `PLACEHOLDER_SUBUNITATE: 'Sediul Central București'`
    - `PLACEHOLDER_ACTIVITATI_POST: 'Activitate intelectuală de birou, dezvoltare de aplicații software...'`
    - `PLACEHOLDER_DESCRIERE_ACTIVITATE: 'Activitate intelectuală de birou, dezvoltare de aplicații software...'`
    - `PLACEHOLDER_ECHIPAMENTE_POST: 'Laptop / unitate PC, monitoare LED...'`
    - `PLACEHOLDER_CONDITII_POST: 'Activitate de interior în încăpere climatizată...'`
    - `PLACEHOLDER_DIMENSIUNI_INCAPERE: 'L = 12 m, l = 8 m, h = 3 m (volum cca. 288 mc)'`
    - `PLACEHOLDER_SUPRAFATA_LUCRU: 'Suprafață medie de lucru > 6 mp per salariat'`
    - `PLACEHOLDER_GREUTATE_MAXIMA_MANIPULATA: 'Sub 3 kg (dosare, topuri hârtie, laptop)'`
- **Propagation in `resolveTemplateData`**:
  - Lines 1641–1644: `job?.mainActivities`, `job?.equipmentUsed`, `job?.workConditions` fallback to these mock strings.

#### 5. `ROMANIAN_LEGAL_EIP` (Lines 440–560)
- **Direct Code**:
  - Sizes and Metadata:
    - `PLACEHOLDER_DATA_ELIBERARII_FISEI: '15.01.2026'`
    - `PLACEHOLDER_MARIME_HAINE: 'M / 48'`
    - `PLACEHOLDER_MARIME_INCALTAMINTE: '42'`
    - `PLACEHOLDER_MARIME_MANUSI: '9 (L)'`
    - `PLACEHOLDER_MARIME_CASCA: 'Reglabilă (54-62 cm)'`
    - `PLACEHOLDER_DATA_SEMNARII_EIP: '15.01.2026'`
    - `PLACEHOLDER_NUME_SALARIAT: 'Stan Alexandru'`
    - `PLACEHOLDER_GESTIONAR_EIP: 'Ion Ionescu (Responsabil Magazie EIP)'`
    - `PLACEHOLDER_SEF_LOC_MUNCA: 'Ing. Mihai Popescu (Conducător Loc de Muncă)'`
  - 10 static hardcoded equipment rows (Lines 451–560):
    - `PLACEHOLDER_EIP_DENUMIRE_01` = `'Încălțăminte de protecție cu bombeu și talpă antiderapantă'`, `SR EN ISO 20345:2022 (S1P SRC)`
    - `PLACEHOLDER_EIP_DENUMIRE_02` = `'Ochelari de protecție la ecran cu filtru anti-lumină albastră'`
    - Rows 03 to 10: `'Costum / Halat de protecție bumbac'`, `'Vestă avertizoare'`, `'Cască de protecție'`, `'Mănuși'`, `'Antifoane'`, `'Semimască'`, `'Pelerină'`, `'Trusă individuală prim ajutor'`.
    - Every row has hardcoded date `'15.01.2026'` and `'Semnat salariat'`.

#### 6. `ROMANIAN_LEGAL_HR_CIM` (Lines 565–636)
- **Direct Code**:
  - Static HR terms:
    - `PLACEHOLDER_DATA_SFARSIT: '- (nedeterminată)'`
    - `PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: 'Nedeterminată conform art. 12 alin. (1) din Legea nr. 53/2003 - Codul Muncii'`
    - `PLACEHOLDER_PERMIS_MUNCA: 'Nu este cazul (cetățean român)'`
    - `PLACEHOLDER_ORE_PE_ZI: '8'`, `PLACEHOLDER_ORE_PE_SAPTAMANA: '40'`
    - `PLACEHOLDER_TIP_NORMA: 'Normă întreagă (8 ore/zi, 40 ore/săptămână)'`
    - `PLACEHOLDER_NORMA_LUCRU: 'Normă întreagă (8 ore/zi, 40 ore/săptămână)'`
    - `PLACEHOLDER_PROGRAM_LUCRU: 'Normă întreagă de 8 ore/zi, 40 ore/săptămână, Luni - Vineri între 08:30 - 17:00'`
    - `PLACEHOLDER_DATA_PLATA: 'data de 15 a fiecărei luni pentru luna precedentă'`
    - `PLACEHOLDER_METODA_PLATA: 'Virament bancar în contul IBAN al salariatului'`
    - `PLACEHOLDER_ZILE_CONCEDIU: '21 de zile lucrătoare'`
    - `PLACEHOLDER_ZILE_PROBA: '90 de zile calendaristice conform art. 31 alin. (1) din Legea 53/2003'`
    - `PLACEHOLDER_DURATA_PROBA: '90 de zile calendaristice conform art. 31 din Legea 53/2003'`
    - `PLACEHOLDER_DATA_INCEPUT: '15.01.2026'`, `PLACEHOLDER_DATA_INCEPERE: '15.01.2026'`
    - `PLACEHOLDER_COD_POSTAL_FIRMA: '010001'`
    - `PLACEHOLDER_DOMICILIU: 'București, Sector 1, Str. Victoriei nr. 10'`
- **Propagation in `resolveTemplateData`**:
  - Lines 1649–1652: `workNorm` defaults to `8`, `probationDays` defaults to `90`, `annualLeaveDays` defaults to `20`.

#### 7. `ROMANIAN_LEGAL_HYGIENE` & Participant Fallback Roster (Lines 164–207 & 1883–1907)
- **Direct Code**:
  - Static authorisations and commission:
    - `PLACEHOLDER_AVIZ_MS: '1225/2023 din 15.03.2023 emis de DSP București'`
    - `PLACEHOLDER_AVIZ_ME: '8941/2023 din 22.03.2023 emis de Ministerul Educației'`
    - `PLACEHOLDER_NUMAR_AVIZ_MS: '1225/2023'`, `PLACEHOLDER_DATA_AVIZ_MS: '15.03.2023'`
    - `PLACEHOLDER_NUMAR_AVIZ_ME: '8941/2023'`, `PLACEHOLDER_DATA_AVIZ_ME: '22.03.2023'`
    - `PLACEHOLDER_DATA_SESIUNE: '10.03.2026'`, `PLACEHOLDER_DATA_EXAMEN: '15.03.2026'`
    - `PLACEHOLDER_DATA_PV: '15.03.2026'`, `PLACEHOLDER_DATA_CATALOG: '15.03.2026'`
    - `PLACEHOLDER_LOCATIE_EXAMEN: 'București, Str. Agricultori nr. 35, Sector 2, Sala de Curs A2'`
    - `PLACEHOLDER_PRESEDINTE_COMISIE: 'Dr. Alexandrescu Victor (Medic Primar DSP București)'`
    - `PLACEHOLDER_MEMBRU_COMISIE: 'As. Med. Ionescu Claudia (Asistent Medical DSP București)'`
    - `PLACEHOLDER_MEMBRU_COMISIE_1: 'As. Med. Ionescu Claudia'`
    - `PLACEHOLDER_MEMBRU_COMISIE_2: 'Insp. Popa Dan (Inspector Sanitar DSP București)'`
    - `PLACEHOLDER_SECRETAR_COMISIE: 'Georgescu Ana (Secretar Comisie Examinare)'`
    - `PLACEHOLDER_SERIE_PV: 'PV-IG'`, `PLACEHOLDER_NUMAR_PV: '104'`
    - `PLACEHOLDER_SERIE_ADEVERINTA: 'ADEV-IG'`, `PLACEHOLDER_NUMAR_ADEVERINTA: '0042'`
    - `PLACEHOLDER_NUMAR_CATALOG: 'CAT-2026/01'`
  - Fallback participant roster (Lines 1883–1907):
    - When `client.employees` is empty, injects a fabricated participant roster containing:
      `fullName: 'Stan Alexandru'`, `cnp: '1880315410127'`, `birthDate: '15.03.1988'`, `docType: 'CI'`, `docSeries: 'RX'`, `docNumber: '123456'`, `examGrade: '10'`, `examResult: 'Admis'`, `certificateSeries: 'IGI'`, `certificateNumber: '0042'`.
  - Fallback certificate numbering (Lines 1864, 1874–1877, 1934–1960):
    - Employees without certificates get auto-assigned `IGI 0042`, grade `10`, and status `Admis`.

#### 8. `verifiedMap` Mocks (Lines 1088, 1448–1968)
- Line 1088:
  ```typescript
  const legalRepresentativeName = client?.legalRepresentative || 'Munteanu Cristian';
  ```
- Company Profile Fallbacks (Lines 1450–1466):
  - `PLACEHOLDER_FIRMA: client?.name || 'S.C. CLIENT TEST S.R.L.'`
  - `PLACEHOLDER_CUI: client?.cui || 'RO12345678'`
  - `PLACEHOLDER_NR_REG_COM: client?.regCom || 'J40/1000/2021'`
  - `PLACEHOLDER_ADRESA_FIRMA: client?.address || 'București, Sector 1'`
  - `PLACEHOLDER_ADRESA: addressFull || client?.address || 'București, Sector 1'`
  - `PLACEHOLDER_TELEFON_CONTACT: client?.contactPhone || '0722334455'`
  - `PLACEHOLDER_EMAIL_CONTACT: client?.contactEmail || 'contact@client.ro'`
  - `PLACEHOLDER_AN_INFIINTARE: String(client?.foundedYear || '2021')`
  - `PLACEHOLDER_NUMAR_LUCRATORI: String(job?.workersCount || client?.employees?.length || 10)`
- Employee Identity Fallbacks when employee exists but lacks fields (Lines 1568–1595):
  - `PLACEHOLDER_DATA_NASTERII: formatDateRo(employee.birthDate) || '15.03.1988'`
  - `PLACEHOLDER_LOCALITATE_NASTERII: employee.birthPlace || 'București'`
  - `PLACEHOLDER_JUDET_NASTERII: employee.birthCounty || 'Sector 1'`
  - `PLACEHOLDER_TIP_ACT: identity?.docType || 'C.I.'`
  - `PLACEHOLDER_SERIE_ACT: identity?.series || 'RX'`
  - `PLACEHOLDER_NUMAR_ACT: identity?.number || '123456'`
  - `PLACEHOLDER_EMITENT_ACT: identity?.issuedBy || 'SPCLEP Sector 1'`
  - `PLACEHOLDER_DATA_EMITERII: formatDateRo(identity?.issueDate) || '10.05.2020'`
  - `PLACEHOLDER_DATA_EXPIRARII: formatDateRo(identity?.expiryDate) || '10.05.2030'`
  - `PLACEHOLDER_ADRESA_DOMICILIU: addressFull || 'București, Sector 1, Str. Victoriei nr. 10'`
- Entire Fabricated Employee when `employee === null` (Lines 1601–1636):
  - Injects `Stan Alexandru`, CNP `1880315410127`, CI `RX 123456`, birth date `15.03.1988`, address `București, Sector 1, Str. Victoriei nr. 10`.
- Operational Context & Physical Sizing Fallbacks (Lines 1639–1660):
  - `PLACEHOLDER_FUNCTIE: ... || 'Personal TESA / Inginer Sisteme Software'`
  - `PLACEHOLDER_COD_COR: job?.corCode || '251201'`
  - `PLACEHOLDER_GRUPA_SANGUINA: ... : '0I (Rh +)'`
  - `PLACEHOLDER_TRASEU_DEPLASARE: ... || 'Deplasare urbană domiciliu - sediu'`
  - `PLACEHOLDER_MARIME_INCALTAMINTE: (employee as any)?.shoeSize || '42'`
  - `PLACEHOLDER_MARIME_IMBRACAMINTE: (employee as any)?.clothingSize || 'L'`
  - `PLACEHOLDER_MARIME_MANUSI: (employee as any)?.gloveSize || '9'`
  - `PLACEHOLDER_CALIFICARE: ... || 'Studii superioare tehnice / Inginer IT'`
- Worksite Fallbacks (Lines 1713–1720):
  - `PLACEHOLDER_PUNCT_LUCRU: worksite?.name || 'Sediul Central'`
  - `PLACEHOLDER_DEPARTAMENT: worksite?.activity || 'Departament Tehnic & IT'`
  - `PLACEHOLDER_SECTIE_COMPARTIMENT: worksite?.activity || 'Departament IT & Dezvoltare Software'`

---

### 1.2 Cascading Assembly of `resolutionResult.data` and `isAutocompleted`

Lines 1971–1975 in `resolveTemplateData`:
```typescript
  // Compoziție în cascadă: Fallback Legal -> Date Verificate DB -> Suprascrieri Custom
  const mergedData: Record<string, unknown> = {
    ...ALL_ROMANIAN_LEGAL_FALLBACKS,
    ...verifiedMap,
    ...(context.customOverrides || {}),
  };
```

Lines 2097–2113 in `resolveTemplatePlaceholders`:
```typescript
  const resolvedFields: ResolvedPlaceholderItem[] = template.fields
    .filter((def: TemplateFieldDef) => !/_\d{2,3}$/.test(def.key))
    .map((def: TemplateFieldDef) => {
      const rawVal = resolutionResult.data[def.key];
      const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';

      return {
        key: def.key,
        label: def.label,
        source: def.source,
        type: def.type,
        required: def.required,
        value: hasValue ? (rawVal as string | number | boolean) : '',
        isAutocompleted: hasValue,
      };
    });
```

Lines 568–571 in `src/app/documents/generate/page.tsx`:
```typescript
  const cleanFields = fields.filter((f) => !/_\d{2,3}$/.test(f.key));
  const autoCompletedCount = cleanFields.filter((f) => f.isAutocompleted).length;
  const manualFields = cleanFields.filter((f) => !f.isAutocompleted);
  const autoFields = cleanFields.filter((f) => f.isAutocompleted);
```

Lines 1221–1223 in `src/app/documents/generate/page.tsx`:
```tsx
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {manualFields.slice(0, 20).map((field) => (
```

Lines 554, 588–590 in `src/lib/templates/generator.ts`:
```typescript
  const missingFields = new Set(validateMissingFields(fieldDefs, params.data));
  ...
  const finalMissingFields = [...missingFields];
  const status: 'draft' | 'missing_data' | 'approved_for_print' =
    finalMissingFields.length === 0 ? 'approved_for_print' : 'missing_data';
```

---

### 1.3 Context Fallbacks (Feature 6)

In `src/lib/templates/resolver.ts`:
- Lines 1060–1061 (`resolveTemplateData`):
  ```typescript
  const job = employee?.currentJob || context.job || (client?.jobs && client.jobs[0]) || null;
  const worksite = context.worksite || employee?.currentWorksite || (client?.worksites && client.worksites[0]) || null;
  ```
- Lines 2043–2060 (`resolveTemplatePlaceholders`):
  ```typescript
  const employee = ctx.employeeId
    ? (client.employees.find((e) => e.id === ctx.employeeId) || ...)
    : client.employees && client.employees.length > 0
    ? client.employees[0]
    : null;

  const selectedJob = employee?.currentJob || client.jobs.find((j) => j.id === ctx.jobId) || (client.jobs && client.jobs[0]) || null;
  const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;
  ```
- Notice: `TemplateResolutionContext` (line 15) does not even contain `worksiteId?: string`!

---

## 2. Logic Chain

1. **Premise 1 (Fabricated Data Infection)**: Because `ALL_ROMANIAN_LEGAL_FALLBACKS` pre-populates all keys and `verifiedMap` uses fallback strings (`|| 'Munteanu Cristian'`, `|| 'RO12345678'`, `|| 'Stan Alexandru'`, `|| '42'`), `mergedData` NEVER has empty strings or nulls for any placeholder.
2. **Premise 2 (Broken `isAutocompleted`)**: In `resolveTemplatePlaceholders`, `isAutocompleted` is computed as `isAutocompleted: hasValue`, where `hasValue` checks `rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''`. Because Premise 1 guarantees `hasValue` is true, every placeholder is marked `isAutocompleted: true`.
3. **Premise 3 (UI Form Masking)**: In `generate/page.tsx`, `manualFields = cleanFields.filter(f => !f.isAutocompleted)`. Because of Premise 2, missing database fields are categorized as `autoFields` ("Date preluate automat din registrul firmei / salariatului") rather than `manualFields`. The operator is never presented with an input field to enter the real data. Furthermore, `.slice(0, 20)` in `page.tsx:1222` would truncate any field beyond index 19 even if it reached `manualFields`.
4. **Premise 4 (Illegitimate `approved_for_print`)**: In `generator.ts:554`, `validateMissingFields` checks `val === undefined || val === null || val === ''`. Because of Premise 1, required fields like `cimNumber`, `grossSalary`, and `legalRepresentative` contain mock strings (`'Munteanu Cristian'`, `'RO12345678'`, etc.), so `validateMissingFields` finds zero missing fields. `generateDocument` sets `status: 'approved_for_print'`, falsely validating an illegal statutory document.
5. **Premise 5 (Silent Context Bleed)**: Because `loadResolverContext` and `resolveTemplatePlaceholders` fall back to `client.employees[0]`, `client.jobs[0]`, and `client.worksites[0]` when IDs are omitted, requesting document fields for a company without selecting an employee silently pulls the first employee's CNP, address, and medical data into the resolution.
6. **Deductive Conclusion**: To restore legal data integrity:
   - All mock strings across the 8 areas must be eliminated and replaced with `""` or `null`.
   - `ALL_ROMANIAN_LEGAL_FALLBACKS` must be stripped of transactional mock data so it does not clobber missing fields.
   - `isAutocompleted` must be decoupled from mere string presence and bound to authentic database presence (`isFromDb && hasValue`).
   - Implicit `[0]` fallbacks on employee, job, and worksite must be eliminated, requiring explicit context or remaining empty.

---

## 3. Caveats

1. **Statutory Legal References vs. Transactional Data**: Standard Romanian statutory texts that are immutable legal references (e.g. `ROMANIAN_LEGAL_IPSSM` instruction titles `IPSSM 01`..`13`, statutory articles `Art. 12 alin. (1) din Legea 53/2003`, `Ordinul comun MS/ME nr. 2209/4469/2022`) are legitimate statutory formulas and should NOT be deleted. Only transactional data (names, CNP, dates, salaries, sizes, CUI, registration numbers, decisions) must be cleared.
2. **Offline Blank Generation (`allowOfflineBlank: true`)**: When an operator explicitly requests an offline blank form (for manual handwriting), placeholders like CIM number may format as dotted blank lines (`........ / ............`). This is legitimate ONLY when `allowOfflineBlank: true`, and must NEVER be flagged as `isAutocompleted: true`.
3. **Database Seed Data**: NEXUS SOLUTIONS S.R.L. and BISTRO GOURMET S.R.L. in `prisma/seed.ts` have real data, so in a seeded DB, genuine values will resolve properly. But when testing empty or sparse clients/employees, missing fields must remain strictly empty.

---

## 4. Conclusion & Concrete Strategy

### 4.1 Concrete Refactoring Strategy for `src/lib/templates/resolver.ts`

#### Step 1: Clean Mock Dictionaries (Excise Transactional Fallbacks)
1. **`ROMANIAN_LEGAL_SSM_PROVIDER`**:
   Clear mock company names, CUI, and addresses to empty strings:
   ```typescript
   export const ROMANIAN_LEGAL_SSM_PROVIDER = {
     PLACEHOLDER_PRESTATOR_SSM: '',
     PLACEHOLDER_FURNIZOR_SSM: '',
     PLACEHOLDER_CUI_PRESTATOR: '',
     PLACEHOLDER_CERTIFICAT_FURNIZOR: '',
     PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: '',
     PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: '',
     PLACEHOLDER_STRADA_FURNIZOR: '',
     PLACEHOLDER_NUMAR_FURNIZOR: '',
     PLACEHOLDER_BLOC_FURNIZOR: '',
     PLACEHOLDER_SCARA_FURNIZOR: '',
     PLACEHOLDER_ETAJ_FURNIZOR: '',
     PLACEHOLDER_APARTAMENT_FURNIZOR: '',
     PLACEHOLDER_COD_POSTAL_FURNIZOR: '',
     PLACEHOLDER_LOCALITATE_FURNIZOR: '',
     PLACEHOLDER_JUDET_FURNIZOR: '',
     PLACEHOLDER_TELEFON_PRESTATOR: '',
     PLACEHOLDER_EMAIL_PRESTATOR: '',
     PLACEHOLDER_SITE_PRESTATOR: '',
     PLACEHOLDER_ADRESA_PRESTATOR: '',
     PLACEHOLDER_SPECIALIST_SSM: '',
     PLACEHOLDER_EVALUATOR_RISC: '',
     PLACEHOLDER_CERTIFICAT_EVALUATOR: '',
     PLACEHOLDER_REPREZENTANT_PRESTATOR: '',
     PLACEHOLDER_CALITATE_REPREZENTANT: '',
     PLACEHOLDER_ACT_REPREZENTANT: '',
   };
   ```
2. **`ROMANIAN_LEGAL_DECIZII`**:
   Remove hardcoded decision numbers `01/15.01.2026`, fake appointees (`Gheorghe Barbu`, `Mihai Popescu`), and hardcoded dates:
   ```typescript
   export const ROMANIAN_LEGAL_DECIZII = {
     PLACEHOLDER_NUMAR_DECIZIE_01: '',
     ...
     PLACEHOLDER_NUMAR_DECIZIE_11: '',
     PLACEHOLDER_APELATIV_ADMINISTRATOR: '',
     PLACEHOLDER_APELATIV_PSI: '',
     PLACEHOLDER_APELATIV_MEMBRU_COMISIE: '',
     PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: '',
     PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: '',
     PLACEHOLDER_RESPONSABIL_PSI: '',
     PLACEHOLDER_MEMBRU_COMISIE: '',
     PLACEHOLDER_DOMENIU_INSTRUIRE: 'Securitate și Sănătate în Muncă (SSM) și Situații de Urgență (SU)',
     PLACEHOLDER_FUNCTIE_INSTRUCTOR: '',
     PLACEHOLDER_RESPONSABIL_CONTROL_PSI: '',
     PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: '',
     PLACEHOLDER_NUMAR_PERMIS_FOC: '',
     PLACEHOLDER_DATA_PERMIS_FOC: '',
     PLACEHOLDER_EXECUTANT_LUCRARE: '',
     PLACEHOLDER_AJUTOR_LUCRARE: '',
     PLACEHOLDER_DESCRIERE_LUCRARE: '',
     PLACEHOLDER_TEHNOLOGIE_LUCRU: '',
     PLACEHOLDER_ORA_INCEPERE: '',
     PLACEHOLDER_ORA_FINALIZARE: '',
     PLACEHOLDER_DATA_INCEPERE_LUCRARE: '',
     PLACEHOLDER_DATA_FINALIZARE_LUCRARE: '',
     PLACEHOLDER_RAZA_PROTECTIE_METRI: '',
     PLACEHOLDER_PROTECTIE_MATERIALE: '',
     PLACEHOLDER_MIJLOACE_STINGERE: '',
     PLACEHOLDER_VENTILARE_SPATIU: '',
     PLACEHOLDER_METODA_IZOLARE_INSTALATII: '',
     PLACEHOLDER_MASURI_PSI_SUPLIMENTARE: '',
     PLACEHOLDER_NUMAR_BULETIN_ANALIZA: '',
     PLACEHOLDER_DATA_BULETIN_ANALIZA: '',
     PLACEHOLDER_EMITENT_BULETIN_ANALIZA: '',
     PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT: '112',
   };
   ```
3. **`ROMANIAN_LEGAL_TRAINING_SHEETS`**:
   Remove mock employee and training verifier strings:
   ```typescript
   export const ROMANIAN_LEGAL_TRAINING_SHEETS = {
     PLACEHOLDER_LOC_MUNCA: '',
     PLACEHOLDER_MARCA: '',
     PLACEHOLDER_GRUPA_SANGUINA: '',
     PLACEHOLDER_DOMICILIU: '',
     PLACEHOLDER_CALIFICARE: '',
     PLACEHOLDER_AUTORIZATII: '',
     PLACEHOLDER_TRASEU_DEPLASARE: '',
     PLACEHOLDER_DURATA_TRASEU: '',
     PLACEHOLDER_DATA_INSTRUIRE_IG: '',
     PLACEHOLDER_DURATA_INSTRUIRE_IG: '',
     PLACEHOLDER_INSTRUCTOR_IG: '',
     PLACEHOLDER_TEMATICA_IG: '',
     PLACEHOLDER_VERIFICATOR_IG: '',
     PLACEHOLDER_DATA_INSTRUIRE_LM: '',
     PLACEHOLDER_DURATA_INSTRUIRE_LM: '',
     PLACEHOLDER_LOC_MUNCA_LM: '',
     PLACEHOLDER_INSTRUCTOR_LM: '',
     PLACEHOLDER_TEMATICA_LM: '',
     PLACEHOLDER_VERIFICATOR_LM: '',
     PLACEHOLDER_DATA_ADMITERE: '',
     PLACEHOLDER_ADMITERE_NUME: '',
     PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: '',
     PLACEHOLDER_DURATA_INSTRUCTAJ_IG_PSI: '',
     PLACEHOLDER_INSTRUCTOR_IG_PSI: '',
     PLACEHOLDER_TEMATICA_IG_PSI: '',
     PLACEHOLDER_VERIFICATOR_IG_PSI: '',
     PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: '',
     PLACEHOLDER_DURATA_INSTRUCTAJ_LM_PSI: '',
     PLACEHOLDER_LOC_MUNCA_LM_PSI: '',
     PLACEHOLDER_INSTRUCTOR_LM_PSI: '',
     PLACEHOLDER_TEMATICA_LM_PSI: '',
     PLACEHOLDER_VERIFICATOR_LM_PSI: '',
     PLACEHOLDER_DATA_ADMITERE_PSI: '',
     PLACEHOLDER_ADMITERE_NUME_PSI: '',
   };
   ```
4. **`ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`**:
   Remove mock clinic (`CENTRU MEDICAL DE MEDICINA MUNCII`), doctor (`Dr. Alexandrescu Victor`), phone, email, and generic TESA descriptions when not in DB.
5. **`ROMANIAN_LEGAL_EIP`**:
   Remove mock employee (`Stan Alexandru`), hardcoded sizes (`42`, `M / 48`, `9 (L)`), and the 10 static rows with `'Semnat salariat'`.
6. **`ROMANIAN_LEGAL_HR_CIM`**:
   Remove mock dates `'15.01.2026'`, mock address `'Str. Victoriei nr. 10'`, postal code `'010001'`.
7. **`ROMANIAN_LEGAL_HYGIENE`**:
   Remove mock DSP doctor, nurse, authorization numbers (`1225/2023`, `8941/2023`), exam dates `'15.03.2026'`. Remove fallback participant roster (Lines 1883–1907) that creates a fake `Stan Alexandru` with grade 10 and cert 0042. If there are no participants, `participants` is `[]`.

#### Step 2: Clean `verifiedMap` and Remove Fallbacks
In `resolveTemplateData`:
- `const legalRepresentativeName = client?.legalRepresentative || '';` (Remove `'Munteanu Cristian'`).
- `PLACEHOLDER_FIRMA: client?.name || ''` (Remove `'S.C. CLIENT TEST S.R.L.'`).
- `PLACEHOLDER_CUI: client?.cui || ''` (Remove `'RO12345678'`).
- `PLACEHOLDER_NR_REG_COM: client?.regCom || ''` (Remove `'J40/1000/2021'`).
- `PLACEHOLDER_ADRESA_FIRMA: client?.address || ''` (Remove `'București, Sector 1'`).
- `PLACEHOLDER_ADRESA: addressFull || client?.address || ''`.
- `PLACEHOLDER_TELEFON_CONTACT: client?.contactPhone || ''`.
- `PLACEHOLDER_EMAIL_CONTACT: client?.contactEmail || ''`.
- `PLACEHOLDER_AN_INFIINTARE: client?.foundedYear ? String(client.foundedYear) : ''`.
- `PLACEHOLDER_NUMAR_LUCRATORI: job?.workersCount ? String(job.workersCount) : (client?.employees?.length ? String(client.employees.length) : '')`.
- Decisions & Appointees:
  - `decisionsDateRo = client?.decisionsDate ? formatDateRo(client.decisionsDate) : ''` (Remove `'15.01.2026'`).
  - `PLACEHOLDER_NUMAR_DECIZIE_01`: `decisionsDateRo ? `01/${decisionsDateRo}` : ''`.
  - `designatedWorker`: `client?.designatedWorkerSsm ? `${client.designatedWorkerSsm} (Lucrător desemnat SSM)` : ''`.
  - `firstAid`: `client?.firstAidResponder ? `${client.firstAidResponder} (Personal instruit prim ajutor)` : ''`.
  - `psiOfficer`: `client?.psiResponder ? `${client.psiResponder} (Cadru tehnic PSI)` : ''`.
  - `investMembers`: `client?.investigationMembers || ''`.
  - Responsibles 1–4: `client?.designatedWorkerSsm || ''`, `client?.firstAidResponder || ''`, `client?.psiResponder || ''`, `client?.investigationMembers || ''`.
- Employee:
  - If `employee` is null: ALL employee placeholders must resolve to `""`! (Completely eliminate the `else` branch lines 1601–1636 that created a fake `Stan Alexandru`).
  - If `employee` is present:
    - `birthDate`: `employee.birthDate ? formatDateRo(employee.birthDate) : ''` (Remove `'15.03.1988'`).
    - `birthPlace`: `employee.birthPlace || ''`.
    - `birthCounty`: `employee.birthCounty || ''`.
    - `identityDocument`: `docType`, `series`, `number`, `issuedBy`, `issueDate`, `expiryDate` all resolve to `""` if missing in DB (Remove `'RX'`, `'123456'`, `'SPCLEP Sector 1'`, `'10.05.2020'`).
    - `residenceAddress`: `addressFull || ''`.
    - `shoeSize`: `(employee as any)?.shoeSize || ''` (Remove `'42'`).
    - `clothingSize`: `(employee as any)?.clothingSize || ''` (Remove `'L'`).
    - `gloveSize`: `(employee as any)?.gloveSize || ''` (Remove `'9'`).
    - `bloodType`: `(employee as any)?.bloodType ? `${(employee as any).bloodType}${(employee as any)?.rhFactor ? ` (Rh ${(employee as any).rhFactor})` : ''}` : ''` (Remove `'0I (Rh +)'`).
    - `commuteRoute`: `(employee as any)?.commuteRoute || ''` (Remove `'Deplasare urbană domiciliu - sediu'`).
    - `commuteDuration`: `(employee as any)?.commuteDurationMinutes != null ? `${(employee as any).commuteDurationMinutes} minute` : ''` (Remove `'30 minute'`).
    - `cimNumber`: `(employee as any)?.cimNumber || (context.customOverrides?.PLACEHOLDER_NUMAR_CIM as string) || (context.allowOfflineBlank ? '........ / .........' : '')`.
    - `grossSalary`: `(employee as any)?.grossSalary != null ? `${(employee as any).grossSalary} lei` : ((employee as any)?.salary ? `${(employee as any).salary} lei` : ((context.customOverrides?.PLACEHOLDER_SALARIU_BRUT as string) || (context.allowOfflineBlank ? '........................ lei' : '')))`.
    - `workNorm`: `(employee as any)?.workNorm != null ? `Normă întreagă (${(employee as any).workNorm} ore/zi, ${(employee as any).workNorm * 5} ore/săptămână)` : ''`.
    - `probationDays`: `(employee as any)?.probationDays != null ? `${(employee as any).probationDays} zile calendaristice` : ''`.
    - `annualLeaveDays`: `(employee as any)?.annualLeaveDays != null ? `${(employee as any).annualLeaveDays} zile lucrătoare` : ''`.

#### Step 3: Eliminate Implicit `[0]` Context Fallbacks
1. Update `TemplateResolutionContext` interface:
   ```typescript
   export interface TemplateResolutionContext {
     templateCode: string;
     clientId: string;
     employeeId?: string;
     jobId?: string;
     worksiteId?: string;
     hygieneSessionId?: string;
     hygieneParticipantId?: string;
     customOverrides?: Record<string, unknown>;
     allowOfflineBlank?: boolean;
   }
   ```
2. Update `TemplateResolutionOptions` interface:
   ```typescript
   export interface TemplateResolutionOptions {
     client: any;
     employee?: any;
     worksite?: any;
     job?: any;
     jobId?: string;
     worksiteId?: string;
     hygieneSession?: any;
     hygieneParticipant?: any;
     customOverrides?: Record<string, unknown>;
     allowOfflineBlank?: boolean;
   }
   ```
3. In `resolveTemplatePlaceholders`:
   - `employee`: If `ctx.employeeId` is undefined, `employee = null`! (Never fall back to `client.employees[0]`).
   - `selectedJob`: `employee?.currentJob || (ctx.jobId ? client.jobs.find((j) => j.id === ctx.jobId) : null) || null` (Never fall back to `client.jobs[0]`).
   - `selectedWorksite`: `(ctx.worksiteId ? client.worksites.find((w) => w.id === ctx.worksiteId) : null) || employee?.currentWorksite || null` (Never fall back to `client.worksites[0]`).
4. In `resolveTemplateData`:
   - `job`: `context.job || (context.jobId && client?.jobs ? client.jobs.find((j: any) => j.id === context.jobId) : null) || employee?.currentJob || null`.
   - `worksite`: `context.worksite || (context.worksiteId && client?.worksites ? client.worksites.find((w: any) => w.id === context.worksiteId) : null) || employee?.currentWorksite || null`.

#### Step 4: Authentic `isAutocompleted` Provenance Tracking
In `resolveTemplateData`, track authentic DB provenance:
1. Maintain an internal `autocompletedKeys = new Set<string>()`.
2. Define helper:
   ```typescript
   function bindDbToken(key: string, value: unknown, isAuthenticDb: boolean) {
     if (isAuthenticDb && value !== undefined && value !== null && String(value).trim() !== '') {
       verifiedMap[key] = value;
       autocompletedKeys.add(key);
     } else {
       verifiedMap[key] = value ?? '';
     }
   }
   ```
3. Add `autocompletedKeys` to `TemplateResolutionResult`:
   ```typescript
   export interface TemplateResolutionResult {
     templateId: string;
     templateName: string;
     data: Record<string, any>;
     unresolvedPlaceholders: string[];
     status: 'ready' | 'missing_data';
     autocompletedKeys?: Set<string>;
   }
   ```
4. In `resolveTemplatePlaceholders`:
   ```typescript
   const autocompletedSet = resolutionResult.autocompletedKeys || new Set<string>();

   const resolvedFields: ResolvedPlaceholderItem[] = template.fields
     .filter((def: TemplateFieldDef) => !/_\d{2,3}$/.test(def.key))
     .map((def: TemplateFieldDef) => {
       const rawVal = resolutionResult.data[def.key];
       const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';
       const isAutocompleted = autocompletedSet.has(def.key) && hasValue;

       return {
         key: def.key,
         label: def.label,
         source: def.source,
         type: def.type,
         required: def.required,
         value: hasValue ? (rawVal as string | number | boolean) : '',
         isAutocompleted,
       };
     });
   ```
5. Result:
   - If a field exists in DB with real data: `isAutocompleted: true`, displayed in `autoFields`.
   - If a field is missing, null, or empty in DB: `isAutocompleted: false`, displayed in `manualFields` so the operator can fill it in.
   - If an employee is not selected: all employee fields have `isAutocompleted: false` and `value: ''`.

#### Step 5: Safeguarding Dependencies & Callers
- `src/app/api/templates/[code]/fields/route.ts`:
  Extract `const worksiteId = searchParams.get('worksiteId') || undefined;` and forward to `resolveTemplatePlaceholders`.
- `src/app/api/documents/generate/route.ts`:
  Extract `worksiteId` from `body` and forward to `resolveTemplatePlaceholders` and `generateDocument`.
- `src/app/documents/generate/page.tsx`:
  - Remove `.slice(0, 20)` in line 1222 so all missing fields are rendered.
  - Forward `worksiteId` in API calls.
- `src/lib/templates/generator.ts`:
  - When `validateMissingFields` evaluates `params.data`, empty string `""` will correctly trigger `missingFields.push(f.label)`.
  - When required fields are missing, `status` becomes `'missing_data'`.
  - Flag `approved_for_print` is awarded ONLY when `finalMissingFields.length === 0`.

---

## 5. Verification Method

1. **Compilation & Schema Verification**:
   ```bash
   npx prisma validate
   npx tsc --noEmit
   npm run build
   ```
2. **Absence of Mock Strings in Codebase**:
   Verify zero occurrences of test mocks in `src/lib/templates/resolver.ts`:
   ```bash
   grep -E "Munteanu Cristian|CLIENT TEST|RO12345678|1880315410127|RX 123456|15.03.1988|0I \(Rh \+\)|SOL-MED-042|BA-042" src/lib/templates/resolver.ts
   ```
   *Expected output*: 0 matches.
3. **Sparse & Empty Client/Employee Resolution Probe**:
   Execute probe with empty client and verify:
   ```bash
   npx tsx -e "
   import { resolveTemplatePlaceholders } from './src/lib/templates/resolver';
   import { prisma } from './src/lib/prisma';
   async function test() {
     const client = await prisma.client.findFirst();
     const res = await resolveTemplatePlaceholders({
       templateCode: 'hr-cim-model-cadru-2022',
       clientId: client.id,
       // no employee selected
     });
     const cnpField = res.fields.find(f => f.key === 'PLACEHOLDER_CNP');
     const repField = res.fields.find(f => f.key === 'PLACEHOLDER_REPREZENTANT_LEGAL');
     console.log('CNP autocompleted:', cnpField?.isAutocompleted, 'value:', cnpField?.value);
     console.log('Rep Legal autocompleted:', repField?.isAutocompleted, 'value:', repField?.value);
     if (cnpField?.isAutocompleted || cnpField?.value) throw new Error('FAIL: CNP must not be autocompleted when no employee is selected');
     console.log('PASS: Empty context resolved cleanly without mocks');
   }
   test();
   "
   ```
4. **End-to-End Generation Test**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   Verify all 31 templates generate cleanly, real DB data binds properly, and sparse entities result in `'missing_data'` status instead of false `'approved_for_print'`.

5. **Invalidation Conditions**:
   - Any test mock (`Munteanu Cristian`, `CLIENT TEST S.R.L.`, `RO12345678`, `RX 123456`, `15.03.1988`) found in generated document artifacts for clients without those values.
   - `isAutocompleted` evaluating to `true` for a field when the underlying DB column is null.
   - `npm run build` throwing TypeScript errors.
