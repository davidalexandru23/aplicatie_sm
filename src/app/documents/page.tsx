import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FileText, Download, CheckCircle2, AlertTriangle, UploadCloud } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const documents = await prisma.generatedDocument.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      client: true,
      template: true,
      employee: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Arhiva Documentelor SSM Emise</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidența tuturor fișierelor pregătite pentru tipărire, istoricul reviziilor și scanurile semnate olograf pe hârtie.
          </p>
        </div>
        <Link
          href="/documents/generate"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition"
        >
          <span>+ Generează Document Nou</span>
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nu există documente generate</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Folosește generatorul pentru a emite documente SSM pentru o firmă sau un angajat.
          </p>
          <Link
            href="/documents/generate"
            className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition"
          >
            <span>Deschide Generatorul</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Denumire Document</th>
                  <th className="px-4 py-3">Firmă Client</th>
                  <th className="px-4 py-3">Șablon</th>
                  <th className="px-4 py-3">Data Generării</th>
                  <th className="px-4 py-3">Mărime</th>
                  <th className="px-4 py-3">Stare</th>
                  <th className="px-4 py-3 text-right">Descărcare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{doc.title}</div>
                      {doc.employee && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Destinatar: {doc.employee.lastName} {doc.employee.firstName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/clients/${doc.clientId}`}
                        className="text-blue-600 font-medium hover:underline"
                      >
                        {doc.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-slate-500 text-[11px]">{doc.template.code}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.status === 'approved_for_print'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {doc.status === 'approved_for_print' ? 'Aprobat Tipărire' : 'Draft / Câmpuri Lipsă'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descarcă</span>
                      </a>
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
