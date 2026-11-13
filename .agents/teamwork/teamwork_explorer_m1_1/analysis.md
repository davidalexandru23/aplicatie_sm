# RAPORT DE ANALIZĂ TEHNICĂ: INVESTIGAȚIE CRASH XLSX & SABLOANE EXCEL (MILESTONE 1)

**Autor:** Teamwork Explorer M1.1 (`teamwork_explorer_m1_1`)  
**Data:** 5 Noiembrie 2026  
**Fișier analizat:** `src/lib/templates/generator.ts` (linia 419)  
**Obiectiv:** Investigarea cauzei fundamentale a crash-ului HTTP 500 la generarea șabloanelor Excel, validarea soluției propuse pe bază de buffer, inspectarea importurilor și analiza structurală a șabloanelor Excel statutare.

---

## 1. REZUMAT EXECUTIV

Eroarea critică `Cannot access file .../Tabel Cursanti exemplu.xlsx` (sau `Anexe Curs igiena.xlsx`) este cauzată exclusiv de utilizarea funcției sincrone `XLSX.readFile(templateFilePath)` la linia 419 din `src/lib/templates/generator.ts`. 

În Next.js 16 (App Router cu Turbopack și ESM), pachetul `xlsx` este rezolvat prin `module: "xlsx.mjs"`. În această versiune ESM a bibliotecii SheetJS, variabila internă `_fs` este inițializată ca `undefined` (`let _fs = void 0`), iar funcția internă `read_binary(path)` aruncă necondiționat `Error: Cannot access file <path>` în lipsa unui apel explicit `set_fs(fs)`.

Soluția optimă și robustă constă în decuplarea completă a citirii fișierului de mecanismul intern SheetJS, citind fișierul direct în memorie prin modulul nativ Node.js `fs.readFileSync(templateFilePath)` și parsând buffer-ul cu `XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })`. 

Această abordare este 100% aliniată cu restul codebase-ului (care folosește deja acest tipar la linia 50 și 89 din `generator.ts`, în `src/lib/importer.ts:316` și în `src/lib/exporter.ts:101-102`), a fost validată empiric pe ambele fișiere `.xlsx` (generând binary-uri valide fără erori) și are impact zero asupra tipizării TypeScript (`npx tsc --noEmit` trece cu cod 0).

---

## 2. INVESTIGAȚIE ROOT CAUSE: DE CE EȘUEAZĂ `XLSX.readFile` ÎN NEXT.JS 16 ESM / TURBOPACK

### 2.1. Arhitectura de rezoluție a modulelor în Next.js 16
În `node_modules/xlsx/package.json`:
- Linia 23: `"main": "xlsx.js"` (versiune CommonJS)
- Linia 24: `"module": "xlsx.mjs"` (versiune ESM pură)

Next.js 16 cu Turbopack utilizează rezoluția modernă ESM (`module`/`import`). Când `src/lib/templates/generator.ts` execută:
```typescript
import * as XLSX from 'xlsx';
```
Turbopack încarcă fișierul `node_modules/xlsx/xlsx.mjs`.

### 2.2. Mecanismul intern SheetJS `readFile` în ESM
Analiza codului sursă `node_modules/xlsx/xlsx.mjs` relevă:
1. La linia 3163 din `xlsx.mjs`:
   ```javascript
   let _fs = void 0;
   function set_fs(fs) { _fs = fs; }
   export { set_fs };
   ```
   Spre deosebire de versiunea CommonJS (`xlsx.js`) unde exista o tentativă `try { _fs = require('fs'); } catch(e) {}`, versiunea ESM **nu importă niciodată automat `fs`**. În specificația ESM, `fs` este un modul extern Node.js ce nu poate fi importat sincron și dinamic fără instrucțiuni dedicate de top-level import.

2. La linia 23849:
   ```javascript
   function readFileSync(filename, opts) {
       var o = opts || {}; o.type = 'file';
       return readSync(filename, o);
   }
   ```

3. La linia 23811 (`readSync`):
   ```javascript
   if(o.type == "file") {
       o.type = has_buf ? "buffer" : "binary";
       d = read_binary(data);
       ...
   }
   ```

4. La liniile 3224-3235 (`read_binary`):
   ```javascript
   function read_binary(path) {
       if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
       if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
       if(typeof $ !== 'undefined' && typeof File !== 'undefined' && typeof Folder !== 'undefined') try { ... } ...
       throw new Error("Cannot access file " + path);
   }
   ```

