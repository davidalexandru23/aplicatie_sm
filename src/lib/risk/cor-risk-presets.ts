/**
 * ============================================================================
 * INCDPM PECE OCCUPATIONAL RISK PRESETS PER COR CODE & JOB FUNCTION
 * ============================================================================
 * 
 * Bază de date statutară de factori de risc profesional, consecințe previzibile,
 * scoruri de gravitate (1-7), probabilitate (1-6) și măsuri de prevenire (HG 1425/2006)
 * corelate direct pe Coduri COR (Clasificarea Ocupațiilor din România) și funcții comune.
 */

import { calculatePecePartialRisk, calculateGlobalRiskScore } from './caen-risk-presets';

export type RiskSubsystem = 'EXECUTANT' | 'SARCINA' | 'MIJLOACE' | 'MEDIU';

export interface CorRiskMeasurePreset {
  description: string;
  measureType: 'tehnica' | 'organizatorica' | 'igienico-sanitara' | 'alta';
  responsiblePerson: string;
  deadline: string;
}

export interface CorRiskFactorPreset {
  hazard: string;
  riskSituation: RiskSubsystem;
  consequence: string;
  severityScore: number;    // 1-7 (G)
  probabilityScore: number; // 1-6 (P)
  riskLevel: number;        // 1-7 (R via Pece matrix)
  measure: CorRiskMeasurePreset;
}

export interface CorRiskProfile {
  corCode: string;          // Cod COR principal (6 cifre)
  corGroup: string;         // Grupa minoră / de bază (4 cifre)
  title: string;            // Denumire oficială COR
  aliases: string[];        // Sinonime, titluri de post sau funcții uzuale
  description: string;
  globalRiskScore: number;  // Nivel global estimat INCDPM (<= 3.50)
  factors: CorRiskFactorPreset[];
}

function buildFactors(
  rawList: Array<{
    hazard: string;
    riskSituation: RiskSubsystem;
    consequence: string;
    severityScore: number;
    probabilityScore: number;
    measure: {
      description: string;
      measureType: 'tehnica' | 'organizatorica' | 'igienico-sanitara' | 'alta';
      responsiblePerson?: string;
      deadline?: string;
    };
  }>
): { factors: CorRiskFactorPreset[]; globalRiskScore: number } {
  const factors: CorRiskFactorPreset[] = rawList.map((item) => {
    const riskLevel = calculatePecePartialRisk(item.severityScore, item.probabilityScore);
    return {
      hazard: item.hazard,
      riskSituation: item.riskSituation,
      consequence: item.consequence,
      severityScore: item.severityScore,
      probabilityScore: item.probabilityScore,
      riskLevel,
      measure: {
        description: item.measure.description,
        measureType: item.measure.measureType,
        responsiblePerson: item.measure.responsiblePerson || 'Conducător loc de muncă',
        deadline: item.measure.deadline || 'Permanent',
      },
    };
  });

  const presetItems = factors.map((f) => ({
    element: f.riskSituation,
    riskFactor: f.hazard,
    manifestation: f.hazard,
    consequences: f.consequence,
    severity: f.severityScore,
    probability: f.probabilityScore,
    riskLevel: f.riskLevel,
    preventionMeasures: [f.measure.description],
  }));

  const globalRiskScore = calculateGlobalRiskScore(presetItems) || 2.65;
  return { factors, globalRiskScore };
}

// ============================================================================
// CATALOGUL OFICIAL DE PROFILURI DE RISC COR
// ============================================================================

export const COR_RISK_PROFILES: Record<string, CorRiskProfile> = {};

// 1. BUCĂTAR / ALIMENTAȚIE PUBLICĂ (COR 512001)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Contact accidental cu suprafețe fierbinți (plite, friteuze, cuptoare, tigăi)',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri termice de gradul I-II (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu mănuși termorezistente EN 407 și verificarea bunei funcționări a termostatelor',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator / Șef Bucătar',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Tăiere sau înțepare la manipularea cuțitelor profesionale și utilajelor de feliat/tocat',
      riskSituation: 'SARCINA',
      consequence: 'Plăgi tăiate la nivelul membrelor superioare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Instruirea privind utilizarea mănușilor din zale metalice anti-tăiere EN 388 la tranșare',
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'Trimestrial',
      },
    },
    {
      hazard: 'Alunecare pe pardoseală umedă, cu urme de grăsimi sau resturi alimentare',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii sau fracturi ale membrelor (ITM 45-180 zile)',
      severityScore: 3,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea obligatorie a încălțămintei de protecție antiderapante (clasa SRC) și degresarea zilnică a pardoselii',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Inhalarea vaporilor de grăsime arsă și expunerea la microclimat cald/umed',
      riskSituation: 'MEDIU',
      consequence: 'Afecțiuni respiratorii, astenie termică (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Verificarea și curățarea filtrelor hotelor de exhaustare la fiecare 30 de zile',
        measureType: 'tehnica',
        responsiblePerson: 'Responsabil Mentenanță',
        deadline: 'Lunar',
      },
    },
    {
      hazard: 'Efort fizic dinamic și postură ortostatică prelungită la bancul de lucru',
      riskSituation: 'SARCINA',
      consequence: 'Afecțiuni musculo-scheletice, dureri lombosacrate (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu covoare de amortizare ergonomice și alternarea sarcinilor în fluxul de preparare',
        measureType: 'tehnica',
        responsiblePerson: 'Șef Bucătar',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Contact cutanat cu detergenți concentrat corozivi la spălarea și dezinfectarea veselei',
      riskSituation: 'EXECUTANT',
      consequence: 'Dermatite de contact, arsuri chimice ușoare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea mănușilor de protecție chimică din nitril și respectarea instrucțiunilor producătorului la dozare',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Bucătar / Ajutor Bucătar',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['512001'] = {
    corCode: '512001',
    corGroup: '5120',
    title: 'Bucătar',
    aliases: ['bucatar', 'bucatar specialist', 'bucatar sef', 'ajutor bucatar', 'pizzer', 'grataragiu', 'preparator'],
    description: 'Preparare termică alimente, tranșare carne, manipulare ustensile tăietoare și utilaje HoReCa.',
    globalRiskScore,
    factors,
  };
})();

