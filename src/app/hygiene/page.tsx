'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Award,
  FileSpreadsheet,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
} from 'lucide-react';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string;
  clientName: string;
  jobTitle?: string;
  attendance: string;
  examGrade?: number;
  examResult: string;
  certificateSeries?: string;
  certificateNumber?: string;
  employeeId?: string;
  employee?: {
    clientId: string;
  };
}

interface HygieneSession {
  id: string;
  providerName: string;
  msAuthorization?: string;
  meAuthorization?: string;
  sessionDate: string;
  examDate: string;
  location: string;
  commissionPresident?: string;
  commissionMember1?: string;
  commissionMember2?: string;
  commissionSecretary?: string;
  pvSeriesNumber?: string;
  status: string;
  participants: Participant[];
}

interface ClientOption {
  id: string;
  name: string;
  cui: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string;
  currentJob?: { title: string };
}

const STATUS_LABELS: Record<string, string> = {
  programata: 'Programată',
  in_desfasurare: 'În Desfășurare',
  finalizata: 'Finalizată',
  certificate_emise: 'Certificate Emise',
};

const STATUS_COLORS: Record<string, string> = {
  programata: 'bg-blue-50 text-blue-700 border-blue-200',
  in_desfasurare: 'bg-amber-50 text-amber-700 border-amber-200',
  finalizata: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  certificate_emise: 'bg-purple-50 text-purple-700 border-purple-200',
};

const NEXT_STATUS: Record<string, string> = {
  programata: 'in_desfasurare',
  in_desfasurare: 'finalizata',
  finalizata: 'certificate_emise',
};

const STATUS_ACTION_LABELS: Record<string, string> = {
  programata: 'Începe Cursul',
  in_desfasurare: 'Finalizează',
  finalizata: 'Marchează Certificate Emise',
};

