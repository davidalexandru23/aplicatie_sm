# Sistem Intern de Gestiune SSM, HR & Cursuri Igienă

Platformă web internă construită cu **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **PostgreSQL 16** și **Prisma ORM 6**, dedicată furnizorilor de servicii externe de prevenire și protecție (**SEPP / SSM**), departamentului **HR** și formatorilor pentru **cursuri de igienă (DSP)**.

Aplicația centralizează dosarele firmelor cliente, salariații, scadențele legale (Medicina Muncii, SSM, PSI/SU, Igienă), evaluările de risc profesional (metoda INCDPM), instruirile, dotarea EIP, importul/exportul registrului Excel și generarea automată a **34 de șabloane oficiale** (DOCX și XLSX) + pachete ZIP pentru control ITM/ISU.

---

## Arhitectură & Tehnologii

- **Frontend & Backend:** Next.js 16 (`App Router`, Server Components, API Routes, `src/proxy.ts` pentru protecția rutelor) + React 19 + TypeScript 5 + Tailwind CSS v4.
- **UI & Temă:** Interfață enterprise responsivă (desktop, tabletă, mobil) cu temă **Light** și **Midnight Slate Dark** (comutator instant fără FOUC).
- **Bază de date & ORM:** PostgreSQL 16 + Prisma ORM (`prisma/schema.prisma`, bootstrap automat fără date demo la pornirea containerului prin `prisma/bootstrap.ts`).
- **Motor de generare & procesare documente:**
  - `docxtemplater` + `pizzip` pentru documente `.docx` (placeholder-e, tabele dinamice, pachete ZIP).
  - `pdf-lib` pentru procesare PDF.
  - `exceljs` + `xlsx` (`0.20.3`) pentru importul/exportul registrului de salariați (`Model_date_client_SSM.xlsx`) și pachetele Excel de igienă.
- **Autentificare & Securitate:**
  - Autentificare exclusiv pe **Rol + Parolă** (fără email sau username), cu hash `scrypt` și sesiuni semnate HMAC-SHA256 în cookie `HttpOnly` (`ssm_session`).
  - **Audit complet (`AuditEvent`)** pentru operațiuni de creare, modificare, import, generare/descărcare documente și dezactivare clienți.
  - **Soft-delete protejat cu parolă ADMIN** pentru clienți (`"isActive" = false`), fără pierdere fizică de date.

---

## Roluri și Control de Acces (RBAC)

Autentificarea se face la `/login` selectând rolul din dropdown și introducând parola aferentă.

| Rol | Etichetă UI | Acces & Responsabilități |
| :--- | :--- | :--- |
| `ADMIN` | Administrator | Acces complet la toate modulele, comutare rapidă pe orice rol, setări SEPP, ștergere logică (arhivare) clienți cu confirmare parolă. |
| `SSM` | Specialist SSM | Dashboard conformitate, firme cliente, salariați (fără date salariale/CNP sensibil unde e restricționat), evaluări de risc, instruiri & IPSSM, documente SSM/PSI, setări specialiști. |
| `HR` | Resurse Umane (HR) | Salariați, import/export registru Excel, dosar personal, documente HR/CIM/medicina muncii/EIP, clienți. |
| `IGIENA` | Inspector Igienă | Acces dedicat pe modulul `/hygiene` (sesiuni curs igienă, participanți, note, numerotare certificate DSP, anexe Excel) + salariați/clienți/setări furnizor igienă. |

> Parolele fiecărui rol pot fi schimbate oricând din interfață (**Schimbă Parola** din meniul de rol).

---

## Module Principale

