# Handoff Report: Milestone 4 - Features 21 & 22 (Risk Assessments CRUD & Persistence, Resolver Binding)

## 1. Observation

### 1.1. Prisma Schema (`prisma/schema.prisma`)
Investigation of `prisma/schema.prisma` lines 348–418 reveals that the risk evaluation domain models already exist:
- **`RiskAssessment`** (lines 348–370):
  ```prisma
  model RiskAssessment {
    id              String   @id @default(uuid())
    clientId        String
    client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
    worksiteId      String?
    worksite        Worksite? @relation(fields: [worksiteId], references: [id], onDelete: SetNull)
    jobId           String?
    job             Job?     @relation(fields: [jobId], references: [id], onDelete: SetNull)
    
    title           String   // Titlu evaluare
    method          String   @default("INCDPM") // Metoda de evaluare
    version         Int      @default(1)
    evaluatorName   String?
    conclusions     String?
    status          String   @default("draft") // draft, field_data_complete, expert_review, employer_review, active, superseded
    
    createdAt       DateTime @default(now())
    updatedAt       DateTime @updatedAt

    riskItems          RiskItem[]
    preventionMeasures PreventionMeasure[]
    hazardZones        HazardZone[]
  }
  ```
- **`RiskItem`** (lines 372–388):
  ```prisma
  model RiskItem {
    id                String         @id @default(uuid())
    assessmentId      String
    assessment        RiskAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
    
    hazard            String         // Factor de risc / Pericol identificat
    riskSituation     String         // Situație de risc
    consequence       String         // Consecință maximă previzibilă
    severityScore     Int?           // Gravitate (1-7)
    probabilityScore  Int?           // Probabilitate (1-6)
    riskLevel         Int?           // Nivel de risc (1-7)
    existingMeasures  String?        // Măsuri existente
    residualRiskLevel Int?           // Nivel de risc rezidual
    sortOrder         Int            @default(0)

    preventionMeasures PreventionMeasure[]
  }
  ```
- **`PreventionMeasure`** (lines 390–406):
  ```prisma
  model PreventionMeasure {
    id              String         @id @default(uuid())
    assessmentId    String
    assessment      RiskAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
    riskItemId      String?
    riskItem        RiskItem?      @relation(fields: [riskItemId], references: [id], onDelete: SetNull)
    
    description     String         // Măsură de prevenire și protecție
    measureType     String         @default("tehnica") // tehnica, organizatorica, igienico-sanitara, altul
    responsiblePerson String?      // Responsabil implementare
    deadline        String?        // Termen de realizare / periodic
    status          String         @default("planificat") // planificat, in_curs, realizat
    resources       String?        // Resurse necesare

    createdAt       DateTime       @default(now())
    updatedAt       DateTime       @updatedAt
  }
  ```
- **`HazardZone`** (lines 408–417):
  ```prisma
  model HazardZone {
    id              String         @id @default(uuid())
    assessmentId    String
    assessment      RiskAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
    zoneName        String         // Denumire zonă cu risc ridicat și specific
    location        String         // Localizare exactă
    hazardDescription String       // Pericol grav și iminent
    safetyMeasures  String         // Măsuri de securitate specifice
    createdAt       DateTime       @default(now())
  }
  ```
- Model relations on parent entities:
  - `Client.riskAssessments`: `RiskAssessment[]` (`prisma/schema.prisma:58`)
  - `Worksite.riskAssessments`: `RiskAssessment[]` (`prisma/schema.prisma:154`)
  - `Job.riskAssessments`: `RiskAssessment[]` (`prisma/schema.prisma:184`)

### 1.2. Existing API Routes
Running `find src/app/api -name "*risk*"` yielded **no results**.
- Currently, NO routes exist under `src/app/api/risk-assessments/` or `src/app/api/clients/[id]/jobs/[jobId]/risks/`.
- In `src/app/risk-assessments/page.tsx`, the page queries Prisma directly via server component:
  ```typescript
  const [assessments, clients] = await Promise.all([
    prisma.riskAssessment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: true,
        preventionMeasures: true,
      },
    }),
    ...
  ```
  However, there is no modal, form, or API client to create, edit, or delete risk assessments from the UI.
