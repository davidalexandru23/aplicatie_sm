/**
 * Romanian SSM, PSI/SU, Occupational Medicine & Hygiene Compliance Calculation Engine
 * 
 * Normative Framework:
 * - Occupational Medicine: HG nr. 355/2007 (12-month standard, 6-month specific risks)
 * - Periodic SSM Training: Legea nr. 319/2006, HG nr. 1425/2006 (6-month operational, 12-month TESA)
 * - Periodic PSI/SU Training: Legea nr. 307/2006, OMAI nr. 712/2005 (6-month admin, 1-3 month operational)
 * - Hygiene Courses: Ordinul comun MS/ME nr. 2209/4469/2022 (36-month / 3-year validity)
 */

export type ComplianceStatus = 'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING';

export interface ComplianceItemResult {
  lastDate: Date | null;
  intervalMonths: number;
  dueDate: Date | null;
  daysRemaining: number | null;
  status: ComplianceStatus;
  label: string;
}

export interface EmployeeComplianceSummary {
  employeeId: string;
  employeeName: string;
  occupationalMedicine: ComplianceItemResult;
  ssmTraining: ComplianceItemResult;
  psiTraining: ComplianceItemResult;
  hygieneCertificate: ComplianceItemResult | null; // null if hygiene not required
  overallStatus: ComplianceStatus;
}

export interface CompanyComplianceMetrics {
  totalEmployees: number;
  totalItemsTracked: number;
  validCount: number;
  upcomingCount: number;
  overdueCount: number;
  missingCount: number;
  complianceScorePercent: number; // (validCount / totalItemsTracked) * 100
}

export interface ComplianceBadgeInfo {
  status: ComplianceStatus;
  text: string;
  className: string;
  daysRemaining: number | null;
}

export interface EmployeeComplianceInput {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  medicalLastExamDate?: Date | string | null;
  medicalIntervalMonths?: number | null;
  medicalFitnessVerdict?: string | null;
  medicalNotes?: string | null;
  ssmLastTrainingDate?: Date | string | null;
  ssmIntervalMonths?: number | null;
  ssmNotes?: string | null;
  psiLastTrainingDate?: Date | string | null;
  psiIntervalMonths?: number | null;
  psiNotes?: string | null;
  hygieneRequested?: boolean | null;
  hygieneLastExamDate?: Date | string | null;
  hygieneIntervalMonths?: number | null;
  hygieneCertificateNumber?: string | null;
  hygieneCertificateIssueDate?: Date | string | null;
  hygieneNotes?: string | null;
  [key: string]: unknown;
}

export const COMPLIANCE_CONSTANTS = {
  DEFAULT_MEDICAL_INTERVAL: 12,
  DEFAULT_SSM_INTERVAL: 6,
  DEFAULT_PSI_INTERVAL: 6,
  DEFAULT_HYGIENE_INTERVAL: 36,
  UPCOMING_THRESHOLD_DAYS: 30,
} as const;

/**
 * Adds months to a date with calendar month clamping (e.g., Jan 31 + 1 month -> Feb 28/29).
 */
