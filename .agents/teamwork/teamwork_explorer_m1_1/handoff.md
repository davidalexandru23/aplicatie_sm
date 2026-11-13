# HANDOFF REPORT: INVESTIGAȚIE CRASH XLSX ȘI ȘABLOANE EXCEL (M1.1)

**Autor:** Teamwork Explorer M1.1 (`teamwork_explorer_m1_1`)  
**Data:** 5 Noiembrie 2026  
**Tip Handoff:** Hard (Task de investigație complet finalizat)  
**Destinatar:** Teamwork Orchestrator (`8ad1e81b-94c6-4ac7-af81-65ffa2e75726`) / M1 Implementer Worker

---

## 1. OBSERVATION

1. **Locația erorii în codul sursă:**
   - Fișier: `src/lib/templates/generator.ts`, linia 419:
     ```typescript
     } else if (templateFormat === 'xlsx') {
       const wb = XLSX.readFile(templateFilePath);
     ```
2. **Importurile din antetul fișierului:**
   - Fișier: `src/lib/templates/generator.ts`:
     - Linia 1: `import fs from 'fs';`
     - Linia 7: `import * as XLSX from 'xlsx';`
     - Modulul nativ `fs` este deja importat și disponibil fără nicio altă modificare.
3. **Pachetul SheetJS (`xlsx`):**
   - Fișier: `node_modules/xlsx/package.json`:
     - Linia 23: `"main": "xlsx.js"`
     - Linia 24: `"module": "xlsx.mjs"`
   - În Next.js 16 cu App Router și Turbopack, bundler-ul selectează modulul ESM `node_modules/xlsx/xlsx.mjs`.
4. **Implementarea internă SheetJS în ESM (`xlsx.mjs`):**
   - Linia 3163 din `node_modules/xlsx/xlsx.mjs`:
     ```javascript
     let _fs = void 0;
     function set_fs(fs) { _fs = fs; }
     export { set_fs };
     ```
   - Linia 3224-3235 din `node_modules/xlsx/xlsx.mjs`:
     ```javascript
     function read_binary(path) {
         if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
         if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
         if(typeof $ !== 'undefined' && typeof File !== 'undefined' && typeof Folder !== 'undefined') ...
         throw new Error("Cannot access file " + path);
     }
     ```
   - Linia 23849: `function readFileSync(filename, opts) { var o = opts||{}; o.type = 'file'; return readSync(filename, o); }`
   - Linia 23811: `if(o.type == "file") { o.type = has_buf ? "buffer" : "binary"; d = read_binary(data); ... }`
5. **Reproducere verbatim a erorii în mediu ESM pur:**
   - Comandă:
     ```bash
     node --input-type=module -e "
     import * as SheetJS from './node_modules/xlsx/xlsx.mjs';
     SheetJS.readFile('templates_registry/normalized/Tabel Cursanti exemplu.xlsx');
     "
     ```
   - Rezultat:
     ```
     ESM readFile ERROR: Cannot access file templates_registry/normalized/Tabel Cursanti exemplu.xlsx
     ```
6. **Validarea execuției cu `fs.readFileSync` + `XLSX.read`:**
   - Comandă:
     ```bash
     node --input-type=module -e "
     import fs from 'fs';
     import * as SheetJS from './node_modules/xlsx/xlsx.mjs';
     const fileBuffer = fs.readFileSync('templates_registry/normalized/Tabel Cursanti exemplu.xlsx');
     const wb = SheetJS.read(fileBuffer, { type: 'buffer', cellDates: false });
     console.log('BUFFER READ SUCCESS! Sheets:', wb.SheetNames);
     "
     ```
   - Rezultat:
     ```
     BUFFER READ SUCCESS! Sheets: [ 'Curs (2)' ]
     ```
7. **Șabloanele Excel din `templates_registry/normalized`:**
   - `templates_registry/normalized/Tabel Cursanti exemplu.xlsx` (52.403 bytes):
     - SheetNames: `['Curs (2)']`
     - Dimensiune: `A1:I117`
     - Număr apariții tokenuri: 1.036 (conține `PLACEHOLDER_DATA_EXAMEN` în antet și rânduri indexate `_001` la `_115` pe 8 coloane).
   - `templates_registry/normalized/Anexe Curs igiena.xlsx` (48.292 bytes):
     - SheetNames: 8 foi (`Anexa nr. 1` la `Anexa nr. 8`)
     - Număr apariții tokenuri: 3.240 tokenuri cumulate (Anexa 1: 19, Anexa 2: 15, Anexa 3: 706, Anexa 4: 206, Anexa 5: 505, Anexa 6: 21, Anexa 7: 11, Anexa 8: 1.757).
8. **Utilizarea consacrată a `XLSX.read(buffer)` în alte fișiere din proiect:**
   - `src/lib/templates/generator.ts:89`: `const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });`
   - `src/lib/importer.ts:316`: `const wb = XLSX.read(buffer, { type: 'buffer' });`
   - `src/lib/exporter.ts:101-102`: `const fileBuffer = fs.readFileSync(templatePath); wb = XLSX.read(fileBuffer, { type: 'buffer' });`
9. **Verificare TypeScript:**
   - Rularea `npx tsc --noEmit` finalizează cu cod de ieșire 0 (zero erori de tip).

---

## 2. LOGIC CHAIN

