'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, X, ShieldAlert, AlertTriangle, Check, Loader2, Trash2, Sparkles } from 'lucide-react';
import { calculatePecePartialRisk } from '@/lib/risk/caen-risk-presets';
import { findCorRiskProfile } from '@/lib/risk/cor-risk-presets';

interface RiskItemData {
  id?: string;
  hazard: string;
  riskSituation: string;
  consequence: string;
  severityScore?: number | null;
  probabilityScore?: number | null;
  riskLevel?: number | null;
  sortOrder?: number;
}

interface PreventionMeasureData {
  id?: string;
  riskItemId?: string | null;
  description: string;
  measureType: string;
  responsiblePerson?: string | null;
  deadline?: string | null;
  status?: string;
}

interface HazardZoneData {
  id?: string;
  zoneName: string;
  location: string;
  hazardDescription: string;
  safetyMeasures: string;
}

interface RiskAssessmentData {
  id: string;
  title: string;
  evaluatorName?: string | null;
  conclusions?: string | null;
  status: string;
  client: { id: string; name: string; caenCode?: string | null };
  job?: { id: string; title: string; corCode?: string | null } | null;
  riskItems?: RiskItemData[];
  preventionMeasures?: PreventionMeasureData[];
  hazardZones?: HazardZoneData[];
}

interface EditRiskAssessmentModalProps {
  assessment: RiskAssessmentData;
}

