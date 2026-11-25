FROM node:22-alpine AS builder

RUN apk update && apk upgrade --no-cache && apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build
RUN npx tsc --outDir dist-bootstrap --module commonjs --moduleResolution node --target es2022 --esModuleInterop --skipLibCheck --rootDir . prisma/bootstrap.ts
RUN npm prune --omit=dev && ./node_modules/.bin/prisma generate

FROM node:22-alpine AS runner

RUN apk update \
    && apk upgrade --no-cache \
    && apk add --no-cache openssl \
    && rm -rf /usr/local/lib/node_modules/npm \
              /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm \
              /usr/local/bin/npx \
              /usr/local/bin/corepack \
              /opt/yarn* \
              /usr/local/bin/yarn \
              /usr/local/bin/yarnpkg

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/dist-bootstrap ./dist-bootstrap
COPY --from=builder /app/templates_registry ./templates_registry
COPY --from=builder /app/outputs ./outputs
COPY --from=builder /app/Test_Client_3_Angajati.xlsx ./Test_Client_3_Angajati.xlsx
COPY --from=builder /app/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY --from=builder /app/prisma-studio-server.mjs /app/prisma-studio-server.mjs

RUN mkdir -p /app/sabloane_ssm /app/storage/documents /app/storage/uploads \
    && chmod +x /app/docker-entrypoint.sh

COPY --from=builder ["/app/sabloane_ssm/Cerere angajare.pdf", "/app/sabloane_ssm/Declaratie luat la cunost. Regulament Intern.pdf", "/app/sabloane_ssm/Declaratie pe propie raspundere contract de munca.pdf", "/app/sabloane_ssm/"]

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
