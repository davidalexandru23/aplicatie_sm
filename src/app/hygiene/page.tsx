import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Sparkles, Award, FileSpreadsheet, Users, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HygienePage() {
  const sessions = await prisma.hygieneSession.findMany({
    orderBy: { sessionDate: 'desc' },
    include: {
      participants: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Cursuri Noțiuni Fundamentale de Igienă (Metodologia 2022)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența sesiunilor de instruire, cataloage de curs și examen, procese-verbale (Anexele 1-8) și eliberarea adeverințelor nominale de participare.
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există sesiuni de igienă deschise</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            La importul Excelului, salariații care au solicitat curs igienă sunt identificați automat.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/templates"
              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-200 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Pachet Anexe Igienă (XLSX)</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{s.providerName}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">Locație: {s.location}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  {s.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400">Data cursului:</span>
                  <div className="font-semibold text-slate-900">
                    {new Date(s.sessionDate).toLocaleDateString('ro-RO')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Cursanți înscriși:</span>
                  <div className="font-semibold text-slate-900">{s.participants.length}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
