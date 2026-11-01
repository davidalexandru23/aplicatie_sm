'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  FileCheck, 
  Building2, 
  Users, 
  FileText, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  CheckCircle2 
} from 'lucide-react';

interface ClientOption {
  id: string;
  name: string;
  cui: string;
}

interface TemplateOption {
  id: string;
  code: string;
  name: string;
  family: string;
  format: string;
  contextLevel: string;
  manifestJson: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string;
  currentJob?: { title: string };
}

function DocumentGeneratorContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';
  const initialEmployeeId = searchParams.get('employeeId') || '';
  const initialTemplateCode = searchParams.get('templateCode') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>(initialTemplateCode);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<any | null>(null);

  // Load clients and templates
  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      });

    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      });
  }, []);

  // Load employees when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setEmployees([]);
      return;
    }
    fetch(`/api/clients/${selectedClientId}/employees`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data);
      });
  }, [selectedClientId]);

  const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
  const isEmployeeRequired = currentTemplate?.contextLevel === 'employee';

  const handleGenerate = async () => {
    if (!selectedClientId || !selectedTemplateCode) {
      setError('Selectează firma client și șablonul dorit.');
      return;
    }
    if (isEmployeeRequired && !selectedEmployeeId) {
      setError('Acest șablon este nominal și necesită selectarea unui salariat.');
      return;
    }

    setGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: selectedTemplateCode,
          clientId: selectedClientId,
          employeeId: selectedEmployeeId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la generarea documentului.');
      }

      setGenerationResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-blue-600" />
          <span>Generator de Documente SSM & Igienă</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Generează instant oricare dintre cele 25 de șabloane oficiale din datele înregistrate în baza de date PostgreSQL.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-sm text-rose-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Firma Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege firma --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (CUI: {c.cui})
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Șablon de Generat (din cele 25) *
            </label>
            <select
              value={selectedTemplateCode}
              onChange={(e) => setSelectedTemplateCode(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege șablonul --</option>
              {templates.map((t) => (
                <option key={t.code} value={t.code}>
                  [{t.family.toUpperCase()}] {t.name} ({t.format.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee Selection if template is employee-level */}
        {isEmployeeRequired && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Salariat Destinatar *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege salariatul din firmă --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.lastName} {emp.firstName} — {emp.currentJob?.title || 'Fără post'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current Template Details */}
        {currentTemplate && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="font-semibold text-slate-800">{currentTemplate.name}</div>
            <div className="text-slate-500">
              Format: <span className="font-bold uppercase text-slate-700">{currentTemplate.format}</span> • 
              Nivel: <span className="capitalize text-slate-700">{currentTemplate.contextLevel}</span> • 
              Familie: <span className="uppercase text-slate-700">{currentTemplate.family}</span>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedClientId || !selectedTemplateCode}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Se randează documentul...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Generează Document</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Result Banner */}
      {generationResult && (
        <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Document Generat cu Succes!
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  {generationResult.result.title}
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase ${
              generationResult.result.status === 'approved_for_print'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {generationResult.result.status === 'approved_for_print' ? 'Aprobat Tipărire' : 'Draft / Câmpuri Lipsă'}
            </span>
          </div>

          {generationResult.result.missingFields.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
              <div className="font-semibold mb-1">Câmpuri necompletate în dosar:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {generationResult.result.missingFields.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Mărime fișier: {(generationResult.result.fileSizeBytes / 1024).toFixed(1)} KB
            </span>
            <a
              href={generationResult.downloadUrl}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Descarcă Fișierul Generat</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 text-sm">Se încarcă generatorul...</div>}>
      <DocumentGeneratorContent />
    </Suspense>
  );
}
