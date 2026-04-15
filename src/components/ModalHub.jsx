import { useState, useRef, useEffect, useMemo, useCallback, Fragment } from "react";
import { AlertTriangle, BarChart2, Camera, CheckSquare, Square, Clipboard, ClipboardList, FileDown, FileText, FolderOpen, HardHat, Image, MapPin, MessageSquare, Paperclip, Pin, PinOff, Search, Volume2 } from "lucide-react";
import { softDelete, filterActive, getAdjustedContract, computeProjectTotalCost, computeProjectLaborCost } from "../utils/financialValidation";
import { AreasTab } from "../tabs/AreasTab";
import { PunchListTab } from "../tabs/PunchListTab";
import { DecisionLogTab } from "../tabs/DecisionLogTab";
import { PhaseTracker, getDefaultPhases } from "./PhaseTracker";
import { PerimeterMapModal } from "./PerimeterMapModal";
import { PPE_ITEMS, PERMIT_TYPES } from "../data/jsaConstants";
import { SUBMITTAL_CATEGORIES } from "../data/constants";
import SOVEditor from "./SOVEditor";

// ═══════════════════════════════════════════════════════════════
//  EBC-OS · ModalHub — Bid/Project/Contact edit modals
//  Extracted Sprint 9.2 from App.jsx
// ═══════════════════════════════════════════════════════════════

// Construction stages — shared with App.jsx
const CONSTRUCTION_STAGES = [
  { key: "pre-con", label: "Pre-Con", color: "var(--purple)", owner: "pm", progress: 5 },
  { key: "mobilize", label: "Mobilize", color: "var(--blue)", owner: "pm", progress: 10 },
  { key: "demo", label: "Demo", color: "var(--red)", owner: "foreman", progress: 20 },
  { key: "framing", label: "Framing", color: "var(--amber)", owner: "foreman", progress: 40 },
  { key: "board", label: "Board", color: "#f97316", owner: "foreman", progress: 60 },
  { key: "tape", label: "Tape/Finish", color: "var(--green)", owner: "foreman", progress: 80 },
  { key: "punch", label: "Punch", color: "var(--cyan)", owner: "pm", progress: 90 },
  { key: "closeout", label: "Closeout", color: "var(--blue)", owner: "pm", progress: 100 },
];
const STAGE_MAP = Object.fromEntries(CONSTRUCTION_STAGES.map(s => [s.key, s]));

const SCOPE_OPTIONS = [
  "Metal Framing", "GWB", "ACT", "Demo", "Lead-Lined", "ICRA", "Insulation",
  "L5 Finish", "Deflection Track", "Seismic ACT", "FRP", "Fireproofing", "Shaft Wall"
];

