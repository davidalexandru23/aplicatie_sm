'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Users,
  UserPlus,
  Save,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  Award,
  FileText,
  Star,
  Sparkles,
  X,
} from 'lucide-react';

interface Specialist {
  id: string;
  providerId: string;
  name: string;
  role: string | null;
  certificateNumber: string | null;
  certificateDate?: string | null;
  evaluatorCert?: string | null;
  qualification?: string | null;
  phone: string | null;
  email: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface ProviderData {
  id?: string;
  name: string;
  cui: string;
  regCom: string;
  address: string;
  street: string;
  streetNumber: string;
  building: string;
  entrance: string;
  floor: string;
  apartment: string;
  postalCode: string;
  city: string;
  county: string;
  phone: string;
  email: string;
  website: string;
  representative: string;
  representativeRole: string;
  representativeDoc: string;
  itmCertNumber: string;
  itmCertDate: string;
  itmAuthority: string;
  // Date Igienă (Ord. MS/ME 2209/2022)
  hygieneProviderName: string;
  hygieneMsAuthNumber: string;
  hygieneMeAuthNumber: string;
  hygieneDspNumber: string;
  hygieneRepresentative: string;
  hygieneRepresentativeRole: string;
  hygieneDefaultLocation: string;
  hygieneDoctorName: string;
  hygieneCommissionPresident: string;
  hygieneCommissionMember1: string;
  hygieneCommissionMember2: string;
  hygieneCommissionSecretary: string;
  isDefault: boolean;
  isActive: boolean;
  specialists: Specialist[];
}

export default function SettingsProviderPage() {
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);
  const [providerSuccessMessage, setProviderSuccessMessage] = useState<string | null>(null);
  const [providerErrorMessage, setProviderErrorMessage] = useState<string | null>(null);

  // Provider Form State
  const [providerForm, setProviderForm] = useState<ProviderData>({
    name: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
    cui: 'RO34567890',
    regCom: 'J40/1234/2020',
    address: 'București, Str. Agricultori nr. 35, Sector 2',
    street: 'Str. Agricultori',
    streetNumber: '35',
    building: 'A1',
    entrance: '1',
    floor: '2',
    apartment: '6',
    postalCode: '021481',
    city: 'București',
    county: 'Sector 2',
    phone: '0722.123.456',
    email: 'contact@expert-ssm.ro',
    website: 'www.expert-ssm.ro',
    representative: 'Ing. Mihai Popescu',
    representativeRole: 'Director Executiv',
    representativeDoc: 'Decizia Asociaților nr. 01/2020',
    itmCertNumber: '4812/2021',
    itmCertDate: '2021-06-15',
    itmAuthority: 'Ministerul Muncii - ITM București',
    hygieneProviderName: 'EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.',
    hygieneMsAuthNumber: 'REG1/25711/16.09.2025',
    hygieneMeAuthNumber: '31160/14.10.2025',
    hygieneDspNumber: '10442',
    hygieneRepresentative: 'Ing. Mihai Popescu',
    hygieneRepresentativeRole: 'Director Executiv',
    hygieneDefaultLocation: 'București, Str. Agricultori nr. 35, Sector 2, Sala A1',
    hygieneDoctorName: 'Dr. Alexandru Ionescu - Medic Primar Igienă',
    hygieneCommissionPresident: 'Dr. Radu Ionescu - Medic Primar DSP',
    hygieneCommissionMember1: 'Ing. Mihai Popescu - Reprezentant Furnizor',
    hygieneCommissionMember2: 'Insp. Dan Mihai - Inspector DSP',
    hygieneCommissionSecretary: 'Secretar Andreea Dumitru',
    isDefault: true,
    isActive: true,
    specialists: [],
  });

  // Modal State for Specialist Add/Edit
  const [isSpecialistModalOpen, setIsSpecialistModalOpen] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<Specialist | null>(null);
  const [savingSpecialist, setSavingSpecialist] = useState(false);
  const [specialistError, setSpecialistError] = useState<string | null>(null);

  const [specialistForm, setSpecialistForm] = useState({
    name: '',
    role: 'Specialist SSM / Evaluator de risc',
    certificateNumber: '',
    certificateDate: '',
    evaluatorCert: '',
    phone: '',
    email: '',
    isDefault: false,
    isActive: true,
  });

