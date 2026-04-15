# Phase C — Document Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three document import features (Proposal PDF, GC Punch, GC Schedule) that eliminate manual data re-entry from existing PDFs and emails.

**Architecture:** Shared PDF text extraction utility + shared ImportReviewModal component. C1 uses Claude API for AI parsing, C2+C3 use local heuristic parsers with a shared EBC trade keyword dictionary. All three integrate into existing tabs (Estimating, PunchList, Calendar).

**Tech Stack:** React 19, pdfjs-dist (already installed), Claude API via existing `callClaude()`, Vite

---

### Task 1: Shared PDF Text Extractor

**Files:**
- Create: `src/utils/pdfTextExtractor.js`

The existing `pdfBidExtractor.js` already has an `extractPdfText()` function. Rather than duplicating, we'll create a thin re-export that other modules import from a dedicated file — keeping `pdfBidExtractor` focused on bid-specific parsing. Actually, since `extractPdfText` in `pdfBidExtractor.js` is already a clean, generic function, we'll simply import it from there in our new modules. No new file needed — skip this task and import directly from `pdfBidExtractor.js`.

**This task is a no-op.** The existing `extractPdfText` at `src/utils/pdfBidExtractor.js:19` is already generic and reusable.

---

### Task 2: Proposal Importer (AI Parser)

**Files:**
- Create: `src/utils/proposalImporter.js`

- [ ] **Step 1: Create `proposalImporter.js`**

Create `src/utils/proposalImporter.js` with the AI-powered proposal parsing function:

```javascript
// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Proposal Importer
//  Extracts structured proposal data from PDF text using Claude API
// ═══════════════════════════════════════════════════════════════

import { callClaude } from "./api.js";

/**
 * Parse raw proposal text into structured QuickProposal fields using Claude.
 * @param {string} apiKey - Anthropic API key
 * @param {string} rawText - Extracted text from a proposal PDF
 * @returns {Promise<Object>} Parsed proposal data matching QuickProposal schema
 */
export async function parseProposalWithAI(apiKey, rawText) {
  if (!apiKey) throw new Error("NO_API_KEY");
  if (!rawText || rawText.trim().length < 20) throw new Error("EMPTY_TEXT");

  const prompt = `You are a data extraction assistant for Eagles Brothers Constructors (EBC), a Houston drywall, metal framing, and ACT ceiling subcontractor.

Extract structured proposal data from this document text. This is an EBC proposal (or similar subcontractor proposal) that may contain scope sections like Demo, Buildback, Drywall, ACT, Framing, Insulation, etc.

DOCUMENT TEXT:
---
${rawText.slice(0, 6000)}
---

Return ONLY valid JSON with this exact structure (use empty string or empty array if a field is not found — never null, never omit fields):

{
  "projectName": "",
  "projectAddress": "",
  "gcName": "",
  "lineItems": [{"description": "scope section name", "amount": 0}],
  "alternates": [{"description": "", "type": "add or deduct", "amount": 0}],
  "includes": ["item 1", "item 2"],
  "excludes": ["item 1", "item 2"],
  "notes": ""
}

Rules:
- lineItems: Each scope section (Demo, Drywall/Build Back, ACT, Framing, etc.) with its dollar amount. If multiple rooms, sum them per scope type.
- alternates: Each alternate with description, type ("add" or "deduct"), and amount.
- includes/excludes: Extract each numbered item as a separate string in the array.
- notes: Any general conditions, payment terms, or important notes.
- amounts: Numbers only, no dollar signs or commas.

Return ONLY the JSON object, no markdown, no explanation.`;

  const response = await callClaude(apiKey, prompt, 2048);

  // Parse the JSON response — handle cases where Claude wraps in markdown
  let cleaned = response.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("PARSE_FAILED");
  }

  // Normalize and validate the parsed data
  return {
    projectName: String(parsed.projectName || ""),
    projectAddress: String(parsed.projectAddress || ""),
    gcName: String(parsed.gcName || ""),
    lineItems: Array.isArray(parsed.lineItems)
      ? parsed.lineItems
          .filter((li) => li.description)
          .map((li) => ({
            description: String(li.description),
            amount: String(Number(li.amount) || 0),
          }))
      : [{ description: "", amount: "" }],
    alternates: Array.isArray(parsed.alternates)
      ? parsed.alternates
          .filter((a) => a.description)
          .map((a) => ({
            description: String(a.description),
            type: a.type === "deduct" ? "deduct" : "add",
            amount: String(Number(a.amount) || 0),
          }))
      : [],
    includes: Array.isArray(parsed.includes)
      ? parsed.includes.filter(Boolean).map(String)
      : [],
    excludes: Array.isArray(parsed.excludes)
      ? parsed.excludes.filter(Boolean).map(String)
      : [],
    notes: String(parsed.notes || ""),
  };
}
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `ls src/utils/proposalImporter.js`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/utils/proposalImporter.js
git commit -m "feat(C1): add AI-powered proposal PDF parser using Claude API"
```

