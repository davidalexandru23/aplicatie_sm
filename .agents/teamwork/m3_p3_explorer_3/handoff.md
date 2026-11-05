# Handoff Report — Explorer 3 (Features F14 & F15)

**Milestone**: Milestone 3 (Pillar 3: Resolver Reconfiguration & Real Data Plumbing)  
**Agent**: `m3_p3_explorer_3`  
**Target Roles**: Parent Orchestrator (`d4389872-2ec2-44c4-b4b6-52d9b0f4a82d`), Milestone 3 Workers  
**Date**: 2026-11-05T01:45:00Z  

---

## 1. Observation

### 1.1 Data Schema: Job Model in `prisma/schema.prisma`
In `prisma/schema.prisma` (lines 159–178):
```prisma
model Job {
  id              String   @id @default(uuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  title           String   // Funcție / post
  corCode         String?  // Cod COR opțional
  mainActivities  String?  // Activități principale
  equipmentUsed   String?  // Echipamente/utilaje folosite
  workConditions  String?  // Condiții de lucru relevante
  workersCount    Int?     // Număr aproximativ lucrători
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  employees          Employee[]
  employmentHistory  EmploymentHistory[]
  riskAssessments    RiskAssessment[]

  @@unique([clientId, title])
}
```
The database stores operational details per job: `title`, `corCode`, `mainActivities`, `equipmentUsed`, `workConditions`, and `workersCount`. `prisma/seed.ts` already seeds concrete values for these (e.g. lines 245–248: `corCode: '251201'`, `mainActivities: 'Dezvoltare aplicații, analiză date, lucru la videoterminale'`, `equipmentUsed: 'Laptop, monitoare LCD, tastatură, mouse ergonomic'`, `workConditions: 'Activitate de birou, climatizare, iluminat natural și artificial adecvat'`).

### 1.2 Data Resolution in `src/lib/templates/resolver.ts`
- **Context Handling (`resolveTemplatePlaceholders`, lines 1774–1845)**:
  ```typescript
  const client = await prisma.client.findUnique({
    where: { id: ctx.clientId },
    include: {
      jobs: true,
      worksites: true,
      employees: { ... },
      provider: true,
      specialist: true,
    },
  });
  ...
  const selectedJob = client.jobs.find((j) => j.id === ctx.jobId) || employee?.currentJob || (client.jobs && client.jobs[0]) || null;
  ...
  const resolutionResult = await resolveTemplateData(ctx.templateCode, {
    client,
    employee,
    job: selectedJob,
    worksite: selectedWorksite,
    hygieneSession,
    hygieneParticipant: participant,
    customOverrides: ctx.customOverrides,
  });
  ```
  `resolveTemplatePlaceholders` accurately extracts `selectedJob` based on `ctx.jobId`, falling back to `employee?.currentJob` or first `client.jobs[0]`.

- **Current Bindings in `resolveTemplateData` (lines 1470–1472)**:
  ```typescript
  PLACEHOLDER_FUNCTIE: participant?.jobTitle || participant?.employee?.currentJob?.title || job?.title || 'Personal TESA / Inginer Sisteme Software',
  PLACEHOLDER_COD_COR: job?.corCode || '251201',
  PLACEHOLDER_NUMAR_CIM: (employee as any)?.cimNumber || (context.customOverrides?.PLACEHOLDER_NUMAR_CIM as string) || 'CIM-2026-0042',
  ```
  `job.mainActivities`, `job.equipmentUsed`, and `job.workConditions` are **completely absent** from `verifiedMap`!

- **Current Static Legal Fallbacks (lines 367–369)**:
  ```typescript
  PLACEHOLDER_DESCRIERE_ACTIVITATE: 'Activitate intelectuală de birou, dezvoltare de aplicații software, analiză de cod, documentare tehnică și comunicare online',
  PLACEHOLDER_ECHIPAMENTE_POST: 'Laptop / unitate PC, monitoare LED, tastatură, mouse, imprimantă de rețea, echipamente de comunicație',
  PLACEHOLDER_CONDITII_POST: 'Activitate de interior în încăpere climatizată, iluminat combinat (natural și artificial) conform normelor, mobilier ergonomic',
  ```
  Because `verifiedMap` never reads `job.mainActivities`, `job.equipmentUsed`, or `job.workConditions`, templates always fall back to the static string in `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`. Furthermore, token `PLACEHOLDER_ACTIVITATI_POST` does not exist at all in `resolver.ts` or `definitions.ts`.