  // Delete Confirmation State
  const [deletingSpecialist, setDeletingSpecialist] = useState<Specialist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch initial provider data & current user role
  const loadProviderData = async () => {
    try {
      setLoading(true);
      const [resAuth, res] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/settings/provider'),
      ]);

      if (resAuth.ok) {
        const authData = await resAuth.json();
        if (authData.user?.role) {
          setCurrentUserRole(authData.user.role);
        }
      }

      if (res.ok) {
        const data = await res.json();
        setProviderForm({
          id: data.id,
          name: data.name || '',
          cui: data.cui || '',
          regCom: data.regCom || '',
          address: data.address || '',
          street: data.street || '',
          streetNumber: data.number || data.streetNumber || '',
          building: data.building || '',
          entrance: data.entrance || '',
          floor: data.floor || '',
          apartment: data.apartment || '',
          postalCode: data.postalCode || '',
          city: data.locality || data.city || '',
          county: data.county || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          representative: data.legalRepresentative || data.representative || '',
          representativeRole: data.representativeRole || '',
          representativeDoc: data.representativeDoc || '',
          itmCertNumber: data.authorizationNumber || data.itmCertNumber || '',
          itmCertDate: data.authorizationDate
            ? data.authorizationDate.substring(0, 10)
            : data.itmCertDate
            ? data.itmCertDate.substring(0, 10)
            : '',
          itmAuthority: data.authorizationDetails || data.itmAuthority || '',
          hygieneProviderName: data.hygieneProviderName || '',
          hygieneMsAuthNumber: data.hygieneMsAuthNumber || '',
          hygieneMeAuthNumber: data.hygieneMeAuthNumber || '',
          hygieneDspNumber: data.hygieneDspNumber || '',
          hygieneRepresentative: data.hygieneRepresentative || '',
          hygieneRepresentativeRole: data.hygieneRepresentativeRole || 'Administrator',
          hygieneDefaultLocation: data.hygieneDefaultLocation || '',
          hygieneDoctorName: data.hygieneDoctorName || '',
          hygieneCommissionPresident: data.hygieneCommissionPresident || '',
          hygieneCommissionMember1: data.hygieneCommissionMember1 || '',
          hygieneCommissionMember2: data.hygieneCommissionMember2 || '',
          hygieneCommissionSecretary: data.hygieneCommissionSecretary || '',
          isDefault: data.isDefault ?? true,
          isActive: data.isActive ?? true,
          specialists: data.specialists || [],
        });
      }
    } catch (err) {
      console.error('Eroare la încărcarea datelor prestatorului:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviderData();
  }, []);

  // Save Provider Corporate & Accreditation Data
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProvider(true);
    setProviderSuccessMessage(null);
    setProviderErrorMessage(null);

    try {
      const res = await fetch('/api/settings/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la salvarea datelor prestatorului.');
      }

      setProviderSuccessMessage('Datele prestatorului SSM și acreditarea ITM au fost actualizate cu succes.');
      if (data.provider) {
        setProviderForm((prev) => ({
          ...prev,
          id: data.provider.id,
          specialists: data.provider.specialists || prev.specialists,
        }));
      }
      setTimeout(() => setProviderSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setProviderErrorMessage(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSavingProvider(false);
    }
  };

  // Open Add Specialist Modal
  const handleOpenAddSpecialist = () => {
    setEditingSpecialist(null);
    setSpecialistForm({
      name: '',
      role: 'Specialist SSM / Evaluator de risc',
      certificateNumber: '',
      certificateDate: '',
      evaluatorCert: '',
      phone: '',
      email: '',
      isDefault: providerForm.specialists.length === 0,
      isActive: true,
    });
    setSpecialistError(null);
    setIsSpecialistModalOpen(true);
  };

  // Open Edit Specialist Modal
  const handleOpenEditSpecialist = (sp: Specialist) => {
    setEditingSpecialist(sp);
    setSpecialistForm({
      name: sp.name,
      role: sp.role || 'Specialist SSM / Evaluator de risc',
      certificateNumber: sp.certificateNumber || '',
      certificateDate: sp.certificateDate ? sp.certificateDate.substring(0, 10) : '',
      evaluatorCert: sp.evaluatorCert || sp.qualification || '',
      phone: sp.phone || '',
      email: sp.email || '',
      isDefault: sp.isDefault,
      isActive: sp.isActive,
    });
    setSpecialistError(null);
    setIsSpecialistModalOpen(true);
  };

  // Save Specialist (Add or Edit)
  const handleSaveSpecialist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSpecialist(true);
    setSpecialistError(null);

    try {
      if (!specialistForm.name.trim()) {
        throw new Error('Numele specialistului este obligatoriu.');
      }

      const isEdit = Boolean(editingSpecialist);
      const url = isEdit
        ? `/api/settings/provider/specialists/${editingSpecialist!.id}`
        : '/api/settings/provider/specialists';
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        ...specialistForm,
        providerId: providerForm.id,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la salvarea specialistului.');
      }

      setIsSpecialistModalOpen(false);
      // Reload provider data to reflect updated specialists
      await loadProviderData();
    } catch (err: unknown) {
      setSpecialistError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSavingSpecialist(false);
    }
  };

  // Delete / Deactivate Specialist
  const handleConfirmDelete = async () => {
    if (!deletingSpecialist) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/settings/provider/specialists/${deletingSpecialist.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la ștergerea specialistului.');
      }

      setDeletingSpecialist(null);
      await loadProviderData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Eroare la ștergere.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-sm font-medium text-slate-600">Se încarcă profilul prestatorului SSM...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              currentUserRole === 'IGIENA'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {currentUserRole === 'IGIENA'
                ? 'Furnizor Formare Igienă (Ord. MS/ME 2209/2022)'
                : 'Serviciu Extern de Prevenire și Protecție (SEPP)'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {currentUserRole === 'IGIENA'
                ? 'Avize MS / ME & Înregistrare DSP'
                : 'Conform Legii nr. 319/2006 & HG nr. 1425/2006'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2 flex items-center gap-2">
            {currentUserRole === 'IGIENA' ? (
              <>
                <Sparkles className="w-6 h-6 text-emerald-600" />
                <span>Setări Profil Prestator Formare Igienă & Comisie DSP</span>
              </>
            ) : (
              <>
                <Building2 className="w-6 h-6 text-blue-600" />
                <span>Setări Profil Prestator SSM & Specialiști Desemnați</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {currentUserRole === 'IGIENA'
              ? 'Datele furnizorului de pregătire profesională în igienă, avizele ministeriale și membrii comisiei DSP configurate aici sunt utilizate la generarea cataloagelor, proceselor verbale de examen și adeverințelor DSP.'
              : 'Datele de identificare și acreditarea ITM configurate aici sunt utilizate la emiterea automată a documentelor SSM, deciziilor angajatorului și fișelor de instruire pentru toți clienții din sistem.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveProvider}
          disabled={savingProvider}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          {savingProvider ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Se salvează...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvare Date Prestator</span>
            </>
          )}
        </button>
      </div>

      {/* Success / Error Banners */}
      {providerSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{providerSuccessMessage}</span>
        </div>
      )}
      {providerErrorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{providerErrorMessage}</span>
        </div>
      )}

      {/* Main Two-Column Grid: Corporate Profile & ITM Accreditation */}
      <form onSubmit={handleSaveProvider} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {currentUserRole !== 'IGIENA' && (
          <>
            {/* Column 1 & 2: Corporate Profile */}
            <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Date de Identificare Prestator SSM</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">SEPP Abilitat</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Denumire Firmă Prestator SSM *
                </label>
                <input
                  type="text"
                  required
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cod Unic de Înregistrare (CUI / CIF) *
                </label>
                <input
                  type="text"
                  required
                  value={providerForm.cui}
                  onChange={(e) => setProviderForm({ ...providerForm, cui: e.target.value.toUpperCase() })}
                  placeholder="RO34567890"
                  className="w-full px-3.5 py-2 font-mono uppercase border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nr. Registrul Comerțului
                </label>
                <input
                  type="text"
                  value={providerForm.regCom}
                  onChange={(e) => setProviderForm({ ...providerForm, regCom: e.target.value })}
                  placeholder="J40/1234/2020"
                  className="w-full px-3.5 py-2 font-mono border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Adresă Sediu Social Completă *
                </label>
                <input
                  type="text"
                  required
                  value={providerForm.address}
                  onChange={(e) => setProviderForm({ ...providerForm, address: e.target.value })}
                  placeholder="București, Str. Agricultori nr. 35, Sector 2"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Granular Sub-address elements for document template placeholders */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600 block mb-3">
                Elemente Detaliate de Adresă (utilizate în șabloanele DOCX/XLSX):
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1">Stradă</label>
                  <input
                    type="text"
                    value={providerForm.street}
                    onChange={(e) => setProviderForm({ ...providerForm, street: e.target.value })}
                    placeholder="Str. Agricultori"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Număr</label>
                  <input
                    type="text"
                    value={providerForm.streetNumber}
                    onChange={(e) => setProviderForm({ ...providerForm, streetNumber: e.target.value })}
                    placeholder="35"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Bloc</label>
                  <input
                    type="text"
                    value={providerForm.building}
                    onChange={(e) => setProviderForm({ ...providerForm, building: e.target.value })}
                    placeholder="A1"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Scară</label>
                  <input
                    type="text"
                    value={providerForm.entrance}
                    onChange={(e) => setProviderForm({ ...providerForm, entrance: e.target.value })}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Etaj</label>
                  <input
                    type="text"
                    value={providerForm.floor}
                    onChange={(e) => setProviderForm({ ...providerForm, floor: e.target.value })}
                    placeholder="2"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Apartament</label>
                  <input
                    type="text"
                    value={providerForm.apartment}
                    onChange={(e) => setProviderForm({ ...providerForm, apartment: e.target.value })}
                    placeholder="6"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Localitate</label>
                  <input
                    type="text"
                    value={providerForm.city}
                    onChange={(e) => setProviderForm({ ...providerForm, city: e.target.value })}
                    placeholder="București"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Sector / Județ</label>
                  <input
                    type="text"
                    value={providerForm.county}
                    onChange={(e) => setProviderForm({ ...providerForm, county: e.target.value })}
                    placeholder="Sector 2"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Reprezentant & Contact */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reprezentant Legal
                </label>
                <input
                  type="text"
                  value={providerForm.representative}
                  onChange={(e) => setProviderForm({ ...providerForm, representative: e.target.value })}
                  placeholder="Ing. Mihai Popescu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Calitate Reprezentant
                </label>
                <input
                  type="text"
                  value={providerForm.representativeRole}
                  onChange={(e) => setProviderForm({ ...providerForm, representativeRole: e.target.value })}
                  placeholder="Director Executiv"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Act Împuternicire
                </label>
                <input
                  type="text"
                  value={providerForm.representativeDoc}
                  onChange={(e) => setProviderForm({ ...providerForm, representativeDoc: e.target.value })}
                  placeholder="Decizia Asociaților nr. 01/2020"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefon Contact
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={providerForm.phone}
                    onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })}
                    placeholder="0722.123.456"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Contact
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={providerForm.email}
                    onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
                    placeholder="contact@expert-ssm.ro"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Website Oficial
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={providerForm.website}
                    onChange={(e) => setProviderForm({ ...providerForm, website: e.target.value })}
                    placeholder="www.expert-ssm.ro"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: ITM Accreditation & Legal Authorization Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Acreditare & Abilitare ITM</span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                ABILITAT
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Număr Certificat Abilitare ITM *
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={providerForm.itmCertNumber}
                    onChange={(e) => setProviderForm({ ...providerForm, itmCertNumber: e.target.value })}
                    placeholder="4812/2021"
                    className="w-full pl-9 pr-3 py-2 font-mono font-bold border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data Eliberării Certificatului
                </label>
                <input
                  type="date"
                  value={providerForm.itmCertDate}
                  onChange={(e) => setProviderForm({ ...providerForm, itmCertDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Autoritatea Emitentă
                </label>
                <textarea
                  rows={2}
                  value={providerForm.itmAuthority}
                  onChange={(e) => setProviderForm({ ...providerForm, itmAuthority: e.target.value })}
                  placeholder="Ministerul Muncii - Comisia de Abilitare a Serviciilor Externe ITM București"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Preview Box of Generated Token */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <span className="font-bold text-slate-700 block flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Previzualizare Placeholder Document:
                </span>
                <p className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 break-words leading-relaxed">
                  Certificat abilitare Serviciu Extern SSM nr. {providerForm.itmCertNumber || '—'} din {providerForm.itmCertDate || '—'} emis de {providerForm.itmAuthority || 'Ministerul Muncii - ITM București'}
                </p>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* ========================================================= */}
      {/* SECȚIUNE SEPARATĂ: SETĂRI & GENERARE DOCUMENTE IGIENĂ */}
      {/* ========================================================= */}
      {(currentUserRole === 'IGIENA' || currentUserRole === 'ADMIN') && (
        <div className="bg-white border-2 border-emerald-200/80 rounded-xl p-6 shadow-sm space-y-6 col-span-full lg:col-span-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Sparkles className="w-5 h-5 text-emerald-700" />
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Configurare & Date Generare Cursuri Igienă
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ord. MS/ME 2209/4469/2022
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Aceste informații se aplică automat la generarea adeverințelor, cataloagelor și proceselor-verbale de examen DSP/MS pentru cursurile de noțiuni fundamentale de igienă (secțiune separată de SSM).
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveProvider}
              disabled={savingProvider}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Salvează Setări Igienă</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Coloana 1: Entitate Furnizor & Reprezentant */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Entitate Furnizor & Reprezentant
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Denumire Furnizor Cursuri Igienă
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneProviderName}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneProviderName: e.target.value })}
                  placeholder="EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Lăsați neschimbat dacă se folosește aceeași entitate prestatoare</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nume Reprezentant Cursuri Igienă
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneRepresentative}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneRepresentative: e.target.value })}
                  placeholder="Ing. Mihai Popescu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Funcție Reprezentant
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneRepresentativeRole}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneRepresentativeRole: e.target.value })}
                  placeholder="Director Executiv / Administrator"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Locație Sală Curs & Examen (Implicită)
                </label>
                <textarea
                  rows={2}
                  value={providerForm.hygieneDefaultLocation}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneDefaultLocation: e.target.value })}
                  placeholder="București, Str. Agricultori nr. 35, Sector 2, Sala A1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Coloana 2: Acreditări & Avize (Fără Serie DSP) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Avize Ministere & DSP
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nr. & Dată Aviz Ministerul Sănătății (MS)
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneMsAuthNumber}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneMsAuthNumber: e.target.value })}
                  placeholder="REG1/25711/16.09.2025"
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nr. & Dată Aviz Ministerul Educației (ME)
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneMeAuthNumber}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneMeAuthNumber: e.target.value })}
                  placeholder="31160/14.10.2025"
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Număr Notificare / Decizie DSP
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneDspNumber}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneDspNumber: e.target.value })}
                  placeholder="10442"
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Medic Igienist / Formator Coordonator Curs
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneDoctorName}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneDoctorName: e.target.value })}
                  placeholder="Dr. Alexandru Ionescu - Medic Primar Igienă"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Coloana 3: Comisie Examinare DSP */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Comisie Examinare DSP (Implicită)
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Președinte Comisie (Reprezentant DSP)
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneCommissionPresident}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneCommissionPresident: e.target.value })}
                  placeholder="Dr. Radu Ionescu - Medic Primar DSP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Membru 1 Comisie (Furnizor de Formare)
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneCommissionMember1}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneCommissionMember1: e.target.value })}
                  placeholder="Ing. Mihai Popescu - Reprezentant Furnizor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Membru 2 Comisie (Inspector DSP)
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneCommissionMember2}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneCommissionMember2: e.target.value })}
                  placeholder="Insp. Dan Mihai - Inspector DSP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Secretar Comisie Examinare
                </label>
                <input
                  type="text"
                  value={providerForm.hygieneCommissionSecretary}
                  onChange={(e) => setProviderForm({ ...providerForm, hygieneCommissionSecretary: e.target.value })}
                  placeholder="Secretar Andreea Dumitru"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Previzualizare Antet Adeverință */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-1.5">
            <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Previzualizare Antet & Bază Legală Adeverință Igienă:
            </span>
            <p className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded border border-emerald-200 break-words leading-relaxed">
              Curs organizat de <strong>{providerForm.hygieneProviderName || providerForm.name}</strong>, în baza Avizului MS nr. <strong>{providerForm.hygieneMsAuthNumber || '—'}</strong> și ME nr. <strong>{providerForm.hygieneMeAuthNumber || '—'}</strong>, înregistrare DSP <strong>{providerForm.hygieneDspNumber || '—'}</strong>. Eliberare adeverință: <strong>Nr. [1..X / BIS]</strong> (fără serie DSP).
            </p>
          </div>
        </div>
      )}
      </form>

      {/* Specialist Team Management Card (Full Width) */}
      {currentUserRole !== 'IGIENA' && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Echipa de Specialiști SSM & Evaluatori Desemnați</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specialiștii din această listă pot fi asignați fiecărei companii cliente și apar în deciziile de numire, fișele de instruire și evaluările de risc.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddSpecialist}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-blue-400" />
            <span>Adaugă Specialist</span>
          </button>
        </div>

        {providerForm.specialists.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">Nu există specialiști adăugați</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Adaugă specialiștii SSM atestați care întocmesc documentațiile și efectuează instruirile pentru firmele partenere.
            </p>
            <button
              type="button"
              onClick={handleOpenAddSpecialist}
              className="mt-3 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Adaugă primul specialist</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Specialist</th>
                  <th className="py-3 px-4">Rol & Competență</th>
                  <th className="py-3 px-4">Certificat Atestare ITM</th>
                  <th className="py-3 px-4">Evaluator Risc / Calificare</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providerForm.specialists.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{sp.name}</span>
                        {sp.isDefault && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded" title="Specialist implicit pentru clienți noi">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>Implicit</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-2">
                        {sp.phone && <span>Tel: {sp.phone}</span>}
                        {sp.email && <span>Email: {sp.email}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-medium">{sp.role || 'Specialist SSM'}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-800">
                      {sp.certificateNumber || '—'}
                      {sp.certificateDate && (
                        <div className="text-[10px] text-slate-400 font-sans">
                          din {sp.certificateDate.substring(0, 10)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {sp.qualification || sp.evaluatorCert ? (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {sp.qualification || sp.evaluatorCert}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          sp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {sp.isActive ? 'ACTIV' : 'INACTIV'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSpecialist(sp)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Editează specialist"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSpecialist(sp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Dezactivează / Șterge specialist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Adăugare / Editare Specialist */}
      {isSpecialistModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>{editingSpecialist ? 'Editează Date Specialist SSM' : 'Adaugă Specialist Desemnat'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSpecialistModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecialist} className="p-6 space-y-4 text-xs">
              {specialistError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{specialistError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nume și Prenume Specialist *
                </label>
                <input
                  type="text"
                  required
                  value={specialistForm.name}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, name: e.target.value })}
                  placeholder="ex: Ing. Mihai Popescu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol / Funcție
                </label>
                <input
                  type="text"
                  value={specialistForm.role}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, role: e.target.value })}
                  placeholder="Specialist SSM / Evaluator de risc"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Serie / Număr Certificat Atestare
                  </label>
                  <input
                    type="text"
                    value={specialistForm.certificateNumber}
                    onChange={(e) => setSpecialistForm({ ...specialistForm, certificateNumber: e.target.value })}
                    placeholder="Certificat seria EV nr. 10452/2018"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data Atestării
                  </label>
                  <input
                    type="date"
                    value={specialistForm.certificateDate}
                    onChange={(e) => setSpecialistForm({ ...specialistForm, certificateDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Certificat Evaluator Riscuri SSM (INCDPM București) / Calificare
                </label>
                <input
                  type="text"
                  value={specialistForm.evaluatorCert}
                  onChange={(e) => setSpecialistForm({ ...specialistForm, evaluatorCert: e.target.value })}
                  placeholder="Certificat Evaluator Riscuri SSM seria EV nr. 10452/2018 emis de INCDPM București"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telefon Contact
                  </label>
                  <input
                    type="text"
                    value={specialistForm.phone}
                    onChange={(e) => setSpecialistForm({ ...specialistForm, phone: e.target.value })}
                    placeholder="0722.123.456"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Contact
                  </label>
                  <input
                    type="email"
                    value={specialistForm.email}
                    onChange={(e) => setSpecialistForm({ ...specialistForm, email: e.target.value })}
                    placeholder="mihai.popescu@expert-ssm.ro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specialistForm.isDefault}
                    onChange={(e) => setSpecialistForm({ ...specialistForm, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800">Setează ca specialist implicit pentru clienți noi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specialistForm.isActive}
                    onChange={(e) => setSpecialistForm({ ...specialistForm, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800">Activ</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpecialistModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingSpecialist}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingSpecialist ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingSpecialist ? 'Salvează Modificările' : 'Adaugă Specialist'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmare Ștergere / Dezactivare Specialist */}
      {deletingSpecialist && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ștergere / Dezactivare Specialist
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ești sigur că vrei să elimini specialistul <strong>{deletingSpecialist.name}</strong>?
                </p>
                <p className="text-[11px] text-slate-400 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                  Notă: Dacă specialistul este deja asignat la companii cliente, acesta va fi marcat ca inactiv pentru a menține integritatea documentelor și deciziilor emise.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSpecialist(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Confirmă Eliminarea</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
