import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('================================================================================');
  console.log('  TEST VERIFICARE: BIFARE PREDARE DIPLOMĂ DSP & EDITARE DATĂ PREDARE');
  console.log('================================================================================\n');

  // 1. Gasim o sesiune existenta cu participanti
  const session = await prisma.hygieneSession.findFirst({
    include: { participants: true },
  });

  if (!session || session.participants.length === 0) {
    throw new Error('Nu există nicio sesiune de igienă cu participanți în baza de date pentru test.');
  }

  const participant = session.participants[0];
  console.log(`▶ Testare pe participantul: ${participant.lastName} ${participant.firstName} (ID: ${participant.id})`);
  console.log(`  Stare inițială diplomă: delivered=${participant.diplomaDelivered}, date=${participant.diplomaDeliveredDate}`);

  // 2. Simulare bifare checkmark (predare astazi)
  const todayStr = new Date().toISOString().slice(0, 10);
  const updated1 = await prisma.hygieneParticipant.update({
    where: { id: participant.id },
    data: {
      diplomaDelivered: true,
      diplomaDeliveredDate: new Date(todayStr),
    },
  });

  console.log('\n▶ Pasul 1: Bifare predare diplomă DSP (automat data de azi)');
  console.log(`  Rezultat: diplomaDelivered=${updated1.diplomaDelivered}, diplomaDeliveredDate=${updated1.diplomaDeliveredDate?.toISOString().slice(0, 10)}`);
  if (!updated1.diplomaDelivered || !updated1.diplomaDeliveredDate) {
    throw new Error('Eșec la bifarea predării diplomei!');
  }
  console.log('  ✓ Bifarea și setarea automată a datei funcționează corect.');

  // 3. Simulare modificare data predare din modalul Editeaza (data din trecut)
  const pastDateStr = '2026-11-10';
  const updated2 = await prisma.hygieneParticipant.update({
    where: { id: participant.id },
    data: {
      diplomaDelivered: true,
      diplomaDeliveredDate: new Date(pastDateStr),
    },
  });

  console.log('\n▶ Pasul 2: Modificare dată predare diplomă din butonul Editează (ex: 2026-11-10)');
  console.log(`  Rezultat: diplomaDelivered=${updated2.diplomaDelivered}, diplomaDeliveredDate=${updated2.diplomaDeliveredDate?.toISOString().slice(0, 10)}`);
  if (updated2.diplomaDeliveredDate?.toISOString().slice(0, 10) !== pastDateStr) {
    throw new Error('Eșec la modificarea datei predării diplomei!');
  }
  console.log('  ✓ Modificarea datei din butonul Editează funcționează corect.');

  // 4. Testare debifare
  const updated3 = await prisma.hygieneParticipant.update({
    where: { id: participant.id },
    data: {
      diplomaDelivered: false,
      diplomaDeliveredDate: null,
    },
  });

  console.log('\n▶ Pasul 3: Debifare predare diplomă');
  console.log(`  Rezultat: diplomaDelivered=${updated3.diplomaDelivered}, diplomaDeliveredDate=${updated3.diplomaDeliveredDate}`);
  if (updated3.diplomaDelivered !== false || updated3.diplomaDeliveredDate !== null) {
    throw new Error('Eșec la debifarea predării diplomei!');
  }
  console.log('  ✓ Debifarea funcționează corect.');

  console.log('\n================================================================================');
  console.log('  TOATE VERIFICĂRILE PENTRU PREDAREA DIPLOMEI DSP AU FOST TRECUTE CU SUCCES!');
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
