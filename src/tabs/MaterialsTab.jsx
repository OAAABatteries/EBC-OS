import { useState, useMemo } from "react";
import { Send, RefreshCw, X, ChevronDown, ChevronUp, Package, Search, ClipboardList, Layers, ClipboardCopy } from "lucide-react";
import { MAT_CATS, MAT_CLR, ASM_TYPES } from "../data/materials";
import { useNotifications, getNotificationPrefs } from "../hooks/useNotifications";
import { initSuppliers } from "../data/constants";

// ═══════════════════════════════════════════════════════════════
//  Materials & Assembly Editor Tab
//  + Material Requests (for foremen, employees, drivers)
// ═══════════════════════════════════════════════════════════════

const FULL_VIEWS = ["Material Library", "Assembly Editor", "Assembly List", "Requests"];
const FIELD_VIEWS = ["Requests"];
const UNITS = ["EA", "LF", "SF", "BDL", "BOX", "BKT", "BAG", "GAL", "SHT", "PCS", "ROLL"];
const REQ_STATUS_BADGE = { requested: "badge-amber", approved: "badge-blue", "in-transit": "badge-amber", delivered: "badge-green", denied: "badge-red" };

export function MaterialsTab({ app }) {
  const { materials, setMaterials, customAssemblies, setCustomAssemblies, show, fmt, submittals } = app;
  const { notifyMaterialStatus } = useNotifications();
  const userRole = app.auth?.role || "owner";
  const isFieldRole = ["foreman", "employee", "driver"].includes(userRole);
  const VIEWS = isFieldRole ? FIELD_VIEWS : FULL_VIEWS;
  const [optResult, setOptResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);
  const [showOpt, setShowOpt] = useState(false);

  // ── Supplier email modals ──
  const [showSendModal, setShowSendModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState(initSuppliers[0]?.email || "");
  const [supplierName, setSupplierName] = useState(initSuppliers[0]?.name || "");
  const [selectedMatIds, setSelectedMatIds] = useState(null); // null = all

  const runOptimize = async () => {
    if (!app.apiKey) { show("Set API key in Settings first", "err"); return; }
    setOptLoading(true);
    setOptResult(null);
    setShowOpt(true);
    try {
      const { optimizeMaterialCosts } = await import("../utils/api.js");
      const matData = materials.slice(0, 30).map(m => ({ name: m.name, category: m.category, unit: m.unit, unitCost: m.unitCost, note: m.note }));
      const projData = (app.projects || []).map(p => ({ name: p.name || p.project, phase: p.phase, scope: p.scope, contract: p.contract }));
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
  const [view, setView] = useState(isFieldRole ? "Requests" : "Material Library");
  const [catFilter, setCatFilter] = useState("All");
  const [matSearch, setMatSearch] = useState("");
  const [editMat, setEditMat] = useState(null);
  const [editAsm, setEditAsm] = useState(null);

  // ── Material Request state ──
  const [reqForm, setReqForm] = useState({ projectId: "", material: "", qty: "", unit: "EA", notes: "" });
  const myRequests = useMemo(() =>
    (app.materialRequests || []).filter(r => r.employeeId === app.auth?.id),
    [app.materialRequests, app.auth]
  );
  const allRequests = app.materialRequests || [];
  const visibleRequests = isFieldRole ? myRequests : allRequests;

  const handleRequestSubmit = () => {
    if (!reqForm.projectId || !reqForm.material || !reqForm.qty) {
      show("Project, material, and quantity are required", "err");
      return;
    }
    const proj = (app.projects || []).find(p => p.id === reqForm.projectId || p.id === Number(reqForm.projectId));
    const newReq = {
      id: crypto.randomUUID(),
      employeeId: app.auth?.id,
      employeeName: app.auth?.name || "Unknown",
      projectId: proj?.id || reqForm.projectId,
      projectName: proj?.name || proj?.project || "",
      material: reqForm.material,
      qty: Number(reqForm.qty),
      unit: reqForm.unit,
      notes: reqForm.notes,
      status: "requested",
      requestedAt: new Date().toISOString(),
    };
    app.setMaterialRequests(prev => [newReq, ...prev]);
    setReqForm({ projectId: "", material: "", qty: "", unit: "EA", notes: "" });
    show("Material request submitted", "ok");
  };

  const handleApproveRequest = (reqId) => {
    const req = (app.materialRequests || []).find(r => r.id === reqId);
    app.setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "approved" } : r
    ));
    show("Request approved", "ok");
    if (req) {
      const prefs = getNotificationPrefs(app.auth?.id);
      if (prefs.materialUpdates) {
        notifyMaterialStatus({ material: req.material || req.item, status: "approved", projectName: req.projectName, requestId: reqId });
      }
    }
  };

  const handleDenyRequest = (reqId) => {
    app.setMaterialRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: "denied" } : r
    ));
    show("Request denied", "ok");
  };

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

  // ── Supplier email helpers ──
  const EBC_HEADER = `Eagles Brothers Constructors\n3810 Mangum Rd, Suite 100, Houston, TX 77092\nPhone: (832) 603-3726 | info@eaglesbrosconstructors.com\n`;

  const openSendToSupplier = () => {
    setSelectedMatIds(filtered.map(m => m.id));
    setShowSendModal(true);
  };

  const openRequestPricing = () => {
    setSelectedMatIds(materials.map(m => m.id));
    setShowPricingModal(true);
  };

  const toggleMatId = (id) => {
    setSelectedMatIds(prev => {
      if (!prev) return materials.map(m => m.id).filter(i => i !== id);
      return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
    });
  };

  const sendTakeoffEmail = () => {
    const mats = materials.filter(m => (selectedMatIds || []).includes(m.id));
    if (mats.length === 0) { show("Select at least one material", "err"); return; }
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const rows = mats.map(m =>
      `  ${m.name.padEnd(36)} | ${m.unit.padEnd(4)} | ${(m.note || m.category || "")}`
    ).join("\n");
    const subject = encodeURIComponent(`EBC Material Takeoff — ${today}`);
    const body = encodeURIComponent(
      `${EBC_HEADER}\nDate: ${today}\nTo: ${supplierName}\n\nDear ${supplierName} Sales Team,\n\nPlease review the following material takeoff and provide pricing and lead time availability at your earliest convenience.\n\n${"─".repeat(70)}\nMATERIAL TAKEOFF\n${"─".repeat(70)}\n${"  Item".padEnd(38)}| Unit | Spec / Note\n${"─".repeat(70)}\n${rows}\n${"─".repeat(70)}\n\nPlease confirm unit pricing, availability, and estimated lead times for each item listed above.\n\nThank you,\nEBC Project Management\nEagles Brothers Constructors\n(832) 603-3726\n`
    );
    window.open(`mailto:${supplierEmail}?subject=${subject}&body=${body}`);
    setShowSendModal(false);
    show("Email client opened", "ok");
  };

  const sendPricingRequest = () => {
    const mats = materials.filter(m => (selectedMatIds || []).includes(m.id));
    if (mats.length === 0) { show("Select at least one material", "err"); return; }
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const rows = mats.map(m =>
      `  ${m.name.padEnd(36)} | ${m.unit.padEnd(4)} | Current: $${m.matCost.toFixed(2)}`
    ).join("\n");
    const subject = encodeURIComponent(`EBC Pricing Update Request — ${today}`);
    const body = encodeURIComponent(
      `${EBC_HEADER}\nDate: ${today}\nTo: ${supplierName}\n\nDear ${supplierName} Sales Team,\n\nWe are requesting updated pricing on the following materials in our inventory. Current pricing is shown for reference — please reply with your updated unit pricing.\n\n${"─".repeat(70)}\nPRICING UPDATE REQUEST\n${"─".repeat(70)}\n${"  Item".padEnd(38)}| Unit | Current Price\n${"─".repeat(70)}\n${rows}\n${"─".repeat(70)}\n\nPlease reply with updated pricing at your earliest convenience. If pricing has not changed, a simple confirmation is appreciated.\n\nThank you,\nEBC Project Management\nEagles Brothers Constructors\n(832) 603-3726\n`
    );
    window.open(`mailto:${supplierEmail}?subject=${subject}&body=${body}`);
    setShowPricingModal(false);
    show("Email client opened", "ok");
  };

  // ── Supplier modal shared supplier selector ──
  const renderSupplierSelector = () => (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label">Supplier</label>
      <select
        className="form-select"
        value={supplierEmail}
        onChange={e => {
          const sup = initSuppliers.find(s => s.email === e.target.value);
          setSupplierEmail(e.target.value);
          if (sup) setSupplierName(sup.name);
        }}
      >
        {initSuppliers.map(s => (
          <option key={s.id} value={s.email}>{s.name}</option>
        ))}
        <option value="">— Enter manually —</option>
      </select>
      {!initSuppliers.find(s => s.email === supplierEmail) && (
        <input
          className="form-input"
          style={{ marginTop: 8 }}
          placeholder="Supplier email address"
          value={supplierEmail}
          onChange={e => setSupplierEmail(e.target.value)}
        />
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  //  VIEW: MATERIAL LIBRARY
  // ═══════════════════════════════════════════════════════════════
  const renderLibrary = () => (
    <div>
      <div className="flex gap-8 mb-16 flex-wrap" style={{ alignItems: "center" }}>
        <div className="search-wrap" style={{ flex: "1 1 200px" }}>
          <Search style={{ width: 16, height: 16 }} className="search-icon" />
          <input className="search-input" placeholder="Search materials..." value={matSearch} onChange={e => setMatSearch(e.target.value)} />
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={openSendToSupplier}>
            <Send size={14} /> Send Takeoff
          </button>
          <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={openRequestPricing}>
            <RefreshCw size={14} /> Request Pricing
          </button>
          <button className="btn btn-primary" onClick={() => setEditMat({ name: "", category: "Framing", unit: "LF", matCost: 0, laborCost: 0, note: "" })}>+ Add Material</button>
        </div>
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
          <div className="empty-icon"><Layers style={{ width: 40, height: 40 }} /></div>
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
    const duplicateLayer = (idx) => {
      setEditAsm(a => {
        const layers = [...a.layers];
        const copy = { ...layers[idx], id: "ly_" + Date.now() };
        layers.splice(idx + 1, 0, copy);
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

        {/* Quick-Add Presets */}
        <div className="mb-16">
          <label className="form-label" style={{ marginBottom: 8 }}>Quick Add</label>
          <div className="flex gap-4 flex-wrap">
            {[
              // Studs by gauge
              { label: "Stud 3-5/8\" 25ga", id: "m1" },
              { label: "Stud 3-5/8\" 20ga", id: "m2" },
              { label: "Stud 3-5/8\" 18ga", id: "fs358-18" },
              { label: "Stud 3-5/8\" 16ga", id: "fs358-16" },
              { label: "Stud 3-5/8\" 14ga", id: "fs358-14" },
              { label: "Stud 6\" 20ga", id: "m3" },
              { label: "Stud 6\" 16ga", id: "fs600-16" },
              { label: "Stud 8\" 20ga", id: "m31" },
              // Tracks
              { label: "Track 3-5/8\"", id: "ft358-20" },
              { label: "Track 6\"", id: "ft600-20" },
              { label: "Deflection", id: "m6" },
              // Board
              { label: "1/2\" Regular", id: "gwb-12r" },
              { label: "5/8\" Type X", id: "m7" },
              { label: "5/8\" Type C", id: "gwb-58c" },
              { label: "DensShield", id: "m8" },
              { label: "Impact GWB", id: "m9" },
              { label: "Lead-Lined", id: "m12" },
              { label: "QuietRock", id: "m36" },
              { label: "Mold Tough", id: "gwb-mr" },
              // Insulation
              { label: "R-13 Batt", id: "m13" },
              { label: "R-19 Batt", id: "m14" },
              { label: "Mineral Wool", id: "m16" },
              // Ceiling
              { label: "ACT Grid 2x2", id: "m17" },
              { label: "Acoustic Tile", id: "m19" },
              // Finish & specialty
              { label: "L4 Finish", id: "m26" },
              { label: "L5 Finish", id: "m27" },
              { label: "Fire Caulk", id: "m44" },
              { label: "2x6 Blocking", id: "m50" },
            ].map(p => (
              <button key={p.id} className="btn btn-sm btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => addLayer(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Add Layer — Full Dropdown */}
        <div className="flex gap-8 mb-16" style={{ alignItems: "end" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Or Search All Materials</label>
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
                      <td className="flex gap-4">
                        <button className="btn btn-sm btn-ghost" title="Duplicate layer" onClick={() => duplicateLayer(i)}><ClipboardCopy style={{ width: 14, height: 14 }} /></button>
                        <button className="btn btn-sm btn-ghost" style={{ color: "var(--red)" }} onClick={() => removeLayer(i)}>✕</button>
                      </td>
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
          <div className="empty-icon"><Package style={{ width: 40, height: 40 }} /></div>
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

      {/* ═══ REQUESTS VIEW ═══ */}
      {view === "Requests" && (
        <div>
          {/* Request Form */}
          <div className="card mb-16" style={{ padding: 16 }}>
            <div className="text-sm font-semi mb-12">New Material Request</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select
                className="input"
                value={reqForm.projectId}
                onChange={e => setReqForm(f => ({ ...f, projectId: e.target.value }))}
              >
                <option value="">Select Project...</option>
                {(app.projects || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.project}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Material name"
                value={reqForm.material}
                onChange={e => setReqForm(f => ({ ...f, material: e.target.value }))}
              />
              <div className="flex gap-8">
                <input
                  className="input"
                  type="number"
                  placeholder="Qty"
                  style={{ flex: 1 }}
                  value={reqForm.qty}
                  onChange={e => setReqForm(f => ({ ...f, qty: e.target.value }))}
                />
                <select
                  className="input"
                  style={{ width: 80 }}
                  value={reqForm.unit}
                  onChange={e => setReqForm(f => ({ ...f, unit: e.target.value }))}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <input
                className="input"
                placeholder="Notes (optional)"
                value={reqForm.notes}
                onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <button
              className="btn btn-primary btn-sm mt-12"
              onClick={handleRequestSubmit}
            >
              Submit Request
            </button>
          </div>

          {/* Request List */}
          <div className="text-xs text-dim mb-8">{visibleRequests.length} request{visibleRequests.length !== 1 ? "s" : ""}</div>
          {visibleRequests.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div className="empty-icon" style={{ marginBottom: 8 }}><ClipboardList style={{ width: 40, height: 40 }} /></div>
              <div className="empty-text">No material requests yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleRequests.map(req => (
                <div key={req.id} className="card" style={{ padding: 14 }}>
                  <div className="flex-between mb-4">
                    <span className="text-sm font-semi">{req.material}</span>
                    <span className={`badge ${REQ_STATUS_BADGE[req.status] || "badge-amber"}`}>{req.status}</span>
                  </div>
                  <div className="text-xs text-muted mb-4">
                    {req.projectName} — {req.qty} {req.unit}
                  </div>
                  <div className="text-xs text-dim mb-4">
                    {req.employeeName} · {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : ""}
                  </div>
                  {req.notes && <div className="text-xs text-dim mb-4">{req.notes}</div>}
                  {/* PM+ can approve/deny pending requests */}
                  {!isFieldRole && req.status === "requested" && (
                    <div className="flex gap-8 mt-8">
                      <button className="btn btn-primary btn-sm" onClick={() => handleApproveRequest(req.id)}>Approve</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => handleDenyRequest(req.id)}>Deny</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {renderMatModal()}

      {/* ═══ SEND TO SUPPLIER MODAL ═══ */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Send size={16} /> Send Material Takeoff to Supplier
              </div>
              <button className="modal-close" onClick={() => setShowSendModal(false)}><X size={14} /></button>
            </div>

            {renderSupplierSelector()}

            <div className="form-label" style={{ marginBottom: 6 }}>Materials to Include</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMatIds(materials.map(m => m.id))}>All</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMatIds([])}>None</button>
              {catFilter !== "All" && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMatIds(filtered.map(m => m.id))}>
                  Current filter ({filtered.length})
                </button>
              )}
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
              {materials.map(m => {
                const checked = (selectedMatIds || []).includes(m.id);
                const clr = MAT_CLR[m.category] || {};
                return (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: checked ? "var(--amber-dim)" : "transparent" }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleMatId(m.id)} style={{ accentColor: "var(--amber)" }} />
                    <span className="mat-cat-pill" style={{ background: clr.bg, color: clr.color, border: `1px solid ${clr.border}`, fontSize: 10, padding: "1px 6px" }}>{m.category}</span>
                    <span className="text-sm" style={{ flex: 1 }}>{m.name}</span>
                    <span className="text-xs text-dim">{m.unit}</span>
                    {m.note && <span className="text-xs text-dim" style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note}</span>}
                  </label>
                );
              })}
            </div>

            <div className="text-xs text-dim" style={{ marginBottom: 12 }}>
              {(selectedMatIds || []).length} of {materials.length} materials selected · Opens your default email client
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowSendModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={sendTakeoffEmail} disabled={!(selectedMatIds || []).length}>
                <Send size={14} style={{ marginRight: 6 }} /> Open in Email Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REQUEST PRICING UPDATE MODAL ═══ */}
      {showPricingModal && (
        <div className="modal-overlay" onClick={() => setShowPricingModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <RefreshCw size={16} /> Request Pricing Update
              </div>
              <button className="modal-close" onClick={() => setShowPricingModal(false)}><X size={14} /></button>
            </div>

            {renderSupplierSelector()}

            <div className="form-label" style={{ marginBottom: 6 }}>Items for Pricing Review</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMatIds(materials.map(m => m.id))}>All ({materials.length})</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMatIds([])}>None</button>
              {catFilter !== "All" && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMatIds(filtered.map(m => m.id))}>
                  Current filter ({filtered.length})
                </button>
              )}
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
              {materials.map(m => {
                const checked = (selectedMatIds || []).includes(m.id);
                const clr = MAT_CLR[m.category] || {};
                return (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: checked ? "var(--amber-dim)" : "transparent" }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleMatId(m.id)} style={{ accentColor: "var(--amber)" }} />
                    <span className="mat-cat-pill" style={{ background: clr.bg, color: clr.color, border: `1px solid ${clr.border}`, fontSize: 10, padding: "1px 6px" }}>{m.category}</span>
                    <span className="text-sm" style={{ flex: 1 }}>{m.name}</span>
                    <span className="text-xs font-mono" style={{ color: "var(--amber)" }}>${m.matCost.toFixed(2)}/{m.unit}</span>
                  </label>
                );
              })}
            </div>

            <div className="text-xs text-dim" style={{ marginBottom: 12 }}>
              {(selectedMatIds || []).length} items · Current pricing will be included so supplier can flag changes
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowPricingModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={sendPricingRequest} disabled={!(selectedMatIds || []).length}>
                <RefreshCw size={14} style={{ marginRight: 6 }} /> Open in Email Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