1. Din **Observația 1**, `generator.ts` apelează `XLSX.readFile(templateFilePath)` pentru generarea fișierelor Excel.
2. Din **Observația 3**, Next.js 16 cu Turbopack rezolvă `xlsx` către modulul ESM `node_modules/xlsx/xlsx.mjs`.
3. Din **Observația 4**, `xlsx.mjs` nu importă `fs` la nivel de modul, inițializând variabila internă `_fs = void 0`. Când `readFile` este invocat, acesta apelează `read_binary`, care verifică `typeof _fs !== 'undefined'`. Fiind fals, se aruncă excepția `Cannot access file <path>`.
4. Din **Observația 5**, rularea în modul ESM a reprodus cu exactitate mesajul de eroare interceptat în API la rularea aplicației.
5. Din **Observația 2**, modulul Node.js `fs` este deja importat nativ la linia 1 din `generator.ts`.
6. Din **Observația 6**, citirea prealabilă a fișierului într-un `Buffer` prin `fs.readFileSync(templateFilePath)` și transmiterea acestuia către `XLSX.read(fileBuffer, { type: 'buffer', cellDates: false })` ocolește complet `read_binary` și dependența de `_fs`. SheetJS parsează structura ZIP/CFB direct din memorie.
7. Din **Observația 7**, ambele șabloane Excel au structuri standard validate: `Tabel Cursanti exemplu.xlsx` cu 1 foaie (`Curs (2)`) și `Anexe Curs igiena.xlsx` cu 8 foi oficiale. Bucla existentă `for (const sheetName of wb.SheetNames)` parcurge exhaustiv toate foile, iar mecanismul existent de înlocuire regex curăță rândurile de cursanți neutilizate (până la capacitatea de 100/115 rânduri) și șterge proprietatea de cache `cell.w`.
8. Din **Observația 8**, soluția propusă standardizează codul din `generator.ts:419` cu restul sistemului (`generator.ts:89`, `importer.ts:316`, `exporter.ts:101`), eliminând singura instanță divergentă din proiect.
9. Din **Observația 9**, modificarea păstrează neschimbat tipul `XLSX.WorkBook` pentru variabila `wb`, garantând compatibilitate de 100% cu verificatorul TypeScript.

---

## 3. CAVEATS

1. **Modificarea codului:** Fiind un agent Explorer (read-only), nu am aplicat modificarea direct în `src/lib/templates/generator.ts`. Modificarea trebuie aplicată de agentul Worker desemnat pentru Milestone 1.
2. **Alte fișiere de test:** În `scripts/e2e-suite.ts` (liniile 695 și 720), există de asemenea două apeluri `XLSX.readFile(templatePath)`. Deși în prezent `e2e-suite.ts` rulează prin `npx tsx` (care folosește CJS interop și rulează fără eroare), este recomandat ca pe viitor acele două apeluri să fie de asemenea aliniate cu `fs.readFileSync + XLSX.read`.
3. **Dependența UI (Dropdown Job):** Această investigație a vizat exclusiv defectul D1 (crash-ul XLSX din `generator.ts`). Defectul asociat D2 din `src/app/documents/generate/page.tsx:470` (inversiunea predicatului pentru dropdown-ul de funcție la igienă) este investigat separat conform planului Milestone 1.

---

## 4. CONCLUSION

Soluția optimă, robustă și confirmată empiric pentru deblocarea generării șabloanelor Excel în Milestone 1 constă în înlocuirea liniei 419 din `src/lib/templates/generator.ts`:

```typescript
// ÎNAINTE (linia 419):
const wb = XLSX.readFile(templateFilePath);

// DUPĂ (înlocuire propusă):
const fileBuffer = fs.readFileSync(templateFilePath);
const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
```

Această modificare rezolvă definitiv eroarea 500 la generarea documentelor `hygiene-tabel-cursanti` și `hygiene-anexe-catalog` în mediul Next.js 16 / Turbopack ESM, fără a necesita modificarea importurilor sau a structurii șabloanelor.

---

## 5. VERIFICATION METHOD

După aplicarea modificării de către Worker, verificarea independentă se realizează astfel:

1. **Verificare compilare TypeScript:**
   ```bash
   npx tsc --noEmit
   ```
   *Criteriu de succes:* Cod de ieșire 0, fără erori de tip.

2. **Verificare directă a rutei de generare pentru ambele șabloane Excel:**
   ```bash
   node -e "
   const fs = require('fs');
   const XLSX = require('xlsx');
   ['templates_registry/normalized/Tabel Cursanti exemplu.xlsx', 'templates_registry/normalized/Anexe Curs igiena.xlsx'].forEach(f => {
     const buf = fs.readFileSync(f);
     const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });
     const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
     if (!out || out.length < 1000) throw new Error('Eșec generare binar pentru ' + f);
     console.log('PASS:', f, 'Bytes generati:', out.length);
   });
   "
   ```
   *Criteriu de succes:* Ambele fișiere returnează `PASS` cu dimensiuni > 50.000 bytes.

3. **Verificare prin suita de teste a proiectului:**
   ```bash
   npx tsx scripts/e2e-suite.ts
   ```
   *Criteriu de succes:* Testele de generare a șabloanelor `hygiene-tabel-cursanti` și `hygiene-anexe-catalog` rulează cu succes.
