import { useState, useMemo } from "react";
import { MAT_CATS, MAT_CLR, ASM_TYPES } from "../data/materials";

// ═══════════════════════════════════════════════════════════════
//  Materials & Assembly Editor Tab
// ═══════════════════════════════════════════════════════════════

const VIEWS = ["Material Library", "Assembly Editor", "Assembly List"];

export function MaterialsTab({ app }) {
  const { materials, setMaterials, customAssemblies, setCustomAssemblies, show, fmt, submittals } = app;
  const [optResult, setOptResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);
  const [showOpt, setShowOpt] = useState(false);

  const runOptimize = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setOptLoading(true);
    setOptResult(null);
    setShowOpt(true);
    try {
      const { optimizeMaterialCosts } = await import("../utils/api.js");
      const matData = materials.slice(0, 30).map(m => ({ name: m.name, category: m.category, unit: m.unit, unitCost: m.unitCost, note: m.note }));
      const projData = (app.projects || []).map(p => ({ name: p.name || p.project, phase: p.phase, scope: p.scope, value: p.value }));
      const asmData = (app.assemblies || []).slice(0, 20).map(a => ({ code: a.code, name: a.name, matRate: a.matRate, labRate: a.labRate }));
      const result = await optimizeMaterialCosts(app.apiKey, matData, projData, asmData);
      setOptResult(result);
      show("Material optimization complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setOptLoading(false);
    }
  };

  // Helper: find submittals linked to a given material id
  const getSubmittalsForMat = (matId) =>
    (submittals || []).filter(s => (s.linkedMaterialIds || []).includes(matId));
  const [view, setView] = useState("Material Library");
  const [catFilter, setCatFilter] = useState("All");
  const [matSearch, setMatSearch] = useState("");
  const [editMat, setEditMat] = useState(null);
  const [editAsm, setEditAsm] = useState(null);

  // ── Filtered Materials ──
  const filtered = useMemo(() => {
    let list = materials;
    if (catFilter !== "All") list = list.filter(m => m.category === catFilter);
    if (matSearch) {
      const q = matSearch.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || (m.note || "").toLowerCase().includes(q));
    }
    return list;
  }, [materials, catFilter, matSearch]);

  // ── Material CRUD ──
  const saveMaterial = (mat) => {
    if (!mat.name) { show("Material name required", "err"); return; }
    if (mat.id) {
      setMaterials(prev => prev.map(m => m.id === mat.id ? mat : m));
      show("Material updated");
    } else {
      setMaterials(prev => [...prev, { ...mat, id: "m_" + Date.now() }]);
      show("Material added");
    }
    setEditMat(null);
  };

  const deleteMaterial = (id) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    show("Material deleted");
    setEditMat(null);
  };

  // ── Assembly CRUD ──
  const saveAssembly = (asm) => {
    if (!asm.name) { show("Assembly name required", "err"); return; }
    if (asm.id) {
      setCustomAssemblies(prev => prev.map(a => a.id === asm.id ? asm : a));
      show("Assembly updated");
    } else {
      setCustomAssemblies(prev => [...prev, { ...asm, id: "asm_" + Date.now() }]);
      show("Assembly created");
    }
    setEditAsm(null);
  };

  const deleteAssembly = (id) => {
    setCustomAssemblies(prev => prev.filter(a => a.id !== id));
    show("Assembly deleted");
    setEditAsm(null);
  };

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: MATERIAL LIBRARY
  // ═══════════════════════════════════════════════════════════════
  const renderLibrary = () => (
    <div>
      <div className="flex gap-8 mb-16 flex-wrap" style={{ alignItems: "center" }}>
        <div className="search-wrap" style={{ flex: "1 1 200px" }}>
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Search materials..." value={matSearch} onChange={e => setMatSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setEditMat({ name: "", category: "Framing", unit: "LF", matCost: 0, laborCost: 0, note: "" })}>+ Add Material</button>
      </div>

      <div className="flex gap-4 mb-16 flex-wrap">
        <button className={`btn btn-sm ${catFilter === "All" ? "btn-primary" : "btn-ghost"}`} onClick={() => setCatFilter("All")}>All</button>
        {MAT_CATS.map(c => {
          const clr = MAT_CLR[c] || {};
          return (
            <button
              key={c}
              className={`btn btn-sm ${catFilter === c ? "btn-primary" : "btn-ghost"}`}
              style={catFilter === c ? {} : { borderColor: clr.border, color: clr.color }}
              onClick={() => setCatFilter(c)}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-dim mb-8">{filtered.length} material{filtered.length !== 1 ? "s" : ""}</div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Material</th>
              <th>Unit</th>
              <th style={{ textAlign: "right" }}>Mat $/Unit</th>
              <th style={{ textAlign: "right" }}>Lab $/Unit</th>
              <th style={{ textAlign: "right" }}>Total $/Unit</th>
              <th>Note</th>
              <th>Submittals</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const clr = MAT_CLR[m.category] || {};
              const linkedSubs = getSubmittalsForMat(m.id);
              return (
                <tr key={m.id} className="clickable-row" onClick={() => setEditMat({ ...m })}>
                  <td>
                    <span className="mat-cat-pill" style={{ background: clr.bg, color: clr.color, border: `1px solid ${clr.border}` }}>
                      {m.category}
                    </span>
                  </td>
                  <td className="font-semi">{m.name}</td>
                  <td>{m.unit}</td>
                  <td style={{ textAlign: "right" }} className="font-mono">${m.matCost.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }} className="font-mono">${m.laborCost.toFixed(2)}</td>
                  <td style={{ textAlign: "right" }} className="font-mono text-amber">${(m.matCost + m.laborCost).toFixed(2)}</td>
                  <td className="text-sm text-dim">{m.note}</td>
                  <td>
                    {linkedSubs.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {linkedSubs.map(s => (
                          <span key={s.id} className="sub-linked-badge" title={`${s.desc} (${s.status})`}>
                            {s.number}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-dim">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: ASSEMBLY EDITOR
  // ═══════════════════════════════════════════════════════════════
  const renderEditor = () => {
    if (!editAsm) {
      return (
        <div className="empty-state">
          <div className="empty-icon">🧱</div>
          <div className="empty-text">Select an assembly from the list or create a new one</div>
          <button className="btn btn-primary mt-16" onClick={() => setEditAsm({
            name: "", type: "Wall", layers: [], area: 100, notes: ""
          })}>+ New Assembly</button>
        </div>
      );
    }

    const asm = editAsm;
    const totalMat = asm.layers.reduce((s, l) => s + (l.matCost * l.qty), 0);
    const totalLab = asm.layers.reduce((s, l) => s + (l.laborCost * l.qty), 0);
    const totalCost = totalMat + totalLab;
    const costPerSF = asm.area > 0 ? totalCost / asm.area : 0;

    const updAsm = (field, val) => setEditAsm(a => ({ ...a, [field]: val }));
    const addLayer = (matId) => {
      const mat = materials.find(m => m.id === matId);
      if (!mat) return;
      setEditAsm(a => ({
        ...a,
        layers: [...a.layers, { id: "ly_" + Date.now(), materialId: mat.id, name: mat.name, category: mat.category, unit: mat.unit, matCost: mat.matCost, laborCost: mat.laborCost, qty: a.area || 100 }]
      }));
    };
    const updLayer = (idx, field, val) => {
      setEditAsm(a => ({
        ...a,
        layers: a.layers.map((l, i) => i === idx ? { ...l, [field]: val } : l)
      }));
    };
    const removeLayer = (idx) => {
      setEditAsm(a => ({ ...a, layers: a.layers.filter((_, i) => i !== idx) }));
    };
    const moveLayer = (idx, dir) => {
      setEditAsm(a => {
        const layers = [...a.layers];
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= layers.length) return a;
        [layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]];
        return { ...a, layers };
      });
    };

    return (
      <div>
        <div className="flex gap-8 mb-16">
          <button className="btn btn-ghost" onClick={() => setEditAsm(null)}>Back</button>
          <button className="btn btn-primary" onClick={() => saveAssembly(asm)}>Save Assembly</button>
        </div>

        <div className="form-grid mb-16">
          <div className="form-group">
            <label className="form-label">Assembly Name</label>
            <input className="form-input" value={asm.name} onChange={e => updAsm("name", e.target.value)} placeholder="e.g. Standard Interior Partition" />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={asm.type} onChange={e => updAsm("type", e.target.value)}>
              {ASM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Area (SF)</label>
            <input className="form-input" type="number" value={asm.area} onChange={e => updAsm("area", Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={asm.notes || ""} onChange={e => updAsm("notes", e.target.value)} placeholder="Assembly notes..." />
          </div>
        </div>

        {/* Add Layer */}
        <div className="flex gap-8 mb-16" style={{ alignItems: "end" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Add Material Layer</label>
            <select className="form-select" onChange={e => { if (e.target.value) addLayer(e.target.value); e.target.value = ""; }}>
              <option value="">-- Select Material --</option>
              {MAT_CATS.map(cat => (
                <optgroup key={cat} label={cat}>
                  {materials.filter(m => m.category === cat).map(m => (
                    <option key={m.id} value={m.id}>{m.name} — ${(m.matCost + m.laborCost).toFixed(2)}/{m.unit}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Layers */}
        {asm.layers.length === 0 ? (
          <div className="text-sm text-dim" style={{ padding: "24px 0", textAlign: "center" }}>No layers yet. Add materials above to build the assembly.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Material</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th>Unit</th>
                  <th style={{ textAlign: "right" }}>Mat Cost</th>
                  <th style={{ textAlign: "right" }}>Lab Cost</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {asm.layers.map((l, i) => {
                  const clr = MAT_CLR[l.category] || {};
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className="flex gap-4">
                          <button className="btn-icon" onClick={() => moveLayer(i, -1)} disabled={i === 0}>▲</button>
                          <button className="btn-icon" onClick={() => moveLayer(i, 1)} disabled={i === asm.layers.length - 1}>▼</button>
                        </div>
                      </td>
                      <td className="font-semi">{l.name}</td>
                      <td><span className="mat-cat-pill" style={{ background: clr.bg, color: clr.color, border: `1px solid ${clr.border}` }}>{l.category}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <input className="form-input" type="number" style={{ width: 80, textAlign: "right" }} value={l.qty} onChange={e => updLayer(i, "qty", Number(e.target.value))} />
                      </td>
                      <td>{l.unit}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">${(l.matCost * l.qty).toFixed(0)}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">${(l.laborCost * l.qty).toFixed(0)}</td>
                      <td style={{ textAlign: "right" }} className="font-mono text-amber">${((l.matCost + l.laborCost) * l.qty).toFixed(0)}</td>
                      <td><button className="btn btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => removeLayer(i)}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cost Summary */}
        {asm.layers.length > 0 && (
          <div className="card mt-16">
            <div className="card-header"><div className="card-title font-head">Cost Summary</div></div>
            <div className="flex gap-16 flex-wrap">
              <div><span className="text-dim text-xs">MATERIAL</span><div className="font-mono">{fmt(totalMat)}</div></div>
              <div><span className="text-dim text-xs">LABOR</span><div className="font-mono">{fmt(totalLab)}</div></div>
              <div><span className="text-dim text-xs">TOTAL</span><div className="font-mono text-amber font-bold">{fmt(totalCost)}</div></div>
              <div><span className="text-dim text-xs">COST/SF</span><div className="font-mono">${costPerSF.toFixed(2)}/SF</div></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: ASSEMBLY LIST
  // ═══════════════════════════════════════════════════════════════
  const renderList = () => (
    <div>
      <div className="flex-between mb-16">
        <div className="text-xs text-dim">{customAssemblies.length} custom assembl{customAssemblies.length !== 1 ? "ies" : "y"}</div>
        <button className="btn btn-primary" onClick={() => { setView("Assembly Editor"); setEditAsm({ name: "", type: "Wall", layers: [], area: 100, notes: "" }); }}>+ New Assembly</button>
      </div>

      {customAssemblies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-text">No custom assemblies yet</div>
          <div className="text-sm text-dim mt-8">Build assemblies from your material library</div>
        </div>
      ) : (
        <div className="bid-grid">
          {customAssemblies.map(a => {
            const totalCost = a.layers.reduce((s, l) => s + ((l.matCost + l.laborCost) * l.qty), 0);
            const costPerSF = a.area > 0 ? totalCost / a.area : 0;
            return (
              <div key={a.id} className="bid-card" onClick={() => { setView("Assembly Editor"); setEditAsm({ ...a }); }}>
                <div className="flex-between mb-8">
                  <span className="badge badge-blue">{a.type}</span>
                  <span className="text-xs text-dim">{a.layers.length} layer{a.layers.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="card-title font-head" style={{ fontSize: 15, marginBottom: 4 }}>{a.name}</div>
                {a.notes && <div className="text-sm text-dim mb-8">{a.notes}</div>}
                <div className="flex-between mt-8">
                  <span className="font-mono font-bold text-amber">{fmt(totalCost)}</span>
                  <span className="text-xs text-dim">${costPerSF.toFixed(2)}/SF</span>
                </div>
                <div className="flex gap-4 flex-wrap mt-8">
                  {[...new Set(a.layers.map(l => l.category))].map(c => {
                    const clr = MAT_CLR[c] || {};
                    return <span key={c} className="mat-cat-pill" style={{ background: clr.bg, color: clr.color, border: `1px solid ${clr.border}`, fontSize: 10 }}>{c}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  MATERIAL EDIT MODAL
  // ═══════════════════════════════════════════════════════════════
  const renderMatModal = () => {
    if (!editMat) return null;
    const mat = editMat;
    const isNew = !mat.id;
    const upd = (f, v) => setEditMat(m => ({ ...m, [f]: v }));
    return (
      <div className="modal-overlay" onClick={() => setEditMat(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Material" : "Edit Material"}</div>
            <button className="modal-close" onClick={() => setEditMat(null)}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Material Name</label>
              <input className="form-input" value={mat.name} onChange={e => upd("name", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={mat.category} onChange={e => upd("category", e.target.value)}>
                {MAT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={mat.unit} onChange={e => upd("unit", e.target.value)}>
                {["LF","SF","EA","CY","HR"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Material Cost ($/Unit)</label>
              <input className="form-input" type="number" step="0.01" value={mat.matCost} onChange={e => upd("matCost", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Labor Cost ($/Unit)</label>
              <input className="form-input" type="number" step="0.01" value={mat.laborCost} onChange={e => upd("laborCost", Number(e.target.value))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Note</label>
              <input className="form-input" value={mat.note || ""} onChange={e => upd("note", e.target.value)} />
            </div>
          </div>
          {/* Linked submittals (read-only) */}
          {!isNew && (() => {
            const linked = getSubmittalsForMat(mat.id);
            if (linked.length === 0) return null;
            return (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg3)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div className="form-label" style={{ marginBottom: 6 }}>Linked Submittals</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {linked.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span className="sub-linked-badge">{s.number}</span>
                      <span style={{ color: "var(--text2)" }}>{s.desc}</span>
                      <span className={`badge badge-${s.status === "approved" ? "green" : s.status === "submitted" ? "blue" : "amber"}`} style={{ fontSize: 10 }}>
                        {s.status}
                      </span>
                      {s.pdfName && <span style={{ fontSize: 10, color: "var(--text3)" }}>PDF: {s.pdfName}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="modal-actions">
            {!isNew && <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={() => deleteMaterial(mat.id)}>Delete</button>}
            <button className="btn btn-ghost" onClick={() => setEditMat(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => saveMaterial(mat)}>{isNew ? "Add" : "Save"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title font-head">Materials & Assemblies</div>
          <div className="section-sub">{materials.length} materials, {customAssemblies.length} custom assemblies</div>
        </div>
      </div>

      <div className="flex-between mb-16">
        <div className="flex gap-4">
          {VIEWS.map(v => (
            <button key={v} className={`btn btn-sm ${view === v ? "btn-primary" : "btn-ghost"}`} onClick={() => { setView(v); if (v !== "Assembly Editor") setEditAsm(null); }}>
              {v}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={runOptimize} disabled={optLoading}>
          {optLoading ? "Optimizing..." : "AI Cost Optimizer"}
        </button>
      </div>

      {/* AI Cost Optimizer Panel */}
      {showOpt && (
        <div className="card mb-16">
          <div className="flex-between">
            <div className="card-header"><div className="card-title">AI Material Cost Optimizer</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowOpt(false); setOptResult(null); }}>Close</button>
          </div>
          {optLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing {materials.length} materials across {(app.projects || []).length} projects...</div>}
          {optResult && (
            <div style={{ marginTop: 8 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "var(--bg3)", marginBottom: 12, fontSize: 14 }}>{optResult.summary}</div>

              {/* Savings Opportunities */}
              {optResult.savings?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Savings Opportunities</div>
                  {optResult.savings.map((s, i) => (
                    <div key={i} style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 6, borderLeft: `3px solid ${s.difficulty === "easy" ? "var(--green)" : s.difficulty === "medium" ? "var(--amber)" : "var(--red)"}`, background: "var(--card)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{s.material}</span>
                        <span style={{ color: "var(--green)", fontWeight: 600 }}>{s.estimatedSavings}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{s.suggestedAction}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bulk Opportunities */}
              {optResult.bulkOpportunities?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Bulk Purchase Opportunities</div>
                  {optResult.bulkOpportunities.map((b, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <span className="font-semi">{b.material}</span> — {b.combinedQty} across {(b.projects || []).join(", ")}
                      <div className="text-xs mt-2" style={{ color: "var(--green)" }}>Potential: {b.savingsPotential}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Substitutions */}
              {optResult.substitutions?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Material Substitutions</div>
                  {optResult.substitutions.map((s, i) => (
                    <div key={i} style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 6, background: "var(--card)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span>{s.current} → <span className="font-semi">{s.alternative}</span></span>
                        <span className={s.approval === "spec_compliant" ? "badge-green" : s.approval === "submittal_required" ? "badge-amber" : "badge-red"}>{s.approval}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">{s.benefit}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vendor Strategy */}
              {optResult.vendorStrategy?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Vendor Strategy</div>
                  {optResult.vendorStrategy.map((v, i) => (
                    <div key={i} style={{ padding: "3px 0", fontSize: 13, color: "var(--text2)" }}>• {v}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === "Material Library" && renderLibrary()}
      {view === "Assembly Editor" && renderEditor()}
      {view === "Assembly List" && renderList()}

      {renderMatModal()}
    </div>
  );
}
