import { useState, Fragment } from "react";
import { SubTabs } from "./moreShared";
import { OSHA_CHECKLIST } from "../../data/constants";
import { CheckCircle, AlertTriangle, AlertOctagon, ClipboardList } from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   SAFETY
   ══════════════════════════════════════════════════════════════ */
export function Safety({ app }) {
  const [sub, setSub] = useState("Incidents");
  return (
    <div>
      <SubTabs tabs={["Incidents", "Toolbox Talks", "Daily Reports", "OSHA Checklist", "Certifications"]} active={sub} onChange={setSub} />
      {sub === "Incidents" && <IncidentsTab app={app} />}
      {sub === "Toolbox Talks" && <ToolboxTalksTab app={app} />}
      {sub === "Daily Reports" && <DailyReportsTab app={app} />}
      {sub === "OSHA Checklist" && <OshaChecklistTab app={app} key="osha" />}
      {sub === "Certifications" && <CertificationsTab app={app} />}
    </div>
  );
}

/* ── Incidents ───────────────────────────────────────────────── */
export function IncidentsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", date: "", type: "near-miss", desc: "", corrective: "", reportedBy: "", photos: [] });
  const [rcaId, setRcaId] = useState(null);
  const [rcaResult, setRcaResult] = useState(null);
  const [rcaLoading, setRcaLoading] = useState(false);

  const runRCA = async (inc) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setRcaId(inc.id);
    setRcaLoading(true);
    setRcaResult(null);
    try {
      const { analyzeIncidentRootCause } = await import("../../utils/api.js");
      const project = app.projects.find(p => p.id === inc.projectId);
      const result = await analyzeIncidentRootCause(app.apiKey, inc, project, app.incidents);
      setRcaResult(result);
      app.show("Root cause analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setRcaLoading(false);
    }
  };

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const badge = (t) => t === "near-miss" ? "badge-amber" : t === "first-aid" ? "badge-blue" : "badge-red";

  // KPIs
  const total = app.incidents.length;
  const nearMisses = app.incidents.filter(i => i.type === "near-miss").length;
  const lastIncident = app.incidents.length > 0
    ? app.incidents.map(i => new Date(i.date)).sort((a, b) => b - a)[0]
    : null;
  const daysSinceLast = lastIncident ? Math.floor((new Date() - lastIncident) / 86400000) : "N/A";

  const save = () => {
    if (!form.desc) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      date: form.date,
      type: form.type,
      desc: form.desc,
      corrective: form.corrective,
      reportedBy: form.reportedBy,
      photos: form.photos || [],
    };
    app.setIncidents(prev => [...prev, newItem]);
    app.show("Incident reported", "ok");
    setAdding(false);
    setForm({ projectId: "", date: "", type: "near-miss", desc: "", corrective: "", reportedBy: "", photos: [] });
  };

  return (
    <div>
      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Days Since Last</span><strong>{daysSinceLast}</strong></div>
        <div className="kpi-card"><span className="text2">Total Incidents</span><strong>{total}</strong></div>
        <div className="kpi-card"><span className="text2">Near Misses</span><strong>{nearMisses}</strong></div>
      </div>
      <div className="flex-between mt-16">
        <div className="section-title">Incidents</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Incident</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="near-miss">Near Miss</option>
                <option value="first-aid">First Aid</option>
                <option value="recordable">Recordable</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reported By</label>
              <input className="form-input" value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Corrective Action</label>
            <textarea className="form-textarea" value={form.corrective} onChange={e => setForm({ ...form, corrective: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Photos / Evidence</label>
            <input className="form-input" type="file" accept="image/*" capture="environment" multiple onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(f => {
                const reader = new FileReader();
                reader.onload = () => setForm(prev => ({ ...prev, photos: [...(prev.photos || []), { name: f.name, data: reader.result }] }));
                reader.readAsDataURL(f);
              });
            }} />
            {(form.photos || []).length > 0 && (
              <div className="flex gap-4 mt-6">
                {form.photos.map((p, i) => (
                  <div key={i} className="pos-relative">
                    <img src={p.data} alt={p.name} className="rounded-control" style={{ width: 50, height: 50, objectFit: "cover" }} />
                    <button className="more-photo-remove"
                      onClick={() => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Project</th><th>Type</th><th>Description</th><th>Corrective Action</th><th>Reported By</th><th></th></tr></thead>
          <tbody>
            {app.incidents.length === 0 && <tr><td colSpan={7} className="more-text-center">No incidents</td></tr>}
            {app.incidents.map(inc => (
              <Fragment key={inc.id}>
                <tr>
                  <td>{inc.date}</td>
                  <td>{pName(inc.projectId)}</td>
                  <td><span className={badge(inc.type)}>{inc.type}</span></td>
                  <td>{inc.desc}</td>
                  <td>{inc.corrective}</td>
                  <td>{inc.reportedBy}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-table-action"
                      onClick={() => rcaId === inc.id && rcaResult ? setRcaId(null) : runRCA(inc)}
                      disabled={rcaLoading && rcaId === inc.id}>
                      {rcaLoading && rcaId === inc.id ? "..." : rcaId === inc.id && rcaResult ? "Hide" : "RCA"}
                    </button>
                  </td>
                </tr>
                {rcaId === inc.id && rcaResult && (
                  <tr><td colSpan={7} className="more-expand-cell">
                    <div className="more-detail-panel">
                      {/* Summary + Risk */}
                      <div className="flex-between mb-12">
                        <div className="text-sm">{rcaResult.summary}</div>
                        <span className={rcaResult.riskLevel === "critical" || rcaResult.riskLevel === "high" ? "badge-red" : rcaResult.riskLevel === "medium" ? "badge-amber" : "badge-green"}>{rcaResult.riskLevel} risk</span>
                      </div>

                      {/* Root Cause */}
                      <div className="more-info-card--red">
                        <span className="font-semi">Root Cause: </span>{rcaResult.rootCause}
                      </div>

                      {/* Contributing Factors */}
                      {rcaResult.contributingFactors?.length > 0 && (
                        <div className="mb-12">
                          <div className="text-sm font-semi mb-4">Contributing Factors</div>
                          {rcaResult.contributingFactors.map((f, i) => (
                            <div key={i} className="rounded-control mb-sp1 fs-label" style={{ padding: "var(--space-1) var(--space-3)", background: "var(--card)", borderLeft: "3px solid var(--amber)" }}>
                              <span className="font-semi">{f.factor}</span>
                              <span className="badge-muted ml-sp2 fs-xs">{f.category}</span>
                              <div className="text-xs text-muted mt-2">{f.detail}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Corrective Actions */}
                      {rcaResult.correctiveActions?.length > 0 && (
                        <div className="mb-12">
                          <div className="text-sm font-semi mb-4">Corrective Actions</div>
                          {rcaResult.correctiveActions.map((a, i) => (
                            <div key={i} className="more-list-row">
                              <div className="flex-between">
                                <span>{a.action}</span>
                                <span className={a.type === "immediate" ? "badge-red" : a.type === "short_term" ? "badge-amber" : "badge-blue"}>{a.type}</span>
                              </div>
                              <div className="text-xs text-muted mt-2">Owner: {a.responsible} • By: {a.deadline}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* OSHA + Pattern */}
                      {rcaResult.oshaRelevance && (
                        <div className="rounded-control mb-sp2 fs-label p-sp2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                          <span className="font-semi">OSHA: </span>{rcaResult.oshaRelevance}
                        </div>
                      )}
                      {rcaResult.patternAlert && (
                        <div className="more-info-card--amber">
                          <span className="font-semi">Pattern Alert: </span>{rcaResult.patternAlert}
                        </div>
                      )}
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Toolbox Talks ───────────────────────────────────────────── */
export function ToolboxTalksTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", date: "", topic: "", attendees: "", conductor: "", notes: "" });
  const [editId, setEditId] = useState(null);
  const [genTopic, setGenTopic] = useState("");
  const [genResult, setGenResult] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [showGen, setShowGen] = useState(false);

  const runGenerate = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    if (!genTopic.trim()) { app.show("Enter a topic first", "err"); return; }
    setGenLoading(true);
    setGenResult(null);
    try {
      const { generateToolboxTalk } = await import("../../utils/api.js");
      const projectData = app.projects.map(p => ({ name: p.name || p.project, phase: p.phase, scope: p.scope, progress: p.progress }));
      const recentIncidents = (app.incidents || []).slice(-5).map(i => ({ date: i.date, type: i.type, desc: i.desc, corrective: i.corrective }));
      const result = await generateToolboxTalk(app.apiKey, genTopic, projectData, recentIncidents);
      setGenResult(result);
      app.show("Toolbox talk generated", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setGenLoading(false);
    }
  };

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";

  const save = () => {
    if (!form.topic) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      date: form.date,
      topic: form.topic,
      attendees: Number(form.attendees) || 0,
      conductor: form.conductor,
      notes: form.notes,
    };
    app.setToolboxTalks(prev => [...prev, newItem]);
    app.show("Toolbox talk added", "ok");
    setAdding(false);
    setForm({ projectId: "", date: "", topic: "", attendees: "", conductor: "", notes: "" });
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Toolbox Talks</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowGen(!showGen)}>
            {showGen ? "Hide Generator" : "AI Generate"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Talk</button>
        </div>
      </div>

      {/* AI Talk Generator */}
      {showGen && (
        <div className="card mt-16">
          <div className="card-header"><div className="card-title">AI Toolbox Talk Generator</div></div>
          <div className="flex gap-8 mb-12 items-end">
            <div className="flex-1">
              <label className="form-label">Topic</label>
              <input className="form-input" placeholder="e.g. Silica dust exposure, Scaffold safety, Heat illness prevention..." value={genTopic} onChange={e => setGenTopic(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runGenerate(); }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={runGenerate} disabled={genLoading}>
              {genLoading ? "Generating..." : "Generate"}
            </button>
          </div>
          <div className="flex gap-4 flex-wrap mb-12">
            {["Silica Dust Control", "Fall Protection", "Scaffold Safety", "Heat Illness", "Power Tool Safety", "Material Handling", "PPE Compliance", "Knife Safety"].map(t => (
              <button key={t} className="btn btn-ghost btn-sm btn-table-action" onClick={() => { setGenTopic(t); }}>{t}</button>
            ))}
          </div>

          {genLoading && <div className="text-sm text-muted more-empty-cell">Generating talk on "{genTopic}"...</div>}

          {genResult && (
            <div className="mt-8">
              <div className="flex-between mb-8">
                <div>
                  <div className="more-metric-value--md">{genResult.title}</div>
                  <div className="text-xs text-muted">{genResult.duration} • {genResult.complianceRef || "General safety"}</div>
                </div>
                <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => {
                  let text = `TOOLBOX TALK: ${genResult.title}\n`;
                  text += `Duration: ${genResult.duration}\n`;
                  if (genResult.complianceRef) text += `OSHA Ref: ${genResult.complianceRef}\n`;
                  text += `\nOBJECTIVES:\n${genResult.objectives.map(o => `• ${o}`).join("\n")}`;
                  text += `\n\n${(genResult.content || []).map(s => `${s.heading}\n${s.points.map(p => `  • ${p}`).join("\n")}`).join("\n\n")}`;
                  text += `\n\nDISCUSSION QUESTIONS:\n${(genResult.discussion || []).map(q => `• ${q}`).join("\n")}`;
                  text += `\n\nKEY TAKEAWAYS:\n${(genResult.keyTakeaways || []).map(k => `• ${k}`).join("\n")}`;
                  navigator.clipboard.writeText(text);
                  app.show("Talk copied to clipboard", "ok");
                }}>Copy All</button>
              </div>

              {/* Summary */}
              <div className="more-info-card">{genResult.summary}</div>

              {/* Objectives */}
              {genResult.objectives?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-4">Learning Objectives</div>
                  {genResult.objectives.map((o, i) => (
                    <div key={i} className="more-list-row--italic">{i + 1}. {o}</div>
                  ))}
                </div>
              )}

              {/* Content Sections */}
              {genResult.content?.map((section, i) => (
                <div key={i} className="more-talk-section">
                  <div className="font-semi mb-sp2 c-amber">{section.heading}</div>
                  {section.points.map((p, j) => (
                    <div key={j} className="more-talk-point">• {p}</div>
                  ))}
                </div>
              ))}

              {/* Discussion Questions */}
              {genResult.discussion?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-4">Discussion Questions</div>
                  {genResult.discussion.map((q, i) => (
                    <div key={i} className="fs-label" style={{ padding: "var(--space-1) 0", fontStyle: "italic" }}>{i + 1}. {q}</div>
                  ))}
                </div>
              )}

              {/* Key Takeaways */}
              {genResult.keyTakeaways?.length > 0 && (
                <div className="more-info-card--green">
                  <div className="font-semi mb-4 text-green">Key Takeaways</div>
                  {genResult.keyTakeaways.map((k, i) => (
                    <div key={i} className="more-talk-point">✓ {k}</div>
                  ))}
                </div>
              )}

              {/* Use this talk button */}
              <div className="flex gap-8 mt-12">
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setForm({
                    projectId: "",
                    date: new Date().toISOString().slice(0, 10),
                    topic: genResult.title,
                    attendees: "",
                    conductor: "Abner",
                    notes: genResult.summary + "\n\nKey: " + (genResult.keyTakeaways || []).join("; "),
                  });
                  setAdding(true);
                  app.show("Talk loaded into form — fill attendees and save", "ok");
                }}>Use This Talk</button>
                <button className="btn btn-ghost btn-sm" onClick={runGenerate}>Regenerate</button>
              </div>
            </div>
          )}
        </div>
      )}

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <input className="form-input" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Attendees</label>
              <input className="form-input" type="number" value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Conductor</label>
              <input className="form-input" value={form.conductor} onChange={e => setForm({ ...form, conductor: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Date</th><th>Project</th><th>Topic</th><th>Attendees</th><th>Conductor</th><th></th></tr></thead>
          <tbody>
            {app.toolboxTalks.length === 0 && <tr><td colSpan={6} className="more-text-center">No toolbox talks</td></tr>}
            {app.toolboxTalks.map(talk => (
              <tr key={talk.id}>
                {editId === talk.id ? (
                  <>
                    <td><input className="form-input more-edit-select" type="date" defaultValue={talk.date}  onChange={e => talk._date = e.target.value} /></td>
                    <td><select className="form-select more-edit-select" defaultValue={talk.projectId}  onChange={e => talk._projectId = Number(e.target.value)}>
                      <option value="">Select...</option>{app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></td>
                    <td><input className="form-input more-edit-select" defaultValue={talk.topic}  onChange={e => talk._topic = e.target.value} /></td>
                    <td><input className="form-input more-edit-select" type="number" defaultValue={talk.attendees}  onChange={e => talk._attendees = Number(e.target.value)} /></td>
                    <td><input className="form-input more-edit-select" defaultValue={talk.conductor}  onChange={e => talk._conductor = e.target.value} /></td>
                    <td><div className="flex gap-4">
                      <button className="btn btn-primary btn-sm btn-table-save" onClick={() => {
                        app.setToolboxTalks(prev => prev.map(t => t.id === talk.id ? { ...t, date: talk._date ?? t.date, projectId: talk._projectId ?? t.projectId, topic: talk._topic ?? t.topic, attendees: talk._attendees ?? t.attendees, conductor: talk._conductor ?? t.conductor } : t));
                        setEditId(null); app.show("Talk updated");
                      }}>Save</button>
                      <button className="btn btn-ghost btn-sm btn-table-save" onClick={() => setEditId(null)}>Cancel</button>
                    </div></td>
                  </>
                ) : (
                  <>
                    <td>{talk.date}</td>
                    <td>{pName(talk.projectId)}</td>
                    <td>{talk.topic}</td>
                    <td>{talk.attendees}</td>
                    <td>{talk.conductor}</td>
                    <td><div className="flex gap-4">
                      <button className="btn btn-ghost btn-sm btn-table-save" onClick={() => setEditId(talk.id)}>Edit</button>
                      <button className="btn btn-ghost btn-sm fs-xs c-red" style={{ padding: "var(--space-1) var(--space-2)" }} onClick={() => { if (confirm("Delete this talk?")) { app.setToolboxTalks(prev => prev.filter(t => t.id !== talk.id)); app.show("Talk deleted"); } }}>✕</button>
                    </div></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Daily Reports ───────────────────────────────────────────── */
export function DailyReportsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", date: "", teamSize: "", hours: "", work: "", issues: "", weather: "", safety: "", photos: [] });
  const [editDr, setEditDr] = useState(null);
  const [digestResult, setDigestResult] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";

  const saveDrEdit = () => {
    if (!editDr) return;
    app.setDailyReports(prev => prev.map(r => r.id === editDr.id ? { ...editDr } : r));
    setEditDr(null);
    app.show("Report updated");
  };

  const drFiltered = app.dailyReports.filter(r => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return pName(r.projectId).toLowerCase().includes(q) || (r.work || "").toLowerCase().includes(q) || (r.date || "").includes(q);
  });

  const runDigest = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    if (app.dailyReports.length === 0) { app.show("No reports to digest", "err"); return; }
    setDigestLoading(true);
    setDigestResult(null);
    try {
      const { generateDailyReportDigest } = await import("../../utils/api.js");
      const reports = app.dailyReports.map(r => ({
        date: r.date, project: pName(r.projectId),
        teamSize: r.teamSize, hours: r.hours,
        work: r.work, issues: r.issues, weather: r.weather, safety: r.safety,
      }));
      const result = await generateDailyReportDigest(app.apiKey, reports);
      setDigestResult(result);
      app.show("Field digest generated", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setDigestLoading(false);
    }
  };

  const save = () => {
    if (!form.date || !form.work) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      date: form.date,
      teamSize: Number(form.teamSize) || 0,
      hours: Number(form.hours) || 0,
      work: form.work,
      issues: form.issues,
      weather: form.weather,
      safety: form.safety,
      photos: form.photos || [],
    };
    app.setDailyReports(prev => [...prev, newItem]);
    app.show("Daily report added", "ok");
    setAdding(false);
    setForm({ projectId: "", date: "", teamSize: "", hours: "", work: "", issues: "", weather: "", safety: "", photos: [] });
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Daily Reports</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Date","Project","Crew Size","Hours","Work","Issues","Weather","Safety"];
            const rows = drFiltered.map(r => [r.date, `"${pName(r.projectId)}"`, r.teamSize, r.hours, `"${(r.work||'').replace(/"/g,'""')}"`, `"${(r.issues||'').replace(/"/g,'""')}"`, r.weather||'', `"${(r.safety||'').replace(/"/g,'""')}"`]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_daily_reports.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("Daily Reports CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            if (drFiltered.length === 0) { app.show("No reports to export", "err"); return; }
            const { generateDailyReportPdf } = await import("../../utils/dailyReportPdf.js");
            for (const report of drFiltered.slice(0, 5)) {
              const project = app.projects.find(p => p.id === report.projectId);
              generateDailyReportPdf(report, project);
            }
            app.show(`${Math.min(drFiltered.length, 5)} report PDF(s) generated`);
          }}>Export PDF</button>
          <button className="btn btn-ghost btn-sm" onClick={runDigest} disabled={digestLoading}>
            {digestLoading ? "Analyzing..." : "AI Digest"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) setForm(f => ({ ...f, date: new Date().toISOString().slice(0, 10) })); setAdding(!adding); }}>+ Add Report</button>
        </div>
      </div>

      {/* AI Digest Results */}
      {digestResult && (
        <div className="card mt-16 p-16">
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">Field Operations Digest</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setDigestResult(null)} className="btn-table-action">Close</button>
          </div>

          <div className="more-detail-summary--lg">
            {digestResult.summary}
          </div>

          {/* By Project */}
          {digestResult.byProject?.map((p, i) => (
            <div key={i} className="more-info-card">
              <div className="flex-between mb-4">
                <span className="font-semi text-sm">{p.project}</span>
                <span className="text-xs text-muted">{p.status}</span>
              </div>
              {p.highlights?.map((h, j) => <div key={j} className="fs-12 text-green">{h}</div>)}
              {p.concerns?.map((c, j) => <div key={j} className="fs-12 text-red">{c}</div>)}
            </div>
          ))}

          {/* Notes Row */}
          <div className="more-dr-detail-grid">
            {digestResult.laborNotes && (
              <div className="rounded-control fs-label p-sp3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="font-semi mb-4 fs-12">Labor</div>
                {digestResult.laborNotes}
              </div>
            )}
            {digestResult.materialNotes && (
              <div className="rounded-control fs-label p-sp3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="font-semi mb-4 fs-12">Materials</div>
                {digestResult.materialNotes}
              </div>
            )}
          </div>

          {digestResult.weatherImpact && (
            <div className="more-info-card--blue mt-8">
              <span className="font-semi">Weather: </span>{digestResult.weatherImpact}
            </div>
          )}

          {digestResult.safetyNotes?.length > 0 && (
            <div className="mt-8">
              <div className="font-semi mb-4 fs-label c-red">Safety</div>
              {digestResult.safetyNotes.map((s, i) => <div key={i} className="fs-12">{s}</div>)}
            </div>
          )}

          {digestResult.actionItems?.length > 0 && (
            <div className="mt-12">
              <div className="text-sm font-semi mb-8">Action Items</div>
              {digestResult.actionItems.map((a, i) => (
                <div key={i} className="more-list-row">
                  <div className="flex-between">
                    <span>{a.item}</span>
                    <span className={`badge ${a.priority === "high" ? "badge-red" : a.priority === "medium" ? "badge-amber" : "badge-blue"}`}>{a.priority}</span>
                  </div>
                  {a.assignTo && <div className="text-xs text-muted mt-2">Assign: {a.assignTo}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Crew Size</label>
              <input className="form-input" type="number" value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Total Hours</label>
              <input className="form-input" type="number" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Weather</label>
              <input className="form-input" value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Work Completed</label>
            <textarea className="form-textarea" value={form.work} onChange={e => setForm({ ...form, work: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Issues</label>
            <textarea className="form-textarea" value={form.issues} onChange={e => setForm({ ...form, issues: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Safety Notes</label>
            <textarea className="form-textarea" value={form.safety} onChange={e => setForm({ ...form, safety: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Photos</label>
            <input type="file" accept="image/*" multiple onChange={e => {
              const files = Array.from(e.target.files || []);
              files.forEach(f => {
                const reader = new FileReader();
                reader.onload = () => setForm(prev => ({ ...prev, photos: [...(prev.photos || []), { name: f.name, data: reader.result }] }));
                reader.readAsDataURL(f);
              });
            }} />
            {form.photos?.length > 0 && (
              <div className="more-photo-grid">
                {form.photos.map((p, i) => (
                  <div key={i} className="pos-relative">
                    <img src={p.data} alt={p.name} className="rounded-control" style={{ height: 60, objectFit: "cover" }} />
                    <button className="more-photo-remove"
                      onClick={() => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {drFiltered.length === 0 && <div className="card mt-16 more-text-center">{app.search ? "No matching reports" : "No daily reports"}</div>}
      {drFiltered.map(rpt => (
        <div className="card mt-16" key={rpt.id}>
          {editDr?.id === rpt.id ? (
            <>
              <div className="form-grid mb-12">
                <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={editDr.date} onChange={e => setEditDr(d => ({ ...d, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Project</label><select className="form-select" value={editDr.projectId} onChange={e => setEditDr(d => ({ ...d, projectId: Number(e.target.value) }))}><option value="">Select...</option>{app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Crew Size</label><input className="form-input" type="number" value={editDr.teamSize} onChange={e => setEditDr(d => ({ ...d, teamSize: Number(e.target.value) }))} /></div>
                <div className="form-group"><label className="form-label">Hours</label><input className="form-input" type="number" value={editDr.hours} onChange={e => setEditDr(d => ({ ...d, hours: Number(e.target.value) }))} /></div>
                <div className="form-group"><label className="form-label">Weather</label><input className="form-input" value={editDr.weather} onChange={e => setEditDr(d => ({ ...d, weather: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Safety</label><input className="form-input" value={editDr.safety} onChange={e => setEditDr(d => ({ ...d, safety: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Work Completed</label><textarea className="form-textarea" value={editDr.work} onChange={e => setEditDr(d => ({ ...d, work: e.target.value }))} /></div>
              <div className="form-group mt-8"><label className="form-label">Issues</label><input className="form-input" value={editDr.issues || ""} onChange={e => setEditDr(d => ({ ...d, issues: e.target.value }))} /></div>
              <div className="flex gap-8 mt-12">
                <button className="btn btn-primary btn-sm" onClick={saveDrEdit}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditDr(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-between">
                <strong>{rpt.date} — {pName(rpt.projectId)}</strong>
                <div className="flex gap-8">
                  <span className="text2">{rpt.weather}</span>
                  <button className="btn btn-ghost btn-sm fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }} onClick={() => setEditDr({ ...rpt })}>Edit</button>
                  <button className="btn btn-ghost btn-sm btn-table-delete"
                    onClick={() => { if (confirm("Delete this daily report?")) { app.setDailyReports(prev => prev.filter(r => r.id !== rpt.id)); app.show("Report deleted"); } }}>✕</button>
                </div>
              </div>
              <div className="more-dr-detail-grid">
                <div><span className="text2">Crew Size:</span> {rpt.teamSize}</div>
                <div><span className="text2">Hours:</span> {rpt.hours}</div>
              </div>
              <div className="mt-8"><span className="text2">Work:</span> {rpt.work}</div>
              <div className="mt-4"><span className="text2">Issues:</span> {rpt.issues || "None"}</div>
              <div className="mt-4"><span className="text2">Safety:</span> {rpt.safety}</div>
              {rpt.photos?.length > 0 && (
                <div className="more-photo-grid">
                  {rpt.photos.map((p, i) => (
                    <img key={i} src={p.data} alt={p.name || "photo"} className="rounded-control cursor-pointer" style={{ height: 80, objectFit: "cover", border: "1px solid var(--border)" }}
                      onClick={() => window.open(p.data, "_blank")} title="Click to view full size" />
                  ))}
                </div>
              )}
              {/* 7.5 — PM Daily Report Review Workflow */}
              <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {rpt.reviewedBy ? (
                  <span style={{ fontSize: "var(--text-label)", color: rpt.reviewStatus === "flagged" ? "var(--red)" : "var(--green)", fontWeight: "var(--weight-semi)" }}>
                    {rpt.reviewStatus === "flagged" ? "\u26A0 Flagged" : "\u2713 Reviewed"} by {rpt.reviewedBy} {rpt.reviewedAt ? `\u00B7 ${new Date(rpt.reviewedAt).toLocaleDateString()}` : ""}
                  </span>
                ) : (
                  <>
                    <span style={{ fontSize: "var(--text-tab)", color: "var(--amber)", fontWeight: "var(--weight-semi)", textTransform: "uppercase" }}>Pending Review</span>
                    <button className="btn btn-sm" style={{ background: "var(--green)", color: "#fff", border: "none", padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-label)" }}
                      onClick={() => {
                        app.setDailyReports(prev => prev.map(r => r.id === rpt.id ? { ...r, reviewedBy: app.auth?.name || "PM", reviewedAt: new Date().toISOString(), reviewStatus: "approved" } : r));
                        app.show("Report approved");
                      }}>{"\u2713"} Approve</button>
                    <button className="btn btn-sm" style={{ background: "var(--red)", color: "#fff", border: "none", padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-label)" }}
                      onClick={() => {
                        const note = prompt("Flag reason:");
                        if (note !== null) {
                          app.setDailyReports(prev => prev.map(r => r.id === rpt.id ? { ...r, reviewedBy: app.auth?.name || "PM", reviewedAt: new Date().toISOString(), reviewStatus: "flagged", reviewNote: note } : r));
                          app.show("Report flagged");
                        }
                      }}>{"\u26A0"} Flag</button>
                  </>
                )}
                {rpt.reviewNote && (
                  <div style={{ width: "100%", marginTop: "var(--space-1)", fontSize: "var(--text-label)", color: "var(--text2)", fontStyle: "italic" }}>
                    {"\u{1F4AC}"} {rpt.reviewNote}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── OSHA Checklist ──────────────────────────────────────────── */
function OshaChecklistTab({ app }) {
  const [checks, setChecks] = useState(() => OSHA_CHECKLIST.map(item => ({ ...item })));
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const runAudit = async () => {
    if (!app?.apiKey) { app?.show("Set API key in Settings first", "err"); return; }
    setAuditLoading(true);
    setAuditResult(null);
    setShowAudit(true);
    try {
      const { analyzeOshaReadiness } = await import("../../utils/api.js");
      const checklistData = checks.map(c => ({ title: c.title, desc: c.desc, status: c.status }));
      const incidentData = (app.incidents || []).map(i => ({ date: i.date, type: i.type, desc: i.desc, corrective: i.corrective }));
      const projectData = (app.projects || []).map(p => ({ name: p.name || p.project, phase: p.phase, scope: p.scope }));
      const result = await analyzeOshaReadiness(app.apiKey, checklistData, incidentData, projectData);
      setAuditResult(result);
      app.show("Audit readiness analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setAuditLoading(false);
    }
  };

  const toggle = (id) => {
    setChecks(prev => prev.map(item =>
      item.id === id ? { ...item, status: item.status === "checked" ? "unchecked" : "checked" } : item
    ));
  };

  const completed = checks.filter(c => c.status === "checked").length;

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">OSHA Compliance Checklist</div>
        <div className="flex gap-8 items-center">
          <button className="btn btn-ghost btn-sm" onClick={runAudit} disabled={auditLoading}>
            {auditLoading ? "Analyzing..." : "AI Audit Readiness"}
          </button>
          <span className="text2">{completed} / {checks.length} complete</span>
        </div>
      </div>

      {/* AI Audit Panel */}
      {showAudit && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI OSHA Audit Readiness Report</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAudit(false); setAuditResult(null); }}>Close</button>
          </div>
          {auditLoading && <div className="text-sm text-muted more-empty-cell">Analyzing compliance checklist and incident history...</div>}
          {auditResult && (
            <div className="mt-8">
              {/* Score + Grade */}
              <div className="more-grid-2">
                <div className="rounded-control p-sp3 text-center" style={{ background: "var(--card)" }}>
                  <div className="text-xs text-muted">Readiness Score</div>
                  <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: auditResult.readinessScore >= 80 ? "var(--green)" : auditResult.readinessScore >= 60 ? "var(--amber)" : "var(--red)" }}>{auditResult.readinessScore}/100</div>
                </div>
                <div className="rounded-control p-sp3 text-center" style={{ background: "var(--card)" }}>
                  <div className="text-xs text-muted">Grade</div>
                  <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: auditResult.grade === "A" || auditResult.grade === "B" ? "var(--green)" : auditResult.grade === "C" ? "var(--amber)" : "var(--red)" }}>{auditResult.grade}</div>
                </div>
              </div>

              <div className="more-detail-summary">{auditResult.summary}</div>

              {/* Critical Gaps */}
              {auditResult.criticalGaps?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Critical Gaps</div>
                  {auditResult.criticalGaps.map((g, i) => (
                    <div key={i} className="more-ranking-item more-ranking-item--red">
                      <div className="flex-between">
                        <span className="font-semi">{g.item}</span>
                        <span className="badge-red">{g.risk}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">OSHA: {g.oshaRef}</div>
                      <div className="text-xs mt-2 text-blue">Fix: {g.remediation} (by {g.deadline})</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Priority Actions */}
              {auditResult.priorityActions?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Priority Actions</div>
                  {auditResult.priorityActions.map((a, i) => (
                    <div key={i} className="more-list-row">
                      <div className="flex-between">
                        <span>{a.action}</span>
                        <span className={a.priority === "immediate" ? "badge-red" : a.priority === "this_week" ? "badge-amber" : "badge-blue"}>{a.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">Cost: {a.cost} • {a.impact}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths */}
              {auditResult.strengths?.length > 0 && (
                <div className="rounded-control mb-sp3 p-sp3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid var(--green)" }}>
                  <div className="font-semi mb-4 text-green">Strengths</div>
                  {auditResult.strengths.map((s, i) => <div key={i} className="more-talk-point">✓ {s}</div>)}
                </div>
              )}

              {/* Training Gaps */}
              {auditResult.trainingGaps?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Training Gaps</div>
                  {auditResult.trainingGaps.map((t, i) => (
                    <div key={i} className="more-list-row">
                      <span className="font-semi">{t.topic}</span> <span className="text-xs text-muted">({t.frequency}) — OSHA {t.oshaRef}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="mt-16">
        {checks.map(item => (
          <div className="scope-item" key={item.id} onClick={() => toggle(item.id)} className="more-cursor-pointer">
            <div className="scope-check">
              <input type="checkbox" checked={item.status === "checked"} readOnly />
            </div>
            <div className="scope-info">
              <strong>{item.title}</strong>
              <div className="text2">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Certifications Tracker ───────────────────────────────────── */
function CertificationsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [empFilter, setEmpFilter] = useState("all");
  const [form, setForm] = useState({ employeeId: "", name: "", issueDate: "", expiryDate: "", status: "valid" });

  const users = (() => { try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; } })();
  const certs = app.certifications || [];
  const now = new Date();

  const CERT_TYPES = [
    "OSHA 10", "OSHA 30", "Fall Protection", "Forklift", "Scaffold Competent Person",
    "First Aid/CPR", "Confined Space", "CDL Class B", "Silica Awareness", "Aerial Lift",
    "Rigging & Signaling", "Hazmat Awareness",
  ];

  const getCertStatus = (cert) => {
    if (!cert.expiryDate) return "valid";
    const exp = new Date(cert.expiryDate);
    if (exp < now) return "expired";
    if ((exp - now) / 86400000 <= 30) return "expiring";
    return "valid";
  };

  const enriched = certs.map(c => ({ ...c, computedStatus: getCertStatus(c), empName: users.find(u => u.id === c.employeeId)?.name || "Unknown" }));

  const totalValid = enriched.filter(c => c.computedStatus === "valid").length;
  const totalExpiring = enriched.filter(c => c.computedStatus === "expiring").length;
  const totalExpired = enriched.filter(c => c.computedStatus === "expired").length;

  const filtered = enriched.filter(c => {
    if (statusFilter !== "all" && c.computedStatus !== statusFilter) return false;
    if (empFilter !== "all" && String(c.employeeId) !== empFilter) return false;
    return true;
  });

  const save = () => {
    if (!form.employeeId || !form.name) { app.show("Employee and cert name required", "err"); return; }
    if (editId) {
      app.setCertifications(prev => prev.map(c => c.id === editId ? { ...c, ...form, employeeId: Number(form.employeeId) } : c));
      app.show("Certification updated", "ok");
    } else {
      app.setCertifications(prev => [...prev, { id: app.nextId(), ...form, employeeId: Number(form.employeeId) }]);
      app.show("Certification added", "ok");
    }
    setAdding(false); setEditId(null);
    setForm({ employeeId: "", name: "", issueDate: "", expiryDate: "", status: "valid" });
  };

  const startEdit = (cert) => {
    setForm({ employeeId: String(cert.employeeId), name: cert.name, issueDate: cert.issueDate || "", expiryDate: cert.expiryDate || "", status: cert.status || "valid" });
    setEditId(cert.id); setAdding(true);
  };

  const deleteCert = (cert) => {
    if (!confirm(`Remove ${cert.name} for ${cert.empName}?`)) return;
    app.setCertifications(prev => prev.filter(c => c.id !== cert.id));
    app.show("Certification removed", "ok");
  };

  const exportCSV = () => {
    const headers = ["Employee", "Certification", "Issue Date", "Expiry Date", "Status"];
    const rows = enriched.map(c => [`"${c.empName}"`, `"${c.name}"`, c.issueDate || "", c.expiryDate || "", c.computedStatus]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "EBC_Certifications.csv"; a.click(); URL.revokeObjectURL(url);
    app.show("Certifications exported", "ok");
  };

  // Matrix data: employees as rows, cert types as columns
  const empIds = [...new Set(users.map(u => u.id))];
  const matrixEmps = users.filter(u => !["driver"].includes(u.role)); // field-relevant roles

  const statusBadge = (s) => s === "valid" ? "badge-green" : s === "expiring" ? "badge-amber" : "badge-red";
  const statusIcon = (s) => s === "valid" ? <CheckCircle size={14} className="c-green" /> : s === "expiring" ? <AlertTriangle size={14} className="c-amber" /> : <AlertOctagon size={14} className="c-red" />;

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Certification & Training Tracker</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding(!adding); setEditId(null); }}>+ Add Cert</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Total Certs</span><strong>{certs.length}</strong></div>
        <div className="kpi-card"><span className="text2">Valid</span><strong className="text-green">{totalValid}</strong></div>
        <div className="kpi-card"><span className="text2">Expiring (&lt;30d)</span><strong className="text-amber">{totalExpiring}</strong></div>
        <div className="kpi-card"><span className="text2">Expired</span><strong className="text-red">{totalExpired}</strong></div>
      </div>

      {/* Add/Edit Form */}
      {adding && (
        <div className="card mt-16">
          <div className="card-header"><div className="card-title">{editId ? "Edit Certification" : "Add Certification"}</div></div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">Select...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Certification *</label>
              <select className="form-select" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}>
                <option value="">Select...</option>
                {CERT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__custom">Custom...</option>
              </select>
              {form.name === "__custom" && (
                <input className="form-input mt-4" placeholder="Custom cert name" value="" onChange={e => setForm({ ...form, name: e.target.value })} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Issue Date</label>
              <input className="form-input" type="date" value={form.issueDate} onChange={e => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={save}>{editId ? "Update" : "Add"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Compliance Matrix */}
      <div className="card mt-16">
        <div className="card-header"><div className="card-title">Compliance Matrix</div></div>
        <div className="table-wrap">
          <table className="data-table btn-table-action">
            <thead>
              <tr>
                <th className="td-sticky">Employee</th>
                {CERT_TYPES.slice(0, 8).map(ct => <th key={ct} className="more-text-center ws-nowrap fs-10">{ct}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrixEmps.map(emp => (
                <tr key={emp.id}>
                  <td className="td-sticky fw-500">{emp.name}</td>
                  {CERT_TYPES.slice(0, 8).map(ct => {
                    const cert = enriched.find(c => c.employeeId === emp.id && c.name === ct);
                    if (!cert) return <td key={ct} className="more-text-center text-muted">—</td>;
                    const s = cert.computedStatus;
                    return (
                      <td key={ct} className="more-text-center">
                        <span className={`badge ${statusBadge(s)} fs-9 more-cursor-pointer`} onClick={() => startEdit(cert)} title={`${cert.expiryDate || "No expiry"} — click to edit`}>
                          {statusIcon(s)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-8 mt-16">
        <select className="form-select min-w-150" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="valid">Valid</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
        <select className="form-select min-w-150" value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
          <option value="all">All Employees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* Cert List */}
      <div className="mt-16">
        {filtered.length === 0 ? (
          <div className="card more-empty-card">
            <div className="more-empty-icon"><ClipboardList className="more-empty-icon" /></div>
            <div className="text-sm text-muted mt-8">No certifications match your filters.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Certification</th><th>Issued</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.sort((a, b) => {
                const order = { expired: 0, expiring: 1, valid: 2 };
                return (order[a.computedStatus] ?? 2) - (order[b.computedStatus] ?? 2);
              }).map(c => (
                <tr key={c.id}>
                  <td className="fw-500">{c.empName}</td>
                  <td>{c.name}</td>
                  <td className="font-mono text-sm">{c.issueDate || "—"}</td>
                  <td className="font-mono text-sm">{c.expiryDate || "No expiry"}</td>
                  <td><span className={`badge ${statusBadge(c.computedStatus)} fs-10`}>{c.computedStatus}</span></td>
                  <td>
                    <div className="flex gap-4">
                      <button className="btn btn-ghost btn-table-edit--amber" onClick={() => startEdit(c)}>Edit</button>
                      <button className="btn btn-ghost btn-table-edit--red" onClick={() => deleteCert(c)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
