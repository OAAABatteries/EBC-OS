import { useState } from "react";
import { DollarSign, TrendingUp, Heart, Wrench, HardHat } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Job Application Portal — Public-facing careers page
//  Access via: yoursite.com/#/careers
//  Collects: name, contact, experience, skills, trade level
// ═══════════════════════════════════════════════════════════════

const PORTAL_STYLES = `
  .job-portal { min-height:100vh;background:#0a0e1a;color:#e2e8f0;font-family:'Inter',system-ui,sans-serif; }
  .job-header { background:linear-gradient(135deg,#0f172a 0%,#1a2744 50%,#0f172a 100%);
    padding:48px 32px;text-align:center;border-bottom:1px solid rgba(245,158,11,0.15); }
  .job-hero { font-size:36px;font-weight:800;color:#f59e0b;letter-spacing:1px;margin-bottom:4px; }
  .job-hero-sub { font-size:15px;color:#94a3b8;max-width:500px;margin: "0" auto; }
  .job-body { max-width:640px;margin: "0" auto;padding:32px 24px; }
  .job-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:16px; }
  .job-input { width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
    background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:14px;font-family:inherit;box-sizing:border-box; }
  .job-input:focus { outline:none;border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.2); }
  .job-input::placeholder { color:#475569; }
  .job-label { display:block;font-size:12px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px; }
  .job-btn { padding:14px 28px;border-radius:8px;border:none;font-weight:700;font-size:15px;cursor:pointer;
    background:#f59e0b;color:#0a0e1a;transition:all 0.2s;font-family:inherit;width:100%; }
  .job-btn:hover { background:#fbbf24;transform:translateY(-1px); }
  .job-grid { display:grid;grid-template-columns:1fr 1fr;gap: var(--space-4); }
  @media(max-width:500px) { .job-grid { grid-template-columns:1fr; } .job-body { padding:20px 16px; } .job-hero { font-size:26px; } }
  .job-success { padding:24px;border-radius:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);
    text-align:center;color:#10b981;margin-top:20px; }
  .job-success h3 { margin: 0 0 8px; }
  .skill-btn { padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;
    border:1px solid rgba(255,255,255,0.1);background:transparent;color:#64748b;transition:all 0.15s;font-family:inherit; }
  .skill-btn.active { background:rgba(245,158,11,0.15);color:#f59e0b;border-color:#f59e0b; }
  .perk { display:flex;gap: var(--space-3);align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05); }
  .perk-icon { font-size:24px;width:40px;text-align:center; }
  .perk-text { font-size:13px; }
  .perk-title { font-weight:600;color:#e2e8f0; }
`;

const TRADES = ["Metal Framing", "Drywall Hang", "Tape & Finish", "ACT Ceilings", "Demo", "Lead-Lined Board", "Doors & Hardware", "General Labor"];
const LEVELS = ["Apprentice (0-2 yrs)", "Journeyman (2-5 yrs)", "Experienced (5-10 yrs)", "Master (10+ yrs)", "Foreman"];
const TOOLS_OWN = ["Screw Gun", "Saw", "Laser Level", "Stilts", "Router", "Banjo", "T-Square", "Impact Driver"];

