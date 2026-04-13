import { FileQuestion } from "lucide-react";

export function DocumentsTab({
  rfis, submittals, changeOrders, selectedProjectId,
  openSections, setOpenSections, setShowRfiModal, setRfiFormData, fmt, t,
}) {
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const projectRFIs = (rfis || []).filter(r => String(r.projectId) === String(selectedProjectId));
  const projectSubmittals = (submittals || []).filter(s => String(s.projectId) === String(selectedProjectId));
  const projectCOs = (changeOrders || []).filter(c => String(c.projectId) === String(selectedProjectId));

  return (
    <div className="emp-content">
      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("Documents")}</div>
        <button className="btn btn-sm frm-new-rfi-btn"
          onClick={() => setShowRfiModal(true)}>
          <FileQuestion size={14} /> {t("New RFI")}
        </button>
      </div>

      {/* My RFIs */}
      <div className="project-section frm-mb-12">
        <div className="project-section-header" onClick={() => toggleSection("myRfis")}>
          <span>{t("My RFIs")} ({projectRFIs.length})</span>
          <span>{openSections.myRfis ? "\u25BE" : "\u25B8"}</span>
        </div>
        {openSections.myRfis && (() => {
          const myRfis = projectRFIs.sort((a, b) => (b.submitted || b.dateSubmitted || "").localeCompare(a.submitted || a.dateSubmitted || ""));
          return myRfis.length === 0
            ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No RFIs submitted")}</div>
            : myRfis.map(r => (
              <div key={r.id} style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--border)", fontSize: "var(--text-label)" }}>
                <div className="frm-flex-between">
                  <span className="font-bold">{r.number}</span>
                  <span className={`badge ${r.status === "open" || r.status === "submitted" ? "badge-amber" : r.status === "Answered" ? "badge-green" : "badge-muted"} frm-font-10`}>{r.status}</span>
                </div>
                <div className="text-muted frm-mt-2">{r.subject}</div>
                {r.response && <div style={{ marginTop: "var(--space-1)", padding: "var(--space-1) var(--space-2)", background: "var(--green-dim, rgba(16,185,129,0.1))", borderRadius: "var(--radius-control)", color: "var(--green)", fontSize: "var(--text-tab)" }}>{t("Answer")}: {r.response}</div>}
                {r.daysOut > 0 && !r.response && <div className="text-dim frm-mt-2">{r.daysOut}d {t("outstanding")}</div>}
              </div>
            ));
        })()}
      </div>

      {/* Submittals */}
      <div className="project-section">
        <div className="project-section-header" onClick={() => toggleSection("submittals")}>
          <span>{t("Submittals")} ({projectSubmittals.length})</span>
          <span>{openSections.submittals ? "\u25BE" : "\u25B8"}</span>
        </div>
        {openSections.submittals && (
          projectSubmittals.length === 0
            ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No submittals")}</div>
            : projectSubmittals.map(s => (
              <div key={s.id} className="card frm-mt-8" style={{ padding: "var(--space-3)" }}>
                <div className="flex-between">
                  <span className="text-sm font-semi">{s.name || s.title}</span>
                  <span className={`badge ${s.status === "approved" ? "badge-green" : "badge-amber"}`}>{s.status}</span>
                </div>
                {s.description && <div className="text-xs text-muted mt-4">{s.description}</div>}
              </div>
            ))
        )}
      </div>

      {/* Change Orders */}
      <div className="project-section">
        <div className="project-section-header" onClick={() => toggleSection("cos")}>
          <span>{t("Change Orders")} ({projectCOs.length})</span>
          <span>{openSections.cos ? "\u25BE" : "\u25B8"}</span>
        </div>
        {openSections.cos && (
          projectCOs.length === 0
            ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No change orders")}</div>
            : projectCOs.map(c => (
              <div key={c.id} className="card frm-mt-8" style={{ padding: "var(--space-3)" }}>
                <div className="flex-between">
                  <span className="text-sm font-semi">{c.title || c.description}</span>
                  <span className="text-sm font-mono frm-amber">{fmt(c.amount)}</span>
                </div>
                <div className="text-xs text-muted mt-4">{c.status}</div>
              </div>
            ))
        )}
      </div>

      {/* RFIs */}
      <div className="project-section">
        <div className="project-section-header frm-flex-between">
          <div className="frm-flex-row-center frm-flex-1" style={{ cursor: "pointer" }} onClick={() => toggleSection("rfis")}>
            <span>{t("RFIs")} ({projectRFIs.length})</span>
            <span>{openSections.rfis ? "\u25BE" : "\u25B8"}</span>
          </div>
          <button
            className="btn btn-sm frm-new-rfi-btn"
            onClick={() => { setShowRfiModal(true); if (setRfiFormData) setRfiFormData({ subject: "", description: "", drawingRef: "" }); }}
          >
            <FileQuestion size={13} />
            {t("Submit RFI")}
          </button>
        </div>
        {openSections.rfis && (
          projectRFIs.length === 0
            ? <div className="text-xs text-muted" style={{ padding: "var(--space-2) 0" }}>{t("No RFIs")}</div>
            : projectRFIs.map(r => (
              <div key={r.id} className="card frm-mt-8" style={{ padding: "var(--space-3)" }}>
                <div className="flex-between">
                  <span className="text-sm font-semi">{r.subject || r.title || r.question}</span>
                  <span className={`badge ${r.status === "answered" ? "badge-green" : r.status === "submitted" ? "badge-blue" : "badge-amber"}`}>{r.status}</span>
                </div>
                {r.drawingRef && <div className="text-xs text-muted mt-4">Ref: {r.drawingRef}</div>}
                {r.response && <div className="text-xs text-muted mt-4">{t("Response")}: {r.response}</div>}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
