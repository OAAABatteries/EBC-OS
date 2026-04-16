// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Onboarding Wizard  (role-aware)
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import {
  BarChart2, FileText, Building2, Clock, HardHat,
  TrendingUp, DollarSign, CheckCircle, Users, ClipboardList,
  ArrowRight, Target, Layers, UserPlus, Zap, Package,
  ChevronLeft, ChevronRight, X, Bell, Truck, MapPin,
  AlertTriangle, Calendar, ShieldCheck, BookOpen, Wrench,
  ClipboardCheck, Navigation, CheckSquare
} from "lucide-react";
import { ROLES } from "../data/roles";
import { hashPasswordSync } from "../utils/passwordHash";

// ─── helpers ────────────────────────────────────────────────────
const ADMIN_ROLES  = ["owner", "admin", "office_admin"];
const FIELD_ROLES  = ["foreman", "employee", "driver"];

function roleFamily(role) {
  if (ADMIN_ROLES.includes(role))  return "admin";
  if (role === "pm")               return "pm";
  if (role === "superintendent")   return "foreman";  // field leadership family
  if (role === "foreman")          return "foreman";
  if (role === "estimator")        return "pm";        // office/preconstruction family
  if (role === "project_engineer") return "pm";
  if (role === "safety")           return "foreman";   // field-adjacent
  if (role === "accounting")       return "admin";
  if (role === "employee")         return "employee";
  if (role === "driver")           return "driver";
  return "admin"; // fallback
}

function storageKey(role) {
  return `ebc_onboarding_completed_${role}`;
}

