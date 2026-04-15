# Phase C — Document Import (Proposal PDF + GC Punch + GC Schedule)

**Date:** 2026-04-14
**Effort:** ~5 hours
**Impact:** Eliminates manual data re-entry from existing PDFs and emails

---

## Overview

Three import features that follow the same pattern: take an existing document (PDF or pasted text), extract structured data, filter for EBC-relevant content, let the PM review, then populate existing app features.

| ID | Feature | Input | Parser | Output |
|----|---------|-------|--------|--------|
| C1 | Proposal PDF Import | PDF upload | Claude API (online) | QuickProposalModal fields |
| C2 | GC Punch Import | Paste text or PDF | Local heuristic (offline) | Punch list entries |
| C3 | GC Schedule Import | Paste text or PDF | Local heuristic (offline) | Calendar events |

---

## Shared Infrastructure

### PDF Text Extraction

Reuse existing `pdfjs-dist` dependency. New utility function:

```
extractPdfText(file: File) → Promise<string>
```

Same pattern as `pdfBidExtractor.js` and `planAnalyzer.js` — load PDF, iterate pages, extract text with Y-coordinate grouping for multi-column layouts.

**Location:** `src/utils/pdfTextExtractor.js` (shared by all three features)

### EBC Trade Keyword Dictionary

Constant array used by C2 and C3 to filter GC documents for EBC-relevant items:

```javascript
const EBC_TRADE_KEYWORDS = [
  "eagles brothers", "ebc",
  "drywall", "framing", "act", "ceiling", "partition",
  "wall", "tape", "mud", "finish", "hang", "demo",
  "buildback", "shaft wall", "soffit", "bulkhead",
  "metal stud", "gyp board", "gypsum", "sheetrock"
];
```

**Location:** `src/utils/gcDocParser.js`

### Import Review Modal Pattern

C2 and C3 share a common UI pattern — a modal with:
- Two input tabs (Paste / Upload PDF)
- Loading state with progress message
- Review checklist of parsed items (checkbox + editable fields)
- Count badge ("Found X EBC items out of Y total")
- "Import N Items" confirm button

This can be a shared component: `ImportReviewModal`.

**Location:** `src/components/ImportReviewModal.jsx`

---

## C1 — Proposal PDF Import

### Entry Point

"Import from PDF" button at the top of `QuickProposalModal` in `src/tabs/Estimating.jsx`, before the form fields. Secondary/outline style with Upload icon.

### Pipeline

1. **File Input** → user selects a `.pdf` file
2. **PDF → Text** → `extractPdfText(file)` via pdfjs-dist
3. **Text → Structured Data** → `parseProposalWithAI(apiKey, text)` via `callClaude()`
4. **Structured Data → Form** → populate QuickProposalModal state

### AI Prompt

System prompt instructs Claude to return strict JSON:

```json
{
  "projectName": "string",
  "projectAddress": "string | null",
  "gcName": "string",
  "lineItems": [{"description": "string", "amount": number}],
  "alternates": [{"description": "string", "type": "add|deduct", "amount": number}],
  "includes": ["string"],
  "excludes": ["string"],
  "notes": "string | null"
}
```

Prompt includes EBC-specific context:
- Trade scope sections: Demo, Buildback, ACT, Framing, Drywall, Taping/Finishing
- Typical proposal structure: header → scope sections → alternates → inclusions/exclusions → total
- Handle missing fields gracefully (empty arrays, null)

### New Files

- `src/utils/proposalImporter.js` — `parseProposalWithAI(apiKey, rawText)` function

### Modified Files

- `src/tabs/Estimating.jsx` — Add "Import from PDF" button + file input + loading state in `QuickProposalModal`

### UX Flow

1. User clicks "Import from PDF" → file picker opens
2. Spinner: "Extracting proposal data..."
3. Form fields auto-populate
4. User reviews, edits, proceeds with normal export/email/print

### Error Handling

- No API key → toast "Set API key in Settings first"
- PDF unreadable → toast "Could not read PDF — try a different file"
- AI parse fails → toast "Could not parse proposal — fill in details manually"
- Partial extraction → populate what was found, leave rest blank

---

## C2 — GC Punch List Import

### Entry Point

"Import GC Punch" button in `PunchListTab` header area. PM-facing only (not on foreman `PunchTab`).

### Pipeline

1. **Input** → Paste text area OR upload PDF
2. **PDF → Text** (if PDF) → `extractPdfText(file)`
3. **Text → Parsed Items** → `parseGcPunchList(text)` — 100% local, no network
4. **Review UI** → checklist of draft items
5. **Confirm** → create punch entries for active project

