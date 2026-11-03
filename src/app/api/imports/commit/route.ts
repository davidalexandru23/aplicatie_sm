import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { commitImport, ParsedWorkbook } from '@/lib/importer';

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

    // Dacă clientul nu există încă în DB, îl creăm din antetul Excelului
    if (!clientId) {
      if (!parsedData.company.cui || !parsedData.company.name) {
        return NextResponse.json(
          { error: 'Denumirea și CUI-ul firmei sunt obligatorii în fișier pentru crearea clientului.' },
          { status: 400 }
        );
      }

      const newClient = await prisma.client.upsert({
        where: { cui: parsedData.company.cui.trim() },
        update: {
          name: parsedData.company.name,
          address: parsedData.company.address || 'Conform registru',
          regCom: parsedData.company.regCom,
          legalRepresentative: parsedData.company.legalRepresentative,
          contactPerson: parsedData.company.contactPerson,
          contactEmail: parsedData.company.contactEmail,
          contactPhone: parsedData.company.contactPhone,
        },
        create: {
          name: parsedData.company.name,
          cui: parsedData.company.cui.trim(),
          address: parsedData.company.address || 'Conform registru',
          regCom: parsedData.company.regCom,
          legalRepresentative: parsedData.company.legalRepresentative,
          contactPerson: parsedData.company.contactPerson,
          contactEmail: parsedData.company.contactEmail,
          contactPhone: parsedData.company.contactPhone,
        },
      });
      clientId = newClient.id;
    }

    // Defensive check: nu permitem commit dacă fișierul nu are niciun rând valid
    if (parsedData.employees.length > 0 && parsedData.employees.every((e) => !e.isValid)) {
      return NextResponse.json(
        { error: 'Niciun rând valid de importat. Toate rândurile conțin erori de validare.' },
        { status: 400 }
      );
    }

    const batchId = await commitImport(
      clientId,
      parsedData,
      operatorName || 'Operator Intern',
      filename || 'Model_date_client_SSM.xlsx'
    );

    return NextResponse.json({
      success: true,
      batchId,
      clientId,
    });
  } catch (err: unknown) {
    console.error('Import commit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la salvarea în baza de date.' },
      { status: 500 }
    );
  }
}
