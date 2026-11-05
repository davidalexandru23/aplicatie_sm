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

export interface EmployeeOnboardingOptions {
  clientId: string;
  employeeId: string;
  operatorName?: string;
  preferCimModelCadru?: boolean;
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

  const job = employee.currentJob || client.jobs[0] || null;
  const worksite = employee.currentWorksite || client.worksites[0] || null;

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
    job: client.jobs[0] || null,
    worksite: client.worksites[0] || null,
    allowOfflineBlank: true,
  };

  const companyManifest = [
    { code: 'decizii-angajator', label: '01_Decizii_Organizatorice_SSM_PSI.docx' },
    { code: 'risk-evaluare', label: '02_Evaluarea_Riscurilor_Profesionale.docx' },
    { code: 'risk-plan-prevenire-tesa', label: '03_Plan_Prevenire_si_Protectie.docx' },
    { code: 'risk-plan-actiune-urgenta', label: '04_Plan_Actiune_Pericol_Grav_si_Iminent.docx' },
    { code: 'risk-zone-pericol', label: '05_Delimitare_Zone_Risc_Ridicat.docx' },
    { code: 'training-tematica-introductiv', label: '06_Tematica_Instruire_Introductiv_Generala.docx' },
    { code: 'training-tematica-loc-munca', label: '07_Tematica_Instruire_Loc_Munca.docx' },
    { code: 'training-detaliu-introductiv', label: '08_Detaliu_Tematica_Introductiv_Generala.docx' },
    { code: 'training-detaliu-loc-munca', label: '09_Detaliu_Tematica_Loc_Munca.docx' },
    { code: 'ipssm-birou', label: '10_IPSSM_Activitati_de_Birou.docx' },
    { code: 'ipssm-alunecari', label: '11_IPSSM_Alunecari_si_Impiedicari.docx' },
    { code: 'ipssm-autovehicule', label: '12_IPSSM_Autovehicule_in_Trafic.docx' },
    { code: 'ipssm-tesa', label: '13_IPSSM_Personal_TESA.docx' },
    { code: 'ipssm-universale', label: '14_IPSSM_Universale.docx' },
    { code: 'ipssm-opis', label: '15_Opis_Documente_SSM.docx' },
    { code: 'hr-info-dosar', label: '16_Informare_Dosar_Personal.docx' },
  ];

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
    job: client.jobs[0] || null,
    worksite: client.worksites[0] || null,
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
  const folder03 = [
    { code: 'training-tematica-introductiv', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Tematica_Instruire_Introductiv_Generala.docx' },
    { code: 'training-tematica-loc-munca', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Tematica_Instruire_Loc_Munca.docx' },
    { code: 'training-detaliu-introductiv', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Detaliu_Tematica_Introductiv_Generala.docx' },
    { code: 'training-detaliu-loc-munca', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/Detaliu_Tematica_Loc_Munca.docx' },
    { code: 'ipssm-birou', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Activitati_de_Birou.docx' },
    { code: 'ipssm-alunecari', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Alunecari_si_Impiedicari.docx' },
    { code: 'ipssm-autovehicule', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Autovehicule_in_Trafic.docx' },
    { code: 'ipssm-tesa', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Personal_TESA.docx' },
    { code: 'ipssm-universale', path: '03_TEMATICI_SI_INSTRUCTIUNI_PROPRII/IPSSM_Universale.docx' },
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
      job: emp.currentJob || client.jobs[0] || null,
      worksite: emp.currentWorksite || client.worksites[0] || null,
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
