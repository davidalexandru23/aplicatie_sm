import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { TrainingPlannerModal } from '@/components/training-planner-modal';
import { TrainingSessionCard } from '@/components/training/training-session-card';

export const dynamic = 'force-dynamic';

export default async function TrainingsPage() {
  const [events, clients] = await Promise.all([
    prisma.trainingEvent.findMany({
      where: { client: { isActive: true } },
      orderBy: { eventDate: 'desc' },
      include: {
        client: true,
        participants: {
          include: {
            employee: {
              include: {
                currentJob: { select: { title: true } },
              },
            },
          },
        },
      },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        employees: {
          where: { status: 'ACTIV' },
          orderBy: { lastName: 'asc' },
          include: {
            currentJob: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  // Format clients for TrainingPlannerModal
  const plannerClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    cui: c.cui,
    ssmSpecialistName: c.ssmSpecialistName,
    designatedWorkerSsm: c.designatedWorkerSsm,
    psiResponder: c.psiResponder,
    employees: c.employees.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      cnp: e.cnp,
      status: e.status,
      currentJob: e.currentJob,
      ssmLastTrainingDate: e.ssmLastTrainingDate,
      psiLastTrainingDate: e.psiLastTrainingDate,
      ssmIntervalMonths: e.ssmIntervalMonths,
      psiIntervalMonths: e.psiIntervalMonths,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Instruiri SSM &amp; PSI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența sesiunilor de instruire SSM și PSI și actualizarea scadențelor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrainingPlannerModal clients={plannerClients} />
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există sesiuni de instruire înregistrate</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Folosește butonul de mai sus pentru a înregistra o sesiune de instruire SSM sau PSI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => (
            <TrainingSessionCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
