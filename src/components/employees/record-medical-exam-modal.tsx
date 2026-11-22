'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, X, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export interface RecordMedicalExamModalProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    medicalLastExamDate?: Date | string | null;
    medicalIntervalMonths?: number | null;
    medicalFitnessVerdict?: string | null;
    medicalNotes?: string | null;
    status?: string | null;
  };
  triggerText?: string;
  triggerClassName?: string;
  triggerIcon?: boolean;
  onSuccess?: () => void;
}

export function RecordMedicalExamModal({
  employee,
  triggerText = 'Examen Medical',
  triggerClassName,
  triggerIcon = false,
  onSuccess,
}: RecordMedicalExamModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [examDate, setExamDate] = useState(todayStr);
  const [intervalMonths, setIntervalMonths] = useState<number>(employee.medicalIntervalMonths || 12);
  const [verdict, setVerdict] = useState<string>('APT');
  const [restrictions, setRestrictions] = useState<string>('');
  const [clinicName, setClinicName] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/employees/${employee.id}/medical-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate,
          intervalMonths: Number(intervalMonths),
          verdict,
          fitnessVerdict: verdict,
          restrictions: restrictions.trim() || undefined,
          notes: restrictions.trim() || undefined,
          clinicName: clinicName.trim() || undefined,
          doctorName: doctorName.trim() || undefined,
          physicianName: doctorName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'A apărut o eroare la salvarea fișei de aptitudine.');
      }

      setSuccessMessage('Fișa de aptitudine a fost înregistrată cu succes!');
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
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition shadow-sm'
        }
        title="Înregistrează Fișă Aptitudine HG 355/2007"
      >
        <Stethoscope className="w-3.5 h-3.5" />
        {!triggerIcon && <span>{triggerText}</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold">Fișă de Aptitudine — HG 355/2007</h3>
                  <p className="text-xs text-slate-300">
                    Salariat: <span className="font-semibold text-white">{employee.lastName} {employee.firstName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Data Examen */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Examinării *
                  </label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    max={todayStr}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Periodicitate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periodicitate (Luni) *
                  </label>
                  <select
                    value={intervalMonths}
                    onChange={(e) => setIntervalMonths(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value={6}>6 luni (riscuri speciale)</option>
                    <option value={12}>12 luni (standard / anual)</option>
                    <option value={24}>24 luni (bienal)</option>
                  </select>
                </div>
              </div>

              {/* Verdict Medical */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verdict Aviz Medical (HG 355/2007) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'APT', label: 'APT', desc: 'Apt necondiționat', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
                    { value: 'APT_CONDITIONAT', label: 'APT CONDIȚIONAT', desc: 'Cu recomandări', color: 'border-amber-300 text-amber-800 bg-amber-50' },
                    { value: 'INAPT_TEMPORAR', label: 'INAPT TEMPORAR', desc: 'Suspendat temporar', color: 'border-orange-300 text-orange-800 bg-orange-50' },
                    { value: 'INAPT', label: 'INAPT', desc: 'Interdicție post', color: 'border-rose-300 text-rose-800 bg-rose-50' },
                  ].map((v) => (
                    <label
                      key={v.value}
                      className={`flex flex-col p-2 border rounded-lg cursor-pointer transition text-xs ${
                        verdict === v.value
                          ? `${v.color} ring-2 ring-blue-500 font-bold`
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="medicalVerdict"
                          value={v.value}
                          checked={verdict === v.value}
                          onChange={(e) => setVerdict(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>{v.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 pl-4">{v.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Restricții */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Restricții Medicale / Recomandări
                </label>
                <textarea
                  rows={2}
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  placeholder="ex: Fără lucru la înălțime, ochelari de corecție la ecran..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Clinică */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinică Medicină a Muncii
                  </label>
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="ex: Centrul Medical Unirea"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Medic */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medic Examinator
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="ex: Dr. Ionescu Radu"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Se salvează...</span>
                    </>
                  ) : (
                    <span>Salvează Examen Medical</span>
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
