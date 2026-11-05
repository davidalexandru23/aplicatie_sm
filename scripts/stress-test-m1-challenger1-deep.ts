import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import {
  detectRomanianSalutation,
  sanitizeAuthorizationNumber,
  resolveHygieneLevel,
  formatDateRo,
  ALL_ROMANIAN_LEGAL_FALLBACKS,
} from '../src/lib/templates/resolver';

export interface TestCaseResult {
  name: string;
  category: string;
  passed: boolean;
  expected: any;
  actual: any;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  advisory?: boolean;
}

const results: TestCaseResult[] = [];

function assertTest(
  category: string,
  name: string,
  actual: any,
  expected: any,
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH',
  advisory: boolean = false
) {
  const passed = actual === expected;
  results.push({
    name,
    category,
    passed,
    expected,
    actual,
    severity,
    advisory,
  });
}

console.log('================================================================');
console.log('  CHALLENGER 1 DEEP ADVERSARIAL STRESS TEST HARNESS — M1 IT2   ');
console.log('================================================================\n');

// ============================================================================
// CATEGORY 1: ADVERSARIAL SALUTATIONS (detectRomanianSalutation)
// ============================================================================
console.log('Testing Category 1: detectRomanianSalutation Adversarial Boundaries...');

// 1.1 Diacritic and non-diacritic Romanian male surnames ending in -a
const maleSurnamesInA = [
  ['Ion Florea', 'Dl.'],
  ['Florea Ion', 'Dl.'],
  ['Tudor Chirilă', 'Dl.'],
  ['Tudor Chirila', 'Dl.'],
  ['Chirilă Tudor', 'Dl.'],
  ['Marius Moga', 'Dl.'],
  ['Ciprian Marica', 'Dl.'],
  ['Radu Ciurea', 'Dl.'],
  ['Vasile Ganea', 'Dl.'],
  ['Andrei Buruiană', 'Dl.'],
  ['Andrei Buruiana', 'Dl.'],
  ['Gabriel Bercea', 'Dl.'],
  ['Dan Sporea', 'Dl.'],
  ['Cristian Mirea', 'Dl.'],
  ['Silviu Cornea', 'Dl.'],
  ['Gheorghe Badea', 'Dl.'],
  ['Radu Manea', 'Dl.'],
  ['Ion Popa', 'Dl.'],
  ['Popa Ion', 'Dl.'],
  ['Vasile Voinea', 'Dl.'],
] as const;

for (const [name, expected] of maleSurnamesInA) {
  assertTest('Salutation: Male Surnames in -a', name, detectRomanianSalutation(name), expected);
}

// 1.2 Traditional Romanian male given names ending in -a
const maleGivenInA = [
  ['Mircea Popescu', 'Dl.'],
  ['Horia Sima', 'Dl.'],
  ['Horea Pop', 'Dl.'],
  ['Mihnea Costea', 'Dl.'],
  ['Toma Caragiu', 'Dl.'],
  ['Luca Radu', 'Dl.'],
  ['Dima Popescu', 'Dl.'],
  ['Sava Ion', 'Dl.'],
  ['Nichita Stănescu', 'Dl.'],
  ['Nichita Stanescu', 'Dl.'],
  ['Dănilă Popescu', 'Dl.'],
  ['Danila Popescu', 'Dl.'],
  ['Gheorghiță Tudor', 'Dl.'],
  ['Gheorghita Tudor', 'Dl.'],
  ['Costică Popescu', 'Dl.'],
  ['Costica Popescu', 'Dl.'],
  ['Mitică Ionescu', 'Dl.'],
  ['Mitica Ionescu', 'Dl.'],
  ['Irimia Vasile', 'Dl.'],
] as const;

for (const [name, expected] of maleGivenInA) {
  assertTest('Salutation: Traditional Male Given in -a', name, detectRomanianSalutation(name), expected);
}