- Direct database query via `node -e` confirmed: `Risk assessments count: 0`.

### 1.3. Template Resolver Investigation (`src/lib/templates/resolver.ts` & `definitions.ts`)
1. **Definition of `risk-evaluare`** (`src/lib/templates/definitions.ts:1936-2110`):
   - Document: `EVALUAREA RISCURILOR.docx`
   - Fields: `PLACEHOLDER_FIRMA`, `PLACEHOLDER_CUI`, `PLACEHOLDER_NR_REG_COM`, `PLACEHOLDER_ADRESA_FIRMA`, `PLACEHOLDER_AN_INFIINTARE`, `PLACEHOLDER_COD_CAEN`, `PLACEHOLDER_ACTIVITATE_PRINCIPALA`, `PLACEHOLDER_FUNCTIE`, `PLACEHOLDER_NUMAR_LUCRATORI`, `PLACEHOLDER_PROGRAM_LUCRU`, `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_ADRESA_PRESTATOR`, `PLACEHOLDER_TELEFON_PRESTATOR`, `PLACEHOLDER_EMAIL_PRESTATOR`, `PLACEHOLDER_SITE_PRESTATOR`, `PLACEHOLDER_CERTIFICAT_EVALUATOR`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_DATA_DOCUMENT`, `PLACEHOLDER_AN_EVALUARE`, `PLACEHOLDER_NIVEL_RISC_GLOBAL`, `PLACEHOLDER_NUMAR_FACTORI_RISC`, `PLACEHOLDER_REPARTITIE_RISCURI`, `PLACEHOLDER_CONCLUZII_EVALUARE`.
   - Inspection of `word/document.xml` in `templates_registry/normalized/EVALUAREA RISCURILOR.docx` confirmed all these exact token names are present.

2. **Definition of `risk-plan-prevenire-tesa`** (`src/lib/templates/definitions.ts:2326-2406`):
   - Document: `Plan de Prevenire TESA.docx`
   - Top-level fields: `PLACEHOLDER_FIRMA`, `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_REPREZENTANT_LEGAL`, `PLACEHOLDER_SPECIALIST_SSM`, `PLACEHOLDER_COD_CAEN`, `PLACEHOLDER_ACTIVITATE_PRINCIPALA`, `PLACEHOLDER_FUNCTIE`.
   - Table collection `{#planPrevenire}` ... `{/planPrevenire}`:
     - `{nr}`: item number
     - `{riscEvaluat}`: evaluated risk / hazard
     - `{masuriTehnice}`: technical prevention measures
     - `{masuriOrganizatorice}`: organizational prevention measures
     - `{masuriIgienicoSanitare}`: hygiene prevention measures
     - `{masuriAltaNatura}`: other measures
     - `{actiuni}`: concrete actions
     - `{termen}`: deadline
     - `{responsabil}`: responsible person

3. **Current Resolution Logic in `src/lib/templates/resolver.ts`**:
   - `TemplateResolutionContext` (`src/lib/templates/resolver.ts:16-27`) only has:
     `{ templateCode, clientId, employeeId?, jobId?, worksiteId?, hygieneSessionId?, hygieneParticipantId?, trainingEventId?, customOverrides?, allowOfflineBlank? }`
     Notice: **`assessmentId` is missing**.
   - `resolveTemplatePlaceholders` (`src/lib/templates/resolver.ts:2482-2524`): Does NOT include `riskAssessments` in the Prisma query.
   - Currently, `resolveTemplateData` (lines 1114–1143) loads factors **purely from static CAEN presets**:
     ```typescript
     const caenCode = extractCaenCode(client?.caenCode);
     let riskProfile: CaenRiskProfile;
     try {
       riskProfile = getRiskProfileForCaen(caenCode, job?.title);
     } catch {
       riskProfile = { caenCode: '6201', industryName: '...', globalRiskScore: 2.62, factors: TESA_DEFAULT_FACTORS.map(...) };
     }
     ```
   - In lines 1472–1509:
     ```typescript
     const planPrevenire = factors.map((f, idx) => ({
       nr: idx + 1,
       riscEvaluat: f.riskFactor,
       ...
       termen: 'Permanent',                                 // <--- HARDCODED!
       responsabil: 'CLM / Lucrător desemnat SSM',         // <--- HARDCODED!
     }));
     ```
   - In lines 1321–1331:
     `dynamic30Factors` (`PLACEHOLDER_GRAVITATE_RISC_01..30`, etc.) uses preset factors.
   - In `ROMANIAN_LEGAL_RISK` (lines 271–300):
     `PLACEHOLDER_DENUMIRE_ZONA_01..06` and `PLACEHOLDER_MASURI_ZONA_01..06` are hardcoded static strings.

---

## 2. Logic Chain

1. **Requirement R6 / Features 21 & 22 mandate**:
   - Creating, saving, listing, updating, and deleting risk assessment dossiers in `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone`.
   - Binding `risk-evaluare`, `risk-plan-prevenire-tesa`, and associated risk templates directly to the persisted database dossier, eliminating generic CAEN presets with hardcoded "Permanent" deadlines and "CLM / Lucrător desemnat SSM" responsibles.
2. **Database Models Exist & Are Ready**:
   - `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone` are properly modeled in Prisma schema with foreign keys and cascade rules.
3. **API Routes Must Be Built**:
   - `src/app/api/risk-assessments/route.ts` needs:
     - `GET`: list assessments filtered by `clientId`, `jobId`, `worksiteId`, `status`.
     - `POST`: atomic transaction to create `RiskAssessment` along with nested `RiskItem[]`, `PreventionMeasure[]`, and `HazardZone[]`. Calculates partial risk scores via `calculatePecePartialRisk` if omitted, and verifies gravity $\in [1..7]$ and probability $\in [1..6]$.
   - `src/app/api/risk-assessments/[id]/route.ts` needs:
     - `GET`: retrieve complete assessment with all relations.
     - `PUT`: atomic transaction to update metadata and replace/synchronize items, measures, and hazard zones.
     - `DELETE`: delete assessment (cascading deletes children).
   - `src/app/api/clients/[id]/jobs/[jobId]/risks/route.ts` (convenience endpoint):
     - `GET`: retrieve active assessment for client & job, or return suggested CAEN profile when no DB assessment exists yet.
4. **Resolver Context & Binding Must Be Upgraded**:
   - Add `assessmentId?: string` to `TemplateResolutionContext` and `TemplateResolutionOptions`.
   - In `resolveTemplatePlaceholders`:
     - If `ctx.assessmentId` is supplied, load that `RiskAssessment`.
     - If not, but `ctx.jobId` (or `selectedJob?.id`) is present, query latest `RiskAssessment` matching `{ clientId: ctx.clientId, jobId: ctx.jobId || selectedJob?.id }`.
     - If still not found, check for company-level `RiskAssessment` (`{ clientId: ctx.clientId }`).
     - Pass the loaded `RiskAssessment` to `resolveTemplateData`.
   - In `resolveTemplateData`:
     - When `riskAssessment` exists and has `riskItems` or `preventionMeasures`:
       - Calculate exact global risk score: $N_{rg} = \frac{\sum R_i^2}{\sum R_i}$ (using `calculateGlobalRiskScore`).
       - Compute exact subsystem percentages (`pExec`, `pSarc`, `pMij`, `pMed`) based on `item.riskSituation`.
       - Map real `riskItems` into `dynamic30Factors` (`PLACEHOLDER_GRAVITATE_RISC_01..30`, etc.).
       - Map real `preventionMeasures` into `planPrevenire` rows:
         - Real technical measures in `masuriTehnice`
         - Real organizational measures in `masuriOrganizatorice`
         - Real hygiene measures in `masuriIgienicoSanitare`
         - Real other measures in `masuriAltaNatura`
         - Real deadlines from `m.deadline` (e.g., "Trimestrial", "30.06.2026") in `termen`
         - Real responsibles from `m.responsiblePerson` (e.g., "Ing. Specialist SSM", "Conducător atelier") in `responsabil`
       - Map real `hazardZones` (up to 6) into `PLACEHOLDER_DENUMIRE_ZONA_01..06` and `PLACEHOLDER_MASURI_ZONA_01..06`.
       - Mark all these tokens in `autocompletedKeys` so the UI knows they are database-derived.
     - When NO `RiskAssessment` is in the database:
       - Gracefully fall back to CAEN presets (`getRiskProfileForCaen`) so that unassessed companies or legacy tests still generate documents without crashing.
5. **Document Generation API Integration**:
   - In `src/app/api/documents/generate/route.ts`, extract `assessmentId = body.assessmentId || body.riskAssessmentId;` and pass it to `resolveTemplatePlaceholders`.

---

## 3. Caveats

1. **CAEN Preset Fallback**: When no `RiskAssessment` has been created for a given client/job in the DB, `resolver.ts` must retain the fallback to `getRiskProfileForCaen`. Removing the fallback entirely would break existing tests in `scripts/e2e-tier1-features.ts` and `scripts/adversarial-caen-stress.ts` which generate documents on fresh seed fixtures before an assessment is recorded.
2. **INCDPM Pece Scale Constraints**: Severity must be an integer between 1 and 7, and probability between 1 and 6. Values outside this range must be rejected with 400 Bad Request in API validation.
3. **Draft Status**: In Tier 2 tests, draft status must be preserved and not artificially forced to `active` or `approved_for_print` if mandatory fields are missing.
4. **Special Characters**: Risk descriptions and measures may contain characters like `&`, `<`, `>`. Generator's `escapeXml` (implemented in M1) handles these safely in DOCX output.

---

## 4. Conclusion & Concrete Implementation Plan

### 4.1. File 1: `src/app/api/risk-assessments/route.ts`
Create endpoint supporting `GET` (list with filters) and `POST` (create with nested items, measures, hazardZones in a transaction):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePecePartialRisk, calculateGlobalRiskScore } from '@/lib/risk/caen-risk-presets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const jobId = searchParams.get('jobId');
    const worksiteId = searchParams.get('worksiteId');
    const status = searchParams.get('status');

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (jobId) where.jobId = jobId;
    if (worksiteId) where.worksiteId = worksiteId;
    if (status) where.status = status;

    const assessments = await prisma.riskAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
          include: { preventionMeasures: true },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    });

    return NextResponse.json({ success: true, assessments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea evaluărilor de risc.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      jobId,
      worksiteId,
      title,
      method = 'INCDPM',
      version = 1,
      evaluatorName,
      conclusions,
      status = 'draft',
      items = [],
      measures = [],
      hazardZones = [],
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId este obligatoriu.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    if (jobId) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        return NextResponse.json({ error: 'Postul specificat nu a fost găsit.' }, { status: 404 });
      }
    }

    // Boundary validation: severity 1-7, probability 1-6
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.severityScore !== undefined && it.severityScore !== null) {
        if (it.severityScore < 1 || it.severityScore > 7) {
          return NextResponse.json({ error: `Gravitate invalidă la factorul #${i + 1}. Valori permise: 1-7.` }, { status: 400 });
        }
      }
      if (it.probabilityScore !== undefined && it.probabilityScore !== null) {
        if (it.probabilityScore < 1 || it.probabilityScore > 6) {
          return NextResponse.json({ error: `Probabilitate invalidă la factorul #${i + 1}. Valori permise: 1-6.` }, { status: 400 });
        }
      }
    }

    const assessmentTitle = title?.trim() || `Evaluare Riscuri - ${new Date().getFullYear()}`;

    const assessment = await prisma.$transaction(async (tx) => {
      const createdAssessment = await tx.riskAssessment.create({
        data: {
          clientId,
          jobId: jobId || null,
          worksiteId: worksiteId || null,
          title: assessmentTitle,
          method,
          version: typeof version === 'number' ? version : 1,
          evaluatorName: evaluatorName?.trim() || null,
          conclusions: conclusions?.trim() || null,
          status,
        },
      });

      // Insert risk items and map index to id for measure linking
      const createdItems: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const g = item.severityScore || item.severityLevel || 3;
        const p = item.probabilityScore || item.probabilityLevel || 2;
        const r = item.riskLevel || item.riskScore || calculatePecePartialRisk(g, p);

        const createdItem = await tx.riskItem.create({
          data: {
            assessmentId: createdAssessment.id,
            hazard: item.hazard || item.riskFactor || `Factor de risc #${i + 1}`,
            riskSituation: item.riskSituation || item.riskElement || 'EXECUTANT',
            consequence: item.consequence || item.consequences || 'ITM 3-45 zile',
            severityScore: g,
            probabilityScore: p,
            riskLevel: r,
            existingMeasures: item.existingMeasures || null,
            residualRiskLevel: item.residualRiskLevel || null,
            sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
          },
        });
        createdItems.push({ original: item, record: createdItem });
      }

      // Insert prevention measures
      for (let j = 0; j < measures.length; j++) {
        const m = measures[j];
        let linkedRiskItemId: string | null = null;
        if (m.riskItemId) {
          linkedRiskItemId = m.riskItemId;
        } else if (typeof m.itemIndex === 'number' && createdItems[m.itemIndex]) {
          linkedRiskItemId = createdItems[m.itemIndex].record.id;
        }

        await tx.preventionMeasure.create({
          data: {
            assessmentId: createdAssessment.id,
            riskItemId: linkedRiskItemId,
            description: m.description,
            measureType: (m.measureType || 'tehnica').toLowerCase(),
            responsiblePerson: m.responsiblePerson || null,
            deadline: m.deadline || null,
            status: m.status || 'planificat',
            resources: m.resources || null,
          },
        });
      }

      // Insert hazard zones
      for (const hz of hazardZones) {
        await tx.hazardZone.create({
          data: {
            assessmentId: createdAssessment.id,
            zoneName: hz.zoneName,
            location: hz.location || '',
            hazardDescription: hz.hazardDescription || '',
            safetyMeasures: hz.safetyMeasures || '',
          },
        });
      }

      return tx.riskAssessment.findUnique({
        where: { id: createdAssessment.id },
        include: {
          client: true,
          job: true,
          worksite: true,
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      });
    });

    return NextResponse.json({ success: true, assessment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la crearea dosarului de evaluare.' }, { status: 500 });
  }
}
```

### 4.2. File 2: `src/app/api/risk-assessments/[id]/route.ts`
Create endpoint supporting `GET`, `PUT`, and `DELETE`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePecePartialRisk } from '@/lib/risk/caen-risk-presets';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assessment = await prisma.riskAssessment.findUnique({
      where: { id },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
          include: { preventionMeasures: true },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Evaluarea de risc nu a fost găsită.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, assessment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea evaluării.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.riskAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Evaluarea de risc nu a fost găsită.' }, { status: 404 });
    }

    const {
      title,
      jobId,
      worksiteId,
      method,
      version,
      evaluatorName,
      conclusions,
      status,
      items,
      measures,
      hazardZones,
    } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update assessment top-level fields
      const dataToUpdate: any = {};
      if (title !== undefined) dataToUpdate.title = title.trim();
      if (jobId !== undefined) dataToUpdate.jobId = jobId || null;
      if (worksiteId !== undefined) dataToUpdate.worksiteId = worksiteId || null;
      if (method !== undefined) dataToUpdate.method = method;
      if (version !== undefined) dataToUpdate.version = version;
      if (evaluatorName !== undefined) dataToUpdate.evaluatorName = evaluatorName?.trim() || null;
      if (conclusions !== undefined) dataToUpdate.conclusions = conclusions?.trim() || null;
      if (status !== undefined) dataToUpdate.status = status;

      await tx.riskAssessment.update({
        where: { id },
        data: dataToUpdate,
      });

      // 2. Synchronize riskItems if provided
      if (Array.isArray(items)) {
        await tx.preventionMeasure.deleteMany({ where: { assessmentId: id } });
        await tx.riskItem.deleteMany({ where: { assessmentId: id } });

        const createdItems: any[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const g = item.severityScore || 3;
          const p = item.probabilityScore || 2;
          const r = item.riskLevel || calculatePecePartialRisk(g, p);

          const createdItem = await tx.riskItem.create({
            data: {
              assessmentId: id,
              hazard: item.hazard || item.riskFactor || `Factor #${i + 1}`,
              riskSituation: item.riskSituation || item.riskElement || 'EXECUTANT',
              consequence: item.consequence || item.consequences || 'ITM 3-45 zile',
              severityScore: g,
              probabilityScore: p,
              riskLevel: r,
              existingMeasures: item.existingMeasures || null,
              residualRiskLevel: item.residualRiskLevel || null,
              sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
            },
          });
          createdItems.push({ original: item, record: createdItem });
        }

        // 3. Synchronize preventionMeasures if provided
        if (Array.isArray(measures)) {
          for (let j = 0; j < measures.length; j++) {
            const m = measures[j];
            let linkedRiskItemId: string | null = null;
            if (m.riskItemId) {
              linkedRiskItemId = m.riskItemId;
            } else if (typeof m.itemIndex === 'number' && createdItems[m.itemIndex]) {
              linkedRiskItemId = createdItems[m.itemIndex].record.id;
            }

            await tx.preventionMeasure.create({
              data: {
                assessmentId: id,
                riskItemId: linkedRiskItemId,
                description: m.description,
                measureType: (m.measureType || 'tehnica').toLowerCase(),
                responsiblePerson: m.responsiblePerson || null,
                deadline: m.deadline || null,
                status: m.status || 'planificat',
                resources: m.resources || null,
              },
            });
          }
        }
      }

      // 4. Synchronize hazardZones if provided
      if (Array.isArray(hazardZones)) {
        await tx.hazardZone.deleteMany({ where: { assessmentId: id } });
        for (const hz of hazardZones) {
          await tx.hazardZone.create({
            data: {
              assessmentId: id,
              zoneName: hz.zoneName,
              location: hz.location || '',
              hazardDescription: hz.hazardDescription || '',
              safetyMeasures: hz.safetyMeasures || '',
            },
          });
        }
      }

      return tx.riskAssessment.findUnique({
        where: { id },
        include: {
          client: true,
          job: true,
          worksite: true,
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      });
    });

    return NextResponse.json({ success: true, assessment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la actualizarea evaluării.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.riskAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Evaluarea de risc nu a fost găsită.' }, { status: 404 });
    }

    await prisma.riskAssessment.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Evaluarea de risc a fost ștearsă cu succes.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la ștergerea evaluării.' }, { status: 500 });
  }
}
```

### 4.3. File 3: `src/app/api/clients/[id]/jobs/[jobId]/risks/route.ts`
Convenience route for fetching or saving risk assessments for a specific client job:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiskProfileForCaen } from '@/lib/risk/caen-risk-presets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: clientId, jobId } = await params;

    const [client, job, assessment] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.riskAssessment.findFirst({
        where: { clientId, jobId },
        orderBy: { createdAt: 'desc' },
        include: {
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      }),
    ]);

    if (!client || !job) {
      return NextResponse.json({ error: 'Clientul sau postul nu a fost găsit.' }, { status: 404 });
    }

    let suggestedProfile = null;
    try {
      suggestedProfile = getRiskProfileForCaen(client.caenCode, job.title);
    } catch {
      // CAEN profile fallback if any
    }

    return NextResponse.json({
      success: true,
      assessment,
      suggestedProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea riscurilor postului.' }, { status: 500 });
  }
}
```

