# Ghid Deploy în Coolify + Cloudflare Tunnel (`cloudflared`)

Acest ghid descrie pașii pentru publicarea aplicației **SSM & Cursuri Igienă** pe homelab în **Coolify**, expusă securizat prin **`cloudflared`**, pornind cu o **bază de date curată (0 firme, 0 angajați, 0 prestatori demo)**.

---

## Ce se inițializează automat la prima pornire

La pornirea containerului `app`, scriptul `docker-entrypoint.sh` execută automat:
1. `prisma db push --skip-generate` — creează tabelele în baza de date PostgreSQL din `prisma/schema.prisma`.
2. `prisma/bootstrap.ts` — populează **exclusiv** cataloagele de sistem:
   - **34 șabloane oficiale** (`Template`) din `src/lib/templates/definitions.ts`
   - **8 articole standard EIP** (`EipItem`, doar dacă tabelul este gol)
   - **4 conturi RBAC** (`ADMIN`, `SSM`, `HR`, `IGIENA`) din variabilele ENV (doar dacă tabelul `User` este gol, astfel încât parolele schimbate ulterior de client nu vor fi suprascrise la restart/redeploy)
   - **Zero date de business**: 0 firme (`Client`), 0 angajați (`Employee`), 0 prestatori (`SsmProvider`), 0 evaluări, 0 sesiuni igienă, 0 documente generate.

> **Notă**: `docker-compose.yml` original rămâne neatins pentru dezvoltare locală (`ssm_postgres:5432`, `3005`). Coolify folosește dedicat **`docker-compose.coolify.yml`**, fără conflict de porturi.

---

## Pasul 1: Configurarea Resursei în Coolify UI

1. Deschide interfața **Coolify** -> Proiectul dorit -> **+ Add New Resource**.
2. Selectează **Public/Private Repository (GitHub)** și alege repository-ul `davidalexandru23/aplicatie_sm`, branch `main`.
3. La **Build Pack**, selectează **`Docker Compose`**.
4. La **Docker Compose Location**, setează:
   ```text
   /docker-compose.coolify.yml
   ```
5. **Domenii în Coolify (Traefik)**:
   - Deoarece traficul intră prin **Cloudflare Tunnel (`cloudflared`)** direct pe portul mapat (`127.0.0.1:3015`), lasă câmpul de domeniu Traefik **gol** (sau nu expune aplicația prin Traefik dacă folosești direct tunelul).
6. Mergi la **Environment Variables** în Coolify și adaugă variabilele din `.env.coolify.example`:
   - Generează secrete puternice pe mașină înainte de a le lipi:
     ```bash
     openssl rand -hex 24   # pentru POSTGRES_PASSWORD
     openssl rand -hex 32   # pentru SECRET_KEY
     ```
   - Setează obligatoriu `POSTGRES_PASSWORD`, `SECRET_KEY` și `INIT_DEFAULT_PASSWORD` (sau parole separate per rol `INIT_ADMIN_PASSWORD`, `INIT_SSM_PASSWORD`, `INIT_HR_PASSWORD`, `INIT_IGIENA_PASSWORD` — minim 6 caractere).
   - Verifică `APP_BIND_HOST=127.0.0.1` și `APP_PORT=3015`.
7. Apasă **Deploy** și urmărește logurile până când atât `db` cât și `app` devin `healthy`.

---

## Pasul 2: Configurarea Rutei în Cloudflare Zero Trust (`cloudflared`)

1. Intră în **Cloudflare Zero Trust Dashboard** -> **Networks** -> **Tunnels**.
2. Selectează tunelul activ al homelab-ului -> **Public Hostname** -> **Add a public hostname**.
3. Configurează:
   - **Subdomain**: ex. `ssm`
   - **Domain**: domeniul tău (ex. `davidab.ro`)
   - **Service Type**: `HTTP`
   - **URL**: `127.0.0.1:3015` *(recomandat `127.0.0.1:3015` în loc de `localhost:3015` pentru a evita rezoluția IPv6 `::1` dacă Docker ascultă pe IPv4)*
4. Salvează ruta.

---

## Pasul 3: Verificare & Onboarding Client

1. **Verificare healthcheck local pe host**:
   ```bash
   curl -fsS http://127.0.0.1:3015/api/health
   ```
   Trebuie să returneze `{"status":"ok","database":"connected",...}`.
2. **Conectare pe domeniul public** (`https://ssm.davidab.ro/login`):
   - Autentifică-te cu `admin` și parola configurată în `INIT_ADMIN_PASSWORD` / `INIT_DEFAULT_PASSWORD`.
   - Confirmă că dashboard-ul afișează **0 companii**, **0 salariați**, **34 șabloane**.
3. **Configurare inițială pentru client**:
   - Mergi la **Setări SEPP** (`/settings`) și completează datele reale ale firmei prestatoare SSM (CUI, certificat ITM, specialiști desemnați) -> acestea se vor pre-selecta automat la crearea primului client.
   - Schimbă parolele inițiale din meniul contului (**Schimbă Parola**) dacă dorești parole definitive pentru client.

---

## Pasul 4: Recomandare Backup PostgreSQL în Coolify

În Coolify -> resursa **`db`** -> tab-ul **Backups**:
- Configurează backup automat către **Cloudflare R2** (S3-compatible, 10 GB free tier, 0 cost egres) cu frecvență zilnică/la 6 ore și retenție de 14-30 de zile.
