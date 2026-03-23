import { useState, useMemo, useRef, useCallback } from "react";
import { getHF, SCOPE_INIT, SCOPE_ITEM_MAP, DEFAULT_ASSUMPTIONS, DEFAULT_PROPOSAL_TERMS, SCOPE_TEMPLATES, PROFIT_SUGGESTIONS } from "../data/constants";
import { generateProposalPdf, generateQuickProposalPdf, defaultIncludes, defaultExcludes } from "../utils/proposalPdf";
import { buildScopeLines } from "../utils/scopeBuilder";
import { DrawingViewer } from "../components/DrawingViewer";
import { uploadTakeoffPdf, downloadTakeoffPdf } from "../lib/supabase";

/* ── helpers ─────────────────────────────────────────────────── */

function calcItem(item, assemblies) {
  const asm = assemblies.find((a) => a.code === item.code);
  if (!asm) return { mat: 0, lab: 0, total: 0 };
  const hf = getHF(item.height || 10);
  const matTotal = (item.qty || 0) * (asm.matRate || 0) * (item.diff || 1);
  const labTotal = (item.qty || 0) * (asm.labRate || 0) * hf.f * (item.diff || 1);
  return { mat: matTotal, lab: labTotal, total: matTotal + labTotal };
}

function calcRoom(room, assemblies) {
  let mat = 0, lab = 0;
  (room.items || []).forEach((it) => {
    const c = calcItem(it, assemblies);
    mat += c.mat;
    lab += c.lab;
  });
  return { mat, lab, total: mat + lab };
}

function calcSummary(tk, assemblies) {
  let matSub = 0, labSub = 0;
  (tk.rooms || []).forEach((rm) => {
    const c = calcRoom(rm, assemblies);
    matSub += c.mat;
    labSub += c.lab;
  });
  const subtotal = matSub + labSub;
  const wasteAmt = subtotal * ((tk.wastePct || 0) / 100);
  const netCost = subtotal + wasteAmt;
  const taxAmt = matSub * (1 + (tk.wastePct || 0) / 100) * ((tk.taxRate || 0) / 100);
  const costWithTax = netCost + taxAmt;
  const overheadAmt = costWithTax * ((tk.overheadPct || 0) / 100);
  const costWithOverhead = costWithTax + overheadAmt;
  const profitAmt = costWithOverhead * ((tk.profitPct || 0) / 100);
  const grandTotal = costWithOverhead + profitAmt;
  return { matSub, labSub, subtotal, wasteAmt, netCost, taxAmt, costWithTax, overheadAmt, costWithOverhead, profitAmt, grandTotal };
}

/* ── main export ─────────────────────────────────────────────── */

const SCOPE_ICONS = { unchecked: "○", checked: "✓", flagged: "⚑" };
const SCOPE_CYCLE = { unchecked: "checked", checked: "flagged", flagged: "unchecked" };
const SEV_BADGE = { critical: "badge-red", warning: "badge-amber", info: "badge-blue" };

