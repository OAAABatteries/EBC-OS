import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// ── IndexedDB helpers for PDF persistence ──
const IDB_NAME = "ebc_takeoff_pdfs";
const IDB_STORE = "pdfs";
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function savePdfToIDB(key, data) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function loadPdfFromIDB(key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ── Modes ──
const MODE = { PAN: "pan", CALIBRATE: "calibrate", LINEAR: "linear", AREA: "area", COUNT: "count" };

// ── Condition colors — auto-assigned ──
const COND_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e879f9", "#22d3ee", "#a3e635", "#fb923c",
];

function dist(a, b) { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2); }
function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; a += pts[i].x * pts[j].y - pts[j].x * pts[i].y; }
  return Math.abs(a) / 2;
}

// ── Condition Templates by Trade ──
const TEMPLATES = {
  "Medical Drywall": {
    description: "Full medical/hospital scope — walls, ceilings, lead-lined, shaft wall, insulation, counts",
    items: [
      { type: "linear", folder: "Walls", asmCode: "A2", name: '3-5/8" 20ga Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "A3", name: '2-1/2" 20ga Partition', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "B1", name: '6" 20ga Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "DW1", name: '6" Deck Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "C2", name: "Furring (One Side)", height: 10 },
      { type: "linear", folder: "Walls", asmCode: "SW1", name: "Shaft Wall (1-hr)", height: 10 },
      { type: "linear", folder: "Walls", asmCode: "LL1", name: 'Lead-Lined GWB (1/32" Pb)', height: 10 },
      { type: "area",   folder: "Ceilings", asmCode: "ACT1", name: "2x2 ACT Grid + Tile" },
      { type: "area",   folder: "Ceilings", asmCode: "GC1", name: "GWB Suspended Ceiling" },
      { type: "linear", folder: "Ceilings", asmCode: "FD1", name: "Furr-Down / Soffit", height: 10 },
      { type: "area",   folder: "Insulation", asmCode: "INS1", name: 'R-13 Batt (3-5/8")' },
      { type: "area",   folder: "Insulation", asmCode: "INS2", name: 'R-19 Batt (6")' },
      { type: "area",   folder: "Insulation", asmCode: "INS4", name: '3" Mineral Wool' },
      { type: "linear", folder: "Specialties", asmCode: "ICRA1", name: "ICRA Dust Barrier", height: 10 },
      { type: "count",  folder: "Counts", asmCode: "DF", name: "Door Frames" },
      { type: "count",  folder: "Counts", asmCode: "SL", name: "Sidelights" },
      { type: "count",  folder: "Counts", asmCode: "CJ", name: "Control Joints" },
      { type: "linear", folder: "Add-Ons", asmCode: "CB", name: "Corner Bead", height: 10 },
      { type: "linear", folder: "Add-Ons", asmCode: "FC", name: "Fire Caulking", height: 10 },
      { type: "area",   folder: "Add-Ons", asmCode: "BLK", name: "Blocking Allowance" },
    ],
  },
  "Commercial Office": {
    description: "Standard commercial tenant improvement — walls, ACT ceilings, insulation",
    items: [
      { type: "linear", folder: "Walls", asmCode: "A2", name: '3-5/8" 20ga Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "A3", name: '2-1/2" 20ga Partition', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "B1", name: '6" 20ga Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "C2", name: "Furring (One Side)", height: 10 },
      { type: "area",   folder: "Ceilings", asmCode: "ACT1", name: "2x2 ACT Grid + Tile" },
      { type: "area",   folder: "Ceilings", asmCode: "ACT2", name: "2x4 ACT Grid + Tile" },
      { type: "area",   folder: "Ceilings", asmCode: "GC1", name: "GWB Suspended Ceiling" },
      { type: "linear", folder: "Ceilings", asmCode: "FD1", name: "Furr-Down / Soffit", height: 10 },
      { type: "area",   folder: "Insulation", asmCode: "INS1", name: 'R-13 Batt (3-5/8")' },
      { type: "count",  folder: "Counts", asmCode: "DF", name: "Door Frames" },
      { type: "count",  folder: "Counts", asmCode: "SL", name: "Sidelights" },
      { type: "linear", folder: "Add-Ons", asmCode: "CB", name: "Corner Bead", height: 10 },
      { type: "linear", folder: "Add-Ons", asmCode: "FC", name: "Fire Caulking", height: 10 },
    ],
  },
  "Retail": {
    description: "Retail buildout — standard walls, ACT, minimal insulation",
    items: [
      { type: "linear", folder: "Walls", asmCode: "A2", name: '3-5/8" 20ga Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "B1", name: '6" 20ga Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "DW1", name: '6" Deck Wall', height: 10 },
      { type: "linear", folder: "Walls", asmCode: "C2", name: "Furring (One Side)", height: 10 },
      { type: "area",   folder: "Ceilings", asmCode: "ACT1", name: "2x2 ACT Grid + Tile" },
      { type: "area",   folder: "Ceilings", asmCode: "GC1", name: "GWB Suspended Ceiling" },
      { type: "area",   folder: "Insulation", asmCode: "INS1", name: 'R-13 Batt (3-5/8")' },
      { type: "count",  folder: "Counts", asmCode: "DF", name: "Door Frames" },
      { type: "linear", folder: "Add-Ons", asmCode: "CB", name: "Corner Bead", height: 10 },
    ],
  },
  "Blank": {
    description: "Start empty — add conditions as needed",
    items: [],
  },
};

const DRYWALL_TEMPLATE = TEMPLATES["Commercial Office"].items;

function createCondition(template, index) {
  return {
    id: "cond_" + Date.now() + "_" + index,
    name: template.name,
    type: template.type, // linear, area, count
    asmCode: template.asmCode || "",
    folder: template.folder || "General",
    color: COND_COLORS[index % COND_COLORS.length],
    height: template.height || 0,
    qty: 0, // running total
    cost: 0, // running cost
  };
}

export function DrawingViewer({ pdfData, fileName, onClose, onAddToTakeoff, assemblies, initialTakeoffState, onTakeoffStateChange, takeoffId }) {
  // ── Multi-PDF management ──
  // pdfFiles: [{ name, data (Uint8Array), doc (pdfjs doc), numPages }]
  const [pdfFiles, setPdfFiles] = useState([]);
  const [activePdfIdx, setActivePdfIdx] = useState(0);
  const addPdfInputRef = useRef(null);

  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [mode, setMode] = useState(MODE.PAN);

  // Composite page key — unique across PDFs: "pdfIdx:pageNum"
  const pageKey = activePdfIdx + ":" + page;

  // ── Shorthand for initial state restoration ──
  const _init = initialTakeoffState || {};

  // Calibration
  const [calibrations, setCalibrations] = useState(_init.calibrations || {});
  const [calPoints, setCalPoints] = useState([]);
  const [calInput, setCalInput] = useState("");
  const [showCalPrompt, setShowCalPrompt] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  // Sheet management
  const [sheetNames, setSheetNames] = useState(_init.sheetNames || {});
  const [showSheets, setShowSheets] = useState(true);
  const [editingSheet, setEditingSheet] = useState(null);

  // Conditions system
  const [conditions, setConditions] = useState(() =>
    _init.conditions && _init.conditions.length > 0
      ? _init.conditions
      : DRYWALL_TEMPLATE.map((t, i) => createCondition(t, i))
  );
  const [activeCondId, setActiveCondId] = useState(_init.activeCondId || null);
  const [openFolders, setOpenFolders] = useState({ Walls: true, Ceilings: true, Counts: true, Insulation: false, "Add-Ons": false });
  const [showAddCond, setShowAddCond] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [hiddenFolders, setHiddenFolders] = useState(_init.hiddenFolders || {}); // { folderName: true } = hidden

  // Bid Areas
  const [bidAreas, setBidAreas] = useState(
    _init.bidAreas && _init.bidAreas.length > 0
      ? _init.bidAreas
      : [{ id: "ba_default", name: "Unassigned" }]
  );
  const [activeBidAreaId, setActiveBidAreaId] = useState(_init.activeBidAreaId || "ba_default");
  const [showBidAreaAdd, setShowBidAreaAdd] = useState(false);
  const [newBidAreaName, setNewBidAreaName] = useState("");

  // Multi-Condition links — when a linear condition is drawn, auto-create linked measurements
  // Format: { parentCondId: [{ condId, calcType }] }
  // calcType: "sf_both_sides" = LF * height * 2, "sf_one_side" = LF * height, "pct" = LF * pct
  const [condLinks, setCondLinks] = useState(_init.condLinks || {});
  const [showLinkSetup, setShowLinkSetup] = useState(false);

  // View mode (drawing vs summary)
  const [viewMode, setViewMode] = useState("drawing"); // "drawing" | "summary"
  const [summaryGroupBy, setSummaryGroupBy] = useState("condition"); // "condition" | "bidArea" | "page" | "folder"

  // Context menu for right-click on measurements
  const [contextMenu, setContextMenu] = useState(null); // { x, y, measurementId }
  const [condSearch, setCondSearch] = useState("");

  // Measurements — now linked to conditions + bid areas
  const [measurements, setMeasurements] = useState(_init.measurements || {});
  const [activeVertices, setActiveVertices] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  // ── Change Order Overlay ──
  // revisionDocs: { [pageKey]: { doc, revPage, name } } — revision PDF docs mapped to specific sheets
  const [revisionDocs, setRevisionDocs] = useState({});
  const [revisionOpacity, setRevisionOpacity] = useState(0.4);
  const [showRevision, setShowRevision] = useState(true);
  const [coMode, setCoMode] = useState(null); // null = off, "add" = additions, "delete" = deletions
  const [coMeasurements, setCoMeasurements] = useState(_init.coMeasurements || {}); // { [pageKey]: [{ ...measurement, coType }] }
  const revisionCanvasRef = useRef(null);
  const revisionInputRef = useRef(null);

  // ── Typical Groups ──
  // { id, name, sourceMeasurementIds: string[], sourcePageKey, instances: [{ id, pageKey, offset:{x,y}, multiplier }] }
  const [typicalGroups, setTypicalGroups] = useState(_init.typicalGroups || []);
  const [selectedMeasIds, setSelectedMeasIds] = useState(new Set()); // for multi-select before "Create Typical"
  const [showTypicalCreate, setShowTypicalCreate] = useState(false);
  const [typicalName, setTypicalName] = useState("");
  const [placingTypicalId, setPlacingTypicalId] = useState(null); // ID of typical being placed
  const [showTypicalPanel, setShowTypicalPanel] = useState(false);

  // ── Auto-save: debounced state change notification ──
  const saveTimerRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null); // timestamp for save indicator
  useEffect(() => {
    if (!onTakeoffStateChange) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onTakeoffStateChange({
        measurements,
        conditions,
        condLinks,
        sheetNames,
        calibrations,
        bidAreas,
        hiddenFolders,
        activeCondId,
        activeBidAreaId,
        pdfFileNames: pdfFiles.map(pf => pf.name),
        activePdfIdx,
        typicalGroups,
        coMeasurements,
      });
      setLastSaved(Date.now());
    }, 800); // 800ms debounce
    return () => clearTimeout(saveTimerRef.current);
  }, [measurements, conditions, condLinks, sheetNames, calibrations, bidAreas, hiddenFolders, activeCondId, activeBidAreaId, typicalGroups, coMeasurements]);

  // Refs
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const fitScaleRef = useRef(1);
  const touchRef = useRef({ startDist: 0, startScale: 1 });

  const ppf = calibrations[pageKey] || null;
  const pageMeasurements = measurements[pageKey] || [];
  const activeCond = conditions.find(c => c.id === activeCondId) || null;

  // ── Helper functions (must be defined before useMemo/useCallback that use them) ──
  const getSheetName = (pg) => sheetNames[activePdfIdx + ":" + pg] || `Page ${pg}`;
  const setSheetName = (pg, name) => setSheetNames(prev => ({ ...prev, [activePdfIdx + ":" + pg]: name }));
  const getKeyName = (pk) => {
    if (sheetNames[pk]) return sheetNames[pk];
    const [pIdx, pg] = pk.split(":");
    const pf = pdfFiles[Number(pIdx)];
    const prefix = pdfFiles.length > 1 && pf ? pf.name.replace(/\.pdf$/i, "") + " — " : "";
    return prefix + `Page ${pg}`;
  };

  // CO page measurements + summary (must be before exportToExcel)
  const coPageMeasurements = coMeasurements[pageKey] || [];
  const coSummary = useMemo(() => {
    const allCo = Object.values(coMeasurements).flat();
    const adds = { lf: 0, sf: 0, ea: 0, cost: 0 };
    const dels = { lf: 0, sf: 0, ea: 0, cost: 0 };
    allCo.forEach(m => {
      const qty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
      const cond = conditions.find(c => c.id === m.conditionId);
      const asm = cond ? (assemblies || []).find(a => a.code === cond.asmCode) : null;
      const cost = asm ? qty * ((asm.matRate || 0) + (asm.labRate || 0)) : 0;
      const bucket = m.coType === "delete" ? dels : adds;
      if (m.type === "linear") bucket.lf += qty;
      else if (m.type === "area") bucket.sf += qty;
      else bucket.ea += qty;
      bucket.cost += cost;
    });
    return { adds, dels, net: adds.cost - dels.cost, total: allCo.length };
  }, [coMeasurements, conditions, assemblies]);

  // Compute condition totals from all measurements + typical group instances
  const condTotals = useMemo(() => {
    const totals = {};
    conditions.forEach(c => { totals[c.id] = { qty: 0, cost: 0 }; });
    Object.values(measurements).forEach(pageMeas => {
      pageMeas.forEach(m => {
        if (!totals[m.conditionId]) return;
        const qty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
        totals[m.conditionId].qty += qty;
        const cond = conditions.find(c => c.id === m.conditionId);
        const asm = cond ? (assemblies || []).find(a => a.code === cond.asmCode) : null;
        if (asm) totals[m.conditionId].cost += qty * ((asm.matRate || 0) + (asm.labRate || 0));
      });
    });
    // Add typical group instance quantities (instances multiply source measurements)
    typicalGroups.forEach(tg => {
      const totalInstMultiplier = tg.instances.reduce((s, inst) => s + (inst.multiplier || 1), 0);
      if (totalInstMultiplier === 0) return;
      const sourceMeas = (measurements[tg.sourcePageKey] || []).filter(m => tg.sourceMeasurementIds.includes(m.id));
      sourceMeas.forEach(m => {
        if (!totals[m.conditionId]) return;
        const baseQty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
        const extraQty = baseQty * totalInstMultiplier;
        totals[m.conditionId].qty += extraQty;
        const cond = conditions.find(c => c.id === m.conditionId);
        const asm = cond ? (assemblies || []).find(a => a.code === cond.asmCode) : null;
        if (asm) totals[m.conditionId].cost += extraQty * ((asm.matRate || 0) + (asm.labRate || 0));
      });
    });
    return totals;
  }, [measurements, conditions, assemblies, typicalGroups]);

  // Summary table data (grouped by various dimensions)
  const summaryRows = useMemo(() => {
    const allMeas = Object.values(measurements).flat();
    const rows = [];
    if (summaryGroupBy === "condition") {
      conditions.forEach(c => {
        const meas = allMeas.filter(m => m.conditionId === c.id);
        if (meas.length === 0) return;
        const qty = meas.reduce((s, m) => s + (m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0)), 0);
        const asm = (assemblies || []).find(a => a.code === c.asmCode);
        const matCost = asm ? qty * (asm.matRate || 0) : 0;
        const labCost = asm ? qty * (asm.labRate || 0) : 0;
        rows.push({ key: c.id, name: c.name, folder: c.folder, color: c.color, unit: c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF", qty, matCost, labCost, total: matCost + labCost, measCount: meas.length });
      });
    } else if (summaryGroupBy === "bidArea") {
      bidAreas.forEach(ba => {
        const meas = allMeas.filter(m => m.bidAreaId === ba.id);
        if (meas.length === 0) return;
        const qty = meas.length;
        const cost = meas.reduce((s, m) => {
          const c = conditions.find(cc => cc.id === m.conditionId);
          const asm = c ? (assemblies || []).find(a => a.code === c.asmCode) : null;
          const q = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
          return s + (asm ? q * ((asm.matRate || 0) + (asm.labRate || 0)) : 0);
        }, 0);
        rows.push({ key: ba.id, name: ba.name, folder: "", color: "#888", unit: "mixed", qty, matCost: 0, labCost: 0, total: cost, measCount: qty });
      });
    } else if (summaryGroupBy === "page") {
      Object.entries(measurements).forEach(([pg, meas]) => {
        if (meas.length === 0) return;
        const cost = meas.reduce((s, m) => {
          const c = conditions.find(cc => cc.id === m.conditionId);
          const asm = c ? (assemblies || []).find(a => a.code === c.asmCode) : null;
          const q = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
          return s + (asm ? q * ((asm.matRate || 0) + (asm.labRate || 0)) : 0);
        }, 0);
        rows.push({ key: pg, name: getKeyName(pg), folder: "", color: "#888", unit: "mixed", qty: meas.length, matCost: 0, labCost: 0, total: cost, measCount: meas.length });
      });
    } else if (summaryGroupBy === "folder") {
      const folderMap = {};
      conditions.forEach(c => { if (!folderMap[c.folder]) folderMap[c.folder] = []; folderMap[c.folder].push(c); });
      Object.entries(folderMap).forEach(([folder, conds]) => {
        let totalCost = 0, measCount = 0;
        conds.forEach(c => {
          const meas = allMeas.filter(m => m.conditionId === c.id);
          measCount += meas.length;
          meas.forEach(m => {
            const asm = (assemblies || []).find(a => a.code === c.asmCode);
            const q = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
            totalCost += asm ? q * ((asm.matRate || 0) + (asm.labRate || 0)) : 0;
          });
        });
        if (measCount === 0) return;
        rows.push({ key: folder, name: folder, folder: "", color: "#888", unit: "mixed", qty: measCount, matCost: 0, labCost: 0, total: totalCost, measCount });
      });
    }
    return rows;
  }, [measurements, conditions, assemblies, bidAreas, summaryGroupBy, sheetNames]);

  // Grand total with mat/lab split (includes typical group instances)
  const { grandTotal, totalMat, totalLab } = useMemo(() => {
    let mat = 0, lab = 0;
    Object.values(measurements).flat().forEach(m => {
      const cond = conditions.find(c => c.id === m.conditionId);
      const asm = cond ? (assemblies || []).find(a => a.code === cond.asmCode) : null;
      if (!asm) return;
      const qty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
      mat += qty * (asm.matRate || 0);
      lab += qty * (asm.labRate || 0);
    });
    // Add typical group instance multiplier costs
    typicalGroups.forEach(tg => {
      const totalInstMultiplier = tg.instances.reduce((s, inst) => s + (inst.multiplier || 1), 0);
      if (totalInstMultiplier === 0) return;
      const sourceMeas = (measurements[tg.sourcePageKey] || []).filter(m => tg.sourceMeasurementIds.includes(m.id));
      sourceMeas.forEach(m => {
        const cond = conditions.find(c => c.id === m.conditionId);
        const asm = cond ? (assemblies || []).find(a => a.code === cond.asmCode) : null;
        if (!asm) return;
        const baseQty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
        const extraQty = baseQty * totalInstMultiplier;
        mat += extraQty * (asm.matRate || 0);
        lab += extraQty * (asm.labRate || 0);
      });
    });
    return { grandTotal: mat + lab, totalMat: mat, totalLab: lab };
  }, [measurements, conditions, assemblies, typicalGroups]);

  // ── Excel Export ──
  const exportToExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const allMeas = Object.values(measurements).flat();
    const today = new Date().toLocaleDateString();

    // ── Sheet 1: Condition Detail (the main takeoff sheet) ──
    const condRows = [];
    let currentFolder = "";
    // Sort conditions by folder then name for clean grouping
    const sortedConds = [...conditions].sort((a, b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name));
    sortedConds.forEach(c => {
      const meas = allMeas.filter(m => m.conditionId === c.id);
      if (meas.length === 0) return;
      const qty = meas.reduce((s, m) => s + (m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0)), 0);
      const unit = c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF";
      const asm = (assemblies || []).find(a => a.code === c.asmCode);
      const matCost = asm ? qty * (asm.matRate || 0) : 0;
      const labCost = asm ? qty * (asm.labRate || 0) : 0;
      // Add folder header row when folder changes
      if (c.folder !== currentFolder) {
        condRows.push({ Folder: c.folder, Condition: "", Code: "", Qty: "", Unit: "", "Mat $": "", "Lab $": "", "Total $": "" });
        currentFolder = c.folder;
      }
      condRows.push({
        Folder: "",
        Condition: c.name,
        Code: c.asmCode || "",
        Qty: Math.round(qty),
        Unit: unit,
        "Mat $": Math.round(matCost * 100) / 100,
        "Lab $": Math.round(labCost * 100) / 100,
        "Total $": Math.round((matCost + labCost) * 100) / 100,
      });
    });
    // Grand total row
    condRows.push({
      Folder: "",
      Condition: "GRAND TOTAL",
      Code: "",
      Qty: "",
      Unit: "",
      "Mat $": Math.round(totalMat * 100) / 100,
      "Lab $": Math.round(totalLab * 100) / 100,
      "Total $": Math.round(grandTotal * 100) / 100,
    });

    const ws1 = XLSX.utils.json_to_sheet(condRows);
    // Set column widths
    ws1["!cols"] = [
      { wch: 14 }, // Folder
      { wch: 30 }, // Condition
      { wch: 8 },  // Code
      { wch: 10 }, // Qty
      { wch: 6 },  // Unit
      { wch: 12 }, // Mat $
      { wch: 12 }, // Lab $
      { wch: 12 }, // Total $
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Takeoff Detail");

    // ── Sheet 2: By Bid Area ──
    if (bidAreas.length > 1 || (bidAreas.length === 1 && bidAreas[0].id !== "ba_default")) {
      const areaRows = [];
      bidAreas.forEach(ba => {
        const baMeas = allMeas.filter(m => m.bidAreaId === ba.id);
        if (baMeas.length === 0) return;
        areaRows.push({ "Bid Area": ba.name, Condition: "", Qty: "", Unit: "", "Total $": "" });
        // Group by condition within each bid area
        conditions.forEach(c => {
          const meas = baMeas.filter(m => m.conditionId === c.id);
          if (meas.length === 0) return;
          const qty = meas.reduce((s, m) => s + (m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0)), 0);
          const unit = c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF";
          const asm = (assemblies || []).find(a => a.code === c.asmCode);
          const cost = asm ? qty * ((asm.matRate || 0) + (asm.labRate || 0)) : 0;
          areaRows.push({
            "Bid Area": "",
            Condition: c.name,
            Qty: Math.round(qty),
            Unit: unit,
            "Total $": Math.round(cost * 100) / 100,
          });
        });
      });
      const ws2 = XLSX.utils.json_to_sheet(areaRows);
      ws2["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 6 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, "By Bid Area");
    }

    // ── Sheet 3: By Sheet/Page ──
    const sheetRows = [];
    Object.entries(measurements).forEach(([pg, meas]) => {
      if (meas.length === 0) return;
      const sName = getKeyName(pg);
      sheetRows.push({ Sheet: sName, Condition: "", Qty: "", Unit: "", "Total $": "" });
      conditions.forEach(c => {
        const cMeas = meas.filter(m => m.conditionId === c.id);
        if (cMeas.length === 0) return;
        const qty = cMeas.reduce((s, m) => s + (m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0)), 0);
        const unit = c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF";
        const asm = (assemblies || []).find(a => a.code === c.asmCode);
        const cost = asm ? qty * ((asm.matRate || 0) + (asm.labRate || 0)) : 0;
        sheetRows.push({ Sheet: "", Condition: c.name, Qty: Math.round(qty), Unit: unit, "Total $": Math.round(cost * 100) / 100 });
      });
    });
    if (sheetRows.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(sheetRows);
      ws3["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 10 }, { wch: 6 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws3, "By Sheet");
    }

    // ── Sheet 4: Change Orders ──
    const allCo = Object.values(coMeasurements).flat();
    if (allCo.length > 0) {
      const coRows = [];
      allCo.forEach(m => {
        const cond = conditions.find(c => c.id === m.conditionId);
        const qty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
        const unit = m.type === "count" ? "EA" : m.type === "area" ? "SF" : "LF";
        const asm = cond ? (assemblies || []).find(a => a.code === cond.asmCode) : null;
        const cost = asm ? qty * ((asm.matRate || 0) + (asm.labRate || 0)) : 0;
        coRows.push({
          Type: m.coType === "delete" ? "DELETION" : "ADDITION",
          Condition: cond?.name || "Unknown",
          Qty: Math.round(qty),
          Unit: unit,
          "Cost $": Math.round(cost * 100) / 100,
          Sheet: getKeyName(m.page || ""),
        });
      });
      // Net summary rows
      coRows.push({ Type: "", Condition: "", Qty: "", Unit: "", "Cost $": "", Sheet: "" });
      coRows.push({ Type: "ADDITIONS TOTAL", Condition: "", Qty: "", Unit: "", "Cost $": Math.round(coSummary.adds.cost * 100) / 100, Sheet: "" });
      coRows.push({ Type: "DELETIONS TOTAL", Condition: "", Qty: "", Unit: "", "Cost $": Math.round(coSummary.dels.cost * 100) / 100, Sheet: "" });
      coRows.push({ Type: "NET CHANGE", Condition: "", Qty: "", Unit: "", "Cost $": Math.round(coSummary.net * 100) / 100, Sheet: "" });
      const ws4 = XLSX.utils.json_to_sheet(coRows);
      ws4["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, ws4, "Change Orders");
    }

    // ── Download ──
    const safeName = (fileName || "takeoff").replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_\- ]/g, "");
    XLSX.writeFile(wb, `${safeName}_Takeoff_${today.replace(/\//g, "-")}.xlsx`);
  }, [measurements, conditions, assemblies, bidAreas, grandTotal, totalMat, totalLab, fileName, coMeasurements, coSummary]);

  // Folders
  const folders = useMemo(() => {
    const map = {};
    conditions.forEach(c => {
      if (!map[c.folder]) map[c.folder] = [];
      map[c.folder].push(c);
    });
    return map;
  }, [conditions]);

  // ── Auto Name: extract sheet numbers + names from title blocks ──
  const [autoNaming, setAutoNaming] = useState(false);
  const autoNamePages = useCallback(async (doc, pdfIdx) => {
    setAutoNaming(true);
    try {
      for (let pg = 1; pg <= doc.numPages; pg++) {
        const pk = pdfIdx + ":" + pg;
        // Skip pages that already have custom names
        if (sheetNames[pk]) continue;
        try {
          const page = await doc.getPage(pg);
          const textContent = await page.getTextContent();
          const vp = page.getViewport({ scale: 1 });
          const pageW = vp.width, pageH = vp.height;

          // Collect all text items with positions
          const items = textContent.items.map(item => ({
            str: item.str.trim(),
            x: item.transform[4],
            y: item.transform[5],
            // Normalize position as fraction of page (0-1)
            nx: item.transform[4] / pageW,
            ny: 1 - (item.transform[5] / pageH), // flip Y since PDF Y is bottom-up
          })).filter(item => item.str.length > 0);

          // ── Find sheet number ──
          // Common patterns: A1, A1.1, A-101, S200, M-301, etc.
          // Usually in bottom-right title block area (nx > 0.7, ny > 0.8)
          const sheetNumRegex = /^([A-Z]{1,2}[\-\.]?\d{1,3}(?:\.\d{1,2})?)$/i;
          let sheetNum = "";
          let sheetTitle = "";

          // Look for sheet number in title block area (right 35%, bottom 25%)
          const titleBlockItems = items.filter(i => i.nx > 0.65 && i.ny > 0.75);
          // Also look in wider area for sheet titles
          const wideItems = items.filter(i => i.ny > 0.7);

          // Find sheet number
          for (const item of titleBlockItems) {
            if (sheetNumRegex.test(item.str)) {
              sheetNum = item.str.toUpperCase();
              break;
            }
          }
          // If not found in title block, search wider
          if (!sheetNum) {
            for (const item of wideItems) {
              if (sheetNumRegex.test(item.str)) {
                sheetNum = item.str.toUpperCase();
                break;
              }
            }
          }

          // ── Find sheet title ──
          // Look for common plan names near the title block
          const planNamePatterns = [
            /FLOOR\s*PLAN/i, /CONSTRUCTION\s*PLAN/i, /CEILING\s*PLAN/i, /REFLECTED\s*CEILING/i,
            /DEMOLITION\s*PLAN/i, /SITE\s*PLAN/i, /ROOF\s*PLAN/i, /ELEVATION/i,
            /SECTION/i, /DETAIL/i, /SCHEDULE/i, /PARTITION\s*PLAN/i,
            /POWER\s*PLAN/i, /LIGHTING\s*PLAN/i, /MECHANICAL/i, /PLUMBING/i,
            /ELECTRICAL/i, /FRAMING\s*PLAN/i, /FOUNDATION/i, /INTERIOR\s*ELEVATION/i,
            /EXTERIOR\s*ELEVATION/i, /FINISH\s*PLAN/i, /DOOR\s*SCHEDULE/i,
            /WALL\s*SECTION/i, /TITLE\s*SHEET/i, /COVER\s*SHEET/i, /GENERAL\s*NOTES/i,
            /INDEX\s*OF/i, /SPECIFICATIONS/i, /LIFE\s*SAFETY/i,
          ];

          // Combine adjacent text items on similar Y positions to form full titles
          const sortedByY = [...wideItems].sort((a, b) => a.ny - b.ny);
          const textLines = [];
          let currentLine = "";
          let lastY = -1;
          sortedByY.forEach(item => {
            if (lastY >= 0 && Math.abs(item.ny - lastY) > 0.008) {
              if (currentLine.trim()) textLines.push(currentLine.trim());
              currentLine = "";
            }
            currentLine += (currentLine ? " " : "") + item.str;
            lastY = item.ny;
          });
          if (currentLine.trim()) textLines.push(currentLine.trim());

          // Search lines for plan name patterns
          for (const line of textLines) {
            for (const pattern of planNamePatterns) {
              if (pattern.test(line)) {
                // Use the matching line (truncate if too long)
                sheetTitle = line.length > 40 ? line.substring(0, 40).trim() : line;
                break;
              }
            }
            if (sheetTitle) break;
          }

          // ── Build the auto-name ──
          if (sheetNum || sheetTitle) {
            const autoName = [sheetNum, sheetTitle].filter(Boolean).join(" - ") || `Page ${pg}`;
            setSheetNames(prev => ({ ...prev, [pk]: autoName }));
          }

          // ── Auto scale detection ──
          // Look for scale text like: 1/8" = 1'-0", 1/4" = 1'-0", 3/16" = 1'-0", SCALE: 1/8" = 1'0"
          const scaleRegex = /(\d+\/\d+)[""]?\s*=\s*1['']\s*-?\s*0[""]?/i;
          const fullScaleRegex = /SCALE\s*:\s*(\d+\/\d+)[""]?\s*=\s*1['']\s*-?\s*0[""]?/i;
          const scaleMap = { "1/8": 96, "3/16": 64, "1/4": 48, "3/8": 32, "1/2": 24, "3/4": 16, "1": 12 };

          if (!calibrations[pk]) {
            for (const line of textLines) {
              const match = line.match(fullScaleRegex) || line.match(scaleRegex);
              if (match) {
                const fraction = match[1];
                // Convert architectural scale to pixels-per-foot
                // At 72 DPI (PDF default), 1 inch = 72 points
                // Scale 1/8" = 1'-0" means 1 foot = 8 * 72 = 576 points... but we don't know the scan DPI
                // Instead, store the scale factor so we can suggest it during calibration
                const feetPerInch = scaleMap[fraction];
                if (feetPerInch) {
                  // Store as hint — actual ppf depends on PDF resolution
                  // We'll show it as a suggestion in the scale UI
                  setSheetNames(prev => {
                    const existing = prev[pk] || `Page ${pg}`;
                    const scaleNote = ` (${fraction}" = 1'-0")`;
                    return { ...prev, [pk]: existing.includes("=") ? existing : existing + scaleNote };
                  });
                }
                break;
              }
            }
          }
        } catch (err) {
          // Skip pages that fail text extraction
          console.warn(`Auto-name failed for page ${pg}:`, err.message);
        }
      }
    } finally {
      setAutoNaming(false);
    }
  }, [sheetNames, calibrations]);

  // ── Load initial PDF into pdfFiles on mount ──
  useEffect(() => {
    if (!pdfData) return;
    let cancelled = false;
    pdfjsLib.getDocument({ data: pdfData }).promise.then((doc) => {
      if (!cancelled) {
        setPdfFiles([{ name: fileName || "Drawing", data: pdfData, doc, numPages: doc.numPages }]);
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
        setActivePdfIdx(0);
        // Save to IndexedDB for persistence
        if (takeoffId) {
          savePdfToIDB(`${takeoffId}_0`, pdfData).catch(() => {});
        }
        // Auto-name pages from title blocks
        autoNamePages(doc, 0);
      }
    });
    return () => { cancelled = true; };
  }, [pdfData]);

  // ── Auto-load PDFs from IndexedDB when reopening without pdfData ──
  useEffect(() => {
    if (pdfData || !takeoffId || !_init.pdfFileNames || _init.pdfFileNames.length === 0) return;
    let cancelled = false;
    (async () => {
      const loaded = [];
      for (let i = 0; i < _init.pdfFileNames.length; i++) {
        const data = await loadPdfFromIDB(`${takeoffId}_${i}`).catch(() => null);
        if (!data || cancelled) continue;
        const doc = await pdfjsLib.getDocument({ data }).promise;
        loaded.push({ name: _init.pdfFileNames[i], data, doc, numPages: doc.numPages });
      }
      if (cancelled || loaded.length === 0) return;
      setPdfFiles(loaded);
      setPdf(loaded[0].doc);
      setNumPages(loaded[0].numPages);
      setPage(1);
      setActivePdfIdx(0);
    })();
    return () => { cancelled = true; };
  }, [takeoffId]);

  // ── Switch active PDF when activePdfIdx changes ──
  useEffect(() => {
    const pf = pdfFiles[activePdfIdx];
    if (!pf) return;
    setPdf(pf.doc);
    setNumPages(pf.numPages);
    setPage(1);
    setActiveVertices([]);
  }, [activePdfIdx, pdfFiles.length]);

  // ── Add additional PDF files ──
  const handleAddPdf = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      pdfjsLib.getDocument({ data }).promise.then((doc) => {
        const newIdx = pdfFiles.length;
        setPdfFiles(prev => [...prev, { name: file.name, data, doc, numPages: doc.numPages }]);
        setActivePdfIdx(newIdx);
        // Save to IndexedDB
        if (takeoffId) savePdfToIDB(`${takeoffId}_${newIdx}`, data).catch(() => {});
        // Auto-name pages
        autoNamePages(doc, newIdx);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Render page ──
  useEffect(() => {
    if (!pdf || !pdfCanvasRef.current) return;
    let cancelled = false;
    setRendering(true);
    pdf.getPage(page).then((p) => {
      if (cancelled) return;
      const container = containerRef.current;
      const cw = container ? container.clientWidth - 32 : 800;
      const base = p.getViewport({ scale: 1 });
      const fs = cw / base.width;
      fitScaleRef.current = fs;
      const vp = p.getViewport({ scale: fs * zoom });
      const canvas = pdfCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      canvas.width = vp.width * dpr;
      canvas.height = vp.height * dpr;
      canvas.style.width = `${vp.width}px`;
      canvas.style.height = `${vp.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const overlay = overlayCanvasRef.current;
      if (overlay) {
        overlay.width = vp.width * dpr;
        overlay.height = vp.height * dpr;
        overlay.style.width = `${vp.width}px`;
        overlay.style.height = `${vp.height}px`;
      }
      p.render({ canvasContext: ctx, viewport: vp }).promise.then(() => { if (!cancelled) setRendering(false); });
    });
    return () => { cancelled = true; };
  }, [pdf, page, zoom]);

  // ── Render revision PDF overlay ──
  useEffect(() => {
    const revCanvas = revisionCanvasRef.current;
    if (!revCanvas) return;
    const rev = revisionDocs[pageKey];
    if (!rev || !rev.doc || !showRevision) {
      // Clear revision canvas
      const ctx = revCanvas.getContext("2d");
      ctx.clearRect(0, 0, revCanvas.width, revCanvas.height);
      return;
    }
    let cancelled = false;
    rev.doc.getPage(rev.revPage || 1).then(p => {
      if (cancelled) return;
      const container = containerRef.current;
      const cw = container ? container.clientWidth - 32 : 800;
      const base = p.getViewport({ scale: 1 });
      const fs = cw / base.width;
      const vp = p.getViewport({ scale: fs * zoom });
      const dpr = window.devicePixelRatio || 1;
      revCanvas.width = vp.width * dpr;
      revCanvas.height = vp.height * dpr;
      revCanvas.style.width = `${vp.width}px`;
      revCanvas.style.height = `${vp.height}px`;
      const ctx = revCanvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vp.width, vp.height);
      p.render({ canvasContext: ctx, viewport: vp }).promise;
    });
    return () => { cancelled = true; };
  }, [revisionDocs, pageKey, showRevision, zoom]);

  // ── Upload revision PDF for current sheet ──
  const handleRevisionUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      pdfjsLib.getDocument({ data }).promise.then(doc => {
        setRevisionDocs(prev => ({
          ...prev,
          [pageKey]: { doc, revPage: 1, name: file.name, numPages: doc.numPages },
        }));
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // ── CO measurement helpers ──
  const addCoMeasurement = (m) => {
    setCoMeasurements(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), m] }));
  };

  const deleteCoMeasurement = (id) => {
    setCoMeasurements(prev => ({ ...prev, [pageKey]: (prev[pageKey] || []).filter(m => m.id !== id) }));
  };

  // ── Draw overlay ──
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const scale = fitScaleRef.current * zoom;

    // Draw completed measurements — color by condition (skip hidden layers)
    pageMeasurements.forEach((m) => {
      const cond = conditions.find(c => c.id === m.conditionId);
      if (cond && hiddenFolders[cond.folder]) return; // layer hidden
      const color = cond?.color || "#3b82f6";

      if (m.type === "linear") {
        const pts = m.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        pts.forEach(p => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
        if (pts.length >= 2) {
          const mid = pts[Math.floor(pts.length / 2)];
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          const txt = `${m.totalFt.toFixed(1)}' LF`;
          const tw = ctx.measureText(txt).width + 10;
          ctx.fillRect(mid.x - tw / 2, mid.y - 18, tw, 16);
          ctx.fillStyle = "#fff";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(txt, mid.x, mid.y - 6);
        }
      } else if (m.type === "area") {
        const pts = m.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
        ctx.fillStyle = color + "22";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        pts.forEach(p => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const txt = `${m.totalSf.toFixed(0)} SF`;
        const tw = ctx.measureText(txt).width + 10;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(cx - tw / 2, cy - 8, tw, 16);
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(txt, cx, cy + 4);
      } else if (m.type === "count") {
        const pt = { x: m.point.x * scale, y: m.point.y * scale };
        // Outer circle
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color + "44";
        ctx.fill();
        // Inner dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Count number
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(pt.x + 10, pt.y - 8, 18, 14);
        ctx.fillStyle = "#fff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(m.count || 1, pt.x + 19, pt.y + 3);
      }
    });

    // Draw calibration points
    calPoints.forEach(p => {
      const sx = p.x * scale, sy = p.y * scale;
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
    });
    if (calPoints.length === 2) {
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(calPoints[0].x * scale, calPoints[0].y * scale);
      ctx.lineTo(calPoints[1].x * scale, calPoints[1].y * scale); ctx.stroke(); ctx.setLineDash([]);
    }

    // Draw active measurement in progress
    if (activeVertices.length > 0 && activeCond) {
      const color = activeCond.color;
      const pts = activeVertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      if (mousePos) ctx.lineTo(mousePos.x, mousePos.y);
      if (mode === MODE.AREA && pts.length > 1) ctx.closePath();
      ctx.stroke(); ctx.setLineDash([]);
      pts.forEach(p => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });

      // Running measurement at cursor
      if (ppf && mousePos) {
        let totalPx = 0;
        for (let i = 1; i < pts.length; i++) totalPx += dist(pts[i - 1], pts[i]);
        totalPx += dist(pts[pts.length - 1], mousePos);
        const ft = totalPx / (ppf * fitScaleRef.current * zoom);
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(mousePos.x + 14, mousePos.y - 10, 70, 18);
        ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`${ft.toFixed(1)}' LF`, mousePos.x + 18, mousePos.y + 3);
      }
    }

    // Draw selection highlights for Typical Group creation (cyan dashed outline)
    if (selectedMeasIds.size > 0) {
      pageMeasurements.filter(m => selectedMeasIds.has(m.id)).forEach(m => {
        ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
        if (m.vertices) {
          const pts = m.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
          ctx.beginPath();
          pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          if (m.type === "area") ctx.closePath();
          ctx.stroke();
        } else if (m.point) {
          const pt = { x: m.point.x * scale, y: m.point.y * scale };
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.setLineDash([]);
      });
    }

    // Draw typical group instances on this page (ghost rendering with dashed lines)
    typicalGroups.forEach(tg => {
      const sourceMeas = (measurements[tg.sourcePageKey] || []).filter(m => tg.sourceMeasurementIds.includes(m.id));
      tg.instances.filter(inst => inst.pageKey === pageKey).forEach(inst => {
        const ox = inst.offset.x * scale, oy = inst.offset.y * scale;
        sourceMeas.forEach(m => {
          const cond = conditions.find(c => c.id === m.conditionId);
          const color = cond?.color || "#888";
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
          if (m.vertices) {
            const pts = m.vertices.map(v => ({ x: v.x * scale + ox, y: v.y * scale + oy }));
            ctx.beginPath();
            pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            if (m.type === "area") ctx.closePath();
            ctx.stroke();
          } else if (m.point) {
            const pt = { x: m.point.x * scale + ox, y: m.point.y * scale + oy };
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        });
        // Instance badge
        const badgeX = tg.sourceCenter.x * scale + ox;
        const badgeY = tg.sourceCenter.y * scale + oy - 20;
        const label = `${tg.name} (×${inst.multiplier || 1})`;
        ctx.font = "10px sans-serif";
        const tw = ctx.measureText(label).width + 10;
        ctx.fillStyle = "rgba(34,211,238,0.85)"; ctx.fillRect(badgeX - tw / 2, badgeY - 6, tw, 14);
        ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.fillText(label, badgeX, badgeY + 4);
      });
    });

    // Placing-typical cursor indicator
    if (placingTypicalId && mousePos) {
      const tg = typicalGroups.find(g => g.id === placingTypicalId);
      if (tg) {
        ctx.fillStyle = "rgba(34,211,238,0.85)"; ctx.fillRect(mousePos.x + 12, mousePos.y - 12, 120, 16);
        ctx.fillStyle = "#000"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`Place: ${tg.name}`, mousePos.x + 16, mousePos.y);
      }
    }

    // Draw CO measurements (green = additions, red = deletions)
    coPageMeasurements.forEach(m => {
      const coColor = m.coType === "delete" ? "#ef4444" : "#22c55e";
      ctx.globalAlpha = 0.7;
      if (m.type === "linear" && m.vertices) {
        const pts = m.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
        ctx.strokeStyle = coColor; ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
        ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
        ctx.setLineDash([]);
        const mid = pts[Math.floor(pts.length / 2)];
        const lbl = `${m.coType === "delete" ? "DEL" : "ADD"} ${m.totalFt.toFixed(1)}' LF`;
        ctx.font = "bold 10px sans-serif"; const tw = ctx.measureText(lbl).width + 8;
        ctx.fillStyle = coColor; ctx.fillRect(mid.x - tw / 2, mid.y - 18, tw, 16);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(lbl, mid.x, mid.y - 6);
      } else if (m.type === "area" && m.vertices) {
        const pts = m.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
        ctx.fillStyle = coColor + "22"; ctx.strokeStyle = coColor; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
        ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const lbl = `${m.coType === "delete" ? "DEL" : "ADD"} ${m.totalSf.toFixed(0)} SF`;
        ctx.font = "bold 10px sans-serif"; const tw = ctx.measureText(lbl).width + 8;
        ctx.fillStyle = coColor; ctx.fillRect(cx2 - tw / 2, cy2 - 8, tw, 16);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(lbl, cx2, cy2 + 4);
      } else if (m.type === "count" && m.point) {
        const pt = { x: m.point.x * scale, y: m.point.y * scale };
        ctx.strokeStyle = coColor; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = coColor; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(m.coType === "delete" ? "DEL" : "ADD", pt.x, pt.y + 3);
      }
      ctx.globalAlpha = 1;
    });

    // CO mode indicator
    if (coMode) {
      const ch = canvas.height / dpr;
      const coColor = coMode === "delete" ? "#ef4444" : "#22c55e";
      const coLabel = coMode === "delete" ? "CO: DELETIONS (red)" : "CO: ADDITIONS (green)";
      ctx.fillStyle = coColor + "CC"; ctx.fillRect(8, ch - 50, 160, 18);
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(coLabel, 14, ch - 37);
    }

    // Scale indicator
    if (ppf) {
      const ch = canvas.height / dpr;
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(8, ch - 28, 130, 20);
      ctx.fillStyle = "#4ade80"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`Scale set (${(1 / ppf).toFixed(4)}'/px)`, 14, ch - 14);
    }
  }, [pageMeasurements, calPoints, activeVertices, mousePos, mode, ppf, zoom, conditions, activeCond, hiddenFolders, selectedMeasIds, typicalGroups, measurements, pageKey, placingTypicalId, coPageMeasurements, coMode]);

  useEffect(() => { requestAnimationFrame(drawOverlay); }, [drawOverlay]);

  // ── Canvas interactions ──
  const getCanvasCoords = (e) => { const r = overlayCanvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const getNormCoords = (e) => { const p = getCanvasCoords(e); const s = fitScaleRef.current * zoom; return { x: p.x / s, y: p.y / s }; };

  const handleCanvasClick = (e) => {
    // Typical Group: placing an instance
    if (placingTypicalId) {
      placeTypicalInstance(getNormCoords(e));
      return;
    }
    // Shift+click: toggle measurement selection for Typical Groups
    if (e.shiftKey && mode === MODE.PAN) {
      const clickPt = getCanvasCoords(e);
      const scale = fitScaleRef.current * zoom;
      // Find the closest measurement within 15px
      let closest = null, closestDist = 15;
      pageMeasurements.forEach(m => {
        if (m.vertices) {
          m.vertices.forEach(v => {
            const d = dist({ x: v.x * scale, y: v.y * scale }, clickPt);
            if (d < closestDist) { closestDist = d; closest = m.id; }
          });
        } else if (m.point) {
          const d = dist({ x: m.point.x * scale, y: m.point.y * scale }, clickPt);
          if (d < closestDist) { closestDist = d; closest = m.id; }
        }
      });
      if (closest) toggleMeasSelection(closest);
      return;
    }
    if (mode === MODE.PAN) return;
    if (mode === MODE.CALIBRATE) {
      const pt = getNormCoords(e);
      if (calPoints.length < 2) { const next = [...calPoints, pt]; setCalPoints(next); if (next.length === 2) setShowCalPrompt(true); }
      return;
    }
    if (!activeCond) return;
    if (mode === MODE.COUNT) {
      const pt = getNormCoords(e);
      const m = { id: "m_" + Date.now(), type: "count", conditionId: activeCond.id, bidAreaId: activeBidAreaId, point: pt, count: 1, page: pageKey };
      if (coMode) {
        addCoMeasurement({ ...m, coType: coMode });
      } else {
        setMeasurements(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), m] }));
        setUndoStack(prev => [...prev, { action: "add", pageKey, measurementId: m.id }]);
      }
      return;
    }
    if (mode === MODE.LINEAR || mode === MODE.AREA) {
      setActiveVertices(prev => [...prev, getNormCoords(e)]);
    }
  };

  const handleCanvasDoubleClick = (e) => {
    e.preventDefault();
    if ((mode === MODE.LINEAR || mode === MODE.AREA) && activeVertices.length >= 2 && ppf && activeCond) finishMeasurement();
  };

  const finishMeasurement = () => {
    if (!ppf || activeVertices.length < 2 || !activeCond) return;
    const newMeasurements = [];
    const ts = Date.now();

    if (mode === MODE.LINEAR) {
      let totalPx = 0;
      for (let i = 1; i < activeVertices.length; i++) totalPx += dist(activeVertices[i - 1], activeVertices[i]);
      const totalFt = totalPx / ppf;
      const m = { id: "m_" + ts, type: "linear", conditionId: activeCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalFt, page: pageKey };
      newMeasurements.push(m);

      // Auto-create linked measurements (Multi-Condition Takeoff)
      const links = condLinks[activeCond.id] || [];
      links.forEach((link, i) => {
        const linkedCond = conditions.find(c => c.id === link.condId);
        if (!linkedCond) return;
        if (link.calcType === "sf_both_sides") {
          const sf = totalFt * (activeCond.height || 10) * 2;
          newMeasurements.push({ id: "m_" + ts + "_l" + i, type: "area", conditionId: linkedCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalSf: sf, page: pageKey, autoLinked: true });
        } else if (link.calcType === "sf_one_side") {
          const sf = totalFt * (activeCond.height || 10);
          newMeasurements.push({ id: "m_" + ts + "_l" + i, type: "area", conditionId: linkedCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalSf: sf, page: pageKey, autoLinked: true });
        } else if (link.calcType === "match_lf") {
          newMeasurements.push({ id: "m_" + ts + "_l" + i, type: "linear", conditionId: linkedCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalFt, page: pageKey, autoLinked: true });
        }
      });
    } else {
      const areaPx = polyArea(activeVertices);
      const m = { id: "m_" + ts, type: "area", conditionId: activeCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalSf: areaPx / (ppf * ppf), page: pageKey };
      newMeasurements.push(m);
    }

    if (coMode) {
      // CO mode: tag all measurements with coType and store separately
      newMeasurements.forEach(m => addCoMeasurement({ ...m, coType: coMode }));
    } else {
      setMeasurements(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), ...newMeasurements] }));
      newMeasurements.forEach(m => setUndoStack(prev => [...prev, { action: "add", pageKey, measurementId: m.id }]));
    }
    setActiveVertices([]);
  };

  const handleCanvasMove = (e) => {
    if (mode === MODE.LINEAR || mode === MODE.AREA || mode === MODE.COUNT) setMousePos(getCanvasCoords(e));
  };

  const confirmCalibration = () => {
    const ft = parseFloat(calInput);
    if (!ft || ft <= 0 || calPoints.length < 2) return;
    setCalibrations(prev => ({ ...prev, [pageKey]: dist(calPoints[0], calPoints[1]) / ft }));
    setCalPoints([]); setCalInput(""); setShowCalPrompt(false); setShowVerify(true); setMode(MODE.PAN);
  };

  // Apply scale to all pages of the current PDF
  const applyScaleToAll = () => {
    if (!ppf) return;
    const newCals = {};
    for (let i = 1; i <= numPages; i++) newCals[activePdfIdx + ":" + i] = ppf;
    setCalibrations(prev => ({ ...prev, ...newCals }));
  };

  // ── Typical Groups Logic ──
  const toggleMeasSelection = (measId) => {
    setSelectedMeasIds(prev => {
      const next = new Set(prev);
      if (next.has(measId)) next.delete(measId); else next.add(measId);
      return next;
    });
  };

  const createTypicalGroup = (name) => {
    if (!name || selectedMeasIds.size === 0) return;
    // Grab the source measurements
    const sourceMeas = pageMeasurements.filter(m => selectedMeasIds.has(m.id));
    if (sourceMeas.length === 0) return;
    // Calculate center point of the group (average of all vertices/points)
    let cx = 0, cy = 0, count = 0;
    sourceMeas.forEach(m => {
      if (m.vertices) { m.vertices.forEach(v => { cx += v.x; cy += v.y; count++; }); }
      else if (m.point) { cx += m.point.x; cy += m.point.y; count++; }
    });
    if (count > 0) { cx /= count; cy /= count; }

    const tg = {
      id: "tg_" + Date.now(),
      name,
      sourceMeasurementIds: [...selectedMeasIds],
      sourcePageKey: pageKey,
      sourceCenter: { x: cx, y: cy },
      instances: [],
    };
    setTypicalGroups(prev => [...prev, tg]);
    setSelectedMeasIds(new Set());
    setShowTypicalCreate(false);
    setTypicalName("");
  };

  const placeTypicalInstance = (clickPos) => {
    if (!placingTypicalId) return;
    const tg = typicalGroups.find(g => g.id === placingTypicalId);
    if (!tg) return;
    // Calculate offset from source center to click position (in normalized coords)
    const offset = { x: clickPos.x - tg.sourceCenter.x, y: clickPos.y - tg.sourceCenter.y };
    const instance = {
      id: "ti_" + Date.now(),
      pageKey,
      offset,
      multiplier: 1,
    };
    setTypicalGroups(prev => prev.map(g =>
      g.id === placingTypicalId ? { ...g, instances: [...g.instances, instance] } : g
    ));
    setPlacingTypicalId(null);
    setMode(MODE.PAN);
  };

  const deleteTypicalInstance = (groupId, instanceId) => {
    setTypicalGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, instances: g.instances.filter(i => i.id !== instanceId) } : g
    ));
  };

  const deleteTypicalGroup = (groupId) => {
    setTypicalGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const updateInstanceMultiplier = (groupId, instanceId, multiplier) => {
    setTypicalGroups(prev => prev.map(g =>
      g.id === groupId ? {
        ...g,
        instances: g.instances.map(i => i.id === instanceId ? { ...i, multiplier } : i)
      } : g
    ));
  };

  // Compute typical group quantities for summary — source + all instances
  const typicalTotals = useMemo(() => {
    const result = []; // { groupName, condName, condId, qty, unit, matCost, labCost }
    typicalGroups.forEach(tg => {
      // Get source measurements
      const sourceMeas = (measurements[tg.sourcePageKey] || []).filter(m => tg.sourceMeasurementIds.includes(m.id));
      // Total multiplier = 1 (source) + sum of instance multipliers
      const totalMultiplier = 1 + tg.instances.reduce((s, inst) => s + (inst.multiplier || 1), 0);
      // Aggregate by condition
      const condMap = {};
      sourceMeas.forEach(m => {
        const qty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0);
        if (!condMap[m.conditionId]) condMap[m.conditionId] = 0;
        condMap[m.conditionId] += qty;
      });
      Object.entries(condMap).forEach(([condId, baseQty]) => {
        const cond = conditions.find(c => c.id === condId);
        if (!cond) return;
        const totalQty = baseQty * totalMultiplier;
        const asm = (assemblies || []).find(a => a.code === cond.asmCode);
        result.push({
          groupName: tg.name,
          groupId: tg.id,
          condName: cond.name,
          condId,
          qty: totalQty,
          unit: cond.type === "count" ? "EA" : cond.type === "area" ? "SF" : "LF",
          matCost: asm ? totalQty * (asm.matRate || 0) : 0,
          labCost: asm ? totalQty * (asm.labRate || 0) : 0,
          instanceCount: tg.instances.length,
        });
      });
    });
    return result;
  }, [typicalGroups, measurements, conditions, assemblies]);

  const deleteMeasurement = (id) => { setMeasurements(prev => ({ ...prev, [pageKey]: (prev[pageKey] || []).filter(m => m.id !== id) })); };
  const cancelActive = () => { setActiveVertices([]); setMousePos(null); setCalPoints([]); setShowCalPrompt(false); };

  const undo = () => {
    if (activeVertices.length > 0) { setActiveVertices(prev => prev.slice(0, -1)); return; }
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    if (last.action === "add") deleteMeasurement(last.measurementId);
    setUndoStack(prev => prev.slice(0, -1));
  };

  // Nav
  const prevPage = () => { setPage(p => Math.max(1, p - 1)); setActiveVertices([]); };
  const nextPage = () => { setPage(p => Math.min(numPages, p + 1)); setActiveVertices([]); };
  const zoomIn = () => setZoom(s => Math.min(6, s + 0.25));
  const zoomOut = () => setZoom(s => Math.max(0.25, s - 0.25));
  const resetZoom = () => setZoom(1);

  // Scroll wheel zoom (no modifier key needed — just scroll to zoom like OST)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(s => {
      const factor = e.deltaY > 0 ? 0.9 : 1.1; // multiplicative for smooth feel
      return Math.min(6, Math.max(0.15, s * factor));
    });
  }, []);

  // Click-drag pan
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const handlePanStart = useCallback((e) => {
    if (mode !== MODE.PAN) return;
    const container = containerRef.current;
    if (!container) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
  }, [mode]);
  const handlePanMove = useCallback((e) => {
    if (!isPanning) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.x);
    container.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
  }, [isPanning]);
  const handlePanEnd = useCallback(() => { setIsPanning(false); }, []);

  // Touch pinch
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { startDist: Math.sqrt(dx * dx + dy * dy), startScale: zoom };
    }
  }, [zoom]);
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setZoom(Math.min(4, Math.max(0.5, touchRef.current.startScale * Math.sqrt(dx * dx + dy * dy) / (touchRef.current.startDist || 1))));
    }
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      // Don't intercept when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") { if (activeVertices.length > 0 || calPoints.length > 0) cancelActive(); else onClose(); return; }
      if (e.key === "Enter") { if (activeVertices.length >= 2 && ppf && activeCond) { finishMeasurement(); } return; }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.key === " ") { e.preventDefault(); setMode(m => m === MODE.PAN ? (activeCond ? activeCond.type : MODE.PAN) : MODE.PAN); return; }
      if (e.key === "l" || e.key === "L") { if (ppf) { setMode(MODE.LINEAR); cancelActive(); } return; }
      if (e.key === "a" || e.key === "A") { if (ppf) { setMode(MODE.AREA); cancelActive(); } return; }
      if (e.key === "c" || e.key === "C") { setMode(MODE.COUNT); cancelActive(); return; }
      if (e.key === "s" || e.key === "S") { setMode(MODE.CALIBRATE); cancelActive(); return; }
      if (e.key === "f" || e.key === "F") { resetZoom(); return; }
      if (e.key === "=" || e.key === "+") { zoomIn(); return; }
      if (e.key === "-") { zoomOut(); return; }
      // 1-9 quick-select conditions
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const flatConds = Object.values(folders).flat();
        if (flatConds[num - 1]) {
          const c = flatConds[num - 1];
          setActiveCondId(c.id);
          if (ppf) setMode(c.type);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeVertices, calPoints, activeCond, ppf, folders]);

  // Add new condition
  const addCondition = (asmCode) => {
    const asm = (assemblies || []).find(a => a.code === asmCode);
    if (!asm) return;
    const newCond = {
      id: "cond_" + Date.now(),
      name: asm.name,
      type: asm.unit === "EA" ? "count" : asm.unit === "SF" ? "area" : "linear",
      asmCode: asm.code,
      folder: asm.unit === "EA" ? "Counts" : asm.unit === "SF" ? "Ceilings" : "Walls",
      color: COND_COLORS[conditions.length % COND_COLORS.length],
      height: asm.unit === "LF" ? 10 : 0,
    };
    setConditions(prev => [...prev, newCond]);
    setActiveCondId(newCond.id);
    setShowAddCond(false);
  };

  const fmt = n => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtK = n => n >= 1000 ? "$" + (n / 1000).toFixed(1) + "K" : fmt(n);

  const btn = { padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer", fontSize: 12, transition: "all 0.2s" };
  const btnActive = { ...btn, background: "var(--amber)", color: "#000", borderColor: "var(--amber)", fontWeight: 600 };
  const btnDis = { ...btn, opacity: 0.4, cursor: "default" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.97)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top Toolbar ── */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.85)" }}>
        {/* Row 1: File info + Tools */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={onClose} style={{ ...btn, padding: "4px 8px", fontSize: 11, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" }}>✕</button>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pdfFiles.length > 1
                ? `${(pdfFiles[activePdfIdx]?.name || "PDF").replace(/\.pdf$/i, "")} — ${getSheetName(page)}`
                : numPages > 1 ? getSheetName(page) : (fileName || "Drawing")}
            </span>
            {onTakeoffStateChange && lastSaved && <span style={{ color: "#10b981", fontSize: 9 }}>✓</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button onClick={() => { setMode(MODE.PAN); cancelActive(); }} style={mode === MODE.PAN ? { ...btnActive, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} title="Space">Pan</button>
            <button onClick={() => { setMode(MODE.CALIBRATE); cancelActive(); }} style={mode === MODE.CALIBRATE ? { ...btnActive, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} title="S">{ppf ? "✓ Scale" : "Set Scale"}</button>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={() => { if (ppf) { setMode(MODE.LINEAR); cancelActive(); }}} style={!ppf ? { ...btnDis, padding: "3px 8px", fontSize: 11 } : mode === MODE.LINEAR ? { ...btnActive, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} disabled={!ppf} title="L">Linear</button>
            <button onClick={() => { if (ppf) { setMode(MODE.AREA); cancelActive(); }}} style={!ppf ? { ...btnDis, padding: "3px 8px", fontSize: 11 } : mode === MODE.AREA ? { ...btnActive, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} disabled={!ppf} title="A">Area</button>
            <button onClick={() => { setMode(MODE.COUNT); cancelActive(); }} style={mode === MODE.COUNT ? { ...btnActive, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} title="C">Count</button>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={undo} style={{ ...btn, padding: "3px 8px", fontSize: 11 }} title="Ctrl+Z">Undo</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button onClick={prevPage} style={page <= 1 ? { ...btnDis, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} disabled={page <= 1}>◀</button>
            <span style={{ color: "#ccc", fontSize: 10, minWidth: 40, textAlign: "center" }}>{page}/{numPages}</span>
            <button onClick={nextPage} style={page >= numPages ? { ...btnDis, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} disabled={page >= numPages}>▶</button>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={zoomOut} style={{ ...btn, padding: "3px 6px", fontSize: 11 }}>−</button>
            <span style={{ color: "#ccc", fontSize: 10, minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} style={{ ...btn, padding: "3px 6px", fontSize: 11 }}>+</button>
            <button onClick={resetZoom} style={{ ...btn, padding: "3px 6px", fontSize: 10 }} title="F">Fit</button>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={() => setViewMode(v => v === "drawing" ? "summary" : "drawing")}
              style={viewMode === "summary" ? { ...btnActive, padding: "3px 8px", fontSize: 11 } : { ...btn, padding: "3px 8px", fontSize: 11 }} title="Toggle summary view">
              {viewMode === "summary" ? "Drawing" : "Summary"}
            </button>
          </div>
        </div>
        {/* Row 2: Bid area + CO + Add PDF (compact, only shows when needed) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 10px 4px", gap: 4, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <select value={activeBidAreaId} onChange={e => setActiveBidAreaId(e.target.value)}
              style={{ padding: "2px 4px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 9, maxWidth: 100 }}>
              {bidAreas.map(ba => <option key={ba.id} value={ba.id}>{ba.name}</option>)}
            </select>
            <button onClick={() => setShowBidAreaAdd(true)} style={{ ...btn, fontSize: 8, padding: "2px 5px" }} title="Add bid area">+Area</button>
            <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)" }} />
            <button onClick={() => setCoMode(m => m === "add" ? null : "add")}
              style={coMode === "add" ? { ...btn, padding: "2px 6px", fontSize: 9, background: "rgba(34,197,94,0.25)", borderColor: "rgba(34,197,94,0.5)", color: "#22c55e", fontWeight: 600 } : { ...btn, fontSize: 9, padding: "2px 6px" }}
              title="Change Order: Mark additions">CO+</button>
            <button onClick={() => setCoMode(m => m === "delete" ? null : "delete")}
              style={coMode === "delete" ? { ...btn, padding: "2px 6px", fontSize: 9, background: "rgba(239,68,68,0.25)", borderColor: "rgba(239,68,68,0.5)", color: "#ef4444", fontWeight: 600 } : { ...btn, fontSize: 9, padding: "2px 6px" }}
              title="Change Order: Mark deletions">CO−</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => addPdfInputRef.current?.click()} style={{ ...btn, fontSize: 8, padding: "2px 5px", background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#60a5fa" }} title="Add another PDF file">+ PDF</button>
            <input ref={addPdfInputRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPdf(f); e.target.value = ""; }} />
            {(numPages > 1 || pdfFiles.length > 1) && (
              <button onClick={() => setShowSheets(v => !v)} style={{ ...btn, fontSize: 8, padding: "2px 5px" }}>
                {showSheets ? "Hide Sheets" : "Show Sheets"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body: sheets sidebar + canvas + conditions panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left Sidebar: Sheet Navigator (Multi-PDF) ── */}
        {showSheets && (numPages > 1 || pdfFiles.length > 1) && (
          <div style={{ width: 190, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.9)", overflow: "auto", padding: "8px 6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, padding: "0 4px" }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Sheets</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button onClick={() => { const pf = pdfFiles[activePdfIdx]; if (pf) autoNamePages(pf.doc, activePdfIdx); }}
                  disabled={autoNaming}
                  style={{ fontSize: 8, padding: "2px 5px", borderRadius: 3, border: "1px solid rgba(74,222,128,0.3)", background: autoNaming ? "rgba(74,222,128,0.2)" : "transparent", color: "#4ade80", cursor: autoNaming ? "wait" : "pointer" }}>
                  {autoNaming ? "Naming..." : "Auto Name"}
                </button>
                <span style={{ fontSize: 9, color: "#666" }}>{pdfFiles.reduce((s, pf) => s + pf.numPages, 0)}</span>
              </div>
            </div>
            {pdfFiles.map((pf, pIdx) => {
              const isActivePdf = pIdx === activePdfIdx;
              // Count total measurements across all pages of this PDF
              const pdfMeasCount = Array.from({ length: pf.numPages }, (_, i) => (measurements[pIdx + ":" + (i + 1)] || []).length).reduce((a, b) => a + b, 0);
              return (
                <div key={pIdx} style={{ marginBottom: 6 }}>
                  {/* PDF file header */}
                  {pdfFiles.length > 1 && (
                    <div onClick={() => setActivePdfIdx(pIdx)}
                      style={{
                        padding: "4px 6px", marginBottom: 2, borderRadius: 4, cursor: "pointer",
                        background: isActivePdf ? "rgba(59,130,246,0.12)" : "transparent",
                        border: isActivePdf ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent",
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                      <span style={{ fontSize: 10, color: "#60a5fa" }}>📄</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: isActivePdf ? "#fff" : "#999",
                        flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pf.name.replace(/\.pdf$/i, "")}
                      </span>
                      {pdfMeasCount > 0 && <span style={{ fontSize: 8, color: "#888" }}>{pdfMeasCount}</span>}
                    </div>
                  )}
                  {/* Pages for this PDF (only show if this is the active PDF or there's only one PDF) */}
                  {(isActivePdf || pdfFiles.length === 1) && Array.from({ length: pf.numPages }, (_, i) => i + 1).map(pg => {
                    const pk = pIdx + ":" + pg;
                    const isCurrent = isActivePdf && pg === page;
                    const hasScale = !!calibrations[pk];
                    const measCount = (measurements[pk] || []).length;
                    return (
                      <div key={pk}
                        onClick={() => { if (!isActivePdf) setActivePdfIdx(pIdx); setPage(pg); setActiveVertices([]); }}
                        style={{
                          padding: "5px 8px", marginBottom: 2, borderRadius: 5, cursor: "pointer",
                          marginLeft: pdfFiles.length > 1 ? 10 : 0,
                          background: isCurrent ? "rgba(224,148,34,0.12)" : "transparent",
                          border: isCurrent ? "1px solid rgba(224,148,34,0.3)" : "1px solid transparent",
                          transition: "all 0.15s",
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span title={hasScale ? "Scale set" : "No scale"} style={{
                            width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                            background: hasScale ? "#4ade80" : "#ef4444",
                          }} />
                          {editingSheet === pk ? (
                            <input autoFocus
                              value={sheetNames[pk] || ""}
                              placeholder={`Page ${pg}`}
                              onChange={e => setSheetName(pg, e.target.value)}
                              onBlur={() => setEditingSheet(null)}
                              onKeyDown={e => { if (e.key === "Enter") setEditingSheet(null); }}
                              onClick={e => e.stopPropagation()}
                              style={{ flex: 1, padding: "1px 4px", borderRadius: 3, border: "1px solid var(--amber)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 10, minWidth: 0 }}
                            />
                          ) : (
                            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingSheet(pk); }}
                              style={{ flex: 1, fontSize: 10, color: isCurrent ? "#fff" : "#aaa", fontWeight: isCurrent ? 600 : 400,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
                              title="Double-click to rename">
                              {sheetNames[pk] || `Page ${pg}`}
                            </span>
                          )}
                        </div>
                        {measCount > 0 && (
                          <div style={{ fontSize: 9, color: "#888", paddingLeft: 12, marginTop: 2 }}>
                            {measCount} measurement{measCount !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Apply scale to all button */}
            {ppf && (
              <button onClick={applyScaleToAll}
                style={{ ...btn, width: "100%", marginTop: 8, fontSize: 9, padding: "4px 6px", color: "#4ade80", borderColor: "rgba(74,222,128,0.2)" }}>
                Apply scale to all pages
              </button>
            )}
          </div>
        )}

        {/* Canvas area OR Summary view */}
        {viewMode === "drawing" ? (
          <div ref={containerRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onWheel={handleWheel}
            onMouseDown={handlePanStart} onMouseMove={handlePanMove} onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd}
            style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 12,
              cursor: mode === MODE.PAN ? (isPanning ? "grabbing" : "grab") : "crosshair" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <canvas ref={pdfCanvasRef} />
              <canvas ref={revisionCanvasRef}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none",
                  opacity: revisionDocs[pageKey] && showRevision ? revisionOpacity : 0,
                  mixBlendMode: "difference",
                }} />
              <canvas ref={overlayCanvasRef}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: mode === MODE.PAN ? "none" : "auto" }}
                onClick={(e) => { setContextMenu(null); handleCanvasClick(e); }}
                onDoubleClick={handleCanvasDoubleClick} onMouseMove={handleCanvasMove}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Find nearest measurement to right-click point
                  const pt = getNormCoords(e);
                  const scale = fitScaleRef.current * zoom;
                  let nearest = null, nearestDist = 30 / scale; // 30px threshold
                  pageMeasurements.forEach(m => {
                    if (m.type === "count") {
                      const d = dist(pt, m.point);
                      if (d < nearestDist) { nearest = m; nearestDist = d; }
                    } else if (m.vertices) {
                      m.vertices.forEach(v => { const d = dist(pt, v); if (d < nearestDist) { nearest = m; nearestDist = d; } });
                    }
                  });
                  if (nearest) setContextMenu({ x: e.clientX, y: e.clientY, measurementId: nearest.id });
                }} />
            </div>
          </div>
        ) : (
          /* ── SUMMARY VIEW ── */
          <div style={{ flex: 1, overflow: "auto", padding: 20, background: "rgba(10,12,18,0.95)" }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Takeoff Summary</h2>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#888", marginRight: 6 }}>Group by:</span>
                  {["condition", "bidArea", "page", "folder"].map(g => (
                    <button key={g} onClick={() => setSummaryGroupBy(g)}
                      style={summaryGroupBy === g ? btnActive : { ...btn, fontSize: 10, padding: "3px 10px" }}>
                      {g === "bidArea" ? "Area" : g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                  {summaryRows.length > 0 && (
                    <button onClick={exportToExcel} style={{ ...btn, fontSize: 10, padding: "3px 10px", marginLeft: 8, background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}>
                      Export Excel
                    </button>
                  )}
                </div>
              </div>

              {summaryRows.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>&#128203;</div>
                  <div style={{ fontSize: 14 }}>No measurements yet. Switch to Drawing view and start measuring.</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.15)" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>
                        {summaryGroupBy === "condition" ? "Condition" : summaryGroupBy === "bidArea" ? "Bid Area" : summaryGroupBy === "page" ? "Sheet" : "Folder"}
                      </th>
                      {summaryGroupBy === "condition" && <th style={{ textAlign: "left", padding: "8px 6px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Folder</th>}
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Qty</th>
                      <th style={{ textAlign: "center", padding: "8px 6px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Unit</th>
                      {summaryGroupBy === "condition" && <>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Mat $</th>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Lab $</th>
                      </>}
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#888", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map(row => (
                      <tr key={row.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "8px 10px", color: "#ddd" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                            {row.name}
                          </div>
                        </td>
                        {summaryGroupBy === "condition" && <td style={{ padding: "8px 6px", color: "#888", fontSize: 11 }}>{row.folder}</td>}
                        <td style={{ textAlign: "right", padding: "8px 10px", color: "#fff", fontWeight: 600 }}>
                          {summaryGroupBy === "condition" ? Math.round(row.qty).toLocaleString() : row.measCount}
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 6px", color: "#888" }}>{row.unit}</td>
                        {summaryGroupBy === "condition" && <>
                          <td style={{ textAlign: "right", padding: "8px 10px", color: "#10b981" }}>{fmt(row.matCost)}</td>
                          <td style={{ textAlign: "right", padding: "8px 10px", color: "#3b82f6" }}>{fmt(row.labCost)}</td>
                        </>}
                        <td style={{ textAlign: "right", padding: "8px 10px", color: "var(--amber, #e09422)", fontWeight: 600 }}>{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid rgba(224,148,34,0.4)" }}>
                      <td colSpan={summaryGroupBy === "condition" ? 4 : 3} style={{ padding: "10px 10px", color: "#fff", fontWeight: 700, fontSize: 13 }}>GRAND TOTAL</td>
                      {summaryGroupBy === "condition" && <>
                        <td style={{ textAlign: "right", padding: "10px 10px", color: "#10b981", fontWeight: 600 }}>{fmt(summaryRows.reduce((s, r) => s + r.matCost, 0))}</td>
                        <td style={{ textAlign: "right", padding: "10px 10px", color: "#3b82f6", fontWeight: 600 }}>{fmt(summaryRows.reduce((s, r) => s + r.labCost, 0))}</td>
                      </>}
                      <td style={{ textAlign: "right", padding: "10px 10px", color: "var(--amber, #e09422)", fontWeight: 700, fontSize: 14 }}>{fmt(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Conditions Panel (right sidebar) ── */}
        <div style={{ width: 260, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>

          {/* Conditions list */}
          <div style={{ flex: 1, overflow: "auto", padding: "10px 10px 6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Conditions</span>
              <div style={{ display: "flex", gap: 3 }}>
                <button onClick={() => setShowTemplatePicker(true)} style={{ ...btn, fontSize: 9, padding: "2px 6px" }}>Template</button>
                <button onClick={() => setShowAddCond(!showAddCond)} style={{ ...btn, fontSize: 10, padding: "2px 8px" }}>+ Add</button>
              </div>
            </div>

            {/* Search conditions */}
            {conditions.length > 8 && (
              <input placeholder="Search conditions..." value={condSearch} onChange={e => setCondSearch(e.target.value)}
                style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 10, marginBottom: 6 }} />
            )}

            {/* Add condition dropdown */}
            {showAddCond && (
              <select autoFocus value="" onChange={e => { if (e.target.value) addCondition(e.target.value); }}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid var(--amber)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, marginBottom: 8 }}>
                <option value="">Select assembly...</option>
                {(assemblies || []).map(a => <option key={a.code} value={a.code}>{a.code} — {a.name} ({a.unit})</option>)}
              </select>
            )}

            {!ppf && (
              <div style={{ fontSize: 11, color: "#f59e0b", padding: "10px 8px", background: "rgba(245,158,11,0.08)", borderRadius: 6, border: "1px solid rgba(245,158,11,0.2)", marginBottom: 8 }}>
                Set scale first (S key), then select a condition and start measuring.
              </div>
            )}

            {/* Folder-organized conditions (filtered by search) */}
            {Object.entries(folders).map(([folder, conds]) => {
              const filteredConds = condSearch ? conds.filter(c => c.name.toLowerCase().includes(condSearch.toLowerCase()) || c.asmCode.toLowerCase().includes(condSearch.toLowerCase())) : conds;
              if (condSearch && filteredConds.length === 0) return null;
              return (
              <div key={folder} style={{ marginBottom: 6 }}>
                <div onClick={() => setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }))}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", cursor: "pointer", borderRadius: 4, background: "rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 9, color: "#888" }}>{openFolders[folder] ? "▼" : "▶"}</span>
                  <span style={{ fontSize: 11, color: hiddenFolders[folder] ? "#555" : "#aaa", fontWeight: 600, flex: 1, textDecoration: hiddenFolders[folder] ? "line-through" : "none" }}>{folder}</span>
                  <span onClick={(e) => { e.stopPropagation(); setHiddenFolders(prev => ({ ...prev, [folder]: !prev[folder] })); }}
                    title={hiddenFolders[folder] ? "Show layer" : "Hide layer"}
                    style={{ fontSize: 10, cursor: "pointer", padding: "0 3px", color: hiddenFolders[folder] ? "#555" : "#888" }}>
                    {hiddenFolders[folder] ? "○" : "●"}
                  </span>
                  <span style={{ fontSize: 10, color: "#666" }}>{conds.length}</span>
                </div>
                {openFolders[folder] && filteredConds.map((c, ci) => {
                  const isActive = c.id === activeCondId;
                  const totals = condTotals[c.id] || { qty: 0, cost: 0 };
                  const unit = c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF";
                  return (
                    <div key={c.id}
                      onClick={() => {
                        setActiveCondId(c.id);
                        if (ppf) setMode(c.type);
                        cancelActive();
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 20px", cursor: "pointer",
                        borderRadius: 4, marginTop: 1,
                        background: isActive ? "rgba(224,148,34,0.15)" : "transparent",
                        border: isActive ? "1px solid rgba(224,148,34,0.3)" : "1px solid transparent",
                      }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: isActive ? "#fff" : "#ccc", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.name}
                        </div>
                        {totals.qty > 0 && (
                          <div style={{ fontSize: 9, color: "#888" }}>
                            {Math.round(totals.qty)} {unit} &middot; {fmt(totals.cost)} &middot; {Object.values(measurements).flat().filter(m => m.conditionId === c.id).length}&#x1f4cf;
                          </div>
                        )}
                      </div>
                      {/* Height badge for linear conditions + delete */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        {c.type === "linear" && c.height > 0 && (
                          <span onClick={(e) => {
                            e.stopPropagation();
                            const newH = prompt(`Wall height for "${c.name}" (feet):`, c.height);
                            if (newH && !isNaN(parseFloat(newH))) {
                              setConditions(prev => prev.map(cc => cc.id === c.id ? { ...cc, height: parseFloat(newH) } : cc));
                            }
                          }}
                          title="Click to edit height"
                          style={{ fontSize: 8, color: "#888", padding: "0 4px", borderRadius: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                            {c.height}'
                          </span>
                        )}
                        {isActive && (
                          <span onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete condition "${c.name}"?`)) {
                              setConditions(prev => prev.filter(cc => cc.id !== c.id));
                              if (activeCondId === c.id) setActiveCondId(null);
                            }
                          }}
                          style={{ fontSize: 8, color: "#ef4444", cursor: "pointer", padding: "0 3px" }} title="Delete condition">
                            &#x2715;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })}
          </div>

          {/* ── Typical Groups Section ── */}
          <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: "#22d3ee", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                onClick={() => setShowTypicalPanel(!showTypicalPanel)}>
                Typical Groups {typicalGroups.length > 0 ? `(${typicalGroups.length})` : ""} {showTypicalPanel ? "▾" : "▸"}
              </span>
              {selectedMeasIds.size > 0 && (
                <button onClick={() => setShowTypicalCreate(true)}
                  style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, border: "1px solid rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.1)", color: "#22d3ee", cursor: "pointer" }}>
                  Create ({selectedMeasIds.size})
                </button>
              )}
            </div>
            {selectedMeasIds.size > 0 && !showTypicalCreate && (
              <div style={{ fontSize: 9, color: "#888", marginBottom: 4 }}>
                {selectedMeasIds.size} measurement{selectedMeasIds.size !== 1 ? "s" : ""} selected (Shift+click)
                <span onClick={() => setSelectedMeasIds(new Set())} style={{ color: "#ef4444", cursor: "pointer", marginLeft: 6 }}>Clear</span>
              </div>
            )}
            {/* Create Typical modal */}
            {showTypicalCreate && (
              <div style={{ padding: 8, borderRadius: 6, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: "#22d3ee", marginBottom: 4, fontWeight: 600 }}>Name this Typical Group</div>
                <input autoFocus value={typicalName} onChange={e => setTypicalName(e.target.value)}
                  placeholder="e.g. Standard Patient Room"
                  onKeyDown={e => { if (e.key === "Enter" && typicalName.trim()) createTypicalGroup(typicalName.trim()); }}
                  style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid rgba(34,211,238,0.3)", background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 10, marginBottom: 4 }} />
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { if (typicalName.trim()) createTypicalGroup(typicalName.trim()); }}
                    style={{ flex: 1, padding: "3px 0", borderRadius: 3, border: "none", background: "#22d3ee", color: "#000", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
                    Create
                  </button>
                  <button onClick={() => { setShowTypicalCreate(false); setTypicalName(""); }}
                    style={{ padding: "3px 8px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#888", fontSize: 9, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {/* Typical Groups list */}
            {showTypicalPanel && typicalGroups.map(tg => (
              <div key={tg.id} style={{ padding: "5px 6px", marginBottom: 4, borderRadius: 5, background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#22d3ee", fontWeight: 600 }}>{tg.name}</span>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => { setPlacingTypicalId(tg.id); setMode(MODE.PAN); }}
                      style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(34,211,238,0.3)", background: placingTypicalId === tg.id ? "#22d3ee" : "transparent", color: placingTypicalId === tg.id ? "#000" : "#22d3ee", cursor: "pointer" }}>
                      {placingTypicalId === tg.id ? "Placing..." : "Place"}
                    </button>
                    <button onClick={() => deleteTypicalGroup(tg.id)}
                      style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                  {tg.sourceMeasurementIds.length} source meas &middot; {tg.instances.length} instance{tg.instances.length !== 1 ? "s" : ""}
                </div>
                {tg.instances.length > 0 && (
                  <div style={{ marginTop: 3 }}>
                    {tg.instances.map(inst => (
                      <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0" }}>
                        <span style={{ fontSize: 9, color: "#888", flex: 1 }}>{getKeyName(inst.pageKey)}</span>
                        <span style={{ fontSize: 9, color: "#aaa" }}>×</span>
                        <input type="number" min="0.1" step="0.5" value={inst.multiplier || 1}
                          onChange={e => updateInstanceMultiplier(tg.id, inst.id, parseFloat(e.target.value) || 1)}
                          style={{ width: 32, padding: "1px 2px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 9, textAlign: "center" }} />
                        <button onClick={() => deleteTypicalInstance(tg.id, inst.id)}
                          style={{ fontSize: 8, padding: "0 3px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {showTypicalPanel && typicalGroups.length === 0 && (
              <div style={{ fontSize: 9, color: "#555", fontStyle: "italic", padding: "4px 0" }}>
                Shift+click measurements to select, then "Create" a typical group
              </div>
            )}
          </div>

          {/* ── Change Order Panel ── */}
          <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>Change Orders</span>
              <button onClick={() => revisionInputRef.current?.click()}
                style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", color: "#f59e0b", cursor: "pointer" }}>
                {revisionDocs[pageKey] ? "Replace Rev" : "Upload Rev"}
              </button>
              <input ref={revisionInputRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleRevisionUpload(f); e.target.value = ""; }} />
            </div>
            {revisionDocs[pageKey] && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <input type="checkbox" checked={showRevision} onChange={e => setShowRevision(e.target.checked)}
                    style={{ width: 12, height: 12 }} />
                  <span style={{ fontSize: 9, color: "#aaa", flex: 1 }}>
                    {revisionDocs[pageKey].name?.replace(/\.pdf$/i, "") || "Revision"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 8, color: "#666", width: 40 }}>Opacity</span>
                  <input type="range" min="0" max="1" step="0.05" value={revisionOpacity}
                    onChange={e => setRevisionOpacity(parseFloat(e.target.value))}
                    style={{ flex: 1, height: 4 }} />
                  <span style={{ fontSize: 8, color: "#888", width: 24 }}>{Math.round(revisionOpacity * 100)}%</span>
                </div>
                {revisionDocs[pageKey].numPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <span style={{ fontSize: 8, color: "#666" }}>Rev page:</span>
                    <select value={revisionDocs[pageKey].revPage || 1}
                      onChange={e => setRevisionDocs(prev => ({ ...prev, [pageKey]: { ...prev[pageKey], revPage: Number(e.target.value) } }))}
                      style={{ padding: "1px 4px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 9 }}>
                      {Array.from({ length: revisionDocs[pageKey].numPages }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Page {i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            {/* CO Summary */}
            {coSummary.total > 0 && (
              <div style={{ padding: "6px 8px", borderRadius: 5, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", marginTop: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "#f59e0b", marginBottom: 3 }}>CO Net Delta</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                  <span style={{ color: "#22c55e" }}>+ {fmt(coSummary.adds.cost)}</span>
                  <span style={{ color: "#ef4444" }}>− {fmt(coSummary.dels.cost)}</span>
                  <span style={{ color: coSummary.net >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                    Net: {coSummary.net >= 0 ? "+" : ""}{fmt(coSummary.net)}
                  </span>
                </div>
                <div style={{ fontSize: 8, color: "#666", marginTop: 2 }}>
                  {coSummary.total} CO measurement{coSummary.total !== 1 ? "s" : ""}
                  {coSummary.adds.lf > 0 && ` · +${Math.round(coSummary.adds.lf)} LF`}
                  {coSummary.dels.lf > 0 && ` · −${Math.round(coSummary.dels.lf)} LF`}
                  {coSummary.adds.sf > 0 && ` · +${Math.round(coSummary.adds.sf)} SF`}
                  {coSummary.dels.sf > 0 && ` · −${Math.round(coSummary.dels.sf)} SF`}
                </div>
              </div>
            )}
          </div>

          {/* ── Live Cost Bar (bottom of sidebar) ── */}
          <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.1)", padding: "10px 12px", background: "rgba(0,0,0,0.9)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Takeoff Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--amber, #e09422)" }}>{fmtK(grandTotal)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, fontSize: 9, color: "#666" }}>
              <span style={{ color: "#10b981" }}>Mat {fmtK(totalMat)}</span>
              <span style={{ color: "#3b82f6" }}>Lab {fmtK(totalLab)}</span>
              <span>&middot;</span>
              <span>{Object.values(measurements).reduce((s, pm) => s + pm.length, 0)} meas</span>
            </div>
            {activeCond && (
              <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${activeCond.color}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: activeCond.color, fontWeight: 600 }}>{activeCond.name}</div>
                  {activeCond.type === "linear" && (
                    <button onClick={() => setShowLinkSetup(!showLinkSetup)}
                      style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: (condLinks[activeCond.id]?.length > 0) ? "rgba(74,222,128,0.15)" : "transparent", color: (condLinks[activeCond.id]?.length > 0) ? "#4ade80" : "#888", cursor: "pointer" }}>
                      {condLinks[activeCond.id]?.length > 0 ? `${condLinks[activeCond.id].length} linked` : "Link"}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 9, color: "#888" }}>
                  {Math.round(condTotals[activeCond.id]?.qty || 0)} {activeCond.type === "count" ? "EA" : activeCond.type === "area" ? "SF" : "LF"} &middot; {fmt(condTotals[activeCond.id]?.cost || 0)}
                </div>
                {/* Multi-Condition Link Setup */}
                {showLinkSetup && activeCond.type === "linear" && (
                  <div style={{ marginTop: 6, padding: "6px", borderRadius: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 9, color: "#aaa", marginBottom: 4 }}>When drawing this wall, also create:</div>
                    {conditions.filter(c => c.id !== activeCond.id && (c.type === "area" || c.type === "linear")).map(c => {
                      const existingLink = (condLinks[activeCond.id] || []).find(l => l.condId === c.id);
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 0" }}>
                          <input type="checkbox" checked={!!existingLink}
                            onChange={e => {
                              setCondLinks(prev => {
                                const links = [...(prev[activeCond.id] || [])];
                                if (e.target.checked) {
                                  links.push({ condId: c.id, calcType: c.type === "area" ? "sf_both_sides" : "match_lf" });
                                } else {
                                  const idx = links.findIndex(l => l.condId === c.id);
                                  if (idx >= 0) links.splice(idx, 1);
                                }
                                return { ...prev, [activeCond.id]: links };
                              });
                            }}
                            style={{ width: 12, height: 12 }} />
                          <span style={{ width: 6, height: 6, borderRadius: 1, background: c.color }} />
                          <span style={{ fontSize: 9, color: "#ccc", flex: 1 }}>{c.name}</span>
                          {existingLink && (
                            <select value={existingLink.calcType}
                              onChange={e => {
                                setCondLinks(prev => {
                                  const links = (prev[activeCond.id] || []).map(l => l.condId === c.id ? { ...l, calcType: e.target.value } : l);
                                  return { ...prev, [activeCond.id]: links };
                                });
                              }}
                              style={{ fontSize: 8, padding: "1px 2px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#aaa" }}>
                              <option value="sf_both_sides">SF both sides</option>
                              <option value="sf_one_side">SF one side</option>
                              <option value="match_lf">Same LF</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {onAddToTakeoff && Object.values(measurements).some(pm => pm.length > 0) && (
              <button onClick={() => {
                // Aggregate by condition (sum quantities across all pages)
                const agg = {};
                Object.values(measurements).flat().forEach(m => {
                  const cond = conditions.find(c => c.id === m.conditionId);
                  if (!cond?.asmCode) return;
                  const key = cond.asmCode;
                  const qty = m.type === "count" ? (m.count || 1) : m.type === "linear" ? m.totalFt : m.totalSf;
                  if (!agg[key]) agg[key] = { code: cond.asmCode, qty: 0, unit: m.type === "count" ? "EA" : m.type === "linear" ? "LF" : "SF", label: cond.name, bidArea: bidAreas.find(ba => ba.id === m.bidAreaId)?.name || "" };
                  agg[key].qty += qty;
                });
                Object.values(agg).forEach(item => {
                  onAddToTakeoff({ ...item, qty: Math.round(item.qty) });
                });
              }} style={{ ...btn, width: "100%", marginTop: 8, background: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.3)", color: "#4ade80", fontSize: 11 }}>
                Send to Estimate ({Object.values(measurements).flat().length} measurements)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, background: "rgba(0,0,0,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: 4, zIndex: 10002, minWidth: 140 }}
          onClick={() => setContextMenu(null)}>
          <div onClick={() => { deleteMeasurement(contextMenu.measurementId); setContextMenu(null); }}
            style={{ padding: "6px 12px", fontSize: 11, color: "#ef4444", cursor: "pointer", borderRadius: 4 }}
            onMouseEnter={e => e.target.style.background = "rgba(239,68,68,0.1)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>
            Delete Measurement
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
          {conditions.filter(c => {
            const m = pageMeasurements.find(mm => mm.id === contextMenu.measurementId);
            return m && c.id !== m.conditionId;
          }).slice(0, 6).map(c => (
            <div key={c.id} onClick={() => {
              setMeasurements(prev => ({
                ...prev,
                [pageKey]: (prev[pageKey] || []).map(m => m.id === contextMenu.measurementId ? { ...m, conditionId: c.id } : m)
              }));
              setContextMenu(null);
            }}
            style={{ padding: "5px 12px", fontSize: 10, color: "#ccc", cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>
              <span style={{ width: 6, height: 6, borderRadius: 1, background: c.color }} />
              Move to {c.name}
            </div>
          ))}
        </div>
      )}

      {/* Template picker modal */}
      {showTemplatePicker && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.97)", border: "1px solid var(--amber)", borderRadius: 12, padding: 24, zIndex: 10001, minWidth: 420, maxWidth: 520, maxHeight: "80vh", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>Condition Templates</div>
            <button onClick={() => setShowTemplatePicker(false)} style={{ ...btn, fontSize: 10, padding: "3px 10px" }}>Close</button>
          </div>
          <div style={{ color: "#aaa", fontSize: 11, marginBottom: 16 }}>Apply a template to replace or add conditions. Choose a trade package that matches your project scope.</div>
          {Object.entries(TEMPLATES).map(([name, tmpl]) => (
            <div key={name} style={{ padding: "12px 14px", marginBottom: 8, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
              onClick={() => {
                const newConds = tmpl.items.map((t, i) => createCondition(t, conditions.length + i));
                if (tmpl.items.length === 0) {
                  setConditions([]);
                } else {
                  setConditions(newConds);
                }
                setActiveCondId(null);
                setShowTemplatePicker(false);
                setOpenFolders(prev => {
                  const next = {};
                  newConds.forEach(c => { next[c.folder] = true; });
                  return next;
                });
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{name}</span>
                <span style={{ fontSize: 10, color: "#888" }}>{tmpl.items.length} conditions</span>
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{tmpl.description}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {tmpl.items.slice(0, 8).map((it, i) => (
                  <span key={i} style={{ fontSize: 9, color: "#aaa", padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {it.asmCode}
                  </span>
                ))}
                {tmpl.items.length > 8 && <span style={{ fontSize: 9, color: "#666" }}>+{tmpl.items.length - 8} more</span>}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.15)", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#888" }}>Or add individual conditions with the + Add button in the panel</div>
          </div>
        </div>
      )}

      {/* Bid Area add dialog */}
      {showBidAreaAdd && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.95)", border: "1px solid var(--amber)", borderRadius: 10, padding: 20, zIndex: 10000, minWidth: 300 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add Bid Area</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {["1st Floor", "2nd Floor", "3rd Floor", "Mezzanine", "Basement", "Roof", "Exterior", "Common Areas"].map(name => (
              <button key={name} onClick={() => {
                const ba = { id: "ba_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5), name };
                setBidAreas(prev => [...prev, ba]);
                setActiveBidAreaId(ba.id);
                setShowBidAreaAdd(false);
                setNewBidAreaName("");
              }} style={{ ...btn, fontSize: 10, padding: "3px 8px" }}>{name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input placeholder="Custom area name..." value={newBidAreaName} onChange={e => setNewBidAreaName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newBidAreaName.trim()) {
                  const ba = { id: "ba_" + Date.now(), name: newBidAreaName.trim() };
                  setBidAreas(prev => [...prev, ba]); setActiveBidAreaId(ba.id); setShowBidAreaAdd(false); setNewBidAreaName("");
                }
              }}
              style={{ flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12 }} />
            <button onClick={() => {
              if (!newBidAreaName.trim()) return;
              const ba = { id: "ba_" + Date.now(), name: newBidAreaName.trim() };
              setBidAreas(prev => [...prev, ba]); setActiveBidAreaId(ba.id); setShowBidAreaAdd(false); setNewBidAreaName("");
            }} style={{ ...btn, background: "var(--amber)", color: "#000", fontWeight: 600 }}>Add</button>
            <button onClick={() => { setShowBidAreaAdd(false); setNewBidAreaName(""); }} style={btn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Calibration prompt */}
      {showCalPrompt && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.95)", border: "1px solid var(--amber)", borderRadius: 10, padding: 24, zIndex: 10000, minWidth: 320, textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Set Scale</div>
          <div style={{ color: "#aaa", fontSize: 12, marginBottom: 12 }}>Pick a preset or enter the known distance:</div>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 6, textAlign: "center" }}>Common scales (click if printed on drawing):</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", marginBottom: 14 }}>
            {[
              { label: '1/8"', ratio: 96 }, { label: '3/16"', ratio: 64 }, { label: '1/4"', ratio: 48 },
              { label: '3/8"', ratio: 32 }, { label: '1/2"', ratio: 24 }, { label: '3/4"', ratio: 16 }, { label: '1"', ratio: 12 },
            ].map(sc => (
              <button key={sc.label} onClick={() => {
                // For presets: user clicked two points on a known dimension
                // The ratio tells us: 1 paper inch = ratio real inches
                // But we still need the user to tell us the real distance
                // Pre-fill a common value suggestion instead
                // If the user knows the scale, they can measure any line and the preset tells us the conversion
                // Better approach: just ask for the real feet and use the manual flow
                // Presets are best used when we can auto-detect DPI — for now, highlight the preset name
                setCalInput("");
              }} style={{ ...btn, fontSize: 10, padding: "3px 8px", minWidth: 42 }}>{sc.label}=1'</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#888", marginBottom: 6, textAlign: "center" }}>Or enter the real distance between your two clicks:</div>
          <input autoFocus type="number" step="0.1" placeholder="Distance in feet" value={calInput}
            onChange={e => setCalInput(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmCalibration()}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--amber)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16, textAlign: "center" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
            <button onClick={() => { setCalPoints([]); setShowCalPrompt(false); }} style={{ ...btn, borderColor: "rgba(239,68,68,0.4)" }}>Cancel</button>
            <button onClick={confirmCalibration} style={{ ...btn, background: "var(--amber)", color: "#000", fontWeight: 600 }}>Confirm</button>
          </div>
        </div>
      )}

      {/* Scale verification prompt */}
      {showVerify && (
        <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.9)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 8,
          padding: "12px 20px", zIndex: 10000, display: "flex", alignItems: "center", gap: 12, maxWidth: 500 }}>
          <span style={{ fontSize: 16 }}>&#9989;</span>
          <div>
            <div style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>Scale set!</div>
            <div style={{ color: "#aaa", fontSize: 11 }}>Verify by measuring a known dimension (door = ~3', window = ~4'). If it's off, re-calibrate.</div>
          </div>
          <button onClick={() => setShowVerify(false)} style={{ ...btn, fontSize: 10, padding: "3px 10px", flexShrink: 0 }}>OK</button>
        </div>
      )}

      {rendering && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "#fff", fontSize: 14, background: "rgba(0,0,0,0.7)", padding: "8px 16px", borderRadius: 8 }}>
          Loading page...
        </div>
      )}
    </div>
  );
}
