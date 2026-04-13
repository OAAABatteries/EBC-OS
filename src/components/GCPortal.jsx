import { useState, useMemo } from "react";
import { initProjects, initContacts, initChangeOrders, MS, COMPANY_DEFAULTS } from "../data/constants";

// ═══════════════════════════════════════════════════════════════
//  GC Portal — External-facing page for GC PMs & Superintendents
//  Access via: yoursite.com/#/gc-portal
//  Professional light theme, mobile-responsive
// ═══════════════════════════════════════════════════════════════

const PORTAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .gcp { min-height:100vh;background:#f4f6f9;color:#1e293b;font-family:'Inter',system-ui,sans-serif; }

  /* ── Header ── */
  .gcp-header { background:#ffffff;border-bottom:1px solid #e2e8f0;padding:0 32px;display:flex;align-items:center;justify-content:space-between;height:64px;position:sticky;top:0;z-index:50;box-shadow:0 1px 3px rgba(0,0,0,0.04); }
  .gcp-logo { display:flex;align-items:center;gap: var(--space-3); }
  .gcp-logo-icon { width:36px;height:36px;
    background:#1a2e4a;
    -webkit-mask-image:url(/ebc-eagle-white.png);mask-image:url(/ebc-eagle-white.png);
    -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
    -webkit-mask-position:center;mask-position:center;
    -webkit-mask-size:contain;mask-size:contain; }
  .gcp-logo-text { font-size:16px;font-weight:700;color:#1a2e4a; }
  .gcp-logo-sub { font-size:11px;color:#64748b;font-weight:500; }
  .gcp-user { display:flex;align-items:center;gap: var(--space-3); }
  .gcp-user-email { font-size:12px;color:#64748b; }

  /* ── Body ── */
  .gcp-body { max-width:960px;margin: "0" auto;padding:24px 24px 60px; }

  /* ── Navigation Tabs ── */
  .gcp-nav { display:flex;gap: var(--space-1);margin-bottom:24px;background:#fff;border-radius:10px;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #e2e8f0;overflow-x:auto; }
  .gcp-nav-btn { padding:10px 18px;border:none;background:none;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;border-radius:8px;transition:all 0.15s;font-family:inherit;white-space:nowrap; }
  .gcp-nav-btn:hover { color:#1e293b;background:#f1f5f9; }
  .gcp-nav-btn.active { color:#fff;background:#1a2e4a;box-shadow:0 1px 3px rgba(0,0,0,0.12); }

  /* ── Cards ── */
  .gcp-card { background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;transition:box-shadow 0.15s; }
  .gcp-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.06); }
  .gcp-card-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px; }

  /* ── Section Title ── */
  .gcp-section-title { font-size:18px;font-weight:700;color:#0f172a;margin-bottom:4px; }
  .gcp-section-desc { font-size:13px;color:#64748b;margin-bottom:20px; }

  /* ── Badges ── */
  .gcp-badge { padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:capitalize; }
  .gcp-badge-green { background:#ecfdf5;color:#059669; }
  .gcp-badge-amber { background:#fffbeb;color:#d97706; }
  .gcp-badge-blue { background:#eff6ff;color:#2563eb; }
  .gcp-badge-red { background:#fef2f2;color:#dc2626; }
  .gcp-badge-gray { background:#f1f5f9;color:#64748b; }
  .gcp-badge-purple { background:#f5f3ff;color:#7c3aed; }

  /* ── Progress Bar ── */
  .gcp-progress { height:6px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin-top:8px; }
  .gcp-progress-fill { height:100%;border-radius:6px;transition:width 0.4s ease; }

  /* ── Form Elements ── */
  .gcp-label { display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px; }
  .gcp-input { width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#1e293b;font-size:14px;font-family:inherit;box-sizing:border-box; }
  .gcp-input:focus { outline:none;border-color:#1a2e4a;box-shadow:0 0 0 3px rgba(26,46,74,0.1); }
  .gcp-input::placeholder { color:#9ca3af; }
  .gcp-textarea { min-height:100px;resize:vertical; }
  .gcp-select { appearance:auto; }
  .gcp-checkbox-group { display:flex;flex-wrap:wrap;gap: var(--space-2);margin-top:4px; }
  .gcp-chip { padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#64748b;transition:all 0.15s; }
  .gcp-chip.selected { background:#1a2e4a;color:#fff;border-color:#1a2e4a; }
  .gcp-chip:hover { border-color:#1a2e4a; }

  /* ── Demo banner ── */
  .gcp-demo-banner { background:#fffbeb;border-bottom:1px solid #fcd34d;padding:6px 32px;text-align:center;font-size:12px;font-weight:600;color:#92400e;letter-spacing:0.5px; }

  /* ── Buttons ── */
  .gcp-btn { padding:12px 24px;border-radius:8px;border:none;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;font-family:inherit; }
  .gcp-btn-primary { background:#1a2e4a;color:#fff; }
  .gcp-btn-primary:hover { background:#243b5c;transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,46,74,0.25); }
  .gcp-btn-ghost { background:transparent;color:#64748b;border:1px solid #d1d5db; }
  .gcp-btn-ghost:hover { color:#1a2e4a;border-color:#1a2e4a; }

  /* ── Grid ── */
  .gcp-grid { display:grid;grid-template-columns:1fr 1fr;gap: var(--space-4); }
  .gcp-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap: var(--space-4); }
  .gcp-stat-row { display:flex;gap: var(--space-4);flex-wrap:wrap;margin-top:12px; }
  .gcp-stat { flex:1;min-width:70px; }
  .gcp-stat-label { font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px; }
  .gcp-stat-value { font-size:15px;font-weight:700;color:#0f172a; }

  /* ── Table ── */
  .gcp-table { width:100%;border-collapse:collapse; }
  .gcp-table th { text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:8px 12px;border-bottom:2px solid #e2e8f0; }
  .gcp-table td { padding:12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155; }
  .gcp-table tr:hover td { background:#f8fafc; }

  /* ── Success ── */
  .gcp-success { padding:16px 20px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;text-align:center;color:#059669;font-weight:600;font-size:14px;margin-bottom:20px; }

  /* ── Contact Card ── */
  .gcp-contact { display:flex;gap: var(--space-4);padding:16px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;align-items:center; }
  .gcp-contact-avatar { width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;flex-shrink:0; }
  .gcp-contact-info { flex:1;min-width:0; }
  .gcp-contact-name { font-weight:700;font-size:14px;color:#0f172a; }
  .gcp-contact-role { font-size:12px;color:#64748b; }
  .gcp-contact-links { display:flex;gap: var(--space-2);margin-top:6px; }
  .gcp-contact-link { font-size:12px;color:#2563eb;text-decoration:none;font-weight:500; }
  .gcp-contact-link:hover { text-decoration:underline; }

  /* ── Document row ── */
  .gcp-doc-row { display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f1f5f9; }
  .gcp-doc-row:last-child { border-bottom:none; }
  .gcp-doc-info { display:flex;align-items:center;gap: var(--space-3); }
  .gcp-doc-icon { width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0; }

  /* ── Login ── */
  .gcp-login-wrap { display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 64px);padding:24px; }
  .gcp-login-card { width:100%;max-width:420px; }

  /* ── Milestone ── */
  .gcp-milestone-bar { display:flex;gap: var(--space-1);margin-top:10px; }
  .gcp-milestone-step { flex:1;height:4px;border-radius:2px;background:#e2e8f0; }
  .gcp-milestone-step.done { background:#059669; }
  .gcp-milestone-step.current { background:#2563eb; }

  /* ── Responsive ── */
  @media(max-width:768px) {
    .gcp-header { padding:0 16px; }
    .gcp-body { padding:16px 16px 60px; }
    .gcp-grid, .gcp-grid-3 { grid-template-columns:1fr; }
    .gcp-nav { gap:0; }
    .gcp-nav-btn { padding:8px 12px;font-size:12px; }
    .gcp-stat-row { gap: var(--space-3); }
    .gcp-table { font-size:12px; }
    .gcp-table th, .gcp-table td { padding:8px 6px; }
    .gcp-card-header { flex-direction:column;gap: var(--space-2); }
  }
  @media(max-width:480px) {
    .gcp-logo-text { font-size:14px; }
    .gcp-user-email { display:none; }
  }
`;

// ── Mock data generators (simulating real data for demo) ──
function getMilestoneIndex(project) {
  const p = project.progress || 0;
  if (p >= 95) return 7;  // Punch/CO
  if (p >= 75) return 5;  // Tape
  if (p >= 50) return 4;  // Board
  if (p >= 25) return 3;  // Framing
  if (p >= 10) return 2;  // Buyout
  if (p >= 5)  return 1;  // Submittal
  return 0;               // Award
}

function getNextMilestone(project) {
  const idx = getMilestoneIndex(project);
  return idx < MS.length - 1 ? MS[idx + 1] : "Closeout";
}

function getDailyReportSummary(project) {
  const summaries = [
    "Framing continues on schedule. No issues reported.",
    "Board hanging in progress, 60% of area complete.",
    "Taping team on site, mudding Level 2 corridors.",
    "Demo complete, framing layout started.",
    "ACT ceiling grid installed, tiles going up Monday.",
    "Lead-lined drywall installation — radiation shielding verified.",
    "Punch list walkthrough scheduled for end of week.",
    "Material delivery received. Crew mobilized.",
  ];
  // Deterministic based on project id
  return summaries[project.id % summaries.length];
}

// Simulated documents
function getProjectDocuments(project) {
  const docs = [];
  const hasSubmittal = (project.progress || 0) >= 5;
  const hasCO = initChangeOrders.some(co => co.projectId === project.id);

  if (hasSubmittal) {
    docs.push({ type: "Submittal", name: `${project.name} — Material Submittal`, status: "approved", date: project.start });
  }
  docs.push({ type: "RFI", name: `RFI-001: ${project.name} Field Conditions`, status: project.progress > 20 ? "closed" : "open", date: project.start });
  if (hasCO) {
    const co = initChangeOrders.find(c => c.projectId === project.id);
    docs.push({ type: "CO", name: `${co.number}: ${co.desc.split("—")[0].trim()}`, status: co.status, date: co.submitted });
  }
  docs.push({ type: "Insurance", name: "Certificate of Insurance (COI)", status: "current", date: "2026-01-15" });
  return docs;
}

// Simulated invoices
function getProjectInvoices(project) {
  const contract = project.contract || 0;
  if (contract === 0) return [];
  const invoices = [];
  const progress = project.progress || 0;

  if (progress >= 10) {
    invoices.push({
      number: `INV-${project.id}01`,
      desc: "Progress Billing #1 — Mobilization & Demo",
      amount: Math.round(contract * 0.15),
      date: project.start,
      status: "paid",
    });
  }
  if (progress >= 35) {
    invoices.push({
      number: `INV-${project.id}02`,
      desc: "Progress Billing #2 — Framing",
      amount: Math.round(contract * 0.30),
      date: project.start,
      status: "paid",
    });
  }
  if (progress >= 60) {
    invoices.push({
      number: `INV-${project.id}03`,
      desc: "Progress Billing #3 — Board & Finish",
      amount: Math.round(contract * 0.30),
      date: project.start,
      status: "pending",
    });
  }
  if (progress >= 90) {
    invoices.push({
      number: `INV-${project.id}04`,
      desc: "Progress Billing #4 — Punch & Closeout",
      amount: Math.round(contract * 0.25),
      date: project.start,
      status: "pending",
    });
  }
  return invoices;
}

const SCOPE_OPTIONS = ["Demo", "Metal Framing", "Drywall", "ACT Ceilings", "Tape & Finish", "Doors & Hardware", "Lead-Lined", "Insulation", "Shaft Wall"];
const TRADE_OPTIONS = ["Drywall", "Metal Framing", "ACT Ceilings", "Tape & Finish", "Demo", "General Labor"];
const CERT_OPTIONS = ["OSHA 10", "OSHA 30", "ICRA", "Lead Abatement Cert", "Confined Space", "Scissor Lift Cert", "Fork Lift Cert"];

const DOC_ICONS = {
  Submittal: { icon: "\u{1F4CB}", bg: "#eff6ff" },
  RFI:       { icon: "\u{2753}", bg: "#fffbeb" },
  CO:        { icon: "\u{1F4DD}", bg: "#f5f3ff" },
  Insurance: { icon: "\u{1F6E1}\uFE0F", bg: "#ecfdf5" },
};

const DOC_STATUS_BADGE = {
  approved: "gcp-badge-green",
  closed:   "gcp-badge-gray",
  open:     "gcp-badge-blue",
  current:  "gcp-badge-green",
  pending:  "gcp-badge-amber",
};

export default function GCPortal() {
  const projects = initProjects;
  const contacts = initContacts;

  const [authed, setAuthed] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCompany, setLoginCompany] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [bidForm, setBidForm] = useState({ projectName: "", address: "", scope: "", timeline: "", notes: "", plans: null });
  const [manpowerForm, setManpowerForm] = useState({
    project: "", tradeNeeded: "Drywall", teamSize: "", startDate: "", endDate: "",
    notes: "", certs: [],
  });
  const [submitted, setSubmitted] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  // Filter projects for this GC
  const gcProjects = useMemo(() => {
    if (!authed) return [];
    return (projects || []).filter(p =>
      p.gc?.toLowerCase().includes(loginCompany.toLowerCase()) && p.status !== "completed"
    );
  }, [authed, projects, loginCompany]);

  // All projects including completed for invoice history
  const allGcProjects = useMemo(() => {
    if (!authed) return [];
    return (projects || []).filter(p =>
      p.gc?.toLowerCase().includes(loginCompany.toLowerCase())
    );
  }, [authed, projects, loginCompany]);

  // GC contacts
  const gcContacts = useMemo(() => {
    if (!authed) return [];
    return (contacts || []).filter(c =>
      c.company?.toLowerCase().includes(loginCompany.toLowerCase())
    );
  }, [authed, contacts, loginCompany]);

  // Aggregate invoices
  const allInvoices = useMemo(() => {
    return allGcProjects.flatMap(p => getProjectInvoices(p).map(inv => ({ ...inv, projectName: p.name })));
  }, [allGcProjects]);

  // All documents
  const allDocuments = useMemo(() => {
    return gcProjects.flatMap(p => getProjectDocuments(p).map(d => ({ ...d, projectName: p.name })));
  }, [gcProjects]);

  // ── Login screen ──
  if (!authed) {
    return (
      <div className="gcp">
        <style>{PORTAL_STYLES}</style>
        <div className="gcp-header">
          <div className="gcp-logo">
            <div className="gcp-logo-icon" />
            <div>
              <div className="gcp-logo-text">Eagles Brothers Constructors</div>
              <div className="gcp-logo-sub">GC Partner Portal</div>
            </div>
          </div>
        </div>
        <div className="gcp-login-wrap">
          <div className="gcp-card gcp-login-card p-sp8">
            <div className="text-center" style={{ marginBottom: 28 }}>
              <div className="gcp-logo-icon" style={{ width: 56, height: 56, margin: "0 auto 16px" }} />
              <div className="gcp-section-title">Welcome to the GC Portal</div>
              <div className="gcp-section-desc" style={{ marginBottom: "0" }}>Access your project dashboard, request teams, and track documents.</div>
            </div>
            <div className="mb-sp4">
              <label className="gcp-label">Your Email</label>
              <input className="gcp-input" type="email" placeholder="pm@generalcontractor.com"
                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loginEmail && loginCompany && setAuthed(true)} />
            </div>
            <div className="mb-sp6">
              <label className="gcp-label">Company Name</label>
              <input className="gcp-input" placeholder="e.g. Forney Construction"
                value={loginCompany} onChange={e => setLoginCompany(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loginEmail && loginCompany && setAuthed(true)} />
            </div>
            <button className="gcp-btn gcp-btn-primary w-full"
              onClick={() => { if (loginEmail && loginCompany) setAuthed(true); }}>
              Access Portal
            </button>
            <div className="fs-label mt-sp4 c-text2 text-center">
              No account needed. Enter your email and company to view your projects.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Handlers ──
  const handleBidRequest = () => {
    if (!bidForm.projectName) return;
    setSubmitted("bid");
    setTimeout(() => setSubmitted(null), 5000);
    setBidForm({ projectName: "", address: "", scope: "", timeline: "", notes: "", plans: null });
  };

  const handleManpowerRequest = () => {
    if (!manpowerForm.project || !manpowerForm.teamSize) return;
    setSubmitted("manpower");
    setTimeout(() => setSubmitted(null), 5000);
    setManpowerForm({ project: "", tradeNeeded: "Drywall", teamSize: "", startDate: "", endDate: "", notes: "", certs: [] });
  };

  const toggleCert = (cert) => {
    setManpowerForm(f => ({
      ...f,
      certs: f.certs.includes(cert) ? f.certs.filter(c => c !== cert) : [...f.certs, cert],
    }));
  };

  const toggleScope = (s) => {
    setBidForm(f => ({
      ...f,
      scope: f.scope.includes(s)
        ? f.scope.replace(s + ", ", "").replace(", " + s, "").replace(s, "")
        : (f.scope ? f.scope + ", " + s : s),
    }));
  };

  const totalCrewOnSite = gcProjects.reduce((sum, p) => sum + (p.teamSize || 0), 0);
  const activeCount = gcProjects.filter(p => p.status === "in-progress").length;

  const TABS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "documents", label: "Documents" },
    { key: "invoices", label: "Invoices" },
    { key: "manpower", label: "Request Manpower" },
    { key: "bid", label: "Request Bid" },
    { key: "contact", label: "Contact" },
  ];

  return (
    <div className="gcp">
      <style>{PORTAL_STYLES}</style>
      <div className="gcp-demo-banner">DEMO — Sample data only. Live project sync coming soon.</div>

      {/* ── Header ── */}
      <div className="gcp-header">
        <div className="gcp-logo">
          <div className="gcp-logo-icon" />
          <div>
            <div className="gcp-logo-text">Eagles Brothers</div>
            <div className="gcp-logo-sub">Partner Portal</div>
          </div>
        </div>
        <div className="gcp-user">
          <span className="gcp-user-email">{loginEmail}</span>
          <button className="gcp-btn gcp-btn-ghost fs-label" style={{ padding: "var(--space-2) var(--space-4)" }}
            onClick={() => setAuthed(false)}>Sign Out</button>
        </div>
      </div>

      <div className="gcp-body">
        {/* ── Company Welcome ── */}
        <div className="mb-sp5">
          <div className="fs-subtitle fw-bold" style={{ color: "var(--bg)" }}>{loginCompany}</div>
          <div className="fs-label c-text3">{activeCount} active project{activeCount !== 1 ? "s" : ""} with EBC</div>
        </div>

        {/* ── Navigation ── */}
        <div className="gcp-nav">
          {TABS.map(t => (
            <button key={t.key} className={`gcp-nav-btn ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── Success Banner ── */}
        {submitted && (
          <div className="gcp-success">
            {submitted === "bid"
              ? "Bid request submitted! Our estimating team will reach out within 24 hours."
              : "Manpower request submitted! We'll confirm team availability shortly."}
          </div>
        )}

        {/* ═══════════ DASHBOARD ═══════════ */}
        {tab === "dashboard" && (
          <div>
            {/* Summary Cards */}
            <div className="gcp-grid-3 mb-sp5">
              <div className="gcp-card text-center">
                <div className="gcp-stat-label">Active Projects</div>
                <div className="fw-bold fs-stat" style={{ color: "#1a2e4a" }}>{activeCount}</div>
              </div>
              <div className="gcp-card text-center">
                <div className="gcp-stat-label">Crew on Site Today</div>
                <div className="fw-bold fs-stat c-green">{totalCrewOnSite}</div>
              </div>
              <div className="gcp-card text-center">
                <div className="gcp-stat-label">Open Documents</div>
                <div className="fw-bold fs-stat c-blue">
                  {allDocuments.filter(d => d.status === "open" || d.status === "pending").length}
                </div>
              </div>
            </div>

            {/* Project List */}
            <div className="gcp-section-title mb-sp4">Your Active Projects</div>
            {gcProjects.length === 0 ? (
              <div className="gcp-card">
                <div className="p-sp5 c-text3 text-center">
                  No active projects found for <strong>{loginCompany}</strong>. Request a bid to get started.
                </div>
              </div>
            ) : gcProjects.map(p => {
              const msIdx = getMilestoneIndex(p);
              const isExpanded = expandedProject === p.id;
              return (
                <div key={p.id} className="gcp-card cursor-pointer"
                  onClick={() => setExpandedProject(isExpanded ? null : p.id)}>
                  <div className="gcp-card-header">
                    <div className="flex-1">
                      <div className="fs-secondary fw-bold mb-sp1" style={{ color: "var(--bg)" }}>{p.name}</div>
                      <div className="fs-label c-text3">
                        {p.address || "Address TBD"}{p.suite ? ` \u00B7 ${p.suite}` : ""}
                      </div>
                    </div>
                    <span className={`gcp-badge ${p.status === "in-progress" ? "gcp-badge-green" : p.status === "on-hold" ? "gcp-badge-amber" : "gcp-badge-blue"}`}>
                      {p.status === "in-progress" ? "In Progress" : p.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="gcp-progress">
                    <div className="gcp-progress-fill" style={{
                      width: `${p.progress || 0}%`,
                      background: (p.progress || 0) >= 90 ? "#059669" : (p.progress || 0) >= 50 ? "#2563eb" : "#f59e0b",
                    }} />
                  </div>
                  <div className="fs-tab mt-sp1 c-text2" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{p.progress || 0}% Complete</span>
                    <span>Next: {getNextMilestone(p)}</span>
                  </div>

                  {/* Stats Row */}
                  <div className="gcp-stat-row">
                    <div className="gcp-stat">
                      <div className="gcp-stat-label">Crew on Site</div>
                      <div className="gcp-stat-value">{p.teamSize || 0}</div>
                    </div>
                    <div className="gcp-stat">
                      <div className="gcp-stat-label">PM</div>
                      <div className="gcp-stat-value fs-label">{p.pm || "TBD"}</div>
                    </div>
                    <div className="gcp-stat">
                      <div className="gcp-stat-label">Start</div>
                      <div className="gcp-stat-value fs-label">{p.start || "TBD"}</div>
                    </div>
                    <div className="gcp-stat">
                      <div className="gcp-stat-label">End</div>
                      <div className="gcp-stat-value fs-label">{p.end || "TBD"}</div>
                    </div>
                  </div>

                  {/* Milestone Steps */}
                  <div className="gcp-milestone-bar">
                    {MS.map((m, i) => (
                      <div key={m} className={`gcp-milestone-step ${i < msIdx ? "done" : i === msIdx ? "current" : ""}`}
                        title={m} />
                    ))}
                  </div>
                  <div className="mt-sp1 fs-xs c-text2" style={{ display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
                    {MS.map(m => <span key={m}>{m}</span>)}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="mt-sp4" style={{ paddingTop: "var(--space-4)", borderTop: "1px solid #e2e8f0" }}
                      onClick={e => e.stopPropagation()}>
                      <div className="fw-semi mb-sp2 fs-label" style={{ color: "var(--bg)" }}>Latest Daily Report</div>
                      <div className="rounded-control fs-label p-sp3 c-text3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        {getDailyReportSummary(p)}
                      </div>
                      <div className="fw-semi mb-sp2 fs-label mt-sp4" style={{ color: "var(--bg)" }}>Scope</div>
                      <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
                        {(p.scope || []).map(s => (
                          <span key={s} className="gcp-badge gcp-badge-gray">{s}</span>
                        ))}
                      </div>
                      {p.contract && (
                        <>
                          <div className="fw-semi mb-sp1 fs-label mt-sp4" style={{ color: "var(--bg)" }}>Contract</div>
                          <div className="fs-secondary fw-bold c-green">${(p.contract).toLocaleString()}</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════ DOCUMENTS ═══════════ */}
        {tab === "documents" && (
          <div>
            <div className="gcp-section-title">Documents</div>
            <div className="gcp-section-desc">Submittals, RFIs, Change Orders, and Insurance certificates shared with your team.</div>

            {allDocuments.length === 0 ? (
              <div className="gcp-card">
                <div className="p-sp5 c-text3 text-center">No documents found for your projects.</div>
              </div>
            ) : (
              <div className="gcp-card">
                {allDocuments.map((d, i) => {
                  const iconDef = DOC_ICONS[d.type] || { icon: "\u{1F4C4}", bg: "#f1f5f9" };
                  return (
                    <div key={i} className="gcp-doc-row">
                      <div className="gcp-doc-info">
                        <div className="gcp-doc-icon" style={{ background: iconDef.bg }}>{iconDef.icon}</div>
                        <div>
                          <div className="fw-semi fs-label" style={{ color: "var(--bg)" }}>{d.name}</div>
                          <div className="fs-tab c-text2">{d.projectName} &middot; {d.date}</div>
                        </div>
                      </div>
                      <div className="flex gap-sp3">
                        <span className={`gcp-badge ${DOC_STATUS_BADGE[d.status] || "gcp-badge-gray"}`}>{d.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ INVOICES ═══════════ */}
        {tab === "invoices" && (
          <div>
            <div className="gcp-section-title">Invoices</div>
            <div className="gcp-section-desc">Billing history across all your EBC projects.</div>

            {/* Invoice summary cards */}
            <div className="gcp-grid-3 mb-sp5">
              <div className="gcp-card text-center">
                <div className="gcp-stat-label">Total Billed</div>
                <div className="fw-bold fs-title" style={{ color: "var(--bg)" }}>
                  ${allInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </div>
              </div>
              <div className="gcp-card text-center">
                <div className="gcp-stat-label">Paid</div>
                <div className="fw-bold fs-title c-green">
                  ${allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </div>
              </div>
              <div className="gcp-card text-center">
                <div className="gcp-stat-label">Outstanding</div>
                <div className="fw-bold fs-title c-amber">
                  ${allInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0).toLocaleString()}
                </div>
              </div>
            </div>

            {allInvoices.length === 0 ? (
              <div className="gcp-card">
                <div className="p-sp5 c-text3 text-center">No invoices yet for your projects.</div>
              </div>
            ) : (
              <div className="gcp-card overflow-x-auto">
                <table className="gcp-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Project</th>
                      <th>Description</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices.map((inv, i) => (
                      <tr key={i}>
                        <td className="fw-semi" style={{ color: "var(--bg)" }}>{inv.number}</td>
                        <td>{inv.projectName}</td>
                        <td>{inv.desc}</td>
                        <td className="fw-semi text-right">${inv.amount.toLocaleString()}</td>
                        <td>
                          <span className={`gcp-badge ${inv.status === "paid" ? "gcp-badge-green" : inv.status === "overdue" ? "gcp-badge-red" : "gcp-badge-amber"}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ REQUEST MANPOWER ═══════════ */}
        {tab === "manpower" && (
          <div>
            <div className="gcp-section-title">Request Manpower</div>
            <div className="gcp-section-desc">Need additional team? Fill out the details and we will confirm availability.</div>
            <div className="gcp-card">
              <div className="gcp-grid mb-sp4">
                <div>
                  <label className="gcp-label">Project *</label>
                  <select className="gcp-input gcp-select" value={manpowerForm.project}
                    onChange={e => setManpowerForm(f => ({ ...f, project: e.target.value }))}>
                    <option value="">Select project...</option>
                    {gcProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="__new">New project (not listed)</option>
                  </select>
                </div>
                <div>
                  <label className="gcp-label">Trade Needed</label>
                  <select className="gcp-input gcp-select" value={manpowerForm.tradeNeeded}
                    onChange={e => setManpowerForm(f => ({ ...f, tradeNeeded: e.target.value }))}>
                    {TRADE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="gcp-grid mb-sp4">
                <div>
                  <label className="gcp-label">Number of Workers *</label>
                  <input className="gcp-input" type="number" min="1" placeholder="e.g. 4"
                    value={manpowerForm.teamSize}
                    onChange={e => setManpowerForm(f => ({ ...f, teamSize: e.target.value }))} />
                </div>
                <div className="gap-sp2 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <label className="gcp-label">Start Date</label>
                    <input className="gcp-input" type="date" value={manpowerForm.startDate}
                      onChange={e => setManpowerForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="gcp-label">End Date</label>
                    <input className="gcp-input" type="date" value={manpowerForm.endDate}
                      onChange={e => setManpowerForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="mb-sp4">
                <label className="gcp-label">Special Certifications Required</label>
                <div className="gcp-checkbox-group">
                  {CERT_OPTIONS.map(c => (
                    <span key={c} className={`gcp-chip ${manpowerForm.certs.includes(c) ? "selected" : ""}`}
                      onClick={() => toggleCert(c)}>{c}</span>
                  ))}
                </div>
              </div>

              <div className="mb-sp5">
                <label className="gcp-label">Additional Notes</label>
                <textarea className="gcp-input gcp-textarea"
                  placeholder="e.g. 6:30 AM start, after-hours work, specific site access requirements..."
                  value={manpowerForm.notes}
                  onChange={e => setManpowerForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="gcp-btn gcp-btn-primary" onClick={handleManpowerRequest}>Submit Manpower Request</button>
            </div>
          </div>
        )}

        {/* ═══════════ REQUEST BID ═══════════ */}
        {tab === "bid" && (
          <div>
            <div className="gcp-section-title">Request a Bid</div>
            <div className="gcp-section-desc">Send us your project details and we will have a proposal ready within 48 hours.</div>
            <div className="gcp-card">
              <div className="gcp-grid mb-sp4">
                <div>
                  <label className="gcp-label">Project Name *</label>
                  <input className="gcp-input" placeholder="e.g. Memorial Hermann 4th Floor"
                    value={bidForm.projectName}
                    onChange={e => setBidForm(f => ({ ...f, projectName: e.target.value }))} />
                </div>
                <div>
                  <label className="gcp-label">Project Address</label>
                  <input className="gcp-input" placeholder="Full address"
                    value={bidForm.address}
                    onChange={e => setBidForm(f => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <div className="mb-sp4">
                <label className="gcp-label">Scope of Work</label>
                <div className="gcp-checkbox-group">
                  {SCOPE_OPTIONS.map(s => (
                    <span key={s} className={`gcp-chip ${bidForm.scope.includes(s) ? "selected" : ""}`}
                      onClick={() => toggleScope(s)}>{s}</span>
                  ))}
                </div>
              </div>
              <div className="gcp-grid mb-sp4">
                <div>
                  <label className="gcp-label">Bid Due Date</label>
                  <input className="gcp-input" type="date" value={bidForm.timeline}
                    onChange={e => setBidForm(f => ({ ...f, timeline: e.target.value }))} />
                </div>
                <div>
                  <label className="gcp-label">Plans (PDF)</label>
                  <input className="gcp-input" type="file" accept=".pdf,.dwg,.zip"
                    onChange={e => setBidForm(f => ({ ...f, plans: e.target.files?.[0] || null }))} />
                </div>
              </div>
              <div className="mb-sp5">
                <label className="gcp-label">Notes / Special Requirements</label>
                <textarea className="gcp-input gcp-textarea" placeholder="Any additional details..."
                  value={bidForm.notes}
                  onChange={e => setBidForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="gcp-btn gcp-btn-primary" onClick={handleBidRequest}>Submit Bid Request</button>
            </div>
          </div>
        )}

        {/* ═══════════ CONTACT ═══════════ */}
        {tab === "contact" && (
          <div>
            <div className="gcp-section-title">Contact EBC</div>
            <div className="gcp-section-desc">Reach our team directly.</div>

            {/* EBC Team */}
            <div className="mb-sp6 gap-sp3 d-grid">
              {[
                { name: "Abner Aguilar", role: "Project Manager / Estimating", phone: "(346) 970-7093", email: "abner@ebconstructors.com", color: "#1a2e4a" },
                { name: "Emmanuel Aguilar", role: "Owner / Senior PM", phone: "(713) 820-6868", email: "emmanuel@ebconstructors.com", color: "var(--green)" },
                { name: "Isai Aguilar", role: "Project Manager", phone: "", email: "isai@ebconstructors.com", color: "var(--blue)" },
              ].map(person => (
                <div key={person.name} className="gcp-contact">
                  <div className="gcp-contact-avatar" style={{ background: person.color }}>
                    {person.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="gcp-contact-info">
                    <div className="gcp-contact-name">{person.name}</div>
                    <div className="gcp-contact-role">{person.role}</div>
                    <div className="gcp-contact-links">
                      {person.phone && <a className="gcp-contact-link" href={`tel:${person.phone.replace(/\D/g, "")}`}>{person.phone}</a>}
                      <a className="gcp-contact-link" href={`mailto:${person.email}`}>{person.email}</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Your Contacts at Company */}
            {gcContacts.length > 0 && (
              <>
                <div className="gcp-section-title fs-secondary">Your Team at {loginCompany}</div>
                <div className="gcp-section-desc">Contacts we have on file for your company.</div>
                <div className="gap-sp3 d-grid">
                  {gcContacts.map(c => (
                    <div key={c.id} className="gcp-contact">
                      <div className="gcp-contact-avatar" style={{ background: c.color || "#64748b" }}>
                        {c.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="gcp-contact-info">
                        <div className="gcp-contact-name">{c.name}</div>
                        <div className="gcp-contact-role">{c.role || "Contact"}</div>
                        <div className="gcp-contact-links">
                          {c.phone && <a className="gcp-contact-link" href={`tel:${c.phone.replace(/\D/g, "")}`}>{c.phone}</a>}
                          {c.email && <a className="gcp-contact-link" href={`mailto:${c.email}`}>{c.email}</a>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Office Info */}
            <div className="gcp-card mt-sp6">
              <div className="fs-secondary fw-bold mb-sp2" style={{ color: "var(--bg)" }}>Eagles Brothers Constructors</div>
              <div className="mb-sp1 fs-label c-text3">Drywall, Metal Framing & Interior Finishing Subcontractor</div>
              <div className="fs-label c-text3">{COMPANY_DEFAULTS.address}</div>
              <div className="fs-label mt-sp1 c-text3">
                <a href={`tel:${COMPANY_DEFAULTS.phone.replace(/\D/g, "")}`} className="c-blue" style={{ textDecoration: "none" }}>{COMPANY_DEFAULTS.phone}</a>
                {" \u00B7 "}
                <a href={`mailto:${COMPANY_DEFAULTS.email}`} className="c-blue" style={{ textDecoration: "none" }}>{COMPANY_DEFAULTS.email}</a>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="fs-tab c-text2 text-center" style={{ padding: "var(--space-10) 0 var(--space-5)" }}>
          Eagles Brothers Constructors &middot; Houston, TX &middot; Quality. Dependability.
        </div>
      </div>
    </div>
  );
}
