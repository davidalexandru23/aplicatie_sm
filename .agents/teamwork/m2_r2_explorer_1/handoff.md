# Handoff Report: Client Intake & CAEN Profiling UI & API Specification

**Author**: `m2_r2_explorer_1` (Teamwork Explorer)  
**Parent Agent**: `e02d72ae-5121-4ddd-a7ab-3b2da6aaf0bb`  
**Milestone**: Milestone 2 — SSM Operational Workflows UI & Training Scheduler  
**Date**: 2026-11-02  
**Target Files Analyzed**:
- `prisma/schema.prisma`
- `src/lib/caen-catalog.ts`
- `src/lib/templates/resolver.ts`
- `src/app/clients/page.tsx`
- `src/app/clients/[id]/page.tsx`
- `src/app/api/clients/route.ts`
- `src/app/api/clients/[id]/route.ts` (new)
- `scripts/verify-all.ts`

---

## 1. Observation

### 1.1 Existing Database Model (`prisma/schema.prisma`)
In `prisma/schema.prisma` lines 14–59, the `Client` model already contains the required CAEN and SEPP provider fields introduced in Milestone 1:
```prisma
model Client {
  id                  String   @id @default(uuid())
  name                String   // Denumire firmă
  cui                 String   @unique // CUI / CIF
  regCom              String?  // Nr. Registrul Comerțului
  address             String   // Sediu social complet
  legalRepresentative String?  // Reprezentant legal
  contactPerson       String?  // Persoană de contact
  contactEmail        String?  // Email contact
  contactPhone        String?  // Telefon contact
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // 1. Profil Activitate Economică & Date Companie
  caenCode            String?   // Cod CAEN Rev. 2 (ex: "6201", "5610")
  caenActivity        String?   // Denumire activitate conform CAEN Rev. 2
  foundedYear         Int?      // An înființare firmă (ex: 2021)

  // 2. Serviciu Extern de Prevenire și Protecție (SEPP) & Evaluator Desemnat
  ssmProviderName     String?   // Denumire SEPP abilitat ITM (ex: "EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.")
  ssmSpecialistName   String?   // Nume specialist SSM / evaluator (ex: "Ing. Mihai Popescu")
  ssmSpecialistCert   String?   // Număr / serie certificat atestare SSM (ex: "Certificat seria EV nr. 10452/2018")

  // 3. Numiri Decizii Organizatorice Angajator (Deciziile 01-09)
  designatedWorkerSsm String?   // Lucrător desemnat SSM (Decizia 01)
  firstAidResponder   String?   // Responsabil acordare prim ajutor (Decizia 02)
  psiResponder        String?   // Cadru tehnic / responsabil PSI/SU (Decizia 03)
  investigationMembers String?  // Membri comisie cercetare evenimente / accidente (Decizia 06)
  decisionsDate       DateTime? // Data emiterii pachetului de decizii organizatorice
...
```

### 1.2 Existing Client API (`src/app/api/clients/route.ts`)
Inspection of `src/app/api/clients/route.ts` lines 4–58 revealed:
1. **`GET` query (lines 4–25)**: Only selects `id, name, cui, address, contactPerson, isActive, _count`. It omits `caenCode`, `caenActivity`, `foundedYear`, `ssmProviderName`, `ssmSpecialistName`, `regCom`, and `legalRepresentative`.
2. **`POST` handler (lines 27–59)**:
```typescript
const { name, cui, regCom, address, legalRepresentative, contactPerson, contactEmail, contactPhone } = body;
...
const client = await prisma.client.create({
  data: {
    name,
    cui: cui.trim(),
    regCom,
    address,
    legalRepresentative,
    contactPerson,
    contactEmail,
    contactPhone,
  },
});
```
It **completely ignores** `caenCode`, `caenActivity`, `foundedYear`, `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`, and organizational decision fields. Furthermore, it does not check for duplicate CUI gracefully before calling `prisma.client.create`, leading to unhandled Prisma unique constraint crashes (`P2002`).

