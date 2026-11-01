import { prisma } from '../prisma';
import { TEMPLATE_CATALOG, TemplateDefinition, TemplateFieldDef } from './definitions';

export interface ResolvedPlaceholderItem {
  key: string;
  label: string;
  source: string;
  type: 'string' | 'date' | 'number' | 'boolean';
  required: boolean;
  value: string | number | boolean;
  isAutocompleted: boolean;
  defaultValue?: string | number | boolean;
}

export interface TemplateResolutionContext {
  templateCode: string;
  clientId: string;
  employeeId?: string;
  jobId?: string;
  hygieneSessionId?: string;
  hygieneParticipantId?: string;
  customOverrides?: Record<string, unknown>;
}

export function formatDateRo(value?: Date | string | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('ro-RO');
}

export function joinAddressParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ');
}

export async function resolveTemplatePlaceholders(ctx: TemplateResolutionContext): Promise<{
  template: TemplateDefinition;
  fields: ResolvedPlaceholderItem[];
  resolvedData: Record<string, unknown>;
}> {
  const template = TEMPLATE_CATALOG.find((t) => t.code === ctx.templateCode);
  if (!template) {
    throw new Error(`Șablonul cu codul ${ctx.templateCode} nu a fost găsit în catalog.`);
  }

  const client = await prisma.client.findUnique({
    where: { id: ctx.clientId },
    include: { jobs: true, worksites: true },
  });
  if (!client) {
    throw new Error(`Clientul nu a fost găsit.`);
  }

  const employee = ctx.employeeId
    ? await prisma.employee.findFirst({
        where: { id: ctx.employeeId, clientId: ctx.clientId },
        include: {
          identityDocument: true,
          residenceAddress: true,
          currentJob: true,
          currentWorksite: true,
        },
      })
    : null;

  const selectedJob = client.jobs.find((j) => j.id === ctx.jobId) || employee?.currentJob || null;
  const selectedWorksite = employee?.currentWorksite || client.worksites[0] || null;

  const hygieneSession = ctx.hygieneSessionId
    ? await prisma.hygieneSession.findUnique({
        where: { id: ctx.hygieneSessionId },
        include: { participants: { include: { employee: true } } },
      })
    : null;

  const participant = ctx.hygieneParticipantId && hygieneSession
    ? hygieneSession.participants.find((p) => p.id === ctx.hygieneParticipantId) || null
    : null;

  const now = new Date();
  const currentDateRo = formatDateRo(now);
  const currentYear = now.getFullYear();

  const residence = employee?.residenceAddress;
  const identity = employee?.identityDocument;
  const fullName = employee ? `${employee.lastName} ${employee.firstName}`.trim() : '';
  const participantFullName = participant ? `${participant.lastName} ${participant.firstName}`.trim() : '';

  const addressFull = residence
    ? joinAddressParts([
        residence.county,
        residence.locality,
        residence.street ? `str. ${residence.street}` : '',
        residence.number ? `nr. ${residence.number}` : '',
        residence.building ? `bl. ${residence.building}` : '',
        residence.entrance ? `sc. ${residence.entrance}` : '',
        residence.floor ? `et. ${residence.floor}` : '',
        residence.apartment ? `ap. ${residence.apartment}` : '',
      ])
    : '';

  const workplaceAddress = selectedWorksite?.address || client.address;

  const anyClient = client as any;
  const anyEmployee = employee as any;
  const anyJob = selectedJob as any;

  // Base map of ALL possible standard placeholders derived from DB & sensible Romanian defaults
  const baseMap: Record<string, unknown> = {
    // Client / Angajator
    PLACEHOLDER_FIRMA: client.name,
    PLACEHOLDER_CUI: client.cui,
    PLACEHOLDER_NR_REG_COM: client.regCom || '',
    PLACEHOLDER_ADRESA_FIRMA: client.address,
    PLACEHOLDER_ADRESA: addressFull || client.address,
    PLACEHOLDER_REPREZENTANT_LEGAL: client.legalRepresentative || '',
    PLACEHOLDER_CALITATE_REPREZENTANT: anyClient.legalRepresentativeRole || 'Administrator',
    PLACEHOLDER_TELEFON_CONTACT: client.contactPhone || '',
    PLACEHOLDER_EMAIL_CONTACT: client.contactEmail || '',
    PLACEHOLDER_ACTIVITATE_PRINCIPALA: anyClient.mainActivity || selectedJob?.mainActivities || '',
    PLACEHOLDER_COD_CAEN: anyClient.caenCode || '',
    PLACEHOLDER_AN_INFIINTARE: anyClient.fiscalYear || '2020',
    PLACEHOLDER_NUMAR_LUCRATORI: anyClient.employeeCount || 3,

    // Temporal
    PLACEHOLDER_AN: currentYear,
    PLACEHOLDER_AN_EVALUARE: currentYear,
    PLACEHOLDER_DATA_DOCUMENT: currentDateRo,
    PLACEHOLDER_DATA_APROBARE: currentDateRo,
    PLACEHOLDER_DATA_APLICARE: currentDateRo,
    PLACEHOLDER_DATA_DECIZIE: currentDateRo,
    PLACEHOLDER_DATA_SEMNARE: currentDateRo,
    PLACEHOLDER_DATA: currentDateRo,
    PLACEHOLDER_NUMAR_DOCUMENT: '1',

    // Specialist & Prestator SSM
    PLACEHOLDER_SPECIALIST_SSM: anyClient.externalService || 'Ing. Popescu Ion - Specialist SSM',
    PLACEHOLDER_PRESTATOR_SSM: 'SC EXPERT SSM TRAINING SRL',
    PLACEHOLDER_FURNIZOR_SSM: 'SC EXPERT SSM TRAINING SRL',
    PLACEHOLDER_CUI_PRESTATOR: 'RO30123456',
    PLACEHOLDER_TELEFON_PRESTATOR: '0721.000.111',
    PLACEHOLDER_EMAIL_PRESTATOR: 'contact@expertssm.ro',
    PLACEHOLDER_SITE_PRESTATOR: 'www.expertssm.ro',
    PLACEHOLDER_FUNCTIE_PRESTATOR: 'Director Formare / Specialist SSM',
    PLACEHOLDER_REVIZIE_SPECIALIST_SSM: 'Revizia 1 / 2026 - Specialist SSM',

    // Salariat
    PLACEHOLDER_NUME_COMPLET: fullName || participantFullName,
    PLACEHOLDER_NUME: employee?.lastName || participant?.lastName || '',
    PLACEHOLDER_PRENUME: employee?.firstName || participant?.firstName || '',
    PLACEHOLDER_CNP: employee?.cnp || participant?.cnp || '',
    PLACEHOLDER_DATA_NASTERII: formatDateRo(employee?.birthDate || participant?.birthDate),
    PLACEHOLDER_LOCALITATE_NASTERII: employee?.birthPlace || participant?.birthPlace || '',
    PLACEHOLDER_JUDET_NASTERII: employee?.birthCounty || '',

    // Act identitate
    PLACEHOLDER_TIP_ACT: identity?.docType || participant?.docType || 'C.I.',
    PLACEHOLDER_SERIE_ACT: identity?.series || participant?.docSeries || '',
    PLACEHOLDER_NUMAR_ACT: identity?.number || participant?.docNumber || '',
    PLACEHOLDER_NR_ACT: identity?.number || participant?.docNumber || '',
    PLACEHOLDER_EMITENT_ACT: identity?.issuedBy || '',
    PLACEHOLDER_EMITENT: identity?.issuedBy || '',
    PLACEHOLDER_DATA_EMITERII: formatDateRo(identity?.issueDate),
    PLACEHOLDER_DATA_ACT: formatDateRo(identity?.issueDate),
    PLACEHOLDER_DATA_EXPIRARII: formatDateRo(identity?.expiryDate),

    // Domiciliu
    PLACEHOLDER_ADRESA_DOMICILIU: addressFull,
    PLACEHOLDER_JUDET_DOMICILIU: residence?.county || '',
    PLACEHOLDER_JUDET: residence?.county || '',
    PLACEHOLDER_LOCALITATE_DOMICILIU: residence?.locality || '',
    PLACEHOLDER_LOCALITATE: residence?.locality || '',
    PLACEHOLDER_STRADA_DOMICILIU: residence?.street || '',
    PLACEHOLDER_NUMAR_DOMICILIU: residence?.number || '',
    PLACEHOLDER_NR: residence?.number || '',
    PLACEHOLDER_BLOC: residence?.building || '',
    PLACEHOLDER_SCARA: residence?.entrance || '',
    PLACEHOLDER_ETAJ: residence?.floor || '',
    PLACEHOLDER_APARTAMENT: residence?.apartment || '',
    PLACEHOLDER_LOCALITATE_SEMNARE: residence?.locality || 'București',

    // Post & Contract Individual de Muncă
    PLACEHOLDER_FUNCTIE: selectedJob?.title || participant?.jobTitle || '',
    PLACEHOLDER_COD_COR: selectedJob?.corCode || '',
    PLACEHOLDER_ADRESA_PUNCT_LUCRU: workplaceAddress,
    PLACEHOLDER_PUNCT_LUCRU: selectedWorksite?.name || 'Sediu social',
    PLACEHOLDER_DATA_ANGAJARII: formatDateRo(employee?.hireDate),
    PLACEHOLDER_DATA_ANGAJ: formatDateRo(employee?.hireDate),
    PLACEHOLDER_DATA_INCEPERE: formatDateRo(employee?.hireDate),
    PLACEHOLDER_DATA_SFARSIT: '-',
    PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: 'nedeterminată',
    PLACEHOLDER_NUMAR_CIM: anyEmployee?.cimNumber || '101',
    PLACEHOLDER_PERMIS_MUNCA: 'Nu este cazul',
    PLACEHOLDER_ORE_PE_ZI: anyJob?.dailyHours || 8,
    PLACEHOLDER_PROGRAM_LUCRU: '08:00 - 16:30',
    PLACEHOLDER_ZILE_CONCEDIU: 21,
    PLACEHOLDER_SALARIU_BRUT: '4050 lei',
    PLACEHOLDER_ALTE_DREPTURI_SALARIALE: 'Conform CCM / decizii interne',
    PLACEHOLDER_DATA_PLATA: '15 a fiecărei luni',
    PLACEHOLDER_ZILE_PROBA: 90,
    PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE: 20,
    PLACEHOLDER_DATA_CERERE: formatDateRo(employee?.hireDate || now),
    PLACEHOLDER_DATA_DECLARATIE: formatDateRo(employee?.hireDate || now),

    // Sănătate & Persoane în întreținere (CIM)
    PLACEHOLDER_CASA_SANATATE: 'CASMB București',
    PLACEHOLDER_CASA_SANAT: 'CASMB București',
    PLACEHOLDER_TIP_PENSIE: 'Nu este cazul',
    PLACEHOLDER_NUME_COMPLET_PERSOANA_01: '-',
    PLACEHOLDER_CNP_PERSOANA_01: '-',
    PLACEHOLDER_CALITATE_PERSOANA_01: '-',
    PLACEHOLDER_CALITATE_01: '-',
    PLACEHOLDER_CNP_01: '-',
    PLACEHOLDER_INVALIDITATE_PERSOANA_01: '-',
    PLACEHOLDER_DATA_INTRETINERE_01: '-',
    PLACEHOLDER_VENIT_PERSOANA_01: '-',
    PLACEHOLDER_NUME_COMPLET_PERSOANA_02: '-',
    PLACEHOLDER_CNP_PERSOANA_02: '-',
    PLACEHOLDER_CALITATE_PERSOANA_02: '-',
    PLACEHOLDER_CALITATE_02: '-',
    PLACEHOLDER_CNP_02: '-',
    PLACEHOLDER_INVALIDITATE_PERSOANA_02: '-',
    PLACEHOLDER_DATA_INTRETINERE_02: '-',
    PLACEHOLDER_VENIT_PERSOANA_02: '-',

    // Risc & Evaluare
    PLACEHOLDER_EVALUATOR_RISC: 'Ing. Evaluator Risc Popescu Ion',
    PLACEHOLDER_CERTIFICAT_EVALUATOR: 'Certificat Seria EV nr. 4521',
    PLACEHOLDER_NIVEL_RISC_GLOBAL: '2.84 (Nivel de risc mic spre mediu)',
    PLACEHOLDER_CONCLUZII_EVALUARE: 'Nivelul de securitate se încadrează în limitele admise legal.',
    PLACEHOLDER_NUMAR_FISA_EVALUARE: 'FE-01',
    PLACEHOLDER_NUMAR_FACTORI_RISC: 17,
    PLACEHOLDER_NUMAR_LOC_MUNCA: 1,
    PLACEHOLDER_NUMAR_PERSOANE_EXPUSE: anyClient.employeeCount || 3,
    PLACEHOLDER_DURATA_EXPUNERII: `${anyJob?.dailyHours || 8} ore/zi`,
    PLACEHOLDER_DEPARTAMENT: selectedWorksite?.activity || 'Administrativ / TESA',
    PLACEHOLDER_REPARTITIE_RISCURI: 'F1-F17 conform fișei de evaluare a riscurilor',

    // Sesiune Igienă
    PLACEHOLDER_MODUL_IGIENA: employee?.hygieneModule || participant?.employee?.hygieneModule || 'Nivelul 1 - Servicii de curățenie și alimentație',
    PLACEHOLDER_MODULE_IGIENA: 'Modulul I',
    PLACEHOLDER_NIVEL_IGIENA: 'Nivelul 1',
    PLACEHOLDER_AVIZ_MS: hygieneSession?.msAuthorization || 'Aviz MS nr. 102/2024',
    PLACEHOLDER_AVIZ_ME: hygieneSession?.meAuthorization || 'Aviz ME nr. 55/2024',
    PLACEHOLDER_DATA_AVIZ_MS: '15.01.2024',
    PLACEHOLDER_DATA_AVIZ_ME: '20.01.2024',
    PLACEHOLDER_NUMAR_AVIZ_MS: '102',
    PLACEHOLDER_NUMAR_AVIZ_ME: '55',
    PLACEHOLDER_DATA_SESIUNE: formatDateRo(hygieneSession?.sessionDate),
    PLACEHOLDER_DATA_EXAMEN: formatDateRo(hygieneSession?.examDate),
    PLACEHOLDER_LOCATIE_EXAMEN: hygieneSession?.location || 'Sediul Prestatorului',
    PLACEHOLDER_SALA_EXAMEN: 'Sala Curs 1',
    PLACEHOLDER_ORA_EXAMEN: '10:00',
    PLACEHOLDER_COMISIE_EXAMEN: hygieneSession
      ? [hygieneSession.commissionPresident, hygieneSession.commissionMember1, hygieneSession.commissionMember2, hygieneSession.commissionSecretary].filter(Boolean).join(', ')
      : 'Dr. Ionescu Radu, As. Medical Mihai Elena, Insp. DSP Popa Dan, Secretar Georgescu Ana',
    PLACEHOLDER_PRESEDINTE_COMISIE: hygieneSession?.commissionPresident || 'Dr. Ionescu Radu',
    PLACEHOLDER_MEMBRU_COMISIE: hygieneSession?.commissionMember1 || 'As. Medical Mihai Elena',
    PLACEHOLDER_MEMBRU_COMISIE_1: hygieneSession?.commissionMember1 || 'As. Medical Mihai Elena',
    PLACEHOLDER_MEMBRU_COMISIE_2: hygieneSession?.commissionMember2 || 'Insp. DSP Popa Dan',
    PLACEHOLDER_SECRETAR_COMISIE: hygieneSession?.commissionSecretary || 'Secretar Georgescu Ana',
    PLACEHOLDER_NUMAR_DECIZIE_COMISIE: 'Decizia nr. 12/2026',
    PLACEHOLDER_NUMAR_CATALOG: 'CAT-2026-01',
    PLACEHOLDER_DATA_CATALOG: formatDateRo(hygieneSession?.examDate),
    PLACEHOLDER_NUMAR_CANDIDATI: hygieneSession?.participants.length || 3,
    PLACEHOLDER_NUMAR_PREZENTI: hygieneSession?.participants.filter((p) => p.attendance === 'prezent').length || 3,
    PLACEHOLDER_NUMAR_ADMISI: hygieneSession?.participants.filter((p) => p.examResult === 'admis').length || 3,
    PLACEHOLDER_NUMAR_RESPINSI: hygieneSession?.participants.filter((p) => p.examResult === 'respins').length || 0,
    PLACEHOLDER_NUMAR_ADEVERINTA: participant?.certificateNumber || '101',
    PLACEHOLDER_SERIE_ADEVERINTA: participant?.certificateSeries || 'IGI',
    PLACEHOLDER_DATA_ELIBERARE: formatDateRo(hygieneSession?.examDate),
    PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: participant
      ? [participant.certificateSeries, participant.certificateNumber].filter(Boolean).join(' ')
      : 'IGI 101',
    PLACEHOLDER_REZULTAT_EXAMEN: participant?.examResult || 'Admis',
    PLACEHOLDER_ORDIN_APLICABIL: 'Ordinul MS/ME nr. 1225/5031/2003',
    PLACEHOLDER_SERIE_PV: 'PV-EX',
    PLACEHOLDER_NUMAR_PV: hygieneSession?.pvSeriesNumber || '15',
    PLACEHOLDER_DATA_PV: formatDateRo(hygieneSession?.examDate),
    PLACEHOLDER_JUDET_EXAMEN: 'București',
    PLACEHOLDER_LOCALITATE_EXAMEN: 'București',
    PLACEHOLDER_DATA_INREGISTRARE: currentDateRo,
    PLACEHOLDER_DATA_EMITERE: currentDateRo,
    PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: 'REG-1045',
    PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: 'CERT-889',
    PLACEHOLDER_CERTIFICAT_FURNIZOR: 'Certificat seria IG nr. 889',
    PLACEHOLDER_NUMAR_FURNIZOR: '12',
    PLACEHOLDER_STRADA_FURNIZOR: 'Str. Formatorilor',
    PLACEHOLDER_BLOC_FURNIZOR: 'B1',
    PLACEHOLDER_SCARA_FURNIZOR: 'A',
    PLACEHOLDER_ETAJ_FURNIZOR: '2',
    PLACEHOLDER_APARTAMENT_FURNIZOR: '8',
    PLACEHOLDER_LOCALITATE_FURNIZOR: 'București',
    PLACEHOLDER_JUDET_FURNIZOR: 'Sector 1',
    PLACEHOLDER_COD_POSTAL_FURNIZOR: '010101',
    PLACEHOLDER_ACT_REPREZENTANT: 'Decizia AGA nr. 1/2020',
    PLACEHOLDER_REPREZENTANT_PRESTATOR: 'Director General Popa Ion',
    PLACEHOLDER_AUTORITATE_EMITENTA: 'DSP București',

    // Repetitive and multi-risk placeholders with indexed defaults (01-17, 01-06)
    ...Array.from({ length: 20 }, (_, idx) => {
      const numStr = String(idx + 1).padStart(2, '0');
      return {
        [`PLACEHOLDER_DENUMIRE_ZONA_${numStr}`]: `Zona ${idx + 1}: Depozit / Tablou electric / Scară`,
        [`PLACEHOLDER_FACTORI_ZONA_${numStr}`]: 'Risc mecanic, electrocutare prin atingere indirectă',
        [`PLACEHOLDER_MASURI_ZONA_${numStr}`]: 'Marcare vizuală, interzicere acces neautorizat, dotare stingător',
        [`PLACEHOLDER_FRECVENTA_RISC_${numStr}`]: 'Zilnic',
        [`PLACEHOLDER_FACTOR_RISC_${numStr}`]: `Factor de risc ${idx + 1}: Lucru prelungit la ecran / poziție statică`,
        [`PLACEHOLDER_CONSECINTA_RISC_${numStr}`]: 'Afecțiuni musculo-scheletice, astenopie',
        [`PLACEHOLDER_GRAVITATE_RISC_${numStr}`]: '2',
        [`PLACEHOLDER_PROBABILITATE_RISC_${numStr}`]: '2',
        [`PLACEHOLDER_NIVEL_RISC_${numStr}`]: '2',
        [`PLACEHOLDER_MASURA_PREVENIRE_${numStr}`]: 'Pauze active de 10 min la fiecare 2 ore, scaun ergonomic reglat',
        [`PLACEHOLDER_TERMEN_REALIZARE_${numStr}`]: 'Permanent',
      };
    }).reduce((acc, obj) => ({ ...acc, ...obj }), {}),

    // Decizii specific placeholders
    PLACEHOLDER_AJUTOR_LUCRARE: 'Lucrător auxiliar desemnat',
    PLACEHOLDER_CONTACT_ANUNTARE_INCIDENT: client.contactPhone || '112 / Dispecerat SSM',
    PLACEHOLDER_DATA_BULETIN_ANALIZA: currentDateRo,
    PLACEHOLDER_DATA_FINALIZARE_LUCRARE: currentDateRo,
    PLACEHOLDER_DATA_INCEPERE_LUCRARE: currentDateRo,
    PLACEHOLDER_DATA_INTOCMIRE: currentDateRo,
    PLACEHOLDER_DATA_PERMIS_FOC: currentDateRo,
    PLACEHOLDER_DESCRIERE_LUCRARE: 'Lucrări de mentenanță și verificare tehnică periodică',
    PLACEHOLDER_DOMENIU_INSTRUIRE: 'Securitate și sănătate în muncă / PSI',
    PLACEHOLDER_EMITENT_BULETIN_ANALIZA: 'Laborator Atestat INCDPM',
    PLACEHOLDER_EXECUTANT_LUCRARE: 'Echipă tehnică internă',
    PLACEHOLDER_FUNCTIE_INSTRUCTOR: 'Specialist SSM / Conducător loc de muncă',
    PLACEHOLDER_LUCRATOR_DESEMNAT_SSM: 'Ing. Popescu Ion',
    PLACEHOLDER_MASURI_PSI_SUPLIMENTARE: 'Asigurare stingător cu pulbere 6 kg la locul de muncă',
    PLACEHOLDER_METODA_IZOLARE_INSTALATII: 'Întrerupere alimentare electrică și semnalizare panou',
    PLACEHOLDER_MIJLOACE_STINGERE: 'Stingător P6, hidrant interior',
    PLACEHOLDER_NUMAR_BULETIN_ANALIZA: 'BA-2026/05',
    PLACEHOLDER_NUMAR_PERMIS_FOC: 'PF-01/2026',
    PLACEHOLDER_ORA_FINALIZARE: '16:00',
    PLACEHOLDER_ORA_INCEPERE: '08:30',
    PLACEHOLDER_PROTECTIE_MATERIALE: 'Materiale ignifugate, degajare zonă pe o rază de 5 metri',
    PLACEHOLDER_RAZA_PROTECTIE_METRI: '5 metri',
    PLACEHOLDER_RESPONSABIL_CONTROL_PSI: 'Responsabil PSI Desemnat',
    PLACEHOLDER_RESPONSABIL_PRIM_AJUTOR: 'Lucrător Instruit Prim Ajutor',
    PLACEHOLDER_RESPONSABIL_PSI: 'Responsabil Tehnic PSI',
    PLACEHOLDER_RESPONSABIL_SUPRAVEGHERE_LUCRARI: 'Șef Punct de Lucru',
    PLACEHOLDER_TEHNOLOGIE_LUCRU: 'Procedură de lucru conform normelor interne',
    PLACEHOLDER_VENTILARE_SPATIU: 'Ventilare naturală organizată prin ferestre și uși deschise',
  };

  // Merge overrides passed by operator
  const mergedData: Record<string, unknown> = {
    ...baseMap,
    ...(ctx.customOverrides || {}),
  };

  // Build the list of fields for this specific template
  const resolvedFields: ResolvedPlaceholderItem[] = template.fields.map((def: TemplateFieldDef) => {
    const rawVal = mergedData[def.key];
    const val = rawVal !== undefined && rawVal !== null ? rawVal : (def.defaultValue ?? '');
    const isAutocompleted =
      rawVal !== undefined &&
      rawVal !== null &&
      String(rawVal).trim() !== '' &&
      !def.source.startsWith('manual');

    return {
      key: def.key,
      label: def.label,
      source: def.source,
      type: def.type,
      required: def.required,
      value: val as string | number | boolean,
      isAutocompleted,
      defaultValue: def.defaultValue,
    };
  });

  return {
    template,
    fields: resolvedFields,
    resolvedData: mergedData,
  };
}
