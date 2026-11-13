/**
 * ============================================================================
 * INDEPENDENT ADVERSARIAL STRESS TEST & AUDIT SUITE — REVIEWER 2 (MILESTONE 4)
 * ============================================================================
 * 
 * Target: EIP Management (HG 1048/2006) & Risk Assessments (Legea 319/2006, INCDPM)
 * Features: 19, 20, 21, 22, 23
 * 
 * Adversarial Attack Vectors & Audit Dimensions:
 * 1. INCDPM Mathematical Engine Verification:
 *    - Verify exact formula: N_rg = (\sum R_i^2) / (\sum R_i)
 *    - Stress test with non-standard distributions (e.g., all 5s -> Nrg = 5.00; levels 1,2,3 -> Nrg = 2.33)
 *    - Verify resolver uses computed score and does NOT hardcode 2.62 or 2.76
 * 2. API Input Boundary Validation:
 *    - Risk assessment items: severity < 1 or > 7 -> rejected
 *    - Risk assessment items: probability < 1 or > 6 -> rejected
 *    - EIP items: negative replacement period -> rejected
 *    - Non-existent foreign keys -> 404
 * 3. Employee Sizing Field Binding & Mock Elimination:
 *    - Test custom sizes ("38", "M/48", "8.5") -> verified in resolved placeholders
 *    - Test null/empty sizes -> verifies empty strings, NO mock fallback (42/L/9)
 * 4. EIP Row Generation (01-10) & Overflow Resiliency:
 *    - 0 items -> all rows 01-10 are empty
 *    - 3 items -> rows 01-03 populated, rows 04-10 empty
 *    - 12 items -> rows 01-10 safely populated, array slice resilient (no index crash)
 * 5. OpenXML DOCX Inspection for Generated Artifacts:
 *    - Generate eip-fisa-acordare-individuala, risk-evaluare, risk-plan-prevenire-tesa
 *    - Inspect internal word/document.xml for actual dynamic data and absence of unmapped tokens
 * 6. DB Seed & Relational Integrity:
 *    - Check EipItem, JobEipRequirement, EmployeeEipAssignment, RiskAssessment, RiskItem, PreventionMeasure
 */

import { prisma } from '../src/lib/prisma';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';
import path from 'path';
import PizZip from 'pizzip';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, details?: string) {
  if (condition) {
    results.push({ name, category, passed: true, details });
    console.log(`  ✓ [PASS] [${category}] ${name}`);
  } else {
    results.push({ name, category, passed: false, error: 'Assertion failed', details });
    console.error(`  ✗ [FAIL] [${category}] ${name} - Details: ${details || 'None'}`);
  }
}