### 1.3 Physical Document Tokens in `templates_registry/normalized/`
Surgical scanning of OpenXML packages via Python revealed:
- `med-fisa-identificare-riscuri.docx`: Contains `{PLACEHOLDER_COD_COR}`, `{PLACEHOLDER_DESCRIERE_ACTIVITATE}`, `{PLACEHOLDER_ECHIPAMENTE_POST}`, `{PLACEHOLDER_CONDITII_POST}`, `{PLACEHOLDER_FUNCTIE}`.
- `Anexa fisa postului SSM.docx`: Contains `{PLACEHOLDER_COD_COR}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_CUI}`, `{PLACEHOLDER_NUMAR_CIM}`, `{PLACEHOLDER_DATA_CIM}`, `{PLACEHOLDER_DATA_SEMNARII}`, `{PLACEHOLDER_NUME_COMPLET}`, `{PLACEHOLDER_REPREZENTANT_LEGAL}`.
- `Detaliu Tematica loc de munca.docx`: Contains `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_REPREZENTANT_LEGAL}`.
- `Tematica loc de munca.docx`: Contains `{PLACEHOLDER_DATA_APLICARE}`, `{PLACEHOLDER_EMAIL_PRESTATOR}`, `{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_FUNCTIE}`, `{PLACEHOLDER_TELEFON_PRESTATOR}`.
- `Plan de Prevenire TESA.docx`: Contains only header/footer tokens:
  `{PLACEHOLDER_REPREZENTANT_LEGAL}`, `{PLACEHOLDER_PRESTATOR_SSM}`, `{PLACEHOLDER_SPECIALIST_SSM}`, `{PLACEHOLDER_FIRMA}`.
  Its table body consists of 19 legacy paragraphs of hardcoded office/TESA risks, with no dynamic connection to CAEN codes.

### 1.4 CAEN Risk Profiles in `src/lib/risk/caen-risk-presets.ts`
`caen-risk-presets.ts` exports `getRiskProfileForCaen(caenCode, jobTitle)` and 7 industrial/commercial profiles:
- `6201`: IT / Software (16 factors, 36 measures)
- `5610`: Restaurante / Alimentație (17 factors, 42 measures)
- `4120`: Construcții (17 factors, 41 measures)
- `4711`: Comerț cu amănuntul (14 factors, 27 measures)
- `4941`: Transporturi rutiere mărfuri (15 factors, 32 measures)
- `7022`: Management / Birou TESA (13 factors, 23 measures)
- `8621`: Asistență medicală generală (14 factors, 31 measures)

Each item in `factors` has:
```typescript
export interface RiskPresetItem {
  element: RiskSubsystem; // 'EXECUTANT' | 'SARCINA' | 'MIJLOACE' | 'MEDIU'
  riskFactor: string;
  manifestation: string;
  consequences: string;
  severity: number;    // 1-7 (G)
  probability: number; // 1-6 (P)
  riskLevel: number;   // 1-7 (R)
  preventionMeasures: string[];
}
```
Currently, `resolver.ts` only extracts `globalRiskScore` and 30 numerical severity/probability/risk levels for `EVALUAREA RISCURILOR.docx` (`dynamic30Factors`). The prevention measures in `factors.preventionMeasures` are **never surfaced** into `Plan de Prevenire TESA.docx`.

---

## 2. Logic Chain

