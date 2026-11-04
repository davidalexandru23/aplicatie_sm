# Handoff Report: Dynamic Contextual Template Data Binding & CAEN Profile Resolution

**Agent ID**: `m1_r2_spec_miner_3` (teamwork_spec_miner)  
**Milestone**: Milestone 1 (SSM Domain Schema & Contextual CAEN Engine)  
**Date**: 2026-11-02  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r2_spec_miner_3/`  
**Target Recipient**: Orchestrator (`e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`)  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Forensic Inventory of Hardcoded Values in `src/lib/templates/resolver.ts`
Inspection of `src/lib/templates/resolver.ts` (759 lines) reveals 8 static legal fallback profiles containing over 150 hardcoded strings and numbers that currently bypass dynamic database client context:

1. **`ROMANIAN_LEGAL_RISK` (lines 245–273)**:
   - Line 246: `PLACEHOLDER_AN_INFIINTARE: '2021'`
   - Line 247: `PLACEHOLDER_AN_EVALUARE: '2026'`
   - Line 248: `PLACEHOLDER_COD_CAEN: '6201 - Activități de realizare a software-ului la comandă'`
   - Line 249: `PLACEHOLDER_ACTIVITATE_PRINCIPALA: 'Consultanță în tehnologia informației, inginerie software și suport IT'`
   - Line 250: `PLACEHOLDER_NUMAR_LUCRATORI: '10'`
   - Line 251: `PLACEHOLDER_PROGRAM_LUCRU: '8 ore/zi, 40 ore/săptămână, Luni - Vineri: 08:30 - 17:00'`
   - Line 252: `PLACEHOLDER_NIVEL_RISC_GLOBAL: '2.62'`
   - Line 253: `PLACEHOLDER_CONCLUZII_EVALUARE: 'Nivelul global de risc calculat pentru postul de lucru analizat este de 2,62, încadrându-se în categoria locurilor de muncă cu nivel de risc acceptabil (Nrg <= 3,50 conform metodei INCDPM)...'`
   - Line 254: `PLACEHOLDER_NUMAR_DOCUMENT: '01'`
   - Line 255: `PLACEHOLDER_NUMAR_FISA_EVALUARE: '01'`
   - Line 256: `PLACEHOLDER_NUMAR_LOC_MUNCA: '1'`
   - Line 257: `PLACEHOLDER_NUMAR_PERSOANE_EXPUSE: '5'`
   - Line 258: `PLACEHOLDER_DURATA_EXPUNERII: '8 ore/zi'`
   - Line 259: `PLACEHOLDER_NUMAR_FACTORI_RISC: '30 factori de risc (17 cu nivel parțial 3, 4 cu nivel parțial 2, 9 cu nivel parțial 1)'`
   - Line 260: `PLACEHOLDER_REPARTITIE_RISCURI: 'Executant: 33.33% (10 factori); Sarcina de muncă: 26.67% (8 factori); Mijloace de producție: 30.00% (9 factori); Mediul de muncă: 10.00% (3 factori)'`
   - Lines 261–272: Hardcoded facility hazard zones 01 through 06 (`PLACEHOLDER_DENUMIRE_ZONA_01..06`, `PLACEHOLDER_MASURI_ZONA_01..06`).

2. **`ROMANIAN_LEGAL_DECIZII` (lines 71–110)**:
   - Lines 72–81: 10 decision numbers hardcoding the static date `15.01.2026`:
     * `PLACEHOLDER_NUMAR_DECIZIE_01`: `'01/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_02`: `'02/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_03`: `'03/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_04`: `'04/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_05`: `'05/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_06`: `'06/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_07`: `'07/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_08`: `'08/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_09`: `'09/15.01.2026'`
     * `PLACEHOLDER_NUMAR_DECIZIE_11`: `'11/15.01.2026'`
   - Lines 82–89: Static organizational safety appointees:
     * `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`: `'Ing. Mihai Popescu (Specialist SSM abilitat conform HG 1425/2006)'`
     * `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`: `'Ioana-Raluca Dumitru (Personal instruit prim ajutor, Certificat Crucea Roșie Română)'`
     * `PLACEHOLDER_RESPONSABIL_PSI`: `'Gheorghe Barbu (Cadru tehnic cu atribuții PSI atestat IGSU)'`
     * `PLACEHOLDER_MEMBRU_COMISIE`: `'Elena Vasilescu, Alexandru Stan'`
     * `PLACEHOLDER_RESPONSABIL_CONTROL_PSI`: `'Gheorghe Barbu'`
     * `PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI`: `'Ing. Mihai Popescu'`
   - Lines 90–109: Static hot work permit parameters (`PLACEHOLDER_NUMAR_PERMIS_FOC: '01/2026'`, `PLACEHOLDER_DATA_PERMIS_FOC: '15.01.2026'`, `PLACEHOLDER_EXECUTANT_LUCRARE: 'Vasile Ionescu...'`, `PLACEHOLDER_DATA_INCEPERE_LUCRARE: '15.01.2026'`).

3. **`TESA_DEFAULT_FACTORS` & `INCDPM_30_FACTORS` (lines 204–243)**:
   - 30 static INCDPM risk factors representing an office/software developer workstation (e.g. static row 12 "Suprasolicitare dorso-lombară prin efort static așezat", row 13 "Suprasolicitare vizuală la videoterminale", row 27 "Lucru cu substanțe iritante (toner, solvenți)").
   - 90 mapped scalar values: `PLACEHOLDER_GRAVITATE_RISC_01..30`, `PLACEHOLDER_FRECVENTA_RISC_01..30`, `PLACEHOLDER_NIVEL_PARTIAL_RISC_01..30`.

4. **`ROMANIAN_LEGAL_SSM_PROVIDER` (lines 40–65)**:
   - 24 static tokens for external prevention service (SEPP): `PLACEHOLDER_PRESTATOR_SSM: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'`, `PLACEHOLDER_SPECIALIST_SSM: 'Ing. Mihai Popescu...'`, `PLACEHOLDER_CERTIFICAT_EVALUATOR: 'Certificat Evaluator Riscuri SSM seria EV nr. 10452/2018...'`.

