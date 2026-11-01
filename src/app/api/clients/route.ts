import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      cui: true,
      address: true,
      contactPerson: true,
      isActive: true,
      _count: {
        select: {
          employees: true,
          jobs: true,
          worksites: true,
        },
      },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, cui, regCom, address, legalRepresentative, contactPerson, contactEmail, contactPhone } = body;

    if (!name || !cui || !address) {
      return NextResponse.json(
        { error: 'Denumirea, CUI-ul și sediul social sunt obligatorii.' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        cui: cui.trim(),
        regCom,
        address,
        legalRepresentative,
        contactPerson,
        contactEmail,
        contactPhone,
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
