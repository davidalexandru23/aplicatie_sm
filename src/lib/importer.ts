import * as XLSX from 'xlsx';
import { prisma } from './prisma';
import { maskCNP, logAuditEvent } from './security';

export interface ParsedCompany {
  name?: string;
  cui?: string;
  regCom?: string;
  address?: string;
  legalRepresentative?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface ParsedEmployee {
  rowNumber: number;
  // Personal
  lastName: string;
  firstName: string;
  sex?: string;
  cnp: string;
  birthDate?: Date;
  birthPlace?: string;
  birthCounty?: string;
  citizenship?: string;
  // Act identitate
  docType: string;
  docSeries?: string;
  docNumber: string;
  docIssuedBy?: string;
  docIssueDate?: Date;
  docExpiryDate?: Date;
  // Domiciliu
  county: string;
  locality: string;
  street: string;
  streetNumber: string;
  building?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
  // Contact
  email?: string;
  phone?: string;
  // SSM & Job
  jobTitle: string;
  worksiteName: string;
  startDateOnJob?: Date;
  hireDate?: Date;
  status: 'ACTIV' | 'PLECAT';
  leaveDate?: Date;
  // Curs igiena
  hygieneRequested: boolean;
  hygieneModule?: string;
  hygienePreferredSession?: string;
  adminNotes?: string;
  // Validare
  isValid: boolean;
  errors: string[];
}

export interface ParsedJobContext {
  worksiteName: string;
  worksiteAddress: string;
  worksiteActivity?: string;
  jobTitle: string;
  corCode?: string;
  mainActivities?: string;
  equipmentUsed?: string;
  workConditions?: string;
  workersCount?: number;
}

export interface ParsedWorkbook {
  company: ParsedCompany;
  employees: ParsedEmployee[];
  jobContexts: ParsedJobContext[];
}

export interface ImportPreviewItem {
  rowNumber: number;
  cnpMasked: string;
  name: string;
  jobTitle: string;
  worksiteName: string;
  status: 'NEW' | 'MODIFIED' | 'UNCHANGED' | 'ERROR' | 'AMBIGUOUS';
  errors: string[];
  changes: { field: string; oldVal: string; newVal: string }[];
  employeeData: ParsedEmployee;
}

export interface ImportPreviewReport {
  company: ParsedCompany;
  summary: {
    totalRows: number;
    newCount: number;
    modifiedCount: number;
    unchangedCount: number;
    errorCount: number;
    ambiguousCount: number;
  };
  newWorksites: string[];
  newJobs: string[];
  items: ImportPreviewItem[];
}

function parseExcelDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel date serial number
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    // Format DD.MM.YYYY
    const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmy) {
      const d = parseInt(dmy[1], 10);
      const m = parseInt(dmy[2], 10) - 1;
      const y = parseInt(dmy[3], 10);
      const parsed = new Date(y, m, d);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function getCellValue(sheet: XLSX.WorkSheet, cellRef: string): string {
  const cell = sheet[cellRef];
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

/**
 * Validare algoritm CNP românesc
 */
export function validateCNP(cnp: string): boolean {
  const clean = cnp.trim();
  if (!/^\d{13}$/.test(clean)) return false;
  
  const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  const control = remainder === 10 ? 1 : remainder;
  return control === parseInt(clean[12], 10);
}

/**
 * Parsare fișier Excel Model_date_client_SSM.xlsx
 */
export function parseClientWorkbook(buffer: Buffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const sheetNameFirm = wb.SheetNames.find((s) => s.toLowerCase().includes('firm'));
  if (!sheetNameFirm) {
    throw new Error('Foaia "Firmă și angajați" lipsește din registrul Excel.');
  }

  const sFirm = wb.Sheets[sheetNameFirm];

  // 1. Parsare metadate companie (A5:E8)
  const company: ParsedCompany = {
    name: getCellValue(sFirm, 'B5'),
    cui: getCellValue(sFirm, 'B6'),
    regCom: getCellValue(sFirm, 'B7'),
    address: getCellValue(sFirm, 'B8'),
    legalRepresentative: getCellValue(sFirm, 'E5'),
    contactPerson: getCellValue(sFirm, 'E6'),
    contactEmail: getCellValue(sFirm, 'E7'),
    contactPhone: getCellValue(sFirm, 'E8'),
  };

  // 2. Parsare tabel angajați (începând cu rândul 13, antete la rândul 12)
  const employees: ParsedEmployee[] = [];
  const range = XLSX.utils.decode_range(sFirm['!ref'] || 'A1:AH250');

  for (let r = 12; r <= range.e.r; r++) {
    const lastName = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 0 }));
    const firstName = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 1 }));
    const cnpRaw = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 3 }));

    // Dacă rândul este complet gol, trecem peste
    if (!lastName && !firstName && !cnpRaw) continue;

    const errors: string[] = [];
    if (!lastName) errors.push('Numele este obligatoriu.');
    if (!firstName) errors.push('Prenumele este obligatoriu.');
    if (!cnpRaw) {
      errors.push('CNP-ul este obligatoriu.');
    } else if (!validateCNP(cnpRaw)) {
      errors.push('CNP-ul este invalid (cifra de control sau lungime incorectă).');
    }

    const birthDate = parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 4 })]?.v);
    if (!birthDate) errors.push('Data nașterii este obligatorie sau invalidă.');

    const docNumber = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 10 }));
    if (!docNumber) errors.push('Numărul actului de identitate este obligatoriu.');

    const county = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 14 }));
    const locality = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 15 }));
    const street = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 16 }));
    const streetNumber = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 17 }));

    if (!county) errors.push('Județul de domiciliu este obligatoriu.');
    if (!locality) errors.push('Localitatea de domiciliu este obligatorie.');
    if (!street) errors.push('Strada este obligatorie.');
    if (!streetNumber) errors.push('Numărul străzii este obligatoriu.');

    const jobTitle = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 24 }));
    const worksiteName = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 25 }));
    if (!jobTitle) errors.push('Funcția/postul este obligatorie.');
    if (!worksiteName) errors.push('Punctul de lucru este obligatoriu.');

    const hireDate = parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 27 })]?.v);
    if (!hireDate) errors.push('Data angajării este obligatorie.');

    const statusRaw = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 28 })).toUpperCase();
    const status = statusRaw === 'PLECAT' ? 'PLECAT' : 'ACTIV';
    const leaveDate = parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 29 })]?.v);

    if (status === 'PLECAT' && !leaveDate) {
      errors.push('Pentru statusul PLECAT este necesară data plecării.');
    }

    const hygieneRequested = getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 30 })).toUpperCase() === 'DA';

    employees.push({
      rowNumber: r + 1,
      lastName,
      firstName,
      sex: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 2 })),
      cnp: cnpRaw,
      birthDate,
      birthPlace: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 5 })),
      birthCounty: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 6 })),
      citizenship: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 7 })) || 'Română',
      docType: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 8 })) || 'CI',
      docSeries: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 9 })),
      docNumber,
      docIssuedBy: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 11 })),
      docIssueDate: parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 12 })]?.v),
      docExpiryDate: parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 13 })]?.v),
      county,
      locality,
      street,
      streetNumber,
      building: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 18 })),
      entrance: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 19 })),
      floor: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 20 })),
      apartment: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 21 })),
      email: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 22 })),
      phone: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 23 })),
      jobTitle,
      worksiteName,
      startDateOnJob: parseExcelDate(sFirm[XLSX.utils.encode_cell({ r, c: 26 })]?.v) || hireDate,
      hireDate,
      status,
      leaveDate,
      hygieneRequested,
      hygieneModule: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 31 })),
      hygienePreferredSession: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 32 })),
      adminNotes: getCellValue(sFirm, XLSX.utils.encode_cell({ r, c: 33 })),
      isValid: errors.length === 0,
      errors,
    });
  }

  // 3. Parsare foaia Context posturi
  const jobContexts: ParsedJobContext[] = [];
  const sheetNameContext = wb.SheetNames.find((s) => s.toLowerCase().includes('context'));
  if (sheetNameContext) {
    const sCtx = wb.Sheets[sheetNameContext];
    const ctxRange = XLSX.utils.decode_range(sCtx['!ref'] || 'A1:I100');
    for (let r = 4; r <= ctxRange.e.r; r++) {
      const worksiteName = getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 0 }));
      const worksiteAddress = getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 1 }));
      const jobTitle = getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 3 }));

      if (!worksiteName && !jobTitle) continue;

      jobContexts.push({
        worksiteName,
        worksiteAddress,
        worksiteActivity: getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 2 })),
        jobTitle,
        corCode: getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 4 })),
        mainActivities: getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 5 })),
        equipmentUsed: getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 6 })),
        workConditions: getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 7 })),
        workersCount: parseInt(getCellValue(sCtx, XLSX.utils.encode_cell({ r, c: 8 })), 10) || undefined,
      });
    }
  }

  return { company, employees, jobContexts };
}