### 2.3. Traseul erorii în execuție
Deoarece `_fs` este `undefined`, `read_binary` ratează toate verificările de mediu și ajunge direct la linia 3234:
```
throw new Error("Cannot access file " + path);
```
Acest `Error` este interceptat de blocul `try/catch` din ruta API `src/app/api/documents/generate/route.ts:53`, returnând clientului HTTP 500:
```json
{
  "error": "Cannot access file /Users/.../templates_registry/normalized/Tabel Cursanti exemplu.xlsx"
}
```
Chiardacă fișierul fizic există pe disc și este valid, `XLSX.readFile` eșuează din cauza lipsei `_fs` în contextul ESM.

---

## 3. INSPECȚIA IMPORTURILOR ÎN `generator.ts`

În `src/lib/templates/generator.ts`:
- **Linia 1:** `import fs from 'fs';`
  Modulul nativ `fs` este **deja importat corect la nivel de top-level**.
- **Linia 2:** `import path from 'path';`
- **Linia 7:** `import * as XLSX from 'xlsx';`

Nu este necesară adăugarea niciunui import nou! `fs.readFileSync` este imediat disponibil în scopul funcției `renderTemplateBuffer`.

---

## 4. VALIDAREA FIX-ULUI RECOMANDAT

### 4.1. Codul propus
În `src/lib/templates/generator.ts` (în jurul liniei 419):

**Înainte:**
```typescript
  } else if (templateFormat === 'xlsx') {
    const wb = XLSX.readFile(templateFilePath);
```

**După:**
```typescript
  } else if (templateFormat === 'xlsx') {
    const fileBuffer = fs.readFileSync(templateFilePath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
```

### 4.2. De ce funcționează această remediere?
1. **Delegare către I/O nativ Node.js:** `fs.readFileSync(templateFilePath)` rulează în runtime-ul Node.js al serverului Next.js, beneficiind de suport complet pentru fișiere de sistem locale, permisiuni și căi absolute.
2. **Bypass complet al `read_binary`:** Când `XLSX.read(fileBuffer, { type: 'buffer' })` primește un buffer în memorie, `readSync` identifică `Buffer.isBuffer(data) === true` și execută direct parserul zip/cfb intern (`read_zip` sau `CFB.read`), **fără a apela vreodată `read_binary` și fără a verifica variabila `_fs`**.
3. **Rolul `cellDates: false`:** Împiedică interpretarea eronată sau conversia automată la obiecte `Date` cu fus orar UTC pentru șirurile de tip dată (`PLACEHOLDER_DATA_EXAMEN`, `PLACEHOLDER_DATA_SESIUNE`) sau numerele de serie Excel. Datele rămân brute, permițând funcțiilor noastre de formatare (`parseBirthInfo`, `textValue`) să controleze reprezentarea textuală conform standardului românesc `DD.MM.YYYY`.
4. **Aliniere cu alte componente din proiect:**
   - `src/lib/templates/generator.ts:50, 89`: `collectUnresolvedPlaceholders` utilizează deja `fs.readFileSync` și `XLSX.read(buffer, { type: 'buffer', cellDates: false })`.
   - `src/lib/importer.ts:316`: `const wb = XLSX.read(buffer, { type: 'buffer' });`.
   - `src/lib/exporter.ts:101-102`: `const fileBuffer = fs.readFileSync(templatePath); wb = XLSX.read(fileBuffer, { type: 'buffer' });`.

### 4.3. Comparație cu alternativa `XLSX.set_fs(fs)`
Ar fi fost teoretic posibil să apelăm `(XLSX as any).set_fs(fs)`. Totuși, această soluție este inferioară deoarece:
- Modifică o stare globală mutabilă a unui modul extern;
- Poate fi afectată de mecanismele de tree-shaking sau instanțiere separată pe worker-threads/chunks în Next.js/Turbopack;
- Menține dependența SheetJS de operațiuni pe disc.

Citirea explicită prin buffer în memorie este o metodă pură, decuplată și predictibilă.

---

## 5. ANALIZA CELOR DOUĂ ȘABLOANE EXCEL STATUTARE

