/**
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE 3 — CROSS-CLIENT STATE INTEGRITY
 * 
 * Specifically stress-tests cross-client job switching:
 * 1. Client with jobs -> Client with 0 jobs
 * 2. Client with jobs -> Client with different jobs
 * 3. Client with jobs -> Client with malformed/empty response
 * 4. Rapid switching across clients and templates
 * 5. Effective payload validation for all statutory document types
 */

import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';

interface ClientData {
  id: string;
  name: string;
  jobs: { id: string; title: string; corCode?: string }[];
  employees: { id: string; name: string; currentJobId?: string }[];
}

class ReactHarness {
  state = {
    selectedClientId: '',
    selectedTemplateCode: '',
    selectedEmployeeId: '',
    selectedJobId: '',
    jobs: [] as { id: string; title: string; corCode?: string }[],
    employees: [] as { id: string; name: string; currentJobId?: string }[],
    hygieneScope: 'client' as 'client' | 'session',
    selectedHygieneSessionId: '',
    selectedHygieneParticipantId: '',
  };

  get currentTemplate() {
    return TEMPLATE_CATALOG.find((t) => t.code === this.state.selectedTemplateCode);
  }

  get isHygieneTemplate() {
    const t = this.currentTemplate;
    return Boolean(
      t?.family === 'hygiene' ||
      t?.contextLevel === 'hygiene_session' ||
      this.state.selectedTemplateCode.startsWith('hygiene-')
    );
  }

  get isEmployeeRequired() {
    return !this.isHygieneTemplate && this.currentTemplate?.contextLevel === 'employee';
  }

  get isAdeverinta() {
    return this.state.selectedTemplateCode === 'hygiene-adeverinta';
  }

  get isJobContext() {
    const currentTemplate = this.currentTemplate;
    return (
      !this.isEmployeeRequired &&
      !this.isHygieneTemplate &&
      Boolean(
        currentTemplate?.contextLevel === 'job' ||
        currentTemplate?.family === 'risk' ||
        currentTemplate?.code?.includes('loc-munca') ||
        currentTemplate?.fields?.some((f) => f?.source?.startsWith('job.'))
      )
    );
  }

  get isJobDropdownDisplayed() {
    return (
      this.isJobContext &&
      Boolean(this.state.selectedClientId) &&
      this.state.jobs.length > 0
    );
  }

  get effectiveJobId(): string | undefined {
    return this.isHygieneTemplate || !this.isJobContext
      ? undefined
      : (this.state.selectedJobId || undefined);
  }

  // Exact reproduction of src/app/documents/generate/page.tsx line 417-422
  onClientSelectChange(clientId: string) {
    this.state.selectedClientId = clientId;
    this.state.selectedEmployeeId = '';
    this.state.selectedJobId = '';
    this.state.selectedHygieneParticipantId = '';
  }

  // Exact reproduction of src/app/documents/generate/page.tsx line 191-207
  onClientDataFetched(data: any) {
    if (!this.state.selectedClientId) {
      this.state.employees = [];
      this.state.jobs = [];
      this.state.selectedJobId = '';
      return;
    }

    if (data && Array.isArray(data.jobs)) {
      this.state.jobs = data.jobs;
      if (this.isJobContext && data.jobs.length > 0) {
        this.state.selectedJobId = data.jobs.some((j: any) => j.id === this.state.selectedJobId)
          ? this.state.selectedJobId
          : data.jobs[0].id;
      } else {
        this.state.selectedJobId = '';
      }
    } else {
      this.state.jobs = [];
      this.state.selectedJobId = '';
    }
  }

  // Full client switch sequence
  switchClient(client: ClientData | null) {
    const newId = client ? client.id : '';
    this.onClientSelectChange(newId);
    this.onClientDataFetched(client ? { jobs: client.jobs } : null);
    if (client) {
      this.state.employees = client.employees;
    } else {
      this.state.employees = [];
    }
  }

