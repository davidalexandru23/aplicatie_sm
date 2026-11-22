import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { maskCNP } from '@/lib/security';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { 
  calculateEmployeeCompliance, 
  calculateCompanyMetrics, 
  formatRoDate 
} from '@/lib/compliance';
import { getCaenEntry } from '@/lib/caen-catalog';
import {
  ComplianceItemBadge,
  OverallComplianceBadge,
  ComplianceScoreBadge,
  ComplianceBreakdownPills,
  ComplianceAlertBanner,
} from '@/components/compliance-badge';
import { ClientEditModal } from '@/components/client-edit-modal';
import { OrganizationalDecisionsCard } from '@/components/organizational-decisions-card';
import {
  AddEmployeeModal,
  RecordMedicalExamModal,
  EditEmployeeModal,
  TerminateEmployeeModal,
  ManageHygieneModulesModal,
} from '@/components/employees';
import { AddJobModal } from '@/components/jobs/add-job-modal';
import { EditJobModal } from '@/components/jobs/edit-job-modal';
import { ManageEipModal } from '@/components/employees/manage-eip-modal';
import { 
  Building2, 
  Users, 
  Briefcase, 
  MapPin, 
  FileText, 
  UploadCloud, 
  Download,
  Stethoscope,
  ShieldCheck,
  Flame,
  Award,
  AlertTriangle,
  Clock,
  Sparkles,
  Shield
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('ssm_session')?.value;
  const session = sessionCookie ? parseSessionFromCookieHeader(`ssm_session=${sessionCookie}`) : null;
  const userRole = session?.role || 'ADMIN';
  const isSsmRole = userRole === 'SSM';

  const [client, eipCatalog] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        worksites: { orderBy: { name: 'asc' } },
        jobs: {
          orderBy: { title: 'asc' },
          include: {
            eipRequirements: { include: { eipItem: true } },
          },
        },
        provider: true,
        specialist: true,
        employees: {
          orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
          include: {
            currentJob: {
              include: {
                eipRequirements: { include: { eipItem: true } },
              },
            },
            currentWorksite: true,
            identityDocument: true,
            residenceAddress: true,
            eipAssignments: {
              include: { eipItem: true },
              orderBy: { assignedDate: 'desc' },
            },
            hygieneModules: {
              orderBy: { examDate: 'desc' },
            },
            hygieneParticipants: {
              include: { session: true },
              orderBy: { createdAt: 'desc' },
            },
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
    }),
    prisma.eipItem.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!client) {
    notFound();
  }

  const activeEmployees = client.employees.filter((e) => e.status === 'ACTIV');
  
  // Calcul conformitate per salariat și la nivel de companie (pe angajații activi)
  const clientMetrics = calculateCompanyMetrics(activeEmployees);

  // Pre-evaluăm conformitatea fiecărui salariat pentru randare optimizată
  const evaluatedEmployees = client.employees.map((emp) => ({
    ...emp,
    compliance: calculateEmployeeCompliance(emp),
  }));

  // Profil CAEN rezolvat din catalog
  const caenMeta = client.caenCode ? getCaenEntry(client.caenCode) : undefined;

  // Active employee options for organizational decisions appointments
  const activeEmployeeOptions = activeEmployees.map((e) => ({
    id: e.id,
    fullName: `${e.lastName} ${e.firstName}`,
    jobTitle: e.currentJob?.title,
  }));

  // Găsim ultimul pachet de decizii generat
  const lastDeciziiDoc = client.generatedDocuments.find(
    (d) => d.template.code === 'decizii-angajator'
  );

  return (
    <div className="space-y-8">
      {/* 1. Client Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {client.name}
            </h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                client.isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {client.isActive ? 'CLIENT ACTIV' : 'INACTIV'}
            </span>
            <ComplianceScoreBadge 
              scorePercent={clientMetrics.complianceScorePercent} 
              size="sm" 
            />
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
          <ClientEditModal client={client} />
          <a
            href={`/api/clients/${client.id}/export`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            download
          >
            <Download className="w-4 h-4" />
            <span>Exportă Registru Excel</span>
          </a>
          <a
            href={`/api/clients/${client.id}/packages/dossier`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            download
            title="Descarcă dosarul complet de organizare SSM la nivel de companie (16 documente DOCX)"
          >
            <Download className="w-4 h-4" />
            <span>Dosar SSM Companie (ZIP)</span>
          </a>
          <a
            href={`/api/clients/${client.id}/packages/inspection-archive`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            download
            title="Descarcă arhiva completă structurată pe foldere pentru inspecția ITM / ISU"
          >
            <Download className="w-4 h-4" />
            <span>Arhivă Inspecție ITM/ISU (ZIP)</span>
          </a>
          {!isSsmRole && (
            <Link
              href={`/imports/new?clientId=${client.id}`}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import / Actualizare Excel</span>
            </Link>
          )}
          <Link
            href={`/documents/generate?clientId=${client.id}`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Generează Document</span>
          </Link>
        </div>
      </div>

      {/* 2. Profil Activitate Economică (CAEN) & SEPP Abilitat Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Profil Activitate Economică (CAEN Rev. 2) & Serviciu Extern SSM (SEPP)
              </h2>
              <p className="text-xs text-slate-500">
                Parametrii legali de instruire și prestatorul abilitat ITM conform Legii 319/2006.
              </p>
            </div>
          </div>
          <ClientEditModal
            client={client}
            triggerClassName="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
            triggerText="Editează CAEN / SEPP"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Stânga: Profil CAEN & Cerințe Legale */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-md border border-blue-200">
                CAEN {client.caenCode || 'Nespecificat'}
              </span>
              {caenMeta?.riskClass && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    caenMeta.riskClass === 'LOW'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : caenMeta.riskClass === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  Clasă Risc {caenMeta.riskClass === 'LOW' ? 'Scăzut' : caenMeta.riskClass === 'MEDIUM' ? 'Mediu' : 'Ridicat'}
                </span>
              )}
              {client.foundedYear && (
                <span className="text-xs text-slate-500">
                  • Înființată în {client.foundedYear}
                </span>
              )}
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500">Denumire Activitate:</div>
              <div className="text-xs font-medium text-slate-900 mt-0.5">
                {client.caenActivity || caenMeta?.name || 'Activitate nespecificată în dosar.'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Interval SSM Legal</span>
                <span className="font-bold text-slate-800">
                  {caenMeta?.defaultSsmIntervalMonths || 6} luni
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Interval PSI Legal</span>
                <span className="font-bold text-slate-800">
                  {caenMeta?.defaultPsiIntervalMonths || 6} luni
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Curs Igienă</span>
                <span className={`font-bold ${caenMeta?.requiresHygieneCourse ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {caenMeta?.requiresHygieneCourse ? 'Obligatoriu' : 'Neaplicabil'}
                </span>
              </div>
            </div>
          </div>

          {/* Dreapta: Serviciu Extern de Prevenire și Protecție (SEPP) */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Serviciu Extern de Prevenire și Protecție (SEPP)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {client.provider?.authorizationNumber ? `ITM: ${client.provider.authorizationNumber}` : 'ABILITAT ITM'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Prestator Abilitat:</span>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <span>{client.provider?.name || client.ssmProviderName || <span className="text-slate-400 italic">Nespecificat</span>}</span>
                  {client.provider?.cui && (
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-200/60 px-1 rounded">
                      {client.provider.cui}
                    </span>
                  )}
                </div>
                {client.provider?.address && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {client.provider.address}
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Specialist / Evaluator Desemnat:</span>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span>{client.specialist?.name || client.ssmSpecialistName || <span className="text-slate-400 italic">Nespecificat</span>}</span>
                  {client.specialist?.role && (
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                      {client.specialist.role}
                    </span>
                  )}
                </div>
                {(client.specialist?.phone || client.specialist?.email) && (
                  <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                    {client.specialist.phone && <span>Tel: {client.specialist.phone}</span>}
                    {client.specialist.email && <span>Email: {client.specialist.email}</span>}
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Certificat Atestare / Abilitare:</span>
                <span className="font-mono text-slate-700 text-[11px] mt-0.5 block">
                  {client.specialist?.certificateNumber || client.ssmSpecialistCert || <span className="text-slate-400 italic font-sans">Nespecificat</span>}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Compliance Overview Dashboard Section */}
      <div className="space-y-4">
        {/* Banner de alertă critică dacă există scadențe depășite */}
        <ComplianceAlertBanner metrics={clientMetrics} clientName={client.name} />

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Stânga: Scor Conformitate */}
            <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
              <ComplianceScoreBadge 
                scorePercent={clientMetrics.complianceScorePercent}
                totalItems={clientMetrics.totalItemsTracked}
                validCount={clientMetrics.validCount}
                size="md"
              />
              <div className="mt-3 text-xs text-slate-500">
                Calculat pentru cei <strong className="text-slate-800">{activeEmployees.length}</strong> salariați activi pe 4 direcții: Medicină a Muncii, SSM, PSI/SU și Igienă.
              </div>
            </div>

            {/* Dreapta: Pastilele de distribuție */}
            <div className="lg:w-2/3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Distribuție Cerințe de Securitate în Muncă
              </div>
              <ComplianceBreakdownPills metrics={clientMetrics} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Stats Counter */}
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

      {/* 5. Organizational Decisions Manager (01-09) */}
      <OrganizationalDecisionsCard
        clientId={client.id}
        initialData={{
          designatedWorkerSsm: client.designatedWorkerSsm,
          firstAidResponder: client.firstAidResponder,
          psiResponder: client.psiResponder,
          investigationMembers: client.investigationMembers,
          decisionsDate: client.decisionsDate ? client.decisionsDate.toISOString().split('T')[0] : null,
          legalRepresentative: client.legalRepresentative,
        }}
        activeEmployees={activeEmployeeOptions}
        lastGeneratedDate={lastDeciziiDoc?.createdAt ? new Date(lastDeciziiDoc.createdAt).toLocaleDateString('ro-RO') : null}
        lastGeneratedDocId={lastDeciziiDoc?.id || null}
      />

      {/* 6. Section: Employees with Inline Compliance Badges */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50/75">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Registru Salariați & Monitorizare Scadențe ({client.employees.length})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 hidden md:block">
              {isSsmRole ? 'Modul SSM • Monitorizare Conformitate Salariați' : 'CNP mascat conform GDPR • Verificare automată HG 355/2007, Legea 319/2006'}
            </div>
            <AddEmployeeModal clientId={client.id} jobs={client.jobs} worksites={client.worksites} userRole={userRole} isSsmRole={isSsmRole} />
          </div>
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
                  <th className="px-5 py-3">Salariat</th>
                  <th className="px-3 py-3">Stare Generală</th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                      <span>Medicină Muncii</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Instruire SSM</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span>Instruire PSI</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Curs Igienă</span>
                    </span>
                  </th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Acțiuni & Documente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evaluatedEmployees.map((emp) => {
                  const comp = emp.compliance;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition">
                      {/* Salariat & Detalii de bază */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {emp.lastName} {emp.firstName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {!isSsmRole && (
                            <>
                              <span className="font-mono">{emp.cnp || '—'}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="truncate max-w-[140px]">{emp.currentJob?.title || 'Fără post'}</span>
                        </div>
                      </td>

                      {/* Stare Generală Agregată */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <OverallComplianceBadge status={comp.overallStatus} size="sm" />
                      </td>

                      {/* 1. Medicină a Muncii */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.occupationalMedicine} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 2. Instruire SSM */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.ssmTraining} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 3. Instruire PSI */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <ComplianceItemBadge 
                          item={comp.psiTraining} 
                          showSubtext={true}
                        />
                      </td>

                      {/* 4. Curs Igienă (Condițional) */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {comp.hygieneCertificate ? (
                          <ComplianceItemBadge 
                            item={comp.hygieneCertificate} 
                            showSubtext={true}
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Neaplicabil
                          </span>
                        )}
                      </td>

                      {/* Status HR (ACTIV / PLECAT) */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            emp.status === 'ACTIV'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : emp.status === 'Suspendat/CM'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>

                      {/* Acțiuni & Documente */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {emp.status === 'ACTIV' ? (
                            <>
                              {userRole !== 'IGIENA' && <ManageEipModal clientId={client.id} employee={emp as any} eipCatalog={eipCatalog} />}
                              {userRole !== 'IGIENA' && <RecordMedicalExamModal employee={emp} />}
                              <ManageHygieneModulesModal employee={emp as any} />
                              <EditEmployeeModal employeeId={emp.id} employeeName={`${emp.lastName} ${emp.firstName}`} jobs={client.jobs} worksites={client.worksites} userRole={userRole} isSsmRole={isSsmRole} />
                              {!isSsmRole && userRole !== 'IGIENA' && <TerminateEmployeeModal employee={emp} />}
                              {!isSsmRole && userRole !== 'IGIENA' && (
                                <>
                                  <Link
                                    href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-cerere-angajare`}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                                    title="Generează cerere de angajare"
                                  >
                                    Cerere
                                  </Link>
                                  <Link
                                    href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-declaratie-regulament`}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                                    title="Generează declarație regulament intern"
                                  >
                                    Declarație RI
                                  </Link>
                                  <Link
                                    href={`/documents/generate?clientId=${client.id}&employeeId=${emp.id}&templateCode=hr-cim-2026`}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                                    title="Generează CIM 2026"
                                  >
                                    CIM
                                  </Link>
                                  <a
                                    href={`/api/clients/${client.id}/packages/onboarding?employeeId=${emp.id}`}
                                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded inline-flex items-center gap-1 border border-emerald-200"
                                    title="Descarcă dosar complet de onboarding salariat (11 documente DOCX în ZIP)"
                                    download
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Onboarding ZIP</span>
                                  </a>
                                </>
                              )}
                            </>
                          ) : emp.status === 'Suspendat/CM' ? (
                            <>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                SUSPENDAT / CM
                              </span>
                              <EditEmployeeModal employeeId={emp.id} employeeName={`${emp.lastName} ${emp.firstName}`} jobs={client.jobs} worksites={client.worksites} userRole={userRole} isSsmRole={isSsmRole} />
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                                ÎNCETAT: {formatRoDate(emp.leaveDate)}
                              </span>
                              <EditEmployeeModal employeeId={emp.id} employeeName={`${emp.lastName} ${emp.firstName}`} jobs={client.jobs} worksites={client.worksites} userRole={userRole} isSsmRole={isSsmRole} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Two Column Layout: Worksites & Jobs */}
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Posturi & Context SSM ({client.jobs.length})</span>
            </h2>
            <AddJobModal clientId={client.id} eipCatalog={eipCatalog} />
          </div>
          {client.jobs.length === 0 ? (
            <div className="text-slate-400 text-xs py-4 text-center">Nu există posturi definite.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {client.jobs.map((j) => (
                <div key={j.id} className="py-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{j.title}</span>
                      {j.corCode && <span className="font-mono text-slate-400 text-[11px]">COR: {j.corCode}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {j.workersCount != null && (
                        <span className="text-[11px] text-slate-400">
                          {j.workersCount} {j.workersCount === 1 ? 'lucrător' : 'lucrători'}
                        </span>
                      )}
                      <EditJobModal clientId={client.id} job={j as any} eipCatalog={eipCatalog} />
                    </div>
                  </div>

                  {j.mainActivities && (
                    <div className="text-slate-500 text-[11px] line-clamp-2">{j.mainActivities}</div>
                  )}

                  {/* Flaguri de Risc Medical & Securitate (HG 355/2007) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {j.isFoodHandling && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Alimentație (Fișa 210)
                      </span>
                    )}
                    {j.isScreenWork && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Ecran &gt;4h (Fișa 243)
                      </span>
                    )}
                    {j.isDrivingRequired && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Șofat (Fișa 209)
                      </span>
                    )}
                    {j.noiseExposed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        Zgomot &gt;80dB (Fișa 138)
                      </span>
                    )}
                    {j.chemicalExposed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                        Chimic (Fișa 141)
                      </span>
                    )}
                    {j.vibrationExposed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Vibrații (Fișa 140)
                      </span>
                    )}
                    {j.heightWork && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Înălțime &gt;2m (Fișa 203)
                      </span>
                    )}

                    {j.workPosture && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        Postură: {j.workPosture === 'sitting' ? 'Așezat' : j.workPosture === 'standing' ? 'În picioare' : 'Mixtă'}
                      </span>
                    )}
                    {j.maxWeightKg != null && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        Max {j.maxWeightKg} kg
                      </span>
                    )}
                  </div>

                  {/* Dotare EIP Recomandată / Obligatorie */}
                  {j.eipRequirements && j.eipRequirements.length > 0 && (
                    <div className="pt-1 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">EIP:</span>
                      {j.eipRequirements.map((r: any) => (
                        <span
                          key={r.id || r.eipItemId}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-600 border border-slate-200"
                        >
                          {r.eipItem?.name || 'EIP'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 8. Generated Documents Archive for this Client */}
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
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          doc.status === 'approved_for_print'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
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
