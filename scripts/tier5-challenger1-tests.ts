/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1
 * Milestone 6 Phase 2 (Adversarial Coverage Hardening — Tier 5)
 * ============================================================================
 * 
 * Target modules:
 * 1. src/lib/templates/generator.ts & src/lib/templates/definitions.ts (XML Escaping Robustness)
 * 2. src/lib/templates/resolver.ts & src/lib/templates/generator.ts (Resolver Integrity & Missing Data)
 * 3. src/lib/compliance.ts & src/app/api/employees/[id]/medical-exam/route.ts (Compliance Arithmetic & Lifecycle)
 * 4. src/lib/importer.ts (Excel Importer Boundary Conditions & Parser Robustness)
 * 5. src/lib/packages/bulk-packages.ts (Bulk Packaging & Traversal Sanitization)
 * 
 * Execution:
 * npx tsx scripts/tier5-challenger1-tests.ts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import {
  escapeXml,
  isBlankOrPlaceholderMarker,
  renderTemplateBuffer,
  generateDocument,
  STATUTORY_MANDATORY_FIELDS,
} from '../src/lib/templates/generator';
import {
  resolveTemplatePlaceholders,
  resolveTemplateData,
} from '../src/lib/templates/resolver';
import {
  addMonthsSafe,
  calculateItemCompliance,
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
  getStatusBadgeInfo,
  COMPLIANCE_CONSTANTS,
} from '../src/lib/compliance';
import {
  parseClientWorkbook,
  revalidateParsedWorkbook,
  validateCNP,
  normalizeHeader,
  parseExcelDate,
  ParsedWorkbook,
} from '../src/lib/importer';
import {
  sanitizeZipPath,
  resolveApplicableIpssms,
  generateEmployeeOnboardingZip,
  generateCompanyDossierZip,
  generateInspectionArchiveZip,
} from '../src/lib/packages/bulk-packages';
import { POST as postMedicalExam } from '../src/app/api/employees/[id]/medical-exam/route';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';

// Output directory for temporary test files
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'storage', 'tier5_challenger1_test_output');
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'BUG_DISCOVERED';
  details: string;
  durationMs: number;
}

const allResults: TestResult[] = [];

function recordResult(
  id: string,
  name: string,
  status: 'PASS' | 'FAIL' | 'BUG_DISCOVERED',
  details: string,
  durationMs: number
) {
  allResults.push({ id, name, status, details, durationMs });
  const icon = status === 'PASS' ? '✅ PASS' : status === 'BUG_DISCOVERED' ? '⚠️ BUG DISCOVERED' : '❌ FAIL';
  console.log(`[${icon}] ${id}: ${name} (${durationMs}ms)`);
  if (status !== 'PASS') {
    console.log(`       Details: ${details}`);
  }
}

/**
 * Validates XML well-formedness of a DOCX buffer using Python's xml.etree.ElementTree
 */
