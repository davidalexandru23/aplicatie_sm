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

        // SEPP Provider Details
        ...(ssmProviderName !== undefined && {
          ssmProviderName: ssmProviderName ? String(ssmProviderName).trim() : null,
        }),
        ...(ssmSpecialistName !== undefined && {
          ssmSpecialistName: ssmSpecialistName ? String(ssmSpecialistName).trim() : null,
        }),
        ...(ssmSpecialistCert !== undefined && {
          ssmSpecialistCert: ssmSpecialistCert ? String(ssmSpecialistCert).trim() : null,
        }),

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
