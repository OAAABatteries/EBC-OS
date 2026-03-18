// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Data Constants & Seed Data
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { isDemoMode } from "./defaults";
const _demo = isDemoMode();

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

// ── SCOPE CHECKLIST ──
export const SCOPE_INIT = [
  {id:1,title:"Finish Level (L4 vs L5)",desc:"L5 specified at lobby, gloss paint, or critical lighting?",status:"unchecked"},
  {id:2,title:"Backing & Blocking",desc:"Who provides blocking behind casework, handrails, TVs?",status:"unchecked"},
  {id:3,title:"Deflection Track",desc:"Any walls framing to deck? Slotted/deep-leg track required?",status:"unchecked"},
  {id:4,title:"Acoustical Sealant",desc:"Any acoustical partitions spec'd? Sealant in spec section?",status:"unchecked"},
  {id:5,title:"ICRA Barriers",desc:"Project in/adjacent to occupied medical facility?",status:"unchecked"},
  {id:6,title:"Lead-Lined Scope Split",desc:"Which lead items does EBC furnish vs. I.O. only?",status:"unchecked"},
  {id:7,title:"Access Panels",desc:"Furnished by owner/GC/EBC? Clarify P&I vs I.O.",status:"unchecked"},
  {id:8,title:"Seismic ACT Bracing",desc:"Seismic Design Category C or higher? Medical occupancy?",status:"unchecked"},
  {id:9,title:"Corner Bead Count",desc:"All outside corners, window wraps, door returns counted?",status:"unchecked"},
  {id:10,title:"Control Joints",desc:"Spec require CJs? At what spacing? (typically 30' OC)",status:"unchecked"},
  {id:11,title:"Shaft Wall Systems",desc:"Elevator/stair shafts or duct chases in scope?",status:"unchecked"},
  {id:12,title:"Above-ACT Framing",desc:"Any EBC framing above the ACT plane required?",status:"unchecked"},
  {id:13,title:"Patching at Penetrations",desc:"Existing drywall needing patch at MEP penetrations?",status:"unchecked"},
  {id:14,title:"Small Rooms & Closets",desc:"All closets, toilet rooms, alcoves measured? High cost/SF.",status:"unchecked"},
  {id:15,title:"Off-Hours Requirement",desc:"Work restricted to after-hours or weekends?",status:"unchecked"},
  {id:16,title:"Phasing / Multiple Mobs",desc:"Multiple mobilizations? Price each mob separately.",status:"unchecked"},
  {id:17,title:"GWB Type Check",desc:"Abuse-resistant, soundproof, or moisture-resistant GWB?",status:"unchecked"},
  {id:18,title:"Equipment Support Framing",desc:"Above-ceiling equipment support framing in EBC scope?",status:"unchecked"},
  {id:19,title:"Addenda Review",desc:"All addenda reviewed? Scope changes after original set?",status:"unchecked"},
  {id:20,title:"Drawing Conflicts",desc:"Walls shown differently on different sheets? Submit RFI.",status:"unchecked"},
];

