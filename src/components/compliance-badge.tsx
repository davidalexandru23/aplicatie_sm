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
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100',
    dotClass: 'bg-emerald-600',
    icon: CheckCircle2,
    overallLabel: 'CONFORM',
  },
  UPCOMING: {
    label: 'SCADENT',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100 font-medium',
    dotClass: 'bg-amber-600',
    icon: Clock,
    overallLabel: 'SCADENȚĂ IMINENTĂ',
  },
  OVERDUE: {
    label: 'EXPIRAT',
    badgeClasses: 'bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100 font-semibold',
    dotClass: 'bg-rose-600',
    icon: AlertTriangle,
    overallLabel: 'DEPĂȘIT / EXPIRAT',
  },
  MISSING: {
    label: 'NEÎNREGISTRAT',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 font-medium',
    dotClass: 'bg-slate-500',
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

  // Subtext opțional cu data scadenței și numărul de module
  const hasMultipleModules = Boolean(item?.modules && item.modules.length > 1);
  const subtextContent = hasMultipleModules
    ? `${item!.modules!.length} module • ${dueDate ? formatRoDate(dueDate) : 'Fără dată'}`
    : dueDate ? `Scadent: ${formatRoDate(dueDate)}` : 'Fără dată';

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      {/* Container cu tooltip CSS hover fără JavaScript pe client */}
      <div 
        className="group relative inline-flex items-center"
        title={hasMultipleModules ? undefined : tooltipText}
      >
        <span
          className={`inline-flex items-center gap-1 rounded border transition-colors cursor-help select-none ${
            isSmall ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
          } ${config.badgeClasses}`}
        >
          {showIcon && <Icon className={isSmall ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0'} />}
          <span>{badgeText}</span>
          {hasMultipleModules && (
            <span className="ml-0.5 px-1 py-0.2 bg-black/10 rounded-full text-[9px] font-bold">
              {item!.modules!.length}
            </span>
          )}
        </span>

        {/* Pure CSS Tooltip (SSR friendly, zero bundle JS) */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 pointer-events-none">
          <div className="bg-slate-900 text-white text-[11px] rounded px-3 py-2 shadow-xl whitespace-normal min-w-[220px] max-w-sm leading-tight border border-slate-700">
            {item?.modules && item.modules.length > 0 ? (
              <div>
                <div className="font-semibold flex items-center justify-between gap-2 border-b border-slate-700 pb-1 mb-1.5">
                  <span className="text-white">{label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Valabilitate: 3 ani (36 luni)</span>
                </div>
                <div className="space-y-1.5 mt-1">
                  {item.modules.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                      <span className={m.status === 'VALID' ? 'text-emerald-400 font-bold' : m.status === 'UPCOMING' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                        {m.status === 'VALID' ? 'OK' : m.status === 'UPCOMING' ? 'SCADENT' : 'EXPIRAT'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-100">{m.moduleName}</div>
                        <div className="text-slate-300 text-[10px]">
                          {m.examDate ? `Examen: ${formatRoDate(m.examDate)}` : 'Fără examen'}
                          {m.dueDate ? ` → ${m.status === 'OVERDUE' ? 'Expirat la' : 'Scadent'}: ${formatRoDate(m.dueDate)}` : ''}
                          {m.daysRemaining !== null ? ` (${m.daysRemaining < 0 ? `expirat de ${Math.abs(m.daysRemaining)}z` : `${m.daysRemaining}z rămase`})` : ''}
                        </div>
                        {m.certificateNumber && (
                          <div className="text-slate-400 text-[9px]">
                            Adeverință / Certificat DSP: #{m.certificateNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold">{label}</div>
                <div className="text-slate-300 mt-0.5">{tooltipText.replace(`${label}: `, '')}</div>
              </div>
            )}
          </div>
          <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
        </div>
      </div>

      {/* Subtext opțional cu data scadenței */}
      {showSubtext && (
        <span className="text-[10px] text-slate-500 mt-0.5 block truncate max-w-[150px]">
          {subtextContent}
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
      className={`inline-flex items-center gap-1.5 rounded-md border tracking-wider uppercase font-semibold select-none ${sizeClasses} ${config.badgeClasses} ${className}`}
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
      <div className="bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-red-900 dark:text-rose-200">
          <div className="font-bold text-sm text-red-800 dark:text-rose-300">
            Atenție: {metrics.overdueCount} cerințe legale cu termen depășit!
          </div>
          <p className="mt-1 text-red-700 dark:text-rose-300/90 leading-relaxed">
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
      <div className="bg-rose-50 dark:bg-amber-950/30 border border-rose-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-rose-900 dark:text-amber-200">
          <div className="font-bold text-sm text-rose-800 dark:text-amber-300">
            Date incomplete: {metrics.missingCount} elemente neînregistrate
          </div>
          <p className="mt-1 text-rose-700 dark:text-amber-300/90 leading-relaxed">
            Pentru anumiți salariați nu au fost consemnate datele ultimului examen medical sau ale instruirii SSM. 
            Completați datele prin import Excel sau editarea fișei salariatului.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex items-center gap-3">
      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="text-xs text-amber-900 dark:text-amber-200">
        <span className="font-bold text-amber-800 dark:text-amber-300">Scadențe în următoarele 30 de zile:</span> Există {metrics.upcomingCount} examinări sau instruiri care expiră curând. Recomandăm programarea din timp.
      </div>
    </div>
  );
}
