# Handoff Report: Organizational Decisions (Decizii SSM/SU 01-09) UI & Generation

**Agent**: `m2_r2_explorer_2` (Teamwork Explorer)  
**Milestone**: Milestone 2 — SSM Operational Workflows UI & Training Scheduler  
**Working Directory**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/m2_r2_explorer_2/`  
**Date**: 2026-11-02  

---

## 1. Observation

### 1.1 Existing Data Schema on `Client`
In `prisma/schema.prisma` lines 42–48:
```prisma
// 3. Numiri Decizii Organizatorice Angajator (Deciziile 01-09)
designatedWorkerSsm String?   // Lucrător desemnat SSM (Decizia 01)
firstAidResponder   String?   // Responsabil acordare prim ajutor (Decizia 02)
psiResponder        String?   // Cadru tehnic / responsabil PSI/SU (Decizia 03)
investigationMembers String?  // Membri comisie cercetare evenimente / accidente (Decizia 06)
decisionsDate       DateTime? // Data emiterii pachetului de decizii organizatorice
```
All required columns exist on the database `Client` table. They were added during Milestone 1 and are populated in `prisma/seed.ts` (lines 32–36) for `NEXUS SOLUTIONS S.R.L.`:
- `designatedWorkerSsm`: `'Munteanu Cristian'`
- `firstAidResponder`: `'Alexandru Stan'`
- `psiResponder`: `'Ioana-Raluca Dumitru'`
- `investigationMembers`: `'Gheorghe Barbu, Elena Vasilescu'`
- `decisionsDate`: `new Date('2026-01-15T00:00:00.000Z')`

### 1.2 Status of `/clients/[id]` Route and API Handlers
1. **Client Detail Page (`src/app/clients/[id]/page.tsx`)**:
   - Implemented as an async Server Component (488 lines).
   - Fetches `client` directly with `prisma.client.findUnique` including `worksites`, `jobs`, `employees`, and `generatedDocuments`.
   - Layout currently renders:
     * Section 1 (lines 85–154): Client Overview Card (metadata, export Excel, import Excel, generic document generator link).
     * Section 2 (lines 157–185): Compliance Overview Dashboard Section (scores, distribution).
     * Section 3 (lines 187–207): Stats Counter (Angajați Activi, Puncte de Lucru, Posturi, Documente Emise).
     * Section 4 (lines 209–364): Registru Salariați & Monitorizare Scadențe (employee compliance table).
     * Section 5 (lines 366–415): Worksites & Jobs cards.
     * Section 6 (lines 417–484): Generated Documents Archive.
   - **Gap**: There is currently NO dedicated card or form to view, edit, or manage the Organizational Decisions appointees (`designatedWorkerSsm`, `firstAidResponder`, `psiResponder`, `investigationMembers`, `decisionsDate`), nor a direct 1-click button to generate the `decizii-angajator` DOCX bundle.

2. **Client API Endpoints (`src/app/api/clients/`)**:
   - `src/app/api/clients/route.ts` exists (GET all clients, POST create client).
   - `src/app/api/clients/[id]/employees/route.ts` exists (GET active employees).
   - `src/app/api/clients/[id]/export/route.ts` exists (GET Excel export).
   - **Gap**: `src/app/api/clients/[id]/route.ts` **does NOT exist**. There is no `PATCH /api/clients/[id]` endpoint to save updated appointees.

### 1.3 Document Generation Pipeline (`src/app/api/documents/generate/route.ts`)
- The endpoint accepts `POST` with JSON:
  ```json
  {
    "templateCode": "decizii-angajator",
    "clientId": "<client-id>",
    "operatorName": "Operator Intern"
  }
  ```
- Calls `resolveTemplatePlaceholders({ templateCode, clientId, ... })` in `src/lib/templates/resolver.ts`.
- Calls `generateDocument({ templateCode, clientId, data: resolvedData, operatorName })` in `src/lib/templates/generator.ts`.
- Returns:
  ```json
  {
    "success": true,
    "result": {
      "documentId": "7f5d6e9f-e4eb-4835-914f-4035ef813b81",
      "templateCode": "decizii-angajator",
      "title": "Pachet Decizii Interne SSM ale Angajatorului - NEXUS SOLUTIONS S.R.L.",
      "status": "approved_for_print",
      "filePath": ".../storage/documents/7f5d6e9f-e4eb-4835-914f-4035ef813b81.docx",
      "fileSizeBytes": 51230,
      "missingFields": []
    },
    "downloadUrl": "/api/documents/7f5d6e9f-e4eb-4835-914f-4035ef813b81/download"
  }
  ```
- Direct download route `GET /api/documents/[id]/download/route.ts` already exists, streams the buffer with proper `Content-Disposition: attachment; filename="decizii-angajator_<id>.docx"`, and logs an audit event.

### 1.4 Template Analysis of `DECIZII.docx` (`decizii-angajator`)
Inspection of `templates_registry/normalized/DECIZII.docx` confirmed the official template contains 44 placeholders covering:
- **Decizia 01**: Periodicitate instructaje periodice SSM conform Legii 319/2006 (`PLACEHOLDER_NUMAR_DECIZIE_01`, `PLACEHOLDER_DATA_DECIZIE`).
- **Decizia 02**: Desemnare Lucrător Desemnat SSM conform art. 8 Legea 319/2006 (`PLACEHOLDER_NUMAR_DECIZIE_02`, `PLACEHOLDER_LUCRATOR_DESEMNAT_SSM`).
- **Decizia 03**: Desemnare Echipă Acordare Prim Ajutor conform art. 10 alin. 2 Legea 319/2006 (`PLACEHOLDER_NUMAR_DECIZIE_03`, `PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR`).
- **Decizia 04**: Periodicitate și durată instructaje SSM (introductiv-generală 4h, la locul de muncă 8h, periodică) (`PLACEHOLDER_NUMAR_DECIZIE_04`).
- **Decizia 05**: Comisie evaluare riscuri SSM conform metodei INCDPM Pece (`PLACEHOLDER_NUMAR_DECIZIE_05`, `PLACEHOLDER_EVALUATOR_RISC`).
- **Decizia 06**: Desemnare Cadru Tehnic / Responsabil cu atribuții PSI conform Legii 307/2006 și Comisie cercetare evenimente (`PLACEHOLDER_NUMAR_DECIZIE_06`, `PLACEHOLDER_RESPONSABIL_PSI`, `PLACEHOLDER_MEMBRU_COMISIE`).
- **Decizia 07**: Comisie de apărare împotriva incendiilor (`PLACEHOLDER_NUMAR_DECIZIE_07`).
- **Decizia 08**: Reglementare foc deschis, emitere Permis de Lucru cu Foc conform OMAI 163/2007 (`PLACEHOLDER_NUMAR_DECIZIE_08`, `PLACEHOLDER_RESPONSABIL_CONTROL_PSI`, `PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI`, `PLACEHOLDER_NUMAR_PERMIS_FOC`, etc.).
- **Decizia 09**: Reglementare locuri pentru fumat conform Legii 307/2006 (`PLACEHOLDER_NUMAR_DECIZIE_09`, `PLACEHOLDER_RESPONSABIL_PSI`).
- **Decizia 11**: Organizare categorii de instructaj Situații de Urgență conform OMAI 712/2005 (`PLACEHOLDER_NUMAR_DECIZIE_11`).

### 1.5 Verification of Zero-Placeholder Generation
Direct programmatic execution of `generateDocument` for `decizii-angajator` with `NEXUS SOLUTIONS S.R.L.` confirmed:
- `missingFields`: `[]` (0 missing fields).
- Status: `approved_for_print`.
- XML extraction of `word/document.xml` confirmed: `Unresolved placeholders in generated docx: []` (0 unresolved tokens).

---

## 2. Logic Chain

1. **Step 1 — Domain Mapping**:  
   The Romanian regulatory requirements (Legea 319/2006, Legea 307/2006) require every company to formally designate 5 operational responsibilities: (1) Lucrător desemnat SSM, (2) Responsabil Prim Ajutor, (3) Responsabil PSI, (4) Comisie cercetare evenimente, and (5) Data emiterii deciziilor. These correspond exactly to the 5 scalar columns already present on Prisma `Client`.

2. **Step 2 — Client/Server Component Boundary**:  
   `src/app/clients/[id]/page.tsx` is an async Server Component reading directly from Prisma. To provide rich interactivity (inline editing, client-side dropdown selection from active employees, form submission to `PATCH`, loading spinners, and automatic file download without navigating away), the organizational decisions manager must be implemented as a client component: `src/components/organizational-decisions-card.tsx`.

3. **Step 3 — Appointees Selection UX**:  
   - `client.firstAidResponder` and `client.psiResponder` should be selected from the client's currently active employees via `<select>` dropdowns displaying `${employee.lastName} ${employee.firstName} (${employee.currentJob?.title || 'Fără post'})`.
   - `client.designatedWorkerSsm` can be the Legal Representative (`client.legalRepresentative`), an active employee, or external free-text specialist.
   - `client.investigationMembers` should support multi-selection of active employees, serialized to/deserialized from a comma-separated string (e.g. `"Gheorghe Barbu, Elena Vasilescu"`), with an editable text field fallback.
   - `client.decisionsDate` should be an HTML5 date picker `<input type="date">` displaying Romanian formatted dates (`DD.MM.YYYY`) in view mode.

4. **Step 4 — Update Flow (`PATCH /api/clients/[id]`)**:  
   Since `src/app/api/clients/[id]/route.ts` is missing, creating it provides both `GET /api/clients/[id]` (client data fetching) and `PATCH /api/clients/[id]` (atomic update of appointees with date parsing and audit logging).

5. **Step 5 — 1-Click Generation Action**:  
   Clicking "Generează Pachet Decizii 01–09 (DOCX)":
   - Calls existing `POST /api/documents/generate` with `{ templateCode: 'decizii-angajator', clientId }`.
   - Uses the saved appointees from the database.
   - On response `{ success: true, downloadUrl }`, triggers an immediate file download and renders a persistent success alert with a re-download link.

---

## 3. Detailed Specifications & Implementation Plan

### 3.1 Backend Route: `src/app/api/clients/[id]/route.ts`

Create `src/app/api/clients/[id]/route.ts` implementing `GET` and `PATCH`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employees: true, jobs: true, worksites: true, generatedDocuments: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea clientului.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    const {
      designatedWorkerSsm,
      firstAidResponder,
      psiResponder,
      investigationMembers,
      decisionsDate,
      caenCode,
      caenActivity,
      foundedYear,
      ssmProviderName,
      ssmSpecialistName,
      ssmSpecialistCert,
      legalRepresentative,
      contactPerson,
      contactEmail,
      contactPhone,
      address,
    } = body;

    // Parse decisionsDate safely
    let parsedDecisionsDate: Date | null | undefined = undefined;
    if (decisionsDate !== undefined) {
      if (decisionsDate === null || decisionsDate === '') {
        parsedDecisionsDate = null;
      } else {
        const d = new Date(decisionsDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Format dată decizie invalid.' }, { status: 400 });
        }
        parsedDecisionsDate = d;
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(designatedWorkerSsm !== undefined && { designatedWorkerSsm: designatedWorkerSsm?.trim() || null }),
        ...(firstAidResponder !== undefined && { firstAidResponder: firstAidResponder?.trim() || null }),
        ...(psiResponder !== undefined && { psiResponder: psiResponder?.trim() || null }),
        ...(investigationMembers !== undefined && { investigationMembers: investigationMembers?.trim() || null }),
        ...(parsedDecisionsDate !== undefined && { decisionsDate: parsedDecisionsDate }),
        ...(caenCode !== undefined && { caenCode: caenCode?.trim() || null }),
        ...(caenActivity !== undefined && { caenActivity: caenActivity?.trim() || null }),
        ...(foundedYear !== undefined && { foundedYear: foundedYear ? Number(foundedYear) : null }),
        ...(ssmProviderName !== undefined && { ssmProviderName: ssmProviderName?.trim() || null }),
        ...(ssmSpecialistName !== undefined && { ssmSpecialistName: ssmSpecialistName?.trim() || null }),
        ...(ssmSpecialistCert !== undefined && { ssmSpecialistCert: ssmSpecialistCert?.trim() || null }),
        ...(legalRepresentative !== undefined && { legalRepresentative: legalRepresentative?.trim() || null }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson?.trim() || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
        ...(contactPhone !== undefined && { contactPhone: contactPhone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || existingClient.address }),
      },
    });

    await logAuditEvent({
      actorName: 'Operator Intern',
      action: 'update',
      entityType: 'Client',
      entityId: id,
      details: {
        message: 'Actualizare numiri decizii organizatorice SSM/SU',
        updatedFields: Object.keys(body),
      },
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (err: unknown) {
    console.error('PATCH /api/clients/[id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la actualizarea clientului.' },
      { status: 500 }
    );
  }
}
```