/**
 * Comparare fișier importat cu baza de date pentru generare Preview & Diff
 */
export async function compareWithDatabase(
  clientId: string,
  parsedData: ParsedWorkbook
): Promise<ImportPreviewReport> {
  const existingEmployees = await prisma.employee.findMany({
    where: { clientId },
    include: {
      identityDocument: true,
      residenceAddress: true,
      currentJob: true,
      currentWorksite: true,
    },
  });

  const existingWorksites = await prisma.worksite.findMany({
    where: { clientId },
    select: { name: true },
  });
  const existingWorksitesSet = new Set(existingWorksites.map((w) => w.name.toLowerCase()));

  const existingJobs = await prisma.job.findMany({
    where: { clientId },
    select: { title: true },
  });
  const existingJobsSet = new Set(existingJobs.map((j) => j.title.toLowerCase()));

  const empByCNP = new Map<string, (typeof existingEmployees)[0]>();
  for (const emp of existingEmployees) {
    empByCNP.set(emp.cnp, emp);
  }

  const items: ImportPreviewItem[] = [];
  const newWorksitesSet = new Set<string>();
  const newJobsSet = new Set<string>();

  let newCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;
  let errorCount = 0;
  let ambiguousCount = 0;

  for (const emp of parsedData.employees) {
    if (!existingWorksitesSet.has(emp.worksiteName.toLowerCase())) {
      newWorksitesSet.add(emp.worksiteName);
    }
    if (!existingJobsSet.has(emp.jobTitle.toLowerCase())) {
      newJobsSet.add(emp.jobTitle);
    }

    if (!emp.isValid) {
      errorCount++;
      items.push({
        rowNumber: emp.rowNumber,
        cnpMasked: maskCNP(emp.cnp),
        name: `${emp.lastName} ${emp.firstName}`,
        jobTitle: emp.jobTitle,
        worksiteName: emp.worksiteName,
        status: 'ERROR',
        errors: emp.errors,
        changes: [],
        employeeData: emp,
      });
      continue;
    }

    const existing = empByCNP.get(emp.cnp);
    if (!existing) {
      // Persoană nouă
      newCount++;
      items.push({
        rowNumber: emp.rowNumber,
        cnpMasked: maskCNP(emp.cnp),
        name: `${emp.lastName} ${emp.firstName}`,
        jobTitle: emp.jobTitle,
        worksiteName: emp.worksiteName,
        status: 'NEW',
        errors: [],
        changes: [],
        employeeData: emp,
      });
    } else {
      // Persoană existentă - calculăm diferențele pe câmpuri
      const changes: { field: string; oldVal: string; newVal: string }[] = [];

      if (existing.lastName !== emp.lastName) {
        changes.push({ field: 'Nume', oldVal: existing.lastName, newVal: emp.lastName });
      }
      if (existing.firstName !== emp.firstName) {
        changes.push({ field: 'Prenume', oldVal: existing.firstName, newVal: emp.firstName });
      }
      if (existing.currentJob?.title !== emp.jobTitle) {
        changes.push({ field: 'Funcție / post', oldVal: existing.currentJob?.title || '—', newVal: emp.jobTitle });
      }
      if (existing.currentWorksite?.name !== emp.worksiteName) {
        changes.push({ field: 'Punct de lucru', oldVal: existing.currentWorksite?.name || '—', newVal: emp.worksiteName });
      }
      if (existing.status !== emp.status) {
        changes.push({ field: 'Status', oldVal: existing.status, newVal: emp.status });
      }
      if (existing.residenceAddress) {
        const addr = existing.residenceAddress;
        if (addr.street !== emp.street || addr.number !== emp.streetNumber) {
          changes.push({
            field: 'Adresă domiciliu',
            oldVal: `${addr.street} nr. ${addr.number}`,
            newVal: `${emp.street} nr. ${emp.streetNumber}`,
          });
        }
      }
      if (existing.identityDocument) {
        const doc = existing.identityDocument;
        if (doc.number !== emp.docNumber) {
          changes.push({
            field: 'Număr act identitate',
            oldVal: doc.number,
            newVal: emp.docNumber,
          });
        }
      }

      if (changes.length > 0) {
        modifiedCount++;
        items.push({
          rowNumber: emp.rowNumber,
          cnpMasked: maskCNP(emp.cnp),
          name: `${emp.lastName} ${emp.firstName}`,
          jobTitle: emp.jobTitle,
          worksiteName: emp.worksiteName,
          status: 'MODIFIED',
          errors: [],
          changes,
          employeeData: emp,
        });
      } else {
        unchangedCount++;
        items.push({
          rowNumber: emp.rowNumber,
          cnpMasked: maskCNP(emp.cnp),
          name: `${emp.lastName} ${emp.firstName}`,
          jobTitle: emp.jobTitle,
          worksiteName: emp.worksiteName,
          status: 'UNCHANGED',
          errors: [],
          changes: [],
          employeeData: emp,
        });
      }
    }
  }

  return {
    company: parsedData.company,
    summary: {
      totalRows: parsedData.employees.length,
      newCount,
      modifiedCount,
      unchangedCount,
      errorCount,
      ambiguousCount,
    },
    newWorksites: Array.from(newWorksitesSet),
    newJobs: Array.from(newJobsSet),
    items,
  };
}