### 5.1. Șablonul 1: `Tabel Cursanti exemplu.xlsx` (`hygiene-tabel-cursanti`)
- **Locație fizică:** `templates_registry/normalized/Tabel Cursanti exemplu.xlsx`
- **Dimensiune fișier:** 52.403 bytes (~51 KB)
- **Foi de calcul (SheetNames):** `['Curs (2)']` (1 singură foaie)
- **Dimensiune tabel (`!ref`):** `A1:I117`
- **Număr total de apariții tokenuri:** 1.036 tokenuri
- **Structură și destinație:**
  - Reprezintă Registrul electronic de evidență a cursanților la programul de instruire privind însușirea noțiunilor fundamentale de igienă (Ordinul MS/ME 2209/4469/2022).
  - În antet conține tokenul scalar de sesiune: `PLACEHOLDER_DATA_EXAMEN`.
  - Conține un tabel centralizator cu o capacitate de **115 cursanți**, având coloanele:
    - Nr. crt.: `PLACEHOLDER_NUMAR_ORDINE_001` .. `_115`
    - Nume și prenume: `PLACEHOLDER_NUME_COMPLET_001` .. `_115`
    - CNP: `PLACEHOLDER_CNP_001` .. `_115`
    - Anul nașterii: `PLACEHOLDER_AN_NASTERII_001` .. `_115`
    - Luna nașterii: `PLACEHOLDER_LUNA_NASTERII_001` .. `_115`
    - Ziua nașterii: `PLACEHOLDER_ZIUA_NASTERII_001` .. `_115`
    - Locul nașterii: `PLACEHOLDER_LOC_NASTERII_001` .. `_115`
    - Act de identitate: `PLACEHOLDER_ACT_IDENTITATE_001` .. `_115`

### 5.2. Șablonul 2: `Anexe Curs igiena.xlsx` (`hygiene-anexe-catalog`)
- **Locație fizică:** `templates_registry/normalized/Anexe Curs igiena.xlsx`
- **Dimensiune fișier:** 48.292 bytes (~47 KB)
- **Foi de calcul (SheetNames):** 8 foi oficiale conform legislației:
  
  | Foaie Excel | Denumire Statutară | Domeniu (`!ref`) | Număr Tokenuri | Rol & Conținut Legal |
  |---|---|---|:---:|---|
  | `Anexa nr. 1` | Cerere avizare program | `A1:D56` | 19 | Cerere oficială furnizor către DSP/ISJ (`PLACEHOLDER_FURNIZOR_SSM`, `PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR`) |
  | `Anexa nr. 2` | Decizie comisie examinare | `A1:G29` | 15 | Decizie internă de numire comisie examen (`PLACEHOLDER_PRESEDINTE_COMISIE`, `PLACEHOLDER_MEMBRU_COMISIE_1`, `PLACEHOLDER_AVIZ_MS`) |
  | `Anexa nr. 3` | Catalog curs & examen | `A1:H119` | 706 | Catalogul oficial al sesiunii pentru **100 cursanți** (`_001` la `_100`), note de examen (`PLACEHOLDER_NOTA_EXAMEN_001`), rezultat admis/respins |
  | `Anexa nr. 4` | Borderou sală examen | `A1:G121` | 206 | Borderou prezență sală (`PLACEHOLDER_SALA_EXAMEN`, `PLACEHOLDER_ORA_EXAMEN`, semnături cursanți) |
  | `Anexa nr. 5` | Proces-verbal comisie | `A1:F126` | 505 | Procesul-verbal încheiat la finalizarea examenului cu situația statistică și semnăturile comisiei |
  | `Anexa nr. 6` | Raport sinteză examen | `A1:K35` | 21 | Centralizator numeric (candidați înscriși, prezenți, admiși, respinși) |
  | `Anexa nr. 7` | Formular adeverință cursant | `A1:G26` | 11 | Formatul tipizat al adeverinței de absolvire (`PLACEHOLDER_NUME_COMPLET`, `PLACEHOLDER_CNP`, serie și număr) |
  | `Anexa nr. 8` | Registru eliberare adeverințe | `A1:K205` | 1.757 | Registrul matricol de eliberare a adeverințelor / certificatelor de igienă |

  **Total tokenuri în `Anexe Curs igiena.xlsx`:** **3.240 tokenuri**.

---

## 6. ANALIZA LOGICII DE PROCESARE A FOILOR ȘI SCRIERE ÎN `generator.ts`

### 6.1. Iterarea foilor de calcul (SheetNames)
La linia 491:
```typescript
for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = sheet[address];
    if (typeof cell?.v !== 'string') continue;
...
```
- Bucla parcurge în mod exhaustiv toate foile workbook-ului (`Curs (2)` pentru tabelul simplu; toate cele 8 anexe pentru fișierul complex).
- Proprietățile interne SheetJS (începând cu `!`, cum ar fi `!ref`, `!merges`, `!cols`, `!rows`) sunt protejate și nu sunt modificate.
- Se procesează strict celulele de tip text (`typeof cell?.v === 'string'`).