// ── SEED: BIDS (70+ real bids) ──
const _demoBids = [
  // ── REAL EBC BIDS (from estimating system) ──
  // 2026
  {id:101,name:"Endurance Builders - Woodside Laboratory",gc:"Endurance Builders",value:0,due:"Mar 13, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 13, 2026"},
  {id:102,name:"WCC - Real Manage Suite 250",gc:"WCC",value:0,due:"Mar 12, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 12, 2026"},
  {id:103,name:"United - Escapology San Antonio",gc:"United",value:0,due:"Mar 12, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 12, 2026"},
  {id:104,name:"United - 801 Travis - Elevator Lobby Remodel",gc:"United",value:0,due:"Mar 11, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:105,name:"Memorial Hermann - Fulshear SMR",gc:"Memorial Hermann",value:0,due:"Mar 11, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:106,name:"FKC San Angelo",gc:"FKC",value:0,due:"Mar 10, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 10, 2026"},
  {id:107,name:"United - Aggieland Imaging - College Station - Outpatient MRI Facility",gc:"United",value:0,due:"Mar 9, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 9, 2026"},
  {id:108,name:"United - Ogle School Remodel",gc:"United",value:0,due:"Mar 6, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 6, 2026"},
  {id:109,name:"Harvey - Celltex Prelim",gc:"Harvey",value:0,due:"Mar 6, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 6, 2026"},
  {id:110,name:"Arch-Con - Regor Therapeutics",gc:"Arch-Con",value:0,due:"Mar 5, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 5, 2026"},
  {id:111,name:"Structure Tone - 8303 Fallbrook Drive Generator Addition",gc:"Structure Tone",value:0,due:"Mar 4, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 4, 2026"},
  {id:112,name:"United - Sun City Retail - Building C",gc:"United",value:0,due:"Mar 2, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 2, 2026"},
  {id:113,name:"United - Sun City Retail Building B",gc:"United",value:0,due:"Mar 2, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Mar",closeOut:null,bidDate:"Mar 2, 2026"},
  {id:114,name:"WCC - Skillem Law Firm",gc:"WCC",value:0,due:"Feb 27, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 27, 2026"},
  {id:115,name:"United - Sun City Retail Building A",gc:"United",value:0,due:"Feb 27, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 27, 2026"},
  {id:116,name:"Black Stone Minerals - DD Estimate",gc:"Black Stone Minerals",value:0,due:"Feb 27, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 27, 2026"},
  {id:117,name:"Anchor - Blue Jack Ranch",gc:"Anchor",value:0,due:"Feb 27, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 27, 2026"},
  {id:118,name:"Forney - Duchesne Round 2",gc:"Forney",value:0,due:"Feb 25, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 25, 2026"},
  {id:119,name:"Memorial Hermann - TMC Cancer CT",gc:"Memorial Hermann",value:0,due:"Feb 25, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 25, 2026"},
  {id:120,name:"OSC - Canopy by Hilton",gc:"OSC",value:0,due:"Feb 24, 2026",status:"estimating",scope:[],phase:"Hospitality",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 24, 2026"},
  {id:121,name:"Structure Tone - Southwest General Building",gc:"Structure Tone",value:0,due:"Feb 23, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 23, 2026"},
  {id:122,name:"Bayshore - Texas Heart Center",gc:"Bayshore",value:0,due:"Feb 20, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 20, 2026"},
  {id:123,name:"CB&I Lvl 7",gc:"CB&I",value:0,due:"Feb 18, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 18, 2026"},
  {id:124,name:"CB&I Lvl 2",gc:"CB&I",value:0,due:"Feb 18, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 18, 2026"},
  {id:125,name:"Memorial Hermann - Woodlands RAD Equipment Replacement",gc:"Memorial Hermann",value:0,due:"Feb 17, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 17, 2026"},
  {id:126,name:"United - Edwin Watts Golf Shop",gc:"United",value:0,due:"Feb 17, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 17, 2026"},
  {id:127,name:"Forney - Roseate Beach Amenities",gc:"Forney",value:0,due:"Feb 17, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 17, 2026"},
  {id:128,name:"WCC - 3 HL 1780 Houghs Landing Suite 265",gc:"WCC",value:0,due:"Feb 16, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 16, 2026"},
  {id:129,name:"Fort Bend Hope Center",gc:"",value:0,due:"Feb 16, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 16, 2026"},
  {id:130,name:"Montgomery Roth Office Suite 7029",gc:"Montgomery Roth",value:0,due:"Feb 16, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 16, 2026"},
  {id:131,name:"Memorial Hermann - MHSE CT",gc:"Memorial Hermann",value:0,due:"Feb 13, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 13, 2026"},
  {id:132,name:"Memorial Hermann - The Woodlands MNA Infusion",gc:"Memorial Hermann",value:0,due:"Feb 12, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 12, 2026"},
  {id:133,name:"Memorial Hermann - MC MP3 Infusion Suite 785",gc:"Memorial Hermann",value:0,due:"Feb 12, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 12, 2026"},
  {id:134,name:"United - UCT New Offices",gc:"United",value:0,due:"Feb 11, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 11, 2026"},
  {id:135,name:"United - Apricot Lane",gc:"United",value:0,due:"Feb 11, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 11, 2026"},
  {id:136,name:"Forney - Grace Bible Church",gc:"Forney",value:0,due:"Feb 10, 2026",status:"estimating",scope:[],phase:"Religious",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 10, 2026"},
  {id:137,name:"9821 Katy Fwy Lobby Renovation",gc:"",value:0,due:"Feb 10, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 10, 2026"},
  {id:138,name:"Arch-Con - Sprouts Farmers Market",gc:"Arch-Con",value:0,due:"Feb 6, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 6, 2026"},
  {id:139,name:"WCC - AB Energy",gc:"WCC",value:0,due:"Feb 6, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 6, 2026"},
  {id:140,name:"Warwick - Octapharma Plasma - Little York",gc:"Warwick",value:0,due:"Feb 5, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 5, 2026"},
  {id:141,name:"WCC - Brazos County Road & Bridge",gc:"WCC",value:0,due:"Feb 3, 2026",status:"estimating",scope:[],phase:"Government",risk:"",notes:"",contact:"",month:"Feb",closeOut:null,bidDate:"Feb 3, 2026"},
  {id:142,name:"Nan & Company",gc:"",value:0,due:"Jan 30, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 30, 2026"},
  {id:143,name:"CSH ST Lukes Vintage Cath Lab 2",gc:"CSH",value:0,due:"Jan 29, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 29, 2026"},
  {id:144,name:"Forney - Hobby Center Admin Offices",gc:"Forney",value:0,due:"Jan 28, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 28, 2026"},
  {id:145,name:"Forney - Duchesne Academy Classrooms",gc:"Forney",value:0,due:"Jan 28, 2026",status:"estimating",scope:[],phase:"Education",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 28, 2026"},
  {id:146,name:"Forney - Mobile Energy Solutions",gc:"Forney",value:0,due:"Jan 28, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 28, 2026"},
  {id:147,name:"United - Edward Jones",gc:"United",value:0,due:"Jan 26, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 26, 2026"},
  {id:148,name:"ATH Orthopedics Cypress Buildout",gc:"ATH",value:0,due:"Jan 22, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 22, 2026"},
  {id:149,name:"United - Powder Keg",gc:"United",value:0,due:"Jan 23, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 23, 2026"},
  {id:150,name:"United - Orion Medical PET/CT Project",gc:"United",value:0,due:"Jan 22, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 22, 2026"},
  {id:151,name:"Gullo Commercial - Stonebridge Church Renovation to the Gap Room",gc:"Gullo Commercial",value:0,due:"Jan 22, 2026",status:"estimating",scope:[],phase:"Religious",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 22, 2026"},
  {id:152,name:"WCC - TAMU SSC - Gardens Refresh",gc:"WCC",value:0,due:"Jan 21, 2026",status:"estimating",scope:[],phase:"Education",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 21, 2026"},
  {id:153,name:"Davenport Cube Exec Offices",gc:"Davenport",value:0,due:"Jan 16, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 16, 2026"},
  {id:154,name:"ROD - Space F150",gc:"ROD",value:0,due:"Jan 15, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 15, 2026"},
  {id:155,name:"RMA Test Fit",gc:"RMA",value:0,due:"Jan 15, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 15, 2026"},
  {id:156,name:"Wier - Mac Hiak CDJR",gc:"Wier",value:0,due:"Jan 14, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 14, 2026"},
  {id:157,name:"United - Texas Heart & Vascular Specialist",gc:"United",value:0,due:"Jan 14, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 14, 2026"},
  {id:158,name:"Farmers - Existing Office Expansion",gc:"Farmers",value:0,due:"Jan 13, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 13, 2026"},
  {id:159,name:"Forney - Micillaneous Office Buildout",gc:"Forney",value:0,due:"Jan 13, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 13, 2026"},
  {id:160,name:"ROD - Brunello Cucinelli",gc:"ROD",value:0,due:"Jan 12, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 12, 2026"},
  {id:161,name:"Bayshore - Success on the Spectrum - Conroe",gc:"Bayshore",value:0,due:"Jan 12, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 12, 2026"},
  {id:162,name:"Anchor - Smile Studios - Richmond",gc:"Anchor",value:0,due:"Jan 12, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 12, 2026"},
  {id:163,name:"Forney - BSLMC Cath Labs 4 & 9",gc:"Forney",value:0,due:"Jan 12, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 12, 2026"},
  {id:164,name:"UTMB M87 PCP Cancer Services Clinic",gc:"UTMB",value:0,due:"Jan 8, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 8, 2026"},
  {id:165,name:"Potbellys Sandwich Shop - Woodlands",gc:"",value:0,due:"Jan 7, 2026",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 7, 2026"},
  {id:166,name:"Rise Group Investment - Flex Warehouse Buildout",gc:"Rise Group Investment",value:0,due:"Jan 6, 2026",status:"estimating",scope:[],phase:"Industrial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 6, 2026"},
  {id:167,name:"Rise Group Investment - Baseball Warehouse",gc:"Rise Group Investment",value:0,due:"Jan 6, 2026",status:"estimating",scope:[],phase:"Industrial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 6, 2026"},
  {id:168,name:"United - Heart Care Clinic - NW Houston",gc:"United",value:0,due:"Jan 5, 2026",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 5, 2026"},
  // 2025
  {id:169,name:"JP's Construction - Health Source",gc:"JP's Construction",value:0,due:"Dec 22, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 22, 2025"},
  {id:170,name:"Jacob White - Holler Brewing Expansion",gc:"Jacob White",value:0,due:"Dec 22, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 22, 2025"},
  {id:171,name:"Escapology - New Drawings",gc:"Escapology",value:0,due:"Dec 18, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 18, 2025"},
  {id:172,name:"Diffco - Wall Protection",gc:"Diffco",value:0,due:"Dec 18, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 18, 2025"},
  {id:173,name:"Forney - Dell Webb Pickleball",gc:"Forney",value:0,due:"Dec 18, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 18, 2025"},
  {id:174,name:"United - Brunello Cucinelli Expansion",gc:"United",value:0,due:"Dec 16, 2025",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 16, 2025"},
  {id:175,name:"Memorial Hermann - Neuro IR",gc:"Memorial Hermann",value:0,due:"Dec 12, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 12, 2025"},
  {id:176,name:"Hope Clinic",gc:"",value:0,due:"Dec 12, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 12, 2025"},
  {id:177,name:"Memorial Hermann - Memorial City Single Plane IR",gc:"Memorial Hermann",value:0,due:"Dec 11, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 11, 2025"},
  {id:178,name:"Memorial Hermann - League City CCC - CT Equipment Exchange",gc:"Memorial Hermann",value:0,due:"Dec 10, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 10, 2025"},
  {id:179,name:"Memorial Hermann - Pearland MEIC CT",gc:"Memorial Hermann",value:0,due:"Dec 10, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 10, 2025"},
  {id:180,name:"Vibra Studios",gc:"",value:0,due:"Dec 9, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 9, 2025"},
  {id:181,name:"Hope Biosciences",gc:"",value:0,due:"Dec 9, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 9, 2025"},
  {id:182,name:"Pard Campus",gc:"",value:0,due:"Dec 8, 2025",status:"estimating",scope:[],phase:"Education",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 8, 2025"},
  {id:183,name:"MH - Southwest IR Exchange",gc:"Memorial Hermann",value:0,due:"Dec 4, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 4, 2025"},
  {id:184,name:"UT Health - MSB Open Wet Lab Renovation",gc:"UT Health",value:0,due:"Dec 3, 2025",status:"estimating",scope:[],phase:"Education",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 3, 2025"},
  {id:185,name:"Anchor - Meridiana Retail Center",gc:"Anchor",value:0,due:"Dec 3, 2025",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 3, 2025"},
  {id:186,name:"Anchor - Marina Bay Harbor Expansion",gc:"Anchor",value:0,due:"Dec 3, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 3, 2025"},
  {id:187,name:"Forney - MHMC Cancer Center",gc:"Forney",value:0,due:"Dec 2, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 2, 2025"},
  {id:188,name:"Weir - Velocity Sim Racing",gc:"Weir",value:0,due:"Dec 1, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 1, 2025"},
  {id:189,name:"Anchor - TwoTen",gc:"Anchor",value:0,due:"Nov 25, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Nov",closeOut:null,bidDate:"Nov 25, 2025"},
  {id:190,name:"Anchor - Refuel 369",gc:"Anchor",value:0,due:"Nov 25, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Nov",closeOut:null,bidDate:"Nov 25, 2025"},
  {id:191,name:"Anchor - Khango Gym",gc:"Anchor",value:0,due:"Nov 24, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Nov",closeOut:null,bidDate:"Nov 24, 2025"},
  {id:192,name:"Hirsch - Hermes Houston",gc:"Hirsch",value:0,due:"Nov 19, 2025",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Nov",closeOut:null,bidDate:"Nov 19, 2025"},
  {id:193,name:"ROD Space A125 Pricing Request",gc:"ROD",value:0,due:"Dec 19, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 19, 2025"},
  {id:194,name:"WCC - Mariner Montessori",gc:"WCC",value:0,due:"Dec 5, 2025",status:"estimating",scope:[],phase:"Education",risk:"",notes:"",contact:"",month:"Dec",closeOut:null,bidDate:"Dec 5, 2025"},
  {id:195,name:"Spring Cypress Oral Surgeons",gc:"",value:0,due:"Oct 31, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 31, 2025"},
  {id:196,name:"Dr. Mazhar & Dr. Daye (Suite 440) - Preliminary Pricing",gc:"",value:0,due:"Oct 30, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 30, 2025"},
  {id:197,name:"Texas Eye Institute Level 6 Corridor & Elevator Lobby",gc:"Texas Eye Institute",value:0,due:"Oct 30, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 30, 2025"},
  {id:198,name:"RKC Groves North Retail Bldgs",gc:"RKC",value:0,due:"Oct 29, 2025",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 29, 2025"},
  {id:199,name:"Texas Eye Institute Retail STE 100",gc:"Texas Eye Institute",value:0,due:"Oct 29, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 29, 2025"},
  {id:200,name:"Chase Bank Modification to Dutch Bros. - Budget",gc:"",value:0,due:"Oct 28, 2025",status:"estimating",scope:[],phase:"Retail",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 28, 2025"},
  {id:201,name:"Texas Eye Institute Suite 600",gc:"Texas Eye Institute",value:0,due:"Oct 24, 2025",status:"estimating",scope:[],phase:"Medical",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 24, 2025"},
  {id:202,name:"Big Tex Law Office",gc:"",value:0,due:"Oct 24, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 24, 2025"},
  {id:203,name:"Synova Rec Center Phase 1",gc:"Synova",value:0,due:"Oct 23, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 23, 2025"},
  {id:204,name:"Hacienda La Marqueza (Houston)",gc:"",value:0,due:"Oct 22, 2025",status:"estimating",scope:[],phase:"Hospitality",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 22, 2025"},
  {id:205,name:"Escapology",gc:"Escapology",value:0,due:"Oct 7, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 7, 2025"},
  {id:206,name:"C120",gc:"",value:0,due:"Jan 20, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 20, 2026"},
  {id:207,name:"Power House",gc:"",value:0,due:"Jan 20, 2026",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Jan",closeOut:null,bidDate:"Jan 20, 2026"},
  {id:208,name:"New Project 566",gc:"",value:0,due:"Oct 31, 2025",status:"estimating",scope:[],phase:"Commercial",risk:"",notes:"",contact:"",month:"Oct",closeOut:null,bidDate:"Oct 31, 2025"},
];

// ── SEED: PROJECTS ──
// Real project data extracted from Google Docs proposals
export const PM_NAMES = { 3: "Emmanuel Aguilar", 4: "Isai Aguilar", 8: "Abner Aguilar" };
const _demoProjects = [
  // Active EBC projects (awarded bids)
  {id:1,name:"ROD - Brunello Cucinelli",gc:"ROD",value:92500,status:"in-progress",phase:"Retail",address:"2800 Kirby Dr, Houston TX 77098",pm:"Emmanuel Aguilar",laborHours:1200,progress:35,startDate:"2026-01-15",endDate:"2026-07-30",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish"]},
  {id:2,name:"United - Escapology San Antonio",gc:"United",value:187800,status:"in-progress",phase:"Commercial",address:"15900 La Cantera Pkwy, San Antonio TX 78256",pm:"Isai Aguilar",laborHours:800,progress:20,startDate:"2026-02-10",endDate:"2026-06-15",scope:["Demo","Metal Framing","Drywall","ACT Ceilings"]},
  {id:3,name:"Forney - BSLMC Cath Labs 4 & 9",gc:"Forney",value:145000,status:"in-progress",phase:"Medical",address:"17500 Red Oak Dr, Houston TX 77090",pm:"Emmanuel Aguilar",laborHours:960,progress:55,startDate:"2025-12-01",endDate:"2026-04-30",scope:["Metal Framing","Drywall","Lead-Lined Walls","Tape & Finish"]},
  {id:4,name:"Memorial Hermann - League City CCC CT",gc:"Memorial Hermann",value:68000,status:"in-progress",phase:"Medical",address:"100 Medical Center Blvd, League City TX 77573",pm:"Abner Aguilar",laborHours:480,progress:10,startDate:"2026-03-01",endDate:"2026-05-30",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"]},
  {id:5,name:"United - Heart Care Clinic NW Houston",gc:"United",value:112000,status:"in-progress",phase:"Medical",address:"17270 Red Oak Dr, Houston TX 77090",pm:"Isai Aguilar",laborHours:720,progress:45,startDate:"2026-01-06",endDate:"2026-05-15",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish"]},
];

// ── SEED: CONTACTS ──
const _demoContacts = [
  {id:1,name:"Chris Morales",company:"Tellepsen Builders",role:"Senior PM",bids:14,wins:7,color:"#3b82f6",last:"2 days ago",priority:"high",phone:"713-555-0101",email:"chris.morales@tellepsen.com",notes:"First call list. Prefers text for quick questions. Strong relationship."},
  {id:2,name:"Daniel Park",company:"JE Dunn Construction",role:"Estimator",bids:9,wins:5,color:"#10b981",last:"1 week ago",priority:"high",phone:"713-555-0102",email:"d.park@jedunn.com",notes:"Strong relationship. Invited EBC to NICU bid directly."},
  {id:3,name:"Sarah Nichols",company:"Turner Construction",role:"Pre-Con Mgr",bids:6,wins:2,color:"#8b5cf6",last:"3 days ago",priority:"med",phone:"713-555-0103",email:"s.nichols@tcco.com",notes:"Building relationship. Texas Heart bid is key opportunity."},
  {id:4,name:"Mike Trevino",company:"Linbeck Group",role:"Sr. Estimator",bids:11,wins:4,color:"#f59e0b",last:"Today",priority:"high",phone:"713-555-0104",email:"m.trevino@linbeck.com",notes:"Good communicator. Always levels fairly. Call before bid day."},
  {id:5,name:"Kevin Flores",company:"Harvey Builders",role:"PM",bids:4,wins:2,color:"#ef4444",last:"5 days ago",priority:"med",phone:"713-555-0105",email:"k.flores@harvey.com",notes:"New contact. Post Oak Tower is first major bid opportunity."},
  {id:6,name:"Amy Chen",company:"Skanska USA",role:"Preconstruction",bids:3,wins:1,color:"#06b6d4",last:"2 weeks ago",priority:"low",phone:"713-555-0106",email:"a.chen@skanska.com",notes:"Follow up after HEB result comes in."},
];

// ── SEED: CALL LOG ──
const _demoCallLog = [
  {id:1,contact:"United PM",company:"United",time:"Mar 12 10:30 AM",note:"Discussed Escapology San Antonio scope — confirmed demo + drywall + ACT. $187,800 total.",next:"Submit final proposal by Mar 15"},
  {id:2,contact:"WCC PM",company:"WCC",time:"Mar 11 2:15 PM",note:"CB&I Lvl 2 & Lvl 7 — confirmed 3 areas. CEO office soundproofing alternate requested.",next:"Submit alternates pricing"},
  {id:3,contact:"Forney PM",company:"Forney",time:"Mar 11 4:00 PM",note:"Fulshear SMR — build back + ACT only, no demo. Armstrong BP355E Optima on 9/16 grid.",next:"Confirm material lead times"},
];

// ── SEED: INVOICES ──
const _demoInvoices = [
  {id:1,projectId:1,number:"EBC-2026-001",date:"2026-02-28",amount:92500,status:"pending",desc:"Progress billing #1 — Mobilization + material delivery (Brunello Cucinelli)",paidDate:null},
  {id:2,projectId:4,number:"EBC-2026-002",date:"2026-03-10",amount:94000,status:"pending",desc:"Progress billing #1 — Mobilization (Bayshore FKC San Angelo)",paidDate:null},
  {id:3,projectId:5,number:"EBC-2026-003",date:"2026-02-15",amount:22200,status:"paid",desc:"Progress billing #1 — Heart Care Clinic NW Houston",paidDate:"2026-03-01"},
  {id:4,projectId:8,number:"EBC-2026-004",date:"2026-03-10",amount:78600,status:"pending",desc:"Progress billing #1 — MH Katy OBGYN Level 4",paidDate:null},
  {id:5,projectId:9,number:"EBC-2026-005",date:"2026-03-10",amount:90100,status:"pending",desc:"Progress billing #1 — Ogle School Remodel",paidDate:null},
];

// ── SEED: T&M TICKETS ──
// Time & Material tracking — separate from original project contract
const _demoTmTickets = [
  {
    id: 1, projectId: 6, ticketNumber: "TM-001", date: "2026-03-11", status: "submitted",
    description: "MHMC Cancer Center — Drywall patching and shelf installation per owner request",
    laborEntries: [
      { id: 1, employeeName: "Jesus M.", hours: 4, rate: 65, description: "Drywall patching" },
      { id: 2, employeeName: "Pedro R.", hours: 4, rate: 55, description: "Framing support" },
    ],
    materialEntries: [
      { id: 1, item: '5/8" Type X Drywall', qty: 4, unit: "sheets", unitCost: 18, markup: 15 },
      { id: 2, item: "Joint compound & tape", qty: 1, unit: "bucket", unitCost: 25, markup: 15 },
    ],
    submittedDate: "2026-03-11", approvedDate: null, billedDate: null,
    notes: "Owner-directed extra work, not in original scope",
  },
  {
    id: 2, projectId: 8, ticketNumber: "TM-001", date: "2026-03-08", status: "approved",
    description: "MH Pearland Level 4 — Additional blocking for owner-furnished TV mounts",
    laborEntries: [
      { id: 1, employeeName: "Carlos V.", hours: 3, rate: 65, description: "Install blocking" },
    ],
    materialEntries: [
      { id: 1, item: "2x6 Blocking lumber", qty: 8, unit: "pcs", unitCost: 8, markup: 15 },
      { id: 2, item: '16ga 3-5/8" studs', qty: 4, unit: "pcs", unitCost: 12, markup: 15 },
    ],
    submittedDate: "2026-03-09", approvedDate: "2026-03-12", billedDate: null,
    notes: "Approved by Forney PM via email 3/12",
  },
  {
    id: 3, projectId: 11, ticketNumber: "TM-001", date: "2026-03-05", status: "billed",
    description: "HM Magnolia ECC — Demo and infill at relocated sleep room door",
    laborEntries: [
      { id: 1, employeeName: "Jesus M.", hours: 6, rate: 65, description: "Door demo and infill framing" },
      { id: 2, employeeName: "Miguel A.", hours: 6, rate: 55, description: "Drywall hang and finish" },
    ],
    materialEntries: [
      { id: 1, item: '5/8" Type X Drywall', qty: 6, unit: "sheets", unitCost: 18, markup: 15 },
      { id: 2, item: '3-5/8" 25ga studs', qty: 6, unit: "pcs", unitCost: 10, markup: 15 },
      { id: 3, item: "Joint compound & tape", qty: 1, unit: "bucket", unitCost: 25, markup: 15 },
    ],
    submittedDate: "2026-03-06", approvedDate: "2026-03-08", billedDate: "2026-03-10",
    notes: "Billed on Invoice #INV-012",
  },
];

// ── SEED: CHANGE ORDERS ──
// Real change orders from Google Docs
const _demoChangeOrders = [
  {id:1,projectId:6,number:"CO-001",desc:"MHMC Cancer Center — Drywall patching, painting, shelf installation (T&M)",amount:800,status:"pending",submitted:"2026-03-11",approved:null},
  {id:2,projectId:11,number:"CO-001",desc:"HM Magnolia ECC MRI Buildout — Sleep room door demo, infill, relocate & tape/float",amount:2600,status:"pending",submitted:"2026-03-10",approved:null},
  {id:3,projectId:8,number:"CO-009",desc:"MH Pearland Level 4 Renovation — Install 10 AD Systems sliding doors (after hours)",amount:8400,status:"pending",submitted:"2026-01-29",approved:null},
  {id:4,projectId:5,number:"CO-001",desc:"United Heart Care Clinic NW Houston — Additional scope per revised drawings",amount:4200,status:"pending",submitted:"2026-03-11",approved:null},
];

// ── SEED: RFIs ──
const _demoRfis = [
  {id:1,projectId:4,number:"RFI-001",subject:"MH League City CCC CT — Equipment exchange scope clarification",submitted:"2026-03-12",status:"open",assigned:"Forney PM",response:"",responseDate:null},
  {id:2,projectId:1,number:"RFI-001",subject:"Brunello Cucinelli — ACT grid layout at display area",submitted:"2026-02-25",status:"open",assigned:"WCC PM",response:"",responseDate:null},
  {id:3,projectId:9,number:"RFI-001",subject:"Ogle School — Metal framing gauge at corridor partitions",submitted:"2026-03-08",status:"answered",assigned:"United PM",response:"20ga per structural, 14ga at impact zones",responseDate:"2026-03-11"},
  {id:4,projectId:7,number:"RFI-001",subject:"Aggieland MRI — Lead-lined rock layers at scan room",submitted:"2026-03-11",status:"open",assigned:"United PM",response:"",responseDate:null},
];

// ── SEED: SUBMITTALS ──
const _demoSubmittals = [
  {id:1,projectId:1,number:"SUB-001",desc:"Metal stud shop drawings — Level 2",specSection:"09 22 16",status:"approved",submitted:"2026-02-05",due:"2026-02-19",
    pdfKey:null,pdfName:null,pdfSize:null,linkedMaterialIds:["m1","m2"],linkedAssemblyCodes:["A2","B1","DW1"]},
  {id:2,projectId:1,number:"SUB-002",desc:"GWB product data — Type X Firecode",specSection:"09 29 00",status:"submitted",submitted:"2026-03-01",due:"2026-03-15",
    pdfKey:null,pdfName:null,pdfSize:null,linkedMaterialIds:["m7","m8"],linkedAssemblyCodes:["A2","B1"]},
  {id:3,projectId:1,number:"SUB-003",desc:"ACT product data — Armstrong Cortega",specSection:"09 51 00",status:"preparing",submitted:null,due:"2026-03-20",
    pdfKey:null,pdfName:null,pdfSize:null,linkedMaterialIds:["m15"],linkedAssemblyCodes:["ACT1"]},
  {id:4,projectId:3,number:"SUB-001",desc:"Metal framing shop drawings",specSection:"09 22 16",status:"approved",submitted:"2025-12-01",due:"2025-12-15",
    pdfKey:null,pdfName:null,pdfSize:null,linkedMaterialIds:["m1","m2"],linkedAssemblyCodes:["A2"]},
];

// ── SEED: SCHEDULE ──
const _demoSchedule = [
  {id:1,projectId:1,task:"Mobilization & Material Delivery",start:"2026-01-15",end:"2026-01-22",crew:"Oscar + 2",status:"complete",milestone:false},
  {id:2,projectId:1,task:"Metal Framing — Level 2",start:"2026-01-23",end:"2026-03-15",crew:"Crew A (6)",status:"in-progress",milestone:false},
  {id:3,projectId:1,task:"Metal Framing — Level 3",start:"2026-03-01",end:"2026-04-15",crew:"Crew B (4)",status:"in-progress",milestone:false},
  {id:4,projectId:1,task:"Board Hang — Level 2",start:"2026-03-16",end:"2026-04-30",crew:"Crew A (6)",status:"not-started",milestone:false},
  {id:5,projectId:1,task:"Tape & Finish — Level 2",start:"2026-05-01",end:"2026-05-30",crew:"Finishers (4)",status:"not-started",milestone:false},
  {id:6,projectId:1,task:"ACT Ceiling Install",start:"2026-06-01",end:"2026-06-20",crew:"Ceiling Crew (3)",status:"not-started",milestone:false},
  {id:7,projectId:1,task:"Punch & Closeout",start:"2026-06-21",end:"2026-07-30",crew:"Oscar + 2",status:"not-started",milestone:false},
  {id:8,projectId:1,task:"Framing Complete Milestone",start:"2026-04-15",end:"2026-04-15",crew:"",status:"not-started",milestone:true},
  {id:9,projectId:3,task:"Board Hang — All Areas",start:"2026-02-01",end:"2026-03-20",crew:"Crew C (5)",status:"in-progress",milestone:false},
  {id:10,projectId:3,task:"Tape & Finish",start:"2026-03-21",end:"2026-04-30",crew:"Finishers (3)",status:"not-started",milestone:false},
];

// ── SEED: SAFETY ──
const _demoIncidents = [
  {id:1,projectId:1,date:"2026-03-05",type:"near-miss",desc:"Scaffold wheel unlocked during repositioning on Level 2",corrective:"All scaffold wheels inspected. Refresher training conducted same day.",reportedBy:"Oscar A."},
  {id:2,projectId:3,date:"2026-02-18",type:"first-aid",desc:"Minor cut on hand from sheet metal edge — no stitches required",corrective:"Crew reminded of cut-resistant glove requirement. Gloves restocked.",reportedBy:"Foreman R."},
];

const _demoToolboxTalks = [
  {id:1,projectId:1,date:"2026-03-13",topic:"Silica Dust Exposure — GWB Sanding",attendees:8,conductor:"Oscar A.",notes:"Reviewed N95 requirements, wet sanding technique"},
  {id:2,projectId:1,date:"2026-03-06",topic:"Scaffold Safety & Fall Protection",attendees:6,conductor:"Oscar A.",notes:"Inspection checklist reviewed, competent person designated"},
  {id:3,projectId:3,date:"2026-03-11",topic:"Electrical Safety — Lockout/Tagout",attendees:5,conductor:"Foreman R.",notes:"All crew signed off on awareness form"},
];

const _demoDailyReports = [
  {id:1,projectId:1,date:"2026-03-13",crewSize:6,hours:48,work:"Framing complete rooms 201-204. Board started 201.",issues:"Material delivery delayed — GWB arriving tomorrow.",weather:"Clear 72°F",safety:"No incidents."},
  {id:2,projectId:1,date:"2026-03-12",crewSize:6,hours:48,work:"Framing rooms 205-208. Track layout at corridor C.",issues:"None.",weather:"Overcast 68°F",safety:"Toolbox talk — scaffold safety."},
];

// ── SEED: TAKEOFFS ──
const _demoTakeoffs = [
  {id:"tk_1",bidId:1,name:"Memorial Hermann Pearland",created:"2026-03-10",
    wastePct:5,taxRate:8.25,overheadPct:10,profitPct:10,
    rooms:[
      {id:"rm_1",name:"ICU Room 201",floor:"Level 2",items:[
        {id:"li_1",code:"A2",desc:'3-5/8" 20ga Wall',qty:145,unit:"LF",height:10,diff:1.00},
        {id:"li_2",code:"LL1",desc:"Lead-Lined GWB",qty:320,unit:"SF",height:10,diff:1.35},
        {id:"li_3",code:"ACT1",desc:"2x2 ACT Grid+Tile",qty:480,unit:"SF",height:10,diff:1.00},
      ]},
      {id:"rm_2",name:"ICU Room 202",floor:"Level 2",items:[
        {id:"li_4",code:"A2",desc:'3-5/8" 20ga Wall',qty:128,unit:"LF",height:10,diff:1.00},
        {id:"li_5",code:"INS1",desc:'R-11 Batt Insulation',qty:256,unit:"SF",height:10,diff:1.00},
      ]},
      {id:"rm_3",name:"Corridor C",floor:"Level 2",items:[
        {id:"li_6",code:"B1",desc:'6" 20ga Wall',qty:310,unit:"LF",height:14,diff:1.00},
        {id:"li_7",code:"ICRA1",desc:"ICRA Dust Barrier",qty:185,unit:"LF",height:10,diff:1.35},
      ]},
    ]
  },
];

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
  address:"Houston, TX",
  phone:"713-555-0000",
  email:"abner@ebconstructors.com",
  license:"TX GC License #12345",
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
  { id: "loc_office", name: "EBC Main Office", lat: 29.7604, lng: -95.3698, radiusFt: 1000, type: "office" },
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
const _demoMaterialRequests = [
  {id:"mr-1",projectId:1,projectName:"ROD - Brunello Cucinelli",material:'5/8" Type X Firecode (4x12)',qty:120,unit:"sheets",status:"ordered",requestedBy:"Antonio Hernandez",employeeName:"Antonio Hernandez",requestedAt:new Date(_ws+"T07:15:00").toISOString(),notes:"Level 2 board hang starting next week",deliveredAt:null,priority:"normal"},
  {id:"mr-2",projectId:1,projectName:"ROD - Brunello Cucinelli",material:"3-5/8\" 25ga Metal Studs (10')",qty:400,unit:"sticks",status:"delivered",requestedBy:"Antonio Hernandez",employeeName:"Antonio Hernandez",requestedAt:new Date(_ws+"T06:45:00").toISOString(),notes:"Corridor framing",deliveredAt:new Date(_ws+"T14:00:00").toISOString(),priority:"high"},
  {id:"mr-3",projectId:3,projectName:"Forney - BSLMC Cath Labs 4 & 9",material:"Lead-Lined Drywall (1/16\" Pb)",qty:24,unit:"sheets",status:"pending",requestedBy:"Antonio Hernandez",employeeName:"Antonio Hernandez",requestedAt:new Date(_ws+"T08:30:00").toISOString(),notes:"Cath Lab 4 scan room walls",deliveredAt:null,priority:"high"},
  {id:"mr-4",projectId:1,projectName:"ROD - Brunello Cucinelli",material:"USG Sheetrock All Purpose Joint Compound (5 gal)",qty:15,unit:"buckets",status:"pending",requestedBy:"Ricardo Mendez",employeeName:"Ricardo Mendez",requestedAt:new Date(_ws+"T09:00:00").toISOString(),notes:"",deliveredAt:null,priority:"normal"},
];

// ── SEED: CREW SCHEDULE ──
const _demoCrewSchedule = [
  // Project 1: Brunello Cucinelli — Antonio's crew
  { id:1, employeeId:9,  projectId:1, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:00",end:"14:30"} },
  { id:2, employeeId:2,  projectId:1, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:3, employeeId:3,  projectId:1, weekStart:_ws, days:{mon:true,tue:true,wed:false,thu:false,fri:false}, hours:{start:"07:00",end:"15:30"} },
  { id:4, employeeId:6,  projectId:1, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:5, employeeId:10, projectId:1, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:6, employeeId:11, projectId:1, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"07:00",end:"15:30"} },
  // Project 3: BSLMC Cath Labs — Antonio also oversees
  { id:7, employeeId:9,  projectId:3, weekStart:_ws, days:{mon:false,tue:false,wed:true,thu:true,fri:true}, hours:{start:"06:00",end:"14:30"} },
  { id:8, employeeId:4,  projectId:3, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  // Project 2: Escapology — Oscar's crew
  { id:9,  employeeId:1, projectId:2, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:10, employeeId:5, projectId:2, weekStart:_ws, days:{mon:true,tue:true,wed:true,thu:true,fri:false}, hours:{start:"07:00",end:"15:30"} },
];

// ── SEED: TIME ENTRIES ──
// Generate time entries for Mon-Fri of current week (up to today)
function _seedTimeEntries() {
  const _empNames = {1:"Oscar Alvarez",2:"Ricardo Mendez",3:"Carlos Fuentes",4:"Miguel Torres",5:"David Ramirez",6:"Luis Herrera",9:"Antonio Hernandez",10:"Jose Perez",11:"Fernando Reyes"};
  const _projNames = {1:"ROD - Brunello Cucinelli",2:"United - Escapology San Antonio",3:"Forney - BSLMC Cath Labs 4 & 9"};
  const entries = [];
  const ws = new Date(_ws);
  const today = new Date(); today.setHours(23,59,59,999);
  const crew = [
    {eid:9,pid:1,h:8.5},{eid:2,pid:1,h:8.5},{eid:6,pid:1,h:8.5},{eid:10,pid:1,h:8.5},{eid:11,pid:1,h:8.5},
    {eid:3,pid:1,h:8.5},{eid:4,pid:3,h:8.5},{eid:1,pid:2,h:8.5},{eid:5,pid:2,h:8.5},
  ];
  let id = 1;
  for (let d = 0; d < 5; d++) {
    const day = new Date(ws); day.setDate(ws.getDate() + d);
    if (day > today) break;
    for (const c of crew) {
      const cin = new Date(day); cin.setHours(6, 30, 0, 0);
      const cout = new Date(day); cout.setHours(15, 0, 0, 0);
      entries.push({id:`te-${id++}`,employeeId:c.eid,employeeName:_empNames[c.eid],projectId:c.pid,projectName:_projNames[c.pid],clockIn:cin.toISOString(),clockOut:cout.toISOString(),totalHours:c.h,geofenceStatus:"inside",clockInLat:29.76,clockInLng:-95.37,clockOutLat:29.76,clockOutLng:-95.37});
    }
  }
  return entries;
}
const _demoTimeEntries = _seedTimeEntries();

// ── CONDITIONAL EXPORTS ──
// Projects & employees ALWAYS load (real EBC data), other seed data is demo-only
export const initBids = _demoBids; // always load — real EBC bid list
export const initProjects = _demoProjects; // always load — real EBC project list
export const initContacts = _demo ? _demoContacts : [];
export const initCallLog = _demo ? _demoCallLog : [];
export const initInvoices = _demo ? _demoInvoices : [];
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