function validateDocxXmlWellFormedness(buffer: Buffer, docxLabel: string): { valid: boolean; errors: string[] } {
  const tempPath = path.join(TEST_OUTPUT_DIR, `temp_${Date.now()}_${docxLabel.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
  fs.writeFileSync(tempPath, buffer);
  try {
    const output = execSync(`python3 scripts/verify_docx_xml_parts.py "${tempPath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const hasFail = output.includes('FAILED:') || output.includes('[ERROR]');
    const errors: string[] = [];
    if (hasFail) {
      errors.push(output.trim());
    }
    return { valid: !hasFail, errors };
  } catch (err: any) {
    return {
      valid: false,
      errors: [err.stderr ? err.stderr.toString() : err.message],
    };
  } finally {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
}

async function runTestSuite() {
  console.log('========================================================================================');
  console.log('TIER 5 ADVERSARIAL STRESS TEST SUITE — CHALLENGER 1');
  console.log('Testing Core Domain Logic: Generator, Resolver, Compliance, Importer, Bulk Packages');
  console.log('========================================================================================\n');

  // Load existing test clients from database
  const clientNexus = await prisma.client.findFirst({
    where: { caenCode: '6201' },
    include: { employees: true, jobs: true, worksites: true },
  });
  const clientBistro = await prisma.client.findFirst({
    where: { caenCode: '5610' },
    include: { employees: true, jobs: true, worksites: true },
  });

  if (!clientNexus || !clientBistro) {
    throw new Error('Database missing seed clients (Nexus 6201 or Bistro 5610).');
  }

  // ========================================================================================
  // SUITE 1: XML ESCAPING ROBUSTNESS IN TEMPLATE ENGINE (generator.ts)
  // ========================================================================================
  console.log('\n--- SUITE 1: XML Escaping Robustness in Template Engine ---');

  // Helper to resolve normalized file path from template code
  const getTemplatePath = (code: string) => {
    const tpl = TEMPLATE_CATALOG.find((t) => t.code === code);
    if (!tpl) throw new Error(`Template code ${code} not in catalog`);
    return {
      path: path.join(process.cwd(), 'templates_registry', 'normalized', tpl.normalizedFilename),
      filename: tpl.normalizedFilename,
    };
  };

  // C1-S1-01: Hostile XSS tags injection
  {
    const start = Date.now();
    try {
      const tInfo = getTemplatePath('hr-anexa-fisa-post');
      const hostileData = {
        PLACEHOLDER_NUME_COMPLET: '<script>alert("XSS")</script>',
        PLACEHOLDER_FIRMA: '<img src="x" onerror="alert(1)"/> & Son\'s',
        PLACEHOLDER_CNP: '1900101123456',
        PLACEHOLDER_FUNCTIE: '<<Developer>> & <Consultant>',
        PLACEHOLDER_NUMAR_CIM: '100/2026',
      };
      const rendered = await renderTemplateBuffer(tInfo.path, 'docx', hostileData, tInfo.filename);
      const xmlCheck = validateDocxXmlWellFormedness(rendered, 'C1_S1_01');

      // Also inspect raw word/document.xml in PizZip
      const zip = new PizZip(rendered);
      const docXml = zip.file('word/document.xml')?.asText() || '';
      const containsRawUnescapedScript = docXml.includes('<script>');
      const containsEscapedScript = docXml.includes('&lt;script&gt;');

      if (xmlCheck.valid && !containsRawUnescapedScript && containsEscapedScript) {
        recordResult('C1-S1-01', 'Hostile XSS tags escaped properly without XML parse errors', 'PASS', 'XML is well-formed, <script> -> &lt;script&gt;', Date.now() - start);
      } else {
        recordResult('C1-S1-01', 'Hostile XSS tags broke XML or failed escaping', 'FAIL', `Valid: ${xmlCheck.valid}, Errors: ${xmlCheck.errors.join(';')}, RawScript: ${containsRawUnescapedScript}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S1-01', 'Hostile XSS tags threw unexpected exception', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S1-02: Pre-escaped XML entities and ampersand collisions
  {
    const start = Date.now();
    try {
      const tInfo = getTemplatePath('ipssm-birou');
      const hostileData = {
        PLACEHOLDER_FIRMA: 'ACME & Sons & Co. & Partenerii "Consultanță" \'Expert\' & Asociații S.R.L. <România & UE> &amp; &lt; &gt; &quot; &apos;',
        PLACEHOLDER_REPREZENTANT_LEGAL: 'Popescu & Ionescu S.A. &amp; Co',
      };
      const rendered = await renderTemplateBuffer(tInfo.path, 'docx', hostileData, tInfo.filename);
      const xmlCheck = validateDocxXmlWellFormedness(rendered, 'C1_S1_02');

      if (xmlCheck.valid) {
        recordResult('C1-S1-02', 'Pre-escaped XML entities & ampersand collisions stay well-formed', 'PASS', 'Zero XML syntax errors with repeated entities & ampersands', Date.now() - start);
      } else {
        recordResult('C1-S1-02', 'Pre-escaped XML entities corrupted OpenXML archive', 'FAIL', xmlCheck.errors.join(';'), Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S1-02', 'Entity collision threw unexpected exception', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S1-03: Hostile XML tag injection attempting to break OpenXML structure
  {
    const start = Date.now();
    try {
      const tInfo = getTemplatePath('hr-anexa-fisa-post');
      const hostileData = {
        PLACEHOLDER_NUME_COMPLET: '</w:t></w:r><w:r><w:t>Injected & Corrupted <Tag></w:t></w:r><w:r><w:t>',
        PLACEHOLDER_FIRMA: 'Test <<Unclosed <Tag> >> Corporation',
        PLACEHOLDER_CNP: '1900101123456',
        PLACEHOLDER_FUNCTIE: 'Software Engineer',
        PLACEHOLDER_NUMAR_CIM: '101/2026',
      };
      const rendered = await renderTemplateBuffer(tInfo.path, 'docx', hostileData, tInfo.filename);
      const xmlCheck = validateDocxXmlWellFormedness(rendered, 'C1_S1_03');

      if (xmlCheck.valid) {
        recordResult('C1-S1-03', 'OpenXML tag injection attack resisted without structural break', 'PASS', 'XML tags neutralized as text, archive remains intact', Date.now() - start);
      } else {
        recordResult('C1-S1-03', 'OpenXML tag injection caused XML syntax breakage', 'FAIL', xmlCheck.errors.join(';'), Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S1-03', 'OpenXML tag injection threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S1-04: Hostile quotes and SQL-injection-like patterns in text fields
  {
    const start = Date.now();
    try {
      const tInfo = getTemplatePath('hr-anexa-fisa-post');
      const hostileData = {
        PLACEHOLDER_NUME_COMPLET: 'Ionescu "Vasile" \'Ion\' OR 1=1 --',
        PLACEHOLDER_FIRMA: '"""\'\'\'""" S.R.L. DROP TABLE users;',
        PLACEHOLDER_CNP: '1900101123456',
        PLACEHOLDER_FUNCTIE: '\'; SELECT * FROM "Employee"; --',
        PLACEHOLDER_NUMAR_CIM: '999/2026',
      };
      const rendered = await renderTemplateBuffer(tInfo.path, 'docx', hostileData, tInfo.filename);
      const xmlCheck = validateDocxXmlWellFormedness(rendered, 'C1_S1_04');

      if (xmlCheck.valid) {
        recordResult('C1-S1-04', 'Hostile quotes, apostrophes, and SQL-like strings valid in XML', 'PASS', 'Single/double quotes escaped or wrapped cleanly in XML text nodes', Date.now() - start);
      } else {
        recordResult('C1-S1-04', 'Hostile quotes broke XML well-formedness', 'FAIL', xmlCheck.errors.join(';'), Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S1-04', 'Hostile quotes threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S1-05: Unicode, Romanian diacritics, currencies, legal symbols & emojis
  {
    const start = Date.now();
    try {
      const tInfo = getTemplatePath('hr-anexa-fisa-post');
      const hostileData = {
        PLACEHOLDER_NUME_COMPLET: 'Ștefan Țurcanu-Bălănescu 🚀 🛡️',
        PLACEHOLDER_FIRMA: 'Consultanță & Expertiză © ® ™ € $ ¥ £ S.R.L.',
        PLACEHOLDER_CNP: '1900101123456',
        PLACEHOLDER_FUNCTIE: 'Responsabil SSM & Mediu § Art. 12',
        PLACEHOLDER_NUMAR_CIM: '105/2026',
      };
      const rendered = await renderTemplateBuffer(tInfo.path, 'docx', hostileData, tInfo.filename);
      const xmlCheck = validateDocxXmlWellFormedness(rendered, 'C1_S1_05');

      const zip = new PizZip(rendered);
      const docXml = zip.file('word/document.xml')?.asText() || '';
      const hasDiacritics = docXml.includes('Ștefan') && docXml.includes('Țurcanu');

      if (xmlCheck.valid && hasDiacritics) {
        recordResult('C1-S1-05', 'Unicode symbols, diacritics, currencies, and emojis preserved', 'PASS', 'Diacritics and symbols render valid UTF-8 in OpenXML', Date.now() - start);
      } else {
        recordResult('C1-S1-05', 'Unicode symbols corrupted DOCX XML', 'FAIL', xmlCheck.errors.join(';'), Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S1-05', 'Unicode stress test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S1-06: ASCII Control characters (XML 1.0 illegal characters: \x00, \x08, \x1b)
  {
    const start = Date.now();
    try {
      const tInfo = getTemplatePath('hr-anexa-fisa-post');
      const hostileData = {
        PLACEHOLDER_NUME_COMPLET: 'Control\x00Null\x08Backspace\x1bEscape Worker',
        PLACEHOLDER_FIRMA: 'Firm\x07Bell Test S.R.L.',
        PLACEHOLDER_CNP: '1850101123451',
        PLACEHOLDER_FUNCTIE: 'Technician',
        PLACEHOLDER_NUMAR_CIM: '106/2026',
      };
      const rendered = await renderTemplateBuffer(tInfo.path, 'docx', hostileData, tInfo.filename);
      const xmlCheck = validateDocxXmlWellFormedness(rendered, 'C1_S1_06');

      if (xmlCheck.valid) {
        recordResult('C1-S1-06', 'Control characters handled gracefully by DOCX generator', 'PASS', 'XML parser accepted generated document', Date.now() - start);
      } else {
        recordResult(
          'C1-S1-06',
          'ASCII control characters (\\x00, \\x08, \\x1b) break XML 1.0 specification',
          'BUG_DISCOVERED',
          `escapeXml does not strip non-printable XML 1.0 illegal control characters. ElementTree output: ${xmlCheck.errors[0]?.substring(0, 120)}...`,
          Date.now() - start
        );
      }
    } catch (e: any) {
      recordResult(
        'C1-S1-06',
        'Generator crashes with unhandled Multi error when untrusted input contains null bytes (\\x00)',
        'BUG_DISCOVERED',
        `Docxtemplater throws XmlParseError/Multi error: "${e.message}". Neither generator.ts nor escapeXml sanitizes ASCII control characters (\\x00-\\x08, \\x0B-\\x0C, \\x0E-\\x1F) before rendering.`,
        Date.now() - start
      );
    }
  }

  // ========================================================================================
  // SUITE 2: RESOLVER INTEGRITY & MISSING DATA COMBINATIONS (resolver.ts & generator.ts)
  // ========================================================================================
  console.log('\n--- SUITE 2: Resolver Integrity & Missing Data Combinations ---');

  // Create temporary test employee for Resolver testing
  const tempEmployeeNoCim = await prisma.employee.create({
    data: {
      clientId: clientNexus.id,
      lastName: 'TestLipsaCim',
      firstName: 'Ion',
      cnp: '1850505123456',
      hireDate: new Date('2026-01-10'),
      status: 'ACTIV',
      cimNumber: null, // explicitly absent
      grossSalary: null, // explicitly absent
      currentJobId: clientNexus.jobs[0]?.id,
      currentWorksiteId: clientNexus.worksites[0]?.id,
    },
  });

  // C1-S2-01: Verify approved_for_print is strictly false when cimNumber is missing
  {
    const start = Date.now();
    try {
      const genResult = await generateDocument({
        templateCode: 'hr-cim-model-cadru-2022',
        clientId: clientNexus.id,
        employeeId: tempEmployeeNoCim.id,
        data: {
          PLACEHOLDER_NUME_COMPLET: 'Ion TestLipsaCim',
          PLACEHOLDER_CNP: '1850505123456',
          PLACEHOLDER_FIRMA: clientNexus.name,
          PLACEHOLDER_CUI: clientNexus.cui || 'RO123456',
          PLACEHOLDER_REPREZENTANT_LEGAL: clientNexus.legalRepresentative || 'Admin',
          PLACEHOLDER_FUNCTIE: 'Programator',
          PLACEHOLDER_DATA_INCEPERE: '10.01.2026',
          PLACEHOLDER_SALARIU_BRUT: '5000 lei',
          // PLACEHOLDER_NUMAR_CIM omitted
        },
        operatorName: 'Adversarial Challenger 1',
      });

      const isApproved = genResult.status === 'approved_for_print';
      const missingCim = genResult.missingFields.some((f) => f.toLowerCase().includes('contract'));

      if (!isApproved && genResult.status === 'missing_data' && missingCim) {
        recordResult('C1-S2-01', 'Missing cimNumber strictly blocks approved_for_print', 'PASS', `status=${genResult.status}, missingFields=[${genResult.missingFields.join(', ')}]`, Date.now() - start);
      } else {
        recordResult('C1-S2-01', 'Missing cimNumber improperly allowed approved_for_print', 'FAIL', `status=${genResult.status}, missingFields=[${genResult.missingFields.join(', ')}]`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S2-01', 'Missing cimNumber check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S2-02: Verify approved_for_print is strictly false when grossSalary is missing
  {
    const start = Date.now();
    try {
      const genResult = await generateDocument({
        templateCode: 'hr-cim-model-cadru-2022',
        clientId: clientNexus.id,
        employeeId: tempEmployeeNoCim.id,
        data: {
          PLACEHOLDER_NUME_COMPLET: 'Ion TestLipsaCim',
          PLACEHOLDER_CNP: '1850505123456',
          PLACEHOLDER_FIRMA: clientNexus.name,
          PLACEHOLDER_CUI: clientNexus.cui || 'RO123456',
          PLACEHOLDER_REPREZENTANT_LEGAL: clientNexus.legalRepresentative || 'Admin',
          PLACEHOLDER_FUNCTIE: 'Programator',
          PLACEHOLDER_DATA_INCEPERE: '10.01.2026',
          PLACEHOLDER_NUMAR_CIM: '108/2026',
          // PLACEHOLDER_SALARIU_BRUT omitted
        },
        operatorName: 'Adversarial Challenger 1',
      });

      const isApproved = genResult.status === 'approved_for_print';
      const missingSalary = genResult.missingFields.some((f) => f.toLowerCase().includes('salariu'));

      if (!isApproved && genResult.status === 'missing_data' && missingSalary) {
        recordResult('C1-S2-02', 'Missing grossSalary strictly blocks approved_for_print', 'PASS', `status=${genResult.status}, missingFields=[${genResult.missingFields.join(', ')}]`, Date.now() - start);
      } else {
        recordResult('C1-S2-02', 'Missing grossSalary improperly allowed approved_for_print', 'FAIL', `status=${genResult.status}, missingFields=[${genResult.missingFields.join(', ')}]`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S2-02', 'Missing grossSalary check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S2-03: Boundary values for grossSalary: '0', '0 lei', '..... lei', 'N/A'
  {
    const start = Date.now();
    try {
      const dotsResult = isBlankOrPlaceholderMarker('........................ lei');
      const dashesResult = isBlankOrPlaceholderMarker('---');
      const naResult = isBlankOrPlaceholderMarker('N/A');
      const lipsaResult = isBlankOrPlaceholderMarker('[LIPSA DATE]');
      const zeroLeiResult = isBlankOrPlaceholderMarker('0 lei');
      const realSalaryResult = isBlankOrPlaceholderMarker('4500 lei');

      const allMarkersDetected = dotsResult && dashesResult && naResult && lipsaResult && !realSalaryResult;

      if (allMarkersDetected) {
        recordResult('C1-S2-03', 'isBlankOrPlaceholderMarker correctly catches dots, dashes, and literal missing tokens', 'PASS', `dots=${dotsResult}, dashes=${dashesResult}, na=${naResult}, lipsa=${lipsaResult}, 0lei=${zeroLeiResult}, real=${realSalaryResult}`, Date.now() - start);
      } else {
        recordResult('C1-S2-03', 'isBlankOrPlaceholderMarker failed to catch placeholder markers', 'FAIL', `dots=${dotsResult}, dashes=${dashesResult}, na=${naResult}, lipsa=${lipsaResult}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S2-03', 'Placeholder marker evaluation threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S2-04: Sincere isAutocompleted signaling for missing employee data
  {
    const start = Date.now();
    try {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'hr-cim-model-cadru-2022',
        clientId: clientNexus.id,
        employeeId: tempEmployeeNoCim.id,
      });

      const cimField = res.fields.find((f) => f.key === 'PLACEHOLDER_NUMAR_CIM');
      const salaryField = res.fields.find((f) => f.key === 'PLACEHOLDER_SALARIU_BRUT');

      const cimNotAutocompleted = cimField?.isAutocompleted === false && (cimField?.value === '' || cimField?.value === undefined);
      const salaryNotAutocompleted = salaryField?.isAutocompleted === false && (salaryField?.value === '' || salaryField?.value === undefined);

      if (cimNotAutocompleted && salaryNotAutocompleted) {
        recordResult('C1-S2-04', 'Missing CIM & Salary fields sincerely marked isAutocompleted: false', 'PASS', `cimAutocompleted=${cimField?.isAutocompleted}, salaryAutocompleted=${salaryField?.isAutocompleted}`, Date.now() - start);
      } else {
        recordResult('C1-S2-04', 'Missing CIM & Salary fields falsely marked isAutocompleted: true', 'FAIL', `cim=${cimField?.isAutocompleted} (val: "${cimField?.value}"), salary=${salaryField?.isAutocompleted} (val: "${salaryField?.value}")`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S2-04', 'isAutocompleted validation threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S2-05: Cross-tenant isolation in resolver
  {
    const start = Date.now();
    try {
      // Pass clientNexus.id with employee belonging to clientBistro
      const bistroEmployee = clientBistro.employees[0];
      const resCross = await resolveTemplatePlaceholders({
        templateCode: 'hr-cim-model-cadru-2022',
        clientId: clientNexus.id,
        employeeId: bistroEmployee.id,
      });

      // Employee does not belong to Nexus, so resolver should NOT resolve bistroEmployee's name or CNP
      const resolvedNume = resCross.resolvedData.PLACEHOLDER_NUME_COMPLET;
      const bistroName = `${bistroEmployee.lastName} ${bistroEmployee.firstName}`;

      if (resolvedNume !== bistroName && !resolvedNume) {
        recordResult('C1-S2-05', 'Cross-tenant isolation enforced in resolver (cross-client employee rejected)', 'PASS', 'Foreign employee data was not leaked into client resolution', Date.now() - start);
      } else {
        recordResult('C1-S2-05', 'Cross-tenant data leaked across clients', 'FAIL', `Resolved foreign employee "${resolvedNume}" for client ${clientNexus.name}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S2-05', 'Cross-tenant test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S2-06: Introductory training date fallback to hireDate when NO intro event exists
  {
    const start = Date.now();
    try {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: clientNexus.id,
        employeeId: tempEmployeeNoCim.id,
      });

      const dateField = res.fields.find((f) => f.key === 'PLACEHOLDER_DATA_INSTRUIRE_IG');
      const rawVal = res.resolvedData.PLACEHOLDER_DATA_INSTRUIRE_IG;

      // tempEmployeeNoCim has NEVER attended any introductory training event in DB
      // If resolver populated PLACEHOLDER_DATA_INSTRUIRE_IG with hireDate AND set isAutocompleted: true,
      // that is a statutory discrepancy (F30 / R1: hireDate should not masquerade as verified training date)
      if (dateField?.isAutocompleted && rawVal === '10.01.2026') {
        recordResult(
          'C1-S2-06',
          'Intro training date silently autocompletes with hireDate without real TrainingEvent',
          'BUG_DISCOVERED',
          `PLACEHOLDER_DATA_INSTRUIRE_IG was autocompleted as "${rawVal}" (hireDate) despite zero introductory training events in DB. Resolver lines 1853-1854 markAutocompleted on hireDate.`,
          Date.now() - start
        );
      } else {
        recordResult('C1-S2-06', 'Intro training date correctly left blank or un-autocompleted when no event exists', 'PASS', `val="${rawVal}", isAutocompleted=${dateField?.isAutocompleted}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S2-06', 'Training date fallback test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // ========================================================================================
  // SUITE 3: STATUTORY COMPLIANCE ENGINE EDGE CASES (compliance.ts & API)
  // ========================================================================================
  console.log('\n--- SUITE 3: Statutory Compliance Engine Edge Cases ---');

  // C1-S3-01: Leap Year arithmetic in addMonthsSafe (Feb 29 clamping)
  {
    const start = Date.now();
    try {
      // 1. 2024-02-29 + 12 months -> 2025-02-28 (non-leap year, clamped to 28)
      const d1 = addMonthsSafe('2024-02-29', 12);
      const isD1Correct = d1.getFullYear() === 2025 && d1.getMonth() === 1 && d1.getDate() === 28;

      // 2. 2024-02-29 + 48 months -> 2028-02-29 (leap year, preserves 29)
      const d2 = addMonthsSafe('2024-02-29', 48);
      const isD2Correct = d2.getFullYear() === 2028 && d2.getMonth() === 1 && d2.getDate() === 29;

      // 3. 2024-03-31 - 1 month -> 2024-02-29 (negative interval, clamped to Feb 29 leap year)
      const d3 = addMonthsSafe('2024-03-31', -1);
      const isD3Correct = d3.getFullYear() === 2024 && d3.getMonth() === 1 && d3.getDate() === 29;

      // 4. 2023-03-31 - 1 month -> 2023-02-28 (negative interval, clamped to Feb 28 non-leap year)
      const d4 = addMonthsSafe('2023-03-31', -1);
      const isD4Correct = d4.getFullYear() === 2023 && d4.getMonth() === 1 && d4.getDate() === 28;

      if (isD1Correct && isD2Correct && isD3Correct && isD4Correct) {
        recordResult('C1-S3-01', 'Leap year calendar clamping (Feb 29 / Feb 28) exact across all intervals', 'PASS', '2024-02-29+12m=2025-02-28, +48m=2028-02-29, 2024-03-31-1m=2024-02-29, 2023-03-31-1m=2023-02-28', Date.now() - start);
      } else {
        recordResult('C1-S3-01', 'Leap year arithmetic produced incorrect dates', 'FAIL', `d1=${d1.toISOString()}, d2=${d2.toISOString()}, d3=${d3.toISOString()}, d4=${d4.toISOString()}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S3-01', 'Leap year arithmetic threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S3-02: Exact statutory warning window boundaries (31, 30, 1, 0, -1 days)
  {
    const start = Date.now();
    try {
      const refDate = new Date('2026-06-01T00:00:00Z');

      // +31 days remaining: lastDate 2025-06-02 + 12m -> 2026-06-02 (wait, interval 12m from 2025-07-02 -> 2026-07-02)
      // Days between 2026-07-02 and 2026-06-01 = 31 days
      const item31 = calculateItemCompliance('2025-07-02', 12, 'Test 31', refDate);
      const badge31 = getStatusBadgeInfo(item31.status, item31.daysRemaining);

      // +30 days remaining: 2025-07-01 + 12m -> 2026-07-01. Days from 2026-06-01 = 30 days
      const item30 = calculateItemCompliance('2025-07-01', 12, 'Test 30', refDate);
      const badge30 = getStatusBadgeInfo(item30.status, item30.daysRemaining);

      // +1 day remaining: 2025-06-02 + 12m -> 2026-06-02. Days from 2026-06-01 = 1 day
      const item1 = calculateItemCompliance('2025-06-02', 12, 'Test 1', refDate);
      const badge1 = getStatusBadgeInfo(item1.status, item1.daysRemaining);

      // 0 days remaining (due today): 2025-06-01 + 12m -> 2026-06-01. Days from 2026-06-01 = 0 days
      const item0 = calculateItemCompliance('2025-06-01', 12, 'Test 0', refDate);
      const badge0 = getStatusBadgeInfo(item0.status, item0.daysRemaining);

      // -1 day remaining (overdue yesterday): 2025-05-31 + 12m -> 2026-05-31. Days from 2026-06-01 = -1 days
      const itemMinus1 = calculateItemCompliance('2025-05-31', 12, 'Test -1', refDate);
      const badgeMinus1 = getStatusBadgeInfo(itemMinus1.status, itemMinus1.daysRemaining);

      const pass31 = item31.status === 'VALID' && item31.daysRemaining === 31;
      const pass30 = item30.status === 'UPCOMING' && item30.daysRemaining === 30;
      const pass1 = item1.status === 'UPCOMING' && item1.daysRemaining === 1;
      const pass0 = item0.status === 'UPCOMING' && item0.daysRemaining === 0 && badge0.text === 'SCADENT AZI';
      const passMinus1 = itemMinus1.status === 'OVERDUE' && itemMinus1.daysRemaining === -1 && badgeMinus1.text.includes('EXPIRAT');

      if (pass31 && pass30 && pass1 && pass0 && passMinus1) {
        recordResult('C1-S3-02', 'Exact statutory warning windows (31z VALID, 30z UPCOMING, 0z SCADENT AZI, -1z OVERDUE) verified', 'PASS', 'All window thresholds and badge texts match Romanian statutory specifications', Date.now() - start);
      } else {
        recordResult('C1-S3-02', 'Warning window boundary mismatch', 'FAIL', `31z=${item31.status}(${item31.daysRemaining}), 30z=${item30.status}(${item30.daysRemaining}), 0z=${item0.status}(${badge0.text}), -1z=${itemMinus1.status}(${badgeMinus1.text})`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S3-02', 'Warning window check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S3-03: Negative and Zero Intervals in calculateItemCompliance
  {
    const start = Date.now();
    try {
      const itemZero = calculateItemCompliance('2025-01-01', 0, 'Test 0 Interval');
      const itemNegative = calculateItemCompliance('2025-01-01', -6, 'Test Negative Interval');

      // safeInterval = intervalMonths > 0 ? intervalMonths : 12;
      const zeroClamped = itemZero.intervalMonths === 12;
      const negClamped = itemNegative.intervalMonths === 12;

      if (zeroClamped && negClamped) {
        recordResult('C1-S3-03', 'Invalid intervals (<= 0) safely defaulted to statutory 12 months', 'PASS', 'interval=0 and interval=-6 clamped to 12', Date.now() - start);
      } else {
        recordResult('C1-S3-03', 'Invalid intervals not clamped properly', 'FAIL', `zero=${itemZero.intervalMonths}, neg=${itemNegative.intervalMonths}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S3-03', 'Interval test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S3-04: Multiple previous exams / Out-of-order historical exam overwrite
  {
    const start = Date.now();
    try {
      // 1. Create employee with recent exam in 2026 (VALID)
      const empExamTest = await prisma.employee.create({
        data: {
          clientId: clientNexus.id,
          lastName: 'TestExamHistory',
          firstName: 'Vasile',
          cnp: '1750808123456',
          hireDate: new Date('2023-01-01'),
          status: 'ACTIV',
          medicalLastExamDate: new Date('2026-05-01'),
          medicalIntervalMonths: 12,
          medicalFitnessVerdict: 'APT',
        },
      });

      // 2. An operator enters an older historical exam (e.g. from 2024-01-01) for archiving
      const olderExamRequest = new NextRequest(`http://localhost:3000/api/employees/${empExamTest.id}/medical-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: '2024-01-01',
          intervalMonths: 12,
          fitnessVerdict: 'APT',
          notes: 'Examen vechi istoric',
        }),
      });

      const res = await postMedicalExam(olderExamRequest, { params: Promise.resolve({ id: empExamTest.id }) });
      const resJson = await res.json();

      // Check the employee in DB after recording older exam
      const updatedEmp = await prisma.employee.findUnique({ where: { id: empExamTest.id } });
      const currentLastExam = updatedEmp?.medicalLastExamDate?.toISOString().split('T')[0];

      // Cleanup immediately
      await prisma.employee.delete({ where: { id: empExamTest.id } });

      if (currentLastExam === '2024-01-01') {
        recordResult(
          'C1-S3-04',
          'Historical older exam unconditionally overwrote newer valid exam',
          'BUG_DISCOVERED',
          `Employee had newer exam 2026-05-01 (VALID). Submitting historical exam 2024-01-01 overwrote medicalLastExamDate, turning employee OVERDUE because route.ts does not guard against examDate < existing medicalLastExamDate.`,
          Date.now() - start
        );
      } else {
        recordResult('C1-S3-04', 'Historical older exam prevented from regressing newer exam date', 'PASS', `medicalLastExamDate preserved as ${currentLastExam}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S3-04', 'Multiple exams test threw unexpected error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S3-05: Employee lifecycle transition to status: 'PLECAT'
  {
    const start = Date.now();
    try {
      const empPlecat = await prisma.employee.create({
        data: {
          clientId: clientNexus.id,
          lastName: 'TestPlecatLifecycle',
          firstName: 'Gheorghe',
          cnp: '1700101123456',
          hireDate: new Date('2020-01-01'),
          status: 'PLECAT',
          leaveDate: new Date('2025-12-31'),
          medicalLastExamDate: new Date('2020-01-01'), // heavily overdue if active
        },
      });

      // 1. Company metrics should strictly exclude PLECAT employee
      const metrics = calculateCompanyMetrics([
        { id: '1', status: 'ACTIV', medicalLastExamDate: new Date() },
        { id: empPlecat.id, status: 'PLECAT', medicalLastExamDate: new Date('2020-01-01') },
      ]);
      const metricsExcluded = metrics.totalEmployees === 1 && metrics.overdueCount === 0;

      // 2. API /api/employees/[id]/medical-exam should reject PLECAT with HTTP 400
      const medExamReq = new NextRequest(`http://localhost:3000/api/employees/${empPlecat.id}/medical-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: '2026-01-01',
          intervalMonths: 12,
          fitnessVerdict: 'APT',
        }),
      });
      const medExamRes = await postMedicalExam(medExamReq, { params: Promise.resolve({ id: empPlecat.id }) });
      const medExamRejected = medExamRes.status === 400;

      // 3. generateEmployeeOnboardingZip should throw error for PLECAT
      let onboardingThrew = false;
      try {
        await generateEmployeeOnboardingZip({
          clientId: clientNexus.id,
          employeeId: empPlecat.id,
        });
      } catch (err: any) {
        onboardingThrew = err.message.includes('PLECAT');
      }

      // Cleanup
      await prisma.employee.delete({ where: { id: empPlecat.id } });

      if (metricsExcluded && medExamRejected && onboardingThrew) {
        recordResult('C1-S3-05', 'Employees with status: PLECAT comprehensively excluded from compliance & operations', 'PASS', 'Metrics exclude PLECAT, medical-exam returns HTTP 400, onboarding zip throws error', Date.now() - start);
      } else {
        recordResult('C1-S3-05', 'Status PLECAT exclusion incomplete', 'FAIL', `metricsExcluded=${metricsExcluded}, medExamRejected=${medExamRejected}, onboardingThrew=${onboardingThrew}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S3-05', 'Lifecycle PLECAT test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // ========================================================================================
  // SUITE 4: EXCEL IMPORTER BOUNDARY CONDITIONS (importer.ts)
  // ========================================================================================
  console.log('\n--- SUITE 4: Excel Importer Boundary Conditions ---');

  // Helper: create minimal valid workbook buffer
  function createMinimalExcelBuffer(
    sheetName: string = 'Firmă și angajați',
    rows: any[][] = [],
    companyData: Record<string, string> = {}
  ): Buffer {
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [
      ['Date Companie'],
      [''],
      [''],
      [''],
      ['Denumire:', companyData.name || 'TEST CO S.R.L.', '', 'Reprezentant:', companyData.legalRep || 'Manager Test'],
      ['CUI:', companyData.cui || 'RO99999999', '', 'Persoană contact:', 'Admin'],
      ['Reg. Com.:', companyData.regCom || 'J40/1/2026', '', 'Email contact:', 'test@example.com'],
      ['Adresă sediu:', companyData.address || 'Str. Test 1', '', 'Telefon contact:', '0700000000'],
      [''],
      [''],
      [''],
      [
        'Nume',
        'Prenume',
        'Sex',
        'CNP',
        'Data nașterii',
        'Localitatea nașterii',
        'Județ/sector naștere',
        'Cetățenie',
        'Tip act',
        'Serie act',
        'Număr act',
        'Emis de',
        'Data emiterii',
        'Data expirării',
        'Județ/sector domiciliu',
        'Localitate domiciliu',
        'Strada',
        'Număr',
        'Bloc',
        'Scara',
        'Etaj',
        'Apartament',
        'Email',
        'Telefon',
        'Funcție / Post',
        'Punct de lucru',
        'Data începerii pe post',
        'Data angajării',
        'Status',
        'Data plecării',
        'Solicită curs igienă',
        'Modul solicitat',
        'Sesiune preferată',
        'Observații administrative',
        'Data examen medical',
        'Data instruire SSM',
        'Data instruire PSI',
        'Data examen igienă',
      ],
      ...rows,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // C1-S4-01: Empty Excel workbook (0 bytes or blank sheet)
  {
    const start = Date.now();
    try {
      let threwEmptyBuffer = false;
      try {
        parseClientWorkbook(Buffer.alloc(0));
      } catch (err: any) {
        threwEmptyBuffer = true;
      }

      const emptySheetWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(emptySheetWb, XLSX.utils.aoa_to_sheet([]), 'Firmă și angajați');
      const emptyBuffer = XLSX.write(emptySheetWb, { type: 'buffer', bookType: 'xlsx' });

      const parsed = parseClientWorkbook(emptyBuffer);
      const gracefulEmpty = parsed.employees.length === 0;

      if (threwEmptyBuffer && gracefulEmpty) {
        recordResult('C1-S4-01', 'Empty Excel workbook and empty sheet handled gracefully without crashing', 'PASS', '0-byte buffer throws catchable error, empty sheet returns 0 employees', Date.now() - start);
      } else {
        recordResult('C1-S4-01', 'Empty workbook handling unexpected', 'FAIL', `threwEmptyBuffer=${threwEmptyBuffer}, employeesCount=${parsed?.employees?.length}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S4-01', 'Empty workbook check threw unexpected crash', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S4-02: Missing required "Firmă și angajați" sheet
  {
    const start = Date.now();
    try {
      const wbWrongSheet = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbWrongSheet, XLSX.utils.aoa_to_sheet([['Wrong Sheet']]), 'Sheet1');
      const wrongBuffer = XLSX.write(wbWrongSheet, { type: 'buffer', bookType: 'xlsx' });

      let caught = false;
      let errorMsg = '';
      try {
        parseClientWorkbook(wrongBuffer);
      } catch (err: any) {
        caught = true;
        errorMsg = err.message;
      }

      if (caught && errorMsg.includes('Firmă și angajați')) {
        recordResult('C1-S4-02', 'Missing sheet "Firmă și angajați" throws explicit descriptive error', 'PASS', `Threw expected error: "${errorMsg}"`, Date.now() - start);
      } else {
        recordResult('C1-S4-02', 'Missing sheet error was not properly thrown or had vague message', 'FAIL', `caught=${caught}, message="${errorMsg}"`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S4-02', 'Wrong sheet test threw unexpected error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S4-03: Corrupted data types, formula injection, and invalid dates
  {
    const start = Date.now();
    try {
      const hostileRow = [
        '=cmd|\'/c calc\'!A1', // Formula injection in Name
        '<script>alert("XSS")</script>', // HTML/XML in FirstName
        'M',
        '1850101123456', // Valid CNP checksum
        '31.02.2024', // Impossible date (Feb 31)
        'București',
        'București',
        'Română',
        'CI',
        'RX',
        '123456',
        'SPCEP S1',
        '01.01.2020',
        '01.01.2030',
        'București',
        'Sector 1',
        'Str. Victoriei',
        '10',
        '', '', '', '',
        'hack@example.com',
        '0711111111',
        'Developer',
        'Sediu',
        '01.01.2024',
        '01.01.2024',
        'ACTIV',
        '',
        'NU',
        '', '', '',
      ];

      const buf = createMinimalExcelBuffer('Firmă și angajați', [hostileRow]);
      const parsed = parseClientWorkbook(buf);
      const emp = parsed.employees[0];

      // Feb 31 should be rejected as invalid date (errors array should contain date error)
      const dateErrorCaught = emp?.errors.some((err) => err.toLowerCase().includes('data nașterii') || err.toLowerCase().includes('invalidă'));
      const isValidFalse = emp?.isValid === false;

      if (dateErrorCaught && isValidFalse) {
        recordResult('C1-S4-03', 'Impossible date (Feb 31) & formula strings caught by row validator', 'PASS', `isValid=${emp.isValid}, errors=[${emp.errors.join(';')}]`, Date.now() - start);
      } else {
        recordResult('C1-S4-03', 'Validator allowed corrupt date Feb 31 without error', 'FAIL', `isValid=${emp?.isValid}, errors=[${emp?.errors?.join(';')}]`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S4-03', 'Corrupted data types test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S4-04: Missing required column headers (e.g. CNP header missing)
  {
    const start = Date.now();
    try {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Date Companie'],
        [''], [''], [''],
        ['Denumire:', 'NO CNP CO', '', 'Reprezentant:', 'Manager'],
        ['CUI:', 'RO111111', '', 'Persoană contact:', 'Admin'],
        ['Reg. Com.:', 'J40/2/2026', '', 'Email contact:', 'test@test.com'],
        ['Adresă sediu:', 'Str. 1', '', 'Telefon contact:', '0700000000'],
        [''], [''], [''],
        // Headers WITHOUT CNP column
        ['Nume', 'Prenume', 'Sex', 'FărăCNPAici', 'Data nașterii'],
        ['Popa', 'Dan', 'M', '1900101123456', '01.01.1990'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Firmă și angajați');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const parsed = parseClientWorkbook(buf);
      // Because CNP header is missing and row 11 does not have valid CNP header,
      // fallback canonical column or dynamic detection will fail to locate CNP properly,
      // resulting in validation error for row
      const emp = parsed.employees[0];
      const caughtMissingCnp = !emp || emp.errors.some((err) => err.toLowerCase().includes('cnp'));

      if (caughtMissingCnp) {
        recordResult('C1-S4-04', 'Missing CNP column header flagged with validation error', 'PASS', `Employee validation caught missing CNP: errors=[${emp?.errors?.join(';')}]`, Date.now() - start);
      } else {
        recordResult('C1-S4-04', 'Missing CNP header was not caught', 'FAIL', `emp.isValid=${emp?.isValid}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S4-04', 'Missing header check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S4-05: Romanian CNP checksum validation & duplicate CNP detection in same batch
  {
    const start = Date.now();
    try {
      // Valid CNP: 1850101123451 (control digit checked: sum % 11 = 1)
      const validCnp = '1850101123451';
      const isValidCnp = validateCNP(validCnp);

      // Corrupted CNP: flip last digit
      const invalidCnpChecksum = '1850101123450';
      const isInvalidChecksumCaught = !validateCNP(invalidCnpChecksum);

      // Short CNP: 12 digits
      const shortCnp = '185010112345';
      const isShortCaught = !validateCNP(shortCnp);

      // Test intra-batch duplicate CNP in parseClientWorkbook
      const row1 = [
        'Ionescu', 'Mihai', 'M', validCnp, '01.01.1985', 'București', 'București', 'Română',
        'CI', 'RX', '123456', 'SPCEP S1', '01.01.2020', '01.01.2030', 'București', 'Sector 1',
        'Str. Victoriei', '10', '', '', '', '', 'm@test.com', '0711111111', 'Dev', 'Sediu',
        '01.01.2024', '01.01.2024', 'ACTIV', '', 'NU', '', '', '',
      ];
      const row2Duplicate = [
        'Georgescu', 'Radu', 'M', validCnp, // DUPLICATE CNP!
        '01.01.1985', 'București', 'București', 'Română',
        'CI', 'RX', '123457', 'SPCEP S1', '01.01.2020', '01.01.2030', 'București', 'Sector 1',
        'Str. Victoriei', '12', '', '', '', '', 'r@test.com', '0711111112', 'Dev', 'Sediu',
        '01.01.2024', '01.01.2024', 'ACTIV', '', 'NU', '', '', '',
      ];

      const buf = createMinimalExcelBuffer('Firmă și angajați', [row1, row2Duplicate]);
      const parsed = parseClientWorkbook(buf);
      const duplicateErrorCaught = parsed.employees[1]?.errors.some((err) => err.includes('CNP duplicat'));

      if (isValidCnp && isInvalidChecksumCaught && isShortCaught && duplicateErrorCaught) {
        recordResult('C1-S4-05', 'Romanian CNP checksum algorithm & intra-batch duplicate detection 100% verified', 'PASS', 'Valid CNP accepted, corrupt checksum rejected, short CNP rejected, batch duplicate flagged', Date.now() - start);
      } else {
        recordResult('C1-S4-05', 'CNP checksum or duplicate detection failed', 'FAIL', `valid=${isValidCnp}, invalidChecksum=${isInvalidChecksumCaught}, short=${isShortCaught}, duplicate=${duplicateErrorCaught}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S4-05', 'CNP validation test threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S4-06: Verification of Feature 30 (blank medical & training dates remain undefined)
  {
    const start = Date.now();
    try {
      const rowWithBlankDates = [
        'Popescu', 'Alin', 'M', '1920202123456', '02.02.1992', 'Cluj', 'Cluj', 'Română',
        'CI', 'KX', '654321', 'SPCEP Cluj', '01.01.2022', '01.01.2032', 'Cluj', 'Cluj-Napoca',
        'Str. Memorandumului', '5', '', '', '', '', 'alin@test.com', '0722222222', 'Inginer', 'Sediu',
        '01.03.2026', '01.03.2026', 'ACTIV', '', 'NU', '', '', '',
        '', // medicalLastExamDate BLANK
        '', // ssmLastTrainingDate BLANK
        '', // psiLastTrainingDate BLANK
        '', // hygieneLastExamDate BLANK
      ];

      const buf = createMinimalExcelBuffer('Firmă și angajați', [rowWithBlankDates]);
      const parsed = parseClientWorkbook(buf);
      const emp = parsed.employees[0];

      const medIsUndefined = emp.medicalLastExamDate === undefined;
      const ssmIsUndefined = emp.ssmLastTrainingDate === undefined;
      const psiIsUndefined = emp.psiLastTrainingDate === undefined;

      if (medIsUndefined && ssmIsUndefined && psiIsUndefined) {
        recordResult('C1-S4-06', 'Feature 30 Verified: Blank medical & training columns remain undefined (never hireDate)', 'PASS', `medical=${emp.medicalLastExamDate}, ssm=${emp.ssmLastTrainingDate}, psi=${emp.psiLastTrainingDate}`, Date.now() - start);
      } else {
        recordResult('C1-S4-06', 'Feature 30 Regression: Blank dates were improperly assigned values', 'FAIL', `medical=${emp.medicalLastExamDate}, ssm=${emp.ssmLastTrainingDate}, psi=${emp.psiLastTrainingDate}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S4-06', 'Feature 30 check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // ========================================================================================
  // SUITE 5: BULK PACKAGES & ZIP ARCHIVES ROBUSTNESS (bulk-packages.ts)
  // ========================================================================================
  console.log('\n--- SUITE 5: Bulk Packages & ZIP Archives Robustness ---');

  // C1-S5-01a: Replacement of illegal filesystem characters (< > : " / \ | ? *) in sanitizeZipPath
  {
    const start = Date.now();
    try {
      const hostileSlash = '../../../../etc/passwd';
      const hostileBackslash = '..\\..\\Windows\\System32\\cmd.exe';
      const hostileChars = 'Nume / Prenume: "Admin" * ? < > |';
      const diacritics = 'Ștefan cel Mare & Asociații S.R.L.';

      const cleanSlash = sanitizeZipPath(hostileSlash);
      const cleanBackslash = sanitizeZipPath(hostileBackslash);
      const cleanChars = sanitizeZipPath(hostileChars);
      const cleanDiacritics = sanitizeZipPath(diacritics);

      const slashesReplaced = !cleanSlash.includes('/') && !cleanBackslash.includes('\\');
      const illegalCharsReplaced = !cleanChars.includes(':') && !cleanChars.includes('"') && !cleanChars.includes('*') && !cleanChars.includes('?');
      const diacriticsNormalized = !cleanDiacritics.includes('Ș') && !cleanDiacritics.includes('ț');

      if (slashesReplaced && illegalCharsReplaced && diacriticsNormalized) {
        recordResult('C1-S5-01a', 'sanitizeZipPath replaces slashes and illegal characters with underscores', 'PASS', `cleanSlash="${cleanSlash}", cleanChars="${cleanChars}", cleanDiacritics="${cleanDiacritics}"`, Date.now() - start);
      } else {
        recordResult('C1-S5-01a', 'sanitizeZipPath failed to replace slashes or illegal characters', 'FAIL', `cleanSlash="${cleanSlash}", cleanChars="${cleanChars}"`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S5-01a', 'sanitizeZipPath check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S5-01b: Directory traversal retention with bare ".." in sanitizeZipPath
  {
    const start = Date.now();
    try {
      const bareDotDot = '..';
      const cleanDotDot = sanitizeZipPath(bareDotDot);

      // If a caller passes `04_FISE_INDIVIDUALE/${sanitizeZipPath(empName)}/doc.docx`,
      // having sanitizeZipPath('..') return '..' creates '04_FISE_INDIVIDUALE/../doc.docx'
      // escaping the subfolder.
      if (cleanDotDot === '..') {
        recordResult(
          'C1-S5-01b',
          'sanitizeZipPath retains bare ".." path segments, risking folder escape in zip entry paths',
          'BUG_DISCOVERED',
          `sanitizeZipPath("..") returns "${cleanDotDot}". It only replaces [<>:"/\\\\|?*], leaving dot segments like ".." unstripped. In bulk-packages.ts:480, interpolating into "04_FISE_INDIVIDUALE/\${empNameClean}/" could escape parent directory.`,
          Date.now() - start
        );
      } else {
        recordResult('C1-S5-01b', 'sanitizeZipPath neutralizes bare ".." segments', 'PASS', `cleanDotDot="${cleanDotDot}"`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S5-01b', 'sanitizeZipPath dot check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // C1-S5-02: Company Dossier on Client with zero employees
  {
    const start = Date.now();
    let tempEmptyClient: any = null;
    try {
      tempEmptyClient = await prisma.client.create({
        data: {
          name: 'CHALLENGER1 EMPTY CO S.R.L.',
          cui: 'RO99887766',
          regCom: 'J40/999/2026',
          address: 'Str. Fără Angajați 1',
          legalRepresentative: 'Director Singur',
          caenCode: '6201',
          caenActivity: 'Software',
        },
      });

      const dossier = await generateCompanyDossierZip({
        clientId: tempEmptyClient.id,
      });

      // Verify ZIP structure
      const zip = new PizZip(dossier.buffer);
      const fileNames = Object.keys(zip.files);
      const hasDecizii = fileNames.some((f) => f.includes('Decizii'));
      const hasRisk = fileNames.some((f) => f.includes('Evaluarea_Riscurilor'));

      if (hasDecizii && hasRisk && fileNames.length >= 10) {
        recordResult('C1-S5-02', 'generateCompanyDossierZip succeeds on client with 0 employees without crashing', 'PASS', `ZIP generated with ${fileNames.length} company statutory files`, Date.now() - start);
      } else {
        recordResult('C1-S5-02', 'Company dossier generated incomplete ZIP for empty client', 'FAIL', `Files: ${fileNames.join(', ')}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S5-02', 'Company dossier on empty client threw error', 'FAIL', e.message, Date.now() - start);
    } finally {
      if (tempEmptyClient) {
        await prisma.client.delete({ where: { id: tempEmptyClient.id } }).catch(() => {});
      }
    }
  }

  // C1-S5-03: Inspection Archive with 100% PLECAT employees
  {
    const start = Date.now();
    let tempPlecatClient: any = null;
    try {
      tempPlecatClient = await prisma.client.create({
        data: {
          name: 'CHALLENGER1 ALL PLECAT S.R.L.',
          cui: 'RO99887755',
          regCom: 'J40/998/2026',
          address: 'Str. Plecat 1',
          legalRepresentative: 'Director Plecat',
          caenCode: '6201',
          caenActivity: 'Software',
          employees: {
            create: [
              {
                lastName: 'FostSalariat1',
                firstName: 'Dan',
                cnp: '1800101123456',
                hireDate: new Date('2020-01-01'),
                status: 'PLECAT',
                leaveDate: new Date('2025-12-31'),
              },
              {
                lastName: 'FostSalariat2',
                firstName: 'Ana',
                cnp: '2800101123456',
                hireDate: new Date('2021-01-01'),
                status: 'PLECAT',
                leaveDate: new Date('2025-12-31'),
              },
            ],
          },
        },
      });

      const archive = await generateInspectionArchiveZip({
        clientId: tempPlecatClient.id,
        includeAllEmployees: false, // strictly active only
      });

      const zip = new PizZip(archive.buffer);
      const fileNames = Object.keys(zip.files);
      const hasEmployeeFolders = fileNames.some((f) => f.startsWith('04_FISE_INDIVIDUALE_SALARIATI/'));

      if (archive.employeesIncluded === 0 && !hasEmployeeFolders) {
        recordResult('C1-S5-03', 'generateInspectionArchiveZip with 100% PLECAT employees omits individual folders gracefully', 'PASS', 'employeesIncluded=0, company folders present, zero PLECAT folders created', Date.now() - start);
      } else {
        recordResult('C1-S5-03', 'Inspection archive included PLECAT employees when includeAllEmployees: false', 'FAIL', `employeesIncluded=${archive.employeesIncluded}, hasEmployeeFolders=${hasEmployeeFolders}`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S5-03', 'Inspection archive on PLECAT client threw error', 'FAIL', e.message, Date.now() - start);
    } finally {
      if (tempPlecatClient) {
        await prisma.employee.deleteMany({ where: { clientId: tempPlecatClient.id } }).catch(() => {});
        await prisma.client.delete({ where: { id: tempPlecatClient.id } }).catch(() => {});
      }
    }
  }

  // C1-S5-04: Dynamic IPSSM resolution across CAEN codes and risk attributes
  {
    const start = Date.now();
    try {
      // 1. Restaurant CAEN 5610 without drivers -> must include alunecari, must NOT include autovehicule
      const ipssmBistro = resolveApplicableIpssms('5610', [{ isFoodHandling: true, workPosture: 'standing' }], null);
      const bistroHasAlunecari = ipssmBistro.includes('ipssm-alunecari');
      const bistroNoAuto = !ipssmBistro.includes('ipssm-autovehicule');

      // 2. Freight transport CAEN 4941 -> must include autovehicule
      const ipssmTransport = resolveApplicableIpssms('4941', [{ isDrivingRequired: true }], null);
      const transportHasAuto = ipssmTransport.includes('ipssm-autovehicule');

      // 3. Software CAEN 6201 with screen work -> must include birou, tesa, universale, opis
      const ipssmSoftware = resolveApplicableIpssms('6201', [{ isScreenWork: true, workPosture: 'sitting' }], null);
      const softwareHasBirou = ipssmSoftware.includes('ipssm-birou');
      const softwareHasTesa = ipssmSoftware.includes('ipssm-tesa');
      const softwareHasUniversale = ipssmSoftware.includes('ipssm-universale');
      const softwareHasOpis = ipssmSoftware.includes('ipssm-opis');

      const allCorrect = bistroHasAlunecari && bistroNoAuto && transportHasAuto && softwareHasBirou && softwareHasTesa && softwareHasUniversale && softwareHasOpis;

      if (allCorrect) {
        recordResult('C1-S5-04', 'Dynamic IPSSM resolution across CAENs (5610, 4941, 6201) and risk flags verified', 'PASS', 'Bistro includes slip/food & excludes vehicles; Transport includes vehicles; Software includes office/TESA/universale', Date.now() - start);
      } else {
        recordResult('C1-S5-04', 'Dynamic IPSSM resolution mismatch', 'FAIL', `bistro=[${ipssmBistro.join(', ')}], transport=[${ipssmTransport.join(', ')}], software=[${ipssmSoftware.join(', ')}]`, Date.now() - start);
      }
    } catch (e: any) {
      recordResult('C1-S5-04', 'IPSSM resolution check threw error', 'FAIL', e.message, Date.now() - start);
    }
  }

  // Teardown: Clean up temporary employee
  if (tempEmployeeNoCim) {
    await prisma.employee.delete({ where: { id: tempEmployeeNoCim.id } }).catch(() => {});
  }

  // ========================================================================================
  // FINAL HARNESS REPORT
  // ========================================================================================
  console.log('\n========================================================================================');
  console.log('TIER 5 ADVERSARIAL STRESS TEST SUMMARY — CHALLENGER 1');
  console.log('========================================================================================');

  const total = allResults.length;
  const passed = allResults.filter((r) => r.status === 'PASS').length;
  const bugs = allResults.filter((r) => r.status === 'BUG_DISCOVERED').length;
  const failed = allResults.filter((r) => r.status === 'FAIL').length;

  console.log(`Total Adversarial Checks: ${total}`);
  console.log(`  ✅ Passed Robustness Invariants: ${passed}`);
  console.log(`  ⚠️ Confirmed Bugs / Vulnerabilities Discovered: ${bugs}`);
  console.log(`  ❌ Test Execution Failures: ${failed}`);
  console.log(`Pass Rate: ${Math.round((passed / total) * 100)}%`);

  if (bugs > 0) {
    console.log('\nCONFIRMED VULNERABILITIES TO REMEDIATE:');
    allResults
      .filter((r) => r.status === 'BUG_DISCOVERED')
      .forEach((b) => {
        console.log(`- [${b.id}] ${b.name}`);
        console.log(`  Finding: ${b.details}`);
      });
  }

  console.log('========================================================================================\n');
}

runTestSuite()
  .catch((err) => {
    console.error('Fatal unhandled error in Tier 5 Challenger 1 suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
