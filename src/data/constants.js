// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Data Constants & Seed Data
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { isDemoMode } from "./defaults";
const _demo = isDemoMode();

// Bump this when seed data changes to bust stale localStorage caches
export const DATA_VERSION = 11;

// ── THEMES ────────────────────────────────────────────────────
export const THEMES = {
  steel: {
    name: "Steel", icon: "⚙️", label: "Steel",
    vars: {
      "--bg":"#06080c","--bg2":"#0c0f16","--bg3":"#12161f","--bg4":"#1a1f2b",
      "--border":"#1c2233","--border2":"#283044",
      "--amber":"#e09422","--amber2":"#f0a83a","--amber-dim":"rgba(224,148,34,0.10)","--amber-glow":"rgba(224,148,34,0.20)",
      "--blue":"#3b82f6","--blue-dim":"rgba(59,130,246,0.10)",
      "--green":"#10b981","--green-dim":"rgba(16,185,129,0.10)",
      "--red":"#ef4444","--red-dim":"rgba(239,68,68,0.10)",
      "--yellow":"#eab308",
      "--text":"#d4dae6","--text2":"#8494ad","--text3":"#455068",
      "--bg2-rgb":"12,15,22",
      "--glass-border":"rgba(255,255,255,0.06)","--glass-bg":"rgba(12,15,22,0.72)",
      "--font-head":"'Barlow Condensed', sans-serif",
      "--font-body":"'Barlow', sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--radius":"10px","--radius-sm":"6px",
      "--shadow":"0 2px 12px rgba(0,0,0,0.3)","--card-shadow":"0 1px 8px rgba(0,0,0,0.2)",
    }
  },
  blueprint: {
    name: "Blueprint", icon: "📐", label: "Blueprint",
    vars: {
      "--bg":"#020a16","--bg2":"#041220","--bg3":"#061c32","--bg4":"#0a2d4a",
      "--border":"#0c3558","--border2":"#185070",
      "--amber":"#00bfef","--amber2":"#2ad4ff","--amber-dim":"rgba(0,191,239,0.08)","--amber-glow":"rgba(0,191,239,0.18)",
      "--blue":"#00d4ff","--blue-dim":"rgba(0,212,255,0.08)",
      "--green":"#00e89a","--green-dim":"rgba(0,232,154,0.08)",
      "--red":"#ff4f7b","--red-dim":"rgba(255,79,123,0.10)",
      "--yellow":"#ffd866",
      "--text":"#bdddf0","--text2":"#5d98b8","--text3":"#2a5570",
      "--bg2-rgb":"4,18,32",
      "--glass-border":"rgba(0,191,239,0.08)","--glass-bg":"rgba(4,18,32,0.72)",
      "--font-head":"'Barlow Condensed', sans-serif",
      "--font-body":"'Barlow', sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--radius":"6px","--radius-sm":"3px",
      "--shadow":"0 0 0 1px rgba(0,191,239,0.06)","--card-shadow":"0 0 12px rgba(0,191,239,0.04)",
    }
  },
  daylight: {
    name: "Daylight", icon: "☀️", label: "Daylight",
    vars: {
      "--bg":"#f2f3f7","--bg2":"#ffffff","--bg3":"#f8f9fb","--bg4":"#eceef4",
      "--border":"#dfe2ea","--border2":"#c8cdd8",
      "--amber":"#c06e10","--amber2":"#a05a0a","--amber-dim":"rgba(192,110,16,0.07)","--amber-glow":"rgba(192,110,16,0.14)",
      "--blue":"#2563eb","--blue-dim":"rgba(37,99,235,0.07)",
      "--green":"#059669","--green-dim":"rgba(5,150,105,0.07)",
      "--red":"#dc2626","--red-dim":"rgba(220,38,38,0.07)",
      "--yellow":"#b45309",
      "--text":"#1a1d28","--text2":"#555d6e","--text3":"#9aa0b0",
      "--bg2-rgb":"255,255,255",
      "--glass-border":"rgba(0,0,0,0.06)","--glass-bg":"rgba(255,255,255,0.78)",
      "--font-head":"'Barlow Condensed', sans-serif",
      "--font-body":"'Barlow', sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--radius":"10px","--radius-sm":"6px",
      "--shadow":"0 1px 4px rgba(0,0,0,0.06)","--card-shadow":"0 1px 6px rgba(0,0,0,0.05)",
    }
  },
  matrix: {
    name: "Matrix", icon: "💊", label: "Matrix",
    vars: {
      "--bg":"#000400","--bg2":"#010a01","--bg3":"#011201","--bg4":"#021a02",
      "--border":"#083808","--border2":"#124a12",
      "--amber":"#00ff41","--amber2":"#33ff66","--amber-dim":"rgba(0,255,65,0.06)","--amber-glow":"rgba(0,255,65,0.16)",
      "--blue":"#00ff41","--blue-dim":"rgba(0,255,65,0.06)",
      "--green":"#00ff41","--green-dim":"rgba(0,255,65,0.08)",
      "--red":"#ff3c00","--red-dim":"rgba(255,60,0,0.08)",
      "--yellow":"#aaff00",
      "--text":"#00ff41","--text2":"#009928","--text3":"#005216",
      "--bg2-rgb":"1,10,1",
      "--glass-border":"rgba(0,255,65,0.08)","--glass-bg":"rgba(1,10,1,0.85)",
      "--font-head":"'IBM Plex Mono', monospace",
      "--font-body":"'IBM Plex Mono', monospace",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--radius":"2px","--radius-sm":"1px",
      "--shadow":"none","--card-shadow":"0 0 10px rgba(0,255,65,0.04)",
    }
  },
  anime: {
    name: "Anime", icon: "🌸", label: "Tokyo Anime",
    vars: {
      "--bg":"#080414","--bg2":"#0e0820","--bg3":"#140c30","--bg4":"#1c1242",
      "--border":"#2a1868","--border2":"#3c2690",
      "--amber":"#ff2da0","--amber2":"#ff60c0","--amber-dim":"rgba(255,45,160,0.12)","--amber-glow":"rgba(255,45,160,0.30)",
      "--blue":"#00e5ff","--blue-dim":"rgba(0,229,255,0.10)",
      "--green":"#80ff60","--green-dim":"rgba(128,255,96,0.10)",
      "--red":"#ff3070","--red-dim":"rgba(255,48,112,0.12)",
      "--yellow":"#ffe44d",
      "--text":"#f0e4ff","--text2":"#b498d8","--text3":"#604890",
      "--bg2-rgb":"14,8,32",
      "--glass-border":"rgba(255,45,160,0.12)","--glass-bg":"rgba(14,8,32,0.68)",
      "--font-head":"'Barlow Condensed', sans-serif",
      "--font-body":"'Barlow', sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--radius":"14px","--radius-sm":"8px",
      "--shadow":"0 0 20px rgba(255,45,160,0.08)","--card-shadow":"0 0 16px rgba(255,45,160,0.06)",
    }
  },
  ebc: {
    name: "EBC Brand", icon: "🦅", label: "EBC Brand",
    vars: {
      "--bg":"#0f1a24","--bg2":"#152332","--bg3":"#1b2d3f","--bg4":"#1e2d3b",
      "--border":"#263d52","--border2":"#345068",
      "--amber":"#ff7f21","--amber2":"#ff9642","--amber-dim":"rgba(255,127,33,0.10)","--amber-glow":"rgba(255,127,33,0.22)",
      "--blue":"#3b82f6","--blue-dim":"rgba(59,130,246,0.10)",
      "--green":"#10b981","--green-dim":"rgba(16,185,129,0.10)",
      "--red":"#ef4444","--red-dim":"rgba(239,68,68,0.10)",
      "--yellow":"#eab308",
      "--text":"#e8ecf2","--text2":"#8fa4ba","--text3":"#4d6478",
      "--bg2-rgb":"21,35,50",
      "--glass-border":"rgba(255,255,255,0.06)","--glass-bg":"rgba(21,35,50,0.78)",
      "--font-head":"'Inter', -apple-system, sans-serif",
      "--font-body":"'Inter', -apple-system, sans-serif",
      "--font-mono":"'SF Mono', 'IBM Plex Mono', monospace",
      "--radius":"10px","--radius-sm":"6px",
      "--shadow":"0 2px 12px rgba(0,0,0,0.3)","--card-shadow":"0 2px 10px rgba(0,0,0,0.2)",
    }
  },
  midnight: {
    name: "Midnight", icon: "🌙", label: "Midnight (Apple Dark)",
    vars: {
      "--bg":"#000000","--bg2":"#1c1c1e","--bg3":"#2c2c2e","--bg4":"#3a3a3c",
      "--border":"#38383a","--border2":"#48484a",
      "--amber":"#ff9f0a","--amber2":"#ffb340","--amber-dim":"rgba(255,159,10,0.10)","--amber-glow":"rgba(255,159,10,0.16)",
      "--blue":"#0a84ff","--blue-dim":"rgba(10,132,255,0.10)",
      "--green":"#30d158","--green-dim":"rgba(48,209,88,0.10)",
      "--red":"#ff453a","--red-dim":"rgba(255,69,58,0.10)",
      "--yellow":"#ffd60a",
      "--text":"#f5f5f7","--text2":"#98989d","--text3":"#636366",
      "--bg2-rgb":"28,28,30",
      "--glass-border":"rgba(255,255,255,0.08)","--glass-bg":"rgba(28,28,30,0.82)",
      "--font-head":"-apple-system, 'SF Pro Display', 'Inter', sans-serif",
      "--font-body":"-apple-system, 'SF Pro Text', 'Inter', sans-serif",
      "--font-mono":"'SF Mono', 'Menlo', monospace",
      "--radius":"12px","--radius-sm":"8px",
      "--shadow":"0 2px 10px rgba(0,0,0,0.4)","--card-shadow":"0 1px 8px rgba(0,0,0,0.3)",
    }
  },
  cyberpunk: {
    name: "Cyberpunk", icon: "🏙️", label: "Tokyo Cyberpunk",
    vars: {
      "--bg":"#0a0a12","--bg2":"#0e1020","--bg3":"#141830","--bg4":"#1a2040",
      "--border":"#1e2850","--border2":"#2a3870",
      "--amber":"#00f0ff","--amber2":"#40f8ff","--amber-dim":"rgba(0,240,255,0.08)","--amber-glow":"rgba(0,240,255,0.25)",
      "--blue":"#0088ff","--blue-dim":"rgba(0,136,255,0.10)",
      "--green":"#00ff88","--green-dim":"rgba(0,255,136,0.10)",
      "--red":"#ff0055","--red-dim":"rgba(255,0,85,0.12)",
      "--yellow":"#ffe100",
      "--text":"#e0f0ff","--text2":"#7090b8","--text3":"#384868",
      "--bg2-rgb":"14,16,32",
      "--glass-border":"rgba(0,240,255,0.10)","--glass-bg":"rgba(10,10,18,0.80)",
      "--font-head":"'Barlow Condensed', sans-serif",
      "--font-body":"'Barlow', sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--radius":"4px","--radius-sm":"2px",
      "--shadow":"0 0 20px rgba(0,240,255,0.06)","--card-shadow":"0 0 12px rgba(0,240,255,0.05)",
    }
  },
};

