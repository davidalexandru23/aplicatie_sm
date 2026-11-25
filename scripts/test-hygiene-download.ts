import { prisma } from '../src/lib/prisma';

async function testGen() {
  const loginRes = await fetch('http://localhost:3005/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'IGIENA', password: process.env.TEST_PASSWORD || '123456' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Login Igiena status:', loginRes.status);

  const session = await prisma.hygieneSession.findFirst();
  if (!session) {
    console.log('No hygiene session found');
    return;
  }

  // 1. Generate Cataloage & Anexe
  const genCatRes = await fetch('http://localhost:3005/api/documents/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({
      templateCode: 'hygiene-anexe-catalog',
      clientId: session.clientId,
      hygieneSessionId: session.id,
      data: {}
    })
  });
  const catResult = await genCatRes.json();
  const docId1 = catResult.result?.documentId || catResult.documentId;
  console.log('Generate Cataloage & Anexe status:', genCatRes.status, 'DocumentId:', docId1);

  // Download the generated document
  if (docId1) {
    const dlCatRes = await fetch('http://localhost:3005/api/documents/' + docId1 + '/download', {
      headers: { Cookie: cookie || '' }
    });
    const catBytes = await dlCatRes.arrayBuffer();
    console.log('Download Cataloage & Anexe status:', dlCatRes.status, 'Size:', catBytes.byteLength, 'Disposition:', dlCatRes.headers.get('content-disposition'));
  }

  // 2. Generate Tabel Cursanti
  const genTabRes = await fetch('http://localhost:3005/api/documents/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie || '' },
    body: JSON.stringify({
      templateCode: 'hygiene-tabel-cursanti',
      clientId: session.clientId,
      hygieneSessionId: session.id,
      data: {}
    })
  });
  const tabResult = await genTabRes.json();
  const docId2 = tabResult.result?.documentId || tabResult.documentId;
  console.log('Generate Tabel Cursanți status:', genTabRes.status, 'DocumentId:', docId2);

  if (docId2) {
    const dlTabRes = await fetch('http://localhost:3005/api/documents/' + docId2 + '/download', {
      headers: { Cookie: cookie || '' }
    });
    const tabBytes = await dlTabRes.arrayBuffer();
    console.log('Download Tabel Cursanți status:', dlTabRes.status, 'Size:', tabBytes.byteLength, 'Disposition:', dlTabRes.headers.get('content-disposition'));
  }
}

testGen().finally(() => prisma.$disconnect());
