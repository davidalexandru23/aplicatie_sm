import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = await prisma.hygieneSession.findMany({
    orderBy: { sessionDate: 'desc' },
    select: {
      id: true,
      providerName: true,
      sessionDate: true,
      examDate: true,
      location: true,
      status: true,
      participants: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return NextResponse.json(sessions);
}
