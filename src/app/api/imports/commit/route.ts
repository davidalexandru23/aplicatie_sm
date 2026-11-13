import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  commitImport,
  compareWithDatabase,
  revalidateParsedWorkbook,
  ParsedWorkbook,
  ImportDiffData,
} from '@/lib/importer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { clientId } = body;
    const { parsedData, filename, operatorName } = body as {
      clientId?: string;
      parsedData: ParsedWorkbook;
      filename: string;
      operatorName?: string;
    };

    if (!parsedData) {
      return NextResponse.json({ error: 'Datele de import lipsesc.' }, { status: 400 });
    }

    // 1. Re-validare strictă server-side (checksum CNP, duplicate intra-lot, câmpuri obligatorii)
    const {
      revalidatedData,
      validationReport,
      hasValidRows,
      totalRows,
    } = revalidateParsedWorkbook(
      parsedData,
      operatorName || 'Operator Intern',
      filename || 'Model_date_client_SSM.xlsx'
    );

    // Defensive check: nu permitem commit dacă fișierul nu are niciun rând valid
    if (totalRows > 0 && !hasValidRows) {
      return NextResponse.json(
        {
          error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.',
          validationReport,
        },
        { status: 400 }
      );
    }

    // 2. Dacă clientul nu există încă în DB, îl creăm din antetul Excelului
    if (!clientId) {
      if (!revalidatedData.company.cui || !revalidatedData.company.name) {
        return NextResponse.json(
          { error: 'Denumirea și CUI-ul firmei sunt obligatorii în fișier pentru crearea clientului.' },
          { status: 400 }
        );
      }

      const newClient = await prisma.client.upsert({
        where: { cui: revalidatedData.company.cui.trim() },
        update: {
          name: revalidatedData.company.name,
          address: revalidatedData.company.address || 'Conform registru',
          regCom: revalidatedData.company.regCom,
          legalRepresentative: revalidatedData.company.legalRepresentative,
          contactPerson: revalidatedData.company.contactPerson,
          contactEmail: revalidatedData.company.contactEmail,
          contactPhone: revalidatedData.company.contactPhone,
        },
        create: {
          name: revalidatedData.company.name,
          cui: revalidatedData.company.cui.trim(),
          address: revalidatedData.company.address || 'Conform registru',
          regCom: revalidatedData.company.regCom,
          legalRepresentative: revalidatedData.company.legalRepresentative,
          contactPerson: revalidatedData.company.contactPerson,
          contactEmail: revalidatedData.company.contactEmail,
          contactPhone: revalidatedData.company.contactPhone,
        },
      });
      clientId = newClient.id;
    }

    // 3. Calcul diferențe reale cu baza de date pentru generarea raportului diff forensic
    const previewReport = await compareWithDatabase(clientId, revalidatedData);

    const diffData: ImportDiffData = {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      clientId,
      summary: previewReport.summary,
      newWorksites: previewReport.newWorksites,
      newJobs: previewReport.newJobs,
      items: previewReport.items.map((it) => ({
        rowNumber: it.rowNumber,
        cnpMasked: it.cnpMasked,
        name: it.name,
        jobTitle: it.jobTitle,
        worksiteName: it.worksiteName,
        status: it.status,
        errors: it.errors,
        changes: it.changes,
      })),
    };

    // 4. Commit atomic cu persistența validationReport și diffData în ImportBatch
    const batchId = await commitImport(
      clientId,
      revalidatedData,
      operatorName || 'Operator Intern',
      filename || 'Model_date_client_SSM.xlsx',
      { validationReport, diffData }
    );

    return NextResponse.json({
      success: true,
      batchId,
      clientId,
      summary: previewReport.summary,
    });
  } catch (err: unknown) {
    console.error('Import commit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la salvarea în baza de date.' },
      { status: 500 }
    );
  }
}