### 4.4. File 4: Updates in `src/lib/templates/resolver.ts`
1. Extend `TemplateResolutionContext` and `TemplateResolutionOptions`:
   ```typescript
   export interface TemplateResolutionContext {
     templateCode: string;
     clientId: string;
     employeeId?: string;
     jobId?: string;
     worksiteId?: string;
     assessmentId?: string; // <--- Add this!
     hygieneSessionId?: string;
     hygieneParticipantId?: string;
     trainingEventId?: string;
     customOverrides?: Record<string, unknown>;
     allowOfflineBlank?: boolean;
   }
   ```
2. In `resolveTemplatePlaceholders`:
   Load `riskAssessment`:
   ```typescript
   let riskAssessment = null;
   if (ctx.assessmentId) {
     riskAssessment = await prisma.riskAssessment.findUnique({
       where: { id: ctx.assessmentId },
       include: {
         client: true,
         job: true,
         worksite: true,
         riskItems: {
           orderBy: { sortOrder: 'asc' },
           include: { preventionMeasures: true },
         },
         preventionMeasures: true,
         hazardZones: true,
       },
     });
   } else if (ctx.jobId || selectedJob?.id) {
     riskAssessment = await prisma.riskAssessment.findFirst({
       where: {
         clientId: ctx.clientId,
         jobId: ctx.jobId || selectedJob?.id,
       },
       orderBy: { createdAt: 'desc' },
       include: {
         client: true,
         job: true,
         worksite: true,
         riskItems: {
           orderBy: { sortOrder: 'asc' },
           include: { preventionMeasures: true },
         },
         preventionMeasures: true,
         hazardZones: true,
       },
     });
   } else {
     riskAssessment = await prisma.riskAssessment.findFirst({
       where: { clientId: ctx.clientId },
       orderBy: { createdAt: 'desc' },
       include: {
         client: true,
         job: true,
         worksite: true,
         riskItems: {
           orderBy: { sortOrder: 'asc' },
           include: { preventionMeasures: true },
         },
         preventionMeasures: true,
         hazardZones: true,
       },
     });
   }
   ```
   Pass `riskAssessment` to `resolveTemplateData`:
   `options.riskAssessment = riskAssessment;`

