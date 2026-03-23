import { useState, useMemo } from "react";
import {
  Building2, CalendarDays, CheckCircle2, ChevronRight, Clock, FileText,
  HardHat, Image, Lock, LogOut, MessageSquare, Star, TrendingUp, XCircle,
  AlertCircle, CircleDot, ClipboardList, Layers, Phone, Mail,
} from "lucide-react";
import { initProjects, initChangeOrders, initRfis, initSubmittals, MS } from "../data/constants";
import { useSyncedState } from "../hooks/useSyncedState";

// ═══════════════════════════════════════════════════════════════
//  Customer Portal — External-facing portal for GCs/Customers
//  Access via: yoursite.com/#/customer-portal
//  EBC brand: dark navy, amber accents, white eagle
//  Read-only except for crew performance feedback
// ═══════════════════════════════════════════════════════════════

// ── Demo access codes → project IDs ──────────────────────────
const ACCESS_CODES = {
  "BRUNELLO-26":   4,
  "SPROUTS-26":    12,
  "ESCAPOLOGY-26": 17,
  "GUADALUPE-26":  11,
  "BAYTOWN-26":    5,
  "WOODSIDE-26":   1,
  "CBANDI-26":     2,
  "DEMO":          4,
};

// ── Milestone helpers ─────────────────────────────────────────
function getMilestoneIndex(project) {
  const p = project.progress || 0;
  if (p >= 95) return 7;
  if (p >= 75) return 5;
  if (p >= 50) return 4;
  if (p >= 25) return 3;
  if (p >= 10) return 2;
  if (p >= 5)  return 1;
  return 0;
}

// ── Status helpers ────────────────────────────────────────────
const STATUS_LABELS = {
  "in-progress": "In Progress",
  "on-hold":     "On Hold",
  "completed":   "Completed",
  "pending":     "Pending",
};

function fmt$(n) {
  if (n === null || n === undefined) return "—";
  return "$" + Math.abs(n).toLocaleString() + (n < 0 ? " (credit)" : "");
}

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

