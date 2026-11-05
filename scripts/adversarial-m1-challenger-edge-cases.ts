/**
 * EMPIRICAL ADVERSARIAL EDGE CASE SUITE — MILESTONE 1 (M1.2)
 *
 * Tests specific edge cases requested by the orchestrator:
 * 1. Switching from workplace training template (training-tematica-loc-munca, training-detaliu-loc-munca)
 *    to hygiene template (hygiene-tabel-cursanti, hygiene-adeverinta, hygiene-anexe-catalog).
 * 2. Switching between clients:
 *    - Client with jobs -> Client without jobs (0 jobs)
 *    - Client with jobs (Client A) -> Client with different jobs (Client B)
 *    - Checking state consistency of selectedJobId, effectiveJobId, and UI dropdowns.
 */

import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';

interface PageSimulationState {
  selectedClientId: string;
  selectedTemplateCode: string;
  selectedEmployeeId: string;
  selectedJobId: string;
  jobs: { id: string; title: string }[];
  employees: { id: string; name: string }[];
  hygieneScope: 'client' | 'session';
  selectedHygieneSessionId: string;
  selectedHygieneParticipantId: string;
}

// Emulate exactly what src/app/documents/generate/page.tsx does
export class DocumentGeneratePageEmulator {
  state: PageSimulationState;

  constructor(initialState?: Partial<PageSimulationState>) {
    this.state = {
      selectedClientId: initialState?.selectedClientId || '',
      selectedTemplateCode: initialState?.selectedTemplateCode || '',
      selectedEmployeeId: initialState?.selectedEmployeeId || '',
      selectedJobId: initialState?.selectedJobId || '',
      jobs: initialState?.jobs || [],
      employees: initialState?.employees || [],
      hygieneScope: initialState?.hygieneScope || 'client',
      selectedHygieneSessionId: initialState?.selectedHygieneSessionId || '',
      selectedHygieneParticipantId: initialState?.selectedHygieneParticipantId || '',
    };
  }

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

  get isEmployeeDropdownDisplayed() {
    return Boolean(this.isEmployeeRequired);
  }

  get effectiveJobId(): string | undefined {
    return this.isHygieneTemplate || !this.isJobContext
      ? undefined
      : (this.state.selectedJobId || undefined);
  }

  // Simulate client select onChange + client fetch useEffect
  onClientChange(newClientId: string, clientJobs: { id: string; title: string }[]) {
    // 1. onChange handler in page.tsx line 410:
    this.state.selectedClientId = newClientId;
    this.state.selectedEmployeeId = '';
    this.state.selectedJobId = '';
    this.state.selectedHygieneParticipantId = '';

    // 2. useEffect when client changes (lines 178-201):
    if (!newClientId) {
      this.state.employees = [];
      this.state.jobs = [];
      this.state.selectedJobId = '';
      return;
    }

    // fetch('/api/clients/' + newClientId) returns clientJobs:
    this.state.jobs = clientJobs;
    if (this.isJobContext && clientJobs.length > 0) {
      this.state.selectedJobId = clientJobs.some((j) => j.id === this.state.selectedJobId)
        ? this.state.selectedJobId
        : clientJobs[0].id;
    } else {
      this.state.selectedJobId = '';
    }
  }

  // Simulate template select onChange + template switch useEffect
  onTemplateChange(newTemplateCode: string) {
    const nextTpl = TEMPLATE_CATALOG.find((t) => t.code === newTemplateCode);
    this.state.selectedTemplateCode = newTemplateCode;

    // onChange handler (lines 433-458):
    const isNextHygiene =
      nextTpl?.family === 'hygiene' ||
      nextTpl?.contextLevel === 'hygiene_session' ||
      newTemplateCode.startsWith('hygiene-');
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
    if (!isNextEmployee && newTemplateCode !== 'hygiene-adeverinta') {
      this.state.selectedEmployeeId = '';
    }

    // useEffect handler (lines 215-223):
    if (this.isHygieneTemplate || !this.isJobContext) {
      this.state.selectedJobId = '';
    }
    if (!this.isEmployeeRequired && !this.isAdeverinta) {
      this.state.selectedEmployeeId = '';
    }
  }

  // Simulate generate payload
  getGeneratePayload() {
    return {
      templateCode: this.state.selectedTemplateCode,
      clientId: this.state.selectedClientId,
      employeeId: this.state.selectedEmployeeId || undefined,
      jobId: this.effectiveJobId,
      hygieneSessionId:
        this.isHygieneTemplate && this.state.hygieneScope === 'client'
          ? undefined
          : this.state.selectedHygieneSessionId || undefined,
      hygieneParticipantId:
        this.isHygieneTemplate && this.state.hygieneScope === 'client'
          ? undefined
          : this.state.selectedHygieneParticipantId || undefined,
    };
  }
}