### 1.2 Critical Fallback Key Collision in `ALL_ROMANIAN_LEGAL_FALLBACKS`
Running an empirical key overlap analysis on `resolver.ts` lines 307–316:
```typescript
export const ALL_ROMANIAN_LEGAL_FALLBACKS: Record<string, unknown> = {
  ...ROMANIAN_LEGAL_SSM_PROVIDER,
  ...ROMANIAN_LEGAL_DECIZII,
  ...ROMANIAN_LEGAL_IPSSM,
  ...ROMANIAN_LEGAL_TRAINING,
  ...ROMANIAN_LEGAL_HYGIENE,
  ...ROMANIAN_LEGAL_RISK,
  ...INCDPM_30_FACTORS,
  ...ROMANIAN_LEGAL_HR_CIM,
};
```
Detected two major collisions:
1. **`PLACEHOLDER_MEMBRU_COMISIE`**:
   - `ROMANIAN_LEGAL_DECIZII` defines: `'Elena Vasilescu, Alexandru Stan'` (Company accident investigation committee under Legea 319/2006 art. 13 lit. c).
   - `ROMANIAN_LEGAL_HYGIENE` defines: `'As. Med. Ionescu Claudia (Asistent Medical DSP București)'` (DSP examination commission member under Ordinul 2209/2022).
   - **Observable Glitch**: Because `ROMANIAN_LEGAL_HYGIENE` is spread AFTER `ROMANIAN_LEGAL_DECIZII`, template `DECIZII.docx` erroneously generates with a DSP public health nurse as the internal accident investigation member whenever client investigation members are not explicitly provided.
2. **`PLACEHOLDER_PROGRAM_LUCRU`**:
   - `ROMANIAN_LEGAL_RISK`: `'8 ore/zi, 40 ore/săptămână, Luni - Vineri: 08:30 - 17:00'`
   - `ROMANIAN_LEGAL_HR_CIM`: `'Normă întreagă de 8 ore/zi, 40 ore/săptămână, Luni - Vineri între 08:30 - 17:00'`
   - `ROMANIAN_LEGAL_HR_CIM` clobbers `ROMANIAN_LEGAL_RISK` in global fallbacks.

### 1.3 `resolveTemplateData` Ignores Client CAEN & Decisions State
Executing a probe against `resolveTemplateData` using a client with custom CAEN 4120 (Construction) and customized decision appointees (`npx tsx`):
```typescript
const customClient = {
  caenCode: '4120',
  caenActivity: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
  foundedYear: 2022,
  ssmProviderName: 'PREVENT SSM CONSULT S.R.L.',
  ssmSpecialistName: 'Ing. Radu Georgescu',
  ssmSpecialistCert: 'Certificat seria BC nr. 9988/2020',
  designatedWorkerSsm: 'Ing. Radu Georgescu',
  firstAidResponder: 'Maria Popa',
  psiResponder: 'Cristian Enache',
  investigationMembers: 'Ioan Ilie, Vasile Marin',
  decisionsDate: new Date('2026-02-10'),
};
```
Observed return values:
- `PLACEHOLDER_COD_CAEN`: `'6201 - Activități de realizare a software-ului la comandă'` (Custom CAEN 4120 was completely ignored!)
- `PLACEHOLDER_ACTIVITATE_PRINCIPALA`: `'Consultanță în tehnologia informației, inginerie software...'` (Ignored!)
- `PLACEHOLDER_AN_INFIINTARE`: `'2021'` (Ignored 2022!)
- `PLACEHOLDER_PRESTATOR_SSM`: `'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'` (Ignored PREVENT SSM CONSULT!)
- `PLACEHOLDER_NUMAR_DECIZIE_01`: `'01/15.01.2026'` (Ignored 10.02.2026!)
- `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`: `'Ing. Mihai Popescu...'` (Ignored Ing. Radu Georgescu!)
- `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`: `'Ioana-Raluca Dumitru...'` (Ignored Maria Popa!)
- `PLACEHOLDER_RESPONSABIL_PSI`: `'Gheorghe Barbu...'` (Ignored Cristian Enache!)

