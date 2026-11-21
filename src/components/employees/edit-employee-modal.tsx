'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, X, AlertCircle, RefreshCw, CheckCircle2, User, FileText, MapPin, Shield } from 'lucide-react';
import { UserRole } from '@/lib/rbac';

export interface EditEmployeeModalProps {
  employeeId: string;
  employeeName?: string;
  jobs?: Array<{ id: string; title: string }>;
  worksites?: Array<{ id: string; name: string }>;
  triggerText?: string;
  triggerClassName?: string;
  triggerIcon?: boolean;
  onSuccess?: () => void;
  isSsmRole?: boolean;
  userRole?: UserRole;
}

type TabKey = 'identity' | 'contract' | 'address' | 'ssm';

export function EditEmployeeModal({
  employeeId,
  employeeName,
  jobs = [],
  worksites = [],
  triggerText = 'Editează',
  triggerClassName,
  triggerIcon = false,
  onSuccess,
  isSsmRole = false,
  userRole,
}: EditEmployeeModalProps) {
  const router = useRouter();
  const effectiveRole = userRole || (isSsmRole ? 'SSM' : 'ADMIN');
  const isSsm = effectiveRole === 'SSM';
  const isIgiena = effectiveRole === 'IGIENA';
  const hideCim = isSsm || isIgiena;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('identity');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [availableJobs, setAvailableJobs] = useState<Array<{ id: string; title: string }>>(jobs);
  const [availableWorksites, setAvailableWorksites] = useState<Array<{ id: string; name: string }>>(worksites);

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    cnp: '',
    sex: '',
    birthDate: '',
    birthPlace: '',
    birthCounty: '',
    citizenship: 'Română',
    phone: '',
    email: '',
    currentJobId: '',
    currentWorksiteId: '',
    hireDate: '',
    cimNumber: '',
    cimDate: '',
    grossSalary: '',
    workNorm: '8',
    probationDays: '90',
    annualLeaveDays: '20',
    bankIban: '',
    bankName: '',
    idDocType: 'CI',
    idSeries: '',
    idNumber: '',
    idIssuedBy: '',
    idIssueDate: '',
    idExpiryDate: '',
    addressCounty: '',
    addressLocality: '',
    addressStreet: '',
    addressNumber: '',
    addressBuilding: '',
    addressEntrance: '',
    addressFloor: '',
    addressApartment: '',
    addressPostalCode: '',
    shoeSize: '',
    clothingSize: '',
    gloveSize: '',
    bloodType: '',
    rhFactor: '',
    qualification: '',
    commuteRoute: '',
    commuteDurationMinutes: '',
    adminNotes: '',
  });

  const loadEmployeeData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nu s-au putut încărca datele salariatului.');
      }
      const emp = data.employee;

      if (emp.client) {
        if (emp.client.jobs && emp.client.jobs.length > 0) setAvailableJobs(emp.client.jobs);
        if (emp.client.worksites && emp.client.worksites.length > 0) setAvailableWorksites(emp.client.worksites);
      }

      setFormData({
        lastName: emp.lastName || '',
        firstName: emp.firstName || '',
        cnp: emp.cnp || '',
        sex: emp.sex || '',
        birthDate: emp.birthDate ? emp.birthDate.slice(0, 10) : '',
        birthPlace: emp.birthPlace || '',
        birthCounty: emp.birthCounty || '',
        citizenship: emp.citizenship || 'Română',
        phone: emp.phone || '',
        email: emp.email || '',
        currentJobId: emp.currentJobId || '',
        currentWorksiteId: emp.currentWorksiteId || '',
        hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : '',
        cimNumber: emp.cimNumber || '',
        cimDate: emp.cimDate ? emp.cimDate.slice(0, 10) : '',
        grossSalary: emp.grossSalary !== null && emp.grossSalary !== undefined ? String(emp.grossSalary) : '',
        workNorm: emp.workNorm ? String(emp.workNorm) : '8',
        probationDays: emp.probationDays ? String(emp.probationDays) : '90',
        annualLeaveDays: emp.annualLeaveDays ? String(emp.annualLeaveDays) : '20',
        bankIban: emp.bankIban || '',
        bankName: emp.bankName || '',
        idDocType: emp.identityDocument?.docType || 'CI',
        idSeries: emp.identityDocument?.series || '',
        idNumber: emp.identityDocument?.number || '',
        idIssuedBy: emp.identityDocument?.issuedBy || '',
        idIssueDate: emp.identityDocument?.issueDate ? emp.identityDocument.issueDate.slice(0, 10) : '',
        idExpiryDate: emp.identityDocument?.expiryDate ? emp.identityDocument.expiryDate.slice(0, 10) : '',
        addressCounty: emp.residenceAddress?.county || '',
        addressLocality: emp.residenceAddress?.locality || '',
        addressStreet: emp.residenceAddress?.street || '',
        addressNumber: emp.residenceAddress?.number || '',
        addressBuilding: emp.residenceAddress?.building || '',
        addressEntrance: emp.residenceAddress?.entrance || '',
        addressFloor: emp.residenceAddress?.floor || '',
        addressApartment: emp.residenceAddress?.apartment || '',
        addressPostalCode: emp.residenceAddress?.postalCode || '',
        shoeSize: emp.shoeSize || '',
        clothingSize: emp.clothingSize || '',
        gloveSize: emp.gloveSize || '',
        bloodType: emp.bloodType || '',
        rhFactor: emp.rhFactor || '',
        qualification: emp.qualification || '',
        commuteRoute: emp.commuteRoute || '',
        commuteDurationMinutes: emp.commuteDurationMinutes ? String(emp.commuteDurationMinutes) : '',
        adminNotes: emp.adminNotes || '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare la încărcarea datelor salariatului.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEmployeeData();
    }
  }, [isOpen, employeeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, any> = {
        lastName: formData.lastName.trim(),
        firstName: formData.firstName.trim(),
        cnp: formData.cnp.trim() || null,
        sex: formData.sex || undefined,
        birthDate: formData.birthDate || null,
        birthPlace: formData.birthPlace.trim() || null,
        birthCounty: formData.birthCounty.trim() || null,
        citizenship: formData.citizenship.trim() || 'Română',
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        currentJobId: formData.currentJobId || null,
        currentWorksiteId: formData.currentWorksiteId || null,
        hireDate: formData.hireDate || null,
        cimNumber: formData.cimNumber.trim() || null,
        cimDate: formData.cimDate || null,
        grossSalary: formData.grossSalary ? Number(formData.grossSalary) : null,
        workNorm: formData.workNorm ? Number(formData.workNorm) : 8,
        probationDays: formData.probationDays ? Number(formData.probationDays) : 90,
        annualLeaveDays: formData.annualLeaveDays ? Number(formData.annualLeaveDays) : 20,
        bankIban: formData.bankIban.trim() || null,
        bankName: formData.bankName.trim() || null,
        idDocType: formData.idDocType || 'CI',
        idSeries: formData.idSeries.trim() || null,
        idNumber: formData.idNumber.trim() || null,
        idIssuedBy: formData.idIssuedBy.trim() || null,
        idIssueDate: formData.idIssueDate || null,
        idExpiryDate: formData.idExpiryDate || null,
        addressCounty: formData.addressCounty.trim() || null,
        addressLocality: formData.addressLocality.trim() || null,
        addressStreet: formData.addressStreet.trim() || null,
        addressNumber: formData.addressNumber.trim() || null,
        addressBuilding: formData.addressBuilding.trim() || null,
        addressEntrance: formData.addressEntrance.trim() || null,
        addressFloor: formData.addressFloor.trim() || null,
        addressApartment: formData.addressApartment.trim() || null,
        addressPostalCode: formData.addressPostalCode.trim() || null,
        shoeSize: formData.shoeSize.trim() || null,
        clothingSize: formData.clothingSize.trim() || null,
        gloveSize: formData.gloveSize.trim() || null,
        bloodType: formData.bloodType.trim() || null,
        rhFactor: formData.rhFactor.trim() || null,
        qualification: formData.qualification.trim() || null,
        commuteRoute: formData.commuteRoute.trim() || null,
        commuteDurationMinutes: formData.commuteDurationMinutes ? Number(formData.commuteDurationMinutes) : null,
        adminNotes: formData.adminNotes.trim() || null,
      };

      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'A apărut o eroare la salvarea modificărilor.');
      }

      setSuccessMessage('Datele salariatului au fost actualizate cu succes!');
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        router.refresh();
        onSuccess?.();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare de comunicare cu serverul.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setErrorMessage(null);
          setSuccessMessage(null);
        }}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition shadow-sm'
        }
        title="Editează Profil Salariat"
      >
        <Edit3 className="w-3.5 h-3.5" />
        {!triggerIcon && <span>{triggerText}</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold">Editare Profil Salariat</h3>
                  <p className="text-xs text-slate-300">
                    {employeeName || `${formData.lastName} ${formData.firstName}` || 'Salariat'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
              {[
                { id: 'identity', label: '1. Identitate', icon: User },
                { id: 'contract', label: hideCim ? '2. Încadrare & Post' : '2. CIM & Încadrare', icon: FileText },
                { id: 'address', label: isSsm ? '3. Domiciliu & Traseu' : '3. CI & Domiciliu', icon: MapPin },
                { id: 'ssm', label: '4. SSM & EIP', icon: Shield },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as TabKey)}
                    className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 text-xs font-semibold transition ${
                      activeTab === t.id
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Loading / Form */}
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs text-slate-500 font-medium">Se încarcă datele salariatului...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* TAB 1: Identitate */}
                {activeTab === 'identity' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nume de Familie *</label>
                        <input
                          type="text"
                          name="lastName"
                          required
                          value={formData.lastName}
                          onChange={handleChange}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Prenume *</label>
                        <input
                          type="text"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {isSsm ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Sex</label>
                            <select
                              name="sex"
                              value={formData.sex}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">-- Nespecificat --</option>
                              <option value="M">Masculin (M)</option>
                              <option value="F">Feminin (F)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Data Nașterii <span className="text-slate-400 font-normal">(opțional)</span>
                            </label>
                            <input
                              type="date"
                              name="birthDate"
                              value={formData.birthDate}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Locul Nașterii</label>
                            <input
                              type="text"
                              name="birthPlace"
                              value={formData.birthPlace}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Județ Naștere</label>
                            <input
                              type="text"
                              name="birthCounty"
                              value={formData.birthCounty}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Cetățenie</label>
                            <input
                              type="text"
                              name="citizenship"
                              value={formData.citizenship}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              CNP <span className="text-slate-400 font-normal">(opțional)</span>
                            </label>
                            <input
                              type="text"
                              name="cnp"
                              maxLength={13}
                              value={formData.cnp}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Sex</label>
                            <select
                              name="sex"
                              value={formData.sex}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">-- Nespecificat --</option>
                              <option value="M">Masculin (M)</option>
                              <option value="F">Feminin (F)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Data Nașterii <span className="text-slate-400 font-normal">(opțional)</span>
                            </label>
                            <input
                              type="date"
                              name="birthDate"
                              value={formData.birthDate}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Locul Nașterii</label>
                            <input
                              type="text"
                              name="birthPlace"
                              value={formData.birthPlace}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Județ Naștere</label>
                            <input
                              type="text"
                              name="birthCounty"
                              value={formData.birthCounty}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Cetățenie</label>
                            <input
                              type="text"
                              name="citizenship"
                              value={formData.citizenship}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 2: CIM & Încadrare / Încadrare & Post */}
                {activeTab === 'contract' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Funcție / Post (COR)</label>
                        <select
                          name="currentJobId"
                          value={formData.currentJobId}
                          onChange={handleChange}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- Neselectat --</option>
                          {availableJobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Punct de Lucru</label>
                        <select
                          name="currentWorksiteId"
                          value={formData.currentWorksiteId}
                          onChange={handleChange}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">-- Sediu Social / Central --</option>
                          {availableWorksites.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {hideCim ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Data Angajării</label>
                          <input
                            type="date"
                            name="hireDate"
                            value={formData.hireDate}
                            onChange={handleChange}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Normă de Lucru (ore/zi)</label>
                          <input
                            type="number"
                            name="workNorm"
                            min={1}
                            max={12}
                            value={formData.workNorm}
                            onChange={handleChange}
                            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Data Angajării</label>
                            <input
                              type="date"
                              name="hireDate"
                              value={formData.hireDate}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Număr CIM</label>
                            <input
                              type="text"
                              name="cimNumber"
                              value={formData.cimNumber}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Data CIM</label>
                            <input
                              type="date"
                              name="cimDate"
                              value={formData.cimDate}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Salariu Brut (RON)</label>
                            <input
                              type="number"
                              name="grossSalary"
                              value={formData.grossSalary}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Normă (ore/zi)</label>
                            <input
                              type="number"
                              name="workNorm"
                              min={1}
                              max={12}
                              value={formData.workNorm}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Probă (zile)</label>
                            <input
                              type="number"
                              name="probationDays"
                              value={formData.probationDays}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Concediu (zile)</label>
                            <input
                              type="number"
                              name="annualLeaveDays"
                              value={formData.annualLeaveDays}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Cont IBAN</label>
                            <input
                              type="text"
                              name="bankIban"
                              value={formData.bankIban}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Bancă</label>
                            <input
                              type="text"
                              name="bankName"
                              value={formData.bankName}
                              onChange={handleChange}
                              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 3: CI & Domiciliu / Domiciliu & Traseu */}
                {activeTab === 'address' && (
                  <div className="space-y-4">
                    {!isSsm && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                        <span className="text-xs font-bold text-slate-800">Act de Identitate</span>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tip Document</label>
                            <select
                              name="idDocType"
                              value={formData.idDocType}
                              onChange={handleChange}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="CI">Carte de Identitate (CI)</option>
                              <option value="PASAPORT">Pașaport</option>
                              <option value="PERMIS_SEDERE">Permis de Ședere</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Serie</label>
                            <input
                              type="text"
                              name="idSeries"
                              value={formData.idSeries}
                              onChange={handleChange}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Număr <span className="text-slate-400 font-normal">(opțional)</span>
                            </label>
                            <input
                              type="text"
                              name="idNumber"
                              value={formData.idNumber}
                              onChange={handleChange}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Eliberat De</label>
                            <input
                              type="text"
                              name="idIssuedBy"
                              value={formData.idIssuedBy}
                              onChange={handleChange}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Emiterii</label>
                            <input
                              type="date"
                              name="idIssueDate"
                              value={formData.idIssueDate}
                              onChange={handleChange}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Expirării</label>
                            <input
                              type="date"
                              name="idExpiryDate"
                              value={formData.idExpiryDate}
                              onChange={handleChange}
                              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <span className="text-xs font-bold text-slate-800">Adresă de Domiciliu</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Județ</label>
                          <input
                            type="text"
                            name="addressCounty"
                            value={formData.addressCounty}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Localitate / Sector</label>
                          <input
                            type="text"
                            name="addressLocality"
                            value={formData.addressLocality}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Stradă</label>
                          <input
                            type="text"
                            name="addressStreet"
                            value={formData.addressStreet}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Număr <span className="text-slate-400 font-normal">(opțional)</span>
                          </label>
                          <input
                            type="text"
                            name="addressNumber"
                            value={formData.addressNumber}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Bloc</label>
                          <input
                            type="text"
                            name="addressBuilding"
                            value={formData.addressBuilding}
                            onChange={handleChange}
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Scara</label>
                          <input
                            type="text"
                            name="addressEntrance"
                            value={formData.addressEntrance}
                            onChange={handleChange}
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Etaj</label>
                          <input
                            type="text"
                            name="addressFloor"
                            value={formData.addressFloor}
                            onChange={handleChange}
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Ap.</label>
                          <input
                            type="text"
                            name="addressApartment"
                            value={formData.addressApartment}
                            onChange={handleChange}
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Cod Poștal</label>
                          <input
                            type="text"
                            name="addressPostalCode"
                            value={formData.addressPostalCode}
                            onChange={handleChange}
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: SSM & EIP */}
                {activeTab === 'ssm' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <span className="text-xs font-bold text-slate-800">Echipament Individual de Protecție (EIP - HG 1048/2006)</span>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mărime Pantofi</label>
                          <input
                            type="text"
                            name="shoeSize"
                            value={formData.shoeSize}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mărime Îmbrăcăminte</label>
                          <input
                            type="text"
                            name="clothingSize"
                            value={formData.clothingSize}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mărime Mănuși</label>
                          <input
                            type="text"
                            name="gloveSize"
                            value={formData.gloveSize}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <span className="text-xs font-bold text-slate-800">Profil Medical de Urgență & Traseu Navetă</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Grupă Sanguină</label>
                          <select
                            name="bloodType"
                            value={formData.bloodType}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">-- Nespecificat --</option>
                            <option value="0I">0 (I)</option>
                            <option value="AII">A (II)</option>
                            <option value="BIII">B (III)</option>
                            <option value="ABIV">AB (IV)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Factor Rh</label>
                          <select
                            name="rhFactor"
                            value={formData.rhFactor}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">-- Nespecificat --</option>
                            <option value="+">Pozitiv (+)</option>
                            <option value="-">Negativ (-)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Traseu Navetă</label>
                          <input
                            type="text"
                            name="commuteRoute"
                            value={formData.commuteRoute}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Durată Navetă (min)</label>
                          <input
                            type="number"
                            name="commuteDurationMinutes"
                            value={formData.commuteDurationMinutes}
                            onChange={handleChange}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Calificare Profesională</label>
                      <input
                        type="text"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Observații Administrative</label>
                      <textarea
                        rows={2}
                        name="adminNotes"
                        value={formData.adminNotes}
                        onChange={handleChange}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex gap-2">
                    {activeTab !== 'identity' && (
                      <button
                        type="button"
                        onClick={() => {
                          const tabs: TabKey[] = ['identity', 'contract', 'address', 'ssm'];
                          const idx = tabs.indexOf(activeTab);
                          if (idx > 0) setActiveTab(tabs[idx - 1]);
                        }}
                        className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        Înapoi
                      </button>
                    )}
                    {activeTab !== 'ssm' && (
                      <button
                        type="button"
                        onClick={() => {
                          const tabs: TabKey[] = ['identity', 'contract', 'address', 'ssm'];
                          const idx = tabs.indexOf(activeTab);
                          if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                        }}
                        className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                      >
                        Următorul Pas
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      disabled={isSubmitting}
                      className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Anulează
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shadow-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Se salvează...</span>
                        </>
                      ) : (
                        <span>Salvează Modificările</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
