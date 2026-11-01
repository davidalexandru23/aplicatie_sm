import { NextRequest, NextResponse } from 'next/server';
import { exportClientToExcel } from '@/lib/exporter';
import { logAuditEvent } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await exportClientToExcel(id);

    await logAuditEvent({
      actorName: 'Operator SSM',
      action: 'export',
      entityType: 'Client',
      entityId: id,
      details: {
        clientName: result.clientName,
        employeesCount: result.employeesCount,
        filename: result.filename,
      },
    });

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Eroare la exportul dosarului de firmă în Excel:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Eroare internă la exportul în Excel.',
      },
      { status: 500 }
    );
  }
}