// 1.3 Female names NOT ending in -a
const femaleNonA = [
  ['Carmen Popescu', 'Dna.'],
  ['Alice Ionescu', 'Dna.'],
  ['Beatrice Radu', 'Dna.'],
  ['Ingrid Bergman', 'Dna.'],
  ['Astrid Lindgren', 'Dna.'],
  ['Catrinel Marlon', 'Dna.'],
  ['Damaris Gheorghe', 'Dna.'],
  ['Rachel Green', 'Dna.'],
  ['Zoe Dumitrescu', 'Dna.'],
  ['Iris Enache', 'Dna.'],
  ['Ruth Popa', 'Dna.'],
  ['Ester Barbu', 'Dna.'],
  ['Miriam Popescu', 'Dna.'],
  ['Evelin Popescu', 'Dna.'],
  ['Eveline Popescu', 'Dna.'],
  ['Nicole Georgescu', 'Dna.'],
  ['Vivien Dan', 'Dna.'],
  ['Noemi Kovacs', 'Dna.'],
  ['Naomi Campbell', 'Dna.'],
  ['Ines Sastre', 'Dna.'],
  ['Agnes Keleti', 'Dna.'],
] as const;

for (const [name, expected] of femaleNonA) {
  assertTest('Salutation: Female Non -a Names', name, detectRomanianSalutation(name), expected);
}

// 1.4 Inverted / compound name precedence
const compoundPrecedence = [
  ['Mircea Elena', 'Dna.'],
  ['Elena Mircea', 'Dna.'],
  ['Nichita Maria', 'Dna.'],
  ['Maria Nichita', 'Dna.'],
  ['Luca Andreea', 'Dna.'],
  ['Andreea Luca', 'Dna.'],
  ['Florea Ioana', 'Dna.'],
  ['Ioana Florea', 'Dna.'],
  ['Popa Mihaela', 'Dna.'],
  ['Mihaela Popa', 'Dna.'],
  ['Chirilă Roxana', 'Dna.'],
  ['Roxana Chirilă', 'Dna.'],
  ['Ana-Maria Popescu', 'Dna.'],
  ['Maria-Magdalena Ionescu', 'Dna.'],
  ['Ionel-Mihai Popa', 'Dl.'],
  ['Dan-Florea Dumitru', 'Dl.'],
] as const;

for (const [name, expected] of compoundPrecedence) {
  assertTest('Salutation: Compound & Inverted Precedence', name, detectRomanianSalutation(name), expected);
}

// 1.5 Titles, Academic degrees & Multi-person commission strings
const titlesAndCommissions = [
  ['Prof. Univ. Dr. Ing. Elena Vasilescu', 'Dna.'],
  ['Prof Univ Dr Ing Mihai Popescu', 'Dl.'],
  ['pRoF. dR. Cristina Dumitru', 'Dna.'],
  ['Conf. Dr. Marica Ciprian', 'Dl.'],
  ['Elena Vasilescu, Alexandru Stan', 'Dna.'],
  ['Alexandru Stan, Elena Vasilescu', 'Dl.'],
  ['Dr. Maria Popescu; Ing. Ion Radu', 'Dna.'],
  ['Ing. Ion Radu; Dr. Maria Popescu', 'Dl.'],
  ['   Elena Vasilescu   ;   Alexandru Stan   ', 'Dna.'],
] as const;

for (const [name, expected] of titlesAndCommissions) {
  assertTest('Salutation: Titles & Multi-person Commissions', name, detectRomanianSalutation(name), expected);
}

// 1.6 CNP Priority & Corrupt / Edge values
const cnpAdversarial = [
  ['Elena Popescu', '1900101123456', 'Dl.'],
  ['Ion Popescu', '2900101123456', 'Dna.'],
  ['Elena Popescu', '5020101123456', 'Dl.'],
  ['Ion Popescu', '6020101123456', 'Dna.'],
  ['Elena Popescu', '7900101123456', 'Dl.'],
  ['Ion Popescu', '8900101123456', 'Dna.'],
  ['Elena Popescu', '   1900101123456   ', 'Dl.'],
  ['Ion Popescu', '9900101123456', 'Dl.'],
  ['Elena Popescu', '9900101123456', 'Dna.'],
  [null, null, 'Dl.'],
  [undefined, undefined, 'Dl.'],
  ['', null, 'Dl.'],
  ['   \n\t  ', null, 'Dl.'],
  ['12345', null, 'Dl.'],
  ['--- /// ...', null, 'Dl.'],
] as const;

for (const [name, cnp, expected] of cnpAdversarial) {
  const label = `CNP: ${cnp ?? 'null'} | Name: ${name ?? 'null'}`;
  assertTest('Salutation: CNP & Edge Inputs', label, detectRomanianSalutation(name, cnp), expected);
}