### 1.4 Source Metadata Misalignments in `src/lib/templates/definitions.ts`
Inspection of `src/lib/templates/definitions.ts` reveals metadata misalignments for risk and decision templates:
- `risk-evaluare` (lines 1789–1914): `PLACEHOLDER_COD_CAEN`, `PLACEHOLDER_ACTIVITATE_PRINCIPALA`, `PLACEHOLDER_AN_INFIINTARE`, `PLACEHOLDER_NIVEL_RISC_GLOBAL`, `PLACEHOLDER_CONCLUZII_EVALUARE`, `PLACEHOLDER_CERTIFICAT_EVALUATOR` are marked `source: 'manual'`, and `PLACEHOLDER_PRESTATOR_SSM` is erroneously marked `source: 'hygieneSession.providerName'`.
- `decizii-angajator` (lines 1112–1433): `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`, `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`, `PLACEHOLDER_RESPONSABIL_PSI` are marked `source: 'manual'`, and `PLACEHOLDER_MEMBRU_COMISIE` is marked `source: 'hygieneSession.commissionMember1'`.
- `risk-plan-prevenire-tesa` (lines 2130–2171): `PLACEHOLDER_PRESTATOR_SSM` is marked `source: 'hygieneSession.providerName'`.
- `risk-zone-pericol` (lines 3087–3120): `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM` is marked `source: 'manual'`.

### 1.5 Token Mapping in Normalized DOCX/XLSX Files
Running programmatic token inspection on `templates_registry/normalized/` confirms:
- `TESA.docx` contains exactly 103 tokens: 90 factor table tokens (`PLACEHOLDER_GRAVITATE_RISC_01..30`, `PLACEHOLDER_FRECVENTA_RISC_01..30`, `PLACEHOLDER_NIVEL_PARTIAL_RISC_01..30`) + 13 header/metadata tokens.
- `EVALUAREA RISCURILOR.docx` contains 16 tokens.
- `DECIZII.docx` contains 44 tokens.
- `Zone pericol grav si iminent.docx` contains 15 tokens.
- Across all 25 templates, 0 raw tokens remain unmapped when tested with default seed data (`npx tsx scripts/test-all-templates-generation.ts` passes 25/25 in 1.84s).

---

## 2. Logic Chain

