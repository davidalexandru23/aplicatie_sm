import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { validateCNP } from '../src/lib/importer';

async function generateTestExcel() {
  console.log('Generating test Excel file with 3 employees...');

  const templatePath = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at ${templatePath}`);
  }

  const wb = XLSX.readFile(templatePath);

  // 1. Foia Firmă și angajați
  const sFirm = wb.Sheets['Firmă și angajați'];

  // Date Firmă
  sFirm['B5'] = { t: 's', v: 'NEXUS SOLUTIONS S.R.L.' };
  sFirm['B6'] = { t: 's', v: 'RO38765432' };
  sFirm['B7'] = { t: 's', v: 'J40/5678/2021' };
  sFirm['B8'] = { t: 's', v: 'București, Bd. Aviatorilor nr. 45, Sector 1' };
  sFirm['E5'] = { t: 's', v: 'Munteanu Cristian' };
  sFirm['E6'] = { t: 's', v: 'Simona Georgescu' };
  sFirm['E7'] = { t: 's', v: 'contact@nexus-solutions.ro' };
  sFirm['E8'] = { t: 's', v: '0722334455' };

  const setCell = (sheet: XLSX.WorkSheet, r: number, c: number, val: any, type: string = 's') => {
    const ref = XLSX.utils.encode_cell({ r, c });
    sheet[ref] = { t: type, v: val };
  };

  // Angajat 1 (Inginer Sisteme Software)
  const cnp1 = '1880315410127';
  if (!validateCNP(cnp1)) throw new Error('CNP 1 invalid!');

  setCell(sFirm, 12, 0, 'Stan');
  setCell(sFirm, 12, 1, 'Alexandru');
  setCell(sFirm, 12, 2, 'M');
  setCell(sFirm, 12, 3, cnp1);
  setCell(sFirm, 12, 4, '15.03.1988');
  setCell(sFirm, 12, 5, 'București');
  setCell(sFirm, 12, 6, 'Sector 1');
  setCell(sFirm, 12, 7, 'Română');
  setCell(sFirm, 12, 8, 'CI');
  setCell(sFirm, 12, 9, 'RD');
  setCell(sFirm, 12, 10, '876543');
  setCell(sFirm, 12, 11, 'SPCLEP S1');
  setCell(sFirm, 12, 12, '10.04.2021');
  setCell(sFirm, 12, 13, '15.03.2031');
  setCell(sFirm, 12, 14, 'București');
  setCell(sFirm, 12, 15, 'București');
  setCell(sFirm, 12, 16, 'Str. Dorobanți');
  setCell(sFirm, 12, 17, '24');
  setCell(sFirm, 12, 18, 'B2');
  setCell(sFirm, 12, 19, 'A');
  setCell(sFirm, 12, 20, '4');
  setCell(sFirm, 12, 21, '18');
  setCell(sFirm, 12, 22, 'alexandru.stan@nexus-solutions.ro');
  setCell(sFirm, 12, 23, '0744111222');
  setCell(sFirm, 12, 24, 'Inginer Sisteme Software');
  setCell(sFirm, 12, 25, 'Sediul Central');
  setCell(sFirm, 12, 26, '15.01.2026');
  setCell(sFirm, 12, 27, '15.01.2026');
  setCell(sFirm, 12, 28, 'ACTIV');
  setCell(sFirm, 12, 29, '');
  setCell(sFirm, 12, 30, 'DA');
  setCell(sFirm, 12, 31, 'Modulul 1 - Servicii Generale');
  setCell(sFirm, 12, 32, 'Noiembrie 2026');
  setCell(sFirm, 12, 33, 'Normă întreagă 8h/zi');

  // Angajat 2 (Specialist Resurse Umane)
  const cnp2 = '2941124120456';
  if (!validateCNP(cnp2)) throw new Error('CNP 2 invalid!');

  setCell(sFirm, 13, 0, 'Dumitru');
  setCell(sFirm, 13, 1, 'Ioana-Raluca');
  setCell(sFirm, 13, 2, 'F');
  setCell(sFirm, 13, 3, cnp2);
  setCell(sFirm, 13, 4, '24.11.1994');
  setCell(sFirm, 13, 5, 'Cluj-Napoca');
  setCell(sFirm, 13, 6, 'Cluj');
  setCell(sFirm, 13, 7, 'Română');
  setCell(sFirm, 13, 8, 'CI');
  setCell(sFirm, 13, 9, 'KX');
  setCell(sFirm, 13, 10, '234567');
  setCell(sFirm, 13, 11, 'SPCLEP Cluj');
  setCell(sFirm, 13, 12, '05.12.2019');
  setCell(sFirm, 13, 13, '24.11.2029');
  setCell(sFirm, 13, 14, 'Ilfov');
  setCell(sFirm, 13, 15, 'Otopeni');
  setCell(sFirm, 13, 16, 'Str. 23 August');
  setCell(sFirm, 13, 17, '112');
  setCell(sFirm, 13, 18, '');
  setCell(sFirm, 13, 19, '');
  setCell(sFirm, 13, 20, '');
  setCell(sFirm, 13, 21, '');
  setCell(sFirm, 13, 22, 'ioana.dumitru@nexus-solutions.ro');
  setCell(sFirm, 13, 23, '0755888999');
  setCell(sFirm, 13, 24, 'Specialist Resurse Umane');
  setCell(sFirm, 13, 25, 'Sediul Central');
  setCell(sFirm, 13, 26, '01.02.2026');
  setCell(sFirm, 13, 27, '01.02.2026');
  setCell(sFirm, 13, 28, 'ACTIV');
  setCell(sFirm, 13, 29, '');
  setCell(sFirm, 13, 30, 'NU');
  setCell(sFirm, 13, 31, '');
  setCell(sFirm, 13, 32, '');
  setCell(sFirm, 13, 33, 'Responsabil dosare personal');

  // Angajat 3 (Tehnician Mentenanță și Suport)
  const cnp3 = '1790608080231';
  if (!validateCNP(cnp3)) throw new Error('CNP 3 invalid!');

  setCell(sFirm, 14, 0, 'Barbu');
  setCell(sFirm, 14, 1, 'Gheorghe');
  setCell(sFirm, 14, 2, 'M');
  setCell(sFirm, 14, 3, cnp3);
  setCell(sFirm, 14, 4, '08.06.1979');
  setCell(sFirm, 14, 5, 'Brașov');
  setCell(sFirm, 14, 6, 'Brașov');
  setCell(sFirm, 14, 7, 'Română');
  setCell(sFirm, 14, 8, 'CI');
  setCell(sFirm, 14, 9, 'BV');
  setCell(sFirm, 14, 10, '456789');
  setCell(sFirm, 14, 11, 'SPCLEP Brasov');
  setCell(sFirm, 14, 12, '12.07.2018');
  setCell(sFirm, 14, 13, '08.06.2028');
  setCell(sFirm, 14, 14, 'București');
  setCell(sFirm, 14, 15, 'București');
  setCell(sFirm, 14, 16, 'Bd. Iuliu Maniu');
  setCell(sFirm, 14, 17, '78');
  setCell(sFirm, 14, 18, 'M3');
  setCell(sFirm, 14, 19, '2');
  setCell(sFirm, 14, 20, '1');
  setCell(sFirm, 14, 21, '35');
  setCell(sFirm, 14, 22, 'gheorghe.barbu@nexus-solutions.ro');
  setCell(sFirm, 14, 23, '0722999000');
  setCell(sFirm, 14, 24, 'Tehnician Mentenanță și Suport');
  setCell(sFirm, 14, 25, 'Punct de Lucru Vest');
  setCell(sFirm, 14, 26, '10.02.2026');
  setCell(sFirm, 14, 27, '10.02.2026');
  setCell(sFirm, 14, 28, 'ACTIV');
  setCell(sFirm, 14, 29, '');
  setCell(sFirm, 14, 30, 'DA');
  setCell(sFirm, 14, 31, 'Modulul 2 - Mentenanță și Instalații');
  setCell(sFirm, 14, 32, 'Decembrie 2026');
  setCell(sFirm, 14, 33, 'Echipament de protecție alocat');

  // Actualizare ref pentru sheet 2
  sFirm['!ref'] = 'A1:AH15';

  // 2. Foaia Context posturi
  const sCtx = wb.Sheets['Context posturi'];

  // Post 1
  setCell(sCtx, 4, 0, 'Sediul Central');
  setCell(sCtx, 4, 1, 'București, Bd. Aviatorilor nr. 45, Sector 1');
  setCell(sCtx, 4, 2, 'Consultanță, dezvoltare software și management');
  setCell(sCtx, 4, 3, 'Inginer Sisteme Software');
  setCell(sCtx, 4, 4, '251201');
  setCell(sCtx, 4, 5, 'Dezvoltare aplicații, analiză date, lucru la videoterminale');
  setCell(sCtx, 4, 6, 'Laptop, monitoare LCD, tastatură, mouse ergonomic');
  setCell(sCtx, 4, 7, 'Activitate de birou, climatizare, iluminat natural și artificial adecvat');
  setCell(sCtx, 4, 8, 5, 'n');

  // Post 2
  setCell(sCtx, 5, 0, 'Sediul Central');
  setCell(sCtx, 5, 1, 'București, Bd. Aviatorilor nr. 45, Sector 1');
  setCell(sCtx, 5, 2, 'Consultanță, dezvoltare software și management');
  setCell(sCtx, 5, 3, 'Specialist Resurse Umane');
  setCell(sCtx, 5, 4, '242314');
  setCell(sCtx, 5, 5, 'Recrutare, administrare personal, evidență SSM/HR, instruiri');
  setCell(sCtx, 5, 6, 'PC, imprimantă, telefon, dulap arhivă');
  setCell(sCtx, 5, 7, 'Activitate sedentară de birou, ecrane de vizualizare');
  setCell(sCtx, 5, 8, 2, 'n');

  // Post 3
  setCell(sCtx, 6, 0, 'Punct de Lucru Vest');
  setCell(sCtx, 6, 1, 'București, Bd. Iuliu Maniu nr. 78, Sector 6');
  setCell(sCtx, 6, 2, 'Laborator tehnic și mentenanță echipamente');
  setCell(sCtx, 6, 3, 'Tehnician Mentenanță și Suport');
  setCell(sCtx, 6, 4, '311305');
  setCell(sCtx, 6, 5, 'Verificare instalații, montaj echipamente hardware, mentenanță rețele');
  setCell(sCtx, 6, 6, 'Truse scule manuale și electrice izolate, multimetru');
  setCell(sCtx, 6, 7, 'Deplasări locale, lucru cu echipamente electrice de joasă tensiune, EIP necesar');
  setCell(sCtx, 6, 8, 3, 'n');

  sCtx['!ref'] = 'A1:I7';

  // Salvare fișier în 3 locații utile
  const out1 = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
  const out2 = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM_3_angajati.xlsx');
  const out3 = path.join(process.cwd(), 'public', 'Test_Client_3_Angajati.xlsx');

  XLSX.writeFile(wb, out1);
  XLSX.writeFile(wb, out2);
  XLSX.writeFile(wb, out3);

  console.log(`✓ Fișier salvat în:`);
  console.log(`  1. ${out1}`);
  console.log(`  2. ${out2}`);
  console.log(`  3. ${out3}`);
}

generateTestExcel()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error generating test Excel:', err);
    process.exit(1);
  });
