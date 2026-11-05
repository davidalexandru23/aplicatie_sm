import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const customFilename = searchParams.get('filename') || `Pachet_Documente_${id}.zip`;

    const zipFilePath = path.join(process.cwd(), 'storage', 'documents', `batch_${id}.zip`);

    if (!fs.existsSync(zipFilePath)) {
      return NextResponse.json(
        { error: 'Arhiva solicitată nu a fost găsită sau a expirat.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(zipFilePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(customFilename)}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    console.error('Batch ZIP download error:', err);
    return NextResponse.json(
      { error: 'Eroare la descărcarea arhivei.' },
      { status: 500 }
    );
  }
}
