# Raport de Investigație și Recomandări Tehnice: Funcționalitățile F4 și F6
**Milestone**: M1 - Template Resolver & Generator Data Integrity  
**Autor**: Explorer Subagent M1-3  
**Data**: 2026-11-10  
**Fișiere Investigate**:
- `src/app/documents/generate/page.tsx`
- `src/lib/templates/resolver.ts`
- `src/app/api/templates/[code]/fields/route.ts`
- `src/app/api/documents/generate/route.ts`
- `src/app/api/clients/[id]/route.ts`
- `src/app/api/clients/[id]/employees/route.ts`

---

## 1. Observații Directe (Evidence & Code Findings)

### 1.1. Feature 4: Trunchierea Arbitrară a Câmpurilor Manuale în UI (`generate/page.tsx`)
- **Locație exactă**: `src/app/documents/generate/page.tsx:1222-1236`
- **Cod verbatim**:
  ```tsx
  {/* Configurable / Manual Fields Grid */}
  {manualFields.length > 0 && (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
        <span>Câmpuri specifice de completat / ajustat pentru acest document:</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {manualFields.slice(0, 20).map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700 truncate" title={field.key}>
              {field.label}
            </label>
            <input
              type="text"
              value={formValues[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={`Introduceți ${field.label.toLowerCase()}...`}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  )}
  ```
- **Definirea și popularea `manualFields`**:
  În `src/app/documents/generate/page.tsx:568-571`:
  ```tsx
  const cleanFields = fields.filter((f) => !/_\d{2,3}$/.test(f.key));
  const autoCompletedCount = cleanFields.filter((f) => f.isAutocompleted).length;
  const manualFields = cleanFields.filter((f) => !f.isAutocompleted);
  const autoFields = cleanFields.filter((f) => f.isAutocompleted);
  ```
  `fields` este populat asincron prin apelul `GET /api/templates/${selectedTemplateCode}/fields?${params.toString()}` (l. 396-410).
- **Volumul real al câmpurilor statutare în șabloane**:
  - `hr-cim-model-cadru-2022` (`definitions.ts:3866-3947`): conține **69 de câmpuri** definite. Din acestea, cel puțin **41 de câmpuri** au `source: 'manual'` (clauze specifice CIM 2022: probă, durată contract, repartizare timp, preaviz, repaus, concedii suplimentare, beneficii, formare, echipamente etc.). Cu `.slice(0, 20)`, 21 de câmpuri esențiale sunt **complet invizibile** și nu pot fi completate de operator.
  - `med-fisa-solicitare-examen` (`definitions.ts:3652-3714`): conține **49 de câmpuri**, din care peste **25** sunt opțiuni manuale/bife medicale și vechimi. Câmpurile 21-25+ (inclusiv vechime în muncă, traseu profesional) sunt tăiate.
  - `med-fisa-identificare-riscuri` (`definitions.ts:3718-3800`): conține **71 de câmpuri**, din care **~50** sunt riscuri specifice postului (lucru la înălțime, zgomot, trepidații, chimici, radiații etc.). Cu `.slice(0, 20)`, peste 30 de factori de risc sunt tăiați din interfață.

---

### 1.2. Feature 6: Fallback-uri Implicite Nepermise în Resolver (`resolver.ts`)
- **Locația 1**: `src/lib/templates/resolver.ts:2043-2060` (în `resolveTemplatePlaceholders` / context loader):
  ```typescript
  const employee = ctx.employeeId
    ? (client.employees.find((e) => e.id === ctx.employeeId) ||
        (await prisma.employee.findFirst({
          where: { id: ctx.employeeId, clientId: ctx.clientId },
          include: {
            identityDocument: true,
            residenceAddress: true,
            currentJob: true,
            currentWorksite: true,
          },
        })))
    : client.employees && client.employees.length > 0
    ? client.employees[0]   // <-- BUG: dacă nu se dă employeeId, îl alege pe primul din firmă!
    : null;

  const selectedJob = employee?.currentJob || client.jobs.find((j) => j.id === ctx.jobId) || (client.jobs && client.jobs[0]) || null;
  // <-- BUG CRITIC: 
  // 1. Dacă employeeId a lipsit, employee a fost setat la employees[0], deci employee?.currentJob suprascrie jobId-ul trimis explicit de apelant!
  // 2. Dacă jobId lipsește, se alege client.jobs[0]!

  const selectedWorksite = employee?.currentWorksite || (client.worksites && client.worksites[0]) || null;
  // <-- BUG: 
  // 1. Ignoră complet ctx.worksiteId (nici măcar nu există în ctx!).
  // 2. Dacă worksiteId lipsește, alege client.worksites[0]!
  ```
