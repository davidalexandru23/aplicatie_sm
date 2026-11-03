import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock, Users, Building2, Flame, ShieldCheck } from 'lucide-react';
import { TrainingPlannerModal } from '@/components/training-planner-modal';

export const dynamic = 'force-dynamic';

export default async function TrainingsPage() {
  const [events, clients] = await Promise.all([
    prisma.trainingEvent.findMany({
      orderBy: { eventDate: 'desc' },
      include: {
        client: true,
        participants: {
          include: { employee: true },
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
            <span>Instruiri SSM & Situații de Urgență (Legea 319/2006, OMAI 712/2005)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Planificarea și consemnarea sesiunilor de instruire (introductiv-generală, la locul de muncă, periodică SSM și PSI), cu resetarea automată a scadențelor salariaților participanți.
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
            Înregistrează prima sesiune de instruire SSM sau PSI pentru a actualiza automat scadențele legale ale salariaților.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <TrainingPlannerModal clients={plannerClients} />
            <Link
              href="/templates"
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
            >
              <span>Vezi Șabloanele de Instruire</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => {
            const isPsi = ev.type === 'PERIODIC_PSI' || ev.type === 'suplimentar';
            return (
              <div key={ev.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">{ev.materialOrTopic}</h2>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">{ev.client.name}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap ${
                      isPsi
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {ev.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Data efectuării</span>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {new Date(ev.eventDate).toLocaleDateString('ro-RO')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Durată</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{ev.durationHours} ore</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Participanți</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{ev.participants.length} salariați</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs flex justify-between items-center text-slate-500">
                  <span>Formator / Instructor: <strong className="text-slate-700">{ev.instructorName}</strong></span>
                  <span className="capitalize text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {ev.status === 'recorded' ? 'Consemnat' : ev.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
