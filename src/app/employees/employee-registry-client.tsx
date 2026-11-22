'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Users, 
  Search, 
  Filter, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  FileText,
  RotateCcw,
  Download,
  Navigation,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ComplianceStatus, 
  EmployeeComplianceSummary, 
  CompanyComplianceMetrics,
  formatRoDate 
} from '@/lib/compliance';
import { maskCNP } from '@/lib/security';
import { 
  ComplianceItemBadge, 
  OverallComplianceBadge,
  ComplianceScoreBadge 
} from '@/components/compliance-badge';
import {
  AddEmployeeModal,
  RecordMedicalExamModal,
  EditEmployeeModal,
  TerminateEmployeeModal,
  ManageHygieneModulesModal,
  EmployeeDocumentsDrawer,
} from '@/components/employees';

import { UserRole } from '@/lib/auth';

export interface EmployeeWithCompliance {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  cnp: string | null;
  status: string; // ACTIV / PLECAT / Suspendat/CM
  hireDate: string | null;
  leaveDate?: string | null;
  medicalLastExamDate?: string | null;
  medicalIntervalMonths?: number | null;
  medicalFitnessVerdict?: string | null;
  medicalNotes?: string | null;
  client: { id: string; name: string };
  currentJob: { id: string; title: string } | null;
  currentWorksite: { id: string; name: string } | null;
  identityDocument: { docType: string; series: string | null; number: string | null } | null;
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
  compliance: EmployeeComplianceSummary;
}

export interface EmployeeRegistryClientProps {
  employees: EmployeeWithCompliance[];
  clients: Array<{
    id: string;
    name: string;
    jobs?: Array<{ id: string; title: string }>;
    worksites?: Array<{ id: string; name: string }>;
  }>;
  metrics: CompanyComplianceMetrics;
  initialStatus?: string;
  userRole?: UserRole;
}

type TabType = 'ALL' | 'VALID' | 'UPCOMING' | 'OVERDUE' | 'MISSING' | 'PLECAT' | 'SUSPENDAT';

