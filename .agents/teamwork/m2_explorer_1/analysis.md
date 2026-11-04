# Analysis: Employee Registry Compliance UI Strategy (`/employees`)

**Milestone**: M2 — Compliance UI Tracking & Alerts  
**Author**: Explorer 1 (`.agents/teamwork/m2_explorer_1/`)  
**Target File**: `src/app/employees/page.tsx` & `src/components/compliance-badge.tsx`  
**Date**: 2026-11-01  

---

## 1. Executive Summary

This report establishes the complete user interface strategy for compliance deadline tracking in the centralized employee registry (`/employees`). 

Currently, `src/app/employees/page.tsx` renders a basic table showing biographical information (Name, Client, Masked CNP, Job, Worksite, Hire Date, Active/Inactive status, and Document generation links), but **completely lacks compliance tracking columns, legal deadline indicators, status badges, and conformity-based filtering**.

Following Romanian occupational safety legislation (HG 355/2007 for Occupational Medicine, Legea 319/2006 & HG 1425/2006 for SSM, Legea 307/2006 & OMAI 712/2005 for PSI/SU, and Ordinul MS/ME 2209/4469/2022 for Hygiene) and the deterministic calculations in `src/lib/compliance.ts`, this document defines:
1. **Four dedicated legal compliance columns** (Medicină a Muncii, Instruire SSM, Instruire PSI/SU, Cursuri de Igienă) plus an **Overall Conformity column**.
2. **Standardized visual status badges**: `VALID` (Emerald), `UPCOMING` (Amber with days remaining), `OVERDUE` (Red with days overdue), `MISSING` (Rose alert for unrecorded data), and `N/A` (Neutral slate for jobs not requiring hygiene).
3. **Interactive status filtering tabs with live counters** (`Toți`, `Conformi`, `Scadenți curând`, `Termene depășite`, `Date lipsă`), instant search, and client filtering.
4. **Deep-linking URL parameter synchronization** (`?status=OVERDUE`, `?status=UPCOMING`) enabling one-click drill-downs directly from executive dashboard alert cards.
5. **Strict adherence to R3**: Zero user roles, zero permission hierarchies, and zero electronic signatures.

---

## 2. Current State Analysis (`src/app/employees/page.tsx`)

### 2.1 Code Inspection

`src/app/employees/page.tsx` is an async Next.js 16 Server Component (`export const dynamic = 'force-dynamic';`). It queries Prisma:

```typescript
const employees = await prisma.employee.findMany({
  orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
  include: {
    client: true,
    currentJob: true,
    currentWorksite: true,
    identityDocument: true,
  },
});
```

### 2.2 Critical Gaps Identified
1. **Compliance Fields Ignored**: Even though `prisma.employee.findMany` with `include` fetches all scalar fields on `Employee` (including `medicalLastExamDate`, `ssmLastTrainingDate`, `psiLastTrainingDate`, `hygieneLastExamDate`, `medicalFitnessVerdict`, intervals, etc.), none of these fields are displayed or evaluated.
2. **Zero Visibility of Expirations**: A company manager or SSM inspector has no way of knowing whether an employee's medical fitness certificate or periodic SSM/PSI training is valid, expiring within 30 days, or already expired.
3. **No Filtering or Segmentation**: The page renders all employees in a single unfilterable list. There are no tabs or status filters to isolate employees with expired or imminent deadlines.
4. **Table Density & Horizontal Space**: The table currently allocates individual columns to `CNP (GDPR Mascat)`, `Punct de Lucru`, `Data Angajării`, and `Status (ACTIV/PLECAT)`. Adding 5 new compliance columns without optimizing layout would result in 13 columns, causing horizontal overflow and decreased readability.

---

## 3. Compliance Data Integration & Calculation Architecture

### 3.1 Leverage Deterministic Compliance Engine (`src/lib/compliance.ts`)

