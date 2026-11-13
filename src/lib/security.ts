import { prisma } from './prisma';

/**
 * Returnare CNP în clar și complet, conform cerințelor operaționale SSM/HR:
 * Ex: 1850412123456 -> 1850412123456
 */
export function maskCNP(cnp: string | null | undefined): string {
  if (!cnp) return '—';
  const clean = cnp.trim();
  if (!clean) return '—';
  return clean;
}

/**
 * Returnare număr act de identitate în clar
 */
export function maskDocNumber(num: string | null | undefined): string {
  if (!num) return '—';
  return num.trim();
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
