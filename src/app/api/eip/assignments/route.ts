import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const clientId = searchParams.get('clientId');

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    } else if (clientId) {
      where.employee = { clientId };
    }

    const assignments = await prisma.employeeEipAssignment.findMany({
      where,
      include: {
        eipItem: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            clientId: true,
            shoeSize: true,
            clothingSize: true,
            gloveSize: true,
          },
        },
      },
      orderBy: { assignedDate: 'desc' },
    });

    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea alocărilor EIP.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employeeId = body.employeeId;
    const eipItemId = body.eipItemId || body.itemId;
    const assignedDate = body.assignedDate ? new Date(body.assignedDate) : new Date();
    const signatureDate = body.signatureDate ? new Date(body.signatureDate) : null;

    if (!employeeId || !eipItemId) {
      return NextResponse.json({ error: 'employeeId și eipItemId (sau itemId) sunt obligatorii.' }, { status: 400 });
    }

    const [employee, item] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.eipItem.findUnique({ where: { id: eipItemId } }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: 'Salariatul specificat nu există.' }, { status: 404 });
    }
    if (!item) {
      return NextResponse.json({ error: 'Articolul EIP specificat nu există.' }, { status: 404 });
    }

    const assignment = await prisma.employeeEipAssignment.upsert({
      where: {
        employeeId_eipItemId: {
          employeeId,
          eipItemId,
        },
      },
      create: {
        employeeId,
        eipItemId,
        assignedDate,
        signatureDate,
      },
      update: {
        assignedDate,
        signatureDate,
      },
      include: {
        eipItem: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la înregistrarea predării EIP.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let employeeId = searchParams.get('employeeId');
    let itemId = searchParams.get('itemId') || searchParams.get('eipItemId');

    if (!id && !employeeId) {
      try {
        const body = await request.json();
        id = body.id || id;
        employeeId = body.employeeId || employeeId;
        itemId = body.itemId || body.eipItemId || itemId;
      } catch {}
    }

    if (id) {
      await prisma.employeeEipAssignment.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Predarea EIP a fost ștearsă.' });
    }

    if (employeeId && itemId) {
      await prisma.employeeEipAssignment.delete({
        where: {
          employeeId_eipItemId: {
            employeeId,
            eipItemId: itemId,
          },
        },
      });
      return NextResponse.json({ success: true, message: 'Predarea EIP a fost ștearsă.' });
    }

    return NextResponse.json({ error: 'Specificați id sau combinația (employeeId, itemId).' }, { status: 400 });
  } catch (error: any) {
    if (error?.code === 'P2025' || error?.message?.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Predarea EIP nu a fost găsită.' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || 'Eroare la ștergerea predării EIP.' }, { status: 500 });
  }
}
