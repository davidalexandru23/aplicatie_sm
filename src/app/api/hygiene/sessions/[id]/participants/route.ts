import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { allocateCertificateNumbersForSession } from '@/lib/hygiene-numbering';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Add participants to an existing session from employee IDs
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const session = await prisma.hygieneSession.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: 'Sesiunea nu a fost găsită.' }, { status: 404 });
  }

  if (session.status !== 'programata') {
    return NextResponse.json(
      { error: 'Se pot adăuga cursanți doar în sesiuni cu status "programată".' },
      { status: 400 }
    );
  }

  const { employeeIds } = body as { employeeIds: string[] };
  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: 'Selectează cel puțin un angajat.' }, { status: 400 });
  }

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    include: {
      client: { select: { name: true } },
      currentJob: { select: { title: true } },
      identityDocument: true,
    },
  });

  if (employees.length === 0) {
    return NextResponse.json({ error: 'Angajații selectați nu au fost găsiți.' }, { status: 404 });
  }

  // Check for duplicates
  const existingParticipants = await prisma.hygieneParticipant.findMany({
    where: { sessionId: id, employeeId: { in: employeeIds } },
    select: { employeeId: true },
  });
  const existingIds = new Set(existingParticipants.map((p) => p.employeeId));

  const newEmployees = employees.filter((e) => !existingIds.has(e.id));
  if (newEmployees.length === 0) {
    return NextResponse.json(
      { error: 'Toți angajații selectați sunt deja înscriși în sesiune.' },
      { status: 400 }
    );
  }

  const created = await prisma.hygieneParticipant.createMany({
    data: newEmployees.map((emp) => ({
      sessionId: id,
      employeeId: emp.id,
      clientName: emp.client.name,
      lastName: emp.lastName,
      firstName: emp.firstName,
      cnp: emp.cnp,
      birthDate: emp.birthDate,
      birthPlace: emp.birthPlace,
      docType: emp.identityDocument?.docType || 'CI',
      docSeries: emp.identityDocument?.series || null,
      docNumber: emp.identityDocument?.number || null,
      jobTitle: emp.currentJob?.title || null,
      attendance: 'prezent',
      examResult: 'admis',
      examGrade: 10,
    })),
  });

  // Automatically assign sequential certificate numbers and update employee records
  await allocateCertificateNumbersForSession(id);

  return NextResponse.json({
    success: true,
    addedCount: created.count,
    skippedCount: employees.length - newEmployees.length,
  }, { status: 201 });
}
