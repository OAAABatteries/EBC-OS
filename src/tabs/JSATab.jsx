import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { T } from "../data/translations";
import {
  PPE_ITEMS, RISK_LIKELIHOOD, RISK_SEVERITY, riskColor,
  HAZARD_CATEGORIES, CONTROL_HIERARCHY, PERMIT_TYPES,
  HAZARD_LIBRARY, TRADE_LABELS, JSA_TEMPLATES, WEATHER_HAZARD_MAP,
} from "../data/jsaConstants";
import { generateJsaPdf } from "../utils/jsaPdf";

// ═══════════════════════════════════════════════════════════════
//  Signature Pad Component — Touch-to-Sign canvas
// ═══════════════════════════════════════════════════════════════
function SignaturePad({ signatureData, onSave, onClear, label }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Set canvas internal resolution to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.strokeStyle = "#d4dae6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = (e) => {
    if (e) e.preventDefault();
    setDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    if (onClear) onClear();
  };

  const handleSave = () => {
    if (!hasStrokes) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    if (onSave) onSave(dataUrl);
  };

  if (signatureData) {
    return (
      <div className="flex-col gap-sp1">
        <div className="fw-semi fs-tab c-text3">{label}</div>
        <img src={signatureData} alt="Signature" className="rounded-control p-sp1 w-full" style={{ maxWidth: 280, height: 60, objectFit: "contain",
          background: "var(--bg)", border: "1px solid var(--border)" }} />
        <button className="cal-nav-btn fs-xs" style={{ padding: "var(--space-1) var(--space-2)", alignSelf: "flex-start" }}
          onClick={handleClear}>Re-sign</button>
      </div>
    );
  }

  return (
    <div className="flex-col gap-sp1">
      <div className="fw-semi fs-tab c-text3">{label || "Sign here"}</div>
      <canvas
        ref={canvasRef}
        className="rounded-control w-full" style={{ maxWidth: 280, height: 70,
          background: "var(--bg)", border: "1px solid var(--border)",
          cursor: "crosshair", touchAction: "none" }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
      <div className="gap-sp2" style={{ display: "flex" }}>
        <button className="cal-nav-btn fs-xs" style={{ padding: "var(--space-1) var(--space-2)" }}
          onClick={handleClear}>Clear</button>
        <button className="btn btn-primary btn-sm" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-3)", opacity: hasStrokes ? 1 : 0.4 }}
          onClick={handleSave} disabled={!hasStrokes}>Save Signature</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  JSA Module — Job Safety Analysis
//  Better than Procore: structured workflow, hazard library,
//  risk matrix, bilingual, team sign-on, weather-aware
// ═══════════════════════════════════════════════════════════════

const SUB_TABS = [
  { key: "list", label: "Active JSAs", labelEs: "JSAs Activos" },
  { key: "create", label: "+ New JSA", labelEs: "+ Nuevo JSA" },
  { key: "library", label: "Hazard Library", labelEs: "Biblioteca de Peligros" },
  { key: "templates", label: "Templates", labelEs: "Plantillas" },
];

export function JSATab({ app }) {
  const {
    jsas, setJsas, projects, employees, certifications,
    weatherAlerts, show,
  } = app;
  const [lang] = useState(() => localStorage.getItem("ebc_lang") || "en");
  const t = (key) => (lang === "es" && T[key]?.es ? T[key].es : key);

  const [subTab, setSubTab] = useState("list");
  const [activeJsa, setActiveJsa] = useState(null);
  const [tradeFilter, setTradeFilter] = useState("all");
  const [libTrade, setLibTrade] = useState("framing");

  // Create form state (hoisted to top level to avoid hooks-in-callbacks)
  // Auto-populate supervisor with logged-in user's name (foremen fill these out)
  const autoSupervisor = app.auth?.name || "";
  const [form, setForm] = useState({
    projectId: "", trades: ["framing"], templateId: "", title: "",
    location: "", supervisor: autoSupervisor, competentPerson: autoSupervisor, gc: "",
    date: new Date().toISOString().slice(0, 10),
    shift: "day", weather: "clear", indoorOutdoor: "outdoor",
    steps: [], ppe: [], permits: [],
    teamMembers: [],
  });
  const updForm = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [gcTemplate, setGcTemplate] = useState(null); // detected GC JSA template

  // ── GC auto-detect: when project changes, find GC template ──
  const handleProjectSelect = useCallback((projectId) => {
    setForm(f => ({ ...f, projectId }));
    setGcTemplate(null);
    if (!projectId) return;
    const proj = (projects || []).find(p => String(p.id) === String(projectId));
    if (!proj?.gc) return;
    // Auto-fill GC name
    setForm(f => ({ ...f, gc: proj.gc }));
    // Find contact from this GC company with a template
    const contacts = app.contacts || [];
    const gcContact = contacts.find(c =>
      c.company && c.gcJsaTemplate &&
      (c.company === proj.gc || proj.gc.toLowerCase().includes(c.company.toLowerCase()) || c.company.toLowerCase().includes(proj.gc.toLowerCase()))
    );
    if (gcContact?.gcJsaTemplate) {
      const tmpl = gcContact.gcJsaTemplate;
      setGcTemplate({ ...tmpl, gcCompany: gcContact.company, contactName: gcContact.name });
      // Merge required PPE and permits into form
      setForm(f => ({
        ...f,
        ppe: [...new Set([...f.ppe, ...(tmpl.requiredPpe || [])])],
        permits: [...new Set([...f.permits, ...(tmpl.requiredPermits || [])])],
      }));
      show(`GC template loaded: ${tmpl.name || gcContact.company}`, "ok");
    }
  }, [projects, app.contacts, show]);

  // ── AI auto-fill state ──
  const [aiJsaLoading, setAiJsaLoading] = useState(false);

  const runAiAutoFill = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    if (!form.projectId) { show("Select a project first", "err"); return; }
    setAiJsaLoading(true);
    try {
      const { generateJsa } = await import("../utils/api.js");
      const proj = projects.find(p => String(p.id) === String(form.projectId));
      const res = await generateJsa(app.apiKey, form.trades.join(", "), proj, form.weather, form.location);
      const steps = (res.steps || []).map((s, i) => ({
        id: "s_" + Date.now() + "_" + i,
        step: s.step,
        hazards: (s.hazards || []).map(h => ({
          hazard: h.hazard,
          category: h.category || "other",
          likelihood: h.likelihood || 3,
          severity: h.severity || 3,
          controls: h.controls || [],
          controlType: h.controlType || "administrative",
        })),
      }));
      setForm(f => ({
        ...f,
        title: res.title || f.title,
        steps,
        ppe: res.ppe || f.ppe,
        permits: res.permits || f.permits,
      }));
      show("AI auto-filled JSA steps & hazards", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setAiJsaLoading(false);
    }
  };

  // Stats (hoisted)
  const stats = useMemo(() => {
    const s = { active: 0, draft: 0, closed: 0, total: (jsas || []).length };
    for (const j of (jsas || [])) s[j.status] = (s[j.status] || 0) + 1;
    return s;
  }, [jsas]);

  const projName = (id) => (projects || []).find(p => p.id === id)?.name || `#${id}`;

  // ═══════════════════════════════════════════════════════════
  //  JSA LIST
  // ═══════════════════════════════════════════════════════════
  const renderList = () => {
    const filtered = (jsas || []).filter(j => {
      if (tradeFilter === "all") return true;
      // Support both old single trade and new multi-trade format
      const trades = j.trades || (j.trade ? [j.trade] : []);
      return trades.includes(tradeFilter);
    })
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="jsa-list">
        {/* KPIs */}
        <div className="jsa-kpis">
          <div className="jsa-kpi"><div className="jsa-kpi-val c-green">{stats.active}</div><div className="jsa-kpi-lbl">{t("Active")}</div></div>
          <div className="jsa-kpi"><div className="jsa-kpi-val c-amber">{stats.draft}</div><div className="jsa-kpi-lbl">{t("Draft")}</div></div>
          <div className="jsa-kpi"><div className="jsa-kpi-val c-text3">{stats.closed}</div><div className="jsa-kpi-lbl">{t("Closed")}</div></div>
          <div className="jsa-kpi"><div className="jsa-kpi-val">{stats.total}</div><div className="jsa-kpi-lbl">{t("Total")}</div></div>
        </div>

        {/* Trade filter */}
        <div className="jsa-trade-filter">
          <button className={`cal-nav-btn${tradeFilter === "all" ? " active" : ""}`} onClick={() => setTradeFilter("all")}>{t("All")}</button>
          {Object.entries(TRADE_LABELS).map(([key, { label, labelEs }]) => (
            <button key={key} className={`cal-nav-btn${tradeFilter === key ? " active" : ""}`} onClick={() => setTradeFilter(key)}>
              {lang === "es" ? labelEs : label}
            </button>
          ))}
        </div>

        {/* JSA cards */}
        {filtered.length === 0 && (
          <div className="fs-label p-sp6 c-text3 text-center">
            {t("No JSAs found. Create one to get started.")}
          </div>
        )}
        {filtered.map(j => {
          const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
          const rc = riskColor(maxRisk);
          const statusClr = j.status === "active" ? "#10b981" : j.status === "draft" ? "#f59e0b" : "var(--text3)";
          return (
            <div key={j.id} className="jsa-card" onClick={() => { setActiveJsa(j.id); setSubTab("detail"); }} className="cursor-pointer">
              <div className="jsa-card-top">
                <div className="flex-1">
                  <div className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                    <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr }}>{j.status.toUpperCase()}</span>
                    <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label} Risk</span>
                    {(j.trades || (j.trade ? [j.trade] : [])).map(tr => (
                      <span key={tr} className="fs-tab c-text3">{lang === "es" ? TRADE_LABELS[tr]?.labelEs : TRADE_LABELS[tr]?.label}</span>
                    ))}
                  </div>
                  <div className="fs-secondary fw-semi mb-sp1">{j.title}</div>
                  <div className="fs-label c-text3">
                    {projName(j.projectId)} · {j.date} · {j.supervisor}
                  </div>
                </div>
                <div className="fs-tab c-text3 text-right">
                  <div>{j.steps.length} {t("steps")}</div>
                  <div>{(j.teamSignOn || []).length} {t("signed")}</div>
                </div>
              </div>
              {/* PPE icons */}
              <div className="mt-sp2 gap-sp1 flex-wrap" style={{ display: "flex" }}>
                {(j.ppe || []).slice(0, 8).map(k => {
                  const item = PPE_ITEMS.find(p => p.key === k);
                  return item ? <span key={k} title={lang === "es" ? item.labelEs : item.label} className="fs-card">{item.icon}</span> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── JSA routing state ──
  const [routingResult, setRoutingResult] = useState(null); // { recipients: [...], jsaId }

  // ── Resolve JSA recipients ──
  const resolveJsaRecipients = useCallback((jsa) => {
    const recipients = [];
    const proj = (projects || []).find(p => p.id === jsa.projectId);
    const contacts = app.contacts || [];
    const bookkeepingEmail = app.company?.bookkeepingEmail || "bookkeeping@ebconstructors.com";

    // 1) GC Project Manager — find contact from project's GC company
    if (proj?.gc) {
      const gcPm = contacts.find(c =>
        c.email &&
        (c.company === proj.gc || proj.gc.toLowerCase().includes(c.company?.toLowerCase() || "") || (c.company || "").toLowerCase().includes(proj.gc.toLowerCase())) &&
        (c.role?.toLowerCase().includes("pm") || c.role?.toLowerCase().includes("project manager") || c.role?.toLowerCase().includes("coordinator"))
      );
      if (gcPm) {
        recipients.push({ role: "GC Project Manager", name: gcPm.name, email: gcPm.email, company: gcPm.company });
      } else {
        // Fallback: any contact from that GC with an email
        const gcAny = contacts.find(c => c.email && (c.company === proj.gc || proj.gc.toLowerCase().includes(c.company?.toLowerCase() || "")));
        if (gcAny) recipients.push({ role: "GC Contact", name: gcAny.name, email: gcAny.email, company: gcAny.company });
      }
    }

    // 2) EBC Bookkeeping
    if (bookkeepingEmail) {
      recipients.push({ role: "EBC Bookkeeping", name: "Bookkeeping", email: bookkeepingEmail, company: "EBC" });
    }

    // 3) EBC PM assigned to project
    if (proj?.pm) {
      // Try to find PM email from employees
      const pmEmployee = (app.employees || []).find(e => e.name === proj.pm && e.email);
      recipients.push({ role: "EBC Project Manager", name: proj.pm, email: pmEmployee?.email || "pm@ebconstructors.com", company: "EBC" });
    }

    return recipients;
  }, [projects, app.contacts, app.company, app.employees]);

  // ── Close & Route JSA ──
  const closeAndRouteJsa = useCallback(async (jsa) => {
    // Close the JSA
    setJsas(prev => prev.map(j => j.id === jsa.id ? { ...j, status: "closed", closedAt: new Date().toISOString() } : j));

    // Resolve recipients
    const recipients = resolveJsaRecipients(jsa);

    // Generate PDF (auto-download)
    const projN = projName(jsa.projectId);
    const tradeLabel = (jsa.trades || (jsa.trade ? [jsa.trade] : [])).map(tr => TRADE_LABELS[tr]?.label || tr).join(", ");
    const allH = jsa.steps.flatMap(s => s.hazards || []);
    const maxR = Math.max(0, ...allH.map(h => (h.likelihood || 1) * (h.severity || 1)));
    const ppeLabels = (jsa.ppe || []).map(k => PPE_ITEMS.find(p => p.key === k)?.label || k).filter(Boolean);
    const permitLabels = (jsa.permits || []).map(k => PERMIT_TYPES.find(p => p.key === k)?.label || k).filter(Boolean);
    const teamMap = {};
    (jsa.teamSignOn || []).forEach(c => { teamMap[c.name] = { name: c.name, signature: c.signature || null }; });
    (jsa.teamMembers || []).forEach(c => { if (!teamMap[c.name]) teamMap[c.name] = { name: c.name, signature: c.signature || null }; else if (c.signature) teamMap[c.name].signature = c.signature; });

    const gcHeaderText = jsa.gcTemplate?.headerText || null;

    try {
      await generateJsaPdf({
        ...jsa,
        projectName: projN,
        trade: tradeLabel,
        gc: jsa.gc || (projects || []).find(p => p.id === jsa.projectId)?.gc || "",
        gcHeaderText,
        riskLevel: maxR <= 6 ? "Low" : maxR <= 12 ? "Medium" : maxR <= 19 ? "High" : "Critical",
        ppe: ppeLabels,
        permits: permitLabels,
        teamMembers: Object.values(teamMap),
      });
    } catch { /* PDF generation is best-effort */ }

    // Queue mailto links for each recipient
    if (recipients.length > 0) {
      const subject = encodeURIComponent(`JSA Completed: ${jsa.title} — ${projN}`);
      const body = encodeURIComponent(`JSA "${jsa.title}" for project ${projN} has been completed and signed.\n\nDate: ${jsa.date}\nTrade: ${tradeLabel}\nSupervisor: ${jsa.supervisor}\nCrew: ${Object.keys(teamMap).join(", ") || "—"}\n\nPDF attached separately. Please file accordingly.`);
      // Open mailto for the first recipient (browsers block multiple)
      const allEmails = recipients.map(r => r.email).filter(Boolean).join(",");
      window.open(`mailto:${allEmails}?subject=${subject}&body=${body}`, "_blank");
    }

    // Show routing result
    setRoutingResult({ recipients, jsaId: jsa.id, title: jsa.title, project: projN });
    show(`JSA closed & sent to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`, "ok");
  }, [setJsas, resolveJsaRecipients, show, projects, projName]);

  // ═══════════════════════════════════════════════════════════
  //  JSA DETAIL / EDIT
  // ═══════════════════════════════════════════════════════════
  const renderDetail = () => {
    const jsa = (jsas || []).find(j => j.id === activeJsa);
    if (!jsa) { setSubTab("list"); return null; }

    const updateJsa = (patch) => {
      setJsas(prev => prev.map(j => j.id === jsa.id ? { ...j, ...patch } : j));
    };
    const updateStep = (stepId, patch) => {
      updateJsa({ steps: jsa.steps.map(s => s.id === stepId ? { ...s, ...patch } : s) });
    };

    // Risk summary
    const allHazards = jsa.steps.flatMap(s => s.hazards || []);
    const maxRisk = Math.max(0, ...allHazards.map(h => (h.likelihood || 1) * (h.severity || 1)));
    const avgRisk = allHazards.length > 0 ? (allHazards.reduce((s, h) => s + (h.likelihood || 1) * (h.severity || 1), 0) / allHazards.length).toFixed(1) : 0;
    const rc = riskColor(maxRisk);

    return (
      <div className="jsa-detail">
        {/* Routing Confirmation Banner */}
        {routingResult && routingResult.jsaId === jsa.id && (
          <div className="mb-sp4" style={{ background: "#10b98122", border: "1px solid #10b981", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)" }}>
            <div className="fw-semi fs-label mb-sp2" style={{ color: "#10b981" }}>
              JSA Closed & Routed — Sent to {routingResult.recipients.length} recipient{routingResult.recipients.length !== 1 ? "s" : ""}
            </div>
            {routingResult.recipients.map((r, i) => (
              <div key={i} className="fs-tab mb-sp1" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <span style={{ color: "#10b981" }}>✓</span>
                <span className="fw-semi">{r.role}</span>
                <span className="c-text3">{r.name}</span>
                <span className="c-text3 fs-xs">({r.email})</span>
              </div>
            ))}
            <button className="cal-nav-btn mt-sp2 fs-xs" onClick={() => setRoutingResult(null)}>{t("Dismiss")}</button>
          </div>
        )}

        <div className="mb-sp4 gap-sp2 flex-wrap" style={{ display: "flex", alignItems: "center" }}>
          <button className="cal-nav-btn" onClick={() => setSubTab("list")}>{t("← Back")}</button>
          <span className="jsa-status-badge" style={{ background: (jsa.status === "active" ? "#10b981" : jsa.status === "draft" ? "#f59e0b" : "var(--text3)") + "22", color: jsa.status === "active" ? "#10b981" : jsa.status === "draft" ? "#f59e0b" : "var(--text3)" }}>
            {jsa.status.toUpperCase()}
          </span>
          <div className="gap-sp2 ml-auto" style={{ display: "flex" }}>
            {jsa.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateJsa({ status: "active" })}>{t("Activate")}</button>}
            {jsa.status === "active" && <button className="cal-nav-btn" onClick={() => closeAndRouteJsa(jsa)}>{t("Close & Send JSA")}</button>}
            <button className="cal-nav-btn" onClick={() => {
              const projN = projName(jsa.projectId);
              const tradeLabel = (jsa.trades || (jsa.trade ? [jsa.trade] : [])).map(tr => TRADE_LABELS[tr]?.label || tr).join(", ");
              const allH = jsa.steps.flatMap(s => s.hazards || []);
              const maxR = Math.max(0, ...allH.map(h => (h.likelihood||1)*(h.severity||1)));
              const riskLbl = riskColor(maxR).label;
              const ppeList = (jsa.ppe || []).map(k => PPE_ITEMS.find(p=>p.key===k)?.label).filter(Boolean).join(", ");
              const permitList = (jsa.permits || []).map(k => PERMIT_TYPES.find(p=>p.key===k)?.label).filter(Boolean).join(", ");
              const teamList = (jsa.teamSignOn || []).map(c => c.name);
              const teamMembersList = (jsa.teamMembers || []).map(c => c.name + (c.role ? ` (${c.role})` : ''));
              const allTeam = [...new Set([...teamList, ...teamMembersList])];
              const stepTxt = (s) => lang === "es" && s.stepEs ? s.stepEs : s.step;
              const hazTxt = (h) => lang === "es" && h.hazardEs ? h.hazardEs : h.hazard;
              const html = `<!DOCTYPE html><html><head><title>JSA — ${jsa.title}</title><style>
                body{font-family:Arial,sans-serif;max-width:850px;margin:0 auto;padding:20px;color:#111;font-size:12px}
                h1{font-size:20px;margin:0 0 2px} h2{font-size:14px;margin:12px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
                .header{border-bottom:3px solid #333;padding-bottom:10px;margin-bottom:12px}
                .company{font-size:18px;font-weight:700;color:#b45309}
                .meta-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 12px;margin-bottom:12px}
                .meta-grid div{padding:2px 0} .meta-grid span{color:#666;font-size:11px}
                .risk-badge{display:inline-block;padding:2px 10px;border-radius:4px;font-weight:700;color:#fff;font-size:11px}
                table{width:100%;border-collapse:collapse;margin:8px 0 12px}
                th,td{border:1px solid #ccc;padding:5px 8px;text-align:left;font-size:11px}
                th{background:#f0f0f0;font-weight:600} .step-hdr{background:#f8f8f8;font-weight:600}
                .ppe-list{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0}
                .ppe-item{padding:2px 8px;background:#e8f4fd;border-radius:4px;font-size:11px}
                .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px}
                .sig-box{border-top:1px solid #666;padding-top:4px;font-size:10px;color:#666;min-height:32px}
                @media print{body{padding:8px;font-size:11px}}
              </style></head><body>
                <div class="header"><div class="company">Eagles Brothers Constructors</div>
                <h1>${t("Job Safety Analysis")} (JSA)</h1>
                <div style="font-size:11px;color:#666">${t("OSHA-Compliant Pre-Task Hazard Planning")}</div></div>
                <div class="meta-grid">
                  <div><span>${t("Title")}:</span><br/><strong>${jsa.title}</strong></div>
                  <div><span>${t("Project")}:</span><br/>${projN}</div>
                  <div><span>${t("Trade")}:</span><br/>${tradeLabel}</div>
                  <div><span>${t("Location")}:</span><br/>${jsa.location || 'N/A'}</div>
                  <div><span>${t("Date")}:</span><br/>${jsa.date}</div>
                  <div><span>${t("Shift")}:</span><br/>${jsa.shift || t('Day')}</div>
                  <div><span>${t("Supervisor")}:</span><br/>${jsa.supervisor || 'N/A'}</div>
                  <div><span>${t("GC")}:</span><br/>${jsa.gc || 'N/A'}</div>
                  <div><span>${t("Risk Level")}:</span><br/><span class="risk-badge" style="background:${riskColor(maxR).bg}">${riskLbl} (${maxR})</span></div>
                </div>
                <h2>${t("Required PPE")}</h2>
                <div class="ppe-list">${ppeList ? ppeList.split(', ').map(p => '<span class="ppe-item">'+p+'</span>').join('') : t('None')}</div>
                ${permitList ? '<h2>'+t("Permits Required")+'</h2><div>'+permitList+'</div>' : ''}
                <h2>${t("Job Steps & Hazard Analysis")}</h2>
                <table><thead><tr><th style="width:30px">#</th><th>${t("Step")}</th><th>${t("Hazard")}</th><th>${t("Risk")}</th><th>${t("Controls")}</th></tr></thead><tbody>
                ${jsa.steps.map((s, si) => {
                  if (!s.hazards || s.hazards.length === 0) return '<tr><td>'+(si+1)+'</td><td>'+stepTxt(s)+'</td><td colspan="3" style="color:#999">'+t("No hazards identified")+'</td></tr>';
                  return s.hazards.map((h, hi) => '<tr>'+(hi===0?'<td rowspan="'+s.hazards.length+'">'+(si+1)+'</td><td rowspan="'+s.hazards.length+'">'+stepTxt(s)+'</td>':'')+'<td>'+hazTxt(h)+'</td><td style="text-align:center">'+(h.likelihood||1)*(h.severity||1)+'</td><td>'+(h.controls||[]).map(c=>'- '+c).join('<br/>')+'</td></tr>').join('');
                }).join('')}
                </tbody></table>
                <h2>${t("Crew Members")} / ${t("Signatures")}</h2>
                <div class="sig-grid">
                  ${(() => {
                    const sigMap = {};
                    (jsa.teamSignOn || []).forEach(c => { if (c.signature) sigMap[c.name] = c.signature; });
                    (jsa.teamMembers || []).forEach(c => { if (c.signature) sigMap[c.name] = c.signature; });
                    if (allTeam.length > 0) {
                      return allTeam.map(n => {
                        const sig = sigMap[n];
                        return '<div><strong>'+n+'</strong><div class="sig-box">'+(sig ? '<img src="'+sig+'" style="width:200px;height:50px;object-fit:contain;display:block;margin:4px 0"/>' : t('Signature')+': ________________')+'<br/>'+t('Date')+': '+jsa.date+'</div></div>';
                      }).join('');
                    }
                    return '<div class="sig-box">'+t('Name')+': ________________<br/>'+t('Signature')+': ________________<br/>'+t('Date')+': ________</div><div class="sig-box">'+t('Name')+': ________________<br/>'+t('Signature')+': ________________<br/>'+t('Date')+': ________</div><div class="sig-box">'+t('Name')+': ________________<br/>'+t('Signature')+': ________________<br/>'+t('Date')+': ________</div>';
                  })()}
                </div>
              </body></html>`;
              const w = window.open('', '_blank');
              w.document.write(html);
              w.document.close();
              w.setTimeout(() => w.print(), 300);
            }}>{t("Print")}</button>
            <button className="btn btn-primary btn-sm" onClick={() => {
              const projN = projName(jsa.projectId);
              const tradeLabel2 = (jsa.trades || (jsa.trade ? [jsa.trade] : [])).map(tr => TRADE_LABELS[tr]?.label || tr).join(", ");
              const allH2 = jsa.steps.flatMap(s => s.hazards || []);
              const maxR2 = Math.max(0, ...allH2.map(h => (h.likelihood||1)*(h.severity||1)));
              const ppeLabels = (jsa.ppe || []).map(k => PPE_ITEMS.find(p=>p.key===k)?.label || k).filter(Boolean);
              const permitLabels = (jsa.permits || []).map(k => PERMIT_TYPES.find(p=>p.key===k)?.label || k).filter(Boolean);
              // Build team list with signatures from both teamSignOn and teamMembers
              const teamMap = {};
              (jsa.teamSignOn || []).forEach(c => { teamMap[c.name] = { name: c.name, signature: c.signature || null }; });
              (jsa.teamMembers || []).forEach(c => { if (!teamMap[c.name]) teamMap[c.name] = { name: c.name, signature: c.signature || null }; else if (c.signature) teamMap[c.name].signature = c.signature; });
              generateJsaPdf({
                ...jsa,
                projectName: projN,
                trade: tradeLabel2,
                riskLevel: maxR2 <= 6 ? "Low" : maxR2 <= 12 ? "Medium" : maxR2 <= 19 ? "High" : "Critical",
                ppe: ppeLabels,
                permits: permitLabels,
                teamMembers: Object.values(teamMap),
              });
            }}>{t("Export PDF")}</button>
            <button className="btn btn-ghost btn-sm c-red" onClick={() => {
              if (confirm("Delete this JSA?")) { setJsas(prev => prev.filter(j => j.id !== jsa.id)); setSubTab("list"); show("JSA deleted"); }
            }}>{t("Delete")}</button>
          </div>
        </div>

        {/* Header info */}
        <div className="jsa-detail-header">
          <h2 className="fw-bold fs-section mb-sp1">{jsa.title}</h2>
          <div className="jsa-detail-meta">
            <span>{projName(jsa.projectId)}</span>
            <span>{jsa.date}</span>
            <span>{jsa.location}</span>
            <span>{t("Supervisor")}: {jsa.supervisor}</span>
            <span>{(jsa.trades || (jsa.trade ? [jsa.trade] : [])).map(tr => lang === "es" ? TRADE_LABELS[tr]?.labelEs : TRADE_LABELS[tr]?.label).join(", ")}</span>
          </div>
        </div>

        {/* Risk summary bar */}
        <div className="jsa-risk-summary">
          <div className="jsa-risk-item">
            <div className="fs-tab c-text3">{t("Highest Risk")}</div>
            <div className="fs-subtitle fw-bold" style={{ color: rc.bg }}>{maxRisk}</div>
            <div className="fs-xs" style={{ color: rc.bg }}>{rc.label}</div>
          </div>
          <div className="jsa-risk-item">
            <div className="fs-tab c-text3">{t("Avg Risk")}</div>
            <div className="fs-subtitle fw-bold">{avgRisk}</div>
          </div>
          <div className="jsa-risk-item">
            <div className="fs-tab c-text3">{t("Hazards")}</div>
            <div className="fs-subtitle fw-bold">{allHazards.length}</div>
          </div>
          <div className="jsa-risk-item">
            <div className="fs-tab c-text3">{t("Crew Signed")}</div>
            <div className="fs-subtitle fw-bold c-green">{(jsa.teamSignOn || []).length}</div>
          </div>
        </div>

        {/* PPE Required */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Required PPE")}</div>
          <div className="jsa-ppe-grid">
            {(jsa.ppe || []).map(k => {
              const item = PPE_ITEMS.find(p => p.key === k);
              if (!item) return null;
              return (
                <div key={k} className="jsa-ppe-item">
                  <span className="fs-subtitle">{item.icon}</span>
                  <span className="fs-tab">{lang === "es" ? item.labelEs : item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permits Required */}
        {(jsa.permits || []).length > 0 && (
          <div className="jsa-section">
            <div className="jsa-section-title">{t("Permits Required")}</div>
            <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
              {jsa.permits.map(k => {
                const p = PERMIT_TYPES.find(pt => pt.key === k);
                return <span key={k} className="jsa-permit-badge">{lang === "es" ? p?.labelEs : p?.label}</span>;
              })}
            </div>
          </div>
        )}

        {/* Steps + Hazards */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Job Steps & Hazard Analysis")}</div>
          {(jsa.steps || []).map((step, idx) => (
            <div key={step.id} className="jsa-step-card">
              <div className="jsa-step-header">
                <span className="jsa-step-num">{idx + 1}</span>
                <span className="jsa-step-text">{lang === "es" && step.stepEs ? step.stepEs : step.step}</span>
              </div>
              {(step.hazards || []).map((h, hi) => {
                const score = (h.likelihood || 1) * (h.severity || 1);
                const hrc = riskColor(score);
                const cat = HAZARD_CATEGORIES.find(c => c.key === h.category);
                const ctrl = CONTROL_HIERARCHY.find(c => c.key === h.controlType);
                return (
                  <div key={hi} className="jsa-hazard-row">
                    <div className="jsa-hazard-info">
                      <div className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                        <span className="jsa-cat-badge" style={{ background: cat?.color + "22", color: cat?.color }}>
                          {lang === "es" ? cat?.labelEs : cat?.label}
                        </span>
                        <span className="jsa-risk-score c-white" style={{ background: hrc.bg }}>{score}</span>
                        {ctrl && <span className="fw-semi fs-xs" style={{ color: ctrl.color }}>{lang === "es" ? ctrl.labelEs : ctrl.label}</span>}
                      </div>
                      <div className="fw-medium mb-sp1 fs-label">{lang === "es" && h.hazardEs ? h.hazardEs : h.hazard}</div>
                      <div className="fs-label c-text3">
                        {t("L")}:{h.likelihood} × {t("S")}:{h.severity} = {score}
                      </div>
                    </div>
                    <div className="jsa-controls-list">
                      {(h.controls || []).map((c, ci) => (
                        <div key={ci} className="jsa-control-item">✓ {c}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {(step.hazards || []).length === 0 && (
                <div className="fs-label c-text3" style={{ padding: "8px 0 0 36px" }}>{t("No hazards identified for this step")}</div>
              )}
            </div>
          ))}
        </div>

        {/* Crew Sign-On with Signatures */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Crew Sign-On")}</div>
          <div className="jsa-team-list">
            {(jsa.teamSignOn || []).map((c, i) => (
              <div key={i} className="jsa-team-item items-start gap-sp2" style={{ flexDirection: "column", padding: "var(--space-3) var(--space-3)" }}>
                <div className="gap-sp2 w-full" style={{ display: "flex", alignItems: "center" }}>
                  <span className="fw-semi fs-label">{c.name}</span>
                  <span className="fs-tab c-green">✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <SignaturePad
                  label={t("Touch to Sign") + " — " + c.name}
                  signatureData={c.signature || null}
                  onSave={(dataUrl) => {
                    const updated = [...(jsa.teamSignOn || [])];
                    updated[i] = { ...updated[i], signature: dataUrl, signedAt: new Date().toISOString() };
                    updateJsa({ teamSignOn: updated });
                    show(t("Signature saved"));
                  }}
                  onClear={() => {
                    const updated = [...(jsa.teamSignOn || [])];
                    updated[i] = { ...updated[i], signature: null };
                    updateJsa({ teamSignOn: updated });
                  }}
                />
              </div>
            ))}
            {jsa.status === "active" && (
              <div className="mt-sp2">
                <select
                  className="form-select fs-label" style={{ maxWidth: 250 }}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const emp = (employees || []).find(em => em.id === Number(e.target.value));
                    if (!emp) return;
                    if ((jsa.teamSignOn || []).some(c => c.employeeId === emp.id)) { show(t("Already signed on")); return; }
                    updateJsa({
                      teamSignOn: [...(jsa.teamSignOn || []), { employeeId: emp.id, name: emp.name, signedAt: new Date().toISOString(), signature: null }]
                    });
                    show(t("Crew member signed on"));
                    e.target.value = "";
                  }}
                >
                  <option value="">{t("+ Add team member...")}</option>
                  {(employees || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Toolbox Talk */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Toolbox Talk")}</div>
          {jsa.toolboxTalk?.discussed ? (
            <div className="jsa-toolbox">
              <div className="fw-medium fs-label">{jsa.toolboxTalk.topic}</div>
              <div className="fs-label mt-sp1 c-text3">{jsa.toolboxTalk.notes}</div>
            </div>
          ) : (
            <div className="fs-label c-text3">{t("No toolbox talk recorded")}</div>
          )}
        </div>

        {/* Crew Members / Signatures */}
        {(jsa.teamMembers || []).length > 0 && (
          <div className="jsa-section">
            <div className="jsa-section-title">{t("Crew Members")}</div>
            <div className="jsa-team-list">
              {jsa.teamMembers.map((cm, i) => (
                <div key={i} className="jsa-team-item items-start gap-sp2" style={{ flexDirection: "column", padding: "var(--space-3) var(--space-3)" }}>
                  <div className="gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                    <span className="fw-semi fs-label">{cm.name}</span>
                    {cm.role && <span className="fs-tab c-text3">{cm.role}</span>}
                  </div>
                  {jsa.status === "active" && (
                    <SignaturePad
                      label={t("Touch to Sign") + " — " + cm.name}
                      signatureData={cm.signature || null}
                      onSave={(dataUrl) => {
                        const updated = [...(jsa.teamMembers || [])];
                        updated[i] = { ...updated[i], signature: dataUrl };
                        updateJsa({ teamMembers: updated });
                        show(t("Signature saved"));
                      }}
                      onClear={() => {
                        const updated = [...(jsa.teamMembers || [])];
                        updated[i] = { ...updated[i], signature: null };
                        updateJsa({ teamMembers: updated });
                      }}
                    />
                  )}
                  {jsa.status !== "active" && cm.signature && (
                    <img src={cm.signature} alt="Signature" className="rounded-control p-sp1 w-full" style={{ maxWidth: 280, height: 60, objectFit: "contain",
                      background: "var(--bg)", border: "1px solid var(--border)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GC Info */}
        {jsa.gc && (
          <div className="jsa-section">
            <div className="jsa-section-title">{t("General Contractor")}</div>
            <div className="fs-label">{jsa.gc}</div>
          </div>
        )}

        {/* Near Misses */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Near Misses / Close Calls")}</div>
          {(jsa.nearMisses || []).length === 0 ? (
            <div className="fs-label c-text3">{t("None reported")}</div>
          ) : (
            (jsa.nearMisses || []).map((nm, i) => (
              <div key={i} className="jsa-near-miss">{nm.description} — {nm.reportedBy} ({nm.date})</div>
            ))
          )}
          {jsa.status === "active" && (
            <button className="cal-nav-btn fs-label mt-sp2" onClick={() => {
              const desc = prompt(lang === "es" ? "Describe el casi-accidente:" : "Describe the near miss:");
              if (!desc) return;
              updateJsa({
                nearMisses: [...(jsa.nearMisses || []), { description: desc, reportedBy: jsa.supervisor, date: new Date().toISOString().slice(0, 10) }]
              });
              show(t("Near miss recorded"));
            }}>{t("+ Report Near Miss")}</button>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  CREATE NEW JSA
  // ═══════════════════════════════════════════════════════════
  const renderCreate = () => {
    const applyTemplate = (tmplId) => {
      const tmpl = JSA_TEMPLATES.find(t => t.id === tmplId);
      if (!tmpl) return;
      const trade = tmpl.trade;
      const lib = HAZARD_LIBRARY[trade] || [];
      const steps = tmpl.steps.map((s, i) => ({
        id: "s_" + Date.now() + "_" + i,
        step: lang === "es" ? s.stepEs : s.step,
        hazards: (s.hazards || []).map(hIdx => {
          const h = lib[hIdx];
          if (!h) return null;
          return { hazard: lang === "es" ? h.hazardEs : h.hazard, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType };
        }).filter(Boolean),
      }));
      setForm(f => ({
        ...f,
        templateId: tmplId,
        trades: [...new Set([...(f.trades || []), trade])],
        title: lang === "es" ? tmpl.titleEs : tmpl.title,
        steps,
        ppe: [...tmpl.ppe],
        permits: [...tmpl.permits],
      }));
    };

    const addStep = () => {
      updForm("steps", [...form.steps, { id: "s_" + Date.now(), step: "", hazards: [] }]);
    };

    const updateFormStep = (idx, patch) => {
      updForm("steps", form.steps.map((s, i) => i === idx ? { ...s, ...patch } : s));
    };

    const removeStep = (idx) => {
      updForm("steps", form.steps.filter((_, i) => i !== idx));
    };

    const addHazardToStep = (stepIdx, hazard) => {
      const steps = [...form.steps];
      steps[stepIdx] = { ...steps[stepIdx], hazards: [...(steps[stepIdx].hazards || []), { ...hazard }] };
      updForm("steps", steps);
    };

    const removeHazardFromStep = (stepIdx, hazIdx) => {
      const steps = [...form.steps];
      steps[stepIdx] = { ...steps[stepIdx], hazards: steps[stepIdx].hazards.filter((_, i) => i !== hazIdx) };
      updForm("steps", steps);
    };

    const saveJsa = () => {
      if (!form.projectId) { show(t("Select a project"), "err"); return; }
      if (!form.title) { show(t("Title required"), "err"); return; }
      if (form.steps.length === 0) { show(t("Add at least one step"), "err"); return; }
      const newJsa = {
        id: crypto.randomUUID(),
        ...form,
        projectId: Number(form.projectId),
        gcTemplate: gcTemplate || null,
        status: "draft",
        teamSignOn: [],
        toolboxTalk: { topic: "", notes: "", discussed: false },
        nearMisses: [],
        createdAt: new Date().toISOString(),
        createdBy: "admin",
        audit: [],
      };
      setJsas(prev => [...prev, newJsa]);
      show(t("JSA created"));
      setForm({ projectId: "", trades: ["framing"], templateId: "", title: "", location: "", supervisor: autoSupervisor, competentPerson: autoSupervisor, gc: "", date: new Date().toISOString().slice(0, 10), shift: "day", weather: "clear", indoorOutdoor: "outdoor", steps: [], ppe: [], permits: [], teamMembers: [] });
      setGcTemplate(null);
      setActiveJsa(newJsa.id);
      setSubTab("detail");
    };

    // Weather-aware hazard suggestion
    const weatherHazard = WEATHER_HAZARD_MAP[form.weather];

    return (
      <div className="jsa-create">
        <div className="jsa-section-title">{t("Create New JSA")}</div>

        {/* Template selector */}
        <div className="jsa-form-group">
          <label>{t("Start from Template")}</label>
          <select className="form-select" value={form.templateId} onChange={e => applyTemplate(e.target.value)}>
            <option value="">{t("— Blank JSA —")}</option>
            {JSA_TEMPLATES.map(tmpl => (
              <option key={tmpl.id} value={tmpl.id}>{lang === "es" ? tmpl.titleEs : tmpl.title}</option>
            ))}
          </select>
        </div>

        {/* Basic info */}
        <div className="form-grid mb-sp4">
          <div className="form-group">
            <label className="form-label">{t("Project")}</label>
            <select className="form-select" value={form.projectId} onChange={e => handleProjectSelect(e.target.value)}>
              <option value="">{t("Select...")}</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t("Trades")} <span className="fw-normal fs-tab c-text3">({t("select all that apply")})</span></label>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(TRADE_LABELS).map(([k, v]) => {
                const selected = (form.trades || []).includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`btn btn-sm ${selected ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => {
                      const current = form.trades || [];
                      const next = selected ? current.filter(t => t !== k) : [...current, k];
                      updForm("trades", next.length > 0 ? next : [k]);
                      // Auto-apply matching template when adding a trade and no steps exist yet
                      if (!selected && (form.steps || []).length === 0) {
                        const match = JSA_TEMPLATES.find(t => t.trade === k);
                        if (match) applyTemplate(match.id);
                      }
                    }}
                  >
                    {lang === "es" ? v.labelEs : v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-group full">
            <label className="form-label">{t("JSA Title")}</label>
            <input className="form-input" value={form.title} onChange={e => updForm("title", e.target.value)} placeholder={t("e.g. Metal Stud Framing — Level 2")} />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Location on Site")}</label>
            <input className="form-input" value={form.location} onChange={e => updForm("location", e.target.value)} placeholder={t("e.g. Level 2, Suite 200")} />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Date")}</label>
            <input className="form-input" type="date" value={form.date} onChange={e => updForm("date", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t("Supervisor / Competent Person")}</label>
            <input className="form-input" value={form.supervisor} onChange={e => { updForm("supervisor", e.target.value); updForm("competentPerson", e.target.value); }} />
          </div>
          <div className="form-group">
            <label className="form-label">{t("General Contractor (GC)")}</label>
            <input className="form-input" list="gc-list" value={form.gc} onChange={e => updForm("gc", e.target.value)} placeholder={t("Type or select GC...")} />
            <datalist id="gc-list">
              {(app.contacts || []).filter(c => c.role === "GC" || c.company).map((c, i) => (
                <option key={i} value={c.company ? `${c.name} — ${c.company}` : c.name} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">{t("Indoor / Outdoor")}</label>
            <div className="gap-sp1" style={{ display: "flex" }}>
              <button type="button" className={`cal-nav-btn${form.indoorOutdoor === "indoor" ? " active" : ""}`}
                style={form.indoorOutdoor === "indoor" ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)" } : {}}
                onClick={() => updForm("indoorOutdoor", "indoor")}>{t("Indoor")}</button>
              <button type="button" className={`cal-nav-btn${form.indoorOutdoor === "outdoor" ? " active" : ""}`}
                style={form.indoorOutdoor === "outdoor" ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)" } : {}}
                onClick={() => updForm("indoorOutdoor", "outdoor")}>{t("Outdoor")}</button>
              <button type="button" className={`cal-nav-btn${form.indoorOutdoor === "both" ? " active" : ""}`}
                style={form.indoorOutdoor === "both" ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)" } : {}}
                onClick={() => updForm("indoorOutdoor", "both")}>{t("Both")}</button>
            </div>
          </div>
          {form.indoorOutdoor !== "indoor" && (
            <div className="form-group">
              <label className="form-label">{t("Weather")}</label>
              <select className="form-select" value={form.weather} onChange={e => updForm("weather", e.target.value)}>
                <option value="clear">{t("Clear")}</option>
                <option value="rain">{t("Rain")}</option>
                <option value="thunderstorm">{t("Thunderstorm")}</option>
                <option value="heat">{t("Heat Advisory")}</option>
                <option value="freeze">{t("Freeze/Cold")}</option>
                <option value="wind">{t("High Wind")}</option>
              </select>
            </div>
          )}
        </div>

        {/* Weather warning */}
        {form.indoorOutdoor !== "indoor" && weatherHazard && form.weather !== "clear" && (
          <div className="jsa-weather-warn">
            <AlertTriangle className="mr-sp1" style={{ width: 16, height: 16, display: "inline", verticalAlign: "middle" }} />{lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
          </div>
        )}

        {/* GC Template Banner */}
        {gcTemplate && (
          <div className="jsa-gc-template-banner" style={{ background: "var(--blue-bg, #1e3a5f22)", border: "1px solid var(--blue, #3b82f6)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div className="fw-semi fs-label mb-sp1" style={{ color: "var(--blue, #3b82f6)" }}>
              {gcTemplate.gcCompany} — JSA Template Applied
            </div>
            {gcTemplate.headerText && <div className="fs-tab c-text2 mb-sp1">{gcTemplate.headerText}</div>}
            {gcTemplate.additionalNotes && <div className="fs-xs c-text3">{gcTemplate.additionalNotes}</div>}
            {(gcTemplate.requiredPpe || []).length > 0 && (
              <div className="fs-xs c-text3 mt-sp1">Required PPE auto-added: {gcTemplate.requiredPpe.map(k => {
                const item = PPE_ITEMS.find(p => p.key === k);
                return item ? `${item.icon} ${item.label}` : k;
              }).join(", ")}</div>
            )}
            {(gcTemplate.requiredPermits || []).length > 0 && (
              <div className="fs-xs c-text3 mt-sp1">Required permits auto-added: {gcTemplate.requiredPermits.map(k => {
                const p = PERMIT_TYPES.find(pt => pt.key === k);
                return p ? p.label : k;
              }).join(", ")}</div>
            )}
          </div>
        )}

        {/* PPE Selector */}
        <div className="jsa-section mb-sp4">
          <div className="jsa-section-title">{t("Required PPE")}</div>
          <div className="jsa-ppe-picker">
            {PPE_ITEMS.map(item => {
              const active = form.ppe.includes(item.key);
              return (
                <div
                  key={item.key}
                  className={`jsa-ppe-pick${active ? " active" : ""}`}
                  onClick={() => updForm("ppe", active ? form.ppe.filter(k => k !== item.key) : [...form.ppe, item.key])}
                >
                  <span className="fs-subtitle">{item.icon}</span>
                  <span className="fs-xs">{lang === "es" ? item.labelEs : item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permits */}
        <div className="jsa-section mb-sp4">
          <div className="jsa-section-title">{t("Permits Required")}</div>
          <div className="gap-sp2 flex-wrap" style={{ display: "flex" }}>
            {PERMIT_TYPES.map(p => {
              const active = form.permits.includes(p.key);
              return (
                <button
                  key={p.key}
                  className={`cal-nav-btn${active ? " active" : ""}`}
                  style={active ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)" } : {}}
                  onClick={() => updForm("permits", active ? form.permits.filter(k => k !== p.key) : [...form.permits, p.key])}
                >
                  {lang === "es" ? p.labelEs : p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Steps */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Job Steps & Hazards")}</div>
          {form.steps.map((step, idx) => (
            <div key={step.id} className="jsa-step-card">
              <div className="jsa-step-header">
                <span className="jsa-step-num">{idx + 1}</span>
                <input
                  className="form-input fs-label flex-1"
                  value={step.step}
                  onChange={e => updateFormStep(idx, { step: e.target.value })}
                  placeholder={t("Describe this step...")}
                />
                <button className="btn btn-danger btn-sm fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }} onClick={() => removeStep(idx)}>X</button>
              </div>

              {/* Hazards for this step */}
              {(step.hazards || []).map((h, hi) => {
                const score = (h.likelihood || 1) * (h.severity || 1);
                const hrc = riskColor(score);
                return (
                  <div key={hi} className="jsa-hazard-row bg-bg3">
                    <div className="jsa-hazard-info flex-1">
                      <div className="gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                        <span className="jsa-risk-score c-white" style={{ background: hrc.bg }}>{score}</span>
                        <span className="fw-medium fs-label">{h.hazard}</span>
                        <button className="fs-secondary c-red ml-auto cursor-pointer" style={{ background: "none", border: "none" }} onClick={() => removeHazardFromStep(idx, hi)}>✕</button>
                      </div>
                      <div className="fs-tab mt-sp1 c-text3">
                        {(h.controls || []).join(" · ")}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add hazard from library */}
              <div className="gap-sp2 flex-wrap" style={{ padding: "4px 0 0 36px", display: "flex", alignItems: "end" }}>
                <select
                  className="form-select fs-tab" style={{ maxWidth: 350 }}
                  onChange={e => {
                    if (!e.target.value) return;
                    if (e.target.value === "__custom__") {
                      const desc = prompt(lang === "es" ? "Describa el peligro:" : "Describe the hazard:");
                      if (desc) {
                        const ctrl = prompt(lang === "es" ? "Control/mitigación (separar con coma):" : "Control/mitigation (comma-separate multiple):");
                        addHazardToStep(idx, { hazard: desc, category: "other", likelihood: 3, severity: 3, controls: ctrl ? ctrl.split(",").map(s => s.trim()) : [], controlType: "administrative" });
                      }
                      e.target.value = "";
                      return;
                    }
                    const [trade, hIdx] = e.target.value.split("|");
                    const h = (HAZARD_LIBRARY[trade] || [])[Number(hIdx)];
                    if (h) addHazardToStep(idx, { hazard: lang === "es" ? h.hazardEs : h.hazard, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType });
                    e.target.value = "";
                  }}
                >
                  <option value="">{t("+ Add hazard from library...")}</option>
                  <option value="__custom__">--- {t("Other (custom hazard)")} ---</option>
                  {Object.entries(HAZARD_LIBRARY).map(([trade, hazards]) => (
                    <optgroup key={trade} label={lang === "es" ? TRADE_LABELS[trade]?.labelEs : TRADE_LABELS[trade]?.label}>
                      {hazards.map((h, i) => (
                        <option key={i} value={`${trade}|${i}`}>{lang === "es" ? h.hazardEs : h.hazard}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <div className="mt-sp2 gap-sp2" style={{ display: "flex" }}>
            <button className="cal-nav-btn" onClick={addStep}>{t("+ Add Step")}</button>
            <button className="cal-nav-btn" onClick={() => {
              const desc = prompt(lang === "es" ? "Describa el paso personalizado:" : "Describe the custom step:");
              if (desc) {
                updForm("steps", [...form.steps, { id: "s_" + Date.now(), step: desc, hazards: [] }]);
              }
            }}>{t("+ Add Custom Step")}</button>
          </div>
        </div>

        {/* Crew Members / Signatures */}
        <div className="jsa-section mt-sp4">
          <div className="jsa-section-title">{t("Crew Members / Signatures")}</div>
          <div className="mb-sp2 fs-label c-text3">{t("Add team members who will acknowledge this JSA")}</div>
          {(form.teamMembers || []).map((cm, i) => (
            <div key={i} className="mb-sp2 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
              <input className="form-input fs-label flex-1" value={cm.name} placeholder={t("Name")}
                onChange={e => {
                  const updated = [...form.teamMembers];
                  updated[i] = { ...updated[i], name: e.target.value };
                  updForm("teamMembers", updated);
                }} />
              <input className="form-input fs-label flex-1" value={cm.role || ""} placeholder={t("Role / Trade")}
                onChange={e => {
                  const updated = [...form.teamMembers];
                  updated[i] = { ...updated[i], role: e.target.value };
                  updForm("teamMembers", updated);
                }} />
              <button className="btn btn-ghost btn-sm c-red" style={{ padding: "var(--space-1) var(--space-2)" }}
                onClick={() => updForm("teamMembers", form.teamMembers.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          <div className="gap-sp2" style={{ display: "flex" }}>
            <button className="cal-nav-btn fs-label"
              onClick={() => updForm("teamMembers", [...(form.teamMembers || []), { name: "", role: "" }])}>{t("+ Add Crew Member")}</button>
            {(employees || []).length > 0 && (
              <select className="form-select fs-tab" style={{ maxWidth: 200 }}
                onChange={e => {
                  if (!e.target.value) return;
                  const emp = employees.find(em => em.id === Number(e.target.value));
                  if (emp) updForm("teamMembers", [...(form.teamMembers || []), { name: emp.name, role: emp.role || emp.trade || "" }]);
                  e.target.value = "";
                }}>
                <option value="">{t("Pick from employees...")}</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="mt-sp5 gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost c-amber" style={{ marginRight: "auto" }} onClick={runAiAutoFill} disabled={aiJsaLoading}>
            {aiJsaLoading ? "Generating..." : <><Zap className="mr-sp1" style={{ width: 16, height: 16, display: "inline", verticalAlign: "middle" }} />AI Auto-Fill</>}
          </button>
          <button className="cal-nav-btn" onClick={() => setSubTab("list")}>{t("Cancel")}</button>
          <button className="btn btn-primary" onClick={saveJsa}>{t("Create JSA")}</button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  HAZARD LIBRARY
  // ═══════════════════════════════════════════════════════════
  const renderLibrary = () => {
    const hazards = HAZARD_LIBRARY[libTrade] || [];
    return (
      <div className="jsa-library">
        <div className="jsa-section-title">{t("Hazard Library")}</div>
        <div className="jsa-trade-filter mb-sp4">
          {Object.entries(TRADE_LABELS).map(([key, { label, labelEs }]) => (
            <button key={key} className={`cal-nav-btn${libTrade === key ? " active" : ""}`} onClick={() => setLibTrade(key)}>
              {lang === "es" ? labelEs : label}
            </button>
          ))}
        </div>

        <div className="mb-sp3 fs-label c-text3">{hazards.length} {t("hazards")}</div>

        {hazards.map((h, i) => {
          const score = h.likelihood * h.severity;
          const rc = riskColor(score);
          const cat = HAZARD_CATEGORIES.find(c => c.key === h.category);
          const ctrl = CONTROL_HIERARCHY.find(c => c.key === h.controlType);
          return (
            <div key={i} className="jsa-hazard-row" style={{ borderLeft: `3px solid ${rc.bg}` }}>
              <div className="jsa-hazard-info flex-1">
                <div className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                  <span className="jsa-cat-badge" style={{ background: cat?.color + "22", color: cat?.color }}>
                    {lang === "es" ? cat?.labelEs : cat?.label}
                  </span>
                  <span className="jsa-risk-score c-white" style={{ background: rc.bg }}>{score}</span>
                  {ctrl && <span className="fw-semi fs-xs" style={{ color: ctrl.color }}>{lang === "es" ? ctrl.labelEs : ctrl.label}</span>}
                </div>
                <div className="fw-semi mb-sp1 fs-label">{lang === "es" ? h.hazardEs : h.hazard}</div>
                <div className="mb-sp1 fs-label c-text3">
                  {t("Likelihood")}: {h.likelihood}/5 · {t("Severity")}: {h.severity}/5
                </div>
                <div className="jsa-controls-list">
                  {h.controls.map((c, ci) => <div key={ci} className="jsa-control-item">✓ {c}</div>)}
                </div>
                {h.ppe.length > 0 && (
                  <div className="mt-sp2 gap-sp1" style={{ display: "flex" }}>
                    {h.ppe.map(k => {
                      const item = PPE_ITEMS.find(p => p.key === k);
                      return item ? <span key={k} title={lang === "es" ? item.labelEs : item.label} className="fs-card">{item.icon}</span> : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  TEMPLATES
  // ═══════════════════════════════════════════════════════════
  const renderTemplates = () => (
    <div className="jsa-templates">
      <div className="jsa-section-title">{t("Pre-Built JSA Templates")}</div>
      <div className="mb-sp4 fs-label c-text3">
        {t("Select a template to quickly create a JSA with pre-loaded steps, hazards, and controls.")}
      </div>
      <div className="jsa-template-grid">
        {JSA_TEMPLATES.map(tmpl => {
          const trade = TRADE_LABELS[tmpl.trade];
          const lib = HAZARD_LIBRARY[tmpl.trade] || [];
          const totalHazards = tmpl.steps.reduce((s, step) => s + (step.hazards || []).length, 0);
          return (
            <div key={tmpl.id} className="jsa-template-card" onClick={() => { setSubTab("create"); }}>
              <div className="mb-sp2 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                <span className="jsa-cat-badge c-amber" style={{ background: "var(--amber-dim)" }}>
                  {lang === "es" ? trade?.labelEs : trade?.label}
                </span>
              </div>
              <div className="fs-secondary fw-semi mb-sp1">{lang === "es" ? tmpl.titleEs : tmpl.title}</div>
              <div className="fs-label c-text3">
                {tmpl.steps.length} {t("steps")} · {totalHazards} {t("hazards")}
              </div>
              <div className="mt-sp2 gap-sp1 flex-wrap" style={{ display: "flex" }}>
                {tmpl.ppe.slice(0, 6).map(k => {
                  const item = PPE_ITEMS.find(p => p.key === k);
                  return item ? <span key={k} className="fs-secondary">{item.icon}</span> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5×5 Risk Matrix Reference */}
      <div className="jsa-section mt-sp6">
        <div className="jsa-section-title">{t("5×5 Risk Matrix Reference")}</div>
        <div className="jsa-matrix">
          <div className="jsa-matrix-corner">{t("L \\ S")}</div>
          {RISK_SEVERITY.map(s => (
            <div key={s.val} className="jsa-matrix-header">{s.val}</div>
          ))}
          {RISK_LIKELIHOOD.map(l => (
            <div key={l.val} style={{ display: "contents" }}>
              <div className="jsa-matrix-label">{l.val}</div>
              {RISK_SEVERITY.map(s => {
                const score = l.val * s.val;
                const rc = riskColor(score);
                return <div key={s.val} className="jsa-matrix-cell" style={{ background: rc.bg + "33", color: rc.bg }}>{score}</div>;
              })}
            </div>
          ))}
        </div>
        <div className="fs-tab mt-sp2 gap-sp4 flex-wrap" style={{ display: "flex" }}>
          {[
            { label: "Low (1-4)", bg: "#10b981" },
            { label: "Medium (5-9)", bg: "#eab308" },
            { label: "High (10-15)", bg: "#f97316" },
            { label: "Critical (16-25)", bg: "#ef4444" },
          ].map(r => (
            <div key={r.label} className="flex gap-sp1">
              <div className="rounded-control" style={{ width: 12, height: 12, background: r.bg }} />
              <span className="c-text2">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="jsa-container">
      <div className="section-header">
        <div>
          <div className="section-title font-head">{t("Job Safety Analysis")}</div>
          <div className="section-sub">{t("OSHA-compliant · Pre-task hazard planning")}</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="cal-sub-tabs">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            className={`cal-sub-tab${subTab === tab.key || (subTab === "detail" && tab.key === "list") ? " active" : ""}`}
            onClick={() => { setSubTab(tab.key); if (tab.key !== "detail") setActiveJsa(null); }}
          >
            {lang === "es" ? tab.labelEs : tab.label}
          </button>
        ))}
      </div>

      {subTab === "list" && renderList()}
      {subTab === "detail" && renderDetail()}
      {subTab === "create" && renderCreate()}
      {subTab === "library" && renderLibrary()}
      {subTab === "templates" && renderTemplates()}
    </div>
  );
}
