// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Data Constants & Seed Data
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { isDemoMode } from "./defaults";
const _demo = isDemoMode();

// Bump this when seed data changes to bust stale localStorage caches
export const DATA_VERSION = 18;

// ── THEMES ────────────────────────────────────────────────────
export const THEMES = {
  steel: {
    name: "Steel", icon: "⚙️", label: "Steel",
    vars: {
      "--bg":"#06080c","--bg2":"#0c0f16","--bg3":"#12161f","--bg4":"#1a1f2b",
      "--border":"#1c2233","--border2":"#283044",
      "--amber":"#e09422","--amber2":"#f0a83a","--amber-dim":"rgba(224,148,34,0.10)","--amber-glow":"rgba(224,148,34,0.20)",
      "--accent":"var(--amber)",
      "--blue":"#3b82f6","--blue-dim":"rgba(59,130,246,0.10)",
      "--green":"#10b981","--green-dim":"rgba(16,185,129,0.10)",
      "--red":"#ef4444","--red-dim":"rgba(239,68,68,0.10)",
      "--yellow":"#eab308",
      "--purple":"#8b5cf6","--purple-dim":"rgba(139,92,246,0.10)","--cyan":"#22d3ee","--cyan-dim":"rgba(34,211,238,0.10)",
      "--text":"#d4dae6","--text2":"#8494ad","--text3":"#455068",
      "--bg2-rgb":"12,15,22",
      "--glass-border":"rgba(255,255,255,0.06)","--glass-bg":"rgba(12,15,22,0.72)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      
      "--shadow":"0 2px 12px rgba(0,0,0,0.3)","--card-shadow":"0 1px 8px rgba(0,0,0,0.2)",
      "--shadow-sm":"0 1px 4px rgba(0,0,0,0.12)","--shadow-md":"0 2px 12px rgba(0,0,0,0.28)","--shadow-lg":"0 4px 32px rgba(0,0,0,0.45)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  blueprint: {
    name: "Blueprint", icon: "📐", label: "Blueprint",
    vars: {
      "--bg":"#020a16","--bg2":"#041220","--bg3":"#061c32","--bg4":"#0a2d4a",
      "--border":"#0c3558","--border2":"#185070",
      "--amber":"#00bfef","--amber2":"#2ad4ff","--amber-dim":"rgba(0,191,239,0.08)","--amber-glow":"rgba(0,191,239,0.18)",
      "--accent":"var(--amber)",
      "--blue":"#00d4ff","--blue-dim":"rgba(0,212,255,0.08)",
      "--green":"#00e89a","--green-dim":"rgba(0,232,154,0.08)",
      "--red":"#ff4f7b","--red-dim":"rgba(255,79,123,0.10)",
      "--yellow":"#ffd866",
      "--purple":"#a78bfa","--purple-dim":"rgba(167,139,250,0.10)","--cyan":"#67e8f9","--cyan-dim":"rgba(103,232,249,0.10)",
      "--text":"#bdddf0","--text2":"#5d98b8","--text3":"#2a5570",
      "--bg2-rgb":"4,18,32",
      "--glass-border":"rgba(0,191,239,0.08)","--glass-bg":"rgba(4,18,32,0.72)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      
      "--shadow":"0 0 0 1px rgba(0,191,239,0.06)","--card-shadow":"0 0 12px rgba(0,191,239,0.04)",
      "--shadow-sm":"0 0 0 1px rgba(0,191,239,0.06)","--shadow-md":"0 0 12px rgba(0,191,239,0.08)","--shadow-lg":"0 0 24px rgba(0,191,239,0.12)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  daylight: {
    name: "Daylight", icon: "☀️", label: "Daylight",
    vars: {
      "--bg":"#f2f3f7","--bg2":"#ffffff","--bg3":"#f8f9fb","--bg4":"#eceef4",
      "--border":"#dfe2ea","--border2":"#c8cdd8",
      "--amber":"#c06e10","--amber2":"#a05a0a","--amber-dim":"rgba(192,110,16,0.07)","--amber-glow":"rgba(192,110,16,0.14)",
      "--accent":"var(--amber)",
      "--blue":"#2563eb","--blue-dim":"rgba(37,99,235,0.07)",
      "--green":"#059669","--green-dim":"rgba(5,150,105,0.07)",
      "--red":"#dc2626","--red-dim":"rgba(220,38,38,0.07)",
      "--yellow":"#b45309","--purple":"#7c3aed","--purple-dim":"rgba(124,58,237,0.10)","--cyan":"#0891b2","--cyan-dim":"rgba(8,145,178,0.10)",
      "--text":"#1a1d28","--text2":"#555d6e","--text3":"#9aa0b0",
      "--bg2-rgb":"255,255,255",
      "--glass-border":"rgba(0,0,0,0.06)","--glass-bg":"rgba(255,255,255,0.78)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      
      "--shadow":"0 1px 4px rgba(0,0,0,0.06)","--card-shadow":"0 1px 6px rgba(0,0,0,0.05)",
      "--shadow-sm":"0 1px 4px rgba(0,0,0,0.06)","--shadow-md":"0 2px 8px rgba(0,0,0,0.12)","--shadow-lg":"0 4px 20px rgba(0,0,0,0.18)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  matrix: {
    name: "Matrix", icon: "💊", label: "Matrix",
    vars: {
      "--bg":"#000400","--bg2":"#010a01","--bg3":"#011201","--bg4":"#021a02",
      "--border":"#083808","--border2":"#124a12",
      "--amber":"#00ff41","--amber2":"#33ff66","--amber-dim":"rgba(0,255,65,0.06)","--amber-glow":"rgba(0,255,65,0.16)",
      "--accent":"var(--amber)",
      "--blue":"#00ff41","--blue-dim":"rgba(0,255,65,0.06)",
      "--green":"#00ff41","--green-dim":"rgba(0,255,65,0.08)",
      "--red":"#ff3c00","--red-dim":"rgba(255,60,0,0.08)",
      "--yellow":"#aaff00","--purple":"#bf7fff","--purple-dim":"rgba(191,127,255,0.10)","--cyan":"#00ffcc","--cyan-dim":"rgba(0,255,204,0.10)",
      "--text":"#00ff41","--text2":"#009928","--text3":"#005216",
      "--bg2-rgb":"1,10,1",
      "--glass-border":"rgba(0,255,65,0.08)","--glass-bg":"rgba(1,10,1,0.85)",
      "--font-head":"'IBM Plex Mono', monospace",
      "--font-body":"'IBM Plex Mono', monospace",
      "--font-mono":"'IBM Plex Mono', monospace",
      
      "--shadow":"none","--card-shadow":"0 0 10px rgba(0,255,65,0.04)",
      "--shadow-sm":"none","--shadow-md":"0 0 10px rgba(0,255,65,0.04)","--shadow-lg":"0 0 20px rgba(0,255,65,0.08)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  anime: {
    name: "Anime", icon: "🌸", label: "Tokyo Anime",
    vars: {
      "--bg":"#080414","--bg2":"#0e0820","--bg3":"#140c30","--bg4":"#1c1242",
      "--border":"#2a1868","--border2":"#3c2690",
      "--amber":"#ff2da0","--amber2":"#ff60c0","--amber-dim":"rgba(255,45,160,0.12)","--amber-glow":"rgba(255,45,160,0.30)",
      "--accent":"var(--amber)",
      "--blue":"#00e5ff","--blue-dim":"rgba(0,229,255,0.10)",
      "--green":"#80ff60","--green-dim":"rgba(128,255,96,0.10)",
      "--red":"#ff3070","--red-dim":"rgba(255,48,112,0.12)",
      "--yellow":"#ffe44d","--purple":"#c084fc","--purple-dim":"rgba(192,132,252,0.10)","--cyan":"#67e8f9","--cyan-dim":"rgba(103,232,249,0.10)",
      "--text":"#f0e4ff","--text2":"#b498d8","--text3":"#604890",
      "--bg2-rgb":"14,8,32",
      "--glass-border":"rgba(255,45,160,0.12)","--glass-bg":"rgba(14,8,32,0.68)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      
      "--shadow":"0 0 20px rgba(255,45,160,0.08)","--card-shadow":"0 0 16px rgba(255,45,160,0.06)",
      "--shadow-sm":"0 0 8px rgba(255,45,160,0.06)","--shadow-md":"0 0 16px rgba(255,45,160,0.10)","--shadow-lg":"0 0 28px rgba(255,45,160,0.16)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  ebc: {
    name: "EBC Brand", icon: "🦅", label: "EBC Brand",
    vars: {
      "--bg":"#0f1a24","--bg2":"#152332","--bg3":"#1b2d3f","--bg4":"#1e2d3b",
      "--border":"#263d52","--border2":"#345068",
      "--amber":"#ff7f21","--amber2":"#ff9642","--amber-dim":"rgba(255,127,33,0.10)","--amber-glow":"rgba(255,127,33,0.22)",
      "--accent":"var(--amber)",
      "--blue":"#3b82f6","--blue-dim":"rgba(59,130,246,0.10)",
      "--green":"#10b981","--green-dim":"rgba(16,185,129,0.10)",
      "--red":"#ef4444","--red-dim":"rgba(239,68,68,0.10)",
      "--yellow":"#eab308",
      "--purple":"#8b5cf6","--purple-dim":"rgba(139,92,246,0.10)","--cyan":"#22d3ee","--cyan-dim":"rgba(34,211,238,0.10)",
      "--text":"#e8ecf2","--text2":"#8fa4ba","--text3":"#4d6478",
      "--bg2-rgb":"21,35,50",
      "--glass-border":"rgba(255,255,255,0.06)","--glass-bg":"rgba(21,35,50,0.78)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'SF Mono', 'IBM Plex Mono', monospace",
      
      "--shadow":"0 2px 12px rgba(0,0,0,0.3)","--card-shadow":"0 2px 10px rgba(0,0,0,0.2)",
      "--shadow-sm":"0 1px 4px rgba(0,0,0,0.14)","--shadow-md":"0 2px 12px rgba(0,0,0,0.30)","--shadow-lg":"0 4px 32px rgba(0,0,0,0.45)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  midnight: {
    name: "Midnight", icon: "🌙", label: "Midnight (Apple Dark)",
    vars: {
      "--bg":"#000000","--bg2":"#1c1c1e","--bg3":"#2c2c2e","--bg4":"#3a3a3c",
      "--border":"#38383a","--border2":"#48484a",
      "--amber":"#ff9f0a","--amber2":"#ffb340","--amber-dim":"rgba(255,159,10,0.10)","--amber-glow":"rgba(255,159,10,0.16)",
      "--accent":"var(--amber)",
      "--blue":"#0a84ff","--blue-dim":"rgba(10,132,255,0.10)",
      "--green":"#30d158","--green-dim":"rgba(48,209,88,0.10)",
      "--red":"#ff453a","--red-dim":"rgba(255,69,58,0.10)",
      "--yellow":"#ffd60a",
      "--purple":"#a78bfa","--purple-dim":"rgba(167,139,250,0.10)","--cyan":"#22d3ee","--cyan-dim":"rgba(34,211,238,0.10)",
      "--text":"#f5f5f7","--text2":"#98989d","--text3":"#636366",
      "--bg2-rgb":"28,28,30",
      "--glass-border":"rgba(255,255,255,0.08)","--glass-bg":"rgba(28,28,30,0.82)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'SF Mono', 'Menlo', monospace",
      
      "--shadow":"0 2px 10px rgba(0,0,0,0.4)","--card-shadow":"0 1px 8px rgba(0,0,0,0.3)",
      "--shadow-sm":"0 1px 4px rgba(0,0,0,0.20)","--shadow-md":"0 2px 10px rgba(0,0,0,0.35)","--shadow-lg":"0 4px 24px rgba(0,0,0,0.50)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
  cyberpunk: {
    name: "Cyberpunk", icon: "🏙️", label: "Tokyo Cyberpunk",
    vars: {
      "--bg":"#0a0a12","--bg2":"#0e1020","--bg3":"#141830","--bg4":"#1a2040",
      "--border":"#1e2850","--border2":"#2a3870",
      "--amber":"#00f0ff","--amber2":"#40f8ff","--amber-dim":"rgba(0,240,255,0.08)","--amber-glow":"rgba(0,240,255,0.25)",
      "--accent":"var(--amber)",
      "--blue":"#0088ff","--blue-dim":"rgba(0,136,255,0.10)",
      "--green":"#00ff88","--green-dim":"rgba(0,255,136,0.10)",
      "--red":"#ff0055","--red-dim":"rgba(255,0,85,0.12)",
      "--yellow":"#ffe100","--purple":"#c084fc","--purple-dim":"rgba(192,132,252,0.10)","--cyan":"#22d3ee","--cyan-dim":"rgba(34,211,238,0.10)",
      "--text":"#e0f0ff","--text2":"#7090b8","--text3":"#384868",
      "--bg2-rgb":"14,16,32",
      "--glass-border":"rgba(0,240,255,0.10)","--glass-bg":"rgba(10,10,18,0.80)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      
      "--shadow":"0 0 20px rgba(0,240,255,0.06)","--card-shadow":"0 0 12px rgba(0,240,255,0.05)",
      "--shadow-sm":"0 0 6px rgba(0,240,255,0.05)","--shadow-md":"0 0 14px rgba(0,240,255,0.08)","--shadow-lg":"0 0 24px rgba(0,240,255,0.14)",
      "--status-approved":"var(--green)","--status-pending":"var(--amber)","--status-denied":"var(--red)","--status-in-transit":"var(--blue)","--status-project":"var(--text2)","--status-office":"var(--text3)",
      "--phase-active":"var(--green)","--phase-estimating":"var(--amber)","--phase-pre-construction":"var(--blue)","--phase-completed":"var(--text3)","--phase-warranty":"var(--yellow)","--phase-in-progress":"var(--green)",
    }
  },
};

// ── ASSEMBLIES (expanded with ACT, insulation, specialties) ──
// matRate = material cost per unit, labRate = labor cost per unit
// Prices updated from EBC price book (2022-2026 supplier quotes)
export const ASSEMBLIES = [
  // ── WALLS ──
  {code:"A2",cat:"Walls",name:'3-5/8" 20ga Freestanding Wall',unit:"LF",p8:44.02,p10:54.95,p14:82.38,p20:128.89,matRate:14.02,labRate:40.93,verified:true},
  {code:"A3",cat:"Walls",name:'2-1/2" 20ga Partition',unit:"LF",p8:42.18,p10:52.66,p14:78.94,p20:123.50,matRate:12.73,labRate:39.93,verified:true},
  {code:"A4",cat:"Walls",name:'8" 20ga Partition',unit:"LF",p8:53.66,p10:66.79,p14:99.72,p20:155.42,matRate:20.36,labRate:46.43,verified:true},
  {code:"B1",cat:"Walls",name:'6" 20ga Freestanding Wall',unit:"LF",p8:49.27,p10:61.33,p14:91.68,p20:143.09,matRate:16.03,labRate:45.30,verified:true},
  {code:"DW1",cat:"Walls",name:'6" Deck Wall 20ga',unit:"LF",p8:49.27,p10:61.33,p14:91.68,p20:143.09,matRate:16.03,labRate:45.30,verified:true},
  {code:"DW2",cat:"Walls",name:'6" Deck Wall 16ga (Heavy)',unit:"LF",p8:54.89,p10:68.31,p14:102.00,p20:159.04,matRate:19.51,labRate:48.80,verified:true},
  {code:"C2",cat:"Walls",name:"C2 Furring (One Side)",unit:"LF",p8:20.62,p10:25.42,p14:38.06,p20:59.61,matRate:7.82,labRate:17.60,verified:true},
  // ── CEILINGS / SOFFITS ──
  {code:"FD1",cat:"Ceilings",name:"Furr-Down / Soffit",unit:"LF",special:"33% progress rate",matRate:12.50,labRate:36.00,verified:true},
  {code:"GC1",cat:"Ceilings",name:"GWB Suspended Ceiling",unit:"SF",special:"25% progress rate",matRate:2.20,labRate:5.15,verified:true},
  {code:"ACT1",cat:"Ceilings",name:"2x2 ACT Grid + Tile (Std)",unit:"SF",p8:null,p10:7.27,p14:null,p20:null,matRate:3.02,labRate:4.25,verified:true},
  {code:"ACT2",cat:"Ceilings",name:"2x4 ACT Grid + Tile (Std)",unit:"SF",p8:null,p10:6.72,p14:null,p20:null,matRate:2.82,labRate:3.90,verified:true},
  // ── INSULATION ──
  {code:"INS1",cat:"Insulation",name:'R-13 Batt Insulation (3-5/8")',unit:"SF",p8:null,p10:1.25,p14:null,p20:null,matRate:0.45,labRate:0.80,verified:true},
  {code:"INS2",cat:"Insulation",name:'R-19 Batt Insulation (6")',unit:"SF",p8:null,p10:1.39,p14:null,p20:null,matRate:0.49,labRate:0.90,verified:true},
  {code:"INS3",cat:"Insulation",name:'R-21 Batt Insulation (6")',unit:"SF",p8:null,p10:1.59,p14:null,p20:null,matRate:0.69,labRate:0.90,verified:true},
  {code:"INS4",cat:"Insulation",name:'3" Mineral Wool',unit:"SF",p8:null,p10:2.35,p14:null,p20:null,matRate:0.85,labRate:1.50,verified:true},
  // ── SPECIALTIES ──
  {code:"FP1",cat:"Specialties",name:"Spray Fireproofing (Beam/Col)",unit:"SF",p8:null,p10:4.50,p14:null,p20:null,matRate:2.10,labRate:2.40,verified:false},
  {code:"FRP1",cat:"Specialties",name:"FRP Wall Panel (Glue-Up)",unit:"SF",p8:null,p10:6.20,p14:null,p20:null,matRate:3.50,labRate:2.70,verified:false},
  {code:"LL1",cat:"Specialties",name:'Lead-Lined GWB (1/32" Pb)',unit:"SF",p8:null,p10:10.71,p14:null,p20:null,matRate:4.21,labRate:6.50,verified:true},
  {code:"ICRA1",cat:"Specialties",name:"ICRA Dust Barrier (Temp)",unit:"LF",p8:null,p10:22.00,p14:null,p20:null,matRate:8.00,labRate:14.00,verified:true},
  // ── SHAFT WALL ──
  {code:"SW1",cat:"Shaft Wall",name:"Shaft Wall System (1-hr)",unit:"LF",p8:null,p10:46.35,p14:null,p20:null,matRate:14.35,labRate:32.00,verified:true},
  // ── PROFIT ADD-ONS ──
  {code:"CB",cat:"Profit Add-Ons",name:"Corner Bead (Paper-Faced)",unit:"LF",p8:null,p10:2.05,p14:null,p20:null,matRate:0.85,labRate:1.20,verified:true},
  {code:"CJ",cat:"Profit Add-Ons",name:"Control Joint (Zinc)",unit:"EA",p8:null,p10:30.00,p14:null,p20:null,matRate:12.00,labRate:18.00,verified:true},
  {code:"FC",cat:"Profit Add-Ons",name:"Fire Caulking (Intumescent)",unit:"LF",p8:null,p10:6.00,p14:null,p20:null,matRate:2.50,labRate:3.50,verified:true},
  {code:"BLK",cat:"Profit Add-Ons",name:"Blocking Allowance",unit:"SF",p8:null,p10:4.30,p14:null,p20:null,matRate:1.50,labRate:2.80,verified:true},
  {code:"DF",cat:"Counts",name:"Door Frame (Metal Stud Header + Jambs)",unit:"EA",p8:null,p10:185.00,p14:null,p20:null,matRate:65.00,labRate:120.00,verified:true},
  {code:"SL",cat:"Counts",name:"Sidelight Framing",unit:"EA",p8:null,p10:145.00,p14:null,p20:null,matRate:45.00,labRate:100.00,verified:true},
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
  {id:214,name:"Forney - Spring Branch Presbyterian",gc:"Forney Construction",value:168700,due:"Apr 8, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Religious",risk:"",notes:"Demo $44.3K, Drywall/Build Back $61.6K, ACT $62.8K. Alt: +$31.2K FRP-1 & FRP-2. Armstrong Fine Fissured on 15/16 grid. Deck height 12' or less. Level 4 finish. 20 or 25 ga. framing. Phasing included.",contact:"",month:"Apr",closeOut:null,bidDate:"Apr 8, 2026",address:"1215 Campbell Rd, Houston, TX 77055"},
  {id:213,name:"Meridian - FMG",gc:"FMG",value:113600,due:"Apr 8, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Demo $15.8K, Drywall/Build Back $56.7K, ACT $41.1K. ACT assuming Fine Fissured on 15/16 grid. Deck height 14' or less. Level 4 finish. 20 or 25 ga. framing.",contact:"",month:"Apr",closeOut:null,bidDate:"Apr 8, 2026",address:"3 Riverway, Suite 1000, Houston, TX 77056"},
  {id:212,name:"Texas Mutual Insurance",gc:"Multiple GCs",value:104800,due:"Apr 6, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Bidding to multiple GCs. Demo $12.9K, Drywall/Build Back $72.2K, ACT $19.7K. ACT match existing Armstrong Ultima. Deck height 16' or less.",contact:"",month:"Apr",closeOut:null,bidDate:"Apr 6, 2026",address:"9811 Katy Fwy, Suite 800, Houston, TX 77024"},
  {id:211,name:"OSC - EQT Corp Budget",gc:"O'Donnell/Snider",value:425000,due:"Apr 6, 2026",status:"submitted",scope:["Metal Framing","Drywall","Tape & Finish","Insulation","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Drywall/Build Back. 3712 Autry Pk Dr Suite 200. Deck height 16' or less. Level 5 at wallcovering walls. Fire-rated blocking. Pricing good 30 days from bid date.",contact:"Jim Suh",month:"Apr",closeOut:null,bidDate:"Apr 6, 2026",address:"3712 Autry Pk Dr, Suite 200, Houston, TX 77019"},
  {id:101,name:"Endurance Builders - Woodside Laboratory",gc:"Endurance Builders",value:74800,due:"Mar 13, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Christina Zube Volkers",month:"Mar",closeOut:null,bidDate:"Mar 13, 2026"},
  {id:102,name:"WCC - Real Manage Suite 250",gc:"WCC",value:31200,due:"Mar 12, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Heidi Phillips",month:"Mar",closeOut:null,bidDate:"Mar 12, 2026"},
  {id:103,name:"United - Escapology San Antonio",gc:"United Constructors",value:193300,due:"Mar 16, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"Latest proposal 03/16/2026",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 16, 2026"},
  {id:104,name:"United - 801 Travis - Elevator Lobby Remodel",gc:"United",value:35100,due:"Mar 11, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:105,name:"Memorial Hermann - Fulshear SMR",gc:"Memorial Hermann",value:121000,due:"Mar 11, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"",contact:"Leigh Bartish",month:"Mar",closeOut:null,bidDate:"Mar 11, 2026"},
  {id:106,name:"FKC San Angelo",gc:"Bayshore",value:313400,due:"Mar 10, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Josh",month:"Mar",closeOut:null,bidDate:"Mar 10, 2026"},
  {id:107,name:"United - Aggieland Imaging - College Station - Outpatient MRI Facility",gc:"United",value:79600,due:"Mar 10, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware","Lead-Lined Walls"],phase:"Medical",risk:"",notes:"",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 10, 2026"},
  {id:108,name:"United - Ogle School Remodel",gc:"United",value:300200,due:"Mar 6, 2026",status:"submitted",scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Commercial",risk:"",notes:"",contact:"Mistie Williams",month:"Mar",closeOut:null,bidDate:"Mar 6, 2026"},
  {id:209,name:"MH Katy MP3 UTP OBGYN Level 4",gc:"Forney Construction",value:262000,due:"Mar 6, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"Memorial Hermann Katy MP3 — OBGYN Level 4",contact:"Monica Waller",month:"Mar",closeOut:null,bidDate:"Mar 6, 2026"},
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
  {id:160,name:"Brunello Cucinelli - Store Buildout",gc:"Brodson",value:308400,due:"Feb 20, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"Submitted to Brodson & Hirsch. 4444 Westheimer Rd F155, Houston TX 77027",contact:"Philippe Faucher",month:"Feb",closeOut:null,bidDate:"Feb 20, 2026"},
  {id:174,name:"ROD - Brunello Cucinelli Expansion (Landlord Work)",gc:"United Constructors",value:49900,due:"Jan 14, 2025",status:"awarded",scope:["Metal Framing","Drywall"],phase:"Retail",risk:"",notes:"ROD landlord work directly with United. 4444 Westheimer Rd, Houston TX 77027",contact:"Justin Gayford",month:"Jan",closeOut:null,bidDate:"Jan 14, 2025"},
  {id:163,name:"Forney - BSLMC Cath Labs 4 & 9",gc:"Forney Construction",value:104500,due:"Mar 5, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls","ACT Ceilings"],phase:"Medical",risk:"",notes:"Latest proposal 03/05/2026. Alts: +$3,100 + $4,800",contact:"Jennifer Averitt",month:"Mar",closeOut:null,bidDate:"Mar 5, 2026"},
  {id:164,name:"UTMB M87 PCP Cancer Services Clinic",gc:"York Construction",value:525400,due:"Jan 9, 2025",status:"submitted",scope:["Demo","Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"Galveston, TX",contact:"Yarelys Hernandez",month:"Jan",closeOut:null,bidDate:"Jan 9, 2025"},
  {id:165,name:"Potbellys Sandwich Shop - Woodlands",gc:"Warwick Construction",value:39700,due:"Jan 7, 2026",status:"submitted",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Retail",risk:"",notes:"The Woodlands, TX",contact:"Kendrick Quintanilla",month:"Jan",closeOut:null,bidDate:"Jan 7, 2026"},
  {id:168,name:"United - Heart Care Clinic - NW Houston",gc:"United Constructors",value:73900,due:"Jan 5, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],phase:"Medical",risk:"",notes:"COMPLETE",contact:"Steve Williams",month:"Jan",closeOut:null,bidDate:"Jan 5, 2026"},
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
  {id:208,name:"PPER - Missouri City",gc:"WC Construction",value:22800,due:"Jan 22, 2026",status:"awarded",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Sound Insulation","Tape & Finish","Doors & Hardware","Densglass Sheathing"],phase:"Commercial",risk:"",notes:"Base: Drywall $17,600 + ACT $5,200. Alts: +$26,600 fluted cement board, +$8,200 demo flooring. 16ga metal stud framing repair, Type X L4 finish, 1/2\" Densglass sheathing, batt insulation, fire-rated wood blocking. Deck ≤24'.",contact:"Alejandra Ibarra",month:"Jan",closeOut:null,bidDate:"Jan 22, 2026"},
];

// ── SEED: PROJECTS ──
// Real project data extracted from Google Docs proposals
export const PM_NAMES = { 3: "Emmanuel Aguilar", 4: "Isai Aguilar", 8: "Abner Aguilar" };
const _demoProjects = [
  {id:1,name:"Endurance - Woodside Laboratory",gc:"Endurance Builders",contract:74800,status:"in-progress",phase:"Commercial",address:"4200 San Jacinto St, Houston, TX 77004",suite:"",parking:"",lat:29.7224,lng:-95.3785,pm:"Abner Aguilar",laborHours:1200,progress:0,start:"2026-03-30",end:"2026-08-21",teamSize:5,scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],siteContact:"Mason Williams",siteContactPhone:"713-899-6142",gateCode:"4200#",accessInstructions:"Enter from San Jacinto St. Staging area at east loading dock. Badge required after 7 AM.",deliveryEntrance:"East loading dock off San Jacinto"},
  {id:2,name:"WCC - CB&I CEO/Lvl 2/Lvl 7",gc:"WC Construction",contract:59800,status:"in-progress",phase:"Commercial",address:"1725 Hughes Landing Blvd, The Woodlands, TX 77380",suite:"CEO Office / Level 2 / Level 7",parking:"",lat:30.1658,lng:-95.4613,pm:"Abner Aguilar",laborHours:900,progress:5,start:"2026-03-20",end:"2026-06-15",teamSize:4,scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish"],siteContact:"Adam Teeter",siteContactPhone:"832-570-3670",gateCode:"",accessInstructions:"Hughes Landing Blvd main entrance. Check in at lobby security desk."},
  {id:3,name:"Forney - BSLMC Cath Labs 4 & 9",gc:"Forney Construction",contract:104500,status:"on-hold",phase:"Medical",address:"6720 Bertner Ave, Houston, TX 77030",suite:"Cath Labs 4 & 9",parking:"",lat:29.7066,lng:-95.3966,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-05-01",end:"2026-09-30",scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls","ACT Ceilings"],siteContact:"Jason McIntyre",siteContactPhone:"713-410-9824",gateCode:"",accessInstructions:"Bertner Ave entrance. TMC campus — hospital badge required. Cath Lab access restricted to off-hours."},
  {id:16,name:"ROD - Brunello Cucinelli Expansion (Landlord Work)",gc:"United Constructors",contract:49900,status:"in-progress",phase:"Retail",address:"4444 Westheimer Rd, Houston, TX 77027",suite:"",parking:"",lat:29.7376,lng:-95.4328,pm:"Abner Aguilar",laborHours:400,progress:20,start:"2026-03-01",end:"2026-05-30",teamSize:3,scope:["Metal Framing","Drywall"],siteContact:"Justin Gayford",siteContactPhone:"",gateCode:"",accessInstructions:"River Oaks District — Westheimer Rd entrance. Coordinate with ROD security for after-hours access."},
  {id:5,name:"Texas Heart Center - Baytown",gc:"Bayshore",contract:54200,laborCost:25000,materialCost:16800,status:"in-progress",phase:"Medical",address:"1602 W Baker Rd, Baytown, TX 77521",suite:"",parking:"",lat:29.7633,lng:-94.9774,pm:"Abner Aguilar",laborHours:800,progress:40,start:"2026-02-24",end:"2026-06-20",teamSize:4,scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Lead-Lined Walls","Doors & Hardware"],siteContact:"Josh",siteContactPhone:"",gateCode:"",accessInstructions:"W Baker Rd entrance. Active hospital — follow infection control protocols."},
  {id:6,name:"MH Woodlands RAD Equipment Replacement",gc:"Forney Construction",contract:10500,laborCost:5200,materialCost:3800,status:"in-progress",phase:"Medical",address:"9250 Pinecroft Dr, The Woodlands, TX 77380",suite:"",parking:"",lat:30.1620,lng:-95.4710,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-03-10",end:"2026-04-25",teamSize:2,scope:["Demo","Metal Framing","Drywall","ACT Ceilings"],siteContact:"Natalie Pettis",siteContactPhone:"832-274-2512",gateCode:"",accessInstructions:"Pinecroft Dr main entrance. MH campus — check in at admin desk."},
  {id:7,name:"MH MC Single Plane IR",gc:"O'Donnell/Snider",contract:33000,laborCost:19800,materialCost:5800,status:"in-progress",phase:"Medical",address:"921 Gessner Rd, Houston, TX 77024",suite:"",parking:"",lat:29.7730,lng:-95.5560,pm:"Abner Aguilar",laborHours:480,progress:25,start:"2026-03-03",end:"2026-05-20",teamSize:3,scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"],siteContact:"Kim Bullard",siteContactPhone:"713-554-4614",gateCode:"",accessInstructions:"Gessner Rd entrance. Billing via Procore, due 20th of month."},
  {id:8,name:"MH MC Neuro IR",gc:"O'Donnell/Snider",contract:34000,status:"in-progress",phase:"Medical",address:"921 Gessner Rd, Houston, TX 77024",suite:"",parking:"",lat:29.7730,lng:-95.5560,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-03-10",end:"2026-05-25",teamSize:3,scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"],siteContact:"Ethan Alvarez",siteContactPhone:"",gateCode:"",accessInstructions:"Same campus as Single Plane IR — Gessner Rd entrance. Coordinate scheduling with Kim Bullard."},
  {id:9,name:"MH League City CCC CT",gc:"Forney Construction",contract:14900,laborCost:6500,materialCost:5200,status:"in-progress",phase:"Medical",address:"2555 S Shore Blvd, League City, TX 77573",suite:"",parking:"",lat:29.5580,lng:-95.0690,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-03-15",end:"2026-05-10",teamSize:2,scope:["Demo","Metal Framing","Drywall","Lead-Lined Walls"],siteContact:"Jason McIntyre",siteContactPhone:"713-410-9824",gateCode:"",accessInstructions:"S Shore Blvd main entrance. Active clinic — patient areas restricted during business hours."},
  {id:10,name:"MH Pearland MEIC-CT",gc:"Forney Construction",contract:10500,status:"in-progress",phase:"Medical",address:"16100 South Fwy, Pearland, TX 77584",suite:"",parking:"",lat:29.5635,lng:-95.2860,pm:"Abner Aguilar",laborHours:0,progress:0,start:"2026-03-01",end:"2026-04-30",teamSize:2,scope:["Demo","Drywall","ACT Ceilings","Tape & Finish","Lead-Lined Walls"],siteContact:"Mariana Fumero",siteContactPhone:"713-628-3445",gateCode:"",accessInstructions:"South Fwy entrance. Same campus as L4 Renovation — coordinate with Harvey Cleary if overlap."},
  {id:11,name:"Our Lady of Guadalupe Restroom",gc:"Forney Construction",contract:34700,status:"in-progress",phase:"Commercial",address:"2405 Navigation Blvd, Houston, TX 77003",suite:"",parking:"",lat:29.7560,lng:-95.3500,pm:"Abner Aguilar",laborHours:520,progress:50,start:"2026-02-17",end:"2026-05-15",teamSize:3,scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],siteContact:"Jose Perez",siteContactPhone:"832-605-7437",gateCode:"",accessInstructions:"Navigation Blvd entrance. Church property — respect service hours. Work area in parish hall annex.",phases:[{key:"layout",name:"Layout",status:"completed",startDate:"2026-02-17",completedDate:"2026-02-18",assignedForeman:"Antonio Hernandez",notes:""},{key:"framing",name:"Framing",status:"completed",startDate:"2026-02-19",completedDate:"2026-02-28",assignedForeman:"Antonio Hernandez",notes:"Restroom partition framing complete."},{key:"drywall",name:"Drywall",status:"completed",startDate:"2026-03-01",completedDate:"2026-03-10",assignedForeman:"Antonio Hernandez",notes:"Board hung. Water-resistant in wet areas."},{key:"finish",name:"Finish",status:"in progress",startDate:"2026-03-11",completedDate:"",assignedForeman:"Antonio Hernandez",notes:"First coat mud applied. Taping underway."},{key:"touchup1",name:"Touch Up Pt 1",status:"not started",startDate:"",completedDate:"",assignedForeman:"",notes:""},{key:"finalTouchUp",name:"Final Touch Up",status:"not started",startDate:"",completedDate:"",assignedForeman:"",notes:""}]},
  {id:12,name:"Arch-Con - Sprouts Farmers Market",gc:"Arch-Con",contract:215100,laborCost:68000,materialCost:62000,status:"in-progress",phase:"Retail",address:"4775 W Panther Creek Dr, The Woodlands, TX 77381",suite:"",parking:"",lat:30.1740,lng:-95.4950,pm:"Abner Aguilar",laborHours:1800,progress:15,start:"2026-03-01",end:"2026-08-30",teamSize:5,scope:["Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],siteContact:"Jon Windham",siteContactPhone:"",gateCode:"",accessInstructions:"W Panther Creek Dr entrance. Retail shell — open access during construction phase."},
  {id:13,name:"MHMC Cancer Center CT",gc:"Forney Construction",contract:20900,status:"in-progress",phase:"Medical",address:"925 Gessner Rd, Houston, TX 77024",suite:"",parking:"",lat:29.7728,lng:-95.5560,pm:"Abner Aguilar",laborHours:0,progress:95,start:"2026-01-06",end:"2026-03-28",teamSize:2,scope:["Demo","Metal Framing","Drywall","ACT Ceilings"],siteContact:"Jennifer Averitt",siteContactPhone:"",gateCode:"",accessInstructions:"Gessner Rd entrance. CO #1 approved 3/17 — laser cabinet mod."},
  {id:14,name:"Heart Care Clinic - NW Houston",gc:"United Constructors",contract:73900,status:"completed",phase:"Medical",address:"13325 Hargrave Rd, Houston, TX 77070",suite:"",parking:"",lat:29.9570,lng:-95.5730,pm:"Abner Aguilar",laborHours:0,progress:100,start:"2025-10-01",end:"2026-02-28",scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],siteContact:"Steve Williams",siteContactPhone:"713-579-9738",gateCode:"",accessInstructions:"Hargrave Rd entrance. Project complete — CO #2 approved 3/12."},
  {id:15,name:"MH Pearland L4 Renovation",gc:"Harvey Cleary",contract:83700,status:"in-progress",phase:"Medical",address:"16100 South Fwy, Pearland, TX 77584",suite:"Level 4",parking:"",lat:29.5635,lng:-95.2860,pm:"Abner Aguilar",laborHours:0,progress:95,start:"2025-12-01",end:"2026-04-15",teamSize:4,scope:["Metal Framing","Drywall"],siteContact:"Brandon Farrell",siteContactPhone:"832-471-9965",gateCode:"",accessInstructions:"South Fwy entrance. Level 4 — elevator access required. Coordinate with Kristen Gallegos for scheduling."},
  {id:17,name:"Escapology - Sugar Land",gc:"United Constructors",contract:116800,laborCost:70000,materialCost:19500,status:"in-progress",phase:"Commercial",address:"Sugar Land, TX 77479",suite:"",parking:"",lat:29.6196,lng:-95.6349,pm:"Abner Aguilar",laborHours:1400,progress:85,start:"2025-11-01",end:"2026-04-30",teamSize:4,scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Tape & Finish","Doors & Hardware"],siteContact:"Steve Williams",siteContactPhone:"713-579-9738",gateCode:"",accessInstructions:"Sugar Land retail center. Construction entrance at rear of building."},
  {id:18,name:"Spring Cypress Oral Surgeons",gc:"Wier CC",contract:155100,status:"in-progress",phase:"Medical",address:"Tomball, TX 77375",suite:"",parking:"",lat:30.0974,lng:-95.6164,pm:"Abner Aguilar",laborHours:1800,progress:0,start:"2025-03-01",end:"2026-06-30",teamSize:4,scope:["Metal Framing","Drywall","Tape & Finish","Doors & Hardware"],siteContact:"Preston Cheney",siteContactPhone:"",gateCode:"",accessInstructions:"Tomball area. Window opening CO + overhead blocking CO pending."},
  {id:19,name:"PPER - Missouri City",gc:"WC Construction",contract:22800,status:"in-progress",phase:"Commercial",address:"Missouri City, TX 77489",suite:"",parking:"",lat:29.6188,lng:-95.5371,pm:"Abner Aguilar",laborHours:480,progress:65,start:"2026-01-27",end:"2026-04-30",teamSize:3,scope:["Demo","Metal Framing","Drywall","ACT Ceilings","Sound Insulation","Tape & Finish","Doors & Hardware","Densglass Sheathing"],siteContact:"Bo Ruiz",siteContactPhone:"",gateCode:"",accessInstructions:"Missouri City. Super: Bo Ruiz. AP/billing: Alejandra Ibarra (281-801-0076 ext 221)."},
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
  {id:41,name:"Alejandra Ibarra",company:"WC Construction",role:"Office Manager / AP",bids:0,wins:1,color:"#10b981",last:"Mar 19",priority:"high",phone:"281-801-0076 ext 221",email:"aibarra@wcconstructioncompany.com",notes:"PPER Missouri City AP/billing contact. Invoice #4 flagged 3/19/2026 — lien waiver typo, correct amount $13,464.00. Status: Revise & Resubmit in Procore."},
  {id:42,name:"Jeremy Price",company:"WC Construction",role:"Project Manager",bids:0,wins:1,color:"#10b981",last:"Mar 6",priority:"med",phone:"",email:"",notes:"PPER Missouri City PM. Requested thin-cut stone pricing for columns per architect 3/6/2026."},
  {id:43,name:"Bo Ruiz",company:"WC Construction",role:"Superintendent",bids:0,wins:1,color:"#10b981",last:"Mar 5",priority:"med",phone:"",email:"",notes:"PPER Missouri City superintendent. 2 overdue punch list items as of 3/5/2026."},
  // Forney Construction
  {id:7,name:"Jason McIntyre",company:"Forney Construction",role:"Project Manager",bids:0,wins:0,color:"#f59e0b",last:"Mar 2",priority:"high",phone:"713-410-9824",email:"jason.mcintyre@forneyconstruction.com",notes:"PM on League City CCC CT, Pearland MEIC-CT, Woodlands RAD."},
  {id:8,name:"Natalie Pettis",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Mar 2",priority:"med",phone:"832-274-2512",email:"natalie.pettis@forneyconstruction.com",notes:"MHTW RAD APM. Also IAH RAC."},
  {id:9,name:"Jennifer Averitt",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Mar 17",priority:"med",phone:"",email:"jennifer.averitt@forneyconstruction.com",notes:"MH MC Cancer Center CT. CO #1 sent 3/17."},
  {id:10,name:"Jose Perez",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Mar 13",priority:"med",phone:"832-605-7437",email:"jose.perez@forneyconstruction.com",notes:"Our Lady of Guadalupe PM."},
  {id:11,name:"Monica Waller",company:"Forney Construction",role:"Project Coordinator",bids:0,wins:0,color:"#f59e0b",last:"Mar 4",priority:"med",phone:"713-367-3501",email:"monica.waller@forneyconstruction.com",notes:"Subcontracts, COI coordination."},
  {id:12,name:"Mariana Fumero",company:"Forney Construction",role:"Asst. PM",bids:0,wins:0,color:"#f59e0b",last:"Feb 23",priority:"med",phone:"713-628-3445",email:"mariana.fumero@forneyconstruction.com",notes:"MH Pearland MEIC-CT. COI requested."},
  // O'Donnell/Snider
  {id:13,name:"Kim Bullard",company:"O'Donnell/Snider",role:"Sr. Project Coordinator",bids:0,wins:0,color: "var(--purple)",last:"Mar 16",priority:"med",phone:"713-554-4614",email:"kbullard@odonnellsnider.com",notes:"MH MC Hospital Single Plane IR NTP. Billing via Procore, due 20th."},
  {id:14,name:"Ethan Alvarez",company:"O'Donnell/Snider",role:"Project Manager",bids:0,wins:0,color: "var(--purple)",last:"Mar 16",priority:"med",phone:"",email:"",notes:"PM on MH MC Hospital Single Plane IR & Neuro IR."},
  {id:15,name:"Jim Suh",company:"O'Donnell/Snider",role:"Estimator",bids:0,wins:0,color: "var(--purple)",last:"Apr 6",priority:"high",phone:"281-404-7673",email:"jsuh@odonnellsnider.com",notes:"EQT Corp Budget, A5 Steakhouse, Kannon, HM Katy Emergency Care Center. Very active — multiple ITBs in March/April 2026."},
  // United Constructors
  {id:15,name:"Justin Gayford",company:"United Constructors",role:"Project Manager",bids:0,wins:0,color:"#ef4444",last:"Mar 11",priority:"high",phone:"",email:"justin@unitedconstructors.com",notes:"Brunello Cucinelli PM. Active schedule coordination."},
  {id:16,name:"Steve Williams",company:"United Constructors",role:"VP Interior Construction",bids:0,wins:0,color:"#ef4444",last:"Mar 12",priority:"high",phone:"713-579-9738",email:"swilliams@unitedconstructors.com",notes:"Heart Care Clinic. CO #2 approved 3/12. Escapology Sugar Land PM."},
  {id:17,name:"Mistie Williams",company:"United Constructors",role:"Project Coordinator",bids:0,wins:0,color:"#ef4444",last:"Mar 2",priority:"med",phone:"713-579-9742",email:"mwilliams@unitedconstructors.com",notes:"Subcontracts and COs. Dotson, Escapology, Heart Care."},
  // Harvey Cleary
  {id:18,name:"Kristen Gallegos",company:"Harvey Cleary",role:"Senior PM",bids:0,wins:0,color: "var(--cyan)",last:"Jan 29",priority:"med",phone:"713-783-8710",email:"kgallegos@harveycleary.com",notes:"MH Pearland L4 Renovation. AD System submittal approved 1/29."},
  {id:44,name:"Brandon Farrell",company:"Harvey Cleary",role:"Superintendent",bids:0,wins:0,color: "var(--cyan)",last:"",priority:"med",phone:"832-471-9965",email:"BFarrell@harveycleary.com",notes:"MH Pearland L4 Renovation superintendent."},
  // Bayshore
  {id:19,name:"Josh",company:"Bayshore",role:"",bids:0,wins:0,color:"#a855f7",last:"Mar 19",priority:"med",phone:"",email:"josh@bayshoretex.com",notes:"THC Baytown. CO for ticket work sent 3/19."},
  // Wier CC
  {id:20,name:"Preston Cheney",company:"Wier CC",role:"Assistant Project Manager",bids:0,wins:0,color:"#64748b",last:"Feb 20",priority:"med",phone:"",email:"pcheney@wiercc.com",notes:"Spring Cypress Oral Surgeons. Window opening CO, overhead blocking CO."},
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
  {id:32,name:"Philippe Faucher",company:"Brodson Construction",role:"Senior PM",bids:1,wins:0,color: "var(--cyan)",last:"Mar 9",priority:"high",phone:"",email:"pfaucher@brodsonconstruction.com",notes:"Brunello Cucinelli Store Buildout - River Oaks District."},
  // Hirsch Construction
  {id:33,name:"Angelica Baez",company:"Hirsch Construction",role:"",bids:1,wins:0,color:"#fb923c",last:"Nov 19",priority:"med",phone:"",email:"abaez@hirschcorp.com",notes:"Hermes Houston Temp Store. Also Princess Polly."},
  // Garrison Construction
  {id:34,name:"Melanie Itzel",company:"Garrison Construction",role:"Senior Project Coordinator",bids:1,wins:0,color:"#a3e635",last:"Feb 16",priority:"med",phone:"",email:"melanie@garrisonconstructiongroup.com",notes:"Montgomery Roth Office Suite 7029."},
  // York Construction
  {id:35,name:"Yarelys Hernandez",company:"York Construction",role:"",bids:1,wins:0,color: "var(--cyan)",last:"Jan 9",priority:"med",phone:"",email:"yhernandez@yorkconstruction.com",notes:"UTMB M87 PCP Cancer Services Clinic. Galveston."},
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
  // LW Supply
  {id:45,name:"Dalila Esparza",company:"LW Supply",role:"",bids:0,wins:0,color:"#94a3b8",last:"Dec 4",priority:"med",phone:"",email:"Dalila.Esparza@lwsupply.com",notes:"PPER Missouri City — resubmitted XB1 Alternate through LW Supply 12/4/2025."},
  // Heitkamp Swift Architects
  {id:46,name:"Lisa Herring",company:"Heitkamp Swift Architects",role:"",bids:0,wins:0,color:"#94a3b8",last:"",priority:"med",phone:"",email:"lisa.herring@heitkampswift.com",notes:""},
];

// ── SEED: CALL LOG ──
const _demoCallLog = [];

// ── SEED: INVOICES ──
const _demoInvoices = [
  {id:301,projectId:19,number:"0004",date:"2026-03-10",amount:13464,status:"pending",desc:"Invoice #4 — PPER Missouri City. REVISION REQUIRED: Lien waiver typo — corrected amount is $13,464.00. Flagged by Alejandra Ibarra 3/19/2026. Status: Revise & Resubmit in Procore.",paidDate:null},
];

// ── SEED: T&M TICKETS ──
// Time & Material tracking — separate from original project contract
const _demoTmTickets = [
  {id:"tm1",projectId:1,ticketNumber:"TM-001",date:"2026-04-01",status:"submitted",changeOrderId:null,description:"Containment wall build-out — GC-directed unforeseen asbestos abatement barrier at Main Lab east wall. Not in original scope.",notes:"Mason Williams (Endurance Super) verbally directed. Documented immediately.",photos:[],laborEntries:[{id:"tl1",employeeName:"Oscar Alvarez",hours:4,rate:65,description:"Layout + framing containment wall"},{id:"tl2",employeeName:"Ricardo Mendez",hours:4,rate:55,description:"Hang poly + board containment"}],materialEntries:[{id:"tm1m1",item:"3-5/8\" Metal Studs 25ga",qty:20,unit:"EA",unitCost:8.50,markup:10},{id:"tm1m2",item:"5/8\" Type X Drywall",qty:10,unit:"SHT",unitCost:14.25,markup:10},{id:"tm1m3",item:"6-mil Poly Sheeting",qty:2,unit:"ROLL",unitCost:42,markup:10}],submittedDate:"2026-04-01",approvedDate:null,billedDate:null,auditTrail:[{action:"created",actor:"Oscar Alvarez",at:"2026-04-01T09:15:00Z"},{action:"submitted",actor:"Oscar Alvarez",at:"2026-04-01T15:30:00Z"}]},
  {id:"tm2",projectId:1,ticketNumber:"TM-002",date:"2026-04-02",status:"draft",changeOrderId:null,description:"Demo existing CMU partition at Storage/Mechanical — not in original scope. GC confirmed demo required for new MEP routing.",notes:"Verbal direction from Mason Williams.",photos:[],laborEntries:[{id:"tl3",employeeName:"Oscar Alvarez",hours:6,rate:65,description:"CMU demo + haul-off prep"}],materialEntries:[{id:"tm2m1",item:"Debris Haul-Off",qty:1,unit:"LOAD",unitCost:350,markup:0}],submittedDate:null,approvedDate:null,billedDate:null,auditTrail:[{action:"created",actor:"Oscar Alvarez",at:"2026-04-02T10:00:00Z"}]},
];

// ── SEED: CHANGE ORDERS ──
const _demoChangeOrders = [
  {id:1,projectId:13,number:"CO-001",desc:"MHMC Cancer Center — Laser cabinet modification (rework due to GE equipment move)",amount:800,status:"approved",submitted:"2026-03-17",approved:"2026-03-17"},
  {id:2,projectId:14,number:"CO-001",desc:"Heart Care Clinic — Equipment removal & delivery ($3,200) + credit for unused lead lined rock (-$7,500)",amount:-4300,status:"approved",submitted:"2026-03-11",approved:"2026-03-12"},
  {id:3,projectId:9,number:"CO-001",desc:"MH League City CCC CT — Control arm removal",amount:800,status:"submitted",submitted:"2026-03-12",approved:null,contact:"Juan Hinojosa (Forney)"},
  {id:4,projectId:1,number:"CO-001",desc:"Endurance Woodside — Containment wall build-out (asbestos abatement barrier)",amount:0,status:"draft",submitted:null,approved:null,tmTicketIds:["tm1"]},
];

// ── SEED: RFIs ──
const _demoRfis = [
  {id:401,projectId:19,number:"RFI-001",subject:"Thin-cut stone pricing for columns per architect",status:"open",submitted:"2026-03-06",assigned:"Jeremy Price"},
  // Endurance - Woodside Laboratory (projectId: 1) — seed RFIs for PM audit
  {id:402,projectId:1,number:"RFI-001",subject:"Ceiling grid layout at corridor intersection — confirm centerline vs offset",status:"open",submitted:"2026-03-28",assigned:"Mason Williams",priority:"high",specRef:"09 51 13",costImpact:"Possible add if offset grid required",scheduleImpact:"2 day delay if redesign needed",question:"At the corridor intersection near Grid B/3, the reflected ceiling plan shows a centerline grid but the partition layout suggests an offset alignment. Please confirm which layout takes priority.",area:"Corridor A",daysOut:8},
  {id:403,projectId:1,number:"RFI-002",subject:"Framing height at Control Room — confirm top-of-wall vs deck",status:"Answered",submitted:"2026-03-25",assigned:"Mason Williams",priority:"medium",specRef:"05 40 00",response:"Frame to deck. Refer to detail 4/A3.2. Full height framing with deflection track at top.",responseDate:"2026-03-27",question:"Control Room wall section shows 10'-0\" AFF but structural deck is at 12'-6\". Confirm if framing terminates at 10' with cripple or runs full height to deck.",area:"Control Room",daysOut:0},
  {id:404,projectId:1,number:"RFI-003",subject:"ACT tile substitution — Armstrong 770 vs specified Ultima",status:"open",submitted:"2026-04-01",assigned:"Mason Williams",priority:"low",specRef:"09 51 00",costImpact:"$0.12/SF savings if approved",scheduleImpact:"None — lead times equal",question:"Armstrong Ultima HRC specified but 770 is available locally with same NRC/CAC ratings and shorter lead time. Request approval for substitution.",area:"Main Lab",daysOut:4},
  {id:405,projectId:1,number:"RFI-004",subject:"Fire-rated shaft wall assembly at elevator — UL reference needed",status:"open",submitted:"2026-04-03",assigned:"Mason Williams",priority:"critical",specRef:"09 21 16",costImpact:"Potential $2,400 add for upgraded assembly",scheduleImpact:"3 day delay if current assembly rejected",question:"Elevator shaft requires 2-hour fire rating. Current spec calls for standard CH assembly but code review suggests SA assembly may be required. Please provide UL design number or confirm CH is acceptable.",area:"Elevator Shaft",daysOut:2},
];

// ── SEED: SUBMITTALS ──
const _demoSubmittals = [
  // MH League City CCC CT (projectId: 9)
  {id:601,projectId:9,number:"09 21 16-1.0",description:"Gypsum Board",specSection:"09 21 16",type:"product data",status:"distributed",dateSubmitted:"2026-03-04",dateReturned:"2026-03-04",distributedBy:"Monica Waller (Forney)",notes:""},
  {id:602,projectId:9,number:"09 51 00-1.0",description:"Acoustical Ceilings",specSection:"09 51 00",type:"product data",status:"distributed",dateSubmitted:"2026-03-04",dateReturned:"2026-03-04",distributedBy:"Monica Waller (Forney)",notes:""},
  // MH Pearland MEIC-CT (projectId: 10)
  {id:603,projectId:10,number:"095113-1.0",description:"Acoustical Ceiling - Product Data",specSection:"09 51 13",type:"product data",status:"distributed",dateSubmitted:"2026-02-26",dateReturned:"2026-02-26",distributedBy:"Mariana Fumero (Forney)",notes:""},
  {id:604,projectId:10,number:"095113-2.0",description:"Acoustical Ceiling - Sample",specSection:"09 51 13",type:"sample",status:"distributed",dateSubmitted:"2026-02-26",dateReturned:"2026-02-26",distributedBy:"Mariana Fumero (Forney)",notes:""},
  // PPER - Missouri City (projectId: 19)
  {id:605,projectId:19,number:"0570000.0",description:"XB1 Alternate",specSection:"05 70 00",type:"product data",status:"approved",dateSubmitted:"2025-12-04",dateReturned:"2025-12-04",distributedBy:"Alejandra Ibarra (WC Construction)",notes:"Initially rejected 12/4/2025 (Alejandra Ibarra forwarded). Resubmitted through LW Supply (Dalila Esparza). Approved and distributed 12/4/2025."},
  {id:606,projectId:19,number:"0570000.1",description:"XB1 Alternate",specSection:"05 70 00",type:"product data",status:"distributed",dateSubmitted:"2025-12-04",dateReturned:"2025-12-04",distributedBy:"Alejandra Ibarra (WC Construction)",notes:""},
  {id:607,projectId:19,number:"057000-1.0",description:"XB1 Alternate 2",specSection:"05 70 00",type:"product data",status:"distributed",dateSubmitted:"2026-01-12",dateReturned:"2026-01-12",distributedBy:"Alejandra Ibarra (WC Construction)",notes:""},
  // Spring Cypress Oral Surgeons (projectId: 18)
  {id:608,projectId:18,number:"054000-1.0",description:"CFMF (Cold-Formed Metal Framing)",specSection:"05 40 00",type:"product data",status:"approved",dateSubmitted:"2025-10-30",dateReturned:"2025-10-30",distributedBy:"Preston Cheney (Wier CC)",notes:""},
  {id:609,projectId:18,number:"Soundbreak XP",description:"Soundbreak XP — Sound Attenuation Board (Quiet Rock substitute)",specSection:"09 21 16",type:"product data",status:"approved",dateSubmitted:"2025-11-03",dateReturned:"2025-11-03",distributedBy:"Preston Cheney (Wier CC)",notes:"Original Quiet Rock supply short, Soundbreak approved as national equivalent"},
  // MH Pearland L4 Renovation (projectId: 15)
  {id:610,projectId:15,number:"AD System",description:"AD System Doors",specSection:"08 11 13",type:"product data",status:"approved",dateSubmitted:"2026-01-29",dateReturned:"2026-01-29",distributedBy:"Kristen Gallegos (Harvey Cleary)",notes:"Approved same day, installed that night"},
  // Arch-Con - Sprouts Farmers Market (projectId: 12)
  {id:611,projectId:12,number:"CD_600PDS125-18-70ksi-P",description:"ClarkDietrich 600S 125 18ga 70ksi Stud — Product Data Sheet",specSection:"05 40 00",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:""},
  {id:612,projectId:12,number:"CD_Arch_Con_Sprouts",description:"ClarkDietrich Framing Package — Arch-Con Sprouts",specSection:"05 40 00",type:"shop drawings",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:""},
  {id:613,projectId:12,number:"CD_MaxTrak-DW",description:"ClarkDietrich MaxTrak Deflection Track",specSection:"05 40 00",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:""},
  {id:614,projectId:12,number:"USG-FC-X-1.0",description:"USG Sheetrock Firecode X Panels",specSection:"09 21 16",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:"Available in EBC submittal library"},
  {id:615,projectId:12,number:"USG-MTFCX-1.0",description:"Sheetrock Mold Tough Firecode X Panels",specSection:"09 21 16",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:"Available in EBC submittal library"},
  {id:616,projectId:12,number:"Knauf-EcoBatt-1.0",description:"Knauf EcoBatt Insulation",specSection:"07 21 00",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:"Available in EBC submittal library"},
  {id:617,projectId:12,number:"Prelude-XL-1.0",description:"Armstrong Prelude XL 15/16\" Exposed Tee Grid System",specSection:"09 51 00",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:"Available in EBC submittal library"},
  {id:618,projectId:12,number:"FRP-1.0",description:"Fire Rated Plywood",specSection:"06 16 00",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:""},
  {id:619,projectId:12,number:"ToughRock-FXMG-1.0",description:"ToughRock Fireguard X Mold Guard",specSection:"09 21 16",type:"product data",status:"approved",dateSubmitted:"2026-03-03",dateReturned:"",distributedBy:"Jon Windham (Arch-Con)",notes:"Available in EBC submittal library"},
  // MH MC Single Plane IR (projectId: 7) — submitted for first review, awaiting GC response
  {id:630,projectId:7,number:"MH7-001",description:"ClarkDietrich 362S125-18 3-5/8\" Metal Stud — Product Data Sheet",specSection:"09 22 16",type:"product data",status:"submitted",dateSubmitted:"2026-03-05",dateReturned:"",distributedBy:"",notes:"18ga 70ksi. Submitted to O'Donnell/Snider for review."},
  {id:631,projectId:7,number:"MH7-002",description:"ClarkDietrich 600S125-18 6\" Metal Stud — Product Data Sheet",specSection:"09 22 16",type:"product data",status:"submitted",dateSubmitted:"2026-03-05",dateReturned:"",distributedBy:"",notes:"18ga 70ksi. Submitted to O'Donnell/Snider for review."},
  {id:632,projectId:7,number:"MH7-003",description:"USG Sheetrock Brand 5/8\" Type X Gypsum Board",specSection:"09 29 00",type:"product data",status:"submitted",dateSubmitted:"2026-03-05",dateReturned:"",distributedBy:"",notes:""},
  {id:633,projectId:7,number:"MH7-004",description:"National Gypsum Gold Bond Fire-Shield 5/8\" Type X",specSection:"09 29 00",type:"product data",status:"submitted",dateSubmitted:"2026-03-05",dateReturned:"",distributedBy:"",notes:"Alternate to USG Type X submitted concurrently."},
  {id:634,projectId:7,number:"MH7-005",description:"MarShield Lead-Lined Gypsum Board 5/8\" + 1/16\" Pb — Product Data",specSection:"13 49 00",type:"product data",status:"submitted",dateSubmitted:"2026-03-07",dateReturned:"",distributedBy:"",notes:"Lead-lined GWB for radiation shielding. ASTM C1396 compliant."},
  {id:635,projectId:7,number:"MH7-006",description:"MarShield Lead Sheet 1/16\" (1.6mm) — Shielding Calculations",specSection:"13 49 00",type:"calculations",status:"submitted",dateSubmitted:"2026-03-07",dateReturned:"",distributedBy:"",notes:"Radiation shielding calcs per physicist report. Stamped by EBC."},
  {id:636,projectId:7,number:"MH7-007",description:"CEMCO TDS 3-5/8\" 20ga Metal Track — Product Data Sheet",specSection:"09 22 16",type:"product data",status:"submitted",dateSubmitted:"2026-03-05",dateReturned:"",distributedBy:"",notes:""},
  {id:637,projectId:7,number:"MH7-008",description:"USG Durock Brand Cement Board 1/2\" — Product Data",specSection:"09 21 16",type:"product data",status:"submitted",dateSubmitted:"2026-03-17",dateReturned:"",distributedBy:"",notes:"Submitted to GC. Awaiting return."},
  {id:638,projectId:7,number:"MH7-009",description:"USG Sheetrock All Purpose Joint Compound — Product Data",specSection:"09 91 00",type:"product data",status:"submitted",dateSubmitted:"2026-03-05",dateReturned:"",distributedBy:"",notes:""},
  {id:639,projectId:7,number:"MH7-010",description:"Hollow Metal Door Frame 3-0x8-0 — Shop Drawings",specSection:"08 11 13",type:"shop drawings",status:"submitted",dateSubmitted:"2026-03-10",dateReturned:"",distributedBy:"",notes:"Lead-lined HM frame. Submitted to O'Donnell/Snider."},
  // Texas Heart Center - Baytown (projectId: 5)
  {id:620,projectId:5,number:"THC-PKG-1.0",description:"Texas Heart Center — Full Submittal Package",specSection:"",type:"product data",status:"approved",dateSubmitted:"2026-02-24",dateReturned:"",distributedBy:"Josh (Bayshore)",notes:"Full package on file: Texas_Heart_Center_Submittal_Package.pdf"},
  {id:621,projectId:5,number:"DensShield-1.0",description:"DensShield Tile Backer",specSection:"09 28 00",type:"product data",status:"approved",dateSubmitted:"2026-02-24",dateReturned:"",distributedBy:"Josh (Bayshore)",notes:"Available in EBC submittal library"},
  {id:622,projectId:5,number:"USG-Durock-1.0",description:"USG Durock Cement Board with EdgeGuard",specSection:"09 28 00",type:"product data",status:"approved",dateSubmitted:"2026-02-24",dateReturned:"",distributedBy:"Josh (Bayshore)",notes:"Available in EBC submittal library"},
  // PPER - Missouri City (projectId: 19) — library items matching project scope
  {id:623,projectId:19,number:"DensGlass-1.0",description:"DensGlass Gold Exterior Sheathing",specSection:"07 25 00",type:"product data",status:"approved",dateSubmitted:"2026-01-27",dateReturned:"",distributedBy:"Alejandra Ibarra (WC Construction)",notes:"Available in EBC submittal library"},
  {id:624,projectId:19,number:"EcoBatt-R11-1.0",description:"Knauf EcoBatt Insulation R-11",specSection:"07 21 00",type:"product data",status:"approved",dateSubmitted:"2026-01-27",dateReturned:"",distributedBy:"Alejandra Ibarra (WC Construction)",notes:"Available in EBC submittal library"},
  {id:625,projectId:19,number:"EcoBatt-R8-1.0",description:"Knauf EcoBatt Insulation R-8",specSection:"07 21 00",type:"product data",status:"approved",dateSubmitted:"2026-01-27",dateReturned:"",distributedBy:"Alejandra Ibarra (WC Construction)",notes:"Available in EBC submittal library"},
  {id:626,projectId:19,number:"EcoBatt-R19-1.0",description:"Knauf EcoBatt Insulation R-19",specSection:"07 21 00",type:"product data",status:"approved",dateSubmitted:"2026-01-27",dateReturned:"",distributedBy:"Alejandra Ibarra (WC Construction)",notes:"Available in EBC submittal library"},
  {id:627,projectId:19,number:"OC-ThermBatt-1.0",description:"Owens Corning Thermal Batt Insulation",specSection:"07 21 00",type:"product data",status:"approved",dateSubmitted:"2026-01-27",dateReturned:"",distributedBy:"Alejandra Ibarra (WC Construction)",notes:"Available in EBC submittal library"},
];

// ── SEED: SCHEDULE ──
const _demoSchedule = [];

// ── SEED: SAFETY ──
const _demoIncidents = [];

const _demoToolboxTalks = [];

const _demoDailyReports = [
  // Endurance - Woodside Laboratory (projectId: 1) — seed daily reports for PM audit
  {id:"dr-ws-1",projectId:1,date:"2026-04-03",foremanId:4,foremanName:"Antonio Ramirez",temperature:"82°F",conditions:"clear",teamPresent:[2,3,5,6,7],crewCount:5,totalHours:40,workPerformed:"Framed east wall of Main Lab. Hung 200 SF drywall on Control Room ceiling. Started demo of existing partition at Corridor A.",materialsReceived:"200 EA 3-5/8\" studs, 80 SHT 5/8\" Type X",equipmentOnSite:"Scissor lift, powder-actuated tool",visitors:"Mason Williams (GC super) — morning walkthrough",safetyIncident:"None",issues:"Pipe run blocking framing at Grid B — submitted RFI-001.",tomorrowPlan:"Continue Main Lab framing. Start corridor ceiling grid layout.",photos:[],reviewedBy:null,reviewedAt:null,submittedAt:"2026-04-03T15:30:00Z"},
  {id:"dr-ws-2",projectId:1,date:"2026-04-04",foremanId:4,foremanName:"Antonio Ramirez",temperature:"79°F",conditions:"partly cloudy",teamPresent:[2,3,5,6,7,8],crewCount:6,totalHours:48,workPerformed:"Completed Main Lab east wall framing. Hung remaining drywall on Control Room ceiling. GC confirmed RFI-002 — frame to deck. Started elevator shaft layout.",materialsReceived:"None",equipmentOnSite:"Scissor lift",visitors:"None",safetyIncident:"None",issues:"Elevator shaft fire rating needs UL confirmation — submitted RFI-004.",tomorrowPlan:"Continue elevator shaft framing. Begin ACT grid at Storage Room A.",photos:[],reviewedBy:"Abner Aguilar",reviewedAt:"2026-04-04T17:00:00Z",submittedAt:"2026-04-04T15:45:00Z"},
  {id:"dr-ws-3",projectId:1,date:"2026-04-05",foremanId:4,foremanName:"Antonio Ramirez",temperature:"76°F",conditions:"overcast",teamPresent:[2,3,5,6],crewCount:4,totalHours:32,workPerformed:"Elevator shaft framing in progress. Started ACT grid layout at Storage Room A. Punch items from corridor walkthrough documented.",materialsReceived:"ACT grid runners + cross tees (delivery from EBC Yard)",equipmentOnSite:"Scissor lift, laser level",visitors:"None",safetyIncident:"None",issues:"ACT tile substitution pending — RFI-003 awaiting response.",tomorrowPlan:"Weekend — resume Monday with corridor framing and ACT install.",photos:[],reviewedBy:null,reviewedAt:null,submittedAt:"2026-04-05T15:15:00Z"},
];

// ── SEED: TAKEOFFS ──
const _demoTakeoffs = [];

// ── SEED: PUNCH LIST ──
const _demoPunchItems = [
  {id:501,projectId:19,description:"Punch item #1 — overdue (reminder since 3/5/2026)",location:"",assignedTo:"Bo Ruiz",priority:"high",status:"open",photos:[],createdAt:"2026-03-05T00:00:00.000Z",completedAt:null,signedOffBy:null,signedOffAt:null},
  {id:502,projectId:19,description:"Punch item #2 — overdue (reminder since 3/5/2026)",location:"",assignedTo:"Bo Ruiz",priority:"high",status:"open",photos:[],createdAt:"2026-03-05T00:00:00.000Z",completedAt:null,signedOffBy:null,signedOffAt:null},
  // Endurance - Woodside Lab
  {id:503,projectId:1,description:"Drywall joint cracking at Main Lab header — re-tape and skim",location:"Main Lab, Floor 1, Zone A",assignedTo:"Ricardo Mendez",priority:"high",status:"open",photos:[],createdAt:"2026-04-03T14:00:00.000Z",completedAt:null,signedOffBy:null,signedOffAt:null},
  {id:504,projectId:1,description:"ACT grid misaligned at corridor junction — re-level 4 tiles",location:"Corridor A, Floor 1, Zone B",assignedTo:"Ricardo Mendez",priority:"medium",status:"open",photos:[],createdAt:"2026-04-03T14:15:00.000Z",completedAt:null,signedOffBy:null,signedOffAt:null},
  {id:505,projectId:1,description:"Door frame not plumb — Conference Rm 201, shimmed but needs re-check",location:"Conference Room, Floor 2, Zone C",assignedTo:"Carlos Fuentes",priority:"high",status:"in-progress",photos:[],createdAt:"2026-04-02T11:00:00.000Z",completedAt:null,signedOffBy:null,signedOffAt:null},
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
const _demoMaterialRequests = [
  { id: "mr3", employeeId: 5, employeeName: "David Ramirez", projectId: 5, projectName: "Texas Heart Center - Baytown", material: "Lead-Lined Drywall (1/32\" Pb)", qty: 40, unit: "SHT", notes: "X-ray room — confirm lead spec with GC", status: "requested", requestedAt: new Date(Date.now() - 43200000).toISOString() },
  { id: "mr4", employeeId: 9, employeeName: "Antonio Hernandez", projectId: 12, projectName: "Arch-Con - Sprouts Farmers Market", material: "Mud & Tape Compound (5gal)", qty: 10, unit: "BKT", notes: "", status: "approved", requestedAt: new Date(Date.now() - 259200000).toISOString(), approvedAt: new Date(Date.now() - 172800000).toISOString() },
  // Endurance - Woodside Laboratory
  {id:"mr-ws1",employeeId:1,employeeName:"Oscar Alvarez",projectId:1,projectName:"Endurance - Woodside Laboratory",material:"3-5/8\" Metal Studs 25ga (10ft)",qty:200,unit:"EA",notes:"Main Lab + Control Room framing. Deliver to east dock.",status:"approved",requestedAt:"2026-03-28T08:00:00Z",approvedAt:"2026-03-28T14:00:00Z"},
  {id:"mr-ws2",employeeId:1,employeeName:"Oscar Alvarez",projectId:1,projectName:"Endurance - Woodside Laboratory",material:"5/8\" Type X Drywall (4x12)",qty:80,unit:"SHT",notes:"Control Room + Main Lab first layer",status:"in-transit",requestedAt:"2026-04-01T07:00:00Z",approvedAt:"2026-04-01T10:00:00Z",driverId:7},
  {id:"mr-ws3",employeeId:1,employeeName:"Oscar Alvarez",projectId:1,projectName:"Endurance - Woodside Laboratory",material:"ACT Grid T-Bar 15/16\" (12ft)",qty:60,unit:"EA",notes:"Corridor A + Control Room ceilings. Need by 4/7.",status:"requested",requestedAt:"2026-04-03T12:00:00Z"},
];

// ── SEED: CREW SCHEDULE ──
// Assigns foremen + team to active projects for the current week
const _demoCrewSchedule = [
  // Oscar Alvarez (Foreman id:1) → Endurance Woodside Lab (id:1) Mon-Thu + ROD Brunello Fri
  { id: "cs1", employeeId: 1, projectId: 1, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: true, fri: false }, hours: { start: "06:30", end: "15:00" }, task: "Metal Framing", trade: "Framing", floor: "1", zone: "A", areaId: "a1" },
  { id: "cs2", employeeId: 2, projectId: 1, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: true, fri: false }, hours: { start: "06:30", end: "15:00" }, task: "Drywall Hang", trade: "Board", floor: "1", zone: "A", areaId: "a2" },
  { id: "cs3", employeeId: 3, projectId: 1, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: true, fri: false }, hours: { start: "07:00", end: "15:30" }, task: "Demo & Framing Assist", trade: "Framing", floor: "1", zone: "A", areaId: "a7" },
  { id: "cs6", employeeId: 1, projectId: 16, weekStart: _ws, days: { mon: false, tue: false, wed: false, thu: false, fri: true }, hours: { start: "06:30", end: "15:00" } },

  // David Ramirez (Foreman id:5) → Texas Heart Center Baytown (id:5) + MH MC Single Plane IR (id:7)
  { id: "cs10", employeeId: 5, projectId: 5, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: false, fri: false }, hours: { start: "06:00", end: "14:30" } },
  { id: "cs11", employeeId: 4, projectId: 5, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: false, fri: false }, hours: { start: "06:30", end: "15:00" } },
  { id: "cs12", employeeId: 6, projectId: 5, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: false, fri: false }, hours: { start: "07:00", end: "15:30" } },
  { id: "cs13", employeeId: 5, projectId: 7, weekStart: _ws, days: { mon: false, tue: false, wed: false, thu: true, fri: true }, hours: { start: "06:00", end: "14:30" } },
  { id: "cs14", employeeId: 4, projectId: 7, weekStart: _ws, days: { mon: false, tue: false, wed: false, thu: true, fri: true }, hours: { start: "06:30", end: "15:00" } },

  // Antonio Hernandez (Foreman id:9) → Sprouts (id:12) + Our Lady of Guadalupe (id:11)
  { id: "cs20", employeeId: 9, projectId: 12, weekStart: _ws, days: { mon: true, tue: true, wed: true, thu: true, fri: true }, hours: { start: "06:00", end: "14:30" } },
  { id: "cs21", employeeId: 10, projectId: 12, weekStart: _ws, days: { mon: false, tue: false, wed: true, thu: true, fri: true }, hours: { start: "06:30", end: "15:00" } },
  { id: "cs22", employeeId: 11, projectId: 12, weekStart: _ws, days: { mon: true, tue: true, wed: false, thu: false, fri: false }, hours: { start: "07:00", end: "15:30" } },
  { id: "cs23", employeeId: 9, projectId: 11, weekStart: _ws, days: { mon: false, tue: false, wed: false, thu: false, fri: true }, hours: { start: "06:00", end: "14:30" } },
];

// ── SEED: TIME ENTRIES ──
function _seedTimeEntries() {
  const today = new Date();
  const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
  const entries = [];
  const mkEntry = (empId, empName, projId, projName, dayOffset, startH, startM, endH, endM) => {
    const d = new Date(mon); d.setDate(mon.getDate() + dayOffset);
    const cin = new Date(d); cin.setHours(startH, startM, 0, 0);
    const cout = new Date(d); cout.setHours(endH, endM, 0, 0);
    // Only include entries for days that have already passed
    if (cout > today) return null;
    const rawH = (cout - cin) / 3600000;
    const totalHours = +(rawH >= 6 ? rawH - 0.5 : rawH).toFixed(2);
    return {
      id: `te_${empId}_${projId}_${dayOffset}`,
      employeeId: empId, employeeName: empName,
      projectId: projId, projectName: projName,
      clockIn: cin.toISOString(), clockOut: cout.toISOString(),
      clockInLat: 29.73, clockInLng: -95.43, clockOutLat: 29.73, clockOutLng: -95.43,
      totalHours, geofenceStatus: "inside",
    };
  };
  // David's team on THC Baytown (id:5)
  for (let d = 0; d < 3; d++) {
    entries.push(mkEntry(5, "David Ramirez", 5, "Texas Heart Center - Baytown", d, 6, 0, 14, 30));
    entries.push(mkEntry(4, "Miguel Torres", 5, "Texas Heart Center - Baytown", d, 6, 30, 15, 0));
    entries.push(mkEntry(6, "Luis Herrera", 5, "Texas Heart Center - Baytown", d, 7, 0, 15, 30));
  }
  // David's team on MH MC Single Plane IR (id:7)
  for (let d = 3; d < 5; d++) {
    entries.push(mkEntry(5, "David Ramirez", 7, "MH MC Single Plane IR", d, 6, 0, 14, 30));
    entries.push(mkEntry(4, "Miguel Torres", 7, "MH MC Single Plane IR", d, 6, 30, 15, 0));
  }
  // Antonio's team on Sprouts (id:12)
  for (let d = 0; d < 5; d++) {
    entries.push(mkEntry(9, "Antonio Hernandez", 12, "Arch-Con - Sprouts Farmers Market", d, 6, 0, 14, 30));
  }
  return entries.filter(Boolean);
}
const _demoTimeEntries = _seedTimeEntries();

// ── SEED: AREAS / ZONES ──
// Area-based work model — ties production, punch, crew assignments to physical locations
const _demoAreas = [
  // Endurance - Woodside Laboratory (projectId: 1)
  {id:"a1",projectId:1,name:"Main Lab",floor:"1",zone:"A",type:"Lab",status:"in-progress",assignedTo:1,laborBudgetHours:200,notes:"Primary lab space. Containment wall added (T&M). Fire-rated partitions.",scopeItems:[{trade:"Demo",unit:"SF",budgetQty:200,installedQty:200},{trade:"Metal Framing",unit:"LF",budgetQty:1200,installedQty:390},{trade:"Drywall",unit:"SF",budgetQty:2400,installedQty:480},{trade:"ACT Ceilings",unit:"SF",budgetQty:1800,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:2400,installedQty:0}]},
  {id:"a2",projectId:1,name:"Control Room",floor:"1",zone:"A",type:"Office",status:"in-progress",assignedTo:1,laborBudgetHours:80,notes:"Adjacent to Main Lab. Standard partition.",scopeItems:[{trade:"Metal Framing",unit:"LF",budgetQty:320,installedQty:320},{trade:"Drywall",unit:"SF",budgetQty:640,installedQty:640},{trade:"ACT Ceilings",unit:"SF",budgetQty:480,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:640,installedQty:0}]},
  {id:"a3",projectId:1,name:"Corridor A",floor:"1",zone:"B",type:"Corridor",status:"not-started",assignedTo:null,laborBudgetHours:120,notes:"",scopeItems:[{trade:"Metal Framing",unit:"LF",budgetQty:480,installedQty:0},{trade:"Drywall",unit:"SF",budgetQty:960,installedQty:0},{trade:"ACT Ceilings",unit:"SF",budgetQty:720,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:960,installedQty:0}]},
  {id:"a4",projectId:1,name:"Storage / Mechanical",floor:"1",zone:"B",type:"Utility",status:"in-progress",assignedTo:2,laborBudgetHours:60,notes:"CMU demo added as T&M (TM-002).",scopeItems:[{trade:"Demo",unit:"SF",budgetQty:400,installedQty:150},{trade:"Metal Framing",unit:"LF",budgetQty:280,installedQty:0},{trade:"Drywall",unit:"SF",budgetQty:560,installedQty:0}]},
  {id:"a5",projectId:1,name:"Conference Room",floor:"2",zone:"C",type:"Office",status:"not-started",assignedTo:null,laborBudgetHours:100,notes:"L5 finish. Confirm paint spec.",scopeItems:[{trade:"Metal Framing",unit:"LF",budgetQty:360,installedQty:0},{trade:"Drywall",unit:"SF",budgetQty:720,installedQty:0},{trade:"ACT Ceilings",unit:"SF",budgetQty:540,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:720,installedQty:0}]},
  {id:"a6",projectId:1,name:"Open Office",floor:"2",zone:"C",type:"Office",status:"not-started",assignedTo:null,laborBudgetHours:160,notes:"4 door frames included.",scopeItems:[{trade:"Metal Framing",unit:"LF",budgetQty:600,installedQty:0},{trade:"Drywall",unit:"SF",budgetQty:1200,installedQty:0},{trade:"ACT Ceilings",unit:"SF",budgetQty:900,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:1200,installedQty:0},{trade:"Doors & Hardware",unit:"EA",budgetQty:4,installedQty:0}]},
  {id:"a7",projectId:1,name:"Lobby / Reception",floor:"1",zone:"A",type:"Common",status:"in-progress",assignedTo:3,laborBudgetHours:60,notes:"Demo complete. Framing started.",scopeItems:[{trade:"Demo",unit:"SF",budgetQty:150,installedQty:150},{trade:"Metal Framing",unit:"LF",budgetQty:200,installedQty:80},{trade:"Drywall",unit:"SF",budgetQty:400,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:400,installedQty:0}]},
  {id:"a8",projectId:1,name:"Restrooms (x2)",floor:"1",zone:"B",type:"Wet",status:"not-started",assignedTo:null,laborBudgetHours:80,notes:"Moisture-resistant board required.",scopeItems:[{trade:"Metal Framing",unit:"LF",budgetQty:240,installedQty:0},{trade:"Drywall",unit:"SF",budgetQty:480,installedQty:0},{trade:"ACT Ceilings",unit:"SF",budgetQty:320,installedQty:0},{trade:"Tape & Finish",unit:"SF",budgetQty:480,installedQty:0}]},
];

// ── SEED: PRODUCTION LOGS ──
// Daily production entries — foreman or crew enters what was installed
const _demoProductionLogs = [
  {id:"pl1",projectId:1,areaId:"a1",date:"2026-03-31",trade:"Metal Framing",unit:"LF",qtyInstalled:180,laborHours:16,crewSize:2,enteredBy:"Oscar Alvarez",enteredAt:"2026-03-31T15:00:00Z",notes:"Started Main Lab framing. East wall complete."},
  {id:"pl2",projectId:1,areaId:"a1",date:"2026-04-01",trade:"Metal Framing",unit:"LF",qtyInstalled:210,laborHours:16,crewSize:2,enteredBy:"Oscar Alvarez",enteredAt:"2026-04-01T15:10:00Z",notes:"North + south walls framed. Header detail at window."},
  {id:"pl3",projectId:1,areaId:"a2",date:"2026-04-01",trade:"Metal Framing",unit:"LF",qtyInstalled:320,laborHours:8,crewSize:1,enteredBy:"Oscar Alvarez",enteredAt:"2026-04-01T15:15:00Z",notes:"Control Room framing complete."},
  {id:"pl4",projectId:1,areaId:"a2",date:"2026-04-02",trade:"Drywall",unit:"SF",qtyInstalled:640,laborHours:16,crewSize:2,enteredBy:"Oscar Alvarez",enteredAt:"2026-04-02T15:20:00Z",notes:"Control Room board hung — both sides, one layer each."},
  {id:"pl5",projectId:1,areaId:"a1",date:"2026-04-03",trade:"Drywall",unit:"SF",qtyInstalled:480,laborHours:16,crewSize:2,enteredBy:"Oscar Alvarez",enteredAt:"2026-04-03T15:00:00Z",notes:"Main Lab east wall + south wall board hung."},
];

// ── SEED: DECISION / COMMUNICATION LOG ──
const _demoDecisionLog = [
  {id:"dl1",projectId:1,date:"2026-04-01",type:"gc-directive",description:"Mason Williams (Endurance Super) directed containment wall build-out at Main Lab east wall due to unforeseen asbestos. Verbal direction, documented immediately.",attributedTo:"Mason Williams",recordedBy:"Oscar Alvarez",recordedAt:"2026-04-01T09:20:00Z"},
  {id:"dl2",projectId:1,date:"2026-04-02",type:"decision",description:"Hold framing in Corridor A pending revised MEP routing. GC to issue updated drawings by 4/7.",attributedTo:"Christina Zube Volkers",recordedBy:"Abner Aguilar",recordedAt:"2026-04-02T14:00:00Z"},
  {id:"dl3",projectId:1,date:"2026-04-03",type:"commitment",description:"GC committed to providing revised fire-stopping details for Main Lab header by end of week. EBC to hold tape & finish until received.",attributedTo:"Mason Williams",recordedBy:"Emmanuel Aguilar",recordedAt:"2026-04-03T10:30:00Z"},
];

// ── CONDITIONAL EXPORTS ──
// Projects & employees ALWAYS load (real EBC data), other seed data is demo-only
// ── SEED: MATERIAL SUPPLIERS ──
export const initSuppliers = [
  { id: "sup1", name: "ABC Supply Co.", contact: "Sales Team", email: "sales@abcsupply.com", phone: "713-555-0100", specialty: ["Framing", "Drywall", "Insulation", "Accessories"] },
  { id: "sup2", name: "ClarkDietrich Building Systems", contact: "Houston Branch", email: "houston@clarkdietrich.com", phone: "713-555-0201", specialty: ["Framing"] },
  { id: "sup3", name: "USG Corporation", contact: "Southwest Region Rep", email: "sw-sales@usg.com", phone: "713-555-0302", specialty: ["Drywall", "Finishing", "Ceiling"] },
  { id: "sup4", name: "Performance Drywall Supply", contact: "Orders Desk", email: "orders@performancedrywall.com", phone: "713-555-0403", specialty: ["Drywall", "Finishing", "Insulation"] },
  { id: "sup5", name: "Contractor Supply Warehouse", contact: "Inside Sales", email: "sales@cswhouston.com", phone: "713-555-0504", specialty: ["Framing", "Fasteners", "Accessories"] },
  { id: "sup6", name: "GoldStone Supply Houston", contact: "Sales Desk", email: "sales@goldstonesupply.com", phone: "713-555-0605", specialty: ["Drywall", "Framing", "Ceiling", "Insulation"] },
];

export const initBids = _demoBids; // always load — real EBC bid list
export const initProjects = _demoProjects; // always load — real EBC project list
export const initContacts = _demoContacts; // always load — real GC contacts
export const initCallLog = _demoCallLog; // always load — real call log
export const initInvoices = _demoInvoices; // always load — real invoices
export const initTmTickets = _demoTmTickets; // always load — foreman T&M capture needs this
export const initChangeOrders = _demoChangeOrders; // always load — foreman portal needs this
export const initRfis = _demoRfis; // always load — foreman portal needs this
export const initSubmittals = _demoSubmittals; // always load — foreman portal needs this
export const initSchedule = _demoSchedule; // always load
export const initIncidents = _demo ? _demoIncidents : [];
export const initToolboxTalks = _demo ? _demoToolboxTalks : [];
export const initDailyReports = _demoDailyReports; // always load — PM needs daily reports for action queue
export const initTakeoffs = _demo ? _demoTakeoffs : [];
export const initPunchItems = _demoPunchItems; // always load — real open punch items
export const initEmployees = _demoEmployees; // always load — real EBC team
export const initCompanyLocations = _demoCompanyLocations; // always load — office/warehouse
export const initMaterialRequests = _demoMaterialRequests; // always load — foreman portal needs this
export const initCrewSchedule = _demoCrewSchedule; // always load — foreman portal needs this
export const initTimeEntries = _demoTimeEntries; // always load — foreman portal needs this
export const initAreas = _demoAreas; // always load — area-based work model
export const initProductionLogs = _demoProductionLogs; // always load — production tracking
export const initDecisionLog = _demoDecisionLog; // always load — PM decision/communication log

// ── COMPANY SETTINGS ──
export const initCompanySettings = {
  laborBurdenMultiplier: 1.0,  // Set to 1.30-1.40 for burdened labor (taxes/insurance/benefits)
  defaultRetainageRate: 10,     // percent
  marginAlertThreshold: 25,     // percent — flag projects below this margin
};
