# Phase B — Submittal Library + Project-Level RFI/Submittal Access

**Date:** 2026-04-14  
**Status:** Approved  
**Effort:** ~3 hours  
**Impact:** Eliminates re-entry of the same materials across projects

---

## B1 — Submittal Library (More → Submittal Library)

### Data Model

New `submittalLibrary` array in app state, persisted to localStorage alongside existing data.

```
{
  id: string,
  itemName: string,
  manufacturer: string,
  specModel: string,
  category: string,
  specSection: string,
  type: "product data" | "sample" | "shop drawings" | "calculations",
  lastUsedDate: string | null,
  lastUsedProject: string | null,
  approvalStatus: "approved" | "pending" | "not submitted",
  notes: string,
  createdAt: string
}
```

### Categories

Matching EBC's actual scope:
- Framing
- Drywall/Gypsum
- Acoustical Ceilings
- Insulation
- Doors/Frames
- Sheathing
- Specialty (lead-lined, cement board, etc.)
- Accessories (joint compound, tape, etc.)

### UI

New file: `src/tabs/more/SubmittalLibraryTab.jsx`

- Registered as its own item under More (alongside Documents, Calendar, etc.)
- Searchable table filtering across name, manufacturer, spec, category
- Category filter dropdown
- Status badges: green = approved, amber = pending, ghost = not submitted
- Add / edit / delete actions
- "Last Used" column showing project name + date (auto-updated when used)

### Seed Data

Auto-generate initial library from the 12 existing submittals tagged "Available in EBC submittal library" in constants.js. These become the starting catalog. Items:
- USG Sheetrock Firecode X
- Sheetrock Mold Tough Firecode X
- Knauf EcoBatt Insulation (R-8, R-11, R-19)
- Armstrong Prelude XL Grid System
- ToughRock Fireguard X Mold Guard
- DensShield Tile Backer
- USG Durock Cement Board
- DensGlass Gold Exterior Sheathing
- Owens Corning Thermal Batt Insulation

---

## B2 — Library-to-Project Linking (Multi-Select + Auto-Populate)

### Location

Inside the project detail modal, on the combined "RFIs & Submittals" tab (B3). A `+ Add from Library` button alongside the existing `+ Add Submittal` button.

### Flow

1. Click `+ Add from Library` → modal overlay with full library catalog (searchable, filterable by category)
2. Checkbox multi-select — pick as many items as needed
3. Click `Add Selected (N)` → system creates N project submittals, each auto-populated:
   - **From library item:** itemName → description, manufacturer, specSection, specModel, type
   - **From project record:** GC contact → distributedBy, project name (for reference)
   - **Auto-generated:** dateSubmitted = today, status = "submitted", number = next sequential for that project
4. User sees confirmation summary — can click into any individual submittal to edit
5. Library item's `lastUsedDate` and `lastUsedProject` auto-update

### Manual Entry Prompt

The existing `+ Add Submittal` (manual entry) stays for one-off items not in the library. When saving a manual submittal, prompt: "Add to Submittal Library for future use?" with one-click yes/no.

### Numbering Convention

Auto-detect the project's existing pattern from prior submittals:
- If project has `MH7-001` style → continues as `MH7-011`, `MH7-012`, etc.
- If project has `09 21 16-1.0` style → continues that pattern
- Fallback for new projects with no existing submittals: `SUB-001`

---

## B3 — Surface RFIs + Submittals in Project View

### Change 1: Overview Tab — Status Strip

A compact summary card at the top of the project overview tab, below the project header info (contract, progress, etc.):

```
┌──────────────────────────────────────────────┐
│  📋 3 RFIs open  ·  📦 2 submittals pending  │
└──────────────────────────────────────────────┘
```

- Counts live-computed from `app.rfis` and `app.submittals` filtered to that project
- "Open" = RFIs with status `open`. "Pending" = submittals with status `submitted`
- Each count is clickable — jumps to RFIs & Submittals tab with relevant sub-tab pre-selected
- If all zeros: `All RFIs answered · All submittals resolved` in muted text

### Change 2: Combine Tabs → "RFIs & Submittals"

- Remove separate "submittals" and "rfis" tabs from the project tab bar
- Replace with single `RFIs & Submittals` tab with badge count of open/pending items
- Inside: SubTabs toggle between RFIs and Submittals (reusing existing SubTabs pattern)
- The `+ Add from Library` button (B2) lives in the submittals sub-section
- Tab count: 14 → 13

### No Changes to More → Documents

The existing More → Documents stays as the cross-project admin view. The project modal is the project-scoped view.

---

## Files Changed

| File | Change |
|------|--------|
| `src/data/constants.js` | Add `_demoSubmittalLibrary` seed data, `SUBMITTAL_CATEGORIES` constant, `initSubmittalLibrary()` |
| `src/App.jsx` | Add `submittalLibrary` state + setter, register "Submittal Library" in More tabs |
| `src/tabs/more/SubmittalLibraryTab.jsx` | **New file** — master catalog UI |
| `src/components/ModalHub.jsx` | Merge submittals + rfis tabs into one, add status strip to overview, add "Add from Library" button + picker modal |

## Architecture Notes

- No new dependencies — uses existing patterns (SubTabs, badge classes, form-grid, localStorage persistence)
- Library is company-wide state, not project-scoped
- Follows existing data patterns: `app.submittalLibrary` / `app.setSubmittalLibrary` via `useSyncedState`
