/**
 * ============================================================================
 * INCDPM PECE RISK FACTOR PRESETS FOR ROMANIAN CAEN PROFILES
 * ============================================================================
 * 
 * Implements the standard Romanian Workplace Risk Assessment Methodology:
 * - Metoda INCDPM „Alexandru Darabont” București (Metoda Pece)
 * - Legea nr. 319/2006 art. 12 (Evaluarea riscurilor pentru SSM)
 * - HG nr. 1425/2006 art. 15 (Planul de prevenire și protecție)
 * 
 * System Subsystems (4 componente ale sistemului de muncă):
 * 1. EXECUTANT (Lucrătorul)
 * 2. SARCINA (Sarcina de muncă)
 * 3. MIJLOACE (Mijloace de producție / Echipamente)
 * 4. MEDIU (Mediul de muncă)
 * 
 * Evaluation Matrix:
 * - Gravitate: G_i in [1..7] (1: Neglijabil, 2: ITM 3-45z, 3: ITM 45-180z, 4: Inv gr.III, 5: Inv gr.II, 6: Inv gr.I, 7: Deces)
 * - Probabilitate: P_i in [1..6] (1: Extrem de rară, 2: Foarte rară, 3: Rară, 4: Puțin frecventă, 5: Frecventă, 6: Foarte frecventă)
 * - Nivel Parțial de Risc: R_i in [1..7] determinat prin matricea Pece (G x P -> R)
 * - Nivel Global de Risc: N_rg = Sum(R_i^2) / Sum(R_i) <= 3.50 (Nivel de risc acceptabil)
 */

export type RiskSubsystem = 'EXECUTANT' | 'SARCINA' | 'MIJLOACE' | 'MEDIU';

export interface RiskPresetItem {
  element: RiskSubsystem;
  riskFactor: string;
  manifestation: string;
  consequences: string;
  severity: number;    // 1-7 (G)
  probability: number; // 1-6 (P)
  riskLevel: number;   // 1-7 (R)
  preventionMeasures: string[];
}

export interface CaenRiskProfile {
  caenCode: string;
  industryName: string;
  jobTitle?: string;
  globalRiskScore: number; // <= 3.50
  factors: RiskPresetItem[];
}

/**
 * Grila Oficială INCDPM Pece (Gravitate 1..7 x Probabilitate 1..6 -> Nivel Parțial de Risc 1..7)
 */
export const PECE_RISK_MATRIX: number[][] = [
  // P=1, P=2, P=3, P=4, P=5, P=6
  [1, 1, 1, 1, 1, 1], // G=1 Consecințe neglijabile (ITM < 3 zile)
  [1, 1, 2, 2, 2, 2], // G=2 Consecințe mici (ITM 3-45 zile)
  [2, 2, 3, 3, 3, 4], // G=3 Consecințe medii (ITM 45-180 zile)
  [2, 3, 3, 4, 4, 5], // G=4 Consecințe mari (Invaliditate gradul III)
  [2, 3, 4, 4, 5, 6], // G=5 Consecințe grave (Invaliditate gradul II)
  [3, 4, 4, 5, 6, 7], // G=6 Consecințe foarte grave (Invaliditate gradul I)
  [3, 4, 5, 6, 7, 7], // G=7 Consecințe maxime (Deces)
];

/**
 * Calculează nivelul parțial de risc conform grilei oficiale Pece
 */
export function calculatePecePartialRisk(gravity: number, probability: number): number {
  const g = Math.max(1, Math.min(7, Math.round(gravity))) - 1;
  const p = Math.max(1, Math.min(6, Math.round(probability))) - 1;
  return PECE_RISK_MATRIX[g][p];
}

/**
 * Calculează nivelul global de risc ponderat:
 * N_rg = Sum(R_i^2) / Sum(R_i)
 */
export function calculateGlobalRiskScore(factors: RiskPresetItem[]): number {
  if (!factors || factors.length === 0) return 0;
  const sumR = factors.reduce((acc, f) => acc + f.riskLevel, 0);
  const sumR2 = factors.reduce((acc, f) => acc + (f.riskLevel * f.riskLevel), 0);
  if (sumR === 0) return 0;
  return Number((sumR2 / sumR).toFixed(2));
}

// ============================================================================
// PROFILE DE RISC INCDPM PE CODURI CAEN PRINCIPALE
// ============================================================================

/**
 * CAEN 6201 - Activități de realizare a software-ului la comandă (IT / TESA)
 */
