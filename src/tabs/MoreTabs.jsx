import { useState, useCallback, Fragment, lazy, Suspense } from "react";
import { resetAllGuides } from "../components/FeatureGuide";
import { ClipboardList, Folder, Search, Smartphone, Wrench, Shield, Download, ClipboardCopy, CheckCircle, AlertTriangle, AlertOctagon, Flame, Droplets, Heart, Globe, Wind, Zap, CheckSquare, Square, Building2, Moon, Sun } from "lucide-react";
import { THEMES, OSHA_CHECKLIST, COMPANY_DEFAULTS, ASSEMBLIES } from "../data/constants";
import { storePdf, getPdfUrl, deletePdf, fmtSize } from "../hooks/useSubmittalPdf";
import { softDelete, filterActive, auditDiff, CRITICAL_FIELDS, validateInvoice, findDuplicateInvoice, validateChangeOrder, findDuplicateCO, validateAPBill, findDuplicateAPBill, computeProjectLaborCost, computeProjectLaborByCode, computeProjectTotalCost, computeProjectCostForPeriod, validateAccrual, validateCommitment, computeProjectCommittedCost, computeBudgetVsActual, validatePeriod, computeWorkedHours, getAdjustedContract, DEFAULT_BURDEN } from "../utils/financialValidation";
import { TimeClockAdmin } from "./TimeClockAdmin";
import { MapView } from "./MapView";

const BusinessCardGenerator = lazy(() => import("../components/BusinessCard"));
function BusinessCardTab({ app }) {
  return <Suspense fallback={<div className="text-sm text-dim">Loading...</div>}><BusinessCardGenerator employees={app.employees} app={app} /></Suspense>;
}

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · MoreTabs — Secondary tab routing & implementations
// ═══════════════════════════════════════════════════════════════

// ── Audit trail helper ──
function addAudit(item, field, oldVal, newVal, user) {
  const audit = [...(item.audit || [])];
  audit.push({
    timestamp: new Date().toISOString(),
    userName: user?.name || "System",
    field,
    oldValue: String(oldVal ?? ""),
    newValue: String(newVal ?? ""),
  });
  return audit;
}