// 2. OSPĂTAR / CHELNER (COR 513102)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Alunecare și cădere la același nivel pe suprafețe umede sau lustruite în salon',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii ale articulațiilor (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu încălțăminte comodă antiderapantă și semnalizarea zonelor umede la debarasare',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Manipularea manuală a tăvilor grele cu veselă și a navetelor de băuturi',
      riskSituation: 'SARCINA',
      consequence: 'Lombalgii acute, afecțiuni ale coloanei vertebrale (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Instruirea privind manipularea ergonomică a sarcinilor și folosirea cărucioarelor de salon',
        measureType: 'organizatorica',
        responsiblePerson: 'Șef Sală / Administrator',
        deadline: 'Trimestrial',
      },
    },
    {
      hazard: 'Tăiere accidentală în cioburi la spargerea paharelor sau a veselei din sticlă/porțelan',
      riskSituation: 'MIJLOACE',
      consequence: 'Plăgi tăiate la degete și palme (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Interzicerea strângerii cioburilor cu mâna liberă; utilizarea fărașului și a mănușilor de menaj',
        measureType: 'tehnica',
        responsiblePerson: 'Ospătar / Debarasator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Suprasolicitare psihică și risc de conflict la interacțiunea cu clienți dificili',
      riskSituation: 'SARCINA',
      consequence: 'Stres acut, stare anxioasă (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Proceduri interne de de-escaladare a conflictelor și suport managerial la situații tensionate',
        measureType: 'organizatorica',
        responsiblePerson: 'Manager Restaurant',
        deadline: 'Semestrial',
      },
    },
    {
      hazard: 'Ortostatism dinamic continuu și deplasare susținută pe durata turei de lucru',
      riskSituation: 'SARCINA',
      consequence: 'Varice hidrostatice, edeme gambiere (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Asigurarea pauzelor de repaus planificate conform graficului de lucru',
        measureType: 'organizatorica',
        responsiblePerson: 'Șef de Tură',
        deadline: 'Zilnic',
      },
    },
  ]);

  COR_RISK_PROFILES['513102'] = {
    corCode: '513102',
    corGroup: '5131',
    title: 'Ospătar / Chelner',
    aliases: ['ospatar', 'chelner', 'ajutor ospatar', 'picolo', 'runner', 'somelier'],
    description: 'Servire preparate culinare și băuturi, preluare comenzi, debarasare și aranjare mese.',
    globalRiskScore,
    factors,
  };
})();

// 3. BARMAN (COR 513201)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Tăiere la manipularea sticlelor, a cuburilor de gheață și a paharelor sparte în frapieră',
      riskSituation: 'MIJLOACE',
      consequence: 'Plăgi tăiate superficiale sau profunde la degete (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Utilizarea cleștelui special pentru gheață și verificarea stării paharelor înainte de spălare',
        measureType: 'organizatorica',
        responsiblePerson: 'Barman',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Risc de electrocutare prin stropirea aparatelor electrice de bar (blender, espressor, mașină de gheață)',
      riskSituation: 'MIJLOACE',
      consequence: 'Șoc electric, arsuri prin electrocutare (ITM 45-180 zile)',
      severityScore: 3,
      probabilityScore: 2,
      measure: {
        description: 'Protejarea prizelor de bar cu carcase hidroizolante IP44 și verificare PRAM periodică',
        measureType: 'tehnica',
        responsiblePerson: 'Specialist Tehnician',
        deadline: 'Anual',
      },
    },
    {
      hazard: 'Arsuri cu apă fierbinte sau abur sub presiune la espressorul profesional de cafea',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri termice locale (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Instruirea privind purjarea corectă a vaporizatorului de abur și verificarea manometrului',
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'La angajare / Periodic',
      },
    },
    {
      hazard: 'Alunecare pe pardoseala udă din spatele barului',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii ale membrelor inferioare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Amplasarea de grătare antiderapante din cauciuc perforat în spațiul de lucru din spatele barului',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['513201'] = {
    corCode: '513201',
    corGroup: '5132',
    title: 'Barman',
    aliases: ['barman', 'barista', 'ajutor barman', 'barman preparator'],
    description: 'Preparare băuturi, operare espressor profesional, blender, manipulare sticle și veselă de bar.',
    globalRiskScore,
    factors,
  };
})();

// 4. INGINER SISTEME SOFTWARE / PROGRAMATOR (COR 251201)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Solicitare vizuală intensă la lucrul continuu cu videoterminale (> 6 ore/zi)',
      riskSituation: 'SARCINA',
      consequence: 'Astenopie acomodativă, sindrom de ochi uscat, cefalee (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Reglementarea pauzelor vizuale de 10 minute la fiecare 50 minute și utilizarea filtrelor de lumină albastră',
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă / Specialist SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Poziție statică așezat prelungită la birou și postură asimetrică',
      riskSituation: 'SARCINA',
      consequence: 'Dureri lombare, cervicalgii, sindrom de tunel carpian (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotare cu scaune ergonomice reglabile pe 3 axe cu suport lombar și birouri reglabile pe înălțime',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator / Departament IT',
        deadline: 'Anual',
      },
    },
    {
      hazard: 'Risc de electrocutare prin electrocasnice sau cabluri IT deteriorate în birouri',
      riskSituation: 'MIJLOACE',
      consequence: 'Electrocutare prin atingere directă (ITM 45-180 zile)',
      severityScore: 3,
      probabilityScore: 2,
      measure: {
        description: 'Verificarea periodică a integrității cablurilor, organizarea în canaluri de cablu și măsurători PRAM',
        measureType: 'tehnica',
        responsiblePerson: 'Responsabil Tehnic / SEPP',
        deadline: 'Semestrial',
      },
    },
    {
      hazard: 'Suprasolicitare neuropsihică la rezolvarea incidentelor critice și termene strânse de livrare',
      riskSituation: 'SARCINA',
      consequence: 'Sindrom de epuizare profesională (burnout), insomnie (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Planificarea echilibrată a sprint-urilor, rotație la suportul on-call și flexibilitate a programului',
        measureType: 'organizatorica',
        responsiblePerson: 'Team Leader / HR',
        deadline: 'Continuu',
      },
    },
    {
      hazard: 'Împiedicare sau lovire de cabluri ori mobilier de birou pe căile de circulație',
      riskSituation: 'MEDIU',
      consequence: 'Contuzii ușoare, escoriații (ITM 3-45 zile)',
      severityScore: 1,
      probabilityScore: 3,
      measure: {
        description: 'Menținerea liberă a căilor de evacuare și a spațiilor dintre birouri conform HG 1028/2006',
        measureType: 'organizatorica',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['251201'] = {
    corCode: '251201',
    corGroup: '2512',
    title: 'Inginer Sisteme Software',
    aliases: ['inginer software', 'programator', 'developer', 'software engineer', 'specialist it', 'web developer', 'frontend', 'backend', 'full stack'],
    description: 'Proiectare și dezvoltare aplicații, analiză algoritmi, utilizare videoterminale și echipamente de calcul.',
    globalRiskScore,
    factors,
  };
})();

