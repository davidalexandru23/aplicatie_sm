import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/provider
 * Returnează profilul prestatorului SSM principal/activ împreună cu specialiștii săi.
 */
export async function GET() {
  try {
    let provider = await prisma.ssmProvider.findFirst({
      where: { isDefault: true },
      include: {
        specialists: {
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            clients: true,
            specialists: true,
          },
        },
      },
    });

    if (!provider) {
      provider = await prisma.ssmProvider.findFirst({
        include: {
          specialists: {
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          },
          _count: {
            select: {
              clients: true,
              specialists: true,
            },
          },
        },
      });
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'Niciun profil de prestator SSM nu este configurat.' },
        { status: 404 }
      );
    }

    return NextResponse.json(provider);
  } catch (err: unknown) {
    console.error('GET /api/settings/provider error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea profilului prestatorului SSM.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/provider
 * Actualizează sau inițializează datele prestatorului SSM (corporate, adresă, acreditare ITM).
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      cui,
      regCom,
      address,
      street,
      number,
      streetNumber,
      building,
      entrance,
      floor,
      apartment,
      postalCode,
      locality,
      city,
      county,
      phone,
      email,
      website,
      legalRepresentative,
      representative,
      representativeRole,
      representativeDoc,
      authorizationNumber,
      itmCertNumber,
      authorizationDate,
      itmCertDate,
      authorizationDetails,
      itmAuthority,
      isActive,
      isDefault,
    } = body;

    const resolvedAuthNumber = authorizationNumber || itmCertNumber;
    const resolvedAuthDate = authorizationDate !== undefined ? authorizationDate : itmCertDate;
    const resolvedAuthDetails = authorizationDetails || itmAuthority;
    const resolvedNumber = number || streetNumber;
    const resolvedLocality = locality || city;
    const resolvedLegalRep = legalRepresentative || representative;

    if (!name || !cui || !address) {
      return NextResponse.json(
        { error: 'Denumirea prestatorului, CUI-ul și adresa sediului social sunt obligatorii.' },
        { status: 400 }
      );
    }

    const cleanCui = String(cui).trim().toUpperCase();

    // Check duplicate CUI if another provider exists with this CUI
    if (id) {
      const duplicate = await prisma.ssmProvider.findFirst({
        where: { cui: cleanCui, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Un alt prestator folosește deja CUI-ul ${cleanCui} (${duplicate.name}).` },
          { status: 409 }
        );
      }
    }

    // Parse authorizationDate safely
    let parsedCertDate: Date | null = null;
    if (resolvedAuthDate !== undefined && resolvedAuthDate !== null && resolvedAuthDate !== '') {
      const d = new Date(resolvedAuthDate);
      parsedCertDate = isNaN(d.getTime()) ? null : d;
    }

    let targetProviderId = id;
    if (!targetProviderId) {
      const existing = await prisma.ssmProvider.findFirst({
        where: { isDefault: true },
      });
      if (existing) {
        targetProviderId = existing.id;
      }
    }

    const dataPayload = {
      name: String(name).trim(),
      cui: cleanCui,
      regCom: regCom ? String(regCom).trim() : null,
      address: String(address).trim(),
      street: street ? String(street).trim() : null,
      number: resolvedNumber ? String(resolvedNumber).trim() : null,
      building: building ? String(building).trim() : null,
      entrance: entrance ? String(entrance).trim() : null,
      floor: floor ? String(floor).trim() : null,
      apartment: apartment ? String(apartment).trim() : null,
      postalCode: postalCode ? String(postalCode).trim() : null,
      locality: resolvedLocality ? String(resolvedLocality).trim() : null,
      county: county ? String(county).trim() : null,
      phone: phone ? String(phone).trim() : null,
      email: email ? String(email).trim() : null,
      website: website ? String(website).trim() : null,
      legalRepresentative: resolvedLegalRep ? String(resolvedLegalRep).trim() : null,
      representativeRole: representativeRole ? String(representativeRole).trim() : null,
      representativeDoc: representativeDoc ? String(representativeDoc).trim() : null,
      authorizationNumber: resolvedAuthNumber ? String(resolvedAuthNumber).trim() : null,
      authorizationDate: parsedCertDate,
      authorizationDetails: resolvedAuthDetails ? String(resolvedAuthDetails).trim() : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isDefault: isDefault !== undefined ? Boolean(isDefault) : true,
    };

    let result;
    if (targetProviderId) {
      result = await prisma.ssmProvider.update({
        where: { id: targetProviderId },
        data: dataPayload,
        include: {
          specialists: {
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          },
          _count: {
            select: { clients: true, specialists: true },
          },
        },
      });
    } else {
      result = await prisma.ssmProvider.create({
        data: dataPayload,
        include: {
          specialists: true,
          _count: {
            select: { clients: true, specialists: true },
          },
        },
      });
    }

    try {
      await logAuditEvent({
        actorName: 'Operator Intern',
        action: 'update',
        entityType: 'SsmProvider',
        entityId: result.id,
        details: {
          message: 'Actualizare date profil prestator SSM / acreditare ITM',
          providerName: result.name,
          cui: result.cui,
        },
      });
    } catch (auditErr) {
      console.warn('Could not record audit event:', auditErr);
    }

    return NextResponse.json({ success: true, provider: result });
  } catch (err: unknown) {
    console.error('PUT /api/settings/provider error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la actualizarea profilului prestatorului.' },
      { status: 500 }
    );
  }
}
