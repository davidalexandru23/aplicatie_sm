import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';
import { parseClientWorkbook, commitImport } from '../src/lib/importer';

async function main() {
  console.log('=== CREARE CELE 2 FIȘIERE EXCEL MODEL ȘI IMPORT ÎN BAZA DE DATE ===');

  const templatePath = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Fișierul șablon lipsește: ${templatePath}`);
  }

  const outputDir = path.join(process.cwd(), 'modele_import_excel');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // =========================================================================
  // 1. FIRMA 1: TECH INNOVATION SOLUTIONS S.R.L. (IT / Software / Birou)
  // =========================================================================
  console.log('\n--- 1. Generare Excel: TECH INNOVATION SOLUTIONS S.R.L. ---');
  const wb1Buffer = fs.readFileSync(templatePath);
  const wb1 = XLSX.read(wb1Buffer, { type: 'buffer' });
  const s1Firm = wb1.Sheets['Firmă și angajați'];

  // Metadate Companie (A5:E8)
  s1Firm['B5'] = { t: 's', v: 'TECH INNOVATION SOLUTIONS S.R.L.' };
  s1Firm['B6'] = { t: 's', v: 'RO41235678' };
  s1Firm['B7'] = { t: 's', v: 'J40/8765/2021' };
  s1Firm['B8'] = { t: 's', v: 'București, Sector 1, Calea Floreasca nr. 169A, Clădirea Floreasca Tower, Etaj 4' };
  s1Firm['E5'] = { t: 's', v: 'Radu George Enescu' };
  s1Firm['E6'] = { t: 's', v: 'Elena Dumitrescu' };
  s1Firm['E7'] = { t: 's', v: 'contact@techinnovation.ro' };
  s1Firm['E8'] = { t: 's', v: '0721.234.567' };

  // Curățare rânduri vechi angajați din șablon (rândurile 13-30)
  for (let r = 12; r <= 30; r++) {
    for (let c = 0; c <= 33; c++) {
      delete s1Firm[XLSX.utils.encode_cell({ r, c })];
    }
  }

  // 3 Angajați IT
  const emp1Data = [
    [
      'Popa', 'Andrei', 'M', '1920514410057', '14.05.1992', 'București', 'Sector 1', 'Română',
      'C.I.', 'RX', '112233', 'SPCEP Sector 1', '14.05.2018', '14.05.2028',
      'Sector 1', 'București', 'Str. Aviației', '12', 'B4', '2', '3', '15',
      'andrei.popa@techinnovation.ro', '0722.111.222',
      'Senior Software Developer', 'Sediul Central Floreasca',
      '01.02.2022', '01.02.2022', 'ACTIV', '',
      'NU', '', '', 'Salariat cheie, contract pe durată nedeterminată',
    ],
    [
      'Ionescu', 'Mara', 'F', '2950820420013', '20.08.1995', 'București', 'Sector 2', 'Română',
      'C.I.', 'RK', '445566', 'SPCEP Sector 2', '20.08.2019', '20.08.2029',
      'Sector 2', 'București', 'Str. Teiul Doamnei', '8', '14', 'A', '1', '4',
      'mara.ionescu@techinnovation.ro', '0723.333.444',
      'Product Manager', 'Sediul Central Floreasca',
      '15.05.2022', '15.05.2022', 'ACTIV', '',
      'NU', '', '', 'Responsabil prim-ajutor desemnat',
    ],
    [
      'Munteanu', 'Cristian', 'M', '1891103430077', '03.11.1989', 'București', 'Sector 3', 'Română',
      'C.I.', 'RT', '778899', 'SPCEP Sector 3', '03.11.2017', '03.11.2027',
      'Sector 3', 'București', 'Bd. Theodor Pallady', '25', 'P1', '1', '5', '22',
      'cristian.munteanu@techinnovation.ro', '0724.555.666',
      'System Administrator', 'Sediul Central Floreasca',
      '10.09.2021', '10.09.2021', 'ACTIV', '',
      'NU', '', '', 'Responsabil intervenție PSI și server room',
    ],
  ];

  emp1Data.forEach((row, rowIdx) => {
    const r = 12 + rowIdx;
    row.forEach((val, c) => {
      s1Firm[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: String(val) };
    });
  });
  s1Firm['!ref'] = `A1:AH${12 + emp1Data.length}`;

  // Context posturi IT
  const s1Ctx = wb1.Sheets['Context posturi'];
  for (let r = 4; r <= 25; r++) {
    for (let c = 0; c <= 8; c++) {
      delete s1Ctx[XLSX.utils.encode_cell({ r, c })];
    }
  }

  const jobs1Data = [
    [
      'Sediul Central Floreasca',
      'București, Sector 1, Calea Floreasca nr. 169A, Etaj 4',
      'Dezvoltare software și consultanță IT',
      'Senior Software Developer',
      '251201',
      'Scriere cod sursă, code review, arhitectură software, mentenanță aplicații web',
      'Laptop performant, monitor extern dublu 27 inch, periferice ergonomice',
      'Muncă la birou, ecran de vizualizare (VDT), postură așezată prelungită',
      '5',
    ],
    [
      'Sediul Central Floreasca',
      'București, Sector 1, Calea Floreasca nr. 169A, Etaj 4',
      'Dezvoltare software și consultanță IT',
      'Product Manager',
      '242104',
      'Planificare sprinturi, ședințe cu clienții, gestionare roadmap produs software',
      'Laptop, telefon de serviciu, ecran proiecție',
      'Muncă de birou, efort vizual, deplasări ocazionale',
      '2',
    ],
    [
      'Sediul Central Floreasca',
      'București, Sector 1, Calea Floreasca nr. 169A, Etaj 4',
      'Dezvoltare software și consultanță IT',
      'System Administrator',
      '252201',
      'Administrare rețea, configurare servere și rack-uri, backup, securitate date',
      'Servere rackabile, unelte sertizare rețea, multimetru, UPS, laptop depanare',
      'Cameră servere climatizată, zgomot moderat ventilatoare, risc electrocutare joasă tensiune',
      '2',
    ],
  ];

  jobs1Data.forEach((row, rowIdx) => {
    const r = 4 + rowIdx;
    row.forEach((val, c) => {
      s1Ctx[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: String(val) };
    });
  });
  s1Ctx['!ref'] = `A1:I${4 + jobs1Data.length}`;

  const firm1FileName = '01_TECH_INNOVATION_SOLUTIONS_SRL.xlsx';
  const firm1OutPath1 = path.join(outputDir, firm1FileName);
  const firm1OutPathRoot = path.join(process.cwd(), firm1FileName);
  const firm1Buf = XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(firm1OutPath1, firm1Buf);
  fs.writeFileSync(firm1OutPathRoot, firm1Buf);
  console.log(`Fișier 1 salvat la:\n  -> ${firm1OutPath1}\n  -> ${firm1OutPathRoot}`);

  // =========================================================================
  // 2. FIRMA 2: RESTAURANT LA CONAC S.R.L. (Horeca / Alimentație Publică)
  // =========================================================================
  console.log('\n--- 2. Generare Excel: RESTAURANT LA CONAC S.R.L. ---');
  const wb2Buffer = fs.readFileSync(templatePath);
  const wb2 = XLSX.read(wb2Buffer, { type: 'buffer' });
  const s2Firm = wb2.Sheets['Firmă și angajați'];

  // Metadate Companie (A5:E8)
  s2Firm['B5'] = { t: 's', v: 'RESTAURANT LA CONAC S.R.L.' };
  s2Firm['B6'] = { t: 's', v: 'RO48901234' };
  s2Firm['B7'] = { t: 's', v: 'J40/3456/2022' };
  s2Firm['B8'] = { t: 's', v: 'București, Sector 2, Str. Mihai Eminescu nr. 45' };
  s2Firm['E5'] = { t: 's', v: 'Victor Stan' };
  s2Firm['E6'] = { t: 's', v: 'Carmen Radu' };
  s2Firm['E7'] = { t: 's', v: 'contact@restaurantlaconac.ro' };
  s2Firm['E8'] = { t: 's', v: '0733.456.789' };

  // Curățare rânduri vechi
  for (let r = 12; r <= 30; r++) {
    for (let c = 0; c <= 33; c++) {
      delete s2Firm[XLSX.utils.encode_cell({ r, c })];
    }
  }

  // 3 Angajați Horeca (Bucătar, Ajutor bucătar, Ospătar)
  const emp2Data = [
    [
      'Vasile', 'Ionel', 'M', '1860412420061', '12.04.1986', 'București', 'Sector 2', 'Română',
      'C.I.', 'RR', '123456', 'SPCEP Sector 2', '12.04.2017', '12.04.2027',
      'Sector 2', 'București', 'Str. Mihai Eminescu', '45', 'A', '1', '2', '5',
      'ionel.vasile@restaurantlaconac.ro', '0733.111.222',
      'Bucătar Specialist', 'Restaurant La Conac',
      '01.03.2023', '01.03.2023', 'ACTIV', '',
      'DA', 'Modulul 1', 'Sesiunea Curentă', 'Bucătar șef - coordonator bloc alimentar',
    ],
    [
      'Gheorghe', 'Mihaela', 'F', '2930915440021', '15.09.1993', 'București', 'Sector 4', 'Română',
      'C.I.', 'DP', '654321', 'SPCEP Sector 4', '15.09.2018', '15.09.2028',
      'Sector 4', 'București', 'Sos. Olteniței', '78', 'B1', '2', '4', '18',
      'mihaela.gheorghe@restaurantlaconac.ro', '0733.222.333',
      'Ajutor Bucătar', 'Restaurant La Conac',
      '15.04.2023', '15.04.2023', 'ACTIV', '',
      'DA', 'Modulul 1', 'Sesiunea Curentă', 'Pregătire primară legume și carne',
    ],
    [
      'Stan', 'Alexandru', 'M', '1980725450093', '25.07.1998', 'București', 'Sector 5', 'Română',
      'C.I.', 'DT', '987654', 'SPCEP Sector 5', '25.07.2020', '25.07.2030',
      'Sector 5', 'București', 'Calea Rahovei', '150', 'R3', '1', '1', '3',
      'alexandru.stan@restaurantlaconac.ro', '0733.333.444',
      'Ospătar / Chelner', 'Restaurant La Conac',
      '01.06.2023', '01.06.2023', 'ACTIV', '',
      'DA', 'Modulul 1', 'Sesiunea Curentă', 'Servire clienți, debarasare salon',
    ],
  ];

  emp2Data.forEach((row, rowIdx) => {
    const r = 12 + rowIdx;
    row.forEach((val, c) => {
      s2Firm[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: String(val) };
    });
  });
  s2Firm['!ref'] = `A1:AH${12 + emp2Data.length}`;

  // Context posturi Restaurant
  const s2Ctx = wb2.Sheets['Context posturi'];
  for (let r = 4; r <= 25; r++) {
    for (let c = 0; c <= 8; c++) {
      delete s2Ctx[XLSX.utils.encode_cell({ r, c })];
    }
  }

  const jobs2Data = [
    [
      'Restaurant La Conac',
      'București, Sector 2, Str. Mihai Eminescu nr. 45',
      'Activități de restaurant și servire mâncare caldă',
      'Bucătar Specialist',
      '512001',
      'Preparare mâncăruri calde și reci, monitorizare temperaturi, respectare HACCP',
      'Cuptoare profesionale cu convecție, plită inducție, friteuză, cuțite profesionale, feliator',
      'Temperaturi ridicate, umiditate, manipulare ustensile ascuțite, suprafețe potențial alunecoase',
      '3',
    ],
    [
      'Restaurant La Conac',
      'București, Sector 2, Str. Mihai Eminescu nr. 45',
      'Activități de restaurant și servire mâncare caldă',
      'Ajutor Bucătar',
      '941201',
      'Curățare, tocare și pregătire materii prime, spălare veselă, igienizare bancuri de lucru',
      'Mașină de curățat cartofi, robot tăiere legume, mașină spălat vase profesională',
      'Mediu umed, manipulare substanțe chimice de curățare, efort fizic la manipulare tăvi',
      '3',
    ],
    [
      'Restaurant La Conac',
      'București, Sector 2, Str. Mihai Eminescu nr. 45',
      'Activități de restaurant și servire mâncare caldă',
      'Ospătar / Chelner',
      '513102',
      'Preluare comenzi, servire preparate și băuturi la mese, încasare note de plată',
      'POS mobil, cărucior servire, tavă servire, terminal comenzi POS',
      'Ortostatism prelungit, deplasare continuă în salon, comunicare directă cu publicul',
      '4',
    ],
  ];

  jobs2Data.forEach((row, rowIdx) => {
    const r = 4 + rowIdx;
    row.forEach((val, c) => {
      s2Ctx[XLSX.utils.encode_cell({ r, c })] = { t: 's', v: String(val) };
    });
  });
  s2Ctx['!ref'] = `A1:I${4 + jobs2Data.length}`;

  const firm2FileName = '02_RESTAURANT_LA_CONAC_SRL.xlsx';
  const firm2OutPath1 = path.join(outputDir, firm2FileName);
  const firm2OutPathRoot = path.join(process.cwd(), firm2FileName);
  const firm2Buf = XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(firm2OutPath1, firm2Buf);
  fs.writeFileSync(firm2OutPathRoot, firm2Buf);
  console.log(`Fișier 2 salvat la:\n  -> ${firm2OutPath1}\n  -> ${firm2OutPathRoot}`);

  // =========================================================================
  // 3. IMPORTARE DIRECTĂ A CELOR 2 FIRME ÎN BAZA DE DATE
  // =========================================================================
  console.log('\n=== 3. Parsare & Import în Baza de Date ===');

  const defaultProvider = await prisma.ssmProvider.findFirst({ where: { isDefault: true } });
  const defaultSpecialist = await prisma.ssmSpecialist.findFirst({ where: { providerId: defaultProvider?.id } });

  // 3.1. Import Firma 1
  console.log('Import Firma 1 (TECH INNOVATION SOLUTIONS S.R.L.)...');
  const parsed1 = parseClientWorkbook(firm1Buf);
  const client1 = await prisma.client.upsert({
    where: { cui: parsed1.company.cui!.trim() },
    update: {
      name: parsed1.company.name!,
      address: parsed1.company.address || 'Conform registru',
      regCom: parsed1.company.regCom,
      legalRepresentative: parsed1.company.legalRepresentative,
      contactPerson: parsed1.company.contactPerson,
      contactEmail: parsed1.company.contactEmail,
      contactPhone: parsed1.company.contactPhone,
      caenCode: '6201',
      caenActivity: 'Activități de realizare a software-ului la comandă (software orientat client)',
      foundedYear: 2021,
      providerId: defaultProvider?.id,
      specialistId: defaultSpecialist?.id,
      ssmProviderName: defaultProvider?.name,
      ssmSpecialistName: defaultSpecialist?.name,
      ssmSpecialistCert: defaultSpecialist?.certificateNumber,
      designatedWorkerSsm: 'Ing. Mihai Popescu',
      firstAidResponder: 'Mara Ionescu',
      psiResponder: 'Cristian Munteanu',
      investigationMembers: 'Radu George Enescu, Ing. Mihai Popescu',
      decisionsDate: new Date('2022-02-01'),
    },
    create: {
      name: parsed1.company.name!,
      cui: parsed1.company.cui!.trim(),
      address: parsed1.company.address || 'Conform registru',
      regCom: parsed1.company.regCom,
      legalRepresentative: parsed1.company.legalRepresentative,
      contactPerson: parsed1.company.contactPerson,
      contactEmail: parsed1.company.contactEmail,
      contactPhone: parsed1.company.contactPhone,
      caenCode: '6201',
      caenActivity: 'Activități de realizare a software-ului la comandă (software orientat client)',
      foundedYear: 2021,
      providerId: defaultProvider?.id,
      specialistId: defaultSpecialist?.id,
      ssmProviderName: defaultProvider?.name,
      ssmSpecialistName: defaultSpecialist?.name,
      ssmSpecialistCert: defaultSpecialist?.certificateNumber,
      designatedWorkerSsm: 'Ing. Mihai Popescu',
      firstAidResponder: 'Mara Ionescu',
      psiResponder: 'Cristian Munteanu',
      investigationMembers: 'Radu George Enescu, Ing. Mihai Popescu',
      decisionsDate: new Date('2022-02-01'),
    },
  });

  const batchId1 = await commitImport(client1.id, parsed1, 'Operator Import Inițial', firm1FileName);
  console.log(`Firma 1 importată cu succes! Client ID: ${client1.id}, Batch ID: ${batchId1}`);

  // Profilare riscuri posturi Firma 1
  await prisma.job.updateMany({
    where: { clientId: client1.id, title: { in: ['Senior Software Developer', 'Product Manager'] } },
    data: {
      isScreenWork: true,
      workPosture: 'Așezat la birou',
      maxWeightKg: 5,
    },
  });
  await prisma.job.updateMany({
    where: { clientId: client1.id, title: 'System Administrator' },
    data: {
      isScreenWork: true,
      workPosture: 'Mixt',
      maxWeightKg: 20,
    },
  });

  // 3.2. Import Firma 2
  console.log('Import Firma 2 (RESTAURANT LA CONAC S.R.L.)...');
  const parsed2 = parseClientWorkbook(firm2Buf);
  const client2 = await prisma.client.upsert({
    where: { cui: parsed2.company.cui!.trim() },
    update: {
      name: parsed2.company.name!,
      address: parsed2.company.address || 'Conform registru',
      regCom: parsed2.company.regCom,
      legalRepresentative: parsed2.company.legalRepresentative,
      contactPerson: parsed2.company.contactPerson,
      contactEmail: parsed2.company.contactEmail,
      contactPhone: parsed2.company.contactPhone,
      caenCode: '5610',
      caenActivity: 'Restaurante',
      foundedYear: 2022,
      providerId: defaultProvider?.id,
      specialistId: defaultSpecialist?.id,
      ssmProviderName: defaultProvider?.name,
      ssmSpecialistName: defaultSpecialist?.name,
      ssmSpecialistCert: defaultSpecialist?.certificateNumber,
      designatedWorkerSsm: 'Ing. Mihai Popescu',
      firstAidResponder: 'Ionel Vasile',
      psiResponder: 'Alexandru Stan',
      investigationMembers: 'Victor Stan, Ing. Mihai Popescu',
      decisionsDate: new Date('2023-03-01'),
    },
    create: {
      name: parsed2.company.name!,
      cui: parsed2.company.cui!.trim(),
      address: parsed2.company.address || 'Conform registru',
      regCom: parsed2.company.regCom,
      legalRepresentative: parsed2.company.legalRepresentative,
      contactPerson: parsed2.company.contactPerson,
      contactEmail: parsed2.company.contactEmail,
      contactPhone: parsed2.company.contactPhone,
      caenCode: '5610',
      caenActivity: 'Restaurante',
      foundedYear: 2022,
      providerId: defaultProvider?.id,
      specialistId: defaultSpecialist?.id,
      ssmProviderName: defaultProvider?.name,
      ssmSpecialistName: defaultSpecialist?.name,
      ssmSpecialistCert: defaultSpecialist?.certificateNumber,
      designatedWorkerSsm: 'Ing. Mihai Popescu',
      firstAidResponder: 'Ionel Vasile',
      psiResponder: 'Alexandru Stan',
      investigationMembers: 'Victor Stan, Ing. Mihai Popescu',
      decisionsDate: new Date('2023-03-01'),
    },
  });

  const batchId2 = await commitImport(client2.id, parsed2, 'Operator Import Inițial', firm2FileName);
  console.log(`Firma 2 importată cu succes! Client ID: ${client2.id}, Batch ID: ${batchId2}`);

  // Profilare riscuri posturi Firma 2
  await prisma.job.updateMany({
    where: { clientId: client2.id, title: { in: ['Bucătar Specialist', 'Ajutor Bucătar'] } },
    data: {
      isFoodHandling: true,
      workPosture: 'Ortostatism activ',
      maxWeightKg: 15,
    },
  });
  await prisma.job.updateMany({
    where: { clientId: client2.id, title: 'Ospătar / Chelner' },
    data: {
      isFoodHandling: true,
      workPosture: 'Ortostatism dinamic',
      maxWeightKg: 10,
    },
  });

  // Asocieri EIP pentru Firma 2
  const incEip = await prisma.eipItem.findUnique({ where: { code: 'EIP-INC-01' } });
  const bonEip = await prisma.eipItem.findUnique({ where: { code: 'EIP-BON-01' } });
  const halEip = await prisma.eipItem.findUnique({ where: { code: 'EIP-HAL-01' } });
  const sorEip = await prisma.eipItem.findUnique({ where: { code: 'EIP-SOR-01' } });

  const f2ChefJob = await prisma.job.findFirst({ where: { clientId: client2.id, title: 'Bucătar Specialist' } });
  const f2HelperJob = await prisma.job.findFirst({ where: { clientId: client2.id, title: 'Ajutor Bucătar' } });

  for (const job of [f2ChefJob, f2HelperJob]) {
    if (job) {
      for (const eip of [incEip, bonEip, halEip, sorEip]) {
        if (eip) {
          await prisma.jobEipRequirement.upsert({
            where: { jobId_eipItemId: { jobId: job.id, eipItemId: eip.id } },
            update: {},
            create: { jobId: job.id, eipItemId: eip.id },
          });
        }
      }
    }
  }

  // Creare Sesiune Igienă Oficială pentru Restaurant La Conac
  console.log('\n--- 4. Creare Sesiune Igienă & Înrolare Cursanți ---');
  const hygieneSession = await prisma.hygieneSession.create({
    data: {
      providerName: 'ASOCIAȚIA CENTRUL DE FORMARE PROFESIONALĂ & IGIENĂ',
      msAuthorization: 'MS-DSP-B-4412/2022',
      meAuthorization: 'ME-CNFPA-981/2021',
      sessionDate: new Date('2026-03-10T09:00:00.000Z'),
      examDate: new Date('2026-03-15T10:00:00.000Z'),
      location: 'București, Str. Mihai Eminescu nr. 45 (Salon Restaurant La Conac)',
      commissionPresident: 'Dr. Valeria Ionescu - Medic Primar Igienă DSP București',
      commissionMember1: 'Prof. Carmen Moldoveanu - Formator Autorizat Igienă',
      commissionMember2: 'Ing. Mihai Popescu - Expert SSM & Siguranță Alimentară',
      commissionSecretary: 'As. Med. Aurelia Toma',
      pvSeriesNumber: 'PV-DSP-2026-0089',
      status: 'SCHEDULED',
    },
  });

  const f2Employees = await prisma.employee.findMany({
    where: { clientId: client2.id },
    include: { identityDocument: true, currentJob: true },
  });

  for (let i = 0; i < f2Employees.length; i++) {
    const emp = f2Employees[i];
    await prisma.hygieneParticipant.create({
      data: {
        sessionId: hygieneSession.id,
        employeeId: emp.id,
        clientName: client2.name,
        lastName: emp.lastName,
        firstName: emp.firstName,
        cnp: emp.cnp,
        birthDate: emp.birthDate,
        birthPlace: emp.birthPlace,
        docType: emp.identityDocument?.docType || 'CI',
        docSeries: emp.identityDocument?.series,
        docNumber: emp.identityDocument?.number,
        jobTitle: emp.currentJob?.title || 'Lucrător alimentație',
        attendance: 'prezent',
        examGrade: 10,
        examResult: 'admis',
        certificateSeries: 'IGI-B',
        certificateNumber: `2026-0${i + 1}`,
      },
    });

    // Actualizare date igienă pe angajat
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        hygieneLastExamDate: new Date('2026-03-15T00:00:00.000Z'),
        hygieneCertificateNumber: `IGI-B 2026-0${i + 1}`,
        hygieneCertificateIssueDate: new Date('2026-03-15T00:00:00.000Z'),
        hygieneIntervalMonths: 36,
      },
    });
  }

  console.log(`Sesiune de igienă creată cu succes (${hygieneSession.id}) cu cei ${f2Employees.length} angajați înrolați.`);

  console.log('\n=== REZUMAT FINAL ===');
  const totalClients = await prisma.client.count();
  const totalEmployees = await prisma.employee.count();
  const totalJobs = await prisma.job.count();
  const totalWorksites = await prisma.worksite.count();
  const totalSessions = await prisma.hygieneSession.count();
  console.log(`Total Firme în sistem: ${totalClients}`);
  console.log(`Total Angajați: ${totalEmployees}`);
  console.log(`Total Posturi de lucru: ${totalJobs}`);
  console.log(`Total Puncte de lucru: ${totalWorksites}`);
  console.log(`Total Sesiuni Igienă: ${totalSessions}`);
}

main()
  .catch((e) => {
    console.error('Eroare:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
