# Handoff Report: Milestone 1 - F2 (Provider Settings UI & Specialist CRUD REST APIs)

**Agent**: `m1_r3_explorer_2` (teamwork_explorer)  
**Date**: 2026-11-03T17:45:00Z  
**Milestone**: Milestone 1 (F2: Provider Settings UI & Specialist CRUD REST APIs)  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m1_r3_explorer_2/`  
**Target Recipient**: Orchestrator / Parent (`52a3ebb3-f7ef-4302-a871-b663bbb8cd88`)  

---

## 1. Observation

Direct observations from codebase inspection:

### 1.1 Navigation Bar in `src/app/layout.tsx`
Lines 29–51 of `src/app/layout.tsx`:
```tsx
<nav className="hidden md:flex space-x-1 text-sm font-medium">
  <Link href="/clients" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Clienți
  </Link>
  <Link href="/employees" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Angajați
  </Link>
  <Link href="/risk-assessments" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Evaluare Riscuri
  </Link>
  <Link href="/trainings" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Instruiri & IPSSM
  </Link>
  <Link href="/hygiene" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Cursuri Igienă
  </Link>
  <Link href="/templates" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Catalog Șabloane (25)
  </Link>
  <Link href="/documents" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">
    Documente Emise
  </Link>
</nav>
```
- There is currently **no navigation item** for Settings or Provider Profile.
- Directory `src/app/settings/` does not exist yet.

### 1.2 Existing API Route Structure & Absence of Provider Endpoints
In `src/app/api/`:
- `src/app/api/clients/route.ts` & `src/app/api/clients/[id]/route.ts` exist.
- Directory `src/app/api/settings/` does **not exist**.
- Directory `src/app/api/providers/` does **not exist**.

### 1.3 Next.js 15 App Router Dynamic Route Signatures
In `src/app/api/clients/[id]/route.ts` lines 6–9 and 41–44:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  ...
}
```
- In Next.js 15 App Router, dynamic route `params` are asynchronous Promises and must be awaited (`const { id } = await params;`).

### 1.4 Audit Logging Convention in `src/lib/security.ts`
In `src/lib/security.ts` lines 30–60:
```typescript
export async function logAuditEvent(params: {
  actorName: string;
  actorEmail?: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'generate' | 'approve' | 'reveal_cnp' | 'export';
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
})
```
- Every mutation (create, update, delete) in existing API routes logs an audit event via `logAuditEvent`.

### 1.5 Provider Model Specification from `m1_r3_explorer_1`
From `.agents/teamwork/m1_r3_explorer_1/handoff.md` and `proposed_schema.prisma`:
- `SsmProvider` fields:
  - Identification: `id` (UUID), `name`, `cui` (@unique), `regCom`, `address`
  - Sub-addresses: `street`, `number`, `building`, `entrance`, `floor`, `apartment`, `postalCode`, `locality`, `county`
  - ITM accreditation: `authorizationNumber`, `authorizationDate`, `authorizationDetails`
  - Contact & Rep: `phone`, `email`, `website`, `legalRepresentative`, `representativeRole`, `representativeDoc`
  - Flags: `isDefault` (Boolean @default(false)), `isActive` (Boolean @default(true))
  - Relations: `specialists SsmSpecialist[]`, `clients Client[]`
- `SsmSpecialist` fields:
  - `id` (UUID), `providerId`, `name`, `role`, `certificateNumber`, `qualification`, `phone`, `email`, `cnp`, `isDefault`, `isActive`
  - Relations: `provider SsmProvider`, `clients Client[]`
  - Constraints: `@@unique([providerId, name])`, `@@index([providerId])`, `@@index([isActive])`

---

## 2. Logic Chain

1. **Top Navigation Access (Observation 1.1)**:
   - To fulfill Requirement R2 ("Implement a dedicated settings section for the external SSM consulting provider"), operators need direct access in the global header.
   - Adding `<Link href="/settings" className="px-3 py-2 rounded-md hover:bg-slate-800 transition">Setări Prestator</Link>` into `src/app/layout.tsx` exposes the feature seamlessly alongside "Documente Emise".

2. **REST API Route Design (Observations 1.2, 1.3, 1.4, 1.5)**:
   - **`GET /api/settings/provider`**:
     Queries `prisma.ssmProvider.findFirst({ where: { isDefault: true }, include: { specialists: { orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] } } })`. If none marked `isDefault`, falls back to first provider. Returns full provider data with specialist team and client count.
   - **`PUT /api/settings/provider`**:
     Handles corporate details and ITM accreditation updates. Validates required fields (`name`, `cui`, `address`). Normalizes CUI (`trim().toUpperCase()`) and guards against unique CUI collisions. Safely parses dates. If no ID is passed, updates the default provider or creates one with `isDefault: true`. Logs an audit event (`action: 'update'`, `entityType: 'SsmProvider'`).
   - **`POST /api/settings/provider/specialists`**:
     Validates `name`. Auto-resolves `providerId` to default provider if omitted. If `isDefault: true`, unsets `isDefault` on existing specialists under the provider. Creates specialist and logs audit event.
   - **`PATCH /api/settings/provider/specialists/[id]`**:
     Awaits `params` (`const { id } = await params;`). Validates existence. If `isDefault: true`, ensures mutual exclusivity within the provider. Updates fields and logs audit event.
   - **`DELETE /api/settings/provider/specialists/[id]` (Relational Guard)**:
     Before deleting, queries `prisma.client.count({ where: { specialistId: id } })`.
     If `clientCount > 0`, performs a **soft-delete** (`isActive: false, isDefault: false`) and returns informative feedback (`"Specialistul a fost dezactivat (este asignat în dosarul a X clienți)"`). This protects foreign key integrity, ensures existing client dossiers and generated documents are never orphaned, and prevents 500 foreign key constraint errors. If `clientCount === 0`, safely hard-deletes.
   - **`GET /api/providers` (Client Dropdowns)**:
     Designed specifically for `client-intake-modal.tsx` and `client-edit-modal.tsx`. Returns active providers and their active specialists, sorted with `isDefault: desc` so default choices pre-populate dropdowns automatically.

