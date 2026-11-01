import { prisma } from '../src/lib/prisma';
import { parseClientWorkbook, commitImport } from '../src/lib/importer';
import { generateDocument } from '../src/lib/templates/generator';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

async function runEndToEndTest() {
  console.log('=== START END-TO-END TEST: SSM APPLICATION ===\n');

  // 1. Create a synthetic test workbook based on Model_date_client_SSM.xlsx
  console.log('1. Creating synthetic test workbook...');
  const templatePath = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
  const wb = XLSX.readFile(templatePath);

  const sFirm = wb.Sheets['Firmă și angajați'];

  // Fill synthetic company data
  sFirm['B5'] = { t: 's', v: 'DEMO TECH SRL' };
  sFirm['B6'] = { t: 's', v: 'RO12345678' };
  sFirm['B7'] = { t: 's', v: 'J40/9999/2026' };
  sFirm['B8'] = { t: 's', v: 'București, Str. Progresului nr. 10, Sector 5' };
  sFirm['E5'] = { t: 's', v: 'Ionescu Mihai' };
  sFirm['E6'] = { t: 's', v: 'Popescu Elena' };
  sFirm['E7'] = { t: 's', v: 'contact@demotech.ro' };
  sFirm['E8'] = { t: 's', v: '0722123456' };

  // Fill synthetic employee row 1 (Row 13 in Excel, index r=12)
  const setCell = (r: number, c: number, val: any, type: string = 's') => {
    const ref = XLSX.utils.encode_cell({ r, c });
    sFirm[ref] = { t: type, v: val };
  };

  // Angajat 1 (ACTIV) - CNP cu cheie de control validă
  setCell(12, 0, 'Popescu'); // Nume
  setCell(12, 1, 'Andrei'); // Prenume
  setCell(12, 2, 'M'); // Sex
  setCell(12, 3, '1850412410013'); // CNP valid matematic
  setCell(12, 4, '12.04.1985'); // Data nasterii
  setCell(12, 5, 'București'); // Localitate nastere
  setCell(12, 6, 'Sector 1'); // Judet nastere
  setCell(12, 7, 'Română'); // Cetatenie
  setCell(12, 8, 'CI'); // Tip act
  setCell(12, 9, 'RX'); // Serie act
  setCell(12, 10, '123456'); // Numar act
  setCell(12, 11, 'SPCLEP S1'); // Emis de
  setCell(12, 12, '10.05.2020'); // Data emiterii
  setCell(12, 13, '12.04.2030'); // Data expirarii
  setCell(12, 14, 'București'); // Judet domiciliu
  setCell(12, 15, 'București'); // Localitate domiciliu
  setCell(12, 16, 'Calea Victoriei'); // Strada
  setCell(12, 17, '100'); // Numar
  setCell(12, 18, 'A1'); // Bloc
  setCell(12, 19, '1'); // Scara
  setCell(12, 20, '3'); // Etaj
  setCell(12, 21, '12'); // Apartament
  setCell(12, 22, 'andrei.popescu@demotech.ro'); // Email
  setCell(12, 23, '0733111222'); // Telefon
  setCell(12, 24, 'Inginer Software'); // Functie
  setCell(12, 25, 'Sediul Central'); // Punct de lucru
  setCell(12, 26, '01.02.2026'); // Inceput post
  setCell(12, 27, '01.02.2026'); // Angajare
  setCell(12, 28, 'ACTIV'); // Status
  setCell(12, 30, 'DA'); // Solicitare curs igiena
  setCell(12, 31, 'Modulul 1'); // Modul

  // Angajat 2 (ACTIV) - CNP cu cheie de control validă
  setCell(13, 0, 'Ionescu');
  setCell(13, 1, 'Maria');
  setCell(13, 2, 'F');
  setCell(13, 3, '2900720410021'); // CNP valid matematic
  setCell(13, 4, '20.07.1990');
  setCell(13, 5, 'Ploiești');
  setCell(13, 6, 'Prahova');
  setCell(13, 7, 'Română');
  setCell(13, 8, 'CI');
  setCell(13, 9, 'PX');
  setCell(13, 10, '654321');
  setCell(13, 11, 'SPCLEP Ploiesti');
  setCell(13, 12, '15.08.2021');
  setCell(13, 13, '20.07.2031');
  setCell(13, 14, 'Prahova');
  setCell(13, 15, 'Ploiești');
  setCell(13, 16, 'Str. Republicii');
  setCell(13, 17, '45');
  setCell(13, 24, 'Economist TESA');
  setCell(13, 25, 'Sediul Central');
  setCell(13, 27, '15.03.2026');
  setCell(13, 28, 'ACTIV');
  setCell(13, 30, 'NU');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  console.log('✓ Synthetic Excel buffer created successfully.\n');

  // 2. Test Parser
  console.log('2. Parsing synthetic workbook...');
  const parsed = parseClientWorkbook(buf);
  console.log(`✓ Parsed company: ${parsed.company.name} (CUI: ${parsed.company.cui})`);
  console.log(`✓ Parsed ${parsed.employees.length} employees (valid: ${parsed.employees.filter(e => e.isValid).length})`);

  // 3. Create or upsert Client in PostgreSQL
  console.log('\n3. Upserting Client in PostgreSQL via Prisma...');
  const client = await prisma.client.upsert({
    where: { cui: parsed.company.cui!.trim() },
    update: {
      name: parsed.company.name!,
      address: parsed.company.address!,
      regCom: parsed.company.regCom,
      legalRepresentative: parsed.company.legalRepresentative,
      contactPerson: parsed.company.contactPerson,
      contactEmail: parsed.company.contactEmail,
      contactPhone: parsed.company.contactPhone,
    },
    create: {
      name: parsed.company.name!,
      cui: parsed.company.cui!.trim(),
      address: parsed.company.address!,
      regCom: parsed.company.regCom,
      legalRepresentative: parsed.company.legalRepresentative,
      contactPerson: parsed.company.contactPerson,
      contactEmail: parsed.company.contactEmail,
      contactPhone: parsed.company.contactPhone,
    },
  });
  console.log(`✓ Client record created/updated: ${client.id} - ${client.name}`);

  // 4. Test Commit Import
  console.log('\n4. Committing import transactionally to database...');
  const batchId = await commitImport(client.id, parsed, 'Test Runner', 'Test_Model_date_client.xlsx');
  console.log(`✓ Import committed with Batch ID: ${batchId}`);

  // Verify in DB
  const empCount = await prisma.employee.count({ where: { clientId: client.id } });
  const worksiteCount = await prisma.worksite.count({ where: { clientId: client.id } });
  const jobCount = await prisma.job.count({ where: { clientId: client.id } });
  console.log(`✓ DB Verification: ${empCount} employees, ${worksiteCount} worksites, ${jobCount} jobs.`);

  // 5. Test Document Generation for multiple templates
  console.log('\n5. Testing Document Generation:');

  const employees = await prisma.employee.findMany({
    where: { clientId: client.id },
    include: { identityDocument: true, residenceAddress: true, currentJob: true },
  });
  const emp1 = employees[0];

  // A. DOCX: OPIS IPSSM
  console.log(' - Generating DOCX: ipssm-opis...');
  const docxOpis = await generateDocument({
    templateCode: 'ipssm-opis',
    clientId: client.id,
    data: {
      client_name: client.name,
      current_year: 2026,
      date_ro: '01.11.2026',
      instructions: [
        { code: 'IPSSM 01', title: 'Instructajul de SSM' },
        { code: 'IPSSM 02', title: 'Responsabilitatile Personalului' },
        { code: 'IPSSM 13', title: 'Activitati de Birou' },
      ],
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created DOCX: ${docxOpis.filePath} (Status: ${docxOpis.status}, Size: ${docxOpis.fileSizeBytes} bytes)`);

  // B. DOCX: Decizii Angajator
  console.log(' - Generating DOCX: decizii-angajator...');
  const docxDecizii = await generateDocument({
    templateCode: 'decizii-angajator',
    clientId: client.id,
    data: {
      client_name: client.name,
      cui: client.cui,
      address: client.address,
      legal_rep: client.legalRepresentative,
      decision_number: '01',
      decision_date: '01.11.2026',
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created DOCX: ${docxDecizii.filePath} (Status: ${docxDecizii.status})`);

  // C. PDF: Cerere Angajare
  console.log(' - Generating PDF: hr-cerere-angajare...');
  const pdfCerere = await generateDocument({
    templateCode: 'hr-cerere-angajare',
    clientId: client.id,
    employeeId: emp1.id,
    data: {
      client_name: client.name,
      employee_name: `${emp1.lastName} ${emp1.firstName}`,
      address_full: `${emp1.residenceAddress?.locality}, Str. ${emp1.residenceAddress?.street} nr. ${emp1.residenceAddress?.number}`,
      doc_series: emp1.identityDocument?.series,
      doc_number: emp1.identityDocument?.number,
      doc_issued_by: emp1.identityDocument?.issuedBy,
      doc_issue_date: '10.05.2020',
      job_title: emp1.currentJob?.title,
      hire_date: '01.02.2026',
      legal_rep: client.legalRepresentative,
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created PDF: ${pdfCerere.filePath} (Status: ${pdfCerere.status}, Size: ${pdfCerere.fileSizeBytes} bytes)`);

  // D. PDF: Declaratie Luare la Cunostinta RI
  console.log(' - Generating PDF: hr-declaratie-regulament...');
  const pdfDecl = await generateDocument({
    templateCode: 'hr-declaratie-regulament',
    clientId: client.id,
    employeeId: emp1.id,
    data: {
      employee_name: `${emp1.lastName} ${emp1.firstName}`,
      locality: emp1.residenceAddress?.locality,
      street: emp1.residenceAddress?.street,
      street_number: emp1.residenceAddress?.number,
      county: emp1.residenceAddress?.county,
      doc_series: emp1.identityDocument?.series,
      doc_number: emp1.identityDocument?.number,
      doc_issued_by: emp1.identityDocument?.issuedBy,
      doc_issue_date: '10.05.2020',
      cnp: emp1.cnp,
      client_name: client.name,
      date_ro: '01.11.2026',
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created PDF: ${pdfDecl.filePath} (Status: ${pdfDecl.status})`);

  // E. DOCX: Contract Individual de Muncă 2026
  console.log(' - Generating DOCX: hr-cim-2026...');
  const docxCim = await generateDocument({
    templateCode: 'hr-cim-2026',
    clientId: client.id,
    employeeId: emp1.id,
    data: {
      client_name: client.name,
      cui: client.cui,
      address: client.address,
      legal_rep: client.legalRepresentative,
      employee_name: `${emp1.lastName} ${emp1.firstName}`,
      cnp: emp1.cnp,
      address_full: `${emp1.residenceAddress?.locality}, Str. ${emp1.residenceAddress?.street} nr. ${emp1.residenceAddress?.number}`,
      doc_number: emp1.identityDocument?.number,
      job_title: emp1.currentJob?.title,
      hire_date: '01.02.2026',
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created DOCX: ${docxCim.filePath} (Status: ${docxCim.status})`);

  // F. DOCX: Tematica Introductiv Generala 4h
  console.log(' - Generating DOCX: training-tematica-introductiv...');
  const docxTematica = await generateDocument({
    templateCode: 'training-tematica-introductiv',
    clientId: client.id,
    data: {
      client_name: client.name,
      cui: client.cui,
      administrator_name: client.legalRepresentative,
      duration_hours: 4,
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created DOCX: ${docxTematica.filePath} (Status: ${docxTematica.status})`);

  // G. XLSX: Pachet Anexe Curs Igiena
  console.log(' - Generating XLSX: hygiene-anexe-catalog...');
  const xlsxHygiene = await generateDocument({
    templateCode: 'hygiene-anexe-catalog',
    clientId: client.id,
    data: {
      provider_name: 'Firma Prestatoare SSM SRL',
      session_date: '15.11.2026',
      exam_date: '20.11.2026',
      location: 'București, Sediul Central',
      pv_number: 'PV-001/2026',
    },
    operatorName: 'Test Runner',
  });
  console.log(`   ✓ Created XLSX: ${xlsxHygiene.filePath} (Status: ${xlsxHygiene.status}, Size: ${xlsxHygiene.fileSizeBytes} bytes)`);

  // 6. Verify Audit Logs
  console.log('\n6. Checking Audit Trail:');
  const auditLogs = await prisma.auditEvent.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  for (const log of auditLogs) {
    console.log(`   [${log.action.toUpperCase()}] ${log.entityType} (${log.entityId?.substring(0, 8)}...) by ${log.actorName}`);
    // Confirm no CNP in audit log details
    if (log.details && log.details.includes('1850412410013')) {
      throw new Error(`CRITICAL PRIVACY FAILURE: CNP was found in audit log details: ${log.details}`);
    }
  }
  console.log('   ✓ Audit trail verified: 0 sensitive CNP strings found in log details.');

  console.log('\n=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===');
}

runEndToEndTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
