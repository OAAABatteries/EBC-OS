// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Onboarding Wizard
//  Eagles Brothers Constructors · Houston, TX
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { ROLES } from "../data/roles";
import { hashPasswordSync } from "../utils/passwordHash";

const wizardStyles = `
@keyframes wizFadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes wizLogoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes wizPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(224,148,34,0.4); }
  50% { box-shadow: 0 0 0 12px rgba(224,148,34,0); }
}

.wizard-screen {
  min-height: 100vh;
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
  background: radial-gradient(ellipse at 50% 30%, rgba(224,148,34,0.05) 0%, transparent 70%);
}
.wizard-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 560px;
  margin: 20px;
  background: rgba(12,15,22,0.9);
  backdrop-filter: blur(24px) saturate(1.8);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
  min-height: 480px;
  display: flex;
  flex-direction: column;
}
.wizard-skip {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: 1px solid #1c2233;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  color: #8494ad;
  cursor: pointer;
  font-family: 'Barlow', sans-serif;
  transition: all 0.2s;
}
.wizard-skip:hover {
  border-color: #e09422;
  color: #d4dae6;
}
.wizard-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.wizard-slide {
  animation: wizFadeIn 0.4s ease;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.wizard-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  display: block;
  margin: 0 auto 16px;
  animation: wizLogoFloat 4s ease-in-out infinite;
}
.wizard-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #e09422;
  text-align: center;
  letter-spacing: 1px;
}
.wizard-desc {
  font-size: 14px;
  color: #8494ad;
  text-align: center;
  margin-top: 8px;
  line-height: 1.6;
}
.wizard-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 28px;
}
.wizard-feature {
  background: rgba(224,148,34,0.05);
  border: 1px solid rgba(224,148,34,0.1);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  transition: border-color 0.2s;
}
.wizard-feature:hover {
  border-color: rgba(224,148,34,0.3);
}
.wizard-feature-icon {
  font-size: 28px;
  margin-bottom: 8px;
}
.wizard-feature-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #d4dae6;
}
.wizard-feature-desc {
  font-size: 11px;
  color: #8494ad;
  margin-top: 4px;
}
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #1c2233;
}
.wizard-dots {
  display: flex;
  gap: 8px;
}
.wizard-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1c2233;
  transition: all 0.3s;
}
.wizard-dot.active {
  background: #e09422;
  box-shadow: 0 0 8px rgba(224,148,34,0.4);
}
.wizard-dot.done {
  background: #455068;
}
.wizard-btn {
  background: #e09422;
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(224,148,34,0.2);
}
.wizard-btn:hover {
  background: #f0a83a;
  transform: translateY(-1px);
}
.wizard-btn-ghost {
  background: transparent;
  border: 1px solid #1c2233;
  color: #8494ad;
  box-shadow: none;
}
.wizard-btn-ghost:hover {
  border-color: #455068;
  color: #d4dae6;
  background: transparent;
}
.wizard-launch {
  animation: wizPulse 2s ease-in-out infinite;
  font-size: 18px;
  padding: 14px 40px;
}

/* Team setup form */
.wizard-team-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}
.wizard-team-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wizard-team-field.full {
  grid-column: 1 / -1;
}
.wizard-team-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8494ad;
  font-weight: 600;
}
.wizard-team-input, .wizard-team-select {
  background: #06080c;
  border: 1px solid #1c2233;
  border-radius: 6px;
  padding: 8px 10px;
  color: #d4dae6;
  font-family: 'Barlow', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.wizard-team-input:focus, .wizard-team-select:focus {
  border-color: #e09422;
}
.wizard-team-input::placeholder {
  color: #455068;
}
.wizard-team-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.wizard-team-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
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
.wizard-team-row-name {
  color: #d4dae6;
  font-weight: 500;
}
.wizard-team-row-role {
  font-size: 11px;
  color: #e09422;
  background: rgba(224,148,34,0.1);
  padding: 2px 8px;
  border-radius: 4px;
}
.wizard-team-remove {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
}

.wizard-ready-icon {
  font-size: 56px;
  text-align: center;
  margin: 20px 0;
}

@media (max-width: 480px) {
  .wizard-card {
    margin: 12px;
    padding: 28px 20px;
  }
  .wizard-features {
    grid-template-columns: 1fr;
  }
  .wizard-team-form {
    grid-template-columns: 1fr;
  }
}
`;

const FEATURES = [
  { icon: "\ud83d\udcca", label: "Dashboard", desc: "Real-time KPIs & analytics" },
  { icon: "\ud83d\udcc4", label: "Bids", desc: "Track & manage all bids" },
  { icon: "\ud83c\udfd7\ufe0f", label: "Projects", desc: "Full project lifecycle" },
  { icon: "\ud83d\udccf", label: "Estimating", desc: "Material takeoffs & pricing" },
];

const ROLE_OPTIONS = Object.entries(ROLES).filter(([k]) => k !== "owner");

