// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Onboarding Wizard
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import {
  BarChart2, FileText, Building2, Clock, HardHat,
  TrendingUp, DollarSign, CheckCircle, Users, ClipboardList,
  ArrowRight, Target, Layers, UserPlus, Zap, Package,
  ChevronLeft, ChevronRight, X
} from "lucide-react";
import { ROLES } from "../data/roles";
import { hashPasswordSync } from "../utils/passwordHash";

const wizardStyles = `
@keyframes wizPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(224,148,34,0.4); }
  50% { box-shadow: 0 0 0 14px rgba(224,148,34,0); }
}
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
  font-family: 'Barlow', sans-serif;
  position: relative;
  overflow: hidden;
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
  margin: 16px;
  background: rgba(12,15,22,0.9);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 40px 40px 32px;
  box-shadow: 0 32px 100px rgba(0,0,0,0.6), 0 0 60px rgba(224,148,34,0.04);
  min-height: 520px;
  display: flex;
  flex-direction: column;
}

/* ── Top bar ── */
.wizard-topbar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  font-family: 'Barlow', sans-serif;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
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
.wizard-slide.forward { animation: slideFromRight 0.35s ease; }
.wizard-slide.backward { animation: slideFromLeft 0.35s ease; }

/* ── Step header ── */
.wizard-logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  display: block;
  margin: 0 auto 14px;
  /* no animation — clean static logo */
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
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #f0f4fa;
  text-align: center;
  letter-spacing: 0.5px;
  line-height: 1.1;
}
.wizard-desc {
  font-size: 14px;
  color: #8494ad;
  text-align: center;
  margin-top: 8px;
  line-height: 1.65;
}

/* ── Illustrations ── */
.wizard-illustration {
  margin-top: 24px;
  flex: 1;
}

/* KPI grid (Dashboard step) */
.wiz-kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.wiz-kpi-card {
  background: rgba(28,34,51,0.5);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: border-color 0.2s;
}
.wiz-kpi-card:hover { border-color: rgba(224,148,34,0.2); }
.wiz-kpi-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wiz-kpi-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #f0f4fa;
  line-height: 1;
}
.wiz-kpi-label {
  font-size: 11px;
  color: #8494ad;
  margin-top: 2px;
}

/* Pipeline (Bid Pipeline step) */
.wiz-pipeline {
  display: flex;
  align-items: center;
  gap: 0;
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
  gap: 6px;
  flex-shrink: 0;
}
.wiz-pipeline-dot {
  width: 44px;
  height: 44px;
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
  margin: 0 2px;
  flex-shrink: 0;
  padding-bottom: 16px;
}

/* Phase bar (Project step) */
.wiz-phases {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wiz-phase-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wiz-phase-name {
  font-size: 12px;
  color: #8494ad;
  width: 80px;
  flex-shrink: 0;
  font-weight: 500;
}
.wiz-phase-bar-bg {
  flex: 1;
  height: 8px;
  background: rgba(28,34,51,0.8);
  border-radius: 4px;
  overflow: hidden;
}
.wiz-phase-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #e09422, #f0a83a);
  transition: width 0.8s ease;
}
.wiz-phase-pct {
  font-size: 11px;
  color: #455068;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

/* Field tools (Foreman + Time Clock) */
.wiz-field-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}
.wiz-field-card-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #f0f4fa;
  margin-bottom: 4px;
}
.wiz-field-card-desc {
  font-size: 11px;
  color: #8494ad;
  line-height: 1.5;
}
.wiz-field-bullets {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wiz-field-bullet {
  font-size: 11px;
  color: #8494ad;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.wiz-field-bullet::before {
  content: '';
  width: 4px;
  height: 4px;
  background: #e09422;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Team invite form */
.wizard-team-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
.wizard-team-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wizard-team-field.full { grid-column: 1 / -1; }
.wizard-team-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8494ad;
  font-weight: 600;
}
.wizard-team-input, .wizard-team-select {
  background: rgba(6,8,12,0.8);
  border: 1px solid #1c2233;
  border-radius: 8px;
  padding: 9px 10px;
  color: #d4dae6;
  font-family: 'Barlow', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.wizard-team-input:focus, .wizard-team-select:focus { border-color: #e09422; }
.wizard-team-input::placeholder { color: #455068; }
.wizard-team-actions { display: flex; gap: 8px; margin-top: 10px; }
.wizard-team-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  gap: 16px;
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
  animation: wizPulse 2.5s ease-in-out infinite;
}
.wizard-feature-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
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
  gap: 5px;
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
.wizard-dots {
  display: flex;
  gap: 7px;
  align-items: center;
}
.wizard-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1c2233;
  transition: all 0.3s;
  cursor: pointer;
}
.wizard-dot.active {
  background: #e09422;
  width: 22px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(224,148,34,0.4);
}
.wizard-dot.done { background: #2c3448; }
.wizard-nav {
  display: flex;
  gap: 8px;
}
.wizard-btn {
  background: linear-gradient(135deg, #e09422 0%, #d4861a 100%);
  color: #000;
  border: none;
  border-radius: 9px;
  padding: 10px 20px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(224,148,34,0.2);
  display: flex;
  align-items: center;
  gap: 6px;
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
  animation: wizPulse 2s ease-in-out infinite;
  font-size: 17px;
  padding: 14px 40px;
}

@media (max-width: 520px) {
  .wizard-card {
    margin: 10px;
    padding: 28px 20px 24px;
    min-height: auto;
    border-radius: 16px;
  }
  .wizard-title { font-size: 24px; }
  .wiz-kpi-grid { gap: 8px; }
  .wiz-kpi-card { padding: 12px 10px; gap: 8px; }
  .wiz-field-cards { grid-template-columns: 1fr; }
  .wizard-team-form { grid-template-columns: 1fr; }
  .wiz-pipeline { gap: 0; }
  .wizard-btn { padding: 10px 16px; font-size: 14px; }
}
`;

