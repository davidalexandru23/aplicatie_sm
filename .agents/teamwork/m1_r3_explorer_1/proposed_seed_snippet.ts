/**
 * Proposed seed additions for External SSM Provider & Specialists
 * Target: prisma/seed.ts
 */

// 1. SECTION TO INSERT BEFORE CLIENT 1:
/*
  // =========================================================================
  // PRESTATOR EXTERN SSM (SEPP) & SPECIALIȘTI (MILESTONE 1 - F1)
  // =========================================================================
  console.log('0. Seeding Prestator Extern SSM & Specialiști...');
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

  const specialistPopescu = await prisma.ssmSpecialist.upsert({
    where: {
      providerId_name: {
        providerId: defaultProvider.id,
        name: 'Ing. Mihai Popescu',
      },
    },
    update: {
      role: 'Specialist Principal SSM & Evaluator Riscuri',
      certificateNumber: 'Certificat seria EV nr. 10452/2018',
      qualification: 'Inginer Securitate în Muncă, Evaluator atestat INCDPM București',
      phone: '0722.123.456',
      email: 'mihai.popescu@expert-ssm.ro',
      isDefault: true,
      isActive: true,
    },
    create: {
      providerId: defaultProvider.id,
      name: 'Ing. Mihai Popescu',
      role: 'Specialist Principal SSM & Evaluator Riscuri',
      certificateNumber: 'Certificat seria EV nr. 10452/2018',
      qualification: 'Inginer Securitate în Muncă, Evaluator atestat INCDPM București',
      phone: '0722.123.456',
      email: 'mihai.popescu@expert-ssm.ro',
      isDefault: true,
      isActive: true,
    },
  });

  const specialistVasilescu = await prisma.ssmSpecialist.upsert({
    where: {
      providerId_name: {
        providerId: defaultProvider.id,
        name: 'Ing. Elena Vasilescu',
      },
    },
    update: {
      role: 'Specialist SSM & Coordonator SU / PSI',
      certificateNumber: 'Certificat seria SSM nr. 8765/2020',
      qualification: 'Inginer Securitatea Muncii, Cadru Tehnic PSI atestat IGSU',
      phone: '0722.987.654',
      email: 'elena.vasilescu@expert-ssm.ro',
      isDefault: false,
      isActive: true,
    },
    create: {
      providerId: defaultProvider.id,
      name: 'Ing. Elena Vasilescu',
      role: 'Specialist SSM & Coordonator SU / PSI',
      certificateNumber: 'Certificat seria SSM nr. 8765/2020',
      qualification: 'Inginer Securitatea Muncii, Cadru Tehnic PSI atestat IGSU',
      phone: '0722.987.654',
      email: 'elena.vasilescu@expert-ssm.ro',
      isDefault: false,
      isActive: true,
    },
  });
*/

// 2. MODIFICATION TO CLIENT 1 (NEXUS SOLUTIONS S.R.L.):
/*
  In update and create:
  providerId: defaultProvider.id,
  specialistId: specialistPopescu.id,
  ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  ssmSpecialistName: 'Ing. Mihai Popescu',
  ssmSpecialistCert: 'Certificat seria EV nr. 10452/2018',
*/

// 3. MODIFICATION TO CLIENT 2 (BISTRO GOURMET S.R.L.):
/*
  In update and create:
  providerId: defaultProvider.id,
  specialistId: specialistVasilescu.id, // Or specialistPopescu.id
  ssmProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
  ssmSpecialistName: 'Ing. Elena Vasilescu', // Or 'Ing. Mihai Popescu'
  ssmSpecialistCert: 'Certificat seria SSM nr. 8765/2020', // Or 'Certificat seria EV nr. 10452/2018'
*/

// 4. MODIFICATION TO SUMMARY AT THE END OF MAIN():
/*
  console.log(`- Prestatori SSM: ${await prisma.ssmProvider.count()}`);
  console.log(`- Specialiști SSM: ${await prisma.ssmSpecialist.count()}`);
*/