// ─── styles ─────────────────────────────────────────────────────
const wizardStyles = `
@keyframes slideFromRight {
  from { opacity: 0; transform: translateX(48px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideFromLeft {
  from { opacity: 0; transform: translateX(-48px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes wizFadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Screen ── */
.wizard-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #06080c;
  font-family: var(--font-body);
  position: relative;
  overflow: hidden;
  /* iOS standalone PWA: respect safe-area so content clears the notch and home indicator */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.wizard-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 25% 15%, rgba(224,148,34,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 85%, rgba(59,130,246,0.04) 0%, transparent 55%);
}
.wizard-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(224,148,34,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(224,148,34,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ── Card ── */
.wizard-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 580px;
  margin: var(--space-4);
  background: rgba(12,15,22,0.9);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 40px 40px 32px;
  box-shadow: 0 32px 100px rgba(0,0,0,0.6);
  min-height: 520px;
  display: flex;
  flex-direction: column;
}
/* Mobile: let the card fill the screen so there's no dark band top/bottom in PWA standalone */
@media (max-width: 640px) {
  .wizard-card {
    min-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px);
    min-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px);
    margin: var(--space-2);
    padding: 24px 20px 20px;
    border-radius: 16px;
    max-width: 100%;
  }
}

/* ── Top bar ── */
.wizard-topbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-bottom: 28px;
}
.wizard-topbar-btn {
  background: none;
  border: 1px solid #1c2233;
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 12px;
  color: #8494ad;
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.wizard-topbar-btn:hover { border-color: #455068; color: #d4dae6; }
.wizard-topbar-btn.danger:hover { border-color: rgba(239,68,68,0.4); color: #ef4444; }

/* ── Slide content ── */
.wizard-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.wizard-slide {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.wizard-slide.forward  { animation: slideFromRight 0.35s ease; }
.wizard-slide.backward { animation: slideFromLeft  0.35s ease; }

/* ── Step header ── */
.wizard-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  display: block;
  margin: "0" auto 14px;
}
.wizard-step-label {
  text-align: center;
  font-size: 11px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #e09422;
  margin-bottom: 6px;
  font-weight: 600;
}
.wizard-title {
  font-family: var(--font-head);
  font-size: 28px;
  font-weight: 700;
  color: #f0f4fa;
  text-align: center;
  letter-spacing: 0.5px;
  line-height: 1.1;
}
.wizard-title-sub {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  color: #455068;
  text-align: center;
  margin-top: 3px;
}
.wizard-desc {
  font-size: 14px;
  color: #8494ad;
  text-align: center;
  margin-top: 8px;
  line-height: 1.65;
}
.wizard-desc-sub {
  font-size: 12px;
  color: #455068;
  text-align: center;
  margin-top: 4px;
  line-height: 1.5;
}

/* ── Illustration area ── */
.wizard-illustration {
  margin-top: 24px;
  flex: 1;
}

/* KPI grid */
.wiz-kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.wiz-kpi-card {
  background: rgba(28,34,51,0.5);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px 14px;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  transition: border-color 0.2s;
}
.wiz-kpi-card:hover { border-color: rgba(224,148,34,0.2); }
.wiz-kpi-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wiz-kpi-value {
  font-family: var(--font-head);
  font-size: 20px;
  font-weight: 700;
  color: #f0f4fa;
  line-height: 1;
}
.wiz-kpi-label { font-size: 11px; color: #8494ad; margin-top: 2px; }

/* Pipeline */
.wiz-pipeline {
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: 4px 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.wiz-pipeline::-webkit-scrollbar { display: none; }
.wiz-pipeline-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.wiz-pipeline-dot {
  width: 44px; height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.wiz-pipeline-name {
  font-size: 10px;
  color: #8494ad;
  text-align: center;
  font-weight: 500;
  max-width: 56px;
  line-height: 1.2;
}
.wiz-pipeline-arrow {
  color: #1c2233;
  margin: "0" 2px;
  flex-shrink: 0;
  padding-bottom: 16px;
}

/* Phase bars */
.wiz-phases { display: flex; flex-direction: column; gap: var(--space-3); }
.wiz-phase-row { display: flex; align-items: center; gap: var(--space-3); }
.wiz-phase-name { font-size: 12px; color: #8494ad; width: 80px; flex-shrink: 0; font-weight: 500; }
.wiz-phase-bar-bg { flex: 1; height: 8px; background: rgba(28,34,51,0.8); border-radius: 4px; overflow: hidden; }
.wiz-phase-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #e09422, #f0a83a); }
.wiz-phase-pct { font-size: 11px; color: #455068; width: 32px; text-align: right; flex-shrink: 0; }

/* Field cards */
.wiz-field-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.wiz-field-card {
  background: rgba(28,34,51,0.5);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 20px 16px;
  text-align: center;
  transition: border-color 0.2s;
}
.wiz-field-card:hover { border-color: rgba(224,148,34,0.25); }
.wiz-field-card-icon {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: "0" auto 12px;
}
.wiz-field-card-title {
  font-family: var(--font-head);
  font-size: 16px;
  font-weight: 700;
  color: #f0f4fa;
  margin-bottom: 4px;
}
.wiz-field-card-desc { font-size: 11px; color: #8494ad; line-height: 1.5; }
.wiz-field-bullets { list-style: none; padding: 0; margin: var(--space-2) 0 0; display: flex; flex-direction: column; gap: var(--space-1); }
.wiz-field-bullet {
  font-size: 11px; color: #8494ad;
  display: flex; align-items: center; justify-content: center; gap: var(--space-1);
}
.wiz-field-bullet::before {
  content: ''; width: 4px; height: 4px;
  background: #e09422; border-radius: 50%; flex-shrink: 0;
}

/* ── Field-first big icon (foreman / employee / driver) ── */
.wiz-big-icon-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-5);
  padding: 8px 0 16px;
}
.wiz-big-icon {
  width: 100px;
  height: 100px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wiz-big-icon-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  width: 100%;
  max-width: 320px;
}
.wiz-big-icon-cell {
  background: rgba(28,34,51,0.5);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 18px 12px 14px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.wiz-big-icon-cell-icon {
  width: 56px; height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wiz-big-icon-cell-label {
  font-family: var(--font-head);
  font-size: 15px;
  font-weight: 700;
  color: #f0f4fa;
  line-height: 1.1;
}
.wiz-big-icon-cell-sub {
  font-size: 10px;
  color: #455068;
  line-height: 1.3;
}

/* Team invite form */
.wizard-team-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-top: 16px;
}
.wizard-team-field { display: flex; flex-direction: column; gap: var(--space-1); }
.wizard-team-field.full { grid-column: 1 / -1; }
.wizard-team-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #8494ad; font-weight: 600; }
.wizard-team-input, .wizard-team-select {
  background: rgba(6,8,12,0.8);
  border: 1px solid #1c2233;
  border-radius: 8px;
  padding: 9px 10px;
  color: #d4dae6;
  font-family: var(--font-body);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.wizard-team-input:focus, .wizard-team-select:focus { border-color: #e09422; }
.wizard-team-input::placeholder { color: #455068; }
.wizard-team-actions { display: flex; gap: var(--space-2); margin-top: 10px; }
.wizard-team-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 140px;
  overflow-y: auto;
}
.wizard-team-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(12,15,22,0.6);
  border: 1px solid #1c2233;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}
.wizard-team-row-name { color: #d4dae6; font-weight: 500; }
.wizard-team-row-role {
  font-size: 11px;
  color: #e09422;
  background: rgba(224,148,34,0.1);
  padding: 2px 8px;
  border-radius: 4px;
}
.wizard-team-remove { background: none; border: none; color: #455068; cursor: pointer; font-size: 16px; padding: 2px 6px; transition: color 0.2s; }
.wizard-team-remove:hover { color: #ef4444; }

/* Ready step */
.wizard-ready-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: 20px 0;
}
.wizard-ready-ring {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(224,148,34,0.08);
  border: 2px solid rgba(224,148,34,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wizard-feature-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: 8px;
}
.wizard-chip {
  background: rgba(28,34,51,0.6);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 12px;
  color: #8494ad;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* ── Footer ── */
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.wizard-dots { display: flex; gap: var(--space-2); align-items: center; }
.wizard-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #1c2233;
  transition: all 0.3s;
  cursor: pointer;
}
.wizard-dot.active { background: #e09422; width: 22px; border-radius: 4px; }
.wizard-dot.done { background: #2c3448; }
.wizard-nav { display: flex; gap: var(--space-2); }
.wizard-btn {
  background: linear-gradient(135deg, #e09422 0%, #d4861a 100%);
  color: #000;
  border: none;
  border-radius: 9px;
  padding: 10px 20px;
  font-family: var(--font-head);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(224,148,34,0.2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.wizard-btn:hover { background: linear-gradient(135deg, #f0a83a 0%, #e09422 100%); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(224,148,34,0.3); }
.wizard-btn:active { transform: translateY(0); }
.wizard-btn-ghost {
  background: transparent;
  color: #8494ad;
  border: 1px solid #1c2233;
  box-shadow: none;
}
.wizard-btn-ghost:hover { border-color: #455068; color: #d4dae6; background: transparent; transform: none; }
.wizard-launch {
  font-size: 17px;
  padding: 14px 40px;
}

/* ── Info row list ── */
.wiz-info-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: 16px;
}
.wiz-info-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: rgba(28,34,51,0.4);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 10px 14px;
}
.wiz-info-row-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wiz-info-row-text { font-size: 13px; color: #8494ad; }
.wiz-info-row-text strong { color: #d4dae6; display: block; font-size: 13px; margin-bottom: 1px; }

@media (max-width: 520px) {
  .wizard-card { margin: var(--space-3); padding: 28px 20px 24px; min-height: auto; border-radius: 16px; }
  .wizard-title { font-size: 24px; }
  .wiz-kpi-grid { gap: var(--space-2); }
  .wiz-kpi-card { padding: 12px 10px; gap: var(--space-2); }
  .wiz-field-cards { grid-template-columns: 1fr; }
  .wizard-team-form { grid-template-columns: 1fr; }
  .wiz-pipeline { gap: 0; }
  .wizard-btn { padding: 10px 16px; font-size: 14px; }
  .wiz-big-icon-grid { gap: var(--space-3); }
  .wiz-big-icon { width: 80px; height: 80px; }
}
`;

// ─── shared data ────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { label: "Invite",     color: "var(--blue)", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)" },
  { label: "Takeoff",    color: "var(--amber)", bg: "rgba(224,148,34,0.12)",  border: "rgba(224,148,34,0.3)" },
  { label: "Pricing",    color: "var(--amber)", bg: "rgba(224,148,34,0.12)",  border: "rgba(224,148,34,0.3)" },
  { label: "Submitted",  color: "var(--purple)", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)" },
  { label: "Awarded",    color: "var(--green)", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)" },
];

const PROJECT_PHASES = [
  { name: "Design",    pct: 100, color: "var(--green)" },
  { name: "Framing",   pct: 78,  color: "var(--amber)" },
  { name: "Drywall",   pct: 42,  color: "var(--amber)" },
  { name: "Tape & Bed",pct: 15,  color: "var(--blue)" },
  { name: "Punch",     pct: 0,   color: "var(--text3)" },
];

const ROLE_OPTIONS = Object.entries(ROLES).filter(([k]) => k !== "owner");

// ═══════════════════════════════════════════════════════════════
//  ADMIN / OWNER STEPS
// ═══════════════════════════════════════════════════════════════

