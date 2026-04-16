import { useState, useMemo, useRef, useCallback } from "react";
import { FeatureGuide } from "../components/FeatureGuide";
import { getHF, SCOPE_INIT, SCOPE_ITEM_MAP, DEFAULT_ASSUMPTIONS, DEFAULT_PROPOSAL_TERMS, SCOPE_TEMPLATES, PROFIT_SUGGESTIONS } from "../data/constants";
import { generateProposalPdf, generateQuickProposalPdf, defaultIncludes, defaultExcludes } from "../utils/proposalPdf";
import { buildScopeLines } from "../utils/scopeBuilder";
import { uploadTakeoffPdf, downloadTakeoffPdf, getSignedUrl, uploadProjectDrawing, insertProjectDrawing, getDrawingsByBid } from "../lib/supabase";
import { extractPdfText } from "../utils/pdfBidExtractor.js";
import { parseProposalFromText } from "../utils/proposalImporter.js";
// Estimating calc primitives extracted for testability (see src/utils/__tests__/estimatingCalc.test.js)
import { calcItem, calcRoom, calcSummary, calcLFMetrics } from "../utils/estimatingCalc";
import { Upload } from "lucide-react";

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

  // ── Drawing state (DrawingViewer is now on its own route at #/takeoff/:id) ──
  const drawingFileRef = useRef();
  const ostFileRef = useRef();
  const scanPdfRef = useRef();
  const [drawingLoading, setDrawingLoading] = useState(false);

  // Upload drawing: direct sync click on file input (must be synchronous for browser to allow file picker)
  const uploadDrawing = useCallback(() => {
    if (drawingFileRef.current) drawingFileRef.current.click();
  }, []);

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
    }).catch(() => {
      // Fallback for non-HTTPS or denied clipboard access
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
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
                return <>{withItems > 0 && <span className="ml-sp2">{withItems} active</span>}{totalValue > 0 && <span className="ml-sp2">Pipeline: {fmtK(totalValue)}</span>}</>;
              })()}
            </div>
          </div>
          <div className="flex gap-8">
            <input type="file" ref={ostFileRef} accept=".csv,.txt" className="hidden" onChange={handleOstFile} />
            <button className="btn btn-ghost" onClick={() => ostFileRef.current?.click()} className="fs-label">Import OST</button>
            <input type="file" ref={scanPdfRef} accept=".pdf" className="hidden" onChange={handleScanPdf} />
            <button className="btn btn-ghost" onClick={() => scanPdfRef.current?.click()} className="fs-label">Scan Bid PDF</button>
            <FeatureGuide guideKey="estimating" />
            <button className="btn btn-ghost" onClick={() => setShowQuickProposal(true)} className="fs-label">Quick Proposal</button>
            <button className="btn btn-primary" onClick={createTakeoff}>+ New Takeoff</button>
          </div>
        </div>

        {/* ── Search & Bid Browser ── */}
        <div className="mb-sp4">
          <div className="flex gap-8 mb-sp2" style={{ alignItems: "center" }}>
            <input
              className="form-input"
              placeholder="Search takeoffs & bids by name, GC, phase, scope..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="flex-1" style={{ maxWidth: 480 }}
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
            <div className="card mb-sp3 p-sp3" style={{ maxHeight: 320, overflowY: "auto" }}>
              <div className="flex-between mb-8">
                <div className="text-sm font-semi">
                  {localSearch ? `${bidSearchResults.length} bid${bidSearchResults.length !== 1 ? "s" : ""} matching "${localSearch}"` : "Recent Bids"}
                </div>
                <div className="text-xs text-muted">Click a bid to create a new takeoff from it</div>
              </div>
              <table className="data-table fs-label">
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
                        <td className="fw-medium">{b.name}</td>
                        <td className="c-text2">{b.gc || "—"}</td>
                        <td><span className="badge badge-blue fs-xs">{b.phase || "—"}</span></td>
                        <td className="fw-semi">{b.value ? fmtK(b.value) : "—"}</td>
                        <td>
                          <span className={`badge ${b.status === "awarded" ? "badge-green" : b.status === "lost" ? "badge-red" : b.status === "submitted" ? "badge-blue" : "badge-amber"} fs-xs`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {hasTakeoff ? (
                            <button className="btn btn-ghost btn-sm fs-tab"
                              onClick={() => { const t = takeoffs.find(t => t.bidId === b.id); if (t) setActiveTk(t.id); }}>
                              Open Takeoff
                            </button>
                          ) : (
                            <button className="btn btn-primary btn-sm fs-tab"
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
          <div className="card p-sp8 text-center">
            <div className="fs-secondary fw-semi mb-sp2">No takeoffs yet</div>
            <div className="mb-sp4 fs-label c-text2">Create a takeoff from a bid, import from OST, or scan a bid PDF to get started.</div>
            <div className="flex gap-8 justify-center">
              <button className="btn btn-primary" onClick={createTakeoff}>+ New Takeoff</button>
              <button className="btn btn-ghost" onClick={() => setShowBidBrowser(true)}>Browse Bids</button>
            </div>
          </div>
        )}

        <div className="gap-sp3 d-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
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
                <div className="fs-secondary fw-semi mb-sp1" style={{ lineHeight: 1.3 }}>{tk.name}</div>
                {linkedBid && (
                  <div className="mb-sp1 fs-tab c-text2">
                    <span className={`badge ${linkedBid.status === "awarded" ? "badge-green" : linkedBid.status === "submitted" ? "badge-blue" : "badge-amber"} mr-sp1 fs-xs`}>{linkedBid.status}</span>
                    {linkedBid.gc}
                  </div>
                )}
                {!linkedBid && <div className="mb-sp1 fs-tab c-text3" style={{ fontStyle: "italic" }}>No linked bid</div>}

                {/* Stats row */}
                <div className="flex gap-8 fs-tab mt-sp2 c-text2 flex-wrap">
                  <span>{roomCount} area{roomCount !== 1 ? "s" : ""}</span>
                  <span>{lineItemCount} item{lineItemCount !== 1 ? "s" : ""}</span>
                  {hasDrawing && <span className="c-green">Drawing{measCount > 0 ? ` (${measCount})` : ""}</span>}
                  {!hasDrawing && <span className="c-text3">No drawing</span>}
                  {scopeDone && <span className="c-green">Scope reviewed</span>}
                </div>

                {/* Value + completion bar */}
                <div className="flex-between mt-sp2" style={{ alignItems: "center" }}>
                  {hasValue ? (
                    <span className="fw-bold fs-card c-amber">{fmtK(s.grandTotal)}</span>
                  ) : (
                    <span className="fs-label c-text3" style={{ fontStyle: "italic" }}>No estimate yet</span>
                  )}
                  <span className="fs-tab c-text2">{tk.created}</span>
                </div>

                {/* Completeness bar */}
                <div className="mt-sp2 gap-sp1" style={{ display: "flex", alignItems: "center" }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: "var(--radius-control)", background: i < completeness ? "var(--green)" : "var(--border)" }} />
                  ))}
                  <span className="ml-sp1 fs-xs c-text3">{completeness}/5</span>
                </div>

                {/* Actions */}
                <div className="flex-between mt-sp2">
                  <span className="flex gap-4">
                    <button className="btn btn-ghost btn-sm" title="Clone" onClick={e => { e.stopPropagation(); cloneTakeoff(tk.id); }} className="fs-xs" style={{ padding: "var(--space-1) var(--space-2)" }}>Clone</button>
                    <button className="btn btn-ghost btn-sm" title="Delete" onClick={e => { e.stopPropagation(); if (confirm(`Delete takeoff "${tk.name}"?`)) setTakeoffs(prev => prev.filter(t => t.id !== tk.id)); }} className="fs-xs c-red" style={{ padding: "var(--space-1) var(--space-2)" }}>Delete</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ SCAN BID PDF MODAL ═══ */}
        {scanModal && (
          <div className="modal-overlay" onClick={() => !scanLoading && setScanModal(false)}>
            <div className="modal-content overflow-auto" style={{ maxWidth: 800, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
              <div className="flex-between mb-sp4">
                <div>
                  <h3 className="fs-section" style={{ margin: "0" }}>Scan Bid PDF</h3>
                  <div className="fs-label mt-sp1 c-text3">
                    Extract bid data from an old proposal PDF and re-estimate with current assemblies
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => setScanModal(false)} disabled={scanLoading}>✕</button>
              </div>

              {scanLoading && (
                <div className="p-sp10 text-center">
                  <div className="fs-stat" style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>&#8635;</div>
                  <div className="mt-sp3 c-text2">Extracting text from PDF...</div>
                </div>
              )}

              {scanResult && (
                <div>
                  {/* Extracted bid info */}
                  <div className="card mb-sp4 p-sp4">
                    <div className="text-sm font-semi mb-12" style={{ color: "var(--primary)" }}>Extracted Bid Data</div>
                    <div className="gap-sp3 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
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
                      <div className="mt-sp2">
                        <span className="text-xs text-muted">Scope: </span>
                        {scanResult.scope.map((s, i) => (
                          <span key={i} className="badge badge-blue mr-sp1 fs-xs">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extracted line items */}
                  {scanResult.lineItems?.length > 0 && (
                    <div className="card mb-sp4 p-sp4">
                      <div className="text-sm font-semi mb-8">Line Items ({scanResult.lineItems.length})</div>
                      <table className="data-table fs-label">
                        <thead>
                          <tr><th>Item</th><th className="text-right">Amount</th></tr>
                        </thead>
                        <tbody>
                          {scanResult.lineItems.map((li, i) => (
                            <tr key={i}>
                              <td>{li.label}</td>
                              <td className="fw-semi text-right">${li.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr className="fw-bold" style={{ borderTop: "2px solid var(--border)" }}>
                            <td>Total</td>
                            <td className="c-amber text-right">
                              ${(scanResult.value || scanResult.lineItems.reduce((s, li) => s + li.amount, 0)).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Alternates */}
                  {scanResult.alternates?.length > 0 && (
                    <div className="card mb-sp4 p-sp4">
                      <div className="text-sm font-semi mb-8 c-amber">Alternates ({scanResult.alternates.length})</div>
                      <table className="data-table fs-label">
                        <thead>
                          <tr><th>Description</th><th style={{ width: 80 }}>Type</th><th className="text-right" style={{ width: 100 }}>Amount</th><th style={{ width: 32 }}></th></tr>
                        </thead>
                        <tbody>
                          {scanResult.alternates.map((alt, i) => (
                            <tr key={alt.id || i}>
                              <td>
                                <input className="form-input" value={alt.description} className="fs-label" style={{ padding: "var(--space-1) var(--space-2)" }}
                                  onChange={e => setScanResult(prev => {
                                    const updated = [...prev.alternates];
                                    updated[i] = { ...updated[i], description: e.target.value };
                                    return { ...prev, alternates: updated };
                                  })} />
                              </td>
                              <td>
                                <select className="form-input" value={alt.type} className="fs-label" style={{ padding: "var(--space-1) var(--space-1)" }}
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
                                <input className="form-input" type="number" value={alt.amount} className="fs-label text-right" style={{ padding: "var(--space-1) var(--space-2)" }}
                                  onChange={e => setScanResult(prev => {
                                    const updated = [...prev.alternates];
                                    updated[i] = { ...updated[i], amount: parseFloat(e.target.value) || 0 };
                                    return { ...prev, alternates: updated };
                                  })} />
                              </td>
                              <td>
                                <button className="btn btn-ghost fs-secondary c-red" style={{ padding: 0 }}
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
                    <div className="card mb-sp4 p-sp4">
                      <div className="gap-sp4 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                        {scanResult.includes?.length > 0 && (
                          <div>
                            <div className="text-sm font-semi mb-8 c-green">Includes</div>
                            {scanResult.includes.map((item, i) => (
                              <div key={i} className="fs-label c-text2" style={{ padding: "var(--space-1) 0" }}>{i + 1}. {item}</div>
                            ))}
                          </div>
                        )}
                        {scanResult.excludes?.length > 0 && (
                          <div>
                            <div className="text-sm font-semi mb-8 c-red">Excludes</div>
                            {scanResult.excludes.map((item, i) => (
                              <div key={i} className="fs-label c-text2" style={{ padding: "var(--space-1) 0" }}>{i + 1}. {item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-8 flex-wrap" style={{ justifyContent: "flex-end" }}>
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
            <div className="modal-content overflow-auto" style={{ maxWidth: 900, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
              <div className="flex-between mb-sp4">
                <div>
                  <h3 className="fs-section" style={{ margin: "0" }}>Import from OST</h3>
                  <div className="fs-label mt-sp1 c-text3">Map your OST conditions to EBC assemblies for pricing</div>
                </div>
                <button className="btn btn-ghost" onClick={() => setOstModal(false)}>✕</button>
              </div>

              {/* Takeoff name */}
              <div className="mb-sp4">
                <label className="mb-sp1 fs-label c-text2 d-block">Takeoff Name</label>
                <input className="form-input" value={ostName} onChange={e => setOstName(e.target.value)} className="w-full" />
              </div>

              {/* Column mapping info */}
              <div className="mb-sp3 fs-label c-text3" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(59,130,246,0.08)", borderRadius: "var(--radius)" }}>
                Detected columns: {ostHeaders.length} · Data rows: {ostRows.length} · Auto-matched: {ostItemMappings.filter(m => m.assemblyCode).length} items
              </div>

              {/* Import table */}
              <div className="mb-sp4 overflow-x-auto">
                <table className="data-table fs-label">
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
                        <td className="fw-medium">{m.condName || <span className="c-text3">—</span>}</td>
                        <td>
                          <input className="form-input" type="number" value={m.qty} className="fs-label" style={{ width: 70, padding: "var(--space-1) var(--space-1)" }} onChange={e => {
                            setOstItemMappings(prev => prev.map((p, j) => j === i ? { ...p, qty: parseFloat(e.target.value) || 0 } : p));
                          }} />
                        </td>
                        <td className="c-text3">{m.unit}</td>
                        <td className="fs-tab c-text3">{m.page || "—"}</td>
                        <td>
                          <select className="form-input" value={m.assemblyCode} className="fs-label w-full" style={{ padding: "var(--space-1) var(--space-1)" }} onChange={e => {
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
                <div className="fs-label c-text2">
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
      {/* Drawing Viewer now opens as full-screen route at #/takeoff/:id */}

      {/* back + header */}
      <div className="section-header flex-between">
        <div className="flex gap-8" style={{ alignItems: "center" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveTk(null)}>&larr; Back</button>
          <EditableText
            value={tk.name}
            onChange={(v) => updateTakeoff(tk.id, { name: v })}
            className="fw-bold fs-section"
          />
          <span className="fs-tab c-text3" style={{ opacity: 0.7 }}>Auto-saved</span>
        </div>
        <div className="flex gap-8 flex-wrap">
          {/* Upload: sync click for file picker. Open: async cache/cloud lookup */}
          {drawingLoading ? (
            <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.7 }}>
              Uploading...
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => { window.location.hash = `#/takeoff/${tk.id}`; }}>
              {tk.drawingState?.pdfFileNames?.length > 0 ? "Open Drawing" : "Upload Drawing"}
            </button>
          )}
          {tk.drawingState && (
            <button className="btn btn-ghost btn-sm c-green" onClick={() => { window.location.hash = `#/takeoff/${tk.id}`; }}>
              Resume Takeoff ({Object.values(tk.drawingState.measurements || {}).flat().length} meas)
            </button>
          )}
          <input
            ref={drawingFileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              // Save filename to takeoff, then navigate to full-screen takeoff route
              updateTakeoff(tk.id, { drawingFileName: file.name });
              // Cache file in IDB so TakeoffRoute can read it
              const reader = new FileReader();
              reader.onload = (ev) => {
                const bytes = new Uint8Array(ev.target.result);
                // Store in IDB for the takeoff route to pick up
                const req = indexedDB.open("ebc_takeoff_pdfs", 2);
                req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("pdfs")) req.result.createObjectStore("pdfs"); };
                req.onsuccess = () => {
                  const tx = req.result.transaction("pdfs", "readwrite");
                  tx.objectStore("pdfs").put(bytes.buffer, `${tk.id}_0`);
                  tx.oncomplete = () => { window.location.hash = `#/takeoff/${tk.id}`; };
                  tx.onerror = () => { window.location.hash = `#/takeoff/${tk.id}`; };
                };
                req.onerror = () => { window.location.hash = `#/takeoff/${tk.id}`; };
              };
              reader.onerror = () => show("Failed to read PDF", "err");
              reader.readAsArrayBuffer(file);
            }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => runHistComparison(tk)} disabled={histLoading}>
            {histLoading ? "Comparing..." : "Compare to History"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            copyProposal(tk);
          }}>Copy Proposal</button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setScopeModalTkId(tk.id);
            setScopeModalStep(tk.scopeChecklistCompleted ? 2 : 1);
          }}>Scope Review</button>
          <button className="btn btn-sm c-white" style={{ background: "var(--gold)" }} onClick={async () => {
            if (!tk.scopeChecklistCompleted) {
              setScopeModalTkId(tk.id);
              setScopeModalStep(1);
              show("Complete Scope Review first to generate proposal PDF", "info");
              return;
            }
            // Phase 2: gate export on addendum acknowledgement
            const unackDocs = (tk.documents || []).filter(d => !d.acknowledged);
            if (unackDocs.length > 0) {
              const unackList = unackDocs.map(d => `${d.type} #${d.number}`).join(", ");
              if (!confirm(`${unackDocs.length} document(s) not acknowledged: ${unackList}.\n\nExport anyway? (Click OK only if you're sure these were reviewed.)`)) {
                show("Export cancelled — acknowledge all documents first", "info");
                return;
              }
            }
            try {
              const bid = bids.find(b => b.id === tk.bidId);
              const fileName = await generateProposalPdf({
                takeoff: tk, bid, company, assemblies, submittals,
                calcItem, calcRoom, calcSummary,
                scopeLines: tk.scopeLines,
                proposalTerms: tk.proposalTerms,
                proposalNumber: tk.proposalNumber,
                audience: "client",
              });
              show(`PDF exported: ${fileName}`, "ok");
            } catch (e) { show("PDF export failed: " + e.message, "err"); }
          }}>Export PDF</button>
          <button className="btn btn-ghost btn-sm" title="Internal review PDF — shows quantities, rates, labor/material breakdown, and source references"
            onClick={async () => {
              try {
                const bid = bids.find(b => b.id === tk.bidId);
                const fileName = await generateProposalPdf({
                  takeoff: tk, bid, company, assemblies, submittals,
                  calcItem, calcRoom, calcSummary,
                  scopeLines: tk.scopeLines,
                  proposalTerms: tk.proposalTerms,
                  proposalNumber: tk.proposalNumber,
                  audience: "internal",
                });
                show(`Internal review PDF exported: ${fileName}`, "ok");
              } catch (e) { show("Internal PDF failed: " + e.message, "err"); }
            }}>Internal Review</button>
        </div>
      </div>

      {/* bid link + date */}
      <div className="flex gap-8 mb-sp3 flex-wrap" style={{ alignItems: "center" }}>
        <label className="fs-label c-text2">Bid:</label>
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
        <span className="fs-label ml-sp2 c-text2">Created: {tk.created}</span>
      </div>

      {/* ── Documents Tracker — addenda, bulletins, RFIs, plan revisions ── */}
      {(() => {
        const docs = tk.documents || [];
        const unack = docs.filter(d => !d.acknowledged);
        const addDoc = (type) => {
          const number = prompt(`${type === "addendum" ? "Addendum" : type === "bulletin" ? "Bulletin" : type === "rfi" ? "RFI" : "Plans"} number:`, "");
          if (!number) return;
          const date = prompt("Date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10)) || "";
          const notes = prompt("Notes (optional):", "") || "";
          const newDoc = { id: crypto.randomUUID(), type, number, date, notes, acknowledged: false, createdAt: new Date().toISOString() };
          updateTakeoff(tk.id, { documents: [...docs, newDoc] });
        };
        const toggleAck = (id) => {
          updateTakeoff(tk.id, { documents: docs.map(d => d.id === id ? { ...d, acknowledged: !d.acknowledged, acknowledgedAt: !d.acknowledged ? new Date().toISOString() : null } : d) });
        };
        const removeDoc = (id) => {
          if (!confirm("Remove this document?")) return;
          updateTakeoff(tk.id, { documents: docs.filter(d => d.id !== id) });
        };
        return (
          <div className="card dash-card mb-sp3" style={{ borderLeft: unack.length > 0 ? "3px solid var(--red)" : "3px solid var(--green)" }}>
            <div className="flex-between mb-8 flex-wrap gap-8">
              <div className="text-sm font-semi flex-center-gap-6">
                📎 Plan Documents & Addenda
                {unack.length > 0 ? (
                  <span className="badge badge-red fs-xs">{unack.length} not acknowledged — blocks Export PDF</span>
                ) : docs.length > 0 ? (
                  <span className="badge badge-green fs-xs">{docs.length} acknowledged</span>
                ) : (
                  <span className="badge badge-amber fs-xs">none tracked — add plans / addenda</span>
                )}
              </div>
              <div className="flex gap-4 flex-wrap">
                <button className="btn btn-ghost btn-sm" onClick={() => addDoc("plans")}>+ Plans</button>
                <button className="btn btn-ghost btn-sm" onClick={() => addDoc("specs")}>+ Specs</button>
                <button className="btn btn-ghost btn-sm" onClick={() => addDoc("addendum")}>+ Addendum</button>
                <button className="btn btn-ghost btn-sm" onClick={() => addDoc("bulletin")}>+ Bulletin</button>
                <button className="btn btn-ghost btn-sm" onClick={() => addDoc("rfi")}>+ RFI</button>
              </div>
            </div>
            {docs.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Type</th><th>#</th><th>Date</th><th>Notes</th><th>Ack</th><th></th></tr></thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id} style={{ background: d.acknowledged ? "transparent" : "rgba(239,68,68,0.05)" }}>
                        <td><span className={`badge fs-xs ${d.type === "addendum" ? "badge-red" : d.type === "bulletin" ? "badge-amber" : d.type === "rfi" ? "badge-blue" : "badge-ghost"}`}>{d.type}</span></td>
                        <td className="fw-semi">{d.number}</td>
                        <td className="text-xs text-muted">{d.date || "—"}</td>
                        <td className="text-xs">{d.notes || "—"}</td>
                        <td>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                            <input type="checkbox" checked={d.acknowledged || false} onChange={() => toggleAck(d.id)} />
                            <span className="text-xs">{d.acknowledged ? "Yes" : "No"}</span>
                          </label>
                        </td>
                        <td><button className="btn btn-ghost btn-sm text-red" onClick={() => removeDoc(d.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-dim">Track every plan set, addendum, bulletin, and RFI. Unacknowledged items block PDF export — prevents submitting a bid that missed an addendum.</div>
            )}
          </div>
        );
      })()}

      {/* Markups moved to Bid Summary section below — takeoff phase is about scope & measurements */}

      {/* ── Gap Analysis (standalone) ── */}
      <div className="mb-sp4">
        <button
          className={`btn ${showScopePanel ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setShowScopePanel(!showScopePanel)}
        >
          {showScopePanel ? "Hide Gap Analysis" : "AI Gap Analysis"}
        </button>
      </div>

      {showScopePanel && (
        <div className="card mb-sp5 p-sp5">
          <div className="flex-between mb-12">
            <div className="section-title fs-card">AI Gap Analysis</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowScopePanel(false)}>Close</button>
          </div>
          <div>
            <div className="text-sm font-semi mb-8">Paste your bid scope and contract/spec scope below. AI will identify gaps, extras, and risks.</div>
            <div className="gap-sp3 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="form-group">
                <label className="form-label">Bid Scope (what EBC priced)</label>
                <textarea className="form-input" rows={6} placeholder="Paste your bid scope, line items, or proposal scope description..."
                  value={gapBidScope} onChange={e => setGapBidScope(e.target.value)} className="fs-label" style={{ resize: "vertical", fontFamily: "inherit" }} />
                <div className="text-xs text-dim mt-4">{gapBidScope.length} chars</div>
              </div>
              <div className="form-group">
                <label className="form-label">Contract Scope (specs / drawings notes)</label>
                <textarea className="form-input" rows={6} placeholder="Paste contract scope, spec sections, or drawing notes..."
                  value={gapContractScope} onChange={e => setGapContractScope(e.target.value)} className="fs-label" style={{ resize: "vertical", fontFamily: "inherit" }} />
                <div className="text-xs text-dim mt-4">{gapContractScope.length} chars</div>
              </div>
            </div>
            <button className="btn btn-primary mt-12" onClick={runGapCheck} disabled={gapLoading}>
              {gapLoading ? "Analyzing..." : "Run Gap Analysis"}
            </button>

            {gapResult && (
              <div className="mt-sp4">
                <div className="card mb-sp3 p-sp4">
                  <div className="flex-between mb-8">
                    <div className="text-sm font-semi">Coverage Score</div>
                    <div style={{ fontSize: "var(--text-title)", fontWeight: "var(--weight-bold)", color: gapResult.score >= 80 ? "var(--green)" : gapResult.score >= 50 ? "var(--amber)" : "var(--red)" }}>
                      {gapResult.score}/100
                    </div>
                  </div>
                  <div className="text-sm text-muted">{gapResult.summary}</div>
                </div>

                {gapResult.gaps?.length > 0 && (
                  <div className="card mb-sp3 p-sp4">
                    <div className="text-sm font-semi mb-8 c-red">Missing from Bid ({gapResult.gaps.length})</div>
                    {gapResult.gaps.map((g, i) => (
                      <div key={i} className="border-b" style={{ padding: "var(--space-2) 0" }}>
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
                  <div className="card mb-sp3 p-sp4">
                    <div className="text-sm font-semi mb-8 c-amber">In Bid but Not in Contract ({gapResult.extras.length})</div>
                    {gapResult.extras.map((g, i) => (
                      <div key={i} className="border-b" style={{ padding: "var(--space-2) 0" }}>
                        <span className="text-sm font-semi">{g.item}</span>
                        <div className="text-xs text-muted mt-4">{g.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {gapResult.risks?.length > 0 && (
                  <div className="card mb-sp3 p-sp4">
                    <div className="text-sm font-semi mb-8 c-blue">Risks & Ambiguities ({gapResult.risks.length})</div>
                    {gapResult.risks.map((g, i) => (
                      <div key={i} className="border-b" style={{ padding: "var(--space-2) 0" }}>
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
                  <div className="overflow-x-auto">
                    <table className="data-table fs-label w-full">
                      <thead>
                        <tr>
                          <th>Assembly</th>
                          <th style={{ width: 64 }}>Qty</th>
                          <th style={{ width: 44 }}>Unit</th>
                          <th style={{ width: 56 }}>Height</th>
                          <th style={{ width: 48 }}>HF</th>
                          <th style={{ width: 56 }}>Diff</th>
                          <th className="text-right">Mat Rate</th>
                          <th className="text-right">Lab Rate</th>
                          <th className="text-right">Mat Total</th>
                          <th className="text-right">Lab Total</th>
                          <th className="text-right">Total</th>
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
                            <tr key={item.id} onClick={() => setEditingItem(item.id)} className="cursor-pointer">
                              <td>
                                {isEditing ? (
                                  <select
                                    className="form-select"
                                    value={item.code}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleAssemblyChange(tk.id, rm.id, item.id, e.target.value)}
                                    className="fs-label" style={{ maxWidth: 220 }}
                                  >
                                    {assemblies.map((a) => (
                                      <option key={a.code} value={a.code}>
                                        {a.code} - {a.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="flex gap-sp1 flex-wrap">
                                    <span className={`asm?.verified ? "badge-green" : "badge-amber" mr-sp1 fs-xs`}>
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
                                    {/* Source traceability badge — clicking the line item shows where quantity came from */}
                                    {(item.sourceMeasurementIds || []).length > 0 && (
                                      <span className="badge badge-blue fs-xs ml-sp1" title={`Source: ${item.sourceConditionName || "(condition)"}\nBid Area: ${item.sourceBidAreaName || "(none)"}\nMeasurements: ${item.sourceMeasurementIds.length}\nSheets: ${(item.sourceSheets || []).join(", ") || "(none)"}`}>
                                        {item.sourceMeasurementIds.length}m · {(item.sourceSheets || []).length}sh
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
                              <td className="text-right">{fmt(asm?.matRate || 0)}</td>
                              <td className="text-right">{fmt(asm?.labRate || 0)}</td>
                              <td className="text-right">{fmt(c.mat)}</td>
                              <td className="text-right">{fmt(c.lab)}</td>
                              <td className="fw-semi text-right">{fmt(c.total)}</td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}
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
                            <td colSpan={12} className="p-sp4 c-text3 text-center">
                              No line items. Click "Add Item" to begin.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-sp2">
                    <button className="btn btn-ghost btn-sm" onClick={() => addLineItem(tk.id, rm.id)}>+ Add Item</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-sp3 gap-sp2" style={{ display: "flex" }}>
        <button className="btn btn-primary btn-sm" onClick={() => addRoom(tk.id)}>+ Add Area</button>
        {(tk.rooms || []).length === 0 && (
          <span className="fs-label c-text3" style={{ alignSelf: "center" }}>Add areas (floors, zones, rooms) to start building your estimate</span>
        )}
      </div>

      {/* bid summary — only show when there's actual data */}
      {/* ── Takeoff Totals (raw measurements — no markups) ── */}
      {summary.subtotal > 0 && (
        <div className="takeoff-summary mt-sp6">
          <h3 className="fs-secondary mb-sp3">Takeoff Totals</h3>
          <div className="d-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div className="summary-row"><span>Materials</span><span>{fmt(summary.matSub)}</span></div>
            <div className="summary-row"><span>Labor</span><span>{fmt(summary.labSub)}</span></div>
          </div>
          <div className="summary-row mt-sp1" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-1)" }}>
            <span>Raw Subtotal</span><span className="fw-bold">{fmt(summary.subtotal)}</span>
          </div>
        </div>
      )}

      {/* ── Bid Pricing (markups — this is the proposal/bid phase) ── */}
      {summary.subtotal > 0 && (
        <div className="takeoff-summary mt-sp4">
          <h3 className="fs-secondary mb-sp3">Bid Pricing</h3>
          <div className="flex gap-8 mb-sp3 flex-wrap" style={{ alignItems: "center" }}>
            {[
              { label: "Waste %", key: "wastePct", title: "Applied to materials only" },
              { label: "Labor Burden %", key: "laborBurdenPct", title: "Payroll taxes, workers comp, insurance — applied to labor only (typically 25-40%)" },
              { label: "Tax %", key: "taxRate", title: "Sales tax on materials (pass-through, applied AFTER markup)" },
              { label: "Overhead %", key: "overheadPct", title: "Applied to pre-tax cost" },
              { label: "Profit %", key: "profitPct", title: "Applied to cost+overhead, pre-tax" },
            ].map(({ label, key, title }) => (
              <div key={key} className="flex gap-8" style={{ alignItems: "center" }} title={title}>
                <label className="fs-label c-text2 nowrap">{label}</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  style={{ width: 72 }}
                  value={tk[key] ?? (key === "laborBurdenPct" ? 0 : 0)}
                  onChange={(e) => updateTakeoff(tk.id, { [key]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}
          </div>
          <div className="summary-row"><span>Waste on Materials ({tk.wastePct || 0}%)</span><span>{fmt(summary.wasteAmt)}</span></div>
          {(tk.laborBurdenPct || 0) > 0 && (
            <div className="summary-row"><span>Labor Burden ({tk.laborBurdenPct}%)</span><span>{fmt(summary.burdenAmt || 0)}</span></div>
          )}
          <div className="summary-row"><span>Overhead ({tk.overheadPct || 0}%)</span><span>{fmt(summary.overheadAmt)}</span></div>
          <div className="summary-row"><span>Profit ({tk.profitPct || 0}%)</span><span>{fmt(summary.profitAmt)}</span></div>
          <div className="summary-row"><span>Sales Tax on Materials ({tk.taxRate || 0}%) <span className="text-xs text-dim">(pass-through)</span></span><span>{fmt(summary.taxAmt)}</span></div>
          <div className="summary-row total"><span>BID TOTAL</span><span>{fmt(summary.grandTotal)}</span></div>
        </div>
      )}

      {/* ── Sanity Metrics Panel — $/SF, Labor$/SF, Hours/SF with historical comparison ── */}
      {summary.grandTotal > 0 && (() => {
        // Auto-fill SF from a matched project when the estimator hasn't typed one.
        // Safety: only match when project name is 10+ chars (avoids "1"/"a"/"2026" matching everything).
        const linkedBidName = (bids?.find(b => b.id === tk.bidId)?.name || tk.name || "").toLowerCase();
        const matchedProject = (projects || []).find(p => {
          const pn = (p.name || "").toLowerCase();
          if (!pn || pn.length < 10) return false;
          const core = pn.split(" - ")[1] || pn; // "Forney - BSLMC..." → "BSLMC..."
          return linkedBidName.includes(core.slice(0, 15)) || core.includes(linkedBidName.slice(0, 15));
        });
        const projectSfFallback = Number(matchedProject?.sqft || matchedProject?.squareFeet || 0);
        const sf = Number(tk.projectSF || projectSfFallback || 0);
        const sfSource = tk.projectSF ? "takeoff" : projectSfFallback ? `project "${matchedProject.name}"` : null;
        // Gather historical data from projects that have a contract + sf
        const historicals = (projects || []).filter(p => !p.deletedAt && (p.contract || 0) > 0 && (p.sqft || p.squareFeet || 0) > 0);
        const getHistoricalValue = (metric) => {
          if (historicals.length === 0) return null;
          const values = historicals.map(p => {
            const psf = Number(p.sqft || p.squareFeet || 0);
            if (psf <= 0) return null;
            if (metric === "costPerSF") return (p.contract || 0) / psf;
            if (metric === "laborPerSF") return ((p.laborSpent || p.laborActual || 0) || (p.contract || 0) * 0.45) / psf;
            return null;
          }).filter(v => v !== null && v > 0).sort((a, b) => a - b);
          if (values.length === 0) return null;
          return { median: values[Math.floor(values.length / 2)], min: values[0], max: values[values.length - 1], count: values.length };
        };
        const costPerSF = sf > 0 ? summary.grandTotal / sf : null;
        const laborPerSF = sf > 0 ? (summary.labWithBurden || summary.labSub) / sf : null;
        const avgLabRate = 45; // conservative Houston field rate; will be tunable per project
        const hoursPerSF = sf > 0 && avgLabRate > 0 ? ((summary.labWithBurden || summary.labSub) / avgLabRate) / sf : null;
        const histCost = getHistoricalValue("costPerSF");
        const histLabor = getHistoricalValue("laborPerSF");
        // Determine color based on ±20% deviation from historical median
        const checkDeviation = (value, historical) => {
          if (!historical || !value) return "neutral";
          const deviation = Math.abs((value - historical.median) / historical.median);
          if (deviation > 0.30) return "red";     // >30% off
          if (deviation > 0.20) return "amber";   // 20-30% off
          return "green";
        };
        const costStatus = checkDeviation(costPerSF, histCost);
        const laborStatus = checkDeviation(laborPerSF, histLabor);
        // LF-based sanity metrics — the primary check for drywall/framing takeoffs
        // ($/SF above is a macro/owner-view; $/LF is how the estimator verifies the work)
        const lfm = calcLFMetrics(tk, assemblies, summary, { avgLabRate });
        const statusColor = (s) => s === "red" ? "var(--red)" : s === "amber" ? "var(--amber)" : s === "green" ? "var(--green)" : "var(--text)";
        return (
          <div className="card dash-card mt-sp3" style={{ borderLeft: "3px solid var(--blue)" }}>
            <div className="flex-between mb-8">
              <div>
                <div className="text-sm font-semi">Sanity Check</div>
                {sfSource && sfSource !== "takeoff" && (
                  <div className="text-xs text-dim mt-2">SF inherited from {sfSource} · type to override</div>
                )}
              </div>
              <div className="flex gap-8" style={{ alignItems: "center" }}>
                <label className="fs-label c-text2 nowrap">Project SF:</label>
                <input className="form-input" type="number" step="1" style={{ width: 100 }}
                  value={tk.projectSF || ""}
                  onChange={(e) => updateTakeoff(tk.id, { projectSF: parseFloat(e.target.value) || 0 })}
                  placeholder={projectSfFallback ? String(projectSfFallback) : "0"} />
              </div>
            </div>
            {sf > 0 ? (
              <div className="grid-auto-180">
                <div className="activity-tile">
                  <div className="text-xs text-muted">$ / SF (Total)</div>
                  <div className="text-lg font-bold" style={{ color: costStatus === "red" ? "var(--red)" : costStatus === "amber" ? "var(--amber)" : "var(--text)" }}>
                    ${costPerSF?.toFixed(2) || "—"}
                  </div>
                  {histCost && (
                    <div className="text-xs text-dim">
                      Hist median: ${histCost.median.toFixed(2)} ({histCost.count} proj)
                      {costStatus === "red" && <span className="text-red"> · Way off</span>}
                      {costStatus === "amber" && <span className="text-amber"> · Check</span>}
                      {costStatus === "green" && <span className="text-green"> · In range</span>}
                    </div>
                  )}
                  {!histCost && <div className="text-xs text-dim">No historical data yet</div>}
                </div>
                <div className="activity-tile">
                  <div className="text-xs text-muted">Labor $ / SF</div>
                  <div className="text-lg font-bold" style={{ color: laborStatus === "red" ? "var(--red)" : laborStatus === "amber" ? "var(--amber)" : "var(--text)" }}>
                    ${laborPerSF?.toFixed(2) || "—"}
                  </div>
                  {histLabor && (
                    <div className="text-xs text-dim">
                      Hist median: ${histLabor.median.toFixed(2)}
                      {laborStatus === "red" && <span className="text-red"> · Way off</span>}
                      {laborStatus === "amber" && <span className="text-amber"> · Check</span>}
                      {laborStatus === "green" && <span className="text-green"> · In range</span>}
                    </div>
                  )}
                  {!histLabor && <div className="text-xs text-dim">No historical labor data</div>}
                </div>
                <div className="activity-tile">
                  <div className="text-xs text-muted">Labor Hours / SF</div>
                  <div className="text-lg font-bold">{hoursPerSF?.toFixed(3) || "—"}</div>
                  <div className="text-xs text-dim">@ ${avgLabRate}/hr avg rate</div>
                </div>
                <div className="activity-tile">
                  <div className="text-xs text-muted">Labor % of Total</div>
                  <div className="text-lg font-bold">{summary.grandTotal > 0 ? Math.round(((summary.labWithBurden || summary.labSub) / summary.grandTotal) * 100) : 0}%</div>
                  <div className="text-xs text-dim">Target: 40-55% for drywall/framing</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-dim p-sp2">Enter Project SF for macro $/SF check. LF metrics below work without it.</div>
            )}

            {/* ── LF-based sanity block — the primary check for drywall/framing ── */}
            {lfm.wall.wallLF > 0 && (
              <div className="mt-sp4" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
                <div className="text-xs text-muted mb-8" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Wall LF Check · {Math.round(lfm.wall.wallLF).toLocaleString()} LF of wall
                  {lfm.sums.ratedWallLF > 0 && <span className="c-text2"> · {Math.round(lfm.sums.ratedWallLF).toLocaleString()} LF rated</span>}
                </div>
                <div className="grid-auto-180">
                  <div className="activity-tile">
                    <div className="text-xs text-muted">$ / Wall LF</div>
                    <div className="text-lg font-bold">${lfm.wall.dollarsPerWallLF?.toFixed(2) || "—"}</div>
                    <div className="text-xs text-dim">bid total ÷ wall LF</div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Labor $ / Wall LF</div>
                    <div className="text-lg font-bold">${lfm.wall.laborPerWallLF?.toFixed(2) || "—"}</div>
                    <div className="text-xs text-dim">loaded labor ÷ wall LF</div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Hours / Wall LF</div>
                    <div className="text-lg font-bold">{lfm.wall.hoursPerWallLF?.toFixed(2) || "—"}</div>
                    <div className="text-xs text-dim">@ ${lfm.wall.avgLabRate}/hr avg rate</div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Labor % of Total</div>
                    <div className="text-lg font-bold">{summary.grandTotal > 0 ? Math.round(((summary.labWithBurden || summary.labSub) / summary.grandTotal) * 100) : 0}%</div>
                    <div className="text-xs text-dim">Target: 40-55% drywall/framing</div>
                  </div>
                </div>

                {/* Coverage ratios — catches forgotten scope */}
                <div className="text-xs text-muted mt-sp3 mb-8" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Coverage Ratios</div>
                <div className="grid-auto-180">
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Corner Bead</div>
                    <div className="text-lg font-bold" style={{ color: statusColor(lfm.ratios.cb.status) }}>
                      {Math.round(lfm.ratios.cb.actual)} LF
                    </div>
                    <div className="text-xs text-dim">
                      {lfm.ratios.cb.ratio !== null ? `${(lfm.ratios.cb.ratio * 100).toFixed(1)}% of wall · target 15%` : "—"}
                      {lfm.ratios.cb.status === "red" && <span className="text-red"> · Low</span>}
                      {lfm.ratios.cb.status === "amber" && <span className="text-amber"> · Check</span>}
                      {lfm.ratios.cb.status === "green" && <span className="text-green"> · OK</span>}
                    </div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Control Joints</div>
                    <div className="text-lg font-bold" style={{ color: statusColor(lfm.ratios.cj.status) }}>
                      {Math.round(lfm.ratios.cj.actual)} EA
                    </div>
                    <div className="text-xs text-dim">
                      target {lfm.ratios.cj.expected} · 1 per 30 LF
                      {lfm.ratios.cj.status === "red" && <span className="text-red"> · Low</span>}
                      {lfm.ratios.cj.status === "amber" && <span className="text-amber"> · Check</span>}
                      {lfm.ratios.cj.status === "green" && <span className="text-green"> · OK</span>}
                    </div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Fire Caulk</div>
                    <div className="text-lg font-bold" style={{ color: statusColor(lfm.ratios.fc.status) }}>
                      {Math.round(lfm.ratios.fc.actual)} LF
                    </div>
                    <div className="text-xs text-dim">
                      {lfm.ratios.fc.note || "—"}
                    </div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Door Frames</div>
                    <div className="text-lg font-bold">{Math.round(lfm.ratios.df.actual)} EA</div>
                    <div className="text-xs text-dim">typical ~{lfm.ratios.df.typical} · verify plan count</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Ceiling (RCP) block — only SF metric that belongs in drywall/framing ── */}
            {lfm.ceiling.ceilingSF > 0 && (
              <div className="mt-sp4" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
                <div className="text-xs text-muted mb-8" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Ceiling (RCP) Check · {Math.round(lfm.ceiling.ceilingSF).toLocaleString()} SF
                </div>
                <div className="grid-auto-180">
                  <div className="activity-tile">
                    <div className="text-xs text-muted">$ / Ceiling SF</div>
                    <div className="text-lg font-bold">${lfm.ceiling.dollarsPerCeilingSF?.toFixed(2) || "—"}</div>
                    <div className="text-xs text-dim">ceiling line totals ÷ SF</div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Labor $ / Ceiling SF</div>
                    <div className="text-lg font-bold">${lfm.ceiling.laborPerCeilingSF?.toFixed(2) || "—"}</div>
                    <div className="text-xs text-dim">ceiling labor ÷ SF</div>
                  </div>
                  <div className="activity-tile">
                    <div className="text-xs text-muted">Ceiling Total</div>
                    <div className="text-lg font-bold">${Math.round(lfm.ceiling.totals.total).toLocaleString()}</div>
                    <div className="text-xs text-dim">mat + labor pre-markup</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {(tk.rooms || []).length > 0 && summary.subtotal === 0 && (
        <div className="rounded-control fs-label mt-sp6 bg-bg3 c-text2" style={{ padding: "var(--space-3) var(--space-4)", border: "1px solid var(--border)" }}>
          Add quantities to your line items to see totals. Markups and bid pricing appear after you have measurements.
        </div>
      )}

      {/* Historical Comparison Panel */}
      {showHist && (
        <div className="takeoff-summary mt-sp4">
          <div className="flex-between mb-sp3">
            <h3 className="fs-secondary">Historical Comparison</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowHist(false); setHistResult(null); }}>Close</button>
          </div>
          {histLoading && <div className="text-sm text-muted p-sp4 text-center">Analyzing against {projects.length} historical projects...</div>}
          {histResult && (
            <div>
              {/* Summary */}
              <div className="rounded-control mb-sp3 p-sp3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="text-sm">{histResult.summary}</div>
              </div>

              {/* Margin Forecast */}
              {histResult.marginForecast && (
                <div className="mb-sp3 gap-sp2 d-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                  <div className="card p-sp3 text-center">
                    <div className="text-xs text-muted">Pessimistic</div>
                    <div className="fs-subtitle fw-bold c-red">{histResult.marginForecast.pessimistic}%</div>
                  </div>
                  <div className="card p-sp3 text-center">
                    <div className="text-xs text-muted">Expected</div>
                    <div className="fs-subtitle fw-bold c-amber">{histResult.marginForecast.expected}%</div>
                  </div>
                  <div className="card p-sp3 text-center">
                    <div className="text-xs text-muted">Optimistic</div>
                    <div className="fs-subtitle fw-bold c-green">{histResult.marginForecast.optimistic}%</div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {histResult.laborWarning && (
                <div className="rounded-control mb-sp2 fs-label p-sp3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)" }}>
                  <strong>Labor:</strong> {histResult.laborWarning}
                </div>
              )}
              {histResult.materialWarning && (
                <div className="rounded-control mb-sp2 fs-label p-sp3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid var(--amber)" }}>
                  <strong>Material:</strong> {histResult.materialWarning}
                </div>
              )}

              {/* Similar Projects */}
              {histResult.similarProjects?.length > 0 && (
                <div className="mb-sp3">
                  <div className="text-sm font-semi mb-8">Similar Past Projects</div>
                  {histResult.similarProjects.map((sp, i) => (
                    <div key={i} className="border-b fs-label" style={{ padding: "var(--space-2) 0" }}>
                      <div className="flex-between">
                        <span className="font-semi">{sp.name}</span>
                        <span className="fw-semi c-amber">{sp.similarity}% match</span>
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
                    <div key={i} className="rounded-control mb-sp2 fs-label p-sp2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div className="font-semi c-blue">{ins.category}</div>
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
      <div className="takeoff-summary mt-sp4">
        <h3 className="fs-secondary mb-sp3">Proposal PDF Options</h3>
        <label className="flex fs-label gap-sp2 cursor-pointer">
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
          <div className="takeoff-summary mt-sp4" style={{ border: "1px dashed var(--amber-dim)", background: "rgba(224,148,34,0.03)" }}>
            <div className="flex-between mb-sp3">
              <h3 className="fs-secondary c-amber">$ Profit Suggestions</h3>
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
                  display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) var(--space-3)", marginBottom: "var(--space-2)",
                  borderRadius: "var(--radius-control)", background: alreadyIn ? "var(--bg3)" : "var(--card)",
                  border: "1px solid var(--border)", opacity: alreadyIn ? 0.5 : 1,
                }}>
                  <div className="flex-1">
                    <div className="fw-semi fs-label">{sg.name} <span className="text-xs text-muted">({sg.code})</span></div>
                    <div className="text-xs text-muted">{sg.desc}</div>
                  </div>
                  <div className="text-right" style={{ minWidth: 80 }}>
                    <div className="fw-semi fs-label c-green">{fmt(estCost)}</div>
                    <div className="text-xs text-muted">{sg.basis === "subtotal" ? "lump sum" : `${autoQty} ${sg.unit}`}</div>
                  </div>
                  {alreadyIn ? (
                    <span className="badge badge-muted fs-xs">Added</span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm fs-tab c-amber" style={{ borderColor: "var(--amber-dim)" }}
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
      <div className="takeoff-summary mt-sp4">
        <div className="flex-between mb-sp3">
          <h3 className="fs-secondary">Alternates</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => updateTakeoff(tk.id, (prev) => ({
            ...prev,
            alternates: [...(prev.alternates || []), { id: "alt_" + Date.now(), description: "", amount: 0, type: "add" }]
          }))}>+ Add Alternate</button>
        </div>
        {(tk.alternates || []).length === 0 && (
          <p className="fs-label c-text3">No alternates. These appear as separate pricing options on the proposal.</p>
        )}
        {(tk.alternates || []).map((alt, i) => (
          <div key={alt.id} className="flex gap-8 mb-sp2 flex-wrap" style={{ alignItems: "center" }}>
            <span className="fw-semi fs-label" style={{ minWidth: 80 }}>Alt {i + 1}:</span>
            <select
              className="form-select"
              value={alt.type}
              className="fs-label" style={{ width: 90 }}
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
              className="fs-label flex-1" style={{ minWidth: 180 }}
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
              className="fs-label" style={{ width: 100 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                alternates: prev.alternates.map(a => a.id === alt.id ? { ...a, amount: parseFloat(e.target.value) || 0 } : a)
              }))}
            />
            <button
              className="btn btn-danger btn-sm fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}
              onClick={() => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                alternates: prev.alternates.filter(a => a.id !== alt.id)
              }))}
            >X</button>
          </div>
        ))}
      </div>

      {/* add-ons */}
      <div className="takeoff-summary mt-sp4">
        <div className="flex-between mb-sp3">
          <h3 className="fs-secondary">Add-Ons (Optional Scope)</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => updateTakeoff(tk.id, (prev) => ({
            ...prev,
            addOns: [...(prev.addOns || []), { id: "ao_" + Date.now(), description: "", amount: 0 }]
          }))}>+ Add Add-On</button>
        </div>
        {(tk.addOns || []).length === 0 && (
          <p className="fs-label c-text3">No add-ons. These appear as optional extras the client can choose to include.</p>
        )}
        {(tk.addOns || []).map((ao, i) => (
          <div key={ao.id} className="flex gap-8 mb-sp2 flex-wrap" style={{ alignItems: "center" }}>
            <span className="fw-semi fs-label" style={{ minWidth: 80 }}>Add-On {i + 1}:</span>
            <input
              className="form-input"
              placeholder="Description"
              value={ao.description}
              className="fs-label flex-1" style={{ minWidth: 180 }}
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
              className="fs-label" style={{ width: 100 }}
              onChange={(e) => updateTakeoff(tk.id, (prev) => ({
                ...prev,
                addOns: prev.addOns.map(a => a.id === ao.id ? { ...a, amount: parseFloat(e.target.value) || 0 } : a)
              }))}
            />
            <button
              className="btn btn-danger btn-sm fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}
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
          <div className="takeoff-summary mt-sp4">
            <h3 className="fs-secondary mb-sp3">Submittal Coverage</h3>
            <div className="summary-row">
              <span>Assembly codes with submittals</span>
              <span>{covered} / {total} ({pct}%)</span>
            </div>
            <div className="rounded-control mt-sp2 bg-bg4 overflow-hidden" style={{ height: 6 }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "var(--radius-control)", background: pct === 100 ? "var(--green)" : "var(--amber)", transition: "width 0.3s" }} />
            </div>
            {uncovered.length > 0 && (
              <div className="fs-label mt-sp2 c-text3">
                Missing: {uncovered.map(c => (
                  <span key={c} className="badge-amber mr-sp1 fs-xs">{c}</span>
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
          apiKey={app.apiKey}
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
    padding: "var(--space-4)",
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
        <div className="border-b" style={{ padding: "var(--space-4) var(--space-5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="fw-bold fs-card">Scope Review — {tk.name}</div>
            <div className="fs-label mt-sp1 c-text3">Step {step} of 2</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} className="fs-card" style={{ padding: "var(--space-1) var(--space-2)" }}>X</button>
        </div>

        {/* ── STEP 1: Checklist ── */}
        {step === 1 && (
          <div className="p-sp5">
            {/* Template selector */}
            <div className="flex mb-sp3 gap-sp2">
              <label className="fs-label c-text2 nowrap">Quick template:</label>
              <select
                className="form-select fs-label" style={{ padding: "var(--space-1) var(--space-2)", maxWidth: 200 }}
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
            <div className="mb-sp4">
              <div className="flex-between mb-sp2 fs-label">
                <span>{reviewed}/{total} reviewed</span>
                <span style={{ color: reviewed === total ? "var(--green)" : "var(--amber)" }}>{Math.round((reviewed / total) * 100)}%</span>
              </div>
              <div className="rounded-control bg-bg4 overflow-hidden" style={{ height: 6 }}>
                <div style={{ width: `${(reviewed / total) * 100}%`, height: "100%", borderRadius: "var(--radius-control)", background: reviewed === total ? "var(--green)" : "var(--amber)", transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Checklist items */}
            <div className="mb-sp4" style={{ maxHeight: "55vh", overflowY: "auto" }}>
              {localChecklist.map(s => {
                const mapEntry = SCOPE_ITEM_MAP[s.id];
                return (
                  <div
                    key={s.id}
                    onClick={() => handleChecklistCycle(s.id)}
                    style={{
                      padding: "var(--space-3) var(--space-3)", marginBottom: "var(--space-2)", borderRadius: "var(--radius-sm)",
                      background: s.status === "checked" ? "rgba(16,185,129,0.06)" : s.status === "flagged" ? "rgba(234,179,8,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${s.status === "checked" ? "rgba(16,185,129,0.15)" : s.status === "flagged" ? "rgba(234,179,8,0.15)" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <div className="items-start gap-sp3" style={{ display: "flex" }}>
                      <span className="fs-section flex-shrink-0" style={{ lineHeight: 1 }}>{SCOPE_ICONS[s.status]}</span>
                      <div className="flex-1">
                        <div className="fs-secondary fw-semi">{s.title}</div>
                        <div className="fs-label mt-sp1 c-text2">{s.desc}</div>
                        {mapEntry && (
                          <div className="fs-tab mt-sp1 c-text3" style={{ fontStyle: "italic" }}>
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
            <div className="gap-sp2" style={{ display: "flex", justifyContent: "flex-end" }}>
              {reviewed < total && (
                <div className="fs-label c-amber" style={{ alignSelf: "center", marginRight: "auto" }}>
                  {total - reviewed} item{total - reviewed !== 1 ? "s" : ""} still unchecked
                </div>
              )}
              <button className="btn btn-primary" onClick={goToStep2} className="fs-secondary" style={{ padding: "var(--space-2) var(--space-5)" }}>
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Edit Proposal Scope ── */}
        {step === 2 && editLines && (
          <div className="p-sp5">
            {/* Section renderer */}
            {[
              { key: "includes", label: "INCLUDES", color: "var(--green)" },
              { key: "excludes", label: "EXCLUDES", color: "var(--red)" },
              { key: "assumptions", label: "ASSUMPTIONS / QUALIFICATIONS", color: "var(--amber)" },
            ].map(({ key, label, color }) => (
              <div key={key} className="mb-sp5">
                <div className="fs-secondary fw-bold mb-sp2" style={{ color, letterSpacing: 0.5 }}>{label}</div>
                {editLines[key].map((line, i) => (
                  <div key={i} className="mb-sp1 gap-sp2" style={{ display: "flex", alignItems: "center" }}>
                    <span className="fs-tab c-text3 text-right" style={{ minWidth: 20 }}>{i + 1}.</span>
                    <input
                      className="form-input"
                      value={line}
                      onChange={e => updateLine(key, i, e.target.value)}
                      className="fs-label flex-1" style={{ padding: "var(--space-1) var(--space-2)" }}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteLine(key, i)}
                      className="fs-secondary c-red" style={{ padding: "var(--space-1) var(--space-2)", lineHeight: 1 }}
                      title="Remove"
                    >x</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addLine(key)} className="fs-label mt-sp1">+ Add</button>
              </div>
            ))}

            {/* Proposal metadata fields */}
            <div className="mt-sp2" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
              <div className="gap-sp3 d-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="form-group">
                  <label className="form-label fs-label">Proposal Number</label>
                  <input className="form-input" value={proposalNum} onChange={e => setProposalNum(e.target.value)} className="fs-label" />
                </div>
                <div className="form-group">
                  <label className="form-label fs-label">Drawing Reference</label>
                  <input className="form-input" value={drawingRef} onChange={e => setDrawingRef(e.target.value)} placeholder="e.g. A1.01 - A4.02, Rev 3" className="fs-label" />
                </div>
              </div>
              <div className="form-group mt-sp2">
                <label className="form-label fs-label">Payment Terms</label>
                <input className="form-input" value={terms.paymentTerms} onChange={e => setTerms(t => ({ ...t, paymentTerms: e.target.value }))} className="fs-label" />
              </div>
              <div className="form-group mt-sp2">
                <label className="form-label fs-label">Warranty</label>
                <input className="form-input" value={terms.warranty} onChange={e => setTerms(t => ({ ...t, warranty: e.target.value }))} className="fs-label" />
              </div>
              <div className="form-group mt-sp2">
                <label className="form-label fs-label">Change Order Language</label>
                <input className="form-input" value={terms.changeOrders} onChange={e => setTerms(t => ({ ...t, changeOrders: e.target.value }))} className="fs-label" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-sp5 gap-sp2" style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} className="fs-label">
                &larr; Back to Checklist
              </button>
              <button
                className="btn"
                onClick={handleSaveExport}
                className="fs-secondary fw-bold c-white" style={{ background: "var(--amber)", padding: "var(--space-3) var(--space-6)" }}
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
      className="cursor-pointer" style={{ ...style, borderBottom: "1px dashed var(--border2)" }}
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
    <div className="room-header flex-between" onClick={onToggle} className="cursor-pointer">
      <div className="flex gap-8" style={{ alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-secondary)", fontWeight: "var(--weight-semi)", transform: isOpen ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>
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
            {rm.floor && <span className="fs-label ml-sp2 c-text2">({rm.floor})</span>}
          </span>
        )}
      </div>
      <div className="flex gap-8 fs-label" style={{ alignItems: "center" }}>
        <span className="c-text2">{(rm.items || []).length} item{(rm.items || []).length !== 1 ? "s" : ""}</span>
        <span className="fw-semi c-amber text-right" style={{ minWidth: 80 }}>{fmt(roomTotal)}</span>
        <button
          className="btn btn-ghost btn-sm"
          title="Edit room"
          onClick={(e) => {
            e.stopPropagation();
            setNameVal(rm.name);
            setFloorVal(rm.floor);
            setEditingName(true);
          }}
          style={{ padding: "var(--space-1) var(--space-2)" }}
        >
          Edit
        </button>
        <button
          className="btn btn-danger btn-sm"
          title="Delete room"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{ padding: "var(--space-1) var(--space-2)" }}
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
  const [importing, setImporting] = useState(false);

  const handleImportPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await extractPdfText(file);
      const data = parseProposalFromText(text);
      if (data.projectName) setProjectName(data.projectName);
      if (data.projectAddress) setProjectAddress(data.projectAddress);
      if (data.gcName) setGcName(data.gcName);
      if (data.lineItems?.length > 0) setLineItems(data.lineItems);
      if (data.alternates?.length > 0) setAlternates(data.alternates);
      if (data.includes?.length > 0) setIncludes(data.includes);
      if (data.excludes?.length > 0) setExcludes(data.excludes);
      if (data.notes) setNotes(data.notes);
      show("Proposal imported — review the fields below", "ok");
    } catch (err) {
      if (err.message === "EMPTY_TEXT") show("Could not read PDF — try a different file", "err");
      else show("Import failed — " + (err.message || "unknown error"), "err");
    }
    setImporting(false);
    e.target.value = "";
  };

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
      <div className="modal-content" onClick={e => e.stopPropagation()} className="overflow-auto" style={{ maxWidth: 720, maxHeight: "92vh" }}>
        <div className="flex-between mb-12">
          <h3 className="section-title" style={{ margin: "0" }}>Quick Proposal</h3>
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

        {/* Import from PDF */}
        <div className="mb-12" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label className="btn btn-sm btn-ghost" style={{ cursor: importing ? "wait" : "pointer", opacity: importing ? 0.5 : 1 }}>
            <Upload size={14} className="mr-sp1" />
            {importing ? "Importing..." : "Import from PDF"}
            <input type="file" accept=".pdf" onChange={handleImportPdf} disabled={importing}
              style={{ display: "none" }} />
          </label>
          {importing && <span className="text-xs" style={{ opacity: 0.5 }}>Extracting proposal data...</span>}
        </div>

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
            <label className="form-label fw-bold" style={{ margin: "0" }}>Scope Line Items</label>
            <button className="btn btn-sm btn-ghost" onClick={addLineItem}>+ Add Line</button>
          </div>
          {lineItems.map((item, i) => (
            <div key={i} className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
              <input className="form-input" style={{ flex: 2 }} value={item.description}
                onChange={e => updateLineItem(i, "description", e.target.value)}
                placeholder="e.g. Demolition" />
              <input className="form-input text-right flex-1" value={item.amount}
                onChange={e => updateLineItem(i, "amount", e.target.value)}
                placeholder="$0" type="number" />
              {lineItems.length > 1 && (
                <button className="btn btn-sm btn-danger" onClick={() => removeLineItem(i)} style={{ padding: "var(--space-1) var(--space-2)" }}>✕</button>
              )}
            </div>
          ))}
          <div className="fw-bold fs-card mt-sp2 text-right" style={{ color: "var(--accent)" }}>
            Total: {fmtMoney(total)}
          </div>
        </div>

        {/* Alternates */}
        <div className="mb-12">
          <div className="flex-between mb-8">
            <label className="form-label fw-bold" style={{ margin: "0" }}>Alternates</label>
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
              <input className="form-input text-right flex-1" value={alt.amount}
                onChange={e => updateAlternate(i, "amount", e.target.value)}
                placeholder="$0" type="number" />
              <button className="btn btn-sm btn-danger" onClick={() => removeAlternate(i)} style={{ padding: "var(--space-1) var(--space-2)" }}>✕</button>
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
            <div className="card p-sp3" style={{ maxHeight: 240, overflowY: "auto" }}>
              <div className="flex-between mb-8">
                <span className="text-sm font-semi">Includes</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setIncludes(prev => [...prev, ""])}>+ Add</button>
              </div>
              {includes.map((line, i) => (
                <div key={i} className="flex gap-4 mb-4" style={{ alignItems: "center" }}>
                  <span className="text-xs text-right opacity-50" style={{ width: 20 }}>{i + 1}.</span>
                  <input className="form-input fs-label flex-1" value={line}
                    onChange={e => setIncludes(prev => prev.map((l, idx) => idx === i ? e.target.value : l))} />
                  <button className="btn btn-sm btn-danger" onClick={() => setIncludes(prev => prev.filter((_, idx) => idx !== i))}
                    className="fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {editSection === "excludes" && (
            <div className="card p-sp3" style={{ maxHeight: 240, overflowY: "auto" }}>
              <div className="flex-between mb-8">
                <span className="text-sm font-semi">Excludes</span>
                <button className="btn btn-sm btn-ghost" onClick={() => setExcludes(prev => [...prev, ""])}>+ Add</button>
              </div>
              {excludes.map((line, i) => (
                <div key={i} className="flex gap-4 mb-4" style={{ alignItems: "center" }}>
                  <span className="text-xs text-right opacity-50" style={{ width: 20 }}>{i + 1}.</span>
                  <input className="form-input fs-label flex-1" value={line}
                    onChange={e => setExcludes(prev => prev.map((l, idx) => idx === i ? e.target.value : l))} />
                  <button className="btn btn-sm btn-danger" onClick={() => setExcludes(prev => prev.filter((_, idx) => idx !== i))}
                    className="fs-tab" style={{ padding: "var(--space-1) var(--space-2)" }}>✕</button>
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
          <div className="mb-12 rounded-control p-sp3" style={{ background: "var(--bg-success, #f0fdf4)", border: "1px solid var(--border-success, #bbf7d0)" }}>
            <div className="text-sm font-semi mb-8" style={{ color: "var(--accent)" }}>
              PDF Ready: {generatedPdf.fileName}
            </div>
            <div className="flex gap-8 flex-wrap">
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
        <div className="flex-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
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
