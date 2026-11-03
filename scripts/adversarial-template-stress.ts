/**
 * ADVERSARIAL STRESS TEST HARNESS — MILESTONE 3
 * Template Auto-Completion, Document Generation & Corrupted Input Resilience
 *
 * Suites:
 *  1. Empty / Sparse Client and Employee Records
 *  2. Romanian Diacritics and Character Set Resilience (ă, â, î, ș, ț, Ă, Â, Î, Ș, Ț, etc.)
 *  3. Boundary Participant Counts in Excel Templates (0, 1, 100, 195, 200)
 *  4. Extreme / Malformed / XML Injection Inputs
 *  5. High-Concurrency Stress Test (25/25 Parallel Generation)
 *  6. Dual-Engine Deep XML & ZIP Structural Integrity Oracle (xmldom + Python 3 ElementTree)
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import PizZip from 'pizzip';
import * as XLSX from 'xlsx';
import { DOMParser } from '@xmldom/xmldom';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { resolveTemplateData } from '../src/lib/templates/resolver';
import { renderTemplateBuffer, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

interface TestStats {
  passed: number;
  failed: number;
  errors: string[];
}

const stats: TestStats = {
  passed: 0,
  failed: 0,
  errors: [],
};

function assert(condition: boolean, message: string) {
  if (condition) {
    stats.passed++;
  } else {
    stats.failed++;
    stats.errors.push(message);
    console.error(`  ❌ FAILED: ${message}`);
  }
}

const xmlStrictParser = new DOMParser({
  onError: (level, msg) => {
    if (level === 'fatalError' || level === 'error') {
      throw new Error(`${level}: ${msg}`);
    }
  },
});

/**
 * Validates that every XML and .rels entry in a ZIP buffer can be parsed cleanly.
 */
function validateZipXmlParts(buffer: Buffer, format: string, label: string): number {
  if (format !== 'docx' && format !== 'xlsx') return 0;
  const zip = new PizZip(buffer);
  let parsedCount = 0;

  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (relativePath.endsWith('.xml') || relativePath.endsWith('.rels')) {
      parsedCount++;
      const xmlContent = file.asText();
      try {
        xmlStrictParser.parseFromString(xmlContent, 'text/xml');
      } catch (err: any) {
        assert(false, `[${label}] Malformed XML in ${relativePath}: ${err.message}`);
      }
    }
  }
  return parsedCount;
}

/**
 * Secondary verification oracle using Python 3 zipfile and xml.etree.ElementTree
 */
function verifyWithPythonOracle(tempFilePath: string, label: string): boolean {
  try {
    const pyScript = `
import sys, zipfile, xml.etree.ElementTree as ET

path = sys.argv[1]
with zipfile.ZipFile(path, 'r') as z:
    for name in z.namelist():
        if name.endswith('.xml') or name.endswith('.rels'):
            data = z.read(name)
            try:
                ET.fromstring(data)
            except Exception as e:
                print(f"PYTHON_XML_FAIL: {name} -> {e}", file=sys.stderr)
                sys.exit(1)
sys.exit(0)
`;
    execFileSync('python3', ['-c', pyScript, tempFilePath], { stdio: 'pipe' });
    return true;
  } catch (err: any) {
    const errOut = err.stderr ? err.stderr.toString() : err.message;
    assert(false, `[${label}] Python ElementTree validation failed: ${errOut}`);
    return false;
  }
}

function generateMockParticipants(count: number) {
  const participants = [];
  for (let i = 1; i <= count; i++) {
    const pad = String(i).padStart(3, '0');
    participants.push({
      rowNumber: i,
      fullName: `Cursant ${pad} Ștefănescu-Popa Ionuț`,
      lastName: 'Ștefănescu-Popa',
      firstName: `Ionuț ${pad}`,
      cnp: '188' + pad.padStart(10, '0'),
      birthDate: '15.03.1988',
      birthPlace: `București, Sector ${(i % 6) + 1}`,
      docType: 'C.I.',
      docSeries: 'RX',
      docNumber: String(100000 + i),
      identityDocument: `C.I. seria RX nr. ${100000 + i}`,
      module: 'Modulul 1 - Servicii alimentație publică',
      level: 'Nivelul 1',
      sessionDate: '10.03.2026',
      examDate: '15.03.2026',
      examGrade: (8 + (i % 3)).toString(),
      examResult: i % 10 === 0 ? 'Respins' : 'Admis',
      certificateSeries: 'IGI',
      certificateNumber: `C-${pad}`,
      providerName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
      coursePeriod: '01.03.2026 - 10.03.2026',
    });
  }
  return participants;
}

