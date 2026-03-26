import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FileText } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { uploadTakeoffPdf, downloadTakeoffPdf } from "../lib/supabase";
import { extractPdfText, analyzePlans, analysisToConditions } from "../services/planAnalyzer";
import { ConditionPropsDialog } from "./ConditionPropsDialog";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// ── IndexedDB helpers for PDF persistence ──
const IDB_NAME = "ebc_takeoff_pdfs";
const IDB_STORE = "pdfs";
let _idbInstance = null;
function openIDB() {
  if (_idbInstance) return Promise.resolve(_idbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => { _idbInstance = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}
async function savePdfToIDB(key, data) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(data, key);
    tx.oncomplete = () => { console.log(`[IDB] Saved PDF: ${key} (${(data.byteLength / 1024 / 1024).toFixed(1)}MB)`); resolve(); };
    tx.onerror = () => { console.warn(`[IDB] Save failed: ${key}`, tx.error); reject(tx.error); };
  });
}
async function loadPdfFromIDB(key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => { console.log(`[IDB] Load PDF: ${key} → ${req.result ? "found" : "miss"}`); resolve(req.result || null); };
    req.onerror = () => { console.warn(`[IDB] Load failed: ${key}`, req.error); reject(req.error); };
  });
}

// ── Modes ──
const MODE = { PAN: "pan", CALIBRATE: "calibrate", LINEAR: "linear", AREA: "area", COUNT: "count", MEASURE: "measure",
  TEXT: "text", ARROW: "arrow", CALLOUT: "callout", LINE_ANN: "line_ann",
  HIGHLIGHTER: "highlighter", RECT: "rect", OVAL: "oval", POLYGON_ANN: "polygon_ann", CLOUD: "cloud", INK: "ink",
  HOTLINK: "hotlink" };
const ANN_MODES = new Set([MODE.TEXT, MODE.ARROW, MODE.CALLOUT, MODE.LINE_ANN,
  MODE.HIGHLIGHTER, MODE.RECT, MODE.OVAL, MODE.POLYGON_ANN, MODE.CLOUD, MODE.INK, MODE.HOTLINK]);
// Modes that use mouse-drag (mousedown→move→up) instead of click-click
const ANN_DRAG_MODES = new Set([MODE.HIGHLIGHTER, MODE.RECT, MODE.OVAL, MODE.INK]);

// ── Scale presets (OST-style dropdown) ──
// ratio = real inches per 1 paper inch. ppf = 72 * 12 / ratio (PDF = 72 units/inch)
const SCALE_PRESETS = [
  { label: '1/32" = 1\'0"', ratio: 384 },
  { label: '1/16" = 1\'0"', ratio: 192 },
  { label: '3/32" = 1\'0"', ratio: 128 },
  { label: '1/8" = 1\'0"',  ratio: 96 },
  { label: '3/16" = 1\'0"', ratio: 64 },
  { label: '1/4" = 1\'0"',  ratio: 48 },
  { label: '3/8" = 1\'0"',  ratio: 32 },
  { label: '1/2" = 1\'0"',  ratio: 24 },
  { label: '3/4" = 1\'0"',  ratio: 16 },
  { label: '1" = 1\'0"',    ratio: 12 },
  { label: '1-1/2" = 1\'0"', ratio: 8 },
  { label: '3" = 1\'0"',    ratio: 4 },
];
function ppfFromRatio(ratio) { return (72 * 12) / ratio; }
function ratioFromPpf(ppf) { return ppf ? (72 * 12) / ppf : null; }
function closestPresetLabel(ppf) {
  if (!ppf) return null;
  const r = ratioFromPpf(ppf);
  let best = null, bestDiff = Infinity;
  for (const sc of SCALE_PRESETS) {
    const diff = Math.abs(sc.ratio - r);
    if (diff < bestDiff) { bestDiff = diff; best = sc; }
  }
  return best && bestDiff / best.ratio < 0.02 ? best.label : null;
}

// ── Condition colors — auto-assigned ──
const COND_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e879f9", "#22d3ee", "#a3e635", "#fb923c",
];

function dist(a, b) { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2); }

// ── Round quantity helper — applies per-condition rounding at presentation layer ──
function applyRoundQty(qty, cond) {
  if (!cond || !cond.roundQty) return qty;
  return cond.roundMode === "nearest" ? Math.round(qty) : Math.ceil(qty);
}
function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; a += pts[i].x * pts[j].y - pts[j].x * pts[i].y; }
  return Math.abs(a) / 2;
}

// ── Angle snapping — hold Shift to snap to nearest 15° increment ──
const SNAP_ANGLES = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function snapToAngle(prevPt, rawPt) {
  if (!prevPt) return rawPt;
  const dx = rawPt.x - prevPt.x;
  const dy = rawPt.y - prevPt.y;
  const rawAngle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  const length = Math.sqrt(dx * dx + dy * dy);
  // Find closest snap angle
  let best = 0, bestDiff = 360;
  for (const a of SNAP_ANGLES) {
    const diff = Math.min(Math.abs(rawAngle - a), 360 - Math.abs(rawAngle - a));
    if (diff < bestDiff) { bestDiff = diff; best = a; }
  }
  const rad = best * Math.PI / 180;
  return { x: prevPt.x + length * Math.cos(rad), y: prevPt.y + length * Math.sin(rad) };
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
    attachTo: null, // parent conditionId for deduction (count conditions only)
    deductWidth: 0, // feet per count to deduct from parent linear (e.g., 3' door) OR width dimension for area deduction
    deductHeight: 0, // height dimension for area deduction (deductWidth × deductHeight = SF per count)
  };
}

