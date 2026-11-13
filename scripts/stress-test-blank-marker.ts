import { isBlankOrPlaceholderMarker } from '../src/lib/templates/generator';

interface TestCase {
  description: string;
  input: unknown;
  expected: boolean;
}

const TEST_CASES: TestCase[] = [
  // Prompt explicit required edge cases
  { description: 'Multiple dots and slashes', input: '........ / ............', expected: true },
  { description: 'Dots followed by currency unit', input: '........................ lei', expected: true },
  { description: 'Multiple dashes', input: '---', expected: true },
  { description: 'Whitespace only', input: '   ', expected: true },
  { description: 'Empty string', input: '', expected: true },
  { description: 'Statutory missing marker with diacritics', input: '[LIPSĂ DATE]', expected: true },
  { description: 'Not Applicable marker uppercase', input: 'N/A', expected: true },
  { description: 'Raw placeholder token with prefix', input: 'PLACEHOLDER_TEST', expected: true },
  { description: 'Genuine Romanian employee name', input: 'Popescu Ion', expected: false },
  { description: 'Genuine salary with currency unit', input: '5000 lei', expected: false },
  { description: 'Genuine Romanian street address with dots/numbers', input: 'Str. Livezilor nr. 12', expected: false },

  // Additional adversarial blanks & placeholders
  { description: 'Raw placeholder with curly braces', input: '{PLACEHOLDER_TEST}', expected: true },
  { description: 'Raw statutory CIM placeholder', input: 'PLACEHOLDER_NUMAR_CIM', expected: true },
  { description: 'Raw statutory salary placeholder', input: '{PLACEHOLDER_SALARIU_BRUT}', expected: true },
  { description: 'Missing marker without brackets', input: 'LIPSA DATE', expected: true },
  { description: 'Missing marker without diacritics', input: '[LIPSA DATE]', expected: true },
  { description: 'Programming undefined marker', input: 'UNDEFINED', expected: true },
  { description: 'Programming null marker', input: 'NULL', expected: true },
  { description: 'Romanian unknown marker', input: 'NECUNOSCUT', expected: true },
  { description: 'N/A lowercase', input: 'n/a', expected: true },
  { description: 'N/A mixed case', input: 'N/a', expected: true },
  { description: 'Triple dots ellipsis', input: '...', expected: true },
  { description: 'Unicode horizontal ellipsis', input: '…', expected: true },
  { description: 'Dash and slash pattern', input: '- / -', expected: true },
  { description: 'Double dash and slash pattern', input: '-- / -- / --', expected: true },
  { description: 'En-dash and em-dash sequence', input: '– — –', expected: true },
  { description: 'Triple underscores', input: '___', expected: true },
  { description: 'Short dot pattern with lei', input: '.... lei', expected: true },
  { description: 'Short dot pattern with ron', input: '.... ron', expected: true },
  { description: 'Short dot pattern with luni', input: '.... luni', expected: true },
  { description: 'Short dot pattern with zile', input: '.... zile', expected: true },
  { description: 'Short dot pattern with ore', input: '.... ore', expected: true },
  { description: 'Short dot pattern with ani', input: '.... ani', expected: true },
  { description: 'Uppercase unit RON', input: '........ RON', expected: true },
  { description: 'Uppercase unit LUNI', input: '........ LUNI', expected: true },
  { description: 'Null primitive', input: null, expected: true },
  { description: 'Undefined primitive', input: undefined, expected: true },

  // Genuine non-blanks across Romanian statutory domains
  { description: 'Company name standard', input: 'SC EXEMPLU SRL', expected: false },
  { description: 'Company name with ampersand', input: 'B & B SECURITY S.R.L.', expected: false },
  { description: 'Company name with hyphen', input: 'AGRO-INDUSTRIAL S.A.', expected: false },
  { description: 'CUI with RO prefix', input: 'RO12345678', expected: false },
  { description: 'CUI numeric only', input: '12345678', expected: false },
  { description: 'RegCom with slashes and letters', input: 'J40/123/2020', expected: false },
  { description: 'Complex apartment address', input: 'Str. Libertății nr. 10, bl. A, ap. 5', expected: false },
  { description: 'Address with boulevard and sector', input: 'Bdul. 1 Mai nr. 22, Sector 6, București', expected: false },
  { description: 'Salary in RON', input: '6500 RON', expected: false },
  { description: 'Formatted salary with dots and commas', input: '10.500,00 lei', expected: false },
  { description: 'Zero salary edge case', input: '0 lei', expected: false },
  { description: 'Numeric zero', input: 0, expected: false },
  { description: 'String zero', input: '0', expected: false },
  { description: 'Boolean false', input: false, expected: false },
  { description: 'Duration in months', input: '3 luni', expected: false },
  { description: 'Probation period in days', input: '90 zile', expected: false },
  { description: 'Daily work norm in hours', input: '8 ore', expected: false },
  { description: 'Weekly work norm', input: '40 ore/săptămână', expected: false },
  { description: 'Medical validity in years', input: '2 ani', expected: false },
  { description: 'Medical fitness verdict', input: 'Apt condiționat', expected: false },
  { description: 'Doctor name with title', input: 'Dr. Popa Vasile', expected: false },
  { description: 'Decision number with slash', input: 'Decizia nr. 1/2026', expected: false },
  { description: 'CIM registration number with date', input: '123/15.01.2026', expected: false },
  { description: 'Law firm name with diacritics and ampersand', input: 'Popescu & Asociații S.R.L.', expected: false },
  { description: 'Street name with date and hyphenated numbers', input: 'Str. 1 Decembrie 1918, nr. 4-6', expected: false },
  { description: 'Negative temperature / number', input: '-500 lei', expected: false },
  { description: 'Identity card series and number', input: 'RX 123456', expected: false },
  { description: 'Numeric CNP 13 digits', input: '1880315410127', expected: false },
  { description: 'Worksite with slash', input: 'Sediu social / Depozit', expected: false },
  { description: 'Job title with slash and ampersand', input: 'Bucătar / Barman & Ospătar', expected: false },
];

let failures = 0;

console.log('========================================================================================');
console.log('EMPIRICAL STRESS TEST HARNESS: isBlankOrPlaceholderMarker (Edge Cases & Invariants)');
console.log('========================================================================================\n');

for (const tc of TEST_CASES) {
  const actual = isBlankOrPlaceholderMarker(tc.input);
  const pass = actual === tc.expected;
  if (!pass) {
    failures++;
    console.error(`✗ FAIL: ${tc.description}`);
    console.error(`  Input:    ${JSON.stringify(tc.input)}`);
    console.error(`  Expected: ${tc.expected}`);
    console.error(`  Actual:   ${actual}\n`);
  } else {
    // console.log(`✓ PASS: ${tc.description} (${JSON.stringify(tc.input)} -> ${actual})`);
  }
}

console.log(`Results: ${TEST_CASES.length - failures}/${TEST_CASES.length} tests passed.`);

if (failures > 0) {
  console.error(`\nFAILED: ${failures} assertions failed.`);
  process.exit(1);
} else {
  console.log('✓ ALL 67 isBlankOrPlaceholderMarker TESTS PASSED WITH 100% ACCURACY!');
  process.exit(0);
}
