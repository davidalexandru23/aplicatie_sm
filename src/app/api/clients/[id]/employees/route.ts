import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance } from '@/lib/compliance';
import { Prisma } from '@prisma/client';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { sanitizeEmployeeForRole } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const includeTerminated = searchParams.get('includeTerminated') === 'true';
    const statusParam = searchParams.get('status')?.toUpperCase();

    // Base WHERE clause
    const where: Prisma.EmployeeWhereInput = {
      clientId: id,
      client: { isActive: true },
    };

    // Status filtering rules
    if (statusParam === 'PLECAT') {
      where.status = 'PLECAT';
    } else if (statusParam === 'ACTIV') {
      where.status = 'ACTIV';
    } else if (statusParam === 'ALL' || includeTerminated) {
      // No status filter applied: includes both ACTIV and PLECAT
    } else {
      // DEFAULT: Strictly active employees only!
      where.status = { not: 'PLECAT' };
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cnp: true,
        sex: true,
        birthDate: true,
        birthPlace: true,
        birthCounty: true,
        citizenship: true,
        email: true,
        phone: true,
        hireDate: true,
        status: true,
        leaveDate: true,
        medicalLastExamDate: true,
        medicalIntervalMonths: true,
        medicalFitnessVerdict: true,
        medicalNotes: true,
        ssmLastTrainingDate: true,
        ssmIntervalMonths: true,
        ssmNotes: true,
        psiLastTrainingDate: true,
        psiIntervalMonths: true,
        psiNotes: true,
        hygieneRequested: true,
        hygieneLastExamDate: true,
        hygieneIntervalMonths: true,
        hygieneCertificateNumber: true,
        cimNumber: true,
        cimDate: true,
        grossSalary: true,
        workNorm: true,
        probationDays: true,
        annualLeaveDays: true,
        bankIban: true,
        bankName: true,
        bloodType: true,
        rhFactor: true,
        qualification: true,
        commuteRoute: true,
        commuteDurationMinutes: true,
        shoeSize: true,
        clothingSize: true,
        gloveSize: true,
        adminNotes: true,
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
        identityDocument: {
          select: {
            id: true,
            docType: true,
            series: true,
            number: true,
            issuedBy: true,
            issueDate: true,
            expiryDate: true,
          },
        },
        residenceAddress: {
          select: {
            id: true,
            county: true,
            locality: true,
            street: true,
            number: true,
            building: true,
            entrance: true,
            floor: true,
            apartment: true,
            postalCode: true,
          },
        },
        hygieneModules: {
          select: {
            id: true,
            moduleName: true,
            certificateNumber: true,
            examDate: true,
            issueDate: true,
            intervalMonths: true,
            notes: true,
          },
          orderBy: { examDate: 'desc' },
        },
        hygieneParticipants: {
          select: {
            id: true,
            examResult: true,
            attendance: true,
            certificateNumber: true,
            certificateDate: true,
            hygieneModule: true,
            session: {
              select: {
                id: true,
                examDate: true,
                hygieneModule: true,
              },
            },
          },
        },
      },
    });

    const enriched = employees.map((emp) => ({
      ...emp,
      compliance: calculateEmployeeCompliance(emp),
    }));

    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    const role = session?.role || 'ADMIN';
    const sanitized = enriched.map((emp) => sanitizeEmployeeForRole(emp, role));

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Error fetching client employees:', error);
    return NextResponse.json(
      { error: 'Eroare internă la încărcarea salariaților.' },
      { status: 500 }
    );
  }
}
