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

export function formatRomanianAddress(residence: {
  county?: string | null;
  locality?: string | null;
  street?: string | null;
  number?: string | null;
  building?: string | null;
  entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
} | null | undefined): string {
  if (!residence) return '';
  const parts: string[] = [];

  const loc = (residence.locality || '').trim();
  const cty = (residence.county || '').trim();

  if (loc && cty) {
    if (loc.toLowerCase() === cty.toLowerCase()) {
      parts.push(loc);
    } else if (cty.toLowerCase().startsWith('sector')) {
      parts.push(`${loc}, ${cty}`);
    } else if (loc.toLowerCase().startsWith('sector') && cty.toLowerCase() === 'bucurești') {
      parts.push(`București, ${loc}`);
    } else {
      const ctyFormatted = cty.toLowerCase().startsWith('jud') ? cty : `jud. ${cty}`;
      parts.push(`${loc}, ${ctyFormatted}`);
    }
  } else if (loc) {
    parts.push(loc);
  } else if (cty) {
    parts.push(cty);
  }

  if (residence.street) {
    const s = residence.street.trim();
    if (/^(str|strada|bd|b-dul|bulevard|bulevardul|calea|cal\.|sos|sos\.|soseaua|alee|aleea|intr|intr\.|intrarea|piata|splai|splaiul)\b/i.test(s)) {
      parts.push(s);
    } else {
      parts.push(`str. ${s}`);
    }
  }

  if (residence.number) {
    const nr = residence.number.trim();
    parts.push(/^nr\.?/i.test(nr) ? nr : `nr. ${nr}`);
  }

  if (residence.building) {
    const b = residence.building.trim();
    parts.push(/^bl\.?/i.test(b) ? b : `bl. ${b}`);
  }

  if (residence.entrance) {
    const sc = residence.entrance.trim();
    parts.push(/^sc\.?/i.test(sc) ? sc : `sc. ${sc}`);
  }

  if (residence.floor) {
    const et = residence.floor.trim();
    parts.push(/^et\.?/i.test(et) ? et : `et. ${et}`);
  }

  if (residence.apartment) {
    const ap = residence.apartment.trim();
    parts.push(/^ap\.?/i.test(ap) ? ap : `ap. ${ap}`);
  }

  return parts.join(', ');
}

