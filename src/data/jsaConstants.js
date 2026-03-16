// ═══════════════════════════════════════════════════════════════
//  EBC-OS · JSA (Job Safety Analysis) Constants & Seed Data
//  Based on OSHA 3071, AWCI Safe Work Practices, CPWR guidelines
// ═══════════════════════════════════════════════════════════════

import { isDemoMode } from "./defaults";
const _demo = isDemoMode();

// ── PPE Types ──
export const PPE_ITEMS = [
  { key: "hard_hat", label: "Hard Hat", labelEs: "Casco", icon: "🪖" },
  { key: "safety_glasses", label: "Safety Glasses", labelEs: "Lentes de Seguridad", icon: "🥽" },
  { key: "face_shield", label: "Face Shield", labelEs: "Careta", icon: "🛡️" },
  { key: "hi_vis", label: "Hi-Vis Vest", labelEs: "Chaleco Reflectante", icon: "🦺" },
  { key: "safety_boots", label: "Safety-Toe Boots", labelEs: "Botas de Seguridad", icon: "🥾" },
  { key: "hearing", label: "Hearing Protection", labelEs: "Protección Auditiva", icon: "🎧" },
  { key: "fall_harness", label: "Fall Harness + Lanyard", labelEs: "Arnés + Línea de Vida", icon: "🪢" },
  { key: "respirator_n95", label: "N95 Respirator", labelEs: "Respirador N95", icon: "😷" },
  { key: "respirator_half", label: "Half-Face Respirator", labelEs: "Respirador Media Cara", icon: "😷" },
  { key: "gloves_cut", label: "Cut-Resistant Gloves", labelEs: "Guantes Anti-Corte", icon: "🧤" },
  { key: "gloves_leather", label: "Leather Gloves", labelEs: "Guantes de Cuero", icon: "🧤" },
  { key: "welding_hood", label: "Welding Hood", labelEs: "Careta de Soldar", icon: "⚡" },
  { key: "knee_pads", label: "Knee Pads", labelEs: "Rodilleras", icon: "🦵" },
  { key: "dust_mask", label: "Dust Mask", labelEs: "Mascarilla", icon: "😷" },
];

// ── Risk Matrix (5×5) ──
// Likelihood: 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
// Severity: 1=Insignificant, 2=Minor, 3=Moderate, 4=Major, 5=Fatal/Catastrophic
export const RISK_LIKELIHOOD = [
  { val: 1, label: "Rare", labelEs: "Raro", desc: "Could happen but almost never" },
  { val: 2, label: "Unlikely", labelEs: "Improbable", desc: "Not expected but possible" },
  { val: 3, label: "Possible", labelEs: "Posible", desc: "Could occur occasionally" },
  { val: 4, label: "Likely", labelEs: "Probable", desc: "Will probably occur" },
  { val: 5, label: "Almost Certain", labelEs: "Casi Seguro", desc: "Expected to occur" },
];
export const RISK_SEVERITY = [
  { val: 1, label: "Insignificant", labelEs: "Insignificante", desc: "No injury" },
  { val: 2, label: "Minor", labelEs: "Menor", desc: "First aid only" },
  { val: 3, label: "Moderate", labelEs: "Moderado", desc: "Medical treatment, lost time" },
  { val: 4, label: "Major", labelEs: "Mayor", desc: "Serious injury, hospitalization" },
  { val: 5, label: "Catastrophic", labelEs: "Catastrófico", desc: "Fatal or permanent disability" },
];
export function riskColor(score) {
  if (score <= 4) return { bg: "#10b981", label: "Low" };
  if (score <= 9) return { bg: "#eab308", label: "Medium" };
  if (score <= 15) return { bg: "#f97316", label: "High" };
  return { bg: "#ef4444", label: "Critical" };
}

