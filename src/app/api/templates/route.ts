import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: [{ family: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      family: true,
      format: true,
      contextLevel: true,
      status: true,
      manifestJson: true,
    },
  });

  return NextResponse.json(templates);
}
