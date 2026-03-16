// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Assembly Library — Detailed Component Breakdowns
//  Eagles Brothers Constructors · Houston, TX
//
//  30 common commercial drywall/framing assemblies with full
//  bill-of-materials per unit (LF or SF).
//
//  Quantities are per 1 LF of wall (assuming 10' height where
//  applicable) or per 1 SF of ceiling/area assembly.
//
//  UL Design references are approximate — always verify against
//  the project-specific UL listing or GA file number.
// ═══════════════════════════════════════════════════════════════

export const ASSEMBLY_LIBRARY = [

  // ────────────────────────────────────────────────────────────
  //  STANDARD INTERIOR PARTITIONS
  // ────────────────────────────────────────────────────────────

  {
    code: "WA-358-25",
    name: '3-5/8" 25ga Standard Partition',
    category: "Standard Partition",
    unit: "LF",
    description:
      'Non-rated interior partition. 3-5/8" 25ga studs @ 16" OC, one layer 1/2" regular GWB each side. Typical office, closet, and storage walls.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC = 0.75 studs/LF' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '1/2" Regular GWB (4x10)', qty: 2.0, unit: "SF", note: "Side 1 — 1 layer x 10\' = 10 SF, per LF" },
      { material: '1/2" Regular GWB (4x10)', qty: 2.0, unit: "SF", note: "Side 2 — same" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 16, unit: "EA", note: "~8 per side per LF at 12\" OC vert" },
      { material: "Paper-Faced Corner Bead", qty: 0.1, unit: "LF", note: "Allowance for outside corners" },
      { material: "Joint Compound (All-Purpose)", qty: 0.02, unit: "GAL", note: "L4 finish both sides" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Joints both sides" },
    ],
    notes:
      "Most common partition in commercial office TI. Not fire-rated. 10' baseline height.",
  },

  {
    code: "WA-358-20",
    name: '3-5/8" 20ga Heavy-Gauge Partition',
    category: "Standard Partition",
    unit: "LF",
    description:
      'Non-rated interior partition with 20ga studs for taller walls (10\'-14\'). 3-5/8" 20ga studs @ 16" OC, one layer 5/8" GWB each side.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Regular GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — 1 layer" },
      { material: '5/8" Regular GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — 1 layer" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Paper-Faced Corner Bead", qty: 0.1, unit: "LF", note: "Allowance" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Joints both sides" },
    ],
    notes:
      "Used for walls 10'-14' or where additional stud strength is needed. Common in corridors.",
  },

  {
    code: "WA-250-25",
    name: '2-1/2" 25ga Chase/Filler Partition',
    category: "Standard Partition",
    unit: "LF",
    description:
      'Narrow non-rated partition. 2-1/2" 25ga studs @ 16" OC, one layer 1/2" GWB each side. Used for pipe chases, column furring, and narrow spaces.',
    components: [
      { material: '2-1/2" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '2-1/2" Floor Track', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '2-1/2" Ceiling Track', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '1/2" Regular GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1" },
      { material: '1/2" Regular GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Joint Compound (All-Purpose)", qty: 0.02, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Max height ~10' with 25ga. Common for pipe chases and column wraps.",
  },

  {
    code: "WA-600-20",
    name: '6" 20ga Standard Partition',
    category: "Standard Partition",
    unit: "LF",
    description:
      'Non-rated 6" deep partition. 20ga studs @ 16" OC, one layer 5/8" GWB each side. Used for plumbing walls, electrical rooms, or where deep cavity is required.',
    components: [
      { material: '6" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '6" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '6" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Regular GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1" },
      { material: '5/8" Regular GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Common plumbing wall. Often insulated for sound. Verify gauge for wall height.",
  },

  // ────────────────────────────────────────────────────────────
  //  FIRE-RATED WALLS
  // ────────────────────────────────────────────────────────────

  {
    code: "WF-1HR-358",
    name: '1-Hr Fire-Rated 3-5/8" Partition (UL U305/U419)',
    category: "Fire-Rated",
    unit: "LF",
    description:
      '1-hour fire-rated partition. 3-5/8" 25ga studs @ 16" OC, one layer 5/8" Type X GWB each side. UL U305 or U419 equivalent.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — 1 layer" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — 1 layer" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "8/side @ 12\" OC vert on edges, 16\" OC field" },
      { material: "Fire Caulk (Intumescent)", qty: 0.05, unit: "TUBE", note: "At top/bottom tracks and penetrations" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Joints both sides" },
    ],
    notes:
      "Most common fire-rated partition. Type X both sides. Fire caulk required at all penetrations and perimeter per firestop plan.",
  },

  {
    code: "WF-1HR-358-INS",
    name: '1-Hr Fire-Rated 3-5/8" w/ Insulation',
    category: "Fire-Rated",
    unit: "LF",
    description:
      '1-hour fire-rated partition with sound batt. 3-5/8" 25ga studs @ 16" OC, 5/8" Type X each side, R-11 batt insulation in cavity. STC ~45-50.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — 1 layer" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — 1 layer" },
      { material: 'R-11 Fiberglass Batt (3-1/2" x 15")', qty: 10.0, unit: "SF", note: "Full cavity fill" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Fire Caulk (Intumescent)", qty: 0.05, unit: "TUBE", note: "Perimeter and penetrations" },
      { material: "Acoustical Sealant", qty: 0.02, unit: "TUBE", note: "Top and bottom track, continuous bead" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Common in medical corridors and exam rooms requiring both fire rating and acoustic performance.",
  },

  {
    code: "WF-1HR-600",
    name: '1-Hr Fire-Rated 6" Partition',
    category: "Fire-Rated",
    unit: "LF",
    description:
      '1-hour fire-rated partition. 6" 20ga studs @ 16" OC, one layer 5/8" Type X GWB each side. R-19 insulation option. Plumbing walls, deeper cavity needed.',
    components: [
      { material: '6" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '6" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '6" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — 1 layer" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — 1 layer" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Fire Caulk (Intumescent)", qty: 0.05, unit: "TUBE", note: "Perimeter and penetrations" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Used where 6\" cavity is needed (plumbing, deep boxes). Add R-19 batt for STC ~50.",
  },

  {
    code: "WF-2HR-358",
    name: '2-Hr Fire-Rated 3-5/8" Partition (UL U411)',
    category: "Fire-Rated",
    unit: "LF",
    description:
      '2-hour fire-rated partition. 3-5/8" 20ga studs @ 16" OC, TWO layers 5/8" Type X GWB each side. UL Design U411 equivalent.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC — 20ga required for 2-hr' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — Layer 1 (base)" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — Layer 2 (face)" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — Layer 1 (base)" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — Layer 2 (face)" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Base layer both sides" },
      { material: "#8 x 1-5/8\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Face layer both sides — longer screw for double layer" },
      { material: "Fire Caulk (Intumescent)", qty: 0.08, unit: "TUBE", note: "All perimeters and penetrations" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish face layers only" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Face layer joints both sides" },
    ],
    notes:
      "Corridor separation, occupancy separation, stair enclosures. Stagger joints between layers min 12\". 20ga studs required.",
  },

  {
    code: "WF-2HR-600",
    name: '2-Hr Fire-Rated 6" Partition (UL U412)',
    category: "Fire-Rated",
    unit: "LF",
    description:
      '2-hour fire-rated 6" partition. 20ga studs @ 16" OC, two layers 5/8" Type X each side. Deep cavity for plumbing + fire rating.',
    components: [
      { material: '6" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC — 20ga required' },
      { material: '6" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '6" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — Layer 1" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — Layer 2" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — Layer 1" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — Layer 2" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Base layers" },
      { material: "#8 x 1-5/8\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Face layers" },
      { material: "Fire Caulk (Intumescent)", qty: 0.08, unit: "TUBE", note: "All perimeters and penetrations" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Face layer joints" },
    ],
    notes:
      "Occupancy separation with plumbing in wall. Common in hospital patient room separations at plumbing chase.",
  },

  {
    code: "WF-2HR-358-ASYM",
    name: '2-Hr Asymmetric Partition (2 layers fire side / 1 other)',
    category: "Fire-Rated",
    unit: "LF",
    description:
      '2-hour fire-rated from one side. 3-5/8" 20ga studs @ 16" OC, two layers 5/8" Type X on fire side, one layer Type X on other. UL U423/GA WP-3567 type.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Fire side — Layer 1 (base)" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Fire side — Layer 2 (face)" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Non-fire side — 1 layer" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Base layer fire side" },
      { material: "#8 x 1-5/8\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Face layer fire side" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Non-fire side single layer" },
      { material: "Fire Caulk (Intumescent)", qty: 0.06, unit: "TUBE", note: "All perimeters and penetrations" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Face layer joints" },
    ],
    notes:
      "Common at corridor-to-tenant demising. 2-hr rating from corridor side. Verify fire side orientation on drawings.",
  },

  // ────────────────────────────────────────────────────────────
  //  SHAFT WALLS
  // ────────────────────────────────────────────────────────────

  {
    code: "SW-1HR",
    name: '1-Hr Shaft Wall (UL U336/U347)',
    category: "Shaft Wall",
    unit: "LF",
    description:
      '1-hour shaft wall system. 2-1/2" C-H studs @ 24" OC, 1" Type X shaft liner on shaft side (friction-fit), one layer 5/8" Type X on room side.',
    components: [
      { material: '2-1/2" C-H (C-Shaped) Shaft Stud', qty: 0.50, unit: "EA", note: '@ 24" OC = 0.50/LF' },
      { material: "J-Track (Floor)", qty: 1.0, unit: "LF", note: "Floor J-runner" },
      { material: "J-Track (Ceiling)", qty: 1.0, unit: "LF", note: "Ceiling J-runner" },
      { material: '1" Type X Shaft Liner (24" wide)', qty: 10.0, unit: "SF", note: "Shaft side — friction fit into C-H studs" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Room side — screw attached" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Room side only — shaft liner is friction-fit" },
      { material: "Fire Caulk (Intumescent)", qty: 0.06, unit: "TUBE", note: "All perimeter joints" },
      { material: "Joint Compound (All-Purpose)", qty: 0.015, unit: "GAL", note: "Room side only" },
      { material: "Paper Joint Tape", qty: 1.5, unit: "LF", note: "Room side joints" },
    ],
    notes:
      "Elevator shafts, stair shafts, mechanical chases. One-side access — liner panels slide into C-H studs. No screw penetration on shaft side.",
  },

  {
    code: "SW-2HR",
    name: '2-Hr Shaft Wall (UL U336)',
    category: "Shaft Wall",
    unit: "LF",
    description:
      '2-hour shaft wall. 2-1/2" C-H studs @ 24" OC, 1" shaft liner on shaft side, two layers 5/8" Type X on room side.',
    components: [
      { material: '2-1/2" C-H (C-Shaped) Shaft Stud', qty: 0.50, unit: "EA", note: '@ 24" OC' },
      { material: "J-Track (Floor)", qty: 1.0, unit: "LF", note: "Floor J-runner" },
      { material: "J-Track (Ceiling)", qty: 1.0, unit: "LF", note: "Ceiling J-runner" },
      { material: '1" Type X Shaft Liner (24" wide)', qty: 10.0, unit: "SF", note: "Shaft side — friction fit" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Room side — Layer 1" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Room side — Layer 2" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Base layer room side" },
      { material: "#8 x 1-5/8\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Face layer room side" },
      { material: "Fire Caulk (Intumescent)", qty: 0.08, unit: "TUBE", note: "All perimeter joints" },
      { material: "Joint Compound (All-Purpose)", qty: 0.015, unit: "GAL", note: "Room side face layer" },
      { material: "Paper Joint Tape", qty: 1.5, unit: "LF", note: "Room side joints" },
    ],
    notes:
      "Elevator and stair shafts requiring 2-hr rating. Common in high-rise medical and commercial. Verify C-H stud size with shaft height.",
  },

  // ────────────────────────────────────────────────────────────
  //  FURRING & SOFFIT
  // ────────────────────────────────────────────────────────────

  {
    code: "FUR-HAT",
    name: 'Hat Channel Furring (1-5/8" on Concrete/CMU)',
    category: "Furring",
    unit: "SF",
    description:
      'Furring on existing concrete or CMU wall. 1-5/8" hat channels @ 16" OC with powder-actuated fasteners, one layer GWB.',
    components: [
      { material: '1-5/8" Hat Channel (Furring Strip)', qty: 0.75, unit: "LF", note: '@ 16" OC horizontal = 0.75 LF per SF' },
      { material: "Powder-Actuated Fasteners (Ramset)", qty: 0.5, unit: "EA", note: "PAF @ 24\" OC into concrete/CMU" },
      { material: '5/8" Type X GWB (4x8 or 4x10)', qty: 1.0, unit: "SF", note: "One layer" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 1.0, unit: "EA", note: "Into hat channel" },
      { material: "Joint Compound (All-Purpose)", qty: 0.004, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 0.25, unit: "LF", note: "Per SF of wall" },
    ],
    notes:
      "Common in below-grade or tilt-wall buildings. No stud framing — direct furring on structure. Add insulation board behind for thermal break if needed.",
  },

  {
    code: "FUR-STUD",
    name: '1-1/2" Stud Furring on Concrete/CMU',
    category: "Furring",
    unit: "SF",
    description:
      'Stud furring on existing wall. 1-1/2" steel studs @ 16" OC, one layer GWB. Creates deeper cavity for insulation or MEP routing.',
    components: [
      { material: '1-1/2" 25ga Steel Stud', qty: 0.10, unit: "EA", note: '@ 16" OC (10\' stud = 10 SF coverage, 0.75 studs/LF wall)' },
      { material: '1-1/2" Floor Track', qty: 0.10, unit: "LF", note: "Bottom track per SF" },
      { material: '1-1/2" Ceiling Track', qty: 0.10, unit: "LF", note: "Top track per SF" },
      { material: '5/8" Type X GWB (4x10)', qty: 1.0, unit: "SF", note: "One layer" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 1.0, unit: "EA", note: "Per SF" },
      { material: "Joint Compound (All-Purpose)", qty: 0.004, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 0.25, unit: "LF", note: "Per SF" },
    ],
    notes:
      "Creates space for insulation behind GWB on concrete/CMU walls. Common in medical for thermal and acoustic.",
  },

  {
    code: "SOF-1",
    name: "Drywall Soffit / Furr-Down",
    category: "Soffit",
    unit: "LF",
    description:
      'Framed soffit/furr-down at ceiling level. 3-5/8" studs or 1-5/8" hat channel framed from structure, one layer 5/8" GWB on bottom and face. Typical 12"-24" drop.',
    components: [
      { material: '3-5/8" 25ga Steel Stud (vert hanger)', qty: 0.75, unit: "EA", note: "Vertical members @ 16\" OC" },
      { material: '3-5/8" Track', qty: 2.0, unit: "LF", note: "Top track (to structure) and bottom track" },
      { material: '5/8" Type X GWB', qty: 4.0, unit: "SF", note: "Bottom face (2' wide typical)" },
      { material: '5/8" Type X GWB', qty: 2.0, unit: "SF", note: "Vertical drop face (12\"-24\" drop)" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 6, unit: "EA", note: "Bottom and face" },
      { material: "#10 x 1\" Wafer-Head Screws", qty: 2, unit: "EA", note: "Framing connections" },
      { material: "12ga Wire (Hanger)", qty: 1.0, unit: "LF", note: "Ceiling wire supports from deck" },
      { material: "Joint Compound (All-Purpose)", qty: 0.015, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 1.0, unit: "LF", note: "Joints" },
    ],
    notes:
      "Slower production than walls — typically 33% reduction in daily output. Used to conceal ductwork, piping, or create bulkheads. Price as LF of soffit run.",
  },

  // ────────────────────────────────────────────────────────────
  //  ACT CEILING SYSTEMS
  // ────────────────────────────────────────────────────────────

  {
    code: "ACT-2x2",
    name: "2x2 ACT Grid + Standard Tile",
    category: "ACT Ceiling",
    unit: "SF",
    description:
      '2\'x2\' exposed grid acoustical ceiling. 15/16" grid system with standard acoustic tile (NRC 0.55). Armstrong Cortega or equivalent.',
    components: [
      { material: '15/16" Main Tee (12\' length)', qty: 0.084, unit: "EA", note: "Main runners @ 4' OC = 0.25 LF/SF → 0.084 sticks" },
      { material: '15/16" 2\' Cross Tee', qty: 0.50, unit: "EA", note: "Cross tees form 2x2 grid" },
      { material: '15/16" 4\' Cross Tee', qty: 0.25, unit: "EA", note: "4' cross tees between mains" },
      { material: "Wall Angle (10' stick)", qty: 0.033, unit: "EA", note: "Perimeter angle — varies with room shape" },
      { material: "12ga Hanger Wire (12' cut)", qty: 0.25, unit: "EA", note: "@ 4' OC each direction" },
      { material: "1/4\" Eye Lag or Shot Pin", qty: 0.25, unit: "EA", note: "Wire attachment to structure" },
      { material: '2x2 Acoustic Tile (NRC .55)', qty: 0.25, unit: "EA", note: "1 tile per 4 SF (2x2=4 SF)" },
    ],
    notes:
      "Most common commercial ceiling. ~100-120 SF/man-hour productivity. Add seismic bracing for SDC C+ or medical occupancy.",
  },

  {
    code: "ACT-2x4",
    name: "2x4 ACT Grid + Standard Tile",
    category: "ACT Ceiling",
    unit: "SF",
    description:
      '2\'x4\' exposed grid acoustical ceiling. 15/16" grid with 2x4 lay-in acoustic tile.',
    components: [
      { material: '15/16" Main Tee (12\' length)', qty: 0.084, unit: "EA", note: "Main runners @ 4' OC" },
      { material: '15/16" 4\' Cross Tee', qty: 0.25, unit: "EA", note: "Cross tees @ 2' OC" },
      { material: "Wall Angle (10' stick)", qty: 0.033, unit: "EA", note: "Perimeter angle" },
      { material: "12ga Hanger Wire (12' cut)", qty: 0.25, unit: "EA", note: "@ 4' OC each direction" },
      { material: "1/4\" Eye Lag or Shot Pin", qty: 0.25, unit: "EA", note: "Wire attachment" },
      { material: '2x4 Acoustic Tile (NRC .55)', qty: 0.125, unit: "EA", note: "1 tile per 8 SF" },
    ],
    notes:
      "Slightly lower cost than 2x2 — fewer cross tees. Common in offices, retail. Less popular in medical (2x2 preferred).",
  },

  {
    code: "ACT-2x2-PREM",
    name: "2x2 ACT Grid + Premium Tile (High NRC)",
    category: "ACT Ceiling",
    unit: "SF",
    description:
      '2\'x2\' grid with premium acoustic tile (NRC 0.70+). Armstrong Ultima, Optima, or equivalent. Common in medical exam rooms, conference rooms.',
    components: [
      { material: '15/16" Main Tee (12\' length)', qty: 0.084, unit: "EA", note: "Main runners @ 4' OC" },
      { material: '15/16" 2\' Cross Tee', qty: 0.50, unit: "EA", note: "2' cross tees" },
      { material: '15/16" 4\' Cross Tee', qty: 0.25, unit: "EA", note: "4' cross tees" },
      { material: "Wall Angle (10' stick)", qty: 0.033, unit: "EA", note: "Perimeter" },
      { material: "12ga Hanger Wire (12' cut)", qty: 0.25, unit: "EA", note: "@ 4' OC" },
      { material: "1/4\" Eye Lag or Shot Pin", qty: 0.25, unit: "EA", note: "Wire attachment" },
      { material: '2x2 Premium Acoustic Tile (NRC .70)', qty: 0.25, unit: "EA", note: "1 tile per 4 SF" },
    ],
    notes:
      "Higher tile cost but same grid. Verify tile type against spec — Armstrong Ultima HRC, Optima, or USG Halcyon are common premium choices.",
  },

  {
    code: "ACT-9/16",
    name: '2x2 ACT 9/16" Narrow Grid + Tile',
    category: "ACT Ceiling",
    unit: "SF",
    description:
      '2x2 narrow (9/16") exposed grid with tegular or square-edge tile. Sleeker look for medical and high-end commercial.',
    components: [
      { material: '9/16" Main Tee (12\' length)', qty: 0.084, unit: "EA", note: "Main runners @ 4' OC" },
      { material: '9/16" 2\' Cross Tee', qty: 0.50, unit: "EA", note: "2' cross tees" },
      { material: '9/16" 4\' Cross Tee', qty: 0.25, unit: "EA", note: "4' cross tees" },
      { material: "Wall Angle (10' stick)", qty: 0.033, unit: "EA", note: "Perimeter — shadow molding or wall angle" },
      { material: "12ga Hanger Wire (12' cut)", qty: 0.25, unit: "EA", note: "@ 4' OC" },
      { material: "1/4\" Eye Lag or Shot Pin", qty: 0.25, unit: "EA", note: "Wire attachment" },
      { material: '2x2 Tegular Tile for 9/16" Grid', qty: 0.25, unit: "EA", note: "Tegular edge — verify tile profile" },
    ],
    notes:
      'More expensive grid than 15/16". Common in medical (MH, Memorial Hermann specs). Verify tile edge profile matches grid.',
  },

  // ────────────────────────────────────────────────────────────
  //  GWB CEILING
  // ────────────────────────────────────────────────────────────

  {
    code: "GC-1LYR",
    name: "GWB Suspended Ceiling (1 Layer)",
    category: "GWB Ceiling",
    unit: "SF",
    description:
      'Suspended drywall ceiling. 1-1/2" cold-rolled channel (CRC) main runners @ 4\' OC, 7/8" hat channel furring @ 16" OC, one layer 5/8" GWB.',
    components: [
      { material: '1-1/2" Cold-Rolled Channel (CRC)', qty: 0.25, unit: "LF", note: "Main runners @ 4' OC" },
      { material: '7/8" Hat Channel (Furring)', qty: 0.75, unit: "LF", note: '@ 16" OC perpendicular to CRC' },
      { material: "12ga Hanger Wire (12' cut)", qty: 0.25, unit: "EA", note: "@ 4' OC both directions" },
      { material: '5/8" Type X GWB (4x12)', qty: 1.0, unit: "SF", note: "One layer" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 1.0, unit: "EA", note: "Into hat channel" },
      { material: "Wire Ties (for CRC to hanger)", qty: 0.25, unit: "EA", note: "Tie wire at each hanger" },
      { material: "Joint Compound (All-Purpose)", qty: 0.004, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 0.25, unit: "LF", note: "Per SF" },
    ],
    notes:
      "Slower than ACT — ~25% of wall production rate. Common in corridors, lobbies, patient rooms. Specify L4 or L5 finish.",
  },

  {
    code: "GC-2LYR-FR",
    name: "GWB Suspended Ceiling (2 Layer, 1-Hr Rated)",
    category: "GWB Ceiling",
    unit: "SF",
    description:
      'Fire-rated suspended drywall ceiling. CRC mains @ 4\' OC, hat channel furring @ 16" OC, two layers 5/8" Type X GWB. UL D501 or similar.',
    components: [
      { material: '1-1/2" Cold-Rolled Channel (CRC)', qty: 0.25, unit: "LF", note: "Main runners @ 4' OC" },
      { material: '7/8" Hat Channel (Furring)', qty: 0.75, unit: "LF", note: '@ 16" OC' },
      { material: "12ga Hanger Wire (12' cut)", qty: 0.25, unit: "EA", note: "@ 4' OC" },
      { material: '5/8" Type X GWB (4x12)', qty: 1.0, unit: "SF", note: "Layer 1 (base)" },
      { material: '5/8" Type X GWB (4x12)', qty: 1.0, unit: "SF", note: "Layer 2 (face)" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 1.0, unit: "EA", note: "Base layer" },
      { material: "#8 x 1-5/8\" Fine-Thread Screws", qty: 1.0, unit: "EA", note: "Face layer" },
      { material: "Wire Ties", qty: 0.25, unit: "EA", note: "CRC to hanger wire" },
      { material: "Fire Caulk (Intumescent)", qty: 0.01, unit: "TUBE", note: "Perimeter and penetrations" },
      { material: "Joint Compound (All-Purpose)", qty: 0.004, unit: "GAL", note: "L4 finish face layer" },
      { material: "Paper Joint Tape", qty: 0.25, unit: "LF", note: "Face layer joints" },
    ],
    notes:
      "1-hour rated ceiling assembly. Required above corridors in some occupancies. Very labor-intensive. Stagger joints between layers.",
  },

  // ────────────────────────────────────────────────────────────
  //  LEAD-LINED PARTITIONS
  // ────────────────────────────────────────────────────────────

  {
    code: "LL-1/32",
    name: 'Lead-Lined Wall (1/32" Pb, 1-Side)',
    category: "Lead-Lined",
    unit: "LF",
    description:
      'Radiation shielding wall. 3-5/8" 20ga studs @ 16" OC, lead-lined GWB (1/32" Pb) one side, 5/8" Type X other side. Common for dental X-ray rooms.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC — 20ga for lead weight' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Lead-Lined GWB (1/32" Pb)', qty: 10.0, unit: "SF", note: "Radiation side — lead laminated to board" },
      { material: '5/8" Type X GWB', qty: 10.0, unit: "SF", note: "Non-radiation side" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides — pre-drill lead side" },
      { material: "Lead Sheet (1/32\") for Laps", qty: 2.0, unit: "SF", note: "Overlap joints min 2\" — solder or lead tape" },
      { material: "Lead Tape (2\" wide, self-adhesive)", qty: 3.0, unit: "LF", note: "Seal all joints and screw heads" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish both sides" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Dental X-ray typical. Lead GWB joints must overlap min 2\". All screw penetrations on lead side sealed with lead tape. Radiation physicist signs off on shielding.",
  },

  {
    code: "LL-1/16",
    name: 'Lead-Lined Wall (1/16" Pb, Both Sides)',
    category: "Lead-Lined",
    unit: "LF",
    description:
      'Heavy radiation shielding. 3-5/8" 20ga studs @ 16" OC, lead-lined GWB (1/16" Pb) both sides. CT, fluoroscopy, and nuclear medicine rooms.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC — 20ga minimum for double lead weight' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Lead-Lined GWB (1/16" Pb)', qty: 10.0, unit: "SF", note: "Side 1" },
      { material: '5/8" Lead-Lined GWB (1/16" Pb)', qty: 10.0, unit: "SF", note: "Side 2" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides — pre-drill" },
      { material: "Lead Sheet (1/16\") for Laps", qty: 4.0, unit: "SF", note: "Overlap joints both sides" },
      { material: "Lead Tape (2\" wide, self-adhesive)", qty: 6.0, unit: "LF", note: "Seal all joints and screws both sides" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Heavy lead — very slow production. Boards are extremely heavy. May need additional blocking. Common in CT scan and cath lab rooms. Verify Pb thickness with radiation physicist.",
  },

  // ────────────────────────────────────────────────────────────
  //  INSULATED / ACOUSTIC WALLS
  // ────────────────────────────────────────────────────────────

  {
    code: "WA-STC50",
    name: 'STC 50 Acoustic Partition (3-5/8")',
    category: "Acoustic / Insulated",
    unit: "LF",
    description:
      'Enhanced acoustic partition. 3-5/8" 25ga studs @ 16" OC, one layer 5/8" Type X each side, R-11 batt, acoustical sealant at perimeter. STC ~50.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2" },
      { material: 'R-11 Fiberglass Batt (3-1/2" x 15")', qty: 10.0, unit: "SF", note: "Full cavity" },
      { material: "Acoustical Sealant", qty: 0.04, unit: "TUBE", note: "Continuous bead at floor track, ceiling track, and GWB perimeter" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Medical exam rooms, conference rooms. Acoustical sealant is critical — must be continuous, no breaks. Verify STC rating on drawings.",
  },

  {
    code: "WA-STC55-DBL",
    name: 'STC 55+ Double-Layer Acoustic Partition',
    category: "Acoustic / Insulated",
    unit: "LF",
    description:
      'High-performance acoustic wall. 3-5/8" 25ga studs @ 16" OC, two layers 5/8" Type X one side, one layer other, R-11 batt, full acoustical sealant. STC ~55.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — Layer 1" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 1 — Layer 2" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Side 2 — 1 layer" },
      { material: 'R-11 Fiberglass Batt (3-1/2" x 15")', qty: 10.0, unit: "SF", note: "Full cavity" },
      { material: "Acoustical Sealant", qty: 0.06, unit: "TUBE", note: "Continuous all perimeters, both sides" },
      { material: "#6 x 1\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Base layer" },
      { material: "#8 x 1-5/8\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Face layer" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 8, unit: "EA", note: "Single-layer side" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Face layer joints" },
    ],
    notes:
      "Physician offices, patient rooms adjacent to MRI/procedure rooms. Can add resilient channel on one side for STC 58+.",
  },

  {
    code: "WA-EXT-INS",
    name: "Exterior Insulated Furring Wall (R-19)",
    category: "Acoustic / Insulated",
    unit: "SF",
    description:
      'Interior furring of exterior wall. 6" 20ga studs @ 16" OC, R-19 batt insulation, one layer 5/8" GWB, vapor barrier. Thermal envelope wall.',
    components: [
      { material: '6" 20ga Steel Stud', qty: 0.075, unit: "EA", note: '@ 16" OC (per SF of wall area)' },
      { material: '6" Floor Track 20ga', qty: 0.10, unit: "LF", note: "Per SF" },
      { material: '6" Ceiling Track 20ga', qty: 0.10, unit: "LF", note: "Per SF" },
      { material: 'R-19 Fiberglass Batt (6")', qty: 1.0, unit: "SF", note: "Full cavity fill" },
      { material: "6-mil Poly Vapor Barrier", qty: 1.05, unit: "SF", note: "Behind GWB with 6\" laps" },
      { material: '5/8" Regular GWB (4x10)', qty: 1.0, unit: "SF", note: "One layer interior face" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 1.0, unit: "EA", note: "Per SF" },
      { material: "Joint Compound (All-Purpose)", qty: 0.004, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 0.25, unit: "LF", note: "Per SF" },
    ],
    notes:
      "Interior side of exterior envelope. Vapor barrier location depends on climate zone — Houston is Zone 2A, vapor barrier on warm side. Verify with specs.",
  },

  // ────────────────────────────────────────────────────────────
  //  DEFLECTION TRACK / SLIP JOINT
  // ────────────────────────────────────────────────────────────

  {
    code: "DT-SLOT",
    name: "Slotted Deflection Track Assembly",
    category: "Deflection Track",
    unit: "LF",
    description:
      'Top-of-wall deflection track system. Slotted/elongated holes in track allow vertical movement. GWB stops short with sealant gap. For deck-attached walls.',
    components: [
      { material: 'Slotted Deflection Track (3-5/8" or 6")', qty: 1.0, unit: "LF", note: "Matches stud width" },
      { material: "1/4\" x 2\" Powder-Actuated Fasteners", qty: 0.33, unit: "EA", note: "To deck @ 36\" OC" },
      { material: "Backer Rod (1/2\" closed cell)", qty: 2.0, unit: "LF", note: "Both sides of gap at top" },
      { material: "Acoustical Sealant", qty: 0.02, unit: "TUBE", note: "Seal gap above GWB both sides" },
    ],
    notes:
      "Required for walls framing to structure (not ceiling). GWB must stop 1/2\" to 1\" below track to allow deflection. Screws in studs at slotted track must be loose — NOT tight. Common mistake in field.",
  },

  {
    code: "DT-DEEPLEG",
    name: "Deep-Leg Deflection Track Assembly",
    category: "Deflection Track",
    unit: "LF",
    description:
      'Deep-leg deflection track for walls going to deck. Oversized track legs (4"-6" deep) allow stud to slide. Fire sealant at top.',
    components: [
      { material: 'Deep-Leg Deflection Track (3-5/8")', qty: 1.0, unit: "LF", note: "4\" to 6\" deep legs" },
      { material: "1/4\" x 3\" Powder-Actuated Fasteners", qty: 0.33, unit: "EA", note: "To deck @ 36\" OC" },
      { material: "Compressible Packing (Mineral Wool)", qty: 0.5, unit: "SF", note: "Fill gap at top of wall" },
      { material: "Fire Caulk (Intumescent)", qty: 0.04, unit: "TUBE", note: "If fire-rated wall — seal top gap" },
      { material: "Backer Rod (3/4\" closed cell)", qty: 2.0, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Used where large deflection is expected (long-span deck, high walls). Typical in Houston with wide-flange steel. Mineral wool packing required for fire-rated assemblies.",
  },

  // ────────────────────────────────────────────────────────────
  //  SEISMIC BRACING
  // ────────────────────────────────────────────────────────────

  {
    code: "SEIS-ACT",
    name: "Seismic Bracing for ACT Grid",
    category: "Seismic",
    unit: "SF",
    description:
      'Seismic bracing wires for suspended ceiling grid per IBC/ASCE 7. 12ga splay wires at 45° angles, compression posts. Required in SDC C+ or medical occupancy.',
    components: [
      { material: '12ga Seismic Brace Wire (4-way)', qty: 0.042, unit: "SET", note: "1 brace point per 24 SF (12' OC grid)" },
      { material: "Compression Post/Strut", qty: 0.042, unit: "EA", note: "1 per brace point" },
      { material: "1/4\" Eye Lag (to structure)", qty: 0.17, unit: "EA", note: "4 lags per brace point" },
      { material: "Seismic Clip (grid-to-wire)", qty: 0.042, unit: "SET", note: "Grid attachment hardware" },
      { material: "Perimeter Seismic Clip (wall angle)", qty: 0.1, unit: "EA", note: "At wall angle every 8'-0\" OC" },
    ],
    notes:
      "Houston is SDC B — generally not required for standard commercial. REQUIRED for medical occupancy (hospital, surgery center) per OSHPD and most health system specs. MH and Memorial Hermann specs always require it.",
  },

  {
    code: "SEIS-CEIL",
    name: "Seismic Bracing for GWB Ceiling",
    category: "Seismic",
    unit: "SF",
    description:
      'Seismic bracing for suspended drywall ceiling. Diagonal bracing wires and compression struts at CRC intersections.',
    components: [
      { material: '12ga Seismic Brace Wire (4-way)', qty: 0.042, unit: "SET", note: "1 per 24 SF" },
      { material: "Compression Post/Strut", qty: 0.042, unit: "EA", note: "At each brace point" },
      { material: "1/4\" Eye Lag (to structure)", qty: 0.17, unit: "EA", note: "4 per brace point" },
    ],
    notes:
      "Same concept as ACT seismic but attached to CRC framing. Required for medical occupancy in most jurisdictions.",
  },

  // ────────────────────────────────────────────────────────────
  //  ICRA BARRIERS
  // ────────────────────────────────────────────────────────────

  {
    code: "ICRA-CL3",
    name: "ICRA Class III Dust Barrier",
    category: "ICRA",
    unit: "LF",
    description:
      'Infection Control Risk Assessment Class III barrier. Full hard-wall barrier with sealed joints, negative air machine, ante-room with tacky mats. Required for work adjacent to occupied medical areas.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC — temporary framing' },
      { material: '3-5/8" Floor Track', qty: 1.0, unit: "LF", note: "Bottom track — sealed to floor" },
      { material: '3-5/8" Ceiling Track', qty: 1.0, unit: "LF", note: "Top track — sealed to deck/ceiling" },
      { material: '1/2" GWB (4x10)', qty: 10.0, unit: "SF", note: "One side — work area side" },
      { material: '6-mil Poly Sheeting', qty: 10.0, unit: "SF", note: "Sealed plastic on occupied side" },
      { material: "Duct Tape / Poly Tape", qty: 5.0, unit: "LF", note: "Seal all joints, floor, and ceiling" },
      { material: "Tacky Mat (24x36)", qty: 0.1, unit: "EA", note: "At ante-room entry" },
      { material: "HEPA Negative Air Machine", qty: 0.005, unit: "EA", note: "1 per 200 LF of barrier (rental)" },
      { material: "Zipwall or Door Kit", qty: 0.05, unit: "EA", note: "Entry/exit point every 20 LF typical" },
    ],
    notes:
      "Temporary barrier — removed after construction. Must maintain negative air pressure at all times. Common in MH, Memorial Hermann, Texas Children's projects. ICRA plan must be approved by infection control officer before install.",
  },

  {
    code: "ICRA-CL4",
    name: "ICRA Class IV Barrier (Maximum)",
    category: "ICRA",
    unit: "LF",
    description:
      'ICRA Class IV — maximum precautions. Hard-wall barrier floor to deck, sealed monolithically, HEPA filtered exhaust, anteroom, walk-off mats. Adjacent to immunocompromised patients or surgery.',
    components: [
      { material: '3-5/8" 25ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track', qty: 1.0, unit: "LF", note: "Sealed to slab" },
      { material: '3-5/8" Ceiling Track', qty: 1.0, unit: "LF", note: "Sealed to deck above" },
      { material: '5/8" Type X GWB (4x10)', qty: 10.0, unit: "SF", note: "Both sides if required" },
      { material: '6-mil Poly Sheeting', qty: 20.0, unit: "SF", note: "Double layer on hospital side" },
      { material: "Duct Tape / Poly Tape", qty: 8.0, unit: "LF", note: "Monolithic seal — all edges" },
      { material: "Tacky Mat (24x36)", qty: 0.15, unit: "EA", note: "Ante-room and corridor entry" },
      { material: "HEPA Negative Air Machine (2000 CFM)", qty: 0.005, unit: "EA", note: "Must exhaust outside or through HEPA" },
      { material: "Zipwall or Door Kit w/ Self-Closer", qty: 0.05, unit: "EA", note: "Self-closing required" },
      { material: "Manometer / Pressure Monitor", qty: 0.005, unit: "EA", note: "Continuous negative pressure monitoring" },
    ],
    notes:
      "Most stringent ICRA level. OR, ICU, NICU, bone marrow transplant adjacency. Requires daily monitoring log and pressure differential documentation. Extremely labor-intensive to maintain.",
  },

  // ────────────────────────────────────────────────────────────
  //  DOOR FRAMES & OPENINGS
  // ────────────────────────────────────────────────────────────

  {
    code: "DR-HM-STD",
    name: "Hollow Metal Door Frame (Standard)",
    category: "Door Opening",
    unit: "EA",
    description:
      'Standard hollow metal frame set in drywall partition. 16ga knock-down frame for 3-0 x 7-0 opening. Includes framing around opening with cripple studs, headers, and jamb studs.',
    components: [
      { material: "King Stud (same gauge as wall)", qty: 2.0, unit: "EA", note: "Full height each side of opening" },
      { material: "Jack/Trimmer Stud", qty: 2.0, unit: "EA", note: "Cut to door height each side" },
      { material: "Cripple Studs (above header)", qty: 2.0, unit: "EA", note: "Short studs above header to track" },
      { material: "Header Track (flat)", qty: 1.0, unit: "EA", note: "3'-6\" piece spanning opening" },
      { material: "#8 x 1/2\" Wafer-Head Screws", qty: 12, unit: "EA", note: "Frame-to-stud attachment" },
      { material: "Wood Blocking (2x6 PT)", qty: 3.0, unit: "LF", note: "Behind frame at hinge and strike — if spec'd" },
      { material: "Lag Screws (3/8\" x 3\")", qty: 6, unit: "EA", note: "Frame to blocking" },
    ],
    notes:
      "Frame is furnished by door supplier — EBC provides framing, blocking, and set frame. Verify frame type (KD, welded, drywall) with door schedule. Count 1 per door opening.",
  },

  {
    code: "DR-SIDELIGHT",
    name: "Sidelight/Borrowed Light Framing",
    category: "Door Opening",
    unit: "EA",
    description:
      'Framing for sidelight or borrowed light (glass panel) adjacent to door or in wall. Includes sill, header, and jamb framing with blocking.',
    components: [
      { material: "King Stud (same gauge as wall)", qty: 2.0, unit: "EA", note: "Full height each side" },
      { material: "Jack/Trimmer Stud", qty: 2.0, unit: "EA", note: "To sill and header height" },
      { material: "Sill Track (flat)", qty: 1.0, unit: "EA", note: "Bottom of opening" },
      { material: "Header Track (flat)", qty: 1.0, unit: "EA", note: "Top of opening" },
      { material: "Cripple Studs (below sill and above header)", qty: 3.0, unit: "EA", note: "Fill below sill and above header" },
      { material: "Wood Blocking (2x4)", qty: 6.0, unit: "LF", note: "Behind all 4 sides for glazing" },
      { material: "#8 x 1/2\" Wafer-Head Screws", qty: 8, unit: "EA", note: "Framing connections" },
    ],
    notes:
      "Common in medical exam rooms and offices. Glass typically by glazier — EBC provides framing and blocking only. Verify blocking requirements with glass subcontractor.",
  },

  // ────────────────────────────────────────────────────────────
  //  ACCESS PANELS
  // ────────────────────────────────────────────────────────────

  {
    code: "AP-STD",
    name: "Access Panel Installation (Standard Flush)",
    category: "Access Panel",
    unit: "EA",
    description:
      'Install standard flush access panel in drywall wall or ceiling. Includes framing the opening and setting the panel. Typical 12x12 to 24x24.',
    components: [
      { material: "Access Panel (flush, size varies)", qty: 1.0, unit: "EA", note: "12x12, 16x16, or 24x24 — verify schedule" },
      { material: "Steel Stud (framing around opening)", qty: 4.0, unit: "LF", note: "Header/sill/trimmer as needed" },
      { material: "#8 x 1/2\" Wafer-Head Screws", qty: 8, unit: "EA", note: "Frame attachment" },
    ],
    notes:
      "Verify who furnishes panels — owner/GC/EBC. EBC typically installs only. Count each panel. Fire-rated panels required if in rated wall/ceiling.",
  },

  {
    code: "AP-FR",
    name: "Fire-Rated Access Panel Installation",
    category: "Access Panel",
    unit: "EA",
    description:
      'Install fire-rated access panel in rated wall or ceiling assembly. Panel must match wall/ceiling fire rating.',
    components: [
      { material: "Fire-Rated Access Panel (size varies)", qty: 1.0, unit: "EA", note: "1-hr or 2-hr rated — UL listed" },
      { material: "Steel Stud (framing around opening)", qty: 4.0, unit: "LF", note: "Header/sill/trimmer" },
      { material: "#8 x 1/2\" Wafer-Head Screws", qty: 8, unit: "EA", note: "Frame attachment" },
      { material: "Fire Caulk (Intumescent)", qty: 0.1, unit: "TUBE", note: "Seal panel perimeter to rated assembly" },
    ],
    notes:
      "Must match the fire rating of the wall or ceiling assembly. Common in hospital corridors above ACT. Verify panel rating with fire-rated assembly schedule.",
  },

  // ────────────────────────────────────────────────────────────
  //  SPECIALTY ASSEMBLIES
  // ────────────────────────────────────────────────────────────

  {
    code: "WA-ABUSE",
    name: 'Abuse-Resistant Partition (3-5/8")',
    category: "Specialty",
    unit: "LF",
    description:
      'High-traffic corridor wall. 3-5/8" 20ga studs @ 16" OC, 5/8" abuse-resistant GWB (Georgia-Pacific Dens-Armor, National Gypsum eXP, or equiv) both sides.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC — 20ga for abuse areas' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Abuse-Resistant GWB', qty: 10.0, unit: "SF", note: "Side 1 — impact/abuse rated" },
      { material: '5/8" Abuse-Resistant GWB', qty: 10.0, unit: "SF", note: "Side 2" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Joint Compound (All-Purpose)", qty: 0.025, unit: "GAL", note: "L4 finish" },
      { material: "Paper Joint Tape", qty: 2.5, unit: "LF", note: "Both sides" },
    ],
    notes:
      "Corridors, cafeterias, gymnasiums, and any high-traffic area. Abuse-resistant board costs 50-60% more than standard but required by spec in most medical and education projects.",
  },

  {
    code: "WA-MR",
    name: "Moisture-Resistant Partition (Wet Area)",
    category: "Specialty",
    unit: "LF",
    description:
      'Wet-area partition. 3-5/8" 20ga studs @ 16" OC, 5/8" moisture-resistant (green board or Dens-Shield) GWB. Behind tile in restrooms, kitchens.',
    components: [
      { material: '3-5/8" 20ga Steel Stud 10\'', qty: 0.75, unit: "EA", note: '@ 16" OC' },
      { material: '3-5/8" Floor Track 20ga', qty: 1.0, unit: "LF", note: "Bottom track" },
      { material: '3-5/8" Ceiling Track 20ga', qty: 1.0, unit: "LF", note: "Top track" },
      { material: '5/8" Moisture-Resistant GWB', qty: 10.0, unit: "SF", note: "Wet side — behind tile" },
      { material: '5/8" Regular GWB', qty: 10.0, unit: "SF", note: "Dry side" },
      { material: "#6 x 1-1/4\" Fine-Thread Screws", qty: 16, unit: "EA", note: "Both sides" },
      { material: "Joint Compound (All-Purpose)", qty: 0.015, unit: "GAL", note: "Dry side finish only — wet side gets tile" },
      { material: "Paper Joint Tape", qty: 1.5, unit: "LF", note: "Dry side" },
    ],
    notes:
      "Restrooms, janitor closets, commercial kitchens. Wet side typically not finished by EBC (tile contractor finishes). Do NOT use regular GWB behind tile.",
  },

  // ────────────────────────────────────────────────────────────
  //  EQUIPMENT / COMMON ITEMS
  // ────────────────────────────────────────────────────────────

  {
    code: "EQ-LIFT",
    name: "Scissor Lift / Man-Lift (Rental)",
    category: "Equipment",
    unit: "WEEK",
    description:
      'Rental scissor lift or man-lift for work above 14\'. Required for high ceilings, atriums, and shaft walls.',
    components: [
      { material: "19' Scissor Lift Rental", qty: 1.0, unit: "WEEK", note: "Typical indoor electric — Genie or JLG" },
      { material: "Delivery/Pickup", qty: 0.14, unit: "EA", note: "1 delivery per ~7 weeks (amortized)" },
      { material: "Propane (if propane unit)", qty: 2.0, unit: "GAL", note: "Only if propane-powered outdoor unit" },
    ],
    notes:
      "Required for heights above 14'. Budget 1 lift per 4-6 workers. Indoor units must be electric (no emissions). Verify door widths for access. Height factor applies to all labor in that zone.",
  },

  {
    code: "EQ-SCAFFOLD",
    name: "Baker Scaffold Setup",
    category: "Equipment",
    unit: "EA",
    description:
      'Baker scaffold for 10\'-14\' work heights. Rolling scaffold with outriggers, platform, and guardrails.',
    components: [
      { material: "Baker Scaffold Frame (5' wide)", qty: 2.0, unit: "EA", note: "Stacked frames — height depends on ceiling" },
      { material: "Scaffold Platform / Plank", qty: 2.0, unit: "EA", note: "Aluminum walk boards" },
      { material: "Scaffold Casters (locking)", qty: 4.0, unit: "EA", note: "Must be locking type" },
      { material: "Outriggers", qty: 4.0, unit: "EA", note: "Required per OSHA when height > 3x base width" },
      { material: "Guardrail Set", qty: 1.0, unit: "SET", note: "Top rail and mid rail" },
    ],
    notes:
      "EBC-owned equipment. No rental cost but include in mobilization. 1 scaffold per 2-3 workers. OSHA requires guardrails above 10'.",
  },

  {
    code: "MISC-CB",
    name: "Corner Bead (Paper-Faced or Vinyl)",
    category: "Specialty",
    unit: "LF",
    description:
      'Corner bead at all outside corners, column wraps, window returns, and soffits. Paper-faced (No-Coat) or vinyl bead.',
    components: [
      { material: "Paper-Faced Corner Bead (No-Coat Ultra)", qty: 1.0, unit: "LF", note: "Most common — stapled or spray adhesive" },
      { material: "Joint Compound (All-Purpose)", qty: 0.01, unit: "GAL", note: "3 coats over bead" },
      { material: "Staples (T50 or equiv)", qty: 4, unit: "EA", note: "If staple-on type" },
    ],
    notes:
      "Count every outside corner. Easy to miss on estimates — check all window returns, column wraps, soffit edges, and door bucks. Average commercial project: 1 LF of bead per 3 LF of wall.",
  },

  {
    code: "MISC-CJ",
    name: "Control Joint (Vinyl ZJ Bead)",
    category: "Specialty",
    unit: "LF",
    description:
      'Vinyl control joint (ZJ bead) in long runs of GWB. Required by code and spec at max 30\' OC intervals in walls and ceilings.',
    components: [
      { material: "Vinyl Control Joint (ZJ Bead)", qty: 1.0, unit: "LF", note: "Full height of wall or width of ceiling" },
      { material: "Joint Compound (All-Purpose)", qty: 0.005, unit: "GAL", note: "Finish each side" },
      { material: "Paper Joint Tape", qty: 2.0, unit: "LF", note: "Each side of CJ" },
    ],
    notes:
      "Required every 30' OC max in walls, and at changes in substrate/direction. Often overlooked in estimates. GA-216 requires CJs at all construction joints in structure above.",
  },

];

export default ASSEMBLY_LIBRARY;