// ── Inline styles ─────────────────────────────────────────────
const CP = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .cp { min-height:100vh; background:#0d1b2a; color:#e2eaf4; font-family:'Inter',system-ui,sans-serif; }

  /* ── Header ── */
  .cp-header { background:#0a1520; border-bottom:1px solid #1e3550; padding:0 28px; display:flex; align-items:center; justify-content:space-between; height:60px; position:sticky; top:0; z-index:50; box-shadow:0 1px 8px rgba(0,0,0,0.35); }
  .cp-logo { display:flex; align-items:center; gap:12px; }
  .cp-logo-mark { width:36px; height:36px; background:linear-gradient(135deg,#1a3a5c,#0e2035); border:1.5px solid #2a5580; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .cp-logo-text { font-size:15px; font-weight:800; color:#e2eaf4; letter-spacing:0.2px; }
  .cp-logo-sub { font-size:11px; color:#5580a0; font-weight:500; }
  .cp-header-right { display:flex; align-items:center; gap:12px; }
  .cp-project-pill { background:#1a3a5c; border:1px solid #2a5580; border-radius:20px; padding:4px 14px; font-size:12px; font-weight:600; color:#7ab8e8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }
  .cp-logout-btn { background:transparent; border:1px solid #1e3550; border-radius:8px; color:#5580a0; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:all 0.15s; }
  .cp-logout-btn:hover { border-color:#d97706; color:#d97706; }

  /* ── Body ── */
  .cp-body { max-width:920px; margin:0 auto; padding:24px 20px 80px; }

  /* ── Tabs ── */
  .cp-tabs { display:flex; gap:2px; margin-bottom:24px; background:#0a1520; border-radius:12px; padding:4px; border:1px solid #1e3550; overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .cp-tab { padding:9px 16px; border:none; background:none; color:#5580a0; font-size:13px; font-weight:600; cursor:pointer; border-radius:9px; transition:all 0.15s; font-family:inherit; white-space:nowrap; display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .cp-tab:hover { color:#e2eaf4; background:#132030; }
  .cp-tab.active { color:#0d1b2a; background:#d97706; box-shadow:0 1px 6px rgba(217,119,6,0.35); }
  .cp-tab.active svg { color:#0d1b2a; }

  /* ── Cards ── */
  .cp-card { background:#0f1f30; border:1px solid #1e3550; border-radius:14px; padding:22px; margin-bottom:16px; }
  .cp-card-title { font-size:16px; font-weight:700; color:#e2eaf4; margin-bottom:4px; display:flex; align-items:center; gap:8px; }
  .cp-card-sub { font-size:12px; color:#5580a0; margin-bottom:16px; }

  /* ── Section label ── */
  .cp-label { font-size:11px; color:#5580a0; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
  .cp-value { font-size:14px; font-weight:600; color:#c8daf0; }

  /* ── Grid ── */
  .cp-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .cp-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
  .cp-stat-block { background:#0a1520; border:1px solid #1a3248; border-radius:10px; padding:14px 16px; }

  /* ── Progress ── */
  .cp-progress-wrap { margin:14px 0 4px; }
  .cp-progress-label { display:flex; justify-content:space-between; margin-bottom:6px; }
  .cp-progress-bar { height:8px; background:#1a3248; border-radius:8px; overflow:hidden; }
  .cp-progress-fill { height:100%; border-radius:8px; background:linear-gradient(90deg,#d97706,#f59e0b); transition:width 0.5s ease; }

  /* ── Phase tracker (read-only) ── */
  .cp-phases { display:flex; gap:0; margin:4px 0; }
  .cp-phase { flex:1; text-align:center; padding:8px 4px 10px; position:relative; }
  .cp-phase:not(:last-child)::after { content:''; position:absolute; right:0; top:50%; transform:translateY(-50%); width:1px; height:60%; background:#1e3550; }
  .cp-phase-dot { width:20px; height:20px; border-radius:50%; margin:0 auto 5px; display:flex; align-items:center; justify-content:center; }
  .cp-phase-dot.done { background:#059669; }
  .cp-phase-dot.current { background:#d97706; box-shadow:0 0 8px rgba(217,119,6,0.5); }
  .cp-phase-dot.upcoming { background:#1a3248; border:1.5px solid #2a5580; }
  .cp-phase-name { font-size:9px; font-weight:600; color:#5580a0; text-transform:uppercase; letter-spacing:0.3px; }
  .cp-phase-name.done { color:#059669; }
  .cp-phase-name.current { color:#d97706; }

  /* ── Badges ── */
  .cp-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .cp-badge-green { background:rgba(5,150,105,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.2); }
  .cp-badge-amber { background:rgba(217,119,6,0.15); color:#d97706; border:1px solid rgba(217,119,6,0.2); }
  .cp-badge-blue { background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.2); }
  .cp-badge-red { background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.2); }
  .cp-badge-gray { background:rgba(100,116,139,0.12); color:#94a3b8; border:1px solid rgba(100,116,139,0.2); }
  .cp-badge-purple { background:rgba(139,92,246,0.12); color:#a78bfa; border:1px solid rgba(139,92,246,0.2); }

  /* ── Table ── */
  .cp-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .cp-table { width:100%; border-collapse:collapse; min-width:500px; }
  .cp-table th { text-align:left; font-size:11px; font-weight:700; color:#5580a0; text-transform:uppercase; letter-spacing:0.5px; padding:10px 12px; border-bottom:1px solid #1e3550; }
  .cp-table td { padding:12px; border-bottom:1px solid #131f2e; font-size:13px; color:#a8c0d8; vertical-align:top; }
  .cp-table tr:last-child td { border-bottom:none; }
  .cp-table tr:hover td { background:rgba(255,255,255,0.02); }
  .cp-table-empty { text-align:center; padding:40px 12px; color:#3a5470; font-size:13px; }

  /* ── Performance / feedback ── */
  .cp-stars { display:flex; gap:4px; margin-bottom:12px; }
  .cp-star { cursor:pointer; transition:transform 0.1s; }
  .cp-star:hover { transform:scale(1.15); }
  .cp-textarea { width:100%; min-height:90px; background:#0a1520; border:1px solid #1e3550; border-radius:9px; color:#e2eaf4; font-size:14px; font-family:inherit; padding:12px; resize:vertical; box-sizing:border-box; transition:border 0.15s; }
  .cp-textarea:focus { outline:none; border-color:#d97706; box-shadow:0 0 0 3px rgba(217,119,6,0.12); }
  .cp-textarea::placeholder { color:#3a5470; }
  .cp-input { width:100%; background:#0a1520; border:1px solid #1e3550; border-radius:9px; color:#e2eaf4; font-size:14px; font-family:inherit; padding:10px 14px; box-sizing:border-box; transition:border 0.15s; }
  .cp-input:focus { outline:none; border-color:#d97706; box-shadow:0 0 0 3px rgba(217,119,6,0.12); }
  .cp-input::placeholder { color:#3a5470; }
  .cp-form-label { display:block; font-size:12px; font-weight:600; color:#5580a0; text-transform:uppercase; letter-spacing:0.4px; margin-bottom:6px; }

  /* ── Buttons ── */
  .cp-btn-primary { background:#d97706; color:#0d1b2a; border:none; border-radius:9px; padding:11px 24px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px; }
  .cp-btn-primary:hover { background:#f59e0b; transform:translateY(-1px); box-shadow:0 4px 14px rgba(217,119,6,0.3); }
  .cp-btn-primary:disabled { opacity:0.45; cursor:not-allowed; transform:none; }
  .cp-btn-ghost { background:transparent; color:#5580a0; border:1px solid #1e3550; border-radius:9px; padding:10px 20px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; }
  .cp-btn-ghost:hover { border-color:#d97706; color:#d97706; }

  /* ── Feedback card ── */
  .cp-feedback-item { background:#0a1520; border:1px solid #1a3248; border-radius:10px; padding:14px 16px; margin-bottom:10px; }
  .cp-feedback-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  .cp-feedback-name { font-size:13px; font-weight:700; color:#c8daf0; }
  .cp-feedback-date { font-size:11px; color:#3a5470; }
  .cp-feedback-text { font-size:13px; color:#8ab0cc; line-height:1.5; }
  .cp-feedback-stars { display:flex; gap:3px; margin-bottom:6px; }

  /* ── Photo gallery ── */
  .cp-photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .cp-photo-placeholder { background:#0a1520; border:1px dashed #1e3550; border-radius:10px; aspect-ratio:4/3; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#2a5580; }
  .cp-photo-placeholder span { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }

  /* ── Alert banner ── */
  .cp-alert { background:rgba(217,119,6,0.1); border:1px solid rgba(217,119,6,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; display:flex; align-items:flex-start; gap:12px; }
  .cp-alert-text { font-size:13px; color:#d97706; font-weight:500; line-height:1.5; }

  /* ── Success banner ── */
  .cp-success { background:rgba(5,150,105,0.1); border:1px solid rgba(16,185,129,0.2); border-radius:10px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; gap:10px; color:#10b981; font-size:14px; font-weight:600; }

  /* ── Login ── */
  .cp-login-wrap { display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; background:#0d1b2a; }
  .cp-login-card { width:100%; max-width:400px; background:#0f1f30; border:1px solid #1e3550; border-radius:18px; padding:36px 32px; }
  .cp-login-eagle { width:60px; height:60px; background:linear-gradient(135deg,#1a3a5c,#0e2035); border:1.5px solid #2a5580; border-radius:16px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
  .cp-login-title { font-size:22px; font-weight:800; color:#e2eaf4; text-align:center; margin-bottom:6px; }
  .cp-login-sub { font-size:13px; color:#5580a0; text-align:center; margin-bottom:28px; line-height:1.5; }
  .cp-login-error { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; font-size:13px; color:#f87171; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .cp-login-footer { text-align:center; margin-top:20px; font-size:11px; color:#2a5580; line-height:1.6; }

  /* ── Divider ── */
  .cp-divider { height:1px; background:#131f2e; margin:16px 0; }

  /* ── Scope pills ── */
  .cp-scope-pills { display:flex; flex-wrap:wrap; gap:6px; }
  .cp-scope-pill { background:#1a3248; border:1px solid #2a5580; border-radius:20px; padding:4px 12px; font-size:11px; font-weight:600; color:#7ab8e8; }

  /* ── Responsive ── */
  @media(max-width:768px) {
    .cp-header { padding:0 14px; }
    .cp-body { padding:16px 14px 80px; }
    .cp-grid-2, .cp-grid-3 { grid-template-columns:1fr; }
    .cp-photo-grid { grid-template-columns:repeat(2,1fr); }
    .cp-phases { flex-wrap:nowrap; overflow-x:auto; }
    .cp-project-pill { max-width:130px; }
    .cp-tab { font-size:12px; padding:8px 12px; }
  }
  @media(max-width:480px) {
    .cp-logo-sub { display:none; }
    .cp-login-card { padding:28px 20px; }
    .cp-photo-grid { grid-template-columns:1fr 1fr; }
    .cp-header-right { gap:6px; }
    .cp-project-pill { display:none; }
  }
`;

// ── Badge helpers ─────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    approved: "cp-badge-green",
    closed:   "cp-badge-gray",
    open:     "cp-badge-blue",
    submitted:"cp-badge-amber",
    pending:  "cp-badge-amber",
    current:  "cp-badge-green",
    rejected: "cp-badge-red",
    "in-progress":"cp-badge-blue",
    "on-hold":"cp-badge-amber",
    completed:"cp-badge-green",
  };
  return map[status] || "cp-badge-gray";
}

function StatusBadge({ status, label }) {
  const cls = statusBadge(status);
  return <span className={`cp-badge ${cls}`}>{label || status}</span>;
}

// ── Read-only phase tracker ───────────────────────────────────
function ReadOnlyPhaseTracker({ project }) {
  const phases = project.phases || [];
  if (phases.length === 0) {
    // Build from MS milestones using progress
    const msIdx = getMilestoneIndex(project);
    return (
      <div className="cp-phases">
        {MS.map((name, i) => {
          const done = i < msIdx;
          const current = i === msIdx;
          return (
            <div key={name} className="cp-phase">
              <div className={`cp-phase-dot ${done ? "done" : current ? "current" : "upcoming"}`}>
                {done && <CheckCircle2 size={10} color="#fff" />}
                {current && <CircleDot size={10} color="#0d1b2a" />}
              </div>
              <div className={`cp-phase-name ${done ? "done" : current ? "current" : ""}`}>{name}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="cp-phases" style={{ overflowX: "auto" }}>
      {phases.map((ph) => {
        const done = ph.status === "completed";
        const current = ph.status === "in progress";
        return (
          <div key={ph.key} className="cp-phase">
            <div className={`cp-phase-dot ${done ? "done" : current ? "current" : "upcoming"}`}>
              {done && <CheckCircle2 size={10} color="#fff" />}
              {current && <CircleDot size={10} color="#0d1b2a" />}
            </div>
            <div className={`cp-phase-name ${done ? "done" : current ? "current" : ""}`}>{ph.name}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Star rating widget ────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="cp-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className="cp-star"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            size={26}
            fill={(hover || value) >= n ? "#d97706" : "none"}
            color={(hover || value) >= n ? "#d97706" : "#2a5580"}
            strokeWidth={1.5}
          />
        </span>
      ))}
    </div>
  );
}

// ── EBC Eagle SVG (minimal) ───────────────────────────────────
function EagleMark({ size = 22 }) {
  return (
    <HardHat size={size} color="#d97706" strokeWidth={1.8} />
  );
}

// ═══════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════
export default function CustomerPortal() {
  const [accessCode, setAccessCode]   = useState("");
  const [projectId, setProjectId]     = useState(null);
  const [loginError, setLoginError]   = useState("");
  const [tab, setTab]                 = useState("overview");

  // Feedback state (persisted to localStorage)
  const [allFeedback, setAllFeedback] = useSyncedState("ebc_customerFeedback", []);

  // Feedback form state
  const [fbRating,  setFbRating]   = useState(0);
  const [fbComment, setFbComment]  = useState("");
  const [fbName,    setFbName]     = useState("");
  const [fbSuccess, setFbSuccess]  = useState(false);

  // ── Derived data ──
  const project = useMemo(() => {
    if (!projectId) return null;
    return (initProjects || []).find(p => String(p.id) === String(projectId)) || null;
  }, [projectId]);

  const changeOrders = useMemo(() => {
    if (!projectId) return [];
    return (initChangeOrders || []).filter(co => String(co.projectId) === String(projectId));
  }, [projectId]);

  const rfis = useMemo(() => {
    if (!projectId) return [];
    return (initRfis || []).filter(r => String(r.projectId) === String(projectId));
  }, [projectId]);

  const submittals = useMemo(() => {
    if (!projectId) return [];
    return (initSubmittals || []).filter(s => String(s.projectId) === String(projectId));
  }, [projectId]);

  const projectFeedback = useMemo(() => {
    if (!projectId) return [];
    return (allFeedback || []).filter(f => String(f.projectId) === String(projectId));
  }, [allFeedback, projectId]);

  // ── Login handler ──
  const handleLogin = () => {
    const code = accessCode.trim().toUpperCase();
    if (!code) { setLoginError("Please enter your access code."); return; }
    const pid = ACCESS_CODES[code];
    if (!pid) { setLoginError("Invalid access code. Please contact your EBC project manager."); return; }
    setProjectId(pid);
    setLoginError("");
  };

  // ── Submit feedback ──
  const handleSubmitFeedback = () => {
    if (!fbRating || !fbComment.trim()) return;
    const entry = {
      id: Date.now(),
      projectId,
      rating: fbRating,
      comment: fbComment.trim(),
      submittedBy: fbName.trim() || "Anonymous",
      date: new Date().toISOString().slice(0, 10),
    };
    setAllFeedback(prev => [...(prev || []), entry]);
    setFbRating(0);
    setFbComment("");
    setFbName("");
    setFbSuccess(true);
    setTimeout(() => setFbSuccess(false), 4000);
  };

  // ── Login screen ──
  if (!projectId || !project) {
    return (
      <div className="cp">
        <style>{CP}</style>
        <div className="cp-login-wrap">
          <div className="cp-login-card">
            <div className="cp-login-eagle">
              <EagleMark size={28} />
            </div>
            <div className="cp-login-title">Customer Portal</div>
            <div className="cp-login-sub">
              Eagles Brothers Constructors<br />
              Enter your project access code to view your build status.
            </div>

            {loginError && (
              <div className="cp-login-error">
                <XCircle size={16} />
                {loginError}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label className="cp-form-label">Project Access Code</label>
              <input
                className="cp-input"
                type="text"
                placeholder="e.g. BRUNELLO-26"
                value={accessCode}
                onChange={e => { setAccessCode(e.target.value); setLoginError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                autoComplete="off"
                spellCheck={false}
                style={{ letterSpacing: "0.05em", textTransform: "uppercase" }}
              />
            </div>

            <button className="cp-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleLogin}>
              <Lock size={15} />
              Access My Project
            </button>

            <div className="cp-login-footer">
              Don't have an access code?<br />
              Contact your EBC Project Manager or call<br />
              <strong style={{ color: "#5580a0" }}>(281) 762-9999</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Tabs config ──
  const TABS = [
    { key: "overview",     label: "Overview",       icon: <Building2 size={14} /> },
    { key: "changeorders", label: "Change Orders",  icon: <FileText size={14} /> },
    { key: "rfis",         label: "RFIs",           icon: <ClipboardList size={14} /> },
    { key: "submittals",   label: "Submittals",     icon: <Layers size={14} /> },
    { key: "performance",  label: "Performance",    icon: <Star size={14} /> },
    { key: "photos",       label: "Photos",         icon: <Image size={14} /> },
  ];

  const progress = project.progress || 0;
  const msIdx    = getMilestoneIndex(project);
  const currentMS = MS[msIdx] || "Award";
  const nextMS    = MS[msIdx + 1] || "Closeout";

  return (
    <div className="cp">
      <style>{CP}</style>

      {/* ── Header ── */}
      <div className="cp-header">
        <div className="cp-logo">
          <div className="cp-logo-mark">
            <EagleMark size={20} />
          </div>
          <div>
            <div className="cp-logo-text">Eagles Brothers Constructors</div>
            <div className="cp-logo-sub">Customer Project Portal</div>
          </div>
        </div>
        <div className="cp-header-right">
          <div className="cp-project-pill">{project.name}</div>
          <button className="cp-logout-btn" onClick={() => { setProjectId(null); setAccessCode(""); setTab("overview"); }}>
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="cp-body">

        {/* ── Tabs ── */}
        <div className="cp-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`cp-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ══════════ OVERVIEW ══════════ */}
        {tab === "overview" && (
          <>
            {/* Project header card */}
            <div className="cp-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <div className="cp-card-title">
                    <Building2 size={18} color="#d97706" />
                    {project.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#5580a0", marginTop: 3 }}>{project.address}</div>
                </div>
                <StatusBadge status={project.status} label={STATUS_LABELS[project.status] || project.status} />
              </div>

              {/* Key stats */}
              <div className="cp-grid-3">
                <div className="cp-stat-block">
                  <div className="cp-label">Phase</div>
                  <div className="cp-value">{project.phase || "Commercial"}</div>
                </div>
                <div className="cp-stat-block">
                  <div className="cp-label">Current Stage</div>
                  <div className="cp-value" style={{ color: "#d97706" }}>{currentMS}</div>
                </div>
                <div className="cp-stat-block">
                  <div className="cp-label">Next Milestone</div>
                  <div className="cp-value">{nextMS}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="cp-progress-wrap">
                <div className="cp-progress-label">
                  <span style={{ fontSize: 12, color: "#5580a0", fontWeight: 600 }}>Overall Progress</span>
                  <span style={{ fontSize: 13, color: "#d97706", fontWeight: 700 }}>{progress}%</span>
                </div>
                <div className="cp-progress-bar">
                  <div className="cp-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* Key dates */}
            <div className="cp-card">
              <div className="cp-card-title"><CalendarDays size={16} color="#d97706" />Key Dates</div>
              <div className="cp-grid-2" style={{ marginTop: 4 }}>
                <div className="cp-stat-block">
                  <div className="cp-label">Start Date</div>
                  <div className="cp-value">{fmtDate(project.start)}</div>
                </div>
                <div className="cp-stat-block">
                  <div className="cp-label">Completion Date</div>
                  <div className="cp-value">{fmtDate(project.end)}</div>
                </div>
              </div>
            </div>

            {/* Phase tracker */}
            <div className="cp-card">
              <div className="cp-card-title"><TrendingUp size={16} color="#d97706" />Phase Tracker</div>
              <div className="cp-card-sub">Construction phases — updated by your EBC project manager</div>
              <ReadOnlyPhaseTracker project={project} />
            </div>

            {/* Scope */}
            {project.scope && project.scope.length > 0 && (
              <div className="cp-card">
                <div className="cp-card-title"><HardHat size={16} color="#d97706" />Scope of Work</div>
                <div className="cp-scope-pills" style={{ marginTop: 8 }}>
                  {project.scope.map(s => (
                    <span key={s} className="cp-scope-pill">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* EBC contact */}
            <div className="cp-card">
              <div className="cp-card-title"><Phone size={16} color="#d97706" />Your EBC Contact</div>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#1a3a5c,#0e2035)", border: "1.5px solid #2a5580", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <HardHat size={20} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#c8daf0" }}>{project.pm || "Abner Aguilar"}</div>
                  <div style={{ fontSize: 12, color: "#5580a0" }}>Project Manager · Eagles Brothers Constructors</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                    <a href="tel:+12817629999" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#d97706", textDecoration: "none", fontWeight: 600 }}>
                      <Phone size={11} /> (281) 762-9999
                    </a>
                    <a href="mailto:info@eaglesbrothers.com" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#d97706", textDecoration: "none", fontWeight: 600 }}>
                      <Mail size={11} /> Email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════ CHANGE ORDERS ══════════ */}
        {tab === "changeorders" && (
          <div className="cp-card">
            <div className="cp-card-title"><FileText size={16} color="#d97706" />Change Order Log</div>
            <div className="cp-card-sub">All change orders for your project — pending approval through EBC</div>
            <div className="cp-table-wrap">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {changeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="cp-table-empty">
                        <FileText size={28} color="#1e3550" style={{ marginBottom: 8 }} />
                        <div>No change orders on record for this project.</div>
                      </td>
                    </tr>
                  ) : (
                    changeOrders.map(co => (
                      <tr key={co.id}>
                        <td style={{ fontWeight: 700, color: "#c8daf0", whiteSpace: "nowrap" }}>{co.number}</td>
                        <td style={{ maxWidth: 280 }}>{co.desc}</td>
                        <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: co.amount < 0 ? "#10b981" : "#e2eaf4" }}>{fmt$(co.amount)}</td>
                        <td><StatusBadge status={co.status} /></td>
                        <td style={{ whiteSpace: "nowrap", color: "#5580a0" }}>{fmtDate(co.submitted)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {changeOrders.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #131f2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#5580a0" }}>Total Change Orders: {changeOrders.length}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>
                  Net: {fmt$(changeOrders.reduce((sum, co) => sum + (co.amount || 0), 0))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ══════════ RFIs ══════════ */}
        {tab === "rfis" && (
          <div className="cp-card">
            <div className="cp-card-title"><ClipboardList size={16} color="#d97706" />RFI Log</div>
            <div className="cp-card-sub">Requests for information submitted during construction</div>
            <div className="cp-table-wrap">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {rfis.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="cp-table-empty">
                        <ClipboardList size={28} color="#1e3550" style={{ marginBottom: 8 }} />
                        <div>No RFIs on record for this project.</div>
                      </td>
                    </tr>
                  ) : (
                    rfis.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: "#c8daf0", whiteSpace: "nowrap" }}>{r.number}</td>
                        <td style={{ maxWidth: 280 }}>{r.subject}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ whiteSpace: "nowrap", color: "#5580a0" }}>{fmtDate(r.submitted)}</td>
                        <td style={{ color: "#5580a0" }}>{r.assigned || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════ SUBMITTALS ══════════ */}
        {tab === "submittals" && (
          <div className="cp-card">
            <div className="cp-card-title"><Layers size={16} color="#d97706" />Submittal Log</div>
            <div className="cp-card-sub">Material and shop drawing submittals for your project</div>
            <div className="cp-table-wrap">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {submittals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="cp-table-empty">
                        <Layers size={28} color="#1e3550" style={{ marginBottom: 8 }} />
                        <div>No submittals on record for this project.</div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "#2a5580" }}>Submittals will appear here once processed by your EBC PM.</div>
                      </td>
                    </tr>
                  ) : (
                    submittals.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700, color: "#c8daf0", whiteSpace: "nowrap" }}>{s.number}</td>
                        <td style={{ maxWidth: 300 }}>{s.description || s.desc || s.name}</td>
                        <td><StatusBadge status={s.status} /></td>
                        <td style={{ whiteSpace: "nowrap", color: "#5580a0" }}>{fmtDate(s.submitted || s.date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════ PERFORMANCE ══════════ */}
        {tab === "performance" && (
          <>
            {/* Submit form */}
            <div className="cp-card">
              <div className="cp-card-title"><Star size={16} color="#d97706" />Crew Performance Feedback</div>
              <div className="cp-card-sub">Share your experience with the EBC crew on site. All feedback is reviewed by management.</div>

              {fbSuccess && (
                <div className="cp-success">
                  <CheckCircle2 size={18} />
                  Thank you! Your feedback has been submitted.
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <div className="cp-form-label">Overall Rating</div>
                <StarRating value={fbRating} onChange={setFbRating} />
                {fbRating > 0 && (
                  <div style={{ fontSize: 12, color: "#d97706", marginTop: 4 }}>
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][fbRating]}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="cp-form-label">Your Name (optional)</label>
                <input
                  className="cp-input"
                  type="text"
                  placeholder="First name or initials"
                  value={fbName}
                  onChange={e => setFbName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="cp-form-label">Comments</label>
                <textarea
                  className="cp-textarea"
                  placeholder="How was the crew's professionalism, cleanliness, communication, and quality of work?"
                  value={fbComment}
                  onChange={e => setFbComment(e.target.value)}
                />
              </div>

              <button
                className="cp-btn-primary"
                onClick={handleSubmitFeedback}
                disabled={!fbRating || !fbComment.trim()}
              >
                <MessageSquare size={15} />
                Submit Feedback
              </button>
            </div>

            {/* Previous feedback */}
            {projectFeedback.length > 0 && (
              <div className="cp-card">
                <div className="cp-card-title"><MessageSquare size={16} color="#d97706" />Previous Feedback</div>
                <div className="cp-card-sub">Feedback submitted for this project</div>
                {projectFeedback.slice().reverse().map(f => (
                  <div key={f.id} className="cp-feedback-item">
                    <div className="cp-feedback-header">
                      <span className="cp-feedback-name">{f.submittedBy}</span>
                      <span className="cp-feedback-date">{fmtDate(f.date)}</span>
                    </div>
                    <div className="cp-feedback-stars">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={14} fill={f.rating >= n ? "#d97706" : "none"} color={f.rating >= n ? "#d97706" : "#2a5580"} strokeWidth={1.5} />
                      ))}
                      <span style={{ fontSize: 11, color: "#5580a0", marginLeft: 6, alignSelf: "center" }}>
                        {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][f.rating]}
                      </span>
                    </div>
                    <div className="cp-feedback-text">{f.comment}</div>
                  </div>
                ))}
              </div>
            )}

            {projectFeedback.length === 0 && !fbSuccess && (
              <div className="cp-card" style={{ textAlign: "center", padding: "32px 20px" }}>
                <Star size={32} color="#1e3550" style={{ marginBottom: 12 }} />
                <div style={{ color: "#3a5470", fontSize: 13 }}>No feedback submitted yet for this project.</div>
                <div style={{ color: "#2a5580", fontSize: 12, marginTop: 6 }}>Be the first to rate the crew above.</div>
              </div>
            )}
          </>
        )}

        {/* ══════════ PHOTOS ══════════ */}
        {tab === "photos" && (
          <div className="cp-card">
            <div className="cp-card-title"><Image size={16} color="#d97706" />Daily Report Photos</div>
            <div className="cp-card-sub">Progress photos from the field — updated daily by your foreman</div>

            <div className="cp-alert" style={{ marginBottom: 20 }}>
              <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <div className="cp-alert-text">
                <strong>Coming Soon</strong> — Daily report photos will be available here once EBC activates photo uploads for your project. Contact your PM to enable this feature.
              </div>
            </div>

            <div className="cp-photo-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="cp-photo-placeholder">
                  <Image size={28} color="#1e3550" />
                  <span>Photo Pending</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #131f2e" }}>
              <div className="cp-label" style={{ marginBottom: 8 }}>Request Photo Updates</div>
              <p style={{ fontSize: 13, color: "#5580a0", margin: "0 0 12px", lineHeight: 1.6 }}>
                To receive daily progress photos directly to your email, contact your EBC project manager.
              </p>
              <a
                href="mailto:info@eaglesbrothers.com?subject=Photo Updates Request"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#d97706", textDecoration: "none", fontWeight: 600 }}
              >
                <Mail size={14} />
                Request Photo Access
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
