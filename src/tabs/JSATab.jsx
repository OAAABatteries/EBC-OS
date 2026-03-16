import { useState, useMemo, useCallback, useEffect } from "react";
import { T } from "../data/translations";
import {
  PPE_ITEMS, RISK_LIKELIHOOD, RISK_SEVERITY, riskColor,
  HAZARD_CATEGORIES, CONTROL_HIERARCHY, PERMIT_TYPES,
  HAZARD_LIBRARY, TRADE_LABELS, JSA_TEMPLATES, WEATHER_HAZARD_MAP,
} from "../data/jsaConstants";

// ═══════════════════════════════════════════════════════════════
//  JSA Module — Job Safety Analysis
//  Better than Procore: structured workflow, hazard library,
//  risk matrix, bilingual, crew sign-on, weather-aware
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
  const [form, setForm] = useState({
    projectId: "", trade: "framing", templateId: "", title: "",
    location: "", supervisor: "", competentPerson: "",
    date: new Date().toISOString().slice(0, 10),
    shift: "day", weather: "clear",
    steps: [], ppe: [], permits: [],
  });
  const updForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── AI auto-fill state ──
  const [aiJsaLoading, setAiJsaLoading] = useState(false);

  const runAiAutoFill = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    if (!form.projectId) { show("Select a project first", "err"); return; }
    setAiJsaLoading(true);
    try {
      const { generateJsa } = await import("../utils/api.js");
      const proj = projects.find(p => String(p.id) === String(form.projectId));
      const res = await generateJsa(app.apiKey, form.trade, proj, form.weather, form.location);
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
    const filtered = (jsas || []).filter(j => tradeFilter === "all" || j.trade === tradeFilter)
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="jsa-list">
        {/* KPIs */}
        <div className="jsa-kpis">
          <div className="jsa-kpi"><div className="jsa-kpi-val" style={{ color: "#10b981" }}>{stats.active}</div><div className="jsa-kpi-lbl">{t("Active")}</div></div>
          <div className="jsa-kpi"><div className="jsa-kpi-val" style={{ color: "#f59e0b" }}>{stats.draft}</div><div className="jsa-kpi-lbl">{t("Draft")}</div></div>
          <div className="jsa-kpi"><div className="jsa-kpi-val" style={{ color: "var(--text3)" }}>{stats.closed}</div><div className="jsa-kpi-lbl">{t("Closed")}</div></div>
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
          <div style={{ color: "var(--text3)", padding: 24, textAlign: "center", fontSize: 13 }}>
            {t("No JSAs found. Create one to get started.")}
          </div>
        )}
        {filtered.map(j => {
          const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
          const rc = riskColor(maxRisk);
          const statusClr = j.status === "active" ? "#10b981" : j.status === "draft" ? "#f59e0b" : "var(--text3)";
          return (
            <div key={j.id} className="jsa-card" onClick={() => { setActiveJsa(j.id); setSubTab("detail"); }} style={{ cursor: "pointer" }}>
              <div className="jsa-card-top">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr }}>{j.status.toUpperCase()}</span>
                    <span className="jsa-risk-badge" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label} Risk</span>
                    {j.trade && <span style={{ fontSize: 11, color: "var(--text3)" }}>{lang === "es" ? TRADE_LABELS[j.trade]?.labelEs : TRADE_LABELS[j.trade]?.label}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>
                    {projName(j.projectId)} · {j.date} · {j.supervisor}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--text3)" }}>
                  <div>{j.steps.length} {t("steps")}</div>
                  <div>{(j.crewSignOn || []).length} {t("signed")}</div>
                </div>
              </div>
              {/* PPE icons */}
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {(j.ppe || []).slice(0, 8).map(k => {
                  const item = PPE_ITEMS.find(p => p.key === k);
                  return item ? <span key={k} title={lang === "es" ? item.labelEs : item.label} style={{ fontSize: 16 }}>{item.icon}</span> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <button className="cal-nav-btn" onClick={() => setSubTab("list")}>{t("← Back")}</button>
          <span className="jsa-status-badge" style={{ background: (jsa.status === "active" ? "#10b981" : jsa.status === "draft" ? "#f59e0b" : "var(--text3)") + "22", color: jsa.status === "active" ? "#10b981" : jsa.status === "draft" ? "#f59e0b" : "var(--text3)" }}>
            {jsa.status.toUpperCase()}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {jsa.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateJsa({ status: "active" })}>{t("Activate")}</button>}
            {jsa.status === "active" && <button className="cal-nav-btn" onClick={() => updateJsa({ status: "closed" })}>{t("Close JSA")}</button>}
            <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => {
              if (confirm("Delete this JSA?")) { setJsas(prev => prev.filter(j => j.id !== jsa.id)); setSubTab("list"); show("JSA deleted"); }
            }}>{t("Delete")}</button>
          </div>
        </div>

        {/* Header info */}
        <div className="jsa-detail-header">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{jsa.title}</h2>
          <div className="jsa-detail-meta">
            <span>{projName(jsa.projectId)}</span>
            <span>{jsa.date}</span>
            <span>{jsa.location}</span>
            <span>{t("Supervisor")}: {jsa.supervisor}</span>
            <span>{lang === "es" ? TRADE_LABELS[jsa.trade]?.labelEs : TRADE_LABELS[jsa.trade]?.label}</span>
          </div>
        </div>

        {/* Risk summary bar */}
        <div className="jsa-risk-summary">
          <div className="jsa-risk-item">
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{t("Highest Risk")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: rc.bg }}>{maxRisk}</div>
            <div style={{ fontSize: 10, color: rc.bg }}>{rc.label}</div>
          </div>
          <div className="jsa-risk-item">
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{t("Avg Risk")}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{avgRisk}</div>
          </div>
          <div className="jsa-risk-item">
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{t("Hazards")}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{allHazards.length}</div>
          </div>
          <div className="jsa-risk-item">
            <div style={{ fontSize: 11, color: "var(--text3)" }}>{t("Crew Signed")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>{(jsa.crewSignOn || []).length}</div>
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
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <span style={{ fontSize: 11 }}>{lang === "es" ? item.labelEs : item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permits Required */}
        {(jsa.permits || []).length > 0 && (
          <div className="jsa-section">
            <div className="jsa-section-title">{t("Permits Required")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                <span className="jsa-step-text">{step.step}</span>
              </div>
              {(step.hazards || []).map((h, hi) => {
                const score = (h.likelihood || 1) * (h.severity || 1);
                const hrc = riskColor(score);
                const cat = HAZARD_CATEGORIES.find(c => c.key === h.category);
                const ctrl = CONTROL_HIERARCHY.find(c => c.key === h.controlType);
                return (
                  <div key={hi} className="jsa-hazard-row">
                    <div className="jsa-hazard-info">
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                        <span className="jsa-cat-badge" style={{ background: cat?.color + "22", color: cat?.color }}>
                          {lang === "es" ? cat?.labelEs : cat?.label}
                        </span>
                        <span className="jsa-risk-score" style={{ background: hrc.bg, color: "#fff" }}>{score}</span>
                        {ctrl && <span style={{ fontSize: 10, color: ctrl.color, fontWeight: 600 }}>{lang === "es" ? ctrl.labelEs : ctrl.label}</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{h.hazard}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>
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
                <div style={{ fontSize: 12, color: "var(--text3)", padding: "8px 0 0 36px" }}>{t("No hazards identified for this step")}</div>
              )}
            </div>
          ))}
        </div>

        {/* Crew Sign-On */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Crew Sign-On")}</div>
          <div className="jsa-crew-list">
            {(jsa.crewSignOn || []).map((c, i) => (
              <div key={i} className="jsa-crew-item">
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: "#10b981" }}>✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
            {jsa.status === "active" && (
              <div style={{ marginTop: 8 }}>
                <select
                  className="form-select"
                  style={{ fontSize: 12, maxWidth: 250 }}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const emp = (employees || []).find(em => em.id === Number(e.target.value));
                    if (!emp) return;
                    if ((jsa.crewSignOn || []).some(c => c.employeeId === emp.id)) { show(t("Already signed on")); return; }
                    updateJsa({
                      crewSignOn: [...(jsa.crewSignOn || []), { employeeId: emp.id, name: emp.name, signedAt: new Date().toISOString() }]
                    });
                    show(t("Crew member signed on"));
                    e.target.value = "";
                  }}
                >
                  <option value="">{t("+ Add crew member...")}</option>
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
              <div style={{ fontSize: 13, fontWeight: 500 }}>{jsa.toolboxTalk.topic}</div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{jsa.toolboxTalk.notes}</div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>{t("No toolbox talk recorded")}</div>
          )}
        </div>

        {/* Near Misses */}
        <div className="jsa-section">
          <div className="jsa-section-title">{t("Near Misses / Close Calls")}</div>
          {(jsa.nearMisses || []).length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>{t("None reported")}</div>
          ) : (
            (jsa.nearMisses || []).map((nm, i) => (
              <div key={i} className="jsa-near-miss">{nm.description} — {nm.reportedBy} ({nm.date})</div>
            ))
          )}
          {jsa.status === "active" && (
            <button className="cal-nav-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => {
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
        trade,
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
        id: "jsa_" + Date.now(),
        ...form,
        projectId: Number(form.projectId),
        status: "draft",
        crewSignOn: [],
        toolboxTalk: { topic: "", notes: "", discussed: false },
        nearMisses: [],
        createdAt: new Date().toISOString(),
        createdBy: "admin",
        audit: [],
      };
      setJsas(prev => [...prev, newJsa]);
      show(t("JSA created"));
      setForm({ projectId: "", trade: "framing", templateId: "", title: "", location: "", supervisor: "", competentPerson: "", date: new Date().toISOString().slice(0, 10), shift: "day", weather: "clear", steps: [], ppe: [], permits: [] });
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
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">{t("Project")}</label>
            <select className="form-select" value={form.projectId} onChange={e => updForm("projectId", e.target.value)}>
              <option value="">{t("Select...")}</option>
              {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t("Trade")}</label>
            <select className="form-select" value={form.trade} onChange={e => updForm("trade", e.target.value)}>
              {Object.entries(TRADE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{lang === "es" ? v.labelEs : v.label}</option>
              ))}
            </select>
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
        </div>

        {/* Weather warning */}
        {weatherHazard && form.weather !== "clear" && (
          <div className="jsa-weather-warn">
            ⚠️ {lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
          </div>
        )}

        {/* PPE Selector */}
        <div className="jsa-section" style={{ marginBottom: 16 }}>
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
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 10 }}>{lang === "es" ? item.labelEs : item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permits */}
        <div className="jsa-section" style={{ marginBottom: 16 }}>
          <div className="jsa-section-title">{t("Permits Required")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  className="form-input"
                  style={{ flex: 1, fontSize: 13 }}
                  value={step.step}
                  onChange={e => updateFormStep(idx, { step: e.target.value })}
                  placeholder={t("Describe this step...")}
                />
                <button className="btn btn-danger btn-sm" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => removeStep(idx)}>X</button>
              </div>

              {/* Hazards for this step */}
              {(step.hazards || []).map((h, hi) => {
                const score = (h.likelihood || 1) * (h.severity || 1);
                const hrc = riskColor(score);
                return (
                  <div key={hi} className="jsa-hazard-row" style={{ background: "var(--bg3)" }}>
                    <div className="jsa-hazard-info" style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="jsa-risk-score" style={{ background: hrc.bg, color: "#fff" }}>{score}</span>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{h.hazard}</span>
                        <button style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 14, marginLeft: "auto" }} onClick={() => removeHazardFromStep(idx, hi)}>✕</button>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                        {(h.controls || []).join(" · ")}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add hazard from library */}
              <div style={{ padding: "4px 0 0 36px" }}>
                <select
                  className="form-select"
                  style={{ fontSize: 11, maxWidth: 350 }}
                  onChange={e => {
                    if (!e.target.value) return;
                    const [trade, hIdx] = e.target.value.split("|");
                    const h = (HAZARD_LIBRARY[trade] || [])[Number(hIdx)];
                    if (h) addHazardToStep(idx, { hazard: lang === "es" ? h.hazardEs : h.hazard, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType });
                    e.target.value = "";
                  }}
                >
                  <option value="">{t("+ Add hazard from library...")}</option>
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
          <button className="cal-nav-btn" style={{ marginTop: 8 }} onClick={addStep}>{t("+ Add Step")}</button>
        </div>

        {/* Save */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn btn-ghost" style={{ color: "var(--amber)", marginRight: "auto" }} onClick={runAiAutoFill} disabled={aiJsaLoading}>
            {aiJsaLoading ? "Generating..." : "⚡ AI Auto-Fill"}
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
        <div className="jsa-trade-filter" style={{ marginBottom: 16 }}>
          {Object.entries(TRADE_LABELS).map(([key, { label, labelEs }]) => (
            <button key={key} className={`cal-nav-btn${libTrade === key ? " active" : ""}`} onClick={() => setLibTrade(key)}>
              {lang === "es" ? labelEs : label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{hazards.length} {t("hazards")}</div>

        {hazards.map((h, i) => {
          const score = h.likelihood * h.severity;
          const rc = riskColor(score);
          const cat = HAZARD_CATEGORIES.find(c => c.key === h.category);
          const ctrl = CONTROL_HIERARCHY.find(c => c.key === h.controlType);
          return (
            <div key={i} className="jsa-hazard-row" style={{ borderLeft: `3px solid ${rc.bg}` }}>
              <div className="jsa-hazard-info" style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span className="jsa-cat-badge" style={{ background: cat?.color + "22", color: cat?.color }}>
                    {lang === "es" ? cat?.labelEs : cat?.label}
                  </span>
                  <span className="jsa-risk-score" style={{ background: rc.bg, color: "#fff" }}>{score}</span>
                  {ctrl && <span style={{ fontSize: 10, color: ctrl.color, fontWeight: 600 }}>{lang === "es" ? ctrl.labelEs : ctrl.label}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{lang === "es" ? h.hazardEs : h.hazard}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
                  {t("Likelihood")}: {h.likelihood}/5 · {t("Severity")}: {h.severity}/5
                </div>
                <div className="jsa-controls-list">
                  {h.controls.map((c, ci) => <div key={ci} className="jsa-control-item">✓ {c}</div>)}
                </div>
                {h.ppe.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    {h.ppe.map(k => {
                      const item = PPE_ITEMS.find(p => p.key === k);
                      return item ? <span key={k} title={lang === "es" ? item.labelEs : item.label} style={{ fontSize: 16 }}>{item.icon}</span> : null;
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
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>
        {t("Select a template to quickly create a JSA with pre-loaded steps, hazards, and controls.")}
      </div>
      <div className="jsa-template-grid">
        {JSA_TEMPLATES.map(tmpl => {
          const trade = TRADE_LABELS[tmpl.trade];
          const lib = HAZARD_LIBRARY[tmpl.trade] || [];
          const totalHazards = tmpl.steps.reduce((s, step) => s + (step.hazards || []).length, 0);
          return (
            <div key={tmpl.id} className="jsa-template-card" onClick={() => { setSubTab("create"); }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                <span className="jsa-cat-badge" style={{ background: "var(--amber-dim)", color: "var(--amber)" }}>
                  {lang === "es" ? trade?.labelEs : trade?.label}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{lang === "es" ? tmpl.titleEs : tmpl.title}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>
                {tmpl.steps.length} {t("steps")} · {totalHazards} {t("hazards")}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                {tmpl.ppe.slice(0, 6).map(k => {
                  const item = PPE_ITEMS.find(p => p.key === k);
                  return item ? <span key={k} style={{ fontSize: 14 }}>{item.icon}</span> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5×5 Risk Matrix Reference */}
      <div className="jsa-section" style={{ marginTop: 24 }}>
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
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", fontSize: 11 }}>
          {[
            { label: "Low (1-4)", bg: "#10b981" },
            { label: "Medium (5-9)", bg: "#eab308" },
            { label: "High (10-15)", bg: "#f97316" },
            { label: "Critical (16-25)", bg: "#ef4444" },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: r.bg }} />
              <span style={{ color: "var(--text2)" }}>{r.label}</span>
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