// ============================================================================
// CATEGORY 2: ADVERSARIAL AUTHORIZATION NUMBER SANITIZATION
// ============================================================================
console.log('Testing Category 2: sanitizeAuthorizationNumber Adversarial Boundaries...');

const authCases = [
  ['Aviz MS nr. 123/2022', '123/2022'],
  ['Aviz ME nr. 456/2022', '456/2022'],
  ['Nr. Aviz MS nr. 123/2022', '123/2022'],
  ['Nr. Avizul MS nr. 123/2022', '123/2022'],
  ['Numarul Aviz MS nr. 123/2022', '123/2022'],
  ['Avizul Ministerului Sanatatii nr. 456/2023', '456/2023'],
  ['Avizele MS/ME nr. 789/2021', '789/2021'],
  ['Autorizatia DSP nr. 101/2020', '101/2020'],
  ['Autorizatie nr. 88/2024', '88/2024'],
  ['Nr. Nr. Nr. 42/2024', '42/2024'],
  ['Aviz MS: 55/2022', '55/2022'],
  ['Aviz MS - 77/2023', '77/2023'],
  ['avizul me nr. 88/2022', '88/2022'],
  ['   Aviz    MS    nr.    99/2021   ', '99/2021'],
  ['4812/2021', '4812/2021'],
  ['123/2022 din 15.01.2022', '123/2022 din 15.01.2022'],
  ['', ''],
  ['   ', ''],
  [null, ''],
  [undefined, ''],
] as const;

for (const [input, expected] of authCases) {
  assertTest('Authorization Sanitization', `Input: "${input}"`, sanitizeAuthorizationNumber(input), expected);
}

// ============================================================================
// CATEGORY 3: ADVERSARIAL HYGIENE LEVEL INFERENCE (resolveHygieneLevel)
// ============================================================================
console.log('Testing Category 3: resolveHygieneLevel Adversarial Boundaries...');