const ModalHub = ({ type, data, app }) => {
  const { setModal, show, fmt, t } = app;
  const isNew = !data || !data.id;
  const [aiText, setAiText] = useState("");
  const [punchAdding, setPunchAdding] = useState(false);
  const [punchForm, setPunchForm] = useState({ description: "", location: "", assignedTo: "", priority: "med" });
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [pdfScanning, setPdfScanning] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [emailImportText, setEmailImportText] = useState("");

  const parseEmailBid = () => {
    const text = emailImportText;
    if (!text.trim()) { show("Paste an email body first", "err"); return; }

    const first = (patterns) => {
      for (const re of patterns) {
        const m = text.match(re);
        if (m && m[1]) return m[1].trim().replace(/\s+/g, " ");
      }
      return "";
    };

    const name = first([
      /(?:project[:\s]+|re[:\s]+(?:bid (?:invite|invitation|request)|invitation to bid)[:\s]+)([^\n|,–—]{4,80})/i,
      /project name[:\s]+([^\n,]{4,80})/i,
      /ITB[:\s#]+([^\n,]{4,80})/i,
      /subject[:\s]+.*?(?:bid|invite|invitation)[:\s]+([^\n,]{4,80})/i,
      /for[:\s]+([A-Z][^\n]{10,70}(?:hospital|medical|school|center|tower|building|facility|project)[^\n]{0,30})/i,
    ]);

    const gc = first([
      /(?:from[:\s]+|invited by[:\s]+|general contractor[:\s]+|gc[:\s]+|on behalf of[:\s]+)([A-Za-z][^\n,–—]{2,60})/i,
      /([A-Z][a-zA-Z\s]+(?:Construction|Contractors?|Builders?|Building|Group|Corp|Inc|LLC|LP|Co\.|Company))/,
      /invited to bid (?:for|on) .+ (?:by|from) ([A-Za-z][^\n,]{2,50})/i,
    ]);

    const due = first([
      /(?:bid due|due date|bid date|submission deadline|bids? (?:are )?due)[:\s]+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:due|deadline)[:\s]+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    ]);

    const address = first([
      /(?:project (?:location|address|site)|location|address|site)[:\s]+([^\n]{8,80}(?:st|ave|blvd|dr|rd|way|pkwy|ln|houston|tx)[^\n]{0,40})/i,
      /(\d{3,5}\s+[A-Z][^\n]{5,60}(?:St\.?|Ave\.?|Blvd\.?|Dr\.?|Rd\.?|Way|Pkwy)[^\n]{0,30})/i,
    ]);

    const scopeRaw = first([
      /(?:scope of work|work scope|work includes?|bid includes?)[:\s]+([^\n]{10,200}(?:\n[^\n]{0,100}){0,4})/i,
      /(?:work type|trade|division)[:\s]+([^\n]{5,100})/i,
    ]);

    const scopeTags = [];
    const scopeLower = (scopeRaw + " " + text).toLowerCase();
    if (scopeLower.includes("metal fram") || scopeLower.includes("light gauge") || scopeLower.includes("stud") || scopeLower.includes("framing")) scopeTags.push("Metal Framing");
    if (scopeLower.includes("drywall") || scopeLower.includes("gwb") || scopeLower.includes("gypsum")) scopeTags.push("GWB");
    if (scopeLower.includes("ceiling") || scopeLower.includes("act") || scopeLower.includes("acoustical")) scopeTags.push("ACT");
    if (scopeLower.includes("demo") || scopeLower.includes("demolit")) scopeTags.push("Demo");
    if (scopeLower.includes("insul")) scopeTags.push("Insulation");
    if (scopeLower.includes("fireproof") || scopeLower.includes("firestop")) scopeTags.push("Fireproofing");
    if (scopeLower.includes("lead")) scopeTags.push("Lead-Lined");
    if (scopeLower.includes("frp") || scopeLower.includes("fiberglass")) scopeTags.push("FRP");
    if (scopeLower.includes("icra") || scopeLower.includes("infection control")) scopeTags.push("ICRA");
    if (scopeLower.includes("l5") || scopeLower.includes("level 5") || scopeLower.includes("level-5")) scopeTags.push("L5 Finish");
    if (scopeLower.includes("shaft wall")) scopeTags.push("Shaft Wall");

    setDraft(d => ({
      ...d,
      name: name || d.name,
      gc: gc || d.gc,
      due: due || d.due,
      address: address || d.address,
      scope: scopeTags.length > 0 ? scopeTags : d.scope,
      notes: scopeRaw ? (d.notes ? d.notes + "\n" + scopeRaw : scopeRaw) : d.notes,
    }));
    setShowEmailImport(false);
    setEmailImportText("");
    show("Email parsed — review and adjust fields", "ok");
  };
  const [quickContact, setQuickContact] = useState(null); // inline add-contact from bid form
  const [contactFilter, setContactFilter] = useState("");
  const [contactDropOpen, setContactDropOpen] = useState(false);
  const [gcFilter, setGcFilter] = useState("");
  const [gcDropOpen, setGcDropOpen] = useState(false);
  const [showPerimeterMap, setShowPerimeterMap] = useState(false);
  const [dupWarning, setDupWarning] = useState(null); // { pm, bidName } — bid dup alert

  // ── Shared: Sound Testing / Site Logistics / Notes ──
  const [soundForm, setSoundForm] = useState({ roomType: "office", roomLabel: "", wallDetails: "", wallLF: "" });
  const [showSoundForm, setShowSoundForm] = useState(false);
  const [projectNotes, setProjectNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_projectNotes") || "[]"); } catch { return []; }
  });
  const [noteText, setNoteText] = useState("");
  const [notesFilter, setNotesFilter] = useState("all");
  const [siteLogistics, setSiteLogistics] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ebc_siteLogistics") || "{}"); } catch { return {}; }
  });
  const saveProjectNotes = (notes) => {
    localStorage.setItem("ebc_projectNotes", JSON.stringify(notes));
    setProjectNotes(notes);
  };
  const saveSiteLogistics = (log) => {
    localStorage.setItem("ebc_siteLogistics", JSON.stringify(log));
    setSiteLogistics(log);
  };

  const getInitial = () => {
    switch (type) {
      case "editBid":
        return data ? { ...data } : {
          name: "", gc: "", value: 0, due: "", status: "invite_received",
          scope: [], sector: "", risk: "Med", notes: "", contact: "",
          address: "", attachments: [], estimator: app.auth?.name || "", exclusions: "",
          plansUploaded: false, addendaCount: 0, proposalStatus: "",
          followUpDate: "", lastFollowUp: "", followUpLog: [], lastActivityDate: new Date().toISOString().slice(0, 10),
          priority: "", lostReason: "", noBidReason: "", activityLog: []
        };
      case "editProject":
        return data ? { ...data } : {
          name: "", gc: "", contract: 0, billed: 0, progress: 0,
          phase: "", start: "", end: "", pm: "", address: "",
          suite: "", parking: "", lat: "", lng: "",
          closeOut: "", attachments: [], assignedForeman: null
        };
      case "editContact":
        return data ? { ...data } : {
          name: "", company: "", role: "", phone: "", email: "",
          priority: "med", notes: "", bids: 0, wins: 0, color: "var(--blue)", last: "Never"
        };
      case "logCall":
        return { contact: "", company: "", note: "", next: "", time: new Date().toLocaleString() };
      case "viewBid":
        return data || {};
      case "viewProject":
        return data || {};
      default:
        return data || {};
    }
  };

  const [draft, setDraft] = useState(getInitial);

  const upd = (field, val) => setDraft(d => ({ ...d, [field]: val }));

  const toggleScopeTag = (tag) => {
    setDraft(d => {
      const arr = d.scope || [];
      return { ...d, scope: arr.includes(tag) ? arr.filter(s => s !== tag) : [...arr, tag] };
    });
  };

  const handlePdfScan = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      show("Please select a PDF file", "err");
      return;
    }
    setPdfScanning(true);
    try {
      const { extractBidFromPdf } = await import("../utils/pdfBidExtractor.js");
      const extracted = await extractBidFromPdf(file);

      // Pre-fill draft fields (only overwrite if extracted value is non-empty)
      // Also persist structured proposal data so "Create Proposal" can use it
      const proposalData = {
        lineItems: (extracted.lineItems || []).map(li => ({ description: li.label || li.description || "", amount: String(li.amount || 0) })),
        alternates: (extracted.alternates || []).map(a => ({ description: a.description || "", type: a.type === "deduct" ? "deduct" : "add", amount: String(a.amount || 0) })),
        includes: Array.isArray(extracted.includes) ? extracted.includes.filter(Boolean) : [],
        excludes: Array.isArray(extracted.excludes) ? extracted.excludes.filter(Boolean) : [],
      };
      setDraft(d => ({
        ...d,
        name: extracted.name || d.name,
        gc: extracted.gc || d.gc,
        value: extracted.value || d.value,
        due: extracted.due || d.due,
        bidDate: extracted.bidDate || d.bidDate,
        phase: extracted.phase || d.phase,
        address: extracted.address || d.address,
        scope: extracted.scope.length > 0 ? extracted.scope : d.scope,
        notes: extracted.notes || d.notes,
        month: extracted.month || d.month,
        proposalData,
      }));

      // Also store the PDF as an attachment
      const reader = new FileReader();
      reader.onload = () => {
        const attachment = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type || "application/pdf",
          size: file.size,
          data: reader.result,
          uploaded: new Date().toISOString(),
        };
        setDraft(d => ({ ...d, attachments: [...(d.attachments || []), attachment] }));
      };
      reader.readAsDataURL(file);

      show(`Extracted: ${extracted.name || "bid"} — $${(extracted.value || 0).toLocaleString()} — review fields`, "ok");
    } catch (err) {
      console.error("[pdf-scan]", err);
      show("PDF scan failed: " + (err.message || "Unknown error"), "err");
    } finally {
      setPdfScanning(false);
    }
  };

  // ── Create Proposal: transform bid data → EBC-branded proposal PDF ──
  const handleCreateProposal = async () => {
    if (!draft.name) { show("Enter a bid name first", "err"); return; }

    // Prefer stored proposalData; fall back to parsing notes text
    let li = draft.proposalData?.lineItems;
    let alt = draft.proposalData?.alternates;
    let inc = draft.proposalData?.includes;
    let exc = draft.proposalData?.excludes;

    if ((!li || li.length === 0) && draft.notes) {
      // Parse LINE ITEMS from notes: "LINE ITEMS: Demo: $2,500 | Drywall: $15,500"
      const liMatch = draft.notes.match(/LINE ITEMS(?:\s*\([^)]*\))?\s*:\s*([^\n]+)/i);
      if (liMatch) {
        li = liMatch[1].split("|").map(s => {
          const m = s.match(/^\s*(.+?):\s*\$?([\d,]+)/);
          return m ? { description: m[1].trim(), amount: m[2].replace(/,/g, "") } : null;
        }).filter(Boolean);
      }
      // Parse ALTERNATE(S)
      const altMatch = draft.notes.match(/ALTERNATE\(?S?\)?\s*:\s*([^\n]+)/i);
      if (altMatch) {
        alt = altMatch[1].split("|").map(s => {
          const m = s.match(/^\s*(.+?)\s*\((ADD|DEDUCT)(?:\s+\$?([\d,]+))?\)/i);
          return m ? { description: m[1].trim(), type: m[2].toLowerCase(), amount: (m[3] || "0").replace(/,/g, "") } : null;
        }).filter(Boolean);
      }
      // Parse INCLUDES / EXCLUDES
      const incMatch = draft.notes.match(/INCLUDES\s*:\s*([^\n]+)/i);
      if (incMatch && (!inc || inc.length === 0)) inc = incMatch[1].split(";").map(s => s.trim()).filter(Boolean);
      const excMatch = draft.notes.match(/EXCLUDES\s*:\s*([^\n]+)/i);
      if (excMatch && (!exc || exc.length === 0)) exc = excMatch[1].split(";").map(s => s.trim()).filter(Boolean);
    }

    // If still no line items, create a single line item from the total value
    if (!li || li.length === 0) {
      if (draft.value) {
        li = [{ description: draft.name, amount: String(draft.value) }];
      } else {
        show("No line items found — add pricing in Notes or re-scan the PDF", "err");
        return;
      }
    }

    try {
      const { generateQuickProposalPdf } = await import("../utils/proposalPdf.js");
      const result = await generateQuickProposalPdf({
        projectName: draft.name,
        projectAddress: draft.address || "",
        gcName: draft.gc || "",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        lineItems: li.filter(i => i.description && i.amount),
        alternates: (alt || []).filter(a => a.description && a.amount),
        includes: inc || [],
        excludes: exc || [],
        notes: "",
      });
      const blobUrl = URL.createObjectURL(result.blob);
      window.open(blobUrl, "_blank");
      show(`Proposal generated: ${result.fileName}`, "ok");
    } catch (err) {
      console.error("[create-proposal]", err);
      show("Proposal generation failed: " + (err.message || "Unknown error"), "err");
    }
  };

  const handleSave = () => {
    switch (type) {
      case "editBid": {
        if (!draft.name) { show("Bid name is required", "err"); return; }
        if (!draft.gc) { show("GC name is required", "err"); return; }
        if (draft.value && isNaN(Number(draft.value))) { show("Value must be a number", "err"); return; }
        const bidWithActivity = { ...draft, lastActivityDate: new Date().toISOString().slice(0, 10) };
        if (isNew) {
          app.setBids(prev => [...prev, { ...bidWithActivity, id: app.nextId() }]);
          show("Bid added");
        } else {
          // If status was changed to "awarded" via the dropdown, auto-convert to project
          const wasPreviouslyAwarded = data && data.status === "awarded";
          if (bidWithActivity.status === "awarded" && !wasPreviouslyAwarded) {
            // Check if project already exists for this bid
            if (!app.projects.some(p => p.bidId === bidWithActivity.id)) {
              const awardedBid = { ...bidWithActivity, convertedToProject: true };
              app.setBids(prev => prev.map(b => b.id === draft.id ? awardedBid : b));
              // Phase 3: carry scope detail + takeoff summary at award
              const linkedTakeoff = (app.takeoffs || []).find(tk => tk.bidId === awardedBid.id);
              const newProject = {
                id: app.nextId(),
                name: awardedBid.name,
                gc: awardedBid.gc,
                contract: awardedBid.value || 0,
                originalBidValue: awardedBid.value || 0,
                billed: 0, progress: 0,
                phase: awardedBid.phase || awardedBid.sector || "",
                start: awardedBid.due || "",
                end: "", pm: awardedBid.estimator || "",
                laborBudget: 0, laborHours: 0,
                address: awardedBid.address || "",
                attachments: awardedBid.attachments || [],
                bidId: awardedBid.id,
                notes: awardedBid.notes || "",
                scope: awardedBid.scope || [],
                exclusions: awardedBid.exclusions || "",
                sector: awardedBid.sector || "",
                contact: awardedBid.contact || "",
                assignedForeman: awardedBid.assignedForeman || null,
                needsPlans: true,
                plansRequestedAt: null,
                contractType: "lump_sum",
                retainageRate: 10,
                // Takeoff snapshot for est vs. actual
                takeoffSummary: linkedTakeoff ? {
                  totalSF: linkedTakeoff.rooms?.reduce((s, r) => s + (r.items || []).reduce((is, i) => is + (i.totalSF || i.qty || 0), 0), 0) || 0,
                  roomCount: linkedTakeoff.rooms?.length || 0,
                  grandTotal: linkedTakeoff.grandTotal || 0,
                  snapshotAt: new Date().toISOString(),
                } : null,
              };
              app.setProjects(prev => [...prev, newProject]);
              show(`Bid awarded! Project "${bidWithActivity.name}" created — request construction plans from ${bidWithActivity.gc || "the GC"}`, 6000);
            } else {
              app.setBids(prev => prev.map(b => b.id === bidWithActivity.id ? { ...bidWithActivity, convertedToProject: true } : b));
              show("Bid awarded! Project already exists.");
            }
          } else {
            app.setBids(prev => prev.map(b => b.id === bidWithActivity.id ? { ...bidWithActivity } : b));
            show("Bid updated");
          }
        }
        break;
      }
      case "editProject": case "viewProject": {
        if (!draft.name) { show("Project name is required", "err"); return; }
        if (!draft.gc) { show("GC name is required", "err"); return; }
        if (isNew) {
          app.setProjects(prev => [...prev, { ...draft, id: app.nextId() }]);
          show("Project added");
        } else {
          app.setProjects(prev => prev.map(p => p.id === draft.id ? { ...draft } : p));
          show("Project updated");
        }
        break;
      }
      case "editContact": {
        if (!draft.name) { show("Contact name is required", "err"); return; }
        if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) { show("Invalid email format", "err"); return; }
        if (draft.phone && !/^[\d\s\-().+]+$/.test(draft.phone)) { show("Invalid phone format", "err"); return; }
        if (isNew) {
          app.setContacts(prev => [...prev, { ...draft, id: app.nextId() }]);
          show("Contact added");
        } else {
          app.setContacts(prev => prev.map(c => c.id === draft.id ? { ...draft } : c));
          show("Contact updated");
        }
        break;
      }
      case "logCall": {
        if (!draft.contact || !draft.note) { show("Contact and note required", "err"); return; }
        const contact = app.contacts.find(c => c.name === draft.contact);
        app.setCallLog(prev => [
          { ...draft, id: app.nextId(), company: contact?.company || draft.company, time: draft.time },
          ...prev
        ]);
        show("Call logged");
        break;
      }
      default:
        break;
    }
    setModal(null);
  };

  // ── Award / Un-award a bid ──
  const handleAwardBid = () => {
    if (!draft.id || !draft.name) return;
    // Don't create duplicate project if already linked
    if (app.projects.some(p => p.bidId === draft.id)) {
      const awardedBid = { ...draft, status: "awarded", convertedToProject: true };
      app.setBids(prev => prev.map(b => b.id === awardedBid.id ? awardedBid : b));
      show("Bid awarded! Project already exists.");
      setModal(null);
      return;
    }
    // Update bid status to "awarded" and mark as converted
    const awardedBid = { ...draft, status: "awarded", convertedToProject: true };
    app.setBids(prev => prev.map(b => b.id === awardedBid.id ? awardedBid : b));
    // Create project from bid data
    const newProject = {
      id: app.nextId(),
      name: awardedBid.name,
      gc: awardedBid.gc,
      contract: awardedBid.value || 0,
      billed: 0,
      progress: 0,
      phase: awardedBid.phase || awardedBid.sector || "",
      start: awardedBid.due || "",
      end: "",
      pm: awardedBid.estimator || "",
      laborBudget: 0,
      laborHours: 0,
      address: awardedBid.address || "",
      attachments: awardedBid.attachments || [],
      bidId: awardedBid.id, // link back to the bid
      notes: awardedBid.notes || "",
      scope: awardedBid.scope || [],
      sector: awardedBid.sector || "",
      contact: awardedBid.contact || "",
      assignedForeman: awardedBid.assignedForeman || null,
    };
    app.setProjects(prev => [...prev, newProject]);
    show(`Bid awarded! Project created: ${awardedBid.name}`);
    setModal(null);
  };

  const handleUnAwardBid = () => {
    if (!draft.id) return;
    if (!confirm("Un-award this bid? The linked project will be removed.")) return;
    // Set bid back to submitted and clear converted flag
    const updBid = { ...draft, status: "submitted", convertedToProject: false };
    app.setBids(prev => prev.map(b => b.id === updBid.id ? updBid : b));
    // Remove linked project
    app.setProjects(prev => prev.filter(p => p.bidId !== draft.id));
    show("Bid un-awarded. Project removed.");
    setDraft(updBid);
  };

  const handleDelete = () => {
    if (!draft.id) return;
    const label = type === "editBid" || type === "viewBid" ? "bid"
      : type === "editProject" || type === "viewProject" ? "project"
      : type === "editContact" ? "contact" : "item";
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
    switch (type) {
      case "editBid": case "viewBid":
        app.setBids(prev => prev.filter(b => b.id !== draft.id));
        show("Bid deleted"); break;
      case "editProject": case "viewProject":
        app.setProjects(prev => prev.filter(p => p.id !== draft.id));
        show("Project deleted"); break;
      case "editContact":
        app.setContacts(prev => prev.filter(c => c.id !== draft.id));
        show("Contact deleted"); break;
      default: break;
    }
    setModal(null);
  };

  const close = () => { setModal(null); app.setInitialProjTab?.("overview"); };

  // Robust overlay dismiss — only close if BOTH mousedown AND mouseup land on the overlay
  const overlayMouseDown = useRef(false);
  const handleOverlayDown = (e) => { overlayMouseDown.current = (e.target === e.currentTarget); };
  const handleOverlayUp = (closeFn) => (e) => {
    if (overlayMouseDown.current && e.target === e.currentTarget) closeFn();
    overlayMouseDown.current = false;
  };

  // ── View Bid (read-only) ──
  if (type === "viewBid") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Bid Details</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="flex-col gap-12">
            <div><span className="text-dim text-xs">NAME</span><div className="font-semi">{draft.name}</div></div>
            <div><span className="text-dim text-xs">GC</span><div>{draft.gc}</div></div>
            <div className="flex gap-16">
              <div><span className="text-dim text-xs">VALUE</span><div className="font-mono text-amber">{fmt(draft.value)}</div></div>
              <div><span className="text-dim text-xs">DUE</span><div>{draft.due || "TBD"}</div></div>
              <div><span className="text-dim text-xs">STATUS</span><div className={`badge ${STATUS_BADGE[draft.status]}`}>{draft.status}</div></div>
            </div>
            {draft.risk && <div><span className="text-dim text-xs">RISK</span><div className={`badge ${RISK_BADGE[draft.risk]}`}>{draft.risk}</div></div>}
            {draft.scope?.length > 0 && (
              <div><span className="text-dim text-xs">SCOPE</span>
                <div className="flex gap-4 flex-wrap mt-4">{draft.scope.map((s, i) => <span key={i} className="badge badge-muted">{s}</span>)}</div>
              </div>
            )}
            {draft.notes && <div><span className="text-dim text-xs">NOTES</span><div className="text-sm">{draft.notes}</div></div>}
            {draft.contact && <div><span className="text-dim text-xs">CONTACT</span><div className="text-sm">{draft.contact}</div></div>}
          </div>
          <div className="modal-actions flex-between">
            <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>
            <div className="flex gap-8">
              {draft.status !== "awarded" && (
                <button className="btn badge-green-outlined" onClick={handleAwardBid}>
                  Award Bid
                </button>
              )}
              {draft.status === "awarded" && (
                <button className="btn badge-yellow-outlined" onClick={handleUnAwardBid}>
                  Un-award
                </button>
              )}
              <button className="btn btn-ghost" onClick={close}>Close</button>
              <button className="btn btn-primary" onClick={() => setModal({ type: "editBid", data: draft })}>Edit</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── View Project (read-only) ──
  if (type === "viewProject") {
    const projCOs = app.changeOrders.filter(co => String(co.projectId) === String(draft.id));
    const projRFIs = (app.rfis || []).filter(r => String(r.projectId) === String(draft.id));
    const projSubmittals = (app.submittals || []).filter(s => String(s.projectId) === String(draft.id));
    const projCrew = app.teamSchedule.filter(s => String(s.projectId) === String(draft.id));
    const projTime = app.timeEntries.filter(t => String(t.projectId) === String(draft.id) && t.clockOut);
    const totalHrs = projTime.reduce((s, t) => s + (t.totalHours || 0), 0);
    const projInvoices = app.invoices.filter(i => String(i.projectId) === String(draft.id));
    const totalBilled = projInvoices.reduce((s, i) => s + (i.amount || 0), 0);
    const remaining = (draft.contract || 0) - totalBilled;
    const [projTab, setProjTab] = useState(app.initialProjTab || "overview");
    const projTabs = ["overview", "notes", "change orders", "rfis & submittals", "areas", "punch", "log", "reports", "team", "financials", "sov", "closeout", "logistics", "settings"];
    const [coFormOpen, setCoFormOpen] = useState(false);
    const [coEditId, setCoEditId] = useState(null);
    const [coExpandedId, setCoExpandedId] = useState(null);
    const coNextNum = projCOs.length > 0 ? Math.max(...projCOs.map(c => parseInt(String(c.number || "0").replace(/\D/g, "")) || 0)) + 1 : 1;
    const [coForm, setCoForm] = useState({ number: "", description: "", type: "add", amount: "", status: "draft", date: new Date().toISOString().slice(0, 10), notes: "", tmTicketIds: [] });
    const coNetTotal = projCOs.reduce((s, c) => s + (c.type === "no cost" ? 0 : (c.amount || 0)), 0);
    const coAdjustedContract = (draft.contract || 0) + coNetTotal;
    const coStatusColor = (st) => ({ draft: "badge-ghost", submitted: "badge-amber", approved: "badge-green", rejected: "badge-red" }[st] || "badge-ghost");
    const coTypeLabel = (t) => ({ add: "+Add", deduct: "-Deduct", "no cost": "No Cost" }[t] || t);
    const resetCoForm = () => { setCoForm({ number: "", description: "", type: "add", amount: "", status: "draft", date: new Date().toISOString().slice(0, 10), notes: "", tmTicketIds: [] }); setCoEditId(null); };
    const saveCo = () => {
      const num = coForm.number || `CO-${String(coNextNum).padStart(3, "0")}`;
      const amt = parseFloat(coForm.amount) || 0;
      const finalAmt = coForm.type === "deduct" ? -Math.abs(amt) : coForm.type === "no cost" ? 0 : Math.abs(amt);
      const tmIds = coForm.tmTicketIds || [];
      // Enforce period discipline — block saves into closed periods (admin can override with reason)
      let periodOverride = null;
      const periodCheck = validatePeriod(coForm.date, app.periods || []);
      if (!periodCheck.allowed) {
        const isAdmin = app.auth?.role === "admin" || app.auth?.role === "owner";
        if (!isAdmin) {
          app.show(periodCheck.warning, "err");
          return;
        }
        const reason = prompt(`${periodCheck.warning}\n\nOverride reason (required):`);
        if (!reason || !reason.trim()) return;
        periodOverride = {
          reason: reason.trim(),
          approvedBy: app.auth?.name || "unknown",
          timestamp: new Date().toISOString(),
        };
      }
      if (coEditId) {
        // Clear changeOrderId from previously linked T&M tickets that are no longer selected
        const oldCo = app.changeOrders.find(c => c.id === coEditId);
        const removedTmIds = (oldCo?.tmTicketIds || []).filter(id => !tmIds.includes(id));
        if (removedTmIds.length > 0) {
          app.setTmTickets(prev => prev.map(t => removedTmIds.includes(t.id) ? { ...t, changeOrderId: undefined } : t));
        }
        app.setChangeOrders(prev => prev.map(c => c.id === coEditId ? { ...c, number: num, description: coForm.description, type: coForm.type, amount: finalAmt, status: coForm.status, date: coForm.date, notes: coForm.notes, tmTicketIds: tmIds, ...(periodOverride ? { periodOverride } : {}) } : c));
      } else {
        const newCo = { id: crypto.randomUUID(), projectId: draft.id, number: num, description: coForm.description, type: coForm.type, amount: finalAmt, status: coForm.status, date: coForm.date, notes: coForm.notes, tmTicketIds: tmIds, created: new Date().toISOString(), ...(periodOverride ? { periodOverride } : {}) };
        app.setChangeOrders(prev => [...prev, newCo]);
        // Set changeOrderId on linked T&M tickets
        if (tmIds.length > 0) {
          app.setTmTickets(prev => prev.map(t => tmIds.includes(t.id) ? { ...t, changeOrderId: newCo.id } : t));
        }
      }
      // Update changeOrderId on newly linked T&M tickets
      if (coEditId && tmIds.length > 0) {
        app.setTmTickets(prev => prev.map(t => tmIds.includes(t.id) ? { ...t, changeOrderId: coEditId } : t));
      }
      resetCoForm();
      setCoFormOpen(false);
    };
    const editCo = (co) => {
      setCoForm({ number: co.number || "", description: co.description || co.desc || "", type: co.type || "add", amount: String(Math.abs(co.amount || 0)), status: co.status || "draft", date: co.date || co.submitted || "", notes: co.notes || "", tmTicketIds: co.tmTicketIds || [] });
      setCoEditId(co.id);
      setCoFormOpen(true);
    };
    const deleteCo = (coId) => {
      const reason = prompt("Reason for voiding this change order:");
      if (reason !== null) {
        app.setChangeOrders(prev => prev.map(c => c.id === coId ? softDelete(c, app.auth?.name, reason) : c));
        app.show("Change order voided");
      }
    };
    const exportCoPdf = async (co) => {
      const { generateChangeOrderPdf } = await import("../utils/changeOrderPdf.js");
      const projectCOs = app.changeOrders.filter(c => c.projectId === co.projectId);
      await generateChangeOrderPdf(draft, { ...co, description: co.description || co.desc }, app.company || {}, projectCOs);
    };

    const generateSubPackage = async () => {
      const { generateSubmittalsPackagePdf } = await import("../utils/submittalsPackagePdf.js");
      await generateSubmittalsPackagePdf(draft, projSubmittals, app.contacts || [], app.company || {});
    };

    // ── Submittal state ──
    const [subFormOpen, setSubFormOpen] = useState(false);
    const [subEditId, setSubEditId] = useState(null);
    const [subExpandedId, setSubExpandedId] = useState(null);
    const [subFilter, setSubFilter] = useState("all");
    const subNextNum = projSubmittals.length > 0 ? Math.max(...projSubmittals.map(s => parseInt(String(s.number || "0").replace(/\D/g, "")) || 0)) + 1 : 1;
    const [subForm, setSubForm] = useState({ number: "", description: "", specSection: "", type: "product data", status: "not started", dateSubmitted: "", dateReturned: "", notes: "" });
    const [libPickerOpen, setLibPickerOpen] = useState(false);
    const [libSearch, setLibSearch] = useState("");
    const [libCatFilter, setLibCatFilter] = useState("all");
    const [libSelected, setLibSelected] = useState(new Set());
    const SUB_STATUSES = ["not started", "in progress", "submitted", "approved", "revise & resubmit", "rejected"];
    const SUB_TYPES = ["product data", "shop drawings", "samples", "test reports"];
    const SUB_STATUS_BADGE = (st) => {
      const map = { "not started": { bg: "var(--bg3)", color: "var(--text3)" }, "in progress": { bg: "var(--blue-dim)", color: "var(--blue)" }, "submitted": { bg: "var(--amber-dim)", color: "var(--amber)" }, "approved": { bg: "var(--green-dim)", color: "var(--green)" }, "revise & resubmit": { bg: "rgba(249,115,22,0.15)", color: "#f97316" }, "rejected": { bg: "var(--red-dim)", color: "var(--red)" } };
      return map[st] || map["not started"];
    };
    const subDaysOut = (s) => {
      if (!s.dateSubmitted || s.status === "not started") return null;
      if (s.dateReturned) return null;
      const submitted = new Date(s.dateSubmitted);
      const now = new Date();
      return Math.floor((now - submitted) / 86400000);
    };
    const resetSubForm = () => { setSubForm({ number: "", description: "", specSection: "", type: "product data", status: "not started", dateSubmitted: "", dateReturned: "", notes: "" }); setSubEditId(null); };
    const saveSub = () => {
      if (!subForm.description) { show("Description required", "err"); return; }
      const num = subForm.number || String(subNextNum);
      if (subEditId) {
        app.setSubmittals(prev => prev.map(s => s.id === subEditId ? { ...s, number: num, description: subForm.description, specSection: subForm.specSection, type: subForm.type, status: subForm.status, dateSubmitted: subForm.dateSubmitted, dateReturned: subForm.dateReturned, notes: subForm.notes } : s));
      } else {
        const newSub = { id: crypto.randomUUID(), projectId: draft.id, number: num, description: subForm.description, specSection: subForm.specSection, type: subForm.type, status: subForm.status, dateSubmitted: subForm.dateSubmitted, dateReturned: subForm.dateReturned, notes: subForm.notes, created: new Date().toISOString() };
        app.setSubmittals(prev => [...prev, newSub]);
      }
      resetSubForm();
      setSubFormOpen(false);
      show(subEditId ? "Submittal updated" : "Submittal added", "ok");
      // Prompt to add to library if not already from library
      if (!subEditId) {
        const desc = subForm.description || "";
        const alreadyInLib = (app.submittalLibrary || []).some(li =>
          li.itemName.toLowerCase() === desc.toLowerCase()
        );
        if (!alreadyInLib && desc.length > 3) {
          setTimeout(() => {
            if (confirm(`Add "${desc}" to the Submittal Library for future use?`)) {
              const libItem = {
                id: "sl-" + crypto.randomUUID().slice(0, 8),
                itemName: desc,
                manufacturer: "",
                specModel: "",
                category: "",
                specSection: subForm.specSection || "",
                type: subForm.type || "product data",
                approvalStatus: subForm.status === "approved" ? "approved" : "not submitted",
                notes: "",
                lastUsedDate: new Date().toISOString().slice(0, 10),
                lastUsedProject: draft.name || "",
                createdAt: new Date().toISOString().slice(0, 10),
              };
              app.setSubmittalLibrary(prev => [...prev, libItem]);
              app.show("Added to Submittal Library", "ok");
            }
          }, 300);
        }
      }
    };
    const editSub = (s) => {
      setSubForm({ number: s.number || "", description: s.description || "", specSection: s.specSection || s.spec || "", type: s.type || "product data", status: s.status || "not started", dateSubmitted: s.dateSubmitted || s.date || "", dateReturned: s.dateReturned || "", notes: s.notes || "" });
      setSubEditId(s.id);
      setSubFormOpen(true);
    };
    const deleteSub = (sId) => { if (confirm("Delete this submittal?")) app.setSubmittals(prev => prev.filter(s => s.id !== sId)); };
    const filteredSubmittals = projSubmittals.filter(s => {
      if (subFilter === "all") return true;
      if (subFilter === "pending") return ["not started", "in progress", "submitted"].includes(s.status);
      if (subFilter === "approved") return s.status === "approved";
      if (subFilter === "action") return ["revise & resubmit", "rejected"].includes(s.status);
      return true;
    });

    // ── RFI state ──
    const [rfiFormOpen, setRfiFormOpen] = useState(false);
    const [rfiEditId, setRfiEditId] = useState(null);
    const [rfiExpandedId, setRfiExpandedId] = useState(null);
    const [rfiFilter, setRfiFilter] = useState("all");
    const rfiNextNum = projRFIs.length > 0 ? Math.max(...projRFIs.map(r => parseInt(String(r.number || "0").replace(/\D/g, "")) || 0)) + 1 : 1;
    const RFI_INIT = { number: "", subject: "", question: "", specRef: "", priority: "Medium", status: "Draft", dateSubmitted: "", dateAnswered: "", answer: "", submittedTo: draft.gc || "", ballInCourt: "GC", costImpact: "None", costAmount: "", scheduleImpact: "None", scheduleDays: "", responseAttachments: [] };
    const [rfiForm, setRfiForm] = useState({ ...RFI_INIT });
    const RFI_STATUSES = ["Draft", "Submitted", "Answered", "Closed"];
    const RFI_PRIORITIES = ["Low", "Medium", "High", "Critical"];
    const RFI_STATUS_BADGE = (st) => {
      const map = { "Draft": { bg: "var(--bg3)", color: "var(--text3)" }, "Submitted": { bg: "var(--amber-dim)", color: "var(--amber)" }, "Answered": { bg: "var(--blue-dim)", color: "var(--blue)" }, "Closed": { bg: "var(--green-dim)", color: "var(--green)" } };
      return map[st] || map["Draft"];
    };
    const RFI_PRIORITY_BADGE = (p) => {
      const map = { "Low": "badge-green", "Medium": "badge-amber", "High": "badge-red", "Critical": "badge-red" };
      return map[p] || "badge-ghost";
    };
    const rfiDaysOut = (r) => {
      if (!r.dateSubmitted || r.status === "Draft") return null;
      if (r.dateAnswered || r.status === "Closed" || r.status === "Answered") return null;
      const submitted = new Date(r.dateSubmitted);
      const now = new Date();
      return Math.floor((now - submitted) / 86400000);
    };
    const rfiAvgResponse = (() => {
      const answered = projRFIs.filter(r => r.dateSubmitted && r.dateAnswered);
      if (answered.length === 0) return null;
      const totalDays = answered.reduce((s, r) => s + Math.floor((new Date(r.dateAnswered) - new Date(r.dateSubmitted)) / 86400000), 0);
      return Math.round(totalDays / answered.length);
    })();
    const rfiOpenCount = projRFIs.filter(r => r.status === "Draft" || r.status === "Submitted").length;
    const rfiOverdueCount = projRFIs.filter(r => { const d = rfiDaysOut(r); return d !== null && d > 7; }).length;
    const resetRfiForm = () => { setRfiForm({ ...RFI_INIT }); setRfiEditId(null); };
    const saveRfi = () => {
      if (!rfiForm.subject) { show("Subject required", "err"); return; }
      const num = rfiForm.number || `RFI-${String(rfiNextNum).padStart(3, "0")}`;
      const costAmt = rfiForm.costImpact === "Yes" ? (parseFloat(rfiForm.costAmount) || 0) : 0;
      const schDays = rfiForm.scheduleImpact === "Yes" ? (parseInt(rfiForm.scheduleDays) || 0) : 0;
      if (rfiEditId) {
        app.setRfis(prev => prev.map(r => r.id === rfiEditId ? { ...r, number: num, subject: rfiForm.subject, question: rfiForm.question, specRef: rfiForm.specRef, priority: rfiForm.priority, status: rfiForm.status, dateSubmitted: rfiForm.dateSubmitted, dateAnswered: rfiForm.dateAnswered, answer: rfiForm.answer, submittedTo: rfiForm.submittedTo, ballInCourt: rfiForm.ballInCourt, costImpact: rfiForm.costImpact, costAmount: costAmt, scheduleImpact: rfiForm.scheduleImpact, scheduleDays: schDays, responseAttachments: rfiForm.responseAttachments || [] } : r));
      } else {
        const newRfi = { id: crypto.randomUUID(), projectId: draft.id, number: num, subject: rfiForm.subject, question: rfiForm.question, specRef: rfiForm.specRef, priority: rfiForm.priority, status: rfiForm.status, dateSubmitted: rfiForm.dateSubmitted, dateAnswered: rfiForm.dateAnswered, answer: rfiForm.answer, submittedTo: rfiForm.submittedTo, ballInCourt: rfiForm.ballInCourt, costImpact: rfiForm.costImpact, costAmount: costAmt, scheduleImpact: rfiForm.scheduleImpact, scheduleDays: schDays, responseAttachments: rfiForm.responseAttachments || [], created: new Date().toISOString() };
        app.setRfis(prev => [...prev, newRfi]);
      }
      resetRfiForm();
      setRfiFormOpen(false);
      show(rfiEditId ? "RFI updated" : "RFI added", "ok");
    };
    const editRfi = (r) => {
      setRfiForm({ number: r.number || "", subject: r.subject || "", question: r.question || "", specRef: r.specRef || "", priority: r.priority || "Medium", status: r.status || "Draft", dateSubmitted: r.dateSubmitted || "", dateAnswered: r.dateAnswered || "", answer: r.answer || "", submittedTo: r.submittedTo || draft.gc || "", ballInCourt: r.ballInCourt || "GC", costImpact: r.costImpact || "None", costAmount: String(r.costAmount || ""), scheduleImpact: r.scheduleImpact || "None", scheduleDays: String(r.scheduleDays || ""), responseAttachments: r.responseAttachments || [] });
      setRfiEditId(r.id);
      setRfiFormOpen(true);
    };
    const deleteRfi = (rId) => { if (confirm("Delete this RFI?")) app.setRfis(prev => prev.filter(r => r.id !== rId)); };
    const filteredRFIs = projRFIs.filter(r => {
      if (rfiFilter === "all") return true;
      if (rfiFilter === "open") return r.status === "Draft" || r.status === "Submitted";
      if (rfiFilter === "answered") return r.status === "Answered" || r.status === "Closed";
      if (rfiFilter === "overdue") { const d = rfiDaysOut(r); return d !== null && d > 7; }
      return true;
    });

    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal modal-lg flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
          <div className="modal-header">
            <div>
              <div className="modal-title">{draft.name}</div>
              <div className="text-xs text-muted">{draft.gc} · {draft.phase} · {draft.pm || "Unassigned"}</div>
            </div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>

          {/* Sub-tabs (Phase 4: role-filtered) */}
          {(() => {
            const role = app.auth?.role || "owner";
            const hiddenTabs = ["foreman","driver","employee"].includes(role) ? ["financials","closeout"] : [];
            const visibleTabs = projTabs.filter(tab => !hiddenTabs.includes(tab));
            return (
              <div className="flex gap-4 mb-12 border-b overflow-x-auto" style={{ paddingBottom: "var(--space-2)" }}>
                {visibleTabs.map(tab => (
                  <button key={tab} className={`btn btn-sm fs-tab capitalize nowrap ${projTab === tab ? "btn-primary" : "btn-ghost"}`} onClick={() => setProjTab(tab)}>
                    {tab}
                    {tab === "rfis & submittals" && (() => {
                      const count = projRFIs.filter(r => r.status === "open").length + projSubmittals.filter(s => s.status === "submitted" || s.status === "revise & resubmit").length;
                      return count > 0 ? <span className="ml-sp1 badge badge-amber fs-xs" style={{ padding: "0 5px", minWidth: "auto" }}>{count}</span> : null;
                    })()}
                  </button>
                ))}
              </div>
            );
          })()}

          <div className="flex-1" style={{ overflowY: "auto", paddingBottom: "var(--space-4)" }}>
            {/* ── Overview ── */}
            {projTab === "overview" && (() => {
              const projPhases = draft.phases || getDefaultPhases(draft);
              const updateProjPhases = (newPhases) => {
                const updated = { ...draft, phases: newPhases };
                setDraft(updated);
                app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
              };
              const activePhase = projPhases.find(p => p.status === "in progress");
              const completedCount = projPhases.filter(p => p.status === "completed").length;
              return (
                <div className="flex-col gap-12">
                  {/* RFI & Submittal status strip */}
                  {(() => {
                    const openRfis = projRFIs.filter(r => r.status === "open").length;
                    const pendingSubs = projSubmittals.filter(s => s.status === "submitted" || s.status === "revise & resubmit").length;
                    const hasIssues = openRfis > 0 || pendingSubs > 0;
                    return (
                      <div
                        className="flex gap-16 items-center"
                        style={{
                          padding: "var(--space-2) var(--space-4)",
                          borderRadius: "var(--radius)",
                          background: hasIssues ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
                          border: `1px solid ${hasIssues ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}`,
                          cursor: hasIssues ? "pointer" : "default",
                        }}
                        onClick={() => hasIssues && setProjTab("rfis & submittals")}
                      >
                        <span className="text-xs" style={{ color: openRfis > 0 ? "var(--amber)" : "var(--green)" }}>
                          {openRfis > 0 ? `${openRfis} RFI${openRfis !== 1 ? "s" : ""} open` : "All RFIs answered"}
                        </span>
                        <span className="text-xs text-dim">&middot;</span>
                        <span className="text-xs" style={{ color: pendingSubs > 0 ? "var(--amber)" : "var(--green)" }}>
                          {pendingSubs > 0 ? `${pendingSubs} submittal${pendingSubs !== 1 ? "s" : ""} pending` : "All submittals resolved"}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-dim text-xs">CONTRACT</span><div className="font-mono text-amber font-bold">{fmt(draft.contract)}</div></div>
                    <div><span className="text-dim text-xs">BILLED</span><div className="font-mono">{fmt(totalBilled)}</div></div>
                    <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono" style={{ color: remaining > 0 ? "var(--green)" : "var(--red)" }}>{fmt(remaining)}</div></div>
                    <div><span className="text-dim text-xs">PROGRESS</span><div className="font-mono">{draft.progress}%</div></div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${draft.progress}%` }} /></div>
                  {/* GC Contacts */}
                  {(draft.gcSuperName || draft.gcPmName || draft.siteContact) && (
                    <div className="flex gap-16 flex-wrap">
                      {draft.gcSuperName && <div><span className="text-dim text-xs">GC SUPER</span><div className="text-sm">{draft.gcSuperName}{draft.gcSuperPhone ? ` · ${draft.gcSuperPhone}` : ""}</div></div>}
                      {draft.gcPmName && <div><span className="text-dim text-xs">GC PM</span><div className="text-sm">{draft.gcPmName}{draft.gcPmEmail ? ` · ${draft.gcPmEmail}` : ""}</div></div>}
                      {draft.siteContact && <div><span className="text-dim text-xs">SITE CONTACT</span><div className="text-sm">{draft.siteContact}{draft.siteContactPhone ? ` · ${draft.siteContactPhone}` : ""}</div></div>}
                    </div>
                  )}
                  {/* Job identifiers */}
                  {(draft.jobNumber || draft.poNumber) && (
                    <div className="flex gap-16 flex-wrap">
                      {draft.jobNumber && <div><span className="text-dim text-xs">JOB #</span><div className="text-sm font-mono">{draft.jobNumber}</div></div>}
                      {draft.poNumber && <div><span className="text-dim text-xs">PO / SUB #</span><div className="text-sm font-mono">{draft.poNumber}</div></div>}
                    </div>
                  )}
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-dim text-xs">ADDRESS</span><div className="text-sm">{draft.address || "—"}</div></div>
                    {draft.suite && <div><span className="text-dim text-xs">SUITE</span><div className="text-sm">{draft.suite}</div></div>}
                    {draft.parking && <div><span className="text-dim text-xs">PARKING</span><div className="text-sm">{draft.parking}</div></div>}
                  </div>
                  <div className="flex gap-16">
                    <div><span className="text-dim text-xs">START</span><div>{draft.start || "TBD"}</div></div>
                    <div><span className="text-dim text-xs">END</span><div>{draft.end || "TBD"}</div></div>
                  </div>
                  <div><span className="text-dim text-xs">SCOPE</span>
                    <div className="flex gap-4 flex-wrap mt-4">{(draft.scope || []).map(s => <span key={s} className="badge badge-amber fs-10">{s}</span>)}</div>
                  </div>

                  {/* ── Phase Tracker ── */}
                  <div className="bg-bg2" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "var(--space-4) var(--space-4)" }}>
                    <div className="flex-between mb-12">
                      <div>
                        <div className="fw-semi fs-tab uppercase c-text3" style={{ letterSpacing: "0.7px" }}>Construction Phases</div>
                        <div className="fs-11 text-muted mt-2">
                          {completedCount} of {projPhases.length} complete
                          {activePhase ? ` · Active: ${activePhase.name}` : ""}
                        </div>
                      </div>
                    </div>
                    <PhaseTracker
                      phases={projPhases}
                      employees={app.employees || []}
                      onUpdate={updateProjPhases}
                      readOnly={true}
                    />
                  </div>

                  <div className="flex gap-16 flex-wrap mt-4">
                    <div><span className="text-dim text-xs">LABOR HOURS</span><div className="font-mono">{totalHrs.toFixed(1)}h</div></div>
                    <div><span className="text-dim text-xs">CHANGE ORDERS</span><div className="font-mono">{projCOs.length}</div></div>
                    <div><span className="text-dim text-xs">RFIs</span><div className="font-mono">{projRFIs.length}</div></div>
                    <div><span className="text-dim text-xs">SUBMITTALS</span><div className="font-mono">{projSubmittals.length}</div></div>
                  </div>

                  {/* T&M Exposure */}
                  {(() => {
                    const projTm = (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id));
                    const pending = projTm.filter(t => t.status === "submitted").reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0) + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                    const approved = projTm.filter(t => t.status === "approved").reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0) + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                    if (projTm.length === 0) return null;
                    return (
                      <div className="rounded-control mt-sp3 bg-bg3" style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <div className="fs-11 text-dim text-uppercase fw-700 mb-8">T&M Exposure</div>
                        <div className="flex gap-16">
                          <div><span className="text-amber fw-700">${pending.toLocaleString()}</span> <span className="fs-11 text-dim">pending</span></div>
                          <div><span className="text-green fw-700">${approved.toLocaleString()}</span> <span className="fs-11 text-dim">approved</span></div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Production Progress & Areas Complete */}
                  {(() => {
                    const projAreas = (app.areas || []).filter(a => String(a.projectId) === String(draft.id));
                    if (projAreas.length === 0) return null;
                    const complete = projAreas.filter(a => a.status === "complete").length;
                    const totalBudget = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.budgetQty || 0), 0), 0);
                    const totalInstalled = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.installedQty || 0), 0), 0);
                    const pct = totalBudget > 0 ? Math.round((totalInstalled / totalBudget) * 100) : 0;
                    return (
                      <div className="flex gap-12 mt-12">
                        <div className="stat-panel-center">
                          <div className="kpi-large-value">{complete}/{projAreas.length}</div>
                          <div className="fs-11 text-dim">Areas Complete</div>
                        </div>
                        <div className="stat-panel-center">
                          <div className="kpi-large-value">{pct}%</div>
                          <div className="fs-11 text-dim">Production</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Generate Project Status Report ── */}
                  <div className="mt-16">
                    <button className="btn btn-primary flex fw-bold fs-label justify-center gap-sp2 w-full" style={{ height: 44 }}
                      onClick={() => {
                        const projAreas = (app.areas || []).filter(a => String(a.projectId) === String(draft.id));
                        const complete = projAreas.filter(a => a.status === "complete").length;
                        const totalBudget = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.budgetQty || 0), 0), 0);
                        const totalInstalled = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.installedQty || 0), 0), 0);
                        const pct = totalBudget > 0 ? Math.round((totalInstalled / totalBudget) * 100) : 0;
                        const projTm = (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id));
                        const tmTotal = projTm.reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0) + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost), 0), 0);
                        const openPunch = (app.punchItems || []).filter(p => String(p.projectId) === String(draft.id) && p.status !== "resolved" && p.status !== "complete").length;
                        const report = [
                          `PROJECT STATUS REPORT — ${draft.name}`,
                          `Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}`,
                          `Prepared by: ${auth?.name || "EBC"}`,
                          ``,
                          `CONTRACT: $${(draft.contract || 0).toLocaleString()}  |  BILLED: $${totalBilled.toLocaleString()}  |  REMAINING: $${remaining.toLocaleString()}`,
                          `PROGRESS: ${draft.progress}%  |  PRODUCTION: ${pct}%`,
                          ``,
                          `AREAS: ${complete}/${projAreas.length} complete`,
                          ...projAreas.map(a => `  ${a.name} (${a.floor} ${a.zone}) — ${a.status}`),
                          ``,
                          `CHANGE ORDERS: ${projCOs.length} (${projCOs.filter(c => c.status === "approved").length} approved, ${projCOs.filter(c => c.status !== "approved" && c.status !== "rejected").length} pending)`,
                          `RFIs: ${projRFIs.length} (${projRFIs.filter(r => r.status === "open").length} open)`,
                          `SUBMITTALS: ${projSubmittals.length}`,
                          `T&M EXPOSURE: $${tmTotal.toLocaleString()} across ${projTm.length} tickets`,
                          `OPEN PUNCH: ${openPunch} items`,
                          `LABOR HOURS: ${totalHrs.toFixed(1)}h`,
                          ``,
                          `--- EBC Construction | Generated by EBC-OS ---`,
                        ].join("\n");
                        navigator.clipboard.writeText(report).then(() => {
                          show(t("Report copied") + " — " + t("paste into email or document"), "ok");
                        }).catch(() => {
                          // Fallback: show in alert
                          window.prompt("Copy this report:", report);
                        });
                      }}>
                      <ClipboardList size={16} /> {t("Generate Report")} ({t("Copy to Clipboard")})
                    </button>
                  </div>

                  {/* ── Recent Notes Preview ── */}
                  {(() => {
                    const projId = String(draft.id);
                    const recentNotes = projectNotes
                      .filter(n => String(n.projectId) === projId)
                      .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
                      .slice(0, 3);
                    const pinnedNotes = projectNotes.filter(n => String(n.projectId) === projId && n.pinned);
                    const allVisible = [...pinnedNotes.filter(n => !recentNotes.find(r => r.id === n.id)), ...recentNotes].slice(0, 4);
                    if (allVisible.length === 0) return null;
                    return (
                      <div className="mt-sp3 rounded-control bg-bg2" style={{ border: "1px solid var(--border)", padding: "var(--space-3) var(--space-4)" }}>
                        <div className="flex-between mb-sp2">
                          <div className="fw-semi fs-tab uppercase c-text3" style={{ letterSpacing: "0.7px" }}>Team Notes</div>
                          <button className="btn btn-ghost btn-sm fs-10" onClick={() => setProjTab("notes")}>View All</button>
                        </div>
                        {allVisible.map(note => (
                          <div key={note.id} className="border-b" style={{ padding: "var(--space-2) 0" }}>
                            <div className="flex-between">
                              <span className="fs-tab fw-semi c-text">{note.pinned ? "📌 " : ""}{note.author}</span>
                              <span className="fs-tab c-text3">{note.timestamp ? new Date(note.timestamp).toLocaleDateString() : ""}</span>
                            </div>
                            <div className="fs-tab c-text2 mt-sp1" style={{ lineHeight: 1.4 }}>{(note.text || "").slice(0, 120)}{(note.text || "").length > 120 ? "..." : ""}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ── Change Orders ── */}
            {projTab === "change orders" && (
              <div className="flex-col gap-12">
                {/* Summary bar */}
                <div className="flex gap-16 flex-wrap field-card-compact">
                  <div><span className="text-dim text-xs">ORIGINAL CONTRACT</span><div className="font-mono text-sm">{fmt(draft.contract)}</div></div>
                  <div><span className="text-dim text-xs">NET CO VALUE</span><div className="font-mono text-sm" style={{ color: coNetTotal >= 0 ? "var(--green)" : "var(--red)" }}>{coNetTotal >= 0 ? "+" : ""}{fmt(coNetTotal)}</div></div>
                  <div><span className="text-dim text-xs">ADJUSTED CONTRACT</span><div className="font-mono text-sm font-bold text-amber">{fmt(coAdjustedContract)}</div></div>
                  <div><span className="text-dim text-xs">TOTAL COs</span><div className="font-mono text-sm">{projCOs.length}</div></div>
                </div>

                {/* Add CO button */}
                <div className="flex-between">
                  <span className="text-xs text-dim">{projCOs.filter(c => c.status === "approved").length} approved, {projCOs.filter(c => c.status === "submitted" || c.status === "pending").length} pending</span>
                  <button className="btn btn-sm btn-primary" onClick={() => { resetCoForm(); setCoFormOpen(true); }}>+ Add Change Order</button>
                </div>

                {/* CO Form (add/edit) */}
                {coFormOpen && (
                  <div className="card card-amber-accent">
                    <div className="flex-between mb-8">
                      <span className="font-semi text-sm">{coEditId ? "Edit Change Order" : "New Change Order"}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setCoFormOpen(false); resetCoForm(); }}>Cancel</button>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-100">
                        <label className="form-label">CO Number</label>
                        <input className="form-input" placeholder={`CO-${String(coNextNum).padStart(3, "0")}`} value={coForm.number} onChange={e => setCoForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-200">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" rows={4} placeholder="Describe the change in detail — scope, reason, affected areas..." value={coForm.description} onChange={e => setCoForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-120">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={coForm.type} onChange={e => setCoForm(p => ({ ...p, type: e.target.value }))}>
                          <option value="add">Add</option>
                          <option value="deduct">Deduct</option>
                          <option value="no cost">No Cost</option>
                        </select>
                      </div>
                      <div className="flex-0-120">
                        <label className="form-label">Amount ($)</label>
                        <input className="form-input" type="number" step="0.01" placeholder="0.00" value={coForm.amount} onChange={e => setCoForm(p => ({ ...p, amount: e.target.value }))} disabled={coForm.type === "no cost"} />
                      </div>
                      <div className="flex-0-140">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={coForm.status} onChange={e => setCoForm(p => ({ ...p, status: e.target.value }))}>
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div className="flex-0-140">
                        <label className="form-label">Date</label>
                        <input className="form-input" type="date" value={coForm.date} onChange={e => setCoForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="form-label">Notes</label>
                      <textarea className="form-textarea" rows={2} placeholder="Additional notes..." value={coForm.notes} onChange={e => setCoForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    {/* T&M Backup Selection */}
                    {(() => {
                      const projTm = (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id));
                      const availableTm = projTm.filter(t => {
                        // Show tickets not linked to another CO (or linked to this CO being edited)
                        if (coForm.tmTicketIds.includes(t.id)) return true;
                        const linkedToOther = app.changeOrders.some(c => c.id !== coEditId && (c.tmTicketIds || []).includes(t.id));
                        return !linkedToOther;
                      });
                      if (availableTm.length === 0) return null;
                      const selectedTm = projTm.filter(t => coForm.tmTicketIds.includes(t.id));
                      const tmLaborTotal = selectedTm.reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0), 0);
                      const tmMatTotal = selectedTm.reduce((s, t) => s + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                      return (
                        <div className="mb-8 rounded-control p-sp3 bg-bg2" style={{ border: "1px solid var(--border)" }}>
                          <label className="text-xs text-dim text-uppercase fw-700">T&M Backup</label>
                          <div className="mt-sp2" style={{ maxHeight: 160, overflowY: "auto" }}>
                            {availableTm.map(t => {
                              const checked = coForm.tmTicketIds.includes(t.id);
                              const tLabor = (t.laborEntries || []).reduce((s, l) => s + l.hours * l.rate, 0);
                              const tMat = (t.materialEntries || []).reduce((s, m) => s + m.qty * m.unitCost * (1 + (m.markup || 0) / 100), 0);
                              return (
                                <label key={t.id} className="flex-center-gap-8 cursor-pointer fs-13" style={{ padding: "var(--space-1) 0" }}>
                                  <input type="checkbox" checked={checked} onChange={() => {
                                    const newIds = checked ? coForm.tmTicketIds.filter(id => id !== t.id) : [...coForm.tmTicketIds, t.id];
                                    const newSelected = projTm.filter(tm => newIds.includes(tm.id));
                                    const autoAmt = newSelected.reduce((s, tm) => s + (tm.laborEntries || []).reduce((ls, l) => ls + l.hours * l.rate, 0) + (tm.materialEntries || []).reduce((ms, m) => ms + m.qty * m.unitCost * (1 + (m.markup || 0) / 100), 0), 0);
                                    setCoForm(p => ({ ...p, tmTicketIds: newIds, amount: autoAmt > 0 ? String(Math.round(autoAmt * 100) / 100) : p.amount }));
                                  }} />
                                  <span className="fw-semi" style={{ minWidth: 60 }}>{t.ticketNumber || t.id}</span>
                                  <span className="text-dim nowrap overflow-hidden flex-1" style={{ textOverflow: "ellipsis" }}>{t.description || "—"}</span>
                                  <span className="font-mono text-xs">${(tLabor + tMat).toLocaleString()}</span>
                                </label>
                              );
                            })}
                          </div>
                          {selectedTm.length > 0 && (
                            <div className="fs-label mt-sp2" style={{ paddingTop: "var(--space-2)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                              <span>{selectedTm.length} ticket{selectedTm.length !== 1 ? "s" : ""} selected</span>
                              <span className="fw-700 text-amber">T&M Total: ${(tmLaborTotal + tmMatTotal).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex gap-8 justify-end">
                      <button className="btn btn-sm btn-primary" onClick={saveCo} disabled={!coForm.description}>{coEditId ? "Update CO" : "Save CO"}</button>
                    </div>
                  </div>
                )}

                {/* CO List */}
                {projCOs.length === 0 && !coFormOpen ? (
                  <div className="text-sm text-dim text-center p-32">No change orders yet. Click "+ Add Change Order" to create one.</div>
                ) : (
                  projCOs.map(co => {
                    const isExpanded = coExpandedId === co.id;
                    const desc = co.description || co.desc || co.name || `CO #${co.id}`;
                    const coStatus = co.status || "draft";
                    return (
                      <div key={co.id} className="card" style={{ padding: 0, marginBottom: "var(--space-2)", overflow: "hidden", border: isExpanded ? "1px solid var(--amber-dim)" : undefined }}>
                        {/* CO row - clickable */}
                        <div className="cursor-pointer" style={{ padding: "var(--space-3) var(--space-3)" }} onClick={() => setCoExpandedId(isExpanded ? null : co.id)}>
                          <div className="flex-between">
                            <div className="flex gap-8 align-center">
                              <span className="fs-xs" style={{ opacity: 0.4 }}>{isExpanded ? "\u25BC" : "\u25B6"}</span>
                              <span className="font-mono text-xs text-dim" style={{ minWidth: 56 }}>{co.number || `CO-${co.id}`}</span>
                              <span className="font-semi text-sm">{desc}</span>
                            </div>
                            <div className="flex gap-8 align-center">
                              <button className="btn btn-sm btn-ghost" title="Export PDF" onClick={(e) => { e.stopPropagation(); exportCoPdf(co); }} style={{ padding: "var(--space-1) var(--space-2)", fontSize: "var(--text-xs)" }}>PDF</button>
                              <span className={`badge ${coStatusColor(coStatus)} capitalize fs-xs`}>{coStatus}</span>
                              <span className="font-mono text-sm" style={{ color: (co.amount || 0) < 0 ? "var(--red)" : (co.amount || 0) > 0 ? "var(--green)" : "var(--text2)", minWidth: 70, textAlign: "right" }}>
                                {(co.amount || 0) < 0 ? "-" : (co.amount || 0) > 0 ? "+" : ""}{fmt(Math.abs(co.amount || 0))}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted mt-2" style={{ marginLeft: "var(--space-6)" }}>
                            {coTypeLabel(co.type || "add")} &middot; {co.date || co.submitted || "No date"}
                          </div>
                        </div>
                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="bg-bg3" style={{ padding: "var(--space-2) var(--space-3) var(--space-3)", borderTop: "1px solid var(--border)" }}>
                            <div className="flex gap-16 flex-wrap mb-8">
                              <div><span className="text-dim text-xs">TYPE</span><div className="text-sm">{coTypeLabel(co.type || "add")}</div></div>
                              <div><span className="text-dim text-xs">STATUS</span><div className="text-sm text-capitalize">{coStatus}</div></div>
                              <div><span className="text-dim text-xs">DATE</span><div className="text-sm">{co.date || co.submitted || "—"}</div></div>
                              <div><span className="text-dim text-xs">AMOUNT</span><div className="font-mono text-sm">{fmt(co.amount || 0)}</div></div>
                              {co.approved && <div><span className="text-dim text-xs">APPROVED</span><div className="text-sm">{co.approved}</div></div>}
                              {co.created && <div><span className="text-dim text-xs">CREATED</span><div className="text-sm">{new Date(co.created).toLocaleDateString()}</div></div>}
                            </div>
                            {(co.notes || co.description || co.desc) && (
                              <div className="mb-8">
                                <span className="text-dim text-xs">DESCRIPTION / NOTES</span>
                                <div className="text-sm ws-pre-wrap">{co.description || co.desc}{co.notes ? `\n\nNotes: ${co.notes}` : ""}</div>
                              </div>
                            )}
                            {/* Linked T&M Backup */}
                            {co.tmTicketIds && co.tmTicketIds.length > 0 && (() => {
                              const linked = (app.tmTickets || []).filter(t => co.tmTicketIds.includes(t.id));
                              if (!linked.length) return null;
                              const totalLabor = linked.reduce((s, t) => s + (t.laborEntries || []).reduce((ls, l) => ls + (l.hours * l.rate), 0), 0);
                              const totalMat = linked.reduce((s, t) => s + (t.materialEntries || []).reduce((ms, m) => ms + (m.qty * m.unitCost * (1 + (m.markup || 0) / 100)), 0), 0);
                              return (
                                <div className="rounded-control mb-sp2 mt-sp1 p-sp3 bg-bg2" style={{ border: "1px solid var(--border)" }}>
                                  <div className="fs-11 text-dim text-uppercase fw-700 mb-8">Linked T&M Backup</div>
                                  {linked.map(t => {
                                    const tLabor = (t.laborEntries || []).reduce((s, l) => s + l.hours * l.rate, 0);
                                    const tMat = (t.materialEntries || []).reduce((s, m) => s + m.qty * m.unitCost * (1 + (m.markup || 0) / 100), 0);
                                    return (
                                      <div key={t.id} className="queue-row fs-13">
                                        <div className="flex-between">
                                          <span className="font-semi">{t.ticketNumber || t.id}</span>
                                          <span className="text-muted">{t.date || "—"}</span>
                                        </div>
                                        <div className="text-muted fs-12 mt-2">{t.description || "—"}</div>
                                        <div className="flex gap-12 mt-4 fs-12">
                                          <span>Labor: <strong>${tLabor.toLocaleString()}</strong></span>
                                          <span>Material: <strong>${tMat.toLocaleString()}</strong></span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div className="fw-bold fs-label mt-sp2" style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>T&M Total</span>
                                    <span className="text-amber">${(totalLabor + totalMat).toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="flex gap-8">
                              <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); editCo(co); }}>Edit</button>
                              <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); exportCoPdf(co); }}>Export PDF</button>
                              <button className="btn btn-sm btn-ghost text-red" onClick={(e) => { e.stopPropagation(); deleteCo(co.id); }}>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── RFIs & Submittals (combined) ── */}
            {projTab === "rfis & submittals" && (() => {
              const [rfiSubTab, setRfiSubTab] = useState("Submittals");
              return (
                <div>
                  <div className="flex gap-4 mb-12 border-b" style={{ paddingBottom: "var(--space-2)" }}>
                    {["Submittals", "RFIs"].map(t => (
                      <button key={t} className={`btn btn-sm ${rfiSubTab === t ? "btn-primary" : "btn-ghost"}`} onClick={() => setRfiSubTab(t)}>
                        {t}
                        {t === "RFIs" && (() => { const c = projRFIs.filter(r => r.status === "open").length; return c > 0 ? <span className="ml-sp1 badge badge-amber fs-xs" style={{ padding: "0 5px", minWidth: "auto" }}>{c}</span> : null; })()}
                        {t === "Submittals" && (() => { const c = projSubmittals.filter(s => s.status === "submitted" || s.status === "revise & resubmit").length; return c > 0 ? <span className="ml-sp1 badge badge-amber fs-xs" style={{ padding: "0 5px", minWidth: "auto" }}>{c}</span> : null; })()}
                      </button>
                    ))}
                  </div>
                  {rfiSubTab === "Submittals" && (
                    <div>
                {/* Header + Add button */}
                <div className="flex-between mb-8">
                  <div className="flex-center-gap-6">
                    <span className="font-semi text-sm">Submittal Log</span>
                    <span className="badge badge-blue fs-9">{projSubmittals.length}</span>
                  </div>
                  <div className="flex gap-6">
                    {projSubmittals.length > 0 && (
                      <button className="btn btn-ghost btn-sm flex-center-gap-4" onClick={generateSubPackage} >
                        <FileDown size={13} /> Generate Package
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setLibPickerOpen(!libPickerOpen); setLibSelected(new Set()); setLibSearch(""); setLibCatFilter("all"); }}>+ Add from Library</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { resetSubForm(); setSubFormOpen(!subFormOpen); }}>+ Add Submittal</button>
                  </div>
                </div>

                {libPickerOpen && (() => {
                  const lib = (app.submittalLibrary || []);
                  const libFiltered = lib.filter(item => {
                    if (libCatFilter !== "all" && item.category !== libCatFilter) return false;
                    if (!libSearch) return true;
                    const q = libSearch.toLowerCase();
                    return item.itemName.toLowerCase().includes(q) || (item.manufacturer || "").toLowerCase().includes(q) || (item.specSection || "").toLowerCase().includes(q);
                  });

                  const toggleItem = (id) => {
                    setLibSelected(prev => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    });
                  };

                  const addSelected = () => {
                    if (libSelected.size === 0) return app.show("Select at least one item", "err");
                    const selectedItems = lib.filter(i => libSelected.has(i.id));
                    const today = new Date().toISOString().slice(0, 10);
                    const gcContact = draft.contact || draft.gcSuperName || draft.gcPmName || "";

                    const existingNums = projSubmittals.map(s => s.number || "");
                    let nextNum = projSubmittals.length + 1;
                    let prefix = "SUB-";
                    if (existingNums.length > 0) {
                      const last = existingNums[existingNums.length - 1];
                      const match = last.match(/^([A-Za-z0-9]+-?)(\d+)$/);
                      if (match) {
                        prefix = match[1];
                        nextNum = parseInt(match[2]) + 1;
                      }
                    }

                    const newSubmittals = selectedItems.map((item, idx) => ({
                      id: crypto.randomUUID(),
                      projectId: draft.id,
                      number: prefix + String(nextNum + idx).padStart(3, "0"),
                      description: item.itemName,
                      specSection: item.specSection || "",
                      type: item.type || "product data",
                      status: "submitted",
                      dateSubmitted: today,
                      dateReturned: "",
                      distributedBy: gcContact,
                      notes: `From library: ${item.manufacturer || ""} ${item.specModel || ""}`.trim(),
                      created: new Date().toISOString(),
                      libraryItemId: item.id,
                    }));

                    app.setSubmittals(prev => [...prev, ...newSubmittals]);

                    const projName = draft.name || "Unknown";
                    app.setSubmittalLibrary(prev => prev.map(i =>
                      libSelected.has(i.id) ? { ...i, lastUsedDate: today, lastUsedProject: projName } : i
                    ));

                    app.show(`${newSubmittals.length} submittal${newSubmittals.length !== 1 ? "s" : ""} added from library`, "ok");
                    setLibPickerOpen(false);
                    setLibSelected(new Set());
                  };

                  return (
                    <div className="card mb-12 p-sp4 bg-bg3" style={{ border: "1px solid var(--blue-dim)" }}>
                      <div className="flex-between mb-8">
                        <span className="font-semi text-sm">Pick from Submittal Library</span>
                        <div className="flex gap-8">
                          {libSelected.size > 0 && <button className="btn btn-primary btn-sm" onClick={addSelected}>Add Selected ({libSelected.size})</button>}
                          <button className="btn btn-ghost btn-sm" onClick={() => setLibPickerOpen(false)}>Cancel</button>
                        </div>
                      </div>
                      <div className="flex gap-8 mb-8 flex-wrap">
                        <input className="form-input flex-1" placeholder="Search library..." value={libSearch} onChange={e => setLibSearch(e.target.value)} style={{ minWidth: 200, maxWidth: 300 }} />
                        <select className="form-select" value={libCatFilter} onChange={e => setLibCatFilter(e.target.value)} style={{ width: 160 }}>
                          <option value="all">All Categories</option>
                          {SUBMITTAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ maxHeight: 280, overflowY: "auto" }}>
                        <table className="data-table">
                          <thead><tr><th style={{ width: 30 }}></th><th>Item</th><th>Manufacturer</th><th style={{ width: 80 }}>Spec</th><th style={{ width: 110 }}>Category</th><th style={{ width: 80 }}>Status</th></tr></thead>
                          <tbody>
                            {libFiltered.length === 0 && <tr><td colSpan={6} className="text-center text-dim" style={{ padding: "var(--space-4)" }}>No items match</td></tr>}
                            {libFiltered.map(item => (
                              <tr key={item.id} className="cursor-pointer" onClick={() => toggleItem(item.id)} style={{ background: libSelected.has(item.id) ? "rgba(59,130,246,0.1)" : undefined }}>
                                <td><input type="checkbox" checked={libSelected.has(item.id)} onChange={() => toggleItem(item.id)} /></td>
                                <td className="font-semi text-sm">{item.itemName}</td>
                                <td className="text-xs">{item.manufacturer || "\u2014"}</td>
                                <td className="font-mono text-xs">{item.specSection || "\u2014"}</td>
                                <td className="text-xs">{item.category || "\u2014"}</td>
                                <td><span className={`badge fs-xs capitalize ${item.approvalStatus === "approved" ? "badge-green" : item.approvalStatus === "pending" ? "badge-amber" : "badge-ghost"}`}>{item.approvalStatus}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Filters */}
                <div className="flex gap-4 mb-8 flex-wrap">
                  {[["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["action", "Action Required"]].map(([key, label]) => (
                    <button key={key} className={`btn btn-sm ${subFilter === key ? "btn-primary" : "btn-ghost"} fs-10`} onClick={() => setSubFilter(key)}>
                      {label}
                      {key === "action" && projSubmittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length > 0 && (
                        <span className="ml-sp1 fs-xs c-white" style={{ background: "var(--red)", borderRadius: "var(--radius-pill)", padding: "0 5px" }}>
                          {projSubmittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Add/Edit Form */}
                {subFormOpen && (
                  <div className="card mb-sp3 p-sp4 bg-bg3" style={{ border: "1px solid var(--blue-dim)" }}>
                    <div className="flex-between mb-8">
                      <span className="font-semi text-sm">{subEditId ? "Edit Submittal" : "New Submittal"}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setSubFormOpen(false); resetSubForm(); }}>Cancel</button>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div style={{ flex: "0 0 80px" }}>
                        <label className="text-xs text-dim">Number</label>
                        <input className="input input-sm" placeholder={String(subNextNum)} value={subForm.number} onChange={e => setSubForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-200">
                        <label className="text-xs text-dim">Description</label>
                        <input className="input input-sm" placeholder="e.g. Metal stud framing — 20ga 3-5/8&quot; studs" value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="flex-0-100">
                        <label className="text-xs text-dim">Spec Section</label>
                        <input className="input input-sm" placeholder="09 21 16" value={subForm.specSection} onChange={e => setSubForm(p => ({ ...p, specSection: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div style={{ flex: "0 0 150px" }}>
                        <label className="text-xs text-dim">Type</label>
                        <select className="input input-sm" value={subForm.type} onChange={e => setSubForm(p => ({ ...p, type: e.target.value }))}>
                          {SUB_TYPES.map(t => <option key={t} value={t}>{t.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: "0 0 170px" }}>
                        <label className="text-xs text-dim">Status</label>
                        <select className="input input-sm" value={subForm.status} onChange={e => setSubForm(p => ({ ...p, status: e.target.value }))}>
                          {SUB_STATUSES.map(st => <option key={st} value={st}>{st.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Submitted</label>
                        <input className="input input-sm" type="date" value={subForm.dateSubmitted} onChange={e => setSubForm(p => ({ ...p, dateSubmitted: e.target.value }))} />
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Returned</label>
                        <input className="input input-sm" type="date" value={subForm.dateReturned} onChange={e => setSubForm(p => ({ ...p, dateReturned: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Notes</label>
                      <textarea className="input input-sm resize-v" rows={2} placeholder="Additional notes..." value={subForm.notes} onChange={e => setSubForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-8 justify-end">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setSubFormOpen(false); resetSubForm(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={saveSub}>{subEditId ? "Update" : "Add"} Submittal</button>
                    </div>
                  </div>
                )}

                {/* Submittal Table */}
                {filteredSubmittals.length === 0 ? (
                  <div className="text-sm text-dim text-center p-24">
                    {projSubmittals.length === 0 ? "No submittals — click \"+ Add Submittal\" to create one" : "No submittals match this filter"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Description</th>
                          <th style={{ width: 80 }}>Spec</th>
                          <th style={{ width: 100 }}>Type</th>
                          <th style={{ width: 120 }}>Status</th>
                          <th style={{ width: 90 }}>Submitted</th>
                          <th style={{ width: 90 }}>Returned</th>
                          <th style={{ width: 70 }}>Days Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmittals.map(s => {
                          const days = subDaysOut(s);
                          const expanded = subExpandedId === s.id;
                          const stBadge = SUB_STATUS_BADGE(s.status);
                          return (
                            <Fragment key={s.id}>
                              <tr className="cursor-pointer" onClick={() => setSubExpandedId(expanded ? null : s.id)}>
                                <td className="num">{s.number}</td>
                                <td className="font-semi fs-label">{s.description || s.name || "—"}</td>
                                <td className="text-xs font-mono">{s.specSection || s.spec || "—"}</td>
                                <td className="text-xs text-capitalize">{s.type || "—"}</td>
                                <td>
                                  <span className="badge capitalize fs-xs" style={{ background: stBadge.bg, color: stBadge.color }}>{s.status}</span>
                                </td>
                                <td className="text-xs">{s.dateSubmitted || s.date || "—"}</td>
                                <td className="text-xs">{s.dateReturned || "—"}</td>
                                <td className="num" style={{ color: days !== null && days > 14 ? "var(--red)" : undefined, fontWeight: days !== null && days > 14 ? 700 : undefined }}>
                                  {days !== null ? `${days}d` : "—"}
                                </td>
                              </tr>
                              {expanded && (
                                <tr>
                                  <td colSpan={8} className="bg-bg3" style={{ padding: 0 }}>
                                    <div className="p-16">
                                      <div className="flex gap-16 flex-wrap mb-8">
                                        <div><span className="text-dim text-xs">TYPE</span><div className="text-sm text-capitalize">{s.type || "—"}</div></div>
                                        <div><span className="text-dim text-xs">SPEC SECTION</span><div className="text-sm font-mono">{s.specSection || s.spec || "—"}</div></div>
                                        <div><span className="text-dim text-xs">STATUS</span><div><span className="badge capitalize fs-xs" style={{ background: stBadge.bg, color: stBadge.color }}>{s.status}</span></div></div>
                                        <div><span className="text-dim text-xs">DATE SUBMITTED</span><div className="text-sm">{s.dateSubmitted || s.date || "—"}</div></div>
                                        <div><span className="text-dim text-xs">DATE RETURNED</span><div className="text-sm">{s.dateReturned || "—"}</div></div>
                                        {days !== null && <div><span className="text-dim text-xs">DAYS OUT</span><div className="text-sm" style={{ color: days > 14 ? "var(--red)" : "var(--amber)", fontWeight: "var(--weight-bold)" }}>{days} days{days > 14 ? " ⚠" : ""}</div></div>}
                                      </div>
                                      {s.notes && <div className="mb-8"><span className="text-dim text-xs">NOTES</span><div className="text-sm ws-pre-wrap">{s.notes}</div></div>}
                                      <div className="text-xs text-muted mb-8">Created: {s.created ? new Date(s.created).toLocaleDateString() : "—"}</div>
                                      <div className="flex gap-8">
                                        <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); editSub(s); }}>Edit</button>
                                        <button className="btn btn-sm btn-ghost text-red" onClick={(e) => { e.stopPropagation(); deleteSub(s.id); }}>Delete</button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary stats */}
                {projSubmittals.length > 0 && (
                  <div className="flex gap-16 flex-wrap mt-sp3" style={{ padding: "var(--space-2) 0", borderTop: "1px solid var(--border)" }}>
                    <div className="text-xs"><span className="text-dim">Total:</span> <span className="font-mono">{projSubmittals.length}</span></div>
                    <div className="text-xs"><span className="text-green">Approved:</span> <span className="font-mono">{projSubmittals.filter(s => s.status === "approved").length}</span></div>
                    <div className="text-xs"><span className="text-amber">Submitted:</span> <span className="font-mono">{projSubmittals.filter(s => s.status === "submitted").length}</span></div>
                    <div className="text-xs"><span className="text-red">Action Req:</span> <span className="font-mono">{projSubmittals.filter(s => ["revise & resubmit", "rejected"].includes(s.status)).length}</span></div>
                    {projSubmittals.some(s => { const d = subDaysOut(s); return d !== null && d > 14; }) && (
                      <div className="text-xs text-red fw-700">Overdue: {projSubmittals.filter(s => { const d = subDaysOut(s); return d !== null && d > 14; }).length}</div>
                    )}
                  </div>
                )}
                    </div>
                  )}
                  {rfiSubTab === "RFIs" && (
                    <div className="flex-col gap-12">
                {/* Summary stats */}
                <div className="flex gap-16 flex-wrap field-card-compact">
                  <div><span className="text-dim text-xs">TOTAL RFIs</span><div className="font-mono text-sm">{projRFIs.length}</div></div>
                  <div><span className="text-dim text-xs">OPEN</span><div className="font-mono text-sm" style={{ color: rfiOpenCount > 0 ? "var(--amber)" : "var(--green)" }}>{rfiOpenCount}</div></div>
                  <div><span className="text-dim text-xs">OVERDUE (&gt;7d)</span><div className="font-mono text-sm" style={{ color: rfiOverdueCount > 0 ? "var(--red)" : "var(--green)" }}>{rfiOverdueCount}</div></div>
                  <div><span className="text-dim text-xs">AVG RESPONSE</span><div className="font-mono text-sm">{rfiAvgResponse !== null ? rfiAvgResponse + " days" : "—"}</div></div>
                </div>

                {/* Filters + Add button */}
                <div className="flex-between flex-wrap gap-8">
                  <div className="flex gap-4">
                    {["all", "open", "answered", "overdue"].map(f => (
                      <button key={f} className={`btn btn-sm capitalize fs-xs ${rfiFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setRfiFilter(f)}
                      >{f}{f === "overdue" && rfiOverdueCount > 0 ? ` (${rfiOverdueCount})` : ""}</button>
                    ))}
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => { resetRfiForm(); setRfiFormOpen(true); }}>+ Add RFI</button>
                </div>

                {/* RFI Form (add/edit) */}
                {rfiFormOpen && (
                  <div className="card card-amber-accent">
                    <div className="flex-between mb-8">
                      <span className="font-semi text-sm">{rfiEditId ? "Edit RFI" : "New RFI"}</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setRfiFormOpen(false); resetRfiForm(); }}>Cancel</button>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">RFI #</label>
                        <input className="input input-sm" placeholder={`RFI-${String(rfiNextNum).padStart(3, "0")}`} value={rfiForm.number} onChange={e => setRfiForm(p => ({ ...p, number: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-200">
                        <label className="text-xs text-dim">Subject *</label>
                        <input className="input input-sm" placeholder="RFI subject/title" value={rfiForm.subject} onChange={e => setRfiForm(p => ({ ...p, subject: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Question / Description</label>
                      <textarea className="input" rows={3} placeholder="Describe the question or information needed..." value={rfiForm.question} onChange={e => setRfiForm(p => ({ ...p, question: e.target.value }))} className="w-full fs-12" />
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-1 min-w-150">
                        <label className="text-xs text-dim">Spec / Drawing Reference</label>
                        <input className="input input-sm" placeholder="e.g. Section 09 29 00, Dwg A-201" value={rfiForm.specRef} onChange={e => setRfiForm(p => ({ ...p, specRef: e.target.value }))} />
                      </div>
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">Priority</label>
                        <select className="input input-sm" value={rfiForm.priority} onChange={e => setRfiForm(p => ({ ...p, priority: e.target.value }))}>
                          {RFI_PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                      </div>
                      <div className="flex-0-120">
                        <label className="text-xs text-dim">Status</label>
                        <select className="input input-sm" value={rfiForm.status} onChange={e => setRfiForm(p => ({ ...p, status: e.target.value }))}>
                          {RFI_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Submitted</label>
                        <input type="date" className="input input-sm" value={rfiForm.dateSubmitted} onChange={e => setRfiForm(p => ({ ...p, dateSubmitted: e.target.value }))} />
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Date Answered</label>
                        <input type="date" className="input input-sm" value={rfiForm.dateAnswered} onChange={e => setRfiForm(p => ({ ...p, dateAnswered: e.target.value }))} />
                      </div>
                      <div className="flex-1 min-w-150">
                        <label className="text-xs text-dim">Submitted To</label>
                        <input className="input input-sm" placeholder="GC / Architect name" value={rfiForm.submittedTo} onChange={e => setRfiForm(p => ({ ...p, submittedTo: e.target.value }))} />
                      </div>
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Ball in Court</label>
                        <select className="input input-sm" value={rfiForm.ballInCourt} onChange={e => setRfiForm(p => ({ ...p, ballInCourt: e.target.value }))}>
                          <option value="GC">GC</option>
                          <option value="Architect">Architect</option>
                          <option value="Engineer">Engineer</option>
                          <option value="Owner">Owner</option>
                          <option value="EBC">EBC (Us)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Answer / Response</label>
                      <textarea className="input" rows={2} placeholder="Response received..." value={rfiForm.answer} onChange={e => setRfiForm(p => ({ ...p, answer: e.target.value }))} className="w-full fs-12" />
                    </div>
                    {/* Response Attachments */}
                    <div className="mb-8">
                      <label className="text-xs text-dim">Response Attachments</label>
                      <div className="flex gap-sp2 flex-wrap mt-sp1">
                        {(rfiForm.responseAttachments || []).map((att, ai) => (
                          <div key={ai} className="flex gap-sp1 rounded-control bg-bg3 fs-tab" style={{ padding: "var(--space-1) var(--space-2)", border: "1px solid var(--border)" }}>
                            <Paperclip size={12} className="c-text3" />
                            <span className="truncate" style={{ maxWidth: 120 }}>{att.name}</span>
                            <button className="c-red cursor-pointer" style={{ background: "none", border: "none", fontSize: 11, padding: 0 }}
                              onClick={() => setRfiForm(p => ({ ...p, responseAttachments: p.responseAttachments.filter((_, j) => j !== ai) }))}>✕</button>
                          </div>
                        ))}
                        <label className="flex gap-sp1 rounded-control cursor-pointer fs-tab c-blue" style={{ padding: "var(--space-1) var(--space-2)", border: "1px dashed var(--border)", background: "none" }}>
                          <Paperclip size={12} /> Attach
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setRfiForm(p => ({ ...p, responseAttachments: [...(p.responseAttachments || []), { name: file.name, size: file.size, type: file.type, data: reader.result, uploadedAt: new Date().toISOString() }] }));
                              };
                              reader.readAsDataURL(file);
                              e.target.value = "";
                            }} />
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Cost Impact</label>
                        <select className="input input-sm" value={rfiForm.costImpact} onChange={e => setRfiForm(p => ({ ...p, costImpact: e.target.value }))}>
                          <option value="None">None</option>
                          <option value="TBD">TBD</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {rfiForm.costImpact === "Yes" && (
                        <div className="flex-0-140">
                          <label className="text-xs text-dim">Cost Amount ($)</label>
                          <input type="number" className="input input-sm" placeholder="0" value={rfiForm.costAmount} onChange={e => setRfiForm(p => ({ ...p, costAmount: e.target.value }))} />
                        </div>
                      )}
                      <div className="flex-0-140">
                        <label className="text-xs text-dim">Schedule Impact</label>
                        <select className="input input-sm" value={rfiForm.scheduleImpact} onChange={e => setRfiForm(p => ({ ...p, scheduleImpact: e.target.value }))}>
                          <option value="None">None</option>
                          <option value="TBD">TBD</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                      {rfiForm.scheduleImpact === "Yes" && (
                        <div className="flex-0-140">
                          <label className="text-xs text-dim">Days Delayed</label>
                          <input type="number" className="input input-sm" placeholder="0" value={rfiForm.scheduleDays} onChange={e => setRfiForm(p => ({ ...p, scheduleDays: e.target.value }))} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-8 justify-end">
                      <button className="btn btn-sm btn-ghost" onClick={() => { setRfiFormOpen(false); resetRfiForm(); }}>Cancel</button>
                      <button className="btn btn-sm btn-primary" onClick={saveRfi}>{rfiEditId ? "Update RFI" : "Add RFI"}</button>
                    </div>
                  </div>
                )}

                {/* RFI List */}
                {filteredRFIs.length === 0 ? (
                  <div className="text-center text-muted p-32">
                    <div className="mb-sp2 justify-center" style={{ display: "flex" }}><ClipboardList style={{ width: 32, height: 32, opacity: 0.4 }} /></div>
                    <div className="text-sm">{rfiFilter === "all" ? "No RFIs yet" : `No ${rfiFilter} RFIs`}</div>
                    <div className="text-xs text-dim mt-4">Click "+ Add RFI" to create one</div>
                  </div>
                ) : (
                  <div className="flex-col gap-4">
                    {filteredRFIs.sort((a, b) => {
                      const numA = parseInt(String(a.number || "0").replace(/\D/g, "")) || 0;
                      const numB = parseInt(String(b.number || "0").replace(/\D/g, "")) || 0;
                      return numB - numA;
                    }).map(r => {
                      const days = rfiDaysOut(r);
                      const isOverdue = days !== null && days > 7;
                      const stBadge = RFI_STATUS_BADGE(r.status);
                      const isExpanded = rfiExpandedId === r.id;
                      return (
                        <div key={r.id} className="card" style={{
                          padding: "var(--space-3) var(--space-3)",
                          borderLeft: `3px solid ${stBadge.color}`,
                          cursor: "pointer",
                          background: isOverdue ? "rgba(239,68,68,0.06)" : undefined,
                        }} onClick={() => setRfiExpandedId(isExpanded ? null : r.id)}>
                          <div className="flex-between items-start">
                            <div className="flex-1">
                              <div className="flex gap-8 items-center flex-wrap">
                                <span className="font-mono text-xs font-bold text-amber">{r.number}</span>
                                <span className="text-sm font-semi">{r.subject}</span>
                              </div>
                              <div className="flex gap-6 mt-4 flex-wrap flex-center">
                                <span className="rounded-control fw-semi fs-xs" style={{ display: "inline-block", padding: "var(--space-1) var(--space-2)", background: stBadge.bg, color: stBadge.color }}>{r.status}</span>
                                <span className={`badge ${RFI_PRIORITY_BADGE(r.priority)} fs-9`}>{r.priority}</span>
                                {r.submittedTo && <span className="text-xs text-muted">To: {r.submittedTo}</span>}
                                {r.specRef && <span className="text-xs text-muted">Ref: {r.specRef}</span>}
                                {days !== null && (
                                  <span className="text-xs font-mono" style={{ color: isOverdue ? "var(--red)" : "var(--amber)", fontWeight: isOverdue ? 700 : 400 }}>
                                    {days}d outstanding{isOverdue ? " ⚠" : ""}
                                  </span>
                                )}
                                {r.costImpact && r.costImpact !== "None" && (
                                  <span className="text-xs text-amber">
                                    Cost: {r.costImpact === "Yes" ? fmt(r.costAmount || 0) : "TBD"}
                                  </span>
                                )}
                                {r.scheduleImpact && r.scheduleImpact !== "None" && (
                                  <span className="text-xs text-amber">
                                    Sched: {r.scheduleImpact === "Yes" ? `${r.scheduleDays || 0}d` : "TBD"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4 flex-shrink-0">
                              <button className="btn btn-sm btn-ghost fs-10" onClick={e => { e.stopPropagation(); editRfi(r); }}>Edit</button>
                              <button className="btn btn-sm btn-ghost fs-xs c-red" onClick={e => { e.stopPropagation(); deleteRfi(r.id); }}>Del</button>
                            </div>
                          </div>
                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-sp3" style={{ paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
                              {r.question && (
                                <div className="mb-8">
                                  <div className="text-xs text-dim font-semi">QUESTION</div>
                                  <div className="text-sm ws-pre-wrap">{r.question}</div>
                                </div>
                              )}
                              {r.answer && (
                                <div className="mb-8">
                                  <div className="text-xs text-dim font-semi">ANSWER</div>
                                  <div className="text-sm ws-pre-wrap text-green">{r.answer}</div>
                                </div>
                              )}
                              <div className="flex gap-16 flex-wrap text-xs text-muted">
                                {r.dateSubmitted && <span>Submitted: {r.dateSubmitted}</span>}
                                {r.dateAnswered && <span>Answered: {r.dateAnswered}</span>}
                                {r.dateSubmitted && r.dateAnswered && (
                                  <span>Response time: {Math.floor((new Date(r.dateAnswered) - new Date(r.dateSubmitted)) / 86400000)} days</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Crew ── */}
            {projTab === "team" && (
              <div>
                {projCrew.length === 0 ? <div className="text-sm text-dim text-center p-24">No team assigned</div> : (
                  <table className="data-table">
                    <thead><tr><th>Employee</th><th>Days</th><th>Hours</th></tr></thead>
                    <tbody>
                      {projCrew.map(s => {
                        const emp = app.employees.find(e => String(e.id) === String(s.employeeId));
                        const days = ["mon","tue","wed","thu","fri"].filter(d => s.days?.[d]).length;
                        return (
                          <tr key={s.id}>
                            <td className="font-semi">{emp?.name || "Unknown"}<div className="text-xs text-muted">{emp?.role}</div></td>
                            <td>{days}d/wk</td>
                            <td>{s.hours?.start || "6:30"} – {s.hours?.end || "3:00"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <div className="text-xs text-dim mt-8">Total labor logged: <span className="font-mono">{totalHrs.toFixed(1)}h</span></div>
              </div>
            )}

            {/* ── Financials ── */}
            {projTab === "financials" && (() => {
              const approvedCOTotal = projCOs.filter(c => c.status === "approved").reduce((s, c) => s + (c.amount || 0), 0);
              const pendingCOTotal = projCOs.filter(c => c.status !== "approved" && c.status !== "rejected").reduce((s, c) => s + (c.amount || 0), 0);
              const costs = computeProjectTotalCost(draft.id, draft.name, app.timeEntries, app.employees, app.apBills, app.companySettings?.laborBurdenMultiplier || 1.35, app.accruals || []);
              const adjustedContract = (draft.contract || 0) + approvedCOTotal;
              const activeInvoices = filterActive(projInvoices);
              const billedToDate = activeInvoices.reduce((s, i) => s + (i.amount || 0), 0);
              const defaultRetainageRate = app.companySettings?.defaultRetainageRate || 10;
              const retainageRate = draft.retainageRate ?? defaultRetainageRate;
              // Retainage: prefer per-invoice retainageWithheld, fall back to flat rate for legacy records
              const retainageReceivable = activeInvoices.reduce((s, i) => {
                if (i.retainageWithheld != null) return s + (i.retainageWithheld || 0);
                return s + Math.round((i.amount || 0) * defaultRetainageRate / 100);
              }, 0);
              // Correct % complete = cost incurred / total estimated cost (budget), NOT cost / adjustedContract.
              // Unclamped % complete is shown to surface overruns; earned revenue is capped at 100%
              // because you cannot recognize more revenue than the contract authorizes — the overrun
              // is a projected loss, not additional earnings. Matches FinReports convention.
              const totalEstimatedCost = (app.budgets?.[draft.id] || []).reduce((s, line) => s + (line.budgetAmount || 0), 0);
              const hasBudget = totalEstimatedCost > 0;
              const percentComplete = hasBudget ? costs.total / totalEstimatedCost : 0;
              const earnedRevenue = hasBudget ? Math.min(percentComplete, 1) * adjustedContract : 0;
              const projectedLoss = hasBudget && percentComplete > 1 ? (percentComplete - 1) * adjustedContract : 0;
              const overUnder = hasBudget ? billedToDate - earnedRevenue : 0;
              const grossMargin = adjustedContract > 0 ? adjustedContract - costs.total : 0;
              const grossMarginPct = adjustedContract > 0 ? Math.round((grossMargin / adjustedContract) * 100) : 0;
              const paidTotal = projInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
              const netReceived = paidTotal - retainageReceivable;
              // Commitments (POs/subcontracts) — open remaining exposure
              const projectCommitments = (app.commitments || []).filter(c => String(c.projectId) === String(draft.id) && c.status === "active");
              const totalCommitted = projectCommitments.reduce((s, c) => s + (c.remainingCommitment || 0), 0);
              const projectedFinalCost = costs.total + totalCommitted;
              const projectedFinalMargin = adjustedContract > 0 ? adjustedContract - projectedFinalCost : 0;
              const projectedFinalMarginPct = adjustedContract > 0 ? Math.round((projectedFinalMargin / adjustedContract) * 100) : 0;
              return (
              <div>
                {/* Contract KPIs */}
                <div className="flex gap-16 mb-16 flex-wrap">
                  <div><span className="text-dim text-xs">CONTRACT</span><div className="font-mono text-amber">{fmt(draft.contract)}</div></div>
                  <div><span className="text-dim text-xs">APPROVED COs</span><div className="font-mono text-green">{fmt(approvedCOTotal)}</div></div>
                  <div><span className="text-dim text-xs">PENDING COs</span><div className="font-mono" style={{color: pendingCOTotal > 0 ? "var(--red)" : "var(--text3)"}}>{fmt(pendingCOTotal)}</div></div>
                  <div><span className="text-dim text-xs">ADJUSTED CONTRACT</span><div className="font-mono font-bold">{fmt(adjustedContract)}</div></div>
                  <div><span className="text-dim text-xs">INVOICED</span><div className="font-mono">{fmt(billedToDate)}</div></div>
                  <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono" style={{ color: remaining > 0 ? "var(--green)" : "var(--red)" }}>{fmt(remaining)}</div></div>
                </div>

                {/* Retainage + Over/Under Billing KPIs */}
                <div className="flex gap-16 mb-16 flex-wrap">
                  <div><span className="text-dim text-xs">RETAINAGE RECEIVABLE ({retainageRate}%)</span><div className="font-mono text-amber">{fmt(retainageReceivable)}</div></div>
                  {hasBudget ? (
                    <>
                      <div>
                        <span className="text-dim text-xs">OVER/(UNDER) BILLED</span>
                        <div className="font-mono" style={{ color: overUnder >= 0 ? "var(--green)" : "var(--red)" }}>
                          {overUnder >= 0 ? fmt(Math.round(overUnder)) : `(${fmt(Math.round(Math.abs(overUnder)))})`}
                        </div>
                        <div className="text-xs" style={{ color: overUnder >= 0 ? "var(--green)" : "var(--red)", opacity: 0.8 }}>
                          {overUnder >= 0 ? "Cash ahead" : "Earnings ahead of cash"}
                        </div>
                      </div>
                      <div>
                        <span className="text-dim text-xs">% COMPLETE (COST/BUDGET)</span>
                        <div className="font-mono" style={{ color: percentComplete > 1 ? "var(--red)" : undefined }}>
                          {Math.round(percentComplete * 100)}%{percentComplete > 1 ? " ⚠" : ""}
                        </div>
                      </div>
                      <div><span className="text-dim text-xs">EARNED REVENUE</span><div className="font-mono">{fmt(Math.round(earnedRevenue))}</div></div>
                      {projectedLoss > 0 && (
                        <div>
                          <span className="text-dim text-xs">PROJECTED LOSS</span>
                          <div className="font-mono c-red">({fmt(Math.round(projectedLoss))})</div>
                          <div className="text-xs c-red" style={{ opacity: 0.8 }}>Cost over budget</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="fs-label c-amber" style={{ fontStyle: "italic", alignSelf: "center" }}>
                      No budget set — cannot compute earned revenue / over-under billing. Add budget lines on the Budget subtab.
                    </div>
                  )}
                </div>

                {/* Project P&L Summary Card */}
                <div className="card p-12 mb-16" style={{ border: `1px solid ${grossMarginPct < (app.companySettings?.marginAlertThreshold || 25) ? "var(--red)" : "var(--green)"}` }}>
                  <div className="text-xs font-semi mb-8 text-amber">PROJECT P&L SUMMARY</div>
                  <div className="flex gap-16 flex-wrap mb-8">
                    <div><span className="text-dim text-xs">CONTRACT</span><div className="font-mono">{fmt(draft.contract)}</div></div>
                    <div><span className="text-dim text-xs">+ CHANGE ORDERS</span><div className="font-mono">{fmt(approvedCOTotal)}</div></div>
                    <div><span className="text-dim text-xs">= ADJUSTED CONTRACT</span><div className="font-mono font-bold text-amber">{fmt(adjustedContract)}</div></div>
                  </div>
                  <div className="text-xs font-semi mb-4 c-text3">COST BREAKDOWN</div>
                  <div className="flex gap-16 flex-wrap mb-8">
                    <div><span className="text-dim text-xs">LABOR (BURDENED)</span><div className="font-mono">{fmt(Math.round(costs.labor))}</div></div>
                    <div><span className="text-dim text-xs">MATERIAL</span><div className="font-mono">{fmt(Math.round(costs.material))}</div></div>
                    <div><span className="text-dim text-xs">SUBCONTRACTOR</span><div className="font-mono">{fmt(Math.round(costs.subcontractor))}</div></div>
                    <div><span className="text-dim text-xs">EQUIPMENT/OTHER</span><div className="font-mono">{fmt(Math.round(costs.otherAP))}</div></div>
                    <div><span className="text-dim text-xs">TOTAL COST TO DATE</span><div className="font-mono font-bold">{fmt(Math.round(costs.total))}</div></div>
                  </div>
                  {/* Commitment visibility — POs/subcontracts not yet invoiced */}
                  <div className="flex gap-16 flex-wrap mb-8" style={{ borderTop: "1px dashed var(--border)", paddingTop: "var(--space-2)" }}>
                    <div>
                      <span className="text-dim text-xs">COMMITTED REMAINING</span>
                      <div className="font-mono" style={{ color: totalCommitted > 0 ? "var(--amber)" : "var(--text3)" }}>{fmt(Math.round(totalCommitted))}</div>
                      <div className="text-xs text-dim">{projectCommitments.length} open commitment{projectCommitments.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div>
                      <span className="text-dim text-xs">PROJECTED FINAL COST</span>
                      <div className="font-mono font-bold">{fmt(Math.round(projectedFinalCost))}</div>
                      <div className="text-xs text-dim">Cost to date + committed</div>
                    </div>
                    <div>
                      <span className="text-dim text-xs">PROJECTED FINAL MARGIN %</span>
                      <div className="font-mono font-bold" style={{ color: projectedFinalMarginPct < (app.companySettings?.marginAlertThreshold || 25) ? "var(--red)" : "var(--green)" }}>{projectedFinalMarginPct}%</div>
                      <div className="text-xs text-dim">{fmt(Math.round(projectedFinalMargin))}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-2)" }}>
                    <div className="flex gap-16 flex-wrap mb-8">
                      <div>
                        <span className="text-dim text-xs">GROSS MARGIN $ (TO DATE)</span>
                        <div className="font-mono font-bold" style={{ color: grossMargin >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(Math.round(grossMargin))}</div>
                      </div>
                      <div>
                        <span className="text-dim text-xs">GROSS MARGIN % (TO DATE)</span>
                        <div className="font-mono font-bold" style={{ color: grossMarginPct < (app.companySettings?.marginAlertThreshold || 25) ? "var(--red)" : "var(--green)" }}>{grossMarginPct}%</div>
                      </div>
                    </div>
                    <div className="flex gap-16 flex-wrap">
                      <div><span className="text-dim text-xs">BILLED TO DATE</span><div className="font-mono">{fmt(billedToDate)}</div></div>
                      <div><span className="text-dim text-xs">RETAINAGE HELD</span><div className="font-mono text-amber">{fmt(retainageReceivable)}</div></div>
                      <div><span className="text-dim text-xs">NET RECEIVED</span><div className="font-mono" style={{ color: netReceived > 0 ? "var(--green)" : "var(--text3)" }}>{fmt(Math.max(0, netReceived))}</div></div>
                      {hasBudget ? (
                        <div>
                          <span className="text-dim text-xs">OVER/(UNDER) BILLED</span>
                          <div className="font-mono" style={{ color: overUnder >= 0 ? "var(--green)" : "var(--red)" }}>
                            {overUnder >= 0 ? fmt(Math.round(overUnder)) : `(${fmt(Math.round(Math.abs(overUnder)))})`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-dim text-xs">OVER/(UNDER) BILLED</span>
                          <div className="font-mono text-dim" style={{ fontStyle: "italic" }}>No budget</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Labor budget vs actual — sourced from app.budgets (the single source of truth) */}
                {(() => {
                  const laborBudget = (app.budgets?.[draft.id] || []).filter(l => l.costType === "labor").reduce((s, l) => s + (l.budgetAmount || 0), 0);
                  if (laborBudget <= 0 && costs.labor <= 0) return null;
                  return (
                    <div className="flex gap-16 mb-16 flex-wrap">
                      <div><span className="text-dim text-xs">LABOR BUDGET</span><div className="font-mono">{fmt(laborBudget)}</div></div>
                      <div><span className="text-dim text-xs">LABOR ACTUAL</span><div className="font-mono" style={{ color: costs.labor > laborBudget ? "var(--red)" : "var(--text)" }}>{fmt(Math.round(costs.labor))}</div></div>
                      <div><span className="text-dim text-xs">LABOR REMAINING</span><div className="font-mono" style={{ color: (laborBudget - costs.labor) > 0 ? "var(--green)" : "var(--red)" }}>{fmt(Math.round(laborBudget - costs.labor))}</div></div>
                      <div><span className="text-dim text-xs">LABOR HOURS</span><div className="font-mono">{Math.round(costs.laborHours * 10) / 10}h</div></div>
                    </div>
                  );
                })()}
                {projInvoices.length > 0 && (
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {projInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>{inv.number}</td>
                          <td>{inv.date}</td>
                          <td className="font-mono">{fmt(inv.amount)}</td>
                          <td><span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "pending" ? "badge-amber" : "badge-red"}`}>{inv.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              );
            })()}

            {/* ── SOV (Schedule of Values) ── */}
            {projTab === "sov" && <SOVEditor project={draft} app={app} />}

            {/* ── Closeout ── */}
            {projTab === "closeout" && (() => {
              const CLOSEOUT_ITEMS = [
                { id: "punch_list", label: "Final punch list completed", responsible: "Foreman" },
                { id: "final_walkthrough", label: "Final walk-through with GC", responsible: "PM" },
                { id: "as_builts", label: "As-built drawings submitted", responsible: "PM" },
                { id: "warranty_letter", label: "Warranty letter submitted", responsible: "PM" },
                { id: "lien_waiver_cond", label: "Final lien waiver (conditional) submitted", responsible: "PM" },
                { id: "lien_waiver_uncond", label: "Final lien waiver (unconditional) submitted", responsible: "PM" },
                { id: "final_invoice", label: "Final invoice submitted", responsible: "PM" },
                { id: "final_payment", label: "Final payment received", responsible: "Office" },
                { id: "retainage_invoice", label: "Retainage invoice submitted", responsible: "PM" },
                { id: "retainage_received", label: "Retainage received", responsible: "Office" },
                { id: "om_manuals", label: "O&M manuals submitted (if applicable)", responsible: "PM" },
                { id: "photos_archived", label: "Project photos archived", responsible: "PM" },
                { id: "tools_returned", label: "Tools/equipment returned", responsible: "Foreman" },
                { id: "lessons_learned", label: "Lessons learned documented", responsible: "PM" },
              ];
              const closeout = draft.closeout || { items: [], completedDate: null, notes: "" };
              const itemMap = {};
              (closeout.items || []).forEach(it => { itemMap[it.id] = it; });
              const completedCount = CLOSEOUT_ITEMS.filter(ci => itemMap[ci.id]?.done).length;
              const pct = Math.round((completedCount / CLOSEOUT_ITEMS.length) * 100);
              const isOverdue = draft.end && new Date(draft.end) < new Date();
              const coTotal = projCOs.reduce((s, c) => s + (c.amount || 0), 0);
              const approvedCOs = projCOs.filter(c => c.status === "approved").reduce((s, c) => s + (c.amount || 0), 0);
              const revisedContract = (draft.contract || 0) + coTotal;
              const paidInvoices = projInvoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
              const retainageHeld = Math.round(revisedContract * 0.10);
              const remainingBalance = revisedContract - totalBilled;

              const updateCloseoutItem = (itemId, field, value) => {
                const items = [...(closeout.items || [])];
                const idx = items.findIndex(it => it.id === itemId);
                if (idx >= 0) {
                  items[idx] = { ...items[idx], [field]: value };
                } else {
                  items.push({ id: itemId, done: false, dateCompleted: null, notes: "", responsible: "", [field]: value });
                }
                const allDone = CLOSEOUT_ITEMS.every(ci => items.find(it => it.id === ci.id)?.done);
                const newCloseout = { ...closeout, items, completedDate: allDone ? (closeout.completedDate || new Date().toISOString().slice(0, 10)) : null };
                const updated = { ...draft, closeout: newCloseout };
                app.setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                setDraft(updated);
              };

              const toggleItem = (itemId) => {
                const current = itemMap[itemId]?.done || false;
                const items = [...(closeout.items || [])];
                const idx = items.findIndex(it => it.id === itemId);
                const newVal = !current;
                const dateVal = newVal ? new Date().toISOString().slice(0, 10) : null;
                if (idx >= 0) {
                  items[idx] = { ...items[idx], done: newVal, dateCompleted: dateVal };
                } else {
                  items.push({ id: itemId, done: newVal, dateCompleted: dateVal, notes: "", responsible: "" });
                }
                const allDone = CLOSEOUT_ITEMS.every(ci => items.find(it => it.id === ci.id)?.done);
                const newCloseout = { ...closeout, items, completedDate: allDone ? (closeout.completedDate || new Date().toISOString().slice(0, 10)) : null };
                const updated = { ...draft, closeout: newCloseout };
                app.setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                setDraft(updated);
              };

              return (
              <div className="flex-col gap-12">
                {/* Progress bar */}
                <div>
                  <div className="flex-between mb-4">
                    <span className="text-xs font-semi" style={{ color: pct === 100 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--text-muted)" }}>
                      Closeout Progress: {pct}% ({completedCount}/{CLOSEOUT_ITEMS.length})
                    </span>
                    {closeout.completedDate && <span className="badge badge-green fs-10">Closed {closeout.completedDate}</span>}
                  </div>
                  <div className="progress-bar rounded-control" style={{ height: 10 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)", borderRadius: "var(--radius-control)", transition: "width 0.3s" }} />
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="card p-12">
                  <div className="text-xs font-semi mb-8 text-amber">FINANCIAL SUMMARY</div>
                  <div className="flex gap-16 flex-wrap">
                    <div><span className="text-dim text-xs">ORIGINAL CONTRACT</span><div className="font-mono">{fmt(draft.contract)}</div></div>
                    <div><span className="text-dim text-xs">CHANGE ORDERS</span><div className="font-mono">{fmt(coTotal)} ({projCOs.length})</div></div>
                    <div><span className="text-dim text-xs">REVISED CONTRACT</span><div className="font-mono font-bold text-amber">{fmt(revisedContract)}</div></div>
                    <div><span className="text-dim text-xs">TOTAL BILLED</span><div className="font-mono">{fmt(totalBilled)}</div></div>
                    <div><span className="text-dim text-xs">REMAINING</span><div className="font-mono" style={{ color: remainingBalance > 0 ? "var(--amber)" : "var(--green)" }}>{fmt(remainingBalance)}</div></div>
                    <div><span className="text-dim text-xs">RETAINAGE (EST 10%)</span><div className="font-mono text-red">{fmt(retainageHeld)}</div></div>
                    <div><span className="text-dim text-xs">PAID</span><div className="font-mono text-green">{fmt(paidInvoices)}</div></div>
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <div className="text-xs font-semi mb-8">CLOSEOUT CHECKLIST</div>
                  <div className="flex-col gap-4">
                    {CLOSEOUT_ITEMS.map((ci, idx) => {
                      const item = itemMap[ci.id] || {};
                      const isDone = item.done || false;
                      const itemOverdue = !isDone && isOverdue;
                      const bgColor = isDone ? "rgba(16,185,129,0.08)" : itemOverdue ? "rgba(239,68,68,0.08)" : "rgba(224,148,34,0.05)";
                      const borderColor = isDone ? "var(--green)" : itemOverdue ? "var(--red)" : "var(--border)";
                      return (
                        <div key={ci.id} className="card" style={{ padding: "var(--space-2) var(--space-3)", borderLeft: `3px solid ${borderColor}`, background: bgColor }}>
                          <div className="flex-between items-start">
                            <div className="flex gap-8 items-start flex-1">
                              <button onClick={() => toggleItem(ci.id)}
                                className="btn-bare fs-16 flex-shrink-0 mt-sp1" style={{ padding: 0, lineHeight: 1 }}>
                                {isDone ? <CheckSquare size={16} className="text-green" /> : <Square size={16} className="text-dim" />}
                              </button>
                              <div className="flex-1">
                                <div className="text-sm" style={{ textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.7 : 1 }}>
                                  <span className="fw-500">{idx + 1}. {ci.label}</span>
                                </div>
                                <div className="flex gap-8 mt-4 flex-wrap flex-center">
                                  <span className={`badge ${isDone ? "badge-green" : itemOverdue ? "badge-red" : "badge-amber"} fs-9`}>
                                    {isDone ? "Complete" : itemOverdue ? "Overdue" : "Pending"}
                                  </span>
                                  <span className="text-xs text-muted">Resp: {item.responsible || ci.responsible}</span>
                                  {item.dateCompleted && <span className="text-xs text-muted">{item.dateCompleted}</span>}
                                </div>
                                {/* Inline notes */}
                                <input type="text" placeholder="Notes..." value={item.notes || ""} className="form-input mt-sp1 fs-xs w-full" style={{ padding: "var(--space-1) var(--space-2)", maxWidth: 400 }}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => updateCloseoutItem(ci.id, "notes", e.target.value)} />
                              </div>
                            </div>
                            <div className="ml-sp2 flex-shrink-0">
                              <select value={item.responsible || ci.responsible} className="form-select fs-xs" style={{ padding: "var(--space-1) var(--space-1)", width: 80 }}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateCloseoutItem(ci.id, "responsible", e.target.value)}>
                                <option value="PM">PM</option>
                                <option value="Foreman">Foreman</option>
                                <option value="Office">Office</option>
                                <option value="Emmanuel">Emmanuel</option>
                                <option value="Isai">Isai</option>
                                <option value="Abner">Abner</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Closeout Notes */}
                <div>
                  <div className="text-xs font-semi mb-4">CLOSEOUT NOTES</div>
                  <textarea className="form-textarea w-full fs-12" rows={3} placeholder="General closeout notes..." value={closeout.notes || ""}
                    
                    onChange={e => {
                      const newCloseout = { ...closeout, notes: e.target.value };
                      const updated = { ...draft, closeout: newCloseout };
                      app.setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                      setDraft(updated);
                    }} />
                </div>

                {/* Generate Report Button */}
                <div className="flex gap-8">
                  <button className="btn btn-primary fs-11" onClick={async () => {
                    try {
                      const { generateCloseoutPdf } = await import("../utils/closeoutPdf.js");
                      // Use single source of truth for cost math (matches dashboard + job costing)
                      const closeoutCosts = computeProjectTotalCost(
                        draft.id,
                        draft.name,
                        app.timeEntries,
                        app.employees,
                        app.apBills,
                        app.companySettings?.laborBurdenMultiplier || 1.35,
                        app.accruals || []
                      );
                      // Margin is measured against adjusted contract (contract + approved COs),
                      // NOT billed-to-date. Billing-based margin is wrong when over/underbilled.
                      const closeoutApprovedCOs = projCOs.filter(c => c.status === "approved").reduce((s, c) => s + (c.amount || 0), 0);
                      const closeoutAdjustedContract = (draft.contract || 0) + closeoutApprovedCOs;
                      const closeoutMargin = closeoutAdjustedContract > 0
                        ? Math.round(((closeoutAdjustedContract - closeoutCosts.total) / closeoutAdjustedContract) * 100) + "%"
                        : "N/A";
                      generateCloseoutPdf(draft, {
                        rfis: (app.rfis || []).filter(r => String(r.projectId) === String(draft.id)),
                        submittals: (app.submittals || []).filter(s => String(s.projectId) === String(draft.id)),
                        changeOrders: projCOs,
                        invoices: projInvoices,
                        dailyReports: (app.dailyReports || []).filter(d => String(d.projectId) === String(draft.id)),
                        jsas: (app.jsas || []).filter(j => String(j.projectId) === String(draft.id)),
                        tmTickets: (app.tmTickets || []).filter(t => String(t.projectId) === String(draft.id)),
                        closeoutResult: {
                          readinessScore: pct,
                          grade: pct >= 90 ? "A" : pct >= 75 ? "B" : pct >= 50 ? "C" : pct >= 25 ? "D" : "F",
                          summary: `Closeout ${pct}% complete. ${completedCount} of ${CLOSEOUT_ITEMS.length} items done.${closeout.notes ? " Notes: " + closeout.notes : ""}`,
                          checklist: CLOSEOUT_ITEMS.map(ci => ({
                            item: ci.label,
                            status: (itemMap[ci.id]?.done) ? "complete" : "pending",
                            dateCompleted: itemMap[ci.id]?.dateCompleted || "",
                            responsible: itemMap[ci.id]?.responsible || ci.responsible,
                            notes: itemMap[ci.id]?.notes || "",
                          })),
                          financialStatus: {
                            contractValue: draft.contract || 0,
                            totalBilled,
                            remaining: remainingBalance,
                            retainage: retainageHeld,
                            openCOs: projCOs.filter(c => c.status !== "approved" && c.status !== "rejected").length,
                            totalCost: Math.round(closeoutCosts.total),
                            laborCost: Math.round(closeoutCosts.labor),
                            materialCost: Math.round(closeoutCosts.material),
                            subCost: Math.round(closeoutCosts.subcontractor),
                            otherCost: Math.round(closeoutCosts.otherAP),
                            margin: closeoutMargin,
                          },
                        },
                      });
                      show("Closeout PDF exported", "ok");
                    } catch (err) {
                      show("PDF export failed: " + err.message, "err");
                    }
                  }}>
                    Generate Closeout Report (PDF)
                  </button>
                </div>
              </div>
              );
            })()}

            {/* ── Areas ── */}
            {projTab === "areas" && (
              <AreasTab areas={app.areas} setAreas={app.setAreas} productionLogs={app.productionLogs} employees={app.employees} projectId={draft.id} t={app.t} takeoffs={app.takeoffs} bids={app.bids} project={draft} userRole={app.auth?.role} />
            )}

            {/* ── Punch List ── */}
            {projTab === "punch" && (
              <PunchListTab punchItems={app.punchItems} setPunchItems={app.setPunchItems} areas={(app.areas || []).filter(a => String(a.projectId) === String(draft.id))} employees={app.employees} projectId={draft.id} t={app.t} />
            )}

            {/* ── Decision / Communication Log ── */}
            {projTab === "log" && (
              <DecisionLogTab decisionLog={app.decisionLog} setDecisionLog={app.setDecisionLog} projectId={draft.id} employees={app.employees} t={app.t} />
            )}

            {/* ── Daily Reports (PM view of foreman reports) ── */}
            {projTab === "reports" && (() => {
              const projReports = (app.dailyReports || [])
                .filter(r => String(r.projectId) === String(draft.id))
                .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
              return (
                <div>
                  <div className="flex-between mb-12">
                    <div className="text-sm font-semi">{t("Daily Reports")} ({projReports.length})</div>
                    <span className="text-xs text-muted">{projReports.filter(r => !r.reviewedBy).length} {t("un-reviewed")}</span>
                  </div>
                  {projReports.length === 0 ? (
                    <div className="empty-state p-sp8">
                      <div className="empty-icon"><ClipboardList style={{ width: 40, height: 40 }} /></div>
                      <div className="empty-text">{t("No daily reports yet")}</div>
                    </div>
                  ) : (
                    <div className="flex-col gap-8">
                      {projReports.map(r => (
                        <div key={r.id} className="card" style={{ padding: "var(--space-3) var(--space-4)", borderLeft: r.reviewedBy ? "3px solid var(--green)" : "3px solid var(--amber)" }}>
                          <div className="flex-between mb-4">
                            <div>
                              <span className="text-sm font-bold">{r.date}</span>
                              <span className="text-xs text-muted ml-8">{r.foremanName} · {r.crewCount || (r.teamPresent || []).length} crew · {r.totalHours || 0}h</span>
                            </div>
                            {r.reviewedBy ? (
                              <span className="badge badge-green fs-10">{t("Reviewed")}</span>
                            ) : (
                              <button className="btn btn-sm btn-primary fs-xs" style={{ padding: "var(--space-1) var(--space-2)" }}
                                onClick={() => {
                                  app.setDailyReports(prev => prev.map(dr => dr.id === r.id ? { ...dr, reviewedBy: auth?.name || "PM", reviewedAt: new Date().toISOString() } : dr));
                                  show(t("Report reviewed"));
                                }}>
                                {t("Mark Reviewed")}
                              </button>
                            )}
                          </div>
                          <div className="text-sm mb-4 ws-pre-wrap">{r.workPerformed}</div>
                          {r.materialsReceived && <div className="text-xs text-muted mb-2"><strong>{t("Materials")}:</strong> {r.materialsReceived}</div>}
                          {r.issues && <div className="text-xs mb-2 text-amber"><strong>{t("Issues")}:</strong> {r.issues}</div>}
                          {r.tomorrowPlan && <div className="text-xs text-dim mb-2"><strong>{t("Tomorrow")}:</strong> {r.tomorrowPlan}</div>}
                          {r.safetyIncident && r.safetyIncident !== "None" && (
                            <div className="text-xs text-red fw-700">{t("SAFETY INCIDENT")}: {r.safetyDescription || r.safetyIncident}</div>
                          )}
                          <div className="text-xs text-dim mt-6">
                            {r.conditions || r.weatherCondition} {r.temperature} · {t("Submitted")} {new Date(r.submittedAt || r.createdAt).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}
                            {r.reviewedBy && ` · ${t("Reviewed by")} ${r.reviewedBy}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}


            {/* ── Site Logistics ── */}
            {projTab === "logistics" && (() => {
              const today = new Date().toISOString().slice(0, 10);
              const logKey = `${draft.id}_${today}`;
              const todayLog = siteLogistics[logKey] || {};
              const LOGISTICS_ITEMS = [
                { id: "dumpster", label: "Dumpster doors accessible and able to open", critical: true, icon: "🗑️" },
                { id: "porta_potty", label: "Porta-potty on site and serviced", critical: false, icon: "🚽" },
                { id: "staging_clear", label: "Material staging area clear and organized", critical: false, icon: "📦" },
                { id: "safety_signage", label: "Safety signage posted at all entry points", critical: false, icon: "⚠️" },
                { id: "fire_exit", label: "Fire exits unobstructed", critical: true, icon: "🚪" },
                { id: "first_aid", label: "First aid kit accessible and stocked", critical: false, icon: "🩺" },
                { id: "temp_power", label: "Temporary power / lighting operational", critical: false, icon: "💡" },
                { id: "deliveries_clear", label: "Delivery access path clear", critical: false, icon: "🚚" },
              ];

              const toggleLogItem = (itemId) => {
                const updated = {
                  ...siteLogistics,
                  [logKey]: { ...todayLog, [itemId]: !todayLog[itemId], date: today, projectId: draft.id },
                };
                saveSiteLogistics(updated);
                // Alert PM if critical item is unchecked
                const item = LOGISTICS_ITEMS.find(i => i.id === itemId);
                if (item?.critical && todayLog[itemId]) {
                  show(`⚠️ Alert: "${item.label}" marked unchecked — PM should be notified`, "warn");
                }
              };

              const checkedCount = LOGISTICS_ITEMS.filter(i => todayLog[i.id]).length;
              const criticalUnchecked = LOGISTICS_ITEMS.filter(i => i.critical && !todayLog[i.id]);

              // Build history (last 7 days)
              const history = [];
              for (let d = 0; d < 7; d++) {
                const dt = new Date(); dt.setDate(dt.getDate() - d);
                const dk = `${draft.id}_${dt.toISOString().slice(0, 10)}`;
                if (siteLogistics[dk]) history.push({ date: dt.toISOString().slice(0, 10), log: siteLogistics[dk] });
              }

              return (
                <div className="flex-col gap-12">
                  <div className="flex gap-8 flex-center">
                    <HardHat size={16} className="text-amber" />
                    <div>
                      <div className="font-semi text-sm">Site Logistics</div>
                      <div className="text-xs text-muted">Daily site readiness checklist · {today}</div>
                    </div>
                    <div className="ml-auto">
                      <span className={`badge ${checkedCount === LOGISTICS_ITEMS.length ? "badge-green" : checkedCount > 0 ? "badge-amber" : "badge-muted"} fs-10`}>
                        {checkedCount}/{LOGISTICS_ITEMS.length} checked
                      </span>
                    </div>
                  </div>

                  {criticalUnchecked.length > 0 && (
                    <div className="rounded-control" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--red)", padding: "var(--space-3) var(--space-3)" }}>
                      <div className="flex gap-8 mb-4 flex-center">
                        <AlertTriangle size={14} className="text-red" />
                        <span className="text-xs font-semi text-red">PM ALERT — Critical items unchecked:</span>
                      </div>
                      {criticalUnchecked.map(i => (
                        <div key={i.id} className="text-xs text-muted" style={{ marginLeft: 22 }}>• {i.label}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex-col gap-4">
                    {LOGISTICS_ITEMS.map(item => {
                      const checked = !!todayLog[item.id];
                      return (
                        <div key={item.id} className="card" style={{ padding: "var(--space-3) var(--space-3)", borderLeft: `3px solid ${checked ? "var(--green)" : item.critical ? "var(--red)" : "var(--border)"}`, background: checked ? "rgba(16,185,129,0.05)" : item.critical && !checked ? "rgba(239,68,68,0.04)" : undefined }}>
                          <div className="flex gap-10 flex-center">
                            <button onClick={() => toggleLogItem(item.id)} className="btn-bare flex-shrink-0" style={{ padding: 0, lineHeight: 1 }}>
                              {checked ? <CheckSquare size={16} className="text-green" /> : <Square size={16} className="text-dim" />}
                            </button>
                            <span className="fs-card">{item.icon}</span>
                            <div className="flex-1">
                              <span className="text-sm" style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{item.label}</span>
                              {item.critical && !checked && (
                                <span className="badge badge-red ml-sp2 fs-xs">Critical</span>
                              )}
                            </div>
                            <span className={`badge ${checked ? "badge-green" : item.critical ? "badge-red" : "badge-muted"} fs-9`}>
                              {checked ? "OK" : item.critical ? "Action Needed" : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* History */}
                  {history.length > 0 && (
                    <div>
                      <div className="text-xs font-semi mb-8 text-dim">RECENT HISTORY (Last 7 Days)</div>
                      <div className="flex-col gap-4">
                        {history.map(({ date, log }) => {
                          const cnt = LOGISTICS_ITEMS.filter(i => log[i.id]).length;
                          return (
                            <div key={date} className="flex-center-gap-12 activity-tile">
                              <span className="text-xs text-muted" style={{ minWidth: 80 }}>{date}</span>
                              <div className="progress-bar flex-1" style={{ height: 6 }}>
                                <div className="progress-fill" style={{ width: `${(cnt / LOGISTICS_ITEMS.length) * 100}%`, background: cnt === LOGISTICS_ITEMS.length ? "var(--green)" : cnt >= 4 ? "var(--amber)" : "var(--red)", borderRadius: "var(--radius-control)" }} />
                              </div>
                              <span className="text-xs text-muted">{cnt}/{LOGISTICS_ITEMS.length}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Team Notes ── */}
            {projTab === "notes" && (() => {
              const projId = String(draft.id);
              const allNotes = projectNotes.filter(n => String(n.projectId) === projId);
              const pinnedNotes = allNotes.filter(n => n.pinned);
              const unpinnedNotes = allNotes.filter(n => !n.pinned);
              const filterMap = { all: allNotes, pm: allNotes.filter(n => n.category === "pm"), field: allNotes.filter(n => n.category === "field"), office: allNotes.filter(n => n.category === "office") };
              const visibleNotes = [...pinnedNotes.filter(n => notesFilter === "all" || n.category === notesFilter), ...unpinnedNotes.filter(n => notesFilter === "all" || n.category === notesFilter)];

              const addNote = (category) => {
                if (!noteText.trim()) { show("Enter a note", "err"); return; }
                const newNote = {
                  id: crypto.randomUUID(),
                  projectId: projId,
                  text: noteText.trim(),
                  author: app.auth?.name || "PM",
                  role: app.auth?.role || "pm",
                  category,
                  pinned: false,
                  timestamp: new Date().toISOString(),
                };
                saveProjectNotes([newNote, ...projectNotes]);
                setNoteText("");
                show("Note posted", "ok");
              };

              const togglePin = (noteId) => {
                saveProjectNotes(projectNotes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n));
              };

              const deleteNote = (noteId) => {
                saveProjectNotes(projectNotes.filter(n => n.id !== noteId));
              };

              const catBadge = (cat) => ({ pm: "badge-blue", field: "badge-amber", office: "badge-green" }[cat] || "badge-muted");
              const catLabel = (cat) => ({ pm: "PM", field: "Field", office: "Office" }[cat] || cat);
              const fmtTime = (ts) => {
                try {
                  const d = new Date(ts);
                  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                } catch { return ts; }
              };

              return (
                <div className="flex-col gap-12">
                  <div className="flex gap-8 flex-center">
                    <MessageSquare size={16} className="text-green" />
                    <div>
                      <div className="font-semi text-sm">Team Notes</div>
                      <div className="text-xs text-muted">{allNotes.length} note{allNotes.length !== 1 ? "s" : ""} · visible to all project team</div>
                    </div>
                  </div>

                  {/* Compose */}
                  <div className="rounded-control p-sp3 bg-bg3" style={{ border: "1px solid var(--border)" }}>
                    <textarea
                      className="form-textarea mb-sp2 fs-label w-full"
                      rows={3}
                      placeholder="Post a note to the project team..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                    <div className="flex gap-8">
                      <button className="btn btn-sm btn-primary" onClick={() => addNote("pm")} disabled={!noteText.trim()}>Post as PM Note</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => addNote("office")} disabled={!noteText.trim()}>Office Note</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => addNote("field")} disabled={!noteText.trim()}>Field Note</button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-4">
                    {["all", "pm", "field", "office"].map(f => (
                      <button key={f} className={`btn btn-sm capitalize ${notesFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setNotesFilter(f)}>
                        {f === "all" ? `All (${allNotes.length})` : `${catLabel(f)} (${filterMap[f]?.length || 0})`}
                      </button>
                    ))}
                  </div>

                  {visibleNotes.length === 0 ? (
                    <div className="text-sm text-dim text-center p-32">No notes yet. Post the first note above.</div>
                  ) : (
                    <div className="flex-col gap-8">
                      {visibleNotes.map(note => (
                        <div key={note.id} className="card" style={{ padding: "var(--space-3)", borderLeft: `3px solid ${note.pinned ? "var(--amber)" : "var(--border)"}`, background: note.pinned ? "rgba(245,158,11,0.04)" : undefined }}>
                          <div className="flex-between mb-6">
                            <div className="flex gap-8 flex-center">
                              {note.pinned && <Pin size={12} className="text-amber" />}
                              <span className="font-semi text-sm">{note.author}</span>
                              <span className={`badge ${catBadge(note.category)} fs-9`}>{catLabel(note.category)} Note</span>
                            </div>
                            <div className="flex gap-6 flex-center">
                              <span className="text-xs text-muted">{fmtTime(note.timestamp)}</span>
                              <button onClick={() => togglePin(note.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "var(--space-1) var(--space-1)", color: note.pinned ? "var(--amber)" : "var(--text3)" }} title={note.pinned ? "Unpin" : "Pin"}>
                                {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                              </button>
                              <button onClick={() => deleteNote(note.id)} className="btn-bare fs-11" style={{ padding: "var(--space-1) var(--space-1)" }}>✕</button>
                            </div>
                          </div>
                          <div className="text-sm ws-pre-wrap" style={{ lineHeight: 1.5 }}>{note.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ SETTINGS TAB — edit project fields (Phases 2-5) ═══ */}
            {projTab === "settings" && (() => {
              const userRole = app.auth?.role || "owner";
              const canSeeFinancials = ["owner","admin","pm","estimator","office_admin","accounting"].includes(userRole);
              const linkedBid = draft.bidId ? (app.bids || []).find(b => b.id === draft.bidId) : null;
              const linkedTakeoff = draft.bidId ? (app.takeoffs || []).find(tk => tk.bidId === draft.bidId) : null;
              // Auto-progress from areas
              const projAreas = (app.areas || []).filter(a => String(a.projectId) === String(draft.id));
              const autoProgress = projAreas.length > 0
                ? (() => { const total = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.budgetQty || 0), 0), 0); const done = projAreas.reduce((s, a) => s + (a.scopeItems || []).reduce((si, i) => si + (i.installedQty || 0), 0), 0); return total > 0 ? Math.round((done / total) * 100) : null; })()
                : null;
              return (
              <div>
                {/* ── Linked Bid (Phase 3) ── */}
                {linkedBid && (
                  <div className="mb-16 p-8 rounded-control" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
                    <div className="flex-between">
                      <div>
                        <div className="fs-10 text-dim uppercase fw-semi">Original Estimate</div>
                        <div className="text-sm fw-semi mt-2">{linkedBid.name}</div>
                        <div className="text-xs text-muted">{linkedBid.estimator || "—"} · {linkedBid.sector || "—"} · Bid: {fmt(linkedBid.value || 0)}</div>
                        {linkedBid.exclusions && <div className="text-xs text-muted mt-4"><span className="fw-semi">Exclusions:</span> {linkedBid.exclusions}</div>}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: "viewBid", data: linkedBid })}>View Bid</button>
                    </div>
                    {canSeeFinancials && linkedBid.value > 0 && draft.contract > 0 && (
                      <div className="flex gap-16 mt-8 fs-10">
                        <span>Bid: <span className="font-mono fw-semi">{fmt(linkedBid.value)}</span></span>
                        <span>Contract: <span className="font-mono fw-semi">{fmt(draft.contract)}</span></span>
                        <span style={{ color: draft.contract >= linkedBid.value ? "var(--green)" : "var(--red)" }}>
                          {draft.contract >= linkedBid.value ? "+" : ""}{fmt(draft.contract - linkedBid.value)} ({draft.contract >= linkedBid.value ? "+" : ""}{Math.round(((draft.contract - linkedBid.value) / linkedBid.value) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Section: Project Info ── */}
                <div className="fw-semi fs-tab uppercase c-text3 mb-8" style={{ letterSpacing: "0.7px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>Project Info</div>
                <div className="form-grid mb-16">
                  <div className="form-group full">
                    <label className="form-label">Project Name *</label>
                    <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Project name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">General Contractor *</label>
                    <input className="form-input" value={draft.gc} onChange={e => upd("gc", e.target.value)} placeholder="GC name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sector</label>
                    <input className="form-input" value={draft.phase} onChange={e => upd("phase", e.target.value)} placeholder="e.g. Medical, Commercial" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Number</label>
                    <input className="form-input" value={draft.jobNumber || ""} onChange={e => upd("jobNumber", e.target.value)} placeholder="EBC internal job #" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PO / Subcontract #</label>
                    <input className="form-input" value={draft.poNumber || ""} onChange={e => upd("poNumber", e.target.value)} placeholder="GC purchase order #" />
                  </div>
                </div>

                {/* ── Section: Schedule ── */}
                <div className="fw-semi fs-tab uppercase c-text3 mb-8" style={{ letterSpacing: "0.7px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>Schedule</div>
                <div className="form-grid mb-16">
                  <div className="form-group">
                    <label className="form-label">Construction Stage</label>
                    <select className="form-select" value={draft.constructionStage || ""} onChange={e => {
                      const newStage = e.target.value;
                      const oldStage = draft.constructionStage || null;
                      const now = new Date().toISOString();
                      const entry = { from: oldStage, to: newStage, changedBy: app.auth?.name || "Unknown", changedById: app.auth?.id, changedAt: now };
                      upd("constructionStage", newStage);
                      upd("stageHistory", [...(draft.stageHistory || []), entry]);
                      upd("stageUpdatedAt", now);
                      upd("stageUpdatedBy", app.auth?.name || "Unknown");
                      const stageDef = CONSTRUCTION_STAGES.find(s => s.key === newStage);
                      if (stageDef) upd("progress", stageDef.progress);
                    }}>
                      <option value="">— No Stage —</option>
                      {CONSTRUCTION_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Progress (%){autoProgress !== null ? ` · Areas: ${autoProgress}%` : ""}</label>
                    <div className="flex gap-8 items-center">
                      <input className="form-input" type="number" min="0" max="100" value={draft.progress} onChange={e => upd("progress", Number(e.target.value))} style={{ flex: 1 }} />
                      {autoProgress !== null && autoProgress !== draft.progress && (
                        <button className="btn btn-ghost btn-sm fs-10" onClick={() => upd("progress", autoProgress)} title="Sync from area completion data">Sync</button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input className="form-input" type="date" value={draft.start} onChange={e => upd("start", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input className="form-input" type="date" value={draft.end} onChange={e => upd("end", e.target.value)} />
                  </div>
                </div>

                {/* ── Section: People & Contacts ── */}
                <div className="fw-semi fs-tab uppercase c-text3 mb-8" style={{ letterSpacing: "0.7px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>People & Contacts</div>
                <div className="form-grid mb-16">
                  <div className="form-group">
                    <label className="form-label">PM Assigned</label>
                    <select className="form-select" value={draft.pm || ""} onChange={e => upd("pm", e.target.value)}>
                      <option value="">— Select PM —</option>
                      {(app.employees || []).filter(e => ["pm","admin","owner","Project Manager","PM"].includes(e.role)).map(e => (
                        <option key={e.id} value={e.name}>{e.name}</option>
                      ))}
                      {(app.employees || []).filter(e => ["pm","admin","owner","Project Manager","PM"].includes(e.role)).length === 0 && <>
                        <option value="Emmanuel Aguilar">Emmanuel Aguilar</option>
                        <option value="Abner Aguilar">Abner Aguilar</option>
                        <option value="Isai Aguilar">Isai Aguilar</option>
                      </>}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Foreman</label>
                    <select className="form-select" value={draft.assignedForeman != null ? String(draft.assignedForeman) : ""} onChange={e => upd("assignedForeman", e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— No Foreman Assigned —</option>
                      {(app.employees || []).filter(e => e.role === "Foreman").map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GC Superintendent</label>
                    <input className="form-input" value={draft.gcSuperName || ""} onChange={e => upd("gcSuperName", e.target.value)} placeholder="Name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GC Super Phone</label>
                    <input className="form-input" type="tel" value={draft.gcSuperPhone || ""} onChange={e => upd("gcSuperPhone", e.target.value)} placeholder="713-555-0100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GC PM Name</label>
                    <input className="form-input" value={draft.gcPmName || ""} onChange={e => upd("gcPmName", e.target.value)} placeholder="Name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GC PM Email</label>
                    <input className="form-input" type="email" value={draft.gcPmEmail || ""} onChange={e => upd("gcPmEmail", e.target.value)} placeholder="pm@gc.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site Contact</label>
                    <input className="form-input" value={draft.siteContact || ""} onChange={e => upd("siteContact", e.target.value)} placeholder="On-site contact name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site Contact Phone</label>
                    <input className="form-input" type="tel" value={draft.siteContactPhone || ""} onChange={e => upd("siteContactPhone", e.target.value)} placeholder="713-555-0200" />
                  </div>
                </div>

                {/* ── Section: Site Access ── */}
                <div className="fw-semi fs-tab uppercase c-text3 mb-8" style={{ letterSpacing: "0.7px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>Site Access</div>
                <div className="form-grid mb-16">
                  <div className="form-group full">
                    <label className="form-label">Address</label>
                    <input className="form-input" value={draft.address || ""} onChange={e => upd("address", e.target.value)} placeholder="Project address" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Suite / Area</label>
                    <input className="form-input" value={draft.suite || ""} onChange={e => upd("suite", e.target.value)} placeholder="e.g. Suite 200, Level 4" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parking</label>
                    <input className="form-input" value={draft.parking || ""} onChange={e => upd("parking", e.target.value)} placeholder="e.g. Garage Level B2, Lot C" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gate Code</label>
                    <input className="form-input" value={draft.gateCode || ""} onChange={e => upd("gateCode", e.target.value)} placeholder="Entry code" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Entrance</label>
                    <input className="form-input" value={draft.deliveryEntrance || ""} onChange={e => upd("deliveryEntrance", e.target.value)} placeholder="Where to unload" />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Access Instructions</label>
                    <textarea className="form-textarea" value={draft.accessInstructions || ""} onChange={e => upd("accessInstructions", e.target.value)} placeholder="Parking, entry protocol, badge requirements..." style={{ minHeight: 60, resize: "vertical" }} />
                  </div>
                </div>

                {/* ── Section: Financial (hidden for foremen) ── */}
                {canSeeFinancials && (
                  <>
                    <div className="fw-semi fs-tab uppercase c-text3 mb-8" style={{ letterSpacing: "0.7px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>Financial</div>
                    <div className="form-grid mb-16">
                      <div className="form-group">
                        <label className="form-label">Base Contract Value ($)</label>
                        <input className="form-input" type="number" value={draft.contract} onChange={e => upd("contract", Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Retainage Rate (%)</label>
                        <input className="form-input" type="number" min="0" max="100" value={draft.retainageRate ?? 10} onChange={e => upd("retainageRate", Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Contract Type</label>
                        <select className="form-select" value={draft.contractType || "lump_sum"} onChange={e => upd("contractType", e.target.value)}>
                          <option value="lump_sum">Lump Sum</option>
                          <option value="gmp">GMP</option>
                          <option value="t_and_m">Time & Material</option>
                          <option value="unit_price">Unit Price</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Section: Notes ── */}
                <div className="fw-semi fs-tab uppercase c-text3 mb-8" style={{ letterSpacing: "0.7px", borderBottom: "1px solid var(--border)", paddingBottom: "var(--space-2)" }}>Notes</div>
                <div className="form-grid mb-16">
                  <div className="form-group full">
                    <label className="form-label">Close-Out Notes</label>
                    <textarea className="form-textarea" value={draft.closeOut || ""} onChange={e => upd("closeOut", e.target.value)} placeholder="Close-out status, punch list, final inspections..." style={{ minHeight: 80, resize: "vertical" }} />
                  </div>
                </div>

                {/* ── Sticky Save Bar ── */}
                <div className="flex gap-8" style={{ position: "sticky", bottom: 0, padding: "var(--space-3) 0", background: "var(--bg)", zIndex: 2, borderTop: "1px solid var(--border)" }}>
                  <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                  <button className="btn btn-ghost" onClick={close}>Cancel</button>
                </div>
              </div>
              );
            })()}
          </div>

          <div className="modal-actions flex-between">
            <button className="btn badge-red-outlined" onClick={() => {
              const name = prompt(`Type "${draft.name}" to permanently delete this project and all its data:`);
              if (name === draft.name) handleDelete();
              else if (name !== null) show("Name didn't match — project not deleted", "err");
            }}>Delete</button>
            <button className="btn btn-ghost" onClick={() => setProjTab("settings")}>Edit</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit Bid ──
  const runAnalysis = async () => {
    if (!aiText.trim()) return show("Paste bid invite text first", "err");
    if (!app.apiKey) return show("Set your API key in Settings first", "err");
    setAiLoading(true);
    try {
      const { analyzeBidPackage } = await import("../utils/api.js");
      const result = await analyzeBidPackage(app.apiKey, aiText);
      // Pre-fill form fields from extraction
      setDraft(d => ({
        ...d,
        name: result.name || d.name,
        gc: result.gc || d.gc,
        value: result.value || d.value,
        due: result.due || d.due,
        phase: result.phase || d.phase,
        risk: result.risk || d.risk,
        scope: result.scope?.length > 0 ? result.scope : d.scope,
        contact: result.contact || d.contact,
        month: result.month || d.month,
        notes: result.notes || d.notes,
        address: result.address || d.address,
      }));
      setAiWarnings(result.warnings || []);
      setShowAiPanel(false);
      show("Bid fields extracted — review and save", "ok");
    } catch (err) {
      show(err.message || "Analysis failed", "err");
    } finally {
      setAiLoading(false);
    }
  };

  if (type === "editBid") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal modal-lg">
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Bid" : "Edit Bid"}</div>
            <div className="flex gap-8 flex-center">
              <label className="btn btn-sm fs-tab c-blue relative cursor-pointer" style={{ background: "var(--blue-dim)", border: "1px solid var(--blue)" }}>
                {pdfScanning ? "Scanning..." : "Scan Proposal PDF"}
                <input type="file" accept=".pdf" className="absolute cursor-pointer" style={{ inset: 0, opacity: 0 }} onChange={(e) => { if (e.target.files?.[0]) handlePdfScan(e.target.files[0]); e.target.value = ""; }} disabled={pdfScanning} />
              </label>
              {(draft.proposalData?.lineItems?.length > 0 || (!isNew && draft.notes)) && (
                <button className="btn btn-sm fs-tab" style={{ background: "rgba(255,127,33,0.12)", border: "1px solid var(--orange)", color: "var(--orange)" }} onClick={handleCreateProposal}>Create Proposal</button>
              )}
              {isNew && <button className="btn btn-sm flex fs-tab c-green gap-sp1" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid var(--green)" }} onClick={() => { setShowEmailImport(!showEmailImport); setShowAiPanel(false); }}><Clipboard size={12} />{showEmailImport ? "Close" : "Paste Bid Invite"}</button>}
              {isNew && <button className="btn btn-sm fs-tab c-amber" style={{ background: "var(--amber-dim)", border: "1px solid var(--amber)" }} onClick={() => { setShowAiPanel(!showAiPanel); setShowEmailImport(false); }}>{showAiPanel ? "Hide AI" : "Analyze Bid Package"}</button>}
              <button className="modal-close" onClick={close}>✕</button>
            </div>
          </div>

          {showEmailImport && (
            <div className="mb-sp4 p-sp4" style={{ background: "rgba(16,185,129,0.06)", borderRadius: "var(--radius)", border: "1px solid var(--green)" }}>
              <div className="flex fw-semi mb-sp2 fs-label c-green gap-sp2"><Clipboard size={13} />PASTE BID INVITE EMAIL</div>
              <div className="mb-sp2 fs-tab c-text2">Paste the full email body from Procore, BuildingConnected, or any bid invite. Regex patterns will extract project name, GC, address, due date, and scope tags.</div>
              <textarea className="form-textarea fs-label" value={emailImportText} onChange={e => setEmailImportText(e.target.value)} placeholder={"Paste bid invite email here...\n\nExample:\nFrom: ABC Construction\nProject: Houston Medical Center Renovation\nBid Due: April 15, 2026\nProject Address: 1234 Main St, Houston, TX 77002\nScope of Work: Metal Framing, Drywall, ACT\n\nThe AI parser will extract key fields automatically."} style={{ minHeight: 130 }} />
              <div className="flex-between mt-8">
                <span className="text2 fs-11">{emailImportText.length > 0 ? `${emailImportText.length} characters` : "Paste email text above"}</span>
                <div className="flex gap-8">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEmailImportText(""); setShowEmailImport(false); }}>Cancel</button>
                  <button className="btn btn-sm bg-green text-white" onClick={parseEmailBid}>Import Fields</button>
                </div>
              </div>
            </div>
          )}

          {showAiPanel && (
            <div className="mb-sp4 p-sp4 bg-bg3" style={{ borderRadius: "var(--radius)", border: "1px solid var(--amber-dim)" }}>
              <div className="fw-semi mb-sp2 fs-label c-amber">PASTE BID INVITE, SPEC EXCERPT, OR EMAIL</div>
              <textarea className="form-textarea fs-label" value={aiText} onChange={e => setAiText(e.target.value)} placeholder={"Paste the bid invite email, spec section, or project description here...\n\nThe AI will extract: project name, GC, due date, scope tags, risk level, phase, and key notes."} style={{ minHeight: 120 }} />
              <div className="flex-between mt-8">
                <span className="text2 fs-11">{aiText.length > 0 ? `${aiText.length} characters` : "Paste text to analyze"}</span>
                <button className="btn btn-primary btn-sm" onClick={runAnalysis} disabled={aiLoading} style={{ minWidth: 140 }}>
                  {aiLoading ? "Analyzing..." : "Extract Fields"}
                </button>
              </div>
            </div>
          )}

          {aiWarnings.length > 0 && (
            <div className="mb-sp3 fs-label p-sp3" style={{ background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "var(--radius)" }}>
              <strong className="text-red fs-11">WARNINGS</strong>
              <ul className="c-text2" style={{ margin: "4px 0 0 16px" }}>
                {aiWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* ── Duplicate PM Warning ── */}
          {dupWarning && (
            <div className="mb-sp3 items-start gap-sp3" style={{ padding: "var(--space-3) var(--space-4)", background: "rgba(245,158,11,0.1)", border: "1px solid var(--amber)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div className="fw-bold mb-sp1 fs-label c-amber">⚠ Potential Duplicate</div>
                <div className="fs-label c-text2">
                  <strong>{dupWarning.pm}</strong> is already estimating <strong>{dupWarning.bidName}</strong> from the same GC. Confirm you want to proceed.
                </div>
              </div>
              <button className="btn btn-ghost btn-sm fs-tab flex-shrink-0" onClick={() => setDupWarning(null)}>Dismiss</button>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Bid Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Project name" />
            </div>
            <div className="form-group">
              <label className="form-label">General Contractor</label>
              <div className="pos-relative">
                <input
                  className="form-input"
                  placeholder="Search or type GC name..."
                  value={gcDropOpen ? gcFilter : (draft.gc || "")}
                  onChange={e => { setGcFilter(e.target.value); upd("gc", e.target.value); setGcDropOpen(true); }}
                  onFocus={() => { setGcDropOpen(true); setGcFilter(draft.gc || ""); }}
                  onBlur={() => setTimeout(() => setGcDropOpen(false), 200)}
                />
                {draft.gc && !gcDropOpen && (
                  <button type="button" className="input-clear-btn"
                    onClick={() => { upd("gc", ""); setGcFilter(""); }}>&#10005;</button>
                )}
                {gcDropOpen && (() => {
                  const q = gcFilter.toLowerCase();
                  const gcSet = new Set();
                  app.contacts.forEach(c => { if (c.company) gcSet.add(c.company); });
                  app.bids.forEach(b => { if (b.gc) gcSet.add(b.gc); });
                  const allGcs = [...gcSet].sort((a, b) => a.localeCompare(b));
                  const filtered = allGcs.filter(name => name.toLowerCase().includes(q));
                  if (filtered.length === 0) return null;
                  return (
                    <div className="autocomplete-dropdown">
                      {filtered.map(name => (
                        <div key={name}
                          className="queue-row fs-13 cursor-pointer px-12"
                          onMouseDown={e => { e.preventDefault(); upd("gc", name); setGcDropOpen(false); setGcFilter(""); }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span className="fw-500">{name}</span>
                          <span className="text-muted ml-8 fs-11">
                            {app.contacts.filter(c => c.company === name).length} contact{app.contacts.filter(c => c.company === name).length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Value ($)</label>
              <input className="form-input" type="number" value={draft.value} onChange={e => upd("value", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={draft.due || ""} onChange={e => upd("due", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={draft.status} onChange={e => {
                const newStatus = e.target.value;
                const ESTIMATING_ACTIVE = ["estimating", "takeoff", "awaiting_quotes", "pricing", "draft_ready"];
                const today = new Date().toISOString().slice(0, 10);
                const logEntry = { date: today, action: `Status → ${newStatus}`, by: app.auth?.name || "Unknown" };
                // When transitioning into active estimating and not yet claimed
                if (ESTIMATING_ACTIVE.includes(newStatus) && !draft.estimatingBy) {
                  const pmName = app.auth?.name || "";
                  setDraft(d => ({ ...d, status: newStatus, estimatingBy: pmName, estimatingStarted: today, activityLog: [...(d.activityLog || []), logEntry] }));
                  if (pmName) {
                    const dups = (app.bids || []).filter(b =>
                      String(b.id) !== String(draft.id) &&
                      b.estimatingBy &&
                      b.estimatingBy !== pmName &&
                      b.gc === draft.gc
                    );
                    if (dups.length > 0) {
                      setDupWarning({ pm: dups[0].estimatingBy, bidName: dups[0].name });
                    }
                  }
                } else {
                  setDraft(d => ({ ...d, status: newStatus, activityLog: [...(d.activityLog || []), logEntry] }));
                }
              }}>
                <optgroup label="Pre-Bid">
                  <option value="invite_received">Invite Received</option>
                  <option value="reviewing">Reviewing Docs</option>
                  <option value="assigned">Assigned</option>
                </optgroup>
                <optgroup label="Estimating">
                  <option value="estimating">Estimating</option>
                  <option value="takeoff">Takeoff in Progress</option>
                  <option value="awaiting_quotes">Awaiting Quotes</option>
                  <option value="pricing">Pricing</option>
                  <option value="draft_ready">Proposal Ready</option>
                </optgroup>
                <optgroup label="Post-Bid">
                  <option value="submitted">Submitted</option>
                  <option value="clarifications">Clarifications</option>
                  <option value="negotiating">Negotiating</option>
                </optgroup>
                <optgroup label="Outcome">
                  <option value="awarded">Awarded</option>
                  <option value="lost">Lost</option>
                  <option value="no_bid">No Bid</option>
                </optgroup>
              </select>
              {/* Estimating-by info */}
              {draft.estimatingBy && (
                <div className="fs-tab mt-sp2 c-blue">
                  In progress by {draft.estimatingBy}{draft.estimatingStarted ? ` · started ${draft.estimatingStarted}` : ""}
                </div>
              )}
              {/* Lost reason */}
              {draft.status === "lost" && (
                <div className="mt-8">
                  <label className="form-label fs-xs">Why was this bid lost?</label>
                  <select className="form-select" value={draft.lostReason || ""} onChange={e => upd("lostReason", e.target.value)}>
                    <option value="">Select reason...</option>
                    <option value="price">Price too high</option>
                    <option value="relationship">GC relationship / preference</option>
                    <option value="scope">Scope mismatch</option>
                    <option value="timing">Timing / schedule</option>
                    <option value="qualification">Qualification / experience</option>
                    <option value="unknown">Unknown / not disclosed</option>
                  </select>
                </div>
              )}
              {/* No-bid reason */}
              {draft.status === "no_bid" && (
                <div className="mt-8">
                  <label className="form-label fs-xs">Why no bid?</label>
                  <select className="form-select" value={draft.noBidReason || ""} onChange={e => upd("noBidReason", e.target.value)}>
                    <option value="">Select reason...</option>
                    <option value="too_small">Too small</option>
                    <option value="too_busy">Too busy / at capacity</option>
                    <option value="wrong_scope">Wrong scope for EBC</option>
                    <option value="bad_gc">Bad GC / payment history</option>
                    <option value="too_far">Too far / location</option>
                    <option value="late_invite">Received invite too late</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
            </div>
            {/* Priority */}
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div className="flex gap-4">
                {[{v:"hot",l:"Hot",c:"badge-red"},{v:"warm",l:"Warm",c:"badge-amber"},{v:"cold",l:"Cold",c:"badge-muted"},{v:"strategic",l:"Strategic",c:"badge-blue"}].map(p => (
                  <button key={p.v} type="button" className={`badge ${draft.priority === p.v ? p.c : "badge-muted"} cursor-pointer`}
                    style={{ opacity: draft.priority === p.v ? 1 : 0.5 }}
                    onClick={() => upd("priority", draft.priority === p.v ? "" : p.v)}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Sector</label>
              <select className="form-select" value={draft.sector || draft.phase || ""} onChange={e => upd("sector", e.target.value)}>
                <option value="">Select sector...</option>
                {["Medical", "Commercial", "Education", "Hospitality", "Government", "Religious", "Entertainment", "Industrial", "Residential"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estimator / Owner</label>
              <select className="form-select" value={draft.estimator || ""} onChange={e => upd("estimator", e.target.value)}>
                <option value="">— Select —</option>
                <option value="Emmanuel Aguilar">Emmanuel Aguilar</option>
                <option value="Abner Aguilar">Abner Aguilar</option>
                <option value="Isai Aguilar">Isai Aguilar</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign Foreman (if awarded)</label>
              <select className="form-select" value={draft.assignedForeman != null ? String(draft.assignedForeman) : ""} onChange={e => upd("assignedForeman", e.target.value ? Number(e.target.value) : null)}>
                <option value="">— No Foreman —</option>
                {(app.employees || []).filter(e => e.role === "Foreman").map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Risk</label>
              <select className="form-select" value={draft.risk} onChange={e => upd("risk", e.target.value)}>
                <option value="Low">Low</option>
                <option value="Med">Med</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <div className="flex gap-4 flex-center">
                <div className="relative flex-1">
                  <input
                    className="form-input"
                    placeholder="Search contacts..."
                    value={contactDropOpen ? contactFilter : (draft.contact || "")}
                    onChange={e => { setContactFilter(e.target.value); setContactDropOpen(true); }}
                    onFocus={() => { setContactDropOpen(true); setContactFilter(""); }}
                    onBlur={() => setTimeout(() => setContactDropOpen(false), 200)}
                  />
                  {draft.contact && !contactDropOpen && (
                    <button type="button" className="input-clear-btn"
                      onClick={() => { upd("contact", ""); setContactFilter(""); }}>✕</button>
                  )}
                  {contactDropOpen && (() => {
                    const q = contactFilter.toLowerCase();
                    const filtered = app.contacts.filter(c =>
                      c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q)
                    );
                    return (
                      <div className="autocomplete-dropdown">
                        {filtered.length === 0 ? (
                          <div className="fs-label c-text2" style={{ padding: "var(--space-2) var(--space-3)" }}>No contacts found</div>
                        ) : filtered.map(c => (
                          <div key={c.id}
                            className="queue-row fs-13 cursor-pointer px-12"
                            onMouseDown={e => { e.preventDefault(); upd("contact", c.name); setContactDropOpen(false); setContactFilter(""); }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span className="fw-500">{c.name}</span>
                            <span className="text-muted ml-8 fs-11">{c.company}{c.role ? ` · ${c.role}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <button type="button" className="btn btn-ghost btn-sm fs-tab nowrap" style={{ padding: "var(--space-1) var(--space-2)" }}
                  onClick={() => setQuickContact({ name: "", company: draft.gc || "", role: "", phone: "", email: "" })}>+ New</button>
              </div>
              {quickContact && (
                <div className="mt-sp2 p-sp3 bg-bg3" style={{ borderRadius: "var(--radius)", border: "1px solid var(--border2)" }}>
                  <div className="fw-semi mb-sp2 fs-tab c-amber">QUICK ADD CONTACT</div>
                  <div className="flex gap-8 mb-8 flex-wrap">
                    <input className="form-input flex-1-140" placeholder="Name *" value={quickContact.name}
                      onChange={e => setQuickContact(prev => ({ ...prev, name: e.target.value }))} />
                    <input className="form-input flex-1-140" placeholder="Company" value={quickContact.company}
                      onChange={e => setQuickContact(prev => ({ ...prev, company: e.target.value }))} />
                  </div>
                  <div className="flex gap-8 mb-8 flex-wrap">
                    <input className="form-input flex-1-120" placeholder="Role" value={quickContact.role}
                      onChange={e => setQuickContact(prev => ({ ...prev, role: e.target.value }))} />
                    <input className="form-input flex-1-120" placeholder="Phone" value={quickContact.phone}
                      onChange={e => setQuickContact(prev => ({ ...prev, phone: e.target.value }))} />
                    <input className="form-input" style={{ flex: "1 1 172px" }} placeholder="Email" value={quickContact.email}
                      onChange={e => setQuickContact(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="flex gap-8">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                      if (!quickContact.name.trim()) { app.show("Contact name is required", "err"); return; }
                      const newContact = { ...quickContact, id: app.nextId(), priority: "med", notes: "", bids: 0, wins: 0, color: "var(--blue)", last: "Never" };
                      app.setContacts(prev => [...prev, newContact]);
                      upd("contact", newContact.name);
                      setQuickContact(null);
                      app.show("Contact added & selected");
                    }}>Save & Select</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuickContact(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Addenda Count</label>
              <input className="form-input" type="number" min="0" value={draft.addendaCount || 0} onChange={e => upd("addendaCount", Number(e.target.value))} />
            </div>
            <div className="form-group full">
              <label className="form-label">Address</label>
              <input className="form-input" value={draft.address || ""} onChange={e => upd("address", e.target.value)} placeholder="Project address" />
            </div>
            <div className="form-group full">
              <label className="form-label">Scope Tags</label>
              <div className="flex gap-4 flex-wrap">
                {SCOPE_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`btn btn-sm ${(draft.scope || []).includes(s) ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => toggleScopeTag(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group full">
              <label className="form-label">Notes / Clarifications</label>
              <textarea className="form-textarea fs-label" value={draft.notes} onChange={e => upd("notes", e.target.value)} placeholder="RFI questions, clarifications, general notes..." style={{ minHeight: 120, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />
            </div>
            <div className="form-group full">
              <label className="form-label">Exclusions / Inclusions</label>
              <textarea className="form-textarea fs-label" value={draft.exclusions || ""} onChange={e => upd("exclusions", e.target.value)} placeholder="List scope exclusions and inclusions for the proposal..." style={{ minHeight: 80, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />
            </div>

            {/* ── File Attachments ── */}
            <div className="form-group full">
              <label className="form-label flex-center-gap-8">
                Plans, Specs & Documents
                {(draft.attachments || []).length === 0 && <span className="fw-semi fs-xs c-red">NO PLANS UPLOADED</span>}
                {(draft.attachments || []).length > 0 && <span className="fw-semi fs-xs c-green">{(draft.attachments || []).length} file{(draft.attachments || []).length !== 1 ? "s" : ""}</span>}
              </label>
              <div style={{ border: `2px dashed ${(draft.attachments || []).length === 0 ? "var(--amber)" : "var(--border2)"}`, borderRadius: "var(--radius)", padding: "var(--space-4)", background: "var(--bg2)" }}>
                <div className="text-center py-8">
                  <label className="cursor-pointer text-blue font-semi fs-13">
                    Click to upload or drag files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.dwg,.xlsx,.xls,.doc,.docx,.csv"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;
                        files.forEach(file => {
                          if (file.size > 10 * 1024 * 1024) {
                            show(`${file.name} is too large (max 10MB)`, "err");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const attachment = {
                              id: Date.now() + Math.random(),
                              name: file.name,
                              type: file.type || "application/octet-stream",
                              size: file.size,
                              data: reader.result,
                              uploaded: new Date().toISOString(),
                            };
                            setDraft(d => ({ ...d, attachments: [...(d.attachments || []), attachment] }));
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                  <div className="fs-tab mt-sp1 c-text3">
                    PDF, images, DWG, Excel, Word — max 10MB per file
                  </div>
                </div>
                {(draft.attachments || []).length > 0 && (
                  <div className="flex-col-gap-6">
                    {(draft.attachments || []).map((att, i) => (
                      <div key={att.id || i} className="flex-between fs-label bg-bg3" style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                        padding: "var(--space-2) var(--space-3)" }}>
                        <div className="flex-center-gap-8 flex-1" style={{ minWidth: 0 }}>
                          <span className="flex-center">
                            {att.type?.includes("pdf") ? <FileText className="w-4 h-4" /> : att.type?.includes("image") ? <Image className="w-4 h-4" /> : att.type?.includes("sheet") || att.type?.includes("excel") ? <BarChart2 className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                          </span>
                          <span className="text-default fw-500 text-ellipsis">
                            {att.name}
                          </span>
                          <span className="text-dim flex-shrink-0">
                            {att.size < 1024 ? att.size + "B" : att.size < 1048576 ? (att.size / 1024).toFixed(1) + "KB" : (att.size / 1048576).toFixed(1) + "MB"}
                          </span>
                        </div>
                        <div className="flex gap-4">
                          {att.data && (
                            <button
                              className="btn btn-ghost btn-sm btn-link"
                              onClick={() => { const w = window.open(); w.document.write(`<iframe src="${att.data}" style="width:100%;height:100%;border:none"></iframe>`); }}
                              title="View"
                            >View</button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm fs-xs c-red" style={{ padding: "var(--space-1) var(--space-2)" }}
                            onClick={() => setDraft(d => ({ ...d, attachments: (d.attachments || []).filter((_, j) => j !== i) }))}
                            title="Remove"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-actions flex-between">
            {!isNew && <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8 ml-auto">
              {!isNew && draft.status !== "awarded" && (
                <button className="btn badge-green-outlined" onClick={handleAwardBid}>
                  Award Bid
                </button>
              )}
              {!isNew && draft.status === "awarded" && (
                <button className="btn badge-yellow-outlined" onClick={handleUnAwardBid}>
                  Un-award
                </button>
              )}
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Bid" : "Save Changes"}</button>
            </div>

            {/* Activity Log */}
            {!isNew && (draft.activityLog || []).length > 0 && (
              <div className="mt-16" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
                <div className="text-xs font-semi mb-8">Activity Log</div>
                <div style={{ maxHeight: 160, overflowY: "auto" }}>
                  {(draft.activityLog || []).slice().reverse().slice(0, 20).map((entry, i) => (
                    <div key={i} className="flex gap-8 text-xs text-muted py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="fw-500" style={{ minWidth: 70 }}>{entry.date}</span>
                      <span style={{ flex: 1 }}>{entry.action}</span>
                      <span>{entry.by}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Edit Project ──
  if (type === "editProject") {
    return (
      <>
      {showPerimeterMap && (
        <PerimeterMapModal
          project={draft}
          onClose={() => setShowPerimeterMap(false)}
          onSave={(pts) => {
            upd("perimeter", pts);
            setShowPerimeterMap(false);
          }}
        />
      )}
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Project" : "Edit Project"}</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Project name" />
            </div>
            <div className="form-group">
              <label className="form-label">General Contractor</label>
              <input className="form-input" value={draft.gc} onChange={e => upd("gc", e.target.value)} placeholder="GC name" />
            </div>
            <div className="form-group">
              <label className="form-label">Contract Value ($)</label>
              <input className="form-input" type="number" value={draft.contract} onChange={e => upd("contract", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Billed Amount ($)</label>
              <input className="form-input" type="number" value={draft.billed} onChange={e => upd("billed", Number(e.target.value))} />
            </div>
            {/*
              Est. Labor / Material Cost inputs removed (Slice 2).
              Live cost totals come from computeProjectTotalCost (time entries + AP bills + accruals).
              Use the Financials subtab for the authoritative project P&L.
            */}
            <div className="form-group">
              <label className="form-label">Progress (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={draft.progress} onChange={e => upd("progress", Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Sector</label>
              <select className="form-select" value={draft.phase || ""} onChange={e => upd("phase", e.target.value)}>
                <option value="">Select sector...</option>
                {["Medical", "Commercial", "Education", "Hospitality", "Government", "Religious", "Entertainment", "Industrial", "Residential"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Construction Stage</label>
              <select className="form-select" value={draft.constructionStage || ""} onChange={e => {
                const newStage = e.target.value;
                const oldStage = draft.constructionStage || null;
                const now = new Date().toISOString();
                const entry = { from: oldStage, to: newStage, changedBy: app.auth?.name || "Unknown", changedById: app.auth?.id, changedAt: now };
                const history = [...(draft.stageHistory || []), entry];
                upd("constructionStage", newStage);
                upd("stageHistory", history);
                upd("stageUpdatedAt", now);
                upd("stageUpdatedBy", app.auth?.name || "Unknown");
                // Auto-sync progress with stage
                const stageDef = CONSTRUCTION_STAGES.find(s => s.key === newStage);
                if (stageDef) upd("progress", stageDef.progress);
              }}>
                <option value="">— No Stage —</option>
                {CONSTRUCTION_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              {draft.stageHistory?.length > 0 && (
                <details className="mt-6">
                  <summary className="text-xs text-dim cursor-pointer">Stage history ({draft.stageHistory.length})</summary>
                  {draft.stageHistory.map((h, i) => (
                    <div key={i} className="text-xs text-dim py-2">
                      {h.changedAt ? new Date(h.changedAt).toLocaleDateString() : ""} · {h.changedBy} · {STAGE_MAP[h.from]?.label || h.from || "—"} → {STAGE_MAP[h.to]?.label || h.to || "—"}
                    </div>
                  ))}
                </details>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" value={draft.start} onChange={e => upd("start", e.target.value)} placeholder="e.g. Jan 15" />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" value={draft.end} onChange={e => upd("end", e.target.value)} placeholder="e.g. Jul 30" />
            </div>
            <div className="form-group">
              <label className="form-label">PM Assigned</label>
              <select className="form-select" value={draft.pm || ""} onChange={e => upd("pm", e.target.value)}>
                <option value="">— Select PM —</option>
                <option value="Emmanuel Aguilar">Emmanuel Aguilar</option>
                <option value="Abner Aguilar">Abner Aguilar</option>
                <option value="Isai Aguilar">Isai Aguilar</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Foreman</label>
              <select className="form-select" value={draft.assignedForeman != null ? String(draft.assignedForeman) : ""} onChange={e => upd("assignedForeman", e.target.value ? Number(e.target.value) : null)}>
                <option value="">— No Foreman Assigned —</option>
                {(app.employees || []).filter(e => e.role === "Foreman").map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Address</label>
              <input className="form-input" value={draft.address || ""} onChange={e => upd("address", e.target.value)} placeholder="Project address" />
            </div>
            <div className="form-group">
              <label className="form-label">Suite / Area</label>
              <input className="form-input" value={draft.suite || ""} onChange={e => upd("suite", e.target.value)} placeholder="e.g. Suite 200, Level 4" />
            </div>
            <div className="form-group">
              <label className="form-label">Parking Info</label>
              <input className="form-input" value={draft.parking || ""} onChange={e => upd("parking", e.target.value)} placeholder="e.g. Garage Level B2, Lot C" />
            </div>
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input className="form-input" type="number" step="any" value={draft.lat || ""} onChange={e => upd("lat", Number(e.target.value) || "")} placeholder="29.7604" />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input className="form-input" type="number" step="any" value={draft.lng || ""} onChange={e => upd("lng", Number(e.target.value) || "")} placeholder="-95.3698" />
            </div>

            {/* ── Polygon Perimeter ── */}
            <div className="form-group full">
              <label className="form-label">Job Site Perimeter</label>
              <div className="flex-center-gap-12 flex-wrap">
                <button
                  type="button"
                  className="btn btn-ghost fs-13"
                  onClick={() => setShowPerimeterMap(true)}
                  disabled={!draft.lat || !draft.lng}
                  title={!draft.lat || !draft.lng ? "Set Lat/Lng first" : "Draw polygon boundary on map"}
                >
                  <MapPin className="icon-inline" />{draft.perimeter && draft.perimeter.length >= 3 ? "Edit Perimeter" : "Set Perimeter"}
                </button>
                {draft.perimeter && draft.perimeter.length >= 3 ? (
                  <span className="fs-12 text-green">
                    ✓ {draft.perimeter.length} points · {polygonAreaSqFt(draft.perimeter) > 43560
                      ? `${(polygonAreaSqFt(draft.perimeter) / 43560).toFixed(2)} acres`
                      : `${Math.round(polygonAreaSqFt(draft.perimeter)).toLocaleString()} sq ft`}
                  </span>
                ) : (
                  <span className="fs-12 text-muted">
                    {!draft.lat || !draft.lng ? "Enter Lat/Lng above first" : "No polygon — using radius geofence"}
                  </span>
                )}
                {draft.perimeter && draft.perimeter.length >= 3 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm fs-11 text-red"
                    onClick={() => upd("perimeter", [])}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="form-group full">
              <label className="form-label">Close-Out Notes</label>
              <textarea className="form-textarea" value={draft.closeOut || ""} onChange={e => upd("closeOut", e.target.value)} placeholder="Close-out status, punch list, final inspections..." style={{ minHeight: 80, resize: "vertical" }} />
            </div>

            {/* ── Proposal Attachments ── */}
            <div className="form-group full">
              <label className="form-label">Proposal / Attachments</label>
              <div className="upload-zone">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  id="proposal-upload"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const attachment = {
                          id: Date.now() + Math.random(),
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          data: reader.result,
                          uploadedAt: new Date().toISOString(),
                        };
                        setDraft(d => ({
                          ...d,
                          attachments: [...(d.attachments || []), attachment],
                        }));
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = "";
                  }}
                />
                <label htmlFor="proposal-upload" className="btn btn-ghost cursor-pointer">
                  <Paperclip className="icon-inline" />Upload Proposal / Files
                </label>
                <div className="text-xs text-dim mt-6">PDF, Word, Excel, Images</div>
              </div>

              {/* List attached files */}
              {(draft.attachments || []).length > 0 && (
                <div className="mt-12">
                  {draft.attachments.map((att, i) => (
                    <div key={att.id || i} className="flex-between rounded-control mb-sp1 bg-bg3" style={{ padding: "var(--space-2) var(--space-3)" }}>
                      <div className="flex gap-8 flex-center">
                        <span className="flex-center">{att.type?.includes("pdf") ? <FileText className="w-4 h-4" /> : att.type?.includes("image") ? <Image className="w-4 h-4" /> : att.type?.includes("sheet") || att.type?.includes("excel") ? <BarChart2 className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}</span>
                        <div>
                          <div className="text-sm font-semi">{att.name}</div>
                          <div className="text-xs text-dim">{(att.size / 1024).toFixed(0)} KB · {new Date(att.uploadedAt || att.uploaded || Date.now()).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button className="btn btn-ghost btn-sm fs-11"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = att.data;
                            link.download = att.name;
                            link.click();
                          }}>↓</button>
                        <button className="btn btn-ghost btn-sm fs-tab c-red"
                          onClick={() => setDraft(d => ({ ...d, attachments: d.attachments.filter((_, j) => j !== i) }))}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* ── Per-Project Financial KPIs ── */}
          {!isNew && (() => {
            const pid = draft.id;
            const adjustedContract = getAdjustedContract(draft, app.changeOrders || []);
            const projCostsData = computeProjectTotalCost(pid, draft.name, app.timeEntries || [], app.employees || [], app.apBills || [], 1.35, app.accruals || []);
            const totalCost = projCostsData.totalCost || 0;
            const laborCost = projCostsData.laborCost || 0;
            const billed = (app.invoices || []).filter(i => String(i.projectId) === String(pid) && i.status !== "void").reduce((s, i) => s + (i.amount || 0), 0);
            const profit = adjustedContract - totalCost;
            const margin = adjustedContract > 0 ? Math.round((profit / adjustedContract) * 100) : 0;
            const costPct = adjustedContract > 0 ? Math.round((totalCost / adjustedContract) * 100) : 0;
            const billedPct = adjustedContract > 0 ? Math.round((billed / adjustedContract) * 100) : 0;
            const pendingCOs = (app.changeOrders || []).filter(c => String(c.projectId) === String(pid) && c.status === "pending");
            const pendingTmVal = (app.tmTickets || []).filter(tk => String(tk.projectId) === String(pid) && (tk.status === "pending" || tk.status === "draft"))
              .reduce((s, tk) => {
                const l = (tk.laborEntries || []).reduce((ls, e) => ls + (Number(e.hours) || 0) * (Number(e.rate) || 0), 0);
                const m = (tk.materialEntries || []).reduce((ms, e) => { const b2 = (Number(e.qty) || 0) * (Number(e.unitCost) || 0); return ms + b2 + b2 * (Number(e.markup) || 0) / 100; }, 0);
                return s + l + m;
              }, 0);
            if (!adjustedContract) return null;
            return (
              <div className="mt-sp4 mb-sp4">
                <div className="section-header"><div className="section-title">Financial KPIs</div></div>
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-label">Contract</div>
                    <div className="kpi-value">{fmt(adjustedContract)}</div>
                    {pendingCOs.length > 0 && <div className="kpi-sub c-amber">{pendingCOs.length} CO pending ({fmt(pendingCOs.reduce((s, c) => s + (c.amount || 0), 0))})</div>}
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Cost to Date</div>
                    <div className="kpi-value" style={{ color: costPct > 90 ? "var(--red)" : costPct > 75 ? "var(--amber)" : "var(--green)" }}>{fmt(totalCost)}</div>
                    <div className="kpi-sub">{costPct}% of contract &middot; Labor {fmt(laborCost)}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Profit / Margin</div>
                    <div className="kpi-value" style={{ color: margin < 10 ? "var(--red)" : margin < 20 ? "var(--amber)" : "var(--green)" }}>{fmt(profit)}</div>
                    <div className="kpi-sub">{margin}% margin</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-label">Billed</div>
                    <div className="kpi-value">{fmt(billed)}</div>
                    <div className="kpi-sub">{billedPct}% billed{pendingTmVal > 0 ? ` · ${fmt(pendingTmVal)} T&M unbilled` : ""}</div>
                  </div>
                </div>
                {/* Burn-down bar */}
                <div className="rounded-control overflow-hidden mt-sp2" style={{ height: 8, background: "var(--bg4)" }}>
                  <div className="h-full rounded-control" style={{ width: `${Math.min(costPct, 100)}%`, background: costPct > 90 ? "var(--red)" : costPct > 75 ? "var(--amber)" : "var(--green)", transition: "width 0.3s" }} />
                </div>
                <div className="flex-between mt-sp1">
                  <span className="fs-tab c-text3">0%</span>
                  <span className="fs-tab fw-semi" style={{ color: costPct > 90 ? "var(--red)" : "var(--text2)" }}>{costPct}% spent</span>
                  <span className="fs-tab c-text3">100%</span>
                </div>
              </div>
            );
          })()}

          {/* ── Project Document Hub ── */}
          {!isNew && (() => {
            const calcLaborTotal = (entries) => (entries || []).reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.rate) || 0), 0);
            const calcMatTotal = (entries) => (entries || []).reduce((s, e) => { const b = (Number(e.qty) || 0) * (Number(e.unitCost) || 0); return s + b + b * (Number(e.markup) || 0) / 100; }, 0);
            const pid = draft.id;
            const projRfis = (app.rfis || []).filter(r => r.projectId === pid);
            const projSubmittals = (app.submittals || []).filter(s => s.projectId === pid);
            const projCOs = (app.changeOrders || []).filter(c => c.projectId === pid);
            const projInvoices = (app.invoices || []).filter(i => i.projectId === pid);
            const projDailyReports = (app.dailyReports || []).filter(d => d.projectId === pid);
            const projJSAs = (app.jsas || []).filter(j => j.projectId === pid);
            const projTM = (app.tmTickets || []).filter(t => t.projectId === pid);

            // Health signals
            const openRfis = projRfis.filter(r => r.status !== "Answered" && r.status !== "Closed");
            const agingRfis = openRfis.filter(r => (r.submitted || r.dateSubmitted) && (new Date() - new Date(r.submitted || r.dateSubmitted)) > 7 * 86400000);
            const pendingSubs = projSubmittals.filter(s => s.status !== "approved");
            const pendingCOs = projCOs.filter(c => c.status === "pending");
            const overdueInvs = projInvoices.filter(i => i.status === "overdue");
            const pendingTM = projTM.filter(t => t.status === "pending" || t.status === "draft");
            const hasIssues = agingRfis.length > 0 || pendingCOs.length > 0 || overdueInvs.length > 0;

            const sections = [
              { label: "RFIs", items: projRfis, icon: null, tab: "documents", fields: (r) => `#${r.number || ""} — ${r.subject || r.desc || ""}`, badge: (r) => r.status, urgent: openRfis.length },
              { label: "Submittals", items: projSubmittals, icon: null, tab: "documents", fields: (s) => `#${s.number || ""} — ${s.description || s.desc || ""}`, badge: (s) => s.status, urgent: pendingSubs.length },
              { label: "Change Orders", items: projCOs, icon: null, tab: "financials", fields: (c) => `#${c.number || ""} — ${c.desc || ""} (${fmt(c.amount || 0)})`, badge: (c) => c.status, urgent: pendingCOs.length },
              { label: "Invoices", items: projInvoices, icon: null, tab: "financials", fields: (i) => `#${i.number} — ${fmt(i.amount)} — ${i.date || ""}`, badge: (i) => i.status, urgent: overdueInvs.length },
              { label: "Daily Reports", items: projDailyReports, icon: null, tab: "safety", fields: (d) => `${d.date || ""} — ${d.teamSize || 0} team — ${(d.work || "").slice(0, 60)}`, badge: () => null, urgent: 0 },
              { label: "JSAs", items: projJSAs, icon: null, tab: "jsa", fields: (j) => `${j.date || ""} — ${j.title || j.location || ""}`, badge: () => null, urgent: 0 },
              { label: "T&M Tickets", items: projTM, icon: null, tab: "financials", fields: (t) => `${t.ticketNumber || ""} — ${t.description || ""} (${fmt(calcLaborTotal(t.laborEntries || []) + calcMatTotal(t.materialEntries || []))})`, badge: (t) => t.status, urgent: pendingTM.length },
            ];

            const totalDocs = sections.reduce((s, sec) => s + sec.items.length, 0);

            return (
              <div className="mt-16 border-t-2 pt-16">
                {/* Health Summary Bar */}
                {hasIssues && (
                  <div className="rounded-control mb-sp3 gap-sp3 flex-wrap" style={{ display: "flex", padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    {agingRfis.length > 0 && <span className="fs-11 text-red font-semi">{agingRfis.length} RFI{agingRfis.length > 1 ? "s" : ""} aging 7+ days</span>}
                    {pendingCOs.length > 0 && <span className="fw-semi fs-tab c-amber">{pendingCOs.length} CO{pendingCOs.length > 1 ? "s" : ""} pending ({fmt(pendingCOs.reduce((s, c) => s + (c.amount || 0), 0))})</span>}
                    {overdueInvs.length > 0 && <span className="fs-11 text-red font-semi">{overdueInvs.length} overdue invoice{overdueInvs.length > 1 ? "s" : ""}</span>}
                    {pendingTM.length > 0 && <span className="fs-tab c-amber">{pendingTM.length} T&M pending</span>}
                  </div>
                )}
                <div className="flex-between mb-12">
                  <div className="fw-700 fs-14">Project Documents ({totalDocs})</div>
                </div>
                <div className="grid-auto-280">
                  {sections.map(sec => (
                    <div key={sec.label} className="rounded-control p-sp3 bg-bg3" style={{ border: "1px solid var(--border)" }}>
                      <div className="flex-between mb-6">
                        <div className="font-semi fs-12">{sec.label}</div>
                        <span className="flex gap-4">
                          {sec.urgent > 0 && <span className="badge badge-red fs-9">{sec.urgent} open</span>}
                          <span className="badge badge-blue fs-9">{sec.items.length}</span>
                        </span>
                      </div>
                      {sec.items.length === 0 ? (
                        <div className="text-xs text-muted">None</div>
                      ) : (
                        sec.items.slice(0, 5).map((item, i) => (
                          <div key={item.id || i} className="border-b fs-tab cursor-pointer" style={{ padding: "var(--space-1) 0" }}
                            onClick={() => { setModal(null); app.setSearch(draft.name || ""); app.setTab(sec.tab); }}>
                            <span>{sec.fields(item)}</span>
                            {sec.badge(item) && <span className={`badge ${sec.badge(item) === "paid" || sec.badge(item) === "approved" || sec.badge(item) === "answered" ? "badge-green" : sec.badge(item) === "pending" || sec.badge(item) === "submitted" || sec.badge(item) === "open" ? "badge-amber" : "badge-muted"} ml-sp1 fs-xs`}>{sec.badge(item)}</span>}
                          </div>
                        ))
                      )}
                      {sec.items.length > 5 && <div className="text-xs mt-4 cursor-pointer text-blue"
                        onClick={() => { setModal(null); app.setSearch(draft.name || ""); app.setTab(sec.tab); }}>+{sec.items.length - 5} more →</div>}
                      <div className="flex gap-4 mt-6">
                        <button className="btn btn-ghost btn-link" onClick={() => { setModal(null); app.setSearch(draft.name || ""); app.setTab(sec.tab); }}>
                          View All →
                        </button>
                        {sec.label === "Submittals" && sec.items.length > 0 && (
                          <button className="btn btn-ghost flex fs-xs gap-sp1" style={{ padding: "var(--space-1) var(--space-2)" }}
                            onClick={async () => {
                              const { generateSubmittalsPackagePdf } = await import("../utils/submittalsPackagePdf.js");
                              generateSubmittalsPackagePdf(draft, sec.items, app.contacts || [], app.company || {});
                            }}>
                            <FileDown size={11} /> PDF
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Punch List ── */}
          {!isNew && (() => {
            const pid = draft.id;
            const items = (app.punchItems || []).filter(p => p.projectId === pid);
            const openItems = items.filter(p => p.status === "open").length;
            const ipItems = items.filter(p => p.status === "in-progress").length;
            const doneItems = items.filter(p => p.status === "complete").length;
            const pctDone = items.length > 0 ? Math.round((doneItems / items.length) * 100) : 0;

            const users = (() => { try { return JSON.parse(localStorage.getItem("ebc_users") || "[]"); } catch { return []; } })();

            const addPunch = () => {
              if (!punchForm.description) { show("Description required", "err"); return; }
              app.setPunchItems(prev => [...prev, {
                id: app.nextId(), projectId: pid, ...punchForm,
                status: "open", photos: [], createdAt: new Date().toISOString(),
                completedAt: null, signedOffBy: null, signedOffAt: null,
              }]);
              show("Punch item added", "ok");
              setPunchAdding(false);
              setPunchForm({ description: "", location: "", assignedTo: "", priority: "med" });
            };

            const cyclePunchStatus = (item) => {
              const next = item.status === "open" ? "in-progress" : item.status === "in-progress" ? "complete" : "open";
              app.setPunchItems(prev => prev.map(p => p.id === item.id ? {
                ...p, status: next, completedAt: next === "complete" ? new Date().toISOString() : null
              } : p));
              show(`Punch item → ${next}`, "ok");
            };

            const deletePunch = (item) => {
              app.setPunchItems(prev => prev.filter(p => p.id !== item.id));
              show("Punch item removed", "ok");
            };

            const signOffPunch = () => {
              if (openItems + ipItems > 0) { show("Complete all items before sign-off", "err"); return; }
              app.setPunchItems(prev => prev.map(p => p.projectId === pid ? { ...p, signedOffBy: app.auth?.name, signedOffAt: new Date().toISOString() } : p));
              show("Punch list signed off", "ok");
            };

            const addPunchPhoto = (itemId, e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                app.setPunchItems(prev => prev.map(p => p.id === itemId ? { ...p, photos: [...(p.photos || []), { name: file.name, data: reader.result }] } : p));
                show("Photo attached", "ok");
              };
              reader.readAsDataURL(file);
            };

            const PRIORITY_BADGE = { high: "badge-red", med: "badge-amber", low: "badge-green" };
            const STATUS_BADGE = { open: "badge-red", "in-progress": "badge-amber", complete: "badge-green" };

            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-12">
                  <div className="fw-700 fs-14">Punch List ({items.length})</div>
                  <div className="flex gap-8">
                    {items.length > 0 && doneItems === items.length && !items[0]?.signedOffBy && (
                      <button className="btn btn-ghost btn-sm text-green" onClick={signOffPunch}>Sign Off</button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={() => setPunchAdding(!punchAdding)}>+ Add Item</button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="flex gap-8 mb-12">
                    <div className="activity-tile fs-11">Open: <strong className="text-red">{openItems}</strong></div>
                    <div className="activity-tile fs-11">In Progress: <strong className="text-amber">{ipItems}</strong></div>
                    <div className="activity-tile fs-11">Complete: <strong className="text-green">{doneItems}</strong></div>
                    <div className="activity-tile fs-11">{pctDone}% done</div>
                  </div>
                )}

                {punchAdding && (
                  <div className="rounded-control mb-sp3 p-sp3 bg-bg3">
                    <div className="grid-2col">
                      <div className="form-group full">
                        <label className="form-label">Description *</label>
                        <input className="form-input" value={punchForm.description} onChange={e => setPunchForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Touch up tape joint at room 201 north wall" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Location</label>
                        <input className="form-input" value={punchForm.location} onChange={e => setPunchForm(f => ({ ...f, location: e.target.value }))} placeholder="Room / Area" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Assigned To</label>
                        <select className="form-select" value={punchForm.assignedTo} onChange={e => setPunchForm(f => ({ ...f, assignedTo: e.target.value }))}>
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Priority</label>
                        <select className="form-select" value={punchForm.priority} onChange={e => setPunchForm(f => ({ ...f, priority: e.target.value }))}>
                          <option value="high">High</option>
                          <option value="med">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-8 mt-8">
                      <button className="btn btn-primary btn-sm" onClick={addPunch}>Add</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPunchAdding(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {items.sort((a, b) => { const o = { open: 0, "in-progress": 1, complete: 2 }; return (o[a.status] ?? 0) - (o[b.status] ?? 0); }).map(item => (
                  <div key={item.id} className="rounded-control mb-sp1 bg-bg3" style={{ padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border)" }}>
                    <div className="flex-between">
                      <div className="flex-1">
                        <span style={{ fontWeight: "var(--weight-medium)", fontSize: "var(--text-label)", textDecoration: item.status === "complete" ? "line-through" : "none" }}>{item.description}</span>
                        {item.location && <span className="text-xs text-muted ml-8">{item.location}</span>}
                      </div>
                      <div className="flex gap-4 flex-center">
                        <span className={`badge ${PRIORITY_BADGE[item.priority]} fs-9`}>{item.priority}</span>
                        <button className={`badge ${STATUS_BADGE[item.status]} fs-xs cursor-pointer`} style={{ border: "none" }} onClick={() => cyclePunchStatus(item)} title="Click to advance status">{item.status}</button>
                        <label className="cursor-pointer fs-12" title="Attach photo">
                          <Camera className="w-4 h-4" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addPunchPhoto(item.id, e)} />
                        </label>
                        <button className="btn btn-ghost fs-xs c-red" style={{ padding: "var(--space-1) var(--space-1)" }} onClick={() => deletePunch(item)}>✕</button>
                      </div>
                    </div>
                    {item.assignedTo && <div className="text-xs text-muted">Assigned: {item.assignedTo}</div>}
                    {(item.photos || []).length > 0 && (
                      <div className="flex gap-4 mt-4">
                        {item.photos.map((p, i) => <img key={i} src={p.data} alt={p.name} className="rounded-control" style={{ width: 40, height: 40, objectFit: "cover", border: "1px solid var(--border)" }} />)}
                      </div>
                    )}
                    {item.signedOffBy && <div className="text-xs text-green mt-4">Signed off by {item.signedOffBy} on {new Date(item.signedOffAt).toLocaleDateString()}</div>}
                  </div>
                ))}

                {items.length === 0 && !punchAdding && <div className="text-xs text-muted">No punch items yet.</div>}
              </div>
            );
          })()}

          {/* ── Construction Phases ── */}
          {!isNew && (() => {
            const editPhases = draft.phases || getDefaultPhases(draft);
            const updateEditPhases = (newPhases) => {
              const updated = { ...draft, phases: newPhases };
              setDraft(updated);
              app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
            };
            const activePhaseEdit = editPhases.find(p => p.status === "in progress");
            const completedEditCount = editPhases.filter(p => p.status === "completed").length;
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-12">
                  <div>
                    <div className="fw-700 fs-14">Construction Phases</div>
                    <div className="fs-11 text-muted mt-2">
                      {completedEditCount}/{editPhases.length} complete
                      {activePhaseEdit ? ` · Active: ${activePhaseEdit.name}` : ""}
                    </div>
                  </div>
                  {activePhaseEdit && (
                    <span className="badge badge-amber fs-10">{activePhaseEdit.name}</span>
                  )}
                </div>
                <PhaseTracker
                  phases={editPhases}
                  employees={app.employees || []}
                  onUpdate={updateEditPhases}
                  readOnly={false}
                />
              </div>
            );
          })()}

          {/* ── Reported Problems ── */}
          {!isNew && (() => {
            const pid = draft.id;
            const projProblems = (app.problems || []).filter(p => String(p.projectId) === String(pid)).sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
            const openProblems = projProblems.filter(p => p.status === "open");
            const PRIORITY_COLOR_MAP = { Low: "var(--green)", Medium: "var(--amber)", High: "var(--red)", Urgent: "#dc2626" };
            const PRIORITY_BADGE_MAP = { Low: "badge-green", Medium: "badge-amber", High: "badge-red", Urgent: "badge-red" };
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Reported Problems ({projProblems.length})
                    {openProblems.length > 0 && <span className="badge badge-red fs-10">{openProblems.length} open</span>}
                  </div>
                </div>
                {projProblems.length === 0 ? (
                  <div className="text-xs text-muted py-8">No problems reported for this project.</div>
                ) : (
                  <div className="flex-col gap-sp2" style={{ maxHeight: 280, overflowY: "auto" }}>
                    {projProblems.map(prob => (
                      <div key={prob.id} style={{ padding: "var(--space-3) var(--space-3)", borderRadius: "var(--radius-control)", background: "var(--bg3)", border: `1px solid ${prob.status === "resolved" ? "var(--border)" : "rgba(245,158,11,0.2)"}`, opacity: prob.status === "resolved" ? 0.65 : 1 }}>
                        <div className="flex-between mb-4">
                          <div className="flex-center-gap-6">
                            <span className={`badge ${PRIORITY_BADGE_MAP[prob.priority] || "badge-amber"} fs-9`}>{prob.priority}</span>
                            <span className="text-xs font-semi text-default">{prob.category}</span>
                          </div>
                          <div className="flex-center-gap-6">
                            <span className={`badge ${prob.status === "resolved" ? "badge-green" : "badge-amber"} fs-9`}>{prob.status}</span>
                            {prob.status === "open" && (
                              <button className="btn btn-ghost btn-link"
                                onClick={() => app.setProblems(prev => prev.map(p => p.id === prob.id ? { ...p, status: "resolved", resolvedAt: new Date().toISOString(), resolvedBy: app.auth?.name } : p))}>
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm mb-4">{prob.description}</div>
                        <div className="text-xs text-muted">
                          {prob.reporter} · {new Date(prob.reportedAt).toLocaleDateString()} {new Date(prob.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {prob.gps && <span className="ml-sp2 d-inline-flex gap-sp1" style={{ alignItems: "center" }}><MapPin style={{ width: 12, height: 12 }} />{prob.gps.lat?.toFixed(4)}, {prob.gps.lng?.toFixed(4)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Sound Quality Testing ── */}
          {!isNew && (() => {
            const ROOM_TYPES = [
              { key: "office", label: "Standard Office", stc: "40-45", assembly: "3-5/8\" 20ga studs · Single layer 5/8\" Type X each side · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall (SF)", "3.5\" Batt Insulation (SF)"], costSF: 8.50, note: "Standard partition meets basic office privacy." },
              { key: "executive", label: "Executive Office", stc: "45-50", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X one side · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers one side (SF)", "3.5\" Batt Insulation (SF)"], costSF: 11.00, note: "Double layer on one side increases STC without RC." },
              { key: "conference", label: "Conference Room", stc: "50+", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X · Resilient Channel RC-1 · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Batt Insulation (SF)"], costSF: 14.00, note: "RC channel decouples drywall to minimize flanking paths." },
              { key: "medical_exam", label: "Medical / Exam Room", stc: "50-55", assembly: "3-5/8\" 20ga studs · Soundbreak XP or QuietRock 545 each side · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "QuietRock 545 or Soundbreak XP (SF)", "3.5\" Batt Insulation (SF)"], costSF: 18.00, note: "QuietRock/Soundbreak XP: STC 52-56 in a single layer (HIPAA)." },
              { key: "hospital_patient", label: "Hospital Patient Room", stc: "55+", assembly: "3-5/8\" 20ga studs · Double layer 5/8\" Type X each side · RC-1 · 3.5\" batt", materials: ["3-5/8\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Batt Insulation (SF)"], costSF: 22.00, note: "High-performance per FGI/HICPAC acoustic standards." },
              { key: "restroom", label: "Restroom / Plumbing Wall", stc: "50+", assembly: "6\" 20ga studs · Double layer 5/8\" Type X · RC-1 · 3.5\" batt", materials: ["6\" 20ga Steel Stud (LF)", "5/8\" Type X Drywall — 2 layers (SF)", "Resilient Channel RC-1 (LF)", "3.5\" Batt Insulation (SF)"], costSF: 16.00, note: "Deeper 6\" cavity + RC reduces airborne and impact noise." },
            ];
            const soundTests = draft.soundTests || [];
            const selRT = ROOM_TYPES.find(r => r.key === soundForm.roomType) || ROOM_TYPES[0];
            const wallLFNum = parseFloat(soundForm.wallLF) || 0;
            const estSF = wallLFNum > 0 ? Math.round(wallLFNum * 9) : 0;
            const estCost = estSF > 0 ? Math.round(estSF * selRT.costSF) : 0;
            const saveTest = () => {
              if (!soundForm.roomLabel.trim()) { show("Enter a room label", "err"); return; }
              const newTest = { id: crypto.randomUUID(), roomLabel: soundForm.roomLabel.trim(), roomType: soundForm.roomType, wallDetails: soundForm.wallDetails, wallLF: soundForm.wallLF, stc: selRT.stc, assembly: selRT.assembly, materials: selRT.materials, estimatedCost: estCost, estimatedSF: estSF, date: new Date().toISOString().slice(0, 10) };
              const updated = { ...draft, soundTests: [...soundTests, newTest] };
              app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
              setDraft(updated);
              setSoundForm({ roomType: "office", roomLabel: "", wallDetails: "", wallLF: "" });
              setShowSoundForm(false);
              show("Acoustic recommendation saved", "ok");
            };
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <Volume2 size={16} className="text-blue" />
                    Sound Testing ({soundTests.length})
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => setShowSoundForm(v => !v)}>{showSoundForm ? "Cancel" : "+ Add Room"}</button>
                </div>
                {showSoundForm && (
                  <div className="rounded-control mb-sp3 p-sp3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid var(--blue-dim)" }}>
                    <div className="flex gap-8 flex-wrap mb-8">
                      <div style={{ flex: "0 0 172px" }}>
                        <label className="text-xs text-dim">Room Label</label>
                        <input className="input input-sm" placeholder="e.g. Conf Room A" value={soundForm.roomLabel} onChange={e => setSoundForm(p => ({ ...p, roomLabel: e.target.value }))} />
                      </div>
                      <div style={{ flex: "0 0 200px" }}>
                        <label className="text-xs text-dim">Room Type</label>
                        <select className="input input-sm" value={soundForm.roomType} onChange={e => setSoundForm(p => ({ ...p, roomType: e.target.value }))}>
                          {ROOM_TYPES.map(r => <option key={r.key} value={r.key}>{r.label} (STC {r.stc})</option>)}
                        </select>
                      </div>
                      <div className="flex-0-100">
                        <label className="text-xs text-dim">Wall LF</label>
                        <input className="input input-sm" type="number" min="0" placeholder="LF" value={soundForm.wallLF} onChange={e => setSoundForm(p => ({ ...p, wallLF: e.target.value }))} />
                      </div>
                    </div>
                    <div className="mb-8">
                      <label className="text-xs text-dim">Notes / Existing Conditions</label>
                      <input className="input input-sm" placeholder="Stud size, height, special conditions..." value={soundForm.wallDetails} onChange={e => setSoundForm(p => ({ ...p, wallDetails: e.target.value }))} />
                    </div>
                    <div className="mb-sp2 fs-label c-text2">
                      <strong>Assembly:</strong> {selRT.assembly} &nbsp;·&nbsp; <span className="text-amber">STC {selRT.stc}</span>
                      {estCost > 0 && <span className="ml-8">· Est. cost: <strong>{fmt(estCost)}</strong></span>}
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={saveTest}>Save</button>
                  </div>
                )}
                {soundTests.length === 0 && !showSoundForm && <div className="text-xs text-muted">No acoustic tests yet.</div>}
                {soundTests.map((test, i) => (
                  <div key={test.id || i} className="border-b fs-label" style={{ padding: "var(--space-2) var(--space-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{test.roomLabel}</strong> <span className="badge badge-blue fs-9">STC {test.stc}</span>
                      <div className="text-dim mt-2">{test.assembly}</div>
                      {test.estimatedCost > 0 && <span className="text-amber">Est. {fmt(test.estimatedCost)}</span>}
                    </div>
                    <button className="btn-bare fs-12" onClick={() => {
                      const updated = { ...draft, soundTests: soundTests.filter((_, j) => j !== i) };
                      app.setProjects(prev => prev.map(p => String(p.id) === String(draft.id) ? updated : p));
                      setDraft(updated);
                    }}>✕</button>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Site Logistics ── */}
          {!isNew && (() => {
            const todayStr = new Date().toISOString().slice(0, 10);
            const logKey = `${draft.id}_${todayStr}`;
            const todayLog = siteLogistics[logKey] || {};
            const LOGISTICS_ITEMS = [
              { id: "dumpster", label: "Dumpster doors accessible and able to open", critical: true, icon: "🗑️" },
              { id: "porta_potty", label: "Porta-potty on site and serviced", critical: false, icon: "🚽" },
              { id: "staging_clear", label: "Material staging area clear and organized", critical: false, icon: "📦" },
              { id: "safety_signage", label: "Safety signage posted at all entry points", critical: false, icon: "⚠️" },
              { id: "fire_exit", label: "Fire exits unobstructed", critical: true, icon: "🚪" },
              { id: "first_aid", label: "First aid kit accessible and stocked", critical: false, icon: "🩺" },
              { id: "temp_power", label: "Temporary power / lighting operational", critical: false, icon: "💡" },
              { id: "deliveries_clear", label: "Delivery access path clear", critical: false, icon: "🚚" },
            ];
            const checkedCount = LOGISTICS_ITEMS.filter(i => todayLog[i.id]).length;
            const critUnchecked = LOGISTICS_ITEMS.filter(i => i.critical && !todayLog[i.id]);
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <HardHat size={16} className="text-amber" />
                    Site Logistics · {todayStr}
                    {critUnchecked.length > 0 && <span className="badge badge-red fs-9">{critUnchecked.length} critical</span>}
                  </div>
                  <span className={`badge ${checkedCount === LOGISTICS_ITEMS.length ? "badge-green" : checkedCount > 0 ? "badge-amber" : "badge-muted"} fs-10`}>{checkedCount}/{LOGISTICS_ITEMS.length}</span>
                </div>
                {critUnchecked.length > 0 && (
                  <div className="rounded-control mb-sp2 fs-tab c-red" style={{ padding: "var(--space-2) var(--space-3)", background: "rgba(239,68,68,0.07)", border: "1px solid var(--red)" }}>
                    ⚠️ Critical unchecked: {critUnchecked.map(i => i.label).join(" · ")}
                  </div>
                )}
                <div className="grid-auto-260 gap-sp1">
                  {LOGISTICS_ITEMS.map(item => {
                    const checked = !!todayLog[item.id];
                    return (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: checked ? "rgba(16,185,129,0.06)" : "var(--bg3)", border: `1px solid ${checked ? "var(--green)" : item.critical && !checked ? "var(--red)" : "var(--border)"}`, cursor: "pointer" }}
                        onClick={() => {
                          const updated = { ...siteLogistics, [logKey]: { ...todayLog, [item.id]: !checked, date: todayStr, projectId: draft.id } };
                          saveSiteLogistics(updated);
                          if (item.critical && checked) show(`⚠️ ${item.label} — unchecked`, "warn");
                        }}>
                        {checked ? <CheckSquare size={14} className="text-green flex-shrink-0" /> : <Square size={14} className="text-dim flex-shrink-0" />}
                        <span className="fs-11">{item.icon} {item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Team Notes ── */}
          {!isNew && (() => {
            const projId = String(draft.id);
            const allNotes = projectNotes.filter(n => String(n.projectId) === projId);
            const catLabel = (cat) => ({ pm: "PM", field: "Field", office: "Office" }[cat] || cat);
            const catBadge = (cat) => ({ pm: "badge-blue", field: "badge-amber", office: "badge-green" }[cat] || "badge-muted");
            const fmtTime = (ts) => { try { const d = new Date(ts); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch { return ts; } };
            const filterMap = { all: allNotes, pm: allNotes.filter(n => n.category === "pm"), field: allNotes.filter(n => n.category === "field"), office: allNotes.filter(n => n.category === "office") };
            const visibleNotes = allNotes.filter(n => notesFilter === "all" || n.category === notesFilter).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.timestamp) - new Date(a.timestamp));
            const addNote = (category) => {
              if (!noteText.trim()) { show("Enter a note", "err"); return; }
              const newNote = { id: crypto.randomUUID(), projectId: projId, text: noteText.trim(), author: app.auth?.name || "PM", role: app.auth?.role || "pm", category, pinned: false, timestamp: new Date().toISOString() };
              saveProjectNotes([newNote, ...projectNotes]);
              setNoteText("");
              show("Note posted", "ok");
            };
            return (
              <div className="mt-16 border-t-2 pt-16">
                <div className="flex-between mb-10">
                  <div className="fw-700 fs-14 flex-center-gap-8">
                    <MessageSquare size={16} className="text-green" />
                    Team Notes ({allNotes.length})
                  </div>
                </div>
                <textarea className="form-textarea mb-sp2 fs-label w-full" rows={2} placeholder="Post a note to the project team..." value={noteText} onChange={e => setNoteText(e.target.value)} style={{ resize: "vertical" }} />
                <div className="flex gap-6 mb-10">
                  <button className="btn btn-sm btn-primary" onClick={() => addNote("pm")} disabled={!noteText.trim()}>PM Note</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => addNote("field")} disabled={!noteText.trim()}>Field Note</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => addNote("office")} disabled={!noteText.trim()}>Office Note</button>
                  <div className="ml-auto flex gap-4">
                    {["all", "pm", "field", "office"].map(f => (
                      <button key={f} className={`btn btn-sm capitalize fs-xs ${notesFilter === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setNotesFilter(f)} style={{ padding: "var(--space-1) var(--space-2)" }}>
                        {f === "all" ? `All (${allNotes.length})` : `${catLabel(f)} (${filterMap[f]?.length || 0})`}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleNotes.length === 0 ? (
                  <div className="text-xs text-muted">No notes yet.</div>
                ) : (
                  <div className="flex-col gap-sp2" style={{ maxHeight: 240, overflowY: "auto" }}>
                    {visibleNotes.map(note => (
                      <div key={note.id} style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-control)", background: note.pinned ? "rgba(245,158,11,0.05)" : "var(--bg3)", border: `1px solid ${note.pinned ? "var(--amber)" : "var(--border)"}` }}>
                        <div className="flex-between mb-4">
                          <div className="flex-center-gap-6">
                            {note.pinned && <Pin size={10} className="text-amber" />}
                            <span className="font-semi fs-12">{note.author}</span>
                            <span className={`badge ${catBadge(note.category)} fs-8`}>{catLabel(note.category)}</span>
                          </div>
                          <div className="flex-center-gap-4">
                            <span className="fs-xs c-text3">{fmtTime(note.timestamp)}</span>
                            <button onClick={() => saveProjectNotes(projectNotes.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n))} style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "var(--amber)" : "var(--text3)", padding: "var(--space-1) var(--space-1)" }}>
                              {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                            </button>
                            <button onClick={() => saveProjectNotes(projectNotes.filter(n => n.id !== note.id))} className="btn-bare fs-11">✕</button>
                          </div>
                        </div>
                        <div className="fs-12 ws-pre-wrap" style={{ lineHeight: 1.4 }}>{note.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="modal-actions flex-between">
            {!isNew && <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8 ml-auto">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Project" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── Edit Contact ──
  if (type === "editContact") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">{isNew ? "Add Contact" : "Edit Contact"}</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={draft.name} onChange={e => upd("name", e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={draft.company} onChange={e => upd("company", e.target.value)} placeholder="Company" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-input" value={draft.role} onChange={e => upd("role", e.target.value)} placeholder="e.g. Senior PM" />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={draft.priority} onChange={e => upd("priority", e.target.value)}>
                <option value="high">High</option>
                <option value="med">Med</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={draft.phone} onChange={e => upd("phone", e.target.value)} placeholder="713-555-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={draft.email} onChange={e => upd("email", e.target.value)} placeholder="email@company.com" />
            </div>
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={draft.notes} onChange={e => upd("notes", e.target.value)} placeholder="Notes about this contact..." />
            </div>
          </div>

          {/* ── GC JSA Template Config ── */}
          <div className="mt-16">
            <div className="text-xs text-dim mb-8" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>GC JSA TEMPLATE</span>
              {!draft.gcJsaTemplate && (
                <button className="btn btn-ghost btn-sm fs-xs" onClick={() => upd("gcJsaTemplate", { name: "", requiredPpe: [], requiredPermits: [], headerText: "", additionalNotes: "", requireSupervisorSignature: true, requireCompetentPerson: true })}>
                  + Configure
                </button>
              )}
            </div>
            {!draft.gcJsaTemplate && (
              <div className="text-sm text-muted">No JSA template configured for this GC. Click Configure to set up their required JSA format.</div>
            )}
            {draft.gcJsaTemplate && (
                <div className="card" style={{ padding: "var(--space-3)", background: "var(--bg2)", borderRadius: "var(--radius-md)" }}>
                  <div className="form-grid">
                    <div className="form-group full">
                      <label className="form-label">Template Name</label>
                      <input className="form-input" value={draft.gcJsaTemplate.name || ""} onChange={e => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, name: e.target.value })} placeholder="e.g. Forney Standard JSA" />
                    </div>
                    <div className="form-group full">
                      <label className="form-label">PDF Header Text</label>
                      <input className="form-input" value={draft.gcJsaTemplate.headerText || ""} onChange={e => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, headerText: e.target.value })} placeholder="e.g. Forney Construction — Safety Department" />
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Required PPE</label>
                      <div className="flex gap-4 flex-wrap">
                        {PPE_ITEMS.map(item => {
                          const active = (draft.gcJsaTemplate.requiredPpe || []).includes(item.key);
                          return (
                            <button key={item.key} type="button"
                              className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                              style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)" }}
                              onClick={() => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, requiredPpe: active ? draft.gcJsaTemplate.requiredPpe.filter(k => k !== item.key) : [...(draft.gcJsaTemplate.requiredPpe || []), item.key] })}>
                              {item.icon} {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Required Permits</label>
                      <div className="flex gap-4 flex-wrap">
                        {PERMIT_TYPES.map(p => {
                          const active = (draft.gcJsaTemplate.requiredPermits || []).includes(p.key);
                          return (
                            <button key={p.key} type="button"
                              className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
                              style={{ fontSize: "var(--text-xs)", padding: "var(--space-1) var(--space-2)" }}
                              onClick={() => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, requiredPermits: active ? draft.gcJsaTemplate.requiredPermits.filter(k => k !== p.key) : [...(draft.gcJsaTemplate.requiredPermits || []), p.key] })}>
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="form-group full">
                      <label className="form-label">Additional Notes / Requirements</label>
                      <textarea className="form-textarea" value={draft.gcJsaTemplate.additionalNotes || ""} onChange={e => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, additionalNotes: e.target.value })} placeholder="GC-specific safety requirements..." />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={draft.gcJsaTemplate.requireSupervisorSignature !== false} onChange={e => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, requireSupervisorSignature: e.target.checked })} />
                        Require Supervisor Signature
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={draft.gcJsaTemplate.requireCompetentPerson !== false} onChange={e => upd("gcJsaTemplate", { ...draft.gcJsaTemplate, requireCompetentPerson: e.target.checked })} />
                        Require Competent Person
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm fs-xs c-red mt-8" onClick={() => { if (confirm("Remove JSA template config?")) upd("gcJsaTemplate", null); }}>Remove Template</button>
                </div>
            )}
          </div>

          {!isNew && (
            <div className="mt-16">
              <div className="text-xs text-dim mb-8">CALL HISTORY</div>
              {app.callLog.filter(c => c.contact === draft.name).length === 0 ? (
                <div className="text-sm text-muted">No calls logged for this contact.</div>
              ) : (
                app.callLog.filter(c => c.contact === draft.name).map(c => (
                  <div key={c.id} className="flex gap-8 border-b" style={{ padding: "var(--space-2) 0", alignItems: "center" }}>
                    <div className="text-xs text-dim flex-shrink-0" style={{ width: 130 }}>{c.time}</div>
                    <div className="text-sm flex-1">{c.note}</div>
                    <button className="btn btn-ghost btn-sm fs-xs c-red flex-shrink-0" style={{ padding: "var(--space-1) var(--space-1)" }}
                      onClick={() => { if (confirm("Delete this call log?")) { app.setCallLog(prev => prev.filter(cl => cl.id !== c.id)); app.show("Call deleted"); } }}>✕</button>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="modal-actions flex-between">
            {!isNew && <button className="btn badge-red-outlined" onClick={handleDelete}>Delete</button>}
            <div className="flex gap-8 ml-auto">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{isNew ? "Add Contact" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Log Call ──
  if (type === "logCall") {
    return (
      <div className="modal-overlay" onMouseDown={handleOverlayDown} onMouseUp={handleOverlayUp(close)}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">Log Call</div>
            <button className="modal-close" onClick={close}>✕</button>
          </div>
          <div className="form-grid">
            <div className="form-group full">
              <label className="form-label">Contact</label>
              <select className="form-select" value={draft.contact} onChange={e => upd("contact", e.target.value)}>
                <option value="">-- Select Contact --</option>
                {app.contacts.map(c => <option key={c.id} value={c.name}>{c.name} ({c.company})</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label className="form-label">Call Note</label>
              <textarea className="form-textarea" value={draft.note} onChange={e => upd("note", e.target.value)} placeholder="What was discussed..." />
            </div>
            <div className="form-group full">
              <label className="form-label">Next Action</label>
              <input className="form-input" value={draft.next} onChange={e => upd("next", e.target.value)} placeholder="Follow-up action..." />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={close}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Log Call</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export { ModalHub, SCOPE_OPTIONS };
