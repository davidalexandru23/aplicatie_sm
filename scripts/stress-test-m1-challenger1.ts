import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import {
  detectRomanianSalutation,
  sanitizeAuthorizationNumber,
  resolveHygieneLevel,
  resolveTemplatePlaceholders,
  formatDateRo,
  ALL_ROMANIAN_LEGAL_FALLBACKS,
} from '../src/lib/templates/resolver';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

export interface StressTestReport {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  failures: Array<{ name: string; input: any; expected: any; actual: any; description: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }>;
}

const reports: StressTestReport[] = [];

function runSuite(name: string, fn: (report: StressTestReport) => void): StressTestReport {
  const report: StressTestReport = { suite: name, total: 0, passed: 0, failed: 0, failures: [] };
  fn(report);
  reports.push(report);
  return report;
}

// ============================================================================
// SUITE 1: detectRomanianSalutation STRESS TESTS
// ============================================================================
runSuite('detectRomanianSalutation — Romanian Salutation Adversarial Suite', (r) => {
  function testCase(
    name: string,
    fullName: any,
    cnp: any,
    expected: 'Dl.' | 'Dna.',
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    description: string
  ) {
    r.total++;
    const actual = detectRomanianSalutation(fullName, cnp);
    if (actual === expected) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({ name, input: { fullName, cnp }, expected, actual, description, severity });
    }
  }

  // 1. Null / Undefined / Empty / Whitespace
  testCase('Null name & null CNP', null, null, 'Dl.', 'LOW', 'Fallback for null name');
  testCase('Undefined name & undefined CNP', undefined, undefined, 'Dl.', 'LOW', 'Fallback for undefined');
  testCase('Empty string name', '', null, 'Dl.', 'LOW', 'Fallback for empty string');
  testCase('Whitespace string name', '   \t\n  ', null, 'Dl.', 'LOW', 'Fallback for whitespace');

  // 2. CNP Priority (1,3,5,7 = Male; 2,4,6,8 = Female)
  testCase('Male CNP 1 (1900-1999)', 'Maria Popescu', '1850101123456', 'Dl.', 'HIGH', 'CNP 1 must override female name');
  testCase('Male CNP 5 (2000-2099)', 'Elena Ionescu', '5020101123456', 'Dl.', 'HIGH', 'CNP 5 must override female name');
  testCase('Male CNP 3 (1800-1899)', 'Ioana Vasile', '3800101123456', 'Dl.', 'MEDIUM', 'CNP 3 must override female name');
  testCase('Male CNP 7 (Foreign Resident)', 'Andreea Stan', '7850101123456', 'Dl.', 'MEDIUM', 'CNP 7 must override female name');

  testCase('Female CNP 2 (1900-1999)', 'Ion Popescu', '2850101123456', 'Dna.', 'HIGH', 'CNP 2 must override male name');
  testCase('Female CNP 6 (2000-2099)', 'Mihai Ionescu', '6020101123456', 'Dna.', 'HIGH', 'CNP 6 must override male name');
  testCase('Female CNP 4 (1800-1899)', 'Vasile Radu', '4800101123456', 'Dna.', 'MEDIUM', 'CNP 4 must override male name');
  testCase('Female CNP 8 (Foreign Resident)', 'Alexandru Dumitru', '8850101123456', 'Dna.', 'MEDIUM', 'CNP 8 must override male name');

  // CNP formatting resilience
  testCase('CNP with leading whitespace', 'Ion Popescu', '  2850101123456  ', 'Dna.', 'MEDIUM', 'Trim CNP whitespace');
  testCase('CNP 9 (Foreign citizen without sex digit) falls back to male name', 'Ion Popescu', '9850101123456', 'Dl.', 'LOW', 'CNP 9 fallback to name');
  testCase('CNP 9 falls back to female name', 'Elena Popescu', '9850101123456', 'Dna.', 'LOW', 'CNP 9 fallback to name');

  // 3. Titles and Prefixes
  testCase('Ing. title prefix male', 'Ing. Mihai Popescu', null, 'Dl.', 'LOW', 'Stripping Ing. prefix');
  testCase('Ing. title prefix female', 'Ing. Elena Popescu', null, 'Dna.', 'LOW', 'Stripping Ing. prefix');
  testCase('Dr. title prefix female', 'Dr. Maria Ionescu', null, 'Dna.', 'LOW', 'Stripping Dr. prefix');
  testCase('Prof. Dr. Ing. multiple titles female', 'Prof. Dr. Ing. Gabriela Radu', null, 'Dna.', 'LOW', 'Stripping multiple titles');
  testCase('Ec. title prefix female', 'Ec. Cristina Dumitru', null, 'Dna.', 'LOW', 'Stripping Ec. prefix');
  testCase('Lowercase ing. title female', 'ing. alina vasilescu', null, 'Dna.', 'LOW', 'Stripping lowercase ing.');

  // Titles WITHOUT dot
  testCase('Title without dot female (Ing Elena Popescu)', 'Ing Elena Popescu', null, 'Dna.', 'MEDIUM', 'Handling title without trailing dot');
  testCase('Title without dot female (Dr Maria Popescu)', 'Dr Maria Popescu', null, 'Dna.', 'MEDIUM', 'Handling Dr without trailing dot');

  // 4. Male Names Ending in -a (Standard exceptions catalog)
  testCase('Male ending in -a: Mircea Popescu', 'Mircea Popescu', null, 'Dl.', 'HIGH', 'Mircea exception');
  testCase('Male ending in -a: Horia Sima', 'Horia Sima', null, 'Dl.', 'HIGH', 'Horia exception');
  testCase('Male ending in -a: Mihnea Costea', 'Mihnea Costea', null, 'Dl.', 'HIGH', 'Mihnea & Costea exception');
  testCase('Male ending in -a: Toma Caragiu', 'Toma Caragiu', null, 'Dl.', 'HIGH', 'Toma exception');
  testCase('Male ending in -a: Luca Radu', 'Luca Radu', null, 'Dl.', 'HIGH', 'Luca exception');
  testCase('Male ending in -a: Dima Popescu', 'Dima Popescu', null, 'Dl.', 'HIGH', 'Dima exception');
  testCase('Male ending in -a: Sava Ion', 'Sava Ion', null, 'Dl.', 'HIGH', 'Sava exception');

  // 5. Male Surnames Ending in -a in known set
  testCase('Male surname Popa: Ion Popa', 'Ion Popa', null, 'Dl.', 'HIGH', 'Popa surname in known set');
  testCase('Male surname Popa reversed: Popa Ion', 'Popa Ion', null, 'Dl.', 'HIGH', 'Popa surname reversed');
  testCase('Male surname Manea: Radu Manea', 'Radu Manea', null, 'Dl.', 'HIGH', 'Manea surname in known set');
  testCase('Male surname Badea: Gheorghe Badea', 'Gheorghe Badea', null, 'Dl.', 'HIGH', 'Badea surname in known set');
  testCase('Male surname Voinea: Vasile Voinea', 'Vasile Voinea', null, 'Dl.', 'HIGH', 'Voinea surname in known set');

  // 6. ADVERSARIAL: Male Names Ending in -a NOT in known exceptions set!
  testCase('Adversarial male name: Nichita Stanescu', 'Nichita Stanescu', null, 'Dl.', 'HIGH', 'Nichita is male but ends in -a');
  testCase('Adversarial male name: Danila Popescu', 'Danila Popescu', null, 'Dl.', 'MEDIUM', 'Danila is male but ends in -a');
  testCase('Adversarial male name: Gheorghita Tudor', 'Gheorghita Tudor', null, 'Dl.', 'MEDIUM', 'Gheorghita is male diminutive ending in -a');
  testCase('Adversarial male name: Costica Popescu', 'Costica Popescu', null, 'Dl.', 'MEDIUM', 'Costica is male diminutive ending in -a');
  testCase('Adversarial male name: Mitica Ionescu', 'Mitica Ionescu', null, 'Dl.', 'MEDIUM', 'Mitica is male diminutive ending in -a');
  testCase('Adversarial male name: Irimia Vasile', 'Irimia Vasile', null, 'Dl.', 'MEDIUM', 'Irimia is traditional male name ending in -a');

  // 7. ADVERSARIAL: Common Male Surnames Ending in -a NOT in known set!
  testCase('Adversarial male surname: Ion Florea', 'Ion Florea', null, 'Dl.', 'HIGH', 'Florea is very common male surname ending in -a');
  testCase('Adversarial male surname: Florea Ion', 'Florea Ion', null, 'Dl.', 'HIGH', 'Florea Ion reversed');
  testCase('Adversarial male surname: Tudor Chirila', 'Tudor Chirila', null, 'Dl.', 'HIGH', 'Chirila is male surname ending in -a');
  testCase('Adversarial male surname: Marius Moga', 'Marius Moga', null, 'Dl.', 'HIGH', 'Moga is male surname ending in -a');
  testCase('Adversarial male surname: Ciprian Marica', 'Ciprian Marica', null, 'Dl.', 'HIGH', 'Marica is male surname ending in -a');
  testCase('Adversarial male surname: Radu Ciurea', 'Radu Ciurea', null, 'Dl.', 'HIGH', 'Ciurea is male surname ending in -a');
  testCase('Adversarial male surname: Vasile Ganea', 'Vasile Ganea', null, 'Dl.', 'HIGH', 'Ganea is male surname ending in -a');
  testCase('Adversarial male surname: Andrei Buruiana', 'Andrei Buruiana', null, 'Dl.', 'HIGH', 'Buruiana is male surname ending in -a');
  testCase('Adversarial male surname: Gabriel Bercea', 'Gabriel Bercea', null, 'Dl.', 'HIGH', 'Bercea is male surname ending in -a');
  testCase('Adversarial male surname: Dan Sporea', 'Dan Sporea', null, 'Dl.', 'HIGH', 'Sporea is male surname ending in -a');
  testCase('Adversarial male surname: Cristian Mirea', 'Cristian Mirea', null, 'Dl.', 'HIGH', 'Mirea is male surname ending in -a');
  testCase('Adversarial male surname: Silviu Cornea', 'Silviu Cornea', null, 'Dl.', 'HIGH', 'Cornea is male surname ending in -a');

  // 8. Female Names NOT Ending in -a
  testCase('Female exception: Carmen Popescu', 'Carmen Popescu', null, 'Dna.', 'HIGH', 'Carmen exception');
  testCase('Female exception: Alice Ionescu', 'Alice Ionescu', null, 'Dna.', 'HIGH', 'Alice exception');
  testCase('Female exception: Beatrice Radu', 'Beatrice Radu', null, 'Dna.', 'HIGH', 'Beatrice exception');
  testCase('Female exception: Ingrid Bergman', 'Ingrid Bergman', null, 'Dna.', 'HIGH', 'Ingrid exception');
  testCase('Female exception: Catrinel Marlon', 'Catrinel Marlon', null, 'Dna.', 'HIGH', 'Catrinel exception');

  // ADVERSARIAL: Female names NOT in femaleExceptions set!
  testCase('Adversarial female name: Miriam Popescu', 'Miriam Popescu', null, 'Dna.', 'HIGH', 'Miriam is female not ending in -a');
  testCase('Adversarial female name: Evelin Popescu', 'Evelin Popescu', null, 'Dna.', 'HIGH', 'Evelin is female not ending in -a');
  testCase('Adversarial female name: Eveline Popescu', 'Eveline Popescu', null, 'Dna.', 'HIGH', 'Eveline is female not ending in -a');
  testCase('Adversarial female name: Nicole Georgescu', 'Nicole Georgescu', null, 'Dna.', 'HIGH', 'Nicole is female not ending in -a');
  testCase('Adversarial female name: Vivien Dan', 'Vivien Dan', null, 'Dna.', 'HIGH', 'Vivien is female not ending in -a');

  // 9. Single Names & Reversed Ambiguity
  testCase('Single name female: Maria', 'Maria', null, 'Dna.', 'HIGH', 'Single female name');
  testCase('Single name male: Ion', 'Ion', null, 'Dl.', 'HIGH', 'Single male name');
  testCase('Single name male in -a: Mircea', 'Mircea', null, 'Dl.', 'HIGH', 'Single male name in -a');
  testCase('Reversed name: Mircea Elena (Woman)', 'Mircea Elena', null, 'Dna.', 'HIGH', 'Mircea Elena is female (Elena)');
  testCase('Hyphenated female name: Ana-Maria Popescu', 'Ana-Maria Popescu', null, 'Dna.', 'HIGH', 'Hyphenated female');
  testCase('Hyphenated male name: Ionel-Mihai Popa', 'Ionel-Mihai Popa', null, 'Dl.', 'HIGH', 'Hyphenated male');
});

