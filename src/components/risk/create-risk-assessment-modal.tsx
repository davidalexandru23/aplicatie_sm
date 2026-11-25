'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, ShieldAlert, AlertTriangle, Check, Loader2, Trash2, Building2, Briefcase } from 'lucide-react';
import { CAEN_RISK_PROFILES, calculatePecePartialRisk } from '@/lib/risk/caen-risk-presets';
import { findCorRiskProfile, CorRiskProfile } from '@/lib/risk/cor-risk-presets';

function extractCaenCode(raw?: unknown): string {
  if (!raw) return '6201';
  const str = String(raw).trim();
  const match = str.match(/\b\d{4}\b/);
  return match ? match[0] : (str.slice(0, 4) || '6201');
}

interface ClientItem {
  id: string;
  name: string;
  caenCode?: string | null;
  jobs?: {
    id: string;
    title: string;
    corCode?: string | null;
    mainActivities?: string | null;
  }[];
}

interface CreateRiskAssessmentModalProps {
  clients: ClientItem[];
}

interface RiskItemRow {
  hazard: string;
  riskSituation: string; // EXECUTANT, SARCINA, MIJLOACE, MEDIU
  consequence: string;
  severityScore: number;
  probabilityScore: number;
  riskLevel: number;
}

interface MeasureRow {
  itemIndex: number;
  description: string;
  measureType: string; // tehnica, organizatorica, igienico-sanitara, alta
  responsiblePerson: string;
  deadline: string;
}

interface HazardZoneRow {
  zoneName: string;
  location: string;
  hazardDescription: string;
  safetyMeasures: string;
}

