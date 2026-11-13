import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiskProfileForCaen } from '@/lib/risk/caen-risk-presets';

function extractCaenCode(raw?: unknown): string {
  if (!raw) return '6201';
  const str = String(raw).trim();
  const match = str.match(/\b\d{4}\b/);
  return match ? match[0] : (str.slice(0, 4) || '6201');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: clientId, jobId } = await params;

    const [client, job, assessment] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
      prisma.riskAssessment.findFirst({
        where: { clientId, jobId },
        orderBy: { createdAt: 'desc' },
        include: {
          riskItems: {
            orderBy: { sortOrder: 'asc' },
            include: { preventionMeasures: true },
          },
          preventionMeasures: true,
          hazardZones: true,
        },
      }),
    ]);

    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }
    if (!job) {
      return NextResponse.json({ error: 'Postul nu a fost găsit.' }, { status: 404 });
    }

    let suggestedProfile = null;
    try {
      const code = extractCaenCode(client.caenCode);
      suggestedProfile = getRiskProfileForCaen(code, job.title);
    } catch {
      // CAEN profile fallback if any
    }

    return NextResponse.json({
      success: true,
      assessment,
      suggestedProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea riscurilor postului.' }, { status: 500 });
  }
}
