import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('--- Începere curățare completă bază de date SSM ---');

  // 1. Ștergere sesiuni de igienă
  const delHygiene = await prisma.hygieneSession.deleteMany();
  console.log(`✓ Sesiuni igienă șterse: ${delHygiene.count}`);

  // 2. Ștergere clienți (cascadă pe angajați, adrese, acte, posturi, puncte de lucru, documente generate, importuri etc.)
  const delClients = await prisma.client.deleteMany();
  console.log(`✓ Clienți șterși: ${delClients.count}`);

  // 3. Ștergere audit events
  const delAudits = await prisma.auditEvent.deleteMany();
  console.log(`✓ Înregistrări de audit șterse: ${delAudits.count}`);

  // 4. Verificare tabele
  const counts = {
    clients: await prisma.client.count(),
    worksites: await prisma.worksite.count(),
    jobs: await prisma.job.count(),
    employees: await prisma.employee.count(),
    identityDocuments: await prisma.identityDocument.count(),
    residenceAddresses: await prisma.residenceAddress.count(),
    employmentHistories: await prisma.employmentHistory.count(),
    riskAssessments: await prisma.riskAssessment.count(),
    trainingEvents: await prisma.trainingEvent.count(),
    generatedDocuments: await prisma.generatedDocument.count(),
    importBatches: await prisma.importBatch.count(),
    hygieneSessions: await prisma.hygieneSession.count(),
    hygieneParticipants: await prisma.hygieneParticipant.count(),
    auditEvents: await prisma.auditEvent.count(),
    templates: await prisma.template.count(),
  };

  console.log('\n--- Status tabele după curățare ---');
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }

  // 5. Curățare fișiere generate anterior din storage/documents
  const docsDir = path.resolve(process.cwd(), 'storage/documents');
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir);
    let removedFiles = 0;
    for (const f of files) {
      if (f !== '.gitkeep' && !f.startsWith('.')) {
        fs.unlinkSync(path.join(docsDir, f));
        removedFiles++;
      }
    }
    console.log(`✓ Fișiere documente generate temporare șterse din storage/documents: ${removedFiles}`);
  }

  console.log('\n✅ Baza de date este complet curată și gata pentru testare!');
}

main()
  .catch((err) => {
    console.error('Eroare la curățarea bazei de date:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