// ── OSHA Hazard Categories ──
export const HAZARD_CATEGORIES = [
  { key: "fall", label: "Fall", labelEs: "Caída", color: "#ef4444" },
  { key: "struck_by", label: "Struck-By", labelEs: "Golpeado por", color: "#f97316" },
  { key: "caught_between", label: "Caught-Between", labelEs: "Atrapamiento", color: "#dc2626" },
  { key: "electrical", label: "Electrical", labelEs: "Eléctrico", color: "#eab308" },
  { key: "ergonomic", label: "Ergonomic", labelEs: "Ergonómico", color: "#8b5cf6" },
  { key: "respiratory", label: "Respiratory", labelEs: "Respiratorio", color: "#06b6d4" },
  { key: "noise", label: "Noise", labelEs: "Ruido", color: "#6366f1" },
  { key: "laceration", label: "Laceration/Puncture", labelEs: "Corte/Punción", color: "#ec4899" },
  { key: "heat", label: "Heat/Cold", labelEs: "Calor/Frío", color: "#f59e0b" },
  { key: "slip_trip", label: "Slip/Trip", labelEs: "Resbalón/Tropiezo", color: "#14b8a6" },
  { key: "chemical", label: "Chemical", labelEs: "Químico", color: "#a855f7" },
  { key: "fire", label: "Fire/Burn", labelEs: "Fuego/Quemadura", color: "#ef4444" },
  { key: "other", label: "Other", labelEs: "Otro", color: "#94a3b8" },
];

// ── Control Hierarchy ──
export const CONTROL_HIERARCHY = [
  { key: "elimination", label: "Elimination", labelEs: "Eliminación", rank: 1, color: "#10b981", desc: "Remove the hazard entirely" },
  { key: "substitution", label: "Substitution", labelEs: "Sustitución", rank: 2, color: "#22c55e", desc: "Replace with less hazardous" },
  { key: "engineering", label: "Engineering", labelEs: "Ingeniería", rank: 3, color: "#3b82f6", desc: "Isolate workers from hazard" },
  { key: "administrative", label: "Administrative", labelEs: "Administrativo", rank: 4, color: "#f59e0b", desc: "Change how people work" },
  { key: "ppe", label: "PPE", labelEs: "EPP", rank: 5, color: "#ef4444", desc: "Personal protective equipment (last resort)" },
];

// ── Permit Types ──
export const PERMIT_TYPES = [
  { key: "hot_work", label: "Hot Work", labelEs: "Trabajo en Caliente" },
  { key: "confined_space", label: "Confined Space", labelEs: "Espacio Confinado" },
  { key: "loto", label: "Lock-Out / Tag-Out", labelEs: "Bloqueo / Etiquetado" },
  { key: "excavation", label: "Excavation", labelEs: "Excavación" },
  { key: "scaffold", label: "Scaffold", labelEs: "Andamio" },
  { key: "crane_lift", label: "Crane/Critical Lift", labelEs: "Grúa/Izaje Crítico" },
];

