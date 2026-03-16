// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Data Constants & Seed Data
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

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
export const ASSEMBLIES = [
  {code:"A2",name:'3-5/8" 20ga Freestanding Wall',unit:"LF",p8:52.93,p10:65.43,p14:97.62,p20:152.55,matRate:24.50,labRate:40.93,verified:true},
  {code:"B1",name:'6" 20ga Freestanding Wall',unit:"LF",p8:44.71,p10:55.34,p14:82.01,p20:127.03,matRate:22.10,labRate:33.24,verified:true},
  {code:"DW1",name:'6" Deck Wall 20ga',unit:"LF",p8:44.71,p10:55.34,p14:82.01,p20:127.03,matRate:22.10,labRate:33.24,verified:false},
  {code:"C2",name:"C2 Furring (One Side)",unit:"LF",p8:26,p10:32,p14:48,p20:76,matRate:12.80,labRate:19.20,verified:false},
  {code:"FD1",name:"Furr-Down / Soffit",unit:"LF",special:"33% progress rate",matRate:18.00,labRate:36.00,verified:true},
  {code:"GC1",name:"GWB Suspended Ceiling",unit:"SF",special:"25% progress rate",matRate:2.85,labRate:5.15,verified:true},
  {code:"ACT1",name:"2x2 ACT Grid + Tile (Std)",unit:"SF",p8:null,p10:8.50,p14:null,p20:null,matRate:4.25,labRate:4.25,verified:true},
  {code:"ACT2",name:"2x4 ACT Grid + Tile (Std)",unit:"SF",p8:null,p10:7.80,p14:null,p20:null,matRate:3.90,labRate:3.90,verified:true},
  {code:"INS1",name:"R-11 Batt Insulation (3-5/8\")",unit:"SF",p8:null,p10:1.45,p14:null,p20:null,matRate:0.65,labRate:0.80,verified:true},
  {code:"INS2",name:"R-19 Batt Insulation (6\")",unit:"SF",p8:null,p10:1.85,p14:null,p20:null,matRate:0.95,labRate:0.90,verified:true},
  {code:"FP1",name:"Spray Fireproofing (Beam/Col)",unit:"SF",p8:null,p10:4.50,p14:null,p20:null,matRate:2.10,labRate:2.40,verified:false},
  {code:"FRP1",name:"FRP Wall Panel (Glue-Up)",unit:"SF",p8:null,p10:6.20,p14:null,p20:null,matRate:3.50,labRate:2.70,verified:false},
  {code:"LL1",name:"Lead-Lined GWB (1/32\" Pb)",unit:"SF",p8:null,p10:18.50,p14:null,p20:null,matRate:12.00,labRate:6.50,verified:true},
  {code:"ICRA1",name:"ICRA Dust Barrier (Temp)",unit:"LF",p8:null,p10:22.00,p14:null,p20:null,matRate:8.00,labRate:14.00,verified:true},
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
export const initBids = [
  {id:1,name:"Memorial Hermann Pearland ICU Expansion",gc:"Tellepsen Builders",value:487000,due:"Mar 17",status:"estimating",scope:["Metal Framing","GWB","Lead-Lined","ACT","ICRA"],phase:"Medical",risk:"High",notes:"ICRA scope unclear — RFI submitted. Confirm lead scope split before closing.",contact:"Chris Morales",month:"Mar",closeOut:null},
  {id:2,name:"Texas Heart Institute Cath Lab Renovation",gc:"Turner Construction",value:312000,due:"Mar 20",status:"estimating",scope:["GWB","Lead-Lined","L5 Finish","Deflection Track"],phase:"Medical",risk:"High",notes:"L5 finish confirmed at all patient-facing walls.",contact:"Sarah Nichols",month:"Mar",closeOut:null},
  {id:3,name:"Houston Methodist Sugar Land MOB Fit-Out",gc:"Linbeck Group",value:156000,due:"Mar 24",status:"estimating",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Medical",risk:"Med",notes:"Standard TI — low risk. Seismic ACT to verify.",contact:"Mike Trevino",month:"Mar",closeOut:null},
  {id:4,name:"HEB Distribution Center Interior Fit-Out",gc:"Skanska USA",value:94000,due:"Mar 15",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Low",notes:"Submitted Mar 13 at $94K. Awaiting bid leveling.",contact:"Amy Chen",month:"Mar",closeOut:null},
  {id:5,name:"Post Oak Tower Tenant Improvement",gc:"Harvey Builders",value:221000,due:"Apr 2",status:"estimating",scope:["Metal Framing","GWB","L5 Finish","ACT"],phase:"Commercial",risk:"Med",notes:"L5 finish at lobby and exec suite priced separately.",contact:"Kevin Flores",month:"Apr",closeOut:null},
  {id:6,name:"St. Lukes Health NICU Renovation",gc:"JE Dunn Construction",value:543000,due:"Awarded",status:"awarded",scope:["Metal Framing","GWB","Lead-Lined","ICRA","Seismic ACT"],phase:"Medical",risk:"High",notes:"Awarded Jan 10. Contract signed.",contact:"Daniel Park",month:"Jan",closeOut:null},
  {id:7,name:"MD Anderson Proton Therapy Suite",gc:"Turner Construction",value:1250000,due:"Jan 15",status:"awarded",scope:["Metal Framing","GWB","Lead-Lined"],phase:"Medical",risk:"High",notes:"Major project. Lead-lined walls throughout.",contact:"Sarah Nichols",month:"Jan",closeOut:null},
  {id:8,name:"Houston Methodist Woodlands OR Expansion",gc:"McCarthy Building",value:890000,due:"Feb 1",status:"awarded",scope:["Metal Framing","GWB","ACT","ICRA"],phase:"Medical",risk:"High",notes:"8 new operating rooms. ICRA required.",contact:"",month:"Feb",closeOut:null},
  {id:9,name:"Memorial Hermann TMC Bed Tower",gc:"Skanska USA",value:2100000,due:"Jan 20",status:"awarded",scope:["Metal Framing","GWB","Lead-Lined","ACT"],phase:"Medical",risk:"High",notes:"Largest project to date.",contact:"Amy Chen",month:"Jan",closeOut:null},
  {id:10,name:"CHI St. Lukes Vintage Park MOB",gc:"Tellepsen Builders",value:340000,due:"Feb 10",status:"awarded",scope:["Metal Framing","GWB","Insulation"],phase:"Medical",risk:"Med",notes:"Standard MOB fit-out.",contact:"Chris Morales",month:"Feb",closeOut:null},
  {id:11,name:"Texas Childrens West Campus Clinic",gc:"Linbeck Group",value:420000,due:"Mar 1",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Medical",risk:"Med",notes:"Pediatric clinic, standard scope.",contact:"Mike Trevino",month:"Mar",closeOut:null},
  {id:12,name:"Baylor St. Lukes McNair Campus",gc:"JE Dunn Construction",value:780000,due:"Feb 15",status:"awarded",scope:["Metal Framing","GWB","Lead-Lined","ICRA"],phase:"Medical",risk:"High",notes:"Campus expansion project.",contact:"Daniel Park",month:"Feb",closeOut:null},
  {id:13,name:"HCA Houston Healthcare Kingwood ER",gc:"Robins & Morton",value:560000,due:"Mar 5",status:"submitted",scope:["Metal Framing","GWB","Lead-Lined"],phase:"Medical",risk:"High",notes:"Emergency room expansion.",contact:"",month:"Mar",closeOut:null},
  {id:14,name:"Kelsey-Seybold Spring Clinic",gc:"Harvey Builders",value:185000,due:"Feb 20",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Medical",risk:"Low",notes:"Simple clinic fit-out.",contact:"Kevin Flores",month:"Feb",closeOut:null},
  {id:15,name:"UT Physicians Bellaire Office",gc:"SpawGlass",value:145000,due:"Mar 10",status:"estimating",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Medical",risk:"Low",notes:"Physician office build-out.",contact:"",month:"Mar",closeOut:null},
  {id:16,name:"DaVita Dialysis Pearland",gc:"Cadence McShane",value:92000,due:"Jan 25",status:"awarded",scope:["Metal Framing","GWB"],phase:"Medical",risk:"Low",notes:"Repeat client template.",contact:"",month:"Jan",closeOut:null},
  {id:17,name:"Oak Bend Medical Center Renovation",gc:"Tellepsen Builders",value:320000,due:"Feb 28",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Medical",risk:"Med",notes:"Lost to lower bidder by $18K.",contact:"Chris Morales",month:"Feb",closeOut:null},
  {id:18,name:"Kindred Hospital Clear Lake",gc:"Turner Construction",value:410000,due:"Jan 30",status:"lost",scope:["Metal Framing","GWB","Lead-Lined"],phase:"Medical",risk:"High",notes:"Scope was too broad, pricing didn't align.",contact:"Sarah Nichols",month:"Jan",closeOut:null},
  {id:19,name:"Houston Methodist Baytown TI",gc:"Pepper Construction",value:175000,due:"Mar 15",status:"estimating",scope:["Metal Framing","GWB","ACT"],phase:"Medical",risk:"Med",notes:"Tenant improvement, standard scope.",contact:"",month:"Mar",closeOut:null},
  {id:20,name:"Ben Taub Hospital 4th Floor Reno",gc:"McCarthy Building",value:650000,due:"Feb 5",status:"submitted",scope:["Metal Framing","GWB","Lead-Lined","ICRA"],phase:"Medical",risk:"High",notes:"Active hospital reno, strict ICRA.",contact:"",month:"Feb",closeOut:null},
  {id:21,name:"Galleria Office Tower TI 14th Floor",gc:"Harvey Builders",value:198000,due:"Jan 10",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Low",notes:"Standard office TI.",contact:"Kevin Flores",month:"Jan",closeOut:null},
  {id:22,name:"Williams Tower Lobby Renovation",gc:"Gilbane Building",value:340000,due:"Feb 12",status:"lost",scope:["Metal Framing","GWB","L5 Finish"],phase:"Commercial",risk:"Med",notes:"L5 finish scope drove price up.",contact:"",month:"Feb",closeOut:null},
  {id:23,name:"Greenway Plaza Suite 400 TI",gc:"SpawGlass",value:125000,due:"Mar 8",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Low",notes:"Small office TI.",contact:"",month:"Mar",closeOut:null},
  {id:24,name:"CityCentre Four Build-Out",gc:"Harvey Builders",value:280000,due:"Jan 18",status:"awarded",scope:["Metal Framing","GWB","ACT","L5 Finish"],phase:"Commercial",risk:"Med",notes:"High-end finish required.",contact:"Kevin Flores",month:"Jan",closeOut:null},
  {id:25,name:"Energy Corridor Office TI",gc:"Tellepsen Builders",value:165000,due:"Feb 22",status:"lost",scope:["Metal Framing","GWB"],phase:"Commercial",risk:"Low",notes:"Lost on price. GC went with lower bid.",contact:"Chris Morales",month:"Feb",closeOut:null},
  {id:26,name:"Post Oak Hotel Ballroom Reno",gc:"Satterfield & Pontikes",value:520000,due:"Mar 20",status:"estimating",scope:["Metal Framing","GWB","L5 Finish","ACT"],phase:"Hospitality",risk:"High",notes:"High-end ballroom renovation. Night work only.",contact:"",month:"Mar",closeOut:null},
  {id:27,name:"Marriott Marquis Convention Level",gc:"Turner Construction",value:380000,due:"Feb 8",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Hospitality",risk:"Med",notes:"Lost to union contractor.",contact:"Sarah Nichols",month:"Feb",closeOut:null},
  {id:28,name:"Hilton Americas Guestroom Reno",gc:"SpawGlass",value:290000,due:"Jan 22",status:"awarded",scope:["Metal Framing","GWB"],phase:"Hospitality",risk:"Med",notes:"Phased renovation, floors 10-20.",contact:"",month:"Jan",closeOut:null},
  {id:29,name:"Katy ISD High School Addition",gc:"Pepper Construction",value:195000,due:"Nov 15",status:"awarded",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Education",risk:"Med",notes:"Summer schedule. Must complete before Aug.",contact:"",month:"Nov",closeOut:null},
  {id:30,name:"Cy-Fair ISD Elementary Renovation",gc:"Satterfield & Pontikes",value:145000,due:"Dec 10",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Education",risk:"Low",notes:"Holiday break schedule.",contact:"",month:"Dec",closeOut:null},
  {id:31,name:"Lone Star College System Center",gc:"Pepper Construction",value:310000,due:"Jan 28",status:"submitted",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Education",risk:"Med",notes:"New campus learning center.",contact:"",month:"Jan",closeOut:null},
  {id:32,name:"HISD Magnet School Expansion",gc:"Cadence McShane",value:220000,due:"Feb 18",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Education",risk:"Med",notes:"Budget constraints, bid rejected.",contact:"",month:"Feb",closeOut:null},
  {id:33,name:"Rice University Lab Building",gc:"Gilbane Building",value:480000,due:"Mar 12",status:"estimating",scope:["Metal Framing","GWB","Lead-Lined","Insulation"],phase:"Education",risk:"High",notes:"Specialized lab requirements.",contact:"",month:"Mar",closeOut:null},
  {id:34,name:"University of Houston Rec Center",gc:"JE Dunn Construction",value:350000,due:"Feb 25",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Education",risk:"Med",notes:"Recreation center expansion.",contact:"Daniel Park",month:"Feb",closeOut:null},
  {id:35,name:"Amazon Fulfillment Center Katy",gc:"Skanska USA",value:180000,due:"Jan 5",status:"awarded",scope:["Metal Framing","GWB"],phase:"Industrial",risk:"Low",notes:"Office areas within warehouse.",contact:"Amy Chen",month:"Jan",closeOut:null},
  {id:36,name:"FedEx Ground Hub Stafford",gc:"McCarthy Building",value:120000,due:"Dec 15",status:"awarded",scope:["Metal Framing","GWB"],phase:"Industrial",risk:"Low",notes:"Small office build-out.",contact:"",month:"Dec",closeOut:null},
  {id:37,name:"Sysco HQ Renovation Phase 2",gc:"Harvey Builders",value:440000,due:"Mar 18",status:"estimating",scope:["Metal Framing","GWB","ACT","L5 Finish"],phase:"Commercial",risk:"Med",notes:"Phase 2 of ongoing renovation.",contact:"Kevin Flores",month:"Mar",closeOut:null},
  {id:38,name:"Phillips 66 Office Tower TI",gc:"Tellepsen Builders",value:275000,due:"Feb 14",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Med",notes:"Floors 8-12 tenant improvement.",contact:"Chris Morales",month:"Feb",closeOut:null},
  {id:39,name:"Shell Woodcreek Office TI",gc:"Turner Construction",value:195000,due:"Jan 12",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Low",notes:"Lost to preferred vendor list.",contact:"Sarah Nichols",month:"Jan",closeOut:null},
  {id:40,name:"ExxonMobil Spring Campus B2",gc:"Skanska USA",value:680000,due:"Mar 22",status:"estimating",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Commercial",risk:"Med",notes:"Large campus building fit-out.",contact:"Amy Chen",month:"Mar",closeOut:null},
  {id:41,name:"ConocoPhillips Energy Corridor",gc:"Gilbane Building",value:320000,due:"Feb 3",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Med",notes:"Lost on schedule requirements.",contact:"",month:"Feb",closeOut:null},
  {id:42,name:"Chevron 1500 Louisiana Reno",gc:"JE Dunn Construction",value:410000,due:"Jan 8",status:"awarded",scope:["Metal Framing","GWB","L5 Finish","ACT"],phase:"Commercial",risk:"Med",notes:"Executive floor renovation.",contact:"Daniel Park",month:"Jan",closeOut:null},
  {id:43,name:"JP Morgan Chase Tower TI",gc:"Pepper Construction",value:230000,due:"Mar 25",status:"estimating",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Low",notes:"Standard office TI, good repeat client.",contact:"",month:"Mar",closeOut:null},
  {id:44,name:"Bank of America Center Suite 2200",gc:"Harvey Builders",value:175000,due:"Feb 6",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Commercial",risk:"Low",notes:"Small suite renovation.",contact:"Kevin Flores",month:"Feb",closeOut:null},
  {id:45,name:"Minute Maid Park Suite Renovations",gc:"SpawGlass",value:160000,due:"Nov 20",status:"awarded",scope:["Metal Framing","GWB"],phase:"Entertainment",risk:"Med",notes:"Off-season work only.",contact:"",month:"Nov",closeOut:null},
  {id:46,name:"Toyota Center Concourse Upgrade",gc:"Gilbane Building",value:280000,due:"Apr 5",status:"estimating",scope:["Metal Framing","GWB","ACT"],phase:"Entertainment",risk:"Med",notes:"Must complete between seasons.",contact:"",month:"Apr",closeOut:null},
  {id:47,name:"George R Brown Convention Ctr Reno",gc:"McCarthy Building",value:750000,due:"Feb 20",status:"submitted",scope:["Metal Framing","GWB","ACT","L5 Finish"],phase:"Government",risk:"High",notes:"City of Houston project. Davis-Bacon wages.",contact:"",month:"Feb",closeOut:null},
  {id:48,name:"Harris County Courthouse Reno",gc:"Tellepsen Builders",value:420000,due:"Jan 15",status:"lost",scope:["Metal Framing","GWB","Lead-Lined"],phase:"Government",risk:"High",notes:"Lost — required HUB certification.",contact:"Chris Morales",month:"Jan",closeOut:null},
  {id:49,name:"City of Sugar Land Community Center",gc:"Satterfield & Pontikes",value:190000,due:"Mar 28",status:"estimating",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Government",risk:"Low",notes:"Community recreation center.",contact:"",month:"Mar",closeOut:null},
  {id:50,name:"VA Medical Center Houston Pharmacy",gc:"Robins & Morton",value:380000,due:"Feb 28",status:"submitted",scope:["Metal Framing","GWB","Lead-Lined","ICRA"],phase:"Government",risk:"High",notes:"Federal project, VA requirements.",contact:"",month:"Feb",closeOut:null},
  {id:51,name:"Fort Bend County Library Expansion",gc:"Cadence McShane",value:155000,due:"Jan 20",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Government",risk:"Low",notes:"Simple expansion project.",contact:"",month:"Jan",closeOut:null},
  {id:52,name:"Memorial Hermann Katy Hospital ER",gc:"McCarthy Building",value:620000,due:"Apr 10",status:"estimating",scope:["Metal Framing","GWB","Lead-Lined","ICRA"],phase:"Medical",risk:"High",notes:"ER expansion, phased approach.",contact:"",month:"Apr",closeOut:null},
  {id:53,name:"Houston Methodist The Woodlands Expansion",gc:"Skanska USA",value:980000,due:"Mar 30",status:"estimating",scope:["Metal Framing","GWB","ACT","Lead-Lined"],phase:"Medical",risk:"High",notes:"Major expansion project.",contact:"Amy Chen",month:"Mar",closeOut:null},
  {id:54,name:"St. Josephs Medical Center Reno",gc:"Linbeck Group",value:245000,due:"Feb 10",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Medical",risk:"Med",notes:"Lost by $12K to competitor.",contact:"Mike Trevino",month:"Feb",closeOut:null},
  {id:55,name:"Park Plaza Hospital 3rd Floor",gc:"Robins & Morton",value:310000,due:"Jan 28",status:"awarded",scope:["Metal Framing","GWB","Lead-Lined"],phase:"Medical",risk:"Med",notes:"Floor renovation.",contact:"",month:"Jan",closeOut:null},
  {id:56,name:"Encompass Health Rehab Humble",gc:"SpawGlass",value:165000,due:"Mar 5",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Medical",risk:"Low",notes:"Rehab facility standard build.",contact:"",month:"Mar",closeOut:null},
  {id:57,name:"NextGen Dental Katy Freeway",gc:"Harvey Builders",value:88000,due:"Dec 20",status:"awarded",scope:["Metal Framing","GWB","Lead-Lined"],phase:"Medical",risk:"Low",notes:"Dental office with X-ray rooms.",contact:"Kevin Flores",month:"Dec",closeOut:null},
  {id:58,name:"Pearland Town Center Retail TI",gc:"Cadence McShane",value:95000,due:"Jan 5",status:"awarded",scope:["Metal Framing","GWB"],phase:"Retail",risk:"Low",notes:"Retail tenant improvement.",contact:"",month:"Jan",closeOut:null},
  {id:59,name:"Baybrook Mall Expansion Wing",gc:"Pepper Construction",value:340000,due:"Feb 15",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Retail",risk:"Med",notes:"Lost to national drywall contractor.",contact:"",month:"Feb",closeOut:null},
  {id:60,name:"Sugar Land Town Square Restaurant",gc:"SpawGlass",value:72000,due:"Nov 10",status:"awarded",scope:["Metal Framing","GWB"],phase:"Retail",risk:"Low",notes:"Small restaurant build-out.",contact:"",month:"Nov",closeOut:null},
  {id:61,name:"First Baptist Church Katy Campus",gc:"Satterfield & Pontikes",value:280000,due:"Mar 15",status:"submitted",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Religious",risk:"Med",notes:"New worship center addition.",contact:"",month:"Mar",closeOut:null},
  {id:62,name:"Lakewood Church Youth Building",gc:"Linbeck Group",value:420000,due:"Apr 1",status:"estimating",scope:["Metal Framing","GWB","ACT","L5 Finish"],phase:"Religious",risk:"Med",notes:"High-visibility project.",contact:"Mike Trevino",month:"Apr",closeOut:null},
  {id:63,name:"Second Baptist Woodway Renovation",gc:"Harvey Builders",value:195000,due:"Jan 25",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Religious",risk:"Low",notes:"Interior renovation.",contact:"Kevin Flores",month:"Jan",closeOut:null},
  {id:64,name:"The Woodlands Waterway Marriott Reno",gc:"Turner Construction",value:350000,due:"Mar 10",status:"submitted",scope:["Metal Framing","GWB","ACT"],phase:"Hospitality",risk:"Med",notes:"Hotel renovation, night work.",contact:"Sarah Nichols",month:"Mar",closeOut:null},
  {id:65,name:"Hotel Granduca Houston Suites",gc:"Gilbane Building",value:275000,due:"Feb 18",status:"lost",scope:["Metal Framing","GWB","L5 Finish"],phase:"Hospitality",risk:"Med",notes:"High-end finish requirements exceeded budget.",contact:"",month:"Feb",closeOut:null},
  {id:66,name:"Residence Inn Galleria Renovation",gc:"SpawGlass",value:180000,due:"Jan 8",status:"awarded",scope:["Metal Framing","GWB"],phase:"Hospitality",risk:"Low",notes:"Standard hotel renovation.",contact:"",month:"Jan",closeOut:null},
  {id:67,name:"Texas Southern University Science Bldg",gc:"Cadence McShane",value:520000,due:"Mar 20",status:"estimating",scope:["Metal Framing","GWB","Lead-Lined","Insulation"],phase:"Education",risk:"High",notes:"Lab spaces with lead-lined walls.",contact:"",month:"Mar",closeOut:null},
  {id:68,name:"Sam Houston State University Dorm",gc:"JE Dunn Construction",value:290000,due:"Feb 22",status:"submitted",scope:["Metal Framing","GWB","ACT","Insulation"],phase:"Education",risk:"Med",notes:"Dormitory renovation.",contact:"Daniel Park",month:"Feb",closeOut:null},
  {id:69,name:"Prairie View A&M Student Center",gc:"Pepper Construction",value:210000,due:"Jan 18",status:"lost",scope:["Metal Framing","GWB","ACT"],phase:"Education",risk:"Med",notes:"Lost — required MBE certification.",contact:"",month:"Jan",closeOut:null},
  {id:70,name:"Tomball ISD Admin Building",gc:"Satterfield & Pontikes",value:135000,due:"Dec 5",status:"awarded",scope:["Metal Framing","GWB","ACT"],phase:"Education",risk:"Low",notes:"Administrative office build-out.",contact:"",month:"Dec",closeOut:null},
  {id:71,name:"LyondellBasell Tower Floors 5-8",gc:"Skanska USA",value:460000,due:"Mar 28",status:"estimating",scope:["Metal Framing","GWB","ACT","L5 Finish"],phase:"Commercial",risk:"Med",notes:"Multi-floor tenant improvement.",contact:"Amy Chen",month:"Mar",closeOut:null},
  {id:72,name:"Hines 609 Main at Texas Tower",gc:"Turner Construction",value:580000,due:"Apr 8",status:"estimating",scope:["Metal Framing","GWB","ACT","L5 Finish"],phase:"Commercial",risk:"High",notes:"Premium Class A tower. L5 throughout.",contact:"Sarah Nichols",month:"Apr",closeOut:null},
  {id:73,name:"NRG Stadium Luxury Suite Refresh",gc:"McCarthy Building",value:210000,due:"Apr 15",status:"estimating",scope:["Metal Framing","GWB","L5 Finish"],phase:"Entertainment",risk:"Med",notes:"Off-season only. Tight schedule.",contact:"",month:"Apr",closeOut:null},
  {id:74,name:"Baylor College of Medicine Lab Suite",gc:"Satterfield & Pontikes",value:278000,due:"Awarded",status:"awarded",scope:["Metal Framing","GWB","Insulation"],phase:"Medical",risk:"Med",notes:"Lab suite fit-out. Closeout phase.",contact:"",month:"Sep",closeOut:null},
];

// ── SEED: PROJECTS ──
// Real project data extracted from Google Docs proposals
export const PM_NAMES = { 3: "Emmanuel Aguilar", 4: "Isai Aguilar", 8: "Abner Aguilar" };
export const initProjects = [
  {id:1,name:"Brunello Cucinelli",gc:"WCC",contract:308400,billed:0,progress:0,phase:"Pre-Construction",start:"Feb 20",end:"Jun 30",am:3,pm:"Emmanuel Aguilar",laborBudget:123400,laborHours:3520,demo:78300,drywall:228800,act:1300,lat:29.7365,lng:-95.4613,radiusFt:1000,superintendent:"Joe Martinez",address:"2800 Kirby Dr, Houston, TX 77098",emergencyContact:{name:"Site Safety",phone:"713-555-9901",role:"Safety Manager"}},
  {id:2,name:"United — Escapology San Antonio",gc:"United",contract:187800,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 12",end:"Jul 15",am:4,pm:"Isai Aguilar",laborBudget:75100,laborHours:2146,demo:27500,drywall:141500,act:18800,lat:29.4241,lng:-98.4936,radiusFt:1000,superintendent:"Ray Gutierrez",address:"15900 La Cantera Pkwy, San Antonio, TX 78256",emergencyContact:{name:"United Safety",phone:"210-555-8801",role:"Safety Coordinator"}},
  {id:3,name:"United — 801 Travis Elevator Lobby",gc:"United",contract:35100,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 11",end:"May 1",am:8,pm:"Abner Aguilar",laborBudget:14000,laborHours:400,demo:9200,drywall:24000,act:1900,lat:29.7604,lng:-95.3632,radiusFt:800,superintendent:"Mark Chen",address:"801 Travis St, Houston, TX 77002",emergencyContact:{name:"Building Mgmt",phone:"713-555-8010",role:"Building Manager"}},
  {id:4,name:"Bayshore — FKC San Angelo",gc:"Bayshore",contract:313400,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 11",end:"Jul 30",am:3,pm:"Emmanuel Aguilar",laborBudget:125400,laborHours:3583,demo:22400,drywall:240600,act:50400,lat:31.4638,lng:-100.4370,radiusFt:1200,superintendent:"Tony Reyes",address:"4350 Southwest Blvd, San Angelo, TX 76904",emergencyContact:{name:"Bayshore Safety",phone:"325-555-4401",role:"Safety Manager"}},
  {id:5,name:"United — Heart Care Clinic NW Houston",gc:"United",contract:73900,billed:0,progress:0,phase:"Estimating",start:"Jan 5",end:"May 15",am:4,pm:"Isai Aguilar",laborBudget:29600,laborHours:846,demo:2200,drywall:68900,act:2800,lat:29.8871,lng:-95.5562,radiusFt:1000,superintendent:"Frank Delgado",address:"13011 Louetta Rd, Cypress, TX 77429",emergencyContact:{name:"United Safety",phone:"713-555-8802",role:"Safety Coordinator"}},
  {id:6,name:"MH — Fulshear SMR",gc:"Forney",contract:121000,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 11",end:"Jun 30",am:3,pm:"Emmanuel Aguilar",laborBudget:48400,laborHours:1383,demo:0,drywall:108400,act:12600,lat:29.6890,lng:-95.8990,radiusFt:1000,superintendent:"Paul Nguyen",address:"6530 Cross Creek Bend, Fulshear, TX 77441",emergencyContact:{name:"Forney Safety",phone:"713-555-6601",role:"Safety Manager"}},
  {id:7,name:"United — Aggieland Imaging College Station",gc:"United",contract:79600,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 10",end:"Jun 15",am:4,pm:"Isai Aguilar",laborBudget:31800,laborHours:909,demo:0,drywall:63700,act:15900,lat:30.6280,lng:-96.3344,radiusFt:1000,superintendent:"Steve Hoffman",address:"1700 University Dr E, College Station, TX 77840",emergencyContact:{name:"United Safety",phone:"979-555-1701",role:"Safety Coordinator"}},
  {id:8,name:"MH — Katy MP3 UTP OBGYN Level 4",gc:"Forney",contract:262000,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 6",end:"Jul 30",am:3,pm:"Emmanuel Aguilar",laborBudget:104800,laborHours:2994,demo:1000,drywall:261000,act:0,lat:29.7858,lng:-95.7560,radiusFt:1000,superintendent:"Carlos Vega",address:"23900 Katy Fwy, Katy, TX 77494",emergencyContact:{name:"Forney Safety",phone:"713-555-6602",role:"Safety Manager"}},
  {id:9,name:"United — Ogle School Remodel",gc:"United",contract:300200,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 6",end:"Jul 15",am:4,pm:"Isai Aguilar",laborBudget:120100,laborHours:3431,demo:0,drywall:232900,act:67300,lat:29.7604,lng:-95.3698,radiusFt:1000,superintendent:"Danny Tran",address:"1011 Hwy 6 N, Houston, TX 77079",emergencyContact:{name:"United Safety",phone:"713-555-8803",role:"Safety Coordinator"}},
  {id:10,name:"MH — MC MP3 Infusion Suite 785",gc:"Forney",contract:25000,billed:0,progress:0,phase:"Pre-Construction",start:"Feb 12",end:"May 1",am:8,pm:"Abner Aguilar",laborBudget:10000,laborHours:286,demo:4900,drywall:17300,act:2800,lat:29.7105,lng:-95.3999,radiusFt:800,superintendent:"Mike Salinas",address:"6565 Fannin St, Houston, TX 77030",emergencyContact:{name:"MH Safety",phone:"713-555-6565",role:"Safety Manager"}},
  {id:11,name:"MH — Woodlands RAD Equipment Replacement",gc:"Forney",contract:10500,billed:0,progress:0,phase:"Pre-Construction",start:"Feb 17",end:"Apr 15",am:8,pm:"Abner Aguilar",laborBudget:4200,laborHours:120,demo:2500,drywall:4900,act:3100,lat:30.1658,lng:-95.4613,radiusFt:800,superintendent:"Greg Palmer",address:"17183 I-45 S, The Woodlands, TX 77385",emergencyContact:{name:"MH Safety",phone:"281-555-1718",role:"Safety Manager"}},
  {id:12,name:"Arch-Con — Regor Therapeutics",gc:"Arch-Con",contract:89700,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 5",end:"Jun 30",am:3,pm:"Emmanuel Aguilar",laborBudget:35900,laborHours:1026,demo:11600,drywall:51600,act:26500,lat:29.7174,lng:-95.4018,radiusFt:1000,superintendent:"Ben Ortiz",address:"2450 Holcombe Blvd, Houston, TX 77021",emergencyContact:{name:"Arch-Con Safety",phone:"713-555-2450",role:"Safety Coordinator"}},
  {id:13,name:"Structure Tone — 8303 Fallbrook Generator",gc:"Structure Tone",contract:6000,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 4",end:"Apr 30",am:8,pm:"Abner Aguilar",laborBudget:2400,laborHours:69,demo:800,drywall:5200,act:0,lat:29.8158,lng:-95.5410,radiusFt:800,superintendent:"Alan Webb",address:"8303 Fallbrook Dr, Houston, TX 77064",emergencyContact:{name:"ST Safety",phone:"713-555-8303",role:"Safety Manager"}},
  {id:14,name:"WCC — 3HL Suite 265",gc:"WCC",contract:6800,billed:0,progress:0,phase:"Pre-Construction",start:"Feb 16",end:"Apr 15",am:4,pm:"Isai Aguilar",laborBudget:2700,laborHours:77,demo:2500,drywall:4300,act:0,lat:29.7069,lng:-95.3981,radiusFt:800,superintendent:"Luis Garza",address:"6620 Main St Ste 265, Houston, TX 77030",emergencyContact:{name:"WCC Safety",phone:"713-555-6620",role:"Safety Coordinator"}},
  {id:15,name:"WCC — CB&I Lvl 2 & Lvl 7",gc:"WCC",contract:59800,billed:0,progress:0,phase:"Pre-Construction",start:"Mar 11",end:"Jun 15",am:3,pm:"Emmanuel Aguilar",laborBudget:23900,laborHours:683,demo:7100,drywall:38800,act:12900,lat:29.7365,lng:-95.4613,radiusFt:1000,superintendent:"Joe Martinez",address:"2800 Post Oak Blvd, Houston, TX 77056",emergencyContact:{name:"WCC Safety",phone:"713-555-2801",role:"Safety Manager"}},
];

// ── SEED: CONTACTS ──
export const initContacts = [
  {id:1,name:"Chris Morales",company:"Tellepsen Builders",role:"Senior PM",bids:14,wins:7,color:"#3b82f6",last:"2 days ago",priority:"high",phone:"713-555-0101",email:"chris.morales@tellepsen.com",notes:"First call list. Prefers text for quick questions. Strong relationship."},
  {id:2,name:"Daniel Park",company:"JE Dunn Construction",role:"Estimator",bids:9,wins:5,color:"#10b981",last:"1 week ago",priority:"high",phone:"713-555-0102",email:"d.park@jedunn.com",notes:"Strong relationship. Invited EBC to NICU bid directly."},
  {id:3,name:"Sarah Nichols",company:"Turner Construction",role:"Pre-Con Mgr",bids:6,wins:2,color:"#8b5cf6",last:"3 days ago",priority:"med",phone:"713-555-0103",email:"s.nichols@tcco.com",notes:"Building relationship. Texas Heart bid is key opportunity."},
  {id:4,name:"Mike Trevino",company:"Linbeck Group",role:"Sr. Estimator",bids:11,wins:4,color:"#f59e0b",last:"Today",priority:"high",phone:"713-555-0104",email:"m.trevino@linbeck.com",notes:"Good communicator. Always levels fairly. Call before bid day."},
  {id:5,name:"Kevin Flores",company:"Harvey Builders",role:"PM",bids:4,wins:2,color:"#ef4444",last:"5 days ago",priority:"med",phone:"713-555-0105",email:"k.flores@harvey.com",notes:"New contact. Post Oak Tower is first major bid opportunity."},
  {id:6,name:"Amy Chen",company:"Skanska USA",role:"Preconstruction",bids:3,wins:1,color:"#06b6d4",last:"2 weeks ago",priority:"low",phone:"713-555-0106",email:"a.chen@skanska.com",notes:"Follow up after HEB result comes in."},
];

// ── SEED: CALL LOG ──
export const initCallLog = [
  {id:1,contact:"United PM",company:"United",time:"Mar 12 10:30 AM",note:"Discussed Escapology San Antonio scope — confirmed demo + drywall + ACT. $187,800 total.",next:"Submit final proposal by Mar 15"},
  {id:2,contact:"WCC PM",company:"WCC",time:"Mar 11 2:15 PM",note:"CB&I Lvl 2 & Lvl 7 — confirmed 3 areas. CEO office soundproofing alternate requested.",next:"Submit alternates pricing"},
  {id:3,contact:"Forney PM",company:"Forney",time:"Mar 11 4:00 PM",note:"Fulshear SMR — build back + ACT only, no demo. Armstrong BP355E Optima on 9/16 grid.",next:"Confirm material lead times"},
];

// ── SEED: INVOICES ──
export const initInvoices = [
  {id:1,projectId:1,number:"EBC-2026-001",date:"2026-02-28",amount:92500,status:"pending",desc:"Progress billing #1 — Mobilization + material delivery (Brunello Cucinelli)",paidDate:null},
  {id:2,projectId:4,number:"EBC-2026-002",date:"2026-03-10",amount:94000,status:"pending",desc:"Progress billing #1 — Mobilization (Bayshore FKC San Angelo)",paidDate:null},
  {id:3,projectId:5,number:"EBC-2026-003",date:"2026-02-15",amount:22200,status:"paid",desc:"Progress billing #1 — Heart Care Clinic NW Houston",paidDate:"2026-03-01"},
  {id:4,projectId:8,number:"EBC-2026-004",date:"2026-03-10",amount:78600,status:"pending",desc:"Progress billing #1 — MH Katy OBGYN Level 4",paidDate:null},
  {id:5,projectId:9,number:"EBC-2026-005",date:"2026-03-10",amount:90100,status:"pending",desc:"Progress billing #1 — Ogle School Remodel",paidDate:null},
];

// ── SEED: T&M TICKETS ──
// Time & Material tracking — separate from original project contract
export const initTmTickets = [
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
export const initChangeOrders = [
  {id:1,projectId:6,number:"CO-001",desc:"MHMC Cancer Center — Drywall patching, painting, shelf installation (T&M)",amount:800,status:"pending",submitted:"2026-03-11",approved:null},
  {id:2,projectId:11,number:"CO-001",desc:"HM Magnolia ECC MRI Buildout — Sleep room door demo, infill, relocate & tape/float",amount:2600,status:"pending",submitted:"2026-03-10",approved:null},
  {id:3,projectId:8,number:"CO-009",desc:"MH Pearland Level 4 Renovation — Install 10 AD Systems sliding doors (after hours)",amount:8400,status:"pending",submitted:"2026-01-29",approved:null},
  {id:4,projectId:5,number:"CO-001",desc:"United Heart Care Clinic NW Houston — Additional scope per revised drawings",amount:4200,status:"pending",submitted:"2026-03-11",approved:null},
];

// ── SEED: RFIs ──
export const initRfis = [
  {id:1,projectId:4,number:"RFI-001",subject:"MH League City CCC CT — Equipment exchange scope clarification",submitted:"2026-03-12",status:"open",assigned:"Forney PM",response:"",responseDate:null},
  {id:2,projectId:1,number:"RFI-001",subject:"Brunello Cucinelli — ACT grid layout at display area",submitted:"2026-02-25",status:"open",assigned:"WCC PM",response:"",responseDate:null},
  {id:3,projectId:9,number:"RFI-001",subject:"Ogle School — Metal framing gauge at corridor partitions",submitted:"2026-03-08",status:"answered",assigned:"United PM",response:"20ga per structural, 14ga at impact zones",responseDate:"2026-03-11"},
  {id:4,projectId:7,number:"RFI-001",subject:"Aggieland MRI — Lead-lined rock layers at scan room",submitted:"2026-03-11",status:"open",assigned:"United PM",response:"",responseDate:null},
];

// ── SEED: SUBMITTALS ──
export const initSubmittals = [
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
export const initSchedule = [
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
export const initIncidents = [
  {id:1,projectId:1,date:"2026-03-05",type:"near-miss",desc:"Scaffold wheel unlocked during repositioning on Level 2",corrective:"All scaffold wheels inspected. Refresher training conducted same day.",reportedBy:"Oscar A."},
  {id:2,projectId:3,date:"2026-02-18",type:"first-aid",desc:"Minor cut on hand from sheet metal edge — no stitches required",corrective:"Crew reminded of cut-resistant glove requirement. Gloves restocked.",reportedBy:"Foreman R."},
];

export const initToolboxTalks = [
  {id:1,projectId:1,date:"2026-03-13",topic:"Silica Dust Exposure — GWB Sanding",attendees:8,conductor:"Oscar A.",notes:"Reviewed N95 requirements, wet sanding technique"},
  {id:2,projectId:1,date:"2026-03-06",topic:"Scaffold Safety & Fall Protection",attendees:6,conductor:"Oscar A.",notes:"Inspection checklist reviewed, competent person designated"},
  {id:3,projectId:3,date:"2026-03-11",topic:"Electrical Safety — Lockout/Tagout",attendees:5,conductor:"Foreman R.",notes:"All crew signed off on awareness form"},
];

export const initDailyReports = [
  {id:1,projectId:1,date:"2026-03-13",crewSize:6,hours:48,work:"Framing complete rooms 201-204. Board started 201.",issues:"Material delivery delayed — GWB arriving tomorrow.",weather:"Clear 72°F",safety:"No incidents."},
  {id:2,projectId:1,date:"2026-03-12",crewSize:6,hours:48,work:"Framing rooms 205-208. Track layout at corridor C.",issues:"None.",weather:"Overcast 68°F",safety:"Toolbox talk — scaffold safety."},
];

// ── SEED: TAKEOFFS ──
export const initTakeoffs = [
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
export const initEmployees = [
  { id: 1, name: "Oscar Alvarez", role: "Foreman", pin: "1234", phone: "713-555-1001", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 42, active: true, email: "oscar@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 2, name: "Ricardo Mendez", role: "Journeyman", pin: "2345", phone: "713-555-1002", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 35, active: true, email: "ricardo@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 3, name: "Carlos Fuentes", role: "Apprentice", pin: "3456", phone: "713-555-1003", schedule: { start: "07:00", end: "15:30" }, hourlyRate: 22, active: true, email: "carlos@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 4, name: "Miguel Torres", role: "Journeyman", pin: "4567", phone: "713-555-1004", schedule: { start: "06:30", end: "15:00" }, hourlyRate: 35, active: true, email: "miguel@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 5, name: "David Ramirez", role: "Foreman", pin: "5678", phone: "713-555-1005", schedule: { start: "06:00", end: "14:30" }, hourlyRate: 42, active: true, email: "david@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 6, name: "Luis Herrera", role: "Apprentice", pin: "6789", phone: "713-555-1006", schedule: { start: "07:00", end: "15:30" }, hourlyRate: 22, active: true, email: "luis@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
  { id: 7, name: "Rigoberto Martinez", role: "Driver", pin: "7890", phone: "713-555-1007", schedule: { start: "07:00", end: "16:00" }, hourlyRate: 25, active: true, email: "rigoberto@eaglesbros.com", password: "ebc2026", avatar: null, notifications: { schedule: true, materials: true, deliveries: true }, defaultProjectId: null },
];

// ── SEED: COMPANY LOCATIONS (geofence) ──
export const initCompanyLocations = [
  { id: "loc_office", name: "EBC Main Office", lat: 29.7604, lng: -95.3698, radiusFt: 1000, type: "office" },
  { id: "loc_warehouse", name: "EBC Warehouse", lat: 29.7250, lng: -95.4000, radiusFt: 800, type: "warehouse" },
];

// ── SEED: MATERIAL REQUESTS ──
export const initMaterialRequests = [];

// ── SEED: CREW SCHEDULE ──
export const initCrewSchedule = [
  { id:1, employeeId:1, projectId:1, weekStart:"2026-03-09", days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:2, employeeId:2, projectId:1, weekStart:"2026-03-09", days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:3, employeeId:3, projectId:1, weekStart:"2026-03-09", days:{mon:true,tue:true,wed:false,thu:false,fri:false}, hours:{start:"07:00",end:"15:30"} },
  { id:4, employeeId:4, projectId:2, weekStart:"2026-03-09", days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
  { id:5, employeeId:5, projectId:2, weekStart:"2026-03-09", days:{mon:true,tue:true,wed:true,thu:true,fri:false}, hours:{start:"07:00",end:"15:30"} },
  { id:6, employeeId:6, projectId:1, weekStart:"2026-03-09", days:{mon:true,tue:true,wed:true,thu:true,fri:true}, hours:{start:"06:30",end:"15:00"} },
];

// ── SEED: TIME ENTRIES ──
export const initTimeEntries = [];
