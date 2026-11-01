import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { 
  Building2, 
  Users, 
  FileText, 
  AlertTriangle, 
  UploadCloud, 
  ShieldCheck, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [
    clientCount,
    employeeCount,
    activeEmployeeCount,
    templateCount,
    documentCount,
    recentDocs,
    recentImports
  ] = await Promise.all([
    prisma.client.count(),
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIV' } }),
    prisma.template.count(),
    prisma.generatedDocument.count(),
    prisma.generatedDocument.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { client: true, template: true },
    }),
    prisma.importBatch.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Panou de Control — Servicii SSM & Igienă
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiunea dosarelor de securitate în muncă, import registru client și generare automată a celor 25 de șabloane oficiale.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/imports/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Registru Excel</span>
          </Link>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-sm px-4 py-2.5 rounded-lg transition"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Catalog 25 Șabloane</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{clientCount}</div>
            <div className="text-xs text-slate-500 font-medium">Firme Cliente Înregistrate</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {activeEmployeeCount} <span className="text-xs font-normal text-slate-400">/ {employeeCount}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Angajați Activi în Registru</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{templateCount} / 25</div>
            <div className="text-xs text-slate-500 font-medium">Șabloane Mapate & Versionate</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{documentCount}</div>
            <div className="text-xs text-slate-500 font-medium">Documente SSM Pregătite</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Documents & Recent Imports */}
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
                  <div key={doc.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0 pr-4">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {doc.title}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{doc.client.name}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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

        {/* Recent Imports */}
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
                  <div key={imp.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {imp.filename}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {imp.client.name} • {imp.rowCount} rânduri • {imp.newCount} noi, {imp.updatedCount} actualizate
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(imp.createdAt).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
