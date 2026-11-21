'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Plus, Trash2, Calendar, CheckCircle2, AlertTriangle, Clock, X, RefreshCw } from 'lucide-react';
import { formatRoDate, addMonthsSafe, HYGIENE_MODULES } from '@/lib/compliance';

export interface HygieneModuleItem {
  id: string;
  moduleName: string;
  certificateNumber?: string | null;
  examDate: string | Date;
  issueDate?: string | Date | null;
  intervalMonths: number;
  notes?: string | null;
}

export interface ManageHygieneModulesModalProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    hygieneModules?: HygieneModuleItem[];
  };
  triggerClassName?: string;
  onSuccess?: () => void;
}

export function ManageHygieneModulesModal({
  employee,
  triggerClassName,
  onSuccess,
}: ManageHygieneModulesModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modules, setModules] = useState<HygieneModuleItem[]>(employee.hygieneModules || []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [moduleName, setModuleName] = useState<string>(HYGIENE_MODULES[0].name);
  const [examDate, setExamDate] = useState<string>(todayStr);
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [certificateNumber, setCertificateNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/hygiene-modules`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setModules(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    if (isOpen) {
      loadModules();
    }
  }, [isOpen, loadModules]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/employees/${employee.id}/hygiene-modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName,
          examDate,
          issueDate: issueDate || examDate,
          certificateNumber: certificateNumber.trim() || undefined,
          intervalMonths: 36, // Standard statutar 3 ani conform Ordin 2209/2022
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la salvarea cursului.');
      }

      setShowAddForm(false);
      setCertificateNumber('');
      setNotes('');
      await loadModules();
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Sigur doriți să ștergeți acest modul de igienă?')) return;
    try {
      const res = await fetch(`/api/employees/${employee.id}/hygiene-modules?moduleId=${moduleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadModules();
        router.refresh();
        onSuccess?.();
      }
    } catch {
      alert('Eroare la ștergerea modulului.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 transition'
        }
        title="Gestionează modulele de igienă ale salariatului (valabilitate 3 ani per modul)"
      >
        <Award className="w-3.5 h-3.5 text-purple-600" />
        <span>Igienă</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 flex items-center justify-center text-purple-300">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Module Curs Igienă (Ordin 2209/2022)</h3>
                  <p className="text-[11px] text-slate-300">
                    Salariat: <span className="font-semibold text-white">{employee.lastName} {employee.firstName}</span> • Valabilitate: 3 ani (36 luni) per modul
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Module List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Istoric Module Promovate ({modules.length})
                  </h4>
                  {!showAddForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adaugă Modul
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    Se încarcă modulele...
                  </div>
                ) : modules.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                    Niciun modul de igienă consemnat pentru acest salariat.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modules.map((m) => {
                      const exDate = m.examDate ? new Date(m.examDate) : null;
                      const dueDate = exDate ? addMonthsSafe(exDate, m.intervalMonths || 36) : null;
                      const now = new Date();
                      const daysRemaining = dueDate ? Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                      let statusBadge = {
                        label: 'VALID',
                        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        icon: CheckCircle2,
                      };
                      if (daysRemaining !== null) {
                        if (daysRemaining < 0) {
                          statusBadge = {
                            label: `EXPIRAT (${Math.abs(daysRemaining)}z)`,
                            bg: 'bg-rose-50 text-rose-700 border-rose-200',
                            icon: AlertTriangle,
                          };
                        } else if (daysRemaining <= 30) {
                          statusBadge = {
                            label: `SCADENT (${daysRemaining}z)`,
                            bg: 'bg-amber-50 text-amber-700 border-amber-200',
                            icon: Clock,
                          };
                        } else {
                          statusBadge = {
                            label: `VALID (${daysRemaining}z)`,
                            bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            icon: CheckCircle2,
                          };
                        }
                      }

                      const StatusIcon = statusBadge.icon;

                      return (
                        <div
                          key={m.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 shadow-sm transition space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900">{m.moduleName}</div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                <span>Examen: <strong>{formatRoDate(exDate)}</strong></span>
                                <span>Scadent (3 ani): <strong>{formatRoDate(dueDate)}</strong></span>
                                {m.certificateNumber && (
                                  <span>Adeverință DSP: <strong className="font-mono">#{m.certificateNumber}</strong></span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.bg}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusBadge.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteModule(m.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                title="Șterge modul"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {m.notes && (
                            <div className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                              {m.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Module Form */}
              {showAddForm && (
                <form onSubmit={handleAddModule} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      Înregistrează Modul Nou de Igienă
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Anulează
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Selectează Modulul *
                      </label>
                      <select
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        {HYGIENE_MODULES.map((hm) => (
                          <option key={hm.id} value={hm.name}>
                            {hm.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Data Examenului DSP *
                        </label>
                        <input
                          type="date"
                          required
                          value={examDate}
                          onChange={(e) => {
                            setExamDate(e.target.value);
                            if (!issueDate) setIssueDate(e.target.value);
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Număr Adeverință / Certificat DSP
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 881125 sau 881125BIS"
                          value={certificateNumber}
                          onChange={(e) => setCertificateNumber(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-[11px] flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-purple-700" />
                        Valabilitate legală: <strong>3 ani (36 luni)</strong>
                      </span>
                      <span className="text-[10px] text-purple-700">
                        Scadent la: {formatRoDate(examDate ? addMonthsSafe(new Date(examDate), 36) : null)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Observații / Notă
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Curs organizat prin DSP Sector 1"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
                      >
                        Renunță
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
                      >
                        {submitting ? 'Se salvează...' : 'Salvează Modul'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