// 5. SPECIALIST RESURSE UMANE (COR 242314)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Lucru intens cu echipamente cu ecran de vizualizare (programe pontaj, baze de date, dosare HR)',
      riskSituation: 'SARCINA',
      consequence: 'Oboseală vizuală, cefalee tensională (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Respectarea pauzelor de 10 min la ecran și asigurarea unui iluminat general de min. 500 lucși',
        measureType: 'organizatorica',
        responsiblePerson: 'Specialist SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Poziție așezat prelungită și sedentarism la birou',
      riskSituation: 'SARCINA',
      consequence: 'Afecțiuni ale coloanei lombare și cervicale (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Ajustarea înălțimii monitorului la nivelul ochilor și utilizarea suportului ergonomic pentru picioare',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Manipularea manuală a bibliorafturilor grele și a cutiilor de arhivă',
      riskSituation: 'SARCINA',
      consequence: 'Lombalgii acute, întinderi musculare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Limitarea greutății cutiilor la 10-15 kg și folosirea cărucioarelor de arhivă',
        measureType: 'organizatorica',
        responsiblePerson: 'Specialist HR',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Stres emoțional și tensiune psihică la gestionarea concedierilor, conflictelor de muncă și reclamațiilor',
      riskSituation: 'SARCINA',
      consequence: 'Stres cronic, instabilitate tensională (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Instruire privind tehnici de comunicare asertivă și medierea litigiilor de muncă',
        measureType: 'organizatorica',
        responsiblePerson: 'Director General',
        deadline: 'Anual',
      },
    },
  ]);

  COR_RISK_PROFILES['242314'] = {
    corCode: '242314',
    corGroup: '2423',
    title: 'Specialist Resurse Umane',
    aliases: ['specialist resurse umane', 'inspector resurse umane', 'hr', 'recrutor', 'hr specialist', 'responsabil personal', 'ofiter resurse umane'],
    description: 'Administrare personal, gestiune dosare salariați, recrutare, evidență instruiri și contracte.',
    globalRiskScore,
    factors,
  };
})();

// 6. TEHNICIAN MENTENANȚĂ ȘI SUPORT (COR 311305)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Atingere accidentală a conductorilor sub tensiune la intervenții în tablouri electrice și carcase de servere',
      riskSituation: 'MIJLOACE',
      consequence: 'Electrocutare, șoc electric (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 2,
      measure: {
        description: 'Utilizarea sculelor electroizolante certificate 1000V și verificarea lipsei tensiunii înainte de intervenție',
        measureType: 'tehnica',
        responsiblePerson: 'Tehnician Mentenanță',
        deadline: 'La fiecare intervenție',
      },
    },
    {
      hazard: 'Cădere de la înălțime la intervenții pe scări sau la pozarea traseelor de cabluri pe plafon',
      riskSituation: 'MEDIU',
      consequence: 'Fracturi ale membrelor, traumatisme toracice (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 2,
      measure: {
        description: 'Verificarea stabilității scării cu trepte late și asigurarea punctelor de sprijin conform normelor',
        measureType: 'organizatorica',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Manipularea manuală a echipamentelor grele (UPS-uri de server, switch-uri, unități centrale masive)',
      riskSituation: 'SARCINA',
      consequence: 'Dorsalgii, lombosciatică (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Manipularea echipamentelor de peste 20 kg obligatoriu în echipă de două persoane sau cu cărucior',
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Tăiere sau zgâriere la manipularea tablelor tăioase ale carcaselor metalice și colierelor de plastic',
      riskSituation: 'MIJLOACE',
      consequence: 'Plăgi tăiate la degete și mâini (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea mănușilor de protecție mecanică nivel minim 2 de rezistență la tăiere EN 388',
        measureType: 'tehnica',
        responsiblePerson: 'Tehnician',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Inhalarea pulberilor la curățarea echipamentelor hardware cu aer comprimat',
      riskSituation: 'MEDIU',
      consequence: 'Iritații ale căilor respiratorii superioare (ITM 3-45 zile)',
      severityScore: 1,
      probabilityScore: 4,
      measure: {
        description: 'Efectuarea curățării în spații ventilate și purtarea semimăștii de protecție respiratorie FFP2',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Tehnician Mentenanță',
        deadline: 'La curățare',
      },
    },
  ]);

  COR_RISK_PROFILES['311305'] = {
    corCode: '311305',
    corGroup: '3113',
    title: 'Tehnician Mentenanță și Suport',
    aliases: ['tehnician mentenanta', 'tehnician suport', 'tehnician it', 'helpdesk', 'tehnician hardware', 'suport tehnic', 'mentenanta calculatoare'],
    description: 'Instalare, mentenanță rețele, depanare hardware, montaj echipamente electrice și cablare structurată.',
    globalRiskScore,
    factors,
  };
})();

// 7. ASISTENT ADMINISTRATIV JUNIOR / SECRETAR (COR 334301)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Utilizarea prelungită a videoterminalelor și tastaturii în activitatea de birou',
      riskSituation: 'SARCINA',
      consequence: 'Astenopie vizuală, oboseală oculară (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Organizarea activității cu pauze regulate de 10 min la fiecare oră de tastare continuă',
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Poziție așezat prelungită pe scaun de birou',
      riskSituation: 'SARCINA',
      consequence: 'Dureri musculare în zona gâtului și a umerilor (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu scaun ergonomic de birou reglabil și instruire privind postura corectă la birou',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Împiedicare și cădere pe trepte sau pardoseli alunecoase la deplasarea între birouri',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii la nivelul gleznelor (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Montarea de benzi antiderapante pe trepte și interzicerea încălțămintei cu toc instabil',
        measureType: 'tehnica',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Tăiere superficială cu marginea foilor de hârtie la sortarea dosarelor și îndosariere',
      riskSituation: 'MIJLOACE',
      consequence: 'Mici plăgi la nivelul degetelor (ITM < 3 zile)',
      severityScore: 1,
      probabilityScore: 4,
      measure: {
        description: 'Asigurarea trusei de prim ajutor dotate cu pansamente antiseptice conform legii',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Responsabil Prim Ajutor',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['334301'] = {
    corCode: '334301',
    corGroup: '3343',
    title: 'Asistent Administrativ Junior',
    aliases: ['asistent administrativ', 'secretar', 'registratura', 'asistent manager', 'functionar administrativ', 'operator date', 'arhivar'],
    description: 'Registratură, corespondență, procesare documente, protocol, îndosariere și arhivă curentă.',
    globalRiskScore,
    factors,
  };
})();

