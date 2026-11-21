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

  // When transitioning to "certificate_emise", automatically allocate sequential certificate numbers (1..X per calendar year)
  if (newStatus === 'certificate_emise') {
    const sessionYear = updated.examDate ? updated.examDate.getFullYear() : new Date().getFullYear();
    const yearStart = new Date(sessionYear, 0, 1);
    const yearEnd = new Date(sessionYear, 11, 31, 23, 59, 59, 999);

    const existingInYear = await prisma.hygieneParticipant.findMany({
      where: {
        certificateNumber: { not: null },
        OR: [
          { certificateDate: { gte: yearStart, lte: yearEnd } },
          { certificateDate: null, session: { examDate: { gte: yearStart, lte: yearEnd } } },
        ],
      },
      select: { certificateNumber: true },
    });

    let maxNum = 0;
    for (const item of existingInYear) {
      if (item.certificateNumber && /^\d+$/.test(item.certificateNumber.trim())) {
        const val = parseInt(item.certificateNumber.trim(), 10);
        if (val > maxNum) maxNum = val;
      }
    }

    for (const participant of updated.participants) {
      if (participant.examResult.toLowerCase() === 'admis' && participant.attendance !== 'absent') {
        let certNum = participant.certificateNumber;
        if (!certNum) {
          maxNum++;
          certNum = String(maxNum);
          await prisma.hygieneParticipant.update({
            where: { id: participant.id },
            data: {
              certificateNumber: certNum,
              certificateDate: updated.examDate,
            },
          });
        }
        if (participant.employeeId) {
          const moduleName = participant.hygieneModule || updated.hygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă';
          await prisma.employeeHygieneModule.upsert({
            where: {
              employeeId_moduleName: {
                employeeId: participant.employeeId,
                moduleName: moduleName.trim(),
              },
            },
            update: {
              certificateNumber: certNum,
              examDate: updated.examDate,
              issueDate: updated.examDate,
              intervalMonths: 36,
            },
            create: {
              employeeId: participant.employeeId,
              moduleName: moduleName.trim(),
              certificateNumber: certNum,
              examDate: updated.examDate,
              issueDate: updated.examDate,
              intervalMonths: 36,
            },
          });

          await prisma.employee.update({
            where: { id: participant.employeeId },
            data: {
              hygieneLastExamDate: updated.examDate,
              hygieneCertificateNumber: certNum,
              hygieneCertificateIssueDate: updated.examDate,
            },
          });
        }
      }
    }
  }

  // When transitioning to "finalizata", update linked employee hygiene records
  if (newStatus === 'finalizata') {
    for (const participant of updated.participants) {
      if (participant.employeeId && participant.examResult.toLowerCase() === 'admis') {
        const moduleName = participant.hygieneModule || updated.hygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă';
        await prisma.employeeHygieneModule.upsert({
          where: {
            employeeId_moduleName: {
              employeeId: participant.employeeId,
              moduleName: moduleName.trim(),
            },
          },
          update: {
            certificateNumber: participant.certificateNumber || null,
            examDate: updated.examDate,
            issueDate: updated.examDate,
            intervalMonths: 36,
          },
          create: {
            employeeId: participant.employeeId,
            moduleName: moduleName.trim(),
            certificateNumber: participant.certificateNumber || null,
            examDate: updated.examDate,
            issueDate: updated.examDate,
            intervalMonths: 36,
          },
        });

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

  const finalUpdated = await prisma.hygieneSession.findUnique({
    where: { id },
    include: { participants: true },
  });

  return NextResponse.json(finalUpdated || updated);
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
