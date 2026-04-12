// ═══════════════════════════════════════════════════════════════
//  ARCHIVED — Anime & Cyberpunk Theme Effects
//  Removed from App.jsx on 2026-04-12
//  These were non-construction decorative overlays.
//  Kept here in case we want to re-use the animation concepts.
// ═══════════════════════════════════════════════════════════════
import { useMemo } from "react";

// ── Sakura Petals (anime theme only) ──
const PETAL_COUNT = 28;
export const SakuraPetals = () => {
  const petals = useMemo(() =>
    Array.from({ length: PETAL_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dur: 8 + Math.random() * 12,
      delay: Math.random() * 14,
      drift: -60 + Math.random() * 120,
      size: 10 + Math.random() * 14,
      hue: Math.random() > 0.3 ? 0 : 30,
    })), []);

  return (
    <div className="sakura-container">
      {petals.map(p => (
        <div
          key={p.id}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
            "--drift": `${p.drift}px`,
          }}
        >
          <svg width={p.size} height={p.size} viewBox="0 0 20 20">
            <path
              d="M10 0C10 0 6 5 6 10C6 13 8 15 10 17C12 15 14 13 14 10C14 5 10 0 10 0Z"
              fill={p.hue === 0
                ? `rgba(255,${160 + Math.floor(Math.random()*40)},${180 + Math.floor(Math.random()*40)},${0.5 + Math.random() * 0.4})`
                : `rgba(255,${200 + Math.floor(Math.random()*30)},${210 + Math.floor(Math.random()*30)},${0.4 + Math.random() * 0.3})`
              }
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

// ── Tokyo Skyline (anime theme only) ──
export const TokyoSkyline = () => (
  <div className="tokyo-skyline">
    <svg viewBox="0 0 1400 180" preserveAspectRatio="none">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="var(--amber)" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <path fill="url(#skyGrad)" d={
        // Tokyo Tower + buildings silhouette
        "M0,180 L0,140 L30,140 L30,100 L40,100 L40,130 L50,130 L50,90 L55,90 L55,130 " +
        "L80,130 L80,110 L90,110 L90,70 L95,70 L95,110 L100,110 L100,130 " +
        "L130,130 L130,95 L140,95 L140,130 L160,130 L160,105 L170,105 L170,130 " +
        "L200,130 L200,80 L205,80 L205,60 L208,45 L210,30 L212,45 L215,60 L220,80 L220,130 " +
        "L250,130 L250,100 L260,100 L260,85 L270,85 L270,130 " +
        "L300,130 L300,110 L310,110 L310,75 L320,75 L320,110 L330,110 L330,130 " +
        "L360,130 L360,90 L370,90 L370,130 " +
        "L400,130 L400,105 L410,105 L410,65 L420,65 L420,105 L430,105 L430,130 " +
        "L460,130 L460,95 L465,95 L465,55 L470,40 L475,55 L480,95 L480,130 " +
        "L510,130 L510,110 L520,110 L520,130 L550,130 L550,85 L560,85 L560,130 " +
        "L590,130 L590,100 L600,100 L600,70 L610,70 L610,100 L620,100 L620,130 " +
        "L650,130 L650,115 L660,115 L660,130 " +
        "L690,130 L690,80 L700,80 L700,50 L705,35 L710,50 L720,80 L720,130 " +
        "L750,130 L750,105 L760,105 L760,130 " +
        "L790,130 L790,90 L800,90 L800,60 L810,60 L810,90 L820,90 L820,130 " +
        "L850,130 L850,110 L860,110 L860,130 " +
        "L890,130 L890,95 L900,95 L900,75 L910,75 L910,130 " +
        "L940,130 L940,100 L950,100 L950,130 " +
        "L980,130 L980,85 L985,85 L985,50 L990,35 L995,50 L1000,85 L1000,130 " +
        "L1030,130 L1030,110 L1040,110 L1040,130 " +
        "L1070,130 L1070,90 L1080,90 L1080,65 L1090,65 L1090,90 L1100,90 L1100,130 " +
        "L1130,130 L1130,105 L1140,105 L1140,130 " +
        "L1170,130 L1170,95 L1180,95 L1180,130 " +
        "L1210,130 L1210,80 L1220,80 L1220,55 L1230,55 L1230,80 L1240,80 L1240,130 " +
        "L1270,130 L1270,110 L1280,110 L1280,130 " +
        "L1310,130 L1310,100 L1320,100 L1320,130 " +
        "L1350,130 L1350,115 L1360,115 L1360,130 " +
        "L1400,130 L1400,180 Z"
      }/>
    </svg>
  </div>
);

// ── Cyber Rain (cyberpunk theme only) ──
const RAIN_COUNT = 40;
export const CyberRain = () => {
  const drops = useMemo(() =>
    Array.from({ length: RAIN_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dur: 1.5 + Math.random() * 3,
      delay: Math.random() * 6,
      height: 30 + Math.random() * 80,
    })), []);

  return (
    <div className="cyber-rain">
      {drops.map(d => (
        <div
          key={d.id}
          className="cyber-drop"
          style={{
            left: `${d.left}%`,
            height: `${d.height}px`,
            "--dur": `${d.dur}s`,
            "--delay": `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// ── Archived Theme Definitions ──
// These were in src/data/constants.js THEMES object:
export const ARCHIVED_THEMES = {
  steel: {
    name: "Steel", icon: "gear", label: "Steel",
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
      "--logo-tint":"#d4dae6",
      "--bg2-rgb":"12,15,22",
      "--glass-border":"rgba(255,255,255,0.06)","--glass-bg":"rgba(12,15,22,0.72)",
      "--font-head":"-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', system-ui, sans-serif",
      "--font-body":"-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Roboto', system-ui, sans-serif",
      "--font-mono":"'IBM Plex Mono', monospace",
      "--shadow":"0 2px 12px rgba(0,0,0,0.3)","--card-shadow":"0 1px 8px rgba(0,0,0,0.2)",
      "--shadow-sm":"0 1px 4px rgba(0,0,0,0.12)","--shadow-md":"0 2px 12px rgba(0,0,0,0.28)","--shadow-lg":"0 4px 32px rgba(0,0,0,0.45)",
    }
  },
  blueprint: {
    name: "Blueprint", icon: "ruler", label: "Blueprint",
    vars: {
      "--bg":"#020a16","--bg2":"#041220","--bg3":"#061c32","--bg4":"#0a2d4a",
      "--border":"#0c3558","--border2":"#185070",
      "--amber":"#00bfef","--amber2":"#2ad4ff","--amber-dim":"rgba(0,191,239,0.08)","--amber-glow":"rgba(0,191,239,0.18)",
      "--accent":"var(--amber)",
    }
  },
  matrix: {
    name: "Matrix", icon: "pill", label: "Matrix",
    vars: {
      "--bg":"#000400","--bg2":"#010a01","--bg3":"#011201","--bg4":"#021a02",
      "--border":"#083808","--border2":"#124a12",
      "--amber":"#00ff41","--amber2":"#33ff66","--amber-dim":"rgba(0,255,65,0.06)","--amber-glow":"rgba(0,255,65,0.16)",
      "--accent":"var(--amber)",
    }
  },
  anime: {
    name: "Anime", icon: "cherry-blossom", label: "Tokyo Anime",
    vars: {
      "--bg":"#080414","--bg2":"#0e0820","--bg3":"#140c30","--bg4":"#1c1242",
      "--border":"#2a1868","--border2":"#3c2690",
      "--amber":"#ff2da0","--amber2":"#ff60c0","--amber-dim":"rgba(255,45,160,0.12)","--amber-glow":"rgba(255,45,160,0.30)",
      "--accent":"var(--amber)",
    }
  },
  cyberpunk: {
    name: "Cyberpunk", icon: "city", label: "Tokyo Cyberpunk",
    vars: {
      "--bg":"#0a0a12","--bg2":"#0e1020","--bg3":"#141830","--bg4":"#1a2040",
      "--border":"#1e2850","--border2":"#2a3870",
      "--amber":"#00f0ff","--amber2":"#40f8ff","--amber-dim":"rgba(0,240,255,0.08)","--amber-glow":"rgba(0,240,255,0.25)",
      "--accent":"var(--amber)",
    }
  },
};