### 1.3 Missing Client By ID API (`src/app/api/clients/[id]/route.ts`)
Directory search using `find_by_name` on `src/app/api/clients/[id]` returned only:
- `src/app/api/clients/[id]/employees/route.ts`
- `src/app/api/clients/[id]/export/route.ts`
There is **no** `src/app/api/clients/[id]/route.ts`. Therefore, no `PATCH` endpoint exists to update client details or CAEN metadata.

### 1.4 Existing Client List View (`src/app/clients/page.tsx`)
In `src/app/clients/page.tsx` lines 24–43:
- The header only offers a link to `/imports/new` (`Import Nou din Excel`).
- There is **no "Client Nou" button or modal** for manual intake.
- In lines 61–142, client cards only display basic address and contact details; they do **not** render the company's CAEN code, activity description, founding year, or SSM provider details.
- In lines 45–59, the empty state only invites the user to upload an Excel spreadsheet.

### 1.5 Existing Client Dossier View (`src/app/clients/[id]/page.tsx`)
In `src/app/clients/[id]/page.tsx` lines 85–154:
- The client header and details card only display: CUI, RegCom, Legal Representative, Contact Person, and Address.
- There is **no section displaying the company's CAEN code**, activity description, statutory risk level, training intervals, hygiene requirement, founding year, or authorized SSM provider details.
- There is **no "Edit" action** allowing the user to update company or CAEN metadata.

### 1.6 CAEN Catalog Capabilities (`src/lib/caen-catalog.ts`)
The catalog in `src/lib/caen-catalog.ts` provides complete metadata:
- `CAEN_CATALOG`: 18 representative Romanian industry codes across IT, Horeca, Construction, Retail, Logistics, Healthcare, Consulting, Personal Services.
- `searchCaen(query)`: Flexible multi-criteria search (code, name, division, description, typical job titles without diacritics).
- `getCaenEntry(code)`: Look up statutory properties (`riskClass`, `defaultSsmIntervalMonths`, `defaultPsiIntervalMonths`, `requiresHygieneCourse`, `hygieneModule`).
- `normalizeCaenCode(code)`: Robust normalization stripping dots, prefixes, and formatting.

### 1.7 Current Build & Test Baseline
Execution of `scripts/verify-all.ts` via `npx tsx scripts/verify-all.ts`:
- Suite 1 (Document Auto-Completion): 25/25 templates generated cleanly.
- Suite 2 (Compliance Calculation): 45/45 tests passed.
- Suite 3 (E2E Suite): 53/53 tests passed.
- Suite 4 (Application Production Build): Turbopack compiled successfully with 0 errors.
- Total: **124/124 passed (100% pass rate)**.

---

## 2. Logic Chain

1. **Prerequisites Met in Schema**: Since `prisma/schema.prisma` already holds all CAEN and SEPP fields (`caenCode`, `caenActivity`, `foundedYear`, `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`) (Observation 1.1), no database migration is required.
2. **API Completeness Requirement**: For users to manually add and edit client profiles, the API layer must support:
   - `POST /api/clients`: Accept, validate, sanitize, and persist all client fields including CAEN code, activity, founding year, and SEPP provider details (extending Observation 1.2).
   - `PATCH /api/clients/[id]`: Create `src/app/api/clients/[id]/route.ts` to accept partial updates for client profile fields (resolving Observation 1.3).
   - `GET /api/clients/[id]`: Return full client profile and counts.
   - `GET /api/clients`: Project CAEN and SEPP fields so list views and consumers receive full context.
3. **Interactive Intake Experience**:
   - In `src/app/clients/page.tsx`, add a primary action button "+ Client Nou" opening a modal `<ClientIntakeModal />` (resolving Observation 1.4).
   - The modal must embed a live `<CaenSelector />` hooked to `searchCaen` and `getCaenEntry` from `@/lib/caen-catalog` (Observation 1.6).
   - Selecting a CAEN entry auto-populates `caenCode` and `caenActivity`, and displays the statutory risk tier and recommended training intervals.
   - Submitting the modal issues a `POST /api/clients`. On success, it redirects to the new client's dossier (`/clients/[id]`).
