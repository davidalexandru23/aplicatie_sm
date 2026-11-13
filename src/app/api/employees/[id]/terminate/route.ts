import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      leaveDate,
      reason,
      notes,
      operatorName = 'Operator HR',
    } = body as {
      leaveDate?: string | Date;
      reason?: string;
      notes?: string;
      operatorName?: string;
    };

    if (!leaveDate) {
      return NextResponse.json(
        { error: 'Data plecării este obligatorie' },
        { status: 400 }
      );
    }

    const leaveDateObj = new Date(leaveDate);
    if (isNaN(leaveDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Data plecării este invalidă' },
        { status: 400 }
      );
    }

    const emp = await prisma.employee.findUnique({
      where: { id },
    });

    if (!emp) {
      return NextResponse.json(
        { error: 'Salariatul nu a fost găsit' },
        { status: 404 }
      );
    }

    if (emp.status === 'PLECAT') {
      return NextResponse.json(
        { error: 'Contractul salariatului este deja încetat' },
        { status: 400 }
      );
    }

    if (emp.hireDate && leaveDateObj < emp.hireDate) {
      return NextResponse.json(
        { error: 'Data plecării nu poate fi anterioară datei angajării' },
        { status: 400 }
      );
    }

    const terminationNotesParts: string[] = [];
    if (reason?.trim()) terminationNotesParts.push(reason.trim());
    if (notes?.trim()) terminationNotesParts.push(notes.trim());
    const composedNotes = terminationNotesParts.length > 0
      ? `Încetare: ${terminationNotesParts.join(' | ')}`
      : emp.adminNotes;

    const updated = await prisma.$transaction(async (tx) => {
      const e = await tx.employee.update({
        where: { id },
        data: {
          status: 'PLECAT',
          leaveDate: leaveDateObj,
          adminNotes: composedNotes,
        },
      });

      await tx.employmentHistory.updateMany({
        where: { employeeId: id, validTo: null },
        data: { validTo: leaveDateObj },
      });

      await tx.auditEvent.create({
        data: {
          actorName: (operatorName || 'Operator HR').trim(),
          action: 'EMPLOYEE_TERMINATED',
          entityType: 'Employee',
          entityId: id,
          details: JSON.stringify({
            leaveDate: leaveDateObj.toISOString(),
            reason: reason || null,
          }),
        },
      });

      return e;
    });

    return NextResponse.json({
      success: true,
      employee: updated,
      data: updated,
      message: `Contractul de muncă al salariatului ${emp.lastName} ${emp.firstName} a fost încetat cu succes.`,
    });
  } catch (error) {
    console.error('Eroare la încetarea contractului salariatului:', error);
    return NextResponse.json(
      { error: 'Eroare internă de server la încetarea contractului.' },
      { status: 500 }
    );
  }
}
