import { useState, useMemo } from "react";

/**
 * Compute per-line billing amounts from SOV items + pay app lines.
 */
function computePayAppLines(sovItems, payApp) {
  return sovItems.map(sov => {
    const line = payApp.lines.find(l => l.sovItemId === sov.id) || { previousPercent: 0, currentPercent: 0, storedMaterial: 0 };
    const scheduled = sov.scheduledValue || 0;
    const prevWork = Math.round(scheduled * (line.previousPercent / 100));
    const totalCompleted = Math.round(scheduled * (line.currentPercent / 100));
    const currentWork = totalCompleted - prevWork;
    const stored = line.storedMaterial || 0;
    const totalCompletedAndStored = totalCompleted + stored;
    const retainage = Math.round(totalCompletedAndStored * (payApp.retainageRate || 10) / 100);
    const balance = scheduled - totalCompletedAndStored;
    return {
      lineNumber: sov.lineNumber,
      description: sov.description,
      scheduledValue: scheduled,
      previousWork: prevWork,
      currentWork,
      storedMaterial: stored,
      totalCompletedAndStored,
      retainage,
      balance,
      percentComplete: line.currentPercent,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Schedule of Values Editor + Pay Application Manager
//  Eagles Brothers Constructors · Houston, TX
//  E2: SOV table editor | E3: Pay app generation | E4: History
// ═══════════════════════════════════════════════════════════════

const SUB_TABS = ["Schedule of Values", "Pay Applications", "Billing History"];

export default function SOVEditor({ project, app }) {
  const [sub, setSub] = useState("Schedule of Values");
  return (
    <div>
      <div className="tab-header">
        {SUB_TABS.map(t => (
          <button key={t} className={`tab-btn${sub === t ? " active" : ""}`} onClick={() => setSub(t)}>{t}</button>
        ))}
      </div>
      {sub === "Schedule of Values" && <SOVTable project={project} app={app} />}
      {sub === "Pay Applications" && <PayAppManager project={project} app={app} />}
      {sub === "Billing History" && <BillingHistory project={project} app={app} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   E2 — SOV TABLE EDITOR
   ═══════════════════════════════════════════════════════════ */
function SOVTable({ project, app }) {
  const items = (app.sovItems || []).filter(s => String(s.projectId) === String(project.id));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: "", scheduledValue: "" });
  const [editId, setEditId] = useState(null);

  const totalScheduled = items.reduce((s, i) => s + (i.scheduledValue || 0), 0);
  const contractValue = project.contract || 0;
  const diff = contractValue - totalScheduled;
  const nextLineNum = items.length > 0 ? Math.max(...items.map(i => i.lineNumber || 0)) + 1 : 1;

  // Latest pay app for this project — used to show current billing state
  const payApps = (app.payApps || []).filter(p => String(p.projectId) === String(project.id));
  const latestPayApp = payApps.length > 0 ? payApps.sort((a, b) => b.periodNumber - a.periodNumber)[0] : null;

  const saveItem = () => {
    const desc = form.description.trim();
    const val = parseFloat(form.scheduledValue) || 0;
    if (!desc) { app.show("Description required", "err"); return; }
    if (val <= 0) { app.show("Scheduled value must be > 0", "err"); return; }

    if (editId) {
      app.setSovItems(prev => prev.map(s => s.id === editId ? { ...s, description: desc, scheduledValue: val } : s));
      app.show("SOV line updated", "ok");
      setEditId(null);
    } else {
      app.setSovItems(prev => [...prev, {
        id: crypto.randomUUID(),
        projectId: project.id,
        lineNumber: nextLineNum,
        description: desc,
        scheduledValue: val,
      }]);
      app.show("SOV line added", "ok");
    }
    setForm({ description: "", scheduledValue: "" });
    setAdding(false);
  };

  const removeItem = (id) => {
    if (!confirm("Remove this SOV line item?")) return;
    app.setSovItems(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // Renumber remaining lines for this project
      let num = 1;
      return filtered.map(s => {
        if (String(s.projectId) !== String(project.id)) return s;
        return { ...s, lineNumber: num++ };
      });
    });
    app.show("Line removed", "ok");
  };

  const moveItem = (id, dir) => {
    const projItems = items.slice().sort((a, b) => a.lineNumber - b.lineNumber);
    const idx = projItems.findIndex(s => s.id === id);
    if (idx < 0) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= projItems.length) return;
    const idA = projItems[idx].id;
    const idB = projItems[swapIdx].id;
    const numA = projItems[idx].lineNumber;
    const numB = projItems[swapIdx].lineNumber;
    app.setSovItems(prev => prev.map(s => {
      if (s.id === idA) return { ...s, lineNumber: numB };
      if (s.id === idB) return { ...s, lineNumber: numA };
      return s;
    }));
  };

  const importFromScope = () => {
    if (items.length > 0 && !confirm("This will add scope items as new SOV lines. Continue?")) return;
    const existingDescs = items.map(i => i.description.toLowerCase());
    const scopeItems = (project.scope || []).filter(s => !existingDescs.includes(s.toLowerCase()));
    if (scopeItems.length === 0) { app.show("All scope items already in SOV", "ok"); return; }
    let num = nextLineNum;
    const perItem = contractValue > 0 && items.length === 0 ? Math.floor(contractValue / scopeItems.length) : 0;
    const newItems = scopeItems.map((s, i) => ({
      id: crypto.randomUUID(),
      projectId: project.id,
      lineNumber: num++,
      description: s,
      scheduledValue: i === scopeItems.length - 1 && perItem > 0
        ? contractValue - perItem * (scopeItems.length - 1) // last item gets remainder
        : perItem,
    }));
    app.setSovItems(prev => [...prev, ...newItems]);
    app.show(`${newItems.length} scope items imported`, "ok");
  };

  const sorted = items.slice().sort((a, b) => a.lineNumber - b.lineNumber);

  // Compute billing state per line if there's a pay app
  const billingByLine = useMemo(() => {
    if (!latestPayApp) return {};
    const map = {};
    latestPayApp.lines.forEach(l => { map[l.sovItemId] = l; });
    return map;
  }, [latestPayApp]);

  return (
    <div>
      {/* Header with totals */}
      <div className="flex gap-16 mb-12 flex-wrap" style={{ alignItems: "flex-end" }}>
        <div>
          <span className="text-dim text-xs">CONTRACT VALUE</span>
          <div className="font-mono text-amber">{app.fmt(contractValue)}</div>
        </div>
        <div>
          <span className="text-dim text-xs">SOV TOTAL</span>
          <div className="font-mono" style={{ color: Math.abs(diff) < 1 ? "var(--green)" : "var(--red)" }}>
            {app.fmt(totalScheduled)}
          </div>
        </div>
        <div>
          <span className="text-dim text-xs">DIFFERENCE</span>
          <div className="font-mono" style={{ color: Math.abs(diff) < 1 ? "var(--green)" : "var(--red)" }}>
            {diff >= 0 ? app.fmt(diff) : `(${app.fmt(Math.abs(diff))})`}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={importFromScope}>Import from Scope</button>
          <button className="btn btn-amber btn-sm" onClick={() => { setAdding(true); setEditId(null); setForm({ description: "", scheduledValue: "" }); }}>+ Add Line</button>
        </div>
      </div>

      {Math.abs(diff) > 1 && (
        <div className="card p-8 mb-12" style={{ border: "1px solid var(--red)", background: "var(--red-dim)" }}>
          <span className="text-xs" style={{ color: "var(--red)" }}>SOV total does not match contract value. Adjust line items so they equal {app.fmt(contractValue)}.</span>
        </div>
      )}

      {/* Add/Edit form */}
      {adding && (
        <div className="card p-12 mb-12" style={{ border: "1px solid var(--amber)" }}>
          <div className="flex gap-8 flex-wrap" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 2 }}>
              <label className="form-label fs-10">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Metal Framing" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label fs-10">Scheduled Value ($)</label>
              <input className="form-input" type="number" value={form.scheduledValue} onChange={e => setForm({ ...form, scheduledValue: e.target.value })} placeholder="0" />
            </div>
            <div className="flex gap-4">
              <button className="btn btn-amber btn-sm" onClick={saveItem}>{editId ? "Update" : "Add"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* SOV Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-24 text-dim">
          <div className="text-lg mb-4">No SOV lines yet</div>
          <div className="text-xs">Click "Import from Scope" to auto-populate from project scope, or "Add Line" to start manually.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table w-full" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Scheduled Value</th>
                {latestPayApp && <th style={{ textAlign: "right" }}>% Complete</th>}
                {latestPayApp && <th style={{ textAlign: "right" }}>Billed to Date</th>}
                {latestPayApp && <th style={{ textAlign: "right" }}>Balance</th>}
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const billing = billingByLine[item.id];
                const billedAmt = billing ? Math.round(item.scheduledValue * (billing.currentPercent / 100)) : 0;
                const bal = item.scheduledValue - billedAmt;
                return (
                  <tr key={item.id}>
                    <td className="font-mono text-dim">{item.lineNumber}</td>
                    <td>{item.description}</td>
                    <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(item.scheduledValue)}</td>
                    {latestPayApp && <td className="font-mono" style={{ textAlign: "right" }}>{billing ? billing.currentPercent + "%" : "0%"}</td>}
                    {latestPayApp && <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(billedAmt)}</td>}
                    {latestPayApp && (
                      <td className="font-mono" style={{ textAlign: "right", color: bal > 0 ? "var(--green)" : "var(--text3)" }}>
                        {app.fmt(bal)}
                      </td>
                    )}
                    <td>
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-xs" onClick={() => moveItem(item.id, -1)} title="Move up">&uarr;</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => moveItem(item.id, 1)} title="Move down">&darr;</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => {
                          setEditId(item.id);
                          setForm({ description: item.description, scheduledValue: String(item.scheduledValue) });
                          setAdding(true);
                        }}>Edit</button>
                        <button className="btn btn-ghost btn-xs" style={{ color: "var(--red)" }} onClick={() => removeItem(item.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600, borderTop: "2px solid var(--border)" }}>
                <td></td>
                <td>TOTAL</td>
                <td className="font-mono" style={{ textAlign: "right", color: "var(--amber)" }}>{app.fmt(totalScheduled)}</td>
                {latestPayApp && <td className="font-mono" style={{ textAlign: "right" }}>
                  {totalScheduled > 0 ? Math.round((sorted.reduce((s, item) => {
                    const billing = billingByLine[item.id];
                    return s + (billing ? Math.round(item.scheduledValue * billing.currentPercent / 100) : 0);
                  }, 0) / totalScheduled) * 100) + "%" : "0%"}
                </td>}
                {latestPayApp && <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(sorted.reduce((s, item) => {
                  const billing = billingByLine[item.id];
                  return s + (billing ? Math.round(item.scheduledValue * billing.currentPercent / 100) : 0);
                }, 0))}</td>}
                {latestPayApp && <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalScheduled - sorted.reduce((s, item) => {
                  const billing = billingByLine[item.id];
                  return s + (billing ? Math.round(item.scheduledValue * billing.currentPercent / 100) : 0);
                }, 0))}</td>}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   E3 — PAY APPLICATION MANAGER
   ═══════════════════════════════════════════════════════════ */
