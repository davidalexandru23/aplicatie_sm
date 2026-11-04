import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const session = await prisma.hygieneSession.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              cnp: true,
              currentJob: { select: { title: true } },
              hygieneModule: true,
            },
          },
        },
        orderBy: { lastName: 'asc' },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: 'Sesiunea nu a fost găsită.' }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const session = await prisma.hygieneSession.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!session) {
    return NextResponse.json({ error: 'Sesiunea nu a fost găsită.' }, { status: 404 });
  }

  // Status progression: programata → in_desfasurare → finalizata → certificate_emise
  const validTransitions: Record<string, string[]> = {
    programata: ['in_desfasurare'],
    in_desfasurare: ['finalizata'],
    finalizata: ['certificate_emise'],
  };

  const newStatus = body.status as string | undefined;

  if (newStatus) {
    const allowed = validTransitions[session.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Tranziția de la "${session.status}" la "${newStatus}" nu este permisă.` },
        { status: 400 }
      );
    }
  }

  // Build update data (only allow safe fields)
  const updateData: Record<string, unknown> = {};
  if (newStatus) updateData.status = newStatus;
  if (body.commissionPresident !== undefined) updateData.commissionPresident = body.commissionPresident;
  if (body.commissionMember1 !== undefined) updateData.commissionMember1 = body.commissionMember1;
  if (body.commissionMember2 !== undefined) updateData.commissionMember2 = body.commissionMember2;
  if (body.commissionSecretary !== undefined) updateData.commissionSecretary = body.commissionSecretary;
  if (body.pvSeriesNumber !== undefined) updateData.pvSeriesNumber = body.pvSeriesNumber;
  if (body.msAuthorization !== undefined) updateData.msAuthorization = body.msAuthorization;
  if (body.meAuthorization !== undefined) updateData.meAuthorization = body.meAuthorization;

  const updated = await prisma.hygieneSession.update({
    where: { id },
    data: updateData,
    include: { participants: true },
  });

  // When transitioning to "finalizata", update linked employee hygiene records
  if (newStatus === 'finalizata') {
    for (const participant of updated.participants) {
      if (participant.employeeId && participant.examResult.toLowerCase() === 'admis') {
        await prisma.employee.update({
          where: { id: participant.employeeId },
          data: {
            hygieneLastExamDate: updated.examDate,
            hygieneCertificateNumber: participant.certificateNumber || null,
            hygieneCertificateIssueDate: updated.examDate,
            hygieneNotes: `Curs igienă finalizat ${updated.examDate.toLocaleDateString('ro-RO')} — ${participant.examResult} (Nota: ${participant.examGrade ?? 'N/A'})`,
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const session = await prisma.hygieneSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: 'Sesiunea nu a fost găsită.' }, { status: 404 });
  }

  await prisma.hygieneSession.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Sesiunea a fost ștearsă.' });
}
