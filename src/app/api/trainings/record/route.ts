import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      trainingType,
      eventDate,
      durationHours,
      instructorName,
      participantEmployeeIds,
      notes,
      materialOrTopic,
    } = body;

    // 1. Validare parametri obligatorii
    if (!clientId || !trainingType || !eventDate || !instructorName) {
      return NextResponse.json(
        { error: 'Câmpurile clientId, trainingType, eventDate și instructorName sunt obligatorii.' },
        { status: 400 }
      );
    }

    const validTypes = ['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM', 'PERIODIC_PSI'];
    if (!validTypes.includes(trainingType)) {
      return NextResponse.json(
        { error: `Tipul instruirii este invalid. Valori permise: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Data instruirii este invalidă.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (parsedDate.getTime() > endOfToday.getTime()) {
      return NextResponse.json(
        { error: 'Data instruirii nu poate fi în viitor.' },
        { status: 400 }
      );
    }

    const duration = Number(durationHours);
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json(
        { error: 'Durata instruirii trebuie să fie un număr pozitiv de ore.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(participantEmployeeIds) || participantEmployeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Trebuie să selectați cel puțin un salariat participant.' },
        { status: 400 }
      );
    }

    // Deduplicate participant employee IDs
    const uniqueParticipantIds = Array.from(new Set(participantEmployeeIds.map(String)));

    // 2. Verificare existență client și validare proprietate salariați
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Clientul specificat nu există.' },
        { status: 404 }
      );
    }

    const validEmployees = await prisma.employee.findMany({
      where: {
        id: { in: uniqueParticipantIds },
        clientId: clientId,
      },
      select: { id: true },
    });

    if (validEmployees.length !== uniqueParticipantIds.length) {
      return NextResponse.json(
        { error: 'Unul sau mai mulți salariați selectați nu aparțin companiei specificate.' },
        { status: 400 }
      );
    }

    // 3. Rezolvare tematică implicită
    const resolvedTopic =
      (materialOrTopic && String(materialOrTopic).trim()) ||
      (notes && String(notes).trim()) ||
      (trainingType === 'INTRODUCTIV'
        ? 'Instruire introductiv-generală conform Legii 319/2006 și HG 1425/2006'
        : trainingType === 'LOC_MUNCA'
        ? 'Instruire la locul de muncă conform HG 1425/2006'
        : trainingType === 'PERIODIC_SSM'
        ? 'Instruire periodică SSM conform tematicii anuale'
        : 'Instruire periodică Situații de Urgență / PSI conform OMAI 712/2005');

    // 4. Execuție Atomică în Tranzacție Prisma
    const result = await prisma.$transaction(async (tx) => {
      // a) Creare TrainingEvent cu relațiile TrainingParticipant
      const event = await tx.trainingEvent.create({
        data: {
          clientId,
          type: trainingType,
          eventDate: parsedDate,
          durationHours: duration,
          materialOrTopic: resolvedTopic,
          instructorName: String(instructorName).trim(),
          status: 'recorded',
          participants: {
            create: uniqueParticipantIds.map((empId) => ({
              employeeId: empId,
              result: 'admis',
              recordedAt: parsedDate,
            })),
          },
        },
      });

      // b) Actualizare scadențe salariați în funcție de tipul instruirii
      let updatedCount = 0;
      if (['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM'].includes(trainingType)) {
        const updateRes = await tx.employee.updateMany({
          where: {
            id: { in: uniqueParticipantIds },
            clientId: clientId,
          },
          data: {
            ssmLastTrainingDate: parsedDate,
            ...(notes ? { ssmNotes: String(notes).trim() } : {}),
          },
        });
        updatedCount = updateRes.count;
      } else if (trainingType === 'PERIODIC_PSI') {
        const updateRes = await tx.employee.updateMany({
          where: {
            id: { in: uniqueParticipantIds },
            clientId: clientId,
          },
          data: {
            psiLastTrainingDate: parsedDate,
            ...(notes ? { psiNotes: String(notes).trim() } : {}),
          },
        });
        updatedCount = updateRes.count;
      }

      return { event, updatedCount };
    });

    try {
      await logAuditEvent({
        actorName: String(instructorName).trim() || 'Inspector SSM',
        action: 'create',
        entityType: 'TrainingEvent',
        entityId: result.event.id,
        details: {
          clientId,
          trainingType,
          eventDate: parsedDate.toISOString(),
          participantsCount: uniqueParticipantIds.length,
          updatedEmployeesCount: result.updatedCount,
        },
      });
    } catch (auditErr) {
      console.warn('Could not record audit event:', auditErr);
    }

    return NextResponse.json(
      {
        success: true,
        eventId: result.event.id,
        updatedEmployeesCount: result.updatedCount,
        trainingType,
        eventDate: parsedDate.toISOString(),
        message: `Instruirea a fost înregistrată cu succes, iar scadențele a ${result.updatedCount} salariați au fost actualizate.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error recording training event:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare internă la salvarea instruirii.' },
      { status: 500 }
    );
  }
}