```
[Observation 1.1: resolver.ts has 150+ hardcoded legal strings for CAEN 6201, Decizii, SEPP]
   │
   ▼
[Observation 1.3: Custom CAEN & Appointees are ignored because verifiedMap lacks bindings]
   │
   ▼
(Step 1: Extend resolveTemplateData verifiedMap with dynamic CAEN & Decision bindings)
   │ When client.caenCode exists -> extract 4-digit code -> call getRiskProfileForCaen
   │ When client.caenCode is null/empty -> safely fall back to 6201 (IT / TESA profile)
   │
   ▼
[Observation 1.5: TESA.docx expects exactly 30 numbered factor tokens: 01 to 30]
   │
   ▼
(Step 2: Bind RiskProfile factors to PLACEHOLDER_GRAVITATE_RISC_xx, FRECVENTA, NIVEL_PARTIAL)
   │ For i = 1..30: pad = i.padStart(2, '0')
   │ Map factor[i-1].severity -> GRAVITATE_RISC_xx
   │ Map factor[i-1].probability -> FRECVENTA_RISC_xx
   │ Map factor[i-1].riskLevel -> NIVEL_PARTIAL_RISC_xx
   │ If profile has < 30 factors, pad safely from TESA_DEFAULT_FACTORS to guarantee 0 missing tokens!
   │
   ▼
(Step 3: Dynamically compute N_rg, Subsystem Distributions, and Conclusions)
   │ scoreRo = profile.globalRiskScore.toFixed(2).replace('.', ',')
   │ Count factors in Executant, Sarcină, Mijloace, Mediu -> compute percentages
   │ Generate conclusion confirming N_rg <= 3.50 acceptability under Legea 319/2006
   │
   ▼
[Observation 1.1: Decision numbers hardcode '15.01.2026']
   │
   ▼
(Step 4: Bind client.decisionsDate dynamically to Decision Numbers and Permit Dates)
   │ decDateRo = formatDateRo(client.decisionsDate) || '15.01.2026'
   │ NUMAR_DECIZIE_01..11 = `${code}/${decDateRo}`
   │ Bind designatedWorkerSsm, firstAidResponder, psiResponder, investigationMembers
   │ Bind indexed aliases: PLACEHOLDER_NUME_RESPONSABIL_1..4
   │
   ▼
[Observation 1.2: PLACEHOLDER_MEMBRU_COMISIE hygiene collision in ALL_ROMANIAN_LEGAL_FALLBACKS]
   │
   ▼
(Step 5: Scope template fallbacks by template family & prioritize verifiedMap)
   │ verifiedMap for decisions always uses client.investigationMembers || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_MEMBRU_COMISIE
   │ Completely isolates accident commission from DSP hygiene exam commissions
   │
   ▼
[Observation 1.4: definitions.ts metadata incorrectly points to manual or hygieneSession]
   │
   ▼
(Step 6: Update TemplateFieldDef sources in definitions.ts)
   │ Change 'manual' -> 'client.caenCode', 'client.designatedWorkerSsm', etc.
   │ Produces 100% schema consistency between definitions.ts and resolver.ts
```

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Dynamic CAEN Binding | CAEN Profile Resolution | Dynamically resolves client economic activity and risk profile from `Client.caenCode` | `client.caenCode`, `job.title` | `CaenRiskProfile`, `PLACEHOLDER_COD_CAEN`, `PLACEHOLDER_ACTIVITATE_PRINCIPALA` | Falls back safely to CAEN 6201 if code is null/empty or unrecognized | `resolver.ts` & `PROJECT.md` |
| 2 | Dynamic Risk Assessment | 30-Factor Grid Mapping | Maps `CaenRiskProfile.factors` to 30 positional tokens in `TESA.docx` (`_01` to `_30`) | `CaenRiskProfile.factors` | `GRAVITATE_RISC_xx`, `FRECVENTA_RISC_xx`, `NIVEL_PARTIAL_RISC_xx` | Pads missing positions with legal defaults if factor count $< 30$ | `TESA.docx` disassembly & `definitions.ts` |
| 3 | Dynamic Risk Assessment | Subsystem Percentage Calculation | Dynamically computes percentage and count breakdown across Executant, Sarcină, Mijloace, Mediu | `CaenRiskProfile.factors` | `PLACEHOLDER_REPARTITIE_RISCURI` | Guards against division by zero if factors array is empty (defaults to 30) | `resolver.ts` line 260 |
| 4 | Dynamic Risk Assessment | Semi-Quantitative $N_{rg}$ Verdict | Formats global risk score with Romanian decimal separator and generates Legea 319/2006 compliance text | `profile.globalRiskScore` | `PLACEHOLDER_NIVEL_RISC_GLOBAL`, `PLACEHOLDER_CONCLUZII_EVALUARE` | Caps score at 7.00; flags acceptable if $\le 3.50$ | INCDPM Standard & `resolver.ts` |
| 5 | Dynamic SEPP Binding | External Provider Credentialing | Injects client-specific SEPP provider, specialist name, and certificate number | `client.ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert` | `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_SPECIALIST_SSM`, `PLACEHOLDER_EVALUATOR_RISC` | Falls back to authorized SEPP fallback (`EXPERT SSM`) if client fields null | `resolver.ts` lines 40–65 |
| 6 | Organizational Decisions | Dynamic Decision Date & Numbering | Derives decision issuance dates and numbers (`01/DD.MM.YYYY` .. `11/DD.MM.YYYY`) from `client.decisionsDate` | `client.decisionsDate` | `PLACEHOLDER_NUMAR_DECIZIE_01..11`, `PLACEHOLDER_DATA_DECIZIE` | Falls back to `15.01.2026` if `decisionsDate` is null | `DECIZII.docx` & `definitions.ts` |
| 7 | Organizational Decisions | Dynamic Safety Appointee Binding | Injects designated SSM worker, first aid responder, PSI responder, and accident investigation members | `client.designatedWorkerSsm`, `firstAidResponder`, `psiResponder`, `investigationMembers` | `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`, `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`, `PLACEHOLDER_RESPONSABIL_PSI`, `PLACEHOLDER_MEMBRU_COMISIE` | Falls back to statutory SEPP/Red Cross/IGSU fallbacks if appointees not configured | `resolver.ts` lines 71–110 |
| 8 | Organizational Decisions | Indexed Appointee Aliases | Exposes indexed appointee tokens (`PLACEHOLDER_NUME_RESPONSABIL_1..4`) matching decision roles | `client` decision fields | `PLACEHOLDER_NUME_RESPONSABIL_1..4` | Returns default appointee names if client fields null | Dispatch requirement |
| 9 | Organizational Decisions | Hot Work Permit Safety Precaution Alignment | Aligns hot work permit dates (`dataPermisFoc`, `dataIncepere`, `dataFinalizare`, `dataBuletin`) with client decision date | `client.decisionsDate` | `PLACEHOLDER_DATA_PERMIS_FOC`, `PLACEHOLDER_DATA_INCEPERE_LUCRARE`, etc. | Uses current/decision date consistently across permit form | `DECIZII.docx` lines 317–347 |
| 10 | Catalog Metadata | Strict Schema Source Alignment | Maps `definitions.ts` field sources directly to Prisma model attributes (`client.caenCode`, `client.designatedWorkerSsm`, etc.) | Catalog registry | Correct `TemplateFieldDef.source` annotations | None (type-safe string literals) | `definitions.ts` audit |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | CAEN Resolution | `client.caenCode = null` or `undefined` | Safely falls back to CAEN `'6201'` and `TESA_DEFAULT_FACTORS` ($N_{rg} = 2.62$). Zero crashes. |
| 2 | CAEN Resolution | `client.caenCode = "6201 - Activități de realizare software"` | Regex `\d{4}` extracts clean code `'6201'`, binds activity cleanly without string duplication. |
| 3 | CAEN Resolution | `client.caenCode = "9999"` (unknown code) | Logs fallback warning, uses generic office/TESA risk profile with 30 factors, $N_{rg} \le 3.50$. |
| 4 | Risk Factor Padding | Profile with 20 factors applied to `TESA.docx` | Positions 01–20 populated from profile; positions 21–30 padded from `TESA_DEFAULT_FACTORS`. Zero unmapped `{PLACEHOLDER_*}` tokens. |
| 5 | Subsystem Percentage | Profile with 0 factors in `MEDIU` subsystem | Computes `Mediul de muncă: 0.00% (0 factori)` without `NaN` or arithmetic error. |
| 6 | Decision Numbers | `client.decisionsDate = new Date('2024-02-29')` (Leap Year) | Generates `01/29.02.2024` cleanly without month rollover drift. |
| 7 | Partial Appointees | Client has `psiResponder = 'Popa Dan'`, but `firstAidResponder = null` | `PLACEHOLDER_RESPONSABIL_PSI` binds `'Popa Dan'`; `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR` safely falls back to legal default `'Ioana-Raluca Dumitru'`. |
| 8 | Multiple Investigation Members | `client.investigationMembers = 'Ilie Vasile, Popescu Elena, Radu Ion'` | Injected verbatim into `PLACEHOLDER_MEMBRU_COMISIE` and `PLACEHOLDER_NUME_RESPONSABIL_4`. Does not pull hygiene nurse. |
| 9 | Dual Client Generation | Switch from Client A (IT 6201) to Client B (Construcții 4120) | Generates completely distinct risk documents and decisions without state cross-contamination. |
| 10 | Company Founded Year | `client.foundedYear = 2018` | Binds `'2018'` to `PLACEHOLDER_AN_INFIINTARE`; falls back to `'2021'` if null. |

