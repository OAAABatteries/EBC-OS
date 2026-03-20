// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Material Library Data
//  55 materials, 8 categories — prices from EBC price book (2022-2026)
// ═══════════════════════════════════════════════════════════════

export const MAT_CATS = ['Framing','Drywall','Insulation','ACT / Ceiling','Specialties','Finishes','Shaft Wall','Wood / Blocking'];

export const MAT_CLR = {
  'Framing':         { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)' },
  'Drywall':         { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  'Insulation':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  'ACT / Ceiling':   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)' },
  'Specialties':     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)' },
  'Finishes':        { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)' },
  'Shaft Wall':      { color: '#d946ef', bg: 'rgba(217,70,239,0.10)', border: 'rgba(217,70,239,0.25)' },
  'Wood / Blocking': { color: '#84cc16', bg: 'rgba(132,204,22,0.10)', border: 'rgba(132,204,22,0.25)' },
};

export const ASM_TYPES = ['Wall','Ceiling','Soffit','Column Wrap','Shaft Wall','Partition','Specialty'];

export const DEFAULT_MATERIALS = [
  // ── FRAMING: STUDS (by size → gauge) ──────────────────────────
  // 1-5/8" (Furring Studs)
  { id: 'fs158-25', category: 'Framing', name: '1-5/8" 25ga Steel Stud',  unit: 'LF', matCost: 0.22, laborCost: 2.50, note: 'Skim coat furring, thin walls' },
  // 2-1/2"
  { id: 'fs250-25', category: 'Framing', name: '2-1/2" 25ga Steel Stud',  unit: 'LF', matCost: 0.30, laborCost: 2.80, note: 'Light-duty chase walls, pipe covers' },
  { id: 'm30',      category: 'Framing', name: '2-1/2" 20ga Steel Stud',  unit: 'LF', matCost: 0.37, laborCost: 3.00, note: 'Narrow partitions, furr-outs' },
  // 3-5/8"
  { id: 'm1',       category: 'Framing', name: '3-5/8" 25ga Steel Stud',  unit: 'LF', matCost: 0.72, laborCost: 3.20, note: 'Standard interior partition stud' },
  { id: 'm2',       category: 'Framing', name: '3-5/8" 20ga Steel Stud',  unit: 'LF', matCost: 0.48, laborCost: 3.50, note: 'Heavy gauge for tall walls 10-14\'' },
  { id: 'fs358-18', category: 'Framing', name: '3-5/8" 18ga Steel Stud',  unit: 'LF', matCost: 0.92, laborCost: 3.80, note: 'Structural, tall walls 14-18\'' },
  { id: 'fs358-16', category: 'Framing', name: '3-5/8" 16ga Steel Stud',  unit: 'LF', matCost: 1.35, laborCost: 4.00, note: 'Heavy structural, equipment support' },
  { id: 'fs358-14', category: 'Framing', name: '3-5/8" 14ga Steel Stud',  unit: 'LF', matCost: 1.95, laborCost: 4.50, note: 'Max structural, 18\'+ walls, heavy loads' },
  // 4"
  { id: 'fs400-20', category: 'Framing', name: '4" 20ga Steel Stud',      unit: 'LF', matCost: 0.55, laborCost: 3.60, note: '4" cavity for plumbing, med walls' },
  // 6"
  { id: 'm3',       category: 'Framing', name: '6" 20ga Steel Stud',      unit: 'LF', matCost: 0.70, laborCost: 3.80, note: 'Deep cavity walls, plumbing walls' },
  { id: 'fs600-18', category: 'Framing', name: '6" 18ga Steel Stud',      unit: 'LF', matCost: 1.25, laborCost: 4.20, note: 'Structural deep walls, tall 14-20\'' },
  { id: 'fs600-16', category: 'Framing', name: '6" 16ga Steel Stud',      unit: 'LF', matCost: 1.85, laborCost: 4.50, note: 'Heavy structural 6" walls' },
  { id: 'fs600-14', category: 'Framing', name: '6" 14ga Steel Stud',      unit: 'LF', matCost: 2.65, laborCost: 5.00, note: 'Max structural 6", elevator, mech' },
  // 8"
  { id: 'm31',      category: 'Framing', name: '8" 20ga Steel Stud',      unit: 'LF', matCost: 1.75, laborCost: 4.20, note: 'Deep walls, elevator lobbies' },
  { id: 'fs800-16', category: 'Framing', name: '8" 16ga Steel Stud',      unit: 'LF', matCost: 2.80, laborCost: 5.00, note: 'Structural deep walls' },
  // 10"
  { id: 'fs1000-16',category: 'Framing', name: '10" 16ga Steel Stud',     unit: 'LF', matCost: 3.50, laborCost: 5.50, note: 'Extra deep walls, mechanical' },

  // ── FRAMING: TRACKS (by size → gauge) ──────────────────────────
  { id: 'ft158-25', category: 'Framing', name: '1-5/8" 25ga Track',       unit: 'LF', matCost: 0.18, laborCost: 1.20, note: 'Furring track' },
  { id: 'ft250-25', category: 'Framing', name: '2-1/2" 25ga Track',       unit: 'LF', matCost: 0.25, laborCost: 1.30, note: 'Chase wall track' },
  { id: 'ft250-20', category: 'Framing', name: '2-1/2" 20ga Track',       unit: 'LF', matCost: 0.32, laborCost: 1.40, note: 'Furr-out track' },
  { id: 'm4',       category: 'Framing', name: '3-5/8" 25ga Track',       unit: 'LF', matCost: 0.38, laborCost: 1.30, note: 'Standard partition track (25ga stud)' },
  { id: 'ft358-20', category: 'Framing', name: '3-5/8" 20ga Track',       unit: 'LF', matCost: 0.46, laborCost: 1.50, note: 'Standard floor & ceiling track' },
  { id: 'ft358-18', category: 'Framing', name: '3-5/8" 18ga Track',       unit: 'LF', matCost: 0.78, laborCost: 1.60, note: 'Structural track' },
  { id: 'ft358-16', category: 'Framing', name: '3-5/8" 16ga Track',       unit: 'LF', matCost: 1.10, laborCost: 1.80, note: 'Heavy structural track' },
  { id: 'ft358-14', category: 'Framing', name: '3-5/8" 14ga Track',       unit: 'LF', matCost: 1.60, laborCost: 2.00, note: 'Max structural track' },
  { id: 'ft400-20', category: 'Framing', name: '4" 20ga Track',           unit: 'LF', matCost: 0.52, laborCost: 1.50, note: '4" wall track' },
  { id: 'ft600-20', category: 'Framing', name: '6" 20ga Track',           unit: 'LF', matCost: 0.60, laborCost: 1.60, note: 'Deep cavity track' },
  { id: 'ft600-18', category: 'Framing', name: '6" 18ga Track',           unit: 'LF', matCost: 1.05, laborCost: 1.80, note: 'Structural 6" track' },
  { id: 'ft600-16', category: 'Framing', name: '6" 16ga Track',           unit: 'LF', matCost: 1.55, laborCost: 2.00, note: 'Heavy 6" track' },
  { id: 'ft800-20', category: 'Framing', name: '8" 20ga Track',           unit: 'LF', matCost: 1.40, laborCost: 1.80, note: '8" wall track' },
  { id: 'ft800-16', category: 'Framing', name: '8" 16ga Track',           unit: 'LF', matCost: 2.30, laborCost: 2.00, note: 'Heavy 8" track' },

  // ── FRAMING: DEFLECTION / SPECIALTY ────────────────────────────
  { id: 'm6',       category: 'Framing', name: '3-5/8" Deflection Track (Slotted)', unit: 'LF', matCost: 1.14, laborCost: 2.80, note: 'Top-of-wall deck attachment' },
  { id: 'm32',      category: 'Framing', name: '6" Deflection Track (Slotted)',     unit: 'LF', matCost: 1.83, laborCost: 2.80, note: '6" wall deck attachment' },
  { id: 'm33',      category: 'Framing', name: '8" 16ga Slotted Track',             unit: 'LF', matCost: 3.69, laborCost: 3.50, note: 'Heavy gauge deck attachment' },
  { id: 'fdt358-dl',category: 'Framing', name: '3-5/8" Deep-Leg Deflection Track',  unit: 'LF', matCost: 1.50, laborCost: 3.00, note: '2" deflection allowance' },
  { id: 'fdt600-dl',category: 'Framing', name: '6" Deep-Leg Deflection Track',      unit: 'LF', matCost: 2.20, laborCost: 3.00, note: '2" deflection, deep walls' },
  { id: 'm34',      category: 'Framing', name: '3-5/8" 20ga Flex Track',            unit: 'LF', matCost: 4.90, laborCost: 3.50, note: 'Curved walls' },
  { id: 'm5',       category: 'Framing', name: '7/8" 20ga Furring Channel (Hat)',   unit: 'LF', matCost: 0.90, laborCost: 2.10, note: 'Furring on concrete/CMU walls' },
  { id: 'm35',      category: 'Framing', name: '1" 20ga Resilient Channel',         unit: 'LF', matCost: 0.23, laborCost: 1.50, note: 'Sound isolation walls' },
  { id: 'frc-15',   category: 'Framing', name: '1-1/2" Resilient Channel',          unit: 'LF', matCost: 0.35, laborCost: 1.60, note: 'Heavy-duty sound isolation' },
  { id: 'f-crc',    category: 'Framing', name: '1-1/2" Cold-Rolled Channel',        unit: 'LF', matCost: 0.65, laborCost: 2.00, note: 'Ceiling framing, bridging' },
  { id: 'f-angle',  category: 'Framing', name: '2" x 2" 20ga Steel Angle',         unit: 'LF', matCost: 0.80, laborCost: 2.50, note: 'Ceiling perimeter, soffits, bracing' },

  // ── DRYWALL / BOARD ─────────────────────────────────────────
  // Regular (non-rated)
  { id: 'gwb-12r', category: 'Drywall', name: '1/2" Regular GWB',          unit: 'SF', matCost: 0.28, laborCost: 0.85, note: 'Standard non-rated board' },
  { id: 'gwb-58r', category: 'Drywall', name: '5/8" Regular GWB',          unit: 'SF', matCost: 0.32, laborCost: 0.90, note: 'Non-rated, heavier board' },
  // Fire-rated (Type X / Type C)
  { id: 'm7',      category: 'Drywall', name: '5/8" Type X GWB',           unit: 'SF', matCost: 0.35, laborCost: 0.95, note: 'Standard fire-rated board (Fireshield)' },
  { id: 'gwb-12x', category: 'Drywall', name: '1/2" Type X GWB',           unit: 'SF', matCost: 0.33, laborCost: 0.90, note: '1/2" fire-rated (some 1HR assemblies)' },
  { id: 'gwb-58c', category: 'Drywall', name: '5/8" Type C GWB',           unit: 'SF', matCost: 0.55, laborCost: 0.95, note: 'Enhanced fire performance (2HR+)' },
  // Moisture / Mold
  { id: 'm8',      category: 'Drywall', name: '5/8" DensShield (Moisture)', unit: 'SF', matCost: 1.10, laborCost: 0.95, note: 'Wet areas, behind tile' },
  { id: 'gwb-mr',  category: 'Drywall', name: '5/8" Mold Tough (MR)',      unit: 'SF', matCost: 0.48, laborCost: 0.95, note: 'Moisture + mold resistant (purple board)' },
  { id: 'gwb-12mr',category: 'Drywall', name: '1/2" Mold Tough (MR)',      unit: 'SF', matCost: 0.42, laborCost: 0.88, note: '1/2" moisture resistant' },
  // Impact / Abuse
  { id: 'm9',      category: 'Drywall', name: '5/8" Impact Resistant GWB',  unit: 'SF', matCost: 0.95, laborCost: 1.00, note: 'Corridors, high-traffic areas' },
  { id: 'm10',     category: 'Drywall', name: '5/8" Hi-Impact Board',       unit: 'SF', matCost: 1.65, laborCost: 1.10, note: 'Maximum abuse resistance' },
  { id: 'gwb-hiab',category: 'Drywall', name: '5/8" Hi-Abuse (Level 3)',    unit: 'SF', matCost: 1.25, laborCost: 1.05, note: 'Level 3 abuse (GA-214)' },
  // Sound
  { id: 'm36',     category: 'Drywall', name: '5/8" QuietRock (Sound)',     unit: 'SF', matCost: 1.50, laborCost: 1.00, note: 'STC-rated sound board' },
  // Specialty
  { id: 'm11',     category: 'Drywall', name: '1/4" Flexible Gypsum Board', unit: 'SF', matCost: 0.45, laborCost: 0.85, note: 'Curved walls, radius work' },
  { id: 'm12',     category: 'Drywall', name: 'Lead-Lined GWB (1/32" Pb)',  unit: 'SF', matCost: 4.21, laborCost: 6.50, note: 'X-ray rooms, radiation shielding' },
  { id: 'gwb-ll16',category: 'Drywall', name: 'Lead-Lined GWB (1/16" Pb)',  unit: 'SF', matCost: 6.50, laborCost: 7.00, note: 'Heavy radiation shielding (CT/PET)' },
  { id: 'm37',     category: 'Drywall', name: '1/4" Fiber Cement Board',    unit: 'SF', matCost: 1.00, laborCost: 1.00, note: 'Tile backer, wet areas' },
  { id: 'm38',     category: 'Drywall', name: '5/8" HardiBacker Board',     unit: 'SF', matCost: 0.95, laborCost: 1.00, note: 'Cement board backer' },
  { id: 'm39',     category: 'Drywall', name: '5/8" DensGlass Sheathing',   unit: 'SF', matCost: 0.78, laborCost: 0.90, note: 'Exterior sheathing, moisture barrier' },
  { id: 'gwb-12dens',category:'Drywall', name: '1/2" DensArmor Plus',       unit: 'SF', matCost: 0.65, laborCost: 0.90, note: 'Paperless, moisture + mold resistant' },

  // ── INSULATION ──────────────────────────────────────────────
  { id: 'm13', category: 'Insulation', name: 'R-13 Fiberglass Batt (3-5/8")', unit: 'SF', matCost: 0.45, laborCost: 0.80, note: 'Standard cavity insulation' },
  { id: 'm14', category: 'Insulation', name: 'R-19 Fiberglass Batt (6")',     unit: 'SF', matCost: 0.49, laborCost: 0.90, note: 'Deep cavity / exterior walls' },
  { id: 'm15', category: 'Insulation', name: 'R-30 Fiberglass Batt (10")',    unit: 'SF', matCost: 0.73, laborCost: 1.10, note: 'Ceiling insulation' },
  { id: 'm16', category: 'Insulation', name: '3" Mineral Wool (24" OC)',      unit: 'SF', matCost: 0.85, laborCost: 1.50, note: 'Fire-rated assemblies, STC walls' },
  { id: 'm40', category: 'Insulation', name: 'R-21 Fiberglass Batt (6")',     unit: 'SF', matCost: 0.69, laborCost: 0.90, note: 'Deep cavity, higher R-value' },
  { id: 'm41', category: 'Insulation', name: 'R-25 Fiberglass Batt (8")',     unit: 'SF', matCost: 0.70, laborCost: 1.00, note: '8" cavity insulation' },
  { id: 'm42', category: 'Insulation', name: '3-1/2" Thermafiber (16" OC)',   unit: 'SF', matCost: 0.65, laborCost: 1.20, note: 'Mineral fiber, fire/sound rated' },
  { id: 'm43', category: 'Insulation', name: '1" Rigid Insulation (Dupont)',   unit: 'SF', matCost: 0.79, laborCost: 0.80, note: 'Continuous insulation, exterior' },

  // ── ACT / CEILING ───────────────────────────────────────────
  { id: 'm17', category: 'ACT / Ceiling', name: '2x2 ACT Grid System',              unit: 'SF', matCost: 1.85, laborCost: 2.40, note: 'Standard exposed grid' },
  { id: 'm18', category: 'ACT / Ceiling', name: '2x4 ACT Grid System',              unit: 'SF', matCost: 1.65, laborCost: 2.25, note: 'Standard exposed grid' },
  { id: 'm19', category: 'ACT / Ceiling', name: 'Standard Acoustic Tile (NRC .55)',  unit: 'SF', matCost: 1.17, laborCost: 0.60, note: 'Rockfon Pacific or equiv' },
  { id: 'm20', category: 'ACT / Ceiling', name: 'Premium Acoustic Tile (NRC .70)',   unit: 'SF', matCost: 2.25, laborCost: 0.65, note: 'Rockfon Tropic or equiv' },
  { id: 'm21', category: 'ACT / Ceiling', name: 'Seismic Bracing (ACT grid)',        unit: 'SF', matCost: 0.85, laborCost: 1.20, note: 'Required in medical / SDC C+' },

  // ── SPECIALTIES ─────────────────────────────────────────────
  { id: 'm22', category: 'Specialties', name: 'ICRA Barrier Assembly',      unit: 'LF', matCost: 8.00, laborCost: 14.00, note: 'Temporary infection control' },
  { id: 'm23', category: 'Specialties', name: '1-1/4" Corner Bead',        unit: 'LF', matCost: 0.50, laborCost: 0.80, note: 'All outside corners' },
  { id: 'm24', category: 'Specialties', name: '#093 Control Joint',        unit: 'LF', matCost: 1.56, laborCost: 1.50, note: 'Required every 30\' OC max' },
  { id: 'm25', category: 'Specialties', name: 'Access Panel (12x12)',      unit: 'EA', matCost: 28.00, laborCost: 35.00, note: 'Standard flush access door' },
  { id: 'm44', category: 'Specialties', name: 'Fire Caulking',             unit: 'LF', matCost: 0.93, laborCost: 1.20, note: 'Firestop at penetrations' },
  { id: 'm45', category: 'Specialties', name: '2" Aluminum Reveals',       unit: 'LF', matCost: 9.00, laborCost: 3.50, note: 'Decorative wall reveals' },

  // ── FINISHES ────────────────────────────────────────────────
  { id: 'm26', category: 'Finishes', name: 'L4 Joint Treatment (Tape & Finish)', unit: 'SF', matCost: 0.25, laborCost: 1.40, note: 'Standard flat finish' },
  { id: 'm27', category: 'Finishes', name: 'L5 Joint Treatment (Skim Coat)',     unit: 'SF', matCost: 0.45, laborCost: 2.80, note: 'Premium smooth finish' },
  { id: 'm28', category: 'Finishes', name: 'FRP Wall Panel (Glue-Up)',           unit: 'SF', matCost: 3.50, laborCost: 2.70, note: 'Moisture-resistant wall panel' },
  { id: 'm29', category: 'Finishes', name: 'Spray Fireproofing (Cementitious)',  unit: 'SF', matCost: 2.10, laborCost: 2.40, note: 'Beam & column fire protection' },

  // ── SHAFT WALL ──────────────────────────────────────────────
  { id: 'm46', category: 'Shaft Wall', name: '6" 20ga J-Runner (Top & Bot)', unit: 'LF', matCost: 2.08, laborCost: 2.50, note: 'Shaft wall track' },
  { id: 'm47', category: 'Shaft Wall', name: '4" 20ga J-Runner (Top & Bot)', unit: 'LF', matCost: 1.66, laborCost: 2.50, note: 'Shaft wall track, narrow' },
  { id: 'm48', category: 'Shaft Wall', name: '6" 20ga C-H Stud',            unit: 'LF', matCost: 2.50, laborCost: 3.80, note: 'Shaft wall stud' },
  { id: 'm49', category: 'Shaft Wall', name: '1" Shaftwall Liner Panel',     unit: 'SF', matCost: 1.40, laborCost: 1.10, note: 'Shaft wall core board' },

  // ── WOOD / BLOCKING ─────────────────────────────────────────
  { id: 'm50', category: 'Wood / Blocking', name: '2x6 P.T. Wood Blocking',   unit: 'LF', matCost: 1.20, laborCost: 2.50, note: 'Backing for casework, handrails' },
  { id: 'm51', category: 'Wood / Blocking', name: '2x8 P.T. Wood Blocking',   unit: 'LF', matCost: 1.50, laborCost: 2.50, note: 'Heavy backing, grab bars' },
  { id: 'm52', category: 'Wood / Blocking', name: '2x10 P.T. Wood Blocking',  unit: 'LF', matCost: 2.00, laborCost: 2.80, note: 'Large equipment backing' },
  { id: 'm53', category: 'Wood / Blocking', name: '3/4" Fire-Rated Plywood',   unit: 'SF', matCost: 2.04, laborCost: 1.80, note: 'Fire-rated plywood sheathing' },
  { id: 'm54', category: 'Wood / Blocking', name: '1/2" CDX Plywood',          unit: 'SF', matCost: 1.06, laborCost: 1.50, note: 'General blocking/backing' },
];