// ── ASSEMBLIES (expanded with ACT, insulation, specialties) ──
// matRate = material cost per unit, labRate = labor cost per unit
// Prices updated from EBC price book (2022-2026 supplier quotes)
export const ASSEMBLIES = [
  // ── WALLS ──
  {code:"A2",name:'3-5/8" 20ga Freestanding Wall',unit:"LF",p8:44.02,p10:54.95,p14:82.38,p20:128.89,matRate:14.02,labRate:40.93,verified:true},
  {code:"A3",name:'2-1/2" 20ga Partition',unit:"LF",p8:42.18,p10:52.66,p14:78.94,p20:123.50,matRate:12.73,labRate:39.93,verified:true},
  {code:"A4",name:'8" 20ga Partition',unit:"LF",p8:53.66,p10:66.79,p14:99.72,p20:155.42,matRate:20.36,labRate:46.43,verified:true},
  {code:"B1",name:'6" 20ga Freestanding Wall',unit:"LF",p8:49.27,p10:61.33,p14:91.68,p20:143.09,matRate:16.03,labRate:45.30,verified:true},
  {code:"DW1",name:'6" Deck Wall 20ga',unit:"LF",p8:49.27,p10:61.33,p14:91.68,p20:143.09,matRate:16.03,labRate:45.30,verified:true},
  {code:"DW2",name:'6" Deck Wall 16ga (Heavy)',unit:"LF",p8:54.89,p10:68.31,p14:102.00,p20:159.04,matRate:19.51,labRate:48.80,verified:true},
  {code:"C2",name:"C2 Furring (One Side)",unit:"LF",p8:20.62,p10:25.42,p14:38.06,p20:59.61,matRate:7.82,labRate:17.60,verified:true},
  // ── CEILINGS / SOFFITS ──
  {code:"FD1",name:"Furr-Down / Soffit",unit:"LF",special:"33% progress rate",matRate:12.50,labRate:36.00,verified:true},
  {code:"GC1",name:"GWB Suspended Ceiling",unit:"SF",special:"25% progress rate",matRate:2.20,labRate:5.15,verified:true},
  {code:"ACT1",name:"2x2 ACT Grid + Tile (Std)",unit:"SF",p8:null,p10:7.27,p14:null,p20:null,matRate:3.02,labRate:4.25,verified:true},
  {code:"ACT2",name:"2x4 ACT Grid + Tile (Std)",unit:"SF",p8:null,p10:6.72,p14:null,p20:null,matRate:2.82,labRate:3.90,verified:true},
  // ── INSULATION ──
  {code:"INS1",name:'R-13 Batt Insulation (3-5/8")',unit:"SF",p8:null,p10:1.25,p14:null,p20:null,matRate:0.45,labRate:0.80,verified:true},
  {code:"INS2",name:'R-19 Batt Insulation (6")',unit:"SF",p8:null,p10:1.39,p14:null,p20:null,matRate:0.49,labRate:0.90,verified:true},
  {code:"INS3",name:'R-21 Batt Insulation (6")',unit:"SF",p8:null,p10:1.59,p14:null,p20:null,matRate:0.69,labRate:0.90,verified:true},
  {code:"INS4",name:'3" Mineral Wool',unit:"SF",p8:null,p10:2.35,p14:null,p20:null,matRate:0.85,labRate:1.50,verified:true},
  // ── SPECIALTIES ──
  {code:"FP1",name:"Spray Fireproofing (Beam/Col)",unit:"SF",p8:null,p10:4.50,p14:null,p20:null,matRate:2.10,labRate:2.40,verified:false},
  {code:"FRP1",name:"FRP Wall Panel (Glue-Up)",unit:"SF",p8:null,p10:6.20,p14:null,p20:null,matRate:3.50,labRate:2.70,verified:false},
  {code:"LL1",name:'Lead-Lined GWB (1/32" Pb)',unit:"SF",p8:null,p10:10.71,p14:null,p20:null,matRate:4.21,labRate:6.50,verified:true},
  {code:"ICRA1",name:"ICRA Dust Barrier (Temp)",unit:"LF",p8:null,p10:22.00,p14:null,p20:null,matRate:8.00,labRate:14.00,verified:true},
  // ── SHAFT WALL ──
  {code:"SW1",name:"Shaft Wall System (1-hr)",unit:"LF",p8:null,p10:46.35,p14:null,p20:null,matRate:14.35,labRate:32.00,verified:true},
  // ── PROFIT ADD-ONS ──
  {code:"CB",name:"Corner Bead (Paper-Faced)",unit:"LF",p8:null,p10:2.05,p14:null,p20:null,matRate:0.85,labRate:1.20,verified:true},
  {code:"CJ",name:"Control Joint (Zinc)",unit:"EA",p8:null,p10:30.00,p14:null,p20:null,matRate:12.00,labRate:18.00,verified:true},
  {code:"FC",name:"Fire Caulking (Intumescent)",unit:"LF",p8:null,p10:6.00,p14:null,p20:null,matRate:2.50,labRate:3.50,verified:true},
  {code:"BLK",name:"Blocking Allowance",unit:"SF",p8:null,p10:4.30,p14:null,p20:null,matRate:1.50,labRate:2.80,verified:true},
  {code:"DF",name:"Door Frame (Metal Stud Header + Jambs)",unit:"EA",p8:null,p10:185.00,p14:null,p20:null,matRate:65.00,labRate:120.00,verified:true},
  {code:"SL",name:"Sidelight Framing",unit:"EA",p8:null,p10:145.00,p14:null,p20:null,matRate:45.00,labRate:100.00,verified:true},
];

// ── AUTO-PROFIT SUGGESTIONS (commonly forgotten add-ons) ──
export const PROFIT_SUGGESTIONS = [
  { code:"CB",  name:"Corner Bead",        unit:"LF",  matRate:0.85,  labRate:1.20,  pct:0.15, basis:"wallLF", desc:"~15% of wall LF" },
  { code:"CJ",  name:"Control Joints",     unit:"EA",  matRate:12.00, labRate:18.00, pct:null, divisor:30, basis:"wallLF", desc:"1 per 30 LF of wall" },
  { code:"FC",  name:"Fire Caulking",      unit:"LF",  matRate:2.50,  labRate:3.50,  pct:0.10, basis:"wallLF", desc:"~10% of wall LF at rated partitions" },
  { code:"BLK", name:"Blocking Allowance", unit:"SF",  matRate:1.50,  labRate:2.80,  pct:0.05, basis:"totalSF", desc:"5% of total SF for misc blocking" },
  { code:"DF",  name:"Door Frames",       unit:"EA",  matRate:65.00, labRate:120.00, pct:null, divisor:25, basis:"wallLF", desc:"~1 per 25 LF of wall (adjust to plan count)" },
  { code:"SL",  name:"Sidelights",        unit:"EA",  matRate:45.00, labRate:100.00, pct:null, divisor:50, basis:"wallLF", desc:"~1 per 50 LF of wall (adjust to plan count)" },
  { code:"PL",  name:"Punchlist %",        unit:"LS",  matRate:0,     labRate:0,     pct:0.02, basis:"subtotal", desc:"2% of subtotal for punchlist labor" },
];

