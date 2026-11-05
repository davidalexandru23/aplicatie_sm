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
  ChevronUp,
  Briefcase
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
  currentJobId?: string | null;
  currentJob?: {
    id?: string;
    title: string;
    corCode?: string | null;
    mainActivities?: string | null;
  } | null;
}

interface JobOption {
  id: string;
  title: string;
  corCode?: string;
  mainActivities?: string;
}

interface HygieneParticipantOption {
  id: string;
  firstName: string;
  lastName: string;
  clientName?: string;
  employeeId?: string;
  employee?: {
    clientId: string;
  };
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
  const initialHygieneSessionId = searchParams.get('hygieneSessionId') || '';
  const initialHygieneParticipantId = searchParams.get('hygieneParticipantId') || '';
  const initialJobId = searchParams.get('jobId') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [hygieneSessions, setHygieneSessions] = useState<HygieneSessionOption[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>(initialTemplateCode);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedHygieneSessionId, setSelectedHygieneSessionId] = useState<string>(initialHygieneSessionId);
  const [selectedHygieneParticipantId, setSelectedHygieneParticipantId] = useState<string>(initialHygieneParticipantId);
  const [hygieneScope, setHygieneScope] = useState<'client' | 'session'>(initialHygieneSessionId ? 'session' : 'client');

  // Dynamic fields state
  const [fields, setFields] = useState<PlaceholderFieldItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [showAutoFields, setShowAutoFields] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<any | null>(null);

  // Sync with searchParams on load/update
  useEffect(() => {
    if (initialClientId) setSelectedClientId(initialClientId);
    if (initialTemplateCode) setSelectedTemplateCode(initialTemplateCode);
    if (initialEmployeeId) setSelectedEmployeeId(initialEmployeeId);
    if (initialHygieneSessionId) {
      setSelectedHygieneSessionId(initialHygieneSessionId);
      setHygieneScope('session');
    }
    if (initialHygieneParticipantId) setSelectedHygieneParticipantId(initialHygieneParticipantId);
  }, [initialClientId, initialTemplateCode, initialEmployeeId, initialHygieneSessionId, initialHygieneParticipantId]);

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

  const currentTemplate = templates.find((t) => t.code === selectedTemplateCode);
  const isHygieneTemplate =
    currentTemplate?.family === 'hygiene' ||
    currentTemplate?.contextLevel === 'hygiene_session' ||
    selectedTemplateCode.startsWith('hygiene-');
  const isEmployeeRequired =
    !isHygieneTemplate &&
    (currentTemplate?.contextLevel === 'employee' || currentTemplate?.contextLevel === 'job');
  const isAdeverinta = selectedTemplateCode === 'hygiene-adeverinta';

