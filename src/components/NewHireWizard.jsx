// ═══════════════════════════════════════════════════════════════
//  EBC-OS · New Hire Onboarding Wizard
//  Eagles Brothers Constructors · Houston, TX
//  Self-service 6-step onboarding flow for new employees
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";

const STEP_LABELS = [
  "Personal Info",
  "Role & Trade",
  "Certifications",
  "Logistics",
  "Documents",
  "Review",
];

const TRADE_SKILLS = [
  "Metal Framing",
  "Drywall Hang",
  "Tape & Finish",
  "ACT",
  "Demo",
  "Lead-Lined",
  "Doors",
  "General Labor",
];

const CERT_LIST = [
  { key: "osha10", label: "OSHA 10" },
  { key: "osha30", label: "OSHA 30" },
  { key: "firstAid", label: "First Aid / CPR" },
  { key: "forklift", label: "Forklift" },
  { key: "scissorLift", label: "Scissor Lift" },
  { key: "leadAbatement", label: "Lead Abatement" },
  { key: "icra", label: "ICRA" },
];

const SHIRT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const TRANSPORT_OPTIONS = ["Own Vehicle", "Carpool", "Needs Ride"];
const TOOL_OPTIONS = ["Own Tools", "Needs Tools"];
const LANG_OPTIONS = ["English", "Spanish", "Both"];

const INITIAL_FORM = {
  // Step 1 — Personal
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  emergencyName: "",
  emergencyPhone: "",
  // Step 2 — Role & Trade
  role: "Laborer",
  tradeSkills: [],
  yearsExperience: "",
  // Step 3 — Certifications
  certifications: {},
  // Step 4 — Logistics
  shirtSize: "L",
  transportation: "Own Vehicle",
  toolOwnership: "Own Tools",
  preferredLanguage: "English",
  // Step 5 — Documents
  w4Submitted: false,
  i9Submitted: false,
  directDepositSubmitted: false,
};