// Step data
const TOTAL_STEPS = 7;

const PIPELINE_STAGES = [
  { label: "Invite", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  { label: "Takeoff", color: "#e09422", bg: "rgba(224,148,34,0.12)", border: "rgba(224,148,34,0.3)" },
  { label: "Pricing", color: "#e09422", bg: "rgba(224,148,34,0.12)", border: "rgba(224,148,34,0.3)" },
  { label: "Submitted", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)" },
  { label: "Awarded", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
];

const PROJECT_PHASES = [
  { name: "Design", pct: 100, color: "#10b981" },
  { name: "Framing", pct: 78, color: "#e09422" },
  { name: "Drywall", pct: 42, color: "#e09422" },
  { name: "Tape & Bed", pct: 15, color: "#3b82f6" },
  { name: "Punch", pct: 0, color: "#455068" },
];

const ROLE_OPTIONS = Object.entries(ROLES).filter(([k]) => k !== "owner");

function StepWelcome() {
  return (
    <div className="wizard-slide" style={{ alignItems: "center" }}>
      <img src="/logo-ebc-white.png" alt="EBC" className="wizard-logo" style={{ width: 100, height: "auto" }}
        onError={(e) => { e.target.src = "/eagle-white.png"; e.target.onerror = () => { e.target.style.display = "none"; }; }} />
      <div className="wizard-title" style={{ marginTop: 8 }}>Welcome to EBC-OS</div>
      <div className="wizard-desc">
        Your all-in-one construction management platform.<br />
        Built for Eagles Brothers — bids, projects, field, and finance in one place.
      </div>
      <div className="wizard-illustration">
        <div className="wizard-feature-chips" style={{ marginTop: 32 }}>
          {["Bid Pipeline","Project Management","Foreman Portal","Time Clock","Estimating","Safety & JSA","Deliveries","Reports"].map(f => (
            <div key={f} className="wizard-chip">
              <Zap style={{ width: 11, height: 11, color: "#e09422" }} />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDashboard() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Feature 1 of 5</div>
      <div className="wizard-title">Dashboard</div>
      <div className="wizard-desc">Real-time KPIs and business intelligence at a glance.</div>
      <div className="wizard-illustration">
        <div className="wiz-kpi-grid">
          {[
            { icon: <BarChart2 style={{ width: 18, height: 18, color: "#3b82f6" }} />, iconBg: "rgba(59,130,246,0.12)", value: "8", label: "Active Bids" },
            { icon: <DollarSign style={{ width: 18, height: 18, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.12)", value: "$2.4M", label: "Bid Volume" },
            { icon: <Building2 style={{ width: 18, height: 18, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.12)", value: "12", label: "Active Projects" },
            { icon: <CheckCircle style={{ width: 18, height: 18, color: "#10b981" }} />, iconBg: "rgba(16,185,129,0.12)", value: "94%", label: "On Schedule" },
            { icon: <TrendingUp style={{ width: 18, height: 18, color: "#e09422" }} />, iconBg: "rgba(224,148,34,0.12)", value: "+18%", label: "Win Rate" },
            { icon: <Clock style={{ width: 18, height: 18, color: "#8b5cf6" }} />, iconBg: "rgba(139,92,246,0.12)", value: "312h", label: "This Week" },
          ].map((kpi, i) => (
            <div key={i} className="wiz-kpi-card" style={{ ...(i === 4 ? { gridColumn: "1/2" } : {}), ...(i === 5 ? { gridColumn: "2/3" } : {}) }}>
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

function StepBidPipeline() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Feature 2 of 5</div>
      <div className="wizard-title">Bid Pipeline</div>
      <div className="wizard-desc">Track every opportunity from invite to award. Never miss a deadline.</div>
      <div className="wizard-illustration">
        <div className="wiz-pipeline">
          {PIPELINE_STAGES.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              <div className="wiz-pipeline-stage">
                <div className="wiz-pipeline-dot" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
                  <FileText style={{ width: 18, height: 18 }} />
                </div>
                <div className="wiz-pipeline-name" style={{ color: s.color }}>{s.label}</div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="wiz-pipeline-arrow">
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Bid documents & scope tracking", icon: <FileText style={{ width: 13, height: 13 }} /> },
            { label: "GC & customer contact management", icon: <Users style={{ width: 13, height: 13 }} /> },
            { label: "Win/loss analytics and trends", icon: <TrendingUp style={{ width: 13, height: 13 }} /> },
          ].map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(28,34,51,0.4)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: "9px 12px" }}>
              <span style={{ color: "#e09422" }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: "#8494ad" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepProjects() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Feature 3 of 5</div>
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 18 }}>
          {["RFIs","Submittals","Change Orders","Punch Lists","Daily Reports","T&M Tickets"].map(tag => (
            <span key={tag} style={{ fontSize: 11, background: "rgba(28,34,51,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, padding: "3px 9px", color: "#8494ad" }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepFieldTools() {
  return (
    <div className="wizard-slide">
      <div className="wizard-step-label">Features 4 & 5 of 5</div>
      <div className="wizard-title">Field-First Tools</div>
      <div className="wizard-desc">Built for foremen and workers — fast, mobile-ready, and offline-capable.</div>
      <div className="wizard-illustration">
        <div className="wiz-field-cards">
          <div className="wiz-field-card">
            <div className="wiz-field-card-icon" style={{ background: "rgba(224,148,34,0.1)" }}>
              <HardHat style={{ width: 26, height: 26, color: "#e09422" }} />
            </div>
            <div className="wiz-field-card-title">Foreman Portal</div>
            <div className="wiz-field-card-desc">Manage your crew from the field</div>
            <ul className="wiz-field-bullets">
              <li className="wiz-field-bullet">Daily reports</li>
              <li className="wiz-field-bullet">Crew scheduling</li>
              <li className="wiz-field-bullet">Safety talks</li>
              <li className="wiz-field-bullet">Material requests</li>
            </ul>
          </div>
          <div className="wiz-field-card">
            <div className="wiz-field-card-icon" style={{ background: "rgba(16,185,129,0.1)" }}>
              <Clock style={{ width: 26, height: 26, color: "#10b981" }} />
            </div>
            <div className="wiz-field-card-title">Time Clock</div>
            <div className="wiz-field-card-desc">Accurate payroll, every time</div>
            <ul className="wiz-field-bullets">
              <li className="wiz-field-bullet">PIN-based punch in/out</li>
              <li className="wiz-field-bullet">Per-project tracking</li>
              <li className="wiz-field-bullet">Overtime alerts</li>
              <li className="wiz-field-bullet">Payroll export</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepTeam({ teamMembers, onAddMember, onRemoveMember }) {
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
      <div className="wizard-step-label">Optional</div>
      <div className="wizard-title">Invite Your Team</div>
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
          <button className="wizard-btn" style={{ padding: "7px 16px", fontSize: 13 }} onClick={handleAdd}>
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

function StepReady({ onComplete }) {
  return (
    <div className="wizard-slide">
      <div className="wizard-ready-wrap">
        <div className="wizard-ready-ring">
          <CheckCircle style={{ width: 44, height: 44, color: "#e09422" }} />
        </div>
        <div className="wizard-title">You're All Set!</div>
        <div className="wizard-desc" style={{ maxWidth: 340, margin: "0 auto" }}>
          EBC-OS is ready. Your data, your team, your way.<br />
          <span style={{ color: "#455068", fontSize: 12 }}>You can revisit this tour anytime in Settings.</span>
        </div>
        <button className="wizard-btn wizard-launch" onClick={onComplete}>
          Launch EBC-OS
        </button>
      </div>
    </div>
  );
}

export function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [teamMembers, setTeamMembers] = useState([]);
  const touchStartX = useRef(null);

  const goTo = (target) => {
    if (target === step) return;
    setSlideDir(target > step ? 1 : -1);
    setAnimKey(k => k + 1);
    setStep(target);
  };

  const next = () => { if (step < TOTAL_STEPS - 1) goTo(step + 1); };
  const prev = () => { if (step > 0) goTo(step - 1); };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  const handleAddMember = useCallback(({ name, email, role, pin }) => {
    const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
    const newUser = {
      id: users.length + 1, name, email: email.toLowerCase(),
      password: hashPasswordSync(pin || "ebc2026"), role,
      pin: pin ? hashPasswordSync(pin) : null,
      mustChangePassword: true, createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem("ebc_users", JSON.stringify(users));
    setTeamMembers(prev => [...prev, { name, email, role }]);
  }, []);

  const handleRemoveMember = (idx) => {
    const member = teamMembers[idx];
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      localStorage.setItem("ebc_users", JSON.stringify(users.filter(u => u.email.toLowerCase() !== member.email.toLowerCase())));
    } catch {}
    setTeamMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleComplete = useCallback(() => {
    localStorage.setItem("ebc_onboarding_complete", "true");
    onComplete();
  }, [onComplete]);

  const handleNeverShow = () => handleComplete();

  const slideClass = `wizard-slide ${slideDir > 0 ? "forward" : "backward"}`;
  const isLastStep = step === TOTAL_STEPS - 1;

  const stepContent = [
    <StepWelcome />,
    <StepDashboard />,
    <StepBidPipeline />,
    <StepProjects />,
    <StepFieldTools />,
    <StepTeam teamMembers={teamMembers} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} />,
    <StepReady onComplete={handleComplete} />,
  ];

  return (
    <div className="wizard-screen" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <style>{wizardStyles}</style>
      <div className="wizard-bg" />
      <div className="wizard-grid" />

      <div className="wizard-card">
        {/* Top bar: Skip + Never show */}
        <div className="wizard-topbar">
          <button className="wizard-topbar-btn danger" onClick={handleNeverShow} title="Don't show onboarding again">
            <X style={{ width: 13, height: 13 }} /> Never show again
          </button>
          <button className="wizard-topbar-btn" onClick={handleComplete}>
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="wizard-content">
          <div key={animKey} className={slideClass} style={{ flex: 1 }}>
            {stepContent[step]}
          </div>
        </div>

        {/* Footer */}
        {!isLastStep && (
          <div className="wizard-footer">
            {/* Progress dots */}
            <div className="wizard-dots">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`wizard-dot${i === step ? " active" : i < step ? " done" : ""}`}
                  onClick={() => goTo(i)}
                  title={`Step ${i + 1}`}
                />
              ))}
            </div>

            {/* Nav buttons */}
            <div className="wizard-nav">
              {step > 0 && (
                <button className="wizard-btn wizard-btn-ghost" onClick={prev}>
                  <ChevronLeft style={{ width: 16, height: 16 }} /> Back
                </button>
              )}
              <button className="wizard-btn" onClick={next}>
                {step === TOTAL_STEPS - 2
                  ? (teamMembers.length > 0 ? <>Next <ChevronRight style={{ width: 16, height: 16 }} /></> : <>Skip <ChevronRight style={{ width: 16, height: 16 }} /></>)
                  : <>{step === 0 ? "Get Started" : "Next"} <ChevronRight style={{ width: 16, height: 16 }} /></>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
