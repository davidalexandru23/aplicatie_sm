import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck,
  ShieldAlert,
  Flame,
  Stethoscope,
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
        title={tooltipText}
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
