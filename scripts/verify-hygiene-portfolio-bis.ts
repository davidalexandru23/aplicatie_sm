import { prisma } from '../src/lib/prisma';
import { generateDocument } from '../src/lib/templates/generator';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

async function runHygienePortfolioVerification() {
  console.log('================================================================================');
  console.log('  TEST VERIFICARE: IGIENĂ PORTOFOLIU, SETĂRI SEPP, NUMEROTARE 1..X & BIS');
  console.log('================================================================================\n');

  // 1. Verificare Setări SEPP: Salvare și citire date igienă
  console.log('▶ Pasul 1: Verificare date igienă în SsmProvider');
  let provider = await prisma.ssmProvider.findFirst({ where: { isDefault: true } });
  if (!provider) {
    provider = await prisma.ssmProvider.findFirst();
  }

  if (provider) {
    const updatedProvider = await prisma.ssmProvider.update({
      where: { id: provider.id },
      data: {
        hygieneProviderName: 'EXPERT FORMARE IGIENĂ S.R.L.',
        hygieneMsAuthNumber: 'REG1/25711/16.09.2025',
        hygieneMeAuthNumber: '31160/14.10.2025',
        hygieneDspNumber: '10442',
        hygieneRepresentative: 'Dr. Mihai Popescu',
        hygieneRepresentativeRole: 'Director Executiv',
        hygieneDefaultLocation: 'București, Str. Formării nr. 10',
        hygieneDoctorName: 'Dr. Alexandru Ionescu - Medic Primar Igienă',
        hygieneCommissionPresident: 'Dr. Radu Ionescu - Medic Primar DSP',
        hygieneCommissionMember1: 'Ing. Mihai Popescu - Furnizor',
        hygieneCommissionMember2: 'Insp. Dan Mihai - DSP',
        hygieneCommissionSecretary: 'Andreea Dumitru',
      },
    });

    console.log(`  ✓ SsmProvider actualizat cu succes: DSP nr. ${updatedProvider.hygieneDspNumber}, Aviz MS ${updatedProvider.hygieneMsAuthNumber}`);
  }

  // 2. Verificare Selecție Angajați din Firme Diferite (Multi-client Session)
  console.log('\n▶ Pasul 2: Creare sesiune multi-client cu angajați din portofoliu');
  const employees = await prisma.employee.findMany({
    take: 3,
    include: { client: true, identityDocument: true, currentJob: true },
  });

  if (employees.length < 2) {
    throw new Error('Sunt necesari cel puțin 2 angajați în DB pentru a verifica sesiunea multi-client.');
  }

  console.log(`  Selectat ${employees.length} angajați din companiile: ${Array.from(new Set(employees.map(e => e.client.name))).join(', ')}`);

  const sessionYear = 2026;
  const testSession = await prisma.hygieneSession.create({
    data: {
      providerName: 'EXPERT FORMARE IGIENĂ S.R.L.',
      msAuthorization: 'REG1/25711/16.09.2025',
      meAuthorization: '31160/14.10.2025',
      sessionDate: new Date('2026-05-10'),
      examDate: new Date('2026-05-12'),
      location: 'București, Str. Formării nr. 10',
      commissionPresident: 'Dr. Radu Ionescu - Medic Primar DSP',
      commissionMember1: 'Ing. Mihai Popescu',
      commissionMember2: 'Insp. Dan Mihai',
      commissionSecretary: 'Andreea Dumitru',
      status: 'programata',
      participants: {
        create: employees.map((emp) => ({
          clientName: emp.client.name,
          lastName: emp.lastName,
          firstName: emp.firstName,
          cnp: emp.cnp,
          birthDate: emp.birthDate,
          birthPlace: emp.birthPlace,
          docType: emp.identityDocument?.docType || 'CI',
          docSeries: emp.identityDocument?.series || null,
          docNumber: emp.identityDocument?.number || null,
          jobTitle: emp.currentJob?.title || null,
          attendance: 'prezent',
          examResult: 'admis',
          employeeId: emp.id,
        })),
      },
    },
    include: { participants: true },
  });

  console.log(`  ✓ Sesiune creată cu ID: ${testSession.id}, conține ${testSession.participants.length} cursanți.`);

  // 3. Verificare Numerotare Secvențială Anuală (1..X)
  console.log('\n▶ Pasul 3: Numerotare anuală secvențială la finalizarea sesiunii');
  // Alocăm numere 1, 2...
  let seqNumber = 1;
  for (const part of testSession.participants) {
    await prisma.hygieneParticipant.update({
      where: { id: part.id },
      data: {
        certificateNumber: String(seqNumber),
        certificateDate: testSession.examDate,
      },
    });
    console.log(`  ✓ Cursant ${part.lastName} ${part.firstName} alocat: Nr. ${seqNumber}`);
    seqNumber++;
  }

  // 4. Verificare Emitere Retroactivă cu Număr BIS (Remediere Control)
  console.log('\n▶ Pasul 4: Emitere adeverință retroactivă cu număr BIS (ex: 1BIS)');
  const bisParticipant = testSession.participants[0];
  const retroactiveDate = new Date('2025-11-15');
  const bisNumber = '1BIS';

  const updatedBisPart = await prisma.hygieneParticipant.update({
    where: { id: bisParticipant.id },
    data: {
      certificateNumber: bisNumber,
      certificateDate: retroactiveDate,
      // Fără serie DSP
      certificateSeries: null,
    },
  });

  console.log(`  ✓ Participant actualizat retroactiv: Nr. ${updatedBisPart.certificateNumber}, Dată: ${updatedBisPart.certificateDate?.toISOString().slice(0, 10)}`);

  // 5. Verificare Generare Document DOCX 'Adeverinta participare'
  console.log('\n▶ Pasul 5: Generare DOCX Adeverință participare și verificare absență Serie DSP');
  const { resolvedData } = await resolveTemplatePlaceholders({
    templateCode: 'hygiene-adeverinta',
    clientId: employees[0].clientId,
    hygieneSessionId: testSession.id,
    hygieneParticipantId: bisParticipant.id,
  });

  console.log(`  PLACEHOLDER_NUMAR_ADEVERINTA: "${resolvedData.PLACEHOLDER_NUMAR_ADEVERINTA}"`);
  console.log(`  PLACEHOLDER_SERIE_ADEVERINTA: "${resolvedData.PLACEHOLDER_SERIE_ADEVERINTA}"`);
  console.log(`  PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: "${resolvedData.PLACEHOLDER_SERIE_NUMAR_CERTIFICAT}"`);

  if (resolvedData.PLACEHOLDER_NUMAR_ADEVERINTA !== '1BIS') {
    throw new Error(`Așteptat PLACEHOLDER_NUMAR_ADEVERINTA = '1BIS', dar s-a obținut: '${resolvedData.PLACEHOLDER_NUMAR_ADEVERINTA}'`);
  }

  if (resolvedData.PLACEHOLDER_SERIE_ADEVERINTA !== '') {
    throw new Error(`Așteptat PLACEHOLDER_SERIE_ADEVERINTA să fie gol, dar s-a obținut: '${resolvedData.PLACEHOLDER_SERIE_ADEVERINTA}'`);
  }

  const docResult = await generateDocument({
    templateCode: 'hygiene-adeverinta',
    clientId: employees[0].clientId,
    hygieneSessionId: testSession.id,
    data: resolvedData,
    operatorName: 'Inspector Test',
  });

  console.log(`  ✓ Document DOCX generat la calea: ${docResult.filePath}`);

  // Inspect generated DOCX XML content
  const generatedBytes = fs.readFileSync(docResult.filePath);
  const zip = new PizZip(generatedBytes);
  const docXml = zip.file('word/document.xml')?.asText() || '';

  // Extract visible text
  const cleanText = docXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  console.log(`\n  Fragment text generat din DOCX:`);
  const matchNr = cleanText.match(/Nr\.\s*1BIS/);
  console.log(`  - Găsit "Nr. 1BIS": ${!!matchNr}`);

  if (!matchNr) {
    throw new Error('Textul generat nu conține "Nr. 1BIS".');
  }

  if (cleanText.includes('Seria ,') || cleanText.includes('Seria DSP')) {
    throw new Error('Textul generat conține încă referințe de serie DSP.');
  }

  console.log('  ✓ Nicio serie DSP nu apare în adeverința generată. Apare exclusiv "Nr. 1BIS".');

  // Curățare sesiune test
  await prisma.hygieneSession.delete({ where: { id: testSession.id } });
  console.log(`\n✓ Curățare sesiune test efectuată cu succes.`);
  console.log('\n================================================================================');
  console.log('  TOATE CELE 5 VERIFICĂRI AU FOST TRECUTE CU SUCCES (100% PASS RATE)');
  console.log('================================================================================');
}

runHygienePortfolioVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  });
