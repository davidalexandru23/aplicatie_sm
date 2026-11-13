'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Plus, Trash2, X, Check, Loader2, AlertTriangle, FileText, User } from 'lucide-react';
import Link from 'next/link';

interface EipItem {
  id: string;
  code: string;
  name: string;
  standardCode?: string | null;
  protectionType?: string | null;
  replacementMonths: number;
}

interface EipAssignment {
  id: string;
  eipItemId: string;
  assignedDate: string | Date;
  signatureDate?: string | Date | null;
  eipItem: EipItem;
}

interface EmployeeData {
  id: string;
  firstName: string;
  lastName: string;
  shoeSize?: string | null;
  clothingSize?: string | null;
  gloveSize?: string | null;
  currentJob?: {
    id: string;
    title: string;
    eipRequirements?: { eipItemId: string; eipItem: EipItem }[];
  } | null;
  eipAssignments?: EipAssignment[];
}

interface ManageEipModalProps {
  clientId: string;
  employee: EmployeeData;
  eipCatalog: EipItem[];
}

export function ManageEipModal({ clientId, employee, eipCatalog }: ManageEipModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New assignment form state
  const [selectedItemId, setSelectedItemId] = useState('');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSigned, setIsSigned] = useState(true);

  const assignments = employee.eipAssignments || [];
  const assignedItemIds = new Set(assignments.map((a) => a.eipItemId));

  // Items suggested by current job requirements
  const jobRequirements = employee.currentJob?.eipRequirements || [];

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItemId) {
      setError('Selectați un articol EIP pentru acordare.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/eip/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          eipItemId: selectedItemId,
          assignedDate: new Date(assignedDate).toISOString(),
          signatureDate: isSigned ? new Date(assignedDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la acordarea echipamentului.');
      }

      setSelectedItemId('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la predarea echipamentului.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(assignmentId: string) {
    if (!confirm('Sigur doriți să ștergeți această înregistrare de predare EIP?')) return;

    setDeletingId(assignmentId);
    setError(null);

    try {
      const res = await fetch(`/api/eip/assignments?id=${assignmentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la ștergerea înregistrării.');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'A apărut o eroare la ștergere.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Gestiune EIP salariat (HG 1048/2006)"
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>EIP ({assignments.length})</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Fișă Dotare EIP: {employee.lastName} {employee.firstName}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Funcție: {employee.currentJob?.title || 'Nespecificat'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mărimi Salariat */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Mărimi Individuale Salariat
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-slate-700">
                      Încălțăminte: <strong className="text-slate-900">{employee.shoeSize || '—'}</strong>
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-slate-700">
                      Haine: <strong className="text-slate-900">{employee.clothingSize || '—'}</strong>
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium text-slate-700">
                      Mănuși: <strong className="text-slate-900">{employee.gloveSize || '—'}</strong>
                    </span>
                  </div>
                </div>

                <Link
                  href={`/documents/generate?templateCode=eip-fisa-acordare-individuala&clientId=${clientId}&employeeId=${employee.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generează Fișă DOCX</span>
                </Link>
              </div>

              {/* Echipamente Deja Predate */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Echipamente Predate în Evidență ({assignments.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">HG 1048/2006</span>
                </h4>

                {assignments.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Niciun echipament individual predat înregistrat pentru acest salariat.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {assignments.map((a) => {
                      const dateStr = a.assignedDate
                        ? new Date(a.assignedDate).toLocaleDateString('ro-RO')
                        : '—';
                      return (
                        <div
                          key={a.id}
                          className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900">{a.eipItem?.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Standard: {a.eipItem?.standardCode || 'N/A'}</span>
                              <span>•</span>
                              <span>Data predării: {dateStr}</span>
                              <span>•</span>
                              <span>
                                Semnătură: {a.signatureDate ? (
                                  <span className="text-emerald-600 font-semibold">Semnat</span>
                                ) : (
                                  <span className="text-amber-600">Nesemnat</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deletingId === a.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition disabled:opacity-50"
                            title="Șterge înregistrare"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Formular Predare Echipament Nou */}
              <form onSubmit={handleAssign} className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  + Înregistrează Predare Echipament Nou
                </h4>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Articol EIP din Catalog
                  </label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Selectează articol EIP --</option>
                    {jobRequirements.length > 0 && (
                      <optgroup label="Recomandate pentru postul salariatului">
                        {jobRequirements.map((req) => (
                          <option
                            key={req.eipItem.id}
                            value={req.eipItem.id}
                            disabled={assignedItemIds.has(req.eipItem.id)}
                          >
                            {req.eipItem.name} {assignedItemIds.has(req.eipItem.id) ? '(deja alocat)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Toate articolele din catalog">
                      {eipCatalog.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={assignedItemIds.has(item.id)}
                        >
                          {item.name} {assignedItemIds.has(item.id) ? '(deja alocat)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data Predării
                    </label>
                    <input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 sm:pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isSigned}
                        onChange={(e) => setIsSigned(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="font-semibold text-slate-800">
                        Predat cu semnătură de primire
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedItemId}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Se înregistrează...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Înregistrează Predarea</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