### 6.2. Înlocuirea tokenurilor scalare vs. indexate
Generatorul aplică regex-ul `/PLACEHOLDER_[A-Z0-9_]+/g`:
1. **Valori directe (scalare):**
   ```typescript
   const directValue = effectiveData[token];
   if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
     return textValue(directValue);
   }
   ```
   Pentru câmpuri generale precum `PLACEHOLDER_PRESTATOR_SSM`, `PLACEHOLDER_DATA_EXAMEN`, `PLACEHOLDER_AVIZ_MS`, se injectează direct valoarea rezolvată.

2. **Valori indexate pentru participanți (`_(\d{2,3})$`):**
   ```typescript
   const indexed = token.match(/_(\d{2,3})$/);
   if (indexed) {
     const index = Number(indexed[1]) - 1;
     if (index >= participants.length) return '';
     if (participants[index]) {
       const formatted = formatParticipantValue(token, participants[index]);
       return formatted !== undefined ? formatted : '';
     }
     return '';
   }
   ```
   - Dacă rândul depășește numărul efectiv de cursanți din sesiune (`index >= participants.length`), tokenul este înlocuit cu șirul vid `""`. **Acest lucru curăță impecabil rândurile nefolosite din capacitatea de 100/115 rânduri**, prevenind apariția textelor brute `{PLACEHOLDER_...}` în fișierele finale.
   - Dacă participantul există, datele sale sunt formatate prin `formatParticipantValue` (CNP, act identitate, modul, notă, adeverință).

3. **Invalidarea cache-ului de text formatat (`cell.w`):**
   ```typescript
   cell.v = replaced;
   if (cell.w) delete cell.w;
   ```
   Această linie este critică: în SheetJS, `cell.w` stochează șirul pre-formatat vizibil în Excel. Ștergerea lui obligă motoarele de randare Excel să utilizeze noua valoare `cell.v`.

4. **Scrierea binară și salvarea pe disc:**
   ```typescript
   return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
   ```
   - Produce un `Buffer` Node.js în memorie.
   - La linia 593: `fs.writeFileSync(outPath, outputBuffer);` scrie fișierul fizic pe disc în `storage/documents/<docId>.xlsx`.
   - La linia 583: `collectUnresolvedPlaceholders` re-parsează buffer-ul generat pentru a asigura că documentul primește statusul `approved_for_print` dacă toate câmpurile obligatorii au fost completate.

---

## 7. PROBE EMPIRICE DE LABORATOR (TESTARE SINTETICĂ DIRECTĂ)

Pentru a valida comportamentul, am executat probe directe pe fișierele fizice din repository:

1. **Test 1: Execuție cu `xlsx.mjs` (ESM pur) și `readFile`:**
   - **Comandă:** Apel direct `SheetJS.readFile(filePath)` încărcând `xlsx.mjs`.
   - **Rezultat:** `Error: Cannot access file templates_registry/normalized/Tabel Cursanti exemplu.xlsx` (reproducere identică 100% cu eroarea din logurile de producție).
2. **Test 2: Execuție cu `fs.readFileSync` + `XLSX.read` pe `Tabel Cursanti exemplu.xlsx`:**
   - **Rezultat:** Succes deplin. Workbook încărcat, foaie detectată: `['Curs (2)']`, generat buffer valid de 56.987 bytes.
3. **Test 3: Execuție cu `fs.readFileSync` + `XLSX.read` pe `Anexe Curs igiena.xlsx`:**
   - **Rezultat:** Succes deplin. Toate cele 8 foi încărcate, generat buffer valid de 156.528 bytes.
4. **Test 4: Verificare re-parsare binar rezultat:**
   - Buffer-ul rezultat din `XLSX.write` a fost re-citit cu succes prin `XLSX.read`, confirmând integritatea structurii XML OpenPackaging / SpreadsheetML.

---

## 8. RECOMANDARE CONCRETĂ DE IMPLEMENTARE PENTRU WORKER

Modificarea necesară în `src/lib/templates/generator.ts`:

```diff
--- a/src/lib/templates/generator.ts
+++ b/src/lib/templates/generator.ts
@@ -418,2 +418,3 @@ export async function renderTemplateBuffer(
   } else if (templateFormat === 'xlsx') {
-    const wb = XLSX.readFile(templateFilePath);
+    const fileBuffer = fs.readFileSync(templateFilePath);
+    const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
     let participants = Array.isArray(data.participants)
```

Nicio altă linie din `generator.ts` nu necesită modificare pentru remedierea crash-ului XLSX.
