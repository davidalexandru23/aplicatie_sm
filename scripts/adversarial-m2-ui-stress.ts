/**
 * scripts/adversarial-m2-ui-stress.ts
 * 
 * Adversarial UI Stress-Test Harness for Milestone 2:
 * 1. Zero States (0 employees, 0 clients, 0 alerts, empty search results, 0 overdue)
 * 2. Missing Relations (null currentJob, null currentWorksite, null identityDocument, null CNP, missing dates)
 * 3. Extreme Inputs, Boundary Layouts, Diacritics & XSS (script injection, 500-char strings, Romanian diacritics)
 * 4. Temporal & Mathematical Threshold Boundaries (daysRemaining = 0, -1, 30, 31, NaN, clamped widths)
 * 5. Filter & Search Invariant Testing (all tabs, search query across 5 dimensions, company filter)
 * 6. Build Stability & SSR Rendering
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  ComplianceItemBadge,
  OverallComplianceBadge,
  ComplianceScoreBadge,
  ComplianceBreakdownPills,
  ComplianceAlertBanner,
} from '../src/components/compliance-badge';
import {
  ComplianceAlerts,
  FlatComplianceAlert,
} from '../src/components/compliance-alerts';
import {
  EmployeeRegistryClient,
  EmployeeWithCompliance,
} from '../src/app/employees/employee-registry-client';
import {
  calculateCompanyMetrics,
  calculateEmployeeCompliance,
  calculateItemCompliance,
  formatRoDate,
  CompanyComplianceMetrics,
  EmployeeComplianceSummary,
} from '../src/lib/compliance';
import { maskCNP } from '../src/lib/security';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runStressTest(name: string, fn: () => void): void {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`  ✗ [FAIL] ${name}:\n${msg}`);
  }
}

console.log('================================================================');
console.log('  MILESTONE 2: ADVERSARIAL UI STRESS-TEST HARNESS                ');
console.log('================================================================\n');

// =============================================================================
// SUITE 1: ZERO-STATE RESILIENCE
// =============================================================================
console.log('--- SUITE 1: ZERO-STATE RESILIENCE ---');

runStressTest('1.1 ComplianceScoreBadge with 0 items (0/0) renders 100% and emerald bar without NaN%', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, {
      scorePercent: 100,
      totalItems: 0,
      validCount: 0,
      size: 'md',
    })
  );
  assert.ok(html.includes('100%'), 'Should display 100%');
  assert.ok(html.includes('style="width:100%"'), 'Bar width should be 100%');
  assert.ok(!html.includes('NaN'), 'Should not contain NaN');
  assert.ok(html.includes('bg-emerald-500'), 'Should use emerald bar for 100%');
});

runStressTest('1.2 ComplianceScoreBadge sm variant with 0% score', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, {
      scorePercent: 0,
      size: 'sm',
    })
  );
  assert.ok(html.includes('0%'), 'Should display 0%');
  assert.ok(html.includes('bg-red-50'), 'Should use red styling for 0%');
});

runStressTest('1.3 ComplianceBreakdownPills with all zero counts', () => {
  const zeroMetrics: CompanyComplianceMetrics = {
    totalEmployees: 0,
    totalItemsTracked: 0,
    validCount: 0,
    upcomingCount: 0,
    overdueCount: 0,
    missingCount: 0,
    complianceScorePercent: 100,
  };
  const html = renderToStaticMarkup(
    React.createElement(ComplianceBreakdownPills, { metrics: zeroMetrics })
  );
  assert.ok(html.includes('Valabile'), 'Must have Valabile label');
  assert.ok(html.includes('Scadente (≤30z)'), 'Must have Upcoming label');
  assert.ok(html.includes('Expirate'), 'Must have Expirate label');
  assert.ok(html.includes('Date Lipsă'), 'Must have Date Lipsa label');
  const zeroMatches = html.match(/>0<\/div>/g);
  assert.equal(zeroMatches?.length, 4, 'All 4 pill counters must show 0');
});

runStressTest('1.4 ComplianceAlertBanner with 0 employees / 0 issues renders 100% conform banner', () => {
  const zeroMetrics: CompanyComplianceMetrics = {
    totalEmployees: 0,
    totalItemsTracked: 0,
    validCount: 0,
    upcomingCount: 0,
    overdueCount: 0,
    missingCount: 0,
    complianceScorePercent: 100,
  };
  const html = renderToStaticMarkup(
    React.createElement(ComplianceAlertBanner, {
      metrics: zeroMetrics,
      clientName: 'STARTUP ZERO SRL',
    })
  );
  assert.ok(html.includes('Dosar conform 100%'), 'Must state 100% conform');
  assert.ok(html.includes('STARTUP ZERO SRL'), 'Must render client name');
  assert.ok(html.includes('bg-emerald-50'), 'Must use emerald background');
});

runStressTest('1.5 ComplianceAlerts with 0 alerts in all categories renders clean zero-state messages', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceAlerts, {
      overdueAlerts: [],
      upcomingAlerts: [],
      missingAlerts: [],
    })
  );
  assert.ok(html.includes('Felicitări! Fără termene depășite.'), 'Must show positive overdue zero-state');
  assert.ok(html.includes('Fără scadențe în următoarele 30 de zile.'), 'Must show upcoming zero-state');
  assert.ok(!html.includes('Date incomplete:'), 'Must not display missing notice when missing count is 0');
  assert.ok(html.includes('Toate (0)'), 'Filter tab shows total 0');
});

runStressTest('1.6 EmployeeRegistryClient with 0 employees renders friendly zero-state and reset button', () => {
  const zeroMetrics: CompanyComplianceMetrics = {
    totalEmployees: 0,
    totalItemsTracked: 0,
    validCount: 0,
    upcomingCount: 0,
    overdueCount: 0,
    missingCount: 0,
    complianceScorePercent: 100,
  };
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [],
      clients: [],
      metrics: zeroMetrics,
    })
  );
  assert.ok(html.includes('Niciun salariat în categoria selectată'), 'Must render empty state message');
  assert.ok(html.includes('Resetează filtrele'), 'Must have reset filters button');
  assert.ok(html.includes('Toți (0)'), 'Tab Toți shows 0');
});

// =============================================================================
// SUITE 2: MISSING RELATIONS & NULL FIELD STRESS
// =============================================================================
console.log('\n--- SUITE 2: MISSING RELATIONS & NULL FIELD STRESS ---');

function createMockEmployee(overrides: Partial<EmployeeWithCompliance> = {}): EmployeeWithCompliance {
  const defaultSummary: EmployeeComplianceSummary = {
    employeeId: 'emp-mock-1',
    employeeName: 'Ion Popescu',
    occupationalMedicine: {
      lastDate: new Date('2025-01-15'),
      intervalMonths: 12,
      dueDate: new Date('2026-01-15'),
      daysRemaining: 75,
      status: 'VALID',
      label: 'Medicină a Muncii',
    },
    ssmTraining: {
      lastDate: new Date('2025-08-01'),
      intervalMonths: 6,
      dueDate: new Date('2026-02-01'),
      daysRemaining: 92,
      status: 'VALID',
      label: 'Instruire SSM',
    },
    psiTraining: {
      lastDate: new Date('2025-08-01'),
      intervalMonths: 6,
      dueDate: new Date('2026-02-01'),
      daysRemaining: 92,
      status: 'VALID',
      label: 'Instruire PSI/SU',
    },
    hygieneCertificate: null,
    overallStatus: 'VALID',
  };

  return {
    id: 'emp-1',
    firstName: 'Ion',
    lastName: 'Popescu',
    fullName: 'Popescu Ion',
    cnp: '1880312456789',
    status: 'ACTIV',
    hireDate: '2023-05-10T00:00:00.000Z',
    medicalFitnessVerdict: 'APT',
    client: { id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' },
    currentJob: { id: 'job-1', title: 'Inginer IT' },
    currentWorksite: { id: 'ws-1', name: 'Sediul Central' },
    identityDocument: { docType: 'CI', series: 'RD', number: '123456' },
    compliance: defaultSummary,
    ...overrides,
  };
}

runStressTest('2.1 Employee with null currentJob renders fallback text without crash', () => {
  const emp = createMockEmployee({ currentJob: null });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(html.includes('Fără funcție consemnată'), 'Must render job fallback');
});

runStressTest('2.2 Employee with null currentWorksite omits worksite line cleanly', () => {
  const emp = createMockEmployee({ currentWorksite: null });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(!html.includes('undefined'), 'Should not render undefined for worksite');
  assert.ok(html.includes('Inginer IT'), 'Job title still rendered');
});

runStressTest('2.3 Employee with null identityDocument renders only masked CNP', () => {
  const emp = createMockEmployee({ identityDocument: null });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(html.includes('18803********'), 'CNP is masked properly');
  assert.ok(!html.includes('CI RD'), 'Identity document line is safely omitted');
});

runStressTest('2.4 maskCNP boundary tests: null, empty, whitespace, short, and standard', () => {
  assert.equal(maskCNP(null), '—', 'null CNP returns em-dash');
  assert.equal(maskCNP(''), '—', 'empty CNP returns em-dash');
  assert.equal(maskCNP('   '), '***', 'whitespace CNP trimmed < 5 returns ***');
  assert.equal(maskCNP('123'), '***', 'short CNP returns ***');
  assert.equal(maskCNP('1234'), '***', '4-digit CNP returns ***');
  assert.equal(maskCNP('1880312456789'), '18803********', '13-digit CNP is masked with 8 asterisks');
});

runStressTest('2.5 Employee with all compliance dates null (MISSING) renders NEÎNREGISTRAT badges', () => {
  const missingSummary: EmployeeComplianceSummary = {
    employeeId: 'emp-missing',
    employeeName: 'Vasile FărăActe',
    occupationalMedicine: {
      lastDate: null,
      intervalMonths: 12,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label: 'Medicină a Muncii',
    },
    ssmTraining: {
      lastDate: null,
      intervalMonths: 6,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label: 'Instruire SSM',
    },
    psiTraining: {
      lastDate: null,
      intervalMonths: 6,
      dueDate: null,
      daysRemaining: null,
      status: 'MISSING',
      label: 'Instruire PSI/SU',
    },
    hygieneCertificate: null,
    overallStatus: 'MISSING',
  };

  const emp = createMockEmployee({
    id: 'emp-2',
    firstName: 'Vasile',
    lastName: 'FărăActe',
    compliance: missingSummary,
  });

  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 0,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 3,
        complianceScorePercent: 0,
      },
    })
  );
  assert.ok(html.includes('NEÎNREGISTRAT'), 'Must render NEÎNREGISTRAT badge');
  assert.ok(html.includes('3 cerințe neînregistrate'), 'Must render subtext alert');
  assert.ok(!html.includes('NaN'), 'Must not produce NaN');
});

runStressTest('2.6 Employee with null hygieneCertificate renders Neaplicabil in italic', () => {
  const emp = createMockEmployee({
    compliance: {
      ...createMockEmployee().compliance,
      hygieneCertificate: null,
    },
  });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(html.includes('Neaplicabil'), 'Renders Neaplicabil');
});

runStressTest('2.7 Employee with null medicalFitnessVerdict omits verdict line cleanly', () => {
  const emp = createMockEmployee({ medicalFitnessVerdict: null });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(!html.includes('Aviz:'), 'Should not render Aviz: label when verdict is null');
});

runStressTest('2.8 FlatComplianceAlert with null jobTitle renders client name without bullet point', () => {
  const alert: FlatComplianceAlert = {
    id: 'alt-1',
    employeeId: 'emp-1',
    employeeName: 'Elena Dumitru',
    clientId: 'c-1',
    clientName: 'Firma Test SRL',
    jobTitle: undefined,
    type: 'medical',
    label: 'Medicină a Muncii',
    status: 'OVERDUE',
    dueDate: new Date('2024-10-01'),
    daysRemaining: -31,
    lastDate: new Date('2023-10-01'),
    legalRef: 'HG 355/2007',
  };

  const html = renderToStaticMarkup(
    React.createElement(ComplianceAlerts, {
      overdueAlerts: [alert],
      upcomingAlerts: [],
      missingAlerts: [],
    })
  );
  assert.ok(html.includes('Elena Dumitru'), 'Renders employee name');
  assert.ok(html.includes('Firma Test SRL'), 'Renders client name');
  assert.ok(html.includes('EXPIRAT (31z)'), 'Renders overdue badge');
});

// =============================================================================
// SUITE 3: EXTREME INPUTS, BOUNDARY LAYOUTS, DIACRITICS & XSS RESILIENCE
// =============================================================================
console.log('\n--- SUITE 3: EXTREME INPUTS, BOUNDARY LAYOUTS, DIACRITICS & XSS RESILIENCE ---');

runStressTest('3.1 Hostile XSS vector in employee name is safely escaped', () => {
  const maliciousName = '<script>alert("XSS")</script>';
  const emp = createMockEmployee({
    firstName: maliciousName,
    lastName: 'Hacker',
    fullName: `Hacker ${maliciousName}`,
  });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(html.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'), 'Must escape script tag in HTML');
  assert.ok(!html.includes('<script>'), 'Must NOT contain raw unescaped script tag');
});

runStressTest('3.2 Hostile XSS vector in job title and client name', () => {
  const maliciousJob = '"><img src=x onerror=alert(1)>';
  const maliciousClient = 'Nexus & Co <Inject> "Test"';
  const emp = createMockEmployee({
    currentJob: { id: 'j-x', title: maliciousJob },
    client: { id: 'c-x', name: maliciousClient },
  });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'c-x', name: maliciousClient }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(!html.includes('<img src=x'), 'Must not execute unescaped img onerror');
  assert.ok(html.includes('&quot;&gt;&lt;img'), 'Img tag must be escaped');
  assert.ok(html.includes('Nexus &amp; Co &lt;Inject&gt; &quot;Test&quot;'), 'Client name must be escaped');
});

runStressTest('3.3 Ultra-long employee name (500 chars) and Romanian diacritics', () => {
  const longName = 'Constantinescu-Brâncoveanu-Mavrocordat-Cantacuzino-'.repeat(10);
  const diacriticJob = 'Șef Formație Pază, Protecție & Situații de Urgență';
  const emp = createMockEmployee({
    lastName: longName,
    firstName: 'Gheorghiță-Ștefan',
    currentJob: { id: 'j-dia', title: diacriticJob },
  });
  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: {
        totalEmployees: 1,
        totalItemsTracked: 3,
        validCount: 3,
        upcomingCount: 0,
        overdueCount: 0,
        missingCount: 0,
        complianceScorePercent: 100,
      },
    })
  );
  assert.ok(html.includes('Gheorghiță-Ștefan'), 'Romanian diacritics preserved');
  assert.ok(html.includes('Șef Formație Pază'), 'Diacritic job title preserved');
  assert.ok(html.includes('truncate max-w-[160px]'), 'Truncate class applied to job title');
});

runStressTest('3.4 Unicode emojis and international symbols in company name and overdue notes', () => {
  const emojiClient = '🛡️ RomSSM Safety Pro ✨ S.R.L.';
  const alert: FlatComplianceAlert = {
    id: 'alt-emoji',
    employeeId: 'emp-1',
    employeeName: 'Ioana Vasile',
    clientId: 'c-emoji',
    clientName: emojiClient,
    type: 'medical',
    label: 'Medicină a Muncii',
    status: 'OVERDUE',
    dueDate: new Date('2024-11-20'),
    daysRemaining: -19,
    lastDate: new Date('2023-11-20'),
    legalRef: 'HG 355/2007',
    notes: '⚠️ Restricție: Lucru la înălțime (schelă mobilă)',
  };
  const html = renderToStaticMarkup(
    React.createElement(ComplianceAlerts, {
      overdueAlerts: [alert],
      upcomingAlerts: [],
      missingAlerts: [],
    })
  );
  assert.ok(html.includes('🛡️ RomSSM Safety Pro ✨ S.R.L.'), 'Unicode emojis in client name rendered properly');
  assert.ok(html.includes('⚠️ Restricție: Lucru la înălțime'), 'Unicode emojis in overdue notes rendered properly');
  assert.ok(html.includes('EXPIRAT (19z)'), 'Days remaining rendered');
});

// =============================================================================
// SUITE 4: TEMPORAL & MATHEMATICAL THRESHOLD BOUNDARIES
// =============================================================================
console.log('\n--- SUITE 4: TEMPORAL & MATHEMATICAL THRESHOLD BOUNDARIES ---');

runStressTest('4.1 ComplianceItemBadge: daysRemaining = 0 renders SCADENT AZI', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceItemBadge, {
      status: 'UPCOMING',
      daysRemaining: 0,
      dueDate: new Date('2026-03-01'),
      label: 'Medicină a Muncii',
    })
  );
  assert.ok(html.includes('SCADENT AZI'), 'Must show SCADENT AZI');
  assert.ok(html.includes('bg-amber-50'), 'Must use amber styling');
});

runStressTest('4.2 ComplianceItemBadge: daysRemaining = 1 renders SCADENT (1z)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceItemBadge, {
      status: 'UPCOMING',
      daysRemaining: 1,
      dueDate: new Date('2026-03-02'),
      label: 'Medicină a Muncii',
    })
  );
  assert.ok(html.includes('SCADENT (1z)'), 'Must show SCADENT (1z)');
});

runStressTest('4.3 ComplianceItemBadge: daysRemaining = 30 renders SCADENT (30z)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceItemBadge, {
      status: 'UPCOMING',
      daysRemaining: 30,
      dueDate: new Date('2026-03-31'),
      label: 'Instruire SSM',
    })
  );
  assert.ok(html.includes('SCADENT (30z)'), 'Must show SCADENT (30z)');
});

runStressTest('4.4 ComplianceItemBadge: daysRemaining = 31 renders VALID (31z)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceItemBadge, {
      status: 'VALID',
      daysRemaining: 31,
      dueDate: new Date('2026-04-01'),
      label: 'Instruire SSM',
    })
  );
  assert.ok(html.includes('VALID (31z)'), 'Must show VALID (31z)');
  assert.ok(html.includes('bg-emerald-50'), 'Must use emerald styling');
});

runStressTest('4.5 ComplianceItemBadge: daysRemaining = -1 renders EXPIRAT (1z)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceItemBadge, {
      status: 'OVERDUE',
      daysRemaining: -1,
      dueDate: new Date('2026-02-28'),
      label: 'Medicină a Muncii',
    })
  );
  assert.ok(html.includes('EXPIRAT (1z)'), 'Must show EXPIRAT (1z)');
  assert.ok(html.includes('bg-red-50'), 'Must use red styling');
});

runStressTest('4.6 ComplianceItemBadge: daysRemaining = -180 renders EXPIRAT (180z)', () => {
  const html = renderToStaticMarkup(
    React.createElement(ComplianceItemBadge, {
      status: 'OVERDUE',
      daysRemaining: -180,
      dueDate: new Date('2025-08-01'),
      label: 'Instruire PSI',
    })
  );
  assert.ok(html.includes('EXPIRAT (180z)'), 'Must show EXPIRAT (180z)');
});

runStressTest('4.7 ComplianceScoreBadge: bar width clamping for negative or extreme percentages', () => {
  const htmlNeg = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, { scorePercent: -15 })
  );
  assert.ok(htmlNeg.includes('style="width:0%"'), 'Negative percentage clamped to 0%');

  const htmlOver = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, { scorePercent: 125.5 })
  );
  assert.ok(htmlOver.includes('style="width:100%"'), 'Over 100% percentage clamped to 100%');
});

runStressTest('4.8 ComplianceScoreBadge: color threshold boundaries', () => {
  const html69 = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, { scorePercent: 69.9 })
  );
  assert.ok(html69.includes('text-red-700') && html69.includes('bg-red-500'), '69.9% must be Red');

  const html70 = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, { scorePercent: 70.0 })
  );
  assert.ok(html70.includes('text-amber-700') && html70.includes('bg-amber-500'), '70.0% must be Amber');

  const html89 = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, { scorePercent: 89.9 })
  );
  assert.ok(html89.includes('text-amber-700') && html89.includes('bg-amber-500'), '89.9% must be Amber');

  const html90 = renderToStaticMarkup(
    React.createElement(ComplianceScoreBadge, { scorePercent: 90.0 })
  );
  assert.ok(html90.includes('text-emerald-700') && html90.includes('bg-emerald-500'), '90.0% must be Emerald');
});

runStressTest('4.9 ComplianceAlertBanner priority hierarchy: OVERDUE > MISSING > UPCOMING', () => {
  const m1: CompanyComplianceMetrics = {
    totalEmployees: 5,
    totalItemsTracked: 15,
    validCount: 10,
    upcomingCount: 2,
    overdueCount: 2,
    missingCount: 1,
    complianceScorePercent: 66.67,
  };
  const htmlOverdue = renderToStaticMarkup(
    React.createElement(ComplianceAlertBanner, { metrics: m1, clientName: 'Firma Alpha' })
  );
  assert.ok(htmlOverdue.includes('Atenție: 2 cerințe legale cu termen depășit!'), 'Overdue takes highest priority');

  const m2: CompanyComplianceMetrics = {
    totalEmployees: 5,
    totalItemsTracked: 15,
    validCount: 12,
    upcomingCount: 2,
    overdueCount: 0,
    missingCount: 1,
    complianceScorePercent: 80,
  };
  const htmlMissing = renderToStaticMarkup(
    React.createElement(ComplianceAlertBanner, { metrics: m2, clientName: 'Firma Alpha' })
  );
  assert.ok(htmlMissing.includes('Date incomplete: 1 elemente neînregistrate'), 'Missing takes priority when overdue is 0');

  const m3: CompanyComplianceMetrics = {
    totalEmployees: 5,
    totalItemsTracked: 15,
    validCount: 13,
    upcomingCount: 2,
    overdueCount: 0,
    missingCount: 0,
    complianceScorePercent: 86.67,
  };
  const htmlUpcoming = renderToStaticMarkup(
    React.createElement(ComplianceAlertBanner, { metrics: m3, clientName: 'Firma Alpha' })
  );
  assert.ok(htmlUpcoming.includes('Scadențe în următoarele 30 de zile:'), 'Upcoming shown when overdue and missing are 0');
});

// =============================================================================
// SUITE 5: FILTER & SEARCH INVARIANT TESTING
// =============================================================================
console.log('\n--- SUITE 5: FILTER & SEARCH INVARIANT TESTING ---');

runStressTest('5.1 Tab counts in EmployeeRegistryClient partition employee total exactly', () => {
  const e1 = createMockEmployee({ id: 'e1', compliance: { ...createMockEmployee().compliance, overallStatus: 'VALID' } });
  const e2 = createMockEmployee({ id: 'e2', compliance: { ...createMockEmployee().compliance, overallStatus: 'UPCOMING' } });
  const e3 = createMockEmployee({ id: 'e3', compliance: { ...createMockEmployee().compliance, overallStatus: 'OVERDUE' } });
  const e4 = createMockEmployee({ id: 'e4', compliance: { ...createMockEmployee().compliance, overallStatus: 'MISSING' } });
  const e5 = createMockEmployee({ id: 'e5', compliance: { ...createMockEmployee().compliance, overallStatus: 'VALID' } });

  const employees = [e1, e2, e3, e4, e5];
  const metrics = calculateCompanyMetrics(employees.map(e => ({
    id: e.id,
    medicalLastExamDate: e.compliance.occupationalMedicine.lastDate,
    ssmLastTrainingDate: e.compliance.ssmTraining.lastDate,
    psiLastTrainingDate: e.compliance.psiTraining.lastDate,
  })));

  const html = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees,
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics,
    })
  );

  assert.ok(html.includes('Toți (5)'), 'Tab Toți must show 5');
  assert.ok(html.includes('Conformi (2)'), 'Tab Conformi must show 2');
  assert.ok(html.includes('Scadenți curând (1)'), 'Tab Scadenți must show 1');
  assert.ok(html.includes('Termene depășite (1)'), 'Tab Termene depășite must show 1');
  assert.ok(html.includes('Date lipsă (1)'), 'Tab Date lipsă must show 1');
});

runStressTest('5.2 Subtext alert formatting across distinct conditions', () => {
  const emp1 = createMockEmployee({
    compliance: {
      ...createMockEmployee().compliance,
      overallStatus: 'OVERDUE',
      ssmTraining: { ...createMockEmployee().compliance.ssmTraining, status: 'OVERDUE' },
    },
  });
  const html1 = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp1],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: { totalEmployees: 1, totalItemsTracked: 3, validCount: 2, upcomingCount: 0, overdueCount: 1, missingCount: 0, complianceScorePercent: 66.67 },
    })
  );
  assert.ok(html1.includes('1 termen depășit'), 'Must format singular 1 termen depășit');

  const emp2 = createMockEmployee({
    compliance: {
      ...createMockEmployee().compliance,
      overallStatus: 'OVERDUE',
      ssmTraining: { ...createMockEmployee().compliance.ssmTraining, status: 'OVERDUE' },
      psiTraining: { ...createMockEmployee().compliance.psiTraining, status: 'OVERDUE' },
    },
  });
  const html2 = renderToStaticMarkup(
    React.createElement(EmployeeRegistryClient, {
      employees: [emp2],
      clients: [{ id: 'client-1', name: 'NEXUS SOLUTIONS S.R.L.' }],
      metrics: { totalEmployees: 1, totalItemsTracked: 3, validCount: 1, upcomingCount: 0, overdueCount: 2, missingCount: 0, complianceScorePercent: 33.33 },
    })
  );
  assert.ok(html2.includes('2 termene depășite'), 'Must format plural 2 termene depășite');
});

runStressTest('5.3 Search logic invariant test across names, CNP, client, job, worksite', () => {
  const employees: EmployeeWithCompliance[] = [
    createMockEmployee({
      id: 'e1',
      firstName: 'Dan',
      lastName: 'Ionescu',
      cnp: '1850101123456',
      client: { id: 'c1', name: 'ALFA CONSTRUCT SRL' },
      currentJob: { id: 'j1', title: 'Dulgher' },
      currentWorksite: { id: 'w1', name: 'Șantier Băneasa' },
    }),
    createMockEmployee({
      id: 'e2',
      firstName: 'Maria',
      lastName: 'Voinea',
      cnp: '2920512654321',
      client: { id: 'c2', name: 'BETA LOGISTICS SRL' },
      currentJob: { id: 'j2', title: 'Stivuitorist' },
      currentWorksite: { id: 'w2', name: 'Depozit Pantelimon' },
    }),
  ];

  function filterHelper(list: EmployeeWithCompliance[], query: string) {
    const q = query.trim().toLowerCase();
    return list.filter((emp) => {
      const nameMatch = `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q);
      const cnpMatch = (emp.cnp || '').toLowerCase().includes(q);
      const clientMatch = (emp.client.name || '').toLowerCase().includes(q);
      const jobMatch = (emp.currentJob?.title || '').toLowerCase().includes(q);
      const worksiteMatch = (emp.currentWorksite?.name || '').toLowerCase().includes(q);
      return nameMatch || cnpMatch || clientMatch || jobMatch || worksiteMatch;
    });
  }

  assert.equal(filterHelper(employees, 'ionescu').length, 1);
  assert.equal(filterHelper(employees, 'ionescu')[0].id, 'e1');
  assert.equal(filterHelper(employees, 'maria').length, 1);
  assert.equal(filterHelper(employees, 'maria')[0].id, 'e2');
  assert.equal(filterHelper(employees, '292051').length, 1);
  assert.equal(filterHelper(employees, '292051')[0].id, 'e2');
  assert.equal(filterHelper(employees, 'stivuitorist').length, 1);
  assert.equal(filterHelper(employees, 'dulgher').length, 1);
  assert.equal(filterHelper(employees, 'băneasa').length, 1);
  assert.equal(filterHelper(employees, 'pantelimon').length, 1);
  assert.equal(filterHelper(employees, 'beta logistics').length, 1);
  assert.equal(filterHelper(employees, 'nonexistentxyz').length, 0);
  assert.equal(filterHelper(employees, '.*+?^${}()|[]\\').length, 0);
});

// =============================================================================
// SUITE 6: BUILD & TYPE COMPILATION STABILITY
// =============================================================================
console.log('\n--- SUITE 6: BUILD & TYPE COMPILATION STABILITY ---');

runStressTest('6.1 TypeScript compilation check (tsc --noEmit)', () => {
  const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
  delete cleanEnv['NODE_OPTIONS'];
  const output = execSync('npx tsc --noEmit', {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: 'pipe',
    env: cleanEnv,
  });
  assert.equal(output.trim(), '', 'tsc --noEmit should produce zero errors or warnings');
});

runStressTest('6.2 Production application build (npm run build)', () => {
  const cleanEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production' };
  delete cleanEnv['NODE_OPTIONS'];
  const buildOutput = execSync('npm run build', {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: 'pipe',
    env: cleanEnv,
  });
  assert.ok(buildOutput.includes('Compiled successfully') || buildOutput.includes('Generating static pages'), 'Build must succeed');
});

// =============================================================================
// SUMMARY REPORT
// =============================================================================
console.log('\n================================================================');
console.log(`  STRESS-TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
if (failedTests > 0) {
  console.error(`  STATUS: REJECT — ${failedTests} failure(s) detected!`);
  console.log('================================================================');
  process.exit(1);
} else {
  console.log('  STATUS: APPROVE — 100% of adversarial tests passed cleanly.');
  console.log('================================================================');
  process.exit(0);
}