4. **Enhanced Client Dossier (`/clients/[id]`)**:
   - In `src/app/clients/[id]/page.tsx`, add a dedicated card: **"Profil Activitate Economică (CAEN) & SEPP Abilitat"** (resolving Observation 1.5).
   - Display: CAEN code with risk badge (LOW = Green, MEDIUM = Amber, HIGH = Red), activity title, legal training intervals (SSM/PSI), hygiene requirements, founding year, and SEPP provider name/specialist/cert.
   - Add an **"Editează Date Firmă"** button opening `<ClientEditModal client={client} />`.
   - Submitting the edit modal sends a `PATCH /api/clients/[id]`, followed by `router.refresh()` to update server-rendered data immediately.
5. **Contextual Downstream Impact**:
   - `src/lib/templates/resolver.ts` directly consumes `client.caenCode`, `client.caenActivity`, `client.foundedYear`, `client.ssmProviderName`, `client.ssmSpecialistName`, `client.ssmSpecialistCert` (Observation 1.5 of `resolver.ts`). Saving these fields through this UI immediately activates contextual placeholder population for all 25 official templates.
   - `src/lib/risk/caen-risk-presets.ts` uses `caenCode` to allocate INCDPM Pece risk factors. Profiling clients by CAEN ensures accurate risk assessments.
6. **Synergy with Peer Agents**:
   - `m2_r2_explorer_2` is building the Organizational Decisions 01–09 manager on `/clients/[id]`. Designing `PATCH /api/clients/[id]` to also accept `designatedWorkerSsm`, `firstAidResponder`, `psiResponder`, `investigationMembers`, and `decisionsDate` provides an immediate, unified backend for Explorer 2 without duplicate endpoints.

---

## 3. Caveats

1. **Scope Boundary**: This specification addresses Client Intake, CAEN profiling, SEPP provider configuration, and company metadata management. The full Decizii 01–09 appointment UI and DOCX package trigger belong to `m2_r2_explorer_2`.
2. **Training Scadențe Reset**: The training scheduler and `POST /api/trainings/record` belong to `m2_r2_spec_miner_3`.
3. **Offline CAEN Catalog**: `src/lib/caen-catalog.ts` contains 18 representative CAEN codes covering the major Romanian sectors. The selector allows arbitrary 4-digit code entry with custom activity text if a client operates outside the catalog presets.
4. **Client Components in Server Pages**: `src/app/clients/page.tsx` and `src/app/clients/[id]/page.tsx` are async Next.js Server Components. The modal components (`<ClientIntakeModal />` and `<ClientEditModal />`) must be isolated Client Components (`'use client'`) imported cleanly without forcing the entire page into client mode.

---

## 4. Conclusion & Actionable Blueprint

### 4.1 Specification for API Routes

#### 4.1.1 Update `src/app/api/clients/route.ts`
- **GET Handler**: Include `caenCode`, `caenActivity`, `foundedYear`, `ssmProviderName`, `ssmSpecialistName`, `ssmSpecialistCert`, `regCom`, `legalRepresentative` in the Prisma select.
- **POST Handler**:
  - Request body:
    ```typescript
    interface CreateClientBody {
      name: string;
      cui: string;
      regCom?: string | null;
      address: string;
      legalRepresentative?: string | null;
      contactPerson?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      isActive?: boolean;
      caenCode?: string | null;
      caenActivity?: string | null;
      foundedYear?: number | string | null;
      ssmProviderName?: string | null;
      ssmSpecialistName?: string | null;
      ssmSpecialistCert?: string | null;
      designatedWorkerSsm?: string | null;
      firstAidResponder?: string | null;
      psiResponder?: string | null;
      investigationMembers?: string | null;
      decisionsDate?: string | Date | null;
    }
    ```
  - Validation:
    - Check required `name`, `cui`, `address`. Return `400` if missing.
    - Trim `cui.trim().toUpperCase()`.
    - Check for duplicate CUI (`findUnique({ where: { cui } })`). If found, return `409` with `{ error: 'Există deja o firmă înregistrată cu acest CUI/CIF.' }`.
    - Normalize `caenCode` via `normalizeCaenCode(caenCode)`. If `caenActivity` is blank and catalog has entry, populate from `getCaenEntry(caenCode).name`.
    - Parse `foundedYear` defensively: `const year = foundedYear ? parseInt(String(foundedYear), 10) : null;`.
    - Parse `decisionsDate` defensively if provided.
  - Return `201 Created` with created client.

