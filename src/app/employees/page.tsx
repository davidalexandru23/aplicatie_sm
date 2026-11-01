import { prisma } from '@/lib/prisma';
import { maskCNP } from '@/lib/security';
import Link from 'next/link';
import { Users, Building2, MapPin, Briefcase, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
    include: {
      client: true,
      currentJob: true,
      currentWorksite: true,
      identityDocument: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Registrul Centralizat al Angajaților</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența nominală a salariaților, conformitatea actelor de identitate, adresele de domiciliu și documentele SSM asociate.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          Total angajați: <span className="font-bold text-slate-900">{employees.length}</span>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există angajați înregistrați</h3>
          <p className="text-xs text-slate-500 mt-1">
            Încarcă registrul <code className="text-blue-600 font-mono">Model_date_client_SSM.xlsx</code> pentru a popula registrul.
          </p>
          <Link
            href="/imports/new"
            className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition"
          >
            <span>Încarcă Registrul Client</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Salariat</th>
                  <th className="px-4 py-3">Firmă Angajatoare</th>
                  <th className="px-4 py-3">CNP (GDPR Mascat)</th>
                  <th className="px-4 py-3">Funcție / Post</th>
                  <th className="px-4 py-3">Punct de Lucru</th>
                  <th className="px-4 py-3">Data Angajării</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Documente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {emp.lastName} {emp.firstName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {emp.identityDocument ? `${emp.identityDocument.docType} ${emp.identityDocument.series || ''} ${emp.identityDocument.number}` : 'Fără act consemnat'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/clients/${emp.clientId}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {emp.client.name}
                      </Link>
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
                        href={`/documents/generate?clientId=${emp.clientId}&employeeId=${emp.id}&templateCode=hr-cerere-angajare`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        Cerere
                      </Link>
                      <Link
                        href={`/documents/generate?clientId=${emp.clientId}&employeeId=${emp.id}&templateCode=hr-declaratie-regulament`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        Declarație
                      </Link>
                      <Link
                        href={`/documents/generate?clientId=${emp.clientId}&employeeId=${emp.id}&templateCode=hr-cim-2026`}
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
        </div>
      )}
    </div>
  );
}
