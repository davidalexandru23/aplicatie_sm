import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { FileText, CheckCircle2, AlertCircle, FileCheck, Layers } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: [{ family: 'asc' }, { code: 'asc' }],
  });

  const familyLabels: Record<string, string> = {
    ipssm: 'Instrucțiuni Proprii SSM (IPSSM)',
    training: 'Tematici & Suport Instruire',
    decision: 'Decizii Angajator',
    hr: 'Documente HR & Nominale',
    risk: 'Evaluare Riscuri & Urgență',
    hygiene: 'Cursuri Noțiuni Igienă',
  };

  // Group templates by family
  const grouped: Record<string, typeof templates> = {};
  for (const t of templates) {
    if (!grouped[t.family]) grouped[t.family] = [];
    grouped[t.family].push(t);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Catalogul Oficial al celor 25 de Șabloane SSM
            </h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {templates.length} / 25
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fiecare fișier original din folderul <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">sabloane_ssm</code> este inventariat, normalizat, asociat cu un manifest declarativ de date și un revizor desemnat.
          </p>
        </div>
        <Link
          href="/documents/generate"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
        >
          <FileCheck className="w-4 h-4" />
          <span>Generator Documente</span>
        </Link>
      </div>

      {Object.entries(grouped).map(([family, items]) => (
        <div key={family} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/75 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>{familyLabels[family] || family.toUpperCase()}</span>
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {items.length} {items.length === 1 ? 'șablon' : 'șabloane'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-white text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Cod & Denumire Șablon</th>
                  <th className="px-4 py-3">Fișier Original / Normalizat</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Nivel Context</th>
                  <th className="px-4 py-3">Revizor Desemnat</th>
                  <th className="px-4 py-3">Stare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{tpl.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{tpl.code}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <div className="truncate max-w-[220px]" title={tpl.originalFilename}>
                        {tpl.originalFilename}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[220px]">
                        → {tpl.normalizedFilename}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tpl.format === 'docx'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : tpl.format === 'pdf'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tpl.format}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-slate-600 font-medium">
                      {tpl.contextLevel.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {tpl.reviewer || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        tpl.status === 'mapped'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tpl.status === 'review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {tpl.status === 'mapped' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Mapat (Activ)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>În Revizie</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