export function DrawingViewer({ pdfData, storageUrl, fileName, onClose, onAddToTakeoff, assemblies, initialTakeoffState, onTakeoffStateChange, takeoffId }) {
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
  const [showSheets, setShowSheets] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);

  // Conditions system — starts empty; user adds what they need via + Add or Template
  const [conditions, setConditions] = useState(() =>
    _init.conditions && _init.conditions.length > 0
      ? _init.conditions
      : []
  );
  const [activeCondId, setActiveCondId] = useState(_init.activeCondId || null);
  const [openFolders, setOpenFolders] = useState({ Walls: true, Ceilings: true, Counts: true, Insulation: true, "Add-Ons": true });
  const [showAddCond, setShowAddCond] = useState(false);
  const [showCondProps, setShowCondProps] = useState(false); // Condition Properties dialog
  const [editingCondId, setEditingCondId] = useState(null); // null = new, id = editing existing
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
  const [contextMenu, setContextMenu] = useState(null); // { x, y, measurementId, isCo }
  const [selectedMeasId, setSelectedMeasId] = useState(null); // single-select for info panel
  const [spaceHeld, setSpaceHeld] = useState(false); // space-bar hold for temp pan
  const modeBeforeSpaceRef = useRef(null); // mode to restore after space release
  const [condSearch, setCondSearch] = useState("");

  // Measurements — now linked to conditions + bid areas
  const [measurements, setMeasurements] = useState(_init.measurements || {});
  const [activeVertices, setActiveVertices] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [continuousMode, setContinuousMode] = useState(true); // auto-start next measurement
  const [showCondNames, setShowCondNames] = useState(true); // show condition name labels on measurements
  const [hoveredMeasId, setHoveredMeasId] = useState(null); // for hover tooltip
  const [backoutMode, setBackoutMode] = useState(null); // null = off, measurementId = drawing backout for that parent
  const [showAttachSetup, setShowAttachSetup] = useState(false); // show attachment config panel
  const [completedPages, setCompletedPages] = useState(_init.completedPages || {}); // { [pageKey]: true }
  const [draggingHandle, setDraggingHandle] = useState(null); // { measurementId, vertexIdx, pageKey } or { measurementId, pointKey:'point', pageKey }
  const preDragMeasRef = useRef(null); // snapshot of measurement before drag for undo

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

  // ── Measure (ruler) tool — quick dimension check, no condition required ──
  const [measureVertices, setMeasureVertices] = useState([]);  // temp vertices for current measurement
  const [measureResults, setMeasureResults] = useState([]);     // persisted ruler lines per page: { id, pageKey, vertices, totalFt }

  // ── Annotations (markup only — no takeoff impact) ──
  const [annotations, setAnnotations] = useState(_init.annotations || {}); // { [pageKey]: [ann, ...] }
  const [selectedAnnId, setSelectedAnnId] = useState(null);
  const [annStyle, setAnnStyle] = useState({ strokeColor: "#ef4444", fillColor: null, lineWidth: 2, opacity: 1.0, fontSize: 14 });
  const [annStartPt, setAnnStartPt] = useState(null); // for arrow/line/callout: first click point
  const [showAnnTextInput, setShowAnnTextInput] = useState(null); // { position: {x,y}, type: "text"|"callout", anchorPt?: {x,y} }
  const [annTextValue, setAnnTextValue] = useState("");
  const annTextRef = useRef(null);
  const [annDragging, setAnnDragging] = useState(null); // { type, startPt, points } for drag-based (highlighter/ink/rect/oval)
  const [annPolyVerts, setAnnPolyVerts] = useState([]); // vertices for polygon_ann/cloud
  const pageAnnotations = annotations[pageKey] || [];

  // ── Named Views + Hot Links ──
  const [namedViews, setNamedViews] = useState(_init.namedViews || []); // [{ id, name, pageKey, pdfIdx, zoom, scrollX, scrollY }]
  const [showSaveView, setShowSaveView] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [hotlinkTargetId, setHotlinkTargetId] = useState(null); // named view ID to link when placing a hotlink

  // ── AI Plan Analysis ──
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const runPlanAnalysis = useCallback(async () => {
    if (!pdf || analyzing) return;
    // Get API key from localStorage (same place Settings stores it)
    const apiKey = (() => { try { return JSON.parse(localStorage.getItem("ebc_apiKey") || "null"); } catch { return null; } })();
    if (!apiKey) { alert("Set your Claude API key in Settings first."); return; }
    setAnalyzing(true);
    setShowAnalysis(true);
    try {
      const { fullText } = await extractPdfText(pdf);
      const result = await analyzePlans(apiKey, fullText, assemblies);
      setAnalysisResult(result);
      // Auto-add conditions if user has none yet
      if (conditions.length === 0 && result.conditions?.length > 0) {
        const newConds = analysisToConditions(result.conditions, assemblies);
        setConditions(newConds);
      }
    } catch (err) {
      console.error("[PlanAnalysis] Failed:", err);
      alert("Plan analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [pdf, analyzing, assemblies, conditions.length]);

  // ── Click debounce for double-click finish (prevent extra vertices) ──
  const clickTimerRef = useRef(null);
  const pendingClickRef = useRef(null);

  // ── Modifier key tracking (Shift for angle snap, Space for temp pan) ──
  const [shiftHeld, setShiftHeld] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true); // Angle snap on by default; Shift inverts
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Shift") setShiftHeld(true);
      if (e.key === " " && !e.repeat && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        setSpaceHeld(true);
        setMode(prev => { modeBeforeSpaceRef.current = prev; return MODE.PAN; });
      }
    };
    const up = (e) => {
      if (e.key === "Shift") setShiftHeld(false);
      if (e.key === " ") {
        setSpaceHeld(false);
        if (modeBeforeSpaceRef.current != null) { setMode(modeBeforeSpaceRef.current); modeBeforeSpaceRef.current = null; }
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

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
        completedPages,
        annotations,
        namedViews,
      });
      setLastSaved(Date.now());
    }, 800); // 800ms debounce
    return () => clearTimeout(saveTimerRef.current);
  }, [measurements, conditions, condLinks, sheetNames, calibrations, bidAreas, hiddenFolders, activeCondId, activeBidAreaId, typicalGroups, coMeasurements, pdfFiles.length, completedPages, annotations, namedViews]);

  // Refs
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const fitScaleRef = useRef(1);
  const pdfDocRef = useRef(null); // tracks the current valid PDF document (avoids StrictMode stale doc issues)
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

  // Compute condition totals from all measurements + typical group instances + deductions
  const condTotals = useMemo(() => {
    const totals = {};
    conditions.forEach(c => { totals[c.id] = { qty: 0, grossQty: 0, cost: 0, deductions: 0 }; });
    Object.values(measurements).forEach(pageMeas => {
      pageMeas.forEach(m => {
        if (!totals[m.conditionId]) return;
        if (m.backoutOf) return; // backouts handled separately below
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
    // Store gross qty before deductions
    conditions.forEach(c => { if (totals[c.id]) totals[c.id].grossQty = totals[c.id].qty; });
    // ── Attachment deductions: count conditions subtract from parent linear OR area ──
    conditions.forEach(countCond => {
      if (!countCond.attachTo || !countCond.deductWidth) return;
      if (!totals[countCond.attachTo]) return;
      const parentCond = conditions.find(c => c.id === countCond.attachTo);
      if (!parentCond) return;
      const totalCount = totals[countCond.id]?.qty || 0;
      let deductAmt;
      if (parentCond.type === "area") {
        // Area attachment: deduct width × height (SF) per count
        const h = countCond.deductHeight || 0;
        deductAmt = totalCount * countCond.deductWidth * (h > 0 ? h : 1);
      } else {
        // Linear attachment: deduct width (LF) per count
        deductAmt = totalCount * countCond.deductWidth;
      }
      totals[countCond.attachTo].qty = Math.max(0, totals[countCond.attachTo].qty - deductAmt);
      totals[countCond.attachTo].deductions += deductAmt;
      // Recalculate parent cost based on net qty
      const parentAsm = parentCond ? (assemblies || []).find(a => a.code === parentCond.asmCode) : null;
      if (parentAsm) totals[countCond.attachTo].cost = totals[countCond.attachTo].qty * ((parentAsm.matRate || 0) + (parentAsm.labRate || 0));
    });
    // ── Backout deductions: backout area measurements subtract from parent's condition ──
    const allMeasFlat = Object.values(measurements).flat();
    const measById = {};
    allMeasFlat.forEach(m => { measById[m.id] = m; });
    allMeasFlat.forEach(m => {
      if (m.type === "area" && m.backoutOf) {
        const parentMeas = measById[m.backoutOf];
        if (parentMeas && totals[parentMeas.conditionId]) {
          const backoutSf = m.totalSf || 0;
          totals[parentMeas.conditionId].qty = Math.max(0, totals[parentMeas.conditionId].qty - backoutSf);
          totals[parentMeas.conditionId].deductions += backoutSf;
          // Recalculate parent cost
          const pCond = conditions.find(c => c.id === parentMeas.conditionId);
          const pAsm = pCond ? (assemblies || []).find(a => a.code === pCond.asmCode) : null;
          if (pAsm) totals[parentMeas.conditionId].cost = totals[parentMeas.conditionId].qty * ((pAsm.matRate || 0) + (pAsm.labRate || 0));
        }
      }
    });
    // ── Apply per-condition rounding (presentation layer) ──
    conditions.forEach(c => {
      if (c.roundQty && totals[c.id]) {
        const t = totals[c.id];
        t.rawQty = t.qty; // preserve exact qty for audit
        t.qty = applyRoundQty(t.qty, c);
        // Recalculate cost with rounded qty
        const asm = (assemblies || []).find(a => a.code === c.asmCode);
        if (asm) t.cost = t.qty * ((asm.matRate || 0) + (asm.labRate || 0));
        if (t.grossQty > 0) t.grossQty = applyRoundQty(t.grossQty, c);
      }
    });
    return totals;
  }, [measurements, conditions, assemblies, typicalGroups]);

  // Summary table data (grouped by various dimensions)
  const summaryRows = useMemo(() => {
    const allMeas = Object.values(measurements).flat();
    const rows = [];
    if (summaryGroupBy === "condition") {
      conditions.forEach(c => {
        const meas = allMeas.filter(m => m.conditionId === c.id && !m.backoutOf);
        if (meas.length === 0 && !(condTotals[c.id]?.qty > 0)) return;
        const t = condTotals[c.id] || { qty: 0, grossQty: 0, cost: 0, deductions: 0 };
        const asm = (assemblies || []).find(a => a.code === c.asmCode);
        const matCost = asm ? t.qty * (asm.matRate || 0) : 0;
        const labCost = asm ? t.qty * (asm.labRate || 0) : 0;
        rows.push({ key: c.id, name: c.name, folder: c.folder, color: c.color, unit: c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF", qty: t.qty, grossQty: t.grossQty, deductions: t.deductions, matCost, labCost, total: matCost + labCost, measCount: meas.length });
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
  }, [measurements, conditions, assemblies, bidAreas, summaryGroupBy, sheetNames, condTotals]);

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
      const meas = allMeas.filter(m => m.conditionId === c.id && !m.backoutOf);
      const t = condTotals[c.id] || { qty: 0, grossQty: 0, deductions: 0 };
      if (meas.length === 0 && t.qty <= 0) return;
      const unit = c.type === "count" ? "EA" : c.type === "area" ? "SF" : "LF";
      const asm = (assemblies || []).find(a => a.code === c.asmCode);
      const matCost = asm ? t.qty * (asm.matRate || 0) : 0;
      const labCost = asm ? t.qty * (asm.labRate || 0) : 0;
      // Add folder header row when folder changes
      if (c.folder !== currentFolder) {
        condRows.push({ Folder: c.folder, Condition: "", Code: "", "Gross Qty": "", "Net Qty": "", Unit: "", "Mat $": "", "Lab $": "", "Total $": "" });
        currentFolder = c.folder;
      }
      condRows.push({
        Folder: "",
        Condition: c.name + (c.attachTo ? ` (deducts from ${conditions.find(cc => cc.id === c.attachTo)?.name || "?"})` : ""),
        Code: c.asmCode || "",
        "Gross Qty": t.deductions > 0 ? Math.round(t.grossQty) : Math.round(t.qty),
        "Net Qty": t.deductions > 0 ? Math.round(t.qty) : "",
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
      "Gross Qty": "",
      "Net Qty": "",
      Unit: "",
      "Mat $": Math.round(totalMat * 100) / 100,
      "Lab $": Math.round(totalLab * 100) / 100,
      "Total $": Math.round(grandTotal * 100) / 100,
    });

    const ws1 = XLSX.utils.json_to_sheet(condRows);
    // Set column widths
    ws1["!cols"] = [
      { wch: 14 }, // Folder
      { wch: 36 }, // Condition
      { wch: 8 },  // Code
      { wch: 10 }, // Gross Qty
      { wch: 10 }, // Net Qty
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
          let qty = meas.reduce((s, m) => s + (m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0)), 0);
          qty = applyRoundQty(qty, c);
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
        let qty = cMeas.reduce((s, m) => s + (m.type === "count" ? (m.count || 1) : m.type === "linear" ? (m.totalFt || 0) : (m.totalSf || 0)), 0);
        qty = applyRoundQty(qty, c);
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
  }, [measurements, conditions, assemblies, bidAreas, grandTotal, totalMat, totalLab, fileName, coMeasurements, coSummary, condTotals]);

  // Folders
  const folders = useMemo(() => {
    const map = {};
    conditions.forEach(c => {
      if (!map[c.folder]) map[c.folder] = [];
      map[c.folder].push(c);
    });
    return map;
  }, [conditions]);

  // ── Auto Name V2: multi-region, scored title block extraction ──
  const [autoNaming, setAutoNaming] = useState(false);
  const autoNamePages = useCallback(async (doc, pdfIdx) => {
    setAutoNaming(true);
    try {
      // Sheet number: A1, A-1, A1.1, A-101, A101.00, S200, M-301, etc.
      const sheetNumRe = /^([A-Z]{1,2})[\-\.]?(\d{1,3}(?:\.\d{1,2})?)$/;
      // Plan title keywords — whole words only
      const titleKeywords = /\b(FLOOR PLAN|CONSTRUCTION PLAN|CEILING PLAN|REFLECTED CEILING|DEMOLITION PLAN|DEMO PLAN|SITE PLAN|ROOF PLAN|ELEVATIONS?|SECTIONS?|DETAILS?|SCHEDULES?|PARTITION PLAN|PARTITION TYPES|LIGHTING PLAN|POWER PLAN|MECHANICAL|PLUMBING|ELECTRICAL|FRAMING|FOUNDATION|FINISH PLAN|COVER SHEET|TITLE SHEET|GENERAL NOTES|LIFE SAFETY|ENLARGED|MILLWORK|INTERIOR ELEV|EXTERIOR ELEV)\b/i;
      // Noise words — skip items that are clearly spec/note text
      const noiseRe = /\b(GAUGE|WIRE|MESH|BENJAMIN|MOORE|GYPSUM|MANUFACTURER|CONTRACTOR|ASTM|SPECIFICATION|SEE DETAIL|REFER TO|INSTALL|PROVIDE|SHALL BE|PER PLAN|UL RATED|TYPICAL|NIC\b|BY OWNER|NOTE:?|DOOR|WINDOW TYPE|FRAME TYPE)\b/i;

      // ── Page 1 index parsing: look for "INDEX OF DRAWINGS" table ──
      let indexMap = {}; // { "A101": "FLOOR PLAN", "A102": "REFLECTED CEILING PLAN" }
      try {
        const p1 = await doc.getPage(1);
        const tc1 = await p1.getTextContent();
        const vp1 = p1.getViewport({ scale: 1 });
        const items1 = tc1.items.map(it => ({
          s: it.str.trim(),
          nx: it.transform[4] / vp1.width,
          ny: 1 - (it.transform[5] / vp1.height),
          fs: Math.abs(it.transform[3]) || 10,
        })).filter(it => it.s.length > 0);

        // Look for "INDEX" or "DRAWING INDEX" or "SHEET INDEX"
        const hasIndex = items1.some(it => /\b(INDEX|DRAWING LIST|SHEET LIST)\b/i.test(it.s));
        if (hasIndex) {
          // Build all text lines sorted by Y
          const sorted1 = [...items1].sort((a, b) => a.ny - b.ny);
          const lines1 = [];
          let curLine = "", curY = -1;
          sorted1.forEach(it => {
            if (curY >= 0 && Math.abs(it.ny - curY) > 0.004) {
              if (curLine) lines1.push(curLine);
              curLine = "";
            }
            curLine += (curLine ? "  " : "") + it.s;
            curY = it.ny;
          });
          if (curLine) lines1.push(curLine);

          // Parse lines like "A101  FLOOR PLAN" or "A-101 - FIRST FLOOR PLAN"
          const indexLineRe = /([A-Z]{1,2}[\-\.]?\d{1,3}(?:\.\d{1,2})?)\s+[\-–—]?\s*(.+)/;
          lines1.forEach(l => {
            const m = l.match(indexLineRe);
            if (m) {
              const num = m[1].toUpperCase().replace(/[\-\.]/g, "");
              const title = m[2].replace(/\s+/g, " ").trim();
              if (title.length > 2 && title.length < 60 && !noiseRe.test(title)) {
                indexMap[num] = title.length > 40 ? title.substring(0, 40).trim() : title;
              }
            }
          });
        }
      } catch (e) { /* index parsing is best-effort */ }

      for (let pg = 1; pg <= doc.numPages; pg++) {
        const pk = pdfIdx + ":" + pg;
        if (sheetNames[pk]) continue;
        try {
          const p = await doc.getPage(pg);
          const tc = await p.getTextContent();
          const vp = p.getViewport({ scale: 1 });
          const W = vp.width, H = vp.height;

          // All text items with normalized coords + font size
          const all = tc.items.map(it => ({
            s: it.str.trim(),
            nx: it.transform[4] / W,
            ny: 1 - (it.transform[5] / H),
            fs: Math.abs(it.transform[3]) || 10,
          })).filter(it => it.s.length > 0 && it.s.length < 80);

          // ── Multi-region scanning with scoring ──
          // Region candidates (normalized coords): right strip, bottom-right, bottom strip
          const regions = [
            { name: "right",       items: all.filter(i => i.nx > 0.82),                    weight: 1.0 },
            { name: "bottomRight", items: all.filter(i => i.nx > 0.55 && i.ny > 0.85),     weight: 0.9 },
            { name: "bottom",      items: all.filter(i => i.ny > 0.90),                     weight: 0.7 },
            { name: "topRight",    items: all.filter(i => i.nx > 0.82 && i.ny < 0.15),      weight: 0.5 },
          ];

          // Score sheet number candidates across all regions
          let bestNum = "", bestNumScore = 0;
          let bestTitle = "", bestTitleScore = 0;

          for (const region of regions) {
            if (region.items.length < 2) continue;

            for (const item of region.items) {
              const upper = item.s.toUpperCase().trim();
              if (noiseRe.test(upper)) continue;

              // ── Score sheet numbers ──
              if (sheetNumRe.test(upper) && upper.length <= 8 && upper.length >= 2) {
                let score = region.weight;
                // Bonus: larger font = more likely title block
                if (item.fs > 14) score += 0.5;
                if (item.fs > 10) score += 0.2;
                // Bonus: near bottom of the region (sheet numbers are usually at bottom of title block)
                if (item.ny > 0.85) score += 0.3;
                // Bonus: has digits (not just "A" or "S")
                if (/\d/.test(upper)) score += 0.3;
                // Bonus: matches common format like A101, A-1.01
                if (/^[A-Z]\d{2,3}/.test(upper)) score += 0.3;
                // Penalty: single char like "A" — too short
                if (upper.length <= 2 && !/\d/.test(upper)) score -= 1;

                if (score > bestNumScore) {
                  bestNumScore = score;
                  bestNum = upper;
                }
              }
            }

            // ── Build region text lines for title extraction ──
            const sorted = [...region.items].filter(i => !noiseRe.test(i.s)).sort((a, b) => a.ny - b.ny);
            const lines = [];
            let line = "", ly = -1;
            sorted.forEach(it => {
              if (ly >= 0 && Math.abs(it.ny - ly) > 0.005) {
                if (line) lines.push({ text: line, fs: sorted.find(s => line.includes(s.s))?.fs || 10 });
                line = "";
              }
              line += (line ? " " : "") + it.s;
              ly = it.ny;
            });
            if (line) lines.push({ text: line, fs: sorted[sorted.length - 1]?.fs || 10 });

            for (const l of lines) {
              if (titleKeywords.test(l.text) && !noiseRe.test(l.text)) {
                let score = region.weight;
                if (l.fs > 12) score += 0.5;
                if (l.fs > 8) score += 0.2;
                if (l.text.length < 40) score += 0.2; // Short = more likely a title, not a note
                if (score > bestTitleScore) {
                  bestTitleScore = score;
                  bestTitle = l.text.length > 40 ? l.text.substring(0, 40).trim() : l.text;
                }
              }
            }
          }

          // ── Cross-reference with index map if we found a sheet number ──
          if (bestNum && !bestTitle) {
            const normalized = bestNum.replace(/[\-\.]/g, "");
            if (indexMap[normalized]) {
              bestTitle = indexMap[normalized];
            }
          }

          // ── Build name ──
          if (bestNum || bestTitle) {
            setSheetNames(prev => ({ ...prev, [pk]: [bestNum, bestTitle].filter(Boolean).join(" - ") }));
          }
        } catch (err) {
          console.warn(`Auto-name page ${pg}:`, err.message);
        }
      }
    } finally {
      setAutoNaming(false);
    }
  }, [sheetNames]);

  // ── Load initial PDF into pdfFiles on mount ──
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLoadProgress, setPdfLoadProgress] = useState(0); // 0-100
  useEffect(() => {
    if (!storageUrl && !pdfData) return;
    let cancelled = false;
    setPdfLoading(true);
    setPdfLoadProgress(0);

    const source = storageUrl
      ? { url: storageUrl }
      : { data: pdfData.slice().buffer };

    console.log(`[DrawingViewer] Loading PDF via ${storageUrl ? "URL streaming" : "raw bytes"}${storageUrl ? "" : ` (${(pdfData.byteLength / 1024 / 1024).toFixed(1)}MB)`}`);
    const loadTask = pdfjsLib.getDocument(source);
    loadTask.onProgress = (progress) => {
      if (!cancelled && progress.total > 0) {
        setPdfLoadProgress(Math.min(95, Math.round((progress.loaded / progress.total) * 100)));
      }
    };
    loadTask.promise.then((doc) => {
      if (!cancelled) {
        setPdfLoadProgress(100);
        pdfDocRef.current = doc;
        setPdfFiles([{ name: fileName || "Drawing", data: null, doc, numPages: doc.numPages, storageUrl }]);
        setPdf(doc);
        setNumPages(doc.numPages);
        setPage(1);
        setActivePdfIdx(0);
        setPdfLoading(false);
        // Only cache to IDB/upload if using legacy bytes path (not URL streaming)
        if (pdfData && !storageUrl) {
          setTimeout(() => {
            if (takeoffId) {
              savePdfToIDB(`${takeoffId}_0`, pdfData).catch(() => {});
              uploadTakeoffPdf(takeoffId, pdfData, fileName || "Drawing.pdf", 0).catch(() => {});
            }
          }, 1000);
        }
        autoNamePages(doc, 0);
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error("[DrawingViewer] Failed to load PDF:", err);
        setPdfLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [storageUrl, pdfData]);

  // ── Auto-load PDFs: IDB cache → Supabase cloud → show re-upload UI ──
  useEffect(() => {
    if (pdfData || !takeoffId || !_init.pdfFileNames || _init.pdfFileNames.length === 0) return;
    let cancelled = false;
    (async () => {
      console.log(`[Restore] Attempting to restore ${_init.pdfFileNames.length} PDFs for takeoff ${takeoffId}`);
      const loaded = [];
      for (let i = 0; i < _init.pdfFileNames.length; i++) {
        const name = _init.pdfFileNames[i];
        let data = null;
        // Try IDB cache first
        try {
          data = await loadPdfFromIDB(`${takeoffId}_${i}`);
          if (data) console.log(`[Restore] PDF ${i} loaded from IDB cache`);
        } catch (err) { console.warn(`[IDB] Failed: ${err.message}`); }
        // Try Supabase Storage if IDB missed
        if (!data && !cancelled) {
          try {
            console.log(`[Restore] Trying Supabase Storage for PDF ${i}: ${name}`);
            const buf = await downloadTakeoffPdf(takeoffId, name, i);
            if (buf) {
              data = buf;
              console.log(`[Restore] PDF ${i} downloaded from Supabase Storage`);
              // Re-cache in IDB for next time
              savePdfToIDB(`${takeoffId}_${i}`, data).catch(() => {});
            }
          } catch (err) { console.warn(`[Supabase] Download failed:`, err.message); }
        }
        if (!data || cancelled) { console.warn(`[Restore] No data for PDF ${i}`); continue; }
        try {
          const doc = await pdfjsLib.getDocument({ data }).promise;
          loaded.push({ name, data, doc, numPages: doc.numPages });
        } catch (err) { console.warn(`[Restore] PDF parse failed:`, err.message); }
      }
      if (cancelled || loaded.length === 0) {
        console.warn("[Restore] No PDFs restored — user will need to re-upload");
        return;
      }
      console.log(`[Restore] Restored ${loaded.length} PDFs successfully`);
      setPdfFiles(loaded);
      pdfDocRef.current = loaded[0].doc;
      setPdf(loaded[0].doc);
      setNumPages(loaded[0].numPages);
      setPage(1);
      setActivePdfIdx(0);
      // Re-run auto-name on restored PDFs
      loaded.forEach((pf, idx) => autoNamePages(pf.doc, idx));
    })();
    return () => { cancelled = true; };
  }, [takeoffId]);

  // ── Switch active PDF when activePdfIdx changes ──
  useEffect(() => {
    const pf = pdfFiles[activePdfIdx];
    if (!pf) return;
    pdfDocRef.current = pf.doc;
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
        // Save to IndexedDB (cache) + Supabase Storage (cloud)
        if (takeoffId) {
          savePdfToIDB(`${takeoffId}_${newIdx}`, data).catch(() => {});
          uploadTakeoffPdf(takeoffId, data, file.name, newIdx).catch(() => {});
        }
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
      p.render({ canvasContext: ctx, viewport: vp }).promise.then(() => { if (!cancelled) setRendering(false); }).catch(() => {});
    }).catch((err) => { if (!cancelled) { console.warn("[DrawingViewer] getPage failed:", err.message); setRendering(false); } });
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

    // Adaptive label size — scales with zoom so labels stay readable
    const labelSize = Math.max(9, Math.min(14, 11 / Math.sqrt(zoom)));
    const smallLabel = Math.max(8, labelSize - 2);

    // Draw completed measurements — color by condition (skip hidden layers)
    pageMeasurements.forEach((m) => {
      const cond = conditions.find(c => c.id === m.conditionId);
      if (cond && hiddenFolders[cond.folder]) return; // layer hidden
      const color = cond?.color || "#3b82f6";
      const isSelected = m.id === selectedMeasId;
      const lw = isSelected ? 4 : 2.5;

      if (m.type === "linear") {
        const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
        // Selection glow
        if (isSelected) { ctx.strokeStyle = "#fff"; ctx.lineWidth = lw + 3; ctx.setLineDash([]); ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke(); }
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.setLineDash([]);
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        pts.forEach(p => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, isSelected ? 5 : 4, 0, Math.PI * 2); ctx.fill(); });
        // Per-segment dimension labels
        if (pts.length >= 2 && ppf) {
          ctx.font = `${smallLabel}px sans-serif`;
          ctx.textAlign = "center";
          for (let i = 1; i < pts.length; i++) {
            const segPx = dist(pts[i - 1], pts[i]);
            const segFt = segPx / (ppf * fitScaleRef.current * zoom);
            if (segFt < 0.1) continue; // skip tiny segments
            const mx = (pts[i - 1].x + pts[i].x) / 2;
            const my = (pts[i - 1].y + pts[i].y) / 2;
            const segTxt = `${segFt.toFixed(1)}'`;
            const stw = ctx.measureText(segTxt).width + 6;
            // Offset label perpendicular to segment direction
            const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const offX = -dy / len * 12, offY = dx / len * 12;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(mx + offX - stw / 2, my + offY - smallLabel / 2 - 2, stw, smallLabel + 2);
            ctx.fillStyle = "#ddd";
            ctx.fillText(segTxt, mx + offX, my + offY + smallLabel / 2 - 2);
          }
        }
        // Total label (at midpoint of path)
        if (pts.length >= 2) {
          ctx.font = `bold ${labelSize}px sans-serif`;
          const mid = pts[Math.floor(pts.length / 2)];
          const txt = `${m.totalFt.toFixed(1)}' LF`;
          const tw = ctx.measureText(txt).width + 10;
          ctx.fillStyle = isSelected ? "rgba(59,130,246,0.9)" : "rgba(0,0,0,0.75)";
          ctx.fillRect(mid.x - tw / 2, mid.y - labelSize - 6, tw, labelSize + 4);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(txt, mid.x, mid.y - 8);
        }
      } else if (m.type === "area") {
        const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
        const isBackout = !!m.backoutOf;
        // Selection glow
        if (isSelected) { ctx.strokeStyle = "#fff"; ctx.lineWidth = lw + 3; ctx.setLineDash([]); ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.stroke(); }
        ctx.fillStyle = isBackout ? "rgba(239,68,68,0.15)" : color + (isSelected ? "44" : "22");
        ctx.strokeStyle = isBackout ? "#ef4444" : color;
        ctx.lineWidth = lw;
        if (isBackout) ctx.setLineDash([6, 4]); else ctx.setLineDash([]);
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        // Hatch pattern for backouts
        if (isBackout) {
          ctx.save();
          ctx.beginPath();
          pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.clip();
          ctx.strokeStyle = "rgba(239,68,68,0.3)";
          ctx.lineWidth = 1;
          const minX = Math.min(...pts.map(p => p.x));
          const maxX = Math.max(...pts.map(p => p.x));
          const minY = Math.min(...pts.map(p => p.y));
          const maxY = Math.max(...pts.map(p => p.y));
          for (let d = minX + minY - (maxX - minX); d < maxX + maxY; d += 12) {
            ctx.beginPath();
            ctx.moveTo(d, minY);
            ctx.lineTo(d - maxY + minY, maxY);
            ctx.stroke();
          }
          ctx.restore();
        }
        pts.forEach(p => { ctx.fillStyle = isBackout ? "#ef4444" : color; ctx.beginPath(); ctx.arc(p.x, p.y, isSelected ? 5 : 4, 0, Math.PI * 2); ctx.fill(); });
        ctx.font = `bold ${labelSize}px sans-serif`;
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const txt = isBackout ? `-${m.totalSf.toFixed(0)} SF` : `${m.totalSf.toFixed(0)} SF`;
        const tw = ctx.measureText(txt).width + 10;
        ctx.fillStyle = isBackout ? "rgba(239,68,68,0.9)" : isSelected ? "rgba(59,130,246,0.9)" : "rgba(0,0,0,0.75)";
        ctx.fillRect(cx - tw / 2, cy - labelSize / 2 - 2, tw, labelSize + 4);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(txt, cx, cy + labelSize / 2 - 1);
      } else if (m.type === "count") {
        const pt = { x: m.point.x * scale, y: m.point.y * scale };
        const r = isSelected ? 13 : 10;
        // Selection glow
        if (isSelected) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(pt.x, pt.y, r + 3, 0, Math.PI * 2); ctx.stroke(); }
        // Outer circle
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = color + "44";
        ctx.fill();
        // Inner dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Count number
        ctx.font = `${smallLabel}px sans-serif`;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(pt.x + r + 2, pt.y - 8, 18, 14);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(m.count || 1, pt.x + r + 11, pt.y + 3);
        // Attachment deduction label (red badge below count)
        const countCond = conditions.find(c => c.id === m.conditionId);
        if (countCond?.attachTo && countCond.deductWidth > 0) {
          const pCond = conditions.find(c => c.id === countCond.attachTo);
          const isAreaP = pCond?.type === "area";
          const dlabel = isAreaP
            ? `-${Math.round(countCond.deductWidth * (countCond.deductHeight || 1))} SF`
            : `-${countCond.deductWidth}'`;
          ctx.font = `bold ${smallLabel - 1}px sans-serif`;
          const tw = ctx.measureText(dlabel).width + 6;
          ctx.fillStyle = "rgba(239,68,68,0.85)";
          ctx.fillRect(pt.x - tw / 2, pt.y + r + 2, tw, 12);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(dlabel, pt.x, pt.y + r + 11);
        }
      }
    });

    // ── Condition name labels on measurements (toggle with N key) ──
    if (showCondNames) {
      pageMeasurements.forEach(m => {
        const cond = conditions.find(c => c.id === m.conditionId);
        if (!cond || hiddenFolders[cond.folder]) return;
        let lx, ly;
        if (m.type === "linear" && m.vertices?.length >= 2) {
          const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
          lx = pts[0].x; ly = pts[0].y - 10;
        } else if (m.type === "area" && m.vertices?.length >= 3) {
          const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
          lx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          ly = pts.reduce((s, p) => s + p.y, 0) / pts.length + labelSize + 8;
        } else if (m.type === "count" && m.point) {
          lx = m.point.x * scale; ly = m.point.y * scale - 16;
        } else return;
        const name = cond.name.length > 20 ? cond.name.slice(0, 18) + ".." : cond.name;
        ctx.font = `${smallLabel - 1}px sans-serif`;
        const tw = ctx.measureText(name).width + 6;
        ctx.fillStyle = cond.color + "CC";
        ctx.fillRect(lx - tw / 2, ly - smallLabel + 1, tw, smallLabel + 1);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(name, lx, ly);
      });
    }

    // ── Right-angle (90°) indicators at polygon corners ──
    pageMeasurements.forEach(m => {
      if (m.type !== "linear" && m.type !== "area") return;
      if (!m.vertices || m.vertices.length < 3) return;
      const cond = conditions.find(c => c.id === m.conditionId);
      if (cond && hiddenFolders[cond.folder]) return;
      const pts = m.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
      const color = cond?.color || "#3b82f6";
      for (let i = (m.type === "area" ? 0 : 1); i < pts.length - (m.type === "area" ? 0 : 1); i++) {
        const prev = pts[(i - 1 + pts.length) % pts.length];
        const curr = pts[i % pts.length];
        const next = pts[(i + 1) % pts.length];
        const dx1 = prev.x - curr.x, dy1 = prev.y - curr.y;
        const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
        const dot = dx1 * dx2 + dy1 * dy2;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        const cosA = dot / (len1 * len2);
        if (Math.abs(cosA) < 0.08) { // within ~4.5° of 90°
          const sz = Math.min(10, len1 * 0.2, len2 * 0.2);
          const ux1 = dx1 / len1 * sz, uy1 = dy1 / len1 * sz;
          const ux2 = dx2 / len2 * sz, uy2 = dy2 / len2 * sz;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(curr.x + ux1, curr.y + uy1);
          ctx.lineTo(curr.x + ux1 + ux2, curr.y + uy1 + uy2);
          ctx.lineTo(curr.x + ux2, curr.y + uy2);
          ctx.stroke();
        }
      }
    });

    // ── Hover tooltip ──
    if (hoveredMeasId && !selectedMeasId) {
      const hm = pageMeasurements.find(m => m.id === hoveredMeasId);
      if (hm && mousePos) {
        const hCond = conditions.find(c => c.id === hm.conditionId);
        const hAsm = hCond?.asmCode && assemblies?.find(a => a.code === hCond.asmCode);
        const hQty = hm.type === "count" ? (hm.count || 1) : hm.type === "linear" ? (hm.totalFt || 0) : (hm.totalSf || 0);
        const hUnit = hm.type === "count" ? "EA" : hm.type === "linear" ? "LF" : "SF";
        const hCost = hAsm ? hQty * ((hAsm.matRate || 0) + (hAsm.labRate || 0)) : 0;
        const ba = bidAreas.find(b => b.id === hm.bidAreaId);
        const lines = [
          hCond?.name || "Unknown",
          `${Math.round(hQty * 10) / 10} ${hUnit}` + (hCost > 0 ? ` · $${Math.round(hCost)}` : ""),
          ba ? `Area: ${ba.name}` : null,
          hm.backoutOf ? "BACKOUT" : null,
        ].filter(Boolean);
        const tx = mousePos.x + 16, ty = mousePos.y - 10;
        ctx.font = `${smallLabel}px sans-serif`;
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + 12;
        const boxH = lines.length * (smallLabel + 3) + 6;
        ctx.fillStyle = "rgba(0,0,0,0.9)";
        ctx.fillRect(tx, ty - boxH, maxW, boxH);
        ctx.strokeStyle = (hCond?.color || "#3b82f6") + "88";
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty - boxH, maxW, boxH);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        lines.forEach((line, li) => {
          ctx.fillStyle = li === 0 ? (hCond?.color || "#3b82f6") : "#ccc";
          ctx.fillText(line, tx + 6, ty - boxH + (li + 1) * (smallLabel + 3));
        });
      }
    }

    // Draw resize handles on completed measurements (when in PAN mode and not drawing)
    if (mode === MODE.PAN && activeVertices.length === 0) {
      pageMeasurements.forEach((m) => {
        const cond = conditions.find(c => c.id === m.conditionId);
        if (cond && hiddenFolders[cond.folder]) return;
        const color = cond?.color || "#3b82f6";
        if (m.vertices) {
          m.vertices.forEach((v, vi) => {
            const sx = v.x * scale, sy = v.y * scale;
            const isActive = draggingHandle && draggingHandle.measurementId === m.id && draggingHandle.vertexIdx === vi;
            ctx.fillStyle = isActive ? "#fff" : color;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(sx - 5, sy - 5, 10, 10);
            ctx.fill();
            ctx.stroke();
          });
        } else if (m.point) {
          const sx = m.point.x * scale, sy = m.point.y * scale;
          const isActive = draggingHandle && draggingHandle.measurementId === m.id;
          ctx.fillStyle = isActive ? "#fff" : color;
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(sx - 5, sy - 5, 10, 10);
          ctx.fill();
          ctx.stroke();
        }
      });
    }

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
      const pts = activeVertices.filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
      // White outline for contrast against any background
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.setLineDash([]);
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      // Colored dashed line on top
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      // Default = snap preview line to angle; Shift = free trace
      let cursorTarget = mousePos;
      if (mousePos && (snapEnabled !== shiftHeld) && activeVertices.length > 0) {
        const lastScaled = { x: activeVertices[activeVertices.length - 1].x * scale, y: activeVertices[activeVertices.length - 1].y * scale };
        cursorTarget = snapToAngle(lastScaled, mousePos);
      }
      if (cursorTarget) ctx.lineTo(cursorTarget.x, cursorTarget.y);
      if (mode === MODE.AREA && pts.length > 1) ctx.closePath();
      ctx.stroke(); ctx.setLineDash([]);
      pts.forEach(p => {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      });

      // Show angle indicator when snapping (default mode, not holding Shift)
      if (cursorTarget && (snapEnabled !== shiftHeld) && activeVertices.length > 0) {
        const lastScaled = { x: activeVertices[activeVertices.length - 1].x * scale, y: activeVertices[activeVertices.length - 1].y * scale };
        const dx = cursorTarget.x - lastScaled.x;
        const dy = cursorTarget.y - lastScaled.y;
        const angle = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
        ctx.fillStyle = "rgba(59,130,246,0.9)";
        ctx.fillRect(cursorTarget.x + 14, cursorTarget.y - 28, 40, 16);
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`${Math.round(angle)}°`, cursorTarget.x + 18, cursorTarget.y - 16);
      }

      // Running measurement at cursor
      if (ppf && cursorTarget) {
        let totalPx = 0;
        for (let i = 1; i < pts.length; i++) totalPx += dist(pts[i - 1], pts[i]);
        totalPx += dist(pts[pts.length - 1], cursorTarget);
        const ft = totalPx / (ppf * fitScaleRef.current * zoom);
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(cursorTarget.x + 14, cursorTarget.y - 10, 70, 18);
        ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
        ctx.fillText(`${ft.toFixed(1)}' LF`, cursorTarget.x + 18, cursorTarget.y + 3);
      }
    }

    // Draw selection highlights for Typical Group creation (cyan dashed outline)
    if (selectedMeasIds.size > 0) {
      pageMeasurements.filter(m => selectedMeasIds.has(m.id)).forEach(m => {
        ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
        if (m.vertices) {
          const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
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
        const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
        ctx.strokeStyle = coColor; ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
        ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
        ctx.setLineDash([]);
        const mid = pts[Math.floor(pts.length / 2)];
        const lbl = `${m.coType === "delete" ? "DEL" : "ADD"} ${m.totalFt.toFixed(1)}' LF`;
        ctx.font = "bold 10px sans-serif"; const tw = ctx.measureText(lbl).width + 8;
        ctx.fillStyle = coColor; ctx.fillRect(mid.x - tw / 2, mid.y - 18, tw, 16);
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(lbl, mid.x, mid.y - 6);
      } else if (m.type === "area" && m.vertices) {
        const pts = (m.vertices || []).filter(v => v).map(v => ({ x: v.x * scale, y: v.y * scale }));
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

    // ── Measure (ruler) tool: draw persisted rulers + active ruler ──
    const pageRulers = measureResults.filter(r => r.pageKey === pageKey);
    [...pageRulers, ...(measureVertices.length > 0 ? [{ vertices: measureVertices, totalFt: null, active: true }] : [])].forEach(ruler => {
      const verts = ruler.vertices;
      if (verts.length < 1) return;
      const pts = verts.map(v => ({ x: v.x * scale, y: v.y * scale }));
      // Draw dashed orange line
      ctx.save();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      // Active ruler: also draw to mouse
      if (ruler.active && mousePos) {
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Vertex dots
      pts.forEach(p => { ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
      // Per-segment labels
      for (let i = 1; i < pts.length; i++) {
        const segPx = dist(verts[i - 1], verts[i]);
        const segFt = ppf ? segPx / ppf : 0;
        const mx = (pts[i - 1].x + pts[i].x) / 2;
        const my = (pts[i - 1].y + pts[i].y) / 2;
        const lbl = `${segFt.toFixed(1)}'`;
        ctx.font = "bold 11px sans-serif";
        const tw = ctx.measureText(lbl).width;
        ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
        ctx.fillStyle = "#f59e0b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(lbl, mx, my);
      }
      // Active: show live segment to mouse
      if (ruler.active && mousePos && pts.length > 0 && ppf) {
        const last = verts[verts.length - 1];
        const mNorm = { x: mousePos.x / scale, y: mousePos.y / scale };
        const livePx = dist(last, mNorm);
        const liveFt = livePx / ppf;
        const mx = (pts[pts.length - 1].x + mousePos.x) / 2;
        const my = (pts[pts.length - 1].y + mousePos.y) / 2;
        const lbl = `${liveFt.toFixed(1)}'`;
        ctx.font = "bold 11px sans-serif";
        const tw = ctx.measureText(lbl).width;
        ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
        ctx.fillStyle = "#f59e0b"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(lbl, mx, my);
      }
      // Total badge for completed rulers
      if (!ruler.active && ruler.totalFt != null && pts.length >= 2) {
        let totalPx = 0;
        for (let i = 1; i < verts.length; i++) totalPx += dist(verts[i - 1], verts[i]);
        const totalFt = ppf ? totalPx / ppf : ruler.totalFt;
        const midIdx = Math.floor(pts.length / 2);
        const bx = pts[midIdx].x;
        const by = pts[midIdx].y - 14;
        const tLbl = `📏 ${totalFt.toFixed(1)}' total`;
        ctx.font = "bold 12px sans-serif";
        const tw = ctx.measureText(tLbl).width;
        ctx.fillStyle = "rgba(245,158,11,0.9)"; ctx.fillRect(bx - tw / 2 - 6, by - 9, tw + 12, 20);
        ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(tLbl, bx, by + 1);
      }
      ctx.restore();
    });

    // ── Annotations (markup layer — drawn on top of measurements) ──
    pageAnnotations.forEach(ann => {
      ctx.save();
      ctx.globalAlpha = ann.opacity || 1.0;
      const sc = ann.strokeColor || "#ef4444";
      const lw = ann.lineWidth || 2;
      const isSel = ann.id === selectedAnnId;

      if (ann.type === "text") {
        const px = ann.position.x * scale;
        const py = ann.position.y * scale;
        const fs = (ann.fontSize || 14) * Math.min(Math.max(zoom, 0.5), 2);
        ctx.font = `bold ${fs}px sans-serif`;
        const tw = ctx.measureText(ann.text).width;
        const pad = 4;
        // Background
        ctx.fillStyle = isSel ? "rgba(239,68,68,0.15)" : "rgba(0,0,0,0.7)";
        ctx.fillRect(px - pad, py - fs + 2, tw + pad * 2, fs + pad);
        if (isSel) { ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.strokeRect(px - pad, py - fs + 2, tw + pad * 2, fs + pad); ctx.setLineDash([]); }
        // Text
        ctx.fillStyle = sc;
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(ann.text, px, py);
      }

      if (ann.type === "arrow" || ann.type === "line") {
        const sx = ann.start.x * scale, sy = ann.start.y * scale;
        const ex = ann.end.x * scale, ey = ann.end.y * scale;
        ctx.strokeStyle = sc; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        // Arrowhead for arrow type
        if (ann.type === "arrow") {
          const angle = Math.atan2(ey - sy, ex - sx);
          const headLen = 12 + lw * 2;
          ctx.fillStyle = sc;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
          ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
          ctx.closePath(); ctx.fill();
        }
        // Selection highlight
        if (isSel) { ctx.strokeStyle = "rgba(239,68,68,0.6)"; ctx.lineWidth = lw + 4; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]); }
        // Endpoint dots
        [{ x: sx, y: sy }, { x: ex, y: ey }].forEach(p => { ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
      }

      if (ann.type === "callout") {
        const px = ann.position.x * scale, py = ann.position.y * scale;
        const ax = ann.anchorPt.x * scale, ay = ann.anchorPt.y * scale;
        const fs = (ann.fontSize || 14) * Math.min(Math.max(zoom, 0.5), 2);
        ctx.font = `bold ${fs}px sans-serif`;
        const tw = ctx.measureText(ann.text).width;
        const pad = 6;
        const boxW = tw + pad * 2;
        const boxH = fs + pad * 2;
        ctx.strokeStyle = sc; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
        const angle = Math.atan2(ay - py, ax - px);
        const headLen = 10 + lw;
        ctx.fillStyle = sc; ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - headLen * Math.cos(angle - 0.4), ay - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(ax - headLen * Math.cos(angle + 0.4), ay - headLen * Math.sin(angle + 0.4));
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = isSel ? "rgba(239,68,68,0.15)" : "rgba(0,0,0,0.8)";
        ctx.fillRect(px - pad, py - fs - pad + 4, boxW, boxH);
        ctx.strokeStyle = sc; ctx.lineWidth = 1;
        ctx.strokeRect(px - pad, py - fs - pad + 4, boxW, boxH);
        if (isSel) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.strokeRect(px - pad - 2, py - fs - pad + 2, boxW + 4, boxH + 4); ctx.setLineDash([]); }
        ctx.fillStyle = sc; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText(ann.text, px, py);
      }

      // ── Highlighter / Ink (freehand path) ──
      if (ann.type === "highlighter" || ann.type === "ink") {
        if (ann.vertices && ann.vertices.length >= 2) {
          const pts = ann.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
          ctx.strokeStyle = sc; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
          if (isSel) { ctx.strokeStyle = "rgba(239,68,68,0.4)"; ctx.lineWidth = lw + 6; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); ctx.setLineDash([]); }
        }
      }

      // ── Rectangle ──
      if (ann.type === "rect") {
        const x1 = Math.min(ann.start.x, ann.end.x) * scale;
        const y1 = Math.min(ann.start.y, ann.end.y) * scale;
        const w = Math.abs(ann.end.x - ann.start.x) * scale;
        const h = Math.abs(ann.end.y - ann.start.y) * scale;
        if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fillRect(x1, y1, w, h); }
        ctx.strokeStyle = sc; ctx.lineWidth = lw; ctx.strokeRect(x1, y1, w, h);
        if (isSel) { ctx.strokeStyle = "rgba(239,68,68,0.6)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.strokeRect(x1 - 2, y1 - 2, w + 4, h + 4); ctx.setLineDash([]); }
      }

      // ── Oval ──
      if (ann.type === "oval") {
        const cx = (ann.start.x + ann.end.x) / 2 * scale;
        const cy = (ann.start.y + ann.end.y) / 2 * scale;
        const rx = Math.abs(ann.end.x - ann.start.x) / 2 * scale;
        const ry = Math.abs(ann.end.y - ann.start.y) / 2 * scale;
        ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
        if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fill(); }
        ctx.strokeStyle = sc; ctx.lineWidth = lw; ctx.stroke();
        if (isSel) { ctx.strokeStyle = "rgba(239,68,68,0.6)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx + 3, 1), Math.max(ry + 3, 1), 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      }

      // ── Polygon (closed outline) ──
      if (ann.type === "polygon") {
        if (ann.vertices && ann.vertices.length >= 3) {
          const pts = ann.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          if (ann.fillColor) { ctx.fillStyle = ann.fillColor; ctx.fill(); }
          ctx.strokeStyle = sc; ctx.lineWidth = lw; ctx.stroke();
          if (isSel) { ctx.strokeStyle = "rgba(239,68,68,0.6)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
        }
      }

      // ── Cloud (revision cloud — scalloped outline) ──
      if (ann.type === "cloud") {
        if (ann.vertices && ann.vertices.length >= 3) {
          const pts = ann.vertices.map(v => ({ x: v.x * scale, y: v.y * scale }));
          // Draw scalloped arcs along each edge
          if (ann.fillColor) {
            ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.closePath(); ctx.fillStyle = ann.fillColor; ctx.fill();
          }
          ctx.strokeStyle = sc; ctx.lineWidth = lw;
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            const edgeLen = dist(a, b);
            const bumpSize = Math.min(18, edgeLen / 3);
            const numBumps = Math.max(2, Math.round(edgeLen / bumpSize));
            for (let j = 0; j < numBumps; j++) {
              const t0 = j / numBumps, t1 = (j + 1) / numBumps;
              const x0 = a.x + (b.x - a.x) * t0, y0 = a.y + (b.y - a.y) * t0;
              const x1 = a.x + (b.x - a.x) * t1, y1 = a.y + (b.y - a.y) * t1;
              const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
              // Normal direction (outward)
              const dx = x1 - x0, dy = y1 - y0;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const nx = -dy / len * bumpSize * 0.5, ny = dx / len * bumpSize * 0.5;
              ctx.beginPath(); ctx.moveTo(x0, y0);
              ctx.quadraticCurveTo(mx + nx, my + ny, x1, y1);
              ctx.stroke();
            }
          }
          if (isSel) { ctx.strokeStyle = "rgba(239,68,68,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
        }
      }

      // ── Hot Link (clickable navigation marker) ──
      if (ann.type === "hotlink") {
        const px = ann.position.x * scale, py = ann.position.y * scale;
        const label = ann.label || "🔗";
        const fs = 11 * Math.min(Math.max(zoom, 0.5), 2);
        ctx.font = `bold ${fs}px sans-serif`;
        const tw = ctx.measureText("🔗 " + label).width;
        const pad = 5;
        const boxW = tw + pad * 2;
        const boxH = fs + pad * 2;
        // Background pill
        ctx.fillStyle = isSel ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.15)";
        const r = boxH / 2;
        ctx.beginPath(); ctx.moveTo(px - pad + r, py - fs - pad + 4); ctx.arcTo(px - pad + boxW, py - fs - pad + 4, px - pad + boxW, py - fs - pad + 4 + boxH, r); ctx.arcTo(px - pad + boxW, py - fs - pad + 4 + boxH, px - pad, py - fs - pad + 4 + boxH, r); ctx.arcTo(px - pad, py - fs - pad + 4 + boxH, px - pad, py - fs - pad + 4, r); ctx.arcTo(px - pad, py - fs - pad + 4, px - pad + boxW, py - fs - pad + 4, r); ctx.closePath(); ctx.fill();
        // Border
        ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = isSel ? 2 : 1;
        ctx.stroke();
        if (isSel) { ctx.setLineDash([4, 3]); ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.setLineDash([]); }
        // Text
        ctx.fillStyle = "#93c5fd"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.fillText("🔗 " + label, px, py);
      }

      ctx.restore();
    });

    // Live preview: arrow/line/callout first-click → mouse
    if ((mode === MODE.ARROW || mode === MODE.LINE_ANN || mode === MODE.CALLOUT) && annStartPt && mousePos) {
      ctx.save();
      const sx = annStartPt.x * scale, sy = annStartPt.y * scale;
      ctx.strokeStyle = annStyle.strokeColor; ctx.lineWidth = annStyle.lineWidth;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mousePos.x, mousePos.y); ctx.stroke();
      ctx.setLineDash([]);
      // Arrow preview head
      if (mode === MODE.ARROW) {
        const angle = Math.atan2(mousePos.y - sy, mousePos.x - sx);
        const headLen = 12;
        ctx.fillStyle = annStyle.strokeColor; ctx.beginPath();
        ctx.moveTo(mousePos.x, mousePos.y);
        ctx.lineTo(mousePos.x - headLen * Math.cos(angle - 0.4), mousePos.y - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(mousePos.x - headLen * Math.cos(angle + 0.4), mousePos.y - headLen * Math.sin(angle + 0.4));
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // Live preview: polygon/cloud vertices
    if ((mode === MODE.POLYGON_ANN || mode === MODE.CLOUD) && annPolyVerts.length > 0) {
      ctx.save();
      const pts = annPolyVerts.map(v => ({ x: v.x * scale, y: v.y * scale }));
      ctx.strokeStyle = annStyle.strokeColor; ctx.lineWidth = annStyle.lineWidth;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (mousePos) ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke(); ctx.setLineDash([]);
      pts.forEach(p => { ctx.fillStyle = annStyle.strokeColor; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }

    // Live preview: drag-based annotations
    if (annDragging) {
      ctx.save();
      ctx.globalAlpha = annDragging.type === "highlighter" ? 0.3 : (annStyle.opacity || 1.0);
      ctx.strokeStyle = annStyle.strokeColor; ctx.lineWidth = annDragging.type === "highlighter" ? Math.max(annStyle.lineWidth * 6, 12) : annStyle.lineWidth;
      if (annDragging.type === "highlighter" || annDragging.type === "ink") {
        const pts = annDragging.points.map(v => ({ x: v.x * scale, y: v.y * scale }));
        if (pts.length >= 2) {
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }
      }
      if ((annDragging.type === "rect" || annDragging.type === "oval") && annDragging.endPt) {
        const x1 = Math.min(annDragging.startPt.x, annDragging.endPt.x) * scale;
        const y1 = Math.min(annDragging.startPt.y, annDragging.endPt.y) * scale;
        const w = Math.abs(annDragging.endPt.x - annDragging.startPt.x) * scale;
        const h = Math.abs(annDragging.endPt.y - annDragging.startPt.y) * scale;
        ctx.setLineDash([6, 4]);
        if (annStyle.fillColor) { ctx.fillStyle = annStyle.fillColor; if (annDragging.type === "oval") { ctx.beginPath(); ctx.ellipse(x1 + w / 2, y1 + h / 2, w / 2 || 1, h / 2 || 1, 0, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(x1, y1, w, h); }
        if (annDragging.type === "oval") { ctx.beginPath(); ctx.ellipse(x1 + w / 2, y1 + h / 2, w / 2 || 1, h / 2 || 1, 0, 0, Math.PI * 2); ctx.stroke(); }
        else ctx.strokeRect(x1, y1, w, h);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // Backout mode indicator
    if (backoutMode) {
      const ch = canvas.height / dpr;
      const parentMeas = pageMeasurements.find(pm => pm.id === backoutMode);
      const parentCond = parentMeas ? conditions.find(c => c.id === parentMeas.conditionId) : null;
      const boLabel = `BACKOUT: Drawing hole in ${parentCond?.name || "area"}`;
      ctx.fillStyle = "rgba(239,68,68,0.85)"; ctx.fillRect(8, ch - 70, ctx.measureText(boLabel).width + 20 || 220, 18);
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(boLabel, 14, ch - 57);
    }

    // Scale indicator
    if (ppf) {
      const ch = canvas.height / dpr;
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(8, ch - 28, 130, 20);
      ctx.fillStyle = "#4ade80"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`Scale set (${(1 / ppf).toFixed(4)}'/px)`, 14, ch - 14);
    }
  }, [pageMeasurements, calPoints, activeVertices, mousePos, mode, ppf, zoom, conditions, activeCond, hiddenFolders, selectedMeasIds, selectedMeasId, typicalGroups, measurements, pageKey, placingTypicalId, coPageMeasurements, coMode, shiftHeld, draggingHandle, backoutMode, showCondNames, hoveredMeasId, assemblies, bidAreas, measureVertices, measureResults, pageAnnotations, selectedAnnId, annStartPt, annStyle, annPolyVerts, annDragging]);

  useEffect(() => { requestAnimationFrame(drawOverlay); }, [drawOverlay]);
  // Reset setup panels when switching conditions
  useEffect(() => { setShowAttachSetup(false); setShowLinkSetup(false); }, [activeCondId]);

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
    if (mode === MODE.PAN) {
      // Click-to-select: check annotations first (drawn on top), then measurements
      const clickPt = getCanvasCoords(e);
      const scale = fitScaleRef.current * zoom;

      // Check annotations (reverse order = topmost first)
      let closestAnn = null, closestAnnDist = 20;
      [...pageAnnotations].reverse().forEach(ann => {
        if (ann.type === "text") {
          const px = ann.position.x * scale, py = ann.position.y * scale;
          const d = dist(clickPt, { x: px, y: py });
          if (d < 30 && d < closestAnnDist) { closestAnnDist = d; closestAnn = ann.id; }
        } else if (ann.type === "arrow" || ann.type === "line") {
          const sa = { x: ann.start.x * scale, y: ann.start.y * scale };
          const ea = { x: ann.end.x * scale, y: ann.end.y * scale };
          const d = distToSegment(clickPt, sa, ea);
          if (d < closestAnnDist) { closestAnnDist = d; closestAnn = ann.id; }
        } else if (ann.type === "callout") {
          const px = ann.position.x * scale, py = ann.position.y * scale;
          const ax = ann.anchorPt.x * scale, ay = ann.anchorPt.y * scale;
          const dText = dist(clickPt, { x: px, y: py });
          const dLine = distToSegment(clickPt, { x: px, y: py }, { x: ax, y: ay });
          const d = Math.min(dText, dLine);
          if (d < 25 && d < closestAnnDist) { closestAnnDist = d; closestAnn = ann.id; }
        } else if (ann.type === "highlighter" || ann.type === "ink") {
          if (ann.vertices) {
            for (let i = 0; i < ann.vertices.length - 1; i++) {
              const d = distToSegment(clickPt, { x: ann.vertices[i].x * scale, y: ann.vertices[i].y * scale }, { x: ann.vertices[i + 1].x * scale, y: ann.vertices[i + 1].y * scale });
              if (d < (ann.type === "highlighter" ? 15 : closestAnnDist)) { closestAnnDist = d; closestAnn = ann.id; break; }
            }
          }
        } else if (ann.type === "rect" || ann.type === "oval") {
          const cx = (ann.start.x + ann.end.x) / 2 * scale;
          const cy = (ann.start.y + ann.end.y) / 2 * scale;
          const hw = Math.abs(ann.end.x - ann.start.x) / 2 * scale;
          const hh = Math.abs(ann.end.y - ann.start.y) / 2 * scale;
          // Simple bounding box hit test
          if (Math.abs(clickPt.x - cx) < hw + 10 && Math.abs(clickPt.y - cy) < hh + 10) {
            const d = dist(clickPt, { x: cx, y: cy });
            if (d < closestAnnDist) { closestAnnDist = d; closestAnn = ann.id; }
          }
        } else if (ann.type === "polygon" || ann.type === "cloud") {
          if (ann.vertices) {
            for (let i = 0; i < ann.vertices.length; i++) {
              const a = { x: ann.vertices[i].x * scale, y: ann.vertices[i].y * scale };
              const b = { x: ann.vertices[(i + 1) % ann.vertices.length].x * scale, y: ann.vertices[(i + 1) % ann.vertices.length].y * scale };
              const d = distToSegment(clickPt, a, b);
              if (d < closestAnnDist) { closestAnnDist = d; closestAnn = ann.id; break; }
            }
          }
        } else if (ann.type === "hotlink") {
          const px = ann.position.x * scale, py = ann.position.y * scale;
          const d = dist(clickPt, { x: px, y: py });
          if (d < 35 && d < closestAnnDist) { closestAnnDist = d; closestAnn = ann.id; }
        }
      });

      if (closestAnn) {
        setSelectedAnnId(closestAnn);
        setSelectedMeasId(null);
        return;
      }

      // Check measurements
      let closest = null, closestDist = 20;
      pageMeasurements.forEach(m => {
        if (m.vertices) {
          for (let i = 0; i < m.vertices.length - (m.type === "area" ? 0 : 1); i++) {
            const a = { x: m.vertices[i].x * scale, y: m.vertices[i].y * scale };
            const b = { x: m.vertices[(i + 1) % m.vertices.length].x * scale, y: m.vertices[(i + 1) % m.vertices.length].y * scale };
            const d = distToSegment(clickPt, a, b);
            if (d < closestDist) { closestDist = d; closest = m.id; }
          }
          m.vertices.forEach(v => {
            const d = dist({ x: v.x * scale, y: v.y * scale }, clickPt);
            if (d < closestDist) { closestDist = d; closest = m.id; }
          });
        } else if (m.point) {
          const d = dist({ x: m.point.x * scale, y: m.point.y * scale }, clickPt);
          if (d < closestDist) { closestDist = d; closest = m.id; }
        }
      });
      setSelectedMeasId(closest);
      setSelectedAnnId(null); // clear annotation selection when selecting measurement
      return;
    }
    if (mode === MODE.CALIBRATE) {
      const pt = getNormCoords(e);
      if (calPoints.length < 2) { const next = [...calPoints, pt]; setCalPoints(next); if (next.length === 2) setShowCalPrompt(true); }
      return;
    }
    // ── Measure (ruler) tool — works without a condition ──
    if (mode === MODE.MEASURE) {
      if (!ppf) return;
      let pt = getNormCoords(e);
      if ((snapEnabled ? !e.shiftKey : e.shiftKey) && measureVertices.length > 0) {
        pt = snapToAngle(measureVertices[measureVertices.length - 1], pt);
      }
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      pendingClickRef.current = pt;
      clickTimerRef.current = setTimeout(() => {
        const ptToAdd = pendingClickRef.current;
        pendingClickRef.current = null;
        if (ptToAdd) setMeasureVertices(prev => [...prev, ptToAdd]);
      }, 200);
      return;
    }
    // ── Annotation tools (no condition required) ──
    if (mode === MODE.TEXT) {
      const pt = getNormCoords(e);
      setShowAnnTextInput({ position: pt, type: "text" });
      setAnnTextValue("");
      setTimeout(() => annTextRef.current?.focus(), 50);
      return;
    }
    if (mode === MODE.ARROW || mode === MODE.LINE_ANN) {
      const pt = getNormCoords(e);
      if (!annStartPt) {
        setAnnStartPt(pt);
      } else {
        addAnnotation({
          id: "ann_" + Date.now(), type: mode === MODE.ARROW ? "arrow" : "line",
          pageKey, start: annStartPt, end: pt,
          strokeColor: annStyle.strokeColor, lineWidth: annStyle.lineWidth,
        });
        setAnnStartPt(null);
        if (!continuousMode) setMode(MODE.PAN);
      }
      return;
    }
    if (mode === MODE.CALLOUT) {
      const pt = getNormCoords(e);
      if (!annStartPt) {
        setAnnStartPt(pt);
      } else {
        setShowAnnTextInput({ position: pt, type: "callout", anchorPt: annStartPt });
        setAnnTextValue("");
        setAnnStartPt(null);
        setTimeout(() => annTextRef.current?.focus(), 50);
      }
      return;
    }
    // Polygon / Cloud: click to add vertex (debounced like linear)
    if (mode === MODE.POLYGON_ANN || mode === MODE.CLOUD) {
      const pt = getNormCoords(e);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      pendingClickRef.current = pt;
      clickTimerRef.current = setTimeout(() => {
        const ptToAdd = pendingClickRef.current;
        pendingClickRef.current = null;
        if (ptToAdd) setAnnPolyVerts(prev => [...prev, ptToAdd]);
      }, 200);
      return;
    }
    // Hot link: place a clickable navigation marker
    if (mode === MODE.HOTLINK && hotlinkTargetId) {
      const pt = getNormCoords(e);
      const targetView = namedViews.find(v => v.id === hotlinkTargetId);
      addAnnotation({
        id: "ann_" + Date.now(), type: "hotlink", pageKey,
        position: pt, targetViewId: hotlinkTargetId,
        label: targetView ? targetView.name : "View",
        strokeColor: "#3b82f6", lineWidth: 2,
      });
      if (!continuousMode) { setMode(MODE.PAN); setHotlinkTargetId(null); }
      return;
    }
    // Drag-based modes (highlighter, ink, rect, oval) — handled via mousedown on overlay
    if (ANN_DRAG_MODES.has(mode)) return;
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
      // Debounce: delay vertex placement so dblclick can cancel it
      let pt = getNormCoords(e);
      // Default = snap to nearest 15° angle; Shift = free trace (no snap)
      if ((snapEnabled ? !e.shiftKey : e.shiftKey) && activeVertices.length > 0) {
        pt = snapToAngle(activeVertices[activeVertices.length - 1], pt);
      }
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      pendingClickRef.current = pt;
      clickTimerRef.current = setTimeout(() => {
        const ptToAdd = pendingClickRef.current;
        pendingClickRef.current = null;
        if (ptToAdd) {
          setActiveVertices(prev => [...prev, ptToAdd]);
        }
      }, 200); // 200ms window — if dblclick fires within this, vertex is cancelled
    }
  };

  const handleCanvasDoubleClick = (e) => {
    e.preventDefault();
    // Cancel the pending single-click vertex
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    pendingClickRef.current = null;
    // Double-click on hotlink in PAN mode → navigate to target view
    if (mode === MODE.PAN) {
      const clickPt = getCanvasCoords(e);
      const sc = fitScaleRef.current * zoom;
      for (let i = pageAnnotations.length - 1; i >= 0; i--) {
        const ann = pageAnnotations[i];
        if (ann.type === "hotlink" && ann.position) {
          const d = dist(clickPt, { x: ann.position.x * sc, y: ann.position.y * sc });
          if (d < 35) {
            const targetView = namedViews.find(v => v.id === ann.targetViewId);
            if (targetView) navigateToView(targetView);
            return;
          }
        }
      }
    }
    // Finish polygon/cloud annotation on dblclick
    if ((mode === MODE.POLYGON_ANN || mode === MODE.CLOUD) && annPolyVerts.length >= 3) {
      addAnnotation({
        id: "ann_" + Date.now(), type: mode === MODE.CLOUD ? "cloud" : "polygon",
        pageKey, vertices: annPolyVerts,
        strokeColor: annStyle.strokeColor, fillColor: annStyle.fillColor,
        lineWidth: annStyle.lineWidth, opacity: annStyle.opacity,
      });
      setAnnPolyVerts([]);
      if (!continuousMode) setMode(MODE.PAN);
      return;
    }
    // Finish measure ruler on dblclick
    if (mode === MODE.MEASURE && measureVertices.length >= 2 && ppf) {
      let totalPx = 0;
      for (let i = 1; i < measureVertices.length; i++) totalPx += dist(measureVertices[i - 1], measureVertices[i]);
      const totalFt = totalPx / ppf;
      setMeasureResults(prev => [...prev, { id: "ruler_" + Date.now(), pageKey, vertices: measureVertices, totalFt }]);
      setMeasureVertices([]);
      return;
    }
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
      // Tag as backout if in backout mode
      if (backoutMode) m.backoutOf = backoutMode;
      newMeasurements.push(m);
    }

    if (coMode) {
      // CO mode: tag all measurements with coType and store separately
      newMeasurements.forEach(m => addCoMeasurement({ ...m, coType: coMode }));
    } else {
      setMeasurements(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), ...newMeasurements] }));
      newMeasurements.forEach(m => setUndoStack(prev => [...prev, { action: "add", pageKey, measurementId: m.id }]));
      setRedoStack([]); // new measurement clears redo history
    }
    setActiveVertices([]);
    // Continuous mode: stay in same mode with same condition (don't reset to PAN)
    // When OFF, switch back to PAN after finishing
    if (!continuousMode) setMode(MODE.PAN);
  };

  const handleCanvasMove = (e) => {
    if (mode === MODE.LINEAR || mode === MODE.AREA || mode === MODE.COUNT || mode === MODE.MEASURE || ANN_MODES.has(mode)) setMousePos(getCanvasCoords(e));
    // Hover detection for tooltips
    const pt = getNormCoords(e);
    const scale = fitScaleRef.current * zoom;
    const threshold = 20 / scale;
    let nearest = null, nearestDist = threshold;
    pageMeasurements.forEach(m => {
      if (m.type === "count" && m.point) {
        const d = dist(pt, m.point);
        if (d < nearestDist) { nearest = m; nearestDist = d; }
      } else if (m.vertices) {
        m.vertices.forEach(v => { const d = dist(pt, v); if (d < nearestDist) { nearest = m; nearestDist = d; } });
        // Also check line segments for linear
        if (m.type === "linear") {
          for (let i = 1; i < m.vertices.length; i++) {
            const a = m.vertices[i - 1], b = m.vertices[i];
            const ab = { x: b.x - a.x, y: b.y - a.y };
            const ap = { x: pt.x - a.x, y: pt.y - a.y };
            const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / (ab.x * ab.x + ab.y * ab.y + 1e-9)));
            const proj = { x: a.x + t * ab.x, y: a.y + t * ab.y };
            const d = dist(pt, proj);
            if (d < nearestDist) { nearest = m; nearestDist = d; }
          }
        }
      }
    });
    setHoveredMeasId(nearest?.id || null);
    // Update mousePos for tooltip position
    if (nearest) setMousePos(getCanvasCoords(e));
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

  const deleteMeasurement = (id, pk) => {
    const targetKey = pk || pageKey;
    const meas = (measurements[targetKey] || []).find(m => m.id === id);
    if (meas) setUndoStack(prev => [...prev, { action: "delete", pageKey: targetKey, measurementId: id, measurementData: meas }]);
    setMeasurements(prev => {
      const next = { ...prev, [targetKey]: (prev[targetKey] || []).filter(m => m.id !== id) };
      // Clear orphaned backouts when parent area is deleted
      if (meas?.type === "area") {
        Object.keys(next).forEach(pk => {
          next[pk] = next[pk].map(m => m.backoutOf === id ? { ...m, backoutOf: undefined } : m);
        });
      }
      return next;
    });
    // Exit backout mode if we deleted the parent
    if (backoutMode === id) setBackoutMode(null);
  };
  const cancelActive = () => { setActiveVertices([]); setMousePos(null); setCalPoints([]); setShowCalPrompt(false); setAnnStartPt(null); setShowAnnTextInput(null); setAnnPolyVerts([]); setAnnDragging(null); };

  // ── Annotation helpers ──
  const addAnnotation = (ann) => {
    setAnnotations(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), ann] }));
    setUndoStack(prev => [...prev, { action: "ann_add", pageKey, annotationId: ann.id }]);
    setRedoStack([]);
  };
  const deleteAnnotation = (id, pk) => {
    const targetKey = pk || pageKey;
    const ann = (annotations[targetKey] || []).find(a => a.id === id);
    if (ann) setUndoStack(prev => [...prev, { action: "ann_delete", pageKey: targetKey, annotationId: id, annotationData: ann }]);
    setAnnotations(prev => ({ ...prev, [targetKey]: (prev[targetKey] || []).filter(a => a.id !== id) }));
  };

  // ── Named Views ──
  const saveNamedView = (name) => {
    const container = containerRef.current;
    const nv = {
      id: "nv_" + Date.now(),
      name: name || `View ${namedViews.length + 1}`,
      pageKey, pdfIdx: activePdfIdx, page,
      zoom,
      scrollX: container ? container.scrollLeft : 0,
      scrollY: container ? container.scrollTop : 0,
    };
    setNamedViews(prev => [...prev, nv]);
    return nv;
  };

  const navigateToView = (nv) => {
    if (!nv) return;
    // Switch PDF if needed
    if (nv.pdfIdx !== undefined && nv.pdfIdx !== activePdfIdx) setActivePdfIdx(nv.pdfIdx);
    // Switch page
    if (nv.page) setPage(nv.page);
    // Set zoom
    if (nv.zoom) setZoom(nv.zoom);
    // Restore scroll position after a tick (page needs to render)
    setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        if (nv.scrollX !== undefined) container.scrollLeft = nv.scrollX;
        if (nv.scrollY !== undefined) container.scrollTop = nv.scrollY;
      }
    }, 100);
  };

  const deleteNamedView = (id) => {
    setNamedViews(prev => prev.filter(v => v.id !== id));
    // Also remove hotlink annotations that point to this view
    setAnnotations(prev => {
      const next = {};
      Object.entries(prev).forEach(([pk, anns]) => {
        next[pk] = anns.filter(a => !(a.type === "hotlink" && a.targetViewId === id));
      });
      return next;
    });
  };

  // ── Flush pending save before closing (prevent losing last <800ms of changes) ──
  const handleClose = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Synchronous save on close
    if (onTakeoffStateChange) {
      onTakeoffStateChange({
        measurements, conditions, condLinks, sheetNames,
        calibrations, bidAreas, hiddenFolders, activeCondId, activeBidAreaId,
        pdfFileNames: pdfFiles.map(pf => pf.name),
        activePdfIdx, typicalGroups, coMeasurements, completedPages,
      });
    }
    onClose();
  }, [onClose, onTakeoffStateChange, measurements, conditions, condLinks, sheetNames, calibrations, bidAreas, hiddenFolders, activeCondId, activeBidAreaId, pdfFiles, activePdfIdx, typicalGroups, coMeasurements, completedPages]);

  const undo = () => {
    if (activeVertices.length > 0) { setActiveVertices(prev => prev.slice(0, -1)); return; }
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    const pk = last.pageKey;
    if (last.action === "add") {
      const meas = (measurements[pk] || []).find(m => m.id === last.measurementId);
      setRedoStack(prev => [...prev, { ...last, measurementData: meas }]);
      setMeasurements(prev => ({ ...prev, [pk]: (prev[pk] || []).filter(m => m.id !== last.measurementId) }));
    } else if (last.action === "delete" && last.measurementData) {
      // Re-add the deleted measurement
      setRedoStack(prev => [...prev, last]);
      setMeasurements(prev => ({ ...prev, [pk]: [...(prev[pk] || []), last.measurementData] }));
    } else if (last.action === "drag" && last.measurementData) {
      // Restore pre-drag state
      const current = (measurements[pk] || []).find(m => m.id === last.measurementId);
      setRedoStack(prev => [...prev, { ...last, redoData: current }]);
      setMeasurements(prev => ({ ...prev, [pk]: (prev[pk] || []).map(m => m.id === last.measurementId ? last.measurementData : m) }));
    } else if (last.action === "reassign") {
      // Restore original conditionId
      setRedoStack(prev => [...prev, last]);
      setMeasurements(prev => ({ ...prev, [pk]: (prev[pk] || []).map(m => m.id === last.measurementId ? { ...m, conditionId: last.oldConditionId } : m) }));
    } else if (last.action === "ann_add") {
      const ann = (annotations[pk] || []).find(a => a.id === last.annotationId);
      setRedoStack(prev => [...prev, { ...last, annotationData: ann }]);
      setAnnotations(prev => ({ ...prev, [pk]: (prev[pk] || []).filter(a => a.id !== last.annotationId) }));
    } else if (last.action === "ann_delete" && last.annotationData) {
      setRedoStack(prev => [...prev, last]);
      setAnnotations(prev => ({ ...prev, [pk]: [...(prev[pk] || []), last.annotationData] }));
    }
    setUndoStack(prev => prev.slice(0, -1));
  };

  const redo = () => {
    const last = redoStack[redoStack.length - 1];
    if (!last) return;
    const pk = last.pageKey;
    if (last.action === "add" && last.measurementData) {
      setMeasurements(prev => ({ ...prev, [pk]: [...(prev[pk] || []), last.measurementData] }));
      setUndoStack(prev => [...prev, { action: "add", pageKey: pk, measurementId: last.measurementId }]);
    } else if (last.action === "delete") {
      const meas = (measurements[pk] || []).find(m => m.id === last.measurementId);
      setUndoStack(prev => [...prev, { ...last, measurementData: meas }]);
      setMeasurements(prev => ({ ...prev, [pk]: (prev[pk] || []).filter(m => m.id !== last.measurementId) }));
    } else if (last.action === "drag" && last.redoData) {
      setUndoStack(prev => [...prev, { action: "drag", pageKey: pk, measurementId: last.measurementId, measurementData: (measurements[pk] || []).find(m => m.id === last.measurementId) }]);
      setMeasurements(prev => ({ ...prev, [pk]: (prev[pk] || []).map(m => m.id === last.measurementId ? last.redoData : m) }));
    } else if (last.action === "reassign") {
      setUndoStack(prev => [...prev, { ...last, oldConditionId: last.oldConditionId, newConditionId: last.newConditionId }]);
      setMeasurements(prev => ({ ...prev, [pk]: (prev[pk] || []).map(m => m.id === last.measurementId ? { ...m, conditionId: last.newConditionId } : m) }));
    } else if (last.action === "ann_add" && last.annotationData) {
      setAnnotations(prev => ({ ...prev, [pk]: [...(prev[pk] || []), last.annotationData] }));
      setUndoStack(prev => [...prev, { action: "ann_add", pageKey: pk, annotationId: last.annotationId }]);
    } else if (last.action === "ann_delete") {
      const ann = (annotations[pk] || []).find(a => a.id === last.annotationId);
      setUndoStack(prev => [...prev, { ...last, annotationData: ann }]);
      setAnnotations(prev => ({ ...prev, [pk]: (prev[pk] || []).filter(a => a.id !== last.annotationId) }));
    }
    setRedoStack(prev => prev.slice(0, -1));
  };

  // Nav
  const prevPage = () => { setPage(p => Math.max(1, p - 1)); setActiveVertices([]); setBackoutMode(null); };
  const nextPage = () => { setPage(p => Math.min(numPages, p + 1)); setActiveVertices([]); setBackoutMode(null); };
  const zoomIn = () => setZoom(s => Math.min(6, s + 0.25));
  const zoomOut = () => setZoom(s => Math.max(0.25, s - 0.25));
  const resetZoom = () => setZoom(1); // fit to width (default: fitScaleRef already fits width at zoom=1)
  const fitToPage = () => {
    // Fit entire page (both width and height) into viewport
    const container = containerRef.current;
    if (!container || !pdfCanvasRef.current) { setZoom(1); return; }
    const cw = container.clientWidth - 32;
    const ch = container.clientHeight - 16;
    const canvasW = pdfCanvasRef.current.clientWidth / zoom; // width at zoom=1
    const canvasH = pdfCanvasRef.current.clientHeight / zoom; // height at zoom=1
    if (canvasW > 0 && canvasH > 0) {
      const fitZ = Math.min(cw / canvasW, ch / canvasH, 1);
      setZoom(Math.max(0.15, fitZ));
    } else setZoom(1);
  };

  // Scroll wheel zoom centered on cursor position
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) { setZoom(s => Math.min(6, Math.max(0.15, s * (e.deltaY > 0 ? 0.9 : 1.1)))); return; }
    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    // Position in content space before zoom
    const scrollX = container.scrollLeft + cursorX;
    const scrollY = container.scrollTop + cursorY;
    setZoom(s => {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.min(6, Math.max(0.15, s * factor));
      const ratio = next / s;
      // Adjust scroll so cursor stays on same content point
      requestAnimationFrame(() => {
        container.scrollLeft = scrollX * ratio - cursorX;
        container.scrollTop = scrollY * ratio - cursorY;
      });
      return next;
    });
  }, []);

  // Register wheel listener as non-passive so preventDefault() actually works (blocks page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Click-drag pan
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const handlePanStart = useCallback((e) => {
    if (mode !== MODE.PAN) return;
    // Check if mousedown is on a resize handle — if so, start dragging instead of panning
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const rect = overlay.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const sc = fitScaleRef.current * zoom;
      const pm = measurements[activePdfIdx + ":" + page] || [];
      for (const m of pm) {
        const cond = conditions.find(c => c.id === m.conditionId);
        if (cond && hiddenFolders[cond.folder]) continue;
        if (m.vertices) {
          for (let vi = 0; vi < m.vertices.length; vi++) {
            if (Math.abs(cx - m.vertices[vi].x * sc) < 8 && Math.abs(cy - m.vertices[vi].y * sc) < 8) {
              preDragMeasRef.current = JSON.parse(JSON.stringify(m));
              setDraggingHandle({ measurementId: m.id, vertexIdx: vi, pageKey: activePdfIdx + ":" + page });
              return; // don't start panning
            }
          }
        } else if (m.point) {
          if (Math.abs(cx - m.point.x * sc) < 8 && Math.abs(cy - m.point.y * sc) < 8) {
            preDragMeasRef.current = JSON.parse(JSON.stringify(m));
            setDraggingHandle({ measurementId: m.id, pointKey: "point", pageKey: activePdfIdx + ":" + page });
            return;
          }
        }
      }
    }
    const container = containerRef.current;
    if (!container) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
  }, [mode, zoom, measurements, activePdfIdx, page, conditions, hiddenFolders]);
  const handlePanMove = useCallback((e) => {
    if (draggingHandle) {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const sc = fitScaleRef.current * zoom;
      const pt = { x: cx / sc, y: cy / sc };
      const pk = draggingHandle.pageKey;
      setMeasurements(prev => {
        const pageMeas = [...(prev[pk] || [])];
        const idx = pageMeas.findIndex(m => m.id === draggingHandle.measurementId);
        if (idx < 0) return prev;
        const m = { ...pageMeas[idx] };
        if (draggingHandle.pointKey === "point") {
          m.point = pt;
        } else {
          const verts = [...m.vertices];
          verts[draggingHandle.vertexIdx] = pt;
          m.vertices = verts;
        }
        pageMeas[idx] = m;
        return { ...prev, [pk]: pageMeas };
      });
      return;
    }
    if (!isPanning) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.x);
    container.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
  }, [isPanning, draggingHandle, zoom]);
  const handlePanEnd = useCallback(() => {
    if (draggingHandle) {
      // Recalculate measurement values after drag
      const pk = draggingHandle.pageKey;
      setMeasurements(prev => {
        const pageMeas = [...(prev[pk] || [])];
        const idx = pageMeas.findIndex(m => m.id === draggingHandle.measurementId);
        if (idx < 0) return prev;
        const m = { ...pageMeas[idx] };
        const ppfVal = calibrations[pk] || null;
        if (ppfVal && m.type === "linear" && m.vertices) {
          let totalPx = 0;
          for (let i = 1; i < m.vertices.length; i++) totalPx += dist(m.vertices[i - 1], m.vertices[i]);
          m.totalFt = totalPx / ppfVal;
        } else if (ppfVal && m.type === "area" && m.vertices) {
          m.totalSf = polyArea(m.vertices) / (ppfVal * ppfVal);
        }
        pageMeas[idx] = m;
        return { ...prev, [pk]: pageMeas };
      });
      // Push drag to undo stack
      if (preDragMeasRef.current) {
        setUndoStack(prev => [...prev, { action: "drag", pageKey: pk, measurementId: draggingHandle.measurementId, measurementData: preDragMeasRef.current }]);
        setRedoStack([]);
        preDragMeasRef.current = null;
      }
      setDraggingHandle(null);
      return;
    }
    setIsPanning(false);
  }, [draggingHandle, calibrations]);

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
      // Escape always works — even when focused on an input (e.g. calibration prompt)
      if (e.key === "Escape") {
        if (showAnnTextInput) { setShowAnnTextInput(null); setAnnTextValue(""); return; }
        if (annStartPt) { setAnnStartPt(null); return; }
        if (annPolyVerts.length > 0) { setAnnPolyVerts([]); return; }
        if (annDragging) { setAnnDragging(null); return; }
        if (backoutMode) { setBackoutMode(null); return; }
        if (measureVertices.length > 0) { setMeasureVertices([]); return; }
        if (showCalPrompt || calPoints.length > 0 || activeVertices.length > 0) { cancelActive(); e.target.blur?.(); }
        else handleClose();
        return;
      }
      // Don't intercept other keys when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Enter") {
        if ((mode === MODE.POLYGON_ANN || mode === MODE.CLOUD) && annPolyVerts.length >= 3) {
          addAnnotation({
            id: "ann_" + Date.now(), type: mode === MODE.CLOUD ? "cloud" : "polygon",
            pageKey, vertices: annPolyVerts,
            strokeColor: annStyle.strokeColor, fillColor: annStyle.fillColor,
            lineWidth: annStyle.lineWidth, opacity: annStyle.opacity,
          });
          setAnnPolyVerts([]);
          if (!continuousMode) setMode(MODE.PAN);
          return;
        }
        if (mode === MODE.MEASURE && measureVertices.length >= 2 && ppf) {
          let totalPx = 0;
          for (let i = 1; i < measureVertices.length; i++) totalPx += dist(measureVertices[i - 1], measureVertices[i]);
          setMeasureResults(prev => [...prev, { id: "ruler_" + Date.now(), pageKey, vertices: measureVertices, totalFt: totalPx / ppf }]);
          setMeasureVertices([]);
          return;
        }
        if (activeVertices.length >= 2 && ppf && activeCond) { finishMeasurement(); }
        return;
      }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); return; }
      if (e.key === " ") return; // handled by modifier key tracking (hold-to-pan)
      if (e.key === "PageUp") { e.preventDefault(); prevPage(); return; }
      if (e.key === "PageDown") { e.preventDefault(); nextPage(); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnId) { deleteAnnotation(selectedAnnId); setSelectedAnnId(null); }
        else if (selectedMeasId) { deleteMeasurement(selectedMeasId); setSelectedMeasId(null); }
        return;
      }
      if (e.key === "l" || e.key === "L") { if (backoutMode) return; if (ppf) { setMode(MODE.LINEAR); cancelActive(); } return; }
      if (e.key === "a" || e.key === "A") { if (ppf) { setMode(MODE.AREA); cancelActive(); } return; }
      if (e.key === "c" || e.key === "C") { if (backoutMode) return; setMode(MODE.COUNT); cancelActive(); return; }
      if (e.key === "s" || e.key === "S") { if (backoutMode) return; setMode(MODE.CALIBRATE); cancelActive(); return; }
      if (e.key === "m" || e.key === "M") { if (ppf) { setMode(MODE.MEASURE); cancelActive(); setMeasureVertices([]); } return; }
      if (e.key === "t" || e.key === "T") { setMode(MODE.TEXT); cancelActive(); return; }
      if (e.key === "h" || e.key === "H") { setMode(MODE.HIGHLIGHTER); cancelActive(); return; }
      if (e.key === "n" || e.key === "N") { setShowCondNames(v => !v); return; }
      if (e.key === "Insert") { setShowCondProps(true); setEditingCondId(null); return; }
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
  }, [activeVertices, calPoints, showCalPrompt, activeCond, ppf, folders, selectedMeasId, selectedAnnId, measureVertices, mode, pageKey, annStartPt, showAnnTextInput, annPolyVerts, annDragging, annStyle, continuousMode]);

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
      attachTo: null,
      deductWidth: 0,
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
    <div style={{ width: "100%", height: "100%", background: "rgba(0,0,0,0.97)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top Toolbar ── */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.85)" }}>
        {/* Row 1: Close + File info + Drawing Tools */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={handleClose} style={{ ...btn, padding: "4px 10px", fontSize: 12, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" }}>✕ Close</button>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pdfFiles.length > 1
                ? `${(pdfFiles[activePdfIdx]?.name || "PDF").replace(/\.pdf$/i, "")} — ${getSheetName(page)}`
                : numPages > 1 ? getSheetName(page) : (fileName || "Drawing")}
            </span>
            {onTakeoffStateChange && lastSaved && <span style={{ color: "#10b981", fontSize: 10 }}>✓ saved</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={() => { setMode(MODE.PAN); cancelActive(); }} style={mode === MODE.PAN ? { ...btnActive, padding: "4px 10px", fontSize: 12 } : { ...btn, padding: "4px 10px", fontSize: 12 }} title="Space">Pan</button>
            <select value={ppf ? (closestPresetLabel(ppf) || "__custom") : ""}
              onChange={e => {
                const val = e.target.value;
                if (val === "__calc") { setMode(MODE.CALIBRATE); cancelActive(); return; }
                if (val === "__clear") { setCalibrations(prev => { const n = { ...prev }; delete n[pageKey]; return n; }); return; }
                if (val === "") return;
                const preset = SCALE_PRESETS.find(s => s.label === val);
                if (preset) {
                  setCalibrations(prev => ({ ...prev, [pageKey]: ppfFromRatio(preset.ratio) }));
                  setShowVerify(true);
                  if (mode === MODE.CALIBRATE) setMode(MODE.PAN);
                }
              }}
              style={{
                padding: "4px 6px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: ppf ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(239,68,68,0.5)",
                background: ppf ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
                color: ppf ? "#4ade80" : "#f87171",
                minWidth: 120, maxWidth: 160,
              }}
              title="Scale — select preset or Calculate Scale (S)">
              {!ppf && <option value="">⚠ Set Scale</option>}
              {ppf && !closestPresetLabel(ppf) && <option value="__custom">✓ Custom ({(1 / ppf * 12).toFixed(2)}&quot;/ft)</option>}
              {SCALE_PRESETS.map(sc => (
                <option key={sc.ratio} value={sc.label}>{ppf && closestPresetLabel(ppf) === sc.label ? "✓ " : ""}{sc.label}</option>
              ))}
              <option disabled>──────────</option>
              <option value="__calc">Calculate Scale…</option>
              {ppf && <option value="__clear">Clear Scale</option>}
            </select>
            <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={() => { if (ppf) { setMode(MODE.LINEAR); cancelActive(); }}} style={!ppf ? { ...btnDis, padding: "4px 10px", fontSize: 12 } : mode === MODE.LINEAR ? { ...btnActive, padding: "4px 10px", fontSize: 12 } : { ...btn, padding: "4px 10px", fontSize: 12 }} disabled={!ppf} title="L">Linear</button>
            <button onClick={() => { if (ppf) { setMode(MODE.AREA); cancelActive(); }}} style={!ppf ? { ...btnDis, padding: "4px 10px", fontSize: 12 } : mode === MODE.AREA ? { ...btnActive, padding: "4px 10px", fontSize: 12 } : { ...btn, padding: "4px 10px", fontSize: 12 }} disabled={!ppf} title="A">Area</button>
            <button onClick={() => { setMode(MODE.COUNT); cancelActive(); }} style={mode === MODE.COUNT ? { ...btnActive, padding: "4px 10px", fontSize: 12 } : { ...btn, padding: "4px 10px", fontSize: 12 }} title="C">Count</button>
            <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={() => { if (ppf) { setMode(MODE.MEASURE); cancelActive(); setMeasureVertices([]); }}}
              style={!ppf ? { ...btnDis, padding: "4px 10px", fontSize: 12 } : mode === MODE.MEASURE ? { ...btnActive, padding: "4px 10px", fontSize: 12, background: "#f59e0b", color: "#000", borderColor: "#f59e0b" } : { ...btn, padding: "4px 10px", fontSize: 12 }}
              disabled={!ppf} title="M — Quick ruler (no condition)">📏 Measure</button>
            <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={undo} style={{ ...btn, padding: "4px 10px", fontSize: 12 }} title="Ctrl+Z">Undo</button>
            <button onClick={redo} style={redoStack.length ? { ...btn, padding: "4px 10px", fontSize: 12 } : { ...btnDis, padding: "4px 10px", fontSize: 12 }} disabled={!redoStack.length} title="Ctrl+Y">Redo</button>
            <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
            <button onClick={() => setContinuousMode(m => !m)}
              style={continuousMode ? { ...btn, padding: "4px 10px", fontSize: 12, background: "rgba(16,185,129,0.2)", borderColor: "rgba(16,185,129,0.5)", color: "#10b981" } : { ...btn, padding: "4px 10px", fontSize: 12 }}
              title="Continuous mode: auto-start next measurement">{continuousMode ? "⟳ On" : "⟳ Off"}</button>
            <button onClick={() => setShowCondNames(v => !v)}
              style={showCondNames ? { ...btn, padding: "4px 10px", fontSize: 12, background: "rgba(139,92,246,0.2)", borderColor: "rgba(139,92,246,0.5)", color: "#a78bfa" } : { ...btn, padding: "4px 10px", fontSize: 12 }}
              title="Toggle condition name labels (N)">Names</button>
            <button onClick={() => setSnapEnabled(v => !v)}
              style={snapEnabled ? { ...btn, padding: "4px 10px", fontSize: 12, background: "rgba(245,158,11,0.2)", borderColor: "rgba(245,158,11,0.5)", color: "#f59e0b" } : { ...btn, padding: "4px 10px", fontSize: 12 }}
              title="Angle snap (15°). Shift inverts temporarily.">⊾ Snap</button>
          </div>
        </div>
        {/* Row 2: Page Navigation + Zoom — prominent */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3px 10px 4px", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={prevPage} style={page <= 1 ? { ...btnDis, padding: "4px 10px", fontSize: 13 } : { ...btn, padding: "4px 10px", fontSize: 13 }} disabled={page <= 1}>◀ Prev</button>
          <select value={page} onChange={e => { setPage(Number(e.target.value)); setActiveVertices([]); }}
            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.3)", background: "#1a1a2e", color: "#fff", fontSize: 13, minWidth: 180, maxWidth: 300, fontWeight: 500 }}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => {
              const pk = activePdfIdx + ":" + pg;
              const name = sheetNames[pk] || `Page ${pg}`;
              const hasMeas = (measurements[pk] || []).length > 0;
              const isComplete = completedPages[pk];
              const indicator = isComplete ? "✓ " : hasMeas ? "● " : "  ";
              return <option key={pg} value={pg} style={{ background: "#1a1a2e", color: "#fff" }}>{indicator}{pg} - {name}</option>;
            })}
          </select>
          <button onClick={nextPage} style={page >= numPages ? { ...btnDis, padding: "4px 10px", fontSize: 13 } : { ...btn, padding: "4px 10px", fontSize: 13 }} disabled={page >= numPages}>Next ▶</button>
          <span style={{ color: "#999", fontSize: 12 }}>Page {page} of {numPages}</span>
          <button onClick={() => setCompletedPages(prev => ({ ...prev, [pageKey]: !prev[pageKey] }))}
            style={completedPages[pageKey] ? { ...btn, padding: "4px 10px", fontSize: 12, background: "rgba(34,197,94,0.2)", borderColor: "rgba(34,197,94,0.5)", color: "#22c55e" } : { ...btn, padding: "4px 10px", fontSize: 12 }}
            title="Mark this page as takeoff complete">{completedPages[pageKey] ? "✓ Done" : "Mark Done"}</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={zoomOut} style={{ ...btn, padding: "4px 8px", fontSize: 13 }}>−</button>
          <span style={{ color: "#ccc", fontSize: 12, minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} style={{ ...btn, padding: "4px 8px", fontSize: 13 }}>+</button>
          <button onClick={resetZoom} style={{ ...btn, padding: "4px 6px", fontSize: 10 }} title="F — Fit width">W Fit</button>
          <button onClick={fitToPage} style={{ ...btn, padding: "4px 6px", fontSize: 10 }} title="Fit entire page">P Fit</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          {/* Named Views */}
          <button onClick={() => { setShowSaveView(true); setSaveViewName(""); }}
            style={{ ...btn, padding: "4px 8px", fontSize: 10, background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.25)", color: "#93c5fd" }}
            title="Save current view (page + zoom + scroll position)">📌 Save View</button>
          {namedViews.length > 0 && (
            <select value="" onChange={e => { const nv = namedViews.find(v => v.id === e.target.value); if (nv) navigateToView(nv); }}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)", color: "#93c5fd", fontSize: 10, maxWidth: 130 }}>
              <option value="" disabled>Views ({namedViews.length})</option>
              {namedViews.map(nv => (
                <option key={nv.id} value={nv.id}>{nv.name} — {sheetNames[nv.pageKey] || `P${nv.page}`}</option>
              ))}
            </select>
          )}
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={() => setViewMode(v => v === "drawing" ? "summary" : "drawing")}
            style={viewMode === "summary" ? { ...btnActive, padding: "4px 10px", fontSize: 12 } : { ...btn, padding: "4px 10px", fontSize: 12 }} title="Toggle summary view">
            {viewMode === "summary" ? "Drawing" : "Summary"}
          </button>
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
        {/* Row 4: Annotation Tools + Style */}
        <div style={{ display: "flex", alignItems: "center", padding: "3px 10px 4px", gap: 4, borderTop: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, color: "#666", letterSpacing: 0.5 }}>MARKUP</span>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
          {[
            { m: MODE.TEXT, label: "T Text", key: "T" },
            { m: MODE.ARROW, label: "↗ Arrow", key: null },
            { m: MODE.CALLOUT, label: "💬 Callout", key: null },
            { m: MODE.LINE_ANN, label: "— Line", key: null },
            { m: MODE.HIGHLIGHTER, label: "H Highlight", key: "H" },
            { m: MODE.RECT, label: "▭ Rect", key: null },
            { m: MODE.OVAL, label: "○ Oval", key: null },
            { m: MODE.POLYGON_ANN, label: "⬠ Polygon", key: null },
            { m: MODE.CLOUD, label: "☁ Cloud", key: null },
            { m: MODE.INK, label: "✎ Ink", key: null },
            { m: MODE.HOTLINK, label: "🔗 Link", key: null },
          ].map(t => (
            <button key={t.m} onClick={() => { if (t.m === MODE.HOTLINK && namedViews.length === 0) { alert("Save a Named View first (📌 Save View button)."); return; } setMode(t.m); cancelActive(); }}
              style={mode === t.m
                ? { ...btn, padding: "3px 6px", fontSize: 10, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.5)", color: "#f87171" }
                : { ...btn, padding: "3px 6px", fontSize: 10 }}
              title={t.key ? `${t.key} — ${t.label}` : t.label}>{t.label}</button>
          ))}
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
          {/* Stroke color */}
          <span style={{ fontSize: 8, color: "#666" }}>Stroke</span>
          {["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#fff"].map(c => (
            <div key={"s" + c} onClick={() => setAnnStyle(s => ({ ...s, strokeColor: c }))}
              style={{ width: 14, height: 14, borderRadius: 2, background: c, cursor: "pointer",
                border: annStyle.strokeColor === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
                boxShadow: annStyle.strokeColor === c ? "0 0 3px " + c : "none" }} />
          ))}
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
          {/* Fill color (for shapes) */}
          <span style={{ fontSize: 8, color: "#666" }}>Fill</span>
          <div onClick={() => setAnnStyle(s => ({ ...s, fillColor: null }))}
            style={{ width: 14, height: 14, borderRadius: 2, background: "transparent", cursor: "pointer",
              border: !annStyle.fillColor ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)",
              position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: "100%", background: "#ef4444", transform: "rotate(45deg)", transformOrigin: "top" }} />
          </div>
          {["#ef444466", "#f59e0b66", "#22c55e66", "#3b82f666", "#a855f766"].map(c => (
            <div key={"f" + c} onClick={() => setAnnStyle(s => ({ ...s, fillColor: c }))}
              style={{ width: 14, height: 14, borderRadius: 2, background: c, cursor: "pointer",
                border: annStyle.fillColor === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)" }} />
          ))}
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
          {/* Line width */}
          <span style={{ fontSize: 8, color: "#666" }}>Wt</span>
          {[1, 2, 3, 5].map(w => (
            <button key={w} onClick={() => setAnnStyle(s => ({ ...s, lineWidth: w }))}
              style={annStyle.lineWidth === w
                ? { ...btn, padding: "1px 5px", fontSize: 9, background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }
                : { ...btn, padding: "1px 5px", fontSize: 9 }}>{w}</button>
          ))}
          {/* Opacity */}
          <span style={{ fontSize: 8, color: "#666" }}>Op</span>
          {[0.3, 0.5, 0.7, 1.0].map(o => (
            <button key={o} onClick={() => setAnnStyle(s => ({ ...s, opacity: o }))}
              style={annStyle.opacity === o
                ? { ...btn, padding: "1px 5px", fontSize: 9, background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)", color: "#f87171" }
                : { ...btn, padding: "1px 5px", fontSize: 9 }}>{Math.round(o * 100)}%</button>
          ))}
          {/* Annotation count */}
          {pageAnnotations.length > 0 && (
            <span style={{ fontSize: 9, color: "#555", marginLeft: 4 }}>{pageAnnotations.length} markup{pageAnnotations.length !== 1 ? "s" : ""}</span>
          )}
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
                      <FileText size={10} style={{ color: "#60a5fa", flexShrink: 0 }} />
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
          <div ref={containerRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
            onMouseDown={handlePanStart} onMouseMove={handlePanMove} onMouseUp={handlePanEnd} onMouseLeave={handlePanEnd}
            style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 12,
              cursor: draggingHandle ? "grabbing" : spaceHeld ? "grab" : mode === MODE.PAN ? (isPanning ? "grabbing" : "grab") : "crosshair" }}>
            {/* Show re-upload prompt if no PDF loaded but state exists */}
            {pdfFiles.length === 0 && _init.pdfFileNames?.length > 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>Loading plans from cache...</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>If plans don't appear, re-upload the PDF to restore your {Object.values(measurements).flat().length} saved measurements.</div>
                <label style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: "var(--amber, #e09422)", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  Re-upload PDF
                  <input type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const data = new Uint8Array(ev.target.result);
                      pdfjsLib.getDocument({ data }).promise.then((doc) => {
                        setPdfFiles([{ name: file.name, data, doc, numPages: doc.numPages }]);
                        pdfDocRef.current = doc;
                        setPdf(doc);
                        setNumPages(doc.numPages);
                        setPage(1);
                        setActivePdfIdx(0);
                        if (takeoffId) savePdfToIDB(`${takeoffId}_0`, data).catch(() => {});
                        autoNamePages(doc, 0);
                      });
                    };
                    reader.readAsArrayBuffer(file);
                  }} />
                </label>
              </div>
            )}
            <div style={{ position: "relative", display: "inline-block" }}>
              {pdfLoading && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10, background: "rgba(0,0,0,0.9)", padding: "32px 48px", borderRadius: 12, textAlign: "center", minWidth: 280, border: "1px solid rgba(224,148,34,0.3)" }}>
                  <div style={{ fontSize: 15, color: "#fff", marginBottom: 12, fontWeight: 600 }}>Loading Drawing...</div>
                  <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${pdfLoadProgress || 5}%`, height: "100%", background: "linear-gradient(90deg, #e09422, #f59e0b)", borderRadius: 4, transition: "width 0.3s ease" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#8494ad" }}>
                    {pdfLoadProgress > 0 ? `${pdfLoadProgress}% — ` : ""}Large drawings may take a moment
                  </div>
                </div>
              )}
              <canvas ref={pdfCanvasRef} />
              <canvas ref={revisionCanvasRef}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none",
                  opacity: revisionDocs[pageKey] && showRevision ? revisionOpacity : 0,
                  mixBlendMode: "difference",
                }} />
              <canvas ref={overlayCanvasRef}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: mode === MODE.PAN ? "none" : "auto" }}
                onClick={(e) => { setContextMenu(null); handleCanvasClick(e); }}
                onDoubleClick={handleCanvasDoubleClick} onMouseMove={(e) => {
                  handleCanvasMove(e);
                  // Drag-based annotation: accumulate points while dragging
                  if (annDragging && (annDragging.type === "highlighter" || annDragging.type === "ink")) {
                    const pt = getNormCoords(e);
                    // Simplify: only add point if moved > 3px from last
                    const last = annDragging.points[annDragging.points.length - 1];
                    const sc = fitScaleRef.current * zoom;
                    if (!last || dist({ x: last.x * sc, y: last.y * sc }, { x: pt.x * sc, y: pt.y * sc }) > 3) {
                      setAnnDragging(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
                    }
                  }
                  if (annDragging && (annDragging.type === "rect" || annDragging.type === "oval")) {
                    const pt = getNormCoords(e);
                    setAnnDragging(prev => prev ? { ...prev, endPt: pt } : null);
                  }
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  if (ANN_DRAG_MODES.has(mode)) {
                    const pt = getNormCoords(e);
                    if (mode === MODE.HIGHLIGHTER || mode === MODE.INK) {
                      setAnnDragging({ type: mode === MODE.HIGHLIGHTER ? "highlighter" : "ink", startPt: pt, points: [pt] });
                    } else if (mode === MODE.RECT || mode === MODE.OVAL) {
                      setAnnDragging({ type: mode === MODE.RECT ? "rect" : "oval", startPt: pt, endPt: pt });
                    }
                  }
                }}
                onMouseUp={() => {
                  if (annDragging) {
                    if ((annDragging.type === "highlighter" || annDragging.type === "ink") && annDragging.points.length >= 2) {
                      addAnnotation({
                        id: "ann_" + Date.now(), type: annDragging.type, pageKey,
                        vertices: annDragging.points,
                        strokeColor: annStyle.strokeColor, lineWidth: annDragging.type === "highlighter" ? Math.max(annStyle.lineWidth * 6, 12) : annStyle.lineWidth,
                        opacity: annDragging.type === "highlighter" ? 0.3 : annStyle.opacity,
                      });
                    }
                    if ((annDragging.type === "rect" || annDragging.type === "oval") && annDragging.endPt) {
                      const dx = Math.abs(annDragging.endPt.x - annDragging.startPt.x);
                      const dy = Math.abs(annDragging.endPt.y - annDragging.startPt.y);
                      const sc = fitScaleRef.current * zoom;
                      if (dx * sc > 5 || dy * sc > 5) {
                        addAnnotation({
                          id: "ann_" + Date.now(), type: annDragging.type, pageKey,
                          start: annDragging.startPt, end: annDragging.endPt,
                          strokeColor: annStyle.strokeColor, fillColor: annStyle.fillColor,
                          lineWidth: annStyle.lineWidth, opacity: annStyle.opacity,
                        });
                      }
                    }
                    setAnnDragging(null);
                    if (!continuousMode) setMode(MODE.PAN);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Right-click while drawing = finish measurement (standard CAD behavior)
                  if ((mode === MODE.LINEAR || mode === MODE.AREA) && activeVertices.length >= 2 && ppf && activeCond) {
                    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
                    pendingClickRef.current = null;
                    finishMeasurement();
                    return;
                  }
                  // Find nearest measurement to right-click point
                  const pt = getNormCoords(e);
                  const scale = fitScaleRef.current * zoom;
                  let nearest = null, nearestDist = 30 / scale, isCo = false; // 30px threshold
                  pageMeasurements.forEach(m => {
                    if (m.type === "count") {
                      const d = dist(pt, m.point);
                      if (d < nearestDist) { nearest = m; nearestDist = d; isCo = false; }
                    } else if (m.vertices) {
                      m.vertices.forEach(v => { const d = dist(pt, v); if (d < nearestDist) { nearest = m; nearestDist = d; isCo = false; } });
                    }
                  });
                  coPageMeasurements.forEach(m => {
                    if (m.type === "count") {
                      const d = dist(pt, m.point);
                      if (d < nearestDist) { nearest = m; nearestDist = d; isCo = true; }
                    } else if (m.vertices) {
                      m.vertices.forEach(v => { const d = dist(pt, v); if (d < nearestDist) { nearest = m; nearestDist = d; isCo = true; } });
                    }
                  });
                  if (nearest) setContextMenu({ x: e.clientX, y: e.clientY, measurementId: nearest.id, isCo });
                }} />
              {/* ── Selected measurement info bar ── */}
              {selectedMeasId && (() => {
                const sm = pageMeasurements.find(m => m.id === selectedMeasId);
                if (!sm) return null;
                const sc = conditions.find(c => c.id === sm.conditionId);
                const asm = sc?.asmCode && assemblies?.find(a => a.code === sc.asmCode);
                const cost = asm ? (sm.type === "linear" ? (sm.totalFt || 0) * ((asm.matRate || 0) + (asm.labRate || 0)) : sm.type === "area" ? (sm.totalSf || 0) * ((asm.matRate || 0) + (asm.labRate || 0)) : (sm.count || 1) * ((asm.matRate || 0) + (asm.labRate || 0))) : 0;
                return (
                  <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.92)", border: "1px solid rgba(59,130,246,0.5)", borderRadius: 8, padding: "6px 16px", zIndex: 10, display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#fff" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: sc?.color || "#3b82f6" }} />
                    <span style={{ fontWeight: 600 }}>{sc?.name || "Unknown"}</span>
                    <span style={{ color: "#aaa" }}>|</span>
                    <span>{sm.type === "linear" ? `${sm.totalFt?.toFixed(1)}' LF` : sm.type === "area" ? `${sm.totalSf?.toFixed(0)} SF` : `${sm.count || 1} EA`}</span>
                    {cost > 0 && <><span style={{ color: "#aaa" }}>|</span><span style={{ color: "#4ade80" }}>${cost.toFixed(0)}</span></>}
                    {sm.backoutOf && <span style={{ fontSize: 9, color: "#f87171", fontWeight: 600 }}>BACKOUT</span>}
                    {sm.type === "area" && !sm.backoutOf && (
                      <button onClick={() => { setBackoutMode(backoutMode === sm.id ? null : sm.id); setMode(MODE.AREA); setSelectedMeasId(null); }}
                        style={{ ...btn, padding: "2px 8px", fontSize: 10, color: backoutMode === sm.id ? "#f87171" : "#f59e0b", borderColor: backoutMode === sm.id ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.3)" }}>
                        {backoutMode === sm.id ? "Exit Backout" : "Backout"}
                      </button>
                    )}
                    <button onClick={() => { deleteMeasurement(selectedMeasId); setSelectedMeasId(null); }} style={{ ...btn, padding: "2px 8px", fontSize: 10, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
                    <button onClick={() => setSelectedMeasId(null)} style={{ ...btn, padding: "2px 8px", fontSize: 10 }}>✕</button>
                  </div>
                );
              })()}
              {/* ── Floating Finish hint while drawing ── */}
              {(mode === MODE.LINEAR || mode === MODE.AREA) && activeVertices.length >= 2 && ppf && activeCond && !localStorage.getItem("ebc_hide_finish_hint") && (
                <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={finishMeasurement}
                    style={{
                      padding: "8px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: "var(--amber, #e09422)", color: "#000", border: "2px solid rgba(0,0,0,0.3)",
                      cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                    }}>
                    Finish ({activeVertices.length} pts) — Right-click or Enter
                  </button>
                  <button onClick={() => { localStorage.setItem("ebc_hide_finish_hint", "1"); cancelActive(); }}
                    style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)", color: "#888", fontSize: 10, cursor: "pointer" }}
                    title="Don't show this hint again">
                    Don't show again
                  </button>
                </div>
              )}
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
                <button onClick={runPlanAnalysis} disabled={analyzing || !pdf}
                  style={{ ...btn, fontSize: 9, padding: "2px 6px", background: analyzing ? "rgba(224,148,34,0.3)" : "rgba(224,148,34,0.15)", color: "#e09422", border: "1px solid rgba(224,148,34,0.4)" }}>
                  {analyzing ? "Analyzing..." : "AI Analyze"}
                </button>
                <button onClick={() => setShowTemplatePicker(true)} style={{ ...btn, fontSize: 9, padding: "2px 6px" }}>Template</button>
                <button onClick={() => { setShowCondProps(true); setEditingCondId(null); }} style={{ ...btn, fontSize: 10, padding: "2px 8px" }}>+ Add</button>
              </div>
            </div>

            {/* Search conditions */}
            {conditions.length > 8 && (
              <input placeholder="Search conditions..." value={condSearch} onChange={e => setCondSearch(e.target.value)}
                style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 10, marginBottom: 6 }} />
            )}

            {/* Add condition dropdown (legacy — replaced by Insert dialog) */}

            {!ppf && (
              <div style={{ fontSize: 11, color: "#f59e0b", padding: "10px 8px", background: "rgba(245,158,11,0.08)", borderRadius: 6, border: "1px solid rgba(245,158,11,0.2)", marginBottom: 8 }}>
                Set scale first (S key), then select a condition and start measuring.
              </div>
            )}

            {/* Empty state — no conditions yet */}
            {conditions.length === 0 && !showAddCond && !analyzing && (
              <div style={{ fontSize: 12, color: "#8494ad", padding: "16px 8px", textAlign: "center", lineHeight: 1.5 }}>
                No conditions yet.<br/>
                Click <b style={{ color: "#e09422" }}>AI Analyze</b> to auto-detect scope, <b style={{ color: "#e09422" }}>+ Add</b> to add manually, or <b style={{ color: "#e09422" }}>Template</b> for a preset.
              </div>
            )}

            {/* AI Analysis loading */}
            {analyzing && (
              <div style={{ fontSize: 12, color: "#e09422", padding: "16px 8px", textAlign: "center", lineHeight: 1.5 }}>
                Analyzing plans...<br/>
                <span style={{ fontSize: 10, color: "#8494ad" }}>Reading all pages and identifying EBC scope</span>
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
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingCondId(c.id); setShowCondProps(true); }}
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
                            {totals.deductions > 0
                              ? <><span style={{ textDecoration: "line-through", color: "#666" }}>{Math.round(totals.grossQty)}</span> <span style={{ color: "#f87171" }}>{Math.round(totals.qty)}</span> {unit}</>
                              : <>{Math.round(totals.qty)} {unit}</>
                            } &middot; {fmt(totals.cost)} &middot; {Object.values(measurements).flat().filter(m => m.conditionId === c.id).length}&#x1f4cf;
                          </div>
                        )}
                        {c.attachTo && c.deductWidth > 0 && (
                          <div style={{ fontSize: 8, color: "#f87171" }}>
                            &#x2192; -{c.deductWidth}'/ea from {conditions.find(cc => cc.id === c.attachTo)?.name?.slice(0, 15) || "?"}
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
                              setConditions(prev => prev.filter(cc => cc.id !== c.id).map(cc => cc.attachTo === c.id ? { ...cc, attachTo: null, deductWidth: 0 } : cc));
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
                  <div style={{ display: "flex", gap: 3 }}>
                    {activeCond.type === "linear" && (
                      <button onClick={() => { setShowLinkSetup(!showLinkSetup); setShowAttachSetup(false); }}
                        style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: (condLinks[activeCond.id]?.length > 0) ? "rgba(74,222,128,0.15)" : "transparent", color: (condLinks[activeCond.id]?.length > 0) ? "#4ade80" : "#888", cursor: "pointer" }}>
                        {condLinks[activeCond.id]?.length > 0 ? `${condLinks[activeCond.id].length} linked` : "Link"}
                      </button>
                    )}
                    {activeCond.type === "count" && (
                      <button onClick={() => { setShowAttachSetup(!showAttachSetup); setShowLinkSetup(false); }}
                        style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.15)", background: activeCond.attachTo ? "rgba(239,68,68,0.15)" : "transparent", color: activeCond.attachTo ? "#f87171" : "#888", cursor: "pointer" }}>
                        {activeCond.attachTo ? `→ ${conditions.find(c => c.id === activeCond.attachTo)?.name?.slice(0, 12) || "?"}` : "Attach"}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: "#888" }}>
                  {(() => {
                    const t = condTotals[activeCond.id];
                    const unit = activeCond.type === "count" ? "EA" : activeCond.type === "area" ? "SF" : "LF";
                    const hasDeductions = t && t.deductions > 0;
                    return hasDeductions
                      ? <><span style={{ textDecoration: "line-through", color: "#666" }}>{Math.round(t.grossQty)} {unit}</span> <span style={{ color: "#f87171" }}>{Math.round(t.qty)} {unit} net</span> &middot; {fmt(t.cost)}</>
                      : <>{Math.round(t?.qty || 0)} {unit} &middot; {fmt(t?.cost || 0)}</>;
                  })()}
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
                {/* Attachment Setup (count conditions → deduct from linear or area parent) */}
                {showAttachSetup && activeCond.type === "count" && (() => {
                  const parentCond = activeCond.attachTo ? conditions.find(c => c.id === activeCond.attachTo) : null;
                  const isAreaParent = parentCond?.type === "area";
                  return (
                  <div style={{ marginTop: 6, padding: "6px", borderRadius: 4, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <div style={{ fontSize: 9, color: "#f87171", marginBottom: 4 }}>Deduct from parent:</div>
                    <select value={activeCond.attachTo || ""}
                      onChange={e => {
                        const val = e.target.value || null;
                        setConditions(prev => prev.map(c => c.id === activeCond.id ? { ...c, attachTo: val, deductHeight: 0 } : c));
                      }}
                      style={{ width: "100%", fontSize: 9, padding: "3px 4px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#ccc", marginBottom: 4 }}>
                      <option value="">None (no deduction)</option>
                      <optgroup label="Linear (LF)">
                        {conditions.filter(c => c.type === "linear" && c.id !== activeCond.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Area (SF)">
                        {conditions.filter(c => c.type === "area" && c.id !== activeCond.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                    </select>
                    {activeCond.attachTo && !isAreaParent && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 9, color: "#aaa" }}>Width per count:</span>
                        <input type="number" value={activeCond.deductWidth || 0} min={0} step={0.5}
                          onChange={e => {
                            const w = Math.max(0, parseFloat(e.target.value) || 0);
                            setConditions(prev => prev.map(c => c.id === activeCond.id ? { ...c, deductWidth: w } : c));
                          }}
                          style={{ width: 44, fontSize: 9, padding: "2px 4px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", textAlign: "center" }} />
                        <span style={{ fontSize: 9, color: "#aaa" }}>ft</span>
                      </div>
                    )}
                    {activeCond.attachTo && isAreaParent && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, color: "#aaa" }}>Size per count:</span>
                        <input type="number" value={activeCond.deductWidth || 0} min={0} step={0.5}
                          onChange={e => {
                            const w = Math.max(0, parseFloat(e.target.value) || 0);
                            setConditions(prev => prev.map(c => c.id === activeCond.id ? { ...c, deductWidth: w } : c));
                          }}
                          style={{ width: 36, fontSize: 9, padding: "2px 4px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", textAlign: "center" }} />
                        <span style={{ fontSize: 9, color: "#aaa" }}>×</span>
                        <input type="number" value={activeCond.deductHeight || 0} min={0} step={0.5}
                          onChange={e => {
                            const h = Math.max(0, parseFloat(e.target.value) || 0);
                            setConditions(prev => prev.map(c => c.id === activeCond.id ? { ...c, deductHeight: h } : c));
                          }}
                          style={{ width: 36, fontSize: 9, padding: "2px 4px", borderRadius: 3, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", textAlign: "center" }} />
                        <span style={{ fontSize: 9, color: "#aaa" }}>ft</span>
                      </div>
                    )}
                    {activeCond.attachTo && activeCond.deductWidth > 0 && !isAreaParent && (
                      <div style={{ fontSize: 8, color: "#888", marginTop: 3 }}>
                        Each count deducts {activeCond.deductWidth}' LF from {parentCond?.name || "parent"}
                      </div>
                    )}
                    {activeCond.attachTo && activeCond.deductWidth > 0 && isAreaParent && (
                      <div style={{ fontSize: 8, color: "#888", marginTop: 3 }}>
                        Each count deducts {activeCond.deductWidth}' × {activeCond.deductHeight || 1}' = {Math.round(activeCond.deductWidth * (activeCond.deductHeight || 1) * 100) / 100} SF from {parentCond?.name || "parent"}
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            )}
            {onAddToTakeoff && Object.values(measurements).some(pm => pm.length > 0) && (
              <button onClick={() => {
                // Aggregate by condition using condTotals (net quantities with deductions applied)
                const agg = {};
                conditions.forEach(c => {
                  if (!c.asmCode) return;
                  const t = condTotals[c.id];
                  if (!t || t.qty <= 0) return;
                  const key = c.asmCode;
                  if (!agg[key]) agg[key] = { code: c.asmCode, qty: 0, unit: c.type === "count" ? "EA" : c.type === "linear" ? "LF" : "SF", label: c.name, bidArea: "" };
                  agg[key].qty += t.qty;
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
          <div onClick={() => {
              if (contextMenu.isCo) deleteCoMeasurement(contextMenu.measurementId);
              else deleteMeasurement(contextMenu.measurementId);
              setContextMenu(null);
            }}
            style={{ padding: "6px 12px", fontSize: 11, color: "#ef4444", cursor: "pointer", borderRadius: 4 }}
            onMouseEnter={e => e.target.style.background = "rgba(239,68,68,0.1)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>
            Delete {contextMenu.isCo ? "CO " : ""}Measurement
          </div>
          {!contextMenu.isCo && <>
          <div onClick={() => {
              const src = pageMeasurements.find(mm => mm.id === contextMenu.measurementId);
              if (!src) { setContextMenu(null); return; }
              const OFFSET = 20;
              const clone = { ...src, id: "m_" + Date.now() + "_copy" };
              if (clone.vertices) clone.vertices = clone.vertices.map(v => ({ x: v.x + OFFSET, y: v.y + OFFSET }));
              if (clone.point) clone.point = { x: clone.point.x + OFFSET, y: clone.point.y + OFFSET };
              setMeasurements(prev => ({ ...prev, [pageKey]: [...(prev[pageKey] || []), clone] }));
              setUndoStack(prev => [...prev, { action: "add", pageKey, measurementId: clone.id }]);
              setRedoStack([]);
              setContextMenu(null);
            }}
            style={{ padding: "6px 12px", fontSize: 11, color: "#60a5fa", cursor: "pointer", borderRadius: 4 }}
            onMouseEnter={e => e.target.style.background = "rgba(96,165,250,0.1)"}
            onMouseLeave={e => e.target.style.background = "transparent"}>
            Copy Measurement
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
          {conditions.filter(c => {
            const m = pageMeasurements.find(mm => mm.id === contextMenu.measurementId);
            return m && c.id !== m.conditionId;
          }).map(c => (
            <div key={c.id} onClick={() => {
              const meas = pageMeasurements.find(mm => mm.id === contextMenu.measurementId);
              const oldCondId = meas?.conditionId;
              setUndoStack(prev => [...prev, { action: "reassign", pageKey, measurementId: contextMenu.measurementId, oldConditionId: oldCondId, newConditionId: c.id }]);
              setRedoStack([]);
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
          </>}
        </div>
      )}

      {/* Condition Properties Dialog (Insert key) */}
      {showCondProps && (
        <ConditionPropsDialog
          assemblies={assemblies}
          conditions={conditions}
          editingCond={editingCondId ? conditions.find(c => c.id === editingCondId) : null}
          onClose={() => { setShowCondProps(false); setEditingCondId(null); }}
          onSave={(data, existingId) => {
            if (existingId) {
              // Edit existing condition
              setConditions(prev => prev.map(c => c.id === existingId ? { ...c, ...data } : c));
            } else {
              // Create new condition
              const newCond = {
                id: "cond_" + Date.now(),
                ...data,
                attachTo: null,
                deductWidth: 0,
              };
              setConditions(prev => [...prev, newCond]);
              setActiveCondId(newCond.id);
              if (ppf) setMode(data.type);
            }
          }}
        />
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
                // ratio = real inches per 1 paper inch. PDF coords are 72 units/inch.
                // realFeet = pixelDist * ratio / (72 * 12)
                if (calPoints.length >= 2) {
                  const pixDist = dist(calPoints[0], calPoints[1]);
                  const realFeet = pixDist * sc.ratio / (72 * 12);
                  setCalInput(realFeet.toFixed(2));
                }
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

      {/* Save Named View dialog */}
      {showSaveView && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(0,0,0,0.95)", border: "1px solid rgba(59,130,246,0.5)", borderRadius: 8,
          padding: 18, zIndex: 10001, minWidth: 300, textAlign: "center" }}>
          <div style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📌 Save Named View</div>
          <div style={{ color: "#888", fontSize: 11, marginBottom: 10 }}>Saves current page, zoom level, and scroll position.</div>
          <input autoFocus value={saveViewName} onChange={e => setSaveViewName(e.target.value)}
            placeholder={`View ${namedViews.length + 1}`}
            onKeyDown={e => {
              if (e.key === "Enter") { saveNamedView(saveViewName || `View ${namedViews.length + 1}`); setShowSaveView(false); }
              if (e.key === "Escape") setShowSaveView(false);
            }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(59,130,246,0.4)",
              background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none" }} />
          {/* Existing views list with delete */}
          {namedViews.length > 0 && (
            <div style={{ marginTop: 10, maxHeight: 140, overflow: "auto", textAlign: "left" }}>
              <div style={{ fontSize: 9, color: "#666", marginBottom: 4 }}>Existing views:</div>
              {namedViews.map(nv => (
                <div key={nv.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 11 }}>
                  <span style={{ color: "#93c5fd", flex: 1 }}>{nv.name}</span>
                  <span style={{ color: "#555", fontSize: 9 }}>{sheetNames[nv.pageKey] || `P${nv.page}`}</span>
                  <button onClick={() => { navigateToView(nv); setShowSaveView(false); }}
                    style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(59,130,246,0.3)", background: "transparent", color: "#60a5fa", cursor: "pointer" }}>Go</button>
                  <button onClick={() => deleteNamedView(nv.id)}
                    style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
            <button onClick={() => setShowSaveView(false)}
              style={{ ...btn, padding: "4px 12px", fontSize: 11, borderColor: "rgba(59,130,246,0.3)" }}>Close</button>
            <button onClick={() => { saveNamedView(saveViewName || `View ${namedViews.length + 1}`); setShowSaveView(false); }}
              style={{ ...btn, padding: "4px 14px", fontSize: 11, background: "rgba(59,130,246,0.3)", borderColor: "rgba(59,130,246,0.5)", color: "#fff", fontWeight: 600 }}>
              Save View
            </button>
          </div>
        </div>
      )}

      {/* Hot Link target selector (shown when HOTLINK mode active) */}
      {mode === MODE.HOTLINK && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.9)", border: "1px solid rgba(59,130,246,0.5)", borderRadius: 8,
          padding: "8px 14px", zIndex: 10000, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#93c5fd", fontSize: 11, fontWeight: 600 }}>🔗 Place Hot Link to:</span>
          <select value={hotlinkTargetId || ""} onChange={e => setHotlinkTargetId(e.target.value)}
            style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.08)", color: "#fff", fontSize: 11 }}>
            <option value="" disabled>Select a view...</option>
            {namedViews.map(nv => <option key={nv.id} value={nv.id}>{nv.name} — {sheetNames[nv.pageKey] || `P${nv.page}`}</option>)}
          </select>
          <span style={{ color: "#666", fontSize: 9 }}>Click on plan to place</span>
          <button onClick={() => { setMode(MODE.PAN); setHotlinkTargetId(null); }}
            style={{ ...btn, padding: "2px 8px", fontSize: 9 }}>Cancel</button>
        </div>
      )}

      {/* Annotation text input overlay */}
      {showAnnTextInput && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(0,0,0,0.95)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 8,
          padding: 18, zIndex: 10001, minWidth: 280, textAlign: "center" }}>
          <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {showAnnTextInput.type === "callout" ? "Callout Text" : "Text Annotation"}
          </div>
          <input ref={annTextRef} value={annTextValue} onChange={e => setAnnTextValue(e.target.value)}
            placeholder="Enter text..."
            onKeyDown={e => {
              if (e.key === "Enter" && annTextValue.trim()) {
                const base = {
                  id: "ann_" + Date.now(), pageKey,
                  position: showAnnTextInput.position,
                  text: annTextValue.trim(),
                  strokeColor: annStyle.strokeColor,
                  lineWidth: annStyle.lineWidth,
                  fontSize: annStyle.fontSize,
                };
                if (showAnnTextInput.type === "callout") {
                  addAnnotation({ ...base, type: "callout", anchorPt: showAnnTextInput.anchorPt });
                } else {
                  addAnnotation({ ...base, type: "text" });
                }
                setShowAnnTextInput(null);
                setAnnTextValue("");
                if (!continuousMode) setMode(MODE.PAN);
              }
              if (e.key === "Escape") { setShowAnnTextInput(null); setAnnTextValue(""); }
            }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, outline: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
            <button onClick={() => { setShowAnnTextInput(null); setAnnTextValue(""); }}
              style={{ ...btn, padding: "4px 12px", fontSize: 11, borderColor: "rgba(239,68,68,0.3)" }}>Cancel</button>
            <button onClick={() => {
              if (!annTextValue.trim()) return;
              const base = {
                id: "ann_" + Date.now(), pageKey,
                position: showAnnTextInput.position,
                text: annTextValue.trim(),
                strokeColor: annStyle.strokeColor,
                lineWidth: annStyle.lineWidth,
                fontSize: annStyle.fontSize,
              };
              if (showAnnTextInput.type === "callout") {
                addAnnotation({ ...base, type: "callout", anchorPt: showAnnTextInput.anchorPt });
              } else {
                addAnnotation({ ...base, type: "text" });
              }
              setShowAnnTextInput(null);
              setAnnTextValue("");
              if (!continuousMode) setMode(MODE.PAN);
            }} style={{ ...btn, padding: "4px 14px", fontSize: 11, background: "rgba(239,68,68,0.3)", borderColor: "rgba(239,68,68,0.5)", color: "#fff", fontWeight: 600 }}>
              Place
            </button>
          </div>
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
