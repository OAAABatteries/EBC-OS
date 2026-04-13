import { useState, Fragment } from "react";
import { SubTabs } from "./moreShared";
import { storePdf, getPdfUrl, deletePdf, fmtSize } from "../../hooks/useSubmittalPdf";
import { ASSEMBLIES } from "../../data/constants";

/* ══════════════════════════════════════════════════════════════
   DOCUMENTS — RFIs & Submittals
   ══════════════════════════════════════════════════════════════ */
export function Documents({ app }) {
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
      const { draftRfiResponse } = await import("../../utils/api.js");
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
      const { reviewSubmittal } = await import("../../utils/api.js");
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
                            <div key={i} className="border-b fs-label" style={{ padding: "var(--space-1) 0" }}>{r}</div>
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