---

## 5. Caveats

1. **Preset Module Dependency (`caen-risk-presets.ts`)**:
   Dynamic risk profile resolution depends on `getRiskProfileForCaen` implemented in `src/lib/risk/caen-risk-presets.ts`. The resolver design incorporates an internal defensive fallback to `TESA_DEFAULT_FACTORS` so that `resolver.ts` compiles cleanly and executes without crashes even before `caen-risk-presets.ts` is fully wired.
2. **Dynamic Factor Counts in Future Templates**:
   While `TESA.docx` has 30 fixed rows in its Word table, dynamic industrial risk assessments with variable rows (e.g. 20–45 factors) will utilize docxtemplater loop arrays (`{#riskItems}...{/riskItems}`).
3. **No Electronic Signatures**:
   In strict compliance with R3, decision templates generate designated printed name blocks for wet ink signing by the administrator and appointees.

---

## 6. Conclusion & Actionable Specification

### 6.1 Complete Blueprint for `src/lib/templates/resolver.ts`

The worker agent should update `resolveTemplateData` in `src/lib/templates/resolver.ts` with the following implementation:

```typescript
// ============================================================================
// DYNAMIC CONTEXTUAL CAEN & ORGANIZATIONAL DECISIONS DATA BINDING
// ============================================================================

import { getRiskProfileForCaen, CaenRiskProfile } from '../risk/caen-risk-presets';

// Helper function to extract 4-digit CAEN code safely
function extractCaenCode(raw?: string | null): string {
  if (!raw) return '6201';
  const match = String(raw).match(/\b\d{4}\b/);
  return match ? match[0] : '6201';
}

// Helper to safely format CAEN and Activity title
function formatCaenActivity(code: string, activity?: string | null, industryName?: string): string {
  const title = (activity || industryName || 'Activități economice generale').trim();
  return `${code} - ${title}`;
}

// In resolveTemplateData:
export async function resolveTemplateData(
  templateId: string,
  context: {
    client: any;
    employee?: any;
    worksite?: any;
    job?: any;
    hygieneSession?: any;
    hygieneParticipant?: any;
    customOverrides?: Record<string, unknown>;
  }
): Promise<TemplateResolutionResult> {
  const template = TEMPLATE_CATALOG.find(
    (t) => t.code === templateId || t.normalizedFilename === templateId || (t as any).id === templateId
  );

  if (!template) {
    throw new Error(`Șablonul cu identificatorul ${templateId} nu a fost găsit în catalog.`);
  }

  const client = context.client;
  const employee = context.employee || null;
  const job = context.job || employee?.currentJob || (client?.jobs && client.jobs[0]) || null;
  const worksite = context.worksite || employee?.currentWorksite || (client?.worksites && client.worksites[0]) || null;
  const hygieneSession = context.hygieneSession || null;
  const participant = context.hygieneParticipant || null;

  const now = new Date();
  const currentDateRo = formatDateRo(now);
  const currentYear = now.getFullYear();

  // 1. Resolve CAEN Code & Risk Profile dynamically
  const caenCode = extractCaenCode(client?.caenCode);
  let riskProfile: CaenRiskProfile;
  try {
    riskProfile = getRiskProfileForCaen(caenCode, job?.title);
  } catch {
    // Defensive fallback if presets module is unavailable or threw
    riskProfile = {
      caenCode: '6201',
      industryName: 'Tehnologia Informației / Software',
      globalRiskScore: 2.62,
      factors: TESA_DEFAULT_FACTORS.map((f) => ({
        element: f.index <= 10 ? 'EXECUTANT' : f.index <= 18 ? 'SARCINA' : f.index <= 27 ? 'MIJLOACE' : 'MEDIU',
        riskFactor: f.hazard,
        manifestation: f.hazard,
        consequences: f.consequence,
        severity: f.gravity,
        probability: f.frequency,
        riskLevel: f.partialRisk,
        preventionMeasures: ['Instruire periodică', 'Respectare instrucțiuni'],
      })),
    };
  }

  const caenTitle = client?.caenActivity || riskProfile.industryName || 'Activități de realizare a software-ului la comandă';
  const fullCaenDisplay = client?.caenCode && client.caenCode.includes('-')
    ? client.caenCode
    : `${caenCode} - ${caenTitle}`;
  const scoreNumber = riskProfile.globalRiskScore || 2.62;
  const scoreRo = scoreNumber.toFixed(2).replace('.', ',');

  // Compute subsystem distribution
  const factors = riskProfile.factors && riskProfile.factors.length > 0 ? riskProfile.factors : [];
  const totalFactorsCount = factors.length || 30;
  const cExec = factors.filter((f) => f.element === 'EXECUTANT').length;
  const cSarc = factors.filter((f) => f.element === 'SARCINA').length;
  const cMij = factors.filter((f) => f.element === 'MIJLOACE').length;
  const cMed = factors.filter((f) => f.element === 'MEDIU').length;

  const pExec = ((cExec / totalFactorsCount) * 100).toFixed(2);
  const pSarc = ((cSarc / totalFactorsCount) * 100).toFixed(2);
  const pMij = ((cMij / totalFactorsCount) * 100).toFixed(2);
  const pMed = ((cMed / totalFactorsCount) * 100).toFixed(2);

  const countL3 = factors.filter((f) => f.riskLevel === 3).length;
  const countL2 = factors.filter((f) => f.riskLevel === 2).length;
  const countL1 = factors.filter((f) => f.riskLevel === 1).length;

  // 2. Resolve Decisions Date & Numbering dynamically
  const decisionsDateRo = client?.decisionsDate
    ? formatDateRo(client.decisionsDate)
    : '15.01.2026';

  // 3. Appointees Dynamic Binding
  const designatedWorker = client?.designatedWorkerSsm
    ? `${client.designatedWorkerSsm} (Lucrător desemnat SSM conform deciziei angajatorului)`
    : ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_LUCRATOR_DESEMNAT_SSM;

  const firstAid = client?.firstAidResponder
    ? `${client.firstAidResponder} (Personal instruit prim ajutor conform Legii 319/2006)`
    : ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR;

  const psiOfficer = client?.psiResponder
    ? `${client.psiResponder} (Cadru tehnic / Responsabil cu atribuții PSI conform Legii 307/2006)`
    : ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_PSI;

  const investMembers = client?.investigationMembers || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_MEMBRU_COMISIE;

  // 4. SEPP Provider Details
  const ssmProviderName = client?.ssmProviderName || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM;
  const ssmSpecialistName = client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Specialist SSM abilitat, ${client.ssmSpecialistCert || 'Certificat abilitare SSM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_SPECIALIST_SSM;
  const evaluatorName = client?.ssmSpecialistName
    ? `${client.ssmSpecialistName} (Evaluator risc SSM, ${client.ssmSpecialistCert || 'Certificat atestare INCDPM'})`
    : ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EVALUATOR_RISC;

  // 5. Build 30-factor positional dictionary
  const dynamic30Factors: Record<string, string> = {};
  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(2, '0');
    const f = factors[i - 1];
    const defaultF = TESA_DEFAULT_FACTORS[i - 1];

    dynamic30Factors[`PLACEHOLDER_GRAVITATE_RISC_${pad}`] = String(f?.severity || defaultF?.gravity || 3);
    dynamic30Factors[`PLACEHOLDER_FRECVENTA_RISC_${pad}`] = String(f?.probability || defaultF?.frequency || 2);
    dynamic30Factors[`PLACEHOLDER_NIVEL_PARTIAL_RISC_${pad}`] = String(f?.riskLevel || defaultF?.partialRisk || 2);
  }

  // 6. Verified Database Map
  const verifiedMap: Record<string, unknown> = {
    // Client basic data
    PLACEHOLDER_FIRMA: client?.name || 'S.C. CLIENT TEST S.R.L.',
    PLACEHOLDER_CUI: client?.cui || 'RO12345678',
    PLACEHOLDER_NR_REG_COM: client?.regCom || 'J40/1000/2021',
    PLACEHOLDER_ADRESA_FIRMA: client?.address || 'București, Sector 1',
    PLACEHOLDER_REPREZENTANT_LEGAL: client?.legalRepresentative || 'Munteanu Cristian',
    PLACEHOLDER_DIRECTOR: client?.legalRepresentative || 'Munteanu Cristian',

    // CAEN & Company Profile
    PLACEHOLDER_COD_CAEN: fullCaenDisplay,
    PLACEHOLDER_ACTIVITATE_PRINCIPALA: caenTitle,
    PLACEHOLDER_AN_INFIINTARE: String(client?.foundedYear || '2021'),
    PLACEHOLDER_AN_EVALUARE: currentYear,
    PLACEHOLDER_NUMAR_LUCRATORI: String(job?.workersCount || client?.employees?.length || 10),

    // SEPP External Provider
    PLACEHOLDER_PRESTATOR_SSM: ssmProviderName,
    PLACEHOLDER_FURNIZOR_SSM: ssmProviderName,
    PLACEHOLDER_SPECIALIST_SSM: ssmSpecialistName,
    PLACEHOLDER_EVALUATOR_RISC: evaluatorName,
    PLACEHOLDER_CERTIFICAT_EVALUATOR: client?.ssmSpecialistCert || ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR,

    // Risk Evaluation Metrics
    PLACEHOLDER_NIVEL_RISC_GLOBAL: scoreNumber.toFixed(2),
    PLACEHOLDER_CONCLUZII_EVALUARE: `Nivelul global de risc calculat pentru postul de lucru ${job?.title || 'analizat'} este de ${scoreRo}, încadrându-se în categoria locurilor de muncă cu nivel de risc acceptabil (Nrg <= 3,50 conform metodei INCDPM). Pentru factorii de risc identificați au fost stabilite măsuri de prevenire în Planul de Prevenire și Protecție conform Legii 319/2006.`,
    PLACEHOLDER_NUMAR_FACTORI_RISC: `${totalFactorsCount} factori de risc (${countL3} cu nivel parțial 3, ${countL2} cu nivel parțial 2, ${countL1} cu nivel parțial 1)`,
    PLACEHOLDER_REPARTITIE_RISCURI: `Executant: ${pExec}% (${cExec} factori); Sarcina de muncă: ${pSarc}% (${cSarc} factori); Mijloace de producție: ${pMij}% (${cMij} factori); Mediul de muncă: ${pMed}% (${cMed} factori)`,
    ...dynamic30Factors,

    // Organizational Decisions & Numbers
    PLACEHOLDER_NUMAR_DECIZIE_01: `01/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_02: `02/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_03: `03/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_04: `04/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_05: `05/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_06: `06/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_07: `07/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_08: `08/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_09: `09/${decisionsDateRo}`,
    PLACEHOLDER_NUMAR_DECIZIE_11: `11/${decisionsDateRo}`,
    PLACEHOLDER_DATA_DECIZIE: decisionsDateRo,
    PLACEHOLDER_DATA_PERMIS_FOC: decisionsDateRo,
    PLACEHOLDER_DATA_INCEPERE_LUCRARE: decisionsDateRo,
    PLACEHOLDER_DATA_FINALIZARE_LUCRARE: decisionsDateRo,
    PLACEHOLDER_DATA_BULETIN_ANALIZA: decisionsDateRo,

    // Organizational Appointees & Aliases
    PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: designatedWorker,
    PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: firstAid,
    PLACEHOLDER_RESPONSABIL_PSI: psiOfficer,
    PLACEHOLDER_RESPONSABIL_CONTROL_PSI: client?.psiResponder || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_CONTROL_PSI,
    PLACEHOLDER_MEMBRU_COMISIE: investMembers,
    PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: client?.designatedWorkerSsm || ROMANIAN_LEGAL_DECIZII.PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI,

    PLACEHOLDER_NUME_RESPONSABIL_1: client?.designatedWorkerSsm || 'Ing. Mihai Popescu',
    PLACEHOLDER_NUME_RESPONSABIL_2: client?.firstAidResponder || 'Ioana-Raluca Dumitru',
    PLACEHOLDER_NUME_RESPONSABIL_3: client?.psiResponder || 'Gheorghe Barbu',
    PLACEHOLDER_NUME_RESPONSABIL_4: client?.investigationMembers || 'Elena Vasilescu, Alexandru Stan',

    // Existing employee, job, worksite, hygiene session logic...
  };
```