### Local Parser: `parseGcPunchList(text)`

**Step 1 — Line Splitting:**
- Split by newlines
- Detect numbered items: `1.`, `1)`, `#1`, `Item 1:`
- Detect bullets: `-`, `*`, `•`
- Detect table rows (tab-separated or fixed-width columns)
- Merge continuation lines (indented lines that follow a numbered item)

**Step 2 — EBC Filtering:**
- Scan each item against `EBC_TRADE_KEYWORDS`
- Keep items that match at least one keyword
- Also keep items explicitly assigned to "Eagles Brothers" or "EBC"
- Skip items clearly for other trades (plumbing, electrical, HVAC, mechanical, fire protection, painting unless EBC does it)

**Step 3 — Field Extraction:**
- `description`: main text of the item (cleaned up, trimmed)
- `location`: regex for room/floor/area patterns
  - Patterns: `Room \d+`, `Rm \d+`, `Floor \d+`, `FL \d+`, `Area [A-Z]`, `Suite \d+`, `Level \d+`
  - Also detect freeform location after `@`, `at`, `in`, `—` delimiters
- `priority`: keyword mapping
  - High: "urgent", "ASAP", "critical", "immediate", "safety"
  - Low: "minor", "cosmetic", "when possible", "low priority"
  - Medium: everything else (default)

