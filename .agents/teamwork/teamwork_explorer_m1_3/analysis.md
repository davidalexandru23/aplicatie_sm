# Raport de Analiză Tehnică — Milestone 1 (Quick Fixes Imediate)
**Subagent:** `teamwork_explorer_m1_3`  
**Dată:** 5 Noiembrie 2026  
**Obiectiv:** Investigarea test harness-ului, verificării build-ului și integrării end-to-end pentru generarea șabloanelor XLSX (`hygiene-tabel-cursanti` și `hygiene-anexe-catalog`).

---

## 1. Rezumat Executiv

Investigația a identificat cu certitudine cauza rădăcină a crash-ului HTTP 500 (`Cannot access file ...`) la generarea șabloanelor XLSX: metoda SheetJS `XLSX.readFile(templateFilePath)` apelează intern `require('fs')`, care este `undefined` în bundle-ul ESM server-side compilat de Next.js 16 App Router (Turbopack). În timp ce testele CLI standalone (`npx tsx`) treceau deoarece rulau direct în runtime-ul Node.js cu `require` disponibil, aplicația web pe `localhost:3000` eșua 100%.

Soluția constă în înlocuirea `XLSX.readFile(templateFilePath)` cu `fs.readFileSync(templateFilePath)` și `XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })`. În paralel, dropdown-ul „Funcție / Post” din UI apărea din cauza predicatului inversat `!isEmployeeRequired` combinat cu pre-selectarea automată a primului post de client (`jobs[0].id`).

---

## 2. Inventarul Test Harness-ului din Depozit

### 2.1. Configurația `package.json`
În fișierul `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```
- **Constatare critică:** **Nu există niciun script `"test"` definit** în `package.json`. Rularea comenzii `npm test` returnează eroarea standard: `npm error Missing script: "test"`.
- Nu sunt instalate biblioteci externe de testare de tip Jest sau Vitest în `devDependencies`.
- Este instalat Node.js v22.20.0 și `tsx` v4.23.15 (folosit și pentru `prisma.seed`: `"npx tsx prisma/seed.ts"`).

### 2.2. Structura de Fișiere de Test
- Nu există foldere convenționale `src/__tests__` sau `tests/`.
- În schimb, proiectul deține un repertoriu extins de **47 de scripturi de verificare și testare** în directorul `/scripts/`.
- Printre cele mai importante scripturi:
  1. `scripts/verify-all.ts`: Suita unificată de acceptanță (Acceptance Gate) care execută secvențial 5 piloni:
     - **Pilon 1:** `scripts/test-all-templates-generation.ts` (generarea celor 31 de șabloane statutare — 29 DOCX, 2 XLSX).
     - **Pilon 2:** `scripts/verify-compliance.ts` (45 teste unitare de calcul statutar: HG 355/2007, Legea 319/2006, OMAI 712/2005, Ordin 2209/2022, clamping de dată, imunitate DST).
     - **Pilon 3:** `scripts/verify-excel-import-export.ts` (6 teste de import/export Excel, parsare dirty data, rollback tranzacțional).
     - **Pilon 4:** `scripts/e2e-suite.ts` (53 teste E2E dincolo de interfață pe 4 niveluri de izolare și ciclu de viață salariat).
     - **Pilon 5:** `npm run build` (verificarea integrității compilării Next.js Turbopack).
     - *Performanță masurată:* Execuția completă a `verify-all.ts` durează **11.51 secunde** și raportează **136/136 teste trecute (100%)**.
  2. `scripts/verify-hygiene-generation-adversarial.ts`: Suită adversarială detaliată pentru documentele de igienă:
     - 25 teste cuprinzând 11,159 de aserțiuni.
     - Verifică Scope A (nivel client: Nexus Solutions cu 4 angajați, Bistro Gourmet cu 2 angajați) și Scope B (nivel sesiune pentru 3 sesiuni seed-uite).
     - Inspectează coordonatele celulelor XLSX, eliminarea rândurilor reziduale (`_001` – `_115`), absența tokenurilor `{PLACEHOLDER_...}` reziduale și diacriticele românești (`ș, ț, ă, î, â`).

---

## 3. Fenomenul Discrepanței: De ce testele CLI treceau, dar aplicația web crăpa?

### 3.1. Reproducere Empirică Verbatim pe Serverul Activ (localhost:3000)
Apel direct via `curl` către ruta Next.js activă:

```bash
# 1. Testare generare hygiene-tabel-cursanti:
curl -s -X POST http://localhost:3000/api/documents/generate \
  -H "Content-Type: application/json" \
  -d '{"templateCode":"hygiene-tabel-cursanti","clientId":"b9e022a5-d9ca-45e0-8937-6bddae724965","hygieneSessionId":"0529ca68-5c4f-4c8b-88c7-978deec1244f"}'

# Răspuns primit (HTTP 500):
{"error":"Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx"}

# 2. Testare generare hygiene-anexe-catalog:
curl -s -X POST http://localhost:3000/api/documents/generate \
  -H "Content-Type: application/json" \
  -d '{"templateCode":"hygiene-anexe-catalog","clientId":"b9e022a5-d9ca-45e0-8937-6bddae724965","hygieneSessionId":"0529ca68-5c4f-4c8b-88c7-978deec1244f"}'

# Răspuns primit (HTTP 500):
{"error":"Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Anexe Curs igiena.xlsx"}
```

### 3.2. Mecanismul Erorii (Root Cause Analysis)
1. În `src/lib/templates/generator.ts:419`:
   ```typescript
   } else if (templateFormat === 'xlsx') {
     const wb = XLSX.readFile(templateFilePath);
   ```
2. Biblioteca `xlsx` (SheetJS v0.18.5) are în implementarea sa `readFile`:
   ```javascript
   function read_binary(file, options) {
     var fs = typeof require !== 'undefined' ? require('fs') : null;
     if (!fs) throw new Error("Cannot access file " + file);
     return read(fs.readFileSync(file), options);
   }
   ```
3. **Diferența de mediu:**
   - La rularea prin scripturi CLI (`npx tsx scripts/...`), Node.js rulează direct fișierul TS, având mediul Node global cu `require` disponibil. Astfel, `read_binary` găsea `fs` și citea fișierul fără eroare.
   - În serverul Next.js 16 (App Router cu Turbopack), rutele API sunt împachetate în module **ESM pure**. În interiorul modulului compilat, `require` nu este definit în scopul lexical. SheetJS verifică `typeof require !== 'undefined'` -> evaluează la `false` -> aruncă excepția `Cannot access file /.../Tabel Cursanti exemplu.xlsx`.
4. **Remedierea confirmată:**
   Deoarece `import fs from 'fs'` este deja importat nativ la linia 1 din `src/lib/templates/generator.ts`, apelul:
   ```typescript
   const fileBuffer = fs.readFileSync(templateFilePath);
   const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
   ```
   ocolește complet logica `read_binary` din SheetJS și funcționează identic atât în Next.js Turbopack ESM, cât și în scripturile CLI.
   Verificarea empirică directă în Node.js a confirmat:
   - `Tabel Cursanti exemplu.xlsx`: citit cu succes (foaie `'Curs (2)'`, buffer de 85,148 bytes).
   - `Anexe Curs igiena.xlsx`: citit cu succes (8 foi: `'Anexa nr. 1'` ... `'Anexa nr. 8'`, buffer de 246,299 bytes).

---

## 4. Fluxul End-to-End de Invocare a Generării XLSX

Traseul complet de execuție de la cererea HTTP la fișierul final:

```
[Client / UI / cURL]
       │
       ▼  POST /api/documents/generate
{ templateCode, clientId, hygieneSessionId, customFields }
       │
       ▼
[src/app/api/documents/generate/route.ts]
       │  1. Validare parametri obligatorii (templateCode, clientId)
       │  2. Apel resolveTemplatePlaceholders(...)
       ▼
[src/lib/templates/resolver.ts]
       │  - Încarcă Client, Angajați, Sesiune de Igienă (dacă există hygieneSessionId)
       │  - Construiește structura `participants: [...]` (date cursant, act identitate, CNP, note, module)
       │  - Mapare tokenuri scalare (Furnizor SSM, Avize MS/ME, Date examen, Comisie)
       ▼
[src/lib/templates/generator.ts: generateDocument(...)]
       │  - Încarcă definiția șablonului din DB (`prisma.template.findUnique`)
       │  - Identifică formatul (`templateFormat === 'xlsx'`)
       │  - Localizează fișierul fizic în `templates_registry/normalized/`
       │  - Apelează `renderTemplateBuffer(templateFilePath, 'xlsx', data, filename)`
       ▼
[src/lib/templates/generator.ts: renderTemplateBuffer(...)]
       │  - [BUG AICI: XLSX.readFile] -> [FIX: fs.readFileSync + XLSX.read]
       │  - Iterează prin SheetNames
       │  - Caută tokenurile `PLACEHOLDER_[A-Z0-9_]+`
       │  - Pentru tokenurile indexate (`_001` - `_115`), extrage indexul și populează din `participants[idx]`
       │  - Curăță celulele neutilizate (rândurile goale până la 115) cu string vid `""`
       │  - Apelează `XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })`
       ▼
[Salvare & Răspuns]
       │  - Scrie fișierul în `storage/documents/<documentId>.xlsx`
       │  - Creează înregistrarea în tabela `GeneratedDocument` (status: `approved_for_print`)
       │  - Înregistrează eveniment în `AuditEvent`
       ▼  Returnează JSON HTTP 200:
{ success: true, result: { documentId, filePath, status, fileSizeBytes }, downloadUrl }
```