const hygieneCases = [
  // 3.1 Explicit level forms
  [{ explicitLevel: 'Nivelul 1' }, 'Nivelul 1', 'Explicit Nivelul 1'],
  [{ explicitLevel: 'Nivelul 2' }, 'Nivelul 2', 'Explicit Nivelul 2'],
  [{ explicitLevel: 'Nivel I' }, 'Nivelul 1', 'Explicit Nivel I'],
  [{ explicitLevel: 'Nivel II' }, 'Nivelul 2', 'Explicit Nivel II'],
  [{ explicitLevel: 'nivelul unu' }, 'Nivelul 1', 'Explicit nivelul unu'],
  [{ explicitLevel: 'nivelul una' }, 'Nivelul 1', 'Explicit nivelul una'],
  [{ explicitLevel: 'NIVELUL DOI' }, 'Nivelul 2', 'Explicit NIVELUL DOI'],
  [{ explicitLevel: 'nivelul doua' }, 'Nivelul 2', 'Explicit nivelul doua (ASCII)'],
  [{ explicitLevel: 'Personal de conducere' }, 'Nivelul 2', 'Explicit conducere'],
  [{ explicitLevel: 'Personal de execuție' }, 'Nivelul 1', 'Explicit executie'],
  [{ explicitLevel: 'Personal de executie' }, 'Nivelul 1', 'Explicit executie non-diacritic'],

  // 3.2 Adversarial explicit with letter 'i' (prevent false match to Nivelul 1)
  [{ explicitLevel: 'Director' }, 'Nivelul 2', 'Explicit Director (contains i)'],
  [{ explicitLevel: 'Administrator' }, 'Nivelul 2', 'Explicit Administrator (contains i)'],
  [{ explicitLevel: 'Supervizor' }, 'Nivelul 2', 'Explicit Supervizor (contains i)'],
  [{ explicitLevel: 'Coordonator' }, 'Nivelul 2', 'Explicit Coordonator (contains o/i)'],

  // 3.3 COR Code Major Group 1 vs Others
  [{ corCode: '111201' }, 'Nivelul 2', 'COR 111201 (Director general)'],
  [{ corCode: '121901' }, 'Nivelul 2', 'COR 121901 (Conducator departament)'],
  [{ corCode: '132101' }, 'Nivelul 2', 'COR 132101 (Conducator unitate productie)'],
  [{ corCode: '141201' }, 'Nivelul 2', 'COR 141201 (Manager restaurant)'],
  [{ corCode: 112001 as any }, 'Nivelul 2', 'COR 112001 as number'],
  [{ corCode: '  121901  ' }, 'Nivelul 2', 'COR with whitespace'],
  [{ corCode: '251201' }, 'Nivelul 1', 'COR 251201 (Inginer software)'],
  [{ corCode: '334303' }, 'Nivelul 1', 'COR 334303 (Asistent manager)'],
  [{ corCode: '512001' }, 'Nivelul 1', 'COR 512001 (Bucatar)'],
  [{ corCode: '513102' }, 'Nivelul 1', 'COR 513102 (Ospatar)'],
  [{ corCode: '911201' }, 'Nivelul 1', 'COR 911201 (Curatenie)'],

  // 3.4 Job Title Management vs Execution
  [{ jobTitle: 'Director General' }, 'Nivelul 2', 'Title: Director General'],
  [{ jobTitle: 'Manager Restaurant' }, 'Nivelul 2', 'Title: Manager Restaurant'],
  [{ jobTitle: 'Sef Sala' }, 'Nivelul 2', 'Title: Sef Sala'],
  [{ jobTitle: 'Șef bucătar' }, 'Nivelul 2', 'Title: Șef bucătar'],
  [{ jobTitle: 'Head of Operations' }, 'Nivelul 2', 'Title: Head of Operations'],
  [{ jobTitle: 'Team Lead' }, 'Nivelul 2', 'Title: Team Lead'],
  [{ jobTitle: 'Chief Executive Officer' }, 'Nivelul 2', 'Title: Chief Executive Officer'],
  [{ jobTitle: 'Director Adjunct' }, 'Nivelul 2', 'Title: Director Adjunct'],
  [{ jobTitle: 'Maistru Mecanic' }, 'Nivelul 2', 'Title: Maistru Mecanic'],
  [{ jobTitle: 'Supervizor Punct de Lucru' }, 'Nivelul 2', 'Title: Supervizor'],

  // 3.5 Statutory Exception: Asistent Manager (COR 334303 - Execution)
  [{ jobTitle: 'Asistent Manager' }, 'Nivelul 1', 'Title: Asistent Manager (Statutory Exception)'],
  [{ jobTitle: 'asistent de manager' }, 'Nivelul 1', 'Title: asistent de manager'],
  [{ jobTitle: 'Asistent Manager Vânzări' }, 'Nivelul 1', 'Title: Asistent Manager Vânzări'],

  // 3.6 Execution Titles
  [{ jobTitle: 'Bucătar' }, 'Nivelul 1', 'Title: Bucătar'],
  [{ jobTitle: 'Ospătar' }, 'Nivelul 1', 'Title: Ospătar'],
  [{ jobTitle: 'Cameristă Hotel' }, 'Nivelul 1', 'Title: Cameristă Hotel'],
  [{ jobTitle: 'Barman Preparator' }, 'Nivelul 1', 'Title: Barman Preparator'],
  [{ jobTitle: 'Spălător Vase' }, 'Nivelul 1', 'Title: Spălător Vase'],
  [{ jobTitle: 'Conducător auto' }, 'Nivelul 1', 'Title: Conducător auto (Driver)'],
  [{ jobTitle: 'Șofer distribuție' }, 'Nivelul 1', 'Title: Șofer'],
  [{ jobTitle: 'Lucrător comercial' }, 'Nivelul 1', 'Title: Lucrător comercial'],

  // 3.7 Cascade Precedence
  [
    { explicitLevel: 'Nivelul 1', corCode: '111201', jobTitle: 'Director General' },
    'Nivelul 1',
    'Cascade: explicitLevel overrides COR and JobTitle',
  ],
  [
    { explicitLevel: 'Nivelul 2', corCode: '512001', jobTitle: 'Bucătar' },
    'Nivelul 2',
    'Cascade: explicitLevel overrides COR and JobTitle',
  ],
  [
    { corCode: '111201', jobTitle: 'Bucătar' },
    'Nivelul 2',
    'Cascade: COR overrides JobTitle when explicit absent',
  ],
  [
    { corCode: '512001', jobTitle: 'Director General' },
    'Nivelul 2',
    'Cascade: JobTitle elevates to Nivelul 2 when COR is non-managerial',
  ],
  [{}, 'Nivelul 1', 'Cascade: Empty options fallback to Nivelul 1'],
] as const;

