import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const clientId = searchParams.get('clientId');

    const where: any = {};
    if (jobId) {
      where.jobId = jobId;
    } else if (clientId) {
      where.job = { clientId };
    }

    const requirements = await prisma.jobEipRequirement.findMany({
      where,
      include: {
        eipItem: true,
        job: {
          select: { id: true, title: true, clientId: true },
        },
      },
      orderBy: { eipItem: { name: 'asc' } },
    });

    return NextResponse.json({
      success: true,
      requirements,
      items: requirements.map((r) => ({
        ...r,
        item: r.eipItem,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea cerințelor EIP.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const jobId = body.jobId;
    const eipItemId = body.eipItemId || body.itemId;

    if (!jobId || !eipItemId) {
      return NextResponse.json({ error: 'jobId și eipItemId (sau itemId) sunt obligatorii.' }, { status: 400 });
    }

    const [job, item] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.eipItem.findUnique({ where: { id: eipItemId } }),
    ]);

    if (!job) {
      return NextResponse.json({ error: 'Postul specificat nu există.' }, { status: 404 });
    }
    if (!item) {
      return NextResponse.json({ error: 'Articolul EIP specificat nu există.' }, { status: 404 });
    }

    const requirement = await prisma.jobEipRequirement.upsert({
      where: {
        jobId_eipItemId: {
          jobId,
          eipItemId,
        },
      },
      create: {
        jobId,
        eipItemId,
      },
      update: {},
      include: {
        eipItem: true,
        job: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({ success: true, requirement }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la adăugarea cerinței EIP.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let jobId = searchParams.get('jobId');
    let itemId = searchParams.get('itemId') || searchParams.get('eipItemId');

    if (!id && !jobId) {
      try {
        const body = await request.json();
        id = body.id || id;
        jobId = body.jobId || jobId;
        itemId = body.itemId || body.eipItemId || itemId;
      } catch {}
    }

    if (id) {
      await prisma.jobEipRequirement.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Cerința EIP a fost ștearsă.' });
    }

    if (jobId && itemId) {
      await prisma.jobEipRequirement.delete({
        where: {
          jobId_eipItemId: {
            jobId,
            eipItemId: itemId,
          },
        },
      });
      return NextResponse.json({ success: true, message: 'Cerința EIP a fost ștearsă.' });
    }

    return NextResponse.json({ error: 'Specificați id sau combinația (jobId, itemId).' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la ștergerea cerinței EIP.' }, { status: 500 });
  }
}
