import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string; participantId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, participantId } = await params;
    const participant = await prisma.hygieneParticipant.findFirst({
      where: { id: participantId, sessionId: id },
      include: {
        employee: true,
        session: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Cursantul nu a fost găsit în această sesiune.' },
        { status: 404 }
      );
    }

    return NextResponse.json(participant);
  } catch (error: unknown) {
    console.error('Error fetching hygiene participant:', error);
    return NextResponse.json(
      { error: 'Eroare la preluarea datelor cursantului.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId, participantId } = await params;
    const body = await request.json();

    const participant = await prisma.hygieneParticipant.findFirst({
      where: { id: participantId, sessionId },
      include: { session: true },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participantul nu a fost găsit în această sesiune.' },
        { status: 404 }
      );
    }

    const {
      attendance,
      examGrade,
      examResult,
      certificateSeries,
      certificateNumber,
      certificateDate,
      hygieneModule,
      diplomaDelivered,
      diplomaDeliveredDate,
    } = body;

    // Validare prezență
    if (attendance !== undefined && !['prezent', 'absent'].includes(attendance)) {
      return NextResponse.json(
        { error: 'Prezența trebuie să fie "prezent" sau "absent".' },
        { status: 400 }
      );
    }

    // Validare rezultat examen
    if (examResult !== undefined && !['admis', 'respins'].includes(examResult)) {
      return NextResponse.json(
        { error: 'Rezultatul examenului trebuie să fie "admis" sau "respins".' },
        { status: 400 }
      );
    }

    // Validare notă examen (HG / Ordin MS 2209/2022: scală 1 - 10)
    let parsedGrade: number | null = undefined as unknown as null;
    if (examGrade !== undefined && examGrade !== null && examGrade !== '') {
      const numGrade = Number(examGrade);
      if (isNaN(numGrade) || numGrade < 1 || numGrade > 10) {
        return NextResponse.json(
          { error: 'Nota la examen trebuie să fie un număr valid între 1.0 și 10.0.' },
          { status: 400 }
        );
      }
      parsedGrade = numGrade;
    } else if (examGrade === null || examGrade === '') {
      parsedGrade = null;
    }

    // Reguli statutare de corelare prezență / rezultat / certificat:
    const effectiveAttendance = attendance !== undefined ? attendance : participant.attendance;
    let effectiveResult = examResult !== undefined ? examResult : participant.examResult;
    let effectiveGrade = parsedGrade !== undefined ? parsedGrade : participant.examGrade;
    let effectiveSeries = certificateSeries !== undefined ? certificateSeries?.trim() || null : participant.certificateSeries;
    let effectiveNumber = certificateNumber !== undefined ? certificateNumber?.trim() || null : participant.certificateNumber;
    let effectiveDate = certificateDate !== undefined
      ? (certificateDate ? new Date(certificateDate) : null)
      : participant.certificateDate;

    let effectiveDiplomaDelivered = participant.diplomaDelivered;
    let effectiveDiplomaDeliveredDate = participant.diplomaDeliveredDate;

    if (diplomaDelivered !== undefined) {
      effectiveDiplomaDelivered = Boolean(diplomaDelivered);
      if (effectiveDiplomaDelivered) {
        effectiveDiplomaDeliveredDate = diplomaDeliveredDate
          ? new Date(diplomaDeliveredDate)
          : (participant.diplomaDeliveredDate || new Date());
      } else {
        effectiveDiplomaDeliveredDate = null;
      }
    } else if (diplomaDeliveredDate !== undefined) {
      effectiveDiplomaDeliveredDate = diplomaDeliveredDate ? new Date(diplomaDeliveredDate) : null;
      effectiveDiplomaDelivered = Boolean(effectiveDiplomaDeliveredDate);
    }

    if (effectiveAttendance === 'absent') {
      // Un cursant absent nu poate avea notă de trecere și este respins automat; certificatele sunt anulate
      effectiveGrade = null;
      effectiveResult = 'respins';
      effectiveSeries = null;
      effectiveNumber = null;
      effectiveDate = null;
      effectiveDiplomaDelivered = false;
      effectiveDiplomaDeliveredDate = null;
    } else if (effectiveResult === 'respins') {
      // Un cursant respins nu primește certificat
      effectiveSeries = null;
      effectiveNumber = null;
      effectiveDate = null;
      effectiveDiplomaDelivered = false;
      effectiveDiplomaDeliveredDate = null;
    }

    // Actualizare participant
    const updated = await prisma.hygieneParticipant.update({
      where: { id: participantId },
      data: {
        attendance: effectiveAttendance,
        examGrade: effectiveGrade,
        examResult: effectiveResult,
        certificateSeries: effectiveSeries,
        certificateNumber: effectiveNumber,
        certificateDate: effectiveDate,
        ...(hygieneModule !== undefined ? { hygieneModule: hygieneModule ? String(hygieneModule).trim() : null } : {}),
        diplomaDelivered: effectiveDiplomaDelivered,
        diplomaDeliveredDate: effectiveDiplomaDeliveredDate,
      },
      include: {
        session: true,
      },
    });

    // Sincronizare automată în fișa salariatului dacă acesta este asociat cu un Employee
    if (updated.employeeId && updated.examResult === 'admis') {
      const fullCertNumber = updated.certificateNumber || null;
      const certIssueDate = updated.certificateDate || updated.session.examDate || updated.session.sessionDate;
      const examDate = updated.session.examDate || certIssueDate;
      const moduleName = updated.hygieneModule || updated.session.hygieneModule || 'Modulul 1 - Servicii de alimentație publică și colectivă';

      if (examDate) {
        await prisma.employeeHygieneModule.upsert({
          where: {
            employeeId_moduleName: {
              employeeId: updated.employeeId,
              moduleName: moduleName.trim(),
            },
          },
          update: {
            certificateNumber: fullCertNumber || undefined,
            examDate: examDate,
            issueDate: certIssueDate || undefined,
            intervalMonths: 36,
          },
          create: {
            employeeId: updated.employeeId,
            moduleName: moduleName.trim(),
            certificateNumber: fullCertNumber || null,
            examDate: examDate,
            issueDate: certIssueDate || null,
            intervalMonths: 36,
          },
        });
      }

      await prisma.employee.update({
        where: { id: updated.employeeId },
        data: {
          hygieneLastExamDate: examDate,
          ...(fullCertNumber ? { hygieneCertificateNumber: fullCertNumber } : {}),
          ...(certIssueDate ? { hygieneCertificateIssueDate: certIssueDate } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      participant: updated,
    });
  } catch (error: unknown) {
    console.error('Error updating hygiene participant:', error);
    return NextResponse.json(
      { error: 'Eroare la salvarea datelor participantului.' },
      { status: 500 }
    );
  }
}