export default function HygienePage() {
  const [sessions, setSessions] = useState<HygieneSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add participants state
  const [addParticipantsSessionId, setAddParticipantsSessionId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const resolveSessionClientId = useCallback((session: HygieneSession): string => {
    const pWithClient = session.participants.find((p) => p.employee?.clientId);
    if (pWithClient?.employee?.clientId) return pWithClient.employee.clientId;

    const matchedClient = clients.find((c) =>
      session.participants.some(
        (p) => p.clientName && p.clientName.toLowerCase() === c.name.toLowerCase()
      )
    );
    if (matchedClient) return matchedClient.id;

    return clients[0]?.id || '';
  }, [clients]);

  const handleDirectDownload = async (
    session: HygieneSession,
    templateCode: string,
    participantId?: string
  ) => {
    const clientId = resolveSessionClientId(session);
    if (!clientId) {
      alert('Nu s-a putut asocia o firmă client pentru această sesiune.');
      return;
    }

    const docKey = `${session.id}_${templateCode}_${participantId || ''}`;
    setDownloadingDoc(docKey);

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode,
          clientId,
          hygieneSessionId: session.id,
          hygieneParticipantId: participantId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.downloadUrl) {
        throw new Error(data.error || 'Eroare la generarea documentului.');
      }

      window.location.href = data.downloadUrl;
    } catch (err: any) {
      alert(`Eroare la descărcare: ${err.message}`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hygiene/sessions');
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch {
      setError('Eroare la încărcarea sesiunilor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load clients for add-participants
  useEffect(() => {
    if (addParticipantsSessionId) {
      fetch('/api/clients')
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setClients(d); });
    }
  }, [addParticipantsSessionId]);

  // Load employees when client selected
  useEffect(() => {
    if (!selectedClientId) { setEmployees([]); return; }
    fetch(`/api/clients/${selectedClientId}/employees`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setEmployees(d); });
  }, [selectedClientId]);

  const handleAdvanceStatus = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const nextStatus = NEXT_STATUS[session.status];
    if (!nextStatus) return;

    setActionLoading(sessionId);
    try {
      const res = await fetch(`/api/hygiene/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Eroare la actualizarea statusului.');
        return;
      }
      await fetchSessions();
    } catch {
      setError('Eroare la actualizarea statusului.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Sigur doriți să ștergeți această sesiune? Toți cursanții vor fi eliminați.')) return;
    setActionLoading(sessionId);
    try {
      await fetch(`/api/hygiene/sessions/${sessionId}`, { method: 'DELETE' });
      await fetchSessions();
    } catch {
      setError('Eroare la ștergerea sesiunii.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddParticipants = async () => {
    if (!addParticipantsSessionId || selectedEmployeeIds.length === 0) return;
    setActionLoading(addParticipantsSessionId);
    try {
      const res = await fetch(`/api/hygiene/sessions/${addParticipantsSessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: selectedEmployeeIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la adăugarea cursanților.');
        return;
      }
      setAddParticipantsSessionId(null);
      setSelectedClientId('');
      setSelectedEmployeeIds([]);
      await fetchSessions();
    } catch {
      setError('Eroare la adăugarea cursanților.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setActionLoading('create');
    setError(null);

    try {
      const payload = {
        providerName: fd.get('providerName') as string || undefined,
        msAuthorization: fd.get('msAuthorization') as string || undefined,
        meAuthorization: fd.get('meAuthorization') as string || undefined,
        sessionDate: fd.get('sessionDate') as string,
        examDate: fd.get('examDate') as string,
        location: fd.get('location') as string,
        commissionPresident: fd.get('commissionPresident') as string || undefined,
        commissionMember1: fd.get('commissionMember1') as string || undefined,
        commissionMember2: fd.get('commissionMember2') as string || undefined,
        commissionSecretary: fd.get('commissionSecretary') as string || undefined,
        pvSeriesNumber: fd.get('pvSeriesNumber') as string || undefined,
        participants: [
          {
            clientName: fd.get('p_clientName') as string,
            lastName: fd.get('p_lastName') as string,
            firstName: fd.get('p_firstName') as string,
            cnp: fd.get('p_cnp') as string,
            jobTitle: fd.get('p_jobTitle') as string || undefined,
          },
        ],
      };

      if (!payload.sessionDate || !payload.examDate || !payload.location) {
        setError('Completează data sesiunii, data examenului și locația.');
        return;
      }

      if (!payload.participants[0].clientName || !payload.participants[0].lastName || !payload.participants[0].firstName || !payload.participants[0].cnp) {
        setError('Completează datele primului cursant (firmă, nume, prenume, CNP).');
        return;
      }

      const res = await fetch('/api/hygiene/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Eroare la crearea sesiunii.');
        return;
      }

      setShowCreateForm(false);
      form.reset();
      await fetchSessions();
    } catch {
      setError('Eroare la crearea sesiunii.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Cursuri Noțiuni Fundamentale de Igienă</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența sesiunilor de instruire igienă, cataloage cursanți, examinare și adeverințe (Ord. MS/ME 2209/4469/2022).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchSessions()}
            className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reîncarcă</span>
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Sesiune Nouă</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-sm text-rose-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700 text-xs font-medium">✕</button>
        </div>
      )}

      {/* Create Session Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSession}
          className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            Creează Sesiune Nouă de Igienă
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Furnizor Cursuri</label>
              <input name="providerName" placeholder="Ex: EXPERT SSM S.R.L." className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Sesiunii *</label>
              <input type="date" name="sessionDate" required className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Examenului *</label>
              <input type="date" name="examDate" required className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Locație *</label>
              <input name="location" required placeholder="Ex: București, Sala A2" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aviz MS</label>
              <input name="msAuthorization" placeholder="Nr. aviz Ministerul Sănătății" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aviz ME</label>
              <input name="meAuthorization" placeholder="Nr. aviz Ministerul Educației" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Președinte Comisie</label>
              <input name="commissionPresident" placeholder="Dr. ..." className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Membru Comisie 1</label>
              <input name="commissionMember1" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Membru Comisie 2</label>
              <input name="commissionMember2" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Secretar Comisie</label>
              <input name="commissionSecretary" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nr. Serie Proces-Verbal</label>
            <input name="pvSeriesNumber" placeholder="Ex: PV-IG/104" className="w-full md:w-1/3 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>

          {/* First participant (inline) */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Primul Cursant (restul se adaugă după crearea sesiunii)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Firma Client *</label>
                <input name="p_clientName" required placeholder="S.C. ... S.R.L." className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nume *</label>
                <input name="p_lastName" required placeholder="Popescu" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prenume *</label>
                <input name="p_firstName" required placeholder="Ion" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">CNP *</label>
                <input name="p_cnp" required placeholder="1234567890123" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Funcție</label>
                <input name="p_jobTitle" placeholder="Bucătar" className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={actionLoading === 'create'}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition"
            >
              {actionLoading === 'create' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Creează Sesiunea</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Add Participants Modal */}
      {addParticipantsSessionId && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Adaugă Cursanți din Registrul Angajaților
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Selectează Firma Client</label>
              <select
                value={selectedClientId}
                onChange={(e) => { setSelectedClientId(e.target.value); setSelectedEmployeeIds([]); }}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Alege firma --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (CUI: {c.cui})</option>
                ))}
              </select>
            </div>
          </div>

          {employees.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.length === employees.length}
                        onChange={() => {
                          if (selectedEmployeeIds.length === employees.length) {
                            setSelectedEmployeeIds([]);
                          } else {
                            setSelectedEmployeeIds(employees.map((e) => e.id));
                          }
                        }}
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Nume</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">CNP</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Post</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-slate-100 cursor-pointer hover:bg-blue-50 ${selectedEmployeeIds.includes(emp.id) ? 'bg-blue-50/50' : ''}`}
                      onClick={() => toggleEmployeeSelection(emp.id)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{emp.lastName} {emp.firstName}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">{emp.cnp.slice(0, 4)}****</td>
                      <td className="px-3 py-2 text-slate-600">{emp.currentJob?.title || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddParticipants}
              disabled={selectedEmployeeIds.length === 0 || actionLoading === addParticipantsSessionId}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              {actionLoading === addParticipantsSessionId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Adaugă {selectedEmployeeIds.length} cursant(i)</span>
            </button>
            <button
              onClick={() => { setAddParticipantsSessionId(null); setSelectedClientId(''); setSelectedEmployeeIds([]); }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          Se încarcă sesiunile...
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există sesiuni de igienă</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Creează o sesiune nouă folosind butonul de mai sus sau importă angajați cu solicitare de curs igienă.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const admisiCount = session.participants.filter((p) => p.examResult.toLowerCase() === 'admis').length;
            const respinsiCount = session.participants.filter((p) => p.examResult.toLowerCase() === 'respins').length;

            return (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Session Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-bold text-slate-900">{session.providerName}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_COLORS[session.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {STATUS_LABELS[session.status] || session.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Curs: {new Date(session.sessionDate).toLocaleDateString('ro-RO')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Examen: {new Date(session.examDate).toLocaleDateString('ro-RO')}
                        </span>
                        <span>📍 {session.location}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {session.participants.length} cursanți
                          {admisiCount > 0 && <span className="text-emerald-600">({admisiCount} admiși</span>}
                          {respinsiCount > 0 && <span className="text-rose-600">, {respinsiCount} respinși</span>}
                          {admisiCount > 0 && <span className="text-emerald-600">)</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Generate docs link */}
                      <Link
                        href={`/documents/generate?templateCode=hygiene-tabel-cursanti&hygieneSessionId=${session.id}${resolveSessionClientId(session) ? `&clientId=${resolveSessionClientId(session)}` : ''}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                        Generează
                      </Link>

                      {/* Add participants */}
                      {session.status === 'programata' && (
                        <button
                          onClick={() => setAddParticipantsSessionId(session.id === addParticipantsSessionId ? null : session.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                        >
                          <Plus className="w-3 h-3" />
                          Cursanți
                        </button>
                      )}

                      {/* Status advance */}
                      {NEXT_STATUS[session.status] && (
                        <button
                          onClick={() => handleAdvanceStatus(session.id)}
                          disabled={actionLoading === session.id}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition border border-emerald-200"
                        >
                          {actionLoading === session.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                          {STATUS_ACTION_LABELS[session.status]}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Expand */}
                      <button
                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Participants Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50">
                    {session.participants.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Nu sunt cursanți înscriși. Adaugă cursanți din registrul de angajați.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Nume Complet</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Angajator</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Funcție</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">CNP</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Prezență</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Notă</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Rezultat</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Certificat</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Acțiuni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.participants.map((p, idx) => (
                              <tr key={p.id} className="border-b border-slate-100 hover:bg-white">
                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {p.lastName} {p.firstName}
                                  {p.employeeId && (
                                    <span className="ml-1 text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">linked</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-600">{p.clientName}</td>
                                <td className="px-3 py-2 text-slate-600">{p.jobTitle || '—'}</td>
                                <td className="px-3 py-2 text-slate-500 font-mono">{p.cnp.slice(0, 4)}****</td>
                                <td className="px-3 py-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.attendance === 'prezent' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {p.attendance}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-700">{p.examGrade ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.examResult.toLowerCase() === 'admis' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {p.examResult}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {p.certificateSeries && p.certificateNumber
                                    ? `${p.certificateSeries} ${p.certificateNumber}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    title="Descarcă adeverință cursant"
                                    onClick={() => handleDirectDownload(session, 'hygiene-adeverinta', p.id)}
                                    disabled={downloadingDoc === `${session.id}_hygiene-adeverinta_${p.id}`}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded transition disabled:opacity-50"
                                  >
                                    {downloadingDoc === `${session.id}_hygiene-adeverinta_${p.id}` ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Download className="w-3 h-3 text-purple-600" />
                                    )}
                                    Adeverință
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Direct 1-Click Download actions and generator links */}
                    <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                          Descărcare Rapidă (1-Click):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDirectDownload(session, 'hygiene-tabel-cursanti')}
                          disabled={downloadingDoc === `${session.id}_hygiene-tabel-cursanti_`}
                          className="text-[10px] font-semibold px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1 transition disabled:opacity-50"
                        >
                          {downloadingDoc === `${session.id}_hygiene-tabel-cursanti_` ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 text-emerald-600" />
                          )}
                          Tabel Cursanți (XLSX)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDirectDownload(session, 'hygiene-anexe-catalog')}
                          disabled={downloadingDoc === `${session.id}_hygiene-anexe-catalog_`}
                          className="text-[10px] font-semibold px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 transition disabled:opacity-50"
                        >
                          {downloadingDoc === `${session.id}_hygiene-anexe-catalog_` ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 text-blue-600" />
                          )}
                          Anexe Catalog (XLSX)
                        </button>

                        {session.participants.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleDirectDownload(session, 'hygiene-adeverinta', session.participants[0].id)}
                            disabled={downloadingDoc === `${session.id}_hygiene-adeverinta_${session.participants[0].id}`}
                            className="text-[10px] font-semibold px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-1 transition disabled:opacity-50"
                          >
                            {downloadingDoc === `${session.id}_hygiene-adeverinta_${session.participants[0].id}` ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3 text-purple-600" />
                            )}
                            Adeverință ({session.participants[0].lastName})
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/documents/generate?templateCode=hygiene-tabel-cursanti&hygieneSessionId=${session.id}${resolveSessionClientId(session) ? `&clientId=${resolveSessionClientId(session)}` : ''}`}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                        >
                          Deschide în Generator &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
