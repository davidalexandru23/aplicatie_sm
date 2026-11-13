/**
 * ============================================================================
 * ADVERSARIAL CHALLENGER 2: MILESTONE 1 (M1) EMPIRICAL VERIFICATION HARNESS
 * ============================================================================
 * Focus:
 * 1. Empirically verify `isAutocompleted` and Mock Elimination (Features 1 & 2)
 * 2. Empirically test `approved_for_print` gating (Feature 3)
 * 3. Empirically verify context fallback elimination (Feature 6)
 * 4. Empirically verify XML character escaping (Feature 5) & manual fields un-truncation (Feature 4)
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { resolveTemplatePlaceholders, resolveTemplateData } from '../src/lib/templates/resolver';
import { generateDocument, escapeXml, isBlankOrPlaceholderMarker, STATUTORY_MANDATORY_FIELDS } from '../src/lib/templates/generator';

interface TestAssertionResult {
  suite: string;
  testName: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestAssertionResult[] = [];

function assert(condition: boolean, suite: string, testName: string, details?: string) {
  if (condition) {
    results.push({ suite, testName, passed: true, details });
    console.log(`  ✓ PASS: [${suite}] ${testName}${details ? ` (${details})` : ''}`);
  } else {
    results.push({ suite, testName, passed: false, details, error: 'Assertion failed' });
    console.error(`  ✗ FAIL: [${suite}] ${testName}${details ? ` (${details})` : ''}`);
  }
}

const MOCK_STRINGS_TO_FORBID = [
  'Munteanu Cristian',
  'CLIENT TEST S.R.L.',
  'S.C. CLIENT TEST S.R.L.',
  'RO12345678',
  'RX 123456',
  '15.03.1988',
  '0I(Rh+)',
  '42/L/9',
  'J40/1000/2021',
  '1880315410127',
];

async function runAllAdversarialTests() {
  console.log('======================================================================');
  console.log('STARTING EMPIRICAL ADVERSARIAL CHALLENGE SUITE FOR MILESTONE 1');
  console.log('======================================================================\n');

  const createdDocIds: string[] = [];
  let tempClientId: string | null = null;
  let tempEmployeeId: string | null = null;
  let tempJob1Id: string | null = null;
  let tempJob2Id: string | null = null;
  let tempWorksite1Id: string | null = null;
  let tempWorksite2Id: string | null = null;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Create completely sparse / empty client and sparse employee
    // ------------------------------------------------------------------------
    console.log('--- Setting up isolated sparse test entities in DB ---');
    const tempClient = await prisma.client.create({
      data: {
        name: 'SPARSE ADVERSARIAL TEST S.R.L.',
        cui: 'RO99999999',
        regCom: '',
        address: '',
        legalRepresentative: '',
        contactPhone: '',
        contactEmail: '',
        caenCode: '6201',
        caenActivity: 'Software',
        foundedYear: null,
        decisionsDate: null,
        designatedWorkerSsm: null,
        firstAidResponder: null,
        psiResponder: null,
        investigationMembers: null,
        ssmProviderName: null,
        ssmSpecialistName: null,
        ssmSpecialistCert: null,
        providerId: null,
        specialistId: null,
      },
    });
    tempClientId = tempClient.id;

    // Create 2 jobs for this client
    const job1 = await prisma.job.create({
      data: {
        clientId: tempClientId,
        title: 'Tester Automatizare Primar',
        corCode: '251201',
        mainActivities: 'Testare software',
      },
    });
    tempJob1Id = job1.id;

    const job2 = await prisma.job.create({
      data: {
        clientId: tempClientId,
        title: 'Inginer Securitate Secundar',
        corCode: '251202',
        mainActivities: 'Audit securitate',
      },
    });
    tempJob2Id = job2.id;

    // Create 2 worksites
    const ws1 = await prisma.worksite.create({
      data: {
        clientId: tempClientId,
        name: 'Punct de Lucru Nord Alpha',
        address: 'Bucuresti, Sos. Nordului 10',
      },
    });
    tempWorksite1Id = ws1.id;

    const ws2 = await prisma.worksite.create({
      data: {
        clientId: tempClientId,
        name: 'Punct de Lucru Sud Beta',
        address: 'Bucuresti, Sos. Oltenitei 20',
      },
    });
    tempWorksite2Id = ws2.id;

    // Create a sparse employee (missing CIM, salary, identity document, address, sizes, etc.)
    const tempEmployee = await prisma.employee.create({
      data: {
        client: { connect: { id: tempClientId } },
        firstName: 'Testprenume',
        lastName: 'Testnume',
        cnp: '1990101410011',
        sex: 'M',
        hireDate: new Date('2026-02-01'),
        currentJob: { connect: { id: tempJob1Id } },
        currentWorksite: { connect: { id: tempWorksite1Id } },
        cimNumber: null,
        cimDate: null,
        grossSalary: null,
        bankIban: null,
        bankName: null,
        bloodType: null,
        rhFactor: null,
        qualification: null,
        commuteRoute: null,
        commuteDurationMinutes: null,
        shoeSize: null,
        clothingSize: null,
        gloveSize: null,
        birthDate: null,
        birthPlace: null,
        birthCounty: null,
      },
    });
    tempEmployeeId = tempEmployee.id;

    // ========================================================================
    // SUITE 1: isAutocompleted and Mock Elimination (Features 1 & 2)
    // ========================================================================
    console.log('\n--- SUITE 1: isAutocompleted and Mock Elimination (Features 1 & 2) ---');

    // 1.1 Test calling resolveTemplatePlaceholders with empty/sparse context (no employeeId)
    // for all 31 templates in TEMPLATE_CATALOG
    for (const t of TEMPLATE_CATALOG) {
      const res = await resolveTemplatePlaceholders({
        templateCode: t.code,
        clientId: tempClientId,
        // omitting employeeId, jobId, worksiteId
      });

      // Assert NO mock strings appear in resolvedData or fields
      const jsonStr = JSON.stringify(res.resolvedData);
      for (const mockStr of MOCK_STRINGS_TO_FORBID) {
        assert(
          !jsonStr.includes(mockStr),
          'Suite 1.1 Mock Elimination',
          `Template ${t.code} does not contain mock string "${mockStr}"`,
          `Checked in resolvedData`
        );
      }

      // Assert that when employeeId is omitted, employee fields are not autocompleted
      const empNameField = res.fields.find((f) => f.key === 'PLACEHOLDER_NUME_COMPLET');
      if (empNameField) {
        assert(
          empNameField.isAutocompleted === false,
          'Suite 1.1 isAutocompleted',
          `Template ${t.code} employee name isAutocompleted is false when no employee provided`,
          `isAutocompleted=${empNameField.isAutocompleted}`
        );
        assert(
          empNameField.value === '',
          'Suite 1.1 Empty Fields',
          `Template ${t.code} employee name value is empty string`,
          `value="${empNameField.value}"`
        );
      }

      // Missing client fields like regCom, address, legal rep must be isAutocompleted: false and empty
      const legalRepField = res.fields.find((f) => f.key === 'PLACEHOLDER_REPREZENTANT_LEGAL');
      if (legalRepField) {
        assert(
          legalRepField.isAutocompleted === false,
          'Suite 1.1 Sparse Client',
          `Template ${t.code} legal rep isAutocompleted is false for sparse client`,
          `isAutocompleted=${legalRepField.isAutocompleted}`
        );
        assert(
          legalRepField.value === '',
          'Suite 1.1 Sparse Client',
          `Template ${t.code} legal rep value is empty string`,
          `value="${legalRepField.value}"`
        );
      }
    }

    // 1.2 Test calling with sparse employee (lacking CIM, salary, identityDoc, address)
    const sparseEmpTemplates = [
      'hr-cim-model-cadru-2022',
      'hr-cim-2026',
      'hr-anexa-fisa-post',
      'ssm-fisa-instruire-individuala',
      'eip-fisa-acordare-individuala',
      'med-fisa-solicitare-examen',
    ];

    for (const code of sparseEmpTemplates) {
      const res = await resolveTemplatePlaceholders({
        templateCode: code,
        clientId: tempClientId,
        employeeId: tempEmployeeId,
      });

      // Employee name and CNP ARE in DB, so they must be isAutocompleted: true
      const nameField = res.fields.find((f) => f.key === 'PLACEHOLDER_NUME_COMPLET');
      if (nameField) {
        assert(
          nameField.isAutocompleted === true && nameField.value === 'Testnume Testprenume',
          'Suite 1.2 Authentic Fields',
          `Template ${code}: authentic name has isAutocompleted=true`,
          `val=${nameField.value}`
        );
      }

      const cnpField = res.fields.find((f) => f.key === 'PLACEHOLDER_CNP');
      if (cnpField) {
        assert(
          cnpField.isAutocompleted === true && cnpField.value === '1990101410011',
          'Suite 1.2 Authentic Fields',
          `Template ${code}: authentic CNP has isAutocompleted=true`,
          `val=${cnpField.value}`
        );
      }

      // Fields missing in DB must have isAutocompleted === false and value === ""
      const cimField = res.fields.find((f) => f.key === 'PLACEHOLDER_NUMAR_CIM');
      if (cimField) {
        assert(
          cimField.isAutocompleted === false && cimField.value === '',
          'Suite 1.2 Missing Fields',
          `Template ${code}: missing CIM has isAutocompleted=false and empty value`,
          `isAutocompleted=${cimField.isAutocompleted}, val="${cimField.value}"`
        );
      }

      const salField = res.fields.find((f) => f.key === 'PLACEHOLDER_SALARIU_BRUT');
      if (salField) {
        assert(
          salField.isAutocompleted === false && salField.value === '',
          'Suite 1.2 Missing Fields',
          `Template ${code}: missing salary has isAutocompleted=false and empty value`,
          `isAutocompleted=${salField.isAutocompleted}, val="${salField.value}"`
        );
      }

      const idDocField = res.fields.find((f) => f.key === 'PLACEHOLDER_SERIE_ACT' || f.key === 'PLACEHOLDER_NUMAR_ACT');
      if (idDocField) {
        assert(
          idDocField.isAutocompleted === false && idDocField.value === '',
          'Suite 1.2 Missing Fields',
          `Template ${code}: missing identity doc field (${idDocField.key}) has isAutocompleted=false and empty value`,
          `isAutocompleted=${idDocField.isAutocompleted}, val="${idDocField.value}"`
        );
      }

      const addrField = res.fields.find((f) => f.key === 'PLACEHOLDER_ADRESA_DOMICILIU');
      if (addrField) {
        assert(
          addrField.isAutocompleted === false && addrField.value === '',
          'Suite 1.2 Missing Fields',
          `Template ${code}: missing residence address has isAutocompleted=false and empty value`,
          `isAutocompleted=${addrField.isAutocompleted}, val="${addrField.value}"`
        );
      }

      const bloodField = res.fields.find((f) => f.key === 'PLACEHOLDER_GRUPA_SANGUINA');
      if (bloodField) {
        assert(
          bloodField.isAutocompleted === false && bloodField.value === '',
          'Suite 1.2 Missing Fields',
          `Template ${code}: missing blood type has isAutocompleted=false and empty value`,
          `isAutocompleted=${bloodField.isAutocompleted}, val="${bloodField.value}"`
        );
      }

      const shoeField = res.fields.find((f) => f.key === 'PLACEHOLDER_MARIME_INCALTAMINTE');
      if (shoeField) {
        assert(
          shoeField.isAutocompleted === false && shoeField.value === '',
          'Suite 1.2 Missing Fields',
          `Template ${code}: missing shoe size has isAutocompleted=false and empty value`,
          `isAutocompleted=${shoeField.isAutocompleted}, val="${shoeField.value}"`
        );
      }
    }

    // ========================================================================
    // SUITE 2: approved_for_print Gating (Feature 3)
    // ========================================================================
    console.log('\n--- SUITE 2: approved_for_print Gating (Feature 3) ---');

    // 2.1 Test hr-cim-model-cadru-2022 with missing or dot-marker statutory fields
    const statutoryTestCases = [
      {
        name: 'CIM 2022 with empty string CIM number',
        templateCode: 'hr-cim-model-cadru-2022',
        dataOverrides: { PLACEHOLDER_NUMAR_CIM: '' },
      },
      {
        name: 'CIM 2022 with dot marker CIM number',
        templateCode: 'hr-cim-model-cadru-2022',
        dataOverrides: { PLACEHOLDER_NUMAR_CIM: '........ / ............' },
      },
      {
        name: 'CIM 2022 with empty salary',
        templateCode: 'hr-cim-model-cadru-2022',
        dataOverrides: { PLACEHOLDER_SALARIU_BRUT: '' },
      },
      {
        name: 'CIM 2022 with dot marker salary',
        templateCode: 'hr-cim-model-cadru-2022',
        dataOverrides: { PLACEHOLDER_SALARIU_BRUT: '........................ lei' },
      },
      {
        name: 'CIM 2022 with missing CNP',
        templateCode: 'hr-cim-model-cadru-2022',
        dataOverrides: { PLACEHOLDER_CNP: '' },
      },
      {
        name: 'CIM 2022 with [LIPSĂ DATE] marker in CNP',
        templateCode: 'hr-cim-model-cadru-2022',
        dataOverrides: { PLACEHOLDER_CNP: '[LIPSĂ DATE]' },
      },
      {
        name: 'CIM 2026 with whitespace salary',
        templateCode: 'hr-cim-2026',
        dataOverrides: { PLACEHOLDER_SALARIU_BRUT: '     ' },
      },
      {
        name: 'CIM 2026 with dot marker CIM number',
        templateCode: 'hr-cim-2026',
        dataOverrides: { PLACEHOLDER_NUMAR_CIM: '... / ......' },
      },
      {
        name: 'Anexa Fisa Post with empty CIM number',
        templateCode: 'hr-anexa-fisa-post',
        dataOverrides: { PLACEHOLDER_NUMAR_CIM: '' },
      },
      {
        name: 'Anexa Fisa Post with raw placeholder marker',
        templateCode: 'hr-anexa-fisa-post',
        dataOverrides: { PLACEHOLDER_NUMAR_CIM: 'PLACEHOLDER_NUMAR_CIM' },
      },
      {
        name: 'Fisa Instruire SSM with empty CNP',
        templateCode: 'ssm-fisa-instruire-individuala',
        dataOverrides: { PLACEHOLDER_CNP: '' },
      },
      {
        name: 'Fisa Instructaj PSI with dash marker CNP',
        templateCode: 'psi-fisa-instructaj-individuala',
        dataOverrides: { PLACEHOLDER_CNP: '---' },
      },
    ];

    for (const tc of statutoryTestCases) {
      // Base data from resolver
      const resolved = await resolveTemplatePlaceholders({
        templateCode: tc.templateCode,
        clientId: tempClientId,
        employeeId: tempEmployeeId,
      });

      const mergedData: Record<string, unknown> = {
        ...resolved.resolvedData,
        PLACEHOLDER_FIRMA: 'Firma Valida S.R.L.',
        PLACEHOLDER_CUI: 'RO12345678',
        PLACEHOLDER_REPREZENTANT_LEGAL: 'Admin Valid',
        PLACEHOLDER_NUME_COMPLET: 'Salariat Valid',
        PLACEHOLDER_CNP: '1900101410011',
        PLACEHOLDER_FUNCTIE: 'Programator',
        PLACEHOLDER_DATA_INCEPERE: '01.02.2026',
        PLACEHOLDER_NUMAR_CIM: '100/2026',
        PLACEHOLDER_SALARIU_BRUT: '7000 lei',
        ...tc.dataOverrides,
      };

      const genRes = await generateDocument({
        templateCode: tc.templateCode,
        clientId: tempClientId,
        employeeId: tempEmployeeId,
        data: mergedData,
        operatorName: 'Adversarial Challenger',
      });
      createdDocIds.push(genRes.documentId);

      assert(
        genRes.status === 'missing_data',
        'Suite 2 approved_for_print Gating',
        `${tc.name} MUST have status: 'missing_data'`,
        `Actual status: "${genRes.status}", missingFields: [${genRes.missingFields.join(', ')}]`
      );

      assert(
        genRes.missingFields.length > 0,
        'Suite 2 approved_for_print Gating',
        `${tc.name} must list at least 1 missing field`,
        `Count: ${genRes.missingFields.length}`
      );
    }

    // 2.2 Test that when ALL statutory and template required fields ARE legitimately provided
    // on a complete client/employee profile, approved_for_print IS granted
    const completeClient = await prisma.client.findFirst({
      where: { name: 'NEXUS SOLUTIONS S.R.L.' },
      include: {
        employees: {
          where: { cimNumber: { not: null }, grossSalary: { not: null } },
          include: {
            identityDocument: true,
            residenceAddress: true,
            currentJob: true,
            currentWorksite: true,
          },
        },
        jobs: true,
        worksites: true,
      },
    });

    if (completeClient && completeClient.employees.length > 0) {
      const completeEmp = completeClient.employees[0];
      const resolvedComplete = await resolveTemplatePlaceholders({
        templateCode: 'hr-cim-2026',
        clientId: completeClient.id,
        employeeId: completeEmp.id,
        jobId: completeEmp.currentJobId || undefined,
        worksiteId: completeEmp.currentWorksiteId || undefined,
        allowOfflineBlank: true,
      });

      const validFullCimRes = await generateDocument({
        templateCode: 'hr-cim-2026',
        clientId: completeClient.id,
        employeeId: completeEmp.id,
        jobId: completeEmp.currentJobId || undefined,
        worksiteId: completeEmp.currentWorksiteId || undefined,
        data: resolvedComplete.resolvedData,
        operatorName: 'Adversarial Challenger',
      });
      createdDocIds.push(validFullCimRes.documentId);

      assert(
        validFullCimRes.status === 'approved_for_print',
        'Suite 2 approved_for_print Legitimate Case',
        'CIM 2026 with authentic complete profile receives approved_for_print',
        `status: "${validFullCimRes.status}", missing: [${validFullCimRes.missingFields.join(', ')}]`
      );
    }

    // ========================================================================
    // SUITE 3: Context Fallback Elimination (Feature 6)
    // ========================================================================
    console.log('\n--- SUITE 3: Context Fallback Elimination (Feature 6) ---');

    // 3.1 Call resolver without employeeId on client with employees
    const noEmpRes = await resolveTemplatePlaceholders({
      templateCode: 'hr-cim-model-cadru-2022',
      clientId: tempClientId,
      // No employeeId passed
    });

    const empFieldVal = noEmpRes.resolvedData.PLACEHOLDER_NUME_COMPLET;
    const empCnpVal = noEmpRes.resolvedData.PLACEHOLDER_CNP;
    assert(
      empFieldVal === '' && empCnpVal === '',
      'Suite 3.1 Context Fallback',
      'Calling resolver without employeeId does NOT fallback to client.employees[0]',
      `name="${empFieldVal}", cnp="${empCnpVal}"`
    );

    // 3.2 Call resolver with explicit jobId DIFFERENT from employee's currentJob
    // employee.currentJobId is tempJob1Id ('Tester Automatizare Primar')
    // We explicitly pass tempJob2Id ('Inginer Securitate Secundar')
    const explicitJobRes = await resolveTemplatePlaceholders({
      templateCode: 'hr-anexa-fisa-post',
      clientId: tempClientId,
      employeeId: tempEmployeeId,
      jobId: tempJob2Id,
    });

    const jobTitleResolved = explicitJobRes.resolvedData.PLACEHOLDER_FUNCTIE;
    assert(
      jobTitleResolved === 'Inginer Securitate Secundar',
      'Suite 3.2 Context Fallback',
      'Explicit jobId takes precedence and is NOT overridden by employee.currentJob',
      `Resolved: "${jobTitleResolved}"`
    );

    // 3.3 Call resolver with explicit worksiteId DIFFERENT from employee's currentWorksite
    // employee.currentWorksiteId is tempWorksite1Id ('Punct de Lucru Nord Alpha')
    // We explicitly pass tempWorksite2Id ('Punct de Lucru Sud Beta')
    const explicitWorksiteRes = await resolveTemplatePlaceholders({
      templateCode: 'hr-cim-model-cadru-2022',
      clientId: tempClientId,
      employeeId: tempEmployeeId,
      worksiteId: tempWorksite2Id,
    });

    const wsNameResolved = explicitWorksiteRes.resolvedData.PLACEHOLDER_PUNCT_LUCRU;
    const wsAddrResolved = explicitWorksiteRes.resolvedData.PLACEHOLDER_ADRESA_PUNCT_LUCRU;
    assert(
      wsNameResolved === 'Punct de Lucru Sud Beta' && wsAddrResolved === 'Bucuresti, Sos. Oltenitei 20',
      'Suite 3.3 Context Fallback',
      'Explicit worksiteId takes precedence and is NOT overridden by employee.currentWorksite',
      `Name: "${wsNameResolved}", Addr: "${wsAddrResolved}"`
    );

    // 3.4 Call resolver without jobId and without employeeId
    const noJobRes = await resolveTemplatePlaceholders({
      templateCode: 'ipssm-birou',
      clientId: tempClientId,
    });
    const noJobFunctie = noJobRes.resolvedData.PLACEHOLDER_FUNCTIE;
    assert(
      noJobFunctie === '',
      'Suite 3.4 Context Fallback',
      'Calling resolver without jobId and without employeeId does NOT fallback to client.jobs[0]',
      `Resolved: "${noJobFunctie}"`
    );

    // 3.5 Call resolver without worksiteId and without employeeId
    const noWsRes = await resolveTemplatePlaceholders({
      templateCode: 'ipssm-birou',
      clientId: tempClientId,
    });
    const noWsPunctLucru = noWsRes.resolvedData.PLACEHOLDER_PUNCT_LUCRU;
    assert(
      noWsPunctLucru === '' || noWsPunctLucru === 'Sediu social',
      'Suite 3.5 Context Fallback',
      'Calling resolver without worksiteId and without employeeId does NOT fallback to client.worksites[0]',
      `Resolved: "${noWsPunctLucru}" (not "${ws1.name}")`
    );
    assert(
      noWsPunctLucru !== 'Punct de Lucru Nord Alpha',
      'Suite 3.5 Context Fallback',
      'Worksite did not silently pick worksite[0] name',
      `Actual: "${noWsPunctLucru}"`
    );

    // ========================================================================
    // SUITE 4: XML Escaping and Document Integrity (Feature 5)
    // ========================================================================
    console.log('\n--- SUITE 4: XML Escaping and Document Integrity (Feature 5) ---');

    // 4.1 Unit test escapeXml
    const unsafeString = 'A&B <C> "D" \'E\'';
    const escaped = escapeXml(unsafeString);
    assert(
      escaped === 'A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;',
      'Suite 4.1 XML Escaping Unit',
      'escapeXml replaces all 5 XML entities in safe order',
      escaped
    );

    // 4.2 Generate DOCX with malicious / special XML injection characters
    const xmlInjectionRes = await generateDocument({
      templateCode: 'decizii-angajator',
      clientId: tempClientId,
      data: {
        PLACEHOLDER_FIRMA: 'TEST & CO <DEVELOPMENT> "TECH" \'LTD\'',
        PLACEHOLDER_REPREZENTANT_LEGAL: 'Popescu & Asociații <Legal> "Avocați"',
        PLACEHOLDER_CUI: 'RO12345678',
      },
      operatorName: 'Adversarial Challenger',
    });
    createdDocIds.push(xmlInjectionRes.documentId);

    // Read the generated file and check OpenXML validity
    const fileBytes = fs.readFileSync(xmlInjectionRes.filePath);
    const zip = new PizZip(fileBytes);
    const docXml = zip.files['word/document.xml'].asText();

    assert(
      docXml.includes('TEST &amp; CO &lt;DEVELOPMENT&gt; &quot;TECH&quot; &apos;LTD&apos;'),
      'Suite 4.2 XML Escaping In-Vivo',
      'Generated DOCX word/document.xml contains fully escaped XML entities',
      'Escaped content verified'
    );

    assert(
      !docXml.includes('TEST & CO <DEVELOPMENT>'),
      'Suite 4.2 XML Escaping In-Vivo',
      'Generated DOCX word/document.xml contains NO unescaped XML injection entities',
      'No raw & or < in company name'
    );

    // ========================================================================
    // SUITE 5: UI Manual Fields Un-truncation Inspection (Feature 4)
    // ========================================================================
    console.log('\n--- SUITE 5: UI Manual Fields Un-truncation Inspection (Feature 4) ---');

    const generatePageContent = fs.readFileSync(
      path.join(process.cwd(), 'src/app/documents/generate/page.tsx'),
      'utf8'
    );

    assert(
      !generatePageContent.includes('.slice(0, 20)'),
      'Suite 5.1 Manual Fields Un-truncation',
      'generate/page.tsx has completely eliminated arbitrary .slice(0, 20) restriction',
      'Confirmed absence of .slice(0, 20)'
    );

    assert(
      generatePageContent.includes('manualFields.length') && generatePageContent.includes('manualFieldSearch'),
      'Suite 5.2 Manual Fields Usability',
      'generate/page.tsx provides full manual fields access with filtering/search',
      'Confirmed search and length rendering'
    );

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Delete generated documents and temporary test entities
    // ------------------------------------------------------------------------
    console.log('\n--- Cleaning up temporary adversarial test artifacts ---');
    if (createdDocIds.length > 0) {
      await prisma.generatedDocument.deleteMany({
        where: { id: { in: createdDocIds } },
      });
      console.log(`Deleted ${createdDocIds.length} generated test documents from DB`);
    }

    if (tempEmployeeId) {
      await prisma.employee.delete({ where: { id: tempEmployeeId } }).catch(() => {});
    }
    if (tempJob1Id) {
      await prisma.job.delete({ where: { id: tempJob1Id } }).catch(() => {});
    }
    if (tempJob2Id) {
      await prisma.job.delete({ where: { id: tempJob2Id } }).catch(() => {});
    }
    if (tempWorksite1Id) {
      await prisma.worksite.delete({ where: { id: tempWorksite1Id } }).catch(() => {});
    }
    if (tempWorksite2Id) {
      await prisma.worksite.delete({ where: { id: tempWorksite2Id } }).catch(() => {});
    }
    if (tempClientId) {
      await prisma.client.delete({ where: { id: tempClientId } }).catch(() => {});
    }
    console.log('Cleaned up sparse test client and child entities');
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n======================================================================');
  console.log('ADVERSARIAL CHALLENGE EXECUTION SUMMARY');
  console.log('======================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total assertions: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFAILURES RECORDED:');
    for (const f of results.filter((r) => !r.passed)) {
      console.error(`  - [${f.suite}] ${f.testName}: ${f.details || ''} (${f.error || ''})`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY WITH ZERO DEFECTS.');
    process.exit(0);
  }
}

runAllAdversarialTests().catch((err) => {
  console.error('Unhandled fatal error in adversarial suite:', err);
  process.exit(1);
});
