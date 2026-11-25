'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, X, Briefcase, ShieldAlert, AlertTriangle, Check, Loader2, Trash2 } from 'lucide-react';

interface EipItem {
  id: string;
  code: string;
  name: string;
  standardCode?: string | null;
  protectionType?: string | null;
  replacementMonths: number;
}

interface JobData {
  id: string;
  title: string;
  corCode?: string | null;
  mainActivities?: string | null;
  equipmentUsed?: string | null;
  workConditions?: string | null;
  workersCount?: number | null;
  isFoodHandling?: boolean;
  isScreenWork?: boolean;
  isDrivingRequired?: boolean;
  noiseExposed?: boolean;
  chemicalExposed?: boolean;
  vibrationExposed?: boolean;
  heightWork?: boolean;
  workPosture?: string | null;
  maxWeightKg?: number | null;
  eipRequirements?: { eipItemId: string }[];
}

interface EditJobModalProps {
  clientId: string;
  job: JobData;
  eipCatalog: EipItem[];
}

export function EditJobModal({ clientId, job, eipCatalog }: EditJobModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job metadata
  const [title, setTitle] = useState(job.title || '');
  const [corCode, setCorCode] = useState(job.corCode || '');
  const [mainActivities, setMainActivities] = useState(job.mainActivities || '');
  const [equipmentUsed, setEquipmentUsed] = useState(job.equipmentUsed || '');
  const [workConditions, setWorkConditions] = useState(job.workConditions || '');
  const [workersCount, setWorkersCount] = useState(job.workersCount ? String(job.workersCount) : '');

  // Statutory risk flags
  const [isFoodHandling, setIsFoodHandling] = useState(Boolean(job.isFoodHandling));
  const [isScreenWork, setIsScreenWork] = useState(Boolean(job.isScreenWork));
  const [isDrivingRequired, setIsDrivingRequired] = useState(Boolean(job.isDrivingRequired));
  const [noiseExposed, setNoiseExposed] = useState(Boolean(job.noiseExposed));
  const [chemicalExposed, setChemicalExposed] = useState(Boolean(job.chemicalExposed));
  const [vibrationExposed, setVibrationExposed] = useState(Boolean(job.vibrationExposed));
  const [heightWork, setHeightWork] = useState(Boolean(job.heightWork));

  // Ergonomic
  const [workPosture, setWorkPosture] = useState<string>(job.workPosture || '');
  const [maxWeightKg, setMaxWeightKg] = useState(job.maxWeightKg != null ? String(job.maxWeightKg) : '');

  // EIP Items
  const initialEipIds = (job.eipRequirements || []).map((r) => r.eipItemId);
  const [selectedEipIds, setSelectedEipIds] = useState<string[]>(initialEipIds);

  function toggleEip(id: string) {
    setSelectedEipIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Denumirea postului este obligatorie.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          corCode: corCode.trim() || null,
          mainActivities: mainActivities.trim() || null,
          equipmentUsed: equipmentUsed.trim() || null,
          workConditions: workConditions.trim() || null,
          workersCount: workersCount ? Number(workersCount) : null,
          isFoodHandling,
          isScreenWork,
          isDrivingRequired,
          noiseExposed,
          chemicalExposed,
          vibrationExposed,
          heightWork,
          workPosture: workPosture || null,
          maxWeightKg: maxWeightKg !== '' ? Number(maxWeightKg) : null,
          eipItemIds: selectedEipIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la actualizarea postului.');
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
    if (!confirm(`Sigur doriți să ștergeți postul "${job.title}"?`)) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/jobs/${job.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la ștergerea postului.');
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
        title="Editează post și flaguri risc"
        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Editează Post: {job.title}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Informații Generale */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Informații Generale Post
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Denumire Post / Funcție *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cod COR (opțional)
                    </label>
                    <input
                      type="text"
                      value={corCode}
                      onChange={(e) => setCorCode(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Număr Aproximativ Lucrători
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={workersCount}
                      onChange={(e) => setWorkersCount(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Echipamente / Utilaje Folosite
                    </label>
                    <input
                      type="text"
                      value={equipmentUsed}
                      onChange={(e) => setEquipmentUsed(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Activități Principale
                  </label>
                  <textarea
                    rows={2}
                    value={mainActivities}
                    onChange={(e) => setMainActivities(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Flaguri de Risc Statutar (HG 355/2007) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Factori de Risc Statutari (Medicina Muncii & EIP)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFoodHandling}
                      onChange={(e) => setIsFoodHandling(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Manipulare Alimente</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 210 (copro, exsudat)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isScreenWork}
                      onChange={(e) => setIsScreenWork(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Lucru la Ecran (&gt;4h/zi)</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 243 (oftalmologie)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDrivingRequired}
                      onChange={(e) => setIsDrivingRequired(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Conducere Auto Serviciu</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 209 (aviz psihologic)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noiseExposed}
                      onChange={(e) => setNoiseExposed(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Zgomot (&gt;80 dB(A))</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 138 (audiometrie)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chemicalExposed}
                      onChange={(e) => setChemicalExposed(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Agenți Chimici Periculoși</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 141 (toxicologie)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vibrationExposed}
                      onChange={(e) => setVibrationExposed(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Vibrații Mecanice</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 140 (neurologie)</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={heightWork}
                      onChange={(e) => setHeightWork(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Lucru la Înălțime (&gt;2m)</div>
                      <div className="text-[10px] text-slate-500">HG 355/2007 Fișa 203 (EEG, EKG, glicemie)</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Ergonomie & Efort */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Ergonomie & Manipulare Mase (HG 1051/2006)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Postură Predominantă de Lucru
                    </label>
                    <select
                      value={workPosture}
                      onChange={(e) => setWorkPosture(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Nespecificat --</option>
                      <option value="sitting">Așezat pe scaun (sitting)</option>
                      <option value="standing">Ortostatic / În picioare (standing)</option>
                      <option value="mixed">Mixt (așezat + în picioare)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Greutate Maximă Manipulată Manual (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={maxWeightKg}
                      onChange={(e) => setMaxWeightKg(e.target.value)}
                      placeholder="ex: 15"
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dotare EIP Statutară (HG 1048/2006) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Normativ de Dotare EIP Obligatoriu (HG 1048/2006)
                </h4>
                {eipCatalog.length === 0 ? (
                  <div className="text-xs text-slate-400">Nu există articole în catalogul EIP.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-lg">
                    {eipCatalog.map((item) => {
                      const isChecked = selectedEipIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isChecked
                              ? 'border-indigo-400 bg-indigo-50/50 text-indigo-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEip(item.id)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{item.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{item.standardCode || 'Standard intern'}</span>
                              <span>•</span>
                              <span>{item.replacementMonths} luni</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
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
                  <span>Șterge Post</span>
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
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