export const RISK_PROFILE_6201: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Utilizarea de conexiuni electrice improvizate sau cabluri prelungitoare deteriorate',
      manifestation: 'Atingere directă a conductorilor neizolați sau a carcaselor sparte sub tensiune',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Interzicerea utilizării improvizațiilor electrice și a cablurilor deteriorate',
        'Verificarea vizuală periodică a cablurilor de alimentare și a prizelor',
        'Notificarea imediată a responsabilului administrativ la constatarea unui defect',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Nerespectarea pauzelor active orare de lucru la videoterminale',
      manifestation: 'Lucru continuu la monitor fără pauze orare de relaxare oculară și musculară',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Respectarea pauzelor active de 10 minute la fiecare 50 de minute de lucru la ecran',
        'Efectuarea de exerciții oculare și gimnastică de relaxare cervicală',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Deplasări grăbite sau neatenție pe căile de circulație interioare și scări',
      manifestation: 'Alunecare pe pardoseli lustruite, împiedicare pe trepte sau peste cabluri IT',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Menținerea în permanență liberă a căilor de acces și a coridoarelor',
        'Montarea benzilor antiderapante pe trepte și introducerea cablurilor în canaline',
        'Interzicerea alergării sau a utilizării telefonului mobil pe scări',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Intervenții neautorizate la tablouri electrice sau componente hardware PC',
      manifestation: 'Desfacerea carcaselor surselor de alimentare sau intervenții la tabloul general',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Interzicerea intervențiilor tehnice la echipamente de către personal necalificat',
        'Apelarea exclusivă la electricieni autorizați ANRE pentru depanare',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Căderea dosarelor sau bibliorafturilor grele la manipulare din dulapuri',
      manifestation: 'Prăbușire dosare sau monitoare grele peste picioare sau mâini',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 2,
      preventionMeasures: [
        'Depozitarea bibliorafturilor grele pe polițele inferioare ale dulapurilor',
        'Ancorarea solidă a corpurilor de mobilier în perete contra răsturnării',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Efort static prelungit în poziție așezat la birou',
      manifestation: 'Menținerea posturii statice pe scaun mai mult de 6-8 ore/zi',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu scaune ergonomice reglabile pe 3 axe cu suport lombar adaptabil',
        'Alternarea posturii de lucru prin birouri reglabile pe înălțime (sit-stand)',
        'Efectuarea exercițiilor de întindere musculară în timpul pauzelor',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Suprasolicitare vizuală prin citire pe ecran și reflexii luminoase',
      manifestation: 'Lucru continuu la monitoare multiple în mediu cu contrast nepotrivit',
      consequences: 'INV gr.III',
      severity: 4,
      probability: 3,
      preventionMeasures: [
        'Utilizarea monitoarelor cu filtru antireflexie și frecvență ridicată de reîmprospătare',
        'Asigurarea unui iluminat ambiental difuz de 300-500 lucși',
        'Control oftalmologic periodic asigurat prin medicina muncii (HG 1028/2006)',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Solicitare neuropsihică intensă cauzată de termene de livrare stricte',
      manifestation: 'Stres profesional, tensiune mentală în perioadele de lansare software',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Planificarea realistă a etapelor de dezvoltare și a sprint-urilor',
        'Rotația responsabilităților critice și management eficient al timpului',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Mișcări repetitive ale degetelor și mâinilor pe tastatură și mouse',
      manifestation: 'Tastare intensivă fără suport ergonomic generând risc de tunel carpian',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu tastaturi și mouse-uri ergonomice sau verticale',
        'Utilizarea de suporturi din gel pentru sprijinul încheieturii mâinii',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Electrocutare prin atingere directă la nivelul instalației electrice',
      manifestation: 'Prize sparte, carcase deteriorate sau cabluri fără protecție mecanică',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Măsurători anuale PRAM de verificare a continuității și a rezistenței de dispersie',
        'Echiparea tablourilor cu disjunctoare diferențiale de 30mA',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Electrocutare prin atingere indirectă la carcasele metalice ale PC-urilor',
      manifestation: 'Defect de izolație internă la sursa PC-ului sau serverului',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Racordarea obligatorie a tuturor calculatoarelor la prize cu contact de protecție (Schuko)',
        'Verificarea periodică a rezistenței de izolație a echipamentelor IT',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Contact cu muchii ascuțite sau colțuri ale mobilierului de birou',
      manifestation: 'Lovituri sau zgârieturi la deplasare între birouri',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Achiziționarea mobilierului de birou cu muchii rotunjite',
        'Respectarea lățimii minime de trecere între posturile de lucru (minim 80 cm)',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Incendiu produs prin suprasolicitarea circuitelor sau prelungitoarelor',
      manifestation: 'Conectarea aparatelor de încălzire (aeroterme) pe același circuit cu calculatoarele',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Interzicerea folosirii consumatorilor termici mari pe circuitele destinate aparaturii IT',
        'Dotarea spațiilor cu stingătoare portabile cu dioxid de carbon (CO2) verificate anual',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Disconfort termic determinat de curenții reci de aer condiționat',
      manifestation: 'Jet de aer rece direcționat spre corpul lucrătorului în sezonul cald',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Direcționarea deflectoarelor aparatelor de aer condiționat către tavan',
        'Menținerea temperaturii optime între 22°C și 24°C și igienizarea semestrială a filtrelor',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Nivel necorespunzător de iluminare sau reflexii parazite pe ecran',
      manifestation: 'Lumină solară directă prin ferestre neacoperite sau tuburi fluorescente reflectate',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 2,
      preventionMeasures: [
        'Montarea jaluzelelor reglabile la ferestre',
        'Poziționarea ecranelor perpendicular față de suprafețele vitrate',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Zgomot de fond produs de sistemele de climatizare și servere',
      manifestation: 'Disconfort fonic continuu și scăderea capacității de concentrare',
      consequences: 'NEGLIJABILE',
      severity: 1,
      probability: 4,
      preventionMeasures: [
        'Amplasarea serverelor în încăperi tehnice dedicate fonoizolate',
        'Utilizarea sistemelor silențioase de ventilație și carcase antifonate',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '6201',
    industryName: 'Activități de realizare a software-ului la comandă (software orientat client)',
    jobTitle: 'Inginer software / Programator / TESA',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * CAEN 5610 - Restaurante (Bucătar / Ajutor bucătar / Ospătar)
 */
export const RISK_PROFILE_5610: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Deplasare grăbită pe pardoseli umede sau acoperite cu grăsimi în bucătărie',
      manifestation: 'Alunecare și cădere la același nivel cu leziuni contuze sau fracturi',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Purtarea obligatorie a încălțămintei de protecție antiderapante (clasă SRC)',
        'Curățarea și degresarea imediată a lichidelor vărsate pe pardoseală',
        'Amplasarea covoarelor de cauciuc antiderapante în zonele umede de spălare',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Manipulare defectuoasă a cuțitelor profesionale și utilajelor de tăiat',
      manifestation: 'Tăiere accidentală a degetelor la felierea cărnii sau tocarea legumelor',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Utilizarea mănușilor de protecție din zale de inox sau fibre speciale antităiere',
        'Folosirea dispozitivelor de împingere la mașinile de feliat mezeluri și legume',
        'Instruirea periodică privind tehnicile sigure de tranșare și tocare',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Manipularea recipientelor fierbinți fără mănuși termoizolante',
      manifestation: 'Contact direct cu tăvi de cuptor, oale sau stropire cu ulei încins',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu mănuși termoizolante lungi cu manșetă rezistente la peste 250°C',
        'Utilizarea vaselor cu mânere ergonomice termoizolate și stabile',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Introducerea alimentelor umede sau congelate în uleiul încins al friteuzei',
      manifestation: 'Stropire violentă cu ulei încins la peste 180°C generând arsuri cutanate',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Scurgerea temeinică și zvântarea alimentelor înainte de scufundarea în friteuză',
        'Folosirea coșurilor de imersie cu capac de protecție',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Nerespectarea normelor igienico-sanitare la prepararea alimentelor',
      manifestation: 'Contaminare microbiologică prin nespălarea mâinilor sau echipament murdar',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Absolvirea cursurilor de igienă Modulul 1 conform Ordinului MS/ME 2209/4469/2022',
        'Control medical periodic la zi (fișă de aptitudine medicină a muncii)',
        'Spălarea frecventă a mâinilor cu săpun bactericid și utilizarea dezinfectanților avizați',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Curățarea mașinilor de tocat sau mixerelor fără deconectare de la priză',
      manifestation: 'Pornire accidentală a cuțitelor rotative în timpul spălării sau deblocării',
      consequences: 'INV gr.III',
      severity: 4,
      probability: 2,
      preventionMeasures: [
        'Deconectarea fizică de la sursa de energie electrică înainte de orice igienizare',
        'Interzicerea deblocării mecanice a utilajelor cu mâna liberă',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Manipulare manuală frecventă a maselor grele (saci făină, lăzi, oale)',
      manifestation: 'Ridicarea greutăților de peste 20-25 kg cu trunchiul aplecat',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu cărucioare de marfă și transpalete pentru transportul intern',
        'Manipularea sarcinilor grele în echipă de doi lucrători',
        'Instruire practică privind ridicarea corectă din genunchi cu spatele drept',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Poziție ortostatică prelungită și deplasare continuă în spațiu restrâns',
      manifestation: 'Stat în picioare 8 ore/schimb cauzând dureri articulare și insuficiență venoasă',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Utilizarea covoarelor ergonomice de amortizare antioboseală la posturile fixe',
        'Încălțăminte amortizantă cu suport plantar anatomic',
        'Asigurarea pauzelor de refacere funcțională conform normativelor',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Ritm intens de muncă și comenzi concomitente în orele de vârf (rush hours)',
      manifestation: 'Grabă excesivă, tensiune psihică și agitație favorizând accidentele',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 5,
      preventionMeasures: [
        'Organizarea fluxului tehnologic pe secții distincte (cald, rece, bar)',
        'Dimensionarea corectă a personalului în turele de vârf',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Suprafețe fierbinți: plite industriale, cuptoare cu convecție, grătare',
      manifestation: 'Contact involuntar cu uși de cuptor sau degajări bruște de abur la deschidere',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Deschiderea în două etape a ușilor cuptoarelor cu abur',
        'Șorțuri și bavete rezistente termic, mânere izolate termic',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Organe de mașini în mișcare neprotejate (feliatoare, malaxoare, mixere)',
      manifestation: 'Prindere sau amputare degete la discurile rotative fără apărători',
      consequences: 'INV gr.III',
      severity: 4,
      probability: 2,
      preventionMeasures: [
        'Păstrarea apărătorilor de protecție și a micro-întrerupătoarelor de siguranță montate',
        'Verificarea zilnică a sistemelor de oprire de urgență',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Instalații de gaz metan și arzătoare fără supraveghere',
      manifestation: 'Scăpări accidentale de gaze sau stingerea flăcării cu risc de deflagrație',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Montarea senzorilor automați de detecție gaz metan cu electrovalvă exterioară',
        'Utilizarea arzătoarelor echipate cu termocuplu de siguranță la stingerea flăcării',
        'Verificare tehnică periodică a instalației de gaze efectuată de operator autorizat',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Electrocutare la utilizarea echipamentelor electrice în mediu cu umiditate',
      manifestation: 'Defect de izolație la mașini de spălat vase, feliatoare sau roboți',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Montarea disjunctoarelor diferențiale de înaltă sensibilitate (10-30 mA)',
        'Prize etanșe cu grad de protecție minim IP44/IP55',
        'Verificări PRAM periodice',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Contact cu substanțe chimice agresive (decapante de cuptor, detergenți industriali)',
      manifestation: 'Arsuri chimice oculare sau cutanate la manipularea degresanților puternici',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Purtarea mănușilor chimice lungi din nitril și a ochelarilor etanși de protecție',
        'Dozarea automată a detergenților la mașinile de spălat vase profesionale',
        'Păstrarea fișelor cu date de securitate (FDS) la locul de utilizare',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Microclimat cald și umed în spațiul de gătit',
      manifestation: 'Temperaturi ridicate degajate de utilajele termice și abur concentrat',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Hotă de exhaustare profesională cu debit adecvat și aport de aer proaspăt tratat',
        'Asigurarea apei minerale și a hidratării conform prevederilor OUG 99/2000',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Șoc termic la trecerea frecventă din bucătărie în camere frigorifice',
      manifestation: 'Diferențe bruște de temperatură de la +30°C la +2°C sau -18°C',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu jachete și căciuli termoizolante păstrate lângă ușa camerei frigorifice',
        'Limitarea duratei de staționare în interiorul congelatoarelor',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Nivel ridicat de zgomot produs de ventilatoare, hotele de bucătărie și veselă',
      manifestation: 'Oboseală auditivă și dificultăți de comunicare între lucrători',
      consequences: 'NEGLIJABILE',
      severity: 1,
      probability: 4,
      preventionMeasures: [
        'Mentenanța mecanică a rulmenților motoarelor de ventilație',
        'Atenuatoare de zgomot pe tubulaturile de exhaustare',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '5610',
    industryName: 'Restaurante',
    jobTitle: 'Bucătar / Ajutor bucătar / Ospătar',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * CAEN 4120 - Lucrări de construcții a clădirilor rezidențiale și nerezidențiale
 */
export const RISK_PROFILE_4120: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Lucru sau deplasare la înălțime fără centură de siguranță ham ancorată',
      manifestation: 'Cădere în gol de pe schele, cofraje, goluri de planșeu sau margini de terasă',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Purtarea obligatorie a centurii complexe tip ham ancorate la linia vieții',
        'Montarea balustradelor perimetrale de protecție la toate marginile de gol (h=1,0 m)',
        'Verificarea zilnică a sistemelor de ancorare de către conducătorul locului de muncă',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Pătrunderea în raza de manevră a utilajelor grele sau sub sarcina macaralei',
      manifestation: 'Strivire sub sarcini ridicate sau lovire de contragreutatea excavatorului',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Delimitarea și semnalizarea zonelor de lucru ale macaralelor și excavatoarelor',
        'Interzicerea staționării sau trecerii pe sub sarcinile suspendate',
        'Dirijarea manevrelor exclusiv prin legător de sarcină atestat',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Neutilizarea echipamentului individual de protecție obligatoriu de șantier',
      manifestation: 'Lovire la cap de corpuri căzute, călcare pe cuie sau tăieturi la mâini',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 5,
      preventionMeasures: [
        'Purtarea permanentă a căștii de protecție, bocancilor S3 cu lamelă antiperforație și a vestei',
        'Control strict la intrarea în șantier și evacuarea persoanelor fără EIP',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Utilizarea de schele improvizate, pasarele nesecurizate sau scări defecte',
      manifestation: 'Prăbușire de la înălțime prin ruperea scândurilor sau deplasarea montanților',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Montarea schelelor metalice omologate exclusiv de schelari autorizați',
        'Recepția oficială a schelei prin proces-verbal și verificare săptămânală',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Improvizații electrice la tablourile de șantier sau scule cu cabluri tăiate',
      manifestation: 'Atingere directă a conductoarelor neizolate sub tensiune pe șantier ud',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Alimentarea exclusivă din tablouri de șantier omologate IP54 cu disjunctoare diferențiale 30mA',
        'Verificarea vizuală a sculelor electroportative înainte de fiecare utilizare',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Consumul de alcool sau substanțe psihoactive în incinta șantierului',
      manifestation: 'Pierderea coordonării motorii și a aprecierii distanțelor la înălțime',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Testare aleatorie cu etilotestul la poarta șantierului și toleranță zero',
        'Evacuarea imediată și desfacerea disciplinară a contractului de muncă',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Manipulare manuală susținută a materialelor grele (ciment, BCA, armături)',
      manifestation: 'Ridicarea greutăților mari (25-40 kg) generând hernie de disc și lumbago',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 5,
      preventionMeasures: [
        'Mecanizarea operațiunilor de ridicare cu macarale, palane și stivuitoare',
        'Ridicarea elementelor grele în echipă de doi lucrători',
        'Dotarea lucrătorilor cu centuri lombare de susținere',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Poziții de lucru vicioase, aplecate sau în genunchi prelungite',
      manifestation: 'Lucru aplecat la legarea armăturilor sau turnarea șapelor',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu genunchiere de protecție amortizante pentru lucrările la pardoseală',
        'Utilizarea dispozitivelor ergonomice automate de legat fier-beton',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Lucru sub presiunea respectării termenelor strânse de predare a fazelor',
      manifestation: 'Graba în execuție generând ignorarea măsurilor elementare de siguranță',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Instruirea zilnică de 5 minute la începerea schimbului (Toolbox Talk)',
        'Oprirea oricărei lucrări dacă condițiile de securitate nu sunt întrunite',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Scule electrice rotative de tăiat și debitat (polizoare unghiulare / flex, circulare)',
      manifestation: 'Ruperea sau ricoșarea discului abraziv, tăiere membre superioare',
      consequences: 'INV gr.II',
      severity: 5,
      probability: 2,
      preventionMeasures: [
        'Utilizarea obligatorie a carcaselor apărătoare pe polizoare și circulare',
        'Purtarea ochelarilor de protecție împotriva așchiilor și a mănușilor antităiere',
        'Interzicerea montării pânzelor de circular pe polizoare unghiulare',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Căderea obiectelor, materialelor sau sculelor de la nivelurile superioare',
      manifestation: 'Lovire mecanică la cap sau corp prin cădere de scânduri, cărămizi, scule',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Montarea plaselor de siguranță de prindere perimetrale sub nivelurile de lucru',
        'Borduri de margine de minim 15 cm montate pe podinele de schelă',
        'Asigurarea sculelor de mână cu cordeline elastice de siguranță la lucrul la înălțime',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Prăbușirea pereților de pământ la săpături de fundații și șanțuri',
      manifestation: 'Surparea malurilor neconsolidate peste muncitorii aflați în șanț',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Sprijinirea obligatorie a malurilor săpăturilor cu adâncime de peste 1,0 m',
        'Depozitarea pământului excavat la o distanță minimă de 0,5 m de marginea șanțului',
        'Verificarea stabilității malurilor după ploi abundente înainte de coborâre',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Mersul înapoi și manevrele oarbe ale autocamioanelor și utilajelor grele',
      manifestation: 'Călcare sau strivire a pietonilor la mersul înapoi al basculantelor',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Sisteme funcționale de avertizare sonoră și optică la mersul înapoi pe toate utilajele',
        'Dirijarea obligatorie a camioanelor în incinta șantierului de către un pilot de sol',
        'Purtarea vestelor reflectorizante de înaltă vizibilitate clasa 3',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Atingerea liniilor electrice aeriene sau cablurilor îngropate',
      manifestation: 'Electrocutare prin contactul brațului automacaralei cu linia de înaltă tensiune',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Păstrarea distanței de siguranță de minim 5 m față de liniile aeriene neizolate',
        'Identificarea rețelelor subterane prin planuri și detectoare înainte de săpare',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Condiții meteorologice nefavorabile: temperaturi extreme, arșiță, polei, vânt',
      manifestation: 'Insolație, șoc termic, degerături sau alunecare pe suprafețe înghețate',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Aplicarea prevederilor OUG 99/2000 (ceai cald / apă minerală, pauze în containere climatizate)',
        'Oprirea lucrului la înălțime la vânt puternic (peste 11 m/s) sau polei',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Pulberi minerale în suspensie: siliciu cristalin, ciment, praf de zidărie',
      manifestation: 'Inhalare repetată la debitare BCA, cărămizi sau preparare mortare',
      consequences: 'INV gr.III',
      severity: 4,
      probability: 3,
      preventionMeasures: [
        'Tăierea umedă a cărămizilor sau utilizarea sculelor cu aspirație industrială',
        'Măști de protecție respiratorie cu filtru de particule FFP2 / FFP3',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Nivel ridicat de zgomot și vibrații de la picamere, ciocane rotopercutoare',
      manifestation: 'Zgomot peste 87 dB(A) cauzând hipoacuzie și sindrom mână-braț',
      consequences: 'INV gr.III',
      severity: 4,
      probability: 3,
      preventionMeasures: [
        'Purtarea obligatorie a antifoanelor externe pe durata operării sculelor percutante',
        'Utilizarea mănușilor antivibrații și rotația personalului la picamere',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '4120',
    industryName: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
    jobTitle: 'Zidar / Dulgher / Muncitor construcții',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * CAEN 4711 - Comerț cu amănuntul în magazine nespecializate (Supermarket / Retail)
 */
export const RISK_PROFILE_4711: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Deplasare pe căi de acces blocate de paleți sau cu pardoseli umede',
      manifestation: 'Alunecare pe lichide vărsate sau împiedicare de cutii lăsate pe culoare',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Încălțăminte de protecție cu talpă antiderapantă și bombeu ușor',
        'Semnalizarea imediată a zonelor umede și eliberarea promptă a căilor de evacuare',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Utilizarea neatentă a cutterelor la deschiderea cutiilor de marfă',
      manifestation: 'Tăiere a degetelor sau a palmei la secționarea benzilor de ambalare',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 5,
      preventionMeasures: [
        'Dotarea cu cuttere profesionale de siguranță cu lamă autorefractabilă',
        'Purtarea mănușilor de protecție mecanică antităiere',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Cădere de la mică înălțime la aranjarea mărfii pe rafturile superioare',
      manifestation: 'Pierderea echilibrului la folosirea scărilor mobile sau a lăzilor improvizate',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Utilizarea exclusivă a scărilor mobile cu platformă și trepte antiderapante',
        'Interzicerea urcării pe scaune, lăzi de plastic sau rafturi',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Nerespectarea normelor de igienă la manipularea produselor alimentare proaspete',
      manifestation: 'Contaminare a alimentelor perisabile prin contact direct neigienic',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Absolvirea cursurilor de igienă Modulul 1 conform Ordinului MS/ME 2209/4469/2022',
        'Purtarea halatelor curate, mănușilor de unică folosință și bonetelor în zonele de servire',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Manipulare manuală repetată a baxurilor grele de băuturi și conserve',
      manifestation: 'Ridicarea repetată a maselor de 10-20 kg la aprovizionarea rafturilor',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Utilizarea transpaletelor manuale sau electrice pentru deplasarea mărfii din depozit',
        'Așezarea mărfurilor foarte grele pe rafturile inferioare sau medii',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Efort static și mișcări repetitive asimetrice la casa de marcat',
      manifestation: 'Scanarea rapidă a produselor pe banda rulantă, solicitare lombară și a umărului',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Scaune ergonomice reglabile cu spătar înalt la postul de casier',
        'Alternarea postului de casier cu activități de aranjare la raft la fiecare 2 ore',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Stres relațional generat de conflicte verbale cu clienții dificili',
      manifestation: 'Tensiune psihică cauzată de comportamente agresive sau neînțelegeri la casă',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Instruirea personalului în tehnici de comunicare calmă și aplanare a conflictelor',
        'Sprijin imediat din partea agenților de securitate din magazin',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Manevrarea transpaletelor manuale și electrice în spațiul de vânzare',
      manifestation: 'Lovirea picioarelor lucrătorului sau strivire între transpaletă și raft',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Purtarea încălțămintei de protecție cu bombeu de oțel/compozit',
        'Limitarea vitezei de deplasare și acordarea priorității pietonilor',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Vitrine frigorifice electrice și rafturi iluminate sub tensiune',
      manifestation: 'Electrocutare indirectă prin carcasele metalice sau cabluri ciupite',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Verificări PRAM periodice și disjunctoare diferențiale de protecție',
        'Mentenanța tehnică periodică efectuată de electricieni autorizați',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Prăbușirea mărfurilor de pe rafturile înalte de depozitare',
      manifestation: 'Stivuire instabilă sau suprasolicitarea polițelor de raft metalic',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Ancorarea solidă a corpurilor de raft metalic și afișarea sarcinii maxime pe nivel',
        'Așezarea stabilă a cutiilor fără depășirea gabaritului raftului',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Prese de balotat carton și compactoare de deșeuri de ambalaje',
      manifestation: 'Prinderea mâinilor la introducerea cartoanelor în timpul ciclului de presare',
      consequences: 'INV gr.II',
      severity: 5,
      probability: 1,
      preventionMeasures: [
        'Sisteme de interblocare mecanică ce opresc presa la deschiderea ușii de alimentare',
        'Buton de oprire de urgență funcțional',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Diferențe de temperatură la intrarea în camerele frigorifice de depozitare',
      manifestation: 'Trecere bruscă de la +22°C în magazin la -20°C în congelator',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu jachete matlasate și căciuli termoizolante la intrarea în depozitul frigorific',
        'Limitarea timpului de expunere la 15 minute consecutive în camerele congelator',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Curenți de aer la ușile glisante automate de la intrarea în magazin',
      manifestation: 'Expunere continuă la curenți reci în sezonul de toamnă-iarnă la case',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Perdele de aer cald funcționale la toate intrările clienților',
        'Panouri paravânt transparente la casele de marcat apropiate de acces',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Iluminat artificial intens și reflectat de ambalaje lucioase',
      manifestation: 'Oboseală oculară și cefalee spre finalul programului de lucru',
      consequences: 'NEGLIJABILE',
      severity: 1,
      probability: 4,
      preventionMeasures: [
        'Corpuri de iluminat cu dispersor opal mat și nivel uniform de 500 lucși',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '4711',
    industryName: 'Comerț cu amănuntul în magazine nespecializate (produse alimentare)',
    jobTitle: 'Lucrător comercial / Casier',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * CAEN 4941 - Transporturi rutiere de mărfuri (Șofer autocamion / TIR)
 */
export const RISK_PROFILE_4941: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Conducerea autovehiculului pe fond de oboseală cronică sau depășirea timpilor legali',
      manifestation: 'Adormire la volan (microsomn) generând ieșire de pe carosabil sau coliziune',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Respectarea strictă a Regulamentului (CE) 561/2006 privind timpii de conducere și odihnă',
        'Efectuarea pauzelor obligatorii de 45 de minute la fiecare 4,5 ore de conducere',
        'Monitorizarea permanentă a tahografului digital și interzicerea conducerii peste limită',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Neimaginarea vitezei adecvate condițiilor de carosabil umed sau polei',
      manifestation: 'Derapare sau răsturnare a ansamblului tractor-semiremorcă în viraje',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Instruire periodică în conducere preventivă defensivă',
        'Echiparea vehiculului cu anvelope de iarnă conform condițiilor meteo',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Cădere la urcarea sau coborârea din cabina autocamionului sau de pe semiremorcă',
      manifestation: 'Alunecare pe treptele cabinei sau săritura de la înălțime cu luxații / fracturi',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Regula celor 3 puncte de sprijin la urcarea și coborârea din cabină',
        'Interzicerea săriturii din cabină sau de pe platforma semiremorcii',
        'Bocanci antiderapanți curați de noroi și gheață',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Asigurarea insuficientă a încărcăturii cu chingi de ancorare omologate',
      manifestation: 'Deplasarea mărfii la frânare bruscă deformând prelata sau dezechilibrând TIR-ul',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Utilizarea chingilor de ancorare conforme EN 12195-2, colțari și covorașe antiderapante',
        'Verificarea tensiunii chingilor după primii 20-30 km parcurși',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Intervenții sub vehicul fără asigurare mecanică contra deplasării accidentale',
      manifestation: 'Cedarea cricului hidraulic în timpul schimbării roții sau remedierilor',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Utilizarea obligatorie a calelor de blocare a roților la ambele punți',
        'Folosirea suporturilor metalice (capre) omologate la ridicarea vehiculului',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Efort static postural prelungit la volan în poziție neschimbată',
      manifestation: 'Menținerea poziției de conducere timp de 8-9 ore/zi cauzând tasare lombară',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Scaun pneumatic ergonomic cu amortizare reglabilă și suport lombar ajustabil',
        'Exerciții fizice ușoare de dezmorțire la fiecare oprire în parcare',
        'Control medical și psihologic anual obligatoriu conform reglementărilor rutiere',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Concentrare atențională continuă în condiții meteo dificile (ploaie, ceață, noapte)',
      manifestation: 'Oboseală vizuală severă și scăderea reflexelor la conducerea nocturnă',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Păstrarea parbrizului curat și înlocuirea periodică a lamelor ștergătoarelor',
        'Evitarea planificării curselor preponderent pe timp de noapte',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Stres cauzat de aglomerație în trafic, întârzieri la vămi sau la rampele de descărcare',
      manifestation: 'Presiune psihică legată de respectarea orarelor de descărcare la client',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Planificarea realistă a rutelor cu marje de siguranță pentru blocajele de trafic',
        'Comunicare eficientă prin dispecerat și sprijin continuu pentru echipaje',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Coliziuni rutiere cu alte autovehicule sau obstacole pe drumurile publice',
      manifestation: 'Impact violent la viteză mare generat de manevrele altor participanți la trafic',
      consequences: 'DECES',
      severity: 7,
      probability: 2,
      preventionMeasures: [
        'Purtarea permanentă a centurii de siguranță omologate',
        'Autovehicule dotate cu sisteme automate de asistență la frânare și menținere a benzii',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Explozie de pneu la viteză mare din cauza supraîncălzirii sau uzurii',
      manifestation: 'Pierderea bruscă a controlului direcției ansamblului articulat',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Verificarea zilnică a presiunii în pneuri și a stării carcasei anvelopelor',
        'Interzicerea folosirii anvelopelor cu profil sub limita legală pe punțile motoare și de direcție',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Manevrarea oblonului ridicător hidraulic la operațiunile de încărcare-descărcare',
      manifestation: 'Prinderea picioarelor sau căderea paletului de pe platforma oblonului',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Purtarea încălțămintei de protecție cu bombeu metalic',
        'Semnalizarea optică cu lămpi intermitente pe colțurile platformei hidraulice',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Incendiu provocat de blocarea franelor sau scurtcircuite electrice la bord',
      manifestation: 'Încălzirea discurilor de frână și aprinderea pneurilor pe semiremorcă',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Dotarea vehiculului cu două stingătoare cu pulbere P6 verificate la zi',
        'Verificarea temperaturii butucilor roților la fiecare oprire de traseu',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Vibrații ale întregului corp transmise prin șasiu și scaun pe carosabil denivelat',
      manifestation: 'Afectare cronică a coloanei vertebrale și a sistemului digestiv',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Mentenanța suspensiei pneumatice a cabinei și a scaunului șoferului',
        'Ajustarea amortizării scaunului în concordanță cu greutatea conducătorului auto',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Disconfort termic în cabină în timpul staționării pe timp de vară sau iarnă',
      manifestation: 'Căldură excesivă sau frig sever pe durata perioadelor de odihnă în parcări',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu instalație autonomă de climatizare în staționare (aer condiționat de parcare)',
        'Sistem de încălzire auxiliară independentă (sirocou) verificat periodic',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Nivel constant de zgomot în cabină generat de motor și rularea pe carosabil',
      manifestation: 'Zgomot de fond de 70-76 dB(A) cauzând oboseală și diminuarea vigilenței',
      consequences: 'NEGLIJABILE',
      severity: 1,
      probability: 4,
      preventionMeasures: [
        'Izolare fonică performantă a compartimentului motor și a cabinei',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '4941',
    industryName: 'Transporturi rutiere de mărfuri',
    jobTitle: 'Conducător auto transport rutier marfă (TIR / Camion)',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * CAEN 7022 - Activități de consultanță pentru afaceri și management (Consultant / TESA)
 */
export const RISK_PROFILE_7022: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Deplasare pe scări și pardoseli netede în clădirile de birouri',
      manifestation: 'Alunecare pe pardoseli ceruite, împiedicare pe trepte sau cabluri',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Păstrarea căilor de circulație degajate și utilizarea încălțămintei cu talpă aderentă',
        'Montarea benzilor antiderapante pe muchiile treptelor',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Nerespectarea posturii corecte la lucrul prelungit pe laptop în deplasare',
      manifestation: 'Menținerea capului aplecat înainte fără suport la sesiunile prelungite',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Utilizarea standurilor de ridicare a laptopului și tastaturi externe portabile',
        'Pauze orare de relaxare și exerciții de mobilitate cervicală',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Deplasări rutiere frecvente între sediu și clienți în calitate de șofer / pasager',
      manifestation: 'Accidente de circulație în traficul urban sau pe drumuri naționale',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Conducere prudentă defensivă și purtarea permanentă a centurii de siguranță',
        'Interzicerea utilizării telefonului mobil fără sistem hands-free',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Intervenții neavizate la prize electrice sau echipamente de birou',
      manifestation: 'Conectare forțată a ștecherelor sau folosirea cablurilor deteriorate',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Anunțarea departamentului administrativ la apariția oricărei defecțiuni electrice',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Efort static prelungit în poziție așezat în birou și săli de ședință',
      manifestation: 'Menținerea poziției așezate în ședințe de peste 3-4 ore consecutive',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu scaune ergonomice reglabile și pauze active între întâlniri',
        'Alternarea posturii prin stații de lucru reglabile pe înălțime',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Suprasolicitare psihică și responsabilitate decizională ridicată',
      manifestation: 'Stres profesional legat de termene stricte și consultanță financiară/strategicǎ',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Managementul echilibrat al timpului și delegarea sarcinilor',
        'Pauze de deconectare mentală și politici de wellness la nivel de companie',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Solicitare vizuală intensivă prin analiză continuă de rapoarte și cifre',
      manifestation: 'Oboseală oculară, uscăciune oculară cauzată de concentrarea pe ecrane',
      consequences: 'INV gr.III',
      severity: 4,
      probability: 3,
      preventionMeasures: [
        'Ecrane profesionale cu filtru de protecție a luminii albastre (flicker-free)',
        'Control oftalmologic anual prin medicina muncii',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Electrocutare la utilizarea echipamentelor IT și de birou (PC, imprimante)',
      manifestation: 'Defect de izolație sau cabluri presate de picioarele mobilierului',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Măsurători PRAM semestriale și protecție cu disjunctor diferențial',
        'Rularea cablurilor exclusiv prin jgheaburi sau canaline speciale',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Lovire de colțurile ascuțite ale birourilor sau ale corpurilor de dulap',
      manifestation: 'Traumatisme ușoare la trecerea prin zone înguste între birouri',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 2,
      preventionMeasures: [
        'Mobilier ergonomic cu muchii rotunjite și spații generoase de circulație',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Incendiu provocat de echipamente electrice lăsate pornite nesupravegheate',
      manifestation: 'Supraîncălzire alimentatoare sau distrugătoare de documente',
      consequences: 'DECES',
      severity: 7,
      probability: 1,
      preventionMeasures: [
        'Oprirea echipamentelor periferice la terminarea programului de lucru',
        'Dotarea cu stingătoare portabile CO2 verificate periodic',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Climat interior necorespunzător: aer uscat și curenți de aer de la climatizare',
      manifestation: 'Afecțiuni respiratorii sau uscăciune oculară cauzată de fluxul direct de aer rece',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Igienizarea periodică a filtrelor instalațiilor de aer condiționat',
        'Reglarea optimă a temperaturii la 22°C - 23°C',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Zgomot de fond în birourile de tip open-space',
      manifestation: 'Dificultăți de concentrare cauzate de discuțiile telefonice ale colegilor',
      consequences: 'NEGLIJABILE',
      severity: 1,
      probability: 4,
      preventionMeasures: [
        'Montarea panourilor fonoabsorbante despărțitoare între birouri',
        'Utilizarea căștilor cu anulare activă a zgomotului (ANC)',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Calitatea aerului interior în săli de ședință aglomerate (acumulare CO2)',
      manifestation: 'Somnolență și scăderea capacității de analiză în întâlnirile lungi',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 2,
      preventionMeasures: [
        'Ventilație mecanică cu aport de aer proaspăt și aerisire naturală la fiecare oră',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '7022',
    industryName: 'Activități de consultanță pentru afaceri și management',
    jobTitle: 'Consultant management / Economist / TESA',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * CAEN 8621 - Activități de asistență medicală generală (Medic / Asistent medical)
 */
export const RISK_PROFILE_8621: CaenRiskProfile = (() => {
  const rawFactors: Omit<RiskPresetItem, 'riskLevel'>[] = [
    // 1. EXECUTANT
    {
      element: 'EXECUTANT',
      riskFactor: 'Înțepare accidentală cu ace de seringă sau tăiere cu bisturiul contaminat',
      manifestation: 'Transmiterea agenților patogeni cu transmitere sanguină (VHB, VHC, HIV)',
      consequences: 'INV gr.I',
      severity: 6,
      probability: 2,
      preventionMeasures: [
        'Utilizarea dispozitivelor de puncție cu sistem de siguranță cu retragere automată a acului',
        'Interzicerea strictă a recapușonării acelor utilizate',
        'Depozitarea imediată a obiectelor tăietoare-înțepătoare în cutii rigide din plastic galben rezistente',
        'Vaccinarea gratuită împotriva virusului hepatitei B conform legislației sanitare',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Nerespectarea precauțiunilor universale și neutilizarea EIP biologic',
      manifestation: 'Contact al pielii lezate sau al mucoaselor cu sânge și lichide biologice',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Purtarea obligatorie a mănușilor de examinare din nitril la orice manoperă invazivă',
        'Utilizarea măștilor medicale chirurgicale sau FFP2 și a ochelarilor de protecție la recoltări',
        'Dezinfecția igienică a mâinilor cu frecare hidroalcoolică înainte și după fiecare pacient',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Deplasare pe pardoseli proaspăt dezinfectate pe holurile clinicii sau cabinet',
      manifestation: 'Alunecare și cădere la același nivel cu luxații sau fracturi',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Purtarea saboților medicali autoclavabili cu talpă antiderapantă și baretă de călcâi',
        'Semnalizarea cu panouri galbene de avertizare în timpul curățeniei și dezinfecției',
      ],
    },
    {
      element: 'EXECUTANT',
      riskFactor: 'Agresiune fizică sau verbală din partea pacienților agitați sau aparținătorilor',
      manifestation: 'Lovituri, mușcături sau traumatisme psihice în cursul consultațiilor',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Instalarea unui buton de panică conectat la dispeceratul de securitate în cabinet',
        'Instruirea personalului medical în tehnici de de-escaladare verbală a agresivității',
      ],
    },

    // 2. SARCINA DE MUNCĂ
    {
      element: 'SARCINA',
      riskFactor: 'Efort fizic la susținerea sau mobilizarea pacienților cu mobilitate redusă',
      manifestation: 'Suprasolicitare acută a coloanei vertebrale la transferul pacienților',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Dotarea cu canapele de consultație reglabile electric pe înălțime',
        'Mobilizarea pacienților dificili cu sprijinul asistentului medical auxiliar',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Tensiune neuropsihică intensă determinată de responsabilitatea actului medical',
      manifestation: 'Stres profesional și risc de sindrom de epuizare (burnout) prin volum mare de pacienți',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 5,
      preventionMeasures: [
        'Programarea echilibrată a consultațiilor cu timpi suficienți per pacient',
        'Asigurarea serviciilor de consiliere psihologică și suport profesional',
      ],
    },
    {
      element: 'SARCINA',
      riskFactor: 'Poziție aplecată asimetrică prelungită în timpul manoperelor clinice',
      manifestation: 'Dureri cervico-dorsale la recoltări, pansamente și examinări amănunțite',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 4,
      preventionMeasures: [
        'Scaune ergonomice rotative reglabile pe înălțime pentru medic și asistent',
        'Iluminat medical focalizat direcționabil (lampă scialitică)',
      ],
    },

    // 3. MIJLOACE DE PRODUCȚIE
    {
      element: 'MIJLOACE',
      riskFactor: 'Manipularea dezinfectanților chimici concentrați (biocide de nivel înalt)',
      manifestation: 'Iritații respiratorii sau stropire accidentală oculară la prepararea soluțiilor',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 3,
      preventionMeasures: [
        'Sisteme de dozare automată a soluțiilor dezinfectante în circuit închis',
        'Purtarea ochelarilor de protecție etanși și a mănușilor lungi la preparare',
        'Respectarea strictă a fișelor cu date de securitate ale biocidelor',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Aparatură medicală electrică de diagnostic și sterilizare (autoclav, ECG)',
      manifestation: 'Arsuri termice la deschiderea autoclavului sau electrocutare indirectă',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 2,
      preventionMeasures: [
        'Verificări periodice de securitate electrică conform standardului SR EN 62353',
        'Purtarea mănușilor termoizolante la descărcarea casoletelor din autoclav',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Lămpi bactericide cu radiație ultravioletă (UV-C) pentru dezinfecția aerului',
      manifestation: 'Expunere accidentală la radiații UV cauzând fotokeratită oculară acută și eritem',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 2,
      preventionMeasures: [
        'Cuplarea lămpilor UV directe cu senzori de prezență ce întrerup automat funcționarea',
        'Semnalizarea optică de avertizare la ușa cabinetului în timpul funcționării',
      ],
    },
    {
      element: 'MIJLOACE',
      riskFactor: 'Gestionarea deșeurilor medicale periculoase cu risc biologic (deșeuri tăietoare)',
      manifestation: 'Contaminare prin străpungerea sacilor galbeni sau manipulare neconformă',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 2,
      preventionMeasures: [
        'Respectarea strictă a circuitului deșeurilor medicale conform Ordinului MS 1226/2012',
        'Contractare cu operatori autorizați pentru neutralizarea deșeurilor periculoase',
      ],
    },

    // 4. MEDIUL DE MUNCĂ
    {
      element: 'MEDIU',
      riskFactor: 'Expunere la agenți biologici patogeni aeropurtați (virus gripal, SARS-CoV-2)',
      manifestation: 'Contaminare respiratorie prin picături Pflügge generate la tusea pacienților',
      consequences: 'ITM 45-180 zile',
      severity: 3,
      probability: 4,
      preventionMeasures: [
        'Purtarea măștilor de protecție respiratorie FFP2 în timpul consultului pacienților simptomatici',
        'Utilizarea purificatoarelor medicale de aer echipate cu filtre HEPA H14',
        'Asigurarea unui flux de ventilație mecanică adecvat conform normelor sanitare',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Mirosuri specifice de dezinfectanți și substanțe medicamentoase în cabinete',
      manifestation: 'Disconfort olfactiv, cefalee sau reacții alergice la expunere prelungită',
      consequences: 'ITM 3-45 zile',
      severity: 2,
      probability: 3,
      preventionMeasures: [
        'Aerisire naturală și mecanică continuă a cabinetelor medicale',
      ],
    },
    {
      element: 'MEDIU',
      riskFactor: 'Iluminat medical direcționat și contrast cu lumina ambientală',
      manifestation: 'Oboseală vizuală în timpul examinărilor detaliate',
      consequences: 'NEGLIJABILE',
      severity: 1,
      probability: 4,
      preventionMeasures: [
        'Iluminat general uniform de 500-1000 lucși combinat cu iluminare locală scialitică',
      ],
    },
  ];

  const factors: RiskPresetItem[] = rawFactors.map((rf) => ({
    ...rf,
    riskLevel: calculatePecePartialRisk(rf.severity, rf.probability),
  }));

  return {
    caenCode: '8621',
    industryName: 'Activități de asistență medicală generală',
    jobTitle: 'Medic medicină generală / Asistent medical',
    globalRiskScore: calculateGlobalRiskScore(factors),
    factors,
  };
})();

/**
 * Dicționar de profile de risc indexate după codul CAEN
 */
export const CAEN_RISK_PROFILES: Record<string, CaenRiskProfile> = {
  '6201': RISK_PROFILE_6201,
  '5610': RISK_PROFILE_5610,
  '4120': RISK_PROFILE_4120,
  '4711': RISK_PROFILE_4711,
  '4941': RISK_PROFILE_4941,
  '7022': RISK_PROFILE_7022,
  '8621': RISK_PROFILE_8621,
};

export const INCDPM_RISK_PROFILES = CAEN_RISK_PROFILES;

/**
 * Normalizare diacritice românești (atât virgulă sub literă cât și sedilă veche)
 * pentru potrivire robustă indiferent de tastatură sau dialect Unicode.
 */
function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Cuvinte-cheie operaționale/executive de teren (muncitori, producție, utilaje, șantier, bucătărie).
 * Dacă funcția conține oricare dintre acești termeni, postul este categoric OPERAȚIONAL
 * și NU trebuie clasificat ca administrativ/TESA, chiar dacă apare în titlu 'it' sau 'sef'.
 */
const OPERATIONAL_JOB_KEYWORDS = [
  'muncitor', 'tencuitor', 'instalator', 'ospatar', 'bucatar', 'sofer',
  'manipulant', 'zidar', 'dulgher', 'fierar', 'macaragiu', 'sudor',
  'mecanic', 'lacatus', 'electrician', 'zugrav', 'vopsitor', 'chelner',
  'barman', 'camerista', 'stivuitorist', 'magaziner', 'depozitar', 'paznic',
  'gardian', 'curier', 'tamplar', 'frezor', 'strungar', 'rectificator',
  'croitor', 'tesator', 'ambalator', 'hamal', 'spalator', 'curatitor',
  'hranitor', 'ingrijitor', 'ascutitor', 'distribuitor', 'conducator auto',
];

const OPERATIONAL_JOB_REGEX = new RegExp(
  '\\b(' + OPERATIONAL_JOB_KEYWORDS.join('|') + ')\\b',
  'i'
);

/**
 * Cuvinte-cheie administrative / TESA (birou, decizie, juridic, financiar, software/IT).
 * Se folosesc limite de cuvânt (\\b) pentru a evita coliziuni cu sufixe precum '-itor'.
 */
const ADMINISTRATIVE_JOB_KEYWORDS = [
  'director', 'administrator', 'manager', 'sef birou', 'contabil',
  'economist', 'secretar', 'secretara', 'asistent manager', 'functionar',
  'tesa', 'resurse umane', 'hr', 'jurist', 'consilier juridic',
  'programator', 'it', 'software', 'administrativ', 'office',
];

const ADMINISTRATIVE_JOB_REGEX = new RegExp(
  '\\b(' +
  ADMINISTRATIVE_JOB_KEYWORDS
    .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|') +
  ')\\b',
  'i'
);

/**
 * Verifică dacă o denumire de funcție aparține categoriei funcțiilor administrative / TESA.
 * Folosește un filtru binar de siguranță:
 *  1. Dacă postul conține termeni operaționali clari (muncitor, zidar, bucătar, etc.), returnează false.
 *  2. Dacă postul conține termeni administrativi cu limită de cuvânt, returnează true.
 *  3. Altfel, returnează false (principiul precauției SSM).
 */
export function isAdministrativeJobTitle(title?: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const clean = stripDiacritics(title.toLowerCase()).trim();
  if (!clean) return false;

  // Barieră 1: Excludere categorică roluri operaționale
  if (OPERATIONAL_JOB_REGEX.test(clean)) {
    return false;
  }

  // Barieră 2: Identificare roluri TESA / birou
  return ADMINISTRATIVE_JOB_REGEX.test(clean);
}

/**
 * Obține profilul de risc INCDPM Pece pentru un cod CAEN și opțional funcția salariatului.
 * Dacă funcția este de natură administrativă (birou / TESA), chiar și într-o firmă de construcții
 * sau restaurant, se adaptează automat profilul la riscurile activității de birou (CAEN 7022/6201).
 * Dacă codul CAEN nu are un profil dedicat, se returnează profilul general de consultanță / birou (7022).
 */
export function getRiskProfileForCaen(caenCode: string | number | unknown, jobTitle?: string): CaenRiskProfile {
  let cleanCode = '';
  const rawStr = String(caenCode ?? '').trim();
  if (rawStr && rawStr !== '[object Object]') {
    const match4 = rawStr.match(/\b\d{4}\b/);
    if (match4) {
      cleanCode = match4[0];
    } else {
      const matchDotted = rawStr.match(/\b(\d{2})\.(\d{2})\b/);
      cleanCode = matchDotted ? matchDotted[1] + matchDotted[2] : rawStr.replace(/[^0-9]/g, '').trim();
    }
  }

  // Dacă postul este clar administrativ / birou, oferim profilul adaptat TESA
  if (jobTitle && isAdministrativeJobTitle(jobTitle) && cleanCode !== '6201') {
    return {
      ...RISK_PROFILE_7022,
      caenCode: cleanCode || '7022',
      jobTitle: jobTitle,
    };
  }

  // Căutare profil exact în registrul preconfigurat
  const exactProfile = CAEN_RISK_PROFILES[cleanCode];
  if (exactProfile) {
    if (jobTitle) {
      return {
        ...exactProfile,
        jobTitle,
      };
    }
    return exactProfile;
  }

  // Fallback: profil generic de birou / consultanță (7022) cu scor acceptabil <= 3.50
  return {
    ...RISK_PROFILE_7022,
    caenCode: cleanCode || '7022',
    industryName: 'Activități generale de birou și administrare afaceri',
    jobTitle: jobTitle || 'Funcționar administrativ / Personal TESA',
  };
}
