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
    label: 'Admin Master',
    badge: 'Admin Master',
    color: 'text-amber-800',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    description: 'Acces complet nelimitat la toate modulele, setările și datele de personal.',
  },
  SSM: {
    role: 'SSM',
    label: 'Specialist SSM',
    badge: 'Specialist SSM',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    description: 'Acces la riscuri, instruiri, EIP și date operaționale angajați (fără CNP sau salarii).',
  },
  HR: {
    role: 'HR',
    label: 'Resurse Umane (HR)',
    badge: 'Resurse Umane',
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
    description: 'Acces la dosarul de personal, CIM, salarii, medicină a muncii și import Excel.',
  },
  IGIENA: {
    role: 'IGIENA',
    label: 'Inspector Igienă',
    badge: 'Igienă',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
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