- **Locația 2**: `src/lib/templates/resolver.ts:1060-1061` (în `resolveTemplateData`):
  ```typescript
  const client = context.client;
  const employee = context.employee || null;
  const job = employee?.currentJob || context.job || (client?.jobs && client.jobs[0]) || null;
  // <-- BUG: Dacă context.job și employee sunt null, cade pe client.jobs[0]
  const worksite = context.worksite || employee?.currentWorksite || (client?.worksites && client.worksites[0]) || null;
  // <-- BUG: Dacă context.worksite și employee sunt null, cade pe client.worksites[0]
  ```
- **Locația 3**: `src/lib/templates/resolver.ts:15-24` (`TemplateResolutionContext`):
  ```typescript
  export interface TemplateResolutionContext {
    templateCode: string;
    clientId: string;
    employeeId?: string;
    jobId?: string;
    // worksiteId lipsește!
    hygieneSessionId?: string;
    hygieneParticipantId?: string;
    customOverrides?: Record<string, unknown>;
    allowOfflineBlank?: boolean;
  }
  ```

---

### 1.3. Feature 6: Passthrough `worksiteId` în Rutele API Backend
- **În `src/app/api/templates/[code]/fields/route.ts:10-31`**:
  - `worksiteId` **NU** este extras din URL query parameters (`searchParams.get('worksiteId')`).
  - `worksiteId` **NU** este transmis către `resolveTemplatePlaceholders`.
- **În `src/app/api/documents/generate/route.ts:8-36`**:
  - `worksiteId` **NU** este extras din request body (`const { worksiteId } = body;`).
  - `worksiteId` **NU** este transmis către `resolveTemplatePlaceholders({ ... })`.

---

### 1.4. Feature 6: Auto-Selecție Fictivă `jobs[0]` și Lipsa Selectorului de Punct de Lucru în UI
- **În `src/app/documents/generate/page.tsx:313-317`**:
  ```typescript
  if (isJobContext && data.jobs.length > 0) {
    setSelectedJobId((prev) =>
      data.jobs.some((j: any) => j.id === prev) ? prev : data.jobs[0].id
    );
  } else {
    setSelectedJobId('');
  }
  ```
  Când se alege o firmă cu un șablon de nivel post/risc, UI-ul selectează forțat primul post (`data.jobs[0].id`), în loc să lase utilizatorul să aleagă sau să permită `''` (nesetat).
- **În `src/app/documents/generate/page.tsx`**:
  - Nu există nicio stare React pentru `worksites` sau `selectedWorksiteId`.
  - Nu există niciun dropdown pentru Punct de Lucru (`Worksite`), deși API-ul `/api/clients/[id]` returnează deja lista completă `client.worksites: { orderBy: { name: 'asc' } }`.
  - `EmployeeOption` (l. 45-64) nu conține `currentWorksiteId` / `currentWorksite`, deși `/api/clients/[id]/employees` le expune deja în payload.

---

## 2. Lanț Logic (Logic Chain)

1. **Cauza trunchierii câmpurilor manuale (F4)**:
   - Apelul `.slice(0, 20)` la linia 1222 din `generate/page.tsx` a fost introdus ca o limitare vizuală arbitrară („quick demo cap”).
   - Când `isAutocompleted: false` este semnalat sincer pentru câmpurile fără date în DB (conform R1), numărul de `manualFields` crește la 30-50 pentru șabloane precum `hr-cim-model-cadru-2022` sau fișele medicale.
   - Păstrarea `.slice(0, 20)` face imposibilă generarea unui contract de muncă legal sau a unei fișe de solicitare medicală complete din UI, deoarece câmpurile de la 21 încolo nu pot fi nici vizualizate, nici editate, nici trimise în `formValues`.

