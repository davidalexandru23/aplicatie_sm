# Raport de Analiză Tehnică și Design Arhitectural: Milestone 2 (Explorer 3)
## Pagina Detaliu Client (`src/app/clients/[id]/page.tsx`) și Componentele Reutilizabile de Badge (`src/components/compliance-badge.tsx`)

**Autor:** Explorer 3 (Milestone 2: Compliance UI Tracking & Alerts)  
**Data:** 2026-11-01  
**Status:** FINALIZAT / GATA PENTRU IMPLEMENTARE  
**Proiect:** Sistem Automatizat de Documente SSM & Urmărire Scadențe Conformitate Salariați  

---

## 1. Rezumat Executiv

Prezentul raport oferă strategia completă de proiectare arhitecturală și UI pentru două componente critice ale Milestone 2:
1. **Componenta UI Universală Reutilizabilă (`src/components/compliance-badge.tsx`)**:
   - Furnizează o suită coerentă de badge-uri, indicatoare de scadență și contoare pentru întregul sistem (utilizabilă în pagina clientului, registrul general al angajaților `/employees` și panoul principal `/`).
   - Suportă atât elemente individuale de conformitate (`ComplianceItemResult`), cât și starea generală agregată a salariatului (`EmployeeComplianceSummary`).
   - Include tooltip-uri pur CSS (Tailwind) și subtexte explicative cu zilele rămase/depășite (`Scadent în 14 zile`, `Depășit cu 83 zile`, `Valabil`, `Neînregistrat`), garantând **100% compatibilitate SSR cu React 19 și Next.js 16 App Router** fără dependențe externe grele și fără riscuri de discrepanță la hidratare (zero hydration mismatch).
2. **Modernizarea Paginii Clientului (`src/app/clients/[id]/page.tsx`)**:
   - Transformă dosarul de client dintr-un simplu afișaj administrativ într-un veritabil **Centru de Comandă și Monitorizare a Conformității SSM**.
   - Integrează indicatorul de scor al companiei (Compliance Score Gauge: ex. `82.4%`), grila de distribuție pe stări (Valabile, Scadente, Expirate, Lipsă date) și panoul de alertă prioritară.
   - Extinde tabelul de salariați al clientului cu coloane inline de conformitate pentru toate cele 4 dimensiuni legale (Medicină a Muncii, SSM, PSI/SU, Cursuri Igienă).
   - Menține fidelitatea deplină față de cerința **R3**: simplitate operațională maximă, fără roluri, permisiuni sau semnături electronice. Toate textele sunt redactate în limba română profesională.

---

## 2. Analiza Stării Curente a Codului

### 2.1. Inspectarea Fișierului `src/app/clients/[id]/page.tsx`
Fișierul existent are 370 de linii și este implementat ca un React Server Component (`export const dynamic = 'force-dynamic'`):
- **Date încărcate**: Interoghează `prisma.client.findUnique` cu relațiile `worksites`, `jobs`, `employees` (inclusiv `currentJob`, `currentWorksite`, `identityDocument`, `residenceAddress`), `generatedDocuments` și `riskAssessments`.
- **Beneficiu arhitectural identificat**: Modelul `Employee` din Prisma a fost deja extins în Milestone 1 cu toate câmpurile de conformitate (`medicalLastExamDate`, `medicalIntervalMonths`, `ssmLastTrainingDate`, `ssmIntervalMonths`, `psiLastTrainingDate`, `psiIntervalMonths`, `hygieneRequested`, `hygieneLastExamDate`, etc.). Întrucât interogarea existentă folosește `include: { employees: { ... } }` fără filtru `select`, **toate datele necesare calculului de conformitate sunt deja aduse din baza de date**. Nu este nevoie de niciun query SQL suplimentar!
- **Lacune identificate**:
  1. *Lipsa metricilor de conformitate ale firmei*: În prezent se afișează doar numărul total de angajați și puncte de lucru, dar lipsește procentul de conformitate legală (`complianceScorePercent`) și numărul de alerte active.
  2. *Tabelul de angajați este strict administrativ*: Coloanele curente sunt `Nume & Prenume`, `CNP (Mascat)`, `Funcție / Post`, `Punct de Lucru`, `Data Angajării`, `Curs Igienă` (care arată doar text static `SOLICITAT / Nu`), `Status` (`ACTIV / PLECAT`) și `Acțiuni Documente`. Nu există nicio vizibilitate asupra valabilității examenului medical sau a instruirilor periodice SSM/PSI.
  3. *Lipsa avertizărilor de urgență*: Angajatorul nu are nicio modalitate vizuală de a identifica imediat dacă are salariați cu avize expirate sau fără fișe medicale.