---

### Task 3: GC Document Parser (Local Heuristic — Punch + Schedule)

**Files:**
- Create: `src/utils/gcDocParser.js`

- [ ] **Step 1: Create `gcDocParser.js` with EBC keyword dictionary and punch list parser**

Create `src/utils/gcDocParser.js`:

```javascript
// ═══════════════════════════════════════════════════════════════
//  EBC-OS · GC Document Parser
//  Local heuristic parsers for GC punch lists and schedules
//  100% offline — no network required
// ═══════════════════════════════════════════════════════════════

// ── EBC Trade Keyword Dictionary ──
// Used to filter GC documents for Eagles Brothers-relevant items
export const EBC_TRADE_KEYWORDS = [
  "eagles brothers", "ebc",
  "drywall", "framing", "act", "ceiling", "partition",
  "wall", "tape", "mud", "finish", "hang", "demo",
  "buildback", "build back", "shaft wall", "soffit", "bulkhead",
  "metal stud", "gyp board", "gypsum", "sheetrock",
  "acoustical", "gwb", "stud", "track", "insulation",
];

// Trades to SKIP — if an item mentions only these, it's not EBC's
const OTHER_TRADES = [
  "plumbing", "plumber", "electrical", "electrician", "hvac",
  "mechanical", "fire protection", "sprinkler", "roofing",
  "glazing", "glass", "flooring", "carpet", "tile", "concrete",
  "steel erection", "structural steel", "elevator",
];

// ── Location patterns ──
const LOCATION_PATTERNS = [
  /\b(?:Room|Rm)\s*#?\s*(\d+\w?)/i,
  /\b(?:Floor|FL|Flr)\s*#?\s*(\d+)/i,
  /\b(?:Area|Zone)\s+([A-Z0-9]+)/i,
  /\b(?:Suite|Ste)\s*#?\s*(\d+\w?)/i,
  /\b(?:Level|Lvl)\s*#?\s*(\d+)/i,
  /\b(?:Wing)\s+([A-Z])/i,
];

// Location delimiters — text after these is likely a location
const LOCATION_DELIMITERS = /\s+(?:@|at|in|—|–|-)\s+(.+?)$/i;

// ── Priority keyword mapping ──
const HIGH_PRIORITY = /\b(?:urgent|asap|critical|immediate|safety|life[\s-]?safety)\b/i;
const LOW_PRIORITY = /\b(?:minor|cosmetic|when\s+possible|low\s+priority|touch[\s-]?up)\b/i;

/**
 * Split raw text into individual items (lines/bullets/numbered)
 */
function splitItems(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let current = null;

  for (const line of lines) {
    // Skip header-like lines (all caps, very short, or "page X of Y")
    if (/^page\s+\d+/i.test(line)) continue;
    if (line.length < 3) continue;

    // Detect numbered item: "1.", "1)", "#1", "Item 1:", "1 -", "1:"
    const numberedMatch = line.match(/^(?:(?:Item\s*)?#?\s*(\d+)\s*[.):\-])\s*(.+)/i);
    // Detect bullet: "- ", "* ", "• "
    const bulletMatch = !numberedMatch && line.match(/^[\-\*\u2022]\s+(.+)/);
    // Detect table row (tab-separated with 2+ columns)
    const isTabRow = line.includes("\t") && line.split("\t").filter(Boolean).length >= 2;

    if (numberedMatch) {
      if (current) items.push(current);
      current = numberedMatch[2].trim();
    } else if (bulletMatch) {
      if (current) items.push(current);
      current = bulletMatch[1].trim();
    } else if (isTabRow) {
      if (current) items.push(current);
      // Join tab columns into a single description
      current = line.split("\t").filter(Boolean).map((c) => c.trim()).join(" — ");
    } else if (current) {
      // Continuation line — append to current item
      current += " " + line;
    } else {
      // Standalone line
      current = line;
    }
  }
  if (current) items.push(current);

  return items;
}

/**
 * Check if text matches EBC trade keywords
 */
function isEbcRelevant(text) {
  const lower = text.toLowerCase();

  // Direct EBC mention — always include
  if (lower.includes("eagles brothers") || lower.includes("ebc")) return true;

  // Check if it's clearly another trade
  const isOtherTrade = OTHER_TRADES.some((t) => lower.includes(t));
  if (isOtherTrade) {
    // Only skip if no EBC keywords also present
    const hasEbcKeyword = EBC_TRADE_KEYWORDS.some((k) => lower.includes(k));
    if (!hasEbcKeyword) return false;
  }

  // Check for EBC trade keywords
  return EBC_TRADE_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Extract location from item text
 */
function extractLocation(text) {
  // Try structured patterns first
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Return the full match context (e.g., "Room 201" not just "201")
      return match[0].trim();
    }
  }

  // Try delimiter-based extraction
  const delimMatch = text.match(LOCATION_DELIMITERS);
  if (delimMatch) {
    const loc = delimMatch[1].trim();
    // Only use if it looks like a location (short, not a full sentence)
    if (loc.length < 60 && !/\b(?:need|should|must|please|replace|repair|fix)\b/i.test(loc)) {
      return loc;
    }
  }

  return "";
}

/**
 * Determine priority from item text
 */
function extractPriority(text) {
  if (HIGH_PRIORITY.test(text)) return "high";
  if (LOW_PRIORITY.test(text)) return "low";
  return "medium";
}

/**
 * Normalize text for deduplication comparison
 */
function normalizeForCompare(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Parse a GC punch list into structured EBC-relevant items.
 * Works 100% offline — no network required.
 *
 * @param {string} text - Raw text from paste or PDF extraction
 * @param {Array} existingItems - Existing punch items for the project (for dedup)
 * @returns {{ items: Array, totalParsed: number, ebcCount: number }}
 */
export function parseGcPunchList(text, existingItems = []) {
  if (!text || text.trim().length < 5) {
    return { items: [], totalParsed: 0, ebcCount: 0 };
  }

  const allItems = splitItems(text);
  const totalParsed = allItems.length;

  // Existing normalized descriptions for dedup
  const existingNormalized = existingItems
    .filter((p) => p.status !== "deleted")
    .map((p) => normalizeForCompare(p.description));

  const ebcItems = [];

  for (const raw of allItems) {
    if (!isEbcRelevant(raw)) continue;

    const description = raw
      .replace(LOCATION_DELIMITERS, "") // remove location suffix from description
      .replace(/\s+/g, " ")
      .trim();

    const location = extractLocation(raw);
    const priority = extractPriority(raw);
    const normalized = normalizeForCompare(description);
    const isDuplicate = existingNormalized.some(
      (existing) => existing === normalized || existing.includes(normalized) || normalized.includes(existing)
    );

    ebcItems.push({
      description: description.length > 0 ? description : raw.trim(),
      location,
      priority,
      selected: true,
      isDuplicate,
    });
  }

  return {
    items: ebcItems,
    totalParsed,
    ebcCount: ebcItems.length,
  };
}

// ── Date parsing helpers for schedule parser ──

const MONTH_MAP = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8, sept: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

/**
 * Parse a date string into YYYY-MM-DD format.
 * Handles: MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD, Month DD, Mon DD, Month DD YYYY
 * Returns null if unparseable.
 */
function parseDate(str) {
  if (!str) return null;
  const s = str.trim();

  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  // MM/DD/YYYY or MM/DD/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? "20" + mdy[3] : mdy[3];
    return `${year}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  }

  // MM/DD (no year — assume current year)
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const year = new Date().getFullYear();
    return `${year}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`;
  }

  // "Month DD, YYYY" or "Month DD YYYY" or "Month DD"
  const monthDay = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?/);
  if (monthDay) {
    const monthIdx = MONTH_MAP[monthDay[1].toLowerCase()];
    if (monthIdx !== undefined) {
      const year = monthDay[3] || new Date().getFullYear();
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Extract dates from a text line. Handles single dates and ranges.
 * Returns { start: "YYYY-MM-DD" | null, end: "YYYY-MM-DD" | null }
 */
function extractDates(text) {
  // Date range patterns: "3/15 - 3/22", "3/15-3/22", "March 15 - March 22", "3/15 through 3/22"
  const rangePatterns = [
    // MM/DD/YYYY - MM/DD/YYYY (with optional year)
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–—]\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/,
    // MM/DD - DD (same month shorthand: "3/15-22")
    /(\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})(?!\/)/, // no trailing slash = shorthand
    // Month DD - Month DD
    /([A-Za-z]+\s+\d{1,2}(?:[,\s]+\d{4})?)\s*(?:[-–—]|through|thru|to)\s*([A-Za-z]+\s+\d{1,2}(?:[,\s]+\d{4})?)/i,
  ];

  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4 && /^\d{1,2}$/.test(match[3])) {
        // Same-month shorthand: "3/15-22" → 3/15 - 3/22
        const start = parseDate(`${match[1]}/${match[2]}`);
        const end = parseDate(`${match[1]}/${match[3]}`);
        if (start && end) return { start, end };
      } else {
        const start = parseDate(match[1]);
        const end = parseDate(match[2]);
        if (start && end) return { start, end };
      }
    }
  }

  // Single date patterns
  const singlePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}\/\d{1,2})/,
    /(\d{4}-\d{1,2}-\d{1,2})/,
    /([A-Za-z]+\s+\d{1,2}(?:[,\s]+\d{4})?)/,
  ];

  for (const pattern of singlePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = parseDate(match[1]);
      if (date) return { start: date, end: date };
    }
  }

  return { start: null, end: null };
}

