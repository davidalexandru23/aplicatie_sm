import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance } from '@/lib/compliance';

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
      medicalLastExamDate: true,
      medicalIntervalMonths: true,
      medicalFitnessVerdict: true,
      ssmLastTrainingDate: true,
      ssmIntervalMonths: true,
      psiLastTrainingDate: true,
      psiIntervalMonths: true,
      hygieneRequested: true,
      hygieneLastExamDate: true,
      hygieneIntervalMonths: true,
      hygieneCertificateNumber: true,
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

  const enriched = employees.map((emp) => ({
    ...emp,
    compliance: calculateEmployeeCompliance(emp),
  }));

  return NextResponse.json(enriched);
}
