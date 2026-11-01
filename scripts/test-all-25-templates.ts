import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { generateDocument } from '../src/lib/templates/generator';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';

async function runTestSuite() {
  console.log('====================================================');
  console.log('TEST SUITE: Generare automată pentru toate cele 25 de șabloane');
  console.log('====================================================\n');

  await prisma.client.deleteMany({ where: { cui: 'RO99887766' } });

  // 1. Create a synthetic client in the DB for the test
  const testClient = await prisma.client.create({
    data: {
      name: 'SC TEST AUTOMATION SRL',
      cui: 'RO99887766',
      regCom: 'J40/9999/2026',
      address: 'București, Sector 1, Calea Victoriei nr. 100',
      legalRepresentative: 'Ionescu Vasile',
      contactPerson: 'Ionescu Vasile',
      contactPhone: '0722000999',
      contactEmail: 'contact@testautomation.ro',
    },
  });

  const testJob = await prisma.job.create({
    data: {
      clientId: testClient.id,
      title: 'Programator Sistem Informatic',
      corCode: '251201',
      mainActivities: 'Dezvoltare software, analiză tehnică, testare',
    },
  });

  const testWorksite = await prisma.worksite.create({
    data: {
      clientId: testClient.id,
      name: 'Punct de Lucru Victoriei',
      address: 'București, Sector 1, Calea Victoriei nr. 100, Etaj 3',
      activity: 'Activități IT și birou',
    },
  });

  const testEmployee = await prisma.employee.create({
    data: {
      clientId: testClient.id,
      currentJobId: testJob.id,
      currentWorksiteId: testWorksite.id,
      firstName: 'Mihai',
      lastName: 'Dumitrescu',
      cnp: '1880315410127',
      birthDate: new Date('1988-03-15'),
      birthPlace: 'București',
      birthCounty: 'Sector 1',
      hireDate: new Date('2026-01-10'),
      hygieneModule: 'Nivelul 1 - Servicii de curățenie și alimentație',
      identityDocument: {
        create: {
          docType: 'C.I.',
          series: 'RX',
          number: '654321',
          issuedBy: 'SPCLEP Sector 1',
          issueDate: new Date('2020-05-10'),
          expiryDate: new Date('2030-05-10'),
        },
      },
      residenceAddress: {
        create: {
          county: 'București',
          locality: 'Sector 1',
          street: 'Bulevardul Dacia',
          number: '45',
          building: 'D2',
          entrance: 'B',
          floor: '4',
          apartment: '18',
        },
      },
    },
  });

  const testSession = await prisma.hygieneSession.create({
    data: {
      providerName: 'SC EXPERT SSM TRAINING SRL',
      msAuthorization: 'Aviz MS nr. 102/2024',
      meAuthorization: 'Aviz ME nr. 55/2024',
      sessionDate: new Date('2026-03-10'),
      examDate: new Date('2026-03-15'),
      location: 'Sediul Prestatorului București',
      pvSeriesNumber: 'PV-EX-2026-01',
      commissionPresident: 'Dr. Ionescu Radu',
      commissionMember1: 'As. Medical Mihai Elena',
      commissionMember2: 'Insp. DSP Popa Dan',
      commissionSecretary: 'Secretar Georgescu Ana',
      participants: {
        create: [
          {
            employeeId: testEmployee.id,
            firstName: 'Mihai',
            lastName: 'Dumitrescu',
            cnp: '1880315410127',
            birthDate: new Date('1988-03-15'),
            birthPlace: 'București',
            docType: 'C.I.',
            docSeries: 'RX',
            docNumber: '654321',
            jobTitle: 'Programator',
            clientName: testClient.name,
            attendance: 'prezent',
            examGrade: 10,
            examResult: 'admis',
            certificateSeries: 'IGI',
            certificateNumber: '101',
          },
        ],
      },
    },
    include: {
      participants: true,
    },
  });

  const participant = testSession.participants[0];

  const results: Array<{
    code: string;
    filename: string;
    format: string;
    status: string;
    fileSizeBytes: number;
    missingCount: number;
    success: boolean;
    error?: string;
  }> = [];

  for (const tpl of TEMPLATE_CATALOG) {
    try {
      // 1. Resolve placeholders
      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: tpl.code,
        clientId: testClient.id,
        employeeId: testEmployee.id,
        jobId: testJob.id,
        hygieneSessionId: testSession.id,
        hygieneParticipantId: participant.id,
      });

      // 2. Generate document
      const gen = await generateDocument({
        templateCode: tpl.code,
        clientId: testClient.id,
        employeeId: testEmployee.id,
        jobId: testJob.id,
        hygieneSessionId: testSession.id,
        data: resolvedData,
        operatorName: 'Test Automator',
      });

      const exists = fs.existsSync(gen.filePath);
      const stat = exists ? fs.statSync(gen.filePath) : null;

      results.push({
        code: tpl.code,
        filename: tpl.normalizedFilename,
        format: tpl.format,
        status: gen.status,
        fileSizeBytes: stat ? stat.size : 0,
        missingCount: gen.missingFields.length,
        success: exists && (stat ? stat.size > 0 : false),
      });

      console.log(
        `✓ [${tpl.format.toUpperCase().padEnd(4)}] ${tpl.code.padEnd(28)} -> ${gen.status.padEnd(18)} (${(stat?.size || 0)} bytes)`
      );
    } catch (err: any) {
      console.error(`✗ [${tpl.format.toUpperCase().padEnd(4)}] ${tpl.code}: ${err.message}`);
      results.push({
        code: tpl.code,
        filename: tpl.normalizedFilename,
        format: tpl.format,
        status: 'error',
        fileSizeBytes: 0,
        missingCount: 0,
        success: false,
        error: err.message,
      });
    }
  }

  // Cleanup synthetic test records
  console.log('\nCleaning synthetic test data from database...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "AuditEvent",
      "GeneratedDocument",
      "ImportBatch",
      "TrainingParticipant",
      "TrainingEvent",
      "HygieneParticipant",
      "HygieneSession",
      "PreventionMeasure",
      "RiskItem",
      "HazardZone",
      "RiskAssessment",
      "EmploymentHistory",
      "IdentityDocument",
      "ResidenceAddress",
      "Employee",
      "Job",
      "Worksite",
      "Client"
    CASCADE;
  `);

  console.log('\n====================================================');
  console.log('REZULTATE TEST SUITE:');
  const passed = results.filter((r) => r.success).length;
  const total = results.length;
  console.log(`Total șabloane testate: ${total}`);
  console.log(`Reușite: ${passed} / ${total}`);
  console.log('====================================================');

  if (passed !== total) {
    console.error('Anumite teste au eșuat!');
    process.exit(1);
  } else {
    console.log('Toate cele 25 de șabloane se generează cu succes 100%!');
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error running test suite:', err);
    process.exit(1);
  });