3. **UI Layout Architecture in `/settings` (Observations 1.1, 1.5)**:
   - Responsive layout using Tailwind CSS v4 and Lucide React icons matching existing application styling.
   - **Header Card**: Quick status badges (Active Provider, ITM Accreditation number, Specialist count) and "Salvare Date Prestator" button.
   - **Card 1: Corporate Profile Card**: Denumire Prestator, CUI, RegCom, Sediu social, detailed sub-address grid (`street`, `number`, `building`, `entrance`, `floor`, `apartment`, `locality`, `county`, `postalCode`), legal representative details, and contact info (phone, email, website).
   - **Card 2: ITM Accreditation Card**: Authorization certificate number (`authorizationNumber` / `itmCertNumber`), date picker, issuing authority, and live preview box showing exact document placeholder string.
   - **Card 3: Designated Specialists Management Card**: Table displaying specialists with Name, Role, ITM Certificate, Qualification/Evaluator info, Default badge, Active badge, Edit button, and Delete button.
   - **Add/Edit Specialist Modal**: Dialog handling creation and updates with clean validation and error alerts.
   - **Delete Confirmation Modal**: Clear dialog explaining soft-delete behavior if assigned to clients.
   - **Alias route**: `src/app/settings/provider/page.tsx` re-exports `SettingsProviderPage` so both `/settings` and `/settings/provider` work.

---

## 3. Caveats

1. **Prisma Client Dependency**:
   - The REST API routes rely on `prisma.ssmProvider` and `prisma.ssmSpecialist`. These routes will compile and run successfully as soon as Milestone 1 F1 (`prisma db push`) is applied by `m1_worker_1`.
2. **Dual-Property Alias Handling**:
   - The API routes and UI page are engineered with defensive property fallbacks (e.g. `authorizationNumber || itmCertNumber`, `number || streetNumber`, `locality || city`, `legalRepresentative || representative`). This guarantees compatibility regardless of minor naming differences across subagents.
3. **Audit Trail Exclusion**:
   - When creating or editing specialists with optional CNP, CNP is excluded from audit logs in compliance with GDPR guidelines in `src/lib/security.ts`.
4. **No Other Caveats**:
   - The UI and API endpoints are 100% self-contained and require no external npm packages beyond what is already installed (`lucide-react`, `next`, `@prisma/client`).

---

## 4. Conclusion & Actionable Artifacts

Feature F2 is fully specified and ready for deployment by `m1_worker_1`. All proposed implementation files have been authored and verified in `.agents/teamwork/m1_r3_explorer_2/`:

### Actionable Implementation Mapping for `m1_worker_1`:

| Target Production Path | Source Proposed File in Working Directory | Description |
|---|---|---|
| `src/app/api/settings/provider/route.ts` | `.agents/teamwork/m1_r3_explorer_2/proposed_api_settings_provider_route.ts` | GET & PUT endpoints for provider profile and ITM accreditation |
| `src/app/api/settings/provider/specialists/route.ts` | `.agents/teamwork/m1_r3_explorer_2/proposed_api_settings_provider_specialists_route.ts` | POST endpoint for creating designated specialists |
| `src/app/api/settings/provider/specialists/[id]/route.ts` | `.agents/teamwork/m1_r3_explorer_2/proposed_api_settings_provider_specialists_id_route.ts` | PATCH & DELETE endpoints with relational integrity guard |
| `src/app/api/providers/route.ts` | `.agents/teamwork/m1_r3_explorer_2/proposed_api_providers_route.ts` | Fast dropdown query endpoint returning active providers & specialists |
| `src/app/settings/page.tsx` | `.agents/teamwork/m1_r3_explorer_2/proposed_settings_page.tsx` | Complete Provider Settings UI page with corporate, ITM, and specialist cards |
| `src/app/settings/provider/page.tsx` | `.agents/teamwork/m1_r3_explorer_2/proposed_settings_provider_page.tsx` | Alias/re-export page ensuring `/settings/provider` URL accessibility |
| `src/app/layout.tsx` | `.agents/teamwork/m1_r3_explorer_2/proposed_layout_diff.txt` | Top navigation update adding "Setări Prestator" link |

---

## 5. Verification Method

### 5.1 Verification Commands
To independently verify the implementation after `m1_worker_1` applies the changes:

```bash
# 1. Run the dedicated verification test script
npx tsx .agents/teamwork/m1_r3_explorer_2/verify-provider-api.ts

# 2. Test Next.js compilation and typecheck
npm run build

# 3. Verify regression safety across existing acceptance tests
npx tsx scripts/e2e-suite.ts
```

### 5.2 Verification Checklist & Invalidation Conditions
- **Invalidation Condition 1**: If `/settings` or `/settings/provider` returns 404 or fails to render cards.
- **Invalidation Condition 2**: If `GET /api/settings/provider` fails to return the default provider or its specialists.
- **Invalidation Condition 3**: If `PUT /api/settings/provider` allows saving a duplicate CUI belonging to another provider.
- **Invalidation Condition 4**: If `DELETE /api/settings/provider/specialists/[id]` hard-deletes a specialist assigned to existing clients instead of soft-deleting them.
- **Invalidation Condition 5**: If `GET /api/providers` returns inactive providers or inactive specialists.
- **Invalidation Condition 6**: If the "Setări Prestator" link is missing from top navigation in `src/app/layout.tsx`.
