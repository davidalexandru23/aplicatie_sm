'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Building2, 
  Users, 
  Briefcase, 
  MapPin,
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <span>Import Registru Client SSM (Model_date_client_SSM.xlsx)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Încarcă fișierul furnizat de client pentru a verifica datele firmei, lista angajaților (inclusiv act de identitate și domiciliu) și contextul posturilor.
        </p>
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
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-lg cursor-pointer"
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
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Total Rânduri</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {previewResult.previewReport.summary.totalRows}
              </div>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <div className="text-xs font-medium text-emerald-700">Angajați Noi</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                +{previewResult.previewReport.summary.newCount}
              </div>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-sm">
              <div className="text-xs font-medium text-blue-700">Modificați</div>
              <div className="text-xl font-bold text-blue-700 mt-1">
                {previewResult.previewReport.summary.modifiedCount}
              </div>
            </div>
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-sm">
              <div className="text-xs font-medium text-rose-700">Erori Validare</div>
              <div className="text-xl font-bold text-rose-700 mt-1">
                {previewResult.previewReport.summary.errorCount}
              </div>
            </div>
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
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/75">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Previzualizare Angajați ({previewResult.previewReport.items.length})</span>
              </h3>
              <button
                onClick={handleCommit}
                disabled={committing || previewResult.previewReport.summary.newCount + previewResult.previewReport.summary.modifiedCount === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
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

            <div className="overflow-x-auto max-h-96">
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
                  {previewResult.previewReport.items.map((it: any) => (
                    <tr key={it.rowNumber} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-400">#{it.rowNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{it.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{it.cnpMasked}</td>
                      <td className="px-4 py-3 text-slate-700">{it.jobTitle}</td>
                      <td className="px-4 py-3 text-slate-700">{it.worksiteName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          it.status === 'NEW'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : it.status === 'MODIFIED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : it.status === 'ERROR'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {it.status === 'NEW' ? 'NOU' : it.status === 'MODIFIED' ? 'MODIFICAT' : it.status === 'ERROR' ? 'EROARE' : 'NESCHIMBAT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {it.errors.length > 0 ? (
                          <span className="text-rose-600 font-medium">{it.errors.join(', ')}</span>
                        ) : it.changes.length > 0 ? (
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
