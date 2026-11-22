'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMinus, X, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

export interface TerminateEmployeeModalProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    status?: string | null;
    hireDate?: string | Date | null;
  };
  triggerText?: string;
  triggerClassName?: string;
  triggerIcon?: boolean;
  onSuccess?: () => void;
}

const TERMINATION_REASONS = [
  { value: 'Acordul părților — Art. 55 lit. b Codul Muncii', label: 'Acordul părților (Art. 55 lit. b)' },
  { value: 'Demisie cu preaviz — Art. 81 alin. 1 Codul Muncii', label: 'Demisie cu preaviz (Art. 81 alin. 1)' },
  { value: 'Demisie fără preaviz — Art. 81 alin. 8 Codul Muncii', label: 'Demisie fără preaviz (Art. 81 alin. 8)' },
  { value: 'Încetare de drept — Art. 56 Codul Muncii', label: 'Încetare de drept (Art. 56)' },
  { value: 'Concediere motive neimputabile — Art. 65 Codul Muncii', label: 'Concediere neimputabilă (Art. 65)' },
  { value: 'Expirare contract determinat — Art. 82 Codul Muncii', label: 'Expirare contract determinat (Art. 82)' },
  { value: 'Pensionare pentru limită de vârstă', label: 'Pensionare limită de vârstă' },
  { value: 'ALTUL', label: 'Alt motiv (specificați)...' },
];

export function TerminateEmployeeModal({
  employee,
  triggerText = 'Încetare CIM',
  triggerClassName,
  triggerIcon = false,
  onSuccess,
}: TerminateEmployeeModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [leaveDate, setLeaveDate] = useState(todayStr);
  const [selectedReason, setSelectedReason] = useState(TERMINATION_REASONS[0].value);
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const isTerminated = employee.status === 'PLECAT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const finalReason = selectedReason === 'ALTUL' ? customReason.trim() : selectedReason;

    try {
      const res = await fetch(`/api/employees/${employee.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveDate,
          reason: finalReason || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'A apărut o eroare la încetarea contractului.');
      }

      setSuccessMessage('Contractul de muncă a fost încetat. Status: PLECAT.');
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        router.refresh();
        onSuccess?.();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare de comunicare cu serverul.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTerminated) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
        Contract Încetat
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setErrorMessage(null);
          setSuccessMessage(null);
        }}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition shadow-sm'
        }
        title="Încetare Contract Individual de Muncă (status PLECAT)"
      >
        <UserMinus className="w-3.5 h-3.5" />
        {!triggerIcon && <span>{triggerText}</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-rose-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-rose-300" />
                <div>
                  <h3 className="text-sm font-bold">Încetare Contract de Muncă</h3>
                  <p className="text-xs text-rose-200">
                    Salariat: <span className="font-semibold text-white">{employee.lastName} {employee.firstName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-rose-300 hover:text-white transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Alert Warning */}
              <div className="flex items-start gap-2.5 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <span className="font-bold">Efecte statutare ale încetării contractului:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-rose-700">
                    <li>Salariatul va fi transferat definitiv în status <span className="font-bold">PLECAT</span>.</li>
                    <li>Este exclus automat din calculul de conformitate SSM/PSI al firmei.</li>
                    <li>Generarea documentelor operaționale va fi blocată conform legii.</li>
                  </ul>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Data Încetării */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Încetării Contractului (Ultima zi de lucru) *
                </label>
                <input
                  type="date"
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Temei Legal / Motiv */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temei Legal / Motiv Încetare *
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  {TERMINATION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedReason === 'ALTUL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specificați Motivul Încetării *
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="ex: Decizie internă, acord..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Observații adiționale */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observații / Mențiuni HR
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: Restituire echipament de protecție individuală confirmată..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Se procesează...</span>
                    </>
                  ) : (
                    <span>Confirmă Încetarea Contractului</span>
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
