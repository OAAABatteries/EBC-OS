// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Onboarding Wizard (Role-Aware, Bilingual)
//  Eagles Brothers Constructors · Houston, TX
//  Field roles (foreman/crew/driver) → Spanish-first
//  Office roles (admin/PM) → English-first with toggle
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import {
  BarChart2, FileText, Building2, Clock, HardHat,
  TrendingUp, DollarSign, CheckCircle, Users, ClipboardList,
  ArrowRight, Target, Layers, UserPlus, Zap, Package,
  ChevronLeft, ChevronRight, X, MapPin, AlertTriangle,
  Bell, Truck, Calendar, ShieldCheck, FileSearch,
  Navigation, CheckSquare, BookOpen, Camera, Wrench,
  CreditCard, Settings, Star, Flag,
  MessageSquare, Clipboard, Route, PackageCheck,
} from "lucide-react";
import { ROLES } from "../data/roles";
import { hashPasswordSync } from "../utils/passwordHash";

// ─── Role + Language helpers ─────────────────────────────────────────────────

/** Map any role string → one of 5 onboarding flow groups */
function getRoleGroup(role) {
  if (role === "owner" || role === "admin") return "owner";
  if (["pm","estimator","project_engineer","office_admin","accounting"].includes(role)) return "pm";
  if (role === "foreman" || role === "safety") return "foreman";
  if (role === "driver") return "driver";
  return "employee"; // employee + unknown
}

/** Field roles default to Spanish; office roles default to English */
function getDefaultLang(roleGroup) {
  return ["foreman","employee","driver"].includes(roleGroup) ? "es" : "en";
}

function storageKey(role) {
  return `ebc_onboarding_completed_${role || "employee"}`;
}

// ─── CSS ────────────────────────────────────────────────────────────────────

const wizardStyles = `
@keyframes wizLogoFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes wizPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(224,148,34,0.4); }
  50% { box-shadow: 0 0 0 14px rgba(224,148,34,0); }
}
@keyframes wizGlow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(224,148,34,0.3)); }
  50% { filter: drop-shadow(0 0 22px rgba(224,148,34,0.6)); }
}
@keyframes slideFromRight {
  from { opacity: 0; transform: translateX(48px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideFromLeft {
  from { opacity: 0; transform: translateX(-48px); }
  to   { opacity: 1; transform: translateX(0); }
}

.wizard-screen {
  min-height: 100vh; min-height: 100dvh;
  display: flex; align-items: center; justify-content: center;
  background: #06080c;
  font-family: 'Barlow', sans-serif;
  position: relative; overflow: hidden;
}
.wizard-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse at 25% 15%, rgba(224,148,34,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 85%, rgba(59,130,246,0.04) 0%, transparent 55%);
}
.wizard-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(224,148,34,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(224,148,34,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ── Card ── */
.wizard-card {
  position: relative; z-index: 2;
  width: 100%; max-width: 580px; margin: 16px;
  background: rgba(12,15,22,0.92);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px; padding: 40px 40px 32px;
  box-shadow: 0 32px 100px rgba(0,0,0,0.6), 0 0 60px rgba(224,148,34,0.04);
  min-height: 520px; display: flex; flex-direction: column;
}

/* ── Top bar ── */
.wizard-topbar {
  display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 24px;
}
.wizard-topbar-btn {
  background: none; border: 1px solid #1c2233; border-radius: 7px;
  padding: 6px 12px; font-size: 12px; color: #8494ad;
  cursor: pointer; font-family: 'Barlow', sans-serif;
  transition: all 0.2s; display: flex; align-items: center; gap: 5px;
}
.wizard-topbar-btn:hover { border-color: #455068; color: #d4dae6; }
.wizard-topbar-btn.danger:hover { border-color: rgba(239,68,68,0.4); color: #ef4444; }
.wizard-lang-toggle {
  display: flex; border: 1px solid #1c2233; border-radius: 7px; overflow: hidden;
  margin-right: auto;
}
.wizard-lang-btn {
  background: none; border: none; border-radius: 0;
  padding: 6px 10px; font-size: 11px; font-weight: 700;
  color: #455068; cursor: pointer; font-family: 'Barlow', sans-serif;
  transition: all 0.15s; letter-spacing: 0.5px;
}
.wizard-lang-btn.active { background: rgba(224,148,34,0.12); color: #e09422; }

/* ── Role badge ── */
.wizard-role-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(224,148,34,0.1); border: 1px solid rgba(224,148,34,0.25);
  border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700;
  color: #e09422; letter-spacing: 1px; text-transform: uppercase;
  margin: 8px auto 0;
}

/* ── Slide content ── */
.wizard-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.wizard-slide { flex: 1; display: flex; flex-direction: column; }
.wizard-slide.forward  { animation: slideFromRight 0.35s ease; }
.wizard-slide.backward { animation: slideFromLeft 0.35s ease; }

/* ── Step header ── */
.wizard-logo {
  width: 72px; height: 72px; object-fit: contain;
  display: block; margin: 0 auto 14px;
  animation: wizLogoFloat 4s ease-in-out infinite, wizGlow 4s ease-in-out infinite;
}
.wizard-step-label {
  text-align: center; font-size: 11px; letter-spacing: 2.5px;
  text-transform: uppercase; color: #e09422; margin-bottom: 6px; font-weight: 600;
}
.wizard-title {
  font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 700;
  color: #f0f4fa; text-align: center; letter-spacing: 0.5px; line-height: 1.1;
}
.wizard-desc {
  font-size: 14px; color: #8494ad; text-align: center;
  margin-top: 8px; line-height: 1.65;
}
.wizard-desc-sub {
  font-size: 12px; color: #455068; text-align: center;
  margin-top: 5px; line-height: 1.5; font-style: italic;
}
.wizard-illustration { margin-top: 20px; flex: 1; }

/* ── Pictogram style (Employee/Crew — dead simple) ── */
.wiz-pictogram {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 18px; padding: 12px 0;
}
.wiz-pictogram-icon {
  width: 96px; height: 96px; border-radius: 28px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.wiz-pictogram-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 34px; font-weight: 800;
  color: #f0f4fa; text-align: center; line-height: 1.0;
}
.wiz-pictogram-desc {
  font-size: 17px; color: #8494ad; text-align: center;
  line-height: 1.5; max-width: 260px;
}
.wiz-pictogram-hints {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;
}
.wiz-pictogram-hint {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: rgba(28,34,51,0.5); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 14px 18px; min-width: 80px;
}
.wiz-pictogram-hint-icon {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.wiz-pictogram-hint-label {
  font-size: 13px; color: #8494ad; text-align: center; font-weight: 600;
}

/* ── Generic action cards ── */
.wiz-action-cards { display: flex; flex-direction: column; gap: 9px; }
.wiz-action-card {
  background: rgba(28,34,51,0.5); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 13px 14px;
  display: flex; align-items: center; gap: 14px;
  transition: border-color 0.2s;
}
.wiz-action-card:hover { border-color: rgba(224,148,34,0.2); }
.wiz-action-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.wiz-action-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px; font-weight: 700; color: #f0f4fa; line-height: 1.1;
}
.wiz-action-desc { font-size: 12px; color: #8494ad; margin-top: 3px; line-height: 1.4; }
.wiz-action-desc-en { font-size: 11px; color: #455068; margin-top: 2px; line-height: 1.3; font-style: italic; }

/* Field size */
.wiz-action-cards.field .wiz-action-card  { padding: 16px; border-radius: 14px; gap: 16px; }
.wiz-action-cards.field .wiz-action-icon  { width: 52px; height: 52px; border-radius: 14px; }
.wiz-action-cards.field .wiz-action-title { font-size: 18px; }
.wiz-action-cards.field .wiz-action-desc  { font-size: 13px; }

/* ── KPI grid ── */
.wiz-kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wiz-kpi-card {
  background: rgba(28,34,51,0.5); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 14px 12px;
  display: flex; align-items: flex-start; gap: 10px;
}
.wiz-kpi-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.wiz-kpi-value { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; color: #f0f4fa; line-height: 1; }
.wiz-kpi-label { font-size: 11px; color: #8494ad; margin-top: 2px; }

/* ── Pipeline ── */
.wiz-pipeline { display: flex; align-items: center; overflow-x: auto; padding: 4px 0; scrollbar-width: none; }
.wiz-pipeline::-webkit-scrollbar { display: none; }
.wiz-pipeline-stage { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
.wiz-pipeline-dot { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid transparent; }
.wiz-pipeline-name { font-size: 10px; color: #8494ad; text-align: center; font-weight: 500; max-width: 56px; line-height: 1.2; }
.wiz-pipeline-arrow { color: #1c2233; margin: 0 2px; flex-shrink: 0; padding-bottom: 16px; }

/* ── Phase bars ── */
.wiz-phases { display: flex; flex-direction: column; gap: 10px; }
.wiz-phase-row { display: flex; align-items: center; gap: 12px; }
.wiz-phase-name { font-size: 12px; color: #8494ad; width: 80px; flex-shrink: 0; font-weight: 500; }
.wiz-phase-bar-bg { flex: 1; height: 8px; background: rgba(28,34,51,0.8); border-radius: 4px; overflow: hidden; }
.wiz-phase-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
.wiz-phase-pct { font-size: 11px; color: #455068; width: 32px; text-align: right; flex-shrink: 0; }

/* ── Chips ── */
.wiz-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.wiz-chip {
  background: rgba(28,34,51,0.6); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #8494ad;
  display: flex; align-items: center; gap: 5px;
}

/* ── Team form ── */
.wizard-team-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
.wizard-team-field { display: flex; flex-direction: column; gap: 4px; }
.wizard-team-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #8494ad; font-weight: 600; }
.wizard-team-input, .wizard-team-select {
  background: rgba(6,8,12,0.8); border: 1px solid #1c2233; border-radius: 8px;
  padding: 9px 10px; color: #d4dae6; font-family: 'Barlow', sans-serif;
  font-size: 13px; outline: none; transition: border-color 0.2s;
}
.wizard-team-input:focus, .wizard-team-select:focus { border-color: #e09422; }
.wizard-team-input::placeholder { color: #455068; }
.wizard-team-actions { display: flex; gap: 8px; margin-top: 10px; }
.wizard-team-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; max-height: 110px; overflow-y: auto; }
.wizard-team-row { display: flex; align-items: center; justify-content: space-between; background: rgba(12,15,22,0.6); border: 1px solid #1c2233; border-radius: 8px; padding: 7px 12px; font-size: 13px; }
.wizard-team-row-name { color: #d4dae6; font-weight: 500; }
.wizard-team-row-role { font-size: 11px; color: #e09422; background: rgba(224,148,34,0.1); padding: 2px 8px; border-radius: 4px; }
.wizard-team-remove { background: none; border: none; color: #455068; cursor: pointer; font-size: 16px; padding: 2px 6px; transition: color 0.2s; }
.wizard-team-remove:hover { color: #ef4444; }

/* ── Ready ── */
.wizard-ready-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 20px 0; }
.wizard-ready-ring {
  width: 96px; height: 96px; border-radius: 50%;
  background: rgba(224,148,34,0.08); border: 2px solid rgba(224,148,34,0.25);
  display: flex; align-items: center; justify-content: center;
  animation: wizPulse 2.5s ease-in-out infinite;
}

/* ── Footer ── */
.wizard-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);
}
.wizard-dots { display: flex; gap: 7px; align-items: center; }
.wizard-dot { width: 7px; height: 7px; border-radius: 50%; background: #1c2233; transition: all 0.3s; cursor: pointer; }
.wizard-dot.active { background: #e09422; width: 22px; border-radius: 4px; box-shadow: 0 0 8px rgba(224,148,34,0.4); }
.wizard-dot.done   { background: #2c3448; }
.wizard-nav { display: flex; gap: 8px; }
.wizard-btn {
  background: linear-gradient(135deg, #e09422 0%, #d4861a 100%);
  color: #000; border: none; border-radius: 9px; padding: 10px 20px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 700;
  letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(224,148,34,0.2);
  display: flex; align-items: center; gap: 6px;
}
.wizard-btn:hover { background: linear-gradient(135deg, #f0a83a 0%, #e09422 100%); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(224,148,34,0.3); }
.wizard-btn:active { transform: translateY(0); }
.wizard-btn-ghost { background: transparent; color: #8494ad; border: 1px solid #1c2233; box-shadow: none; }
.wizard-btn-ghost:hover { border-color: #455068; color: #d4dae6; background: transparent; transform: none; }
.wizard-launch { animation: wizPulse 2s ease-in-out infinite; font-size: 17px; padding: 14px 40px; }

@media (max-width: 520px) {
  .wizard-card { margin: 8px; padding: 22px 16px 18px; min-height: auto; border-radius: 16px; }
  .wizard-title { font-size: 24px; }
  .wiz-kpi-grid { gap: 7px; }
  .wiz-kpi-card { padding: 10px 8px; gap: 7px; }
  .wizard-team-form { grid-template-columns: 1fr; }
  .wizard-btn { padding: 10px 14px; font-size: 14px; }
  .wiz-pictogram-icon { width: 80px; height: 80px; }
  .wiz-pictogram-title { font-size: 30px; }
  .wiz-pictogram-desc { font-size: 15px; }
}
`;