/* ── inline styles (matches EBC dark branding) ── */
const nhwStyles = `
@keyframes nhwFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.nhw-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(6,8,12,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow', sans-serif;
  padding: 12px;
  overflow-y: auto;
}

.nhw-card {
  width: 100%;
  max-width: 600px;
  background: #0c0f16;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  max-height: 96vh;
  overflow: hidden;
}

/* ── header ── */
.nhw-header {
  padding: 24px 28px 0;
  flex-shrink: 0;
}
.nhw-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.nhw-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #e09422;
  letter-spacing: 0.5px;
}
.nhw-close {
  background: none;
  border: 1px solid #1c2233;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  color: #8494ad;
  cursor: pointer;
  font-family: 'Barlow', sans-serif;
}
.nhw-close:hover { border-color: #e09422; color: #d4dae6; }

/* ── progress ── */
.nhw-progress-bar {
  width: 100%;
  height: 4px;
  background: #1c2233;
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
}
.nhw-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e09422, #f0a83a);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── step indicators ── */
.nhw-steps {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2px;
}
.nhw-step-pill {
  flex: 1;
  min-width: 0;
  text-align: center;
  padding: 6px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #455068;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s;
}
.nhw-step-pill.active {
  color: #e09422;
  border-bottom-color: #e09422;
}
.nhw-step-pill.done {
  color: #8494ad;
  border-bottom-color: #455068;
}

/* ── body ── */
.nhw-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 28px 8px;
  animation: nhwFadeIn 0.3s ease;
}

/* ── form elements ── */
.nhw-section-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #d4dae6;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}
.nhw-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.nhw-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nhw-field.full {
  grid-column: 1 / -1;
}
.nhw-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8494ad;
  font-weight: 600;
}
.nhw-input, .nhw-select {
  background: #06080c;
  border: 1px solid #1c2233;
  border-radius: 6px;
  padding: 10px 12px;
  color: #d4dae6;
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}
.nhw-input:focus, .nhw-select:focus {
  border-color: #e09422;
}
.nhw-input::placeholder {
  color: #455068;
}

/* ── checkboxes / toggles ── */
.nhw-checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.nhw-checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #06080c;
  border: 1px solid #1c2233;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.nhw-checkbox-item:hover {
  border-color: #455068;
}
.nhw-checkbox-item.checked {
  border-color: rgba(224,148,34,0.4);
  background: rgba(224,148,34,0.06);
}
.nhw-checkbox-item .nhw-cb-box {
  width: 18px;
  height: 18px;
  border: 2px solid #455068;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  font-size: 12px;
  color: transparent;
}
.nhw-checkbox-item.checked .nhw-cb-box {
  border-color: #e09422;
  background: #e09422;
  color: #000;
}
.nhw-checkbox-item .nhw-cb-label {
  font-size: 13px;
  color: #d4dae6;
  font-weight: 500;
}

/* ── cert rows ── */
.nhw-cert-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #06080c;
  border: 1px solid #1c2233;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s;
}
.nhw-cert-row.active {
  border-color: rgba(224,148,34,0.4);
  background: rgba(224,148,34,0.06);
}
.nhw-cert-toggle {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #1c2233;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
  border: none;
  padding: 0;
}
.nhw-cert-toggle.on {
  background: #e09422;
}
.nhw-cert-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #d4dae6;
  transition: transform 0.2s;
}
.nhw-cert-toggle.on::after {
  transform: translateX(18px);
}
.nhw-cert-name {
  flex: 1;
  font-size: 13px;
  color: #d4dae6;
  font-weight: 500;
}
.nhw-cert-exp {
  width: 130px;
  flex-shrink: 0;
}

/* ── review section ── */
.nhw-review-section {
  margin-bottom: 18px;
}
.nhw-review-heading {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #e09422;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #1c2233;
}
.nhw-review-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}
.nhw-review-row .label {
  color: #8494ad;
}
.nhw-review-row .value {
  color: #d4dae6;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}
.nhw-review-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
  max-width: 60%;
}
.nhw-review-chip {
  font-size: 11px;
  background: rgba(224,148,34,0.1);
  color: #e09422;
  padding: 2px 8px;
  border-radius: 4px;
}
.nhw-review-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.nhw-review-badge.yes {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
}
.nhw-review-badge.no {
  background: rgba(239,68,68,0.1);
  color: #ef4444;
}

/* ── footer ── */
.nhw-footer {
  padding: 16px 28px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #1c2233;
  flex-shrink: 0;
}
.nhw-btn {
  background: #e09422;
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 10px 28px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(224,148,34,0.2);
}
.nhw-btn:hover:not(:disabled) {
  background: #f0a83a;
  transform: translateY(-1px);
}
.nhw-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.nhw-btn-ghost {
  background: transparent;
  border: 1px solid #1c2233;
  color: #8494ad;
  box-shadow: none;
}
.nhw-btn-ghost:hover {
  border-color: #455068;
  color: #d4dae6;
  background: transparent;
  transform: none;
}
.nhw-btn-submit {
  background: #22c55e;
  padding: 12px 36px;
  font-size: 16px;
  box-shadow: 0 4px 16px rgba(34,197,94,0.2);
}
.nhw-btn-submit:hover:not(:disabled) {
  background: #2dd96b;
}

/* ── radio group ── */
.nhw-radio-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.nhw-radio-item {
  padding: 8px 16px;
  border: 1px solid #1c2233;
  border-radius: 8px;
  background: #06080c;
  color: #8494ad;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.nhw-radio-item:hover {
  border-color: #455068;
}
.nhw-radio-item.selected {
  border-color: #e09422;
  background: rgba(224,148,34,0.08);
  color: #e09422;
}

/* ── document check items ── */
.nhw-doc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #06080c;
  border: 1px solid #1c2233;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.nhw-doc-item.checked {
  border-color: rgba(34,197,94,0.4);
  background: rgba(34,197,94,0.04);
}
.nhw-doc-check {
  width: 24px;
  height: 24px;
  border: 2px solid #455068;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
  color: transparent;
  transition: all 0.2s;
}
.nhw-doc-item.checked .nhw-doc-check {
  border-color: #22c55e;
  background: #22c55e;
  color: #fff;
}
.nhw-doc-info { flex: 1; }
.nhw-doc-title {
  font-size: 14px;
  font-weight: 600;
  color: #d4dae6;
}
.nhw-doc-desc {
  font-size: 11px;
  color: #8494ad;
  margin-top: 2px;
}

@media (max-width: 520px) {
  .nhw-card { border-radius: 12px; }
  .nhw-header { padding: 18px 18px 0; }
  .nhw-body { padding: 16px 18px 8px; }
  .nhw-footer { padding: 14px 18px 18px; }
  .nhw-grid { grid-template-columns: 1fr; }
  .nhw-checkbox-grid { grid-template-columns: 1fr; }
  .nhw-cert-row { flex-wrap: wrap; }
  .nhw-cert-exp { width: 100%; margin-top: 4px; }
  .nhw-steps { gap: 2px; }
  .nhw-step-pill { font-size: 10px; padding: 5px 2px; }
  .nhw-radio-group { flex-direction: column; }
  .nhw-radio-item { text-align: center; }
}
`;