export function CreateRiskAssessmentModal({ clients }: CreateRiskAssessmentModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [title, setTitle] = useState('Evaluarea Riscurilor Profesionale - 2026');
  const [evaluatorName, setEvaluatorName] = useState('Ing. Specialist Evaluator');
  const [method, setMethod] = useState('INCDPM');
  const [conclusions, setConclusions] = useState('');
  const [matchedProfile, setMatchedProfile] = useState<{
    title: string;
    corCode: string;
    factorsCount: number;
    globalRiskScore: number;
  } | null>(null);

  const [items, setItems] = useState<RiskItemRow[]>([
    {
      hazard: 'Efort vizual continuu la videoterminale (> 4 ore/zi)',
      riskSituation: 'SARCINA',
      consequence: 'Astenopie acomodativă, cefalee (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      riskLevel: 2,
    },
    {
      hazard: 'Poziție statică așezat prelungită pe scaun de birou',
      riskSituation: 'SARCINA',
      consequence: 'Dureri lombare, afecțiuni musculo-scheletice',
      severityScore: 3,
      probabilityScore: 3,
      riskLevel: 3,
    },
  ]);

  const [measures, setMeasures] = useState<MeasureRow[]>([
    {
      itemIndex: 0,
      description: 'Pauze vizuale regulate (10 min la fiecare 50 min)',
      measureType: 'organizatorica',
      responsiblePerson: 'Conducător loc de muncă',
      deadline: 'Permanent',
    },
    {
      itemIndex: 1,
      description: 'Scaune ergonomice reglabile cu suport lombar',
      measureType: 'tehnica',
      responsiblePerson: 'Administrator',
      deadline: 'Anual',
    },
  ]);

  const [hazardZones, setHazardZones] = useState<HazardZoneRow[]>([]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const availableJobs = selectedClient?.jobs || [];
  const selectedJob = availableJobs.find((j) => j.id === selectedJobId);

  function applyCorProfile(job: { id: string; title: string; corCode?: string | null }): boolean {
    const profile = findCorRiskProfile({ corCode: job.corCode, jobTitle: job.title });
    if (profile && profile.factors && profile.factors.length > 0) {
      const newItems: RiskItemRow[] = profile.factors.map((f) => ({
        hazard: f.hazard,
        riskSituation: f.riskSituation,
        consequence: f.consequence,
        severityScore: f.severityScore,
        probabilityScore: f.probabilityScore,
        riskLevel: f.riskLevel,
      }));

      const newMeasures: MeasureRow[] = profile.factors.map((f, idx) => ({
        itemIndex: idx,
        description: f.measure.description,
        measureType: f.measure.measureType,
        responsiblePerson: f.measure.responsiblePerson,
        deadline: f.measure.deadline,
      }));

      setItems(newItems);
      setMeasures(newMeasures);
      setConclusions(
        `Nivelul global de risc calculat conform metodei INCDPM pentru postul de ${job.title} (${profile.title} - COR ${profile.corCode}) este de ${profile.globalRiskScore.toFixed(2)}, încadrându-se în categoria locurilor de muncă cu risc acceptabil (Nrg <= 3.50). Măsurile din Planul de Prevenire și Protecție asigură controlul factorilor identificați.`
      );
      setMatchedProfile({
        title: profile.title,
        corCode: profile.corCode,
        factorsCount: profile.factors.length,
        globalRiskScore: profile.globalRiskScore,
      });
      setError(null);
      return true;
    }
    return false;
  }

  function handleClientChange(newClientId: string) {
    setSelectedClientId(newClientId);
    const cl = clients.find((c) => c.id === newClientId);
    if (cl && cl.jobs && cl.jobs.length > 0) {
      const firstJob = cl.jobs[0];
      setSelectedJobId(firstJob.id);
      setTitle(`Evaluarea Riscurilor Profesionale - ${firstJob.title}`);
      const matched = applyCorProfile(firstJob);
      if (!matched && cl.caenCode) {
        handleAutoPopulateCaen(cl.caenCode);
      }
    } else {
      setSelectedJobId('');
      setTitle(`Evaluarea Riscurilor Profesionale - ${cl?.name || ''}`);
      setMatchedProfile(null);
      if (cl?.caenCode) {
        handleAutoPopulateCaen(cl.caenCode);
      }
    }
  }

  function handleJobChange(newJobId: string) {
    setSelectedJobId(newJobId);
    if (!newJobId) {
      setTitle(`Evaluarea Riscurilor Profesionale - ${selectedClient?.name || ''}`);
      setMatchedProfile(null);
      return;
    }
    const j = availableJobs.find((item) => item.id === newJobId);
    if (j) {
      setTitle(`Evaluarea Riscurilor Profesionale - ${j.title}`);
      const applied = applyCorProfile(j);
      if (!applied && selectedClient?.caenCode) {
        handleAutoPopulateCaen();
      }
    }
  }

  function handleAutoPopulateCaen(overrideCaen?: string) {
    const rawCaen = overrideCaen || selectedClient?.caenCode;
    if (!rawCaen) {
      setError('Clientul selectat nu are cod CAEN configurat.');
      return;
    }
    const cleanCaen = extractCaenCode(rawCaen);
    const profile = CAEN_RISK_PROFILES[cleanCaen];
    if (!profile || !profile.factors || profile.factors.length === 0) {
      setError(`Nu s-a găsit profil predefinit pentru codul CAEN ${cleanCaen}.`);
      return;
    }

    const newItems: RiskItemRow[] = profile.factors.slice(0, 10).map((f) => ({
      hazard: f.riskFactor || f.manifestation,
      riskSituation: f.element,
      consequence: f.consequences,
      severityScore: f.severity,
      probabilityScore: f.probability,
      riskLevel: f.riskLevel,
    }));

    const newMeasures: MeasureRow[] = [];
    profile.factors.slice(0, 5).forEach((f, idx) => {
      newMeasures.push({
        itemIndex: idx,
        description: `Instruirea lucrătorilor privind riscul de: ${f.riskFactor || f.manifestation}`,
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'Trimestrial',
      });
    });

    setItems(newItems);
    setMeasures(newMeasures);
    setConclusions(
      `Nivelul global de risc estimat conform codului CAEN ${cleanCaen} este de ${profile.globalRiskScore.toFixed(2)}, încadrându-se în categoria locurilor de muncă cu risc acceptabil (Nrg <= 3.50). Măsurile din Planul de Prevenire și Protecție asigură controlul factorilor identificați.`
    );
    setMatchedProfile(null);
    setError(null);
  }

  function handleOpenModal() {
    setIsOpen(true);
    // If client has jobs, auto-populate the first job immediately
    if (selectedClient && selectedClient.jobs && selectedClient.jobs.length > 0) {
      const activeJob = selectedClient.jobs.find((j) => j.id === selectedJobId) || selectedClient.jobs[0];
      if (activeJob) {
        setSelectedJobId(activeJob.id);
        setTitle(`Evaluarea Riscurilor Profesionale - ${activeJob.title}`);
        applyCorProfile(activeJob);
      }
    } else if (selectedClient?.caenCode) {
      handleAutoPopulateCaen();
    }
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
    setMeasures((prev) =>
      prev
        .filter((m) => m.itemIndex !== idx)
        .map((m) => (m.itemIndex > idx ? { ...m, itemIndex: m.itemIndex - 1 } : m))
    );
  }

  function updateItem(idx: number, field: keyof RiskItemRow, value: any) {
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
        itemIndex: 0,
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

  function updateMeasure(idx: number, field: keyof MeasureRow, value: any) {
    setMeasures((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  function addHazardZone() {
    setHazardZones((prev) => [
      ...prev,
      {
        zoneName: `Zonă de risc #${prev.length + 1}`,
        location: '',
        hazardDescription: '',
        safetyMeasures: '',
      },
    ]);
  }

  function removeHazardZone(idx: number) {
    setHazardZones((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateHazardZone(idx: number, field: keyof HazardZoneRow, value: string) {
    setHazardZones((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Selectați o firmă.');
      return;
    }
    if (!title.trim()) {
      setError('Titlul evaluării este obligatoriu.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          jobId: selectedJobId || undefined,
          title: title.trim(),
          evaluatorName: evaluatorName.trim() || undefined,
          method,
          conclusions: conclusions.trim() || undefined,
          status: 'active',
          items,
          measures,
          hazardZones,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la crearea evaluării de risc.');
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare neașteptată.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>+ Creează Evaluare Nouă</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92dvh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Dosar Nou de Evaluare Riscuri (Legea 319/2006 & Metoda INCDPM)
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Date Antet & Identificare */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Identificare Firmă & Post Evaluat
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedJob && (
                      <button
                        type="button"
                        onClick={() => applyCorProfile(selectedJob)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-300 transition shadow-2xs"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                        <span>Preia Riscuri COR ({selectedJob.corCode || selectedJob.title})</span>
                      </button>
                    )}
                    {selectedClient?.caenCode && (
                      <button
                        type="button"
                        onClick={() => handleAutoPopulateCaen()}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-300 transition shadow-2xs"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Preia din Profil CAEN ({selectedClient.caenCode})</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Angajator / Client *
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.caenCode ? `(CAEN: ${c.caenCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Post de Lucru Evaluat
                    </label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => handleJobChange(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Toate posturile / Nivel firmă --</option>
                      {availableJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title} {j.corCode ? `(COR ${j.corCode})` : ''}
                        </option>
                      ))}
                    </select>
                    {matchedProfile && (
                      <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Autocompletat profil COR <strong>{matchedProfile.corCode}</strong> ({matchedProfile.title}): <strong>{matchedProfile.factorsCount} factori</strong> generați.
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                          Nrg estimat: {matchedProfile.globalRiskScore.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Titlu Dosar Evaluare *
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
                      Evaluator de Risc
                    </label>
                    <input
                      type="text"
                      value={evaluatorName}
                      onChange={(e) => setEvaluatorName(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Factori de Risc Identificați */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Factori de Risc Identificați ({items.length})
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Scară Gravitate 1-7, Probabilitate 1-6 conform metodei INCDPM Pece
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adaugă Factor</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">#{idx + 1}</span>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Factor de risc identificat..."
                            value={it.hazard}
                            onChange={(e) => updateItem(idx, 'hazard', e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white col-span-2"
                          />
                          <select
                            value={it.riskSituation}
                            onChange={(e) => updateItem(idx, 'riskSituation', e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                          >
                            <option value="EXECUTANT">Executant</option>
                            <option value="SARCINA">Sarcina de muncă</option>
                            <option value="MIJLOACE">Mijloace de producție</option>
                            <option value="MEDIU">Mediul de muncă</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Șterge factor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Consecință maximă previzibilă..."
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
                            value={it.severityScore}
                            onChange={(e) => updateItem(idx, 'severityScore', Number(e.target.value))}
                            className="w-12 text-xs border border-slate-300 rounded px-1.5 py-1 text-center bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-between sm:justify-start">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">Prob (1-6):</span>
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={it.probabilityScore}
                              onChange={(e) => updateItem(idx, 'probabilityScore', Number(e.target.value))}
                              className="w-12 text-xs border border-slate-300 rounded px-1.5 py-1 text-center bg-white"
                            />
                          </div>
                          <span className="font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs">
                            R = {it.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Măsuri de Prevenire & Protecție */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    3. Măsuri din Planul de Prevenire și Protecție ({measures.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addMeasure}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adaugă Măsură</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {measures.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={m.itemIndex}
                          onChange={(e) => updateMeasure(idx, 'itemIndex', Number(e.target.value))}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                        >
                          {items.map((it, itemIdx) => (
                            <option key={itemIdx} value={itemIdx}>
                              Pentru factorul #{itemIdx + 1}
                            </option>
                          ))}
                        </select>
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
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() => removeMeasure(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Descriere măsură concretă de prevenire..."
                        value={m.description}
                        onChange={(e) => updateMeasure(idx, 'description', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Persoană responsabilă (ex: Șef echipă, Specialist SSM)..."
                          value={m.responsiblePerson}
                          onChange={(e) => updateMeasure(idx, 'responsiblePerson', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Termen realizare (ex: Permanent, Trimestrial)..."
                          value={m.deadline}
                          onChange={(e) => updateMeasure(idx, 'deadline', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Zone cu Risc Ridicat și Specific */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    4. Zone cu Risc Ridicat și Specific ({hazardZones.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addHazardZone}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adaugă Zonă</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {hazardZones.map((hz, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Denumire zonă (ex: Tablou electric general)..."
                          value={hz.zoneName}
                          onChange={(e) => updateHazardZone(idx, 'zoneName', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white flex-1 font-semibold"
                        />
                        <input
                          type="text"
                          placeholder="Localizare..."
                          value={hz.location}
                          onChange={(e) => updateHazardZone(idx, 'location', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white w-48"
                        />
                        <button
                          type="button"
                          onClick={() => removeHazardZone(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Pericol grav și iminent..."
                          value={hz.hazardDescription}
                          onChange={(e) => updateHazardZone(idx, 'hazardDescription', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Măsuri de securitate specifice zonei..."
                          value={hz.safetyMeasures}
                          onChange={(e) => updateHazardZone(idx, 'safetyMeasures', e.target.value)}
                          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Concluzii Evaluator */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  5. Concluzii și Recomandări Evaluator
                </label>
                <textarea
                  rows={3}
                  value={conclusions}
                  onChange={(e) => setConclusions(e.target.value)}
                  placeholder="Concluzia sintetică privind nivelul global de risc și încadrarea în limitele acceptabile..."
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Se salvează dosarul...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvează Dosarul de Evaluare</span>
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
