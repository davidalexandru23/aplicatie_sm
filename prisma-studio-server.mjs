import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const INTERNAL_PORT = Number(process.env.STUDIO_INTERNAL_PORT || 5555);
const PROXY_PORT = Number(process.env.STUDIO_PROXY_PORT || 5556);
const AUTH_USER = process.env.PRISMA_STUDIO_USER || 'admin';
const AUTH_PASSWORD = process.env.PRISMA_STUDIO_PASSWORD || '';

if (!AUTH_PASSWORD) {
  console.error('[prisma-studio] ERROR: PRISMA_STUDIO_PASSWORD must be set.');
  process.exit(1);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

const EXPECTED_USER_DIGEST = sha256(AUTH_USER);
const EXPECTED_PASS_DIGEST = sha256(AUTH_PASSWORD);

function isLoopbackAddress(remoteAddress) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteAddress || '');
}

function isAuthorized(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return false;
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(match[1].trim(), 'base64').toString('utf8');
  } catch {
    return false;
  }

  const sepIndex = decoded.indexOf(':');
  if (sepIndex === -1) return false;

  const user = decoded.slice(0, sepIndex);
  const pass = decoded.slice(sepIndex + 1);
  return (
    crypto.timingSafeEqual(sha256(user), EXPECTED_USER_DIGEST) &&
    crypto.timingSafeEqual(sha256(pass), EXPECTED_PASS_DIGEST)
  );
}

function sendUnauthorized(res) {
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Prisma Studio SSM", charset="UTF-8"',
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
  });
  res.end('Authentication required.');
}

let shuttingDown = false;

const studioProcess = spawn(
  './node_modules/.bin/prisma',
  [
    'studio',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(INTERNAL_PORT),
    '--browser',
    'none',
    '--schema',
    'prisma/schema.prisma',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      BROWSER: 'none',
      CHECKPOINT_DISABLE: '1',
    },
  }
);

studioProcess.on('error', (err) => {
  console.error('[prisma-studio] Failed to start Prisma Studio process:', err);
  if (!shuttingDown) {
    process.exit(1);
  }
});

studioProcess.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(
      `[prisma-studio] Prisma Studio exited unexpectedly (code=${code}, signal=${signal}).`
    );
    process.exit(code || 1);
  }
});

const server = http.createServer((req, res) => {
  if (req.url === '/__healthz' && isLoopbackAddress(req.socket.remoteAddress)) {
    const probeReq = http.request(
      {
        host: '127.0.0.1',
        port: INTERNAL_PORT,
        path: '/',
        method: 'GET',
        timeout: 2000,
      },
      (probeRes) => {
        probeRes.resume();
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('ok');
      }
    );
    probeReq.on('timeout', () => {
      probeReq.destroy(new Error('Healthcheck timeout'));
    });
    probeReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('starting');
      }
    });
    probeReq.end();
    return;
  }

  if (!isAuthorized(req)) {
    sendUnauthorized(res);
    return;
  }

  const upstreamHeaders = { ...req.headers };
  delete upstreamHeaders.authorization;
  upstreamHeaders.host = `127.0.0.1:${INTERNAL_PORT}`;

  const proxyReq = http.request(
    {
      host: '127.0.0.1',
      port: INTERNAL_PORT,
      path: req.url || '/',
      method: req.method,
      headers: upstreamHeaders,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Prisma Studio upstream unavailable: ${err.message}`);
    } else {
      res.destroy();
    }
  });

  req.on('aborted', () => {
    proxyReq.destroy();
  });

  req.pipe(proxyReq);
});

server.on('upgrade', (req, socket, head) => {
  if (!isAuthorized(req)) {
    socket.write(
      'HTTP/1.1 401 Unauthorized\r\n' +
        'WWW-Authenticate: Basic realm="Prisma Studio SSM", charset="UTF-8"\r\n' +
        'Cache-Control: no-store\r\n' +
        'Connection: close\r\n\r\n'
    );
    socket.destroy();
    return;
  }

  const upstreamSocket = net.connect(INTERNAL_PORT, '127.0.0.1', () => {
    const lines = [`${req.method} ${req.url || '/'} HTTP/${req.httpVersion}`];
    let hasHost = false;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i];
      const value = req.rawHeaders[i + 1];
      if (name.toLowerCase() === 'authorization') continue;
      if (name.toLowerCase() === 'host') {
        lines.push(`Host: 127.0.0.1:${INTERNAL_PORT}`);
        hasHost = true;
      } else {
        lines.push(`${name}: ${value}`);
      }
    }
    if (!hasHost) {
      lines.push(`Host: 127.0.0.1:${INTERNAL_PORT}`);
    }

    upstreamSocket.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head && head.length > 0) {
      upstreamSocket.write(head);
    }
    upstreamSocket.pipe(socket);
    socket.pipe(upstreamSocket);
  });

  upstreamSocket.on('error', () => {
    socket.destroy();
  });
  socket.on('error', () => {
    upstreamSocket.destroy();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(
    `[prisma-studio] Basic Auth proxy listening on 0.0.0.0:${PROXY_PORT} -> 127.0.0.1:${INTERNAL_PORT} (user=${AUTH_USER})`
  );
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[prisma-studio] Received ${signal}, shutting down...`);
  server.close(() => {
    if (!studioProcess.killed) {
      studioProcess.kill('SIGTERM');
    }
    process.exit(0);
  });
  if (!studioProcess.killed) {
    studioProcess.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
