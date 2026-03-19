import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

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

export function DrawingViewer({ pdfData, fileName, onClose, onAddToTakeoff, assemblies }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [mode, setMode] = useState(MODE.PAN);

  // Calibration
  const [calibrations, setCalibrations] = useState({});
  const [calPoints, setCalPoints] = useState([]);
  const [calInput, setCalInput] = useState("");
  const [showCalPrompt, setShowCalPrompt] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  // Sheet management
  const [sheetNames, setSheetNames] = useState({});
  const [showSheets, setShowSheets] = useState(true);
  const [editingSheet, setEditingSheet] = useState(null);

  // Conditions system
  const [conditions, setConditions] = useState(() =>
    DRYWALL_TEMPLATE.map((t, i) => createCondition(t, i))
  );
  const [activeCondId, setActiveCondId] = useState(null);
  const [openFolders, setOpenFolders] = useState({ Walls: true, Ceilings: true, Counts: true, Insulation: false, "Add-Ons": false });
  const [showAddCond, setShowAddCond] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [hiddenFolders, setHiddenFolders] = useState({}); // { folderName: true } = hidden

  // Bid Areas
  const [bidAreas, setBidAreas] = useState([
    { id: "ba_default", name: "Unassigned" },
  ]);
  const [activeBidAreaId, setActiveBidAreaId] = useState("ba_default");
  const [showBidAreaAdd, setShowBidAreaAdd] = useState(false);
  const [newBidAreaName, setNewBidAreaName] = useState("");

  // Multi-Condition links — when a linear condition is drawn, auto-create linked measurements
  // Format: { parentCondId: [{ condId, calcType }] }
  // calcType: "sf_both_sides" = LF * height * 2, "sf_one_side" = LF * height, "pct" = LF * pct
  const [condLinks, setCondLinks] = useState({});
  const [showLinkSetup, setShowLinkSetup] = useState(false);

  // View mode (drawing vs summary)
  const [viewMode, setViewMode] = useState("drawing"); // "drawing" | "summary"
  const [summaryGroupBy, setSummaryGroupBy] = useState("condition"); // "condition" | "bidArea" | "page" | "folder"

  // Context menu for right-click on measurements
  const [contextMenu, setContextMenu] = useState(null); // { x, y, measurementId }
  const [condSearch, setCondSearch] = useState("");

  // Measurements — now linked to conditions + bid areas
  const [measurements, setMeasurements] = useState({});
  const [activeVertices, setActiveVertices] = useState([]);
  const [mousePos, setMousePos] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  // Refs
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const fitScaleRef = useRef(1);
  const touchRef = useRef({ startDist: 0, startScale: 1 });

  const ppf = calibrations[page] || null;
  const pageMeasurements = measurements[page] || [];
  const activeCond = conditions.find(c => c.id === activeCondId) || null;

  // Compute condition totals from all measurements
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
    return totals;
  }, [measurements, conditions, assemblies]);

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
        rows.push({ key: pg, name: getSheetName(Number(pg)), folder: "", color: "#888", unit: "mixed", qty: meas.length, matCost: 0, labCost: 0, total: cost, measCount: meas.length });
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

  // Grand total with mat/lab split
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
    return { grandTotal: mat + lab, totalMat: mat, totalLab: lab };
  }, [measurements, conditions, assemblies]);

  // Folders
  const folders = useMemo(() => {
    const map = {};
    conditions.forEach(c => {
      if (!map[c.folder]) map[c.folder] = [];
      map[c.folder].push(c);
    });
    return map;
  }, [conditions]);

  // ── Load PDF ──
  useEffect(() => {
    if (!pdfData) return;
    let cancelled = false;
    pdfjsLib.getDocument({ data: pdfData }).promise.then((doc) => {
      if (!cancelled) { setPdf(doc); setNumPages(doc.numPages); setPage(1); }
    });
    return () => { cancelled = true; };
  }, [pdfData]);

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

    // Scale indicator
    if (ppf) {
      const ch = canvas.height / dpr;
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(8, ch - 28, 130, 20);
      ctx.fillStyle = "#4ade80"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`Scale set (${(1 / ppf).toFixed(4)}'/px)`, 14, ch - 14);
    }
  }, [pageMeasurements, calPoints, activeVertices, mousePos, mode, ppf, zoom, conditions, activeCond, hiddenFolders]);

  useEffect(() => { requestAnimationFrame(drawOverlay); }, [drawOverlay]);

  // ── Canvas interactions ──
  const getCanvasCoords = (e) => { const r = overlayCanvasRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const getNormCoords = (e) => { const p = getCanvasCoords(e); const s = fitScaleRef.current * zoom; return { x: p.x / s, y: p.y / s }; };

  const handleCanvasClick = (e) => {
    if (mode === MODE.PAN) return;
    if (mode === MODE.CALIBRATE) {
      const pt = getNormCoords(e);
      if (calPoints.length < 2) { const next = [...calPoints, pt]; setCalPoints(next); if (next.length === 2) setShowCalPrompt(true); }
      return;
    }
    if (!activeCond) return;
    if (mode === MODE.COUNT && ppf) {
      const pt = getNormCoords(e);
      const m = { id: "m_" + Date.now(), type: "count", conditionId: activeCond.id, bidAreaId: activeBidAreaId, point: pt, count: 1, page };
      setMeasurements(prev => ({ ...prev, [page]: [...(prev[page] || []), m] }));
      setUndoStack(prev => [...prev, { action: "add", page, measurementId: m.id }]);
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
      const m = { id: "m_" + ts, type: "linear", conditionId: activeCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalFt, page };
      newMeasurements.push(m);

      // Auto-create linked measurements (Multi-Condition Takeoff)
      const links = condLinks[activeCond.id] || [];
      links.forEach((link, i) => {
        const linkedCond = conditions.find(c => c.id === link.condId);
        if (!linkedCond) return;
        if (link.calcType === "sf_both_sides") {
          const sf = totalFt * (activeCond.height || 10) * 2;
          newMeasurements.push({ id: "m_" + ts + "_l" + i, type: "area", conditionId: linkedCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalSf: sf, page, autoLinked: true });
        } else if (link.calcType === "sf_one_side") {
          const sf = totalFt * (activeCond.height || 10);
          newMeasurements.push({ id: "m_" + ts + "_l" + i, type: "area", conditionId: linkedCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalSf: sf, page, autoLinked: true });
        } else if (link.calcType === "match_lf") {
          newMeasurements.push({ id: "m_" + ts + "_l" + i, type: "linear", conditionId: linkedCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalFt, page, autoLinked: true });
        }
      });
    } else {
      const areaPx = polyArea(activeVertices);
      const m = { id: "m_" + ts, type: "area", conditionId: activeCond.id, bidAreaId: activeBidAreaId, vertices: activeVertices, totalSf: areaPx / (ppf * ppf), page };
      newMeasurements.push(m);
    }

    setMeasurements(prev => ({ ...prev, [page]: [...(prev[page] || []), ...newMeasurements] }));
    newMeasurements.forEach(m => setUndoStack(prev => [...prev, { action: "add", page, measurementId: m.id }]));
    setActiveVertices([]);
  };

  const handleCanvasMove = (e) => {
    if (mode === MODE.LINEAR || mode === MODE.AREA || mode === MODE.COUNT) setMousePos(getCanvasCoords(e));
  };

  const confirmCalibration = () => {
    const ft = parseFloat(calInput);
    if (!ft || ft <= 0 || calPoints.length < 2) return;
    setCalibrations(prev => ({ ...prev, [page]: dist(calPoints[0], calPoints[1]) / ft }));
    setCalPoints([]); setCalInput(""); setShowCalPrompt(false); setShowVerify(true); setMode(MODE.PAN);
  };

  // Apply scale to multiple pages
  const applyScaleToAll = () => {
    if (!ppf) return;
    const newCals = {};
    for (let i = 1; i <= numPages; i++) newCals[i] = ppf;
    setCalibrations(prev => ({ ...prev, ...newCals }));
  };

  const getSheetName = (pg) => sheetNames[pg] || `Page ${pg}`;
  const setSheetName = (pg, name) => setSheetNames(prev => ({ ...prev, [pg]: name }));

  const deleteMeasurement = (id) => { setMeasurements(prev => ({ ...prev, [page]: (prev[page] || []).filter(m => m.id !== id) })); };
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
  const zoomIn = () => setZoom(s => Math.min(4, s + 0.25));
  const zoomOut = () => setZoom(s => Math.max(0.5, s - 0.25));
  const resetZoom = () => setZoom(1);

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
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.key === " ") { e.preventDefault(); setMode(m => m === MODE.PAN ? (activeCond ? activeCond.type : MODE.PAN) : MODE.PAN); return; }
      if (e.key === "l" || e.key === "L") { if (ppf) { setMode(MODE.LINEAR); cancelActive(); } return; }
      if (e.key === "a" || e.key === "A") { if (ppf) { setMode(MODE.AREA); cancelActive(); } return; }
      if (e.key === "c" || e.key === "C") { if (ppf) { setMode(MODE.COUNT); cancelActive(); } return; }
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.85)", flexShrink: 0, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onClose} style={{ ...btn, background: "rgba(239,68,68,0.2)", borderColor: "rgba(239,68,68,0.4)" }}>Close</button>
          {numPages > 1 && (
            <button onClick={() => setShowSheets(v => !v)} style={{ ...btn, fontSize: 10, padding: "4px 8px" }} title="Toggle sheet list">
              {showSheets ? "Hide" : "Sheets"}
            </button>
          )}
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {numPages > 1 ? getSheetName(page) : (fileName || "Drawing")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <button onClick={() => { setMode(MODE.PAN); cancelActive(); }} style={mode === MODE.PAN ? btnActive : btn} title="Space">Pan</button>
          <button onClick={() => { setMode(MODE.CALIBRATE); cancelActive(); }} style={mode === MODE.CALIBRATE ? btnActive : btn} title="S">{ppf ? "Scale" : "Set Scale"}</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={() => { if (ppf) { setMode(MODE.LINEAR); cancelActive(); }}} style={!ppf ? btnDis : mode === MODE.LINEAR ? btnActive : btn} disabled={!ppf} title="L">Linear</button>
          <button onClick={() => { if (ppf) { setMode(MODE.AREA); cancelActive(); }}} style={!ppf ? btnDis : mode === MODE.AREA ? btnActive : btn} disabled={!ppf} title="A">Area</button>
          <button onClick={() => { if (ppf) { setMode(MODE.COUNT); cancelActive(); }}} style={!ppf ? btnDis : mode === MODE.COUNT ? btnActive : btn} disabled={!ppf} title="C">Count</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={undo} style={btn} title="Ctrl+Z">Undo</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          {/* Bid Area selector */}
          <select value={activeBidAreaId} onChange={e => setActiveBidAreaId(e.target.value)}
            style={{ padding: "4px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 10, maxWidth: 120 }}>
            {bidAreas.map(ba => <option key={ba.id} value={ba.id}>{ba.name}</option>)}
          </select>
          <button onClick={() => setShowBidAreaAdd(true)} style={{ ...btn, fontSize: 9, padding: "3px 6px" }} title="Add bid area">+Area</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={() => setViewMode(v => v === "drawing" ? "summary" : "drawing")}
            style={viewMode === "summary" ? btnActive : btn} title="Toggle summary view">
            {viewMode === "summary" ? "Drawing" : "Summary"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={prevPage} style={page <= 1 ? btnDis : btn} disabled={page <= 1}>Prev</button>
          <span style={{ color: "#ccc", fontSize: 11, minWidth: 50, textAlign: "center" }}>{page}/{numPages}</span>
          <button onClick={nextPage} style={page >= numPages ? btnDis : btn} disabled={page >= numPages}>Next</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
          <button onClick={zoomOut} style={btn}>-</button>
          <span style={{ color: "#ccc", fontSize: 10, minWidth: 36, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} style={btn}>+</button>
          <button onClick={resetZoom} style={{ ...btn, fontSize: 10 }} title="F">Fit</button>
        </div>
      </div>

      {/* ── Body: sheets sidebar + canvas + conditions panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left Sidebar: Sheet Navigator ── */}
        {showSheets && numPages > 1 && (
          <div style={{ width: 180, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.9)", overflow: "auto", padding: "8px 6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 4px" }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Sheets</span>
              <span style={{ fontSize: 9, color: "#666" }}>{numPages} pages</span>
            </div>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => {
              const isCurrent = pg === page;
              const hasScale = !!calibrations[pg];
              const hasMeasurements = (measurements[pg] || []).length > 0;
              const measCount = (measurements[pg] || []).length;
              return (
                <div key={pg}
                  onClick={() => { setPage(pg); setActiveVertices([]); }}
                  style={{
                    padding: "6px 8px", marginBottom: 3, borderRadius: 5, cursor: "pointer",
                    background: isCurrent ? "rgba(224,148,34,0.12)" : "transparent",
                    border: isCurrent ? "1px solid rgba(224,148,34,0.3)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* Scale indicator dot */}
                    <span title={hasScale ? "Scale set" : "No scale"} style={{
                      width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                      background: hasScale ? "#4ade80" : "#ef4444",
                    }} />
                    {/* Page name */}
                    {editingSheet === pg ? (
                      <input autoFocus
                        value={sheetNames[pg] || ""}
                        placeholder={`Page ${pg}`}
                        onChange={e => setSheetName(pg, e.target.value)}
                        onBlur={() => setEditingSheet(null)}
                        onKeyDown={e => { if (e.key === "Enter") setEditingSheet(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, padding: "1px 4px", borderRadius: 3, border: "1px solid var(--amber)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 10, minWidth: 0 }}
                      />
                    ) : (
                      <span onDoubleClick={(e) => { e.stopPropagation(); setEditingSheet(pg); }}
                        style={{ flex: 1, fontSize: 10, color: isCurrent ? "#fff" : "#aaa", fontWeight: isCurrent ? 600 : 400,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}
                        title="Double-click to rename">
                        {getSheetName(pg)}
                      </span>
                    )}
                  </div>
                  {/* Measurement count badge */}
                  {hasMeasurements && (
                    <div style={{ fontSize: 9, color: "#888", paddingLeft: 12, marginTop: 2 }}>
                      {measCount} measurement{measCount !== 1 ? "s" : ""}
                    </div>
                  )}
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
            style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: 12,
              cursor: mode === MODE.PAN ? "grab" : "crosshair" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <canvas ref={pdfCanvasRef} />
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
                [page]: (prev[page] || []).map(m => m.id === contextMenu.measurementId ? { ...m, conditionId: c.id } : m)
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