export function EstimatingTab({ app }) {
  const {
    takeoffs, setTakeoffs,
    bids, setBids, projects, assemblies, company, show, apiKey,
    fmt, fmtK, search, submittals,
    scope, setScope,
  } = app;

  // Helper: find submittals linked to a given assembly code
  const getSubmittalsForCode = (code) =>
    (submittals || []).filter(s => (s.linkedAssemblyCodes || []).includes(code));

  const [activeTk, setActiveTk] = useState(null);
  const [openRooms, setOpenRooms] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [histResult, setHistResult] = useState(null);
  const [histLoading, setHistLoading] = useState(false);
  const [showHist, setShowHist] = useState(false);

  // ── Drawing Viewer state ──
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawingPdfData, setDrawingPdfData] = useState(null);
  const [drawingFileName, setDrawingFileName] = useState("");
  const drawingFileRef = useRef();

  // Try to open drawing: memory → IDB cache → Supabase cloud → file picker
  const openDrawing = useCallback(async (tkId, drawingState) => {
    // If we already have pdfData in memory, just open
    if (drawingPdfData) { setShowDrawing(true); return; }
    const fileName = drawingState?.pdfFileNames?.[0] || drawingState?.drawingFileName || "";
    // Try IDB cache first
    if (drawingState?.pdfFileNames?.length > 0) {
      try {
        const IDB_NAME = "ebc_takeoff_pdfs";
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(IDB_NAME, 2);
          req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("pdfs")) req.result.createObjectStore("pdfs"); };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const data = await new Promise((resolve, reject) => {
          const tx = db.transaction("pdfs", "readonly");
          const req = tx.objectStore("pdfs").get(`${tkId}_0`);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        if (data) {
          console.log("[OpenDrawing] Loaded from IDB cache");
          setDrawingPdfData(new Uint8Array(data));
          setDrawingFileName(fileName);
          setShowDrawing(true);
          return;
        }
      } catch (e) { console.warn("[IDB] Failed to load cached PDF:", e); }
    }
    // Try Supabase Storage (cloud fallback)
    if (fileName) {
      try {
        show("Downloading drawing from cloud...", "info");
        const buf = await downloadTakeoffPdf(tkId, fileName, 0);
        if (buf) {
          console.log("[OpenDrawing] Downloaded from Supabase Storage");
          const pdfBytes = new Uint8Array(buf);
          setDrawingPdfData(pdfBytes);
          setDrawingFileName(fileName);
          setShowDrawing(true);
          // Re-cache in IDB for next time
          try {
            const IDB_NAME = "ebc_takeoff_pdfs";
            const db = await new Promise((resolve, reject) => {
              const req = indexedDB.open(IDB_NAME, 2);
              req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("pdfs")) req.result.createObjectStore("pdfs"); };
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
            const tx = db.transaction("pdfs", "readwrite");
            tx.objectStore("pdfs").put(pdfBytes.buffer, `${tkId}_0`);
          } catch (e) { console.warn("[IDB] Failed to re-cache PDF:", e); }
          return;
        }
      } catch (e) { console.warn("[Supabase] Failed to download PDF:", e); }
    }
    // Final fallback: open file picker
    if (drawingFileRef.current) drawingFileRef.current.click();
  }, [drawingPdfData]);

  // ── Scope Checklist & Gap Analysis state ──
  const [showScopePanel, setShowScopePanel] = useState(false);
  const [scopeSubTab, setScopeSubTab] = useState("checklist");
  const [scopeFilter, setScopeFilter] = useState("All");
  const [gapBidScope, setGapBidScope] = useState("");
  const [gapContractScope, setGapContractScope] = useState("");
  const [gapResult, setGapResult] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);

  // ── Scope Review Modal state ──
  const [scopeModalTkId, setScopeModalTkId] = useState(null);
  const [scopeModalStep, setScopeModalStep] = useState(1);

  // ── Quick Proposal state ──
  const [showQuickProposal, setShowQuickProposal] = useState(false);

  const filteredScope = (() => {
    if (scopeFilter === "Flagged") return (scope || []).filter(s => s.status === "flagged");
    if (scopeFilter === "Unchecked") return (scope || []).filter(s => s.status === "unchecked");
    return scope || [];
  })();

  const handleScopeCycle = (id) => {
    setScope(prev => prev.map(s => s.id === id ? { ...s, status: SCOPE_CYCLE[s.status] } : s));
  };

  const runGapCheck = async () => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    if (!gapBidScope.trim() || !gapContractScope.trim()) { show("Paste both scopes", "err"); return; }
    setGapLoading(true);
    setGapResult(null);
    try {
      const { checkScopeGaps } = await import("../utils/api.js");
      const result = await checkScopeGaps(apiKey, gapBidScope, gapContractScope);
      setGapResult(result);
      show("Gap analysis complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setGapLoading(false);
    }
  };

  // ── Local search (takeoffs + bids) ──
  const [localSearch, setLocalSearch] = useState("");
  const [showBidBrowser, setShowBidBrowser] = useState(false);

  // ── PDF Scan state ──
  const [scanModal, setScanModal] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanRawText, setScanRawText] = useState("");

  async function handleScanPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanLoading(true);
    setScanModal(true);
    setScanResult(null);
    try {
      const { extractBidFromPdf } = await import("../utils/pdfBidExtractor.js");
      const result = await extractBidFromPdf(file);
      setScanResult(result);
      setScanRawText(result._rawText || "");
      show("PDF scanned successfully", "ok");
    } catch (err) {
      show("PDF scan failed: " + err.message, "err");
      setScanModal(false);
    } finally {
      setScanLoading(false);
    }
  }

  function createBidFromScan() {
    if (!scanResult) return;
    const newBid = {
      id: Date.now(),
      name: scanResult.name || "Scanned Bid",
      gc: scanResult.gc || "",
      value: scanResult.value || 0,
      due: scanResult.due || "",
      bidDate: scanResult.bidDate || "",
      status: "estimating",
      scope: scanResult.scope || [],
      phase: scanResult.phase || "Commercial",
      risk: "",
      notes: scanResult.notes || "",
      contact: scanResult.contact || "",
      month: scanResult.month || "",
      address: scanResult.address || "",
      closeOut: null,
    };
    setBids(prev => [...prev, newBid]);
    show(`Bid "${newBid.name}" added to pipeline`, "ok");
    return newBid.id;
  }

  function createTakeoffFromScan(bidId) {
    if (!scanResult) return;
    // Map extracted line items to assemblies
    const labelToAssembly = {
      demo: null, // no assembly for demo
      "drywall": "A2", "drywall/build back": "A2", "build back": "A2",
      "metal framing": "A2", "metal stud": "A2", "stud framing": "A2",
      "framing": "A2", "studs and track": "A2", "studs & track": "A2",
      "interior framing": "A2", "light gauge": "A2",
      act: "ACT1",
      insulation: "INS1",
      frp: "FRP1",
      fireproofing: "FP1",
      "shaft wall": "SW1",
      "lead-lined": "LL1", "lead lined": "LL1",
      icra: "ICRA1",
      "l5 finish": "GC1", "level 5": "GC1",
    };

    const items = (scanResult.lineItemsRaw || scanResult.lineItems || []).map((li, i) => {
      const lbl = li.label.toLowerCase().replace(/\s*\(.*\)/, "").trim();
      let code = "";
      for (const [key, val] of Object.entries(labelToAssembly)) {
        if (lbl.includes(key) && val) { code = val; break; }
      }
      // Verify assembly exists
      const asm = code ? assemblies.find(a => a.code === code) : null;
      return {
        id: "li_" + Date.now() + "_" + i,
        code: asm?.code || assemblies[0]?.code || "A2",
        desc: li.label,
        qty: 0, // user needs to enter quantities from their takeoff
        unit: asm?.unit || "LF",
        height: 10,
        diff: 1.0,
        _scannedAmount: li.amount, // keep original amount for reference
      };
    }).filter(it => it.code); // skip items with no assembly match

    const rooms = [{
      id: "rm_" + Date.now(),
      name: scanResult.name || "Scanned Bid",
      floor: "",
      items,
    }];

    const tk = {
      id: crypto.randomUUID(),
      bidId: bidId || null,
      name: (scanResult.name || "Scanned Bid") + " (Re-estimate)",
      created: new Date().toISOString().slice(0, 10),
      wastePct: company.defaultWaste,
      taxRate: company.defaultTax,
      overheadPct: company.defaultOverhead,
      profitPct: company.defaultProfit,
      rooms,
      alternates: (scanResult.alternates && scanResult.alternates.length > 0)
        ? scanResult.alternates.map((a, i) => ({ id: a.id || ("alt_" + Date.now() + "_" + i), description: a.description, amount: a.amount || 0, type: a.type || "add" }))
        : (scanResult.alternate ? [{ id: "alt_" + Date.now(), description: scanResult.alternate, amount: 0, type: "add" }] : []),
      addOns: [],
      scopeChecklist: SCOPE_INIT.map(s => ({ ...s })),
      scopeChecklistCompleted: false,
      scopeLines: {
        includes: scanResult.includes || [],
        excludes: scanResult.excludes || [],
        assumptions: [],
      },
      proposalNumber: "",
      proposalTerms: { ...DEFAULT_PROPOSAL_TERMS },
    };

    setTakeoffs(prev => [...prev, tk]);
    setScanModal(false);
    setActiveTk(tk.id);
    setOpenRooms({ [rooms[0].id]: true });
    show(`Takeoff created from scanned bid — adjust quantities & assemblies`, "ok");
  }

  // ── Bid search for "re-estimate existing bid" ──
  const bidSearchResults = useMemo(() => {
    if (!localSearch.trim()) return [];
    const q = localSearch.toLowerCase();
    return bids.filter(b =>
      b.name?.toLowerCase().includes(q) ||
      b.gc?.toLowerCase().includes(q) ||
      b.phase?.toLowerCase().includes(q) ||
      (b.scope || []).some(s => s.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [localSearch, bids]);

  // ── OST Import state ──
  const [ostModal, setOstModal] = useState(false);
  const [ostRows, setOstRows] = useState([]);       // parsed CSV rows
  const [ostHeaders, setOstHeaders] = useState([]);  // CSV column headers
  const [ostMapping, setOstMapping] = useState({});   // column index mappings
  const [ostName, setOstName] = useState("");          // takeoff name from filename
  const [ostItemMappings, setOstItemMappings] = useState([]); // per-row assembly mappings

  // ── OST Import handlers ──
  function handleOstFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const fname = file.name.replace(/\.\w+$/, "").replace(/[_-]/g, " ");
    setOstName(fname);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { show("CSV file is empty or has no data rows", "err"); return; }

      // Parse CSV — handle proper quoted fields (field must START with ")
      const parseCSVLine = (line) => {
        const result = [];
        let i = 0;
        while (i < line.length) {
          if (line[i] === '"') {
            // Quoted field — find closing quote
            let j = i + 1;
            let val = "";
            while (j < line.length) {
              if (line[j] === '"' && line[j + 1] === '"') { val += '"'; j += 2; }
              else if (line[j] === '"') { j++; break; }
              else { val += line[j]; j++; }
            }
            result.push(val.trim());
            if (line[j] === ',') j++;
            i = j;
          } else {
            // Unquoted field — split on comma (inch marks like 3-5/8" are NOT quote delimiters)
            const comma = line.indexOf(',', i);
            if (comma === -1) { result.push(line.slice(i).trim()); break; }
            result.push(line.slice(i, comma).trim());
            i = comma + 1;
          }
        }
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const rows = lines.slice(1).map(l => parseCSVLine(l)).filter(r => r.some(c => c));

      // Auto-detect column mappings
      const mapping = { condition: -1, count: -1, lf: -1, sf: -1, area: -1, page: -1 };
      headers.forEach((h, i) => {
        const lc = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (lc.includes("condition") || lc.includes("name") || lc.includes("description") || lc.includes("desc")) mapping.condition = i;
        else if (lc === "count" || lc === "ea" || lc === "each") mapping.count = i;
        else if (lc.includes("length") || lc === "lf" || lc.includes("linearfeet") || lc.includes("linear")) mapping.lf = i;
        else if (lc.includes("area") || lc === "sf" || lc.includes("squarefeet") || lc.includes("square") || lc.includes("sqft")) mapping.sf = i;
        else if (lc.includes("page") || lc.includes("sheet") || lc.includes("room") || lc.includes("location")) mapping.page = i;
      });
      // If no condition col found, use first text column
      if (mapping.condition === -1) mapping.condition = 0;

      // Build per-row assembly guesses
      const itemMaps = rows.map(row => {
        const condName = row[mapping.condition] || "";
        const lc = condName.toLowerCase();
        // Try to auto-match assembly
        let bestCode = "";
        for (const asm of assemblies) {
          const asmLc = asm.name.toLowerCase();
          if (lc.includes("lead") && asm.code === "LL1") { bestCode = asm.code; break; }
          if (lc.includes("act") && asm.code.startsWith("ACT")) { bestCode = asm.code; break; }
          if (lc.includes("ceiling") && !lc.includes("act") && asm.code === "GC1") { bestCode = asm.code; break; }
          if (lc.includes("insul") && asm.code.startsWith("INS")) { bestCode = asm.code; break; }
          if ((lc.includes("frp") || lc.includes("panel")) && asm.code === "FRP1") { bestCode = asm.code; break; }
          if (lc.includes("furr") && !lc.includes("down") && asm.code === "C2") { bestCode = asm.code; break; }
          if ((lc.includes("soffit") || lc.includes("furr-down") || lc.includes("furrdown")) && asm.code === "FD1") { bestCode = asm.code; break; }
          if (lc.includes("fire") && asm.code === "FP1") { bestCode = asm.code; break; }
          if (lc.includes("icra") && asm.code === "ICRA1") { bestCode = asm.code; break; }
          if ((lc.includes("wall") || lc.includes("metal") || lc.includes("stud") || lc.includes("ga ")) && !bestCode) { bestCode = "A2"; }
        }
        // Determine which qty to use
        let qty = 0;
        let unit = "LF";
        if (mapping.sf !== -1 && parseFloat(row[mapping.sf])) {
          qty = parseFloat(row[mapping.sf]);
          unit = "SF";
        } else if (mapping.lf !== -1 && parseFloat(row[mapping.lf])) {
          qty = parseFloat(row[mapping.lf]);
          unit = "LF";
        } else if (mapping.count !== -1 && parseFloat(row[mapping.count])) {
          qty = parseFloat(row[mapping.count]);
          unit = "EA";
        }
        // Override unit from assembly if matched
        if (bestCode) {
          const asm = assemblies.find(a => a.code === bestCode);
          if (asm) unit = asm.unit;
        }
        return { condName, qty, unit, assemblyCode: bestCode, include: qty > 0, page: mapping.page !== -1 ? (row[mapping.page] || "") : "" };
      });

      setOstHeaders(headers);
      setOstRows(rows);
      setOstMapping(mapping);
      setOstItemMappings(itemMaps);
      setOstModal(true);
    };
    reader.readAsText(file);
  }

  function importOstTakeoff() {
    const included = ostItemMappings.filter(m => m.include && m.assemblyCode);
    if (included.length === 0) { show("No items selected for import", "err"); return; }

    // Group by page/room
    const roomMap = {};
    included.forEach(m => {
      const roomKey = m.page || "Imported";
      if (!roomMap[roomKey]) roomMap[roomKey] = [];
      const asm = assemblies.find(a => a.code === m.assemblyCode);
      roomMap[roomKey].push({
        id: "li_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        code: m.assemblyCode,
        desc: asm?.name || m.condName,
        qty: Math.round(m.qty * 100) / 100,
        unit: asm?.unit || m.unit,
        height: 10,
        diff: 1.0,
      });
    });

    const rooms = Object.entries(roomMap).map(([name, items]) => ({
      id: "rm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      name,
      floor: "",
      items,
    }));

    const tk = {
      id: crypto.randomUUID(),
      bidId: null,
      name: ostName || "OST Import",
      created: new Date().toISOString().slice(0, 10),
      wastePct: company.defaultWaste,
      taxRate: company.defaultTax,
      overheadPct: company.defaultOverhead,
      profitPct: company.defaultProfit,
      rooms,
      scopeChecklist: SCOPE_INIT.map(s => ({ ...s })),
      scopeChecklistCompleted: false,
      scopeLines: { includes: [], excludes: [], assumptions: [] },
      proposalNumber: "",
      proposalTerms: { ...DEFAULT_PROPOSAL_TERMS },
    };

    setTakeoffs(prev => [...prev, tk]);
    setOstModal(false);
    setActiveTk(tk.id);
    // Open all rooms
    const allOpen = {};
    rooms.forEach(r => { allOpen[r.id] = true; });
    setOpenRooms(allOpen);
    show(`Imported ${included.length} items into ${rooms.length} room(s)`, "ok");
  }

  const runHistComparison = async (tk) => {
    if (!apiKey) { show("Set API key in Settings first", "err"); return; }
    setHistLoading(true);
    setHistResult(null);
    setShowHist(true);
    try {
      const { compareHistoricalEstimate } = await import("../utils/api.js");
      const s = calcSummary(tk, assemblies);
      const linkedBid = bids.find(b => b.id === tk.bidId);
      const currentBid = {
        name: tk.name,
        bidName: linkedBid?.name || "Unlinked",
        phase: linkedBid?.phase || "Unknown",
        scope: linkedBid?.scope || [],
        totalEstimate: s.grandTotal,
        materialCost: s.matSub,
        laborCost: s.labSub,
        profitPct: tk.profitPct,
        overheadPct: tk.overheadPct,
        roomCount: (tk.rooms || []).length,
      };
      const histProjects = projects.map(p => ({
        name: p.project,
        gc: p.gc,
        phase: p.phase,
        contractValue: p.contract,
        billed: p.billed,
        margin: p.margin,
        scope: p.scope || [],
      }));
      const result = await compareHistoricalEstimate(apiKey, currentBid, histProjects);
      setHistResult(result);
      show("Historical comparison complete", "ok");
    } catch (e) {
      show(e.message, "err");
    } finally {
      setHistLoading(false);
    }
  };

  /* ── takeoff CRUD helpers ────────────────────────────────── */

  function updateTakeoff(id, updater) {
    setTakeoffs((prev) =>
      prev.map((tk) => (tk.id === id ? (typeof updater === "function" ? updater(tk) : { ...tk, ...updater }) : tk))
    );
  }

  function createTakeoff() {
    const tk = {
      id: crypto.randomUUID(),
      bidId: null,
      name: "New Takeoff",
      created: new Date().toISOString().slice(0, 10),
      wastePct: company.defaultWaste,
      taxRate: company.defaultTax,
      overheadPct: company.defaultOverhead,
      profitPct: company.defaultProfit,
      rooms: [],
      scopeChecklist: SCOPE_INIT.map(s => ({ ...s })),
      scopeChecklistCompleted: false,
      scopeLines: { includes: [], excludes: [], assumptions: [] },
      proposalNumber: "",
      proposalTerms: { ...DEFAULT_PROPOSAL_TERMS },
    };
    setTakeoffs((prev) => [...prev, tk]);
    setActiveTk(tk.id);
  }

  function cloneTakeoff(tkId) {
    const src = takeoffs.find((t) => t.id === tkId);
    if (!src) return;
    const now = Date.now();
    const clone = {
      ...src,
      id: "tk_" + now,
      name: (src.name || "Takeoff") + " (Copy)",
      created: new Date().toISOString().slice(0, 10),
      rooms: src.rooms.map((r, ri) => ({
        ...r,
        id: "rm_" + (now + ri + 1),
        items: r.items.map((it, ii) => ({
          ...it,
          id: "li_" + (now + ri * 1000 + ii + 100),
        })),
      })),
      scopeChecklist: (src.scopeChecklist || SCOPE_INIT).map(s => ({ ...s })),
      scopeChecklistCompleted: false,
      scopeLines: src.scopeLines ? { ...src.scopeLines } : { includes: [], excludes: [], assumptions: [] },
      proposalNumber: "",
      proposalTerms: src.proposalTerms ? { ...src.proposalTerms } : { ...DEFAULT_PROPOSAL_TERMS },
    };
    setTakeoffs((prev) => [...prev, clone]);
    setActiveTk(clone.id);
    show(`Cloned "${src.name}"`);
  }

  function addRoom(tkId) {
    const newRoom = { id: "rm_" + Date.now(), name: "New Area", floor: "", items: [] };
    updateTakeoff(tkId, (tk) => ({ ...tk, rooms: [...(tk.rooms || []), newRoom] }));
    setOpenRooms((prev) => ({ ...prev, [newRoom.id]: true }));
  }

  function deleteRoom(tkId, rmId) {
    if (!confirm("Delete this room and all its line items?")) return;
    updateTakeoff(tkId, (tk) => ({ ...tk, rooms: tk.rooms.filter((r) => r.id !== rmId) }));
  }

  function updateRoom(tkId, rmId, patch) {
    updateTakeoff(tkId, (tk) => ({
      ...tk,
      rooms: tk.rooms.map((r) => (r.id === rmId ? { ...r, ...patch } : r)),
    }));
  }

  function addLineItem(tkId, rmId) {
    const first = assemblies[0];
    const newItem = {
      id: "li_" + Date.now(),
      code: first.code,
      desc: first.name,
      qty: 0,
      unit: first.unit,
      height: 10,
      diff: 1.0,
    };
    updateTakeoff(tkId, (tk) => ({
      ...tk,
      rooms: tk.rooms.map((r) =>
        r.id === rmId ? { ...r, items: [...r.items, newItem] } : r
      ),
    }));
    setEditingItem(newItem.id);
  }

  function deleteLineItem(tkId, rmId, liId) {
    updateTakeoff(tkId, (tk) => ({
      ...tk,
      rooms: tk.rooms.map((r) =>
        r.id === rmId ? { ...r, items: r.items.filter((i) => i.id !== liId) } : r
      ),
    }));
    if (editingItem === liId) setEditingItem(null);
  }

  function updateLineItem(tkId, rmId, liId, patch) {
    updateTakeoff(tkId, (tk) => ({
      ...tk,
      rooms: tk.rooms.map((r) =>
        r.id === rmId
          ? { ...r, items: r.items.map((i) => (i.id === liId ? { ...i, ...patch } : i)) }
          : r
      ),
    }));
  }

  function handleAssemblyChange(tkId, rmId, liId, code) {
    const asm = assemblies.find((a) => a.code === code);
    if (!asm) return;
    updateLineItem(tkId, rmId, liId, { code, desc: asm.name, unit: asm.unit });
  }

  function toggleRoom(rmId) {
    setOpenRooms((prev) => ({ ...prev, [rmId]: !prev[rmId] }));
  }

  /* ── copy proposal ───────────────────────────────────────── */

  function copyProposal(tk) {
    const bidName = bids.find((b) => b.id === tk.bidId)?.name || "N/A";
    const s = calcSummary(tk, assemblies);
    let text = "EAGLES BROTHERS CONSTRUCTORS\n";
    text += `Estimate: ${tk.name}\n`;
    text += `Date: ${tk.created}\n`;
    text += `Linked Bid: ${bidName}\n\n`;

    // Collect all referenced submittal numbers for the summary
    const allSubmittalRefs = new Set();

    (tk.rooms || []).forEach((rm) => {
      text += `${rm.name}${rm.floor ? " (" + rm.floor + ")" : ""}\n`;
      (rm.items || []).forEach((it) => {
        const c = calcItem(it, assemblies);
        const subs = getSubmittalsForCode(it.code);
        const subRef = subs.length > 0 ? `  [${subs.map(s => s.number).join(", ")}]` : "";
        subs.forEach(s => allSubmittalRefs.add(`${s.number} — ${s.desc} (${s.status})`));
        text += `  ${it.qty} ${it.unit}  ${it.desc}  ${fmt(c.total)}${subRef}\n`;
      });
      const rt = calcRoom(rm, assemblies);
      text += `  Room Subtotal: ${fmt(rt.total)}\n\n`;
    });

    text += "---\n";
    text += `Subtotal Materials: ${fmt(s.matSub)}\n`;
    text += `Subtotal Labor: ${fmt(s.labSub)}\n`;
    text += `Waste (${tk.wastePct}%): ${fmt(s.wasteAmt)}\n`;
    text += `Tax on Materials (${tk.taxRate}%): ${fmt(s.taxAmt)}\n`;
    text += `Overhead (${tk.overheadPct}%): ${fmt(s.overheadAmt)}\n`;
    text += `Profit (${tk.profitPct}%): ${fmt(s.profitAmt)}\n`;
    text += "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n";
    text += `GRAND TOTAL: ${fmt(s.grandTotal)}\n`;

    // Submittal references section
    if (allSubmittalRefs.size > 0) {
      text += "\n═══ SUBMITTALS REFERENCED ═══\n";
      for (const ref of allSubmittalRefs) {
        text += `  ${ref}\n`;
      }
      text += "\nAll materials per approved submittals. Product data available upon request.\n";
    }

    navigator.clipboard.writeText(text).then(() => {
      show("Proposal copied to clipboard", "ok");
    });
  }

  /* ── render: list view ───────────────────────────────────── */

  const q = localSearch.toLowerCase();
  const filtered = (takeoffs || []).filter(
    (tk) => {
      const matchGlobal = !search || tk.name.toLowerCase().includes(search.toLowerCase());
      const matchLocal = !q || tk.name.toLowerCase().includes(q) ||
        bids.find(b => b.id === tk.bidId)?.name?.toLowerCase().includes(q);
      return matchGlobal && matchLocal;
    }
  );

  if (!activeTk) {
    return (
      <div>
        <div className="section-header flex-between">
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Estimating</h2>
            <div className="section-sub">
              {takeoffs.length} takeoff{takeoffs.length !== 1 ? "s" : ""}
              {(() => {
                const withItems = takeoffs.filter(t => (t.rooms || []).some(r => (r.items || []).length > 0)).length;
                const totalValue = takeoffs.reduce((sum, t) => sum + calcSummary(t, assemblies).grandTotal, 0);
                return <>{withItems > 0 && <span style={{ marginLeft: 8 }}>{withItems} active</span>}{totalValue > 0 && <span style={{ marginLeft: 8 }}>Pipeline: {fmtK(totalValue)}</span>}</>;
              })()}
            </div>
          </div>
          <div className="flex gap-8">
            <input type="file" id="ost-import" accept=".csv,.txt" style={{ display: "none" }} onChange={handleOstFile} />
            <button className="btn btn-ghost" onClick={() => document.getElementById("ost-import").click()} style={{ fontSize: 13 }}>Import OST</button>
            <input type="file" id="scan-pdf" accept=".pdf" style={{ display: "none" }} onChange={handleScanPdf} />
            <button className="btn btn-ghost" onClick={() => document.getElementById("scan-pdf").click()} style={{ fontSize: 13 }}>Scan Bid PDF</button>
            <button className="btn btn-ghost" onClick={() => setShowQuickProposal(true)} style={{ fontSize: 13 }}>Quick Proposal</button>
            <button className="btn btn-primary" onClick={createTakeoff}>+ New Takeoff</button>
          </div>
        </div>

        {/* ── Search & Bid Browser ── */}
        <div style={{ marginBottom: 16 }}>
          <div className="flex gap-8" style={{ alignItems: "center", marginBottom: 8 }}>
            <input
              className="form-input"
              placeholder="Search takeoffs & bids by name, GC, phase, scope..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              style={{ flex: 1, maxWidth: 480 }}
            />
            <button
              className={`btn btn-sm ${showBidBrowser ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setShowBidBrowser(!showBidBrowser)}
            >
              {showBidBrowser ? "Hide Bids" : "Browse Bids"}
            </button>
          </div>

          {/* Bid browser / search results */}
          {(showBidBrowser || (localSearch && bidSearchResults.length > 0)) && (
            <div className="card" style={{ padding: 12, marginBottom: 12, maxHeight: 320, overflowY: "auto" }}>
              <div className="flex-between mb-8">
                <div className="text-sm font-semi">
                  {localSearch ? `${bidSearchResults.length} bid${bidSearchResults.length !== 1 ? "s" : ""} matching "${localSearch}"` : "Recent Bids"}
                </div>
                <div className="text-xs text-muted">Click a bid to create a new takeoff from it</div>
              </div>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Bid Name</th>
                    <th>GC</th>
                    <th>Phase</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th style={{ width: 120 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(localSearch ? bidSearchResults : bids.slice(0, 15)).map(b => {
                    const hasTakeoff = takeoffs.some(t => t.bidId === b.id);
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 500 }}>{b.name}</td>
                        <td style={{ color: "var(--text2)" }}>{b.gc || "—"}</td>
                        <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{b.phase || "—"}</span></td>
                        <td style={{ fontWeight: 600 }}>{b.value ? fmtK(b.value) : "—"}</td>
                        <td>
                          <span className={`badge ${b.status === "awarded" ? "badge-green" : b.status === "lost" ? "badge-red" : b.status === "submitted" ? "badge-blue" : "badge-amber"}`} style={{ fontSize: 10 }}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {hasTakeoff ? (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                              onClick={() => { const t = takeoffs.find(t => t.bidId === b.id); if (t) setActiveTk(t.id); }}>
                              Open Takeoff
                            </button>
                          ) : (
                            <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                              onClick={() => {
                                const tk = {
                                  id: crypto.randomUUID(),
                                  bidId: b.id,
                                  name: b.name,
                                  created: new Date().toISOString().slice(0, 10),
                                  wastePct: company.defaultWaste,
                                  taxRate: company.defaultTax,
                                  overheadPct: company.defaultOverhead,
                                  profitPct: company.defaultProfit,
                                  rooms: [],
                                  scopeChecklist: SCOPE_INIT.map(s => ({ ...s })),
                                  scopeChecklistCompleted: false,
                                  scopeLines: { includes: [], excludes: [], assumptions: [] },
                                  proposalNumber: "",
                                  proposalTerms: { ...DEFAULT_PROPOSAL_TERMS },
                                };
                                setTakeoffs(prev => [...prev, tk]);
                                setActiveTk(tk.id);
                                show(`Takeoff created for "${b.name}"`);
                              }}>
                              + Takeoff
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No takeoffs yet</div>
            <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>Create a takeoff from a bid, import from OST, or scan a bid PDF to get started.</div>
            <div className="flex gap-8" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={createTakeoff}>+ New Takeoff</button>
              <button className="btn btn-ghost" onClick={() => setShowBidBrowser(true)}>Browse Bids</button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map((tk) => {
            const s = calcSummary(tk, assemblies);
            const linkedBid = bids.find((b) => b.id === tk.bidId);
            const roomCount = (tk.rooms || []).length;
            const lineItemCount = (tk.rooms || []).reduce((sum, rm) => sum + (rm.items || []).length, 0);
            const hasDrawing = !!(tk.drawingState || tk.drawingFileName);
            const measCount = tk.drawingState ? Object.values(tk.drawingState.measurements || {}).flat().length : 0;
            const scopeDone = tk.scopeChecklistCompleted;
            // Completeness: rooms, line items, drawing, scope, value
            const hasRooms = roomCount > 0;
            const hasItems = lineItemCount > 0;
            const hasValue = s.grandTotal > 0;
            const completeness = [hasRooms, hasItems, hasDrawing, scopeDone, hasValue].filter(Boolean).length;
            return (
              <div
                key={tk.id}
                className="card"
                style={{ cursor: "pointer", borderLeft: `4px solid ${completeness >= 4 ? "var(--green)" : completeness >= 2 ? "var(--amber)" : "var(--border)"}` }}
                onClick={() => setActiveTk(tk.id)}
              >
                {/* Name + linked bid */}
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, lineHeight: 1.3 }}>{tk.name}</div>
                {linkedBid && (
                  <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>
                    <span className={`badge ${linkedBid.status === "awarded" ? "badge-green" : linkedBid.status === "submitted" ? "badge-blue" : "badge-amber"}`} style={{ fontSize: 9, marginRight: 4 }}>{linkedBid.status}</span>
                    {linkedBid.gc}
                  </div>
                )}
                {!linkedBid && <div style={{ fontSize: 11, color: "var(--text3)", fontStyle: "italic", marginBottom: 4 }}>No linked bid</div>}

                {/* Stats row */}
                <div className="flex gap-8" style={{ fontSize: 11, color: "var(--text2)", marginTop: 6, flexWrap: "wrap" }}>
                  <span>{roomCount} area{roomCount !== 1 ? "s" : ""}</span>
                  <span>{lineItemCount} item{lineItemCount !== 1 ? "s" : ""}</span>
                  {hasDrawing && <span style={{ color: "var(--green)" }}>Drawing{measCount > 0 ? ` (${measCount})` : ""}</span>}
                  {!hasDrawing && <span style={{ color: "var(--text3)" }}>No drawing</span>}
                  {scopeDone && <span style={{ color: "var(--green)" }}>Scope reviewed</span>}
                </div>

                {/* Value + completion bar */}
                <div className="flex-between" style={{ marginTop: 8, alignItems: "center" }}>
                  {hasValue ? (
                    <span style={{ fontWeight: 700, fontSize: 16, color: "var(--amber)" }}>{fmtK(s.grandTotal)}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>No estimate yet</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--text2)" }}>{tk.created}</span>
                </div>

                {/* Completeness bar */}
                <div style={{ marginTop: 6, display: "flex", gap: 3, alignItems: "center" }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < completeness ? "var(--green)" : "var(--border)" }} />
                  ))}
                  <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 4 }}>{completeness}/5</span>
                </div>

                {/* Actions */}
                <div className="flex-between" style={{ marginTop: 6 }}>
                  <span className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" title="Clone" onClick={e => { e.stopPropagation(); cloneTakeoff(tk.id); }} style={{ fontSize: 10, padding: "2px 6px" }}>Clone</button>
                    <button className="btn btn-ghost btn-sm" title="Delete" onClick={e => { e.stopPropagation(); if (confirm(`Delete takeoff "${tk.name}"?`)) setTakeoffs(prev => prev.filter(t => t.id !== tk.id)); }} style={{ fontSize: 10, padding: "2px 6px", color: "var(--red)" }}>Delete</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ SCAN BID PDF MODAL ═══ */}
        {scanModal && (
          <div className="modal-overlay" onClick={() => !scanLoading && setScanModal(false)}>
            <div className="modal-content" style={{ maxWidth: 800, maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Scan Bid PDF</h3>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                    Extract bid data from an old proposal PDF and re-estimate with current assemblies
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => setScanModal(false)} disabled={scanLoading}>✕</button>
              </div>

              {scanLoading && (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 32, animation: "spin 1s linear infinite", display: "inline-block" }}>&#8635;</div>
                  <div style={{ marginTop: 12, color: "var(--text2)" }}>Extracting text from PDF...</div>
                </div>
              )}

              {scanResult && (
                <div>
                  {/* Extracted bid info */}
                  <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                    <div className="text-sm font-semi mb-12" style={{ color: "var(--primary)" }}>Extracted Bid Data</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="form-group">
                        <label className="form-label">Project Name</label>
                        <input className="form-input" value={scanResult.name || ""} onChange={e => setScanResult(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">GC</label>
                        <input className="form-input" value={scanResult.gc || ""} onChange={e => setScanResult(prev => ({ ...prev, gc: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bid Date</label>
                        <input className="form-input" value={scanResult.bidDate || ""} onChange={e => setScanResult(prev => ({ ...prev, bidDate: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total Value</label>
                        <input className="form-input" value={scanResult.value || 0} type="number"
                          onChange={e => setScanResult(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phase</label>
                        <input className="form-input" value={scanResult.phase || ""} onChange={e => setScanResult(prev => ({ ...prev, phase: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address</label>
                        <input className="form-input" value={scanResult.address || ""} onChange={e => setScanResult(prev => ({ ...prev, address: e.target.value }))} />
                      </div>
                    </div>
                    {scanResult.scope?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span className="text-xs text-muted">Scope: </span>
                        {scanResult.scope.map((s, i) => (
                          <span key={i} className="badge badge-blue" style={{ fontSize: 10, marginRight: 4 }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extracted line items */}
                  {scanResult.lineItems?.length > 0 && (
                    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                      <div className="text-sm font-semi mb-8">Line Items ({scanResult.lineItems.length})</div>
                      <table className="data-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr><th>Item</th><th style={{ textAlign: "right" }}>Amount</th></tr>
                        </thead>
                        <tbody>
                          {scanResult.lineItems.map((li, i) => (
                            <tr key={i}>
                              <td>{li.label}</td>
                              <td style={{ textAlign: "right", fontWeight: 600 }}>${li.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                            <td>Total</td>
                            <td style={{ textAlign: "right", color: "var(--amber)" }}>
                              ${(scanResult.value || scanResult.lineItems.reduce((s, li) => s + li.amount, 0)).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Alternates */}
                  {scanResult.alternates?.length > 0 && (
                    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                      <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>Alternates ({scanResult.alternates.length})</div>
                      <table className="data-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr><th>Description</th><th style={{ width: 80 }}>Type</th><th style={{ textAlign: "right", width: 100 }}>Amount</th><th style={{ width: 32 }}></th></tr>
                        </thead>
                        <tbody>
                          {scanResult.alternates.map((alt, i) => (
                            <tr key={alt.id || i}>
                              <td>
                                <input className="form-input" value={alt.description} style={{ fontSize: 12, padding: "2px 6px" }}
                                  onChange={e => setScanResult(prev => {
                                    const updated = [...prev.alternates];
                                    updated[i] = { ...updated[i], description: e.target.value };
                                    return { ...prev, alternates: updated };
                                  })} />
                              </td>
                              <td>
                                <select className="form-input" value={alt.type} style={{ fontSize: 12, padding: "2px 4px" }}
                                  onChange={e => setScanResult(prev => {
                                    const updated = [...prev.alternates];
                                    updated[i] = { ...updated[i], type: e.target.value };
                                    return { ...prev, alternates: updated };
                                  })}>
                                  <option value="add">ADD</option>
                                  <option value="deduct">DEDUCT</option>
                                </select>
                              </td>
                              <td>
                                <input className="form-input" type="number" value={alt.amount} style={{ fontSize: 12, padding: "2px 6px", textAlign: "right" }}
                                  onChange={e => setScanResult(prev => {
                                    const updated = [...prev.alternates];
                                    updated[i] = { ...updated[i], amount: parseFloat(e.target.value) || 0 };
                                    return { ...prev, alternates: updated };
                                  })} />
                              </td>
                              <td>
                                <button className="btn btn-ghost" style={{ padding: 0, fontSize: 14, color: "var(--red)" }}
                                  onClick={() => setScanResult(prev => ({
                                    ...prev,
                                    alternates: prev.alternates.filter((_, j) => j !== i)
                                  }))}>&#10005;</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Includes / Excludes */}
                  {(scanResult.includes?.length > 0 || scanResult.excludes?.length > 0) && (
                    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {scanResult.includes?.length > 0 && (
                          <div>
                            <div className="text-sm font-semi mb-8" style={{ color: "var(--green)" }}>Includes</div>
                            {scanResult.includes.map((item, i) => (
                              <div key={i} style={{ fontSize: 12, padding: "3px 0", color: "var(--text2)" }}>{i + 1}. {item}</div>
                            ))}
                          </div>
                        )}
                        {scanResult.excludes?.length > 0 && (
                          <div>
                            <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>Excludes</div>
                            {scanResult.excludes.map((item, i) => (
                              <div key={i} style={{ fontSize: 12, padding: "3px 0", color: "var(--text2)" }}>{i + 1}. {item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-8" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button className="btn btn-ghost" onClick={() => setScanModal(false)}>Cancel</button>
                    <button className="btn btn-ghost" onClick={() => {
                      const bidId = createBidFromScan();
                      show("Bid added — you can create a takeoff from the bid browser", "ok");
                      setScanModal(false);
                    }}>
                      Add to Bid Pipeline Only
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                      const bidId = createBidFromScan();
                      createTakeoffFromScan(bidId);
                    }}>
                      Add Bid + Create Takeoff
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ OST IMPORT MODAL ═══ */}
        {ostModal && (
          <div className="modal-overlay" onClick={() => setOstModal(false)}>
            <div className="modal-content" style={{ maxWidth: 900, maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Import from OST</h3>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Map your OST conditions to EBC assemblies for pricing</div>
                </div>
                <button className="btn btn-ghost" onClick={() => setOstModal(false)}>✕</button>
              </div>

              {/* Takeoff name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>Takeoff Name</label>
                <input className="form-input" value={ostName} onChange={e => setOstName(e.target.value)} style={{ width: "100%" }} />
              </div>

              {/* Column mapping info */}
              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, padding: "8px 12px", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
                Detected columns: {ostHeaders.length} · Data rows: {ostRows.length} · Auto-matched: {ostItemMappings.filter(m => m.assemblyCode).length} items
              </div>

              {/* Import table */}
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>Use</th>
                      <th>OST Condition</th>
                      <th style={{ width: 80 }}>Qty</th>
                      <th style={{ width: 50 }}>Unit</th>
                      <th>Page/Room</th>
                      <th style={{ width: 180 }}>EBC Assembly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ostItemMappings.map((m, i) => (
                      <tr key={i} style={{ opacity: m.include ? 1 : 0.4 }}>
                        <td>
                          <input type="checkbox" checked={m.include} onChange={e => {
                            setOstItemMappings(prev => prev.map((p, j) => j === i ? { ...p, include: e.target.checked } : p));
                          }} />
                        </td>
                        <td style={{ fontWeight: 500 }}>{m.condName || <span style={{ color: "var(--text3)" }}>—</span>}</td>
                        <td>
                          <input className="form-input" type="number" value={m.qty} style={{ width: 70, fontSize: 12, padding: "2px 4px" }} onChange={e => {
                            setOstItemMappings(prev => prev.map((p, j) => j === i ? { ...p, qty: parseFloat(e.target.value) || 0 } : p));
                          }} />
                        </td>
                        <td style={{ color: "var(--text3)" }}>{m.unit}</td>
                        <td style={{ fontSize: 11, color: "var(--text3)" }}>{m.page || "—"}</td>
                        <td>
                          <select className="form-input" value={m.assemblyCode} style={{ fontSize: 12, padding: "2px 4px", width: "100%" }} onChange={e => {
                            const code = e.target.value;
                            const asm = assemblies.find(a => a.code === code);
                            setOstItemMappings(prev => prev.map((p, j) => j === i ? { ...p, assemblyCode: code, unit: asm?.unit || p.unit } : p));
                          }}>
                            <option value="">— Skip —</option>
                            {assemblies.map(a => (
                              <option key={a.code} value={a.code}>{a.code} — {a.name} ({a.unit})</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary & actions */}
              <div className="flex-between">
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  {ostItemMappings.filter(m => m.include && m.assemblyCode).length} items ready to import
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-ghost" onClick={() => setOstModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={importOstTakeoff} disabled={ostItemMappings.filter(m => m.include && m.assemblyCode).length === 0}>
                    Import & Price
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Proposal Modal (list view) ── */}
        {showQuickProposal && (
          <QuickProposalModal
            bids={bids}
            show={show}
            onClose={() => setShowQuickProposal(false)}
          />
        )}
      </div>
    );
  }

  /* ── render: detail view ─────────────────────────────────── */

  const tk = takeoffs.find((t) => t.id === activeTk);
  if (!tk) {
    setActiveTk(null);
    return null;
  }

  const summary = calcSummary(tk, assemblies);
  const linkedBid = bids.find((b) => b.id === tk.bidId);

  return (
    <div>
      {/* Drawing Viewer overlay */}
      {showDrawing && (drawingPdfData || tk.drawingState?.pdfFileNames?.length > 0) && (
        <DrawingViewer
          pdfData={drawingPdfData || null}
          fileName={drawingFileName}
          assemblies={assemblies}
          takeoffId={tk.id}
          initialTakeoffState={tk.drawingState || null}
          onTakeoffStateChange={(state) => {
            updateTakeoff(tk.id, (prev) => ({ ...prev, drawingState: state }));
          }}
          onClose={() => setShowDrawing(false)}
          onAddToTakeoff={({ code, qty, unit, label }) => {
            const targetRoom = (tk.rooms || [])[0];
            if (!targetRoom) {
              show("Add a room first", "err");
              return;
            }
            updateTakeoff(tk.id, (prev) => ({
              ...prev,
              rooms: prev.rooms.map(rm => rm.id === targetRoom.id ? {
                ...rm,
                items: [...rm.items, {
                  id: "dv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                  code,
                  desc: label || assemblies.find(a => a.code === code)?.name || code,
                  qty,
                  unit,
                  height: 10,
                  diff: 1,
                }]
              } : rm)
            }));
            show(`Added ${qty} ${unit} of ${code}`, "ok");
          }}
        />
      )}

      {/* back + header */}
      <div className="section-header flex-between">
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTk(null)}>&larr; Back</button>
          <EditableText
            value={tk.name}
            onChange={(v) => updateTakeoff(tk.id, { name: v })}
            style={{ fontSize: 18, fontWeight: 700 }}
          />
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => openDrawing(tk.id, tk.drawingState)}>
            {drawingPdfData || tk.drawingState?.pdfFileNames?.length > 0 ? "Open Drawing" : "Upload Drawing"}
          </button>
          {tk.drawingState && (
            <button className="btn btn-ghost btn-sm" style={{ color: "#10b981" }} onClick={() => openDrawing(tk.id, tk.drawingState)}>
              Resume Takeoff ({Object.values(tk.drawingState.measurements || {}).flat().length} meas)
            </button>
          )}
          <input
            ref={drawingFileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const pdfBytes = new Uint8Array(ev.target.result);
                setDrawingPdfData(pdfBytes);
                setDrawingFileName(file.name);
                updateTakeoff(tk.id, { drawingFileName: file.name });
                setShowDrawing(true);
                // Upload to Supabase Storage in background (cloud persistence)
                uploadTakeoffPdf(tk.id, pdfBytes, file.name, 0).catch(() => {});
              };
              reader.readAsArrayBuffer(file);
              e.target.value = "";
            }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => runHistComparison(tk)} disabled={histLoading}>
            {histLoading ? "Comparing..." : "Compare to History"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => copyProposal(tk)}>Copy Proposal</button>
          <button className="btn btn-sm" style={{ background: "var(--gold)", color: "#fff" }} onClick={() => {
            setScopeModalTkId(tk.id);
            setScopeModalStep(tk.scopeChecklistCompleted ? 2 : 1);
          }}>Export PDF</button>
        </div>
      </div>

      {/* bid link + date */}
      <div className="flex gap-8" style={{ marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "var(--text2)" }}>Bid:</label>
        <select
          className="form-select"
          style={{ maxWidth: 280 }}
          value={tk.bidId || ""}
          onChange={(e) => updateTakeoff(tk.id, { bidId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">-- None --</option>
          {bids.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: "var(--text2)", marginLeft: 8 }}>Created: {tk.created}</span>
      </div>

      {/* markup settings */}
      <div className="flex gap-8" style={{ marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { label: "Waste %", key: "wastePct" },
          { label: "Tax %", key: "taxRate" },
          { label: "Overhead %", key: "overheadPct" },
          { label: "Profit %", key: "profitPct" },
        ].map(({ label, key }) => (
          <div key={key} className="flex gap-8" style={{ alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>{label}</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              style={{ width: 72 }}
              value={tk[key]}
              onChange={(e) => updateTakeoff(tk.id, { [key]: parseFloat(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>

      {/* ── Default Markups (company-wide defaults for new takeoffs) ── */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--text2)", fontWeight: 600 }}>Default Markups (for new takeoffs)</summary>
        <div className="card mt-8" style={{ padding: 12 }}>
          <div className="form-grid" style={{ gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Tax Rate (%)</label>
              <input className="form-input" type="number" step="0.01" value={company.defaultTax}
                onChange={e => app.setCompany(c => ({ ...c, defaultTax: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Waste (%)</label>
              <input className="form-input" type="number" step="0.01" value={company.defaultWaste}
                onChange={e => app.setCompany(c => ({ ...c, defaultWaste: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Overhead (%)</label>
              <input className="form-input" type="number" step="0.01" value={company.defaultOverhead}
                onChange={e => app.setCompany(c => ({ ...c, defaultOverhead: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Profit (%)</label>
              <input className="form-input" type="number" step="0.01" value={company.defaultProfit}
                onChange={e => app.setCompany(c => ({ ...c, defaultProfit: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </details>

      {/* ── Gap Analysis (standalone) ── */}
      <div style={{ marginBottom: 16 }}>
        <button
          className={`btn ${showScopePanel ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setShowScopePanel(!showScopePanel)}
        >
          {showScopePanel ? "Hide Gap Analysis" : "AI Gap Analysis"}
        </button>
      </div>

      {showScopePanel && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="flex-between mb-12">
            <div className="section-title" style={{ fontSize: 16 }}>AI Gap Analysis</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowScopePanel(false)}>Close</button>
          </div>
          <div>
            <div className="text-sm font-semi mb-8">Paste your bid scope and contract/spec scope below. AI will identify gaps, extras, and risks.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Bid Scope (what EBC priced)</label>
                <textarea className="form-input" rows={6} placeholder="Paste your bid scope, line items, or proposal scope description..."
                  value={gapBidScope} onChange={e => setGapBidScope(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }} />
                <div className="text-xs text-dim mt-4">{gapBidScope.length} chars</div>
              </div>
              <div className="form-group">
                <label className="form-label">Contract Scope (specs / drawings notes)</label>
                <textarea className="form-input" rows={6} placeholder="Paste contract scope, spec sections, or drawing notes..."
                  value={gapContractScope} onChange={e => setGapContractScope(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }} />
                <div className="text-xs text-dim mt-4">{gapContractScope.length} chars</div>
              </div>
            </div>
            <button className="btn btn-primary mt-12" onClick={runGapCheck} disabled={gapLoading}>
              {gapLoading ? "Analyzing..." : "Run Gap Analysis"}
            </button>

            {gapResult && (
              <div style={{ marginTop: 16 }}>
                <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="flex-between mb-8">
                    <div className="text-sm font-semi">Coverage Score</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: gapResult.score >= 80 ? "var(--green)" : gapResult.score >= 50 ? "var(--amber)" : "var(--red)" }}>
                      {gapResult.score}/100
                    </div>
                  </div>
                  <div className="text-sm text-muted">{gapResult.summary}</div>
                </div>

                {gapResult.gaps?.length > 0 && (
                  <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                    <div className="text-sm font-semi mb-8" style={{ color: "var(--red)" }}>Missing from Bid ({gapResult.gaps.length})</div>
                    {gapResult.gaps.map((g, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div className="flex-between">
                          <span className="text-sm font-semi">{g.item}</span>
                          <span className={`badge ${SEV_BADGE[g.severity] || "badge-muted"}`}>{g.severity}</span>
                        </div>
                        <div className="text-xs text-muted mt-4">{g.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {gapResult.extras?.length > 0 && (
                  <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                    <div className="text-sm font-semi mb-8" style={{ color: "var(--amber)" }}>In Bid but Not in Contract ({gapResult.extras.length})</div>
                    {gapResult.extras.map((g, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <span className="text-sm font-semi">{g.item}</span>
                        <div className="text-xs text-muted mt-4">{g.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {gapResult.risks?.length > 0 && (
                  <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                    <div className="text-sm font-semi mb-8" style={{ color: "var(--blue)" }}>Risks & Ambiguities ({gapResult.risks.length})</div>
                    {gapResult.risks.map((g, i) => (
                      <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                        <div className="flex-between">
                          <span className="text-sm font-semi">{g.item}</span>
                          <span className={`badge ${SEV_BADGE[g.severity] || "badge-muted"}`}>{g.severity}</span>
                        </div>
                        <div className="text-xs text-muted mt-4">{g.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* rooms accordion */}
      <div className="takeoff-rooms">
        {(tk.rooms || []).map((rm) => {
          const isOpen = !!openRooms[rm.id];
          const roomTotals = calcRoom(rm, assemblies);
          return (
            <div key={rm.id} className="takeoff-room">
              <RoomHeader
                rm={rm}
                isOpen={isOpen}
                roomTotal={roomTotals.total}
                onToggle={() => toggleRoom(rm.id)}
                onUpdateRoom={(patch) => updateRoom(tk.id, rm.id, patch)}
                onDelete={() => deleteRoom(tk.id, rm.id)}
                fmt={fmt}
              />
              {isOpen && (
                <div className="room-body">
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table" style={{ width: "100%", fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Assembly</th>
                          <th style={{ width: 64 }}>Qty</th>
                          <th style={{ width: 44 }}>Unit</th>
                          <th style={{ width: 56 }}>Height</th>
                          <th style={{ width: 48 }}>HF</th>
                          <th style={{ width: 56 }}>Diff</th>
                          <th style={{ textAlign: "right" }}>Mat Rate</th>
                          <th style={{ textAlign: "right" }}>Lab Rate</th>
                          <th style={{ textAlign: "right" }}>Mat Total</th>
                          <th style={{ textAlign: "right" }}>Lab Total</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                          <th style={{ width: 36 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rm.items || []).map((item) => {
                          const c = calcItem(item, assemblies);
                          const asm = assemblies.find((a) => a.code === item.code);
                          const hf = getHF(item.height || 10);
                          const isEditing = editingItem === item.id;

                          return (
                            <tr key={item.id} onClick={() => setEditingItem(item.id)} style={{ cursor: "pointer" }}>
                              <td>
                                {isEditing ? (
                                  <select
                                    className="form-select"
                                    value={item.code}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleAssemblyChange(tk.id, rm.id, item.id, e.target.value)}
                                    style={{ fontSize: 12, maxWidth: 220 }}
                                  >
                                    {assemblies.map((a) => (
                                      <option key={a.code} value={a.code}>
                                        {a.code} - {a.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                    <span className={asm?.verified ? "badge-green" : "badge-amber"} style={{ marginRight: 4, fontSize: 10 }}>
                                      {item.code}
                                    </span>
                                    {item.desc}
                                    {getSubmittalsForCode(item.code).length > 0 && (
                                      <span
                                        className="sub-linked-badge"
                                        title={getSubmittalsForCode(item.code).map(s => `${s.number}: ${s.desc} (${s.status})`).join("\n")}
                                      >
                                        {getSubmittalsForCode(item.code).length} SUB
                                      </span>
                                    )}
                                  </span>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={item.qty}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateLineItem(tk.id, rm.id, item.id, { qty: parseFloat(e.target.value) || 0 })}
                                    style={{ width: 60 }}
                                  />
                                ) : (
                                  item.qty
                                )}
                              </td>
                              <td>{item.unit}</td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    value={item.height}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateLineItem(tk.id, rm.id, item.id, { height: parseFloat(e.target.value) || 10 })}
                                    style={{ width: 52 }}
                                  />
                                ) : (
                                  item.height
                                )}
                              </td>
                              <td title={hf.l + " \u2014 " + hf.c} style={{ color: hf.f > 1 ? "var(--amber)" : "var(--text2)" }}>
                                {hf.f.toFixed(2)}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    value={item.diff}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateLineItem(tk.id, rm.id, item.id, { diff: parseFloat(e.target.value) || 1 })}
                                    style={{ width: 52 }}
                                  />
                                ) : (
                                  item.diff.toFixed(2)
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>{fmt(asm?.matRate || 0)}</td>
                              <td style={{ textAlign: "right" }}>{fmt(asm?.labRate || 0)}</td>
                              <td style={{ textAlign: "right" }}>{fmt(c.mat)}</td>
                              <td style={{ textAlign: "right" }}>{fmt(c.lab)}</td>
                              <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(c.total)}</td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: "2px 6px", fontSize: 11 }}
                                  onClick={(e) => { e.stopPropagation(); deleteLineItem(tk.id, rm.id, item.id); }}
                                  title="Delete line item"
                                >
                                  X
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {(rm.items || []).length === 0 && (
                          <tr>
                            <td colSpan={12} style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>
                              No line items. Click "Add Item" to begin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => addLineItem(tk.id, rm.id)}>+ Add Item</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => addRoom(tk.id)}>+ Add Area</button>
        {(tk.rooms || []).length === 0 && (
          <span style={{ fontSize: 12, color: "var(--text3)", alignSelf: "center" }}>Add areas (floors, zones, rooms) to start building your estimate</span>
        )}
      </div>

      {/* bid summary — only show when there's actual data */}
      {summary.grandTotal > 0 ? (
        <div className="takeoff-summary" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>Bid Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div className="summary-row"><span>Materials</span><span>{fmt(summary.matSub)}</span></div>
            <div className="summary-row"><span>Labor</span><span>{fmt(summary.labSub)}</span></div>
          </div>
          <div className="summary-row" style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 4 }}>
            <span>Subtotal</span><span>{fmt(summary.subtotal)}</span>
          </div>
          <div className="summary-row"><span>Waste ({tk.wastePct}%)</span><span>{fmt(summary.wasteAmt)}</span></div>
          <div className="summary-row"><span>Tax on Materials ({tk.taxRate}%)</span><span>{fmt(summary.taxAmt)}</span></div>
          <div className="summary-row"><span>Overhead ({tk.overheadPct}%)</span><span>{fmt(summary.overheadAmt)}</span></div>
          <div className="summary-row"><span>Profit ({tk.profitPct}%)</span><span>{fmt(summary.profitAmt)}</span></div>
          <div className="summary-row total"><span>GRAND TOTAL</span><span>{fmt(summary.grandTotal)}</span></div>
        </div>
      ) : (tk.rooms || []).length > 0 ? (
        <div style={{ marginTop: 24, padding: "12px 16px", borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text2)" }}>
          Add line items to your areas to see the bid summary. Totals appear here automatically.
        </div>
      ) : null}

      {/* Historical Comparison Panel */}
      {showHist && (
        <div className="takeoff-summary" style={{ marginTop: 16 }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15 }}>Historical Comparison</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowHist(false); setHistResult(null); }}>Close</button>
          </div>
          {histLoading && <div className="text-sm text-muted" style={{ padding: 16, textAlign: "center" }}>Analyzing against {projects.length} historical projects...</div>}
          {histResult && (
            <div>
              {/* Summary */}
              <div style={{ padding: 12, marginBottom: 12, background: "var(--card)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div className="text-sm">{histResult.summary}</div>
              </div>

              {/* Margin Forecast */}
              {histResult.marginForecast && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div className="card" style={{ padding: 10, textAlign: "center" }}>
                    <div className="text-xs text-muted">Pessimistic</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)" }}>{histResult.marginForecast.pessimistic}%</div>
                  </div>
                  <div className="card" style={{ padding: 10, textAlign: "center" }}>
                    <div className="text-xs text-muted">Expected</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--amber)" }}>{histResult.marginForecast.expected}%</div>
                  </div>
                  <div className="card" style={{ padding: 10, textAlign: "center" }}>
                    <div className="text-xs text-muted">Optimistic</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{histResult.marginForecast.optimistic}%</div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {histResult.laborWarning && (
                <div style={{ padding: 10, marginBottom: 8, borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", fontSize: 13 }}>
                  <strong>Labor:</strong> {histResult.laborWarning}
                </div>
              )}
              {histResult.materialWarning && (
                <div style={{ padding: 10, marginBottom: 8, borderRadius: 6, background: "rgba(245,158,11,0.1)", border: "1px solid var(--amber)", fontSize: 13 }}>
                  <strong>Material:</strong> {histResult.materialWarning}
                </div>
              )}

              {/* Similar Projects */}
              {histResult.similarProjects?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div className="text-sm font-semi mb-8">Similar Past Projects</div>
                  {histResult.similarProjects.map((sp, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="flex-between">
                        <span className="font-semi">{sp.name}</span>
                        <span style={{ color: "var(--amber)", fontWeight: 600 }}>{sp.similarity}% match</span>
                      </div>
                      <div className="text-xs text-muted mt-4">{sp.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Insights */}
              {histResult.insights?.length > 0 && (
                <div>
                  <div className="text-sm font-semi mb-8">Insights</div>
                  {histResult.insights.map((ins, i) => (
                    <div key={i} style={{ padding: 8, marginBottom: 6, borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", fontSize: 13 }}>
                      <div className="font-semi" style={{ color: "var(--blue)" }}>{ins.category}</div>
                      <div className="mt-4">{ins.finding}</div>
                      <div className="text-xs text-muted mt-4">{ins.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF options: tax breakout */}
      <div className="takeoff-summary" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12, fontSize: 15 }}>Proposal PDF Options</h3>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={tk.showTaxBreakout || false}
            onChange={(e) => updateTakeoff(tk.id, { showTaxBreakout: e.target.checked })}
          />
          Break out tax on materials separately on proposal
        </label>
      </div>

      {/* ── Auto-Profit Suggestions ── */}
      {(() => {
        const allItems = (tk.rooms || []).flatMap(rm => rm.items || []);
        if (allItems.length === 0) return null;
        const wallLF = allItems.filter(it => {
          const asm = assemblies.find(a => a.code === it.code);
          return asm && asm.unit === "LF";
        }).reduce((s, it) => s + (it.qty || 0), 0);
        const totalSF = allItems.filter(it => {
          const asm = assemblies.find(a => a.code === it.code);
          return asm && asm.unit === "SF";
        }).reduce((s, it) => s + (it.qty || 0), 0);
        const subtotal = summary.subtotal;
        const existingCodes = new Set(allItems.map(it => it.code));
        const addOnCodes = new Set((tk.addOns || []).map(ao => ao.code));

        return (
          <div className="takeoff-summary" style={{ marginTop: 16, border: "1px dashed var(--amber-dim)", background: "rgba(224,148,34,0.03)" }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, color: "var(--amber)" }}>$ Profit Suggestions</h3>
              <span className="text-xs text-muted">Commonly forgotten add-ons</span>
            </div>
            {PROFIT_SUGGESTIONS.map(sg => {
              const alreadyIn = existingCodes.has(sg.code) || addOnCodes.has(sg.code);
              let autoQty = 0;
              if (sg.basis === "wallLF") autoQty = sg.pct ? Math.round(wallLF * sg.pct) : sg.divisor ? Math.round(wallLF / sg.divisor) : 0;
              else if (sg.basis === "totalSF") autoQty = Math.round(totalSF * (sg.pct || 0));
              else if (sg.basis === "subtotal") autoQty = Math.round(subtotal * (sg.pct || 0));
              const estCost = sg.basis === "subtotal"
                ? autoQty
                : autoQty * (sg.matRate + sg.labRate);
              return (
                <div key={sg.code} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 6,
                  borderRadius: 6, background: alreadyIn ? "var(--bg3)" : "var(--card)",
                  border: "1px solid var(--border)", opacity: alreadyIn ? 0.5 : 1,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sg.name} <span className="text-xs text-muted">({sg.code})</span></div>
                    <div className="text-xs text-muted">{sg.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 80 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>{fmt(estCost)}</div>
                    <div className="text-xs text-muted">{sg.basis === "subtotal" ? "lump sum" : `${autoQty} ${sg.unit}`}</div>
                  </div>
                  {alreadyIn ? (
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>Added</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: "var(--amber)", borderColor: "var(--amber-dim)" }}
                      onClick={() => {
                        if (sg.basis === "subtotal") {
                          updateTakeoff(tk.id, (prev) => ({
                            ...prev,
                            addOns: [...(prev.addOns || []), { id: "ao_" + Date.now(), code: sg.code, description: `${sg.name} (${(sg.pct * 100)}%)`, amount: autoQty }]
                          }));
                        } else {
                          const targetRoom = (tk.rooms || [])[0];
                          if (!targetRoom) return;
                          updateTakeoff(tk.id, (prev) => ({
                            ...prev,
                            rooms: prev.rooms.map(rm => rm.id === targetRoom.id ? {
                              ...rm,
                              items: [...rm.items, { id: "sg_" + Date.now(), code: sg.code, desc: sg.name, qty: autoQty, unit: sg.unit, height: 10, diff: 1 }]
                            } : rm)
                          }));
                        }
                        show(`Added ${sg.name}`, "ok");
                      }}
                    >+ Add</button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* alternates */}
      <div className="takeoff-summary" style={{ marginTop: 16 }}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15 }}>Alternates</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => updateTakeoff(tk.id, (prev) => ({
            ...prev,
            alternates: [...(prev.alternates || []), { id: "alt_" + Date.now(), description: "", amount: 0, type: "add" }]
          }))}>+ Add Alternate</button>
        </div>
        {(tk.alternates || []).length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text3)" }}>No alternates. These appear as separate pricing options on the proposal.</p>
        )}
        {(tk.alternates || []).map((alt, i) => (
          <div key={alt.id} className="flex gap-8" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 80 }}>Alt {i + 1}:</span>
            <select
              className="form-select"
              value={alt.type}
              style={{ width: 90, fontSize: 12 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                alternates: prev.alternates.map(a => a.id === alt.id ? { ...a, type: e.target.value } : a)
              }))}
            >
              <option value="add">Add</option>
              <option value="deduct">Deduct</option>
            </select>
            <input
              className="form-input"
              placeholder="Description"
              value={alt.description}
              style={{ flex: 1, minWidth: 180, fontSize: 12 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                alternates: prev.alternates.map(a => a.id === alt.id ? { ...a, description: e.target.value } : a)
              }))}
            />
            <input
              className="form-input"
              type="number"
              placeholder="Amount"
              value={alt.amount}
              style={{ width: 100, fontSize: 12 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                alternates: prev.alternates.map(a => a.id === alt.id ? { ...a, amount: parseFloat(e.target.value) || 0 } : a)
              }))}
            />
            <button
              className="btn btn-danger btn-sm"
              style={{ padding: "2px 8px", fontSize: 11 }}
              onClick={() => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                alternates: prev.alternates.filter(a => a.id !== alt.id)
              }))}
            >X</button>
          </div>
        ))}
      </div>

      {/* add-ons */}
      <div className="takeoff-summary" style={{ marginTop: 16 }}>
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15 }}>Add-Ons (Optional Scope)</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => updateTakeoff(tk.id, (prev) => ({
            ...prev,
            addOns: [...(prev.addOns || []), { id: "ao_" + Date.now(), description: "", amount: 0 }]
          }))}>+ Add Add-On</button>
        </div>
        {(tk.addOns || []).length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text3)" }}>No add-ons. These appear as optional extras the client can choose to include.</p>
        )}
        {(tk.addOns || []).map((ao, i) => (
          <div key={ao.id} className="flex gap-8" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 80 }}>Add-On {i + 1}:</span>
            <input
              className="form-input"
              placeholder="Description"
              value={ao.description}
              style={{ flex: 1, minWidth: 180, fontSize: 12 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                addOns: prev.addOns.map(a => a.id === ao.id ? { ...a, description: e.target.value } : a)
              }))}
            />
            <input
              className="form-input"
              type="number"
              placeholder="Amount"
              value={ao.amount}
              style={{ width: 100, fontSize: 12 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                addOns: prev.addOns.map(a => a.id === ao.id ? { ...a, amount: parseFloat(e.target.value) || 0 } : a)
              }))}
            />
            <button
              className="btn btn-danger btn-sm"
              style={{ padding: "2px 8px", fontSize: 11 }}
              onClick={() => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                addOns: prev.addOns.filter(a => a.id !== ao.id)
              }))}
            >X</button>
          </div>
        ))}
      </div>

      {/* submittal coverage */}
      {(() => {
        const allCodes = new Set();
        const coveredCodes = new Set();
        (tk.rooms || []).forEach(rm => (rm.items || []).forEach(it => {
          allCodes.add(it.code);
          if (getSubmittalsForCode(it.code).length > 0) coveredCodes.add(it.code);
        }));
        const total = allCodes.size;
        const covered = coveredCodes.size;
        const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
        const uncovered = [...allCodes].filter(c => !coveredCodes.has(c));
        if (total === 0) return null;
        return (
          <div className="takeoff-summary" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 15 }}>Submittal Coverage</h3>
            <div className="summary-row">
              <span>Assembly codes with submittals</span>
              <span>{covered} / {total} ({pct}%)</span>
            </div>
            <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "var(--bg4)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: pct === 100 ? "var(--green)" : "var(--amber)", transition: "width 0.3s" }} />
            </div>
            {uncovered.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text3)" }}>
                Missing: {uncovered.map(c => (
                  <span key={c} className="badge-amber" style={{ marginRight: 4, fontSize: 10 }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ SCOPE REVIEW MODAL ═══ */}
      {scopeModalTkId === tk.id && (
        <ScopeReviewModal
          tk={tk}
          bid={linkedBid}
          step={scopeModalStep}
          setStep={setScopeModalStep}
          onClose={() => setScopeModalTkId(null)}
          onSave={async (updatedFields) => {
            updateTakeoff(tk.id, updatedFields);
            setScopeModalTkId(null);
            // Generate PDF
            const mergedTk = { ...tk, ...updatedFields };
            const bid = bids.find(b => b.id === mergedTk.bidId);
            const fileName = await generateProposalPdf({
              takeoff: mergedTk,
              bid,
              company,
              assemblies,
              submittals,
              calcItem,
              calcRoom,
              calcSummary,
              scopeLines: updatedFields.scopeLines,
              proposalTerms: updatedFields.proposalTerms,
              proposalNumber: updatedFields.proposalNumber,
            });
            show(`PDF exported: ${fileName}`, "ok");
          }}
          updateTakeoff={updateTakeoff}
          assemblies={assemblies}
          company={company}
          submittals={submittals}
          calcItem={calcItem}
          calcRoom={calcRoom}
          calcSummary={calcSummary}
          bids={bids}
          show={show}
        />
      )}

      {/* ── Quick Proposal Modal ── */}
      {showQuickProposal && (
        <QuickProposalModal
          bids={bids}
          show={show}
          onClose={() => setShowQuickProposal(false)}
        />
      )}
    </div>
  );
}

/* ── sub-components ──────────────────────────────────────────── */

/* ── Scope Review Modal (2-step: checklist → edit scope lines) ── */
function ScopeReviewModal({ tk, bid, step, setStep, onClose, onSave, updateTakeoff, show }) {
  const checklist = tk.scopeChecklist || SCOPE_INIT.map(s => ({ ...s }));

  // Auto-apply scope template from bid phase if checklist hasn't been touched
  const [localChecklist, setLocalChecklist] = useState(() => {
    const cl = checklist.map(s => ({ ...s }));
    // If checklist is fresh (all unchecked) and bid has a matching phase template, pre-apply it
    if (!tk.scopeChecklistCompleted && bid?.phase && SCOPE_TEMPLATES[bid.phase]) {
      const presets = SCOPE_TEMPLATES[bid.phase].presets;
      return cl.map(s => ({ ...s, status: presets[s.id] || s.status }));
    }
    return cl;
  });

  // Build initial edit lines — used when starting at step 2 or after continuing from step 1
  const [editLines, setEditLines] = useState(() => {
    if (step === 2) {
      const built = buildScopeLines(checklist, SCOPE_ITEM_MAP, defaultIncludes, defaultExcludes, DEFAULT_ASSUMPTIONS);
      const existing = tk.scopeLines || {};
      return {
        includes: existing.includes?.length > 0 && tk.scopeChecklistCompleted ? [...existing.includes] : built.includes,
        excludes: existing.excludes?.length > 0 && tk.scopeChecklistCompleted ? [...existing.excludes] : built.excludes,
        assumptions: existing.assumptions?.length > 0 && tk.scopeChecklistCompleted ? [...existing.assumptions] : built.assumptions,
      };
    }
    return null;
  });

  const [proposalNum, setProposalNum] = useState(
    tk.proposalNumber || `EBC-${new Date().getFullYear()}-${String(bid?.id || tk.id).toString().slice(-4).padStart(4, "0")}`
  );
  const [terms, setTerms] = useState(tk.proposalTerms || { ...DEFAULT_PROPOSAL_TERMS });
  const [drawingRef, setDrawingRef] = useState(tk.drawingRef || "");

  // Initialize edit lines when moving to step 2 from step 1
  function initEditLines() {
    const built = buildScopeLines(localChecklist, SCOPE_ITEM_MAP, defaultIncludes, defaultExcludes, DEFAULT_ASSUMPTIONS);
    const existing = tk.scopeLines || {};
    setEditLines({
      includes: existing.includes?.length > 0 && tk.scopeChecklistCompleted ? [...existing.includes] : built.includes,
      excludes: existing.excludes?.length > 0 && tk.scopeChecklistCompleted ? [...existing.excludes] : built.excludes,
      assumptions: existing.assumptions?.length > 0 && tk.scopeChecklistCompleted ? [...existing.assumptions] : built.assumptions,
    });
  }

  const handleChecklistCycle = (id) => {
    setLocalChecklist(prev => prev.map(s =>
      s.id === id ? { ...s, status: SCOPE_CYCLE[s.status] } : s
    ));
  };

  const reviewed = localChecklist.filter(s => s.status !== "unchecked").length;
  const total = localChecklist.length;

  const goToStep2 = () => {
    initEditLines();
    setStep(2);
  };

  const handleSaveExport = () => {
    onSave({
      scopeChecklist: localChecklist,
      scopeChecklistCompleted: true,
      scopeLines: editLines,
      proposalNumber: proposalNum,
      proposalTerms: terms,
      drawingRef: drawingRef,
    });
  };

  const updateLine = (section, idx, value) => {
    setEditLines(prev => ({
      ...prev,
      [section]: prev[section].map((l, i) => i === idx ? value : l),
    }));
  };

  const deleteLine = (section, idx) => {
    setEditLines(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== idx),
    }));
  };

  const addLine = (section) => {
    setEditLines(prev => ({
      ...prev,
      [section]: [...prev[section], ""],
    }));
  };

  // Modal overlay styles
  const overlayStyle = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.7)", zIndex: 9999,
    display: "flex", justifyContent: "center", alignItems: "center",
    padding: "16px",
  };
  const modalStyle = {
    background: "var(--bg2)", border: "1px solid var(--border2)",
    borderRadius: "var(--radius)", maxWidth: 820, width: "100%",
    maxHeight: "90vh", overflow: "auto", padding: 0,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Scope Review — {tk.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Step {step} of 2</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16, padding: "4px 8px" }}>X</button>
        </div>

        {/* ── STEP 1: Checklist ── */}
        {step === 1 && (
          <div style={{ padding: 20 }}>
            {/* Template selector */}
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>Quick template:</label>
              <select
                className="form-select"
                style={{ fontSize: 12, padding: "4px 8px", maxWidth: 200 }}
                defaultValue=""
                onChange={(e) => {
                  const tmpl = SCOPE_TEMPLATES[e.target.value];
                  if (!tmpl) return;
                  setLocalChecklist(prev => prev.map(s => ({
                    ...s,
                    status: tmpl.presets[s.id] || "unchecked",
                  })));
                  e.target.value = "";
                }}
              >
                <option value="">Select project type...</option>
                {Object.entries(SCOPE_TEMPLATES).map(([key, t]) => (
                  <option key={key} value={key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div className="flex-between" style={{ fontSize: 13, marginBottom: 6 }}>
                <span>{reviewed}/{total} reviewed</span>
                <span style={{ color: reviewed === total ? "var(--green)" : "var(--amber)" }}>{Math.round((reviewed / total) * 100)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--bg4)", overflow: "hidden" }}>
                <div style={{ width: `${(reviewed / total) * 100}%`, height: "100%", borderRadius: 3, background: reviewed === total ? "var(--green)" : "var(--amber)", transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ maxHeight: "55vh", overflowY: "auto", marginBottom: 16 }}>
              {localChecklist.map(s => {
                const mapEntry = SCOPE_ITEM_MAP[s.id];
                return (
                  <div
                    key={s.id}
                    onClick={() => handleChecklistCycle(s.id)}
                    style={{
                      padding: "10px 12px", marginBottom: 6, borderRadius: "var(--radius-sm)",
                      background: s.status === "checked" ? "rgba(16,185,129,0.06)" : s.status === "flagged" ? "rgba(234,179,8,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${s.status === "checked" ? "rgba(16,185,129,0.15)" : s.status === "flagged" ? "rgba(234,179,8,0.15)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{SCOPE_ICONS[s.status]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{s.desc}</div>
                        {mapEntry && (
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontStyle: "italic" }}>
                            {s.status === "checked" ? `Include: ${mapEntry.includeText}` :
                             s.status === "flagged" ? `Assumption: ${mapEntry.includeText} (pending clarification)` :
                             `Exclude: ${mapEntry.excludeText}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              {reviewed < total && (
                <div style={{ fontSize: 12, color: "var(--amber)", alignSelf: "center", marginRight: "auto" }}>
                  {total - reviewed} item{total - reviewed !== 1 ? "s" : ""} still unchecked
                </div>
              )}
              <button className="btn btn-primary" onClick={goToStep2} style={{ fontSize: 14, padding: "8px 20px" }}>
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Edit Proposal Scope ── */}
        {step === 2 && editLines && (
          <div style={{ padding: 20 }}>
            {/* Section renderer */}
            {[
              { key: "includes", label: "INCLUDES", color: "var(--green)" },
              { key: "excludes", label: "EXCLUDES", color: "var(--red)" },
              { key: "assumptions", label: "ASSUMPTIONS / QUALIFICATIONS", color: "var(--amber)" },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 8, letterSpacing: 0.5 }}>{label}</div>
                {editLines[key].map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text3)", minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
                    <input
                      className="form-input"
                      value={line}
                      onChange={e => updateLine(key, i, e.target.value)}
                      style={{ flex: 1, fontSize: 12, padding: "4px 8px" }}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteLine(key, i)}
                      style={{ padding: "2px 6px", color: "var(--red)", fontSize: 14, lineHeight: 1 }}
                      title="Remove"
                    >x</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addLine(key)} style={{ fontSize: 12, marginTop: 4 }}>+ Add</button>
              </div>
            ))}

            {/* Proposal metadata fields */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Proposal Number</label>
                  <input className="form-input" value={proposalNum} onChange={e => setProposalNum(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 12 }}>Drawing Reference</label>
                  <input className="form-input" value={drawingRef} onChange={e => setDrawingRef(e.target.value)} placeholder="e.g. A1.01 - A4.02, Rev 3" style={{ fontSize: 13 }} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Payment Terms</label>
                <input className="form-input" value={terms.paymentTerms} onChange={e => setTerms(t => ({ ...t, paymentTerms: e.target.value }))} style={{ fontSize: 13 }} />
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Warranty</label>
                <input className="form-input" value={terms.warranty} onChange={e => setTerms(t => ({ ...t, warranty: e.target.value }))} style={{ fontSize: 13 }} />
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Change Order Language</label>
                <input className="form-input" value={terms.changeOrders} onChange={e => setTerms(t => ({ ...t, changeOrders: e.target.value }))} style={{ fontSize: 13 }} />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ fontSize: 13 }}>
                &larr; Back to Checklist
              </button>
              <button
                className="btn"
                onClick={handleSaveExport}
                style={{ background: "#e09422", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 24px" }}
              >
                Save & Export PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableText({ value, onChange, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        className="form-input"
        autoFocus
        style={{ ...style, minWidth: 180 }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onChange(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      style={{ ...style, cursor: "pointer", borderBottom: "1px dashed var(--border2)" }}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

function RoomHeader({ rm, isOpen, roomTotal, onToggle, onUpdateRoom, onDelete, fmt }) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(rm.name);
  const [floorVal, setFloorVal] = useState(rm.floor);

  function commitName() {
    onUpdateRoom({ name: nameVal, floor: floorVal });
    setEditingName(false);
  }

  return (
    <div className="room-header flex-between" onClick={onToggle} style={{ cursor: "pointer" }}>
      <div className="flex gap-8" style={{ alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600, transform: isOpen ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>
          &#9654;
        </span>
        {editingName ? (
          <span className="flex gap-8" onClick={(e) => e.stopPropagation()}>
            <input
              className="form-input"
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
              style={{ width: 140 }}
              placeholder="Room name"
            />
            <input
              className="form-input"
              value={floorVal}
              onChange={(e) => setFloorVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
              style={{ width: 100 }}
              placeholder="Floor"
            />
            <button className="btn btn-primary btn-sm" onClick={commitName}>OK</button>
          </span>
        ) : (
          <span>
            <strong>{rm.name}</strong>
            {rm.floor && <span style={{ color: "var(--text2)", marginLeft: 6, fontSize: 12 }}>({rm.floor})</span>}
          </span>
        )}
      </div>
      <div className="flex gap-8" style={{ alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "var(--text2)" }}>{(rm.items || []).length} item{(rm.items || []).length !== 1 ? "s" : ""}</span>
        <span style={{ fontWeight: 600, color: "var(--amber)", minWidth: 80, textAlign: "right" }}>{fmt(roomTotal)}</span>
        <button
          className="btn btn-ghost btn-sm"
          title="Edit room"
          onClick={(e) => {
            e.stopPropagation();
            setNameVal(rm.name);
            setFloorVal(rm.floor);
            setEditingName(true);
          }}
          style={{ padding: "2px 6px" }}
        >
          Edit
        </button>
        <button
          className="btn btn-danger btn-sm"
          title="Delete room"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ padding: "2px 6px" }}
        >
          Del
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Quick Proposal Modal — generate proposals from simple line items
   No takeoff/assembly system needed
   ═══════════════════════════════════════════════════════════════ */
function QuickProposalModal({ bids, show, onClose }) {
  const [projectName, setProjectName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [gcName, setGcName] = useState("");
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState([{ description: "", amount: "" }]);
  const [alternates, setAlternates] = useState([]);
  const [includes, setIncludes] = useState([...defaultIncludes]);
  const [excludes, setExcludes] = useState([...defaultExcludes]);
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editSection, setEditSection] = useState(null); // "includes" | "excludes" | null
  const [generatedPdf, setGeneratedPdf] = useState(null); // { fileName, blobUrl, projectName }

  // Prefill from bid if selected
  const [selectedBid, setSelectedBid] = useState("");
  const handleBidSelect = (bidId) => {
    setSelectedBid(bidId);
    const bid = bids.find(b => b.id === bidId);
    if (bid) {
      setProjectName(bid.name || "");
      setProjectAddress(bid.address || "");
      setGcName(bid.gc || "");
    }
  };

  const addLineItem = () => setLineItems(prev => [...prev, { description: "", amount: "" }]);
  const removeLineItem = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i, field, val) => setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const addAlternate = () => setAlternates(prev => [...prev, { description: "", type: "add", amount: "" }]);
  const removeAlternate = (i) => setAlternates(prev => prev.filter((_, idx) => idx !== i));
  const updateAlternate = (i, field, val) => setAlternates(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const total = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleGenerate = async () => {
    if (!projectName.trim()) { show("Enter a project name", "err"); return; }
    if (lineItems.filter(i => i.description && i.amount).length === 0) { show("Add at least one line item", "err"); return; }
    setGenerating(true);
    try {
      const result = await generateQuickProposalPdf({
        projectName,
        projectAddress,
        gcName,
        date: new Date(proposalDate + "T12:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        lineItems: lineItems.filter(i => i.description && i.amount),
        alternates: alternates.filter(a => a.description && a.amount),
        includes,
        excludes,
        notes,
      });
      // Revoke previous blob URL to avoid memory leaks
      if (generatedPdf?.blobUrl) URL.revokeObjectURL(generatedPdf.blobUrl);
      const blobUrl = URL.createObjectURL(result.blob);
      setGeneratedPdf({ fileName: result.fileName, blobUrl, projectName: projectName.trim() });
      show(`Proposal exported: ${result.fileName}`, "ok");
    } catch (e) {
      console.error("Quick proposal error:", e);
      show("Failed to generate proposal", "err");
    }
    setGenerating(false);
  };

  const handleOpenPdf = () => {
    if (generatedPdf?.blobUrl) window.open(generatedPdf.blobUrl, "_blank");
  };

  const handlePrintPdf = () => {
    if (!generatedPdf?.blobUrl) return;
    const printWin = window.open(generatedPdf.blobUrl, "_blank");
    if (printWin) {
      printWin.addEventListener("load", () => { printWin.print(); });
    }
  };

  const handleEmailProposal = () => {
    if (!generatedPdf) return;
    const subject = encodeURIComponent(`EBC Proposal - ${generatedPdf.projectName}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find attached our proposal for ${generatedPdf.projectName}.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nOscar Abner Aguilar\nEagles Brothers Constructors\n(346) 970-7093\nabner@ebconstructors.com`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const fmtMoney = (n) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "92vh", overflow: "auto" }}>
        <div className="flex-between mb-12">
          <h3 className="section-title" style={{ margin: 0 }}>Quick Proposal</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        {/* Prefill from bid */}
        {bids.length > 0 && (
          <div className="mb-12">
            <label className="form-label">Prefill from Bid</label>
            <select className="form-input" value={selectedBid} onChange={e => handleBidSelect(e.target.value)}>
              <option value="">-- Select a bid --</option>
              {bids.map(b => <option key={b.id} value={b.id}>{b.name} — {b.gc}</option>)}
            </select>
          </div>
        )}

        {/* Project info */}
        <div className="form-grid mb-12">
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="OSC - Pelican Refining" />
          </div>
          <div className="form-group">
            <label className="form-label">Project Address</label>
            <input className="form-input" value={projectAddress} onChange={e => setProjectAddress(e.target.value)} placeholder="990 Town and Country Blvd, Houston, TX 77024" />
          </div>
          <div className="form-group">
            <label className="form-label">GC / Client</label>
            <input className="form-input" value={gcName} onChange={e => setGcName(e.target.value)} placeholder="O'Donnell/Snider Construction" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={proposalDate} onChange={e => setProposalDate(e.target.value)} />
          </div>
        </div>

        {/* Line items */}
        <div className="mb-12">
          <div className="flex-between mb-8">
            <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Scope Line Items</label>
            <button className="btn btn-sm btn-ghost" onClick={addLineItem}>+ Add Line</button>
          </div>
          {lineItems.map((item, i) => (
            <div key={i} className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
              <input className="form-input" style={{ flex: 2 }} value={item.description}
                onChange={e => updateLineItem(i, "description", e.target.value)}
                placeholder="e.g. Demolition" />
              <input className="form-input" style={{ flex: 1, textAlign: "right" }} value={item.amount}
                onChange={e => updateLineItem(i, "amount", e.target.value)}
                placeholder="$0" type="number" />
              {lineItems.length > 1 && (
                <button className="btn btn-sm btn-danger" onClick={() => removeLineItem(i)} style={{ padding: "4px 8px" }}>✕</button>
              )}
            </div>
          ))}
          <div style={{ textAlign: "right", fontWeight: 700, fontSize: 16, color: "var(--accent)", marginTop: 8 }}>
            Total: {fmtMoney(total)}
          </div>
        </div>

        {/* Alternates */}
        <div className="mb-12">
          <div className="flex-between mb-8">
            <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Alternates</label>
            <button className="btn btn-sm btn-ghost" onClick={addAlternate}>+ Add Alternate</button>
          </div>
          {alternates.map((alt, i) => (
            <div key={i} className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
              <input className="form-input" style={{ flex: 2 }} value={alt.description}
                onChange={e => updateAlternate(i, "description", e.target.value)}
                placeholder="e.g. Demo floors (VCT)" />
              <select className="form-input" style={{ width: 90 }} value={alt.type}
                onChange={e => updateAlternate(i, "type", e.target.value)}>
                <option value="add">ADD</option>
                <option value="deduct">DEDUCT</option>
              </select>
              <input className="form-input" style={{ flex: 1, textAlign: "right" }} value={alt.amount}
                onChange={e => updateAlternate(i, "amount", e.target.value)}
                placeholder="$0" type="number" />
              <button className="btn btn-sm btn-danger" onClick={() => removeAlternate(i)} style={{ padding: "4px 8px" }}>✕</button>
            </div>
          ))}
        </div>

        {/* Includes / Excludes */}
        <div className="mb-12">
          <div className="flex gap-8 mb-8">
            <button className={`btn btn-sm ${editSection === "includes" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setEditSection(editSection === "includes" ? null : "includes")}>
              Edit Includes ({includes.length})
            </button>
            <button className={`btn btn-sm ${editSection === "excludes" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setEditSection(editSection === "excludes" ? null : "excludes")}>
              Edit Excludes ({excludes.length})
            </button>
          </div>

          {editSection === "includes" && (
            <div className="card" style={{ padding: 12, maxHeight: 240, overflowY: "auto" }}>
              <div className="flex-between mb-8">
                <span className="text-sm font-semi">Includes</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setIncludes(prev => [...prev, ""])}>+ Add</button>
              </div>
              {includes.map((line, i) => (
                <div key={i} className="flex gap-4 mb-4" style={{ alignItems: "center" }}>
                  <span className="text-xs" style={{ width: 20, textAlign: "right", opacity: 0.5 }}>{i + 1}.</span>
                  <input className="form-input" style={{ flex: 1, fontSize: 12 }} value={line}
                    onChange={e => setIncludes(prev => prev.map((l, idx) => idx === i ? e.target.value : l))} />
                  <button className="btn btn-sm btn-danger" onClick={() => setIncludes(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ padding: "2px 6px", fontSize: 11 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {editSection === "excludes" && (
            <div className="card" style={{ padding: 12, maxHeight: 240, overflowY: "auto" }}>
              <div className="flex-between mb-8">
                <span className="text-sm font-semi">Excludes</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setExcludes(prev => [...prev, ""])}>+ Add</button>
              </div>
              {excludes.map((line, i) => (
                <div key={i} className="flex gap-4 mb-4" style={{ alignItems: "center" }}>
                  <span className="text-xs" style={{ width: 20, textAlign: "right", opacity: 0.5 }}>{i + 1}.</span>
                  <input className="form-input" style={{ flex: 1, fontSize: 12 }} value={line}
                    onChange={e => setExcludes(prev => prev.map((l, idx) => idx === i ? e.target.value : l))} />
                  <button className="btn btn-sm btn-danger" onClick={() => setExcludes(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ padding: "2px 6px", fontSize: 11 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-12">
          <label className="form-label">Notes (bottom of proposal)</label>
          <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder='Assume deck height to be 14&apos;-00" or less. Advise if deck height wall price needs to be adjusted.&#10;Pricing is good for 30 days from date of proposal.' />
        </div>

        {/* Post-generation actions */}
        {generatedPdf && (
          <div className="mb-12" style={{ background: "var(--bg-success, #f0fdf4)", border: "1px solid var(--border-success, #bbf7d0)", borderRadius: 8, padding: 12 }}>
            <div className="text-sm font-semi mb-8" style={{ color: "var(--accent)" }}>
              PDF Ready: {generatedPdf.fileName}
            </div>
            <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
              <button className="btn btn-sm btn-ghost" onClick={handleOpenPdf} title="Open PDF in a new tab">
                Open PDF
              </button>
              <button className="btn btn-sm btn-ghost" onClick={handlePrintPdf} title="Open PDF and print">
                Print
              </button>
              <button className="btn btn-sm btn-primary" onClick={handleEmailProposal} title="Open email client with pre-filled subject">
                Email Proposal
              </button>
            </div>
          </div>
        )}

        {/* Generate */}
        <div className="flex-between" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div className="text-sm" style={{ opacity: 0.6 }}>
            {lineItems.filter(i => i.description && i.amount).length} line items · {alternates.filter(a => a.description && a.amount).length} alternates
          </div>
          <div className="flex gap-8">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : generatedPdf ? "Regenerate PDF" : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
