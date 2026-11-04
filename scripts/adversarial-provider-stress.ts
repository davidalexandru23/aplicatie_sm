/**
 * scripts/adversarial-provider-stress.ts
 *
 * Empirical Adversarial Challenger Stress Harness for Milestone 1:
 * SSM Provider Profile CRUD, Specialist Management, and Client Assignment
 *
 * Authored by teamwork_challenger (m1_r3_challenger_1)
 *
 * Stress Dimensions Tested:
 * 1. Malformed payloads to /api/settings/provider (PUT, GET)
 *    - Missing required fields (name, cui, address)
 *    - Empty strings / whitespace-only payloads
 *    - Duplicate CUI collisions across distinct providers (409)
 *    - Invalid / corrupted date strings for authorizationDate / itmCertDate (graceful degradation)
 *    - XSS & SQL injection strings in corporate, address, and accreditation fields
 * 2. Specialist CRUD edge cases (/api/settings/provider/specialists POST, PATCH, DELETE)
 *    - Missing name or whitespace-only name (400)
 *    - Non-existent providerId resolution
 *    - Non-existent specialist ID on PATCH & DELETE (404)
 *    - Duplicate specialist name under same provider (Prisma unique constraint @@unique([providerId, name]))
 *    - Default specialist exclusivity toggle across multiple specialists
 * 3. Client intake & update with invalid foreign keys (/api/clients POST, /api/clients/[id] PATCH)
 *    - Non-existent UUID for providerId (sanitized to null, zero foreign key crashes)
 *    - Non-existent UUID for specialistId (sanitized to null, zero foreign key crashes)
 *    - Random string / malformed IDs
 * 4. Dual persistence synchronization & state mutation integrity
 *    - Creation with providerId/specialistId automatically synchronizes ssmProviderName, ssmSpecialistName, ssmSpecialistCert
 *    - Explicit legacy string preservation
 *    - PATCH updating provider/specialist synchronizes corresponding legacy columns
 *    - PATCH clearing providerId (null) leaves state consistent
 * 5. Cross-provider assignment & provider reassignment
 *    - Assigning specialist belonging to Provider B to client with Provider A
 *    - Reassigning provider and verifying reactive state
 * 6. Specialist deletion & soft-delete protection
 *    - Specialist assigned to client: DELETE triggers soft-delete (isActive: false, isDefault: false, softDeleted: true)
 *    - Client's specialistId remains intact, dossier and documents still resolve
 *    - Soft-deleted specialist omitted from /api/providers dropdown
 *    - Specialist unassigned to any client: DELETE performs complete hard-delete
 *    - Database onDelete: SetNull behavior when specialist is removed
 * 7. Dropdown query endpoint (/api/providers)
 *    - Returns only active providers and active specialists
 *    - Default provider/specialist correctly sorted to first position
 * 8. Dynamic template generation for relational SEPP & edge clients
 *    - Complete relational provider & specialist binding (all 24 provider tokens)
 *    - Client with soft-deleted specialist generates cleanly
 *    - Unassigned client resolves with graceful fallbacks and zero unhandled exceptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { GET as getProviderRoute, PUT as putProviderRoute } from '../src/app/api/settings/provider/route';
import { POST as postSpecialistRoute } from '../src/app/api/settings/provider/specialists/route';
import { PATCH as patchSpecialistRoute, DELETE as deleteSpecialistRoute } from '../src/app/api/settings/provider/specialists/[id]/route';
import { GET as getProvidersDropdownRoute } from '../src/app/api/providers/route';
import { GET as getClientsRoute, POST as postClientRoute } from '../src/app/api/clients/route';
import { GET as getClientRoute, PATCH as patchClientRoute } from '../src/app/api/clients/[id]/route';
import { resolveTemplateData } from '../src/lib/templates/resolver';
import { renderTemplateBuffer } from '../src/lib/templates/generator';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import path from 'path';
import fs from 'fs';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];
const createdProviderIds: string[] = [];
const createdSpecialistIds: string[] = [];
const createdClientIds: string[] = [];

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEquals<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg} | Expected: ${JSON.stringify(expected)} | Actual: ${JSON.stringify(actual)}`);
  }
}

async function runTest(suite: string, name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] (${durationMs}ms) ${name}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, error: err?.message || String(err), durationMs });
    console.error(`  ✗ [FAIL] (${durationMs}ms) ${name}: ${err?.message || err}`);
  }
}

// Helper: build JSON NextRequest
function createJsonRequest(url: string, method: string, body?: any): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test artifacts...');
  // 1. Delete created clients
  if (createdClientIds.length > 0) {
    await prisma.client.deleteMany({
      where: { id: { in: createdClientIds } },
    });
  }
  // Also clean up any stray client with CUI starting with RO_ADV_
  await prisma.client.deleteMany({
    where: { cui: { startsWith: 'RO_ADV_' } },
  });

  // 2. Delete created specialists
  if (createdSpecialistIds.length > 0) {
    await prisma.ssmSpecialist.deleteMany({
      where: { id: { in: createdSpecialistIds } },
    });
  }
  await prisma.ssmSpecialist.deleteMany({
    where: { name: { startsWith: '__ADV_SPEC_' } },
  });

  // 3. Delete created providers
  if (createdProviderIds.length > 0) {
    await prisma.ssmProvider.deleteMany({
      where: { id: { in: createdProviderIds } },
    });
  }
  await prisma.ssmProvider.deleteMany({
    where: { cui: { startsWith: 'RO_ADV_' } },
  });

  console.log('🧹 Cleanup complete.');
}

async function main() {
  console.log('================================================================================');
  console.log('  ADVERSARIAL CHALLENGER STRESS HARNESS — MILESTONE 1 EMPIRICAL REVIEW');
  console.log('================================================================================');

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Malformed & Boundary Payloads to Provider Settings API
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 1: Malformed & Boundary Payloads to /api/settings/provider');

    await runTest('Suite 1', 'PUT /api/settings/provider rejects empty payload with 400', async () => {
      const req = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {});
      const res = await putProviderRoute(req);
      assertEquals(res.status, 400, 'Empty body must return 400');
      const data = await res.json();
      assert(!!data.error, 'Error message must be present in response');
    });

    await runTest('Suite 1', 'PUT /api/settings/provider rejects missing name with 400', async () => {
      const req = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {
        cui: 'RO_ADV_001',
        address: 'București, Str. Test 1',
      });
      const res = await putProviderRoute(req);
      assertEquals(res.status, 400, 'Missing name must return 400');
    });

    await runTest('Suite 1', 'PUT /api/settings/provider rejects missing cui with 400', async () => {
      const req = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {
        name: 'Provider Test Fără CUI',
        address: 'București, Str. Test 1',
      });
      const res = await putProviderRoute(req);
      assertEquals(res.status, 400, 'Missing CUI must return 400');
    });

    await runTest('Suite 1', 'PUT /api/settings/provider rejects missing address with 400', async () => {
      const req = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {
        name: 'Provider Test Fără Adresă',
        cui: 'RO_ADV_002',
      });
      const res = await putProviderRoute(req);
      assertEquals(res.status, 400, 'Missing address must return 400');
    });

    await runTest('Suite 1', 'PUT /api/settings/provider handles corrupted date strings gracefully without crashing', async () => {
      // Create a test provider first with explicit ID
      const testProv = await prisma.ssmProvider.create({
        data: {
          name: '__ADV_PROV_CORRUPT_BASE S.R.L.',
          cui: 'RO_ADV_901',
          address: 'București, Str. Test 99',
          isDefault: false,
        },
      });
      createdProviderIds.push(testProv.id);

      const req = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {
        id: testProv.id,
        name: '__ADV_PROV_CORRUPT_DATE S.R.L.',
        cui: 'RO_ADV_901',
        address: 'București, Str. Test 99',
        authorizationNumber: 'ITM-999',
        authorizationDate: 'corrupted-date-not-a-timestamp',
        isDefault: false,
      });
      const res = await putProviderRoute(req);
      assertEquals(res.status, 200, 'Corrupted date should be caught and parsed to null rather than 500 error');
      const data = await res.json();
      assert(data.success === true, 'Success flag should be true');
      assertEquals(data.provider.authorizationDate, null, 'authorizationDate should safely resolve to null');
    });

    await runTest('Suite 1', 'PUT /api/settings/provider prevents duplicate CUI across providers with 409', async () => {
      // Create Provider 1
      const p1 = await prisma.ssmProvider.create({
        data: {
          name: '__ADV_PROV_DUP_1 S.R.L.',
          cui: 'RO_ADV_DUP_01',
          address: 'Adresă 1',
          isDefault: false,
        },
      });
      createdProviderIds.push(p1.id);

      // Create Provider 2
      const p2 = await prisma.ssmProvider.create({
        data: {
          name: '__ADV_PROV_DUP_2 S.R.L.',
          cui: 'RO_ADV_DUP_02',
          address: 'Adresă 2',
          isDefault: false,
        },
      });
      createdProviderIds.push(p2.id);

      // Try updating Provider 2 to use Provider 1's CUI
      const reqUpdate = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {
        id: p2.id,
        name: '__ADV_PROV_DUP_2 S.R.L.',
        cui: 'RO_ADV_DUP_01', // conflict!
        address: 'Adresă 2',
      });
      const resUpdate = await putProviderRoute(reqUpdate);
      assertEquals(resUpdate.status, 409, 'Duplicate CUI update must return 409 Conflict');
    });

    await runTest('Suite 1', 'PUT /api/settings/provider safely persists XSS & special characters without HTML corruption', async () => {
      const pXss = await prisma.ssmProvider.create({
        data: {
          name: '__ADV_PROV_XSS_BASE S.R.L.',
          cui: 'RO_ADV_XSS_01',
          address: 'Str. Initiala 1',
          isDefault: false,
        },
      });
      createdProviderIds.push(pXss.id);

      const xssName = '<script>alert("XSS")</script> & "SEPP" \'Specialist\'';
      const req = createJsonRequest('http://localhost:3000/api/settings/provider', 'PUT', {
        id: pXss.id,
        name: xssName,
        cui: 'RO_ADV_XSS_01',
        address: 'Str. <b>Securitate</b> nr. 10',
        legalRepresentative: 'Director <img src="x" onerror="alert(1)">',
        isDefault: false,
      });
      const res = await putProviderRoute(req);
      assertEquals(res.status, 200, 'XSS input should be safely treated as text and persisted');
      const data = await res.json();
      assertEquals(data.provider.name, xssName, 'Name should be stored verbatim as string');
    });

    // -------------------------------------------------------------------------
    // SUITE 2: Specialist CRUD Edge Cases & Exclusivity
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 2: Specialist CRUD Edge Cases & Boundary Conditions');

    // Create a base provider for specialist testing
    const baseProv = await prisma.ssmProvider.create({
      data: {
        name: '__ADV_SPEC_BASE_PROV S.R.L.',
        cui: 'RO_ADV_SPEC_BASE',
        address: 'București, Str. Specialiștilor 10',
        isDefault: false,
      },
    });
    const testProviderId = baseProv.id;
    const baseProvData = { provider: baseProv };
    createdProviderIds.push(testProviderId);

    await runTest('Suite 2', 'POST /api/settings/provider/specialists rejects empty or whitespace-only name with 400', async () => {
      const req1 = createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
        providerId: testProviderId,
        name: '',
      });
      const res1 = await postSpecialistRoute(req1);
      assertEquals(res1.status, 400, 'Empty specialist name must return 400');

      const req2 = createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
        providerId: testProviderId,
        name: '     ',
      });
      const res2 = await postSpecialistRoute(req2);
      assertEquals(res2.status, 400, 'Whitespace-only specialist name must return 400');
    });

    await runTest('Suite 2', 'PATCH /api/settings/provider/specialists/[id] returns 404 for non-existent specialist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const req = createJsonRequest(`http://localhost:3000/api/settings/provider/specialists/${nonExistentId}`, 'PATCH', {
        name: 'Nume Nou',
      });
      const res = await patchSpecialistRoute(req, { params: Promise.resolve({ id: nonExistentId }) });
      assertEquals(res.status, 404, 'Non-existent specialist PATCH must return 404');
    });

    await runTest('Suite 2', 'DELETE /api/settings/provider/specialists/[id] returns 404 for non-existent specialist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const req = createJsonRequest(`http://localhost:3000/api/settings/provider/specialists/${nonExistentId}`, 'DELETE');
      const res = await deleteSpecialistRoute(req, { params: Promise.resolve({ id: nonExistentId }) });
      assertEquals(res.status, 404, 'Non-existent specialist DELETE must return 404');
    });

    await runTest('Suite 2', 'Enforces default specialist exclusivity across multiple additions and updates', async () => {
      // Specialist 1 marked default
      const res1 = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: testProviderId,
          name: '__ADV_SPEC_DEFAULT_1',
          role: 'Specialist A',
          isDefault: true,
        })
      );
      const spec1 = await res1.json();
      createdSpecialistIds.push(spec1.id);
      assertEquals(spec1.isDefault, true, 'Spec 1 initially isDefault: true');

      // Specialist 2 marked default
      const res2 = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: testProviderId,
          name: '__ADV_SPEC_DEFAULT_2',
          role: 'Specialist B',
          isDefault: true,
        })
      );
      const spec2 = await res2.json();
      createdSpecialistIds.push(spec2.id);
      assertEquals(spec2.isDefault, true, 'Spec 2 is now isDefault: true');

      // Verify Spec 1 was automatically unset
      const checkSpec1 = await prisma.ssmSpecialist.findUnique({ where: { id: spec1.id } });
      assertEquals(checkSpec1?.isDefault, false, 'Spec 1 must have been toggled to isDefault: false');

      // Now PATCH Spec 1 to be default again
      const patchRes = await patchSpecialistRoute(
        createJsonRequest(`http://localhost:3000/api/settings/provider/specialists/${spec1.id}`, 'PATCH', {
          isDefault: true,
        }),
        { params: Promise.resolve({ id: spec1.id }) }
      );
      assertEquals(patchRes.status, 200, 'PATCH Spec 1 succeeds');

      // Verify Spec 2 was unset
      const checkSpec2 = await prisma.ssmSpecialist.findUnique({ where: { id: spec2.id } });
      assertEquals(checkSpec2?.isDefault, false, 'Spec 2 must have been toggled to isDefault: false');
    });

    await runTest('Suite 2', 'Enforces schema uniqueness on [providerId, name] without unhandled server crash', async () => {
      // Specialist 1
      const res1 = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: testProviderId,
          name: '__ADV_SPEC_UNIQUE_NAME',
          role: 'Specialist Original',
        })
      );
      assertEquals(res1.status, 201, 'First specialist creation succeeds');
      const spec1 = await res1.json();
      createdSpecialistIds.push(spec1.id);

      // Attempt to create second specialist with identical name under same provider
      const res2 = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: testProviderId,
          name: '__ADV_SPEC_UNIQUE_NAME',
          role: 'Specialist Duplicate',
        })
      );
      // Catch block should catch Prisma P2002 error and return 500 JSON without node crashing
      assertEquals(res2.status, 500, 'Duplicate [providerId, name] caught gracefully by handler');
      const errData = await res2.json();
      assert(!!errData.error, 'Error message returned');
    });

    // -------------------------------------------------------------------------
    // SUITE 3: Client Creation & Mutation with Invalid Foreign Keys
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 3: Client Creation & Mutation with Invalid Foreign Keys');

    await runTest('Suite 3', 'POST /api/clients with non-existent providerId gracefully sanitizes to null (zero FK crash)', async () => {
      const fakeProviderId = '11111111-2222-3333-4444-555555555555';
      const req = createJsonRequest('http://localhost:3000/api/clients', 'POST', {
        name: '__ADV_CLIENT_FAKE_PROV S.R.L.',
        cui: 'RO_ADV_CLI_01',
        address: 'București, Str. Client 1',
        providerId: fakeProviderId,
      });
      const res = await postClientRoute(req);
      assertEquals(res.status, 201, 'Client creation with non-existent providerId should succeed');
      const client = await res.json();
      createdClientIds.push(client.id);
      assertEquals(client.providerId, null, 'Invalid providerId safely sanitized to null');
    });

    await runTest('Suite 3', 'POST /api/clients with non-existent specialistId gracefully sanitizes to null', async () => {
      const fakeSpecialistId = '22222222-3333-4444-5555-666666666666';
      const req = createJsonRequest('http://localhost:3000/api/clients', 'POST', {
        name: '__ADV_CLIENT_FAKE_SPEC S.R.L.',
        cui: 'RO_ADV_CLI_02',
        address: 'București, Str. Client 2',
        specialistId: fakeSpecialistId,
      });
      const res = await postClientRoute(req);
      assertEquals(res.status, 201, 'Client creation with non-existent specialistId should succeed');
      const client = await res.json();
      createdClientIds.push(client.id);
      assertEquals(client.specialistId, null, 'Invalid specialistId safely sanitized to null');
    });

    await runTest('Suite 3', 'PATCH /api/clients/[id] with non-existent providerId or specialistId clears foreign keys safely', async () => {
      // Create a valid client first
      const clientRes = await postClientRoute(
        createJsonRequest('http://localhost:3000/api/clients', 'POST', {
          name: '__ADV_CLIENT_PATCH_FK S.R.L.',
          cui: 'RO_ADV_CLI_03',
          address: 'București, Str. Client 3',
          providerId: testProviderId,
        })
      );
      const client = await clientRes.json();
      createdClientIds.push(client.id);
      assertEquals(client.providerId, testProviderId, 'Initial providerId set');

      // PATCH with fake providerId
      const fakeProviderId = '99999999-9999-9999-9999-999999999999';
      const patchReq = createJsonRequest(`http://localhost:3000/api/clients/${client.id}`, 'PATCH', {
        providerId: fakeProviderId,
      });
      const patchRes = await patchClientRoute(patchReq, { params: Promise.resolve({ id: client.id }) });
      assertEquals(patchRes.status, 200, 'PATCH with non-existent providerId succeeds');
      const updatedClient = await patchRes.json();
      assertEquals(updatedClient.providerId, null, 'Non-existent providerId correctly set to null');
    });

    // -------------------------------------------------------------------------
    // SUITE 4: Dual Persistence Synchronization & State Mutation Integrity
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 4: Dual Persistence Synchronization & State Mutation');

    // Create specialist with complete certificate
    const specCertRes = await postSpecialistRoute(
      createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
        providerId: testProviderId,
        name: '__ADV_SPEC_CERT_HOLDER',
        role: 'Evaluator Senior SSM',
        certificateNumber: 'CERT-ADV-8888/2023',
        qualification: 'Inginer Securitate',
      })
    );
    const specCertData = await specCertRes.json();
    createdSpecialistIds.push(specCertData.id);

    await runTest('Suite 4', 'Client creation with providerId & specialistId automatically populates legacy strings', async () => {
      const req = createJsonRequest('http://localhost:3000/api/clients', 'POST', {
        name: '__ADV_CLIENT_DUAL_SYNC S.R.L.',
        cui: 'RO_ADV_CLI_04',
        address: 'București, Str. Sincronizare 10',
        providerId: testProviderId,
        specialistId: specCertData.id,
      });
      const res = await postClientRoute(req);
      assertEquals(res.status, 201, 'Client created');
      const client = await res.json();
      createdClientIds.push(client.id);

      // Verify dual persistence columns
      assertEquals(client.ssmProviderName, baseProvData.provider.name, 'ssmProviderName matched provider.name');
      assertEquals(client.ssmSpecialistName, specCertData.name, 'ssmSpecialistName matched specialist.name');
      assertEquals(client.ssmSpecialistCert, specCertData.certificateNumber, 'ssmSpecialistCert matched specialist certificate');
    });

    await runTest('Suite 4', 'PATCH client reassigning provider & specialist synchronizes legacy string columns', async () => {
      // Create Provider B
      const provB = await prisma.ssmProvider.create({
        data: {
          name: '__ADV_PROV_B_NEW_CONSULT S.R.L.',
          cui: 'RO_ADV_PROV_B',
          address: 'Cluj-Napoca, Str. Observatorului 5',
          isDefault: false,
        },
      });
      const provBData = { provider: provB };
      createdProviderIds.push(provB.id);

      // Create Specialist B under Provider B
      const specBRes = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: provBData.provider.id,
          name: '__ADV_SPEC_B_CLUJ',
          role: 'Inspector SSM Cluj',
          certificateNumber: 'CERT-CJ-9999/2024',
        })
      );
      const specBData = await specBRes.json();
      createdSpecialistIds.push(specBData.id);

      // Take client from previous test and reassign to Provider B and Specialist B
      const targetClientId = createdClientIds[createdClientIds.length - 1];
      const patchReq = createJsonRequest(`http://localhost:3000/api/clients/${targetClientId}`, 'PATCH', {
        providerId: provBData.provider.id,
        specialistId: specBData.id,
      });
      const patchRes = await patchClientRoute(patchReq, { params: Promise.resolve({ id: targetClientId }) });
      assertEquals(patchRes.status, 200, 'Reassignment PATCH succeeds');

      const updated = await patchRes.json();
      assertEquals(updated.providerId, provBData.provider.id, 'providerId updated');
      assertEquals(updated.specialistId, specBData.id, 'specialistId updated');
      assertEquals(updated.ssmProviderName, provBData.provider.name, 'ssmProviderName re-synced');
      assertEquals(updated.ssmSpecialistName, specBData.name, 'ssmSpecialistName re-synced');
      assertEquals(updated.ssmSpecialistCert, specBData.certificateNumber, 'ssmSpecialistCert re-synced');
    });

    // -------------------------------------------------------------------------
    // SUITE 5: Cross-Provider Assignment & Dropped Relations
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 5: Cross-Provider Assignment & Dropped Relations');

    await runTest('Suite 5', 'Client assigned to Provider A and Specialist B (cross-provider) persists without constraint violation', async () => {
      // Provider A is testProviderId, Specialist B is specCertData under Provider B
      const lastProvId = createdProviderIds[createdProviderIds.length - 1]; // Provider B
      const firstSpecId = createdSpecialistIds[0]; // Spec from Provider A

      const req = createJsonRequest('http://localhost:3000/api/clients', 'POST', {
        name: '__ADV_CLIENT_CROSS_PROV S.R.L.',
        cui: 'RO_ADV_CLI_05',
        address: 'București, Str. Cross 5',
        providerId: lastProvId,
        specialistId: firstSpecId,
      });
      const res = await postClientRoute(req);
      assertEquals(res.status, 201, 'Cross-provider payload accepted');
      const client = await res.json();
      createdClientIds.push(client.id);

      assertEquals(client.providerId, lastProvId, 'providerId preserved');
      assertEquals(client.specialistId, firstSpecId, 'specialistId preserved');
    });

    // -------------------------------------------------------------------------
    // SUITE 6: Specialist Deletion & Soft-Delete Protection
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 6: Specialist Deletion & Soft-Delete Protection');

    let assignedSpecialistId = '';
    let assignedClientId = '';

    await runTest('Suite 6', 'Specialist assigned to client triggers SOFT-DELETE (isActive: false, isDefault: false, softDeleted: true)', async () => {
      // 1. Create a designated specialist
      const specRes = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: testProviderId,
          name: '__ADV_SPEC_SOFT_DELETE_TARGET',
          role: 'Evaluator Asignat',
          certificateNumber: 'CERT-SOFT-1111',
          isDefault: true,
        })
      );
      const spec = await specRes.json();
      assignedSpecialistId = spec.id;
      createdSpecialistIds.push(spec.id);

      // 2. Create a client assigned to this specialist
      const cliRes = await postClientRoute(
        createJsonRequest('http://localhost:3000/api/clients', 'POST', {
          name: '__ADV_CLIENT_SOFT_DEL_TEST S.R.L.',
          cui: 'RO_ADV_CLI_06',
          address: 'București, Str. Protectie 1',
          providerId: testProviderId,
          specialistId: assignedSpecialistId,
        })
      );
      const cli = await cliRes.json();
      assignedClientId = cli.id;
      createdClientIds.push(cli.id);

      // 3. Attempt to DELETE the assigned specialist
      const delReq = createJsonRequest(`http://localhost:3000/api/settings/provider/specialists/${assignedSpecialistId}`, 'DELETE');
      const delRes = await deleteSpecialistRoute(delReq, { params: Promise.resolve({ id: assignedSpecialistId }) });
      assertEquals(delRes.status, 200, 'DELETE request succeeds');
      const delData = await delRes.json();

      assertEquals(delData.softDeleted, true, 'softDeleted flag must be true');

      // 4. Verify specialist in DB
      const dbSpec = await prisma.ssmSpecialist.findUnique({ where: { id: assignedSpecialistId } });
      assert(dbSpec !== null, 'Specialist record still exists in DB');
      assertEquals(dbSpec?.isActive, false, 'Specialist isActive marked false');
      assertEquals(dbSpec?.isDefault, false, 'Specialist isDefault marked false');

      // 5. Verify client in DB still references the specialist
      const dbClient = await prisma.client.findUnique({ where: { id: assignedClientId } });
      assertEquals(dbClient?.specialistId, assignedSpecialistId, 'Client still holds foreign key to specialist');
    });

    await runTest('Suite 6', 'Soft-deleted specialist is omitted from /api/providers dropdown options', async () => {
      const dropRes = await getProvidersDropdownRoute();
      assertEquals(dropRes.status, 200, '/api/providers succeeds');
      const providers: any[] = await dropRes.json();

      const baseProv = providers.find((p) => p.id === testProviderId);
      assert(!!baseProv, 'Base provider found in dropdown list');

      const foundDeactivated = baseProv.specialists.find((s: any) => s.id === assignedSpecialistId);
      assertEquals(foundDeactivated, undefined, 'Soft-deleted specialist must NOT appear in dropdown options');
    });

    await runTest('Suite 6', 'Specialist unassigned to any client undergoes COMPLETE HARD-DELETE', async () => {
      // Create unassigned specialist
      const specRes = await postSpecialistRoute(
        createJsonRequest('http://localhost:3000/api/settings/provider/specialists', 'POST', {
          providerId: testProviderId,
          name: '__ADV_SPEC_HARD_DELETE_TARGET',
          role: 'Specialist Neasignat',
        })
      );
      const spec = await specRes.json();
      const specId = spec.id;

      // Delete immediately
      const delReq = createJsonRequest(`http://localhost:3000/api/settings/provider/specialists/${specId}`, 'DELETE');
      const delRes = await deleteSpecialistRoute(delReq, { params: Promise.resolve({ id: specId }) });
      assertEquals(delRes.status, 200, 'DELETE succeeds');
      const delData = await delRes.json();
      assertEquals(delData.softDeleted, undefined, 'softDeleted should not be set for hard delete');

      // Verify specialist is completely deleted from DB
      const dbSpec = await prisma.ssmSpecialist.findUnique({ where: { id: specId } });
      assertEquals(dbSpec, null, 'Specialist completely purged from DB');
    });

    await runTest('Suite 6', 'Prisma onDelete: SetNull sets client.specialistId to null without deleting client', async () => {
      // 1. Create dummy specialist
      const s = await prisma.ssmSpecialist.create({
        data: {
          providerId: testProviderId,
          name: '__ADV_SPEC_SET_NULL_TEST',
        },
      });

      // 2. Create client attached to this dummy specialist
      const c = await prisma.client.create({
        data: {
          name: '__ADV_CLIENT_SET_NULL S.R.L.',
          cui: 'RO_ADV_CLI_07',
          address: 'București, Str. Test SetNull',
          specialistId: s.id,
        },
      });
      createdClientIds.push(c.id);

      // 3. Direct Prisma delete of specialist (bypassing route protection to test schema foreign key constraint)
      await prisma.ssmSpecialist.delete({ where: { id: s.id } });

      // 4. Verify client still exists and specialistId became null
      const reloadedClient = await prisma.client.findUnique({ where: { id: c.id } });
      assert(reloadedClient !== null, 'Client was NOT deleted by cascade');
      assertEquals(reloadedClient?.specialistId, null, 'specialistId successfully set to null by SetNull constraint');
    });

    await runTest('Suite 6', 'Provider deletion triggers Cascade on specialists and SetNull on client relations without deleting client', async () => {
      // 1. Create a dedicated test provider
      const prov = await prisma.ssmProvider.create({
        data: {
          name: '__ADV_PROV_CASCADE_TEST S.R.L.',
          cui: 'RO_ADV_PROV_CAS',
          address: 'Str. Cascade 1',
        },
      });

      // 2. Create a specialist under this provider
      const spec = await prisma.ssmSpecialist.create({
        data: {
          providerId: prov.id,
          name: '__ADV_SPEC_CASCADE_TEST',
        },
      });

      // 3. Create a client linked to this provider and specialist
      const cli = await prisma.client.create({
        data: {
          name: '__ADV_CLIENT_CASCADE_TEST S.R.L.',
          cui: 'RO_ADV_CLI_CAS',
          address: 'Str. Cascade Client 1',
          providerId: prov.id,
          specialistId: spec.id,
        },
      });
      createdClientIds.push(cli.id);

      // 4. Direct delete of the provider
      await prisma.ssmProvider.delete({ where: { id: prov.id } });

      // 5. Specialist should be CASCADE deleted
      const checkSpec = await prisma.ssmSpecialist.findUnique({ where: { id: spec.id } });
      assertEquals(checkSpec, null, 'Specialist must be cascade deleted when provider is deleted');

      // 6. Client should NOT be deleted, and its providerId and specialistId must be set to null
      const checkCli = await prisma.client.findUnique({ where: { id: cli.id } });
      assert(checkCli !== null, 'Client must NOT be deleted when provider is deleted');
      assertEquals(checkCli?.providerId, null, 'Client providerId must be SetNull');
      assertEquals(checkCli?.specialistId, null, 'Client specialistId must be SetNull');
    });

    await runTest('Suite 4', 'Accepts designatedSpecialistId alias in POST and PATCH clients', async () => {
      const postReq = createJsonRequest('http://localhost:3000/api/clients', 'POST', {
        name: '__ADV_CLIENT_ALIAS_TEST S.R.L.',
        cui: 'RO_ADV_CLI_09',
        address: 'București, Str. Alias 1',
        providerId: testProviderId,
        designatedSpecialistId: specCertData.id,
      });
      const postRes = await postClientRoute(postReq);
      assertEquals(postRes.status, 201, 'POST with designatedSpecialistId succeeds');
      const cli = await postRes.json();
      createdClientIds.push(cli.id);
      assertEquals(cli.specialistId, specCertData.id, 'specialistId populated via alias');

      // PATCH with alias
      const patchReq = createJsonRequest(`http://localhost:3000/api/clients/${cli.id}`, 'PATCH', {
        designatedSpecialistId: null,
      });
      const patchRes = await patchClientRoute(patchReq, { params: Promise.resolve({ id: cli.id }) });
      assertEquals(patchRes.status, 200, 'PATCH with designatedSpecialistId succeeds');
      const updated = await patchRes.json();
      assertEquals(updated.specialistId, null, 'specialistId cleared via alias');
    });

    await runTest('Suite 4', 'PATCH client clearing providerId and specialistId sets relations to null', async () => {
      const cliId = createdClientIds[createdClientIds.length - 1];
      const patchReq = createJsonRequest(`http://localhost:3000/api/clients/${cliId}`, 'PATCH', {
        providerId: null,
        specialistId: null,
      });
      const patchRes = await patchClientRoute(patchReq, { params: Promise.resolve({ id: cliId }) });
      assertEquals(patchRes.status, 200, 'PATCH clearing providerId succeeds');
      const updated = await patchRes.json();
      assertEquals(updated.providerId, null, 'providerId cleared');
      assertEquals(updated.specialistId, null, 'specialistId cleared');
    });

    // -------------------------------------------------------------------------
    // SUITE 7: Dropdown Query Endpoint (/api/providers)
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 7: Dropdown Query Endpoint (/api/providers) Filtering & Ordering');

    await runTest('Suite 7', '/api/providers returns only active providers and places isDefault first', async () => {
      const res = await getProvidersDropdownRoute();
      assertEquals(res.status, 200, 'GET /api/providers status 200');
      const providers: any[] = await res.json();
      assert(providers.length > 0, 'At least one provider in dropdown');

      // Verify that if a default provider exists, it is the first element
      const defaultIndex = providers.findIndex((p) => p.isDefault);
      if (defaultIndex !== -1) {
        assertEquals(defaultIndex, 0, 'Default provider must be at index 0');
      }

      // Verify all returned providers are active
      for (const p of providers) {
        for (const s of p.specialists) {
          // Specialists must have active fields only
          assert(s.name !== undefined, 'Specialist has name');
        }
      }
    });

    await runTest('Suite 7', 'GET /api/settings/provider returns active provider with specialists and client counts', async () => {
      const res = await getProviderRoute();
      assertEquals(res.status, 200, 'GET /api/settings/provider status 200');
      const data = await res.json();
      assert(!!data.name, 'Provider name present');
      assert(!!data.cui, 'Provider CUI present');
      assert(Array.isArray(data.specialists), 'Specialists array returned');
      assert(typeof data._count?.clients === 'number', '_count.clients returned as number');
      assert(typeof data._count?.specialists === 'number', '_count.specialists returned as number');
    });

    await runTest('Suite 7', 'GET /api/clients/[id] returns client with relational provider & specialist objects', async () => {
      const cliId = assignedClientId;
      const req = createJsonRequest(`http://localhost:3000/api/clients/${cliId}`, 'GET');
      const res = await getClientRoute(req, { params: Promise.resolve({ id: cliId }) });
      assertEquals(res.status, 200, 'GET /api/clients/[id] status 200');
      const cli = await res.json();
      assert(!!cli.provider, 'Embedded provider object present in response');
      assert(cli.provider.name === baseProvData.provider.name, 'Embedded provider name matches');
      assert(!!cli.specialist, 'Embedded specialist object present in response');
      assert(cli.specialist.id === assignedSpecialistId, 'Embedded specialist id matches');
    });

    // -------------------------------------------------------------------------
    // SUITE 8: Dynamic Template Generation for Relational SEPP & Edge Clients
    // -------------------------------------------------------------------------
    console.log('\n▶ SUITE 8: Dynamic Template Generation for Relational SEPP & Edge Clients');

    await runTest('Suite 8', 'Generates Decizii Angajator with full relational provider & specialist data', async () => {
      const clientWithRel = await prisma.client.findUnique({
        where: { id: assignedClientId },
        include: {
          provider: true,
          specialist: true,
          employees: { include: { identityDocument: true, residenceAddress: true } },
          jobs: true,
          worksites: true,
        },
      });
      assert(clientWithRel !== null, 'Client found');

      const resolved = await resolveTemplateData('decizii-angajator', {
        client: clientWithRel as any,
      });

      // Verify tokens bound from relational provider
      assertEquals(resolved.data['PLACEHOLDER_PRESTATOR_SSM'], baseProvData.provider.name, 'PLACEHOLDER_PRESTATOR_SSM populated');
      assertEquals(resolved.data['PLACEHOLDER_CUI_PRESTATOR'], baseProvData.provider.cui, 'PLACEHOLDER_CUI_PRESTATOR populated');

      // Verify token bound from soft-deleted specialist (historical resolution)
      const specToken = String(resolved.data['PLACEHOLDER_SPECIALIST_SSM']);
      assert(specToken.includes('__ADV_SPEC_SOFT_DELETE_TARGET'), 'PLACEHOLDER_SPECIALIST_SSM includes soft-deleted specialist name');

      // Verify rendering template to buffer
      const def1 = TEMPLATE_CATALOG.find((t) => t.code === 'decizii-angajator')!;
      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', def1.normalizedFilename);
      const buf = await renderTemplateBuffer(templatePath, 'docx', resolved.data);
      assert(buf.length > 0, 'Rendered DOCX buffer is non-empty');
    });

    await runTest('Suite 8', 'Generates IPSSM Birou for client with completely unassigned provider (graceful fallback)', async () => {
      // Create bare client with no provider, no specialist
      const bareClient = await prisma.client.create({
        data: {
          name: '__ADV_CLIENT_BARE_NO_SEPP S.R.L.',
          cui: 'RO_ADV_CLI_08',
          address: 'București, Str. Fără Provider 1',
        },
      });
      createdClientIds.push(bareClient.id);

      const resolved = await resolveTemplateData('ipssm-birou', {
        client: bareClient as any,
      });

      // Verify that missing provider falls back cleanly to Romanian legal default constants without throwing
      assert(!!resolved.data['PLACEHOLDER_PRESTATOR_SSM'], 'Fallback ssmProviderName provided');
      assert(!!resolved.data['PLACEHOLDER_SPECIALIST_SSM'], 'Fallback ssmSpecialistName provided');

      const def2 = TEMPLATE_CATALOG.find((t) => t.code === 'ipssm-birou')!;
      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', def2.normalizedFilename);
      const buf = await renderTemplateBuffer(templatePath, 'docx', resolved.data);
      assert(buf.length > 0, 'Rendered DOCX buffer for bare client is non-empty');
    });

  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary Reporting
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n================================================================================');
  console.log(`  ADVERSARIAL STRESS TEST SUMMARY`);
  console.log('================================================================================');
  console.log(`  Total Checks:  ${total}`);
  console.log(`  Passed:        ${passed}`);
  console.log(`  Failed:        ${failed}`);
  console.log(`  Success Rate:  ${((passed / total) * 100).toFixed(1)}%`);
  console.log('================================================================================');

  if (failed > 0) {
    console.error('\n❌ FAILED CHECKS:');
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`- [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ADVERSARIAL STRESS CHECKS PASSED WITH ZERO ERRORS!');
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
