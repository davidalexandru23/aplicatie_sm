import { UserRole } from './auth';
export type { UserRole } from './auth';

export interface RoleMeta {
  role: UserRole;
  label: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const ROLE_CONFIG: Record<UserRole, RoleMeta> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrator',
    badge: 'Administrator',
    color: 'text-slate-200',
    bgColor: 'bg-slate-800',
    borderColor: 'border-slate-700',
    description: 'Acces complet la toate modulele, setările și dosarele de personal.',
  },
  SSM: {
    role: 'SSM',
    label: 'Specialist SSM',
    badge: 'Specialist SSM',
    color: 'text-blue-200',
    bgColor: 'bg-blue-950',
    borderColor: 'border-blue-800',
    description: 'Acces la riscuri, instruiri, EIP și date operaționale angajați (fără CNP sau salarii).',
  },
  HR: {
    role: 'HR',
    label: 'Resurse Umane (HR)',
    badge: 'Resurse Umane',
    color: 'text-indigo-200',
    bgColor: 'bg-indigo-950',
    borderColor: 'border-indigo-800',
    description: 'Acces la dosarul de personal, CIM, salarii, medicină a muncii și import Excel.',
  },
  IGIENA: {
    role: 'IGIENA',
    label: 'Inspector Igienă',
    badge: 'Igienă',
    color: 'text-emerald-200',
    bgColor: 'bg-emerald-950',
    borderColor: 'border-emerald-800',
    description: 'Acces dedicat cursurilor de igienă, sesiunilor, adeverințelor DSP și registrului de salariați.',
  },
};

/**
 * Rute permise per rol (prefix matching)
 */
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  ADMIN: ['/'],
  SSM: [
    '/',
    '/clients',
    '/employees',
    '/risk-assessments',
    '/trainings',
    '/templates',
    '/documents',
    '/settings',
  ],
  HR: [
    '/',
    '/clients',
    '/employees',
    '/documents',
    '/templates',
    '/imports',
    '/settings',
  ],
  IGIENA: [
    '/hygiene',
    '/employees',
    '/clients',
    '/settings',
    '/documents',
  ],
};

/**
 * Verifică dacă o cale este permisă pentru un rol specific
 */
export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === 'ADMIN') return true;

  // Căi publice comune
  if (
    pathname === '/login' ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return true;
  }

  // Reguli specifice IGIENA
  if (role === 'IGIENA') {
    if (pathname.startsWith('/hygiene') || pathname.startsWith('/api/hygiene')) return true;
    if (pathname.startsWith('/employees') || pathname.startsWith('/api/employees')) return true;
    if (pathname.startsWith('/clients') || pathname.startsWith('/api/clients')) return true;
    if (pathname === '/settings' || pathname.startsWith('/api/settings')) return true;
    if (pathname.startsWith('/documents') || pathname.startsWith('/api/documents')) return true;
    return false;
  }

  // Reguli specifice SSM
  if (role === 'SSM') {
    if (pathname.startsWith('/imports') || pathname.startsWith('/api/imports')) return false; // SSM nu gestionează importul brut HR
    if (pathname.startsWith('/hygiene') || pathname.startsWith('/api/hygiene')) return false; // Igiena ține de modulul dedicat de igienă
    return true;
  }

  // Reguli specifice HR
  if (role === 'HR') {
    if (pathname.startsWith('/risk-assessments') || pathname.startsWith('/api/risk-assessments')) return false; // Riscurile tehnice țin de SSM
    if (pathname.startsWith('/trainings') || pathname.startsWith('/api/trainings')) return false; // Instruirile și tematicile țin de SSM
    if (pathname.startsWith('/hygiene') || pathname.startsWith('/api/hygiene')) return false; // Igiena ține de modulul dedicat de igienă
    return true;
  }

  return true;
}

export type TemplateCategory = 'all' | 'ssm' | 'psi' | 'med_eip' | 'hr' | 'hygiene' | 'ipssm';

export const ROLE_ALLOWED_TEMPLATE_CATEGORIES: Record<UserRole, TemplateCategory[]> = {
  ADMIN: ['all', 'ssm', 'psi', 'med_eip', 'hr', 'hygiene', 'ipssm'],
  SSM: ['all', 'ssm', 'psi', 'med_eip', 'ipssm'],
  HR: ['all', 'hr', 'med_eip'],
  IGIENA: ['all', 'hygiene'],
};