export function formatStreetName(street?: string | null): string | undefined {
  if (!street) return undefined;
  const s = street.trim();
  if (!s) return undefined;
  if (/^(str|strada|bd|b-dul|bulevard|bulevardul|calea|cal\.|sos|sos\.|soseaua|alee|aleea|intr|intr\.|intrarea|piata|splai|splaiul)\b/i.test(s)) {
    return s;
  }
  return `Str. ${s}`;
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

  const addressFull = residence ? formatRomanianAddress(residence) : '';

  const workplaceAddress = selectedWorksite?.address || client.address;

  // Strict mapping: ONLY map verified data existing in DB.
  // CRITICAL: PLACEHOLDER_REPREZENTANT_LEGAL is strictly the company administrator, NEVER the employee!
  const verifiedMap: Record<string, unknown> = {
    // 1. Date Firmă / Angajator
    PLACEHOLDER_FIRMA: client.name,
    PLACEHOLDER_CUI: client.cui,
    PLACEHOLDER_NR_REG_COM: client.regCom || undefined,
    PLACEHOLDER_ADRESA_FIRMA: client.address,
    PLACEHOLDER_ADRESA: addressFull || client.address,
    // Administratorul legal al firmei (exclusiv din client.legalRepresentative, niciodată salariatul!)
    PLACEHOLDER_REPREZENTANT_LEGAL: client.legalRepresentative || undefined,
    PLACEHOLDER_DIRECTOR: client.legalRepresentative || undefined,
    PLACEHOLDER_CALITATE_REPREZENTANT: (ctx.customOverrides?.PLACEHOLDER_CALITATE_REPREZENTANT as string) || (client.legalRepresentative ? 'Administrator' : undefined),
    PLACEHOLDER_TELEFON_CONTACT: client.contactPhone || undefined,
    PLACEHOLDER_EMAIL_CONTACT: client.contactEmail || undefined,

    // 2. Metadate temporale
    PLACEHOLDER_AN: currentYear,
    PLACEHOLDER_DATA_DOCUMENT: currentDateRo,
    PLACEHOLDER_DATA_APROBARE: currentDateRo,
    PLACEHOLDER_DATA_APLICARE: currentDateRo,
    PLACEHOLDER_DATA_DECIZIE: currentDateRo,
    PLACEHOLDER_DATA_INTOCMIRE: currentDateRo,
    PLACEHOLDER_DATA_SEMNARE: (employee?.hireDate ? formatDateRo(employee.hireDate) : currentDateRo),
    PLACEHOLDER_DATA: currentDateRo,

    // 3. Salariat (doar dacă există salariat selectat)
    ...(employee ? {
      PLACEHOLDER_NUME_COMPLET: fullName,
      PLACEHOLDER_NUME: employee.lastName,
      PLACEHOLDER_PRENUME: employee.firstName,
      PLACEHOLDER_CNP: employee.cnp,
      PLACEHOLDER_DATA_NASTERII: formatDateRo(employee.birthDate) || undefined,
      PLACEHOLDER_LOCALITATE_NASTERII: employee.birthPlace || undefined,
      PLACEHOLDER_JUDET_NASTERII: employee.birthCounty || undefined,

      // Act identitate
      PLACEHOLDER_TIP_ACT: identity?.docType || undefined,
      PLACEHOLDER_SERIE_ACT: identity?.series || undefined,
      PLACEHOLDER_NUMAR_ACT: identity?.number || undefined,
      PLACEHOLDER_NR_ACT: identity?.number || undefined,
      PLACEHOLDER_EMITENT_ACT: identity?.issuedBy || undefined,
      PLACEHOLDER_EMITENT: identity?.issuedBy || undefined,
      PLACEHOLDER_DATA_EMITERII: formatDateRo(identity?.issueDate) || undefined,
      PLACEHOLDER_DATA_ACT: formatDateRo(identity?.issueDate) || undefined,
      PLACEHOLDER_DATA_EXPIRARII: formatDateRo(identity?.expiryDate) || undefined,

      // Domiciliu
      PLACEHOLDER_ADRESA_DOMICILIU: addressFull || undefined,
      PLACEHOLDER_JUDET_DOMICILIU: residence?.county || undefined,
      PLACEHOLDER_JUDET: residence?.county || undefined,
      PLACEHOLDER_LOCALITATE_DOMICILIU: residence?.locality || undefined,
      PLACEHOLDER_LOCALITATE: residence?.locality || undefined,
      PLACEHOLDER_STRADA_DOMICILIU: formatStreetName(residence?.street),
      PLACEHOLDER_NUMAR_DOMICILIU: residence?.number || undefined,
      PLACEHOLDER_NR: residence?.number || undefined,
      PLACEHOLDER_BLOC: residence?.building || undefined,
      PLACEHOLDER_SCARA: residence?.entrance || undefined,
      PLACEHOLDER_ETAJ: residence?.floor || undefined,
      PLACEHOLDER_APARTAMENT: residence?.apartment || undefined,
      PLACEHOLDER_LOCALITATE_SEMNARE: residence?.locality || undefined,

      // Post & Date contract
      PLACEHOLDER_DATA_ANGAJARII: formatDateRo(employee.hireDate) || undefined,
      PLACEHOLDER_DATA_ANGAJ: formatDateRo(employee.hireDate) || undefined,
      PLACEHOLDER_DATA_INCEPERE: formatDateRo(employee.hireDate) || undefined,
      PLACEHOLDER_DATA_CERERE: formatDateRo(employee.hireDate) || undefined,
      PLACEHOLDER_DATA_DECLARATIE: formatDateRo(employee.hireDate) || undefined,
    } : {}),

    // 4. Post & Punct de lucru
    ...(selectedJob ? {
      PLACEHOLDER_FUNCTIE: selectedJob.title,
      PLACEHOLDER_COD_COR: selectedJob.corCode || undefined,
    } : {}),
    ...(selectedWorksite ? {
      PLACEHOLDER_ADRESA_PUNCT_LUCRU: selectedWorksite.address,
      PLACEHOLDER_PUNCT_LUCRU: selectedWorksite.name,
      PLACEHOLDER_DEPARTAMENT: selectedWorksite.activity || undefined,
    } : {}),

    // 5. Sesiune Igienă
    ...(hygieneSession ? {
      PLACEHOLDER_PRESTATOR_SSM: hygieneSession.providerName || undefined,
      PLACEHOLDER_FURNIZOR_SSM: hygieneSession.providerName || undefined,
      PLACEHOLDER_AVIZ_MS: hygieneSession.msAuthorization || undefined,
      PLACEHOLDER_AVIZ_ME: hygieneSession.meAuthorization || undefined,
      PLACEHOLDER_DATA_SESIUNE: formatDateRo(hygieneSession.sessionDate) || undefined,
      PLACEHOLDER_DATA_EXAMEN: formatDateRo(hygieneSession.examDate) || undefined,
      PLACEHOLDER_DATA_PV: formatDateRo(hygieneSession.examDate) || undefined,
      PLACEHOLDER_DATA_CATALOG: formatDateRo(hygieneSession.examDate) || undefined,
      PLACEHOLDER_LOCATIE_EXAMEN: hygieneSession.location || undefined,
      PLACEHOLDER_NUMAR_PV: hygieneSession.pvSeriesNumber || undefined,
      PLACEHOLDER_PRESEDINTE_COMISIE: hygieneSession.commissionPresident || undefined,
      PLACEHOLDER_MEMBRU_COMISIE: hygieneSession.commissionMember1 || undefined,
      PLACEHOLDER_MEMBRU_COMISIE_1: hygieneSession.commissionMember1 || undefined,
      PLACEHOLDER_MEMBRU_COMISIE_2: hygieneSession.commissionMember2 || undefined,
      PLACEHOLDER_SECRETAR_COMISIE: hygieneSession.commissionSecretary || undefined,
      PLACEHOLDER_COMISIE_EXAMEN: [
        hygieneSession.commissionPresident,
        hygieneSession.commissionMember1,
        hygieneSession.commissionMember2,
        hygieneSession.commissionSecretary,
      ].filter(Boolean).join(', ') || undefined,
      // Totaluri calculate strict din participanți
      PLACEHOLDER_NUMAR_CANDIDATI: hygieneSession.participants.length,
      PLACEHOLDER_NUMAR_PREZENTI: hygieneSession.participants.filter((p) => p.attendance === 'prezent').length,
      PLACEHOLDER_NUMAR_ADMISI: hygieneSession.participants.filter((p) => p.examResult === 'admis' && p.attendance === 'prezent').length,
      PLACEHOLDER_NUMAR_RESPINSI: hygieneSession.participants.filter((p) => p.examResult === 'respins' && p.attendance === 'prezent').length,
      // Participanți pentru tabele Excel
      participants: hygieneSession.participants.map((item, index) => ({
        ...item,
        rowNumber: index + 1,
        fullName: `${item.lastName} ${item.firstName}`.trim(),
        identityDocument: [item.docType, item.docSeries && `seria ${item.docSeries}`, item.docNumber && `nr. ${item.docNumber}`].filter(Boolean).join(' '),
        module: item.employee?.hygieneModule || '',
        sessionDate: formatDateRo(hygieneSession.sessionDate),
        providerName: hygieneSession.providerName,
        coursePeriod: formatDateRo(hygieneSession.sessionDate),
      })),
    } : {}),

    // 6. Cursant selectat (pentru Adeverință nominală)
    ...(participant ? {
      PLACEHOLDER_NUME_COMPLET: participantFullName,
      PLACEHOLDER_NUME: participant.lastName,
      PLACEHOLDER_PRENUME: participant.firstName,
      PLACEHOLDER_CNP: participant.cnp,
      PLACEHOLDER_DATA_NASTERII: formatDateRo(participant.birthDate) || undefined,
      PLACEHOLDER_LOCALITATE_NASTERII: participant.birthPlace || undefined,
      PLACEHOLDER_TIP_ACT: participant.docType || undefined,
      PLACEHOLDER_SERIE_ACT: participant.docSeries || undefined,
      PLACEHOLDER_NUMAR_ACT: participant.docNumber || undefined,
      PLACEHOLDER_NR_ACT: participant.docNumber || undefined,
      PLACEHOLDER_SERIE_ADEVERINTA: participant.certificateSeries || undefined,
      PLACEHOLDER_NUMAR_ADEVERINTA: participant.certificateNumber || undefined,
      PLACEHOLDER_DATA_ELIBERARE: formatDateRo(hygieneSession?.examDate) || undefined,
      PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: [participant.certificateSeries, participant.certificateNumber].filter(Boolean).join(' ') || undefined,
      PLACEHOLDER_REZULTAT_EXAMEN: participant.examResult || undefined,
      PLACEHOLDER_MODUL_IGIENA: participant.employee?.hygieneModule || employee?.hygieneModule || undefined,
    } : {}),
  };

  // Merge ONLY verified DB fields with any explicit custom overrides entered by the operator
  const mergedData: Record<string, unknown> = {
    ...verifiedMap,
    ...(ctx.customOverrides || {}),
  };

  // For fields that are empty or undefined, DO NOT inject fake defaults!
  const resolvedFields: ResolvedPlaceholderItem[] = template.fields.map((def: TemplateFieldDef) => {
    const rawVal = mergedData[def.key];
    const hasValue = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';
    const isAutocompleted = hasValue && !def.source.startsWith('manual');

    return {
      key: def.key,
      label: def.label,
      source: def.source,
      type: def.type,
      required: def.required,
      value: hasValue ? (rawVal as string | number | boolean) : '',
      isAutocompleted,
    };
  });

  return {
    template,
    fields: resolvedFields,
    resolvedData: mergedData,
  };
}