/**
 * Salvarea efectivă a importului confirmat în baza de date
 */
export async function commitImport(
  clientId: string,
  parsedData: ParsedWorkbook,
  operatorName: string,
  filename: string
): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // 1. Actualizare metadate firmă dacă s-au specificat în Excel
    if (parsedData.company.name || parsedData.company.address) {
      await tx.client.update({
        where: { id: clientId },
        data: {
          name: parsedData.company.name || undefined,
          address: parsedData.company.address || undefined,
          regCom: parsedData.company.regCom || undefined,
          legalRepresentative: parsedData.company.legalRepresentative || undefined,
          contactPerson: parsedData.company.contactPerson || undefined,
          contactEmail: parsedData.company.contactEmail || undefined,
          contactPhone: parsedData.company.contactPhone || undefined,
        },
      });
    }

    // 2. Creare/actualizare Puncte de lucru
    const worksiteMap = new Map<string, string>(); // name -> id
    const allWorksites = await tx.worksite.findMany({ where: { clientId } });
    for (const w of allWorksites) {
      worksiteMap.set(w.name.toLowerCase(), w.id);
    }

    // Din context posturi
    for (const ctx of parsedData.jobContexts) {
      if (ctx.worksiteName && !worksiteMap.has(ctx.worksiteName.toLowerCase())) {
        const newW = await tx.worksite.create({
          data: {
            clientId,
            name: ctx.worksiteName,
            address: ctx.worksiteAddress || 'Conform contract',
            activity: ctx.worksiteActivity,
          },
        });
        worksiteMap.set(ctx.worksiteName.toLowerCase(), newW.id);
      }
    }

    // Din lista de angajați
    for (const emp of parsedData.employees) {
      if (emp.worksiteName && !worksiteMap.has(emp.worksiteName.toLowerCase())) {
        const newW = await tx.worksite.create({
          data: {
            clientId,
            name: emp.worksiteName,
            address: 'Conform contract / nespecificat',
          },
        });
        worksiteMap.set(emp.worksiteName.toLowerCase(), newW.id);
      }
    }

    // 3. Creare/actualizare Posturi
    const jobMap = new Map<string, string>(); // title -> id
    const allJobs = await tx.job.findMany({ where: { clientId } });
    for (const j of allJobs) {
      jobMap.set(j.title.toLowerCase(), j.id);
    }

    for (const ctx of parsedData.jobContexts) {
      if (ctx.jobTitle && !jobMap.has(ctx.jobTitle.toLowerCase())) {
        const newJ = await tx.job.create({
          data: {
            clientId,
            title: ctx.jobTitle,
            corCode: ctx.corCode,
            mainActivities: ctx.mainActivities,
            equipmentUsed: ctx.equipmentUsed,
            workConditions: ctx.workConditions,
            workersCount: ctx.workersCount,
          },
        });
        jobMap.set(ctx.jobTitle.toLowerCase(), newJ.id);
      }
    }

    for (const emp of parsedData.employees) {
      if (emp.jobTitle && !jobMap.has(emp.jobTitle.toLowerCase())) {
        const newJ = await tx.job.create({
          data: {
            clientId,
            title: emp.jobTitle,
          },
        });
        jobMap.set(emp.jobTitle.toLowerCase(), newJ.id);
      }
    }

    // 4. Salvare / Actualizare angajați
    let newCount = 0;
    let updatedCount = 0;

    for (const emp of parsedData.employees) {
      if (!emp.isValid) continue; // Rândurile invalide nu se importă

      const worksiteId = worksiteMap.get(emp.worksiteName.toLowerCase());
      const jobId = jobMap.get(emp.jobTitle.toLowerCase());

      const existing = await tx.employee.findUnique({
        where: {
          clientId_cnp: {
            clientId,
            cnp: emp.cnp,
          },
        },
        include: {
          identityDocument: true,
          residenceAddress: true,
        },
      });

      if (!existing) {
        // Angajat nou
        const newEmp = await tx.employee.create({
          data: {
            clientId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            sex: emp.sex,
            cnp: emp.cnp,
            birthDate: emp.birthDate,
            birthPlace: emp.birthPlace,
            birthCounty: emp.birthCounty,
            citizenship: emp.citizenship,
            email: emp.email,
            phone: emp.phone,
            currentJobId: jobId,
            currentWorksiteId: worksiteId,
            hireDate: emp.hireDate,
            startDateOnJob: emp.startDateOnJob,
            status: emp.status,
            leaveDate: emp.leaveDate,
            hygieneRequested: emp.hygieneRequested,
            hygieneModule: emp.hygieneModule,
            hygienePreferredSession: emp.hygienePreferredSession,
            adminNotes: emp.adminNotes,
          },
        });

        // Act identitate
        await tx.identityDocument.create({
          data: {
            employeeId: newEmp.id,
            docType: emp.docType,
            series: emp.docSeries,
            number: emp.docNumber,
            issuedBy: emp.docIssuedBy,
            issueDate: emp.docIssueDate,
            expiryDate: emp.docExpiryDate,
          },
        });

        // Domiciliu
        await tx.residenceAddress.create({
          data: {
            employeeId: newEmp.id,
            county: emp.county,
            locality: emp.locality,
            street: emp.street,
            number: emp.streetNumber,
            building: emp.building,
            entrance: emp.entrance,
            floor: emp.floor,
            apartment: emp.apartment,
            postalCode: emp.postalCode,
          },
        });

        // Istoric încadrare inițial
        await tx.employmentHistory.create({
          data: {
            employeeId: newEmp.id,
            jobId,
            worksiteId,
            validFrom: emp.startDateOnJob || emp.hireDate || new Date(),
          },
        });

        newCount++;
      } else {
        // Angajat existent - verificare dacă s-a schimbat jobul sau punctul de lucru
        const jobChanged = existing.currentJobId !== jobId || existing.currentWorksiteId !== worksiteId;

        await tx.employee.update({
          where: { id: existing.id },
          data: {
            firstName: emp.firstName,
            lastName: emp.lastName,
            sex: emp.sex,
            birthDate: emp.birthDate,
            birthPlace: emp.birthPlace,
            birthCounty: emp.birthCounty,
            citizenship: emp.citizenship,
            email: emp.email,
            phone: emp.phone,
            currentJobId: jobId,
            currentWorksiteId: worksiteId,
            hireDate: emp.hireDate,
            startDateOnJob: emp.startDateOnJob,
            status: emp.status,
            leaveDate: emp.leaveDate,
            hygieneRequested: emp.hygieneRequested,
            hygieneModule: emp.hygieneModule,
            hygienePreferredSession: emp.hygienePreferredSession,
            adminNotes: emp.adminNotes,
          },
        });

        // Actualizare sau creare act identitate
        if (existing.identityDocument) {
          await tx.identityDocument.update({
            where: { employeeId: existing.id },
            data: {
              docType: emp.docType,
              series: emp.docSeries,
              number: emp.docNumber,
              issuedBy: emp.docIssuedBy,
              issueDate: emp.docIssueDate,
              expiryDate: emp.docExpiryDate,
            },
          });
        } else {
          await tx.identityDocument.create({
            data: {
              employeeId: existing.id,
              docType: emp.docType,
              series: emp.docSeries,
              number: emp.docNumber,
              issuedBy: emp.docIssuedBy,
              issueDate: emp.docIssueDate,
              expiryDate: emp.docExpiryDate,
            },
          });
        }

        // Actualizare domiciliu
        if (existing.residenceAddress) {
          await tx.residenceAddress.update({
            where: { employeeId: existing.id },
            data: {
              county: emp.county,
              locality: emp.locality,
              street: emp.street,
              number: emp.streetNumber,
              building: emp.building,
              entrance: emp.entrance,
              floor: emp.floor,
              apartment: emp.apartment,
              postalCode: emp.postalCode,
            },
          });
        } else {
          await tx.residenceAddress.create({
            data: {
              employeeId: existing.id,
              county: emp.county,
              locality: emp.locality,
              street: emp.street,
              number: emp.streetNumber,
              building: emp.building,
              entrance: emp.entrance,
              floor: emp.floor,
              apartment: emp.apartment,
              postalCode: emp.postalCode,
            },
          });
        }

        // Dacă s-a schimbat postul sau punctul de lucru, închidem perioada veche și deschidem una nouă
        if (jobChanged) {
          const now = new Date();
          // Închidem perioada anterioară
          await tx.employmentHistory.updateMany({
            where: {
              employeeId: existing.id,
              validTo: null,
            },
            data: { validTo: now },
          });

          // Deschidem noua perioadă
          await tx.employmentHistory.create({
            data: {
              employeeId: existing.id,
              jobId,
              worksiteId,
              validFrom: emp.startDateOnJob || now,
            },
          });
        }

        updatedCount++;
      }
    }

    // 5. Creare ImportBatch
    const batch = await tx.importBatch.create({
      data: {
        clientId,
        filename,
        schemaVersion: '1.0',
        rowCount: parsedData.employees.length,
        newCount,
        updatedCount,
        errorCount: parsedData.employees.filter((e) => !e.isValid).length,
        status: 'confirmed',
        operatorName,
      },
    });

    // 6. Logare AuditEvent (fără CNP!)
    await logAuditEvent({
      actorName: operatorName,
      action: 'import',
      entityType: 'ImportBatch',
      entityId: batch.id,
      details: {
        clientId,
        filename,
        totalRows: parsedData.employees.length,
        newCount,
        updatedCount,
      },
    });

    return batch.id;
  });
}