- `/` — Panou de control executiv: scor global de conformitate, alerte scadențe (`OVERDUE`, `UPCOMING`, `MISSING`), portofoliu clienți, documente și importuri recente.
- `/clients` și `/clients/[id]` — Registrul firmelor cliente, profil CAEN Rev. 2, prestator SEPP, decizii organizatorice, salariați, puncte de lucru, posturi/EIP, export Excel, pachete ZIP (Dosar SSM Companie & Arhivă Inspecție ITM/ISU), ștergere logică (doar `ADMIN`).
- `/employees` — Registrul global al salariaților, filtrare pe status și conformitate, fișe medicale, încetare CIM, module igienă.
- `/imports/new` — Import registru Excel (`Model_date_client_SSM.xlsx`) cu previzualizare diferențe, validare CNP și commit atomic.
- `/risk-assessments` — Evaluări de riscuri profesionale (metoda INCDPM), profiluri sectoriale CAEN, măsuri de prevenire și zone de pericol.
- `/trainings` — Planificare și consemnare sesiuni de instruire SSM și PSI/SU, actualizare automată a scadențelor.
- `/hygiene` — Gestiune sesiuni cursuri de igienă (Ord. MS/ME 2209/4469/2022), numerotare automată certificate (inclusiv `BIS`), evidență predare diplome.
- `/templates`, `/documents`, `/documents/generate` — Catalog șabloane, generator individual sau colectiv (batch), arhivă documente emise.
- `/settings` — Configurare prestator SEPP, specialiști desemnați și date furnizor cursuri igienă.

---

## Catalog 34 Șabloane Oficiale (`src/lib/templates/definitions.ts`)

### IPSSM (5)
1. `ipssm-opis` — OPIS Instrucțiuni Proprii SSM (`.docx`)
2. `ipssm-universale` — IPSSM 01-10 Generale / Universale (`.docx`)
3. `ipssm-alunecari` — IPSSM 11 - Alunecări și împiedicări (`.docx`)
4. `ipssm-autovehicule` — IPSSM 12 - Autovehicule și transport (`.docx`)
5. `ipssm-birou` — IPSSM 13 - Activități de birou și ergonomie (`.docx`)

### Evaluare Riscuri & Prevenire (6)
6. `risk-evaluare` — Dosar Evaluare a Riscurilor de Accidentare și Îmbolnăvire Profesională (`.docx`)
7. `risk-plan-prevenire-tesa` — Plan de Prevenire și Protecție (HG 1425/2006) (`.docx`)
8. `risk-zone-pericol` — Evidența zonelor cu risc ridicat și specific (`.docx`)
9. `risk-plan-actiune-urgenta` — Plan de acțiune în caz de pericol grav și iminent (`.docx`)
10. `ipssm-tesa` — Fișă de Evaluare a Factorilor de Risc - Post TESA (`.docx`)
11. `med-fisa-identificare-riscuri` — Fișă de Identificare a Factorilor de Risc Profesional (Anexa 3 HG 355/2007) (`.docx`)

### Instruiri SSM & PSI/SU (9)
12. `training-tematica-introductiv` — Tematică instruire introductiv-generală 4h (`.docx`)
13. `training-detaliu-introductiv` — Detaliu suport la tematica introductiv-generală (`.docx`)
14. `training-tematica-loc-munca` — Tematică instruire la locul de muncă și periodică (`.docx`)
15. `training-detaliu-loc-munca` — Detaliu suport la tematica la locul de muncă (`.docx`)
16. `ssm-fisa-instruire-individuala` — Fișă Individuală de Instruire SSM (Anexa 11 HG 1425/2006) (`.docx`)
17. `psi-fisa-instructaj-individuala` — Fișă Individuală de Instructaj PSI/SU (Anexa OMAI 712/2005) (`.docx`)
18. `ssm-pv-instruire-colectiva` — Proces-Verbal de Instruire Colectivă SSM (HG 1425/2006) (`.docx`)
19. `psi-pv-instruire` — Proces-Verbal de Instruire PSI / SU (OMAI 712/2005) (`.docx`)
20. `ssm-declaratie-traseu` — Declarație pe proprie răspundere privind traseul de deplasare (`.docx`)

### Decizii Organizare SSM (1)
21. `decizii-angajator` — Pachet Decizii Interne SSM ale Angajatorului (`.docx`)