// ── HEIGHT FACTOR FUNCTION ──
export function getHF(h){
  if(h<=10) return{f:1.00,l:"Baseline",c:"Standard ladder/step"};
  if(h<=14) return{f:1.09,l:"+9% labor",c:"Tall ladder, baker scaffold"};
  if(h<=18) return{f:1.20,l:"+20% labor",c:"Rolling scaffold"};
  if(h<=24) return{f:1.30,l:"+30% labor",c:"Rolling scaffold or man-lift"};
  if(h<=30) return{f:1.54,l:"+54% labor",c:"Man-lift required"};
  return{f:1.70,l:"+70%+ labor",c:"Multi-level staging"};
}

// ── SCOPE CHECKLIST (18 items — used per-takeoff before proposal export) ──
export const SCOPE_INIT = [
  {id:1,title:"Finish Level (L4 vs L5)",desc:"L5 specified at lobby, gloss paint, or critical lighting?",status:"unchecked"},
  {id:2,title:"Backing & Blocking",desc:"Who provides blocking behind casework, handrails, TVs?",status:"unchecked"},
  {id:3,title:"Deflection Track",desc:"Any walls framing to deck? Slotted/deep-leg track required?",status:"unchecked"},
  {id:4,title:"Acoustical Sealant",desc:"Any acoustical partitions spec'd? Sealant in spec section?",status:"unchecked"},
  {id:5,title:"Lead-Lined Scope",desc:"Lead-lined drywall in scope? MUST specify thickness (1/32\", 1/16\", 1/8\").",status:"unchecked"},
  {id:6,title:"Access Panels",desc:"EBC usually furnishes & installs. Clarify if owner-furnished.",status:"unchecked"},
  {id:7,title:"Seismic ACT Bracing",desc:"Seismic Design Category C or higher? Medical occupancy?",status:"unchecked"},
  {id:8,title:"Corner Bead Count",desc:"All outside corners, window wraps, door returns counted?",status:"unchecked"},
  {id:9,title:"Control Joints",desc:"Spec require CJs? At what spacing? (typically 30' OC)",status:"unchecked"},
  {id:10,title:"Shaft Wall Systems",desc:"Elevator/stair shafts or duct chases in scope?",status:"unchecked"},
  {id:11,title:"Above-ACT Framing",desc:"Any EBC framing above the ACT plane required?",status:"unchecked"},
  {id:12,title:"Patching at Penetrations",desc:"Existing drywall needing patch at MEP penetrations?",status:"unchecked"},
  {id:13,title:"Off-Hours Requirement",desc:"Work restricted to after-hours or weekends?",status:"unchecked"},
  {id:14,title:"Phasing / Multiple Mobs",desc:"Multiple mobilizations? Price each mob separately.",status:"unchecked"},
  {id:15,title:"GWB Type Check",desc:"Abuse-resistant, soundproof, or moisture-resistant GWB?",status:"unchecked"},
  {id:16,title:"Equipment Support Framing",desc:"Above-ceiling equipment support framing in EBC scope?",status:"unchecked"},
  {id:17,title:"Addenda Review",desc:"All addenda reviewed? Scope changes after original set?",status:"unchecked"},
  {id:18,title:"Drawing Conflicts",desc:"Walls shown differently on different sheets? Submit RFI.",status:"unchecked"},
];

// Maps each checklist item → include/exclude text for the proposal
export const SCOPE_ITEM_MAP = {
  1:  { includeText: "Drywall finish to Level 4 (tape, float, skim)", excludeText: "Level 5 finish (skim coat for gloss paint or critical lighting areas)" },
  2:  { includeText: "Wood blocking in walls as noted on drawings", excludeText: "Blocking behind casework, handrails, TVs, monitors (unless noted on drawings)" },
  3:  { includeText: "Deflection track at walls framing to deck", excludeText: "Slotted or deep-leg deflection track at deck connections" },
  4:  { includeText: "Acoustical sealant at rated partitions", excludeText: "Acoustical sealant and acoustical partition treatment" },
  5:  { includeText: "Lead-lined drywall furnish and install (thickness: ___/32\")", excludeText: "Lead-lined drywall and shielding materials — thickness must be specified (1/32\", 1/16\", 1/8\")" },
  6:  { includeText: "Access panels — furnish and install", excludeText: "Access panels — install only (owner-furnished)" },
  7:  { includeText: "Seismic bracing for ACT grid per code", excludeText: "Seismic bracing for acoustical ceiling grid" },
  8:  { includeText: "Corner bead at all outside corners, window wraps, and door returns", excludeText: "Additional corner bead beyond what is shown on drawings" },
  9:  { includeText: "Control joints per specification", excludeText: "Control joints in drywall and acoustical ceilings" },
  10: { includeText: "Shaft wall systems at elevator, stair shafts, and duct chases", excludeText: "Shaft wall systems" },
  11: { includeText: "Framing above acoustical ceiling plane where noted", excludeText: "Framing above ACT plane" },
  12: { includeText: "Patching existing drywall at MEP penetrations", excludeText: "Patching at MEP penetrations in existing walls" },
  13: { includeText: "Work to be performed during regular working hours", excludeText: "Overtime, after-hours, and weekend work" },
  14: { includeText: "Single mobilization", excludeText: "Multiple mobilizations or re-mobilization" },
  15: { includeText: "Standard Type X gypsum board", excludeText: "Specialty GWB (abuse-resistant, moisture-resistant, soundboard, etc.)" },
  16: { includeText: "Above-ceiling equipment support framing where noted", excludeText: "Above-ceiling equipment support framing" },
  17: { includeText: "All addenda reviewed and incorporated through Addendum #___", excludeText: "Scope changes from addenda not yet reviewed" },
  18: { includeText: "Scope per architectural drawings", excludeText: "Scope differences between conflicting drawing sheets" },
};

// Default assumptions for proposals (editable per takeoff)
export const DEFAULT_ASSUMPTIONS = [
  "Pricing based on drawings dated ___ (Rev ___), Addenda through #___",
  "EBC provides all scaffolding and equipment for own trade",
  "Dumpsters by general contractor",
  "Assumes unobstructed access to all work areas",
  "Assumes single mobilization unless noted",
  "Assumes standard ceiling heights (22' or less to deck)",
];

// Default proposal terms
export const DEFAULT_PROPOSAL_TERMS = {
  paymentTerms: "Progress billing monthly, Net 30",
  warranty: "EBC warrants workmanship for one (1) year from date of substantial completion.",
  changeOrders: "Changes to scope of work will be priced and submitted for approval prior to execution.",
  pricingValidity: "Pricing is valid for 30 days from proposal date.",
};

// ── Scope Checklist Templates by Project Type ──
// Pre-sets common checklist statuses based on project type
export const SCOPE_TEMPLATES = {
  Medical: {
    label: "Medical / Healthcare",
    presets: { 5: "checked", 7: "checked", 10: "checked", 15: "checked" },
    // Lead-lined (5) usually in scope, seismic ACT (7), shaft walls (10), GWB type (15)
  },
  Commercial: {
    label: "Commercial Office",
    presets: { 1: "checked", 6: "checked", 8: "checked", 13: "checked" },
    // L4 finish (1), access panels (6), corner bead (8), off-hours unlikely (13 checked = regular hours)
  },
  Retail: {
    label: "Retail / Restaurant",
    presets: { 1: "checked", 6: "checked", 13: "checked", 14: "checked" },
    // L4 finish, access panels, regular hours, single mob
  },
  Education: {
    label: "Education / K-12",
    presets: { 1: "checked", 4: "checked", 7: "checked", 13: "unchecked" },
    // L4, acoustical sealant, seismic, off-hours likely (13 unchecked = excluded)
  },
  Federal: {
    label: "Federal / Government",
    presets: { 1: "checked", 4: "checked", 5: "checked", 7: "checked", 15: "checked", 17: "checked" },
    // Most items in scope for federal, strict specs
  },
};

