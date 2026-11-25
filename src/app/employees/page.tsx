import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance, calculateCompanyMetrics } from '@/lib/compliance';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME, UserRole } from '@/lib/auth';
import { 
  EmployeeRegistryClient, 
  EmployeeWithCompliance 
} from './employee-registry-client';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; filter?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialStatus = resolvedSearchParams?.status || resolvedSearchParams?.filter;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;
  const userRole: UserRole = session?.role || 'ADMIN';

  const [employeesRaw, clients] = await Promise.all([
    prisma.employee.findMany({
      where: { client: { isActive: true } },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      include: {
        client: { select: { id: true, name: true } },
        currentJob: { select: { id: true, title: true } },
        currentWorksite: { select: { id: true, name: true } },
        identityDocument: { select: { docType: true, series: true, number: true } },
        residenceAddress: true,
      },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        jobs: { select: { id: true, title: true } },
        worksites: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const employees: EmployeeWithCompliance[] = employeesRaw.map((emp) => {
    const isSsm = userRole === 'SSM';
    return {
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.lastName} ${emp.firstName}`,
      cnp: isSsm ? null : emp.cnp,
      status: emp.status,
      hireDate: emp.hireDate ? emp.hireDate.toISOString() : null,
      leaveDate: emp.leaveDate ? emp.leaveDate.toISOString() : null,
      medicalLastExamDate: emp.medicalLastExamDate ? emp.medicalLastExamDate.toISOString() : null,
      medicalIntervalMonths: emp.medicalIntervalMonths,
      medicalFitnessVerdict: emp.medicalFitnessVerdict,
      medicalNotes: emp.medicalNotes,
      client: emp.client,
      currentJob: emp.currentJob,
      currentWorksite: emp.currentWorksite,
      identityDocument: isSsm ? null : emp.identityDocument,
      commuteTransport: emp.commuteTransport,
      commuteDurationMinutes: emp.commuteDurationMinutes,
      commuteRoute: emp.commuteRoute,
      residenceAddress: isSsm ? null : emp.residenceAddress,
      compliance: calculateEmployeeCompliance(emp),
    };
  });

  const metrics = calculateCompanyMetrics(employeesRaw);

  return (
    <EmployeeRegistryClient
      employees={employees}
      clients={clients}
      metrics={metrics}
      initialStatus={initialStatus}
      userRole={userRole}
    />
  );
}
