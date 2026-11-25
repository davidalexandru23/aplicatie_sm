#!/bin/sh
set -e

mkdir -p /app/storage/documents /app/storage/uploads

echo "[entrypoint] Waiting for PostgreSQL and ensuring User schema compatibility..."
ATTEMPTS=0
until ./node_modules/.bin/prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    DELETE FROM "User" a
    USING "User" b
    WHERE a.role = b.role
      AND (a."updatedAt" < b."updatedAt" OR (a."updatedAt" = b."updatedAt" AND a.id < b.id));
    DROP INDEX IF EXISTS "User_email_key";
    DROP INDEX IF EXISTS "User_role_idx";
    DROP INDEX IF EXISTS "User_username_idx";
    ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
    ALTER TABLE "User" DROP COLUMN IF EXISTS "username";
    CREATE UNIQUE INDEX IF NOT EXISTS "User_role_key" ON "User"("role");
  END IF;
END $$;
SQL
do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 10 ]; then
    echo "[entrypoint] ERROR: Could not connect to PostgreSQL after 10 attempts."
    exit 1
  fi
  echo "[entrypoint] Waiting for PostgreSQL... ($ATTEMPTS/10)"
  sleep 2
done

echo "[entrypoint] Syncing Prisma schema to PostgreSQL..."
./node_modules/.bin/prisma db push --skip-generate

echo "[entrypoint] Running system bootstrap (templates, EIP catalog, initial RBAC roles if missing)..."
node /app/dist-bootstrap/prisma/bootstrap.js

echo "[entrypoint] Starting Next.js server..."
exec "$@"