// 8. CONTABIL / ECONOMIST (COR 241103)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Lucru intensiv la monitor la introducerea și reconcilierea documentelor financiar-contabile',
      riskSituation: 'SARCINA',
      consequence: 'Cefalee, scăderea acuității vizuale (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Control medical oftalmologic anual asigurat prin medicina muncii conform HG 355/2007',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Medic Medicina Muncii',
        deadline: 'Anual',
      },
    },
    {
      hazard: 'Postură statică pe scaun peste 7 ore pe zi',
      riskSituation: 'SARCINA',
      consequence: 'Spondiloză cervicală, dureri lombosacrate (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Ajustarea scaunului și a suportului pentru antebrațe la înălțimea biroului',
        measureType: 'tehnica',
        responsiblePerson: 'Specialist SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Suprasolicitare psihică și stres în perioadele de închidere de lună / an și bilanț contabil',
      riskSituation: 'SARCINA',
      consequence: 'Stare anxioasă, tulburări digestive (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Planificarea sarcinilor din timp și eșalonarea termenelor interne de predare a actelor',
        measureType: 'organizatorica',
        responsiblePerson: 'Director Financiar',
        deadline: 'Lunar',
      },
    },
    {
      hazard: 'Risc de electrocutare prin prize defecte sau prelungitoare subdimensionate',
      riskSituation: 'MIJLOACE',
      consequence: 'Electrocutare (ITM 45-180 zile)',
      severityScore: 3,
      probabilityScore: 1,
      measure: {
        description: 'Interzicerea conectării aparatelor de încălzire (aeroterme) pe prelungitoare comune de calculator',
        measureType: 'organizatorica',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['241103'] = {
    corCode: '241103',
    corGroup: '2411',
    title: 'Contabil',
    aliases: ['contabil', 'economist', 'contabil sef', 'auditor', 'analist financiar', 'expert contabil'],
    description: 'Evidență contabilă, calcule salariale, rapoarte fiscale, operare sisteme ERP și procesare facturi.',
    globalRiskScore,
    factors,
  };
})();

// 9. ȘOFER / CONDUCĂTOR AUTO (COR 833201 / 832201)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Accident rutier în trafic la deplasarea pe drumurile publice',
      riskSituation: 'MEDIU',
      consequence: 'Politraumatisme grave, fracturi, DECES',
      severityScore: 7,
      probabilityScore: 2,
      measure: {
        description: 'Verificarea tehnică zilnică a vehiculului (frâne, lumini, anvelope), ITP la zi și respectarea regulilor de circulație',
        measureType: 'tehnica',
        responsiblePerson: 'Conducător auto / Șef Parc Auto',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Vibrații transmise întregului corp și postură rigidă la volan',
      riskSituation: 'MIJLOACE',
      consequence: 'Hernie de disc, afecțiuni degenerative ale coloanei (ITM 45-180 zile)',
      severityScore: 3,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea autovehiculului cu scaun șofer ergonomic cu amortizare și pauze de 15 min la fiecare 2 ore de condus',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Oboseală vizuală și scăderea vigilenței la condusul pe timp de noapte sau condiții meteo vitrege (ceață, ploaie)',
      riskSituation: 'SARCINA',
      consequence: 'Risc de adormire la volan, coliziune (ITM 45-180 zile)',
      severityScore: 5,
      probabilityScore: 2,
      measure: {
        description: 'Respectarea strictă a timpilor legali de odihnă și conducere conform Regulamentului CE 561/2006',
        measureType: 'organizatorica',
        responsiblePerson: 'Dispecer / Coordonator Transport',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Manipularea mărfurilor la încărcare și descărcare (colete, paleți)',
      riskSituation: 'SARCINA',
      consequence: 'Lombalgii, entorse musculare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Purtarea încălțămintei de protecție cu bombeu metalic S1P și utilizarea transpaletei manuale',
        measureType: 'tehnica',
        responsiblePerson: 'Șofer',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Agresiune verbală sau fizică în trafic sau la descărcarea mărfii',
      riskSituation: 'MEDIU',
      consequence: 'Traumatisme mecanice, stare de șoc (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 2,
      measure: {
        description: 'Instruire privind conducerea defensivă și interzicerea coborârii din mașină la provocări în trafic',
        measureType: 'organizatorica',
        responsiblePerson: 'Specialist SSM',
        deadline: 'La instruire',
      },
    },
  ]);

  COR_RISK_PROFILES['833201'] = {
    corCode: '833201',
    corGroup: '8332',
    title: 'Șofer Autocamion / Conducător Auto',
    aliases: ['sofer', 'conducator auto', 'sofer distributie', 'sofer tir', 'sofer camion', 'sofer furgoneta', 'sofer profesionist'],
    description: 'Transport rutier de mărfuri, conducere vehicule rutiere, verificări tehnice și supraveghere descărcare.',
    globalRiskScore,
    factors,
  };
})();

// 10. CURIER / LIVRATOR (COR 962101)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Accident rutier la deplasarea rapidă cu scuterul, bicicleta sau autoturismul în mediul urban aglomerat',
      riskSituation: 'MEDIU',
      consequence: 'Politraumatisme, fracturi (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea obligatorie a căștii de protecție moto/velo omologate, genunchierelor și a vestei reflectorizante',
        measureType: 'tehnica',
        responsiblePerson: 'Curier / Responsabil Flotă',
        deadline: 'La fiecare cursă',
      },
    },
    {
      hazard: 'Cădere prin alunecare pe gheață, zăpadă sau scări umede la predarea coletelor la client',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii ale membrelor inferioare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu încălțăminte de iarnă antiderapantă și atenție sporită la accesul în imobile',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Curier',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Risc de mușcături de câini în curțile clienților sau pe străzi lăturalnice',
      riskSituation: 'MEDIU',
      consequence: 'Plăgi mușcate, risc de infecție / rabie (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 3,
      measure: {
        description: 'Dotarea cu dispozitiv cu ultrasunete anti-câini și contactarea telefonică a clientului înainte de intrarea în curte',
        measureType: 'tehnica',
        responsiblePerson: 'Curier',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Efort fizic dinamic la urcatul scărilor cu colete grele în clădiri fără lift',
      riskSituation: 'SARCINA',
      consequence: 'Hernie de disc, epuizare fizică (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Utilizarea genților ergonomice cu bretele late căptușite și limitarea greutății coletelor purtate manual',
        measureType: 'tehnica',
        responsiblePerson: 'Curier / Dispecerat',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['962101'] = {
    corCode: '962101',
    corGroup: '9621',
    title: 'Curier / Livrator',
    aliases: ['curier', 'livrator', 'curier auto', 'curier moto', 'livrator mancare', 'agent livrari', 'distribuitor'],
    description: 'Preluare și livrare colete la domiciliu, deplasare urbană, manipulare mărfuri și încasare plăți.',
    globalRiskScore,
    factors,
  };
})();