3. In `resolveTemplateData`:
   Check if `riskAssessment` exists and has `riskItems`:
   - Compute `scoreNumber`:
     If `riskAssessment?.riskItems?.length > 0`:
     ```typescript
     const dbItems = riskAssessment.riskItems;
     const sumR = dbItems.reduce((acc: number, item: any) => acc + (item.riskLevel || 3), 0);
     const sumR2 = dbItems.reduce((acc: number, item: any) => acc + (item.riskLevel || 3) * (item.riskLevel || 3), 0);
     const calculatedScore = sumR > 0 ? Number((sumR2 / sumR).toFixed(2)) : 2.62;
     ```
   - Compute subsystem percentages:
     Categorize `dbItems` into EXECUTANT, SARCINA, MIJLOACE, MEDIU.
   - Positional `dynamic30Factors`:
     Fill `PLACEHOLDER_GRAVITATE_RISC_01..30`, `PLACEHOLDER_FRECVENTA_RISC_01..30`, `PLACEHOLDER_NIVEL_PARTIAL_RISC_01..30` from `dbItems`.
   - Prevention and Protection Plan (`planPrevenire` / `masuriPrevenire`):
     ```typescript
     const planPrevenire = dbItems.map((item: any, idx: number) => {
       const itemMeasures = (riskAssessment.preventionMeasures || []).filter(
         (m: any) => m.riskItemId === item.id
       );
       const tech = itemMeasures.filter((m: any) => m.measureType === 'tehnica');
       const org = itemMeasures.filter((m: any) => m.measureType === 'organizatorica');
       const hyg = itemMeasures.filter((m: any) => m.measureType === 'igienico-sanitara');
       const alt = itemMeasures.filter((m: any) => !['tehnica', 'organizatorica', 'igienico-sanitara'].includes(m.measureType));

       const deadlines = itemMeasures.map((m: any) => m.deadline).filter(Boolean);
       const responsibles = itemMeasures.map((m: any) => m.responsiblePerson).filter(Boolean);

       return {
         nr: idx + 1,
         riscEvaluat: item.hazard,
         factorRisc: item.hazard,
         manifestare: item.riskSituation || item.hazard,
         consecinte: item.consequence || 'ITM 3-45 zile',
         masuriTehnice: tech.length > 0 ? tech.map((t: any) => `- ${t.description}`).join('\n') : '-',
         masuriOrganizatorice: org.length > 0 ? org.map((o: any) => `- ${o.description}`).join('\n') : '-',
         masuriIgienicoSanitare: hyg.length > 0 ? hyg.map((h: any) => `- ${h.description}`).join('\n') : '-',
         masuriAltaNatura: alt.length > 0 ? alt.map((a: any) => `- ${a.description}`).join('\n') : '-',
         actiuni: itemMeasures.map((m: any) => m.resources ? `- ${m.description} (${m.resources})` : `- ${m.description}`).join('\n') || '- instruirea lucrătorilor\n- verificarea respectării normelor SSM',
         termen: deadlines.length > 0 ? [...new Set(deadlines)].join(', ') : 'Permanent',
         responsabil: responsibles.length > 0 ? [...new Set(responsibles)].join(', ') : (designatedWorker || client?.legalRepresentative || 'Conducător loc de muncă'),
       };
     });
     ```
   - Hazard zones:
     Map `riskAssessment.hazardZones` (up to 6) to `PLACEHOLDER_DENUMIRE_ZONA_01..06` and `PLACEHOLDER_MASURI_ZONA_01..06`.
   - If `riskAssessment.evaluatorName`:
     `PLACEHOLDER_EVALUATOR_RISC: riskAssessment.evaluatorName`
   - Provenance tracking:
     `markAutocompleted('PLACEHOLDER_NIVEL_RISC_GLOBAL', scoreNumber.toFixed(2));`
     `markAutocompleted('PLACEHOLDER_CONCLUZII_EVALUARE', riskAssessment.conclusions);`
     `markAutocompleted('PLACEHOLDER_EVALUATOR_RISC', riskAssessment.evaluatorName);`

