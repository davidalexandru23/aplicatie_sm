import { NextRequest, NextResponse } from 'next/server';
import { generateInspectionArchiveZip } from '@/lib/packages/bulk-packages';
import { logAuditEvent } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeAllEmployees = searchParams.get('all') === 'true';

    const result = await generateInspectionArchiveZip({
      clientId: id,
      includeAllEmployees,
    });

    await logAuditEvent({
      actorName: 'Operator SSM',
      action: 'generate',
      entityType: 'Client',
      entityId: id,
      details: {
        packageType: 'inspection_archive',
        clientId: id,
        clientName: result.clientName,
        employeesIncluded: result.employeesIncluded,
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
    console.error('Eroare la generarea arhivei de inspecție ITM/ISU:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare internă la generarea arhivei.' },
      { status: 500 }
    );
  }
}
