import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from './prisma';

export function formatDmy(val?: Date | string | null): string {
  if (!val) return '';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}.${month}.${year}`;
}

function setCell(
  sheet: XLSX.WorkSheet,
  r: number,
  c: number,
  val: unknown,
  type: XLSX.ExcelDataType = 's'
) {
  const ref = XLSX.utils.encode_cell({ r, c });
  if (val === undefined || val === null || val === '') {
    sheet[ref] = { t: 's', v: '' };
  } else if (typeof val === 'number') {
    sheet[ref] = { t: 'n', v: val };
  } else {
    sheet[ref] = { t: type, v: String(val) };
  }
}

export interface ClientExportResult {
  filename: string;
  buffer: Buffer;
  clientName: string;
  employeesCount: number;
}

/**
 * Exportă dosarul complet al unei firme (date firmă, toți angajații cu date extinse,
 * acte de identitate, domiciliu, posturi, puncte de lucru, cursuri igienă și context).
 * Registrul generat respectă 100% schema `Model_date_client_SSM.xlsx` și poate fi reimportat oricând.
 */
export async function exportClientToExcel(clientId: string): Promise<ClientExportResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      worksites: { orderBy: { name: 'asc' } },
      jobs: { orderBy: { title: 'asc' } },
      employees: {
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error(`Clientul cu ID-ul ${clientId} nu a fost găsit.`);
  }

  // 1. Încarcă șablonul de bază dacă există pentru a păstra instrucțiunile, stilurile și structura
  const templatePath = path.join(
    process.cwd(),
    'outputs',
    'ssm-client-template',
    'Model_date_client_SSM.xlsx'
  );

  let wb: XLSX.WorkBook;
  if (fs.existsSync(templatePath)) {
    const fileBuffer = fs.readFileSync(templatePath);
    wb = XLSX.read(fileBuffer, { type: 'buffer' });
  } else {
    // Fallback: crează workbook nou
    wb = XLSX.utils.book_new();
    const sFirm = XLSX.utils.aoa_to_sheet([]);
    const sCtx = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, sFirm, 'Firmă și angajați');
    XLSX.utils.book_append_sheet(wb, sCtx, 'Context posturi');
  }

  // 2. Foaia "Firmă și angajați"
  const sheetNameFirm = wb.SheetNames.find((s) => s.toLowerCase().includes('firm')) || 'Firmă și angajați';
  const sFirm = wb.Sheets[sheetNameFirm];

  // Metadate firmă (B5:B8, E5:E8)
  sFirm['B5'] = { t: 's', v: client.name || '' };
  sFirm['B6'] = { t: 's', v: client.cui || '' };
  sFirm['B7'] = { t: 's', v: client.regCom || '' };
  sFirm['B8'] = { t: 's', v: client.address || '' };

  sFirm['E5'] = { t: 's', v: client.legalRepresentative || '' };
  sFirm['E6'] = { t: 's', v: client.contactPerson || '' };
  sFirm['E7'] = { t: 's', v: client.contactEmail || '' };
  sFirm['E8'] = { t: 's', v: client.contactPhone || '' };

  // Curăță celulele din rândurile vechi de angajați (r >= 12)
  const existingRange = XLSX.utils.decode_range(sFirm['!ref'] || 'A1:AH250');
  for (let r = 12; r <= existingRange.e.r; r++) {
    for (let c = 0; c <= 33; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      delete sFirm[ref];
    }
  }

  // Scrie angajații curenți începând de la rândul 13 (r = 12)
  client.employees.forEach((emp, i) => {
    const r = 12 + i;
    setCell(sFirm, r, 0, emp.lastName);
    setCell(sFirm, r, 1, emp.firstName);
    setCell(sFirm, r, 2, emp.sex || '');
    setCell(sFirm, r, 3, emp.cnp);
    setCell(sFirm, r, 4, formatDmy(emp.birthDate));
    setCell(sFirm, r, 5, emp.birthPlace || '');
    setCell(sFirm, r, 6, emp.birthCounty || '');
    setCell(sFirm, r, 7, emp.citizenship || 'Română');
    setCell(sFirm, r, 8, emp.identityDocument?.docType || 'CI');
    setCell(sFirm, r, 9, emp.identityDocument?.series || '');
    setCell(sFirm, r, 10, emp.identityDocument?.number || '');
    setCell(sFirm, r, 11, emp.identityDocument?.issuedBy || '');
    setCell(sFirm, r, 12, formatDmy(emp.identityDocument?.issueDate));
    setCell(sFirm, r, 13, formatDmy(emp.identityDocument?.expiryDate));
    setCell(sFirm, r, 14, emp.residenceAddress?.county || '');
    setCell(sFirm, r, 15, emp.residenceAddress?.locality || '');
    setCell(sFirm, r, 16, emp.residenceAddress?.street || '');
    setCell(sFirm, r, 17, emp.residenceAddress?.number || '');
    setCell(sFirm, r, 18, emp.residenceAddress?.building || '');
    setCell(sFirm, r, 19, emp.residenceAddress?.entrance || '');
    setCell(sFirm, r, 20, emp.residenceAddress?.floor || '');
    setCell(sFirm, r, 21, emp.residenceAddress?.apartment || '');
    setCell(sFirm, r, 22, emp.email || '');
    setCell(sFirm, r, 23, emp.phone || '');
    setCell(sFirm, r, 24, emp.currentJob?.title || '');
    setCell(sFirm, r, 25, emp.currentWorksite?.name || '');
    setCell(sFirm, r, 26, formatDmy(emp.startDateOnJob || emp.hireDate));
    setCell(sFirm, r, 27, formatDmy(emp.hireDate));
    setCell(sFirm, r, 28, emp.status || 'ACTIV');
    setCell(sFirm, r, 29, formatDmy(emp.leaveDate));
    setCell(sFirm, r, 30, emp.hygieneRequested ? 'DA' : 'NU');
    setCell(sFirm, r, 31, emp.hygieneModule || '');
    setCell(sFirm, r, 32, emp.hygienePreferredSession || '');
    setCell(sFirm, r, 33, emp.adminNotes || '');
  });

  const lastFirmRow = Math.max(12, 11 + client.employees.length);
  sFirm['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastFirmRow, c: 33 },
  });

  // 3. Foaia "Context posturi"
  const sheetNameContext = wb.SheetNames.find((s) => s.toLowerCase().includes('context'));
  if (sheetNameContext) {
    const sCtx = wb.Sheets[sheetNameContext];
    const ctxRange = XLSX.utils.decode_range(sCtx['!ref'] || 'A1:I100');

    // Curăță celulele din rândurile vechi de context (r >= 4)
    for (let r = 4; r <= ctxRange.e.r; r++) {
      for (let c = 0; c <= 8; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        delete sCtx[ref];
      }
    }

    // Construiește perechi unice punct de lucru + post
    interface ContextRowData {
      worksiteName: string;
      worksiteAddress: string;
      worksiteActivity: string;
      jobTitle: string;
      corCode: string;
      mainActivities: string;
      equipmentUsed: string;
      workConditions: string;
      workersCount?: number | null;
    }

    const contextMap = new Map<string, ContextRowData>();

    // a) Din asocierile active ale angajaților
    for (const emp of client.employees) {
      const worksite = emp.currentWorksite || client.worksites[0];
      const job = emp.currentJob || client.jobs[0];
      if (worksite && job) {
        const key = `${worksite.name.toLowerCase()}:::${job.title.toLowerCase()}`;
        if (!contextMap.has(key)) {
          contextMap.set(key, {
            worksiteName: worksite.name,
            worksiteAddress: worksite.address,
            worksiteActivity: worksite.activity || '',
            jobTitle: job.title,
            corCode: job.corCode || '',
            mainActivities: job.mainActivities || '',
            equipmentUsed: job.equipmentUsed || '',
            workConditions: job.workConditions || '',
            workersCount: job.workersCount,
          });
        }
      }
    }

    // b) Adaugă orice posturi sau puncte de lucru suplimentare din firmă
    for (const job of client.jobs) {
      const existing = [...contextMap.values()].find((c) => c.jobTitle.toLowerCase() === job.title.toLowerCase());
      if (!existing) {
        const defaultWorksite = client.worksites[0] || {
          name: 'Sediul Central',
          address: client.address,
          activity: 'Activități generale',
        };
        const key = `${defaultWorksite.name.toLowerCase()}:::${job.title.toLowerCase()}`;
        contextMap.set(key, {
          worksiteName: defaultWorksite.name,
          worksiteAddress: defaultWorksite.address,
          worksiteActivity: defaultWorksite.activity || '',
          jobTitle: job.title,
          corCode: job.corCode || '',
          mainActivities: job.mainActivities || '',
          equipmentUsed: job.equipmentUsed || '',
          workConditions: job.workConditions || '',
          workersCount: job.workersCount,
        });
      }
    }

    // Scrie rândurile de context începând de la rândul 5 (r = 4)
    let ctxIdx = 0;
    for (const row of contextMap.values()) {
      const r = 4 + ctxIdx;
      setCell(sCtx, r, 0, row.worksiteName);
      setCell(sCtx, r, 1, row.worksiteAddress);
      setCell(sCtx, r, 2, row.worksiteActivity);
      setCell(sCtx, r, 3, row.jobTitle);
      setCell(sCtx, r, 4, row.corCode);
      setCell(sCtx, r, 5, row.mainActivities);
      setCell(sCtx, r, 6, row.equipmentUsed);
      setCell(sCtx, r, 7, row.workConditions);
      if (typeof row.workersCount === 'number') {
        setCell(sCtx, r, 8, row.workersCount, 'n');
      } else {
        setCell(sCtx, r, 8, '');
      }
      ctxIdx++;
    }

    const lastCtxRow = Math.max(4, 3 + ctxIdx);
    sCtx['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastCtxRow, c: 8 },
    });
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const safeName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Date_Client_${client.cui}_${safeName}.xlsx`;

  return {
    filename,
    buffer,
    clientName: client.name,
    employeesCount: client.employees.length,
  };
}
