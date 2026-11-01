import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { maskCNP } from '@/lib/security';
import { 
  Building2, 
  Users, 
  Briefcase, 
  MapPin, 
  FileText, 
  UploadCloud, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  Download,
  Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      worksites: { orderBy: { name: 'asc' } },
      jobs: { orderBy: { title: 'asc' } },
      employees: {
        orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
        include: {
          currentJob: true,
          currentWorksite: true,
          identityDocument: true,
          residenceAddress: true,
        },
      },
      generatedDocuments: {
        orderBy: { createdAt: 'desc' },
        include: { template: true },
      },
      riskAssessments: {
        include: {
          riskItems: true,
          preventionMeasures: true,
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const activeEmployees = client.employees.filter((e) => e.status === 'ACTIV');

  return (
    <div className="space-y-8">
      {/* Client Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {client.name}
            </h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              client.isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {client.isActive ? 'CLIENT ACTIV' : 'INACTIV'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mt-4 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block">CUI / CIF:</span>
              <span className="font-mono font-semibold text-slate-900">{client.cui}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Nr. Reg. Comerț:</span>
              <span className="font-medium text-slate-900">{client.regCom || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Reprezentant Legal:</span>
              <span className="font-medium text-slate-900">{client.legalRepresentative || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Persoană Contact:</span>
              <span className="font-medium text-slate-900">
                {client.contactPerson || '—'} {client.contactPhone && `(${client.contactPhone})`}
              </span>
            </div>
            <div className="col-span-2 md:col-span-4 mt-1 flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{client.address}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto">
          <a
            href={`/api/clients/${client.id}/export`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            download
          >
            <Download className="w-4 h-4" />
            <span>Exportă Registru Excel</span>
          </a>
          <Link
            href={`/imports/new?clientId=${client.id}`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import / Actualizare Excel</span>
          </Link>
          <Link
            href={`/documents/generate?clientId=${client.id}`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Generează Document</span>
          </Link>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Angajați Activi</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {activeEmployees.length} <span className="text-xs text-slate-400 font-normal">/ {client.employees.length} total</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Puncte de Lucru</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{client.worksites.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Posturi / Funcții</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{client.jobs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Documente SSM Emise</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{client.generatedDocuments.length}</div>
        </div>
      </div>

      {/* Section 1: Employees */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Angajați Înregistrați ({client.employees.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            CNP mascat conform GDPR (nu se expune în URL/loguri)
          </span>
        </div>

        {client.employees.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Niciun angajat înregistrat. Importă fișierul <code className="text-blue-600">Model_date_client_SSM.xlsx</code>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Nume & Prenume</th>
                  <th className="px-4 py-3">CNP (Mascat)</th>
                  <th className="px-4 py-3">Funcție / Post</th>
                  <th className="px-4 py-3">Punct de Lucru</th>
                  <th className="px-4 py-3">Data Angajării</th>
                  <th className="px-4 py-3">Curs Igienă</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Acțiuni Documente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {client.employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {emp.lastName} {emp.firstName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {maskCNP(emp.cnp)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {emp.currentJob?.title || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {emp.currentWorksite?.name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('ro-RO') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {emp.hygieneRequested ? (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          SOLICITAT
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Nu</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        emp.status === 'ACTIV'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <Link
                        href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-cerere-angajare`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        Cerere
                      </Link>
                      <Link
                        href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-declaratie-regulament`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        Declarație RI
                      </Link>
                      <Link
                        href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-cim-2026`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        CIM
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two Column Layout: Worksites & Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Worksites */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Puncte de Lucru ({client.worksites.length})</span>
          </h2>
          {client.worksites.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">Nu există puncte definite.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {client.worksites.map((w) => (
                <div key={w.id} className="py-2.5">
                  <div className="font-semibold text-slate-800">{w.name}</div>
                  <div className="text-slate-500 mt-0.5">{w.address}</div>
                  {w.activity && (
                    <div className="text-slate-400 text-[11px] mt-0.5">Activitate: {w.activity}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Jobs / Context */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>Posturi & Context SSM ({client.jobs.length})</span>
          </h2>
          {client.jobs.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">Nu există posturi definite.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {client.jobs.map((j) => (
                <div key={j.id} className="py-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-slate-800">{j.title}</span>
                    {j.corCode && <span className="font-mono text-slate-400 text-[11px]">COR: {j.corCode}</span>}
                  </div>
                  {j.mainActivities && (
                    <div className="text-slate-500 mt-0.5 line-clamp-1">{j.mainActivities}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generated Documents Archive for this Client */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Documente SSM Pregătite & Emise ({client.generatedDocuments.length})</span>
          </h2>
          <Link
            href={`/documents/generate?clientId=${client.id}`}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            + Generează Document Nou
          </Link>
        </div>

        {client.generatedDocuments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nu a fost generat niciun document pentru acest client.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Denumire Document</th>
                  <th className="px-4 py-3">Șablon</th>
                  <th className="px-4 py-3">Data Generării</th>
                  <th className="px-4 py-3">Stare</th>
                  <th className="px-4 py-3 text-right">Descărcare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {client.generatedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {doc.title}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {doc.template.code}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.status === 'approved_for_print'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {doc.status === 'approved_for_print' ? 'Aprobat Tipărire' : 'Draft / Lipsuri'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200"
                      >
                        <Download className="w-3 h-3" />
                        <span>Descarcă</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