---

### 3.2 UI Component: `src/components/organizational-decisions-card.tsx`

Create `src/components/organizational-decisions-card.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  Calendar,
  UserCheck,
  HeartPulse,
  Flame,
  Users2,
  Download,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Save,
  X
} from 'lucide-react';

export interface AppointeeEmployee {
  id: string;
  fullName: string;
  jobTitle?: string | null;
}

export interface OrganizationalDecisionsCardProps {
  clientId: string;
  initialData: {
    designatedWorkerSsm: string | null;
    firstAidResponder: string | null;
    psiResponder: string | null;
    investigationMembers: string | null;
    decisionsDate: string | null; // YYYY-MM-DD format
    legalRepresentative: string | null;
  };
  activeEmployees: AppointeeEmployee[];
  lastGeneratedDate?: string | null;
  lastGeneratedDocId?: string | null;
}

export function OrganizationalDecisionsCard({
  clientId,
  initialData,
  activeEmployees,
  lastGeneratedDate,
  lastGeneratedDocId,
}: OrganizationalDecisionsCardProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form values
  const [form, setForm] = useState({
    designatedWorkerSsm: initialData.designatedWorkerSsm || '',
    firstAidResponder: initialData.firstAidResponder || '',
    psiResponder: initialData.psiResponder || '',
    investigationMembers: initialData.investigationMembers || '',
    decisionsDate: initialData.decisionsDate || new Date().toISOString().split('T')[0],
  });

  // Latest generated document state
  const [downloadUrl, setDownloadUrl] = useState<string | null>(
    lastGeneratedDocId ? `/api/documents/${lastGeneratedDocId}/download` : null
  );
  const [generatedDate, setGeneratedDate] = useState<string | null>(lastGeneratedDate || null);

  const isConfigured = Boolean(
    form.designatedWorkerSsm &&
    form.firstAidResponder &&
    form.psiResponder &&
    form.investigationMembers &&
    form.decisionsDate
  );

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designatedWorkerSsm: form.designatedWorkerSsm,
          firstAidResponder: form.firstAidResponder,
          psiResponder: form.psiResponder,
          investigationMembers: form.investigationMembers,
          decisionsDate: form.decisionsDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la salvarea deciziilor.');
      }

      setSaveSuccess(true);
      setIsEditing(false);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare necunoscută la salvare.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Ensure latest form values are persisted first
      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designatedWorkerSsm: form.designatedWorkerSsm,
          firstAidResponder: form.firstAidResponder,
          psiResponder: form.psiResponder,
          investigationMembers: form.investigationMembers,
          decisionsDate: form.decisionsDate || null,
        }),
      });

      // 2. Trigger generation of template decizii-angajator
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'decizii-angajator',
          clientId: clientId,
          operatorName: 'Operator Intern',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la generarea pachetului de decizii.');
      }

      setDownloadUrl(data.downloadUrl);
      setGeneratedDate(new Date().toLocaleDateString('ro-RO'));

      // 3. Initiate direct browser download
      window.location.href = data.downloadUrl;
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la generare.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateRo = (isoDate: string | null) => {
    if (!isoDate) return '—';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
      return new Date(isoDate).toLocaleDateString('ro-RO');
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 1. Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/75 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Decizii Organizatorice SSM & Situații de Urgență (01–09)
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {isConfigured ? 'Numiri Complete' : 'Configurare Parțială'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Numiri statutare conform Legii 319/2006 (art. 8, 10, 26) și Legii 307/2006 (art. 19).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editează Numiri</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setForm({
                  designatedWorkerSsm: initialData.designatedWorkerSsm || '',
                  firstAidResponder: initialData.firstAidResponder || '',
                  psiResponder: initialData.psiResponder || '',
                  investigationMembers: initialData.investigationMembers || '',
                  decisionsDate: initialData.decisionsDate || '',
                });
                setIsEditing(false);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Anulează</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Se generează DOCX...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Generează Pachet Decizii 01–09 (DOCX)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Numirile organizatorice au fost salvate cu succes!</span>
        </div>
      )}

      {/* 3. Content Body (View Mode vs Edit Mode) */}
      <div className="p-6">
        {!isEditing ? (
          /* View Mode Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Data decizii */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Data Emiterii Deciziilor</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {formatDateRo(form.decisionsDate)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Tipărită pe toate deciziile (01–09 & 11)
              </div>
            </div>

            {/* Lucrător desemnat SSM */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold">Lucrător Desemnat SSM</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.designatedWorkerSsm || <span className="text-slate-400 italic">Nedesemnat</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Decizia 02 • Legea 319/2006 art. 8
              </div>
            </div>

            {/* Responsabil Prim Ajutor */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold">Responsabil Prim Ajutor</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.firstAidResponder || <span className="text-slate-400 italic">Nedesemnat</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Decizia 03 • Legea 319/2006 art. 10
              </div>
            </div>

            {/* Responsabil PSI */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold">Responsabil / Cadru Tehnic PSI</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.psiResponder || <span className="text-slate-400 italic">Nedesemnat</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Deciziile 06, 08 & 09 • Legea 307/2006
              </div>
            </div>

            {/* Comisie cercetare */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50 md:col-span-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Users2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold">Comisie Cercetare Evenimente & Accidente</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.investigationMembers || <span className="text-slate-400 italic">Nedesemnată</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Decizia 06 • Legea 319/2006 art. 26–29 (min. 2–3 persoane)
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data Emiterii */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Emiterii Deciziilor *
                </label>
                <input
                  type="date"
                  value={form.decisionsDate}
                  onChange={(e) => setForm({ ...form, decisionsDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Lucrător desemnat SSM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lucrător Desemnat SSM (Decizia 02) *
                </label>
                <div className="space-y-1.5">
                  <select
                    value={activeEmployees.some((e) => e.fullName === form.designatedWorkerSsm) ? form.designatedWorkerSsm : ''}
                    onChange={(e) => {
                      if (e.target.value) setForm({ ...form, designatedWorkerSsm: e.target.value });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Selectează din salariați --</option>
                    {initialData.legalRepresentative && (
                      <option value={initialData.legalRepresentative}>
                        {initialData.legalRepresentative} (Administrator / Reprezentant Legal)
                      </option>
                    )}
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.fullName}>
                        {emp.fullName} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.designatedWorkerSsm}
                    onChange={(e) => setForm({ ...form, designatedWorkerSsm: e.target.value })}
                    placeholder="Sau introdu manual numele lucrătorului desemnat..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Responsabil Prim Ajutor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsabil Prim Ajutor (Decizia 03) *
                </label>
                <select
                  value={form.firstAidResponder}
                  onChange={(e) => setForm({ ...form, firstAidResponder: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Alege salariat activ --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>
                      {emp.fullName} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                    </option>
                  ))}
                </select>
                {!activeEmployees.some((e) => e.fullName === form.firstAidResponder) && form.firstAidResponder && (
                  <input
                    type="text"
                    value={form.firstAidResponder}
                    onChange={(e) => setForm({ ...form, firstAidResponder: e.target.value })}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Responsabil PSI */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsabil / Cadru Tehnic PSI (Decizia 06, 09) *
                </label>
                <select
                  value={form.psiResponder}
                  onChange={(e) => setForm({ ...form, psiResponder: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Alege salariat activ --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>
                      {emp.fullName} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                    </option>
                  ))}
                </select>
                {!activeEmployees.some((e) => e.fullName === form.psiResponder) && form.psiResponder && (
                  <input
                    type="text"
                    value={form.psiResponder}
                    onChange={(e) => setForm({ ...form, psiResponder: e.target.value })}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Comisie Cercetare */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comisie Cercetare Evenimente & Accidente (Decizia 06) *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.investigationMembers}
                    onChange={(e) => setForm({ ...form, investigationMembers: e.target.value })}
                    placeholder="Ex: Gheorghe Barbu, Elena Vasilescu, Ion Popescu (separate prin virgulă)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {activeEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 self-center mr-1">Adaugă rapid:</span>
                      {activeEmployees.slice(0, 6).map((emp) => {
                        const isIncluded = form.investigationMembers
                          .split(',')
                          .map((s) => s.trim())
                          .includes(emp.fullName);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              const current = form.investigationMembers
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              if (isIncluded) {
                                setForm({
                                  ...form,
                                  investigationMembers: current.filter((n) => n !== emp.fullName).join(', '),
                                });
                              } else {
                                setForm({
                                  ...form,
                                  investigationMembers: [...current, emp.fullName].join(', '),
                                });
                              }
                            }}
                            className={`text-[11px] px-2 py-0.5 rounded border transition ${
                              isIncluded
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isIncluded ? `✓ ${emp.fullName}` : `+ ${emp.fullName}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salvează Numirile</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Footer Generation Info */}
      <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {generatedDate ? (
              <>Ultimul pachet emis: <strong className="text-slate-700">{generatedDate}</strong></>
            ) : (
              'Niciun pachet de decizii emis încă pentru acest client.'
            )}
          </span>
        </div>

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descarcă Ultimul DOCX Emis</span>
          </a>
        )}
      </div>
    </div>
  );
}
```

---

### 3.3 Integration into `src/app/clients/[id]/page.tsx`

Import and mount `OrganizationalDecisionsCard` right between the Stats Counter and the Employee Register:

```tsx
// At top of src/app/clients/[id]/page.tsx:
import { OrganizationalDecisionsCard } from '@/components/organizational-decisions-card';

// Inside ClientDetailPage component:
const activeEmployeeOptions = activeEmployees.map((e) => ({
  id: e.id,
  fullName: `${e.lastName} ${e.firstName}`,
  jobTitle: e.currentJob?.title,
}));

const lastDeciziiDoc = client.generatedDocuments.find(
  (d) => d.template.code === 'decizii-angajator'
);

// In JSX, right after Section 3 (Stats Counter) and before Section 4 (Registru Salariați):
{/* 3.5 Organizational Decisions Manager (01-09) */}
<OrganizationalDecisionsCard
  clientId={client.id}
  initialData={{
    designatedWorkerSsm: client.designatedWorkerSsm,
    firstAidResponder: client.firstAidResponder,
    psiResponder: client.psiResponder,
    investigationMembers: client.investigationMembers,
    decisionsDate: client.decisionsDate ? client.decisionsDate.toISOString().split('T')[0] : null,
    legalRepresentative: client.legalRepresentative,
  }}
  activeEmployees={activeEmployeeOptions}
  lastGeneratedDate={lastDeciziiDoc?.createdAt ? new Date(lastDeciziiDoc.createdAt).toLocaleDateString('ro-RO') : null}
  lastGeneratedDocId={lastDeciziiDoc?.id || null}
/>
```

---

## 4. Caveats

1. **Unregistered Employees (New Client Intake)**:  
   When a company is first registered before importing the employee roster, `activeEmployees` will be empty. The design accounts for this by providing a manual text input fallback for every appointee and allowing the legal representative to act as the designated worker (`client.legalRepresentative`).
2. **Investigation Committee Size**:  
   Under Romanian law (HG 1425/2006 art. 115), accident investigation commissions must comprise at least 3 persons for medium/large enterprises, or 2 persons for microenterprises. The multi-select tag helper makes it simple to pick multiple employees while keeping the database representation as a clean comma-separated string (`investigationMembers`).
3. **No Signature / Simple Workflow (R3)**:  
   Per requirement R3, electronic signatures and multi-stage approval workflows are deliberately omitted. The generated DOCX is marked `approved_for_print` and ready for paper execution.

---

## 5. Conclusion

1. **Complete Database Readiness**: All required appointee fields exist on `Client` and map directly to `src/lib/templates/resolver.ts`.
2. **Verified Zero-Placeholder Output**: Programmatic generation of `decizii-angajator` has been executed on the production engine, producing zero unmapped tokens and zero missing fields (`approved_for_print`).
3. **Clean Architecture**: Decoupling the manager into a client component `OrganizationalDecisionsCard` and creating `src/app/api/clients/[id]/route.ts` with `GET` and `PATCH` delivers an intuitive, fast, and robust experience for managing decisions and generating the complete 01–09 DOCX bundle.

---

## 6. Verification Method

To independently verify the implementation once executed by the implementing agent:

1. **Verify `npm run build`**:
   ```bash
   npm run build
   ```
   Must succeed with 0 errors, registering `/api/clients/[id]` as dynamic.

2. **Verify PATCH update on client appointees**:
   ```bash
   npx tsx -e "
   fetch('http://localhost:3000/api/clients/<CLIENT_ID>', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       designatedWorkerSsm: 'Ing. Test Lucrator',
       firstAidResponder: 'As. Test Prim Ajutor',
       psiResponder: 'Tehn. Test PSI',
       investigationMembers: 'Membru 1, Membru 2',
       decisionsDate: '2026-02-01'
     })
   }).then(r => r.json()).then(console.log);
   "
   ```

3. **Verify Zero-Placeholder Document Generation**:
   ```bash
   npx tsx -e "
   import { prisma } from './src/lib/prisma';
   import { resolveTemplatePlaceholders } from './src/lib/templates/resolver';
   import { generateDocument } from './src/lib/templates/generator';

   async function verify() {
     const client = await prisma.client.findFirst({ where: { cui: 'RO38765432' } });
     const { resolvedData } = await resolveTemplatePlaceholders({
       templateCode: 'decizii-angajator',
       clientId: client.id
     });
     const res = await generateDocument({
       templateCode: 'decizii-angajator',
       clientId: client.id,
       data: resolvedData,
       operatorName: 'Operator Intern'
     });
     console.log('Result:', { status: res.status, missingFields: res.missingFields });
     if (res.missingFields.length > 0) throw new Error('Failed: Missing fields');
   }
   verify().then(() => prisma.\$disconnect());
   "
   ```
   Must print `status: 'approved_for_print'`, `missingFields: []`.

4. **Verify Verification Suite**:
   ```bash
   npx tsx scripts/verify-all.ts
   ```
