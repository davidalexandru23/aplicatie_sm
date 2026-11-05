/**
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 1 (M1.2)
 *
 * Verifies UI Logic, Template Categorization, and State Transitions in
 * `src/app/documents/generate/page.tsx` against all 31 templates in `TEMPLATE_CATALOG`.
 */

import { TEMPLATE_CATALOG, TemplateDefinition } from '../src/lib/templates/definitions';

interface SimulationState {
  selectedClientId: string;
  selectedTemplateCode: string;
  selectedEmployeeId: string;
  selectedJobId: string;
  hygieneScope: 'client' | 'session';
  selectedHygieneSessionId: string;
}

export function simulatePageLogic(
  templateCode: string,
  state: SimulationState,
  jobsCount = 2,
  employeesCount = 3
) {
  const currentTemplate = TEMPLATE_CATALOG.find((t) => t.code === templateCode);
  if (!currentTemplate) throw new Error(`Unknown template code: ${templateCode}`);

  const isHygieneTemplate =
    currentTemplate?.family === 'hygiene' ||
    currentTemplate?.contextLevel === 'hygiene_session' ||
    templateCode.startsWith('hygiene-');

  const isEmployeeRequired =
    !isHygieneTemplate && currentTemplate?.contextLevel === 'employee';

  const isAdeverinta = templateCode === 'hygiene-adeverinta';

  // isJobContext helper used in page.tsx lines 184, 209, 241, 336
  const isJobContext =
    !isEmployeeRequired &&
    !isHygieneTemplate &&
    Boolean(
      currentTemplate?.contextLevel === 'job' ||
      currentTemplate?.family === 'risk' ||
      currentTemplate?.code?.includes('loc-munca') ||
      currentTemplate?.fields?.some((f) => f?.source?.startsWith('job.'))
    );

  // Job predicate from src/app/documents/generate/page.tsx line 528
  const isJobDropdownDisplayed =
    isJobContext &&
    Boolean(state.selectedClientId) &&
    jobsCount > 0;

  // Employee predicate from src/app/documents/generate/page.tsx line 470
  const isEmployeeDropdownDisplayed = Boolean(isEmployeeRequired);

  // effectiveJobId from lines 245-248 and 340-343
  const effectiveJobId =
    isHygieneTemplate || !isJobContext
      ? undefined
      : (state.selectedJobId || undefined);

  return {
    template: currentTemplate,
    isHygieneTemplate,
    isEmployeeRequired,
    isAdeverinta,
    isJobDropdownDisplayed,
    isEmployeeDropdownDisplayed,
    isJobContext,
    effectiveJobId,
  };
}

export function simulateTemplateSwitch(
  fromCode: string,
  toCode: string,
  initialState: Partial<SimulationState> = {}
) {
  let state: SimulationState = {
    selectedClientId: 'client-1',
    selectedTemplateCode: fromCode,
    selectedEmployeeId: initialState.selectedEmployeeId || '',
    selectedJobId: initialState.selectedJobId || '',
    hygieneScope: initialState.hygieneScope || 'client',
    selectedHygieneSessionId: initialState.selectedHygieneSessionId || '',
  };

  // Switch to toCode using onChange logic (lines 436-456)
  const nextTpl = TEMPLATE_CATALOG.find((t) => t.code === toCode);
  if (!nextTpl) throw new Error(`Unknown template code: ${toCode}`);

  state.selectedTemplateCode = toCode;

  const isNextHygiene =
    nextTpl?.family === 'hygiene' ||
    nextTpl?.contextLevel === 'hygiene_session' ||
    toCode.startsWith('hygiene-');
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
    state.selectedJobId = '';
  }
  if (!isNextEmployee && toCode !== 'hygiene-adeverinta') {
    state.selectedEmployeeId = '';
  }

  // Also simulate useEffect (lines 207-219)
  const isHygieneTemplate = isNextHygiene;
  const isEmployeeRequired = isNextEmployee;
  const isAdeverinta = toCode === 'hygiene-adeverinta';
  const isJobContext =
    !isEmployeeRequired &&
    !isHygieneTemplate &&
    Boolean(
      nextTpl?.contextLevel === 'job' ||
      nextTpl?.family === 'risk' ||
      nextTpl?.code?.includes('loc-munca') ||
      nextTpl?.fields?.some((f) => f?.source?.startsWith('job.'))
    );

  if (isHygieneTemplate || !isJobContext) {
    state.selectedJobId = '';
  }
  if (!isEmployeeRequired && !isAdeverinta) {
    state.selectedEmployeeId = '';
  }

  return {
    finalState: state,
    sim: simulatePageLogic(toCode, state),
  };
}

