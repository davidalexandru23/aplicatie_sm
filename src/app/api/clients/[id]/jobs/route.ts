import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    const jobs = await prisma.job.findMany({
      where: { clientId },
      orderBy: { title: 'asc' },
      include: {
        eipRequirements: {
          include: { eipItem: true },
        },
        _count: {
          select: {
            employees: { where: { status: { not: 'PLECAT' } } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea posturilor.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await request.json();

    const {
      title,
      corCode,
      mainActivities,
      equipmentUsed,
      workConditions,
      workersCount,
      isFoodHandling = false,
      isScreenWork = false,
      isDrivingRequired = false,
      noiseExposed = false,
      chemicalExposed = false,
      vibrationExposed = false,
      heightWork = false,
      workPosture,
      maxWeightKg,
      eipItemIds = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Denumirea postului este obligatorie.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    if (maxWeightKg !== undefined && maxWeightKg !== null && maxWeightKg < 0) {
      return NextResponse.json({ error: 'Greutatea maximă nu poate fi negativă.' }, { status: 400 });
    }

    const job = await prisma.$transaction(async (tx) => {
      const createdJob = await tx.job.create({
        data: {
          clientId,
          title: title.trim(),
          corCode: corCode?.trim() || null,
          mainActivities: mainActivities?.trim() || null,
          equipmentUsed: equipmentUsed?.trim() || null,
          workConditions: workConditions?.trim() || null,
          workersCount: workersCount ? Number(workersCount) : null,
          isFoodHandling: Boolean(isFoodHandling),
          isScreenWork: Boolean(isScreenWork),
          isDrivingRequired: Boolean(isDrivingRequired),
          noiseExposed: Boolean(noiseExposed),
          chemicalExposed: Boolean(chemicalExposed),
          vibrationExposed: Boolean(vibrationExposed),
          heightWork: Boolean(heightWork),
          workPosture: workPosture?.trim() || null,
          maxWeightKg: maxWeightKg !== undefined && maxWeightKg !== null ? Number(maxWeightKg) : null,
        },
      });

      if (Array.isArray(eipItemIds) && eipItemIds.length > 0) {
        for (const itemId of eipItemIds) {
          if (itemId) {
            await tx.jobEipRequirement.create({
              data: {
                jobId: createdJob.id,
                eipItemId: itemId,
              },
            });
          }
        }
      }

      return tx.job.findUnique({
        where: { id: createdJob.id },
        include: {
          eipRequirements: { include: { eipItem: true } },
          _count: { select: { employees: true } },
        },
      });
    });

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Un post cu această denumire există deja pentru această firmă.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Eroare la crearea postului.' }, { status: 500 });
  }
}
