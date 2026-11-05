import { NextRequest, NextResponse } from 'next/server';
import { generateEmployeeOnboardingZip } from '@/lib/packages/bulk-packages';
import { logAuditEvent } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Parametrul employeeId este obligatoriu pentru pachetul de onboarding.' },
        { status: 400 }
      );
    }

    const preferCimModelCadru = searchParams.get('format') === 'cadru2022' || searchParams.get('preferCimModelCadru') === 'true';

    const result = await generateEmployeeOnboardingZip({
      clientId: id,
      employeeId,
      preferCimModelCadru,
    });

    await logAuditEvent({
      actorName: 'Operator SSM',
      action: 'generate',
      entityType: 'Employee',
      entityId: employeeId,
      details: {
        packageType: 'onboarding',
        clientId: id,
        clientName: result.clientName,
        employeeName: result.employeeName,
        filename: result.filename,
        fileSizeBytes: result.buffer.length,
      },
    });

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Eroare la generarea pachetului de onboarding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare internă la generarea pachetului.' },
      { status: 500 }
    );
  }
}