// 11. VÂNZĂTOR / LUCRĂTOR COMERCIAL / CASIER (COR 522301)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Postură ortostatică prelungită în picioare pe durata programului de magazin',
      riskSituation: 'SARCINA',
      consequence: 'Varice la membrele inferioare, edeme, dureri lombare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 5,
      measure: {
        description: 'Asigurarea de scaune înalte de repaus la casă și covoare ergonomice anti-oboseală în spatele tejghelei',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator Magazin',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Cădere de la înălțime mică la așezarea mărfurilor pe rafturile superioare',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii ale coatelor și genunchilor (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 3,
      measure: {
        description: 'Utilizarea exclusivă a scărilor cu trepte late și balustradă; interzicerea folosirii cutiilor sau scaunelor improvizate',
        measureType: 'tehnica',
        responsiblePerson: 'Șef Magazin',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Mișcări repetitive ale brațului și încheieturii la scanarea continuă a produselor la casa de marcat',
      riskSituation: 'SARCINA',
      consequence: 'Tendinite, sindrom de canal carpian (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu scanere omnidirecționale și rotația sarcinilor (casă - așezare marfă la raft) la fiecare 2 ore',
        measureType: 'organizatorica',
        responsiblePerson: 'Șef Tură',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Manipularea baxurilor și lăzilor grele la descărcarea mărfii la recepție',
      riskSituation: 'SARCINA',
      consequence: 'Dureri dorsolombare acute (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Folosirea transpaletelor și cărucioarelor de marfă pentru deplasarea baxurilor grele',
        measureType: 'tehnica',
        responsiblePerson: 'Lucrător comercial',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Risc de agresiune la tentative de furt din magazin',
      riskSituation: 'MEDIU',
      consequence: 'Traumatisme fizice, stres psihic (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 2,
      measure: {
        description: 'Instalarea de camere video, buton de panică și instruirea privind neintervenția fizică în confruntări violente',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['522301'] = {
    corCode: '522301',
    corGroup: '5223',
    title: 'Vânzător / Lucrător Comercial',
    aliases: ['vanzator', 'lucrator comercial', 'casier', 'operator vanzari', 'asistent vanzari', 'comercial magazin', 'reprezentant vanzari'],
    description: 'Servire clienți, așezare marfă pe rafturi, operare casă de marcat, recepție produse și inventar.',
    globalRiskScore,
    factors,
  };
})();

// 12. STIVUITORIST / OPERATOR UTILAJE DEPOZIT (COR 834401)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Răsturnarea stivuitorului la manevre bruște, viraje strânse sau deplasare cu furcile ridicate',
      riskSituation: 'MIJLOACE',
      consequence: 'Strivire sub utilaj, DECES',
      severityScore: 7,
      probabilityScore: 1,
      measure: {
        description: 'Purtarea obligatorie a centurii de siguranță, deplasarea exclusiv cu furcile coborâte la 15-20 cm de sol și respectarea limitei de viteză de 5-10 km/h',
        measureType: 'organizatorica',
        responsiblePerson: 'Stivuitorist / Șef Depozit',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Lovire a pietonilor la deplasarea în zonele aglomerate ale depozitului',
      riskSituation: 'MEDIU',
      consequence: 'Fracturi deschise, politraumatisme (ITM 45-180 zile)',
      severityScore: 5,
      probabilityScore: 2,
      measure: {
        description: 'Separarea căilor de circulație pietonală de cele pentru utilaje, semnalizare luminoasă BlueSpot și claxonare la intersecții',
        measureType: 'tehnica',
        responsiblePerson: 'Responsabil SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Căderea paleților sau mărfurilor depozitate la înălțime pe rafturi',
      riskSituation: 'MEDIU',
      consequence: 'Traumatisme craniene, contuzii grave (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 2,
      measure: {
        description: 'Purtarea căștii de protecție EN 397 și verificarea integrității grilajului de protecție superior al cabinei',
        measureType: 'tehnica',
        responsiblePerson: 'Stivuitorist',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Vibrații și șocuri mecanice transmise de la pardoseala denivelată către coloana vertebrală',
      riskSituation: 'MIJLOACE',
      consequence: 'Afecțiuni lombare (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Întreținerea suspensiilor scaunului stivuitorului și repararea promptă a rosturilor de dilatație deteriorate',
        measureType: 'tehnica',
        responsiblePerson: 'Mentenanță Depozit',
        deadline: 'Trimestrial',
      },
    },
  ]);

  COR_RISK_PROFILES['834401'] = {
    corCode: '834401',
    corGroup: '8344',
    title: 'Stivuitorist',
    aliases: ['stivuitorist', 'operator stivuitor', 'motostivuitorist', 'electro-stivuitorist', 'reach truck operator'],
    description: 'Manevrare stivuitoare și transpalete electrice, descărcare camioane, depozitare pe rafturi înalte.',
    globalRiskScore,
    factors,
  };
})();

// 13. MANIPULANT MĂRFURI (COR 933301)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Efort fizic dinamic intens la ridicarea și așezarea manuală a coletelor grele',
      riskSituation: 'SARCINA',
      consequence: 'Hernie de disc lombară, întinderi musculare severe (ITM 45-180 zile)',
      severityScore: 3,
      probabilityScore: 4,
      measure: {
        description: 'Instruirea periodică privind tehnicile de ridicare din genunchi cu spatele drept și limitarea masei ridicate',
        measureType: 'organizatorica',
        responsiblePerson: 'Conducător loc de muncă',
        deadline: 'Trimestrial',
      },
    },
    {
      hazard: 'Căderea obiectelor sau mărfurilor peste picioare în timpul manipulării',
      riskSituation: 'MIJLOACE',
      consequence: 'Fracturi ale degetelor de la picioare, striviri (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea obligatorie a bocancilor de protecție cu bombeu metalic/compozit clasa S1P/S3',
        measureType: 'tehnica',
        responsiblePerson: 'Manipulant',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Tăiere sau înțepare în cuie de paleți, așchii de lemn sau benzi de legat metalice/plastic',
      riskSituation: 'MIJLOACE',
      consequence: 'Plăgi înțepate, risc de tetanos (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Purtarea mănușilor de protecție din piele șpalt sau acoperite cu nitril gros EN 388',
        measureType: 'tehnica',
        responsiblePerson: 'Manipulant',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Lovire de către transpalete manuale sau electrice conduse de colegi',
      riskSituation: 'MEDIU',
      consequence: 'Contuzii, traumatisme ale gambelor (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Respectarea regulilor de circulație internă și păstrarea distanței de siguranță la tractarea utilajelor',
        measureType: 'organizatorica',
        responsiblePerson: 'Șef Depozit',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['933301'] = {
    corCode: '933301',
    corGroup: '9333',
    title: 'Manipulant Mărfuri',
    aliases: ['manipulant marfuri', 'muncitor depozit', 'incarcator descarcator', 'lucrator depozit', 'picker', 'packer'],
    description: 'Manipulare manuală și mecanizată a mărfurilor, încărcare/descărcare, paletizare și sortare produse.',
    globalRiskScore,
    factors,
  };
})();

