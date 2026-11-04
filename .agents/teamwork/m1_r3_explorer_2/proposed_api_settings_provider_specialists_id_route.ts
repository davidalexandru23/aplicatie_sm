import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/settings/provider/specialists/[id]
 * Actualizează datele unui specialist SSM desemnat.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingSpecialist = await prisma.ssmSpecialist.findUnique({
      where: { id },
    });

    if (!existingSpecialist) {
      return NextResponse.json(
        { error: 'Specialistul SSM specificat nu a fost găsit.' },
        { status: 404 }
      );
    }

    const {
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

    const resolvedQualification = qualification !== undefined ? qualification : evaluatorCert;

    // If making this specialist default, unset default on others in same provider
    if (isDefault === true) {
      await prisma.ssmSpecialist.updateMany({
        where: {
          providerId: existingSpecialist.providerId,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.ssmSpecialist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(role !== undefined && { role: role ? String(role).trim() : null }),
        ...(certificateNumber !== undefined && {
          certificateNumber: certificateNumber ? String(certificateNumber).trim() : null,
        }),
        ...(resolvedQualification !== undefined && {
          qualification: resolvedQualification ? String(resolvedQualification).trim() : null,
        }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(cnp !== undefined && { cnp: cnp ? String(cnp).trim() : null }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    try {
      await logAuditEvent({
        actorName: 'Operator Intern',
        action: 'update',
        entityType: 'SsmSpecialist',
        entityId: id,
        details: {
          message: 'Actualizare date specialist SSM',
          specialistName: updated.name,
          updatedFields: Object.keys(body),
        },
      });
    } catch (auditErr) {
      console.warn('Could not record audit event:', auditErr);
    }

    return NextResponse.json({ success: true, specialist: updated });
  } catch (err: unknown) {
    console.error('PATCH /api/settings/provider/specialists/[id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la actualizarea specialistului SSM.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/provider/specialists/[id]
 * Șterge sau dezactivează un specialist SSM desemnat.
 * Protejează integritatea relațională cu clienții: dacă specialistul este asignat la clienți,
 * este dezactivat (soft-deleted) pentru a nu rupe dosarul client și documentele emise.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingSpecialist = await prisma.ssmSpecialist.findUnique({
      where: { id },
    });

    if (!existingSpecialist) {
      return NextResponse.json(
        { error: 'Specialistul SSM specificat nu a fost găsit.' },
        { status: 404 }
      );
    }

    // Check if assigned to any clients
    const clientCount = await prisma.client.count({
      where: { specialistId: id },
    });

    if (clientCount > 0) {
      // Soft-delete to preserve relational integrity and historical documents
      const deactivated = await prisma.ssmSpecialist.update({
        where: { id },
        data: { isActive: false, isDefault: false },
      });

      try {
        await logAuditEvent({
          actorName: 'Operator Intern',
          action: 'delete',
          entityType: 'SsmSpecialist',
          entityId: id,
          details: {
            message: `Dezactivare specialist SSM (protecție integritate: asignat la ${clientCount} clienți)`,
            specialistName: existingSpecialist.name,
            softDeleted: true,
          },
        });
      } catch (auditErr) {
        console.warn('Could not record audit event:', auditErr);
      }

      return NextResponse.json({
        success: true,
        message: `Specialistul a fost dezactivat (este asignat în dosarul a ${clientCount} clienți).`,
        specialist: deactivated,
        softDeleted: true,
      });
    }

    // If not assigned to any client, safely hard-delete
    await prisma.ssmSpecialist.delete({
      where: { id },
    });

    try {
      await logAuditEvent({
        actorName: 'Operator Intern',
        action: 'delete',
        entityType: 'SsmSpecialist',
        entityId: id,
        details: {
          message: 'Ștergere definitivă specialist SSM',
          specialistName: existingSpecialist.name,
        },
      });
    } catch (auditErr) {
      console.warn('Could not record audit event:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Specialistul a fost șters cu succes.',
    });
  } catch (err: unknown) {
    console.error('DELETE /api/settings/provider/specialists/[id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la ștergerea specialistului SSM.' },
      { status: 500 }
    );
  }
}