for (const [opts, expected, desc] of hygieneCases) {
  assertTest('Hygiene Level Inference', desc, resolveHygieneLevel(opts as any), expected);
}

// ============================================================================
// CATEGORY 4: DOCUMENT TEMPLATE XML DEEP ADVERSARIAL INSPECTION
// ============================================================================
console.log('Testing Category 4: Document Template XML Deep Inspection...');

const normalizedDir = path.join(process.cwd(), 'templates_registry', 'normalized');
const handoffDir = path.join(process.cwd(), 'handoff', 'ssm-template-placeholder-pack', 'templates');

// 4.1 Adeverinta participare.docx
for (const dirName of ['normalized', 'handoff']) {
  const dirPath = dirName === 'normalized' ? normalizedDir : handoffDir;
  const filePath = path.join(dirPath, 'Adeverinta participare.docx');
  const zip = new PizZip(fs.readFileSync(filePath, 'binary'));
  const rawXml = zip.file('word/document.xml')?.asText() || '';

  assertTest(
    `Adeverinta Raw XML (${dirName})`,
    'Zero static "Nr. Aviz MS nr."',
    /Nr\.\s*Aviz\s+MS\s+nr\./i.test(rawXml),
    false,
    'CRITICAL'
  );
  assertTest(
    `Adeverinta Raw XML (${dirName})`,
    'Zero static "nivelul {PLACEHOLDER_NIVEL_IGIENA}"',
    /nivelul\s*\{PLACEHOLDER_NIVEL_IGIENA\}/i.test(rawXml),
    false,
    'CRITICAL'
  );
  assertTest(
    `Adeverinta Raw XML (${dirName})`,
    'Contains standalone "{PLACEHOLDER_NIVEL_IGIENA}"',
    rawXml.includes('{PLACEHOLDER_NIVEL_IGIENA}'),
    true,
    'CRITICAL'
  );

  for (const lvl of ['Nivelul 1', 'Nivelul 2'] as const) {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
    });
    doc.render({
      PLACEHOLDER_NUME_COMPLET: 'Popescu Ion',
      PLACEHOLDER_DATA_NASTERII: '01.01.1990',
      PLACEHOLDER_LOCALITATE_NASTERII: 'București',
      PLACEHOLDER_JUDET_NASTERII: 'Sector 1',
      PLACEHOLDER_CNP: '1900101123456',
      PLACEHOLDER_MODUL_IGIENA: 'Modulul 1',
      PLACEHOLDER_NIVEL_IGIENA: lvl,
      PLACEHOLDER_PRESTATOR_SSM: 'EXPERT SSM TRAINING SRL',
      PLACEHOLDER_AVIZ_MS: sanitizeAuthorizationNumber('Aviz MS nr. 123/2022'),
      PLACEHOLDER_AVIZ_ME: sanitizeAuthorizationNumber('Aviz ME nr. 456/2022'),
      PLACEHOLDER_SERIE_ADEVERINTA: 'ADEV-IG',
      PLACEHOLDER_NUMAR_ADEVERINTA: '0042',
      PLACEHOLDER_DATA_ELIBERARE: '15.01.2026',
      PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Ing. Mihai Popescu',
    });
    const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';
    assertTest(
      `Adeverinta Rendered (${dirName}, ${lvl})`,
      'Zero "nivelul Nivelul" stutter',
      /nivelul\s+Nivelul/i.test(renderedXml),
      false,
      'CRITICAL'
    );
    assertTest(
      `Adeverinta Rendered (${dirName}, ${lvl})`,
      'Zero "Nr. Aviz MS nr." stutter',
      /Nr\.\s*Aviz\s+MS\s+nr\./i.test(renderedXml),
      false,
      'CRITICAL'
    );
    assertTest(
      `Adeverinta Rendered (${dirName}, ${lvl})`,
      'Zero "Nr. Nr." stutter',
      /Nr\.\s*Nr\./i.test(renderedXml),
      false,
      'CRITICAL'
    );
  }
}

