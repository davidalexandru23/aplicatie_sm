import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * POST /api/settings/provider/specialists
 * Adaugă un specialist SSM desemnat în cadrul prestatorului.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      providerId,
      name,
      role,
      certificateNumber,
      qualification,
      evaluatorCert,
      phone,
      email,
      cnp,
      isDefault,
      isActive,
    } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'Numele specialistului este obligatoriu.' },
        { status: 400 }
      );
    }

    // Resolve provider ID if not explicitly provided
    let resolvedProviderId = providerId;
    if (!resolvedProviderId) {
      const defaultProvider = await prisma.ssmProvider.findFirst({
        where: { isDefault: true },
        select: { id: true },
      });
      if (defaultProvider) {
        resolvedProviderId = defaultProvider.id;
      } else {
        const firstProvider = await prisma.ssmProvider.findFirst({
          select: { id: true },
        });
        if (firstProvider) {
          resolvedProviderId = firstProvider.id;
        }
      }
    }

    if (!resolvedProviderId) {
      return NextResponse.json(
        { error: 'Niciun profil de prestator SSM nu este activ pentru a atașa specialistul.' },
        { status: 400 }
      );
    }

    const markDefault = Boolean(isDefault);

    // If marked default, unset default on other specialists for this provider
    if (markDefault) {
      await prisma.ssmSpecialist.updateMany({
        where: { providerId: resolvedProviderId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const resolvedQualification = qualification || evaluatorCert || null;

    const specialist = await prisma.ssmSpecialist.create({
      data: {
        providerId: resolvedProviderId,
        name: String(name).trim(),
        role: role ? String(role).trim() : 'Specialist SSM / Evaluator de risc',
        certificateNumber: certificateNumber ? String(certificateNumber).trim() : null,
        qualification: resolvedQualification ? String(resolvedQualification).trim() : null,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim() : null,
        cnp: cnp ? String(cnp).trim() : null,
        isDefault: markDefault,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    try {
      await logAuditEvent({
        actorName: 'Operator Intern',
        action: 'create',
        entityType: 'SsmSpecialist',
        entityId: specialist.id,
        details: {
          message: 'Adăugare specialist SSM desemnat',
          specialistName: specialist.name,
          certificate: specialist.certificateNumber,
        },
      });
    } catch (auditErr) {
      console.warn('Could not record audit event:', auditErr);
    }

    return NextResponse.json(specialist, { status: 201 });
  } catch (err: unknown) {
    console.error('POST /api/settings/provider/specialists error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la adăugarea specialistului SSM.' },
      { status: 500 }
    );
  }
}
