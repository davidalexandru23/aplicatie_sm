import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: clientId, jobId } = await params;

    const job = await prisma.job.findFirst({
      where: { id: jobId, clientId },
      include: {
        eipRequirements: {
          include: { eipItem: true },
        },
        riskAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            employees: { where: { status: { not: 'PLECAT' } } },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Postul nu a fost găsit.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea postului.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  return handleUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: NextRequest,
  paramsPromise: Promise<{ id: string; jobId: string }>
) {
  try {
    const { id: clientId, jobId } = await paramsPromise;
    const body = await request.json();

    const existing = await prisma.job.findFirst({
      where: { id: jobId, clientId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Postul nu a fost găsit.' }, { status: 404 });
    }

    const {
      title,
      corCode,
      mainActivities,
      equipmentUsed,
      workConditions,
      workersCount,
      isActive,
      isFoodHandling,
      isScreenWork,
      isDrivingRequired,
      noiseExposed,
      chemicalExposed,
      vibrationExposed,
      heightWork,
      workPosture,
      maxWeightKg,
      eipItemIds,
    } = body;

    if (maxWeightKg !== undefined && maxWeightKg !== null && Number(maxWeightKg) < 0) {
      return NextResponse.json({ error: 'Greutatea maximă nu poate fi negativă.' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (corCode !== undefined) dataToUpdate.corCode = corCode ? corCode.trim() : null;
    if (mainActivities !== undefined) dataToUpdate.mainActivities = mainActivities ? mainActivities.trim() : null;
    if (equipmentUsed !== undefined) dataToUpdate.equipmentUsed = equipmentUsed ? equipmentUsed.trim() : null;
    if (workConditions !== undefined) dataToUpdate.workConditions = workConditions ? workConditions.trim() : null;
    if (workersCount !== undefined) dataToUpdate.workersCount = workersCount ? Number(workersCount) : null;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    if (isFoodHandling !== undefined) dataToUpdate.isFoodHandling = Boolean(isFoodHandling);
    if (isScreenWork !== undefined) dataToUpdate.isScreenWork = Boolean(isScreenWork);
    if (isDrivingRequired !== undefined) dataToUpdate.isDrivingRequired = Boolean(isDrivingRequired);
    if (noiseExposed !== undefined) dataToUpdate.noiseExposed = Boolean(noiseExposed);
    if (chemicalExposed !== undefined) dataToUpdate.chemicalExposed = Boolean(chemicalExposed);
    if (vibrationExposed !== undefined) dataToUpdate.vibrationExposed = Boolean(vibrationExposed);
    if (heightWork !== undefined) dataToUpdate.heightWork = Boolean(heightWork);

    if (workPosture !== undefined) dataToUpdate.workPosture = workPosture ? workPosture.trim() : null;
    if (maxWeightKg !== undefined) dataToUpdate.maxWeightKg = maxWeightKg !== null ? Number(maxWeightKg) : null;

    const updatedJob = await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: dataToUpdate,
      });

      if (Array.isArray(eipItemIds)) {
        await tx.jobEipRequirement.deleteMany({ where: { jobId } });
        for (const itemId of eipItemIds) {
          if (itemId) {
            await tx.jobEipRequirement.create({
              data: {
                jobId,
                eipItemId: itemId,
              },
            });
          }
        }
      }

      return tx.job.findUnique({
        where: { id: jobId },
        include: {
          eipRequirements: { include: { eipItem: true } },
          _count: { select: { employees: true } },
        },
      });
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Un post cu această denumire există deja pentru această firmă.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Eroare la actualizarea postului.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: clientId, jobId } = await params;

    const existing = await prisma.job.findFirst({
      where: { id: jobId, clientId },
      include: {
        _count: {
          select: {
            employees: { where: { status: { not: 'PLECAT' } } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Postul nu a fost găsit.' }, { status: 404 });
    }

    if (existing._count.employees > 0) {
      return NextResponse.json(
        { error: `Nu se poate șterge postul deoarece are ${existing._count.employees} salariat/salariați activ(i) asociați.` },
        { status: 409 }
      );
    }

    await prisma.job.delete({ where: { id: jobId } });

    return NextResponse.json({ success: true, message: 'Postul a fost șters cu succes.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la ștergerea postului.' }, { status: 500 });
  }
}
