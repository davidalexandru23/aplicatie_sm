import fs from 'fs';
import path from 'path';
import assert from 'assert';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { resolveTemplateData, ROMANIAN_LEGAL_SSM_PROVIDER } from '../src/lib/templates/resolver';
import { renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

interface TestStats {
  passed: number;
  failed: number;
}

const stats: TestStats = { passed: 0, failed: 0 };

function check(desc: string, condition: boolean, extra?: string) {
  if (condition) {
    stats.passed++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    stats.failed++;
    console.error(`  ✗ [FAIL] ${desc}${extra ? ` — Details: ${extra}` : ''}`);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('ADVERSARIAL EMPIRICAL SUITE: CUSTOM PROVIDER TOKEN BINDING & ZERO-FALLBACK');
  console.log('========================================================================\n');

  const CUSTOM_PROVIDER_CUI = 'RO11223344';
  const CUSTOM_PROVIDER_NAME = 'TRANSILVANIA SAFETY CONSULTING S.R.L.';
  const CUSTOM_CLIENT_CUI = 'RO88776655';
  const CUSTOM_SPECIALIST_NAME = 'Ing. Vasile Mureșan';
  const CUSTOM_CERT_NUM = '9999/2026';
  const CUSTOM_SPEC_CERT = 'Certificat seria CJ nr. 9999/2026';
  const CUSTOM_AUTH_DETAILS = 'Certificat abilitare Serviciu Extern SSM nr. 9999/2026 din 10.02.2026 emis de Ministerul Muncii - ITM Cluj';

  let customProviderId: string | null = null;
  let customSpecialistId: string | null = null;
  let customClientId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // 0. Initial Cleanup Check (Guarantee idempotent state)
    // -------------------------------------------------------------------------
    console.log('--- 0. Pre-Test Hygiene ---');
    await prisma.client.deleteMany({ where: { cui: CUSTOM_CLIENT_CUI } });
    await prisma.ssmSpecialist.deleteMany({ where: { name: CUSTOM_SPECIALIST_NAME } });
    await prisma.ssmProvider.deleteMany({ where: { cui: CUSTOM_PROVIDER_CUI } });
    console.log('  ✓ Clean initial state guaranteed.\n');

    // -------------------------------------------------------------------------
    // 1. Create Temporary Custom Non-Default Provider & Specialist
    // -------------------------------------------------------------------------
    console.log('--- 1. Provisioning Custom Non-Default Provider (Cluj-Napoca) ---');
    const customProvider = await prisma.ssmProvider.create({
      data: {
        name: CUSTOM_PROVIDER_NAME,
        cui: CUSTOM_PROVIDER_CUI,
        regCom: 'J12/555/2021',
        address: 'Cluj-Napoca, Str. Observatorului nr. 15, jud. Cluj',
        street: 'Str. Observatorului',
        number: '15',
        building: 'B4',
        entrance: '2',
        floor: '3',
        apartment: '12',
        postalCode: '400363',
        locality: 'Cluj-Napoca',
        county: 'Cluj',
        phone: '0264.999.888',
        email: 'contact@transilvania-safety.ro',
        website: 'www.transilvania-safety.ro',
        authorizationNumber: CUSTOM_CERT_NUM,
        authorizationDate: new Date('2026-02-10T00:00:00.000Z'),
        authorizationDetails: CUSTOM_AUTH_DETAILS,
        legalRepresentative: CUSTOM_SPECIALIST_NAME,
        representativeRole: 'Director General',
        representativeDoc: 'Hotărârea AGA nr. 02/2021',
        isDefault: false, // Explicitly NOT default
        isActive: true,
      },
    });
    customProviderId = customProvider.id;

    check('Custom provider created with non-default flags', customProvider.id !== undefined && !customProvider.isDefault);
    check('Custom provider persisted with Cluj credentials', customProvider.locality === 'Cluj-Napoca' && customProvider.county === 'Cluj');

    const customSpecialist = await prisma.ssmSpecialist.create({
      data: {
        providerId: customProvider.id,
        name: CUSTOM_SPECIALIST_NAME,
        role: 'Specialist Principal SSM & Evaluator Riscuri',
        certificateNumber: CUSTOM_SPEC_CERT,
        qualification: 'Inginer Securitate în Muncă',
        phone: '0744.111.222',
        email: 'vasile.muresan@transilvania-safety.ro',
        isDefault: true,
        isActive: true,
      },
    });
    customSpecialistId = customSpecialist.id;

    check('Custom specialist created under custom provider', customSpecialist.providerId === customProvider.id);
    check('Custom specialist credentials verified', customSpecialist.certificateNumber === CUSTOM_SPEC_CERT);

    // Create Test Client linked to this custom provider
    const customClient = await prisma.client.create({
      data: {
        name: 'TRANSILVANIA TECH CLUJ S.R.L.',
        cui: CUSTOM_CLIENT_CUI,
        regCom: 'J12/1000/2023',
        address: 'Cluj-Napoca, Str. Republicii nr. 42, jud. Cluj',
        caenCode: '6201',
        caenActivity: 'Activități de realizare a software-ului la comandă',
        foundedYear: 2023,
        legalRepresentative: 'Prof. Dan Popescu',
        providerId: customProvider.id,
        specialistId: customSpecialist.id,
        ssmProviderName: customProvider.name,
        ssmSpecialistName: customSpecialist.name,
        ssmSpecialistCert: customSpecialist.certificateNumber,
        designatedWorkerSsm: 'Ing. Andrei Moga',
        firstAidResponder: 'Dr. Ioana Crisan',
        psiResponder: 'Tehnician Radu Banciu',
        investigationMembers: 'Ioan Rus, Maria Cicio',
        decisionsDate: new Date('2026-02-15T00:00:00.000Z'),
      },
      include: {
        provider: true,
        specialist: true,
      },
    });
    customClientId = customClient.id;

    check('Custom client linked relationally to custom provider', customClient.providerId === customProvider.id);
    check('Custom client linked relationally to custom specialist', customClient.specialistId === customSpecialist.id);
    console.log();

    // -------------------------------------------------------------------------
    // 2. Token Binding Assertions on 3 Target Templates
    //    - Plan de Prevenire TESA.docx (risk-plan-prevenire-tesa)
    //    - EVALUAREA RISCURILOR.docx (risk-evaluare)
    //    - DECIZII.docx (decizii-angajator)
    // -------------------------------------------------------------------------
    console.log('--- 2. Dynamic Token Binding on Target Templates ---');

    const targetTemplates = [
      { code: 'risk-plan-prevenire-tesa', filename: 'Plan de Prevenire TESA.docx' },
      { code: 'risk-evaluare', filename: 'EVALUAREA RISCURILOR.docx' },
      { code: 'decizii-angajator', filename: 'DECIZII.docx' },
    ];

    for (const t of targetTemplates) {
      console.log(`\n  Testing Template: ${t.filename} (${t.code})...`);

      const res = await resolveTemplateData(t.code, { client: customClient });
      check(`[${t.filename}] Resolver returned status 'ready'`, res.status === 'ready');
      check(`[${t.filename}] Zero unresolved required placeholders`, res.unresolvedPlaceholders.length === 0, JSON.stringify(res.unresolvedPlaceholders));

      const d = res.data;

      // 1. Provider Identity
      check(`[${t.filename}] PLACEHOLDER_PRESTATOR_SSM matches custom Cluj provider`, d.PLACEHOLDER_PRESTATOR_SSM === CUSTOM_PROVIDER_NAME, `Got: ${d.PLACEHOLDER_PRESTATOR_SSM}`);
      check(`[${t.filename}] PLACEHOLDER_PRESTATOR_SSM does NOT equal Bucharest fallback`, d.PLACEHOLDER_PRESTATOR_SSM !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM);

      check(`[${t.filename}] PLACEHOLDER_FURNIZOR_SSM matches custom Cluj provider`, d.PLACEHOLDER_FURNIZOR_SSM === CUSTOM_PROVIDER_NAME, `Got: ${d.PLACEHOLDER_FURNIZOR_SSM}`);
      check(`[${t.filename}] PLACEHOLDER_FURNIZOR_SSM does NOT equal Bucharest fallback`, d.PLACEHOLDER_FURNIZOR_SSM !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_FURNIZOR_SSM);

      // 2. CUI
      check(`[${t.filename}] PLACEHOLDER_CUI_PRESTATOR matches RO11223344`, d.PLACEHOLDER_CUI_PRESTATOR === CUSTOM_PROVIDER_CUI, `Got: ${d.PLACEHOLDER_CUI_PRESTATOR}`);
      check(`[${t.filename}] PLACEHOLDER_CUI_PRESTATOR does NOT equal Bucharest fallback (RO34567890)`, d.PLACEHOLDER_CUI_PRESTATOR !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CUI_PRESTATOR);

      // 3. ITM Certification
      check(`[${t.filename}] PLACEHOLDER_CERTIFICAT_FURNIZOR matches custom ITM Cluj text`, d.PLACEHOLDER_CERTIFICAT_FURNIZOR === CUSTOM_AUTH_DETAILS, `Got: ${d.PLACEHOLDER_CERTIFICAT_FURNIZOR}`);
      check(`[${t.filename}] PLACEHOLDER_CERTIFICAT_FURNIZOR does NOT equal Bucharest fallback`, d.PLACEHOLDER_CERTIFICAT_FURNIZOR !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_FURNIZOR);

      check(`[${t.filename}] PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR matches 9999/2026`, d.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR === CUSTOM_CERT_NUM, `Got: ${d.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR}`);
      check(`[${t.filename}] PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR does NOT equal Bucharest fallback (4812/2021)`, d.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR);

      // 4. Registry & Address
      check(`[${t.filename}] PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR matches J12/555/2021`, d.PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR === 'J12/555/2021');
      check(`[${t.filename}] PLACEHOLDER_LOCALITATE_FURNIZOR matches Cluj-Napoca`, d.PLACEHOLDER_LOCALITATE_FURNIZOR === 'Cluj-Napoca');
      check(`[${t.filename}] PLACEHOLDER_LOCALITATE_FURNIZOR does NOT equal București`, d.PLACEHOLDER_LOCALITATE_FURNIZOR !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_LOCALITATE_FURNIZOR);
      check(`[${t.filename}] PLACEHOLDER_JUDET_FURNIZOR matches Cluj`, d.PLACEHOLDER_JUDET_FURNIZOR === 'Cluj');
      check(`[${t.filename}] PLACEHOLDER_JUDET_FURNIZOR does NOT equal Sector 2`, d.PLACEHOLDER_JUDET_FURNIZOR !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_JUDET_FURNIZOR);
      check(`[${t.filename}] PLACEHOLDER_STRADA_FURNIZOR matches Str. Observatorului`, d.PLACEHOLDER_STRADA_FURNIZOR === 'Str. Observatorului');
      check(`[${t.filename}] PLACEHOLDER_NUMAR_FURNIZOR matches 15`, d.PLACEHOLDER_NUMAR_FURNIZOR === '15');
      check(`[${t.filename}] PLACEHOLDER_BLOC_FURNIZOR matches B4`, d.PLACEHOLDER_BLOC_FURNIZOR === 'B4');
      check(`[${t.filename}] PLACEHOLDER_SCARA_FURNIZOR matches 2`, d.PLACEHOLDER_SCARA_FURNIZOR === '2');
      check(`[${t.filename}] PLACEHOLDER_ETAJ_FURNIZOR matches 3`, d.PLACEHOLDER_ETAJ_FURNIZOR === '3');
      check(`[${t.filename}] PLACEHOLDER_APARTAMENT_FURNIZOR matches 12`, d.PLACEHOLDER_APARTAMENT_FURNIZOR === '12');
      check(`[${t.filename}] PLACEHOLDER_COD_POSTAL_FURNIZOR matches 400363`, d.PLACEHOLDER_COD_POSTAL_FURNIZOR === '400363');

      // 5. Contact info
      check(`[${t.filename}] PLACEHOLDER_TELEFON_PRESTATOR matches 0264.999.888`, d.PLACEHOLDER_TELEFON_PRESTATOR === '0264.999.888');
      check(`[${t.filename}] PLACEHOLDER_EMAIL_PRESTATOR matches contact@transilvania-safety.ro`, d.PLACEHOLDER_EMAIL_PRESTATOR === 'contact@transilvania-safety.ro');
      check(`[${t.filename}] PLACEHOLDER_SITE_PRESTATOR matches www.transilvania-safety.ro`, d.PLACEHOLDER_SITE_PRESTATOR === 'www.transilvania-safety.ro');

      // 6. Specialist & Evaluator
      const specStr = String(d.PLACEHOLDER_SPECIALIST_SSM);
      check(`[${t.filename}] PLACEHOLDER_SPECIALIST_SSM contains 'Ing. Vasile Mureșan'`, specStr.includes(CUSTOM_SPECIALIST_NAME), `Got: ${specStr}`);
      check(`[${t.filename}] PLACEHOLDER_SPECIALIST_SSM contains 'Certificat seria CJ nr. 9999/2026'`, specStr.includes(CUSTOM_SPEC_CERT), `Got: ${specStr}`);
      check(`[${t.filename}] PLACEHOLDER_SPECIALIST_SSM does NOT contain 'Mihai Popescu'`, !specStr.includes('Mihai Popescu'));

      const evalStr = String(d.PLACEHOLDER_EVALUATOR_RISC);
      check(`[${t.filename}] PLACEHOLDER_EVALUATOR_RISC contains 'Ing. Vasile Mureșan'`, evalStr.includes(CUSTOM_SPECIALIST_NAME), `Got: ${evalStr}`);
      check(`[${t.filename}] PLACEHOLDER_EVALUATOR_RISC does NOT contain 'Mihai Popescu'`, !evalStr.includes('Mihai Popescu'));

      check(`[${t.filename}] PLACEHOLDER_CERTIFICAT_EVALUATOR matches custom cert`, d.PLACEHOLDER_CERTIFICAT_EVALUATOR === CUSTOM_SPEC_CERT, `Got: ${d.PLACEHOLDER_CERTIFICAT_EVALUATOR}`);
      check(`[${t.filename}] PLACEHOLDER_CERTIFICAT_EVALUATOR does NOT equal Bucharest INCDPM fallback`, d.PLACEHOLDER_CERTIFICAT_EVALUATOR !== ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_CERTIFICAT_EVALUATOR);

      // 7. Legal Representative & Corporate Act
      check(`[${t.filename}] PLACEHOLDER_REPREZENTANT_PRESTATOR matches Ing. Vasile Mureșan`, d.PLACEHOLDER_REPREZENTANT_PRESTATOR === CUSTOM_SPECIALIST_NAME);
      check(`[${t.filename}] PLACEHOLDER_ACT_REPREZENTANT matches Hotărârea AGA nr. 02/2021`, d.PLACEHOLDER_ACT_REPREZENTANT === 'Hotărârea AGA nr. 02/2021');
    }

    // -------------------------------------------------------------------------
    // 3. Binary DOCX Rendering & Zero Placeholder Assertions
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Binary DOCX Rendering & Zero Placeholder Assertions ---');

    for (const t of targetTemplates) {
      console.log(`\n  Rendering DOCX: ${t.filename}...`);
      const res = await resolveTemplateData(t.code, { client: customClient });
      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.filename);
      const renderedBuffer = await renderTemplateBuffer(templatePath, 'docx', res.data, t.filename);

      check(`[${t.filename}] Rendered buffer generated (> 0 bytes)`, renderedBuffer.length > 0);

      // Inspect unresolved placeholders in output
      const unresolved = await collectUnresolvedPlaceholders(renderedBuffer, 'docx');
      check(`[${t.filename}] Zero raw PLACEHOLDER_* tokens in rendered DOCX`, unresolved.length === 0, `Unresolved: ${unresolved.join(', ')}`);

      // Inspect XML text directly from the rendered DOCX zip
      const zip = new PizZip(renderedBuffer);
      let fullXmlText = '';
      for (const [partPath, file] of Object.entries(zip.files)) {
        if (partPath.startsWith('word/') && (partPath.endsWith('.xml') || partPath.endsWith('.rels'))) {
          fullXmlText += ' ' + file.asText();
        }
      }

      // Assert custom credentials exist in rendered document
      if (t.filename === 'Plan de Prevenire TESA.docx') {
        check(`[${t.filename}] Custom provider name rendered in DOCX XML`, fullXmlText.includes(CUSTOM_PROVIDER_NAME));
        check(`[${t.filename}] Custom specialist name rendered in DOCX XML`, fullXmlText.includes(CUSTOM_SPECIALIST_NAME));
        check(`[${t.filename}] Fallback Bucharest provider ABSENT in DOCX XML`, !fullXmlText.includes(ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM));
        check(`[${t.filename}] Fallback specialist ABSENT in DOCX XML`, !fullXmlText.includes('Mihai Popescu'));
      } else if (t.filename === 'EVALUAREA RISCURILOR.docx') {
        check(`[${t.filename}] Custom provider name rendered in DOCX XML`, fullXmlText.includes(CUSTOM_PROVIDER_NAME));
        check(`[${t.filename}] Custom specialist cert rendered in DOCX XML`, fullXmlText.includes(CUSTOM_SPEC_CERT));
        check(`[${t.filename}] Custom provider email rendered in DOCX XML`, fullXmlText.includes('contact@transilvania-safety.ro'));
        check(`[${t.filename}] Fallback Bucharest provider ABSENT in DOCX XML`, !fullXmlText.includes(ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_PRESTATOR_SSM));
        check(`[${t.filename}] Fallback Bucharest email ABSENT in DOCX XML`, !fullXmlText.includes(ROMANIAN_LEGAL_SSM_PROVIDER.PLACEHOLDER_EMAIL_PRESTATOR));
      } else if (t.filename === 'DECIZII.docx') {
        check(`[${t.filename}] Custom specialist name rendered in DOCX XML`, fullXmlText.includes(CUSTOM_SPECIALIST_NAME));
        check(`[${t.filename}] Fallback Bucharest specialist ABSENT in DOCX XML`, !fullXmlText.includes('Mihai Popescu'));
      }
    }

    // -------------------------------------------------------------------------
    // 4. Adversarial Stress Test: Lazy / Unpopulated Relational Lookup
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Adversarial Stress Test: Lazy / Unpopulated Relational Lookup ---');
    console.log('  Testing client object with providerId & specialistId but NO populated relation objects...');

    const clientWithoutRelations = {
      ...customClient,
      provider: undefined,
      specialist: undefined,
    };

    const lazyRes = await resolveTemplateData('risk-plan-prevenire-tesa', { client: clientWithoutRelations });
    check('Self-healing async lookup retrieves custom provider name', lazyRes.data.PLACEHOLDER_PRESTATOR_SSM === CUSTOM_PROVIDER_NAME, `Got: ${lazyRes.data.PLACEHOLDER_PRESTATOR_SSM}`);
    check('Self-healing async lookup retrieves custom specialist name', String(lazyRes.data.PLACEHOLDER_SPECIALIST_SSM).includes(CUSTOM_SPECIALIST_NAME));
    check('Self-healing async lookup retrieves custom CUI', lazyRes.data.PLACEHOLDER_CUI_PRESTATOR === CUSTOM_PROVIDER_CUI);

    // -------------------------------------------------------------------------
    // 5. Adversarial Stress Test: Sparse / Null Sub-Addresses
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Adversarial Stress Test: Sparse Sub-Addresses (House / Null building) ---');
    
    // Update provider with null building, entrance, floor, apartment (individual house)
    await prisma.ssmProvider.update({
      where: { id: customProvider.id },
      data: {
        building: null,
        entrance: null,
        floor: null,
        apartment: null,
      },
    });

    // Re-fetch client with updated provider
    const clientWithSparseProvider = await prisma.client.findUnique({
      where: { id: customClient.id },
      include: { provider: true, specialist: true },
    });

    const sparseRes = await resolveTemplateData('risk-plan-prevenire-tesa', { client: clientWithSparseProvider });
    check('Null building gracefully defaults to \'-\'', sparseRes.data.PLACEHOLDER_BLOC_FURNIZOR === '-', `Got: ${sparseRes.data.PLACEHOLDER_BLOC_FURNIZOR}`);
    check('Null entrance gracefully defaults to \'-\'', sparseRes.data.PLACEHOLDER_SCARA_FURNIZOR === '-', `Got: ${sparseRes.data.PLACEHOLDER_SCARA_FURNIZOR}`);
    check('Null floor gracefully defaults to \'-\'', sparseRes.data.PLACEHOLDER_ETAJ_FURNIZOR === '-', `Got: ${sparseRes.data.PLACEHOLDER_ETAJ_FURNIZOR}`);
    check('Null apartment gracefully defaults to \'-\'', sparseRes.data.PLACEHOLDER_APARTAMENT_FURNIZOR === '-', `Got: ${sparseRes.data.PLACEHOLDER_APARTAMENT_FURNIZOR}`);
    check('Sparse provider does NOT revert to Bucharest building \'A1\'', sparseRes.data.PLACEHOLDER_BLOC_FURNIZOR !== 'A1');

    // -------------------------------------------------------------------------
    // 6. Comprehensive 25-Template Zero-Placeholder Scan with Custom Provider
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Full 25-Template Zero-Placeholder Pass with Custom Provider ---');
    let catalogPassCount = 0;
    for (const item of TEMPLATE_CATALOG) {
      const tRes = await resolveTemplateData(item.code, { client: clientWithSparseProvider });
      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', item.normalizedFilename);
      const rendered = await renderTemplateBuffer(templatePath, item.format, tRes.data, item.normalizedFilename);
      const leftover = await collectUnresolvedPlaceholders(rendered, item.format);
      if (leftover.length === 0) {
        catalogPassCount++;
      } else {
        console.error(`    ✗ Template ${item.name} has ${leftover.length} unresolved tokens: ${leftover.join(', ')}`);
      }
    }
    check(`All 25/25 official catalog templates render cleanly with custom provider (25 passed)`, catalogPassCount === 25, `Passed: ${catalogPassCount}/25`);

  } finally {
    // -------------------------------------------------------------------------
    // 7. Cleanup & Post-Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Teardown & Post-Verification ---');
    if (customClientId) {
      await prisma.client.deleteMany({ where: { id: customClientId } });
      console.log('  ✓ Test client deleted.');
    }
    if (customSpecialistId) {
      await prisma.ssmSpecialist.deleteMany({ where: { id: customSpecialistId } });
      console.log('  ✓ Test specialist deleted.');
    }
    if (customProviderId) {
      await prisma.ssmProvider.deleteMany({ where: { id: customProviderId } });
      console.log('  ✓ Test provider deleted.');
    }

    const residualClients = await prisma.client.count({ where: { cui: CUSTOM_CLIENT_CUI } });
    const residualProviders = await prisma.ssmProvider.count({ where: { cui: CUSTOM_PROVIDER_CUI } });
    const residualSpecialists = await prisma.ssmSpecialist.count({ where: { name: CUSTOM_SPECIALIST_NAME } });

    check('Zero residual test clients in database', residualClients === 0);
    check('Zero residual test providers in database', residualProviders === 0);
    check('Zero residual test specialists in database', residualSpecialists === 0);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${stats.passed + stats.failed} | PASSED: ${stats.passed} | FAILED: ${stats.failed}`);
  console.log('========================================================================\n');

  if (stats.failed > 0) {
    console.error('❌ ADVERSARIAL TOKEN BINDING VERIFICATION FAILED.');
    process.exit(1);
  } else {
    console.log('✅ ALL ADVERSARIAL TOKEN BINDING CHECKS PASSED EMPIRICALLY WITH ZERO ERRORS.');
    process.exit(0);
  }
}

run()
  .catch((err) => {
    console.error('Unhandled fatal error in adversarial test:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
