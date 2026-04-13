// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Condition Properties Dialog
//  Better than OST: auto-focused search, smart defaults, favorites,
//  visual preview, one-click quick-add, modern dark UI
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo } from "react";

const COND_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e879f9", "#22d3ee", "#a3e635", "#fb923c",
];

const LS_FAV_KEY = "ebc_cond_favorites"; // localStorage key for favorites

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_FAV_KEY)) || []; } catch { return []; }
}
function saveFavorites(favs) {
  try { localStorage.setItem(LS_FAV_KEY, JSON.stringify(favs.slice(0, 8))); } catch {}
}

export function ConditionPropsDialog({ assemblies, conditions, editingCond, onSave, onClose }) {
  const searchRef = useRef(null);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(loadFavorites);

  // ── Form state ──
  const [selectedCode, setSelectedCode] = useState(editingCond?.asmCode || "");
  const [name, setName] = useState(editingCond?.name || "");
  const [height, setHeight] = useState(editingCond?.height || 10);
  const [color, setColor] = useState(editingCond?.color || COND_COLORS[conditions.length % COND_COLORS.length]);
  const [roundQty, setRoundQty] = useState(editingCond?.roundQty || false);
  const [roundMode, setRoundMode] = useState(editingCond?.roundMode || "up"); // "up" | "nearest"
  const [treeOpen, setTreeOpen] = useState({});

  const isEdit = !!editingCond;
  const selectedAsm = (assemblies || []).find(a => a.code === selectedCode) || null;
  const condType = selectedAsm ? (selectedAsm.unit === "EA" ? "count" : selectedAsm.unit === "SF" ? "area" : "linear") : "linear";
  const condFolder = selectedAsm?.cat || (condType === "count" ? "Counts" : condType === "area" ? "Ceilings" : "Walls");
  const totalRate = selectedAsm ? (selectedAsm.matRate || 0) + (selectedAsm.labRate || 0) : 0;

  // Auto-focus search on mount
  useEffect(() => { setTimeout(() => searchRef.current?.focus(), 50); }, []);

  // Auto-expand first category on mount
  useEffect(() => {
    const cats = {};
    (assemblies || []).forEach(a => { if (a.cat) cats[a.cat] = true; });
    // Open Walls by default (most common), or first cat
    const firstCat = Object.keys(cats)[0] || "Walls";
    setTreeOpen({ [firstCat]: true, Walls: true });
  }, []);

  // ── Build categorized tree, filtered by search ──
  const categories = useMemo(() => {
    const catMap = {};
    const q = search.toLowerCase();
    (assemblies || []).forEach(a => {
      const cat = a.cat || "Other";
      if (q && !a.name.toLowerCase().includes(q) && !a.code.toLowerCase().includes(q) && !cat.toLowerCase().includes(q)) return;
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(a);
    });
    // Sort: Walls first, then Ceilings, then alpha
    const order = ["Walls", "Ceilings", "Insulation", "Specialties", "Shaft Wall", "Profit Add-Ons", "Counts"];
    const sorted = Object.entries(catMap).sort(([a], [b]) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    return sorted;
  }, [assemblies, search]);

  // Auto-expand all categories when searching
  useEffect(() => {
    if (search) {
      const open = {};
      categories.forEach(([cat]) => { open[cat] = true; });
      setTreeOpen(open);
    }
  }, [search]);

  // ── Select assembly handler ──
  const selectAssembly = (asm) => {
    setSelectedCode(asm.code);
    if (!isEdit || name === editingCond?.name) setName(asm.name);
    if (asm.unit === "LF" && (!height || height === 0)) setHeight(10);
  };

  // ── Save handler ──
  const handleSave = (keepOpen) => {
    if (!selectedCode && !name) return;
    const data = {
      asmCode: selectedCode,
      name: name || selectedAsm?.name || "Untitled",
      type: condType,
      folder: condFolder,
      color,
      height: condType === "linear" ? (height || 10) : 0,
      roundQty,
      roundMode,
    };
    // Track favorite
    if (selectedCode) {
      const newFavs = [selectedCode, ...favorites.filter(f => f !== selectedCode)].slice(0, 8);
      setFavorites(newFavs);
      saveFavorites(newFavs);
    }
    onSave(data, isEdit ? editingCond.id : null);
    if (keepOpen) {
      // Reset for next condition
      setSelectedCode("");
      setName("");
      setColor(COND_COLORS[(conditions.length + 1) % COND_COLORS.length]);
      setSearch("");
      searchRef.current?.focus();
    } else {
      onClose();
    }
  };

  // ── Keyboard shortcuts ──
  const handleKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { handleSave(false); return; }
    if (e.key === "Enter" && selectedCode) { handleSave(false); return; }
  };

  // ── Favorite chips ──
  const favAssemblies = favorites.map(code => (assemblies || []).find(a => a.code === code)).filter(Boolean);

  return (
    <div className="flex justify-center absolute" style={{ inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}>
      <div className="flex-col rounded-control overflow-hidden" style={{ width: 620, maxHeight: "85vh", background: "#12151f", border: "1px solid rgba(224,148,34,0.4)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding: "var(--space-4) var(--space-5) var(--space-3)", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="fs-secondary fw-bold c-white">{isEdit ? "Edit Condition" : "New Condition"}</div>
          <button onClick={onClose} className="fs-section c-text2 cursor-pointer" style={{ background: "none", border: "none", padding: "var(--space-1) var(--space-2)" }}>x</button>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: "var(--space-3) var(--space-5) var(--space-2)" }}>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assemblies..."
            className="rounded-control fs-label c-white w-full" style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", outline: "none" }} />
        </div>

        {/* ── Favorites row ── */}
        {favAssemblies.length > 0 && !search && (
          <div className="gap-sp2 flex-wrap" style={{ padding: "var(--space-1) var(--space-5) var(--space-2)", display: "flex", alignItems: "center" }}>
            <span className="fs-xs c-text3">Recent</span>
            {favAssemblies.slice(0, 5).map(a => (
              <button key={a.code} onClick={() => selectAssembly(a)}
                style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)", borderRadius: "var(--radius-control)", border: selectedCode === a.code ? "1px solid var(--amber, #e09422)" : "1px solid rgba(255,255,255,0.1)", background: selectedCode === a.code ? "rgba(224,148,34,0.15)" : "rgba(255,255,255,0.04)", color: selectedCode === a.code ? "#e09422" : "#aaa", cursor: "pointer", whiteSpace: "nowrap" }}>
                {a.name.length > 20 ? a.name.slice(0, 20) + "..." : a.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Main body: Tree + Config ── */}
        <div className="overflow-hidden flex-1" style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* ── Left: Assembly tree ── */}
          <div className="overflow-auto" style={{ width: 240, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "var(--space-2) 0" }}>
            {categories.length === 0 && (
              <div className="fs-label c-text3 text-center" style={{ padding: "var(--space-5) var(--space-4)" }}>No assemblies match "{search}"</div>
            )}
            {categories.map(([cat, items]) => (
              <div key={cat}>
                <div onClick={() => setTreeOpen(p => ({ ...p, [cat]: !p[cat] }))}
                  className="flex fw-semi fs-tab c-text2 gap-sp2 cursor-pointer" style={{ padding: "var(--space-1) var(--space-3)" }}>
                  <span className="fs-xs">{treeOpen[cat] ? "▾" : "▸"}</span>
                  <span className="flex-1">{cat}</span>
                  <span className="fs-xs c-text3">{items.length}</span>
                </div>
                {treeOpen[cat] && items.map(a => {
                  const isSel = a.code === selectedCode;
                  return (
                    <div key={a.code} onClick={() => selectAssembly(a)}
                      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "4px 12px 4px 28px", cursor: "pointer", fontSize: "var(--text-tab)",
                        background: isSel ? "rgba(224,148,34,0.12)" : "transparent",
                        color: isSel ? "#fff" : "#bbb",
                        borderLeft: isSel ? "2px solid #e09422" : "2px solid transparent" }}>
                      <span className="fs-xs c-text3" style={{ minWidth: 32 }}>{a.code}</span>
                      <span className="nowrap overflow-hidden flex-1" style={{ textOverflow: "ellipsis" }}>{a.name}</span>
                      <span className="fs-xs c-text3">{a.unit}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Right: Configuration ── */}
          <div className="flex-col gap-sp4 overflow-auto flex-1" style={{ padding: "14px 18px" }}>

            {/* Name */}
            <div>
              <label className="fs-xs uppercase c-text2" style={{ letterSpacing: 0.5 }}>Condition Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={selectedAsm?.name || "Enter name..."}
                className="rounded-control fs-label mt-sp1 c-white w-full" style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", outline: "none" }} />
            </div>

            {/* Height (linear only) */}
            {condType === "linear" && (
              <div>
                <label className="fs-xs uppercase c-text2" style={{ letterSpacing: 0.5 }}>Wall Height (ft)</label>
                <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} min={1} max={40} step={1}
                  className="rounded-control fs-label mt-sp1 c-white" style={{ width: 80, padding: "var(--space-2) var(--space-3)", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", outline: "none" }} />
              </div>
            )}

            {/* Color grid */}
            <div>
              <label className="mb-sp1 fs-xs uppercase c-text2 d-block" style={{ letterSpacing: 0.5 }}>Color</label>
              <div className="gap-sp1 flex-wrap" style={{ display: "flex" }}>
                {COND_COLORS.map(c => (
                  <div key={c} onClick={() => setColor(c)}
                    style={{ width: 22, height: 22, borderRadius: "var(--radius-control)", background: c, cursor: "pointer",
                      border: color === c ? "2px solid #fff" : "2px solid transparent",
                      boxShadow: color === c ? "0 0 6px " + c : "none" }} />
                ))}
              </div>
            </div>

            {/* Preview strip */}
            <div>
              <label className="mb-sp1 fs-xs uppercase c-text2 d-block" style={{ letterSpacing: 0.5 }}>Preview</label>
              <div className="flex rounded-control gap-sp3" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(0,0,0,0.4)" }}>
                {condType === "linear" && (
                  <>
                    <svg width="80" height="12"><line x1="0" y1="6" x2="80" y2="6" stroke={color} strokeWidth="3" /></svg>
                    <span className="fs-tab c-text2">{height || 10}' LF</span>
                  </>
                )}
                {condType === "area" && (
                  <>
                    <svg width="40" height="30"><rect x="2" y="2" width="36" height="26" fill={color + "33"} stroke={color} strokeWidth="2" rx="2" /></svg>
                    <span className="fs-tab c-text2">SF</span>
                  </>
                )}
                {condType === "count" && (
                  <>
                    <svg width="24" height="24"><circle cx="12" cy="12" r="8" fill={color + "44"} stroke={color} strokeWidth="2" /><circle cx="12" cy="12" r="3" fill={color} /></svg>
                    <span className="fs-tab c-text2">EA (count)</span>
                  </>
                )}
                <span className="rounded-control" style={{ width: 8, height: 8, background: color }} />
                <span className="fw-semi fs-tab c-text2">{name || selectedAsm?.name || "—"}</span>
              </div>
            </div>

            {/* Rate info */}
            {selectedAsm && (
              <div className="rounded-control" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="mb-sp1 fs-xs c-text2">Rate per {selectedAsm.unit}</div>
                <div className="fs-label gap-sp4" style={{ display: "flex" }}>
                  <span className="c-green">Mat ${selectedAsm.matRate?.toFixed(2)}</span>
                  <span className="c-blue">Lab ${selectedAsm.labRate?.toFixed(2)}</span>
                  <span className="fw-semi c-white">= ${totalRate.toFixed(2)}/{selectedAsm.unit}</span>
                </div>
              </div>
            )}

            {/* Type / Folder info */}
            <div className="fs-tab c-text3 gap-sp4" style={{ display: "flex" }}>
              <span>Type: <span className="c-text2">{condType === "linear" ? "Linear" : condType === "area" ? "Area" : "Count"}</span></span>
              <span>UOM: <span className="c-text2">{selectedAsm?.unit || "—"}</span></span>
              <span>Folder: <span className="c-text2">{condFolder}</span></span>
            </div>

            {/* Round Quantity toggle */}
            <div className="rounded-control" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex gap-sp3">
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-label)", color: roundQty ? "#f59e0b" : "#888" }}>
                  <input type="checkbox" checked={roundQty} onChange={e => setRoundQty(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: "#f59e0b" }} />
                  Round Quantity
                </label>
                {roundQty && (
                  <select value={roundMode} onChange={e => setRoundMode(e.target.value)}
                    className="rounded-control fs-tab c-white" style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", outline: "none" }}>
                    <option value="up">Round Up (ceil)</option>
                    <option value="nearest">Round Nearest</option>
                  </select>
                )}
              </div>
              <div className="mt-sp1 fs-xs c-text3">
                {roundQty ? `Quantities will be rounded ${roundMode === "up" ? "up" : "to nearest whole number"} in summary + exports` : "Show exact fractional quantities"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div className="gap-sp2" style={{ padding: "var(--space-3) var(--space-5) var(--space-4)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose}
            className="rounded-control fs-label c-text2 cursor-pointer" style={{ padding: "7px 18px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}>
            Cancel
          </button>
          {!isEdit && (
            <button onClick={() => handleSave(true)} disabled={!selectedCode && !name}
              style={{ padding: "7px 18px", borderRadius: "var(--radius-control)", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: (!selectedCode && !name) ? "#555" : "#ccc", fontSize: "var(--text-label)", cursor: (!selectedCode && !name) ? "default" : "pointer" }}>
              Apply & New
            </button>
          )}
          <button onClick={() => handleSave(false)} disabled={!selectedCode && !name}
            style={{ padding: "var(--space-2) var(--space-5)", borderRadius: "var(--radius-control)", border: "none", background: (!selectedCode && !name) ? "#333" : "#e09422", color: (!selectedCode && !name) ? "#666" : "#000", fontSize: "var(--text-label)", fontWeight: "var(--weight-bold)", cursor: (!selectedCode && !name) ? "default" : "pointer" }}>
            {isEdit ? "Save" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