`src/lib/compliance.ts` (verified with 45/45 automated unit tests in Milestone 1) already exposes:
- `calculateEmployeeCompliance(employee, referenceDate?)`: Evaluates all 4 legal dimensions and calculates `overallStatus` using legal hierarchy (`OVERDUE` > `MISSING` > `UPCOMING` > `VALID`).
- `calculateCompanyMetrics(employees, referenceDate?)`: Returns aggregated metrics (`complianceScorePercent`, `validCount`, `upcomingCount`, `overdueCount`, `missingCount`).
- `formatRoDate(date)`: Deterministic DD.MM.YYYY Romanian formatter immune to SSR hydration mismatches.
- `getStatusBadgeInfo(status, daysRemaining)`: Provides exact Tailwind CSS classes and Romanian localized text.
- `getOverallStatusBadgeInfo(status)`: Localized overall labels (`CONFORM`, `SCADENȚĂ IMINENTĂ`, `EXPIRAT / NECONFORM`, `DATE LIPSĂ`).

### 3.2 Data Pipeline

```
[Prisma DB] 
    │
    ▼
[Server Component: src/app/employees/page.tsx]
    │  - Fetches employees with client, currentJob, currentWorksite, identityDocument
    │  - Calls calculateEmployeeCompliance(emp) per employee
    │  - Calculates summary counts: Total, Valid, Upcoming, Overdue, Missing
    │  - Parses initial URL searchParams (?status=OVERDUE, etc.)
    │
    ▼
[Client Component: src/app/employees/employee-registry-client.tsx]
    │  - Maintains reactive state: activeTab, searchQuery, selectedClientId
    │  - Instant, zero-latency in-memory filtering across all dimensions
    │  - Synchronizes URL query params for bookmarking and back/forward navigation
    │  - Renders KPI Summary Bar, Tabs with Count Badges, and Comprehensive Table
    │
    ▼
[Reusable Badge Components: src/components/compliance-badge.tsx]
    - ComplianceItemBadge (Item level: days remaining, due date, last date)
    - OverallComplianceBadge (Employee rollup status)
```

---

## 4. UI Specification: Columns, Badges, and Layout

### 4.1 Optimized 8-Column Table Layout

To present comprehensive SSM data without horizontal overcrowding, we consolidate biographical information into high-density cells, freeing maximum visual space for compliance monitoring:

| Col # | Header | Primary Content | Secondary / Subtitle Content | Responsive Behavior |
|:---:|:---|:---|:---|:---:|
| 1 | **Salariat & Identitate** | `Nume Prenume` (Bold text) | Masked CNP (`188031541****`), Act CI seria/nr., status pil (`ACTIV`/`PLECAT`) | Always visible |
| 2 | **Angajator & Post** | `Client Name` (Link to `/clients/[id]`) | `Funcție / Post`, `Punct de lucru` | Hidden on mobile (<768px) |
| 3 | **Conformitate Generală** | `<OverallComplianceBadge status={...} />` | Subtext summarizing active alerts (e.g., `Toate avizele la zi` or `2 termene depășite`) | Always visible |
| 4 | **Medicină a Muncii** (HG 355/2007) | `<ComplianceItemBadge item={summary.occupationalMedicine} />` | `Aviz: APT` (Green) / `APT CONDIȚIONAT` (Amber) + `Scadent: DD.MM.YYYY` | Always visible |
| 5 | **Instruire SSM** (L319/2006) | `<ComplianceItemBadge item={summary.ssmTraining} />` | `Periodic (X luni)` + `Scadent: DD.MM.YYYY` | Always visible |
| 6 | **Instruire PSI/SU** (L307/2006) | `<ComplianceItemBadge item={summary.psiTraining} />` | `Periodic (X luni)` + `Scadent: DD.MM.YYYY` | Always visible |
| 7 | **Curs Igienă** (Ord. 2209/2022) | `<ComplianceItemBadge item={summary.hygieneCertificate} />` or `Neaplicabil` | `Certificat: Nr. / Dată` (if applicable) | Hidden on small tablets (<1024px) |
| 8 | **Documente** | Quick generate buttons (`Cerere`, `Declarație`, `CIM`) | Link to `/documents/generate` with pre-filled employee | Always visible |

### 4.2 Visual Status Badges Specification

Every badge adheres to strict, accessible color psychology and clear typographic hierarchy:

#### A. Individual Compliance Item Badge (`ComplianceItemBadge`)

