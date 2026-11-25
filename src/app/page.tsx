import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { 
  Building2, 
  Users, 
  FileText, 
  AlertTriangle, 
  UploadCloud, 
  ShieldCheck, 
  ShieldAlert,
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ArrowRight,
  ShieldAlert as RiskIcon,
  GraduationCap
} from 'lucide-react';
import { 
  calculateCompanyMetrics, 
  calculateEmployeeCompliance 
} from '@/lib/compliance';
import { 
  ComplianceAlerts, 
  FlatComplianceAlert 
} from '@/components/compliance-alerts';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('ssm_session')?.value;
  const session = sessionCookie ? parseSessionFromCookieHeader(`ssm_session=${sessionCookie}`) : null;

  // IGIENA are acces dedicat pe modulul de igienă
  if (session?.role === 'IGIENA') {
    redirect('/hygiene');
  }

  const isSsmRole = session?.role === 'SSM';
  const [
    clientCount,
    employeeCount,
    activeEmployeeCount,
    templateCount,
    documentCount,
    recentDocs,
    recentImports,
    clientsWithEmployees,
  ] = await Promise.all([
    prisma.client.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { client: { isActive: true } } }),
    prisma.employee.count({ where: { status: 'ACTIV', client: { isActive: true } } }),
    prisma.template.count(),
    prisma.generatedDocument.count({ where: { client: { isActive: true } } }),
    prisma.generatedDocument.findMany({
      where: { client: { isActive: true } },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { client: true, template: true },
    }),
    prisma.importBatch.findMany({
      where: { client: { isActive: true } },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      include: {
        employees: {
          where: { status: 'ACTIV' },
          include: {
            currentJob: true,
            currentWorksite: true,
          },
          orderBy: { lastName: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Colectare toți angajații activi pentru calculul metricilor globale
  const allActiveEmployees = clientsWithEmployees.flatMap((c) => c.employees);
  const globalCompliance = calculateCompanyMetrics(allActiveEmployees);

  // Extragere alerte plate pentru componenta ComplianceAlerts
  const overdueAlerts: FlatComplianceAlert[] = [];
  const upcomingAlerts: FlatComplianceAlert[] = [];
  const missingAlerts: FlatComplianceAlert[] = [];

  for (const client of clientsWithEmployees) {
    for (const emp of client.employees) {
      const summary = calculateEmployeeCompliance(emp);

      const itemsToCheck: Array<{
        type: 'medical' | 'ssm' | 'psi' | 'hygiene';
        res: typeof summary.occupationalMedicine;
        legalRef: string;
      }> = [
        { type: 'medical', res: summary.occupationalMedicine, legalRef: 'HG 355/2007' },
        { type: 'ssm', res: summary.ssmTraining, legalRef: 'Legea 319/2006' },
        { type: 'psi', res: summary.psiTraining, legalRef: 'Legea 307/2006' },
      ];

      if (summary.hygieneCertificate !== null) {
        itemsToCheck.push({
          type: 'hygiene',
          res: summary.hygieneCertificate,
          legalRef: 'Ord. 2209/2022',
        });
      }

      for (const item of itemsToCheck) {
        const flat: FlatComplianceAlert = {
          id: `${emp.id}-${item.type}`,
          employeeId: emp.id,
          employeeName: summary.employeeName,
          clientId: client.id,
          clientName: client.name,
          jobTitle: emp.currentJob?.title,
          type: item.type,
          label: item.res.label,
          status: item.res.status,
          dueDate: item.res.dueDate,
          daysRemaining: item.res.daysRemaining,
          lastDate: item.res.lastDate,
          legalRef: item.legalRef,
        };

        if (item.res.status === 'OVERDUE') {
          overdueAlerts.push(flat);
        } else if (item.res.status === 'UPCOMING') {
          upcomingAlerts.push(flat);
        } else if (item.res.status === 'MISSING') {
          missingAlerts.push(flat);
        }
      }
    }
  }

  // Sortare: Cele mai depășite termene primele
  overdueAlerts.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));
  // Sortare: Cele mai apropiate scadențe primele
  upcomingAlerts.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));

  // Calcul metrici per firmă client pentru portofoliu (sortate de la cel mai mic scor la cel mai mare)
  const clientPortfolio = clientsWithEmployees.map((c) => ({
    client: c,
    metrics: calculateCompanyMetrics(c.employees),
  })).sort((a, b) => a.metrics.complianceScorePercent - b.metrics.complianceScorePercent);

  return (
    <div className="space-y-8">
      {/* 1. Hero Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Panou de Control Executiv — SSM & Igienă
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Centru de monitorizare proactivă a scadențelor legale (HG 355/2007, Legea 319/2006, Legea 307/2006, Ordinul 2209/2022) și generare documente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/employees"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <Users className="w-4 h-4" />
            <span>Registru Salariați</span>
          </Link>
          {!isSsmRole ? (
            <Link
              href="/imports/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Registru Excel</span>
            </Link>
          ) : (
            <Link
              href="/risk-assessments"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Evaluare Riscuri SSM</span>
            </Link>
          )}
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-lg transition"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Catalog 25 Șabloane</span>
          </Link>
        </div>
      </div>

      {/* 2. Executive Compliance KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Scor General de Conformitate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="truncate">Scor General Conformitate</span>
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-bold tabular-nums ${
                globalCompliance.complianceScorePercent >= 90
                  ? 'text-emerald-700'
                  : globalCompliance.complianceScorePercent >= 70
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}>
                {globalCompliance.complianceScorePercent}%
              </span>
              <span className="text-xs text-slate-400 truncate">
                ({globalCompliance.validCount}/{globalCompliance.totalItemsTracked} la zi)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  globalCompliance.complianceScorePercent >= 90
                    ? 'bg-emerald-500'
                    : globalCompliance.complianceScorePercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${globalCompliance.complianceScorePercent}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Calculat pe {allActiveEmployees.length} salariați activi
          </div>
        </div>

        {/* Card 2: Termene Depășite (OVERDUE) */}
        <Link
          href="/employees?status=OVERDUE"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="truncate">Termene Depășite</span>
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-rose-700 tabular-nums">
                {globalCompliance.overdueCount}
              </span>
              <span className="text-xs font-semibold text-rose-600 truncate">
                cerințe expirate
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Risc contravențional la control ITM / ISU
            </p>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold mt-3 pt-2 border-t border-slate-100 flex items-center justify-between group-hover:text-slate-900">
            <span>Vezi în Registru</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          </div>
        </Link>

        {/* Card 3: Scadențe Iminente (UPCOMING <= 30z) */}
        <Link
          href="/employees?status=UPCOMING"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="truncate">Scadențe Iminente (&le;30z)</span>
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-amber-700 tabular-nums">
                {globalCompliance.upcomingCount}
              </span>
              <span className="text-xs font-semibold text-amber-600 truncate">
                în atenție
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Necesită programare medicină sau sesiune instruire
            </p>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold mt-3 pt-2 border-t border-slate-100 flex items-center justify-between group-hover:text-slate-900">
            <span>Planifică scadențe</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          </div>
        </Link>

        {/* Card 4: Date Lipsă / Dosare Incomplete (MISSING) */}
        <Link
          href="/employees?status=MISSING"
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition flex flex-col justify-between group min-w-0"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="truncate">Dosare Incomplete</span>
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-slate-800 tabular-nums">
                {globalCompliance.missingCount}
              </span>
              <span className="text-xs font-medium text-slate-500 truncate">
                date lipsă
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Salariați fără examen inițial sau instructaj consemnat
            </p>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold mt-3 pt-2 border-t border-slate-100 flex items-center justify-between group-hover:text-slate-900">
            <span>Completează dosare</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          </div>
        </Link>
      </div>

      {/* 3. Operational Counts Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <div>
          <span className="text-slate-400 block font-medium">Firme Cliente:</span>
          <span className="font-bold text-slate-800 text-sm">{clientCount} companii</span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Salariați înregistrați:</span>
          <span className="font-bold text-slate-800 text-sm">
            {activeEmployeeCount} activi <span className="font-normal text-slate-400">({employeeCount} total)</span>
          </span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Șabloane Oficiale:</span>
          <span className="font-bold text-slate-800 text-sm">{templateCount} / 25 mapate</span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Documente SSM Pregătite:</span>
          <span className="font-bold text-slate-800 text-sm">{documentCount} documente emise</span>
        </div>
      </div>

      {/* 4. Priority Compliance Alerts (Interactive Component) */}
      <ComplianceAlerts
        overdueAlerts={overdueAlerts}
        upcomingAlerts={upcomingAlerts}
        missingAlerts={missingAlerts}
        totalActiveEmployees={allActiveEmployees.length}
      />

      {/* 5. Company Compliance Portfolio (Situație per Firmă Client) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/75">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Portofoliu Firme Cliente — Scoruri de Conformitate SSM</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinteza nivelului de conformitate legală pe fiecare persoană juridică administrată
            </p>
          </div>
          <Link
            href="/clients"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
          >
            Vezi toți clienții ({clientCount}) &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Firmă Client</th>
                <th className="px-4 py-3">Salariați Activi</th>
                <th className="px-4 py-3">Scor Conformitate</th>
                <th className="px-4 py-3">Restanțe (OVERDUE)</th>
                <th className="px-4 py-3">Scadențe (&le; 30z)</th>
                <th className="px-4 py-3 text-right">Dosar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {clientPortfolio.map(({ client, metrics }) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-3.5">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {client.name}
                    </Link>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      CUI: {client.cui}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">
                    {metrics.totalEmployees}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            metrics.complianceScorePercent >= 90
                              ? 'bg-emerald-500'
                              : metrics.complianceScorePercent >= 70
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${metrics.complianceScorePercent}%` }}
                        />
                      </div>
                      <span className="font-bold font-mono text-slate-900">
                        {metrics.complianceScorePercent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {metrics.overdueCount > 0 ? (
                      <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold font-mono">
                        {metrics.overdueCount} depășite
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {metrics.upcomingCount > 0 ? (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium font-mono">
                        {metrics.upcomingCount} scadențe
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    >
                      Deschide &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Two Column Layout: Recent Documents & Recent Imports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Generated Docs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Ultimele Documente Emise</span>
              </h2>
              <Link href="/documents" className="text-xs text-blue-600 hover:underline font-medium">
                Vezi toate ({documentCount})
              </Link>
            </div>

            {recentDocs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Nu există documente generate recent.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {doc.title}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="truncate">{doc.client.name}</span>
                        <span>•</span>
                        <span className="shrink-0">{new Date(doc.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        doc.status === 'approved_for_print'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {doc.status === 'approved_for_print' ? 'Aprobat Tipărire' : 'Draft / Lipsuri'}
                      </span>
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200"
                      >
                        Descarcă
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Imports sau Modul SSM */}
        {!isSsmRole ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  <span>Istoric Importuri Registru</span>
                </h2>
                <Link href="/imports/new" className="text-xs text-blue-600 hover:underline font-medium">
                  Import nou
                </Link>
              </div>

              {recentImports.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Nu s-a efectuat niciun import până în prezent.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentImports.map((imp) => (
                    <div key={imp.id} className="py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {imp.filename}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {imp.client.name} • {imp.rowCount} rânduri • {imp.newCount} noi, {imp.updatedCount} actualizate
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">
                        {new Date(imp.createdAt).toLocaleDateString('ro-RO')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Panou Operațiuni SSM & Prevenire</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">Modul SSM</span>
              </div>
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Evaluare Riscuri Profesionale</h3>
                    <p className="text-[11px] text-slate-500">Fișe de evaluare riscuri pe locuri de muncă conform Legii 319/2006</p>
                  </div>
                  <Link href="/risk-assessments" className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 hover:bg-emerald-100 shrink-0">
                    Deschide
                  </Link>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Instruiri & Tematici SSM</h3>
                    <p className="text-[11px] text-slate-500">Fișe instruire individuală, tematici introductiv-generale și la locul de muncă</p>
                  </div>
                  <Link href="/trainings" className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-100 shrink-0">
                    Deschide
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
