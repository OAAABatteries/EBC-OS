import { useState, useMemo, useRef, useEffect } from "react";
import { Package } from "lucide-react";
import { PhotoCapture } from "../../components/field";
import { DEFAULT_MATERIALS, MAT_CATS } from "../../data/materials";

export function MaterialsTab({
  projectMatRequests, selectedProjectId, projects,
  matForm, setMatForm, matPhotos, setMatPhotos,
  handleMatSubmit, handleForemanConfirm, t,
}) {
  // 7.3 — Material quick-pick dropdown
  const [matSearch, setMatSearch] = useState("");
  const [showMatPicker, setShowMatPicker] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const pickerRef = useRef(null);

  const filteredMats = useMemo(() => {
    let mats = DEFAULT_MATERIALS;
    if (selectedCat) mats = mats.filter(m => m.category === selectedCat);
    if (matSearch.trim()) {
      const q = matSearch.toLowerCase();
      mats = mats.filter(m => m.name.toLowerCase().includes(q) || m.note?.toLowerCase().includes(q));
    }
    return mats.slice(0, 20);
  }, [matSearch, selectedCat]);

  const recentMats = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("ebc_recent_mats") || "[]").slice(0, 5);
    } catch { return []; }
  }, [showMatPicker]);

  const selectMat = (mat) => {
    setMatForm(f => ({ ...f, material: mat.name, unit: mat.unit || f.unit }));
    setShowMatPicker(false);
    setMatSearch("");
    // Track recent
    try {
      const recent = JSON.parse(localStorage.getItem("ebc_recent_mats") || "[]");
      const updated = [mat.name, ...recent.filter(r => r !== mat.name)].slice(0, 10);
      localStorage.setItem("ebc_recent_mats", JSON.stringify(updated));
    } catch {}
  };

  // Close picker on outside click
  useEffect(() => {
    if (!showMatPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowMatPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMatPicker]);

  return (
    <div className="emp-content">
      <div className="section-header">
        <div className="section-title frm-section-title-md">{t("Request Material")}</div>
      </div>
      <div className="card foreman-form-card">
        <div className="foreman-form-stack">
          <div style={{ position: "relative" }} ref={pickerRef}>
            <label className="foreman-form-label">{t("Material")}</label>
            <input type="text" className="login-input" placeholder='e.g., 5/8" Type X GWB'
              value={matForm.material}
              onChange={e => { setMatForm(f => ({ ...f, material: e.target.value })); setMatSearch(e.target.value); setShowMatPicker(true); }}
              onFocus={() => setShowMatPicker(true)} />
            {showMatPicker && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "var(--bg2)", border: "1px solid var(--border2)",
                borderRadius: "var(--radius-control)", maxHeight: 280, overflowY: "auto",
                boxShadow: "var(--shadow-lg)",
              }}>
                {/* Category pills */}
                <div style={{ display: "flex", gap: "var(--space-1)", padding: "var(--space-2)", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
                  <button style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-pill)",
                    background: !selectedCat ? "var(--amber)" : "var(--bg3)", color: !selectedCat ? "var(--text-on-light)" : "var(--text2)",
                    border: "none", cursor: "pointer" }}
                    onClick={() => setSelectedCat(null)}>{t("All")}</button>
                  {MAT_CATS.map(cat => (
                    <button key={cat} style={{ fontSize: "var(--text-tab)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-pill)",
                      background: selectedCat === cat ? "var(--amber)" : "var(--bg3)", color: selectedCat === cat ? "var(--text-on-light)" : "var(--text2)",
                      border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                      onClick={() => setSelectedCat(selectedCat === cat ? null : cat)}>{cat}</button>
                  ))}
                </div>
                {/* Recent picks */}
                {!matSearch && recentMats.length > 0 && (
                  <div style={{ padding: "var(--space-2)" }}>
                    <div style={{ fontSize: "var(--text-tab)", color: "var(--text3)", marginBottom: "var(--space-1)", textTransform: "uppercase" }}>{t("Recent")}</div>
                    {recentMats.map(name => (
                      <button key={name} onClick={() => { setMatForm(f => ({ ...f, material: name })); setShowMatPicker(false); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "var(--space-2) var(--space-3)",
                          fontSize: "var(--text-label)", color: "var(--text)", background: "none", border: "none", cursor: "pointer",
                          borderRadius: "var(--radius-sm)" }}>
                        {name}
                      </button>
                    ))}
                    <div style={{ borderBottom: "1px solid var(--border)", margin: "var(--space-1) 0" }} />
                  </div>
                )}
                {/* Filtered materials */}
                {filteredMats.map(mat => (
                  <button key={mat.id} onClick={() => selectMat(mat)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left",
                      padding: "var(--space-2) var(--space-3)", fontSize: "var(--text-label)", color: "var(--text)",
                      background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)",
                      gap: "var(--space-2)" }}>
                    <span style={{ flex: 1 }}>{mat.name}</span>
                    <span style={{ fontSize: "var(--text-tab)", color: "var(--text3)", whiteSpace: "nowrap" }}>{mat.unit}</span>
                  </button>
                ))}
                {filteredMats.length === 0 && (
                  <div style={{ padding: "var(--space-3)", fontSize: "var(--text-label)", color: "var(--text3)", textAlign: "center" }}>
                    {t("No matches")} — {t("type to search")}
                  </div>
                )}
              </div>
            )}
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
          <div className="mt-sp2">
            <PhotoCapture photos={matPhotos} setPhotos={setMatPhotos} label={t("Attach Photo")} max={3} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleMatSubmit}>{t("Submit Request")}</button>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title frm-font-14">{t("Material Requests")}</div>
      </div>
      {projectMatRequests.length === 0 ? (
        <div className="empty-state p-sp5">
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
                <div className="frm-photo-thumb-row mb-sp2">
                  {(req.photos || []).slice(0, 3).map((ph, i) => (
                    <img key={i} src={ph.data || ph} alt="" className="rounded-control" style={{ width: 40, height: 40, objectFit: "cover" }} />
                  ))}
                  {!req.photos?.length && req.photoUrl && (
                    <img src={req.photoUrl} alt="" className="rounded-control" style={{ width: 40, height: 40, objectFit: "cover" }} />
                  )}
                </div>
              )}
              {/* Shortage / damage report alert */}
              {req.shortageReport && (
                <div className="rounded-control mb-sp2" style={{ padding: "var(--space-2) var(--space-3)", background: "var(--red-dim, rgba(239,68,68,0.08))", borderLeft: "3px solid var(--red)" }}>
                  <div className="text-xs font-semi c-red">{"\u26A0"} {req.shortageReport.type || t("Shortage Report")}</div>
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