1. **VALID (> 30 days remaining)**:
   - **Color**: Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
   - **Label**: `VALID (Xz)` (e.g., `VALID (226z)`)
   - **Icon**: `CheckCircle2` (w-3 h-3)
   - **Subtext**: `Scadent: 15.06.2027` (slate-500) • `Ultimul: 15.06.2026` (slate-400)

2. **UPCOMING (0 to 30 days remaining — Action Required Soon)**:
   - **Color**: Amber (`bg-amber-50 text-amber-700 border-amber-200 font-medium`)
   - **Label**: `SCADENT (Xz)` or `SCADENT AZI`
   - **Icon**: `Clock` (w-3 h-3)
   - **Subtext**: `Scadent: 14.11.2026` (amber-600 font-semibold)

3. **OVERDUE (< 0 days — Critical Legal Non-Conformity)**:
   - **Color**: Red (`bg-red-50 text-red-700 border-red-200 font-bold`)
   - **Label**: `EXPIRAT (Xz)` (e.g., `EXPIRAT (83z)`)
   - **Icon**: `AlertTriangle` (w-3 h-3)
   - **Subtext**: `Expirat la: 10.08.2026` (red-600 font-semibold)

4. **MISSING (Unrecorded Date / No Exam on File)**:
   - **Color**: Rose (`bg-rose-100 text-rose-800 border-rose-300 font-bold`)
   - **Label**: `NEÎNREGISTRAT`
   - **Icon**: `HelpCircle` or `AlertCircle` (w-3 h-3)
   - **Subtext**: `Niciun examen consemnat` (rose-600)

5. **NOT APPLICABLE (e.g., Hygiene for IT/TESA employees)**:
   - When `hygieneCertificate === null` (employee does not have `hygieneRequested` and has no hygiene exam on file):
   - **Color**: Slate (`text-slate-400 font-medium text-[11px]`)
   - **Label**: `Neaplicabil` (or `—`)
   - **Subtext**: `Postul nu necesită curs igienă`

#### B. Overall Employee Compliance Badge (`OverallComplianceBadge`)

Evaluated by `summary.overallStatus`:
- `VALID`: `CONFORM` (`bg-emerald-50 text-emerald-700 border border-emerald-200`)
- `UPCOMING`: `SCADENȚĂ IMINENTĂ` (`bg-amber-50 text-amber-700 border border-amber-200 font-medium`)
- `OVERDUE`: `EXPIRAT / NECONFORM` (`bg-red-50 text-red-700 border border-red-200 font-bold`)
- `MISSING`: `DATE LIPSĂ` (`bg-rose-100 text-rose-800 border border-rose-300 font-bold`)

---

## 5. Interactive Filtering, Tab Architecture & URL Synchronization

### 5.1 Status Tabs with Dynamic Counters

Positioned above the registry table:
1. **Toți** — Shows all employees. Counter: `(totalEmployees)`.
2. **Conformi** — Filters `overallStatus === 'VALID'`. Counter: `(validCount)`. Green pill badge.
3. **Scadenți curând** — Filters `overallStatus === 'UPCOMING'`. Counter: `(upcomingCount)`. Amber pill badge.
4. **Termene depășite** — Filters `overallStatus === 'OVERDUE'`. Counter: `(overdueCount)`. Red pill badge.
5. **Date lipsă** — Filters `overallStatus === 'MISSING'`. Counter: `(missingCount)`. Rose pill badge.

### 5.2 Real-Time Search & Client Filtering

Alongside status tabs:
- **Search Input (`Search` icon)**: Filters in real time (debounced or instant on each keystroke) against:
  - Employee First & Last Name
  - Masked or raw CNP
  - Job Title (`currentJob.title`)
  - Worksite Name (`currentWorksite.name`)
  - Employer Name (`client.name`)
- **Client Dropdown Filter**: `<select>` containing all distinct client companies (`Toate companiile`, `Nexus Solutions S.R.L.`, etc.), allowing multi-company management without leaving the page.

### 5.3 Deep-Linking & Dashboard Interoperability

When an executive clicks an alert card on the Dashboard (Milestone 2 Explorer 2):
- Dashboard button `[Vezi 3 salariați cu termene depășite]` links to `/employees?status=OVERDUE`.
- Dashboard button `[Vezi 2 salariați scadenți curând]` links to `/employees?status=UPCOMING`.
- Dashboard button `[Completează dosare incomplete]` links to `/employees?status=MISSING`.

