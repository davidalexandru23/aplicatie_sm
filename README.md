# Sistem Intern de Gestiune SSM & Generator Documente

Aplicație web monolitică internă de înaltă performanță, construită cu **Next.js (App Router)**, **TypeScript**, **PostgreSQL** și **Prisma ORM**, dedicată furnizorului de servicii SSM și cursurilor de igienă.

Centralizează registrul clienților, permite importul registrului [`Model_date_client_SSM.xlsx`](file:///Users/davidalexandru/Documents/Proiect_SSM/outputs/ssm-client-template/Model_date_client_SSM.xlsx) cu preview și reconciliere automată pe bază de CNP, și generează oricare dintre cele **25 de șabloane oficiale** (DOCX, PDF, XLSX).

---

## 🚀 Tehnologii & Arhitectură

- **Backend & Frontend:** Next.js 16 (App Router, Server Actions, Server Components) + TypeScript + Tailwind CSS.
- **Bază de date & ORM:** PostgreSQL 16 + Prisma ORM cu migrații și tipizare strictă.
- **Motor de documente:**
  - `docxtemplater` + `pizzip` pentru DOCX (taguri declarative, bucle de tabele, condiții).
  - `pdf-lib` pentru formulare PDF nominale (overlay vizual precis).
  - `xlsx` pentru pachetul oficial de cursuri de igienă (Anexele 1–8).
- **GDPR & Securitate:** CNP mascat implicit în UI (`18504********`), exclus cu strictețe din URL-uri, loguri de audit și denumiri de fișiere; stocare privată protejată pentru documentele generate.
- **Audit:** Jurnal complet de evenimente de audit (`AuditEvent`) pentru fiecare acțiune de import, generare și descărcare.

---

## 📋 Inventar 25 / 25 Șabloane Acoperite

1. `ipssm-opis`: OPIS Instrucțiuni Proprii SSM (`.docx`)
2. `ipssm-universale`: IPSSM 01-10 Generale / Universale (`.docx`)
3. `ipssm-alunecari`: IPSSM 11 - Prevenirea alunecărilor și împiedicărilor (`.docx`)
4. `ipssm-autovehicule`: IPSSM 12 - Circulația autovehiculelor (`.docx`)
5. `ipssm-birou`: IPSSM 13 - Activități de birou (`.docx`)
6. `ipssm-tesa`: Ghid de instruire TESA (`.docx`)
7. `training-tematica-introductiv`: Tematică instruire introductiv-generală 4h (`.docx`)
8. `training-detaliu-introductiv`: Detaliu suport la tematica introductiv-generală (`.docx`)
9. `training-tematica-loc-munca`: Tematică instruire la locul de muncă (`.docx`)
10. `training-detaliu-loc-munca`: Detaliu suport la tematica instruirii la locul de muncă (`.docx`)
11. `decizii-angajator`: Pachet Decizii Organizare SSM a Angajatorului (`.docx`)
12. `hr-anexa-fisa-post`: Anexă SSM la fișa de post (`.docx`)
13. `hr-cerere-angajare`: Cerere de angajare tipizată (`.pdf`)
14. `hr-declaratie-regulament`: Declarație luare la cunoștință Regulament Intern (`.pdf`)
15. `hr-declaratie-raspundere`: Declarație pe proprie răspundere la angajare (`.pdf`)
16. `hr-cim-2026`: Contract Individual de Muncă Model Cadru (`.docx`)
17. `hr-info-dosar`: Checklist acte dosar de personal (`.docx`)
18. `hr-gdpr-informare`: Informare protecția datelor cu caracter personal (`.docx`, status review)
19. `risk-evaluare`: Raport Evaluarea Riscurilor Profesionale (`.docx`)
20. `risk-plan-prevenire-tesa`: Plan de Prevenire și Protecție (`.docx`)
21. `risk-zone-pericol`: Evidența zonelor cu risc ridicat și specific (`.docx`)
22. `risk-plan-actiune-urgenta`: Plan de acțiune pericol grav și iminent (`.docx`)
23. `hygiene-adeverinta`: Adeverință de participare curs igienă (`.docx`)
24. `hygiene-anexe-catalog`: Pachet formulare administrative curs igienă Anexe 1-8 (`.xlsx`)
25. `hygiene-tabel-cursanti`: Tabel cursanți igienă (`.xlsx`)

---

## 🛠️ Pornire Rapidă (Local Development)

### 1. Dependințe & Baza de date
Asigură-te că ai **Node.js 20+** și **PostgreSQL 14+** pornit.

```bash
# Instalare pachete
npm install

# Generare client Prisma & sincronizare schemă PostgreSQL
npx prisma db push

# Populare automată a catalogului cu cele 25 de șabloane
npx tsx src/lib/templates/seed.ts
```

### 2. Rulare aplicație
```bash
# Mod dezvoltare (Turbopack)
npm run dev

# Sau producție
npm run build
npm start
```
Aplicația rulează la: **`http://localhost:3000`**

---

## 🧪 Rulare Test End-to-End
Verifică întregul flux (parsare Excel, creare client, reconciliere diferențe, generare DOCX/PDF/XLSX și audit privacy):

```bash
npx tsx scripts/test-e2e.ts
```

---

## 🐳 Rulare cu Docker Compose
```bash
docker compose up -d
```
Porneste automat containerul PostgreSQL și containerul aplicației Next.js.
