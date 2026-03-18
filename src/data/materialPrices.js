// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Material Price Book
//  Eagles Brothers Constructors · Houston, TX
//
//  Extracted from EBC historical takeoff reports (2020+ pricing).
//  All prices are per-unit costs (cost ÷ quantity purchased).
//  Updated dates reflect the most recent supplier quote on file.
// ═══════════════════════════════════════════════════════════════

export const PRICE_BOOK = [

  // ────────────────────────────────────────────────────────────
  //  METAL STUDS — Standard Gauge (20ga / 25ga)
  // ────────────────────────────────────────────────────────────
  { code: "MS15820",  desc: '1-5/8" 20ga Metal Studs',          unit: "LF", cost: 0.5350, updated: "2022-08-30", category: "Metal Studs" },
  { code: "MS21220",  desc: '2-1/2" 20ga Metal Studs',          unit: "LF", cost: 0.3700, updated: "2022-08-19", category: "Metal Studs" },
  { code: "MS35820",  desc: '3-5/8" 20ga Metal Studs',          unit: "LF", cost: 0.4800, updated: "2026-01-15", category: "Metal Studs" },
  { code: "MS620",    desc: '6" 20ga Metal Studs',              unit: "LF", cost: 0.7000, updated: "2026-01-15", category: "Metal Studs" },
  { code: "MS820",    desc: '8" 20ga Metal Studs',              unit: "LF", cost: 1.7500, updated: "2026-01-15", category: "Metal Studs" },
  { code: "MS15825",  desc: '1-5/8" 25ga Metal Studs',          unit: "LF", cost: 0.2570, updated: "2006-06-14", category: "Metal Studs" },
  { code: "MS21225",  desc: '2-1/2" 25ga Metal Studs',          unit: "LF", cost: 0.6050, updated: "2022-02-23", category: "Metal Studs" },
  { code: "MS35825",  desc: '3-5/8" 25ga Metal Studs',          unit: "LF", cost: 0.7180, updated: "2022-03-16", category: "Metal Studs" },
  { code: "MS625",    desc: '6" 25ga Metal Studs',              unit: "LF", cost: 0.9940, updated: "2022-04-22", category: "Metal Studs" },

  // ────────────────────────────────────────────────────────────
  //  METAL TRACK — Standard Gauge (20ga / 25ga)
  // ────────────────────────────────────────────────────────────
  { code: "TT15820",  desc: '1-5/8" 20ga M.Track (Top)',        unit: "LF", cost: 0.5350, updated: "2022-08-30", category: "Metal Track" },
  { code: "BT15820",  desc: '1-5/8" 20ga M.Track (Bot)',        unit: "LF", cost: 0.5350, updated: "2022-08-30", category: "Metal Track" },
  { code: "TT21220",  desc: '2-1/2" 20ga M.Track (Top)',        unit: "LF", cost: 0.3770, updated: "2025-02-18", category: "Metal Track" },
  { code: "BT21220",  desc: '2-1/2" 20ga M.Track (Bot)',        unit: "LF", cost: 0.3680, updated: "2025-02-18", category: "Metal Track" },
  { code: "TT35820",  desc: '3-5/8" 20ga M.Track (Top)',        unit: "LF", cost: 0.4800, updated: "2024-06-26", category: "Metal Track" },
  { code: "BT35820",  desc: '3-5/8" 20ga M.Track (Bot)',        unit: "LF", cost: 0.4370, updated: "2024-11-18", category: "Metal Track" },
  { code: "TT620",    desc: '6" 20ga M.Track (Top)',            unit: "LF", cost: 0.6500, updated: "2022-08-19", category: "Metal Track" },
  { code: "BT620",    desc: '6" 20ga M.Track (Bot)',            unit: "LF", cost: 0.6200, updated: "2024-11-18", category: "Metal Track" },
  { code: "TT35825",  desc: '3-5/8" 25ga M.Track (Top)',        unit: "LF", cost: 0.7800, updated: "2022-08-29", category: "Metal Track" },
  { code: "BT35825",  desc: '3-5/8" 25ga M.Track (Bot)',        unit: "LF", cost: 0.6450, updated: "2022-08-29", category: "Metal Track" },
  { code: "TT625",    desc: '6" 25ga M.Track (Top)',            unit: "LF", cost: 0.9940, updated: "2022-04-22", category: "Metal Track" },
  { code: "BT625",    desc: '6" 25ga M.Track (Bot)',            unit: "LF", cost: 0.9910, updated: "2022-04-22", category: "Metal Track" },
  { code: "TT21225",  desc: '2-1/2" 25ga M.Track (Top)',        unit: "LF", cost: 0.5940, updated: "2022-03-14", category: "Metal Track" },
  { code: "BT21225",  desc: '2-1/2" 25ga M.Track (Bot)',        unit: "LF", cost: 0.5940, updated: "2022-03-14", category: "Metal Track" },

  // ────────────────────────────────────────────────────────────
  //  SLOTTED / DEFLECTION TRACK
  // ────────────────────────────────────────────────────────────
  { code: "ST35820",  desc: '3-5/8" 20ga Slotted Track',        unit: "LF", cost: 1.1430, updated: "2025-10-22", category: "Deflection Track" },
  { code: "ST620",    desc: '6" 20ga Slotted Track',            unit: "LF", cost: 1.8280, updated: "2025-10-22", category: "Deflection Track" },
  { code: "ST816",    desc: '8" 16ga Slotted Track',            unit: "LF", cost: 3.6850, updated: "2025-09-11", category: "Deflection Track" },
  { code: "ST35814",  desc: '3-5/8" 14ga Slotted Track',        unit: "LF", cost: 4.7000, updated: "2026-01-14", category: "Deflection Track" },
  { code: "ST21220",  desc: '2-1/2" 20ga Slotted Track',        unit: "LF", cost: 2.0930, updated: "2022-08-19", category: "Deflection Track" },
  { code: "MS35820FLEX", desc: '3-5/8" 20ga Flex Track',        unit: "LF", cost: 4.9000, updated: "2025-09-04", category: "Deflection Track" },

  // ────────────────────────────────────────────────────────────
  //  LIGHT GAUGE FRAMING (14ga, 16ga, 18ga)
  // ────────────────────────────────────────────────────────────
  { code: "MS35814",  desc: '3-5/8" 14ga Punched C Studs',      unit: "LF", cost: 2.4000, updated: "2026-01-14", category: "Light Gauge Framing" },
  { code: "MS35816",  desc: '3-5/8" 16ga Punched C Studs',      unit: "LF", cost: 1.5600, updated: "2024-06-26", category: "Light Gauge Framing" },
  { code: "MS35818",  desc: '3-5/8" 18ga Punched C Studs',      unit: "LF", cost: 1.7740, updated: "2023-08-23", category: "Light Gauge Framing" },
  { code: "MS616",    desc: '6" 16ga Punched C Studs',          unit: "LF", cost: 1.8500, updated: "2026-01-15", category: "Light Gauge Framing" },
  { code: "MS816",    desc: '8" 16ga Punched C Studs',          unit: "LF", cost: 2.7500, updated: "2026-01-15", category: "Light Gauge Framing" },
  { code: "MS814",    desc: '8" 14ga Punched C Studs',          unit: "LF", cost: 3.1600, updated: "2026-01-07", category: "Light Gauge Framing" },
  { code: "MS1214",   desc: '12" 14ga Punched C Studs',         unit: "LF", cost: 5.0000, updated: "2025-09-26", category: "Light Gauge Framing" },
  { code: "TT35816",  desc: '3-5/8" 16ga M.Track',              unit: "LF", cost: 1.5600, updated: "2024-06-26", category: "Light Gauge Framing" },
  { code: "TT35818",  desc: '3-5/8" 18ga M.Track',              unit: "LF", cost: 1.4680, updated: "2023-08-23", category: "Light Gauge Framing" },
  { code: "TT35814",  desc: '3-5/8" 14ga M.Track',              unit: "LF", cost: 2.1000, updated: "2026-01-14", category: "Light Gauge Framing" },
  { code: "TT616",    desc: '6" 16ga M.Track',                  unit: "LF", cost: 2.0700, updated: "2024-06-26", category: "Light Gauge Framing" },
  { code: "TT1016",   desc: '10" 16ga M.Track',                 unit: "LF", cost: 3.1460, updated: "2024-12-13", category: "Light Gauge Framing" },
  { code: "TT1416",   desc: '14" 16ga M.Track',                 unit: "LF", cost: 4.9000, updated: "2024-12-13", category: "Light Gauge Framing" },
  { code: "BT1214",   desc: '12" 14ga M.Track (Bot)',           unit: "LF", cost: 4.0500, updated: "2025-09-26", category: "Light Gauge Framing" },

  // ────────────────────────────────────────────────────────────
  //  DRYWALL / GWB
  // ────────────────────────────────────────────────────────────
  { code: "58X",      desc: '5/8" Type X Fireshield GWB',       unit: "SF", cost: 0.3500, updated: "2026-01-15", category: "Drywall" },
  { code: "58XIR",    desc: '5/8" X Impact Resistant GWB',      unit: "SF", cost: 0.9500, updated: "2026-02-24", category: "Drywall" },
  { code: "58HI",     desc: '5/8" Hi-Impact Board',             unit: "SF", cost: 1.6500, updated: "2025-10-20", category: "Drywall" },
  { code: "58QR",     desc: '5/8" QuietRock',                   unit: "SF", cost: 1.5000, updated: "2025-09-04", category: "Drywall" },
  { code: "58DS",     desc: '5/8" DensShield',                  unit: "SF", cost: 1.1000, updated: "2025-10-01", category: "Drywall" },
  { code: "58ID",     desc: '5/8" Interior Durock',             unit: "SF", cost: 1.0900, updated: "2022-09-16", category: "Drywall" },
  { code: "14FGB",    desc: '1/4" Flexible Gypsum Board',       unit: "SF", cost: 0.4500, updated: "2025-11-06", category: "Drywall" },
  { code: "14FCB",    desc: '1/4" Fiber Cement Board',          unit: "SF", cost: 1.0000, updated: "2026-01-09", category: "Drywall" },
  { code: "58HARDI",  desc: '5/8" HardiBacker Board',           unit: "SF", cost: 0.9500, updated: "2025-08-29", category: "Drywall" },
  { code: "132LS",    desc: '1/32" Lead Sheets',                unit: "SF", cost: 4.2130, updated: "2005-09-15", category: "Drywall" },

  // ────────────────────────────────────────────────────────────
  //  INSULATION
  // ────────────────────────────────────────────────────────────
  { code: "R13B16",   desc: '3-5/8" R-13 Batts 16" OC',        unit: "SF", cost: 0.4500, updated: "2025-06-27", category: "Insulation" },
  { code: "R19B16",   desc: '6" R-19 Batts 16" OC',            unit: "SF", cost: 0.4910, updated: "2024-11-18", category: "Insulation" },
  { code: "R21B16",   desc: '6" R-21 Batts 16" OC',            unit: "SF", cost: 0.6900, updated: "2026-01-15", category: "Insulation" },
  { code: "R25B16",   desc: '8" R-25 Batts 16" OC',            unit: "SF", cost: 0.7000, updated: "2026-01-15", category: "Insulation" },
  { code: "R30B16",   desc: '9" R-30 Batts 16" OC',            unit: "SF", cost: 0.7330, updated: "2022-09-26", category: "Insulation" },
  { code: "R21F24",   desc: '6" R-21 Foil-Faced 24" OC',       unit: "SF", cost: 0.6750, updated: "2025-10-23", category: "Insulation" },
  { code: "3MW",      desc: '3" Mineral Wool 24" OC',          unit: "SF", cost: 0.8500, updated: "2026-01-22", category: "Insulation" },
  { code: "312TF16",  desc: '3-1/2" Thermafiber 16" OC',       unit: "SF", cost: 0.6500, updated: "2025-07-18", category: "Insulation" },
  { code: "EXP",      desc: '1" Rigid Insulation (Dupont)',     unit: "SF", cost: 0.7900, updated: "2025-09-26", category: "Insulation" },
  { code: "R7.5",     desc: '1.5" Thermax Rigid',              unit: "SF", cost: 2.5000, updated: "2024-10-08", category: "Insulation" },

  // ────────────────────────────────────────────────────────────
  //  ACT GRID
  // ────────────────────────────────────────────────────────────
  { code: "7300",     desc: 'Armstrong Prelude Main Beam 12\'',  unit: "LF", cost: 0.9520, updated: "2022-08-15", category: "ACT Grid" },
  { code: "XL7342",   desc: 'Armstrong Prelude 48" Cross Tee',  unit: "LF", cost: 0.8760, updated: "2022-08-15", category: "ACT Grid" },
  { code: "SFMR96",   desc: 'Rockfon SpanFast Main Runner 96"', unit: "LF", cost: 2.0648, updated: "2022-06-09", category: "ACT Grid" },
  { code: "SFMR72",   desc: 'Rockfon SpanFast Main Runner 72"', unit: "LF", cost: 2.0651, updated: "2022-06-09", category: "ACT Grid" },
  { code: "SM144",    desc: 'Rockfon Shadowmold 144"',          unit: "LF", cost: 3.3917, updated: "2022-06-09", category: "ACT Grid" },

  // ────────────────────────────────────────────────────────────
  //  ACT TILE
  // ────────────────────────────────────────────────────────────
  { code: "PACIFICSLN", desc: 'Rockfon Pacific Square Lay-In NRC', unit: "SF", cost: 1.1683, updated: "2022-06-09", category: "ACT Tile" },
  { code: "TROPICSL",   desc: 'Rockfon Tropic Square Lay-In',     unit: "SF", cost: 2.2543, updated: "2022-06-09", category: "ACT Tile" },
  { code: "TROPICSLN",  desc: 'Rockfon Tropic Square Lay-In NRC', unit: "SF", cost: 2.7601, updated: "2022-06-09", category: "ACT Tile" },
  { code: "MASONITE",   desc: '1/8" Masonite (FRP alt)',          unit: "SF", cost: 0.5550, updated: "2024-10-03", category: "ACT Tile" },

  // ────────────────────────────────────────────────────────────
  //  FURRING
  // ────────────────────────────────────────────────────────────
  { code: "1RC",      desc: '1" 20ga Resilient Hat Channel',    unit: "LF", cost: 0.2250, updated: "2026-02-26", category: "Furring" },
  { code: "7820H",    desc: '7/8" 20ga Hi-Hat Channel',         unit: "LF", cost: 0.8950, updated: "2022-06-20", category: "Furring" },
  { code: "7818H",    desc: '7/8" 18ga Hi-Hat Channel',         unit: "LF", cost: 1.1350, updated: "2022-09-29", category: "Furring" },
  { code: "1Z",       desc: '1" Z-Furring Channel',             unit: "LF", cost: 1.1500, updated: "2022-11-10", category: "Furring" },
  { code: "118Z",     desc: '1" 18ga Z-Furring Channel',        unit: "LF", cost: 2.5000, updated: "2024-01-22", category: "Furring" },
  { code: "11220Z1",  desc: '1-1/2" 20ga Z-Furring Channel',    unit: "LF", cost: 0.7000, updated: "2024-06-17", category: "Furring" },
  { code: "3X3AG",    desc: '3" x 3" 18ga Angle',               unit: "LF", cost: 1.8670, updated: "2022-11-01", category: "Furring" },

  // ────────────────────────────────────────────────────────────
  //  TRIM & ACCESSORIES
  // ────────────────────────────────────────────────────────────
  { code: "114CB",    desc: '1-1/4" Corner Bead',               unit: "LF", cost: 0.5000, updated: "2022-08-04", category: "Trim" },
  { code: "093CJ",    desc: '#093 Control Joint',               unit: "LF", cost: 1.5550, updated: "2022-10-10", category: "Trim" },
  { code: "RACO358",  desc: 'RACO 3-5/8"',                      unit: "LF", cost: 6.4000, updated: "2022-08-25", category: "Trim" },
  { code: "RACO212",  desc: 'RACO 2-1/2"',                      unit: "LF", cost: 6.4000, updated: "2022-08-25", category: "Trim" },
  { code: "FF358",    desc: 'Flat Floatable 3-5/8"',            unit: "LF", cost: 3.2000, updated: "2022-07-28", category: "Trim" },
  { code: "FF212",    desc: 'Flat Floatable 2-1/2"',            unit: "LF", cost: 2.5000, updated: "2022-07-26", category: "Trim" },
  { code: "REVEALS2", desc: '2" Aluminum Reveals',              unit: "LF", cost: 9.0000, updated: "2022-08-10", category: "Trim" },
  { code: "FRYRIG",   desc: '1" x 5/8" Fry Riglett Reveal',    unit: "LF", cost: 2.5000, updated: "2026-01-14", category: "Trim" },
  { code: "1REVEAL",  desc: '1" Aluminum Reveals',              unit: "LF", cost: 4.0000, updated: "2022-04-22", category: "Trim" },

  // ────────────────────────────────────────────────────────────
  //  SHAFT WALL
  // ────────────────────────────────────────────────────────────
  { code: "JT620",    desc: '6" 20ga J-Runner (Top)',           unit: "LF", cost: 2.0770, updated: "2022-07-29", category: "Shaft Wall" },
  { code: "JB620",    desc: '6" 20ga J-Runner (Bot)',           unit: "LF", cost: 2.0770, updated: "2022-07-29", category: "Shaft Wall" },
  { code: "JT420",    desc: '4" 20ga J-Runner (Top)',           unit: "LF", cost: 1.6620, updated: "2022-07-29", category: "Shaft Wall" },
  { code: "JB420",    desc: '4" 20ga J-Runner (Bot)',           unit: "LF", cost: 1.6620, updated: "2022-07-29", category: "Shaft Wall" },
  { code: "CH620",    desc: '6" 20ga C-H Stud',                unit: "LF", cost: 2.5000, updated: "2026-02-25", category: "Shaft Wall" },
  { code: "1L",       desc: '1" Shaftwall Liner Panel',        unit: "SF", cost: 1.4020, updated: "2022-07-29", category: "Shaft Wall" },

  // ────────────────────────────────────────────────────────────
  //  FINISHING
  // ────────────────────────────────────────────────────────────
  { code: "FGT",      desc: "250' Roll of Joint Tape",          unit: "EA", cost: 3.0000, updated: "2022-07-20", category: "Finishing" },
  { code: "MUD1",     desc: "Joint Compound 62# Pail",          unit: "EA", cost: 20.0000, updated: "2022-06-21", category: "Finishing" },

  // ────────────────────────────────────────────────────────────
  //  SHEATHING
  // ────────────────────────────────────────────────────────────
  { code: "58DG",     desc: '5/8" DensGlass Sheathing',         unit: "SF", cost: 0.7800, updated: "2026-01-15", category: "Sheathing" },
  { code: "12DG",     desc: '1/2" DensGlass Sheathing',         unit: "SF", cost: 0.7800, updated: "2025-08-28", category: "Sheathing" },
  { code: "58DE",     desc: '5/8" DensElement Sheathing',       unit: "SF", cost: 0.9500, updated: "2025-08-29", category: "Sheathing" },
  { code: "34XPLY",   desc: '3/4" Fire-Rated Plywood',          unit: "SF", cost: 2.0400, updated: "2026-01-07", category: "Sheathing" },
  { code: "34FTPLY",  desc: '3/4" Plywood Sheathing FT',        unit: "SF", cost: 2.0000, updated: "2025-08-28", category: "Sheathing" },
  { code: "34MARINEPLY", desc: '3/4" Plywood (Marine)',          unit: "SF", cost: 2.5000, updated: "2024-09-05", category: "Sheathing" },
  { code: "34XCIPLY", desc: '3/4" XCI Plywood (insulated)',     unit: "SF", cost: 5.5000, updated: "2026-02-13", category: "Sheathing" },

  // ────────────────────────────────────────────────────────────
  //  WOOD BLOCKING
  // ────────────────────────────────────────────────────────────
  { code: "2X6PT",    desc: '2x6 P.T. Wood Blocking',           unit: "LF", cost: 1.2000, updated: "2022-09-13", category: "Wood Blocking" },
  { code: "2X8PT",    desc: '2x8 P.T. Wood Blocking',           unit: "LF", cost: 1.5000, updated: "2022-09-16", category: "Wood Blocking" },
  { code: "2X10PT",   desc: '2x10 P.T. Wood Blocking',          unit: "LF", cost: 2.0000, updated: "2022-09-29", category: "Wood Blocking" },
  { code: "2X8FT",    desc: '2x8 F.T. Wood Blocking',           unit: "LF", cost: 3.0000, updated: "2022-08-09", category: "Wood Blocking" },
  { code: "12CDX",    desc: '1/2" CDX Plywood',                 unit: "SF", cost: 1.0620, updated: "2022-09-12", category: "Wood Blocking" },
  { code: "58POLY",   desc: '5/8" Polygal',                     unit: "SF", cost: 2.5000, updated: "2022-08-10", category: "Wood Blocking" },

  // ────────────────────────────────────────────────────────────
  //  SEALANTS & FASTENERS
  // ────────────────────────────────────────────────────────────
  { code: "FIRECAULK", desc: "Fire Caulking",                   unit: "LF", cost: 0.9300, updated: "2025-11-06", category: "Sealants" },
  { code: "12TEKS",    desc: '1/2" Tek Screws',                 unit: "EA", cost: 0.2500, updated: "2025-08-28", category: "Fasteners" },
  { code: "BTF",       desc: "Bottom Track Fastener",           unit: "EA", cost: 0.1250, updated: "2026-01-15", category: "Fasteners" },
  { code: "FASTCLIP",  desc: "14ga Fast Clip",                  unit: "EA", cost: 4.0000, updated: "2022-05-26", category: "Fasteners" },
  { code: "EB",        desc: "Expansion Bolts",                 unit: "EA", cost: 1.5000, updated: "2025-10-20", category: "Fasteners" },
];

// Helper: look up a material by code
export function getPriceByCode(code) {
  return PRICE_BOOK.find(m => m.code === code);
}

// Helper: get all materials in a category
export function getPricesByCategory(category) {
  return PRICE_BOOK.filter(m => m.category === category);
}

// Helper: get unit cost for a code (returns 0 if not found)
export function getUnitCost(code) {
  const item = PRICE_BOOK.find(m => m.code === code);
  return item ? item.cost : 0;
}
