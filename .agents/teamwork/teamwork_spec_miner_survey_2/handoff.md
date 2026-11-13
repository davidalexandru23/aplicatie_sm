# RAPORT DE PREDARE (HANDOFF) — INVESTIGAȚIE R4, R5, R6

**State Folder**: `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_spec_miner_survey_2`  
**Data**: 2026-11-10  
**Autor**: `teamwork_spec_miner_survey_2`  
**Destinatar**: Orchestrator / Lead Builder (`d287b30b-739f-427e-8985-e19be14359eb`)

---

## 1. OBSERVATION

1. **R4: Înlocuirea Datelor Reale de Instruire cu `hireDate` și Ignorarea Evenimentelor Periodice**:
   - În `src/lib/templates/resolver.ts` (l. 1747-1758):
     ```typescript
     PLACEHOLDER_DATA_INSTRUIRE_IG: hireDateRo,
     PLACEHOLDER_DATA_INSTRUIRE_LM: hireDateRo,
     PLACEHOLDER_DATA_ADMITERE: hireDateRo,
     ...
     PLACEHOLDER_DATA_INSTRUCTAJ_IG_PSI: hireDateRo,
     PLACEHOLDER_DATA_INSTRUCTAJ_LM_PSI: hireDateRo,
     PLACEHOLDER_DATA_ADMITERE_PSI: hireDateRo,
     ```
   - În `src/lib/templates/resolver.ts` (l. 1310-1312 și 1363-1365):
     ```typescript
     const ssmEvents = ((client?.trainingEvents || []) as any[]).filter(
       (e: any) => !e.type || e.type === 'ssm'
     );
     ...
     const psiEvents = ((client?.trainingEvents || []) as any[]).filter(
       (e: any) => e.type === 'psi' || e.type === 'su'
     );
     ```
     În timp ce în `src/app/api/trainings/record/route.ts` (l. 27), tipurile consemnate sunt `['INTRODUCTIV', 'LOC_MUNCA', 'PERIODIC_SSM', 'PERIODIC_PSI']`. Drept urmare, `ssmEvents` și `psiEvents` sunt întotdeauna goale, iar tabelele periodice din fișe nu se populează cu evenimentele reale.
   - În `src/app/api/trainings/record/route.ts` (l. 43-50):
     ```typescript
     if (parsedDate.getTime() > endOfToday.getTime()) {
       return NextResponse.json(
         { error: 'Data instruirii nu poate fi în viitor.' },
         { status: 400 }
       );
     }
     ```
     Iar în `src/components/training-planner-modal.tsx` (l. 354): `max={new Date().toISOString().split('T')[0]}`.
   - În `src/app/documents/generate/page.tsx` (l. 88, 1280) și `src/app/api/documents/generate-batch/route.ts` (l. 146-168):
     Dacă `ssmTraining.status === 'OVERDUE'`, salariatul este marcat `isExpired = true`, dezactivând generarea în UI și returnând `HTTP 422` în batch.

2. **R5: Tabele EIP Active în Baza de Date, dar Lipsă Totală de Rute API și UI**:
   - `prisma/schema.prisma` (l. 624-658): modelele `EipItem`, `JobEipRequirement` și `EmployeeEipAssignment` sunt definite.
   - Rularea interogării Node în Postgres a confirmat: `eipItems: 8`, `jobEip: 8`, `empEip: 0`.
   - `find src/app/api -type f | grep eip`: 0 rezultate. Nu există rute pentru gestionarea EIP.
   - În `src/lib/templates/resolver.ts` (l. 450-545, 1658-1660, 1673-1712): mărimi corporale mock (`shoeSize || '42'`, `clothingSize || 'L'`, `gloveSize || '9'`) și tabel de 10 echipamente hardcodat static, fără a interoga `JobEipRequirement` sau `EmployeeEipAssignment`.

3. **R6: Tabele de Evaluare a Riscurilor Neutilizate și Lipsă CRUD**:
   - `prisma/schema.prisma` (l. 348-418): `RiskAssessment`, `RiskItem`, `PreventionMeasure`, `HazardZone` există în schemă.
   - Interogarea bazei de date a arătat: `risks: 0`.
   - În `src/app/risk-assessments/page.tsx` (l. 69-76): pagina este read-only; dacă `assessments.length === 0`, afișează un simplu text informativ fără opțiune de creare dosar.
   - `find src/app/api -type f | grep -E '(risk)'`: 0 rute API pentru evaluări de risc.
   - În `src/lib/templates/resolver.ts` (l. 1408-1445): Planul de prevenire se generează exclusiv din `caen-risk-presets.ts`, având `termen: 'Permanent'` și `responsabil: 'CLM / Lucrător desemnat SSM'` hardcodate static.
   - Pe modelul `Job` (l. 172-177): câmpurile `isFoodHandling`, `isScreenWork`, `workPosture`, `maxWeightKg`, `noiseExposed` există în Prisma, dar nu există rute API sau componente UI pentru a le configura.

