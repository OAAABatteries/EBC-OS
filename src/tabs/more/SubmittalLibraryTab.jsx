import { useState } from "react";
import { SUBMITTAL_CATEGORIES } from "../../data/constants";

const APPROVAL_BADGE = {
  approved: "badge-green",
  pending: "badge-amber",
  "not submitted": "badge-ghost",
};

const EMPTY_FORM = {
  itemName: "", manufacturer: "", specModel: "", category: "",
  specSection: "", type: "product data", approvalStatus: "not submitted", notes: "",
};

export function SubmittalLibrary({ app }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const library = app.submittalLibrary || [];

  const filtered = library.filter(item => {
    if (catFilter !== "all" && item.category !== catFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return item.itemName.toLowerCase().includes(q)
      || (item.manufacturer || "").toLowerCase().includes(q)
      || (item.specModel || "").toLowerCase().includes(q)
      || (item.specSection || "").toLowerCase().includes(q);
  });

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); };

  const openEdit = (item) => {
    setForm({
      itemName: item.itemName || "",
      manufacturer: item.manufacturer || "",
      specModel: item.specModel || "",
      category: item.category || "",
      specSection: item.specSection || "",
      type: item.type || "product data",
      approvalStatus: item.approvalStatus || "not submitted",
      notes: item.notes || "",
    });
    setEditId(item.id);
    setFormOpen(true);
  };

  const save = () => {
    if (!form.itemName) return app.show("Item name is required", "err");
    if (editId) {
      app.setSubmittalLibrary(prev => prev.map(i => i.id === editId ? { ...i, ...form } : i));
      app.show("Library item updated", "ok");
    } else {
      const newItem = {
        id: "sl-" + crypto.randomUUID().slice(0, 8),
        ...form,
        lastUsedDate: null,
        lastUsedProject: null,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      app.setSubmittalLibrary(prev => [...prev, newItem]);
      app.show("Item added to library", "ok");
    }
    resetForm();
    setFormOpen(false);
  };

  const deleteItem = (id) => {
    app.setSubmittalLibrary(prev => prev.filter(i => i.id !== id));
    app.show("Item removed from library", "ok");
  };

  return (
    <div>
      <div className="flex-between mb-12">
        <div className="section-title">Submittal Library</div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setFormOpen(!formOpen); }}>+ Add Item</button>
      </div>

      {/* Search + Category Filter */}
      <div className="flex gap-8 mb-12 flex-wrap">
        <input
          className="form-input flex-1"
          placeholder="Search by name, manufacturer, spec..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 200, maxWidth: 400 }}
        />
        <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All Categories</option>
          {SUBMITTAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Add/Edit Form */}
      {formOpen && (
        <div className="card mb-16 p-sp4 bg-bg3" style={{ border: "1px solid var(--blue-dim)" }}>
          <div className="flex-between mb-8">
            <span className="font-semi text-sm">{editId ? "Edit Library Item" : "New Library Item"}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Item Name *</label>
              <input className="form-input" placeholder="e.g. Armstrong Cortega 2x2 #704" value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <input className="form-input" placeholder="e.g. Armstrong, USG, Knauf" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec / Model</label>
              <input className="form-input" placeholder='e.g. Firecode X 5/8"' value={form.specModel} onChange={e => setForm(f => ({ ...f, specModel: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Spec Section</label>
              <input className="form-input" placeholder="e.g. 09 21 16" value={form.specSection} onChange={e => setForm(f => ({ ...f, specSection: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select...</option>
                {SUBMITTAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="product data">Product Data</option>
                <option value="sample">Sample</option>
                <option value="shop drawings">Shop Drawings</option>
                <option value="calculations">Calculations</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Approval Status</label>
              <select className="form-select" value={form.approvalStatus} onChange={e => setForm(f => ({ ...f, approvalStatus: e.target.value }))}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="not submitted">Not Submitted</option>
              </select>
            </div>
          </div>
          <div className="form-group mt-8">
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-8 mt-12">
            <button className="btn btn-primary btn-sm" onClick={save}>{editId ? "Update" : "Add"} Item</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Library Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Manufacturer</th>
              <th>Spec / Model</th>
              <th style={{ width: 80 }}>Spec Sec.</th>
              <th style={{ width: 130 }}>Category</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 130 }}>Last Used</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-dim" style={{ padding: "var(--space-6)" }}>
                {search || catFilter !== "all" ? "No items match your search" : "No items in library — click \"+ Add Item\" to start"}
              </td></tr>
            )}
            {filtered.map(item => (
              <tr key={item.id}>
                <td className="font-semi">{item.itemName}</td>
                <td>{item.manufacturer || "\u2014"}</td>
                <td className="text-sm">{item.specModel || "\u2014"}</td>
                <td className="font-mono text-xs">{item.specSection || "\u2014"}</td>
                <td className="text-xs">{item.category || "\u2014"}</td>
                <td><span className={`badge ${APPROVAL_BADGE[item.approvalStatus] || "badge-ghost"} fs-10 capitalize`}>{item.approvalStatus}</span></td>
                <td className="text-xs">{item.lastUsedDate ? `${item.lastUsedDate}` : "\u2014"}</td>
                <td>
                  <div className="flex gap-4">
                    <button className="btn btn-ghost btn-sm fs-10" onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn btn-ghost btn-sm fs-10 text-red" onClick={() => deleteItem(item.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {library.length > 0 && (
        <div className="flex gap-16 mt-12 text-xs text-dim">
          <span>Total: {library.length}</span>
          <span className="text-green">Approved: {library.filter(i => i.approvalStatus === "approved").length}</span>
          <span className="text-amber">Pending: {library.filter(i => i.approvalStatus === "pending").length}</span>
        </div>
      )}
    </div>
  );
}
