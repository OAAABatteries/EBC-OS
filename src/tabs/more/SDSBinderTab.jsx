import { useState } from "react";
import { ClipboardList, Folder, Search, Smartphone } from "lucide-react";
import { SubTabs } from "./moreShared";

/* ══════════════════════════════════════════════════════════════
   SDS BINDER
   ══════════════════════════════════════════════════════════════ */
export function SDSBinder({ app }) {
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
              className="form-input fs-section text-center" style={{ padding: "var(--space-4) var(--space-4)" }}
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