// ─── Shared illustration components ─────────────────────────────────────────

const PIPELINE_STAGES_EN = ["Invite","Takeoff","Pricing","Submitted","Awarded"];
const PIPELINE_STAGES_ES = ["Invitación","Takeoff","Precios","Enviado","Adjudicado"];
const PIPELINE_COLORS = [
  { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  { color: "#e09422", bg: "rgba(224,148,34,0.12)", border: "rgba(224,148,34,0.3)" },
  { color: "#e09422", bg: "rgba(224,148,34,0.12)", border: "rgba(224,148,34,0.3)" },
  { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" },
  { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
];

function PipelineIllustration({ lang }) {
  const stages = lang === "es" ? PIPELINE_STAGES_ES : PIPELINE_STAGES_EN;
  return (
    <div className="wiz-pipeline">
      {stages.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div className="wiz-pipeline-stage">
            <div className="wiz-pipeline-dot" style={{ background: PIPELINE_COLORS[i].bg, borderColor: PIPELINE_COLORS[i].border, color: PIPELINE_COLORS[i].color }}>
              <FileText style={{ width: 18, height: 18 }} />
            </div>
            <div className="wiz-pipeline-name" style={{ color: PIPELINE_COLORS[i].color }}>{label}</div>
          </div>
          {i < stages.length - 1 && (
            <div className="wiz-pipeline-arrow"><ArrowRight style={{ width: 14, height: 14 }} /></div>
          )}
        </div>
      ))}
    </div>
  );
}

const PHASES_EN = [
  { name: "Design",    pct: 100, color: "#10b981" },
  { name: "Framing",   pct: 78,  color: "#e09422" },
  { name: "Drywall",   pct: 42,  color: "#e09422" },
  { name: "Tape & Bed",pct: 15,  color: "#3b82f6" },
  { name: "Punch",     pct: 0,   color: "#455068" },
];
const PHASES_ES = [
  { name: "Diseño",    pct: 100, color: "#10b981" },
  { name: "Estructura",pct: 78,  color: "#e09422" },
  { name: "Drywall",   pct: 42,  color: "#e09422" },
  { name: "Tape/Bed",  pct: 15,  color: "#3b82f6" },
  { name: "Punch",     pct: 0,   color: "#455068" },
];

function PhaseIllustration({ lang }) {
  const phases = lang === "es" ? PHASES_ES : PHASES_EN;
  return (
    <div className="wiz-phases">
      {phases.map((p) => (
        <div key={p.name} className="wiz-phase-row">
          <div className="wiz-phase-name">{p.name}</div>
          <div className="wiz-phase-bar-bg">
            <div className="wiz-phase-bar-fill" style={{ width: `${p.pct}%`, background: p.pct === 0 ? "#1c2233" : `linear-gradient(90deg, ${p.color}, ${p.color}aa)` }} />
          </div>
          <div className="wiz-phase-pct">{p.pct}%</div>
        </div>
      ))}
    </div>
  );
}

/** Generic action cards — supports optional bilingual subtitle */
function ActionCards({ cards, size }) {
  return (
    <div className={`wiz-action-cards${size ? ` ${size}` : ""}`}>
      {cards.map((c, i) => (
        <div key={i} className="wiz-action-card">
          <div className="wiz-action-icon" style={{ background: c.iconBg }}>{c.icon}</div>
          <div style={{ flex: 1 }}>
            <div className="wiz-action-title">{c.title}</div>
            <div className="wiz-action-desc">{c.desc}</div>
            {c.descEn && <div className="wiz-action-desc-en">{c.descEn}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pictogram step for Employee/Crew — huge icon, very short text */
function PictogramStep({ iconEl, iconBg, title, desc, hints }) {
  return (
    <div className="wiz-pictogram">
      <div className="wiz-pictogram-icon" style={{ background: iconBg }}>{iconEl}</div>
      <div className="wiz-pictogram-title">{title}</div>
      {desc && <div className="wiz-pictogram-desc">{desc}</div>}
      {hints && hints.length > 0 && (
        <div className="wiz-pictogram-hints">
          {hints.map((h, i) => (
            <div key={i} className="wiz-pictogram-hint">
              <div className="wiz-pictogram-hint-icon" style={{ background: h.iconBg }}>{h.icon}</div>
              <div className="wiz-pictogram-hint-label">{h.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Role-badge / Welcome ────────────────────────────────────────────────────

function StepWelcome({ lang, roleBadge, fieldRole }) {
  const chips = lang === "es"
    ? ["Pipeline","Proyectos","Capataz","Reloj","Estimaciones","Seguridad","Entregas","Reportes"]
    : ["Bid Pipeline","Project Mgmt","Foreman Portal","Time Clock","Estimating","Safety","Deliveries","Reports"];
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img
        src="/logo-ebc-white.png" alt="EBC" className="wizard-logo"
        style={{ width: 96, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }}
      />
      <div className="wizard-title" style={{ marginTop: 6 }}>
        {lang === "es" ? "Bienvenido a EBC-OS" : "Welcome to EBC-OS"}
      </div>
      {roleBadge && (
        <div className="wizard-role-badge">
          <Star style={{ width: 11, height: 11 }} />
          {roleBadge}
        </div>
      )}
      <div className="wizard-desc">
        {lang === "es"
          ? "Tu plataforma de construcción.\nEagles Brothers — Houston, TX."
          : "Your all-in-one construction platform.\nBuilt for Eagles Brothers — Houston, TX."}
      </div>
      {!fieldRole && (
        <div className="wizard-illustration">
          <div className="wiz-chips" style={{ justifyContent: "center", marginTop: 24 }}>
            {chips.map(f => (
              <div key={f} className="wiz-chip">
                <Zap style={{ width: 11, height: 11, color: "#e09422" }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
      {fieldRole && (
        <div className="wizard-illustration" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
          <div className="wiz-pictogram-hints">
            {(lang === "es"
              ? [
                  { icon: <Clock style={{ width: 22, height: 22, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.15)", label: "Entrada" },
                  { icon: <MapPin style={{ width: 22, height: 22, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.15)", label: "GPS" },
                  { icon: <ShieldCheck style={{ width: 22, height: 22, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.15)", label: "Seguridad" },
                  { icon: <Bell style={{ width: 22, height: 22, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.15)", label: "Alertas" },
                ]
              : [
                  { icon: <Clock style={{ width: 22, height: 22, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.15)", label: "Clock" },
                  { icon: <MapPin style={{ width: 22, height: 22, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.15)", label: "GPS" },
                  { icon: <ShieldCheck style={{ width: 22, height: 22, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.15)", label: "Safety" },
                  { icon: <Bell style={{ width: 22, height: 22, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.15)", label: "Alerts" },
                ]
            ).map((h, i) => (
              <div key={i} className="wiz-pictogram-hint">
                <div className="wiz-pictogram-hint-icon" style={{ background: h.iconBg }}>{h.icon}</div>
                <div className="wiz-pictogram-hint-label">{h.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepReady({ lang, onComplete }) {
  return (
    <div className="wizard-slide">
      <div className="wizard-ready-wrap">
        <div className="wizard-ready-ring">
          <CheckCircle style={{ width: 44, height: 44, color: "#e09422" }} />
        </div>
        <div className="wizard-title">
          {lang === "es" ? "¡Todo Listo!" : "You're All Set!"}
        </div>
        <div className="wizard-desc" style={{ maxWidth: 320, margin: "0 auto" }}>
          {lang === "es"
            ? "EBC-OS está listo. Puedes volver a ver este tutorial en Configuración."
            : "EBC-OS is ready. Revisit this tour anytime in Settings."}
        </div>
        <button className="wizard-btn wizard-launch" onClick={onComplete}>
          {lang === "es" ? "Abrir EBC-OS" : "Launch EBC-OS"}
        </button>
      </div>
    </div>
  );
}

// ─── ROLE FLOWS ──────────────────────────────────────────────────────────────

// ── Owner / Admin ────────────────────────────────────────────────────────────
function buildOwnerFlow({ onComplete, teamMembers, onAddMember, onRemoveMember }, lang) {
  const es = lang === "es";
  return [
    <StepWelcome key="w" lang={lang} roleBadge={es ? "Propietario / Admin" : "Owner / Admin"} />,

    // 1 Dashboard
    <div key="dash" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 1 de 7" : "Step 1 of 7"}</div>
      <div className="wizard-title">{es ? "Dashboard y KPIs" : "Dashboard & KPIs"}</div>
      <div className="wizard-desc">{es ? "Tu negocio en tiempo real: licitaciones, proyectos, ingresos y alertas." : "Real-time business intelligence — bids, projects, revenue, and alerts."}</div>
      <div className="wizard-illustration">
        <div className="wiz-kpi-grid">
          {[
            { icon: <BarChart2 style={{ width: 17, height: 17, color: "#3b82f6" }} />, bg: "rgba(59,130,246,0.12)", value: "8",    label: es ? "Licitaciones" : "Active Bids" },
            { icon: <DollarSign style={{ width: 17, height: 17, color: "#10b981" }} />, bg: "rgba(16,185,129,0.12)", value: "$2.4M", label: es ? "Volumen" : "Bid Volume" },
            { icon: <Building2  style={{ width: 17, height: 17, color: "#e09422" }} />, bg: "rgba(224,148,34,0.12)", value: "12",   label: es ? "Proyectos" : "Active Projects" },
            { icon: <TrendingUp style={{ width: 17, height: 17, color: "#e09422" }} />, bg: "rgba(224,148,34,0.12)", value: "+18%", label: es ? "Tasa Éxito" : "Win Rate" },
            { icon: <Clock      style={{ width: 17, height: 17, color: "#8b5cf6" }} />, bg: "rgba(139,92,246,0.12)", value: "312h", label: es ? "Esta Semana" : "This Week" },
            { icon: <Bell       style={{ width: 17, height: 17, color: "#ef4444" }} />, bg: "rgba(239,68,68,0.12)",  value: "3",    label: es ? "Alertas" : "Alerts" },
          ].map((k, i) => (
            <div key={i} className="wiz-kpi-card">
              <div className="wiz-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
              <div><div className="wiz-kpi-value">{k.value}</div><div className="wiz-kpi-label">{k.label}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>,

    // 2 Bid Pipeline
    <div key="bids" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 2 de 7" : "Step 2 of 7"}</div>
      <div className="wizard-title">{es ? "Pipeline de Licitaciones" : "Bid Pipeline"}</div>
      <div className="wizard-desc">{es ? "Desde invitación hasta adjudicación." : "From invite to award — track every opportunity."}</div>
      <div className="wizard-illustration">
        <PipelineIllustration lang={lang} />
        <div style={{ marginTop: 12 }}>
          <ActionCards cards={[
            { icon: <FileText style={{ width: 18, height: 18, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.1)", title: es ? "Agregar y Rastrear" : "Add & Track Bids", desc: es ? "Documentos, alcance, contactos del GC" : "Documents, scope, GC contacts" },
            { icon: <TrendingUp style={{ width: 18, height: 18, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.1)", title: es ? "Convertir a Proyecto" : "Convert to Project", desc: es ? "Un clic para licitaciones ganadas" : "One-click conversion when you win" },
          ]} />
        </div>
      </div>
    </div>,

    // 3 Projects
    <div key="proj" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 3 de 7" : "Step 3 of 7"}</div>
      <div className="wizard-title">{es ? "Gestión de Proyectos" : "Project Management"}</div>
      <div className="wizard-desc">{es ? "Ciclo completo: fases, OCs, RFIs, submittals y financieros." : "Full lifecycle — phases, COs, RFIs, submittals, financials."}</div>
      <div className="wizard-illustration">
        <PhaseIllustration lang={lang} />
        <div className="wiz-chips">
          {["Change Orders","RFIs","Submittals","Daily Reports","Financials","Punch Lists"].map(t => (
            <span key={t} className="wiz-chip">{t}</span>
          ))}
        </div>
      </div>
    </div>,

    // 4 Team
    <div key="team" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 4 de 7" : "Step 4 of 7"}</div>
      <div className="wizard-title">{es ? "Gestión del Equipo" : "Team Management"}</div>
      <div className="wizard-desc">{es ? "Invita usuarios y asigna roles. Opcional — hazlo ahora o en Configuración." : "Invite users, assign roles and permissions. Optional — do it now or later in Settings."}</div>
      <div className="wizard-illustration">
        <TeamInviteForm lang={lang} teamMembers={teamMembers} onAddMember={onAddMember} onRemoveMember={onRemoveMember} />
      </div>
    </div>,

    // 5 Profit
    <div key="profit" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 5 de 7" : "Step 5 of 7"}</div>
      <div className="wizard-title">{es ? "Análisis de Ganancias" : "Profit Analysis & Alerts"}</div>
      <div className="wizard-desc">{es ? "Monitorea márgenes. 14 alertas te avisan antes de que un proyecto esté en riesgo." : "Monitor your margins. 14 alert types warn you before a project goes sideways."}</div>
      <div className="wizard-illustration">
        <ActionCards cards={[
          { icon: <DollarSign style={{ width: 18, height: 18, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.1)", title: es ? "Labor vs. Contrato" : "Labor vs. Contract", desc: es ? "EBC hace 100% en mano de obra — rastrea cada hora" : "EBC makes 100% on labor — track every hour" },
          { icon: <AlertTriangle style={{ width: 18, height: 18, color: "#f59e0b" }} />, iconBg: "rgba(245,158,11,0.1)", title: es ? "14 Tipos de Alerta" : "14 Alert Types", desc: es ? "Sobrecosto, retraso, RFI pendiente y más" : "Over-budget, schedule slip, pending RFI, and more" },
          { icon: <Bell style={{ width: 18, height: 18, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.1)", title: es ? "Notificaciones en Tiempo Real" : "Real-Time Notifications", desc: es ? "Panel en el encabezado — navega directo" : "Notification panel — deep-link navigation" },
        ]} />
      </div>
    </div>,

    // 6 Customer Portal
    <div key="portal" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 6 de 7" : "Step 6 of 7"}</div>
      <div className="wizard-title">{es ? "Portal del Cliente" : "Customer Portal"}</div>
      <div className="wizard-desc">{es ? "Comparte actualizaciones con clientes y GCs desde EBC-OS." : "Share project updates with clients and GCs directly from EBC-OS."}</div>
      <div className="wizard-illustration">
        <ActionCards cards={[
          { icon: <Users style={{ width: 18, height: 18, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.1)", title: es ? "Directorio de Contactos" : "Contact Directory", desc: es ? "GCs, propietarios, subcontratistas" : "GCs, owners, and subs — all in one place" },
          { icon: <FileText style={{ width: 18, height: 18, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.1)", title: es ? "Documentos Compartidos" : "Document Sharing", desc: es ? "Submittals, RFIs y planos" : "Submittals, RFIs, and drawings" },
          { icon: <AlertTriangle style={{ width: 18, height: 18, color: "#ef4444" }} />, iconBg: "rgba(239,68,68,0.1)", title: es ? "Reportar Problemas" : "Report a Problem", desc: es ? "Cualquier usuario puede escalar un problema al PM" : "Any user can escalate issues to the PM" },
        ]} />
      </div>
    </div>,

    // 7 Settings
    <div key="settings" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 7 de 7" : "Step 7 of 7"}</div>
      <div className="wizard-title">{es ? "Configuración" : "Settings & Themes"}</div>
      <div className="wizard-desc">{es ? "Personaliza temas, idioma, usuarios e integraciones." : "Customize themes, language, users, integrations, and more."}</div>
      <div className="wizard-illustration">
        <div className="wiz-chips" style={{ justifyContent: "center" }}>
          {(es
            ? ["Temas Dark/Light","Idioma EN/ES","Gestión de Usuarios","QuickBooks Sync","Permisos de Roles","Notificaciones","Ver Tour de Nuevo"]
            : ["Dark/Light Themes","EN/ES Language","User Management","QuickBooks Sync","Role Permissions","Notification Settings","Re-run this Tour"]
          ).map(f => (
            <div key={f} className="wiz-chip">
              <Settings style={{ width: 11, height: 11, color: "#e09422" }} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>,

    <StepReady key="ready" lang={lang} onComplete={onComplete} />,
  ];
}

// ── PM Flow ──────────────────────────────────────────────────────────────────
function buildPMFlow({ onComplete, teamMembers, onAddMember, onRemoveMember }, lang) {
  const es = lang === "es";
  return [
    <StepWelcome key="w" lang={lang} roleBadge={es ? "Gerente de Proyecto" : "Project Manager"} />,

    <div key="dash" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 1 de 7" : "Step 1 of 7"}</div>
      <div className="wizard-title">{es ? "Acciones Rápidas" : "Dashboard Quick Actions"}</div>
      <div className="wizard-desc">{es ? "Tu punto de partida diario — licitaciones, proyectos, alertas y agenda." : "Your daily starting point — active bids, projects, alerts, and your schedule."}</div>
      <div className="wizard-illustration">
        <ActionCards cards={[
          { icon: <BarChart2 style={{ width: 18, height: 18, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.1)", title: es ? "Vista General" : "Overview", desc: es ? "KPIs, alertas y resumen del día" : "KPIs, active alerts, and morning brief" },
          { icon: <Bell style={{ width: 18, height: 18, color: "#f59e0b" }} />, iconBg: "rgba(245,158,11,0.1)", title: es ? "Notificaciones" : "Notifications", desc: es ? "14 tipos — toca para navegar directo" : "14 alert types — tap to deep-navigate" },
          { icon: <Calendar style={{ width: 18, height: 18, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.1)", title: es ? "Calendario" : "Calendar & Schedule", desc: es ? "Fechas límite y horario del equipo" : "Deadlines, appointments, and crew schedule" },
        ]} />
      </div>
    </div>,

    <div key="bids" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 2 de 7" : "Step 2 of 7"}</div>
      <div className="wizard-title">{es ? "Pipeline de Licitaciones" : "Bid Pipeline"}</div>
      <div className="wizard-desc">{es ? "Estimación, envío y seguimiento. El sistema previene licitaciones duplicadas." : "Estimating, submitting, and tracking bids. Duplicate prevention keeps your pipeline clean."}</div>
      <div className="wizard-illustration">
        <PipelineIllustration lang={lang} />
        <div style={{ marginTop: 10 }}>
          <ActionCards cards={[
            { icon: <AlertTriangle style={{ width: 18, height: 18, color: "#f59e0b" }} />, iconBg: "rgba(245,158,11,0.1)", title: es ? "Prevención de Duplicados" : "Duplicate Prevention", desc: es ? "Te notificamos si ya tienes una licitación similar" : "Notified if a similar bid already exists" },
          ]} />
        </div>
      </div>
    </div>,

    <div key="proj" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 3 de 7" : "Step 3 of 7"}</div>
      <div className="wizard-title">{es ? "Detalle del Proyecto" : "Project Detail"}</div>
      <div className="wizard-desc">{es ? "Fases, OCs, RFIs, submittals, cuadrilla, financieros y cierre." : "Phases, COs, RFIs, submittals, crew, financials, and closeout — all in one place."}</div>
      <div className="wizard-illustration">
        <PhaseIllustration lang={lang} />
        <div className="wiz-chips">
          {["Change Orders","RFIs","Submittals","Crew","Financials","Closeout","Daily Reports"].map(t => <span key={t} className="wiz-chip">{t}</span>)}
        </div>
      </div>
    </div>,

    <div key="foremen" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 4 de 7" : "Step 4 of 7"}</div>
      <div className="wizard-title">{es ? "Asignar Capataces" : "Assigning Foremen"}</div>
      <div className="wizard-desc">{es ? "Asigna capataces y cuadrillas desde la ficha del proyecto." : "Assign foremen and crew to projects from the project card."}</div>
      <div className="wizard-illustration">
        <ActionCards cards={[
          { icon: <HardHat style={{ width: 18, height: 18, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.1)", title: es ? "Portal del Capataz" : "Foreman Portal", desc: es ? "Capataces ven sus proyectos y cuadrilla asignada" : "Foremen see their assigned projects and crew" },
          { icon: <Users style={{ width: 18, height: 18, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.1)", title: es ? "Gestión de Cuadrilla" : "Crew Management", desc: es ? "Rastrea horas y asignaciones por proyecto" : "Track hours, search employees, assignments" },
        ]} />
      </div>
    </div>,

    <div key="mat" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 5 de 7" : "Step 5 of 7"}</div>
      <div className="wizard-title">{es ? "Materiales y Takeoffs" : "Material Takeoffs"}</div>
      <div className="wizard-desc">{es ? "Genera takeoffs, aprueba solicitudes y rastrea entregas." : "Generate takeoffs, approve requests, and track deliveries."}</div>
      <div className="wizard-illustration">
        <ActionCards cards={[
          { icon: <Package style={{ width: 18, height: 18, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.1)", title: es ? "Solicitudes de Material" : "Material Requests", desc: es ? "La cuadrilla solicita, tú apruebas" : "Crew requests, you approve" },
          { icon: <Truck style={{ width: 18, height: 18, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.1)", title: es ? "Seguimiento de Entregas" : "Delivery Tracking", desc: es ? "Programa fechas y rastrea el estado" : "Schedule dates and track delivery status" },
        ]} />
      </div>
    </div>,

    <div key="profit" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 6 de 7" : "Step 6 of 7"}</div>
      <div className="wizard-title">{es ? "Monitoreo de Ganancias" : "Profit Monitoring"}</div>
      <div className="wizard-desc">{es ? "Costo de mano de obra vs. contrato. El sistema te alerta antes de que se pierdan márgenes." : "Labor cost vs. contract. Alerts before margins slip."}</div>
      <div className="wizard-illustration">
        <ActionCards cards={[
          { icon: <DollarSign style={{ width: 18, height: 18, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.1)", title: es ? "Tab Financiero" : "Financials Tab", desc: es ? "Presupuesto, gastado, facturado y margen" : "Budget, spent, billed, and margin" },
          { icon: <AlertTriangle style={{ width: 18, height: 18, color: "#ef4444" }} />, iconBg: "rgba(239,68,68,0.1)", title: es ? "Alertas de Costo" : "Cost Alerts", desc: es ? "Aviso si el costo supera el presupuesto" : "Warning when costs exceed budget" },
          { icon: <MessageSquare style={{ width: 18, height: 18, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.1)", title: es ? "Reportar Problema" : "Report a Problem", desc: es ? "Escala al propietario en segundos" : "Escalate to owner/admin fast" },
        ]} />
      </div>
    </div>,

    <div key="notif" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 7 de 7" : "Step 7 of 7"}</div>
      <div className="wizard-title">{es ? "Notificaciones" : "Notification System"}</div>
      <div className="wizard-desc">{es ? "14 alertas. Cada una enlaza directo a lo que necesita atención." : "14 alert types — each deep-links to exactly what needs action."}</div>
      <div className="wizard-illustration">
        <div className="wiz-chips" style={{ justifyContent: "center" }}>
          {(es
            ? ["Sobrecosto","Retraso","RFI Pendiente","Submittal Vencido","OC sin Aprobar","Material Demorado","JSA Incompleta","Sin Capataz","Factura Vencida","Plazo Licitación","Horas Extra","Conflicto Horario","Alerta Clima","Duplicado Licitación"]
            : ["Over-Budget","Schedule Slip","Pending RFI","Overdue Submittal","Unapproved CO","Delayed Material","Incomplete JSA","No Foreman","Overdue Invoice","Bid Deadline","Overtime","Schedule Conflict","Weather Alert","Bid Duplicate"]
          ).map(f => <div key={f} className="wiz-chip"><Bell style={{ width: 11, height: 11, color: "#e09422" }} />{f}</div>)}
        </div>
      </div>
    </div>,

    <StepReady key="ready" lang={lang} onComplete={onComplete} />,
  ];
}

// ── Foreman Flow (Spanish-first, bilingual) ───────────────────────────────────
function buildForemanFlow({ onComplete }, lang) {
  // Foreman: always show Spanish primary, English secondary in smaller text
  // We ignore the lang toggle for the primary label — Spanish is always first
  // but we use lang to decide if English notes are shown

  const bilingual = (es, en) => (
    <>
      {es}
      {lang === "en" ? null : <div className="wiz-action-desc-en">{en}</div>}
    </>
  );

  const card = (icon, iconBg, titleEs, titleEn, descEs, descEn) => ({
    icon, iconBg,
    title: lang === "en" ? titleEn : titleEs,
    desc: lang === "en" ? descEn : descEs,
    descEn: lang === "en" ? null : descEn,
  });

  const label = (stepEs, stepEn) => lang === "en" ? stepEn : stepEs;

  return [
    <StepWelcome key="w" lang={lang} roleBadge={lang === "en" ? "Foreman / Superintendent" : "Capataz / Superintendente"} fieldRole />,

    // 1 Clock In/Out
    <div key="clock" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 1 de 8","Step 1 of 8")}</div>
      <div className="wizard-title">{label("Entrada / Salida","Clock In / Out")}</div>
      <div className="wizard-desc">{label("PIN + proyecto. GPS verifica tu ubicación en el sitio.","PIN + project. GPS verifies your location on site.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Clock style={{ width: 22, height: 22, color: "#10b981" }} />, "rgba(16,185,129,0.15)", "PIN + Proyecto", "PIN + Project", "Ingresa tu PIN, elige el proyecto, listo", "Enter your PIN, pick the project, you're in"),
          card(<MapPin style={{ width: 22, height: 22, color: "#3b82f6" }} />, "rgba(59,130,246,0.15)", "GPS Automático", "Auto GPS", "Si estás fuera del perímetro, ingresa una razón", "Outside the perimeter? Enter an override reason"),
        ]} />
      </div>
    </div>,

    // 2 Crew Management
    <div key="crew" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 2 de 8","Step 2 of 8")}</div>
      <div className="wizard-title">{label("Gestión de Cuadrilla","Crew Management")}</div>
      <div className="wizard-desc">{label("Ve quién está en tu proyecto. Agrega y busca miembros.","See who's on your project. Add and search crew members.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Users style={{ width: 22, height: 22, color: "#e09422" }} />, "rgba(224,148,34,0.15)", "Ver Cuadrilla", "View Crew", "Lista de miembros asignados con sus horas", "All assigned members with hours worked"),
          card(<UserPlus style={{ width: 22, height: 22, color: "#8b5cf6" }} />, "rgba(139,92,246,0.15)", "Agregar Miembro", "Add to Crew", "Agrega trabajadores al proyecto desde el portal", "Add workers to the project from the portal"),
        ]} />
      </div>
    </div>,

    // 3 Phase Tracking
    <div key="phases" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 3 de 8","Step 3 of 8")}</div>
      <div className="wizard-title">{label("Actualizar Fases","Phase Tracking")}</div>
      <div className="wizard-desc">{label("Actualiza el progreso de cada fase. El PM lo ve en tiempo real.","Update phase progress. Your PM sees it in real time.")}</div>
      <div className="wizard-illustration">
        <PhaseIllustration lang={lang} />
        <div style={{ marginTop: 10 }}>
          <ActionCards size="field" cards={[
            card(<Layers style={{ width: 22, height: 22, color: "#e09422" }} />, "rgba(224,148,34,0.15)", "Toca para Actualizar", "Tap to Update", "Desliza el porcentaje desde tu teléfono", "Slide the progress % from your phone"),
          ]} />
        </div>
      </div>
    </div>,

    // 4 JSA
    <div key="jsa" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 4 de 8","Step 4 of 8")}</div>
      <div className="wizard-title">{label("JSA / Seguridad Pre-Tarea","JSA / Pre-Task Safety")}</div>
      <div className="wizard-desc">{label("Selecciona peligros, reglas de clima, y haz que la cuadrilla firme.","Select hazards, weather rules, and get crew signatures.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<ShieldCheck style={{ width: 22, height: 22, color: "#10b981" }} />, "rgba(16,185,129,0.15)", "Seleccionar Peligros", "Select Hazards", "Marca los peligros del día para el plan de seguridad", "Mark today's hazards for the safety plan"),
          card(<CheckSquare style={{ width: 22, height: 22, color: "#3b82f6" }} />, "rgba(59,130,246,0.15)", "Firmas de Cuadrilla", "Crew Sign-Off", "Cada trabajador firma — en su teléfono o el tuyo", "Each worker signs on-device or passes yours"),
          card(<Flag style={{ width: 22, height: 22, color: "#f59e0b" }} />, "rgba(245,158,11,0.15)", "Tu Firma Final", "Your Supervisor Sign-Off", "Tú firmas al final para cerrar el registro", "You sign last to close the safety record"),
        ]} />
      </div>
    </div>,

    // 5 Material Requests
    <div key="mat" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 5 de 8","Step 5 of 8")}</div>
      <div className="wizard-title">{label("Solicitar Materiales","Material Requests")}</div>
      <div className="wizard-desc">{label("Solicita desde el campo. El PM recibe la solicitud y la aprueba.","Request from the field. Your PM gets notified and approves.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Package style={{ width: 22, height: 22, color: "#e09422" }} />, "rgba(224,148,34,0.15)", "Material + Cantidad", "Material + Quantity", "Elige proyecto, material, cantidad y envía", "Pick project, material, quantity, and submit"),
          card(<Truck style={{ width: 22, height: 22, color: "#3b82f6" }} />, "rgba(59,130,246,0.15)", "Estado de Entrega", "Delivery Status", "Ve si tu solicitud fue aprobada o entregada", "See if your request was approved or delivered"),
        ]} />
      </div>
    </div>,

    // 6 Daily Reports
    <div key="reports" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 6 de 8","Step 6 of 8")}</div>
      <div className="wizard-title">{label("Reportes Diarios","Daily Reports")}</div>
      <div className="wizard-desc">{label("Documenta horas, progreso, clima e incidentes del día.","Document hours, progress, weather, and incidents.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Clipboard style={{ width: 22, height: 22, color: "#10b981" }} />, "rgba(16,185,129,0.15)", "Reporte de Hoy", "Today's Report", "Horas de cuadrilla, avance de tareas, observaciones", "Crew hours, task progress, observations"),
          card(<Camera style={{ width: 22, height: 22, color: "#8b5cf6" }} />, "rgba(139,92,246,0.15)", "Adjuntar Fotos", "Attach Photos", "Toma fotos del sitio directo en el reporte", "Capture site photos directly in the report"),
        ]} />
      </div>
    </div>,

    // 7 Report Problem
    <div key="problem" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 7 de 8","Step 7 of 8")}</div>
      <div className="wizard-title">{label("Reportar un Problema","Report a Problem")}</div>
      <div className="wizard-desc">{label("¿Algo no está bien? Escala al PM o al dueño en segundos.","Something wrong? Escalate to your PM or owner in seconds.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<AlertTriangle style={{ width: 22, height: 22, color: "#ef4444" }} />, "rgba(239,68,68,0.15)", "Describe el Problema", "Describe the Issue", "Tipo, prioridad, descripción y foto opcional", "Type, priority, description, optional photo"),
          card(<Bell style={{ width: 22, height: 22, color: "#f59e0b" }} />, "rgba(245,158,11,0.15)", "Alerta Inmediata", "Immediate Alert", "El PM recibe una notificación al instante", "Your PM gets an alert instantly"),
        ]} />
      </div>
    </div>,

    // 8 Drawings
    <div key="docs" className="wizard-slide">
      <div className="wizard-step-label">{label("Paso 8 de 8","Step 8 of 8")}</div>
      <div className="wizard-title">{label("Planos y Documentos","Drawings & Documents")}</div>
      <div className="wizard-desc">{label("Accede a planos y submittals desde tu teléfono.","Access drawings and submittals from your phone.")}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<BookOpen style={{ width: 22, height: 22, color: "#3b82f6" }} />, "rgba(59,130,246,0.15)", "Tab de Documentos", "Documents Tab", "Planos, especificaciones y fotos del sitio", "Drawings, specs, and site photos"),
          card(<FileSearch style={{ width: 22, height: 22, color: "#e09422" }} />, "rgba(224,148,34,0.15)", "Submittals y RFIs", "Submittals & RFIs", "Estado de submittals y envío de RFIs", "View submittal status and submit RFIs"),
        ]} />
      </div>
    </div>,

    <StepReady key="ready" lang={lang} onComplete={onComplete} />,
  ];
}

// ── Employee/Crew Flow — DEAD SIMPLE, Spanish-first, pictogram style ──────────
function buildEmployeeFlow({ onComplete }, lang) {
  const es = lang !== "en"; // default Spanish for crew

  return [
    // 0 Welcome (with field icons)
    <StepWelcome key="w" lang={lang} roleBadge={es ? "Empleado / Cuadrilla" : "Employee / Crew"} fieldRole />,

    // 1 Clock In/Out — PICTOGRAM
    <div key="clock" className="wizard-slide">
      <div className="wizard-step-label">{es ? "1 de 4" : "1 of 4"}</div>
      <div className="wizard-title">{es ? "Entrada / Salida" : "Clock In / Out"}</div>
      <div className="wizard-illustration">
        <PictogramStep
          iconEl={<Clock style={{ width: 48, height: 48, color: "#10b981" }} />}
          iconBg="rgba(16,185,129,0.18)"
          title={es ? "Registra tu tiempo" : "Log your time"}
          desc={es ? "PIN → Proyecto → Listo" : "PIN → Project → Done"}
          hints={[
            { icon: <Clock style={{ width: 22, height: 22, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.15)", label: es ? "PIN" : "PIN" },
            { icon: <Building2 style={{ width: 22, height: 22, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.15)", label: es ? "Proyecto" : "Project" },
            { icon: <MapPin style={{ width: 22, height: 22, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.15)", label: "GPS" },
          ]}
        />
      </div>
    </div>,

    // 2 Schedule — PICTOGRAM
    <div key="sched" className="wizard-slide">
      <div className="wizard-step-label">{es ? "2 de 4" : "2 of 4"}</div>
      <div className="wizard-title">{es ? "Tu Horario" : "Your Schedule"}</div>
      <div className="wizard-illustration">
        <PictogramStep
          iconEl={<Calendar style={{ width: 48, height: 48, color: "#8b5cf6" }} />}
          iconBg="rgba(139,92,246,0.18)"
          title={es ? "Tu semana" : "Your week"}
          desc={es ? "Días de trabajo y proyecto asignado" : "Work days and project assignment"}
          hints={[
            { icon: <Calendar style={{ width: 22, height: 22, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.15)", label: es ? "Lun–Vie" : "Mon–Fri" },
            { icon: <Building2 style={{ width: 22, height: 22, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.15)", label: es ? "Sitio" : "Site" },
          ]}
        />
      </div>
    </div>,

    // 3 JSA Safety — PICTOGRAM
    <div key="jsa" className="wizard-slide">
      <div className="wizard-step-label">{es ? "3 de 4" : "3 of 4"}</div>
      <div className="wizard-title">{es ? "Seguridad" : "Safety"}</div>
      <div className="wizard-illustration">
        <PictogramStep
          iconEl={<ShieldCheck style={{ width: 48, height: 48, color: "#10b981" }} />}
          iconBg="rgba(16,185,129,0.18)"
          title={es ? "Firma cada mañana" : "Sign every morning"}
          desc={es ? "Lee los peligros → firma → trabaja seguro" : "Review hazards → sign → work safe"}
          hints={[
            { icon: <AlertTriangle style={{ width: 22, height: 22, color: "#f59e0b" }} />, iconBg: "rgba(245,158,11,0.15)", label: es ? "Peligros" : "Hazards" },
            { icon: <CheckSquare style={{ width: 22, height: 22, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.15)", label: es ? "Firma" : "Sign" },
            { icon: <AlertTriangle style={{ width: 22, height: 22, color: "#ef4444" }} />, iconBg: "rgba(239,68,68,0.15)", label: es ? "Reportar" : "Report" },
          ]}
        />
      </div>
    </div>,

    // 4 Your Hours — PICTOGRAM
    <div key="pay" className="wizard-slide">
      <div className="wizard-step-label">{es ? "4 de 4" : "4 of 4"}</div>
      <div className="wizard-title">{es ? "Tus Horas" : "Your Hours"}</div>
      <div className="wizard-illustration">
        <PictogramStep
          iconEl={<CreditCard style={{ width: 48, height: 48, color: "#e09422" }} />}
          iconBg="rgba(224,148,34,0.18)"
          title={es ? "Tu registro de tiempo" : "Your time log"}
          desc={es ? "Horas de esta semana y períodos de pago" : "This week's hours and pay periods"}
          hints={[
            { icon: <Clock style={{ width: 22, height: 22, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.15)", label: es ? "Horas" : "Hours" },
            { icon: <CreditCard style={{ width: 22, height: 22, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.15)", label: es ? "Pago" : "Pay" },
          ]}
        />
      </div>
    </div>,

    <StepReady key="ready" lang={lang} onComplete={onComplete} />,
  ];
}

// ── Driver Flow — Spanish-first ───────────────────────────────────────────────
function buildDriverFlow({ onComplete }, lang) {
  const es = lang !== "en";
  const card = (icon, iconBg, titleEs, titleEn, descEs, descEn) => ({
    icon, iconBg,
    title: es ? titleEs : titleEn,
    desc: es ? descEs : descEn,
  });

  return [
    <StepWelcome key="w" lang={lang} roleBadge={es ? "Conductor" : "Driver"} fieldRole />,

    <div key="route" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 1 de 4" : "Step 1 of 4"}</div>
      <div className="wizard-title">{es ? "Tu Ruta" : "Your Delivery Route"}</div>
      <div className="wizard-desc">{es ? "Las entregas de hoy: pendientes, en tránsito y completadas." : "Today's deliveries — pending, in transit, and completed."}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Route style={{ width: 22, height: 22, color: "#3b82f6" }} />, "rgba(59,130,246,0.15)", "Lista de Pendientes", "Pending Queue", "Tus entregas del día en orden", "Today's deliveries listed in order"),
          card(<Truck style={{ width: 22, height: 22, color: "#e09422" }} />, "rgba(224,148,34,0.15)", "En Tránsito", "In Transit", "Marca 'en camino' cuando salgas", "Mark 'in transit' when you leave"),
        ]} />
      </div>
    </div>,

    <div key="sched" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 2 de 4" : "Step 2 of 4"}</div>
      <div className="wizard-title">{es ? "Programar Entregas" : "Schedule Deliveries"}</div>
      <div className="wizard-desc">{es ? "Asigna fechas a cada artículo. El equipo sabe cuándo llega." : "Set delivery dates per item. The team knows when things arrive."}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Calendar style={{ width: 22, height: 22, color: "#8b5cf6" }} />, "rgba(139,92,246,0.15)", "Fecha por Artículo", "Date Per Item", "Cada artículo tiene su propia fecha de entrega", "Each item gets its own delivery date"),
          card(<Bell style={{ width: 22, height: 22, color: "#f59e0b" }} />, "rgba(245,158,11,0.15)", "PM Notificado", "PM Notified", "Las fechas aparecen en el sistema del PM", "Scheduled dates appear in the PM's system"),
        ]} />
      </div>
    </div>,

    <div key="deliver" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 3 de 4" : "Step 3 of 4"}</div>
      <div className="wizard-title">{es ? "Entregar y Navegar" : "Deliver & Navigate"}</div>
      <div className="wizard-desc">{es ? "Un toque para marcar entregado. Navegación integrada al sitio." : "One tap to mark delivered. Built-in navigation to job sites."}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<PackageCheck style={{ width: 22, height: 22, color: "#10b981" }} />, "rgba(16,185,129,0.15)", "Marcar Entregado", "Mark Delivered", "Un toque para confirmar la entrega", "One tap to confirm delivery"),
          card(<Navigation style={{ width: 22, height: 22, color: "#3b82f6" }} />, "rgba(59,130,246,0.15)", "Navegar al Sitio", "Navigate to Site", "Abre Maps con la dirección del trabajo", "Opens Maps with the job site address"),
          card(<AlertTriangle style={{ width: 22, height: 22, color: "#ef4444" }} />, "rgba(239,68,68,0.15)", "Reportar Problema", "Report a Problem", "Daño o entrega fallida — repórtalo al PM", "Damage or failed delivery — report to PM"),
        ]} />
      </div>
    </div>,

    <div key="clock" className="wizard-slide">
      <div className="wizard-step-label">{es ? "Paso 4 de 4" : "Step 4 of 4"}</div>
      <div className="wizard-title">{es ? "Entrada / Salida" : "Clock In / Out"}</div>
      <div className="wizard-desc">{es ? "Registra tu tiempo igual que el resto del equipo." : "Log your time the same as the rest of the team."}</div>
      <div className="wizard-illustration">
        <ActionCards size="field" cards={[
          card(<Clock style={{ width: 22, height: 22, color: "#10b981" }} />, "rgba(16,185,129,0.15)", "Reloj de Tiempo", "Time Clock", "PIN → proyecto → entrada o salida", "PIN → project → clock in or out"),
        ]} />
      </div>
    </div>,

    <StepReady key="ready" lang={lang} onComplete={onComplete} />,
  ];
}

// ─── Team Invite Form ─────────────────────────────────────────────────────────

function TeamInviteForm({ lang, teamMembers, onAddMember, onRemoveMember }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pm");
  const [pin, setPin] = useState("");
  const es = lang === "es";

  const handleAdd = () => {
    if (!name.trim() || !email.trim()) return;
    onAddMember({ name: name.trim(), email: email.trim(), role, pin });
    setName(""); setEmail(""); setRole("pm"); setPin("");
  };

  const ROLE_OPTIONS = Object.entries(ROLES).filter(([k]) => k !== "owner");

  return (
    <>
      <div className="wizard-team-form">
        <div className="wizard-team-field">
          <label className="wizard-team-label">{es ? "Nombre" : "Name"}</label>
          <input className="wizard-team-input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="wizard-team-field">
          <label className="wizard-team-label">{es ? "Correo" : "Email"}</label>
          <input className="wizard-team-input" placeholder="john@ebc.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="wizard-team-field">
          <label className="wizard-team-label">{es ? "Rol" : "Role"}</label>
          <select className="wizard-team-select" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
          </select>
        </div>
        <div className="wizard-team-field">
          <label className="wizard-team-label">PIN</label>
          <input className="wizard-team-input" placeholder="4–6 dígitos" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      <div className="wizard-team-actions">
        <button className="wizard-btn" style={{ padding: "7px 16px", fontSize: 13 }} onClick={handleAdd}>
          <UserPlus style={{ width: 14, height: 14 }} />
          {es ? "Agregar" : "Add"}
        </button>
      </div>
      {teamMembers.length > 0 && (
        <div className="wizard-team-list">
          {teamMembers.map((m, i) => (
            <div key={i} className="wizard-team-row">
              <span className="wizard-team-row-name">{m.name}</span>
              <span className="wizard-team-row-role">{ROLES[m.role]?.label || m.role}</span>
              <button className="wizard-team-remove" onClick={() => onRemoveMember(i)}>×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function OnboardingWizard({ auth, onComplete }) {
  const roleGroup = getRoleGroup(auth?.role);

  // Language: field roles default to Spanish, office roles to English
  // Respect explicit user preference from localStorage if set
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem("ebc_lang");
    return stored || getDefaultLang(roleGroup);
  });

  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [teamMembers, setTeamMembers] = useState([]);
  const touchStartX = useRef(null);

  const handleLangChange = (l) => {
    localStorage.setItem("ebc_lang", l);
    setLang(l);
  };

  const handleAddMember = useCallback(({ name, email, role, pin }) => {
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      users.push({
        id: users.length + 1, name, email: email.toLowerCase(),
        password: hashPasswordSync(pin || "ebc2026"), role,
        pin: pin ? hashPasswordSync(pin) : null,
        mustChangePassword: true, createdAt: new Date().toISOString(),
      });
      localStorage.setItem("ebc_users", JSON.stringify(users));
    } catch {}
    setTeamMembers(prev => [...prev, { name, email, role }]);
  }, []);

  const handleRemoveMember = useCallback((idx) => {
    const member = teamMembers[idx];
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      localStorage.setItem("ebc_users", JSON.stringify(
        users.filter(u => u.email?.toLowerCase() !== member.email?.toLowerCase())
      ));
    } catch {}
    setTeamMembers(prev => prev.filter((_, i) => i !== idx));
  }, [teamMembers]);

  const handleComplete = useCallback(() => {
    const role = auth?.role || "employee";
    localStorage.setItem(storageKey(role), "true");
    localStorage.setItem("ebc_onboarding_complete", "true"); // legacy compat
    onComplete();
  }, [auth, onComplete]);

  const helpers = { onComplete: handleComplete, teamMembers, onAddMember: handleAddMember, onRemoveMember: handleRemoveMember };

  const steps = (() => {
    switch (roleGroup) {
      case "owner":   return buildOwnerFlow(helpers, lang);
      case "pm":      return buildPMFlow(helpers, lang);
      case "foreman": return buildForemanFlow(helpers, lang);
      case "driver":  return buildDriverFlow(helpers, lang);
      default:        return buildEmployeeFlow(helpers, lang);
    }
  })();

  const TOTAL = steps.length;

  const goTo = (target) => {
    if (target === step || target < 0 || target >= TOTAL) return;
    setSlideDir(target > step ? 1 : -1);
    setAnimKey(k => k + 1);
    setStep(target);
  };
  const next = () => goTo(step + 1);
  const prev = () => goTo(step - 1);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  const isLastStep = step === TOTAL - 1;
  const isFieldRole = ["foreman","employee","driver"].includes(roleGroup);
  const slideClass = `wizard-slide ${slideDir > 0 ? "forward" : "backward"}`;

  return (
    <div className="wizard-screen" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{wizardStyles}</style>
      <div className="wizard-bg" />
      <div className="wizard-grid" />

      <div className="wizard-card">
        {/* Top bar */}
        <div className="wizard-topbar">
          {/* Language toggle — always visible */}
          <div className="wizard-lang-toggle">
            <button className={`wizard-lang-btn${lang === "en" ? " active" : ""}`} onClick={() => handleLangChange("en")}>EN</button>
            <button className={`wizard-lang-btn${lang === "es" ? " active" : ""}`} onClick={() => handleLangChange("es")}>ES</button>
          </div>
          <button className="wizard-topbar-btn danger" onClick={handleComplete}>
            <X style={{ width: 12, height: 12 }} />
            {lang === "es" ? "No mostrar más" : "Never show again"}
          </button>
          {!isLastStep && (
            <button className="wizard-topbar-btn" onClick={handleComplete}>
              {lang === "es" ? "Omitir" : "Skip"}
            </button>
          )}
        </div>

        {/* Slide */}
        <div className="wizard-content">
          <div key={`${animKey}-${lang}`} className={slideClass} style={{ flex: 1 }}>
            {steps[step]}
          </div>
        </div>

        {/* Footer */}
        {!isLastStep && (
          <div className="wizard-footer">
            <div className="wizard-dots">
              {Array.from({ length: TOTAL }, (_, i) => (
                <div
                  key={i}
                  className={`wizard-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <div className="wizard-nav">
              {step > 0 && (
                <button className="wizard-btn wizard-btn-ghost" onClick={prev}>
                  <ChevronLeft style={{ width: 16, height: 16 }} />
                  {lang === "es" ? "Atrás" : "Back"}
                </button>
              )}
              <button className="wizard-btn" onClick={next}>
                {step === 0
                  ? <>{lang === "es" ? "Empezar" : "Get Started"} <ChevronRight style={{ width: 16, height: 16 }} /></>
                  : <>{lang === "es" ? "Siguiente" : "Next"} <ChevronRight style={{ width: 16, height: 16 }} /></>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
