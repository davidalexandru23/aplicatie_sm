import { PrismaClient } from '@prisma/client';
import { seedTemplates } from '../src/lib/templates/seed';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. CURĂȚARE TOTALĂ DATE CLIENȚI & OPERAȚIONALE ===');

  // Ordinea de ștergere respectă toate constrângerile foreign key
  await prisma.auditEvent.deleteMany({});
  await prisma.importBatch.deleteMany({});
  await prisma.generatedDocument.deleteMany({});
  await prisma.riskAssessment.deleteMany({});
  await prisma.trainingParticipant.deleteMany({});
  await prisma.trainingEvent.deleteMany({});
  await prisma.hygieneParticipant.deleteMany({});
  await prisma.hygieneSession.deleteMany({});
  await prisma.employeeEipAssignment.deleteMany({});
  await prisma.identityDocument.deleteMany({});
  await prisma.residenceAddress.deleteMany({});
  await prisma.employmentHistory.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.jobEipRequirement.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.worksite.deleteMany({});
  await prisma.client.deleteMany({});

  console.log('Toate tabelele operaționale și de clienți au fost golite cu succes.');

  console.log('=== 2. SEEDING ȘABLOANE STATUTARE & PRESTATOR SEPP ===');
  // Re-seed cele 31 de șabloane oficiale
  await seedTemplates();
  console.log('31 șabloane statutare verificate/actualizate în catalog.');

  // Prestator extern SSM implicit
  const defaultProvider = await prisma.ssmProvider.upsert({
    where: { cui: 'RO34567890' },
    update: {
      name: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      regCom: 'J40/1234/2020',
      address: 'București, Str. Agricultori nr. 35, Sector 2',
      street: 'Str. Agricultori',
      number: '35',
      building: 'A1',
      entrance: '1',
      floor: '2',
      apartment: '6',
      postalCode: '021481',
      locality: 'București',
      county: 'Sector 2',
      authorizationNumber: '4812/2021',
      authorizationDate: new Date('2021-06-15T00:00:00.000Z'),
      authorizationDetails:
        'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București',
      phone: '0722.123.456',
      email: 'contact@expert-ssm.ro',
      website: 'www.expert-ssm.ro',
      legalRepresentative: 'Ing. Mihai Popescu',
      representativeRole: 'Director Executiv',
      representativeDoc: 'Decizia Asociaților nr. 01/2020',
      isDefault: true,
      isActive: true,
    },
    create: {
      name: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      cui: 'RO34567890',
      regCom: 'J40/1234/2020',
      address: 'București, Str. Agricultori nr. 35, Sector 2',
      street: 'Str. Agricultori',
      number: '35',
      building: 'A1',
      entrance: '1',
      floor: '2',
      apartment: '6',
      postalCode: '021481',
      locality: 'București',
      county: 'Sector 2',
      authorizationNumber: '4812/2021',
      authorizationDate: new Date('2021-06-15T00:00:00.000Z'),
      authorizationDetails:
        'Certificat abilitare Serviciu Extern SSM nr. 4812/2021 emis de Ministerul Muncii - ITM București',
      phone: '0722.123.456',
      email: 'contact@expert-ssm.ro',
      website: 'www.expert-ssm.ro',
      legalRepresentative: 'Ing. Mihai Popescu',
      representativeRole: 'Director Executiv',
      representativeDoc: 'Decizia Asociaților nr. 01/2020',
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.ssmSpecialist.upsert({
    where: {
      providerId_name: {
        providerId: defaultProvider.id,
        name: 'Ing. Mihai Popescu',
      },
    },
    update: {
      role: 'Inspector Protecția Muncii / Specialist SSM Curs Postuniversitar',
      certificateNumber: 'CERT-SSM-8849/2019',
      phone: '0722.123.456',
      email: 'mihai.popescu@expert-ssm.ro',
      isActive: true,
    },
    create: {
      providerId: defaultProvider.id,
      name: 'Ing. Mihai Popescu',
      role: 'Inspector Protecția Muncii / Specialist SSM Curs Postuniversitar',
      certificateNumber: 'CERT-SSM-8849/2019',
      phone: '0722.123.456',
      email: 'mihai.popescu@expert-ssm.ro',
      isActive: true,
    },
  });

  await prisma.ssmSpecialist.upsert({
    where: {
      providerId_name: {
        providerId: defaultProvider.id,
        name: 'Dr. Elena Vasilescu',
      },
    },
    update: {
      role: 'Medic Specialist Medicina Muncii',
      certificateNumber: 'MM-RO-5421/2018',
      phone: '0733.987.654',
      email: 'elena.vasilescu@expert-ssm.ro',
      isActive: true,
    },
    create: {
      providerId: defaultProvider.id,
      name: 'Dr. Elena Vasilescu',
      role: 'Medic Specialist Medicina Muncii',
      certificateNumber: 'MM-RO-5421/2018',
      phone: '0733.987.654',
      email: 'elena.vasilescu@expert-ssm.ro',
      isActive: true,
    },
  });

  // Seed Catalog EIP (HG 1048/2006)
  const eipItems = [
    { code: 'EIP-INC-01', name: 'Încălțăminte antiderapantă bucătar (OB-E-A-FO SRC)', standardCode: 'EN ISO 20347', protectionType: 'Antialunecare, Rezistență hidrocarburi', replacementMonths: 12 },
    { code: 'EIP-BON-01', name: 'Bonetă bucătar / beretă protecție păr', standardCode: 'HACCP / EN 340', protectionType: 'Igienic, Protecție alimentară', replacementMonths: 6 },
    { code: 'EIP-HAL-01', name: 'Halat / tunică albă bucătar bumbac', standardCode: 'EN 340', protectionType: 'Protecție termică moderată, igienă', replacementMonths: 12 },
    { code: 'EIP-SOR-01', name: 'Șorț impermeabil protecție stropire', standardCode: 'EN 340', protectionType: 'Protecție lichide fierbinți', replacementMonths: 12 },
    { code: 'EIP-MAN-01', name: 'Mănuși termoprotectoare cuptor', standardCode: 'EN 407', protectionType: 'Protecție căldură de contact', replacementMonths: 12 },
    { code: 'EIP-BOC-01', name: 'Bocanci protecție S3 SRC bombeu compozit', standardCode: 'EN ISO 20345', protectionType: 'Mecanic, Antiperforare, Antistatic', replacementMonths: 12 },
    { code: 'EIP-MAN-02', name: 'Mănuși electroizolante joasă tensiune', standardCode: 'EN 60903', protectionType: 'Electrocutare 1000V', replacementMonths: 12 },
    { code: 'EIP-OCH-01', name: 'Ochelari protecție ecran filtru lumină albastră', standardCode: 'EN 166', protectionType: 'Optic, Antireflex', replacementMonths: 24 },
  ];

  for (const item of eipItems) {
    await prisma.eipItem.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    });
  }

  // Verificare bilanț
  const clientsCount = await prisma.client.count();
  const employeesCount = await prisma.employee.count();
  const templatesCount = await prisma.template.count();
  const eipCount = await prisma.eipItem.count();

  console.log('=== BILANȚ RESET BAZĂ DE DATE ===');
  console.log(`Clienți: ${clientsCount} (așteptat 0)`);
  console.log(`Angajați: ${employeesCount} (așteptat 0)`);
  console.log(`Șabloane active în catalog: ${templatesCount} (așteptat 31)`);
  console.log(`Articole catalog EIP: ${eipCount} (așteptat ${eipItems.length})`);
}

main()
  .catch((e) => {
    console.error('Eroare la resetarea bazei de date:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
