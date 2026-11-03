import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * Endpoint pentru descărcarea șabloanelor Excel SSM oficiale:
 * - ?type=empty  -> Șablon gol (Model_date_client_SSM.xlsx)
 * - ?type=sample -> Exemplu completat cu date reale (Test_Client_3_Angajati.xlsx)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'empty';

    let fullPath = '';
    let downloadFilename = '';

    if (type === 'empty') {
      fullPath = path.join(process.cwd(), 'outputs', 'ssm-client-template', 'Model_date_client_SSM.xlsx');
      downloadFilename = 'Model_date_client_SSM_sablon_gol.xlsx';
    } else if (type === 'sample') {
      fullPath = path.join(process.cwd(), 'Test_Client_3_Angajati.xlsx');
      downloadFilename = 'Model_date_client_SSM_exemplu_completat.xlsx';
    } else {
      return NextResponse.json(
        { error: 'Parametru type invalid. Valori permise: empty, sample.' },
        { status: 400 }
      );
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: `Fișierul șablon nu a fost găsit pe server: ${downloadFilename}` },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.promises.readFile(fullPath);

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadFilename}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Eroare internă la descărcarea șablonului.' },
      { status: 500 }
    );
  }
}