// ── SEED: BIDS (70+ real bids) ──
const _demoBids = [
  // ── REAL EBC BIDS (from estimating system) ──
  // 2026
  {id:101,name:"Endurance Builders - Woodside Laboratory",gc:"Endurance Builders",value:74800,due:"Mar 13, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Christina Zube Volkers",month:"Mar",closeOut:null,bidDate:"Mar 13, 2026"},
  {id:102,name:"WCC - Real Manage Suite 250",gc:"WCC",value:31200,due:"Mar 12, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Heidi Phillips",month:"Mar",closeOut:null,bidDate:"Mar 12, 2026"},
  {id:103,name:"United - Escapology San Antonio",gc:"United Constructors",value:193300,due:"Mar 16, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Latest proposal 03/16/2026",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 16, 2026"},
  {id:104,name:"United - 801 Travis - Elevator Lobby Remodel",gc:"United",value:35100,due:"Mar 11, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:105,name:"Memorial Hermann - Fulshear SMR",gc:"Memorial Hermann",value:121000,due:"Mar 11, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"",contact:"Leigh Bartish",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:106,name:"FKC San Angelo",gc:"Bayshore",value:313400,due:"Mar 10, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Josh",month:"Mar",closeOut:null,bidDate:"Mar 10, 2026"},
  {id:107,name:"United - Aggieland Imaging - College Station - Outpatient MRI Facility",gc:"United",value:79600,due:"Mar 10, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 10, 2026"},
  {id:108,name:"United - Ogle School Remodel",gc:"United",value:300200,due:"Mar 6, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 6, 2026"},
  {id:110,name:"Arch-Con - Regor Therapeutics",gc:"Arch-Con",value:89700,due:"Mar 5, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Doors & Hardware"],phase:"Medical",risk:"",notes:"4 suites: 800 Gym ($30.1K) + 800 CEO ($32.5K) + 840 ($11.6K) + 830 ($15.5K)",contact:"Robert Fortney",month:"Mar",closeOut:null,bidDate:"Mar 5, 2026"},
  {id:111,name:"Structure Tone - 8303 Fallbrook Drive Generator Addition",gc:"Structure Tone",value:6000,due:"Mar 4, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Alba Flores",month:"Mar",closeOut:null,bidDate:"Mar 4, 2026"},
  {id:112,name:"United - Sun City Retail - Building C",gc:"United",value:14300,due:"Mar 2, 2026",status:"submitted",scope:["Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"Georgetown, TX",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 2, 2026"},
  {id:113,name:"United - Sun City Retail Building B",gc:"United",value:14300,due:"Mar 2, 2026",status:"submitted",scope:["Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"Georgetown, TX",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 2, 2026"},
  {id:115,name:"United - Sun City Retail Building A",gc:"United",value:13900,due:"Mar 2, 2026",status:"submitted",scope:["Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"Georgetown, TX",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 2, 2026"},
  {id:118,name:"Forney - Duchesne Academy Round 2",gc:"Forney",value:250800,due:"Feb 26, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Education",risk:"",notes:"Same scope as Duchesne Classrooms. Alts: +$4,800/wk dual mobilization, -$5K framing deduct, +$16.8K door salvage, +$6.5K ext infill",contact:"Monica Waller",month:"Feb",closeOut:null,bidDate:"Feb 26, 2026"},
  {id:120,name:"OSC - Canopy by Hilton",gc:"O'Donnell/Snider",value:3177600,due:"Feb 24, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Hospitality",risk:"",notes:"",contact:"Kim Bullard",month:"Feb",closeOut:null,bidDate:"Feb 24, 2026"},
  {id:121,name:"Structure Tone - Southwest General Building",gc:"Structure Tone",value:36500,due:"Feb 24, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Blessing Awobayiku",month:"Feb",closeOut:null,bidDate:"Feb 24, 2026"},
  {id:122,name:"Bayshore - Texas Heart Center",gc:"Bayshore",value:54200,due:"Feb 20, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Lead-Lined Walls","Doors & Hardware"],phase:"Medical",risk:"",notes:"",contact:"Josh",month:"Feb",closeOut:null,bidDate:"Feb 20, 2026"},
  {id:123,name:"WCC - CB&I CEO/Lvl 2/Lvl 7",gc:"WC Construction",value:59800,due:"Mar 11, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"],phase:"Commercial",risk:"",notes:"Starts 3/20/2026 6PM. After hours work.",contact:"Heidi Phillips",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:125,name:"Memorial Hermann - Woodlands RAD Equipment Replacement",gc:"Forney Construction",value:10500,due:"Feb 17, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings"],phase:"Medical",risk:"",notes:"",contact:"Jason McIntyre",month:"Feb",closeOut:null,bidDate:"Feb 17, 2026"},
  {id:126,name:"United - Edwin Watts Golf Shop",gc:"United",value:119100,due:"Feb 19, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"],phase:"Retail",risk:"",notes:"",contact:"Mistie Williams",month:"Feb",closeOut:null,bidDate:"Feb 19, 2026"},
  {id:127,name:"Forney - Roseate Beach Amenities",gc:"Forney",value:771100,due:"Feb 25, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware","Shaft Wall"],phase:"Commercial",risk:"",notes:"Galveston, TX",contact:"Monica Waller",month:"Feb",closeOut:null,bidDate:"Feb 25, 2026"},
  {id:129,name:"Fort Bend Hope Center",gc:"Forney Construction",value:65100,due:"Feb 16, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Rosenberg, TX",contact:"Monica Waller",month:"Feb",closeOut:null,bidDate:"Feb 16, 2026"},
  {id:130,name:"Montgomery Roth Office Suite 7029",gc:"Garrison Construction",value:46700,due:"Feb 16, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Melanie Itzel",month:"Feb",closeOut:null,bidDate:"Feb 16, 2026"},
  {id:131,name:"Memorial Hermann - MHSE CT",gc:"Memorial Hermann",value:6900,due:"Feb 13, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"",contact:"R. Halvorson",month:"Feb",closeOut:null,bidDate:"Feb 13, 2026"},
  {id:132,name:"Memorial Hermann - The Woodlands MNA Infusion",gc:"Memorial Hermann",value:25000,due:"Feb 12, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"],phase:"Medical",risk:"",notes:"",contact:"Carter C",month:"Feb",closeOut:null,bidDate:"Feb 12, 2026"},
  {id:133,name:"Memorial Hermann - MC MP3 Infusion Suite 785",gc:"Forney Construction",value:25000,due:"Feb 12, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings"],phase:"Medical",risk:"",notes:"",contact:"Monica Waller",month:"Feb",closeOut:null,bidDate:"Feb 12, 2026"},
  {id:135,name:"United - Apricot Lane",gc:"United",value:10700,due:"Feb 11, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"",contact:"Mistie Williams",month:"Feb",closeOut:null,bidDate:"Feb 11, 2026"},
  {id:136,name:"Forney - Grace Bible Church",gc:"Forney Construction",value:780700,due:"Feb 10, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware","Shaft Wall"],phase:"Religious",risk:"",notes:"Won by GC, not yet awarded to EBC",contact:"Monica Waller",month:"Feb",closeOut:null,bidDate:"Feb 10, 2026"},
  {id:138,name:"Arch-Con - Sprouts Farmers Market",gc:"Arch-Con",value:215100,due:"Feb 6, 2026",status:"awarded",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"",contact:"Jon Windham",month:"Feb",closeOut:null,bidDate:"Feb 6, 2026"},
  {id:139,name:"WCC - AB Energy",gc:"WCC",value:110300,due:"Feb 6, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Heidi Phillips",month:"Feb",closeOut:null,bidDate:"Feb 6, 2026"},
  {id:140,name:"Warwick - Octapharma Plasma - Little York",gc:"Warwick Construction",value:146100,due:"Feb 6, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"",contact:"Carlos Campbell",month:"Feb",closeOut:null,bidDate:"Feb 6, 2026"},
  {id:141,name:"WCC - Brazos County Road & Bridge",gc:"WCC",value:230400,due:"Feb 9, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Government",risk:"",notes:"Bryan, TX",contact:"Heidi Phillips",month:"Feb",closeOut:null,bidDate:"Feb 9, 2026"},
  {id:142,name:"Nan & Company",gc:"WCC",value:47000,due:"Jan 30, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Heidi Phillips",month:"Jan",closeOut:null,bidDate:"Jan 30, 2026"},
  {id:143,name:"CSH ST Lukes Vintage Cath Lab 2",gc:"Jacob White",value:55200,due:"Jan 29, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"",contact:"Alex Vidosh",month:"Jan",closeOut:null,bidDate:"Jan 29, 2026"},
  {id:144,name:"Forney - Hobby Center Admin Offices",gc:"Forney Construction",value:213700,due:"Jan 28, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Monica Waller",month:"Jan",closeOut:null,bidDate:"Jan 28, 2026"},
  {id:145,name:"Forney - Duchesne Academy Classrooms",gc:"Forney Construction",value:250800,due:"Jan 28, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Education",risk:"",notes:"",contact:"Monica Waller",month:"Jan",closeOut:null,bidDate:"Jan 28, 2026"},
  {id:146,name:"Forney - Mobile Energy Solutions",gc:"Forney",value:100600,due:"Jan 28, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Monica Waller",month:"Jan",closeOut:null,bidDate:"Jan 28, 2026"},
  {id:147,name:"United - Edward Jones",gc:"United",value:53500,due:"Jan 26, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Brenham, TX",contact:"Mistie Williams",month:"Jan",closeOut:null,bidDate:"Jan 26, 2026"},
  {id:148,name:"UT Orthopedics Cypress Buildout",gc:"ATH",value:386800,due:"Jan 27, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"Cypress, TX. Alts: +$22,250 corner guards, +$6,300 sound batts",contact:"Emilio Alaniz",month:"Jan",closeOut:null,bidDate:"Jan 27, 2026"},
  {id:149,name:"United - Powder Keg",gc:"United",value:197700,due:"Jan 29, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Mistie Williams",month:"Jan",closeOut:null,bidDate:"Jan 29, 2026"},
  {id:150,name:"United - Orion Medical PET/CT Project",gc:"United",value:70500,due:"Jan 23, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"3 rooms: Scan 289 ($23.8K) + Scan 287 ($42.9K) + Stress 222 ($3.8K). Alts: +$5.4K fur-down per scan room",contact:"Mistie Williams",month:"Jan",closeOut:null,bidDate:"Jan 23, 2026"},
  {id:151,name:"Gullo Commercial - Stonebridge Church Renovation to the Gap Room",gc:"Gullo Commercial",value:59800,due:"Jan 22, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Religious",risk:"",notes:"",contact:"Renee Hollek",month:"Jan",closeOut:null,bidDate:"Jan 22, 2026"},
  {id:152,name:"WCC - TAMU SSC - Gardens Refresh",gc:"WCC",value:44600,due:"Mar 3, 2026",status:"submitted",scope:["Demo","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Education",risk:"",notes:"College Station, TX",contact:"Heidi Phillips",month:"Mar",closeOut:null,bidDate:"Mar 3, 2026"},
  {id:153,name:"Davenport Cube Exec Offices",gc:"United Constructors",value:302900,due:"Jan 19, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Austin, TX",contact:"Mistie Williams",month:"Jan",closeOut:null,bidDate:"Jan 19, 2026"},
  {id:154,name:"ROD - Space F150",gc:"United Constructors",value:19700,due:"Jan 27, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"River Oaks District",contact:"Mistie Williams",month:"Jan",closeOut:null,bidDate:"Jan 27, 2025"},
  {id:155,name:"WCC - RMA Houston Test Fit",gc:"WCC",value:16900,due:"Jan 16, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"The Woodlands, TX",contact:"Heidi Phillips",month:"Jan",closeOut:null,bidDate:"Jan 16, 2026"},
  {id:156,name:"Wier - Mac Hiak CDJR",gc:"Wier",value:633300,due:"Jan 16, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"33' deck height. Alts: +$14K tax, +$22.4K plywood, +$800 FRP, +$9.5K engineered drawings",contact:"Preston Cheney",month:"Jan",closeOut:null,bidDate:"Jan 16, 2026"},
  {id:157,name:"United - Texas Heart & Vascular Specialist",gc:"United",value:16300,due:"Jan 14, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"",contact:"Mistie Williams",month:"Jan",closeOut:null,bidDate:"Jan 14, 2026"},
  {id:158,name:"Farmers - Existing Office Expansion",gc:"Farmer Construction",value:22900,due:"Jan 13, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Chase Evans",month:"Jan",closeOut:null,bidDate:"Jan 13, 2026"},
  {id:159,name:"Forney - Miscellaneous Office Buildout",gc:"Forney Construction",value:18600,due:"Jan 13, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Monica Waller",month:"Jan",closeOut:null,bidDate:"Jan 13, 2026"},
  {id:160,name:"Brunello Cucinelli - Store Buildout",gc:"Brodson",value:308400,due:"Feb 20, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"Submitted to Brodson & Hirsch. 4444 Westheimer Rd F155, Houston TX 77027",contact:"Philippe Faucher",month:"Feb",closeOut:null,bidDate:"Feb 20, 2026"},
  {id:174,name:"ROD - Brunello Cucinelli Expansion (Landlord Work)",gc:"United Constructors",value:49900,due:"Jan 14, 2025",status:"awarded",scope:["Metal Framing","Drywall"],phase:"Retail",risk:"",notes:"ROD landlord work directly with United. 4444 Westheimer Rd, Houston TX 77027",contact:"Justin Gayford",month:"Jan",closeOut:null,bidDate:"Jan 14, 2025"},
  {id:163,name:"Forney - BSLMC Cath Labs 4 & 9",gc:"Forney Construction",value:104500,due:"Mar 5, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls","ACT Ceilings"],phase:"Medical",risk:"",notes:"Latest proposal 03/05/2026. Alts: +$3,100 + $4,800",contact:"Jennifer Averitt",month:"Mar",closeOut:null,bidDate:"Mar 5, 2026"},
  {id:164,name:"UTMB M87 PCP Cancer Services Clinic",gc:"York Construction",value:525400,due:"Jan 9, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"Galveston, TX",contact:"Yarelys Hernandez",month:"Jan",closeOut:null,bidDate:"Jan 9, 2025"},
  {id:165,name:"Potbellys Sandwich Shop - Woodlands",gc:"Warwick Construction",value:39700,due:"Jan 7, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"The Woodlands, TX",contact:"Kendrick Quintanilla",month:"Jan",closeOut:null,bidDate:"Jan 7, 2026"},
  {id:168,name:"United - Heart Care Clinic - NW Houston",gc:"United Constructors",value:83500,due:"Jan 5, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"COMPLETE",contact:"Steve Williams",month:"Jan",closeOut:null,bidDate:"Jan 5, 2026"},
  // 2025
  {id:169,name:"JP's Construction - Health Source",gc:"JP's Construction",value:40100,due:"Dec 22, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"Alts: +$9,900 paint, +$7,500 demising",contact:"Robert",month:"Dec",closeOut:null,bidDate:"Dec 22, 2025"},
  {id:170,name:"Jacob White - Holler Brewing Expansion",gc:"Jacob White",value:28400,due:"Dec 22, 2025",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Budget pricing",contact:"Alex Vidosh",month:"Dec",closeOut:null,bidDate:"Dec 22, 2025"},
  {id:173,name:"Forney - Dell Webb Pickleball",gc:"Forney",value:258000,due:"Dec 18, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Monica Waller",month:"Dec",closeOut:null,bidDate:"Dec 18, 2025"},
  {id:175,name:"Memorial Hermann - Neuro IR",gc:"O'Donnell/Snider",value:34000,due:"Dec 12, 2025",status:"awarded",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"PM: Abner Aguilar",contact:"Ethan Alvarez",month:"Dec",closeOut:null,bidDate:"Dec 12, 2025"},
  {id:176,name:"Hope Clinic",gc:"Forney Construction",value:85300,due:"Dec 12, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"7 alternates available up to +$159K",contact:"Monica Waller",month:"Dec",closeOut:null,bidDate:"Dec 12, 2025"},
  {id:177,name:"Memorial Hermann - Memorial City Single Plane IR",gc:"O'Donnell/Snider",value:33000,due:"Dec 11, 2025",status:"awarded",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"PM: Abner Aguilar",contact:"Ethan Alvarez",month:"Dec",closeOut:null,bidDate:"Dec 11, 2025"},
  {id:178,name:"Memorial Hermann - League City CCC - CT Equipment Exchange",gc:"Forney Construction",value:14900,due:"Dec 10, 2025",status:"awarded",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"Base + CO#1 $800. Alt: +$14,100 lead shielding replacement",contact:"Jason McIntyre",month:"Dec",closeOut:null,bidDate:"Dec 10, 2025"},
  {id:179,name:"Memorial Hermann - Pearland MEIC CT",gc:"Forney Construction",value:10500,due:"Dec 10, 2025",status:"awarded",scope:["Demo","Drywall","ACT Ceilings","Tape & Finish","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"Alts: +$300 soffit repair, +$1,000 lead door, +$1,100 demo flooring",contact:"Mariana Fumero",month:"Dec",closeOut:null,bidDate:"Dec 10, 2025"},
  {id:182,name:"Pard Campus",gc:"Anchor",value:308700,due:"Dec 8, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Education",risk:"",notes:"",contact:"Will Talamaivao",month:"Dec",closeOut:null,bidDate:"Dec 8, 2025"},
  {id:183,name:"MH - Southwest IR Exchange",gc:"Memorial Hermann",value:50000,due:"Dec 4, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"Alt: +$32,100 lead-lined walls",contact:"Ethan Alvarez",month:"Dec",closeOut:null,bidDate:"Dec 4, 2025"},
  {id:184,name:"UT Health - MSB Open Wet Lab Renovation",gc:"Jacob White",value:24500,due:"Dec 3, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"],phase:"Education",risk:"",notes:"",contact:"Montserrat Cabrera",month:"Dec",closeOut:null,bidDate:"Dec 3, 2025"},
  {id:185,name:"Anchor - Meridiana Retail Center",gc:"Anchor",value:23100,due:"Dec 3, 2025",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"",contact:"Will Talamaivao",month:"Dec",closeOut:null,bidDate:"Dec 3, 2025"},
  {id:187,name:"Forney - MHMC Cancer Center",gc:"Forney Construction",value:13300,due:"Dec 2, 2025",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings"],phase:"Medical",risk:"",notes:"CLOSEOUT — base $13,300 + COs. L4 waiting on closeouts.",contact:"Jennifer Averitt",month:"Dec",closeOut:null,bidDate:"Dec 2, 2025"},
  {id:188,name:"Weir - Velocity Sim Racing",gc:"Weir",value:91800,due:"Dec 1, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Preston Cheney",month:"Dec",closeOut:null,bidDate:"Dec 1, 2025"},
  {id:189,name:"Anchor - TwoTen",gc:"Anchor",value:94500,due:"Dec 2, 2025",status:"submitted",scope:["Drywall","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Will Talamaivao",month:"Dec",closeOut:null,bidDate:"Dec 2, 2025"},
  {id:191,name:"Anchor - Khango Gym",gc:"Anchor",value:147800,due:"Nov 24, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Sona Francis",month:"Nov",closeOut:null,bidDate:"Nov 24, 2025"},
  {id:192,name:"Hirsch - Hermes Houston",gc:"Hirsch",value:322100,due:"Nov 19, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"Temp store",contact:"Angelica Baez",month:"Nov",closeOut:null,bidDate:"Nov 19, 2025"},
  {id:195,name:"Spring Cypress Oral Surgeons",gc:"Wier",value:155100,due:"Jan 29, 2025",status:"awarded",scope:["Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"Tomball, TX",contact:"Preston Cheney",month:"Jan",closeOut:null,bidDate:"Jan 29, 2025"},
  {id:197,name:"Texas Eye Institute Level 6 Corridor & Elevator Lobby",gc:"WCC",value:23700,due:"Oct 30, 2025",status:"submitted",scope:["Demo","Drywall","ACT Ceilings"],phase:"Medical",risk:"",notes:"",contact:"Heidi Phillips",month:"Oct",closeOut:null,bidDate:"Oct 30, 2025"},
  {id:199,name:"Texas Eye Institute Retail STE 100",gc:"WCC",value:19800,due:"Oct 29, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"],phase:"Medical",risk:"",notes:"",contact:"Heidi Phillips",month:"Oct",closeOut:null,bidDate:"Oct 29, 2025"},
  {id:200,name:"Chase Bank Modification to Dutch Bros. - Budget",gc:"United Constructors",value:25000,due:"Oct 28, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"",contact:"Mistie Williams",month:"Oct",closeOut:null,bidDate:"Oct 28, 2025"},
  {id:205,name:"Escapology - Sugar Land",gc:"Escapology",value:116800,due:"Oct 8, 2025",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Sugar Land, TX",contact:"Mistie Williams",month:"Oct",closeOut:null,bidDate:"Oct 8, 2025"},
  {id:206,name:"ROD - C120",gc:"United Constructors",value:3900,due:"Oct 8, 2025",status:"submitted",scope:["Demo","Drywall","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"River Oaks District",contact:"Mistie Williams",month:"Oct",closeOut:null,bidDate:"Oct 8, 2025"},
];

// ── SEED: PROJECTS ──
// Real project data extracted from Google Docs proposals
export const PM_NAMES = { 3: "Emmanuel Aguilar", 4: "Isai Aguilar", 8: "Abner Aguilar" };
const _demoProjects = [
  {id:1,name:"Endurance - Woodside Laboratory",gc:"Endurance Builders",contract:74800,status:"in-progress",phase:"Commercial",address:"4200 San Jacinto St, Houston, TX 77004",suite:"",parking:"",lat:29.7224,lng:-95.3785,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-03-30",end:"2026-08-21",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"]},
  {id:2,name:"WCC - CB&I CEO/Lvl 2/Lvl 7",gc:"WC Construction",contract:59800,status:"in-progress",phase:"Commercial",address:"1725 Hughes Landing Blvd, The Woodlands, TX 77380",suite:"CEO Office / Level 2 / Level 7",parking:"",lat:30.1658,lng:-95.4613,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-03-20",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"]},
  {id:3,name:"Forney - BSLMC Cath Labs 4 & 9",gc:"Forney Construction",contract:104500,status:"on-hold",phase:"Medical",address:"6720 Bertner Ave, Houston, TX 77030",suite:"Cath Labs 4 & 9",parking:"",lat:29.7066,lng:-95.3966,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls","ACT Ceilings"]},
  {id:4,name:"Brunello Cucinelli - Store Buildout",gc:"Brodson",contract:308400,status:"in-progress",phase:"Retail",address:"4444 Westheimer Rd, Houston, TX 77027",suite:"F155",parking:"",lat:29.7376,lng:-95.4328,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"]},
  {id:16,name:"ROD - Brunello Cucinelli Expansion (Landlord Work)",gc:"United Constructors",contract:49900,status:"in-progress",phase:"Retail",address:"4444 Westheimer Rd, Houston, TX 77027",suite:"",parking:"",lat:29.7376,lng:-95.4328,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Metal Framing","Drywall"]},
  {id:5,name:"Texas Heart Center - Baytown",gc:"Bayshore",contract:54200,status:"in-progress",phase:"Medical",address:"1602 W Baker Rd, Baytown, TX 77521",suite:"",parking:"",lat:29.7633,lng:-94.9774,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Lead-Lined Walls","Doors & Hardware"]},
  {id:6,name:"MH Woodlands RAD Equipment Replacement",gc:"Forney Construction",contract:10500,status:"in-progress",phase:"Medical",address:"9250 Pinecroft Dr, The Woodlands, TX 77380",suite:"",parking:"",lat:30.1620,lng:-95.4710,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings"]},
  {id:7,name:"MH MC Single Plane IR",gc:"O'Donnell/Snider",contract:33000,status:"in-progress",phase:"Medical",address:"921 Gessner Rd, Houston, TX 77024",suite:"",parking:"",lat:29.7730,lng:-95.5560,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"]},
  {id:8,name:"MH MC Neuro IR",gc:"O'Donnell/Snider",contract:34000,status:"in-progress",phase:"Medical",address:"921 Gessner Rd, Houston, TX 77024",suite:"",parking:"",lat:29.7730,lng:-95.5560,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"]},
  {id:9,name:"MH League City CCC CT",gc:"Forney Construction",contract:14900,status:"in-progress",phase:"Medical",address:"2555 S Shore Blvd, League City, TX 77573",suite:"",parking:"",lat:29.5580,lng:-95.0690,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"]},
  {id:10,name:"MH Pearland MEIC-CT",gc:"Forney Construction",contract:10500,status:"in-progress",phase:"Medical",address:"16100 South Fwy, Pearland, TX 77584",suite:"",parking:"",lat:29.5635,lng:-95.2860,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Drywall","ACT Ceilings","Tape & Finish","Lead-Lined Walls"]},
  {id:11,name:"Our Lady of Guadalupe Restroom",gc:"Forney Construction",contract:34700,status:"in-progress",phase:"Commercial",address:"2405 Navigation Blvd, Houston, TX 77003",suite:"",parking:"",lat:29.7560,lng:-95.3500,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"]},
  {id:12,name:"Arch-Con - Sprouts Farmers Market",gc:"Arch-Con",contract:215100,status:"in-progress",phase:"Retail",address:"4775 W Panther Creek Dr, The Woodlands, TX 77381",suite:"",parking:"",lat:30.1740,lng:-95.4950,pm:"Abner Aguilar",laborHours:0,progress:0,start:"",end:"",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"]},
  {id:13,name:"MHMC Cancer Center CT",gc:"Forney Construction",contract:20900,status:"in-progress",phase:"Medical",address:"925 Gessner Rd, Houston, TX 77024",suite:"",parking:"",lat:29.7728,lng:-95.5560,pm:"Abner Aguilar",laborHours:0,progress:95,start:"",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings"]},
  {id:14,name:"Heart Care Clinic - NW Houston",gc:"United Constructors",contract:79200,status:"completed",phase:"Medical",address:"13325 Hargrave Rd, Houston, TX 77070",suite:"",parking:"",lat:29.9570,lng:-95.5730,pm:"Abner Aguilar",laborHours:0,progress:100,start:"",end:"",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"]},
  {id:15,name:"MH Pearland L4 Renovation",gc:"Harvey Cleary",contract:83700,status:"in-progress",phase:"Medical",address:"16100 South Fwy, Pearland, TX 77584",suite:"Level 4",parking:"",lat:29.5635,lng:-95.2860,pm:"Abner Aguilar",laborHours:0,progress:95,start:"",end:"",scope:["Metal Framing","Drywall"]},
];

// ── SEED: CONTACTS ──
const _demoContacts = [
  // Endurance Builders (ENDBS)
  {id:1,name:"Christina Zube Volkers",company:"Endurance Builders",role:"Senior PM",bids:1,wins:1,color:"#3b82f6",last:"Mar 19",priority:"high",phone:"713-569-3121",email:"christina.zube@endbs.com",notes:"Woodside Lab PM. Kick-off meeting 3/18."},
  {id:2,name:"Mason Williams",company:"Endurance Builders",role:"Superintendent",bids:0,wins:0,color:"#3b82f6",last:"Mar 19",priority:"high",phone:"713-899-6142",email:"mwilliams@endbs.com",notes:"Woodside Lab super. PTO 3/23-3/28. Containment on T&M."},
  {id:3,name:"Ruby Rubio",company:"Endurance Builders",role:"Project Engineer",bids:0,wins:0,color:"#3b82f6",last:"Mar 19",priority:"med",phone:"281-745-2965",email:"rrubio@endbs.com",notes:"Send COI, submittals, lead times to Ruby."},
  // WC Construction
  {id:4,name:"Heidi Phillips",company:"WC Construction",role:"Project Manager",bids:0,wins:0,color:"#10b981",last:"Mar 18",priority:"high",phone:"409-893-2069",email:"hphillips@wcconstructioncompany.com",notes:"CB&I PM. Also 6WW Lobby, PPER Missouri City, WL Level 11."},
  {id:5,name:"Joseph Quan",company:"WC Construction",role:"Project Engineer",bids:0,wins:0,color:"#10b981",last:"Mar 20",priority:"high",phone:"832-991-5653",email:"jquan@wcconstructioncompany.com",notes:"CB&I PE. Submittals due Mar 24."},
  {id:6,name:"Adam Teeter",company:"WC Construction",role:"Superintendent",bids:0,wins:0,color:"#10b981",last:"Mar 18",priority:"med",phone:"832-570-3670",email:"ateeter@wcconstructioncompany.com",notes:"CB&I superintendent."},
  // Forney Construction
  {id:7,name:"Jason McIntyre",company:"Forney Construction",role:"Project Manager",bids:0,wins:0,color:"#f59e0b",last:"Mar 2",priority:"high",phone:"713-410-9824",email:"jason.mcintyre@forneyconstruction.com",notes:"PM on League City CCC CT, Pearland MEIC-CT, Woodlands RAD."},
  {id:8,name:"Natalie Pettis",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Mar 2",priority:"med",phone:"832-274-2512",email:"natalie.pettis@forneyconstruction.com",notes:"MHTW RAD APM. Also IAH RAC."},
  {id:9,name:"Jennifer Averitt",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Mar 17",priority:"med",phone:"",email:"jennifer.averitt@forneyconstruction.com",notes:"MH MC Cancer Center CT. CO #1 sent 3/17."},
  {id:10,name:"Jose Perez",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Mar 13",priority:"med",phone:"832-605-7437",email:"jose.perez@forneyconstruction.com",notes:"Our Lady of Guadalupe PM."},
  {id:11,name:"Monica Waller",company:"Forney Construction",role:"Project Coordinator",bids:0,wins:0,color:"#f59e0b",last:"Mar 4",priority:"med",phone:"713-367-3501",email:"monica.waller@forneyconstruction.com",notes:"Subcontracts, COI coordination."},
  {id:12,name:"Mariana Fumero",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Feb 23",priority:"med",phone:"713-628-3445",email:"mariana.fumero@forneyconstruction.com",notes:"MH Pearland MEIC-CT. COI requested."},
  // O'Donnell/Snider
  {id:13,name:"Kim Bullard",company:"O'Donnell/Snider",role:"Sr. Project Coordinator",bids:0,wins:0,color:"#8b5cf6",last:"Mar 16",priority:"med",phone:"713-554-4614",email:"kbullard@odonnellsnider.com",notes:"MH MC Hospital Single Plane IR NTP. Billing via Procore, due 20th."},
  {id:14,name:"Ethan Alvarez",company:"O'Donnell/Snider",role:"Project Manager",bids:0,wins:0,color:"#8b5cf6",last:"Mar 16",priority:"med",phone:"",email:"",notes:"PM on MH MC Hospital Single Plane IR & Neuro IR."},
  // United Constructors
  {id:15,name:"Justin Gayford",company:"United Constructors",role:"Project Manager",bids:0,wins:0,color:"#ef4444",last:"Mar 11",priority:"high",phone:"",email:"justin@unitedconstructors.com",notes:"Brunello Cucinelli PM. Active schedule coordination."},
  {id:16,name:"Steve Williams",company:"United Constructors",role:"VP Interior Construction",bids:0,wins:0,color:"#ef4444",last:"Mar 12",priority:"high",phone:"",email:"swilliams@unitedconstructors.com",notes:"Heart Care Clinic. CO #2 approved 3/12."},
  {id:17,name:"Mistie Williams",company:"United Constructors",role:"Project Coordinator",bids:0,wins:0,color:"#ef4444",last:"Mar 2",priority:"med",phone:"713-579-9742",email:"mwilliams@unitedconstructors.com",notes:"Subcontracts and COs. Dotson, Escapology, Heart Care."},
  // Harvey Cleary
  {id:18,name:"Kristen Gallegos",company:"Harvey Cleary",role:"Senior PM",bids:0,wins:0,color:"#06b6d4",last:"Jan 29",priority:"med",phone:"281-253-0679",email:"kgallegos@harveycleary.com",notes:"MH Pearland L4 Renovation. AD System submittal approved 1/29."},
  // Bayshore
  {id:19,name:"Josh",company:"Bayshore",role:"",bids:0,wins:0,color:"#a855f7",last:"Mar 19",priority:"med",phone:"",email:"josh@bayshoretex.com",notes:"THC Baytown. CO for ticket work sent 3/19."},
  // Wier CC
  {id:20,name:"Preston Cheney",company:"Wier CC",role:"",bids:0,wins:0,color:"#64748b",last:"Feb 20",priority:"med",phone:"",email:"pcheney@wiercc.com",notes:"Spring Cypress Oral Surgeons. Window opening CO, overhead blocking CO."},
  // Arch-Con
  {id:21,name:"Robert Fortney",company:"Arch-Con",role:"Project Manager",bids:1,wins:0,color:"#f97316",last:"Mar 5",priority:"med",phone:"",email:"rfortney@arch-con.com",notes:"Regor Therapeutics PM."},
  {id:22,name:"Jon Windham",company:"Arch-Con",role:"Project Manager",bids:1,wins:1,color:"#f97316",last:"Mar 10",priority:"high",phone:"",email:"jwindham@arch-con.com",notes:"Sprouts Farmers Market PM. Submittals & billing active."},
  {id:23,name:"Shane Struska",company:"Arch-Con",role:"Senior PM",bids:0,wins:0,color:"#f97316",last:"Nov 13",priority:"med",phone:"832-490-4816",email:"sstruska@arch-con.com",notes:"Dr. Mazhar & Daye (Suite 440)."},
  // Structure Tone
  {id:24,name:"Alba Flores",company:"Structure Tone",role:"Project Manager",bids:1,wins:0,color:"#ec4899",last:"Mar 6",priority:"med",phone:"",email:"alba.flores@structuretone.com",notes:"8303 Fallbrook Generator Addition."},
  {id:25,name:"Blessing Awobayiku",company:"Structure Tone",role:"",bids:1,wins:0,color:"#ec4899",last:"Mar 17",priority:"med",phone:"",email:"",notes:"Southwest General Building. Via BuildingConnected."},
  // Jacob White
  {id:26,name:"Alex Vidosh",company:"Jacob White",role:"Project Manager",bids:3,wins:0,color:"#14b8a6",last:"Feb 26",priority:"med",phone:"",email:"a.vidosh@jacobwhitecc.com",notes:"CSH St Lukes Cath Lab, Holler Brewing, HM Sugarland. Via BuildingConnected."},
  // Warwick Construction
  {id:27,name:"Carlos Campbell",company:"Warwick Construction",role:"Project Manager",bids:1,wins:0,color:"#84cc16",last:"Feb 12",priority:"med",phone:"832-448-5810",email:"ccampbell@warwickconstruction.com",notes:"Octapharma Plasma - Little York."},
  {id:28,name:"Kendrick Quintanilla",company:"Warwick Construction",role:"",bids:1,wins:0,color:"#84cc16",last:"Jan 8",priority:"med",phone:"",email:"kquintanilla@warwickconstruction.com",notes:"Potbelly Sandwich Shop - Woodlands."},
  // Anchor Construction
  {id:29,name:"Will Talamaivao",company:"Anchor Construction",role:"Project Manager",bids:3,wins:0,color:"#d946ef",last:"Mar 18",priority:"med",phone:"",email:"will.t@anchorcm.net",notes:"Pard Campus, TwoTen, Meridiana Retail. Active bid invites."},
  {id:30,name:"Sona Francis",company:"Anchor Construction",role:"Estimator",bids:1,wins:0,color:"#d946ef",last:"Dec 3",priority:"med",phone:"858-245-7020",email:"sona.f@anchorcm.net",notes:"Khango Gym estimator."},
  {id:31,name:"David Garcia",company:"Anchor Construction",role:"",bids:0,wins:0,color:"#d946ef",last:"Mar 20",priority:"med",phone:"",email:"",notes:"Shake Shack, Chick-Fil-A bid invites. Via BuildingConnected."},
  // Brodson Construction
  {id:32,name:"Philippe Faucher",company:"Brodson Construction",role:"Senior PM",bids:1,wins:1,color:"#0ea5e9",last:"Mar 9",priority:"high",phone:"",email:"pfaucher@brodsonconstruction.com",notes:"Brunello Cucinelli Store Buildout - River Oaks District."},
  // Hirsch Construction
  {id:33,name:"Angelica Baez",company:"Hirsch Construction",role:"",bids:1,wins:0,color:"#fb923c",last:"Nov 19",priority:"med",phone:"",email:"abaez@hirschcorp.com",notes:"Hermes Houston Temp Store. Also Princess Polly."},
  // Garrison Construction
  {id:34,name:"Melanie Itzel",company:"Garrison Construction",role:"Senior Project Coordinator",bids:1,wins:0,color:"#a3e635",last:"Feb 16",priority:"med",phone:"",email:"melanie@garrisonconstructiongroup.com",notes:"Montgomery Roth Office Suite 7029."},
  // York Construction
  {id:35,name:"Yarelys Hernandez",company:"York Construction",role:"",bids:1,wins:0,color:"#22d3ee",last:"Jan 9",priority:"med",phone:"",email:"yhernandez@yorkconstruction.com",notes:"UTMB M87 PCP Cancer Services Clinic. Galveston."},
  // ProConstruct / ATH
  {id:36,name:"Emilio Alaniz",company:"ProConstruct",role:"",bids:1,wins:0,color:"#818cf8",last:"Jan 27",priority:"med",phone:"281-799-9731",email:"e.alaniz@att.net",notes:"UT Orthopedics Cypress Buildout. Fry reglet revision."},
  // Gullo Commercial
  {id:37,name:"Renee Hollek",company:"Gullo Commercial",role:"",bids:1,wins:0,color:"#fbbf24",last:"Jan 23",priority:"med",phone:"832-580-2260",email:"gullobids@gullocommercial.com",notes:"Stonebridge Church Renovation."},
  // Farmer Construction
  {id:38,name:"Chase Evans",company:"Farmer Construction",role:"",bids:1,wins:0,color:"#4ade80",last:"Jan 15",priority:"med",phone:"",email:"chase.evans@farmerconstructioninc.com",notes:"Farmer office expansion."},
  // JP's Construction
  {id:39,name:"Robert",company:"JP's Construction",role:"Owner",bids:1,wins:0,color:"#f472b6",last:"Jan 12",priority:"med",phone:"",email:"robert@jpsconstruction.org",notes:"Health Source Missouri City. Demising wall breakout requested."},
  // Forney (additional)
  {id:40,name:"Leigh Bartish",company:"Forney Construction",role:"Senior Estimator",bids:1,wins:0,color:"#f59e0b",last:"Mar 11",priority:"med",phone:"713-805-0000",email:"leigh.bartish@forneyconstruction.com",notes:"MH Fulshear SMR estimator."},
];

// ── SEED: CALL LOG ──
const _demoCallLog = [];

// ── SEED: INVOICES ──
const _demoInvoices = [];

// ── SEED: T&M TICKETS ──
// Time & Material tracking — separate from original project contract
const _demoTmTickets = [];

// ── SEED: CHANGE ORDERS ──
const _demoChangeOrders = [
  {id:1,projectId:13,number:"CO-001",desc:"MHMC Cancer Center — Laser cabinet modification (rework due to GE equipment move)",amount:800,status:"approved",submitted:"2026-03-17",approved:"2026-03-17"},
  {id:2,projectId:14,number:"CO-001",desc:"Heart Care Clinic — Equipment removal & delivery ($3,200) + credit for unused lead lined rock (-$7,500)",amount:-4300,status:"approved",submitted:"2026-03-11",approved:"2026-03-12"},
];

// ── SEED: RFIs ──
const _demoRfis = [];

// ── SEED: SUBMITTALS ──
const _demoSubmittals = [];

// ── SEED: SCHEDULE ──
const _demoSchedule = [];

// ── SEED: SAFETY ──
const _demoIncidents = [];

const _demoToolboxTalks = [];

const _demoDailyReports = [];

// ── SEED: TAKEOFFS ──
const _demoTakeoffs = [];

// ── OSHA CHECKLIST ──
export const OSHA_CHECKLIST = [
  {id:1,title:"Fall Protection Plan",desc:"Written plan for work above 6 feet",status:"unchecked"},
  {id:2,title:"Scaffold Inspection Log",desc:"Daily inspection by competent person",status:"unchecked"},
  {id:3,title:"Silica Exposure Control",desc:"Table 1 compliance for cutting/sanding GWB",status:"unchecked"},
  {id:4,title:"PPE Compliance",desc:"Hard hats, safety glasses, gloves, hi-vis on site",status:"unchecked"},
  {id:5,title:"Tool Inspection",desc:"Power tools inspected, guards in place",status:"unchecked"},
  {id:6,title:"Fire Extinguisher Access",desc:"Extinguisher within 50ft of hot work",status:"unchecked"},
  {id:7,title:"First Aid Kit Stocked",desc:"Kit on site, CPR/first aid trained person present",status:"unchecked"},
  {id:8,title:"Hazard Communication",desc:"SDS sheets available, labels intact",status:"unchecked"},
  {id:9,title:"Emergency Action Plan",desc:"Evacuation routes posted, assembly point known",status:"unchecked"},
  {id:10,title:"Electrical Safety",desc:"GFCI on all temp power, no damaged cords",status:"unchecked"},
];

// ── COMPANY INFO ──
export const COMPANY_DEFAULTS = {
  name:"Eagles Brothers Constructors",
  address:"7801 N Shepherd Dr, Suite 107, Houston, TX 77088",
  phone:"(346) 970-7093",
  email:"abner@ebconstructors.com",
  license:"",
  defaultTax:8.25,
  defaultWaste:5,
  defaultOverhead:10,
  defaultProfit:10,
};

// ── MILESTONES ──
export const MS = ["Award","Submittal","Buyout","Framing","Board","Tape","Punch","CO"];

// ── SEED: EMPLOYEES ──
const _demoEmployees = [
  { id: 1, name: "Oscar Alvarez", role: "Foreman", pin: "1234", phone: "713-555-1001", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 42, active: true, email: "oscar@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 2, name: "Ricardo Mendez", role: "Journeyman", pin: "2345", phone: "713-555-1002", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 35, active: true, email: "ricardo@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 3, name: "Carlos Fuentes", role: "Apprentice", pin: "3456", phone: "713-555-1003", schedule: { start: "07:00", end: "15:30" }, hourlyRate: 22, active: true, email: "carlos@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 4, name: "Miguel Torres", role: "Journeyman", pin: "4567", phone: "713-555-1004", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 35, active: true, email: "miguel@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 5, name: "David Ramirez", role: "Foreman", pin: "5678", phone: "713-555-1005", schedule: { start: "06:00", end: "14:30" }, hourlyRate: 42, active: true, email: "david@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 6, name: "Luis Herrera", role: "Apprentice", pin: "6789", phone: "713-555-1006", schedule: { start: "07:00", end: "15:30" }, hourlyRate: 22, active: true, email: "luis@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 7, name: "Rigoberto Martinez", role: "Driver", pin: "7890", phone: "713-555-1007", schedule: { start: "07:00", end: "16:00" }, hourlyRate: 25, active: true, email: "rigoberto@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 9, name: "Antonio Hernandez", role: "Foreman", pin: "1009", phone: "713-555-1009", schedule: { start: "06:00", end: "14:30" }, hourlyRate: 42, active: true, email: "antonio@ebconstructors.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 10, name: "Jose Perez", role: "Journeyman", pin: "1110", phone: "713-555-1010", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 35, active: true, email: "jose@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 11, name: "Fernando Reyes", role: "Apprentice", pin: "1111", phone: "713-555-1011", schedule: { start: "07:00", end: "15:30" }, hourlyRate: 22, active: true, email: "fernando@eaglesbros.com", password: "$2b$10$dOYF/6WdXW8/IAo9Z9Svceg52zk9nXA8aL4zOcsCAzwILkIEEeYAm", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
];

// ── SEED: COMPANY LOCATIONS (geofence) ──
const _demoCompanyLocations = [
  { id: "loc_office", name: "EBC Main Office — 7801 N Shepherd Dr Ste 107", lat: 29.8351, lng: -95.4103, radiusFt: 1000, type: "office" },
  { id: "loc_warehouse", name: "EBC Warehouse", lat: 29.7250, lng: -95.4000, radiusFt: 800, type: "warehouse" },
];

// ── Dynamic week start so seed data always shows "this week" ──
function _currentWeekStart() {
  const d = new Date(); d.setHours(0,0,0,0);
  const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}
const _ws = _currentWeekStart();

// ── SEED: MATERIAL REQUESTS ──
const _demoMaterialRequests = [];

// ── SEED: CREW SCHEDULE ──
const _demoCrewSchedule = [];

// ── SEED: TIME ENTRIES ──
function _seedTimeEntries() { return []; }
const _demoTimeEntries = _seedTimeEntries();

// ── CONDITIONAL EXPORTS ──
// Projects & employees ALWAYS load (real EBC data), other seed data is demo-only
export const initBids = _demoBids; // always load — real EBC bid list
export const initProjects = _demoProjects; // always load — real EBC project list
export const initContacts = _demoContacts; // always load — real GC contacts
export const initCallLog = _demoCallLog; // always load — real call log
export const initInvoices = _demoInvoices; // always load — real invoices
export const initTmTickets = _demo ? _demoTmTickets : [];
export const initChangeOrders = _demoChangeOrders; // always load — foreman portal needs this
export const initRfis = _demoRfis; // always load — foreman portal needs this
export const initSubmittals = _demoSubmittals; // always load — foreman portal needs this
export const initSchedule = _demoSchedule; // always load
export const initIncidents = _demo ? _demoIncidents : [];
export const initToolboxTalks = _demo ? _demoToolboxTalks : [];
export const initDailyReports = _demo ? _demoDailyReports : [];
export const initTakeoffs = _demo ? _demoTakeoffs : [];
export const initEmployees = _demoEmployees; // always load — real EBC crew
export const initCompanyLocations = _demoCompanyLocations; // always load — office/warehouse
export const initMaterialRequests = _demoMaterialRequests; // always load — foreman portal needs this
export const initCrewSchedule = _demoCrewSchedule; // always load — foreman portal needs this
export const initTimeEntries = _demoTimeEntries; // always load — foreman portal needs this
