'use client';

import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
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
  Briefcase,
  Archive,
  CheckSquare,
  Square,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import {
  UserRole,
  TemplateCategory,
  ROLE_ALLOWED_TEMPLATE_CATEGORIES,
  ROLE_GENERATOR_CONFIG,
  ROLE_CONFIG,
  isTemplateAllowedForRole,
} from '@/lib/rbac';

interface ClientOption {
  id: string;
  name: string;
  cui: string;
}

interface TemplateItem {
  id: string;
  code: string;
  name: string;
  family: string;
  format: string;
  contextLevel: string;
  manifestJson: string;
  fields?: { source: string; [key: string]: any }[];
}

type TemplateOption = TemplateItem;

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  cnp: string | null;
  status?: string;
  medicalFitnessVerdict?: string | null;
  currentJobId?: string | null;
  currentWorksiteId?: string | null;
  currentWorksite?: {
    id?: string;
    name: string;
  } | null;
  currentJob?: {
    id?: string;
    title: string;
    corCode?: string | null;
    mainActivities?: string | null;
  } | null;
  compliance?: {
    isTerminated?: boolean;
    status?: string;
    occupationalMedicine?: { status: string; dueDate: string | null; daysRemaining: number | null; label: string };
    ssmTraining?: { status: string; dueDate: string | null; daysRemaining: number | null; label: string };
    psiTraining?: { status: string; dueDate: string | null; daysRemaining: number | null; label: string };
    hygieneCertificate?: { status: string; dueDate: string | null; daysRemaining: number | null; label: string } | null;
    overallStatus?: string;
  };
}

interface JobOption {
  id: string;
  title: string;
  corCode?: string;
  mainActivities?: string;
}

interface WorksiteOption {
  id: string;
  name: string;
  address?: string;
  activity?: string;
}