// ============================================================================
// SUITE 2: sanitizeAuthorizationNumber STRESS TESTS
// ============================================================================
runSuite('sanitizeAuthorizationNumber — Authorization Sanitization Suite', (r) => {
  function testCase(
    name: string,
    input: any,
    expected: string,
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    description: string
  ) {
    r.total++;
    const actual = sanitizeAuthorizationNumber(input);
    if (actual === expected) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({ name, input, expected, actual, description, severity });
    }
  }

  testCase('Null input', null, '', 'LOW', 'Null input returns empty string');
  testCase('Undefined input', undefined, '', 'LOW', 'Undefined input returns empty string');
  testCase('Empty string input', '', '', 'LOW', 'Empty string returns empty string');
  testCase('Whitespace input', '   ', '', 'LOW', 'Whitespace returns empty string');

  testCase('Standard Aviz MS with nr.', 'Aviz MS nr. 123/2022', '123/2022', 'HIGH', 'Stripping Aviz MS nr.');
  testCase('Standard Aviz ME with nr.', 'Aviz ME nr. 456/2022', '456/2022', 'HIGH', 'Stripping Aviz ME nr.');
  testCase('Aviz MS without dot', 'Aviz MS nr 123/2022', '123/2022', 'HIGH', 'Stripping Aviz MS nr without dot');
  testCase('Aviz MS without nr', 'Aviz MS 123/2022', '123/2022', 'HIGH', 'Stripping Aviz MS');
  testCase('Aviz ME without nr', 'Aviz ME 456/2022', '456/2022', 'HIGH', 'Stripping Aviz ME');
  testCase('Aviz nr.', 'Aviz nr. 789/2022', '789/2022', 'HIGH', 'Stripping Aviz nr.');
  testCase('Nr. prefix only', 'Nr. 101/2024', '101/2024', 'HIGH', 'Stripping Nr.');
  testCase('Clean number without prefix', '101/2024', '101/2024', 'HIGH', 'Preserving clean number');

  // Adversarial edge cases
  testCase('Compound duplicate prefix: Nr. Aviz MS nr.', 'Nr. Aviz MS nr. 123/2022', '123/2022', 'HIGH', 'Stripping compound double prefix');
  testCase('Articulated prefix: Avizul MS nr.', 'Avizul MS nr. 123/2022', '123/2022', 'MEDIUM', 'Handling Avizul prefix');
  testCase('Lowercase prefix', 'aviz ms nr. 123/2022', '123/2022', 'MEDIUM', 'Case insensitivity');
  testCase('Uppercase prefix', 'AVIZ MS NR. 123/2022', '123/2022', 'MEDIUM', 'Case insensitivity');
  testCase('Multiple spaces in prefix', 'Aviz   MS   nr.   123/2022', '123/2022', 'LOW', 'Handling multiple whitespace');
});