// ── Pre-Built Hazard Library by Trade ──
// Each entry: { hazard, category, likelihood, severity, controls[], controlType, ppe[] }
export const HAZARD_LIBRARY = {
  framing: [
    { hazard: "Lacerations from sharp metal stud edges", hazardEs: "Cortaduras por bordes filosos de montantes", category: "laceration", likelihood: 4, severity: 2, controls: ["Use cut-resistant gloves (Level A4+)", "Deburr cut edges", "Use proper metal snips"], controlType: "ppe", ppe: ["gloves_cut", "safety_glasses"] },
    { hazard: "Struck by falling studs or track", hazardEs: "Golpeado por montantes o rieles que caen", category: "struck_by", likelihood: 3, severity: 3, controls: ["Secure materials when staging", "Two-person carry for long pieces", "Hard hat required"], controlType: "administrative", ppe: ["hard_hat", "safety_boots"] },
    { hazard: "Ergonomic strain from repetitive fastening", hazardEs: "Tensión ergonómica por fijación repetitiva", category: "ergonomic", likelihood: 4, severity: 2, controls: ["Rotate tasks every 2 hours", "Use cordless tools to reduce strain", "Stretch breaks"], controlType: "administrative", ppe: [] },
    { hazard: "Powder-actuated tool discharge", hazardEs: "Descarga de herramienta accionada por pólvora", category: "struck_by", likelihood: 2, severity: 4, controls: ["Only certified operators", "Clear zone behind work area", "Test fire into approved material first"], controlType: "administrative", ppe: ["safety_glasses", "hearing", "hard_hat"] },
    { hazard: "Electrical contact in wall cavity", hazardEs: "Contacto eléctrico en cavidad de pared", category: "electrical", likelihood: 2, severity: 5, controls: ["Verify circuits de-energized (LOTO)", "Use voltage detector before cutting", "Coordinate with electrical trade"], controlType: "engineering", ppe: ["safety_glasses", "gloves_leather"] },
    { hazard: "Fall from scaffold or ladder", hazardEs: "Caída de andamio o escalera", category: "fall", likelihood: 3, severity: 4, controls: ["Inspect scaffold daily", "3-point contact on ladders", "Fall protection above 6 ft"], controlType: "engineering", ppe: ["fall_harness", "hard_hat", "safety_boots"] },
    { hazard: "Noise exposure from screw gun / saw", hazardEs: "Exposición al ruido por atornillador/sierra", category: "noise", likelihood: 4, severity: 2, controls: ["Hearing protection when using power tools", "Limit continuous exposure time"], controlType: "ppe", ppe: ["hearing"] },
    { hazard: "Metal dust / shavings in eyes", hazardEs: "Polvo/virutas de metal en los ojos", category: "respiratory", likelihood: 3, severity: 3, controls: ["Safety glasses at all times", "Face shield when grinding", "Keep work area clean"], controlType: "ppe", ppe: ["safety_glasses", "face_shield"] },
  ],
  drywall_hang: [
    { hazard: "Musculoskeletal injury lifting 4×12 sheets (70-100 lbs)", hazardEs: "Lesión musculoesquelética levantando hojas de 4×12 (70-100 lbs)", category: "ergonomic", likelihood: 4, severity: 3, controls: ["Use drywall lift/hoist for ceilings", "Two-person carry always", "Stage materials close to work area"], controlType: "engineering", ppe: ["gloves_leather", "safety_boots"] },
    { hazard: "Overhead strain — ceiling installation", hazardEs: "Tensión por trabajo en altura — instalación de techo", category: "ergonomic", likelihood: 4, severity: 3, controls: ["Mechanical lift mandatory for ceilings", "Rotate workers every 2 hours", "Use panel lifter"], controlType: "engineering", ppe: ["hard_hat", "safety_glasses"] },
    { hazard: "Fall from scaffold, stilts, or ladder", hazardEs: "Caída de andamio, zancos o escalera", category: "fall", likelihood: 3, severity: 4, controls: ["Fall protection above 6 ft", "Stilt training required", "Scaffold inspection daily"], controlType: "engineering", ppe: ["fall_harness", "hard_hat", "safety_boots"] },
    { hazard: "Silica dust from cutting drywall", hazardEs: "Polvo de sílice al cortar tablaroca", category: "respiratory", likelihood: 4, severity: 3, controls: ["Score and snap — minimize power cutting", "Wet cut or vacuum-attached saw", "N95 respirator minimum"], controlType: "engineering", ppe: ["respirator_n95", "safety_glasses"] },
    { hazard: "Utility knife laceration", hazardEs: "Cortadura con navaja/cutter", category: "laceration", likelihood: 4, severity: 2, controls: ["Use retractable blade knives only", "Cut away from body", "Replace dull blades immediately"], controlType: "administrative", ppe: ["gloves_cut"] },
    { hazard: "Struck by falling sheet or debris", hazardEs: "Golpeado por hoja o escombros que caen", category: "struck_by", likelihood: 3, severity: 3, controls: ["Secure sheets against wall", "Clear area below overhead work", "Hard hat in all areas"], controlType: "administrative", ppe: ["hard_hat", "safety_boots"] },
    { hazard: "Electrical contact — exposed wiring in wall", hazardEs: "Contacto eléctrico — cableado expuesto en pared", category: "electrical", likelihood: 2, severity: 5, controls: ["Confirm circuits de-energized", "Use non-conductive tools", "Coordinate with electricians"], controlType: "engineering", ppe: ["safety_glasses", "gloves_leather"] },
  ],
  drywall_finish: [
    { hazard: "Joint compound dust — respiratory exposure", hazardEs: "Polvo de compuesto de juntas — exposición respiratoria", category: "respiratory", likelihood: 5, severity: 3, controls: ["Use vacuum sander (dustless system)", "N95/P100 respirator required", "Ventilate work area"], controlType: "engineering", ppe: ["respirator_n95", "safety_glasses"] },
    { hazard: "Overhead sanding — ergonomic strain", hazardEs: "Lijado por encima de la cabeza — tensión ergonómica", category: "ergonomic", likelihood: 4, severity: 2, controls: ["Use pole sander", "Rotate workers every 2 hours", "Stretch breaks"], controlType: "administrative", ppe: ["hard_hat", "safety_glasses"] },
    { hazard: "Slip on wet/muddy compound on floor", hazardEs: "Resbalón por compuesto húmedo/lodoso en el piso", category: "slip_trip", likelihood: 3, severity: 2, controls: ["Keep floors clean — housekeeping", "Use drop cloths", "Clean spills immediately"], controlType: "administrative", ppe: ["safety_boots"] },
    { hazard: "Eye irritation from airborne dust", hazardEs: "Irritación ocular por polvo en el aire", category: "respiratory", likelihood: 4, severity: 2, controls: ["Safety glasses or goggles required", "Proper ventilation", "Vacuum sander"], controlType: "ppe", ppe: ["safety_glasses"] },
    { hazard: "Fall from stilts or scaffold", hazardEs: "Caída de zancos o andamio", category: "fall", likelihood: 3, severity: 4, controls: ["Stilt training and certification", "Level floor surface before stilt use", "Fall protection on scaffold"], controlType: "administrative", ppe: ["fall_harness", "hard_hat"] },
  ],
  act_ceiling: [
    { hazard: "Fall from ladder, scaffold, or lift", hazardEs: "Caída de escalera, andamio o elevador", category: "fall", likelihood: 3, severity: 4, controls: ["MEWP training required", "Proper ladder setup (4:1 ratio)", "Fall protection above 6 ft"], controlType: "engineering", ppe: ["fall_harness", "hard_hat", "safety_boots"] },
    { hazard: "Overhead ergonomic strain", hazardEs: "Tensión ergonómica por trabajo sobre la cabeza", category: "ergonomic", likelihood: 4, severity: 2, controls: ["Use ceiling grid lift tools", "Rotate tasks every 2 hours", "Stretch before and during work"], controlType: "administrative", ppe: ["hard_hat"] },
    { hazard: "Struck by falling grid or tiles", hazardEs: "Golpeado por rejilla o paneles que caen", category: "struck_by", likelihood: 3, severity: 3, controls: ["Secure staging above", "Hard hat in all areas", "Buddy system for long grid pieces"], controlType: "administrative", ppe: ["hard_hat", "safety_glasses", "safety_boots"] },
    { hazard: "Electrical contact in plenum space", hazardEs: "Contacto eléctrico en espacio del pleno", category: "electrical", likelihood: 2, severity: 5, controls: ["De-energize circuits above ceiling", "Voltage detector before entering plenum", "Coordinate with electrical"], controlType: "engineering", ppe: ["safety_glasses", "gloves_leather"] },
    { hazard: "Fiber/dust exposure from mineral fiber tiles", hazardEs: "Exposición a fibra/polvo de paneles de fibra mineral", category: "respiratory", likelihood: 3, severity: 2, controls: ["Wear respirator when cutting tiles", "Wet cut method", "Proper ventilation"], controlType: "ppe", ppe: ["respirator_n95", "safety_glasses"] },
    { hazard: "Pinch point — wire hanging / grid snapping", hazardEs: "Punto de pellizco — colgado de alambre / ajuste de rejilla", category: "caught_between", likelihood: 3, severity: 2, controls: ["Gloves when handling wire and grid", "Proper cutting tools", "Awareness of spring-loaded clips"], controlType: "ppe", ppe: ["gloves_cut", "safety_glasses"] },
  ],
  demolition: [
    { hazard: "Airborne dust — silica, lead, asbestos risk", hazardEs: "Polvo en el aire — riesgo de sílice, plomo, asbesto", category: "respiratory", likelihood: 4, severity: 4, controls: ["Air monitoring if ACM/lead suspected", "Half-face respirator with P100 filters", "Wet demolition methods", "HEPA vacuum"], controlType: "engineering", ppe: ["respirator_half", "safety_glasses", "gloves_leather"] },
    { hazard: "Struck by falling debris", hazardEs: "Golpeado por escombros que caen", category: "struck_by", likelihood: 4, severity: 4, controls: ["Exclusion zone below demo area", "Controlled removal sequence (top-down)", "Hard hat required"], controlType: "engineering", ppe: ["hard_hat", "safety_glasses", "safety_boots"] },
    { hazard: "Electrical shock — live wires in walls", hazardEs: "Descarga eléctrica — cables vivos en paredes", category: "electrical", likelihood: 3, severity: 5, controls: ["Verify LOTO before any demo", "Use voltage tester on each wall/ceiling", "Coordinate with electrical sub"], controlType: "engineering", ppe: ["safety_glasses", "gloves_leather"] },
    { hazard: "Noise exposure from demo tools", hazardEs: "Exposición al ruido por herramientas de demolición", category: "noise", likelihood: 5, severity: 2, controls: ["Hearing protection mandatory", "Limit continuous exposure", "Use quieter tools when possible"], controlType: "ppe", ppe: ["hearing"] },
    { hazard: "Laceration from nails, screws, sharp edges", hazardEs: "Cortaduras por clavos, tornillos, bordes afilados", category: "laceration", likelihood: 4, severity: 2, controls: ["Leather or cut-resistant gloves required", "Remove/bend nails as work progresses", "Proper disposal of debris"], controlType: "ppe", ppe: ["gloves_leather", "safety_boots"] },
    { hazard: "Trip hazard from debris on floor", hazardEs: "Peligro de tropiezo por escombros en el piso", category: "slip_trip", likelihood: 4, severity: 2, controls: ["Continuous housekeeping", "Designate debris staging area", "Clear walkways regularly"], controlType: "administrative", ppe: ["safety_boots"] },
    { hazard: "Structural instability during removal", hazardEs: "Inestabilidad estructural durante la remoción", category: "caught_between", likelihood: 2, severity: 5, controls: ["Competent person inspects before demo", "Shoring plan if load-bearing", "Remove in sequence per plan"], controlType: "engineering", ppe: ["hard_hat"] },
  ],
};

