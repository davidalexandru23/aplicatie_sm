import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeCaenCode, getCaenEntry } from '@/lib/caen-catalog';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        cui: true,
        regCom: true,
        address: true,
        legalRepresentative: true,
        contactPerson: true,
        contactEmail: true,
        contactPhone: true,
        isActive: true,
        caenCode: true,
        caenActivity: true,
        foundedYear: true,
        ssmProviderName: true,
        ssmSpecialistName: true,
        ssmSpecialistCert: true,
        designatedWorkerSsm: true,
        firstAidResponder: true,
        psiResponder: true,
        investigationMembers: true,
        decisionsDate: true,
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

    return NextResponse.json(clients);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea listei de clienți.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!name || !cui || !address) {
      return NextResponse.json(
        { error: 'Denumirea, CUI-ul și sediul social sunt obligatorii.' },
        { status: 400 }
      );
    }

    const cleanCui = String(cui).trim().toUpperCase();

    // Check duplicate CUI
    const existing = await prisma.client.findUnique({
      where: { cui: cleanCui },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Există deja o firmă înregistrată cu acest CUI/CIF (${existing.name}).` },
        { status: 409 }
      );
    }

    // Normalize CAEN code
    let normalizedCaen: string | null = null;
    let resolvedCaenActivity = caenActivity ? String(caenActivity).trim() : null;

    if (caenCode) {
      normalizedCaen = normalizeCaenCode(String(caenCode));
      if (!resolvedCaenActivity && normalizedCaen) {
        const entry = getCaenEntry(normalizedCaen);
        if (entry) {
          resolvedCaenActivity = entry.name;
        }
      }
    }

    // Parse foundedYear safely
    let parsedYear: number | null = null;
    if (foundedYear !== undefined && foundedYear !== null && foundedYear !== '') {
      const y = parseInt(String(foundedYear), 10);
      parsedYear = isNaN(y) ? null : y;
    }

    // Parse decisionsDate safely
    let parsedDecisionsDate: Date | null = null;
    if (decisionsDate !== undefined && decisionsDate !== null && decisionsDate !== '') {
      const d = new Date(decisionsDate);
      parsedDecisionsDate = isNaN(d.getTime()) ? null : d;
    }

    const client = await prisma.client.create({
      data: {
        name: String(name).trim(),
        cui: cleanCui,
        regCom: regCom ? String(regCom).trim() : null,
        address: String(address).trim(),
        legalRepresentative: legalRepresentative ? String(legalRepresentative).trim() : null,
        contactPerson: contactPerson ? String(contactPerson).trim() : null,
        contactEmail: contactEmail ? String(contactEmail).trim() : null,
        contactPhone: contactPhone ? String(contactPhone).trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,

        // CAEN & Profiling
        caenCode: normalizedCaen,
        caenActivity: resolvedCaenActivity,
        foundedYear: parsedYear,

        // SEPP Provider Details
        ssmProviderName: ssmProviderName ? String(ssmProviderName).trim() : null,
        ssmSpecialistName: ssmSpecialistName ? String(ssmSpecialistName).trim() : null,
        ssmSpecialistCert: ssmSpecialistCert ? String(ssmSpecialistCert).trim() : null,

        // Appointees
        designatedWorkerSsm: designatedWorkerSsm ? String(designatedWorkerSsm).trim() : null,
        firstAidResponder: firstAidResponder ? String(firstAidResponder).trim() : null,
        psiResponder: psiResponder ? String(psiResponder).trim() : null,
        investigationMembers: investigationMembers ? String(investigationMembers).trim() : null,
        decisionsDate: parsedDecisionsDate,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la crearea clientului.' },
      { status: 500 }
    );
  }
}
