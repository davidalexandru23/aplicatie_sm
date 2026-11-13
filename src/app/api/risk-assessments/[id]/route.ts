import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePecePartialRisk } from '@/lib/risk/caen-risk-presets';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assessment = await prisma.riskAssessment.findUnique({
      where: { id },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
          include: { preventionMeasures: true },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Evaluarea de risc nu a fost găsită.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, assessment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea evaluării.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.riskAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Evaluarea de risc nu a fost găsită.' }, { status: 404 });
    }

    const {
      title,
      jobId,
      worksiteId,
      method,
      version,
      evaluatorName,
      conclusions,
      status,
      items,
      measures,
      hazardZones,
    } = body;

    // Validate items boundary if provided
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const g = it.severityScore ?? it.severityLevel;
        const p = it.probabilityScore ?? it.probabilityLevel;
        if (g !== undefined && g !== null) {
          if (g < 1 || g > 7) {
            return NextResponse.json({ error: `Gravitate invalidă la factorul #${i + 1} (${g}). Valori permise: 1-7.` }, { status: 400 });
          }
        }
        if (p !== undefined && p !== null) {
          if (p < 1 || p > 6) {
            return NextResponse.json({ error: `Probabilitate invalidă la factorul #${i + 1} (${p}). Valori permise: 1-6.` }, { status: 400 });
          }
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update assessment top-level fields
      const dataToUpdate: any = {};
      if (title !== undefined) dataToUpdate.title = title.trim();
      if (jobId !== undefined) dataToUpdate.jobId = jobId || null;
      if (worksiteId !== undefined) dataToUpdate.worksiteId = worksiteId || null;
      if (method !== undefined) dataToUpdate.method = method;
      if (version !== undefined) dataToUpdate.version = version;
      if (evaluatorName !== undefined) dataToUpdate.evaluatorName = evaluatorName?.trim() || null;
      if (conclusions !== undefined) dataToUpdate.conclusions = conclusions?.trim() || null;
      if (status !== undefined) dataToUpdate.status = status;

      await tx.riskAssessment.update({
        where: { id },
        data: dataToUpdate,
      });

      // 2. Synchronize riskItems if provided
      if (Array.isArray(items)) {
        await tx.preventionMeasure.deleteMany({ where: { assessmentId: id } });
        await tx.riskItem.deleteMany({ where: { assessmentId: id } });

        const createdItems: any[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const g = item.severityScore ?? item.severityLevel ?? 3;
          const p = item.probabilityScore ?? item.probabilityLevel ?? 2;
          const r = item.riskLevel ?? item.riskScore ?? calculatePecePartialRisk(g, p);

          const createdItem = await tx.riskItem.create({
            data: {
              assessmentId: id,
              hazard: item.hazard || item.riskFactor || `Factor #${i + 1}`,
              riskSituation: item.riskSituation || item.riskElement || 'EXECUTANT',
              consequence: item.consequence || item.consequences || 'ITM 3-45 zile',
              severityScore: g,
              probabilityScore: p,
              riskLevel: r,
              existingMeasures: item.existingMeasures || null,
              residualRiskLevel: item.residualRiskLevel || null,
              sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
            },
          });
          createdItems.push({ original: item, record: createdItem });
        }

        // 3. Synchronize preventionMeasures if provided
        if (Array.isArray(measures)) {
          for (let j = 0; j < measures.length; j++) {
            const m = measures[j];
            let linkedRiskItemId: string | null = null;
            if (m.riskItemId) {
              linkedRiskItemId = m.riskItemId;
            } else if (typeof m.itemIndex === 'number' && createdItems[m.itemIndex]) {
              linkedRiskItemId = createdItems[m.itemIndex].record.id;
            }

            await tx.preventionMeasure.create({
              data: {
                assessmentId: id,
                riskItemId: linkedRiskItemId,
                description: m.description,
                measureType: (m.measureType || 'tehnica').toLowerCase(),
                responsiblePerson: m.responsiblePerson || null,
                deadline: m.deadline || null,
                status: m.status || 'planificat',
                resources: m.resources || null,
              },
            });
          }
        }
      }

      // 4. Synchronize hazardZones if provided
      if (Array.isArray(hazardZones)) {
        await tx.hazardZone.deleteMany({ where: { assessmentId: id } });
        for (const hz of hazardZones) {
          await tx.hazardZone.create({
            data: {
              assessmentId: id,
              zoneName: hz.zoneName,
              location: hz.location || '',
              hazardDescription: hz.hazardDescription || '',
              safetyMeasures: hz.safetyMeasures || '',
            },
          });
        }
      }

      return tx.riskAssessment.findUnique({
        where: { id },
        include: {
          client: true,
          job: true,
          worksite: true,
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      });
    });

    return NextResponse.json({ success: true, assessment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la actualizarea evaluării.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.riskAssessment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Evaluarea de risc nu a fost găsită.' }, { status: 404 });
    }

    await prisma.riskAssessment.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Evaluarea de risc a fost ștearsă cu succes.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la ștergerea evaluării.' }, { status: 500 });
  }
}
