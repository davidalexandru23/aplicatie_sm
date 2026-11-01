import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const employees = await prisma.employee.findMany({
    where: { clientId: id },
    orderBy: { lastName: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      cnp: true,
      status: true,
      currentJob: {
        select: { title: true },
      },
      currentWorksite: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json(employees);
}
