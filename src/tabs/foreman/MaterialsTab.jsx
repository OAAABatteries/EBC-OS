import { Package } from "lucide-react";
import { PhotoCapture } from "../../components/field";

export function MaterialsTab({
  projectMatRequests, selectedProjectId, projects,
  matForm, setMatForm, matPhotos, setMatPhotos,
  handleMatSubmit, handleForemanConfirm, t,
}) {
  return (
    <div className="emp-content">
      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("Request Material")}</div>
      </div>
      <div className="card foreman-form-card">
        <div className="foreman-form-stack">
          <div>
            <label className="foreman-form-label">{t("Material")}</label>
            <input type="text" className="login-input" placeholder='e.g., 5/8" Type X GWB'
              value={matForm.material} onChange={e => setMatForm(f => ({ ...f, material: e.target.value }))} />
          </div>
          <div className="foreman-form-row">
            <div className="frm-flex-1">
              <label className="foreman-form-label">{t("Quantity")}</label>
              <input type="number" className="login-input" min="1"
                value={matForm.qty} onChange={e => setMatForm(f => ({ ...f, qty: e.target.value }))} />
            </div>
            <div>
              <label className="foreman-form-label">{t("Unit")}</label>
              <select className="settings-select" value={matForm.unit} onChange={e => setMatForm(f => ({ ...f, unit: e.target.value }))}>
                {["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT"].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="foreman-form-label">{t("Notes")}</label>
            <textarea className="login-input frm-resize-v" rows={2} style={{ minHeight: 60 }}
              value={matForm.notes} onChange={e => setMatForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="frm-flex-row">
            <div className="frm-flex-1">
              <label className="foreman-form-label">{t("Priority")}</label>
              <select className="settings-select" value={matForm.urgency} onChange={e => setMatForm(f => ({ ...f, urgency: e.target.value }))}>
                <option value="normal">{t("Normal")}</option>
                <option value="urgent">{"\u26A1"} {t("Urgent")}</option>
                <option value="emergency">{"\uD83D\uDEA8"} {t("Emergency")}</option>
              </select>
            </div>
            <div className="frm-flex-1">
              <label className="foreman-form-label">{t("Needed By")}</label>
              <input type="date" className="login-input" value={matForm.neededBy} onChange={e => setMatForm(f => ({ ...f, neededBy: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: "var(--space-2)" }}>
            <PhotoCapture photos={matPhotos} setPhotos={setMatPhotos} label={t("Attach Photo")} max={3} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleMatSubmit}>{t("Submit Request")}</button>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title frm-font-14">{t("Material Requests")}</div>
      </div>
      {projectMatRequests.length === 0 ? (
        <div className="empty-state" style={{ padding: "var(--space-5)" }}>
          <div className="empty-icon"><Package size={32} /></div>
          <div className="empty-text">{t("No material requests yet")}</div>
        </div>
      ) : (
        <div className="frm-flex-col-8">
          {projectMatRequests.map(req => (
            <div key={req.id} className="mat-request-card" style={{ borderLeft: req.urgency === "emergency" ? "3px solid var(--red)" : req.urgency === "urgent" ? "3px solid var(--amber)" : undefined }}>
              <div className="flex-between mb-4">
                <span className="text-sm font-semi">
                  {req.urgency === "emergency" ? "\uD83D\uDEA8 " : req.urgency === "urgent" ? "\u26A1 " : ""}{req.material}
                </span>
                <span className={`badge mat-status-${req.status}`}>
                  {req.status === "on_order" ? t("On Order") : req.status === "supplier_confirmed" ? t("Supplier OK") :
                   req.status === "assigned" ? t("Assigned") : req.status === "picked_up" ? t("Picked Up") :
                   req.status === "confirmed" ? t("Confirmed") :
                   t(req.status.charAt(0).toUpperCase() + req.status.slice(1))}
                </span>
              </div>
              <div className="text-xs text-muted mb-4">
                {req.qty} {req.unit} · {t("Requester")}: {req.employeeName}
                {req.neededBy && <span> · {t("Need by")} {req.neededBy}</span>}
                {req.fulfillmentType && <span> · {req.fulfillmentType === "supplier" ? "\uD83D\uDCE6" : "\uD83D\uDE9B"}</span>}
              </div>
              {req.notes && <div className="text-xs text-dim mb-4">{req.notes}</div>}
              {(req.photoUrl || req.photos?.length > 0) && (
                <div className="frm-photo-thumb-row" style={{ marginBottom: "var(--space-2)" }}>
                  {(req.photos || []).slice(0, 3).map((ph, i) => (
                    <img key={i} src={ph.data || ph} alt="" style={{ width: 40, height: 40, borderRadius: "var(--radius-control)", objectFit: "cover" }} />
                  ))}
                  {!req.photos?.length && req.photoUrl && (
                    <img src={req.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "var(--radius-control)", objectFit: "cover" }} />
                  )}
                </div>
              )}
              {/* Shortage / damage report alert */}
              {req.shortageReport && (
                <div style={{ padding: "var(--space-2) var(--space-3)", background: "var(--red-dim, rgba(239,68,68,0.08))", borderRadius: "var(--radius-control)", borderLeft: "3px solid var(--red)", marginBottom: "var(--space-2)" }}>
                  <div className="text-xs font-semi" style={{ color: "var(--red)" }}>{"\u26A0"} {req.shortageReport.type || t("Shortage Report")}</div>
                  {req.shortageReport.description && <div className="text-xs text-muted">{req.shortageReport.description}</div>}
                  {req.shortageReport.expectedQty != null && <div className="text-xs text-dim">Expected: {req.shortageReport.expectedQty} · Received: {req.shortageReport.receivedQty}</div>}
                </div>
              )}
              {/* Confirm receipt when delivered */}
              {req.status === "delivered" && !req.confirmedBy && (
                <div className="frm-flex-row">
                  <button className="btn btn-primary btn-sm" style={{ background: "var(--green)", boxShadow: "0 2px 8px var(--green-dim)" }}
                    onClick={() => handleForemanConfirm(req.id, "")}>
                    {"\u2713"} {t("Confirm Receipt")}
                  </button>
                  <button className="btn btn-ghost btn-sm frm-amber"
                    onClick={() => { const exc = prompt(t("Describe issue") + ":"); if (exc) handleForemanConfirm(req.id, exc); }}>
                    {"\u26A0"} {t("Issue")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
