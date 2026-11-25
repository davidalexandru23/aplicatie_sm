import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseClientWorkbook, compareWithDatabase } from '@/lib/importer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    let clientId = formData.get('clientId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Niciun fișier încărcat.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseClientWorkbook(buffer);

    if (clientId) {
      const selectedClient = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, isActive: true },
      });
      if (!selectedClient || !selectedClient.isActive) {
        return NextResponse.json(
          { error: 'Firma selectată nu a fost găsită sau este dezactivată (arhivată).' },
          { status: 404 }
        );
      }
    }

    // Dacă clientId nu este selectat manual, căutăm după CUI din foaia de calcul
    if (!clientId && parsed.company.cui) {
      const existingClient = await prisma.client.findUnique({
        where: { cui: parsed.company.cui.trim() },
      });
      if (existingClient) {
        if (!existingClient.isActive) {
          return NextResponse.json(
            {
              error: `Firma "${existingClient.name}" (CUI: ${existingClient.cui}) este dezactivată (arhivată) în baza de date. Restaurați-o din Coolify înainte de a importa date noi.`,
            },
            { status: 409 }
          );
        }
        clientId = existingClient.id;
      }
    }

    // Dacă clientul încă nu există în DB, creăm un preview pe un client ipotetic nou
    let previewReport;
    if (clientId) {
      previewReport = await compareWithDatabase(clientId, parsed);
    } else {
      // Client nou
      previewReport = {
        company: parsed.company,
        summary: {
          totalRows: parsed.employees.length,
          newCount: parsed.employees.filter((e) => e.isValid).length,
          modifiedCount: 0,
          unchangedCount: 0,
          errorCount: parsed.employees.filter((e) => !e.isValid).length,
          ambiguousCount: 0,
        },
        newWorksites: Array.from(new Set(parsed.employees.map((e) => e.worksiteName))),
        newJobs: Array.from(new Set(parsed.employees.map((e) => e.jobTitle))),
        items: parsed.employees.map((emp) => ({
          rowNumber: emp.rowNumber,
          cnpMasked: emp.cnp || '—',
          name: `${emp.lastName} ${emp.firstName}`,
          jobTitle: emp.jobTitle,
          worksiteName: emp.worksiteName,
          status: (emp.isValid ? 'NEW' : 'ERROR') as 'NEW' | 'ERROR',
          errors: emp.errors,
          changes: [],
          employeeData: emp,
        })),
      };
    }

    return NextResponse.json({
      success: true,
      clientId,
      filename: file.name,
      parsedData: parsed,
      previewReport,
    });
  } catch (err: unknown) {
    console.error('Import preview error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la parsarea fișierului Excel.' },
      { status: 500 }
    );
  }
}
