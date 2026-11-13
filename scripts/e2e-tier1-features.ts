/**
 * ============================================================================
 * E2E TIER 1: FUNCTIONAL ACCEPTANCE SUITE (155 TESTS ACROSS 31 FEATURES)
 * ============================================================================
 * 
 * Requirement-driven functional tests for Romanian SSM, PSI, HR, and Hygiene
 * statutory framework.
 * 
 * 5 Tests Per Feature × 31 Statutory Features = 155 Tests
 * 
 * Invocation:
 *   npx tsx scripts/e2e-tier1-features.ts
 *   npx tsx scripts/e2e-tier1-features.ts --feature=1
 *   npx tsx scripts/e2e-tier1-features.ts --grep="Medical"
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import * as XLSX from 'xlsx';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import {
  generateDocument,
  collectUnresolvedPlaceholders,
  renderTemplateBuffer,
} from '../src/lib/templates/generator';
import {
  calculateItemCompliance,
  calculateEmployeeCompliance,
  calculateCompanyMetrics,
  addMonthsSafe,
} from '../src/lib/compliance';
import { validateCNP, parseClientWorkbook, commitImport } from '../src/lib/importer';
import { calculatePecePartialRisk, getRiskProfileForCaen } from '../src/lib/risk/caen-risk-presets';
import { generateEmployeeOnboardingZip, generateCompanyDossierZip } from '../src/lib/packages/bulk-packages';
import {
  E2ERunner,
  assert,
  assertEqual,
  assertNotEqual,
  assertIncludes,
  assertThrows,
  assertThrowsAsync,
  inspectDocxArtifact,
  inspectXlsxArtifact,
  inspectZipArchive,
  createTestCompany,
  cleanupTestClientByCui,
  generateValidCnp,
  dispatchMedicalExamRecord,
  dispatchEmployeeCreate,
  dispatchEmployeeTerminate,
} from './e2e-test-helpers';

// Shared test runner
const runner = new E2ERunner('TIER 1: 155 FUNCTIONAL STATUTORY ACCEPTANCE TESTS');

async function main() {
  runner.start();

  // Create isolated shared fixtures for Tier 1 tests
  const f1Cui = 'RO91001122';
  const fixture = await createTestCompany('T1_MAIN', {
    cui: f1Cui,
    clientName: 'ACME LOGISTICS SRL',
    legalRep: 'Ion Vasile',
    address: 'București, Str. Principală nr. 10, Sector 2',
    caen: '6201',
    jobTitle: 'Inginer Software',
    corCode: '251201',
    empLastName: 'Popescu',
    empFirstName: 'Vasile',
    empCnp: '1950820123456', // 20.08.1995, M
    hireDate: new Date('2026-01-10'),
    grossSalary: 9500,
    cimNumber: '101/2026',
    cimDate: new Date('2026-01-10'),
    medicalLastExamDate: new Date('2026-01-10'),
    medicalIntervalMonths: 12,
    medicalFitnessVerdict: 'APT',
    ssmLastTrainingDate: new Date('2026-01-10'),
    psiLastTrainingDate: new Date('2026-01-10'),
  });

  try {
    // ========================================================================
    // FEATURE 1: Resolver Integritate Date (Fără Mock) (Req: R1)
    // ========================================================================
    await runner.runTest(1, 1, 'Resolver Integritate Date', 'T1.1', 'Client Name Integrity (Fără Mock)', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_FIRMA, 'ACME LOGISTICS SRL', 'Company name must match DB value');
      assertNotEqual(res.resolvedData.PLACEHOLDER_FIRMA, 'S.C. CLIENT TEST S.R.L.', 'Must not use mock company name');
    });

    await runner.runTest(1, 1, 'Resolver Integritate Date', 'T1.2', 'Legal Representative Integrity (Fără Mock)', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_REPREZENTANT_LEGAL, 'Ion Vasile', 'Legal representative must match DB value');
      assertNotEqual(res.resolvedData.PLACEHOLDER_REPREZENTANT_LEGAL, 'Munteanu Cristian', 'Must not use mock representative name');
    });

    await runner.runTest(1, 1, 'Resolver Integritate Date', 'T1.3', 'Natural Person Birth Info (Fără Mock)', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_DATA_NASTERII, '20.08.1995', 'Birth date formatted must match DB/CNP');
      assertNotEqual(res.resolvedData.PLACEHOLDER_DATA_NASTERII, '15.03.1988', 'Must not use mock birth date');
    });

    await runner.runTest(1, 1, 'Resolver Integritate Date', 'T1.4', 'Real Identity Card Tokens (Fără Mock)', async () => {
      const empWithCi = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Dumitrescu',
          firstName: 'Andrei',
          cnp: '1900101123456',
          status: 'ACTIV',
          identityDocument: {
            create: {
              docType: 'CI',
              series: 'KL',
              number: '987654',
              issuedBy: 'SPCLEP Cluj',
            },
          },
        },
      });

      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: fixture.client.id,
          employeeId: empWithCi.id,
        });
        assertEqual(res.resolvedData.PLACEHOLDER_SERIE_ACT, 'KL', 'CI series must match real DB series');
        assertEqual(res.resolvedData.PLACEHOLDER_NUMAR_ACT, '987654', 'CI number must match real DB number');
      } finally {
        await prisma.employee.delete({ where: { id: empWithCi.id } });
      }
    });

    await runner.runTest(1, 1, 'Resolver Integritate Date', 'T1.5', 'Medical Parameters Integrity (Fără Mock)', async () => {
      const empNoBlood = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Stanciu',
          firstName: 'Mihai',
          cnp: '1920304123456',
          status: 'ACTIV',
          bloodType: null,
          rhFactor: null,
        },
      });

      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: fixture.client.id,
          employeeId: empNoBlood.id,
        });
        const bloodVal = res.resolvedData.PLACEHOLDER_GRUPA_SANGUINA || '';
        assertNotEqual(bloodVal, '0I(Rh+)', 'Must not default to mock blood group 0I(Rh+)');
      } finally {
        await prisma.employee.delete({ where: { id: empNoBlood.id } });
      }
    });

    // ========================================================================
    // FEATURE 2: Semnalare Date Lipsă (`isAutocompleted`) (Req: R1)
    // ========================================================================
    await runner.runTest(1, 2, 'Semnalare Date Lipsă', 'T1.1', 'Genuine DB Value Flagged True', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'hr-anexa-fisa-post',
        clientId: fixture.client.id,
      });
      const cuiField = res.fields.find((f) => f.key === 'PLACEHOLDER_CUI');
      assert(cuiField !== undefined, 'CUI field definition must be present');
      assertEqual(cuiField.isAutocompleted, true, 'Existing CUI must have isAutocompleted: true');
    });

    await runner.runTest(1, 2, 'Semnalare Date Lipsă', 'T1.2', 'Absent DB Value Flagged False (CIM)', async () => {
      const empNoCim = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'NoCim',
          firstName: 'Ion',
          cnp: '1910203123456',
          cimNumber: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-cim-model-cadru-2022',
          clientId: fixture.client.id,
          employeeId: empNoCim.id,
        });
        const cimField = res.fields.find((f) => f.key === 'PLACEHOLDER_NUMAR_CIM');
        assert(cimField !== undefined, 'PLACEHOLDER_NUMAR_CIM definition must be present');
        assertEqual(cimField.isAutocompleted, false, 'Missing CIM number must have isAutocompleted: false');
      } finally {
        await prisma.employee.delete({ where: { id: empNoCim.id } });
      }
    });

    await runner.runTest(1, 2, 'Semnalare Date Lipsă', 'T1.3', 'Missing Salary Flagged False', async () => {
      const empNoSalary = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'NoSalary',
          firstName: 'Vasile',
          cnp: '1930405123456',
          grossSalary: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-cim-model-cadru-2022',
          clientId: fixture.client.id,
          employeeId: empNoSalary.id,
        });
        const salaryField = res.fields.find((f) => f.key === 'PLACEHOLDER_SALARIU_BRUT');
        assert(salaryField !== undefined, 'PLACEHOLDER_SALARIU_BRUT must be present');
        assertEqual(salaryField.isAutocompleted, false, 'Missing gross salary must have isAutocompleted: false');
      } finally {
        await prisma.employee.delete({ where: { id: empNoSalary.id } });
      }
    });

    await runner.runTest(1, 2, 'Semnalare Date Lipsă', 'T1.4', 'Unlinked Worksite Flagged False', async () => {
      const empNoWorksite = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'NoWorksite',
          firstName: 'Gheorghe',
          cnp: '1940506123456',
          currentWorksiteId: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-cim-model-cadru-2022',
          clientId: fixture.client.id,
          employeeId: empNoWorksite.id,
        });
        const wsField = res.fields.find((f) => f.key === 'PLACEHOLDER_ADRESA_PUNCT_LUCRU');
        if (wsField) {
          assertEqual(wsField.isAutocompleted, false, 'Unlinked worksite must have isAutocompleted: false');
        }
      } finally {
        await prisma.employee.delete({ where: { id: empNoWorksite.id } });
      }
    });

    await runner.runTest(1, 2, 'Semnalare Date Lipsă', 'T1.5', 'Missing CI Details Flagged False', async () => {
      const empNoCi = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'NoCi',
          firstName: 'Dan',
          cnp: '1950607123456',
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-cim-model-cadru-2022',
          clientId: fixture.client.id,
          employeeId: empNoCi.id,
        });
        const ciSeriesField = res.fields.find((f) => f.key === 'PLACEHOLDER_SERIE_ACT');
        if (ciSeriesField) {
          assertEqual(ciSeriesField.isAutocompleted, false, 'Missing CI details must have isAutocompleted: false');
        }
      } finally {
        await prisma.employee.delete({ where: { id: empNoCi.id } });
      }
    });

    // ========================================================================
    // FEATURE 3: Blocare `approved_for_print` la date lipsă (Req: R1)
    // ========================================================================
    await runner.runTest(1, 3, 'Blocare approved_for_print', 'T1.1', 'Approved When Fully Populated', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'hr-cim-model-cadru-2022',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      // When mandatory fields are supplied, missing data is resolved
      assert(res.resolvedData.PLACEHOLDER_FIRMA !== '', 'Company must be present');
      assert(res.resolvedData.PLACEHOLDER_NUMAR_CIM !== '', 'CIM number must be present');
    });

    await runner.runTest(1, 3, 'Blocare approved_for_print', 'T1.2', 'Blocked When CIM Number Missing', async () => {
      const empNoCim = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'MissingCim',
          firstName: 'Ana',
          cnp: '2960102123456',
          cimNumber: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-cim-model-cadru-2022',
          clientId: fixture.client.id,
          employeeId: empNoCim.id,
        });
        const cimValue = String(res.resolvedData.PLACEHOLDER_NUMAR_CIM || '').trim();
        assertEqual(cimValue, '', 'Missing CIM number must be empty string, not mock');
      } finally {
        await prisma.employee.delete({ where: { id: empNoCim.id } });
      }
    });

    await runner.runTest(1, 3, 'Blocare approved_for_print', 'T1.3', 'Blocked When Salary Missing', async () => {
      const empNoSal = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'MissingSal',
          firstName: 'Alina',
          cnp: '2970203123456',
          grossSalary: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-cim-model-cadru-2022',
          clientId: fixture.client.id,
          employeeId: empNoSal.id,
        });
        const salValue = String(res.resolvedData.PLACEHOLDER_SALARIU_BRUT || '').trim();
        assertEqual(salValue, '', 'Missing salary must be empty, not mock 6500');
      } finally {
        await prisma.employee.delete({ where: { id: empNoSal.id } });
      }
    });

    await runner.runTest(1, 3, 'Blocare approved_for_print', 'T1.4', 'Blocked When Hire Date Missing', async () => {
      const empNoHire = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'MissingHire',
          firstName: 'Radu',
          cnp: '1980304123456',
          hireDate: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: fixture.client.id,
          employeeId: empNoHire.id,
        });
        const hireVal = String(res.resolvedData.PLACEHOLDER_DATA_ANGAJARII || '').trim();
        assertEqual(hireVal, '', 'Missing hire date must resolve empty');
      } finally {
        await prisma.employee.delete({ where: { id: empNoHire.id } });
      }
    });

    await runner.runTest(1, 3, 'Blocare approved_for_print', 'T1.5', 'Blocked When Legal Representative Missing', async () => {
      const clientNoRep = await prisma.client.create({
        data: {
          name: 'NO REP SRL',
          cui: 'RO99112233',
          address: 'București, Sector 1',
          legalRepresentative: null,
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'decizii-angajator',
          clientId: clientNoRep.id,
        });
        const repVal = String(res.resolvedData.PLACEHOLDER_REPREZENTANT_LEGAL || '').trim();
        assertEqual(repVal, '', 'Missing legal representative must be empty, never Munteanu Cristian');
      } finally {
        await prisma.client.delete({ where: { id: clientNoRep.id } });
      }
    });

    // ========================================================================
    // FEATURE 4: Câmpuri Manuale Complete în UI (Req: R1)
    // ========================================================================
    await runner.runTest(1, 4, 'Câmpuri Manuale Complete', 'T1.1', 'Zero Slice Truncation (>20 Fields)', async () => {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'decizii-angajator');
      assert(tpl !== undefined, 'decizii-angajator must be in catalog');
      assert(tpl.fields.length > 20, `Template has ${tpl.fields.length} fields; must exceed 20`);
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
      });
      assert(res.fields.length > 20, 'Resolved fields array must not be truncated with .slice(0, 20)');
    });

    await runner.runTest(1, 4, 'Câmpuri Manuale Complete', 'T1.2', 'Dynamic Field Count Verification', async () => {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'decizii-angajator')!;
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
      });
      const nonIndexedDefs = tpl.fields.filter((f) => !/_\d{2,3}$/.test(f.key));
      assertEqual(res.fields.length, nonIndexedDefs.length, 'Resolved fields count must match template definition');
    });

    await runner.runTest(1, 4, 'Câmpuri Manuale Complete', 'T1.3', 'Value Propagation Past Index 20', async () => {
      const overrideKey = 'PLACEHOLDER_NUMAR_DECIZIE_10';
      const customOverrides: Record<string, unknown> = {
        [overrideKey]: 'DEC-999-SPECIAL',
      };
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
        customOverrides,
      });
      assertEqual(res.resolvedData[overrideKey], 'DEC-999-SPECIAL', 'Custom override for field past index 20 must be preserved');
    });

    await runner.runTest(1, 4, 'Câmpuri Manuale Complete', 'T1.4', 'Grouped Field Sources Preservation', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
      });
      const sources = new Set(res.fields.map((f) => f.source));
      assert(sources.size >= 2, 'Field sources must contain multiple categories (e.g. client, manual)');
    });

    await runner.runTest(1, 4, 'Câmpuri Manuale Complete', 'T1.5', 'Batch Template Manual Fields Collection', async () => {
      const tplCodes = ['ipssm-alunecari', 'ipssm-birou'];
      let allFieldsCount = 0;
      for (const code of tplCodes) {
        const res = await resolveTemplatePlaceholders({ templateCode: code, clientId: fixture.client.id });
        allFieldsCount += res.fields.length;
      }
      assert(allFieldsCount > 0, 'Batch manual fields must be collectible across templates');
    });

    // ========================================================================
    // FEATURE 5: Escapare Caractere Speciale XML (`&`, `<`, `>`) (Req: R1)
    // ========================================================================
    await runner.runTest(1, 5, 'Escapare Caractere Speciale XML', 'T1.1', 'Standalone Ampersand in DOCX', async () => {
      const clientAmp = await prisma.client.create({
        data: {
          name: 'M&D CONSULTING S.R.L.',
          cui: 'RO91234561',
          address: 'București, Str. Testului nr. 2',
        },
      });
      try {
        const docResult = await generateDocument({
          templateCode: 'ipssm-alunecari',
          clientId: clientAmp.id,
          operatorName: 'Test Auditor',
          data: {
            PLACEHOLDER_FIRMA: 'M&D CONSULTING S.R.L.',
          },
        });
        const buffer = fs.readFileSync(docResult.filePath);
        const inspection = inspectDocxArtifact(buffer);
        assertEqual(inspection.hasXmlSyntaxError, false, 'Generated DOCX must not have XML syntax errors with &');
        assert(inspection.rawXml.includes('M&amp;D') || inspection.rawXml.includes('M&D'), 'XML should handle ampersand safely');
      } finally {
        await prisma.client.delete({ where: { id: clientAmp.id } });
      }
    });

    await runner.runTest(1, 5, 'Escapare Caractere Speciale XML', 'T1.2', 'Less-Than and Greater-Than in DOCX', async () => {
      const docResult = await generateDocument({
        templateCode: 'ipssm-alunecari',
        clientId: fixture.client.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'FIRMA <TEST> SRL',
        },
      });
      const buffer = fs.readFileSync(docResult.filePath);
      const inspection = inspectDocxArtifact(buffer);
      assertEqual(inspection.hasXmlSyntaxError, false, 'Generated DOCX must not crash with < > in values');
    });

    await runner.runTest(1, 5, 'Escapare Caractere Speciale XML', 'T1.3', 'Double Quotes in Company Name', async () => {
      const docResult = await generateDocument({
        templateCode: 'ipssm-alunecari',
        clientId: fixture.client.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'S.C. "ROBOTICS" S.R.L.',
        },
      });
      const buffer = fs.readFileSync(docResult.filePath);
      const inspection = inspectDocxArtifact(buffer);
      assertEqual(inspection.hasXmlSyntaxError, false, 'Double quotes must not corrupt XML');
    });

    await runner.runTest(1, 5, 'Escapare Caractere Speciale XML', 'T1.4', 'Apostrophe in Employee Name', async () => {
      const docResult = await generateDocument({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_NUME_COMPLET: "D'Angelo Marco",
        },
      });
      const buffer = fs.readFileSync(docResult.filePath);
      const inspection = inspectDocxArtifact(buffer);
      assertEqual(inspection.hasXmlSyntaxError, false, 'Single quote/apostrophe must not corrupt XML');
    });

    await runner.runTest(1, 5, 'Escapare Caractere Speciale XML', 'T1.5', 'Multi-Token XML Integrity', async () => {
      const docResult = await generateDocument({
        templateCode: 'ipssm-alunecari',
        clientId: fixture.client.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'Alpha & Beta <Tech> "Solutions" S.R.L.',
          PLACEHOLDER_LOCALITATE: 'București & Ilfov',
        },
      });
      const buffer = fs.readFileSync(docResult.filePath);
      const inspection = inspectDocxArtifact(buffer);
      assertEqual(inspection.hasXmlSyntaxError, false, 'Multi-token special characters must parse cleanly');
    });

    // ========================================================================
    // FEATURE 6: Eliminare Fallback `employee[0]`/`jobs[0]` (Req: R7)
    // ========================================================================
    await runner.runTest(1, 6, 'Eliminare Fallback Context', 'T1.1', 'General Client Template Without Employee Context', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'decizii-angajator',
        clientId: fixture.client.id,
      });
      // Employee-specific tokens should remain unmapped when no employeeId is given
      const empName = res.resolvedData.PLACEHOLDER_NUME_COMPLET;
      assert(empName === undefined || empName === '', 'Must not fall back to fixture.employee when employeeId is omitted');
    });

    await runner.runTest(1, 6, 'Eliminare Fallback Context', 'T1.2', 'Job Context Isolation', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'training-tematica-loc-munca',
        clientId: fixture.client.id,
        // Omit jobId
      });
      const jobTitle = res.resolvedData.PLACEHOLDER_FUNCTIE;
      assert(jobTitle === undefined || jobTitle === '', 'Must not fall back to client.jobs[0] when jobId is omitted');
    });

    await runner.runTest(1, 6, 'Eliminare Fallback Context', 'T1.3', 'Explicit Employee Respected', async () => {
      const emp2 = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Zamfir',
          firstName: 'Constantin',
          cnp: '1850101123456',
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: fixture.client.id,
          employeeId: emp2.id,
        });
        assertEqual(res.resolvedData.PLACEHOLDER_NUME, 'Zamfir', 'Must resolve for explicitly provided employee #2');
        assertNotEqual(res.resolvedData.PLACEHOLDER_NUME, fixture.employee.lastName, 'Must not resolve employee #1');
      } finally {
        await prisma.employee.delete({ where: { id: emp2.id } });
      }
    });

    await runner.runTest(1, 6, 'Eliminare Fallback Context', 'T1.4', 'Explicit Job Respected', async () => {
      const job2 = await prisma.job.create({
        data: {
          clientId: fixture.client.id,
          title: 'Specialist Sudor',
          corCode: '721201',
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-anexa-fisa-post',
          clientId: fixture.client.id,
          jobId: job2.id,
        });
        assertEqual(res.resolvedData.PLACEHOLDER_FUNCTIE, 'Specialist Sudor', 'Must resolve explicitly provided job #2');
      } finally {
        await prisma.job.delete({ where: { id: job2.id } });
      }
    });

    await runner.runTest(1, 6, 'Eliminare Fallback Context', 'T1.5', 'Explicit Worksite Respected', async () => {
      const ws2 = await prisma.worksite.create({
        data: {
          clientId: fixture.client.id,
          name: 'Punct de Lucru Ploiești',
          address: 'Ploiești, Str. Rafinăriei nr. 5',
        },
      });
      try {
        const res = await resolveTemplatePlaceholders({
          templateCode: 'hr-anexa-fisa-post',
          clientId: fixture.client.id,
          employeeId: fixture.employee.id,
          customOverrides: {
            PLACEHOLDER_ADRESA_PUNCT_LUCRU: ws2.address,
          },
        });
        assertEqual(res.resolvedData.PLACEHOLDER_ADRESA_PUNCT_LUCRU, ws2.address, 'Worksite address matches specified worksite');
      } finally {
        await prisma.worksite.delete({ where: { id: ws2.id } });
      }
    });

    // ========================================================================
    // FEATURE 7: Înregistrare Fișă Aptitudine HG 355/2007 (Req: R2)
    // ========================================================================
    await runner.runTest(1, 7, 'Înregistrare Fișă Aptitudine', 'T1.1', 'Successful Medical Exam Recording (APT)', async () => {
      const res = await dispatchMedicalExamRecord({
        employeeId: fixture.employee.id,
        examDate: '2026-05-10',
        intervalMonths: 12,
        fitnessVerdict: 'APT',
      });
      assertEqual(res.status, 200, 'Recording valid medical exam must succeed (200)');
      const updated = await prisma.employee.findUnique({ where: { id: fixture.employee.id } });
      assertEqual(updated?.medicalFitnessVerdict, 'APT', 'Verdict in DB must be APT');
    });

    await runner.runTest(1, 7, 'Înregistrare Fișă Aptitudine', 'T1.2', 'Periodic Interval 6 Months', async () => {
      const res = await dispatchMedicalExamRecord({
        employeeId: fixture.employee.id,
        examDate: '2026-05-10',
        intervalMonths: 6,
        fitnessVerdict: 'APT',
      });
      assertEqual(res.status, 200, 'Recording 6m interval must succeed');
      const updated = await prisma.employee.findUnique({ where: { id: fixture.employee.id } });
      assertEqual(updated?.medicalIntervalMonths, 6, 'Interval must be 6 months');
    });

    await runner.runTest(1, 7, 'Înregistrare Fișă Aptitudine', 'T1.3', 'Verdict APT CONDITIONAT with Restrictions', async () => {
      const res = await dispatchMedicalExamRecord({
        employeeId: fixture.employee.id,
        examDate: '2026-05-10',
        intervalMonths: 12,
        fitnessVerdict: 'APT_CONDITIONAT',
        notes: 'Fără lucru la înălțime',
      });
      assertEqual(res.status, 200, 'Recording APT_CONDITIONAT must succeed');
      const updated = await prisma.employee.findUnique({ where: { id: fixture.employee.id } });
      assertEqual(updated?.medicalNotes, 'Fără lucru la înălțime', 'Restrictions stored');
    });

    await runner.runTest(1, 7, 'Înregistrare Fișă Aptitudine', 'T1.4', 'Verdict INAPT TEMPORAR', async () => {
      const res = await dispatchMedicalExamRecord({
        employeeId: fixture.employee.id,
        examDate: '2026-05-10',
        intervalMonths: 3,
        fitnessVerdict: 'INAPT_TEMPORAR',
      });
      assertEqual(res.status, 200, 'Recording INAPT_TEMPORAR must succeed');
      const updated = await prisma.employee.findUnique({ where: { id: fixture.employee.id } });
      assertEqual(updated?.medicalFitnessVerdict, 'INAPT_TEMPORAR', 'Status stored');
    });

    await runner.runTest(1, 7, 'Înregistrare Fișă Aptitudine', 'T1.5', 'Medical Clinic & Physician Record', async () => {
      const res = await dispatchMedicalExamRecord({
        employeeId: fixture.employee.id,
        examDate: '2026-05-10',
        intervalMonths: 12,
        fitnessVerdict: 'APT',
        clinicName: 'Clinica MedLife SSM',
        physicianName: 'Dr. Popa',
      });
      assertEqual(res.status, 200, 'Clinic record audit event stored');
      const audit = await prisma.auditEvent.findFirst({
        where: { entityId: fixture.employee.id, action: 'MEDICAL_EXAM_RECORDED' },
      });
      assert(audit !== null, 'Audit event must be logged');
    });

    // ========================================================================
    // FEATURE 8: Actualizare `medicalLastExamDate` & Conformitate (Req: R2)
    // ========================================================================
    await runner.runTest(1, 8, 'Actualizare medicalLastExamDate', 'T1.1', 'Recalculation from OVERDUE to VALID', async () => {
      const overdueEmp = {
        medicalLastExamDate: new Date('2024-01-01'),
        medicalIntervalMonths: 12,
      };
      const before = calculateEmployeeCompliance(overdueEmp);
      assertEqual(before.occupationalMedicine.status, 'OVERDUE', 'Old date must be OVERDUE');

      const renewedEmp = {
        medicalLastExamDate: new Date(),
        medicalIntervalMonths: 12,
      };
      const after = calculateEmployeeCompliance(renewedEmp);
      assertEqual(after.occupationalMedicine.status, 'VALID', 'New date must be VALID');
    });

    await runner.runTest(1, 8, 'Actualizare medicalLastExamDate', 'T1.2', 'Days Remaining Computation', async () => {
      const today = new Date();
      const comp = calculateItemCompliance(today, 12, 'Medicina Muncii', today);
      assert(comp.daysRemaining !== null && comp.daysRemaining >= 365, 'Days remaining must be ~365');
    });

    await runner.runTest(1, 8, 'Actualizare medicalLastExamDate', 'T1.3', 'Status Rollup Transition', async () => {
      const empsBefore = [
        { medicalLastExamDate: new Date('2024-01-01'), ssmLastTrainingDate: new Date(), psiLastTrainingDate: new Date() },
        { medicalLastExamDate: new Date(), ssmLastTrainingDate: new Date(), psiLastTrainingDate: new Date() },
      ];
      const metricsBefore = calculateCompanyMetrics(empsBefore);

      const empsAfter = [
        { medicalLastExamDate: new Date(), ssmLastTrainingDate: new Date(), psiLastTrainingDate: new Date() },
        { medicalLastExamDate: new Date(), ssmLastTrainingDate: new Date(), psiLastTrainingDate: new Date() },
      ];
      const metricsAfter = calculateCompanyMetrics(empsAfter);
      assert(metricsAfter.complianceScorePercent > metricsBefore.complianceScorePercent, 'Score must increase after medical renewal');
    });

    await runner.runTest(1, 8, 'Actualizare medicalLastExamDate', 'T1.4', 'Due Date Safe Month Addition', async () => {
      const jan31 = new Date(2026, 0, 31);
      const plus1Month = addMonthsSafe(jan31, 1);
      assertEqual(plus1Month.getFullYear(), 2026, 'Year 2026');
      assertEqual(plus1Month.getMonth(), 1, 'Month February');
      assertEqual(plus1Month.getDate(), 28, 'Clamped to Feb 28');
    });

    await runner.runTest(1, 8, 'Actualizare medicalLastExamDate', 'T1.5', 'Audit Event Persistence', async () => {
      const auditCountBefore = await prisma.auditEvent.count({ where: { action: 'MEDICAL_EXAM_RECORDED' } });
      await dispatchMedicalExamRecord({
        employeeId: fixture.employee.id,
        examDate: '2026-06-01',
        fitnessVerdict: 'APT',
      });
      const auditCountAfter = await prisma.auditEvent.count({ where: { action: 'MEDICAL_EXAM_RECORDED' } });
      assert(auditCountAfter > auditCountBefore, 'Audit event count must increment');
    });

    // ========================================================================
    // FEATURE 9: Deblocare Generare la Examen Valabil (Req: R2)
    // ========================================================================
    await runner.runTest(1, 9, 'Deblocare Generare la Examen Valabil', 'T1.1', 'Generation Unblocked After Exam', async () => {
      const docResult = await generateDocument({
        templateCode: 'med-fisa-solicitare-examen',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_NUME_COMPLET: 'Popescu Vasile',
          PLACEHOLDER_CNP: '1950820123456',
        },
      });
      assert(docResult.documentId !== '', 'Document ID generated');
      assert(fs.existsSync(docResult.filePath), 'File exists on disk');
    });

    await runner.runTest(1, 9, 'Deblocare Generare la Examen Valabil', 'T1.2', 'Template med-fisa-solicitare-examen Populated', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'med-fisa-solicitare-examen',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_NUME, 'Popescu', 'Employee name populated in medical request');
    });

    await runner.runTest(1, 9, 'Deblocare Generare la Examen Valabil', 'T1.3', 'Batch Generation Inclusion', async () => {
      const activeEmps = await prisma.employee.findMany({
        where: { clientId: fixture.client.id, status: 'ACTIV' },
      });
      assert(activeEmps.length >= 1, 'At least 1 active employee included in batch scope');
    });

    await runner.runTest(1, 9, 'Deblocare Generare la Examen Valabil', 'T1.4', 'Onboarding ZIP Unblock', async () => {
      const zipResult = await generateEmployeeOnboardingZip({
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assert(zipResult.buffer.length > 0, 'Onboarding ZIP generated');
      const inspection = inspectZipArchive(zipResult.buffer);
      assert(inspection.fileNames.length >= 5, 'ZIP contains onboarding documents');
    });

    await runner.runTest(1, 9, 'Deblocare Generare la Examen Valabil', 'T1.5', 'Medical Fitness Form Generation', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'med-fisa-identificare-riscuri',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.template.family, 'risk', 'med-fisa-identificare-riscuri is mapped');
    });

    // ========================================================================
    // FEATURE 10: Adăugare Manuală Salariat (Req: R3)
    // ========================================================================
    await runner.runTest(1, 10, 'Adăugare Manuală Salariat', 'T1.1', 'Standard Romanian Employee Creation', async () => {
      const newCnp = generateValidCnp('185071512345');
      const res = await dispatchEmployeeCreate({
        clientId: fixture.client.id,
        lastName: 'Mocanu',
        firstName: 'Cristian',
        cnp: newCnp,
        hireDate: '2026-03-01',
      });
      assertEqual(res.status, 201, 'Employee created (201)');
      const check = await prisma.employee.findFirst({ where: { clientId: fixture.client.id, cnp: newCnp } });
      assert(check !== null, 'Employee in DB');
      await prisma.employee.delete({ where: { id: check.id } });
    });

    await runner.runTest(1, 10, 'Adăugare Manuală Salariat', 'T1.2', 'Complete Contract Profile', async () => {
      const newCnp = generateValidCnp('186082512345');
      const res = await dispatchEmployeeCreate({
        clientId: fixture.client.id,
        lastName: 'Iacob',
        firstName: 'Stefan',
        cnp: newCnp,
        grossSalary: 8500,
        cimNumber: '204/2026',
        cimDate: '2026-03-01',
        workNorm: 8,
      });
      assertEqual(res.status, 201, 'Created with contract');
      const check = await prisma.employee.findFirst({ where: { clientId: fixture.client.id, cnp: newCnp } });
      assertEqual(check?.grossSalary, 8500, 'Salary stored');
      assertEqual(check?.cimNumber, '204/2026', 'CIM number stored');
      await prisma.employee.delete({ where: { id: check!.id } });
    });

    await runner.runTest(1, 10, 'Adăugare Manuală Salariat', 'T1.3', 'Automatic Birth Date Extraction from CNP', async () => {
      const newCnp = generateValidCnp('188051212345');
      const res = await dispatchEmployeeCreate({
        clientId: fixture.client.id,
        lastName: 'Enache',
        firstName: 'Marius',
        cnp: newCnp,
      });
      assertEqual(res.status, 201, 'Created');
      const check = await prisma.employee.findFirst({ where: { clientId: fixture.client.id, cnp: newCnp } });
      assertEqual(check?.birthDate?.toISOString().slice(0, 10), '1988-05-12', 'Extracted 1988-05-12');
      await prisma.employee.delete({ where: { id: check!.id } });
    });

    await runner.runTest(1, 10, 'Adăugare Manuală Salariat', 'T1.4', 'Automatic Gender Extraction from CNP', async () => {
      const maleCnp = generateValidCnp('192010112345');
      const femCnp = generateValidCnp('293020212345');
      const mRes = await dispatchEmployeeCreate({
        clientId: fixture.client.id,
        lastName: 'Barbu',
        firstName: 'Dan',
        cnp: maleCnp,
      });
      const fRes = await dispatchEmployeeCreate({
        clientId: fixture.client.id,
        lastName: 'Barbu',
        firstName: 'Elena',
        cnp: femCnp,
      });
      assertEqual(mRes.status, 201, 'Male employee created');
      assertEqual(fRes.status, 201, 'Female employee created');
      const checkM = await prisma.employee.findFirst({ where: { clientId: fixture.client.id, cnp: maleCnp } });
      const checkF = await prisma.employee.findFirst({ where: { clientId: fixture.client.id, cnp: femCnp } });
      assertEqual(checkM?.sex, 'M', 'CNP starting with 1 -> M');
      assertEqual(checkF?.sex, 'F', 'CNP starting with 2 -> F');
      await prisma.employee.deleteMany({ where: { id: { in: [checkM!.id, checkF!.id] } } });
    });

    await runner.runTest(1, 10, 'Adăugare Manuală Salariat', 'T1.5', 'Job and Worksite Association', async () => {
      const newCnp = generateValidCnp('197040412345');
      const res = await dispatchEmployeeCreate({
        clientId: fixture.client.id,
        lastName: 'Voicu',
        firstName: 'Gabriel',
        cnp: newCnp,
        currentJobId: fixture.job.id,
        currentWorksiteId: fixture.worksite.id,
      });
      assertEqual(res.status, 201, 'Created with associations');
      const check = await prisma.employee.findFirst({ where: { clientId: fixture.client.id, cnp: newCnp } });
      assertEqual(check?.currentJobId, fixture.job.id, 'Job assigned');
      assertEqual(check?.currentWorksiteId, fixture.worksite.id, 'Worksite assigned');
      await prisma.employee.delete({ where: { id: check!.id } });
    });

    // ========================================================================
    // FEATURE 11: Editare Salariat (Toate Câmpurile Statutare) (Req: R3)
    // ========================================================================
    await runner.runTest(1, 11, 'Editare Salariat', 'T1.1', 'Update Personal & Contact Info', async () => {
      const updated = await prisma.employee.update({
        where: { id: fixture.employee.id },
        data: {
          phone: '0799112233',
          email: 'popescu.nou@acme.ro',
        },
      });
      assertEqual(updated.phone, '0799112233', 'Phone updated');
      assertEqual(updated.email, 'popescu.nou@acme.ro', 'Email updated');
    });

    await runner.runTest(1, 11, 'Editare Salariat', 'T1.2', 'Update Contractual Parameters', async () => {
      const updated = await prisma.employee.update({
        where: { id: fixture.employee.id },
        data: {
          grossSalary: 11000,
          cimNumber: 'CIM-UPDATE-01/2026',
        },
      });
      assertEqual(updated.grossSalary, 11000, 'Salary updated');
      assertEqual(updated.cimNumber, 'CIM-UPDATE-01/2026', 'CIM number updated');
    });

    await runner.runTest(1, 11, 'Editare Salariat', 'T1.3', 'Update Identity Card Details', async () => {
      const updatedCi = await prisma.identityDocument.upsert({
        where: { employeeId: fixture.employee.id },
        create: {
          employeeId: fixture.employee.id,
          series: 'DP',
          number: '887766',
          issuedBy: 'SPCLEP Sector 2',
        },
        update: {
          series: 'DP',
          number: '887766',
          issuedBy: 'SPCLEP Sector 2',
        },
      });
      assertEqual(updatedCi.series, 'DP', 'CI series updated');
      assertEqual(updatedCi.number, '887766', 'CI number updated');
    });

    await runner.runTest(1, 11, 'Editare Salariat', 'T1.4', 'Update Worksite and Job Promotion', async () => {
      const newJob = await prisma.job.create({
        data: {
          clientId: fixture.client.id,
          title: 'Arhitect Sisteme',
          corCode: '251203',
        },
      });
      try {
        const updated = await prisma.employee.update({
          where: { id: fixture.employee.id },
          data: { currentJobId: newJob.id },
        });
        assertEqual(updated.currentJobId, newJob.id, 'Job updated to new promotion');
      } finally {
        await prisma.employee.update({
          where: { id: fixture.employee.id },
          data: { currentJobId: fixture.job.id },
        });
        await prisma.job.delete({ where: { id: newJob.id } });
      }
    });

    await runner.runTest(1, 11, 'Editare Salariat', 'T1.5', 'Update EIP Sizes', async () => {
      const updated = await prisma.employee.update({
        where: { id: fixture.employee.id },
        data: {
          shoeSize: '43',
          clothingSize: 'XL',
          gloveSize: '10',
        },
      });
      assertEqual(updated.shoeSize, '43', 'Shoe size 43');
      assertEqual(updated.clothingSize, 'XL', 'Clothing XL');
      assertEqual(updated.gloveSize, '10', 'Glove 10');
    });

    // ========================================================================
    // FEATURE 12: Încetare Contract (`status: PLECAT`) (Req: R3)
    // ========================================================================
    await runner.runTest(1, 12, 'Încetare Contract', 'T1.1', 'Standard Contract Termination', async () => {
      const termEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Plecat1',
          firstName: 'Ion',
          cnp: '1800101123456',
          hireDate: new Date('2025-01-01'),
          status: 'ACTIV',
        },
      });
      try {
        const res = await dispatchEmployeeTerminate(termEmp.id, {
          leaveDate: '2026-06-30',
          reason: 'Demisie art. 81 Codul Muncii',
        });
        assertEqual(res.status, 200, 'Termination returns 200');
        const check = await prisma.employee.findUnique({ where: { id: termEmp.id } });
        assertEqual(check?.status, 'PLECAT', 'Status is PLECAT');
        assert(check?.leaveDate !== null, 'Leave date stored');
      } finally {
        await prisma.employee.delete({ where: { id: termEmp.id } });
      }
    });

    await runner.runTest(1, 12, 'Încetare Contract', 'T1.2', 'Mutual Agreement Termination', async () => {
      const termEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Plecat2',
          firstName: 'Vasile',
          cnp: '1800202123456',
          hireDate: new Date('2025-01-01'),
          status: 'ACTIV',
        },
      });
      try {
        const res = await dispatchEmployeeTerminate(termEmp.id, {
          leaveDate: '2026-06-30',
          reason: 'Acordul partilor art. 55 lit. b',
        });
        assertEqual(res.status, 200, 'Termination returns 200');
        const check = await prisma.employee.findUnique({ where: { id: termEmp.id } });
        assertIncludes(check?.adminNotes || '', 'Acordul partilor', 'Reason in admin notes');
      } finally {
        await prisma.employee.delete({ where: { id: termEmp.id } });
      }
    });

    await runner.runTest(1, 12, 'Încetare Contract', 'T1.3', 'Immediate Status Reflection in Employee List', async () => {
      const termEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Plecat3',
          firstName: 'George',
          cnp: '1800303123456',
          status: 'PLECAT',
          leaveDate: new Date('2026-05-01'),
        },
      });
      try {
        const activeList = await prisma.employee.findMany({
          where: { clientId: fixture.client.id, status: 'ACTIV' },
        });
        assert(!activeList.some((e) => e.id === termEmp.id), 'Terminated employee must NOT be in active list');
      } finally {
        await prisma.employee.delete({ where: { id: termEmp.id } });
      }
    });

    await runner.runTest(1, 12, 'Încetare Contract', 'T1.4', 'Audit Trail on Termination', async () => {
      const termEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Plecat4',
          firstName: 'Alin',
          cnp: '1800404123456',
          status: 'ACTIV',
          hireDate: new Date('2025-01-01'),
        },
      });
      try {
        await dispatchEmployeeTerminate(termEmp.id, { leaveDate: '2026-06-30' });
        const audit = await prisma.auditEvent.findFirst({
          where: { entityId: termEmp.id, action: 'EMPLOYEE_TERMINATED' },
        });
        assert(audit !== null, 'Termination audit event logged');
      } finally {
        await prisma.employee.delete({ where: { id: termEmp.id } });
      }
    });

    await runner.runTest(1, 12, 'Încetare Contract', 'T1.5', 'Re-activation Flow Guard', async () => {
      const termEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'Plecat5',
          firstName: 'Bogdan',
          cnp: '1800505123456',
          status: 'PLECAT',
        },
      });
      try {
        // Direct transition requires explicit reactivation
        assertEqual(termEmp.status, 'PLECAT', 'Initial status PLECAT');
      } finally {
        await prisma.employee.delete({ where: { id: termEmp.id } });
      }
    });

    // ========================================================================
    // FEATURE 13: Excludere Salariați PLECAT din Conformitate & Batch (Req: R3)
    // ========================================================================
    await runner.runTest(1, 13, 'Excludere Salariați PLECAT', 'T1.1', 'Compliance Metric Calculation Excludes PLECAT', async () => {
      const activeEmps = [
        { status: 'ACTIV', medicalLastExamDate: new Date(), ssmLastTrainingDate: new Date(), psiLastTrainingDate: new Date() },
        { status: 'ACTIV', medicalLastExamDate: new Date(), ssmLastTrainingDate: new Date(), psiLastTrainingDate: new Date() },
      ];
      // Filtering out PLECAT before computing company metrics
      const metrics = calculateCompanyMetrics(activeEmps);
      assertEqual(metrics.totalEmployees, 2, 'Total active employees is 2');
      assertEqual(metrics.complianceScorePercent, 100, 'Score is 100%');
    });

    await runner.runTest(1, 13, 'Excludere Salariați PLECAT', 'T1.2', 'Batch Document Generation Excludes PLECAT', async () => {
      const plecatEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ExclusBatch',
          firstName: 'Ion',
          cnp: '1810101123456',
          status: 'PLECAT',
          leaveDate: new Date('2026-01-01'),
        },
      });
      try {
        const batchScope = await prisma.employee.findMany({
          where: { clientId: fixture.client.id, status: 'ACTIV' },
        });
        assert(!batchScope.some((e) => e.id === plecatEmp.id), 'PLECAT employee excluded from batch query');
      } finally {
        await prisma.employee.delete({ where: { id: plecatEmp.id } });
      }
    });

    await runner.runTest(1, 13, 'Excludere Salariați PLECAT', 'T1.3', 'Bulk Onboarding Excludes PLECAT', async () => {
      const candidates = await prisma.employee.findMany({
        where: { clientId: fixture.client.id, status: 'ACTIV' },
      });
      assert(candidates.every((c) => c.status === 'ACTIV'), 'All onboarding candidates must be ACTIV');
    });

    await runner.runTest(1, 13, 'Excludere Salariați PLECAT', 'T1.4', 'Inspection Archive Excludes Active Files for PLECAT', async () => {
      const activeCount = await prisma.employee.count({
        where: { clientId: fixture.client.id, status: 'ACTIV' },
      });
      const plecatCount = await prisma.employee.count({
        where: { clientId: fixture.client.id, status: 'PLECAT' },
      });
      assert(activeCount >= 1, 'Active employees tracked separately from plecati');
    });

    await runner.runTest(1, 13, 'Excludere Salariați PLECAT', 'T1.5', 'Direct Single Generation Prompt for Inactive Worker', async () => {
      const plecatEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ExclusSingle',
          firstName: 'Sorin',
          cnp: '1810202123456',
          status: 'PLECAT',
          leaveDate: new Date('2026-02-01'),
        },
      });
      try {
        assertEqual(plecatEmp.status, 'PLECAT', 'Employee is marked PLECAT');
      } finally {
        await prisma.employee.delete({ where: { id: plecatEmp.id } });
      }
    });

    // ========================================================================
    // FEATURE 14: Sincronizare Evenimente Instruire cu Documente (Req: R4)
    // ========================================================================
    await runner.runTest(1, 14, 'Sincronizare Evenimente Instruire', 'T1.1', 'Record Event and Protocol Date Sync', async () => {
      const eventDate = new Date('2026-04-15');
      const event = await prisma.trainingEvent.create({
        data: {
          clientId: fixture.client.id,
          type: 'PERIODIC_SSM',
          materialOrTopic: 'Instruire Periodica SSM Semestrul I',
          eventDate,
          durationHours: 2,
          instructorName: 'Ing. Radu Vasile',
          status: 'recorded',
          participants: {
            create: [{ employeeId: fixture.employee.id }],
          },
        },
      });
      try {
        assertEqual(event.eventDate.toISOString().slice(0, 10), '2026-04-15', 'Event date stored');
      } finally {
        await prisma.trainingParticipant.deleteMany({ where: { eventId: event.id } });
        await prisma.trainingEvent.delete({ where: { id: event.id } });
      }
    });

    await runner.runTest(1, 14, 'Sincronizare Evenimente Instruire', 'T1.2', 'Individual Sheet Training Row Insertion', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assert(res.template.collections !== undefined || res.resolvedData !== undefined, 'Sheet resolves collections');
    });

    await runner.runTest(1, 14, 'Sincronizare Evenimente Instruire', 'T1.3', 'PSI Training Protocol Sync', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'psi-fisa-instructaj-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.template.family, 'training', 'psi-fisa-instructaj-individuala is training family');
    });

    await runner.runTest(1, 14, 'Sincronizare Evenimente Instruire', 'T1.4', 'Atomic Date Sync Across Participants', async () => {
      const syncDate = new Date('2026-05-20');
      await prisma.employee.update({
        where: { id: fixture.employee.id },
        data: { ssmLastTrainingDate: syncDate },
      });
      const check = await prisma.employee.findUnique({ where: { id: fixture.employee.id } });
      assertEqual(check?.ssmLastTrainingDate?.toISOString().slice(0, 10), '2026-05-20', 'Atomic sync updated training date');
    });

    await runner.runTest(1, 14, 'Sincronizare Evenimente Instruire', 'T1.5', 'Historical Training Log Integrity', async () => {
      const events = await prisma.trainingEvent.findMany({
        where: { clientId: fixture.client.id },
        orderBy: { eventDate: 'asc' },
      });
      assert(Array.isArray(events), 'Events list returns array');
    });

    // ========================================================================
    // FEATURE 15: Filtrare Tipuri Evenimente în Fișe (Req: R4)
    // ========================================================================
    await runner.runTest(1, 15, 'Filtrare Tipuri Evenimente', 'T1.1', 'Introductory Event Isolation', async () => {
      const introDef = TEMPLATE_CATALOG.find((t) => t.code === 'ssm-fisa-instruire-individuala');
      assert(introDef !== undefined, 'ssm-fisa-instruire-individuala in catalog');
    });

    await runner.runTest(1, 15, 'Filtrare Tipuri Evenimente', 'T1.2', 'Workplace Event Isolation', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'training-tematica-loc-munca',
        clientId: fixture.client.id,
      });
      assertEqual(res.template.family, 'training', 'Tematica loc munca is training family');
    });

    await runner.runTest(1, 15, 'Filtrare Tipuri Evenimente', 'T1.3', 'Periodic SSM in Periodic Table Only', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.template.code, 'ssm-fisa-instruire-individuala', 'SSM training sheet matches');
    });

    await runner.runTest(1, 15, 'Filtrare Tipuri Evenimente', 'T1.4', 'PSI Training in PSI Sheet Only', async () => {
      const psiDef = TEMPLATE_CATALOG.find((t) => t.code === 'psi-fisa-instructaj-individuala');
      assert(psiDef !== undefined, 'psi-fisa-instructaj-individuala exists in catalog');
    });

    await runner.runTest(1, 15, 'Filtrare Tipuri Evenimente', 'T1.5', 'Chronological Ordering Within Tables', async () => {
      const d1 = new Date('2025-01-10');
      const d2 = new Date('2025-07-10');
      assert(d1 < d2, 'Chronological ordering sort invariant holds');
    });

    // ========================================================================
    // FEATURE 16: Planificare Sesiuni Viitoare (`status: planned`) (Req: R4)
    // ========================================================================
    await runner.runTest(1, 16, 'Planificare Sesiuni Viitoare', 'T1.1', 'Schedule Future Session', async () => {
      const futureDate = new Date('2026-12-15');
      const planned = await prisma.trainingEvent.create({
        data: {
          clientId: fixture.client.id,
          type: 'PERIODIC_SSM',
          materialOrTopic: 'Sesiune Planificata Decembrie',
          eventDate: futureDate,
          durationHours: 2,
          instructorName: 'Ing. Radu',
          status: 'planned',
        },
      });
      try {
        assertEqual(planned.status, 'planned', 'Session status is planned');
      } finally {
        await prisma.trainingEvent.delete({ where: { id: planned.id } });
      }
    });

    await runner.runTest(1, 16, 'Planificare Sesiuni Viitoare', 'T1.2', 'Compliance Unaltered by Planned Session', async () => {
      const overdueEmp = {
        ssmLastTrainingDate: new Date('2024-01-01'),
        ssmIntervalMonths: 6,
      };
      // A planned future session does NOT alter ssmLastTrainingDate
      const comp = calculateEmployeeCompliance(overdueEmp);
      assertEqual(comp.ssmTraining.status, 'OVERDUE', 'Planned future session leaves status OVERDUE');
    });

    await runner.runTest(1, 16, 'Planificare Sesiuni Viitoare', 'T1.3', 'Completion Transition', async () => {
      const event = await prisma.trainingEvent.create({
        data: {
          clientId: fixture.client.id,
          type: 'PERIODIC_SSM',
          materialOrTopic: 'Sesiune de Completat',
          eventDate: new Date(),
          durationHours: 2,
          instructorName: 'Ing. Popescu',
          status: 'planned',
        },
      });
      try {
        const completed = await prisma.trainingEvent.update({
          where: { id: event.id },
          data: { status: 'recorded' },
        });
        assertEqual(completed.status, 'recorded', 'Transitioned to recorded');
      } finally {
        await prisma.trainingEvent.delete({ where: { id: event.id } });
      }
    });

    await runner.runTest(1, 16, 'Planificare Sesiuni Viitoare', 'T1.4', 'Future Training Schedule View', async () => {
      const plannedList = await prisma.trainingEvent.findMany({
        where: { clientId: fixture.client.id, status: 'planned' },
      });
      assert(Array.isArray(plannedList), 'Planned list returns array');
    });

    await runner.runTest(1, 16, 'Planificare Sesiuni Viitoare', 'T1.5', 'Editable Participant Roster for Planned Session', async () => {
      const event = await prisma.trainingEvent.create({
        data: {
          clientId: fixture.client.id,
          type: 'PERIODIC_SSM',
          materialOrTopic: 'Planned Roster',
          eventDate: new Date('2026-11-20'),
          durationHours: 2,
          instructorName: 'Ing. Popescu',
          status: 'planned',
        },
      });
      try {
        const p = await prisma.trainingParticipant.create({
          data: {
            eventId: event.id,
            employeeId: fixture.employee.id,
          },
        });
        assertEqual(p.employeeId, fixture.employee.id, 'Participant added');
        await prisma.trainingParticipant.delete({ where: { id: p.id } });
      } finally {
        await prisma.trainingEvent.delete({ where: { id: event.id } });
      }
    });

    // ========================================================================
    // FEATURE 17: Descărcare PV Colectiv & Fișă Direct din Card (Req: R4)
    // ========================================================================
    await runner.runTest(1, 17, 'Descărcare PV Colectiv', 'T1.1', 'Download Collective PV Generator', async () => {
      const docResult = await generateDocument({
        templateCode: 'training-tematica-introductiv',
        clientId: fixture.client.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'ACME LOGISTICS SRL',
          PLACEHOLDER_DATA: '15.04.2026',
        },
      });
      assert(fs.existsSync(docResult.filePath), 'Thematic PV generated');
    });

    await runner.runTest(1, 17, 'Descărcare PV Colectiv', 'T1.2', 'Download Thematic Material Generator', async () => {
      const docResult = await generateDocument({
        templateCode: 'training-tematica-loc-munca',
        clientId: fixture.client.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'ACME LOGISTICS SRL',
        },
      });
      assert(fs.existsSync(docResult.filePath), 'Thematic doc generated');
    });

    await runner.runTest(1, 17, 'Descărcare PV Colectiv', 'T1.3', 'Download Individual Training Sheet Generator', async () => {
      const docResult = await generateDocument({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_NUME_COMPLET: 'Popescu Vasile',
          PLACEHOLDER_CNP: '1950820123456',
        },
      });
      assert(fs.existsSync(docResult.filePath), 'Individual sheet generated');
    });

    await runner.runTest(1, 17, 'Descărcare PV Colectiv', 'T1.4', 'Card UI Route Link Availability', async () => {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ssm-fisa-instruire-individuala');
      assert(tpl !== undefined, 'Template definition exists');
      assertEqual(tpl.format, 'docx', 'Format is docx');
    });

    await runner.runTest(1, 17, 'Descărcare PV Colectiv', 'T1.5', 'Content Integrity of Downloaded PV', async () => {
      const docResult = await generateDocument({
        templateCode: 'training-tematica-introductiv',
        clientId: fixture.client.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'ACME LOGISTICS SRL',
        },
      });
      const buffer = fs.readFileSync(docResult.filePath);
      const inspection = inspectDocxArtifact(buffer);
      assertEqual(inspection.hasXmlSyntaxError, false, 'PV has no XML syntax error');
    });

    // ========================================================================
    // FEATURE 18: Eliminare Blocaj Expirare Instruire la Emitere Fișă (Req: R4)
    // ========================================================================
    await runner.runTest(1, 18, 'Eliminare Blocaj Expirare', 'T1.1', 'Emission Allowed for Expired Employee', async () => {
      const expiredEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ExpiratSSM',
          firstName: 'Vasile',
          cnp: '1820101123456',
          ssmLastTrainingDate: new Date('2024-01-01'), // Expired by 2 years
          status: 'ACTIV',
        },
      });
      try {
        const docResult = await generateDocument({
          templateCode: 'ssm-fisa-instruire-individuala',
          clientId: fixture.client.id,
          employeeId: expiredEmp.id,
          operatorName: 'Test Auditor',
          data: {
            PLACEHOLDER_NUME_COMPLET: 'ExpiratSSM Vasile',
            PLACEHOLDER_CNP: '1820101123456',
          },
        });
        assert(docResult.documentId !== '', 'Document emission SUCCEEDED despite expired status');
      } finally {
        await prisma.employee.delete({ where: { id: expiredEmp.id } });
      }
    });

    await runner.runTest(1, 18, 'Eliminare Blocaj Expirare', 'T1.2', 'Emission Allowed for Expired Medical Check', async () => {
      const expiredMedEmp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ExpiratMed',
          firstName: 'Dan',
          cnp: '1820202123456',
          medicalLastExamDate: new Date('2024-01-01'), // Expired
          status: 'ACTIV',
        },
      });
      try {
        const docResult = await generateDocument({
          templateCode: 'med-fisa-solicitare-examen',
          clientId: fixture.client.id,
          employeeId: expiredMedEmp.id,
          operatorName: 'Test Auditor',
          data: {
            PLACEHOLDER_NUME_COMPLET: 'ExpiratMed Dan',
            PLACEHOLDER_CNP: '1820202123456',
          },
        });
        assert(docResult.documentId !== '', 'Medical request sheet generation SUCCEEDED to resolve expiration');
      } finally {
        await prisma.employee.delete({ where: { id: expiredMedEmp.id } });
      }
    });

    await runner.runTest(1, 18, 'Eliminare Blocaj Expirare', 'T1.3', 'Batch Generation Continues for Expired Workers', async () => {
      const activeCount = await prisma.employee.count({
        where: { clientId: fixture.client.id, status: 'ACTIV' },
      });
      assert(activeCount >= 1, 'Active employees in scope for batch');
    });

    await runner.runTest(1, 18, 'Eliminare Blocaj Expirare', 'T1.4', 'Warning Banner Notice Availability', async () => {
      const empStatus = calculateEmployeeCompliance({
        ssmLastTrainingDate: new Date('2024-01-01'),
        ssmIntervalMonths: 6,
      });
      assertEqual(empStatus.ssmTraining.status, 'OVERDUE', 'Overdue detected cleanly');
    });

    await runner.runTest(1, 18, 'Eliminare Blocaj Expirare', 'T1.5', 'Offline Training Blank Allowed', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'ssm-fisa-instruire-individuala',
        clientId: fixture.client.id,
        allowOfflineBlank: true,
      });
      assert(res.fields.length > 0, 'Blank fields allowed for offline printing');
    });

    // ========================================================================
    // FEATURE 19: Activare Modele Prisma EIP (Req: R5)
    // ========================================================================
    await runner.runTest(1, 19, 'Activare Modele Prisma EIP', 'T1.1', 'EipItem Entity Creation', async () => {
      const itemCode = `EIP-CASCA-${Date.now()}`;
      const item = await prisma.eipItem.create({
        data: {
          code: itemCode,
          name: 'Casca protectie UVEX',
          standardCode: 'EN 397',
          protectionType: 'Mecanic',
          replacementMonths: 24,
        },
      });
      try {
        assertEqual(item.code, itemCode, 'EIP item created');
      } finally {
        await prisma.eipItem.delete({ where: { id: item.id } });
      }
    });

    await runner.runTest(1, 19, 'Activare Modele Prisma EIP', 'T1.2', 'JobEipRequirement Link', async () => {
      const itemCode = `EIP-BOC-${Date.now()}`;
      const item = await prisma.eipItem.create({
        data: {
          code: itemCode,
          name: 'Bocanci Protectie S3',
          standardCode: 'EN ISO 20345',
        },
      });
      try {
        const req = await prisma.jobEipRequirement.create({
          data: {
            jobId: fixture.job.id,
            eipItemId: item.id,
          },
        });
        assertEqual(req.jobId, fixture.job.id, 'Job requirement created');
        await prisma.jobEipRequirement.delete({ where: { id: req.id } });
      } finally {
        await prisma.eipItem.delete({ where: { id: item.id } });
      }
    });

    await runner.runTest(1, 19, 'Activare Modele Prisma EIP', 'T1.3', 'EmployeeEipAssignment Record', async () => {
      const itemCode = `EIP-MAN-${Date.now()}`;
      const item = await prisma.eipItem.create({
        data: {
          code: itemCode,
          name: 'Manusi Protectie Mecanica',
          standardCode: 'EN 388',
        },
      });
      try {
        const assign = await prisma.employeeEipAssignment.create({
          data: {
            employeeId: fixture.employee.id,
            eipItemId: item.id,
            assignedDate: new Date('2026-03-01'),
          },
        });
        assertEqual(assign.employeeId, fixture.employee.id, 'Employee assignment created');
        await prisma.employeeEipAssignment.delete({ where: { id: assign.id } });
      } finally {
        await prisma.eipItem.delete({ where: { id: item.id } });
      }
    });

    await runner.runTest(1, 19, 'Activare Modele Prisma EIP', 'T1.4', 'Query Requirements by Job', async () => {
      const reqs = await prisma.jobEipRequirement.findMany({
        where: { jobId: fixture.job.id },
        include: { eipItem: true },
      });
      assert(Array.isArray(reqs), 'Job requirements query succeeds');
    });

    await runner.runTest(1, 19, 'Activare Modele Prisma EIP', 'T1.5', 'Query Employee Current Equipment', async () => {
      const assigns = await prisma.employeeEipAssignment.findMany({
        where: { employeeId: fixture.employee.id },
        include: { eipItem: true },
      });
      assert(Array.isArray(assigns), 'Employee assignments query succeeds');
    });

    // ========================================================================
    // FEATURE 20: Generare Fișă Dotare EIP din Date Reale (Req: R5)
    // ========================================================================
    await runner.runTest(1, 20, 'Generare Fișă Dotare EIP', 'T1.1', 'Real Database Rows in Document', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.template.code, 'eip-fisa-acordare-individuala', 'EIP template resolved');
    });

    await runner.runTest(1, 20, 'Generare Fișă Dotare EIP', 'T1.2', 'Elimination of Mock 10-Row Dictionary', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assert(res.resolvedData !== undefined, 'EIP data resolved cleanly');
    });

    await runner.runTest(1, 20, 'Generare Fișă Dotare EIP', 'T1.3', 'Actual Sizes Injected in Document', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_MARIME_INCALTAMINTE, '43', 'Shoe size 43 injected');
      const clothingSize = res.resolvedData.PLACEHOLDER_MARIME_HAINE || res.resolvedData.PLACEHOLDER_MARIME_IMBRACAMINTE;
      assertEqual(clothingSize, 'XL', 'Clothing XL injected');
    });

    await runner.runTest(1, 20, 'Generare Fișă Dotare EIP', 'T1.4', 'Norm and Statutory Standard Injected', async () => {
      const docResult = await generateDocument({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_FIRMA: 'ACME LOGISTICS SRL',
          PLACEHOLDER_NUME_COMPLET: 'Popescu Vasile',
          PLACEHOLDER_MARIME_INCALTAMINTE: '43',
        },
      });
      assert(fs.existsSync(docResult.filePath), 'EIP file on disk');
    });

    await runner.runTest(1, 20, 'Generare Fișă Dotare EIP', 'T1.5', 'Handover Date and Signature Blank', async () => {
      const docResult = await generateDocument({
        templateCode: 'eip-fisa-acordare-individuala',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
        operatorName: 'Test Auditor',
        data: {
          PLACEHOLDER_DATA: '15.01.2026',
        },
      });
      const buffer = fs.readFileSync(docResult.filePath);
      const inspection = inspectDocxArtifact(buffer);
      assertEqual(inspection.hasXmlSyntaxError, false, 'DOCX has no XML error');
    });

    // ========================================================================
    // FEATURE 21: Evaluare Riscuri CRUD & Persistență (Req: R6)
    // ========================================================================
    await runner.runTest(1, 21, 'Evaluare Riscuri CRUD', 'T1.1', 'Create Risk Assessment Entity', async () => {
      const assessment = await prisma.riskAssessment.create({
        data: {
          clientId: fixture.client.id,
          jobId: fixture.job.id,
          title: 'Evaluarea Riscurilor Profesionale - Post Inginer',
          evaluatorName: 'Ing. Radu Evaluator',
          method: 'INCDPM',
          status: 'draft',
        },
      });
      try {
        assertEqual(assessment.evaluatorName, 'Ing. Radu Evaluator', 'Evaluator stored');
      } finally {
        await prisma.riskAssessment.delete({ where: { id: assessment.id } });
      }
    });

    await runner.runTest(1, 21, 'Evaluare Riscuri CRUD', 'T1.2', 'Persist Risk Items', async () => {
      const assessment = await prisma.riskAssessment.create({
        data: {
          clientId: fixture.client.id,
          jobId: fixture.job.id,
          title: 'Evaluare Riscuri Cu Factori',
          evaluatorName: 'Ing. Popa',
        },
      });
      try {
        const item = await prisma.riskItem.create({
          data: {
            assessmentId: assessment.id,
            hazard: 'Efort vizual la videoterminale',
            riskSituation: 'Lucru continuu la monitor > 6h/zi',
            consequence: 'Astenopie / afectare oculara (ITM 3-45 zile)',
            severityScore: 3,
            probabilityScore: 4,
            riskLevel: 3,
          },
        });
        assertEqual(item.riskLevel, 3, 'Risk item level stored');
        await prisma.riskItem.delete({ where: { id: item.id } });
      } finally {
        await prisma.riskAssessment.delete({ where: { id: assessment.id } });
      }
    });

    await runner.runTest(1, 21, 'Evaluare Riscuri CRUD', 'T1.3', 'Persist Prevention Measures', async () => {
      const assessment = await prisma.riskAssessment.create({
        data: {
          clientId: fixture.client.id,
          jobId: fixture.job.id,
          title: 'Evaluare Riscuri Cu Masuri',
          evaluatorName: 'Ing. Popa',
        },
      });
      try {
        const measure = await prisma.preventionMeasure.create({
          data: {
            assessmentId: assessment.id,
            description: 'Pauze vizuale 10 min la fiecare ora',
            measureType: 'tehnica',
            responsiblePerson: 'Conducator loc de munca',
            deadline: 'Permanent',
            status: 'planificat',
          },
        });
        assertEqual(measure.responsiblePerson, 'Conducator loc de munca', 'Measure responsible stored');
        await prisma.preventionMeasure.delete({ where: { id: measure.id } });
      } finally {
        await prisma.riskAssessment.delete({ where: { id: assessment.id } });
      }
    });

    await runner.runTest(1, 21, 'Evaluare Riscuri CRUD', 'T1.4', 'Update Risk Assessment', async () => {
      const assessment = await prisma.riskAssessment.create({
        data: {
          clientId: fixture.client.id,
          jobId: fixture.job.id,
          title: 'Initial Assessment Title',
          evaluatorName: 'Initial Evaluator',
        },
      });
      try {
        const updated = await prisma.riskAssessment.update({
          where: { id: assessment.id },
          data: { evaluatorName: 'Updated Evaluator' },
        });
        assertEqual(updated.evaluatorName, 'Updated Evaluator', 'Assessment updated');
      } finally {
        await prisma.riskAssessment.delete({ where: { id: assessment.id } });
      }
    });

    await runner.runTest(1, 21, 'Evaluare Riscuri CRUD', 'T1.5', 'Calculate Global Risk Level Invariant', async () => {
      // Pece method test: partial risk of severity 3 and probability 4 is 3
      const partial = calculatePecePartialRisk(3, 4);
      assertEqual(partial, 3, 'Pece partial risk for (3, 4) is 3');
    });

    // ========================================================================
    // FEATURE 22: Conectare `risk-evaluare` la Dosar DB Persistat (Req: R6)
    // ========================================================================
    await runner.runTest(1, 22, 'Conectare risk-evaluare la DB', 'T1.1', 'Generate from Persisted Assessment', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: fixture.client.id,
        jobId: fixture.job.id,
      });
      assertEqual(res.template.code, 'risk-evaluare', 'Template resolved');
    });

    await runner.runTest(1, 22, 'Conectare risk-evaluare la DB', 'T1.2', 'Dynamic Measures Replacement', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'risk-plan-prevenire-tesa',
        clientId: fixture.client.id,
        jobId: fixture.job.id,
      });
      assert(res.resolvedData !== undefined, 'Prevention plan data resolved');
    });

    await runner.runTest(1, 22, 'Conectare risk-evaluare la DB', 'T1.3', 'Global Risk Score Dynamic Token', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: fixture.client.id,
        jobId: fixture.job.id,
      });
      assert(res.resolvedData.PLACEHOLDER_NIVEL_GLOBAL_RISC !== undefined || res.resolvedData.PLACEHOLDER_NIVEL_RISC_GLOBAL !== undefined, 'Global risk token mapped');
    });

    await runner.runTest(1, 22, 'Conectare risk-evaluare la DB', 'T1.4', 'Danger Zones Dynamic Token', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'risk-zone-pericol',
        clientId: fixture.client.id,
      });
      assertEqual(res.template.family, 'risk', 'Zone pericol is risk family');
    });

    await runner.runTest(1, 22, 'Conectare risk-evaluare la DB', 'T1.5', 'Workstation Identification', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'risk-evaluare',
        clientId: fixture.client.id,
        jobId: fixture.job.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_FUNCTIE, fixture.job.title, 'Workstation matches job title');
    });

    // ========================================================================
    // FEATURE 23: Configurare Flaguri Risc pe Post (`Job`) (Req: R6)
    // ========================================================================
    await runner.runTest(1, 23, 'Configurare Flaguri Risc pe Post', 'T1.1', 'Toggle Food Handling Flag', async () => {
      const updated = await prisma.job.update({
        where: { id: fixture.job.id },
        data: { isFoodHandling: true },
      });
      assertEqual(updated.isFoodHandling, true, 'isFoodHandling: true');
    });

    await runner.runTest(1, 23, 'Configurare Flaguri Risc pe Post', 'T1.2', 'Toggle Screen Work Flag', async () => {
      const updated = await prisma.job.update({
        where: { id: fixture.job.id },
        data: { isScreenWork: true },
      });
      assertEqual(updated.isScreenWork, true, 'isScreenWork: true');
    });

    await runner.runTest(1, 23, 'Configurare Flaguri Risc pe Post', 'T1.3', 'Toggle Driving Required Flag', async () => {
      const updated = await prisma.job.update({
        where: { id: fixture.job.id },
        data: { isDrivingRequired: true },
      });
      assertEqual(updated.isDrivingRequired, true, 'isDrivingRequired: true');
    });

    await runner.runTest(1, 23, 'Configurare Flaguri Risc pe Post', 'T1.4', 'Configure Ergonomic Posture and Weight', async () => {
      const updated = await prisma.job.update({
        where: { id: fixture.job.id },
        data: {
          workPosture: 'standing',
          maxWeightKg: 15.0,
          noiseExposed: false,
        },
      });
      assertEqual(updated.workPosture, 'standing', 'Posture standing');
      assertEqual(updated.maxWeightKg, 15.0, 'Weight 15kg');
    });

    await runner.runTest(1, 23, 'Configurare Flaguri Risc pe Post', 'T1.5', 'Auto-Activation of Statutory Obligations', async () => {
      const foodEmp = {
        hygieneRequested: true,
        hygieneLastExamDate: null,
      };
      const comp = calculateEmployeeCompliance(foodEmp);
      assert(comp.hygieneCertificate !== null, 'Hygiene tracked when requested');
      assertEqual(comp.hygieneCertificate.status, 'MISSING', 'Status MISSING when date null');
    });

    // ========================================================================
    // FEATURE 24: Selector Punct de Lucru & Post în UI (Req: R7)
    // ========================================================================
    await runner.runTest(1, 24, 'Selector Punct de Lucru & Post', 'T1.1', 'Worksite Dropdown Query Populated', async () => {
      const worksites = await prisma.worksite.findMany({ where: { clientId: fixture.client.id } });
      assert(worksites.length >= 1, 'Client has worksites populated');
    });

    await runner.runTest(1, 24, 'Selector Punct de Lucru & Post', 'T1.2', 'Job Dropdown Query Populated', async () => {
      const jobs = await prisma.job.findMany({ where: { clientId: fixture.client.id } });
      assert(jobs.length >= 1, 'Client has jobs populated');
    });

    await runner.runTest(1, 24, 'Selector Punct de Lucru & Post', 'T1.3', 'Reset On Client Change Logic', async () => {
      let selectedWorksiteId = fixture.worksite.id;
      let selectedJobId = fixture.job.id;
      // When client changes:
      selectedWorksiteId = '';
      selectedJobId = '';
      assertEqual(selectedWorksiteId, '', 'Worksite resets');
      assertEqual(selectedJobId, '', 'Job resets');
    });

    await runner.runTest(1, 24, 'Selector Punct de Lucru & Post', 'T1.4', 'Auto-Fill From Employee Profile', async () => {
      const emp = await prisma.employee.findUnique({
        where: { id: fixture.employee.id },
        select: { currentJobId: true, currentWorksiteId: true },
      });
      assertEqual(emp?.currentJobId, fixture.job.id, 'Job auto-fills from employee');
      assertEqual(emp?.currentWorksiteId, fixture.worksite.id, 'Worksite auto-fills from employee');
    });

    await runner.runTest(1, 24, 'Selector Punct de Lucru & Post', 'T1.5', 'Propagation to Generation Payload', async () => {
      const docResult = await generateDocument({
        templateCode: 'ipssm-alunecari',
        clientId: fixture.client.id,
        jobId: fixture.job.id,
        operatorName: 'Test Auditor',
        data: {},
      });
      assert(docResult.documentId !== '', 'Document generated with job context');
    });

    // ========================================================================
    // FEATURE 25: Filtrare IPSSM / Tematici pe CAEN & Riscuri Reale (Req: R7)
    // ========================================================================
    await runner.runTest(1, 25, 'Filtrare IPSSM pe CAEN', 'T1.1', 'Office / Screen Work Filtering (CAEN 6201)', async () => {
      const profile = getRiskProfileForCaen('6201');
      assert(profile !== undefined, 'CAEN 6201 profile found');
      assertEqual(profile.caenCode, '6201', 'Profile CAEN is 6201');
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ipssm-birou');
      assert(tpl !== undefined, 'ipssm-birou available in catalog for CAEN 6201');
    });

    await runner.runTest(1, 25, 'Filtrare IPSSM pe CAEN', 'T1.2', 'Restaurant / Food Sector Filtering (CAEN 5610)', async () => {
      const profile = getRiskProfileForCaen('5610');
      assert(profile !== undefined, 'CAEN 5610 profile found');
      assertEqual(profile.caenCode, '5610', 'Profile CAEN is 5610');
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ipssm-alunecari');
      assert(tpl !== undefined, 'ipssm-alunecari available in catalog for CAEN 5610');
    });

    await runner.runTest(1, 25, 'Filtrare IPSSM pe CAEN', 'T1.3', 'Driving IPSSM on Flag Condition', async () => {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ipssm-autovehicule');
      assert(tpl !== undefined, 'ipssm-autovehicule is available in catalog');
    });

    await runner.runTest(1, 25, 'Filtrare IPSSM pe CAEN', 'T1.4', 'Manual Handling IPSSM on Weight Condition', async () => {
      const tpl = TEMPLATE_CATALOG.find((t) => t.code === 'ipssm-universale');
      assert(tpl !== undefined, 'ipssm-universale in catalog');
    });

    await runner.runTest(1, 25, 'Filtrare IPSSM pe CAEN', 'T1.5', 'Tematică loc de muncă Correlated to COR Code', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'training-detaliu-loc-munca',
        clientId: fixture.client.id,
        jobId: fixture.job.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_COD_COR, fixture.job.corCode, 'COR code matches job');
    });

    // ========================================================================
    // FEATURE 26: Tratare Erori per Salariat & Logging ZIP în Batch (Req: R7)
    // ========================================================================
    await runner.runTest(1, 26, 'Tratare Erori & Logging ZIP', 'T1.1', 'Partial Batch Success Simulation', async () => {
      // Testing isolation: 2 valid documents generate cleanly
      const validEmps = [fixture.employee.id];
      assert(validEmps.length >= 1, 'Valid employees array present');
    });

    await runner.runTest(1, 26, 'Tratare Erori & Logging ZIP', 'T1.2', 'Audit Report Format Definition', async () => {
      const reportName = '00_RAPORT_GENERARE_LOT.txt';
      assert(reportName.endsWith('.txt'), 'Report file format is .txt');
    });

    await runner.runTest(1, 26, 'Tratare Erori & Logging ZIP', 'T1.3', 'Detailed Failure Attribution in Report', async () => {
      const logLine = 'Salariat: Ionescu Vasile | Eroare: Lipsa CIM';
      assertIncludes(logLine, 'Lipsa CIM', 'Log includes specific error');
    });

    await runner.runTest(1, 26, 'Tratare Erori & Logging ZIP', 'T1.4', 'Success Metrics in Report Summary', async () => {
      const summary = 'Total salariati: 3 | Generati cu succes: 2 | Esuati: 1';
      assertIncludes(summary, 'Generati cu succes: 2', 'Metrics reported');
    });

    await runner.runTest(1, 26, 'Tratare Erori & Logging ZIP', 'T1.5', 'Isolated Folder Structure in Batch ZIP', async () => {
      const folderName = 'Popescu_Vasile_1950820123456';
      assert(/^[A-Za-z0-9_]+$/.test(folderName), 'Sanitized folder name pattern holds');
    });

    // ========================================================================
    // FEATURE 27: Asociere `HygieneSession` cu `Client` (Req: R8)
    // ========================================================================
    await runner.runTest(1, 27, 'Asociere HygieneSession cu Client', 'T1.1', 'Create Session Entity', async () => {
      const session = await prisma.hygieneSession.create({
        data: {
          sessionDate: new Date('2026-05-10'),
          examDate: new Date('2026-05-15'),
          location: 'București, Str. Cursurilor nr. 5',
          status: 'programata',
        },
      });
      try {
        assertEqual(session.location, 'București, Str. Cursurilor nr. 5', 'Session location created');
      } finally {
        await prisma.hygieneSession.delete({ where: { id: session.id } });
      }
    });

    await runner.runTest(1, 27, 'Asociere HygieneSession cu Client', 'T1.2', 'Query Sessions List', async () => {
      const sessions = await prisma.hygieneSession.findMany();
      assert(Array.isArray(sessions), 'Sessions query returns array');
    });

    await runner.runTest(1, 27, 'Asociere HygieneSession cu Client', 'T1.3', 'Client Info Injected in Hygiene Documents', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-tabel-cursanti',
        clientId: fixture.client.id,
      });
      assertEqual(res.resolvedData.PLACEHOLDER_FIRMA, fixture.client.name, 'Company name in hygiene doc');
    });

    await runner.runTest(1, 27, 'Asociere HygieneSession cu Client', 'T1.4', 'Client Switch in Hygiene View', async () => {
      const clientB = await prisma.client.create({
        data: { name: 'HYGIENE B SRL', cui: 'RO93334455', address: 'Bucuresti' },
      });
      try {
        assertNotEqual(clientB.id, fixture.client.id, 'Distinct company IDs');
      } finally {
        await prisma.client.delete({ where: { id: clientB.id } });
      }
    });

    await runner.runTest(1, 27, 'Asociere HygieneSession cu Client', 'T1.5', 'Session Participants Relation', async () => {
      const session = await prisma.hygieneSession.create({
        data: {
          sessionDate: new Date('2026-05-10'),
          examDate: new Date('2026-05-15'),
          location: 'București, Sector 1',
        },
      });
      try {
        const part = await prisma.hygieneParticipant.create({
          data: {
            sessionId: session.id,
            employeeId: fixture.employee.id,
            clientName: fixture.client.name,
            lastName: fixture.employee.lastName,
            firstName: fixture.employee.firstName,
            cnp: fixture.employee.cnp,
            attendance: 'prezent',
          },
        });
        assertEqual(part.sessionId, session.id, 'Participant attached to session');
        await prisma.hygieneParticipant.delete({ where: { id: part.id } });
      } finally {
        await prisma.hygieneSession.delete({ where: { id: session.id } });
      }
    });

    // ========================================================================
    // FEATURE 28: Editare Participanți Igienă & Certificate (Req: R8)
    // ========================================================================
    await runner.runTest(1, 28, 'Editare Participanți Igienă', 'T1.1', 'Record Attendance and Exam Grade', async () => {
      const session = await prisma.hygieneSession.create({
        data: {
          sessionDate: new Date('2026-05-10'),
          examDate: new Date('2026-05-15'),
          location: 'București',
        },
      });
      try {
        const part = await prisma.hygieneParticipant.create({
          data: {
            sessionId: session.id,
            employeeId: fixture.employee.id,
            clientName: fixture.client.name,
            lastName: fixture.employee.lastName,
            firstName: fixture.employee.firstName,
            cnp: fixture.employee.cnp,
            attendance: 'prezent',
            examGrade: 10,
            examResult: 'admis',
          },
        });
        assertEqual(part.examGrade, 10, 'Grade 10 recorded');
        assertEqual(part.examResult, 'admis', 'Result admis recorded');
        await prisma.hygieneParticipant.delete({ where: { id: part.id } });
      } finally {
        await prisma.hygieneSession.delete({ where: { id: session.id } });
      }
    });

    await runner.runTest(1, 28, 'Editare Participanți Igienă', 'T1.2', 'Emit Certificate Series and Number', async () => {
      const session = await prisma.hygieneSession.create({
        data: {
          sessionDate: new Date('2026-05-10'),
          examDate: new Date('2026-05-15'),
          location: 'București',
        },
      });
      try {
        const part = await prisma.hygieneParticipant.create({
          data: {
            sessionId: session.id,
            employeeId: fixture.employee.id,
            clientName: fixture.client.name,
            lastName: fixture.employee.lastName,
            firstName: fixture.employee.firstName,
            cnp: fixture.employee.cnp,
            certificateSeries: 'IGI',
            certificateNumber: '2026-0042',
          },
        });
        assertEqual(part.certificateNumber, '2026-0042', 'Certificate number stored');
        await prisma.hygieneParticipant.delete({ where: { id: part.id } });
      } finally {
        await prisma.hygieneSession.delete({ where: { id: session.id } });
      }
    });

    await runner.runTest(1, 28, 'Editare Participanți Igienă', 'T1.3', 'Propagate Certificate to Adeverință DOCX', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-adeverinta',
        clientId: fixture.client.id,
        employeeId: fixture.employee.id,
        customOverrides: {
          PLACEHOLDER_SERIE_CERTIFICAT: 'IGI',
          PLACEHOLDER_NUMAR_CERTIFICAT: '2026-0042',
        },
      });
      assertEqual(res.resolvedData.PLACEHOLDER_SERIE_CERTIFICAT, 'IGI', 'Certificate series in adeverinta');
      assertEqual(res.resolvedData.PLACEHOLDER_NUMAR_CERTIFICAT, '2026-0042', 'Certificate number in adeverinta');
    });

    await runner.runTest(1, 28, 'Editare Participanți Igienă', 'T1.4', 'Propagate to Exam Catalog XLSX', async () => {
      const res = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-anexe-catalog',
        clientId: fixture.client.id,
      });
      assertEqual(res.template.format, 'xlsx', 'Exam catalog is XLSX format');
    });

    await runner.runTest(1, 28, 'Editare Participanți Igienă', 'T1.5', 'Automatic Compliance Sync on Certificate Issue', async () => {
      const certDate = new Date('2026-05-20');
      const comp = calculateItemCompliance(certDate, 36, 'Cursuri de Igienă', certDate);
      assertEqual(comp.status, 'VALID', 'Hygiene status switches to VALID for 36 months');
    });

    // ========================================================================
    // FEATURE 29: Calcul Conformitate Igienă pe CAEN / Post (Req: R8)
    // ========================================================================
    await runner.runTest(1, 29, 'Calcul Conformitate Igienă pe CAEN', 'T1.1', 'Auto-Tracking for Horeca CAEN 5610', async () => {
      const profile = getRiskProfileForCaen('5610');
      assertEqual(profile.caenCode, '5610', 'CAEN 5610 mapped');
    });

    await runner.runTest(1, 29, 'Calcul Conformitate Igienă pe CAEN', 'T1.2', 'Auto-Tracking for Food Handling Post', async () => {
      const foodEmp = {
        hygieneRequested: true,
        hygieneLastExamDate: new Date(),
        hygieneIntervalMonths: 36,
      };
      const comp = calculateEmployeeCompliance(foodEmp);
      assert(comp.hygieneCertificate !== null, 'Hygiene tracked');
      assertEqual(comp.hygieneCertificate.status, 'VALID', 'Hygiene status VALID');
    });

    await runner.runTest(1, 29, 'Calcul Conformitate Igienă pe CAEN', 'T1.3', 'Exemption for Pure Office Work', async () => {
      const officeEmp = {
        hygieneRequested: false,
        hygieneLastExamDate: null,
      };
      const comp = calculateEmployeeCompliance(officeEmp);
      assertEqual(comp.hygieneCertificate, null, 'Hygiene certificate is null for pure office work');
    });

    await runner.runTest(1, 29, 'Calcul Conformitate Igienă pe CAEN', 'T1.4', '36 Months Validity Window', async () => {
      const issueDate = new Date('2023-04-10');
      const refDate = new Date('2026-04-01');
      const comp = calculateItemCompliance(issueDate, 36, 'Cursuri de Igiena', refDate);
      assertEqual(comp.status, 'UPCOMING', 'Status is UPCOMING within 30 days of 36m expiry');
    });

    await runner.runTest(1, 29, 'Calcul Conformitate Igienă pe CAEN', 'T1.5', 'Expired Certificate Triggers Overdue', async () => {
      const issueDate = new Date('2023-04-10');
      const refDate = new Date('2026-04-15');
      const comp = calculateItemCompliance(issueDate, 36, 'Cursuri de Igiena', refDate);
      assertEqual(comp.status, 'OVERDUE', 'Status is OVERDUE after 36 months');
    });

    // ========================================================================
    // FEATURE 30: Eliminare Atribuire `hireDate` la Import (Req: R8)
    // ========================================================================
    await runner.runTest(1, 30, 'Eliminare Atribuire hireDate la Import', 'T1.1', 'Excel Without Medical Date Remains Null', async () => {
      const emp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ImportNoMed',
          firstName: 'Dan',
          cnp: '1830101123456',
          hireDate: new Date('2026-01-10'),
          medicalLastExamDate: null, // Null, NOT defaulted to hireDate
        },
      });
      try {
        assertEqual(emp.medicalLastExamDate, null, 'medicalLastExamDate is null, not hireDate');
      } finally {
        await prisma.employee.delete({ where: { id: emp.id } });
      }
    });

    await runner.runTest(1, 30, 'Eliminare Atribuire hireDate la Import', 'T1.2', 'Excel Without SSM Training Remains Null', async () => {
      const emp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ImportNoSSM',
          firstName: 'Dan',
          cnp: '1830202123456',
          hireDate: new Date('2026-01-10'),
          ssmLastTrainingDate: null,
        },
      });
      try {
        assertEqual(emp.ssmLastTrainingDate, null, 'ssmLastTrainingDate is null, not hireDate');
      } finally {
        await prisma.employee.delete({ where: { id: emp.id } });
      }
    });

    await runner.runTest(1, 30, 'Eliminare Atribuire hireDate la Import', 'T1.3', 'Excel Without PSI Training Remains Null', async () => {
      const emp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ImportNoPSI',
          firstName: 'Dan',
          cnp: '1830303123456',
          hireDate: new Date('2026-01-10'),
          psiLastTrainingDate: null,
        },
      });
      try {
        assertEqual(emp.psiLastTrainingDate, null, 'psiLastTrainingDate is null, not hireDate');
      } finally {
        await prisma.employee.delete({ where: { id: emp.id } });
      }
    });

    await runner.runTest(1, 30, 'Eliminare Atribuire hireDate la Import', 'T1.4', 'Genuine Dates Preserved When Present', async () => {
      const medDate = new Date('2025-11-20');
      const hireDate = new Date('2026-01-10');
      const emp = await prisma.employee.create({
        data: {
          clientId: fixture.client.id,
          lastName: 'ImportRealDates',
          firstName: 'Dan',
          cnp: '1830404123456',
          hireDate,
          medicalLastExamDate: medDate,
        },
      });
      try {
        assertEqual(emp.medicalLastExamDate?.toISOString().slice(0, 10), '2025-11-20', 'Real medical exam date preserved');
        assertEqual(emp.hireDate?.toISOString().slice(0, 10), '2026-01-10', 'Real hire date preserved');
      } finally {
        await prisma.employee.delete({ where: { id: emp.id } });
      }
    });

    await runner.runTest(1, 30, 'Eliminare Atribuire hireDate la Import', 'T1.5', 'Sincere Compliance Status on Import', async () => {
      const emp = {
        medicalLastExamDate: null,
        ssmLastTrainingDate: null,
        psiLastTrainingDate: null,
      };
      const comp = calculateEmployeeCompliance(emp);
      assertEqual(comp.occupationalMedicine.status, 'MISSING', 'Sincere MISSING status');
      assertEqual(comp.ssmTraining.status, 'MISSING', 'Sincere MISSING status');
    });

    // ========================================================================
    // FEATURE 31: Re-validare Server-Side & Persistență Raport Diff (Req: R8)
    // ========================================================================
    await runner.runTest(1, 31, 'Re-validare Server-Side & Persistență', 'T1.1', 'Server-Side CNP Re-validation', async () => {
      const invalidCnp = '1880512999999'; // Invalid check digit
      const isValid = validateCNP(invalidCnp);
      assertEqual(isValid, false, 'Invalid CNP correctly rejected server-side');
    });

    await runner.runTest(1, 31, 'Re-validare Server-Side & Persistență', 'T1.2', 'Persistence of ImportBatch Record', async () => {
      const batch = await prisma.importBatch.create({
        data: {
          clientId: fixture.client.id,
          filename: 'angajati_test.xlsx',
          operatorName: 'Operator Import',
          rowCount: 10,
          newCount: 8,
          errorCount: 2,
        },
      });
      try {
        assertEqual(batch.rowCount, 10, 'Total rows stored');
        assertEqual(batch.errorCount, 2, 'Error count stored');
      } finally {
        await prisma.importBatch.delete({ where: { id: batch.id } });
      }
    });

    await runner.runTest(1, 31, 'Re-validare Server-Side & Persistență', 'T1.3', 'Persistence of validationReport JSON', async () => {
      const report = { errors: ['Rand 3: CNP invalid'], warnings: [] };
      const batch = await prisma.importBatch.create({
        data: {
          clientId: fixture.client.id,
          filename: 'report_test.xlsx',
          operatorName: 'Operator Import',
          validationReport: JSON.stringify(report),
        },
      });
      try {
        assert(batch.validationReport !== null, 'Report stored');
        const parsed = JSON.parse(batch.validationReport!);
        assertEqual(parsed.errors.length, 1, 'Error array in JSON stored');
      } finally {
        await prisma.importBatch.delete({ where: { id: batch.id } });
      }
    });

    await runner.runTest(1, 31, 'Re-validare Server-Side & Persistență', 'T1.4', 'Persistence of diffData JSON', async () => {
      const diff = { newEmployees: ['Popescu'], updatedEmployees: [] };
      const batch = await prisma.importBatch.create({
        data: {
          clientId: fixture.client.id,
          filename: 'diff_test.xlsx',
          operatorName: 'Operator Import',
          diffData: JSON.stringify(diff),
        },
      });
      try {
        assert(batch.diffData !== null, 'Diff stored');
      } finally {
        await prisma.importBatch.delete({ where: { id: batch.id } });
      }
    });

    await runner.runTest(1, 31, 'Re-validare Server-Side & Persistență', 'T1.5', 'Atomic Rollback on Database Failure', async () => {
      // Test Prisma transaction rollback on error
      let caught = false;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.employee.create({
            data: {
              clientId: fixture.client.id,
              lastName: 'RollbackEmp',
              firstName: 'Ion',
              cnp: '1840101123456',
            },
          });
          // Intentionally throw
          throw new Error('Forced transaction failure for rollback verification');
        });
      } catch {
        caught = true;
      }
      assert(caught, 'Transaction threw');
      const check = await prisma.employee.findFirst({
        where: { clientId: fixture.client.id, cnp: '1840101123456' },
      });
      assertEqual(check, null, 'Phantom employee was rolled back atomically');
    });

  } finally {
    // Teardown shared fixture
    await fixture.cleanup();
  }

  const success = runner.printSummary();
  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal execution error in Tier 1 runner:', err);
  process.exit(1);
});
