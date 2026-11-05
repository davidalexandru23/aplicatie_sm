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
      currentJobId: true,
      currentJob: {
        select: {
          id: true,
          title: true,
          corCode: true,
          mainActivities: true,
          equipmentUsed: true,
          workConditions: true,
        },
      },
      currentWorksiteId: true,
      currentWorksite: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  return NextResponse.json(employees);
}
