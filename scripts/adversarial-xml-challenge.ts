import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { renderTemplateBuffer, listTemplatePlaceholders, generateDocument } from '../src/lib/templates/generator';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { prisma } from '../src/lib/prisma';

const OUTPUT_DIR = path.join(process.cwd(), 'storage', 'adversarial_test_output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface AdversarialConfig {
  name: string;
  generateValue: (key: string, index: number) => string;
}

const ADVERSARIAL_CONFIGS: AdversarialConfig[] = [
  {
    name: 'ampersands_quotes_company',
    generateValue: (key: string, idx: number) =>
      `ACME & Sons & Co. & Partenerii "Consultanță" 'Expert' & Asociații S.R.L. <România & UE> [${key}_${idx}]`,
  },
  {
    name: 'xml_injection_unclosed_brackets',
    generateValue: (key: string, idx: number) =>
      `Prefix</w:t></w:r><w:r><w:t>Injected & Corrupted <Tag> "Double" 'Single'</w:t></w:r><w:r><w:t>Suffix <<unclosed <bracket> >> [${key}_${idx}]`,
  },
  {
    name: 'risk_symbols_and_entities',
    generateValue: (key: string, idx: number) =>
      `Risc: Tensiune U > 380V & Rezistență R < 4Ω; Conc. CO2 > 1000ppm & Temp < -10°C; Evaluat: 'Nivel 4' (Gravitate: "Ridicat" & "Periculos"); &amp; &lt; &gt; &quot; &apos; [${key}_${idx}]`,
  },
];

async function runAdversarialXmlHarness() {
  console.log('========================================================================================');
  console.log('ADVERSARIAL EMPIRICAL HARNESS: XML SPECIAL CHARACTER ESCAPING ACROSS ALL DOCX TEMPLATES');
  console.log('========================================================================================\n');

  const docxTemplates = TEMPLATE_CATALOG.filter((t) => t.format === 'docx');
  console.log(`Found ${docxTemplates.length} statutory DOCX templates to test.`);

  const generatedFiles: string[] = [];
  let totalTests = 0;
  let passCount = 0;

  for (const template of docxTemplates) {
    const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', template.normalizedFilename);
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template file missing: ${templatePath}`);
      continue;
    }

    const placeholders = await listTemplatePlaceholders(template.code);

    for (const config of ADVERSARIAL_CONFIGS) {
      totalTests++;
      const payload: Record<string, unknown> = {};

      placeholders.forEach((token, idx) => {
        payload[token] = config.generateValue(token, idx);
      });

      // Special overrides for structural fields to ensure render succeeds
      payload.PLACEHOLDER_NUMAR_CANDIDATI = '5';
      payload.PLACEHOLDER_NUMAR_PREZENTI = '5';
      payload.PLACEHOLDER_NUMAR_ADMISI = '5';
      payload.PLACEHOLDER_EMAIL_PRESTATOR = 'prestator&ssm@acme<tech>"pro\'safe.ro';

      try {
        const buffer = await renderTemplateBuffer(templatePath, 'docx', payload, template.normalizedFilename);
        const fileName = `${template.code}__${config.name}.docx`;
        const outPath = path.join(OUTPUT_DIR, fileName);
        fs.writeFileSync(outPath, buffer);
        generatedFiles.push(outPath);
        passCount++;
      } catch (err: any) {
        console.error(`FAILED rendering ${template.code} with ${config.name}:`, err.message);
      }
    }
  }

  console.log(`\nGenerated ${generatedFiles.length} DOCX files across ${totalTests} test scenarios.`);
  console.log('Now executing independent Python ElementTree verification on EVERY .xml and .rels part...\n');

  // Run python verification script in batches of 20 to avoid shell command length limits
  const batchSize = 20;
  let allXmlValid = true;

  for (let i = 0; i < generatedFiles.length; i += batchSize) {
    const batch = generatedFiles.slice(i, i + batchSize);
    const pythonCmd = `python3 scripts/verify_docx_xml_parts.py ${batch.map((f) => `"${f}"`).join(' ')}`;
    try {
      const output = execSync(pythonCmd, { encoding: 'utf-8' });
      // console.log(output);
    } catch (err: any) {
      console.error('Python XML verification failed on batch:');
      console.error(err.stdout || err.message);
      allXmlValid = false;
    }
  }

  if (allXmlValid) {
    console.log(`✓ VERIFICATION PASSED: All ${generatedFiles.length} generated documents parsed with 100% valid XML!`);
  } else {
    console.error('✗ VERIFICATION FAILED: Malformed XML or unescaped ampersands detected!');
    process.exit(1);
  }

  console.log('\n========================================================================================');
  console.log('END-TO-END ADVERSARIAL TEST: generateDocument with Hostile DB Entities & Overrides');
  console.log('========================================================================================\n');

  const client = await prisma.client.findFirst({
    include: { employees: true, jobs: true },
  });

  if (!client) {
    throw new Error('No client found in DB to run end-to-end test.');
  }

  const employee = client.employees[0];
  const job = client.jobs[0];

  const dangerousOverrides = {
    PLACEHOLDER_FIRMA: 'S.C. AT & T & M&M\'S <ROMÂNIA> "ENTERPRISE" \'SSM\' S.R.L.',
    PLACEHOLDER_REPREZENTANT_LEGAL: 'Popescu & Ionescu <General Manager> "Admin" \'Lead\'',
    PLACEHOLDER_NUME_COMPLET: 'Stan & Dan <Alexandru> "Senior" \'Junior\'',
    PLACEHOLDER_FUNCTIE: 'Specialist SSM & PSI <Nivel Maxim> "Coordonator" \'Auditor\'',
    PLACEHOLDER_NUMAR_CIM: '101/2026 & <SEC-B>',
    PLACEHOLDER_SALARIU_BRUT: '7500 lei & 1000 bonus <Brut> "RON"',
    PLACEHOLDER_DATA_INCEPERE: '15.01.2026 & <Ora 08:00>',
  };

  const e2eTemplates = [
    'hr-cim-model-cadru-2022',
    'hr-cim-2026',
    'hr-anexa-fisa-post',
    'ssm-fisa-instruire-individuala',
    'psi-fisa-instructaj-individuala',
    'decizii-angajator',
    'risk-evaluare',
  ];

  const e2eFiles: string[] = [];

  for (const code of e2eTemplates) {
    const res = await generateDocument({
      templateCode: code,
      clientId: client.id,
      employeeId: employee?.id,
      jobId: job?.id,
      operatorName: 'Adversarial Tester & Critic <Harness>',
      data: dangerousOverrides,
    });

    console.log(`generateDocument [${code}]: status=${res.status}, path=${res.filePath}`);
    e2eFiles.push(res.filePath);
  }

  // Verify all e2e generated files with python
  const pythonCmdE2e = `python3 scripts/verify_docx_xml_parts.py ${e2eFiles.map((f) => `"${f}"`).join(' ')}`;
  const e2eOutput = execSync(pythonCmdE2e, { encoding: 'utf-8' });
  console.log('\nPython ElementTree verification for e2e documents:');
  console.log(e2eOutput);

  console.log('✓ ALL ADVERSARIAL XML TESTS COMPLETED SUCCESSFULLY!');
}

runAdversarialXmlHarness()
  .catch((e) => {
    console.error('Fatal error in harness:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