// 14. SUDOR (COR 721201)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Expunerea ochilor la radiațiile ultraviolete și infraroșii generate de arcul electric',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri corneene (electrooftalmie), orbire temporară (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 4,
      measure: {
        description: 'Purtarea obligatorie a măștii de sudură cu filtru cu întunecare automată (heliomat) grad DIN 9-13',
        measureType: 'tehnica',
        responsiblePerson: 'Sudor',
        deadline: 'La fiecare sudură',
      },
    },
    {
      hazard: 'Inhalarea fumului și aerosolilor de sudură (oxizi de fier, mangan, ozon)',
      riskSituation: 'MEDIU',
      consequence: 'Febra fumului de metal, bronhopneumopatie cronică (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 3,
      measure: {
        description: 'Utilizarea exhaustorului mobil local de noxe la locul de sudură și semimască cu filtru FFP3',
        measureType: 'tehnica',
        responsiblePerson: 'Responsabil SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Proiecție de particule incandescente și picături de metal topit pe corp',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri cutanate profunde gradul II-III (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 3,
      measure: {
        description: 'Echipare completă cu costum din piele ignifugă, jambiere și mănuși speciale de sudor cu manșetă lungă',
        measureType: 'tehnica',
        responsiblePerson: 'Sudor',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Risc de incendiu sau explozie la sudarea în preajma materialelor combustibile',
      riskSituation: 'MEDIU',
      consequence: 'Arsuri grave, distrugere patrimoniu, DECES',
      severityScore: 7,
      probabilityScore: 1,
      measure: {
        description: 'Emiterea Permisului de lucru cu foc, îndepărtarea combustibililor pe o rază de 10m și prezența stingătorului funcțional',
        measureType: 'organizatorica',
        responsiblePerson: 'Cadru Tehnic PSI / Administrator',
        deadline: 'La fiecare lucrare',
      },
    },
  ]);

  COR_RISK_PROFILES['721201'] = {
    corCode: '721201',
    corGroup: '7212',
    title: 'Sudor',
    aliases: ['sudor', 'sudor electric', 'sudor mig-mag', 'sudor tig', 'taietor cu flacara'],
    description: 'Sudare electrică, cu gaz, tăiere oxigaz, asamblare confecții metalice și debitare mecanică.',
    globalRiskScore,
    factors,
  };
})();