// 4.2 DECIZII.docx: Dynamic Salutation & P458 Token Isolation
for (const dirName of ['normalized', 'handoff']) {
  const dirPath = dirName === 'normalized' ? normalizedDir : handoffDir;
  const filePath = path.join(dirPath, 'DECIZII.docx');
  const zip = new PizZip(fs.readFileSync(filePath, 'binary'));
  const rawXml = zip.file('word/document.xml')?.asText() || '';

  assertTest(
    `DECIZII.docx Raw XML (${dirName})`,
    'Zero P458 {PLACEHOLDER_APELATIV_ADMINISTRATOR} before {PLACEHOLDER_MEMBRU_COMISIE}',
    rawXml.includes('{PLACEHOLDER_APELATIV_ADMINISTRATOR} {PLACEHOLDER_MEMBRU_COMISIE}'),
    false,
    'CRITICAL'
  );
  assertTest(
    `DECIZII.docx Raw XML (${dirName})`,
    'Contains {PLACEHOLDER_APELATIV_MEMBRU_COMISIE}',
    rawXml.includes('{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}'),
    true,
    'CRITICAL'
  );

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
  });
  const data = {
    ...ALL_ROMANIAN_LEGAL_FALLBACKS,
    PLACEHOLDER_FIRMA: 'TEST HOLDING S.R.L.',
    PLACEHOLDER_CUI: 'RO12345678',
    PLACEHOLDER_REPREZENTANT_LEGAL: 'Maria Popescu',
    PLACEHOLDER_APELATIV_ADMINISTRATOR: detectRomanianSalutation('Maria Popescu'),
    PLACEHOLDER_RESPONSABIL_PSI: 'Gheorghe Barbu',
    PLACEHOLDER_APELATIV_PSI: detectRomanianSalutation('Gheorghe Barbu'),
    PLACEHOLDER_MEMBRU_COMISIE: 'Elena Vasilescu',
    PLACEHOLDER_APELATIV_MEMBRU_COMISIE: detectRomanianSalutation('Elena Vasilescu'),
  };
  doc.render(data);
  const renderedXml = doc.getZip().file('word/document.xml')?.asText() || '';
  const plainText = renderedXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  assertTest(
    `DECIZII Rendered Salutations (${dirName})`,
    'Admin salutation "Dna. Maria Popescu"',
    plainText.includes('Dna. Maria Popescu'),
    true,
    'HIGH'
  );
  assertTest(
    `DECIZII Rendered Salutations (${dirName})`,
    'PSI salutation "Dl. Gheorghe Barbu"',
    plainText.includes('Dl. Gheorghe Barbu'),
    true,
    'HIGH'
  );
  assertTest(
    `DECIZII Rendered Salutations (${dirName})`,
    'Member salutation "Dna. Elena Vasilescu"',
    plainText.includes('Dna. Elena Vasilescu'),
    true,
    'HIGH'
  );
}

// 4.3 EVALUAREA RISCURILOR.docx: Chapter 6 & 7 and RegCom check
for (const dirName of ['normalized', 'handoff']) {
  const dirPath = dirName === 'normalized' ? normalizedDir : handoffDir;
  const filePath = path.join(dirPath, 'EVALUAREA RISCURILOR.docx');
  const zip = new PizZip(fs.readFileSync(filePath, 'binary'));
  const rawXml = zip.file('word/document.xml')?.asText() || '';

  assertTest(
    `EVALUAREA RISCURILOR (${dirName})`,
    'Contains {PLACEHOLDER_NR_REG_COM}',
    rawXml.includes('{PLACEHOLDER_NR_REG_COM}'),
    true,
    'HIGH'
  );
  assertTest(
    `EVALUAREA RISCURILOR (${dirName})`,
    'Zero static "București" in header',
    rawXml.includes('J40/1234/2020 București'),
    false,
    'HIGH'
  );
  assertTest(
    `EVALUAREA RISCURILOR (${dirName})`,
    'Contains {PLACEHOLDER_NIVEL_RISC_GLOBAL}',
    rawXml.includes('{PLACEHOLDER_NIVEL_RISC_GLOBAL}'),
    true,
    'HIGH'
  );
  assertTest(
    `EVALUAREA RISCURILOR (${dirName})`,
    'Contains {PLACEHOLDER_REPARTITIE_RISCURI}',
    rawXml.includes('{PLACEHOLDER_REPARTITIE_RISCURI}'),
    true,
    'HIGH'
  );
  assertTest(
    `EVALUAREA RISCURILOR (${dirName})`,
    'Contains {PLACEHOLDER_NUMAR_FACTORI_RISC}',
    rawXml.includes('{PLACEHOLDER_NUMAR_FACTORI_RISC}'),
    true,
    'HIGH'
  );
  assertTest(
    `EVALUAREA RISCURILOR (${dirName})`,
    'Contains {PLACEHOLDER_CONCLUZII_EVALUARE}',
    rawXml.includes('{PLACEHOLDER_CONCLUZII_EVALUARE}'),
    true,
    'HIGH'
  );
}