2. **Impactul eliminării simple a `.slice(0, 20)`**:
   - Dacă se elimină simplu `.slice(0, 20)`, se randează toate câmpurile (40-70 elemente).
   - Într-o grilă pe 2 coloane, 70 de câmpuri produc 35 de rânduri (~2000px înălțime).
   - Utilizatorul pierde vizibilitatea butonului de generare („Generează Document”), iar găsirea unui câmp anume (ex. „Salariu” sau „Concediu”) necesită mult scroll.
   - În plus, etichetele lungi sunt retezate cu `truncate`, iar tooltip-ul curent `title={field.key}` afișează tokenul brut (ex. `PLACEHOLDER_CONDITII_ORE_SUPLIMENTARE`) în loc de eticheta românească completă.
   - Recomandarea firească de design este adăugarea unui container cu înălțime maximă și scrollbar (`max-h-[480px] overflow-y-auto`), a unui contor clar de câmpuri, a unui filtru rapid de căutare text și marcarea clară a câmpurilor statutare obligatorii (`field.required`).

3. **Mecanismul coruperii contextului prin fallback-uri pe `[0]` (F6)**:
   - În `resolver.ts:2054-2056`: dacă documentul este generat la nivel de companie (ex. decizii numire, instruire colectivă, plan prevenire), `ctx.employeeId` este `undefined`. Resolverul atribuie automat `employee = client.employees[0]`.
   - Ulterior, la linia 2058, resolverul verifică `employee?.currentJob`. Deoarece `employee` a fost setat forțat la primul salariat, postul acestuia devine postul selectat, chiar dacă operatorul a selectat explicit un alt `jobId`!
   - Dacă niciun post nu e găsit, cade pe `client.jobs[0]`.
   - Pentru punct de lucru, resolverul cade pe `client.worksites[0]`.
   - Rezultatul este că un document de birou sau de management poate primi automat atribuții, riscuri și măsuri de la un bucătar/ospătar dacă acesta era primul post din firmă.

4. **Traseul datelor pentru `worksiteId` (F6)**:
   - Punctul de lucru determină:
     - `PLACEHOLDER_PUNCT_LUCRU`
     - `PLACEHOLDER_ADRESA_PUNCT_LUCRU`
     - `PLACEHOLDER_SECTIE_COMPARTIMENT`
     - `PLACEHOLDER_DEPARTAMENT`
     - `PLACEHOLDER_LOC_MUNCA`
   - În lanțul actual: UI nu are selector -> API `/templates/[code]/fields` și `/documents/generate` nu primesc `worksiteId` -> `TemplateResolutionContext` nu conține `worksiteId` -> `loadResolverContext` nu filtrează pe `worksiteId` -> cade pe `client.worksites[0]` -> valorile devin statice sau greșite.
   - Remedierea necesită propagarea coerentă pe 4 niveluri: UI -> Rute API -> `TemplateResolutionContext` -> Logica internă a resolverului.

---

## 3. Rezerve și Condiții Limită (Caveats)

1. **Schema Prisma `GeneratedDocument`**:
   - Modelul `GeneratedDocument` din `prisma/schema.prisma` are câmpurile `clientId`, `employeeId`, `jobId`, `eventId`, `hygieneSessionId`, dar **nu** include un câmp dedicat `worksiteId`.
   - Modificarea tabelei `GeneratedDocument` ar necesita migrare Prisma (`npx prisma db push`), care aparține fazelor de schemă. În M1, `worksiteId` trebuie să rezolve datele în `snapshotData` și tokenurile din document fără a rupe `prisma.generatedDocument.create`.
2. **Generarea Colectivă (`generate-batch`)**:
   - În generarea colectivă pe salariați (`/api/documents/generate-batch`), fiecare salariat poate avea un `currentWorksiteId` diferit. Passthrough-ul trebuie să asigure preluarea punctului de lucru individual al fiecărui salariat (`emp.currentWorksiteId || undefined`).
3. **Punct de Lucru Nespecificat**:
   - Dacă o firmă are doar sediu social fără puncte de lucru secundare declarate în baza de date (`worksites: []`), fallback-ul corect pentru adresa locului de muncă este adresa sediului social al firmei (`client.address`), iar denumirea locului de muncă devine „Sediu social” (nu text fictiv precum „Sediul Central” sau „București, Sector 1”).