async function runAdversarialSuites() {
  console.log('======================================================================');
  console.log('🏁 STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE (MILESTONE 3)');
  console.log('======================================================================\n');

  const storageDir = path.join(process.cwd(), 'storage', 'stress_test_artifacts');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // -------------------------------------------------------------------------
  // SUITE 1: Empty and Sparse Client & Employee Records
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 1: Empty and Sparse Client & Employee Records');
  {
    // Test 1.1: Completely empty client object {} across all 25 templates
    for (const t of TEMPLATE_CATALOG) {
      try {
        const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.normalizedFilename);
        const res = await resolveTemplateData(t.code, { client: {} });
        assert(res.status === 'ready', `Empty client: ${t.code} expected status ready, got ${res.status}`);
        assert(res.unresolvedPlaceholders.length === 0, `Empty client: ${t.code} unresolved: ${res.unresolvedPlaceholders.join(', ')}`);

        const buf = await renderTemplateBuffer(templatePath, t.format, res.data, t.normalizedFilename);
        assert(buf.length > 500, `Empty client: ${t.code} generated buffer too small (${buf.length} bytes)`);

        const unmapped = await collectUnresolvedPlaceholders(buf, t.format);
        assert(unmapped.length === 0, `Empty client: ${t.code} has unmapped in file: ${unmapped.join(', ')}`);

        const xmlCount = validateZipXmlParts(buf, t.format, `Suite1-EmptyClient-${t.code}`);
        if (t.format === 'docx' || t.format === 'xlsx') {
          assert(xmlCount > 0, `Empty client: ${t.code} parsed 0 XML parts`);
        }
      } catch (err: any) {
        assert(false, `Crash on empty client for ${t.code}: ${err.message}`);
      }
    }

    // Test 1.2: Sparse client with explicit nulls and missing optional fields
    const sparseClient = {
      name: 'SC SPARSE TEST SRL',
      cui: null,
      regCom: undefined,
      address: null,
      legalRepresentative: null,
      contactPhone: null,
      contactEmail: undefined,
    };
    const sparseEmployee = {
      id: 'emp-sparse-001',
      lastName: null,
      firstName: null,
      cnp: null,
      birthDate: null,
      birthPlace: null,
      birthCounty: null,
      hireDate: null,
      residenceAddress: {
        county: null,
        locality: null,
        street: null,
        number: null,
        building: null,
        entrance: null,
        floor: null,
        apartment: null,
      },
      identityDocument: {
        docType: null,
        series: null,
        number: null,
        issuedBy: null,
        issueDate: null,
        expiryDate: null,
      },
      currentJob: null,
      currentWorksite: null,
      hygieneModule: null,
    };

    for (const t of TEMPLATE_CATALOG) {
      try {
        const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.normalizedFilename);
        const res = await resolveTemplateData(t.code, {
          client: sparseClient,
          employee: sparseEmployee,
        });

        const buf = await renderTemplateBuffer(templatePath, t.format, res.data, t.normalizedFilename);
        assert(buf.length > 500, `Sparse records: ${t.code} generated buffer valid`);
        validateZipXmlParts(buf, t.format, `Suite1-SparseRecords-${t.code}`);
      } catch (err: any) {
        assert(false, `Crash on sparse client/employee for ${t.code}: ${err.message}`);
      }
    }
  }
  console.log(`  ✓ Suite 1 complete. Tests passed so far: ${stats.passed}\n`);

  // -------------------------------------------------------------------------
  // SUITE 2: Romanian Diacritics and Character Set Resilience
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 2: Romanian Diacritics and Special Character Set Resilience');
  {
    const clientDiacritics = {
      name: 'Ș.C. ÎNTREPRINDEREA & CONSTRUCȚII „RĂSĂRITUL ROMÂNESC” S.R.L.',
      cui: 'RO99887766',
      regCom: 'J40/9999/2026',
      address: 'București, Sector 2, Șoseaua Iancului nr. 45, bl. 102, sc. B, et. 4, ap. 38',
      legalRepresentative: 'Dr. Ing. Lăcrămioara-Mădălina Țurcanu-Bălănescu',
      contactPhone: '0721.999.888',
      contactEmail: 'contact@rasarit-constructii.ro',
    };

    const employeeDiacritics = {
      id: 'emp-diacritics',
      lastName: 'Pârvan-Țene',
      firstName: 'Ștefăniță-Gheorghiță',
      cnp: '1850720410055',
      birthDate: new Date('1985-07-20'),
      birthPlace: 'Târgoviște',
      birthCounty: 'Dâmbovița',
      hireDate: new Date('2026-01-15'),
      residenceAddress: {
        county: 'Dâmbovița',
        locality: 'Târgoviște',
        street: 'Calea Domnească',
        number: '12-14',
        building: 'B3',
        entrance: '2',
        floor: '3',
        apartment: '12',
      },
      identityDocument: {
        docType: 'C.I.',
        series: 'DB',
        number: '987654',
        issuedBy: 'SPCLEP Târgoviște',
        issueDate: new Date('2020-08-10'),
        expiryDate: new Date('2030-08-10'),
      },
      currentJob: {
        title: 'Șef Formație Lucru / Întreținere Rețele Înaltă Tensiune',
        corCode: '311305',
      },
      currentWorksite: {
        name: 'Șantier Construcții Industriale „Parc Fotovoltaic Târgoviște”',
        address: 'Comuna Ulmi, jud. Dâmbovița, Str. Câmpului nr. 1',
        activity: 'Montaj echipamente electrice și structuri metalice',
      },
      hygieneModule: 'Nivelul 1 - Servicii de alimentație și întreținere',
    };

    for (const t of TEMPLATE_CATALOG) {
      try {
        const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.normalizedFilename);
        const res = await resolveTemplateData(t.code, {
          client: clientDiacritics,
          employee: employeeDiacritics,
          job: employeeDiacritics.currentJob,
          worksite: employeeDiacritics.currentWorksite,
        });

        assert(res.status === 'ready', `Diacritics: ${t.code} expected ready, got ${res.status}`);
        const buf = await renderTemplateBuffer(templatePath, t.format, res.data, t.normalizedFilename);

        const unmapped = await collectUnresolvedPlaceholders(buf, t.format);
        assert(unmapped.length === 0, `Diacritics: ${t.code} unmapped tokens: ${unmapped.join(', ')}`);

        // Check XML validity
        validateZipXmlParts(buf, t.format, `Suite2-Diacritics-${t.code}`);

        // Save a sample for Python oracle check
        if (t.code === 'ipssm-tesa' || t.code === 'hr-cim-2026' || t.code === 'hygiene-anexe-catalog') {
          const sampleFile = path.join(storageDir, `sample_diacritics_${t.code}.${t.format}`);
          fs.writeFileSync(sampleFile, buf);
          const pyOk = verifyWithPythonOracle(sampleFile, `Suite2-PythonOracle-${t.code}`);
          assert(pyOk, `Python ElementTree rejected diacritics document ${t.code}`);
        }
      } catch (err: any) {
        assert(false, `Crash on diacritics for ${t.code}: ${err.message}`);
      }
    }
  }
  console.log(`  ✓ Suite 2 complete. Tests passed so far: ${stats.passed}\n`);

  // -------------------------------------------------------------------------
  // SUITE 3: Boundary Participant Counts in Excel Templates
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 3: Boundary Participant Counts in Excel Templates (0, 1, 100, 195, 200)');
  {
    const excelTemplates = [
      { code: 'hygiene-anexe-catalog', filename: 'Anexe Curs igiena.xlsx' },
      { code: 'hygiene-tabel-cursanti', filename: 'Tabel Cursanti exemplu.xlsx' },
    ];
    const boundaryCounts = [0, 1, 100, 195, 200];

    for (const t of excelTemplates) {
      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.filename);

      for (const count of boundaryCounts) {
        try {
          const participants = generateMockParticipants(count);
          const baseRes = await resolveTemplateData(t.code, {
            client: { name: 'Compania Test Igienă S.R.L.' },
          });

          const testData: Record<string, unknown> = {
            ...baseRes.data,
            participants,
            PLACEHOLDER_NUMAR_CANDIDATI: String(count),
            PLACEHOLDER_NUMAR_PREZENTI: String(count),
            PLACEHOLDER_NUMAR_ADMISI: String(count === 0 ? 0 : participants.filter((p) => p.examResult === 'Admis').length),
            PLACEHOLDER_NUMAR_RESPINSI: String(count === 0 ? 0 : participants.filter((p) => p.examResult === 'Respins').length),
          };

          if (count === 0) {
            testData.PLACEHOLDER_NUME_COMPLET = '-';
          }

          const buf = await renderTemplateBuffer(templatePath, 'xlsx', testData, t.filename);
          assert(buf.length > 1000, `Excel ${t.code} count ${count} buffer size valid`);

          // 1. Verify 0 unmapped placeholders
          const unmapped = await collectUnresolvedPlaceholders(buf, 'xlsx');
          assert(unmapped.length === 0, `Excel ${t.code} count ${count} has unmapped: ${unmapped.join(', ')}`);

          // 2. Verify SheetJS can read the output cleanly
          const wb = XLSX.read(buf, { type: 'buffer' });
          assert(wb && wb.SheetNames.length > 0, `Excel ${t.code} count ${count} unreadable by SheetJS`);

          // 3. Verify XML parts inside XLSX zip
          validateZipXmlParts(buf, 'xlsx', `Suite3-Excel-${t.code}-${count}`);

          // 4. Exact cell blanking verification on Anexa 8 (up to 195 capacity)
          if (t.code === 'hygiene-anexe-catalog') {
            const anexa8 = wb.Sheets['Anexa nr. 8'];
            if (count === 1) {
              assert(anexa8['D11']?.v === 'Cursant 001 Ștefănescu-Popa Ionuț', 'Row 001 correctly populated');
              assert(anexa8['D12']?.v === '', 'Row 002 blanked');
              assert(anexa8['D205']?.v === '', 'Row 195 blanked');
            } else if (count === 100) {
              assert(anexa8['D11']?.v === 'Cursant 001 Ștefănescu-Popa Ionuț', 'Row 001 correctly populated');
              assert(anexa8['D110']?.v === 'Cursant 100 Ștefănescu-Popa Ionuț', 'Row 100 correctly populated');
              assert(anexa8['D111']?.v === '', 'Row 101 blanked');
              assert(anexa8['D205']?.v === '', 'Row 195 blanked');
            } else if (count === 195) {
              assert(anexa8['D11']?.v === 'Cursant 001 Ștefănescu-Popa Ionuț', 'Row 001 correctly populated');
              assert(anexa8['D110']?.v === 'Cursant 100 Ștefănescu-Popa Ionuț', 'Row 100 correctly populated');
              assert(anexa8['D205']?.v === 'Cursant 195 Ștefănescu-Popa Ionuț', 'Row 195 correctly populated');
            }
          }
        } catch (err: any) {
          assert(false, `Crash on Excel ${t.code} count ${count}: ${err.message}`);
        }
      }
    }
  }
  console.log(`  ✓ Suite 3 complete. Tests passed so far: ${stats.passed}\n`);

  // -------------------------------------------------------------------------
  // SUITE 4: Extreme / Malformed / XML Injection Inputs
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 4: Extreme, Malformed & XML Injection Inputs');
  {
    const attackClient = {
      name: 'SC <CORRUPTED_XML & INJECTION> S.R.L. "\'',
      cui: 'RO99999999',
      regCom: 'J40/"<TAG>/2026',
      address: 'Strada Adresă Excesiv de Lungă '.repeat(150),
      legalRepresentative: 'Director " <Injection> & &amp; Administrator',
      contactPhone: 'NaN / Infinity / undefined',
      contactEmail: '<script>alert(1)</script>@hack.ro',
    };

    const attackEmployee = {
      id: 'emp-attack-666',
      lastName: 'Ionescu & <XML_TAG>',
      firstName: 'Popescu "Quoted" & \'Apostrophe\'',
      cnp: '0000000000000',
      birthDate: new Date('invalid date string'),
      birthPlace: 'Localitate <Injected>',
      birthCounty: 'Sector 1 & 2',
      hireDate: new Date(NaN),
      residenceAddress: {
        county: null,
        locality: undefined,
        street: '<w:p><w:t>Attack</w:t></w:p>',
        number: 'NaN',
        building: null,
        entrance: undefined,
        floor: null,
        apartment: null,
      },
      identityDocument: {
        docType: null,
        series: '&&',
        number: '<<>>',
        issuedBy: '<Police Dept>',
        issueDate: 'not-a-date',
        expiryDate: null,
      },
      currentJob: {
        title: 'Post cu <Caractere & Speciale>',
        corCode: null,
      },
      currentWorksite: {
        name: null,
        address: null,
        activity: null,
      },
    };

    for (const t of TEMPLATE_CATALOG) {
      try {
        const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.normalizedFilename);
        const res = await resolveTemplateData(t.code, {
          client: attackClient,
          employee: attackEmployee,
          job: attackEmployee.currentJob,
          worksite: attackEmployee.currentWorksite,
        });

        const buf = await renderTemplateBuffer(templatePath, t.format, res.data, t.normalizedFilename);
        assert(buf.length > 500, `Attack inputs: ${t.code} buffer generated`);

        // Assert XML validity is completely intact despite XML injection attempts
        validateZipXmlParts(buf, t.format, `Suite4-Attack-${t.code}`);
      } catch (err: any) {
        assert(false, `Crash on attack inputs for ${t.code}: ${err.message}`);
      }
    }
  }
  console.log(`  ✓ Suite 4 complete. Tests passed so far: ${stats.passed}\n`);

  // -------------------------------------------------------------------------
  // SUITE 5: High-Concurrency Stress Test
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 5: High-Concurrency Stress Test (25 Parallel Generations)');
  {
    const concurrentPromises = TEMPLATE_CATALOG.map(async (t, idx) => {
      const templatePath = path.join(process.cwd(), 'templates_registry', 'normalized', t.normalizedFilename);
      const client = {
        name: `Client Concurrent ${idx} S.R.L.`,
        cui: `RO${20000000 + idx}`,
        address: `Strada Test Concurrency nr. ${idx}`,
        legalRepresentative: `Reprezentant Legal ${idx}`,
      };
      const employee = {
        id: `emp-concurrent-${idx}`,
        lastName: `Nume${idx}`,
        firstName: `Prenume${idx}`,
        cnp: `18901014100${idx.toString().padStart(2, '0')}`,
      };

      const res = await resolveTemplateData(t.code, { client, employee });
      const buf = await renderTemplateBuffer(templatePath, t.format, res.data, t.normalizedFilename);
      const unmapped = await collectUnresolvedPlaceholders(buf, t.format);

      return {
        code: t.code,
        format: t.format,
        bufferSize: buf.length,
        unmappedCount: unmapped.length,
      };
    });

    const results = await Promise.all(concurrentPromises);
    assert(results.length === 25, 'All 25 concurrent templates completed');

    for (const r of results) {
      assert(r.bufferSize > 500, `Concurrent ${r.code} produced valid buffer`);
      assert(r.unmappedCount === 0, `Concurrent ${r.code} produced 0 unmapped tokens`);
    }
  }
  console.log(`  ✓ Suite 5 complete. Tests passed so far: ${stats.passed}\n`);

  // -------------------------------------------------------------------------
  // SUITE 6: Deep Dual-Engine XML & ZIP Structural Integrity Oracle
  // -------------------------------------------------------------------------
  console.log('📌 SUITE 6: Deep Dual-Engine XML & ZIP Structural Integrity Oracle');
  {
    const testDocx = path.join(process.cwd(), 'templates_registry', 'normalized', 'TESA.docx');
    const testXlsx = path.join(process.cwd(), 'templates_registry', 'normalized', 'Anexe Curs igiena.xlsx');

    const resDocx = await resolveTemplateData('ipssm-tesa', { client: { name: 'Compania Oracle SRL' } });
    const bufDocx = await renderTemplateBuffer(testDocx, 'docx', resDocx.data, 'TESA.docx');
    const docxFile = path.join(storageDir, 'oracle_check_tesa.docx');
    fs.writeFileSync(docxFile, bufDocx);

    const resXlsx = await resolveTemplateData('hygiene-anexe-catalog', { client: { name: 'Compania Oracle SRL' } });
    const bufXlsx = await renderTemplateBuffer(testXlsx, 'xlsx', resXlsx.data, 'Anexe Curs igiena.xlsx');
    const xlsxFile = path.join(storageDir, 'oracle_check_anexe.xlsx');
    fs.writeFileSync(xlsxFile, bufXlsx);

    const docxPyOk = verifyWithPythonOracle(docxFile, 'Suite6-Python-TESA');
    const xlsxPyOk = verifyWithPythonOracle(xlsxFile, 'Suite6-Python-Anexe');

    assert(docxPyOk, 'Python Oracle confirmed DOCX XML structural integrity');
    assert(xlsxPyOk, 'Python Oracle confirmed XLSX XML structural integrity');
  }
  console.log(`  ✓ Suite 6 complete. Tests passed so far: ${stats.passed}\n`);

  // -------------------------------------------------------------------------
  // SUMMARY AND VERDICT
  // -------------------------------------------------------------------------
  console.log('======================================================================');
  console.log(`🏁 ADVERSARIAL STRESS TEST RESULTS:`);
  console.log(`   Passed Assertions : ${stats.passed}`);
  console.log(`   Failed Assertions : ${stats.failed}`);
  console.log('======================================================================');

  if (stats.failed > 0) {
    console.error('\n❌ FAILURES RECORDED:');
    for (const e of stats.errors) {
      console.error(`  - ${e}`);
    }
    console.log('\nEMPIRICAL VERDICT: REJECT');
    process.exit(1);
  } else {
    console.log('\nEMPIRICAL VERDICT: APPROVE');
    process.exit(0);
  }
}

runAdversarialSuites().catch((err) => {
  console.error('Fatal unhandled error in stress suite:', err);
  process.exit(1);
});