export function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);

  // Team form state
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("pm");
  const [memberPin, setMemberPin] = useState("");

  const STEPS = 4;

  const handleAddMember = useCallback(() => {
    if (!memberName || !memberEmail) return;

    const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
    const newUser = {
      id: users.length + 1,
      name: memberName,
      email: memberEmail.toLowerCase(),
      password: hashPasswordSync(memberPin || "ebc2026"),
      role: memberRole,
      pin: memberPin ? hashPasswordSync(memberPin) : null,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem("ebc_users", JSON.stringify(users));

    setTeamMembers(prev => [...prev, { name: memberName, email: memberEmail, role: memberRole }]);
    setMemberName("");
    setMemberEmail("");
    setMemberRole("pm");
    setMemberPin("");
  }, [memberName, memberEmail, memberRole, memberPin]);

  const handleRemoveMember = (idx) => {
    const member = teamMembers[idx];
    // Remove from localStorage
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const filtered = users.filter(u => u.email.toLowerCase() !== member.email.toLowerCase());
      localStorage.setItem("ebc_users", JSON.stringify(filtered));
    } catch {}
    setTeamMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleComplete = () => {
    localStorage.setItem("ebc_onboarding_complete", "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="wizard-screen">
      <style>{wizardStyles}</style>
      <div className="wizard-bg" />

      <div className="wizard-card">
        <button className="wizard-skip" onClick={handleSkip}>Skip</button>

        <div className="wizard-content">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="wizard-slide">
              <img src="/eagle.png" alt="EBC" className="wizard-logo" onError={(e) => { e.target.style.display = "none"; }} />
              <div className="wizard-title">Welcome to EBC</div>
              <div className="wizard-desc">
                Your complete construction management platform.<br />
                Bids, projects, estimating, scheduling, safety, and more — all in one place.
              </div>
              <div style={{ flex: 1 }} />
            </div>
          )}

          {/* Step 1: Quick Tour */}
          {step === 1 && (
            <div className="wizard-slide">
              <div className="wizard-title" style={{ fontSize: 22, marginBottom: 4 }}>Quick Tour</div>
              <div className="wizard-desc" style={{ marginBottom: 0 }}>Core features at a glance</div>
              <div className="wizard-features">
                {FEATURES.map(f => (
                  <div key={f.label} className="wizard-feature">
                    <div className="wizard-feature-icon">{f.icon}</div>
                    <div className="wizard-feature-label">{f.label}</div>
                    <div className="wizard-feature-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }} />
            </div>
          )}

          {/* Step 2: Team Setup */}
          {step === 2 && (
            <div className="wizard-slide">
              <div className="wizard-title" style={{ fontSize: 22, marginBottom: 4 }}>Invite Your Team</div>
              <div className="wizard-desc" style={{ marginBottom: 0 }}>Add team members now or skip for later</div>

              <div className="wizard-team-form">
                <div className="wizard-team-field">
                  <label className="wizard-team-label">Name</label>
                  <input
                    className="wizard-team-input"
                    placeholder="John Doe"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                  />
                </div>
                <div className="wizard-team-field">
                  <label className="wizard-team-label">Email</label>
                  <input
                    className="wizard-team-input"
                    placeholder="john@ebc.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                </div>
                <div className="wizard-team-field">
                  <label className="wizard-team-label">Role</label>
                  <select
                    className="wizard-team-select"
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map(([key, r]) => (
                      <option key={key} value={key}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="wizard-team-field">
                  <label className="wizard-team-label">PIN (field workers)</label>
                  <input
                    className="wizard-team-input"
                    placeholder="4-digit PIN"
                    maxLength={6}
                    value={memberPin}
                    onChange={(e) => setMemberPin(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="wizard-team-actions">
                <button className="wizard-btn" style={{ padding: "8px 16px", fontSize: 13 }} onClick={handleAddMember}>
                  + Add User
                </button>
              </div>

              {teamMembers.length > 0 && (
                <div className="wizard-team-list">
                  {teamMembers.map((m, i) => (
                    <div key={i} className="wizard-team-row">
                      <span className="wizard-team-row-name">{m.name}</span>
                      <span className="wizard-team-row-role">{ROLES[m.role]?.label || m.role}</span>
                      <button className="wizard-team-remove" onClick={() => handleRemoveMember(i)} title="Remove">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ flex: 1 }} />
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="wizard-slide" style={{ alignItems: "center", justifyContent: "center" }}>
              <div className="wizard-ready-icon">{"\ud83d\ude80"}</div>
              <div className="wizard-title">You're All Set!</div>
              <div className="wizard-desc" style={{ marginBottom: 32 }}>
                EBC is ready. Your data, your team, your way.
              </div>
              <button className="wizard-btn wizard-launch" onClick={handleComplete}>
                Launch EBC
              </button>
            </div>
          )}
        </div>

        {/* Footer with dots and nav */}
        {step < 3 && (
          <div className="wizard-footer">
            <div className="wizard-dots">
              {Array.from({ length: STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`wizard-dot ${i === step ? "active" : i < step ? "done" : ""}`}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button className="wizard-btn wizard-btn-ghost" onClick={prev}>Back</button>
              )}
              <button className="wizard-btn" onClick={next}>
                {step === 2 ? (teamMembers.length > 0 ? "Next" : "Skip for Now") : "Next"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
