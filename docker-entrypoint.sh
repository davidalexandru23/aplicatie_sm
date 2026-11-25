#!/bin/sh
set -e

mkdir -p /app/storage/documents /app/storage/uploads

echo "[entrypoint] Syncing Prisma schema to PostgreSQL..."
ATTEMPTS=0
until ./node_modules/.bin/prisma db push --skip-generate; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 10 ]; then
    echo "[entrypoint] ERROR: Could not sync Prisma schema after 10 attempts."
    exit 1
  fi
  echo "[entrypoint] Waiting for PostgreSQL... ($ATTEMPTS/10)"
  sleep 2
done

echo "[entrypoint] Running system bootstrap (templates, EIP catalog, initial RBAC users if empty)..."
node /app/dist-bootstrap/prisma/bootstrap.js

echo "[entrypoint] Starting Next.js server..."
exec "$@"
