import fs from 'fs';
import path from 'path';
import { buildStyledClientWorkbook } from '../src/lib/exporter';

async function main() {
  console.log('Generating styled client templates...');

  // 1. Șablonul gol oficial
  const emptyWb = buildStyledClientWorkbook(null);
  const emptyBuf = await emptyWb.xlsx.writeBuffer();

  const emptyPath = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
  fs.mkdirSync(path.dirname(emptyPath), { recursive: true });
  fs.writeFileSync(emptyPath, Buffer.from(emptyBuf));
  console.log(`Saved empty template to ${emptyPath} (${emptyBuf.byteLength} bytes)`);

  // 2. Șablonul completat cu exemplu (3 angajați)
  const sampleData = {
    name: 'NEXUS SOLUTIONS S.R.L.',
    cui: 'RO38765432',
    regCom: 'J40/5678/2021',
    address: 'București, Bd. Aviatorilor nr. 45, Sector 1',
    legalRepresentative: 'Munteanu Cristian',
    contactPerson: 'Simona Georgescu',
    contactEmail: 'contact@nexus-solutions.ro',
    contactPhone: '0722334455',
    worksites: [
      {
        name: 'Sediul Central',
        address: 'București, Bd. Aviatorilor nr. 45, Sector 1',
        activity: 'Dezvoltare software și consultanță IT',
      },
      {
        name: 'Punct de Lucru Vest',
        address: 'București, Str. Preciziei nr. 10, Sector 6',
        activity: 'Centru de date și mentenanță echipamente',
      },
    ],
    jobs: [
      {
        title: 'Inginer Sisteme Software',
        corCode: '251201',
        mainActivities: 'Proiectare arhitectură software, scriere cod, testare și implementare soluții cloud.',
        equipmentUsed: 'Laptop, monitor, tastatură, mouse, servere de dezvoltare.',
        workConditions: 'Muncă de birou, efort vizual prelungit la ecran, postură așezată.',
        workersCount: 2,
      },
      {
        title: 'Manager Proiect IT',
        corCode: '251206',
        mainActivities: 'Planificare proiecte, coordonare echipă, legătură cu clienții și managementul resurselor.',
        equipmentUsed: 'Laptop, telefon mobil, videoproiector, sistem videoconferință.',
        workConditions: 'Muncă de birou, deplasări ocazionale, întâlniri de coordonare.',
        workersCount: 1,
      },
      {
        title: 'Tehnician Mentenanță și Suport',
        corCode: '351101',
        mainActivities: 'Instalare cabluri rețea, diagnosticare calculatoare, asistență hardware utilizatori.',
        equipmentUsed: 'Trusă scule, tester cablu rețea, șurubelniță electrică, multimetru.',
        workConditions: 'Lucru în picioare, manipulare sarcini ușoare, risc electrocutare la tensiuni joase.',
        workersCount: 1,
      },
    ],
    employees: [
      {
        lastName: 'Stan',
        firstName: 'Alexandru',
        sex: 'M',
        cnp: '1880315410127',
        birthDate: '15.03.1988',
        birthPlace: 'București',
        birthCounty: 'Sector 1',
        citizenship: 'Română',
        identityDocument: {
          docType: 'CI',
          series: 'RD',
          number: '876543',
          issuedBy: 'SPCLEP S1',
          issueDate: '10.04.2021',
          expiryDate: '15.03.2031',
        },
        residenceAddress: {
          county: 'București',
          locality: 'București',
          street: 'Str. Dorobanți',
          number: '24',
          building: 'B2',
          entrance: 'A',
          floor: '4',
          apartment: '18',
        },
        email: 'alexandru.stan@nexus-solutions.ro',
        phone: '0744111222',
        currentJob: { title: 'Inginer Sisteme Software' },
        currentWorksite: { name: 'Sediul Central' },
        startDateOnJob: '15.01.2026',
        hireDate: '15.01.2026',
        status: 'ACTIV',
        hygieneRequested: true,
        hygieneModule: 'Modulul 1 - Nivelul 2',
        hygienePreferredSession: 'Noiembrie 2026',
        adminNotes: 'Instruire SSM la zi',
      },
      {
        lastName: 'Popescu',
        firstName: 'Elena-Maria',
        sex: 'F',
        cnp: '2920620420089',
        birthDate: '20.06.1992',
        birthPlace: 'Ploiești',
        birthCounty: 'Prahova',
        citizenship: 'Română',
        identityDocument: {
          docType: 'CI',
          series: 'PX',
          number: '654321',
          issuedBy: 'SPCLEP Ploiești',
          issueDate: '01.07.2020',
          expiryDate: '20.06.2030',
        },
        residenceAddress: {
          county: 'Ilfov',
          locality: 'Otopeni',
          street: 'Str. 23 August',
          number: '12',
          building: '',
          entrance: '',
          floor: '',
          apartment: '',
        },
        email: 'elena.popescu@nexus-solutions.ro',
        phone: '0755333444',
        currentJob: { title: 'Manager Proiect IT' },
        currentWorksite: { name: 'Sediul Central' },
        startDateOnJob: '01.02.2026',
        hireDate: '01.02.2026',
        status: 'ACTIV',
        hygieneRequested: false,
        hygieneModule: '',
        hygienePreferredSession: '',
        adminNotes: 'Control medicina muncii apt',
      },
      {
        lastName: 'Barbu',
        firstName: 'Gheorghe',
        sex: 'M',
        cnp: '1790608080231',
        birthDate: '08.06.1979',
        birthPlace: 'Brașov',
        birthCounty: 'Brașov',
        citizenship: 'Română',
        identityDocument: {
          docType: 'CI',
          series: 'BV',
          number: '456789',
          issuedBy: 'SPCLEP Brașov',
          issueDate: '15.08.2018',
          expiryDate: '08.06.2028',
        },
        residenceAddress: {
          county: 'București',
          locality: 'București',
          street: 'B-dul Iuliu Maniu',
          number: '140',
          building: 'M5',
          entrance: '2',
          floor: '7',
          apartment: '64',
        },
        email: 'gheorghe.barbu@nexus-solutions.ro',
        phone: '0722999000',
        currentJob: { title: 'Tehnician Mentenanță și Suport' },
        currentWorksite: { name: 'Punct de Lucru Vest' },
        startDateOnJob: '09.02.2026',
        hireDate: '09.02.2026',
        status: 'ACTIV',
        hygieneRequested: true,
        hygieneModule: 'Modulul 2 - Curățenie',
        hygienePreferredSession: 'Noiembrie 2026',
        adminNotes: 'Dotat cu echipament individual de protecție (bocanci S3, mănuși electroizolante)',
      },
    ],
  };

  const sampleWb = buildStyledClientWorkbook(sampleData as any);
  const sampleBuf = await sampleWb.xlsx.writeBuffer();

  const outPaths = [
    path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM_3_angajati.xlsx'),
    path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx'),
    path.join(process.cwd(), 'public', 'Test_Client_3_Angajati.xlsx'),
  ];

  outPaths.forEach((p) => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, Buffer.from(sampleBuf));
    console.log(`Saved sample template to ${p} (${sampleBuf.byteLength} bytes)`);
  });

  console.log('Template generation complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