**Step 4 — Deduplication:**
- Normalize descriptions (lowercase, trim whitespace, strip punctuation)
- Compare against existing punch items for the project
- Flag potential duplicates in the review UI (don't auto-exclude)

### Output Schema

Each parsed item:
```javascript
{
  description: string,
  location: string,      // empty string if not detected
  priority: "high" | "medium" | "low",
  selected: true,        // for review checkbox (default checked)
  isDuplicate: boolean,  // flag if similar to existing item
}
```

On confirm, each selected item becomes:
```javascript
{
  id: crypto.randomUUID(),
  projectId: activeProjectId,
  description: item.description,
  location: item.location,
  assignedTo: null,
  priority: item.priority,
  status: "open",
  photos: [],
  createdAt: new Date().toISOString(),
  completedAt: null,
}
```

### New Files

- `src/utils/gcDocParser.js` — `parseGcPunchList(text)`, `EBC_TRADE_KEYWORDS`, shared helpers
- `src/components/ImportReviewModal.jsx` — shared review modal (used by C2 and C3)

### Modified Files

- `src/tabs/PunchListTab.jsx` — Add "Import GC Punch" button + import modal integration

### UX Flow

1. PM clicks "Import GC Punch" → modal opens
2. Choose Paste tab or Upload tab, provide content
3. Spinner: "Scanning for EBC items..."
4. Review list appears: "Found 8 EBC items out of 47 total"
5. PM adjusts, unchecks, edits descriptions/locations/priorities
6. Duplicates flagged with warning badge
7. Clicks "Import 8 Items" → entries created
8. Modal closes, punch list refreshes

### Edge Cases

- Zero EBC items found → "No items for Eagles Brothers found. Check that the document mentions EBC or your trade scopes."
- Unstructured text (no lists/numbers) → "Could not parse this format. Try pasting items as a numbered list."
- Very long document (>500 items) → process all, but warn "Large document — review may take a moment"

---

## C3 — GC Schedule Import

### Entry Point

"Import GC Schedule" button in `CalendarView` header area. Same button style as C2.

### Pipeline

1. **Input** → Paste text area OR upload PDF
2. **PDF → Text** (if PDF) → `extractPdfText(file)`
3. **Text → Parsed Items** → `parseGcSchedule(text)` — 100% local
4. **Review UI** → checklist of draft schedule items
5. **Confirm** → create calendar events for selected project

### Local Parser: `parseGcSchedule(text)`

**Step 1 — Line/Row Splitting:**
- Same as C2: numbered lists, bullets, table rows
- Additionally detect date-prefixed lines: `3/15 - Hang drywall 2nd floor`

**Step 2 — EBC Filtering:**
- Same `EBC_TRADE_KEYWORDS` dictionary as C2
- Same filtering logic

**Step 3 — Field Extraction:**
- `title`: task description
- `date` (start): parsed from text
  - Regex patterns: `MM/DD/YY`, `MM/DD/YYYY`, `YYYY-MM-DD`, `Month DD`, `Mon DD`
- `endDate`: parsed if range given
  - Range patterns: `3/15 - 3/22`, `March 15 through March 22`, `3/15-22` (same month shorthand)
  - If no range detected, `endDate = date` (single-day event)
- `projectId`: selected by PM in a dropdown at the top of the modal (required before import)

**Step 4 — Date Validation:**
- Reject dates more than 1 year in the past
- Flag dates more than 1 year in the future as warnings
- Flag ranges longer than 90 days as suspicious

### Output Schema

Each parsed item:
```javascript
{
  title: string,
  date: "YYYY-MM-DD",
  endDate: "YYYY-MM-DD",
  selected: true,
  dateWarning: string | null,  // e.g., "Date is in the past"
}
```

On confirm, each selected item becomes a `calendarEvent`:
```javascript
{
  id: crypto.randomUUID(),
  type: "gantt",
  title: item.title,
  projectId: selectedProjectId,
  date: item.date,
  allDay: true,
  startTime: null,
  endTime: null,
  assignedTo: null,
  location: "",
  notes: "Imported from GC schedule",
  status: "scheduled",
  recurrence: null,
  createdAt: new Date().toISOString(),
  createdBy: "admin",
  audit: [{ action: "imported_from_gc_schedule", at: new Date().toISOString(), by: "admin" }],
}
```

For items with date ranges (start ≠ end), also add to `schedule[]` (Gantt tasks):
```javascript
{
  id: crypto.randomUUID(),
  projectId: selectedProjectId,
  task: item.title,
  start: item.date,
  end: item.endDate,
  status: "scheduled",
}
```

### New Files

- `src/utils/gcDocParser.js` — add `parseGcSchedule(text)` alongside `parseGcPunchList(text)`

### Modified Files

- `src/tabs/CalendarView.jsx` — Add "Import GC Schedule" button + import modal integration

### UX Flow

1. PM clicks "Import GC Schedule" → modal opens
2. PM selects project from dropdown (required)
3. Choose Paste or Upload, provide content
4. Spinner: "Scanning for EBC schedule items..."
5. Review list: "Found 6 EBC tasks out of 34 total"
6. Date warnings shown inline (past dates, long ranges)
7. PM adjusts titles, dates, unchecks irrelevant items
8. Clicks "Import 6 Items" → calendar events created
9. Modal closes, calendar refreshes

### Edge Cases

- No dates detected in any items → "Could not find dates in this schedule. Make sure dates are included (e.g., 3/15/2026)."
- Zero EBC items found → same message as C2
- Ambiguous dates (e.g., "15/3" — US vs EU format) → assume US format (MM/DD), flag if ambiguous

---

## File Summary

### New Files (4)

| File | Purpose |
|------|---------|
| `src/utils/pdfTextExtractor.js` | Shared PDF → text extraction via pdfjs-dist |
| `src/utils/proposalImporter.js` | C1: AI-powered proposal parsing via Claude API |
| `src/utils/gcDocParser.js` | C2+C3: Local heuristic parsers + EBC keyword dictionary |
| `src/components/ImportReviewModal.jsx` | C2+C3: Shared review modal with paste/upload tabs |

### Modified Files (3)

| File | Changes |
|------|---------|
| `src/tabs/Estimating.jsx` | C1: "Import from PDF" button + file input in QuickProposalModal |
| `src/tabs/PunchListTab.jsx` | C2: "Import GC Punch" button + import modal |
| `src/tabs/CalendarView.jsx` | C3: "Import GC Schedule" button + import modal |

### Dependencies

- `pdfjs-dist` — already installed, no new deps needed
- `callClaude()` from `src/utils/api.js` — already exists, used by C1 only
- No new npm packages required

---

## Testing Strategy

### C1 — Proposal Import
- Upload a real EBC proposal PDF → verify all fields populate correctly
- Upload a non-proposal PDF → verify graceful error message
- Upload with no API key set → verify toast message
- Verify partial extraction fills what it can, leaves rest blank

### C2 — GC Punch Import
- Paste a numbered punch list with mixed trades → verify only EBC items appear
- Paste text with no EBC items → verify "no items found" message
- Upload a Procore-style punch PDF → verify parsing handles table format
- Import items, then re-import same list → verify duplicates are flagged
- Test offline (no network) → verify everything still works

### C3 — GC Schedule Import
- Paste a schedule with dates in various formats → verify date parsing
- Paste schedule with date ranges → verify start/end dates populate
- Upload schedule PDF with mixed trades → verify EBC filtering
- Import items → verify they appear on calendar and in Gantt view
- Test with past dates → verify warning shown