async function runEdgeCases() {
  console.log('================================================================');
  console.log('CHALLENGER EDGE CASE AUDIT — M1.2');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const issues: string[] = [];

  function test(name: string, condition: boolean, explanation?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
      if (explanation) {
        console.error(`         Reason: ${explanation}`);
        issues.push(`${name}: ${explanation}`);
      }
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // EDGE CASE GROUP 1: Workplace training template -> Hygiene template switches
  // -------------------------------------------------------------------------
  console.log('--- GROUP 1: Workplace Training -> Hygiene Template Switches ---');

  const workplaceTemplates = ['training-tematica-loc-munca', 'training-detaliu-loc-munca'];
  const hygieneTemplates = ['hygiene-tabel-cursanti', 'hygiene-anexe-catalog', 'hygiene-adeverinta'];

  for (const wp of workplaceTemplates) {
    for (const hyg of hygieneTemplates) {
      const page = new DocumentGeneratePageEmulator({
        selectedClientId: 'client-1',
        selectedTemplateCode: wp,
        selectedJobId: 'job-strungar-1',
        jobs: [{ id: 'job-strungar-1', title: 'Strungar' }],
      });

      // Switch to hygiene template
      page.onTemplateChange(hyg);

      test(
        `Switch ${wp} -> ${hyg}: selectedJobId is cleared`,
        page.state.selectedJobId === '',
        `Expected empty string, got '${page.state.selectedJobId}'`
      );

      test(
        `Switch ${wp} -> ${hyg}: isJobDropdownDisplayed is false`,
        page.isJobDropdownDisplayed === false,
        `Expected false, got ${page.isJobDropdownDisplayed}`
      );

      test(
        `Switch ${wp} -> ${hyg}: effectiveJobId is undefined`,
        page.effectiveJobId === undefined,
        `Expected undefined, got ${page.effectiveJobId}`
      );

      const payload = page.getGeneratePayload();
      test(
        `Switch ${wp} -> ${hyg}: generate payload has no jobId`,
        payload.jobId === undefined,
        `Expected undefined, got ${payload.jobId}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // EDGE CASE GROUP 2: Client with jobs -> Client WITHOUT jobs (0 jobs)
  // -------------------------------------------------------------------------
  console.log('\n--- GROUP 2: Switching Between Clients With/Without Jobs ---');

  // Case 2A: Client A has 2 jobs, user selects workplace training template and job-1
  const page2 = new DocumentGeneratePageEmulator({
    selectedClientId: 'client-A',
    selectedTemplateCode: 'training-tematica-loc-munca',
    selectedJobId: 'job-A1',
    jobs: [
      { id: 'job-A1', title: 'Sudor' },
      { id: 'job-A2', title: 'Lacatus' },
    ],
  });

  test(
    'Initial Client A state: Job dropdown displayed and effectiveJobId is job-A1',
    page2.isJobDropdownDisplayed === true && page2.effectiveJobId === 'job-A1',
    `isJobDropdownDisplayed: ${page2.isJobDropdownDisplayed}, effectiveJobId: ${page2.effectiveJobId}`
  );

  // Switch to Client B who has 0 jobs
  page2.onClientChange('client-B-no-jobs', []);

  test(
    'Client B (0 jobs): Job dropdown is NOT displayed',
    page2.isJobDropdownDisplayed === false,
    `Expected false, got ${page2.isJobDropdownDisplayed}`
  );

  test(
    'Client B (0 jobs): selectedJobId must NOT retain stale job-A1 from Client A',
    page2.state.selectedJobId !== 'job-A1',
    `CRITICAL STALE STATE: selectedJobId is still '${page2.state.selectedJobId}' after switching to client with 0 jobs!`
  );

  test(
    'Client B (0 jobs): effectiveJobId must be undefined',
    page2.effectiveJobId === undefined,
    `CRITICAL LEAK: effectiveJobId is '${page2.effectiveJobId}' for a client with 0 jobs!`
  );

  // Case 2B: Client A has jobs -> Client C has DIFFERENT jobs
  const page3 = new DocumentGeneratePageEmulator({
    selectedClientId: 'client-A',
    selectedTemplateCode: 'training-tematica-loc-munca',
    selectedJobId: 'job-A1',
    jobs: [
      { id: 'job-A1', title: 'Sudor' },
    ],
  });

  page3.onClientChange('client-C-other-jobs', [
    { id: 'job-C1', title: 'Bucatar' },
  ]);

  test(
    'Client C: selectedJobId must not remain Client A job-A1',
    page3.state.selectedJobId !== 'job-A1',
    `CRITICAL STALE STATE: selectedJobId retained '${page3.state.selectedJobId}' from previous client!`
  );

  test(
    'Client C: selectedJobId should auto-select Client C job-C1 or empty',
    page3.state.selectedJobId === 'job-C1' || page3.state.selectedJobId === '',
    `Expected 'job-C1' or '', got '${page3.state.selectedJobId}'`
  );

  console.log('\n================================================================');
  console.log(`TOTAL EDGE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (issues.length > 0) {
    console.log('\nIDENTIFIED ISSUES:');
    issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));
  }

  return { passed, failed, issues };
}

runEdgeCases().then(({ failed }) => {
  if (failed > 0) {
    console.log('\nVERDICT: ISSUES FOUND');
  } else {
    console.log('\nVERDICT: ALL EDGE CASES PASSED');
  }
});
