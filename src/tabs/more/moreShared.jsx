// ═══════════════════════════════════════════════════════════════
//  EBC-OS · MoreTabs Shared Utilities
//  Extracted Sprint 9.1 — shared across all More sub-tabs
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";

// ── Audit trail helper ──
export function addAudit(item, field, oldVal, newVal, user) {
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

// ── Shared attachments input for Invoice / AP Bill / CO forms ──
export function AttachmentsInput({ app, form, setForm }) {
  const attachments = form.attachments || [];
  const [viewing, setViewing] = useState(null);
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
            <span key={i} className="more-attach-pill" style={{ cursor: "pointer" }} onClick={() => setViewing(a)} title="Click to view">
              📎 {a.name} ({Math.round((a.size || 0) / 1024)}KB)
              <span className="more-attach-remove" onClick={(e) => { e.stopPropagation(); setForm({ ...form, attachments: attachments.filter((_, j) => j !== i) }); }}>✕</span>
            </span>
          ))}
        </div>
      )}
      {viewing && <DocViewer doc={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

// ── In-app document viewer — PDFs, images, text. No external viewer required. ──
export function DocViewer({ doc, onClose }) {
  if (!doc) return null;
  const type = (doc.type || "").toLowerCase();
  const isPDF = type.includes("pdf") || (doc.name || "").toLowerCase().endsWith(".pdf");
  const isImage = type.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(doc.name || "");
  const isText = type.startsWith("text/") || /\.(txt|md|csv|json|log)$/i.test(doc.name || "");
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: "90vw", maxHeight: "90vh", width: 1100, height: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{doc.name}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" title="Open in new window" onClick={() => {
              // Open data URL directly in a new tab — browser renders PDF/image natively
              const w = window.open();
              if (w) {
                if (doc.name?.toLowerCase().endsWith(".pdf") || (doc.type || "").includes("pdf")) {
                  w.document.write(`<!DOCTYPE html><html><head><title>${doc.name}</title></head><body style="margin:0"><iframe src="${doc.dataUrl}" style="width:100vw;height:100vh;border:none" /></body></html>`);
                } else if ((doc.type || "").startsWith("image/")) {
                  w.document.write(`<!DOCTYPE html><html><head><title>${doc.name}</title></head><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${doc.dataUrl}" style="max-width:100vw;max-height:100vh;object-fit:contain" /></body></html>`);
                } else {
                  w.location.href = doc.dataUrl;
                }
              }
            }}>↗ Pop Out</button>
            <a className="btn btn-ghost btn-sm" href={doc.dataUrl} download={doc.name}>Download</a>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "var(--bg1)", padding: 0 }}>
          {isPDF && <iframe src={doc.dataUrl} title={doc.name} style={{ width: "100%", height: "100%", border: "none" }} />}
          {isImage && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 16, height: "100%" }}><img src={doc.dataUrl} alt={doc.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /></div>}
          {isText && <pre style={{ padding: 16, whiteSpace: "pre-wrap", fontSize: "var(--text-label)", color: "var(--text)" }}>{(() => { try { return atob(String(doc.dataUrl).split(",")[1] || ""); } catch { return "Cannot decode content"; } })()}</pre>}
          {!isPDF && !isImage && !isText && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <p className="text-dim">Preview not available for this file type ({doc.type || "unknown"}).</p>
              <a className="btn btn-primary mt-8" href={doc.dataUrl} download={doc.name}>Download to view</a>
            </div>
          )}
        </div>
        <div style={{ padding: 8, fontSize: "var(--text-xs)", color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
          {doc.size ? `${Math.round(doc.size / 1024)} KB · ` : ""}{doc.type || "unknown"}{doc.uploadedAt ? ` · uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}{doc.uploadedBy ? ` by ${doc.uploadedBy}` : ""}
        </div>
      </div>
    </div>
  );
}

// ── Audit history display ──
export function AuditHistory({ audit }) {
  if (!audit || audit.length === 0) return null;
  return (
    <div className="mt-8 p-8 fs-10 rounded-control bg-bg3">
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

// ── Sub-tab bar ──
export function SubTabs({ tabs, active, onChange }) {
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
