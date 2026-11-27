'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Building2, 
  Users, 
  RefreshCw
} from 'lucide-react';

interface ClientItem {
  id: string;
  name: string;
  cui: string;
}

export default function NewImportPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'ERROR' | 'NEW' | 'MODIFIED'>('ALL');

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch((err) => console.error('Failed to load clients', err));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setPreviewResult(null);
    setActiveFilterTab('ALL');

    // Auto-generate preview
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selected);
    if (selectedClientId) formData.append('clientId', selectedClientId);

    try {
      const res = await fetch('/api/imports/preview', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la generarea preview-ului.');
      }
      setPreviewResult(data);
      if (data.clientId && !selectedClientId) {
        setSelectedClientId(data.clientId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult) return;
    setCommitting(true);
    setError(null);

    try {
      const res = await fetch('/api/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId || previewResult.clientId,
          parsedData: previewResult.parsedData,
          filename: previewResult.filename,
          operatorName: 'Operator Intern',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la confirmarea importului.');
      }

      // Redirecționare către dosarul clientului
      router.push(`/clients/${data.clientId}?imported=true`);
    } catch (err: any) {
      setError(err.message);
      setCommitting(false);
    }
  };

  const filteredItems = previewResult?.previewReport?.items?.filter((it: any) => {
    if (activeFilterTab === 'ALL') return true;
    if (activeFilterTab === 'ERROR') return it.status === 'ERROR';
    if (activeFilterTab === 'NEW') return it.status === 'NEW';
    if (activeFilterTab === 'MODIFIED') return it.status === 'MODIFIED';
    return true;
  }) || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Download Toolbar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Import registru Excel</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Încarcă fișierul completat de client pentru a importa sau actualiza datele firmei și ale salariaților.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <a
              href="/api/imports/template?type=empty"
              download="Model_date_client_SSM_sablon_gol.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Șablon gol (.xlsx)</span>
            </a>
            <a
              href="/api/imports/template?type=sample"
              download="Model_date_client_SSM_exemplu_completat.xlsx"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Exemplu completat (.xlsx)</span>
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-sm text-rose-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload & Options Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selectează Clientul Existent (opțional)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full min-h-[40px] text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Detectare automată din CUI sau Firmă Nouă --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (CUI: {c.cui})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Dacă lași necompletat, aplicația identifică firma automat din celula CUI a fișierului.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fișier Registru Excel (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading || committing}
              className="w-full min-h-[40px] text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Se analizează și validează registrul Excel...</span>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {previewResult && (
        <div className="space-y-6">
          {/* Dynamic Information Banners */}
          {previewResult.previewReport.summary.errorCount > 0 &&
            (previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount > 0) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs leading-relaxed shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Import parțial:</span>{' '}
                  Au fost găsite <strong>{previewResult.previewReport.summary.errorCount} rânduri cu erori</strong>.
                  La confirmare se vor salva doar cele{' '}
                  <strong>{previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount} rânduri valide</strong>{' '}
                  ({previewResult.previewReport.summary.newCount} noi, {previewResult.previewReport.summary.modifiedCount} modificate), iar rândurile cu erori vor fi omise.
                </div>
              </div>
          )}

          {previewResult.previewReport.summary.errorCount === 0 &&
            (previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount > 0) && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 text-xs leading-relaxed shadow-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Fișier validat:</span>{' '}
                  Toate cele <strong>{previewResult.previewReport.summary.totalRows} rânduri</strong> sunt valide și pot fi salvate în dosarul firmei.
                </div>
              </div>
          )}

          {previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount === 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs leading-relaxed shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Nu există date de salvat:</span>{' '}
                {previewResult.previewReport.summary.errorCount > 0 ? (
                  <>Toate cele <strong>{previewResult.previewReport.summary.errorCount} rânduri</strong> au erori de validare. Verifică tab-ul <em>Erori</em> și corectează fișierul înainte de reîncărcare.</>
                ) : (
                  <>Toate înregistrările din fișier sunt deja identice cu cele din baza de date.</>
                )}
              </div>
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveFilterTab('ALL')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                activeFilterTab === 'ALL'
                  ? 'bg-slate-50 border-slate-400 ring-2 ring-slate-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              } shadow-sm`}
            >
              <div className="text-xs font-medium text-slate-500">Total Rânduri</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {previewResult.previewReport.summary.totalRows}
              </div>
            </button>
            <button
              onClick={() => setActiveFilterTab('NEW')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                activeFilterTab === 'NEW'
                  ? 'bg-emerald-100/60 border-emerald-400 ring-2 ring-emerald-400/20'
                  : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
              } shadow-sm`}
            >
              <div className="text-xs font-medium text-emerald-700">Angajați Noi</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                +{previewResult.previewReport.summary.newCount}
              </div>
            </button>
            <button
              onClick={() => setActiveFilterTab('MODIFIED')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                activeFilterTab === 'MODIFIED'
                  ? 'bg-blue-100/60 border-blue-400 ring-2 ring-blue-400/20'
                  : 'bg-blue-50/50 border-blue-200 hover:border-blue-300'
              } shadow-sm`}
            >
              <div className="text-xs font-medium text-blue-700">Modificați</div>
              <div className="text-xl font-bold text-blue-700 mt-1">
                {previewResult.previewReport.summary.modifiedCount}
              </div>
            </button>
            <button
              onClick={() => setActiveFilterTab('ERROR')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                activeFilterTab === 'ERROR'
                  ? 'bg-rose-100/60 border-rose-400 ring-2 ring-rose-400/20'
                  : 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
              } shadow-sm`}
            >
              <div className="text-xs font-medium text-rose-700">Erori Validare</div>
              <div className="text-xl font-bold text-rose-700 mt-1">
                {previewResult.previewReport.summary.errorCount}
              </div>
            </button>
          </div>

          {/* Company Details detected */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Date Angajator Identificate</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Denumire firmă:</span>
                <div className="font-semibold text-slate-900">{previewResult.previewReport.company.name || '—'}</div>
              </div>
              <div>
                <span className="text-slate-400">CUI:</span>
                <div className="font-semibold text-slate-900">{previewResult.previewReport.company.cui || '—'}</div>
              </div>
              <div>
                <span className="text-slate-400">Sediu social:</span>
                <div className="font-semibold text-slate-900">{previewResult.previewReport.company.address || '—'}</div>
              </div>
              <div>
                <span className="text-slate-400">Reprezentant:</span>
                <div className="font-semibold text-slate-900">{previewResult.previewReport.company.legalRepresentative || '—'}</div>
              </div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/75">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Previzualizare Angajați ({previewResult.previewReport.items.length})</span>
              </h3>
              <button
                onClick={handleCommit}
                disabled={committing || previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount === 0}
                className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Se salvează...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirmă și Salvează în Baza de Date</span>
                  </>
                )}
              </button>
            </div>

            {/* Interactive Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-6 py-2.5 bg-slate-50/50">
              <button
                onClick={() => setActiveFilterTab('ALL')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilterTab === 'ALL'
                    ? 'bg-white dark:bg-[#2563eb] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-blue-400/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Toate</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeFilterTab === 'ALL' ? 'bg-slate-100 dark:bg-blue-700/60 text-slate-600 dark:text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {previewResult.previewReport.items.length}
                </span>
              </button>

              <button
                onClick={() => setActiveFilterTab('ERROR')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilterTab === 'ERROR'
                    ? 'bg-rose-50 text-rose-800 shadow-sm border border-rose-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Erori</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  previewResult.previewReport.summary.errorCount > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-500'
                }`}>
                  {previewResult.previewReport.summary.errorCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilterTab('NEW')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilterTab === 'NEW'
                    ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Noi</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-mono">
                  {previewResult.previewReport.summary.newCount}
                </span>
              </button>

              <button
                onClick={() => setActiveFilterTab('MODIFIED')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilterTab === 'MODIFIED'
                    ? 'bg-blue-50 text-blue-800 shadow-sm border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Modificați</span>
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-mono">
                  {previewResult.previewReport.summary.modifiedCount}
                </span>
              </button>
            </div>

            <div className="overflow-x-auto overscroll-x-contain touch-pan-x max-h-96">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-4 py-3">Rând</th>
                    <th className="px-4 py-3">Nume & Prenume</th>
                    <th className="px-4 py-3">CNP (Mascat)</th>
                    <th className="px-4 py-3">Funcție / Post</th>
                    <th className="px-4 py-3">Punct de Lucru</th>
                    <th className="px-4 py-3">Stare</th>
                    <th className="px-4 py-3">Diferențe / Observații</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredItems.map((it: any) => (
                    <tr
                      key={it.rowNumber}
                      className={`transition ${
                        it.status === 'ERROR'
                          ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          {it.status === 'ERROR' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                          <span>#{it.rowNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{it.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{it.cnpMasked}</td>
                      <td className="px-4 py-3 text-slate-700">{it.jobTitle}</td>
                      <td className="px-4 py-3 text-slate-700">{it.worksiteName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          it.status === 'NEW'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : it.status === 'MODIFIED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : it.status === 'ERROR'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {it.status === 'ERROR' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                          <span>{it.status === 'NEW' ? 'NOU' : it.status === 'MODIFIED' ? 'MODIFICAT' : it.status === 'ERROR' ? 'EROARE' : 'NESCHIMBAT'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {it.errors && it.errors.length > 0 ? (
                          <div className="space-y-1">
                            {it.errors.map((err: string, i: number) => (
                              <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600 flex-shrink-0 mt-0.5" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        ) : it.changes && it.changes.length > 0 ? (
                          <div className="space-y-0.5">
                            {it.changes.map((c: any, i: number) => (
                              <div key={i} className="text-[11px]">
                                <span className="font-medium text-slate-700">{c.field}:</span>{' '}
                                <span className="line-through text-slate-400">{c.oldVal}</span> →{' '}
                                <span className="font-semibold text-blue-600">{c.newVal}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Nu există înregistrări în categoria selectată ({activeFilterTab === 'ALL' ? 'Toate' : activeFilterTab === 'ERROR' ? 'Erori' : activeFilterTab === 'NEW' ? 'Noi' : 'Modificați'}).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
