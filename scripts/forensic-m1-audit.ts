import assert from 'assert';
import { prisma } from '../src/lib/prisma';
import { resolveTemplateData } from '../src/lib/templates/resolver';
import { GET as getProviders } from '../src/app/api/providers/route';
import { GET as getSettingsProvider, PUT as putSettingsProvider } from '../src/app/api/settings/provider/route';
import { POST as postSpecialist } from '../src/app/api/settings/provider/specialists/route';
import { PATCH as patchSpecialist, DELETE as deleteSpecialist } from '../src/app/api/settings/provider/specialists/[id]/route';
import { POST as postClient } from '../src/app/api/clients/route';
import { PATCH as patchClient } from '../src/app/api/clients/[id]/route';
import { NextRequest } from 'next/server';

async function runForensicAudit() {
  console.log('================================================================');
  console.log('FORENSIC INTEGRITY AUDIT — MILESTONE 1 RUNTIME TRACING');
  console.log('================================================================');

  let checksPassed = 0;
  function verify(condition: boolean, desc: string) {
    if (!condition) {
      console.error(`❌ INTEGRITY FAILURE: ${desc}`);
      throw new Error(`Integrity assertion failed: ${desc}`);
    }
    console.log(`✓ [VERIFIED] ${desc}`);
    checksPassed++;
  }

  // -------------------------------------------------------------------------
  // 1. Database Schema & Tables Validation
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Database Relational Existence & Foreign Key Verification ---');

  const rawProviderCount = await prisma.ssmProvider.count();
  verify(rawProviderCount > 0, `SsmProvider table exists in DB and contains ${rawProviderCount} records`);

  const rawSpecialistCount = await prisma.ssmSpecialist.count();
  verify(rawSpecialistCount > 0, `SsmSpecialist table exists in DB and contains ${rawSpecialistCount} records`);

  const rawClientCount = await prisma.client.count();
  verify(rawClientCount > 0, `Client table exists in DB and contains ${rawClientCount} records`);

  // Verify default provider data
  const defaultProvider = await prisma.ssmProvider.findFirst({
    where: { isDefault: true },
    include: { specialists: true, clients: true },
  });
  verify(defaultProvider !== null, 'Default SsmProvider is found');
  if (!defaultProvider) throw new Error('Default provider not found');
  verify(defaultProvider.name === 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.', 'Default provider name matches legal seed');
  verify(defaultProvider.cui === 'RO34567890', 'Default provider CUI matches legal seed');
  verify(defaultProvider.authorizationNumber === '4812/2021', 'Default provider ITM cert matches legal seed');
  verify(defaultProvider.specialists.length >= 2, `Default provider has ${defaultProvider.specialists.length} specialists`);

  // -------------------------------------------------------------------------
  // 2. Dynamic Relational Updates & Template Resolver Reflection (Tamper Test)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Dynamic Tamper Test: Verify Template Resolver Reads Genuine DB State ---');

  // Create a unique temporary provider and specialist
  const timestamp = Date.now();
  const testCui = `RO${String(timestamp).slice(-8)}`;
  const testProviderName = `FORENSIC AUDIT PRESTATOR ${timestamp} S.R.L.`;
  const testStreet = `Strada Forensica nr. ${timestamp % 100}`;
  const testAuthNum = `AUDIT-${timestamp}/2026`;
  const testSpecialistName = `Ing. Auditor Test ${timestamp}`;
  const testSpecialistCert = `CERT-AUDIT-${timestamp}`;

  const tempProvider = await prisma.ssmProvider.create({
    data: {
      name: testProviderName,
      cui: testCui,
      regCom: `J40/${timestamp % 9999}/2026`,
      address: `București, ${testStreet}`,
      street: testStreet,
      number: '1',
      authorizationNumber: testAuthNum,
      authorizationDate: new Date('2026-01-01'),
      phone: '0700.000.000',
      email: 'forensic@audit.test',
      specialists: {
        create: {
          name: testSpecialistName,
          role: 'Inspector Auditor SSM',
          certificateNumber: testSpecialistCert,
          phone: '0700.111.222',
          email: 'auditor.specialist@test.ro',
        },
      },
    },
    include: { specialists: true },
  });

  verify(tempProvider.id !== undefined, 'Created temporary SsmProvider in PostgreSQL');
  const tempSpecialist = tempProvider.specialists[0];
  verify(tempSpecialist.id !== undefined, 'Created temporary SsmSpecialist in PostgreSQL');

  // Create a temporary client assigned to this new provider & specialist
  const testClientCui = `RO${String(timestamp + 1).slice(-8)}`;
  const tempClient = await prisma.client.create({
    data: {
      name: `CLIENT AUDIT TEST ${timestamp} S.R.L.`,
      cui: testClientCui,
      address: 'Strada Client nr. 1, Cluj-Napoca',
      caenCode: '6201',
      providerId: tempProvider.id,
      specialistId: tempSpecialist.id,
      ssmProviderName: tempProvider.name,
      ssmSpecialistName: tempSpecialist.name,
      ssmSpecialistCert: tempSpecialist.certificateNumber,
    },
    include: { provider: true, specialist: true },
  });

  verify(tempClient.providerId === tempProvider.id, 'Client successfully linked to tempProvider via foreign key');
  verify(tempClient.specialistId === tempSpecialist.id, 'Client successfully linked to tempSpecialist via foreign key');

  // Now resolve template data with this client
  const resolved1 = await resolveTemplateData('decizii-angajator', { client: tempClient });
  verify(
    resolved1.data.PLACEHOLDER_PRESTATOR_SSM === testProviderName,
    'Template resolver dynamically reflected temporary provider name from DB'
  );
  verify(
    resolved1.data.PLACEHOLDER_CUI_PRESTATOR === testCui,
    'Template resolver dynamically reflected temporary CUI from DB'
  );
  verify(
    resolved1.data.PLACEHOLDER_STRADA_FURNIZOR === testStreet,
    'Template resolver dynamically reflected temporary street from DB'
  );
  verify(
    resolved1.data.PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR === testAuthNum,
    'Template resolver dynamically reflected temporary ITM auth number from DB'
  );
  verify(
    resolved1.data.PLACEHOLDER_SPECIALIST_SSM.includes(testSpecialistName),
    'Template resolver dynamically reflected temporary specialist name from DB'
  );
  verify(
    resolved1.data.PLACEHOLDER_CERTIFICAT_EVALUATOR === testSpecialistCert,
    'Template resolver dynamically reflected temporary specialist certificate from DB'
  );

  // TAMPER STEP: Mutate the provider in DB to confirm live DB dependency (not cached or hardcoded)
  const mutatedName = `MUTATED PRESTATOR ${timestamp} S.R.L.`;
  const mutatedStreet = `Strada Mutata nr. 99`;
  await prisma.ssmProvider.update({
    where: { id: tempProvider.id },
    data: {
      name: mutatedName,
      street: mutatedStreet,
    },
  });

  // Re-resolve passing only the client with IDs (forcing DB lookup if relations unpopulated or testing updated relation)
  const clientRefetched = await prisma.client.findUniqueOrThrow({
    where: { id: tempClient.id },
    include: { provider: true, specialist: true },
  });
  const resolved2 = await resolveTemplateData('decizii-angajator', { client: clientRefetched });
  verify(
    resolved2.data.PLACEHOLDER_PRESTATOR_SSM === mutatedName,
    'Template resolver dynamically reflected mutated provider name from PostgreSQL'
  );
  verify(
    resolved2.data.PLACEHOLDER_STRADA_FURNIZOR === mutatedStreet,
    'Template resolver dynamically reflected mutated street from PostgreSQL'
  );

  // -------------------------------------------------------------------------
  // 3. API Route Execution & Database Mutex Tracing
  // -------------------------------------------------------------------------
  console.log('\n--- 3. API Handlers Runtime Execution Tracing ---');

  // Test GET /api/providers
  const getProvidersRes = await getProviders();
  verify(getProvidersRes.status === 200, 'GET /api/providers returns HTTP 200');
  const providersData = await getProvidersRes.json();
  verify(Array.isArray(providersData), 'GET /api/providers returns array');
  const foundTempInApi = providersData.some((p: any) => p.id === tempProvider.id);
  verify(foundTempInApi, 'GET /api/providers contains newly created DB provider');

  // Test POST /api/settings/provider/specialists
  const newSpecName = `API Specialist Test ${timestamp}`;
  const postSpecReq = new NextRequest('http://localhost:3000/api/settings/provider/specialists', {
    method: 'POST',
    body: JSON.stringify({
      providerId: tempProvider.id,
      name: newSpecName,
      role: 'Inspector Sanatate si Securitate',
      certificateNumber: `ITM-SPEC-${timestamp}`,
      isDefault: false,
    }),
  });
  const postSpecRes = await postSpecialist(postSpecReq);
  verify(postSpecRes.status === 201, 'POST /api/settings/provider/specialists returns HTTP 201');
  const createdSpecData = await postSpecRes.json();
  verify(createdSpecData.name === newSpecName, 'Specialist created with requested name');
  verify(createdSpecData.providerId === tempProvider.id, 'Specialist linked to target providerId');

  // Test PATCH /api/settings/provider/specialists/[id]
  const updatedSpecName = `Updated Spec Name ${timestamp}`;
  const patchSpecReq = new NextRequest(`http://localhost:3000/api/settings/provider/specialists/${createdSpecData.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: updatedSpecName,
    }),
  });
  const patchSpecRes = await patchSpecialist(patchSpecReq, {
    params: Promise.resolve({ id: createdSpecData.id }),
  });
  verify(patchSpecRes.status === 200, 'PATCH /api/settings/provider/specialists/[id] returns HTTP 200');
  const patchedSpecData = await patchSpecRes.json();
  verify(patchedSpecData.specialist.name === updatedSpecName, 'Specialist name successfully updated in DB');

  // Test DELETE unassigned specialist (hard delete)
  const delUnassignedReq = new NextRequest(`http://localhost:3000/api/settings/provider/specialists/${createdSpecData.id}`, {
    method: 'DELETE',
  });
  const delUnassignedRes = await deleteSpecialist(delUnassignedReq, {
    params: Promise.resolve({ id: createdSpecData.id }),
  });
  verify(delUnassignedRes.status === 200, 'DELETE unassigned specialist returns HTTP 200');
  const unassignedCheck = await prisma.ssmSpecialist.findUnique({ where: { id: createdSpecData.id } });
  verify(unassignedCheck === null, 'Unassigned specialist was hard-deleted from DB');

  // Test DELETE assigned specialist (soft delete protection)
  const delAssignedReq = new NextRequest(`http://localhost:3000/api/settings/provider/specialists/${tempSpecialist.id}`, {
    method: 'DELETE',
  });
  const delAssignedRes = await deleteSpecialist(delAssignedReq, {
    params: Promise.resolve({ id: tempSpecialist.id }),
  });
  verify(delAssignedRes.status === 200, 'DELETE assigned specialist returns HTTP 200');
  const assignedDelData = await delAssignedRes.json();
  verify(assignedDelData.softDeleted === true, 'Assigned specialist was soft-deleted to protect client relational history');
  const assignedCheck = await prisma.ssmSpecialist.findUnique({ where: { id: tempSpecialist.id } });
  verify(assignedCheck !== null && assignedCheck.isActive === false, 'Assigned specialist remains in DB with isActive = false');

  // Test POST /api/clients dual persistence
  const clientApiPostName = `API CREATED CLIENT ${timestamp} S.R.L.`;
  const postClientReq = new NextRequest('http://localhost:3000/api/clients', {
    method: 'POST',
    body: JSON.stringify({
      name: clientApiPostName,
      cui: `RO${String(timestamp + 2).slice(-8)}`,
      caenCode: '5610',
      address: 'Str. Test 10, Iasi',
      providerId: tempProvider.id,
      specialistId: tempSpecialist.id,
    }),
  });
  const postClientRes = await postClient(postClientReq);
  verify(postClientRes.status === 201, 'POST /api/clients returns HTTP 201');
  const createdClient = await postClientRes.json();
  verify(createdClient.providerId === tempProvider.id, 'Client providerId persisted');
  verify(createdClient.specialistId === tempSpecialist.id, 'Client specialistId persisted');
  verify(createdClient.ssmProviderName === mutatedName, 'Client ssmProviderName automatically synchronized');
  verify(createdClient.ssmSpecialistName === tempSpecialist.name, 'Client ssmSpecialistName automatically synchronized');

  // Test PATCH /api/clients/[id] dual persistence update
  const patchClientReq = new NextRequest(`http://localhost:3000/api/clients/${createdClient.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      providerId: defaultProvider.id,
      specialistId: defaultProvider.specialists[0].id,
    }),
  });
  const patchClientRes = await patchClient(patchClientReq, {
    params: Promise.resolve({ id: createdClient.id }),
  });
  verify(patchClientRes.status === 200, 'PATCH /api/clients/[id] returns HTTP 200');
  const patchedClient = await patchClientRes.json();
  verify(patchedClient.providerId === defaultProvider.id, 'Client providerId updated to default provider');
  verify(patchedClient.specialistId === defaultProvider.specialists[0].id, 'Client specialistId updated to default specialist');
  verify(patchedClient.ssmProviderName === defaultProvider.name, 'Client ssmProviderName resynchronized');
  verify(patchedClient.ssmSpecialistName === defaultProvider.specialists[0].name, 'Client ssmSpecialistName resynchronized');

  // -------------------------------------------------------------------------
  // 4. Cleanup Temporary Audit Artifacts
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Cleanup of Temporary Audit Records ---');
  await prisma.client.deleteMany({
    where: { id: { in: [tempClient.id, createdClient.id] } },
  });
  await prisma.ssmSpecialist.deleteMany({
    where: { id: tempSpecialist.id },
  });
  await prisma.ssmProvider.delete({
    where: { id: tempProvider.id },
  });
  console.log('✓ All temporary audit database records cleaned up successfully.');

  console.log('\n================================================================');
  console.log(`TOTAL FORENSIC INTEGRITY CHECKS PASSED: ${checksPassed}`);
  console.log('VERDICT: CLEAN — ZERO INTEGRITY VIOLATIONS DETECTED');
  console.log('================================================================');
}

runForensicAudit()
  .catch((err) => {
    console.error('FORENSIC AUDIT FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