function EmployeeRegistryInner({
  employees,
  clients,
  metrics,
  initialStatus,
  userRole = 'ADMIN',
}: EmployeeRegistryClientProps) {
  const searchParams = useSearchParams();

  // Parse status parameter from URL or props
  const getInitialTab = (): TabType => {
    const param = (searchParams?.get('status') || searchParams?.get('filter') || initialStatus || '').toUpperCase();
    if (param === 'OVERDUE') return 'OVERDUE';
    if (param === 'UPCOMING') return 'UPCOMING';
    if (param === 'MISSING') return 'MISSING';
    if (param === 'VALID') return 'VALID';
    if (param === 'PLECAT' || param === 'INCETAT') return 'PLECAT';
    if (param === 'SUSPENDAT' || param === 'SUSPENDAT/CM' || param === 'CM') return 'SUSPENDAT';
    return 'ALL';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('ALL');
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

  // Sync if URL searchParams changes
  useEffect(() => {
    const param = (searchParams?.get('status') || searchParams?.get('filter') || '').toUpperCase();
    if (param === 'OVERDUE' || param === 'UPCOMING' || param === 'MISSING' || param === 'VALID' || param === 'SUSPENDAT' || param === 'PLECAT') {
      setActiveTab(param as TabType);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'ALL') {
        url.searchParams.delete('status');
        url.searchParams.delete('filter');
      } else {
        url.searchParams.set('status', tab);
        url.searchParams.delete('filter');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Counts for tabs (excluding PLECAT / SUSPENDAT from active compliance tabs)
  const tabCounts = useMemo(() => {
    const activeEmps = employees.filter((e) => e.status !== 'PLECAT' && e.status !== 'INCETAT' && e.status !== 'Suspendat/CM');
    const suspendatEmps = employees.filter((e) => e.status === 'Suspendat/CM');
    const plecatEmps = employees.filter((e) => e.status === 'PLECAT' || e.status === 'INCETAT');

    const counts = {
      ALL: activeEmps.length,
      VALID: 0,
      UPCOMING: 0,
      OVERDUE: 0,
      MISSING: 0,
      SUSPENDAT: suspendatEmps.length,
      PLECAT: plecatEmps.length,
    };

    for (const emp of activeEmps) {
      const st = emp.compliance.overallStatus;
      if (st in counts) {
        counts[st as keyof typeof counts]++;
      }
    }
    return counts;
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((emp) => {
      // 1. Tab filter & Status segregation
      if (activeTab === 'PLECAT') {
        if (emp.status !== 'PLECAT' && emp.status !== 'INCETAT') return false;
      } else if (activeTab === 'SUSPENDAT') {
        if (emp.status !== 'Suspendat/CM') return false;
      } else {
        if (emp.status === 'PLECAT' || emp.status === 'INCETAT' || emp.status === 'Suspendat/CM') return false;
        if (activeTab !== 'ALL' && emp.compliance.overallStatus !== activeTab) {
          return false;
        }
      }

      // 2. Client filter
      if (selectedClientId !== 'ALL' && emp.client.id !== selectedClientId) {
        return false;
      }

      // 3. Search query
      if (query) {
        const nameMatch = `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(query);
        const cnpMatch = (emp.cnp || '').toLowerCase().includes(query);
        const clientMatch = (emp.client.name || '').toLowerCase().includes(query);
        const jobMatch = (emp.currentJob?.title || '').toLowerCase().includes(query);
        const worksiteMatch = (emp.currentWorksite?.name || '').toLowerCase().includes(query);
        if (!nameMatch && !cnpMatch && !clientMatch && !jobMatch && !worksiteMatch) {
          return false;
        }
      }

      return true;
    });
  }, [employees, activeTab, selectedClientId, searchQuery]);

  const resetFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setSelectedClientId('ALL');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      url.searchParams.delete('filter');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Helper for overall compliance subtext
  const getSubtextAlert = (emp: EmployeeWithCompliance) => {
    const items = [
      emp.compliance.occupationalMedicine,
      emp.compliance.ssmTraining,
      emp.compliance.psiTraining,
    ];
    if (emp.compliance.hygieneCertificate) {
      items.push(emp.compliance.hygieneCertificate);
    }

    const overdueCount = items.filter((i) => i.status === 'OVERDUE').length;
    if (overdueCount > 0) {
      return `${overdueCount} ${overdueCount === 1 ? 'termen depășit' : 'termene depășite'}`;
    }

    const missingCount = items.filter((i) => i.status === 'MISSING').length;
    if (missingCount > 0) {
      return `${missingCount} ${missingCount === 1 ? 'cerință neînregistrată' : 'cerințe neînregistrate'}`;
    }

    const upcomingCount = items.filter((i) => i.status === 'UPCOMING').length;
    if (upcomingCount > 0) {
      return `${upcomingCount} ${upcomingCount === 1 ? 'scadență iminentă' : 'scadențe iminente'}`;
    }

    return 'Toate avizele la zi';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Strip */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Registrul Centralizat al Salariaților — Monitorizare Scadențe SSM</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Urmărirea conformității legale pe 4 dimensiuni normative: Medicină a Muncii (HG 355/2007), Instruire SSM (L319/2006), Instruire PSI (L307/2006) și Cursuri Igienă (Ord. 2209/2022).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddEmployeeModal clients={clients} userRole={userRole} isSsmRole={userRole === 'SSM'} />
          {(userRole === 'ADMIN' || userRole === 'HR') && (
            <Link
              href="/imports/new"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
            >
              <span>Import Registru Excel</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Bar (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Salariați */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Salariați</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {metrics.totalEmployees}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Înregistrați în toate companiile
          </div>
        </div>

        {/* Scor Conformitate SSM */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Conformitate Globală</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {metrics.complianceScorePercent}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.validCount} din {metrics.totalItemsTracked} cerințe conforme
          </div>
        </div>

        {/* Termene Depășite */}
        <div 
          onClick={() => handleTabChange('OVERDUE')}
          className="bg-white p-4 rounded-xl border border-red-200 hover:border-red-300 shadow-sm cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
            <span>Termene Depășite</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {tabCounts.OVERDUE}
          </div>
          <div className="text-[11px] text-red-600 font-medium mt-0.5">
            {metrics.overdueCount} cerințe expirate (Risc ITM)
          </div>
        </div>

        {/* Scadențe Iminente */}
        <div 
          onClick={() => handleTabChange('UPCOMING')}
          className="bg-white p-4 rounded-xl border border-amber-200 hover:border-amber-300 shadow-sm cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Scadențe Iminente (&le;30z)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {tabCounts.UPCOMING}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">
            {metrics.upcomingCount} examinări de planificat
          </div>
        </div>
      </div>

      {/* 3. Controls: Tabs, Search & Company Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Status Tabs with Dynamic Counters - Swipable on touch devices */}
          <div className="overflow-x-auto flex-nowrap sm:flex-wrap flex items-center gap-1.5 no-scrollbar pb-1 max-w-full">
            <button
              type="button"
              onClick={() => handleTabChange('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Toți ({tabCounts.ALL})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('VALID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'VALID'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conformi ({tabCounts.VALID})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'UPCOMING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scadenți curând ({tabCounts.UPCOMING})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'OVERDUE'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Termene depășite ({tabCounts.OVERDUE})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('MISSING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'MISSING'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Date lipsă ({tabCounts.MISSING})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('SUSPENDAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'SUSPENDAT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Suspendat/CM ({tabCounts.SUSPENDAT})</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('PLECAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                activeTab === 'PLECAT'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>Plecați / Arhivă ({tabCounts.PLECAT})</span>
            </button>
          </div>

          {/* Search & Company Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută salariat, CNP, post..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Client Dropdown Filter */}
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Toate companiile ({clients.length})</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table / Empty State */}
      {filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">
            Niciun salariat în categoria selectată
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Nu a fost găsit niciun dosar care să corespundă filtrelor aplicate (tab: {activeTab}, firmă: {selectedClientId !== 'ALL' ? 'selectată' : 'toate'}).
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetează filtrele</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full overscroll-x-contain touch-pan-x">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] px-4 sm:px-5 py-3 min-w-[170px]">
                    Salariat & Identitate
                  </th>
                  <th className="px-4 py-3 min-w-[150px]">Angajator & Post</th>
                  <th className="px-4 py-3 min-w-[110px]">Conformitate Generală</th>
                  <th className="px-4 py-3 min-w-[115px]">Medicină a Muncii</th>
                  <th className="px-4 py-3 min-w-[110px]">Instruire SSM</th>
                  <th className="px-4 py-3 min-w-[110px]">Instruire PSI/SU</th>
                  <th className="px-4 py-3 min-w-[100px]">Curs Igienă</th>
                  <th className="px-4 py-3 min-w-[140px] text-right">Acțiuni & Documente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => {
                  const comp = emp.compliance;
                  const alertSubtext = getSubtextAlert(emp);
                  const isExpanded = expandedEmployeeIds.has(emp.id);

                  return (
                    <React.Fragment key={emp.id}>
                      <tr className={`transition hover:bg-slate-50/70 ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                      {/* 1. Salariat & Identitate (Sticky on tablet horizontal scroll) */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] px-4 sm:px-5 py-3.5">
                        <div className="font-bold text-slate-900">
                          {emp.lastName} {emp.firstName}
                        </div>
                        {userRole !== 'SSM' && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{emp.cnp || '—'}</span>
                            {emp.identityDocument && (
                              <>
                                <span>•</span>
                                <span>
                                  {emp.identityDocument.docType} {emp.identityDocument.series || ''} {emp.identityDocument.number}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            emp.status === 'ACTIV'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : emp.status === 'Suspendat/CM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {emp.status}
                          </span>
                        </div>
                      </td>

                      {/* 2. Angajator & Post */}
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/clients/${emp.client.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {emp.client.name}
                        </Link>
                        <div className="text-[11px] text-slate-700 mt-0.5 font-medium truncate max-w-[160px]">
                          {emp.currentJob?.title || 'Fără funcție consemnată'}
                        </div>
                        {emp.currentWorksite && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                            {emp.currentWorksite.name}
                          </div>
                        )}
                      </td>

                      {/* 3. Conformitate Generală */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <OverallComplianceBadge status={comp.overallStatus} size="sm" />
                        <div className={`text-[10px] mt-1 font-medium ${
                          comp.overallStatus === 'OVERDUE'
                            ? 'text-red-600 font-semibold'
                            : comp.overallStatus === 'UPCOMING'
                            ? 'text-amber-600'
                            : comp.overallStatus === 'MISSING'
                            ? 'text-rose-700'
                            : 'text-emerald-600'
                        }`}>
                          {alertSubtext}
                        </div>
                      </td>

                      {/* 4. Medicină a Muncii (HG 355/2007) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.occupationalMedicine} 
                          showSubtext={true}
                        />
                        {emp.medicalFitnessVerdict && (
                          <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                            Aviz: {emp.medicalFitnessVerdict}
                          </div>
                        )}
                      </td>

                      {/* 5. Instruire SSM (L319/2006) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.ssmTraining} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 6. Instruire PSI/SU (L307/2006) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.psiTraining} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 7. Curs Igienă (Ord. 2209/2022) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {comp.hygieneCertificate ? (
                          <ComplianceItemBadge 
                            item={comp.hygieneCertificate} 
                            showSubtext={true}
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Neaplicabil
                          </span>
                        )}
                      </td>

                      {/* 8. Acțiuni & Documente */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditEmployeeModal
                            employeeId={emp.id}
                            employeeName={emp.fullName}
                            userRole={userRole}
                            isSsmRole={userRole === 'SSM'}
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
                            employee={emp}
                            clientId={emp.client.id}
                            clientName={emp.client.name}
                            userRole={userRole}
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
      )}
    </div>
  );
}

export function EmployeeRegistryClient(props: EmployeeRegistryClientProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Se încarcă registrul salariaților...</div>}>
      <EmployeeRegistryInner {...props} />
    </Suspense>
  );
}