`EmployeeRegistryClient` initializes `activeTab` from `initialStatus` (passed by Server Component) and URL `useSearchParams()`. When a user switches tabs, `window.history.replaceState` or `router.replace` keeps the URL synchronized without triggering an unnecessary server reload.

### 5.4 KPI Summary Bar

At the top of the employee registry page, render a compact 4-card metric strip:
- **Total Salariați**: Total count (e.g., `6 angajați`).
- **Conformitate SSM**: Global compliance percentage (`83.3%`).
- **Termene Depășite**: Red counter showing number of overdue items.
- **Scadențe Iminente (≤ 30z)**: Amber counter showing upcoming requirements.

---

## 6. Implementation Architecture

### 6.1 Component Hierarchy

```
src/
├── app/
│   └── employees/
│       ├── page.tsx                     # Server Component (fetches DB, calculates compliance)
│       └── employee-registry-client.tsx # Client Component (filtering, tabs, search, table)
└── components/
    └── compliance-badge.tsx             # Shared Reusable Badge components
```

### 6.2 Interface Contracts

#### `src/components/compliance-badge.tsx`
```typescript
import { ComplianceItemResult, ComplianceStatus } from '@/lib/compliance';

export interface ComplianceItemBadgeProps {
  item: ComplianceItemResult | null;
  showDueDate?: boolean;
  className?: string;
}

export interface OverallComplianceBadgeProps {
  status: ComplianceStatus;
  size?: 'sm' | 'md';
  className?: string;
}
```

#### `src/app/employees/employee-registry-client.tsx`
```typescript
export interface EmployeeWithCompliance {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string;
  status: string; // ACTIV / PLECAT
  hireDate: string | null;
  client: { id: string; name: string };
  currentJob: { id: string; title: string } | null;
  currentWorksite: { id: string; name: string } | null;
  identityDocument: { docType: string; series: string | null; number: string } | null;
  compliance: {
    overallStatus: ComplianceStatus;
    occupationalMedicine: ComplianceItemResult;
    ssmTraining: ComplianceItemResult;
    psiTraining: ComplianceItemResult;
    hygieneCertificate: ComplianceItemResult | null;
    fitnessVerdict: string | null;
  };
}

export interface EmployeeRegistryClientProps {
  employees: EmployeeWithCompliance[];
  initialStatus?: string;
  clients: { id: string; name: string }[];
}
```

### 6.3 Empty State Handling
When filters produce zero results (e.g. no overdue employees):
- Render a positive feedback banner:
  ```tsx
  <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
    <h3 className="text-sm font-semibold text-slate-800">
      Niciun salariat în categoria selectată
    </h3>
    <p className="text-xs text-slate-500 mt-1">
      Toate dosarele respectă criteriile aplicate.
    </p>
    <button onClick={resetFilters} className="mt-3 text-xs text-blue-600 hover:underline">
      Resetează filtrele
    </button>
  </div>
  ```

---

## 7. Compliance with System Constraints (R3)

- **No User Roles**: The registry, compliance badges, and quick document actions are fully available to any user without role barriers (`admin`, `manager`, etc.).
- **No Permissions Hierarchy**: No hidden columns or disabled features based on user clearance.
- **No Electronic Signatures**: Document buttons trigger direct download/generation (`/documents/generate`), not a multi-step signature or approval flow.

---

## 8. Summary & Worker Action Plan

1. **Worker Task 1**: Create `src/components/compliance-badge.tsx` implementing `ComplianceItemBadge` and `OverallComplianceBadge` with tooltips, days remaining, and status colors.
2. **Worker Task 2**: Create `src/app/employees/employee-registry-client.tsx` with tabs, search, company filter, KPI bar, and the 8-column compliance table.
3. **Worker Task 3**: Update `src/app/employees/page.tsx` to call `calculateEmployeeCompliance(emp)` and pass structured data to `EmployeeRegistryClient`.
4. **Verification**: Run `npm run build` and `npx tsx scripts/verify-compliance.ts` to confirm 100% clean builds and functional parity.