#### 4.1.2 Create `src/app/api/clients/[id]/route.ts`
Implement `GET` and `PATCH`:
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCaenCode, getCaenEntry } from '@/lib/caen-catalog';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      worksites: { orderBy: { name: 'asc' } },
      jobs: { orderBy: { title: 'asc' } },
      _count: {
        select: {
          employees: true,
          jobs: true,
          worksites: true,
          generatedDocuments: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    // Check CUI uniqueness if changed
    if (body.cui && body.cui.trim().toUpperCase() !== existing.cui) {
      const cleanCui = body.cui.trim().toUpperCase();
      const duplicate = await prisma.client.findFirst({
        where: { cui: cleanCui, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Un alt client folosește deja CUI-ul ${cleanCui} (${duplicate.name}).` },
          { status: 409 }
        );
      }
    }

    let parsedYear: number | null | undefined = undefined;
    if (body.foundedYear !== undefined) {
      if (body.foundedYear === null || body.foundedYear === '') {
        parsedYear = null;
      } else {
        const y = parseInt(String(body.foundedYear), 10);
        parsedYear = isNaN(y) ? null : y;
      }
    }

    let normalizedCaen = body.caenCode !== undefined 
      ? (body.caenCode ? normalizeCaenCode(body.caenCode) : null) 
      : undefined;
      
    let caenActivity = body.caenActivity;
    if (normalizedCaen && (caenActivity === undefined || caenActivity === null || caenActivity === '')) {
      const entry = getCaenEntry(normalizedCaen);
      if (entry) caenActivity = entry.name;
    }

    let parsedDecisionsDate: Date | null | undefined = undefined;
    if (body.decisionsDate !== undefined) {
      if (body.decisionsDate === null || body.decisionsDate === '') {
        parsedDecisionsDate = null;
      } else {
        const d = new Date(body.decisionsDate);
        parsedDecisionsDate = isNaN(d.getTime()) ? null : d;
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        cui: body.cui !== undefined ? body.cui.trim().toUpperCase() : undefined,
        regCom: body.regCom !== undefined ? (body.regCom?.trim() || null) : undefined,
        address: body.address !== undefined ? body.address.trim() : undefined,
        legalRepresentative: body.legalRepresentative !== undefined ? (body.legalRepresentative?.trim() || null) : undefined,
        contactPerson: body.contactPerson !== undefined ? (body.contactPerson?.trim() || null) : undefined,
        contactEmail: body.contactEmail !== undefined ? (body.contactEmail?.trim() || null) : undefined,
        contactPhone: body.contactPhone !== undefined ? (body.contactPhone?.trim() || null) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,

        // CAEN & Profiling
        caenCode: normalizedCaen,
        caenActivity: caenActivity !== undefined ? (caenActivity ? String(caenActivity).trim() : null) : undefined,
        foundedYear: parsedYear,

        // SEPP Provider Details
        ssmProviderName: body.ssmProviderName !== undefined ? (body.ssmProviderName?.trim() || null) : undefined,
        ssmSpecialistName: body.ssmSpecialistName !== undefined ? (body.ssmSpecialistName?.trim() || null) : undefined,
        ssmSpecialistCert: body.ssmSpecialistCert !== undefined ? (body.ssmSpecialistCert?.trim() || null) : undefined,

        // Appointees (forward compatible for Decizii 01-09)
        designatedWorkerSsm: body.designatedWorkerSsm !== undefined ? (body.designatedWorkerSsm?.trim() || null) : undefined,
        firstAidResponder: body.firstAidResponder !== undefined ? (body.firstAidResponder?.trim() || null) : undefined,
        psiResponder: body.psiResponder !== undefined ? (body.psiResponder?.trim() || null) : undefined,
        investigationMembers: body.investigationMembers !== undefined ? (body.investigationMembers?.trim() || null) : undefined,
        decisionsDate: parsedDecisionsDate,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la actualizarea clientului.' },
      { status: 500 }
    );
  }
}
```

---

### 4.2 Specification for UI Components

#### 4.2.1 Component: `src/components/caen-selector.tsx`
Create a dedicated, reusable CAEN selector:
- Features:
  - Input with live search filtering across code, title, industry division, and typical job roles using `searchCaen(query)`.
  - Dropdown popup with scrollable catalog items.
  - Displays CAEN code badge, full name, risk tier (`LOW` = Verde, `MEDIUM` = Chihlimbar, `HIGH` = Roșu), default SSM and PSI training intervals in months, and a badge if hygiene courses are required (`Modulul 1/2/3`).
  - Selecting an item triggers `onSelect(entry: CaenEntry)`, passing `entry.code`, `entry.name`, risk details, etc.
  - Allows manual typing/editing if the user has a custom CAEN code.
  - Dismisses on click-outside or Esc key.

#### 4.2.2 Component: `src/components/client-intake-modal.tsx`
Client Component (`'use client'`) for `/clients`:
- Trigger button:
  ```tsx
  <button
    onClick={() => setIsOpen(true)}
    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition"
  >
    <Plus className="w-4 h-4" />
    <span>Client Nou</span>
  </button>
  ```
- Modal Dialog Layout:
  - Header: "Înregistrare Client Nou (Dosar SSM & Profil CAEN)"
  - Sections:
    1. **Date de Identificare & Sediu**:
       - Denumire Firmă (obligatoriu, ex: `ALPHA DIGITAL S.R.L.`)
       - CUI / CIF (obligatoriu, ex: `RO45123987`)
       - Nr. Reg. Comerțului (ex: `J40/1234/2022`)
       - Sediu Social Complet (obligatoriu, ex: `București, Str. Academiei nr. 1, Sector 1`)
       - An Înființare (ex: `2022`)
    2. **Profil Activitate Economică (CAEN Rev. 2)**:
       - Integrated `<CaenSelector />` with live auto-complete.
       - Selected activity preview: Risk Class badge, Statutory SSM Interval (ex: 6 luni), PSI Interval (ex: 6 luni), Hygiene requirement indicator.
       - Textarea for `caenActivity`, editable if company has specific legal wording.
    3. **Reprezentare Legală & Contact**:
       - Reprezentant Legal (ex: `Popescu Ion, Administrator`)
       - Persoană de Contact (ex: `Simona Georgescu`)
       - Telefon Contact (ex: `0722123456`)
       - Email Contact (ex: `contact@alphadigital.ro`)
    4. **Serviciu Extern de Prevenire și Protecție (SEPP)**:
       - Prestator SSM abilitat ITM (pre-filled with default: `EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.`)
       - Specialist / Evaluator SSM (pre-filled with default: `Ing. Mihai Popescu`)
       - Certificat atestare / abilitare (pre-filled with default: `Certificat seria EV nr. 10452/2018`)
  - Validation:
    - Inline alert banner on error (e.g. missing fields or duplicate CUI).
    - Loading spinner during API request.
  - Submission:
    - Calls `POST /api/clients`.
    - On success: closes modal, redirects to `/clients/${client.id}` via `useRouter().push()`.

#### 4.2.3 Component: `src/components/client-edit-modal.tsx`
Client Component (`'use client'`) for `/clients/[id]`:
- Trigger button:
  ```tsx
  <button
    onClick={() => setIsOpen(true)}
    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
  >
    <Edit className="w-4 h-4 text-slate-600" />
    <span>Editează Date Firmă</span>
  </button>
  ```
- Pre-filled with current `client` values:
  - Identity, Contact, CAEN selector, Activity description, Founding year, SEPP provider name, specialist, cert.
- Submitting:
  - Calls `PATCH /api/clients/${client.id}`.
  - On success: calls `router.refresh()`, closes modal, shows success alert.

#### 4.2.4 Updates in `src/app/clients/page.tsx`
1. Header: Render `<ClientIntakeModal />` alongside the Excel import button.
2. Empty State: Render `<ClientIntakeModal />` button alongside "Încarcă Registrul Client".
3. Cards in Grid:
   - Display CAEN badge:
     ```tsx
     {c.caenCode && (
       <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
         <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
           CAEN {c.caenCode}
         </span>
         {c.foundedYear && (
           <span className="text-[10px] text-slate-500 font-medium">
             An înființare: {c.foundedYear}
           </span>
         )}
       </div>
     )}
     {c.caenActivity && (
       <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic" title={c.caenActivity}>
         {c.caenActivity}
       </p>
     )}
     ```
   - Display SEPP provider when present.

#### 4.2.5 Updates in `src/app/clients/[id]/page.tsx`
1. Header Actions: Include `<ClientEditModal client={client} />`.
2. New Card: **"Profil Activitate Economică (CAEN) & SEPP Abilitat"**:
   - Left Column:
     - Cod CAEN Rev. 2 (large monospace chip)
     - Denumire Activitate
     - Clasă Risc SSM (Scăzut / Mediu / Ridicat) with color coding
     - Frecvență Instruire SSM (e.g. 12 luni / 6 luni / 3 luni conform HG 1425/2006 art. 95)
     - Frecvență Instruire PSI (e.g. 6 luni / 3 luni conform OMAI 712/2005)
     - Cerință Cursuri Igienă (Conform Ordin 2209/2022)
     - An Înființare
   - Right Column:
     - Serviciu Extern Prevenire și Protecție (SEPP): `client.ssmProviderName`
     - Specialist SSM / Evaluator Desemnat: `client.ssmSpecialistName`
     - Certificat Atestare / Abilitare: `client.ssmSpecialistCert`
   - Direct edit button on the card for quick access.

---

## 5. Verification Method

To verify the implementation independently:

1. **Verify API Endpoints Programmatically**:
   - `POST /api/clients`:
     - Test valid intake: Send payload with name, cui, address, caenCode="6201", foundedYear=2023, ssmProviderName="EXPERT SSM S.R.L.". Verify HTTP 201 and returned JSON contains all fields.
     - Test duplicate CUI: Resend same CUI. Verify HTTP 409 Conflict with informative error message.
     - Test missing mandatory fields: Send payload without address. Verify HTTP 400 Bad Request.
   - `PATCH /api/clients/[id]`:
     - Test updating caenCode to "5610" and foundedYear to 2024. Verify HTTP 200 and updated fields in database.
     - Test updating SEPP provider details. Verify HTTP 200.
     - Test nonexistent ID: Verify HTTP 404.
   - `GET /api/clients/[id]`:
     - Verify HTTP 200 and full JSON payload including CAEN and counts.

2. **Verify User Interface Rendering**:
   - Navigate to `/clients`:
     - Verify "+ Client Nou" button is clearly visible in the header.
     - Click "+ Client Nou", verify modal opens with all 4 tabs/sections.
     - Type "6201" or "restaurant" into CAEN selector; verify matching items appear in dropdown with risk tags.
     - Select an item; verify activity name and intervals auto-fill.
     - Fill form and submit; verify new client appears in registry and opens in `/clients/[id]`.
   - Navigate to `/clients/[id]`:
     - Verify the "Profil Activitate Economică (CAEN) & SEPP Abilitat" card is visible and displays accurate CAEN code, activity description, risk tier, training intervals, and SEPP provider details.
     - Click "Editează Date Firmă", change a field (e.g. founding year or activity), submit; verify modal closes and page updates immediately.

3. **Verify Full Application Build & Regression Suites**:
   Run the following terminal commands from `/Users/davidalexandru/Documents/Proiect_SSM`:
   ```bash
   npx tsc --noEmit
   npm run build
   npx tsx scripts/verify-all.ts
   ```
   **Invalidation Conditions**:
   - Any TypeScript error in Next.js Turbopack build (`npm run build`).
   - Failure in any of the 4 test suites in `scripts/verify-all.ts` (Document generation, Compliance scadențe, E2E suite, Build).
   - Duplicate CUI causing an unhandled Prisma 500 error instead of a handled 409 response.
   - Missing CAEN or provider fields when generating templates via `src/lib/templates/resolver.ts`.
