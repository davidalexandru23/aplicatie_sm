import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDocument } from '@/lib/templates/generator';
import { resolveTemplatePlaceholders } from '@/lib/templates/resolver';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      templateCode,
      clientId,
      employeeId,
      jobId,
      hygieneSessionId,
      hygieneParticipantId,
      customFields,
      operatorName = 'Operator Intern',
    } = body;

    if (!templateCode || !clientId) {
      return NextResponse.json(
        { error: 'Codul șablonului și clientul sunt obligatorii.' },
        { status: 400 }
      );
    }

    // Resolve all template placeholders using the central resolver
    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode,
      clientId,
      employeeId,
      jobId,
      hygieneSessionId,
      hygieneParticipantId,
      customOverrides: customFields && typeof customFields === 'object' ? customFields : {},
    });

    const result = await generateDocument({
      templateCode,
      clientId,
      employeeId,
      jobId,
      hygieneSessionId,
      data: resolvedData,
      operatorName,
    });

    return NextResponse.json({
      success: true,
      result,
      downloadUrl: `/api/documents/${result.documentId}/download`,
    });
  } catch (err: unknown) {
    console.error('Document generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la generarea documentului.' },
      { status: 500 }
    );
  }
}