### 2.2. Capacitățile Motorului `src/lib/compliance.ts`
Motorul finalizat în Milestone 1 oferă deja funcțiile deterministe:
- `calculateItemCompliance(lastDate, intervalMonths, label, refDate)` -> returnează `ComplianceItemResult`.
- `calculateEmployeeCompliance(employee, refDate)` -> returnează `EmployeeComplianceSummary` (cu ierarhia de prioritate `OVERDUE` > `MISSING` > `UPCOMING` > `VALID`).
- `calculateCompanyMetrics(employees, refDate)` -> returnează `CompanyComplianceMetrics`.
- `formatRoDate(date)` -> formatare deterministă `DD.MM.YYYY` sigură pentru SSR.
- `getStatusBadgeInfo(status, daysRemaining)` și `getOverallStatusBadgeInfo(status)`.

Testele unitare din `scripts/verify-compliance.ts` trec în proporție de **100% (45 din 45 teste)**, confirmând stabilitatea matematică și a pragurilor.

---

## 3. Designul Arhitectural al Componentei Reutilizabile `src/components/compliance-badge.tsx`

Componenta `compliance-badge.tsx` trebuie să devină piesa centrală de afișare a stării de conformitate pentru toate ecranele aplicației.

### 3.1. Cerințe Cheie de Design
1. **Suport Polimorfic pentru Date**:
   - Suportă pasarea unui obiect `ComplianceItemResult` complet.
   - Suportă pasarea de proprietăți atomice (`status`, `daysRemaining`, `dueDate`, `lastDate`, `label`).
   - Suportă starea generală agregată (`EmployeeComplianceSummary` sau `status: ComplianceStatus`).
2. **Subtext și Tooltip-uri Informative**:
   - Afișează numărul de zile până la scadență sau depășirea înregistrată.
   - Furnizează un tooltip detaliat la hover (cu data ultimului examen, data scadenței și intervalul normativ).
3. **100% Compatibilitate SSR (React 19 & Next.js 16)**:
   - Tooltip-urile sunt implementate prin clase pur CSS Tailwind (`group relative`, `opacity-0 group-hover:opacity-100 transition-opacity`, `pointer-events-none`) cu atribut nativ `title` ca fallback pentru accesibilitate completă (ARIA și screen readers).
   - Componenta este un **Server Component** (nu necesită directiva `'use client'`), reducând bundle-ul de JavaScript pe client la zero și prevenind orice discrepanță de hidratare (hydration mismatch).
   - Formatarea datelor folosește `formatRoDate()` din `@/lib/compliance`, care este pur deterministă și imună la setările locale ale browserului sau serverului.
4. **Paletă Cromatică Standardizată (HG 355/2007 & Legea 319/2006)**:
   - **VALID** (Emerald): `bg-emerald-50 text-emerald-700 border-emerald-200`
   - **UPCOMING** (Amber): `bg-amber-50 text-amber-700 border-amber-200`
   - **OVERDUE** (Red): `bg-red-50 text-red-700 border-red-200 font-semibold`
   - **MISSING** (Rose): `bg-rose-100 text-rose-800 border-rose-300 font-bold`

### 3.2. Arhitectura Interfețelor și Componentelor Exportate

Fisierul `src/components/compliance-badge.tsx` va exporta următoarele 5 componente specializate:

```typescript
// 1. Badge pentru o cerință individuală (Medicină, SSM, PSI, Igienă)
export function ComplianceItemBadge(props: ComplianceItemBadgeProps): JSX.Element;

// 2. Badge pentru starea generală agregată a salariatului (CONFORM, SCADENȚĂ IMINENTĂ, etc.)
export function OverallComplianceBadge(props: OverallComplianceBadgeProps): JSX.Element;

// 3. Indicator vizual de scor pentru companie (Gauge / Procentaj circular sau liniar)
export function ComplianceScoreBadge(props: ComplianceScoreBadgeProps): JSX.Element;

// 4. Pastile sintetice de distribuție (Valabile, Scadente, Expirate, Lipsă)
export function ComplianceBreakdownPills(props: ComplianceBreakdownProps): JSX.Element;

// 5. Card de alertă urgentă pentru antetul paginii
export function ComplianceAlertBanner(props: ComplianceAlertBannerProps): JSX.Element | null;
```

