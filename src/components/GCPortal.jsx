import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
//  GC Portal — External-facing page for GC PMs & Superintendents
//  Access via: yoursite.com/#/gc-portal
//  Features: Request bids, request manpower, view project status
// ═══════════════════════════════════════════════════════════════

const PORTAL_STYLES = `
  .gc-portal { min-height:100vh;background:#0a0e1a;color:#e2e8f0;font-family:'Inter',system-ui,sans-serif; }
  .gc-header { background:linear-gradient(135deg,#0f172a,#1e293b);border-bottom:1px solid rgba(255,255,255,0.06);
    padding:20px 32px;display:flex;align-items:center;justify-content:space-between; }
  .gc-logo { font-size:20px;font-weight:800;color:#f59e0b;letter-spacing:1px; }
  .gc-logo-sub { font-size:10px;color:#94a3b8;display:block;margin-top:-2px; }
  .gc-body { max-width:800px;margin:0 auto;padding:32px 24px; }
  .gc-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:16px; }
  .gc-card:hover { border-color:rgba(245,158,11,0.3); }
  .gc-title { font-size:18px;font-weight:700;margin-bottom:4px; }
  .gc-subtitle { font-size:13px;color:#94a3b8; }
  .gc-input { width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);
    background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:14px;font-family:inherit; }
  .gc-input:focus { outline:none;border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.2); }
  .gc-input::placeholder { color:#475569; }
  .gc-textarea { min-height:100px;resize:vertical; }
  .gc-btn { padding:12px 24px;border-radius:8px;border:none;font-weight:700;font-size:14px;cursor:pointer;
    transition:all 0.2s;font-family:inherit; }
  .gc-btn-primary { background:#f59e0b;color:#0a0e1a; }
  .gc-btn-primary:hover { background:#fbbf24;transform:translateY(-1px); }
  .gc-btn-ghost { background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.1); }
  .gc-btn-ghost:hover { color:#f59e0b;border-color:#f59e0b; }
  .gc-label { display:block;font-size:12px;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px; }
  .gc-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
  @media(max-width:640px) { .gc-grid { grid-template-columns:1fr; } .gc-body { padding:20px 16px; } }
  .gc-badge { padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600; }
  .gc-badge-green { background:rgba(16,185,129,0.15);color:#10b981; }
  .gc-badge-amber { background:rgba(245,158,11,0.15);color:#f59e0b; }
  .gc-badge-blue { background:rgba(59,130,246,0.15);color:#3b82f6; }
  .gc-tabs { display:flex;gap:4px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px; }
  .gc-tab { padding:8px 16px;border:none;background:none;color:#64748b;font-size:13px;font-weight:500;cursor:pointer;
    border-radius:6px 6px 0 0;transition:all 0.15s;font-family:inherit; }
  .gc-tab:hover { color:#e2e8f0;background:rgba(255,255,255,0.04); }
  .gc-tab.active { color:#f59e0b;border-bottom:2px solid #f59e0b; }
  .gc-success { padding:20px;border-radius:12px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);
    text-align:center;color:#10b981;font-weight:600; }
`;