export default function JobPortal() {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", age: "",
    trade: "", level: "", yearsExp: "",
    skills: [], toolsOwned: [],
    driversLicense: "yes", ownTransport: "yes",
    availability: "immediate",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleSkill = (s) => setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }));
  const toggleTool = (t) => setForm(f => ({ ...f, toolsOwned: f.toolsOwned.includes(t) ? f.toolsOwned.filter(x => x !== t) : [...f.toolsOwned, t] }));

  const handleSubmit = () => {
    if (!form.name || !form.phone) return;
    setSubmitted(true);
    // In production: save to Supabase, send notification to Emmanuel
  };

  return (
    <div className="job-portal">
      <style>{PORTAL_STYLES}</style>

      <div className="job-header">
        <div className="job-hero">JOIN THE EBC CREW</div>
        <div className="job-hero-sub">
          Eagles Brothers Constructors is Houston's premier drywall & framing subcontractor. We're always looking for skilled tradespeople.
        </div>
      </div>

      <div className="job-body">
        {/* Perks */}
        <div className="job-card">
          <div className="fw-bold mb-sp3 fs-card">Why EBC?</div>
          {[
            [DollarSign, "Competitive Pay", "Top rates for skilled labor. Weekly pay."],
            [TrendingUp, "Growth", "Clear path from apprentice to foreman to PM."],
            [Heart, "Benefits", "Health insurance, PTO, bonuses for performance."],
            [Wrench, "Quality Work", "We take pride in our craft. No shortcuts."],
            [HardHat, "Respect", "Family company. Your work matters here."],
          ].map(([Icon, title, desc]) => (
            <div key={title} className="perk">
              <div className="perk-icon"><Icon style={{ width: 24, height: 24 }} /></div>
              <div className="perk-text"><div className="perk-title">{title}</div><div className="fs-label c-text2">{desc}</div></div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="job-success">
            <h3>Application Received!</h3>
            <div className="fs-secondary">Thank you, {form.name}. Our team will review your application and contact you within 48 hours.</div>
            <button className="job-btn mt-sp4" style={{ maxWidth: 200, margin: "16px auto 0" }} onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", email: "", age: "", trade: "", level: "", yearsExp: "", skills: [], toolsOwned: [], driversLicense: "yes", ownTransport: "yes", availability: "immediate", notes: "" }); }}>Apply Again</button>
          </div>
        ) : (
          <>
            {/* Personal Info */}
            <div className="job-card">
              <div className="fw-bold mb-sp4">Personal Information</div>
              <div className="job-grid mb-sp4">
                <div><label className="job-label">Full Name *</label><input className="job-input" placeholder="First & Last Name" value={form.name} onChange={e => upd("name", e.target.value)} /></div>
                <div><label className="job-label">Phone *</label><input className="job-input" type="tel" placeholder="713-555-0000" value={form.phone} onChange={e => upd("phone", e.target.value)} /></div>
              </div>
              <div className="job-grid">
                <div><label className="job-label">Email</label><input className="job-input" type="email" placeholder="Optional" value={form.email} onChange={e => upd("email", e.target.value)} /></div>
                <div><label className="job-label">Age</label><input className="job-input" type="number" placeholder="e.g. 28" value={form.age} onChange={e => upd("age", e.target.value)} /></div>
              </div>
            </div>

            {/* Trade & Experience */}
            <div className="job-card">
              <div className="fw-bold mb-sp4">Trade & Experience</div>
              <div className="job-grid mb-sp4">
                <div>
                  <label className="job-label">Primary Trade</label>
                  <select className="job-input" value={form.trade} onChange={e => upd("trade", e.target.value)}>
                    <option value="">Select...</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="job-label">Skill Level</label>
                  <select className="job-input" value={form.level} onChange={e => upd("level", e.target.value)}>
                    <option value="">Select...</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-sp4">
                <label className="job-label">Years of Experience</label>
                <input className="job-input" type="number" placeholder="e.g. 5" value={form.yearsExp} onChange={e => upd("yearsExp", e.target.value)} style={{ maxWidth: 120 }} />
              </div>
              <div className="mb-sp4">
                <label className="job-label">Skills (select all that apply)</label>
                <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
                  {TRADES.map(s => <button key={s} className={`skill-btn ${form.skills.includes(s) ? "active" : ""}`} onClick={() => toggleSkill(s)}>{s}</button>)}
                </div>
              </div>
              <div>
                <label className="job-label">Tools You Own</label>
                <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
                  {TOOLS_OWN.map(t => <button key={t} className={`skill-btn ${form.toolsOwned.includes(t) ? "active" : ""}`} onClick={() => toggleTool(t)}>{t}</button>)}
                </div>
              </div>
            </div>

            {/* Logistics */}
            <div className="job-card">
              <div className="fw-bold mb-sp4">Logistics</div>
              <div className="job-grid mb-sp4">
                <div>
                  <label className="job-label">Driver's License?</label>
                  <select className="job-input" value={form.driversLicense} onChange={e => upd("driversLicense", e.target.value)}>
                    <option value="yes">Yes</option><option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="job-label">Own Transportation?</label>
                  <select className="job-input" value={form.ownTransport} onChange={e => upd("ownTransport", e.target.value)}>
                    <option value="yes">Yes</option><option value="no">No</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="job-label">Availability</label>
                <select className="job-input" value={form.availability} onChange={e => upd("availability", e.target.value)}>
                  <option value="immediate">Immediate</option>
                  <option value="1_week">Within 1 week</option>
                  <option value="2_weeks">Within 2 weeks</option>
                  <option value="1_month">Within 1 month</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="job-card">
              <label className="job-label">Anything Else?</label>
              <textarea className="job-input" style={{ minHeight: 80, resize: "vertical" }} placeholder="Certifications, OSHA training, references..." value={form.notes} onChange={e => upd("notes", e.target.value)} />
            </div>

            <button className="job-btn" onClick={handleSubmit}>Submit Application</button>
          </>
        )}

        <div className="fs-tab c-text3 text-center" style={{ padding: "var(--space-10) 0 var(--space-5)" }}>
          Eagles Brothers Constructors · Houston, TX · Equal Opportunity Employer
        </div>
      </div>
    </div>
  );
}
