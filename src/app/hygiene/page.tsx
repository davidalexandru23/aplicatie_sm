'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit,
  X,
  Filter,
  Search,
  Hash,
  History,
  Building2,
  CheckSquare,
  Square,
  MapPin,
} from 'lucide-react';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string | null;
  clientName: string;
  jobTitle?: string;
  attendance: string;
  examGrade?: number;
  examResult: string;
  certificateSeries?: string;
  certificateNumber?: string;
  certificateDate?: string;
  hygieneModule?: string | null;
  diplomaDelivered?: boolean;
  diplomaDeliveredDate?: string | null;
  employeeId?: string;
  employee?: {
    clientId: string;
  };
}

interface HygieneSession {
  id: string;
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
    cui: string;
  } | null;
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
  hygieneModule?: string | null;
  status: string;
  participants: Participant[];
}

interface ClientOption {
  id: string;
  name: string;
  cui: string;
}

interface PortfolioEmployee {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string | null;
  clientId: string;
  client?: {
    id: string;
    name: string;
    cui: string;
  };
  currentJob?: {
    id: string;
    title: string;
  };
  hygieneModule?: string | null;
  status?: string;
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

  // Filter state
  const [filterClientId, setFilterClientId] = useState<string>('');

  // Portfolio & Clients
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [portfolioEmployees, setPortfolioEmployees] = useState<PortfolioEmployee[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Create Session State (Portfolio selection)
  const [createSelectedEmpIds, setCreateSelectedEmpIds] = useState<string[]>([]);
  const [createSearchTerm, setCreateSearchTerm] = useState('');
  const [createCompanyFilter, setCreateCompanyFilter] = useState('');
  const [providerDefaults, setProviderDefaults] = useState({
    providerName: '',
    msAuthorization: '',
    meAuthorization: '',
    dspNumber: '',
    location: '',
    commissionPresident: '',
    commissionMember1: '',
    commissionMember2: '',
    commissionSecretary: '',
  });

  // Add participants to existing session state
  const [addParticipantsSessionId, setAddParticipantsSessionId] = useState<string | null>(null);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addCompanyFilter, setAddCompanyFilter] = useState('');
  const [addSelectedEmpIds, setAddSelectedEmpIds] = useState<string[]>([]);