---

## 5. Cerințe de Intrare pentru Generarea Șabloanelor XLSX

### 5.1. Definițiile de Catalog
| Proprietate | `hygiene-tabel-cursanti` | `hygiene-anexe-catalog` |
|---|---|---|
| **Fișier Șablon** | `Tabel Cursanti exemplu.xlsx` | `Anexe Curs igiena.xlsx` |
| **Număr Foi (Sheets)** | 1 (`Curs (2)`) | 8 (`Anexa nr. 1` – `Anexa nr. 8`) |
| **Număr Tokenuri** | 1,036 tokenuri indexate `_001`–`_115` | 2,314 tokenuri (scalare + `_001`–`_100`) |
| **Context Level** | `hygiene_session` | `hygiene_session` |
| **Familie** | `hygiene` | `hygiene` |

### 5.2. Parametrii de Intrare Necesar
1. **Obligatorii (Nivel API):**
   - `templateCode`: `'hygiene-tabel-cursanti'` sau `'hygiene-anexe-catalog'`.
   - `clientId`: ID-ul clientului (ex: `b9e022a5-d9ca-45e0-8937-6bddae724965`).
2. **Recomandați pentru fidelitate completă (Nivel Business):**
   - `hygieneSessionId`: ID-ul unei sesiuni de igienă existente (ex: `0529ca68-5c4f-4c8b-88c7-978deec1244f`).
     *Notă resolver:* Dacă `hygieneSessionId` lipsește, resolverul face fallback la Scope A (sintetizează cursanții din angajații activi ai clientului cu modulul de igienă asociat). Dacă este furnizat, extrage avizele MS/ME, data sesiunii, data examenului, membrii comisiei și catalogul oficial de participanți.
3. **Opționali:**
   - `customFields`: obiect cu suprascrieri manuale pentru câmpurile nerezolvate (ex: `PLACEHOLDER_NUMAR_PV`, `PLACEHOLDER_LOCATIE_EXAMEN`).
4. **Interziși / Irelevanți (Trebuie omiși sau resetați):**
   - `jobId`: **Nu are ce căuta în documentele de igienă!** Cursurile de igienă sunt organizate pe module sanitare (Modulul 1 - Alimentație, Modulul 2 - Servicii, etc.), nu pe posturi individuale de lucru SSM.
   - `employeeId`: Doar pentru adeverința nominală (`hygiene-adeverinta`), nu pentru tabelele și cataloagele colective XLSX.

### 5.3. Defecțiunea din Interfața Grafică (`src/app/documents/generate/page.tsx`)
1. **Linia 470:**
   ```tsx
   {!isEmployeeRequired && selectedClientId && jobs.length > 0 && (
   ```
   - Pentru șabloanele de igienă, `isEmployeeRequired` este `false`.
   - Prin urmare, `!isEmployeeRequired` devine `true`.
   - Rezultat: dropdown-ul „Funcție / Post de Lucru” era afișat abuziv la orice șablon de igienă.
2. **Liniile 185–187:**
   ```tsx
   if (!isEmployeeRequired && !selectedJobId && data.jobs.length > 0) {
     setSelectedJobId(data.jobs[0].id);
   }
   ```
   - Dacă `!isEmployeeRequired` este `true`, codul forța automat primul post din firmă (ex: „Bucătar”) în starea componentei `selectedJobId`.
   - La generare (linia 314), `selectedJobId` era trimis în corpul cererii către backend.
3. **Corecție propusă pentru UI:**
   - Condiție strictă la linia 470:
     ```tsx
     {!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0 && (
     ```
   - La selectarea unui șablon de igienă (`isHygieneTemplate === true`), resetarea explicită: `setSelectedJobId('')`.
   - La linia 314 din `page.tsx`:
     ```tsx
     jobId: isHygieneTemplate ? undefined : (selectedJobId || undefined),
     ```

---

## 6. Strategia de Verificare și Testare Fără A Afecta Build-ul