function AdminStepWelcome({ userName }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img
        src="/ebc-eagle-white.png" alt="EBC" className="wizard-logo"
        style={{ width: 80, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }}
      />
      <div className="wizard-title mt-sp2">
        Welcome to EBC-OS{userName ? `, ${userName.split(" ")[0]}` : ""}
      </div>
      <div className="wizard-desc">
        Your all-in-one construction management platform.<br />
        Built for Eagles Brothers — bids, projects, field, and finance in one place.
      </div>
      <div className="wizard-illustration">
        <div className="wizard-feature-chips" style={{ marginTop: "var(--space-8)" }}>
          {["Bid Pipeline","Project Management","Team Management","Profit Alerts","Estimating","Safety & JSA","Deliveries","Reports"].map(f => (
            <div key={f} className="wizard-chip">
              <Zap className="c-amber" style={{ width: 11, height: 11 }} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminStepDashboard() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 2 of 7</div>
      <div className="wizard-title">Dashboard KPIs</div>
      <div className="wizard-desc">Real-time business intelligence at a glance.</div>
      <div className="wizard-illustration">
        <div className="wiz-kpi-grid">
          {[
            { icon: <BarChart2 className="c-blue" style={{ width: 18, height: 18 }} />, iconBg: "rgba(59,130,246,0.12)", value: "8",    label: "Active Bids" },
            { icon: <DollarSign className="c-green" style={{ width: 18, height: 18 }} />, iconBg: "rgba(16,185,129,0.12)",  value: "$2.4M", label: "Bid Volume" },
            { icon: <Building2 className="c-amber" style={{ width: 18, height: 18 }} />,  iconBg: "rgba(224,148,34,0.12)", value: "12",   label: "Active Projects" },
            { icon: <CheckCircle className="c-green" style={{ width: 18, height: 18 }} />, iconBg: "rgba(16,185,129,0.12)", value: "94%",  label: "On Schedule" },
            { icon: <TrendingUp className="c-amber" style={{ width: 18, height: 18 }} />,  iconBg: "rgba(224,148,34,0.12)", value: "+18%", label: "Win Rate" },
            { icon: <Clock className="c-purple" style={{ width: 18, height: 18 }} />,       iconBg: "rgba(139,92,246,0.12)", value: "312h", label: "This Week" },
          ].map((kpi, i) => (
            <div key={i} className="wiz-kpi-card">
              <div className="wiz-kpi-icon" style={{ background: kpi.iconBg }}>{kpi.icon}</div>
              <div>
                <div className="wiz-kpi-value">{kpi.value}</div>
                <div className="wiz-kpi-label">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminStepBidPipeline() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 3 of 7</div>
      <div className="wizard-title">Bid Pipeline</div>
      <div className="wizard-desc">Track every opportunity from invite to award. Never miss a deadline.</div>
      <div className="wizard-illustration">
        <div className="wiz-pipeline">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s.label} className="flex">
              <div className="wiz-pipeline-stage">
                <div className="wiz-pipeline-dot" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
                  <FileText style={{ width: 18, height: 18 }} />
                </div>
                <div className="wiz-pipeline-name" style={{ color: s.color }}>{s.label}</div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="wiz-pipeline-arrow"><ArrowRight style={{ width: 16, height: 16 }} /></div>
              )}
            </div>
          ))}
        </div>
        <div className="wiz-info-list mt-sp4">
          {[
            { icon: <FileText className="c-amber" style={{ width: 14, height: 14 }} />, bg: "rgba(224,148,34,0.1)", title: "Bid documents & scope tracking" },
            { icon: <Users className="c-blue" style={{ width: 14, height: 14 }} />,    bg: "rgba(59,130,246,0.1)", title: "GC & customer contact management" },
            { icon: <TrendingUp className="c-green" style={{ width: 14, height: 14 }} />, bg: "rgba(16,185,129,0.1)", title: "Win/loss analytics and trends" },
          ].map((f, i) => (
            <div key={i} className="wiz-info-row">
              <div className="wiz-info-row-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div className="wiz-info-row-text">{f.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminStepProjects() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 4 of 7</div>
      <div className="wizard-title">Project Management</div>
      <div className="wizard-desc">Full project lifecycle — phases, RFIs, submittals, change orders, and punch lists.</div>
      <div className="wizard-illustration">
        <div className="wiz-phases">
          {PROJECT_PHASES.map((p) => (
            <div key={p.name} className="wiz-phase-row">
              <div className="wiz-phase-name">{p.name}</div>
              <div className="wiz-phase-bar-bg">
                <div className="wiz-phase-bar-fill" style={{ width: `${p.pct}%`, background: p.pct === 0 ? "#1c2233" : `linear-gradient(90deg, ${p.color}, ${p.color}aa)` }} />
              </div>
              <div className="wiz-phase-pct">{p.pct}%</div>
            </div>
          ))}
        </div>
        <div className="mt-sp4 gap-sp2 flex-wrap" style={{ display: "flex" }}>
          {["RFIs","Submittals","Change Orders","Punch Lists","Daily Reports","T&M Tickets"].map(tag => (
            <span key={tag} className="rounded-control fs-tab c-text2" style={{ background: "rgba(28,34,51,0.6)", border: "1px solid rgba(255,255,255,0.06)", padding: "3px 9px" }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminStepTeam({ teamMembers, onAddMember, onRemoveMember }) {
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("pm");
  const [memberPin, setMemberPin] = useState("");

  const handleAdd = () => {
    if (!memberName || !memberEmail) return;
    onAddMember({ name: memberName, email: memberEmail, role: memberRole, pin: memberPin });
    setMemberName(""); setMemberEmail(""); setMemberRole("pm"); setMemberPin("");
  };

  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 5 of 7</div>
      <div className="wizard-title">Team Management</div>
      <div className="wizard-desc">Add team members now — or skip and do it later in Settings.</div>
      <div className="wizard-illustration">
        <div className="wizard-team-form">
          <div className="wizard-team-field">
            <label className="wizard-team-label">Name</label>
            <input className="wizard-team-input" placeholder="John Doe" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
          </div>
          <div className="wizard-team-field">
            <label className="wizard-team-label">Email</label>
            <input className="wizard-team-input" placeholder="john@ebc.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
          </div>
          <div className="wizard-team-field">
            <label className="wizard-team-label">Role</label>
            <select className="wizard-team-select" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              {ROLE_OPTIONS.map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
            </select>
          </div>
          <div className="wizard-team-field">
            <label className="wizard-team-label">PIN (field)</label>
            <input className="wizard-team-input" placeholder="4-digit PIN" maxLength={6} value={memberPin} onChange={(e) => setMemberPin(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <div className="wizard-team-actions">
          <button className="wizard-btn fs-label" style={{ padding: "var(--space-2) var(--space-4)" }} onClick={handleAdd}>
            <UserPlus style={{ width: 14, height: 14 }} /> Add
          </button>
        </div>
        {teamMembers.length > 0 && (
          <div className="wizard-team-list">
            {teamMembers.map((m, i) => (
              <div key={i} className="wizard-team-row">
                <span className="wizard-team-row-name">{m.name}</span>
                <span className="wizard-team-row-role">{ROLES[m.role]?.label || m.role}</span>
                <button className="wizard-team-remove" onClick={() => onRemoveMember(i)} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminStepProfitAlerts() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 6 of 7</div>
      <div className="wizard-title">Profit Alerts</div>
      <div className="wizard-desc">Real-time alerts keep you ahead of budget overruns and margin risks.</div>
      <div className="wizard-illustration">
        <div className="wiz-info-list">
          {[
            { icon: <TrendingUp className="c-green" style={{ width: 16, height: 16 }} />, bg: "rgba(16,185,129,0.1)",  title: "Gross Margin Tracker", sub: "Live % vs. target on every project" },
            { icon: <AlertTriangle className="c-amber" style={{ width: 16, height: 16 }} />, bg: "rgba(224,148,34,0.1)", title: "Budget Overrun Warnings", sub: "Alerts when costs exceed approved budget" },
            { icon: <DollarSign className="c-purple" style={{ width: 16, height: 16 }} />, bg: "rgba(139,92,246,0.1)", title: "Change Order Impact", sub: "See how COs shift your bottom line instantly" },
            { icon: <BarChart2 className="c-blue" style={{ width: 16, height: 16 }} />, bg: "rgba(59,130,246,0.1)", title: "Labor vs. Revenue Ratio", sub: "Weekly burn-rate vs. billed amounts" },
          ].map((item, i) => (
            <div key={i} className="wiz-info-row">
              <div className="wiz-info-row-icon" style={{ background: item.bg }}>{item.icon}</div>
              <div className="wiz-info-row-text">
                <strong>{item.title}</strong>
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminStepSettings({ onComplete }) {
  return (
    <div className="wizard-slide">
      <div className="wizard-ready-wrap">
        <div className="wizard-ready-ring">
          <CheckCircle className="c-amber" style={{ width: 44, height: 44 }} />
        </div>
        <div className="wizard-title">You're All Set!</div>
        <div className="wizard-desc" style={{ maxWidth: 340, margin: "0 auto" }}>
          EBC-OS is ready. Your data, your team, your way.<br />
          <span className="fs-label c-text3">You can revisit this tour anytime in Settings.</span>
        </div>
        <button className="wizard-btn wizard-launch" onClick={onComplete}>
          Launch EBC-OS
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PM STEPS
// ═══════════════════════════════════════════════════════════════

function PMStepWelcome({ userName }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img
        src="/ebc-eagle-white.png" alt="EBC" className="wizard-logo"
        style={{ width: 80, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }}
      />
      <div className="wizard-title mt-sp2">
        Welcome, {userName ? userName.split(" ")[0] : "PM"}
      </div>
      <div className="wizard-desc">
        Your project management command center.<br />
        Bids, projects, field coordination, and takeoffs — all in one place.
      </div>
      <div className="wizard-illustration">
        <div className="wizard-feature-chips" style={{ marginTop: 28 }}>
          {["Bid Pipeline","Project Details","COs & RFIs","Submittals","Assign Foremen","Takeoffs","Notifications"].map(f => (
            <div key={f} className="wizard-chip">
              <Target className="c-amber" style={{ width: 11, height: 11 }} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PMStepDashboard() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 2 of 7</div>
      <div className="wizard-title">Your Dashboard</div>
      <div className="wizard-desc">Track your active bids and project health at a glance.</div>
      <div className="wizard-illustration">
        <div className="wiz-kpi-grid">
          {[
            { icon: <FileText className="c-amber" style={{ width: 18, height: 18 }} />,    iconBg: "rgba(224,148,34,0.12)", value: "4",    label: "My Bids" },
            { icon: <Building2 className="c-blue" style={{ width: 18, height: 18 }} />,   iconBg: "rgba(59,130,246,0.12)",  value: "6",    label: "My Projects" },
            { icon: <ClipboardList className="c-purple" style={{ width: 18, height: 18 }} />, iconBg: "rgba(139,92,246,0.12)", value: "3",   label: "Open RFIs" },
            { icon: <CheckCircle className="c-green" style={{ width: 18, height: 18 }} />, iconBg: "rgba(16,185,129,0.12)",  value: "11",   label: "Pending Submittals" },
            { icon: <DollarSign className="c-green" style={{ width: 18, height: 18 }} />,  iconBg: "rgba(16,185,129,0.12)",  value: "$84K", label: "Pending COs" },
            { icon: <TrendingUp className="c-amber" style={{ width: 18, height: 18 }} />,  iconBg: "rgba(224,148,34,0.12)", value: "92%",  label: "On Schedule" },
          ].map((kpi, i) => (
            <div key={i} className="wiz-kpi-card">
              <div className="wiz-kpi-icon" style={{ background: kpi.iconBg }}>{kpi.icon}</div>
              <div><div className="wiz-kpi-value">{kpi.value}</div><div className="wiz-kpi-label">{kpi.label}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PMStepBidPipeline() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 3 of 7</div>
      <div className="wizard-title">Bid Pipeline</div>
      <div className="wizard-desc">Manage your bids from invite to award. Own your estimating queue.</div>
      <div className="wizard-illustration">
        <div className="wiz-pipeline">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s.label} className="flex">
              <div className="wiz-pipeline-stage">
                <div className="wiz-pipeline-dot" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
                  <FileText style={{ width: 18, height: 18 }} />
                </div>
                <div className="wiz-pipeline-name" style={{ color: s.color }}>{s.label}</div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="wiz-pipeline-arrow"><ArrowRight style={{ width: 16, height: 16 }} /></div>
              )}
            </div>
          ))}
        </div>
        <div className="wiz-info-list mt-sp4">
          {[
            { icon: <FileText className="c-amber" style={{ width: 14, height: 14 }} />, bg: "rgba(224,148,34,0.1)", text: "Claim bids and lock your estimating queue" },
            { icon: <Layers className="c-blue" style={{ width: 14, height: 14 }} />,   bg: "rgba(59,130,246,0.1)", text: "Attach plans, scope sheets, and addenda" },
            { icon: <Target className="c-green" style={{ width: 14, height: 14 }} />,   bg: "rgba(16,185,129,0.1)", text: "Track bid deadlines and submission status" },
          ].map((f, i) => (
            <div key={i} className="wiz-info-row">
              <div className="wiz-info-row-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div className="wiz-info-row-text">{f.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PMStepProjectDetail() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 4 of 7</div>
      <div className="wizard-title">Project Detail</div>
      <div className="wizard-desc">COs, RFIs, and submittals — everything tracked in one view.</div>
      <div className="wizard-illustration">
        <div className="wiz-field-cards">
          <div className="wiz-field-card">
            <div className="wiz-field-card-icon" style={{ background: "rgba(224,148,34,0.1)" }}>
              <DollarSign className="c-amber" style={{ width: 26, height: 26 }} />
            </div>
            <div className="wiz-field-card-title">Change Orders</div>
            <ul className="wiz-field-bullets">
              <li className="wiz-field-bullet">Draft & submit COs</li>
              <li className="wiz-field-bullet">Track approval status</li>
              <li className="wiz-field-bullet">Impact on contract</li>
            </ul>
          </div>
          <div className="wiz-field-card">
            <div className="wiz-field-card-icon" style={{ background: "rgba(59,130,246,0.1)" }}>
              <ClipboardList className="c-blue" style={{ width: 26, height: 26 }} />
            </div>
            <div className="wiz-field-card-title">RFIs & Submittals</div>
            <ul className="wiz-field-bullets">
              <li className="wiz-field-bullet">Log open RFIs</li>
              <li className="wiz-field-bullet">Track submittal status</li>
              <li className="wiz-field-bullet">GC response log</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PMStepForemen() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 5 of 7</div>
      <div className="wizard-title">Assign Foremen</div>
      <div className="wizard-desc">Assign foremen to projects and manage field teams from your desk.</div>
      <div className="wizard-illustration">
        <div className="wiz-info-list">
          {[
            { icon: <HardHat className="c-amber" style={{ width: 16, height: 16 }} />,   bg: "rgba(224,148,34,0.1)", title: "Assign to Projects", sub: "Tie a foreman to each active project" },
            { icon: <Users className="c-blue" style={{ width: 16, height: 16 }} />,     bg: "rgba(59,130,246,0.1)", title: "Crew Visibility",    sub: "See who's on-site and team hours in real time" },
            { icon: <ClipboardCheck className="c-green" style={{ width: 16, height: 16 }} />, bg: "rgba(16,185,129,0.1)", title: "Daily Reports",  sub: "Review foreman reports submitted each day" },
            { icon: <Bell className="c-purple" style={{ width: 16, height: 16 }} />,      bg: "rgba(139,92,246,0.1)", title: "Alerts",             sub: "Get notified if no report is filed by EOD" },
          ].map((item, i) => (
            <div key={i} className="wiz-info-row">
              <div className="wiz-info-row-icon" style={{ background: item.bg }}>{item.icon}</div>
              <div className="wiz-info-row-text"><strong>{item.title}</strong>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PMStepTakeoffs() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Step 6 of 7</div>
      <div className="wizard-title">Material Takeoffs</div>
      <div className="wizard-desc">Build detailed material lists directly from your bid or project scope.</div>
      <div className="wizard-illustration">
        <div className="wiz-info-list">
          {[
            { icon: <Package className="c-amber" style={{ width: 16, height: 16 }} />,   bg: "rgba(224,148,34,0.1)", title: "Line-item takeoffs", sub: "Qty, unit cost, and total per material" },
            { icon: <Layers className="c-blue" style={{ width: 16, height: 16 }} />,    bg: "rgba(59,130,246,0.1)", title: "Phase breakdowns",   sub: "Organize by construction phase" },
            { icon: <DollarSign className="c-green" style={{ width: 16, height: 16 }} />, bg: "rgba(16,185,129,0.1)", title: "Cost roll-up",       sub: "Automatic totals feed into bid pricing" },
            { icon: <TrendingUp className="c-purple" style={{ width: 16, height: 16 }} />, bg: "rgba(139,92,246,0.1)", title: "AI Analyzer",        sub: "Flag risk items and missing scope" },
          ].map((item, i) => (
            <div key={i} className="wiz-info-row">
              <div className="wiz-info-row-icon" style={{ background: item.bg }}>{item.icon}</div>
              <div className="wiz-info-row-text"><strong>{item.title}</strong>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PMStepReady({ onComplete }) {
  return (
    <div className="wizard-slide">
      <div className="wizard-ready-wrap">
        <div className="wizard-ready-ring">
          <CheckCircle className="c-amber" style={{ width: 44, height: 44 }} />
        </div>
        <div className="wizard-title">You're All Set!</div>
        <div className="wizard-desc" style={{ maxWidth: 340, margin: "0 auto" }}>
          EBC-OS is ready. Manage your projects with confidence.<br />
          <span className="fs-label c-text3">You can revisit this tour anytime in Settings.</span>
        </div>
        <button className="wizard-btn wizard-launch" onClick={onComplete}>
          Launch EBC-OS
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FOREMAN STEPS  (Spanish-first)
// ═══════════════════════════════════════════════════════════════

function ForemanStep1({ userName }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img
        src="/ebc-eagle-white.png" alt="EBC" className="wizard-logo"
        style={{ width: 80, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }}
      />
      <div className="wizard-title mt-sp2">
        Bienvenido{userName ? `, ${userName.split(" ")[0]}` : ""}
      </div>
      <div className="wizard-title-sub">Welcome to EBC-OS</div>
      <div className="wizard-desc">Tu portal de campo para EBC.<br />Gestiona tu cuadrilla desde cualquier lugar.</div>
      <div className="wizard-desc-sub">Field portal for Eagles Brothers Constructors.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-grid">
          {[
            { icon: <HardHat className="c-amber" style={{ width: 28, height: 28 }} />,      bg: "rgba(224,148,34,0.12)",  label: "Cuadrilla",      sub: "Crew" },
            { icon: <Clock className="c-green" style={{ width: 28, height: 28 }} />,         bg: "rgba(16,185,129,0.12)",  label: "Tiempo",         sub: "Time" },
            { icon: <ShieldCheck className="c-blue" style={{ width: 28, height: 28 }} />,   bg: "rgba(59,130,246,0.12)",  label: "Seguridad",      sub: "Safety" },
            { icon: <ClipboardList className="c-purple" style={{ width: 28, height: 28 }} />, bg: "rgba(139,92,246,0.12)", label: "Reportes",       sub: "Reports" },
          ].map((c, i) => (
            <div key={i} className="wiz-big-icon-cell">
              <div className="wiz-big-icon-cell-icon" style={{ background: c.bg }}>{c.icon}</div>
              <div className="wiz-big-icon-cell-label">{c.label}</div>
              <div className="wiz-big-icon-cell-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForemanStep2() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 2 · Step 2</div>
      <div className="wizard-title">Entrada / Salida</div>
      <div className="wizard-title-sub">Clock In / Clock Out</div>
      <div className="wizard-desc">Registra tu tiempo cada día con tu PIN.<br />Tu pago depende de esto.</div>
      <div className="wizard-desc-sub">Log your time every day with your PIN.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap">
          <div className="wiz-big-icon" style={{ background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.2)" }}>
            <Clock className="c-green" style={{ width: 54, height: 54 }} />
          </div>
          <div className="wiz-info-list w-full">
            {[
              { label: "Pulsa → Entrada",  sub: "Tap → Clock In",   color: "var(--green)" },
              { label: "Selecciona proyecto", sub: "Select your project", color: "var(--amber)" },
              { label: "Al salir → Salida", sub: "At end → Clock Out", color: "var(--red)" },
            ].map((r, i) => (
              <div key={i} className="wiz-info-row">
                <div className="flex-shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                <div className="wiz-info-row-text"><strong>{r.label}</strong>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForemanStep3() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 3 · Step 3</div>
      <div className="wizard-title">Cuadrilla</div>
      <div className="wizard-title-sub">Crew Management</div>
      <div className="wizard-desc">Gestiona a tu equipo en el campo.<br />Asigna trabajos y revisa horas.</div>
      <div className="wizard-desc-sub">Manage your team, assign tasks, review hours.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap">
          <div className="wiz-big-icon" style={{ background: "rgba(224,148,34,0.12)", border: "2px solid rgba(224,148,34,0.2)" }}>
            <Users className="c-amber" style={{ width: 54, height: 54 }} />
          </div>
          <div className="wiz-info-list w-full">
            {[
              { label: "Ver cuadrilla activa",  sub: "See active team on-site", color: "var(--amber)" },
              { label: "Horas por trabajador",  sub: "Hours per worker today",  color: "var(--blue)" },
              { label: "Solicitar materiales",  sub: "Request materials",        color: "var(--green)" },
            ].map((r, i) => (
              <div key={i} className="wiz-info-row">
                <div className="flex-shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                <div className="wiz-info-row-text"><strong>{r.label}</strong>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForemanStep4() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 4 · Step 4</div>
      <div className="wizard-title">Seguridad (JSA)</div>
      <div className="wizard-title-sub">Safety — Job Safety Analysis</div>
      <div className="wizard-desc">Completa el JSA antes de comenzar cualquier trabajo.<br />Es obligatorio cada día.</div>
      <div className="wizard-desc-sub">Complete the JSA before starting work. Required daily.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap">
          <div className="wiz-big-icon" style={{ background: "rgba(59,130,246,0.12)", border: "2px solid rgba(59,130,246,0.2)" }}>
            <ShieldCheck className="c-blue" style={{ width: 54, height: 54 }} />
          </div>
          <div className="wiz-info-list w-full">
            {[
              { label: "JSA diario",          sub: "Daily job safety analysis",   color: "var(--blue)" },
              { label: "Reporte de incidente", sub: "File an incident report",     color: "var(--red)" },
              { label: "Hojas SDS",            sub: "Access material SDS sheets",  color: "var(--amber)" },
            ].map((r, i) => (
              <div key={i} className="wiz-info-row">
                <div className="flex-shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                <div className="wiz-info-row-text"><strong>{r.label}</strong>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForemanStep5({ onComplete }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 5 · Step 5</div>
      <div className="wizard-ready-wrap">
        <div className="wiz-big-icon" style={{ background: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.2)", width: 96, height: 96, borderRadius: "50%" }}>
          <ClipboardList className="c-purple" style={{ width: 48, height: 48 }} />
        </div>
        <div className="wizard-title">Reporte Diario</div>
        <div className="wizard-title-sub">Daily Report</div>
        <div className="wizard-desc">Documenta el trabajo de cada día.<br />Fotos, horas, y notas de progreso.</div>
        <div className="wizard-desc-sub">Document work each day — photos, hours, progress notes.</div>
        <button className="wizard-btn wizard-launch" onClick={onComplete}>
          Comenzar · Start
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EMPLOYEE STEPS  (Spanish-first, dead simple, pictogram-heavy)
// ═══════════════════════════════════════════════════════════════

function EmployeeStep1({ userName }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img
        src="/ebc-eagle-white.png" alt="EBC" className="wizard-logo"
        style={{ width: 80, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }}
      />
      <div className="wizard-title mt-sp2">
        Bienvenido{userName ? `, ${userName.split(" ")[0]}` : ""}
      </div>
      <div className="wizard-title-sub">Welcome</div>
      <div className="wizard-desc fs-card">Estás en EBC-OS.<br />Tu app de trabajo.</div>
      <div className="wizard-desc-sub">You're on EBC-OS — your work app.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-grid">
          {[
            { icon: <Clock className="c-green" style={{ width: 32, height: 32 }} />,          bg: "rgba(16,185,129,0.12)", label: "Entrada/Salida", sub: "Clock In/Out" },
            { icon: <AlertTriangle className="c-red" style={{ width: 32, height: 32 }} />,  bg: "rgba(239,68,68,0.12)",  label: "Problema",       sub: "Report Issue" },
            { icon: <Calendar className="c-blue" style={{ width: 32, height: 32 }} />,       bg: "rgba(59,130,246,0.12)", label: "Horario",        sub: "Schedule" },
          ].map((c, i) => (
            <div key={i} className="wiz-big-icon-cell" style={{ ...(i === 2 ? { gridColumn: "1 / -1", maxWidth: 160, margin: "0 auto", width: "100%" } : {}) }}>
              <div className="wiz-big-icon-cell-icon" style={{ background: c.bg }}>{c.icon}</div>
              <div className="wiz-big-icon-cell-label">{c.label}</div>
              <div className="wiz-big-icon-cell-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmployeeStep2() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 2 · Step 2</div>
      <div className="wizard-title">Entrada / Salida</div>
      <div className="wizard-title-sub">Clock In / Clock Out</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap gap-sp4">
          <div className="wiz-big-icon" style={{ background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.2)", width: 110, height: 110, borderRadius: "var(--radius-sheet)" }}>
            <Clock className="c-green" style={{ width: 60, height: 60 }} />
          </div>
          <div className="text-center">
            <div className="fs-subtitle fw-bold font-head" style={{ color: "#f0f4fa" }}>Pulsa el botón</div>
            <div className="fs-label mt-sp1 c-text3">Tap the button</div>
          </div>
          <div className="gap-sp3" style={{ display: "flex" }}>
            <div className="rounded-control text-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", padding: "var(--space-3) var(--space-6)" }}>
              <div className="fw-bold fs-section font-head c-green">ENTRADA</div>
              <div className="fs-tab c-text3">Clock In</div>
            </div>
            <div className="rounded-control text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", padding: "var(--space-3) var(--space-6)" }}>
              <div className="fw-bold fs-section font-head c-red">SALIDA</div>
              <div className="fs-tab c-text3">Clock Out</div>
            </div>
          </div>
          <div className="fs-label c-text3 text-center">Necesitas tu PIN · You need your PIN</div>
        </div>
      </div>
    </div>
  );
}

function EmployeeStep3() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 3 · Step 3</div>
      <div className="wizard-title">Reportar Problema</div>
      <div className="wizard-title-sub">Report a Problem</div>
      <div className="wizard-desc">¿Algo está mal? Avísanos.<br />Tu seguridad es primero.</div>
      <div className="wizard-desc-sub">Something wrong? Let us know. Safety first.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap">
          <div className="wiz-big-icon" style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.2)", width: 100, height: 100, borderRadius: "var(--radius-sheet)" }}>
            <AlertTriangle className="c-red" style={{ width: 54, height: 54 }} />
          </div>
          <div className="flex-col gap-sp2 w-full">
            {[
              { es: "Peligro en el sitio",   en: "Site hazard" },
              { es: "Equipo dañado",         en: "Damaged equipment" },
              { es: "Necesito ayuda",        en: "I need help" },
            ].map((r, i) => (
              <div key={i} className="flex rounded-control gap-sp3" style={{ background: "rgba(28,34,51,0.4)", border: "1px solid rgba(255,255,255,0.04)", padding: "11px 14px" }}>
                <AlertTriangle className="c-red flex-shrink-0" style={{ width: 16, height: 16 }} />
                <div>
                  <div className="fs-secondary fw-semi" style={{ color: "#f0f4fa" }}>{r.es}</div>
                  <div className="fs-tab c-text3">{r.en}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeStep4({ onComplete }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-ready-wrap">
        <div className="wiz-big-icon" style={{ background: "rgba(59,130,246,0.12)", border: "2px solid rgba(59,130,246,0.2)", width: 96, height: 96, borderRadius: "50%" }}>
          <Calendar className="c-blue" style={{ width: 48, height: 48 }} />
        </div>
        <div className="wizard-title">Tu Horario</div>
        <div className="wizard-title-sub">Your Schedule</div>
        <div className="wizard-desc fs-secondary">
          Ve cuándo y dónde trabajas cada semana.
        </div>
        <div className="wizard-desc-sub">See when and where you work each week.</div>
        <button className="wizard-btn wizard-launch" onClick={onComplete} className="mt-sp3">
          Comenzar · Start
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  DRIVER STEPS  (Spanish-first)
// ═══════════════════════════════════════════════════════════════

function DriverStep1({ userName }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img
        src="/ebc-eagle-white.png" alt="EBC" className="wizard-logo"
        style={{ width: 80, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }}
      />
      <div className="wizard-title mt-sp2">
        Bienvenido{userName ? `, ${userName.split(" ")[0]}` : ""}
      </div>
      <div className="wizard-title-sub">Welcome, Driver</div>
      <div className="wizard-desc">Tu portal de entregas para EBC.<br />Gestiona tus entregas del día.</div>
      <div className="wizard-desc-sub">Your delivery portal for Eagles Brothers.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-grid">
          {[
            { icon: <Truck className="c-amber" style={{ width: 30, height: 30 }} />,         bg: "rgba(224,148,34,0.12)", label: "Entregas",  sub: "Deliveries" },
            { icon: <MapPin className="c-blue" style={{ width: 30, height: 30 }} />,        bg: "rgba(59,130,246,0.12)", label: "Ruta",      sub: "Route" },
            { icon: <CheckSquare className="c-green" style={{ width: 30, height: 30 }} />,   bg: "rgba(16,185,129,0.12)", label: "Completado",sub: "Done" },
            { icon: <Bell className="c-purple" style={{ width: 30, height: 30 }} />,          bg: "rgba(139,92,246,0.12)",label: "Alertas",   sub: "Alerts" },
          ].map((c, i) => (
            <div key={i} className="wiz-big-icon-cell">
              <div className="wiz-big-icon-cell-icon" style={{ background: c.bg }}>{c.icon}</div>
              <div className="wiz-big-icon-cell-label">{c.label}</div>
              <div className="wiz-big-icon-cell-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DriverStep2() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 2 · Step 2</div>
      <div className="wizard-title">Ruta de Entrega</div>
      <div className="wizard-title-sub">Delivery Route</div>
      <div className="wizard-desc">Ve todas tus entregas del día.<br />Con dirección y detalles del material.</div>
      <div className="wizard-desc-sub">See all today's deliveries with address and material details.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap">
          <div className="wiz-big-icon" style={{ background: "rgba(224,148,34,0.12)", border: "2px solid rgba(224,148,34,0.2)", width: 100, height: 100, borderRadius: "var(--radius-sheet)" }}>
            <Truck className="c-amber" style={{ width: 56, height: 56 }} />
          </div>
          <div className="wiz-info-list w-full">
            {[
              { es: "Lista de entregas pendientes", en: "Pending delivery queue",   color: "var(--amber)" },
              { es: "Dirección en mapa",            en: "Address on map",           color: "var(--blue)" },
              { es: "Material y cantidad",          en: "Material & quantity",      color: "var(--green)" },
            ].map((r, i) => (
              <div key={i} className="wiz-info-row">
                <div className="flex-shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                <div className="wiz-info-row-text"><strong>{r.es}</strong>{r.en}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverStep3() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-step-label">Paso 3 · Step 3</div>
      <div className="wizard-title">Programar Entrega</div>
      <div className="wizard-title-sub">Schedule Deliveries</div>
      <div className="wizard-desc">Confirma la hora y el lugar de entrega.<br />Mantén al equipo informado.</div>
      <div className="wizard-desc-sub">Confirm delivery time and location. Keep the team informed.</div>
      <div className="wizard-illustration">
        <div className="wiz-big-icon-wrap">
          <div className="wiz-big-icon" style={{ background: "rgba(59,130,246,0.12)", border: "2px solid rgba(59,130,246,0.2)", width: 100, height: 100, borderRadius: "var(--radius-sheet)" }}>
            <Navigation className="c-blue" style={{ width: 52, height: 52 }} />
          </div>
          <div className="wiz-info-list w-full">
            {[
              { es: "Acepta la entrega",       en: "Accept the delivery",    color: "var(--green)" },
              { es: "Confirma horario",        en: "Confirm the schedule",   color: "var(--amber)" },
              { es: "Navega al sitio",         en: "Navigate to site",       color: "var(--blue)" },
            ].map((r, i) => (
              <div key={i} className="wiz-info-row">
                <div className="flex-shrink-0" style={{ width: 10, height: 10, borderRadius: "50%", background: r.color }} />
                <div className="wiz-info-row-text"><strong>{r.es}</strong>{r.en}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverStep4({ onComplete }) {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <div className="wizard-ready-wrap">
        <div className="wiz-big-icon" style={{ background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.2)", width: 96, height: 96, borderRadius: "50%" }}>
          <CheckSquare className="c-green" style={{ width: 48, height: 48 }} />
        </div>
        <div className="wizard-title">Marcar Entregado</div>
        <div className="wizard-title-sub">Mark as Delivered</div>
        <div className="wizard-desc fs-secondary">
          Confirma cuando termines cada entrega.<br />El sistema se actualiza automáticamente.
        </div>
        <div className="wizard-desc-sub">Confirm when done. System updates automatically.</div>
        <button className="wizard-btn wizard-launch" onClick={onComplete} className="mt-sp3">
          Comenzar · Start
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ROLE FLOW DEFINITIONS
// ═══════════════════════════════════════════════════════════════

function buildSteps({ family, userName, onComplete, teamMembers, onAddMember, onRemoveMember }) {
  switch (family) {
    case "admin":
      return [
        <AdminStepWelcome userName={userName} />,
        <AdminStepDashboard />,
        <AdminStepBidPipeline />,
        <AdminStepProjects />,
        <AdminStepTeam teamMembers={teamMembers} onAddMember={onAddMember} onRemoveMember={onRemoveMember} />,
        <AdminStepProfitAlerts />,
        <AdminStepSettings onComplete={onComplete} />,
      ];
    case "pm":
      return [
        <PMStepWelcome userName={userName} />,
        <PMStepDashboard />,
        <PMStepBidPipeline />,
        <PMStepProjectDetail />,
        <PMStepForemen />,
        <PMStepTakeoffs />,
        <PMStepReady onComplete={onComplete} />,
      ];
    case "foreman":
      return [
        <ForemanStep1 userName={userName} />,
        <ForemanStep2 />,
        <ForemanStep3 />,
        <ForemanStep4 />,
        <ForemanStep5 onComplete={onComplete} />,
      ];
    case "employee":
      return [
        <EmployeeStep1 userName={userName} />,
        <EmployeeStep2 />,
        <EmployeeStep3 />,
        <EmployeeStep4 onComplete={onComplete} />,
      ];
    case "driver":
      return [
        <DriverStep1 userName={userName} />,
        <DriverStep2 />,
        <DriverStep3 />,
        <DriverStep4 onComplete={onComplete} />,
      ];
    default:
      return [
        <AdminStepWelcome userName={userName} />,
        <AdminStepDashboard />,
        <AdminStepBidPipeline />,
        <AdminStepProjects />,
        <AdminStepTeam teamMembers={teamMembers} onAddMember={onAddMember} onRemoveMember={onRemoveMember} />,
        <AdminStepProfitAlerts />,
        <AdminStepSettings onComplete={onComplete} />,
      ];
  }
}

function isSpanishFirst(family) {
  return ["foreman", "employee", "driver"].includes(family);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export function OnboardingWizard({ onComplete, currentUser }) {
  const role   = currentUser?.role || "owner";
  const family = roleFamily(role);
  const userName = currentUser?.name || "";
  const spanishFirst = isSpanishFirst(family);

  const [step, setStep]       = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [teamMembers, setTeamMembers] = useState([]);
  const touchStartX = useRef(null);

  const handleComplete = useCallback(() => {
    localStorage.setItem(storageKey(role), "true");
    localStorage.setItem("ebc_onboarding_complete", "true");
    onComplete();
  }, [onComplete, role]);

  const handleAddMember = useCallback(({ name, email, role: memberRole, pin }) => {
    const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
    const newUser = {
      id: users.length + 1, name, email: email.toLowerCase(),
      password: hashPasswordSync(pin || "ebc2026"), role: memberRole,
      pin: pin ? hashPasswordSync(pin) : null,
      mustChangePassword: true, createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem("ebc_users", JSON.stringify(users));
    setTeamMembers(prev => [...prev, { name, email, role: memberRole }]);
  }, []);

  const handleRemoveMember = useCallback((idx) => {
    setTeamMembers(prev => {
      const member = prev[idx];
      try {
        const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
        localStorage.setItem("ebc_users", JSON.stringify(users.filter(u => u.email?.toLowerCase() !== member.email?.toLowerCase())));
      } catch {}
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const stepContent = buildSteps({
    family, userName,
    onComplete: handleComplete,
    teamMembers,
    onAddMember: handleAddMember,
    onRemoveMember: handleRemoveMember,
  });

  const totalSteps = stepContent.length;
  const isLastStep = step === totalSteps - 1;

  const goTo = (target) => {
    if (target === step) return;
    setSlideDir(target > step ? 1 : -1);
    setAnimKey(k => k + 1);
    setStep(target);
  };

  const next = () => { if (step < totalSteps - 1) goTo(step + 1); };
  const prev = () => { if (step > 0) goTo(step - 1); };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  const handleNeverShow = () => handleComplete();

  const slideClass = `wizard-slide ${slideDir > 0 ? "forward" : "backward"}`;

  const skipLabel  = spanishFirst ? "Omitir · Skip"        : "Skip";
  const neverLabel = spanishFirst ? "No mostrar de nuevo"  : "Never show again";
  const backLabel  = spanishFirst ? "Atrás"                : "Back";
  const nextLabel  = spanishFirst ? "Siguiente"            : "Next";
  const startLabel = spanishFirst ? "Comenzar"             : "Get Started";

  return (
    <div className="wizard-screen" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{wizardStyles}</style>
      <div className="wizard-bg" />
      <div className="wizard-grid" />

      <div className="wizard-card">
        {/* Top bar */}
        <div className="wizard-topbar">
          <button className="wizard-topbar-btn danger" onClick={handleNeverShow} title="Never show onboarding again">
            <X style={{ width: 13, height: 13 }} /> {neverLabel}
          </button>
          <button className="wizard-topbar-btn" onClick={handleComplete}>
            {skipLabel}
          </button>
        </div>

        {/* Slide */}
        <div className="wizard-content">
          <div key={animKey} className={`slideClass flex-1`}>
            {stepContent[step]}
          </div>
        </div>

        {/* Footer: dots + nav (hidden on last step which has its own CTA) */}
        {!isLastStep && (
          <div className="wizard-footer">
            <div className="wizard-dots">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`wizard-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  onClick={() => goTo(i)}
                  title={`Step ${i + 1}`}
                />
              ))}
            </div>
            <div className="wizard-nav">
              {step > 0 && (
                <button className="wizard-btn wizard-btn-ghost" onClick={prev}>
                  <ChevronLeft style={{ width: 16, height: 16 }} /> {backLabel}
                </button>
              )}
              <button className="wizard-btn" onClick={next}>
                {step === 0 ? startLabel : nextLabel}
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