### HR, Dosar Personal, Medicină & EIP (10)
22. `hr-anexa-fisa-post` — Anexă la fișa postului - Atribuții SSM (`.docx`)
23. `hr-cerere-angajare` — Cerere de angajare (`.docx`)
24. `hr-declaratie-regulament` — Declarație luare la cunoștință Regulament Intern (`.docx`)
25. `hr-declaratie-raspundere` — Declarație pe proprie răspundere la angajare (CIM) (`.docx`)
26. `hr-cim-2026` — Contract individual de muncă 2026 (`.docx`)
27. `hr-cim-model-cadru-2022` — Contract individual de muncă model-cadru (Ordin MMSS 2171/2022) (`.docx`)
28. `hr-info-dosar` — Informare conținut dosar personal salariat (`.docx`)
29. `hr-gdpr-informare` — Notă de informare prelucrare date cu caracter personal (GDPR) (`.docx`)
30. `med-fisa-solicitare-examen` — Fișă de Solicitare a Examenului Medical (Anexa 2 HG 355/2007) (`.docx`)
31. `eip-fisa-acordare-individuala` — Fișă Individuală de Dotare și Acordare EIP (HG 1048/2006) (`.docx`)

### Cursuri Igienă DSP (3)
32. `hygiene-adeverinta` — Adeverință participare curs igienă (`.docx`)
33. `hygiene-anexe-catalog` — Anexe și Cataloage Curs Igienă — 8 Anexe (`.xlsx`)
34. `hygiene-tabel-cursanti` — Tabel evidență cursanți igienă (`.xlsx`)

---

## Dezvoltare Locală

### Cerințe
- **Node.js 22+** și **npm**
- **PostgreSQL 16** (sau containerul local din `docker-compose.yml`)

### 1. Pornire bază de date & configurare `.env`
```bash
docker compose up -d db
npm install
npx prisma db push
```

Pentru populare inițială în dezvoltare:
```bash
# Seed complet de dezvoltare (include firme demo, salariați, șabloane și 4 roluri RBAC)
npx prisma db seed

# SAU bootstrap curat de producție (doar șabloane, catalog EIP și roluri lipsă, fără firme demo)
npm run db:bootstrap
```

### 2. Rulare aplicație
```bash
# Mod dezvoltare (Turbopack, port 3005)
npm run dev

# Build și pornire producție locală
npm run build
npm start
```
Aplicația pornește la **`http://localhost:3005`**.

### 3. Verificări și Teste
```bash
# Typecheck + build
npx tsc --noEmit && npm run build

# Suită unificată de verificare
npm test

# Suită E2E completă
npm run test:e2e
```

---

## Deployment în Producție (Coolify + Cloudflare Tunnel)

Stiva de producție este definită în [`docker-compose.coolify.yml`](docker-compose.coolify.yml) și include 3 servicii izolate în rețeaua internă `ssm_internal`:

1. **`db`** ([`Dockerfile.postgres`](Dockerfile.postgres)) — PostgreSQL 16 Alpine cu actualizări OS (`apk upgrade`) și `su-exec` nativ C, volum persistent `ssm_postgres_data`.
2. **`app`** ([`Dockerfile`](Dockerfile)) — Imagine multi-stage Node 22 Alpine întărită (`npm prune --omit=dev`, fără `npm`/`npx`/`yarn` global în runtime). La pornire, [`docker-entrypoint.sh`](docker-entrypoint.sh) sincronizează schema (`prisma db push`) și rulează bootstrap-ul (`prisma/bootstrap.ts`). Expus local pe `127.0.0.1:3015`, publicat extern exclusiv prin `cloudflared`.
3. **`prisma-studio`** ([`prisma-studio-server.mjs`](prisma-studio-server.mjs)) — Viewer web pentru baza de date, accesibil **doar din rețeaua locală LAN**, protejat cu **HTTP Basic Auth**.

