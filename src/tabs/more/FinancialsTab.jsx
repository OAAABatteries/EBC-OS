import { useState, useEffect, useCallback, Fragment } from "react";
import { Search, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { addAudit, AttachmentsInput, AuditHistory, SubTabs } from "./moreShared";
import { softDelete, filterActive, auditDiff, CRITICAL_FIELDS, validateInvoice, findDuplicateInvoice, validateChangeOrder, findDuplicateCO, validateAPBill, findDuplicateAPBill, computeProjectLaborCost, computeProjectLaborByCode, computeProjectTotalCost, computeProjectCostForPeriod, validateAccrual, validateCommitment, computeProjectCommittedCost, computeBudgetVsActual, validatePeriod, computeWorkedHours, getAdjustedContract, DEFAULT_BURDEN } from "../../utils/financialValidation";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Financials — Invoices, COs, T&M, Job Costing, etc.
//  Extracted Sprint 9.1 from MoreTabs.jsx
// ═══════════════════════════════════════════════════════════════

const FINANCIAL_SUBTAB_MAP = {
  "tm": "T&M Tickets", "t&m": "T&M Tickets", "invoices": "Invoices",
  "change-orders": "Change Orders", "cos": "Change Orders", "job-costing": "Job Costing",
  "payroll": "Payroll Summary", "aging": "Aging Report", "ap": "AP Bills",
  "vendors": "Vendors", "commitments": "Commitments", "retainage": "Retainage",
  "period-close": "Period Close", "budget": "Budget", "sov": "SOV",
  "pay-apps": "Pay Apps", "reports": "Reports"
};

export function Financials({ app }) {
  const [sub, setSub] = useState("Invoices");

  // Wire app.subTab → internal sub-tab on mount
  useEffect(() => {
    if (app.subTab) {
      const mapped = FINANCIAL_SUBTAB_MAP[app.subTab.toLowerCase()];
      if (mapped) setSub(mapped);
    }
  }, [app.subTab]);

  return (
    <div>
      <SubTabs tabs={["Invoices", "Change Orders", "T&M Tickets", "Job Costing", "Payroll Summary", "Aging Report", "AP Bills", "Vendors", "Commitments", "Retainage", "Period Close", "Budget", "SOV", "Pay Apps", "Reports"]} active={sub} onChange={setSub} />
      {sub === "Invoices" && <InvoicesTab app={app} />}
      {sub === "Change Orders" && <ChangeOrdersTab app={app} />}
      {sub === "T&M Tickets" && <TmTicketsTab app={app} />}
      {sub === "Job Costing" && <JobCostingTab app={app} />}
      {sub === "Payroll Summary" && <PayrollSummaryTab app={app} />}
      {sub === "Aging Report" && <AgingReportTab app={app} />}
      {sub === "AP Bills" && <APBillsTab app={app} />}
      {sub === "Vendors" && <VendorsTab app={app} />}
      {sub === "Commitments" && <CommitmentsTab app={app} />}
      {sub === "Retainage" && <RetainageTab app={app} />}
      {sub === "Period Close" && <PeriodCloseTab app={app} />}
      {sub === "Budget" && <BudgetTab app={app} />}
      {sub === "SOV" && <SOVOverviewTab app={app} />}
      {sub === "Pay Apps" && <PayAppsOverviewTab app={app} />}
      {sub === "Reports" && <FinReportsTab app={app} />}
    </div>
  );
}

/* ── Invoices ────────────────────────────────────────────────── */
function InvoicesTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ projectId: "", number: "", date: "", amount: "", status: "pending", desc: "", paidDate: "", retainageRate: String(app.companySettings?.defaultRetainageRate || 0), attachments: [] });
  const [collectId, setCollectId] = useState(null);
  const [collectText, setCollectText] = useState("");
  const [collectLoading, setCollectLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [invoiceErrors, setInvoiceErrors] = useState([]);
  const [editingInvId, setEditingInvId] = useState(null);

  const runCollection = async (inv) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setCollectId(inv.id);
    setCollectLoading(true);
    setCollectText("");
    try {
      const { generateCollectionEmail } = await import("../../utils/api.js");
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

  const invFiltered = (showDeleted ? app.invoices : filterActive(app.invoices)).filter(inv => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return inv.number.toLowerCase().includes(q) || pName(inv.projectId).toLowerCase().includes(q) || (inv.desc || "").toLowerCase().includes(q);
  });
  const totalBilled = invFiltered.reduce((s, i) => s + i.amount, 0);
  const pending = invFiltered.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue = invFiltered.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const save = () => {
    const errors = validateInvoice({ projectId: form.projectId, amount: Number(form.amount), date: form.date, desc: form.desc });
    if (errors.length > 0) { setInvoiceErrors(errors); return; }
    setInvoiceErrors([]);

    // Period discipline: block closed periods unless admin overrides with reason
    let periodOverride = null;
    const periodCheck = validatePeriod(form.date, app.periods || []);
    if (!periodCheck.allowed) {
      const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";
      if (!isAdmin) {
        app.show(`Blocked: ${periodCheck.warning}`, "err");
        return;
      }
      const reason = prompt(`${periodCheck.warning}\n\nOverride reason (required):`);
      if (!reason || !reason.trim()) return;
      periodOverride = { reason: reason.trim(), approvedBy: app.auth?.name || "Unknown", timestamp: new Date().toISOString() };
    }

    // Retainage calculation
    const retainageRate = Number(form.retainageRate) || (app.companySettings?.defaultRetainageRate || 0);
    const retainageWithheld = Math.round(Number(form.amount) * retainageRate / 100);
    const netAmount = Number(form.amount) - retainageWithheld;

    if (editingInvId) {
      // Edit existing invoice
      app.setInvoices(prev => prev.map(i => {
        if (i.id !== editingInvId) return i;
        const updated = {
          ...i,
          projectId: Number(form.projectId),
          number: form.number,
          date: form.date,
          amount: Number(form.amount),
          status: form.status,
          desc: form.desc,
          paidDate: form.paidDate || null,
          retainageRate,
          retainageWithheld,
          netAmount,
          attachments: form.attachments || i.attachments || [],
        };
        if (periodOverride) updated.periodOverride = periodOverride;
        updated.audit = auditDiff(i, updated, CRITICAL_FIELDS.invoice, app.auth);
        return updated;
      }));
      app.show("Invoice updated", "ok");
      setEditingInvId(null);
    } else {
      // Create new invoice
      const duplicate = findDuplicateInvoice({ number: form.number, projectId: Number(form.projectId) }, app.invoices);
      if (duplicate) {
        const proceed = confirm(`Warning: Invoice #${form.number} already exists for this project (${app.fmt(duplicate.amount)}). Save anyway?`);
        if (!proceed) return;
      }
      const newItem = {
        id: app.nextId(),
        projectId: Number(form.projectId),
        number: form.number,
        date: form.date,
        amount: Number(form.amount),
        status: form.status,
        desc: form.desc,
        paidDate: form.paidDate || null,
        retainageRate,
        retainageWithheld,
        netAmount,
        attachments: form.attachments || [],
        audit: [],
        createdAt: new Date().toISOString(),
        createdBy: app.auth?.name || "Unknown",
      };
      if (periodOverride) newItem.periodOverride = periodOverride;
      app.setInvoices(prev => [...prev, newItem]);
      app.show("Invoice added", "ok");
    }
    setAdding(false);
    setForm({ projectId: "", number: "", date: "", amount: "", status: "pending", desc: "", paidDate: "", retainageRate: String(app.companySettings?.defaultRetainageRate || 0), attachments: [] });
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
          <button className="btn btn-ghost btn-sm" onClick={() => {
            import("../../utils/qbExport.js").then(({ generateInvoiceIIF, downloadIIF }) => {
              const pending = invFiltered.filter(i => i.status === "pending" || i.status === "draft");
              if (pending.length === 0) { app.show("No pending invoices to export"); return; }
              const qbInvoices = pending.map(inv => ({
                number: inv.number,
                date: (() => { const d = new Date(inv.date); return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`; })(),
                customerName: pName(inv.projectId),
                amount: inv.amount,
                lineItems: [{ description: inv.desc || "Drywall Scope", amount: inv.amount, item: "Drywall Labor" }],
                terms: "Net 30",
                memo: inv.desc || "",
              }));
              const iif = generateInvoiceIIF(qbInvoices);
              downloadIIF(iif, `EBC_QB_Invoices_${new Date().toISOString().slice(0,10)}.iif`);
              app.show("QuickBooks IIF exported", "ok");
            });
          }}>Export to QB</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { setEditingInvId(null); const nums = app.invoices.map(i => parseInt(i.number)).filter(n => !isNaN(n)); setForm(f => ({ ...f, number: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0"), date: new Date().toISOString().slice(0, 10), attachments: [], retainageRate: String(app.companySettings?.defaultRetainageRate || 0) })); } setAdding(!adding); }}>+ Add Invoice</button>
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
              <PeriodWarning date={form.date} periods={app.periods} />
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
            <div className="form-group">
              <label className="form-label">Retainage Rate (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.retainageRate} onChange={e => setForm({ ...form, retainageRate: e.target.value })} />
              {Number(form.amount) > 0 && Number(form.retainageRate) > 0 && (
                <div className="text-xs text-dim mt-4">
                  Withheld: {app.fmt(Math.round(Number(form.amount) * Number(form.retainageRate) / 100))} / Net: {app.fmt(Number(form.amount) - Math.round(Number(form.amount) * Number(form.retainageRate) / 100))}
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
          </div>
          <AttachmentsInput app={app} form={form} setForm={setForm} />
          {invoiceErrors.length > 0 && (
            <div className="mt-8 fs-tab c-red">
              {invoiceErrors.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>{editingInvId ? "Update Invoice" : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditingInvId(null); setInvoiceErrors([]); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-between mt-16">
        <button className={`btn btn-ghost btn-sm ${showDeleted ? "btn-active" : ""}`}
          onClick={() => setShowDeleted(v => !v)}>
          {showDeleted ? "Hide Voided" : "Show Voided"}
        </button>
      </div>
      <div className="table-wrap mt-8">
        <table className="data-table">
          <thead><tr><th>Invoice #</th><th>Project</th><th>Date</th><th>Amount</th><th>Status</th><th>Paid Date</th><th></th></tr></thead>
          <tbody>
            {invFiltered.length === 0 && <tr><td colSpan={7} className="more-empty-cell">{app.search ? "No matching invoices" : <>No invoices yet<br/><span className="more-empty-hint">Create your first invoice from an awarded project to start tracking payments</span></>}</td></tr>}
            {invFiltered.map(inv => (
              <Fragment key={inv.id}>
                <tr style={inv.status === "deleted" ? { opacity: 0.5, textDecoration: "line-through" } : {}}>
                  <td>{inv.number}</td>
                  <td>{pName(inv.projectId)}</td>
                  <td>{inv.date}</td>
                  <td>{app.fmt(inv.amount)}</td>
                  <td><span className={badge(inv.status)}>{inv.status}</span></td>
                  <td>{inv.paidDate || "—"}</td>
                  <td>
                    <div className="flex gap-4">
                    {(inv.status === "pending" || inv.status === "overdue") && (
                      <button className="btn btn-ghost btn-sm btn-table-green"
                        onClick={() => {
                          const paidDate = prompt("Payment date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                          if (!paidDate) return;
                          const checkNum = prompt("Check/Reference # (optional):", "");
                          // Compute audit outside setter to avoid React strict-mode double-append
                          const nextInv = { ...inv, status: "paid", paidDate, checkNum: checkNum || null };
                          const newAudit = auditDiff(inv, nextInv, CRITICAL_FIELDS.invoice, app.auth);
                          app.setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "paid", paidDate, checkNum: checkNum || null, audit: newAudit } : i));
                          app.show(`Invoice ${inv.number} marked paid`);
                        }}>
                        Mark Paid
                      </button>
                    )}
                    {(inv.status === "pending" || inv.status === "overdue") && (
                      <button className="btn btn-ghost btn-sm btn-table-action"
                        onClick={() => collectId === inv.id && collectText ? setCollectId(null) : runCollection(inv)}
                        disabled={collectLoading && collectId === inv.id}>
                        {collectLoading && collectId === inv.id ? "..." : collectId === inv.id && collectText ? "Hide" : "Collect"}
                      </button>
                    )}
                    {inv.status !== "deleted" && inv.status !== "paid" && (
                      <button className="btn btn-ghost btn-sm btn-table-action"
                        onClick={() => {
                          setForm({
                            projectId: String(inv.projectId),
                            number: inv.number,
                            date: inv.date,
                            amount: String(inv.amount),
                            status: inv.status,
                            desc: inv.desc || "",
                            paidDate: inv.paidDate || "",
                            retainageRate: String(inv.retainageRate ?? (app.companySettings?.defaultRetainageRate || 0)),
                            attachments: inv.attachments || [],
                          });
                          setEditingInvId(inv.id);
                          setAdding(true);
                          setInvoiceErrors([]);
                        }}>Edit</button>
                    )}
                    <button className="btn btn-ghost btn-sm btn-table-delete"
                      onClick={() => {
                        const reason = prompt("Reason for voiding this invoice:");
                        if (reason !== null) {
                          app.setInvoices(prev => prev.map(i => i.id === inv.id ? softDelete(i, app.auth?.name, reason) : i));
                          app.show("Invoice voided");
                        }
                      }}>✕</button>
                    </div>
                  </td>
                </tr>
                {collectId === inv.id && collectText && (
                  <tr><td colSpan={7} className="more-expand-cell">
                    <div className="more-detail-panel">
                      <div className="flex-between mb-8">
                        <span className="font-semi text-sm">AI Collection Email</span>
                        <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => {
                          navigator.clipboard.writeText(collectText);
                          app.show("Email copied to clipboard", "ok");
                        }}>Copy</button>
                      </div>
                      <div className="more-ai-text">
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
  const [form, setForm] = useState({ projectId: "", number: "", desc: "", amount: "", status: "pending", submitted: "", approved: "", type: "add", reference: "", notes: "", scope_items: [], gc_name: "", gc_company: "", attachments: [], date: "" });
  const [scopeInput, setScopeInput] = useState("");
  const [impactId, setImpactId] = useState(null);
  const [impactResult, setImpactResult] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [showDeletedCO, setShowDeletedCO] = useState(false);
  const [coErrors, setCoErrors] = useState([]);
  const [editingCoId, setEditingCoId] = useState(null);

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const badge = (s) => s === "approved" ? "badge-green" : s === "pending" ? "badge-amber" : "badge-red";

  const coFiltered = (showDeletedCO ? app.changeOrders : filterActive(app.changeOrders)).filter(co => {
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
      const { analyzeChangeOrderImpact } = await import("../../utils/api.js");
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
    const errors = validateChangeOrder({ projectId: form.projectId, description: form.desc, amount: form.amount, type: form.type, number: form.number });
    if (errors.length > 0) { setCoErrors(errors); return; }
    setCoErrors([]);

    // Period discipline against CO submitted date (or today if missing)
    const coDate = form.submitted || form.date || new Date().toISOString().slice(0, 10);
    let periodOverride = null;
    const periodCheck = validatePeriod(coDate, app.periods || []);
    if (!periodCheck.allowed) {
      const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";
      if (!isAdmin) {
        app.show(`Blocked: ${periodCheck.warning}`, "err");
        return;
      }
      const reason = prompt(`${periodCheck.warning}\n\nOverride reason (required):`);
      if (!reason || !reason.trim()) return;
      periodOverride = { reason: reason.trim(), approvedBy: app.auth?.name || "Unknown", timestamp: new Date().toISOString() };
    }

    if (editingCoId) {
      app.setChangeOrders(prev => prev.map(c => {
        if (c.id !== editingCoId) return c;
        const updated = {
          ...c,
          projectId: Number(form.projectId),
          number: form.number,
          desc: form.desc,
          amount: Number(form.amount),
          status: form.status,
          submitted: form.submitted,
          approved: form.approved || null,
          type: form.type || "add",
          reference: form.reference || "",
          notes: form.notes || "",
          scope_items: form.scope_items || [],
          gc_name: form.gc_name || "",
          gc_company: form.gc_company || "",
          attachments: form.attachments || [],
        };
        if (periodOverride) updated.periodOverride = periodOverride;
        updated.audit = auditDiff(c, updated, CRITICAL_FIELDS.changeOrder, app.auth);
        return updated;
      }));
      app.show("Change order updated", "ok");
      setEditingCoId(null);
    } else {
      const duplicate = findDuplicateCO({ number: form.number, projectId: Number(form.projectId) }, app.changeOrders);
      if (duplicate) {
        const proceed = confirm(`Warning: CO #${form.number} already exists for this project (${app.fmt(duplicate.amount)}). Save anyway?`);
        if (!proceed) return;
      }
      const newItem = {
        id: app.nextId(),
        projectId: Number(form.projectId),
        number: form.number,
        desc: form.desc,
        amount: Number(form.amount),
        status: form.status,
        submitted: form.submitted,
        approved: form.approved || null,
        type: form.type || "add",
        reference: form.reference || "",
        notes: form.notes || "",
        scope_items: form.scope_items || [],
        gc_name: form.gc_name || "",
        gc_company: form.gc_company || "",
        attachments: form.attachments || [],
        audit: [],
        createdAt: new Date().toISOString(),
        createdBy: app.auth?.name || "Unknown",
      };
      if (periodOverride) newItem.periodOverride = periodOverride;
      app.setChangeOrders(prev => [...prev, newItem]);
      app.show("Change order added", "ok");
    }
    setAdding(false);
    setScopeInput("");
    setCoErrors([]);
    setForm({ projectId: "", number: "", desc: "", amount: "", status: "pending", submitted: "", approved: "", type: "add", reference: "", notes: "", scope_items: [], gc_name: "", gc_company: "", attachments: [], date: "" });
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
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { setEditingCoId(null); const nums = app.changeOrders.map(c => parseInt(c.number)).filter(n => !isNaN(n)); setForm(f => ({ ...f, number: String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0"), attachments: [] })); } setAdding(!adding); }}>+ Add CO</button>
        </div>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => {
                const proj = app.projects.find(p => String(p.id) === e.target.value);
                setForm({ ...form, projectId: e.target.value, gc_company: proj?.gc || form.gc_company });
              }}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">CO #</label>
              <input className="form-input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="add">Add</option>
                <option value="deduct">Deduct</option>
                <option value="no_cost">No Cost</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount ($)</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Reference</label>
              <input className="form-input" placeholder="Bulletin #01, RFI #3..." value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
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
              <PeriodWarning date={form.submitted} periods={app.periods} />
            </div>
            <div className="form-group">
              <label className="form-label">Approved</label>
              <input className="form-input" type="date" value={form.approved} onChange={e => setForm({ ...form, approved: e.target.value })} />
            </div>
          </div>

          {/* Description */}
          <div className="form-group mt-8">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} placeholder="Changes associated with Bulletin #01..." value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
          </div>

          <AttachmentsInput app={app} form={form} setForm={setForm} />

          {/* Scope Items */}
          <div className="form-group mt-8">
            <label className="form-label">Scope Items</label>
            {form.scope_items.map((item, i) => (
              <div key={i} className="flex gap-8 mb-4 items-center">
                <span className="fs-12 text-muted">{i + 1}.</span>
                <input className="form-input flex-1" value={typeof item === "string" ? item : item.description} onChange={e => {
                  const updated = [...form.scope_items];
                  updated[i] = { description: e.target.value, amount: null };
                  setForm({ ...form, scope_items: updated });
                }} />
                <button className="btn btn-ghost btn-sm btn-table-delete" onClick={() => setForm({ ...form, scope_items: form.scope_items.filter((_, j) => j !== i) })}>X</button>
              </div>
            ))}
            <div className="flex gap-8">
              <input className="form-input flex-1" placeholder="Add scope item (e.g. Wall Demo)..." value={scopeInput} onChange={e => setScopeInput(e.target.value)} onKeyDown={e => {
                if (e.key === "Enter" && scopeInput.trim()) {
                  setForm({ ...form, scope_items: [...form.scope_items, { description: scopeInput.trim(), amount: null }] });
                  setScopeInput("");
                }
              }} />
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (scopeInput.trim()) {
                  setForm({ ...form, scope_items: [...form.scope_items, { description: scopeInput.trim(), amount: null }] });
                  setScopeInput("");
                }
              }}>+ Add</button>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group mt-8">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* GC Info */}
          <div className="form-grid mt-8">
            <div className="form-group">
              <label className="form-label">GC Company</label>
              <input className="form-input" placeholder="Auto-filled from project" value={form.gc_company} onChange={e => setForm({ ...form, gc_company: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">GC Contact Name</label>
              <input className="form-input" placeholder="PM or superintendent..." value={form.gc_name} onChange={e => setForm({ ...form, gc_name: e.target.value })} />
            </div>
          </div>

          {coErrors.length > 0 && (
            <div className="mt-8 fs-tab c-red">
              {coErrors.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>{editingCoId ? "Update CO" : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setScopeInput(""); setCoErrors([]); setEditingCoId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-between mt-16">
        <button className={`btn btn-ghost btn-sm ${showDeletedCO ? "btn-active" : ""}`}
          onClick={() => setShowDeletedCO(v => !v)}>
          {showDeletedCO ? "Hide Voided" : "Show Voided"}
        </button>
      </div>
      <div className="table-wrap mt-8">
        <table className="data-table">
          <thead><tr><th>CO #</th><th>Project</th><th>Description</th><th>Amount</th><th>Status</th><th>Submitted</th><th>Approved</th><th></th></tr></thead>
          <tbody>
            {coFiltered.length === 0 && <tr><td colSpan={8} className="more-empty-cell">{app.search ? "No matching change orders" : <>No change orders yet<br/><span className="more-empty-hint">Change orders track scope changes on active projects — add one when a GC approves extra work</span></>}</td></tr>}
            {coFiltered.map(co => (
              <Fragment key={co.id}>
                <tr style={co.status === "deleted" ? { opacity: 0.5, textDecoration: "line-through" } : {}}>
                  <td>{co.number}</td>
                  <td>{pName(co.projectId)}</td>
                  <td>
                    {co.desc}
                    {(() => {
                      const linked = (app.tmTickets || []).filter(t => t.changeOrderId === co.id);
                      if (!linked.length) return null;
                      const tmTotal = linked.reduce((s, t) => s + calcTicketTotal(t), 0);
                      return <div className="fs-12 text-muted mt-4">{linked.length} T&M ticket{linked.length > 1 ? "s" : ""} linked ({app.fmt(tmTotal)})</div>;
                    })()}
                  </td>
                  <td>{app.fmt(co.amount)}</td>
                  <td><span className={`${badge(co.status)} more-cursor-pointer`} title="Click to change status" onClick={() => {
                    const next = co.status === "pending" ? "approved" : co.status === "approved" ? "rejected" : "pending";
                    if (next === "approved") {
                      const isApprover = app.auth?.role === "admin" || app.auth?.role === "owner" || app.auth?.role === "pm";
                      if (!isApprover) { app.show("Only PM/Admin/Owner can approve COs", "err"); return; }
                      if (!confirm(`Approve CO #${co.number} for ${app.fmt(co.amount)}?`)) return;
                    }
                    const updated = {
                      ...co, status: next,
                      approved: next === "approved" ? new Date().toISOString().slice(0, 10) : co.approved,
                      approvedBy: next === "approved" ? (app.auth?.name || "Unknown") : co.approvedBy,
                      approvedAt: next === "approved" ? new Date().toISOString() : co.approvedAt,
                    };
                    updated.audit = auditDiff(co, updated, CRITICAL_FIELDS.changeOrder, app.auth);
                    app.setChangeOrders(prev => prev.map(c => c.id === co.id ? updated : c));
                    app.show(`CO ${co.number} → ${next}`, "ok");
                  }}>{co.status}</span></td>
                  <td>{co.submitted}</td>
                  <td>{co.approved || "—"}</td>
                  <td>
                    <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm btn-table-action"
                      onClick={async () => {
                        const { generateChangeOrderPdf } = await import("../../utils/changeOrderPdf.js");
                        const project = app.projects.find(p => p.id === co.projectId) || { name: "Unknown" };
                        const projectCOs = app.changeOrders.filter(c => c.projectId === co.projectId);
                        await generateChangeOrderPdf(project, { ...co, description: co.description || co.desc }, app.company || {}, projectCOs);
                        app.show("CO PDF exported", "ok");
                      }}>PDF</button>
                    <button className="btn btn-ghost btn-sm btn-table-action"
                      onClick={() => impactId === co.id && impactResult ? setImpactId(null) : runImpact(co)}
                      disabled={impactLoading && impactId === co.id}>
                      {impactLoading && impactId === co.id ? "..." : impactId === co.id && impactResult ? "Hide" : "Analyze"}
                    </button>
                    {co.status !== "deleted" && (
                      <button className="btn btn-ghost btn-sm btn-table-action"
                        onClick={() => {
                          setForm({
                            projectId: String(co.projectId),
                            number: co.number || "",
                            desc: co.desc || "",
                            amount: String(co.amount || ""),
                            status: co.status || "pending",
                            submitted: co.submitted || "",
                            approved: co.approved || "",
                            type: co.type || "add",
                            reference: co.reference || "",
                            notes: co.notes || "",
                            scope_items: co.scope_items || [],
                            gc_name: co.gc_name || "",
                            gc_company: co.gc_company || "",
                            attachments: co.attachments || [],
                            date: co.date || "",
                          });
                          setEditingCoId(co.id);
                          setAdding(true);
                          setCoErrors([]);
                        }}>Edit</button>
                    )}
                    <button className="btn btn-ghost btn-sm btn-table-delete"
                      onClick={() => {
                        const reason = prompt("Reason for voiding this change order:");
                        if (reason !== null) {
                          app.setChangeOrders(prev => prev.map(c => c.id === co.id ? softDelete(c, app.auth?.name, reason) : c));
                          app.show("Change order voided");
                        }
                      }}>✕</button>
                    </div>
                  </td>
                </tr>
                {impactId === co.id && impactResult && (
                  <tr><td colSpan={8} className="more-expand-cell">
                    <div className="more-detail-panel">
                      {/* Summary */}
                      <div className="text-sm mb-12">{impactResult.summary}</div>

                      {/* Margin Impact */}
                      {impactResult.marginImpact && (
                        <div className="more-grid-3">
                          <div className="more-metric-card">
                            <div className="text-xs text-muted">Before CO</div>
                            <div className="more-metric-value">{impactResult.marginImpact.before}%</div>
                          </div>
                          <div className="more-metric-card">
                            <div className="text-xs text-muted">After CO</div>
                            <div style={{ fontSize: "var(--text-section)", fontWeight: "var(--weight-bold)", color: impactResult.marginImpact.change >= 0 ? "var(--green)" : "var(--red)" }}>{impactResult.marginImpact.after}%</div>
                          </div>
                          <div className="more-metric-card">
                            <div className="text-xs text-muted">Change</div>
                            <div style={{ fontSize: "var(--text-section)", fontWeight: "var(--weight-bold)", color: impactResult.marginImpact.change >= 0 ? "var(--green)" : "var(--red)" }}>
                              {impactResult.marginImpact.change >= 0 ? "+" : ""}{impactResult.marginImpact.change}%
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cumulative */}
                      {impactResult.cumulativeImpact && (
                        <div className="more-info-card">
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
                        <div className="more-info-card">
                          <span className="font-semi">Cash Flow: </span>{impactResult.cashFlowNote}
                        </div>
                      )}
                      {impactResult.recommendation && (
                        <div className="more-info-card--blue">
                          <span className="font-semi">Recommendation: </span>{impactResult.recommendation}
                        </div>
                      )}

                      {/* Risk Flags */}
                      {impactResult.riskFlags?.length > 0 && (
                        <div className="mt-8">
                          {impactResult.riskFlags.map((f, i) => (
                            <div key={i} className="more-risk-flag">{f}</div>
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
  const [genOpen, setGenOpen] = useState(false);
  const [genProject, setGenProject] = useState("");
  const [genStart, setGenStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); });
  const [genEnd, setGenEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const runJustify = async (ticket) => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setJustifyId(ticket.id);
    setJustifyLoading(true);
    setJustifyText("");
    try {
      const { justifyTmTicket } = await import("../../utils/api.js");
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

    // Period discipline: block closed periods unless admin overrides with reason
    let periodOverride = null;
    const periodCheck = validatePeriod(form.date, app.periods || []);
    if (!periodCheck.allowed) {
      const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";
      if (!isAdmin) {
        app.show(`Blocked: ${periodCheck.warning}`, "err");
        return;
      }
      const reason = prompt(`${periodCheck.warning}\n\nOverride reason (required):`);
      if (!reason || !reason.trim()) return;
      periodOverride = { reason: reason.trim(), approvedBy: app.auth?.name || "Unknown", timestamp: new Date().toISOString() };
    }

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
      createdAt: new Date().toISOString(),
      createdBy: app.auth?.name || "Unknown",
    };
    if (periodOverride) newTicket.periodOverride = periodOverride;
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
      const updates = { status: newStatus, audit: addAudit(t, "status", t.status, newStatus, app.auth) };
      if (newStatus === "submitted") updates.submittedDate = now;
      if (newStatus === "approved") updates.approvedDate = now;
      if (newStatus === "billed") updates.billedDate = now;
      return { ...t, ...updates };
    }));
    app.show(`Ticket marked ${newStatus}`, "ok");
  };

  const deleteTicket = (id) => {
    const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";
    if (!isAdmin) { app.show("Only admin/owner can delete T&M tickets", "err"); return; }
    const reason = prompt("Reason for voiding this T&M ticket (required):");
    if (!reason || !reason.trim()) return;
    app.setTmTickets(prev => prev.map(t => t.id === id ? softDelete(t, app.auth?.name, reason.trim()) : t));
    app.show("Ticket voided", "ok");
    setExpandedId(null);
  };

  // Generate T&M ticket from flagged time entries
  const tmFlaggedEntries = (app.timeEntries || []).filter(e =>
    e.isTM && !e.tmTicketId && e.clockIn && e.clockOut &&
    (!genProject || e.projectId === Number(genProject)) &&
    e.clockIn.slice(0, 10) >= genStart && e.clockIn.slice(0, 10) <= genEnd
  );

  const users = (() => { try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; } })();
  const getRate = (empId) => users.find(u => u.id === empId)?.hourlyRate || 65;

  const generateFromClock = () => {
    if (!genProject) { app.show("Select a project", "err"); return; }
    if (tmFlaggedEntries.length === 0) { app.show("No T&M-flagged entries for this project/range", "err"); return; }

    // Group by employee, sum hours
    const byEmp = {};
    tmFlaggedEntries.forEach(e => {
      const key = e.employeeName || e.employeeId;
      if (!byEmp[key]) byEmp[key] = { employeeName: e.employeeName, hours: 0, rate: getRate(e.employeeId), entryIds: [] };
      const hrs = e.totalHours || (new Date(e.clockOut) - new Date(e.clockIn)) / 3600000;
      byEmp[key].hours += hrs;
      byEmp[key].entryIds.push(e.id);
    });

    const ticketId = app.nextId();
    const existingNums = (app.tmTickets || []).map(t => parseInt((t.ticketNumber || "").replace(/\D/g, ""))).filter(n => !isNaN(n));
    const nextNum = (existingNums.length ? Math.max(...existingNums) : 0) + 1;
    const projName = app.projects.find(p => p.id === Number(genProject))?.name || "Project";

    const newTicket = {
      id: ticketId,
      projectId: Number(genProject),
      ticketNumber: `TM-${String(nextNum).padStart(3, "0")}`,
      date: genEnd,
      status: "draft",
      description: `Auto-generated from ${tmFlaggedEntries.length} time clock entries (${genStart} to ${genEnd})`,
      laborEntries: Object.values(byEmp).map((e, i) => ({
        id: i + 1, employeeName: e.employeeName, hours: Math.round(e.hours * 10) / 10,
        rate: e.rate, description: `T&M labor — ${projName}`,
      })),
      materialEntries: [],
      submittedDate: null, approvedDate: null, billedDate: null,
      notes: `Generated from time clock. ${Object.keys(byEmp).length} team members, ${genStart} to ${genEnd}.`,
      autoGenerated: true,
    };

    app.setTmTickets(prev => [...prev, newTicket]);

    // Mark time entries as linked to this ticket
    const allEntryIds = Object.values(byEmp).flatMap(e => e.entryIds);
    app.setTimeEntries(prev => prev.map(e => allEntryIds.includes(e.id) ? { ...e, tmTicketId: ticketId } : e));

    app.show(`T&M ticket ${newTicket.ticketNumber} created with ${Object.keys(byEmp).length} labor entries`, "ok");
    setGenOpen(false);
  };

  // Count of unflagged T&M entries available
  const totalTmFlagged = (app.timeEntries || []).filter(e => e.isTM && !e.tmTicketId).length;

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="flex gap-8 flex-wrap">
          <div className="kpi-card kpi-min"><span className="text2">Total T&M</span><strong>{app.fmt(totalValue)}</strong></div>
          <div className="kpi-card kpi-min"><span className="text2">Pending</span><strong>{app.fmt(pendingValue)}</strong></div>
          <div className="kpi-card kpi-min"><span className="text2">Approved</span><strong>{app.fmt(approvedValue)}</strong></div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => setGenOpen(!genOpen)} className="pos-relative">
            Generate from Clock
            {totalTmFlagged > 0 && <span className="badge badge-amber fs-9 ml-4">{totalTmFlagged}</span>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ New T&M Ticket</button>
        </div>
      </div>

      {/* Generate from Clock Panel */}
      {genOpen && (
        <div className="card mt-16 border-left-amber">
          <div className="card-header"><div className="card-title">Generate T&M Ticket from Time Clock</div></div>
          <div className="text-xs text-muted mb-12">Flag time entries as T&M in Time Clock &gt; Time Log, then generate a ticket here. Flagged entries will be linked to prevent double-billing.</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select className="form-select" value={genProject} onChange={e => setGenProject(e.target.value)}>
                <option value="">Select project...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From</label>
              <input className="form-input" type="date" value={genStart} onChange={e => setGenStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <input className="form-input" type="date" value={genEnd} onChange={e => setGenEnd(e.target.value)} />
            </div>
          </div>

          {tmFlaggedEntries.length > 0 ? (
            <div className="mt-16">
              <div className="text-sm font-semi mb-8">{tmFlaggedEntries.length} T&M-flagged entries found:</div>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Employee</th><th>Project</th><th>Hours</th></tr></thead>
                <tbody>
                  {tmFlaggedEntries.map(e => (
                    <tr key={e.id}>
                      <td className="font-mono text-sm">{(e.clockIn || "").slice(0, 10)}</td>
                      <td className="font-semi text-sm">{e.employeeName}</td>
                      <td className="text-sm">{e.projectName}</td>
                      <td className="font-mono text-sm text-amber">{(e.totalHours || ((new Date(e.clockOut) - new Date(e.clockIn)) / 3600000)).toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted mt-16 p-sp4 text-center">
              {genProject ? "No T&M-flagged entries for this project and date range. Flag entries in Time Clock > Time Log first." : "Select a project to see flagged entries."}
            </div>
          )}

          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={generateFromClock} disabled={tmFlaggedEntries.length === 0}>
              Generate Ticket ({tmFlaggedEntries.length} entries)
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setGenOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

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
              <PeriodWarning date={form.date} periods={app.periods} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the extra work..." />
          </div>

          {/* Labor entries */}
          <div className="mt-16">
            <div className="flex-between">
              <strong className="text2 more-section-label">Labor</strong>
              <button className="btn btn-ghost btn-sm btn-table-action" onClick={addLaborRow} >+ Add Row</button>
            </div>
            {form.laborEntries.map(e => (
              <div key={e.id} className="more-labor-grid">
                <input className="form-input" placeholder="Employee" value={e.employeeName} onChange={ev => updateLabor(e.id, "employeeName", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Hours" value={e.hours} onChange={ev => updateLabor(e.id, "hours", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Rate" value={e.rate} onChange={ev => updateLabor(e.id, "rate", ev.target.value)} />
                <input className="form-input" placeholder="Work performed" value={e.description} onChange={ev => updateLabor(e.id, "description", ev.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeLabor(e.id)} className="btn-remove-row">x</button>
              </div>
            ))}
            <div className="text2 mt-8 btn-table-action">Labor subtotal: {app.fmt(calcLaborTotal(form.laborEntries))}</div>
          </div>

          {/* Material entries */}
          <div className="mt-16">
            <div className="flex-between">
              <strong className="text2 more-section-label">Materials</strong>
              <button className="btn btn-ghost btn-sm btn-table-action" onClick={addMatRow} >+ Add Row</button>
            </div>
            {form.materialEntries.map(e => (
              <div key={e.id} className="more-mat-grid">
                <input className="form-input" placeholder="Material" value={e.item} onChange={ev => updateMat(e.id, "item", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Qty" value={e.qty} onChange={ev => updateMat(e.id, "qty", ev.target.value)} />
                <input className="form-input" placeholder="Unit" value={e.unit} onChange={ev => updateMat(e.id, "unit", ev.target.value)} />
                <input className="form-input" type="number" placeholder="$/Unit" value={e.unitCost} onChange={ev => updateMat(e.id, "unitCost", ev.target.value)} />
                <input className="form-input" type="number" placeholder="Markup%" value={e.markup} onChange={ev => updateMat(e.id, "markup", ev.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => removeMat(e.id)} className="btn-remove-row">x</button>
              </div>
            ))}
            <div className="text2 mt-8 btn-table-action">Materials subtotal: {app.fmt(calcMatTotal(form.materialEntries))}</div>
          </div>

          <div className="form-group mt-12">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes, approval references..." />
          </div>

          <div className="flex-between mt-16">
            <div className="more-ticket-total">Ticket Total: {app.fmt(calcLaborTotal(form.laborEntries) + calcMatTotal(form.materialEntries))}</div>
            <div className="flex gap-8">
              <button className="btn btn-primary btn-sm" onClick={save}>Save Draft</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets list */}
      <div className="mt-16">
        {allTickets.length === 0 && <div className="card more-empty-cell">No T&M tickets yet<br/><span className="more-empty-hint">Track time & material work outside the original contract — add labor hours and materials per ticket</span></div>}
        {allTickets.map(t => {
          const total = calcTicketTotal(t);
          const isExpanded = expandedId === t.id;
          return (
            <div className="card mt-8 more-cursor-pointer" key={t.id}  onClick={() => setExpandedId(isExpanded ? null : t.id)}>
              <div className="flex-between">
                <div>
                  <strong>{t.ticketNumber}</strong>
                  <span className="text2 ml-8">{pName(t.projectId)}</span>
                </div>
                <div className="flex gap-8 items-center">
                  <strong>{app.fmt(total)}</strong>
                  <span className={badge(t.status)}>{t.status}</span>
                </div>
              </div>
              <div className="text2 fs-12 mt-4">{t.date} — {t.description}</div>
              {t.changeOrderId && (() => {
                const co = (app.changeOrders || []).find(c => c.id === t.changeOrderId);
                return co ? <div className="fs-12 mt-4"><span className="badge badge-blue">CO #{co.number}</span> <span className="text2">{app.fmt(co.amount)} — {co.status}</span></div> : null;
              })()}

              {isExpanded && (
                <div className="more-ticket-expanded" onClick={e => e.stopPropagation()}>
                  {/* Labor breakdown */}
                  {t.laborEntries.length > 0 && (
                    <div className="mb-12">
                      <strong className="text2 more-section-label">Labor</strong>
                      <table className="data-table mt-4">
                        <thead><tr><th>Employee</th><th>Hours</th><th>Rate</th><th>Description</th><th className="num">Total</th></tr></thead>
                        <tbody>
                          {t.laborEntries.map(e => (
                            <tr key={e.id}>
                              <td>{e.employeeName}</td>
                              <td>{e.hours}</td>
                              <td>{app.fmt(e.rate)}/hr</td>
                              <td>{e.description}</td>
                              <td className="num">{app.fmt(e.hours * e.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text2 more-ticket-subtotal">Labor: {app.fmt(calcLaborTotal(t.laborEntries))}</div>
                    </div>
                  )}

                  {/* Materials breakdown */}
                  {t.materialEntries.length > 0 && (
                    <div className="mb-12">
                      <strong className="text2 more-section-label">Materials</strong>
                      <table className="data-table mt-4">
                        <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Markup</th><th className="num">Total</th></tr></thead>
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
                                <td className="num">{app.fmt(withMarkup)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="text2 more-ticket-subtotal">Materials: {app.fmt(calcMatTotal(t.materialEntries))}</div>
                    </div>
                  )}

                  {t.notes && <div className="text2 more-ticket-notes">{t.notes}</div>}

                  <div className="more-ticket-meta">
                    {t.submittedDate && <span className="text2">Submitted: {t.submittedDate}</span>}
                    {t.approvedDate && <span className="text2">Approved: {t.approvedDate}</span>}
                    {t.billedDate && <span className="text2">Billed: {t.billedDate}</span>}
                  </div>

                  <AuditHistory audit={t.audit} />

                  <div className="flex gap-8 mt-8">
                    {t.status === "draft" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, "submitted")}>Mark Submitted</button>}
                    {t.status === "submitted" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, "approved")}>Mark Approved</button>}
                    {t.status === "approved" && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, "billed")}>Mark Billed</button>}
                    {t.status === "approved" && (
                      <button className="btn btn-ghost btn-sm text-green" onClick={() => {
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
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      const { generateTmTicketPdf } = await import("../../utils/tmTicketPdf");
                      const proj = app.projects.find(p => p.id === t.projectId);
                      generateTmTicketPdf(t, proj);
                    }}>Download PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => runJustify(t)} disabled={justifyLoading && justifyId === t.id}>
                      {justifyLoading && justifyId === t.id ? "Drafting..." : "AI Justify"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      const labTotal = calcLaborTotal(t.laborEntries);
                      const matTotal = calcMatTotal(t.materialEntries);
                      const grandTotal = labTotal + matTotal;
                      const projN = pName(t.projectId);
                      const html = `<!DOCTYPE html><html><head><title>T&M Ticket ${t.ticketNumber}</title><style>
                        body{font-family:Arial,sans-serif;max-width:800px;margin: "0" auto;padding:24px;color:#111}
                        h1{font-size:22px;margin: 0 0 4px} .header{border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
                        .meta{display:grid;grid-template-columns:1fr 1fr;gap: var(--space-2);font-size:13px;margin-bottom:16px}
                        .meta span{color:#666} table{width:100%;border-collapse:collapse;margin: var(--space-2) 0 16px}
                        th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;text-align:left}
                        th{background:#f5f5f5;font-weight:600}
                        .subtotal{text-align:right;font-size:12px;margin: var(--space-1) 0 12px;color:#444}
                        .grand-total{font-size:16px;font-weight:700;text-align:right;border-top:2px solid #333;padding-top:8px;margin-top:8px}
                        .sig-line{display:grid;grid-template-columns:1fr 1fr;gap: var(--space-8);margin-top:48px}
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
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteTicket(t.id)} className="text-red">Delete</button>
                  </div>

                  {/* AI Justification */}
                  {justifyId === t.id && justifyText && (
                    <div className="more-info-card mt-12">
                      <div className="flex-between mb-8">
                        <span className="font-semi text-sm">AI Justification Narrative</span>
                        <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => {
                          navigator.clipboard.writeText(justifyText);
                          app.show("Justification copied to clipboard", "ok");
                        }}>Copy</button>
                      </div>
                      <div className="more-ai-text--plain">{justifyText}</div>
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
  const [expandedCostCodes, setExpandedCostCodes] = useState({});
  // Period scoping — null = all-time (current behavior). Otherwise "YYYY-MM".
  const [costPeriod, setCostPeriod] = useState(null);
  const marginThreshold = (app.companySettings?.marginAlertThreshold || 25) / 100;

  // Build period choices from existing time entries + AP bills so the user
  // only sees months that actually have cost data.
  const periodOptions = (() => {
    const months = new Set();
    for (const te of (app.timeEntries || [])) {
      if (te.status === "deleted") continue;
      if (te.clockIn) months.add(String(te.clockIn).slice(0, 7));
    }
    for (const b of (app.apBills || [])) {
      if (b.status === "deleted") continue;
      if (b.date) months.add(String(b.date).slice(0, 7));
    }
    return Array.from(months).filter(Boolean).sort().reverse();
  })();

  // Uses shared computeProjectLaborByCode so this table reconciles with the
  // summary row above (lunch deduction + burden applied identically).
  const getCostCodeBreakdown = (projectId, projectName) => {
    const burden = app.companySettings?.laborBurdenMultiplier || DEFAULT_BURDEN;
    const { byCode } = computeProjectLaborByCode(
      projectId,
      projectName,
      app.timeEntries || [],
      app.employees || [],
      burden
    );
    return Array.from(byCode.entries())
      .map(([code, data]) => [code || "misc", { hours: data.hours, cost: data.burdenedCost }])
      .sort((a, b) => b[1].cost - a[1].cost);
  };

  const runVarianceAnalysis = async () => {
    if (!app.apiKey) { app.show("Set API key in Settings first", "err"); return; }
    setVarianceLoading(true);
    setVarianceResult(null);
    setShowVariance(true);
    try {
      const { analyzeJobCostVariance } = await import("../../utils/api.js");
      const projectData = app.projects.map(proj => {
        const billed = filterActive(app.invoices).filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
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
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <label className="text-xs text-muted">Period</label>
          <select
            className="form-select more-edit-select"
            value={costPeriod || ""}
            onChange={e => setCostPeriod(e.target.value || null)}
          >
            <option value="">All-time</option>
            {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={runVarianceAnalysis} disabled={varianceLoading}>
            {varianceLoading ? "Analyzing..." : "AI Variance Analysis"}
          </button>
        </div>
      </div>
      {costPeriod && (
        <div className="text-xs text-amber mt-4" style={{ fontStyle: "italic" }}>
          Showing costs for {costPeriod} only (time entries + AP bills dated in this month).
        </div>
      )}

      {/* Variance Analysis Panel */}
      {showVariance && (
        <div className="card mt-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Cost Variance Analysis</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowVariance(false); setVarianceResult(null); }}>Close</button>
          </div>
          {varianceLoading && <div className="text-sm text-muted more-empty-cell">Analyzing cost data across {app.projects.length} projects...</div>}
          {varianceResult && (
            <div className="mt-8">
              {/* Summary */}
              <div className="more-detail-summary">{varianceResult.summary}</div>

              {/* Portfolio Summary */}
              {varianceResult.portfolioSummary && (
                <div className="more-grid-4">
                  {[
                    { label: "Total Contract", val: app.fmt(varianceResult.portfolioSummary.totalContract) },
                    { label: "Total Billed", val: app.fmt(varianceResult.portfolioSummary.totalBilled) },
                    { label: "Remaining", val: app.fmt(varianceResult.portfolioSummary.totalRemaining) },
                    { label: "At-Risk Value", val: app.fmt(varianceResult.portfolioSummary.atRiskValue), color: "var(--red)" },
                  ].map((kpi, i) => (
                    <div key={i} className="more-metric-card--p10">
                      <div className="text-xs text-muted">{kpi.label}</div>
                      <div className="fw-bold fs-card mt-sp1" style={{ color: kpi.color || "var(--amber)" }}>{kpi.val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Rankings */}
              {varianceResult.rankings?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Project Health Rankings</div>
                  {varianceResult.rankings.map((r, i) => (
                    <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", borderLeft: `3px solid ${r.healthScore >= 70 ? "var(--green)" : r.healthScore >= 40 ? "var(--amber)" : "var(--red)"}`, background: "var(--card)", fontSize: "var(--text-label)" }}>
                      <div className="flex-between">
                        <span className="font-semi">{r.project}</span>
                        <span style={{ fontWeight: "var(--weight-bold)", color: r.healthScore >= 70 ? "var(--green)" : r.healthScore >= 40 ? "var(--amber)" : "var(--red)" }}>{r.healthScore}/100</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{r.billedPct}% billed • {r.marginStatus}</div>
                      {r.alert && <div className="fs-12 text-red mt-4">{r.alert}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Cash Flow Risks */}
              {varianceResult.cashFlowRisk?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Cash Flow Risks</div>
                  {varianceResult.cashFlowRisk.filter(r => r.risk !== "low").map((r, i) => (
                    <div key={i} className="more-list-row">
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
                    <div key={i} className="more-list-row">
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
      {app.projects.length === 0 && <div className="card mt-16 more-empty-cell">No projects yet<br/><span className="more-empty-hint">Convert awarded bids to projects to track job costing, labor, and profitability</span></div>}
      {app.projects.map(proj => {
        const billed = filterActive(app.invoices).filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
        const cos = app.changeOrders.filter(c => c.projectId === proj.id && c.status === "approved").reduce((s, c) => s + c.amount, 0);
        const tmTickets = (app.tmTickets || []).filter(t => t.projectId === proj.id);
        const tmApproved = tmTickets.filter(t => t.status === "approved" || t.status === "billed").reduce((s, t) => s + calcTicketTotal(t), 0);
        const tmPending = tmTickets.filter(t => t.status === "draft" || t.status === "submitted").reduce((s, t) => s + calcTicketTotal(t), 0);
        const adjustedContract = getAdjustedContract(proj, app.changeOrders || []);
        const remaining = adjustedContract - billed;
        const pct = adjustedContract > 0 ? Math.round((billed / adjustedContract) * 100) : 0;
        // Full cost breakdown from all sources — period-scoped when a month is selected
        const burden = app.companySettings?.laborBurdenMultiplier || DEFAULT_BURDEN;
        const costData = costPeriod
          ? computeProjectCostForPeriod(
              proj.id, proj.name, costPeriod,
              app.timeEntries || [], app.employees || [],
              filterActive(app.apBills || []),
              app.accruals || [], burden
            )
          : computeProjectTotalCost(
              proj.id, proj.name, app.timeEntries || [], app.employees || [],
              filterActive(app.apBills || []), burden, app.accruals || []
            );
        const totalCost = costData.total;
        const grossMargin = adjustedContract - totalCost;
        const marginPct = adjustedContract > 0 ? (grossMargin / adjustedContract) * 100 : 0;
        const belowThreshold = adjustedContract > 0 && (marginPct / 100) < marginThreshold;
        return (
          <div className="card mt-16" key={proj.id}>
            <div className="flex-between">
              <strong>{proj.name}</strong>
              <div className="flex gap-8" style={{ alignItems: "center" }}>
                {belowThreshold && <span className="badge-red" style={{ fontSize: "var(--fs-10)" }}>Low Margin</span>}
                <span className="text2">{pct}% Billed</span>
              </div>
            </div>
            <div className="more-cost-grid">
              <div><span className="text2">Contract</span><br />{app.fmt(proj.contract)}</div>
              <div><span className="text2">Approved COs</span><br />{app.fmt(cos)}</div>
              <div><span className="text2">Total Billed</span><br />{app.fmt(billed)}</div>
              <div><span className="text2">Remaining</span><br />{app.fmt(remaining)}</div>
            </div>
            {/* Full Cost Breakdown */}
            <div className="rounded-control mt-sp2 bg-bg3" style={{ padding: "var(--space-2) var(--space-3)" }}>
              <div className="text-xs fw-600 mb-4 c-text2">Cost Breakdown</div>
              <div className="fs-tab gap-sp2 d-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                <div><span className="text2">Labor{(app.companySettings?.laborBurdenMultiplier || DEFAULT_BURDEN) > 1 ? " (burdened)" : ""}</span><br /><span className="font-mono text-amber">{app.fmt(costData.labor)}</span></div>
                <div><span className="text2">Material</span><br /><span className="font-mono">{app.fmt(costData.material)}</span></div>
                <div><span className="text2">Subcontractor</span><br /><span className="font-mono">{app.fmt(costData.subcontractor)}</span></div>
                <div><span className="text2">Other</span><br /><span className="font-mono">{app.fmt(costData.otherAP)}</span></div>
                <div><span className="text2 fw-600">Total Cost</span><br /><span className="font-mono fw-600 c-amber">{app.fmt(totalCost)}</span></div>
              </div>
            </div>
            {/* Gross Margin */}
            <div className="more-cost-grid--border">
              <div><span className="text2">Labor Hours</span><br /><span className="font-mono">{costData.laborHours.toFixed(1)}h</span></div>
              <div><span className="text2">Gross Margin</span><br /><span className="font-mono" style={{ color: grossMargin >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(grossMargin)}</span></div>
              <div><span className="text2">Margin %</span><br /><span className="font-mono" style={{ color: belowThreshold ? "var(--red)" : marginPct >= 30 ? "var(--green)" : "var(--amber)" }}>{adjustedContract > 0 ? marginPct.toFixed(1) : "0.0"}%</span></div>
              <div><span className="text2">Budget Remaining</span><br /><span className="font-mono" style={{ color: remaining >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(remaining)}</span></div>
            </div>
            {/* Cost Code Breakdown */}
            {costData.laborHours > 0 && (
              <div className="mt-sp2">
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-10)" }}
                  onClick={() => setExpandedCostCodes(prev => ({ ...prev, [proj.id]: !prev[proj.id] }))}>
                  {expandedCostCodes[proj.id] ? "Hide" : "Show"} Cost Code Breakdown
                </button>
                {expandedCostCodes[proj.id] && (() => {
                  const codes = getCostCodeBreakdown(proj.id, proj.name);
                  return codes.length > 0 ? (
                    <table className="data-table mt-8 fs-tab">
                      <thead><tr><th>Cost Code</th><th className="num">Hours</th><th className="num">Cost</th></tr></thead>
                      <tbody>
                        {codes.map(([code, data]) => (
                          <tr key={code}>
                            <td className="fw-500">{code}</td>
                            <td className="td-right-mono">{data.hours.toFixed(1)}h</td>
                            <td className="td-right-mono">{app.fmt(data.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <div className="text-sm text-muted mt-4">No cost code data on time entries</div>;
                })()}
              </div>
            )}
            {(tmApproved > 0 || tmPending > 0) && (
              <div className="more-cost-grid--3">
                <div><span className="text2">T&M Approved</span><br /><span className="text-green">{app.fmt(tmApproved)}</span></div>
                <div><span className="text2">T&M Pending</span><br /><span className="text-amber">{app.fmt(tmPending)}</span></div>
                <div><span className="text2">T&M Tickets</span><br />{tmTickets.length}</div>
              </div>
            )}
            <div className="more-progress-track">
              <div style={{ background: "var(--amber)", height: "100%", borderRadius: "var(--radius-control)", width: `${Math.min(pct, 100)}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Payroll Summary ──────────────────────────────────────────── */
function PayrollSummaryTab({ app }) {
  const [period, setPeriod] = useState("week");
  // Single source of truth: app.employees (replaces legacy localStorage "ebc_users" read).
  // Exclude salaried employees and non-crew roles (Drivers) — their compensation
  // runs through salary payroll in QuickBooks, not through the hourly time-clock
  // pipe. Including them would inflate hourly wages or divide by null.
  // Drivers at EBC are salaried delivery-only (not field crew) — Rigoberto
  // Martinez is the current example.
  const isHourlyCrew = (u) => {
    if (!u || u.status === "deleted") return false;
    if (u.employmentType === "salary") return false;
    if (u.role === "Driver") return false; // drivers are salaried, not hourly crew
    return true;
  };
  const employees = (app.employees || []).filter(isHourlyCrew);

  const now = new Date();
  const periodStart = new Date(now);
  if (period === "week") { periodStart.setDate(now.getDate() - now.getDay()); }
  else if (period === "biweekly") { periodStart.setDate(now.getDate() - 13); }
  else { periodStart.setDate(1); }
  periodStart.setHours(0, 0, 0, 0);

  const periodEntries = (app.timeEntries || []).filter(e => {
    const d = new Date(e.clockIn || e.date);
    return d >= periodStart && d <= now;
  });

  // FLSA OT is computed per workweek (Mon-Sun), NOT across the pay period.
  // Biweekly 38h + 38h = 0 OT (not 40 reg + 36 OT). Without this grouping
  // the QB IIF export ships wrong wages for any biweekly/monthly run.
  const getWorkweekKey = (date) => {
    if (!date) return "unknown";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "unknown";
    const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // back to Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  };

  const byEmployee = employees.map(emp => {
    const entries = periodEntries.filter(e => e.employeeId === emp.id || e.employee === emp.name);

    // Group hours by ISO workweek (Mon-Sun) so OT is per-week, not per-period.
    const weekHours = new Map();
    for (const e of entries) {
      const key = getWorkweekKey(e.clockIn || e.date);
      const hours = computeWorkedHours(e);
      weekHours.set(key, (weekHours.get(key) || 0) + hours);
    }

    let regularHours = 0;
    let otHours = 0;
    for (const h of weekHours.values()) {
      regularHours += Math.min(h, 40);
      otHours += Math.max(h - 40, 0);
    }
    const totalHours = regularHours + otHours;
    const rate = emp.hourlyRate || 35;
    const grossPay = regularHours * rate + otHours * rate * 1.5;
    return { ...emp, totalHours, regularHours, otHours, rate, grossPay, entryCount: entries.length };
  }).sort((a, b) => b.totalHours - a.totalHours);

  const totalPayroll = byEmployee.reduce((s, e) => s + e.grossPay, 0);
  const totalHours = byEmployee.reduce((s, e) => s + e.totalHours, 0);
  const totalOT = byEmployee.reduce((s, e) => s + e.otHours, 0);

  const exportPayrollCSV = () => {
    const headers = ["Employee", "Role", "Rate", "Regular Hrs", "OT Hrs", "Total Hrs", "Gross Pay"];
    const rows = byEmployee.map(e => [
      `"${e.name}"`, e.role, `$${e.rate}`, e.regularHours.toFixed(1), e.otHours.toFixed(1), e.totalHours.toFixed(1), `$${e.grossPay.toFixed(2)}`
    ]);
    rows.push(["TOTAL", "", "", "", "", totalHours.toFixed(1), `$${totalPayroll.toFixed(2)}`]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EBC_Payroll_${periodStart.toISOString().slice(0, 10)}_to_${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    app.show("Payroll CSV exported", "ok");
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Payroll Summary</div>
        <div className="flex gap-8">
          <select className="form-select more-edit-select" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="week">This Week</option>
            <option value="biweekly">Last 2 Weeks</option>
            <option value="month">This Month</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportPayrollCSV}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            import("../../utils/qbExport.js").then(({ generateTimeIIF, downloadIIF, validateTimeEntries }) => {
              // Salaried / non-crew employee IDs — their time entries must NEVER
              // land in the hourly-wage IIF export or QB will double-pay them.
              // Drivers are salaried delivery-only (not hourly field crew).
              const excludedIds = new Set(
                (app.employees || [])
                  .filter(u => u && (u.employmentType === "salary" || u.role === "Driver"))
                  .map(u => u.id)
              );
              const filtered = (app.timeEntries || []).filter(e => {
                const d = new Date(e.clockIn || e.date);
                if (!(d >= periodStart && d <= now)) return false;
                if (excludedIds.has(e.employeeId)) return false;
                return true;
              });
              if (filtered.length === 0) { app.show("No time entries for this period"); return; }
              const warnings = validateTimeEntries(filtered);
              if (warnings.length > 0 && !window.confirm("Warnings:\n• " + warnings.join("\n• ") + "\n\nContinue export?")) return;
              const iif = generateTimeIIF(filtered);
              downloadIIF(iif, `EBC_QB_Payroll_${periodStart.toISOString().slice(0, 10)}.iif`);
              app.show("QuickBooks IIF exported", "ok");
            });
          }}>Export to QB</button>
        </div>
      </div>

      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Total Payroll</span> <strong className="text-amber">{app.fmt(totalPayroll)}</strong></div>
        <div className="kpi-card"><span className="text2">Total Hours</span> <strong>{totalHours.toFixed(1)}h</strong></div>
        <div className="kpi-card"><span className="text2">Overtime Hours</span> <strong style={{ color: totalOT > 0 ? "var(--red)" : "var(--green)" }}>{totalOT.toFixed(1)}h</strong></div>
        <div className="kpi-card"><span className="text2">Employees</span> <strong>{byEmployee.filter(e => e.totalHours > 0).length}</strong></div>
      </div>

      <div className="mt-16">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th className="num">Rate</th>
              <th className="num">Regular</th>
              <th className="num">OT</th>
              <th className="num">Total Hrs</th>
              <th className="num">Gross Pay</th>
            </tr>
          </thead>
          <tbody>
            {byEmployee.map(e => (
              <tr key={e.id}>
                <td className="fw-500">{e.name}</td>
                <td><span className="badge badge-blue fs-10">{e.role}</span></td>
                <td className="td-right-mono">${e.rate}/hr</td>
                <td className="td-right-mono">{e.regularHours.toFixed(1)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: e.otHours > 0 ? "var(--red)" : "inherit" }}>{e.otHours.toFixed(1)}</td>
                <td className="td-right-mono">{e.totalHours.toFixed(1)}</td>
                <td className="td-right-mono--amber">{app.fmt(e.grossPay)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tfoot-total">
              <td colSpan={3}>TOTAL</td>
              <td className="td-right-mono">{byEmployee.reduce((s, e) => s + e.regularHours, 0).toFixed(1)}</td>
              <td className="td-right-mono text-red">{totalOT.toFixed(1)}</td>
              <td className="td-right-mono">{totalHours.toFixed(1)}</td>
              <td className="td-right-mono--amber">{app.fmt(totalPayroll)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="more-period-note">
        Period: {periodStart.toLocaleDateString()} — {now.toLocaleDateString()} | OT calculated at 1.5x after 40hrs/week | Default rate: $35/hr
      </div>
    </div>
  );
}

/* ── Aging Report ────────────────────────────────────────────── */
function AgingReportTab({ app }) {
  const today = new Date();
  const daysSince = (dateStr) => {
    if (!dateStr) return 0;
    return Math.floor((today - new Date(dateStr)) / 86400000);
  };

  const unpaid = filterActive(app.invoices).filter(i => i.status === "pending" || i.status === "overdue");
  const buckets = { current: [], over30: [], over60: [], over90: [] };

  unpaid.forEach(inv => {
    const age = daysSince(inv.date);
    if (age > 90) buckets.over90.push({ ...inv, age });
    else if (age > 60) buckets.over60.push({ ...inv, age });
    else if (age > 30) buckets.over30.push({ ...inv, age });
    else buckets.current.push({ ...inv, age });
  });

  const sum = (arr) => arr.reduce((s, i) => s + (i.amount || 0), 0);
  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";

  const renderBucket = (label, items, color) => (
    <div className="card mt-16">
      <div className="flex-between">
        <div className="card-title" style={{ color }}>{label} ({items.length})</div>
        <div className="fw-bold fs-card" style={{ color }}>{app.fmt(sum(items))}</div>
      </div>
      {items.length > 0 ? (
        <table className="data-table mt-8">
          <thead><tr><th>Invoice #</th><th>Project</th><th>Date</th><th>Age</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {items.sort((a, b) => b.age - a.age).map(inv => (
              <tr key={inv.id}>
                <td className="fw-500">{inv.number}</td>
                <td>{pName(inv.projectId)}</td>
                <td>{inv.date}</td>
                <td><span className="badge" style={{ background: color + "22", color }}>{inv.age}d</span></td>
                <td className="td-right-mono">{app.fmt(inv.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="text-sm text-muted mt-8">No invoices in this bucket</div>}
    </div>
  );

  return (
    <div className="mt-16">
      <div className="section-title">Accounts Receivable Aging</div>
      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Current (0-30d)</span><strong className="text-green">{app.fmt(sum(buckets.current))}</strong></div>
        <div className="kpi-card"><span className="text2">31-60 Days</span><strong className="text-amber">{app.fmt(sum(buckets.over30))}</strong></div>
        <div className="kpi-card"><span className="text2">61-90 Days</span><strong className="text-red">{app.fmt(sum(buckets.over60))}</strong></div>
        <div className="kpi-card"><span className="text2">90+ Days</span><strong className="text-red">{app.fmt(sum(buckets.over90))}</strong></div>
      </div>
      {renderBucket("90+ Days Overdue", buckets.over90, "var(--red)")}
      {renderBucket("61-90 Days", buckets.over60, "var(--red)")}
      {renderBucket("31-60 Days", buckets.over30, "var(--amber)")}
      {renderBucket("Current (0-30 Days)", buckets.current, "var(--green)")}
    </div>
  );
}

/* ── Period Warning Helper ──────────────────────────────────── */
function PeriodWarning({ date, periods }) {
  if (!date || !periods || periods.length === 0) return null;
  const derivedMonth = date.slice(0, 7); // YYYY-MM
  const period = periods.find(p => p.period === derivedMonth);
  if (period && period.status === "closed") {
    return (
      <div className="mt-4 fs-tab c-amber">
        ⚠ This date falls in a closed period ({derivedMonth}). Entry will require override.
      </div>
    );
  }
  return null;
}

/* ── AP Bills ───────────────────────────────────────────────── */
function APBillsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    vendorId: "", projectId: "", costType: "", phase: "", invoiceNumber: "", date: "",
    dueDate: "", amount: "", description: "", retainageRate: "0",
    lienWaiverStatus: "not_required", attachments: [],
  });
  const [showDeleted, setShowDeleted] = useState(false);
  const [billErrors, setBillErrors] = useState([]);
  const [editingBillId, setEditingBillId] = useState(null);

  const COST_TYPES = app.COST_TYPES || ["labor", "material", "subcontractor", "equipment", "other"];
  const COST_CODES = app.COST_CODES || [];
  const vendors = app.vendors || [];
  const apBills = app.apBills || [];
  const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";

  const vName = (vid) => vendors.find(v => String(v.id) === String(vid))?.name || "Unknown";
  const pName = (pid) => app.projects.find(p => String(p.id) === String(pid))?.name || "Unknown";
  const badge = (s) => s === "paid" ? "badge-green" : s === "approved" ? "badge-blue" : s === "entered" ? "badge-amber" : s === "void" ? "badge-muted" : "badge-red";
  const lienBadge = (s) => s === "unconditional_received" ? "badge-green" : s === "conditional_received" ? "badge-amber" : s === "missing" ? "badge-red" : "badge-muted";

  // Auto-compute due date from vendor payment terms when vendor changes
  const onVendorChange = (vendorId) => {
    const vendor = vendors.find(v => String(v.id) === String(vendorId));
    const paymentTermsDays = vendor?.paymentTermsDays || 30;
    let dueDate = form.dueDate;
    if (form.date && !editingBillId) {
      const d = new Date(form.date);
      d.setDate(d.getDate() + paymentTermsDays);
      dueDate = d.toISOString().slice(0, 10);
    }
    setForm({ ...form, vendorId, dueDate });
  };

  const onDateChange = (date) => {
    const vendor = vendors.find(v => String(v.id) === String(form.vendorId));
    const paymentTermsDays = vendor?.paymentTermsDays || 30;
    let dueDate = form.dueDate;
    if (date && !editingBillId) {
      const d = new Date(date);
      d.setDate(d.getDate() + paymentTermsDays);
      dueDate = d.toISOString().slice(0, 10);
    }
    setForm({ ...form, date, dueDate });
  };

  const billsFiltered = (showDeleted ? apBills : filterActive(apBills)).filter(bill => {
    if (!app.search) return true;
    const q = app.search.toLowerCase();
    return vName(bill.vendorId).toLowerCase().includes(q) || pName(bill.projectId).toLowerCase().includes(q) || (bill.invoiceNumber || "").toLowerCase().includes(q) || (bill.description || "").toLowerCase().includes(q);
  });

  const totalAP = billsFiltered.filter(b => b.status !== "void" && b.status !== "paid" && b.status !== "deleted").reduce((s, b) => s + (b.amount || 0), 0);
  const pendingApproval = billsFiltered.filter(b => b.status === "entered").reduce((s, b) => s + (b.amount || 0), 0);
  const today = new Date();
  const overdue = billsFiltered.filter(b => b.status !== "paid" && b.status !== "void" && b.status !== "deleted" && b.dueDate && new Date(b.dueDate) < today).reduce((s, b) => s + (b.amount || 0), 0);

  const save = () => {
    const errors = validateAPBill({
      vendorId: form.vendorId, projectId: form.projectId, amount: Number(form.amount),
      invoiceNumber: form.invoiceNumber, date: form.date, costType: form.costType,
      description: form.description,
    });
    if (errors.length > 0) { setBillErrors(errors); return; }
    // Phase is required for anything that isn't pure labor (material/sub/equipment/other).
    // Labor cost is already phase-coded via timeEntries, but non-labor bills need a phase
    // so budget-vs-actual and cost-code reporting can roll them up correctly.
    if (form.costType && form.costType !== "labor" && !form.phase) {
      app.show("Phase is required for material/subcontractor/equipment bills", "err");
      return;
    }
    setBillErrors([]);

    // Period discipline: block closed periods unless admin overrides with reason
    let periodOverride = null;
    const periodCheck = validatePeriod(form.date, app.periods || []);
    if (!periodCheck.allowed) {
      if (!isAdmin) {
        app.show(`Blocked: ${periodCheck.warning}`, "err");
        return;
      }
      const reason = prompt(`${periodCheck.warning}\n\nOverride reason (required):`);
      if (!reason || !reason.trim()) return;
      periodOverride = { reason: reason.trim(), approvedBy: app.auth?.name || "Unknown", timestamp: new Date().toISOString() };
    }

    if (editingBillId) {
      // Duplicate check on edit — exclude the record being edited
      const otherBills = apBills.filter(b => b.id !== editingBillId);
      const duplicate = findDuplicateAPBill({ invoiceNumber: form.invoiceNumber, vendorId: Number(form.vendorId) }, otherBills);
      if (duplicate) {
        const proceed = confirm(`Warning: Vendor invoice #${form.invoiceNumber} already exists for this vendor (${app.fmt(duplicate.amount)}). Save anyway?`);
        if (!proceed) return;
      }

      const oldBill = apBills.find(b => b.id === editingBillId);
      const newAmt = Number(form.amount);
      const newRetRate = Number(form.retainageRate) || 0;
      const newRetainageAmount = Math.round(newAmt * newRetRate / 100);

      app.setAPBills(prev => prev.map(b => {
        if (b.id !== editingBillId) return b;
        const updated = {
          ...b, vendorId: Number(form.vendorId), projectId: Number(form.projectId),
          costType: form.costType, phase: form.phase || "", invoiceNumber: form.invoiceNumber, date: form.date,
          dueDate: form.dueDate, amount: newAmt, description: form.description,
          retainageRate: newRetRate, retainageAmount: newRetainageAmount,
          lienWaiverStatus: form.lienWaiverStatus,
          attachments: form.attachments || b.attachments || [],
        };
        if (periodOverride) updated.periodOverride = periodOverride;
        updated.audit = auditDiff(b, updated, CRITICAL_FIELDS.apBill, app.auth);
        return updated;
      }));

      // Cascade amount delta to linked commitment, if any
      if (oldBill?.commitmentId && app.setCommitments) {
        const delta = newAmt - (oldBill.amount || 0);
        if (delta !== 0) {
          app.setCommitments(prev => prev.map(c => {
            if (c.id !== oldBill.commitmentId) return c;
            const newInvoicedToDate = (c.invoicedToDate || 0) + delta;
            const baseCommit = c.revisedAmount || c.originalAmount || 0;
            return {
              ...c,
              invoicedToDate: newInvoicedToDate,
              remainingCommitment: Math.max(0, baseCommit - newInvoicedToDate),
            };
          }));
        }
      }

      app.show("AP Bill updated", "ok");
      setEditingBillId(null);
    } else {
      const duplicate = findDuplicateAPBill({ invoiceNumber: form.invoiceNumber, vendorId: Number(form.vendorId) }, apBills);
      if (duplicate) {
        const proceed = confirm(`Warning: Vendor invoice #${form.invoiceNumber} already exists for this vendor (${app.fmt(duplicate.amount)}). Save anyway?`);
        if (!proceed) return;
      }

      const amt = Number(form.amount);
      const retRate = Number(form.retainageRate) || 0;
      const retainageAmount = Math.round(amt * retRate / 100);
      const newItem = {
        id: app.nextId(), vendorId: Number(form.vendorId), projectId: Number(form.projectId),
        costType: form.costType, phase: form.phase || "", invoiceNumber: form.invoiceNumber, date: form.date,
        dueDate: form.dueDate, amount: amt, description: form.description,
        retainageRate: retRate, retainageAmount, lienWaiverStatus: form.lienWaiverStatus,
        attachments: form.attachments || [],
        status: "entered",
        audit: [],
        createdAt: new Date().toISOString(),
        createdBy: app.auth?.name || "Unknown",
      };
      if (periodOverride) newItem.periodOverride = periodOverride;

      // Commitment linkage prompt — link bill to matching PO/subcontract and roll up invoiced
      const match = (app.commitments || []).find(c =>
        c.status === "active" &&
        String(c.projectId) === String(newItem.projectId) &&
        String(c.vendorId) === String(newItem.vendorId) &&
        (!c.costType || c.costType === newItem.costType)
      );
      if (match && app.setCommitments) {
        const remaining = match.remainingCommitment != null
          ? match.remainingCommitment
          : (match.revisedAmount || match.originalAmount || 0) - (match.invoicedToDate || 0);
        if (confirm(`Link this bill to commitment "${match.description || match.id}"? (Remaining: ${app.fmt(remaining)})`)) {
          newItem.commitmentId = match.id;
          app.setCommitments(prev => prev.map(c => c.id === match.id ? {
            ...c,
            invoicedToDate: (c.invoicedToDate || 0) + amt,
            remainingCommitment: Math.max(0, remaining - amt),
          } : c));
        }
      }

      app.setAPBills(prev => [...prev, newItem]);
      app.show("AP Bill added", "ok");
    }
    setAdding(false);
    setForm({ vendorId: "", projectId: "", costType: "", phase: "", invoiceNumber: "", date: "", dueDate: "", amount: "", description: "", retainageRate: "0", lienWaiverStatus: "not_required", attachments: [] });
  };

  // AP Aging buckets (payables)
  const daysSince = (dateStr) => {
    if (!dateStr) return 0;
    return Math.floor((today - new Date(dateStr)) / 86400000);
  };
  const unpaidBills = filterActive(apBills).filter(b => b.status !== "paid" && b.status !== "void");
  const apBuckets = { current: [], over30: [], over60: [], over90: [] };
  unpaidBills.forEach(bill => {
    const age = bill.dueDate ? daysSince(bill.dueDate) : 0;
    if (age > 90) apBuckets.over90.push({ ...bill, age });
    else if (age > 60) apBuckets.over60.push({ ...bill, age });
    else if (age > 30) apBuckets.over30.push({ ...bill, age });
    else apBuckets.current.push({ ...bill, age });
  });
  const sum = (arr) => arr.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="flex gap-8">
          <div className="kpi-card"><span className="text2">Total AP</span><strong>{app.fmt(totalAP)}</strong></div>
          <div className="kpi-card"><span className="text2">Pending Approval</span><strong>{app.fmt(pendingApproval)}</strong></div>
          <div className="kpi-card"><span className="text2">Overdue</span><strong className="text-red">{app.fmt(overdue)}</strong></div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Vendor","Project","Invoice #","Date","Due","Amount","Retainage","Net","Status","Lien Waiver","Cost Type"];
            const rows = billsFiltered.map(b => [`"${vName(b.vendorId)}"`, `"${pName(b.projectId)}"`, b.invoiceNumber, b.date, b.dueDate||'', b.amount, (b.amount*(b.retainageRate||0)/100).toFixed(2), (b.amount*(1-(b.retainageRate||0)/100)).toFixed(2), b.status, b.lienWaiverStatus||'', b.costType||'']);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ebc_ap_bills.csv'; a.click(); URL.revokeObjectURL(url);
            app.show("AP Bills CSV exported");
          }}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { setEditingBillId(null); setForm(f => ({ ...f, date: new Date().toISOString().slice(0, 10), attachments: [] })); } setAdding(!adding); }}>+ Add AP Bill</button>
        </div>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <select className="form-select" value={form.vendorId} onChange={e => onVendorChange(e.target.value)}>
                <option value="">Select...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cost Type</label>
              <select className="form-select" value={form.costType} onChange={e => setForm({ ...form, costType: e.target.value })}>
                <option value="">Select...</option>
                {COST_TYPES.map(ct => <option key={ct} value={ct}>{ct.charAt(0).toUpperCase() + ct.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phase {form.costType && form.costType !== "labor" ? <span className="c-red">*</span> : null}</label>
              <select className="form-select" value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })}>
                <option value="">Select phase...</option>
                {COST_CODES.map(cc => <option key={cc.code || cc} value={cc.code || cc}>{cc.code ? `${cc.code} — ${cc.label || cc.description || cc.code}` : cc}</option>)}
              </select>
              {form.costType && form.costType !== "labor" && !form.phase && (
                <div className="text-xs c-text2">Required for non-labor bills so they roll up against the budget phase.</div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Vendor Invoice #</label>
              <input className="form-input" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => onDateChange(e.target.value)} />
              <PeriodWarning date={form.date} periods={app.periods} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Retainage Rate (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.retainageRate} onChange={e => setForm({ ...form, retainageRate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Lien Waiver Status</label>
              <select className="form-select" value={form.lienWaiverStatus} onChange={e => setForm({ ...form, lienWaiverStatus: e.target.value })}>
                <option value="not_required">Not Required</option>
                <option value="conditional_received">Conditional Received</option>
                <option value="unconditional_received">Unconditional Received</option>
                <option value="missing">Missing</option>
              </select>
            </div>
          </div>
          <div className="form-group mt-8">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <AttachmentsInput app={app} form={form} setForm={setForm} />
          {billErrors.length > 0 && (
            <div className="mt-8 fs-tab c-red">
              {billErrors.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>{editingBillId ? "Update AP Bill" : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditingBillId(null); setBillErrors([]); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-between mt-16">
        <button className={`btn btn-ghost btn-sm ${showDeleted ? "btn-active" : ""}`} onClick={() => setShowDeleted(v => !v)}>
          {showDeleted ? "Hide Voided" : "Show Voided"}
        </button>
      </div>
      <div className="table-wrap mt-8">
        <table className="data-table">
          <thead><tr><th>Vendor</th><th>Project</th><th>Invoice #</th><th>Date</th><th>Due</th><th>Amount</th><th>Retainage</th><th>Net</th><th>Status</th><th>Lien Waiver</th><th></th></tr></thead>
          <tbody>
            {billsFiltered.length === 0 && <tr><td colSpan={11} className="more-empty-cell">{app.search ? "No matching AP bills" : <>No AP bills yet<br/><span className="more-empty-hint">Add your first vendor bill to start tracking payables</span></>}</td></tr>}
            {billsFiltered.map(bill => {
              const retAmt = bill.amount * (bill.retainageRate || 0) / 100;
              const netAmt = bill.amount - retAmt;
              return (
                <Fragment key={bill.id}>
                  <tr style={bill.status === "deleted" ? { opacity: 0.5, textDecoration: "line-through" } : {}}>
                    <td>{vName(bill.vendorId)}</td>
                    <td>{pName(bill.projectId)}</td>
                    <td className="fw-500">{bill.invoiceNumber}</td>
                    <td>{bill.date}</td>
                    <td>{bill.dueDate || "—"}</td>
                    <td className="td-right-mono">{app.fmt(bill.amount)}</td>
                    <td className="td-right-mono">{app.fmt(retAmt)}</td>
                    <td className="td-right-mono">{app.fmt(netAmt)}</td>
                    <td><span className={badge(bill.status)}>{bill.status}</span></td>
                    <td><span className={lienBadge(bill.lienWaiverStatus)}>{(bill.lienWaiverStatus || "n/a").replace(/_/g, " ")}</span></td>
                    <td>
                      <div className="flex gap-4">
                        {bill.status === "entered" && (
                          <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => {
                            const isApprover = app.auth?.role === "admin" || app.auth?.role === "owner" || app.auth?.role === "pm";
                            if (!isApprover) { app.show("Only PM/Admin/Owner can approve AP bills", "err"); return; }
                            if (!confirm("Approve this AP bill?")) return;
                            // Compute audit outside setter to avoid React strict-mode double-append
                            const nextBill = { ...bill, status: "approved", approvedBy: app.auth?.name || "Unknown", approvedAt: new Date().toISOString() };
                            const newAudit = auditDiff(bill, nextBill, CRITICAL_FIELDS.apBill, app.auth);
                            app.setAPBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: "approved", approvedBy: app.auth?.name || "Unknown", approvedAt: new Date().toISOString(), audit: newAudit } : b));
                            app.show(`AP Bill ${bill.invoiceNumber} approved`);
                          }}>Approve</button>
                        )}
                        {bill.status === "approved" && (
                          <button className="btn btn-ghost btn-sm btn-table-green" onClick={() => {
                            if (!isAdmin) { app.show("Only admin/owner can mark bills paid", "err"); return; }
                            const paidDate = prompt("Payment date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                            if (!paidDate) return;
                            // Period check on paidDate
                            const paidPeriodCheck = validatePeriod(paidDate, app.periods || []);
                            if (!paidPeriodCheck.allowed) {
                              app.show(paidPeriodCheck.warning || "Payment date falls in a closed period", "err");
                              return;
                            }
                            const checkNum = prompt("Check/Reference # (optional):", "");
                            const payMethod = prompt("Payment method (check/ach/wire/credit_card):", "check");
                            const paidBy = app.auth?.name || "Unknown";
                            // Compute audit outside setter to avoid React strict-mode double-append
                            const nextBill = { ...bill, status: "paid", paidDate, checkNum: checkNum || null, paymentMethod: payMethod || "check", paidBy };
                            const newAudit = auditDiff(bill, nextBill, CRITICAL_FIELDS.apBill, app.auth);
                            app.setAPBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate, checkNum: checkNum || null, paymentMethod: payMethod || "check", paidBy, audit: newAudit } : b));
                            app.show(`AP Bill ${bill.invoiceNumber} marked paid`);
                          }}>Mark Paid</button>
                        )}
                        {bill.status !== "deleted" && bill.status !== "void" && bill.status !== "paid" && (
                          <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => {
                            setForm({
                              vendorId: String(bill.vendorId), projectId: String(bill.projectId),
                              costType: bill.costType || "", phase: bill.phase || "",
                              invoiceNumber: bill.invoiceNumber || "",
                              date: bill.date || "", dueDate: bill.dueDate || "",
                              amount: String(bill.amount), description: bill.description || "",
                              retainageRate: String(bill.retainageRate || 0),
                              lienWaiverStatus: bill.lienWaiverStatus || "not_required",
                              attachments: bill.attachments || [],
                            });
                            setEditingBillId(bill.id);
                            setAdding(true);
                            setBillErrors([]);
                          }}>Edit</button>
                        )}
                        {bill.status !== "deleted" && bill.status !== "void" && (
                          <button className="btn btn-ghost btn-sm btn-table-delete" onClick={() => {
                            if (!isAdmin) { app.show("Only admin/owner can void AP bills", "err"); return; }
                            const reason = prompt("Reason for voiding this AP bill:");
                            if (reason !== null) {
                              app.setAPBills(prev => prev.map(b => b.id === bill.id ? softDelete(b, app.auth?.name, reason) : b));
                              // Cascade void to linked commitment — roll back invoicedToDate/remaining
                              if (bill.commitmentId && app.setCommitments) {
                                app.setCommitments(prev => prev.map(c => {
                                  if (c.id !== bill.commitmentId) return c;
                                  const baseCommit = c.revisedAmount || c.originalAmount || 0;
                                  const newInvoiced = Math.max(0, (c.invoicedToDate || 0) - (bill.amount || 0));
                                  return {
                                    ...c,
                                    invoicedToDate: newInvoiced,
                                    remainingCommitment: Math.max(0, baseCommit - newInvoiced),
                                  };
                                }));
                              }
                              app.show("AP Bill voided");
                            }
                          }}>Void</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {bill.audit && bill.audit.length > 0 && (
                    <tr><td colSpan={11}><AuditHistory audit={bill.audit} /></td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AP Aging Section */}
      <div className="mt-24">
        <div className="section-title">Accounts Payable Aging</div>
        <div className="flex gap-8 mt-16">
          <div className="kpi-card"><span className="text2">Current (0-30d)</span><strong className="text-green">{app.fmt(sum(apBuckets.current))}</strong></div>
          <div className="kpi-card"><span className="text2">31-60 Days</span><strong className="text-amber">{app.fmt(sum(apBuckets.over30))}</strong></div>
          <div className="kpi-card"><span className="text2">61-90 Days</span><strong className="text-red">{app.fmt(sum(apBuckets.over60))}</strong></div>
          <div className="kpi-card"><span className="text2">90+ Days</span><strong className="text-red">{app.fmt(sum(apBuckets.over90))}</strong></div>
        </div>
        {[
          { label: "90+ Days Overdue", items: apBuckets.over90, color: "var(--red)" },
          { label: "61-90 Days", items: apBuckets.over60, color: "var(--red)" },
          { label: "31-60 Days", items: apBuckets.over30, color: "var(--amber)" },
          { label: "Current (0-30 Days)", items: apBuckets.current, color: "var(--green)" },
        ].map(({ label, items, color }) => (
          <div key={label} className="card mt-16">
            <div className="flex-between">
              <div className="card-title" style={{ color }}>{label} ({items.length})</div>
              <div className="fw-bold fs-card" style={{ color }}>{app.fmt(sum(items))}</div>
            </div>
            {items.length > 0 ? (
              <table className="data-table mt-8">
                <thead><tr><th>Vendor</th><th>Invoice #</th><th>Due Date</th><th>Age</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {items.sort((a, b) => b.age - a.age).map(bill => (
                    <tr key={bill.id}>
                      <td>{vName(bill.vendorId)}</td>
                      <td className="fw-500">{bill.invoiceNumber}</td>
                      <td>{bill.dueDate}</td>
                      <td><span className="badge" style={{ background: color + "22", color }}>{bill.age}d</span></td>
                      <td className="td-right-mono">{app.fmt(bill.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-sm text-muted mt-8">No bills in this bucket</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Vendors ────────────────────────────────────────────────── */
function VendorsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "", address: "", phone: "", email: "", paymentTermsDays: "30",
    defaultCostType: "", w9Status: "missing", is1099: false,
  });
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");

  const vendors = app.vendors || [];
  const apBills = app.apBills || [];

  const vendorsFiltered = vendors.filter(v => {
    if (v.status === "deleted") return false;
    if (!vendorSearch && !app.search) return true;
    const q = (vendorSearch || app.search || "").toLowerCase();
    return v.name.toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q) || (v.phone || "").toLowerCase().includes(q);
  });

  const totalPaidToVendor = (vendorId) => {
    return filterActive(apBills).filter(b => String(b.vendorId) === String(vendorId) && b.status === "paid").reduce((s, b) => s + (b.amount || 0), 0);
  };

  const w9Badge = (status) => {
    if (status === "received") return { cls: "badge-green", text: "W-9 Received" };
    if (status === "requested") return { cls: "badge-amber", text: "W-9 Requested" };
    return { cls: "badge-red", text: "W-9 Missing" };
  };

  // Critical vendor fields that should trigger audit trail entries
  const CRITICAL_VENDOR_FIELDS = ["name", "w9Status", "is1099", "paymentTermsDays", "address", "email", "phone"];

  // Local dup detector — warn on name collision (case/whitespace insensitive),
  // or email/phone collision, excluding the record being edited and voided vendors.
  const findDuplicateVendor = (candidate, all, excludeId) => {
    const norm = (s) => (s || "").trim().toLowerCase();
    const cName = norm(candidate.name);
    const cEmail = norm(candidate.email);
    const cPhone = (candidate.phone || "").replace(/\D/g, "");
    return all.find(v => {
      if (excludeId && v.id === excludeId) return false;
      if (v.status === "deleted") return false;
      if (cName && norm(v.name) === cName) return true;
      if (cEmail && norm(v.email) === cEmail) return true;
      if (cPhone && cPhone.length >= 7 && (v.phone || "").replace(/\D/g, "") === cPhone) return true;
      return false;
    });
  };

  const save = () => {
    if (!form.name.trim()) { app.show("Vendor name is required", "err"); return; }

    const candidate = {
      name: form.name.trim(), address: form.address, phone: form.phone,
      email: form.email, paymentTermsDays: Number(form.paymentTermsDays) || 30,
      defaultCostType: form.defaultCostType, w9Status: form.w9Status, is1099: form.is1099,
    };

    const dup = findDuplicateVendor(candidate, vendors, editingVendorId);
    if (dup) {
      const proceed = confirm(`A vendor already exists that matches "${dup.name}" (by name, email, or phone). Save anyway?`);
      if (!proceed) return;
    }

    if (editingVendorId) {
      app.setVendors(prev => prev.map(v => {
        if (v.id !== editingVendorId) return v;
        const updated = { ...v, ...candidate };
        updated.audit = auditDiff(v, updated, CRITICAL_VENDOR_FIELDS, app.auth);
        return updated;
      }));
      app.show("Vendor updated", "ok");
      setEditingVendorId(null);
    } else {
      const newVendor = {
        id: app.nextId(), ...candidate,
        status: "active", audit: [],
        createdAt: new Date().toISOString(),
        createdBy: app.auth?.name || "Unknown",
      };
      app.setVendors(prev => [...prev, newVendor]);
      app.show("Vendor added", "ok");
    }
    setAdding(false);
    setForm({ name: "", address: "", phone: "", email: "", paymentTermsDays: "30", defaultCostType: "", w9Status: "missing", is1099: false });
  };

  const COST_TYPES = app.COST_TYPES || ["labor", "material", "subcontractor", "equipment", "other"];

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="flex gap-8 items-center">
          <div className="section-title">Vendors ({vendorsFiltered.length})</div>
          <input className="form-input" style={{ width: 200 }} placeholder="Search vendors..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { if (!adding) { setEditingVendorId(null); } setAdding(!adding); }}>+ Add Vendor</button>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Vendor Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Terms (days)</label>
              <input className="form-input" type="number" value={form.paymentTermsDays} onChange={e => setForm({ ...form, paymentTermsDays: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Default Cost Type</label>
              <select className="form-select" value={form.defaultCostType} onChange={e => setForm({ ...form, defaultCostType: e.target.value })}>
                <option value="">None</option>
                {COST_TYPES.map(ct => <option key={ct} value={ct}>{ct.charAt(0).toUpperCase() + ct.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">W-9 Status</label>
              <select className="form-select" value={form.w9Status} onChange={e => setForm({ ...form, w9Status: e.target.value })}>
                <option value="received">Received</option>
                <option value="requested">Requested</option>
                <option value="missing">Missing</option>
              </select>
            </div>
            <div className="form-group flex items-center gap-8" style={{ paddingTop: 24 }}>
              <input type="checkbox" checked={form.is1099} onChange={e => setForm({ ...form, is1099: e.target.checked })} />
              <label className="form-label" style={{ margin: 0 }}>1099 Eligible</label>
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>{editingVendorId ? "Update Vendor" : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditingVendorId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Terms</th><th>Default Cost Type</th><th>W-9</th><th>1099</th><th>Total Paid</th><th></th></tr></thead>
          <tbody>
            {vendorsFiltered.length === 0 && <tr><td colSpan={9} className="more-empty-cell">{vendorSearch || app.search ? "No matching vendors" : <>No vendors yet<br/><span className="more-empty-hint">Add your first vendor to start tracking payables</span></>}</td></tr>}
            {vendorsFiltered.map(v => {
              const w9 = w9Badge(v.w9Status);
              return (
                <tr key={v.id}>
                  <td className="fw-500">{v.name}</td>
                  <td>{v.phone || "—"}</td>
                  <td>{v.email || "—"}</td>
                  <td>Net {v.paymentTermsDays || 30}</td>
                  <td>{v.defaultCostType ? v.defaultCostType.charAt(0).toUpperCase() + v.defaultCostType.slice(1) : "—"}</td>
                  <td><span className={w9.cls}>{w9.text}</span></td>
                  <td>{v.is1099 ? "Yes" : "No"}</td>
                  <td className="td-right-mono">{app.fmt(totalPaidToVendor(v.id))}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => {
                      setForm({
                        name: v.name, address: v.address || "", phone: v.phone || "",
                        email: v.email || "", paymentTermsDays: String(v.paymentTermsDays || 30),
                        defaultCostType: v.defaultCostType || "", w9Status: v.w9Status || "missing",
                        is1099: v.is1099 || false,
                      });
                      setEditingVendorId(v.id);
                      setAdding(true);
                    }}>Edit</button>
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

/* ── Commitments CRUD (Slice 5) ───────────────────────────────── */
function CommitmentsTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    type: "purchase_order", projectId: "", vendorId: "", phase: "",
    costType: "material", originalAmount: "", description: "",
  });
  const [errors, setErrors] = useState([]);
  const [filterStatus, setFilterStatus] = useState("active");

  const projects = app.projects || [];
  const vendors = app.vendors || [];
  const commitments = app.commitments || [];
  const apBills = filterActive(app.apBills || []);
  const costTypes = app.COST_TYPES || ["labor", "material", "subcontractor", "equipment", "other"];
  const costCodes = app.COST_CODES || ["framing", "board", "tape", "finish", "ACT", "insulation", "demo", "misc"];

  const pName = (pid) => projects.find(p => String(p.id) === String(pid))?.name || "Unknown";
  const vName = (vid) => vendors.find(v => String(v.id) === String(vid))?.name || "Unknown";

  // Recalc invoicedToDate for each commitment from linked AP bills
  const commitmentsWithLive = commitments.map(c => {
    const linkedBills = apBills.filter(b => String(b.commitmentId) === String(c.id));
    const liveInvoiced = linkedBills.reduce((s, b) => s + (b.amount || 0), 0);
    const invoicedToDate = liveInvoiced || c.invoicedToDate || 0;
    const remainingCommitment = Math.max(0, (c.revisedAmount || c.originalAmount || 0) - invoicedToDate);
    return { ...c, invoicedToDate, remainingCommitment, linkedBillCount: linkedBills.length };
  });

  const filtered = commitmentsWithLive.filter(c => {
    if (filterStatus === "all") return c.status !== "deleted";
    return c.status === filterStatus;
  });

  const totalActive = commitmentsWithLive.filter(c => c.status === "active");
  const totalOriginal = totalActive.reduce((s, c) => s + (c.originalAmount || 0), 0);
  const totalRevised = totalActive.reduce((s, c) => s + (c.revisedAmount || c.originalAmount || 0), 0);
  const totalInvoiced = totalActive.reduce((s, c) => s + (c.invoicedToDate || 0), 0);
  const totalRemaining = totalActive.reduce((s, c) => s + (c.remainingCommitment || 0), 0);

  const save = () => {
    const errs = validateCommitment({
      projectId: form.projectId,
      vendorId: form.vendorId,
      costType: form.costType,
      originalAmount: Number(form.originalAmount),
      description: form.description,
    });
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    const amount = Number(form.originalAmount);
    if (editingId) {
      const oldC = commitments.find(c => c.id === editingId);
      const updated = {
        ...oldC,
        type: form.type,
        projectId: Number(form.projectId),
        vendorId: Number(form.vendorId),
        phase: form.phase,
        costType: form.costType,
        originalAmount: amount,
        revisedAmount: amount + (oldC.changeOrders || 0),
        remainingCommitment: Math.max(0, amount + (oldC.changeOrders || 0) - (oldC.invoicedToDate || 0)),
        description: form.description,
      };
      updated.audit = auditDiff(oldC, updated, ["originalAmount", "revisedAmount", "description", "status"], app.auth);
      app.setCommitments(prev => prev.map(c => c.id === editingId ? updated : c));
      app.show("Commitment updated", "ok");
    } else {
      const newC = {
        id: app.nextId(),
        type: form.type,
        projectId: Number(form.projectId),
        vendorId: Number(form.vendorId),
        phase: form.phase,
        costType: form.costType,
        originalAmount: amount,
        changeOrders: 0,
        revisedAmount: amount,
        invoicedToDate: 0,
        remainingCommitment: amount,
        description: form.description,
        status: "active",
        createdAt: new Date().toISOString(),
        createdBy: app.auth?.name || "Unknown",
        audit: [],
      };
      app.setCommitments(prev => [...prev, newC]);
      app.show("Commitment added", "ok");
    }
    setAdding(false);
    setEditingId(null);
    setForm({ type: "purchase_order", projectId: "", vendorId: "", phase: "", costType: "material", originalAmount: "", description: "" });
  };

  const edit = (c) => {
    setEditingId(c.id);
    setForm({
      type: c.type || "purchase_order",
      projectId: String(c.projectId),
      vendorId: String(c.vendorId),
      phase: c.phase || "",
      costType: c.costType || "material",
      originalAmount: String(c.originalAmount || 0),
      description: c.description || "",
    });
    setAdding(true);
  };

  const canManageCommitments = ["admin", "owner", "pm"].includes(app.auth?.role);

  const closeCommitment = (id) => {
    if (!canManageCommitments) { app.show("Only admin/owner/pm can close commitments", "err"); return; }
    if (!confirm("Mark this commitment as complete? Remaining budget will be released.")) return;
    app.setCommitments(prev => prev.map(c => c.id === id ? {
      ...c,
      status: "complete",
      closedAt: new Date().toISOString(),
      closedBy: app.auth?.name || "Unknown",
    } : c));
    app.show("Commitment closed");
  };

  const voidCommitment = (id) => {
    if (!canManageCommitments) { app.show("Only admin/owner/pm can void commitments", "err"); return; }
    const reason = prompt("Reason for voiding this commitment:");
    if (reason === null) return;
    app.setCommitments(prev => prev.map(c => c.id === id ? softDelete(c, app.auth?.name, reason) : c));
    app.show("Commitment voided");
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="flex gap-8">
          <div className="kpi-card"><span className="text2">Active Commitments</span><strong>{totalActive.length}</strong></div>
          <div className="kpi-card"><span className="text2">Total Original</span><strong>{app.fmt(totalOriginal)}</strong></div>
          <div className="kpi-card"><span className="text2">Revised</span><strong>{app.fmt(totalRevised)}</strong></div>
          <div className="kpi-card"><span className="text2">Invoiced</span><strong>{app.fmt(totalInvoiced)}</strong></div>
          <div className="kpi-card"><span className="text2">Remaining</span><strong className="text-amber">{app.fmt(totalRemaining)}</strong></div>
        </div>
        <div className="flex gap-8">
          <select className="form-select" style={{ width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="complete">Complete</option>
            <option value="all">All</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { setAdding(!adding); setEditingId(null); setErrors([]); setForm({ type: "purchase_order", projectId: "", vendorId: "", phase: "", costType: "material", originalAmount: "", description: "" }); }}>
            {adding ? "Cancel" : "+ Add Commitment"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="purchase_order">Purchase Order</option>
                <option value="subcontract">Subcontract</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                <option value="">Select...</option>
                {projects.filter(p => p.status !== "completed" && p.status !== "deleted").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <select className="form-select" value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })}>
                <option value="">Select...</option>
                {vendors.filter(v => v.status !== "deleted").map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phase</label>
              <select className="form-select" value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })}>
                <option value="">Select...</option>
                {costCodes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cost Type</label>
              <select className="form-select" value={form.costType} onChange={e => setForm({ ...form, costType: e.target.value })}>
                {costTypes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Original Amount</label>
              <input className="form-input" type="number" value={form.originalAmount} onChange={e => setForm({ ...form, originalAmount: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Tape and finish scope — Project Name" />
          </div>
          {errors.length > 0 && (
            <div className="mt-8 fs-tab c-red">
              {errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={save}>{editingId ? "Update Commitment" : "Save Commitment"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditingId(null); setErrors([]); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Type</th><th>Vendor</th><th>Project</th><th>Phase</th><th>Cost Type</th><th>Original</th><th>Revised</th><th>Invoiced</th><th>Remaining</th><th>Linked</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={12} className="more-empty-cell">No commitments in this view</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} style={c.status === "deleted" ? { opacity: 0.5, textDecoration: "line-through" } : {}}>
                <td>{c.type === "subcontract" ? "Subcontract" : "PO"}</td>
                <td>{vName(c.vendorId)}</td>
                <td>{pName(c.projectId)}</td>
                <td>{c.phase}</td>
                <td>{c.costType}</td>
                <td className="font-mono">{app.fmt(c.originalAmount)}</td>
                <td className="font-mono">{app.fmt(c.revisedAmount || c.originalAmount)}</td>
                <td className="font-mono">{app.fmt(c.invoicedToDate || 0)}</td>
                <td className="font-mono fw-600" style={{ color: c.remainingCommitment <= 0 ? "var(--green)" : "var(--amber)" }}>{app.fmt(c.remainingCommitment || 0)}</td>
                <td>{c.linkedBillCount || 0}</td>
                <td><span className={c.status === "active" ? "badge-green" : c.status === "complete" ? "badge-muted" : "badge-red"}>{c.status}</span></td>
                <td>
                  <div className="flex gap-4">
                    {c.status === "active" && <>
                      <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => edit(c)}>Edit</button>
                      <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => closeCommitment(c.id)}>Close</button>
                      <button className="btn btn-ghost btn-sm btn-table-delete" onClick={() => voidCommitment(c.id)}>✕</button>
                    </>}
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

/* ── Retainage Register (Slice 3) ─────────────────────────────── */
function RetainageTab({ app }) {
  const retainageRate = app.companySettings?.defaultRetainageRate || 10;
  const projects = app.projects || [];
  const invoices = filterActive(app.invoices || []);
  const apBills = filterActive(app.apBills || []);
  const vendors = app.vendors || [];
  const pName = (pid) => projects.find(p => String(p.id) === String(pid))?.name || "Unknown";
  const vName = (vid) => vendors.find(v => String(v.id) === String(vid))?.name || "Unknown";
  const canRelease = ["admin", "owner", "pm"].includes(app.auth?.role);

  // Retainage Receivable — per-invoice retainageWithheld (fallback to flat % if field missing)
  const receivableRows = projects
    .filter(p => p.status !== "completed" && p.status !== "deleted")
    .map(p => {
      // Exclude invoices whose retainage has already been released
      const projInvoices = invoices.filter(i => String(i.projectId) === String(p.id) && !i.retainageReleasedAt);
      const billed = projInvoices.reduce((s, i) => s + (i.amount || 0), 0);
      // Sum actual retainageWithheld from invoices; fall back to flat rate only for legacy invoices.
      // Use ?? so a legitimate 0 retainage doesn't trigger the fallback.
      const held = projInvoices.reduce((s, i) => s + (i.retainageWithheld ?? Math.round((i.amount || 0) * retainageRate / 100)), 0);
      // Show weighted average rate for display
      const effectiveRate = billed > 0 ? Math.round((held / billed) * 100) : retainageRate;
      return { id: p.id, name: p.name, billed, rate: effectiveRate, held, status: p.status || "active", invoiceIds: projInvoices.map(i => i.id) };
    })
    .filter(r => r.billed > 0 && r.held > 0);
  const totalReceivable = receivableRows.reduce((s, r) => s + r.held, 0);

  // Retainage Payable — exclude released + voided + paid-with-released bills
  const payableRows = apBills
    .filter(b => (b.retainageRate || 0) > 0 && b.status !== "void" && !b.retainageReleasedAt)
    .map(b => ({
      id: b.id,
      vendor: vName(b.vendorId),
      project: pName(b.projectId),
      amount: b.amount || 0,
      rate: b.retainageRate,
      // Use ?? so $0 retainage doesn't fall back
      held: b.retainageAmount ?? Math.round((b.amount || 0) * (b.retainageRate || 0) / 100),
      status: b.status,
    }));
  const totalPayable = payableRows.reduce((s, r) => s + r.held, 0);

  const netExposure = totalReceivable - totalPayable;

  // MVP release workflow — mark all held retainage on a project as released
  const releaseReceivable = (row) => {
    if (!canRelease) { app.show("Only admin/owner/pm can release retainage", "err"); return; }
    const reference = prompt(`Release $${row.held.toLocaleString()} of retainage on ${row.name}? Enter reference (e.g. final invoice #):`);
    if (!reference) return;
    const ts = new Date().toISOString();
    const by = app.auth?.name || "Unknown";
    app.setInvoices(prev => prev.map(i => row.invoiceIds.includes(i.id) ? {
      ...i,
      retainageReleasedAt: ts,
      retainageReleasedBy: by,
      retainageReleaseReference: reference,
    } : i));
    app.show(`Retainage released for ${row.name}`, "ok");
  };

  const releasePayable = (row) => {
    if (!canRelease) { app.show("Only admin/owner/pm can release retainage", "err"); return; }
    const reason = prompt(`Release $${row.held.toLocaleString()} of retainage to ${row.vendor}? Enter release reason:`);
    if (!reason) return;
    const ts = new Date().toISOString();
    const by = app.auth?.name || "Unknown";
    app.setApBills(prev => prev.map(b => String(b.id) === String(row.id) ? {
      ...b,
      retainageReleasedAt: ts,
      retainageReleasedBy: by,
      retainageReleaseReason: reason,
    } : b));
    app.show(`Retainage released to ${row.vendor}`, "ok");
  };

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Retainage Register</div>
      </div>

      {/* KPI cards */}
      <div className="flex gap-8 mt-16 flex-wrap">
        <div className="kpi-card"><span className="text2">Retainage Receivable</span><strong className="text-amber">{app.fmt(totalReceivable)}</strong></div>
        <div className="kpi-card"><span className="text2">Retainage Payable</span><strong className="text-red">{app.fmt(totalPayable)}</strong></div>
        <div className="kpi-card"><span className="text2">Net Exposure</span><strong style={{ color: netExposure >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(netExposure)}</strong></div>
      </div>

      {/* Receivable Table */}
      <div className="mt-16">
        <div className="text-sm fw-600 mb-8">Retainage Receivable (Held by GC)</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Project</th><th>Billed to Date</th><th>Rate</th><th>Retainage Held</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {receivableRows.length === 0 && <tr><td colSpan={6} className="more-empty-cell">No billed invoices yet</td></tr>}
              {receivableRows.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{app.fmt(r.billed)}</td>
                  <td>{r.rate}%</td>
                  <td className="text-amber fw-600">{app.fmt(r.held)}</td>
                  <td>{r.status}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-table-action" disabled={!canRelease} onClick={() => releaseReceivable(r)}>Release</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payable Table */}
      <div className="mt-16">
        <div className="text-sm fw-600 mb-8">Retainage Payable (EBC Holds from Subs)</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Vendor</th><th>Project</th><th>Bill Amount</th><th>Rate</th><th>Retainage Held</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {payableRows.length === 0 && <tr><td colSpan={7} className="more-empty-cell">No subcontractor retainage held</td></tr>}
              {payableRows.map(r => (
                <tr key={r.id}>
                  <td>{r.vendor}</td>
                  <td>{r.project}</td>
                  <td>{app.fmt(r.amount)}</td>
                  <td>{r.rate}%</td>
                  <td className="text-red fw-600">{app.fmt(r.held)}</td>
                  <td>{r.status}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-table-action" disabled={!canRelease} onClick={() => releasePayable(r)}>Release</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Period Close + Accruals (Slice 4) ────────────────────────── */
function PeriodCloseTab({ app }) {
  const [addingAccrual, setAddingAccrual] = useState(false);
  const [accrualForm, setAccrualForm] = useState({
    projectId: "", accrualType: "labor_stub", costType: "labor",
    amount: "", period: "", description: "", autoReverse: true,
  });
  const [accrualErrors, setAccrualErrors] = useState([]);

  const periods = app.periods || [];
  const accruals = app.accruals || [];
  const projects = app.projects || [];
  const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";
  const pName = (pid) => projects.find(p => String(p.id) === String(pid))?.name || "Unknown";

  const closePeriod = (period) => {
    if (!isAdmin) { app.show("Only admin/owner can close periods", "err"); return; }
    if (!confirm(`Close period ${period}? Future entries with dates in this period will require override.`)) return;
    app.setPeriods(prev => prev.map(p => p.period === period ? {
      ...p, status: "closed",
      closedAt: new Date().toISOString(),
      closedBy: app.auth?.name || "Unknown",
    } : p));
    app.show(`Period ${period} closed`);
  };

  const reopenPeriod = (period) => {
    if (!isAdmin) return app.show("Only admin/owner can reopen periods", "err");
    if (!confirm(`Reopen period ${period}? This should only be used for corrections.`)) return;
    app.setPeriods(prev => prev.map(p => p.period === period ? {
      ...p, status: "open", reopenedAt: new Date().toISOString(), reopenedBy: app.auth?.name,
    } : p));
    app.show(`Period ${period} reopened`);
  };

  const saveAccrual = () => {
    if (!isAdmin) { app.show("Only admin/owner can post accruals", "err"); return; }
    const errors = validateAccrual({
      projectId: accrualForm.projectId,
      amount: Number(accrualForm.amount),
      period: accrualForm.period,
      accrualType: accrualForm.accrualType,
      description: accrualForm.description,
    });
    if (errors.length > 0) { setAccrualErrors(errors); return; }
    setAccrualErrors([]);

    // Prevent posting to a closed period without an explicit admin override + reason
    let periodOverride = null;
    const pRecord = periods.find(p => p.period === accrualForm.period);
    if (pRecord?.status === "closed") {
      const reason = prompt(`Period ${accrualForm.period} is closed. Override reason (required):`);
      if (!reason || !reason.trim()) return;
      periodOverride = { reason: reason.trim(), approvedBy: app.auth?.name || "Unknown", timestamp: new Date().toISOString() };
    }

    const newAccrual = {
      id: app.nextId(),
      type: "accrual",
      projectId: Number(accrualForm.projectId),
      accrualType: accrualForm.accrualType,
      costType: accrualForm.costType,
      amount: Number(accrualForm.amount),
      period: accrualForm.period,
      description: accrualForm.description,
      autoReverse: accrualForm.autoReverse,
      reversalPeriod: accrualForm.autoReverse ? nextPeriod(accrualForm.period) : null,
      status: "posted",
      createdAt: new Date().toISOString(),
      createdBy: app.auth?.name || "Unknown",
      audit: [],
    };
    if (periodOverride) newAccrual.periodOverride = periodOverride;

    app.setAccruals(prev => [...prev, newAccrual]);
    app.show("Accrual posted");
    setAddingAccrual(false);
    setAccrualForm({ projectId: "", accrualType: "labor_stub", costType: "labor", amount: "", period: "", description: "", autoReverse: true });
  };

  const voidAccrual = (id) => {
    if (!isAdmin) { app.show("Only admin/owner can void accruals", "err"); return; }
    const reason = prompt("Reason for voiding this accrual:");
    if (reason === null) return;
    app.setAccruals(prev => prev.map(a => a.id === id ? softDelete(a, app.auth?.name, reason) : a));
    app.show("Accrual voided");
  };

  // Cutoff Report: transactions created after period close date but dated in closed period
  const cutoffItems = [];
  periods.filter(p => p.status === "closed" && p.closedAt).forEach(closedP => {
    const closedAt = new Date(closedP.closedAt);
    // Invoices
    (app.invoices || []).forEach(inv => {
      if (!inv.date || inv.status === "deleted") return;
      if (inv.date.slice(0, 7) !== closedP.period) return;
      const created = inv.createdAt || inv.audit?.[0]?.timestamp;
      if (created && new Date(created) > closedAt) {
        cutoffItems.push({ type: "Invoice", id: inv.id, ref: inv.number, project: pName(inv.projectId), amount: inv.amount, period: closedP.period, created });
      }
    });
    // AP Bills
    (app.apBills || []).forEach(bill => {
      if (!bill.date || bill.status === "deleted") return;
      if (bill.date.slice(0, 7) !== closedP.period) return;
      const created = bill.createdAt || bill.audit?.[0]?.timestamp;
      if (created && new Date(created) > closedAt) {
        cutoffItems.push({ type: "AP Bill", id: bill.id, ref: bill.invoiceNumber, project: pName(bill.projectId), amount: bill.amount, period: closedP.period, created });
      }
    });
    // Change Orders
    (app.changeOrders || []).forEach(co => {
      const coDate = co.submitted || co.date;
      if (!coDate || co.status === "deleted") return;
      if (coDate.slice(0, 7) !== closedP.period) return;
      const created = co.createdAt || co.audit?.[0]?.timestamp;
      if (created && new Date(created) > closedAt) {
        cutoffItems.push({ type: "Change Order", id: co.id, ref: co.number, project: pName(co.projectId), amount: co.amount, period: closedP.period, created });
      }
    });
    // T&M Tickets
    (app.tmTickets || []).forEach(t => {
      if (!t.date || t.status === "deleted") return;
      if (t.date.slice(0, 7) !== closedP.period) return;
      const created = t.createdAt || t.audit?.[0]?.timestamp;
      if (created && new Date(created) > closedAt) {
        const labor = (t.laborEntries || []).reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.rate) || 0), 0);
        const mat = (t.materialEntries || []).reduce((s, e) => { const b = (Number(e.qty) || 0) * (Number(e.unitCost) || 0); return s + b + b * (Number(e.markup) || 0) / 100; }, 0);
        cutoffItems.push({ type: "T&M Ticket", id: t.id, ref: t.ticketNumber, project: pName(t.projectId), amount: Math.round(labor + mat), period: closedP.period, created });
      }
    });
    // Time entries
    (app.timeEntries || []).forEach(te => {
      if (!te.clockIn || te.status === "deleted") return;
      const entryDate = te.clockIn.slice(0, 10);
      if (entryDate.slice(0, 7) !== closedP.period) return;
      const created = te.createdAt;
      if (created && new Date(created) > closedAt) {
        const hours = te.clockOut ? (new Date(te.clockOut) - new Date(te.clockIn)) / 3600000 : 0;
        cutoffItems.push({ type: "Time Entry", id: te.id, ref: te.employeeName || te.employeeId, project: pName(te.projectId), amount: Math.round(hours * 10) / 10, period: closedP.period, created });
      }
    });
  });

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Period Close</div>
        <button className="btn btn-primary btn-sm" onClick={() => {
          const p = prompt("New period (YYYY-MM):", new Date().toISOString().slice(0, 7));
          if (!p || !/^\d{4}-\d{2}$/.test(p)) return app.show("Invalid period format (use YYYY-MM)", "err");
          if (periods.find(x => x.period === p)) return app.show("Period already exists", "err");
          app.setPeriods(prev => [...prev, { period: p, status: "open" }]);
          app.show(`Period ${p} added`);
        }}>+ Add Period</button>
      </div>

      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Period</th><th>Status</th><th>Closed By</th><th>Closed At</th><th>Actions</th></tr></thead>
          <tbody>
            {periods.length === 0 && <tr><td colSpan={5} className="more-empty-cell">No periods yet</td></tr>}
            {[...periods].sort((a, b) => b.period.localeCompare(a.period)).map(p => (
              <tr key={p.period}>
                <td className="fw-600">{p.period}</td>
                <td><span className={p.status === "closed" ? "badge-red" : p.status === "locked" ? "badge-muted" : "badge-green"}>{p.status}</span></td>
                <td>{p.closedBy || "—"}</td>
                <td>{p.closedAt ? p.closedAt.slice(0, 10) : "—"}</td>
                <td>
                  <div className="flex gap-4">
                    {p.status === "open" && <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => closePeriod(p.period)}>Close</button>}
                    {p.status === "closed" && isAdmin && <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => reopenPeriod(p.period)}>Reopen</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Accruals Section */}
      <div className="mt-24">
        <div className="flex-between">
          <div className="section-title">Accruals</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddingAccrual(!addingAccrual); setAccrualErrors([]); }}>
            {addingAccrual ? "Cancel" : "+ Add Accrual"}
          </button>
        </div>

        {addingAccrual && (
          <div className="card mt-16">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={accrualForm.projectId} onChange={e => setAccrualForm({ ...accrualForm, projectId: e.target.value })}>
                  <option value="">Select...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Accrual Type</label>
                <select className="form-select" value={accrualForm.accrualType} onChange={e => setAccrualForm({ ...accrualForm, accrualType: e.target.value })}>
                  <option value="labor_stub">Labor Stub</option>
                  <option value="sub_accrual">Sub Accrual</option>
                  <option value="material_accrual">Material Accrual</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cost Type</label>
                <select className="form-select" value={accrualForm.costType} onChange={e => setAccrualForm({ ...accrualForm, costType: e.target.value })}>
                  {(app.COST_TYPES || ["labor","material","subcontractor","equipment","other"]).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Period (YYYY-MM)</label>
                <input className="form-input" value={accrualForm.period} onChange={e => setAccrualForm({ ...accrualForm, period: e.target.value })} placeholder="2026-03" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input className="form-input" type="number" value={accrualForm.amount} onChange={e => setAccrualForm({ ...accrualForm, amount: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label"><input type="checkbox" checked={accrualForm.autoReverse} onChange={e => setAccrualForm({ ...accrualForm, autoReverse: e.target.checked })} /> Auto-reverse next period</label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={accrualForm.description} onChange={e => setAccrualForm({ ...accrualForm, description: e.target.value })} />
            </div>
            {accrualErrors.length > 0 && (
              <div className="mt-8 fs-tab c-red">
                {accrualErrors.map((err, i) => <div key={i}>• {err}</div>)}
              </div>
            )}
            <div className="flex gap-8 mt-16">
              <button className="btn btn-primary btn-sm" onClick={saveAccrual}>Post Accrual</button>
            </div>
          </div>
        )}

        <div className="table-wrap mt-16">
          <table className="data-table">
            <thead><tr><th>Period</th><th>Project</th><th>Type</th><th>Cost Type</th><th>Amount</th><th>Auto-Reverse</th><th>Status</th><th>Description</th><th></th></tr></thead>
            <tbody>
              {filterActive(accruals).length === 0 && <tr><td colSpan={9} className="more-empty-cell">No accruals posted</td></tr>}
              {filterActive(accruals).map(a => (
                <tr key={a.id}>
                  <td className="fw-600">{a.period}</td>
                  <td>{pName(a.projectId)}</td>
                  <td>{a.accrualType}</td>
                  <td>{a.costType}</td>
                  <td className="font-mono">{app.fmt(a.amount)}</td>
                  <td>{a.autoReverse ? `Yes (${a.reversalPeriod})` : "No"}</td>
                  <td><span className={a.status === "posted" ? "badge-green" : "badge-muted"}>{a.status}</span></td>
                  <td>{a.description}</td>
                  <td><button className="btn btn-ghost btn-sm btn-table-delete" onClick={() => voidAccrual(a.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cutoff Report */}
      {cutoffItems.length > 0 && (
        <div className="mt-24">
          <div className="section-title c-red">⚠ Cutoff Report — Entries Posted After Period Close</div>
          <div className="text-xs text-dim mb-8">These entries have dates in a closed period but were created after the period was closed. Review for correctness.</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Type</th><th>Ref</th><th>Project</th><th>Amount</th><th>Period</th><th>Created</th></tr></thead>
              <tbody>
                {cutoffItems.map((c, i) => (
                  <tr key={i}>
                    <td>{c.type}</td>
                    <td>{c.ref}</td>
                    <td>{c.project}</td>
                    <td className="font-mono">{app.fmt(c.amount)}</td>
                    <td className="fw-600">{c.period}</td>
                    <td>{c.created.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function nextPeriod(period) {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [y, m] = period.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return next;
}

/* ── Budget vs Actual vs Committed (Slice 5) ──────────────────── */
function BudgetTab({ app }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [addingLine, setAddingLine] = useState(false);
  const [lineForm, setLineForm] = useState({ phase: "", costType: "labor", budgetAmount: "" });
  const [editingLineIdx, setEditingLineIdx] = useState(null);
  const projects = app.projects || [];
  const budgets = app.budgets || {};
  const commitments = app.commitments || [];
  const timeEntries = app.timeEntries || [];
  const employees = app.employees || [];
  const apBills = filterActive(app.apBills || []);
  const burden = app.companySettings?.laborBurdenMultiplier || DEFAULT_BURDEN;
  const costTypes = app.COST_TYPES || ["labor", "material", "subcontractor", "equipment", "other"];
  const costCodes = app.COST_CODES || ["framing", "board", "tape", "finish", "ACT", "insulation", "demo", "misc"];

  // Show ALL active projects (not just those with budgets) so user can add budgets to any
  const activeProjects = projects.filter(p => p.status !== "completed" && p.status !== "deleted");

  // Auto-select first active project with budget, else first active project
  const projectsWithBudgets = activeProjects.filter(p => budgets[p.id] && budgets[p.id].length > 0);
  const effectiveProjectId = selectedProjectId || (projectsWithBudgets[0]?.id ?? activeProjects[0]?.id ?? "");
  const project = projects.find(p => String(p.id) === String(effectiveProjectId));

  const canEditBudget = ["admin", "owner", "pm"].includes(app.auth?.role);

  const saveLine = () => {
    if (!canEditBudget) { app.show("Only admin/owner/pm can edit budgets", "err"); return; }
    if (!project) return app.show("Select a project first", "err");
    if (!lineForm.phase || !lineForm.costType || !lineForm.budgetAmount) return app.show("Fill all fields", "err");
    const amount = Number(lineForm.budgetAmount);
    if (amount <= 0) return app.show("Amount must be > 0", "err");

    // Duplicate detection — warn if the same phase+costType line already exists on this project
    const currentLines = budgets[project.id] || [];
    const dup = currentLines.find((l, i) => i !== editingLineIdx && l.phase === lineForm.phase && l.costType === lineForm.costType);
    if (dup) {
      const proceed = confirm(`A ${lineForm.phase}/${lineForm.costType} line already exists ($${(dup.budgetAmount || 0).toLocaleString()}). Add anyway?`);
      if (!proceed) return;
    }

    const nowIso = new Date().toISOString();
    const by = app.auth?.name || "Unknown";
    const newLine = {
      phase: lineForm.phase,
      costType: lineForm.costType,
      budgetAmount: amount,
      updatedAt: nowIso,
      updatedBy: by,
    };
    app.setBudgets(prev => {
      const current = prev[project.id] || [];
      const updated = editingLineIdx !== null
        ? current.map((l, i) => i === editingLineIdx ? { ...l, ...newLine } : l)
        : [...current, { ...newLine, createdAt: nowIso, createdBy: by }];
      return { ...prev, [project.id]: updated };
    });
    app.show(editingLineIdx !== null ? "Budget line updated" : "Budget line added", "ok");
    setAddingLine(false);
    setEditingLineIdx(null);
    setLineForm({ phase: "", costType: "labor", budgetAmount: "" });
  };

  const editLine = (idx, line) => {
    if (!canEditBudget) { app.show("Only admin/owner/pm can edit budgets", "err"); return; }
    setEditingLineIdx(idx);
    setLineForm({ phase: line.phase, costType: line.costType, budgetAmount: String(line.budgetAmount) });
    setAddingLine(true);
  };

  const deleteLine = (idx) => {
    if (!canEditBudget) { app.show("Only admin/owner/pm can delete budget lines", "err"); return; }
    if (!confirm("Delete this budget line?")) return;
    app.setBudgets(prev => {
      const current = prev[project.id] || [];
      return { ...prev, [project.id]: current.filter((_, i) => i !== idx) };
    });
    app.show("Budget line deleted", "ok");
  };

  const rows = project
    ? computeBudgetVsActual(project.id, project.name, budgets, timeEntries, employees, apBills, commitments, burden)
    : [];

  const totals = rows.reduce((acc, r) => ({
    budget: acc.budget + r.budget,
    actual: acc.actual + r.actual,
    committed: acc.committed + r.committed,
    projectedFinal: acc.projectedFinal + r.projectedFinal,
    variance: acc.variance + r.variance,
  }), { budget: 0, actual: 0, committed: 0, projectedFinal: 0, variance: 0 });

  return (
    <div>
      <div className="flex-between mt-16">
        <div className="section-title">Budget vs Actual vs Committed</div>
        <div className="flex gap-8">
          <select className="form-select" style={{ width: "auto" }} value={effectiveProjectId} onChange={e => { setSelectedProjectId(e.target.value); setAddingLine(false); setEditingLineIdx(null); }}>
            <option value="">Select project...</option>
            {activeProjects.map(p => {
              const has = budgets[p.id] && budgets[p.id].length > 0;
              return <option key={p.id} value={p.id}>{has ? "✓ " : ""}{p.name}</option>;
            })}
          </select>
          {project && (
            <button className="btn btn-primary btn-sm" onClick={() => { setAddingLine(!addingLine); setEditingLineIdx(null); setLineForm({ phase: "", costType: "labor", budgetAmount: "" }); }}>
              {addingLine ? "Cancel" : "+ Add Budget Line"}
            </button>
          )}
        </div>
      </div>

      {addingLine && project && (
        <div className="card mt-16">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Phase</label>
              <select className="form-select" value={lineForm.phase} onChange={e => setLineForm({ ...lineForm, phase: e.target.value })}>
                <option value="">Select phase...</option>
                {costCodes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cost Type</label>
              <select className="form-select" value={lineForm.costType} onChange={e => setLineForm({ ...lineForm, costType: e.target.value })}>
                {costTypes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Budget Amount</label>
              <input className="form-input" type="number" value={lineForm.budgetAmount} onChange={e => setLineForm({ ...lineForm, budgetAmount: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={saveLine}>{editingLineIdx !== null ? "Update Line" : "Save Line"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingLine(false); setEditingLineIdx(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {!project && (
        <div className="card mt-16 more-empty-cell">
          Select an active project to view or create a budget.
        </div>
      )}

      {project && rows.length === 0 && !addingLine && (
        <div className="card mt-16 more-empty-cell">
          No budget lines for {project.name} yet.<br />
          <span className="more-empty-hint">Click "+ Add Budget Line" to start building a budget for this project.</span>
        </div>
      )}

      {project && rows.length > 0 && (
        <>
          <div className="flex gap-8 mt-16 flex-wrap">
            <div className="kpi-card"><span className="text2">Total Budget</span><strong>{app.fmt(totals.budget)}</strong></div>
            <div className="kpi-card"><span className="text2">Actual to Date</span><strong>{app.fmt(Math.round(totals.actual))}</strong></div>
            <div className="kpi-card"><span className="text2">Committed</span><strong>{app.fmt(totals.committed)}</strong></div>
            <div className="kpi-card"><span className="text2">Projected Final</span><strong>{app.fmt(Math.round(totals.projectedFinal))}</strong></div>
            <div className="kpi-card"><span className="text2">Variance</span><strong style={{ color: totals.variance >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(Math.round(totals.variance))}</strong></div>
          </div>

          <div className="table-wrap mt-16">
            <table className="data-table">
              <thead><tr><th>Phase</th><th>Cost Type</th><th>Budget</th><th>Actual</th><th>Committed</th><th>Projected Final</th><th>Variance</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={r.overBudget ? { background: "rgba(220,38,38,0.08)" } : {}}>
                    <td className="fw-600">{r.phase}</td>
                    <td>{r.costType}</td>
                    <td className="font-mono">{app.fmt(r.budget)}</td>
                    <td className="font-mono">{app.fmt(Math.round(r.actual))}</td>
                    <td className="font-mono">{app.fmt(r.committed)}</td>
                    <td className="font-mono fw-600">{app.fmt(Math.round(r.projectedFinal))}</td>
                    <td className="font-mono" style={{ color: r.variance >= 0 ? "var(--green)" : "var(--red)" }}>
                      {r.variance >= 0 ? app.fmt(Math.round(r.variance)) : `(${app.fmt(Math.round(Math.abs(r.variance)))})`}
                    </td>
                    <td>{r.overBudget ? <span className="badge-red">OVER</span> : <span className="badge-green">OK</span>}</td>
                    <td>
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-sm btn-table-action" onClick={() => editLine(i, { phase: r.phase, costType: r.costType, budgetAmount: r.budget })}>Edit</button>
                        <button className="btn btn-ghost btn-sm btn-table-delete" onClick={() => deleteLine(i)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="fw-bold" style={{ borderTop: "2px solid var(--border)" }}>
                  <td colSpan={2}>TOTAL</td>
                  <td className="font-mono">{app.fmt(totals.budget)}</td>
                  <td className="font-mono">{app.fmt(Math.round(totals.actual))}</td>
                  <td className="font-mono">{app.fmt(totals.committed)}</td>
                  <td className="font-mono">{app.fmt(Math.round(totals.projectedFinal))}</td>
                  <td className="font-mono" style={{ color: totals.variance >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(Math.round(totals.variance))}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Committed Costs Summary */}
      <div className="mt-24">
        <div className="section-title">Active Commitments (POs + Subcontracts)</div>
        <div className="table-wrap mt-8">
          <table className="data-table">
            <thead><tr><th>Type</th><th>Vendor</th><th>Project</th><th>Phase</th><th>Original</th><th>Revised</th><th>Invoiced</th><th>Remaining</th><th>Status</th></tr></thead>
            <tbody>
              {commitments.filter(c => c.status === "active").length === 0 && <tr><td colSpan={9} className="more-empty-cell">No active commitments</td></tr>}
              {commitments.filter(c => c.status === "active").map(c => {
                const vendor = (app.vendors || []).find(v => v.id === c.vendorId);
                const proj = projects.find(p => p.id === c.projectId);
                return (
                  <tr key={c.id}>
                    <td>{c.type === "subcontract" ? "Subcontract" : "PO"}</td>
                    <td>{vendor?.name || "Unknown"}</td>
                    <td>{proj?.name || "Unknown"}</td>
                    <td>{c.phase}</td>
                    <td className="font-mono">{app.fmt(c.originalAmount)}</td>
                    <td className="font-mono">{app.fmt(c.revisedAmount)}</td>
                    <td className="font-mono">{app.fmt(c.invoicedToDate)}</td>
                    <td className="font-mono fw-600">{app.fmt(c.remainingCommitment)}</td>
                    <td><span className="badge-green">{c.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Management Reports (Slice 6) ─────────────────────────────── */
function FinReportsTab({ app }) {
  const projects = app.projects || [];
  const invoices = filterActive(app.invoices || []);
  const changeOrders = filterActive(app.changeOrders || []);
  const apBills = filterActive(app.apBills || []);
  const commitments = app.commitments || [];
  const vendors = app.vendors || [];
  const timeEntries = app.timeEntries || [];
  const employees = app.employees || [];
  const burden = app.companySettings?.laborBurdenMultiplier || DEFAULT_BURDEN;
  const marginThreshold = app.companySettings?.marginAlertThreshold || 25;

  // Period scoping — null = all-time; "YYYY-MM" = month-scoped
  const [wipPeriod, setWipPeriod] = useState(null);
  const wipPeriodOptions = (() => {
    const months = new Set();
    for (const te of (app.timeEntries || [])) {
      if (te.status === "deleted") continue;
      if (te.clockIn) months.add(String(te.clockIn).slice(0, 7));
    }
    for (const b of (app.apBills || [])) {
      if (b.status === "deleted") continue;
      if (b.date) months.add(String(b.date).slice(0, 7));
    }
    return Array.from(months).filter(Boolean).sort().reverse();
  })();

  // Compute project metrics once — exclude completed projects
  const budgets = app.budgets || {};
  const projectMetrics = projects.filter(p => !p.deletedAt && p.status !== "completed" && p.status !== "deleted").map(p => {
    const costs = wipPeriod
      ? computeProjectCostForPeriod(p.id, p.name, wipPeriod, timeEntries, employees, apBills, app.accruals || [], burden)
      : computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, burden, app.accruals || []);
    const billed = filterActive(invoices).filter(i => String(i.projectId) === String(p.id)).reduce((s, i) => s + (i.amount || 0), 0);
    const adjustedContract = getAdjustedContract(p, changeOrders);
    const approvedCOs = adjustedContract - (p.contract || 0);
    // Cost-to-cost % complete: actual cost / total estimated cost (budget). NOT clamped — show overruns.
    const totalEstimatedCost = (budgets[p.id] || []).reduce((s, l) => s + (l.budgetAmount || 0), 0);
    const hasBudget = totalEstimatedCost > 0;
    const percentComplete = hasBudget ? costs.total / totalEstimatedCost : 0;
    // Earned revenue uses clamped pct so we don't overstate revenue above contract
    const earnedRevenue = hasBudget ? Math.min(percentComplete, 1) * adjustedContract : 0;
    const overUnder = hasBudget ? billed - earnedRevenue : 0;
    const grossMargin = adjustedContract - costs.total;
    const marginPct = adjustedContract > 0 ? (grossMargin / adjustedContract) * 100 : 0;
    // Retainage: prefer stored invoice retainageWithheld; fallback to flat rate on billed.
    // Use ?? so a legitimate 0 doesn't trigger the fallback calculation.
    const retainageRate = app.companySettings?.defaultRetainageRate || 10;
    const retainageHeld = invoices
      .filter(i => String(i.projectId) === String(p.id))
      .reduce((s, i) => s + (i.retainageWithheld ?? Math.round((i.amount || 0) * retainageRate / 100)), 0);
    return { p, costs, billed, approvedCOs, adjustedContract, percentComplete, earnedRevenue, overUnder, grossMargin, marginPct, retainageHeld, hasBudget, totalEstimatedCost };
  });

  // Portfolio totals
  const totals = projectMetrics.reduce((acc, m) => ({
    contract: acc.contract + m.adjustedContract,
    cost: acc.cost + m.costs.total,
    billed: acc.billed + m.billed,
    earned: acc.earned + m.earnedRevenue,
    overUnder: acc.overUnder + m.overUnder,
    retainage: acc.retainage + m.retainageHeld,
  }), { contract: 0, cost: 0, billed: 0, earned: 0, overUnder: 0, retainage: 0 });

  // Exception counts
  const now = Date.now();
  const staleBilling = projectMetrics.filter(m => {
    const lastInv = invoices.filter(i => String(i.projectId) === String(m.p.id)).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
    if (!lastInv) return true;
    const daysSince = (now - new Date(lastInv.date).getTime()) / 86400000;
    return daysSince > 30;
  });
  const unapprovedBills = apBills.filter(b => {
    if (b.status !== "entered") return false;
    const daysOld = (now - new Date(b.date).getTime()) / 86400000;
    return daysOld > 7;
  });
  const missingW9 = vendors.filter(v => v.is1099 && v.w9Status !== "received");
  const missingLienWaivers = apBills.filter(b => b.status !== "void" && b.costType === "subcontractor" && (b.lienWaiverStatus === "missing" || !b.lienWaiverStatus));
  const lowMargin = projectMetrics.filter(m => m.adjustedContract > 0 && m.marginPct < marginThreshold);
  const totalRetainageReceivable = totals.retainage;
  const totalRetainagePayable = apBills
    .filter(b => b.status !== "void" && !b.retainageReleasedAt) // exclude voided + released
    .reduce((s, b) => s + (b.retainageAmount ?? Math.round((b.amount || 0) * (b.retainageRate || 0) / 100)), 0);

  return (
    <div>
      {/* A) WIP SCHEDULE */}
      <div className="flex-between mt-16">
        <div className="section-title">WIP Schedule (Work in Progress)</div>
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <label className="text-xs text-muted">Period</label>
          <select
            className="form-select more-edit-select"
            value={wipPeriod || ""}
            onChange={e => setWipPeriod(e.target.value || null)}
          >
            <option value="">All-time</option>
            {wipPeriodOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const headers = ["Project", "Contract", "Adj Contract", "Cost to Date", "% Complete", "Earned", "Billed", "Over/Under"];
            const rows = projectMetrics.map(m => [`"${m.p.name}"`, m.p.contract || 0, m.adjustedContract, Math.round(m.costs.total), Math.round(m.percentComplete * 100) + "%", Math.round(m.earnedRevenue), m.billed, Math.round(m.overUnder)]);
            const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `ebc_wip_schedule${wipPeriod ? "_" + wipPeriod : ""}.csv`; a.click(); URL.revokeObjectURL(url);
            app.show("WIP schedule exported");
          }}>Export CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const { jsPDF } = await import("jspdf");
            const doc = new jsPDF({ orientation: "landscape" });
            doc.setFontSize(16); doc.text("EBC — WIP Schedule", 14, 15);
            doc.setFontSize(9); doc.text(`Period: ${wipPeriod || "All-time"} · Generated: ${new Date().toLocaleDateString()}`, 14, 22);
            const headers = ["Project", "Contract", "Adj Contract", "Cost", "% Complete", "Earned", "Billed", "Over/Under"];
            const rows = projectMetrics.map(m => [
              (m.p.name || "").slice(0, 30),
              "$" + (m.p.contract || 0).toLocaleString(), "$" + Math.round(m.adjustedContract).toLocaleString(),
              "$" + Math.round(m.costs.total).toLocaleString(), Math.round(m.percentComplete * 100) + "%",
              "$" + Math.round(m.earnedRevenue).toLocaleString(), "$" + Math.round(m.billed).toLocaleString(),
              (m.overUnder >= 0 ? "$" : "-$") + Math.abs(Math.round(m.overUnder)).toLocaleString(),
            ]);
            let y = 30; doc.setFontSize(8);
            headers.forEach((h, i) => doc.text(h, 14 + i * 34, y));
            y += 5; doc.setDrawColor(200); doc.line(14, y, 280, y); y += 4;
            rows.forEach(row => { row.forEach((c, i) => doc.text(String(c), 14 + i * 34, y)); y += 5; if (y > 190) { doc.addPage(); y = 15; } });
            doc.save(`ebc_wip_schedule${wipPeriod ? "_" + wipPeriod : ""}.pdf`);
            app.show("WIP PDF exported");
          }}>Export PDF</button>
        </div>
      </div>

      <div className="text-xs text-dim mt-4">
        % Complete is cost-to-cost based on approved budget. Projects without a budget show "—".
        {wipPeriod && <span className="text-amber" style={{ marginLeft: 8, fontStyle: "italic" }}>Costs scoped to {wipPeriod}. Billed/earned are still lifetime.</span>}
      </div>
      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead><tr><th>Project</th><th>Contract</th><th>Adj Contract</th><th>Cost to Date</th><th>% Complete</th><th>Earned</th><th>Billed</th><th>Over/(Under)</th></tr></thead>
          <tbody>
            {projectMetrics.length === 0 && <tr><td colSpan={8} className="more-empty-cell">No active projects</td></tr>}
            {projectMetrics.map(m => (
              <tr key={m.p.id}>
                <td className="fw-600">{m.p.name}</td>
                <td className="font-mono">{app.fmt(m.p.contract || 0)}</td>
                <td className="font-mono">{app.fmt(m.adjustedContract)}</td>
                <td className="font-mono">{app.fmt(Math.round(m.costs.total))}</td>
                <td className="font-mono" style={{ color: m.hasBudget && m.percentComplete > 1 ? "var(--red)" : undefined }}>{m.hasBudget ? `${Math.round(m.percentComplete * 100)}%${m.percentComplete > 1 ? " ⚠" : ""}` : "—"}</td>
                <td className="font-mono">{m.hasBudget ? app.fmt(Math.round(m.earnedRevenue)) : "—"}</td>
                <td className="font-mono">{app.fmt(m.billed)}</td>
                <td className="font-mono" style={{ color: m.overUnder >= 0 ? "var(--green)" : "var(--red)" }}>
                  {m.hasBudget
                    ? (m.overUnder >= 0 ? app.fmt(Math.round(m.overUnder)) : `(${app.fmt(Math.round(Math.abs(m.overUnder)))})`)
                    : "—"}
                </td>
              </tr>
            ))}
            <tr className="fw-bold" style={{ borderTop: "2px solid var(--border)" }}>
              <td>TOTAL</td>
              <td className="font-mono">{app.fmt(projectMetrics.reduce((s, m) => s + (m.p.contract || 0), 0))}</td>
              <td className="font-mono">{app.fmt(totals.contract)}</td>
              <td className="font-mono">{app.fmt(Math.round(totals.cost))}</td>
              <td></td>
              <td className="font-mono">{app.fmt(Math.round(totals.earned))}</td>
              <td className="font-mono">{app.fmt(totals.billed)}</td>
              <td className="font-mono" style={{ color: totals.overUnder >= 0 ? "var(--green)" : "var(--red)" }}>{app.fmt(Math.round(totals.overUnder))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* B) PORTFOLIO SUMMARY */}
      <div className="mt-24">
        <div className="section-title">Portfolio Summary</div>
        <div className="table-wrap mt-8">
          <table className="data-table">
            <thead><tr><th>Project</th><th>Contract</th><th>Total Cost</th><th>Margin %</th><th>Billed</th><th>Over/Under</th><th>Status</th></tr></thead>
            <tbody>
              {projectMetrics.map(m => (
                <tr key={m.p.id}>
                  <td className="fw-600">{m.p.name}</td>
                  <td className="font-mono">{app.fmt(m.adjustedContract)}</td>
                  <td className="font-mono">{app.fmt(Math.round(m.costs.total))}</td>
                  <td className="font-mono" style={{ color: m.marginPct >= 30 ? "var(--green)" : m.marginPct >= marginThreshold ? "var(--amber)" : "var(--red)" }}>
                    {m.marginPct.toFixed(1)}%
                  </td>
                  <td className="font-mono">{app.fmt(m.billed)}</td>
                  <td className="font-mono" style={{ color: m.overUnder >= 0 ? "var(--green)" : "var(--red)" }}>
                    {m.overUnder >= 0 ? app.fmt(Math.round(m.overUnder)) : `(${app.fmt(Math.round(Math.abs(m.overUnder)))})`}
                  </td>
                  <td>{m.p.status || "active"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* C) EXCEPTION DASHBOARD */}
      <div className="mt-24">
        <div className="section-title">Exception Dashboard</div>
        <div className="flex gap-8 mt-8 flex-wrap">
          <div className="kpi-card">
            <span className="text2">Low Margin Projects</span>
            <strong style={{ color: lowMargin.length > 0 ? "var(--red)" : "var(--green)" }}>{lowMargin.length}</strong>
            <div className="text-xs text-dim">Below {marginThreshold}% threshold</div>
          </div>
          <div className="kpi-card">
            <span className="text2">Stale Billing</span>
            <strong style={{ color: staleBilling.length > 0 ? "var(--amber)" : "var(--green)" }}>{staleBilling.length}</strong>
            <div className="text-xs text-dim">No invoice in 30+ days</div>
          </div>
          <div className="kpi-card">
            <span className="text2">Unapproved AP Bills</span>
            <strong style={{ color: unapprovedBills.length > 0 ? "var(--amber)" : "var(--green)" }}>{unapprovedBills.length}</strong>
            <div className="text-xs text-dim">Entered 7+ days ago</div>
          </div>
          <div className="kpi-card">
            <span className="text2">Missing W-9</span>
            <strong style={{ color: missingW9.length > 0 ? "var(--red)" : "var(--green)" }}>{missingW9.length}</strong>
            <div className="text-xs text-dim">1099-eligible vendors</div>
          </div>
          <div className="kpi-card">
            <span className="text2">Missing Lien Waivers</span>
            <strong style={{ color: missingLienWaivers.length > 0 ? "var(--red)" : "var(--green)" }}>{missingLienWaivers.length}</strong>
            <div className="text-xs text-dim">Sub payments</div>
          </div>
          <div className="kpi-card">
            <span className="text2">Net Retainage Exposure</span>
            <strong style={{ color: (totalRetainageReceivable - totalRetainagePayable) >= 0 ? "var(--green)" : "var(--red)" }}>
              {app.fmt(totalRetainageReceivable - totalRetainagePayable)}
            </strong>
            <div className="text-xs text-dim">Receivable − Payable</div>
          </div>
        </div>

        {/* Drill-down lists for the alerts with items */}
        {lowMargin.length > 0 && (
          <div className="mt-16">
            <div className="text-sm fw-600 mb-8 c-red">Low Margin Projects ({lowMargin.length})</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Project</th><th>Contract</th><th>Cost</th><th>Margin %</th></tr></thead>
                <tbody>
                  {lowMargin.map(m => (
                    <tr key={m.p.id}>
                      <td>{m.p.name}</td>
                      <td className="font-mono">{app.fmt(m.adjustedContract)}</td>
                      <td className="font-mono">{app.fmt(Math.round(m.costs.total))}</td>
                      <td className="font-mono text-red fw-600">{m.marginPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {missingW9.length > 0 && (
          <div className="mt-16">
            <div className="text-sm fw-600 mb-8 c-red">Vendors Missing W-9 ({missingW9.length})</div>
            <ul className="text-sm">{missingW9.map(v => <li key={v.id}>• {v.name} — status: {v.w9Status}</li>)}</ul>
          </div>
        )}

        {unapprovedBills.length > 0 && (
          <div className="mt-16">
            <div className="text-sm fw-600 mb-8 c-amber">Unapproved AP Bills ({unapprovedBills.length})</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Vendor</th><th>Invoice #</th><th>Date</th><th>Amount</th></tr></thead>
                <tbody>
                  {unapprovedBills.map(b => {
                    const v = vendors.find(x => x.id === b.vendorId);
                    return (
                      <tr key={b.id}>
                        <td>{v?.name || "Unknown"}</td>
                        <td>{b.invoiceNumber}</td>
                        <td>{b.date}</td>
                        <td className="font-mono">{app.fmt(b.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SOV Overview (company-wide) ──────────────────────────── */
function SOVOverviewTab({ app }) {
  const projects = app.projects.filter(p => p.status === "in-progress" || p.status === "completed");
  const sovItems = app.sovItems || [];
  const payApps = app.payApps || [];

  const rows = projects.map(p => {
    const items = sovItems.filter(s => String(s.projectId) === String(p.id));
    const sovTotal = items.reduce((s, i) => s + (i.scheduledValue || 0), 0);
    const apps = payApps.filter(pa => String(pa.projectId) === String(p.id));
    const latestApp = apps.length > 0 ? apps.sort((a, b) => b.periodNumber - a.periodNumber)[0] : null;
    let billedToDate = 0;
    if (latestApp) {
      items.forEach(sov => {
        const line = latestApp.lines.find(l => l.sovItemId === sov.id);
        if (line) billedToDate += Math.round(sov.scheduledValue * (line.currentPercent / 100));
      });
    }
    return { project: p, sovTotal, lineCount: items.length, appCount: apps.length, billedToDate, hasSOV: items.length > 0 };
  });

  const withSOV = rows.filter(r => r.hasSOV);
  const withoutSOV = rows.filter(r => !r.hasSOV);
  const totalSOV = withSOV.reduce((s, r) => s + r.sovTotal, 0);
  const totalBilled = withSOV.reduce((s, r) => s + r.billedToDate, 0);

  return (
    <div>
      <div className="flex gap-16 mb-16 flex-wrap">
        <div><span className="text-dim text-xs">PROJECTS WITH SOV</span><div className="font-mono text-amber">{withSOV.length}</div></div>
        <div><span className="text-dim text-xs">TOTAL SOV VALUE</span><div className="font-mono">{app.fmt(totalSOV)}</div></div>
        <div><span className="text-dim text-xs">TOTAL BILLED</span><div className="font-mono text-green">{app.fmt(totalBilled)}</div></div>
        <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono">{app.fmt(totalSOV - totalBilled)}</div></div>
      </div>

      {withSOV.length > 0 && (
        <div className="mb-16">
          <div className="text-xs fw-600 mb-8 text-amber">PROJECTS WITH SOV</div>
          <table className="data-table">
            <thead><tr><th>Project</th><th>Lines</th><th style={{textAlign:"right"}}>SOV Total</th><th style={{textAlign:"right"}}>Billed</th><th style={{textAlign:"right"}}>Remaining</th><th>Pay Apps</th></tr></thead>
            <tbody>
              {withSOV.map(r => (
                <tr key={r.project.id} className="clickable" onClick={() => { app.setInitialProjTab("sov"); app.setModal({ type: "viewProject", data: r.project }); }}>
                  <td>{r.project.name}</td>
                  <td className="font-mono">{r.lineCount}</td>
                  <td className="font-mono" style={{textAlign:"right"}}>{app.fmt(r.sovTotal)}</td>
                  <td className="font-mono text-green" style={{textAlign:"right"}}>{app.fmt(r.billedToDate)}</td>
                  <td className="font-mono" style={{textAlign:"right"}}>{app.fmt(r.sovTotal - r.billedToDate)}</td>
                  <td className="font-mono">{r.appCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {withoutSOV.length > 0 && (
        <div>
          <div className="text-xs fw-600 mb-8 text-dim">PROJECTS WITHOUT SOV ({withoutSOV.length})</div>
          <div className="flex gap-4 flex-wrap">
            {withoutSOV.map(r => (
              <span key={r.project.id} className="badge badge-ghost clickable" onClick={() => { app.setInitialProjTab("sov"); app.setModal({ type: "viewProject", data: r.project }); }}>
                {r.project.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pay Apps Overview (company-wide) ─────────────────────── */
function PayAppsOverviewTab({ app }) {
  const payApps = (app.payApps || []).slice().sort((a, b) => {
    if (a.periodDate < b.periodDate) return 1;
    if (a.periodDate > b.periodDate) return -1;
    return 0;
  });
  const sovItems = app.sovItems || [];

  const statusBadge = (s) => s === "paid" ? "badge-green" : s === "submitted" ? "badge-amber" : "badge-ghost";
  const pName = (pid) => app.projects.find(p => String(p.id) === String(pid))?.name || "Unknown";

  const totalPending = payApps.filter(p => p.status === "submitted").length;
  const totalDraft = payApps.filter(p => p.status === "draft").length;

  return (
    <div>
      <div className="flex gap-16 mb-16 flex-wrap">
        <div><span className="text-dim text-xs">TOTAL PAY APPS</span><div className="font-mono text-amber">{payApps.length}</div></div>
        <div><span className="text-dim text-xs">PENDING</span><div className="font-mono" style={{color: totalPending > 0 ? "var(--amber)" : "var(--text3)"}}>{totalPending}</div></div>
        <div><span className="text-dim text-xs">DRAFTS</span><div className="font-mono">{totalDraft}</div></div>
      </div>

      {payApps.length === 0 ? (
        <div className="text-center py-24 text-dim">No pay applications yet. Open a project's SOV tab to create one.</div>
      ) : (
        <table className="data-table">
          <thead><tr><th>Project</th><th>App #</th><th>Period</th><th>Status</th><th style={{textAlign:"right"}}>This Period</th><th style={{textAlign:"right"}}>Cumulative</th><th>Notes</th></tr></thead>
          <tbody>
            {payApps.map(pa => {
              const items = sovItems.filter(s => String(s.projectId) === String(pa.projectId));
              let thisPeriod = 0, cumulative = 0;
              items.forEach(sov => {
                const line = pa.lines.find(l => l.sovItemId === sov.id);
                if (line) {
                  const prev = Math.round(sov.scheduledValue * (line.previousPercent / 100));
                  const curr = Math.round(sov.scheduledValue * (line.currentPercent / 100));
                  thisPeriod += curr - prev;
                  cumulative += curr;
                }
              });
              return (
                <tr key={pa.id} className="clickable" onClick={() => { app.setInitialProjTab("sov"); const proj = app.projects.find(p => String(p.id) === String(pa.projectId)); if (proj) app.setModal({ type: "viewProject", data: proj }); }}>
                  <td>{pName(pa.projectId)}</td>
                  <td className="font-mono fw-600">#{pa.periodNumber}</td>
                  <td>{pa.periodDate}</td>
                  <td><span className={`badge ${statusBadge(pa.status)}`}>{pa.status}</span></td>
                  <td className="font-mono text-green" style={{textAlign:"right"}}>{app.fmt(thisPeriod)}</td>
                  <td className="font-mono" style={{textAlign:"right"}}>{app.fmt(cumulative)}</td>
                  <td className="text-dim text-xs">{pa.notes || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