  // Load employees & jobs when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setEmployees([]);
      setJobs([]);
      setSelectedJobId('');
      return;
    }
    fetch(`/api/clients/${selectedClientId}/employees`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data);
      });

    fetch(`/api/clients/${selectedClientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
            setSelectedJobId(data.jobs[0].id);
          }
        }
      });
  }, [selectedClientId, isEmployeeRequired]);

  // When selected employee changes, update job automatically from employee's assigned job
  useEffect(() => {
    if (selectedEmployeeId && employees.length > 0) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      const jobId = emp?.currentJobId || (emp?.currentJob as any)?.id || '';
      setSelectedJobId(jobId);
    } else if (isEmployeeRequired && !selectedEmployeeId) {
      setSelectedJobId('');
    }
  }, [selectedEmployeeId, employees, isEmployeeRequired]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const filteredSessions = hygieneSessions.filter((session) => {
    if (!selectedClient) return true;
    return session.participants.some(
      (p: any) =>
        p.employee?.clientId === selectedClientId ||
        (p.clientName && p.clientName.toLowerCase() === selectedClient.name.toLowerCase())
    );
  });
  const displayedSessions = filteredSessions.length > 0 ? filteredSessions : hygieneSessions;
  const selectedHygieneSession = hygieneSessions.find((session) => session.id === selectedHygieneSessionId);

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
    if (selectedJobId) params.append('jobId', selectedJobId);
    if (!isHygieneTemplate || hygieneScope === 'session') {
      if (selectedHygieneSessionId) params.append('hygieneSessionId', selectedHygieneSessionId);
      if (selectedHygieneParticipantId) params.append('hygieneParticipantId', selectedHygieneParticipantId);
    }

    fetch(`/api/templates/${selectedTemplateCode}/fields?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.fields)) {
          // Filter out repetitive array tokens (_001 - _115) from manual input fields
          const cleanFields = data.fields.filter(
            (f: PlaceholderFieldItem) => !/_\d{2,3}$/.test(f.key)
          );
          setFields(cleanFields);
          const initialValues: Record<string, string> = {};
          cleanFields.forEach((f: PlaceholderFieldItem) => {
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
  }, [
    selectedClientId,
    selectedTemplateCode,
    selectedEmployeeId,
    selectedJobId,
    selectedHygieneSessionId,
    selectedHygieneParticipantId,
    hygieneScope,
    isHygieneTemplate,
  ]);

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

    if (isHygieneTemplate) {
      if (hygieneScope === 'session') {
        if (!selectedHygieneSessionId) {
          setError('Selectează sesiunea de igienă folosită pentru document.');
          return;
        }
        if (isAdeverinta && !selectedHygieneParticipantId) {
          setError('Selectează cursantul din sesiune pentru adeverința nominală.');
          return;
        }
      } else {
        // Scope A: Client-wide
        if (isAdeverinta && !selectedEmployeeId) {
          setError('Selectează salariatul firmei pentru care se eliberează adeverința nominală.');
          return;
        }
      }
    } else if (isEmployeeRequired && !selectedEmployeeId) {
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
          jobId: selectedJobId || undefined,
          hygieneSessionId: (isHygieneTemplate && hygieneScope === 'client') ? undefined : (selectedHygieneSessionId || undefined),
          hygieneParticipantId: (isHygieneTemplate && hygieneScope === 'client') ? undefined : (selectedHygieneParticipantId || undefined),
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

  const cleanFields = fields.filter((f) => !/_\d{2,3}$/.test(f.key));
  const autoCompletedCount = cleanFields.filter((f) => f.isAutocompleted).length;
  const manualFields = cleanFields.filter((f) => !f.isAutocompleted);
  const autoFields = cleanFields.filter((f) => f.isAutocompleted);

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
            Autocompletare inteligentă a celor 31 de șabloane statutare din datele firmei, salariaților și sesiunilor înregistrate.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>31 Șabloane Normate 100%</span>
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
                setSelectedHygieneParticipantId('');
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
              Șablon Oficial ({templates.length || 31} disponibile) *
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

        {/* Employee Selection for employee-level templates (Postul se preia automat, fără select) */}
        {isEmployeeRequired && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Salariat Destinatar *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                const empId = e.target.value;
                setSelectedEmployeeId(empId);
                const emp = employees.find((x) => x.id === empId);
                setSelectedJobId(emp?.currentJobId || (emp?.currentJob as any)?.id || '');
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege salariatul din firmă --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.lastName} {emp.firstName} — {emp.currentJob?.title || 'Fără post'}
                </option>
              ))}
            </select>

            {/* Preluare automată a postului salariatului */}
            {selectedEmployeeId && (() => {
              const emp = employees.find((x) => x.id === selectedEmployeeId);
              if (emp?.currentJob?.title) {
                return (
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 border border-blue-200/90 rounded-lg text-xs text-blue-900">
                    <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-blue-950">Post preluat automat din fișa salariatului: </span>
                      <span className="font-medium">{emp.currentJob.title}</span>
                      {emp.currentJob.corCode && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-[11px]">
                          COR {emp.currentJob.corCode}
                        </span>
                      )}
                      <span className="text-blue-700 ml-2 text-[11px] block sm:inline">
                        (Atribuțiile, condițiile și cerințele specifice postului sunt sincronizate automat)
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Salariatul selectat nu are un post asociat în profil. Se vor utiliza datele generale ale firmei.
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Job / Funcție Selector (DOAR pentru documente de nivel companie/evaluare riscuri unde nu este implicat un angajat individual) */}
        {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Funcție / Post de Lucru (opțional - pentru evaluarea riscurilor sau instructaj specific postului)
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege postul / funcția (opțional) --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} {j.corCode ? `(COR ${j.corCode})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scope Selector for Hygiene Templates */}
        {isHygieneTemplate && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Regim de generare document igienă (Domeniu / Scop) *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHygieneScope('client');
                    setSelectedHygieneSessionId('');
                    setSelectedHygieneParticipantId('');
                  }}
                  className={`p-3 text-left rounded-lg border transition ${
                    hygieneScope === 'client'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hygieneScope"
                      checked={hygieneScope === 'client'}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Scope A: Toți salariații firmei
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Evidență completă conform cerințelor DSVSA / DSP. Asamblează automat toți salariații firmei selectate.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setHygieneScope('session')}
                  className={`p-3 text-left rounded-lg border transition ${
                    hygieneScope === 'session'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="hygieneScope"
                      checked={hygieneScope === 'session'}
                      onChange={() => {}}
                      className="text-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Scope B: Sesiune specifică de instruire
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 pl-5">
                    Generare legată de o sesiune de curs și examen susținut în fața comisiei DSP.
                  </p>
                </button>
              </div>
            </div>

            {/* Scope A: Adeverinta needs employee selection */}
            {hygieneScope === 'client' && isAdeverinta && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Salariat destinatar adeverință *
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

            {/* Scope B: Session & Participant Selection */}
            {hygieneScope === 'session' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sesiune de igienă *
                  </label>
                  <select
                    value={selectedHygieneSessionId}
                    onChange={(e) => {
                      setSelectedHygieneSessionId(e.target.value);
                      setSelectedHygieneParticipantId('');
                    }}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Alege sesiunea de igienă --</option>
                    {displayedSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {new Date(session.sessionDate).toLocaleDateString('ro-RO')} — {session.providerName} — {session.location} ({session.participants.length} cursanți)
                      </option>
                    ))}
                  </select>
                </div>

                {isAdeverinta && selectedHygieneSession && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cursant din sesiune pentru adeverință *
                    </label>
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