---

## 4. Concluzie și Recomandări Concrete de Implementare

### 4.1. Recomandări Feature 4 (UI Manual Fields)

1. **Eliminare `.slice(0, 20)`**:
   Înlocuirea liniei 1222 din `src/app/documents/generate/page.tsx`:
   `manualFields.slice(0, 20).map((field) => ...)`  
   cu maparea directă pe toate câmpurile manuale (sau pe câmpurile filtrate prin căutare).

2. **Optimizări Ergonomice Recomandate**:
   - **Container Scrollable**: Înfășurarea grilei într-un container responsive cu scroll intern:
     `className="max-h-[460px] overflow-y-auto pr-2 divide-y divide-slate-100 border border-slate-200 rounded-lg p-3 bg-slate-50/40"`
   - **Căutare / Filtrare Instantanee**: Un input de filtrare text (`searchTerm`) când `manualFields.length > 8`, permițând operatorului să filtreze după etichetă sau cheie.
   - **Afișare Etichetă Completă**: `title={`${field.label} (${field.key})`}` pentru claritate maximă.
   - **Indicator Vizual Câmp Obligatoriu**: Dacă `field.required === true`, afișarea unui asterisc discret: `<span className="text-rose-500 font-bold ml-0.5">*</span>`.
   - **Placeholder Inteligent**: `placeholder={field.required ? 'Câmp obligatoriu...' : 'Opțional...'}`.

#### Snippet Propus pentru `src/app/documents/generate/page.tsx`:
```tsx
{/* Configurable / Manual Fields Section */}
{manualFields.length > 0 && (
  <div className="space-y-3">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
        <span>Câmpuri de completat / ajustat ({manualFields.length}):</span>
      </div>
      {manualFields.length > 8 && (
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            placeholder="Caută câmp..."
            className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>
      )}
    </div>

    <div className="max-h-[460px] overflow-y-auto pr-1 rounded-lg border border-slate-200 bg-white p-3 shadow-inner">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedManualFields.map((field) => (
          <div key={field.key} className="space-y-1">
            <label
              className="block text-[11px] font-medium text-slate-700 truncate"
              title={`${field.label} (${field.key})`}
            >
              {field.label}
              {field.required && <span className="text-rose-500 font-bold ml-1">*</span>}
            </label>
            <input
              type="text"
              value={formValues[field.key] || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={`Introduceți ${field.label.toLowerCase()}...`}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
        ))}
      </div>
      {displayedManualFields.length === 0 && (
        <div className="text-center py-4 text-xs text-slate-400">
          Niciun câmp nu corespunde căutării „{fieldFilter}”.
        </div>
      )}
    </div>
  </div>
)}
```

---

### 4.2. Recomandări Feature 6 (Context Fallbacks & Worksite Support)

#### A. În `src/lib/templates/resolver.ts`
1. **Actualizare Interfață `TemplateResolutionContext`**:
   ```typescript
   export interface TemplateResolutionContext {
     templateCode: string;
     clientId: string;
     employeeId?: string;
     jobId?: string;
     worksiteId?: string; // Adăugat
     hygieneSessionId?: string;
     hygieneParticipantId?: string;
     customOverrides?: Record<string, unknown>;
     allowOfflineBlank?: boolean;
   }
   ```
2. **Actualizare Interfață `TemplateResolutionOptions`**:
   ```typescript
   export interface TemplateResolutionOptions {
     client: any;
     employee?: any;
     worksite?: any;
     worksiteId?: string; // Adăugat
     job?: any;
     jobId?: string;
     hygieneSession?: any;
     hygieneParticipant?: any;
     customOverrides?: Record<string, unknown>;
     allowOfflineBlank?: boolean;
   }
   ```
