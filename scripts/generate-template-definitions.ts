import fs from 'fs';
import path from 'path';

const inventoryContent = fs.readFileSync(
  path.join(process.cwd(), 'handoff', 'ssm-template-placeholder-pack', 'INVENTAR_PLACEHOLDERE.md'),
  'utf8'
);

const sections = inventoryContent.split(/^## /m).slice(1);

interface FileTokens {
  filename: string;
  tokens: string[];
}

const fileTokensList: FileTokens[] = sections.map((s) => {
  const lines = s.trim().split('\n');
  const filename = lines[0].trim();
  const tokens = lines
    .slice(1)
    .join(' ')
    .split(',')
    .map((x) => x.trim().replace(/`/g, ''))
    .filter(Boolean);
  return { filename, tokens };
});

const TEMPLATE_META_INFO: Record<string, {
  code: string;
  name: string;
  family: 'ipssm' | 'hr' | 'risk' | 'hygiene' | 'training' | 'decision';
  originalFilename: string;
  format: 'docx' | 'xlsx' | 'pdf';
  contextLevel: 'client' | 'employee' | 'job' | 'event' | 'hygiene_session';
  description: string;
  reviewer: string;
}> = {
  '11 - ALUNECARI.docx': {
    code: 'ipssm-alunecari',
    name: 'IPSSM 11 - Alunecări și împiedicări',
    family: 'ipssm',
    originalFilename: '11 - ALUNECRILOR SI MPIEDICRILOR LA LOCUL DE MUNCA.rtf.doc',
    format: 'docx',
    contextLevel: 'client',
    description: 'Instrucțiuni proprii pentru prevenirea alunecărilor și căderilor de la același nivel.',
    reviewer: 'Specialist SSM',
  },
  '12 - AUTOVEHICULE.docx': {
    code: 'ipssm-autovehicule',
    name: 'IPSSM 12 - Autovehicule și transport',
    family: 'ipssm',
    originalFilename: '12 - CIRCULAIA AUTOVEHICULELOR.doc',
    format: 'docx',
    contextLevel: 'client',
    description: 'Instrucțiuni proprii pentru exploatarea și circulația în siguranță a autovehiculelor.',
    reviewer: 'Specialist SSM',
  },
  '13 - ACTIVITATI DE BIROU.docx': {
    code: 'ipssm-birou',
    name: 'IPSSM 13 - Activități de birou și ergonomie',
    family: 'ipssm',
    originalFilename: '13 - ACTIVITATI DE BIROU.doc',
    format: 'docx',
    contextLevel: 'client',
    description: 'Instrucțiuni specifice de securitate și sănătate în muncă pentru lucrul cu ecran și activități de birou.',
    reviewer: 'Specialist SSM',
  },
  'Adeverinta participare.docx': {
    code: 'hygiene-adeverinta',
    name: 'Adeverință participare curs igienă',
    family: 'hygiene',
    originalFilename: 'Adeverinta participare.docx',
    format: 'docx',
    contextLevel: 'hygiene_session',
    description: 'Adeverință individuală de absolvire a programului de instruire privind însușirea noțiunilor fundamentale de igienă.',
    reviewer: 'Specialist SSM',
  },
  'Anexa fisa postului SSM.docx': {
    code: 'hr-anexa-fisa-post',
    name: 'Anexă la fișa postului - Atribuții SSM',
    family: 'hr',
    originalFilename: 'Anexa fisa postului SSM.docx',
    format: 'docx',
    contextLevel: 'employee',
    description: 'Anexă obligatorie cu drepturile și obligațiile salariatului în domeniul SSM conform art. 22-23 din Legea 319/2006.',
    reviewer: 'Specialist SSM',
  },
  'Anexe Curs igiena.xlsx': {
    code: 'hygiene-anexe-catalog',
    name: 'Anexe și Cataloage Curs Igienă (8 Anexe)',
    family: 'hygiene',
    originalFilename: 'Anexe Curs igiena.xlsx',
    format: 'xlsx',
    contextLevel: 'hygiene_session',
    description: 'Setul complet de 8 anexe oficiale conform Ordinului 1225/5031/2003 (cereri, decizii, cataloage, procese-verbale, tabele).',
    reviewer: 'Specialist SSM',
  },
  'Cerere angajare.pdf': {
    code: 'hr-cerere-angajare',
    name: 'Cerere de angajare (Formular PDF)',
    family: 'hr',
    originalFilename: 'Cerere angajare.pdf',
    format: 'pdf',
    contextLevel: 'employee',
    description: 'Formular interactiv PDF AcroForm pentru solicitarea încadrării în muncă a candidatului.',
    reviewer: 'Operator HR',
  },
  'Contract individual munca 2026.docx': {
    code: 'hr-cim-2026',
    name: 'Contract individual de muncă 2026',
    family: 'hr',
    originalFilename: 'Contract individual munca 2026.docx',
    format: 'docx',
    contextLevel: 'employee',
    description: 'Model-cadru de contract individual de muncă actualizat 2026 conform Codului Muncii și legislației conexe.',
    reviewer: 'Operator HR',
  },
  'DECIZII.docx': {
    code: 'decizii-angajator',
    name: 'Pachet Decizii Interne SSM ale Angajatorului',
    family: 'decision',
    originalFilename: 'DECIZII.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Set consolidat de decizii manageriale de organizare a activității de prevenire și protecție (numire lucrător desemnat, comitete, prim ajutor, etc.).',
    reviewer: 'Specialist SSM',
  },
  'Declaratie luare cunostinta RI.pdf': {
    code: 'hr-declaratie-regulament',
    name: 'Declarație luare la cunoștință Regulament Intern',
    family: 'hr',
    originalFilename: 'Declaratie luare cunostinta RI.pdf',
    format: 'pdf',
    contextLevel: 'employee',
    description: 'Formular interactiv PDF AcroForm pentru confirmarea luării la cunoștință a Regulamentului Intern al unității.',
    reviewer: 'Operator HR',
  },
  'Declaratie pe proprie raspundere CIM.pdf': {
    code: 'hr-declaratie-raspundere',
    name: 'Declarație pe proprie răspundere la angajare (CIM)',
    family: 'hr',
    originalFilename: 'Declaratie pe proprie raspundere CIM.pdf',
    format: 'pdf',
    contextLevel: 'employee',
    description: 'Formular PDF AcroForm privind deducerile personale, cumulul de funcții, stagiul de cotizare și persoanele în întreținere.',
    reviewer: 'Operator HR',
  },
  'Detaliu Tematica introductiv generala.docx': {
    code: 'training-detaliu-introductiv',
    name: 'Detaliu suport la tematica introductiv-generală',
    family: 'training',
    originalFilename: 'Detaliu la tematica instruire introductiv generala.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Ghid detaliat de conținut și teme suport pentru instruirea introductiv-generală.',
    reviewer: 'Specialist SSM',
  },
  'Detaliu Tematica loc de munca.docx': {
    code: 'training-detaliu-loc-munca',
    name: 'Detaliu suport la tematica la locul de muncă',
    family: 'training',
    originalFilename: 'Detaliu la tematica de instruire la locul de munca.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Ghid detaliat pentru instruirea la locul de muncă și instruirea periodică.',
    reviewer: 'Specialist SSM',
  },
  'EVALUAREA RISCURILOR.docx': {
    code: 'risk-evaluare',
    name: 'Dosar Evaluare a Riscurilor de Accidentare și Îmbolnăvire Profesională',
    family: 'risk',
    originalFilename: 'EVALUAREA RISCURILOR.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Raport oficial de evaluare globală a riscurilor profesionale la nivelul întreprinderii conform metodei INCDPM.',
    reviewer: 'Evaluator Risc',
  },
  'INFO dosar personal.docx': {
    code: 'hr-info-dosar',
    name: 'Informare conținut dosar personal salariat',
    family: 'hr',
    originalFilename: 'INFO dosar personal.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Opisul documentelor obligatorii din dosarul personal al salariatului.',
    reviewer: 'Operator HR',
  },
  'Informare Protectia Datelor.docx': {
    code: 'hr-gdpr-informare',
    name: 'Notă de informare prelucrare date cu caracter personal (GDPR)',
    family: 'hr',
    originalFilename: 'Informare Protectia Datelor.docx',
    format: 'docx',
    contextLevel: 'employee',
    description: 'Informarea salariaților cu privire la prelucrarea datelor personale conform Regulamentului (UE) 2016/679.',
    reviewer: 'DPO / HR',
  },
  'IP 01-10 UNIVERSALE.docx': {
    code: 'ipssm-universale',
    name: 'IPSSM 01-10 Generale / Universale',
    family: 'ipssm',
    originalFilename: '!IP 01 - 10 UNIVERSALE.doc',
    format: 'docx',
    contextLevel: 'client',
    description: 'Pachetul de instrucțiuni generale 01-10: electrosecuritate, incendiu, prim ajutor, circulație interioară.',
    reviewer: 'Specialist SSM',
  },
  'OPIS IPSSM.docx': {
    code: 'ipssm-opis',
    name: 'OPIS Instrucțiuni Proprii SSM',
    family: 'ipssm',
    originalFilename: 'OPIS IPSSM.doc',
    format: 'docx',
    contextLevel: 'client',
    description: 'Catalogul și evidența instrucțiunilor proprii de securitate a muncii aprobate la nivel de firmă.',
    reviewer: 'Specialist SSM',
  },
  'Plan actiune pericol grav si iminent.docx': {
    code: 'risk-plan-actiune-urgenta',
    name: 'Plan de acțiune în caz de pericol grav și iminent',
    family: 'risk',
    originalFilename: 'Plan actiune pericol grav si iminent.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Măsuri de urgență, evacuare și alertare conform art. 101-107 din Normele Metodologice de aplicare a Legii 319/2006.',
    reviewer: 'Specialist SSM',
  },
  'Plan de Prevenire TESA.docx': {
    code: 'risk-plan-prevenire-tesa',
    name: 'Plan de Prevenire și Protecție - Personal TESA',
    family: 'risk',
    originalFilename: 'Plan de Prevenire TESA.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Măsuri tehnice, organizatorice, igienico-sanitare și termene de realizare pentru activitățile de birou.',
    reviewer: 'Specialist SSM',
  },
  'Tabel Cursanti exemplu.xlsx': {
    code: 'hygiene-tabel-cursanti',
    name: 'Tabel evidență cursanți igienă',
    family: 'hygiene',
    originalFilename: 'Tabel Cursanti exemplu.xlsx',
    format: 'xlsx',
    contextLevel: 'hygiene_session',
    description: 'Registru electronic cu datele de identificare și participare ale cursanților la programul de igienă.',
    reviewer: 'Specialist SSM',
  },
  'Tematica introductiv generala 4h.docx': {
    code: 'training-tematica-introductiv',
    name: 'Tematică instruire introductiv-generală (4 ore)',
    family: 'training',
    originalFilename: 'Tematica de instuire introductiv generala SSM 4 h.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Programa analitică de 4 ore pentru instruirea inițială la angajare conform HG 1425/2006.',
    reviewer: 'Specialist SSM',
  },
  'Tematica loc de munca.docx': {
    code: 'training-tematica-loc-munca',
    name: 'Tematică instruire la locul de muncă și periodică',
    family: 'training',
    originalFilename: 'Tematica de instuire la locul de munca SSM.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Programa analitică specifică activității desfășurate la postul de lucru.',
    reviewer: 'Specialist SSM',
  },
  'TESA.docx': {
    code: 'ipssm-tesa',
    name: 'Fișă de Evaluare a Factorilor de Risc - Post TESA',
    family: 'risk',
    originalFilename: 'TESA.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Grilă detaliată cu cei 17 factori de risc identificați pentru postul de lucru funcționar administrativ / TESA.',
    reviewer: 'Evaluator Risc',
  },
  'Zone pericol grav si iminent.docx': {
    code: 'risk-zone-pericol',
    name: 'Evidența zonelor cu risc ridicat și specific',
    family: 'risk',
    originalFilename: 'Zone pericol grav si iminent.docx',
    format: 'docx',
    contextLevel: 'client',
    description: 'Registrul zonelor de lucru identificate ca prezentând risc ridicat sau pericol iminent și măsurile asociate.',
    reviewer: 'Specialist SSM',
  },
};

const COMMON_META: Record<string, { label: string; source: string; type: 'string' | 'date' | 'number'; defaultValue?: string | number; required?: boolean }> = {
  PLACEHOLDER_FIRMA: { label: 'Denumire firmă / Angajator', source: 'client.name', type: 'string', required: true },
  PLACEHOLDER_CUI: { label: 'Cod Unic de Înregistrare (CUI)', source: 'client.cui', type: 'string', required: true },
  PLACEHOLDER_NR_REG_COM: { label: 'Nr. Reg. Comerțului (Jxx/xxx/xxxx)', source: 'client.regCom', type: 'string', required: false },
  PLACEHOLDER_ADRESA_FIRMA: { label: 'Adresă sediu social firmă', source: 'client.address', type: 'string', required: true },
  PLACEHOLDER_ADRESA: { label: 'Adresă', source: 'client.address', type: 'string', required: true },
  PLACEHOLDER_REPREZENTANT_LEGAL: { label: 'Reprezentant Legal', source: 'client.legalRepresentative', type: 'string', required: true },
  PLACEHOLDER_CALITATE_REPREZENTANT: { label: 'Calitate reprezentant legal', source: 'client.legalRepresentativeRole', type: 'string', defaultValue: 'Administrator', required: true },
  PLACEHOLDER_TELEFON_CONTACT: { label: 'Telefon contact firmă', source: 'client.contactPhone', type: 'string', required: false },
  PLACEHOLDER_EMAIL_CONTACT: { label: 'Email contact firmă', source: 'client.contactEmail', type: 'string', required: false },
  PLACEHOLDER_ACTIVITATE_PRINCIPALA: { label: 'Activitate principală desfășurată', source: 'client.mainActivity', type: 'string', required: false },
  PLACEHOLDER_COD_CAEN: { label: 'Cod CAEN activitate', source: 'client.caenCode', type: 'string', required: false },
  PLACEHOLDER_AN_INFIINTARE: { label: 'An înființare societate', source: 'client.fiscalYear', type: 'string', defaultValue: '2020', required: false },
  PLACEHOLDER_NUMAR_LUCRATORI: { label: 'Număr total lucrători', source: 'client.employeeCount', type: 'number', defaultValue: 3, required: false },
  PLACEHOLDER_AN: { label: 'An calendaristic', source: 'meta.currentYear', type: 'number', required: true },
  PLACEHOLDER_AN_EVALUARE: { label: 'An evaluare riscuri', source: 'meta.currentYear', type: 'number', required: true },
  PLACEHOLDER_DATA_DOCUMENT: { label: 'Data documentului', source: 'meta.currentDateRo', type: 'string', required: true },
  PLACEHOLDER_DATA_APROBARE: { label: 'Data aprobării', source: 'meta.currentDateRo', type: 'string', required: true },
  PLACEHOLDER_DATA_APLICARE: { label: 'Data aplicării', source: 'meta.currentDateRo', type: 'string', required: true },
  PLACEHOLDER_DATA_DECIZIE: { label: 'Data deciziei interne', source: 'meta.currentDateRo', type: 'string', required: false },
  PLACEHOLDER_NUMAR_DOCUMENT: { label: 'Număr document / decizie', source: 'manual', type: 'string', defaultValue: '1', required: false },
  PLACEHOLDER_SPECIALIST_SSM: { label: 'Specialist / Serviciu Desemnat SSM', source: 'client.externalService', type: 'string', defaultValue: 'Ing. Popescu Ion - Specialist SSM', required: true },
  PLACEHOLDER_PRESTATOR_SSM: { label: 'Prestator servicii SSM / Formare', source: 'manual', type: 'string', defaultValue: 'SC EXPERT SSM TRAINING SRL', required: true },
  PLACEHOLDER_FURNIZOR_SSM: { label: 'Furnizor formare / igienă', source: 'manual', type: 'string', defaultValue: 'SC EXPERT SSM TRAINING SRL', required: true },
  PLACEHOLDER_CUI_PRESTATOR: { label: 'CUI prestator SSM', source: 'manual', type: 'string', defaultValue: 'RO30123456', required: false },
  PLACEHOLDER_TELEFON_PRESTATOR: { label: 'Telefon prestator SSM', source: 'manual', type: 'string', defaultValue: '0721.000.111', required: false },
  PLACEHOLDER_EMAIL_PRESTATOR: { label: 'Email prestator SSM', source: 'manual', type: 'string', defaultValue: 'contact@expertssm.ro', required: false },
  PLACEHOLDER_SITE_PRESTATOR: { label: 'Site web prestator SSM', source: 'manual', type: 'string', defaultValue: 'www.expertssm.ro', required: false },
  PLACEHOLDER_FUNCTIE_PRESTATOR: { label: 'Funcție reprezentant prestator', source: 'manual', type: 'string', defaultValue: 'Director Formare / Specialist SSM', required: false },
  PLACEHOLDER_REVIZIE_SPECIALIST_SSM: { label: 'Revizie întocmită de specialist', source: 'manual', type: 'string', defaultValue: 'Revizia 1 / 2026', required: false },
  // Salariat
  PLACEHOLDER_NUME_COMPLET: { label: 'Nume și prenume salariat', source: 'employee.fullName', type: 'string', required: true },
  PLACEHOLDER_NUME: { label: 'Nume familie salariat', source: 'employee.lastName', type: 'string', required: true },
  PLACEHOLDER_PRENUME: { label: 'Prenume salariat', source: 'employee.firstName', type: 'string', required: true },
  PLACEHOLDER_CNP: { label: 'Cod Numeric Personal (CNP)', source: 'employee.cnp', type: 'string', required: true },
  PLACEHOLDER_DATA_NASTERII: { label: 'Data nașterii salariat', source: 'employee.birthDate', type: 'string', required: true },
  PLACEHOLDER_LOCALITATE_NASTERII: { label: 'Localitate naștere', source: 'employee.birthPlace', type: 'string', required: false },
  PLACEHOLDER_JUDET_NASTERII: { label: 'Județ naștere', source: 'employee.birthCounty', type: 'string', required: false },
  // Act identitate
  PLACEHOLDER_TIP_ACT: { label: 'Tip act identitate (C.I./B.I./Pașaport)', source: 'identity.docType', type: 'string', defaultValue: 'C.I.', required: true },
  PLACEHOLDER_SERIE_ACT: { label: 'Serie act identitate', source: 'identity.series', type: 'string', required: true },
  PLACEHOLDER_NUMAR_ACT: { label: 'Număr act identitate', source: 'identity.number', type: 'string', required: true },
  PLACEHOLDER_NR_ACT: { label: 'Număr act identitate', source: 'identity.number', type: 'string', required: true },
  PLACEHOLDER_EMITENT_ACT: { label: 'Autoritate emitentă act identitate', source: 'identity.issuedBy', type: 'string', required: true },
  PLACEHOLDER_EMITENT: { label: 'Emitent act identitate', source: 'identity.issuedBy', type: 'string', required: true },
  PLACEHOLDER_DATA_EMITERII: { label: 'Data eliberării actului', source: 'identity.issueDate', type: 'string', required: true },
  PLACEHOLDER_DATA_ACT: { label: 'Data eliberării actului', source: 'identity.issueDate', type: 'string', required: true },
  PLACEHOLDER_DATA_EXPIRARII: { label: 'Data expirării actului', source: 'identity.expiryDate', type: 'string', required: false },
  // Domiciliu
  PLACEHOLDER_ADRESA_DOMICILIU: { label: 'Adresă completă domiciliu', source: 'residence.addressFull', type: 'string', required: true },
  PLACEHOLDER_JUDET_DOMICILIU: { label: 'Județ domiciliu', source: 'residence.county', type: 'string', required: true },
  PLACEHOLDER_JUDET: { label: 'Județ domiciliu', source: 'residence.county', type: 'string', required: true },
  PLACEHOLDER_LOCALITATE_DOMICILIU: { label: 'Localitate domiciliu', source: 'residence.locality', type: 'string', required: true },
  PLACEHOLDER_LOCALITATE: { label: 'Localitate domiciliu', source: 'residence.locality', type: 'string', required: true },
  PLACEHOLDER_STRADA_DOMICILIU: { label: 'Stradă domiciliu', source: 'residence.street', type: 'string', required: false },
  PLACEHOLDER_NUMAR_DOMICILIU: { label: 'Număr imobil domiciliu', source: 'residence.number', type: 'string', required: false },
  PLACEHOLDER_NR: { label: 'Număr imobil', source: 'residence.number', type: 'string', required: false },
  PLACEHOLDER_BLOC: { label: 'Bloc domiciliu', source: 'residence.building', type: 'string', required: false },
  PLACEHOLDER_SCARA: { label: 'Scară domiciliu', source: 'residence.entrance', type: 'string', required: false },
  PLACEHOLDER_ETAJ: { label: 'Etaj domiciliu', source: 'residence.floor', type: 'string', required: false },
  PLACEHOLDER_APARTAMENT: { label: 'Apartament domiciliu', source: 'residence.apartment', type: 'string', required: false },
  // CIM & Muncă
  PLACEHOLDER_FUNCTIE: { label: 'Funcție / Ocupație', source: 'job.title', type: 'string', required: true },
  PLACEHOLDER_COD_COR: { label: 'Cod COR funcție (6 cifre)', source: 'job.corCode', type: 'string', required: true },
  PLACEHOLDER_ADRESA_PUNCT_LUCRU: { label: 'Adresă punct de lucru / loc muncă', source: 'worksite.address', type: 'string', required: true },
  PLACEHOLDER_PUNCT_LUCRU: { label: 'Denumire punct de lucru', source: 'worksite.name', type: 'string', required: false },
  PLACEHOLDER_DATA_ANGAJARII: { label: 'Data angajării', source: 'employee.hireDate', type: 'string', required: true },
  PLACEHOLDER_DATA_ANGAJ: { label: 'Data angajării', source: 'employee.hireDate', type: 'string', required: true },
  PLACEHOLDER_DATA_INCEPERE: { label: 'Data începerii activității', source: 'employee.hireDate', type: 'string', required: true },
  PLACEHOLDER_DATA_SFARSIT: { label: 'Data sfârșit CIM (durată determinată)', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_ARTICOL_DURATA_DETERMINATA: { label: 'Temei durată determinată', source: 'manual', type: 'string', defaultValue: 'nedeterminată', required: false },
  PLACEHOLDER_NUMAR_CIM: { label: 'Număr contract individual de muncă', source: 'manual', type: 'string', defaultValue: '101', required: true },
  PLACEHOLDER_DATA_SEMNARE: { label: 'Data semnării CIM', source: 'meta.currentDateRo', type: 'string', required: true },
  PLACEHOLDER_PERMIS_MUNCA: { label: 'Permis de muncă (cetățeni străini)', source: 'manual', type: 'string', defaultValue: 'Nu este cazul', required: false },
  PLACEHOLDER_ORE_PE_ZI: { label: 'Număr ore de muncă pe zi', source: 'job.dailyHours', type: 'number', defaultValue: 8, required: true },
  PLACEHOLDER_PROGRAM_LUCRU: { label: 'Interval program de lucru', source: 'manual', type: 'string', defaultValue: '08:00 - 16:30', required: true },
  PLACEHOLDER_ZILE_CONCEDIU: { label: 'Zile de concediu de odihnă anual', source: 'manual', type: 'number', defaultValue: 21, required: true },
  PLACEHOLDER_SALARIU_BRUT: { label: 'Salariu de bază lunar brut (lei)', source: 'manual', type: 'string', defaultValue: '4050 lei', required: true },
  PLACEHOLDER_ALTE_DREPTURI_SALARIALE: { label: 'Alte sporuri / drepturi salariale', source: 'manual', type: 'string', defaultValue: 'Conform CCM / decizii', required: false },
  PLACEHOLDER_DATA_PLATA: { label: 'Data plății salariului', source: 'manual', type: 'string', defaultValue: '15 a fiecărei luni', required: true },
  PLACEHOLDER_ZILE_PROBA: { label: 'Durată perioadă de probă (zile)', source: 'manual', type: 'number', defaultValue: 90, required: true },
  PLACEHOLDER_ZILE_PREAVIZ_DEMISIONARE: { label: 'Zile preaviz în caz de demisie', source: 'manual', type: 'number', defaultValue: 20, required: true },
  PLACEHOLDER_DATA_CERERE: { label: 'Data cererii de angajare', source: 'employee.hireDate', type: 'string', required: true },
  PLACEHOLDER_DATA_DECLARATIE: { label: 'Data declarației', source: 'employee.hireDate', type: 'string', required: true },
  PLACEHOLDER_DATA: { label: 'Data', source: 'meta.currentDateRo', type: 'string', required: true },
  PLACEHOLDER_LOCALITATE_SEMNARE: { label: 'Localitate semnare', source: 'residence.locality', type: 'string', defaultValue: 'București', required: true },
  // Sănătate & Persoane în întreținere
  PLACEHOLDER_CASA_SANATATE: { label: 'Casa de Asigurări de Sănătate', source: 'manual', type: 'string', defaultValue: 'CASMB București', required: true },
  PLACEHOLDER_CASA_SANAT: { label: 'Casa de Sănătate', source: 'manual', type: 'string', defaultValue: 'CASMB București', required: true },
  PLACEHOLDER_TIP_PENSIE: { label: 'Tip pensie', source: 'manual', type: 'string', defaultValue: 'Nu este cazul', required: false },
  PLACEHOLDER_NUME_COMPLET_PERSOANA_01: { label: 'Nume persoană 1 în întreținere', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CNP_PERSOANA_01: { label: 'CNP persoană 1 în întreținere', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CALITATE_PERSOANA_01: { label: 'Calitate persoană 1 (copil/soț)', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CALITATE_01: { label: 'Calitate persoană 1', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CNP_01: { label: 'CNP persoană 1', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_INVALIDITATE_PERSOANA_01: { label: 'Grad invaliditate persoană 1', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_DATA_INTRETINERE_01: { label: 'Data acordării întreținerii 1', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_VENIT_PERSOANA_01: { label: 'Venit persoană 1 în întreținere', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_NUME_COMPLET_PERSOANA_02: { label: 'Nume persoană 2 în întreținere', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CNP_PERSOANA_02: { label: 'CNP persoană 2 în întreținere', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CALITATE_PERSOANA_02: { label: 'Calitate persoană 2 (copil/soț)', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CALITATE_02: { label: 'Calitate persoană 2', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_CNP_02: { label: 'CNP persoană 2', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_INVALIDITATE_PERSOANA_02: { label: 'Grad invaliditate persoană 2', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_DATA_INTRETINERE_02: { label: 'Data acordării întreținerii 2', source: 'manual', type: 'string', defaultValue: '-', required: false },
  PLACEHOLDER_VENIT_PERSOANA_02: { label: 'Venit persoană 2 în întreținere', source: 'manual', type: 'string', defaultValue: '-', required: false },
  // Risc & Evaluare
  PLACEHOLDER_EVALUATOR_RISC: { label: 'Nume evaluator riscuri profesionale', source: 'manual', type: 'string', defaultValue: 'Ing. Evaluator Risc Popescu Ion', required: true },
  PLACEHOLDER_CERTIFICAT_EVALUATOR: { label: 'Certificat atestare evaluator risc', source: 'manual', type: 'string', defaultValue: 'Certificat Seria EV nr. 4521', required: true },
  PLACEHOLDER_NIVEL_RISC_GLOBAL: { label: 'Nivel global de risc calculat', source: 'manual', type: 'string', defaultValue: '2.84 (Nivel mic spre mediu)', required: true },
  PLACEHOLDER_CONCLUZII_EVALUARE: { label: 'Concluzii evaluare riscuri', source: 'manual', type: 'string', defaultValue: 'Securitatea se încadrează în limitele legale.', required: true },
  PLACEHOLDER_NUMAR_FISA_EVALUARE: { label: 'Număr fișă evaluare', source: 'manual', type: 'string', defaultValue: 'FE-01', required: true },
  PLACEHOLDER_NUMAR_FACTORI_RISC: { label: 'Număr factori de risc', source: 'manual', type: 'number', defaultValue: 17, required: true },
  PLACEHOLDER_NUMAR_LOC_MUNCA: { label: 'Număr loc de muncă evaluat', source: 'manual', type: 'number', defaultValue: 1, required: true },
  PLACEHOLDER_NUMAR_PERSOANE_EXPUSE: { label: 'Număr persoane expuse la risc', source: 'client.employeeCount', type: 'number', defaultValue: 3, required: true },
  PLACEHOLDER_DURATA_EXPUNERII: { label: 'Durată expunere (ore/zi)', source: 'job.dailyHours', type: 'string', defaultValue: '8 ore/zi', required: true },
  PLACEHOLDER_DEPARTAMENT: { label: 'Departament / Birou', source: 'worksite.activity', type: 'string', defaultValue: 'Administrativ / TESA', required: true },
  PLACEHOLDER_REPARTITIE_RISCURI: { label: 'Repartiție factori de risc', source: 'manual', type: 'string', defaultValue: 'F1-F17 conform grilei standard', required: true },
  // Igienă & Sesiuni
  PLACEHOLDER_MODUL_IGIENA: { label: 'Modul curs igienă', source: 'hygiene.module', type: 'string', defaultValue: 'Nivelul 1 - Servicii de curățenie și alimentație', required: true },
  PLACEHOLDER_MODULE_IGIENA: { label: 'Module igienă', source: 'hygiene.module', type: 'string', defaultValue: 'Modulul I', required: true },
  PLACEHOLDER_NIVEL_IGIENA: { label: 'Nivel curs igienă', source: 'manual', type: 'string', defaultValue: 'Nivelul 1', required: true },
  PLACEHOLDER_AVIZ_MS: { label: 'Aviz Ministerul Sănătății', source: 'hygieneSession.msAuthorization', type: 'string', defaultValue: 'Aviz MS nr. 102/2024', required: true },
  PLACEHOLDER_AVIZ_ME: { label: 'Aviz Ministerul Educației', source: 'hygieneSession.meAuthorization', type: 'string', defaultValue: 'Aviz ME nr. 55/2024', required: true },
  PLACEHOLDER_DATA_AVIZ_MS: { label: 'Data avizului MS', source: 'manual', type: 'string', defaultValue: '15.01.2024', required: false },
  PLACEHOLDER_DATA_AVIZ_ME: { label: 'Data avizului ME', source: 'manual', type: 'string', defaultValue: '20.01.2024', required: false },
  PLACEHOLDER_NUMAR_AVIZ_MS: { label: 'Număr aviz MS', source: 'manual', type: 'string', defaultValue: '102', required: false },
  PLACEHOLDER_NUMAR_AVIZ_ME: { label: 'Număr aviz ME', source: 'manual', type: 'string', defaultValue: '55', required: false },
  PLACEHOLDER_DATA_SESIUNE: { label: 'Data sesiunii de curs', source: 'hygieneSession.sessionDate', type: 'string', required: true },
  PLACEHOLDER_DATA_EXAMEN: { label: 'Data susținerii examenului', source: 'hygieneSession.examDate', type: 'string', required: true },
  PLACEHOLDER_LOCATIE_EXAMEN: { label: 'Locație desfășurare examen', source: 'hygieneSession.location', type: 'string', defaultValue: 'Sediul Prestatorului', required: true },
  PLACEHOLDER_SALA_EXAMEN: { label: 'Sala de examen', source: 'manual', type: 'string', defaultValue: 'Sala Curs 1', required: false },
  PLACEHOLDER_ORA_EXAMEN: { label: 'Ora examenului', source: 'manual', type: 'string', defaultValue: '10:00', required: false },
  PLACEHOLDER_COMISIE_EXAMEN: { label: 'Membri comisie examinare', source: 'manual', type: 'string', defaultValue: 'Președinte, Membru 1, Secretar', required: true },
  PLACEHOLDER_PRESEDINTE_COMISIE: { label: 'Președinte comisie examen', source: 'manual', type: 'string', defaultValue: 'Dr. Ionescu Radu', required: true },
  PLACEHOLDER_MEMBRU_COMISIE: { label: 'Membru comisie', source: 'manual', type: 'string', defaultValue: 'As. Medical Mihai Elena', required: true },
  PLACEHOLDER_MEMBRU_COMISIE_1: { label: 'Membru comisie 1', source: 'manual', type: 'string', defaultValue: 'As. Medical Mihai Elena', required: true },
  PLACEHOLDER_MEMBRU_COMISIE_2: { label: 'Membru comisie 2', source: 'manual', type: 'string', defaultValue: 'Insp. DSP Popa Dan', required: false },
  PLACEHOLDER_SECRETAR_COMISIE: { label: 'Secretar comisie examen', source: 'manual', type: 'string', defaultValue: 'Secretar Georgescu Ana', required: true },
  PLACEHOLDER_NUMAR_DECIZIE_COMISIE: { label: 'Număr decizie numire comisie', source: 'manual', type: 'string', defaultValue: 'Decizia nr. 12/2026', required: false },
  PLACEHOLDER_NUMAR_CATALOG: { label: 'Număr catalog examen', source: 'manual', type: 'string', defaultValue: 'CAT-2026-01', required: false },
  PLACEHOLDER_DATA_CATALOG: { label: 'Data catalog examen', source: 'hygieneSession.examDate', type: 'string', required: false },
  PLACEHOLDER_NUMAR_CANDIDATI: { label: 'Număr total candidați', source: 'manual', type: 'number', defaultValue: 3, required: false },
  PLACEHOLDER_NUMAR_PREZENTI: { label: 'Număr candidați prezenți', source: 'manual', type: 'number', defaultValue: 3, required: false },
  PLACEHOLDER_NUMAR_ADMISI: { label: 'Număr candidați admiși', source: 'manual', type: 'number', defaultValue: 3, required: false },
  PLACEHOLDER_NUMAR_RESPINSI: { label: 'Număr candidați respinși', source: 'manual', type: 'number', defaultValue: 0, required: false },
  PLACEHOLDER_NUMAR_ADEVERINTA: { label: 'Număr adeverință cursant', source: 'participant.certificateNumber', type: 'string', defaultValue: '101', required: true },
  PLACEHOLDER_SERIE_ADEVERINTA: { label: 'Serie adeverință cursant', source: 'participant.certificateSeries', type: 'string', defaultValue: 'IGI', required: true },
  PLACEHOLDER_DATA_ELIBERARE: { label: 'Data eliberării adeverinței', source: 'hygieneSession.examDate', type: 'string', required: true },
  PLACEHOLDER_SERIE_NUMAR_CERTIFICAT: { label: 'Serie și număr certificat', source: 'manual', type: 'string', defaultValue: 'IGI 101', required: false },
  PLACEHOLDER_REZULTAT_EXAMEN: { label: 'Rezultat examen (Admis/Respins)', source: 'manual', type: 'string', defaultValue: 'Admis', required: false },
  PLACEHOLDER_ORDIN_APLICABIL: { label: 'Ordin ministerial aplicabil', source: 'manual', type: 'string', defaultValue: 'Ordinul MS/ME nr. 1225/5031/2003', required: false },
  PLACEHOLDER_SERIE_PV: { label: 'Serie proces-verbal examen', source: 'manual', type: 'string', defaultValue: 'PV-EX', required: false },
  PLACEHOLDER_NUMAR_PV: { label: 'Număr proces-verbal examen', source: 'hygieneSession.pvSeriesNumber', type: 'string', defaultValue: '15', required: false },
  PLACEHOLDER_DATA_PV: { label: 'Data procesului verbal', source: 'hygieneSession.examDate', type: 'string', required: false },
  PLACEHOLDER_JUDET_EXAMEN: { label: 'Județ examen', source: 'manual', type: 'string', defaultValue: 'București', required: false },
  PLACEHOLDER_LOCALITATE_EXAMEN: { label: 'Localitate examen', source: 'manual', type: 'string', defaultValue: 'București', required: false },
  PLACEHOLDER_DATA_INREGISTRARE: { label: 'Data înregistrării', source: 'meta.currentDateRo', type: 'string', required: false },
  PLACEHOLDER_DATA_EMITERE: { label: 'Data emiterii', source: 'meta.currentDateRo', type: 'string', required: false },
  PLACEHOLDER_NUMAR_INREGISTRARE_FURNIZOR: { label: 'Nr. înregistrare furnizor', source: 'manual', type: 'string', defaultValue: 'REG-1045', required: false },
  PLACEHOLDER_NUMAR_CERTIFICAT_FURNIZOR: { label: 'Nr. certificat furnizor formare', source: 'manual', type: 'string', defaultValue: 'CERT-889', required: false },
  PLACEHOLDER_CERTIFICAT_FURNIZOR: { label: 'Certificat furnizor', source: 'manual', type: 'string', defaultValue: 'Certificat seria IG nr. 889', required: false },
  PLACEHOLDER_NUMAR_FURNIZOR: { label: 'Număr imobil furnizor', source: 'manual', type: 'string', defaultValue: '12', required: false },
  PLACEHOLDER_STRADA_FURNIZOR: { label: 'Stradă sediu furnizor', source: 'manual', type: 'string', defaultValue: 'Str. Formatorilor', required: false },
  PLACEHOLDER_BLOC_FURNIZOR: { label: 'Bloc sediu furnizor', source: 'manual', type: 'string', defaultValue: 'B1', required: false },
  PLACEHOLDER_SCARA_FURNIZOR: { label: 'Scară sediu furnizor', source: 'manual', type: 'string', defaultValue: 'A', required: false },
  PLACEHOLDER_ETAJ_FURNIZOR: { label: 'Etaj sediu furnizor', source: 'manual', type: 'string', defaultValue: '2', required: false },
  PLACEHOLDER_APARTAMENT_FURNIZOR: { label: 'Apartament sediu furnizor', source: 'manual', type: 'string', defaultValue: '8', required: false },
  PLACEHOLDER_LOCALITATE_FURNIZOR: { label: 'Localitate sediu furnizor', source: 'manual', type: 'string', defaultValue: 'București', required: false },
  PLACEHOLDER_JUDET_FURNIZOR: { label: 'Județ sediu furnizor', source: 'manual', type: 'string', defaultValue: 'Sector 1', required: false },
  PLACEHOLDER_COD_POSTAL_FURNIZOR: { label: 'Cod poștal furnizor', source: 'manual', type: 'string', defaultValue: '010101', required: false },
  PLACEHOLDER_ACT_REPREZENTANT: { label: 'Act numire reprezentant furnizor', source: 'manual', type: 'string', defaultValue: 'Decizia AGA nr. 1/2020', required: false },
  PLACEHOLDER_REPREZENTANT_PRESTATOR: { label: 'Nume reprezentant prestator', source: 'manual', type: 'string', defaultValue: 'Director General Popa Ion', required: false },
  PLACEHOLDER_AUTORITATE_EMITENTA: { label: 'Autoritate emitentă aviz', source: 'manual', type: 'string', defaultValue: 'DSP București', required: false },
};

function formatKeyLabel(key: string): string {
  return key
    .replace(/^PLACEHOLDER_/, '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function generateDefinitionsTs(): string {
  const catalogEntries: string[] = [];

  for (const ft of fileTokensList) {
    const meta = TEMPLATE_META_INFO[ft.filename];
    if (!meta) {
      console.warn('Missing meta for filename:', ft.filename);
      continue;
    }

    // For XLSX templates with repetitive indexed rows (e.g. _001 ... _195),
    // extract distinct base tokens so definitions stay compact and manageable,
    // plus representative participant fields.
    const isXlsx = ft.filename.endsWith('.xlsx');
    const distinctTokens = isXlsx
      ? [...new Set(ft.tokens.map((t) => t.replace(/_\d{2,3}$/, '')))]
      : ft.tokens;

    const fieldsDefs = distinctTokens.map((token) => {
      const known = COMMON_META[token];
      const label = known?.label || formatKeyLabel(token);
      const source = known?.source || 'manual';
      const required = known?.required ?? false;
      const type = known?.type || 'string';
      const defaultValue = known?.defaultValue !== undefined ? JSON.stringify(known.defaultValue) : undefined;

      return `      {
        key: '${token}',
        label: '${label.replace(/'/g, "\\'")}',
        source: '${source}',
        required: ${required},
        type: '${type}',
        ${defaultValue !== undefined ? `defaultValue: ${defaultValue},` : ''}
      }`;
    });

    catalogEntries.push(`  {
    code: '${meta.code}',
    name: '${meta.name.replace(/'/g, "\\'")}',
    family: '${meta.family}',
    originalFilename: '${meta.originalFilename}',
    normalizedFilename: '${ft.filename}',
    format: '${meta.format}',
    contextLevel: '${meta.contextLevel}',
    status: 'mapped',
    version: 2,
    description: '${meta.description.replace(/'/g, "\\'")}',
    reviewer: '${meta.reviewer}',
    fields: [
${fieldsDefs.join(',\n')}
    ],
  }`);
  }

  return `// Auto-generated synchronized template definitions for the 25 official templates