4. In `src/app/api/documents/generate/route.ts`:
   Extract `assessmentId = body.assessmentId || body.riskAssessmentId;` and include in `resolveTemplatePlaceholders` call.

---

## 5. Verification Method

To independently verify the implementation once applied by the Worker:
1. **Schema Integrity**:
   Run `npx prisma validate` to confirm schema validity.
2. **TypeScript Compilation & Build**:
   Run `npm run build` to ensure all API routes and resolver updates compile with zero type errors.
3. **Tier 1 Acceptance Tests**:
   Run `npx tsx scripts/e2e-tier1-features.ts`. All 155 tests (specifically F21 and F22) must pass.
4. **Tier 2 Boundary Tests**:
   Run `npx tsx scripts/e2e-tier2-boundaries.ts`. All boundary cases for F21 and F22 must pass.
5. **Full Suite**:
   Run `npm test` (`npx tsx scripts/verify-all.ts`).
6. **API Functional Verification Script**:
   Execute a test script to:
   - `POST /api/risk-assessments` with items and measures containing real custom deadlines (e.g., "Trimestrial", "30.09.2026") and real responsibles (e.g., "Ing. Popescu").
   - Call `resolveTemplatePlaceholders` for `risk-evaluare` and `risk-plan-prevenire-tesa` for that job.
   - Assert that `planPrevenire[0].termen` is "Trimestrial" (NOT the hardcoded "Permanent") and `planPrevenire[0].responsabil` is "Ing. Popescu" (NOT the hardcoded "CLM / Lucrător desemnat SSM").
   - Call `DELETE /api/risk-assessments/[id]` and verify cascading cleanup.