1. **Premise 1 (F14 Requirement)**: The user and project specifications require `job.mainActivities`, `job.equipmentUsed`, `job.workConditions`, and `job.corCode` to be bound to `{PLACEHOLDER_ACTIVITATI_POST}` (alias `{PLACEHOLDER_DESCRIERE_ACTIVITATE}`), `{PLACEHOLDER_ECHIPAMENTE_POST}`, `{PLACEHOLDER_CONDITII_POST}`, and `{PLACEHOLDER_COD_COR}`.
2. **Premise 2 (Database Availability)**: The `Job` model in Prisma already stores `mainActivities`, `equipmentUsed`, `workConditions`, and `corCode`. `resolveTemplatePlaceholders` already locates `selectedJob` via `ctx.jobId` or employee.
3. **Inference 1**: The defect in F14 is strictly in `resolveTemplateData` in `resolver.ts`, where `verifiedMap` fails to map `job.mainActivities`, `job.equipmentUsed`, and `job.workConditions`, and in `definitions.ts`, where `{PLACEHOLDER_ACTIVITATI_POST}` is not yet declared.
4. **Premise 3 (F15 Requirement)**: The Prevention and Protection Plan (`risk-plan-prevenire-tesa` / `Plan de Prevenire TESA.docx`) must dynamically populate prevention measures correlating with `client.caenCode` and the job's operational context.
5. **Premise 4 (INCDPM Presets Completeness)**: `src/lib/risk/caen-risk-presets.ts` already contains verified INCDPM risk factors and concrete prevention measures for each CAEN code.
6. **Premise 5 (Docxtemplater Table Row Looping Precedent)**: Docxtemplater in `generator.ts` (`paragraphLoop: true`) already supports table looping via `{#arrayName}`...`{/arrayName}`, as verified in `ssm-fisa-instruire-individuala.docx` (`{#instruiriPeriodiceSSM}{nr}...{semnaturaVerificator}{/instruiriPeriodiceSSM}`).
7. **Inference 2**: For F15, `resolver.ts` must map `riskProfile.factors` into a structured array `planPrevenire` (or `masuriPrevenire`) categorized into statutory columns (Măsuri tehnice, Măsuri organizatorice, Măsuri igienico-sanitare, Măsuri de altă natură, Acțiuni, Termen, Responsabil).
8. **Inference 3**: For `Plan de Prevenire TESA.docx` to actually display these dynamic measures, its OpenXML structure must feature a standard table (`w:tbl`) with a row looped via `{#planPrevenire}...{/planPrevenire}`, while preserving all existing header/footer tokens (`{PLACEHOLDER_FIRMA}`, `{PLACEHOLDER_REPREZENTANT_LEGAL}`, `{PLACEHOLDER_PRESTATOR_SSM}`, `{PLACEHOLDER_SPECIALIST_SSM}`) so that existing adversarial tests (`scripts/test-adversarial-provider-tokens.ts`) pass without regression.

---

## 3. Concrete Code Changes Formulated for Worker

### 3.1 Changes in `src/lib/templates/resolver.ts`

#### Step 1: Add fallback for `PLACEHOLDER_ACTIVITATI_POST`
In `ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH`:
```typescript
  // Line 367
  PLACEHOLDER_ACTIVITATI_POST: 'Activitate intelectuală de birou, dezvoltare de aplicații software, analiză de cod, documentare tehnică și comunicare online',
  PLACEHOLDER_DESCRIERE_ACTIVITATE: 'Activitate intelectuală de birou, dezvoltare de aplicații software, analiză de cod, documentare tehnică și comunicare online',
  PLACEHOLDER_ECHIPAMENTE_POST: 'Laptop / unitate PC, monitoare LED, tastatură, mouse, imprimantă de rețea, echipamente de comunicație',
  PLACEHOLDER_CONDITII_POST: 'Activitate de interior în încăpere climatizată, iluminat combinat (natural și artificial) conform normelor, mobilier ergonomic',
```

#### Step 2: Ensure `job` fallback in `resolveTemplateData`
Around line 1053:
```typescript
  const client = context.client;
  const employee = context.employee || null;
  const job = context.job || (context.jobId && client?.jobs?.find((j: any) => j.id === context.jobId)) || employee?.currentJob || (client?.jobs && client.jobs[0]) || null;
```