3. **Corectare `loadResolverContext` / `resolveTemplatePlaceholders` (l. 2043-2060)**:
   ```typescript
   // Salariatul este preluat STRICT dacă a fost furnizat ctx.employeeId
   const employee = ctx.employeeId
     ? (client.employees.find((e) => e.id === ctx.employeeId) ||
         (await prisma.employee.findFirst({
           where: { id: ctx.employeeId, clientId: ctx.clientId },
           include: {
             identityDocument: true,
             residenceAddress: true,
             currentJob: true,
             currentWorksite: true,
           },
         })) || null)
     : null; // ELIMINAT fallback pe client.employees[0]!

   // Postul selectat: prioritate jobId explicit > postul salariatului > null
   const selectedJob = ctx.jobId
     ? (client.jobs.find((j) => j.id === ctx.jobId) || null)
     : (employee?.currentJob || null); // ELIMINAT fallback pe client.jobs[0]!

   // Punctul de lucru: prioritate worksiteId explicit > punctul salariatului > null
   const selectedWorksite = ctx.worksiteId
     ? (client.worksites.find((w) => w.id === ctx.worksiteId) || null)
     : (employee?.currentWorksite || null); // ELIMINAT fallback pe client.worksites[0]!
   ```
4. **Corectare `resolveTemplateData` (l. 1060-1061)**:
   ```typescript
   const client = context.client;
   const employee = context.employee || null;
   const job = context.job || (context.jobId && client?.jobs?.find((j: any) => j.id === context.jobId)) || employee?.currentJob || null;
   const worksite = context.worksite || (context.worksiteId && client?.worksites?.find((w: any) => w.id === context.worksiteId)) || employee?.currentWorksite || null;
   // ELIMINAT complet (client?.jobs && client.jobs[0]) și (client?.worksites && client.worksites[0])!
   ```
5. **Corectare Fallback-uri Tokenuri Punct de Lucru (l. 1713-1720)**:
   ```typescript
   PLACEHOLDER_ADRESA_PUNCT_LUCRU: worksite?.address || client?.address || '',
   PLACEHOLDER_PUNCT_LUCRU: worksite?.name || (client?.address ? 'Sediu social' : ''),
   PLACEHOLDER_DEPARTAMENT: worksite?.activity || '',
   PLACEHOLDER_SUBUNITATE: worksite?.name || (client?.address ? 'Sediu social' : ''),
   PLACEHOLDER_SECTIE_COMPARTIMENT: worksite?.activity || '',
   PLACEHOLDER_LOC_MUNCA: worksite?.address || client?.address || '',
   PLACEHOLDER_LOC_MUNCA_LM: worksite?.address || client?.address || '',
   PLACEHOLDER_LOC_MUNCA_LM_PSI: worksite?.address || client?.address || '',
   ```

#### B. În `src/app/api/templates/[code]/fields/route.ts`
```typescript
const { searchParams } = new URL(request.url);
const clientId = searchParams.get('clientId');
const employeeId = searchParams.get('employeeId') || undefined;
const jobId = searchParams.get('jobId') || undefined;
const worksiteId = searchParams.get('worksiteId') || undefined; // Adăugat
const hygieneSessionId = searchParams.get('hygieneSessionId') || undefined;
const hygieneParticipantId = searchParams.get('hygieneParticipantId') || undefined;

const result = await resolveTemplatePlaceholders({
  templateCode: code,
  clientId,
  employeeId,
  jobId,
  worksiteId, // Pasat
  hygieneSessionId,
  hygieneParticipantId,
});
```

#### C. În `src/app/api/documents/generate/route.ts`
```typescript
const body = await request.json();
const {
  templateCode,
  clientId,
  employeeId,
  jobId,
  worksiteId, // Extras
  hygieneSessionId,
  hygieneParticipantId,
  customFields,
  operatorName = 'Operator Intern',
} = body;

const { resolvedData } = await resolveTemplatePlaceholders({
  templateCode,
  clientId,
  employeeId,
  jobId,
  worksiteId, // Pasat
  hygieneSessionId,
  hygieneParticipantId,
  customOverrides: customFields && typeof customFields === 'object' ? customFields : {},
});
```

#### D. În `src/app/documents/generate/page.tsx`
1. **Adăugare opțiune și stare Worksite**:
   ```typescript
   interface WorksiteOption {
     id: string;
     name: string;
     address: string;
     activity?: string | null;
   }

   const [worksites, setWorksites] = useState<WorksiteOption[]>([]);
   const [selectedWorksiteId, setSelectedWorksiteId] = useState<string>('');
   ```
