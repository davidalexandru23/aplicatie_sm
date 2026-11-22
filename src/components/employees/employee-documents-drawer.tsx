'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Navigation,
  Archive,
  Download,
  ShieldCheck,
  FileCheck,
  Award,
  ArrowUpRight,
  MapPin,
  Clock,
  Briefcase,
  Users
} from 'lucide-react';
import { UserRole, ROLE_CONFIG } from '@/lib/rbac';
import {
  RecordMedicalExamModal,
  ManageHygieneModulesModal,
  TerminateEmployeeModal,
  ManageEipModal
} from '@/components/employees';

export interface EmployeeDrawerData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  cnp?: string | null;
  status: string;
  currentJob?: { id: string; title: string; corCode?: string | null } | null;
  currentWorksite?: { id: string; name: string } | null;
  commuteTransport?: string | null;
  commuteDurationMinutes?: number | null;
  commuteRoute?: string | null;
  residenceAddress?: {
    county?: string | null;
    locality?: string | null;
    street?: string | null;
    number?: string | null;
    building?: string | null;
    entrance?: string | null;
    apartment?: string | null;
  } | null;
}

interface EmployeeDocumentsDrawerProps {
  employee: EmployeeDrawerData;
  clientId: string;
  clientName: string;
  userRole?: UserRole;
  eipCatalog?: any[];
}

