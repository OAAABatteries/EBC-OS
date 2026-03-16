// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Material Library Data
//  29 materials, 6 categories, assembly types
// ═══════════════════════════════════════════════════════════════

export const MAT_CATS = ['Framing','Drywall','Insulation','ACT / Ceiling','Specialties','Finishes'];

export const MAT_CLR = {
  'Framing':       { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)' },
  'Drywall':       { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  'Insulation':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  'ACT / Ceiling': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.25)' },
  'Specialties':   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)' },
  'Finishes':      { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)' },
};

export const ASM_TYPES = ['Wall','Ceiling','Soffit','Column Wrap','Shaft Wall','Partition','Specialty'];

export const DEFAULT_MATERIALS = [
  { id: 'm1',  category: 'Framing', name: '3-5/8" 25ga Steel Stud', unit: 'LF', matCost: 1.85, laborCost: 3.20, note: 'Standard interior partition stud' },
  { id: 'm2',  category: 'Framing', name: '3-5/8" 20ga Steel Stud', unit: 'LF', matCost: 2.45, laborCost: 3.50, note: 'Heavy gauge for tall walls' },
  { id: 'm3',  category: 'Framing', name: '6" 20ga Steel Stud', unit: 'LF', matCost: 3.10, laborCost: 3.80, note: 'Deep cavity walls, plumbing walls' },
  { id: 'm4',  category: 'Framing', name: '3-5/8" Track (Top & Bottom)', unit: 'LF', matCost: 1.20, laborCost: 1.50, note: 'Standard floor & ceiling track' },
  { id: 'm5',  category: 'Framing', name: '1-5/8" Furring Channel (Hat)', unit: 'LF', matCost: 0.85, laborCost: 2.10, note: 'Furring on concrete/CMU walls' },
  { id: 'm6',  category: 'Framing', name: 'Deflection Track (Slotted)', unit: 'LF', matCost: 3.50, laborCost: 2.80, note: 'Top-of-wall deck attachment' },
  { id: 'm7',  category: 'Drywall', name: '5/8" Type X GWB', unit: 'SF', matCost: 0.72, laborCost: 0.95, note: 'Standard fire-rated board' },
  { id: 'm8',  category: 'Drywall', name: '5/8" Moisture-Resistant GWB', unit: 'SF', matCost: 0.88, laborCost: 0.95, note: 'Wet areas, behind tile' },
  { id: 'm9',  category: 'Drywall', name: '5/8" Abuse-Resistant GWB', unit: 'SF', matCost: 1.15, laborCost: 1.00, note: 'Corridors, high-traffic areas' },
  { id: 'm10', category: 'Drywall', name: '5/8" Type C (Shaft) GWB', unit: 'SF', matCost: 0.95, laborCost: 1.10, note: 'Shaft wall liner panel' },
  { id: 'm11', category: 'Drywall', name: '1/2" Regular GWB', unit: 'SF', matCost: 0.48, laborCost: 0.85, note: 'Non-rated partitions only' },
  { id: 'm12', category: 'Drywall', name: 'Lead-Lined GWB (1/32" Pb)', unit: 'SF', matCost: 12.00, laborCost: 6.50, note: 'X-ray rooms, radiation shielding' },
  { id: 'm13', category: 'Insulation', name: 'R-11 Fiberglass Batt (3-5/8")', unit: 'SF', matCost: 0.65, laborCost: 0.80, note: 'Standard cavity insulation' },
  { id: 'm14', category: 'Insulation', name: 'R-19 Fiberglass Batt (6")', unit: 'SF', matCost: 0.95, laborCost: 0.90, note: 'Deep cavity / exterior walls' },
  { id: 'm15', category: 'Insulation', name: 'R-30 Fiberglass Batt (10")', unit: 'SF', matCost: 1.45, laborCost: 1.10, note: 'Ceiling insulation' },
  { id: 'm16', category: 'Insulation', name: 'Mineral Wool Board (2")', unit: 'SF', matCost: 2.80, laborCost: 1.50, note: 'Fire-rated assemblies, STC walls' },
  { id: 'm17', category: 'ACT / Ceiling', name: '2x2 ACT Grid System', unit: 'SF', matCost: 1.85, laborCost: 2.40, note: 'Standard exposed grid' },
  { id: 'm18', category: 'ACT / Ceiling', name: '2x4 ACT Grid System', unit: 'SF', matCost: 1.65, laborCost: 2.25, note: 'Standard exposed grid' },
  { id: 'm19', category: 'ACT / Ceiling', name: 'Standard Acoustic Tile (NRC .55)', unit: 'SF', matCost: 1.20, laborCost: 0.60, note: 'Armstrong Cortega or equiv' },
  { id: 'm20', category: 'ACT / Ceiling', name: 'Premium Acoustic Tile (NRC .70)', unit: 'SF', matCost: 2.40, laborCost: 0.65, note: 'Armstrong Ultima or equiv' },
  { id: 'm21', category: 'ACT / Ceiling', name: 'Seismic Bracing (ACT grid)', unit: 'SF', matCost: 0.85, laborCost: 1.20, note: 'Required in medical / SDC C+' },
  { id: 'm22', category: 'Specialties', name: 'ICRA Barrier Assembly', unit: 'LF', matCost: 8.00, laborCost: 14.00, note: 'Temporary infection control' },
  { id: 'm23', category: 'Specialties', name: 'Corner Bead (Paper-Faced)', unit: 'LF', matCost: 0.45, laborCost: 0.80, note: 'All outside corners' },
  { id: 'm24', category: 'Specialties', name: 'Control Joint (Vinyl)', unit: 'LF', matCost: 1.20, laborCost: 1.50, note: 'Required every 30\' OC max' },
  { id: 'm25', category: 'Specialties', name: 'Access Panel (12x12)', unit: 'EA', matCost: 28.00, laborCost: 35.00, note: 'Standard flush access door' },
  { id: 'm26', category: 'Finishes', name: 'L4 Joint Treatment (Tape & Finish)', unit: 'SF', matCost: 0.25, laborCost: 1.40, note: 'Standard flat finish' },
  { id: 'm27', category: 'Finishes', name: 'L5 Joint Treatment (Skim Coat)', unit: 'SF', matCost: 0.45, laborCost: 2.80, note: 'Premium smooth finish' },
  { id: 'm28', category: 'Finishes', name: 'FRP Wall Panel (Glue-Up)', unit: 'SF', matCost: 3.50, laborCost: 2.70, note: 'Moisture-resistant wall panel' },
  { id: 'm29', category: 'Finishes', name: 'Spray Fireproofing (Cementitious)', unit: 'SF', matCost: 2.10, laborCost: 2.40, note: 'Beam & column fire protection' },
];