/**
 * Validate a parsed date and return a warning if problematic.
 */
function validateDate(dateStr) {
  if (!dateStr) return "No date found";
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAhead = new Date(now);
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

  if (d < oneYearAgo) return "Date is more than 1 year in the past";
  if (d > oneYearAhead) return "Date is more than 1 year in the future";
  return null;
}

/**
 * Parse a GC schedule into structured EBC-relevant items.
 * Works 100% offline — no network required.
 *
 * @param {string} text - Raw text from paste or PDF extraction
 * @returns {{ items: Array, totalParsed: number, ebcCount: number }}
 */
export function parseGcSchedule(text) {
  if (!text || text.trim().length < 5) {
    return { items: [], totalParsed: 0, ebcCount: 0 };
  }

  const allItems = splitItems(text);
  const totalParsed = allItems.length;
  const ebcItems = [];

  for (const raw of allItems) {
    if (!isEbcRelevant(raw)) continue;

    const dates = extractDates(raw);

    // Clean the title: remove date strings from the description
    let title = raw
      .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, "")
      .replace(/\d{4}-\d{1,2}-\d{1,2}/g, "")
      .replace(/[-–—]\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!title) title = raw.trim();

    // Date warnings
    let dateWarning = null;
    if (!dates.start) {
      dateWarning = "No date found";
    } else {
      dateWarning = validateDate(dates.start);
      // Check range length
      if (dates.start && dates.end && dates.start !== dates.end) {
        const startD = new Date(dates.start + "T12:00:00");
        const endD = new Date(dates.end + "T12:00:00");
        const days = Math.round((endD - startD) / (1000 * 60 * 60 * 24));
        if (days > 90) dateWarning = `Range spans ${days} days — verify dates`;
      }
    }

    ebcItems.push({
      title,
      date: dates.start || "",
      endDate: dates.end || dates.start || "",
      selected: true,
      dateWarning,
    });
  }

  return {
    items: ebcItems,
    totalParsed,
    ebcCount: ebcItems.length,
  };
}
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `ls src/utils/gcDocParser.js`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/utils/gcDocParser.js
git commit -m "feat(C2+C3): add local GC punch list and schedule parsers with EBC trade filtering"
```

---

### Task 4: Import Review Modal (Shared Component)

**Files:**
- Create: `src/components/ImportReviewModal.jsx`

- [ ] **Step 1: Create the shared ImportReviewModal component**

Create `src/components/ImportReviewModal.jsx`. This modal is used by both C2 (punch import) and C3 (schedule import). It provides:
- Two input tabs (Paste / Upload PDF)
- Loading state
- Review checklist with editable fields
- Count badge and confirm button

```javascript
// ═══════════════════════════════════════════════════════════════
//  EBC-OS · Import Review Modal
//  Shared modal for importing GC documents (punch lists, schedules)
//  Supports paste text and PDF upload with review before commit
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { Upload, FileText, ClipboardPaste, AlertTriangle, Check, X } from "lucide-react";
import { extractPdfText } from "../utils/pdfBidExtractor.js";