### 6.1. Impactul Asupra `npm run build`
- A fost rulată comanda `npm run build`:
  ```
  ▲ Next.js 16.4.3 (Turbopack)
  ✓ Compiled successfully in 1013ms
  ✓ Finished TypeScript in 1401ms
  ✓ Generating static pages using 7 workers (13/13) in 216ms
  Finalizing page optimization in 20ms
  ```
- **Concluzie de build:** Toate rutele dinamice (`ƒ /api/documents/generate`) sunt verificate doar la nivel de tipuri TypeScript și bundling în timpul build-ului. Modificarea `generator.ts` (trecerea la `fs.readFileSync` + `XLSX.read`) este 100% compatibilă cu compilatorul TypeScript și Turbopack.

### 6.2. Strategia Recomandată pentru Teste Unitare și de Integrare
Pentru a asigura că generarea XLSX este verificată continuu fără riscul de a reintroduce crash-ul în Next.js:

1. **Test Unitar / Script de Verificare Faza 1:**
   Crearea unui test dedicat (ex: `scripts/test-m1-xlsx-generation.ts`) care:
   - Invocă direct funcția `generateDocument` pentru `hygiene-tabel-cursanti` și `hygiene-anexe-catalog`.
   - Testează atât Scope A (fără `hygieneSessionId`), cât și Scope B (cu `hygieneSessionId`).
   - Încarcă fișierul rezultat folosind `XLSX.read(fs.readFileSync(result.filePath))` și validează:
     - Numărul de foi (1 foaie pentru Tabel, 8 foi pentru Anexe).
     - Numărul de participanți corect reflectat.
     - 0 tokenuri `{PLACEHOLDER_...}` reziduale.
     - Dimensiunea fișierului > 0 octeți și statusul `approved_for_print`.

2. **Test de Integrare HTTP (End-to-End API):**
   Un script care trimite cereri HTTP reale către `/api/documents/generate` (când serverul rulează):
   - Verifică că serverul răspunde cu cod HTTP 200 (nu 500).
   - Verifică prezența câmpului `success: true` și existența URL-ului de descărcare.

3. **Integrare în `package.json`:**
   Adăugarea în `package.json` a comenzii:
   ```json
   "scripts": {
     "test": "npx tsx scripts/verify-all.ts",
     "test:m1": "npx tsx scripts/verify-hygiene-generation-adversarial.ts"
   }
   ```
   - Rularea `npm test` va executa suita completă de acceptanță (136 teste) în doar 11.5 secunde.
   - Nu afectează în niciun fel `npm run build` sau deployment-ul.

---

## 7. Recomandări Concrete pentru Implementare (Milestone 1)

| Fișier Țintă | Linia | Acțiune Propusă | Rationale |
|---|---|---|---|
| `src/lib/templates/generator.ts` | 419 | Înlocuire `const wb = XLSX.readFile(templateFilePath);` cu:<br>`const fileBuffer = fs.readFileSync(templateFilePath);`<br>`const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });` | Elimină dependența internă a SheetJS de `require('fs')`, prevenind crash-ul HTTP 500 în Next.js Turbopack ESM. |
| `src/app/documents/generate/page.tsx` | 470 | Înlocuire condiție afișare selector Job:<br>`{!isEmployeeRequired && !isHygieneTemplate && (currentTemplate?.contextLevel === 'job' || currentTemplate?.family === 'risk') && selectedClientId && jobs.length > 0 && (` | Ascunde complet dropdown-ul de Post/Funcție pentru șabloanele de igienă și șabloanele generale de firmă. |
| `src/app/documents/generate/page.tsx` | 185 | Adăugare verificare: `if (!isEmployeeRequired && !isHygieneTemplate && !selectedJobId && data.jobs.length > 0)` | Previne auto-selectarea automată a primului post la șabloanele de igienă. |
| `src/app/documents/generate/page.tsx` | 200+ | La schimbarea șablonului (`selectedTemplateCode`), dacă `isHygieneTemplate`, apelare `setSelectedJobId('')` | Curăță starea reziduală a postului când utilizatorul navighează între categorii. |
| `src/app/documents/generate/page.tsx` | 314 | Transmitere `jobId`: `jobId: isHygieneTemplate ? undefined : (selectedJobId || undefined)` | Protejează backend-ul împotriva asocierii accidentale a unui job la cursul de igienă. |
| `package.json` | 9 | Adăugare `"test": "npx tsx scripts/verify-all.ts"` | Standardizează comanda de testare automată a proiectului. |