export interface RoleGeneratorMeta {
  title: string;
  subtitle: string;
  badge: string;
}

export const ROLE_GENERATOR_CONFIG: Record<UserRole, RoleGeneratorMeta> = {
  ADMIN: {
    title: 'Generator documente',
    subtitle: 'Completează șabloane SSM, HR și Igienă din datele firmei și ale salariaților.',
    badge: 'Administrator',
  },
  SSM: {
    title: 'Generator documente SSM & PSI',
    subtitle: 'Completează fișe de instruire, evaluări de risc și documente SSM / PSI.',
    badge: 'Specialist SSM',
  },
  HR: {
    title: 'Generator documente HR',
    subtitle: 'Completează contracte de muncă, acte de angajare, fișe medicale și EIP.',
    badge: 'Resurse Umane',
  },
  IGIENA: {
    title: 'Generator documente igienă',
    subtitle: 'Generează adeverințe și cataloage DSP conform Ord. MS/ME 2209/4469/2022.',
    badge: 'Inspector Igienă',
  },
};

export function isTemplateAllowedForRole(
  template: { code: string; family?: string | null },
  role: UserRole
): boolean {
  if (role === 'ADMIN') return true;

  const code = (template.code || '').toLowerCase();
  const family = (template.family || '').toLowerCase();

  const isHygiene = family === 'hygiene' || code.startsWith('hygiene-');
  const isHr = (family === 'hr' || code.startsWith('hr-')) && !code.startsWith('med-') && !code.startsWith('eip-');
  const isIpssm = family === 'ipssm' || code.startsWith('ipssm-');
  const isMedEip = code.startsWith('med-') || code.startsWith('eip-');
  const isPsi = code.includes('psi') || code.includes('urgenta');
  const isSsm =
    family === 'risk' ||
    family === 'training' ||
    family === 'decision' ||
    code.startsWith('ssm-') ||
    code.startsWith('risk-') ||
    code.startsWith('training-') ||
    code === 'decizii-angajator';

  if (role === 'SSM') {
    // SSM manages SSM, PSI, Med & EIP, IPSSM, and Anexa Fisa Post SSM
    if (code === 'hr-anexa-fisa-post') return true;
    if (isHr || isHygiene) return false;
    return isSsm || isPsi || isMedEip || isIpssm;
  }

  if (role === 'HR') {
    // HR manages HR, Med & EIP, and Declaratie Traseu (dosar personal)
    if (code === 'ssm-declaratie-traseu') return true;
    if (isSsm || isPsi || isIpssm || isHygiene) return false;
    return isHr || isMedEip;
  }

  if (role === 'IGIENA') {
    // Igiena handles strictly Hygiene
    return isHygiene;
  }

  return true;
}

/**
 * Returnează ruta implicită de landing pentru fiecare rol
 */
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'IGIENA':
      return '/hygiene';
    case 'HR':
      return '/employees';
    case 'SSM':
    case 'ADMIN':
    default:
      return '/';
  }
}

/**
 * Sanitizează datele unui salariat în funcție de rolul utilizatorului
 */
export function sanitizeEmployeeForRole<T extends Record<string, any>>(emp: T, role: UserRole): T {
  if (role === 'ADMIN' || role === 'HR') {
    return emp;
  }

  const copy = { ...emp };

  if (role === 'SSM') {
    // Specialistul SSM nu are voie să vadă CNP, datele actului de identitate sau datele financiare/CIM
    delete copy.cnp;
    delete copy.identityDocument;
    delete copy.grossSalary;
    delete copy.bankIban;
    delete copy.bankName;
    delete copy.cimNumber;
    delete copy.cimDate;
    delete copy.probationDays;
    delete copy.annualLeaveDays;

    return {
      ...copy,
      cnp: null,
      identityDocument: null,
      grossSalary: null,
      bankIban: null,
      bankName: null,
      cimNumber: null,
      cimDate: null,
    };
  }

  if (role === 'IGIENA') {
    // Rolul Igienă vede datele de bază necesare cursului (fără CIM, salariu, evaluări de risc SSM)
    delete copy.grossSalary;
    delete copy.bankIban;
    delete copy.bankName;
    delete copy.cimNumber;
    delete copy.cimDate;
    delete copy.probationDays;
    delete copy.annualLeaveDays;

    return {
      ...copy,
      grossSalary: null,
      bankIban: null,
      bankName: null,
      cimNumber: null,
      cimDate: null,
    };
  }

  return copy;
}
