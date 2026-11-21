import { prisma } from '../src/lib/prisma';
import { calculateEmployeeCompliance, addMonthsSafe, COMPLIANCE_CONSTANTS } from '../src/lib/compliance';

async function verify() {
  console.log('================================================================================');
  console.log('  TEST VERIFICARE CONFORMITATE IGIENĂ 3 ANI & MULTI-MODULE (ORDIN 2209/2022)');
  console.log('================================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASSED: ${msg}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Test Date Math: 36 Months / 3 Years with Leap Year Support
  console.log('\n[TEST 1] Verificare calcul 36 luni (3 ani) conform art. 20 Ordin 2209/2022:');
  const d1 = new Date('2026-11-21T00:00:00.000Z');
  const due1 = addMonthsSafe(d1, COMPLIANCE_CONSTANTS.DEFAULT_HYGIENE_INTERVAL);
  assert(due1.getFullYear() === 2029 && due1.getMonth() === 10 && due1.getDate() === 21, '21.11.2026 + 36 luni -> 21.11.2029');

  const leapFeb = new Date('2024-02-29T00:00:00.000Z');
  const dueLeap = addMonthsSafe(leapFeb, 36);
  assert(dueLeap.getFullYear() === 2027 && dueLeap.getMonth() === 1 && dueLeap.getDate() === 28, '29.02.2024 (an bisect) + 36 luni -> 28.02.2027 (clamped)');

  // 2. Test Multi-Module Calculation on Synthetic Employee
  console.log('\n[TEST 2] Verificare salariat cu multiple module la date diferite:');
  const syntheticEmployee = {
    id: 'test-synth-1',
    fullName: 'Ionescu Vasile',
    status: 'ACTIV',
    hygieneRequested: true,
    hygieneModules: [
      {
        id: 'mod-1',
        moduleName: 'Modulul 1 - Servicii de alimentație publică și colectivă',
        examDate: new Date('2023-10-15T00:00:00.000Z'),
        certificateNumber: 'DSP-2023-1111',
        intervalMonths: 36,
      },
      {
        id: 'mod-2',
        moduleName: 'Modulul 2 - Servicii de curățenie în unități sanitare, colectivități copii, cazare',
        examDate: new Date('2026-11-01T00:00:00.000Z'),
        certificateNumber: '881199',
        intervalMonths: 36,
      },
    ],
  };

  const refDate = new Date('2026-11-21T00:00:00.000Z');
  const synthComp = calculateEmployeeCompliance(syntheticEmployee, refDate);

  assert(synthComp.hygieneCertificate !== null, 'Cursul de igienă este aplicabil');
  assert(synthComp.hygieneCertificate?.status === 'OVERDUE', 'Starea generală de igienă este OVERDUE dacă 1 modul este expirat');
  assert(synthComp.hygieneCertificate?.modules?.length === 2, 'Ambii module sunt prezente în rezultat');

  const m1 = synthComp.hygieneCertificate?.modules?.find(m => m.moduleName.includes('Modulul 1'));
  const m2 = synthComp.hygieneCertificate?.modules?.find(m => m.moduleName.includes('Modulul 2'));

  assert(m1?.status === 'OVERDUE', 'Modulul 1 (promovat în 2023) este expirat');
  assert(m2?.status === 'VALID', 'Modulul 2 (promovat în 2026) este valid');
  assert(synthComp.hygieneCertificate?.dueDate?.toISOString().slice(0, 10) === '2026-10-15', 'Data scadenței afișată reflectă cel mai critic modul (2026-10-15)');

  // 3. Test Multi-Module Calculation with All Valid Modules
  console.log('\n[TEST 3] Verificare salariat cu toate modulele valide la date diferite:');
  const allValidEmployee = {
    id: 'test-synth-2',
    fullName: 'Popa Elena',
    status: 'ACTIV',
    hygieneRequested: true,
    hygieneModules: [
      {
        id: 'mod-1',
        moduleName: 'Modulul 1 - Alimentație',
        examDate: new Date('2025-05-10T00:00:00.000Z'),
        certificateNumber: '10442',
        intervalMonths: 36,
      },
      {
        id: 'mod-2',
        moduleName: 'Modulul 2 - Curățenie',
        examDate: new Date('2026-06-20T00:00:00.000Z'),
        certificateNumber: '881125',
        intervalMonths: 36,
      },
    ],
  };

  const validComp = calculateEmployeeCompliance(allValidEmployee, refDate);
  assert(validComp.hygieneCertificate?.status === 'VALID', 'Toate modulele valide -> Status general VALID');
  assert(validComp.hygieneCertificate?.dueDate?.toISOString().slice(0, 10) === '2028-05-10', 'Data scadenței generale reflectă prima scadență viitoare (10.05.2028)');

  // 4. Test Real Database Data for Andreea Marin and Radu Marius
  console.log('\n[TEST 4] Verificare date reale din baza de date (Bistro Gourmet):');
  const empMarin = await prisma.employee.findFirst({
    where: { cnp: '2950920410044' },
    include: {
      hygieneModules: true,
      hygieneParticipants: { include: { session: true } },
    },
  });

  const empRadu = await prisma.employee.findFirst({
    where: { cnp: '1820815410097' },
    include: {
      hygieneModules: true,
      hygieneParticipants: { include: { session: true } },
    },
  });

  assert(Boolean(empMarin), 'Andreea Marin există în DB');
  assert(Boolean(empRadu), 'Radu Marius există în DB');

  if (empMarin) {
    const compMarin = calculateEmployeeCompliance(empMarin, refDate);
    console.log(`    -> Andreea Marin: Status Igienă = ${compMarin.hygieneCertificate?.status}, Scadent: ${compMarin.hygieneCertificate?.dueDate?.toISOString().slice(0, 10)}, Module: ${compMarin.hygieneCertificate?.modules?.length}`);
    assert(compMarin.hygieneCertificate?.status === 'OVERDUE', 'Andreea Marin are Modulul 1 expirat (scadent 20.11.2026) -> Status OVERDUE');
    assert((compMarin.hygieneCertificate?.modules?.length ?? 0) >= 2, 'Andreea Marin are cel puțin 2 module înregistrate');
  }

  if (empRadu) {
    const compRadu = calculateEmployeeCompliance(empRadu, refDate);
    console.log(`    -> Radu Marius: Status Igienă = ${compRadu.hygieneCertificate?.status}, Scadent: ${compRadu.hygieneCertificate?.dueDate?.toISOString().slice(0, 10)}, Module: ${compRadu.hygieneCertificate?.modules?.length}`);
    assert(compRadu.hygieneCertificate?.status === 'VALID', 'Radu Marius are modulele valide (2028 și 2029) -> Status VALID');
    assert(compRadu.hygieneCertificate?.dueDate?.toISOString().slice(0, 10) === '2028-04-10', 'Scadența reflectă corect cel mai apropiat modul (10.04.2028, nu 2029)');
  }

  console.log('\n================================================================================');
  console.log(`  REZULTAT FINAL: ${passedTests}/${totalTests} teste trecute cu succes (100%)!`);
  console.log('================================================================================');
}

verify()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
