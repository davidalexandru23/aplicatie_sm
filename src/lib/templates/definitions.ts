export interface TemplateFieldDef {
  key: string;
  label: string;
  source: string; // e.g. "client.name", "employee.lastName", "job.title"
  required: boolean;
  type: 'string' | 'date' | 'number' | 'boolean';
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
  // ----------------------------------------------------
  // 1. IPSSM (Instrucțiuni Proprii SSM)
  // ----------------------------------------------------
  {
    code: 'ipssm-opis',
    name: 'OPIS Instrucțiuni Proprii SSM',
    family: 'ipssm',
    originalFilename: 'OPIS IPSSM.doc',
    normalizedFilename: 'OPIS IPSSM.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Index dinamic al instrucțiunilor proprii SSM aplicabile clientului',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'current_year', label: 'An curent', source: 'meta.currentYear', required: true, type: 'number' },
      { key: 'date_ro', label: 'Data emiterii', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
    collections: [
      {
        key: 'instructions',
        label: 'Listă Instrucțiuni Aprobate',
        source: 'ipssm_list',
        fields: [
          { key: 'code', label: 'Cod IPSSM', source: 'item.code', required: true, type: 'string' },
          { key: 'title', label: 'Titlu instrucțiune', source: 'item.title', required: true, type: 'string' },
        ],
      },
    ],
  },
  {
    code: 'ipssm-universale',
    name: 'IPSSM 01-10 Generale / Universale',
    family: 'ipssm',
    originalFilename: '!IP 01 - 10 UNIVERSALE.doc',
    normalizedFilename: 'IP 01-10 UNIVERSALE.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Pachetul de instrucțiuni generale 01-10 (electrosecuritate, incendiu, prim ajutor, etc.)',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Nume administrator / aprobator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data aprobării', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'ipssm-alunecari',
    name: 'IPSSM 11 - Prevenirea alunecărilor și împiedicărilor',
    family: 'ipssm',
    originalFilename: '11 - ALUNECRILOR SI MPIEDICRILOR LA LOCUL DE MUNCA.rtf.doc',
    normalizedFilename: '11 - ALUNECARI.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Instrucțiune de lucru pentru prevenirea riscurilor de alunecare și împiedicare',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'ipssm-autovehicule',
    name: 'IPSSM 12 - Circulația autovehiculelor',
    family: 'ipssm',
    originalFilename: '12 - CIRCULAIA AUTOVEHICULELOR.doc',
    normalizedFilename: '12 - AUTOVEHICULE.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Instrucțiune specifică pentru salariații care utilizează vehicule în interes de serviciu',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'ipssm-birou',
    name: 'IPSSM 13 - Activități de birou',
    family: 'ipssm',
    originalFilename: '13 - ACTIVITATI DE BIROU.doc',
    normalizedFilename: '13 - ACTIVITATI DE BIROU.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Instrucțiuni de securitate pentru personalul cu activitate de birou (ergonomie, ecrane)',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'ipssm-tesa',
    name: 'Ghid de instruire TESA',
    family: 'ipssm',
    originalFilename: 'TESA.doc',
    normalizedFilename: 'TESA.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Pachet specific de instruire și descriere a procesului de muncă pentru personalul TESA',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data aprobării', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },

  // ----------------------------------------------------
  // 2. TEMATICI INSTRUIRE (Training)
  // ----------------------------------------------------
  {
    code: 'training-tematica-introductiv',
    name: 'Tematică instruire introductiv-generală (4 ore)',
    family: 'training',
    originalFilename: 'Tematica de instuire introductiv generala SSM 4 h.docx',
    normalizedFilename: 'Tematica introductiv generala 4h.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Programul și tematica legală pentru instruirea introductiv-generală conform HG 1425/2006',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'cui', label: 'CUI', source: 'client.cui', required: true, type: 'string' },
      { key: 'duration_hours', label: 'Durată (ore)', source: 'event.durationHours', required: true, type: 'number' },
    ],
  },
  {
    code: 'training-detaliu-introductiv',
    name: 'Detaliu suport la tematica introductiv-generală',
    family: 'training',
    originalFilename: 'Detaliu la tematica instruire introductiv generala.docx',
    normalizedFilename: 'Detaliu Tematica introductiv generala.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Material explicativ detaliat pentru efectuarea instruirii introductiv-generale',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
    ],
  },
  {
    code: 'training-tematica-loc-munca',
    name: 'Tematică instruire la locul de muncă',
    family: 'training',
    originalFilename: 'Tematica de instuire la locul de munca SSM.docx',
    normalizedFilename: 'Tematica loc de munca.docx',
    format: 'docx',
    contextLevel: 'job',
    status: 'mapped',
    version: 1,
    description: 'Tematica aplicată specific pe post și punct de lucru pentru faza 2 de instruire',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'job_title', label: 'Funcție / post', source: 'job.title', required: true, type: 'string' },
      { key: 'worksite_name', label: 'Punct de lucru', source: 'worksite.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
    ],
  },
  {
    code: 'training-detaliu-loc-munca',
    name: 'Detaliu suport la tematica instruirii la locul de muncă',
    family: 'training',
    originalFilename: 'Detaliu la Tematica instruire la locul de munca.docx',
    normalizedFilename: 'Detaliu Tematica loc de munca.docx',
    format: 'docx',
    contextLevel: 'job',
    status: 'mapped',
    version: 1,
    description: 'Suportul didactic și descrierea riscurilor pe post pentru instruirea la locul de muncă',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'job_title', label: 'Funcție / post', source: 'job.title', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
    ],
  },

  // ----------------------------------------------------
  // 3. DECIZII ANGAJATOR
  // ----------------------------------------------------
  {
    code: 'decizii-angajator',
    name: 'Pachet Decizii Organizare SSM a Angajatorului',
    family: 'decision',
    originalFilename: 'DECIZII NOU .docx',
    normalizedFilename: 'DECIZII.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Deciziile interne privind periodicitatea instruirii, persoanele desemnate și responsabilitățile SSM',
    reviewer: 'Specialist SSM / Juridic',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'cui', label: 'CUI', source: 'client.cui', required: true, type: 'string' },
      { key: 'reg_com', label: 'Nr. Reg. Comerțului', source: 'client.regCom', required: false, type: 'string' },
      { key: 'address', label: 'Sediu social', source: 'client.address', required: true, type: 'string' },
      { key: 'legal_rep', label: 'Reprezentant legal', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'decision_number', label: 'Număr decizie', source: 'meta.decisionNumber', required: true, type: 'string' },
      { key: 'decision_date', label: 'Data deciziei', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },

  // ----------------------------------------------------
  // 4. DOCUMENTE HR & NOMINALE
  // ----------------------------------------------------
  {
    code: 'hr-anexa-fisa-post',
    name: 'Anexă SSM la fișa de post',
    family: 'hr',
    originalFilename: 'Anexa fisa postului SSM.docx',
    normalizedFilename: 'Anexa fisa postului SSM.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Anexa cuprinzând atribuțiile și răspunderile în domeniul SSM specifice postului salariatului',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'employee_name', label: 'Nume complet salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'job_title', label: 'Funcție / post', source: 'employee.jobTitle', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data emiterii', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'hr-cerere-angajare',
    name: 'Cerere de angajare',
    family: 'hr',
    originalFilename: 'Cerere angajare.pdf',
    normalizedFilename: 'Cerere angajare.pdf',
    format: 'pdf',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Formularul nominal tipizat de solicitare a angajării',
    reviewer: 'Consultant HR',
    fields: [
      { key: 'client_name', label: 'Societate', source: 'client.name', required: true, type: 'string' },
      { key: 'employee_name', label: 'Nume și prenume', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'address_full', label: 'Domiciliu complet', source: 'employee.addressFull', required: true, type: 'string' },
      { key: 'doc_series', label: 'Serie CI', source: 'employee.docSeries', required: false, type: 'string' },
      { key: 'doc_number', label: 'Număr CI', source: 'employee.docNumber', required: true, type: 'string' },
      { key: 'doc_issued_by', label: 'Eliberat de', source: 'employee.docIssuedBy', required: false, type: 'string' },
      { key: 'doc_issue_date', label: 'Data eliberării', source: 'employee.docIssueDateRo', required: false, type: 'string' },
      { key: 'job_title', label: 'Funcția solicitată', source: 'employee.jobTitle', required: true, type: 'string' },
      { key: 'hire_date', label: 'Data începere', source: 'employee.hireDateRo', required: true, type: 'string' },
      { key: 'legal_rep', label: 'Reprezentant legal', source: 'client.legalRepresentative', required: true, type: 'string' },
    ],
  },
  {
    code: 'hr-declaratie-regulament',
    name: 'Declarație luare la cunoștință Regulament Intern',
    family: 'hr',
    originalFilename: 'Declaratie luat la cunost. Regulament Intern.pdf',
    normalizedFilename: 'Declaratie luare cunostinta RI.pdf',
    format: 'pdf',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Confirmarea de primire și luare la cunoștință a RI, CIM și Fișei Postului',
    reviewer: 'Consultant HR',
    fields: [
      { key: 'employee_name', label: 'Nume și prenume', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'locality', label: 'Localitate domiciliu', source: 'employee.locality', required: true, type: 'string' },
      { key: 'street', label: 'Stradă', source: 'employee.street', required: true, type: 'string' },
      { key: 'street_number', label: 'Număr stradă', source: 'employee.streetNumber', required: true, type: 'string' },
      { key: 'building', label: 'Bloc', source: 'employee.building', required: false, type: 'string' },
      { key: 'entrance', label: 'Scara', source: 'employee.entrance', required: false, type: 'string' },
      { key: 'floor', label: 'Etaj', source: 'employee.floor', required: false, type: 'string' },
      { key: 'apartment', label: 'Apartament', source: 'employee.apartment', required: false, type: 'string' },
      { key: 'county', label: 'Sector / Județ', source: 'employee.county', required: true, type: 'string' },
      { key: 'doc_series', label: 'Serie CI', source: 'employee.docSeries', required: false, type: 'string' },
      { key: 'doc_number', label: 'Număr CI', source: 'employee.docNumber', required: true, type: 'string' },
      { key: 'doc_issued_by', label: 'Eliberat de', source: 'employee.docIssuedBy', required: false, type: 'string' },
      { key: 'doc_issue_date', label: 'Data eliberării', source: 'employee.docIssueDateRo', required: false, type: 'string' },
      { key: 'cnp', label: 'CNP', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'client_name', label: 'Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'hr-declaratie-raspundere',
    name: 'Declarație pe proprie răspundere la angajare (pensie, funcție de bază, deduceri)',
    family: 'hr',
    originalFilename: 'Declaratie pe propie raspundere contract de munca.pdf',
    normalizedFilename: 'Declaratie pe proprie raspundere CIM.pdf',
    format: 'pdf',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Declarație salariat privind deducerea personală, cumul de funcții și pensie',
    reviewer: 'Consultant HR',
    fields: [
      { key: 'employee_name', label: 'Nume și prenume', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'doc_series', label: 'Serie CI', source: 'employee.docSeries', required: false, type: 'string' },
      { key: 'doc_number', label: 'Număr CI', source: 'employee.docNumber', required: true, type: 'string' },
      { key: 'doc_issued_by', label: 'Eliberat de', source: 'employee.docIssuedBy', required: false, type: 'string' },
      { key: 'doc_issue_date', label: 'Data eliberării', source: 'employee.docIssueDateRo', required: false, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'hr-cim-2026',
    name: 'Contract Individual de Muncă (CIM Model Cadru)',
    family: 'hr',
    originalFilename: 'contract-individual-munca nou 2026.docx',
    normalizedFilename: 'Contract individual munca 2026.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Contractul individual de muncă conform Codului Muncii',
    reviewer: 'Juridic / Specialist HR',
    fields: [
      { key: 'client_name', label: 'Angajator', source: 'client.name', required: true, type: 'string' },
      { key: 'cui', label: 'CUI', source: 'client.cui', required: true, type: 'string' },
      { key: 'reg_com', label: 'Nr. Reg. Comerțului', source: 'client.regCom', required: false, type: 'string' },
      { key: 'address', label: 'Sediu social', source: 'client.address', required: true, type: 'string' },
      { key: 'legal_rep', label: 'Reprezentant legal', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'employee_name', label: 'Salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'cnp', label: 'CNP Salariat', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'address_full', label: 'Adresă domiciliu', source: 'employee.addressFull', required: true, type: 'string' },
      { key: 'doc_series', label: 'Serie act', source: 'employee.docSeries', required: false, type: 'string' },
      { key: 'doc_number', label: 'Număr act', source: 'employee.docNumber', required: true, type: 'string' },
      { key: 'job_title', label: 'Funcție / post', source: 'employee.jobTitle', required: true, type: 'string' },
      { key: 'hire_date', label: 'Data începerii activității', source: 'employee.hireDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'hr-info-dosar',
    name: 'Checklist acte dosar de personal',
    family: 'hr',
    originalFilename: 'INFO ce cuprinde dosarul de personal.docx',
    normalizedFilename: 'INFO dosar personal.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'mapped',
    version: 1,
    description: 'Checklist administrativ cu documentele obligatorii la angajare',
    reviewer: 'Consultant HR',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'employee_name', label: 'Salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'job_title', label: 'Funcție', source: 'employee.jobTitle', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },
  {
    code: 'hr-gdpr-informare',
    name: 'Informare privind protecția datelor cu caracter personal',
    family: 'hr',
    originalFilename: 'Informare Salariat Protectia Datelor model.doc',
    normalizedFilename: 'Informare Protectia Datelor.docx',
    format: 'docx',
    contextLevel: 'employee',
    status: 'review', // Rămâne în review conform cerinței specifice GDPR
    version: 1,
    description: 'Informarea salariatului conform Regulamentului (UE) 2016/679',
    reviewer: 'Responsabil DPO / Juridic',
    fields: [
      { key: 'client_name', label: 'Operator date (Firma)', source: 'client.name', required: true, type: 'string' },
      { key: 'employee_name', label: 'Salariat', source: 'employee.fullName', required: true, type: 'string' },
      { key: 'address_full', label: 'Domiciliu', source: 'employee.addressFull', required: true, type: 'string' },
      { key: 'doc_series', label: 'Serie CI', source: 'employee.docSeries', required: false, type: 'string' },
      { key: 'doc_number', label: 'Număr CI', source: 'employee.docNumber', required: true, type: 'string' },
      { key: 'cnp', label: 'CNP', source: 'employee.cnp', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
  },

  // ----------------------------------------------------
  // 5. EVALUARE DE RISC & URGENȚĂ
  // ----------------------------------------------------
  {
    code: 'risk-evaluare',
    name: 'Raport Evaluarea Riscurilor Profesionale',
    family: 'risk',
    originalFilename: 'EVALUAREA RISCURILOR.doc',
    normalizedFilename: 'EVALUAREA RISCURILOR.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Raportul complet multicapitol al evaluării de risc de accidentare și îmbolnăvire profesională',
    reviewer: 'Evaluator de risc atestat',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'cui', label: 'CUI', source: 'client.cui', required: true, type: 'string' },
      { key: 'address', label: 'Sediu social', source: 'client.address', required: true, type: 'string' },
      { key: 'evaluator_name', label: 'Nume evaluator', source: 'assessment.evaluatorName', required: true, type: 'string' },
      { key: 'year', label: 'An evaluare', source: 'meta.currentYear', required: true, type: 'number' },
    ],
    collections: [
      {
        key: 'risk_items',
        label: 'Factori de Risc Identificați',
        source: 'riskItems',
        fields: [
          { key: 'hazard', label: 'Pericol / factor de risc', source: 'item.hazard', required: true, type: 'string' },
          { key: 'riskSituation', label: 'Situație de risc', source: 'item.riskSituation', required: true, type: 'string' },
          { key: 'consequence', label: 'Consecință', source: 'item.consequence', required: true, type: 'string' },
          { key: 'riskLevel', label: 'Nivel parțial de risc', source: 'item.riskLevel', required: true, type: 'number' },
          { key: 'existingMeasures', label: 'Măsuri de securitate existente', source: 'item.existingMeasures', required: false, type: 'string' },
        ],
      },
    ],
  },
  {
    code: 'risk-plan-prevenire-tesa',
    name: 'Plan de Prevenire și Protecție (TESA / General)',
    family: 'risk',
    originalFilename: 'Plan de Prevenire TESA.doc',
    normalizedFilename: 'Plan de Prevenire TESA.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Tabelul de măsuri tehnice, organizatorice, igienico-sanitare derivat din evaluare',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'year', label: 'An', source: 'meta.currentYear', required: true, type: 'number' },
    ],
    collections: [
      {
        key: 'measures',
        label: 'Măsuri de Prevenire',
        source: 'preventionMeasures',
        fields: [
          { key: 'description', label: 'Descriere măsură', source: 'item.description', required: true, type: 'string' },
          { key: 'measureType', label: 'Tip măsură', source: 'item.measureType', required: true, type: 'string' },
          { key: 'responsiblePerson', label: 'Responsabil', source: 'item.responsiblePerson', required: true, type: 'string' },
          { key: 'deadline', label: 'Termen de realizare', source: 'item.deadline', required: true, type: 'string' },
        ],
      },
    ],
  },
  {
    code: 'risk-zone-pericol',
    name: 'Evidența zonelor cu risc ridicat și specific',
    family: 'risk',
    originalFilename: 'Zone pericol grav si iminent.docx',
    normalizedFilename: 'Zone pericol grav si iminent.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Identificarea și semnalizarea zonelor cu pericol grav și iminent la punctele de lucru',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
      { key: 'date_ro', label: 'Data', source: 'meta.currentDateRo', required: true, type: 'string' },
    ],
    collections: [
      {
        key: 'hazard_zones',
        label: 'Zone de Pericol',
        source: 'hazardZones',
        fields: [
          { key: 'zoneName', label: 'Denumire zonă', source: 'item.zoneName', required: true, type: 'string' },
          { key: 'location', label: 'Localizare', source: 'item.location', required: true, type: 'string' },
          { key: 'hazardDescription', label: 'Pericol', source: 'item.hazardDescription', required: true, type: 'string' },
          { key: 'safetyMeasures', label: 'Măsuri de securitate', source: 'item.safetyMeasures', required: true, type: 'string' },
        ],
      },
    ],
  },
  {
    code: 'risk-plan-actiune-urgenta',
    name: 'Plan de acțiune în caz de pericol grav și iminent (Urgență / Prim ajutor)',
    family: 'risk',
    originalFilename: 'Plan actiune pericol grav si iminent.docx',
    normalizedFilename: 'Plan actiune pericol grav si iminent.docx',
    format: 'docx',
    contextLevel: 'client',
    status: 'mapped',
    version: 1,
    description: 'Proceduri de intervenție rapidă, evacuare, anunțare autorități și prim ajutor',
    reviewer: 'Specialist SSM',
    fields: [
      { key: 'client_name', label: 'Denumire firmă', source: 'client.name', required: true, type: 'string' },
      { key: 'address', label: 'Adresă sediu / puncte', source: 'client.address', required: true, type: 'string' },
      { key: 'contact_phone', label: 'Telefon contact de urgență', source: 'client.contactPhone', required: true, type: 'string' },
      { key: 'administrator_name', label: 'Administrator', source: 'client.legalRepresentative', required: true, type: 'string' },
    ],
  },

  // ----------------------------------------------------
  // 6. CURSURI IGIENĂ
  // ----------------------------------------------------
  {
    code: 'hygiene-adeverinta',
    name: 'Adeverință de participare curs noțiuni fundamentale de igienă',
    family: 'hygiene',
    originalFilename: 'Adeverinta participare- model.docx',
    normalizedFilename: 'Adeverinta participare.docx',
    format: 'docx',
    contextLevel: 'hygiene_session',
    status: 'mapped',
    version: 1,
    description: 'Adeverință nominală eliberată conform Ordinului 2209/4469/2022',
    reviewer: 'Furnizor formare autorizat',
    fields: [
      { key: 'participant_name', label: 'Nume cursant', source: 'participant.fullName', required: true, type: 'string' },
      { key: 'cnp', label: 'CNP', source: 'participant.cnp', required: true, type: 'string' },
      { key: 'client_name', label: 'Angajator', source: 'participant.clientName', required: true, type: 'string' },
      { key: 'session_date', label: 'Data cursului', source: 'session.sessionDateRo', required: true, type: 'string' },
      { key: 'provider_name', label: 'Furnizor de instruire', source: 'session.providerName', required: true, type: 'string' },
      { key: 'ms_aviz', label: 'Aviz Ministerul Sănătății', source: 'session.msAuthorization', required: true, type: 'string' },
      { key: 'me_aviz', label: 'Aviz Ministerul Educației', source: 'session.meAuthorization', required: true, type: 'string' },
      { key: 'cert_number', label: 'Număr adeverință', source: 'participant.certificateNumber', required: true, type: 'string' },
    ],
  },
  {
    code: 'hygiene-anexe-catalog',
    name: 'Pachet formulare administrative curs igienă (Anexe 1-8)',
    family: 'hygiene',
    originalFilename: 'Anexe Curs igiena.xlsx',
    normalizedFilename: 'Anexe Curs igiena.xlsx',
    format: 'xlsx',
    contextLevel: 'hygiene_session',
    status: 'mapped',
    version: 1,
    description: 'Pachetul complet de evidențe oficiale (catalog curs, catalog examen, proces-verbal, registru)',
    reviewer: 'Secretar comisie examen',
    fields: [
      { key: 'provider_name', label: 'Furnizor instruire', source: 'session.providerName', required: true, type: 'string' },
      { key: 'session_date', label: 'Data sesiunii', source: 'session.sessionDateRo', required: true, type: 'string' },
      { key: 'exam_date', label: 'Data examenului', source: 'session.examDateRo', required: true, type: 'string' },
      { key: 'location', label: 'Locație examen', source: 'session.location', required: true, type: 'string' },
      { key: 'pv_number', label: 'Serie și număr proces-verbal', source: 'session.pvSeriesNumber', required: true, type: 'string' },
    ],
    collections: [
      {
        key: 'participants',
        label: 'Lista Cursanților',
        source: 'participants',
        fields: [
          { key: 'lastName', label: 'Nume', source: 'item.lastName', required: true, type: 'string' },
          { key: 'firstName', label: 'Prenume', source: 'item.firstName', required: true, type: 'string' },
          { key: 'cnp', label: 'CNP', source: 'item.cnp', required: true, type: 'string' },
          { key: 'examResult', label: 'Rezultat examen', source: 'item.examResult', required: true, type: 'string' },
        ],
      },
    ],
  },
  {
    code: 'hygiene-tabel-cursanti',
    name: 'Tabel centralizator cursanți igienă (Format import/organizare)',
    family: 'hygiene',
    originalFilename: 'Tabel Cursanti_exemplu.xls',
    normalizedFilename: 'Tabel Cursanti exemplu.xls',
    format: 'xlsx',
    contextLevel: 'hygiene_session',
    status: 'mapped',
    version: 1,
    description: 'Tabel de evidență pentru pregătirea și gruparea cursanților înainte de sesiune',
    reviewer: 'Operator cursuri',
    fields: [
      { key: 'session_date', label: 'Data sesiunii', source: 'session.sessionDateRo', required: true, type: 'string' },
      { key: 'total_participants', label: 'Număr total cursanți', source: 'session.totalParticipants', required: true, type: 'number' },
    ],
  },
];