export function NewHireWizard({ onSubmit, onClose }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const TOTAL = STEP_LABELS.length;
  const progress = ((step + 1) / TOTAL) * 100;

  const set = useCallback((key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleSkill = useCallback((skill) => {
    setForm((prev) => ({
      ...prev,
      tradeSkills: prev.tradeSkills.includes(skill)
        ? prev.tradeSkills.filter((s) => s !== skill)
        : [...prev.tradeSkills, skill],
    }));
  }, []);

  const toggleCert = useCallback((key) => {
    setForm((prev) => {
      const certs = { ...prev.certifications };
      if (certs[key]) {
        delete certs[key];
      } else {
        certs[key] = { has: true, expires: "" };
      }
      return { ...prev, certifications: certs };
    });
  }, []);

  const setCertExp = useCallback((key, date) => {
    setForm((prev) => ({
      ...prev,
      certifications: {
        ...prev.certifications,
        [key]: { ...prev.certifications[key], expires: date },
      },
    }));
  }, []);

  // Validation per step
  const canProceed = () => {
    switch (step) {
      case 0:
        return form.firstName.trim() && form.lastName.trim() && form.phone.trim();
      case 1:
        return form.role && form.tradeSkills.length > 0;
      case 2:
        return true; // certs are optional
      case 3:
        return true; // logistics all have defaults
      case 4:
        return true; // doc status is just checkmarks
      case 5:
        return true; // review
      default:
        return true;
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const employee = {
      id: crypto.randomUUID(),
      name: fullName,
      role: form.role,
      pin: String(Math.floor(1000 + Math.random() * 9000)), // auto-generate 4-digit PIN
      phone: form.phone,
      email: form.email || "",
      schedule: { start: "06:30", end: "15:00" },
      hourlyRate: form.role === "Foreman" ? 42 : form.role === "Journeyman" ? 35 : form.role === "Apprentice" ? 22 : 18,
      active: true,
      avatar: null,
      notifications: { schedule: true, materials: true, deliveries: true },
      defaultProjectId: null,
      // Extended onboarding data
      onboarding: {
        emergencyContact: { name: form.emergencyName, phone: form.emergencyPhone },
        tradeSkills: form.tradeSkills,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : 0,
        certifications: form.certifications,
        shirtSize: form.shirtSize,
        transportation: form.transportation,
        toolOwnership: form.toolOwnership,
        preferredLanguage: form.preferredLanguage,
        documents: {
          w4: form.w4Submitted,
          i9: form.i9Submitted,
          directDeposit: form.directDepositSubmitted,
        },
        completedAt: new Date().toISOString(),
      },
    };
    onSubmit(employee);
  };

  // ── Render helpers ──
  const renderStepIndicators = () => (
    <div className="nhw-steps">
      {STEP_LABELS.map((label, i) => (
        <div
          key={label}
          className={`nhw-step-pill ${i === step ? "active" : i < step ? "done" : ""}`}
        >
          {label}
        </div>
      ))}
    </div>
  );

  const renderPersonalInfo = () => (
    <div key="step-0">
      <div className="nhw-section-title">Personal Information</div>
      <div className="nhw-grid">
        <div className="nhw-field">
          <label className="nhw-label">First Name *</label>
          <input
            className="nhw-input"
            placeholder="Juan"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            autoFocus
          />
        </div>
        <div className="nhw-field">
          <label className="nhw-label">Last Name *</label>
          <input
            className="nhw-input"
            placeholder="Hernandez"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <div className="nhw-field">
          <label className="nhw-label">Phone *</label>
          <input
            className="nhw-input"
            placeholder="713-555-0100"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className="nhw-field">
          <label className="nhw-label">Email</label>
          <input
            className="nhw-input"
            placeholder="juan@email.com"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="nhw-field">
          <label className="nhw-label">Emergency Contact Name</label>
          <input
            className="nhw-input"
            placeholder="Maria Hernandez"
            value={form.emergencyName}
            onChange={(e) => set("emergencyName", e.target.value)}
          />
        </div>
        <div className="nhw-field">
          <label className="nhw-label">Emergency Contact Phone</label>
          <input
            className="nhw-input"
            placeholder="713-555-0200"
            type="tel"
            value={form.emergencyPhone}
            onChange={(e) => set("emergencyPhone", e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderRoleTrade = () => (
    <div key="step-1">
      <div className="nhw-section-title">Role & Trade Skills</div>
      <div className="nhw-grid">
        <div className="nhw-field">
          <label className="nhw-label">Role *</label>
          <select
            className="nhw-select"
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
          >
            <option value="Laborer">Laborer</option>
            <option value="Apprentice">Apprentice</option>
            <option value="Journeyman">Journeyman</option>
            <option value="Foreman">Foreman</option>
          </select>
        </div>
        <div className="nhw-field">
          <label className="nhw-label">Years of Experience</label>
          <input
            className="nhw-input"
            placeholder="0"
            type="number"
            min="0"
            max="50"
            value={form.yearsExperience}
            onChange={(e) => set("yearsExperience", e.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <label className="nhw-label" style={{ marginBottom: 10, display: "block" }}>
          Trade Skills * (select all that apply)
        </label>
        <div className="nhw-checkbox-grid">
          {TRADE_SKILLS.map((skill) => {
            const checked = form.tradeSkills.includes(skill);
            return (
              <div
                key={skill}
                className={`nhw-checkbox-item ${checked ? "checked" : ""}`}
                onClick={() => toggleSkill(skill)}
              >
                <div className="nhw-cb-box">{checked ? "\u2713" : ""}</div>
                <span className="nhw-cb-label">{skill}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCertifications = () => (
    <div key="step-2">
      <div className="nhw-section-title">Certifications</div>
      <p style={{ fontSize: 12, color: "#8494ad", marginBottom: 14 }}>
        Toggle on any certifications you hold and enter the expiration date.
      </p>
      {CERT_LIST.map((cert) => {
        const active = !!form.certifications[cert.key];
        return (
          <div key={cert.key} className={`nhw-cert-row ${active ? "active" : ""}`}>
            <button
              type="button"
              className={`nhw-cert-toggle ${active ? "on" : ""}`}
              onClick={() => toggleCert(cert.key)}
              aria-label={`Toggle ${cert.label}`}
            />
            <span className="nhw-cert-name">{cert.label}</span>
            {active && (
              <div className="nhw-cert-exp">
                <input
                  className="nhw-input"
                  type="date"
                  value={form.certifications[cert.key]?.expires || ""}
                  onChange={(e) => setCertExp(cert.key, e.target.value)}
                  style={{ padding: "6px 8px", fontSize: 12 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderLogistics = () => (
    <div key="step-3">
      <div className="nhw-section-title">Logistics</div>
      <div style={{ marginBottom: 20 }}>
        <label className="nhw-label" style={{ marginBottom: 8, display: "block" }}>Shirt Size</label>
        <div className="nhw-radio-group">
          {SHIRT_SIZES.map((sz) => (
            <div
              key={sz}
              className={`nhw-radio-item ${form.shirtSize === sz ? "selected" : ""}`}
              onClick={() => set("shirtSize", sz)}
            >
              {sz}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label className="nhw-label" style={{ marginBottom: 8, display: "block" }}>Transportation</label>
        <div className="nhw-radio-group">
          {TRANSPORT_OPTIONS.map((opt) => (
            <div
              key={opt}
              className={`nhw-radio-item ${form.transportation === opt ? "selected" : ""}`}
              onClick={() => set("transportation", opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label className="nhw-label" style={{ marginBottom: 8, display: "block" }}>Tool Ownership</label>
        <div className="nhw-radio-group">
          {TOOL_OPTIONS.map((opt) => (
            <div
              key={opt}
              className={`nhw-radio-item ${form.toolOwnership === opt ? "selected" : ""}`}
              onClick={() => set("toolOwnership", opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="nhw-label" style={{ marginBottom: 8, display: "block" }}>Preferred Language</label>
        <div className="nhw-radio-group">
          {LANG_OPTIONS.map((opt) => (
            <div
              key={opt}
              className={`nhw-radio-item ${form.preferredLanguage === opt ? "selected" : ""}`}
              onClick={() => set("preferredLanguage", opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div key="step-4">
      <div className="nhw-section-title">Document Checklist</div>
      <p style={{ fontSize: 12, color: "#8494ad", marginBottom: 14 }}>
        Mark each document as submitted. Actual forms are handled by HR &mdash; this is just a status tracker.
      </p>
      <div
        className={`nhw-doc-item ${form.w4Submitted ? "checked" : ""}`}
        onClick={() => set("w4Submitted", !form.w4Submitted)}
      >
        <div className="nhw-doc-check">{form.w4Submitted ? "\u2713" : ""}</div>
        <div className="nhw-doc-info">
          <div className="nhw-doc-title">W-4 (Federal Tax Withholding)</div>
          <div className="nhw-doc-desc">Employee tax withholding election form</div>
        </div>
      </div>
      <div
        className={`nhw-doc-item ${form.i9Submitted ? "checked" : ""}`}
        onClick={() => set("i9Submitted", !form.i9Submitted)}
      >
        <div className="nhw-doc-check">{form.i9Submitted ? "\u2713" : ""}</div>
        <div className="nhw-doc-info">
          <div className="nhw-doc-title">I-9 (Employment Eligibility)</div>
          <div className="nhw-doc-desc">Identity and work authorization verification</div>
        </div>
      </div>
      <div
        className={`nhw-doc-item ${form.directDepositSubmitted ? "checked" : ""}`}
        onClick={() => set("directDepositSubmitted", !form.directDepositSubmitted)}
      >
        <div className="nhw-doc-check">{form.directDepositSubmitted ? "\u2713" : ""}</div>
        <div className="nhw-doc-info">
          <div className="nhw-doc-title">Direct Deposit</div>
          <div className="nhw-doc-desc">Bank routing and account information for payroll</div>
        </div>
      </div>
    </div>
  );

  const getCertLabel = (key) => CERT_LIST.find((c) => c.key === key)?.label || key;

  const renderReview = () => {
    const activeCerts = Object.entries(form.certifications).filter(([, v]) => v?.has);
    return (
      <div key="step-5">
        <div className="nhw-section-title">Review & Submit</div>
        <p style={{ fontSize: 12, color: "#8494ad", marginBottom: 16 }}>
          Please review all information before submitting. You can go back to make changes.
        </p>

        <div className="nhw-review-section">
          <div className="nhw-review-heading">Personal Info</div>
          <div className="nhw-review-row">
            <span className="label">Name</span>
            <span className="value">{form.firstName} {form.lastName}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Phone</span>
            <span className="value">{form.phone || "---"}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Email</span>
            <span className="value">{form.email || "---"}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Emergency Contact</span>
            <span className="value">
              {form.emergencyName ? `${form.emergencyName} (${form.emergencyPhone || "no phone"})` : "---"}
            </span>
          </div>
        </div>

        <div className="nhw-review-section">
          <div className="nhw-review-heading">Role & Trade</div>
          <div className="nhw-review-row">
            <span className="label">Role</span>
            <span className="value">{form.role}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Experience</span>
            <span className="value">{form.yearsExperience ? `${form.yearsExperience} yrs` : "---"}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Trade Skills</span>
            <div className="nhw-review-chips">
              {form.tradeSkills.map((s) => (
                <span key={s} className="nhw-review-chip">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="nhw-review-section">
          <div className="nhw-review-heading">Certifications</div>
          {activeCerts.length === 0 ? (
            <div className="nhw-review-row">
              <span className="label">None added</span>
            </div>
          ) : (
            activeCerts.map(([key, val]) => (
              <div className="nhw-review-row" key={key}>
                <span className="label">{getCertLabel(key)}</span>
                <span className="value">{val.expires || "No expiration set"}</span>
              </div>
            ))
          )}
        </div>

        <div className="nhw-review-section">
          <div className="nhw-review-heading">Logistics</div>
          <div className="nhw-review-row">
            <span className="label">Shirt Size</span>
            <span className="value">{form.shirtSize}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Transportation</span>
            <span className="value">{form.transportation}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Tools</span>
            <span className="value">{form.toolOwnership}</span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Language</span>
            <span className="value">{form.preferredLanguage}</span>
          </div>
        </div>

        <div className="nhw-review-section">
          <div className="nhw-review-heading">Documents</div>
          <div className="nhw-review-row">
            <span className="label">W-4</span>
            <span className={`nhw-review-badge ${form.w4Submitted ? "yes" : "no"}`}>
              {form.w4Submitted ? "Submitted" : "Pending"}
            </span>
          </div>
          <div className="nhw-review-row">
            <span className="label">I-9</span>
            <span className={`nhw-review-badge ${form.i9Submitted ? "yes" : "no"}`}>
              {form.i9Submitted ? "Submitted" : "Pending"}
            </span>
          </div>
          <div className="nhw-review-row">
            <span className="label">Direct Deposit</span>
            <span className={`nhw-review-badge ${form.directDepositSubmitted ? "yes" : "no"}`}>
              {form.directDepositSubmitted ? "Submitted" : "Pending"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const STEP_RENDERERS = [
    renderPersonalInfo,
    renderRoleTrade,
    renderCertifications,
    renderLogistics,
    renderDocuments,
    renderReview,
  ];

  return (
    <div className="nhw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{nhwStyles}</style>
      <div className="nhw-card">
        {/* Header */}
        <div className="nhw-header">
          <div className="nhw-header-row">
            <div className="nhw-title">New Hire Onboarding</div>
            <button className="nhw-close" onClick={onClose}>Cancel</button>
          </div>
          <div className="nhw-progress-bar">
            <div className="nhw-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {renderStepIndicators()}
        </div>

        {/* Body */}
        <div className="nhw-body" key={step}>
          {STEP_RENDERERS[step]()}
        </div>

        {/* Footer */}
        <div className="nhw-footer">
          <div>
            {step > 0 && (
              <button className="nhw-btn nhw-btn-ghost" onClick={prev}>
                Back
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {step < TOTAL - 1 ? (
              <button className="nhw-btn" onClick={next} disabled={!canProceed()}>
                Next
              </button>
            ) : (
              <button
                className="nhw-btn nhw-btn-submit"
                onClick={handleSubmit}
                disabled={!form.firstName.trim() || !form.lastName.trim()}
              >
                Submit & Create Employee
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