  // Edit participant & BIS Retroactive Certificate state
  const [editingParticipant, setEditingParticipant] = useState<{
    session: HygieneSession;
    participant: Participant;
  } | null>(null);
  const [editFormData, setEditFormData] = useState<{
    attendance: string;
    examGrade: string;
    examResult: string;
    certificateNumber: string;
    certificateDate: string;
    hygieneModule: string;
    diplomaDelivered: boolean;
    diplomaDeliveredDate: string;
  }>({
    attendance: 'prezent',
    examGrade: '',
    examResult: 'admis',
    certificateNumber: '',
    certificateDate: '',
    hygieneModule: 'Modulul 1 - Servicii de alimentație publică și colectivă',
    diplomaDelivered: false,
    diplomaDeliveredDate: '',
  });
  const [usedNumbersInYear, setUsedNumbersInYear] = useState<string[]>([]);
  const [nextYearNumber, setNextYearNumber] = useState<number>(1);
  const [loadingNumbering, setLoadingNumbering] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const resolveSessionClientId = useCallback((session: HygieneSession): string => {
    if (session.clientId) return session.clientId;
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
    const docKey = `${session.id}_${templateCode}_${participantId || ''}`;
    setDownloadingDoc(docKey);

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode,
          clientId: clientId || undefined,
          hygieneSessionId: session.id,
          hygieneParticipantId: participantId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.downloadUrl) {
        throw new Error(data.error || 'Eroare la generarea documentului.');
      }

      window.location.href = data.downloadUrl;
    } catch (err: unknown) {
      alert(`Eroare la descărcare: ${err instanceof Error ? err.message : 'Necunoscută'}`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const fetchSessions = useCallback(async (clientFilter?: string) => {
    setLoading(true);
    try {
      const activeFilter = clientFilter !== undefined ? clientFilter : filterClientId;
      const url = activeFilter
        ? `/api/hygiene/sessions?clientId=${encodeURIComponent(activeFilter)}`
        : '/api/hygiene/sessions';
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch {
      setError('Eroare la încărcarea sesiunilor.');
    } finally {
      setLoading(false);
    }
  }, [filterClientId]);

  // Load clients & provider defaults on mount
  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setClients(d);
      })
      .catch(() => {});

    fetch('/api/settings/provider')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setProviderDefaults({
            providerName: data.hygieneProviderName || data.name || '',
            msAuthorization: data.hygieneMsAuthNumber || '',
            meAuthorization: data.hygieneMeAuthNumber || '',
            dspNumber: data.hygieneDspNumber || '',
            location: data.hygieneDefaultLocation || (data.locality ? `${data.locality}, ${data.address || ''}` : ''),
            commissionPresident: data.hygieneCommissionPresident || '',
            commissionMember1: data.hygieneCommissionMember1 || '',
            commissionMember2: data.hygieneCommissionMember2 || '',
            commissionSecretary: data.hygieneCommissionSecretary || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  // Load all employees in portfolio for multi-client hygiene session builder
  const loadPortfolioEmployees = useCallback(async () => {
    setLoadingPortfolio(true);
    try {
      const res = await fetch('/api/employees', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setPortfolioEmployees(data);
      }
    } catch (err) {
      console.warn('Nu s-au putut încărca toți angajații din portofoliu:', err);
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    loadPortfolioEmployees();
  }, [fetchSessions, loadPortfolioEmployees]);

  // Combined company list derived from clients and loaded portfolio employees
  const availableCompanies = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => {
      if (c.id && c.name) map.set(c.id, c.name);
    });
    portfolioEmployees.forEach((e) => {
      if (e.clientId && e.client?.name) {
        map.set(e.clientId, e.client.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [clients, portfolioEmployees]);

  // Filtered employees for Create Session Modal
  const filteredCreateEmployees = useMemo(() => {
    return portfolioEmployees.filter((emp) => {
      if (createCompanyFilter && emp.clientId !== createCompanyFilter) return false;
      if (!createSearchTerm.trim()) return true;
      const term = createSearchTerm.toLowerCase();
      const fullName = `${emp.lastName || ''} ${emp.firstName || ''}`.toLowerCase();
      const cnp = (emp.cnp || '').toLowerCase();
      const company = (emp.client?.name || '').toLowerCase();
      const job = (emp.currentJob?.title || '').toLowerCase();
      return fullName.includes(term) || cnp.includes(term) || company.includes(term) || job.includes(term);
    });
  }, [portfolioEmployees, createCompanyFilter, createSearchTerm]);

  // Unique companies count for selection
  const selectedCompaniesCount = useMemo(() => {
    const selectedEmps = portfolioEmployees.filter((e) => createSelectedEmpIds.includes(e.id));
    const set = new Set(selectedEmps.map((e) => e.clientId));
    return set.size;
  }, [portfolioEmployees, createSelectedEmpIds]);

  // Fetch numbering info for a given calendar year
  const fetchNumberingForYear = useCallback(async (year: number) => {
    setLoadingNumbering(true);
    try {
      const res = await fetch(`/api/hygiene/certificates/next-number?year=${year}`);
      const data = await res.json();
      if (data && !data.error) {
        setUsedNumbersInYear(data.usedNumbers || []);
        setNextYearNumber(data.nextNumber || 1);
      }
    } catch {
      // fallback
    } finally {
      setLoadingNumbering(false);
    }
  }, []);

  // Smart Auto-BIS: Dacă utilizatorul introduce un număr deja folosit, adaugă automat sufixul BIS
  const checkAndApplyBis = useCallback((inputVal: string, originalVal?: string | null): string => {
    if (!inputVal) return '';
    let trimmed = inputVal.trim();
    if (!trimmed) return '';

    // Normalizează orice BIS existent la majuscule fără spații
    trimmed = trimmed.replace(/\s*bis$/i, 'BIS');

    // Extrage numărul de bază fără BIS
    const baseNumber = trimmed.replace(/bis$/i, '').trim();
    if (!baseNumber) return trimmed;

    // Verifică dacă acest număr este deja în lista numerelor folosite din acel an
    const isUsedInYear = usedNumbersInYear.some((n) => {
      const existingBase = n.replace(/bis$/i, '').trim();
      return existingBase.toLowerCase() === baseNumber.toLowerCase();
    });

    if (isUsedInYear) {
      const origBase = (originalVal || '').replace(/bis$/i, '').trim();
      const isOriginalOwnerNonBis = origBase && origBase.toLowerCase() === baseNumber.toLowerCase() && !originalVal?.toUpperCase().includes('BIS');
      if (!isOriginalOwnerNonBis && !trimmed.toUpperCase().endsWith('BIS')) {
        return `${baseNumber}BIS`;
      }
    }

    return trimmed;
  }, [usedNumbersInYear]);

  // Open Edit Participant Modal
  const openEditParticipant = async (session: HygieneSession, participant: Participant) => {
    setEditingParticipant({ session, participant });
    setEditError(null);

    const initialDate = participant.certificateDate
      ? new Date(participant.certificateDate).toISOString().slice(0, 10)
      : (session.examDate ? new Date(session.examDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

    setEditFormData({
      attendance: participant.attendance || 'prezent',
      examGrade: participant.examGrade != null ? String(participant.examGrade) : '',
      examResult: participant.examResult || 'admis',
      certificateNumber: participant.certificateNumber || '',
      certificateDate: initialDate,
      hygieneModule: participant.hygieneModule || session.hygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă',
      diplomaDelivered: Boolean(participant.diplomaDelivered),
      diplomaDeliveredDate: participant.diplomaDeliveredDate
        ? new Date(participant.diplomaDeliveredDate).toISOString().slice(0, 10)
        : (participant.diplomaDelivered ? new Date().toISOString().slice(0, 10) : ''),
    });

    // Fetch numbering info for that year
    const targetYear = initialDate ? new Date(initialDate).getFullYear() : new Date().getFullYear();
    fetchNumberingForYear(targetYear);
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const payload: {
        attendance: string;
        examResult: string;
        examGrade: number | null;
        certificateSeries: null;
        certificateNumber: string | null;
        certificateDate: string | null;
        hygieneModule: string | null;
        diplomaDelivered: boolean;
        diplomaDeliveredDate: string | null;
      } = {
        attendance: editFormData.attendance,
        examResult: editFormData.examResult,
        examGrade: null,
        certificateSeries: null, // Serie DSP complet eliminată
        certificateNumber: null,
        certificateDate: null,
        hygieneModule: editFormData.hygieneModule ? editFormData.hygieneModule.trim() : null,
        diplomaDelivered: editFormData.diplomaDelivered,
        diplomaDeliveredDate: editFormData.diplomaDelivered && editFormData.diplomaDeliveredDate ? editFormData.diplomaDeliveredDate : null,
      };

      if (editFormData.examGrade !== '') {
        const g = parseFloat(editFormData.examGrade);
        if (isNaN(g) || g < 1 || g > 10) {
          throw new Error('Nota la examen trebuie să fie un număr între 1.0 și 10.0');
        }
        payload.examGrade = g;
      }

      if (editFormData.attendance === 'absent' || editFormData.examResult === 'respins') {
        payload.certificateNumber = null;
        payload.certificateDate = null;
      } else {
        const adjustedCertNumber = checkAndApplyBis(
          editFormData.certificateNumber,
          editingParticipant.participant.certificateNumber
        );
        payload.certificateNumber = adjustedCertNumber.trim() || null;
        payload.certificateDate = editFormData.certificateDate || null;
      }

      const res = await fetch(
        `/api/hygiene/sessions/${editingParticipant.session.id}/participants/${editingParticipant.participant.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la salvarea cursantului.');
      }

      setEditingParticipant(null);
      await fetchSessions();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleDiploma = async (sessionId: string, participant: Participant) => {
    const nextDelivered = !participant.diplomaDelivered;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextDate = nextDelivered ? todayStr : null;

    setActionLoading(`diploma_${participant.id}`);
    try {
      const res = await fetch(`/api/hygiene/sessions/${sessionId}/participants/${participant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diplomaDelivered: nextDelivered,
          diplomaDeliveredDate: nextDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Eroare la actualizarea predării diplomei.');
        return;
      }
      await fetchSessions();
    } catch {
      setError('Eroare la actualizarea predării diplomei.');
    } finally {
      setActionLoading(null);
    }
  };

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

  // Add participants to an existing session from portfolio
  const handleAddParticipantsToSession = async () => {
    if (!addParticipantsSessionId || addSelectedEmpIds.length === 0) return;
    setActionLoading(addParticipantsSessionId);
    try {
      const res = await fetch(`/api/hygiene/sessions/${addParticipantsSessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: addSelectedEmpIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la adăugarea cursanților.');
        return;
      }
      setAddParticipantsSessionId(null);
      setAddSelectedEmpIds([]);
      await fetchSessions();
    } catch {
      setError('Eroare la adăugarea cursanților.');
    } finally {
      setActionLoading(null);
    }
  };

  // Create Session Handler with portfolio employees
  const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setActionLoading('create');
    setError(null);

    try {
      if (createSelectedEmpIds.length === 0) {
        setError('Selectați cel puțin un angajat din portofoliu pentru a crea sesiunea.');
        setActionLoading(null);
        return;
      }

      const payload = {
        providerName: (fd.get('providerName') as string) || providerDefaults.providerName || undefined,
        msAuthorization: (fd.get('msAuthorization') as string) || providerDefaults.msAuthorization || undefined,
        meAuthorization: (fd.get('meAuthorization') as string) || providerDefaults.meAuthorization || undefined,
        sessionDate: fd.get('sessionDate') as string,
        examDate: fd.get('examDate') as string,
        location: (fd.get('location') as string) || providerDefaults.location || undefined,
        commissionPresident: (fd.get('commissionPresident') as string) || providerDefaults.commissionPresident || undefined,
        commissionMember1: (fd.get('commissionMember1') as string) || providerDefaults.commissionMember1 || undefined,
        commissionMember2: (fd.get('commissionMember2') as string) || providerDefaults.commissionMember2 || undefined,
        commissionSecretary: (fd.get('commissionSecretary') as string) || providerDefaults.commissionSecretary || undefined,
        pvSeriesNumber: (fd.get('pvSeriesNumber') as string) || undefined,
        hygieneModule: (fd.get('hygieneModule') as string) || undefined,
        employeeIds: createSelectedEmpIds,
      };

      if (!payload.sessionDate || !payload.examDate) {
        setError('Completează data sesiunii și data examenului.');
        setActionLoading(null);
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
      setCreateSelectedEmpIds([]);
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
            Evidența sesiunilor de igienă per salariat (portofoliu multi-client), cataloage, examinare și adeverințe DSP (Ord. MS/ME 2209/4469/2022).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {clients.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterClientId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterClientId(val);
                  fetchSessions(val);
                }}
                className="text-xs bg-transparent focus:outline-none text-slate-800 font-medium cursor-pointer"
              >
                <option value="">Toate firmele din portofoliu</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => {
              fetchSessions();
              loadPortfolioEmployees();
            }}
            className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingPortfolio ? 'animate-spin' : ''}`} />
            <span>Reîncarcă</span>
          </button>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (!showCreateForm) loadPortfolioEmployees();
            }}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Sesiune Nouă (Listă Angajați)</span>
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

      {/* Create Session Form with Portfolio Employee Picker */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSession}
          className="bg-white p-6 rounded-xl border-2 border-emerald-300 shadow-md space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Creează Sesiune Igienă (Selectare Angajați din Portofoliu)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesiunea este multi-client: puteți include salariați din orice companie clientă din portofoliu. Datele furnizorului și avizele se pre-completează din Setările SEPP.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              {createSelectedEmpIds.length} salariați selectați ({selectedCompaniesCount} companii)
            </span>
          </div>

          {/* Date generale sesiune (pre-populate din Setări SEPP) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Data Cursului *</label>
              <input type="date" name="sessionDate" required className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Data Examenului DSP *</label>
              <input type="date" name="examDate" required className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Modul Curs Igienă (3 ani) *</label>
              <select
                name="hygieneModule"
                defaultValue="Modulul 1 - Servicii de alimentație publică și colectivă"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="Modulul 1 - Servicii de alimentație publică și colectivă">Modulul 1 - Alimentație Publică & Colectivă</option>
                <option value="Modulul 2 - Servicii de curățenie în unități sanitare, colectivități copii, cazare">Modulul 2 - Curățenie (Sanitar, Cazare, Copii)</option>
                <option value="Modulul 3 - Producția și distribuția apei potabile și a apei de îmbăiere">Modulul 3 - Apă Potabilă & Bazine Îmbăiere</option>
                <option value="Modulul 4 - Servicii de îngrijire corporală (cosmetică, frizerie, coafură etc.)">Modulul 4 - Îngrijire Corporală (Coafură, Frizerie)</option>
                <option value="Modulul 5 - Servicii de dezinfecție, dezinsecție și deratizare (DDD)">Modulul 5 - Servicii DDD (Deratizare, Dezinfecție)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Locație Sală Examen</label>
              <input
                name="location"
                defaultValue={providerDefaults.location || 'București, Sediul prestatorului'}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Furnizor Curs</label>
              <input
                name="providerName"
                defaultValue={providerDefaults.providerName || 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.'}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aviz Min. Sănătății (MS)</label>
              <input
                name="msAuthorization"
                defaultValue={providerDefaults.msAuthorization || 'REG1/25711/16.09.2025'}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aviz Min. Educației (ME)</label>
              <input
                name="meAuthorization"
                defaultValue={providerDefaults.meAuthorization || '31160/14.10.2025'}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Președinte Comisie DSP</label>
              <input
                name="commissionPresident"
                defaultValue={providerDefaults.commissionPresident || 'Dr. Radu Ionescu - Medic Primar DSP'}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Selector Portofoliu Salariați */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-inner">
            <div className="p-3 bg-emerald-50/70 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                Selectează Salariații Participanți din Portofoliu:
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={createSearchTerm}
                    onChange={(e) => setCreateSearchTerm(e.target.value)}
                    placeholder="Caută nume, CNP, firmă..."
                    className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-48 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={createCompanyFilter}
                  onChange={(e) => setCreateCompanyFilter(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Toate firmele ({availableCompanies.length})</option>
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const ids = filteredCreateEmployees.map((e) => e.id);
                    const allSelected = ids.every((id) => createSelectedEmpIds.includes(id));
                    if (allSelected) {
                      setCreateSelectedEmpIds((prev) => prev.filter((id) => !ids.includes(id)));
                    } else {
                      setCreateSelectedEmpIds((prev) => Array.from(new Set([...prev, ...ids])));
                    }
                  }}
                  className="text-[11px] font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition"
                >
                  Bifează / Debifează filtrați ({filteredCreateEmployees.length})
                </button>
              </div>
            </div>

            {loadingPortfolio ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                Se încarcă angajații din portofoliu...
              </div>
            ) : filteredCreateEmployees.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                {portfolioEmployees.length === 0 ? (
                  <>
                    <p>Nu s-au putut prelua salariații sau portofoliul este gol.</p>
                    <button
                      type="button"
                      onClick={() => loadPortfolioEmployees()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-md font-medium text-xs hover:bg-emerald-200 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reîncearcă încărcarea
                    </button>
                  </>
                ) : (
                  <>
                    <p>Niciun salariat găsit conform căutării sau filtrelor alese.</p>
                    {(createCompanyFilter || createSearchTerm) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreateCompanyFilter('');
                          setCreateSearchTerm('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 underline"
                      >
                        Resetează filtrele
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left w-8">
                        <input
                          type="checkbox"
                          checked={filteredCreateEmployees.length > 0 && filteredCreateEmployees.every((e) => createSelectedEmpIds.includes(e.id))}
                          onChange={() => {
                            const ids = filteredCreateEmployees.map((e) => e.id);
                            const all = ids.every((id) => createSelectedEmpIds.includes(id));
                            if (all) {
                              setCreateSelectedEmpIds((prev) => prev.filter((id) => !ids.includes(id)));
                            } else {
                              setCreateSelectedEmpIds((prev) => Array.from(new Set([...prev, ...ids])));
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Nume & Prenume</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Companie Client</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">CNP</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Post</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Modul Igienă</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCreateEmployees.map((emp) => {
                      const isChecked = createSelectedEmpIds.includes(emp.id);
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => {
                            setCreateSelectedEmpIds((prev) =>
                              prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                            );
                          }}
                          className={`hover:bg-emerald-50/60 cursor-pointer transition ${isChecked ? 'bg-emerald-50/40' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                            />
                          </td>
                          <td className="px-3 py-2 font-bold text-slate-900">{emp.lastName} {emp.firstName}</td>
                          <td className="px-3 py-2 text-slate-700 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {emp.client?.name || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600">{emp.cnp}</td>
                          <td className="px-3 py-2 text-slate-600">{emp.currentJob?.title || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {emp.hygieneModule || 'Nivelul 1'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={actionLoading === 'create' || createSelectedEmpIds.length === 0}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition"
            >
              {actionLoading === 'create' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Creează Sesiunea ({createSelectedEmpIds.length} cursanți)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateSelectedEmpIds([]);
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Add Participants Modal to Existing Session */}
      {addParticipantsSessionId && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Adaugă Cursanți în Sesiune din Portofoliu
            </h2>
            <button
              onClick={() => { setAddParticipantsSessionId(null); setAddSelectedEmpIds([]); }}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={addSearchTerm}
                onChange={(e) => setAddSearchTerm(e.target.value)}
                placeholder="Caută în portofoliu..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-52 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={addCompanyFilter}
              onChange={(e) => setAddCompanyFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toate firmele ({availableCompanies.length})</option>
              {availableCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Nume</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Companie</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">CNP</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Post</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolioEmployees
                  .filter((emp) => {
                    if (addCompanyFilter && emp.clientId !== addCompanyFilter) return false;
                    if (!addSearchTerm.trim()) return true;
                    const term = addSearchTerm.toLowerCase();
                    const full = `${emp.lastName || ''} ${emp.firstName || ''}`.toLowerCase();
                    return full.includes(term) || (emp.cnp || '').includes(term) || (emp.client?.name || '').toLowerCase().includes(term);
                  })
                  .map((emp) => {
                    const isChecked = addSelectedEmpIds.includes(emp.id);
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => {
                          setAddSelectedEmpIds((prev) =>
                            prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                          );
                        }}
                        className={`hover:bg-blue-50/60 cursor-pointer ${isChecked ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={isChecked} onChange={() => {}} />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{emp.lastName} {emp.firstName}</td>
                        <td className="px-3 py-2 text-slate-600">{emp.client?.name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{emp.cnp}</td>
                        <td className="px-3 py-2 text-slate-600">{emp.currentJob?.title || '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddParticipantsToSession}
              disabled={addSelectedEmpIds.length === 0 || actionLoading === addParticipantsSessionId}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              {actionLoading === addParticipantsSessionId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Adaugă {addSelectedEmpIds.length} cursant(i)</span>
            </button>
            <button
              onClick={() => { setAddParticipantsSessionId(null); setAddSelectedEmpIds([]); }}
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
            Creează o sesiune nouă folosind butonul de mai sus cu angajați selectați din portofoliu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const admisiCount = session.participants.filter((p) => p.examResult.toLowerCase() === 'admis').length;
            const respinsiCount = session.participants.filter((p) => p.examResult.toLowerCase() === 'respins').length;
            const companiesCount = new Set(session.participants.map((p) => p.clientName)).size;

            return (
              <div key={session.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Session Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-sm font-bold text-slate-900">{session.providerName}</h2>
                        {session.hygieneModule && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {session.hygieneModule}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_COLORS[session.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {STATUS_LABELS[session.status] || session.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Curs: {new Date(session.sessionDate).toLocaleDateString('ro-RO')}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          Examen: {new Date(session.examDate).toLocaleDateString('ro-RO')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{session.location}</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          {session.participants.length} cursanți ({companiesCount} {companiesCount === 1 ? 'companie' : 'companii'})
                          {admisiCount > 0 && <span className="text-emerald-600 ml-1">({admisiCount} admiși</span>}
                          {respinsiCount > 0 && <span className="text-rose-600">, {respinsiCount} respinși</span>}
                          {admisiCount > 0 && <span className="text-emerald-600">)</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Add participants from portfolio */}
                      {session.status === 'programata' && (
                        <button
                          onClick={() => {
                            setAddParticipantsSessionId(session.id === addParticipantsSessionId ? null : session.id);
                            loadPortfolioEmployees();
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                        >
                          <Plus className="w-3 h-3" />
                          + Cursanți
                        </button>
                      )}

                      {/* Advance status */}
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
                        className="text-slate-400 hover:text-slate-600 p-1"
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
                        Nu sunt cursanți înscriși. Adaugă cursanți din portofoliul de angajați.
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
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">CNP (în clar)</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Prezență</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Notă</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Rezultat</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Nr. Adeverință DSP</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Acțiuni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.participants.map((p, idx) => {
                              const isBisNumber = p.certificateNumber?.toUpperCase().includes('BIS');
                              return (
                                <tr key={p.id} className="border-b border-slate-100 hover:bg-white">
                                  <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                  <td className="px-3 py-2 font-bold text-slate-900">
                                    {p.lastName} {p.firstName}
                                  </td>
                                  <td className="px-3 py-2 text-slate-700">{p.clientName}</td>
                                  <td className="px-3 py-2 text-slate-600 font-mono">{p.cnp}</td>
                                  <td className="px-3 py-2 text-slate-600">{p.jobTitle || '—'}</td>
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
                                  <td className="px-3 py-2">
                                    {p.certificateNumber ? (
                                      <div>
                                        <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${isBisNumber ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-800'}`}>
                                          Nr. {p.certificateNumber}
                                        </span>
                                        {p.diplomaDelivered && (
                                          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 inline shrink-0" />
                                            <span>Predată: {p.diplomaDeliveredDate ? new Date(p.diplomaDeliveredDate).toLocaleDateString('ro-RO') : 'Azi'}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right space-x-1.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      title="Editează note, prezență, adeverință BIS sau data predării diplomei"
                                      onClick={() => openEditParticipant(session, p)}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded transition"
                                    >
                                      <Edit className="w-3 h-3 text-blue-600" />
                                      Editează
                                    </button>

                                    {/* Checkmark în stânga la adeverință pentru diplomă DSP */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDiploma(session.id, p)}
                                      disabled={p.attendance === 'absent' || p.examResult.toLowerCase() === 'respins' || actionLoading === `diploma_${p.id}`}
                                      title={
                                        p.attendance === 'absent' || p.examResult.toLowerCase() === 'respins'
                                          ? 'Cursantul nu este admis'
                                          : p.diplomaDelivered
                                          ? `Diplomă DSP predată la data de ${p.diplomaDeliveredDate ? new Date(p.diplomaDeliveredDate).toLocaleDateString('ro-RO') : '—'}. Apasă pentru debifare sau folosește butonul Editează pentru a schimba data.`
                                          : 'Bifează dacă ai predat diploma DSP către angajat (se va seta automat data de azi)'
                                      }
                                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                        p.diplomaDelivered
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                          : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                      }`}
                                    >
                                      {actionLoading === `diploma_${p.id}` ? (
                                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                                      ) : p.diplomaDelivered ? (
                                        <CheckSquare className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Square className="w-3 h-3 text-slate-400" />
                                      )}
                                      <span>
                                        {p.diplomaDelivered ? (
                                          <>Diplomă predată {p.diplomaDeliveredDate ? `(${new Date(p.diplomaDeliveredDate).toLocaleDateString('ro-RO')})` : ''}</>
                                        ) : (
                                          <>Predă diplomă</>
                                        )}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      title="Descarcă adeverință individuală fără serie DSP"
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
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Quick Download Actions */}
                    <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                          Documente Sesiune:
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
                          Cataloage & Anexe Curs (XLSX)
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/documents/generate?templateCode=hygiene-tabel-cursanti&hygieneSessionId=${session.id}${resolveSessionClientId(session) ? `&clientId=${resolveSessionClientId(session)}` : ''}`}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                        >
                          Deschide în Generator Avansat &rarr;
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

      {/* Modal Editare Cursant & Emitere Retroactivă BIS */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Evaluare Cursant & Adeverință DSP
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingParticipant(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-slate-700">
              <p><span className="font-semibold">Cursant:</span> {editingParticipant.participant.lastName} {editingParticipant.participant.firstName}</p>
              <p><span className="font-semibold">Angajator:</span> {editingParticipant.participant.clientName}</p>
              <p><span className="font-semibold">CNP:</span> <span className="font-mono">{editingParticipant.participant.cnp}</span></p>
              <p><span className="font-semibold">Sesiune:</span> {new Date(editingParticipant.session.sessionDate).toLocaleDateString('ro-RO')} (Examen: {new Date(editingParticipant.session.examDate).toLocaleDateString('ro-RO')})</p>
            </div>

            {editError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Prezență Curs *
                  </label>
                  <select
                    value={editFormData.attendance}
                    onChange={(e) => {
                      const att = e.target.value;
                      setEditFormData((prev) => ({
                        ...prev,
                        attendance: att,
                        ...(att === 'absent' ? { examResult: 'respins', examGrade: '', certificateNumber: '' } : {}),
                      }));
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="prezent">Prezent</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rezultat Examen *
                  </label>
                  <select
                    disabled={editFormData.attendance === 'absent'}
                    value={editFormData.examResult}
                    onChange={(e) => {
                      const res = e.target.value;
                      setEditFormData((prev) => ({
                        ...prev,
                        examResult: res,
                        ...(res === 'respins' ? { certificateNumber: '' } : {}),
                      }));
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="admis">Admis</option>
                    <option value="respins">Respins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Notă Examen (1.0 - 10.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    disabled={editFormData.attendance === 'absent'}
                    value={editFormData.examGrade}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, examGrade: e.target.value }))}
                    placeholder="Ex: 9.5"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Data Emiterii Adeverinței
                  </label>
                  <input
                    type="date"
                    disabled={editFormData.attendance === 'absent' || editFormData.examResult === 'respins'}
                    value={editFormData.certificateDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setEditFormData((prev) => ({ ...prev, certificateDate: d }));
                      if (d) {
                        const y = new Date(d).getFullYear();
                        if (!isNaN(y)) fetchNumberingForYear(y);
                      }
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Modul Curs Igienă (Valabilitate: 3 ani / 36 luni per Ordin 2209/2022)
                  </label>
                  <select
                    value={editFormData.hygieneModule}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, hygieneModule: e.target.value }))}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Modulul 1 - Servicii de alimentație publică și colectivă">Modulul 1 - Alimentație Publică & Colectivități (Producție, Vânzare)</option>
                    <option value="Modulul 2 - Servicii de curățenie în unități sanitare, colectivități copii, cazare">Modulul 2 - Curățenie (Sanitar, Cazare, Copii)</option>
                    <option value="Modulul 3 - Producția și distribuția apei potabile și a apei de îmbăiere">Modulul 3 - Apă Potabilă & Bazine Îmbăiere</option>
                    <option value="Modulul 4 - Servicii de îngrijire corporală (cosmetică, frizerie, coafură etc.)">Modulul 4 - Îngrijire Corporală (Coafură, Frizerie, Cosmetică)</option>
                    <option value="Modulul 5 - Servicii de dezinfecție, dezinsecție și deratizare (DDD)">Modulul 5 - Servicii DDD (Deratizare, Dezinfecție)</option>
                  </select>
                </div>
              </div>

              {/* Număr Adeverință DSP (Fără Serie!) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Număr Adeverință DSP (Fără Serie)
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Următorul secvențial: <strong>Nr. {nextYearNumber}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      disabled={editFormData.attendance === 'absent' || editFormData.examResult === 'respins'}
                      value={editFormData.certificateNumber}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, certificateNumber: e.target.value }))}
                      onBlur={(e) => {
                        const adjusted = checkAndApplyBis(e.target.value, editingParticipant?.participant.certificateNumber);
                        if (adjusted !== e.target.value) {
                          setEditFormData((prev) => ({ ...prev, certificateNumber: adjusted }));
                        }
                      }}
                      placeholder={String(nextYearNumber)}
                      className="w-full pl-9 pr-3 py-2 font-mono font-bold text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Feedback inteligent auto-BIS când numărul este deja folosit */}
                {(() => {
                  const currentVal = editFormData.certificateNumber.trim();
                  const baseNum = currentVal.replace(/bis$/i, '').trim();
                  const isBis = currentVal.toUpperCase().endsWith('BIS');
                  const isUsed = Boolean(baseNum && usedNumbersInYear.some((n) => n.replace(/bis$/i, '').trim().toLowerCase() === baseNum.toLowerCase()));
                  const isSelf = Boolean(baseNum && editingParticipant?.participant.certificateNumber?.replace(/bis$/i, '').trim().toLowerCase() === baseNum.toLowerCase() && !editingParticipant?.participant.certificateNumber?.toUpperCase().includes('BIS'));

                  if (isBis) {
                    return (
                      <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs font-medium">
                        <History className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          Număr de remediere control cu sufix <strong>BIS</strong> ({currentVal}).
                        </span>
                      </div>
                    );
                  }

                  if (isUsed && !isSelf) {
                    return (
                      <div className="flex items-center justify-between gap-2 p-2 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <History className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            Numărul <strong>{baseNum}</strong> este deja utilizat &rarr; se adaugă automat <strong>{baseNum}BIS</strong>.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditFormData((prev) => ({ ...prev, certificateNumber: `${baseNum}BIS` }))}
                          className="text-[10px] font-bold px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded transition shrink-0"
                        >
                          Aplică {baseNum}BIS
                        </button>
                      </div>
                    );
                  }

                  if (isUsed && isSelf) {
                    return (
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs">
                        <span>Numărul curent oficial al cursantului.</span>
                        <button
                          type="button"
                          onClick={() => setEditFormData((prev) => ({ ...prev, certificateNumber: `${baseNum}BIS` }))}
                          className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 hover:bg-amber-100 hover:text-amber-900 text-slate-700 rounded border border-slate-300 transition shrink-0"
                        >
                          Transformă în {baseNum}BIS
                        </button>
                      </div>
                    );
                  }

                  return (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Numerotarea este secvențială (1 la X per an). Dacă scrieți un număr deja folosit, se pune automat <strong>BIS</strong>.
                    </span>
                  );
                })()}
              </div>

              {/* Predare Diplomă DSP către Angajat */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-950">
                    <input
                      type="checkbox"
                      checked={editFormData.diplomaDelivered}
                      disabled={editFormData.attendance === 'absent' || editFormData.examResult.toLowerCase() === 'respins'}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditFormData((prev) => ({
                          ...prev,
                          diplomaDelivered: checked,
                          diplomaDeliveredDate: checked
                            ? (prev.diplomaDeliveredDate || new Date().toISOString().slice(0, 10))
                            : '',
                        }));
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Diplomă DSP Predată către Angajat</span>
                  </label>
                  {editFormData.diplomaDelivered && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      Diplomă Înregistrată ca Predată
                    </span>
                  )}
                </div>

                {editFormData.diplomaDelivered && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Data predării diplomei DSP către angajat:
                    </label>
                    <input
                      type="date"
                      value={editFormData.diplomaDeliveredDate}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          diplomaDeliveredDate: e.target.value,
                        }))
                      }
                      className="w-full text-xs border border-emerald-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                    />
                    <span className="text-[10px] text-emerald-700 block mt-1">
                      Puteți schimba data oricând pentru a consemna ziua exactă la care cursantul a primit diploma.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  {editLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Salvează Datele Cursantului</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