// ============================================================================
// SUITE 3: resolveHygieneLevel STRESS TESTS
// ============================================================================
runSuite('resolveHygieneLevel — Hygiene Level Inference Suite', (r) => {
  function testCase(
    name: string,
    options: { explicitLevel?: any; jobTitle?: any; corCode?: any },
    expected: 'Nivelul 1' | 'Nivelul 2',
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    description: string
  ) {
    r.total++;
    const actual = resolveHygieneLevel(options);
    if (actual === expected) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({ name, input: options, expected, actual, description, severity });
    }
  }

  // 1. Explicit Level
  testCase('Explicit Nivelul 1', { explicitLevel: 'Nivelul 1' }, 'Nivelul 1', 'HIGH', 'Explicit Nivelul 1');
  testCase('Explicit Nivelul 2', { explicitLevel: 'Nivelul 2' }, 'Nivelul 2', 'HIGH', 'Explicit Nivelul 2');
  testCase('Explicit Roman numeral Nivel I', { explicitLevel: 'Nivel I' }, 'Nivelul 1', 'HIGH', 'Roman numeral I');
  testCase('Explicit Roman numeral Nivel II', { explicitLevel: 'Nivel II' }, 'Nivelul 2', 'HIGH', 'Roman numeral II');
  testCase('Explicit word Nivelul doi', { explicitLevel: 'Nivelul doi' }, 'Nivelul 2', 'HIGH', 'Word doi');
  testCase('Explicit word Nivelul unu', { explicitLevel: 'Nivelul unu' }, 'Nivelul 1', 'HIGH', 'Word unu');
  testCase('Explicit conducere', { explicitLevel: 'Personal de conducere' }, 'Nivelul 2', 'HIGH', 'Explicit conducere');
  testCase('Explicit executie', { explicitLevel: 'Personal de execuție' }, 'Nivelul 1', 'HIGH', 'Explicit executie');

  // ADVERSARIAL: Letter 'i' match in explicitLevel!
  testCase('Adversarial explicit: Director', { explicitLevel: 'Director' }, 'Nivelul 2', 'HIGH', 'Director is management');
  testCase('Adversarial explicit: Administrator', { explicitLevel: 'Administrator' }, 'Nivelul 2', 'HIGH', 'Administrator is management');
  testCase('Adversarial explicit: Supervizor', { explicitLevel: 'Supervizor' }, 'Nivelul 2', 'HIGH', 'Supervizor is management');

  // 2. COR Code (Grupa 1 = Conducători)
  testCase('COR 111201 (Director general)', { corCode: '111201' }, 'Nivelul 2', 'HIGH', 'COR Major Group 1');
  testCase('COR 121901 (Conducator departament)', { corCode: '121901' }, 'Nivelul 2', 'HIGH', 'COR Major Group 1');
  testCase('COR 141201 (Manager restaurant)', { corCode: '141201' }, 'Nivelul 2', 'HIGH', 'COR Major Group 1');
  testCase('COR number type 121101', { corCode: 121101 as any }, 'Nivelul 2', 'MEDIUM', 'COR as number');
  testCase('COR with leading spaces', { corCode: '  121101  ' }, 'Nivelul 2', 'MEDIUM', 'COR trimmed');

  testCase('COR 512001 (Bucatar)', { corCode: '512001' }, 'Nivelul 1', 'HIGH', 'COR non-group 1');
  testCase('COR 513102 (Chelner/Ospatar)', { corCode: '513102' }, 'Nivelul 1', 'HIGH', 'COR non-group 1');
  testCase('COR 911201 (Curatenie)', { corCode: '911201' }, 'Nivelul 1', 'HIGH', 'COR non-group 1');

  // 3. Job Title
  testCase('Job Title: Director General', { jobTitle: 'Director General' }, 'Nivelul 2', 'HIGH', 'Management title');
  testCase('Job Title: Manager Restaurant', { jobTitle: 'Manager Restaurant' }, 'Nivelul 2', 'HIGH', 'Management title');
  testCase('Job Title: Sef Sala', { jobTitle: 'Sef Sala' }, 'Nivelul 2', 'HIGH', 'Management title');
  testCase('Job Title: Șef bucătar', { jobTitle: 'Șef bucătar' }, 'Nivelul 2', 'HIGH', 'Management title');
  testCase('Job Title: Coordonator Evenimente', { jobTitle: 'Coordonator Evenimente' }, 'Nivelul 2', 'HIGH', 'Management title');
  testCase('Job Title: Supervizor Punct de Lucru', { jobTitle: 'Supervizor Punct de Lucru' }, 'Nivelul 2', 'HIGH', 'Management title');
  testCase('Job Title: Maistru', { jobTitle: 'Maistru' }, 'Nivelul 2', 'HIGH', 'Management title');

  // Execution titles
  testCase('Job Title: Bucătar', { jobTitle: 'Bucătar' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Ospătar', { jobTitle: 'Ospătar' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Ajutor bucătar', { jobTitle: 'Ajutor bucătar' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Barman', { jobTitle: 'Barman' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Cameristă', { jobTitle: 'Cameristă' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Spălător vase', { jobTitle: 'Spălător vase' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Vânzător', { jobTitle: 'Vânzător' }, 'Nivelul 1', 'HIGH', 'Execution title');
  testCase('Job Title: Conducător auto', { jobTitle: 'Conducător auto' }, 'Nivelul 1', 'MEDIUM', 'Conducator auto is driver, not manager');

  // Ambiguous title
  testCase('Job Title: Asistent Manager', { jobTitle: 'Asistent Manager' }, 'Nivelul 1', 'LOW', 'Asistent Manager is execution secretariat');
});

// ============================================================================
// SUITE 4: TEMPLATE RENDERING, STUTTER & OPTIONAL VARIABLES
// ============================================================================
runSuite('Template Rendering, Stutter Inspection & Missing Variables', (r) => {
  const normalizedDir = path.join(process.cwd(), 'templates_registry', 'normalized');

  // 1. Inspect Adeverinta participare.docx for stuttering
  r.total++;
  try {
    const adeverintaPath = path.join(normalizedDir, 'Adeverinta participare.docx');
    const adeverintaZip = new PizZip(fs.readFileSync(adeverintaPath, 'binary'));
    const docText = adeverintaZip.file('word/document.xml')?.asText() || '';

    // Check stutter in raw template
    const hasRawAvizStutter = /Nr\.\s*Aviz\s+MS\s+nr\./i.test(docText);
    if (!hasRawAvizStutter) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({
        name: 'Adeverinta participare.docx: Raw Aviz Stutter',
        input: 'templates_registry/normalized/Adeverinta participare.docx',
        expected: 'No "Nr. Aviz MS nr." in template XML',
        actual: 'Found "Nr. Aviz MS nr."',
        description: 'Template still contains uncorrected aviz stutter in raw XML',
        severity: 'CRITICAL',
      });
    }
  } catch (err: any) {
    r.failed++;
    r.failures.push({
      name: 'Adeverinta participare inspection error',
      input: '',
      expected: 'Read file',
      actual: err.message,
      description: err.message,
      severity: 'CRITICAL',
    });
  }

  // 2. Render Adeverinta participare.docx with resolved data and check rendered text for stuttering
  r.total++;
  try {
    const adeverintaPath = path.join(normalizedDir, 'Adeverinta participare.docx');
    const adeverintaZip = new PizZip(fs.readFileSync(adeverintaPath, 'binary'));
    const doc = new Docxtemplater(adeverintaZip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
    });

    const renderedData: Record<string, string> = {
      PLACEHOLDER_NUME_COMPLET: 'Popescu Ion',
      PLACEHOLDER_DATA_NASTERII: '01.01.1990',
      PLACEHOLDER_LOCALITATE_NASTERII: 'București',
      PLACEHOLDER_JUDET_NASTERII: 'Sector 1',
      PLACEHOLDER_CNP: '1900101123456',
      PLACEHOLDER_MODUL_IGIENA: 'Modulul 1 - Servicii de alimentație',
      PLACEHOLDER_NIVEL_IGIENA: resolveHygieneLevel({ jobTitle: 'Bucătar' }),
      PLACEHOLDER_PRESTATOR_SSM: 'EXPERT SSM TRAINING SRL',
      PLACEHOLDER_AVIZ_MS: sanitizeAuthorizationNumber('Aviz MS nr. 123/2022'),
      PLACEHOLDER_AVIZ_ME: sanitizeAuthorizationNumber('Aviz ME nr. 456/2022'),
      PLACEHOLDER_SERIE_ADEVERINTA: 'ADEV-IG',
      PLACEHOLDER_NUMAR_ADEVERINTA: '0042',
      PLACEHOLDER_DATA_ELIBERARE: '15.01.2026',
      PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Ing. Mihai Popescu',
    };

    doc.render(renderedData);
    const renderedZip = doc.getZip();
    const renderedXml = renderedZip.file('word/document.xml')?.asText() || '';

    // Check if rendered XML contains double "Nr. Nr." or "Nr. Aviz MS nr."
    const stutterAvizMs = /Nr\.\s*Nr\./i.test(renderedXml) || /Nr\.\s*Aviz\s+MS\s+nr\./i.test(renderedXml);
    // Check if rendered XML contains double "nivelul Nivelul"
    const stutterNivel = /nivelul\s+Nivelul/i.test(renderedXml);

    if (!stutterAvizMs && !stutterNivel) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({
        name: 'Adeverinta participare rendered stutter check',
        input: renderedData,
        expected: 'No "Nr. Nr." or "nivelul Nivelul" stutter',
        actual: `stutterAvizMs=${stutterAvizMs}, stutterNivel=${stutterNivel}`,
        description: stutterNivel
          ? 'Rendered document contains stutter: "nivelul Nivelul 1" because resolveHygieneLevel returns "Nivelul 1" while template already says "nivelul"'
          : 'Rendered document contains authorization stutter',
        severity: stutterNivel ? 'HIGH' : 'CRITICAL',
      });
    }
  } catch (err: any) {
    r.failed++;
    r.failures.push({
      name: 'Render Adeverinta test error',
      input: '',
      expected: 'Render successfully',
      actual: err.message,
      description: err.message,
      severity: 'CRITICAL',
    });
  }

  // 3. Render DECIZII.docx and check salutations
  r.total++;
  try {
    const deciziiPath = path.join(normalizedDir, 'DECIZII.docx');
    const deciziiZip = new PizZip(fs.readFileSync(deciziiPath, 'binary'));
    const doc = new Docxtemplater(deciziiZip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
    });

    const deciziiData = {
      ...ALL_ROMANIAN_LEGAL_FALLBACKS,
      PLACEHOLDER_FIRMA: 'TEST COMP S.R.L.',
      PLACEHOLDER_CUI: 'RO12345678',
      PLACEHOLDER_REPREZENTANT_LEGAL: 'Elena Vasilescu',
      PLACEHOLDER_APELATIV_ADMINISTRATOR: detectRomanianSalutation('Elena Vasilescu'),
      PLACEHOLDER_RESPONSABIL_PSI: 'Gheorghe Barbu',
      PLACEHOLDER_APELATIV_PSI: detectRomanianSalutation('Gheorghe Barbu'),
      PLACEHOLDER_MEMBRU_COMISIE: 'Elena Vasilescu, Alexandru Stan',
      PLACEHOLDER_APELATIV_MEMBRU_COMISIE: detectRomanianSalutation('Elena Vasilescu, Alexandru Stan'),
    };

    doc.render(deciziiData);
    const renderedZip = doc.getZip();
    const renderedXml = renderedZip.file('word/document.xml')?.asText() || '';

    // Verify salutations: regular text in one run, name in next bold run
    const plainText = renderedXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const hasAdminSalutation = plainText.includes('Dna. Elena Vasilescu');
    const hasPsiSalutation = plainText.includes('Dl. Gheorghe Barbu');
    const hasMemberSalutation = plainText.includes('Dna. Elena Vasilescu, Alexandru Stan');

    if (hasAdminSalutation && hasPsiSalutation && hasMemberSalutation) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({
        name: 'DECIZII.docx: Dynamic Salutation Rendering',
        input: deciziiData,
        expected: 'Contains "Dna. Elena Vasilescu", "Dl. Gheorghe Barbu", and "Dna. Elena Vasilescu, Alexandru Stan"',
        actual: `hasAdmin=${hasAdminSalutation}, hasPsi=${hasPsiSalutation}, hasMember=${hasMemberSalutation}`,
        description: 'Dynamic salutation did not render as expected in DECIZII.docx',
        severity: 'HIGH',
      });
    }
  } catch (err: any) {
    r.failed++;
    r.failures.push({
      name: 'DECIZII render test error',
      input: '',
      expected: 'Render successfully',
      actual: err.message,
      description: err.message,
      severity: 'CRITICAL',
    });
  }

  // 4. Missing Optional Variables & XML Special Characters in Anexa fisa postului SSM.docx
  r.total++;
  try {
    const fisaPath = path.join(normalizedDir, 'Anexa fisa postului SSM.docx');
    const fisaZip = new PizZip(fs.readFileSync(fisaPath, 'binary'));
    const doc = new Docxtemplater(fisaZip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
    });

    // Test with XML special characters & empty optional variables
    const fisaData = {
      PLACEHOLDER_FIRMA: 'TEST & PARTNERS <S.R.L.>',
      PLACEHOLDER_CUI: 'RO12345678',
      PLACEHOLDER_FUNCTIE: 'Consultant "Special" SSM',
      PLACEHOLDER_NUME_COMPLET: 'Ion Popescu',
      PLACEHOLDER_DATA_SEMNARII: '15.01.2026',
      // Optional variables left undefined
      PLACEHOLDER_COD_COR: undefined,
      PLACEHOLDER_NUMAR_CIM: undefined,
      PLACEHOLDER_DATA_CIM: undefined,
    };

    doc.render(fisaData);
    const renderedZip = doc.getZip();
    const renderedXml = renderedZip.file('word/document.xml')?.asText() || '';

    // Verify XML special characters were escaped properly by docxtemplater
    const escapedFirma = renderedXml.includes('TEST &amp; PARTNERS &lt;S.R.L.&gt;');
    // Verify missing optional placeholders are retained as {PLACEHOLDER_...}
    const retainedCim = renderedXml.includes('{PLACEHOLDER_NUMAR_CIM}');

    if (escapedFirma && retainedCim) {
      r.passed++;
    } else {
      r.failed++;
      r.failures.push({
        name: 'Anexa fisa postului: XML escaping and missing variable retention',
        input: fisaData,
        expected: 'XML escaped properly and missing optional placeholders retained cleanly',
        actual: `escapedFirma=${escapedFirma}, retainedCim=${retainedCim}`,
        description: 'Failed XML escaping or placeholder retention',
        severity: 'HIGH',
      });
    }
  } catch (err: any) {
    r.failed++;
    r.failures.push({
      name: 'Fisa postului render error',
      input: '',
      expected: 'Render successfully',
      actual: err.message,
      description: err.message,
      severity: 'CRITICAL',
    });
  }
});

// ============================================================================
// SUMMARY EXECUTION & REPORTING
// ============================================================================
console.log('================================================================');
console.log('           EMPIRICAL CHALLENGER 1 STRESS TEST RESULTS           ');
console.log('================================================================\n');

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

for (const rep of reports) {
  totalTests += rep.total;
  totalPassed += rep.passed;
  totalFailed += rep.failed;
  console.log(`[SUITE] ${rep.suite}`);
  console.log(`  Total: ${rep.total} | Passed: ${rep.passed} | Failed: ${rep.failed}`);
  if (rep.failures.length > 0) {
    console.log(`  Failures (${rep.failures.length}):`);
    for (const f of rep.failures) {
      console.log(`    - [${f.severity}] ${f.name}`);
      console.log(`      Input:    ${JSON.stringify(f.input)}`);
      console.log(`      Expected: ${JSON.stringify(f.expected)}`);
      console.log(`      Actual:   ${JSON.stringify(f.actual)}`);
      console.log(`      Reason:   ${f.description}`);
    }
  }
  console.log('');
}

console.log('----------------------------------------------------------------');
console.log(`OVERALL: Total: ${totalTests} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
console.log('----------------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