// Based on /handoff/ssm-template-placeholder-pack/INVENTAR_PLACEHOLDERE.md

export interface TemplateFieldDef {
  key: string;
  label: string;
  source: string; // e.g. "client.name", "employee.lastName", "job.title", "manual"
  required: boolean;
  type: 'string' | 'date' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
  formatter?: 'date_ro' | 'uppercase' | 'cnp_mask' | 'currency' | 'address_full';
  description?: string;
}

export interface TemplateCollectionDef {
  key: string;
  label: string;
  source: string; // e.g. "employees", "riskItems", "preventionMeasures", "hygieneParticipants"
  fields: TemplateFieldDef[];
}

export interface TemplateDefinition {
  code: string;
  name: string;
  family: 'ipssm' | 'hr' | 'risk' | 'hygiene' | 'training' | 'decision';
  originalFilename: string;
  normalizedFilename: string;
  format: 'docx' | 'xlsx' | 'pdf';
  contextLevel: 'client' | 'employee' | 'job' | 'event' | 'hygiene_session';
  status: 'inventory' | 'normalized' | 'mapped' | 'review' | 'active' | 'archived';
  version: number;
  description: string;
  reviewer: string;
  fields: TemplateFieldDef[];
  collections?: TemplateCollectionDef[];
}

export const TEMPLATE_CATALOG: TemplateDefinition[] = [
${catalogEntries.join(',\n')}
];
`;
}

const outputPath = path.join(process.cwd(), 'src', 'lib', 'templates', 'definitions.ts');
fs.writeFileSync(outputPath, generateDefinitionsTs());
console.log('Successfully wrote', outputPath);
