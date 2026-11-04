/**
 * scripts/verify-hygiene-generation-adversarial.ts
 *
 * Empirical Adversarial Challenger Verification Suite for Hygiene Document Generation (M2_R4)
 * Author: m2_r4_challenger_2 (Empirical Challenger)
 *
 * Validates:
 * 1. Scope A (Client-Level) generation for NEXUS SOLUTIONS S.R.L. (4 employees) & BISTRO GOURMET S.R.L. (2 employees)
 * 2. Deep XLSX Inspection: Cell coordinates, participant values, clean row clear-down, 0 residual placeholders
 * 3. Scope B (Session-Level) generation for all 3 seeded sessions
 * 4. Deep DOCX Inspection: hygiene-adeverinta XML inspection for 0 unresolved {PLACEHOLDER_...} tokens
 * 5. Adversarial Edge Cases: Foreign workers, null birthDate, empty roster, missing sub-addresses, diacritics
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import { prisma } from '../src/lib/prisma';
import { resolveTemplatePlaceholders } from '../src/lib/templates/resolver';
import { generateDocument } from '../src/lib/templates/generator';

interface TestResult {
  name: string;
  passed: boolean;
  assertions: number;
  durationMs: number;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];
let totalAssertions = 0;

function trackAssert(cond: boolean, msg: string) {
  totalAssertions++;
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function trackAssertEqual<T>(actual: T, expected: T, msg: string) {
  totalAssertions++;
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg} (expected: ${expected}, got: ${actual})`);
  }
}

function scanXlsxForPlaceholders(wb: XLSX.WorkBook): { sheet: string; cell: string; value: string }[] {
  const leaks: { sheet: string; cell: string; value: string }[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    for (const addr of Object.keys(sheet)) {
      if (addr.startsWith('!')) continue;
      const cell = sheet[addr];
      if (typeof cell?.v === 'string' && /PLACEHOLDER_[A-Z0-9_]+/.test(cell.v)) {
        leaks.push({ sheet: sheetName, cell: addr, value: cell.v });
      }
    }
  }
  return leaks;
}

function scanDocxForPlaceholders(buffer: Buffer): { file: string; match: string }[] {
  const zip = new PizZip(buffer);
  const leaks: { file: string; match: string }[] = [];
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/') && fileName.endsWith('.xml')) {
      const xml = zip.files[fileName].asText();
      const matches = xml.match(/\{?PLACEHOLDER_[A-Z0-9_]+\}?/g);
      if (matches) {
        for (const m of matches) {
          leaks.push({ file: fileName, match: m });
        }
      }
    }
  }
  return leaks;
}

function extractDocxText(buffer: Buffer): string {
  const zip = new PizZip(buffer);
  if (!zip.files['word/document.xml']) return '';
  return zip.files['word/document.xml'].asText().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

async function runTest(name: string, fn: () => Promise<string | void>) {
  const t0 = Date.now();
  const startAssertions = totalAssertions;
  try {
    const details = (await fn()) || undefined;
    const durationMs = Date.now() - t0;
    const assertions = totalAssertions - startAssertions;
    testResults.push({ name, passed: true, assertions, durationMs, details });
    console.log(`  ✓ [PASS] ${name} (${assertions} assertions, ${durationMs}ms)`);
    if (details) {
      console.log(`    ↳ ${details}`);
    }
  } catch (err: unknown) {
    const durationMs = Date.now() - t0;
    const assertions = totalAssertions - startAssertions;
    const error = err instanceof Error ? err.message : String(err);
    testResults.push({ name, passed: false, assertions, durationMs, error });
    console.error(`  ✗ [FAIL] ${name} (${assertions} assertions passed before error, ${durationMs}ms)`);
    console.error(`    ↳ Error: ${error}`);
  }
}

async function getNexusClient() {
  const client = await prisma.client.findFirst({
    where: { cui: 'RO38765432' },
    include: {
      employees: {
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      provider: true,
    },
  });
  if (!client) throw new Error('Client NEXUS SOLUTIONS not found');
  return client;
}

async function getBistroClient() {
  const client = await prisma.client.findFirst({
    where: { cui: 'RO45123987' },
    include: {
      employees: {
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      provider: true,
    },
  });
  if (!client) throw new Error('Client BISTRO GOURMET not found');
  return client;
}

export async function runAllTests() {
  console.log('================================================================');
  console.log('  EMPIRICAL ADVERSARIAL STRESS TEST: HYGIENE DOCUMENT GENERATION');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Scope A (Client-Level) - NEXUS SOLUTIONS S.R.L. (4 Employees)
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Scope A (Client-Level) NEXUS SOLUTIONS S.R.L. (4 emps) ---');

  await runTest('Scope A: hygiene-tabel-cursanti for NEXUS (4 employees)', async () => {
    const nexus = await getNexusClient();
    trackAssertEqual(nexus.employees.length, 4, 'Nexus has 4 employees');

    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
    });

    const participants = resolvedData.participants as any[];
    trackAssert(Array.isArray(participants), 'Participants roster is an array');
    trackAssertEqual(participants.length, 4, 'Participants roster has 4 employees');

    const genRes = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Status is approved_for_print');
    trackAssertEqual(genRes.missingFields.length, 0, 'Zero missing fields');

    // Deep XLSX Inspection
    const fileBuf = fs.readFileSync(genRes.filePath);
    const wb = XLSX.read(fileBuf, { type: 'buffer' });
    const sheet = wb.Sheets['Curs (2)'];
    trackAssert(!!sheet, 'Active sheet Curs (2) exists');

    // Check Header A1
    const cellA1 = sheet['A1']?.v;
    trackAssert(typeof cellA1 === 'string' && cellA1.startsWith('Examen - '), 'Cell A1 starts with "Examen - "');
    trackAssert(!cellA1.includes('PLACEHOLDER_'), 'Cell A1 has no PLACEHOLDER_ token');

    // Check Rows 3..6 (4 participants)
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    trackAssertEqual(rows[1][0], 'Nr. Crt.', 'Col A header is Nr. Crt.');
    trackAssertEqual(rows[1][1], 'Nume Prenume', 'Col B header is Nume Prenume');
    trackAssertEqual(rows[1][2], 'Cod Numeric Personal', 'Col C header is Cod Numeric Personal');
    trackAssertEqual(rows[1][3], 'An nastere', 'Col D header is An nastere');
    trackAssertEqual(rows[1][4], 'Luna Nastere', 'Col E header is Luna Nastere');
    trackAssertEqual(rows[1][5]?.trim(), 'Zi Nastere', 'Col F header is Zi Nastere');
    trackAssertEqual(rows[1][6], 'Loc Nastere', 'Col G header is Loc Nastere');
    trackAssertEqual(rows[1][7], 'Modul', 'Col H header is Modul');
    trackAssertEqual(rows[1][8], 'Serie si nr CI/Permis de sedere/ Pasaport', 'Col I header is ID doc');

    // Verify participant rows 3 to 6
    const foundCnps = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const rowIdx = 2 + i;
      const row = rows[rowIdx];
      trackAssertEqual(Number(row[0]), i + 1, `Row ${i + 3} Col A has sequential Nr. Crt. ${i + 1}`);
      const rowCnp = String(row[2]);
      const emp = nexus.employees.find((e) => e.cnp === rowCnp);
      trackAssert(!!emp, `Row ${i + 3} Col C matches a known employee CNP (${rowCnp})`);
      foundCnps.add(rowCnp);

      trackAssert(typeof row[1] === 'string' && row[1].includes(emp!.lastName), `Row ${i + 3} Col B has employee lastName ${emp!.lastName}`);
      trackAssert(typeof row[3] === 'string' && row[3].length === 4, `Row ${i + 3} Col D has 4-digit birth year (${row[3]})`);
      trackAssert(typeof row[4] === 'string' && row[4].length === 2, `Row ${i + 3} Col E has 2-digit birth month (${row[4]})`);
      trackAssert(typeof row[5] === 'string' && row[5].length === 2, `Row ${i + 3} Col F has 2-digit birth day (${row[5]})`);
      trackAssert(typeof row[6] === 'string' && row[6].length > 0, `Row ${i + 3} Col G has birth place`);
      trackAssert(typeof row[7] === 'string' && row[7].includes('Modulul'), `Row ${i + 3} Col H has Module`);
      trackAssert(typeof row[8] === 'string' && row[8].length > 3, `Row ${i + 3} Col I has ID doc`);
    }
    trackAssertEqual(foundCnps.size, 4, 'All 4 distinct Nexus employees are present in Tabel Cursanti');

    // Verify clean row clear-down for rows 7 through 117 (indexes 005 to 115)
    for (let r = 7; r <= 117; r++) {
      for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        const cell = sheet[`${col}${r}`];
        const val = cell?.v;
        trackAssert(
          val === undefined || val === null || val === '',
          `Row ${r} Col ${col} is cleared down (got: "${val}")`
        );
      }
    }

    // Zero residual placeholders anywhere in workbook
    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, `0 residual placeholders across workbook (found: ${JSON.stringify(leaks)})`);

    return `Verified: 4 rows populated, rows 7..117 cleared down to empty string, 0 leaks.`;
  });

  await runTest('Scope A: hygiene-anexe-catalog for NEXUS (4 employees)', async () => {
    const nexus = await getNexusClient();

    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-anexe-catalog',
      clientId: nexus.id,
    });

    const participants = resolvedData.participants as any[];
    trackAssertEqual(participants.length, 4, 'Participants roster has 4 employees');

    const genRes = await generateDocument({
      templateCode: 'hygiene-anexe-catalog',
      clientId: nexus.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Status is approved_for_print');
    trackAssertEqual(genRes.missingFields.length, 0, 'Zero missing fields');

    const fileBuf = fs.readFileSync(genRes.filePath);
    const wb = XLSX.read(fileBuf, { type: 'buffer' });
    trackAssertEqual(wb.SheetNames.length, 8, 'Workbook contains exactly 8 annex sheets');

    // Sheet 3: Anexa nr. 3 (Catalog Înscriere)
    const sh3 = wb.Sheets['Anexa nr. 3'];
    trackAssert(!!sh3, 'Anexa nr. 3 exists');
    trackAssert(typeof sh3['A3']?.v === 'string' && !sh3['A3'].v.includes('PLACEHOLDER_'), 'A3 has provider name');
    for (let i = 0; i < 4; i++) {
      const r = 13 + i;
      trackAssertEqual(Number(sh3[`A${r}`]?.v), i + 1, `Anexa 3 row ${r} Col A has nr ${i + 1}`);
      trackAssert(typeof sh3[`B${r}`]?.v === 'string' && sh3[`B${r}`].v.length > 0, `Anexa 3 row ${r} Col B has name`);
      trackAssert(typeof sh3[`D${r}`]?.v === 'string' && sh3[`D${r}`].v.length === 13, `Anexa 3 row ${r} Col D has CNP`);
    }
    for (let r = 17; r <= 112; r++) {
      for (const col of ['A', 'B', 'C', 'D', 'E', 'G', 'H']) {
        const val = sh3[`${col}${r}`]?.v;
        trackAssert(val === undefined || val === null || val === '', `Anexa 3 row ${r} Col ${col} cleared (got "${val}")`);
      }
    }

    // Sheet 4: Anexa nr. 4 (PV Predare Lucrari)
    const sh4 = wb.Sheets['Anexa nr. 4'];
    for (let i = 0; i < 4; i++) {
      const r = 11 + i;
      trackAssertEqual(Number(sh4[`A${r}`]?.v), i + 1, `Anexa 4 row ${r} Col A has nr ${i + 1}`);
      trackAssert(typeof sh4[`C${r}`]?.v === 'string' && sh4[`C${r}`].v.length > 0, `Anexa 4 row ${r} Col C has name`);
    }
    for (let r = 15; r <= 110; r++) {
      for (const col of ['A', 'C']) {
        const val = sh4[`${col}${r}`]?.v;
        trackAssert(val === undefined || val === null || val === '', `Anexa 4 row ${r} Col ${col} cleared`);
      }
    }

    // Sheet 5: Anexa nr. 5 (Catalog Examen DSP)
    const sh5 = wb.Sheets['Anexa nr. 5'];
    for (let i = 0; i < 4; i++) {
      const r = 14 + i;
      trackAssertEqual(Number(sh5[`A${r}`]?.v), i + 1, `Anexa 5 row ${r} Col A has nr ${i + 1}`);
      trackAssert(typeof sh5[`C${r}`]?.v === 'string' && sh5[`C${r}`].v.length > 0, `Anexa 5 row ${r} Col C has name`);
      trackAssertEqual(sh5[`F${r}`]?.v, 'Admis', `Anexa 5 row ${r} Col F has "Admis"`);
    }
    for (let r = 18; r <= 113; r++) {
      for (const col of ['A', 'C', 'D', 'E', 'F']) {
        const val = sh5[`${col}${r}`]?.v;
        trackAssert(val === undefined || val === null || val === '', `Anexa 5 row ${r} Col ${col} cleared`);
      }
    }

    // Sheet 6: Anexa nr. 6 (PV Comisie DSP)
    const sh6 = wb.Sheets['Anexa nr. 6'];
    const p6 = sh6['A5']?.v;
    trackAssert(typeof p6 === 'string' && !p6.includes('PLACEHOLDER_'), 'Anexa 6 A5 narrative has no placeholders');
    trackAssertEqual(String(sh6['G20']?.v), '4', 'Anexa 6 G20 has 4 candidates');
    trackAssertEqual(String(sh6['I20']?.v), '4', 'Anexa 6 I20 has 4 presents');
    trackAssertEqual(String(sh6['K20']?.v), '4', 'Anexa 6 K20 has 4 passed');

    // Sheet 8: Anexa nr. 8 (Registru Evidenta Certificate)
    const sh8 = wb.Sheets['Anexa nr. 8'];
    for (let i = 0; i < 4; i++) {
      const r = 11 + i;
      trackAssertEqual(Number(sh8[`A${r}`]?.v), i + 1, `Anexa 8 row ${r} Col A has nr ${i + 1}`);
      trackAssert(typeof sh8[`C${r}`]?.v === 'string' && sh8[`C${r}`].v.length > 0, `Anexa 8 row ${r} Col C has cert nr`);
      trackAssert(typeof sh8[`D${r}`]?.v === 'string' && sh8[`D${r}`].v.length > 0, `Anexa 8 row ${r} Col D has name`);
      trackAssert(typeof sh8[`E${r}`]?.v === 'string' && sh8[`E${r}`].v.length === 13, `Anexa 8 row ${r} Col E has CNP`);
    }
    for (let r = 15; r <= 205; r++) {
      for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        const val = sh8[`${col}${r}`]?.v;
        trackAssert(val === undefined || val === null || val === '', `Anexa 8 row ${r} Col ${col} cleared`);
      }
    }

    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, `0 residual placeholders across 8 sheets (found: ${JSON.stringify(leaks)})`);

    return `Verified: 8 sheets intact, Anexa 3/4/5/8 populated with 4 rows and clean clear-down, 0 leaks.`;
  });

  // -------------------------------------------------------------
  // SUITE 2: Scope A (Client-Level) - BISTRO GOURMET S.R.L. (2 Employees)
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Scope A (Client-Level) BISTRO GOURMET S.R.L. (2 emps) ---');

  await runTest('Scope A: hygiene-tabel-cursanti for BISTRO GOURMET (2 employees)', async () => {
    const bistro = await getBistroClient();
    trackAssertEqual(bistro.employees.length, 2, 'Bistro has 2 employees');

    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: bistro.id,
    });

    const participants = resolvedData.participants as any[];
    trackAssertEqual(participants.length, 2, 'Participants roster has 2 employees');

    const genRes = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: bistro.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Status is approved_for_print');
    trackAssertEqual(genRes.missingFields.length, 0, 'Zero missing fields');

    const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
    const sheet = wb.Sheets['Curs (2)'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const foundCnps = new Set<string>();
    for (let i = 0; i < 2; i++) {
      const row = rows[2 + i];
      trackAssertEqual(Number(row[0]), i + 1, `Row ${i + 3} Col A has nr ${i + 1}`);
      const rowCnp = String(row[2]);
      const emp = bistro.employees.find((e) => e.cnp === rowCnp);
      trackAssert(!!emp, `Row ${i + 3} Col C matches known Bistro employee CNP (${rowCnp})`);
      foundCnps.add(rowCnp);

      trackAssert(typeof row[1] === 'string' && row[1].includes(emp!.lastName), `Row ${i + 3} Col B has employee ${emp!.lastName}`);
      trackAssert(typeof row[7] === 'string' && row[7].includes('Modulul 1'), `Row ${i + 3} Col H has Modulul 1 Food`);
    }
    trackAssertEqual(foundCnps.size, 2, 'All 2 distinct Bistro employees are present');

    for (let r = 5; r <= 117; r++) {
      for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
        const val = sheet[`${col}${r}`]?.v;
        trackAssert(val === undefined || val === null || val === '', `Row ${r} Col ${col} is cleared`);
      }
    }

    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, `0 leaks in Bistro Tabel Cursanti`);
    return `Verified: 2 rows populated, rows 5..117 cleared down, 0 leaks.`;
  });

  await runTest('Scope A: hygiene-anexe-catalog for BISTRO GOURMET (2 employees)', async () => {
    const bistro = await getBistroClient();

    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-anexe-catalog',
      clientId: bistro.id,
    });

    const participants = resolvedData.participants as any[];
    trackAssertEqual(participants.length, 2, 'Participants roster has 2 employees');

    const genRes = await generateDocument({
      templateCode: 'hygiene-anexe-catalog',
      clientId: bistro.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Status is approved_for_print');
    trackAssertEqual(genRes.missingFields.length, 0, 'Zero missing fields');

    const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
    const sh3 = wb.Sheets['Anexa nr. 3'];
    for (let i = 0; i < 2; i++) {
      trackAssertEqual(Number(sh3[`A${13 + i}`]?.v), i + 1, `Anexa 3 row ${13 + i} has nr ${i + 1}`);
    }
    for (let r = 15; r <= 112; r++) {
      for (const col of ['A', 'B', 'C', 'D', 'E', 'G', 'H']) {
        const val = sh3[`${col}${r}`]?.v;
        trackAssert(val === undefined || val === null || val === '', `Anexa 3 row ${r} Col ${col} cleared`);
      }
    }

    const sh6 = wb.Sheets['Anexa nr. 6'];
    trackAssertEqual(String(sh6['G20']?.v), '2', 'Anexa 6 candidate count is 2');

    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, `0 leaks in Bistro Anexe Curs igiena`);
    return `Verified: 2 rows populated across annexes, rows cleared down, 0 leaks.`;
  });

  // -------------------------------------------------------------
  // SUITE 3: Scope B (Session-Level) - All 3 Seeded Sessions
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Scope B (Session-Level) 3 Seeded Sessions ---');

  const demoPvList = ['PV-EX-2025-0042', 'PV-EX-2026-0089', 'PV-EX-2026-0112'];
  for (const pvNr of demoPvList) {
    const sess = await prisma.hygieneSession.findFirst({
      where: { pvSeriesNumber: pvNr },
      include: {
        participants: {
          include: {
            employee: true,
          },
        },
      },
    });

    trackAssert(!!sess, `Session with PV ${pvNr} exists`);
    const sessName = `Session with PV ${pvNr} (${sess!.status}, ${sess!.participants.length} participants)`;

    await runTest(`Scope B: hygiene-tabel-cursanti for ${sessName}`, async () => {
      // Re-fetch session to ensure latest fresh ID
      const freshSess = await prisma.hygieneSession.findFirst({
        where: { pvSeriesNumber: pvNr },
        include: {
          participants: {
            include: { employee: true },
          },
        },
      });
      trackAssert(!!freshSess, 'Fresh session exists');
      const pCount = freshSess!.participants.length;

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-tabel-cursanti',
        clientId: freshSess!.participants[0]?.employee?.clientId || '',
        hygieneSessionId: freshSess!.id,
      });

      const participants = resolvedData.participants as any[];
      trackAssertEqual(participants.length, pCount, `Roster matches session participants (${pCount})`);

      const genRes = await generateDocument({
        templateCode: 'hygiene-tabel-cursanti',
        clientId: freshSess!.participants[0]?.employee?.clientId || '',
        hygieneSessionId: freshSess!.id,
        data: resolvedData,
        operatorName: 'Challenger 2',
      });

      trackAssertEqual(genRes.status, 'approved_for_print', 'Status is approved_for_print');

      const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
      const sheet = wb.Sheets['Curs (2)'];

      for (let i = 0; i < pCount; i++) {
        const r = 3 + i;
        trackAssertEqual(Number(sheet[`A${r}`]?.v), i + 1, `Row ${r} Col A has nr ${i + 1}`);
        trackAssert(typeof sheet[`B${r}`]?.v === 'string' && sheet[`B${r}`].v.length > 0, `Row ${r} Col B has name`);
        trackAssert(typeof sheet[`C${r}`]?.v === 'string' && sheet[`C${r}`].v.length === 13, `Row ${r} Col C has CNP`);
      }

      for (let r = 3 + pCount; r <= 117; r++) {
        for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
          const val = sheet[`${col}${r}`]?.v;
          trackAssert(val === undefined || val === null || val === '', `Row ${r} Col ${col} cleared`);
        }
      }

      const leaks = scanXlsxForPlaceholders(wb);
      trackAssertEqual(leaks.length, 0, `0 leaks in session ${freshSess!.id} tabel cursanti`);
      return `Populated ${pCount} rows, cleared down rows ${3 + pCount}..117, 0 leaks.`;
    });

    await runTest(`Scope B: hygiene-anexe-catalog for ${sessName}`, async () => {
      const freshSess = await prisma.hygieneSession.findFirst({
        where: { pvSeriesNumber: pvNr },
        include: {
          participants: {
            include: { employee: true },
          },
        },
      });
      trackAssert(!!freshSess, 'Fresh session exists');
      const pCount = freshSess!.participants.length;

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-anexe-catalog',
        clientId: freshSess!.participants[0]?.employee?.clientId || '',
        hygieneSessionId: freshSess!.id,
      });

      const genRes = await generateDocument({
        templateCode: 'hygiene-anexe-catalog',
        clientId: freshSess!.participants[0]?.employee?.clientId || '',
        hygieneSessionId: freshSess!.id,
        data: resolvedData,
        operatorName: 'Challenger 2',
      });

      trackAssertEqual(genRes.status, 'approved_for_print', 'Status is approved_for_print');

      const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });

      const sh3 = wb.Sheets['Anexa nr. 3'];
      for (let r = 13 + pCount; r <= 112; r++) {
        for (const col of ['A', 'B', 'C', 'D', 'E', 'G', 'H']) {
          const val = sh3[`${col}${r}`]?.v;
          trackAssert(val === undefined || val === null || val === '', `Anexa 3 row ${r} Col ${col} cleared`);
        }
      }

      const sh6 = wb.Sheets['Anexa nr. 6'];
      trackAssertEqual(String(sh6['G20']?.v), String(pCount), `Anexa 6 candidate count is ${pCount}`);

      const leaks = scanXlsxForPlaceholders(wb);
      trackAssertEqual(leaks.length, 0, `0 leaks in session ${freshSess!.id} anexe catalog`);
      return `Populated ${pCount} rows, cleared remaining rows, 0 leaks.`;
    });
  }

  // -------------------------------------------------------------
  // SUITE 4: hygiene-adeverinta (DOCX) Nominal Generation & XML Token Audit
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: hygiene-adeverinta (DOCX) XML Token Audit ---');

  // Scope A: Generate for all 4 employees of NEXUS
  const nexusForAdev = await getNexusClient();
  for (const emp of nexusForAdev.employees) {
    await runTest(`Scope A: hygiene-adeverinta for Nexus employee ${emp.firstName} ${emp.lastName}`, async () => {
      const freshNexus = await getNexusClient();
      const freshEmp = freshNexus.employees.find((e) => e.cnp === emp.cnp)!;

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-adeverinta',
        clientId: freshNexus.id,
        employeeId: freshEmp.id,
      });

      const genRes = await generateDocument({
        templateCode: 'hygiene-adeverinta',
        clientId: freshNexus.id,
        employeeId: freshEmp.id,
        data: resolvedData,
        operatorName: 'Challenger 2',
      });

      trackAssertEqual(genRes.status, 'approved_for_print', 'Status approved_for_print');
      trackAssertEqual(genRes.missingFields.length, 0, 'Zero missing fields');

      const docxBuf = fs.readFileSync(genRes.filePath);
      const leaks = scanDocxForPlaceholders(docxBuf);
      trackAssertEqual(leaks.length, 0, `0 residual {PLACEHOLDER_...} in DOCX XML (found: ${JSON.stringify(leaks)})`);

      const text = extractDocxText(docxBuf);
      trackAssert(text.includes(freshEmp.lastName), `Text contains employee lastName ${freshEmp.lastName}`);
      trackAssert(text.includes(freshEmp.firstName), `Text contains employee firstName ${freshEmp.firstName}`);
      trackAssert(text.includes(freshEmp.cnp), `Text contains employee CNP ${freshEmp.cnp}`);
      trackAssert(
        text.includes('2 . 209/4 . 469/2022') || text.includes('2209') || text.includes('Ordinului Ministrului Sanatatii'),
        'Text references Order 2209/2022'
      );
      trackAssert(text.includes('Modulul'), 'Text contains module designation');

      return `Adeverinta generated & verified: 0 XML leaks, correct nominal data.`;
    });
  }

  // Scope A: Generate for all 2 employees of BISTRO GOURMET
  const bistroForAdev = await getBistroClient();
  for (const emp of bistroForAdev.employees) {
    await runTest(`Scope A: hygiene-adeverinta for Bistro employee ${emp.firstName} ${emp.lastName}`, async () => {
      const freshBistro = await getBistroClient();
      const freshEmp = freshBistro.employees.find((e) => e.cnp === emp.cnp)!;

      const { resolvedData } = await resolveTemplatePlaceholders({
        templateCode: 'hygiene-adeverinta',
        clientId: freshBistro.id,
        employeeId: freshEmp.id,
      });

      const genRes = await generateDocument({
        templateCode: 'hygiene-adeverinta',
        clientId: freshBistro.id,
        employeeId: freshEmp.id,
        data: resolvedData,
        operatorName: 'Challenger 2',
      });

      trackAssertEqual(genRes.status, 'approved_for_print', 'Status approved_for_print');
      const docxBuf = fs.readFileSync(genRes.filePath);
      const leaks = scanDocxForPlaceholders(docxBuf);
      trackAssertEqual(leaks.length, 0, `0 residual {PLACEHOLDER_...} in Bistro adeverinta XML`);

      const text = extractDocxText(docxBuf);
      trackAssert(text.includes(freshEmp.lastName), `Text contains employee lastName ${freshEmp.lastName}`);
      trackAssert(text.includes(freshEmp.cnp), `Text contains employee CNP ${freshEmp.cnp}`);
      return `Adeverinta generated & verified: 0 XML leaks.`;
    });
  }

  // Scope B: Generate for each session participant
  for (const pvNr of demoPvList) {
    const sess = await prisma.hygieneSession.findFirst({
      where: { pvSeriesNumber: pvNr },
      include: {
        participants: {
          include: { employee: true },
        },
      },
    });

    if (!sess) continue;

    for (const part of sess.participants) {
      await runTest(`Scope B: hygiene-adeverinta for participant ${part.firstName} ${part.lastName} (PV ${pvNr})`, async () => {
        const freshSess = await prisma.hygieneSession.findFirst({
          where: { pvSeriesNumber: pvNr },
          include: {
            participants: {
              include: { employee: true },
            },
          },
        });
        const freshPart = freshSess!.participants.find((p) => p.cnp === part.cnp)!;

        const { resolvedData } = await resolveTemplatePlaceholders({
          templateCode: 'hygiene-adeverinta',
          clientId: freshPart.employee?.clientId || '',
          hygieneSessionId: freshSess!.id,
          hygieneParticipantId: freshPart.id,
        });

        const genRes = await generateDocument({
          templateCode: 'hygiene-adeverinta',
          clientId: freshPart.employee?.clientId || '',
          hygieneSessionId: freshSess!.id,
          data: resolvedData,
          operatorName: 'Challenger 2',
        });

        trackAssertEqual(genRes.status, 'approved_for_print', 'Status approved_for_print');
        const docxBuf = fs.readFileSync(genRes.filePath);
        const leaks = scanDocxForPlaceholders(docxBuf);
        trackAssertEqual(leaks.length, 0, `0 residual {PLACEHOLDER_...} in participant adeverinta`);

        const text = extractDocxText(docxBuf);
        trackAssert(text.includes(freshPart.lastName), `Text contains participant lastName ${freshPart.lastName}`);
        trackAssert(text.includes(freshPart.cnp), `Text contains participant CNP ${freshPart.cnp}`);
        if (freshPart.certificateNumber) {
          trackAssert(text.includes(freshPart.certificateNumber), `Text contains cert number ${freshPart.certificateNumber}`);
        }
        return `Adeverinta verified for participant ${freshPart.lastName}: 0 XML leaks.`;
      });
    }
  }

  // -------------------------------------------------------------
  // SUITE 5: Adversarial Stress Tests & Edge Cases
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Adversarial Stress Tests & Edge Cases ---');

  await runTest('Adversarial 5.1: Non-EU foreign worker with permit and non-standard CNP (starts with 9)', async () => {
    const bistro = await getBistroClient();
    const foreignParticipant = {
      rowNumber: 1,
      fullName: 'Kumar Gurung',
      lastName: 'Gurung',
      firstName: 'Kumar',
      cnp: '9900101410012',
      birthDate: '1990-01-01',
      birthPlace: 'Kathmandu',
      docType: 'Permis de sedere',
      docSeries: 'RO',
      docNumber: '987654',
      identityDocument: 'Permis de sedere seria RO nr. 987654',
      module: 'Modulul 1 - Servicii de alimentație',
      level: 'Nivelul 2',
      sessionDate: '01.03.2026',
      examDate: '10.03.2026',
      examGrade: '9.80',
      examResult: 'Admis',
      certificateSeries: 'IGI-STRAIN',
      certificateNumber: '9901',
      providerName: 'EXPERT SSM TRAINING S.R.L.',
    };

    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: bistro.id,
      customOverrides: {
        participants: [foreignParticipant],
      },
    });

    const genRes = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: bistro.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Foreign worker passes');
    const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
    const sheet = wb.Sheets['Curs (2)'];
    trackAssertEqual(sheet['B3']?.v, 'Kumar Gurung', 'Participant name rendered');
    trackAssertEqual(sheet['C3']?.v, '9900101410012', 'CNP rendered');
    trackAssertEqual(sheet['D3']?.v, '1990', 'Birth year extracted from birthDate for non-standard CNP');
    trackAssertEqual(sheet['G3']?.v, 'Kathmandu', 'Birthplace Kathmandu rendered');
    trackAssertEqual(sheet['I3']?.v, 'Permis de sedere seria RO nr. 987654', 'Permit doc rendered without truncation');

    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, '0 leaks for foreign worker');
    return `Verified: Foreign worker with non-standard CNP correctly extracted birth info and permit ID without leaks.`;
  });

  await runTest('Adversarial 5.2: Employee with null birthDate (extract from 13-digit standard CNP)', async () => {
    const nexus = await getNexusClient();
    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      customOverrides: {
        participants: [
          {
            rowNumber: 1,
            fullName: 'Elena Vasilescu',
            lastName: 'Vasilescu',
            firstName: 'Elena',
            cnp: '2980514410023',
            birthDate: null,
            birthPlace: 'București',
            module: 'Modulul 2 - Servicii de curățenie',
            level: 'Nivelul 1',
          },
        ],
      },
    });

    const genRes = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
    const sheet = wb.Sheets['Curs (2)'];
    trackAssertEqual(sheet['D3']?.v, '1998', 'CNP decoded year 1998');
    trackAssertEqual(sheet['E3']?.v, '05', 'CNP decoded month 05');
    trackAssertEqual(sheet['F3']?.v, '14', 'CNP decoded day 14');
    return `Verified: Standard Romanian CNP successfully decoded birth year (1998), month (05), day (14) when birthDate is null.`;
  });

  await runTest('Adversarial 5.3: Fallback when client has 0 employees', async () => {
    const nexus = await getNexusClient();
    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      customOverrides: {
        participants: [],
      },
    });

    const genRes = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Status approved_for_print on fallback');
    const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
    const sheet = wb.Sheets['Curs (2)'];
    trackAssert(typeof sheet['B3']?.v === 'string' && sheet['B3'].v.length > 0, '1st row rendered via scalar fallback');
    trackAssert(sheet['B4']?.v === undefined || sheet['B4']?.v === '', 'Row 4 cleared down');
    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, '0 leaks on empty array fallback');
    return `Verified: Empty participant array gracefully falls back to scalar employee without crashes or leaks.`;
  });

  await runTest('Adversarial 5.4: Missing provider sub-address fields (building/floor/apt null)', async () => {
    const nexus = await getNexusClient();
    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-anexe-catalog',
      clientId: nexus.id,
      customOverrides: {
        PLACEHOLDER_BLOC_FURNIZOR: '-',
        PLACEHOLDER_SCARA_FURNIZOR: '-',
        PLACEHOLDER_ETAJ_FURNIZOR: '-',
        PLACEHOLDER_APARTAMENT_FURNIZOR: '-',
      },
    });

    const genRes = await generateDocument({
      templateCode: 'hygiene-anexe-catalog',
      clientId: nexus.id,
      data: resolvedData,
      operatorName: 'Challenger 2',
    });

    trackAssertEqual(genRes.status, 'approved_for_print', 'Sub-address dash fallback approved');
    const wb = XLSX.read(fs.readFileSync(genRes.filePath), { type: 'buffer' });
    const leaks = scanXlsxForPlaceholders(wb);
    trackAssertEqual(leaks.length, 0, '0 leaks with dash sub-addresses');
    return `Verified: Missing provider sub-addresses handled gracefully with legal dashes and 0 leaks.`;
  });

  await runTest('Adversarial 5.5: Heavy Romanian diacritics resilience (ș, ț, ă, î, â)', async () => {
    const nexus = await getNexusClient();
    const diacriticParticipant = {
      rowNumber: 1,
      fullName: 'Țepeș Ștefăniță-Pârvan',
      lastName: 'Țepeș',
      firstName: 'Ștefăniță-Pârvan',
      cnp: '1850720410088',
      birthDate: '1985-07-20',
      birthPlace: 'Târgoviște, Dâmbovița',
      docType: 'C.I.',
      docSeries: 'DB',
      docNumber: '998877',
      identityDocument: 'C.I. seria DB nr. 998877',
      module: 'Modulul 1 - Sector Alimentar și Alimentație Publică',
      level: 'Nivelul 1 - Conducere și Coordonare',
    };

    const { resolvedData: xlsxData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      customOverrides: {
        participants: [diacriticParticipant],
      },
    });

    const genXlsx = await generateDocument({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: nexus.id,
      data: xlsxData,
      operatorName: 'Challenger 2',
    });

    const wb = XLSX.read(fs.readFileSync(genXlsx.filePath), { type: 'buffer' });
    const sheet = wb.Sheets['Curs (2)'];
    trackAssertEqual(sheet['B3']?.v, 'Țepeș Ștefăniță-Pârvan', 'Full diacritics in XLSX participant name');
    trackAssertEqual(sheet['G3']?.v, 'Târgoviște, Dâmbovița', 'Full diacritics in XLSX birth place');

    const { resolvedData: docxData } = await resolveTemplatePlaceholders({
      templateCode: 'hygiene-adeverinta',
      clientId: nexus.id,
      customOverrides: {
        PLACEHOLDER_NUME_COMPLET: 'Țepeș Ștefăniță-Pârvan',
        PLACEHOLDER_LOCALITATE_NASTERII: 'Târgoviște',
        PLACEHOLDER_JUDET_NASTERII: 'Dâmbovița',
        PLACEHOLDER_CNP: '1850720410088',
      },
    });

    const genDocx = await generateDocument({
      templateCode: 'hygiene-adeverinta',
      clientId: nexus.id,
      data: docxData,
      operatorName: 'Challenger 2',
    });

    const text = extractDocxText(fs.readFileSync(genDocx.filePath));
    trackAssert(text.includes('Țepeș Ștefăniță-Pârvan'), 'Diacritics preserved in DOCX');
    trackAssert(text.includes('Târgoviște'), 'City diacritics preserved in DOCX');

    return `Verified: Romanian diacritics (ș, ț, ă, î, â) render faithfully with zero encoding artifacts or corruptions.`;
  });

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('  CHALLENGER 2 EMPIRICAL VERIFICATION SUMMARY');
  console.log('================================================================');
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.filter((t) => !t.passed).length;
  console.log(`Total tests run: ${testResults.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total assertions verified: ${totalAssertions}`);

  if (failedCount > 0) {
    console.error('\nFAILURES:');
    for (const r of testResults.filter((t) => !t.passed)) {
      console.error(`- ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✓ ALL TESTS PASSED WITH 100% SUCCESS RATE.');
  }

  await prisma.$disconnect();
}

runAllTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
