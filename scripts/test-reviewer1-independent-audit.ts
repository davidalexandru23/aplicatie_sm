import { prisma } from '../src/lib/prisma';
import { resolveTemplateData } from '../src/lib/templates/resolver';
import assert from 'assert';

async function runIndependentAudit() {
  console.log('================================================================');
  console.log('REVIEWER 1 INDEPENDENT ADVERSARIAL AUDIT');
  console.log('================================================================');

  let checksPassed = 0;
  let checksFailed = 0;

  function testCheck(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✓ [AUDIT-PASS] ${name}`);
      checksPassed++;
    } catch (e: any) {
      console.error(`  ✗ [AUDIT-FAIL] ${name}:`, e.message);
      checksFailed++;
    }
  }

  async function testCheckAsync(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ [AUDIT-PASS] ${name}`);
      checksPassed++;
    } catch (e: any) {
      console.error(`  ✗ [AUDIT-FAIL] ${name}:`, e.message);
      checksFailed++;
    }
  }

  // 1. Check default provider in database
  const defaultProvider = await prisma.ssmProvider.findFirst({
    where: { isDefault: true },
    include: { specialists: true },
  });

  testCheck('Default provider exists with valid CUI and ITM certification', () => {
    assert(defaultProvider !== null, 'Default provider not found');
    assert(defaultProvider.cui === 'RO34567890', 'CUI mismatch');
    assert(defaultProvider.authorizationNumber === '4812/2021', 'ITM authorization missing');
    assert(defaultProvider.specialists.length >= 2, 'Specialists count < 2');
  });

  // 2. Test specialist exclusivity of isDefault
  testCheck('Only one specialist is marked isDefault = true per provider', () => {
    assert(defaultProvider !== null);
    const defaults = defaultProvider.specialists.filter((s) => s.isDefault);
    assert.strictEqual(defaults.length, 1, `Expected exactly 1 default specialist, found ${defaults.length}`);
  });

  // 3. Test Provider CUI Uniqueness constraint in DB
  await testCheckAsync('Database enforces unique constraint on SsmProvider.cui', async () => {
    let duplicateRejected = false;
    try {
      await prisma.ssmProvider.create({
        data: {
          name: 'DUPLICATE CUI TEST',
          cui: 'RO34567890', // Same as defaultProvider
          address: 'Str. Test 1',
        },
      });
    } catch (err: any) {
      // Prisma P2002 error code for unique constraint violation
      duplicateRejected = true;
    }
    assert.strictEqual(duplicateRejected, true, 'Duplicate CUI was not rejected by database constraint');
  });

  // 4. Test Specialist (providerId, name) Uniqueness constraint
  await testCheckAsync('Database enforces unique constraint on SsmSpecialist (providerId, name)', async () => {
    assert(defaultProvider !== null);
    let duplicateRejected = false;
    try {
      await prisma.ssmSpecialist.create({
        data: {
          providerId: defaultProvider.id,
          name: 'Ing. Mihai Popescu', // Same name under same provider
        },
      });
    } catch (err: any) {
      duplicateRejected = true;
    }
    assert.strictEqual(duplicateRejected, true, 'Duplicate specialist name under same provider was not rejected');
  });

  // 5. Test client creation with ONLY legacy strings (Backwards compatibility)
  const legacyCui = 'RO99887766';
  let legacyClient = await prisma.client.create({
    data: {
      name: 'LEGACY STRING TEST CLIENT S.R.L.',
      cui: legacyCui,
      address: 'București, Str. Veche nr. 1',
      ssmProviderName: 'LEGACY PRESTATOR SRL',
      ssmSpecialistName: 'Ing. Vasile Ionescu',
      ssmSpecialistCert: 'Certificat EV 9999/2015',
    },
  });

  testCheck('Legacy client created with null providerId & specialistId', () => {
    assert.strictEqual(legacyClient.providerId, null);
    assert.strictEqual(legacyClient.specialistId, null);
    assert.strictEqual(legacyClient.ssmProviderName, 'LEGACY PRESTATOR SRL');
    assert.strictEqual(legacyClient.ssmSpecialistName, 'Ing. Vasile Ionescu');
  });

  // 6. Test resolver behavior on legacy-only client
  await testCheckAsync('Template resolver handles legacy-only client gracefully', async () => {
    const res = await resolveTemplateData('ipssm-birou', { client: legacyClient });
    assert.strictEqual(res.status, 'ready');
    assert.strictEqual(res.data.PLACEHOLDER_PRESTATOR_SSM, 'LEGACY PRESTATOR SRL');
    assert(res.data.PLACEHOLDER_SPECIALIST_SSM.includes('Ing. Vasile Ionescu'));
    assert(res.data.PLACEHOLDER_SPECIALIST_SSM.includes('Certificat EV 9999/2015'));
  });

  // 7. Test client creation with relational IDs (Modern flow)
  assert(defaultProvider !== null);
  const spec = defaultProvider.specialists[0];
  const modernCui = 'RO99887755';
  const modernClient = await prisma.client.create({
    data: {
      name: 'MODERN RELATIONAL CLIENT S.R.L.',
      cui: modernCui,
      address: 'București, Str. Noua nr. 10',
      providerId: defaultProvider.id,
      specialistId: spec.id,
    },
    include: { provider: true, specialist: true },
  });

  testCheck('Modern client has relational provider and specialist populated', () => {
    assert.strictEqual(modernClient.providerId, defaultProvider.id);
    assert.strictEqual(modernClient.specialistId, spec.id);
    assert.strictEqual(modernClient.provider?.name, defaultProvider.name);
    assert.strictEqual(modernClient.specialist?.name, spec.name);
  });

  // 8. Test resolver behavior on modern client
  await testCheckAsync('Template resolver resolves all provider tokens dynamically from relational provider', async () => {
    const res = await resolveTemplateData('ipssm-birou', { client: modernClient });
    assert.strictEqual(res.status, 'ready');
    assert.strictEqual(res.data.PLACEHOLDER_PRESTATOR_SSM, defaultProvider.name);
    assert.strictEqual(res.data.PLACEHOLDER_CUI_PRESTATOR, defaultProvider.cui);
    assert.strictEqual(res.data.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR, defaultProvider.authorizationNumber);
    assert(res.data.PLACEHOLDER_SPECIALIST_SSM.includes(spec.name));
  });

  // 9. Test completely empty client (zero provider, zero specialist, zero strings)
  const nakedCui = 'RO99887744';
  const nakedClient = await prisma.client.create({
    data: {
      name: 'NAKED CLIENT S.R.L.',
      cui: nakedCui,
      address: 'București, Str. Zero nr. 0',
    },
  });

  await testCheckAsync('Template resolver handles completely empty provider fields without exception', async () => {
    const res = await resolveTemplateData('ipssm-birou', { client: nakedClient });
    assert.strictEqual(res.status, 'ready');
    // Verifies fallback to ROMANIAN_LEGAL_SSM_PROVIDER
    assert(!!res.data.PLACEHOLDER_PRESTATOR_SSM, 'Fallback provider name populated');
    assert(!!res.data.PLACEHOLDER_SPECIALIST_SSM, 'Fallback specialist populated');
  });

  // 10. Test unlinking specialist / SetNull behavior
  await testCheckAsync('Unlinking specialist sets specialistId to null', async () => {
    const updated = await prisma.client.update({
      where: { id: modernClient.id },
      data: { specialistId: null },
    });
    assert.strictEqual(updated.specialistId, null);
  });

  // 11. Cleanup test clients
  await prisma.client.deleteMany({
    where: { cui: { in: [legacyCui, modernCui, nakedCui] } },
  });
  console.log('  ✓ [AUDIT-PASS] Cleaned up temporary test clients');
  checksPassed++;

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT CHECKS: ${checksPassed + checksFailed}`);
  console.log(`PASSED: ${checksPassed}`);
  console.log(`FAILED: ${checksFailed}`);
  console.log('================================================================');

  if (checksFailed > 0) {
    throw new Error(`${checksFailed} independent audit checks failed!`);
  }
}

runIndependentAudit()
  .then(() => {
    console.log('✅ INDEPENDENT ADVERSARIAL AUDIT PASSED!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ INDEPENDENT ADVERSARIAL AUDIT FAILED:', e);
    process.exit(1);
  });
