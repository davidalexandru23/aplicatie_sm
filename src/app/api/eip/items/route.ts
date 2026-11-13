import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const protectionType = searchParams.get('protectionType') || searchParams.get('category');

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { standardCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (protectionType) {
      where.protectionType = protectionType;
    }

    const items = await prisma.eipItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la preluarea catalogului EIP.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, standardCode, protectionType, replacementMonths = 12 } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Codul și denumirea articolului EIP sunt obligatorii.' }, { status: 400 });
    }

    if (typeof replacementMonths === 'number' && replacementMonths <= 0) {
      return NextResponse.json({ error: 'Periodicitatea de acordare trebuie să fie pozitivă.' }, { status: 400 });
    }

    const item = await prisma.eipItem.upsert({
      where: { code: code.trim() },
      create: {
        code: code.trim(),
        name: name.trim(),
        standardCode: standardCode?.trim() || null,
        protectionType: protectionType?.trim() || null,
        replacementMonths: Number(replacementMonths) || 12,
      },
      update: {
        name: name.trim(),
        standardCode: standardCode?.trim() || null,
        protectionType: protectionType?.trim() || null,
        replacementMonths: Number(replacementMonths) || 12,
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Eroare la salvarea articolului EIP.' }, { status: 500 });
  }
}