function PayAppManager({ project, app }) {
  const sovItems = (app.sovItems || []).filter(s => String(s.projectId) === String(project.id)).sort((a, b) => a.lineNumber - b.lineNumber);
  const payApps = (app.payApps || []).filter(p => String(p.projectId) === String(project.id)).sort((a, b) => a.periodNumber - b.periodNumber);
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [lines, setLines] = useState([]);
  const [paForm, setPaForm] = useState({ periodDate: new Date().toISOString().slice(0, 10), notes: "", retainageRate: String(app.companySettings?.defaultRetainageRate || 10) });

  const defaultRetainage = app.companySettings?.defaultRetainageRate || 10;

  if (sovItems.length === 0) {
    return (
      <div className="text-center py-24 text-dim">
        <div className="text-lg mb-4">No SOV lines defined</div>
        <div className="text-xs">Create your Schedule of Values first, then come back here to generate pay applications.</div>
      </div>
    );
  }

  const startNewPayApp = () => {
    const nextPeriod = payApps.length > 0 ? Math.max(...payApps.map(p => p.periodNumber)) + 1 : 1;
    const prevApp = payApps.length > 0 ? payApps[payApps.length - 1] : null;
    // Pre-fill lines: previous % comes from the last pay app's current %
    const newLines = sovItems.map(sov => {
      const prevLine = prevApp ? prevApp.lines.find(l => l.sovItemId === sov.id) : null;
      return {
        sovItemId: sov.id,
        description: sov.description,
        scheduledValue: sov.scheduledValue,
        previousPercent: prevLine ? prevLine.currentPercent : 0,
        currentPercent: prevLine ? prevLine.currentPercent : 0, // start at previous level
        storedMaterial: 0,
      };
    });
    setLines(newLines);
    setPaForm({
      periodDate: new Date().toISOString().slice(0, 10),
      notes: "",
      retainageRate: String(defaultRetainage),
      periodNumber: nextPeriod,
    });
    setCreating(true);
    setViewId(null);
  };

  const updateLinePercent = (sovItemId, val) => {
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setLines(prev => prev.map(l => l.sovItemId === sovItemId ? { ...l, currentPercent: pct } : l));
  };

  const updateLineStored = (sovItemId, val) => {
    setLines(prev => prev.map(l => l.sovItemId === sovItemId ? { ...l, storedMaterial: parseFloat(val) || 0 } : l));
  };

  const savePayApp = (status = "draft") => {
    const pa = {
      id: crypto.randomUUID(),
      projectId: project.id,
      periodNumber: paForm.periodNumber,
      periodDate: paForm.periodDate,
      status,
      retainageRate: parseFloat(paForm.retainageRate) || defaultRetainage,
      notes: paForm.notes,
      lines: lines.map(l => ({
        sovItemId: l.sovItemId,
        previousPercent: l.previousPercent,
        currentPercent: l.currentPercent,
        storedMaterial: l.storedMaterial,
      })),
      createdAt: new Date().toISOString(),
      submittedAt: status === "submitted" ? new Date().toISOString() : null,
    };
    app.setPayApps(prev => [...prev, pa]);
    app.show(`Pay App #${pa.periodNumber} saved as ${status}`, "ok");
    setCreating(false);
  };

  const exportPdf = async (payApp) => {
    try {
      const { generatePayAppPdf } = await import("../utils/payAppPdf");
      await generatePayAppPdf(project, sovItems, payApp, app.company);
      app.show("PDF downloaded", "ok");
    } catch (e) {
      app.show("PDF export failed: " + e.message, "err");
    }
  };

  const updateStatus = (paId, newStatus) => {
    app.setPayApps(prev => prev.map(p => {
      if (p.id !== paId) return p;
      const updated = { ...p, status: newStatus };
      if (newStatus === "submitted") updated.submittedAt = new Date().toISOString();
      return updated;
    }));
    app.show(`Status updated to ${newStatus}`, "ok");
  };

  // Viewing an existing pay app
  const viewApp = viewId ? payApps.find(p => p.id === viewId) : null;
  const viewLines = viewApp ? computePayAppLines(sovItems, viewApp) : [];

  const statusBadge = (s) => ({ draft: "badge-ghost", submitted: "badge-amber", paid: "badge-green" }[s] || "badge-ghost");

  if (creating) {
    // ── Pay app entry form ──
    const retRate = parseFloat(paForm.retainageRate) || defaultRetainage;
    const totalScheduled = lines.reduce((s, l) => s + l.scheduledValue, 0);
    const totalPrevWork = lines.reduce((s, l) => s + Math.round(l.scheduledValue * l.previousPercent / 100), 0);
    const totalCurrCompleted = lines.reduce((s, l) => s + Math.round(l.scheduledValue * l.currentPercent / 100), 0);
    const totalThisPeriod = totalCurrCompleted - totalPrevWork;
    const totalStored = lines.reduce((s, l) => s + l.storedMaterial, 0);
    const totalCompStored = totalCurrCompleted + totalStored;
    const totalRetainage = Math.round(totalCompStored * retRate / 100);

    return (
      <div>
        <div className="flex gap-8 mb-12" style={{ alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>&larr; Back</button>
          <span className="fw-600">New Pay Application #{paForm.periodNumber}</span>
        </div>

        <div className="flex gap-8 mb-12 flex-wrap">
          <div>
            <label className="form-label fs-10">Period Date</label>
            <input className="form-input" type="date" value={paForm.periodDate} onChange={e => setPaForm({ ...paForm, periodDate: e.target.value })} />
          </div>
          <div>
            <label className="form-label fs-10">Retainage %</label>
            <input className="form-input" type="number" value={paForm.retainageRate} onChange={e => setPaForm({ ...paForm, retainageRate: e.target.value })} style={{ width: 80 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label fs-10">Notes</label>
            <input className="form-input" value={paForm.notes} onChange={e => setPaForm({ ...paForm, notes: e.target.value })} placeholder="Period notes..." />
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex gap-16 mb-12 flex-wrap">
          <div><span className="text-dim text-xs">SCHEDULED</span><div className="font-mono">{app.fmt(totalScheduled)}</div></div>
          <div><span className="text-dim text-xs">PREV BILLED</span><div className="font-mono">{app.fmt(totalPrevWork)}</div></div>
          <div><span className="text-dim text-xs">THIS PERIOD</span><div className="font-mono text-green">{app.fmt(totalThisPeriod)}</div></div>
          <div><span className="text-dim text-xs">STORED</span><div className="font-mono">{app.fmt(totalStored)}</div></div>
          <div><span className="text-dim text-xs">TOTAL COMP + STORED</span><div className="font-mono text-amber">{app.fmt(totalCompStored)}</div></div>
          <div><span className="text-dim text-xs">RETAINAGE</span><div className="font-mono">{app.fmt(totalRetainage)}</div></div>
          <div><span className="text-dim text-xs">NET DUE</span><div className="font-mono fw-600 text-green">{app.fmt(totalThisPeriod - Math.round(totalThisPeriod * retRate / 100))}</div></div>
        </div>

        {/* Line entry table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table w-full" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Scheduled</th>
                <th style={{ textAlign: "right" }}>Previous %</th>
                <th style={{ textAlign: "right", width: 90 }}>Current %</th>
                <th style={{ textAlign: "right" }}>This Period $</th>
                <th style={{ textAlign: "right", width: 90 }}>Stored Material</th>
                <th style={{ textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => {
                const prevWork = Math.round(line.scheduledValue * line.previousPercent / 100);
                const currWork = Math.round(line.scheduledValue * line.currentPercent / 100);
                const thisPeriod = currWork - prevWork;
                const balance = line.scheduledValue - currWork - line.storedMaterial;
                return (
                  <tr key={line.sovItemId}>
                    <td className="font-mono text-dim">{sovItems.find(s => s.id === line.sovItemId)?.lineNumber}</td>
                    <td>{line.description}</td>
                    <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.scheduledValue)}</td>
                    <td className="font-mono text-dim" style={{ textAlign: "right" }}>{line.previousPercent}%</td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        className="form-input font-mono"
                        type="number"
                        min={line.previousPercent}
                        max={100}
                        value={line.currentPercent}
                        onChange={e => updateLinePercent(line.sovItemId, e.target.value)}
                        style={{ width: 70, textAlign: "right", padding: "2px 4px" }}
                      />
                    </td>
                    <td className="font-mono" style={{ textAlign: "right", color: thisPeriod > 0 ? "var(--green)" : "var(--text3)" }}>
                      {app.fmt(thisPeriod)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        className="form-input font-mono"
                        type="number"
                        min={0}
                        value={line.storedMaterial}
                        onChange={e => updateLineStored(line.sovItemId, e.target.value)}
                        style={{ width: 80, textAlign: "right", padding: "2px 4px" }}
                      />
                    </td>
                    <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(balance)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600, borderTop: "2px solid var(--border)" }}>
                <td></td>
                <td>TOTALS</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalScheduled)}</td>
                <td></td>
                <td></td>
                <td className="font-mono text-green" style={{ textAlign: "right" }}>{app.fmt(totalThisPeriod)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalStored)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalScheduled - totalCompStored)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-8 mt-12">
          <button className="btn btn-ghost btn-sm" onClick={() => savePayApp("draft")}>Save Draft</button>
          <button className="btn btn-amber btn-sm" onClick={() => savePayApp("submitted")}>Save & Mark Submitted</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  if (viewApp) {
    const totalScheduled = viewLines.reduce((s, l) => s + l.scheduledValue, 0);
    const totalCurrent = viewLines.reduce((s, l) => s + l.currentWork, 0);
    const totalPrev = viewLines.reduce((s, l) => s + l.previousWork, 0);
    const totalCS = viewLines.reduce((s, l) => s + l.totalCompletedAndStored, 0);
    const totalRet = viewLines.reduce((s, l) => s + l.retainage, 0);
    const totalBal = viewLines.reduce((s, l) => s + l.balance, 0);

    return (
      <div>
        <div className="flex gap-8 mb-12" style={{ alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setViewId(null)}>&larr; Back</button>
          <span className="fw-600">Pay Application #{viewApp.periodNumber}</span>
          <span className={`badge ${statusBadge(viewApp.status)}`}>{viewApp.status}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {viewApp.status === "draft" && <button className="btn btn-amber btn-sm" onClick={() => updateStatus(viewApp.id, "submitted")}>Mark Submitted</button>}
            {viewApp.status === "submitted" && <button className="btn btn-amber btn-sm" onClick={() => updateStatus(viewApp.id, "paid")}>Mark Paid</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => exportPdf(viewApp)}>Export PDF</button>
          </div>
        </div>

        <div className="flex gap-16 mb-12 flex-wrap">
          <div><span className="text-dim text-xs">PERIOD</span><div>{viewApp.periodDate}</div></div>
          <div><span className="text-dim text-xs">RETAINAGE</span><div>{viewApp.retainageRate}%</div></div>
          {viewApp.notes && <div><span className="text-dim text-xs">NOTES</span><div>{viewApp.notes}</div></div>}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table w-full" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Scheduled</th>
                <th style={{ textAlign: "right" }}>Previous</th>
                <th style={{ textAlign: "right" }}>This Period</th>
                <th style={{ textAlign: "right" }}>Stored</th>
                <th style={{ textAlign: "right" }}>Total Comp</th>
                <th style={{ textAlign: "right" }}>%</th>
                <th style={{ textAlign: "right" }}>Retainage</th>
                <th style={{ textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {viewLines.map(line => (
                <tr key={line.lineNumber}>
                  <td className="font-mono text-dim">{line.lineNumber}</td>
                  <td>{line.description}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.scheduledValue)}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.previousWork)}</td>
                  <td className="font-mono" style={{ textAlign: "right", color: line.currentWork > 0 ? "var(--green)" : "var(--text3)" }}>{app.fmt(line.currentWork)}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.storedMaterial)}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.totalCompletedAndStored)}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{line.percentComplete}%</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.retainage)}</td>
                  <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(line.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600, borderTop: "2px solid var(--border)" }}>
                <td></td>
                <td>TOTALS</td>
                <td className="font-mono text-amber" style={{ textAlign: "right" }}>{app.fmt(totalScheduled)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalPrev)}</td>
                <td className="font-mono text-green" style={{ textAlign: "right" }}>{app.fmt(totalCurrent)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(viewLines.reduce((s, l) => s + l.storedMaterial, 0))}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalCS)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{totalScheduled > 0 ? Math.round(totalCS / totalScheduled * 100) + "%" : "0%"}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalRet)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalBal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // ── Pay app list ──
  return (
    <div>
      <div className="flex gap-8 mb-12" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-amber btn-sm" onClick={startNewPayApp}>+ New Pay Application</button>
      </div>

      {payApps.length === 0 ? (
        <div className="text-center py-24 text-dim">
          <div className="text-lg mb-4">No pay applications yet</div>
          <div className="text-xs">Create your first pay application to start billing against the SOV.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table w-full" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ width: 50 }}>App #</th>
                <th>Period Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>This Period</th>
                <th style={{ textAlign: "right" }}>Total Billed</th>
                <th style={{ textAlign: "right" }}>Retainage</th>
                <th>Notes</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payApps.map(pa => {
                const paLines = computePayAppLines(sovItems, pa);
                const thisPeriod = paLines.reduce((s, l) => s + l.currentWork, 0);
                const totalBilled = paLines.reduce((s, l) => s + l.totalCompletedAndStored, 0);
                const retainage = paLines.reduce((s, l) => s + l.retainage, 0);
                return (
                  <tr key={pa.id}>
                    <td className="font-mono fw-600">#{pa.periodNumber}</td>
                    <td>{pa.periodDate}</td>
                    <td><span className={`badge ${statusBadge(pa.status)}`}>{pa.status}</span></td>
                    <td className="font-mono text-green" style={{ textAlign: "right" }}>{app.fmt(thisPeriod)}</td>
                    <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(totalBilled)}</td>
                    <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(retainage)}</td>
                    <td className="text-dim text-xs">{pa.notes || ""}</td>
                    <td>
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-xs" onClick={() => setViewId(pa.id)}>View</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => exportPdf(pa)}>PDF</button>
                      </div>
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
}

/* ══════════════════════════════════════════════════════════════
   E4 — BILLING HISTORY / PERIOD PROGRESSION
   ═══════════════════════════════════════════════════════════ */
function BillingHistory({ project, app }) {
  const sovItems = (app.sovItems || []).filter(s => String(s.projectId) === String(project.id));
  const payApps = (app.payApps || []).filter(p => String(p.projectId) === String(project.id)).sort((a, b) => a.periodNumber - b.periodNumber);

  if (payApps.length === 0) {
    return (
      <div className="text-center py-24 text-dim">
        <div className="text-lg mb-4">No billing history</div>
        <div className="text-xs">Create pay applications to see billing progression over time.</div>
      </div>
    );
  }

  // Compute cumulative totals per period
  const periods = payApps.map(pa => {
    const paLines = computePayAppLines(sovItems, pa);
    const totalScheduled = sovItems.reduce((s, i) => s + (i.scheduledValue || 0), 0);
    const thisPeriod = paLines.reduce((s, l) => s + l.currentWork, 0);
    const cumBilled = paLines.reduce((s, l) => s + l.totalCompletedAndStored, 0);
    const retainage = paLines.reduce((s, l) => s + l.retainage, 0);
    const pctComplete = totalScheduled > 0 ? Math.round((cumBilled / totalScheduled) * 100) : 0;
    return { ...pa, thisPeriod, cumBilled, retainage, pctComplete, totalScheduled };
  });

  const totalScheduled = periods[0]?.totalScheduled || 0;
  const currentPeriod = periods[periods.length - 1];

  return (
    <div>
      {/* Overall progress */}
      <div className="flex gap-16 mb-16 flex-wrap">
        <div>
          <span className="text-dim text-xs">CONTRACT</span>
          <div className="font-mono text-amber">{app.fmt(project.contract || 0)}</div>
        </div>
        <div>
          <span className="text-dim text-xs">SOV TOTAL</span>
          <div className="font-mono">{app.fmt(totalScheduled)}</div>
        </div>
        <div>
          <span className="text-dim text-xs">TOTAL BILLED</span>
          <div className="font-mono text-green">{app.fmt(currentPeriod.cumBilled)}</div>
        </div>
        <div>
          <span className="text-dim text-xs">RETAINAGE HELD</span>
          <div className="font-mono text-amber">{app.fmt(currentPeriod.retainage)}</div>
        </div>
        <div>
          <span className="text-dim text-xs">REMAINING</span>
          <div className="font-mono">{app.fmt(totalScheduled - currentPeriod.cumBilled)}</div>
        </div>
        <div>
          <span className="text-dim text-xs">% COMPLETE</span>
          <div className="font-mono" style={{ color: currentPeriod.pctComplete >= 90 ? "var(--green)" : "var(--text)" }}>{currentPeriod.pctComplete}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-16">
        <div style={{ background: "var(--bg3)", borderRadius: 6, height: 20, overflow: "hidden", position: "relative" }}>
          <div style={{
            background: "linear-gradient(90deg, var(--amber), var(--green))",
            width: `${Math.min(currentPeriod.pctComplete, 100)}%`,
            height: "100%",
            borderRadius: 6,
            transition: "width 0.3s ease",
          }} />
          <span style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            fontSize: 11, fontWeight: 600, color: "var(--text)",
          }}>
            {currentPeriod.pctComplete}% Complete
          </span>
        </div>
      </div>

      {/* Period progression timeline */}
      <div className="text-xs fw-600 mb-8 text-amber">BILLING PROGRESSION</div>
      <div className="flex gap-8 flex-wrap mb-16">
        {periods.map((p, i) => {
          const isCurrent = i === periods.length - 1;
          const statusColor = p.status === "paid" ? "var(--green)" : p.status === "submitted" ? "var(--amber)" : "var(--text3)";
          return (
            <div key={p.id} className="card p-10" style={{
              minWidth: 140,
              border: isCurrent ? "1px solid var(--amber)" : "1px solid var(--border)",
              background: isCurrent ? "var(--amber-dim)" : undefined,
            }}>
              <div className="fw-600 mb-4" style={{ color: "var(--amber)" }}>Period {p.periodNumber}</div>
              <div className="text-xs text-dim mb-2">{p.periodDate}</div>
              <div className="font-mono text-green mb-2">{app.fmt(p.thisPeriod)}</div>
              <div className="text-xs text-dim">Cumulative: {app.fmt(p.cumBilled)}</div>
              <div className="mt-4">
                <span className="badge" style={{ background: statusColor, color: "#fff", fontSize: 9 }}>{p.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Period detail table */}
      <div className="text-xs fw-600 mb-8 text-amber">PERIOD SUMMARY</div>
      <div style={{ overflowX: "auto" }}>
        <table className="table w-full" style={{ fontSize: "12px" }}>
          <thead>
            <tr>
              <th>Period</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>This Period</th>
              <th style={{ textAlign: "right" }}>Cumulative</th>
              <th style={{ textAlign: "right" }}>Retainage</th>
              <th style={{ textAlign: "right" }}>% Complete</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id}>
                <td className="font-mono fw-600">#{p.periodNumber}</td>
                <td>{p.periodDate}</td>
                <td><span className={`badge ${p.status === "paid" ? "badge-green" : p.status === "submitted" ? "badge-amber" : "badge-ghost"}`}>{p.status}</span></td>
                <td className="font-mono text-green" style={{ textAlign: "right" }}>{app.fmt(p.thisPeriod)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(p.cumBilled)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{app.fmt(p.retainage)}</td>
                <td className="font-mono" style={{ textAlign: "right" }}>{p.pctComplete}%</td>
                <td className="text-dim text-xs">{p.notes || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