export default function GCPortal({ projects, contacts }) {
  const [authed, setAuthed] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCompany, setLoginCompany] = useState("");
  const [tab, setTab] = useState("projects");
  const [bidForm, setBidForm] = useState({ projectName: "", address: "", scope: "", timeline: "", notes: "", plans: null });
  const [manpowerForm, setManpowerForm] = useState({ project: "", tradeNeeded: "Drywall", crewSize: "", startDate: "", duration: "", notes: "" });
  const [submitted, setSubmitted] = useState(null);

  // Filter projects for this GC
  const gcProjects = useMemo(() => {
    if (!authed) return [];
    return (projects || []).filter(p => p.gc?.toLowerCase().includes(loginCompany.toLowerCase()) && p.status !== "completed");
  }, [authed, projects, loginCompany]);

  // Login screen
  if (!authed) {
    return (
      <div className="gc-portal">
        <style>{PORTAL_STYLES}</style>
        <div className="gc-header">
          <div>
            <div className="gc-logo">EAGLES BROTHERS</div>
            <div className="gc-logo-sub">GC Partner Portal</div>
          </div>
        </div>
        <div className="gc-body" style={{ maxWidth: 440, marginTop: 60 }}>
          <div className="gc-card">
            <div className="gc-title" style={{ marginBottom: 20 }}>Welcome</div>
            <div style={{ marginBottom: 16 }}>
              <label className="gc-label">Your Email</label>
              <input className="gc-input" type="email" placeholder="pm@generalcontractor.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="gc-label">Company Name</label>
              <input className="gc-input" placeholder="e.g. Forney Construction" value={loginCompany} onChange={e => setLoginCompany(e.target.value)} />
            </div>
            <button className="gc-btn gc-btn-primary" style={{ width: "100%" }}
              onClick={() => {
                if (!loginEmail || !loginCompany) return;
                setAuthed(true);
              }}>
              Access Portal
            </button>
            <div className="gc-subtitle" style={{ textAlign: "center", marginTop: 16 }}>
              No account needed — enter your email and company to get started.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleBidRequest = () => {
    if (!bidForm.projectName) return;
    setSubmitted("bid");
    // In production: save to Supabase + send notification to Abner
    setTimeout(() => setSubmitted(null), 5000);
    setBidForm({ projectName: "", address: "", scope: "", timeline: "", notes: "", plans: null });
  };

  const handleManpowerRequest = () => {
    if (!manpowerForm.project || !manpowerForm.crewSize) return;
    setSubmitted("manpower");
    setTimeout(() => setSubmitted(null), 5000);
    setManpowerForm({ project: "", tradeNeeded: "Drywall", crewSize: "", startDate: "", duration: "", notes: "" });
  };

  return (
    <div className="gc-portal">
      <style>{PORTAL_STYLES}</style>
      <div className="gc-header">
        <div>
          <div className="gc-logo">EAGLES BROTHERS</div>
          <div className="gc-logo-sub">GC Partner Portal · {loginCompany}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{loginEmail}</span>
          <button className="gc-btn gc-btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setAuthed(false)}>Sign Out</button>
        </div>
      </div>

      <div className="gc-body">
        <div className="gc-tabs">
          {["projects", "request bid", "request manpower", "contact"].map(t => (
            <button key={t} className={`gc-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>

        {submitted && (
          <div className="gc-success" style={{ marginBottom: 20 }}>
            {submitted === "bid" ? "Bid request submitted! Our estimating team will reach out within 24 hours." : "Manpower request submitted! We'll confirm crew availability shortly."}
          </div>
        )}

        {/* ── Active Projects ── */}
        {tab === "projects" && (
          <div>
            <div className="gc-title" style={{ marginBottom: 16 }}>Your Active Projects</div>
            {gcProjects.length === 0 ? (
              <div className="gc-card"><div className="gc-subtitle">No active projects found for {loginCompany}. Request a bid to get started.</div></div>
            ) : gcProjects.map(p => (
              <div key={p.id} className="gc-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                    <div className="gc-subtitle">{p.address || "Address TBD"}{p.suite ? ` · ${p.suite}` : ""}</div>
                  </div>
                  <span className={`gc-badge ${p.status === "in-progress" ? "gc-badge-green" : p.status === "on-hold" ? "gc-badge-amber" : "gc-badge-blue"}`}>
                    {p.status}
                  </span>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 24 }}>
                  <div><span className="gc-label" style={{ marginBottom: 2 }}>Progress</span><div style={{ fontWeight: 600 }}>{p.progress || 0}%</div></div>
                  <div><span className="gc-label" style={{ marginBottom: 2 }}>PM</span><div>{p.pm || "TBD"}</div></div>
                  <div><span className="gc-label" style={{ marginBottom: 2 }}>Start</span><div>{p.start || "TBD"}</div></div>
                </div>
                <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p.progress || 0}%`, background: "#10b981", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Request Bid ── */}
        {tab === "request bid" && (
          <div>
            <div className="gc-title" style={{ marginBottom: 4 }}>Request a Bid</div>
            <div className="gc-subtitle" style={{ marginBottom: 20 }}>Send us your project details and we'll have a proposal ready within 48 hours.</div>
            <div className="gc-card">
              <div className="gc-grid" style={{ marginBottom: 16 }}>
                <div>
                  <label className="gc-label">Project Name *</label>
                  <input className="gc-input" placeholder="e.g. Memorial Hermann 4th Floor" value={bidForm.projectName} onChange={e => setBidForm(f => ({ ...f, projectName: e.target.value }))} />
                </div>
                <div>
                  <label className="gc-label">Project Address</label>
                  <input className="gc-input" placeholder="Full address" value={bidForm.address} onChange={e => setBidForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="gc-label">Scope of Work</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {["Demo", "Metal Framing", "Drywall", "ACT Ceilings", "Tape & Finish", "Doors & Hardware", "Lead-Lined", "Insulation"].map(s => (
                    <button key={s} className="gc-btn gc-btn-ghost" style={{ padding: "4px 12px", fontSize: 11, background: bidForm.scope.includes(s) ? "rgba(245,158,11,0.15)" : "transparent", color: bidForm.scope.includes(s) ? "#f59e0b" : "#64748b", borderColor: bidForm.scope.includes(s) ? "#f59e0b" : undefined }}
                      onClick={() => setBidForm(f => ({ ...f, scope: f.scope.includes(s) ? f.scope.replace(s + ", ", "").replace(s, "") : (f.scope ? f.scope + ", " + s : s) }))}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="gc-grid" style={{ marginBottom: 16 }}>
                <div>
                  <label className="gc-label">Bid Due Date</label>
                  <input className="gc-input" type="date" value={bidForm.timeline} onChange={e => setBidForm(f => ({ ...f, timeline: e.target.value }))} />
                </div>
                <div>
                  <label className="gc-label">Plans (PDF)</label>
                  <input className="gc-input" type="file" accept=".pdf,.dwg,.zip" onChange={e => setBidForm(f => ({ ...f, plans: e.target.files?.[0] || null }))} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="gc-label">Notes / Special Requirements</label>
                <textarea className="gc-input gc-textarea" placeholder="Any additional details..." value={bidForm.notes} onChange={e => setBidForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="gc-btn gc-btn-primary" onClick={handleBidRequest}>Submit Bid Request</button>
            </div>
          </div>
        )}

        {/* ── Request Manpower ── */}
        {tab === "request manpower" && (
          <div>
            <div className="gc-title" style={{ marginBottom: 4 }}>Request Manpower</div>
            <div className="gc-subtitle" style={{ marginBottom: 20 }}>Need additional crew? Let us know and we'll confirm availability.</div>
            <div className="gc-card">
              <div className="gc-grid" style={{ marginBottom: 16 }}>
                <div>
                  <label className="gc-label">Project *</label>
                  <select className="gc-input" value={manpowerForm.project} onChange={e => setManpowerForm(f => ({ ...f, project: e.target.value }))}>
                    <option value="">Select project...</option>
                    {gcProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="__new">New project (not listed)</option>
                  </select>
                </div>
                <div>
                  <label className="gc-label">Trade Needed</label>
                  <select className="gc-input" value={manpowerForm.tradeNeeded} onChange={e => setManpowerForm(f => ({ ...f, tradeNeeded: e.target.value }))}>
                    {["Drywall", "Metal Framing", "ACT Ceilings", "Tape & Finish", "Demo", "General Labor"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="gc-grid" style={{ marginBottom: 16 }}>
                <div>
                  <label className="gc-label">Crew Size *</label>
                  <input className="gc-input" type="number" placeholder="e.g. 4" value={manpowerForm.crewSize} onChange={e => setManpowerForm(f => ({ ...f, crewSize: e.target.value }))} />
                </div>
                <div>
                  <label className="gc-label">Start Date</label>
                  <input className="gc-input" type="date" value={manpowerForm.startDate} onChange={e => setManpowerForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="gc-label">Duration / Notes</label>
                <textarea className="gc-input gc-textarea" placeholder="e.g. 2 weeks, 6:30 AM start..." value={manpowerForm.notes} onChange={e => setManpowerForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="gc-btn gc-btn-primary" onClick={handleManpowerRequest}>Submit Request</button>
            </div>
          </div>
        )}

        {/* ── Contact ── */}
        {tab === "contact" && (
          <div>
            <div className="gc-title" style={{ marginBottom: 16 }}>Contact Us</div>
            <div className="gc-card">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Eagles Brothers Constructors</div>
                <div className="gc-subtitle">Drywall & Interior Framing Subcontractor</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><span className="gc-label">Office</span><div>7801 N Shepherd Dr, Suite 107, Houston, TX 77088</div></div>
                <div><span className="gc-label">Phone</span><div><a href="tel:+17138206868" style={{ color: "#f59e0b" }}>713-820-6868</a></div></div>
                <div><span className="gc-label">Email</span><div><a href="mailto:estimating@ebchouston.com" style={{ color: "#f59e0b" }}>estimating@ebchouston.com</a></div></div>
                <div><span className="gc-label">Estimating</span><div>Abner Aguilar · <a href="mailto:abner@ebchouston.com" style={{ color: "#f59e0b" }}>abner@ebchouston.com</a></div></div>
                <div><span className="gc-label">Operations</span><div>Emmanuel Aguilar · <a href="mailto:emmanuel@ebchouston.com" style={{ color: "#f59e0b" }}>emmanuel@ebchouston.com</a></div></div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "40px 0 20px", color: "#475569", fontSize: 11 }}>
          Eagles Brothers Constructors · Houston, TX · Quality. Dependability.
        </div>
      </div>
    </div>
  );
}