// ── Trade Labels ──
export const TRADE_LABELS = {
  framing: { label: "Metal Stud Framing", labelEs: "Estructura Metálica" },
  drywall_hang: { label: "Drywall Hanging", labelEs: "Colocación de Tablaroca" },
  drywall_finish: { label: "Drywall Finishing", labelEs: "Acabado de Tablaroca" },
  act_ceiling: { label: "ACT Ceiling", labelEs: "Plafón / Techo ACT" },
  demolition: { label: "Demolition", labelEs: "Demolición" },
};

// ── JSA Templates (pre-built for common EBC tasks) ──
export const JSA_TEMPLATES = [
  {
    id: "tmpl_framing_interior",
    trade: "framing",
    title: "Metal Stud Framing — Interior Partition Walls",
    titleEs: "Estructura Metálica — Paredes Divisorias Interiores",
    steps: [
      { step: "Layout and mark wall locations", stepEs: "Trazar y marcar ubicaciones de paredes", hazards: [0, 1] },
      { step: "Cut and install floor/ceiling track", stepEs: "Cortar e instalar riel de piso/techo", hazards: [0, 6] },
      { step: "Measure, cut, and install studs", stepEs: "Medir, cortar e instalar montantes", hazards: [0, 1, 6] },
      { step: "Install headers and cripples at openings", stepEs: "Instalar dinteles y montantes cortos en aberturas", hazards: [0, 2] },
      { step: "Fasten with screws / PAT", stepEs: "Fijar con tornillos / herramienta de pólvora", hazards: [2, 3, 6] },
      { step: "Install blocking and bracing", stepEs: "Instalar bloqueo y arriostrado", hazards: [0, 4, 5] },
    ],
    ppe: ["hard_hat", "safety_glasses", "safety_boots", "gloves_cut", "hearing", "hi_vis"],
    permits: [],
  },
  {
    id: "tmpl_drywall_walls",
    trade: "drywall_hang",
    title: "Drywall Hanging — Walls",
    titleEs: "Colocación de Tablaroca — Paredes",
    steps: [
      { step: "Stage and distribute drywall sheets", stepEs: "Organizar y distribuir hojas de tablaroca", hazards: [0, 5] },
      { step: "Measure and score/cut sheets", stepEs: "Medir y cortar hojas", hazards: [3, 4] },
      { step: "Position and lift sheet to wall", stepEs: "Posicionar y levantar hoja a la pared", hazards: [0, 5] },
      { step: "Fasten with drywall screws", stepEs: "Fijar con tornillos de tablaroca", hazards: [4] },
      { step: "Cut openings for outlets/switches", stepEs: "Cortar aberturas para contactos/apagadores", hazards: [4, 6] },
      { step: "Clean up scrap and debris", stepEs: "Limpiar restos y escombros", hazards: [5] },
    ],
    ppe: ["hard_hat", "safety_glasses", "safety_boots", "gloves_leather", "dust_mask", "hi_vis"],
    permits: [],
  },
  {
    id: "tmpl_drywall_ceiling",
    trade: "drywall_hang",
    title: "Drywall Hanging — Ceilings",
    titleEs: "Colocación de Tablaroca — Techos",
    steps: [
      { step: "Set up scaffold / drywall lift", stepEs: "Instalar andamio / elevador de tablaroca", hazards: [2] },
      { step: "Load sheet onto lift", stepEs: "Cargar hoja en el elevador", hazards: [0, 1] },
      { step: "Raise and position sheet overhead", stepEs: "Elevar y posicionar hoja sobre la cabeza", hazards: [1, 2, 5] },
      { step: "Fasten sheet to framing", stepEs: "Fijar hoja a la estructura", hazards: [1] },
      { step: "Cut and fit around fixtures", stepEs: "Cortar y ajustar alrededor de accesorios", hazards: [3, 6] },
    ],
    ppe: ["hard_hat", "safety_glasses", "safety_boots", "gloves_leather", "dust_mask", "fall_harness", "hi_vis"],
    permits: [],
  },
  {
    id: "tmpl_finishing",
    trade: "drywall_finish",
    title: "Drywall Taping, Mudding & Sanding",
    titleEs: "Cinta, Masilla y Lijado de Tablaroca",
    steps: [
      { step: "Apply tape and first coat of compound", stepEs: "Aplicar cinta y primera capa de compuesto", hazards: [1] },
      { step: "Apply second and third coats", stepEs: "Aplicar segunda y tercera capas", hazards: [1, 2] },
      { step: "Sand joints and surfaces", stepEs: "Lijar juntas y superficies", hazards: [0, 1, 3] },
      { step: "Touch-up and inspect finish", stepEs: "Retoque e inspección del acabado", hazards: [2, 4] },
      { step: "Clean up compound and dust", stepEs: "Limpiar compuesto y polvo", hazards: [2] },
    ],
    ppe: ["safety_glasses", "respirator_n95", "safety_boots", "gloves_leather", "hi_vis"],
    permits: [],
  },
  {
    id: "tmpl_act",
    trade: "act_ceiling",
    title: "ACT Grid & Tile Installation",
    titleEs: "Instalación de Rejilla y Panel ACT",
    steps: [
      { step: "Layout grid lines and install wall angle", stepEs: "Trazar líneas de rejilla e instalar ángulo de pared", hazards: [0, 5] },
      { step: "Install hanger wires from structure", stepEs: "Instalar alambres de suspensión de la estructura", hazards: [0, 3] },
      { step: "Install main runners and cross tees", stepEs: "Instalar corredores principales y tees transversales", hazards: [0, 2, 5] },
      { step: "Level and align grid system", stepEs: "Nivelar y alinear sistema de rejilla", hazards: [1] },
      { step: "Cut and install ceiling tiles", stepEs: "Cortar e instalar paneles de techo", hazards: [1, 4] },
      { step: "Install light fixtures and diffusers in grid", stepEs: "Instalar luminarias y difusores en rejilla", hazards: [0, 3] },
    ],
    ppe: ["hard_hat", "safety_glasses", "safety_boots", "gloves_cut", "hi_vis", "fall_harness"],
    permits: [],
  },
  {
    id: "tmpl_demo",
    trade: "demolition",
    title: "Interior Demolition — Walls & Ceilings",
    titleEs: "Demolición Interior — Paredes y Techos",
    steps: [
      { step: "Pre-demo inspection (electrical, plumbing, hazmat)", stepEs: "Inspección pre-demolición (eléctrico, plomería, materiales peligrosos)", hazards: [2, 6] },
      { step: "De-energize and verify LOTO", stepEs: "Desenergizar y verificar bloqueo/etiquetado", hazards: [2] },
      { step: "Set up containment / dust barriers", stepEs: "Instalar contención / barreras de polvo", hazards: [0] },
      { step: "Remove ceiling tiles and grid", stepEs: "Retirar paneles y rejilla de techo", hazards: [1, 3] },
      { step: "Remove drywall from walls", stepEs: "Retirar tablaroca de paredes", hazards: [0, 1, 4] },
      { step: "Remove metal framing", stepEs: "Retirar estructura metálica", hazards: [0, 1, 4] },
      { step: "Debris removal and cleanup", stepEs: "Remoción de escombros y limpieza", hazards: [3, 5] },
    ],
    ppe: ["hard_hat", "safety_glasses", "safety_boots", "gloves_leather", "respirator_half", "hearing", "hi_vis"],
    permits: ["loto"],
  },
];

