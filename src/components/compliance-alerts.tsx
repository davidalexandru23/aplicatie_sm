'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  FileText, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { ComplianceStatus, formatRoDate } from '@/lib/compliance';

export interface FlatComplianceAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  clientId: string;
  clientName: string;
  jobTitle?: string;
  type: 'medical' | 'ssm' | 'psi' | 'hygiene';
  label: string;
  status: ComplianceStatus;
  dueDate: Date | null;
  daysRemaining: number | null;
  lastDate: Date | null;
  legalRef: string;
  notes?: string | null;
}

export interface ComplianceAlertsProps {
  overdueAlerts: FlatComplianceAlert[];
  upcomingAlerts: FlatComplianceAlert[];
  missingAlerts: FlatComplianceAlert[];
  totalActiveEmployees?: number;
}

type FilterType = 'all' | 'medical' | 'ssm' | 'psi' | 'hygiene';

export function ComplianceAlerts({
  overdueAlerts,
  upcomingAlerts,
  missingAlerts,
}: ComplianceAlertsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filterItem = (item: FlatComplianceAlert) => {
    if (filter === 'all') return true;
    return item.type === filter;
  };

  const filteredOverdue = overdueAlerts.filter(filterItem);
  const filteredUpcoming = upcomingAlerts.filter(filterItem);
  const filteredMissing = missingAlerts.filter(filterItem);

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Filtrează cerința legală:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toate ({overdueAlerts.length + upcomingAlerts.length + missingAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('medical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'medical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Medicină Muncii (HG 355)
          </button>
          <button
            type="button"
            onClick={() => setFilter('ssm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'ssm'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Instruire SSM (L319)
          </button>
          <button
            type="button"
            onClick={() => setFilter('psi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'psi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Instruire PSI (L307)
          </button>
          <button
            type="button"
            onClick={() => setFilter('hygiene')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'hygiene'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cursuri Igienă (Ord 2209)
          </button>
        </div>
      </div>

      {/* Grid: Overdue Alerts & Upcoming Scadente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: CRITICAL OVERDUE ALERTS */}
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-red-600 text-white rounded-lg shadow-sm">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-red-950 flex items-center gap-2">
                    <span>Alerte Critice — Termene Depășite</span>
                    <span className="text-xs bg-red-600 text-white font-mono px-2 py-0.5 rounded-full">
                      {filteredOverdue.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    Risc contravențional la control ITM / ISU (Legea 319/2006, HG 355/2007)
                  </p>
                </div>
              </div>
              <Link
                href="/employees?status=OVERDUE"
                className="text-xs text-red-700 hover:text-red-900 font-semibold flex items-center gap-1"
              >
                <span>Toți ({overdueAlerts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {filteredOverdue.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <div className="text-xs font-semibold text-slate-700">Felicitări! Fără termene depășite.</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Toate controalele medicale și instruirile sunt în termenul legal.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {filteredOverdue.map((alert) => (
                  <div key={alert.id} className="p-3.5 hover:bg-red-50/30 transition flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {alert.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{alert.clientName}</span>
                          {alert.jobTitle && (
                            <>
                              <span>•</span>
                              <span>{alert.jobTitle}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                        EXPIRAT ({Math.abs(alert.daysRemaining ?? 0)}z)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                      <span className="font-medium text-slate-700">
                        {alert.label} <span className="text-slate-400 font-normal">({alert.legalRef})</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        Scadență: <strong className="text-red-700 font-semibold">{formatRoDate(alert.dueDate)}</strong>
                      </span>
                    </div>

                    {alert.notes && (
                      <div className="text-[11px] text-red-600 italic bg-red-50/50 px-2 py-1 rounded">
                        {alert.notes}
                      </div>
                    )}

                    {/* Quick action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/clients/${alert.clientId}`}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition"
                      >
                        Dosar Client
                      </Link>
                      <Link
                        href={`/documents/generate?clientId=${alert.clientId}&employeeId=${alert.employeeId}`}
                        className="text-[11px] text-red-700 hover:text-red-900 font-semibold bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Generează Fișă / Document</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing Baseline Data Notice */}
          {filteredMissing.length > 0 && (
            <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>
                  Există <strong>{filteredMissing.length}</strong> cerințe necompletate (dosare inițiale lipsă).
                </span>
              </div>
              <Link
                href="/employees?status=MISSING"
                className="font-bold underline hover:text-rose-950 text-[11px]"
              >
                Vezi lipsuri
              </Link>
            </div>
          )}
        </div>

        {/* PANEL 2: UPCOMING SCADENTE (<= 30 DAYS) */}
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <span>Scadențe Iminente (&le; 30 Zile)</span>
                    <span className="text-xs bg-amber-500 text-white font-mono px-2 py-0.5 rounded-full">
                      {filteredUpcoming.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Necesită programare medicină sau planificare sesiune instruire
                  </p>
                </div>
              </div>
              <Link
                href="/employees?status=UPCOMING"
                className="text-xs text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1"
              >
                <span>Toți ({upcomingAlerts.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {filteredUpcoming.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <div className="text-xs font-semibold text-slate-700">Fără scadențe în următoarele 30 de zile.</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Planificările sunt la zi pentru toate firmele cliente.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {filteredUpcoming.map((alert) => (
                  <div key={alert.id} className="p-3.5 hover:bg-amber-50/30 transition flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {alert.employeeName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{alert.clientName}</span>
                          {alert.jobTitle && (
                            <>
                              <span>•</span>
                              <span>{alert.jobTitle}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                        {alert.daysRemaining === 0 ? 'AZI' : `${alert.daysRemaining} ZILE`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                      <span className="font-medium text-slate-700">
                        {alert.label} <span className="text-slate-400 font-normal">({alert.legalRef})</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        Scadență: <strong className="text-amber-800 font-semibold">{formatRoDate(alert.dueDate)}</strong>
                      </span>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {alert.type === 'ssm' || alert.type === 'psi' ? (
                        <Link
                          href={`/trainings`}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <span>Planifică Instruire</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : alert.type === 'hygiene' ? (
                        <Link
                          href={`/hygiene`}
                          className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <span>Înscrie la Curs Igienă</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          href={`/documents/generate?clientId=${alert.clientId}&employeeId=${alert.employeeId}`}
                          className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <span>Pregătește Fișă Solicitare</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
