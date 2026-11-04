import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getProvider, PUT as putProvider } from '../src/app/api/settings/provider/route';
import { POST as postSpecialist } from '../src/app/api/settings/provider/specialists/route';
import {
  PATCH as patchSpecialist,
  DELETE as deleteSpecialist,
} from '../src/app/api/settings/provider/specialists/[id]/route';
import { GET as getProviders } from '../src/app/api/providers/route';
import { POST as postClient } from '../src/app/api/clients/route';
import { PATCH as patchClient } from '../src/app/api/clients/[id]/route';
import assert from 'assert';

async function runApiAudit() {
  console.log('================================================================');
  console.log('REVIEWER 1 REST API ADVERSARIAL AUDIT');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ [API-PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ✗ [API-FAIL] ${name}:`, e.message);
      failed++;
    }
  }

  // 1. GET /api/settings/provider
  await check('GET /api/settings/provider returns active provider with specialists', async () => {
    const res = await getProvider();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(data.id, 'Provider ID present');
    assert.strictEqual(data.isDefault, true);
    assert(Array.isArray(data.specialists), 'Specialists array returned');
    assert(data.specialists.length >= 2, 'Specialists count >= 2');
  });

  // 2. PUT /api/settings/provider validation
  await check('PUT /api/settings/provider rejects missing required fields (400)', async () => {
    const req = new NextRequest('http://localhost/api/settings/provider', {
      method: 'PUT',
      body: JSON.stringify({ name: '' }),
    });
    const res = await putProvider(req);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert(data.error.includes('obligatorii'));
  });

  // 3. POST /api/settings/provider/specialists validation
  await check('POST /api/settings/provider/specialists rejects missing name (400)', async () => {
    const req = new NextRequest('http://localhost/api/settings/provider/specialists', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });
    const res = await postSpecialist(req);
    assert.strictEqual(res.status, 400);
  });

  // 4. Specialist creation and default exclusivity
  let tempSpecId = '';
  await check('POST specialist with isDefault: true resets other defaults', async () => {
    const req = new NextRequest('http://localhost/api/settings/provider/specialists', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Ing. Test Auditor Default Exclusivity',
        role: 'Specialist Audit',
        certificateNumber: 'AUDIT-1234',
        isDefault: true,
      }),
    });
    const res = await postSpecialist(req);
    assert.strictEqual(res.status, 201);
    const created = await res.json();
    tempSpecId = created.id;
    assert.strictEqual(created.isDefault, true);

    // Verify other specialists for this provider now have isDefault: false
    const provider = await prisma.ssmProvider.findFirst({
      where: { isDefault: true },
      include: { specialists: true },
    });
    const defaultSpecs = provider?.specialists.filter((s) => s.isDefault);
    assert.strictEqual(defaultSpecs?.length, 1);
    assert.strictEqual(defaultSpecs?.[0].id, tempSpecId);
  });

  // 5. Restore default to Popescu via PATCH
  await check('PATCH specialist restores original default and resets test specialist', async () => {
    const popescu = await prisma.ssmSpecialist.findFirst({
      where: { name: 'Ing. Mihai Popescu' },
    });
    assert(popescu !== null);

    const req = new NextRequest(`http://localhost/api/settings/provider/specialists/${popescu.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDefault: true }),
    });
    const res = await patchSpecialist(req, { params: Promise.resolve({ id: popescu.id }) });
    assert.strictEqual(res.status, 200);

    const testSpec = await prisma.ssmSpecialist.findUnique({ where: { id: tempSpecId } });
    assert.strictEqual(testSpec?.isDefault, false);
  });

  // 6. Hard-delete unassigned specialist via DELETE
  await check('DELETE unassigned specialist performs clean hard-delete (200)', async () => {
    const req = new NextRequest(`http://localhost/api/settings/provider/specialists/${tempSpecId}`, {
      method: 'DELETE',
    });
    const res = await deleteSpecialist(req, { params: Promise.resolve({ id: tempSpecId }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.softDeleted, undefined);

    const deleted = await prisma.ssmSpecialist.findUnique({ where: { id: tempSpecId } });
    assert.strictEqual(deleted, null);
  });

  // 7. Soft-delete assigned specialist via DELETE
  await check('DELETE assigned specialist performs soft-delete to protect client dossier', async () => {
    // Find Popescu who is assigned to Nexus
    const popescu = await prisma.ssmSpecialist.findFirst({
      where: { name: 'Ing. Mihai Popescu' },
    });
    assert(popescu !== null);

    const req = new NextRequest(`http://localhost/api/settings/provider/specialists/${popescu.id}`, {
      method: 'DELETE',
    });
    const res = await deleteSpecialist(req, { params: Promise.resolve({ id: popescu.id }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.softDeleted, true);

    // Verify specialist still exists in DB but isActive: false
    const checkPopescu = await prisma.ssmSpecialist.findUnique({ where: { id: popescu.id } });
    assert.strictEqual(checkPopescu?.isActive, false);

    // Reactivate Popescu immediately for system health
    await prisma.ssmSpecialist.update({
      where: { id: popescu.id },
      data: { isActive: true, isDefault: true },
    });
  });

  // 8. GET /api/providers
  await check('GET /api/providers returns active providers and active specialists only', async () => {
    const res = await getProviders();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data));
    assert(data.length >= 1);
    const first = data[0];
    assert.strictEqual(first.cui, 'RO34567890');
    assert(Array.isArray(first.specialists));
    assert(first.specialists.every((s: any) => s.isActive !== false));
  });

  // 9. POST /api/clients duplicate check
  await check('POST /api/clients rejects duplicate CUI (409)', async () => {
    const req = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'DUPLICATE NEXUS',
        cui: 'RO38765432', // Nexus CUI
        address: 'Strada Test',
      }),
    });
    const res = await postClient(req);
    assert.strictEqual(res.status, 409);
  });

  // 10. PATCH /api/clients/[id] unlinking provider
  await check('PATCH /api/clients/[id] allows unlinking provider with providerId: null', async () => {
    // Create temporary client
    const tempCui = 'RO77112233';
    const provider = await prisma.ssmProvider.findFirst({ where: { isDefault: true } });
    assert(provider !== null);

    const createReq = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'UNLINK TEST SRL',
        cui: tempCui,
        address: 'Bucuresti, Sector 1',
        providerId: provider.id,
      }),
    });
    const createRes = await postClient(createReq);
    assert.strictEqual(createRes.status, 201);
    const createdClient = await createRes.json();
    assert.strictEqual(createdClient.providerId, provider.id);
    assert.strictEqual(createdClient.ssmProviderName, provider.name);

    // Unlink provider
    const patchReq = new NextRequest(`http://localhost/api/clients/${createdClient.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ providerId: null }),
    });
    const patchRes = await patchClient(patchReq, { params: Promise.resolve({ id: createdClient.id }) });
    assert.strictEqual(patchRes.status, 200);
    const patchedClient = await patchRes.json();
    assert.strictEqual(patchedClient.providerId, null);

    // Cleanup
    await prisma.client.delete({ where: { id: createdClient.id } });
  });

  console.log('\n================================================================');
  console.log(`TOTAL API AUDIT CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    throw new Error(`${failed} API audit checks failed!`);
  }
}

runApiAudit()
  .then(() => {
    console.log('✅ ALL REST API AUDIT CHECKS PASSED WITH ZERO ERRORS.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ REST API AUDIT FAILED:', e);
    process.exit(1);
  });
