# Handoff Report: Document Generation Engine & Template Catalog Investigation

**Agent:** teamwork_explorer (`explorer_templates_3`)  
**Target:** Orchestrator / Implementer Agent  
**Date:** 2026-11-05T17:26:00Z  
**Reference Report:** `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_templates_3/analysis.md`

---

## 1. Observation

1. **Catalog & Disc Inspection**:
   - `src/lib/templates/definitions.ts` definește exact 31 de șabloane statutare (29 `.docx`, 2 `.xlsx`).
   - În `templates_registry/normalized/`, toate cele 31 de fișiere șablon există fizic pe disc (status: `exists: true`, permisiuni `644`, mărimi între 7.4 KB și 115.3 KB).
   - Fișierul `templates_registry/normalized/Tabel Cursanti exemplu.xlsx` există, are 52,403 bytes și conține foaia `Curs (2)` cu 1,036 de tokenuri indexate.

2. **Verbatim Error Reproductions**:
   - Apelul `POST http://localhost:3000/api/documents/generate` cu payload-ul:
     `{"templateCode":"hygiene-tabel-cursanti","clientId":"eb80cd38-7415-4284-a329-b40c5c1ea91b"}`
     returnează cu cod HTTP 500:
     ```json
     {
       "error": "Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Tabel Cursanti exemplu.xlsx"
     }
     ```
   - Apelul similar pentru `hygiene-anexe-catalog` returnează cu cod HTTP 500:
     ```json
     {
       "error": "Cannot access file /Users/davidalexandru/Documents/Proiect_SSM/templates_registry/normalized/Anexe Curs igiena.xlsx"
     }
     ```

3. **Code Inspection**:
   - În `node_modules/xlsx/xlsx.js` (SheetJS):
     - Linia 3098: `if(typeof require !== 'undefined') try { _fs = require('fs'); } catch(e) {}`
     - Linia 3162 (în funcția `read_binary`):
       ```javascript
       if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
       if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
       ...
       throw new Error("Cannot access file " + path);
       ```
   - În `src/lib/templates/generator.ts`:
     - Linia 419: `const wb = XLSX.readFile(templateFilePath);` (eșuează în Turbopack din cauza absenței `require` la nivel de modul).
     - Linia 50: `return collectUnresolvedPlaceholders(fs.readFileSync(templatePath), definition.format);` (folosește modulul nativ Node `import fs from 'fs'` și funcționează).
     - Linia 89: `const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });` (funcționează).
   - În `src/app/documents/generate/page.tsx`:
     - Linia 470: `{!isEmployeeRequired && selectedClientId && jobs.length > 0 && (`
     - Deoarece `isEmployeeRequired` este `false` pentru șabloanele de igienă (linia 161: `isHygieneTemplate`), `!isEmployeeRequired` devine `true`, forțând afișarea dropdown-ului de post chiar și pentru igienă.

4. **Generation Suite Results (All 31 Templates)**:
   - 26 din 31 de șabloane se generează cu succes (`200 OK`, `status: "approved_for_print"`, 0 missing fields).
   - 2 din 31 de șabloane eșuează cu eroare 500 (`hygiene-tabel-cursanti`, `hygiene-anexe-catalog`) exclusiv din cauza `XLSX.readFile`.
   - 3 din 31 de șabloane (`hr-anexa-fisa-post`, `hr-cim-2026`, `hr-cim-model-cadru-2022`) se generează cu `status: "missing_data"` deoarece modelul `Employee` din Prisma nu are coloane pentru `cimNumber` și `salary`, iar `generator.ts` filtrează valorile goale `""`, lăsând tokenurile brute în DOCX.

---

## 2. Logic Chain