// 4.4 13 - ACTIVITATI DE BIROU.docx & 11 - ALUNECARI.docx
for (const dirName of ['normalized', 'handoff']) {
  const dirPath = dirName === 'normalized' ? normalizedDir : handoffDir;
  const birouPath = path.join(dirPath, '13 - ACTIVITATI DE BIROU.docx');
  const birouZip = new PizZip(fs.readFileSync(birouPath, 'binary'));
  const birouXml = birouZip.file('word/document.xml')?.asText() || '';

  assertTest(
    `13 - ACTIVITATI DE BIROU (${dirName})`,
    'Zero "agenților de pază"',
    /agen[tț]ilor de paz[aă]/i.test(birouXml),
    false,
    'HIGH'
  );
  assertTest(
    `13 - ACTIVITATI DE BIROU (${dirName})`,
    'Contains {PLACEHOLDER_FIRMA}',
    birouXml.includes('{PLACEHOLDER_FIRMA}'),
    true,
    'HIGH'
  );

  const alunecariPath = path.join(dirPath, '11 - ALUNECARI.docx');
  const alunecariZip = new PizZip(fs.readFileSync(alunecariPath, 'binary'));
  const alunecariXml = alunecariZip.file('word/document.xml')?.asText() || '';

  assertTest(
    `11 - ALUNECARI (${dirName})`,
    'Contains {PLACEHOLDER_FIRMA}',
    alunecariXml.includes('{PLACEHOLDER_FIRMA}'),
    true,
    'HIGH'
  );
}

// 4.5 Detaliu Tematica loc de munca.docx: Ad image excised
for (const dirName of ['normalized', 'handoff']) {
  const dirPath = dirName === 'normalized' ? normalizedDir : handoffDir;
  const filePath = path.join(dirPath, 'Detaliu Tematica loc de munca.docx');
  const zip = new PizZip(fs.readFileSync(filePath, 'binary'));
  const rawXml = zip.file('word/document.xml')?.asText() || '';

  assertTest(
    `Detaliu Tematica (${dirName})`,
    'Image14 physically removed',
    zip.file('word/media/image14.jpeg') !== null,
    false,
    'CRITICAL'
  );
  assertTest(
    `Detaliu Tematica (${dirName})`,
    'Zero tinypic URLs in XML',
    rawXml.toLowerCase().includes('tinypic.com'),
    false,
    'CRITICAL'
  );
  assertTest(
    `Detaliu Tematica (${dirName})`,
    'Contains {PLACEHOLDER_FUNCTIE}',
    rawXml.includes('{PLACEHOLDER_FUNCTIE}'),
    true,
    'HIGH'
  );
}

// 4.6 Tabel Cursanti exemplu.xlsx: Sheet1 completely excised
for (const dirName of ['normalized', 'handoff']) {
  const dirPath = dirName === 'normalized' ? normalizedDir : handoffDir;
  const filePath = path.join(dirPath, 'Tabel Cursanti exemplu.xlsx');
  const wb = XLSX.readFile(filePath);

  assertTest(
    `Tabel Cursanti (${dirName})`,
    'Exactly 1 worksheet (Curs (2))',
    wb.SheetNames.length === 1 && wb.SheetNames[0] === 'Curs (2)',
    true,
    'CRITICAL'
  );
  assertTest(
    `Tabel Cursanti (${dirName})`,
    'Zero Sheet1 (Registru Casă)',
    wb.SheetNames.includes('Sheet1'),
    false,
    'CRITICAL'
  );
}

// ============================================================================
// FINAL AGGREGATION & REPORT
// ============================================================================
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log('\n================================================================');
console.log(`DEEP ADVERSARIAL TEST SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  console.log('FAILURES:');
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`- [${r.severity}] [${r.category}] ${r.name}`);
    console.log(`  Expected: ${JSON.stringify(r.expected)}`);
    console.log(`  Actual:   ${JSON.stringify(r.actual)}`);
  }
  process.exit(1);
} else {
  console.log(`✓ ALL ${total} ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS.`);
  process.exit(0);
}
