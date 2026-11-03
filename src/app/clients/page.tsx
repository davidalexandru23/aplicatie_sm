import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Building2, Users, Briefcase, MapPin, ArrowRight, UploadCloud, Download, ShieldCheck } from 'lucide-react';
import { ClientIntakeModal } from '@/components/client-intake-modal';

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
            Gestiunea dosarului complet per firmă: profil CAEN, numiri statutare, angajați, evaluări de risc și documente emise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClientIntakeModal />
          <Link
            href="/imports/new"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-3.5 py-2 rounded-lg transition"
          >
            <UploadCloud className="w-4 h-4 text-slate-600" />
            <span>Import din Excel</span>
          </Link>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există firme cliente înregistrate</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Înregistrează un client nou prin formularul dedicat sau importă un fișier Excel cu registrul de salariați.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <ClientIntakeModal />
            <Link
              href="/imports/new"
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              <UploadCloud className="w-4 h-4 text-slate-600" />
              <span>Încarcă Registrul Client</span>
            </Link>
          </div>
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
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      c.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.isActive ? 'ACTIV' : 'INACTIV'}
                  </span>
                </div>

                {/* CAEN Profile Tag & Year */}
                {c.caenCode && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      CAEN {c.caenCode}
                    </span>
                    {c.foundedYear && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Înființată în {c.foundedYear}
                      </span>
                    )}
                  </div>
                )}
                {c.caenActivity && (
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic" title={c.caenActivity}>
                    {c.caenActivity}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-xs text-slate-500">
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
                  {c.ssmProviderName && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">SEPP: {c.ssmProviderName}</span>
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
                  <span>Deschide Dosar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/clients/${c.id}/export`}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 inline-flex items-center gap-1 font-medium transition"
                    download
                    title="Exportă registrul complet în Excel"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </a>
                  <Link
                    href={`/imports/new?clientId=${c.id}`}
                    className="text-[11px] text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200"
                    title="Actualizează datele firmei prin import Excel"
                  >
                    Import
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