#### Step 3: Populate Job context tokens in `verifiedMap`
Around line 1470:
```typescript
    // 4. Post și Punct de lucru (F14: Job Operational Profile Plumbing)
    PLACEHOLDER_FUNCTIE: participant?.jobTitle || participant?.employee?.currentJob?.title || job?.title || 'Personal TESA / Inginer Sisteme Software',
    PLACEHOLDER_PROFESIE_OCUPATIE: job?.title || 'Inginer sisteme software',
    PLACEHOLDER_COD_COR: job?.corCode || '251201',
    PLACEHOLDER_ACTIVITATI_POST: job?.mainActivities || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_DESCRIERE_ACTIVITATE,
    PLACEHOLDER_DESCRIERE_ACTIVITATE: job?.mainActivities || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_DESCRIERE_ACTIVITATE,
    PLACEHOLDER_ECHIPAMENTE_POST: job?.equipmentUsed || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_ECHIPAMENTE_POST,
    PLACEHOLDER_CONDITII_POST: job?.workConditions || ROMANIAN_LEGAL_OCCUPATIONAL_HEALTH.PLACEHOLDER_CONDITII_POST,
```

#### Step 4: Construct dynamic `planPrevenire` / `masuriPrevenire` in `resolveTemplateData`
Around line 1200 (before `verifiedMap`):
```typescript
  // Helper to categorize INCDPM prevention measures into statutory categories (HG 1425/2006 art. 15)
  const TECHNICAL_REGEX = /montar|ancorar|echipam|cablu|canalin|tablou|priz|pram|diferential|scar|antiderap|ventila|ilumin|protecti.*mecanic|intrerup|impamant|dispozitiv|hota|cutit|aragaz|schel|balustrad/i;
  const HYGIENE_REGEX = /medic|oftalmo|ergonom|igien|trus|prim.*ajutor|microclimat|aeris|temperatur|curaten|dezinfect|matern|antidot/i;
  const ORG_REGEX = /instrui|interzic|verific|notific|respecta|pauz|planific|rotati|procedur|autorizat|depozit|permis/i;

  const planPrevenire = factors.map((f, idx) => {
    const techMeasures: string[] = [];
    const orgMeasures: string[] = [];
    const hygMeasures: string[] = [];

    const rawMeasures = f.preventionMeasures && f.preventionMeasures.length > 0
      ? f.preventionMeasures
      : ['Instruirea lucrătorilor privind cerințele SSM', 'Verificarea respectării normelor de securitate'];

    for (const m of rawMeasures) {
      if (TECHNICAL_REGEX.test(m)) {
        techMeasures.push(m);
      } else if (HYGIENE_REGEX.test(m)) {
        hygMeasures.push(m);
      } else if (ORG_REGEX.test(m)) {
        orgMeasures.push(m);
      } else {
        if (f.element === 'MIJLOACE') techMeasures.push(m);
        else if (f.element === 'MEDIU') hygMeasures.push(m);
        else orgMeasures.push(m);
      }
    }

    return {
      nr: idx + 1,
      riscEvaluat: f.riskFactor,
      factorRisc: f.riskFactor,
      manifestare: f.manifestation || f.riskFactor,
      consecinte: f.consequences || 'ITM 3-45 zile',
      masuriTehnice: techMeasures.length > 0 ? techMeasures.map(t => `- ${t}`).join('\n') : '-',
      masuriOrganizatorice: orgMeasures.length > 0 ? orgMeasures.map(o => `- ${o}`).join('\n') : '-',
      masuriIgienicoSanitare: hygMeasures.length > 0 ? hygMeasures.map(h => `- ${h}`).join('\n') : '-',
      masuriAltaNatura: '-',
      actiuni: '- instruirea lucrătorilor privind cerințele de securitate în muncă\n- verificarea modului de cunoaștere și respectare a cerințelor de SSM',
      termen: 'Permanent',
      responsabil: 'CLM / Lucrător desemnat SSM',
    };
  });
```

