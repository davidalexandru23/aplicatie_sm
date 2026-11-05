import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Actualizare Date Statutare & EIP (Milestone 2) ---');

  // 1. Update Jobs with profiling flags
  console.log('1. Actualizare Profiling Riscuri pe Posturi (Jobs)...');
  await prisma.job.updateMany({
    where: { title: { in: ['Inginer Sisteme Software', 'Specialist Resurse Umane', 'Asistent Manager & Contabilitate'] } },
    data: {
      isScreenWork: true,
      isFoodHandling: false,
      workPosture: 'sitting',
      maxWeightKg: 5,
    },
  });

  await prisma.job.updateMany({
    where: { title: 'Tehnician Mentenanță și Suport' },
    data: {
      isDrivingRequired: true,
      isScreenWork: false,
      isFoodHandling: false,
      workPosture: 'mixed',
      maxWeightKg: 25,
      noiseExposed: true,
    },
  });

  await prisma.job.updateMany({
    where: { title: { in: ['Bucătar Specialist', 'Ajutor Bucătar', 'Ospătar / Chelner'] } },
    data: {
      isFoodHandling: true,
      isScreenWork: false,
      workPosture: 'standing',
      maxWeightKg: 15,
    },
  });

  // 2. Update Employee Contractual CIM & Medical Data
  console.log('2. Actualizare Date CIM & Date Personale Salariați...');

  // Nexus 1: Gheorghe Barbu (Tehnician)
  await prisma.employee.updateMany({
    where: { cnp: '1790608080231' },
    data: {
      cimNumber: '101/2021',
      cimDate: new Date('2021-03-01T00:00:00.000Z'),
      grossSalary: 6200,
      workNorm: 8,
      probationDays: 90,
      annualLeaveDays: 21,
      bankIban: 'RO49AAAA1B31007593840001',
      bankName: 'Banca Transilvania',
      bloodType: 'AII',
      rhFactor: '+',
      qualification: 'Tehnician Electronică și Telecomunicații',
      commuteRoute: 'Metrou Nicolae Grigorescu - Politehnica',
      commuteDurationMinutes: 35,
      shoeSize: '43',
      clothingSize: 'L',
      gloveSize: '10',
    },
  });

  // Nexus 2: Ioana-Raluca Dumitru (HR)
  await prisma.employee.updateMany({
    where: { cnp: '2941124120456' },
    data: {
      cimNumber: '102/2026',
      cimDate: new Date('2026-01-31T00:00:00.000Z'),
      grossSalary: 7500,
      workNorm: 8,
      probationDays: 90,
      annualLeaveDays: 21,
      bankIban: 'RO12BTRL0001234567890123',
      bankName: 'Banca Transilvania',
      bloodType: '0I',
      rhFactor: '+',
      qualification: 'Specialist Resurse Umane',
      commuteRoute: 'Metrou Piața Victoriei - Aviatorilor',
      commuteDurationMinutes: 20,
      shoeSize: '38',
      clothingSize: 'M',
      gloveSize: '7',
    },
  });

  // Nexus 3: Alexandru Stan (Dev)
  await prisma.employee.updateMany({
    where: { cnp: '1880315410127' },
    data: {
      cimNumber: '103/2022',
      cimDate: new Date('2022-02-01T00:00:00.000Z'),
      grossSalary: 12500,
      workNorm: 8,
      probationDays: 90,
      annualLeaveDays: 24,
      bankIban: 'RO35INGB0000999912345678',
      bankName: 'ING Bank',
      bloodType: 'BIII',
      rhFactor: '+',
      qualification: 'Inginer Calculatoare',
      commuteRoute: 'Metrou Piața Unirii - Aviatorilor',
      commuteDurationMinutes: 25,
      shoeSize: '42',
      clothingSize: 'L',
      gloveSize: '9',
    },
  });

  // Nexus 4: Elena Vasilescu (Admin)
  await prisma.employee.updateMany({
    where: { cnp: '2980514410023' },
    data: {
      cimNumber: '104/2026',
      cimDate: new Date('2026-10-15T00:00:00.000Z'),
      grossSalary: 5500,
      workNorm: 8,
      probationDays: 90,
      annualLeaveDays: 20,
      bankIban: 'RO58BCRR0001234567890123',
      bankName: 'BCR',
      bloodType: 'ABIV',
      rhFactor: '+',
      qualification: 'Economist',
      commuteRoute: 'Metrou Dristor - Aviatorilor',
      commuteDurationMinutes: 30,
      shoeSize: '37',
      clothingSize: 'S',
      gloveSize: '7',
    },
  });

  // Bistro 1: Marius Radu (Chef)
  await prisma.employee.updateMany({
    where: { cnp: '1820815410097' },
    data: {
      cimNumber: '201/2025',
      cimDate: new Date('2025-04-01T00:00:00.000Z'),
      grossSalary: 6800,
      workNorm: 8,
      probationDays: 90,
      annualLeaveDays: 21,
      bankIban: 'RO22BRDE450SV12345678901',
      bankName: 'BRD',
      bloodType: '0I',
      rhFactor: '+',
      qualification: 'Bucătar Calificat - Diplomă Curs Calificare',
      commuteRoute: 'STB Linia 330 - Calea Floreasca',
      commuteDurationMinutes: 30,
      shoeSize: '42',
      clothingSize: 'L',
      gloveSize: '9',
    },
  });

  // Bistro 2: Andreea Marin (Ospătar)
  await prisma.employee.updateMany({
    where: { cnp: '2950920410044' },
    data: {
      cimNumber: '202/2025',
      cimDate: new Date('2025-05-15T00:00:00.000Z'),
      grossSalary: 4500,
      workNorm: 8,
      probationDays: 90,
      annualLeaveDays: 20,
      bankIban: 'RO90RZBR0000060012345678',
      bankName: 'Raiffeisen Bank',
      bloodType: 'AII',
      rhFactor: '+',
      qualification: 'Ospătar / Tehnician Servire',
      commuteRoute: 'Metrou Ștefan cel Mare - Floreasca',
      commuteDurationMinutes: 20,
      shoeSize: '37',
      clothingSize: 'M',
      gloveSize: '7',
    },
  });

  // 3. Seed EIP Items & Requirements/Assignments
  console.log('3. Seeding Echipamente Individuale de Protecție (EIP)...');
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

  // Connect Job Requirements
  const chefJob = await prisma.job.findFirst({ where: { title: 'Bucătar Specialist' } });
  if (chefJob) {
    const inc = await prisma.eipItem.findUnique({ where: { code: 'EIP-INC-01' } });
    const bon = await prisma.eipItem.findUnique({ where: { code: 'EIP-BON-01' } });
    const hal = await prisma.eipItem.findUnique({ where: { code: 'EIP-HAL-01' } });
    const sor = await prisma.eipItem.findUnique({ where: { code: 'EIP-SOR-01' } });
    for (const it of [inc, bon, hal, sor]) {
      if (it) {
        await prisma.jobEipRequirement.upsert({
          where: { jobId_eipItemId: { jobId: chefJob.id, eipItemId: it.id } },
          update: {},
          create: { jobId: chefJob.id, eipItemId: it.id },
        });
      }
    }
  }

  const techJob = await prisma.job.findFirst({ where: { title: 'Tehnician Mentenanță și Suport' } });
  if (techJob) {
    const boc = await prisma.eipItem.findUnique({ where: { code: 'EIP-BOC-01' } });
    const man = await prisma.eipItem.findUnique({ where: { code: 'EIP-MAN-02' } });
    for (const it of [boc, man]) {
      if (it) {
        await prisma.jobEipRequirement.upsert({
          where: { jobId_eipItemId: { jobId: techJob.id, eipItemId: it.id } },
          update: {},
          create: { jobId: techJob.id, eipItemId: it.id },
        });
      }
    }
  }

  console.log('✅ Date statutare & EIP actualizate cu succes!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