---

## 4. Specificația Completă a Codului: `src/components/compliance-badge.tsx`

Iată implementarea completă, gata de utilizare:

```tsx
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Stethoscope,
  Sparkles,
  Award
} from 'lucide-react';
import { 
  ComplianceStatus, 
  ComplianceItemResult, 
  EmployeeComplianceSummary,
  CompanyComplianceMetrics,
  formatRoDate 
} from '@/lib/compliance';

// ============================================================================
// 1. CONFIGURAȚII DE STIL ȘI TEXTE STANDARDIZATE ÎN LIMBA ROMÂNĂ
// ============================================================================

const STATUS_CONFIG: Record<
  ComplianceStatus, 
  {
    label: string;
    badgeClasses: string;
    dotClass: string;
    icon: React.ComponentType<{ className?: string }>;
    overallLabel: string;
  }
> = {
  VALID: {
    label: 'VALID',
    badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2,
    overallLabel: 'CONFORM',
  },
  UPCOMING: {
    label: 'SCADENT',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-medium',
    dotClass: 'bg-amber-500',
    icon: Clock,
    overallLabel: 'SCADENȚĂ IMINENTĂ',
  },
  OVERDUE: {
    label: 'EXPIRAT',
    badgeClasses: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-semibold',
    dotClass: 'bg-red-500',
    icon: AlertTriangle,
    overallLabel: 'DEPĂȘIT / EXPIRAT',
  },
  MISSING: {
    label: 'NEÎNREGISTRAT',
    badgeClasses: 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-bold',
    dotClass: 'bg-rose-600',
    icon: AlertCircle,
    overallLabel: 'DATE LIPSĂ',
  },
};

// ============================================================================
// 2. COMPLIANCE ITEM BADGE (Medicină, SSM, PSI, Igienă)
// ============================================================================

export interface ComplianceItemBadgeProps {
  item?: ComplianceItemResult | null;
  status?: ComplianceStatus;
  daysRemaining?: number | null;
  dueDate?: Date | string | null;
  lastDate?: Date | string | null;
  intervalMonths?: number;
  label?: string;
  size?: 'sm' | 'md';
  showSubtext?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function ComplianceItemBadge({
  item,
  status: propStatus,
  daysRemaining: propDaysRemaining,
  dueDate: propDueDate,
  lastDate: propLastDate,
  intervalMonths: propIntervalMonths,
  label: propLabel,
  size = 'sm',
  showSubtext = false,
  showIcon = true,
  className = '',
}: ComplianceItemBadgeProps) {
  // Extrage valorile fie din `item`, fie din proprietăți directe
  const status = item?.status ?? propStatus ?? 'MISSING';
  const days = item?.daysRemaining ?? propDaysRemaining ?? null;
  const dueDate = item?.dueDate ?? propDueDate ?? null;
  const lastDate = item?.lastDate ?? propLastDate ?? null;
  const interval = item?.intervalMonths ?? propIntervalMonths ?? null;
  const label = item?.label ?? propLabel ?? 'Element';

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Calcul text principal din badge
  let badgeText = config.label;
  if (status === 'VALID' && days !== null) {
    badgeText = `${config.label} (${days}z)`;
  } else if (status === 'UPCOMING') {
    badgeText = days === 0 ? 'SCADENT AZI' : `SCADENT (${days}z)`;
  } else if (status === 'OVERDUE' && days !== null) {
    badgeText = `EXPIRAT (${Math.abs(days)}z)`;
  }

  // Text tooltip descriptiv complet
  let tooltipText = `${label}: `;
  if (status === 'MISSING') {
    tooltipText += 'Nicio examinare/instruire consemnată în sistem.';
  } else if (status === 'OVERDUE') {
    tooltipText += `TERMEN DEPĂȘIT cu ${Math.abs(days ?? 0)} zile! Scadent la: ${formatRoDate(dueDate)}. Ultima efectuare: ${formatRoDate(lastDate)}.`;
  } else if (status === 'UPCOMING') {
    tooltipText += `Atenție: Scadent la ${formatRoDate(dueDate)} (în ${days} zile). Necesită planificare! Ultima efectuare: ${formatRoDate(lastDate)}.`;
  } else {
    tooltipText += `Valabil până la ${formatRoDate(dueDate)} (${days} zile rămase). Ultima efectuare: ${formatRoDate(lastDate)}${interval ? ` (periodicitate ${interval} luni)` : ''}.`;
  }

  const isSmall = size === 'sm';

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      {/* Container cu tooltip CSS hover fără JavaScript pe client */}
      <div 
        className="group relative inline-flex items-center"
        title={tooltipText} // Accesibilitate nativă
      >
        <span
          className={`inline-flex items-center gap-1 rounded border transition-colors cursor-help select-none ${
            isSmall ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          } ${config.badgeClasses}`}
        >
          {showIcon && <Icon className={isSmall ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0'} />}
          <span>{badgeText}</span>
        </span>

        {/* Pure CSS Tooltip (SSR friendly, zero bundle JS) */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 pointer-events-none">
          <div className="bg-slate-900 text-white text-[11px] rounded px-2.5 py-1.5 shadow-lg whitespace-nowrap max-w-xs leading-tight">
            <div className="font-semibold">{label}</div>
            <div className="text-slate-300 mt-0.5">{tooltipText.replace(`${label}: `, '')}</div>
          </div>
          <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
        </div>
      </div>

      {/* Subtext opțional cu data scadenței */}
      {showSubtext && (
        <span className="text-[10px] text-slate-500 mt-0.5 block truncate max-w-[120px]">
          {dueDate ? `Scadent: ${formatRoDate(dueDate)}` : 'Fără dată'}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// 3. OVERALL COMPLIANCE BADGE (Starea Generală a Salariatului)
// ============================================================================

export interface OverallComplianceBadgeProps {
  summary?: EmployeeComplianceSummary | null;
  status?: ComplianceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OverallComplianceBadge({
  summary,
  status: propStatus,
  size = 'sm',
  className = '',
}: OverallComplianceBadgeProps) {
  const status = summary?.overallStatus ?? propStatus ?? 'MISSING';
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  let sizeClasses = 'text-[10px] px-2 py-0.5';
  let iconSize = 'w-3 h-3';
  if (size === 'md') {
    sizeClasses = 'text-xs px-2.5 py-1';
    iconSize = 'w-3.5 h-3.5';
  } else if (size === 'lg') {
    sizeClasses = 'text-sm px-3 py-1.5 font-bold';
    iconSize = 'w-4 h-4';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase ${sizeClasses} ${config.badgeClasses} ${className}`}
      title={`Statut general conformitate: ${config.overallLabel}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <Icon className={iconSize} />
      <span>{config.overallLabel}</span>
    </span>
  );
}

// ============================================================================
// 4. COMPLIANCE SCORE BADGE & GAUGE (Scorul Companiei)
// ============================================================================

export interface ComplianceScoreBadgeProps {
  scorePercent: number;
  totalItems?: number;
  validCount?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ComplianceScoreBadge({
  scorePercent,
  totalItems,
  validCount,
  size = 'md',
  className = '',
}: ComplianceScoreBadgeProps) {
  const rounded = Math.round(scorePercent * 10) / 10;
  
  let colorStyle = {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
  };
  if (rounded < 70) {
    colorStyle = {
      badge: 'bg-red-50 text-red-800 border-red-200',
      bar: 'bg-red-500',
      text: 'text-red-700',
    };
  } else if (rounded < 90) {
    colorStyle = {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      bar: 'bg-amber-500',
      text: 'text-amber-700',
    };
  }

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${colorStyle.badge} ${className}`}>
        <span>{rounded}%</span>
      </span>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-slate-600">Scor Conformitate Legală:</span>
        <span className={`text-xl font-black tracking-tight ${colorStyle.text}`}>
          {rounded}%
        </span>
      </div>
      
      {/* Bară de progres vizuală */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorStyle.bar}`}
          style={{ width: `${Math.min(Math.max(rounded, 0), 100)}%` }}
        />
      </div>

      {totalItems !== undefined && validCount !== undefined && (
        <div className="text-[10px] text-slate-400 text-right">
          {validCount} din {totalItems} cerințe conforme la zi
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. PASTILE DE DISTRIBUȚIE STATUS (Breakdown Pills)
// ============================================================================

export interface ComplianceBreakdownProps {
  metrics: CompanyComplianceMetrics;
  className?: string;
}

export function ComplianceBreakdownPills({
  metrics,
  className = '',
}: ComplianceBreakdownProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 ${className}`}>
      {/* Valabile */}
      <div className="bg-emerald-50/75 border border-emerald-200 rounded-lg p-2.5 text-center">
        <div className="text-lg font-bold text-emerald-800 leading-none">
          {metrics.validCount}
        </div>
        <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Valabile</span>
        </div>
      </div>

      {/* Scadente curând */}
      <div className="bg-amber-50/75 border border-amber-200 rounded-lg p-2.5 text-center">
        <div className="text-lg font-bold text-amber-800 leading-none">
          {metrics.upcomingCount}
        </div>
        <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Scadente (≤30z)</span>
        </div>
      </div>

      {/* Depășite / Expirate */}
      <div className="bg-red-50/75 border border-red-200 rounded-lg p-2.5 text-center">
        <div className="text-lg font-bold text-red-800 leading-none">
          {metrics.overdueCount}
        </div>
        <div className="text-[11px] text-red-700 font-medium mt-1 flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Expirate</span>
        </div>
      </div>

      {/* Date Lipsă */}
      <div className="bg-rose-50/75 border border-rose-200 rounded-lg p-2.5 text-center">
        <div className="text-lg font-bold text-rose-800 leading-none">
          {metrics.missingCount}
        </div>
        <div className="text-[11px] text-rose-700 font-medium mt-1 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>Date Lipsă</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. COMPLIANCE ALERT BANNER (Avertisment Critic pentru Dosarul Clientului)
