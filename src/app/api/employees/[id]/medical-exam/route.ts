import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance } from '@/lib/compliance';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      examDate,
      intervalMonths,
      verdict,
      fitnessVerdict,
      restrictions,
      notes,
      clinicName,
      physicianName,
      doctorName,
      operatorName = 'Operator SSM',
    } = body as {
      examDate?: string | Date;
      intervalMonths?: number;
      verdict?: string;
      fitnessVerdict?: string;
      restrictions?: string;
      notes?: string;
      clinicName?: string;
      physicianName?: string;
      doctorName?: string;
      operatorName?: string;
    };

    // 1. Employee existence check
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Salariatul nu a fost găsit.' },
        { status: 404 }
      );
    }

    if (employee.status === 'PLECAT') {
      return NextResponse.json(
        { error: 'Nu se poate înregistra examen medical pentru un salariat cu contract de muncă încetat (status PLECAT).' },
        { status: 400 }
      );
    }

    // 2. Verdict validation (HG 355/2007)
    const rawVerdict = (fitnessVerdict || verdict || '').trim().toUpperCase();
    const ALLOWED_VERDICTS = ['APT', 'APT_CONDITIONAT', 'INAPT_TEMPORAR', 'INAPT'];
    if (!ALLOWED_VERDICTS.includes(rawVerdict)) {
      return NextResponse.json(
        { error: 'Verdict de aptitudine invalid conform HG 355/2007' },
        { status: 400 }
      );
    }

    // 3. Exam date validation
    if (!examDate) {
      return NextResponse.json(
        { error: 'Data examenului este obligatorie' },
        { status: 400 }
      );
    }
    const parsedExamDate = new Date(examDate);
    const isDatePattern = typeof examDate === 'string'
      ? (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(examDate) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(examDate))
      : true;
    if (isNaN(parsedExamDate.getTime()) || !isDatePattern) {
      return NextResponse.json(
        { error: 'Data examenului este invalidă' },
        { status: 400 }
      );
    }

    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 1);
    if (parsedExamDate > maxFuture) {
      return NextResponse.json(
        { error: 'Data examenului nu poate fi în viitorul îndepărtat' },
        { status: 400 }
      );
    }

    // 4. Interval validation
    const parsedInterval = intervalMonths !== undefined && intervalMonths !== null ? Number(intervalMonths) : 12;
    if (isNaN(parsedInterval) || parsedInterval <= 0) {
      return NextResponse.json(
        { error: 'Intervalul de examinare trebuie să fie pozitiv' },
        { status: 400 }
      );
    }

    // 5. Notes & metadata resolution
    const cleanNotes = (notes !== undefined ? notes : restrictions) || null;
    let finalNotes: string | null = cleanNotes;
    const finalClinic = (clinicName || '').trim();
    const finalDoctor = (physicianName || doctorName || '').trim();

    if (!finalNotes && (finalClinic || finalDoctor)) {
      const metaParts: string[] = [];
      if (finalClinic) metaParts.push(`Clinica: ${finalClinic}`);
      if (finalDoctor) metaParts.push(`Medic: ${finalDoctor}`);
      finalNotes = `[${metaParts.join(', ')}]`;
    }

    // 6. Database update: only update medicalLastExamDate if newer or equal
    const isNewerOrEqual =
      !employee.medicalLastExamDate || parsedExamDate >= employee.medicalLastExamDate;

    const historicalNote = !isNewerOrEqual
      ? (employee.medicalNotes
          ? `${employee.medicalNotes} | [Istoric ${parsedExamDate.toISOString().split('T')[0]}: ${rawVerdict}${finalNotes ? ` - ${finalNotes}` : ''}]`
          : `[Istoric ${parsedExamDate.toISOString().split('T')[0]}: ${rawVerdict}${finalNotes ? ` - ${finalNotes}` : ''}]`)
      : finalNotes;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        ...(isNewerOrEqual
          ? {
              medicalLastExamDate: parsedExamDate,
              medicalIntervalMonths: parsedInterval,
              medicalFitnessVerdict: rawVerdict,
              medicalNotes: finalNotes,
            }
          : {
              medicalNotes: historicalNote,
            }),
      },
      include: {
        client: true,
        currentJob: true,
        currentWorksite: true,
        identityDocument: true,
      },
    });

    // 7. Audit log event
    await prisma.auditEvent.create({
      data: {
        actorName: (operatorName || 'Operator SSM').trim(),
        action: 'MEDICAL_EXAM_RECORDED',
        entityType: 'Employee',
        entityId: id,
        details: JSON.stringify({
          examDate: parsedExamDate.toISOString(),
          intervalMonths: parsedInterval,
          verdict: rawVerdict,
          restrictions: cleanNotes,
          clinicName: finalClinic || null,
          physicianName: finalDoctor || null,
        }),
      },
    });

    // 8. Compliance recalculation
    const compliance = calculateEmployeeCompliance(updatedEmployee);

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      compliance,
    });
  } catch (error) {
    console.error('Eroare la înregistrarea examenului medical:', error);
    return NextResponse.json(
      { error: 'Eroare internă de server la salvarea examenului medical.' },
      { status: 500 }
    );
  }
}
