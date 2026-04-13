// ═══════════════════════════════════════════════════════════════
//  EBC-OS · MoreTabs Shared Utilities
//  Extracted Sprint 9.1 — shared across all More sub-tabs
// ═══════════════════════════════════════════════════════════════

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