// 15. ELECTRICIAN (COR 741101)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Atingere directă a pieselor aflate sub tensiune la măsurători și intervenții în tablouri electrice',
      riskSituation: 'MIJLOACE',
      consequence: 'Fibrilație ventriculară, electrocutare, DECES',
      severityScore: 7,
      probabilityScore: 1,
      measure: {
        description: 'Aplicarea procedurii de deconectare vizibilă LOTO (Lockout/Tagout), verificarea lipsei tensiunii și purtarea mănușilor electroizolante 1000V',
        measureType: 'tehnica',
        responsiblePerson: 'Electrician autorizat',
        deadline: 'La fiecare intervenție',
      },
    },
    {
      hazard: 'Formarea arcului electric și explozie la scurtcircuit accidental în tabloul general',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri termice grave la nivelul feței și mâinilor (ITM 45-180 zile)',
      severityScore: 5,
      probabilityScore: 2,
      measure: {
        description: 'Utilizarea vizierei de protecție anti-arc electric și a sculelor cu izolație garantată VDE',
        measureType: 'tehnica',
        responsiblePerson: 'Electrician',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Cădere de la înălțime la montarea corpurilor de iluminat sau pe stâlpi/schele',
      riskSituation: 'MEDIU',
      consequence: 'Fracturi, politraumatisme (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 2,
      measure: {
        description: 'Folosirea scărilor electroizolante din fibră de sticlă verificate și ancorarea centurii de siguranță',
        measureType: 'tehnica',
        responsiblePerson: 'Specialist SSM',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['741101'] = {
    corCode: '741101',
    corGroup: '7411',
    title: 'Electrician Instalații',
    aliases: ['electrician', 'electrician intretinere', 'electrician instalatii', 'tehnician electrician', 'electromecanic'],
    description: 'Instalare circuite electrice, montaj tablouri, măsurători PRAM, remediere deranjamente sub tensiune joasă.',
    globalRiskScore,
    factors,
  };
})();

// 16. ZIDAR / TENCUITOR / CONSTRUCȚII (COR 711201)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Cădere de la înălțime de pe schele, platforme de lucru sau margini de planșeu',
      riskSituation: 'MEDIU',
      consequence: 'Politraumatisme grave, DECES',
      severityScore: 7,
      probabilityScore: 2,
      measure: {
        description: 'Montarea de balustrade de protecție cu trei elemente (mână curentă, intermediară, bordură) și purtarea hamului anticădere EN 361 ancorat la linia vieții',
        measureType: 'tehnica',
        responsiblePerson: 'Șef Șantier / Specialist SSM',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Căderea obiectelor, sculelor sau cărămizilor de la etajele superioare pe șantier',
      riskSituation: 'MEDIU',
      consequence: 'Traumatisme craniene severe (ITM 45-180 zile)',
      severityScore: 5,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea obligatorie a căștii de protecție EN 397 pe întreg perimetrul șantierului și plase de protecție pe schele',
        measureType: 'tehnica',
        responsiblePerson: 'Zidar / Muncitor',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Contactul cutanat cu cimentul proaspăt, varul și aditivii chimici pentru mortare',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri chimice alcaline, dermatite erozive (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Purtarea mănușilor impermeabile rezistente chimic și a ochelarilor de protecție la prepararea mortarelor',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Zidar',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Manipularea manuală a sacilor de ciment și blocurilor de zidărie grele',
      riskSituation: 'SARCINA',
      consequence: 'Lombalgii, tasări vertebrale (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 4,
      measure: {
        description: 'Mecanizarea transportului materialelor cu scripeți și macarale de șantier; limitarea ridicării la 25 kg/persoană',
        measureType: 'tehnica',
        responsiblePerson: 'Șef Punct de Lucru',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['711201'] = {
    corCode: '711201',
    corGroup: '7112',
    title: 'Zidar / Tencuitor',
    aliases: ['zidar', 'tencuitor', 'fierar betonist', 'muncitor constructii', 'zugrav', 'finisor', 'rigipsar'],
    description: 'Execuție zidării, tencuieli, turnare betoane, lucru pe schele și manipulare materiale de construcții.',
    globalRiskScore,
    factors,
  };
})();

// 17. MECANIC AUTO (COR 723101)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Căderea vehiculului de pe elevatorul mecanic sau deplasarea accidentală a cricului hidraulic',
      riskSituation: 'MIJLOACE',
      consequence: 'Strivire sub caroserie, politraumatisme, DECES',
      severityScore: 7,
      probabilityScore: 1,
      measure: {
        description: 'Verificarea siguranțelor mecanice automate ale brațelor elevatorului și revizie tehnică ISCIR conform scadenței',
        measureType: 'tehnica',
        responsiblePerson: 'Responsabil RSVTI / Șef Service',
        deadline: 'Lunar / Anual',
      },
    },
    {
      hazard: 'Contact cutanat cu fluide auto fierbinți sau toxice (ulei motor încins, antigel, lichid de frână)',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri termice și chimice, dermatite (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea mănușilor rezistente la hidrocarburi și utilizarea tăvilor colectoare speciale cu pâlnie largă',
        measureType: 'tehnica',
        responsiblePerson: 'Mecanic Auto',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Cădere în canalul de revizie al atelierului auto',
      riskSituation: 'MEDIU',
      consequence: 'Fracturi ale oaselor lungi, contuzii craniene (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 2,
      measure: {
        description: 'Acoperirea completă a canalului cu grătare metalice rezistente când nu este poziționat niciun vehicul',
        measureType: 'tehnica',
        responsiblePerson: 'Șef Atelier',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Proiecție de așchii metalice la polizare, strunjire sau periere mecanică',
      riskSituation: 'MIJLOACE',
      consequence: 'Leziuni oculare grave, corpi străini intraoculari (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea obligatorie a ochelarilor de protecție sau vizierei transparente la orice operație de așchiere',
        measureType: 'tehnica',
        responsiblePerson: 'Mecanic Auto',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['723101'] = {
    corCode: '723101',
    corGroup: '7231',
    title: 'Mecanic Auto',
    aliases: ['mecanic auto', 'tehnician service', 'mecanic utilaje', 'vulcanizator', 'tinichigiu auto', 'vopsitor auto'],
    description: 'Diagnoză și reparații autovehicule, operare elevatoare, demontare motoare, schimb fluide tehnice.',
    globalRiskScore,
    factors,
  };
})();

// 18. AGENT DE SECURITATE ȘI PAZĂ (COR 541401)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Agresiune fizică sau armată din partea persoanelor neautorizate care pătrund în obiectiv',
      riskSituation: 'MEDIU',
      consequence: 'Plăgi prin tăiere sau împușcare, traumatisme corporale grave, DECES',
      severityScore: 7,
      probabilityScore: 1,
      measure: {
        description: 'Dotarea cu vestă de protecție anti-tăiere/anti-glonț, spray iritant-lacrimogen și buton de panică conectat la dispecerat',
        measureType: 'tehnica',
        responsiblePerson: 'Conducător Serviciu Pază',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Expunere la intemperii (frig extrem, vânt, polei, caniculă) în timpul rondurilor exterioare',
      riskSituation: 'MEDIU',
      consequence: 'Hipotermie, degerături sau șoc caloric (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Asigurarea cabinei de pază încălzite/climatizate și a îmbrăcămintei călduroase de iarnă conform normelor',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Administrator',
        deadline: 'Sezonier',
      },
    },
    {
      hazard: 'Risc de adormire sau pierdere a atenției pe timpul turelor de noapte',
      riskSituation: 'SARCINA',
      consequence: 'Scăderea capacității de reacție, vătămări prin surprindere (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Organizarea turelor de lucru în regim 12/24 - 12/48 și verificare periodică radio din partea dispeceratului',
        measureType: 'organizatorica',
        responsiblePerson: 'Șef Tură Pază',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['541401'] = {
    corCode: '541401',
    corGroup: '5414',
    title: 'Agent de Securitate și Pază',
    aliases: ['agent paza', 'agent securitate', 'portar', 'gardian', 'paznic', 'supraveghetor acces'],
    description: 'Pază perimetrală, control acces persoane și vehicule, patrulare ronduri de noapte, monitorizare CCTV.',
    globalRiskScore,
    factors,
  };
})();

// 19. ÎNGRIJITOR CLĂDIRI / FEMEIE DE SERVICIU (COR 911201)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Alunecare pe pardoseli proaspăt spălate sau umede',
      riskSituation: 'MEDIU',
      consequence: 'Entorse, contuzii, fracturi ale membrelor (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 4,
      measure: {
        description: 'Purtarea încălțămintei antiderapante SRC și amplasarea panourilor mobile de avertizare „Pardoseală Umedă”',
        measureType: 'tehnica',
        responsiblePerson: 'Îngrijitor clădiri',
        deadline: 'Zilnic',
      },
    },
    {
      hazard: 'Contact cutanat sau inhalare a vaporilor de substanțe chimice de curățare (clor, detartrant, degresant)',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri chimice, iritații severe ale mucoasei oculare și respiratorii (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea obligatorie a mănușilor din cauciuc rezistente, ochelarilor de protecție la diluare și interzicerea amestecării detergenților',
        measureType: 'igienico-sanitara',
        responsiblePerson: 'Lucrător desemnat SSM',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Efort fizic dinamic la curățat pardoseli mari, spălat geamuri și transportat saci menajeri',
      riskSituation: 'SARCINA',
      consequence: 'Dureri musculare, afecțiuni ale coloanei (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu cărucior profesional de curățenie cu storcător mecanic și mop cu coadă telescopică ușoară',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Înțepare în ace sau cioburi aruncate necorespunzător în coșurile de gunoi',
      riskSituation: 'EXECUTANT',
      consequence: 'Plăgi înțepate, risc de contaminare biologică (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 2,
      measure: {
        description: 'Interzicerea tasării sacilor menajeri cu mâinile sau picioarele; folosirea mănușilor groase de protecție',
        measureType: 'organizatorica',
        responsiblePerson: 'Personal curățenie',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['911201'] = {
    corCode: '911201',
    corGroup: '9112',
    title: 'Îngrijitor Clădiri / Femeie de Serviciu',
    aliases: ['femeie de serviciu', 'ingrijitor cladiri', 'lucrator curatenie', 'camerista', 'agent curatenie'],
    description: 'Curățenie birouri și spații comune, igienizare grupuri sanitare, colectare deșeuri menajere.',
    globalRiskScore,
    factors,
  };
})();

// 20. INSTALATOR TEHNICO-SANITAR (COR 712601)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Arsuri termice la lipirea țevilor cu flacără deschisă sau prin contact cu conducte de apă caldă sub presiune',
      riskSituation: 'MIJLOACE',
      consequence: 'Arsuri termice gradul I-II la mâini și brațe (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 3,
      measure: {
        description: 'Purtarea mănușilor termoprotectoare, ecran de protecție la lipire și eliberarea presiunii înainte de demontare',
        measureType: 'tehnica',
        responsiblePerson: 'Instalator',
        deadline: 'La intervenție',
      },
    },
    {
      hazard: 'Inhalarea de gaze toxice (hidrogen sulfurat, metan) la intervenții în cămine sau canale de canalizare',
      riskSituation: 'MEDIU',
      consequence: 'Intoxicație acută, asfixie, DECES',
      severityScore: 7,
      probabilityScore: 1,
      measure: {
        description: 'Ventilarea obligatorie a spațiilor închise înainte de acces, măsurarea atmosferei cu detector multigaz și echipă de salvare la suprafață',
        measureType: 'tehnica',
        responsiblePerson: 'Șef Echipă Instalații',
        deadline: 'La fiecare intrare în cămin',
      },
    },
    {
      hazard: 'Lucru în spații înguste, poziție forțată în genunchi sau pe spate',
      riskSituation: 'SARCINA',
      consequence: 'Lombalgii, bursite la genunchi (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Dotarea cu genunchiere din spumă densă și covoare de protecție pentru intervențiile la sol',
        measureType: 'tehnica',
        responsiblePerson: 'Instalator',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['712601'] = {
    corCode: '712601',
    corGroup: '7126',
    title: 'Instalator Tehnico-Sanitar și Gaze',
    aliases: ['instalator', 'instalator sanitar', 'instalator gaze', 'instalator incalzire', 'montator instalatii'],
    description: 'Montaj și mentenanță conducte sanitare, termice, canalizare, verificări presiune și sudură țevi.',
    globalRiskScore,
    factors,
  };
})();

