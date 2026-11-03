'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, X, Building2, Briefcase, UserCheck, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { CaenSelector } from '@/components/caen-selector';
import { CaenEntry } from '@/lib/caen-catalog';

export interface ClientEditModalProps {
  client: {
    id: string;
    name: string;
    cui: string;
    regCom?: string | null;
    address: string;
    legalRepresentative?: string | null;
    contactPerson?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    caenCode?: string | null;
    caenActivity?: string | null;
    foundedYear?: number | null;
    ssmProviderName?: string | null;
    ssmSpecialistName?: string | null;
    ssmSpecialistCert?: string | null;
    isActive?: boolean;
  };
  triggerClassName?: string;
  triggerText?: string;
}

export function ClientEditModal({
  client,
  triggerClassName,
  triggerText = 'Editează Date Firmă',
}: ClientEditModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State prefilled from props
  const [formData, setFormData] = useState({
    name: client.name || '',
    cui: client.cui || '',
    regCom: client.regCom || '',
    address: client.address || '',
    foundedYear: client.foundedYear ? String(client.foundedYear) : '',
    caenCode: client.caenCode || '',
    caenActivity: client.caenActivity || '',
    legalRepresentative: client.legalRepresentative || '',
    contactPerson: client.contactPerson || '',
    contactPhone: client.contactPhone || '',
    contactEmail: client.contactEmail || '',
    ssmProviderName: client.ssmProviderName || '',
    ssmSpecialistName: client.ssmSpecialistName || '',
    ssmSpecialistCert: client.ssmSpecialistCert || '',
    isActive: client.isActive ?? true,
  });

  const handleCaenSelect = (code: string, entry?: CaenEntry) => {
    setFormData((prev) => ({
      ...prev,
      caenCode: code,
      caenActivity: entry ? entry.name : prev.caenActivity,
    }));
  };

  const handleOpen = () => {
    setFormData({
      name: client.name || '',
      cui: client.cui || '',
      regCom: client.regCom || '',
      address: client.address || '',
      foundedYear: client.foundedYear ? String(client.foundedYear) : '',
      caenCode: client.caenCode || '',
      caenActivity: client.caenActivity || '',
      legalRepresentative: client.legalRepresentative || '',
      contactPerson: client.contactPerson || '',
      contactPhone: client.contactPhone || '',
      contactEmail: client.contactEmail || '',
      ssmProviderName: client.ssmProviderName || '',
      ssmSpecialistName: client.ssmSpecialistName || '',
      ssmSpecialistCert: client.ssmSpecialistCert || '',
      isActive: client.isActive ?? true,
    });
    setErrorMessage(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          cui: formData.cui,
          regCom: formData.regCom || null,
          address: formData.address,
          foundedYear: formData.foundedYear || null,
          caenCode: formData.caenCode || null,
          caenActivity: formData.caenActivity || null,
          legalRepresentative: formData.legalRepresentative || null,
          contactPerson: formData.contactPerson || null,
          contactPhone: formData.contactPhone || null,
          contactEmail: formData.contactEmail || null,
          ssmProviderName: formData.ssmProviderName || null,
          ssmSpecialistName: formData.ssmSpecialistName || null,
          ssmSpecialistCert: formData.ssmSpecialistCert || null,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la actualizarea clientului.');
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Eroare la actualizare.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition'
        }
      >
        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
        <span>{triggerText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Modificare Date Companie & Profil CAEN
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Actualizează datele firmei, sediul, profilul CAEN și prestatorul de servicii SSM.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Section 1: Identificare & Sediu */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Date Identificare Firmă & Sediu Social</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Denumire Firmă *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      CUI / CIF *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cui}
                      onChange={(e) => setFormData({ ...formData, cui: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nr. Reg. Comerțului
                    </label>
                    <input
                      type="text"
                      value={formData.regCom}
                      onChange={(e) => setFormData({ ...formData, regCom: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      An Înființare
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 2022"
                      min="1900"
                      max="2099"
                      value={formData.foundedYear}
                      onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Reprezentant Legal
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Popescu Ion (Administrator)"
                      value={formData.legalRepresentative}
                      onChange={(e) => setFormData({ ...formData, legalRepresentative: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Sediu Social Complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Profil Activitate Economică (CAEN) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Profil Activitate Economică (CAEN Rev. 2)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Cod CAEN Principal
                  </label>
                  <CaenSelector
                    value={formData.caenCode}
                    onChange={handleCaenSelect}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Denumire / Descriere Activitate
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descriere activitate conform CAEN..."
                    value={formData.caenActivity}
                    onChange={(e) => setFormData({ ...formData, caenActivity: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Section 3: Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Persoană de Contact & Comunicare</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nume Contact
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="text"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: SEPP Prestator Abilitat ITM */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>4. Serviciu Extern de Prevenire și Protecție (SEPP)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Prestator SSM (Denumire SEPP)
                    </label>
                    <input
                      type="text"
                      value={formData.ssmProviderName}
                      onChange={(e) => setFormData({ ...formData, ssmProviderName: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Specialist / Evaluator SSM
                    </label>
                    <input
                      type="text"
                      value={formData.ssmSpecialistName}
                      onChange={(e) => setFormData({ ...formData, ssmSpecialistName: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Certificat Atestare / Abilitare
                    </label>
                    <input
                      type="text"
                      value={formData.ssmSpecialistCert}
                      onChange={(e) => setFormData({ ...formData, ssmSpecialistCert: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Se actualizează...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvează Modificările</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