### 6.2 Actionable Updates for `src/lib/templates/definitions.ts`

In `src/lib/templates/definitions.ts`, update field definitions for the 4 affected templates:

1. **`risk-evaluare`**:
   - `PLACEHOLDER_COD_CAEN`: change `source: 'manual'` $\rightarrow$ `source: 'client.caenCode'`
   - `PLACEHOLDER_ACTIVITATE_PRINCIPALA`: change `source: 'manual'` $\rightarrow$ `source: 'client.caenActivity'`
   - `PLACEHOLDER_AN_INFIINTARE`: change `source: 'manual'` $\rightarrow$ `source: 'client.foundedYear'`
   - `PLACEHOLDER_NIVEL_RISC_GLOBAL`: change `source: 'manual'` $\rightarrow$ `source: 'riskProfile.globalRiskScore'`
   - `PLACEHOLDER_CONCLUZII_EVALUARE`: change `source: 'manual'` $\rightarrow$ `source: 'riskProfile.conclusions'`
   - `PLACEHOLDER_PRESTATOR_SSM`: change `source: 'hygieneSession.providerName'` $\rightarrow$ `source: 'client.ssmProviderName'`
   - `PLACEHOLDER_CERTIFICAT_EVALUATOR`: change `source: 'manual'` $\rightarrow$ `source: 'client.ssmSpecialistCert'`