And in `verifiedMap`:
```typescript
    // F15: Dynamic Prevention Plan collections & top-level tokens
    planPrevenire,
    masuriPrevenire: planPrevenire,
```

### 3.2 Changes in `src/lib/templates/definitions.ts`

1. Under `hr-anexa-fisa-post` (line 261):
   Add optional fields:
   ```typescript
   { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Activități principale post', source: 'job.mainActivities', required: false, type: 'string' },
   { key: 'PLACEHOLDER_ECHIPAMENTE_POST', label: 'Echipamente utilizate la post', source: 'job.equipmentUsed', required: false, type: 'string' },
   { key: 'PLACEHOLDER_CONDITII_POST', label: 'Condiții de muncă la post', source: 'job.workConditions', required: false, type: 'string' },
   ```

2. Under `training-detaliu-loc-munca` (line 1851) & `training-tematica-loc-munca` (line 2448):
   Add optional fields:
   ```typescript
   { key: 'PLACEHOLDER_COD_COR', label: 'Cod COR ocupație', source: 'job.corCode', required: false, type: 'string' },
   { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Activități specifice post', source: 'job.mainActivities', required: false, type: 'string' },
   { key: 'PLACEHOLDER_ECHIPAMENTE_POST', label: 'Echipamente folosite la post', source: 'job.equipmentUsed', required: false, type: 'string' },
   { key: 'PLACEHOLDER_CONDITII_POST', label: 'Condiții de lucru la post', source: 'job.workConditions', required: false, type: 'string' },
   ```

3. Under `med-fisa-identificare-riscuri` (line 3602):
   Ensure `PLACEHOLDER_ACTIVITATI_POST` is present alongside `PLACEHOLDER_DESCRIERE_ACTIVITATE`:
   ```typescript
   { key: 'PLACEHOLDER_ACTIVITATI_POST', label: 'Descriere operațiuni / activități', source: 'job.mainActivities', required: false, type: 'string' },
   ```

4. Under `risk-plan-prevenire-tesa` (line 2277):
   Add fields:
   ```typescript
   { key: 'PLACEHOLDER_COD_CAEN', label: 'Cod CAEN profil de risc', source: 'client.caenCode', required: false, type: 'string' },
   { key: 'PLACEHOLDER_ACTIVITATE_PRINCIPALA', label: 'Activitate principală CAEN', source: 'client.caenActivity', required: false, type: 'string' },
   { key: 'PLACEHOLDER_FUNCTIE', label: 'Post / Funcție documentată', source: 'job.title', required: false, type: 'string' },
   ```
   Add collections:
   ```typescript
   collections: [
     {
       key: 'planPrevenire',
       label: 'Plan de Prevenire și Protecție conform profilului de risc CAEN',
       source: 'caenRiskProfile.factors',
       fields: [
         { key: 'nr', label: 'Nr. crt.', source: 'index', required: false, type: 'number' },
         { key: 'riscEvaluat', label: 'Risc evaluat / Factor de risc', source: 'factor.riskFactor', required: true, type: 'string' },
         { key: 'masuriTehnice', label: 'Măsuri tehnice', source: 'factor.measures.technical', required: false, type: 'string' },
         { key: 'masuriOrganizatorice', label: 'Măsuri organizatorice', source: 'factor.measures.organizational', required: false, type: 'string' },
         { key: 'masuriIgienicoSanitare', label: 'Măsuri igienico-sanitare', source: 'factor.measures.hygiene', required: false, type: 'string' },
         { key: 'masuriAltaNatura', label: 'Măsuri de altă natură', source: 'manual', required: false, type: 'string' },
         { key: 'actiuni', label: 'Acțiuni în scopul realizării măsurii', source: 'factor.actions', required: false, type: 'string' },
         { key: 'termen', label: 'Termen de realizare', source: 'manual', required: false, type: 'string' },
         { key: 'responsabil', label: 'Persoana responsabilă', source: 'manual', required: false, type: 'string' },
       ],
     },
   ],
   ```