1. **Originea erorii SheetJS**:
   - Din Obs. 3, SheetJS apelează `read_binary(path)` atunci când este apelat `XLSX.readFile(path)`.
   - În Next.js 16 (Turbopack ESM server bundle), `require` nu este definit în scopul modulului ESM, astfel că `_fs` rămâne `undefined`.
   - Neavând `_fs` și nici `Deno`, funcția `read_binary` execută direct linia 3162: `throw new Error("Cannot access file " + path)`.
   - Acest lucru explică 100% de ce fișierul fizic există pe disc, dar motorul raportează că nu îl poate accesa.

2. **Simularea fix-ului**:
   - Când fișierul este citit cu `fs.readFileSync(templateFilePath)` și parsat cu `XLSX.read(fileBuffer, { type: 'buffer' })`, `read_binary` nu este apelat deloc.
   - Testul direct a confirmat că `Tabel Cursanti exemplu.xlsx` se populează cu 0 tokenuri nerezolvate și produce un fișier valid de 57 KB.

3. **Eroarea de afișare a selectorului de Post**:
   - Din Obs. 3, condiția `!isEmployeeRequired` este adevărată pentru orice șablon care nu este strict la nivel de salariat, incluzând șabloanele de igienă (`isHygieneTemplate === true`).
   - Astfel, utilizatorul vede selectorul de post de lucru la șabloanele de igienă, unde este complet irelevant.

4. **Eroarea de status `missing_data` pe HR**:
   - Din Obs. 4, modelul Prisma `Employee` nu conține câmpurile `salary` și `cimNumber`.
   - Resolverul le evaluează la `""`.
   - `generator.ts:336` filtrează cheile cu valoare `""`, iar Docxtemplater păstrează `{PLACEHOLDER_NUMAR_CIM}` în document, pe care scannerul îl detectează la final, retrogradând documentul la `missing_data`.

---

## 3. Caveats

- Nu s-a investigat comportamentul la printare pe hârtie fizică a documentelor generate (investigația a fost exclusiv software/API/fișiere).
- Nu au fost aduse modificări directe în codul sursă conform rolului read-only de Explorer.
- Analiza presupune utilizarea versiunilor curente de Node.js (v22) și Next.js 16 din workspace.

---

## 4. Conclusion

1. **Problema principală (Eroarea `Cannot access file`) este un bug de apel de bibliotecă într-un mediu Next.js ESM**: Se rezolvă prin înlocuirea apelului `XLSX.readFile` cu `fs.readFileSync` + `XLSX.read` în `src/lib/templates/generator.ts:419`.
2. **Afișarea eronată a dropdown-ului de post pe igienă este un bug de predicat logic în UI**: Se rezolvă prin adăugarea condiției `!isHygieneTemplate` în `src/app/documents/generate/page.tsx:470`.
3. **Cele 31 de șabloane sunt 100% prezente pe disc și mapate**: 26 generează perfect (`approved_for_print`), 2 sunt deblocate de fix-ul XLSX, iar 3 necesită completarea schemei `Employee` sau tratarea liniilor de semnare offline.

---

## 5. Verification Method

Oricine poate verifica independent constatările prin următoarele comenzi:

1. **Verificare existență fișiere pe disc**:
   ```bash
   ls -la "templates_registry/normalized/Tabel Cursanti exemplu.xlsx"
   ls -la "templates_registry/normalized/Anexe Curs igiena.xlsx"
   ```
2. **Reproducere eroare 500 prin API**:
   ```bash
   curl -s -X POST http://localhost:3000/api/documents/generate \
     -H "Content-Type: application/json" \
     -d '{"templateCode":"hygiene-tabel-cursanti","clientId":"eb80cd38-7415-4284-a329-b40c5c1ea91b"}' | jq .
   ```
3. **Verificare fix prin buffer în Node**:
   ```bash
   node -e "const fs = require('fs'); const XLSX = require('xlsx'); const buf = fs.readFileSync('templates_registry/normalized/Tabel Cursanti exemplu.xlsx'); const wb = XLSX.read(buf, {type: 'buffer'}); console.log('Sheets:', wb.SheetNames);"
   ```
4. **Verificare raport detaliat**:
   Consultați `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/explorer_templates_3/analysis.md`.
