import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id },
    include: { template: true },
  });

  if (!doc) {
    return new NextResponse('Documentul nu a fost găsit.', { status: 404 });
  }

  if (!fs.existsSync(doc.filePath)) {
    return new NextResponse('Fișierul fizic nu a fost găsit în stocarea privată.', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(doc.filePath);
  const ext = path.extname(doc.filePath);
  const safeFilename = `${doc.template.code}_${doc.id.substring(0, 8)}${ext}`;

  // Log audit descărcare
  await logAuditEvent({
    actorName: 'Operator Intern',
    action: 'generate',
    entityType: 'GeneratedDocument',
    entityId: doc.id,
    details: { event: 'download', filename: safeFilename },
  });

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}