// Shared attachments input for Invoice / AP Bill / CO forms
function AttachmentsInput({ app, form, setForm }) {
  const attachments = form.attachments || [];
  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    Promise.all(files.map(f => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: f.name, type: f.type, size: f.size, dataUrl: reader.result,
        uploadedAt: new Date().toISOString(), uploadedBy: app.auth?.name || "Unknown",
      });
      reader.readAsDataURL(f);
    }))).then(attached => setForm({ ...form, attachments: [...attachments, ...attached] }));
    e.target.value = "";
  };
  return (
    <div className="form-group mt-8">
      <label className="form-label">Attachments</label>
      <input className="form-input fs-12" type="file" multiple accept="image/*,.pdf" onChange={onFiles} />
      {attachments.length > 0 && (
        <div className="flex gap-4 flex-wrap mt-8">
          {attachments.map((a, i) => (
            <span key={i} className="more-attach-pill">
              📎 {a.name} ({Math.round((a.size || 0) / 1024)}KB)
              <span className="more-attach-remove" onClick={() => setForm({ ...form, attachments: attachments.filter((_, j) => j !== i) })}>✕</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditHistory({ audit }) {
  if (!audit || audit.length === 0) return null;
  return (
    <div className="mt-8 p-8 fs-10" style={{ borderRadius: "var(--radius-control)", background: "var(--bg3)" }}>
      <div className="fw-600 mb-3">Change History ({audit.length})</div>
      {audit.slice().reverse().slice(0, 10).map((a, i) => (
        <div key={i} className="more-list-row">
          <span className="text-muted">{new Date(a.timestamp).toLocaleString()}</span>
          {" — "}<strong>{a.userName}</strong> changed <em>{a.field}</em>
          {a.oldValue && <> from <span className="text-red">{a.oldValue}</span></>}
          {" → "}<span className="text-green">{a.newValue}</span>
        </div>
      ))}
    </div>
  );
}

export function MoreTabs({ app }) {
  switch (app.tab) {
    case "financials": return <Financials app={app} />;
    case "documents":  return <Documents app={app} />;
    case "schedule":   return <Schedule app={app} />;
    case "reports":    return <Reports app={app} />;
    case "safety":     return <Safety app={app} />;
    case "timeclock":  return <TimeClockAdmin app={app} />;
    case "sds":        return <SDSBinder app={app} />;
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
      <SubTabs tabs={["Invoices", "Change Orders", "T&M Tickets", "Job Costing", "Payroll Summary", "Aging Report", "AP Bills", "Vendors", "Commitments", "Retainage", "Period Close", "Budget", "Reports"]} active={sub} onChange={setSub} />
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
            import("../utils/qbExport.js").then(({ generateInvoiceIIF, downloadIIF }) => {
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
            <div className="mt-8" style={{ color: "var(--red)", fontSize: "var(--fs-11)" }}>
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
            <div className="mt-8" style={{ color: "var(--red)", fontSize: "var(--fs-11)" }}>
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
                  <td>{co.desc}</td>
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
                        const { generateChangeOrderPdf } = await import("../utils/changeOrderPdf.js");
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
            <div className="text-sm text-muted mt-16" style={{ textAlign: "center", padding: "var(--space-4)" }}>
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
      const { analyzeJobCostVariance } = await import("../utils/api.js");
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
                      <div style={{ fontSize: "var(--text-card)", fontWeight: "var(--weight-bold)", color: kpi.color || "var(--amber)", marginTop: "var(--space-1)" }}>{kpi.val}</div>
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
            <div style={{ marginTop: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--bg3)", borderRadius: "var(--radius-control)" }}>
              <div className="text-xs fw-600 mb-4" style={{ color: "var(--text2)" }}>Cost Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-2)", fontSize: "var(--fs-11)" }}>
                <div><span className="text2">Labor{(app.companySettings?.laborBurdenMultiplier || DEFAULT_BURDEN) > 1 ? " (burdened)" : ""}</span><br /><span className="font-mono text-amber">{app.fmt(costData.labor)}</span></div>
                <div><span className="text2">Material</span><br /><span className="font-mono">{app.fmt(costData.material)}</span></div>
                <div><span className="text2">Subcontractor</span><br /><span className="font-mono">{app.fmt(costData.subcontractor)}</span></div>
                <div><span className="text2">Other</span><br /><span className="font-mono">{app.fmt(costData.otherAP)}</span></div>
                <div><span className="text2 fw-600">Total Cost</span><br /><span className="font-mono fw-600" style={{ color: "var(--amber)" }}>{app.fmt(totalCost)}</span></div>
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
              <div style={{ marginTop: "var(--space-2)" }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--fs-10)" }}
                  onClick={() => setExpandedCostCodes(prev => ({ ...prev, [proj.id]: !prev[proj.id] }))}>
                  {expandedCostCodes[proj.id] ? "Hide" : "Show"} Cost Code Breakdown
                </button>
                {expandedCostCodes[proj.id] && (() => {
                  const codes = getCostCodeBreakdown(proj.id, proj.name);
                  return codes.length > 0 ? (
                    <table className="data-table mt-8" style={{ fontSize: "var(--fs-11)" }}>
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
            import("../utils/qbExport.js").then(({ generateTimeIIF, downloadIIF, validateTimeEntries }) => {
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
        <div className="kpi-card"><span className="text2">Total Payroll</span><strong className="text-amber">{app.fmt(totalPayroll)}</strong></div>
        <div className="kpi-card"><span className="text2">Total Hours</span><strong>{totalHours.toFixed(1)}h</strong></div>
        <div className="kpi-card"><span className="text2">Overtime Hours</span><strong style={{ color: totalOT > 0 ? "var(--red)" : "var(--green)" }}>{totalOT.toFixed(1)}h</strong></div>
        <div className="kpi-card"><span className="text2">Employees</span><strong>{byEmployee.filter(e => e.totalHours > 0).length}</strong></div>
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
        <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)", color }}>{app.fmt(sum(items))}</div>
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
      <div className="mt-4" style={{ color: "var(--amber)", fontSize: "var(--fs-11)" }}>
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
              <label className="form-label">Phase {form.costType && form.costType !== "labor" ? <span style={{ color: "var(--red)" }}>*</span> : null}</label>
              <select className="form-select" value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })}>
                <option value="">Select phase...</option>
                {COST_CODES.map(cc => <option key={cc.code || cc} value={cc.code || cc}>{cc.code ? `${cc.code} — ${cc.label || cc.description || cc.code}` : cc}</option>)}
              </select>
              {form.costType && form.costType !== "labor" && !form.phase && (
                <div className="text-xs" style={{ color: "var(--text2)" }}>Required for non-labor bills so they roll up against the budget phase.</div>
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
            <div className="mt-8" style={{ color: "var(--red)", fontSize: "var(--fs-11)" }}>
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
              <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)", color }}>{app.fmt(sum(items))}</div>
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
            <div className="mt-8" style={{ color: "var(--red)", fontSize: "var(--fs-11)" }}>
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
              <div className="mt-8" style={{ color: "var(--red)", fontSize: "var(--fs-11)" }}>
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
          <div className="section-title" style={{ color: "var(--red)" }}>⚠ Cutoff Report — Entries Posted After Period Close</div>
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
                <tr style={{ borderTop: "2px solid var(--border)", fontWeight: "var(--weight-bold)" }}>
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
  const projectMetrics = projects.filter(p => p.status !== "completed" && p.status !== "deleted").map(p => {
    const costs = wipPeriod
      ? computeProjectCostForPeriod(p.id, p.name, wipPeriod, timeEntries, employees, apBills, app.accruals || [], burden)
      : computeProjectTotalCost(p.id, p.name, timeEntries, employees, apBills, burden, app.accruals || []);
    const billed = invoices.filter(i => String(i.projectId) === String(p.id)).reduce((s, i) => s + (i.amount || 0), 0);
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
            <tr style={{ borderTop: "2px solid var(--border)", fontWeight: "var(--weight-bold)" }}>
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
            <div className="text-sm fw-600 mb-8" style={{ color: "var(--red)" }}>Low Margin Projects ({lowMargin.length})</div>
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
            <div className="text-sm fw-600 mb-8" style={{ color: "var(--red)" }}>Vendors Missing W-9 ({missingW9.length})</div>
            <ul className="text-sm">{missingW9.map(v => <li key={v.id}>• {v.name} — status: {v.w9Status}</li>)}</ul>
          </div>
        )}

        {unapprovedBills.length > 0 && (
          <div className="mt-16">
            <div className="text-sm fw-600 mb-8" style={{ color: "var(--amber)" }}>Unapproved AP Bills ({unapprovedBills.length})</div>
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
            }} className="fs-12" />
            {form.attachments.length > 0 && (
              <div className="flex gap-4 flex-wrap mt-8">
                {form.attachments.map((a, i) => (
                  <span key={i} className="more-attach-pill">
                    {a.name} ({(a.size / 1024).toFixed(0)} KB)
                    <span className="more-attach-remove" onClick={() => setForm(f => ({ ...f, attachments: f.attachments.filter((_, j) => j !== i) }))}>x</span>
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
          <thead><tr><th>RFI #</th><th>Project</th><th>Subject</th><th>Status</th><th>Submitted</th><th>Assigned</th><th>Days / Response</th><th></th></tr></thead>
          <tbody>
            {rfiFiltered.length === 0 && <tr><td colSpan={8} className="more-text-center">{app.search ? "No matching RFIs" : "No RFIs"}</td></tr>}
            {rfiFiltered.map(rfi => (
              <Fragment key={rfi.id}>
                <tr>
                  <td>{rfi.number}</td>
                  <td>{pName(rfi.projectId)}</td>
                  <td>
                    {rfi.subject}
                    {(rfi.attachments || []).length > 0 && (
                      <div className="flex gap-4 flex-wrap mt-4">
                        {rfi.attachments.map((a, ai) => (
                          <a key={ai} href={a.dataUrl} download={a.name} className="more-attach-link" onClick={e => e.stopPropagation()}>
                            {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td><span className={badge(rfi.status)}>{rfi.status}</span></td>
                  <td>{rfi.submitted}</td>
                  <td>{rfi.assigned}</td>
                  <td>{rfi.responseDate ? rfi.responseDate : rfi.submitted ? (() => { const d = Math.ceil((Date.now() - new Date(rfi.submitted).getTime()) / 86400000); return <span style={{ color: d > 14 ? "var(--red)" : d > 7 ? "var(--amber)" : "var(--text2)" }}>{d}d open</span>; })() : "—"}</td>
                  <td>
                    <div className="flex gap-4">
                    {rfi.status === "open" && (
                      <>
                        <button className="btn btn-primary btn-sm btn-table-action"
                          onClick={() => setDraftId(draftId === rfi.id ? null : rfi.id)}>
                          {draftId === rfi.id ? "Cancel" : "Answer"}
                        </button>
                        <button className="btn btn-ghost btn-sm btn-table-action"
                          onClick={() => runDraftResponse(rfi)}
                          disabled={draftLoading && draftId === rfi.id}>
                          {draftLoading && draftId === rfi.id ? "..." : "AI Draft"}
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost btn-sm btn-table-delete"
                      onClick={() => { if (confirm("Delete this RFI?")) { app.setRfis(prev => prev.filter(r => r.id !== rfi.id)); app.show("RFI deleted"); } }}>✕</button>
                    </div>
                  </td>
                </tr>
                {draftId === rfi.id && (
                  <tr><td colSpan={8} className="more-expand-cell">
                    <div className="more-detail-panel">
                      <div className="form-group mb-8">
                        <label className="form-label">Response</label>
                        <textarea className="form-textarea" rows={4} value={draftText} onChange={e => setDraftText(e.target.value)}
                          placeholder="Record the GC/architect response here..." />
                      </div>
                      <div className="form-group mb-8">
                        <label className="form-label">Ball in Court</label>
                        <select className="form-select" defaultValue={rfi.ballInCourt || ""} onChange={e => {
                          app.setRfis(prev => prev.map(r => r.id === rfi.id ? { ...r, ballInCourt: e.target.value } : r));
                        }}>
                          <option value="">Select...</option>
                          <option value="GC">GC</option>
                          <option value="Architect">Architect</option>
                          <option value="EBC">EBC (Us)</option>
                          <option value="Owner">Owner</option>
                        </select>
                      </div>
                      <div className="flex gap-8">
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          if (!draftText.trim()) { app.show("Response text is required", "err"); return; }
                          app.setRfis(prev => prev.map(r => r.id === rfi.id ? { ...r, status: "answered", response: draftText, responseDate: new Date().toISOString().slice(0, 10) } : r));
                          setDraftId(null);
                          setDraftText("");
                          app.show("RFI answered", "ok");
                        }}>Save Response & Close</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDraftId(null)}>Cancel</button>
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
const SUBMITTAL_CATEGORIES = ["All", "General", "Frames & Hardware", "Mechanical", "Electrical", "Structural", "Other"];
const FRAME_TYPES = ["Door Frame", "Window Frame", "Borrowed Lite", "Sidelite", "Transom", "Other"];
const FRAME_MATERIALS = ["HM (Hollow Metal)", "Wood", "Aluminum", "Steel", "Fiberglass"];
const FIRE_RATINGS = ["Non-Rated", "20 min", "45 min", "60 min", "90 min", "3-hr"];

function SubmittalsTab({ app }) {
  const emptyForm = () => ({
    projectId: "", number: "", desc: "", specSection: "", status: "preparing",
    submitted: "", due: "", pdfFile: null, linkedMaterialIds: [], linkedAssemblyCodes: [],
    category: "General",
    frameType: "", frameSize: "", frameMaterial: "", fireRating: "", scheduledDelivery: "",
  });

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editSub, setEditSub] = useState(null); // submittal being edited
  const [uploading, setUploading] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [catFilter, setCatFilter] = useState("All");

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";
  const subFiltered = app.submittals.filter(sub => {
    if (catFilter !== "All") {
      const subCat = sub.category || "General";
      if (subCat !== catFilter) return false;
    }
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
      category: form.category || "General",
      frameType: form.frameType || "",
      frameSize: form.frameSize || "",
      frameMaterial: form.frameMaterial || "",
      fireRating: form.fireRating || "",
      scheduledDelivery: form.scheduledDelivery || "",
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
    if (mats.length === 0 && asms.length === 0) return <span className="text-xs text-muted">None</span>;
    return (
      <div className="more-linked-wrap">
        {asms.map(code => (
          <span key={code} className="more-link-pill--blue">{code}</span>
        ))}
        {mats.map(id => (
          <span key={id} className="more-link-pill--green">{id}</span>
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
      <div className="form-group full pos-relative">
        <label className="form-label">{label}</label>
        {/* Selected pills */}
        {selectedIds.length > 0 && (
          <div className="flex gap-4 flex-wrap mb-6">
            {selectedIds.map(id => {
              const item = items.find(i => getKey(i) === id);
              return (
                <span key={id} className="more-attach-pill">
                  {item ? (getLabel(item).length > 30 ? getLabel(item).slice(0, 27) + "..." : getLabel(item)) : id}
                  <span className="more-attach-remove" onClick={() => onToggle(id)}>x</span>
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
          className="fs-12"
        />
        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div className="more-picker-dropdown">
            {filtered.map(item => {
              const key = getKey(item);
              const isSelected = selectedIds.includes(key);
              return (
                <div key={key}
                  style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", cursor: "pointer", background: isSelected ? "var(--amber-dim)" : "transparent", borderBottom: "1px solid var(--border)" }}
                  onMouseDown={e => { e.preventDefault(); onToggle(key); setSearch(""); }}
                >
                  {isSelected ? "✓ " : ""}{getLabel(item)}
                </div>
              );
            })}
            {search.trim() && filtered.length === 0 && (
              <div className="more-picker-empty">No matches</div>
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
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {SUBMITTAL_CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
          {/* ── Frames & Hardware extra fields ── */}
          {form.category === "Frames & Hardware" && (
            <div className="more-frame-header">
              <div className="more-frame-label">FRAME DETAILS</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Frame Type</label>
                  <select className="form-select" value={form.frameType} onChange={e => setForm({ ...form, frameType: e.target.value })}>
                    <option value="">Select...</option>
                    {FRAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Material</label>
                  <select className="form-select" value={form.frameMaterial} onChange={e => setForm({ ...form, frameMaterial: e.target.value })}>
                    <option value="">Select...</option>
                    {FRAME_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Size (W×H)</label>
                  <input className="form-input" value={form.frameSize} onChange={e => setForm({ ...form, frameSize: e.target.value })} placeholder="e.g. 3'0&quot; x 7'0&quot;" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fire Rating</label>
                  <select className="form-select" value={form.fireRating} onChange={e => setForm({ ...form, fireRating: e.target.value })}>
                    <option value="">Select...</option>
                    {FIRE_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Scheduled Delivery</label>
                  <input className="form-input" type="date" value={form.scheduledDelivery} onChange={e => setForm({ ...form, scheduledDelivery: e.target.value })} />
                </div>
              </div>
            </div>
          )}
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

      {/* ── Category filter ── */}
      <div className="flex gap-4 mt-12 mb-4 flex-wrap">
        {SUBMITTAL_CATEGORIES.map(c => {
          const count = c === "All" ? app.submittals.length : app.submittals.filter(s => (s.category || "General") === c).length;
          return (
            <button key={c} className={`btn btn-sm ${catFilter === c ? "btn-primary" : "btn-ghost"}`} onClick={() => setCatFilter(c)}>
              {c} {count > 0 && <span className="ml-4 fs-10">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* ── Submittals table ── */}
      <div className="table-wrap mt-16">
        <table className="data-table">
          <thead>
            <tr><th>Sub #</th><th>Project</th><th>Category</th><th>Description</th><th>Spec</th><th>Status</th><th>PDF</th><th>Linked</th><th>Due / Delivery</th><th></th></tr>
          </thead>
          <tbody>
            {subFiltered.length === 0 && <tr><td colSpan={10} className="more-text-center">{app.search ? "No matching submittals" : "No submittals"}</td></tr>}
            {subFiltered.map(sub => {
              const isFrame = (sub.category || "General") === "Frames & Hardware";
              return (
              <Fragment key={sub.id}>
                <tr onClick={() => openEdit(sub)} className="more-cursor-pointer">
                  <td className="fw-600">{sub.number}</td>
                  <td className="fs-12">{pName(sub.projectId)}</td>
                  <td>
                    <span style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", background: isFrame ? "rgba(245,158,11,0.15)" : "var(--bg3)", color: isFrame ? "var(--amber)" : "var(--text2)" }}>
                      {sub.category || "General"}
                    </span>
                  </td>
                  <td>
                    <div>{sub.desc}</div>
                    {isFrame && sub.frameType && (
                      <div className="more-sub-detail">
                        {[sub.frameType, sub.frameMaterial, sub.frameSize, sub.fireRating].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="fs-12">{sub.specSection}</td>
                  <td><span className={`badge ${badge(sub.status)}`}>{sub.status}</span></td>
                  <td>
                    {sub.pdfKey ? (
                      <button className="btn btn-sm btn-ghost btn-table-action" onClick={e => { e.stopPropagation(); viewPdf(sub.pdfKey); }}>
                        {sub.pdfName || "View PDF"}
                      </button>
                    ) : <span className="text-xs text-muted">—</span>}
                  </td>
                  <td>{renderLinked(sub)}</td>
                  <td className="fs-12">
                    <div>{sub.due}</div>
                    {isFrame && sub.scheduledDelivery && (
                      <div className="more-sub-detail">Del: {sub.scheduledDelivery}</div>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm btn-table-action"
                      onClick={e => { e.stopPropagation(); reviewId === sub.id && reviewResult ? setReviewId(null) : runReview(sub); }}
                      disabled={reviewLoading && reviewId === sub.id}>
                      {reviewLoading && reviewId === sub.id ? "..." : reviewId === sub.id && reviewResult ? "Hide" : "AI Review"}
                    </button>
                    <button className="btn btn-ghost btn-sm btn-table-delete"
                      onClick={e => { e.stopPropagation(); if (confirm("Delete this submittal?")) { app.setSubmittals(prev => prev.filter(s => s.id !== sub.id)); app.show("Submittal deleted"); } }}>✕</button>
                    </div>
                  </td>
                </tr>
                {reviewId === sub.id && reviewResult && (
                  <tr><td colSpan={10} className="more-expand-cell">
                    <div className="more-detail-panel">
                      {/* Score + Status */}
                      <div className="more-grid-2">
                        <div className="more-metric-card--p10">
                          <div className="text-xs text-muted">Readiness Score</div>
                          <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: reviewResult.score >= 80 ? "var(--green)" : reviewResult.score >= 50 ? "var(--amber)" : "var(--red)" }}>{reviewResult.score}/100</div>
                        </div>
                        <div className="more-metric-card--p10">
                          <div className="text-xs text-muted">Status</div>
                          <div style={{ fontSize: "var(--text-secondary)", fontWeight: "var(--weight-semi)", marginTop: "var(--space-1)", color: reviewResult.status === "ready" ? "var(--green)" : reviewResult.status === "needs_work" ? "var(--amber)" : "var(--red)" }}>
                            {reviewResult.status === "ready" ? "Ready to Submit" : reviewResult.status === "needs_work" ? "Needs Work" : "Critical Issues"}
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="text-sm mb-12">{reviewResult.summary}</div>

                      {/* Issues */}
                      {reviewResult.issues?.length > 0 && (
                        <div className="mb-12">
                          <div className="text-sm font-semi mb-8">Issues Found</div>
                          {reviewResult.issues.map((iss, i) => (
                            <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", borderLeft: `3px solid ${iss.severity === "critical" ? "var(--red)" : iss.severity === "warning" ? "var(--amber)" : "var(--blue)"}`, background: "var(--card)", fontSize: "var(--text-label)" }}>
                              <div className="flex-between">
                                <span className="font-semi">{iss.item}</span>
                                <span className={iss.severity === "critical" ? "badge-red" : iss.severity === "warning" ? "badge-amber" : "badge-blue"}>{iss.severity}</span>
                              </div>
                              <div className="text-muted mt-4 fs-12">{iss.detail}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {reviewResult.recommendations?.length > 0 && (
                        <div className="mb-12">
                          <div className="text-sm font-semi mb-8">Recommendations</div>
                          {reviewResult.recommendations.map((r, i) => (
                            <div key={i} style={{ padding: "var(--space-1) 0", fontSize: "var(--text-label)", borderBottom: "1px solid var(--border)" }}>{r}</div>
                          ))}
                        </div>
                      )}

                      {/* Material Notes */}
                      {reviewResult.materialNotes?.length > 0 && (
                        <div>
                          <div className="text-sm font-semi mb-8">Material Notes</div>
                          {reviewResult.materialNotes.map((n, i) => (
                            <div key={i} className="more-list-row--plain text-muted">{n}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td></tr>
                )}
              </Fragment>
            );
            })}
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
                <label className="form-label">Category</label>
                <select className="form-select" value={editSub.category || "General"} onChange={e => setEditSub({ ...editSub, category: e.target.value })}>
                  {SUBMITTAL_CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
            {/* ── Frames & Hardware extra fields (edit) ── */}
            {(editSub.category || "General") === "Frames & Hardware" && (
              <div className="more-frame-header">
                <div className="more-frame-label">FRAME DETAILS</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Frame Type</label>
                    <select className="form-select" value={editSub.frameType || ""} onChange={e => setEditSub({ ...editSub, frameType: e.target.value })}>
                      <option value="">Select...</option>
                      {FRAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Material</label>
                    <select className="form-select" value={editSub.frameMaterial || ""} onChange={e => setEditSub({ ...editSub, frameMaterial: e.target.value })}>
                      <option value="">Select...</option>
                      {FRAME_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Size (W×H)</label>
                    <input className="form-input" value={editSub.frameSize || ""} onChange={e => setEditSub({ ...editSub, frameSize: e.target.value })} placeholder="e.g. 3'0&quot; x 7'0&quot;" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fire Rating</label>
                    <select className="form-select" value={editSub.fireRating || ""} onChange={e => setEditSub({ ...editSub, fireRating: e.target.value })}>
                      <option value="">Select...</option>
                      {FIRE_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Scheduled Delivery</label>
                    <input className="form-input" type="date" value={editSub.scheduledDelivery || ""} onChange={e => setEditSub({ ...editSub, scheduledDelivery: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* PDF section */}
            <div className="form-group mt-16">
              <label className="form-label">PDF Attachment</label>
              {editSub.pdfKey && !editSub._newPdfFile ? (
                <div className="sub-pdf-attached">
                  <span className="fs-13">{editSub.pdfName}</span>
                  <span className="text-xs text-dim">{fmtSize(editSub.pdfSize)}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => viewPdf(editSub.pdfKey)}>View</button>
                  <button className="btn btn-sm btn-ghost text-red" onClick={() => removePdf(editSub)}>Remove</button>
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
  const [form, setForm] = useState({ projectId: "", task: "", start: "", end: "", team: "", status: "not-started", milestone: false, predecessorId: "" });
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
        start: t.start, end: t.end, team: t.team, status: t.status, milestone: t.milestone,
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
        team: t.team,
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
      const teamData = (app.teamSchedule || []).map(c => ({
        team: c.team || c.name,
        members: c.members || c.size,
        project: c.project,
        available: c.available,
      }));
      const result = await forecastLaborDemand(app.apiKey, scheduleData, projectData, teamData);
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
      team: form.team,
      status: form.status,
      milestone: form.milestone,
      predecessorId: form.predecessorId ? Number(form.predecessorId) : null,
    };
    app.setSchedule(prev => [...prev, newItem]);
    app.show("Task added", "ok");
    setAdding(false);
    setForm({ projectId: "", task: "", start: "", end: "", team: "", status: "not-started", milestone: false, predecessorId: "" });
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="flex gap-8 items-center">
          <div className="section-title">Project Schedule</div>
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} className="w-auto">
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
                `"${(t.task||'').replace(/"/g,'""')}"`, `"${pName(t.projectId)}"`, t.team||'',
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
          {laborLoading && <div className="text-sm text-muted more-empty-cell">Analyzing schedule and team data...</div>}
          {laborResult && (
            <div className="mt-8">
              {/* Summary */}
              <div className="more-detail-summary">
                {laborResult.summary}
              </div>

              {/* Weekly Forecast Table */}
              {laborResult.weeklyForecast?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">4-Week Outlook</div>
                  <table className="data-table fs-13">
                    <thead><tr><th>Week</th><th>Crews</th><th>Hours</th><th>Projects</th><th>Bottleneck</th></tr></thead>
                    <tbody>
                      {laborResult.weeklyForecast.map((w, i) => (
                        <tr key={i}>
                          <td className="font-semi">{w.week}</td>
                          <td style={{ fontWeight: "var(--weight-bold)", color: "var(--amber)" }}>{w.teamsNeeded}</td>
                          <td>{w.hoursEstimate}h</td>
                          <td className="fs-12">{(w.projects || []).join(", ")}</td>
                          <td style={{ fontSize: "var(--text-label)", color: w.bottleneck ? "var(--red)" : "var(--text3)" }}>{w.bottleneck || "None"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Crew Gaps */}
              {laborResult.teamGaps?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Crew Gaps</div>
                  {laborResult.teamGaps.map((g, i) => (
                    <div key={i} className="more-ranking-item more-ranking-item--red">
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
                <div className="more-info-card--amber">
                  <span className="font-semi">Peak Week: </span>{laborResult.peakWeek.week} — {laborResult.peakWeek.teamsNeeded} teams needed
                  <div className="text-xs text-muted mt-4">{laborResult.peakWeek.reason}</div>
                </div>
              )}

              {/* Overtime */}
              {laborResult.overtime && (
                <div className="more-info-card">
                  <span className="font-semi">Overtime Likelihood: </span>{laborResult.overtime.likelihood}
                  {laborResult.overtime.estimatedHours > 0 && <span> — ~{laborResult.overtime.estimatedHours}h estimated</span>}
                </div>
              )}

              {/* Recommendations */}
              {laborResult.recommendations?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Recommendations</div>
                  {laborResult.recommendations.map((r, i) => (
                    <div key={i} className="more-list-row">
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
          {conflictLoading && <div className="text-sm text-muted more-empty-cell">Scanning schedule for conflicts...</div>}
          {conflictResult && (
            <div className="mt-8">
              <div className="more-detail-summary">{conflictResult.summary}</div>

              {conflictResult.conflicts?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Conflicts Detected</div>
                  {conflictResult.conflicts.map((c, i) => (
                    <div key={i} style={{ padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", borderLeft: `3px solid ${c.severity === "critical" ? "var(--red)" : c.severity === "warning" ? "var(--amber)" : "var(--blue)"}`, background: "var(--card)", fontSize: "var(--text-label)" }}>
                      <div className="flex-between">
                        <span className="font-semi">{c.type} — {(c.projects || []).join(", ")}</span>
                        <span className={c.severity === "critical" ? "badge-red" : c.severity === "warning" ? "badge-amber" : "badge-blue"}>{c.severity}</span>
                      </div>
                      <div className="text-muted mt-4 fs-12">{c.detail}</div>
                      <div className="text-xs mt-2 text-blue">Fix: {c.resolution}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.sequenceIssues?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Sequence Issues</div>
                  {conflictResult.sequenceIssues.map((s, i) => (
                    <div key={i} className="more-list-row">
                      <span className="font-semi">{s.project}</span>: {s.issue}
                      <div className="text-xs text-muted mt-2">Correct: {s.correctSequence}</div>
                    </div>
                  ))}
                </div>
              )}

              {conflictResult.criticalPath?.length > 0 && (
                <div className="mb-12">
                  <div className="text-sm font-semi mb-8">Critical Path</div>
                  {conflictResult.criticalPath.map((c, i) => (
                    <div key={i} className="more-list-row">
                      <div className="flex-between">
                        <span className="font-semi">{c.project}</span>
                        <span style={{ color: c.slackDays <= 3 ? "var(--red)" : "var(--amber)", fontWeight: "var(--weight-semi)" }}>{c.slackDays}d slack</span>
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
                    <div key={i} className="more-list-row">
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
              <input className="form-input" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} />
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
            <label className="form-label flex-center-gap-8">
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
      <div className="gantt-wrap mt-16 overflow-x-auto">
        <div className="gantt-header more-gantt-header">
          <div className="more-gantt-task-col">Task</div>
          <div className="more-gantt-months">
            {months.map(m => (
              <div key={m} className="more-gantt-month">{m}</div>
            ))}
          </div>
        </div>
        {filtered.length === 0 && <div className="more-gantt-empty">No tasks</div>}
        {filtered.map(task => {
          const leftPct = (new Date(task.start) - ganttStart) / 86400000 / totalDays * 100;
          const widthPct = (new Date(task.end) - new Date(task.start)) / 86400000 / totalDays * 100;
          return (
            <div className="gantt-row more-gantt-row" key={task.id} >
              <div className="gantt-label more-gantt-label">
                {task.task}
              </div>
              <div className="gantt-track more-gantt-track">
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
                    borderRadius: "var(--radius-control)",
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
                  <tr key={task.id} className="bg-bg3">
                    <td><input className="form-input" value={editTask.task} onChange={e => setEditTask({ ...editTask, task: e.target.value })} className="more-edit-input" /></td>
                    <td>
                      <select className="form-select" value={editTask.projectId} onChange={e => setEditTask({ ...editTask, projectId: e.target.value })} className="more-edit-select">
                        {app.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td><input className="form-input" value={editTask.team} onChange={e => setEditTask({ ...editTask, team: e.target.value })} className="more-edit-input" /></td>
                    <td><input className="form-input" type="date" value={editTask.start} onChange={e => setEditTask({ ...editTask, start: e.target.value })} className="more-edit-select" /></td>
                    <td><input className="form-input" type="date" value={editTask.end} onChange={e => setEditTask({ ...editTask, end: e.target.value })} className="more-edit-select" /></td>
                    <td>
                      <select className="form-select" value={editTask.predecessorId || ""} onChange={e => setEditTask({ ...editTask, predecessorId: e.target.value ? Number(e.target.value) : null })} className="more-edit-select">
                        <option value="">None</option>
                        {app.schedule.filter(s => s.id !== task.id).map(s => <option key={s.id} value={s.id}>{s.task}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="form-select" value={editTask.status} onChange={e => setEditTask({ ...editTask, status: e.target.value })} className="more-edit-select">
                        <option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="complete">Complete</option>
                      </select>
                    </td>
                    <td className="more-edit-actions">
                      <button className="btn btn-primary btn-sm btn-table-save" onClick={() => { app.setSchedule(prev => prev.map(t => t.id === task.id ? { ...t, ...editTask, projectId: Number(editTask.projectId) } : t)); setEditTaskId(null); app.show("Task updated"); }}>Save</button>
                      <button className="btn btn-ghost btn-sm btn-table-save" onClick={() => setEditTaskId(null)}>Cancel</button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={task.id}>
                  <td>{task.milestone ? "\u25C6 " : ""}{task.task}</td>
                  <td>{pName(task.projectId)}</td>
                  <td>{task.team || "—"}</td>
                  <td>{task.start}</td>
                  <td>{task.end}</td>
                  <td style={{ fontSize: "var(--text-tab)", color: "var(--text2)" }}>{pred ? pred.task : "—"}</td>
                  <td><span className={task.status === "complete" ? "badge-green" : task.status === "in-progress" ? "badge-amber" : "badge-muted"}>{task.status}</span></td>
                  <td className="more-edit-actions">
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)" }}
                      onClick={() => { setEditTaskId(task.id); setEditTask({ task: task.task, projectId: task.projectId, team: task.team || "", start: task.start, end: task.end, status: task.status, predecessorId: task.predecessorId || "" }); }}>✎</button>
                    <button className="btn btn-ghost btn-sm btn-table-delete"
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

  const tooltipStyle = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", color: "var(--text)" };

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
      <div className="flex gap-8 mt-16 flex-wrap">
        <div className="kpi-card"><span className="text2">Total Pipeline</span><strong>{app.fmtK(totalPipeline)}</strong></div>
        <div className="kpi-card"><span className="text2">Avg Bid Size</span><strong>{app.fmtK(avgBidSize)}</strong></div>
        <div className="kpi-card"><span className="text2">Total Bids</span><strong>{bids.length}</strong></div>
        <div className="kpi-card"><span className="text2">Most Active GC</span><strong className="fs-14">{mostActiveGC}</strong></div>
        <div className="kpi-card"><span className="text2">Win Rate</span><strong>{winRate !== null ? `${winRate}%` : "—"}</strong></div>
        <div className="kpi-card"><span className="text2">Projects In Progress</span><strong>{inProgress}</strong></div>
      </div>

      {/* AI Business Forecast */}
      <div className="card mt-16">
        <div className="card-header flex-between">
          <div className="card-title font-head">AI Business Forecast</div>
          <button className="btn btn-ghost btn-sm text-amber" onClick={() => { showForecast ? setShowForecast(false) : runForecast(); }} disabled={forecastLoading}>
            {forecastLoading ? "Forecasting..." : "AI Forecast"}
          </button>
        </div>
        {!showForecast && !forecastLoading && (
          <div className="text-sm text-muted py-8">AI-powered quarterly forecast — revenue projections, market trends, and growth opportunities.</div>
        )}
        {showForecast && forecastResult && (
          <div className="max-h-500 overflow-auto">
            <div className="text-sm text-muted mb-12">{forecastResult.summary}</div>

            {/* KPI Forecasts */}
            {forecastResult.kpiForecasts && (
              <div className="flex gap-12 mb-16 flex-wrap">
                <div className="kpi-card kpi-min-lg">
                  <span className="text2">Win Rate</span>
                  <strong>{forecastResult.kpiForecasts.winRate?.current}% → {forecastResult.kpiForecasts.winRate?.projected}%</strong>
                </div>
                <div className="kpi-card kpi-min-lg">
                  <span className="text2">Avg Margin</span>
                  <strong>{forecastResult.kpiForecasts.avgMargin?.current}% → {forecastResult.kpiForecasts.avgMargin?.projected}%</strong>
                </div>
                <div className="kpi-card kpi-min-lg">
                  <span className="text2">Backlog</span>
                  <strong>{forecastResult.kpiForecasts.backlog?.projected}</strong>
                </div>
              </div>
            )}

            {/* Revenue Forecast */}
            {forecastResult.revenueforecast && (
              <div className="more-detail-summary">
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
              <div className="mb-12">
                <div className="text-sm font-semi mb-8">Cash Flow Projection</div>
                <table className="data-table fs-12">
                  <thead><tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Risk</th></tr></thead>
                  <tbody>
                    {forecastResult.cashFlowProjection.map((c, i) => (
                      <tr key={i}>
                        <td className="font-semi">{c.month}</td>
                        <td className="text-green">${(c.expectedInflow || 0).toLocaleString()}</td>
                        <td className="text-red">${(c.expectedOutflow || 0).toLocaleString()}</td>
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
              <div className="mb-12">
                <div className="text-sm font-semi mb-8 text-green">Growth Opportunities</div>
                {forecastResult.growthOpportunities.map((g, i) => (
                  <div key={i} className="more-list-row">
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
              <div className="mb-12">
                <div className="text-sm font-semi mb-8">Market Trends</div>
                {forecastResult.marketTrends.map((t, i) => (
                  <div key={i} className="more-list-row">
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
                <div className="text-sm font-semi mb-8 text-amber">Quarterly Goals</div>
                {forecastResult.quarterlyGoals.map((g, i) => (
                  <div key={i} className="more-list-row">
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
          <div className="text-sm text-muted py-8">AI-powered executive brief of your business performance, GC relationships, and growth opportunities.</div>
        )}
        {reportLoading && <div className="text-sm text-muted more-empty-cell">Analyzing {bids.length} bids and {projects.length} projects...</div>}
        {reportSummary && (
          <div className="mt-8">
            {/* Executive Overview */}
            <div className="more-detail-summary--lg">
              {reportSummary.executive}
            </div>

            {/* Strengths + Concerns */}
            <div className="more-grid-2-gap12">
              {reportSummary.strengths?.length > 0 && (
                <div className="more-info-card--green">
                  <div className="text-sm font-semi mb-8 text-green">Strengths</div>
                  {reportSummary.strengths.map((s, i) => <div key={i} style={{ fontSize: "var(--text-label)", padding: "var(--space-1) 0" }}>{s}</div>)}
                </div>
              )}
              {reportSummary.concerns?.length > 0 && (
                <div className="more-info-card--red">
                  <div className="text-sm font-semi mb-8 text-red">Concerns</div>
                  {reportSummary.concerns.map((c, i) => <div key={i} style={{ fontSize: "var(--text-label)", padding: "var(--space-1) 0" }}>{c}</div>)}
                </div>
              )}
            </div>

            {/* GC Analysis */}
            {reportSummary.gcAnalysis && (
              <div className="more-info-card">
                <div className="font-semi mb-4 text-blue">GC Relationship Analysis</div>
                {reportSummary.gcAnalysis}
              </div>
            )}

            {/* Opportunities */}
            {reportSummary.opportunities?.length > 0 && (
              <div className="mb-12">
                <div className="text-sm font-semi mb-8 text-amber">Growth Opportunities</div>
                {reportSummary.opportunities.map((o, i) => (
                  <div key={i} className="more-list-row--plain">{o}</div>
                ))}
              </div>
            )}

            {/* Forecast */}
            {reportSummary.forecast && (
              <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", marginBottom: "var(--space-3)", fontSize: "var(--text-label)" }}>
                <div className="font-semi mb-4">Near-Term Forecast</div>
                {reportSummary.forecast}
              </div>
            )}

            {/* Action Items */}
            {reportSummary.actionItems?.length > 0 && (
              <div>
                <div className="text-sm font-semi mb-8">Action Items</div>
                {reportSummary.actionItems.map((a, i) => (
                  <div key={i} className="more-list-row">
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
      <div className="flex gap-16 mt-24 flex-wrap">
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
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} unit="%" />
            <YAxis type="category" dataKey="name" width={130} tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} />
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
            <XAxis dataKey="name" tick={{ fill: "var(--text2)", fontSize: "var(--text-label)", textTransform: "capitalize" }} />
            <YAxis tick={{ fill: "var(--text2)", fontSize: "var(--text-tab)" }} tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
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
          const billed = filterActive(app.invoices).filter(i => i.projectId === proj.id).reduce((s, i) => s + i.amount, 0);
          const remaining = proj.contract - billed;
          const pct = proj.contract > 0 ? Math.round((billed / proj.contract) * 100) : 0;
          return (
            <div key={proj.id} className="bar-row mb-16">
              <div className="flex-between fs-13">
                <span className="bar-label">{proj.name}</span>
                <span className="bar-value text2">{app.fmt(billed)} / {app.fmt(proj.contract)} ({app.fmt(remaining)} remaining)</span>
              </div>
              <div className="bar-track" style={{ height: 14, background: "var(--bg4)", borderRadius: "var(--radius-control)", marginTop: "var(--space-1)" }}>
                <div className="bar-fill" style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "var(--amber)", borderRadius: "var(--radius-control)" }} />
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
function IncidentsTab({ app }) {
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
                    <img src={p.data} alt={p.name} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: "var(--radius-control)" }} />
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
                            <div key={i} style={{ padding: "var(--space-1) var(--space-3)", marginBottom: "var(--space-1)", borderRadius: "var(--radius-control)", background: "var(--card)", fontSize: "var(--text-label)", borderLeft: "3px solid var(--amber)" }}>
                              <span className="font-semi">{f.factor}</span>
                              <span className="badge-muted" style={{ marginLeft: "var(--space-2)", fontSize: "var(--text-xs)" }}>{f.category}</span>
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
                        <div style={{ padding: "var(--space-2)", borderRadius: "var(--radius-control)", background: "var(--card)", border: "1px solid var(--border)", marginBottom: "var(--space-2)", fontSize: "var(--text-label)" }}>
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
                  <div className="font-semi" style={{ marginBottom: "var(--space-2)", color: "var(--amber)" }}>{section.heading}</div>
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
                    <div key={i} style={{ padding: "var(--space-1) 0", fontSize: "var(--text-label)", fontStyle: "italic" }}>{i + 1}. {q}</div>
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
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", color: "var(--red)" }} onClick={() => { if (confirm("Delete this talk?")) { app.setToolboxTalks(prev => prev.filter(t => t.id !== talk.id)); app.show("Talk deleted"); } }}>✕</button>
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
      const { generateDailyReportDigest } = await import("../utils/api.js");
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
            const { generateDailyReportPdf } = await import("../utils/dailyReportPdf.js");
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
              <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--card)", border: "1px solid var(--border)", fontSize: "var(--text-label)" }}>
                <div className="font-semi mb-4 fs-12">Labor</div>
                {digestResult.laborNotes}
              </div>
            )}
            {digestResult.materialNotes && (
              <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--card)", border: "1px solid var(--border)", fontSize: "var(--text-label)" }}>
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
              <div className="font-semi mb-4" style={{ fontSize: "var(--text-label)", color: "var(--red)" }}>Safety</div>
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
                    <img src={p.data} alt={p.name} style={{ height: 60, borderRadius: "var(--radius-control)", objectFit: "cover" }} />
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
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)" }} onClick={() => setEditDr({ ...rpt })}>Edit</button>
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
                    <img key={i} src={p.data} alt={p.name || "photo"} style={{ height: 80, borderRadius: "var(--radius-control)", objectFit: "cover", cursor: "pointer", border: "1px solid var(--border)" }}
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
                <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--card)", textAlign: "center" }}>
                  <div className="text-xs text-muted">Readiness Score</div>
                  <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: auditResult.readinessScore >= 80 ? "var(--green)" : auditResult.readinessScore >= 60 ? "var(--amber)" : "var(--red)" }}>{auditResult.readinessScore}/100</div>
                </div>
                <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--card)", textAlign: "center" }}>
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
                <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(16,185,129,0.08)", border: "1px solid var(--green)", marginBottom: "var(--space-3)" }}>
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
  const statusIcon = (s) => s === "valid" ? <CheckCircle size={14} style={{ color: "var(--green)" }} /> : s === "expiring" ? <AlertTriangle size={14} style={{ color: "var(--amber)" }} /> : <AlertOctagon size={14} style={{ color: "var(--red)" }} />;

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

/* ══════════════════════════════════════════════════════════════
   SDS BINDER
   ══════════════════════════════════════════════════════════════ */
function SDSBinder({ app }) {
  const [sub, setSub] = useState("Library");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    productName: "", manufacturer: "", hazardClass: "", ghsPictograms: [],
    projectIds: [], notes: "", expiresAt: "",
  });
  const [editId, setEditId] = useState(null);
  const [fileData, setFileData] = useState(null);

  const userRole = app.auth?.role || "owner";
  const canEdit = ["owner", "admin", "pm", "safety", "office_admin"].includes(userRole);
  const sheets = app.sdsSheets || [];

  const GHS_PICTOGRAMS = [
    { id: "flame", label: "Flame", icon: "[F]" },
    { id: "exclamation", label: "Exclamation", icon: "[!]" },
    { id: "skull", label: "Skull & Crossbones", icon: "[X]" },
    { id: "corrosion", label: "Corrosion", icon: "[C]" },
    { id: "health", label: "Health Hazard", icon: "[H]" },
    { id: "environment", label: "Environment", icon: "[E]" },
    { id: "oxidizer", label: "Oxidizer", icon: "[O]" },
    { id: "gas", label: "Gas Cylinder", icon: "[G]" },
    { id: "explosive", label: "Explosive", icon: "[Ex]" },
  ];

  const HAZARD_CLASSES = [
    "Flammable", "Corrosive", "Toxic", "Irritant", "Oxidizer",
    "Compressed Gas", "Environmental Hazard", "Health Hazard", "Explosive", "Other"
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileData({ name: file.name, size: file.size, type: file.type, dataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const save = () => {
    if (!form.productName || !form.manufacturer) { app.show("Product name and manufacturer required", "err"); return; }
    if (editId) {
      app.setSdsSheets(prev => prev.map(s => s.id === editId ? { ...s, ...form, file: fileData || s.file, updatedAt: new Date().toISOString() } : s));
      app.show("SDS updated", "ok");
    } else {
      const newSheet = {
        id: app.nextId(), ...form,
        file: fileData, uploadedBy: app.auth?.name || "Unknown",
        uploadedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      app.setSdsSheets(prev => [...prev, newSheet]);
      app.show("SDS sheet added", "ok");
    }
    setAdding(false);
    setEditId(null);
    setForm({ productName: "", manufacturer: "", hazardClass: "", ghsPictograms: [], projectIds: [], notes: "", expiresAt: "" });
    setFileData(null);
  };

  const deleteSheet = (sheet) => {
    if (!confirm(`Remove SDS for ${sheet.productName}?`)) return;
    app.setSdsSheets(prev => prev.filter(s => s.id !== sheet.id));
    app.show("SDS removed", "ok");
  };

  const startEdit = (sheet) => {
    setForm({
      productName: sheet.productName, manufacturer: sheet.manufacturer,
      hazardClass: sheet.hazardClass, ghsPictograms: sheet.ghsPictograms || [],
      projectIds: sheet.projectIds || [], notes: sheet.notes || "", expiresAt: sheet.expiresAt || "",
    });
    setFileData(sheet.file || null);
    setEditId(sheet.id);
    setAdding(true);
  };

  const filtered = sheets.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.productName.toLowerCase().includes(q) || s.manufacturer.toLowerCase().includes(q) || (s.hazardClass || "").toLowerCase().includes(q);
  });

  const pName = (pid) => app.projects.find(p => p.id === pid)?.name || "Unknown";

  const togglePictogram = (picId) => {
    setForm(f => ({
      ...f,
      ghsPictograms: f.ghsPictograms.includes(picId) ? f.ghsPictograms.filter(p => p !== picId) : [...f.ghsPictograms, picId]
    }));
  };

  const toggleProject = (projId) => {
    setForm(f => ({
      ...f,
      projectIds: f.projectIds.includes(projId) ? f.projectIds.filter(p => p !== projId) : [...f.projectIds, projId]
    }));
  };

  const renderForm = () => (
    <div className="card mt-16">
      <div className="card-header"><div className="card-title">{editId ? "Edit SDS Sheet" : "Add SDS Sheet"}</div></div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className="form-input" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} placeholder="e.g. Joint Compound, Texture Spray" />
        </div>
        <div className="form-group">
          <label className="form-label">Manufacturer *</label>
          <input className="form-input" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. USG, National Gypsum" />
        </div>
        <div className="form-group">
          <label className="form-label">Hazard Class</label>
          <select className="form-select" value={form.hazardClass} onChange={e => setForm({ ...form, hazardClass: e.target.value })}>
            <option value="">Select...</option>
            {HAZARD_CLASSES.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Expires</label>
          <input className="form-input" type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
      </div>

      <div className="form-group mt-16">
        <label className="form-label">GHS Pictograms</label>
        <div className="flex gap-6 flex-wrap">
          {GHS_PICTOGRAMS.map(p => (
            <button key={p.id} type="button"
              className={`btn btn-sm ${form.ghsPictograms.includes(p.id) ? "btn-primary" : "btn-ghost"} fs-12`} onClick={() => togglePictogram(p.id)}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group mt-16">
        <label className="form-label">Assign to Projects</label>
        <div className="flex gap-6 flex-wrap">
          {app.projects.map(p => (
            <button key={p.id} type="button"
              className={`btn btn-sm ${form.projectIds.includes(p.id) ? "btn-primary" : "btn-ghost"} btn-table-action`} onClick={() => toggleProject(p.id)}>
              {p.name || p.project}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group mt-16">
        <label className="form-label">SDS Document (PDF/Image)</label>
        <input className="form-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileUpload} />
        {fileData && <div className="text-xs text-muted mt-4">{fileData.name} ({Math.round(fileData.size / 1024)}KB)</div>}
      </div>

      <div className="form-group mt-16">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="PPE requirements, storage instructions, etc." />
      </div>

      <div className="mt-16 flex gap-8">
        <button className="btn btn-primary btn-sm" onClick={save}>{editId ? "Update" : "Add SDS"}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditId(null); setFileData(null); }}>Cancel</button>
      </div>
    </div>
  );

  const renderSheetCard = (sheet) => {
    const pictoIcons = (sheet.ghsPictograms || []).map(id => GHS_PICTOGRAMS.find(p => p.id === id)?.icon || "").join(" ");
    const isExpired = sheet.expiresAt && new Date(sheet.expiresAt) < new Date();
    const isExpiringSoon = sheet.expiresAt && !isExpired && (new Date(sheet.expiresAt) - new Date()) < 30 * 86400000;

    return (
      <div key={sheet.id} className="card mb-8">
        <div className="flex-between">
          <div>
            <div className="font-semi fs-14">{sheet.productName}</div>
            <div className="text-xs text-muted">{sheet.manufacturer}</div>
          </div>
          <div className="flex gap-4 items-center">
            {sheet.hazardClass && <span className="badge badge-amber fs-10">{sheet.hazardClass}</span>}
            {isExpired && <span className="badge badge-red fs-10">EXPIRED</span>}
            {isExpiringSoon && <span className="badge badge-amber fs-10">Expiring Soon</span>}
          </div>
        </div>
        {pictoIcons && <div className="fs-18 mt-6">{pictoIcons}</div>}
        {(sheet.projectIds || []).length > 0 && (
          <div className="flex gap-4 flex-wrap mt-6">
            {sheet.projectIds.map(pid => <span key={pid} className="badge badge-blue fs-9">{pName(pid)}</span>)}
          </div>
        )}
        {sheet.notes && <div className="text-xs text-muted mt-6">{sheet.notes}</div>}
        <div className="flex-between mt-8">
          <div className="text-xs text-muted">
            Uploaded by {sheet.uploadedBy} on {new Date(sheet.uploadedAt).toLocaleDateString()}
            {sheet.expiresAt && ` | Expires: ${sheet.expiresAt}`}
          </div>
          <div className="flex gap-4">
            {sheet.file && (
              <button className="btn btn-ghost btn-sm fs-10" onClick={() => {
                const a = document.createElement("a"); a.href = sheet.file.dataUrl; a.download = sheet.file.name; a.click();
              }}>View PDF</button>
            )}
            {canEdit && (
              <>
                <button className="btn btn-ghost btn-sm btn-table-edit--amber" onClick={() => startEdit(sheet)}>Edit</button>
                <button className="btn btn-ghost btn-sm btn-table-edit--red" onClick={() => deleteSheet(sheet)}>Remove</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // By Project view
  const projectsWithSDS = app.projects.filter(p => sheets.some(s => (s.projectIds || []).includes(p.id)));
  const unassigned = sheets.filter(s => !s.projectIds || s.projectIds.length === 0);

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">SDS Binder</div>
          <div className="section-sub">Safety Data Sheets — OSHA Hazard Communication Compliance</div>
        </div>
        {canEdit && <button className="btn btn-primary btn-sm" onClick={() => { setAdding(!adding); setEditId(null); }}>+ Add SDS</button>}
      </div>

      <SubTabs tabs={["Library", "By Project", "Quick Lookup"]} active={sub} onChange={setSub} />

      {adding && renderForm()}

      {sub === "Library" && (
        <div className="mt-16">
          <div className="flex gap-8 mb-16">
            <div className="kpi-card"><span className="text2">Total Sheets</span><strong>{sheets.length}</strong></div>
            <div className="kpi-card"><span className="text2">Expired</span><strong className="text-red">{sheets.filter(s => s.expiresAt && new Date(s.expiresAt) < new Date()).length}</strong></div>
            <div className="kpi-card"><span className="text2">Projects Covered</span><strong>{new Set(sheets.flatMap(s => s.projectIds || [])).size}</strong></div>
          </div>
          <input className="form-input mb-16" placeholder="Search by product, manufacturer, or hazard class..." value={search} onChange={e => setSearch(e.target.value)} />
          {filtered.length === 0 ? (
            <div className="card more-empty-card">
              <div className="more-empty-icon"><ClipboardList className="more-empty-icon" /></div>
              <div className="text-sm text-muted mt-8">No SDS sheets yet. Click "+ Add SDS" to upload your first safety data sheet.</div>
            </div>
          ) : filtered.map(renderSheetCard)}
        </div>
      )}

      {sub === "By Project" && (
        <div className="mt-16">
          {projectsWithSDS.length === 0 && unassigned.length === sheets.length ? (
            <div className="card more-empty-card">
              <div className="more-empty-icon"><Folder className="more-empty-icon" /></div>
              <div className="text-sm text-muted mt-8">No SDS sheets assigned to projects yet. Edit an SDS sheet to assign it to a project.</div>
            </div>
          ) : (
            <>
              {projectsWithSDS.map(proj => {
                const projSheets = sheets.filter(s => (s.projectIds || []).includes(proj.id));
                return (
                  <div key={proj.id} className="mt-16">
                    <div className="section-title fs-14 mb-8">{proj.name || proj.project} ({projSheets.length} sheets)</div>
                    {projSheets.map(renderSheetCard)}
                  </div>
                );
              })}
              {unassigned.length > 0 && (
                <div className="mt-16">
                  <div className="section-title fs-14 mb-8 text-muted">Unassigned ({unassigned.length})</div>
                  {unassigned.map(renderSheetCard)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {sub === "Quick Lookup" && (
        <div className="mt-16">
          <div className="mb-16">
            <input
              className="form-input"
              style={{ fontSize: "var(--text-section)", padding: "var(--space-4) var(--space-4)", textAlign: "center" }}
              placeholder="Type product name or manufacturer..."
              value={search} onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {search.length > 0 ? (
            filtered.length > 0 ? filtered.map(renderSheetCard) : (
              <div className="card more-empty-card">
                <div className="more-empty-icon"><Search className="more-empty-icon" /></div>
                <div className="text-sm text-muted mt-8">No SDS sheets match "{search}"</div>
              </div>
            )
          ) : (
            <div className="card more-empty-card">
              <div className="more-empty-icon"><Smartphone className="more-empty-icon" /></div>
              <div className="text-sm text-muted mt-8">Start typing to search SDS sheets. Designed for quick field access.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SETTINGS
   ══════════════════════════════════════════════════════════════ */
function Settings({ app }) {
  const userRole = app.auth?.role || "owner";
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const isForeman = userRole === "foreman";
  const isFullAccess = ["owner", "admin", "pm"].includes(userRole);

  // Simplified settings for non-business roles
  const canSeeInsurance = ["owner", "admin", "pm", "office_admin", "accounting"].includes(userRole);
  const tabs = isFullAccess
    ? ["Company", ...(canSeeInsurance ? ["Insurance"] : []), "Assemblies", "Equipment", "Margin Tiers", "Business Cards", "Data", "QuickBooks", "Theme", "API", "Account"]
    : [...(canSeeInsurance ? ["Insurance"] : []), "Theme", "Account"];
  if (isOwnerOrAdmin) tabs.push("Users");
  if (isForeman) tabs.push("Team");
  const [sub, setSub] = useState(isFullAccess ? "Company" : "Theme");
  return (
    <div>
      <SubTabs tabs={tabs} active={sub} onChange={setSub} />
      {sub === "Company" && <CompanyTab app={app} />}
      {sub === "Assemblies" && <AssembliesTab app={app} />}
      {sub === "Equipment" && <EquipmentTab app={app} />}
      {sub === "Margin Tiers" && <MarginTiersTab app={app} />}
      {sub === "Business Cards" && <BusinessCardTab app={app} />}
      {sub === "Data" && <DataTab app={app} />}
      {sub === "QuickBooks" && <QuickBooksTab app={app} />}
      {sub === "Theme" && <ThemeTab app={app} />}
      {sub === "API" && <ApiTab app={app} />}
      {sub === "Account" && <AccountTab app={app} />}
      {sub === "Insurance" && <InsuranceTab app={app} />}
      {sub === "Users" && isOwnerOrAdmin && <UsersTab app={app} />}
      {sub === "Team" && isForeman && <ForemanTeamTab app={app} />}

      {/* ── Account / Logout ── */}
      <div className="card mt-16 more-account-card">
        <div>
          <div className="more-account-name">
            {app.auth?.name || "User"}
          </div>
          <div className="more-account-email">
            {app.auth?.email} &middot; {app.auth?.role?.toUpperCase()}
          </div>
        </div>
        <button
          className="btn btn-ghost more-btn-logout"
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
        <div className="card p-20 mb-20">
          <div className="text-sm font-semi mb-12">{adding ? "Add Equipment" : "Edit Equipment"}</div>
          <div className="form-grid gap-12">
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
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Serial number, condition, rental company..." className="resize-v" />
            </div>
          </div>
          <div className="flex gap-8 mt-16">
            <button className="btn btn-primary btn-sm" onClick={saveForm}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Equipment Table */}
      <div className="overflow-x-auto">
        <table className="more-eq-table">
          <thead>
            <tr className="more-eq-thead">
              <th className="more-eq-th">Name</th>
              <th className="more-eq-th">Type</th>
              <th className="more-eq-th">Daily</th>
              <th className="more-eq-th">Weekly</th>
              <th className="more-eq-th">Monthly</th>
              <th className="more-eq-th">Status</th>
              <th className="more-eq-th">Project</th>
              <th className="more-eq-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(eq => (
              <tr key={eq.id} className="more-eq-row">
                <td className="more-eq-td fw-600">{eq.name}</td>
                <td className="more-eq-td">
                  <span className={`badge ${eq.type === "Owned" ? "badge-blue" : "badge-amber"}`}>{eq.type}</span>
                </td>
                <td className="more-eq-td font-mono">${eq.dailyRate}</td>
                <td className="more-eq-td font-mono">${eq.weeklyRate}</td>
                <td className="more-eq-td font-mono">${eq.monthlyRate}</td>
                <td className="more-eq-td">
                  <span style={{ color: statusColor(eq.status), fontWeight: "var(--weight-semi)" }}>{eq.status}</span>
                </td>
                <td style={{ padding: "var(--space-2) var(--space-3)", color: eq.assignedProject ? "var(--text)" : "var(--text3)" }}>
                  {eq.assignedProject || "--"}
                </td>
                <td className="more-eq-td">
                  <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(eq)} className="btn-table-action">Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(eq.id)} className="btn-table-delete">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state mt-16">
          <div className="empty-icon"><Wrench className="more-empty-icon" /></div>
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
    { key: "silver", label: "Silver", color: "var(--text2)", bg: "rgba(148,163,184,0.10)", perks: "Lunch on EBC, preferred pricing on next bid" },
    { key: "gold", label: "Gold", color: "var(--yellow)", bg: "rgba(234,179,8,0.10)", perks: "Gift card ($100), first-call on new projects" },
    { key: "platinum", label: "Platinum", color: "var(--purple)", bg: "rgba(167,139,250,0.10)", perks: "Annual dinner, exclusive partnership status" },
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

      <div className="more-tier-grid">
        {TIER_CONFIG.map(tc => (
          <div key={tc.key} className="card" style={{ padding: "var(--space-5)", borderLeft: `4px solid ${tc.color}`, background: tc.bg }}>
            <div className="flex-center-gap-8 mb-12">
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: tc.color }} />
              <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)", color: tc.color }}>{tc.label}</div>
            </div>
            <div className="form-group mb-12">
              <label className="form-label">Minimum Margin (%)</label>
              <input
                className="form-input"
                type="number"
                step="1"
                min="0"
                max="100"
                value={tiers[tc.key]}
                onChange={e => handleChange(tc.key, e.target.value)}
                className="more-metric-value more-text-center"
              />
            </div>
            <div className="text-xs text-dim">
              <span className="fw-600">Perks:</span> {tc.perks}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-16 p-16">
        <div className="text-sm font-semi mb-8">How It Works</div>
        <div className="text-sm text-dim">
          When a project is completed, its profit margin determines the appreciation tier.
          Projects with a margin at or above the threshold qualify for that tier's perks.
          These rates are used by the Incentive & Appreciation system.
        </div>
        <div className="mt-12 flex gap-16 flex-wrap">
          {TIER_CONFIG.map(tc => (
            <div key={tc.key} className="fs-13">
              <span style={{ color: tc.color, fontWeight: "var(--weight-bold)" }}>{tc.label}:</span>{" "}
              <span className="font-mono">{tiers[tc.key]}%+</span>
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
            padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", fontSize: "var(--text-label)",
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
      <InstallGuide />
    </div>
  );
}

/* ── Install Guide (iPhone / Android / Computer) ─────────────── */
function InstallGuide() {
  const [expanded, setExpanded] = useState(false);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return null; // already installed
  return (
    <div className="mt-16">
      <div className="section-title">Install App</div>
      <div className="card mt-8 p-16">
        <div style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginBottom: "var(--space-3)" }}>
          Install EBC-OS on your device for offline access and instant launch.
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Hide Guide" : "Show Install Guide"}
        </button>
        {expanded && (
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div>
              <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)", marginBottom: "var(--space-2)", color: "var(--text)" }}>iPhone / iPad</div>
              <ol style={{ fontSize: "var(--text-label)", color: "var(--text2)", paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <li>Open <strong>Safari</strong> (must be Safari, not Chrome)</li>
                <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right</li>
                <li>EBC will appear on your home screen</li>
              </ol>
            </div>
            <div>
              <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Android</div>
              <ol style={{ fontSize: "var(--text-label)", color: "var(--text2)", paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <li>Open <strong>Chrome</strong></li>
                <li>Tap the <strong>three-dot menu</strong> (top right)</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Install"</strong></li>
                <li>EBC will appear in your app drawer and home screen</li>
              </ol>
            </div>
            <div>
              <div style={{ fontWeight: "var(--weight-bold)", fontSize: "var(--text-card)", marginBottom: "var(--space-2)", color: "var(--text)" }}>Computer (Chrome / Edge)</div>
              <ol style={{ fontSize: "var(--text-label)", color: "var(--text2)", paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <li>Open <strong>Chrome</strong> or <strong>Edge</strong></li>
                <li>Click the <strong>install icon</strong> in the address bar (monitor with arrow)</li>
                <li>Click <strong>"Install"</strong></li>
                <li>EBC will open as a standalone window</li>
              </ol>
            </div>
          </div>
        )}
      </div>
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
    width: 44, height: 24, borderRadius: "var(--radius-control)", cursor: "pointer", border: "none",
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
      <div className="card mt-8 p-16">
        {permission !== "granted" && permission !== "unsupported" && (
          <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: "rgba(224,148,34,0.1)", border: "1px solid rgba(224,148,34,0.3)", fontSize: "var(--text-label)" }}>
            Notifications are {permission === "denied" ? "blocked" : "not enabled"}.
            {permission === "default" && <button className="btn btn-sm ml-8" onClick={requestPerm}>Enable</button>}
          </div>
        )}
        {[
          { key: "clockReminders", label: "Clock-in reminders" },
          { key: "materialUpdates", label: "Material request updates" },
          { key: "scheduleChanges", label: "Schedule change alerts" },
          { key: "certExpiryWarnings", label: "Cert expiry warnings" },
          { key: "lateArrivalAlerts", label: "Late arrival alerts" },
          { key: "dailyReportReminder", label: "Daily report reminder" },
        ].map(({ key, label }) => (
          <div key={key} className="more-toggle-row">
            <span className="fs-14">{label}</span>
            <button style={toggleStyle(prefs[key])} onClick={() => toggle(key)}>
              <div style={dotStyle(prefs[key])} />
            </button>
          </div>
        ))}
        {prefs.dailyReportReminder && (
          <div className="more-toggle-row">
            <span className="fs-13 text-muted">Reminder time</span>
            <input type="time" value={prefs.dailyReportTime} onChange={e => setTime(e.target.value)}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "var(--radius-control)", padding: "var(--space-1) var(--space-2)", color: "var(--text-primary)", fontSize: "var(--text-label)" }} />
          </div>
        )}
        {"PushManager" in window && (
          <div className="mt-12 pt-12">
            <div className="more-toggle-row">
              <div>
                <span className="fs-14">Background push</span>
                <div className="fs-11 text-muted mt-2">Receive alerts even when app is closed</div>
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

/* ── Insurance / COI Tracker ──────────────────────────────────── */
function InsuranceTab({ app }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ type: "General Liability", carrier: "", policyNumber: "", effectiveDate: "", expiryDate: "", coverageLimit: "", notes: "" });
  const [fileData, setFileData] = useState(null);

  const policies = app.insurancePolicies || [];
  const now = new Date();

  const POLICY_TYPES = ["General Liability", "Workers Compensation", "Commercial Auto", "Umbrella / Excess", "Professional Liability", "Builders Risk", "Inland Marine", "Pollution Liability"];

  const getStatus = (pol) => {
    if (!pol.expiryDate) return "active";
    const exp = new Date(pol.expiryDate);
    if (exp < now) return "expired";
    if ((exp - now) / 86400000 <= 30) return "expiring";
    return "active";
  };

  const save = () => {
    if (!form.carrier || !form.policyNumber) { app.show("Carrier and policy number required", "err"); return; }
    if (editId) {
      app.setInsurancePolicies(prev => prev.map(p => p.id === editId ? { ...p, ...form, file: fileData || p.file, updatedAt: new Date().toISOString() } : p));
      app.show("Policy updated", "ok");
    } else {
      app.setInsurancePolicies(prev => [...prev, { id: app.nextId(), ...form, file: fileData, uploadedAt: new Date().toISOString() }]);
      app.show("Policy added", "ok");
    }
    setAdding(false); setEditId(null); setFileData(null);
    setForm({ type: "General Liability", carrier: "", policyNumber: "", effectiveDate: "", expiryDate: "", coverageLimit: "", notes: "" });
  };

  const startEdit = (pol) => {
    setForm({ type: pol.type, carrier: pol.carrier, policyNumber: pol.policyNumber, effectiveDate: pol.effectiveDate || "", expiryDate: pol.expiryDate || "", coverageLimit: pol.coverageLimit || "", notes: pol.notes || "" });
    setFileData(pol.file || null);
    setEditId(pol.id); setAdding(true);
  };

  const deletePol = (pol) => {
    if (!confirm(`Remove ${pol.type} policy?`)) return;
    app.setInsurancePolicies(prev => prev.filter(p => p.id !== pol.id));
    app.show("Policy removed", "ok");
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileData({ name: file.name, size: file.size, type: file.type, dataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const shareCOI = (pol) => {
    const text = `${pol.type}\nCarrier: ${pol.carrier}\nPolicy #: ${pol.policyNumber}\nEffective: ${pol.effectiveDate || "N/A"}\nExpires: ${pol.expiryDate || "N/A"}\nCoverage: ${pol.coverageLimit || "N/A"}`;
    navigator.clipboard.writeText(text).then(() => app.show("COI info copied to clipboard", "ok")).catch(() => app.show("Copy failed", "err"));
  };

  const STATUS_BADGE = { active: "badge-green", expiring: "badge-amber", expired: "badge-red" };
  const activeCount = policies.filter(p => getStatus(p) === "active").length;
  const expiringCount = policies.filter(p => getStatus(p) === "expiring").length;
  const expiredCount = policies.filter(p => getStatus(p) === "expired").length;

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Insurance & COI Tracker</div>
        <button className="btn btn-primary btn-sm" onClick={() => { setAdding(!adding); setEditId(null); setFileData(null); }}>+ Add Policy</button>
      </div>

      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Total Policies</span><strong>{policies.length}</strong></div>
        <div className="kpi-card"><span className="text2">Active</span><strong className="text-green">{activeCount}</strong></div>
        <div className="kpi-card"><span className="text2">Expiring (&lt;30d)</span><strong className="text-amber">{expiringCount}</strong></div>
        <div className="kpi-card"><span className="text2">Expired</span><strong className="text-red">{expiredCount}</strong></div>
      </div>

      {adding && (
        <div className="card mt-16">
          <div className="card-header"><div className="card-title">{editId ? "Edit Policy" : "Add Insurance Policy"}</div></div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Policy Type *</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Carrier *</label>
              <input className="form-input" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="e.g. State Farm, Liberty Mutual" />
            </div>
            <div className="form-group">
              <label className="form-label">Policy Number *</label>
              <input className="form-input" value={form.policyNumber} onChange={e => setForm({ ...form, policyNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Coverage Limit</label>
              <input className="form-input" value={form.coverageLimit} onChange={e => setForm({ ...form, coverageLimit: e.target.value })} placeholder="e.g. $1,000,000 / $2,000,000" />
            </div>
            <div className="form-group">
              <label className="form-label">Effective Date</label>
              <input className="form-input" type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="form-group full">
              <label className="form-label">COI Document (PDF)</label>
              <input className="form-input" type="file" accept=".pdf,.png,.jpg" onChange={handleFile} />
              {fileData && <div className="text-xs text-muted mt-4">{fileData.name} ({Math.round(fileData.size / 1024)}KB)</div>}
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional insured requirements, endorsements, etc." />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={save}>{editId ? "Update" : "Add Policy"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-16">
        {policies.length === 0 ? (
          <div className="card more-empty-card">
            <div className="more-empty-icon"><Shield className="more-empty-icon" /></div>
            <div className="text-sm text-muted mt-8">No insurance policies on file. Add your GL, WC, Auto, and Umbrella policies.</div>
          </div>
        ) : policies.map(pol => {
          const status = getStatus(pol);
          return (
            <div key={pol.id} className="card" style={{ marginBottom: "var(--space-2)", borderLeft: `4px solid var(--${status === "active" ? "green" : status === "expiring" ? "amber" : "red"})` }}>
              <div className="flex-between">
                <div>
                  <div className="font-semi fs-14">{pol.type}</div>
                  <div className="text-xs text-muted">{pol.carrier} — Policy #{pol.policyNumber}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[status]} fs-10`}>{status}</span>
              </div>
              <div className="more-policy-grid">
                <div><span className="text2">Coverage</span><br />{pol.coverageLimit || "—"}</div>
                <div><span className="text2">Effective</span><br />{pol.effectiveDate || "—"}</div>
                <div><span className="text2">Expires</span><br />{pol.expiryDate || "—"}</div>
              </div>
              {pol.notes && <div className="text-xs text-muted mt-6">{pol.notes}</div>}
              <div className="flex gap-4 mt-8">
                <button className="btn btn-ghost btn-sm fs-10 flex-center-gap-4" onClick={() => shareCOI(pol)}><ClipboardCopy className="icon-12" /> Copy COI Info</button>
                {pol.file && <button className="btn btn-ghost btn-sm fs-10 flex-center-gap-4" onClick={() => { const a = document.createElement("a"); a.href = pol.file.dataUrl; a.download = pol.file.name; a.click(); }}><Download className="icon-12" /> Download</button>}
                <button className="btn btn-ghost btn-sm btn-table-edit--amber" onClick={() => startEdit(pol)}>Edit</button>
                <button className="btn btn-ghost btn-sm btn-table-edit--red" onClick={() => deletePol(pol)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Foreman Team Invite (Foreman only — helpers & team only) ── */
function ForemanTeamTab({ app }) {
  const FOREMAN_INVITE_ROLES = { employee: "Employee / Team", driver: "Driver" };
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", pin: "" });

  const refresh = () => {
    try { setUsers(JSON.parse(localStorage.getItem("ebc_users") || "[]")); } catch {}
  };

  const addCrewMember = async () => {
    if (!form.name || !form.email) { app.show("Name and email required", "err"); return; }
    const existing = users.find(u => u.email.toLowerCase() === form.email.toLowerCase());
    if (existing) { app.show("Email already exists", "err"); return; }
    if (!["employee", "driver"].includes(form.role)) {
      app.show("Foremen can only invite team members and drivers", "err"); return;
    }
    const { hashPasswordSync: hps } = await import("../utils/passwordHash");
    const newUser = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email.toLowerCase(),
      password: hps(form.name.split(" ")[0] + "123!"),
      role: form.role,
      pin: hps(form.pin || String(1000 + users.length + 1)),
      hourlyRate: 35,
      active: true,
      mustChangePassword: true,
      invitedBy: app.auth?.name || "Foreman",
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setForm({ name: "", email: "", role: "employee", pin: "" });
    setAdding(false);
    app.show(`Added ${newUser.name} — temp password: ${form.name.split(" ")[0]}123!`, "ok");
  };

  const teamMembers = users.filter(u => ["employee", "driver"].includes(u.role));

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div>
          <div className="section-title">Invite Crew Member</div>
          <div className="text-xs text-muted mt-4">As a foreman, you can add team members and drivers to the team.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Crew</button>
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
                {Object.entries(FOREMAN_INVITE_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PIN (4-digit)</label>
              <input className="form-input" maxLength={6} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} placeholder="Auto-generated" />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={addCrewMember}>Add to Team</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div className="more-temp-hint">
            Temp password will be: [FirstName]123! — user will be prompted to change on first login.
          </div>
        </div>
      )}

      <div className="mt-16">
        <div className="text-sm font-semi mb-8">Crew &amp; Drivers ({teamMembers.length})</div>
        {teamMembers.length === 0 ? (
          <div className="empty-state"><div className="empty-text">No team members yet</div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
            </thead>
            <tbody>
              {teamMembers.map(u => (
                <tr key={u.id} style={{ opacity: u.active === false ? 0.5 : 1 }}>
                  <td className="fw-500">{u.name}</td>
                  <td className="fs-12">{u.email}</td>
                  <td><span className="badge badge-blue fs-10">{FOREMAN_INVITE_ROLES[u.role] || u.role}</span></td>
                  <td><span className={`badge ${u.active === false ? "badge-red" : "badge-green"} fs-10`}>{u.active === false ? "Inactive" : "Active"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [form, setForm] = useState({ name: "", email: "", role: "employee", pin: "", hourlyRate: "" });
  const [editId, setEditId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const ROLES_IMPORT = {
    owner: "Owner", admin: "Admin", pm: "Project Manager", estimator: "Estimator",
    project_engineer: "Project Engineer", foreman: "Superintendent / Foreman",
    safety: "Safety Officer", accounting: "Accounting", office_admin: "Office Admin",
    employee: "Employee / Team", driver: "Driver"
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
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : 35,
      active: true,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    setForm({ name: "", email: "", role: "employee", pin: "", hourlyRate: "" });
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

  const toggleActive = (user) => {
    if (user.id === app.auth.id) { app.show("Cannot deactivate yourself", "err"); return; }
    const updated = users.map(u => u.id === user.id ? { ...u, active: u.active === false ? true : false } : u);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`${user.name} ${user.active === false ? "activated" : "deactivated"}`, "ok");
  };

  const deleteUser = (user) => {
    if (user.id === app.auth.id) { app.show("Cannot delete yourself", "err"); return; }
    if (!confirm(`Permanently remove ${user.name}? This cannot be undone. Consider deactivating instead.`)) return;
    const updated = users.filter(u => u.id !== user.id);
    localStorage.setItem("ebc_users", JSON.stringify(updated));
    setUsers(updated);
    app.show(`Removed ${user.name}`, "ok");
  };

  // Filter users
  const filtered = users.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = users.filter(u => u.active !== false).length;
  const inactiveCount = users.filter(u => u.active === false).length;
  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  // User detail expansion
  const getUserDetails = (user) => {
    const certs = (app.certifications || []).filter(c => c.employeeId === user.id);
    const entries = (app.timeEntries || []).filter(e => e.employeeId === user.id || e.employee === user.name);
    const recentEntries = entries.slice(-5);
    const totalHours = entries.reduce((s, e) => {
      if (e.hours) return s + e.hours;
      if (e.clockIn && e.clockOut) return s + (new Date(e.clockOut) - new Date(e.clockIn)) / 3600000;
      return s;
    }, 0);
    const assignedProjects = (app.teamSchedule || [])
      .filter(cs => cs.employeeId === user.id || (cs.team || []).includes(user.id))
      .map(cs => app.projects.find(p => p.id === cs.projectId)?.name)
      .filter(Boolean);
    return { certs, totalHours, recentEntries, assignedProjects: [...new Set(assignedProjects)] };
  };

  return (
    <div className="mt-16">
      <div className="flex-between">
        <div className="section-title">Team Members ({users.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add User</button>
      </div>

      {/* KPI row */}
      <div className="flex gap-8 mt-16">
        <div className="kpi-card"><span className="text2">Active</span><strong className="text-green">{activeCount}</strong></div>
        <div className="kpi-card"><span className="text2">Inactive</span><strong style={{ color: inactiveCount > 0 ? "var(--red)" : "var(--text2)" }}>{inactiveCount}</strong></div>
        <div className="kpi-card"><span className="text2">Roles</span><strong>{Object.keys(roleCounts).length}</strong></div>
        <div className="kpi-card"><span className="text2">Temp Passwords</span><strong className="text-amber">{users.filter(u => u.mustChangePassword).length}</strong></div>
      </div>

      {/* Filters */}
      <div className="flex gap-8 mt-16">
        <input className="form-input min-w-150" placeholder="Search by name or email..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        <select className="form-select min-w-150" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v} ({roleCounts[k] || 0})</option>)}
        </select>
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
            <div className="form-group">
              <label className="form-label">Hourly Rate</label>
              <input className="form-input" type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })} placeholder="35" />
            </div>
          </div>
          <div className="mt-16 flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={addUser}>Create User</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div className="more-temp-hint">
            Temp password will be: [FirstName]123! — user will be prompted to change on first login.
          </div>
        </div>
      )}

      <div className="mt-16">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isExpanded = expandedId === u.id;
              const details = isExpanded ? getUserDetails(u) : null;
              return (
                <Fragment key={u.id}>
                <tr style={{ opacity: u.active === false ? 0.5 : 1 }}>
                  <td>
                    <button className="btn btn-ghost btn-table-save" onClick={() => setExpandedId(isExpanded ? null : u.id)}>
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </td>
                  <td className="fw-500">
                    {u.name}
                    {u.id === app.auth.id && <span className="fs-10 text-amber ml-4">(you)</span>}
                    {u.mustChangePassword && <span className="fs-10 text-red ml-4">temp pw</span>}
                  </td>
                  <td className="fs-12">{u.email}</td>
                  <td>
                    {editId === u.id ? (
                      <div className="flex-center-gap-4">
                        <select className="form-select more-edit-select" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          {Object.entries(ROLES_IMPORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button className="btn btn-primary btn-table-edit" onClick={() => updateRole(u.id)}>Save</button>
                        <button className="btn btn-ghost btn-table-save" onClick={() => setEditId(null)}>{"\u2715"}</button>
                      </div>
                    ) : (
                      <span className="badge badge-blue" style={{ cursor: "pointer", fontSize: "var(--text-xs)" }}
                        onClick={() => { setEditId(u.id); setEditRole(u.role); }} title="Click to change role">
                        {ROLES_IMPORT[u.role] || u.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.active === false ? "badge-red" : "badge-green"} fs-10 more-cursor-pointer`}
                      onClick={() => toggleActive(u)} title="Click to toggle">
                      {u.active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="more-edit-actions">
                      <button className="btn btn-ghost btn-table-edit--amber"
                        onClick={() => resetPassword(u)} title="Reset to temp password">Reset PW</button>
                      {u.id !== app.auth.id && (
                        <button className="btn btn-ghost btn-table-edit--red"
                          onClick={() => deleteUser(u)}>Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && details && (
                  <tr>
                    <td colSpan={6} className="px-12 py-8 bg-bg3">
                      <div className="more-grid-3">
                        <div>
                          <div className="text-xs text-muted fw-600 mb-6">Certifications</div>
                          {details.certs.length === 0 ? <div className="text-xs text-muted">None on file</div> : (
                            details.certs.map(c => {
                              const expired = c.expiryDate && new Date(c.expiryDate) < new Date();
                              return (
                                <div key={c.id} className="fs-11 mb-3">
                                  <span className={`badge ${expired ? "badge-red" : "badge-green"} fs-9`}>{c.name}</span>
                                  {c.expiryDate && <span className="text-xs text-muted ml-4">exp {c.expiryDate}</span>}
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted fw-600 mb-6">Time Summary</div>
                          <div className="btn-table-action">Total hours logged: <strong>{details.totalHours.toFixed(1)}h</strong></div>
                          <div className="fs-11 mt-2">Rate: <strong>${u.hourlyRate || 35}/hr</strong></div>
                          <div className="fs-11 mt-2 text-muted">Created: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted fw-600 mb-6">Assigned Projects</div>
                          {details.assignedProjects.length === 0 ? <div className="text-xs text-muted">None currently</div> : (
                            details.assignedProjects.map((p, i) => (
                              <div key={i} className="badge badge-blue fs-9 mb-2">{p}</div>
                            ))
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
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
      <div className="card mt-16 flex-center-gap-12">
        {form.logoUrl && <img src={form.logoUrl} alt="Logo" style={{ maxHeight: 64, maxWidth: 200, borderRadius: "var(--radius-control)", objectFit: "contain" }} />}
        <div>
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result }));
            reader.readAsDataURL(file);
          }} />
          <div className="text-xs text-muted mt-4">PNG or JPG recommended. Stored locally.</div>
          {form.logoUrl && <button className="btn btn-ghost btn-sm mt-8 text-red fs-11" onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}>Remove Logo</button>}
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
              <label className="form-label flex-center-gap-8">
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
            {app.assemblies.length === 0 && <tr><td colSpan={7} className="more-text-center">No assemblies</td></tr>}
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
        <div className="flex-col gap-16">
          <div>
            <strong>Export Data</strong>
            <p className="text2 mt-4 mb-8">Download all app data as a JSON backup file.</p>
            <button className="btn btn-primary btn-sm" onClick={doExport}>Export JSON</button>
          </div>
          <div className="border-top pt-16">
            <strong>Import Data</strong>
            <p className="text2 mt-4 mb-8">Restore data from a previously exported JSON file.</p>
            <input type="file" accept=".json" onChange={doImport} className="fs-13" />
          </div>
          <div className="border-top pt-16">
            <strong>Feature Guides</strong>
            <p className="text2 mt-4 mb-8">Re-enable step-by-step guides for all sections. Guides will auto-trigger on your next visit to each section.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => { resetAllGuides(); app.show("Guides reset — they will show on next visit to each section", "ok"); }}>Reset All Guides</button>
          </div>
          <div className="border-top pt-16">
            <strong>Reset All Data</strong>
            <p className="text2 mt-4 mb-8">Clear all data and restore factory defaults. This cannot be undone.</p>
            <button className="btn btn-danger btn-sm" onClick={doReset}>Reset to Defaults</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── QuickBooks Desktop Mapping ──────────────────────────────── */
function QuickBooksTab({ app }) {
  const QB_STORAGE = "ebc_qb_name_map";
  // Migrate from old key if needed
  const [mappings, setMappings] = useState(() => {
    try {
      const fresh = localStorage.getItem(QB_STORAGE);
      if (fresh) return JSON.parse(fresh);
      // migrate legacy key
      const legacy = localStorage.getItem("ebc_qb_mappings");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(QB_STORAGE, legacy);
        return parsed;
      }
      return {};
    } catch { return {}; }
  });

  const save = (updated) => {
    setMappings(updated);
    localStorage.setItem(QB_STORAGE, JSON.stringify(updated));
    // Keep legacy key in sync for qbExport.js compatibility
    localStorage.setItem("ebc_qb_mappings", JSON.stringify(updated));
  };

  const updateMapping = (type, name, value) => {
    const trimmed = value.trim();
    const section = { ...(mappings[type] || {}) };
    if (trimmed) { section[name] = trimmed; } else { delete section[name]; }
    save({ ...mappings, [type]: section });
  };

  // Pre-populate employees from app.employees (the full roster), plus any from time entries
  const employeeNames = [...new Set([
    ...(app.employees || []).filter(e => e.active !== false).map(e => e.name),
    ...(app.timeEntries || []).map(e => e.employeeName),
  ].filter(Boolean))].sort();

  const projectNames = [...new Set([
    ...(app.projects || []).map(p => p.name),
    ...(app.timeEntries || []).map(e => e.projectName),
  ].filter(Boolean))].sort();

  const empMap = mappings.employees || {};
  const jobMap = mappings.jobs || {};
  const empMappedCount = employeeNames.filter(n => empMap[n]).length;
  const jobMappedCount = projectNames.filter(n => jobMap[n]).length;

  // Status indicator
  const StatusDot = ({ mapped }) => (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: mapped ? "var(--green)" : "var(--yellow)",
      boxShadow: mapped ? "0 0 6px var(--green)" : "0 0 6px var(--yellow)",
    }} title={mapped ? "Mapped" : "Unmapped — will use EBC name as-is"} />
  );

  const MappingRow = ({ type, name }) => {
    const mapped = (mappings[type] || {})[name];
    return (
      <tr>
        <td className="px-12 py-6 fs-13 ws-nowrap">
          <div className="flex-center-gap-8">
            <StatusDot mapped={!!mapped} />
            {name}
          </div>
        </td>
        <td className="px-12 py-6 fs-13">
          <input
            className="form-input"
            style={{ fontSize: "var(--text-label)", padding: "var(--space-1) var(--space-2)", width: "100%", maxWidth: 300, background: mapped ? "var(--bg3)" : "var(--bg2)" }}
            value={mapped || ""}
            placeholder={name}
            onChange={e => updateMapping(type, name, e.target.value)}
          />
        </td>
      </tr>
    );
  };

  // Test export handler
  const handleTestExport = () => {
    import("../utils/qbExport.js").then(({ generateTimeIIF, downloadIIF }) => {
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const sampleEntries = [
        {
          employeeName: employeeNames[0] || "Sample Employee",
          projectName: projectNames[0] || "Sample Project",
          clockIn: new Date(yesterday.setHours(7, 0, 0)).toISOString(),
          clockOut: new Date(yesterday.setHours(15, 30, 0)).toISOString(),
          notes: "Test entry — verify names match QB Desktop"
        },
        {
          employeeName: employeeNames[1] || employeeNames[0] || "Sample Employee 2",
          projectName: projectNames[0] || "Sample Project",
          clockIn: new Date(yesterday.setHours(7, 0, 0)).toISOString(),
          clockOut: new Date(yesterday.setHours(14, 0, 0)).toISOString(),
          notes: "Test entry 2"
        }
      ];
      const iif = generateTimeIIF(sampleEntries, {
        serviceItem: mappings.serviceItem || "Drywall Labor",
        payrollItem: mappings.payrollItem || "Hourly Rate",
      });
      downloadIIF(iif, `EBC_QB_TEST_${now.toISOString().slice(0, 10)}.iif`);
      app.show("Test IIF downloaded — import into QB Desktop to verify format", "ok");
    });
  };

  return (
    <div className="mt-16">
      <div className="section-title">QuickBooks Desktop Integration</div>

      {/* Instructions Panel */}
      <div className="card" style={{ borderLeft: "3px solid var(--blue)" }}>
        <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-secondary)", marginBottom: "var(--space-2)", color: "var(--text)" }}>How It Works</div>
        <ol style={{ fontSize: "var(--text-label)", color: "var(--text2)", lineHeight: 1.8, paddingLeft: "var(--space-5)", margin: "0" }}>
          <li>Map EBC-OS employee and project names to their <strong>exact</strong> QuickBooks Desktop names below.</li>
          <li>Export IIF files from <strong>Time Clock Admin</strong> (payroll) or <strong>Financials &gt; Invoices</strong>.</li>
          <li>Transfer the <code>.iif</code> file to Anna's computer.</li>
          <li>In QB Desktop: <em>File &gt; Utilities &gt; Import &gt; IIF Files</em> and select the file.</li>
        </ol>
        <div style={{ marginTop: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--amber-dim)", fontSize: "var(--text-label)", color: "var(--amber)" }}>
          QB imports fail silently if names don't match exactly (case-sensitive). Use the Test Export button below to verify.
        </div>
      </div>

      {/* Employee Mappings */}
      <div className="card mt-16">
        <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-secondary)", marginBottom: "var(--space-1)", color: "var(--text)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          Employee Name Mapping
          <span style={{ fontWeight: "var(--weight-normal)", fontSize: "var(--text-label)", color: empMappedCount === employeeNames.length && employeeNames.length > 0 ? "var(--green)" : "var(--text2)" }}>
            {empMappedCount}/{employeeNames.length} mapped
          </span>
        </div>
        <p style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginBottom: "var(--space-3)" }}>
          Leave blank if the EBC name matches QB exactly. Only fill in names that differ.
        </p>
        {employeeNames.length === 0 ? (
          <p style={{ fontSize: "var(--text-label)", color: "var(--text2)", fontStyle: "italic" }}>No employees found. Add employees in the team roster.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table" style={{ width: "100%" }}>
              <thead><tr>
                <th style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", textAlign: "left" }}>EBC-OS Name</th>
                <th style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", textAlign: "left" }}>QB Desktop Name</th>
              </tr></thead>
              <tbody>
                {employeeNames.map(name => <MappingRow key={name} type="employees" name={name} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project/Job Mappings */}
      <div className="card mt-16">
        <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-secondary)", marginBottom: "var(--space-1)", color: "var(--text)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          Project / Job Mapping
          <span style={{ fontWeight: "var(--weight-normal)", fontSize: "var(--text-label)", color: jobMappedCount === projectNames.length && projectNames.length > 0 ? "var(--green)" : "var(--text2)" }}>
            {jobMappedCount}/{projectNames.length} mapped
          </span>
        </div>
        <p style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginBottom: "var(--space-3)" }}>
          Use the QB <code>Customer:Job</code> format (e.g. "Satterfield Properties:Memorial Heights Ph2").
        </p>
        {projectNames.length === 0 ? (
          <p style={{ fontSize: "var(--text-label)", color: "var(--text2)", fontStyle: "italic" }}>No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table" style={{ width: "100%" }}>
              <thead><tr>
                <th style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", textAlign: "left" }}>EBC-OS Name</th>
                <th style={{ padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", textAlign: "left" }}>QB Desktop Name (Customer:Job)</th>
              </tr></thead>
              <tbody>
                {projectNames.map(name => <MappingRow key={name} type="jobs" name={name} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QB Export Defaults */}
      <div className="card mt-16">
        <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-secondary)", marginBottom: "var(--space-2)", color: "var(--text)" }}>QB Export Defaults</div>
        <p style={{ fontSize: "var(--text-label)", color: "var(--text2)", marginBottom: "var(--space-3)" }}>Default service and payroll item names used when generating IIF exports.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
          <div>
            <label style={{ fontSize: "var(--text-label)", color: "var(--text2)", display: "block", marginBottom: "var(--space-1)" }}>Payroll Item Name</label>
            <input className="form-input" style={{ fontSize: "var(--text-label)", padding: "var(--space-1) var(--space-2)", width: "100%" }}
              value={mappings.payrollItem || ""}
              placeholder="Hourly Rate"
              onChange={e => save({ ...mappings, payrollItem: e.target.value || undefined })} />
          </div>
          <div>
            <label style={{ fontSize: "var(--text-label)", color: "var(--text2)", display: "block", marginBottom: "var(--space-1)" }}>Service Item (Invoices)</label>
            <input className="form-input" style={{ fontSize: "var(--text-label)", padding: "var(--space-1) var(--space-2)", width: "100%" }}
              value={mappings.serviceItem || ""}
              placeholder="Drywall Labor"
              onChange={e => save({ ...mappings, serviceItem: e.target.value || undefined })} />
          </div>
          <div>
            <label style={{ fontSize: "var(--text-label)", color: "var(--text2)", display: "block", marginBottom: "var(--space-1)" }}>Income Account</label>
            <input className="form-input" style={{ fontSize: "var(--text-label)", padding: "var(--space-1) var(--space-2)", width: "100%" }}
              value={mappings.incomeAccount || ""}
              placeholder="Construction Income"
              onChange={e => save({ ...mappings, incomeAccount: e.target.value || undefined })} />
          </div>
          <div>
            <label style={{ fontSize: "var(--text-label)", color: "var(--text2)", display: "block", marginBottom: "var(--space-1)" }}>A/R Account</label>
            <input className="form-input" style={{ fontSize: "var(--text-label)", padding: "var(--space-1) var(--space-2)", width: "100%" }}
              value={mappings.arAccount || ""}
              placeholder="Accounts Receivable"
              onChange={e => save({ ...mappings, arAccount: e.target.value || undefined })} />
          </div>
        </div>
      </div>

      {/* Test Export */}
      <div className="card mt-16" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-secondary)", color: "var(--text)" }}>Test Export</div>
          <div style={{ fontSize: "var(--text-label)", color: "var(--text2)", maxWidth: 480 }}>
            Generate a sample IIF file with dummy time entries to verify the format imports correctly into QB Desktop.
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleTestExport}>
          Download Test IIF
        </button>
      </div>

      {/* Reset */}
      <div className="card mt-16 flex-between">
        <div>
          <div style={{ fontWeight: "var(--weight-semi)", fontSize: "var(--text-label)", color: "var(--text)" }}>Reset All Mappings</div>
          <div className="more-account-email">Clear all QB name mappings and defaults. Start fresh.</div>
        </div>
        <button className="btn btn-ghost btn-sm more-btn-logout"
          onClick={() => { if (confirm("Reset all QB mappings and defaults?")) { save({}); app.show("QB mappings cleared"); } }}>
          Reset
        </button>
      </div>
    </div>
  );
}

/* ── Theme Picker ────────────────────────────────────────────── */
function ThemeTab({ app }) {
  return (
    <div className="mt-16">
      <div className="section-title">Theme</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
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
                padding: "var(--space-6)",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>{
                theme.icon === "building-2" ? <Building2 size={32} /> :
                theme.icon === "moon" ? <Moon size={32} /> :
                theme.icon === "sun" ? <Sun size={32} /> :
                <span style={{ fontSize: "var(--text-stat)" }}>{theme.icon}</span>
              }</div>
              <div style={{ marginTop: "var(--space-2)", fontWeight: "var(--weight-semi)" }}>{theme.name}</div>
              {isActive && <div className="badge-green mt-8">Active</div>}
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
        <div className="flex gap-8 mt-16 items-center">
          <button className="btn btn-primary btn-sm" onClick={saveKey}>Save Key</button>
          <button className="btn btn-ghost btn-sm" onClick={testConnection} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {key && <button className="btn btn-ghost btn-sm text-red" onClick={() => { setKey(""); app.setApiKey(""); app.show("API key cleared"); }}>Clear Key</button>}
          {status === "ok" && <span className="badge badge-green">Connected</span>}
          {status === "err" && <span className="badge badge-red">Failed</span>}
          {app.apiKey && !status && <span className="text-xs text-muted">Key set: sk-ant-...{app.apiKey.slice(-4)}</span>}
        </div>
      </div>

      <div className="section-title mt-16">Features</div>
      <div className="card mt-16">
        <div className="fs-13">
          <div style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
            <strong>Gmail Bid Sync</strong> — Analyze emails for bid information and auto-populate bid tracker
          </div>
          <div style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)" }}>
            <strong>AI Appreciation Emails</strong> — Draft thank-you emails based on project performance tiers
          </div>
          <div className="py-8">
            <strong>Bid Analysis</strong> — Get AI insights on bid patterns and win rate optimization
          </div>
        </div>
      </div>
    </div>
  );
}