export function addMonthsSafe(baseDate: Date | string, monthsToAdd: number): Date {
  const d = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to addMonthsSafe: ${baseDate}`);
  }

  const originalDay = d.getDate();
  const currentYear = d.getFullYear();
  const currentMonth = d.getMonth();

  const targetMonthIndex = currentMonth + monthsToAdd;
  const targetYear = currentYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Day 0 of the next month returns the exact last day of targetMonth
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(originalDay, daysInTargetMonth);

  const result = new Date(d.getTime());
  result.setFullYear(targetYear, targetMonth, clampedDay);
  return result;
}

/**
 * Calculates calendar days remaining between dueDate and referenceDate normalized to UTC midnight.
 * Guarantees immunity to Daylight Saving Time (DST) ±1 hour jumps.
 */
function getDaysRemaining(dueDate: Date, referenceDate: Date): number {
  const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const refUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dueUtc - refUtc) / msPerDay);
}

/**
 * Calculates compliance status for a single requirement item.
 */
export function calculateItemCompliance(
  lastDate: Date | string | null | undefined,
  intervalMonths: number,
  label: string,
  referenceDate: Date = new Date()
): ComplianceItemResult {
  const safeInterval = intervalMonths > 0 ? intervalMonths : 12;

  if (!lastDate) {
    return {
      lastDate: null,
      intervalMonths: safeInterval,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label,
    };
  }

  const parsedDate = lastDate instanceof Date ? lastDate : new Date(lastDate);
  if (isNaN(parsedDate.getTime())) {
    return {
      lastDate: null,
      intervalMonths: safeInterval,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label,
    };
  }

  const dueDate = addMonthsSafe(parsedDate, safeInterval);
  const daysRemaining = getDaysRemaining(dueDate, referenceDate);

  let status: ComplianceStatus;
  if (daysRemaining < 0) {
    status = 'OVERDUE';
  } else if (daysRemaining <= COMPLIANCE_CONSTANTS.UPCOMING_THRESHOLD_DAYS) {
    status = 'UPCOMING';
  } else {
    status = 'VALID';
  }

  return {
    lastDate: parsedDate,
    intervalMonths: safeInterval,
    dueDate,
    daysRemaining,
    status,
    label,
  };
}

/**
 * Evaluates full compliance for an employee across all 4 legal dimensions.
 */
export function calculateEmployeeCompliance(
  employee: EmployeeComplianceInput | Record<string, unknown>,
  referenceDate: Date = new Date()
): EmployeeComplianceSummary {
  const employeeId = String(employee?.id || '');
  const employeeName = typeof employee?.fullName === 'string' && employee.fullName
    ? employee.fullName
    : typeof employee?.lastName === 'string' && typeof employee?.firstName === 'string' && employee.lastName && employee.firstName
      ? `${employee.lastName} ${employee.firstName}`
      : typeof employee?.lastName === 'string' && employee.lastName
        ? employee.lastName
        : typeof employee?.firstName === 'string' && employee.firstName
          ? employee.firstName
          : 'Angajat';

  // 1. Occupational Medicine (HG 355/2007)
  const medicalLastExam = (employee?.medicalLastExamDate as Date | string | null | undefined) ?? null;
  const medicalInterval = typeof employee?.medicalIntervalMonths === 'number'
    ? employee.medicalIntervalMonths
    : COMPLIANCE_CONSTANTS.DEFAULT_MEDICAL_INTERVAL;

  const occupationalMedicine = calculateItemCompliance(
    medicalLastExam,
    medicalInterval,
    'Medicină a Muncii',
    referenceDate
  );

  // 2. Periodic SSM Training (Legea 319/2006, HG 1425/2006)
  const ssmLastTraining = (employee?.ssmLastTrainingDate as Date | string | null | undefined) ?? null;
  const ssmInterval = typeof employee?.ssmIntervalMonths === 'number'
    ? employee.ssmIntervalMonths
    : COMPLIANCE_CONSTANTS.DEFAULT_SSM_INTERVAL;

  const ssmTraining = calculateItemCompliance(
    ssmLastTraining,
    ssmInterval,
    'Instruire SSM',
    referenceDate
  );

  // 3. Periodic PSI/SU Training (Legea 307/2006, OMAI 712/2005)
  const psiLastTraining = (employee?.psiLastTrainingDate as Date | string | null | undefined) ?? null;
  const psiInterval = typeof employee?.psiIntervalMonths === 'number'
    ? employee.psiIntervalMonths
    : COMPLIANCE_CONSTANTS.DEFAULT_PSI_INTERVAL;

  const psiTraining = calculateItemCompliance(
    psiLastTraining,
    psiInterval,
    'Instruire PSI/SU',
    referenceDate
  );

  // 4. Hygiene Course (Ordinul 2209/4469/2022) - conditionally tracked
  const isHygieneApplicable = Boolean(
    employee?.hygieneRequested || employee?.hygieneLastExamDate
  );

  const hygieneLastExam = (employee?.hygieneLastExamDate as Date | string | null | undefined) ?? null;
  const hygieneInterval = typeof employee?.hygieneIntervalMonths === 'number'
    ? employee.hygieneIntervalMonths
    : COMPLIANCE_CONSTANTS.DEFAULT_HYGIENE_INTERVAL;

  const hygieneCertificate = isHygieneApplicable
    ? calculateItemCompliance(
        hygieneLastExam,
        hygieneInterval,
        'Cursuri de Igienă',
        referenceDate
      )
    : null;

  // Active items to consider for rollup
  const activeItems: ComplianceItemResult[] = [
    occupationalMedicine,
    ssmTraining,
    psiTraining,
  ];
  if (hygieneCertificate !== null) {
    activeItems.push(hygieneCertificate);
  }

  // Rollup priority: OVERDUE > MISSING > UPCOMING > VALID
  let overallStatus: ComplianceStatus;
  if (activeItems.some((i) => i.status === 'OVERDUE')) {
    overallStatus = 'OVERDUE';
  } else if (activeItems.some((i) => i.status === 'MISSING')) {
    overallStatus = 'MISSING';
  } else if (activeItems.some((i) => i.status === 'UPCOMING')) {
    overallStatus = 'UPCOMING';
  } else {
    overallStatus = 'VALID';
  }

  return {
    employeeId,
    employeeName,
    occupationalMedicine,
    ssmTraining,
    psiTraining,
    hygieneCertificate,
    overallStatus,
  };
}

/**
 * Calculates aggregated compliance metrics for a group of employees (e.g. at company level).
 */
export function calculateCompanyMetrics(
  employees: (EmployeeComplianceInput | Record<string, unknown>)[],
  referenceDate: Date = new Date()
): CompanyComplianceMetrics {
  const employeeList = Array.isArray(employees) ? employees : [];
  const totalEmployees = employeeList.length;

  let totalItemsTracked = 0;
  let validCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let missingCount = 0;

  for (const emp of employeeList) {
    const summary = calculateEmployeeCompliance(emp, referenceDate);
    const items: ComplianceItemResult[] = [
      summary.occupationalMedicine,
      summary.ssmTraining,
      summary.psiTraining,
    ];
    if (summary.hygieneCertificate !== null) {
      items.push(summary.hygieneCertificate);
    }

    for (const item of items) {
      totalItemsTracked++;
      switch (item.status) {
        case 'VALID':
          validCount++;
          break;
        case 'UPCOMING':
          upcomingCount++;
          break;
        case 'OVERDUE':
          overdueCount++;
          break;
        case 'MISSING':
          missingCount++;
          break;
      }
    }
  }

  // Round compliance score to 2 decimals, or 100% if no items tracked (prevents 0 / 0 = NaN)
  const complianceScorePercent = totalItemsTracked === 0
    ? 100
    : Math.round((validCount / totalItemsTracked) * 10000) / 100;

  return {
    totalEmployees,
    totalItemsTracked,
    validCount,
    upcomingCount,
    overdueCount,
    missingCount,
    complianceScorePercent,
  };
}

/**
 * Safe Romanian date formatter (DD.MM.YYYY) preventing SSR hydration mismatches.
 */
export function formatRoDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * UI Badge text and Tailwind CSS class styling helper for an individual compliance item.
 */
export function getStatusBadgeInfo(
  status: ComplianceStatus,
  daysRemaining?: number | null
): ComplianceBadgeInfo {
  switch (status) {
    case 'VALID':
      return {
        status,
        text: daysRemaining !== null && daysRemaining !== undefined 
          ? `VALID (${daysRemaining}z)` 
          : 'VALID',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        daysRemaining: daysRemaining ?? null,
      };
    case 'UPCOMING':
      return {
        status,
        text: daysRemaining === 0 
          ? 'SCADENT AZI' 
          : daysRemaining !== null && daysRemaining !== undefined 
            ? `SCADENT (${daysRemaining}z)` 
            : 'SCADENT',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
        daysRemaining: daysRemaining ?? null,
      };
    case 'OVERDUE':
      return {
        status,
        text: daysRemaining !== null && daysRemaining !== undefined 
          ? `EXPIRAT (${Math.abs(daysRemaining)}z)` 
          : 'EXPIRAT',
        className: 'bg-red-50 text-red-700 border border-red-200 font-semibold',
        daysRemaining: daysRemaining ?? null,
      };
    case 'MISSING':
    default:
      return {
        status: 'MISSING',
        text: 'NEÎNREGISTRAT',
        className: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
        daysRemaining: null,
      };
  }
}

/**
 * UI Badge text and Tailwind CSS class styling helper for an employee overall compliance status.
 */
export function getOverallStatusBadgeInfo(status: ComplianceStatus): {
  text: string;
  className: string;
} {
  switch (status) {
    case 'VALID':
      return {
        text: 'CONFORM',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'UPCOMING':
      return {
        text: 'SCADENȚĂ IMINENTĂ',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-medium',
      };
    case 'OVERDUE':
      return {
        text: 'EXPIRAT / NECONFORM',
        className: 'bg-red-50 text-red-700 border border-red-200 font-bold',
      };
    case 'MISSING':
    default:
      return {
        text: 'DATE LIPSĂ',
        className: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      };
  }
}