// ── Seed JSAs ──
const _demoJSAs = [
  {
    id: "jsa_1",
    projectId: 1,
    templateId: "tmpl_framing_interior",
    title: "Metal Stud Framing — Brunello Cucinelli Level 2",
    trade: "framing",
    location: "Level 2 — Retail Space",
    date: "2026-03-14",
    shift: "day",
    weather: "clear",
    supervisor: "Oscar Ramirez",
    competentPerson: "Oscar Ramirez",
    status: "active", // draft | active | closed
    steps: [
      {
        id: "s1", step: "Layout and mark wall locations", hazards: [
          { hazard: "Lacerations from sharp metal stud edges", category: "laceration", likelihood: 4, severity: 2, controls: ["Use cut-resistant gloves (Level A4+)", "Deburr cut edges"], controlType: "ppe" },
        ],
      },
      {
        id: "s2", step: "Cut and install floor/ceiling track", hazards: [
          { hazard: "Lacerations from sharp metal stud edges", category: "laceration", likelihood: 4, severity: 2, controls: ["Cut-resistant gloves", "Deburr edges"], controlType: "ppe" },
          { hazard: "Noise exposure from screw gun / saw", category: "noise", likelihood: 4, severity: 2, controls: ["Hearing protection when using power tools"], controlType: "ppe" },
        ],
      },
      {
        id: "s3", step: "Measure, cut, and install studs", hazards: [
          { hazard: "Struck by falling studs or track", category: "struck_by", likelihood: 3, severity: 3, controls: ["Secure materials", "Two-person carry", "Hard hat"], controlType: "administrative" },
          { hazard: "Lacerations from sharp metal stud edges", category: "laceration", likelihood: 4, severity: 2, controls: ["Cut-resistant gloves"], controlType: "ppe" },
        ],
      },
      {
        id: "s4", step: "Fasten with screws / PAT", hazards: [
          { hazard: "Powder-actuated tool discharge", category: "struck_by", likelihood: 2, severity: 4, controls: ["Only certified operators", "Clear zone behind work area"], controlType: "administrative" },
          { hazard: "Noise exposure from screw gun / saw", category: "noise", likelihood: 4, severity: 2, controls: ["Hearing protection mandatory"], controlType: "ppe" },
        ],
      },
    ],
    ppe: ["hard_hat", "safety_glasses", "safety_boots", "gloves_cut", "hearing", "hi_vis"],
    permits: [],
    crewSignOn: [
      { employeeId: 5, name: "Oscar Ramirez", signedAt: "2026-03-14T06:30:00" },
      { employeeId: 6, name: "Marco Lopez", signedAt: "2026-03-14T06:31:00" },
      { employeeId: 7, name: "Diego Herrera", signedAt: "2026-03-14T06:31:00" },
    ],
    toolboxTalk: { topic: "Focus Four: Fall Protection", notes: "Reviewed 100% tie-off policy for scaffold work above 6 ft.", discussed: true },
    nearMisses: [],
    createdAt: "2026-03-14T06:00:00",
    createdBy: "admin",
    audit: [],
  },
];

export const initJSAs = _demo ? _demoJSAs : [];

// ── Weather conditions affecting JSA ──
export const WEATHER_HAZARD_MAP = {
  thunderstorm: { hazard: "Lightning strike risk / wet surfaces", hazardEs: "Riesgo de rayo / superficies mojadas", category: "electrical", ppe: [] },
  heat: { hazard: "Heat illness — monitor for signs of heat stroke", hazardEs: "Enfermedad por calor — monitorear signos de golpe de calor", category: "heat", ppe: [] },
  freeze: { hazard: "Hypothermia / ice on surfaces", hazardEs: "Hipotermia / hielo en superficies", category: "heat", ppe: [] },
  wind: { hazard: "Unsecured materials / impaired balance at height", hazardEs: "Materiales sueltos / equilibrio afectado en altura", category: "fall", ppe: ["fall_harness"] },
  rain: { hazard: "Slip hazard / reduced visibility", hazardEs: "Peligro de resbalón / visibilidad reducida", category: "slip_trip", ppe: ["safety_boots"] },
};
