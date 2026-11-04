import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCaenCode, getCaenEntry } from '@/lib/caen-catalog';
import { logAuditEvent } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        worksites: { orderBy: { name: 'asc' } },
        jobs: { orderBy: { title: 'asc' } },
        provider: true,
        specialist: true,
        _count: {
          select: {
            employees: true,
            jobs: true,
            worksites: true,
            generatedDocuments: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea clientului.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return NextResponse.json({ error: 'Clientul nu a fost găsit.' }, { status: 404 });
    }

    const {
      name,
      cui,
      regCom,
      address,
      legalRepresentative,
      contactPerson,
      contactEmail,
      contactPhone,
      isActive,
      caenCode,
      caenActivity,
      foundedYear,
      providerId,
      specialistId,
      designatedSpecialistId,
      ssmProviderName,
      ssmSpecialistName,
      ssmSpecialistCert,
      designatedWorkerSsm,
      firstAidResponder,
      psiResponder,
      investigationMembers,
      decisionsDate,
    } = body;

    // Check CUI uniqueness if changed
    if (cui !== undefined && cui !== null) {
      const cleanCui = String(cui).trim().toUpperCase();
      if (cleanCui !== existingClient.cui) {
        const duplicate = await prisma.client.findFirst({
          where: { cui: cleanCui, NOT: { id } },
        });
        if (duplicate) {
          return NextResponse.json(
            { error: `Un alt client folosește deja CUI-ul ${cleanCui} (${duplicate.name}).` },
            { status: 409 }
          );
        }
      }
    }

    // Parse foundedYear safely
    let parsedYear: number | null | undefined = undefined;
    if (foundedYear !== undefined) {
      if (foundedYear === null || foundedYear === '') {
        parsedYear = null;
      } else {
        const y = parseInt(String(foundedYear), 10);
        parsedYear = isNaN(y) ? null : y;
      }
    }

    // Normalize CAEN code
    let normalizedCaen: string | null | undefined = undefined;
    let resolvedCaenActivity = caenActivity;

    if (caenCode !== undefined) {
      if (caenCode === null || caenCode === '') {
        normalizedCaen = null;
      } else {
        normalizedCaen = normalizeCaenCode(String(caenCode));
        if (
          normalizedCaen &&
          (resolvedCaenActivity === undefined || resolvedCaenActivity === null || resolvedCaenActivity === '')
        ) {
          const entry = getCaenEntry(normalizedCaen);
          if (entry) {
            resolvedCaenActivity = entry.name;
          }
        }
      }
    }

    // Parse decisionsDate safely
    let parsedDecisionsDate: Date | null | undefined = undefined;
    if (decisionsDate !== undefined) {
      if (decisionsDate === null || decisionsDate === '') {
        parsedDecisionsDate = null;
      } else {
        const d = new Date(decisionsDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Format dată decizii invalid.' }, { status: 400 });
        }
        parsedDecisionsDate = d;
      }
    }

    // Resolve Provider & Specialist with dual string synchronization
    let targetProviderId: string | null | undefined = undefined;
    let syncedProviderName = ssmProviderName !== undefined ? (ssmProviderName ? String(ssmProviderName).trim() : null) : undefined;

    if (providerId !== undefined) {
      if (providerId === null || providerId === '') {
        targetProviderId = null;
      } else {
        const p = await prisma.ssmProvider.findUnique({ where: { id: providerId } });
        if (p) {
          targetProviderId = p.id;
          if (syncedProviderName === undefined) {
            syncedProviderName = p.name;
          }
        } else {
          targetProviderId = null;
        }
      }
    }

    const rawSpecialistId = specialistId !== undefined ? specialistId : designatedSpecialistId;
    let targetSpecialistId: string | null | undefined = undefined;
    let syncedSpecialistName = ssmSpecialistName !== undefined ? (ssmSpecialistName ? String(ssmSpecialistName).trim() : null) : undefined;
    let syncedSpecialistCert = ssmSpecialistCert !== undefined ? (ssmSpecialistCert ? String(ssmSpecialistCert).trim() : null) : undefined;

    if (rawSpecialistId !== undefined) {
      if (rawSpecialistId === null || rawSpecialistId === '') {
        targetSpecialistId = null;
      } else {
        const s = await prisma.ssmSpecialist.findUnique({ where: { id: rawSpecialistId } });
        if (s) {
          targetSpecialistId = s.id;
          if (syncedSpecialistName === undefined) {
            syncedSpecialistName = s.name;
          }
          if (syncedSpecialistCert === undefined) {
            syncedSpecialistCert = s.certificateNumber;
          }
        } else {
          targetSpecialistId = null;
        }
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(cui !== undefined && { cui: String(cui).trim().toUpperCase() }),
        ...(regCom !== undefined && { regCom: regCom ? String(regCom).trim() : null }),
        ...(address !== undefined && { address: String(address).trim() }),
        ...(legalRepresentative !== undefined && {
          legalRepresentative: legalRepresentative ? String(legalRepresentative).trim() : null,
        }),
        ...(contactPerson !== undefined && {
          contactPerson: contactPerson ? String(contactPerson).trim() : null,
        }),
        ...(contactEmail !== undefined && {
          contactEmail: contactEmail ? String(contactEmail).trim() : null,
        }),
        ...(contactPhone !== undefined && {
          contactPhone: contactPhone ? String(contactPhone).trim() : null,
        }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),

        // CAEN & Profiling
        ...(normalizedCaen !== undefined && { caenCode: normalizedCaen }),
        ...(resolvedCaenActivity !== undefined && {
          caenActivity: resolvedCaenActivity ? String(resolvedCaenActivity).trim() : null,
        }),
        ...(parsedYear !== undefined && { foundedYear: parsedYear }),

        // SEPP Provider Details (Dual Persistence)
        ...(targetProviderId !== undefined && { providerId: targetProviderId }),
        ...(targetSpecialistId !== undefined && { specialistId: targetSpecialistId }),
        ...(syncedProviderName !== undefined && { ssmProviderName: syncedProviderName }),
        ...(syncedSpecialistName !== undefined && { ssmSpecialistName: syncedSpecialistName }),
        ...(syncedSpecialistCert !== undefined && { ssmSpecialistCert: syncedSpecialistCert }),

        // Appointees (Deciziile 01-09)
        ...(designatedWorkerSsm !== undefined && {
          designatedWorkerSsm: designatedWorkerSsm ? String(designatedWorkerSsm).trim() : null,
        }),
        ...(firstAidResponder !== undefined && {
          firstAidResponder: firstAidResponder ? String(firstAidResponder).trim() : null,
        }),
        ...(psiResponder !== undefined && {
          psiResponder: psiResponder ? String(psiResponder).trim() : null,
        }),
        ...(investigationMembers !== undefined && {
          investigationMembers: investigationMembers ? String(investigationMembers).trim() : null,
        }),
        ...(parsedDecisionsDate !== undefined && { decisionsDate: parsedDecisionsDate }),
      },
      include: {
        provider: true,
        specialist: true,
      },
    });

    try {
      await logAuditEvent({
        actorName: 'Operator Intern',
        action: 'update',
        entityType: 'Client',
        entityId: id,
        details: {
          message: 'Actualizare date profil client / decizii SSM',
          updatedFields: Object.keys(body),
        },
      });
    } catch (auditErr) {
      console.warn('Could not record audit event:', auditErr);
    }

    return NextResponse.json({
      success: true,
      client: updatedClient,
      ...updatedClient,
    });
  } catch (err: unknown) {
    console.error('PATCH /api/clients/[id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la actualizarea clientului.' },
      { status: 500 }
    );
  }
}