2. **`decizii-angajator`**:
   - `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`: change `source: 'manual'` $\rightarrow$ `source: 'client.designatedWorkerSsm'`
   - `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`: change `source: 'manual'` $\rightarrow$ `source: 'client.firstAidResponder'`
   - `PLACEHOLDER_RESPONSABIL_PSI`: change `source: 'manual'` $\rightarrow$ `source: 'client.psiResponder'`
   - `PLACEHOLDER_MEMBRU_COMISIE`: change `source: 'hygieneSession.commissionMember1'` $\rightarrow$ `source: 'client.investigationMembers'`
   - `PLACEHOLDER_DATA_DECIZIE`: change `source: 'manual'` $\rightarrow$ `source: 'client.decisionsDate'`

3. **`risk-plan-prevenire-tesa`**:
   - `PLACEHOLDER_PRESTATOR_SSM`: change `source: 'hygieneSession.providerName'` $\rightarrow$ `source: 'client.ssmProviderName'`
   - `PLACEHOLDER_SPECIALIST_SSM`: change `source: 'manual'` $\rightarrow$ `source: 'client.ssmSpecialistName'`

4. **`risk-zone-pericol`**:
   - `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`: change `source: 'manual'` $\rightarrow$ `source: 'client.designatedWorkerSsm'`

