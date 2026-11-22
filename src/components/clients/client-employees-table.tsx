'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Stethoscope,
  ShieldCheck,
  Flame,
  Award,
  ChevronDown,
  FileText,
  Filter
} from 'lucide-react';
import { UserRole } from '@/lib/auth';
import { formatRoDate } from '@/lib/compliance';
import {
  ComplianceItemBadge,
  OverallComplianceBadge
} from '@/components/compliance-badge';
import {
  EditEmployeeModal,
  EmployeeDocumentsDrawer
} from '@/components/employees';

interface ClientEmployeesTableProps {
  client: {
    id: string;
    name: string;
    jobs: Array<{ id: string; title: string }>;
    worksites: Array<{ id: string; name: string }>;
  };
  employees: any[];
  eipCatalog?: any[];
  userRole?: UserRole;
  isSsmRole?: boolean;
}

export function ClientEmployeesTable({
  client,
  employees,
  eipCatalog = [],
  userRole = 'ADMIN',
  isSsmRole = false,
}: ClientEmployeesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIV' | 'SUSPENDAT' | 'PLECAT'>('ALL');
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Status filter
      if (statusFilter === 'ACTIV' && emp.status !== 'ACTIV') return false;
      if (statusFilter === 'SUSPENDAT' && emp.status !== 'Suspendat/CM') return false;
      if (statusFilter === 'PLECAT' && emp.status !== 'PLECAT') return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = `${emp.lastName} ${emp.firstName}`.toLowerCase();
      const cnp = (emp.cnp || '').toLowerCase();
      const job = (emp.currentJob?.title || '').toLowerCase();
      const worksite = (emp.currentWorksite?.name || '').toLowerCase();
      return name.includes(q) || cnp.includes(q) || job.includes(q) || worksite.includes(q);
    });
  }, [employees, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: employees.length,
      activ: employees.filter((e) => e.status === 'ACTIV').length,
      suspendat: employees.filter((e) => e.status === 'Suspendat/CM').length,
      plecat: employees.filter((e) => e.status === 'PLECAT').length,
    };
  }, [employees]);

  if (employees.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Niciun angajat înregistrat pentru această companie.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search & Quick Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-3 pb-2 bg-slate-50/50 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Toți ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIV')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
              statusFilter === 'ACTIV'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Activi ({counts.activ})
          </button>
          {counts.suspendat > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('SUSPENDAT')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                statusFilter === 'SUSPENDAT'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Suspendat/CM ({counts.suspendat})
            </button>
          )}
          {counts.plecat > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('PLECAT')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                statusFilter === 'PLECAT'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Plecați ({counts.plecat})
            </button>
          )}
        </div>

        <div className="relative min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrează salariați..."
            className="w-full text-xs pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs divide-y divide-slate-100">
          <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-5 py-3 w-[22%] min-w-[170px]">Salariat</th>
              <th className="px-3 py-3 w-[11%] min-w-[110px]">Stare Generală</th>
              <th className="px-3 py-3 w-[13%] min-w-[120px]">
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                  <span>Medicină Muncii</span>
                </span>
              </th>
              <th className="px-3 py-3 w-[12%] min-w-[110px]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Instruire SSM</span>
                </span>
              </th>
              <th className="px-3 py-3 w-[12%] min-w-[110px]">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Instruire PSI</span>
                </span>
              </th>
              <th className="px-3 py-3 w-[12%] min-w-[110px]">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Curs Igienă</span>
                </span>
              </th>
              <th className="px-3 py-3 w-[8%] min-w-[80px]">Status</th>
              <th className="px-4 py-3 w-[10%] min-w-[150px] text-right">Acțiuni & Documente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredEmployees.map((emp) => {
              const comp = emp.compliance;
              const isExpanded = expandedEmployeeIds.has(emp.id);

              return (
                <React.Fragment key={emp.id}>
                  <tr className={`transition hover:bg-slate-50/70 ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                    {/* Salariat & Detalii de bază */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {emp.lastName} {emp.firstName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {!isSsmRole && (
                          <>
                            <span className="font-mono">{emp.cnp || '—'}</span>
                            <span>•</span>
                          </>
                        )}
                        <span className="truncate max-w-[160px] font-medium text-slate-700">
                          {emp.currentJob?.title || 'Fără post'}
                        </span>
                      </div>
                      {emp.currentWorksite && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {emp.currentWorksite.name}
                        </div>
                      )}
                    </td>

                    {/* Stare Generală Agregată */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <OverallComplianceBadge status={comp.overallStatus} size="sm" />
                    </td>

                    {/* 1. Medicină a Muncii */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <ComplianceItemBadge item={comp.occupationalMedicine} showSubtext={true} />
                      {emp.medicalFitnessVerdict && (
                        <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                          Aviz: {emp.medicalFitnessVerdict}
                        </div>
                      )}
                    </td>

                    {/* 2. Instruire SSM */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <ComplianceItemBadge item={comp.ssmTraining} showSubtext={true} />
                    </td>

                    {/* 3. Instruire PSI */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <ComplianceItemBadge item={comp.psiTraining} showSubtext={true} />
                    </td>

                    {/* 4. Curs Igienă (Condițional) */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {comp.hygieneCertificate ? (
                        <ComplianceItemBadge item={comp.hygieneCertificate} showSubtext={true} />
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Neaplicabil</span>
                      )}
                    </td>

                    {/* Status HR (ACTIV / SUSPENDAT / PLECAT) */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          emp.status === 'ACTIV'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : emp.status === 'Suspendat/CM'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>

                    {/* Acțiuni & Buton Extindere Drawer */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <EditEmployeeModal
                          employeeId={emp.id}
                          employeeName={`${emp.lastName} ${emp.firstName}`}
                          jobs={client.jobs}
                          worksites={client.worksites}
                          userRole={userRole}
                          isSsmRole={isSsmRole}
                        />

                        <button
                          type="button"
                          onClick={() => toggleExpand(emp.id)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition shadow-2xs cursor-pointer ${
                            isExpanded
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                          title={
                            isExpanded
                              ? 'Restrânge panoul de documente și acțiuni'
                              : 'Deschide panoul cu documentele ce pot fi generate pentru acest salariat'
                          }
                        >
                          <FileText className={`w-3.5 h-3.5 ${isExpanded ? 'text-white' : 'text-blue-600'}`} />
                          <span>Documente</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-white' : 'text-slate-400'
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Collapsible Drawer Sub-Row */}
                  {isExpanded && (
                    <tr key={`${emp.id}-drawer`} className="bg-slate-50/70 border-b border-slate-200">
                      <td colSpan={8} className="p-3 sm:p-4">
                        <EmployeeDocumentsDrawer
                          employee={{
                            id: emp.id,
                            firstName: emp.firstName,
                            lastName: emp.lastName,
                            fullName: `${emp.lastName} ${emp.firstName}`,
                            cnp: emp.cnp,
                            status: emp.status,
                            currentJob: emp.currentJob,
                            currentWorksite: emp.currentWorksite,
                            commuteTransport: emp.commuteTransport,
                            commuteDurationMinutes: emp.commuteDurationMinutes,
                            commuteRoute: emp.commuteRoute,
                            residenceAddress: emp.residenceAddress,
                          }}
                          clientId={client.id}
                          clientName={client.name}
                          userRole={userRole}
                          eipCatalog={eipCatalog}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
