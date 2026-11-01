import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Building2, Users, Briefcase, MapPin, ArrowRight, Plus, UploadCloud } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          employees: true,
          jobs: true,
          worksites: true,
          generatedDocuments: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Registrul Clienților (Firme Partenere SSM)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestiunea dosarului complet per firmă: puncte de lucru, posturi, angajați, evaluări de risc și documente emise.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/imports/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Nou din Excel</span>
          </Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există firme cliente înregistrate</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Încarcă registrul <code className="text-blue-600 font-mono">Model_date_client_SSM.xlsx</code> pentru a crea automat primul client și toți angajații acestuia.
          </p>
          <Link
            href="/imports/new"
            className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Încarcă Registrul Client</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {c.name}
                  </h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.isActive ? 'ACTIV' : 'INACTIV'}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">CUI:</span>
                    <span className="font-mono">{c.cui}</span>
                    {c.regCom && <span className="text-slate-400">• {c.regCom}</span>}
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="truncate">{c.address}</span>
                  </div>
                  {c.contactPerson && (
                    <div className="text-slate-600">
                      Contact: <span className="font-medium text-slate-800">{c.contactPerson}</span>
                      {c.contactPhone && <span> ({c.contactPhone})</span>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-base font-bold text-slate-900">{c._count.employees}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Angajați</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-base font-bold text-slate-900">{c._count.jobs}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Posturi</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <div className="text-base font-bold text-slate-900">{c._count.generatedDocuments}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Documente</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/clients/${c.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Deschide Dosar Client</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/imports/new?clientId=${c.id}`}
                  className="text-[11px] text-slate-400 hover:text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200"
                >
                  Import Excel
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