/**
 * ImportReviewModal — shared modal for importing GC documents.
 *
 * Props:
 *   open: boolean — whether modal is visible
 *   onClose: () => void — close the modal
 *   title: string — modal title (e.g., "Import GC Punch List")
 *   loadingMessage: string — shown during parsing (e.g., "Scanning for EBC items...")
 *   emptyMessage: string — shown when no items found
 *   parseText: (text: string) => { items: Array, totalParsed: number, ebcCount: number }
 *   renderItem: (item, index, updateItem) => JSX — render each review row
 *   onConfirm: (selectedItems: Array) => void — called with checked items on confirm
 *   projectSelector: JSX | null — optional project dropdown rendered above input tabs
 */
export function ImportReviewModal({
  open, onClose, title, loadingMessage, emptyMessage,
  parseText, renderItem, onConfirm, projectSelector,
}) {
  const [tab, setTab] = useState("paste"); // "paste" | "upload"
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { items, totalParsed, ebcCount }
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setTab("paste");
    setPasteText("");
    setLoading(false);
    setResult(null);
    setError("");
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleParse = async (text) => {
    if (!text || text.trim().length < 5) {
      setError("Please provide more text to parse.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // parseText can be sync or async
      const res = await Promise.resolve(parseText(text));
      if (!res.items || res.items.length === 0) {
        setError(emptyMessage || "No relevant items found in this document.");
      } else {
        setResult(res);
      }
    } catch (e) {
      console.error("Import parse error:", e);
      setError("Could not parse this format. Try pasting items as a numbered list.");
    }
    setLoading(false);
  };

  const handlePasteSubmit = () => handleParse(pasteText);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const text = await extractPdfText(file);
      await handleParse(text);
    } catch (e) {
      console.error("PDF extraction error:", e);
      setError("Could not read this PDF. Try pasting the text instead.");
      setLoading(false);
    }
  };

  const updateItem = (index, updates) => {
    setResult((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], ...updates };
      return { ...prev, items: newItems, ebcCount: newItems.filter((i) => i.selected).length };
    });
  };

  const selectedCount = result ? result.items.filter((i) => i.selected).length : 0;

  const handleConfirm = () => {
    if (!result) return;
    const selected = result.items.filter((i) => i.selected);
    onConfirm(selected);
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)", maxWidth: 680, width: "95%",
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div className="flex-between mb-12">
          <h3 className="section-title" style={{ margin: 0 }}>
            <Upload size={18} style={{ marginRight: 8, verticalAlign: "middle" }} />
            {title}
          </h3>
          <button className="btn btn-ghost" onClick={handleClose}><X size={16} /></button>
        </div>

        {/* Optional project selector */}
        {projectSelector && <div className="mb-12">{projectSelector}</div>}

        {/* Input phase — show only if no results yet */}
        {!result && !loading && (
          <>
            {/* Tab toggle */}
            <div className="flex gap-8 mb-12">
              <button className={`btn btn-sm ${tab === "paste" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("paste")}>
                <ClipboardPaste size={14} className="mr-sp1" /> Paste Text
              </button>
              <button className={`btn btn-sm ${tab === "upload" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("upload")}>
                <FileText size={14} className="mr-sp1" /> Upload PDF
              </button>
            </div>

            {tab === "paste" && (
              <div>
                <textarea
                  className="form-input"
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the GC document text here..."
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
                <button className="btn btn-primary mt-sp2" onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}>
                  Parse Document
                </button>
              </div>
            )}

            {tab === "upload" && (
              <div style={{ border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)",
                padding: "var(--space-6)", textAlign: "center" }}>
                <Upload size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div className="text-sm mb-sp2" style={{ opacity: 0.6 }}>Select a PDF file</div>
                <input type="file" accept=".pdf" onChange={handleFileUpload}
                  style={{ display: "block", margin: "0 auto" }} />
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
            <div className="text-sm mb-sp2" style={{ opacity: 0.6 }}>{loadingMessage}</div>
            <div style={{ width: 32, height: 32, border: "3px solid var(--border-color)",
              borderTopColor: "var(--accent)", borderRadius: "50%",
              animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card p-sp3 mb-12" style={{ background: "var(--danger-bg, #1a0000)",
            border: "1px solid var(--danger, #ff4444)" }}>
            <AlertTriangle size={14} style={{ marginRight: 6, color: "var(--danger, #ff4444)" }} />
            <span className="text-sm">{error}</span>
            <button className="btn btn-sm btn-ghost mt-sp2" onClick={reset}>Try Again</button>
          </div>
        )}

        {/* Review phase */}
        {result && (
          <>
            {/* Count badge */}
            <div className="card p-sp2 mb-12" style={{
              background: "var(--accent-bg, rgba(0,122,255,0.1))",
              border: "1px solid var(--accent)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Check size={16} style={{ color: "var(--accent)" }} />
              <span className="text-sm fw-bold">
                Found {result.ebcCount} EBC item{result.ebcCount !== 1 ? "s" : ""} out of {result.totalParsed} total
              </span>
            </div>

            {/* Item list */}
            <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: "var(--space-4)" }}>
              {result.items.map((item, i) => (
                <div key={i} style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderBottom: "1px solid var(--border-color)",
                  opacity: item.selected ? 1 : 0.4,
                  display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <input type="checkbox" checked={item.selected}
                    onChange={(e) => updateItem(i, { selected: e.target.checked })}
                    style={{ marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    {renderItem(item, i, (updates) => updateItem(i, updates))}
                  </div>
                </div>
              ))}
            </div>

            {/* Confirm */}
            <div className="flex gap-8" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={reset}>Back</button>
              <button className="btn btn-primary" onClick={handleConfirm}
                disabled={selectedCount === 0}>
                Import {selectedCount} Item{selectedCount !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `ls src/components/ImportReviewModal.jsx`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/components/ImportReviewModal.jsx
git commit -m "feat(C2+C3): add shared ImportReviewModal component with paste/upload tabs and review checklist"
```

---

### Task 5: Integrate C1 — Proposal PDF Import into QuickProposalModal

**Files:**
- Modify: `src/tabs/Estimating.jsx` (around line 2361 — `QuickProposalModal`)

- [ ] **Step 1: Add the import functionality to QuickProposalModal**

Read `src/tabs/Estimating.jsx` starting from line 2361 (the `QuickProposalModal` function). Add:

1. Import `extractPdfText` from `pdfBidExtractor.js` and `parseProposalWithAI` from `proposalImporter.js` at the top of the file.
2. Add `apiKey` to the component props (it needs the API key from app state).
3. Add state for import loading: `const [importing, setImporting] = useState(false);`
4. Add an `handleImportPdf` function.
5. Add the "Import from PDF" button before the form fields, after the "Prefill from Bid" section.

At the top of the file, add imports (after existing imports):

```javascript
import { extractPdfText } from "../utils/pdfBidExtractor.js";
import { parseProposalWithAI } from "../utils/proposalImporter.js";
```

Modify the `QuickProposalModal` function signature to accept `apiKey` and `show` (toast):

```javascript
function QuickProposalModal({ bids, show, onClose, apiKey }) {
```

After the `const [generatedPdf, setGeneratedPdf] = useState(null);` line (around line 2373), add:

```javascript
  const [importing, setImporting] = useState(false);

  const handleImportPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) { show("Set your API key in Settings to use Import", "err"); return; }
    setImporting(true);
    try {
      const text = await extractPdfText(file);
      const data = await parseProposalWithAI(apiKey, text);
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
      if (err.message === "NO_API_KEY") show("Set API key in Settings first", "err");
      else if (err.message === "PARSE_FAILED") show("Could not parse proposal — fill in details manually", "err");
      else if (err.message === "EMPTY_TEXT") show("Could not read PDF — try a different file", "err");
      else show("Import failed — " + (err.message || "unknown error"), "err");
    }
    setImporting(false);
    // Reset file input so the same file can be re-uploaded
    e.target.value = "";
  };
```

After the "Prefill from Bid" section (around line 2465), add the import button:

```jsx
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
```

Also add `Upload` to the lucide-react import at the top of the file.

- [ ] **Step 2: Update all call sites of QuickProposalModal to pass `apiKey`**

Search for `<QuickProposalModal` in `Estimating.jsx` (lines ~1157 and ~1959). Add `apiKey={app.apiKey}` prop to each call site. The `show` prop is already passed.

For each instance, change from:
```jsx
<QuickProposalModal bids={...} show={show} onClose={...} />
```
to:
```jsx
<QuickProposalModal bids={...} show={show} onClose={...} apiKey={app.apiKey} />
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/tabs/Estimating.jsx src/utils/proposalImporter.js
git commit -m "feat(C1): integrate proposal PDF import into QuickProposalModal — AI extracts fields from uploaded PDF"
```

---

### Task 6: Integrate C2 — GC Punch Import into PunchListTab

**Files:**
- Modify: `src/tabs/PunchListTab.jsx`

- [ ] **Step 1: Add imports and state for the punch import modal**

At the top of `src/tabs/PunchListTab.jsx`, add:

```javascript
import { ImportReviewModal } from "../components/ImportReviewModal.jsx";
import { parseGcPunchList } from "../utils/gcDocParser.js";
```

Inside the `PunchListTab` component (after the existing state declarations around line 36), add:

```javascript
  const [showImport, setShowImport] = useState(false);
```

- [ ] **Step 2: Add the `handlePunchImport` callback and "Import GC Punch" button**

Add the import confirmation handler (after the existing `resetForm` function):

```javascript
  const handlePunchImport = useCallback((selectedItems) => {
    const now = new Date().toISOString();
    const newItems = selectedItems.map((item) => ({
      id: crypto.randomUUID(),
      projectId: Number(projectId),
      description: item.description,
      location: item.location,
      assignedTo: null,
      priority: item.priority,
      status: "open",
      photos: [],
      createdAt: now,
      completedAt: null,
    }));
    setPunchItems((prev) => [...prev, ...newItems]);
  }, [projectId, setPunchItems]);
```

Add the "Import GC Punch" button next to the existing "Add Punch Item" button (around line 189-192). Change:

```jsx
        <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t}>
          <Plus size={14} className="mr-sp1" />
          {tr("Add Punch Item")}
        </FieldButton>
```

to:

```jsx
        <div className="flex gap-8">
          <FieldButton onClick={() => setShowImport(true)} t={t}>
            <Upload size={14} className="mr-sp1" />
            {tr("Import GC Punch")}
          </FieldButton>
          <FieldButton onClick={() => { if (showForm && editingId) { resetForm(); } else { setShowForm(!showForm); } }} t={t}>
            <Plus size={14} className="mr-sp1" />
            {tr("Add Punch Item")}
          </FieldButton>
        </div>
```

Add `Upload` to the lucide-react import at the top of the file.

- [ ] **Step 3: Add the ImportReviewModal at the bottom of the component's JSX return**

Before the closing `</div>` of the component's main return, add:

```jsx
      {/* GC Punch Import Modal */}
      <ImportReviewModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import GC Punch List"
        loadingMessage="Scanning for EBC items..."
        emptyMessage="No items for Eagles Brothers found. Check that the document mentions EBC or your trade scopes."
        parseText={(text) => parseGcPunchList(text, projectItems)}
        onConfirm={handlePunchImport}
        renderItem={(item, i, update) => (
          <div>
            <div className="flex gap-8 mb-4" style={{ alignItems: "center" }}>
              <input className="form-input flex-1 fs-label" value={item.description}
                onChange={(e) => update({ description: e.target.value })} />
            </div>
            <div className="flex gap-8" style={{ alignItems: "center" }}>
              <input className="form-input fs-label" value={item.location} placeholder="Location"
                onChange={(e) => update({ location: e.target.value })}
                style={{ width: 140 }} />
              <select className="form-input fs-label" value={item.priority}
                onChange={(e) => update({ priority: e.target.value })}
                style={{ width: 100 }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {item.isDuplicate && (
                <span className="text-xs" style={{ color: "var(--warning, #f5a623)" }}>
                  <AlertTriangle size={12} /> Possible duplicate
                </span>
              )}
            </div>
          </div>
        )}
      />
```

Add `AlertTriangle` to the lucide-react import.

- [ ] **Step 4: Add `useState` and `useCallback` to React import if not already present**

Check the React import at the top of the file. Ensure `useState`, `useMemo`, and `useCallback` are imported.

- [ ] **Step 5: Verify build compiles**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/tabs/PunchListTab.jsx
git commit -m "feat(C2): integrate GC punch list import into PunchListTab — local parser filters EBC items"
```

---

### Task 7: Integrate C3 — GC Schedule Import into CalendarView

**Files:**
- Modify: `src/tabs/CalendarView.jsx`

- [ ] **Step 1: Add imports and state**

At the top of `src/tabs/CalendarView.jsx`, add:

```javascript
import { ImportReviewModal } from "../components/ImportReviewModal.jsx";
import { parseGcSchedule } from "../utils/gcDocParser.js";
```

Inside the `CalendarView` component, after the existing state declarations, add:

```javascript
  const [showScheduleImport, setShowScheduleImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");
```

Destructure `setSchedule` from `app` alongside the existing destructures:

Verify that `schedule` and `setSchedule` are already destructured from `app`. If `setSchedule` is not yet destructured, add it to the destructuring (line ~100-104).

- [ ] **Step 2: Add the schedule import handler**

Add this handler function inside the component:

```javascript
  const handleScheduleImport = useCallback((selectedItems) => {
    const now = new Date().toISOString();
    const pid = Number(importProjectId) || null;

    // Add to calendarEvents
    const newEvents = selectedItems.map((item) => ({
      id: crypto.randomUUID(),
      type: "gantt",
      title: item.title,
      projectId: pid,
      date: item.date,
      allDay: true,
      startTime: null,
      endTime: null,
      assignedTo: null,
      location: "",
      notes: "Imported from GC schedule",
      status: "scheduled",
      recurrence: null,
      createdAt: now,
      createdBy: "admin",
      audit: [{ action: "imported_from_gc_schedule", at: now, by: "admin" }],
    }));
    setCalendarEvents((prev) => [...prev, ...newEvents]);

    // Also add date-range items to schedule[] (Gantt tasks)
    if (app.setSchedule) {
      const ganttItems = selectedItems
        .filter((item) => item.date && item.endDate && item.date !== item.endDate)
        .map((item) => ({
          id: crypto.randomUUID(),
          projectId: pid,
          task: item.title,
          start: item.date,
          end: item.endDate,
          status: "scheduled",
        }));
      if (ganttItems.length > 0) {
        app.setSchedule((prev) => [...prev, ...ganttItems]);
      }
    }
  }, [importProjectId, setCalendarEvents, app]);
```

- [ ] **Step 3: Add the "Import GC Schedule" button to the sub-tab bar**

In the render section (around line 545), next to the existing "AI Week Plan" button, add the import button. Change:

```jsx
        <button className="btn btn-ghost btn-sm" onClick={() => { showWeekPlan ? setShowWeekPlan(false) : runWeekPlan(); }} disabled={weekPlanLoading}>
          {weekPlanLoading ? "Planning..." : "AI Week Plan"}
        </button>
```

to:

```jsx
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowScheduleImport(true)}>
            <Upload size={14} className="mr-sp1" /> Import GC Schedule
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { showWeekPlan ? setShowWeekPlan(false) : runWeekPlan(); }} disabled={weekPlanLoading}>
            {weekPlanLoading ? "Planning..." : "AI Week Plan"}
          </button>
        </div>
```

Add `Upload` and `AlertTriangle` to the lucide-react import at the top.

- [ ] **Step 4: Add the ImportReviewModal at the bottom of the component's JSX return**

Before the closing `</div>` of the component, add:

```jsx
      {/* GC Schedule Import Modal */}
      <ImportReviewModal
        open={showScheduleImport}
        onClose={() => setShowScheduleImport(false)}
        title="Import GC Schedule"
        loadingMessage="Scanning for EBC schedule items..."
        emptyMessage="No items for Eagles Brothers found. Check that the document mentions EBC or your trade scopes."
        parseText={parseGcSchedule}
        onConfirm={handleScheduleImport}
        projectSelector={
          <div>
            <label className="form-label">Project *</label>
            <select className="form-input" value={importProjectId}
              onChange={(e) => setImportProjectId(e.target.value)}>
              <option value="">-- Select Project --</option>
              {(app.projects || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        }
        renderItem={(item, i, update) => (
          <div>
            <input className="form-input fs-label mb-4" value={item.title}
              onChange={(e) => update({ title: e.target.value })}
              style={{ width: "100%" }} />
            <div className="flex gap-8" style={{ alignItems: "center" }}>
              <div className="flex gap-4" style={{ alignItems: "center" }}>
                <span className="text-xs" style={{ opacity: 0.5 }}>Start:</span>
                <input type="date" className="form-input fs-label" value={item.date}
                  onChange={(e) => update({ date: e.target.value })}
                  style={{ width: 140 }} />
              </div>
              {item.date !== item.endDate && (
                <div className="flex gap-4" style={{ alignItems: "center" }}>
                  <span className="text-xs" style={{ opacity: 0.5 }}>End:</span>
                  <input type="date" className="form-input fs-label" value={item.endDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                    style={{ width: 140 }} />
                </div>
              )}
              {item.dateWarning && (
                <span className="text-xs" style={{ color: "var(--warning, #f5a623)" }}>
                  <AlertTriangle size={12} /> {item.dateWarning}
                </span>
              )}
            </div>
          </div>
        )}
      />
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run build 2>&1 | tail -5`
Expected: build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/tabs/CalendarView.jsx
git commit -m "feat(C3): integrate GC schedule import into CalendarView — local parser with date extraction and EBC filtering"
```

---

### Task 8: Build Verification and Final Commit

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: no errors

- [ ] **Step 2: Run tests (if any exist)**

Run: `npm test 2>&1 || echo "No tests configured"`

- [ ] **Step 3: Verify all new files exist**

Run:
```bash
ls src/utils/proposalImporter.js src/utils/gcDocParser.js src/components/ImportReviewModal.jsx
```
Expected: all three files listed

- [ ] **Step 4: Verify git status is clean**

Run: `git status`
Expected: nothing to commit, working tree clean

---

## Summary of Changes

| File | Type | Purpose |
|------|------|---------|
| `src/utils/proposalImporter.js` | New | C1: AI proposal parser via Claude API |
| `src/utils/gcDocParser.js` | New | C2+C3: Local heuristic parsers + EBC keyword dict |
| `src/components/ImportReviewModal.jsx` | New | C2+C3: Shared review modal with paste/upload |
| `src/tabs/Estimating.jsx` | Modified | C1: "Import from PDF" button in QuickProposalModal |
| `src/tabs/PunchListTab.jsx` | Modified | C2: "Import GC Punch" button + modal |
| `src/tabs/CalendarView.jsx` | Modified | C3: "Import GC Schedule" button + modal |
