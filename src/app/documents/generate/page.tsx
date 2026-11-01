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
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
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

interface HygieneParticipantOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface HygieneSessionOption {
  id: string;
  providerName: string;
  sessionDate: string;
  examDate: string;
  location: string;
  status: string;
  participants: HygieneParticipantOption[];
}

interface PlaceholderFieldItem {
  key: string;
  label: string;
  source: string;
  type: 'string' | 'date' | 'number' | 'boolean';
  required: boolean;
  value: string | number | boolean;
  isAutocompleted: boolean;
  defaultValue?: string | number | boolean;
}

function DocumentGeneratorContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';
  const initialEmployeeId = searchParams.get('employeeId') || '';
  const initialTemplateCode = searchParams.get('templateCode') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [hygieneSessions, setHygieneSessions] = useState<HygieneSessionOption[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>(initialTemplateCode);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId);
  const [selectedHygieneSessionId, setSelectedHygieneSessionId] = useState('');
  const [selectedHygieneParticipantId, setSelectedHygieneParticipantId] = useState('');

  // Dynamic fields state
  const [fields, setFields] = useState<PlaceholderFieldItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [showAutoFields, setShowAutoFields] = useState(false);

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

    fetch('/api/hygiene/sessions')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHygieneSessions(data);
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

  // Load dynamic template placeholders & pre-filled values
  useEffect(() => {
    if (!selectedClientId || !selectedTemplateCode) {
      setFields([]);
      setFormValues({});
      return;
    }

    setLoadingFields(true);
    const params = new URLSearchParams({
      clientId: selectedClientId,
    });
    if (selectedEmployeeId) params.append('employeeId', selectedEmployeeId);
    if (selectedHygieneSessionId) params.append('hygieneSessionId', selectedHygieneSessionId);
    if (selectedHygieneParticipantId) params.append('hygieneParticipantId', selectedHygieneParticipantId);

    fetch(`/api/templates/${selectedTemplateCode}/fields?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.fields)) {
          setFields(data.fields);
          const initialValues: Record<string, string> = {};
          data.fields.forEach((f: PlaceholderFieldItem) => {
            initialValues[f.key] = f.value !== undefined && f.value !== null ? String(f.value) : '';
          });
          setFormValues(initialValues);
        }
      })
      .catch((err) => {
        console.error('Failed to load template fields:', err);
      })
      .finally(() => {
        setLoadingFields(false);
      });
  }, [selectedClientId, selectedTemplateCode, selectedEmployeeId, selectedHygieneSessionId, selectedHygieneParticipantId]);

  const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
  const isEmployeeRequired = currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job';
  const isHygieneRequired = currentTemplate?.contextLevel === 'hygiene_session';
  const needsHygieneParticipant = selectedTemplateCode === 'hygiene-adeverinta';
  const selectedHygieneSession = hygieneSessions.find((session) => session.id === selectedHygieneSessionId);

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleGenerate = async () => {
    if (!selectedClientId || !selectedTemplateCode) {
      setError('Selectează firma client și șablonul dorit.');
      return;
    }
    if (isEmployeeRequired && !selectedEmployeeId) {
      setError('Acest șablon este nominal și necesită selectarea unui salariat.');
      return;
    }
    if (isHygieneRequired && !selectedHygieneSessionId) {
      setError('Selectează sesiunea de igienă folosită pentru document.');
      return;
    }
    if (needsHygieneParticipant && !selectedHygieneParticipantId) {
      setError('Selectează cursantul pentru adeverința nominală.');
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
          hygieneSessionId: selectedHygieneSessionId || undefined,
          hygieneParticipantId: selectedHygieneParticipantId || undefined,
          customFields: formValues,
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

  const autoCompletedCount = fields.filter((f) => f.isAutocompleted).length;
  const manualFields = fields.filter((f) => !f.isAutocompleted);
  const autoFields = fields.filter((f) => f.isAutocompleted);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span>Generator Oficial SSM & Igienă</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Autocompletare inteligentă a celor 25 de șabloane din datele firmei, salariaților și sesiunilor înregistrate.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>25 Șabloane Normate 100%</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-sm text-rose-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Selection */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Firma Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedEmployeeId('');
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege firma client --</option>
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
              Șablon Oficial (din cele 25) *
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
              {currentTemplate?.contextLevel === 'job' ? 'Salariat al cărui post se documentează *' : 'Salariat Destinatar *'}
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

        {/* Hygiene Selection */}
        {isHygieneRequired && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sesiune de igienă *</label>
              <select
                value={selectedHygieneSessionId}
                onChange={(e) => {
                  setSelectedHygieneSessionId(e.target.value);
                  setSelectedHygieneParticipantId('');
                }}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Alege sesiunea --</option>
                {hygieneSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {new Date(session.sessionDate).toLocaleDateString('ro-RO')} — {session.providerName} — {session.participants.length} cursanți
                  </option>
                ))}
              </select>
            </div>

            {needsHygieneParticipant && selectedHygieneSession && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cursant pentru adeverință *</label>
                <select
                  value={selectedHygieneParticipantId}
                  onChange={(e) => setSelectedHygieneParticipantId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Alege cursantul --</option>
                  {selectedHygieneSession.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.lastName} {participant.firstName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Fields Inspector & Customizer */}
        {currentTemplate && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Câmpuri și Placeholdere Șablon</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {loadingFields ? (
                    'Se calculează autocompletarea...'
                  ) : (
                    <span>
                      <strong className="text-emerald-700 font-semibold">{autoCompletedCount}</strong> câmpuri completate automat din BD •{' '}
                      <strong className="text-blue-700 font-semibold">{manualFields.length}</strong> câmpuri configurabile
                    </span>
                  )}
                </div>
              </div>

              {autoFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAutoFields(!showAutoFields)}
                  className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1 self-start sm:self-auto"
                >
                  {showAutoFields ? (
                    <>
                      <span>Ascunde datele automate</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Vezi datele automate ({autoCompletedCount})</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Configurable / Manual Fields Grid */}
            {manualFields.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <span>Câmpuri specifice de completat / ajustat pentru acest document:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {manualFields.slice(0, 20).map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-700 truncate" title={field.key}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={formValues[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={`Introduceți ${field.label.toLowerCase()}...`}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Auto Fields */}
            {showAutoFields && autoFields.length > 0 && (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Date preluate automat din registrul firmei / salariatului:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {autoFields.map((field) => (
                    <div key={field.key} className="text-[11px] bg-white p-2 rounded border border-emerald-100">
                      <div className="text-slate-500 truncate" title={field.key}>{field.label}</div>
                      <div className="font-semibold text-slate-800 truncate" title={String(formValues[field.key])}>
                        {formValues[field.key] || <span className="text-amber-600 italic">Lipsă în BD</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Format ieșire: <span className="font-bold uppercase text-slate-700">{currentTemplate?.format || 'DOCX'}</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedClientId || !selectedTemplateCode}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Se generează...</span>
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

      {/* Generation Result Card */}
      {generationResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{generationResult.result.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generat cu succes • Mărime: {(generationResult.result.fileSizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  generationResult.result.status === 'approved_for_print'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {generationResult.result.status === 'approved_for_print'
                  ? 'GATA DE TIPĂRIRE'
                  : 'DATE INCOMPLETE'}
              </span>
            </div>
          </div>

          {generationResult.result.missingFields && generationResult.result.missingFields.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Câmpuri rămase necompletate (apar vizibile în document):</span>
              </div>
              <p className="text-[11px] text-amber-700">
                {generationResult.result.missingFields.join(', ')}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <a
              href={generationResult.downloadUrl}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descarcă Documentul</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-sm">
          Se încarcă generatorul de documente...
        </div>
      }
    >
      <DocumentGeneratorContent />
    </Suspense>
  );
}