  switchTemplate(templateCode: string) {
    this.state.selectedTemplateCode = templateCode;
    const nextTpl = TEMPLATE_CATALOG.find((t) => t.code === templateCode);
    const isNextHygiene =
      nextTpl?.family === 'hygiene' ||
      nextTpl?.contextLevel === 'hygiene_session' ||
      templateCode.startsWith('hygiene-');
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
      this.state.selectedJobId = '';
    }
    if (!isNextEmployee && templateCode !== 'hygiene-adeverinta') {
      this.state.selectedEmployeeId = '';
    }
  }

  getGeneratePayload() {
    return {
      templateCode: this.state.selectedTemplateCode,
      clientId: this.state.selectedClientId,
      employeeId: this.state.selectedEmployeeId || undefined,
      jobId: this.effectiveJobId,
    };
  }
}

async function runAdversarialStress() {
  console.log('========================================================================');
  console.log('EMPIRICAL CHALLENGER: DEEP CROSS-CLIENT INTEGRITY STRESS HARNESS');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
      if (details) console.error(`         Detail: ${details}`);
      errors.push(`${name}: ${details}`);
      failed++;
    }
  }

  const clientA: ClientData = {
    id: 'client-A-nexus',
    name: 'Nexus Solutions SRL',
    jobs: [
      { id: 'job-A1', title: 'Inginer Software', corCode: '251201' },
      { id: 'job-A2', title: 'Manager Proiect', corCode: '242101' },
    ],
    employees: [
      { id: 'emp-A1', name: 'Popescu Ion', currentJobId: 'job-A1' },
    ],
  };

  const clientB_ZeroJobs: ClientData = {
    id: 'client-B-consulting',
    name: 'Consulting Zero SRL',
    jobs: [], // 0 jobs!
    employees: [],
  };

  const clientC_DifferentJobs: ClientData = {
    id: 'client-C-bistro',
    name: 'Bistro Gourmet SRL',
    jobs: [
      { id: 'job-C1', title: 'Bucătar Specialist', corCode: '512001' },
      { id: 'job-C2', title: 'Ospătar / Chelner', corCode: '513102' },
    ],
    employees: [
      { id: 'emp-C1', name: 'Ionescu Maria', currentJobId: 'job-C1' },
    ],
  };

  // Test 1: Baseline setup on Client A with workplace training template
  const harness = new ReactHarness();
  harness.switchTemplate('training-tematica-loc-munca');
  harness.switchClient(clientA);

  assert(
    'Initial Client A: selectedJobId defaults to job-A1',
    harness.state.selectedJobId === 'job-A1',
    `Got '${harness.state.selectedJobId}'`
  );
  assert(
    'Initial Client A: effectiveJobId is job-A1',
    harness.effectiveJobId === 'job-A1',
    `Got '${harness.effectiveJobId}'`
  );
  assert(
    'Initial Client A: isJobDropdownDisplayed is true',
    harness.isJobDropdownDisplayed === true
  );

  // User manually selects job-A2
  harness.state.selectedJobId = 'job-A2';
  assert(
    'User selects job-A2: effectiveJobId is job-A2',
    harness.effectiveJobId === 'job-A2'
  );

  // Test 2: Switch to Client B (0 jobs)
  console.log('\n--- Scenario 1: Switching from Client A (jobs) to Client B (0 jobs) ---');
  harness.switchClient(clientB_ZeroJobs);

  assert(
    'Client B (0 jobs): selectedJobId must be empty string',
    harness.state.selectedJobId === '',
    `Got '${harness.state.selectedJobId}'`
  );
  assert(
    'Client B (0 jobs): effectiveJobId must be undefined',
    harness.effectiveJobId === undefined,
    `Got '${harness.effectiveJobId}'`
  );
  assert(
    'Client B (0 jobs): isJobDropdownDisplayed must be false',
    harness.isJobDropdownDisplayed === false
  );
  assert(
    'Client B (0 jobs): Generate payload must NOT contain jobId',
    harness.getGeneratePayload().jobId === undefined,
    `Payload: ${JSON.stringify(harness.getGeneratePayload())}`
  );

  // Test 3: Switch to Client C (different jobs)
  console.log('\n--- Scenario 2: Switching from Client B (0 jobs) to Client C (different jobs) ---');
  harness.switchClient(clientC_DifferentJobs);

  assert(
    'Client C: selectedJobId must default to job-C1 (first job of Client C)',
    harness.state.selectedJobId === 'job-C1',
    `Got '${harness.state.selectedJobId}'`
  );
  assert(
    'Client C: effectiveJobId must be job-C1',
    harness.effectiveJobId === 'job-C1',
    `Got '${harness.effectiveJobId}'`
  );
  assert(
    'Client C: isJobDropdownDisplayed must be true',
    harness.isJobDropdownDisplayed === true
  );
  assert(
    'Client C: selectedJobId must NOT be any Client A job (job-A1 or job-A2)',
    harness.state.selectedJobId !== 'job-A1' && harness.state.selectedJobId !== 'job-A2'
  );

  // Test 4: Switch directly from Client C (with job-C2 selected) back to Client A
  console.log('\n--- Scenario 3: Switching directly from Client C (job-C2) to Client A ---');
  harness.state.selectedJobId = 'job-C2';
  harness.switchClient(clientA);

  assert(
    'Client A: selectedJobId reset to job-A1 (never retains job-C2)',
    harness.state.selectedJobId === 'job-A1',
    `Got '${harness.state.selectedJobId}'`
  );
  assert(
    'Client A: effectiveJobId is job-A1',
    harness.effectiveJobId === 'job-A1'
  );

  // Test 5: Switch directly from Client A to Client B (0 jobs) while job-A2 was selected
  console.log('\n--- Scenario 4: Direct switch Client A (job-A2) -> Client B (0 jobs) ---');
  harness.state.selectedJobId = 'job-A2';
  harness.switchClient(clientB_ZeroJobs);

  assert(
    'Direct A->B: selectedJobId is immediately cleared',
    harness.state.selectedJobId === '',
    `Got '${harness.state.selectedJobId}'`
  );
  assert(
    'Direct A->B: effectiveJobId is undefined',
    harness.effectiveJobId === undefined
  );
  assert(
    'Direct A->B: Dropdown is hidden',
    harness.isJobDropdownDisplayed === false
  );

  // Test 6: In-flight race condition test (onChange fired, network request pending)
  console.log('\n--- Scenario 5: Synchronous onChange vs asynchronous fetch arrival ---');
  harness.state.selectedJobId = 'job-A2';
  // User picks client B in dropdown
  harness.onClientSelectChange('client-B-consulting');
  assert(
    'In-flight: selectedJobId is wiped synchronously before network resolves',
    harness.state.selectedJobId === '',
    `Got '${harness.state.selectedJobId}'`
  );
  assert(
    'In-flight: effectiveJobId is immediately undefined',
    harness.effectiveJobId === undefined
  );

  // Test 7: Malformed / undefined jobs response from API
  console.log('\n--- Scenario 6: Malformed / error / null jobs payload ---');
  harness.onClientDataFetched({ jobs: null });
  assert(
    'Malformed response: state handles gracefully without throwing',
    harness.state.jobs.length === 0 && harness.state.selectedJobId === ''
  );
  assert(
    'Malformed response: effectiveJobId remains undefined',
    harness.effectiveJobId === undefined
  );

  // Test 8: Template switching across all 31 templates with Client A vs Client B
  console.log('\n--- Scenario 7: All 31 templates with Client B (0 jobs) ---');
  let clean31Count = 0;
  for (const tpl of TEMPLATE_CATALOG) {
    harness.switchClient(clientB_ZeroJobs);
    harness.switchTemplate(tpl.code);
    if (harness.state.selectedJobId === '' && harness.effectiveJobId === undefined && !harness.isJobDropdownDisplayed) {
      clean31Count++;
    }
  }
  assert(
    'All 31 templates maintain clean state (0 job leak) for 0-jobs client',
    clean31Count === TEMPLATE_CATALOG.length,
    `Clean templates: ${clean31Count}/${TEMPLATE_CATALOG.length}`
  );

  console.log('\n========================================================================');
  console.log(`TOTAL AUDIT ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error('VERDICT: REJECT (Defects Detected)');
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (Zero Cross-Client Defects Found)');
    process.exit(0);
  }
}

runAdversarialStress().catch((err) => {
  console.error('Fatal crash in stress harness:', err);
  process.exit(1);
});
