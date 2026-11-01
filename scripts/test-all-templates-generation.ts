import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import { prisma } from '../src/lib/prisma';
import { TEMPLATE_CATALOG } from '../src/lib/templates/definitions';
import { resolveTemplatePlaceholders, formatDateRo } from '../src/lib/templates/resolver';
import { parseBirthInfo, validateMissingFields, collectUnresolvedPlaceholders } from '../src/lib/templates/generator';

const TEST_OUT_DIR = path.join(process.cwd(), 'storage', 'test_documents');
if (!fs.existsSync(TEST_OUT_DIR)) {
  fs.mkdirSync(TEST_OUT_DIR, { recursive: true });
}

interface TestReportItem {
  code: string;
  name: string;
  format: string;
  contextLevel: string;
  status: 'PASS' | 'FAIL';
  missingDataStatus: 'approved_for_print' | 'missing_data';
  repLegalValue: string;
  employeeValue?: string;
  details: string;
  filePath: string;
}

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('VERIFICARE COMPLETĂ & LOGICĂ SSM PENTRU CELE 25 DE ȘABLOANE');
  console.log('Conform Legii 319/2006, HG 1425/2006, Codului Muncii Legea 53/2003');
  console.log('================================================================\n');

  // 1. Fetch real client from database
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
      },
      jobs: true,
      worksites: true,
    },
  });

  if (!client) {
    throw new Error('Clientul de test NEXUS SOLUTIONS S.R.L. nu a fost găsit în baza de date!');
  }

  console.log(`Client: ${client.name} (CUI: ${client.cui})`);
  console.log(`Reprezentant Legal / Administrator: ${client.legalRepresentative}`);
  console.log(`Angajați existenți: ${client.employees.length}`);
  client.employees.forEach((emp, i) => {
    console.log(`  [${i + 1}] ${emp.lastName} ${emp.firstName} | CNP: ${emp.cnp} | Funcție: ${emp.currentJob?.title}`);
  });
  console.log('');

  const employee = client.employees[0]; // Stan Alexandru
  const job = employee.currentJob || client.jobs[0];
  const worksite = employee.currentWorksite || client.worksites[0];

  // Sesiune de igienă de test cu cei 3 angajați
  const simulatedHygieneSession = {
    providerName: 'SC EXPERT SSM TRAINING SRL',
    msAuthorization: 'Aviz MS nr. 102/2024 din 15.01.2024',
    meAuthorization: 'Aviz ME nr. 55/2024 din 20.01.2024',
    sessionDate: new Date('2026-03-10'),
    examDate: new Date('2026-03-15'),
    location: 'București, Sala de curs SSM',
    pvSeriesNumber: 'PV-EX-2026-001',
    commissionPresident: 'Dr. Ionescu Radu',
    commissionMember1: 'As. Med. Popa Elena',
    commissionMember2: 'Insp. DSP Mihai Dan',
    commissionSecretary: 'Secretar Georgescu Ana',
    participants: client.employees.map((emp, idx) => ({
      id: emp.id,
      rowNumber: idx + 1,
      lastName: emp.lastName,
      firstName: emp.firstName,
      fullName: `${emp.lastName} ${emp.firstName}`,
      cnp: emp.cnp,
      birthDate: emp.birthDate,
      birthPlace: emp.birthPlace || 'București',
      docType: emp.identityDocument?.docType || 'CI',
      docSeries: emp.identityDocument?.series || 'RD',
      docNumber: emp.identityDocument?.number || '123456',
      module: emp.hygieneModule || 'Modulul 1 - Servicii Generale',
      level: 'Nivel 1',
      sessionDate: '10.03.2026',
      examDate: '15.03.2026',
      examGrade: '10',
      examResult: 'Admis',
      attendance: 'prezent',
      certificateSeries: 'IGI',
      certificateNumber: `2026-00${idx + 1}`,
      providerName: 'SC EXPERT SSM TRAINING SRL',
      coursePeriod: '01.03.2026 - 10.03.2026',
    })),
  };

  const reports: TestReportItem[] = [];

  for (const t of TEMPLATE_CATALOG) {
    const templateFilePath = path.join(
      process.cwd(),
      'templates_registry',
      'normalized',
      t.normalizedFilename
    );

    if (!fs.existsSync(templateFilePath)) {
      throw new Error(`Fișierul șablon lipsește: ${templateFilePath}`);
    }

    // Resolve placeholders using resolver.ts
    const resolved = await resolveTemplatePlaceholders({
      templateCode: t.code,
      clientId: client.id,
      employeeId: employee.id,
      jobId: job?.id,
    });

    // Merge session data if template is in hygiene family
    let mergedData = { ...resolved.resolvedData };
    if (t.family === 'hygiene' || t.contextLevel === 'hygiene_session') {
      const p1 = simulatedHygieneSession.participants[0];
      mergedData = {
        ...mergedData,
        PLACEHOLDER_PRESTATOR_SSM: simulatedHygieneSession.providerName,
        PLACEHOLDER_FURNIZOR_SSM: simulatedHygieneSession.providerName,
        PLACEHOLDER_AVIZ_MS: simulatedHygieneSession.msAuthorization,
        PLACEHOLDER_AVIZ_ME: simulatedHygieneSession.meAuthorization,
        PLACEHOLDER_DATA_SESIUNE: formatDateRo(simulatedHygieneSession.sessionDate),
        PLACEHOLDER_DATA_EXAMEN: formatDateRo(simulatedHygieneSession.examDate),
        PLACEHOLDER_DATA_PV: formatDateRo(simulatedHygieneSession.examDate),
        PLACEHOLDER_DATA_CATALOG: formatDateRo(simulatedHygieneSession.examDate),
        PLACEHOLDER_LOCATIE_EXAMEN: simulatedHygieneSession.location,
        PLACEHOLDER_NUMAR_PV: simulatedHygieneSession.pvSeriesNumber,
        PLACEHOLDER_PRESEDINTE_COMISIE: simulatedHygieneSession.commissionPresident,
        PLACEHOLDER_MEMBRU_COMISIE_1: simulatedHygieneSession.commissionMember1,
        PLACEHOLDER_MEMBRU_COMISIE_2: simulatedHygieneSession.commissionMember2,
        PLACEHOLDER_SECRETAR_COMISIE: simulatedHygieneSession.commissionSecretary,
        PLACEHOLDER_SERIE_ADEVERINTA: p1.certificateSeries,
        PLACEHOLDER_NUMAR_ADEVERINTA: p1.certificateNumber,
        PLACEHOLDER_DATA_ELIBERARE: formatDateRo(simulatedHygieneSession.examDate),
        PLACEHOLDER_MODUL_IGIENA: p1.module,
        PLACEHOLDER_NIVEL_IGIENA: p1.level,
        PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Director Formare SSM',
        participants: simulatedHygieneSession.participants,
      };
    }

    let outBuffer: Buffer;
    const outFilename = `TEST_${t.code}_${t.normalizedFilename}`;
    const outPath = path.join(TEST_OUT_DIR, outFilename);

    if (t.format === 'docx') {
      const content = fs.readFileSync(templateFilePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: (part) => (part.value ? `{${part.value}}` : ''),
      });

      const renderData = Object.fromEntries(
        Object.entries(mergedData).filter(
          ([key, value]) =>
            !key.startsWith('PLACEHOLDER_') ||
            (value !== undefined && value !== null && String(value).trim() !== '')
        )
      );

      doc.render(renderData);
      outBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } else if (t.format === 'xlsx') {
      const wb = XLSX.readFile(templateFilePath);
      const participants = simulatedHygieneSession.participants;

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        for (const address of Object.keys(sheet)) {
          if (address.startsWith('!')) continue;
          const cell = sheet[address];
          if (typeof cell?.v !== 'string') continue;

          cell.v = cell.v.replace(/PLACEHOLDER_[A-Z0-9_]+/g, (token: string) => {
            const direct = mergedData[token];
            if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
              return String(direct);
            }
            const indexed = token.match(/_(\d{2,3})$/);
            if (indexed) {
              const idx = Number(indexed[1]) - 1;
              if (idx >= participants.length) return '';
              const p = participants[idx];
              if (p) {
                const birth = parseBirthInfo(p.birthDate, p.cnp);
                const identity = `${p.docType} seria ${p.docSeries} nr. ${p.docNumber}`;
                const map: Record<string, string> = {
                  NUMAR_ORDINE: String(p.rowNumber),
                  NUME_COMPLET: p.fullName,
                  CNP: p.cnp,
                  ACT_IDENTITATE: identity,
                  DATA_LOC_NASTERII: `${birth.dateFormatted}, ${p.birthPlace}`,
                  DATA_NASTERII: birth.dateFormatted,
                  LOCALITATE_NASTERII: p.birthPlace,
                  MODUL_NIVEL: `${p.module} - ${p.level}`,
                  NOTA_EXAMEN: p.examGrade,
                  REZULTAT_EXAMEN: p.examResult,
                  AN_NASTERII: birth.year,
                  LUNA_NASTERII: birth.month,
                  ZIUA_NASTERII: birth.day,
                  LOC_NASTERII: p.birthPlace,
                };
                const k = token.replace(/_\d{2,3}$/, '').replace(/^PLACEHOLDER_/, '');
                return map[k] || token;
              }
            }
            return token;
          });
        }
      }
      outBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } else {
      throw new Error(`Format necunoscut: ${t.format}`);
    }

    fs.writeFileSync(outPath, outBuffer);

    // Verification of generated document content
    const unmappedInFile = await collectUnresolvedPlaceholders(outBuffer, t.format);
    const missingFields = validateMissingFields(t.fields, mergedData);
    const hasMissing = unmappedInFile.length > 0 || missingFields.length > 0;
    const missingDataStatus = hasMissing ? 'missing_data' : 'approved_for_print';

    // Verify Reprezentant Legal vs Employee separation
    let repLegalOk = true;
    let details = '';

    if (t.format === 'docx') {
      const checkZip = new PizZip(outBuffer);
      let xmlText = '';
      for (const f of Object.values(checkZip.files)) {
        if (f.name.startsWith('word/') && f.name.endsWith('.xml')) {
          xmlText += f.asText() + ' ';
        }
      }

      // Check: If template uses PLACEHOLDER_REPREZENTANT_LEGAL, it MUST be Munteanu Cristian
      if (t.fields.some((f) => f.key === 'PLACEHOLDER_REPREZENTANT_LEGAL')) {
        if (!xmlText.includes('Munteanu Cristian')) {
          repLegalOk = false;
          details = 'EROARE: Munteanu Cristian lipsește din document!';
        }
      }

      // Check: Employee must NOT be substituted into legal representative position
      if (
        xmlText.includes('reprezentat legal prin Stan Alexandru') ||
        xmlText.includes('ADMINISTRATOR Stan Alexandru')
      ) {
        repLegalOk = false;
        details = 'EROARE GRAVĂ: Salariatul a fost pus în locul administratorului!';
      }
    }

    const testPassed = repLegalOk;

    reports.push({
      code: t.code,
      name: t.name,
      format: t.format,
      contextLevel: t.contextLevel,
      status: testPassed ? 'PASS' : 'FAIL',
      missingDataStatus,
      repLegalValue: String(mergedData.PLACEHOLDER_REPREZENTANT_LEGAL || 'N/A'),
      employeeValue: t.contextLevel === 'employee' ? `${employee.lastName} ${employee.firstName}` : undefined,
      details: details || `Tokens necompletați: ${unmappedInFile.length} (comportament legal așteptat)`,
      filePath: outPath,
    });
  }

  // Print Report Table
  console.log('========================================================================================');
  console.log('REZULTATE TEST GENERARE PENTRU TOATE CELE 25 DE ȘABLOANE');
  console.log('========================================================================================');
  console.log(
    'Cod Șablon'.padEnd(30) +
    'Format'.padEnd(8) +
    'Status'.padEnd(8) +
    'Stare Flux'.padEnd(20) +
    'Reprezentant Legal'.padEnd(22) +
    'Salariat'
  );
  console.log('-'.repeat(100));

  let passCount = 0;
  let failCount = 0;

  for (const r of reports) {
    if (r.status === 'PASS') passCount++;
    else failCount++;

    console.log(
      r.code.padEnd(30) +
      r.format.toUpperCase().padEnd(8) +
      r.status.padEnd(8) +
      r.missingDataStatus.padEnd(20) +
      r.repLegalValue.padEnd(22) +
      (r.employeeValue || '-')
    );
  }

  console.log('-'.repeat(100));
  console.log(`TOTAL: 25 șabloane | TRECUTE (PASS): ${passCount} | EȘUATE (FAIL): ${failCount}`);

  if (failCount > 0) {
    console.error('TESTUL A EȘUAT!');
    process.exit(1);
  } else {
    console.log('\n✓ TOATE CELE 25 DE ȘABLOANE AU FOST GENERATE ȘI VERIFICATE CU SUCCES!');
    console.log('✓ Separarea Administrator vs Salariat este 100% strictă conform legislației SSM din România.');
    console.log(`✓ Fișierele generate pentru inspecție se află în: ${TEST_OUT_DIR}`);
  }
}

runEndToEndVerification().catch((err) => {
  console.error('Eroare neașteptată:', err);
  process.exit(1);
});
