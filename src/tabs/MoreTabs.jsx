import { useState, useCallback, Fragment } from "react";
import { THEMES, OSHA_CHECKLIST, COMPANY_DEFAULTS, ASSEMBLIES } from "../data/constants";
import { storePdf, getPdfUrl, deletePdf, fmtSize } from "../hooks/useSubmittalPdf";
import { TimeClockAdmin } from "./TimeClockAdmin";
import { MapView } from "./MapView";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · MoreTabs — Secondary tab routing & implementations
// ═══════════════════════════════════════════════════════════════

export function MoreTabs({ app }) {
  switch (app.tab) {
    case "financials": return <Financials app={app} />;
    case "documents":  return <Documents app={app} />;
    case "schedule":   return <Schedule app={app} />;
    case "reports":    return <Reports app={app} />;
    case "safety":     return <Safety app={app} />;
    case "timeclock":  return <TimeClockAdmin app={app} />;
    case "map":        return <MapView app={app} />;
    case "settings":   return <Settings app={app} />;
    default:           return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   HELPER: Sub-tab bar
   ══════════════════════════════════════════════════════════════ */
function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="tab-header">
      {tabs.map(t => (
        <button key={t} className={`tab-btn${active === t ? " active" : ""}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FINANCIALS
   ══════════════════════════════════════════════════════════════ */
function Financials({ app }) {
  const [sub, setSub] = useState("Invoices");
  return (
    <div>
      <SubTabs tabs={["Invoices", "Change Orders", "T&M Tickets", "Job Costing"]} active={sub} onChange={setSub} />
      {sub === "Invoices" && <InvoicesTab app={app} />}
      {sub === "Change Orders" && <ChangeOrdersTab app={app} />}
      {sub === "T&M Tickets" && <TmTicketsTab app={app} />}
      {sub === "Job Costing" && <JobCostingTab app={app} />}
    </div>
  );
}

/* ── Invoices ────────────────────────────────────────────────── */
function InvoicesTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", number: "", date: "", amount: "", status: "pending", desc: "", paidDate: "" });
  const [collectId, setCollectId] = useState(null);
  const [collectText, setCollectText] = useState("");
  const [collectLoading, setCollectLoading] = useState(false);

  const runCollection = async (inv) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setCollectId(inv.id);
    setCollectLoading(true);
    setCollectText("");
    try {
      const { generateCollectionEmail } = await import("../utils/api.js");
      const project = app.projects.find(p => p.id === inv.projectId);
      const invDate = new Date(inv.date);
      const daysPastDue = Math.max(0, Math.floor((Date.now() - invDate.getTime()) / 86400000) - 30);
      const text = await generateCollectionEmail(app.apiKey, inv, project, daysPastDue);
      setCollectText(text);
      app.show("Collection email drafted", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setCollectLoading(false);
    }
  };

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const badge = (s) => s === "paid" ? "badge-green" : s === "pending" ? "badge-amber" : s === "draft" ? "badge-muted" : "badge-red";

  const invFiltered = app.invoices.filter(inv => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return inv.number.toLowerCase().includes(q) || pName(inv.projectId).toLowerCase().includes(q) || (inv.desc || "").toLowerCase().includes(q);
  });
  const totalBilled = invFiltered.reduce((s, i) => s + i.amount, 0);
  const pending = invFiltered.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue = invFiltered.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const save = () => {
    if (!form.number || !form.amount) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      number: form.number,
      date: form.date,
      amount: Number(form.amount),
      status: form.status,
      desc: form.desc,
      paidDate: form.paidDate || null,
    };
    app.setInvoices(prev => [...prev, newItem]);
    app.show("Invoice added", "ok");
    setAdding(false);
    setForm({ projectId: "", number: "", date: "", amount: "", status: "pending", desc: "", paidDate: "" });
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="flex gap-8">
          <div className="kpi-card"><span className="text2">Total Billed</span><strong>{app.fmt(totalBilled)}</strong></div>
          <div className="kpi-card"><span className="text2">Pending</span><strong>{app.fmt(pending)}</strong></div>
          <div className="kpi-card"><span className="text2">Overdue</span><strong>{app.fmt(overdue)}</strong></div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Invoice #","Project","Date","Amount","Status","Paid Date","Description"];
            const rows = invFiltered.map(i => [i.number, `"${pName(i.projectId)}"`, i.date, i.amount, i.status, i.paidDate||'', `"${(i.desc||'').replace(/"/g,'""')}"`]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ebc_invoices.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("Invoices CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { const nums = app.invoices.map(i => parseInt(i.number)).filter(n => !isNaN(n)); setForm(f => ({ ...f, number: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0"), date: new Date().toISOString().slice(0, 10) })); } setAdding(!adding); }}>+ Add Invoice</button>
        </div>
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
              <label className="form-label">Invoice #</label>
              <input className="form-input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Paid Date</label>
              <input className="form-input" type="date" value={form.paidDate} onChange={e => setForm({ ...form, paidDate: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Invoice #</th><th>Project</th><th>Date</th><th>Amount</th><th>Status</th><th>Paid Date</th><th></th></tr></thead>
          <tbody>
            {invFiltered.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center" }}>{app.search ? "No matching invoices" : "No invoices"}</td></tr>}
            {invFiltered.map(inv => (
              <Fragment key={inv.id}>
                <tr>
                  <td>{inv.number}</td>
                  <td>{pName(inv.projectId)}</td>
                  <td>{inv.date}</td>
                  <td>{app.fmt(inv.amount)}</td>
                  <td><span className={badge(inv.status)}>{inv.status}</span></td>
                  <td>{inv.paidDate || "—"}</td>
                  <td>
                    <div className="flex gap-4">
                    {(inv.status === "pending" || inv.status === "overdue") && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px", color: "var(--green)" }}
                        onClick={() => {
                          const paidDate = prompt("Payment date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                          if (!paidDate) return;
                          const checkNum = prompt("Check/Reference # (optional):", "");
                          app.setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "paid", paidDate, checkNum: checkNum || null } : i));
                          app.show(`Invoice ${inv.number} marked paid`);
                        }}>
                        Mark Paid
                      </button>
                    )}
                    {(inv.status === "pending" || inv.status === "overdue") && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => collectId === inv.id && collectText ? setCollectId(null) : runCollection(inv)}
                        disabled={collectLoading && collectId === inv.id}>
                        {collectLoading && collectId === inv.id ? "..." : collectId === inv.id && collectText ? "Hide" : "Collect"}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px", color: "var(--red)" }}
                      onClick={() => { if (confirm("Delete this invoice?")) { app.setInvoices(prev => prev.filter(i => i.id !== inv.id)); app.show("Invoice deleted"); } }}>✕</button>
                    </div>
                  </td>
                </tr>
                {collectId === inv.id && collectText && (
                  <tr><td colSpan={7} style={{ padding: 0 }}>
                    <div style={{ padding: 16, background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
                      <div className="flex-between mb-8">
                        <span className="font-semi text-sm">AI Collection Email</span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
                          navigator.clipboard.writeText(collectText);
                          app.show("Email copied to clipboard", "ok");
                        }}>Copy</button>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, padding: 12, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)" }}>
                        {collectText}
                      </div>
                      <div className="flex gap-8 mt-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => runCollection(inv)}>Regenerate</button>
                      </div>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="summary-row mt-16">Total: {app.fmt(totalBilled)}</div>
    </div>
  );
}

/* ── Change Orders ───────────────────────────────────────────── */
function ChangeOrdersTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", number: "", desc: "", amount: "", status: "pending", submitted: "", approved: "" });
  const [impactId, setImpactId] = useState(null);
  const [impactResult, setImpactResult] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const badge = (s) => s === "approved" ? "badge-green" : s === "pending" ? "badge-amber" : "badge-red";

  const coFiltered = app.changeOrders.filter(co => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return co.number.toLowerCase().includes(q) || pName(co.projectId).toLowerCase().includes(q) || (co.desc || "").toLowerCase().includes(q);
  });

  const runImpact = async (co) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setImpactId(co.id);
    setImpactLoading(true);
    setImpactResult(null);
    try {
      const { analyzeChangeOrderImpact } = await import("../utils/api.js");
      const project = app.projects.find(p => p.id === co.projectId);
      const projectCOs = app.changeOrders.filter(c => c.projectId === co.projectId);
      const result = await analyzeChangeOrderImpact(app.apiKey, co, project || { name: "Unknown" }, projectCOs);
      setImpactResult(result);
      app.show("Impact analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setImpactLoading(false);
    }
  };

  const save = () => {
    if (!form.number || !form.amount) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      number: form.number,
      desc: form.desc,
      amount: Number(form.amount),
      status: form.status,
      submitted: form.submitted,
      approved: form.approved || null,
    };
    app.setChangeOrders(prev => [...prev, newItem]);
    app.show("Change order added", "ok");
    setAdding(false);
    setForm({ projectId: "", number: "", desc: "", amount: "", status: "pending", submitted: "", approved: "" });
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Change Orders</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["CO #","Project","Description","Amount","Status","Submitted","Approved"];
            const rows = coFiltered.map(c => [c.number, `"${pName(c.projectId)}"`, `"${(c.desc||'').replace(/"/g,'""')}"`, c.amount, c.status, c.submitted||'', c.approved||'']);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ebc_change_orders.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("Change orders CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { const nums = app.changeOrders.map(c => parseInt(c.number)).filter(n => !isNaN(n)); setForm(f => ({ ...f, number: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0") })); } setAdding(!adding); }}>+ Add CO</button>
        </div>
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
              <label className="form-label">CO #</label>
              <input className="form-input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Submitted</label>
              <input className="form-input" type="date" value={form.submitted} onChange={e => setForm({ ...form, submitted: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Approved</label>
              <input className="form-input" type="date" value={form.approved} onChange={e => setForm({ ...form, approved: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>CO #</th><th>Project</th><th>Description</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Approved</th><th></th></tr></thead>
          <tbody>
            {coFiltered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center" }}>{app.search ? "No matching change orders" : "No change orders"}</td></tr>}
            {coFiltered.map(co => (
              <Fragment key={co.id}>
                <tr>
                  <td>{co.number}</td>
                  <td>{pName(co.projectId)}</td>
                  <td>{co.desc}</td>
                  <td>{app.fmt(co.amount)}</td>
                  <td><span className={badge(co.status)}>{co.status}</span></td>
                  <td>{co.submitted}</td>
                  <td>{co.approved || "—"}</td>
                  <td>
                    <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={() => impactId === co.id && impactResult ? setImpactId(null) : runImpact(co)}
                      disabled={impactLoading && impactId === co.id}>
                      {impactLoading && impactId === co.id ? "..." : impactId === co.id && impactResult ? "Hide" : "Analyze"}
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px", color: "var(--red)" }}
                      onClick={() => { if (confirm("Delete this change order?")) { app.setChangeOrders(prev => prev.filter(c => c.id !== co.id)); app.show("Change order deleted"); } }}>✕</button>
                    </div>
                  </td>
                </tr>
                {impactId === co.id && impactResult && (
                  <tr><td colSpan={8} style={{ padding: 0 }}>
                    <div style={{ padding: 16, background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
                      {/* Summary */}
                      <div className="text-sm mb-12">{impactResult.summary}</div>

                      {/* Margin Impact */}
                      {impactResult.marginImpact && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                          <div style={{ padding: 8, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                            <div className="text-xs text-muted">Before CO</div>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{impactResult.marginImpact.before}%</div>
                          </div>
                          <div style={{ padding: 8, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                            <div className="text-xs text-muted">After CO</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: impactResult.marginImpact.change >= 0 ? "var(--green)" : "var(--red)" }}>{impactResult.marginImpact.after}%</div>
                          </div>
                          <div style={{ padding: 8, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                            <div className="text-xs text-muted">Change</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: impactResult.marginImpact.change >= 0 ? "var(--green)" : "var(--red)" }}>
                              {impactResult.marginImpact.change >= 0 ? "+" : ""}{impactResult.marginImpact.change}%
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cumulative */}
                      {impactResult.cumulativeImpact && (
                        <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 12, fontSize: 13 }}>
                          <div className="flex-between mb-4">
                            <span className="font-semi">Total CO Exposure</span>
                            <span className="font-mono font-bold text-amber">{app.fmt(impactResult.cumulativeImpact.totalCOValue)}</span>
                          </div>
                          <div className="flex-between mb-4">
                            <span className="text-muted">% of Original Contract</span>
                            <span>{impactResult.cumulativeImpact.pctOfContract}%</span>
                          </div>
                          {impactResult.cumulativeImpact.note && <div className="text-xs text-muted">{impactResult.cumulativeImpact.note}</div>}
                        </div>
                      )}

                      {/* Cash Flow + Recommendation */}
                      {impactResult.cashFlowNote && (
                        <div style={{ padding: 8, marginBottom: 8, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", fontSize: 13 }}>
                          <span className="font-semi">Cash Flow: </span>{impactResult.cashFlowNote}
                        </div>
                      )}
                      {impactResult.recommendation && (
                        <div style={{ padding: 8, marginBottom: 8, borderRadius: 6, background: "rgba(59,130,246,0.1)", border: "1px solid var(--blue)", fontSize: 13 }}>
                          <span className="font-semi">Recommendation: </span>{impactResult.recommendation}
                        </div>
                      )}

                      {/* Risk Flags */}
                      {impactResult.riskFlags?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {impactResult.riskFlags.map((f, i) => (
                            <div key={i} style={{ padding: "4px 8px", fontSize: 12, color: "var(--red)" }}>{f}</div>
                          ))}
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

/* ── T&M Tickets ────────────────────────────────────────────── */
function TmTicketsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [justifyId, setJustifyId] = useState(null);
  const [justifyText, setJustifyText] = useState("");
  const [justifyLoading, setJustifyLoading] = useState(false);

  const runJustify = async (ticket) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setJustifyId(ticket.id);
    setJustifyLoading(true);
    setJustifyText("");
    try {
      const { justifyTmTicket } = await import("../utils/api.js");
      const project = app.projects.find(p => p.id === ticket.projectId);
      const text = await justifyTmTicket(app.apiKey, ticket, project);
      setJustifyText(text);
      app.show("Justification drafted", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setJustifyLoading(false);
    }
  };

  const [form, setForm] = useState({
    projectId: "", ticketNumber: "", date: new Date().toISOString().slice(0, 10), description: "", notes: "",
    laborEntries: [{ id: 1, employeeName: "", hours: "", rate: "65", description: "" }],
    materialEntries: [{ id: 1, item: "", qty: "", unit: "ea", unitCost: "", markup: "15" }],
  });

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const badge = (s) => s === "billed" ? "badge-blue" : s === "approved" ? "badge-green" : s === "submitted" ? "badge-amber" : "badge-gray";

  const calcLaborTotal = (entries) => entries.reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.rate) || 0), 0);
  const calcMatTotal = (entries) => entries.reduce((s, e) => {
    const base = (Number(e.qty) || 0) * (Number(e.unitCost) || 0);
    return s + base + base * (Number(e.markup) || 0) / 100;
  }, 0);
  const calcTicketTotal = (t) => calcLaborTotal(t.laborEntries) + calcMatTotal(t.materialEntries);

  // KPIs
  const allTickets = app.tmTickets || [];
  const totalValue = allTickets.reduce((s, t) => s + calcTicketTotal(t), 0);
  const pendingValue = allTickets.filter(t => t.status === "draft" || t.status === "submitted").reduce((s, t) => s + calcTicketTotal(t), 0);
  const approvedValue = allTickets.filter(t => t.status === "approved" || t.status === "billed").reduce((s, t) => s + calcTicketTotal(t), 0);

  const addLaborRow = () => setForm(f => ({ ...f, laborEntries: [...f.laborEntries, { id: Date.now(), employeeName: "", hours: "", rate: "65", description: "" }] }));
  const addMatRow = () => setForm(f => ({ ...f, materialEntries: [...f.materialEntries, { id: Date.now(), item: "", qty: "", unit: "ea", unitCost: "", markup: "15" }] }));
  const updateLabor = (id, field, val) => setForm(f => ({ ...f, laborEntries: f.laborEntries.map(e => e.id === id ? { ...e, [field]: val } : e) }));
  const updateMat = (id, field, val) => setForm(f => ({ ...f, materialEntries: f.materialEntries.map(e => e.id === id ? { ...e, [field]: val } : e) }));
  const removeLabor = (id) => setForm(f => ({ ...f, laborEntries: f.laborEntries.filter(e => e.id !== id) }));
  const removeMat = (id) => setForm(f => ({ ...f, materialEntries: f.materialEntries.filter(e => e.id !== id) }));

  const save = () => {
    if (!form.projectId || !form.ticketNumber) return app.show("Project and ticket # required", "err");
    if (form.laborEntries.every(e => !e.hours) && form.materialEntries.every(e => !e.qty)) return app.show("Add at least one labor or material entry", "err");
    const newTicket = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      ticketNumber: form.ticketNumber,
      date: form.date,
      status: "draft",
      description: form.description,
      laborEntries: form.laborEntries.filter(e => e.hours && e.employeeName).map((e, i) => ({ ...e, id: i + 1, hours: Number(e.hours), rate: Number(e.rate) })),
      materialEntries: form.materialEntries.filter(e => e.qty && e.item).map((e, i) => ({ ...e, id: i + 1, qty: Number(e.qty), unitCost: Number(e.unitCost), markup: Number(e.markup) })),
      submittedDate: null, approvedDate: null, billedDate: null,
      notes: form.notes,
    };
    app.setTmTickets(prev => [...prev, newTicket]);
    app.show("T&M ticket created", "ok");
    setAdding(false);
    setForm({ projectId: "", ticketNumber: "", date: new Date().toISOString().slice(0, 10), description: "", notes: "",
      laborEntries: [{ id: 1, employeeName: "", hours: "", rate: "65", description: "" }],
      materialEntries: [{ id: 1, item: "", qty: "", unit: "ea", unitCost: "", markup: "15" }],
    });
  };

  const updateStatus = (id, newStatus) => {
    const now = new Date().toISOString().slice(0, 10);
    app.setTmTickets(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updates = { status: newStatus };
      if (newStatus === "submitted") updates.submittedDate = now;
      if (newStatus === "approved") updates.approvedDate = now;
      if (newStatus === "billed") updates.billedDate = now;
      return { ...t, ...updates };
    }));
    app.show(`Ticket marked ${newStatus}`, "ok");
  };

  const deleteTicket = (id) => {
    app.setTmTickets(prev => prev.filter(t => t.id !== id));
    app.show("Ticket deleted", "ok");
    setExpandedId(null);
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
          <div className="kpi-card" style={{ minWidth: 100 }}><span className="text2">Total T&M</span><strong>{app.fmt(totalValue)}</strong></div>
          <div className="kpi-card" style={{ minWidth: 100 }}><span className="text2">Pending</span><strong>{app.fmt(pendingValue)}</strong></div>
          <div className="kpi-card" style={{ minWidth: 100 }}><span className="text2">Approved</span><strong>{app.fmt(approvedValue)}</strong></div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ New T&M Ticket</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="card-header">New T&M Ticket</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ticket # *</label>
              <input className="form-input" value={form.ticketNumber} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} placeholder="TM-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the extra work..." />
          </div>

          {/* Labor entries */}
          <div style={{ marginTop: 16 }}>
            <div className="flex-between">
              <strong className="text2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Labor</strong>
              <button className="btn btn-ghost btn-sm" onClick={addLaborRow} style={{ fontSize: 11 }}>+ Add Row</button>
            </div>
            {form.laborEntries.map(e => (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr auto", gap: 8, marginTop: 6, alignItems: "end" }}>
                <input className="form-input" placeholder="Employee" value={e.employeeName} onChange={ev => updateLabor(e.id, "employeeName", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Hours" value={e.hours} onChange={ev => updateLabor(e.id, "hours", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Rate" value={e.rate} onChange={ev => updateLabor(e.id, "rate", ev.target.value)} />
                <input className="form-input" placeholder="Work performed" value={e.description} onChange={ev => updateLabor(e.id, "description", ev.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeLabor(e.id)} style={{ color: "var(--red)", padding: "4px 8px" }}>x</button>
              </div>
            ))}
            <div className="text2 mt-8" style={{ fontSize: 11 }}>Labor subtotal: {app.fmt(calcLaborTotal(form.laborEntries))}</div>
          </div>

          {/* Material entries */}
          <div style={{ marginTop: 16 }}>
            <div className="flex-between">
              <strong className="text2" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Materials</strong>
              <button className="btn btn-ghost btn-sm" onClick={addMatRow} style={{ fontSize: 11 }}>+ Add Row</button>
            </div>
            {form.materialEntries.map(e => (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, marginTop: 6, alignItems: "end" }}>
                <input className="form-input" placeholder="Material" value={e.item} onChange={ev => updateMat(e.id, "item", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Qty" value={e.qty} onChange={ev => updateMat(e.id, "qty", ev.target.value)} />
                <input className="form-input" placeholder="Unit" value={e.unit} onChange={ev => updateMat(e.id, "unit", ev.target.value)} />
                <input className="form-input" type="number" placeholder="$/Unit" value={e.unitCost} onChange={ev => updateMat(e.id, "unitCost", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Markup%" value={e.markup} onChange={ev => updateMat(e.id, "markup", ev.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeMat(e.id)} style={{ color: "var(--red)", padding: "4px 8px" }}>x</button>
              </div>
            ))}
            <div className="text2 mt-8" style={{ fontSize: 11 }}>Materials subtotal: {app.fmt(calcMatTotal(form.materialEntries))}</div>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes, approval references..." />
          </div>

          <div className="flex-between mt-16">
            <div style={{ fontSize: 14, fontWeight: 700 }}>Ticket Total: {app.fmt(calcLaborTotal(form.laborEntries) + calcMatTotal(form.materialEntries))}</div>
            <div className="flex gap-8">
              <button className="btn btn-primary btn-sm" onClick={save}>Save Draft</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets list */}
      <div className="mt-16">
        {allTickets.length === 0 && <div className="card" style={{ textAlign: "center" }}>No T&M tickets</div>}
        {allTickets.map(t => {
          const total = calcTicketTotal(t);
          const isExpanded = expandedId === t.id;
          return (
            <div className="card mt-8" key={t.id} style={{ cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
              <div className="flex-between">
                <div>
                  <strong>{t.ticketNumber}</strong>
                  <span className="text2" style={{ marginLeft: 8 }}>{pName(t.projectId)}</span>
                </div>
                <div className="flex gap-8" style={{ alignItems: "center" }}>
                  <strong>{app.fmt(total)}</strong>
                  <span className={badge(t.status)}>{t.status}</span>
                </div>
              </div>
              <div className="text2" style={{ fontSize: 12, marginTop: 4 }}>{t.date} — {t.description}</div>

              {isExpanded && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }} onClick={e => e.stopPropagation()}>
                  {/* Labor breakdown */}
                  {t.laborEntries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <strong className="text2" style={{ fontSize: 11, textTransform: "uppercase" }}>Labor</strong>
                      <table className="data-table" style={{ marginTop: 4 }}>
                        <thead><tr><th>Employee</th><th>Hours</th><th>Rate</th><th>Description</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
                        <tbody>
                          {t.laborEntries.map(e => (
                            <tr key={e.id}>
                              <td>{e.employeeName}</td>
                              <td>{e.hours}</td>
                              <td>{app.fmt(e.rate)}/hr</td>
                              <td>{e.description}</td>
                              <td style={{ textAlign: "right" }}>{app.fmt(e.hours * e.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text2" style={{ textAlign: "right", fontSize: 11, marginTop: 4 }}>Labor: {app.fmt(calcLaborTotal(t.laborEntries))}</div>
                    </div>
                  )}

                  {/* Materials breakdown */}
                  {t.materialEntries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <strong className="text2" style={{ fontSize: 11, textTransform: "uppercase" }}>Materials</strong>
                      <table className="data-table" style={{ marginTop: 4 }}>
                        <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Markup</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
                        <tbody>
                          {t.materialEntries.map(e => {
                            const base = e.qty * e.unitCost;
                            const withMarkup = base + base * e.markup / 100;
                            return (
                              <tr key={e.id}>
                                <td>{e.item}</td>
                                <td>{e.qty}</td>
                                <td>{e.unit}</td>
                                <td>{app.fmt(e.unitCost)}</td>
                                <td>{e.markup}%</td>
                                <td style={{ textAlign: "right" }}>{app.fmt(withMarkup)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="text2" style={{ textAlign: "right", fontSize: 11, marginTop: 4 }}>Materials: {app.fmt(calcMatTotal(t.materialEntries))}</div>
                    </div>
                  )}

                  {t.notes && <div className="text2" style={{ fontSize: 12, fontStyle: "italic", marginBottom: 8 }}>{t.notes}</div>}

                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", fontSize: 11 }}>
                    {t.submittedDate && <span className="text2">Submitted: {t.submittedDate}</span>}
                    {t.approvedDate && <span className="text2">Approved: {t.approvedDate}</span>}
                    {t.billedDate && <span className="text2">Billed: {t.billedDate}</span>}
                  </div>

                  <div className="flex gap-8 mt-8">
                    {t.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, "submitted")}>Mark Submitted</button>}
                    {t.status === "submitted" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, "approved")}>Mark Approved</button>}
                    {t.status === "approved" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, "billed")}>Mark Billed</button>}
                    {t.status === "approved" && (
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--green)" }} onClick={() => {
                        const labTotal = (t.laborEntries || []).reduce((s, e) => s + e.hours * e.rate, 0);
                        const matTotal = (t.materialEntries || []).reduce((s, e) => { const b = e.qty * e.unitCost; return s + b + b * e.markup / 100; }, 0);
                        const total = labTotal + matTotal;
                        const invNum = `T&M-${t.number || t.id}`;
                        if (app.invoices.some(i => i.number === invNum)) { app.show("Invoice already exists for this T&M", "err"); return; }
                        const newInv = {
                          id: app.nextId(), projectId: t.projectId, number: invNum,
                          date: new Date().toISOString().slice(0, 10), amount: Math.round(total * 100) / 100,
                          status: "pending", desc: `T&M Ticket ${t.number || t.id} — ${(t.laborEntries || []).length} labor + ${(t.materialEntries || []).length} material entries`,
                          paidDate: null,
                        };
                        app.setInvoices(prev => [...prev, newInv]);
                        updateStatus(t.id, "billed");
                        app.show(`Invoice ${invNum} created for ${app.fmt(total)}`);
                      }}>Generate Invoice</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => runJustify(t)} disabled={justifyLoading && justifyId === t.id}>
                      {justifyLoading && justifyId === t.id ? "Drafting..." : "AI Justify"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      const labTotal = calcLaborTotal(t.laborEntries);
                      const matTotal = calcMatTotal(t.materialEntries);
                      const grandTotal = labTotal + matTotal;
                      const projN = pName(t.projectId);
                      const html = `<!DOCTYPE html><html><head><title>T&M Ticket ${t.ticketNumber}</title><style>
                        body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#111}
                        h1{font-size:22px;margin:0 0 4px} .header{border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
                        .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:16px}
                        .meta span{color:#666} table{width:100%;border-collapse:collapse;margin:8px 0 16px}
                        th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;text-align:left}
                        th{background:#f5f5f5;font-weight:600}
                        .subtotal{text-align:right;font-size:12px;margin:4px 0 12px;color:#444}
                        .grand-total{font-size:16px;font-weight:700;text-align:right;border-top:2px solid #333;padding-top:8px;margin-top:8px}
                        .sig-line{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:48px}
                        .sig-line div{border-top:1px solid #666;padding-top:4px;font-size:11px;color:#666}
                        .company{font-size:18px;font-weight:700;color:#b45309} @media print{body{padding:12px}}
                      </style></head><body>
                        <div class="header"><div class="company">Eagles Brothers Constructors</div><h1>T&M Ticket: ${t.ticketNumber}</h1></div>
                        <div class="meta">
                          <div><span>Project:</span> ${projN}</div>
                          <div><span>Date:</span> ${t.date}</div>
                          <div><span>Status:</span> ${t.status}</div>
                          <div><span>Description:</span> ${t.description || 'N/A'}</div>
                        </div>
                        ${t.laborEntries.length > 0 ? '<h3>Labor</h3><table><thead><tr><th>Employee</th><th>Hours</th><th>Rate</th><th>Description</th><th>Total</th></tr></thead><tbody>' + t.laborEntries.map(e => '<tr><td>'+e.employeeName+'</td><td>'+e.hours+'</td><td>$'+e.rate+'/hr</td><td>'+(e.description||'')+'</td><td>$'+(e.hours*e.rate).toFixed(2)+'</td></tr>').join('') + '</tbody></table><div class="subtotal">Labor Subtotal: $'+labTotal.toFixed(2)+'</div>' : ''}
                        ${t.materialEntries.length > 0 ? '<h3>Materials</h3><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Markup</th><th>Total</th></tr></thead><tbody>' + t.materialEntries.map(e => {const b=e.qty*e.unitCost;const wm=b+b*e.markup/100;return '<tr><td>'+e.item+'</td><td>'+e.qty+'</td><td>'+e.unit+'</td><td>$'+e.unitCost.toFixed(2)+'</td><td>'+e.markup+'%</td><td>$'+wm.toFixed(2)+'</td></tr>';}).join('') + '</tbody></table><div class="subtotal">Materials Subtotal: $'+matTotal.toFixed(2)+'</div>' : ''}
                        <div class="grand-total">TOTAL: $${grandTotal.toFixed(2)}</div>
                        ${t.notes ? '<div style="margin-top:16px;font-size:12px"><strong>Notes:</strong> '+t.notes+'</div>' : ''}
                        <div class="sig-line"><div>Contractor Signature / Date</div><div>GC Approval / Date</div></div>
                      </body></html>`;
                      const w = window.open('', '_blank');
                      w.document.write(html);
                      w.document.close();
                      w.setTimeout(() => w.print(), 300);
                    }}>Print PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteTicket(t.id)} style={{ color: "var(--red)" }}>Delete</button>
                  </div>

                  {/* AI Justification */}
                  {justifyId === t.id && justifyText && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div className="flex-between mb-8">
                        <span className="font-semi text-sm">AI Justification Narrative</span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
                          navigator.clipboard.writeText(justifyText);
                          app.show("Justification copied to clipboard", "ok");
                        }}>Copy</button>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>{justifyText}</div>
                      <div className="flex gap-8 mt-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => runJustify(t)}>Regenerate</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Job Costing ─────────────────────────────────────────────── */
function JobCostingTab({ app }) {
  const calcTicketTotal = (t) => {
    const labor = t.laborEntries.reduce((s, e) => s + (e.hours || 0) * (e.rate || 0), 0);
    const mat = t.materialEntries.reduce((s, e) => { const b = (e.qty || 0) * (e.unitCost || 0); return s + b + b * (e.markup || 0) / 100; }, 0);
    return labor + mat;
  };

  const [varianceResult, setVarianceResult] = useState(null);
  const [varianceLoading, setVarianceLoading] = useState(false);
  const [showVariance, setShowVariance] = useState(false);

  const runVarianceAnalysis = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setVarianceLoading(true);
    setVarianceResult(null);
    setShowVariance(true);
    try {
      const { analyzeJobCostVariance } = await import("../utils/api.js");
      const projectData = app.projects.map(proj => {
        const billed = app.invoices.filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
        const cos = app.changeOrders.filter(c => c.projectId === proj.id && c.status === "approved").reduce((s, c) => s + c.amount, 0);
        const tmTickets = (app.tmTickets || []).filter(t => t.projectId === proj.id);
        const tmApproved = tmTickets.filter(t => t.status === "approved" || t.status === "billed").reduce((s, t) => s + calcTicketTotal(t), 0);
        const tmPending = tmTickets.filter(t => t.status === "draft" || t.status === "submitted").reduce((s, t) => s + calcTicketTotal(t), 0);
        return {
          name: proj.name || proj.project, gc: proj.gc, contract: proj.contract,
          billed, approvedCOs: cos, tmApproved, tmPending, tmCount: tmTickets.length,
          progress: proj.progress, margin: proj.margin, phase: proj.phase, scope: proj.scope,
        };
      });
      const result = await analyzeJobCostVariance(app.apiKey, projectData);
      setVarianceResult(result);
      app.show("Variance analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setVarianceLoading(false);
    }
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Job Costing by Project</div>
        <button className="btn btn-ghost btn-sm" onClick={runVarianceAnalysis} disabled={varianceLoading}>
          {varianceLoading ? "Analyzing..." : "AI Variance Analysis"}
        </button>
      </div>

      {/* Variance Analysis Panel */}
      {showVariance && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Cost Variance Analysis</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowVariance(false); setVarianceResult(null); }}>Close</button>
          </div>
          {varianceLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing cost data across {app.projects.length} projects...</div>}
          {varianceResult && (
            <div style={{ marginTop: 8 }}>
              {/* Summary */}
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>{varianceResult.summary}</div>

              {/* Portfolio Summary */}
              {varianceResult.portfolioSummary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Total Contract", val: app.fmt(varianceResult.portfolioSummary.totalContract) },
                    { label: "Total Billed", val: app.fmt(varianceResult.portfolioSummary.totalBilled) },
                    { label: "Remaining", val: app.fmt(varianceResult.portfolioSummary.totalRemaining) },
                    { label: "At-Risk Value", val: app.fmt(varianceResult.portfolioSummary.atRiskValue), color: "var(--red)" },
                  ].map((kpi, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                      <div className="text-xs text-muted">{kpi.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: kpi.color || "var(--amber)", marginTop: 4 }}>{kpi.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Rankings */}
              {varianceResult.rankings?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Project Health Rankings</div>
                  {varianceResult.rankings.map((r, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, borderLeft: `3px solid ${r.healthScore >= 70 ? "var(--green)" : r.healthScore >= 40 ? "var(--amber)" : "var(--red)"}`, background: "var(--card)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{r.project}</span>
                        <span style={{ fontWeight: 700, color: r.healthScore >= 70 ? "var(--green)" : r.healthScore >= 40 ? "var(--amber)" : "var(--red)" }}>{r.healthScore}/100</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.billedPct}% billed • {r.marginStatus}</div>
                      {r.alert && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{r.alert}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Cash Flow Risks */}
              {varianceResult.cashFlowRisk?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Cash Flow Risks</div>
                  {varianceResult.cashFlowRisk.filter(r => r.risk !== "low").map((r, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span>{r.project}</span>
                        <span className={r.risk === "high" ? "badge-red" : "badge-amber"}>{r.risk}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.note}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {varianceResult.recommendations?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Recommendations</div>
                  {varianceResult.recommendations.map((r, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span>{r.action}</span>
                        <span className={r.priority === "high" ? "badge-red" : r.priority === "medium" ? "badge-amber" : "badge-blue"}>{r.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.project} — {r.impact}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {app.projects.length === 0 && <div className="card mt-16" style={{ textAlign: "center" }}>No projects</div>}
      {app.projects.map(proj => {
        const billed = app.invoices.filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
        const cos = app.changeOrders.filter(c => c.projectId === proj.id && c.status === "approved").reduce((s, c) => s + c.amount, 0);
        const tmTickets = (app.tmTickets || []).filter(t => t.projectId === proj.id);
        const tmApproved = tmTickets.filter(t => t.status === "approved" || t.status === "billed").reduce((s, t) => s + calcTicketTotal(t), 0);
        const tmPending = tmTickets.filter(t => t.status === "draft" || t.status === "submitted").reduce((s, t) => s + calcTicketTotal(t), 0);
        const adjustedContract = proj.contract + cos;
        const remaining = adjustedContract - billed;
        const pct = adjustedContract > 0 ? Math.round((billed / adjustedContract) * 100) : 0;
        // Labor cost rollup from time entries
        const BLENDED_RATE = 45;
        const projEntries = (app.timeEntries || []).filter(te => te.projectName === proj.name && te.clockIn && te.clockOut);
        const laborHours = projEntries.reduce((s, te) => s + (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000, 0);
        const laborCost = laborHours * BLENDED_RATE;
        const laborVariance = adjustedContract > 0 ? adjustedContract - laborCost : 0;
        return (
          <div className="card mt-16" key={proj.id}>
            <div className="flex-between">
              <strong>{proj.name}</strong>
              <span className="text2">{pct}% Billed</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 12 }}>
              <div><span className="text2">Contract</span><br />{app.fmt(proj.contract)}</div>
              <div><span className="text2">Approved COs</span><br />{app.fmt(cos)}</div>
              <div><span className="text2">Total Billed</span><br />{app.fmt(billed)}</div>
              <div><span className="text2">Remaining</span><br />{app.fmt(remaining)}</div>
            </div>
            {/* Labor Cost Rollup */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
              <div><span className="text2">Labor Hours</span><br /><span className="font-mono">{laborHours.toFixed(1)}h</span></div>
              <div><span className="text2">Labor Cost</span><br /><span className="font-mono" style={{ color: "var(--amber)" }}>{app.fmt(laborCost)}</span></div>
              <div><span className="text2">Budget Remaining</span><br /><span className="font-mono" style={{ color: laborVariance >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(laborVariance)}</span></div>
              <div><span className="text2">Labor Margin</span><br /><span className="font-mono" style={{ color: adjustedContract > 0 && laborCost / adjustedContract < 0.7 ? "var(--green)" : "var(--amber)" }}>{adjustedContract > 0 ? Math.round((1 - laborCost / adjustedContract) * 100) : 0}%</span></div>
            </div>
            {(tmApproved > 0 || tmPending > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <div><span className="text2">T&M Approved</span><br /><span style={{ color: "var(--green)" }}>{app.fmt(tmApproved)}</span></div>
                <div><span className="text2">T&M Pending</span><br /><span style={{ color: "var(--amber)" }}>{app.fmt(tmPending)}</span></div>
                <div><span className="text2">T&M Tickets</span><br />{tmTickets.length}</div>
              </div>
            )}
            <div style={{ background: "var(--bg4)", borderRadius: 4, height: 8, marginTop: 12 }}>
              <div style={{ background: "var(--amber)", height: "100%", borderRadius: 4, width: `${Math.min(pct, 100)}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENTS
   ══════════════════════════════════════════════════════════════ */
function Documents({ app }) {
  const [sub, setSub] = useState("RFIs");
  return (
    <div>
      <SubTabs tabs={["RFIs", "Submittals"]} active={sub} onChange={setSub} />
      {sub === "RFIs" && <RfisTab app={app} />}
      {sub === "Submittals" && <SubmittalsTab app={app} />}
    </div>
  );
}

/* ── RFIs ─────────────────────────────────────────────────────── */
function RfisTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", number: "", subject: "", status: "open", submitted: "", assigned: "", attachments: [] });
  const [draftId, setDraftId] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const badge = (s) => s === "open" ? "badge-amber" : s === "answered" ? "badge-green" : "badge-muted";

  const rfiFiltered = app.rfis.filter(rfi => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return rfi.number.toLowerCase().includes(q) || pName(rfi.projectId).toLowerCase().includes(q) || (rfi.subject || "").toLowerCase().includes(q) || (rfi.assigned || "").toLowerCase().includes(q);
  });

  const runDraftResponse = async (rfi) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setDraftId(rfi.id);
    setDraftLoading(true);
    setDraftText("");
    try {
      const { draftRfiResponse } = await import("../utils/api.js");
      const project = app.projects.find(p => p.id === rfi.projectId);
      const text = await draftRfiResponse(app.apiKey, rfi, project);
      setDraftText(text);
      app.show("RFI response drafted", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setDraftLoading(false);
    }
  };

  const save = () => {
    if (!form.number || !form.subject) return app.show("Fill required fields", "err");
    // Convert file objects to storable format (name, size, dataURL)
    const attachmentData = form.attachments.map(a => ({ name: a.name, size: a.size, type: a.type, dataUrl: a.dataUrl }));
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      number: form.number,
      subject: form.subject,
      status: form.status,
      submitted: form.submitted,
      assigned: form.assigned,
      response: "",
      responseDate: null,
      attachments: attachmentData,
    };
    app.setRfis(prev => [...prev, newItem]);
    app.show("RFI added", "ok");
    setAdding(false);
    setForm({ projectId: "", number: "", subject: "", status: "open", submitted: "", assigned: "", attachments: [] });
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">RFIs</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["RFI #","Project","Subject","Status","Submitted","Assigned","Response Date"];
            const rows = app.rfis.map(r => [r.number, `"${pName(r.projectId)}"`, `"${(r.subject||'').replace(/"/g,'""')}"`, r.status||'', r.submitted||'', `"${(r.assigned||'').replace(/"/g,'""')}"`, r.responseDate||'']);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_rfis.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("RFIs CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { const nums = app.rfis.map(r => parseInt(r.number)).filter(n => !isNaN(n)); setForm(f => ({ ...f, number: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0") })); } setAdding(!adding); }}>+ Add RFI</button>
        </div>
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
              <label className="form-label">RFI #</label>
              <input className="form-input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="open">Open</option>
                <option value="answered">Answered</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Submitted</label>
              <input className="form-input" type="date" value={form.submitted} onChange={e => setForm({ ...form, submitted: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <input className="form-input" value={form.assigned} onChange={e => setForm({ ...form, assigned: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Attachments</label>
            <input className="form-input" type="file" multiple onChange={e => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              const readers = files.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: file.name, size: file.size, type: file.type, dataUrl: reader.result });
                reader.readAsDataURL(file);
              }));
              Promise.all(readers).then(results => {
                setForm(f => ({ ...f, attachments: [...f.attachments, ...results] }));
              });
            }} style={{ fontSize: 12 }} />
            {form.attachments.length > 0 && (
              <div className="flex gap-4 flex-wrap mt-8">
                {form.attachments.map((a, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "2px 8px", background: "var(--bg3)", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {a.name} ({(a.size / 1024).toFixed(0)} KB)
                    <span style={{ cursor: "pointer", color: "var(--red)", fontWeight: 700 }} onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))}>x</span>
                  </span>
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
          <thead><tr><th>RFI #</th><th>Project</th><th>Subject</th><th>Status</th><th>Submitted</th><th>Assigned</th><th>Response Date</th><th></th></tr></thead>
          <tbody>
            {rfiFiltered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center" }}>{app.search ? "No matching RFIs" : "No RFIs"}</td></tr>}
            {rfiFiltered.map(rfi => (
              <Fragment key={rfi.id}>
                <tr>
                  <td>{rfi.number}</td>
                  <td>{pName(rfi.projectId)}</td>
                  <td>
                    {rfi.subject}
                    {(rfi.attachments || []).length > 0 && (
                      <div className="flex gap-4 flex-wrap" style={{ marginTop: 4 }}>
                        {rfi.attachments.map((a, ai) => (
                          <a key={ai} href={a.dataUrl} download={a.name} style={{ fontSize: 10, color: "var(--blue)", textDecoration: "underline", cursor: "pointer" }} onClick={e => e.stopPropagation()}>
                            {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td><span className={badge(rfi.status)}>{rfi.status}</span></td>
                  <td>{rfi.submitted}</td>
                  <td>{rfi.assigned}</td>
                  <td>{rfi.responseDate || "—"}</td>
                  <td>
                    <div className="flex gap-4">
                    {rfi.status === "open" && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => draftId === rfi.id && draftText ? setDraftId(null) : runDraftResponse(rfi)}
                        disabled={draftLoading && draftId === rfi.id}>
                        {draftLoading && draftId === rfi.id ? "..." : draftId === rfi.id && draftText ? "Hide" : "Draft Response"}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px", color: "var(--red)" }}
                      onClick={() => { if (confirm("Delete this RFI?")) { app.setRfis(prev => prev.filter(r => r.id !== rfi.id)); app.show("RFI deleted"); } }}>✕</button>
                    </div>
                  </td>
                </tr>
                {draftId === rfi.id && draftText && (
                  <tr><td colSpan={8} style={{ padding: 0 }}>
                    <div style={{ padding: 16, background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
                      <div className="flex-between mb-8">
                        <span className="font-semi text-sm">AI-Drafted Response</span>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
                          navigator.clipboard.writeText(draftText);
                          app.show("Response copied to clipboard", "ok");
                        }}>Copy</button>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, padding: 12, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)" }}>
                        {draftText}
                      </div>
                      <div className="flex gap-8 mt-8">
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          app.setRfis(prev => prev.map(r => r.id === rfi.id ? { ...r, status: "answered", response: draftText, responseDate: new Date().toISOString().slice(0, 10) } : r));
                          setDraftId(null);
                          setDraftText("");
                          app.show("RFI marked as answered", "ok");
                        }}>Accept & Close RFI</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => runDraftResponse(rfi)}>Regenerate</button>
                      </div>
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

/* ── Submittals ──────────────────────────────────────────────── */
function SubmittalsTab({ app }) {
  const emptyForm = () => ({
    projectId: "", number: "", desc: "", specSection: "", status: "preparing",
    submitted: "", due: "", pdfFile: null, linkedMaterialIds: [], linkedAssemblyCodes: [],
  });

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editSub, setEditSub] = useState(null); // submittal being edited
  const [uploading, setUploading] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const subFiltered = app.submittals.filter(sub => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return (sub.number || "").toLowerCase().includes(q) || pName(sub.projectId).toLowerCase().includes(q) || (sub.desc || "").toLowerCase().includes(q) || (sub.specSection || "").toLowerCase().includes(q);
  });

  const runReview = async (sub) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setReviewId(sub.id);
    setReviewLoading(true);
    setReviewResult(null);
    try {
      const { reviewSubmittal } = await import("../utils/api.js");
      const project = app.projects.find(p => p.id === sub.projectId);
      const linkedAsms = (sub.linkedAssemblyCodes || []).map(code => (app.assemblies || ASSEMBLIES).find(a => a.code === code)).filter(Boolean);
      const linkedMats = (sub.linkedMaterialIds || []).map(id => (app.materials || []).find(m => m.id === id)).filter(Boolean);
      const result = await reviewSubmittal(app.apiKey, sub, project, linkedAsms, linkedMats);
      setReviewResult(result);
      app.show("Submittal review complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setReviewLoading(false);
    }
  };

  const badge = (s) => s === "preparing" ? "badge-amber" : s === "submitted" ? "badge-blue" : s === "approved" ? "badge-green" : "badge-red";
  const matName = (id) => (app.materials || []).find(m => m.id === id)?.name || id;
  const asmName = (code) => (app.assemblies || ASSEMBLIES).find(a => a.code === code)?.name || code;

  // Save new submittal
  const save = async () => {
    if (!form.number || !form.desc) return app.show("Fill required fields", "err");
    setUploading(true);
    let pdfData = { pdfKey: null, pdfName: null, pdfSize: null };
    const newId = app.nextId();
    if (form.pdfFile) {
      try { pdfData = await storePdf(newId, form.pdfFile); } catch (e) { console.error(e); }
    }
    const newItem = {
      id: newId, projectId: Number(form.projectId), number: form.number,
      desc: form.desc, specSection: form.specSection, status: form.status,
      submitted: form.submitted || null, due: form.due,
      ...pdfData,
      linkedMaterialIds: form.linkedMaterialIds,
      linkedAssemblyCodes: form.linkedAssemblyCodes,
    };
    app.setSubmittals(prev => [...prev, newItem]);
    app.show("Submittal added");
    setAdding(false);
    setForm(emptyForm());
    setUploading(false);
  };

  // Open edit modal
  const openEdit = (sub) => {
    setEditSub({ ...sub });
  };

  // Save edit
  const saveEdit = async () => {
    if (!editSub) return;
    setUploading(true);
    let pdfData = { pdfKey: editSub.pdfKey, pdfName: editSub.pdfName, pdfSize: editSub.pdfSize };
    if (editSub._newPdfFile) {
      if (editSub.pdfKey) await deletePdf(editSub.pdfKey);
      try { pdfData = await storePdf(editSub.id, editSub._newPdfFile); } catch (e) { console.error(e); }
    }
    const updated = { ...editSub, ...pdfData };
    delete updated._newPdfFile;
    app.setSubmittals(prev => prev.map(s => s.id === updated.id ? updated : s));
    app.show("Submittal updated");
    setEditSub(null);
    setUploading(false);
  };

  // Remove PDF
  const removePdf = async (sub) => {
    if (sub.pdfKey) await deletePdf(sub.pdfKey);
    if (editSub && editSub.id === sub.id) {
      setEditSub(prev => ({ ...prev, pdfKey: null, pdfName: null, pdfSize: null, _newPdfFile: null }));
    }
    app.setSubmittals(prev => prev.map(s => s.id === sub.id ? { ...s, pdfKey: null, pdfName: null, pdfSize: null } : s));
  };

  // View PDF
  const viewPdf = async (pdfKey) => {
    const url = await getPdfUrl(pdfKey);
    if (url) window.open(url, "_blank");
    else app.show("PDF not found in storage", "err");
  };

  // Toggle linked material
  const toggleMat = (id, isEdit) => {
    const setter = isEdit ? (fn) => setEditSub(prev => ({ ...prev, linkedMaterialIds: fn(prev.linkedMaterialIds || []) }))
      : (fn) => setForm(prev => ({ ...prev, linkedMaterialIds: fn(prev.linkedMaterialIds || []) }));
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Toggle linked assembly
  const toggleAsm = (code, isEdit) => {
    const setter = isEdit ? (fn) => setEditSub(prev => ({ ...prev, linkedAssemblyCodes: fn(prev.linkedAssemblyCodes || []) }))
      : (fn) => setForm(prev => ({ ...prev, linkedAssemblyCodes: fn(prev.linkedAssemblyCodes || []) }));
    setter(prev => prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]);
  };

  // Linked product pills renderer
  const renderLinked = (sub) => {
    const mats = sub.linkedMaterialIds || [];
    const asms = sub.linkedAssemblyCodes || [];
    if (mats.length === 0 && asms.length === 0) return <span style={{ fontSize: 11, color: "var(--text3)" }}>None</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {asms.map(code => (
          <span key={code} style={{ fontSize: 10, padding: "1px 6px", background: "rgba(59,130,246,0.15)", color: "#3b82f6", borderRadius: 8 }}>{code}</span>
        ))}
        {mats.map(id => (
          <span key={id} style={{ fontSize: 10, padding: "1px 6px", background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 8 }}>{id}</span>
        ))}
      </div>
    );
  };

  // Searchable link picker component
  const SearchableLinkPicker = ({ label, items, selectedIds, onToggle, getKey, getLabel, badgeColor }) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const filtered = search.trim()
      ? items.filter(item => getLabel(item).toLowerCase().includes(search.toLowerCase()))
      : items.slice(0, 10);
    return (
      <div className="form-group full" style={{ position: "relative" }}>
        <label className="form-label">{label}</label>
        {/* Selected pills */}
        {selectedIds.length > 0 && (
          <div className="flex gap-4 flex-wrap" style={{ marginBottom: 6 }}>
            {selectedIds.map(id => {
              const item = items.find(i => getKey(i) === id);
              return (
                <span key={id} style={{ fontSize: 11, padding: "2px 8px", background: badgeColor || "rgba(59,130,246,0.15)", color: badgeColor ? "#fff" : "#3b82f6", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {item ? (getLabel(item).length > 30 ? getLabel(item).slice(0, 27) + "..." : getLabel(item)) : id}
                  <span style={{ cursor: "pointer", fontWeight: 700 }} onClick={() => onToggle(id)}>x</span>
                </span>
              );
            })}
          </div>
        )}
        {/* Search input */}
        <input
          className="form-input"
          placeholder={`Type to search ${label.toLowerCase()}...`}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{ fontSize: 12 }}
        />
        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 50, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, maxHeight: 180, overflowY: "auto", boxShadow: "var(--shadow)" }}>
            {filtered.map(item => {
              const key = getKey(item);
              const isSelected = selectedIds.includes(key);
              return (
                <div key={key}
                  style={{ padding: "6px 10px", fontSize: 12, cursor: "pointer", background: isSelected ? "var(--amber-dim)" : "transparent", borderBottom: "1px solid var(--border)" }}
                  onMouseDown={e => { e.preventDefault(); onToggle(key); setSearch(""); }}
                >
                  {isSelected ? "✓ " : ""}{getLabel(item)}
                </div>
              );
            })}
            {search.trim() && filtered.length === 0 && (
              <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text3)" }}>No matches</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Material/Assembly picker (shared by add and edit forms)
  const renderLinkPicker = (linkedMats, linkedAsms, isEdit) => (
    <>
      <SearchableLinkPicker
        label="Link Assemblies"
        items={app.assemblies || ASSEMBLIES}
        selectedIds={linkedAsms}
        onToggle={(code) => toggleAsm(code, isEdit)}
        getKey={a => a.code}
        getLabel={a => `${a.code} — ${a.name}`}
        badgeColor="rgba(59,130,246,0.15)"
      />
      <SearchableLinkPicker
        label="Link Materials"
        items={app.materials || []}
        selectedIds={linkedMats}
        onToggle={(id) => toggleMat(id, isEdit)}
        getKey={m => m.id}
        getLabel={m => m.name}
        badgeColor="rgba(16,185,129,0.15)"
      />
    </>
  );

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Submittals</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Sub #","Project","Description","Spec Section","Status","Submitted","Due"];
            const rows = app.submittals.map(s => [s.number, `"${pName(s.projectId)}"`, `"${(s.desc||'').replace(/"/g,'""')}"`, s.specSection||'', s.status||'', s.submitted||'', s.due||'']);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_submittals.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("Submittals CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { const nums = app.submittals.map(s => parseInt(s.number)).filter(n => !isNaN(n)); setForm(f => ({ ...f, number: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0") })); } setAdding(!adding); }}>+ Add Submittal</button>
        </div>
      </div>

      {/* ── Add form ── */}
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
              <label className="form-label">Submittal #</label>
              <input className="form-input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec Section</label>
              <input className="form-input" value={form.specSection} onChange={e => setForm({ ...form, specSection: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="preparing">Preparing</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="revise">Revise & Resubmit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Submitted</label>
              <input className="form-input" type="date" value={form.submitted} onChange={e => setForm({ ...form, submitted: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
          </div>
          <div className="form-group mt-8">
            <label className="form-label">Attach PDF</label>
            <div className="sub-pdf-upload">
              <input type="file" accept=".pdf" onChange={e => setForm({ ...form, pdfFile: e.target.files[0] || null })} />
              {form.pdfFile && <span className="text-xs text-dim">{form.pdfFile.name} ({fmtSize(form.pdfFile.size)})</span>}
            </div>
          </div>
          {renderLinkPicker(form.linkedMaterialIds, form.linkedAssemblyCodes, false)}
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={uploading}>{uploading ? "Saving..." : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setForm(emptyForm()); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Submittals table ── */}
      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead>
            <tr><th>Sub #</th><th>Project</th><th>Description</th><th>Spec</th><th>Status</th><th>PDF</th><th>Linked</th><th>Due</th><th></th></tr>
          </thead>
          <tbody>
            {subFiltered.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center" }}>{app.search ? "No matching submittals" : "No submittals"}</td></tr>}
            {subFiltered.map(sub => (
              <Fragment key={sub.id}>
                <tr onClick={() => openEdit(sub)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 600 }}>{sub.number}</td>
                  <td style={{ fontSize: 12 }}>{pName(sub.projectId)}</td>
                  <td>{sub.desc}</td>
                  <td style={{ fontSize: 12 }}>{sub.specSection}</td>
                  <td><span className={`badge ${badge(sub.status)}`}>{sub.status}</span></td>
                  <td>
                    {sub.pdfKey ? (
                      <button className="btn btn-sm btn-ghost" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); viewPdf(sub.pdfKey); }}>
                        {sub.pdfName || "View PDF"}
                      </button>
                    ) : <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>}
                  </td>
                  <td>{renderLinked(sub)}</td>
                  <td style={{ fontSize: 12 }}>{sub.due}</td>
                  <td>
                    <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={e => { e.stopPropagation(); reviewId === sub.id && reviewResult ? setReviewId(null) : runReview(sub); }}
                      disabled={reviewLoading && reviewId === sub.id}>
                      {reviewLoading && reviewId === sub.id ? "..." : reviewId === sub.id && reviewResult ? "Hide" : "AI Review"}
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px", color: "var(--red)" }}
                      onClick={e => { e.stopPropagation(); if (confirm("Delete this submittal?")) { app.setSubmittals(prev => prev.filter(s => s.id !== sub.id)); app.show("Submittal deleted"); } }}>✕</button>
                    </div>
                  </td>
                </tr>
                {reviewId === sub.id && reviewResult && (
                  <tr><td colSpan={9} style={{ padding: 0 }}>
                    <div style={{ padding: 16, background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
                      {/* Score + Status */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                          <div className="text-xs text-muted">Readiness Score</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: reviewResult.score >= 80 ? "var(--green)" : reviewResult.score >= 50 ? "var(--amber)" : "var(--red)" }}>{reviewResult.score}/100</div>
                        </div>
                        <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                          <div className="text-xs text-muted">Status</div>
                          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: reviewResult.status === "ready" ? "var(--green)" : reviewResult.status === "needs_work" ? "var(--amber)" : "var(--red)" }}>
                            {reviewResult.status === "ready" ? "Ready to Submit" : reviewResult.status === "needs_work" ? "Needs Work" : "Critical Issues"}
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="text-sm mb-12">{reviewResult.summary}</div>

                      {/* Issues */}
                      {reviewResult.issues?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="text-sm font-semi mb-8">Issues Found</div>
                          {reviewResult.issues.map((iss, i) => (
                            <div key={i} style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 6, borderLeft: `3px solid ${iss.severity === "critical" ? "var(--red)" : iss.severity === "warning" ? "var(--amber)" : "var(--blue)"}`, background: "var(--card)", fontSize: 13 }}>
                              <div className="flex-between">
                                <span className="font-semi">{iss.item}</span>
                                <span className={iss.severity === "critical" ? "badge-red" : iss.severity === "warning" ? "badge-amber" : "badge-blue"}>{iss.severity}</span>
                              </div>
                              <div className="text-muted mt-4" style={{ fontSize: 12 }}>{iss.detail}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {reviewResult.recommendations?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="text-sm font-semi mb-8">Recommendations</div>
                          {reviewResult.recommendations.map((r, i) => (
                            <div key={i} style={{ padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--border)" }}>{r}</div>
                          ))}
                        </div>
                      )}

                      {/* Material Notes */}
                      {reviewResult.materialNotes?.length > 0 && (
                        <div>
                          <div className="text-sm font-semi mb-8">Material Notes</div>
                          {reviewResult.materialNotes.map((n, i) => (
                            <div key={i} style={{ padding: "4px 0", fontSize: 12, color: "var(--text2)" }}>{n}</div>
                          ))}
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

      {/* ── Edit modal ── */}
      {editSub && (
        <div className="modal-overlay" onClick={() => setEditSub(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Submittal — {editSub.number}</div>
              <button className="modal-close" onClick={() => setEditSub(null)}>{"\u2715"}</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={editSub.projectId} onChange={e => setEditSub({ ...editSub, projectId: Number(e.target.value) })}>
                  <option value="">Select...</option>
                  {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Submittal #</label>
                <input className="form-input" value={editSub.number} onChange={e => setEditSub({ ...editSub, number: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Spec Section</label>
                <input className="form-input" value={editSub.specSection} onChange={e => setEditSub({ ...editSub, specSection: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={editSub.status} onChange={e => setEditSub({ ...editSub, status: e.target.value })}>
                  <option value="preparing">Preparing</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="revise">Revise & Resubmit</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Submitted</label>
                <input className="form-input" type="date" value={editSub.submitted || ""} onChange={e => setEditSub({ ...editSub, submitted: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={editSub.due} onChange={e => setEditSub({ ...editSub, due: e.target.value })} />
              </div>
              <div className="form-group full">
                <label className="form-label">Description</label>
                <input className="form-input" value={editSub.desc} onChange={e => setEditSub({ ...editSub, desc: e.target.value })} />
              </div>
            </div>

            {/* PDF section */}
            <div className="form-group mt-16">
              <label className="form-label">PDF Attachment</label>
              {editSub.pdfKey && !editSub._newPdfFile ? (
                <div className="sub-pdf-attached">
                  <span style={{ fontSize: 13 }}>{editSub.pdfName}</span>
                  <span className="text-xs text-dim">{fmtSize(editSub.pdfSize)}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => viewPdf(editSub.pdfKey)}>View</button>
                  <button className="btn btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => removePdf(editSub)}>Remove</button>
                </div>
              ) : (
                <div className="sub-pdf-upload">
                  <input type="file" accept=".pdf" onChange={e => setEditSub({ ...editSub, _newPdfFile: e.target.files[0] || null })} />
                  {editSub._newPdfFile && <span className="text-xs text-dim">{editSub._newPdfFile.name} ({fmtSize(editSub._newPdfFile.size)})</span>}
                </div>
              )}
            </div>

            {/* Link pickers */}
            {renderLinkPicker(editSub.linkedMaterialIds || [], editSub.linkedAssemblyCodes || [], true)}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditSub(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={uploading}>{uploading ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SCHEDULE — CSS Gantt Chart
   ══════════════════════════════════════════════════════════════ */
function Schedule({ app }) {
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", task: "", start: "", end: "", crew: "", status: "not-started", milestone: false, predecessorId: "" });
  const [editTaskId, setEditTaskId] = useState(null);
  const [editTask, setEditTask] = useState({});
  const [laborResult, setLaborResult] = useState(null);
  const [laborLoading, setLaborLoading] = useState(false);
  const [showLabor, setShowLabor] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  const runConflictDetect = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setConflictLoading(true);
    setConflictResult(null);
    setShowConflict(true);
    try {
      const { detectScheduleConflicts } = await import("../utils/api.js");
      const scheduleData = app.schedule.map(t => ({
        task: t.task, project: app.projects.find(p => p.id === t.projectId)?.name || "Unknown",
        start: t.start, end: t.end, crew: t.crew, status: t.status, milestone: t.milestone,
      }));
      const projectData = app.projects.map(p => ({ name: p.name || p.project, gc: p.gc, phase: p.phase, progress: p.progress, scope: p.scope }));
      const result = await detectScheduleConflicts(app.apiKey, scheduleData, projectData);
      setConflictResult(result);
      app.show("Conflict analysis complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setConflictLoading(false);
    }
  };

  const runLaborForecast = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setLaborLoading(true);
    setLaborResult(null);
    setShowLabor(true);
    try {
      const { forecastLaborDemand } = await import("../utils/api.js");
      const scheduleData = app.schedule.map(t => ({
        task: t.task,
        project: app.projects.find(p => p.id === t.projectId)?.name || "Unknown",
        start: t.start,
        end: t.end,
        crew: t.crew,
        status: t.status,
      }));
      const projectData = app.projects.map(p => ({
        name: p.name || p.project,
        gc: p.gc,
        contract: p.contract,
        progress: p.progress,
        phase: p.phase,
        scope: p.scope,
      }));
      const crewData = (app.crewSchedule || []).map(c => ({
        crew: c.crew || c.name,
        members: c.members || c.size,
        project: c.project,
        available: c.available,
      }));
      const result = await forecastLaborDemand(app.apiKey, scheduleData, projectData, crewData);
      setLaborResult(result);
      app.show("Labor forecast complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setLaborLoading(false);
    }
  };

  // Dynamic Gantt range — auto-calculate from task dates or use current year
  const allDates = app.schedule.flatMap(t => [t.start, t.end].filter(Boolean)).map(d => new Date(d));
  const now = new Date();
  const ganttStart = allDates.length > 0
    ? new Date(Math.min(...allDates.map(d => d.getTime()), now.getTime()))
    : new Date(now.getFullYear(), 0, 1);
  ganttStart.setDate(1); // snap to 1st of month
  const ganttEnd = allDates.length > 0
    ? new Date(Math.max(...allDates.map(d => d.getTime()), now.getTime() + 90 * 86400000))
    : new Date(now.getFullYear(), 11, 31);
  ganttEnd.setMonth(ganttEnd.getMonth() + 1); ganttEnd.setDate(1); // snap to end of month
  const totalDays = (ganttEnd - ganttStart) / 86400000;
  const months = [];
  const cursor = new Date(ganttStart);
  while (cursor < ganttEnd) {
    months.push(cursor.toLocaleString("en", { month: "short" }) + (cursor.getMonth() === 0 ? " " + cursor.getFullYear() : ""));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const filtered = filter === "all" ? app.schedule : app.schedule.filter(t => t.projectId === Number(filter));
  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";

  const barColor = (s) => s === "complete" ? "var(--green)" : s === "in-progress" ? "var(--amber)" : "var(--bg4)";

  const save = () => {
    if (!form.task || !form.start || !form.end) return app.show("Fill required fields", "err");
    const newItem = {
      id: app.nextId(),
      projectId: Number(form.projectId),
      task: form.task,
      start: form.start,
      end: form.end,
      crew: form.crew,
      status: form.status,
      milestone: form.milestone,
      predecessorId: form.predecessorId ? Number(form.predecessorId) : null,
    };
    app.setSchedule(prev => [...prev, newItem]);
    app.show("Task added", "ok");
    setAdding(false);
    setForm({ projectId: "", task: "", start: "", end: "", crew: "", status: "not-started", milestone: false, predecessorId: "" });
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <div className="section-title">Project Schedule</div>
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
            <option value="all">All Projects</option>
            {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={runConflictDetect} disabled={conflictLoading}>
            {conflictLoading ? "Detecting..." : "Conflict Scan"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={runLaborForecast} disabled={laborLoading}>
            {laborLoading ? "Forecasting..." : "Labor Forecast"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Task","Project","Crew","Start","End","Status","Milestone","Predecessor"];
            const rows = filtered.map(t => {
              const pred = t.predecessorId ? (app.schedule.find(s => s.id === t.predecessorId)?.task || "") : "";
              return [
                `"${(t.task||'').replace(/"/g,'""')}"`, `"${pName(t.projectId)}"`, t.crew||'',
                t.start||'', t.end||'', t.status||'', t.milestone?"Y":"", `"${pred}"`
              ];
            });
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_schedule.csv'; a.click();
            URL.revokeObjectURL(url);
            app.show("Schedule CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Task</button>
        </div>
      </div>

      {/* Labor Forecast Panel */}
      {showLabor && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Labor Forecast</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowLabor(false); setLaborResult(null); }}>Close</button>
          </div>
          {laborLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing schedule and crew data...</div>}
          {laborResult && (
            <div style={{ marginTop: 8 }}>
              {/* Summary */}
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>
                {laborResult.summary}
              </div>

              {/* Weekly Forecast Table */}
              {laborResult.weeklyForecast?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">4-Week Outlook</div>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead><tr><th>Week</th><th>Crews</th><th>Hours</th><th>Projects</th><th>Bottleneck</th></tr></thead>
                    <tbody>
                      {laborResult.weeklyForecast.map((w, i) => (
                        <tr key={i}>
                          <td className="font-semi">{w.week}</td>
                          <td style={{ fontWeight: 700, color: "var(--amber)" }}>{w.crewsNeeded}</td>
                          <td>{w.hoursEstimate}h</td>
                          <td style={{ fontSize: 12 }}>{(w.projects || []).join(", ")}</td>
                          <td style={{ fontSize: 12, color: w.bottleneck ? "var(--red)" : "var(--text3)" }}>{w.bottleneck || "None"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Crew Gaps */}
              {laborResult.crewGaps?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Crew Gaps</div>
                  {laborResult.crewGaps.map((g, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, background: "rgba(239,68,68,0.08)", borderLeft: "3px solid var(--red)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{g.week}</span>
                        <span className="badge-red">-{g.shortfall} {g.trade}</span>
                      </div>
                      <div className="text-muted mt-4">{g.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Peak Week */}
              {laborResult.peakWeek && (
                <div style={{ padding: 10, borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid var(--amber)", marginBottom: 12, fontSize: 13 }}>
                  <span className="font-semi">Peak Week: </span>{laborResult.peakWeek.week} — {laborResult.peakWeek.crewsNeeded} crews needed
                  <div className="text-xs text-muted mt-4">{laborResult.peakWeek.reason}</div>
                </div>
              )}

              {/* Overtime */}
              {laborResult.overtime && (
                <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 12, fontSize: 13 }}>
                  <span className="font-semi">Overtime Likelihood: </span>{laborResult.overtime.likelihood}
                  {laborResult.overtime.estimatedHours > 0 && <span> — ~{laborResult.overtime.estimatedHours}h estimated</span>}
                </div>
              )}

              {/* Recommendations */}
              {laborResult.recommendations?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Recommendations</div>
                  {laborResult.recommendations.map((r, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span>{r.action}</span>
                        <span className={r.priority === "high" ? "badge-red" : r.priority === "medium" ? "badge-amber" : "badge-blue"}>{r.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.impact}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Conflict Panel */}
      {showConflict && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Schedule Conflict Scan</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowConflict(false); setConflictResult(null); }}>Close</button>
          </div>
          {conflictLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Scanning schedule for conflicts...</div>}
          {conflictResult && (
            <div style={{ marginTop: 8 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>{conflictResult.summary}</div>

              {conflictResult.conflicts?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Conflicts Detected</div>
                  {conflictResult.conflicts.map((c, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, borderLeft: `3px solid ${c.severity === "critical" ? "var(--red)" : c.severity === "warning" ? "var(--amber)" : "var(--blue)"}`, background: "var(--card)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{c.type} — {(c.projects || []).join(", ")}</span>
                        <span className={c.severity === "critical" ? "badge-red" : c.severity === "warning" ? "badge-amber" : "badge-blue"}>{c.severity}</span>
                      </div>
                      <div className="text-muted mt-4" style={{ fontSize: 12 }}>{c.detail}</div>
                      <div className="text-xs mt-2" style={{ color: "var(--blue)" }}>Fix: {c.resolution}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.sequenceIssues?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Sequence Issues</div>
                  {conflictResult.sequenceIssues.map((s, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span className="font-semi">{s.project}</span>: {s.issue}
                      <div className="text-xs text-muted mt-2">Correct: {s.correctSequence}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.criticalPath?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Critical Path</div>
                  {conflictResult.criticalPath.map((c, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{c.project}</span>
                        <span style={{ color: c.slackDays <= 3 ? "var(--red)" : "var(--amber)", fontWeight: 600 }}>{c.slackDays}d slack</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{c.bottleneck} — {c.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.optimizations?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Optimizations</div>
                  {conflictResult.optimizations.map((o, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span>{o.suggestion}</span>
                        <span className={o.priority === "high" ? "badge-red" : o.priority === "medium" ? "badge-amber" : "badge-blue"}>{o.priority}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{o.benefit}</div>
                    </div>
                  ))}
                </div>
              )}
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
              <label className="form-label">Task Name</label>
              <input className="form-input" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Start</label>
              <input className="form-input" type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">End</label>
              <input className="form-input" type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Crew</label>
              <input className="form-input" value={form.crew} onChange={e => setForm({ ...form, crew: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Predecessor</label>
            <select className="form-select" value={form.predecessorId} onChange={e => setForm({ ...form, predecessorId: e.target.value })}>
              <option value="">None</option>
              {app.schedule.map(t => <option key={t.id} value={t.id}>{t.task} ({pName(t.projectId)})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.milestone} onChange={e => setForm({ ...form, milestone: e.target.checked })} />
              Milestone
            </label>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="gantt-wrap mt-16" style={{ overflowX: "auto" }}>
        <div className="gantt-header" style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 200, minWidth: 200, padding: "8px 12px", fontWeight: 600 }}>Task</div>
          <div style={{ flex: 1, display: "flex" }}>
            {months.map(m => (
              <div key={m} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderLeft: "1px solid var(--border)", fontSize: 12, color: "var(--text2)" }}>{m}</div>
            ))}
          </div>
        </div>
        {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)" }}>No tasks</div>}
        {filtered.map(task => {
          const leftPct = (new Date(task.start) - ganttStart) / 86400000 / totalDays * 100;
          const widthPct = (new Date(task.end) - new Date(task.start)) / 86400000 / totalDays * 100;
          return (
            <div className="gantt-row" key={task.id} style={{ display: "flex", borderBottom: "1px solid var(--border)", minHeight: 36, alignItems: "center" }}>
              <div className="gantt-label" style={{ width: 200, minWidth: 200, padding: "4px 12px", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {task.task}
              </div>
              <div className="gantt-track" style={{ flex: 1, position: "relative", height: 24 }}>
                {task.milestone ? (
                  <div className="gantt-milestone" style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: 4,
                    width: 14,
                    height: 14,
                    background: "var(--amber)",
                    transform: "rotate(45deg)",
                    marginLeft: -7,
                  }} />
                ) : (
                  <div className="gantt-bar" style={{
                    position: "absolute",
                    left: `${Math.max(leftPct, 0)}%`,
                    width: `${Math.max(widthPct, 0.5)}%`,
                    height: 16,
                    top: 4,
                    borderRadius: 3,
                    background: barColor(task.status),
                    opacity: task.status === "not-started" ? 0.5 : 1,
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task List Table */}
      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Task</th><th>Project</th><th>Crew</th><th>Start</th><th>End</th><th>Predecessor</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(task => {
              const pred = task.predecessorId ? app.schedule.find(s => s.id === task.predecessorId) : null;
              if (editTaskId === task.id) {
                return (
                  <tr key={task.id} style={{ background: "var(--bg3)" }}>
                    <td><input className="form-input" value={editTask.task} onChange={e => setEditTask({ ...editTask, task: e.target.value })} style={{ fontSize: 12, padding: "2px 6px" }} /></td>
                    <td>
                      <select className="form-select" value={editTask.projectId} onChange={e => setEditTask({ ...editTask, projectId: e.target.value })} style={{ fontSize: 12, padding: "2px 4px" }}>
                        {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td><input className="form-input" value={editTask.crew} onChange={e => setEditTask({ ...editTask, crew: e.target.value })} style={{ fontSize: 12, padding: "2px 6px" }} /></td>
                    <td><input className="form-input" type="date" value={editTask.start} onChange={e => setEditTask({ ...editTask, start: e.target.value })} style={{ fontSize: 12, padding: "2px 4px" }} /></td>
                    <td><input className="form-input" type="date" value={editTask.end} onChange={e => setEditTask({ ...editTask, end: e.target.value })} style={{ fontSize: 12, padding: "2px 4px" }} /></td>
                    <td>
                      <select className="form-select" value={editTask.predecessorId || ""} onChange={e => setEditTask({ ...editTask, predecessorId: e.target.value ? Number(e.target.value) : null })} style={{ fontSize: 12, padding: "2px 4px" }}>
                        <option value="">None</option>
                        {app.schedule.filter(s => s.id !== task.id).map(s => <option key={s.id} value={s.id}>{s.task}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" value={editTask.status} onChange={e => setEditTask({ ...editTask, status: e.target.value })} style={{ fontSize: 12, padding: "2px 4px" }}>
                        <option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="complete">Complete</option>
                      </select>
                    </td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => { app.setSchedule(prev => prev.map(t => t.id === task.id ? { ...t, ...editTask, projectId: Number(editTask.projectId) } : t)); setEditTaskId(null); app.show("Task updated"); }}>Save</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setEditTaskId(null)}>Cancel</button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={task.id}>
                  <td>{task.milestone ? "\u25C6 " : ""}{task.task}</td>
                  <td>{pName(task.projectId)}</td>
                  <td>{task.crew || "—"}</td>
                  <td>{task.start}</td>
                  <td>{task.end}</td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>{pred ? pred.task : "—"}</td>
                  <td><span className={task.status === "complete" ? "badge-green" : task.status === "in-progress" ? "badge-amber" : "badge-muted"}>{task.status}</span></td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px" }}
                      onClick={() => { setEditTaskId(task.id); setEditTask({ task: task.task, projectId: task.projectId, crew: task.crew || "", start: task.start, end: task.end, status: task.status, predecessorId: task.predecessorId || "" }); }}>✎</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px", color: "var(--red)" }}
                      onClick={() => { if (confirm("Delete this task?")) { app.setSchedule(prev => prev.filter(t => t.id !== task.id)); app.show("Task deleted"); } }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REPORTS — recharts visualizations
   ══════════════════════════════════════════════════════════════ */
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const REPORT_COLORS = { estimating: "#e09422", submitted: "#3b82f6", awarded: "#10b981", lost: "#ef4444" };

function Reports({ app }) {
  const userRole = app.auth?.role || "owner";
  const isBizRole = ["owner", "admin", "pm", "office_admin"].includes(userRole);
  const bids = app.bids || [];
  const projects = app.projects || [];
  const [reportSummary, setReportSummary] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [reportSub, setReportSub] = useState("Incidents");

  const runForecast = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setForecastLoading(true);
    setForecastResult(null);
    try {
      const { forecastBusinessTrends } = await import("../utils/api.js");
      const res = await forecastBusinessTrends(app.apiKey, bids.slice(0, 30), projects.slice(0, 15), (app.invoices || []).slice(0, 30), (app.changeOrders || []).slice(0, 20));
      setForecastResult(res);
      setShowForecast(true);
      app.show("Forecast complete", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setForecastLoading(false);
    }
  };

  const runReportSummary = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setReportLoading(true);
    setReportSummary(null);
    try {
      const { generateReportSummary } = await import("../utils/api.js");
      const awarded = bids.filter(b => b.status === "awarded").length;
      const lost = bids.filter(b => b.status === "lost").length;
      const decided = awarded + lost;
      const reportData = {
        totalBids: bids.length,
        pipeline: bids.reduce((s, b) => s + (b.value || 0), 0),
        byStatus: { estimating: bids.filter(b => b.status === "estimating").length, submitted: bids.filter(b => b.status === "submitted").length, awarded, lost },
        winRate: decided > 0 ? Math.round((awarded / decided) * 100) : 0,
        avgBidSize: bids.length > 0 ? Math.round(bids.reduce((s, b) => s + (b.value || 0), 0) / bids.length) : 0,
        projects: projects.map(p => ({ name: p.project || p.name, gc: p.gc, contract: p.contract, billed: p.billed, margin: p.margin, progress: p.progress, phase: p.phase })),
        topGCs: Object.entries(bids.reduce((m, b) => { m[b.gc] = (m[b.gc] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([gc, count]) => ({ gc, totalBids: count, awarded: bids.filter(b => b.gc === gc && b.status === "awarded").length })),
        changeOrders: { total: (app.changeOrders || []).length, totalValue: (app.changeOrders || []).reduce((s, c) => s + (c.amount || 0), 0) },
      };
      const result = await generateReportSummary(app.apiKey, reportData);
      setReportSummary(result);
      app.show("Report summary generated", "ok");
    } catch (e) {
      app.show(e.message, "err");
    } finally {
      setReportLoading(false);
    }
  };

  // ── Win Rate ──
  const awarded = bids.filter(b => b.status === "awarded").length;
  const lost = bids.filter(b => b.status === "lost").length;
  const decided = awarded + lost;
  const winRate = decided > 0 ? Math.round((awarded / decided) * 100) : null;

  // Win rate by GC
  const gcMap = {};
  bids.forEach(b => {
    if (!gcMap[b.gc]) gcMap[b.gc] = { awarded: 0, lost: 0, total: 0 };
    gcMap[b.gc].total++;
    if (b.status === "awarded") gcMap[b.gc].awarded++;
    if (b.status === "lost") gcMap[b.gc].lost++;
  });

  const gcWinData = Object.entries(gcMap).map(([gc, d]) => {
    const dec = d.awarded + d.lost;
    return { name: gc.length > 18 ? gc.slice(0, 16) + "..." : gc, rate: dec > 0 ? Math.round((d.awarded / dec) * 100) : 0, bids: d.total, awarded: d.awarded };
  }).sort((a, b) => b.bids - a.bids).slice(0, 10);

  // ── Pipeline by Status ──
  const statuses = ["estimating", "submitted", "awarded", "lost"];
  const pipelineData = statuses.map(s => {
    const items = bids.filter(b => b.status === s);
    return { name: s, count: items.length, value: items.reduce((sum, b) => sum + (b.value || 0), 0) };
  });

  // ── KPI Summary ──
  const totalPipeline = bids.reduce((s, b) => s + (b.value || 0), 0);
  const avgBidSize = bids.length > 0 ? Math.round(totalPipeline / bids.length) : 0;
  const gcCounts = {};
  bids.forEach(b => { gcCounts[b.gc] = (gcCounts[b.gc] || 0) + 1; });
  const mostActiveGC = Object.entries(gcCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const inProgress = projects.filter(p => p.progress > 0 && p.progress < 100).length;

  // ── Phase breakdown ──
  const phaseMap = {};
  bids.forEach(b => { if (b.phase) phaseMap[b.phase] = (phaseMap[b.phase] || 0) + 1; });
  const phaseData = Object.entries(phaseMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const PHASE_COLORS = ["#3b82f6", "#10b981", "#e09422", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#ec4899"];

  const tooltipStyle = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)" };

  // Non-business roles (safety, foreman, etc.) see a simplified reports view
  if (!isBizRole) {
    return (
      <div className="mt-16">
        <div className="section-title">Reports</div>
        <div className="text-sm text-muted mb-16">
          {userRole === "safety" ? "Safety reports, incidents, and daily logs." :
           userRole === "foreman" ? "Field reports and daily logs." :
           "Reports available for your role."}
        </div>
        <SubTabs tabs={["Incidents", "Toolbox Talks", "Daily Reports"]} active={reportSub} onChange={setReportSub} />
        {reportSub === "Incidents" && <IncidentsTab app={app} />}
        {reportSub === "Toolbox Talks" && <ToolboxTalksTab app={app} />}
        {reportSub === "Daily Reports" && <DailyReportsTab app={app} />}
      </div>
    );
  }

  return (
    <div className="mt-16">
      {/* KPI Summary */}
      <div className="section-title">KPI Summary</div>
      <div className="flex gap-8 mt-16" style={{ flexWrap: "wrap" }}>
        <div className="kpi-card"><span className="text2">Total Pipeline</span><strong>{app.fmtK(totalPipeline)}</strong></div>
        <div className="kpi-card"><span className="text2">Avg Bid Size</span><strong>{app.fmtK(avgBidSize)}</strong></div>
        <div className="kpi-card"><span className="text2">Total Bids</span><strong>{bids.length}</strong></div>
        <div className="kpi-card"><span className="text2">Most Active GC</span><strong style={{ fontSize: 14 }}>{mostActiveGC}</strong></div>
        <div className="kpi-card"><span className="text2">Win Rate</span><strong>{winRate !== null ? `${winRate}%` : "—"}</strong></div>
        <div className="kpi-card"><span className="text2">Projects In Progress</span><strong>{inProgress}</strong></div>
      </div>

      {/* AI Business Forecast */}
      <div className="card mt-16">
        <div className="card-header flex-between">
          <div className="card-title font-head">AI Business Forecast</div>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--amber)" }} onClick={() => { showForecast ? setShowForecast(false) : runForecast(); }} disabled={forecastLoading}>
            {forecastLoading ? "Forecasting..." : "AI Forecast"}
          </button>
        </div>
        {!showForecast && !forecastLoading && (
          <div className="text-sm text-muted" style={{ padding: "8px 0" }}>AI-powered quarterly forecast — revenue projections, market trends, and growth opportunities.</div>
        )}
        {showForecast && forecastResult && (
          <div style={{ maxHeight: 450, overflow: "auto" }}>
            <div className="text-sm text-muted mb-12">{forecastResult.summary}</div>

            {/* KPI Forecasts */}
            {forecastResult.kpiForecasts && (
              <div className="flex gap-12 mb-16 flex-wrap">
                <div className="kpi-card" style={{ minWidth: 120 }}>
                  <span className="text2">Win Rate</span>
                  <strong>{forecastResult.kpiForecasts.winRate?.current}% → {forecastResult.kpiForecasts.winRate?.projected}%</strong>
                </div>
                <div className="kpi-card" style={{ minWidth: 120 }}>
                  <span className="text2">Avg Margin</span>
                  <strong>{forecastResult.kpiForecasts.avgMargin?.current}% → {forecastResult.kpiForecasts.avgMargin?.projected}%</strong>
                </div>
                <div className="kpi-card" style={{ minWidth: 120 }}>
                  <span className="text2">Backlog</span>
                  <strong>{forecastResult.kpiForecasts.backlog?.projected}</strong>
                </div>
              </div>
            )}

            {/* Revenue Forecast */}
            {forecastResult.revenueforecast && (
              <div style={{ padding: 12, borderRadius: 6, background: "var(--bg3)", marginBottom: 12 }}>
                <div className="text-sm font-semi mb-4">Revenue Forecast</div>
                <div className="flex gap-16">
                  <div><span className="text-xs text-muted">This Quarter:</span> <span className="font-semi">${(forecastResult.revenueforecast.currentQuarter || 0).toLocaleString()}</span></div>
                  <div><span className="text-xs text-muted">Next Quarter:</span> <span className="font-semi">${(forecastResult.revenueforecast.nextQuarter || 0).toLocaleString()}</span></div>
                  <span className={`badge ${forecastResult.revenueforecast.trend === "up" ? "badge-green" : forecastResult.revenueforecast.trend === "down" ? "badge-red" : "badge-muted"}`}>{forecastResult.revenueforecast.trend}</span>
                </div>
                <div className="text-xs text-muted mt-4">{(forecastResult.revenueforecast.drivers || []).join(" · ")}</div>
              </div>
            )}

            {/* Cash Flow */}
            {forecastResult.cashFlowProjection?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-sm font-semi mb-8">Cash Flow Projection</div>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead><tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Risk</th></tr></thead>
                  <tbody>
                    {forecastResult.cashFlowProjection.map((c, i) => (
                      <tr key={i}>
                        <td className="font-semi">{c.month}</td>
                        <td style={{ color: "var(--green)" }}>${(c.expectedInflow || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--red)" }}>${(c.expectedOutflow || 0).toLocaleString()}</td>
                        <td className="font-semi">{c.netPosition}</td>
                        <td className="text-muted">{c.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Growth Opportunities */}
            {forecastResult.growthOpportunities?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-sm font-semi mb-8" style={{ color: "var(--green)" }}>Growth Opportunities</div>
                {forecastResult.growthOpportunities.map((g, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="flex-between">
                      <span className="text-sm">{g.opportunity}</span>
                      <span className={`badge ${g.probability === "high" ? "badge-green" : g.probability === "medium" ? "badge-amber" : "badge-muted"}`}>{g.probability}</span>
                    </div>
                    <div className="text-xs text-muted mt-2">Value: {g.potentialValue} · {g.action}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Market Trends */}
            {forecastResult.marketTrends?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-sm font-semi mb-8">Market Trends</div>
                {forecastResult.marketTrends.map((t, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="flex-between">
                      <span className="text-sm">{t.trend}</span>
                      <span className={`badge ${t.impact === "positive" ? "badge-green" : t.impact === "negative" ? "badge-red" : "badge-muted"}`}>{t.impact}</span>
                    </div>
                    <div className="text-xs text-muted mt-2">{t.recommendation} · {t.timeframe}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Quarterly Goals */}
            {forecastResult.quarterlyGoals?.length > 0 && (
              <div>
                <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Quarterly Goals</div>
                {forecastResult.quarterlyGoals.map((g, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className="text-sm font-semi">{g.goal}</div>
                    <div className="text-xs text-muted mt-2">{g.metric}: Target {g.target} · Current pace: {g.currentPace}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Executive Summary */}
      <div className="card mt-16">
        <div className="card-header flex-between">
          <div className="card-title font-head">AI Executive Summary</div>
          <button className="btn btn-primary btn-sm" onClick={runReportSummary} disabled={reportLoading}>
            {reportLoading ? "Generating..." : "Generate Summary"}
          </button>
        </div>
        {!reportSummary && !reportLoading && (
          <div className="text-sm text-muted" style={{ padding: "8px 0" }}>AI-powered executive brief of your business performance, GC relationships, and growth opportunities.</div>
        )}
        {reportLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing {bids.length} bids and {projects.length} projects...</div>}
        {reportSummary && (
          <div style={{ marginTop: 8 }}>
            {/* Executive Overview */}
            <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14, lineHeight: 1.6 }}>
              {reportSummary.executive}
            </div>

            {/* Strengths + Concerns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {reportSummary.strengths?.length > 0 && (
                <div style={{ padding: 12, borderRadius: 8, border: "1px solid var(--green)", background: "rgba(16,185,129,0.05)" }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--green)" }}>Strengths</div>
                  {reportSummary.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, padding: "3px 0" }}>{s}</div>)}
                </div>
              )}
              {reportSummary.concerns?.length > 0 && (
                <div style={{ padding: 12, borderRadius: 8, border: "1px solid var(--red)", background: "rgba(239,68,68,0.05)" }}>
                  <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>Concerns</div>
                  {reportSummary.concerns.map((c, i) => <div key={i} style={{ fontSize: 13, padding: "3px 0" }}>{c}</div>)}
                </div>
              )}
            </div>

            {/* GC Analysis */}
            {reportSummary.gcAnalysis && (
              <div style={{ padding: 12, borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 12, fontSize: 13 }}>
                <div className="font-semi mb-4" style={{ color: "var(--blue)" }}>GC Relationship Analysis</div>
                {reportSummary.gcAnalysis}
              </div>
            )}

            {/* Opportunities */}
            {reportSummary.opportunities?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Growth Opportunities</div>
                {reportSummary.opportunities.map((o, i) => (
                  <div key={i} style={{ padding: "4px 0", fontSize: 13 }}>{o}</div>
                ))}
              </div>
            )}

            {/* Forecast */}
            {reportSummary.forecast && (
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 13 }}>
                <div className="font-semi mb-4">Near-Term Forecast</div>
                {reportSummary.forecast}
              </div>
            )}

            {/* Action Items */}
            {reportSummary.actionItems?.length > 0 && (
              <div>
                <div className="text-sm font-semi mb-8">Action Items</div>
                {reportSummary.actionItems.map((a, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                    <div className="flex-between">
                      <span>{a.action}</span>
                      <span className={`badge ${a.priority === "high" ? "badge-red" : a.priority === "medium" ? "badge-amber" : "badge-blue"}`}>{a.priority}</span>
                    </div>
                    {a.owner && <div className="text-xs text-muted mt-2">Owner: {a.owner}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="flex gap-16 mt-24" style={{ flexWrap: "wrap" }}>
        {/* Pipeline by Status Pie */}
        <div className="card" style={{ flex: "1 1 280px", minWidth: 280 }}>
          <div className="card-header"><div className="card-title font-head">Pipeline by Status</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pipelineData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, count }) => `${name} (${count})`}>
                {pipelineData.map((d) => <Cell key={d.name} fill={REPORT_COLORS[d.name] || "#888"} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(val, name, props) => [`${val} bids / ${app.fmtK(props.payload.value)}`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Phase Breakdown Pie */}
        <div className="card" style={{ flex: "1 1 280px", minWidth: 280 }}>
          <div className="card-header"><div className="card-title font-head">Bids by Phase</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={phaseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, value }) => `${name} (${value})`}>
                {phaseData.map((_, i) => <Cell key={i} fill={PHASE_COLORS[i % PHASE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win Rate by GC - Bar Chart */}
      <div className="card mt-16">
        <div className="card-header"><div className="card-title font-head">Win Rate by GC</div></div>
        {winRate !== null && (
          <div className="flex-between mb-16">
            <span className="text-sm">Overall: <strong>{winRate}%</strong></span>
            <span className="text-sm text-dim">{awarded} awarded / {decided} decided</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={Math.max(gcWinData.length * 32, 160)}>
          <BarChart data={gcWinData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text2)", fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: "var(--text2)", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val, name, props) => [`${val}% (${props.payload.awarded}/${props.payload.bids})`, "Win Rate"]} />
            <Bar dataKey="rate" fill="var(--green)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline Value by Status - Bar Chart */}
      <div className="card mt-16">
        <div className="card-header"><div className="card-title font-head">Pipeline Value by Status</div></div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pipelineData} margin={{ left: 0, right: 20 }}>
            <XAxis dataKey="name" tick={{ fill: "var(--text2)", fontSize: 12, textTransform: "capitalize" }} />
            <YAxis tick={{ fill: "var(--text2)", fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`$${Number(val).toLocaleString()}`, "Value"]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {pipelineData.map((d) => <Cell key={d.name} fill={REPORT_COLORS[d.name] || "#888"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project Profitability */}
      <div className="section-title mt-16">Project Profitability</div>
      <div className="card mt-16">
        {projects.length === 0 && <div className="text2">No projects</div>}
        {projects.map(proj => {
          const billed = app.invoices.filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
          const remaining = proj.contract - billed;
          const pct = proj.contract > 0 ? Math.round((billed / proj.contract) * 100) : 0;
          return (
            <div key={proj.id} className="bar-row" style={{ marginBottom: 16 }}>
              <div className="flex-between" style={{ fontSize: 13 }}>
                <span className="bar-label">{proj.name}</span>
                <span className="bar-value text2">{app.fmt(billed)} / {app.fmt(proj.contract)} ({app.fmt(remaining)} remaining)</span>
              </div>
              <div className="bar-track" style={{ height: 14, background: "var(--bg4)", borderRadius: 4, marginTop: 4 }}>
                <div className="bar-fill" style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "var(--amber)", borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SAFETY
   ══════════════════════════════════════════════════════════════ */
function Safety({ app }) {
  const [sub, setSub] = useState("Incidents");
  return (
    <div>
      <SubTabs tabs={["Incidents", "Toolbox Talks", "Daily Reports", "OSHA Checklist"]} active={sub} onChange={setSub} />
      {sub === "Incidents" && <IncidentsTab app={app} />}
      {sub === "Toolbox Talks" && <ToolboxTalksTab app={app} />}
      {sub === "Daily Reports" && <DailyReportsTab app={app} />}
      {sub === "OSHA Checklist" && <OshaChecklistTab app={app} key="osha" />}
    </div>
  );
}

/* ── Incidents ───────────────────────────────────────────────── */
function IncidentsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", date: "", type: "near-miss", desc: "", corrective: "", reportedBy: "" });
  const [rcaId, setRcaId] = useState(null);
  const [rcaResult, setRcaResult] = useState(null);
  const [rcaLoading, setRcaLoading] = useState(false);

  const runRCA = async (inc) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setRcaId(inc.id);
    setRcaLoading(true);
    setRcaResult(null);
    try {
      const { analyzeIncidentRootCause } = await import("../utils/api.js");
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
    };
    app.setIncidents(prev => [...prev, newItem]);
    app.show("Incident reported", "ok");
    setAdding(false);
    setForm({ projectId: "", date: "", type: "near-miss", desc: "", corrective: "", reportedBy: "" });
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
            {app.incidents.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center" }}>No incidents</td></tr>}
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
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }}
                      onClick={() => rcaId === inc.id && rcaResult ? setRcaId(null) : runRCA(inc)}
                      disabled={rcaLoading && rcaId === inc.id}>
                      {rcaLoading && rcaId === inc.id ? "..." : rcaId === inc.id && rcaResult ? "Hide" : "RCA"}
                    </button>
                  </td>
                </tr>
                {rcaId === inc.id && rcaResult && (
                  <tr><td colSpan={7} style={{ padding: 0 }}>
                    <div style={{ padding: 16, background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
                      {/* Summary + Risk */}
                      <div className="flex-between mb-12">
                        <div className="text-sm">{rcaResult.summary}</div>
                        <span className={rcaResult.riskLevel === "critical" || rcaResult.riskLevel === "high" ? "badge-red" : rcaResult.riskLevel === "medium" ? "badge-amber" : "badge-green"}>{rcaResult.riskLevel} risk</span>
                      </div>

                      {/* Root Cause */}
                      <div style={{ padding: 10, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)", marginBottom: 12, fontSize: 13 }}>
                        <span className="font-semi">Root Cause: </span>{rcaResult.rootCause}
                      </div>

                      {/* Contributing Factors */}
                      {rcaResult.contributingFactors?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="text-sm font-semi mb-4">Contributing Factors</div>
                          {rcaResult.contributingFactors.map((f, i) => (
                            <div key={i} style={{ padding: "4px 10px", marginBottom: 4, borderRadius: 6, background: "var(--card)", fontSize: 13, borderLeft: "3px solid var(--amber)" }}>
                              <span className="font-semi">{f.factor}</span>
                              <span className="badge-muted" style={{ marginLeft: 8, fontSize: 10 }}>{f.category}</span>
                              <div className="text-xs text-muted mt-2">{f.detail}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Corrective Actions */}
                      {rcaResult.correctiveActions?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div className="text-sm font-semi mb-4">Corrective Actions</div>
                          {rcaResult.correctiveActions.map((a, i) => (
                            <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
                        <div style={{ padding: 8, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", marginBottom: 8, fontSize: 12 }}>
                          <span className="font-semi">OSHA: </span>{rcaResult.oshaRelevance}
                        </div>
                      )}
                      {rcaResult.patternAlert && (
                        <div style={{ padding: 8, borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid var(--amber)", fontSize: 12 }}>
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
function ToolboxTalksTab({ app }) {
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
      const { generateToolboxTalk } = await import("../utils/api.js");
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
          <div className="flex gap-8" style={{ marginBottom: 12, alignItems: "end" }}>
            <div style={{ flex: 1 }}>
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
              <button key={t} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => { setGenTopic(t); }}>{t}</button>
            ))}
          </div>

          {genLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Generating talk on "{genTopic}"...</div>}

          {genResult && (
            <div style={{ marginTop: 8 }}>
              <div className="flex-between mb-8">
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{genResult.title}</div>
                  <div className="text-xs text-muted">{genResult.duration} • {genResult.complianceRef || "General safety"}</div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
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
              <div style={{ padding: 10, borderRadius: 6, background: "var(--bg3)", marginBottom: 12, fontSize: 13 }}>{genResult.summary}</div>

              {/* Objectives */}
              {genResult.objectives?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-4">Learning Objectives</div>
                  {genResult.objectives.map((o, i) => (
                    <div key={i} style={{ padding: "3px 0", fontSize: 13 }}>{i + 1}. {o}</div>
                  ))}
                </div>
              )}

              {/* Content Sections */}
              {genResult.content?.map((section, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="font-semi" style={{ marginBottom: 6, color: "var(--amber)" }}>{section.heading}</div>
                  {section.points.map((p, j) => (
                    <div key={j} style={{ padding: "2px 0 2px 12px", fontSize: 13 }}>• {p}</div>
                  ))}
                </div>
              ))}

              {/* Discussion Questions */}
              {genResult.discussion?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-4">Discussion Questions</div>
                  {genResult.discussion.map((q, i) => (
                    <div key={i} style={{ padding: "3px 0", fontSize: 13, fontStyle: "italic" }}>{i + 1}. {q}</div>
                  ))}
                </div>
              )}

              {/* Key Takeaways */}
              {genResult.keyTakeaways?.length > 0 && (
                <div style={{ padding: 10, borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid var(--green)" }}>
                  <div className="font-semi mb-4" style={{ color: "var(--green)" }}>Key Takeaways</div>
                  {genResult.keyTakeaways.map((k, i) => (
                    <div key={i} style={{ padding: "2px 0", fontSize: 13 }}>✓ {k}</div>
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
            {app.toolboxTalks.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center" }}>No toolbox talks</td></tr>}
            {app.toolboxTalks.map(talk => (
              <tr key={talk.id}>
                {editId === talk.id ? (
                  <>
                    <td><input className="form-input" type="date" defaultValue={talk.date} style={{ fontSize: 12, padding: "2px 4px", width: 120 }} onChange={e => talk._date = e.target.value} /></td>
                    <td><select className="form-select" defaultValue={talk.projectId} style={{ fontSize: 12, padding: "2px 4px" }} onChange={e => talk._projectId = Number(e.target.value)}>
                      <option value="">Select...</option>{app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></td>
                    <td><input className="form-input" defaultValue={talk.topic} style={{ fontSize: 12, padding: "2px 4px" }} onChange={e => talk._topic = e.target.value} /></td>
                    <td><input className="form-input" type="number" defaultValue={talk.attendees} style={{ fontSize: 12, padding: "2px 4px", width: 60 }} onChange={e => talk._attendees = Number(e.target.value)} /></td>
                    <td><input className="form-input" defaultValue={talk.conductor} style={{ fontSize: 12, padding: "2px 4px" }} onChange={e => talk._conductor = e.target.value} /></td>
                    <td><div className="flex gap-4">
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => {
                        app.setToolboxTalks(prev => prev.map(t => t.id === talk.id ? { ...t, date: talk._date ?? t.date, projectId: talk._projectId ?? t.projectId, topic: talk._topic ?? t.topic, attendees: talk._attendees ?? t.attendees, conductor: talk._conductor ?? t.conductor } : t));
                        setEditId(null); app.show("Talk updated");
                      }}>Save</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setEditId(null)}>Cancel</button>
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
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setEditId(talk.id)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "2px 6px", color: "var(--red)" }} onClick={() => { if (confirm("Delete this talk?")) { app.setToolboxTalks(prev => prev.filter(t => t.id !== talk.id)); app.show("Talk deleted"); } }}>✕</button>
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
function DailyReportsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", date: "", crewSize: "", hours: "", work: "", issues: "", weather: "", safety: "", photos: [] });
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
      const { generateDailyReportDigest } = await import("../utils/api.js");
      const reports = app.dailyReports.map(r => ({
        date: r.date, project: pName(r.projectId),
        crewSize: r.crewSize, hours: r.hours,
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
      crewSize: Number(form.crewSize) || 0,
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
    setForm({ projectId: "", date: "", crewSize: "", hours: "", work: "", issues: "", weather: "", safety: "", photos: [] });
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Daily Reports</div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Date","Project","Crew Size","Hours","Work","Issues","Weather","Safety"];
            const rows = drFiltered.map(r => [r.date, `"${pName(r.projectId)}"`, r.crewSize, r.hours, `"${(r.work||'').replace(/"/g,'""')}"`, `"${(r.issues||'').replace(/"/g,'""')}"`, r.weather||'', `"${(r.safety||'').replace(/"/g,'""')}"`]);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'ebc_daily_reports.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("Daily Reports CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={runDigest} disabled={digestLoading}>
            {digestLoading ? "Analyzing..." : "AI Digest"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) setForm(f => ({ ...f, date: new Date().toISOString().slice(0, 10) })); setAdding(!adding); }}>+ Add Report</button>
        </div>
      </div>

      {/* AI Digest Results */}
      {digestResult && (
        <div className="card mt-16" style={{ padding: 16 }}>
          <div className="flex-between mb-12">
            <div className="text-sm font-semi">Field Operations Digest</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setDigestResult(null)} style={{ fontSize: 11 }}>Close</button>
          </div>

          <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14, lineHeight: 1.6 }}>
            {digestResult.summary}
          </div>

          {/* By Project */}
          {digestResult.byProject?.map((p, i) => (
            <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex-between mb-4">
                <span className="font-semi text-sm">{p.project}</span>
                <span className="text-xs text-muted">{p.status}</span>
              </div>
              {p.highlights?.map((h, j) => <div key={j} style={{ fontSize: 12, color: "var(--green)", padding: "2px 0" }}>{h}</div>)}
              {p.concerns?.map((c, j) => <div key={j} style={{ fontSize: 12, color: "var(--red)", padding: "2px 0" }}>{c}</div>)}
            </div>
          ))}

          {/* Notes Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {digestResult.laborNotes && (
              <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", fontSize: 13 }}>
                <div className="font-semi mb-4" style={{ fontSize: 12 }}>Labor</div>
                {digestResult.laborNotes}
              </div>
            )}
            {digestResult.materialNotes && (
              <div style={{ padding: 10, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", fontSize: 13 }}>
                <div className="font-semi mb-4" style={{ fontSize: 12 }}>Materials</div>
                {digestResult.materialNotes}
              </div>
            )}
          </div>

          {digestResult.weatherImpact && (
            <div style={{ padding: 8, marginTop: 8, borderRadius: 6, background: "rgba(59,130,246,0.08)", border: "1px solid var(--blue)", fontSize: 13 }}>
              <span className="font-semi">Weather: </span>{digestResult.weatherImpact}
            </div>
          )}

          {digestResult.safetyNotes?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="font-semi mb-4" style={{ fontSize: 12, color: "var(--red)" }}>Safety</div>
              {digestResult.safetyNotes.map((s, i) => <div key={i} style={{ fontSize: 12, padding: "2px 0" }}>{s}</div>)}
            </div>
          )}

          {digestResult.actionItems?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="text-sm font-semi mb-8">Action Items</div>
              {digestResult.actionItems.map((a, i) => (
                <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
              <input className="form-input" type="number" value={form.crewSize} onChange={e => setForm({ ...form, crewSize: e.target.value })} />
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
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {form.photos.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={p.data} alt={p.name} style={{ height: 60, borderRadius: 4, objectFit: "cover" }} />
                    <button style={{ position: "absolute", top: -4, right: -4, background: "var(--red)", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", lineHeight: 1 }}
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

      {drFiltered.length === 0 && <div className="card mt-16" style={{ textAlign: "center" }}>{app.search ? "No matching reports" : "No daily reports"}</div>}
      {drFiltered.map(rpt => (
        <div className="card mt-16" key={rpt.id}>
          {editDr?.id === rpt.id ? (
            <>
              <div className="form-grid" style={{ marginBottom: 12 }}>
                <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={editDr.date} onChange={e => setEditDr(d => ({ ...d, date: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Project</label><select className="form-select" value={editDr.projectId} onChange={e => setEditDr(d => ({ ...d, projectId: Number(e.target.value) }))}><option value="">Select...</option>{app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Crew Size</label><input className="form-input" type="number" value={editDr.crewSize} onChange={e => setEditDr(d => ({ ...d, crewSize: Number(e.target.value) }))} /></div>
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
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => setEditDr({ ...rpt })}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 6px", color: "var(--red)" }}
                    onClick={() => { if (confirm("Delete this daily report?")) { app.setDailyReports(prev => prev.filter(r => r.id !== rpt.id)); app.show("Report deleted"); } }}>✕</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div><span className="text2">Crew Size:</span> {rpt.crewSize}</div>
                <div><span className="text2">Hours:</span> {rpt.hours}</div>
              </div>
              <div style={{ marginTop: 8 }}><span className="text2">Work:</span> {rpt.work}</div>
              <div style={{ marginTop: 4 }}><span className="text2">Issues:</span> {rpt.issues || "None"}</div>
              <div style={{ marginTop: 4 }}><span className="text2">Safety:</span> {rpt.safety}</div>
              {rpt.photos?.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {rpt.photos.map((p, i) => (
                    <img key={i} src={p.data} alt={p.name || "photo"} style={{ height: 80, borderRadius: 4, objectFit: "cover", cursor: "pointer", border: "1px solid var(--border)" }}
                      onClick={() => window.open(p.data, "_blank")} title="Click to view full size" />
                  ))}
                </div>
              )}
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
      const { analyzeOshaReadiness } = await import("../utils/api.js");
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
        <div className="flex gap-8" style={{ alignItems: "center" }}>
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
          {auditLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing compliance checklist and incident history...</div>}
          {auditResult && (
            <div style={{ marginTop: 8 }}>
              {/* Score + Grade */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: 12, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                  <div className="text-xs text-muted">Readiness Score</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: auditResult.readinessScore >= 80 ? "var(--green)" : auditResult.readinessScore >= 60 ? "var(--amber)" : "var(--red)" }}>{auditResult.readinessScore}/100</div>
                </div>
                <div style={{ padding: 12, borderRadius: 6, background: "var(--card)", textAlign: "center" }}>
                  <div className="text-xs text-muted">Grade</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: auditResult.grade === "A" || auditResult.grade === "B" ? "var(--green)" : auditResult.grade === "C" ? "var(--amber)" : "var(--red)" }}>{auditResult.grade}</div>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>{auditResult.summary}</div>

              {/* Critical Gaps */}
              {auditResult.criticalGaps?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Critical Gaps</div>
                  {auditResult.criticalGaps.map((g, i) => (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, borderLeft: "3px solid var(--red)", background: "rgba(239,68,68,0.06)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{g.item}</span>
                        <span className="badge-red">{g.risk}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">OSHA: {g.oshaRef}</div>
                      <div className="text-xs mt-2" style={{ color: "var(--blue)" }}>Fix: {g.remediation} (by {g.deadline})</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Priority Actions */}
              {auditResult.priorityActions?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Priority Actions</div>
                  {auditResult.priorityActions.map((a, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
                <div style={{ padding: 10, borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid var(--green)", marginBottom: 12 }}>
                  <div className="font-semi mb-4" style={{ color: "var(--green)" }}>Strengths</div>
                  {auditResult.strengths.map((s, i) => <div key={i} style={{ padding: "2px 0", fontSize: 13 }}>✓ {s}</div>)}
                </div>
              )}

              {/* Training Gaps */}
              {auditResult.trainingGaps?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Training Gaps</div>
                  {auditResult.trainingGaps.map((t, i) => (
                    <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
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
          <div className="scope-item" key={item.id} onClick={() => toggle(item.id)} style={{ cursor: "pointer" }}>
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

/* ══════════════════════════════════════════════════════════════
   SETTINGS
   ══════════════════════════════════════════════════════════════ */
function Settings({ app }) {
  const userRole = app.auth?.role || "owner";
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const isFullAccess = ["owner", "admin", "pm"].includes(userRole);

  // Simplified settings for non-business roles
  const tabs = isFullAccess
    ? ["Company", "Assemblies", "Equipment", "Margin Tiers", "Data", "Theme", "API", "Account"]
    : ["Theme", "Account"];
  if (isOwnerOrAdmin) tabs.push("Users");
  const [sub, setSub] = useState(isFullAccess ? "Company" : "Theme");
  return (
    <div>
      <SubTabs tabs={tabs} active={sub} onChange={setSub} />
      {sub === "Company" && <CompanyTab app={app} />}
      {sub === "Assemblies" && <AssembliesTab app={app} />}
      {sub === "Equipment" && <EquipmentTab app={app} />}
      {sub === "Margin Tiers" && <MarginTiersTab app={app} />}
      {sub === "Data" && <DataTab app={app} />}
      {sub === "Theme" && <ThemeTab app={app} />}
      {sub === "API" && <ApiTab app={app} />}
      {sub === "Account" && <AccountTab app={app} />}
      {sub === "Users" && isOwnerOrAdmin && <UsersTab app={app} />}

      {/* ── Account / Logout ── */}
      <div className="card mt-16" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600, color: "var(--text)" }}>
            {app.auth?.name || "User"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            {app.auth?.email} &middot; {app.auth?.role?.toUpperCase()}
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ color: "var(--red)", borderColor: "var(--red)" }}
          onClick={() => {
            if (confirm("Are you sure you want to log out?")) {
              app.onLogout();
            }
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

/* ── Equipment Database ────────────────────────────────────────── */
const DEFAULT_EQUIPMENT = [
  { id: "eq_1", name: "Scissor Lift (19ft)", type: "Rented", dailyRate: 150, weeklyRate: 450, monthlyRate: 1200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_2", name: "Scissor Lift (26ft)", type: "Rented", dailyRate: 200, weeklyRate: 600, monthlyRate: 1600, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_3", name: "Scissor Lift (32ft)", type: "Rented", dailyRate: 275, weeklyRate: 800, monthlyRate: 2200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_4", name: "Boom Lift (40ft)", type: "Rented", dailyRate: 350, weeklyRate: 1050, monthlyRate: 2800, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_5", name: "Boom Lift (60ft)", type: "Rented", dailyRate: 500, weeklyRate: 1500, monthlyRate: 4000, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_6", name: "Drywall Cart", type: "Owned", dailyRate: 0, weeklyRate: 0, monthlyRate: 0, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_7", name: "Panel Lift (Drywall Jack)", type: "Owned", dailyRate: 25, weeklyRate: 75, monthlyRate: 200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_8", name: "Scaffolding Set", type: "Owned", dailyRate: 30, weeklyRate: 90, monthlyRate: 250, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_9", name: "Baker Scaffold", type: "Owned", dailyRate: 25, weeklyRate: 75, monthlyRate: 200, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_10", name: "Stilts (pair)", type: "Owned", dailyRate: 15, weeklyRate: 45, monthlyRate: 120, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_11", name: "Screw Gun", type: "Owned", dailyRate: 10, weeklyRate: 30, monthlyRate: 80, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_12", name: "Rotozip", type: "Owned", dailyRate: 10, weeklyRate: 30, monthlyRate: 80, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_13", name: "Laser Level", type: "Owned", dailyRate: 20, weeklyRate: 60, monthlyRate: 160, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_14", name: "Auto Taper", type: "Owned", dailyRate: 35, weeklyRate: 105, monthlyRate: 280, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_15", name: "Flat Box Set", type: "Owned", dailyRate: 30, weeklyRate: 90, monthlyRate: 240, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_16", name: "Corner Roller", type: "Owned", dailyRate: 10, weeklyRate: 30, monthlyRate: 80, status: "Available", assignedProject: "", notes: "" },
  { id: "eq_17", name: "Mud Pump", type: "Owned", dailyRate: 40, weeklyRate: 120, monthlyRate: 320, status: "Available", assignedProject: "", notes: "" },
];

const EQ_STATUSES = ["Available", "In Use", "Maintenance"];
const EQ_TYPES = ["Owned", "Rented"];

function EquipmentTab({ app }) {
  const [equipment, setEquipment] = useState(() => {
    try {
      const stored = localStorage.getItem("ebc_equipment");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("ebc_equipment", JSON.stringify(DEFAULT_EQUIPMENT));
      return DEFAULT_EQUIPMENT;
    } catch { return DEFAULT_EQUIPMENT; }
  });
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);

  const save = (list) => {
    setEquipment(list);
    localStorage.setItem("ebc_equipment", JSON.stringify(list));
  };

  const startEdit = (eq) => {
    setEditId(eq.id);
    setForm({ ...eq });
    setAdding(false);
  };

  const startAdd = () => {
    setForm({
      id: crypto.randomUUID(),
      name: "", type: "Owned", dailyRate: 0, weeklyRate: 0, monthlyRate: 0,
      status: "Available", assignedProject: "", notes: ""
    });
    setEditId(null);
    setAdding(true);
  };

  const saveForm = () => {
    if (!form.name.trim()) { app.show("Equipment name is required", "err"); return; }
    if (adding) {
      save([...equipment, form]);
      app.show("Equipment added", "ok");
    } else {
      save(equipment.map(eq => eq.id === editId ? form : eq));
      app.show("Equipment updated", "ok");
    }
    setForm(null);
    setEditId(null);
    setAdding(false);
  };

  const cancelEdit = () => { setForm(null); setEditId(null); setAdding(false); };

  const deleteItem = (id) => {
    if (!confirm("Delete this equipment?")) return;
    save(equipment.filter(eq => eq.id !== id));
    app.show("Equipment deleted", "ok");
  };

  const resetDefaults = () => {
    if (!confirm("Reset equipment to defaults? This will overwrite all current data.")) return;
    save(DEFAULT_EQUIPMENT);
    app.show("Equipment reset to defaults", "ok");
  };

  const filtered = filter === "All" ? equipment :
    filter === "Available" ? equipment.filter(e => e.status === "Available") :
    filter === "In Use" ? equipment.filter(e => e.status === "In Use") :
    filter === "Maintenance" ? equipment.filter(e => e.status === "Maintenance") :
    filter === "Owned" ? equipment.filter(e => e.type === "Owned") :
    filter === "Rented" ? equipment.filter(e => e.type === "Rented") : equipment;

  const statusColor = (s) => s === "Available" ? "var(--green)" : s === "In Use" ? "var(--amber)" : "var(--red)";

  return (
    <div className="mt-16">
      <div className="flex-between mb-16">
        <div>
          <div className="section-title">Equipment Database</div>
          <div className="text-sm text-dim">{equipment.length} items tracked</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={resetDefaults}>Reset Defaults</button>
          <button className="btn btn-primary btn-sm" onClick={startAdd}>+ Add Equipment</button>
        </div>
      </div>

      <div className="flex gap-4 mb-16 flex-wrap">
        {["All", "Available", "In Use", "Maintenance", "Owned", "Rented"].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Add / Edit Form */}
      {form && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="text-sm font-semi mb-12">{adding ? "Add Equipment" : "Edit Equipment"}</div>
          <div className="form-grid" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Scissor Lift (26ft)" />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {EQ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Daily Rate ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Weekly Rate ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.weeklyRate} onChange={e => setForm({ ...form, weeklyRate: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rate ($)</label>
              <input className="form-input" type="number" step="0.01" value={form.monthlyRate} onChange={e => setForm({ ...form, monthlyRate: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {EQ_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Project</label>
              <select className="form-select" value={form.assignedProject} onChange={e => setForm({ ...form, assignedProject: e.target.value })}>
                <option value="">-- None --</option>
                {(app.projects || []).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Serial number, condition, rental company..." style={{ resize: "vertical" }} />
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={saveForm}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Equipment Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Name</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Type</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Daily</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Weekly</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Monthly</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Status</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Project</th>
              <th style={{ padding: "8px 12px", color: "var(--text2)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(eq => (
              <tr key={eq.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{eq.name}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span className={`badge ${eq.type === "Owned" ? "badge-blue" : "badge-amber"}`}>{eq.type}</span>
                </td>
                <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>${eq.dailyRate}</td>
                <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>${eq.weeklyRate}</td>
                <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>${eq.monthlyRate}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{ color: statusColor(eq.status), fontWeight: 600 }}>{eq.status}</span>
                </td>
                <td style={{ padding: "8px 12px", color: eq.assignedProject ? "var(--text)" : "var(--text3)" }}>
                  {eq.assignedProject || "--"}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(eq)} style={{ fontSize: 11, padding: "2px 8px" }}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(eq.id)} style={{ fontSize: 11, padding: "2px 8px", color: "var(--red)" }}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state mt-16">
          <div className="empty-icon">🔧</div>
          <div className="empty-text">No equipment matches this filter</div>
        </div>
      )}
    </div>
  );
}

/* ── Margin Tier Rates (Admin-configurable) ────────────────────── */
const DEFAULT_MARGIN_TIERS = {
  bronze: 15,
  silver: 20,
  gold: 25,
  platinum: 30,
};

function MarginTiersTab({ app }) {
  const [tiers, setTiers] = useState(() => {
    try {
      const stored = localStorage.getItem("ebc_margin_tiers");
      if (stored) return JSON.parse(stored);
      localStorage.setItem("ebc_margin_tiers", JSON.stringify(DEFAULT_MARGIN_TIERS));
      return DEFAULT_MARGIN_TIERS;
    } catch { return DEFAULT_MARGIN_TIERS; }
  });

  const saveTiers = (updated) => {
    setTiers(updated);
    localStorage.setItem("ebc_margin_tiers", JSON.stringify(updated));
  };

  const handleChange = (key, val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0 || num > 100) return;
    saveTiers({ ...tiers, [key]: num });
  };

  const resetDefaults = () => {
    if (!confirm("Reset margin tiers to default values?")) return;
    saveTiers(DEFAULT_MARGIN_TIERS);
    app.show("Margin tiers reset to defaults", "ok");
  };

  const TIER_CONFIG = [
    { key: "bronze", label: "Bronze", color: "#cd7f32", bg: "rgba(205,127,50,0.10)", perks: "Thank-you email, referrals, priority scheduling" },
    { key: "silver", label: "Silver", color: "#94a3b8", bg: "rgba(148,163,184,0.10)", perks: "Lunch on EBC, preferred pricing on next bid" },
    { key: "gold", label: "Gold", color: "#eab308", bg: "rgba(234,179,8,0.10)", perks: "Gift card ($100), first-call on new projects" },
    { key: "platinum", label: "Platinum", color: "#a78bfa", bg: "rgba(167,139,250,0.10)", perks: "Annual dinner, exclusive partnership status" },
  ];

  return (
    <div className="mt-16">
      <div className="flex-between mb-16">
        <div>
          <div className="section-title">Margin Tier Rates</div>
          <div className="text-sm text-dim">Set the minimum profit margin % to qualify for each incentive/appreciation tier.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={resetDefaults}>Reset Defaults</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {TIER_CONFIG.map(tc => (
          <div key={tc.key} className="card" style={{ padding: 20, borderLeft: `4px solid ${tc.color}`, background: tc.bg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: tc.color }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: tc.color }}>{tc.label}</div>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Minimum Margin (%)</label>
              <input
                className="form-input"
                type="number"
                step="1"
                min="0"
                max="100"
                value={tiers[tc.key]}
                onChange={e => handleChange(tc.key, e.target.value)}
                style={{ fontWeight: 700, fontSize: 18, textAlign: "center", maxWidth: 120 }}
              />
            </div>
            <div className="text-xs text-dim">
              <span style={{ fontWeight: 600 }}>Perks:</span> {tc.perks}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-16" style={{ padding: 16 }}>
        <div className="text-sm font-semi mb-8">How It Works</div>
        <div className="text-sm text-dim">
          When a project is completed, its profit margin determines the appreciation tier.
          Projects with a margin at or above the threshold qualify for that tier's perks.
          These rates are used by the Incentive & Appreciation system.
        </div>
        <div className="mt-12" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {TIER_CONFIG.map(tc => (
            <div key={tc.key} style={{ fontSize: 13 }}>
              <span style={{ color: tc.color, fontWeight: 700 }}>{tc.label}:</span>{" "}
              <span style={{ fontFamily: "var(--font-mono)" }}>{tiers[tc.key]}%+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Account Settings ────────────────────────────────────────── */
function AccountTab({ app }) {
  const [name, setName] = useState(app.auth?.name || "");
  const [email, setEmail] = useState(app.auth?.email || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [newPin, setNewPin] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("ok");

  const saveProfile = () => {
    try {
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === app.auth.id);
      if (idx < 0) return;
      users[idx].name = name;
      users[idx].email = email.toLowerCase();
      localStorage.setItem("ebc_users", JSON.stringify(users));
      const auth = JSON.parse(localStorage.getItem("ebc_auth") || "{}");
      auth.name = name;
      auth.email = email.toLowerCase();
      localStorage.setItem("ebc_auth", JSON.stringify(auth));
      setMsg("Profile updated!");
      setMsgType("ok");
      app.show("Profile updated", "ok");
    } catch { setMsg("Error saving"); setMsgType("err"); }
  };

  const changePassword = async () => {
    if (!currentPw) { setMsg("Enter current password"); setMsgType("err"); return; }
    if (newPw.length < 6) { setMsg("New password must be at least 6 characters"); setMsgType("err"); return; }
    if (newPw !== confirmPw) { setMsg("Passwords do not match"); setMsgType("err"); return; }

    try {
      const { verifyPassword: vp, hashPassword: hp } = await import("../utils/passwordHash");
      const users = JSON.parse(localStorage.getItem("ebc_users") || "[]");
      const idx = users.findIndex(u => u.id === app.auth.id);
      if (idx < 0) return;

      const ok = await vp(currentPw, users[idx].password);
      if (!ok) {
        setMsg("Current password is incorrect");
        setMsgType("err");
        return;
      }

      users[idx].password = await hp(newPw);
      if (newPin && newPin.length >= 4) {
        users[idx].pin = await hp(newPin);
      }
      localStorage.setItem("ebc_users", JSON.stringify(users));
      setMsg("Password updated!");
      setMsgType("ok");
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setNewPin("");
      app.show("Password changed", "ok");
    } catch { setMsg("Error changing password"); setMsgType("err"); }
  };

  return (
    <div className="mt-16">
      <div className="section-title">My Profile</div>
      <div className="card mt-16">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="mt-16">
          <button className="btn btn-primary btn-sm" onClick={saveProfile}>Save Profile</button>
        </div>
      </div>

      <div className="section-title mt-16">Change Password</div>
      <div className="card mt-16">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">New PIN (optional)</label>
            <input className="form-input" type="text" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ""))} placeholder="4-digit PIN" />
          </div>
        </div>
        {msg && (
          <div className="mt-8" style={{
            padding: "8px 12px", borderRadius: 6, fontSize: 13,
            background: msgType === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: msgType === "ok" ? "var(--green)" : "var(--red)",
            border: `1px solid ${msgType === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            {msg}
          </div>
        )}
        <div className="mt-16">
          <button className="btn btn-primary btn-sm" onClick={changePassword}>Update Password</button>
        </div>
      </div>
      <NotificationSettings userId={app.auth?.id} />
    </div>
  );
}

/* ── Notification Settings ──────────────────────────────────── */
function NotificationSettings({ userId }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const { getNotificationPrefs } = require("../hooks/useNotifications");
      return getNotificationPrefs(userId);
    } catch {
      return { clockReminders: true, materialUpdates: true, scheduleChanges: true, dailyReportReminder: true, dailyReportTime: "16:30" };
    }
  });
  const [permission, setPermission] = useState(() => "Notification" in window ? Notification.permission : "unsupported");
  const [pushSubscribed, setPushSubscribed] = useState(() => {
    try {
      const { useNotifications } = require("../hooks/useNotifications");
      return !!localStorage.getItem(`ebc_push_sub_${userId}`);
    } catch { return false; }
  });
  const [pushLoading, setPushLoading] = useState(false);

  const toggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      const { saveNotificationPrefs } = require("../hooks/useNotifications");
      saveNotificationPrefs(userId, updated);
    } catch {}
  };

  const setTime = (val) => {
    const updated = { ...prefs, dailyReportTime: val };
    setPrefs(updated);
    try {
      const { saveNotificationPrefs } = require("../hooks/useNotifications");
      saveNotificationPrefs(userId, updated);
    } catch {}
  };

  const requestPerm = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const togglePush = async () => {
    setPushLoading(true);
    try {
      const mod = await import("../hooks/useNotifications");
      // We need the functions directly, not the hook
      if (pushSubscribed) {
        const { useNotifications } = mod;
        // Unsubscribe inline
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        localStorage.removeItem(`ebc_push_sub_${userId}`);
        setPushSubscribed(false);
      } else {
        // Subscribe
        const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
        if (!VAPID_KEY) { setPushLoading(false); return; }
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setPermission(perm); setPushLoading(false); return; }
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const padding = "=".repeat((4 - (VAPID_KEY.length % 4)) % 4);
          const b64 = (VAPID_KEY + padding).replace(/-/g, "+").replace(/_/g, "/");
          const raw = atob(b64);
          const key = Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        }
        localStorage.setItem(`ebc_push_sub_${userId}`, JSON.stringify(sub.toJSON()));
        try {
          await fetch("/.netlify/functions/push-subscribe", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: sub.toJSON(), userId, action: "subscribe" }),
          });
        } catch {}
        setPushSubscribed(true);
        setPermission("granted");
      }
    } catch (err) {
      console.warn("[push] toggle failed:", err.message);
    } finally {
      setPushLoading(false);
    }
  };

  const toggleStyle = (on) => ({
    width: 44, height: 24, borderRadius: 12, cursor: "pointer", border: "none",
    background: on ? "var(--ebc-gold, #e09422)" : "rgba(255,255,255,0.15)",
    position: "relative", transition: "background 0.2s",
  });
  const dotStyle = (on) => ({
    width: 18, height: 18, borderRadius: "50%", background: "#fff",
    position: "absolute", top: 3, left: on ? 22 : 3, transition: "left 0.2s",
  });

  return (
    <div className="mt-16">
      <div className="section-title">Notifications</div>
      <div className="card mt-8" style={{ padding: 16 }}>
        {permission !== "granted" && permission !== "unsupported" && (
          <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(224,148,34,0.1)", border: "1px solid rgba(224,148,34,0.3)", fontSize: 13 }}>
            Notifications are {permission === "denied" ? "blocked" : "not enabled"}.
            {permission === "default" && <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={requestPerm}>Enable</button>}
          </div>
        )}
        {[
          { key: "clockReminders", label: "Clock-in reminders" },
          { key: "materialUpdates", label: "Material request updates" },
          { key: "scheduleChanges", label: "Schedule change alerts" },
          { key: "dailyReportReminder", label: "Daily report reminder" },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{label}</span>
            <button style={toggleStyle(prefs[key])} onClick={() => toggle(key)}>
              <div style={dotStyle(prefs[key])} />
            </button>
          </div>
        ))}
        {prefs.dailyReportReminder && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Reminder time</span>
            <input type="time" value={prefs.dailyReportTime} onChange={e => setTime(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "4px 8px", color: "var(--text-primary)", fontSize: 13 }} />
          </div>
        )}
        {"PushManager" in window && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
              <div>
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>Background push</span>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Receive alerts even when app is closed</div>
              </div>
              <button style={toggleStyle(pushSubscribed)} onClick={togglePush} disabled={pushLoading}>
                <div style={dotStyle(pushSubscribed)} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── User Management (Owner/Admin only) ──────────────────────── */
function UsersTab({ app }) {
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", pin: "" });
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState("");

  const ROLES_IMPORT = {
    owner: "Owner", admin: "Admin", pm: "Project Manager", estimator: "Estimator",
    project_engineer: "Project Engineer", foreman: "Superintendent / Foreman",
    safety: "Safety Officer", accounting: "Accounting", office_admin: "Office Admin",
    employee: "Employee / Crew", driver: "Driver"
  };

  const refresh = () => {
    try { setUsers(JSON.parse(localStorage.getItem("ebc_users") || "[]")); } catch {}
  };

  const addUser = async () => {
    if (!form.name || !form.email) { app.show("Name and email required", "err"); return; }
    const existing = users.find(u => u.email.toLowerCase() === form.email.toLowerCase());
    if (existing) { app.show("Email already exists", "err"); return; }

    const { hashPasswordSync: hps } = await import("../utils/passwordHash");
    const newUser = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email.toLowerCase(),
      password: hps(form.name.split(" ")[0] + "123!"),
      role: form.role,
      pin: hps(form.pin || String(1000 + users.length + 1)),
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setForm({ name: "", email: "", role: "employee", pin: "" });
    setAdding(false);
    app.show(`Added ${newUser.name} — temp password: ${form.name.split(" ")[0]}123!`, "ok");
  };

  const resetPassword = async (user) => {
    const { hashPasswordSync: hps } = await import("../utils/passwordHash");
    const tempPw = user.name.split(" ")[0] + "123!";
    const updated = users.map(u =>
      u.id === user.id ? { ...u, password: hps(tempPw), mustChangePassword: true } : u
    );
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`Password reset for ${user.name} — temp: ${tempPw}`, "ok");
  };

  const updateRole = (userId) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: editRole } : u);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setEditId(null);
    app.show("Role updated", "ok");
  };

  const deleteUser = (user) => {
    if (user.id === app.auth.id) { app.show("Cannot delete yourself", "err"); return; }
    if (!confirm(`Remove ${user.name}?`)) return;
    const updated = users.filter(u => u.id !== user.id);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`Removed ${user.name}`, "ok");
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Team Members ({users.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add User</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@ebconstructors.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PIN (4-digit)</label>
              <input className="form-input" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} placeholder="Auto-generated" />
            </div>
          </div>
          <div className="mt-16" style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addUser}>Create User</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 8 }}>
            Temp password will be: [FirstName]123! — user will be prompted to change on first login.
          </div>
        </div>
      )}

      <div className="mt-16">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>PIN</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>
                  {u.name}
                  {u.id === app.auth.id && <span style={{ fontSize: 10, color: "var(--amber)", marginLeft: 6 }}>(you)</span>}
                  {u.mustChangePassword && <span style={{ fontSize: 10, color: "var(--red)", marginLeft: 6 }}>temp pw</span>}
                </td>
                <td style={{ fontSize: 12 }}>{u.email}</td>
                <td>
                  {editId === u.id ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <select className="form-select" style={{ fontSize: 11, padding: "2px 4px" }} value={editRole} onChange={e => setEditRole(e.target.value)}>
                        {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button className="btn btn-primary" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => updateRole(u.id)}>Save</button>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <span
                      className="badge badge-blue"
                      style={{ cursor: "pointer", fontSize: 10 }}
                      onClick={() => { setEditId(u.id); setEditRole(u.role); }}
                      title="Click to change role"
                    >
                      {ROLES_IMPORT[u.role] || u.role}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{u.pin || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 10, padding: "2px 8px", color: "var(--amber)" }}
                      onClick={() => resetPassword(u)}
                      title="Reset to temp password"
                    >
                      Reset PW
                    </button>
                    {u.id !== app.auth.id && (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 10, padding: "2px 8px", color: "var(--red)" }}
                        onClick={() => deleteUser(u)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Company ─────────────────────────────────────────────────── */
function CompanyTab({ app }) {
  const [form, setForm] = useState(() => ({ ...app.company }));

  const save = () => {
    app.setCompany({ ...form });
    app.show("Company info saved", "ok");
  };

  return (
    <div className="mt-16">
      <div className="section-title">Company Information</div>
      <div className="card mt-16">
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">License</label>
            <input className="form-input" value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="section-title mt-16">Company Logo</div>
      <div className="card mt-16" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {form.logoUrl && <img src={form.logoUrl} alt="Logo" style={{ maxHeight: 64, maxWidth: 200, borderRadius: 4, objectFit: "contain" }} />}
        <div>
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result }));
            reader.readAsDataURL(file);
          }} />
          <div className="text-xs text-muted mt-4">PNG or JPG recommended. Stored locally.</div>
          {form.logoUrl && <button className="btn btn-ghost btn-sm mt-8" style={{ color: "var(--red)", fontSize: 11 }} onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}>Remove Logo</button>}
        </div>
      </div>

      <div className="mt-16">
        <button className="btn btn-primary btn-sm" onClick={save}>Save Company Info</button>
      </div>
    </div>
  );
}

/* ── Assemblies ──────────────────────────────────────────────── */
function AssembliesTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", unit: "LF", matRate: "", labRate: "", verified: false });
  const [editing, setEditing] = useState(null); // id being edited
  const [editVals, setEditVals] = useState({ matRate: "", labRate: "" });

  const save = () => {
    if (!form.code || !form.name) return app.show("Fill required fields", "err");
    const newAsm = {
      code: form.code,
      name: form.name,
      unit: form.unit,
      matRate: Number(form.matRate) || 0,
      labRate: Number(form.labRate) || 0,
      verified: form.verified,
    };
    app.setAssemblies(prev => [...prev, newAsm]);
    app.show("Assembly added", "ok");
    setAdding(false);
    setForm({ code: "", name: "", unit: "LF", matRate: "", labRate: "", verified: false });
  };

  const startEdit = (asm) => {
    setEditing(asm.code);
    setEditVals({ matRate: asm.matRate, labRate: asm.labRate });
  };

  const saveEdit = (code) => {
    app.setAssemblies(prev => prev.map(a =>
      a.code === code ? { ...a, matRate: Number(editVals.matRate), labRate: Number(editVals.labRate) } : a
    ));
    app.show("Assembly updated", "ok");
    setEditing(null);
  };

  const deleteAsm = (code) => {
    if (!confirm(`Delete assembly ${code}?`)) return;
    app.setAssemblies(prev => prev.filter(a => a.code !== code));
    app.show("Assembly deleted", "ok");
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Assemblies</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Assembly</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Code</label>
              <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="LF">LF</option>
                <option value="SF">SF</option>
                <option value="EA">EA</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mat Rate</label>
              <input className="form-input" type="number" step="0.01" value={form.matRate} onChange={e => setForm({ ...form, matRate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Lab Rate</label>
              <input className="form-input" type="number" step="0.01" value={form.labRate} onChange={e => setForm({ ...form, labRate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={form.verified} onChange={e => setForm({ ...form, verified: e.target.checked })} />
                Verified
              </label>
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Unit</th><th>Mat Rate</th><th>Lab Rate</th><th>Verified</th><th></th></tr></thead>
          <tbody>
            {app.assemblies.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center" }}>No assemblies</td></tr>}
            {app.assemblies.map(asm => (
              <tr key={asm.code}>
                <td>{asm.code}</td>
                <td>{asm.name}</td>
                <td>{asm.unit}</td>
                <td>
                  {editing === asm.code ? (
                    <input className="form-input" type="number" step="0.01" style={{ width: 80 }} value={editVals.matRate} onChange={e => setEditVals({ ...editVals, matRate: e.target.value })} />
                  ) : (
                    `$${asm.matRate.toFixed(2)}`
                  )}
                </td>
                <td>
                  {editing === asm.code ? (
                    <input className="form-input" type="number" step="0.01" style={{ width: 80 }} value={editVals.labRate} onChange={e => setEditVals({ ...editVals, labRate: e.target.value })} />
                  ) : (
                    `$${asm.labRate.toFixed(2)}`
                  )}
                </td>
                <td>{asm.verified ? <span className="badge-green">Yes</span> : <span className="badge-muted">No</span>}</td>
                <td>
                  {editing === asm.code ? (
                    <div className="flex gap-8">
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(asm.code)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(asm)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteAsm(asm.code)}>Del</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Data Management ─────────────────────────────────────────── */
function DataTab({ app }) {
  const doExport = () => {
    const data = {
      invoices: app.invoices,
      changeOrders: app.changeOrders,
      rfis: app.rfis,
      submittals: app.submittals,
      schedule: app.schedule,
      incidents: app.incidents,
      toolboxTalks: app.toolboxTalks,
      dailyReports: app.dailyReports,
      projects: app.projects,
      company: app.company,
      assemblies: app.assemblies,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebc-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    app.show("Data exported", "ok");
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.invoices) app.setInvoices(data.invoices);
        if (data.changeOrders) app.setChangeOrders(data.changeOrders);
        if (data.rfis) app.setRfis(data.rfis);
        if (data.submittals) app.setSubmittals(data.submittals);
        if (data.schedule) app.setSchedule(data.schedule);
        if (data.incidents) app.setIncidents(data.incidents);
        if (data.toolboxTalks) app.setToolboxTalks(data.toolboxTalks);
        if (data.dailyReports) app.setDailyReports(data.dailyReports);
        if (data.projects) app.setProjects(data.projects);
        if (data.company) app.setCompany(data.company);
        if (data.assemblies) app.setAssemblies(data.assemblies);
        app.show("Data imported successfully", "ok");
      } catch {
        app.show("Invalid JSON file", "err");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doReset = () => {
    if (!confirm("Reset ALL data to defaults? This cannot be undone.")) return;
    app.setCompany({ ...COMPANY_DEFAULTS });
    app.setAssemblies([...ASSEMBLIES]);
    app.setInvoices([]);
    app.setChangeOrders([]);
    app.setRfis([]);
    app.setSubmittals([]);
    app.setSchedule([]);
    app.setIncidents([]);
    app.setToolboxTalks([]);
    app.setDailyReports([]);
    app.show("Data reset to defaults", "ok");
  };

  return (
    <div className="mt-16">
      <div className="section-title">Data Management</div>
      <div className="card mt-16">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <strong>Export Data</strong>
            <p className="text2" style={{ margin: "4px 0 8px" }}>Download all app data as a JSON backup file.</p>
            <button className="btn btn-primary btn-sm" onClick={doExport}>Export JSON</button>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <strong>Import Data</strong>
            <p className="text2" style={{ margin: "4px 0 8px" }}>Restore data from a previously exported JSON file.</p>
            <input type="file" accept=".json" onChange={doImport} style={{ fontSize: 13 }} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <strong>Reset All Data</strong>
            <p className="text2" style={{ margin: "4px 0 8px" }}>Clear all data and restore factory defaults. This cannot be undone.</p>
            <button className="btn btn-danger btn-sm" onClick={doReset}>Reset to Defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Theme Picker ────────────────────────────────────────────── */
function ThemeTab({ app }) {
  return (
    <div className="mt-16">
      <div className="section-title">Theme</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginTop: 16 }}>
        {Object.entries(THEMES).map(([key, theme]) => {
          const isActive = app.theme === key;
          return (
            <div
              key={key}
              className="card"
              onClick={() => app.setTheme(key)}
              style={{
                cursor: "pointer",
                border: isActive ? "2px solid var(--amber)" : "2px solid transparent",
                textAlign: "center",
                padding: 24,
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ fontSize: 32 }}>{theme.icon}</div>
              <div style={{ marginTop: 8, fontWeight: 600 }}>{theme.name}</div>
              {isActive && <div className="badge-green" style={{ marginTop: 8 }}>Active</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── API Settings ────────────────────────────────────────────── */
function ApiTab({ app }) {
  const [key, setKey] = useState(app.apiKey || "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const saveKey = () => {
    if (key && !key.startsWith("sk-ant-")) {
      app.show("Key should start with sk-ant-", "err");
      return;
    }
    app.setApiKey(key);
    app.show(key ? "API key saved" : "API key cleared");
  };

  const testConnection = async () => {
    if (!key) { app.show("Enter an API key first", "err"); return; }
    setTesting(true);
    setStatus(null);
    try {
      const { callClaude } = await import("../utils/api.js");
      const result = await callClaude(key, "Reply with exactly: EBC connected", 32);
      if (result.toLowerCase().includes("connected")) {
        setStatus("ok");
        app.show("API connected successfully");
      } else {
        setStatus("ok");
        app.show("API responding");
      }
    } catch (err) {
      setStatus("err");
      app.show("Connection failed: " + err.message, "err");
    }
    setTesting(false);
  };

  return (
    <div className="mt-16">
      <div className="section-title">Anthropic API</div>
      <div className="card mt-16">
        <div className="text-sm text-dim mb-16">
          Connect your Anthropic API key to enable Gmail bid sync and AI-drafted appreciation emails.
        </div>
        <div className="form-grid">
          <div className="form-group full">
            <label className="form-label">API Key</label>
            <input
              className="form-input font-mono"
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-ant-..."
            />
          </div>
        </div>
        <div className="flex gap-8 mt-16" style={{ alignItems: "center" }}>
          <button className="btn btn-primary btn-sm" onClick={saveKey}>Save Key</button>
          <button className="btn btn-ghost btn-sm" onClick={testConnection} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {key && <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => { setKey(""); app.setApiKey(""); app.show("API key cleared"); }}>Clear Key</button>}
          {status === "ok" && <span className="badge badge-green">Connected</span>}
          {status === "err" && <span className="badge badge-red">Failed</span>}
          {app.apiKey && !status && <span className="text-xs text-muted">Key set: sk-ant-...{app.apiKey.slice(-4)}</span>}
        </div>
      </div>

      <div className="section-title mt-16">Features</div>
      <div className="card mt-16">
        <div style={{ fontSize: 13 }}>
          <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <strong>Gmail Bid Sync</strong> — Analyze emails for bid information and auto-populate bid tracker
          </div>
          <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
            <strong>AI Appreciation Emails</strong> — Draft thank-you emails based on project performance tiers
          </div>
          <div style={{ padding: "8px 0" }}>
            <strong>Bid Analysis</strong> — Get AI insights on bid patterns and win rate optimization
          </div>
        </div>
      </div>
    </div>
  );
}
