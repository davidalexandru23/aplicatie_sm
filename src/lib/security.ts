import { prisma } from './prisma';

/**
 * Măscarea securizată a CNP-ului conform GDPR și cerințelor din specificație:
 * Ex: 1850412123456 -> 18504********
 * CNP-ul nu se expune niciodată în clar în UI fără solicitare explicită,
 * și este exclus cu strictețe din loguri, URL-uri sau rapoarte exportate.
 */
export function maskCNP(cnp: string | null | undefined): string {
  if (!cnp) return '—';
  const clean = cnp.trim();
  if (clean.length < 5) return '***';
  return clean.substring(0, 5) + '*'.repeat(Math.max(0, clean.length - 5));
}

/**
 * Măscarea parțială a numărului de act de identitate
 */
export function maskDocNumber(num: string | null | undefined): string {
  if (!num) return '—';
  const clean = num.trim();
  if (clean.length <= 2) return '**';
  return clean.substring(0, 2) + '*'.repeat(clean.length - 2);
}

/**
 * Logare eveniment de audit securizat.
 * Nu include niciodată CNP sau detalii textuale complete din actele de identitate.
 */
export async function logAuditEvent(params: {
  actorName: string;
  actorEmail?: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'generate' | 'approve' | 'reveal_cnp' | 'export';
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}) {
  let safeDetails = '';
  if (typeof params.details === 'object' && params.details !== null) {
    // Clonăm și eliminăm câmpurile sensibile
    const cleaned = { ...params.details };
    delete (cleaned as Record<string, unknown>).cnp;
    delete (cleaned as Record<string, unknown>).identityNumber;
    delete (cleaned as Record<string, unknown>).series;
    safeDetails = JSON.stringify(cleaned);
  } else if (typeof params.details === 'string') {
    safeDetails = params.details;
  }

  return prisma.auditEvent.create({
    data: {
      actorName: params.actorName,
      actorEmail: params.actorEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: safeDetails,
      ipAddress: params.ipAddress,
    },
  });
}
