import { prisma } from '@/lib/prisma';
import { calculateEmployeeCompliance, calculateCompanyMetrics } from '@/lib/compliance';
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

  const [employeesRaw, clients] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      include: {
        client: { select: { id: true, name: true } },
        currentJob: { select: { id: true, title: true } },
        currentWorksite: { select: { id: true, name: true } },
        identityDocument: { select: { docType: true, series: true, number: true } },
      },
    }),
    prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const employees: EmployeeWithCompliance[] = employeesRaw.map((emp) => ({
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    fullName: `${emp.lastName} ${emp.firstName}`,
    cnp: emp.cnp,
    status: emp.status,
    hireDate: emp.hireDate ? emp.hireDate.toISOString() : null,
    medicalFitnessVerdict: emp.medicalFitnessVerdict,
    client: emp.client,
    currentJob: emp.currentJob,
    currentWorksite: emp.currentWorksite,
    identityDocument: emp.identityDocument,
    compliance: calculateEmployeeCompliance(emp),
  }));

  const metrics = calculateCompanyMetrics(employeesRaw);

  return (
    <EmployeeRegistryClient
      employees={employees}
      clients={clients}
      metrics={metrics}
      initialStatus={initialStatus}
    />
  );
}