### Variabile de mediu
Copiază structura din [`.env.coolify.example`](.env.coolify.example) în **Coolify -> Environment Variables**:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SECRET_KEY` (cheie random hex 64 caractere pentru semnarea sesiunilor)
- `APP_BIND_HOST=127.0.0.1`, `APP_PORT=3015`
- `INIT_DEFAULT_PASSWORD` (sau parole individuale `INIT_ADMIN_PASSWORD`, `INIT_SSM_PASSWORD`, `INIT_HR_PASSWORD`, `INIT_IGIENA_PASSWORD` — aplicate doar la inițializarea rolurilor lipsă)
- *(Opțional, pentru Prisma Studio LAN)* `PRISMA_STUDIO_BIND_HOST=192.168.50.128`, `PRISMA_STUDIO_PORT=5555`, `PRISMA_STUDIO_USER=admin`, `PRISMA_STUDIO_PASSWORD` (dacă rămâne gol, folosește automat `POSTGRES_PASSWORD`).

### Flux de release
1. Modificări și testare locală în repository.
2. `git commit` și `git push origin main`.
3. Declanșare manuală **Redeploy** (sau **Force Rebuild** la actualizări de imagine/securitate) din **Coolify UI**.

---

## Operare & Mentenanță în Producție (Coolify)

### 1. Ștergere logică (arhivare) și reactivare firmă client în baza de date

#### Cum funcționează ștergerea din aplicație
- Doar rolul **Administrator (`ADMIN`)** vede butonul **Șterge Client** (în `/clients` și pe pagina dosarului `/clients/[id]`).
- Confirmarea necesită reintroducerea **parolei de Administrator**.
- Operațiunea efectuează **soft-delete** (`"isActive" = false` în tabelul `"Client"`):
  - Firma, salariații, documentele, evaluările de risc și instruirile asociate dispar imediat din interfață și din API-uri.
  - **Datele nu sunt șterse fizic** — toate înregistrările rămân intacte în PostgreSQL, iar acțiunea este înregistrată în `AuditEvent`.
  - Dacă se încearcă re-adăugarea sau importul unei firme cu același CUI, aplicația avertizează că firma există arhivată în baza de date.

#### Procedura de listare și reactivare din Coolify (`db` Terminal)

Dacă dorești să vezi sau să restaurezi un client dezactivat, deschide **Coolify UI** -> aplicația `aplicatie_sm` -> **Terminal** -> selectează containerul **`db`** și rulează:

1. **Listare clienți inactivi (arhivați):**
   ```sh
   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT id, name, cui, "isActive" FROM "Client" WHERE "isActive" = false;'
   ```

2. **Restaurare (reactivare) client după CUI** (înlocuiește `<CUI>` cu CUI-ul exact al firmei, ex. `RO12345678`):
   ```sh
   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'UPDATE "Client" SET "isActive" = true WHERE cui = '\''<CUI>'\'';'
   ```

3. *(Alternativ)* **Restaurare după `id`** (folosind UUID-ul din pasul 1):
   ```sh
   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'UPDATE "Client" SET "isActive" = true WHERE id = '\''<CLIENT_ID>'\'';'
   ```

4. **Verificare:** reîncarcă pagina `/clients` în aplicație — firma și întregul său istoric (salariați, documente, evaluări, instruiri) redevin imediat vizibile și active.

---

### 2. Acces Prisma Studio Web Viewer (rețea locală LAN)

Pentru inspectarea vizuală a bazei de date (inclusiv reactivarea rapidă a unui client schimbând câmpul `isActive` din `false` în `true` în tabelul `Client`):

- **Adresă LAN:** `http://192.168.50.128:5555` (neexpus public pe internet / Cloudflare Tunnel).
- **Autentificare HTTP Basic Auth:**
  - **Utilizator:** `admin` (sau valoarea din `PRISMA_STUDIO_USER`)
  - **Parolă:** `PRISMA_STUDIO_PASSWORD` (sau `POSTGRES_PASSWORD` implicit dacă nu este setată separat).