// ============================================================================

export interface ComplianceAlertBannerProps {
  metrics: CompanyComplianceMetrics;
  clientName: string;
}

export function ComplianceAlertBanner({
  metrics,
  clientName,
}: ComplianceAlertBannerProps) {
  const hasOverdue = metrics.overdueCount > 0;
  const hasMissing = metrics.missingCount > 0;
  const hasUpcoming = metrics.upcomingCount > 0;

  if (!hasOverdue && !hasMissing && !hasUpcoming) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div className="text-xs text-emerald-800">
          <span className="font-bold">Dosar conform 100%:</span> Toți angajații activi ai firmei {clientName} au examenele medicale și instruirile periodice la zi.
        </div>
      </div>
    );
  }

  if (hasOverdue) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-red-900">
          <div className="font-bold text-sm text-red-800">
            Atenție: {metrics.overdueCount} cerințe legale cu termen depășit!
          </div>
          <p className="mt-1 text-red-700 leading-relaxed">
            Firma {clientName} înregistrează scadențe expirate pentru medicina muncii sau instruiri periodice SSM/PSI. 
            Conform Legii 319/2006 și HG 355/2007, activitatea fără aviz medical valabil constituie contravenție. 
            Planificați de urgență reexaminarea medicală sau re-instruirea salariaților afectați.
          </p>
        </div>
      </div>
    );
  }

  if (hasMissing) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-rose-900">
          <div className="font-bold text-sm text-rose-800">
            Date incomplete: {metrics.missingCount} elemente neînregistrate
          </div>
          <p className="mt-1 text-rose-700 leading-relaxed">
            Pentru anumiți salariați nu au fost consemnate datele ultimului examen medical sau ale instruirii SSM. 
            Completați datele prin import Excel sau editarea fișei salariatului.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="text-xs text-amber-900">
        <span className="font-bold">Scadențe în următoarele 30 de zile:</span> Există {metrics.upcomingCount} examinări sau instruiri care expiră curând. Recomandăm programarea din timp.
      </div>
    </div>
  );
}
```

---

## 5. Modernizarea Paginii `src/app/clients/[id]/page.tsx`

### 5.1. Structura Nouă a Ecrnului
Pagina va fi organizată în 5 secțiuni logice:

1. **Antetul Dosarului de Client (Client Overview Card)**:
   - Denumire, CUI, Reg Com, Reprezentant Legal, Adresă.
   - Badge de activitate client (`CLIENT ACTIV`) + noul **Badge Scor General Firmă**.
   - Butoane rapide: Export Registru Excel, Import/Actualizare Excel, Generează Document.
2. **Panoul de Conformitate SSM & Medicină a Muncii (NOU)**:
   - **Cardul de Alertă Prioritară (`<ComplianceAlertBanner />`)**.
   - **Grila de Metrice de Conformitate**:
     - *Coloana Stângă*: Card mare de Scor (`<ComplianceScoreBadge />`) cu bară vizuală și detalii de sinteză.
     - *Coloana Dreaptă*: Pastilele de distribuție (`<ComplianceBreakdownPills />`: Valabile, Scadente, Expirate, Lipsă).
3. **Contoare Generale (Stats Counter)**:
   - Angajați Activi, Puncte de Lucru, Posturi / Funcții, Documente Emise.
4. **Tabelul Salariaților cu Urmărire Inline a Conformității (NOU)**:
   - Filtre rapide: `Toți salariații`, `Doar Activi`, `Atenție Necesară (Expirate / Scadente / Lipsă)`.
   - Coloane:
     1. `Salariat & Date Identificare` (Nume, CNP mascat, Post, Punct lucru)
     2. `Status HR` (`ACTIV / PLECAT`)
     3. `Conformitate Generală` (`<OverallComplianceBadge />`)
     4. `Medicină a Muncii` (`<ComplianceItemBadge />` cu data scadenței și tooltip)
     5. `Instruire SSM` (`<ComplianceItemBadge />` cu scadență)
     6. `Instruire PSI/SU` (`<ComplianceItemBadge />` cu scadență)
     7. `Curs Igienă` (`<ComplianceItemBadge />` dacă e solicitat, sau `—` dacă nu se aplică)
     8. `Acțiuni Documente` (Cerere, Declarație RI, CIM)
5. **Puncte de Lucru, Posturi & Arhiva Documentelor Emise**:
   - Păstrate și optimizate.

### 5.2. Codul Complet Propus pentru `src/app/clients/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { maskCNP } from '@/lib/security';
import { 
  calculateEmployeeCompliance, 
  calculateCompanyMetrics, 
  formatRoDate 
} from '@/lib/compliance';
import {
  ComplianceItemBadge,
  OverallComplianceBadge,
  ComplianceScoreBadge,
  ComplianceBreakdownPills,
  ComplianceAlertBanner,
} from '@/components/compliance-badge';
import { 
  Building2, 
  Users, 
  Briefcase, 
  MapPin, 
  FileText, 
  UploadCloud, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  Download,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  Flame,
  Award
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      worksites: { orderBy: { name: 'asc' } },
      jobs: { orderBy: { title: 'asc' } },
      employees: {
        orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
        include: {
          currentJob: true,
          currentWorksite: true,
          identityDocument: true,
          residenceAddress: true,
        },
      },
      generatedDocuments: {
        orderBy: { createdAt: 'desc' },
        include: { template: true },
      },
      riskAssessments: {
        include: {
          riskItems: true,
          preventionMeasures: true,
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const activeEmployees = client.employees.filter((e) => e.status === 'ACTIV');
  
  // Calcul conformitate per salariat și la nivel de companie
  // Calculăm pe angajații activi (cei activi generează obligații legale curente)
  const clientMetrics = calculateCompanyMetrics(activeEmployees);

  // Pre-evaluăm conformitatea fiecărui salariat pentru randare eficientă
  const evaluatedEmployees = client.employees.map((emp) => ({
    ...emp,
    compliance: calculateEmployeeCompliance(emp),
  }));

  return (
    <div className="space-y-8">
      {/* 1. Client Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {client.name}
            </h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              client.isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {client.isActive ? 'CLIENT ACTIV' : 'INACTIV'}
            </span>
            <ComplianceScoreBadge 
              scorePercent={clientMetrics.complianceScorePercent} 
              size="sm" 
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mt-4 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block">CUI / CIF:</span>
              <span className="font-mono font-semibold text-slate-900">{client.cui}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Nr. Reg. Comerț:</span>
              <span className="font-medium text-slate-900">{client.regCom || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Reprezentant Legal:</span>
              <span className="font-medium text-slate-900">{client.legalRepresentative || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Persoană Contact:</span>
              <span className="font-medium text-slate-900">
                {client.contactPerson || '—'} {client.contactPhone && `(${client.contactPhone})`}
              </span>
            </div>
            <div className="col-span-2 md:col-span-4 mt-1 flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{client.address}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto">
          <a
            href={`/api/clients/${client.id}/export`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            download
          >
            <Download className="w-4 h-4" />
            <span>Exportă Registru Excel</span>
          </a>
          <Link
            href={`/imports/new?clientId=${client.id}`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import / Actualizare Excel</span>
          </Link>
          <Link
            href={`/documents/generate?clientId=${client.id}`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Generează Document</span>
          </Link>
        </div>
      </div>

      {/* 2. Compliance Overview Dashboard Section (NOU) */}
      <div className="space-y-4">
        {/* Banner de alertă critică dacă există scadențe depășite */}
        <ComplianceAlertBanner metrics={clientMetrics} clientName={client.name} />

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Stânga: Scor Conformitate */}
            <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
              <ComplianceScoreBadge 
                scorePercent={clientMetrics.complianceScorePercent}
                totalItems={clientMetrics.totalItemsTracked}
                validCount={clientMetrics.validCount}
                size="md"
              />
              <div className="mt-3 text-xs text-slate-500">
                Calculat pentru cei <strong className="text-slate-800">{activeEmployees.length}</strong> salariați activi pe 4 direcții: Medicină, SSM, PSI/SU și Igienă.
              </div>
            </div>

            {/* Dreapta: Pastilele de distribuție */}
            <div className="lg:w-2/3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Distribuție Cerințe de Securitate în Muncă
              </div>
              <ComplianceBreakdownPills metrics={clientMetrics} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stats Counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Angajați Activi</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {activeEmployees.length} <span className="text-xs text-slate-400 font-normal">/ {client.employees.length} total</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Puncte de Lucru</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{client.worksites.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Posturi / Funcții</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{client.jobs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Documente SSM Emise</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{client.generatedDocuments.length}</div>
        </div>
      </div>

      {/* 4. Section: Employees with Inline Compliance Badges */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50/75">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Registru Salariați & Monitorizare Scadențe ({client.employees.length})
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            CNP mascat conform GDPR • Verificare automată HG 355/2007, Legea 319/2006
          </div>
        </div>

        {client.employees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Niciun angajat înregistrat. Importă fișierul <code className="text-blue-600">Model_date_client_SSM.xlsx</code>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Salariat</th>
                  <th className="px-3 py-3">Stare Generală</th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                      <span>Medicină Muncii</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Instruire SSM</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span>Instruire PSI</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Curs Igienă</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Documente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evaluatedEmployees.map((emp) => {
                  const comp = emp.compliance;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                      {/* Salariat & Detalii de bază */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {emp.lastName} {emp.firstName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{maskCNP(emp.cnp)}</span>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">{emp.currentJob?.title || 'Fără post'}</span>
                        </div>
                      </td>

                      {/* Stare Generală Agregată */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <OverallComplianceBadge status={comp.overallStatus} size="sm" />
                      </td>

                      {/* 1. Medicină a Muncii */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.occupationalMedicine} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 2. Instruire SSM */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.ssmTraining} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 3. Instruire PSI */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.psiTraining} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 4. Curs Igienă (Condițional) */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {comp.hygieneCertificate ? (
                          <ComplianceItemBadge 
                            item={comp.hygieneCertificate} 
                            showSubtext={true}
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Neaplicabil
                          </span>
                        )}
                      </td>

                      {/* Status HR (ACTIV / PLECAT) */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          emp.status === 'ACTIV'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {emp.status}
                        </span>
                      </td>

                      {/* Acțiuni Rapide Documente */}
                      <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                        <Link
                          href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-cerere-angajare`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                          title="Generează cerere de angajare"
                        >
                          Cerere
                        </Link>
                        <Link
                          href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-declaratie-regulament`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                          title="Generează declarație regulament intern"
                        >
                          Declarație RI
                        </Link>
                        <Link
                          href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-cim-2026`}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                          title="Generează contract individual de muncă 2026"
                        >
                          CIM
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Two Column Layout: Worksites & Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worksites */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Puncte de Lucru ({client.worksites.length})</span>
          </h2>
          {client.worksites.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">Nu există puncte definite.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {client.worksites.map((w) => (
                <div key={w.id} className="py-2.5">
                  <div className="font-semibold text-slate-800">{w.name}</div>
                  <div className="text-slate-500 mt-0.5">{w.address}</div>
                  {w.activity && (
                    <div className="text-slate-400 text-[11px] mt-0.5">Activitate: {w.activity}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Jobs / Context */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>Posturi & Context SSM ({client.jobs.length})</span>
          </h2>
          {client.jobs.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">Nu există posturi definite.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {client.jobs.map((j) => (
                <div key={j.id} className="py-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-slate-800">{j.title}</span>
                    {j.corCode && <span className="font-mono text-slate-400 text-[11px]">COR: {j.corCode}</span>}
                  </div>
                  {j.mainActivities && (
                    <div className="text-slate-500 mt-0.5 line-clamp-1">{j.mainActivities}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Generated Documents Archive for this Client */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Documente SSM Pregătite & Emise ({client.generatedDocuments.length})</span>
          </h2>
          <Link
            href={`/documents/generate?clientId=${client.id}`}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            + Generează Document Nou
          </Link>
        </div>

        {client.generatedDocuments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nu a fost generat niciun document pentru acest client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Denumire Document</th>
                  <th className="px-4 py-3">Șablon</th>
                  <th className="px-4 py-3">Data Generării</th>
                  <th className="px-4 py-3">Stare</th>
                  <th className="px-4 py-3 text-right">Descărcare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {client.generatedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {doc.title}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {doc.template.code}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.status === 'approved_for_print'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {doc.status === 'approved_for_print' ? 'Aprobat Tipărire' : 'Draft / Lipsuri'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200"
                      >
                        <Download className="w-3 h-3" />
                        <span>Descarcă</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. Matrice de Concordanță a Terminologiei Legale Românești

Pentru a asigura o experiență de utilizare unitară pe toate ecranele, s-au standardizat următoarele denumiri:

| Cod Stare | Badge Individual | Text Afișat | Stare Generală Salariat | Semnificație Juridică / Acțiune Recomandată |
|---|---|---|---|---|
| `VALID` | `VALID` | `VALID (Xz)` | `CONFORM` | Fişă de aptitudine / instruire în vigoare (>30 zile rămase). Nicio acțiune necesară. |
| `UPCOMING` | `SCADENT` | `SCADENT (Xz)` / `SCADENT AZI` | `SCADENȚĂ IMINENTĂ` | Scadență în 0–30 de zile. Se recomandă programarea examenului medical sau a instructajului. |
| `OVERDUE` | `EXPIRAT` | `EXPIRAT (Xz)` | `DEPĂȘIT / EXPIRAT` | Termen legal depășit (<0 zile). Salariatul nu poate presta legal activitatea fără risc contravențional conform Legii 319/2006. |
| `MISSING` | `NEÎNREGISTRAT` | `NEÎNREGISTRAT` | `DATE LIPSĂ` | Nicio dată înregistrată în baza de date. Dosar incomplet. |

---

## 7. Plan de Verificare și Criterii de Acceptanță

1. **Compilare Curată TypeScript & Next.js**:
   - `npm run build` trebuie să treacă fără erori de tipuri sau warning-uri de hidratare.
2. **Randare Server-Side Fără Discrepanțe (Zero Hydration Mismatch)**:
   - Tooltip-urile CSS și textele formatate prin `formatRoDate()` produc identic același markup HTML pe server și pe client.
3. **Comportament Cursuri de Igienă**:
   - Dacă `emp.hygieneRequested` este fals și nu există dată consemnată, se afișează `Neaplicabil` (cursiv), fără a penaliza starea generală.
   - Dacă este solicitat, se afișează badge-ul corespunzător.
4. **Scor Companie**:
   - Afișează corect procentajul `complianceScorePercent` și bara cromatică.

---

Raport întocmit de **Explorer 3**, Milestone 2.
