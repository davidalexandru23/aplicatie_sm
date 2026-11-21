import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../src/lib/auth';
import { 
  ROLE_CONFIG, 
  isRouteAllowedForRole, 
  getDefaultRouteForRole, 
  sanitizeEmployeeForRole,
  UserRole
} from '../src/lib/rbac';

async function main() {
  console.log('====================================================');
  console.log('🚀 TEST VERIFICARE RBAC (4 ROLURI: ADMIN, SSM, HR, IGIENA)');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Password hashing & verification
  console.log('--- 1. Autentificare & Criptografie Parole ---');
  const pwd = 'TestSecretPassword2026!';
  const hash = hashPassword(pwd);
  assert(verifyPassword(pwd, hash), 'Parola corectă este verificată cu succes');
  assert(!verifyPassword('WrongPassword', hash), 'Parola greșită este respinsă');

  // TEST 2: Session Token signing and verification
  console.log('\n--- 2. Semnare & Validare Sesiune JWT HMAC-SHA256 ---');
  const token = signSessionToken({
    userId: 'usr_test_123',
    email: 'ssm@ssm.ro',
    role: 'SSM',
    name: 'Specialist SSM',
  });
  const decoded = verifySessionToken(token);
  assert(decoded !== null, 'Tokenul de sesiune este valid');
  assert(decoded?.role === 'SSM', 'Rolul din token este corect (SSM)');
  assert(decoded?.email === 'ssm@ssm.ro', 'Emailul din token este corect');

  // TEST 3: Utilizatori în Baza de Date
  console.log('\n--- 3. Verificare Utilizatori Pre-configurați în DB ---');
  const users = await prisma.user.findMany();
  const emails = users.map((u) => u.email);
  assert(emails.includes('admin@ssm.ro'), 'Utilizatorul admin@ssm.ro există în DB');
  assert(emails.includes('ssm@ssm.ro'), 'Utilizatorul ssm@ssm.ro există în DB');
  assert(emails.includes('hr@ssm.ro'), 'Utilizatorul hr@ssm.ro există în DB');
  assert(emails.includes('igiena@ssm.ro'), 'Utilizatorul igiena@ssm.ro există în DB');

  for (const user of users) {
    assert(user.isActive === true, `Utilizatorul ${user.email} (${user.role}) este activ`);
    assert(user.username === 'dev', `Utilizatorul ${user.email} are username-ul 'dev'`);
    assert(verifyPassword('1234', user.passwordHash), `Parola '1234' este validă pentru utilizatorul ${user.email} (${user.role})`);
  }

  // TEST 4: Matrice de permisiuni rute per rol
  console.log('\n--- 4. Verificare Matrice Permisiuni Rute (isRouteAllowedForRole) ---');
  // ADMIN
  assert(isRouteAllowedForRole('/', 'ADMIN'), 'ADMIN are acces la /');
  assert(isRouteAllowedForRole('/employees', 'ADMIN'), 'ADMIN are acces la /employees');
  assert(isRouteAllowedForRole('/imports/new', 'ADMIN'), 'ADMIN are acces la /imports/new');
  assert(isRouteAllowedForRole('/hygiene', 'ADMIN'), 'ADMIN are acces la /hygiene');
  assert(isRouteAllowedForRole('/risk-assessments', 'ADMIN'), 'ADMIN are acces la /risk-assessments');

  // SSM
  assert(isRouteAllowedForRole('/', 'SSM'), 'SSM are acces la /');
  assert(isRouteAllowedForRole('/employees', 'SSM'), 'SSM are acces la /employees');
  assert(isRouteAllowedForRole('/risk-assessments', 'SSM'), 'SSM are acces la /risk-assessments');
  assert(isRouteAllowedForRole('/trainings', 'SSM'), 'SSM are acces la /trainings');
  assert(isRouteAllowedForRole('/templates', 'SSM'), 'SSM are acces la /templates');
  assert(!isRouteAllowedForRole('/imports/new', 'SSM'), 'SSM NU are acces la /imports/new');
  assert(!isRouteAllowedForRole('/hygiene', 'SSM'), 'SSM NU are acces la /hygiene');

  // HR
  assert(isRouteAllowedForRole('/', 'HR'), 'HR are acces la /');
  assert(isRouteAllowedForRole('/employees', 'HR'), 'HR are acces la /employees');
  assert(isRouteAllowedForRole('/imports/new', 'HR'), 'HR are acces la /imports/new');
  assert(!isRouteAllowedForRole('/hygiene', 'HR'), 'HR NU are acces la /hygiene');
  assert(!isRouteAllowedForRole('/risk-assessments', 'HR'), 'HR NU are acces la /risk-assessments');
  assert(!isRouteAllowedForRole('/trainings', 'HR'), 'HR NU are acces la /trainings');

  // IGIENA
  assert(isRouteAllowedForRole('/hygiene', 'IGIENA'), 'IGIENA are acces la /hygiene');
  assert(isRouteAllowedForRole('/documents', 'IGIENA'), 'IGIENA are acces la /documents');
  assert(isRouteAllowedForRole('/settings', 'IGIENA'), 'IGIENA are acces la /settings');
  assert(!isRouteAllowedForRole('/employees', 'IGIENA'), 'IGIENA NU are acces la /employees');
  assert(!isRouteAllowedForRole('/clients', 'IGIENA'), 'IGIENA NU are acces la /clients');
  assert(!isRouteAllowedForRole('/imports/new', 'IGIENA'), 'IGIENA NU are acces la /imports/new');
  assert(!isRouteAllowedForRole('/risk-assessments', 'IGIENA'), 'IGIENA NU are acces la /risk-assessments');
  assert(!isRouteAllowedForRole('/trainings', 'IGIENA'), 'IGIENA NU are acces la /trainings');

  // TEST 5: Landing route per rol
  console.log('\n--- 5. Rute Implicite de Redirecționare (getDefaultRouteForRole) ---');
  assert(getDefaultRouteForRole('ADMIN') === '/', 'Ruta implicită ADMIN este /');
  assert(getDefaultRouteForRole('SSM') === '/', 'Ruta implicită SSM este /');
  assert(getDefaultRouteForRole('HR') === '/employees', 'Ruta implicită HR este /employees');
  assert(getDefaultRouteForRole('IGIENA') === '/hygiene', 'Ruta implicită IGIENA este /hygiene');

  // TEST 6: Sanitizare date salariați (Data Protection & Privacy)
  console.log('\n--- 6. Sanitizare Date Salariați (sanitizeEmployeeForRole) ---');
  const mockEmployee = {
    id: 'emp_001',
    firstName: 'Ion',
    lastName: 'Popescu',
    cnp: '1850412123456',
    grossSalary: 6500,
    cimNumber: '450/2022',
    bankIban: 'RO49INGB0000999901234567',
    bankName: 'ING Bank',
    shoeSize: 43,
    clothingSize: 'L',
    gloveSize: 9,
    identityDocument: {
      docType: 'CI',
      series: 'RX',
      number: '123456',
    },
    residenceAddress: {
      county: 'București',
      locality: 'Sector 3',
      street: 'Str. Libertății nr. 10',
    },
  };

  // Sanitizare pentru SSM
  const ssmView = sanitizeEmployeeForRole(mockEmployee, 'SSM');
  assert(ssmView.cnp === null, 'SSM: CNP este complet null/mascat');
  assert(ssmView.grossSalary === null, 'SSM: Salariul brut este complet ascuns (null)');
  assert(ssmView.cimNumber === null, 'SSM: Numărul CIM este ascuns (null)');
  assert(ssmView.bankIban === null, 'SSM: IBAN-ul bancar este ascuns (null)');
  assert(ssmView.identityDocument === null, 'SSM: Documentul de identitate este ascuns (null)');
  assert(ssmView.shoeSize === 43, 'SSM: Mărimea pantofi EIP este păstrată');
  assert(ssmView.clothingSize === 'L', 'SSM: Mărimea haine EIP este păstrată');
  assert(ssmView.residenceAddress !== null, 'SSM: Adresa de domiciliu este păstrată (risc traseu/deplasare)');

  // Sanitizare pentru HR
  const hrView = sanitizeEmployeeForRole(mockEmployee, 'HR');
  assert(hrView.cnp === '1850412123456', 'HR: CNP este accesibil');
  assert(hrView.grossSalary === 6500, 'HR: Salariul brut este accesibil');
  assert(hrView.cimNumber === '450/2022', 'HR: Numărul CIM este accesibil');
  assert(hrView.bankIban === 'RO49INGB0000999901234567', 'HR: IBAN este accesibil');
  assert(hrView.identityDocument?.number === '123456', 'HR: Seria și numărul actului sunt accesibile');

  // Sanitizare pentru ADMIN
  const adminView = sanitizeEmployeeForRole(mockEmployee, 'ADMIN');
  assert(adminView.cnp === '1850412123456', 'ADMIN: CNP este accesibil');
  assert(adminView.grossSalary === 6500, 'ADMIN: Salariul este accesibil');

  // Sanitizare pentru IGIENA
  const igienaView = sanitizeEmployeeForRole(mockEmployee, 'IGIENA');
  assert(igienaView.grossSalary === null, 'IGIENA: Salariul este ascuns');
  assert(igienaView.cimNumber === null, 'IGIENA: CIM este ascuns');

  console.log('\n====================================================');
  console.log(`🎯 REZULTAT FINAL: ${passedTests}/${totalTests} teste au trecut cu succes!`);
  console.log('====================================================\n');
}

main()
  .catch((err) => {
    console.error('Fatal error during verification:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