// ---------------------------------------------------------------------------
// Run Test Suite
// ---------------------------------------------------------------------------
async function runEmpiricalChallengerSuite() {
  console.log('================================================================');
  console.log('EMPIRICAL ADVERSARIAL CHALLENGER SUITE — M1.2');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const failureDetails: string[] = [];

  function assert(condition: boolean, testName: string, failureExplanation?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      if (failureExplanation) {
        console.error(`         Reason: ${failureExplanation}`);
        failureDetails.push(`${testName}: ${failureExplanation}`);
      }
      failed++;
    }
  }

  // TEST SUITE 1: Predicate verification across all 31 templates
  console.log('--- TEST SUITE 1: Predicate Behavior Across All 31 Templates ---');
  assert(TEMPLATE_CATALOG.length === 31, 'Total templates count is exactly 31');

  // Check 1: Hygiene templates (3 templates)
  const hygieneTemplates = ['hygiene-adeverinta', 'hygiene-anexe-catalog', 'hygiene-tabel-cursanti'];
  for (const code of hygieneTemplates) {
    const res = simulatePageLogic(code, {
      selectedClientId: 'c-1',
      selectedTemplateCode: code,
      selectedEmployeeId: '',
      selectedJobId: '',
      hygieneScope: 'client',
      selectedHygieneSessionId: '',
    });
    assert(
      !res.isJobDropdownDisplayed,
      `Hygiene template ${code}: Job dropdown is NEVER displayed`,
      `Expected Job dropdown false, got ${res.isJobDropdownDisplayed}`
    );
    assert(
      res.effectiveJobId === undefined,
      `Hygiene template ${code}: effectiveJobId is undefined`,
      `Expected effectiveJobId undefined, got ${res.effectiveJobId}`
    );
  }

  // Check 2: General client templates
  const generalClientTemplates = [
    'decizii-angajator',
    'ipssm-birou',
    'hr-info-dosar',
    'ipssm-alunecari',
    'ipssm-autovehicule',
    'ipssm-universale',
    'ipssm-opis',
    'training-detaliu-introductiv',
    'training-tematica-introductiv',
  ];
  for (const code of generalClientTemplates) {
    const res = simulatePageLogic(code, {
      selectedClientId: 'c-1',
      selectedTemplateCode: code,
      selectedEmployeeId: '',
      selectedJobId: '',
      hygieneScope: 'client',
      selectedHygieneSessionId: '',
    });
    assert(
      !res.isJobDropdownDisplayed,
      `General client template ${code}: Job dropdown is NOT displayed`,
      `Expected Job dropdown false, got ${res.isJobDropdownDisplayed}`
    );
    assert(
      !res.isEmployeeDropdownDisplayed,
      `General client template ${code}: Employee dropdown is NOT displayed`,
      `Expected Employee dropdown false, got ${res.isEmployeeDropdownDisplayed}`
    );
  }

  // Check 3: Employee-level templates (12 templates)
  const employeeTemplates = [
    'hr-cim-2026',
    'ssm-fisa-instruire-individuala',
    'psi-fisa-instructaj-individuala',
    'hr-anexa-fisa-post',
    'hr-cerere-angajare',
    'hr-declaratie-regulament',
    'hr-declaratie-raspundere',
    'hr-gdpr-informare',
    'med-fisa-solicitare-examen',
    'med-fisa-identificare-riscuri',
    'eip-fisa-acordare-individuala',
    'hr-cim-model-cadru-2022',
  ];
  for (const code of employeeTemplates) {
    const res = simulatePageLogic(code, {
      selectedClientId: 'c-1',
      selectedTemplateCode: code,
      selectedEmployeeId: 'emp-1',
      selectedJobId: 'job-1',
      hygieneScope: 'client',
      selectedHygieneSessionId: '',
    });
    assert(
      res.isEmployeeDropdownDisplayed,
      `Employee template ${code}: Employee dropdown IS displayed`,
      `Expected employee dropdown true, got ${res.isEmployeeDropdownDisplayed}`
    );
    assert(
      !res.isJobDropdownDisplayed,
      `Employee template ${code}: Job dropdown is NOT displayed (auto-populated from employee)`,
      `Expected Job dropdown false, got ${res.isJobDropdownDisplayed}`
    );
  }

  // Check 4: Job-level templates (Prompt Requirement 2, Bullet 3)
  console.log('\n--- TEST SUITE 2: Job-Level Templates per Specification ---');
  // Specifically requested by prompt:
  // "For job-level templates (e.g. risk-evaluare, training-tematica-loc-munca): Job dropdown IS displayed."
  const resRiskEvaluare = simulatePageLogic('risk-evaluare', {
    selectedClientId: 'c-1',
    selectedTemplateCode: 'risk-evaluare',
    selectedEmployeeId: '',
    selectedJobId: '',
    hygieneScope: 'client',
    selectedHygieneSessionId: '',
  });
  assert(
    resRiskEvaluare.isJobDropdownDisplayed,
    'risk-evaluare: Job dropdown IS displayed',
    `Expected Job dropdown true, got ${resRiskEvaluare.isJobDropdownDisplayed}`
  );

  const resTematicaLocMunca = simulatePageLogic('training-tematica-loc-munca', {
    selectedClientId: 'c-1',
    selectedTemplateCode: 'training-tematica-loc-munca',
    selectedEmployeeId: '',
    selectedJobId: '',
    hygieneScope: 'client',
    selectedHygieneSessionId: '',
  });
  assert(
    resTematicaLocMunca.isJobDropdownDisplayed,
    'training-tematica-loc-munca: Job dropdown IS displayed',
    `Expected Job dropdown true, got ${resTematicaLocMunca.isJobDropdownDisplayed}. Template family is '${resTematicaLocMunca.template.family}', contextLevel is '${resTematicaLocMunca.template.contextLevel}', but it requires job fields (PLACEHOLDER_FUNCTIE: job.title)`
  );

  const resDetaliuLocMunca = simulatePageLogic('training-detaliu-loc-munca', {
    selectedClientId: 'c-1',
    selectedTemplateCode: 'training-detaliu-loc-munca',
    selectedEmployeeId: '',
    selectedJobId: '',
    hygieneScope: 'client',
    selectedHygieneSessionId: '',
  });
  assert(
    resDetaliuLocMunca.isJobDropdownDisplayed,
    'training-detaliu-loc-munca: Job dropdown IS displayed',
    `Expected Job dropdown true, got ${resDetaliuLocMunca.isJobDropdownDisplayed}. Template family is '${resDetaliuLocMunca.template.family}', contextLevel is '${resDetaliuLocMunca.template.contextLevel}', but it requires job fields (PLACEHOLDER_FUNCTIE: job.title)`
  );

  // Check 5: Catalog Context Level Audit
  console.log('\n--- TEST SUITE 3: Catalog contextLevel Audit ---');
  const contextLevels = TEMPLATE_CATALOG.map((t) => t.contextLevel);
  const countJobContext = contextLevels.filter((lvl) => lvl === 'job').length;
  console.log(`  Catalog distribution: client=${contextLevels.filter((l) => l === 'client').length}, employee=${contextLevels.filter((l) => l === 'employee').length}, hygiene_session=${contextLevels.filter((l) => l === 'hygiene_session').length}, job=${countJobContext}`);
  assert(
    countJobContext > 0,
    "TEMPLATE_CATALOG contains templates with contextLevel === 'job'",
    `Zero templates have contextLevel === 'job' in TEMPLATE_CATALOG! The predicate '(currentTemplate?.contextLevel === "job" || currentTemplate?.family === "risk")' can never match on contextLevel === 'job'.`
  );

  // Check 6: State Transitions
  console.log('\n--- TEST SUITE 4: State Transitions Edge Cases ---');

  // Transition A: Job template -> Hygiene template
  const transA = simulateTemplateSwitch('risk-evaluare', 'hygiene-tabel-cursanti', {
    selectedJobId: 'job-cook',
  });
  assert(
    transA.finalState.selectedJobId === '',
    'Transition risk-evaluare -> hygiene-tabel-cursanti resets selectedJobId to empty string',
    `Expected '', got '${transA.finalState.selectedJobId}'`
  );
  assert(
    !transA.sim.isJobDropdownDisplayed,
    'Transition risk-evaluare -> hygiene-tabel-cursanti hides Job dropdown',
    `Expected Job dropdown false, got ${transA.sim.isJobDropdownDisplayed}`
  );
  assert(
    transA.sim.effectiveJobId === undefined,
    'Transition risk-evaluare -> hygiene-tabel-cursanti effectiveJobId is undefined',
    `Expected effectiveJobId undefined, got ${transA.sim.effectiveJobId}`
  );

  // Transition B: Employee template -> General client template
  const transB = simulateTemplateSwitch('hr-cim-2026', 'decizii-angajator', {
    selectedEmployeeId: 'emp-123',
    selectedJobId: 'job-123',
  });
  assert(
    transB.finalState.selectedEmployeeId === '',
    'Transition hr-cim-2026 -> decizii-angajator resets selectedEmployeeId to empty string',
    `Expected '', got '${transB.finalState.selectedEmployeeId}'`
  );
  assert(
    transB.finalState.selectedJobId === '',
    'Transition hr-cim-2026 -> decizii-angajator resets selectedJobId to empty string',
    `Expected '', got '${transB.finalState.selectedJobId}'`
  );
  assert(
    !transB.sim.isJobDropdownDisplayed,
    'Transition hr-cim-2026 -> decizii-angajator hides Job dropdown',
    `Expected Job dropdown false, got ${transB.sim.isJobDropdownDisplayed}`
  );
  assert(
    !transB.sim.isEmployeeDropdownDisplayed,
    'Transition hr-cim-2026 -> decizii-angajator hides Employee dropdown',
    `Expected Employee dropdown false, got ${transB.sim.isEmployeeDropdownDisplayed}`
  );

  // Transition C: Hygiene adeverinta (employee selected) -> General client template
  const transC = simulateTemplateSwitch('hygiene-adeverinta', 'ipssm-birou', {
    selectedEmployeeId: 'emp-123',
  });
  assert(
    transC.finalState.selectedEmployeeId === '',
    'Transition hygiene-adeverinta -> ipssm-birou resets selectedEmployeeId to empty string',
    `Expected '', got '${transC.finalState.selectedEmployeeId}'`
  );

  // Transition D: Hygiene adeverinta -> Hygiene catalog
  const transD = simulateTemplateSwitch('hygiene-adeverinta', 'hygiene-anexe-catalog', {
    selectedEmployeeId: 'emp-123',
  });
  assert(
    transD.finalState.selectedEmployeeId === '',
    'Transition hygiene-adeverinta -> hygiene-anexe-catalog resets selectedEmployeeId to empty string',
    `Expected '', got '${transD.finalState.selectedEmployeeId}'`
  );

  // Summary
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failureDetails.length > 0) {
    console.log('\nFAILURES SUMMARY:');
    failureDetails.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
  }

  return { passed, failed, failureDetails };
}

runEmpiricalChallengerSuite().then(({ failed }) => {
  if (failed > 0) {
    console.log('\nVERDICT: REJECT (Defects identified)');
    process.exit(1);
  } else {
    console.log('\nVERDICT: APPROVE');
    process.exit(0);
  }
});