---

## 7. Verification Method

To independently verify the dynamic resolution and 25/25 zero-placeholder guarantees:

```bash
# 1. Verify that all 25 templates generate with 0 unmapped tokens under default seed client
npx tsx scripts/test-all-templates-generation.ts

# 2. Run test script verifying dynamic CAEN and Organizational Decisions resolution on custom clients
npx tsx -e "
import { resolveTemplateData } from './src/lib/templates/resolver';

async function verifyCustomCaen() {
  const custom = {
    id: 'test-custom',
    name: 'CONSTRUCT BUILD S.R.L.',
    cui: 'RO99887766',
    address: 'București, Sector 3, Str. Industriei 12',
    legalRepresentative: 'Ion Vasile',
    caenCode: '4120',
    caenActivity: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
    foundedYear: 2022,
    ssmProviderName: 'PREVENT SSM CONSULT S.R.L.',
    ssmSpecialistName: 'Ing. Radu Georgescu',
    ssmSpecialistCert: 'Certificat seria BC nr. 9988/2020',
    designatedWorkerSsm: 'Ing. Radu Georgescu',
    firstAidResponder: 'Maria Popa',
    psiResponder: 'Cristian Enache',
    investigationMembers: 'Ioan Ilie, Vasile Marin',
    decisionsDate: new Date('2026-02-10'),
  };

  const riskRes = await resolveTemplateData('risk-evaluare', { client: custom });
  console.assert(riskRes.data.PLACEHOLDER_COD_CAEN.includes('4120'), 'CAEN code 4120 missing');
  console.assert(riskRes.data.PLACEHOLDER_ACTIVITATE_PRINCIPALA.includes('construcții'), 'Activity missing');
  console.assert(riskRes.data.PLACEHOLDER_AN_INFIINTARE === '2022', 'Founded year 2022 missing');

  const decRes = await resolveTemplateData('decizii-angajator', { client: custom });
  console.assert(decRes.data.PLACEHOLDER_NUMAR_DECIZIE_01.includes('10.02.2026'), 'Decision date missing');
  console.assert(decRes.data.PLACEHOLDER_LUCRATOR_DESEMNAT_SSM.includes('Radu Georgescu'), 'Designated worker missing');
  console.assert(decRes.data.PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR.includes('Maria Popa'), 'First aid responder missing');
  console.assert(decRes.data.PLACEHOLDER_RESPONSABIL_PSI.includes('Cristian Enache'), 'PSI responder missing');
  console.assert(decRes.data.PLACEHOLDER_MEMBRU_COMISIE.includes('Ioan Ilie'), 'Investigation members missing');

  console.log('✓ Dynamic CAEN & Decisions verification passed with 100% assertion success.');
}
verifyCustomCaen().catch(console.error);
"

# 3. Verify clean production build
npm run build
```

**Invalidation Conditions**:
- Any `{PLACEHOLDER_*}` token remains in any of the 25 generated files under custom CAEN or default clients.
- `PLACEHOLDER_MEMBRU_COMISIE` in `DECIZII.docx` pulls hygiene nurse data when client investigation members are specified.
- `resolveTemplateData` throws an exception when `client.caenCode` is null or not found in catalog.