export function EmployeeDocumentsDrawer({
  employee,
  clientId,
  clientName,
  userRole = 'ADMIN',
  eipCatalog = [],
}: EmployeeDocumentsDrawerProps) {
  const isSsm = userRole === 'SSM';
  const isHr = userRole === 'HR';
  const isIgiena = userRole === 'IGIENA';
  const isAdmin = userRole === 'ADMIN';

  // Construct readable address
  const addr = employee.residenceAddress;
  const addressStr = addr
    ? [
        addr.locality,
        addr.street ? `${addr.street}${addr.number ? ` nr. ${addr.number}` : ''}` : '',
        addr.building ? `bl. ${addr.building}` : '',
        addr.entrance ? `sc. ${addr.entrance}` : '',
        addr.apartment ? `ap. ${addr.apartment}` : '',
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  const defaultTemplateCode = isIgiena
    ? 'hygiene-adeverinta'
    : isHr
    ? 'hr-cim-2026'
    : 'ssm-declaratie-traseu';

  return (
    <div className="bg-slate-50 border border-blue-200/80 rounded-xl p-4 sm:p-5 shadow-inner space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Bar: Informații Salariat & Comandă Rapidă */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold text-xs">
            {employee.lastName?.[0] || 'S'}{employee.firstName?.[0] || ''}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{employee.fullName}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  employee.status === 'ACTIV'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : employee.status === 'Suspendat/CM'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {employee.status}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                • {employee.currentJob?.title || 'Fără post consemnat'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>Firmă: <strong className="text-slate-700">{clientName}</strong></span>
              {employee.currentWorksite && (
                <span>• Punct lucru: <strong className="text-slate-700">{employee.currentWorksite.name}</strong></span>
              )}
              {employee.cnp && (
                <span>• CNP: <span className="font-mono">{userRole === 'SSM' ? '•••••••••••••' : employee.cnp}</span></span>
              )}
            </div>
          </div>
        </div>

        <div>
          <Link
            href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=${defaultTemplateCode}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs transition"
          >
            <span>Deschide în Generator Avansat</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Grid cu 2 secțiuni: Documente (per Rol) & Operațiuni Salariat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coloana Stângă: Documente Nominale Disponibile (Lățime: 7/12) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Documente Nominale ({ROLE_CONFIG[userRole]?.label || userRole})</span>
            </span>
            <span className="text-[10px] text-slate-400">Click pentru generare / descărcare</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Fișă Traseu - Legea 319/2006 (ADMIN, SSM, HR) */}
            {(isAdmin || isSsm || isHr) && (
              <Link
                href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=ssm-declaratie-traseu`}
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition group"
                title="Generare Declarație Traseu (Legea 319/2006 art. 30 lit. g)"
              >
                <div className="p-1.5 rounded bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                    Fișă Traseu Deplasare
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    L319/2006 art. 30 • Navetă casă-muncă
                  </div>
                </div>
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                  DOCX
                </span>
              </Link>
            )}

            {/* Pachet Onboarding ZIP (ADMIN, HR) */}
            {(isAdmin || isHr) && (
              <a
                href={`/api/clients/${clientId}/packages/onboarding?employeeId=${employee.id}`}
                download
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg shadow-2xs transition group"
                title="Descarcă dosarul complet de onboarding salariat (11 fișiere DOCX în arhivă ZIP)"
              >
                <div className="p-1.5 rounded bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Archive className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                    Pachet Onboarding (ZIP)
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Dosar complet angajare (11 DOCX)
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  ZIP
                </span>
              </a>
            )}

            {/* Contract Individual de Muncă - CIM (ADMIN, HR) */}
            {(isAdmin || isHr) && (
              <Link
                href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=hr-cim-2026`}
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs transition group"
                title="Generare Contract Individual de Muncă 2026 (Codul Muncii)"
              >
                <div className="p-1.5 rounded bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                    Contract de Muncă (CIM)
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Model-cadru normat 2026
                  </div>
                </div>
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">
                  DOCX
                </span>
              </Link>
            )}

            {/* Fișă Post & Anexă SSM (ADMIN, SSM, HR) */}
            {(isAdmin || isSsm || isHr) && (
              <Link
                href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=hr-anexa-fisa-post`}
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition group"
                title="Generare Anexă Fișă Post SSM"
              >
                <div className="p-1.5 rounded bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                    Fișă Post & Anexă SSM
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Atribuții & răspunderi SSM pe post
                  </div>
                </div>
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                  DOCX
                </span>
              </Link>
            )}

            {/* Fișă Instruire SSM Individuală (ADMIN, SSM) */}
            {(isAdmin || isSsm) && (
              <Link
                href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=ssm-fisa-instruire-individuala`}
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-lg shadow-2xs transition group"
                title="Generare Fișă de Instruire Individuală SSM (HG 1425/2006)"
              >
                <div className="p-1.5 rounded bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-amber-700 truncate">
                    Fișă Instruire SSM
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    HG 1425/2006 • Introductiv / Periodic
                  </div>
                </div>
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">
                  DOCX
                </span>
              </Link>
            )}

            {/* Cerere de Angajare (ADMIN, HR) */}
            {(isAdmin || isHr) && (
              <Link
                href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=hr-cerere-angajare`}
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition group"
                title="Generare Cerere de Angajare"
              >
                <div className="p-1.5 rounded bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-slate-900 truncate">
                    Cerere de Angajare
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Formular de încadrare în muncă
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  DOCX
                </span>
              </Link>
            )}

            {/* Adeverință Curs Igienă DSP (ADMIN, IGIENA) */}
            {(isAdmin || isIgiena) && (
              <Link
                href={`/documents/generate?clientId=${clientId}&employeeId=${employee.id}&templateCode=hygiene-adeverinta`}
                className="flex items-start gap-2.5 p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg shadow-2xs transition group"
                title="Generare Adeverință Curs Igienă (Ordin MS/ME 2209/4469/2022)"
              >
                <div className="p-1.5 rounded bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">
                    Adeverință Curs Igienă
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Ord. MS/ME 2209/4469/2022
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  DOCX
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Coloana Dreaptă: Operațiuni Salariat & Informații Traseu (Lățime: 5/12) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Operațiuni & Modale */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Operațiuni & Înregistrări Salariat
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {!isIgiena && <RecordMedicalExamModal employee={employee as any} />}
              <ManageHygieneModulesModal employee={employee as any} />
              {eipCatalog && eipCatalog.length > 0 && !isHr && !isIgiena && (
                <ManageEipModal clientId={clientId} employee={employee as any} eipCatalog={eipCatalog} />
              )}
              {!isSsm && !isIgiena && <TerminateEmployeeModal employee={employee as any} />}
            </div>
          </div>

          {/* Card Detalii Navetă & Domiciliu */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>Parametri Traseu de Deplasare Salariat</span>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1">
              <div>
                <span className="text-slate-400">Domiciliu: </span>
                <span className="font-medium text-slate-800">{addressStr || 'Nespecificat în profil'}</span>
              </div>
              <div className="flex flex-wrap gap-x-3">
                <div>
                  <span className="text-slate-400">Transport: </span>
                  <span className="font-semibold text-blue-800">{employee.commuteTransport || 'Nespecificat'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Durată: </span>
                  <span className="font-semibold text-blue-800">
                    {employee.commuteDurationMinutes ? `${employee.commuteDurationMinutes} min` : 'Nespecificat'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400">Traseu: </span>
                <span className="font-medium text-slate-700 italic">
                  {employee.commuteRoute || 'Fără traseu consemnat (folosiți butonul Editează -> Tab 3 pentru completare)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
