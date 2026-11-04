import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/providers
 * Endpoint optimizat pentru dropdown-uri de prestatori și specialiști în formularele de clienți
 * (ClientIntakeModal, ClientEditModal).
 * Returnează prestatorii activi și specialiștii activi ai fiecăruia, ordonați cu prestatorul/specialistul
 * implicit pe prima poziție.
 */
export async function GET() {
  try {
    const providers = await prisma.ssmProvider.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        cui: true,
        regCom: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        authorizationNumber: true,
        authorizationDate: true,
        authorizationDetails: true,
        legalRepresentative: true,
        representativeRole: true,
        isDefault: true,
        specialists: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          select: {
            id: true,
            providerId: true,
            name: true,
            role: true,
            certificateNumber: true,
            qualification: true,
            phone: true,
            email: true,
            isDefault: true,
          },
        },
      },
    });

    return NextResponse.json(providers);
  } catch (err: unknown) {
    console.error('GET /api/providers error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare la preluarea listei de prestatori SSM.' },
      { status: 500 }
    );
  }
}
