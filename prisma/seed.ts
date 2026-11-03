import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Inițializare Seed Bază de Date SSM (Milestone 1) ---');

  // =========================================================================
  // CLIENT 1: NEXUS SOLUTIONS S.R.L. (Consultanță IT & Inginerie)
  // Profil: TESA preponderent + Mentenanță tehnică
  // =========================================================================
  console.log('1. Seeding Client 1: NEXUS SOLUTIONS S.R.L....');
  const clientNexus = await prisma.client.upsert({
    where: { cui: 'RO38765432' },
    update: {
      name: 'NEXUS SOLUTIONS S.R.L.',
      regCom: 'J40/5678/2021',
      address: 'București, Bd. Aviatorilor nr. 45, Sector 1',
      legalRepresentative: 'Munteanu Cristian',
      contactPerson: 'Simona Georgescu',
      contactEmail: 'contact@nexus-solutions.ro',
      contactPhone: '0722334455',
      isActive: true,

      // Date CAEN & Decizii SSM
      caenCode: '6201',
      caenActivity: 'Activități de realizare a software-ului la comandă (software orientat client)',
      foundedYear: 2021,
      ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      ssmSpecialistName: 'Ing. Mihai Popescu',
      ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
      designatedWorkerSsm: 'Munteanu Cristian',
      firstAidResponder: 'Alexandru Stan',
      psiResponder: 'Ioana-Raluca Dumitru',
      investigationMembers: 'Gheorghe Barbu, Elena Vasilescu',
      decisionsDate: new Date('2026-01-15T00:00:00.000Z'),
    },
    create: {
      name: 'NEXUS SOLUTIONS S.R.L.',
      cui: 'RO38765432',
      regCom: 'J40/5678/2021',
      address: 'București, Bd. Aviatorilor nr. 45, Sector 1',
      legalRepresentative: 'Munteanu Cristian',
      contactPerson: 'Simona Georgescu',
      contactEmail: 'contact@nexus-solutions.ro',
      contactPhone: '0722334455',
      isActive: true,

      caenCode: '6201',
      caenActivity: 'Activități de realizare a software-ului la comandă (software orientat client)',
      foundedYear: 2021,
      ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      ssmSpecialistName: 'Ing. Mihai Popescu',
      ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
      designatedWorkerSsm: 'Munteanu Cristian',
      firstAidResponder: 'Alexandru Stan',
      psiResponder: 'Ioana-Raluca Dumitru',
      investigationMembers: 'Gheorghe Barbu, Elena Vasilescu',
      decisionsDate: new Date('2026-01-15T00:00:00.000Z'),
    },
  });

  // Puncte de lucru Client 1
  const worksiteCentral = await prisma.worksite.upsert({
    where: {
      clientId_name: {
        clientId: clientNexus.id,
        name: 'Sediul Central',
      },
    },
    update: {
      address: 'București, Bd. Aviatorilor nr. 45, Sector 1',
      activity: 'Consultanță, dezvoltare software și management',
      isActive: true,
    },
    create: {
      clientId: clientNexus.id,
      name: 'Sediul Central',
      address: 'București, Bd. Aviatorilor nr. 45, Sector 1',
      activity: 'Consultanță, dezvoltare software și management',
      isActive: true,
    },
  });

  const worksiteVest = await prisma.worksite.upsert({
    where: {
      clientId_name: {
        clientId: clientNexus.id,
        name: 'Punct de Lucru Vest',
      },
    },
    update: {
      address: 'București, Bd. Iuliu Maniu nr. 78, Sector 6',
      activity: 'Laborator tehnic și mentenanță echipamente',
      isActive: true,
    },
    create: {
      clientId: clientNexus.id,
      name: 'Punct de Lucru Vest',
      address: 'București, Bd. Iuliu Maniu nr. 78, Sector 6',
      activity: 'Laborator tehnic și mentenanță echipamente',
      isActive: true,
    },
  });

  // Funcții / Posturi Client 1
  const jobDev = await prisma.job.upsert({
    where: {
      clientId_title: {
        clientId: clientNexus.id,
        title: 'Inginer Sisteme Software',
      },
    },
    update: {
      corCode: '251201',
      mainActivities: 'Dezvoltare aplicații, analiză date, lucru la videoterminale',
      equipmentUsed: 'Laptop, monitoare LCD, tastatură, mouse ergonomic',
      workConditions: 'Activitate de birou, climatizare, iluminat natural și artificial adecvat',
      workersCount: 5,
      isActive: true,
    },
    create: {
      clientId: clientNexus.id,
      title: 'Inginer Sisteme Software',
      corCode: '251201',
      mainActivities: 'Dezvoltare aplicații, analiză date, lucru la videoterminale',
      equipmentUsed: 'Laptop, monitoare LCD, tastatură, mouse ergonomic',
      workConditions: 'Activitate de birou, climatizare, iluminat natural și artificial adecvat',
      workersCount: 5,
      isActive: true,
    },
  });

  const jobHR = await prisma.job.upsert({
    where: {
      clientId_title: {
        clientId: clientNexus.id,
        title: 'Specialist Resurse Umane',
      },
    },
    update: {
      corCode: '242314',
      mainActivities: 'Recrutare, administrare personal, evidență SSM/HR, instruiri',
      equipmentUsed: 'PC, imprimantă, telefon, dulap arhivă',
      workConditions: 'Activitate sedentară de birou, ecrane de vizualizare',
      workersCount: 2,
      isActive: true,
    },
    create: {
      clientId: clientNexus.id,
      title: 'Specialist Resurse Umane',
      corCode: '242314',
      mainActivities: 'Recrutare, administrare personal, evidență SSM/HR, instruiri',
      equipmentUsed: 'PC, imprimantă, telefon, dulap arhivă',
      workConditions: 'Activitate sedentară de birou, ecrane de vizualizare',
      workersCount: 2,
      isActive: true,
    },
  });

  const jobTech = await prisma.job.upsert({
    where: {
      clientId_title: {
        clientId: clientNexus.id,
        title: 'Tehnician Mentenanță și Suport',
      },
    },
    update: {
      corCode: '311305',
      mainActivities: 'Verificare instalații, montaj echipamente hardware, mentenanță rețele',
      equipmentUsed: 'Truse scule manuale și electrice izolate, multimetru',
      workConditions: 'Deplasări locale, lucru cu echipamente electrice de joasă tensiune, EIP necesar',
      workersCount: 3,
      isActive: true,
    },
    create: {
      clientId: clientNexus.id,
      title: 'Tehnician Mentenanță și Suport',
      corCode: '311305',
      mainActivities: 'Verificare instalații, montaj echipamente hardware, mentenanță rețele',
      equipmentUsed: 'Truse scule manuale și electrice izolate, multimetru',
      workConditions: 'Deplasări locale, lucru cu echipamente electrice de joasă tensiune, EIP necesar',
      workersCount: 3,
      isActive: true,
    },
  });

  const jobAdmin = await prisma.job.upsert({
    where: {
      clientId_title: {
        clientId: clientNexus.id,
        title: 'Asistent Administrativ Junior',
      },
    },
    update: {
      corCode: '334301',
      mainActivities: 'Registratură, corespondență, protocol, arhivă',
      equipmentUsed: 'PC birou, telefon, copiator',
      workConditions: 'Birou administrativ sedentar',
      workersCount: 1,
      isActive: true,
    },
    create: {
      clientId: clientNexus.id,
      title: 'Asistent Administrativ Junior',
      corCode: '334301',
      mainActivities: 'Registratură, corespondență, protocol, arhivă',
      equipmentUsed: 'PC birou, telefon, copiator',
      workConditions: 'Birou administrativ sedentar',
      workersCount: 1,
      isActive: true,
    },
  });

  // Curățare angajați vechi Nexus pentru prevenirea ghost records și garantarea ordinii
  await prisma.employee.deleteMany({
    where: {
      clientId: clientNexus.id,
    },
  });

  // -------------------------------------------------------------------------
  // Angajat 1: Gheorghe Barbu -> Stare: OVERDUE (<0 zile, expirat / restanță critică)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Employee 1: Gheorghe Barbu (OVERDUE)...');
  await prisma.employee.upsert({
    where: {
      clientId_cnp: {
        clientId: clientNexus.id,
        cnp: '1790608080231',
      },
    },
    update: {
      firstName: 'Gheorghe',
      lastName: 'Barbu',
      sex: 'M',
      birthDate: new Date('1979-06-08T00:00:00.000Z'),
      birthPlace: 'Brașov',
      birthCounty: 'Brașov',
      citizenship: 'Română',
      email: 'gheorghe.barbu@nexus-solutions.ro',
      phone: '0722999000',
      currentJobId: jobTech.id,
      currentWorksiteId: worksiteVest.id,
      startDateOnJob: new Date('2026-02-09T00:00:00.000Z'),
      hireDate: new Date('2026-02-09T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: true,
      hygieneModule: 'Modulul 2 - Mentenanță și Instalații',
      hygienePreferredSession: 'Sesiune Urgentă 2026',

      // Medicina Muncii: OVERDUE (scadent 2026-08-10, expirat de -83 zile)
      medicalLastExamDate: new Date('2025-08-10T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Control periodic medical depășit! Risc contravențional ITM conform art. 260 Codul Muncii',

      // SSM: OVERDUE (scadent 2026-09-01, expirat de -61 zile)
      ssmLastTrainingDate: new Date('2026-03-01T00:00:00.000Z'),
      ssmIntervalMonths: 6, // 6 luni pentru personal operativ/mentenanță
      ssmNotes: 'Instruire periodică semestrială restantă',

      // PSI/SU: VALID (~44 zile rămase)
      psiLastTrainingDate: new Date('2026-09-15T00:00:00.000Z'),
      psiIntervalMonths: 3, // 3 luni pentru personal tehnic/instalații
      psiNotes: 'Instructaj tehnic trimestrial prevenire incendii rețele electrice',

      // Curs Igienă: OVERDUE (scadent 2026-09-01, valabilitate 36 luni depășită!)
      hygieneLastExamDate: new Date('2023-09-01T00:00:00.000Z'),
      hygieneCertificateNumber: 'DSP-B-2023-889',
      hygieneCertificateIssueDate: new Date('2023-09-05T00:00:00.000Z'),
      hygieneIntervalMonths: 36,
      hygieneNotes: 'Certificat de igienă expirat conform Ordin 2209/2022 art. 20 (peste 36 luni)',
    },
    create: {
      clientId: clientNexus.id,
      firstName: 'Gheorghe',
      lastName: 'Barbu',
      sex: 'M',
      cnp: '1790608080231',
      birthDate: new Date('1979-06-08T00:00:00.000Z'),
      birthPlace: 'Brașov',
      birthCounty: 'Brașov',
      citizenship: 'Română',
      email: 'gheorghe.barbu@nexus-solutions.ro',
      phone: '0722999000',
      currentJobId: jobTech.id,
      currentWorksiteId: worksiteVest.id,
      startDateOnJob: new Date('2026-02-09T00:00:00.000Z'),
      hireDate: new Date('2026-02-09T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: true,
      hygieneModule: 'Modulul 2 - Mentenanță și Instalații',
      medicalLastExamDate: new Date('2025-08-10T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Control periodic medical depășit! Risc contravențional ITM conform art. 260 Codul Muncii',
      ssmLastTrainingDate: new Date('2026-03-01T00:00:00.000Z'),
      ssmIntervalMonths: 6,
      ssmNotes: 'Instruire periodică semestrială restantă',
      psiLastTrainingDate: new Date('2026-09-15T00:00:00.000Z'),
      psiIntervalMonths: 3,
      psiNotes: 'Instructaj tehnic trimestrial prevenire incendii rețele electrice',
      hygieneLastExamDate: new Date('2023-09-01T00:00:00.000Z'),
      hygieneCertificateNumber: 'DSP-B-2023-889',
      hygieneCertificateIssueDate: new Date('2023-09-05T00:00:00.000Z'),
      hygieneIntervalMonths: 36,
      hygieneNotes: 'Certificat de igienă expirat conform Ordin 2209/2022 art. 20 (peste 36 luni)',
    },
  });

  // -------------------------------------------------------------------------
  // Angajat 2: Ioana-Raluca Dumitru -> Stare: UPCOMING (0..30 zile rămase)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Employee 2: Ioana-Raluca Dumitru (UPCOMING)...');
  await prisma.employee.upsert({
    where: {
      clientId_cnp: {
        clientId: clientNexus.id,
        cnp: '2941124120456',
      },
    },
    update: {
      firstName: 'Ioana-Raluca',
      lastName: 'Dumitru',
      sex: 'F',
      birthDate: new Date('1994-11-23T00:00:00.000Z'),
      birthPlace: 'Cluj-Napoca',
      birthCounty: 'Cluj',
      citizenship: 'Română',
      email: 'ioana.dumitru@nexus-solutions.ro',
      phone: '0755888999',
      currentJobId: jobHR.id,
      currentWorksiteId: worksiteCentral.id,
      startDateOnJob: new Date('2026-01-31T00:00:00.000Z'),
      hireDate: new Date('2026-01-31T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: false,

      // Medicina Muncii: UPCOMING (scadent 2026-11-15, exact 14 zile rămase față de 2026-11-01)
      medicalLastExamDate: new Date('2025-11-15T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT_CONDITIONAT',
      medicalNotes: 'Purtare ochelari de corecție pentru lucrul continuu la ecran',

      // SSM: VALID (~195 zile rămase)
      ssmLastTrainingDate: new Date('2026-05-15T00:00:00.000Z'),
      ssmIntervalMonths: 12,
      ssmNotes: 'Tematica SSM semestrială HR & Administrație',

      // PSI/SU: UPCOMING (scadent 2026-11-20, exact 19 zile rămase)
      psiLastTrainingDate: new Date('2026-05-20T00:00:00.000Z'),
      psiIntervalMonths: 6,
      psiNotes: 'Instructaj semestrial SU - necesită re-instruire urgentă',

      hygieneLastExamDate: null,
      hygieneCertificateNumber: null,
      hygieneCertificateIssueDate: null,
      hygieneIntervalMonths: 36,
      hygieneNotes: null,
    },
    create: {
      clientId: clientNexus.id,
      firstName: 'Ioana-Raluca',
      lastName: 'Dumitru',
      sex: 'F',
      cnp: '2941124120456',
      birthDate: new Date('1994-11-23T00:00:00.000Z'),
      birthPlace: 'Cluj-Napoca',
      birthCounty: 'Cluj',
      citizenship: 'Română',
      email: 'ioana.dumitru@nexus-solutions.ro',
      phone: '0755888999',
      currentJobId: jobHR.id,
      currentWorksiteId: worksiteCentral.id,
      startDateOnJob: new Date('2026-01-31T00:00:00.000Z'),
      hireDate: new Date('2026-01-31T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: false,
      medicalLastExamDate: new Date('2025-11-15T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT_CONDITIONAT',
      medicalNotes: 'Purtare ochelari de corecție pentru lucrul continuu la ecran',
      ssmLastTrainingDate: new Date('2026-05-15T00:00:00.000Z'),
      ssmIntervalMonths: 12,
      ssmNotes: 'Tematica SSM semestrială HR & Administrație',
      psiLastTrainingDate: new Date('2026-05-20T00:00:00.000Z'),
      psiIntervalMonths: 6,
      psiNotes: 'Instructaj semestrial SU - necesită re-instruire urgentă',
      hygieneIntervalMonths: 36,
    },
  });

  // -------------------------------------------------------------------------
  // Angajat 3: Alexandru Stan -> Stare: VALID (>30 zile în termen pe toate liniile)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Employee 3: Alexandru Stan (VALID)...');
  await prisma.employee.upsert({
    where: {
      clientId_cnp: {
        clientId: clientNexus.id,
        cnp: '1880315410127',
      },
    },
    update: {
      firstName: 'Alexandru',
      lastName: 'Stan',
      sex: 'M',
      birthDate: new Date('1988-03-15T00:00:00.000Z'),
      birthPlace: 'București',
      birthCounty: 'Sector 1',
      citizenship: 'Română',
      email: 'alexandru.stan@nexus-solutions.ro',
      phone: '0722111222',
      currentJobId: jobDev.id,
      currentWorksiteId: worksiteCentral.id,
      startDateOnJob: new Date('2026-02-01T00:00:00.000Z'),
      hireDate: new Date('2026-02-01T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: false,

      // Conformitate Medicina Muncii: VALID (~226 zile rămase)
      medicalLastExamDate: new Date('2026-06-15T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Apt complet conform Fișei 243 HG 355/2007 (lucru cu videoterminale)',

      // Conformitate SSM: VALID (~190 zile rămase)
      ssmLastTrainingDate: new Date('2026-05-10T00:00:00.000Z'),
      ssmIntervalMonths: 12,
      ssmNotes: 'Tematica anuală TESA nr. 2 - Ergonomie și riscuri birou',

      // Conformitate PSI/SU: VALID (~49 zile rămase)
      psiLastTrainingDate: new Date('2026-06-20T00:00:00.000Z'),
      psiIntervalMonths: 6,
      psiNotes: 'Instructaj semestrial SU și exercițiu evacuare clădire birouri',

      // Curs Igienă: N/A
      hygieneLastExamDate: null,
      hygieneCertificateNumber: null,
      hygieneCertificateIssueDate: null,
      hygieneIntervalMonths: 36,
      hygieneNotes: null,
    },
    create: {
      clientId: clientNexus.id,
      firstName: 'Alexandru',
      lastName: 'Stan',
      sex: 'M',
      cnp: '1880315410127',
      birthDate: new Date('1988-03-15T00:00:00.000Z'),
      birthPlace: 'București',
      birthCounty: 'Sector 1',
      citizenship: 'Română',
      email: 'alexandru.stan@nexus-solutions.ro',
      phone: '0722111222',
      currentJobId: jobDev.id,
      currentWorksiteId: worksiteCentral.id,
      startDateOnJob: new Date('2026-02-01T00:00:00.000Z'),
      hireDate: new Date('2026-02-01T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: false,
      medicalLastExamDate: new Date('2026-06-15T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Apt complet conform Fișei 243 HG 355/2007 (lucru cu videoterminale)',
      ssmLastTrainingDate: new Date('2026-05-10T00:00:00.000Z'),
      ssmIntervalMonths: 12,
      ssmNotes: 'Tematica anuală TESA nr. 2 - Ergonomie și riscuri birou',
      psiLastTrainingDate: new Date('2026-06-20T00:00:00.000Z'),
      psiIntervalMonths: 6,
      psiNotes: 'Instructaj semestrial SU și exercițiu evacuare clădire birouri',
      hygieneIntervalMonths: 36,
    },
  });

  // -------------------------------------------------------------------------
  // Angajat 4: Elena Vasilescu -> Stare: MISSING (Date necompletate / dosar lipsă)
  // -------------------------------------------------------------------------
  console.log('  -> Seeding Employee 4: Elena Vasilescu (MISSING)...');
  await prisma.employee.upsert({
    where: {
      clientId_cnp: {
        clientId: clientNexus.id,
        cnp: '2980514410023',
      },
    },
    update: {
      firstName: 'Elena',
      lastName: 'Vasilescu',
      sex: 'F',
      birthDate: new Date('1998-05-14T00:00:00.000Z'),
      birthPlace: 'București',
      birthCounty: 'Sector 3',
      citizenship: 'Română',
      email: 'elena.vasilescu@nexus-solutions.ro',
      phone: '0744111333',
      currentJobId: jobAdmin.id,
      currentWorksiteId: worksiteCentral.id,
      startDateOnJob: new Date('2026-10-15T00:00:00.000Z'),
      hireDate: new Date('2026-10-15T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: false,

      // Toate datele de conformitate sunt NULL -> Stare MISSING
      medicalLastExamDate: null,
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: null,
      medicalNotes: 'Examen medical la angajare neconsemnat! Salariatul nu poate presta muncă legal',

      ssmLastTrainingDate: null,
      ssmIntervalMonths: 12,
      ssmNotes: 'Instruirea introductiv-generală și la locul de muncă lipsă din dosar',

      psiLastTrainingDate: null,
      psiIntervalMonths: 6,
      psiNotes: 'Instructaj introductiv SU neefectuat',

      hygieneLastExamDate: null,
      hygieneCertificateNumber: null,
      hygieneCertificateIssueDate: null,
      hygieneIntervalMonths: 36,
      hygieneNotes: null,
    },
    create: {
      clientId: clientNexus.id,
      firstName: 'Elena',
      lastName: 'Vasilescu',
      sex: 'F',
      cnp: '2980514410023',
      birthDate: new Date('1998-05-14T00:00:00.000Z'),
      birthPlace: 'București',
      birthCounty: 'Sector 3',
      citizenship: 'Română',
      email: 'elena.vasilescu@nexus-solutions.ro',
      phone: '0744111333',
      currentJobId: jobAdmin.id,
      currentWorksiteId: worksiteCentral.id,
      startDateOnJob: new Date('2026-10-15T00:00:00.000Z'),
      hireDate: new Date('2026-10-15T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: false,
      medicalLastExamDate: null,
      medicalIntervalMonths: 12,
      medicalNotes: 'Examen medical la angajare neconsemnat! Salariatul nu poate presta muncă legal',
      ssmLastTrainingDate: null,
      ssmIntervalMonths: 12,
      ssmNotes: 'Instruirea introductiv-generală și la locul de muncă lipsă din dosar',
      psiLastTrainingDate: null,
      psiIntervalMonths: 6,
      psiNotes: 'Instructaj introductiv SU neefectuat',
      hygieneIntervalMonths: 36,
    },
  });

  // Acte de identitate și adrese pentru angajați noi
  const empElena = await prisma.employee.findUnique({
    where: { clientId_cnp: { clientId: clientNexus.id, cnp: '2980514410023' } },
  });
  if (empElena) {
    await prisma.identityDocument.upsert({
      where: { employeeId: empElena.id },
      update: {
        docType: 'CI',
        series: 'RT',
        number: '345678',
        issuedBy: 'SPCLEP S3',
        issueDate: new Date('2022-06-10T00:00:00.000Z'),
        expiryDate: new Date('2032-05-14T00:00:00.000Z'),
      },
      create: {
        employeeId: empElena.id,
        docType: 'CI',
        series: 'RT',
        number: '345678',
        issuedBy: 'SPCLEP S3',
        issueDate: new Date('2022-06-10T00:00:00.000Z'),
        expiryDate: new Date('2032-05-14T00:00:00.000Z'),
      },
    });

    await prisma.residenceAddress.upsert({
      where: { employeeId: empElena.id },
      update: {
        county: 'București',
        locality: 'București',
        street: 'Str. Dristorului',
        number: '88',
        building: 'D12',
        entrance: '1',
        floor: '2',
        apartment: '7',
      },
      create: {
        employeeId: empElena.id,
        county: 'București',
        locality: 'București',
        street: 'Str. Dristorului',
        number: '88',
        building: 'D12',
        entrance: '1',
        floor: '2',
        apartment: '7',
      },
    });
  }

  // =========================================================================
  // CLIENT 2: BISTRO GOURMET S.R.L. (Alimentație Publică & Horeca)
  // Profil: Cursuri de igienă obligatorii pentru toți salariații operativi
  // =========================================================================
  console.log('2. Seeding Client 2: BISTRO GOURMET S.R.L. (Horeca & Igienă)...');
  const clientBistro = await prisma.client.upsert({
    where: { cui: 'RO45123987' },
    update: {
      name: 'BISTRO GOURMET S.R.L.',
      regCom: 'J40/1234/2022',
      address: 'București, Calea Floreasca nr. 120, Sector 1',
      legalRepresentative: 'Radu George',
      contactPerson: 'Mirela Iacob',
      contactEmail: 'contact@bistrogourmet.ro',
      contactPhone: '0733445566',
      isActive: true,

      caenCode: '5610',
      caenActivity: 'Restaurante și alte activități de servicii de alimentație',
      foundedYear: 2022,
      ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      ssmSpecialistName: 'Ing. Mihai Popescu',
      ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
      designatedWorkerSsm: 'Radu George',
      firstAidResponder: 'Marius Radu',
      psiResponder: 'Marius Radu',
      investigationMembers: 'Andreea Marin, Mirela Iacob',
      decisionsDate: new Date('2026-01-20T00:00:00.000Z'),
    },
    create: {
      name: 'BISTRO GOURMET S.R.L.',
      cui: 'RO45123987',
      regCom: 'J40/1234/2022',
      address: 'București, Calea Floreasca nr. 120, Sector 1',
      legalRepresentative: 'Radu George',
      contactPerson: 'Mirela Iacob',
      contactEmail: 'contact@bistrogourmet.ro',
      contactPhone: '0733445566',
      isActive: true,

      caenCode: '5610',
      caenActivity: 'Restaurante și alte activități de servicii de alimentație',
      foundedYear: 2022,
      ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      ssmSpecialistName: 'Ing. Mihai Popescu',
      ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
      designatedWorkerSsm: 'Radu George',
      firstAidResponder: 'Marius Radu',
      psiResponder: 'Marius Radu',
      investigationMembers: 'Andreea Marin, Mirela Iacob',
      decisionsDate: new Date('2026-01-20T00:00:00.000Z'),
    },
  });

  const worksiteRestaurant = await prisma.worksite.upsert({
    where: {
      clientId_name: {
        clientId: clientBistro.id,
        name: 'Restaurant Floreasca',
      },
    },
    update: {
      address: 'București, Calea Floreasca nr. 120, Sector 1',
      activity: 'Alimentație publică, preparare mâncare și servire la mese',
      isActive: true,
    },
    create: {
      clientId: clientBistro.id,
      name: 'Restaurant Floreasca',
      address: 'București, Calea Floreasca nr. 120, Sector 1',
      activity: 'Alimentație publică, preparare mâncare și servire la mese',
      isActive: true,
    },
  });

  const jobChef = await prisma.job.upsert({
    where: {
      clientId_title: {
        clientId: clientBistro.id,
        title: 'Bucătar Specialist',
      },
    },
    update: {
      corCode: '512001',
      mainActivities: 'Preparare termică alimente, tranșare, manipulare ingrediente',
      equipmentUsed: 'Cuptoare convecție, plite inducție, cuțite profesionale, malaxor',
      workConditions: 'Temperaturi ridicate, umiditate, ritm alert, manipulare alimente crude',
      workersCount: 4,
      isActive: true,
    },
    create: {
      clientId: clientBistro.id,
      title: 'Bucătar Specialist',
      corCode: '512001',
      mainActivities: 'Preparare termică alimente, tranșare, manipulare ingrediente',
      equipmentUsed: 'Cuptoare convecție, plite inducție, cuțite profesionale, malaxor',
      workConditions: 'Temperaturi ridicate, umiditate, ritm alert, manipulare alimente crude',
      workersCount: 4,
      isActive: true,
    },
  });

  const jobWaiter = await prisma.job.upsert({
    where: {
      clientId_title: {
        clientId: clientBistro.id,
        title: 'Ospătar / Chelner',
      },
    },
    update: {
      corCode: '513102',
      mainActivities: 'Servire preparate culinare și băuturi, debarasare, manipulare veselă',
      equipmentUsed: 'Tăvi de servire, terminal POS, cărucior transport veselă',
      workConditions: 'Ortostatism prelungit, interacțiune cu publicul',
      workersCount: 6,
      isActive: true,
    },
    create: {
      clientId: clientBistro.id,
      title: 'Ospătar / Chelner',
      corCode: '513102',
      mainActivities: 'Servire preparate culinare și băuturi, debarasare, manipulare veselă',
      equipmentUsed: 'Tăvi de servire, terminal POS, cărucior transport veselă',
      workConditions: 'Ortostatism prelungit, interacțiune cu publicul',
      workersCount: 6,
      isActive: true,
    },
  });

  // Curățare CNP-uri vechi/invalide pentru prevenirea înregistrărilor duplicat (ghost records)
  await prisma.employee.deleteMany({
    where: {
      clientId: clientBistro.id,
      cnp: { in: ['1820815410098', '2950920410045'] },
    },
  });

  // Angajat Bistro 1: Marius Radu (Bucătar - Igienă VALID)
  console.log('  -> Seeding Bistro Employee 1: Marius Radu (Igienă VALID)...');
  await prisma.employee.upsert({
    where: {
      clientId_cnp: {
        clientId: clientBistro.id,
        cnp: '1820815410097',
      },
    },
    update: {
      firstName: 'Marius',
      lastName: 'Radu',
      sex: 'M',
      birthDate: new Date('1982-08-15T00:00:00.000Z'),
      birthPlace: 'Ploiești',
      birthCounty: 'Prahova',
      citizenship: 'Română',
      email: 'marius.radu@bistrogourmet.ro',
      phone: '0722888111',
      currentJobId: jobChef.id,
      currentWorksiteId: worksiteRestaurant.id,
      startDateOnJob: new Date('2025-04-01T00:00:00.000Z'),
      hireDate: new Date('2025-04-01T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: true,
      hygieneModule: 'Modulul 1 - Sector Alimentar și Alimentație Publică',

      medicalLastExamDate: new Date('2026-04-10T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Examen coproparazitologic și coprobacteriologic negativ (Fișa 210)',

      ssmLastTrainingDate: new Date('2026-08-10T00:00:00.000Z'),
      ssmIntervalMonths: 3, // 3 luni în bucătărie caldă / risc arsuri
      ssmNotes: 'Tematica SSM nr. 4 - Lucru cu foc deschis, electrocutare și arsuri termice',

      psiLastTrainingDate: new Date('2026-09-10T00:00:00.000Z'),
      psiIntervalMonths: 3,
      psiNotes: 'Instruire intervenție rapidă cu stingătoare tip CO2 și pulbere',

      // Curs Igienă: VALID (examen 2025-04-10 + 36 luni -> scadent 2028-04-10, ~526 zile rămase)
      hygieneLastExamDate: new Date('2025-04-10T00:00:00.000Z'),
      hygieneCertificateNumber: 'DSP-B-2025-10442',
      hygieneCertificateIssueDate: new Date('2025-04-12T00:00:00.000Z'),
      hygieneIntervalMonths: 36,
      hygieneNotes: 'Atestat conform Ordin 2209/2022 emis de DSP Municipiul București',
    },
    create: {
      clientId: clientBistro.id,
      firstName: 'Marius',
      lastName: 'Radu',
      sex: 'M',
      cnp: '1820815410097',
      birthDate: new Date('1982-08-15T00:00:00.000Z'),
      birthPlace: 'Ploiești',
      birthCounty: 'Prahova',
      citizenship: 'Română',
      email: 'marius.radu@bistrogourmet.ro',
      phone: '0722888111',
      currentJobId: jobChef.id,
      currentWorksiteId: worksiteRestaurant.id,
      startDateOnJob: new Date('2025-04-01T00:00:00.000Z'),
      hireDate: new Date('2025-04-01T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: true,
      hygieneModule: 'Modulul 1 - Sector Alimentar și Alimentație Publică',
      medicalLastExamDate: new Date('2026-04-10T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Examen coproparazitologic și coprobacteriologic negativ (Fișa 210)',
      ssmLastTrainingDate: new Date('2026-08-10T00:00:00.000Z'),
      ssmIntervalMonths: 3,
      ssmNotes: 'Tematica SSM nr. 4 - Lucru cu foc deschis, electrocutare și arsuri termice',
      psiLastTrainingDate: new Date('2026-09-10T00:00:00.000Z'),
      psiIntervalMonths: 3,
      psiNotes: 'Instruire intervenție rapidă cu stingătoare tip CO2 și pulbere',
      hygieneLastExamDate: new Date('2025-04-10T00:00:00.000Z'),
      hygieneCertificateNumber: 'DSP-B-2025-10442',
      hygieneCertificateIssueDate: new Date('2025-04-12T00:00:00.000Z'),
      hygieneIntervalMonths: 36,
      hygieneNotes: 'Atestat conform Ordin 2209/2022 emis de DSP Municipiul București',
    },
  });

  // Angajat Bistro 2: Andreea Marin (Ospătar - Igienă UPCOMING)
  console.log('  -> Seeding Bistro Employee 2: Andreea Marin (Igienă UPCOMING)...');
  await prisma.employee.upsert({
    where: {
      clientId_cnp: {
        clientId: clientBistro.id,
        cnp: '2950920410044',
      },
    },
    update: {
      firstName: 'Andreea',
      lastName: 'Marin',
      sex: 'F',
      birthDate: new Date('1995-09-20T00:00:00.000Z'),
      birthPlace: 'București',
      birthCounty: 'Sector 2',
      citizenship: 'Română',
      email: 'andreea.marin@bistrogourmet.ro',
      phone: '0733555777',
      currentJobId: jobWaiter.id,
      currentWorksiteId: worksiteRestaurant.id,
      startDateOnJob: new Date('2025-05-01T00:00:00.000Z'),
      hireDate: new Date('2025-05-01T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: true,
      hygieneModule: 'Modulul 1 - Servire și Desfacere Alimente',

      medicalLastExamDate: new Date('2026-05-10T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Examen clinic general și analize serologice în regulă',

      ssmLastTrainingDate: new Date('2026-05-10T00:00:00.000Z'),
      ssmIntervalMonths: 6, // scadent 2026-11-10 -> UPCOMING (9 zile rămase)
      ssmNotes: 'Instruire SSM semestrială ospătari și manipulare cărucioare',

      psiLastTrainingDate: new Date('2026-08-15T00:00:00.000Z'),
      psiIntervalMonths: 3,
      psiNotes: 'Instructaj trimestrial evacuare clienți din sala de mese',

      // Curs Igienă: UPCOMING (examen 2023-11-20 + 36 luni -> scadent 2026-11-20, exact 19 zile rămase!)
      hygieneLastExamDate: new Date('2023-11-20T00:00:00.000Z'),
      hygieneCertificateNumber: 'DSP-B-2023-9120',
      hygieneCertificateIssueDate: new Date('2023-11-22T00:00:00.000Z'),
      hygieneIntervalMonths: 36,
      hygieneNotes: 'Certificat de igienă pe cale de expirare! Necesită re-înscriere la curs',
    },
    create: {
      clientId: clientBistro.id,
      firstName: 'Andreea',
      lastName: 'Marin',
      sex: 'F',
      cnp: '2950920410044',
      birthDate: new Date('1995-09-20T00:00:00.000Z'),
      birthPlace: 'București',
      birthCounty: 'Sector 2',
      citizenship: 'Română',
      email: 'andreea.marin@bistrogourmet.ro',
      phone: '0733555777',
      currentJobId: jobWaiter.id,
      currentWorksiteId: worksiteRestaurant.id,
      startDateOnJob: new Date('2025-05-01T00:00:00.000Z'),
      hireDate: new Date('2025-05-01T00:00:00.000Z'),
      status: 'ACTIV',
      hygieneRequested: true,
      hygieneModule: 'Modulul 1 - Servire și Desfacere Alimente',
      medicalLastExamDate: new Date('2026-05-10T00:00:00.000Z'),
      medicalIntervalMonths: 12,
      medicalFitnessVerdict: 'APT',
      medicalNotes: 'Examen clinic general și analize serologice în regulă',
      ssmLastTrainingDate: new Date('2026-05-10T00:00:00.000Z'),
      ssmIntervalMonths: 6,
      ssmNotes: 'Instruire SSM semestrială ospătari și manipulare cărucioare',
      psiLastTrainingDate: new Date('2026-08-15T00:00:00.000Z'),
      psiIntervalMonths: 3,
      psiNotes: 'Instructaj trimestrial evacuare clienți din sala de mese',
      hygieneLastExamDate: new Date('2023-11-20T00:00:00.000Z'),
      hygieneCertificateNumber: 'DSP-B-2023-9120',
      hygieneCertificateIssueDate: new Date('2023-11-22T00:00:00.000Z'),
      hygieneIntervalMonths: 36,
      hygieneNotes: 'Certificat de igienă pe cale de expirare! Necesită re-înscriere la curs',
    },
  });

  // =========================================================================
  // ACTE DE IDENTITATE ȘI ADRESE DE DOMICILIU COMPLETE PENTRU TOȚI ANGAJAȚII
  // =========================================================================

  // 1. Alexandru Stan (NEXUS)
  const empStan = await prisma.employee.findUnique({
    where: { clientId_cnp: { clientId: clientNexus.id, cnp: '1880315410127' } },
  });
  if (empStan) {
    await prisma.identityDocument.upsert({
      where: { employeeId: empStan.id },
      update: {
        docType: 'CI',
        series: 'RD',
        number: '123456',
        issuedBy: 'SPCLEP Sector 1',
        issueDate: new Date('2020-05-10T00:00:00.000Z'),
        expiryDate: new Date('2030-05-10T00:00:00.000Z'),
      },
      create: {
        employeeId: empStan.id,
        docType: 'CI',
        series: 'RD',
        number: '123456',
        issuedBy: 'SPCLEP Sector 1',
        issueDate: new Date('2020-05-10T00:00:00.000Z'),
        expiryDate: new Date('2030-05-10T00:00:00.000Z'),
      },
    });

    await prisma.residenceAddress.upsert({
      where: { employeeId: empStan.id },
      update: {
        county: 'București',
        locality: 'București',
        street: 'Str. Victoriei',
        number: '10',
        building: 'A1',
        entrance: '1',
        floor: '2',
        apartment: '5',
        postalCode: '010061',
      },
      create: {
        employeeId: empStan.id,
        county: 'București',
        locality: 'București',
        street: 'Str. Victoriei',
        number: '10',
        building: 'A1',
        entrance: '1',
        floor: '2',
        apartment: '5',
        postalCode: '010061',
      },
    });
  }

  // 2. Ioana-Raluca Dumitru (NEXUS)
  const empDumitru = await prisma.employee.findUnique({
    where: { clientId_cnp: { clientId: clientNexus.id, cnp: '2941124120456' } },
  });
  if (empDumitru) {
    await prisma.identityDocument.upsert({
      where: { employeeId: empDumitru.id },
      update: {
        docType: 'CI',
        series: 'KX',
        number: '456789',
        issuedBy: 'SPCLEP Cluj-Napoca',
        issueDate: new Date('2019-12-05T00:00:00.000Z'),
        expiryDate: new Date('2029-11-23T00:00:00.000Z'),
      },
      create: {
        employeeId: empDumitru.id,
        docType: 'CI',
        series: 'KX',
        number: '456789',
        issuedBy: 'SPCLEP Cluj-Napoca',
        issueDate: new Date('2019-12-05T00:00:00.000Z'),
        expiryDate: new Date('2029-11-23T00:00:00.000Z'),
      },
    });

    await prisma.residenceAddress.upsert({
      where: { employeeId: empDumitru.id },
      update: {
        county: 'Cluj',
        locality: 'Cluj-Napoca',
        street: 'Str. Memorandumului',
        number: '24',
        building: 'B3',
        entrance: '2',
        floor: '3',
        apartment: '14',
        postalCode: '400114',
      },
      create: {
        employeeId: empDumitru.id,
        county: 'Cluj',
        locality: 'Cluj-Napoca',
        street: 'Str. Memorandumului',
        number: '24',
        building: 'B3',
        entrance: '2',
        floor: '3',
        apartment: '14',
        postalCode: '400114',
      },
    });
  }

  // 3. Gheorghe Barbu (NEXUS)
  const empBarbu = await prisma.employee.findUnique({
    where: { clientId_cnp: { clientId: clientNexus.id, cnp: '1790608080231' } },
  });
  if (empBarbu) {
    await prisma.identityDocument.upsert({
      where: { employeeId: empBarbu.id },
      update: {
        docType: 'CI',
        series: 'BV',
        number: '789123',
        issuedBy: 'SPCLEP Brașov',
        issueDate: new Date('2018-07-15T00:00:00.000Z'),
        expiryDate: new Date('2028-06-08T00:00:00.000Z'),
      },
      create: {
        employeeId: empBarbu.id,
        docType: 'CI',
        series: 'BV',
        number: '789123',
        issuedBy: 'SPCLEP Brașov',
        issueDate: new Date('2018-07-15T00:00:00.000Z'),
        expiryDate: new Date('2028-06-08T00:00:00.000Z'),
      },
    });

    await prisma.residenceAddress.upsert({
      where: { employeeId: empBarbu.id },
      update: {
        county: 'Brașov',
        locality: 'Brașov',
        street: 'Str. Republicii',
        number: '52',
        building: 'C1',
        entrance: 'A',
        floor: '1',
        apartment: '4',
        postalCode: '500030',
      },
      create: {
        employeeId: empBarbu.id,
        county: 'Brașov',
        locality: 'Brașov',
        street: 'Str. Republicii',
        number: '52',
        building: 'C1',
        entrance: 'A',
        floor: '1',
        apartment: '4',
        postalCode: '500030',
      },
    });
  }

  // 4. Marius Radu (BISTRO GOURMET)
  const empRadu = await prisma.employee.findUnique({
    where: { clientId_cnp: { clientId: clientBistro.id, cnp: '1820815410097' } },
  });
  if (empRadu) {
    await prisma.identityDocument.upsert({
      where: { employeeId: empRadu.id },
      update: {
        docType: 'CI',
        series: 'PH',
        number: '654321',
        issuedBy: 'SPCLEP Ploiești',
        issueDate: new Date('2021-09-01T00:00:00.000Z'),
        expiryDate: new Date('2031-08-15T00:00:00.000Z'),
      },
      create: {
        employeeId: empRadu.id,
        docType: 'CI',
        series: 'PH',
        number: '654321',
        issuedBy: 'SPCLEP Ploiești',
        issueDate: new Date('2021-09-01T00:00:00.000Z'),
        expiryDate: new Date('2031-08-15T00:00:00.000Z'),
      },
    });

    await prisma.residenceAddress.upsert({
      where: { employeeId: empRadu.id },
      update: {
        county: 'Prahova',
        locality: 'Ploiești',
        street: 'Bd. Independenței',
        number: '15',
        building: 'F5',
        entrance: '1',
        floor: '4',
        apartment: '18',
        postalCode: '100028',
      },
      create: {
        employeeId: empRadu.id,
        county: 'Prahova',
        locality: 'Ploiești',
        street: 'Bd. Independenței',
        number: '15',
        building: 'F5',
        entrance: '1',
        floor: '4',
        apartment: '18',
        postalCode: '100028',
      },
    });
  }

  // 5. Andreea Marin (BISTRO GOURMET)
  const empMarin = await prisma.employee.findUnique({
    where: { clientId_cnp: { clientId: clientBistro.id, cnp: '2950920410044' } },
  });
  if (empMarin) {
    await prisma.identityDocument.upsert({
      where: { employeeId: empMarin.id },
      update: {
        docType: 'CI',
        series: 'DP',
        number: '852963',
        issuedBy: 'SPCLEP Sector 2',
        issueDate: new Date('2020-10-10T00:00:00.000Z'),
        expiryDate: new Date('2030-09-20T00:00:00.000Z'),
      },
      create: {
        employeeId: empMarin.id,
        docType: 'CI',
        series: 'DP',
        number: '852963',
        issuedBy: 'SPCLEP Sector 2',
        issueDate: new Date('2020-10-10T00:00:00.000Z'),
        expiryDate: new Date('2030-09-20T00:00:00.000Z'),
      },
    });

    await prisma.residenceAddress.upsert({
      where: { employeeId: empMarin.id },
      update: {
        county: 'București',
        locality: 'București',
        street: 'Șos. Pantelimon',
        number: '112',
        building: 'P4',
        entrance: '3',
        floor: '5',
        apartment: '29',
        postalCode: '021614',
      },
      create: {
        employeeId: empMarin.id,
        county: 'București',
        locality: 'București',
        street: 'Șos. Pantelimon',
        number: '112',
        building: 'P4',
        entrance: '3',
        floor: '5',
        apartment: '29',
        postalCode: '021614',
      },
    });
  }

  console.log('\n✅ Seed finalizat cu succes!');
  console.log('Rezumat date create/actualizate:');
  console.log(`- Clienți: ${await prisma.client.count()}`);
  console.log(`- Puncte de lucru: ${await prisma.worksite.count()}`);
  console.log(`- Posturi / Funcții: ${await prisma.job.count()}`);
  console.log(`- Angajați: ${await prisma.employee.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Eroare la rularea seed-ului:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
