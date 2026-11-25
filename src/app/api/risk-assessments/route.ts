import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePecePartialRisk } from '@/lib/risk/caen-risk-presets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const jobId = searchParams.get('jobId');
    const worksiteId = searchParams.get('worksiteId');
    const status = searchParams.get('status');

    const where: any = { client: { isActive: true } };
    if (clientId) where.clientId = clientId;
    if (jobId) where.jobId = jobId;
    if (worksiteId) where.worksiteId = worksiteId;
    if (status) where.status = status;

    const assessments = await prisma.riskAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ success: true, assessments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea evaluărilor de risc.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      jobId,
      worksiteId,
      title,
      method = 'INCDPM',
      version = 1,
      evaluatorName,
      conclusions,
      status = 'draft',
      items = [],
      measures = [],
      hazardZones = [],
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId este obligatoriu.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || !client.isActive) {
      return NextResponse.json(
        { error: 'Clientul nu a fost găsit sau este inactiv.' },
        { status: 404 }
      );
    }

    if (jobId) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        return NextResponse.json({ error: 'Postul specificat nu a fost găsit.' }, { status: 404 });
      }
      if (job.clientId !== clientId) {
        return NextResponse.json({ error: 'Postul specificat nu aparține companiei specificate.' }, { status: 400 });
      }
    }

    // Boundary validation: severity 1-7, probability 1-6
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

    const assessmentTitle = title?.trim() || `Evaluare Riscuri - ${new Date().getFullYear()}`;

    const assessment = await prisma.$transaction(async (tx) => {
      const createdAssessment = await tx.riskAssessment.create({
        data: {
          clientId,
          jobId: jobId || null,
          worksiteId: worksiteId || null,
          title: assessmentTitle,
          method,
          version: typeof version === 'number' ? version : 1,
          evaluatorName: evaluatorName?.trim() || null,
          conclusions: conclusions?.trim() || null,
          status,
        },
      });

      // Insert risk items and map index to id for measure linking
      const createdItems: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const g = item.severityScore ?? item.severityLevel ?? 3;
        const p = item.probabilityScore ?? item.probabilityLevel ?? 2;
        const r = item.riskLevel ?? item.riskScore ?? calculatePecePartialRisk(g, p);

        const createdItem = await tx.riskItem.create({
          data: {
            assessmentId: createdAssessment.id,
            hazard: item.hazard || item.riskFactor || `Factor de risc #${i + 1}`,
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

      // Insert prevention measures
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
            assessmentId: createdAssessment.id,
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

      // Insert hazard zones
      for (const hz of hazardZones) {
        await tx.hazardZone.create({
          data: {
            assessmentId: createdAssessment.id,
            zoneName: hz.zoneName,
            location: hz.location || '',
            hazardDescription: hz.hazardDescription || '',
            safetyMeasures: hz.safetyMeasures || '',
          },
        });
      }

      return tx.riskAssessment.findUnique({
        where: { id: createdAssessment.id },
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

    return NextResponse.json({ success: true, assessment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la crearea dosarului de evaluare.' }, { status: 500 });
  }
}
