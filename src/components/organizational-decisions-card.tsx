'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck2,
  Calendar,
  UserCheck,
  HeartPulse,
  Flame,
  Users2,
  Download,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Save,
  X,
} from 'lucide-react';

export interface AppointeeEmployee {
  id: string;
  fullName: string;
  jobTitle?: string | null;
}

export interface OrganizationalDecisionsCardProps {
  clientId: string;
  initialData: {
    designatedWorkerSsm: string | null;
    firstAidResponder: string | null;
    psiResponder: string | null;
    investigationMembers: string | null;
    decisionsDate: string | null; // YYYY-MM-DD format
    legalRepresentative: string | null;
  };
  activeEmployees: AppointeeEmployee[];
  lastGeneratedDate?: string | null;
  lastGeneratedDocId?: string | null;
}

export function OrganizationalDecisionsCard({
  clientId,
  initialData,
  activeEmployees,
  lastGeneratedDate,
  lastGeneratedDocId,
}: OrganizationalDecisionsCardProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form values
  const [form, setForm] = useState({
    designatedWorkerSsm: initialData.designatedWorkerSsm || '',
    firstAidResponder: initialData.firstAidResponder || '',
    psiResponder: initialData.psiResponder || '',
    investigationMembers: initialData.investigationMembers || '',
    decisionsDate: initialData.decisionsDate || new Date().toISOString().split('T')[0],
  });

  // Latest generated document state
  const [downloadUrl, setDownloadUrl] = useState<string | null>(
    lastGeneratedDocId ? `/api/documents/${lastGeneratedDocId}/download` : null
  );
  const [generatedDate, setGeneratedDate] = useState<string | null>(lastGeneratedDate || null);

  const isConfigured = Boolean(
    form.designatedWorkerSsm &&
    form.firstAidResponder &&
    form.psiResponder &&
    form.investigationMembers &&
    form.decisionsDate
  );

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designatedWorkerSsm: form.designatedWorkerSsm,
          firstAidResponder: form.firstAidResponder,
          psiResponder: form.psiResponder,
          investigationMembers: form.investigationMembers,
          decisionsDate: form.decisionsDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la salvarea deciziilor.');
      }

      setSaveSuccess(true);
      setIsEditing(false);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare necunoscută la salvare.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Ensure latest form values are persisted first
      await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designatedWorkerSsm: form.designatedWorkerSsm,
          firstAidResponder: form.firstAidResponder,
          psiResponder: form.psiResponder,
          investigationMembers: form.investigationMembers,
          decisionsDate: form.decisionsDate || null,
        }),
      });

      // 2. Trigger generation of template decizii-angajator
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: 'decizii-angajator',
          clientId: clientId,
          operatorName: 'Operator Intern',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la generarea pachetului de decizii.');
      }

      setDownloadUrl(data.downloadUrl);
      setGeneratedDate(new Date().toLocaleDateString('ro-RO'));

      // 3. Initiate direct browser download
      if (typeof window !== 'undefined' && data.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la generare.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDateRo = (isoDate: string | null) => {
    if (!isoDate) return '—';
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
      return new Date(isoDate).toLocaleDateString('ro-RO');
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* 1. Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/75 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Decizii Organizatorice SSM & Situații de Urgență (01–09)
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {isConfigured ? 'Numiri Complete' : 'Configurare Parțială'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Numiri statutare conform Legii 319/2006 (art. 8, 10, 26) și Legii 307/2006 (art. 19).
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editează Numiri</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setForm({
                  designatedWorkerSsm: initialData.designatedWorkerSsm || '',
                  firstAidResponder: initialData.firstAidResponder || '',
                  psiResponder: initialData.psiResponder || '',
                  investigationMembers: initialData.investigationMembers || '',
                  decisionsDate: initialData.decisionsDate || '',
                });
                setIsEditing(false);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Anulează</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Se generează DOCX...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Generează Pachet Decizii 01–09 (DOCX)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Numirile organizatorice au fost salvate cu succes!</span>
        </div>
      )}

      {/* 3. Content Body (View Mode vs Edit Mode) */}
      <div className="p-6">
        {!isEditing ? (
          /* View Mode Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Data decizii */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Data Emiterii Deciziilor</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {formatDateRo(form.decisionsDate)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Tipărită pe toate deciziile (01–09 & 11)
              </div>
            </div>

            {/* Lucrător desemnat SSM */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold">Lucrător Desemnat SSM</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.designatedWorkerSsm || <span className="text-slate-400 italic">Nedesemnat</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Decizia 02 • Legea 319/2006 art. 8
              </div>
            </div>

            {/* Responsabil Prim Ajutor */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold">Responsabil Prim Ajutor</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.firstAidResponder || <span className="text-slate-400 italic">Nedesemnat</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Decizia 03 • Legea 319/2006 art. 10
              </div>
            </div>

            {/* Responsabil PSI */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold">Responsabil / Cadru Tehnic PSI</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.psiResponder || <span className="text-slate-400 italic">Nedesemnat</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Deciziile 06, 08 & 09 • Legea 307/2006
              </div>
            </div>

            {/* Comisie cercetare */}
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50/50 md:col-span-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Users2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold">Comisie Cercetare Evenimente & Accidente</span>
              </div>
              <div className="font-medium text-slate-900 text-sm">
                {form.investigationMembers || <span className="text-slate-400 italic">Nedesemnată</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Decizia 06 • Legea 319/2006 art. 26–29 (min. 2–3 persoane)
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data Emiterii */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Emiterii Deciziilor *
                </label>
                <input
                  type="date"
                  value={form.decisionsDate}
                  onChange={(e) => setForm({ ...form, decisionsDate: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Lucrător desemnat SSM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lucrător Desemnat SSM (Decizia 02) *
                </label>
                <div className="space-y-1.5">
                  <select
                    value={activeEmployees.some((e) => e.fullName === form.designatedWorkerSsm) ? form.designatedWorkerSsm : ''}
                    onChange={(e) => {
                      if (e.target.value) setForm({ ...form, designatedWorkerSsm: e.target.value });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Selectează din salariați --</option>
                    {initialData.legalRepresentative && (
                      <option value={initialData.legalRepresentative}>
                        {initialData.legalRepresentative} (Administrator / Reprezentant Legal)
                      </option>
                    )}
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.fullName}>
                        {emp.fullName} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.designatedWorkerSsm}
                    onChange={(e) => setForm({ ...form, designatedWorkerSsm: e.target.value })}
                    placeholder="Sau introdu manual numele lucrătorului desemnat..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Responsabil Prim Ajutor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsabil Prim Ajutor (Decizia 03) *
                </label>
                <select
                  value={form.firstAidResponder}
                  onChange={(e) => setForm({ ...form, firstAidResponder: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Alege salariat activ --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>
                      {emp.fullName} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                    </option>
                  ))}
                </select>
                {!activeEmployees.some((e) => e.fullName === form.firstAidResponder) && form.firstAidResponder && (
                  <input
                    type="text"
                    value={form.firstAidResponder}
                    onChange={(e) => setForm({ ...form, firstAidResponder: e.target.value })}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Responsabil PSI */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsabil / Cadru Tehnic PSI (Decizia 06, 09) *
                </label>
                <select
                  value={form.psiResponder}
                  onChange={(e) => setForm({ ...form, psiResponder: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Alege salariat activ --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>
                      {emp.fullName} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                    </option>
                  ))}
                </select>
                {!activeEmployees.some((e) => e.fullName === form.psiResponder) && form.psiResponder && (
                  <input
                    type="text"
                    value={form.psiResponder}
                    onChange={(e) => setForm({ ...form, psiResponder: e.target.value })}
                    className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Comisie Cercetare */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Comisie Cercetare Evenimente & Accidente (Decizia 06) *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.investigationMembers}
                    onChange={(e) => setForm({ ...form, investigationMembers: e.target.value })}
                    placeholder="Ex: Gheorghe Barbu, Elena Vasilescu, Ion Popescu (separate prin virgulă)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {activeEmployees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 self-center mr-1">Adaugă rapid:</span>
                      {activeEmployees.slice(0, 8).map((emp) => {
                        const isIncluded = form.investigationMembers
                          .split(',')
                          .map((s) => s.trim())
                          .includes(emp.fullName);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              const current = form.investigationMembers
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              if (isIncluded) {
                                setForm({
                                  ...form,
                                  investigationMembers: current.filter((n) => n !== emp.fullName).join(', '),
                                });
                              } else {
                                setForm({
                                  ...form,
                                  investigationMembers: [...current, emp.fullName].join(', '),
                                });
                              }
                            }}
                            className={`text-[11px] px-2 py-0.5 rounded border transition ${
                              isIncluded
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isIncluded ? `✓ ${emp.fullName}` : `+ ${emp.fullName}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Salvează Numirile</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Footer Generation Info */}
      <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {generatedDate ? (
              <>Ultimul pachet emis: <strong className="text-slate-700">{generatedDate}</strong></>
            ) : (
              'Niciun pachet de decizii emis încă pentru acest client.'
            )}
          </span>
        </div>

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descarcă Ultimul DOCX Emis</span>
          </a>
        )}
      </div>
    </div>
  );
}
