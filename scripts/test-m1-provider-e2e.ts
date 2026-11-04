import { prisma } from '../src/lib/prisma';
import assert from 'assert';

async function main() {
  console.log('--- Verificare E2E Milestone 1: SsmProvider & SsmSpecialist ---');

  // 1. Verificare existență provider și specialiști seeduiți
  const provider = await prisma.ssmProvider.findFirst({
    where: { cui: 'RO34567890' },
    include: { specialists: true, clients: true },
  });

  assert(provider !== null, 'Prestatorul implicit EXPERT SSM există');
  assert.strictEqual(provider.name, 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.');
  assert.strictEqual(provider.specialists.length, 2, 'Există 2 specialiști asociați');
  assert(provider.clients.length >= 2, 'Clienții NEXUS și BISTRO sunt asociați relațional');
  console.log('✓ 1. Provider și specialiști seeduiți validați relațional');

  // 2. Verificare clienți cu dual-persistence
  const nexus = await prisma.client.findUnique({
    where: { cui: 'RO38765432' },
    include: { provider: true, specialist: true },
  });
  assert(nexus !== null, 'Clientul NEXUS există');
  assert.strictEqual(nexus.providerId, provider.id, 'NEXUS providerId corespunde');
  assert(nexus.specialistId !== null, 'NEXUS specialistId este setat');
  assert.strictEqual(nexus.ssmProviderName, provider.name, 'NEXUS ssmProviderName este sincronizat');
  assert.strictEqual(nexus.ssmSpecialistName, nexus.specialist?.name, 'NEXUS ssmSpecialistName este sincronizat');
  console.log('✓ 2. Dual-persistence pe Client NEXUS validată');

  // 3. Verificare client nou creat cu providerId și specialistId
  const spec = provider.specialists[0];
  const testClient = await prisma.client.create({
    data: {
      name: 'TEST M1 VERIFICATION S.R.L.',
      cui: 'RO99112233',
      address: 'București, Sector 1, Calea Victoriei 100',
      providerId: provider.id,
      specialistId: spec.id,
      ssmProviderName: provider.name,
      ssmSpecialistName: spec.name,
      ssmSpecialistCert: spec.certificateNumber,
    },
    include: { provider: true, specialist: true },
  });

  assert.strictEqual(testClient.providerId, provider.id);
  assert.strictEqual(testClient.specialistId, spec.id);
  assert.strictEqual(testClient.provider?.name, provider.name);
  assert.strictEqual(testClient.specialist?.name, spec.name);
  console.log('✓ 3. Creare client cu atribuire SEPP funcțională');

  // 4. Ștergere client de test
  await prisma.client.delete({ where: { id: testClient.id } });
  console.log('✓ 4. Curățare client test efectuată');

  console.log('\n🎉 TOATE VERIFICĂRILE E2E MILESTONE 1 AU TRECUT CU SUCCES!');
}

main()
  .catch((err) => {
    console.error('❌ Eșec la verificarea E2E Milestone 1:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