---

## 2. LOGIC CHAIN

1. **R4 (Instruiri)**:
   - *Premisă*: Legislația (HG 1425/2006 și OMAI 712/2005) prevede că fișa individuală consemnează data exactă la care s-a efectuat instruirea IG / LM, iar tabelul multianual ține evidența sesiunilor periodice.
   - *Constatare*: `resolver.ts` substituie data cu `hireDate` și filtrează după șiruri care nu coincid cu tipurile salvate de API.
   - *Deducție*: Salariații au în documente date false de instruire (data angajării), iar sesiunile periodice consemnate nu apar în fișe.
   - *Soluție*: Conectarea `resolver.ts` la relațiile `employee.trainingParticipants.event`, normalizarea verificării tipurilor și eliminarea blocajului de generare la expirare.

2. **R5 (EIP)**:
   - *Premisă*: HG 1048/2006 impune ca fișa individuală de dotare EIP să reflecte echipamentele necesare postului și predate efectiv salariatului, la mărimile acestuia.
   - *Constatare*: Modelele EIP există în DB, dar resolverul folosește un dicționar static mock și mărimi hardcodate 42/L/9, iar rutele API și UI lipsesc complet.
   - *Deducție*: Sistemul nu oferă suport operațional pentru EIP și generează documente cu date fictive.
   - *Soluție*: Implementarea rutelor API (`/api/eip/...`), a componentelor UI de vizualizare/atribuire și conectarea resolverului la `EmployeeEipAssignment` și `JobEipRequirement`.

3. **R6 (Evaluare Riscuri)**:
   - *Premisă*: Legea 319/2006 art. 12-13 cere ca planul de prevenire să conțină termene și persoane responsabile concrete, adaptate unității.
   - *Constatare*: Tabelele `RiskAssessment` și `PreventionMeasure` au 0 rute API și 0 înregistrări în DB; resolverul folosește preseturi cu responsabili și termene statice ("CLM", "Permanent"). Postul `Job` are flaguri de risc neconfigurabile în UI.
   - *Deducție*: Evaluările de risc și planurile de prevenire emise nu sunt personalizate pentru client și nu pot fi salvate în DB.
   - *Soluție*: Crearea CRUD-ului `/api/risk-assessments`, formular de editare posturi cu flaguri de risc în `/clients/[id]`, și preluarea măsurilor din DB în resolver.

---

## 3. CAVEATS

1. Șabloanele DOCX pentru procesele-verbale colective `ssm-pv-instruire-colectiva` și `psi-pv-instruire` nu au fost găsite ca fișiere fizice distincte în `templates_registry/normalized/`. Ele trebuie generate fie prin scriptul de șabloane (conform arhitecturii din `scripts/create_m2_templates.ts`), fie printr-un generator dinamic DOCX dedicat sesiunilor de instruire.
2. În baza de date curentă, clienții demo nu au încă dosare de `RiskAssessment` persistate; la implementare, se recomandă ca fluxul de creare să poată inițializa dosarul pornind de la preseturile CAEN existente, permițând apoi personalizarea termenelor și a responsabililor.
3. Excludere expresă: conform cerinței din `ORIGINAL_REQUEST.md`, modulul "Arhivă Documente" / încărcarea scanurilor semnate rămâne exclus din sarcină.

---

## 4. CONCLUSION

Cerințele R4, R5 și R6 au fost complet mapate. Baza de date este pregătită din punct de vedere structural, iar raportul complet `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_spec_miner_survey_2/survey_report.md` conține specificația tehnică exhaustivă pentru fiecare fișier, rută, model și componentă necesară constructorilor pentru implementare.

---

## 5. VERIFICATION METHOD

1. **Verificare Schemă Prisma**:
   ```bash
   npx prisma validate
   ```
2. **Verificare Existență Tabele EIP și Riscuri**:
   ```bash
   node -e 'const { PrismaClient } = require("@prisma/client"); const p = new PrismaClient(); Promise.all([p.eipItem.count(), p.jobEipRequirement.count(), p.riskAssessment.count(), p.trainingEvent.count()]).then(([e, j, r, t]) => { console.log({ eipItems: e, jobEip: j, risks: r, trainingEvents: t }); p.$disconnect(); });'
   ```
3. **Verificare Linii Hardcodate în Resolver**:
   ```bash
   grep -n -E '(hireDateRo|PLACEHOLDER_MARIME_INCALTAMINTE|termen: .Permanent.)' src/lib/templates/resolver.ts
   ```
4. **Inspectare Raport Complet**:
   Fișierul `/Users/davidalexandru/Documents/Proiect_SSM/.agents/teamwork/teamwork_spec_miner_survey_2/survey_report.md`.
