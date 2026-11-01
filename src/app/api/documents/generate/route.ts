import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDocument } from '@/lib/templates/generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateCode, clientId, employeeId, jobId, customFields } = body;

    if (!templateCode || !clientId) {
      return NextResponse.json(
        { error: 'Codul șablonului și clientul sunt obligatorii.' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        jobs: true,
        worksites: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    let employee = null;
    if (employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      });
    }

    // Compilare dicționar de date complet
    const now = new Date();
    const resolvedData: Record<string, unknown> = {
      // Date client
      client_name: client.name,
      cui: client.cui,
      reg_com: client.regCom || '',
      address: client.address,
      legal_rep: client.legalRepresentative || '',
      administrator_name: client.legalRepresentative || 'Administrator',
      contact_person: client.contactPerson || '',
      contact_phone: client.contactPhone || '',
      contact_email: client.contactEmail || '',

      // Meta date
      current_year: now.getFullYear(),
      year: now.getFullYear(),
      date_ro: now.toLocaleDateString('ro-RO'),
      decision_number: '01',
      decision_date: now.toLocaleDateString('ro-RO'),

      // Colecții IPSSM implicite
      instructions: [
        { code: 'IPSSM 01', title: 'Instructajul de Securitate și Sănătate în Muncă' },
        { code: 'IPSSM 02', title: 'Responsabilitățile Personalului' },
        { code: 'IPSSM 03', title: 'Responsabilitățile Conducătorului Locului de Muncă' },
        { code: 'IPSSM 04', title: 'Deplasare Traseu' },
        { code: 'IPSSM 05', title: 'Electrosecuritate' },
        { code: 'IPSSM 06', title: 'Stingerea Incendiilor și Evacuarea Personalului' },
        { code: 'IPSSM 07', title: 'Prim Ajutor' },
        { code: 'IPSSM 08', title: 'Perioade Geroase' },
        { code: 'IPSSM 09', title: 'Perioade Caniculare' },
        { code: 'IPSSM 10', title: 'Comportamentul pe Timp de Furtună' },
        { code: 'IPSSM 11', title: 'Prevenirea Alunecărilor și Împiedicărilor' },
        { code: 'IPSSM 12', title: 'Circulația Autovehiculelor' },
        { code: 'IPSSM 13', title: 'Activități de Birou' },
      ],

      // Date angajat (dacă există)
      ...(employee
        ? {
            employee_name: `${employee.lastName} ${employee.firstName}`,
            last_name: employee.lastName,
            first_name: employee.firstName,
            cnp: employee.cnp,
            job_title: employee.currentJob?.title || 'Salariat',
            worksite_name: employee.currentWorksite?.name || 'Sediu',
            hire_date: employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('ro-RO') : '',
            locality: employee.residenceAddress?.locality || '',
            street: employee.residenceAddress?.street || '',
            street_number: employee.residenceAddress?.number || '',
            building: employee.residenceAddress?.building || '',
            entrance: employee.residenceAddress?.entrance || '',
            floor: employee.residenceAddress?.floor || '',
            apartment: employee.residenceAddress?.apartment || '',
            county: employee.residenceAddress?.county || '',
            address_full: employee.residenceAddress
              ? `${employee.residenceAddress.locality}, Str. ${employee.residenceAddress.street} nr. ${employee.residenceAddress.number}, ${employee.residenceAddress.county}`
              : '',
            doc_series: employee.identityDocument?.series || '',
            doc_number: employee.identityDocument?.number || '',
            doc_issued_by: employee.identityDocument?.issuedBy || 'SPCLEP',
            doc_issue_date: employee.identityDocument?.issueDate
              ? new Date(employee.identityDocument.issueDate).toLocaleDateString('ro-RO')
              : '',
          }
        : {}),

      // Câmpuri specifice personalizate introduse de operator
      ...(customFields || {}),
    };

    const result = await generateDocument({
      templateCode,
      clientId,
      employeeId,
      jobId,
      data: resolvedData,
      operatorName: 'Operator Intern',
    });

    return NextResponse.json({
      success: true,
      result,
      downloadUrl: `/api/documents/${result.documentId}/download`,
    });
  } catch (err: unknown) {
    console.error('Document generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la generarea documentului.' },
      { status: 500 }
    );
  }
}
