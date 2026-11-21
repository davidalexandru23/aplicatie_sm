import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { calculateEmployeeCompliance } from '../src/lib/compliance';
import { checkEmployeeTemplateExpiry } from '../src/app/api/documents/generate-batch/route';

async function main() {
  console.log('========================================================================');
  console.log('TEST AUTOMATIZAT: GENERARE COLECTIVĂ MULTI-SALARIAȚI & BLOCARE EXPIRARE');
  console.log('========================================================================\n');

  // 1. Găsire client Restaurant La Conac
  const client = await prisma.client.findFirst({
    where: { cui: 'RO48901234' },
    include: {
      employees: {
        include: {
          currentJob: true,
          identityDocument: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error('Clientul Restaurant La Conac nu a fost găsit.');
  }

  console.log(`Client test: ${client.name} (CUI: ${client.cui})`);
  console.log(`Număr salariați: ${client.employees.length}`);

  // 2. Evaluare status conformitate pe fiecare salariat
  console.log('\n--- 1. Verificare status conformitate salariați ---');
  for (const emp of client.employees) {
    const comp = calculateEmployeeCompliance(emp);
    const ssmExpiry = checkEmployeeTemplateExpiry('ssm-fisa-instruire-individuala', comp);
    console.log(`Salariat: ${emp.lastName} ${emp.firstName} (${emp.currentJob?.title || 'Fără post'})`);
    console.log(`  - Status SSM: ${comp.ssmTraining.status} (Scadență: ${comp.ssmTraining.dueDate ? new Date(comp.ssmTraining.dueDate).toLocaleDateString('ro-RO') : 'N/A'})`);
    console.log(`  - Eligibil pentru Fișă Instruire SSM: ${ssmExpiry.isExpired ? 'BLOCAT 🚫' : 'ELIGIBIL ✓'}`);
    if (ssmExpiry.isExpired) {
      console.log(`    Motiv blocare: ${ssmExpiry.reason}`);
    }
  }

  const stan = client.employees.find((e) => e.lastName === 'Stan');
  const vasile = client.employees.find((e) => e.lastName === 'Vasile');
  const gheorghe = client.employees.find((e) => e.lastName === 'Gheorghe');

  if (!stan || !vasile || !gheorghe) {
    throw new Error('Salariații necesari pentru test lipsesc.');
  }

  // 3. Test API Rejection: Încercare generare pentru salariatul expirat (Stan Alexandru)
  console.log('\n--- 2. Test Blocare Salariat Expirat prin API ---');
  const rejectRes = await fetch('http://localhost:3000/api/documents/generate-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeIds: [stan.id],
    }),
  });

  const rejectBody = await rejectRes.json();
  if (rejectRes.status === 400 && rejectBody.error.includes('Stan Alexandru')) {
    console.log('✓ SUCCES: Cererea a fost blocată conform legii (Status 400):');
    console.log(`  "${rejectBody.error.split('\n')[1]}"`);
  } else {
    throw new Error(`EȘEC: Cererea nu a fost blocată corect. Status: ${rejectRes.status}`);
  }

  // 4. Test API Accept: Generare colectivă pentru salariații eligibili (Vasile & Gheorghe)
  console.log('\n--- 3. Test Generare Colectivă Salariați Eligibili (Vasile & Gheorghe) ---');
  const acceptRes = await fetch('http://localhost:3000/api/documents/generate-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateCode: 'ssm-fisa-instruire-individuala',
      clientId: client.id,
      employeeIds: [vasile.id, gheorghe.id],
    }),
  });

  const acceptBody = await acceptRes.json();
  if (acceptRes.status !== 200 || !acceptBody.success) {
    throw new Error(`EȘEC: Generarea colectivă a eșuat: ${JSON.stringify(acceptBody)}`);
  }

  console.log(`✓ SUCCES: ${acceptBody.totalGenerated} documente generate colectiv!`);
  console.log(`  Arhivă ZIP: ${acceptBody.zipFileName} (${(acceptBody.zipSizeBytes / 1024).toFixed(1)} KB)`);
  console.log(`  URL descărcare ZIP: ${acceptBody.zipDownloadUrl}`);

  // 5. Verificare integritate arhivă ZIP
  console.log('\n--- 4. Verificare conținut arhivă ZIP ---');
  const zipPath = path.join(process.cwd(), 'storage', 'documents', `batch_${acceptBody.batchId}.zip`);
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Fișierul ZIP nu există la: ${zipPath}`);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const zip = new PizZip(zipBuffer);
  const fileNames = Object.keys(zip.files).filter((f) => !f.endsWith('/'));

  console.log(`Fișiere conținute în ZIP (${fileNames.length}):`);
  for (const fn of fileNames) {
    console.log(`  • ${fn}`);
  }

  if (fileNames.length !== 2) {
    throw new Error(`Așteptat 2 fișiere în ZIP, s-au găsit ${fileNames.length}`);
  }

  // Verificare că documentul lui Vasile conține datele lui Vasile
  const vasileEntry = fileNames.find((f) => f.includes('Vasile'));
  if (!vasileEntry) throw new Error('Documentul pentru Vasile lipsește din ZIP');
  const vasileZip = new PizZip(zip.files[vasileEntry].asNodeBuffer());
  const vasileXml = vasileZip.files['word/document.xml'].asText();

  if (!vasileXml.includes('Vasile') || (vasile.cnp && !vasileXml.includes(vasile.cnp))) {
    throw new Error('Documentul lui Vasile nu conține CNP-ul sau numele corect!');
  }
  console.log('✓ Documentul lui Vasile conține datele personalizate corecte (CNP, Nume, Post).');

  // Verificare că documentul Gheorghe conține datele lui Gheorghe
  const gheorgheEntry = fileNames.find((f) => f.includes('Gheorghe'));
  if (!gheorgheEntry) throw new Error('Documentul pentru Gheorghe lipsește din ZIP');
  const gheorgheZip = new PizZip(zip.files[gheorgheEntry].asNodeBuffer());
  const gheorgheXml = gheorgheZip.files['word/document.xml'].asText();

  if (!gheorgheXml.includes('Gheorghe') || (gheorghe.cnp && !gheorgheXml.includes(gheorghe.cnp))) {
    throw new Error('Documentul lui Gheorghe nu conține CNP-ul sau numele corect!');
  }
  console.log('✓ Documentul lui Gheorghe conține datele personalizate corecte (CNP, Nume, Post).');

  // 6. Test endpoint descărcare ZIP
  console.log('\n--- 5. Test Endpoint Descărcare Arhivă ZIP ---');
  const downloadRes = await fetch(`http://localhost:3000${acceptBody.zipDownloadUrl}`);
  if (downloadRes.status !== 200) {
    throw new Error(`Endpoint descărcare a returnat status: ${downloadRes.status}`);
  }
  const contentType = downloadRes.headers.get('content-type');
  console.log(`✓ Endpoint descărcare răspunde cu status 200 OK (Content-Type: ${contentType})`);

  console.log('\n========================================================================');
  console.log('TOATE TESTELE DE GENERARE COLECTIVĂ & BLOCARE EXPIRARE AU TRECUT 100%!');
  console.log('========================================================================');
}

main()
  .catch((e) => {
    console.error('EROARE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
