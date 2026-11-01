import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShieldAlert, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RiskAssessmentsPage() {
  const assessments = await prisma.riskAssessment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      client: true,
      job: true,
      worksite: true,
      riskItems: true,
      preventionMeasures: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Evaluări de Riscuri Profesionale & Planuri de Prevenire</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența evaluărilor structurate de risc conform Legii 319/2006 și HG 1425/2006. Fără generare autonomă de scoruri AI; conținutul și metoda sunt completate și revizuite de specialistul atestat.
          </p>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există evaluări de risc create</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Evaluările de risc se configurează pe bază de post și punct de lucru, generând automat raportul complet și Planul de Prevenire TESA.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assessments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{a.title}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Client: <span className="font-semibold text-slate-700">{a.client.name}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  Metoda {a.method} v{a.version}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400">Factori de risc evaluați:</span>
                  <div className="font-bold text-slate-900">{a.riskItems.length}</div>
                </div>
                <div>
                  <span className="text-slate-400">Măsuri de prevenire:</span>
                  <div className="font-bold text-slate-900">{a.preventionMeasures.length}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Evaluator: {a.evaluatorName || 'Specialist SSM'}</span>
                <Link
                  href={`/documents/generate?clientId=${a.clientId}&templateCode=risk-evaluare`}
                  className="font-semibold text-blue-600 hover:text-blue-800"
                >
                  Generează Raport DOCX →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
