import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ShieldAlert, AlertTriangle, CheckCircle2, Building2, FileText, ArrowRight, Activity, Wrench } from 'lucide-react';
import { CAEN_RISK_PROFILES } from '@/lib/risk/caen-risk-presets';
import { CreateRiskAssessmentModal } from '@/components/risk/create-risk-assessment-modal';
import { EditRiskAssessmentModal } from '@/components/risk/edit-risk-assessment-modal';

export const dynamic = 'force-dynamic';

export default async function RiskAssessmentsPage() {
  const [assessments, clients] = await Promise.all([
    prisma.riskAssessment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        job: true,
        worksite: true,
        riskItems: {
          orderBy: { sortOrder: 'asc' },
        },
        preventionMeasures: true,
        hazardZones: true,
      },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { jobs: { orderBy: { title: 'asc' } } },
    }),
  ]);

  const presetEntries = Object.entries(CAEN_RISK_PROFILES);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Evaluări de Riscuri Profesionale & Planuri de Prevenire</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența evaluărilor structurate de risc conform Legii 319/2006 și HG 1425/2006. Metoda INCDPM (Pece) cu corelație automată a măsurilor de prevenire și protecție pe profiluri CAEN.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateRiskAssessmentModal clients={clients} />
          <Link
            href="/documents/generate?templateCode=risk-evaluare"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Generează Evaluare Risc DOCX</span>
          </Link>
          <Link
            href="/documents/generate?templateCode=risk-plan-prevenire-tesa"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Generează Plan Prevenire DOCX</span>
          </Link>
        </div>
      </div>

      {/* Evaluări de Risc Înregistrate */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Dosare de Evaluare Înregistrate ({assessments.length})</span>
          </h2>
        </div>

        {assessments.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">Nu există evaluări de risc create în baza de date</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Folosește butonul "+ Creează Evaluare Nouă" de mai sus pentru a înregistra un dosar structurat conform Legii 319/2006.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {assessments.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Client: <strong className="text-slate-700">{a.client.name}</strong></span>
                      {a.job && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                          {a.job.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                      Metoda {a.method} v{a.version}
                    </span>
                    <EditRiskAssessmentModal assessment={a as any} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Factori risc:</span>
                    <div className="font-bold text-slate-900">{a.riskItems.length}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Măsuri:</span>
                    <div className="font-bold text-slate-900">{a.preventionMeasures.length}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Zone pericol:</span>
                    <div className="font-bold text-slate-900">{a.hazardZones?.length || 0}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2 text-xs">
                  <span className="text-slate-400">Evaluator: {a.evaluatorName || 'Specialist SSM'}</span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/documents/generate?clientId=${a.clientId}&assessmentId=${a.id}${a.jobId ? `&jobId=${a.jobId}` : ''}&templateCode=risk-evaluare`}
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      Raport DOCX →
                    </Link>
                    <Link
                      href={`/documents/generate?clientId=${a.clientId}&assessmentId=${a.id}${a.jobId ? `&jobId=${a.jobId}` : ''}&templateCode=risk-plan-prevenire-tesa`}
                      className="font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Plan DOCX →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profiluri de Risc CAEN & Măsuri de Prevenire Statutare (INCDPM) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-500" />
              <span>Profiluri de Risc Sectoriale CAEN (Metoda INCDPM București)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Factorii de risc și măsurile de prevenire sunt corelate automat pe baza codului CAEN al clientului și a postului de lucru selectat.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presetEntries.map(([caen, profile]) => {
            const execCount = profile.factors.filter((f) => f.element === 'EXECUTANT').length;
            const sarcCount = profile.factors.filter((f) => f.element === 'SARCINA').length;
            const mijCount = profile.factors.filter((f) => f.element === 'MIJLOACE').length;
            const medCount = profile.factors.filter((f) => f.element === 'MEDIU').length;

            return (
              <div
                key={caen}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      CAEN {caen}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{profile.industryName}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Nivel Risc</span>
                    <span className="text-sm font-black text-slate-800">{profile.globalRiskScore.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Exec.</span>
                    <span className="font-bold text-slate-700">{execCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sarc.</span>
                    <span className="font-bold text-slate-700">{sarcCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Mijl.</span>
                    <span className="font-bold text-slate-700">{mijCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Mediu</span>
                    <span className="font-bold text-slate-700">{medCount}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total: {profile.factors.length} factori</span>
                  <Link
                    href={`/documents/generate?templateCode=risk-plan-prevenire-tesa`}
                    className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>Generează Plan</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