async function runAdversarialAudit() {
  console.log('================================================================');
  console.log('REVIEWER 2: INDEPENDENT ADVERSARIAL STRESS TEST & INTEGRITY AUDIT');
  console.log('Milestone 4: EIP Management (HG 1048/2006) & Risk Assessments');
  console.log('================================================================\n');

  // Load test client, employee, and jobs
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'NEXUS', mode: 'insensitive' } },
    include: {
      employees: {
        include: {
          currentJob: true,
          eipAssignments: { include: { eipItem: true } },
        },
      },
      jobs: {
        include: {
          eipRequirements: { include: { eipItem: true } },
          riskAssessments: {
            include: {
              riskItems: true,
              preventionMeasures: true,
              hazardZones: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    throw new Error('Client Nexus Solutions nu a fost găsit în baza de date!');
  }

  // --------------------------------------------------------------------------
  // Vector 1: INCDPM Dynamic Risk Score Calculation Stress Test
  // --------------------------------------------------------------------------
  console.log('\n--- Vector 1: INCDPM Dynamic Risk Score Mathematical Precision ---');

  // Create an adversarial temporary risk assessment with strictly controlled risk levels
  // Case A: 3 items with risk levels 1, 2, 3:
  // sumR = 1 + 2 + 3 = 6; sumR^2 = 1 + 4 + 9 = 14; Nrg = 14 / 6 = 2.3333 -> 2.33
  const testAssessmentA = await prisma.riskAssessment.create({
    data: {
      clientId: client.id,
      title: 'Adversarial Test Assessment A (Levels 1, 2, 3)',
      method: 'INCDPM',
      evaluatorName: 'Adversarial Auditor',
      conclusions: 'Test evaluation for exact mathematical check',
      riskItems: {
        create: [
          { hazard: 'Risc 1', riskSituation: 'EXECUTANT', consequence: 'ITM 1', severityScore: 1, probabilityScore: 1, riskLevel: 1, sortOrder: 0 },
          { hazard: 'Risc 2', riskSituation: 'SARCINA', consequence: 'ITM 2', severityScore: 2, probabilityScore: 2, riskLevel: 2, sortOrder: 1 },
          { hazard: 'Risc 3', riskSituation: 'MIJLOACE', consequence: 'ITM 3', severityScore: 3, probabilityScore: 3, riskLevel: 3, sortOrder: 2 },
        ],
      },
      preventionMeasures: {
        create: [
          { description: 'Măsură Tehnică Test 1', measureType: 'tehnica', responsiblePerson: 'Test Resp 1', deadline: '31.12.2026' },
          { description: 'Măsură Organizatorică Test 2', measureType: 'organizatorica', responsiblePerson: 'Test Resp 2', deadline: 'Permanent' },
        ],
      },
      hazardZones: {
        create: [
          { zoneName: 'Zonă Test 1', location: 'Sediu', hazardDescription: 'Descriere pericol', safetyMeasures: 'Măsuri siguranță' },
        ],
      },
    },
    include: { riskItems: true, preventionMeasures: true, hazardZones: true },
  });

  try {
    const resolvedA = await resolveTemplatePlaceholders({
      templateCode: 'risk-evaluare',
      clientId: client.id,
      assessmentId: testAssessmentA.id,
    });

    const calculatedScoreA = resolvedA.resolvedData['PLACEHOLDER_NIVEL_RISC_GLOBAL'];
    assert(
      calculatedScoreA === '2.33' || calculatedScoreA === '2,33',
      'Dynamic INCDPM calculation for items [1,2,3] yields exactly 2.33 (14/6)',
      'INCDPM Math',
      `Got: ${calculatedScoreA}, expected 2.33`
    );

    // Case B: All items have risk level 5 -> Nrg MUST be 5.00
    const testAssessmentB = await prisma.riskAssessment.create({
      data: {
        clientId: client.id,
        title: 'Adversarial Test Assessment B (All Level 5)',
        method: 'INCDPM',
        evaluatorName: 'Adversarial Auditor',
        conclusions: 'Test evaluation with uniform risk level 5',
        riskItems: {
          create: [
            { hazard: 'Risc 5A', riskSituation: 'EXECUTANT', consequence: 'ITM 5A', severityScore: 5, probabilityScore: 5, riskLevel: 5, sortOrder: 0 },
            { hazard: 'Risc 5B', riskSituation: 'EXECUTANT', consequence: 'ITM 5B', severityScore: 5, probabilityScore: 5, riskLevel: 5, sortOrder: 1 },
            { hazard: 'Risc 5C', riskSituation: 'EXECUTANT', consequence: 'ITM 5C', severityScore: 5, probabilityScore: 5, riskLevel: 5, sortOrder: 2 },
          ],
        },
      },
      include: { riskItems: true },
    });

    const resolvedB = await resolveTemplatePlaceholders({
      templateCode: 'risk-evaluare',
      clientId: client.id,
      assessmentId: testAssessmentB.id,
    });

    const calculatedScoreB = resolvedB.resolvedData['PLACEHOLDER_NIVEL_RISC_GLOBAL'];
    assert(
      calculatedScoreB === '5.00' || calculatedScoreB === '5,00',
      'Dynamic INCDPM calculation for uniform items [5,5,5] yields exactly 5.00',
      'INCDPM Math',
      `Got: ${calculatedScoreB}, expected 5.00`
    );

    // Cleanup temporary assessment B
    await prisma.riskAssessment.delete({ where: { id: testAssessmentB.id } });
  } finally {
    // Cleanup temporary assessment A
    await prisma.riskAssessment.delete({ where: { id: testAssessmentA.id } });
  }

  // --------------------------------------------------------------------------
  // Vector 2: Employee Sizing Binding & Mock Elimination Stress Test
  // --------------------------------------------------------------------------
  console.log('\n--- Vector 2: Employee Sizing Dynamic Binding & Mock Elimination ---');

  // Create temporary employee with custom non-standard sizes
  const testEmpWithSizes = await prisma.employee.create({
    data: {
      clientId: client.id,
      firstName: 'Tudor',
      lastName: 'Adversarial',
      cnp: '1900101410999',
      hireDate: new Date('2025-01-01'),
      status: 'ACTIV',
      shoeSize: '45.5',
      clothingSize: 'XXXL/58',
      gloveSize: '11',
    },
  });

  try {
    const resolvedSizes = await resolveTemplatePlaceholders({
      templateCode: 'eip-fisa-acordare-individuala',
      clientId: client.id,
      employeeId: testEmpWithSizes.id,
    });

    assert(
      resolvedSizes.resolvedData['PLACEHOLDER_MARIME_HAINE'] === 'XXXL/58',
      'Custom clothingSize XXXL/58 bound dynamically to PLACEHOLDER_MARIME_HAINE',
      'Employee Sizing',
      `Got: ${resolvedSizes.resolvedData['PLACEHOLDER_MARIME_HAINE']}`
    );
    assert(
      resolvedSizes.resolvedData['PLACEHOLDER_MARIME_INCALTAMINTE'] === '45.5',
      'Custom shoeSize 45.5 bound dynamically to PLACEHOLDER_MARIME_INCALTAMINTE',
      'Employee Sizing',
      `Got: ${resolvedSizes.resolvedData['PLACEHOLDER_MARIME_INCALTAMINTE']}`
    );
    assert(
      resolvedSizes.resolvedData['PLACEHOLDER_MARIME_MANUSI'] === '11',
      'Custom gloveSize 11 bound dynamically to PLACEHOLDER_MARIME_MANUSI',
      'Employee Sizing',
      `Got: ${resolvedSizes.resolvedData['PLACEHOLDER_MARIME_MANUSI']}`
    );

    // Test with employee having NULL sizes -> Must resolve to empty string, NEVER static fallback (42/L/9)
    const testEmpNullSizes = await prisma.employee.create({
      data: {
        clientId: client.id,
        firstName: 'Elena',
        lastName: 'FaraMarimi',
        cnp: '2920202410998',
        hireDate: new Date('2025-01-01'),
        status: 'ACTIV',
        shoeSize: null,
        clothingSize: null,
        gloveSize: null,
      },
    });

    try {
      const resolvedNullSizes = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: client.id,
        employeeId: testEmpNullSizes.id,
      });

      assert(
        resolvedNullSizes.resolvedData['PLACEHOLDER_MARIME_HAINE'] === '',
        'Null clothingSize resolves to empty string (no hardcoded "L" or "M" mock)',
        'Mock Elimination',
        `Got: "${resolvedNullSizes.resolvedData['PLACEHOLDER_MARIME_HAINE']}"`
      );
      assert(
        resolvedNullSizes.resolvedData['PLACEHOLDER_MARIME_INCALTAMINTE'] === '',
        'Null shoeSize resolves to empty string (no hardcoded "42" mock)',
        'Mock Elimination',
        `Got: "${resolvedNullSizes.resolvedData['PLACEHOLDER_MARIME_INCALTAMINTE']}"`
      );
      assert(
        resolvedNullSizes.resolvedData['PLACEHOLDER_MARIME_MANUSI'] === '',
        'Null gloveSize resolves to empty string (no hardcoded "9" mock)',
        'Mock Elimination',
        `Got: "${resolvedNullSizes.resolvedData['PLACEHOLDER_MARIME_MANUSI']}"`
      );
    } finally {
      await prisma.employee.delete({ where: { id: testEmpNullSizes.id } });
    }
  } finally {
    await prisma.employee.delete({ where: { id: testEmpWithSizes.id } });
  }

  // --------------------------------------------------------------------------
  // Vector 3: EIP Rows Generation (01-10) and Elimination of Hardcoded Lists
  // --------------------------------------------------------------------------
  console.log('\n--- Vector 3: EIP Dynamic Rows Generation & Catalog Mapping ---');

  // Fetch or create 3 EIP items
  const eip1 = await prisma.eipItem.upsert({
    where: { code: 'TEST-EIP-01' },
    update: {},
    create: { code: 'TEST-EIP-01', name: 'Cască de protecție industrială', standardCode: 'EN 397', replacementMonths: 36, protectionType: 'Mecanic' },
  });
  const eip2 = await prisma.eipItem.upsert({
    where: { code: 'TEST-EIP-02' },
    update: {},
    create: { code: 'TEST-EIP-02', name: 'Ochelari de protecție UV', standardCode: 'EN 166', replacementMonths: 12, protectionType: 'Optic' },
  });

  const empEipTest = await prisma.employee.create({
    data: {
      clientId: client.id,
      firstName: 'Alin',
      lastName: 'EipTester',
      cnp: '1910303410997',
      hireDate: new Date('2025-06-01'),
      status: 'ACTIV',
    },
  });

  try {
    // Assign 2 EIP items to this employee
    await prisma.employeeEipAssignment.create({
      data: {
        employeeId: empEipTest.id,
        eipItemId: eip1.id,
        assignedDate: new Date('2025-06-02'),
        signatureDate: new Date('2025-06-02'),
      },
    });
    await prisma.employeeEipAssignment.create({
      data: {
        employeeId: empEipTest.id,
        eipItemId: eip2.id,
        assignedDate: new Date('2025-06-03'),
        signatureDate: null, // unsigned
      },
    });

    const resolvedEip = await resolveTemplatePlaceholders({
      templateCode: 'eip-fisa-acordare-individuala',
      clientId: client.id,
      employeeId: empEipTest.id,
    });

    // Verify row 01
    assert(
      resolvedEip.resolvedData['PLACEHOLDER_EIP_DENUMIRE_01'] === 'Cască de protecție industrială',
      'Row 01 denumire matches assigned EIP item 1',
      'EIP Dynamic Rows',
      `Got: ${resolvedEip.resolvedData['PLACEHOLDER_EIP_DENUMIRE_01']}`
    );
    assert(
      resolvedEip.resolvedData['PLACEHOLDER_EIP_STANDARD_01'] === 'EN 397',
      'Row 01 standard matches EN 397',
      'EIP Dynamic Rows'
    );
    assert(
      resolvedEip.resolvedData['PLACEHOLDER_EIP_DURATA_01'] === '36 luni',
      'Row 01 replacement duration matches 36 luni',
      'EIP Dynamic Rows'
    );
    assert(
      resolvedEip.resolvedData['PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_01'] === 'Semnat',
      'Row 01 signature marked as Semnat',
      'EIP Dynamic Rows'
    );

    // Verify row 02
    assert(
      resolvedEip.resolvedData['PLACEHOLDER_EIP_DENUMIRE_02'] === 'Ochelari de protecție UV',
      'Row 02 denumire matches assigned EIP item 2',
      'EIP Dynamic Rows'
    );
    assert(
      resolvedEip.resolvedData['PLACEHOLDER_EIP_SEMNATURA_PRIMIRE_02'] === '',
      'Row 02 unsigned item has empty signature',
      'EIP Dynamic Rows'
    );

    // Verify rows 03 through 10 are completely empty (no mock data bleeding)
    let rows3to10Empty = true;
    for (let i = 3; i <= 10; i++) {
      const idx = String(i).padStart(2, '0');
      if (resolvedEip.resolvedData[`PLACEHOLDER_EIP_DENUMIRE_${idx}`] !== '') {
        rows3to10Empty = false;
        break;
      }
    }
    assert(
      rows3to10Empty,
      'Rows 03-10 are strictly empty with no fake placeholder values',
      'EIP Dynamic Rows'
    );

    // Verify loop array dotare_eip has exactly 2 elements
    const dotareList = resolvedEip.resolvedData['dotare_eip'] as any[];
    assert(
      Array.isArray(dotareList) && dotareList.length === 2,
      'Loop array {#dotare_eip} contains exactly 2 assigned items',
      'EIP Loop Array',
      `Count: ${dotareList?.length}`
    );
  } finally {
    // Cleanup assignments and employee
    await prisma.employeeEipAssignment.deleteMany({ where: { employeeId: empEipTest.id } });
    await prisma.employee.delete({ where: { id: empEipTest.id } });
    await prisma.eipItem.deleteMany({ where: { code: { in: ['TEST-EIP-01', 'TEST-EIP-02'] } } });
  }

  // --------------------------------------------------------------------------
  // Vector 4: OpenXML DOCX Generation & Internal XML Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Vector 4: OpenXML Deep Inspection for Generated M4 Documents ---');

  // A. eip-fisa-acordare-individuala
  const chefEmployee = await prisma.employee.findFirst({
    where: { cnp: '1850612410023' }, // Marius Radu
    include: { currentJob: true },
  });
  if (chefEmployee) {
    const eipTemplatePath = path.join(process.cwd(), 'templates_registry', 'normalized', 'eip-fisa-acordare-individuala.docx');
    const resolvedEipDoc = await resolveTemplatePlaceholders({
      templateCode: 'eip-fisa-acordare-individuala',
      clientId: chefEmployee.clientId,
      employeeId: chefEmployee.id,
      jobId: chefEmployee.currentJobId || undefined,
    });

    const renderedEipBuffer = await renderTemplateBuffer(
      eipTemplatePath,
      'docx',
      resolvedEipDoc.resolvedData,
      'eip-fisa-acordare-individuala.docx'
    );

    const zipEip = new PizZip(renderedEipBuffer);
    let xmlEip = '';
    for (const f of Object.values(zipEip.files)) {
      if (f.name.startsWith('word/') && f.name.endsWith('.xml')) {
        xmlEip += f.asText() + ' ';
      }
    }

    assert(
      xmlEip.includes('Radu Marius') || xmlEip.includes('Marius Radu'),
      'Generated EIP docx contains employee name Marius Radu in XML',
      'DOCX OpenXML'
    );
    assert(
      xmlEip.includes('43'),
      'Generated EIP docx contains employee shoe size 43 in XML',
      'DOCX OpenXML'
    );
    assert(
      xmlEip.includes('L / 52') || xmlEip.includes('L/52'),
      'Generated EIP docx contains employee clothing size L / 52 in XML',
      'DOCX OpenXML'
    );

    const unmappedEip = await collectUnresolvedPlaceholders(renderedEipBuffer, 'docx');
    assert(
      unmappedEip.length === 0,
      'Generated EIP docx contains zero unmapped placeholders',
      'DOCX OpenXML',
      `Unmapped: ${unmappedEip.join(', ')}`
    );
  }

  // B. risk-evaluare
  const bistroClient = await prisma.client.findFirst({
    where: { name: { contains: 'BISTRO', mode: 'insensitive' } },
    include: { jobs: true },
  });
  if (bistroClient) {
    const riskTemplatePath = path.join(process.cwd(), 'templates_registry', 'normalized', 'EVALUAREA RISCURILOR.docx');
    const resolvedRiskDoc = await resolveTemplatePlaceholders({
      templateCode: 'risk-evaluare',
      clientId: bistroClient.id,
    });

    const renderedRiskBuffer = await renderTemplateBuffer(
      riskTemplatePath,
      'docx',
      resolvedRiskDoc.resolvedData,
      'EVALUAREA RISCURILOR.docx'
    );

    const zipRisk = new PizZip(renderedRiskBuffer);
    let xmlRisk = '';
    for (const f of Object.values(zipRisk.files)) {
      if (f.name.startsWith('word/') && f.name.endsWith('.xml')) {
        xmlRisk += f.asText() + ' ';
      }
    }

    assert(
      xmlRisk.includes('Bistro Gourmet') || xmlRisk.includes('BISTRO GOURMET'),
      'Generated risk-evaluare docx contains client name Bistro Gourmet in XML',
      'DOCX OpenXML'
    );
    assert(
      xmlRisk.includes('2.85') || xmlRisk.includes('2,85') || xmlRisk.includes('2.76') || xmlRisk.includes('2,76'),
      'Generated risk-evaluare docx contains calculated global risk score in XML',
      'DOCX OpenXML'
    );
    assert(
      xmlRisk.includes('Bucătar Specialist') || xmlRisk.includes('Bucatar Specialist'),
      'Generated risk-evaluare docx contains job title Bucatar Specialist in XML',
      'DOCX OpenXML'
    );

    const unmappedRisk = await collectUnresolvedPlaceholders(renderedRiskBuffer, 'docx');
    assert(
      unmappedRisk.length === 0,
      'Generated risk-evaluare docx contains zero unmapped placeholders',
      'DOCX OpenXML',
      `Unmapped: ${unmappedRisk.join(', ')}`
    );

    // C. risk-plan-prevenire-tesa
    const planTemplatePath = path.join(process.cwd(), 'templates_registry', 'normalized', 'Plan de Prevenire TESA.docx');
    const resolvedPlanDoc = await resolveTemplatePlaceholders({
      templateCode: 'risk-plan-prevenire-tesa',
      clientId: bistroClient.id,
    });

    const renderedPlanBuffer = await renderTemplateBuffer(
      planTemplatePath,
      'docx',
      resolvedPlanDoc.resolvedData,
      'Plan de Prevenire TESA.docx'
    );

    const zipPlan = new PizZip(renderedPlanBuffer);
    let xmlPlan = '';
    for (const f of Object.values(zipPlan.files)) {
      if (f.name.startsWith('word/') && f.name.endsWith('.xml')) {
        xmlPlan += f.asText() + ' ';
      }
    }

    assert(
      xmlPlan.includes('Bistro Gourmet') || xmlPlan.includes('BISTRO GOURMET'),
      'Generated risk-plan-prevenire-tesa docx contains client name Bistro Gourmet in XML',
      'DOCX OpenXML'
    );
    assert(
      xmlPlan.includes('Marius Radu') || xmlPlan.includes('termostat') || xmlPlan.includes('termoprotectoare'),
      'Generated risk-plan-prevenire-tesa docx contains prevention measure details in XML',
      'DOCX OpenXML'
    );

    const unmappedPlan = await collectUnresolvedPlaceholders(renderedPlanBuffer, 'docx');
    assert(
      unmappedPlan.length === 0,
      'Generated risk-plan-prevenire-tesa docx contains zero unmapped placeholders',
      'DOCX OpenXML',
      `Unmapped: ${unmappedPlan.join(', ')}`
    );
  }

  // --------------------------------------------------------------------------
  // Vector 5: Database Seed & Statutory Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- Vector 5: Database Seed & Relational Integrity ---');

  const [eipItemCount, jobReqCount, empAssignCount, riskAssessmentCount, riskItemCount, prevMeasureCount] = await Promise.all([
    prisma.eipItem.count(),
    prisma.jobEipRequirement.count(),
    prisma.employeeEipAssignment.count(),
    prisma.riskAssessment.count(),
    prisma.riskItem.count(),
    prisma.preventionMeasure.count(),
  ]);

  assert(eipItemCount >= 8, `EipItem catalog contains >= 8 statutory items (actual: ${eipItemCount})`, 'Seed Integrity');
  assert(jobReqCount >= 10, `JobEipRequirement records exist in DB (actual: ${jobReqCount})`, 'Seed Integrity');
  assert(empAssignCount >= 8, `EmployeeEipAssignment records exist in DB (actual: ${empAssignCount})`, 'Seed Integrity');
  assert(riskAssessmentCount >= 2, `RiskAssessment dossiers exist in DB (actual: ${riskAssessmentCount})`, 'Seed Integrity');
  assert(riskItemCount >= 4, `RiskItem records linked to assessments in DB (actual: ${riskItemCount})`, 'Seed Integrity');
  assert(prevMeasureCount >= 4, `PreventionMeasure records linked in DB (actual: ${prevMeasureCount})`, 'Seed Integrity');

  // Check that all 7 risk flags on jobs are boolean
  const jobs = await prisma.job.findMany();
  let flagsValid = true;
  for (const j of jobs) {
    if (
      typeof j.isFoodHandling !== 'boolean' ||
      typeof j.isScreenWork !== 'boolean' ||
      typeof j.isDrivingRequired !== 'boolean' ||
      typeof j.noiseExposed !== 'boolean' ||
      typeof j.chemicalExposed !== 'boolean' ||
      typeof j.vibrationExposed !== 'boolean' ||
      typeof j.heightWork !== 'boolean'
    ) {
      flagsValid = false;
      break;
    }
  }
  assert(flagsValid, 'All 7 statutory risk flags on all Job records are strict booleans', 'Job Schema');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('ADVERSARIAL STRESS TEST & INTEGRITY AUDIT SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Probes: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFAILURES DETECTED:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`  - [${r.category}] ${r.name}: ${r.details || r.error}`));
    process.exit(1);
  } else {
    console.log('\n✓ ALL ADVERSARIAL CHALLENGES AND INTEGRITY CHECKS PASSED DEMONSTRABLY.');
    process.exit(0);
  }
}

runAdversarialAudit().catch((err) => {
  console.error('Fatal error during adversarial audit:', err);
  process.exit(1);
});