export function EditRiskAssessmentModal({ assessment }: EditRiskAssessmentModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCorInfo, setAppliedCorInfo] = useState<{
    title: string;
    corCode: string;
    factorsCount: number;
  } | null>(null);

  const [title, setTitle] = useState(assessment.title || '');
  const [evaluatorName, setEvaluatorName] = useState(assessment.evaluatorName || '');
  const [conclusions, setConclusions] = useState(assessment.conclusions || '');
  const [status, setStatus] = useState(assessment.status || 'active');

  const [items, setItems] = useState<RiskItemData[]>(
    assessment.riskItems && assessment.riskItems.length > 0
      ? assessment.riskItems
      : [
          {
            hazard: 'Factor general de risc',
            riskSituation: 'EXECUTANT',
            consequence: 'ITM 3-45 zile',
            severityScore: 3,
            probabilityScore: 2,
            riskLevel: 2,
          },
        ]
  );

  const [measures, setMeasures] = useState<PreventionMeasureData[]>(
    assessment.preventionMeasures || []
  );

  const [hazardZones, setHazardZones] = useState<HazardZoneData[]>(
    assessment.hazardZones || []
  );

  function handleAutoPopulateCor() {
    const jobTitle = assessment.job?.title || assessment.title;
    const corCode = assessment.job?.corCode;
    const profile = findCorRiskProfile({ corCode, jobTitle });
    if (!profile || !profile.factors || profile.factors.length === 0) {
      setError(`Nu s-a găsit profil de risc predefinit pentru ${jobTitle}.`);
      return;
    }

    const newItems: RiskItemData[] = profile.factors.map((f, idx) => ({
      hazard: f.hazard,
      riskSituation: f.riskSituation,
      consequence: f.consequence,
      severityScore: f.severityScore,
      probabilityScore: f.probabilityScore,
      riskLevel: f.riskLevel,
      sortOrder: idx + 1,
    }));

    const newMeasures: PreventionMeasureData[] = profile.factors.map((f) => ({
      description: f.measure.description,
      measureType: f.measure.measureType,
      responsiblePerson: f.measure.responsiblePerson,
      deadline: f.measure.deadline,
      status: 'planificat',
    }));

    setItems(newItems);
    setMeasures(newMeasures);
    setConclusions(
      `Nivelul global de risc calculat conform metodei INCDPM pentru postul de ${assessment.job?.title || profile.title} (${profile.title} - COR ${profile.corCode}) este de ${profile.globalRiskScore.toFixed(2)}, încadrându-se în categoria locurilor de muncă cu risc acceptabil (Nrg <= 3.50). Măsurile din Planul de Prevenire și Protecție asigură controlul factorilor identificați.`
    );
    setAppliedCorInfo({
      title: profile.title,
      corCode: profile.corCode,
      factorsCount: profile.factors.length,
    });
    setError(null);
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        hazard: '',
        riskSituation: 'EXECUTANT',
        consequence: 'ITM 3-45 zile',
        severityScore: 3,
        probabilityScore: 2,
        riskLevel: calculatePecePartialRisk(3, 2),
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof RiskItemData, value: any) {
    setItems((prev) => {
      const copy = [...prev];
      const cur = { ...copy[idx], [field]: value };
      if (field === 'severityScore' || field === 'probabilityScore') {
        const s = Number(cur.severityScore) || 3;
        const p = Number(cur.probabilityScore) || 2;
        cur.riskLevel = calculatePecePartialRisk(s, p);
      }
      copy[idx] = cur;
      return copy;
    });
  }

  function addMeasure() {
    setMeasures((prev) => [
      ...prev,
      {
        description: '',
        measureType: 'tehnica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'Permanent',
      },
    ]);
  }

  function removeMeasure(idx: number) {
    setMeasures((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMeasure(idx: number, field: keyof PreventionMeasureData, value: any) {
    setMeasures((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Titlul evaluării este obligatoriu.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/risk-assessments/${assessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          evaluatorName: evaluatorName.trim() || null,
          conclusions: conclusions.trim() || null,
          status,
          items,
          measures,
          hazardZones,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la actualizarea dosarului.');
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare neașteptată.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Sigur doriți să ștergeți evaluarea "${assessment.title}"?`)) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/risk-assessments/${assessment.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la ștergerea evaluării.');
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la ștergere.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 text-xs"
      >
        <Edit2 className="w-3.5 h-3.5" />
        <span>Editează</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full my-4 sm:my-8 overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Editează Dosar Evaluare: {assessment.title}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[82dvh] sm:max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Titlu Evaluare *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Evaluator SSM
                  </label>
                  <input
                    type="text"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Factori de Risc ({items.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoPopulateCor}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Preia Riscuri COR ({assessment.job?.title || 'Post'})</span>
                    </button>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                    >
                      + Adaugă Factor
                    </button>
                  </div>
                </div>

                {appliedCorInfo && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        S-au preluat <strong>{appliedCorInfo.factorsCount} factori de risc</strong> și măsurile aferente din profilul COR <strong>{appliedCorInfo.corCode}</strong> ({appliedCorInfo.title}).
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600">#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Denumire factor..."
                          value={it.hazard}
                          onChange={(e) => updateItem(idx, 'hazard', e.target.value)}
                          className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                        />
                        <select
                          value={it.riskSituation}
                          onChange={(e) => updateItem(idx, 'riskSituation', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="EXECUTANT">Executant</option>
                          <option value="SARCINA">Sarcina</option>
                          <option value="MIJLOACE">Mijloace</option>
                          <option value="MEDIU">Mediu</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Consecință..."
                          value={it.consequence}
                          onChange={(e) => updateItem(idx, 'consequence', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white sm:col-span-2"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Grav (1-7):</span>
                          <input
                            type="number"
                            min="1"
                            max="7"
                            value={it.severityScore || 3}
                            onChange={(e) => updateItem(idx, 'severityScore', Number(e.target.value))}
                            className="w-12 text-xs border border-slate-300 rounded px-1.5 py-1 text-center bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">Prob (1-6):</span>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={it.probabilityScore || 2}
                            onChange={(e) => updateItem(idx, 'probabilityScore', Number(e.target.value))}
                            className="w-12 text-xs border border-slate-300 rounded px-1.5 py-1 text-center bg-white"
                          />
                          <span className="font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs">
                            R = {it.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Measures */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Măsuri din Planul de Prevenire ({measures.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addMeasure}
                    className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                  >
                    + Adaugă Măsură
                  </button>
                </div>

                <div className="space-y-2">
                  {measures.map((m, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={m.measureType}
                          onChange={(e) => updateMeasure(idx, 'measureType', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                        >
                          <option value="tehnica">Măsură Tehnică</option>
                          <option value="organizatorica">Măsură Organizatorică</option>
                          <option value="igienico-sanitara">Măsură Igienico-Sanitară</option>
                          <option value="alta">Altă Natură</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeMeasure(idx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Descriere măsură..."
                        value={m.description}
                        onChange={(e) => updateMeasure(idx, 'description', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Responsabil..."
                          value={m.responsiblePerson || ''}
                          onChange={(e) => updateMeasure(idx, 'responsiblePerson', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Termen..."
                          value={m.deadline || ''}
                          onChange={(e) => updateMeasure(idx, 'deadline', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusions */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  Concluzii Evaluator
                </label>
                <textarea
                  rows={2}
                  value={conclusions}
                  onChange={(e) => setConclusions(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Șterge Evaluarea</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isDeleting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Se actualizează...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvează Modificările</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
