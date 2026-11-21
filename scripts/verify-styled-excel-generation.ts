import fs from 'fs';
import path from 'path';
import zipfile from 'node:zlib'; // or check via exceljs
import ExcelJS from 'exceljs';
import { prisma } from '../src/lib/prisma';
import { exportClientToExcel } from '../src/lib/exporter';
import { parseClientWorkbook } from '../src/lib/importer';
import {
  buildHygieneCatalogWorkbook,
  buildHygieneParticipantsTableWorkbook,
} from '../src/lib/templates/hygiene-excel';

async function checkBufferStyles(buffer: Buffer, name: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  console.log(`\n--- Verification for: ${name} (${buffer.length} bytes) ---`);
  console.log(`Sheet count: ${wb.worksheets.length}`);
  wb.worksheets.forEach((ws) => {
    let styledCellsCount = 0;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.fill || cell.font || cell.border) {
          styledCellsCount++;
        }
      });
    });
    console.log(
      `  Worksheet "${ws.name}": rows=${ws.rowCount}, cols=${ws.columnCount}, styledCells=${styledCellsCount}`
    );
  });
  return wb;
}

async function main() {
  console.log('Starting comprehensive Excel format and style verification...');

  // 1. Verify Blank Template
  const blankPath = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
  const blankBuf = fs.readFileSync(blankPath);
  const blankWb = await checkBufferStyles(blankBuf, 'Blank Template (Model_date_client_SSM.xlsx)');
  if (blankWb.worksheets.length !== 3) {
    throw new Error('Blank template must have exactly 3 sheets');
  }

  // 2. Verify Sample Template
  const samplePath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
  const sampleBuf = fs.readFileSync(samplePath);
  await checkBufferStyles(sampleBuf, 'Sample Template (Test_Client_3_Angajati.xlsx)');

  // 3. Verify Client Export from DB
  const client = await prisma.client.findFirst({
    where: { employees: { some: {} } },
    include: { employees: true },
  });
  if (!client) {
    throw new Error('No client with employees found in DB');
  }
  console.log(`Testing export for client: ${client.name} (ID: ${client.id}, employees: ${client.employees.length})`);
  const exportRes = await exportClientToExcel(client.id);
  const exportedWb = await checkBufferStyles(exportRes.buffer, `Exported Client: ${exportRes.filename}`);

  // Test re-importing the exported file
  console.log('Testing re-importing the exported client buffer via importer.ts...');
  const parsed = parseClientWorkbook(exportRes.buffer);
  console.log(`Parsed company: ${parsed.company.name}, CUI: ${parsed.company.cui}`);
  console.log(`Parsed employees: ${parsed.employees.length}, valid count: ${parsed.employees.filter((e) => e.isValid).length}`);
  if (parsed.employees.length !== client.employees.length) {
    throw new Error(`Exported employees count mismatch: expected ${client.employees.length}, got ${parsed.employees.length}`);
  }

  // 4. Verify Hygiene Catalog (8 Annexes)
  const hygieneSession = await prisma.hygieneSession.findFirst({
    include: {
      participants: {
        include: { employee: true },
      },
      client: true,
    },
  });

  const hygieneData = {
    providerName: 'UNIK BEST PROTECT S.R.L.',
    cui: '30891216',
    regCom: 'J40/1234/2020',
    address: 'București, România',
    representativeName: 'Administrator',
    sessionDate: '21.11.2026',
    examDate: '21.11.2026',
    participants: hygieneSession?.participants.map((p, idx) => ({
      fullName: p.employee ? `${p.employee.lastName} ${p.employee.firstName}` : `${p.lastName} ${p.firstName}`,
      cnp: p.employee?.cnp || p.cnp || '',
      identityDocument: 'CI RD 123456',
      birthDate: '15.03.1988',
      birthPlace: 'București',
      module: p.hygieneModule || 'Modulul 1 - Nivelul 2',
      examGrade: p.examGrade || '10',
      examResult: p.examResult || 'ADMIS',
      certificateNumber: p.certificateNumber || `2026-000${idx + 1}`,
    })) || [
      {
        fullName: 'Stan Alexandru',
        cnp: '1880315410127',
        identityDocument: 'CI RD 876543',
        birthDate: '15.03.1988',
        birthPlace: 'București',
        module: 'Modulul 1 - Nivelul 2',
        examGrade: '10',
        examResult: 'ADMIS',
        certificateNumber: '2026-0001',
      },
      {
        fullName: 'Barbu Gheorghe',
        cnp: '1790608080231',
        identityDocument: 'CI BV 456789',
        birthDate: '08.06.1979',
        birthPlace: 'Brașov',
        module: 'Modulul 2 - Curățenie',
        examGrade: '9.5',
        examResult: 'ADMIS',
        certificateNumber: '2026-0002',
      },
    ],
  };

  const catalogWb = buildHygieneCatalogWorkbook(hygieneData);
  const catalogBuf = Buffer.from(await catalogWb.xlsx.writeBuffer());
  const catalogLoaded = await checkBufferStyles(catalogBuf, 'Hygiene Catalogs (8 Annexes)');
  if (catalogLoaded.worksheets.length !== 8) {
    throw new Error(`Hygiene catalog must have 8 worksheets, got ${catalogLoaded.worksheets.length}`);
  }

  // 5. Verify Hygiene Participants Table
  const tableWb = buildHygieneParticipantsTableWorkbook(hygieneData);
  const tableBuf = Buffer.from(await tableWb.xlsx.writeBuffer());
  const tableLoaded = await checkBufferStyles(tableBuf, 'Hygiene Participants Table (Tabel Cursanți)');
  if (tableLoaded.worksheets.length !== 1) {
    throw new Error('Hygiene participants table must have 1 worksheet');
  }

  // Save artifacts to storage/test_documents/ for manual inspection if needed
  const testDir = path.join(process.cwd(), 'storage', 'test_documents');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'TEST_EXPORT_CLIENT_STYLED.xlsx'), exportRes.buffer);
  fs.writeFileSync(path.join(testDir, 'TEST_HYGIENE_CATALOG_STYLED.xlsx'), catalogBuf);
  fs.writeFileSync(path.join(testDir, 'TEST_HYGIENE_TABEL_STYLED.xlsx'), tableBuf);

  console.log('\nALL EXCEL FORMAT AND STYLE TESTS PASSED SUCCESSFULLY!');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