2. **Încărcare `worksites` la schimbarea clientului**:
   ```typescript
   fetch(`/api/clients/${selectedClientId}`)
     .then((res) => res.json())
     .then((data) => {
       if (data && Array.isArray(data.worksites)) {
         setWorksites(data.worksites);
       } else {
         setWorksites([]);
       }
       if (data && Array.isArray(data.jobs)) {
         setJobs(data.jobs);
       } else {
         setJobs([]);
       }
       // NU se mai forțează data.jobs[0].id:
       setSelectedJobId((prev) =>
         prev && data.jobs?.some((j: any) => j.id === prev) ? prev : ''
       );
     });
   ```
3. **Sincronizare cu salariatul selectat**:
   ```typescript
   useEffect(() => {
     if (selectedEmployeeId && employees.length > 0) {
       const emp = employees.find((e) => e.id === selectedEmployeeId);
       const jobId = emp?.currentJobId || (emp?.currentJob as any)?.id || '';
       setSelectedJobId(jobId);
       const wsId = (emp as any)?.currentWorksiteId || (emp as any)?.currentWorksite?.id || '';
       setSelectedWorksiteId(wsId);
     } else if (isEmployeeRequired && !selectedEmployeeId) {
       setSelectedJobId('');
       setSelectedWorksiteId('');
     }
   }, [selectedEmployeeId, employees, isEmployeeRequired]);
   ```
4. **Pasare `worksiteId` la calculul câmpurilor și la generare**:
   - În `fetch(/api/templates/.../fields)`:
     `if (selectedWorksiteId) params.append('worksiteId', selectedWorksiteId);`
   - În `body` POST `/api/documents/generate`:
     `worksiteId: selectedWorksiteId || undefined`
5. **Selector vizual în UI**:
   Dacă firma are puncte de lucru (`worksites.length > 0`), afișarea unui dropdown:
   ```tsx
   {selectedClientId && worksites.length > 0 && (
     <div className="pt-2 border-t border-slate-100">
       <label className="block text-xs font-semibold text-slate-700 mb-1">
         Punct de Lucru / Locație (opțional)
       </label>
       <select
         value={selectedWorksiteId}
         onChange={(e) => setSelectedWorksiteId(e.target.value)}
         className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
       >
         <option value="">-- Sediu social / Nespecificat --</option>
         {worksites.map((w) => (
           <option key={w.id} value={w.id}>
             {w.name} {w.address ? `(${w.address})` : ''}
           </option>
         ))}
       </select>
     </div>
   )}
   ```

---

## 5. Metodă de Verificare Independentă (Verification Method)

1. **Integritate Build & Validare Tipuri**:
   ```bash
   npm run build
   npx prisma validate
   ```
   *Criteriu de acceptare*: Build fără erori Next.js / TypeScript și schemă Prisma validă.

2. **Verificare Rezoluție Șabloane Statutare**:
   ```bash
   npx tsx scripts/test-all-templates-generation.ts
   ```
   *Criteriu de acceptare*: Toate cele 31 de șabloane se generează cu status `PASS`.

3. **Verificare Lipsă Fallback Fictiv pe `[0]`**:
   Apel de test cu `employeeId: undefined` și `jobId: undefined` pentru un document de companie:
   - Să **NU** injecteze numele salariatului `client.employees[0]`.
   - Să **NU** injecteze postul `client.jobs[0]`.
   - Câmpurile nespecificate trebuie să rezolve la `''` și să fie raportate în `missingFields` cu `approved_for_print: false`.

4. **Verificare Punct de Lucru (`worksiteId`)**:
   Apel cu `clientId = "nexus"` și `worksiteId = "punct-lucru-depozit"`:
   - Verificare că `PLACEHOLDER_PUNCT_LUCRU` și `PLACEHOLDER_ADRESA_PUNCT_LUCRU` conțin datele depozitului, nu ale primului punct sau ale sediului central.

5. **Verificare UI Manual Fields**:
   Deschidere `/documents/generate` în browser, selectare `hr-cim-model-cadru-2022`:
   - Numărul de câmpuri configurabile afișat să fie complet (>40), nu limitat la 20.
   - Câmpurile obligatorii să fie marcate vizibil cu asterisc roșu `*`.
   - Grila să aibă container cu scroll intern, fără a deplasa butonul „Generează Document” în afara ecranului rezonabil.
