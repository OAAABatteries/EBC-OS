import { useState, useMemo } from "react";
import { Award } from "lucide-react";
import { computeProjectTotalCost } from "../utils/financialValidation";

// ═══════════════════════════════════════════════════════════════
//  Incentive & Appreciation System
//  Track GC rewards based on project profit margins
// ═══════════════════════════════════════════════════════════════

// Load admin-configurable margin tiers from localStorage, fallback to defaults
function getMarginTiers() {
  try {
    const stored = localStorage.getItem("ebc_margin_tiers");
    if (stored) {
      const t = JSON.parse(stored);
      return {
        bronze: t.bronze ?? 15,
        silver: t.silver ?? 20,
        gold: t.gold ?? 25,
        platinum: t.platinum ?? 30,
      };
    }
  } catch {}
  return { bronze: 15, silver: 20, gold: 25, platinum: 30 };
}

function buildRewardTiers() {
  const mt = getMarginTiers();
  return [
    { name: "Bronze", min: mt.bronze, color: "#cd7f32", bg: "rgba(205,127,50,0.10)", perks: ["Thank-you email", "Referral to new GCs", "Priority scheduling"] },
    { name: "Silver", min: mt.silver, color: "var(--text2)", bg: "rgba(148,163,184,0.10)", perks: ["All Bronze perks", "Lunch on EBC", "Preferred pricing on next bid"] },
    { name: "Gold", min: mt.gold, color: "var(--yellow)", bg: "rgba(234,179,8,0.10)", perks: ["All Silver perks", "Gift card ($100)", "First-call on new projects"] },
    { name: "Platinum", min: mt.platinum, color: "var(--purple)", bg: "rgba(167,139,250,0.10)", perks: ["All Gold perks", "Annual appreciation dinner", "Exclusive partnership status"] },
  ];
}

const SUB_TABS = ["Project Tracker", "Reward Tiers", "Margin Calculator"];