// 21. ADMINISTRATOR / DIRECTOR GENERAL (COR 121901)
(() => {
  const { factors, globalRiskScore } = buildFactors([
    {
      hazard: 'Suprasolicitare neuropsihică intensă legată de răspunderea decizională, financiară și juridică a firmei',
      riskSituation: 'SARCINA',
      consequence: 'Afecțiuni cardiovasculare, hipertensiune arterială, burnout (ITM 3-45 zile)',
      severityScore: 3,
      probabilityScore: 4,
      measure: {
        description: 'Delegarea sarcinilor operaționale, organizarea concediului de odihnă și control medical cardiologic periodic',
        measureType: 'organizatorica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Risc de accident rutier în deplasările frecvente de afaceri și întâlniri cu clienții',
      riskSituation: 'MEDIU',
      consequence: 'Politraumatisme, leziuni corporale (ITM 45-180 zile)',
      severityScore: 4,
      probabilityScore: 2,
      measure: {
        description: 'Utilizarea autovehiculelor cu dotări active de securitate și interzicerea utilizării telefonului mobil fără handsfree',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
    {
      hazard: 'Lucru prelungit la laptop / tabletă în timpul călătoriilor și la birou',
      riskSituation: 'SARCINA',
      consequence: 'Oboseală vizuală, dureri cervicale (ITM 3-45 zile)',
      severityScore: 2,
      probabilityScore: 4,
      measure: {
        description: 'Asigurarea unui mediu ergonomic de birou și utilizarea monitoarelor externe la birou',
        measureType: 'tehnica',
        responsiblePerson: 'Administrator',
        deadline: 'Permanent',
      },
    },
  ]);

  COR_RISK_PROFILES['121901'] = {
    corCode: '121901',
    corGroup: '1219',
    title: 'Administrator / Director General',
    aliases: ['administrator', 'director general', 'manager', 'ceo', 'conducator unitate', 'director executiv', 'managing director'],
    description: 'Management strategic, reprezentare juridică, coordonare departamente, decizii de business și deplasări.',
    globalRiskScore,
    factors,
  };
})();

// ============================================================================
// HELPER FUNCȚIE DE MATCHING & REZOLVARE PROFIL COR
// ============================================================================

function normalizeRomanianText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimină diacriticele (ă, â, î, ș, ț)
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Caută cel mai potrivit profil de risc COR pe baza codului COR sau a denumirii funcției/postului.
 * 
 * Strategie de matching:
 * 1. Cod COR exact (6 cifre), ex: '512001'
 * 2. Prefix grupă COR (4 cifre), ex: '5120'
 * 3. Match pe aliasuri / cuvinte-cheie din denumirea funcției (fără diacritice)
 * 4. Match parțial pe titlul oficial
 */
export function findCorRiskProfile(query: {
  corCode?: string | null;
  jobTitle?: string | null;
}): CorRiskProfile | null {
  const cleanCor = query.corCode ? String(query.corCode).replace(/\D/g, '').trim() : '';
  const normTitle = query.jobTitle ? normalizeRomanianText(query.jobTitle) : '';

  // 1. Verificare pe cod COR exact (6 cifre)
  if (cleanCor && COR_RISK_PROFILES[cleanCor]) {
    return COR_RISK_PROFILES[cleanCor];
  }

  // 2. Verificare pe grupa COR (4 cifre)
  if (cleanCor.length >= 4) {
    const group = cleanCor.slice(0, 4);
    const byGroup = Object.values(COR_RISK_PROFILES).find((p) => p.corGroup === group);
    if (byGroup) return byGroup;
  }

  // 3. Verificare pe baza titlului postului (aliases & keywords)
  if (normTitle) {
    // Încercare potrivire exactă a unui alias
    for (const profile of Object.values(COR_RISK_PROFILES)) {
      for (const alias of profile.aliases) {
        const normAlias = normalizeRomanianText(alias);
        if (normTitle === normAlias) {
          return profile;
        }
      }
    }

    // Încercare potrivire parțială: denumirea postului include aliasul sau invers
    for (const profile of Object.values(COR_RISK_PROFILES)) {
      for (const alias of profile.aliases) {
        const normAlias = normalizeRomanianText(alias);
        if (normAlias.length >= 4 && (normTitle.includes(normAlias) || normAlias.includes(normTitle))) {
          return profile;
        }
      }
    }

    // Încercare potrivire pe cuvinte individuale din titlu
    const titleWords = normTitle.split(' ').filter((w) => w.length >= 4);
    for (const word of titleWords) {
      for (const profile of Object.values(COR_RISK_PROFILES)) {
        for (const alias of profile.aliases) {
          const normAlias = normalizeRomanianText(alias);
          if (normAlias.includes(word) || word.includes(normAlias)) {
            return profile;
          }
        }
      }
    }
  }

  return null;
}