### 3.3 Patching `Plan de Prevenire TESA.docx` Template
A surgical script (e.g. `scripts/patch_prevention_plan_template.py`) should convert the document's body into a dynamic Word table:
- Table header row with 9 columns.
- Table body row with docxtemplater tags:
  `{#planPrevenire}{nr}` in Col 1, `{riscEvaluat}` in Col 2, `{masuriTehnice}` in Col 3, `{masuriOrganizatorice}` in Col 4, `{masuriIgienicoSanitare}` in Col 5, `{masuriAltaNatura}` in Col 6, `{actiuni}` in Col 7, `{termen}` in Col 8, `{responsabil}{/planPrevenire}` in Col 9.
- Retain all four existing tokens in the header, footer, and signature sections (`{PLACEHOLDER_REPREZENTANT_LEGAL}`, `{PLACEHOLDER_PRESTATOR_SSM}`, `{PLACEHOLDER_SPECIALIST_SSM}`, `{PLACEHOLDER_FIRMA}`) so that zero tokens leak and adversarial provider tests pass.

---

## 4. Caveats

- **CAEN Granularity**: The system currently maintains 7 granular INCDPM risk profiles (6201, 5610, 4120, 4711, 4941, 7022, 8621). Clients with other CAEN codes default to CAEN 7022 (office/consultancy). If a client operates in manufacturing or agriculture, it will receive the 7022 fallback unless additional profiles are authored.
- **Administrative Job Filter**: When a company operates under an industrial code (e.g. CAEN 4120), if the selected job is administrative (e.g. `Contabil`, `Secretar`), `isAdministrativeJobTitle` automatically routes to the office profile. Operational jobs (e.g. `Zidar`, `Fierar`) remain on the industrial profile. This is statutory standard practice under Romanian SSM.

---

## 5. Conclusion

1. **F14**: The data model and context retrieval already supply `Job` operational fields (`corCode`, `mainActivities`, `equipmentUsed`, `workConditions`). The worker only needs to bind them into `verifiedMap` in `resolver.ts` with Romanian statutory defaults, and declare the fields in `definitions.ts`.
2. **F15**: The INCDPM presets in `caen-risk-presets.ts` already supply high-fidelity prevention measures for each CAEN risk profile. The worker needs to categorize these measures in `resolver.ts` into a `planPrevenire` collection and patch `Plan de Prevenire TESA.docx` to loop dynamically using docxtemplater's `{#planPrevenire}...{/planPrevenire}` table syntax.

---

## 6. Verification Method

To independently verify the implementation:

1. **Unit and Adversarial Test**:
   ```bash
   npx tsx scripts/test-adversarial-provider-tokens.ts
   npx tsx scripts/adversarial-caen-stress.ts
   ```
2. **Comprehensive 31-Template Generation**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
3. **Verify Job Tokens Resolution**:
   Execute a test resolving `hr-anexa-fisa-post` and `med-fisa-identificare-riscuri` with a specific `jobId` having custom `mainActivities`:
   - Verify `res.data.PLACEHOLDER_ACTIVITATI_POST === job.mainActivities`
   - Verify `res.data.PLACEHOLDER_ECHIPAMENTE_POST === job.equipmentUsed`
   - Verify `res.data.PLACEHOLDER_CONDITII_POST === job.workConditions`
   - Verify `res.data.PLACEHOLDER_COD_COR === job.corCode`
4. **Verify Dynamic Prevention Plan for CAEN 5610 vs CAEN 6201**:
   Resolve `risk-plan-prevenire-tesa` for CAEN 5610 (Restaurant) vs CAEN 6201 (IT):
   - For 5610: Verify `res.data.planPrevenire` contains kitchen/burn/cut measures.
   - For 6201: Verify `res.data.planPrevenire` contains monitor/posture/ergonomics measures.
   - Render DOCX buffer and verify zero raw `PLACEHOLDER_*` unmapped tokens.
5. **Project Build Check**:
   ```bash
   npm run build
   ```
