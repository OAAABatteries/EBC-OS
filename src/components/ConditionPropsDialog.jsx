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
    <div style={{ position: "absolute", inset: 0, zIndex: 10002, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}>
      <div style={{ width: 620, maxHeight: "85vh", background: "#12151f", border: "1px solid rgba(224,148,34,0.4)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{isEdit ? "Edit Condition" : "New Condition"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: "2px 6px" }}>x</button>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: "10px 18px 6px" }}>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assemblies..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, outline: "none" }} />
        </div>

        {/* ── Favorites row ── */}
        {favAssemblies.length > 0 && !search && (
          <div style={{ padding: "4px 18px 8px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#666" }}>Recent</span>
            {favAssemblies.slice(0, 5).map(a => (
              <button key={a.code} onClick={() => selectAssembly(a)}
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: selectedCode === a.code ? "1px solid var(--amber, #e09422)" : "1px solid rgba(255,255,255,0.1)", background: selectedCode === a.code ? "rgba(224,148,34,0.15)" : "rgba(255,255,255,0.04)", color: selectedCode === a.code ? "#e09422" : "#aaa", cursor: "pointer", whiteSpace: "nowrap" }}>
                {a.name.length > 20 ? a.name.slice(0, 20) + "..." : a.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Main body: Tree + Config ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)" }}>

          {/* ── Left: Assembly tree ── */}
          <div style={{ width: 240, borderRight: "1px solid rgba(255,255,255,0.06)", overflow: "auto", padding: "8px 0" }}>
            {categories.length === 0 && (
              <div style={{ padding: "20px 16px", color: "#555", fontSize: 12, textAlign: "center" }}>No assemblies match "{search}"</div>
            )}
            {categories.map(([cat, items]) => (
              <div key={cat}>
                <div onClick={() => setTreeOpen(p => ({ ...p, [cat]: !p[cat] }))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: "#aaa", fontWeight: 600 }}>
                  <span style={{ fontSize: 9 }}>{treeOpen[cat] ? "▾" : "▸"}</span>
                  <span style={{ flex: 1 }}>{cat}</span>
                  <span style={{ fontSize: 9, color: "#555" }}>{items.length}</span>
                </div>
                {treeOpen[cat] && items.map(a => {
                  const isSel = a.code === selectedCode;
                  return (
                    <div key={a.code} onClick={() => selectAssembly(a)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px 4px 28px", cursor: "pointer", fontSize: 11,
                        background: isSel ? "rgba(224,148,34,0.12)" : "transparent",
                        color: isSel ? "#fff" : "#bbb",
                        borderLeft: isSel ? "2px solid #e09422" : "2px solid transparent" }}>
                      <span style={{ color: "#666", fontSize: 9, minWidth: 32 }}>{a.code}</span>
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                      <span style={{ fontSize: 9, color: "#555" }}>{a.unit}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ── Right: Configuration ── */}
          <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>

            {/* Name */}
            <div>
              <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Condition Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={selectedAsm?.name || "Enter name..."}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, marginTop: 3, outline: "none" }} />
            </div>

            {/* Height (linear only) */}
            {condType === "linear" && (
              <div>
                <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Wall Height (ft)</label>
                <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} min={1} max={40} step={1}
                  style={{ width: 80, padding: "7px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, marginTop: 3, outline: "none" }} />
              </div>
            )}

            {/* Color grid */}
            <div>
              <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Color</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {COND_COLORS.map(c => (
                  <div key={c} onClick={() => setColor(c)}
                    style={{ width: 22, height: 22, borderRadius: 4, background: c, cursor: "pointer",
                      border: color === c ? "2px solid #fff" : "2px solid transparent",
                      boxShadow: color === c ? "0 0 6px " + c : "none" }} />
                ))}
              </div>
            </div>

            {/* Preview strip */}
            <div>
              <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Preview</label>
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 12 }}>
                {condType === "linear" && (
                  <>
                    <svg width="80" height="12"><line x1="0" y1="6" x2="80" y2="6" stroke={color} strokeWidth="3" /></svg>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{height || 10}' LF</span>
                  </>
                )}
                {condType === "area" && (
                  <>
                    <svg width="40" height="30"><rect x="2" y="2" width="36" height="26" fill={color + "33"} stroke={color} strokeWidth="2" rx="2" /></svg>
                    <span style={{ fontSize: 11, color: "#aaa" }}>SF</span>
                  </>
                )}
                {condType === "count" && (
                  <>
                    <svg width="24" height="24"><circle cx="12" cy="12" r="8" fill={color + "44"} stroke={color} strokeWidth="2" /><circle cx="12" cy="12" r="3" fill={color} /></svg>
                    <span style={{ fontSize: 11, color: "#aaa" }}>EA (count)</span>
                  </>
                )}
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 11, color: "#ccc", fontWeight: 600 }}>{name || selectedAsm?.name || "—"}</span>
              </div>
            </div>

            {/* Rate info */}
            {selectedAsm && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Rate per {selectedAsm.unit}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span style={{ color: "#10b981" }}>Mat ${selectedAsm.matRate?.toFixed(2)}</span>
                  <span style={{ color: "#3b82f6" }}>Lab ${selectedAsm.labRate?.toFixed(2)}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>= ${totalRate.toFixed(2)}/{selectedAsm.unit}</span>
                </div>
              </div>
            )}

            {/* Type / Folder info */}
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#555" }}>
              <span>Type: <span style={{ color: "#aaa" }}>{condType === "linear" ? "Linear" : condType === "area" ? "Area" : "Count"}</span></span>
              <span>UOM: <span style={{ color: "#aaa" }}>{selectedAsm?.unit || "—"}</span></span>
              <span>Folder: <span style={{ color: "#aaa" }}>{condFolder}</span></span>
            </div>
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div style={{ padding: "10px 18px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#aaa", fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
          {!isEdit && (
            <button onClick={() => handleSave(true)} disabled={!selectedCode && !name}
              style={{ padding: "7px 18px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: (!selectedCode && !name) ? "#555" : "#ccc", fontSize: 12, cursor: (!selectedCode && !name) ? "default" : "pointer" }}>
              Apply & New
            </button>
          )}
          <button onClick={() => handleSave(false)} disabled={!selectedCode && !name}
            style={{ padding: "7px 20px", borderRadius: 6, border: "none", background: (!selectedCode && !name) ? "#333" : "#e09422", color: (!selectedCode && !name) ? "#666" : "#000", fontSize: 12, fontWeight: 700, cursor: (!selectedCode && !name) ? "default" : "pointer" }}>
            {isEdit ? "Save" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
