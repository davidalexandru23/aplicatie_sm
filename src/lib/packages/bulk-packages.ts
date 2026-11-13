/**
 * ============================================================================
 * BULK GENERATION PACKAGES: 1-CLICK ZIP ARCHIVES FOR SSM, HR & INSPECTIONS
 * ============================================================================
 * 
 * Implements Milestone 4 (Pillar 4) Features:
 * - F16: Employee Onboarding Package (1-Click ZIP per Employee)
 * - F17: Company SSM Dossier Package (1-Click ZIP per Client)
 * - F18: Statutory ITM / ISU Inspection Archive (Structured Directory ZIP)
 * 
 * Uses in-memory PizZip for zero-temp-file streaming and fast packaging.
 */

import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import { prisma } from '@/lib/prisma';
import { TEMPLATE_CATALOG, TemplateDefinition } from '@/lib/templates/definitions';
import { resolveTemplateData, TemplateResolutionOptions } from '@/lib/templates/resolver';
import { renderTemplateBuffer } from '@/lib/templates/generator';

// Helper to sanitize filenames for cross-platform ZIP compatibility (Windows/Linux/macOS)
export function sanitizeZipPath(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics for ultra-compatible zip filenames
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/^\.+/g, '')
    .replace(/\.{2,}/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Render a single template to a DOCX buffer using unified resolver and generator.
 */
async function renderDocx(
  templateCode: string,
  context: TemplateResolutionOptions
): Promise<{ filename: string; buffer: Buffer }> {
  const tpl = TEMPLATE_CATALOG.find((t) => t.code === templateCode);
  if (!tpl) {
    throw new Error(`Șablonul ${templateCode} nu există în catalog.`);
  }

  const templateFilePath = path.join(
    process.cwd(),
    'templates_registry',
    'normalized',
    tpl.normalizedFilename
  );

  if (!fs.existsSync(templateFilePath)) {
    throw new Error(`Fișierul șablon lipsește: ${tpl.normalizedFilename}`);
  }

  const resolution = await resolveTemplateData(templateCode, {
    ...context,
    allowOfflineBlank: true,
  });

  const buffer = await renderTemplateBuffer(
    templateFilePath,
    tpl.format,
    resolution.data,
    tpl.normalizedFilename
  );

  return {
    filename: tpl.normalizedFilename,
    buffer,
  };
}

// ============================================================================
// F16: EMPLOYEE ONBOARDING PACKAGE (1-CLICK ZIP PER EMPLOYEE)
// ============================================================================

/**
 * Helper: dynamically resolve applicable IPSSMs based on CAEN and job risk flags.
 * - Driving required or transport CAEN -> ipssm-autovehicule
 * - Screen work / sitting posture or IT/office CAEN -> ipssm-birou
 * - Food handling, standing, mixed posture or restaurant/retail/industrial CAEN -> ipssm-alunecari
 * - Administrative / TESA title or office CAEN -> ipssm-tesa
 * - Universal base (HG 1425/2006) -> ipssm-universale (always included)
 * - Statutory Opis -> ipssm-opis (always included at end)
 */
export function resolveApplicableIpssms(
  caenCode: string | null | undefined,
  jobs: Array<{
    isDrivingRequired?: boolean;
    isFoodHandling?: boolean;
    isScreenWork?: boolean;
    workPosture?: string | null;
    heightWork?: boolean;
    title?: string;
  }>,
  targetJob?: {
    isDrivingRequired?: boolean;
    isFoodHandling?: boolean;
    isScreenWork?: boolean;
    workPosture?: string | null;
    heightWork?: boolean;
    title?: string;
  } | null
): string[] {
  const caen = caenCode ? String(caenCode).trim() : '6201';
  const relevantJobs = targetJob ? [targetJob] : jobs;

  const hasDriving =
    relevantJobs.some((j) => j.isDrivingRequired) ||
    ['6201', '4941', '4932', '5320'].includes(caen);

  const hasScreenWork =
    relevantJobs.some((j) => j.isScreenWork || j.workPosture === 'sitting') ||
    ['6201', '6202', '6203', '6209', '6311', '7022', '6920'].includes(caen);

  const hasFoodOrSlip =
    relevantJobs.some(
      (j) =>
        j.isFoodHandling ||
        j.heightWork ||
        j.workPosture === 'standing' ||
        j.workPosture === 'mixed'
    ) ||
    ['5610', '5621', '5630', '4711', '4120', '6201'].includes(caen) ||
    jobs.length === 0;

  const isTesaJob = (title?: string) => {
    if (!title) return false;
    const t = title.toLowerCase();
    return (
      t.includes('manager') ||
      t.includes('director') ||
      t.includes('inginer') ||
      t.includes('programator') ||
      t.includes('contabil') ||
      t.includes('administrator') ||
      t.includes('secretar') ||
      t.includes('specialist') ||
      t.includes('tehnician')
    );
  };
  const hasTesa =
    relevantJobs.some((j) => isTesaJob(j.title)) ||
    ['6201', '6202', '7022', '6920'].includes(caen) ||
    relevantJobs.length === 0;

  const items: string[] = [];
  if (hasScreenWork) items.push('ipssm-birou');
  if (hasFoodOrSlip) items.push('ipssm-alunecari');
  if (hasDriving) items.push('ipssm-autovehicule');
  if (hasTesa) items.push('ipssm-tesa');
  items.push('ipssm-universale');
  items.push('ipssm-opis');

  return items;
}

export interface EmployeeOnboardingOptions {
  clientId: string;
  employeeId: string;
  operatorName?: string;
  preferCimModelCadru?: boolean;
  jobId?: string;
  worksiteId?: string;
}

export async function generateEmployeeOnboardingZip(
  options: EmployeeOnboardingOptions
): Promise<{ filename: string; buffer: Buffer; employeeName: string; clientName: string }> {
  const client = await prisma.client.findUnique({
    where: { id: options.clientId },
    include: {
      jobs: true,
      worksites: true,
      trainingEvents: true,
      employees: {
        where: { id: options.employeeId },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
      provider: {
        include: {
          specialists: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      specialist: true,
    },
  });

  if (!client) throw new Error(`Clientul cu id ${options.clientId} nu a fost găsit.`);
  const employee = client.employees[0];
  if (!employee) throw new Error(`Salariatul cu id ${options.employeeId} nu a fost găsit.`);
  if (employee.status === 'PLECAT') {
    throw new Error(`Salariatul ${employee.lastName} ${employee.firstName} are contractul de muncă încetat (status PLECAT). Nu se poate genera pachetul de onboarding.`);
  }

  const job = employee.currentJob || (options.jobId ? (client.jobs.find((j) => j.id === options.jobId) || null) : null) || null;
  const worksite = employee.currentWorksite || (options.worksiteId ? (client.worksites.find((w) => w.id === options.worksiteId) || null) : null) || null;

  const resolutionContext: TemplateResolutionOptions = {
    client,
    employee,
    job,
    worksite,
    allowOfflineBlank: true,
  };

  const cimTemplateCode = options.preferCimModelCadru ? 'hr-cim-model-cadru-2022' : 'hr-cim-2026';

  const onboardingManifest = [
    { code: 'hr-cerere-angajare', label: '01_Cerere_Angajare.docx' },
    { code: cimTemplateCode, label: '02_Contract_Individual_Munca.docx' },
    { code: 'hr-anexa-fisa-post', label: '03_Anexa_Fisa_Postului_SSM.docx' },
    { code: 'ssm-fisa-instruire-individuala', label: '04_Fisa_Instruire_Individuala_SSM.docx' },
    { code: 'psi-fisa-instructaj-individuala', label: '05_Fisa_Instructaj_Individuala_PSI.docx' },
    { code: 'med-fisa-solicitare-examen', label: '06_Fisa_Solicitare_Examen_Medical.docx' },
    { code: 'med-fisa-identificare-riscuri', label: '07_Fisa_Identificare_Factori_Risc.docx' },
    { code: 'eip-fisa-acordare-individuala', label: '08_Fisa_Acordare_EIP.docx' },
    { code: 'hr-gdpr-informare', label: '09_Informare_GDPR.docx' },
    { code: 'hr-declaratie-regulament', label: '10_Declaratie_Luare_Cunostinta_RI.docx' },
    { code: 'hr-declaratie-raspundere', label: '11_Declaratie_Proprie_Raspundere.docx' },
  ];

  const zip = new PizZip();

  for (const item of onboardingManifest) {
    try {
      const rendered = await renderDocx(item.code, resolutionContext);
      zip.file(item.label, rendered.buffer);
    } catch (err) {
      console.error(`Eroare la generarea documentului ${item.code} în pachetul de onboarding:`, err);
    }
  }

  const employeeName = `${employee.lastName}_${employee.firstName}`;
  const clientClean = sanitizeZipPath(client.name);
  const employeeClean = sanitizeZipPath(employeeName);
  const zipFilename = `Pachet_Onboarding_${clientClean}_${employeeClean}.zip`;

  const zipBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  return {
    filename: zipFilename,
    buffer: zipBuffer,
    employeeName: `${employee.lastName} ${employee.firstName}`,
    clientName: client.name,
  };
}

// ============================================================================
// F17: COMPANY SSM DOSSIER PACKAGE (1-CLICK ZIP PER CLIENT)
// ============================================================================

export interface CompanyDossierOptions {
  clientId: string;
  operatorName?: string;
  jobId?: string;
  worksiteId?: string;
}

export async function generateCompanyDossierZip(
  options: CompanyDossierOptions
): Promise<{ filename: string; buffer: Buffer; clientName: string }> {
  const client = await prisma.client.findUnique({
    where: { id: options.clientId },
    include: {
      jobs: true,
      worksites: true,
      trainingEvents: true,
      employees: {
        where: { status: { not: 'PLECAT' } },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
      provider: {
        include: {
          specialists: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      specialist: true,
    },
  });

  if (!client) throw new Error(`Clientul cu id ${options.clientId} nu a fost găsit.`);

  const resolutionContext: TemplateResolutionOptions = {
    client,
    job: options.jobId ? (client.jobs.find((j) => j.id === options.jobId) || null) : null,
    worksite: options.worksiteId ? (client.worksites.find((w) => w.id === options.worksiteId) || null) : null,
    allowOfflineBlank: true,
  };

  const baseCompanyManifest: Array<{ code: string; title: string }> = [
    { code: 'decizii-angajator', title: 'Decizii_Organizatorice_SSM_PSI' },
    { code: 'risk-evaluare', title: 'Evaluarea_Riscurilor_Profesionale' },
    { code: 'risk-plan-prevenire-tesa', title: 'Plan_Prevenire_si_Protectie' },
    { code: 'risk-plan-actiune-urgenta', title: 'Plan_Actiune_Pericol_Grav_si_Iminent' },
    { code: 'risk-zone-pericol', title: 'Delimitare_Zone_Risc_Ridicat' },
    { code: 'training-tematica-introductiv', title: 'Tematica_Instruire_Introductiv_Generala' },
    { code: 'training-tematica-loc-munca', title: 'Tematica_Instruire_Loc_Munca' },
    { code: 'training-detaliu-introductiv', title: 'Detaliu_Tematica_Introductiv_Generala' },
    { code: 'training-detaliu-loc-munca', title: 'Detaliu_Tematica_Loc_Munca' },
  ];

  const ipssmTitles: Record<string, string> = {
    'ipssm-birou': 'IPSSM_Activitati_de_Birou',
    'ipssm-alunecari': 'IPSSM_Alunecari_si_Impiedicari',
    'ipssm-autovehicule': 'IPSSM_Autovehicule_in_Trafic',
    'ipssm-tesa': 'IPSSM_Personal_TESA',
    'ipssm-universale': 'IPSSM_Universale',
    'ipssm-opis': 'Opis_Documente_SSM',
  };

  const applicableIpssms = resolveApplicableIpssms(client.caenCode, client.jobs, resolutionContext.job);

  const allCompanyDocs: Array<{ code: string; title: string }> = [
    ...baseCompanyManifest,
    ...applicableIpssms.map((code) => ({ code, title: ipssmTitles[code] || code })),
    { code: 'hr-info-dosar', title: 'Informare_Dosar_Personal' },
  ];

  const companyManifest = allCompanyDocs.map((item, idx) => {
    const pad = String(idx + 1).padStart(2, '0');
    return {
      code: item.code,
      label: `${pad}_${item.title}.docx`,
    };
  });

  const zip = new PizZip();

  for (const item of companyManifest) {
    try {
      const rendered = await renderDocx(item.code, resolutionContext);
      zip.file(item.label, rendered.buffer);
    } catch (err) {
      console.error(`Eroare la generarea documentului ${item.code} în dosarul companiei:`, err);
    }
  }

  const clientClean = sanitizeZipPath(client.name);
  const zipFilename = `Dosar_Companie_SSM_${clientClean}.zip`;
  const zipBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  return {
    filename: zipFilename,
    buffer: zipBuffer,
    clientName: client.name,
  };
}

// ============================================================================
// F18: ITM / ISU STATUTORY INSPECTION ARCHIVE (STRUCTURED DIRECTORIES ZIP)
// ============================================================================

export interface InspectionArchiveOptions {
  clientId: string;
  operatorName?: string;
  includeAllEmployees?: boolean;
  jobId?: string;
  worksiteId?: string;
}

export async function generateInspectionArchiveZip(
  options: InspectionArchiveOptions
): Promise<{ filename: string; buffer: Buffer; clientName: string; employeesIncluded: number }> {
  const client = await prisma.client.findUnique({
    where: { id: options.clientId },
    include: {
      jobs: true,
      worksites: true,
      trainingEvents: true,
      employees: {
        where: options.includeAllEmployees ? undefined : { status: { not: 'PLECAT' } },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
      provider: {
        include: {
          specialists: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      specialist: true,
    },
  });

  if (!client) throw new Error(`Clientul cu id ${options.clientId} nu a fost găsit.`);

  const zip = new PizZip();
  const companyContext: TemplateResolutionOptions = {
    client,
    job: options.jobId ? (client.jobs.find((j) => j.id === options.jobId) || null) : null,
    worksite: options.worksiteId ? (client.worksites.find((w) => w.id === options.worksiteId) || null) : null,
    allowOfflineBlank: true,
  };

  // 1. Folder 01_ORGANIZARE_SSM
  const folder01 = [
    { code: 'decizii-angajator', path: '01_ORGANIZARE_SSM/Decizii_Organizatorice_SSM_PSI.docx' },
    { code: 'ipssm-opis', path: '01_ORGANIZARE_SSM/Opis_Documente_SSM.docx' },
    { code: 'hr-info-dosar', path: '01_ORGANIZARE_SSM/Informare_Dosar_Personal.docx' },
  ];
  for (const item of folder01) {
    try {
      const rendered = await renderDocx(item.code, companyContext);
      zip.file(item.path, rendered.buffer);
    } catch (err) {
      console.error(`Eroare dosar 01 (${item.code}):`, err);
    }
  }

  // 2. Folder 02_EVALUARE_RISCURI_SI_PLAN_PREVENIRE
  const folder02 = [
    { code: 'risk-evaluare', path: '02_EVALUARE_RISCURI_SI_PLAN_PREVENIRE/Evaluarea_Riscurilor_Profesionale.docx' },
    { code: 'risk-plan-prevenire-tesa', path: '02_EVALUARE_RISCURI_SI_PLAN_PREVENIRE/Plan_Prevenire_si_Protectie.docx' },
    { code: 'risk-plan-actiune-urgenta', path: '02_EVALUARE_RISCURI_SI_PLAN_PREVENIRE/Plan_Actiune_Pericol_Grav_si_Iminent.docx' },
    { code: 'risk-zone-pericol', path: '02_EVALUARE_RISCURI_SI_PLAN_PREVENIRE/Delimitare_Zone_Risc_Ridicat.docx' },
  ];
  for (const item of folder02) {
    try {
      const rendered = await renderDocx(item.code, companyContext);
      zip.file(item.path, rendered.buffer);
    } catch (err) {
      console.error(`Eroare dosar 02 (${item.code}):`, err);
    }
  }

  // 3. Folder 03_TEMATICI_SI_INSTRUCTIUNI_PROPRII
  const applicableIpssmsInspection = resolveApplicableIpssms(client.caenCode, client.jobs, companyContext.job);
  const inspectionIpssmPaths: Record<string, string> = {
    'ipssm-birou': '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Activitati_de_Birou.docx',
    'ipssm-alunecari': '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Alunecari_si_Impiedicari.docx',
    'ipssm-autovehicule': '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Autovehicule_in_Trafic.docx',
    'ipssm-tesa': '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Personal_TESA.docx',
    'ipssm-universale': '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Universale.docx',
  };

  const folder03 = [
    { code: 'training-tematica-introductiv', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Tematica_Instruire_Introductiv_Generala.docx' },
    { code: 'training-tematica-loc-munca', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Tematica_Instruire_Loc_Munca.docx' },
    { code: 'training-detaliu-introductiv', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Detaliu_Tematica_Introductiv_Generala.docx' },
    { code: 'training-detaliu-loc-munca', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Detaliu_Tematica_Loc_Munca.docx' },
    ...applicableIpssmsInspection
      .filter((code) => inspectionIpssmPaths[code])
      .map((code) => ({ code, path: inspectionIpssmPaths[code] })),
  ];
  for (const item of folder03) {
    try {
      const rendered = await renderDocx(item.code, companyContext);
      zip.file(item.path, rendered.buffer);
    } catch (err) {
      console.error(`Eroare dosar 03 (${item.code}):`, err);
    }
  }

  // 4. Folder 04_FISE_INDIVIDUALE_SALARIATI & 06_MEDICINA_MUNCII per salariat
  const employeesToProcess = client.employees || [];
  for (const emp of employeesToProcess) {
    const empNameClean = sanitizeZipPath(`${emp.lastName}_${emp.firstName}`);
    const empContext: TemplateResolutionOptions = {
      client,
      employee: emp,
      job: emp.currentJob || null,
      worksite: emp.currentWorksite || null,
      allowOfflineBlank: true,
    };

    const empDocs = [
      { code: 'ssm-fisa-instruire-individuala', path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Fisa_Instruire_Individuala_SSM.docx` },
      { code: 'psi-fisa-instructaj-individuala', path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Fisa_Instructaj_Individuala_PSI.docx` },
      { code: 'eip-fisa-acordare-individuala', path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Fisa_Acordare_EIP.docx` },
      { code: 'hr-anexa-fisa-post', path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Anexa_Fisa_Postului_SSM.docx` },
      { code: 'hr-cim-model-cadru-2022', path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Contract_Individual_Munca.docx` },
      { code: 'hr-cerere-angajare', path: `04_FISE_INDIVIDUALE_SALARIATI/${empNameClean}/Cerere_Angajare.docx` },
      // 06 Medicina Muncii
      { code: 'med-fisa-solicitare-examen', path: `06_MEDICINA_MUNCII/${empNameClean}/Fisa_Solicitare_Examen_Medical.docx` },
      { code: 'med-fisa-identificare-riscuri', path: `06_MEDICINA_MUNCII/${empNameClean}/Fisa_Identificare_Factori_Risc.docx` },
    ];

    for (const d of empDocs) {
      try {
        const rendered = await renderDocx(d.code, empContext);
        zip.file(d.path, rendered.buffer);
      } catch (err) {
        console.error(`Eroare document salariat ${empNameClean} (${d.code}):`, err);
      }
    }
  }

  // 5. Folder 05_SITUATII_DE_URGENTA_PSI
  const folder05 = [
    { code: 'risk-plan-actiune-urgenta', path: '05_SITUATII_DE_URGENTA_PSI/Plan_Actiune_Pericol_Grav_si_Iminent.docx' },
    { code: 'training-tematica-introductiv', path: '05_SITUATII_DE_URGENTA_PSI/Tematica_Cadru_Instructaj_PSI.docx' },
    { code: 'decizii-angajator', path: '05_SITUATII_DE_URGENTA_PSI/Decizii_si_Atributii_Cadru_Tehnic_PSI.docx' },
  ];
  for (const item of folder05) {
    try {
      const rendered = await renderDocx(item.code, companyContext);
      zip.file(item.path, rendered.buffer);
    } catch (err) {
      console.error(`Eroare dosar 05 (${item.code}):`, err);
    }
  }

  const clientClean = sanitizeZipPath(client.name);
  const zipFilename = `Arhiva_Inspectie_ITM_ISU_${clientClean}.zip`;
  const zipBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  return {
    filename: zipFilename,
    buffer: zipBuffer,
    clientName: client.name,
    employeesIncluded: employeesToProcess.length,
  };
}
