'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpenCheck,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Flame,
  Building2,
  FileText,
} from 'lucide-react';
import { calculateItemCompliance, getStatusBadgeInfo } from '@/lib/compliance';

export interface TrainingPlannerEmployee {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string;
  status: string;
  currentJob?: { title: string } | null;
  ssmLastTrainingDate?: Date | string | null;
  psiLastTrainingDate?: Date | string | null;
  ssmIntervalMonths: number;
  psiIntervalMonths: number;
}

export interface TrainingPlannerClient {
  id: string;
  name: string;
  cui: string;
  ssmSpecialistName?: string | null;
  designatedWorkerSsm?: string | null;
  psiResponder?: string | null;
  employees: TrainingPlannerEmployee[];
}

export interface TrainingPlannerModalProps {
  clients: TrainingPlannerClient[];
  initialClientId?: string;
  triggerClassName?: string;
  triggerText?: string;
}

type TrainingType = 'INTRODUCTIV' | 'LOC_MUNCA' | 'PERIODIC_SSM' | 'PERIODIC_PSI';

const TRAINING_TYPES: Array<{
  id: TrainingType;
  title: string;
  lawReference: string;
  defaultDuration: number;
  category: 'SSM' | 'PSI';
}> = [
  {
    id: 'PERIODIC_SSM',
    title: 'Instruire Periodică SSM',
    lawReference: 'HG 1425/2006 art. 96–100 (min. 2h)',
    defaultDuration: 2,
    category: 'SSM',
  },
  {
    id: 'PERIODIC_PSI',
    title: 'Instruire Periodică PSI / Situații Urgență',
    lawReference: 'OMAI 712/2005 art. 30–45 (min. 2h)',
    defaultDuration: 2,
    category: 'PSI',
  },
  {
    id: 'LOC_MUNCA',
    title: 'Instruire la Locul de Muncă',
    lawReference: 'HG 1425/2006 art. 90–95 (min. 8h)',
    defaultDuration: 8,
    category: 'SSM',
  },
  {
    id: 'INTRODUCTIV',
    title: 'Instruire Introductiv-Generală',
    lawReference: 'Legea 319/2006 art. 20, HG 1425/2006 (min. 4h)',
    defaultDuration: 4,
    category: 'SSM',
  },
];

export function TrainingPlannerModal({
  clients,
  initialClientId,
  triggerClassName,
  triggerText = 'Planifică / Consemnează Instruire',
}: TrainingPlannerModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || (clients.length > 0 ? clients[0].id : '')
  );
  const [trainingType, setTrainingType] = useState<TrainingType>('PERIODIC_SSM');
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [durationHours, setDurationHours] = useState<number>(2);
  const [instructorName, setInstructorName] = useState<string>('');
  const [materialOrTopic, setMaterialOrTopic] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Find active client
  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const activeEmployees = (activeClient?.employees || []).filter((e) => e.status === 'ACTIV');

  // Update default duration & instructor when client or training type changes
  useEffect(() => {
    if (!activeClient) return;

    // Instructor default
    if (trainingType === 'PERIODIC_PSI') {
      setInstructorName(activeClient.psiResponder || activeClient.ssmSpecialistName || 'Cadru Tehnic PSI');
    } else {
      setInstructorName(activeClient.designatedWorkerSsm || activeClient.ssmSpecialistName || 'Specialist SSM');
    }

    // Default duration
    const matchType = TRAINING_TYPES.find((t) => t.id === trainingType);
    if (matchType) {
      setDurationHours(matchType.defaultDuration);
    }
  }, [selectedClientId, trainingType, activeClient]);

  // Reset selected employees when client changes
  const handleClientChange = (newClientId: string) => {
    setSelectedClientId(newClientId);
    setSelectedEmployeeIds([]);
    setErrorMessage(null);
  };

  const handleSelectAllEmployees = () => {
    setSelectedEmployeeIds(activeEmployees.map((e) => e.id));
  };

  const handleDeselectAllEmployees = () => {
    setSelectedEmployeeIds([]);
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedClientId) {
      setErrorMessage('Trebuie să selectați o firmă client.');
      setIsSubmitting(false);
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      setErrorMessage('Trebuie să selectați cel puțin un salariat participant.');
      setIsSubmitting(false);
      return;
    }

    if (!instructorName.trim()) {
      setErrorMessage('Numele instructorului este obligatoriu.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/trainings/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          trainingType,
          eventDate,
          durationHours: Number(durationHours),
          instructorName: instructorName.trim(),
          participantEmployeeIds: selectedEmployeeIds,
          materialOrTopic: materialOrTopic.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la înregistrarea instruirii.');
      }

      setSuccessMessage(
        `Instruirea a fost înregistrată cu succes! Scadențele a ${data.updatedEmployeesCount} salariați au fost actualizate la VALID.`
      );
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la înregistrare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition'
        }
      >
        <BookOpenCheck className="w-4 h-4" />
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Planifică / Consemnează Sesiune de Instruire SSM / PSI
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Înregistrează instruirea și resetează automat scadențele legale ale salariaților conform Legii 319/2006 și HG 1425/2006.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error & Success Banners */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* 1. Client Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Companie / Client Partener *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (CUI: {c.cui}) • {c.employees.filter((e) => e.status === 'ACTIV').length} angajați activi
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Training Type Radio Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Tip Instruire *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TRAINING_TYPES.map((t) => {
                    const isSelected = trainingType === t.id;
                    const isPsi = t.category === 'PSI';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTrainingType(t.id)}
                        className={`p-3 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                          isSelected
                            ? isPsi
                              ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                              : 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            {isPsi ? (
                              <Flame className="w-3.5 h-3.5 text-orange-500" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span className="text-xs font-bold text-slate-900">{t.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{t.lawReference}</p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isPsi
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.defaultDuration} ore
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Data Efectuării *
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Durată (ore) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Instructor / Formator *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nume formator..."
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 4. Topic / Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tematică / Material / Observații Consemnate
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Instruire periodică SSM - Măsuri de prevenire a accidentelor de muncă, acordarea primului ajutor și evacuare..."
                  value={materialOrTopic}
                  onChange={(e) => setMaterialOrTopic(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 5. Participants Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800">
                      Salariați Participanți ({selectedEmployeeIds.length} din {activeEmployees.length} selectați)
                    </label>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Resetează scadența la VALID
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllEmployees}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Selectează toți
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllEmployees}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      Deselectează
                    </button>
                  </div>
                </div>

                {activeEmployees.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    Niciun salariat activ găsit pentru această firmă.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {activeEmployees.map((emp) => {
                      const isChecked = selectedEmployeeIds.includes(emp.id);

                      // Determine compliance state for the relevant domain
                      const complianceItem =
                        trainingType === 'PERIODIC_PSI'
                          ? calculateItemCompliance(emp.psiLastTrainingDate, emp.psiIntervalMonths, 'PSI')
                          : calculateItemCompliance(emp.ssmLastTrainingDate, emp.ssmIntervalMonths, 'SSM');

                      const badge = getStatusBadgeInfo(complianceItem.status, complianceItem.daysRemaining);

                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer transition text-xs ${
                            isChecked ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleEmployee(emp.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {emp.lastName} {emp.firstName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {emp.currentJob?.title || 'Fără funcție specificată'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.className}`}
                            >
                              {badge.text}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedEmployeeIds.length === 0}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Se salvează și se resetează...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvează și Actualizează Scadențele Salariaților</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