export function getEmployeeExpiryInfo(templateCode: string, employee: EmployeeOption): {
  isExpired: boolean;
  badgeText: string;
  badgeClass: string;
  reason: string;
} {
  // Check terminated status
  if ((employee as any)?.status === 'PLECAT' || employee.compliance?.isTerminated) {
    return {
      isExpired: true,
      badgeText: 'Contract Încetat',
      badgeClass: 'bg-slate-200 text-slate-700 border-slate-300 font-bold',
      reason: 'Salariatul are contractul de muncă încetat (status PLECAT). Generarea documentelor este interzisă conform legii.',
    };
  }

  // Check medical fitness verdict (HG 355/2007)
  const verdict = (employee as any)?.medicalFitnessVerdict;
  if (verdict === 'INAPT' || verdict === 'INAPT_TEMPORAR') {
    return {
      isExpired: true,
      badgeText: 'Inapt Medical',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      reason: 'Aviz medical: INAPT conform HG 355/2007. Salariatul nu este apt de muncă și generarea este blocată.',
    };
  }

  if (!employee.compliance) {
    return { isExpired: false, badgeText: 'Conform', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', reason: '' };
  }

  const code = (templateCode || '').toLowerCase();

  // Route declarations (Legea 319/2006 art. 30 lit. g) are employee route statements and are not blocked by periodic training expiry
  if (code.includes('traseu')) {
    return { isExpired: false, badgeText: 'Conform', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', reason: '' };
  }

  const isTrainingTemplate =
    code.includes('fisa-instruire') ||
    code.includes('fisa-instructaj') ||
    code.includes('pv-instruire') ||
    code.startsWith('training-');

  // 1. Instruire SSM (Legea 319/2006, HG 1425/2006)
  if (code.includes('ssm') || code.includes('instruire') || code === 'training-detaliu-introductiv' || code === 'training-tematica-loc-munca') {
    const ssm = employee.compliance.ssmTraining;
    if (ssm && ssm.status === 'OVERDUE') {
      const days = Math.abs(ssm.daysRemaining ?? 0);
      const dueStr = ssm.dueDate ? new Date(ssm.dueDate).toLocaleDateString('ro-RO') : '';
      if (isTrainingTemplate) {
        return {
          isExpired: false,
          badgeText: 'Reinstruire Necesară',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
          reason: `Instructaj precedent SSM depășit la data de ${dueStr} (HG 1425/2006). Fișa se emite pentru efectuarea și consemnarea reinstruirii.`,
        };
      }
      return {
        isExpired: true,
        badgeText: `Expirat (${days} zile)`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        reason: `Instructaj SSM depășit la data de ${dueStr} (HG 1425/2006). Conform legii, documentul nu poate fi emis înainte de reinstruire.`,
      };
    }
    if (ssm && ssm.status === 'UPCOMING') {
      return {
        isExpired: false,
        badgeText: `Expiră în ${ssm.daysRemaining} zile`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        reason: '',
      };
    }
    if (ssm && ssm.status === 'VALID') {
      const dueStr = ssm.dueDate ? new Date(ssm.dueDate).toLocaleDateString('ro-RO') : '';
      return {
        isExpired: false,
        badgeText: `Conform SSM (valabil până la ${dueStr})`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        reason: '',
      };
    }
  }

  // 2. Instruire PSI/SU (Legea 307/2006, OMAI 712/2005)
  if (code.includes('psi')) {
    const psi = employee.compliance.psiTraining;
    if (psi && psi.status === 'OVERDUE') {
      const days = Math.abs(psi.daysRemaining ?? 0);
      const dueStr = psi.dueDate ? new Date(psi.dueDate).toLocaleDateString('ro-RO') : '';
      if (isTrainingTemplate) {
        return {
          isExpired: false,
          badgeText: 'Reinstruire Necesară',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
          reason: `Instructaj precedent PSI depășit la data de ${dueStr} (OMAI 712/2005). Fișa se emite pentru efectuarea și consemnarea reinstruirii.`,
        };
      }
      return {
        isExpired: true,
        badgeText: `Expirat (${days} zile)`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        reason: `Instructaj PSI depășit la data de ${dueStr} (OMAI 712/2005). Documentul este blocat conform legii.`,
      };
    }
    if (psi && psi.status === 'UPCOMING') {
      return {
        isExpired: false,
        badgeText: `Expiră în ${psi.daysRemaining} zile`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        reason: '',
      };
    }
  }

  // 3. Medicină a Muncii (HG 355/2007)
  if (code.includes('med-') || code.includes('medical')) {
    const med = employee.compliance.occupationalMedicine;
    if (med && med.status === 'OVERDUE') {
      const days = Math.abs(med.daysRemaining ?? 0);
      const dueStr = med.dueDate ? new Date(med.dueDate).toLocaleDateString('ro-RO') : '';
      return {
        isExpired: true,
        badgeText: `Expirat (${days} zile)`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        reason: `Examen Medicină a Muncii depășit la data de ${dueStr} (HG 355/2007). Necesită fișă de aptitudine validă.`,
      };
    }
  }

  // 4. Igienă (Ord. 2209/2022)
  if (code.includes('hygiene') || code.includes('igiena')) {
    const hyg = employee.compliance.hygieneCertificate;
    if (hyg && hyg.status === 'OVERDUE') {
      const days = Math.abs(hyg.daysRemaining ?? 0);
      return {
        isExpired: true,
        badgeText: `Expirat (${days} zile)`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        reason: `Certificat de igienă expirat de ${days} zile conform Ord. 2209/2022.`,
      };
    }
  }

  return { isExpired: false, badgeText: 'Conform', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', reason: '' };
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
  clientId?: string | null;
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
  const initialWorksiteId = searchParams.get('worksiteId') || '';
  const initialAssessmentId = searchParams.get('assessmentId') || '';

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [worksites, setWorksites] = useState<WorksiteOption[]>([]);
  const [hygieneSessions, setHygieneSessions] = useState<HygieneSessionOption[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');

  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>(initialTemplateCode);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedWorksiteId, setSelectedWorksiteId] = useState<string>(initialWorksiteId);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(initialAssessmentId);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedHygieneSessionId, setSelectedHygieneSessionId] = useState<string>(initialHygieneSessionId);
  const [selectedHygieneParticipantId, setSelectedHygieneParticipantId] = useState<string>(initialHygieneParticipantId);
  const [hygieneScope, setHygieneScope] = useState<'client' | 'session'>(initialHygieneSessionId ? 'session' : 'client');

  // Multi-Salariat / Batch Generation Mode
  const [generationMode, setGenerationMode] = useState<'single' | 'batch'>('single');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  // Dynamic fields state
  const [fields, setFields] = useState<PlaceholderFieldItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [showAutoFields, setShowAutoFields] = useState(false);
  const [manualFieldSearch, setManualFieldSearch] = useState<string>('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<any | null>(null);

  // Auto-resolve clientId if missing but employeeId is provided
  useEffect(() => {
    if (!selectedClientId && initialEmployeeId) {
      fetch(`/api/employees/${initialEmployeeId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.clientId) {
            setSelectedClientId(data.clientId);
          }
        })
        .catch(() => {});
    }
  }, [selectedClientId, initialEmployeeId]);

  // Sync with searchParams on load/update
  useEffect(() => {
    if (initialClientId) setSelectedClientId(initialClientId);
    if (initialTemplateCode) setSelectedTemplateCode(initialTemplateCode);
    if (initialEmployeeId) setSelectedEmployeeId(initialEmployeeId);
    if (initialJobId) setSelectedJobId(initialJobId);
    if (initialWorksiteId) setSelectedWorksiteId(initialWorksiteId);
    if (initialAssessmentId) setSelectedAssessmentId(initialAssessmentId);
    if (initialHygieneSessionId) {
      setSelectedHygieneSessionId(initialHygieneSessionId);
      setHygieneScope('session');
    }
    if (initialHygieneParticipantId) setSelectedHygieneParticipantId(initialHygieneParticipantId);
  }, [initialClientId, initialTemplateCode, initialEmployeeId, initialJobId, initialWorksiteId, initialAssessmentId, initialHygieneSessionId, initialHygieneParticipantId]);

  // Load user role from session
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role as UserRole);
        }
      })
      .catch((err) => {
        console.error('Failed to load user role:', err);
      });
  }, []);

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

  // Load hygiene sessions only if role has access
  useEffect(() => {
    if (userRole === 'ADMIN' || userRole === 'IGIENA') {
      fetch('/api/hygiene/sessions')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setHygieneSessions(data);
        })
        .catch(() => {});
    }
  }, [userRole]);

  // Filter templates allowed for the current role
  const allowedTemplates = useMemo(() => {
    return templates.filter((t) => isTemplateAllowedForRole(t, userRole));
  }, [templates, userRole]);

  // Allowed categories based on RBAC matrix
  const roleCategories = useMemo(() => {
    const allowedCatSet = new Set(ROLE_ALLOWED_TEMPLATE_CATEGORIES[userRole] || ['all']);
    const allTabs: { id: TemplateCategory; label: string }[] = [
      { id: 'all', label: `Toate (${allowedTemplates.length})` },
      { id: 'ssm', label: 'SSM' },
      { id: 'psi', label: 'PSI / SU' },
      { id: 'med_eip', label: 'Medicină & EIP' },
      { id: 'hr', label: 'HR / CIM' },
      { id: 'hygiene', label: 'Igienă' },
      { id: 'ipssm', label: 'IPSSM' },
    ];
    return allTabs.filter((t) => allowedCatSet.has(t.id));
  }, [userRole, allowedTemplates.length]);

  // Reset category if not permitted for current role
  useEffect(() => {
    if (!roleCategories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory(roleCategories[0]?.id || 'all');
    }
  }, [roleCategories, selectedCategory]);

  const filteredTemplates = useMemo(() => {
    return allowedTemplates.filter((t) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'hygiene') return t.family === 'hygiene' || t.code.startsWith('hygiene-');
      if (selectedCategory === 'ipssm') return t.family === 'ipssm';
      if (selectedCategory === 'med_eip') return t.code.startsWith('med-') || t.code.startsWith('eip-');
      if (selectedCategory === 'psi') return t.code.includes('psi') || t.code.includes('urgenta');
      if (selectedCategory === 'hr') return t.family === 'hr' || t.code.includes('traseu');
      if (selectedCategory === 'ssm') return t.family === 'risk' || t.family === 'training' || t.family === 'decision' || t.code.includes('traseu') || t.code.startsWith('ssm-') || t.code === 'hr-anexa-fisa-post';
      return true;
    });
  }, [allowedTemplates, selectedCategory]);

  // Ensure category selection allows viewing the initialTemplateCode if passed in URL
  useEffect(() => {
    if (!initialTemplateCode || templates.length === 0) return;
    const targetTpl = allowedTemplates.find((t) => t.code === initialTemplateCode);
    if (!targetTpl) return;

    if (!filteredTemplates.some((t) => t.code === initialTemplateCode)) {
      if (roleCategories.some((c) => c.id === 'all')) {
        setSelectedCategory('all');
      } else {
        const matchingCat = roleCategories.find((cat) => {
          if (cat.id === 'all') return true;
          if (cat.id === 'hr' && (targetTpl.family === 'hr' || targetTpl.code.includes('traseu'))) return true;
          if (cat.id === 'ssm' && (targetTpl.family === 'risk' || targetTpl.family === 'training' || targetTpl.family === 'decision' || targetTpl.code.startsWith('ssm-') || targetTpl.code === 'hr-anexa-fisa-post')) return true;
          if (cat.id === 'med_eip' && (targetTpl.code.startsWith('med-') || targetTpl.code.startsWith('eip-'))) return true;
          if (cat.id === 'hygiene' && (targetTpl.family === 'hygiene' || targetTpl.code.startsWith('hygiene-'))) return true;
          if (cat.id === 'ipssm' && targetTpl.family === 'ipssm') return true;
          return false;
        });
        if (matchingCat) {
          setSelectedCategory(matchingCat.id);
        }
      }
    }
  }, [initialTemplateCode, templates.length, allowedTemplates, filteredTemplates, roleCategories]);

  // Keep selectedTemplateCode in sync with filteredTemplates
  useEffect(() => {
    if (templates.length === 0) return;
    if (filteredTemplates.length > 0) {
      if (!filteredTemplates.some((t) => t.code === selectedTemplateCode)) {
        if (initialTemplateCode && filteredTemplates.some((t) => t.code === initialTemplateCode)) {
          setSelectedTemplateCode(initialTemplateCode);
        } else if (initialEmployeeId) {
          const empTpl = filteredTemplates.find((t) => t.contextLevel === 'employee');
          setSelectedTemplateCode(empTpl ? empTpl.code : filteredTemplates[0].code);
        } else {
          setSelectedTemplateCode(filteredTemplates[0].code);
        }
      }
    } else {
      setSelectedTemplateCode('');
    }
  }, [templates.length, filteredTemplates, selectedTemplateCode, initialTemplateCode, initialEmployeeId]);

  const generatorConfig = ROLE_GENERATOR_CONFIG[userRole] || ROLE_GENERATOR_CONFIG.ADMIN;
  const currentTemplate = allowedTemplates.find((t) => t.code === selectedTemplateCode);
  const isHygieneTemplate =
    currentTemplate?.family === 'hygiene' ||
    currentTemplate?.contextLevel === 'hygiene_session' ||
    selectedTemplateCode.startsWith('hygiene-');
  const isEmployeeRequired =
    !isHygieneTemplate && currentTemplate?.contextLevel === 'employee';
  const isAdeverinta = selectedTemplateCode === 'hygiene-adeverinta';
  const isJobContext =
    !isEmployeeRequired &&
    !isHygieneTemplate &&
    Boolean(
      currentTemplate?.contextLevel === 'job' ||
      currentTemplate?.family === 'risk' ||
      currentTemplate?.code?.includes('loc-munca') ||
      currentTemplate?.fields?.some((f) => f?.source?.startsWith('job.'))
    );

  // Load employees, jobs & worksites when client changes
  useEffect(() => {
    if (!selectedClientId) {
      setEmployees([]);
      setJobs([]);
      setWorksites([]);
      setSelectedJobId('');
      setSelectedWorksiteId('');
      setSelectedEmployeeId('');
      return;
    }
    fetch(`/api/clients/${selectedClientId}/employees`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const activeEmployees = data.filter((e: any) => e.status !== 'PLECAT');
          setEmployees(activeEmployees);
          setSelectedEmployeeId((prev) => {
            // Keep current selection if valid in new employees list
            if (prev && activeEmployees.some((e: any) => e.id === prev)) {
              return prev;
            }
            // If initialEmployeeId from searchParams matches a client employee, select it
            if (initialEmployeeId && activeEmployees.some((e: any) => e.id === initialEmployeeId)) {
              return initialEmployeeId;
            }
            return '';
          });
        }
      });

    fetch(`/api/clients/${selectedClientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setSelectedJobId((prev) => (data.jobs.some((j: any) => j.id === prev) ? prev : ''));
        } else {
          setJobs([]);
          setSelectedJobId('');
        }
        if (data && Array.isArray(data.worksites)) {
          setWorksites(data.worksites);
          setSelectedWorksiteId((prev) => (data.worksites.some((w: any) => w.id === prev) ? prev : ''));
        } else {
          setWorksites([]);
          setSelectedWorksiteId('');
        }
      });
  }, [selectedClientId, initialEmployeeId]);

  // When selected employee changes, update job and worksite automatically from employee's assigned job/worksite
  useEffect(() => {
    if (selectedEmployeeId && employees.length > 0) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      const jobId = emp?.currentJobId || (emp?.currentJob as any)?.id || '';
      if (jobId) setSelectedJobId(jobId);
      const worksiteId = (emp as any)?.currentWorksiteId || (emp?.currentWorksite as any)?.id || '';
      if (worksiteId) setSelectedWorksiteId(worksiteId);
    }
  }, [selectedEmployeeId, employees]);

  // Track previous template code to only reset selections when user actively changes template
  const prevTemplateCodeRef = useRef<string | null>(null);

  // State reset logic when template changes actively
  useEffect(() => {
    if (templates.length === 0 || !selectedTemplateCode) return;

    // First time templates finish loading: record current template code without wiping selections
    if (prevTemplateCodeRef.current === null) {
      prevTemplateCodeRef.current = selectedTemplateCode;
      return;
    }

    // Only reset when template code actually changed
    if (prevTemplateCodeRef.current !== selectedTemplateCode) {
      prevTemplateCodeRef.current = selectedTemplateCode;

      if (isHygieneTemplate || !isJobContext) {
        setSelectedJobId('');
      }
      if (isHygieneTemplate) {
        setSelectedWorksiteId('');
      }
      if (!isEmployeeRequired && !isAdeverinta) {
        setSelectedEmployeeId('');
      }
    }
  }, [templates.length, selectedTemplateCode, isHygieneTemplate, isEmployeeRequired, isAdeverinta, isJobContext]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const filteredSessions = hygieneSessions.filter((session) => {
    if (!selectedClient) return true;
    if (session.clientId) return session.clientId === selectedClientId;
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

    const effectiveJobId =
      isHygieneTemplate || !isJobContext
        ? undefined
        : (selectedJobId || undefined);

    setLoadingFields(true);
    const params = new URLSearchParams({
      clientId: selectedClientId,
    });
    if (selectedEmployeeId) params.append('employeeId', selectedEmployeeId);
    if (effectiveJobId) params.append('jobId', effectiveJobId);
    if (selectedWorksiteId) params.append('worksiteId', selectedWorksiteId);
    if (selectedAssessmentId || initialAssessmentId) params.append('assessmentId', selectedAssessmentId || initialAssessmentId);
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
          setFormValues((prev) => {
            const nextValues: Record<string, string> = {};
            cleanFields.forEach((f: PlaceholderFieldItem) => {
              if (f.isAutocompleted) {
                nextValues[f.key] = f.value !== undefined && f.value !== null ? String(f.value) : '';
              } else {
                nextValues[f.key] =
                  prev[f.key] !== undefined && prev[f.key] !== ''
                    ? prev[f.key]
                    : f.value !== undefined && f.value !== null
                    ? String(f.value)
                    : '';
              }
            });
            return nextValues;
          });
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
    selectedWorksiteId,
    selectedHygieneSessionId,
    selectedHygieneParticipantId,
    hygieneScope,
    isHygieneTemplate,
    isEmployeeRequired,
    currentTemplate,
    isJobContext,
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

    // Branching: BATCH MODE FOR EMPLOYEES
    if ((isEmployeeRequired || isAdeverinta) && generationMode === 'batch') {
      if (selectedEmployeeIds.length === 0) {
        setError('Trebuie să selectați cel puțin un salariat eligibil pentru generarea colectivă.');
        return;
      }

      // Check if any selected employee is expired
      for (const empId of selectedEmployeeIds) {
        const emp = employees.find((e) => e.id === empId);
        if (emp) {
          const exp = getEmployeeExpiryInfo(selectedTemplateCode, emp);
          if (exp.isExpired) {
            setError(`Generare blocată: Salariatul ${emp.lastName} ${emp.firstName} are termenul expirat (${exp.reason})`);
            return;
          }
        }
      }

      setGenerating(true);
      setError(null);
      setGenerationResult(null);
      setBatchResult(null);

      try {
        const res = await fetch('/api/documents/generate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateCode: selectedTemplateCode,
            clientId: selectedClientId,
            employeeIds: selectedEmployeeIds,
            customFields: formValues,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Eroare la generarea colectivă a documentelor.');
        }

        setBatchResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setGenerating(false);
      }
      return;
    }

    // SINGLE MODE VALIDATION
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

    // Single mode: check if selected employee is expired
    if (selectedEmployeeId) {
      const emp = employees.find((e) => e.id === selectedEmployeeId);
      if (emp) {
        const exp = getEmployeeExpiryInfo(selectedTemplateCode, emp);
        if (exp.isExpired) {
          setError(`Generare blocată conform legii: Salariatul ${emp.lastName} ${emp.firstName} are termenul expirat (${exp.reason})`);
          return;
        }
      }
    }

    setGenerating(true);
    setError(null);
    setGenerationResult(null);
    setBatchResult(null);

    try {
      const effectiveJobId =
        isHygieneTemplate || !isJobContext
          ? undefined
          : (selectedJobId || undefined);

      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: selectedTemplateCode,
          clientId: selectedClientId,
          employeeId: selectedEmployeeId || undefined,
          jobId: effectiveJobId,
          worksiteId: selectedWorksiteId || undefined,
          assessmentId: selectedAssessmentId || initialAssessmentId || undefined,
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
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${ROLE_CONFIG[userRole]?.bgColor || 'bg-slate-100'} ${ROLE_CONFIG[userRole]?.color || 'text-slate-800'} ${ROLE_CONFIG[userRole]?.borderColor || 'border-slate-200'}`}>
              {generatorConfig.badge}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span>{generatorConfig.title}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {generatorConfig.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>{allowedTemplates.length} Șabloane Normate 100%</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-sm text-rose-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick 1-Click Packages Banner when Client is selected (Filtrat per rol: SSM vede Dosar SSM; HR vede Onboarding) */}
      {selectedClientId && (userRole === 'ADMIN' || userRole === 'SSM' || userRole === 'HR') && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-xl text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-slate-800">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-900">Vrei pachetul complet dintr-un singur click?</span>
              <span className="text-slate-600 block sm:inline sm:ml-1.5">Generează direct arhiva ZIP structurată conform cerințelor legale:</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(userRole === 'ADMIN' || userRole === 'SSM') && (
              <a
                href={`/api/clients/${selectedClientId}/packages/dossier`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 hover:border-blue-300 text-blue-900 font-semibold rounded-lg shadow-2xs hover:bg-blue-50 transition"
                title="Descarcă dosarul de securitate al companiei (16 DOCX)"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                Dosar SSM Firmă (16 DOCX)
              </a>
            )}
            {(userRole === 'ADMIN' || userRole === 'HR') && selectedEmployeeId && (
              <a
                href={`/api/clients/${selectedClientId}/packages/onboarding?employeeId=${selectedEmployeeId}`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition"
                title="Descarcă dosarul complet de angajare (11 DOCX)"
              >
                <Download className="w-3.5 h-3.5" />
                Pachet Onboarding (11 DOCX)
              </a>
            )}
          </div>
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
                setSelectedJobId('');
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

          {/* Template Selection with Category Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Șablon Oficial ({filteredTemplates.length}/{allowedTemplates.length}) *
              </label>
            </div>

            {/* Domain category pills filtrate per rol */}
            <div className="flex flex-wrap gap-1 mb-2">
              {roleCategories.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    const matching = allowedTemplates.filter((t) => {
                      if (tab.id === 'all') return true;
                      if (tab.id === 'hygiene') return t.family === 'hygiene' || t.code.startsWith('hygiene-');
                      if (tab.id === 'ipssm') return t.family === 'ipssm';
                      if (tab.id === 'med_eip') return t.code.startsWith('med-') || t.code.startsWith('eip-');
                      if (tab.id === 'psi') return t.code.includes('psi') || t.code.includes('urgenta');
                      if (tab.id === 'hr') return t.family === 'hr' || t.code.includes('traseu');
                      if (tab.id === 'ssm') return t.family === 'risk' || t.family === 'training' || t.family === 'decision' || t.code.includes('traseu') || t.code.startsWith('ssm-');
                      return true;
                    });
                    if (matching.length > 0 && !matching.some((m) => m.code === selectedTemplateCode)) {
                      setSelectedTemplateCode(matching[0].code);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    selectedCategory === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={selectedTemplateCode}
              onChange={(e) => {
                const newCode = e.target.value;
                setSelectedTemplateCode(newCode);
                const nextTpl = allowedTemplates.find((t) => t.code === newCode);
                const isNextHygiene =
                  nextTpl?.family === 'hygiene' ||
                  nextTpl?.contextLevel === 'hygiene_session' ||
                  newCode.startsWith('hygiene-');
                const isNextEmployee = !isNextHygiene && nextTpl?.contextLevel === 'employee';
                const isNextJob =
                  !isNextEmployee &&
                  !isNextHygiene &&
                  Boolean(
                    nextTpl?.contextLevel === 'job' ||
                    nextTpl?.family === 'risk' ||
                    nextTpl?.code?.includes('loc-munca') ||
                    nextTpl?.fields?.some((f) => f?.source?.startsWith('job.'))
                  );

                if (isNextHygiene || !isNextJob) {
                  setSelectedJobId('');
                }
                if (!isNextEmployee && newCode !== 'hygiene-adeverinta') {
                  setSelectedEmployeeId('');
                }
              }}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Alege șablonul --</option>
              {filteredTemplates.map((t) => (
                <option key={t.code} value={t.code}>
                  [{t.family.toUpperCase()}] {t.name.replace(/\s*\((DOCX|PDF|XLSX)\)$/i, '')} ({t.format.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee Selection for employee-level templates (Suport Salariat Individual & Generare Colectivă) */}
        {isEmployeeRequired && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            {/* Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Destinatari Document (Salariați) *
                </label>
                <p className="text-[11px] text-slate-500">
                  Selectați regimul de generare: individual sau colectiv (pentru mai mulți salariați simultan).
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGenerationMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    generationMode === 'single'
                      ? 'bg-white text-blue-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Salariat Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode('batch')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    generationMode === 'batch'
                      ? 'bg-white text-blue-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Generare Colectivă (Multi-Salariați)</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded font-bold">ZIP</span>
                </button>
              </div>
            </div>

            {/* SINGLE MODE */}
            {generationMode === 'single' ? (
              <div className="space-y-2">
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
                  <option value="">
                    {employees.length === 0 && selectedClientId ? 'Se încarcă salariații...' : '-- Alege salariatul din firmă --'}
                  </option>
                  {selectedEmployeeId && !employees.some((e) => e.id === selectedEmployeeId) && (
                    <option value={selectedEmployeeId}>Se încarcă salariatul selectat...</option>
                  )}
                  {employees.map((emp) => {
                    const exp = getEmployeeExpiryInfo(selectedTemplateCode, emp);
                    return (
                      <option
                        key={emp.id}
                        value={emp.id}
                        disabled={exp.isExpired}
                        className={exp.isExpired ? 'text-rose-600 font-medium bg-rose-50' : ''}
                      >
                        {exp.isExpired ? '[EXPIRAT - BLOCAT] ' : ''}
                        {emp.lastName} {emp.firstName} — {emp.currentJob?.title || 'Fără post'}
                        {exp.isExpired ? ` (${exp.badgeText})` : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Expiry Alert for single mode */}
                {selectedEmployeeId && (() => {
                  const emp = employees.find((x) => x.id === selectedEmployeeId);
                  if (emp) {
                    const exp = getEmployeeExpiryInfo(selectedTemplateCode, emp);
                    if (exp.isExpired) {
                      return (
                        <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-950">Atenție: Salariat blocat pentru acest tip de document! </span>
                            <span>{exp.reason}</span>
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}

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
                  return null;
                })()}
              </div>
            ) : (
              /* BATCH / MULTI-SALARIAT MODE */
              <div className="space-y-3">
                {(() => {
                  const eligibleList = employees.filter((e) => !getEmployeeExpiryInfo(selectedTemplateCode, e).isExpired);
                  const expiredList = employees.filter((e) => getEmployeeExpiryInfo(selectedTemplateCode, e).isExpired);
                  const isAllEligibleSelected = eligibleList.length > 0 && eligibleList.every((e) => selectedEmployeeIds.includes(e.id));

                  return (
                    <div>
                      {/* Summary & Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {selectedEmployeeIds.length} salariați selectați
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-emerald-700 font-medium">
                            {eligibleList.length} eligibili
                          </span>
                          {expiredList.length > 0 && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-rose-700 font-medium flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                {expiredList.length} blocați (termen expirat)
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isAllEligibleSelected) {
                                setSelectedEmployeeIds([]);
                              } else {
                                setSelectedEmployeeIds(eligibleList.map((e) => e.id));
                              }
                            }}
                            disabled={eligibleList.length === 0}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-300 rounded text-slate-700 text-xs font-medium transition"
                          >
                            {isAllEligibleSelected ? 'Deselectează toți' : `Selectează toți cei eligibili (${eligibleList.length})`}
                          </button>
                          {selectedEmployeeIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeIds([])}
                              className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium"
                            >
                              Resetează
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Employees List with Expiry Lock */}
                      <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white max-h-72 overflow-y-auto">
                        {employees.map((emp) => {
                          const exp = getEmployeeExpiryInfo(selectedTemplateCode, emp);
                          const isSelected = selectedEmployeeIds.includes(emp.id);

                          return (
                            <div
                              key={emp.id}
                              onClick={() => {
                                if (exp.isExpired) return;
                                if (isSelected) {
                                  setSelectedEmployeeIds((prev) => prev.filter((id) => id !== emp.id));
                                } else {
                                  setSelectedEmployeeIds((prev) => [...prev, emp.id]);
                                }
                              }}
                              className={`p-3 flex items-center justify-between gap-3 text-xs transition ${
                                exp.isExpired
                                  ? 'bg-rose-50/40 text-slate-400 cursor-not-allowed select-none'
                                  : isSelected
                                  ? 'bg-blue-50/70 text-slate-900 cursor-pointer'
                                  : 'hover:bg-slate-50 text-slate-800 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={exp.isExpired}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (exp.isExpired) return;
                                    if (e.target.checked) {
                                      setSelectedEmployeeIds((prev) => [...prev, emp.id]);
                                    } else {
                                      setSelectedEmployeeIds((prev) => prev.filter((id) => id !== emp.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${exp.isExpired ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                      {emp.lastName} {emp.firstName}
                                    </span>
                                    {emp.currentJob?.title && (
                                      <span className="text-slate-500 text-[11px]">
                                        • {emp.currentJob.title}
                                      </span>
                                    )}
                                    {emp.currentJob?.corCode && (
                                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">
                                        COR {emp.currentJob.corCode}
                                      </span>
                                    )}
                                  </div>
                                  {exp.isExpired ? (
                                    <p className="text-[11px] text-rose-700 mt-0.5 font-medium flex items-center gap-1">
                                      <ShieldAlert className="w-3 h-3 text-rose-600 flex-shrink-0" />
                                      <span>{exp.reason}</span>
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      CNP: {userRole === 'SSM' ? (emp.cnp ? '•••••••••••••' : 'Nespecificat') : (emp.cnp || 'Nespecificat')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${exp.badgeClass}`}>
                                  {exp.badgeText}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Job / Funcție Selector (DOAR pentru documente de nivel companie/evaluare riscuri unde nu este implicat un angajat individual) */}
        {isJobContext && selectedClientId && jobs.length > 0 && (
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

        {/* Punct de Lucru (Worksite) Selector */}
        {selectedClientId && worksites.length > 0 && !isHygieneTemplate && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Punct de Lucru (opțional - dacă este diferit de sediul social)
            </label>
            <select
              value={selectedWorksiteId}
              onChange={(e) => setSelectedWorksiteId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sediu social (implicit) --</option>
              {worksites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.address ? `- ${w.address}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scope Selector for Hygiene Templates (accesibil exclusiv pentru ADMIN și IGIENA) */}
        {isHygieneTemplate && (userRole === 'ADMIN' || userRole === 'IGIENA') && (
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
                  <option value="">
                    {employees.length === 0 && selectedClientId ? 'Se încarcă salariații...' : '-- Alege salariatul din firmă --'}
                  </option>
                  {selectedEmployeeId && !employees.some((e) => e.id === selectedEmployeeId) && (
                    <option value={selectedEmployeeId}>Se încarcă salariatul selectat...</option>
                  )}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span>Câmpuri specifice de completat / ajustat pentru acest document ({manualFields.length}):</span>
                  </div>
                  {manualFields.length > 8 && (
                    <div className="relative">
                      <input
                        type="text"
                        value={manualFieldSearch}
                        onChange={(e) => setManualFieldSearch(e.target.value)}
                        placeholder="Filtrează câmpuri manuale..."
                        className="text-xs border border-slate-300 rounded px-2.5 py-1 w-52 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                      {manualFieldSearch && (
                        <button
                          type="button"
                          onClick={() => setManualFieldSearch('')}
                          className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="max-h-[460px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {manualFields
                      .filter((f) => {
                        if (!manualFieldSearch.trim()) return true;
                        const q = manualFieldSearch.toLowerCase();
                        return f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q);
                      })
                      .map((field) => (
                        <div key={field.key} className="space-y-1">
                          <label
                            className="block text-[11px] font-medium text-slate-700 truncate"
                            title={`${field.label} (${field.key})`}
                          >
                            {field.label}
                            {field.required && <span className="text-rose-500 font-bold ml-1">*</span>}
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
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Format ieșire: <span className="font-bold uppercase text-slate-700">{currentTemplate?.format || 'DOCX'}</span>
            {(isEmployeeRequired || isAdeverinta) && generationMode === 'batch' && (
              <span className="ml-2 font-medium text-blue-700">
                • {selectedEmployeeIds.length} fișiere vor fi generate și asamblate automat într-o arhivă ZIP
              </span>
            )}
          </div>

          {(() => {
            const isSingleModeExpired =
              (isEmployeeRequired || isAdeverinta) &&
              generationMode === 'single' &&
              selectedEmployeeId &&
              (() => {
                const emp = employees.find((e) => e.id === selectedEmployeeId);
                return emp ? getEmployeeExpiryInfo(selectedTemplateCode, emp).isExpired : false;
              })();

            const isBatchModeEmpty =
              (isEmployeeRequired || isAdeverinta) &&
              generationMode === 'batch' &&
              selectedEmployeeIds.length === 0;

            const isGenerateDisabled =
              generating ||
              !selectedClientId ||
              !selectedTemplateCode ||
              Boolean(isSingleModeExpired) ||
              isBatchModeEmpty;

            return (
              <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {(isEmployeeRequired || isAdeverinta) && generationMode === 'batch'
                        ? `Se generează ${selectedEmployeeIds.length} documente & ZIP...`
                        : 'Se generează...'}
                    </span>
                  </>
                ) : (
                  <>
                    {isSingleModeExpired ? (
                      <>
                        <ShieldAlert className="w-4 h-4 text-rose-300" />
                        <span>Salariat blocat (termen expirat)</span>
                      </>
                    ) : (isEmployeeRequired || isAdeverinta) && generationMode === 'batch' ? (
                      <>
                        <Archive className="w-4 h-4" />
                        <span>Generează Colectiv ({selectedEmployeeIds.length} Salariați) & ZIP</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>Generează Document</span>
                      </>
                    )}
                  </>
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* BATCH GENERATION RESULT CARD */}
      {batchResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Generare Colectivă Finalizată cu Succes ({batchResult.totalGenerated} documente)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    PACHET ZIP GATA DE DESCĂRCARE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Șablon: <span className="font-semibold text-slate-700">{batchResult.templateName}</span> • Companie: <span className="font-semibold text-slate-700">{batchResult.clientName}</span>
                </p>
              </div>
            </div>
            <div>
              <a
                href={batchResult.zipDownloadUrl}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descarcă Arhiva ZIP ({batchResult.totalGenerated} fișiere)</span>
              </a>
            </div>
          </div>

          {/* List of individual generated documents */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Documente individuale generate și incluse în arhivă:</span>
              <span className="text-slate-400 font-normal">{(batchResult.zipSizeBytes / 1024).toFixed(1)} KB arhivă</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 max-h-64 overflow-y-auto">
              {batchResult.documents.map((doc: any) => (
                <div key={doc.documentId} className="p-3 flex items-center justify-between gap-3 text-xs bg-white">
                  <div>
                    <div className="font-semibold text-slate-900">{doc.employeeName}</div>
                    <div className="text-slate-500 text-[11px]">{doc.jobTitle} • {doc.fileName}</div>
                  </div>
                  <a
                    href={doc.downloadUrl}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 bg-white border border-slate-200 rounded hover:border-blue-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descarcă</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generation Result Card (Single Mode) */}
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
