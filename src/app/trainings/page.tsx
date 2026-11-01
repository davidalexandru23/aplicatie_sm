import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Clock, Users, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TrainingsPage() {
  const events = await prisma.trainingEvent.findMany({
    orderBy: { eventDate: 'desc' },
    include: {
      client: true,
      participants: {
        include: { employee: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Instruiri SSM & Biblioteca de Instrucțiuni Proprii (IPSSM)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența sesiunilor de instruire consemnate conform HG 1425/2006. Generarea documentului distinge data instruirii de data tipăririi și permite arhivarea scanului semnat olograf.
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există sesiuni de instruire înregistrate</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Poți genera oricând fișele de instruire, tematicile introductiv-generale sau OPIS-ul de IPSSM din secțiunea Catalog Șabloane.
          </p>
          <Link
            href="/templates"
            className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition"
          >
            <span>Vezi Șabloanele de Instruire</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{ev.materialOrTopic}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">{ev.client.name}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  {ev.type.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400">Data efectuării:</span>
                  <div className="font-semibold text-slate-900">
                    {new Date(ev.eventDate).toLocaleDateString('ro-RO')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Durată:</span>
                  <div className="font-semibold text-slate-900">{ev.durationHours} ore</div>
                </div>
                <div>
                  <span className="text-slate-400">Participanți:</span>
                  <div className="font-semibold text-slate-900">{ev.participants.length}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs flex justify-between items-center text-slate-500">
                <span>Instructor: {ev.instructorName}</span>
                <span className="capitalize">{ev.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
