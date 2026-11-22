import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDocument } from '@/lib/templates/generator';
import { resolveTemplatePlaceholders } from '@/lib/templates/resolver';
import { allocateCertificateNumberForParticipant } from '@/lib/hygiene-numbering';
import { parseSessionFromCookieHeader, UserRole } from '@/lib/auth';
import { isTemplateAllowedForRole, ROLE_CONFIG } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      templateCode,
      clientId,
      employeeId,
      jobId,
      worksiteId,
      hygieneSessionId,
      hygieneParticipantId,
      trainingEventId: rawTrainingEventId,
      eventId: rawEventId,
      assessmentId: rawAssessmentId,
      riskAssessmentId: rawRiskAssessmentId,
      customFields,
      operatorName = 'Operator Intern',
    } = body;

    const trainingEventId = rawTrainingEventId || rawEventId;
    const assessmentId = rawAssessmentId || rawRiskAssessmentId;

    let effClientId = clientId;
    if (hygieneParticipantId) {
      // Ensure participant has certificate number allocated
      try {
        await allocateCertificateNumberForParticipant(hygieneParticipantId);
      } catch (err) {
        console.warn('Could not auto-allocate certificate number for participant:', err);
      }

      if (!effClientId) {
        const part = await prisma.hygieneParticipant.findUnique({
          where: { id: hygieneParticipantId },
          include: { employee: true },
        });
        if (part?.employee?.clientId) {
          effClientId = part.employee.clientId;
        }
      }
    }
    if (!effClientId && hygieneSessionId) {
      const sess = await prisma.hygieneSession.findUnique({
        where: { id: hygieneSessionId },
        include: { client: true, participants: { include: { employee: true } } },
      });
      if (sess?.clientId) {
        effClientId = sess.clientId;
      } else if (sess?.participants && sess.participants.length > 0) {
        const pWithClient = sess.participants.find(p => p.employee?.clientId);
        if (pWithClient?.employee?.clientId) {
          effClientId = pWithClient.employee.clientId;
        }
      }
    }
    if (!effClientId && employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { clientId: true },
      });
      if (emp?.clientId) {
        effClientId = emp.clientId;
      }
    }
    if (!effClientId && jobId) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { clientId: true },
      });
      if (job?.clientId) {
        effClientId = job.clientId;
      }
    }
    if (!effClientId && worksiteId) {
      const ws = await prisma.worksite.findUnique({
        where: { id: worksiteId },
        select: { clientId: true },
      });
      if (ws?.clientId) {
        effClientId = ws.clientId;
      }
    }

    if (!templateCode || !effClientId) {
      return NextResponse.json(
        { error: 'Codul șablonului și clientul sunt obligatorii.' },
        { status: 400 }
      );
    }

    // Role-Based Access Control (RBAC) validation for template generation
    const sessionCookie = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(sessionCookie);
    const userRole: UserRole = session?.role || 'ADMIN';

    if (!isTemplateAllowedForRole({ code: templateCode }, userRole)) {
      return NextResponse.json(
        { error: `Rolul dumneavoastră (${ROLE_CONFIG[userRole].label}) nu are permisiunea de a genera documente pentru șablonul "${templateCode}".` },
        { status: 403 }
      );
    }

    // Resolve all template placeholders using the central resolver
    const { resolvedData } = await resolveTemplatePlaceholders({
      templateCode,
      clientId: effClientId,
      employeeId,
      jobId,
      worksiteId,
      assessmentId,
      hygieneSessionId,
      hygieneParticipantId,
      trainingEventId,
      customOverrides: customFields && typeof customFields === 'object' ? customFields : {},
    });

    const result = await generateDocument({
      templateCode,
      clientId: effClientId,
      employeeId,
      jobId,
      worksiteId,
      eventId: trainingEventId,
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
