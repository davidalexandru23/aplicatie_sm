import { NextRequest, NextResponse } from 'next/server';
import { resolveTemplatePlaceholders } from '@/lib/templates/resolver';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const employeeId = searchParams.get('employeeId') || undefined;
    const jobId = searchParams.get('jobId') || undefined;
    const hygieneSessionId = searchParams.get('hygieneSessionId') || undefined;
    const hygieneParticipantId = searchParams.get('hygieneParticipantId') || undefined;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId este necesar pentru rezolvarea câmpurilor.' },
        { status: 400 }
      );
    }

    const result = await resolveTemplatePlaceholders({
      templateCode: code,
      clientId,
      employeeId,
      jobId,
      hygieneSessionId,
      hygieneParticipantId,
    });

    return NextResponse.json({
      success: true,
      template: {
        code: result.template.code,
        name: result.template.name,
        format: result.template.format,
        family: result.template.family,
        contextLevel: result.template.contextLevel,
      },
      fields: result.fields,
      resolvedData: result.resolvedData,
    });
  } catch (error: unknown) {
    console.error('Error in template fields route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Eroare la rezolvarea câmpurilor șablonului.' },
      { status: 500 }
    );
  }
}