export function IncentiveTab({ app }) {
  const { incentiveProjects, setIncentiveProjects, show, fmt, apiKey } = app;
  // Build tier thresholds from admin-configured values in localStorage
  const REWARD_TIERS = useMemo(() => buildRewardTiers(), []);
  const [subTab, setSubTab] = useState("Project Tracker");
  const [editProj, setEditProj] = useState(null);
  const [calcRevenue, setCalcRevenue] = useState(100000);
  const [calcCost, setCalcCost] = useState(85000);
  const [aiDraft, setAiDraft] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── AI Strategy state ──
  const [stratResult, setStratResult] = useState(null);
  const [stratLoading, setStratLoading] = useState(false);
  const [showStrat, setShowStrat] = useState(false);

  const runStrategy = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setStratLoading(true);
    setStratResult(null);
    try {
      const { analyzeIncentiveStrategy } = await import("../utils/api.js");
      const res = await analyzeIncentiveStrategy(apiKey, incentiveProjects, app.bids || [], app.projects || []);
      setStratResult(res);
      setShowStrat(true);
      show("Strategy analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setStratLoading(false);
    }
  };

  // ── Get tier for a margin ──
  const getTier = (margin) => {
    for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
      if (margin >= REWARD_TIERS[i].min) return REWARD_TIERS[i];
    }
    return null;
  };

  // ── Auto-calculated margins from real project data (single source of truth) ──
  const liveProjectMargins = useMemo(() => {
    const projects = app.projects || [];
    const timeEntries = app.timeEntries || [];
    const employees = app.employees || [];
    const apBills = app.apBills || [];
    const accruals = app.accruals || [];
    const changeOrders = app.changeOrders || [];
    const burden = app.companySettings?.laborBurdenMultiplier || 1.35;
    return projects.filter(p => p.contract > 0).map(p => {
      const costs = computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, burden, accruals);
      const totalCost = costs.total;
      // Adjusted contract = base contract + approved change orders (matches dashboard / WIP)
      const approvedCOs = changeOrders
        .filter(c => String(c.projectId) === String(p.id) && c.status === "approved")
        .reduce((s, c) => s + (c.amount || 0), 0);
      const revenue = (p.contract || 0) + approvedCOs;
      const margin = revenue > 0 ? ((revenue - totalCost) / revenue * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        gc: p.gc,
        revenue,
        laborCost: Math.round(costs.labor),
        materialCost: Math.round(costs.material),
        subCost: Math.round(costs.subcontractor),
        otherCost: Math.round(costs.otherAP),
        totalCost: Math.round(totalCost),
        totalHours: costs.laborHours || 0,
        margin: Math.round(margin * 10) / 10,
        phase: p.phase,
      };
    });
  }, [app.projects, app.timeEntries, app.employees, app.apBills, app.accruals, app.changeOrders, app.companySettings]);

  // ── Stats ──
  const stats = useMemo(() => {
    const completed = incentiveProjects.filter(p => p.status === "complete");
    const avgMargin = completed.length > 0 ? completed.reduce((s, p) => s + p.margin, 0) / completed.length : 0;
    const totalRevenue = completed.reduce((s, p) => s + (p.revenue || 0), 0);
    const totalProfit = completed.reduce((s, p) => s + ((p.revenue || 0) * (p.margin || 0) / 100), 0);
    return { completed: completed.length, avgMargin, totalRevenue, totalProfit };
  }, [incentiveProjects]);

  // ── Project CRUD ──
  const saveProject = () => {
    if (!editProj.gc) { show("GC name required", "err"); return; }
    const margin = editProj.revenue > 0 ? ((editProj.revenue - editProj.cost) / editProj.revenue * 100) : 0;
    const proj = { ...editProj, margin: Math.round(margin * 10) / 10 };
    if (proj.id) {
      setIncentiveProjects(prev => prev.map(p => p.id === proj.id ? proj : p));
      show("Project updated");
    } else {
      setIncentiveProjects(prev => [...prev, { ...proj, id: crypto.randomUUID() }]);
      show("Project added");
    }
    setEditProj(null);
  };

  const deleteProject = (id) => {
    setIncentiveProjects(prev => prev.filter(p => p.id !== id));
    show("Project removed");
    setEditProj(null);
  };

  // ═══════════════════════════════════════════════════════════════
  //  PROJECT TRACKER
  // ═══════════════════════════════════════════════════════════════
  const renderTracker = () => (
    <div>
      <div className="flex-between mb-16">
        <div className="flex gap-8 flex-wrap">
          <div className="kpi-card"><span className="text2">Completed</span><strong>{stats.completed}</strong></div>
          <div className="kpi-card"><span className="text2">Avg Margin</span><strong>{stats.avgMargin.toFixed(1)}%</strong></div>
          <div className="kpi-card"><span className="text2">Total Revenue</span><strong>{app.fmtK(stats.totalRevenue)}</strong></div>
          <div className="kpi-card"><span className="text2">Total Profit</span><strong>{app.fmtK(stats.totalProfit)}</strong></div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditProj({
          gc: "", project: "", revenue: 0, cost: 0, margin: "0", status: "complete", rewardSent: false, notes: ""
        })}>+ Add Project</button>
      </div>

      {/* ── Live Project Margins (single source of truth: computeProjectTotalCost) ── */}
      {liveProjectMargins.length > 0 && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--amber)", marginBottom: "var(--space-2)" }}>Live Project Margins (burdened labor + AP bills + accruals)</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>GC</th>
                  <th style={{ textAlign: "right" }}>Contract</th>
                  <th style={{ textAlign: "right" }}>Labor</th>
                  <th style={{ textAlign: "right" }}>Material</th>
                  <th style={{ textAlign: "right" }}>Sub/Other</th>
                  <th style={{ textAlign: "right" }}>Total Cost</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {liveProjectMargins.map(p => {
                  const tier = getTier(p.margin);
                  return (
                    <tr key={p.id}>
                      <td className="font-semi">{p.name}</td>
                      <td>{p.gc}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">{fmt(p.revenue)}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">{fmt(p.laborCost)}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">{fmt(p.materialCost)}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">{fmt(p.subCost + p.otherCost)}</td>
                      <td style={{ textAlign: "right" }} className="font-mono font-bold">{fmt(p.totalCost)}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="font-mono" style={{ color: tier ? tier.color : p.margin > 0 ? "#10b981" : "var(--red)" }}>{p.margin}%</span>
                      </td>
                      <td>{tier ? <span style={{ color: tier.color, fontWeight: "var(--weight-semi)", fontSize: "var(--text-label)" }}>{tier.name}</span> : <span className="text-dim text-xs">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", marginTop: "var(--space-1)" }}>Burdened labor from time entries ({((app.companySettings?.laborBurdenMultiplier || 1.35) * 100 - 100).toFixed(0)}% burden) + AP bills + accruals. Matches Job Costing and Dashboard.</div>
        </div>
      )}

      <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--weight-semi)", color: "var(--text2)", marginBottom: "var(--space-2)", marginTop: "var(--space-2)" }}>Manual Project Tracking</div>
      {incentiveProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Award style={{ width: 40, height: 40 }} /></div>
          <div className="empty-text">No completed projects tracked yet</div>
          <div className="text-sm text-dim mt-8">Add completed projects to track GC appreciation tiers</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>GC</th>
                <th>Project</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
                <th style={{ textAlign: "right" }}>Cost</th>
                <th style={{ textAlign: "right" }}>Margin</th>
                <th>Tier</th>
                <th>Reward</th>
              </tr>
            </thead>
            <tbody>
              {incentiveProjects.map(p => {
                const tier = getTier(p.margin);
                return (
                  <tr key={p.id} className="clickable-row" onClick={() => setEditProj({ ...p })}>
                    <td className="font-semi">{p.gc}</td>
                    <td>{p.project}</td>
                    <td style={{ textAlign: "right" }} className="font-mono">{fmt(p.revenue)}</td>
                    <td style={{ textAlign: "right" }} className="font-mono">{fmt(p.cost)}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-mono" style={{ color: tier ? tier.color : "var(--text2)" }}>{p.margin}%</span>
                    </td>
                    <td>
                      {tier ? (
                        <span style={{ color: tier.color, fontWeight: "var(--weight-semi)", fontSize: "var(--text-label)" }}>{tier.name}</span>
                      ) : (
                        <span className="text-dim text-xs">Below 5%</span>
                      )}
                    </td>
                    <td>
                      {p.rewardSent ? (
                        <span className="badge badge-green">Sent</span>
                      ) : tier ? (
                        <span className="badge badge-amber">Pending</span>
                      ) : (
                        <span className="text-dim text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  REWARD TIERS
  // ═══════════════════════════════════════════════════════════════
  const renderTiers = () => (
    <div>
      <div className="text-sm text-dim mb-16">Reward tiers are based on project profit margin percentages. Higher margins unlock better appreciation perks for GC relationships.</div>
      <div className="bid-grid">
        {REWARD_TIERS.map(tier => {
          const count = incentiveProjects.filter(p => {
            const t = getTier(p.margin);
            return t && t.name === tier.name;
          }).length;
          return (
            <div key={tier.name} className="bid-card" style={{ borderTop: `3px solid ${tier.color}` }}>
              <div className="flex-between mb-8">
                <span style={{ color: tier.color, fontWeight: "var(--weight-bold)", fontSize: "var(--text-section)" }}>{tier.name}</span>
                <span className="text-xs text-dim">{tier.min}%+ margin</span>
              </div>
              <div className="text-sm text-dim mb-12">{count} project{count !== 1 ? "s" : ""} at this tier</div>
              <div style={{ fontSize: "var(--text-label)" }}>
                {tier.perks.map((perk, i) => (
                  <div key={i} style={{ padding: "var(--space-1) 0", borderBottom: i < tier.perks.length - 1 ? "1px solid var(--border)" : "none" }}>
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  MARGIN CALCULATOR
  // ═══════════════════════════════════════════════════════════════
  const renderCalculator = () => {
    const margin = calcRevenue > 0 ? ((calcRevenue - calcCost) / calcRevenue * 100) : 0;
    const profit = calcRevenue - calcCost;
    const tier = getTier(margin);

    return (
      <div>
        <div className="card">
          <div className="card-header"><div className="card-title font-head">Interactive Margin Calculator</div></div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Revenue ($)</label>
              <input className="form-input" type="number" value={calcRevenue} onChange={e => setCalcRevenue(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost ($)</label>
              <input className="form-input" type="number" value={calcCost} onChange={e => setCalcCost(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-16 mt-16 flex-wrap">
            <div><span className="text-dim text-xs">PROFIT</span><div className="font-mono" style={{ color: profit >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(profit)}</div></div>
            <div><span className="text-dim text-xs">MARGIN</span><div className="font-mono font-bold" style={{ fontSize: "var(--text-subtitle)", color: tier ? tier.color : "var(--text2)" }}>{margin.toFixed(1)}%</div></div>
            <div><span className="text-dim text-xs">TIER</span><div style={{ color: tier ? tier.color : "var(--text2)", fontWeight: "var(--weight-bold)", fontSize: "var(--text-section)" }}>{tier ? tier.name : "Below threshold"}</div></div>
          </div>

          {/* Tier progress bar */}
          <div className="mt-24">
            <div style={{ position: "relative", height: 32, background: "var(--bg4)", borderRadius: "var(--radius-control)" }}>
              <div style={{
                position: "absolute", left: 0, top: 0, height: "100%",
                width: `${Math.min(Math.max(margin, 0), 25) / 25 * 100}%`,
                background: tier ? tier.color : "var(--text3)",
                borderRadius: "var(--radius-control)", transition: "width 0.3s, background 0.3s",
              }} />
              {REWARD_TIERS.map(t => (
                <div key={t.name} style={{
                  position: "absolute", left: `${(t.min / 25) * 100}%`, top: -18,
                  fontSize: "var(--text-xs)", color: t.color, fontWeight: "var(--weight-semi)", transform: "translateX(-50%)"
                }}>
                  {t.name} ({t.min}%)
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  EDIT PROJECT MODAL
  // ═══════════════════════════════════════════════════════════════
  const renderEditModal = () => {
    if (!editProj) return null;
    const isNew = !editProj.id;
    const upd = (f, v) => setEditProj(p => ({ ...p, [f]: v }));
    const margin = editProj.revenue > 0 ? ((editProj.revenue - editProj.cost) / editProj.revenue * 100) : 0;
    const tier = getTier(margin);

    return (
      <div className="modal-overlay" onClick={() => setEditProj(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Project" : "Edit Project"}</div>
            <button className="modal-close" onClick={() => setEditProj(null)}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">General Contractor</label>
              <input className="form-input" value={editProj.gc} onChange={e => upd("gc", e.target.value)} placeholder="GC name" />
            </div>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={editProj.project} onChange={e => upd("project", e.target.value)} placeholder="Project name" />
            </div>
            <div className="form-group">
              <label className="form-label">Revenue ($)</label>
              <input className="form-input" type="number" value={editProj.revenue} onChange={e => upd("revenue", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost ($)</label>
              <input className="form-input" type="number" value={editProj.cost} onChange={e => upd("cost", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Reward Sent?</label>
              <select className="form-select" value={editProj.rewardSent ? "yes" : "no"} onChange={e => upd("rewardSent", e.target.value === "yes")}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Live Margin</label>
              <div className="font-mono" style={{ color: tier ? tier.color : "var(--text2)", fontSize: "var(--text-section)", fontWeight: "var(--weight-bold)", paddingTop: "var(--space-2)" }}>
                {margin.toFixed(1)}% {tier ? `(${tier.name})` : ""}
              </div>
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={editProj.notes || ""} onChange={e => upd("notes", e.target.value)} placeholder="Notes about this project..." />
            </div>
          </div>
          <div className="modal-actions">
            {!isNew && <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={() => deleteProject(editProj.id)}>Delete</button>}
            {!isNew && tier && apiKey && (
              <button className="btn btn-ghost" disabled={aiLoading} onClick={async () => {
                setAiLoading(true);
                try {
                  const { generateAppreciation } = await import("../utils/api.js");
                  const draft = await generateAppreciation(apiKey, editProj, tier);
                  setAiDraft(draft);
                  show("Email drafted");
                } catch (err) {
                  show("AI error: " + err.message, "err");
                }
                setAiLoading(false);
              }}>
                {aiLoading ? "Drafting..." : "Draft Appreciation Email"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setEditProj(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveProject}>{isNew ? "Add" : "Save"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">Incentive & Appreciation</div>
          <div className="section-sub">Track GC rewards based on project margins</div>
        </div>
        <button className="btn btn-ghost" onClick={() => { showStrat ? setShowStrat(false) : runStrategy(); }} disabled={stratLoading}>
          {stratLoading ? "Analyzing..." : "AI Strategy"}
        </button>
      </div>

      {/* AI Strategy Panel */}
      {showStrat && stratResult && (
        <div className="card" style={{ padding: "var(--space-5)", marginBottom: "var(--space-4)", maxHeight: 500, overflow: "auto" }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">Incentive Strategy Analysis</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowStrat(false)}>Close</button>
          </div>

          {/* Program Health */}
          {stratResult.programHealth && (
            <div className="flex gap-16 mb-16" style={{ alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div className="text-xs text-muted">Program Score</div>
                <div style={{ fontSize: "var(--text-stat)", fontWeight: "var(--weight-bold)", color: stratResult.programHealth.score >= 70 ? "var(--green)" : stratResult.programHealth.score >= 40 ? "var(--amber)" : "var(--red)" }}>
                  {stratResult.programHealth.score}/100
                </div>
              </div>
              <div className="flex gap-12 flex-wrap" style={{ flex: 1 }}>
                <div><span className="text-xs text-muted">Avg Margin:</span> <span className="font-semi">{stratResult.programHealth.avgMargin}%</span></div>
                <div><span className="text-xs text-muted">Top Tier:</span> <span className="font-semi">{stratResult.programHealth.topTier}</span></div>
                <div><span className="text-xs text-muted">GCs:</span> <span className="font-semi">{stratResult.programHealth.gcCount}</span></div>
              </div>
            </div>
          )}

          <div className="text-sm text-muted mb-16">{stratResult.summary}</div>

          {/* Upsell Opportunities */}
          {stratResult.upsellOpportunities?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Tier Upgrade Opportunities</div>
              {stratResult.upsellOpportunities.map((u, i) => (
                <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm font-semi">{u.gc}</span>
                    <div className="flex gap-4">
                      <span className="badge badge-muted">{u.currentTier}</span>
                      <span>→</span>
                      <span className="badge badge-amber">{u.nextTier}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted mt-2">Gap: {u.marginGap}% · {u.strategy}</div>
                </div>
              ))}
            </div>
          )}

          {/* Program Suggestions */}
          {stratResult.programSuggestions?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semi mb-8">Program Improvements</div>
              {stratResult.programSuggestions.map((s, i) => (
                <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex-between">
                    <span className="text-sm">{s.suggestion}</span>
                    <span className={`badge ${s.effort === "easy" ? "badge-green" : s.effort === "medium" ? "badge-amber" : "badge-red"}`}>{s.effort}</span>
                  </div>
                  <div className="text-xs text-muted mt-2">{s.rationale} — {s.expectedImpact}</div>
                </div>
              ))}
            </div>
          )}

          {/* At Risk */}
          {stratResult.atRiskRelationships?.length > 0 && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>At-Risk Relationships</div>
              {stratResult.atRiskRelationships.map((r, i) => (
                <div key={i} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm font-semi">{r.gc}</span>
                  <div className="text-xs text-muted mt-2">{r.concern}</div>
                  <div className="text-xs mt-2" style={{ color: "var(--green)" }}>{r.action}</div>
                </div>
              ))}
            </div>
          )}

          {stratResult.roi && <div className="text-sm" style={{ padding: "var(--space-2)", color: "var(--green)" }}>ROI: {stratResult.roi}</div>}
        </div>
      )}

      <div className="flex gap-4 mb-16">
        {SUB_TABS.map(t => (
          <button key={t} className={`btn btn-sm ${subTab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setSubTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {subTab === "Project Tracker" && renderTracker()}
      {subTab === "Reward Tiers" && renderTiers()}
      {subTab === "Margin Calculator" && renderCalculator()}

      {renderEditModal()}

      {/* AI Draft Modal */}
      {aiDraft && (
        <div className="modal-overlay" onClick={() => setAiDraft(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">AI-Drafted Appreciation Email</div>
              <button className="modal-close" onClick={() => setAiDraft(null)}>✕</button>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "var(--text-secondary)", lineHeight: 1.6, padding: "var(--space-2) 0" }}>
              {aiDraft}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAiDraft(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => {
                navigator.clipboard.writeText(aiDraft);
                show("Copied to clipboard");
              }}>Copy to Clipboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
