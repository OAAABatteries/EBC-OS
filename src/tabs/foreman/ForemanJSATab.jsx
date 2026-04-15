import { useState, useMemo, useRef } from "react";
import { Shield, AlertTriangle, CheckCircle, CheckSquare, Square } from "lucide-react";
import { FieldSignaturePad } from "../../components/field/FieldSignaturePad";
import {
  PPE_ITEMS, RISK_LIKELIHOOD, RISK_SEVERITY, riskColor,
  HAZARD_CATEGORIES, CONTROL_HIERARCHY, PERMIT_TYPES,
  HAZARD_LIBRARY, TRADE_LABELS, JSA_TEMPLATES, WEATHER_HAZARD_MAP,
  TRADE_CARDS, WEATHER_QUICK,
} from "../../data/jsaConstants";

// ═══════════════════════════════════════════════════════════════
//  ForemanJSATab — Job Safety Analysis (extracted from ForemanView)
// ═══════════════════════════════════════════════════════════════

export function ForemanJSATab({
  jsas, setJsas, selectedProjectId, activeForeman,
  employees, teamForProject, projects, myProjects,
  selectedProject, t, lang, show,
}) {
  // ── JSA-specific state ──
  const [jsaView, setJsaView] = useState("list"); // list | detail | create | rollcall
  const [activeJsaId, setActiveJsaId] = useState(null);
  // Auto-populate supervisor with foreman's name
  const foremanName = activeForeman?.name || "";
  const [jsaForm, setJsaForm] = useState({
    projectId: "", trade: "framing", templateId: "", title: "",
    location: "", supervisor: foremanName, competentPerson: foremanName,
    date: new Date().toISOString().slice(0, 10),
    shift: "day", weather: "clear",
    steps: [], ppe: [], permits: [],
  });
  const updJsaForm = (k, v) => setJsaForm(f => ({ ...f, [k]: v }));

  // ── Pre-Task Safety Roll Call state ──
  const [rcStep, setRcStep] = useState("pick"); // pick | hazards | team | sign | supervisor | done
  const [rcJsaId, setRcJsaId] = useState(null);
  const [rcWeather, setRcWeather] = useState("clear");
  const [rcSignIdx, setRcSignIdx] = useState(0);
  const [rcQueue, setRcQueue] = useState([]); // [{employeeId, name}]
  const [rcSelected, setRcSelected] = useState({}); // {employeeId: true/false}
  const [rcAddingCrew, setRcAddingCrew] = useState(false);
  const sigRef = useRef(null);

  // ── Pre-task safety: indoor/outdoor + hazard multi-select ──
  const [rcIndoorOutdoor, setRcIndoorOutdoor] = useState("indoor");
  const [rcPendingCard, setRcPendingCard] = useState(null);
  const [rcSelectedHazardIdxs, setRcSelectedHazardIdxs] = useState({});

  // ── Computed: JSAs for the selected project ──
  const myProjectIds = useMemo(() => new Set((myProjects || []).map(p => p.id)), [myProjects]);
  const myJsas = useMemo(() => (jsas || []).filter(j => myProjectIds.has(j.projectId)), [jsas, myProjectIds]);

  return (
    <div className="emp-content">
      {/* ── JSA LIST VIEW ── */}
      {jsaView === "list" && (
        <div>
          <div className="flex-between frm-mb-12">
            <div className="section-title frm-section-title-md">{t("Job Safety Analysis")}</div>
            <div className="frm-flex-row gap-sp2">
              <button className="btn btn-primary btn-sm" onClick={() => {
                setJsaView("rollcall");
                setRcStep("pick");
                setRcWeather("clear");
                setRcJsaId(null);
              }}>{t("Pre-Task Safety")}</button>
              <button className="cal-nav-btn frm-font-11" onClick={() => {
                setJsaForm(f => ({ ...f, projectId: String(selectedProjectId || ""), supervisor: activeForeman.name, competentPerson: activeForeman.name }));
                setJsaView("create");
              }}>+</button>
            </div>
          </div>

          {myJsas.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8) var(--space-5)" }}>
              <div className="empty-icon"><Shield size={32} /></div>
              <div className="empty-text">{t("No JSAs yet. Create one for today's work.")}</div>
            </div>
          ) : myJsas.sort((a, b) => b.date.localeCompare(a.date)).map(j => {
            const maxRisk = Math.max(0, ...j.steps.flatMap(s => (s.hazards || []).map(h => (h.likelihood || 1) * (h.severity || 1))));
            const rc = riskColor(maxRisk);
            const statusClr = j.status === "active" ? "var(--green)" : j.status === "draft" ? "var(--amber)" : "var(--text3)";
            const proj = projects.find(p => String(p.id) === String(j.projectId));
            return (
              <div key={j.id} className="card frm-p-12 frm-mb-8 cursor-pointer" onClick={() => { setActiveJsaId(j.id); setJsaView("detail"); }}>
                <div className="flex-between frm-mb-4">
                  <div className="frm-flex-row-center gap-sp2 flex-wrap">
                    <span className="jsa-status-badge fs-xs" style={{ background: statusClr + "22", color: statusClr }}>{j.status.toUpperCase()}</span>
                    <span className="jsa-risk-badge fs-xs" style={{ background: rc.bg + "22", color: rc.bg }}>{rc.label}</span>
                  </div>
                  <span className="frm-font-11 c-text3">{(j.teamSignOn || []).length} {t("signed")}</span>
                </div>
                <div className="frm-font-14">{j.title}</div>
                <div className="frm-font-11 c-text3">{proj?.name} · {j.date}</div>
                <div className="frm-flex-row frm-mt-8 gap-sp1">
                  {(j.ppe || []).slice(0, 6).map(k => {
                    const item = PPE_ITEMS.find(p => p.key === k);
                    return item ? <span key={k} className="frm-font-14">{item.icon}</span> : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PRE-TASK SAFETY ROLL CALL ── */}
      {jsaView === "rollcall" && (() => {
        const rcJsa = rcJsaId ? (jsas || []).find(j => j.id === rcJsaId) : null;
        const updateRcJsa = (patch) => setJsas(prev => prev.map(j => j.id === rcJsaId ? { ...j, ...patch } : j));
        const proj = selectedProject;

        // ── STEP 1: PICK THE TASK ──
        if (rcStep === "pick") {
          return (
            <div>
              <div className="frm-flex-row-center frm-mb-16">
                <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("<- Back")}</button>
                <span className="frm-font-16">{t("Pre-Task Safety")}</span>
              </div>

              {!selectedProjectId && (
                <div className="card frm-text-center frm-p-16 frm-amber">
                  {t("Select a project first")}
                </div>
              )}

              {selectedProjectId && (
                <>
                  <div className="frm-font-13 mb-sp1 c-text2">{proj?.name || "Project"}</div>
                  <div className="frm-font-13 frm-mb-16">{t("Pick today's task")}</div>

                  {/* Indoor / Outdoor toggle */}
                  <div className="frm-mb-16">
                    <div className="frm-form-label-upper frm-font-12">{t("Work Environment")}</div>
                    <div className="frm-flex-row">
                      {[{ key: "indoor", label: t("Indoor"), labelEs: "Interior" }, { key: "outdoor", label: t("Outdoor"), labelEs: "Exterior" }].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setRcIndoorOutdoor(opt.key)}
                          style={{
                            flex: 1, padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-control)", fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", cursor: "pointer", border: "2px solid",
                            borderColor: rcIndoorOutdoor === opt.key ? "var(--accent)" : "var(--border)",
                            background: rcIndoorOutdoor === opt.key ? "var(--accent)" : "var(--bg2)",
                            color: rcIndoorOutdoor === opt.key ? "#fff" : "var(--text2)",
                            transition: "background-color 0.15s,border-color 0.15s,color 0.15s,opacity 0.15s",
                          }}
                        >
                          {lang === "es" ? opt.labelEs : opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trade cards - 2 column grid */}
                  <div className="frm-grid-2-10 frm-mb-20">
                    {TRADE_CARDS.map(card => {
                      const tmpl = JSA_TEMPLATES.find(t => t.id === card.templateId);
                      if (!tmpl) return null;
                      const tradeLabel = lang === "es"
                        ? (TRADE_LABELS[card.trade]?.labelEs || card.trade) + (card.suffixEs ? " — " + card.suffixEs : "")
                        : (TRADE_LABELS[card.trade]?.label || card.trade) + (card.suffix ? " — " + card.suffix : "");
                      return (
                        <div key={card.templateId} className="card" style={{
                          padding: "var(--space-4)", cursor: "pointer", borderLeft: `4px solid ${card.color}`,
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)",
                          textAlign: "center", transition: "transform 0.15s",
                        }} onClick={() => {
                          // Go to hazard selection step first
                          const trade = tmpl.trade;
                          const lib = HAZARD_LIBRARY[trade] || [];
                          // Pre-select all hazards by default
                          const sel = {};
                          lib.forEach((_, idx) => { sel[idx] = true; });
                          setRcSelectedHazardIdxs(sel);
                          setRcPendingCard(card);
                          setRcStep("hazards");
                        }}>
                          <span className="fs-title">{card.icon}</span>
                          <span className="fw-semi fs-label" style={{ color: card.color }}>{tradeLabel}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Weather quick-select — only for outdoor jobs */}
                  {rcIndoorOutdoor === "outdoor" && (
                    <div className="mb-8">
                      <div className="fw-semi mb-sp2 fs-label c-text2">{t("Weather")}</div>
                      <div className="frm-flex-wrap gap-sp2">
                        {WEATHER_QUICK.map(w => (
                          <button key={w.key} className={`rcWeather === w.key ? "btn btn-primary btn-sm" : "cal-nav-btn" fs-label`} style={{ padding: "var(--space-2) var(--space-3)" }}
                            onClick={() => setRcWeather(w.key)}>
                            {w.icon} {lang === "es" ? w.labelEs : w.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        }

        // ── STEP 1b: HAZARD MULTI-SELECT ──
        if (rcStep === "hazards" && rcPendingCard) {
          const tmpl = JSA_TEMPLATES.find(t => t.id === rcPendingCard.templateId);
          const trade = tmpl?.trade || rcPendingCard.trade;
          const lib = HAZARD_LIBRARY[trade] || [];
          const selectedCount = Object.values(rcSelectedHazardIdxs).filter(Boolean).length;
          return (
            <div>
              <div className="frm-flex-row-center frm-mb-12">
                <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); setRcPendingCard(null); }}>{t("<- Back")}</button>
                <span className="frm-font-16">{t("Select Hazards")}</span>
              </div>

              <div className="frm-font-13 mb-sp1 c-text2">{proj?.name}</div>
              <div className="frm-font-12 mb-sp4 c-text3">
                {t("Pick as many as apply")} · {TRADE_LABELS[trade]?.label || trade}
              </div>

              <div className="flex-col mb-sp5 gap-sp2">
                {lib.map((h, idx) => {
                  const isChecked = !!rcSelectedHazardIdxs[idx];
                  const catInfo = HAZARD_CATEGORIES.find(c => c.key === h.category);
                  return (
                    <div
                      key={idx}
                      onClick={() => setRcSelectedHazardIdxs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
                        background: isChecked ? "var(--bg2)" : "var(--bg3)",
                        border: `1.5px solid ${isChecked ? (catInfo?.color || "var(--accent)") : "var(--border)"}`,
                        borderRadius: "var(--radius-control)", cursor: "pointer", transition: "background-color 0.15s,border-color 0.15s,color 0.15s,opacity 0.15s",
                      }}
                    >
                      <div style={{ flexShrink: 0, marginTop: "var(--space-1)", color: isChecked ? (catInfo?.color || "var(--accent)") : "var(--text3)" }}>
                        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div className="frm-flex-1">
                        <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: isChecked ? "var(--text)" : "var(--text3)" }}>{h.hazard}</div>
                        {h.hazardEs && <div className="frm-font-11 c-text3" style={{ fontStyle: "italic" }}>{h.hazardEs}</div>}
                        {isChecked && (
                          <div className="frm-mt-4">
                            {h.controls.slice(0, 2).map((c, ci) => (
                              <div key={ci} className="frm-font-11 c-text2">✓ {c}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      {catInfo && (
                        <span className="rounded-control fw-bold fs-xs flex-shrink-0" style={{ padding: "var(--space-1) var(--space-2)", background: catInfo.color + "22", color: catInfo.color }}>
                          {catInfo.label}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Weather hazard — only for outdoor */}
                {rcIndoorOutdoor === "outdoor" && rcWeather !== "clear" && WEATHER_HAZARD_MAP[rcWeather] && (() => {
                  const wh = WEATHER_HAZARD_MAP[rcWeather];
                  const isChecked = !!rcSelectedHazardIdxs["weather"];
                  return (
                    <div
                      onClick={() => setRcSelectedHazardIdxs(prev => ({ ...prev, weather: !prev["weather"] }))}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
                        background: isChecked ? "var(--bg2)" : "var(--bg3)",
                        border: `1.5px solid ${isChecked ? "var(--amber)" : "var(--border)"}`,
                        borderRadius: "var(--radius-control)", cursor: "pointer", transition: "background-color 0.15s,border-color 0.15s,color 0.15s,opacity 0.15s",
                      }}
                    >
                      <div style={{ flexShrink: 0, marginTop: "var(--space-1)", color: isChecked ? "var(--amber)" : "var(--text3)" }}>
                        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div className="frm-flex-1">
                        <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: isChecked ? "var(--text)" : "var(--text3)" }}>{wh.hazard}</div>
                        {wh.hazardEs && <div className="frm-font-11 c-text3" style={{ fontStyle: "italic" }}>{wh.hazardEs}</div>}
                      </div>
                      <span className="rounded-control fw-bold fs-xs c-amber flex-shrink-0" style={{ padding: "var(--space-1) var(--space-2)", background: "#eab30822" }}>
                        Weather
                      </span>
                    </div>
                  );
                })()}
              </div>

              <button
                className="btn btn-primary frm-w-full fs-card p-sp4"
                disabled={selectedCount === 0}
                onClick={() => {
                  if (!tmpl) return;
                  const libHazards = HAZARD_LIBRARY[trade] || [];
                  // Build steps with only selected hazards
                  const steps = tmpl.steps.map((s, i) => ({
                    id: "s_" + Date.now() + "_" + i,
                    step: s.step, stepEs: s.stepEs,
                    hazards: (s.hazards || []).map(hIdx => {
                      if (!rcSelectedHazardIdxs[hIdx]) return null;
                      const h = libHazards[hIdx];
                      if (!h) return null;
                      return { hazard: h.hazard, hazardEs: h.hazardEs, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType, ppe: h.ppe ? [...h.ppe] : [] };
                    }).filter(Boolean),
                  }));
                  // Add weather hazard if outdoor + selected
                  if (rcIndoorOutdoor === "outdoor" && rcWeather !== "clear" && rcSelectedHazardIdxs["weather"]) {
                    const wh = WEATHER_HAZARD_MAP[rcWeather];
                    if (wh) steps.push({ id: "s_weather_" + Date.now(), step: "Weather precautions", stepEs: "Precauciones climaticas",
                      hazards: [{ hazard: wh.hazard, hazardEs: wh.hazardEs, category: wh.category, likelihood: 3, severity: 3, controls: ["Monitor conditions", "Take breaks as needed"], controlType: "administrative", ppe: wh.ppe || [] }],
                    });
                  }
                  const newJsa = {
                    id: crypto.randomUUID(),
                    projectId: selectedProjectId,
                    templateId: rcPendingCard.templateId,
                    trade, title: tmpl.title, titleEs: tmpl.titleEs,
                    location: proj?.address || "",
                    date: new Date().toISOString().slice(0, 10),
                    shift: new Date().getHours() < 14 ? "day" : "night",
                    weather: rcIndoorOutdoor === "outdoor" ? rcWeather : "indoor",
                    indoorOutdoor: rcIndoorOutdoor,
                    supervisor: activeForeman.name,
                    competentPerson: activeForeman.name,
                    status: "draft",
                    steps, ppe: [...tmpl.ppe], permits: [...tmpl.permits],
                    teamSignOn: [], nearMisses: [],
                    toolboxTalk: { topic: "", notes: "", discussed: false },
                    createdAt: new Date().toISOString(),
                    createdBy: activeForeman.name, audit: [],
                  };
                  setJsas(prev => [...prev, newJsa]);
                  setRcJsaId(newJsa.id);
                  const sel = {};
                  teamForProject.forEach(c => { sel[c.id] = true; });
                  setRcSelected(sel);
                  setRcStep("team");
                }}
              >
                {t("Proceed")} ({selectedCount} {t("hazards selected")})
              </button>
            </div>
          );
        }

        // ── STEP 2: CREW ROLL CALL ──
        if (rcStep === "team") {
          const allTeam = [...teamForProject];
          // Include any employees not in teamForProject that were manually added
          const teamIds = new Set(allTeam.map(c => c.id));
          return (
            <div>
              <div className="frm-flex-row-center frm-mb-12">
                <button className="cal-nav-btn" onClick={() => { setRcStep("pick"); }}>{t("<- Back")}</button>
                <span className="frm-font-16">{t("Crew Roll Call")}</span>
              </div>

              <div className="frm-font-13 mb-sp1 c-text2">{proj?.name} · {rcJsa?.title}</div>
              <div className="frm-font-12 mb-sp4 c-text3">
                {new Date().toLocaleDateString(lang === "es" ? "es" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>

              {/* Crew list */}
              {allTeam.length === 0 ? (
                <div className="card frm-text-center frm-p-16 c-text3">
                  {t("No team scheduled. Add team members below.")}
                </div>
              ) : allTeam.map(c => (
                <div key={c.id} className="card" style={{
                  padding: "var(--space-3)", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer",
                  borderLeft: rcSelected[c.id] ? "4px solid #10b981" : "4px solid var(--border)",
                  opacity: rcSelected[c.id] ? 1 : 0.5,
                }} onClick={() => setRcSelected(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                  <span className="justify-center" style={{ width: 28, display: "flex" }}>{rcSelected[c.id] ? <CheckCircle size={20} className="c-green" /> : <Square size={20} className="c-text3" />}</span>
                  <div>
                    <div className="frm-font-14">{c.name}</div>
                    <div className="frm-font-11 c-text3">{c.role || "Crew"}</div>
                  </div>
                </div>
              ))}

              {/* Add team */}
              {rcAddingCrew ? (
                <select className="form-select fs-label mt-sp2" autoFocus
                  onChange={e => {
                    if (!e.target.value) return;
                    const emp = employees.find(em => em.id === Number(e.target.value));
                    if (!emp || teamIds.has(emp.id)) return;
                    teamForProject.push({ id: emp.id, name: emp.name, role: emp.role || "Crew" });
                    setRcSelected(prev => ({ ...prev, [emp.id]: true }));
                    setRcAddingCrew(false);
                  }} onBlur={() => setRcAddingCrew(false)}>
                  <option value="">{t("Select employee...")}</option>
                  {(employees || []).filter(e => !teamIds.has(e.id) && e.active !== false).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              ) : (
                <button className="cal-nav-btn fs-label mt-sp2" onClick={() => setRcAddingCrew(true)}>
                  + {t("Add Crew")}
                </button>
              )}

              {/* Start Sign-On */}
              <button className="btn btn-primary frm-w-full fs-card mt-sp5 p-sp4"
                disabled={Object.values(rcSelected).filter(Boolean).length === 0}
                onClick={() => {
                  const queue = teamForProject.filter(c => rcSelected[c.id]).map(c => ({ employeeId: c.id, name: c.name }));
                  setRcQueue(queue);
                  setRcSignIdx(0);
                  setRcStep("sign");
                }}>
                {t("Start Sign-On")} ({Object.values(rcSelected).filter(Boolean).length})
              </button>
            </div>
          );
        }

        // ── STEP 3: PASS & SIGN ──
        if (rcStep === "sign" && rcQueue.length > 0) {
          const current = rcQueue[rcSignIdx];
          const allHazards = (rcJsa?.steps || []).flatMap(s => s.hazards || []);
          const progress = rcSignIdx + 1;
          const total = rcQueue.length;
          return (
            <div>
              {/* Progress */}
              <div className="frm-mb-12">
                <div className="mb-sp1 fs-label c-text3" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{progress} {t("of")} {total}</span>
                  <span>{t("Pass device to next person")}</span>
                </div>
                <div className="rounded-control overflow-hidden" style={{ height: 4, background: "var(--border)" }}>
                  <div style={{ height: "100%", width: `${(progress / total) * 100}%`, background: "var(--green)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
                </div>
              </div>

              {/* Name banner */}
              <div className="frm-text-center mb-sp3" style={{ padding: "var(--space-4) 0" }}>
                <div className="fw-bold fs-title">{current.name}</div>
                <div className="frm-font-13 c-text3">{proj?.name}</div>
              </div>

              {/* Hazard cards */}
              <div className="frm-mb-16">
                <div className="frm-jsa-label fs-label">{t("Hazards")}</div>
                {allHazards.map((h, i) => {
                  const score = (h.likelihood || 1) * (h.severity || 1);
                  const hrc = riskColor(score);
                  const catInfo = HAZARD_CATEGORIES[h.category];
                  return (
                    <div key={i} className="card" style={{ padding: "var(--space-3)", marginBottom: "var(--space-2)", borderLeft: `3px solid ${catInfo?.color || "var(--amber)"}` }}>
                      <div className="frm-flex-row-center frm-mb-4 gap-sp2">
                        <span className="rounded-control fw-bold fs-xs c-white" style={{ background: hrc.bg, padding: "var(--space-1) var(--space-2)" }}>{score}</span>
                        <span className="fw-semi fs-label">{h.hazard}</span>
                      </div>
                      {h.hazardEs && <div className="frm-font-11 frm-mb-4 c-text3" style={{ fontStyle: "italic" }}>{h.hazardEs}</div>}
                      <div className="frm-font-11 c-text2">
                        {(h.controls || []).map((c, ci) => <div key={ci}>✓ {c}</div>)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PPE */}
              <div className="frm-mb-16">
                <div className="fw-semi mb-sp2 fs-label c-amber">{t("Required PPE")}</div>
                <div className="frm-flex-wrap gap-sp3">
                  {(rcJsa?.ppe || []).map(k => {
                    const item = PPE_ITEMS.find(p => p.key === k);
                    return item ? (
                      <div key={k} className="frm-text-center">
                        <div className="fs-subtitle">{item.icon}</div>
                        <div className="frm-font-10 c-text2">{item.label}</div>
                        <div className="fs-xs c-text3">{item.labelEs}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Signature pad */}
              <div className="frm-mb-12">
                <FieldSignaturePad
                  key={rcSignIdx}
                  label={t("Sign below")}
                  t={t}
                  onSave={(ref) => { sigRef.current = ref; }}
                />
              </div>

              {/* Sign & Next button */}
              <button className="btn btn-primary frm-w-full fs-card p-sp4"
                onClick={() => {
                  const sigData = sigRef.current?.getSig?.();
                  if (!sigData) { show(t("Please sign first"), "err"); return; }
                  // Add signature to JSA
                  updateRcJsa({
                    teamSignOn: [...(rcJsa?.teamSignOn || []), {
                      employeeId: current.employeeId,
                      name: current.name,
                      signedAt: new Date().toISOString(),
                      signature: sigData,
                    }],
                  });
                  if (rcSignIdx < rcQueue.length - 1) {
                    setRcSignIdx(rcSignIdx + 1);
                    sigRef.current = null;
                  } else {
                    // All team signed — move to supervisor sign-off
                    setRcStep("supervisor");
                    sigRef.current = null;
                  }
                }}>
                {rcSignIdx < rcQueue.length - 1 ? t("Sign & Next") : t("Sign & Finish")}
              </button>
            </div>
          );
        }

        // ── STEP 3b: SUPERVISOR SIGN-OFF ──
        if (rcStep === "supervisor") {
          return (
            <div>
              <div className="frm-text-center mb-sp4" style={{ padding: "var(--space-6) 0" }}>
                <div className="frm-font-16 frm-amber">{t("Supervisor Sign-Off")}</div>
                <div className="fw-bold fs-title mt-sp2">{activeForeman.name}</div>
                <div className="frm-font-13 frm-mt-4 c-text3">
                  {(rcJsa?.teamSignOn || []).length} {t("team members signed")}
                </div>
              </div>

              <FieldSignaturePad
                key="supervisor"
                label={t("Supervisor signature")}
                t={t}
                onSave={(ref) => { sigRef.current = ref; }}
              />

              <button className="btn btn-primary frm-w-full frm-mt-16 fs-card p-sp4"
                onClick={() => {
                  const sigData = sigRef.current?.getSig?.();
                  if (!sigData) { show(t("Please sign first"), "err"); return; }
                  updateRcJsa({ supervisorSignature: sigData, status: "active" });
                  setRcStep("done");
                  show(t("Pre-Task Safety Complete"), "ok");
                }}>
                {t("Activate JSA")}
              </button>
            </div>
          );
        }

        // ── STEP 4: CONFIRMATION ──
        if (rcStep === "done") {
          const finalJsa = (jsas || []).find(j => j.id === rcJsaId);
          return (
            <div className="frm-text-center">
              <div className="frm-mb-8 justify-center" style={{ display: "flex" }}><CheckCircle size={48} className="c-green" /></div>
              <div className="frm-font-20 frm-mb-4">{t("Pre-Task Safety Complete")}</div>
              <div className="frm-font-14 frm-mb-20 c-text2">
                {(finalJsa?.teamSignOn || []).length} {t("team members signed")} · {finalJsa?.title}
              </div>

              {/* Signed team list */}
              <div className="frm-mb-20">
                {(finalJsa?.teamSignOn || []).map((c, i) => (
                  <div key={i} className="flex-between frm-rfi-row" style={{ fontSize: "inherit" }}>
                    <span className="frm-font-13 fw-medium">{c.name}</span>
                    <span className="frm-font-11 c-green">✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>

              <div className="frm-flex-row">
                <button className="cal-nav-btn p-sp3 flex-1" onClick={async () => {
                  try {
                    const { generateJsaPdf } = await import("../../utils/jsaPdf");
                    const p = projects.find(pr => pr.id === finalJsa?.projectId);
                    await generateJsaPdf({ ...finalJsa, projectName: p?.name || "Project" });
                    show(t("PDF exported"), "ok");
                  } catch (e) { show("PDF error: " + e.message, "err"); }
                }}>{t("Export PDF")}</button>
                <button className="btn btn-primary p-sp3 flex-1" onClick={() => {
                  setJsaView("list");
                  setRcJsaId(null);
                  setRcStep("pick");
                }}>{t("Done")}</button>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* ── JSA DETAIL VIEW ── */}
      {jsaView === "detail" && (() => {
        const jsa = (jsas || []).find(j => j.id === activeJsaId);
        if (!jsa) { setJsaView("list"); return null; }
        const updateJsa = (patch) => setJsas(prev => prev.map(j => j.id === jsa.id ? { ...j, ...patch } : j));
        const allHazards = jsa.steps.flatMap(s => s.hazards || []);
        const maxRisk = Math.max(0, ...allHazards.map(h => (h.likelihood || 1) * (h.severity || 1)));
        const rc = riskColor(maxRisk);
        const statusClr = jsa.status === "active" ? "var(--green)" : jsa.status === "draft" ? "var(--amber)" : "var(--text3)";
        return (
          <div>
            <div className="mb-sp3 gap-sp2 flex-wrap" style={{ display: "flex", alignItems: "center" }}>
              <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("<- Back")}</button>
              <span className="jsa-status-badge" style={{ background: statusClr + "22", color: statusClr }}>{jsa.status.toUpperCase()}</span>
              <div className="frm-flex-row gap-sp2 ml-auto">
                {jsa.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateJsa({ status: "active" })}>{t("Activate")}</button>}
                {jsa.status === "active" && <button className="cal-nav-btn" onClick={() => updateJsa({ status: "closed" })}>{t("Close JSA")}</button>}
              </div>
            </div>

            <h3 className="frm-font-16 frm-mb-4">{jsa.title}</h3>
            <div className="frm-font-12 frm-mb-12 c-text3">
              {jsa.date} · {jsa.location} · {lang === "es" ? TRADE_LABELS[jsa.trade]?.labelEs : TRADE_LABELS[jsa.trade]?.label}
            </div>

            {/* Risk summary */}
            <div className="frm-grid-3 frm-mb-16">
              <div className="card frm-text-center frm-p-12">
                <div className="fs-subtitle fw-bold" style={{ color: rc.bg }}>{maxRisk}</div>
                <div className="frm-font-10 c-text3">{t("Highest Risk")}</div>
              </div>
              <div className="card frm-text-center frm-p-12">
                <div className="frm-font-20">{allHazards.length}</div>
                <div className="frm-font-10 c-text3">{t("Hazards")}</div>
              </div>
              <div className="card frm-text-center frm-p-12">
                <div className="frm-activity-value c-green">{(jsa.teamSignOn || []).length}</div>
                <div className="frm-font-10 c-text3">{t("Crew Signed")}</div>
              </div>
            </div>

            {/* PPE */}
            <div className="frm-mb-16">
              <div className="frm-jsa-label">{t("Required PPE")}</div>
              <div className="frm-flex-wrap gap-sp2">
                {(jsa.ppe || []).map(k => {
                  const item = PPE_ITEMS.find(p => p.key === k);
                  return item ? (
                    <div key={k} className="fs-tab text-center">
                      <div className="frm-font-20">{item.icon}</div>
                      <div className="c-text3">{lang === "es" ? item.labelEs : item.label}</div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Steps & Hazards */}
            <div className="frm-mb-16">
              <div className="frm-jsa-label">{t("Job Steps & Hazards")}</div>
              {(jsa.steps || []).map((step, idx) => (
                <div key={step.id} className="card mb-sp2 p-sp3">
                  <div className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                    <span className="flex fw-bold fs-tab justify-center flex-shrink-0" style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--amber)", color: "var(--bg)" }}>{idx + 1}</span>
                    <span className="frm-font-13">{step.step}</span>
                  </div>
                  {(step.hazards || []).map((h, hi) => {
                    const score = (h.likelihood || 1) * (h.severity || 1);
                    const hrc = riskColor(score);
                    return (
                      <div key={hi} style={{ marginLeft: "var(--space-8)", padding: "var(--space-2) 0", borderTop: "1px solid var(--border)" }}>
                        <div className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                          <span className="jsa-risk-score rounded-control fs-xs c-white" style={{ background: hrc.bg, padding: "var(--space-1) var(--space-2)" }}>{score}</span>
                          <span className="frm-font-12">{h.hazard}</span>
                        </div>
                        <div className="frm-font-11 c-text3">
                          {(h.controls || []).map((c, ci) => <span key={ci}>✓ {c}{ci < h.controls.length - 1 ? " · " : ""}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Crew Sign-On */}
            <div className="frm-mb-16">
              <div className="frm-jsa-label">{t("Crew Sign-On")} ({(jsa.teamSignOn || []).length})</div>
              {(jsa.teamSignOn || []).map((c, i) => (
                <div key={i} className="flex-between frm-rfi-row" style={{ padding: "var(--space-2) 0" }}>
                  <span className="frm-font-13 fw-medium">{c.name}</span>
                  <span className="frm-font-11 c-green">✓ {new Date(c.signedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
              {jsa.status === "active" && (
                <select className="form-select fs-label mt-sp2"
                  onChange={e => {
                    if (!e.target.value) return;
                    const emp = (employees || []).find(em => em.id === Number(e.target.value));
                    if (!emp) return;
                    if ((jsa.teamSignOn || []).some(c => c.employeeId === emp.id)) { show(t("Already signed on")); return; }
                    updateJsa({ teamSignOn: [...(jsa.teamSignOn || []), { employeeId: emp.id, name: emp.name, signedAt: new Date().toISOString() }] });
                    show(t("Crew member signed on"));
                    e.target.value = "";
                  }}>
                  <option value="">{t("+ Add team member...")}</option>
                  {teamForProject.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              )}
            </div>

            {/* Near Misses */}
            <div>
              <div className="frm-jsa-label">{t("Near Misses")}</div>
              {(jsa.nearMisses || []).length === 0 ? (
                <div className="frm-font-12 c-text3">{t("None reported")}</div>
              ) : (jsa.nearMisses || []).map((nm, i) => (
                <div key={i} className="card mb-sp1 fs-label p-sp2">
                  {nm.description} — {nm.reportedBy} ({nm.date})
                </div>
              ))}
              {jsa.status === "active" && (
                <button className="cal-nav-btn fs-tab mt-sp2" onClick={() => {
                  const desc = prompt(lang === "es" ? "Describe el casi-accidente:" : "Describe the near miss:");
                  if (!desc) return;
                  updateJsa({ nearMisses: [...(jsa.nearMisses || []), { description: desc, reportedBy: activeForeman.name, date: new Date().toISOString().slice(0, 10) }] });
                  show(t("Near miss recorded"));
                }}>{t("+ Report Near Miss")}</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── JSA CREATE VIEW ── */}
      {jsaView === "create" && (() => {
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
          setJsaForm(f => ({ ...f, templateId: tmplId, trade, title: lang === "es" ? tmpl.titleEs : tmpl.title, steps, ppe: [...tmpl.ppe], permits: [...tmpl.permits] }));
        };

        const saveJsa = () => {
          if (!jsaForm.projectId) { show(t("Select a project"), "err"); return; }
          if (!jsaForm.title) { show(t("Title required"), "err"); return; }
          if (jsaForm.steps.length === 0) { show(t("Add at least one step"), "err"); return; }
          const newJsa = {
            id: crypto.randomUUID(),
            ...jsaForm,
            projectId: Number(jsaForm.projectId),
            status: "draft",
            teamSignOn: [],
            toolboxTalk: { topic: "", notes: "", discussed: false },
            nearMisses: [],
            createdAt: new Date().toISOString(),
            createdBy: activeForeman.name,
            audit: [],
          };
          setJsas(prev => [...prev, newJsa]);
          show(t("JSA created"));
          setJsaForm({ projectId: "", trade: "framing", templateId: "", title: "", location: "", supervisor: activeForeman.name, competentPerson: activeForeman.name, date: new Date().toISOString().slice(0, 10), shift: "day", weather: "clear", steps: [], ppe: [], permits: [] });
          setActiveJsaId(newJsa.id);
          setJsaView("detail");
        };

        const weatherHazard = WEATHER_HAZARD_MAP[jsaForm.weather];

        return (
          <div>
            <div className="frm-flex-row-center frm-mb-12">
              <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("<- Back")}</button>
              <span className="frm-font-16">{t("Create New JSA")}</span>
            </div>

            {/* Template */}
            <div className="form-group frm-mb-12">
              <label className="form-label">{t("Start from Template")}</label>
              <select className="form-select" value={jsaForm.templateId} onChange={e => applyTemplate(e.target.value)}>
                <option value="">{t("— Blank JSA —")}</option>
                {JSA_TEMPLATES.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{lang === "es" ? tmpl.titleEs : tmpl.title}</option>)}
              </select>
            </div>

            {/* Basic fields */}
            <div className="form-group mb-8">
              <label className="form-label">{t("Project")}</label>
              <select className="form-select" value={jsaForm.projectId} onChange={e => updJsaForm("projectId", e.target.value)}>
                <option value="">{t("Select...")}</option>
                {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group mb-8">
              <label className="form-label">{t("Trade")}</label>
              <select className="form-select" value={jsaForm.trade} onChange={e => updJsaForm("trade", e.target.value)}>
                {Object.entries(TRADE_LABELS).map(([k, v]) => <option key={k} value={k}>{lang === "es" ? v.labelEs : v.label}</option>)}
              </select>
            </div>
            <div className="form-group mb-8">
              <label className="form-label">{t("JSA Title")}</label>
              <input className="form-input" value={jsaForm.title} onChange={e => updJsaForm("title", e.target.value)} placeholder={t("e.g. Metal Stud Framing — Level 2")} />
            </div>
            <div className="form-group mb-8">
              <label className="form-label">{t("Location on Site")}</label>
              <input className="form-input" value={jsaForm.location} onChange={e => updJsaForm("location", e.target.value)} />
            </div>
            <div className="form-group mb-8">
              <label className="form-label">{t("Date")}</label>
              <input className="form-input" type="date" value={jsaForm.date} onChange={e => updJsaForm("date", e.target.value)} />
            </div>
            <div className="form-group mb-8">
              <label className="form-label">{t("Weather")}</label>
              <select className="form-select" value={jsaForm.weather} onChange={e => updJsaForm("weather", e.target.value)}>
                <option value="clear">{t("Clear")}</option>
                <option value="rain">{t("Rain")}</option>
                <option value="thunderstorm">{t("Thunderstorm")}</option>
                <option value="heat">{t("Heat Advisory")}</option>
                <option value="freeze">{t("Freeze/Cold")}</option>
                <option value="wind">{t("High Wind")}</option>
              </select>
            </div>

            {weatherHazard && jsaForm.weather !== "clear" && (
              <div className="jsa-weather-warn frm-mb-12">
                <AlertTriangle size={14} className="mr-sp1" style={{ display: "inline", verticalAlign: "middle" }} />{lang === "es" ? weatherHazard.hazardEs : weatherHazard.hazard}
              </div>
            )}

            {/* PPE */}
            <div className="frm-mb-12">
              <div className="frm-jsa-label">{t("Required PPE")}</div>
              <div className="frm-flex-wrap gap-sp2">
                {PPE_ITEMS.map(item => {
                  const active = jsaForm.ppe.includes(item.key);
                  return (
                    <div key={item.key} className={`jsa-ppe-pick${active ? " active" : ""}`}
                      onClick={() => updJsaForm("ppe", active ? jsaForm.ppe.filter(k => k !== item.key) : [...jsaForm.ppe, item.key])}
                      className="frm-text-center cursor-pointer" style={{ padding: "var(--space-1) var(--space-2)" }}>
                      <div className="fs-section">{item.icon}</div>
                      <div className="fs-xs">{lang === "es" ? item.labelEs : item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permits */}
            <div className="frm-mb-12">
              <div className="frm-jsa-label">{t("Permits Required")}</div>
              <div className="frm-flex-wrap gap-sp2">
                {PERMIT_TYPES.map(p => {
                  const active = jsaForm.permits.includes(p.key);
                  return (
                    <button key={p.key} className={`cal-nav-btn${active ? " active" : ""}`}
                      style={active ? { background: "var(--amber)", color: "var(--bg)", borderColor: "var(--amber)", fontSize: "var(--text-tab)" } : { fontSize: "var(--text-tab)" }}
                      onClick={() => updJsaForm("permits", active ? jsaForm.permits.filter(k => k !== p.key) : [...jsaForm.permits, p.key])}>
                      {lang === "es" ? p.labelEs : p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Steps */}
            <div className="frm-mb-16">
              <div className="frm-jsa-label">{t("Job Steps & Hazards")}</div>
              {jsaForm.steps.map((step, idx) => (
                <div key={step.id} className="card mb-sp2 p-sp3">
                  <div className="frm-flex-row-center frm-mb-6 gap-sp2">
                    <span className="flex fw-bold fs-xs justify-center flex-shrink-0" style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--amber)", color: "var(--bg)" }}>{idx + 1}</span>
                    <input className="form-input frm-flex-1 frm-font-12" value={step.step}
                      onChange={e => updJsaForm("steps", jsaForm.steps.map((s, i) => i === idx ? { ...s, step: e.target.value } : s))}
                      placeholder={t("Describe this step...")} />
                    <button className="frm-btn-unstyled--red"
                      onClick={() => updJsaForm("steps", jsaForm.steps.filter((_, i) => i !== idx))}>✕</button>
                  </div>
                  {(step.hazards || []).map((h, hi) => {
                    const score = (h.likelihood || 1) * (h.severity || 1);
                    const hrc = riskColor(score);
                    return (
                      <div key={hi} className="gap-sp2" style={{ marginLeft: 26, padding: "var(--space-1) 0", display: "flex", alignItems: "center", borderTop: "1px solid var(--border)" }}>
                        <span className="jsa-risk-score rounded-control fs-xs c-white" style={{ background: hrc.bg, padding: "var(--space-1) var(--space-1)" }}>{score}</span>
                        <span className="frm-font-11 frm-flex-1">{h.hazard}</span>
                        <button className="frm-btn-unstyled--red"
                          onClick={() => {
                            const steps = [...jsaForm.steps];
                            steps[idx] = { ...steps[idx], hazards: steps[idx].hazards.filter((_, i) => i !== hi) };
                            updJsaForm("steps", steps);
                          }}>✕</button>
                      </div>
                    );
                  })}
                  <select className="form-select fs-tab mt-sp1" style={{ marginLeft: 26 }}
                    onChange={e => {
                      if (!e.target.value) return;
                      const [trade, hIdx] = e.target.value.split("|");
                      const h = (HAZARD_LIBRARY[trade] || [])[Number(hIdx)];
                      if (!h) return;
                      const steps = [...jsaForm.steps];
                      steps[idx] = { ...steps[idx], hazards: [...(steps[idx].hazards || []), { hazard: lang === "es" ? h.hazardEs : h.hazard, category: h.category, likelihood: h.likelihood, severity: h.severity, controls: [...h.controls], controlType: h.controlType }] };
                      updJsaForm("steps", steps);
                      e.target.value = "";
                    }}>
                    <option value="">{t("+ Add hazard...")}</option>
                    {Object.entries(HAZARD_LIBRARY).map(([trade, hazards]) => (
                      <optgroup key={trade} label={lang === "es" ? TRADE_LABELS[trade]?.labelEs : TRADE_LABELS[trade]?.label}>
                        {hazards.map((h, i) => <option key={i} value={`${trade}|${i}`}>{lang === "es" ? h.hazardEs : h.hazard}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ))}
              <button className="cal-nav-btn frm-font-12"
                onClick={() => updJsaForm("steps", [...jsaForm.steps, { id: "s_" + Date.now(), step: "", hazards: [] }])}>
                {t("+ Add Step")}
              </button>
            </div>

            <div className="frm-flex-row" style={{ justifyContent: "flex-end" }}>
              <button className="cal-nav-btn" onClick={() => setJsaView("list")}>{t("Cancel")}</button>
              <button className="btn btn-primary" onClick={saveJsa}>{t("Create JSA")}</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
