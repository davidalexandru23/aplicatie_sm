FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build
RUN npx tsc --outDir dist-bootstrap --module commonjs --moduleResolution node --target es2022 --esModuleInterop --skipLibCheck --rootDir . prisma/bootstrap.ts

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/dist-bootstrap ./dist-bootstrap
COPY --from=builder /app/templates_registry ./templates_registry
COPY --from=builder /app/outputs ./outputs
COPY --from=builder /app/Test_Client_3_Angajati.xlsx ./Test_Client_3_Angajati.xlsx
COPY --from=builder /app/docker-entrypoint.sh /app/docker-entrypoint.sh

RUN mkdir -p /app/sabloane_ssm /app/storage/documents /app/storage/uploads \
    && chmod +x /app/docker-entrypoint.sh

COPY --from=builder ["/app/sabloane_ssm/Cerere angajare.pdf", "/app/sabloane_ssm/Declaratie luat la cunost. Regulament Intern.pdf", "/app/sabloane_ssm/Declaratie pe propie raspundere contract de munca.pdf", "/app/sabloane_ssm/"]

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
