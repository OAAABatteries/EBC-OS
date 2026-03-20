# EBC-OS vs OST — Complete Feature Matrix & Gap Analysis

## Feature Status Legend
- **DONE** = Fully implemented and working
- **PARTIAL** = Started but incomplete or buggy
- **MISSING** = Not built yet
- **BETTER** = We already exceed OST here
- **N/A** = Not applicable to our use case
- **EXCEL** = Opportunity to beat OST with AI/automation

---

## 1. PROJECT & PLAN MANAGEMENT

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Cover Sheet project setup | Project Name, Job No, Estimator, Bid Date, Notes | Takeoff has name + bidId link | PARTIAL | Missing dedicated setup dialog |
| Plan Organizer table | Sheet No, Sheet Name, Page Size, Scale, Image File, Show | Page dropdown + sheet sidebar | PARTIAL | No page size, no "Show" toggle per sheet |
| Upload all PDFs first | Upload → Auto Name → Review → OK → Takeoff | Open Drawing = temp file picker | PARTIAL | IDB persistence added, but flow is backwards |
| PDF stored to project | Permanently saved, accessible across sessions | IndexedDB cache (browser-only) | PARTIAL | Need Supabase Storage for cross-device |
| Page navigation dropdown | Shows all pages + folders, blue icon = has takeoff, green = complete | Dropdown with auto-named pages | PARTIAL | Missing takeoff/complete indicators |
| Page folders | Organize pages into folders in navigator | Not implemented | MISSING | |
| Mark Takeoff Complete | Green check in page navigator | Not implemented | MISSING | Simple but high-value |
| Back/Forward page history | Browser-style history for viewed pages | Not implemented | MISSING | Low priority |
| Rename Page | Edit > Rename Page | Double-click to rename in sidebar | DONE | |
| Add new blank page | From last page via option | Not implemented | MISSING | Low priority |

## 2. MEASUREMENT TOOLS & DRAWING

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Linear measurement | Full LF + optional height/thickness/slope | LF + height multiplier | DONE | Missing thickness, slope |
| Area measurement | SF via polygon, shoelace formula | SF via polygon, shoelace formula | DONE | |
| Count measurement | EA placement, attach to linear/area | EA placement, standalone | DONE | Missing attachment to parent |
| Attachment conditions | Linear Attachments (doors/windows) subtract from parent | Not implemented | MISSING | **Critical gap** |
| Backout mode | Cut holes in area measurements | Not implemented | MISSING | Important for ceiling openings |
| Curved segments | Set as Curved Segment, bend into arc | Not implemented | MISSING | Nice-to-have |
| 15° angle snapping | Default ON, Shift = temporary override | Default ON, Shift = free trace | DONE | |
| Right-angle indicator | Visual 90° indicator while drawing | Angle badge shows degrees | DONE | Could add specific 90° emphasis |
| Continuous mode | Keep drawing after finishing a segment | Not implemented | MISSING | Big time-saver |
| Double-click finish | Standard | Debounced (200ms), prevents extra vertices | DONE | |
| Finish button | N/A | Floating "Finish" button visible while drawing | BETTER | OST doesn't have this |
| Enter to finish | Standard | Implemented | DONE | |
| Snap to Linear (area auto-fill) | Dbl-click enclosed space → fills with area condition | Not implemented | MISSING | **Killer feature** |
| Snap to Linear settings | Inner Edge / Center / Outer Edge + Tolerance | Not implemented | MISSING | |
| Grid/Tile/Gap for areas | ACT grid, brick, carpet seams | Not implemented | MISSING | Important for ceiling tile |
| Display Pattern While Drawing | Suppress fill during draw | Not implemented | MISSING | Performance feature |
| Display Dimension label | Label in center of each area object | Shows qty on canvas for completed measurements | PARTIAL | |
| Display Name label | Condition name next to each object (9 char limit) | Not implemented | MISSING | |
| Full-window crosshairs | Configurable color/thickness | Not implemented | MISSING | Nice-to-have |

## 3. EDITING & MANIPULATION

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Select tool | Spacebar toggle with Takeoff tool | Space toggles Pan | PARTIAL | Different paradigm |
| Resize handles | Linear: both ends, Area: each corner | Not implemented | MISSING | |
| Split segment/area | Split a linear or area in two | Not implemented | MISSING | |
| Add/remove joints | Add/remove vertices from area object | Not implemented | MISSING | |
| Copy/Move | Copy or move takeoff objects | Not implemented | MISSING | |
| Rotate/Spin | Rotate takeoff objects | Not implemented | MISSING | |
| Reassign condition | Right-click → reassign to different condition | Right-click → change condition | DONE | |
| Nudge with arrow keys | Selected objects, arrow key movement | Not implemented | MISSING | |
| Undo | Limited: only takeoff/annotations, until page nav | Ctrl+Z, undo stack per session | PARTIAL | No redo (Ctrl+Y) |
| Delete measurement | Right-click context menu | Right-click context menu | DONE | |

## 4. CONDITIONS SYSTEM

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Linear conditions | Height, Thickness, Slope, Appearance | Height, Color, Assembly link | PARTIAL | Missing thickness/slope |
| Area conditions | Round Qty, Grid/Tile/Gap, Snap to Linear | Basic polygon measurement | PARTIAL | Missing grid, snap |
| Count conditions | EA, can attach to parent objects | EA standalone only | PARTIAL | Missing attachment |
| Attachment conditions | Linear Attachments (doors), Area Attachments (lights) | Not implemented | MISSING | **Major gap** |
| Condition styles/library | System styles + custom style library | Trade templates (Medical, Commercial, Retail) | PARTIAL | Templates exist but no persistent library |
| Create from style | Insert key, style picker with type-ahead | Add condition from assembly dropdown | DONE | |
| Folder organization | User-defined folders | Auto-folders: Walls, Ceilings, Counts, etc. | DONE | |
| Color/Pattern per condition | Color + fill pattern | Color only (auto-assigned) | PARTIAL | Missing patterns |
| Condition context menus | Right-click: many options | Right-click: delete, select objects | PARTIAL | |
| Condition search | Type-ahead in style picker | Search box (when 8+ conditions) | DONE | |
| Multi-Condition Takeoff | Draw once → multiple conditions auto-created | condLinks: draw linear → auto-create linked SF/LF | DONE | |

## 5. LAYERS & VISIBILITY

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Layer system | Full layer management, assign conditions to layers | Folder visibility toggle (hide/show per folder) | PARTIAL | Folders act as basic layers |
| Layer window | Dockable, toggleable | Integrated in conditions panel | DONE | |
| Image Legend | Toggle, Reset Legend | Not implemented | MISSING | |
| Typical Group layer hiding | Hides markers + all takeoff in group | Not implemented | MISSING | |

## 6. BID AREAS & ZONES

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Bid Areas | Assign entire object to one area | Bid area selector + assignment | DONE | |
| Zones | Split takeoff across zone boundaries | Not implemented | MISSING | Bid areas cover 90% of use cases |
| Area drop-down bold indicators | Bold = has takeoff | Not implemented | MISSING | Small but useful |
| Assign before drawing | Select bid area → new objects auto-assigned | Active bid area selector in toolbar | DONE | |

## 7. TYPICAL GROUPS & REPEATING WORK

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Create Typical Group | Select → name → save | Shift+click select → Create → name | DONE | |
| Place instances | Marker on other pages/areas | Click to place with offset | DONE | |
| Multiplier per instance | Yes | Yes (0.1 step input) | DONE | |
| Typical Group properties | Name, layer, marker appearance, height, color/pattern/shape | Name, source measurements, instances | PARTIAL | Missing marker customization |
| Marker width | Adjustable | Not implemented | MISSING | Minor |
| Typical Areas | Separate from Typical Groups | Not implemented | MISSING | |
| Repeating Pages | Apply same takeoff to multiple identical pages | Not implemented | MISSING | |

## 8. OVERLAYS & CHANGE ORDERS

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Overlay image | Align, remove, show original/overlay, convert to TIFF | Upload revision PDF, opacity slider, toggle | PARTIAL | Missing alignment tools |
| CO mode (additions) | Track additions | CO+ mode, green overlay | DONE | |
| CO mode (deletions) | Track deletions | CO- mode, red overlay | DONE | |
| Net delta calculation | Yes | CO summary with +Added, -Deleted, Net | DONE | |
| Revision audit trail | Yes | Not implemented | MISSING | |

## 9. SUMMARY & REPORTING

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Summary tab | Full grouped quantity table | Summary view with grouping | DONE | |
| Group by Condition | Yes | Yes | DONE | |
| Group by Bid Area | Yes | Yes | DONE | |
| Group by Page/Sheet | Yes | Yes | DONE | |
| Group by Folder | Yes | Yes | DONE | |
| Export to Excel | Yes | Multi-sheet Excel workbook | DONE | |
| Context menus on summary | Condition info + quantity cells | Not implemented | MISSING | |
| Expand/collapse groups | Yes | Flat table (no nesting) | MISSING | |

## 10. ANNOTATIONS

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Dimension tool | Yes | Not implemented | MISSING | |
| Text annotation | Yes | Not implemented | MISSING | |
| Highlight | Yes | Not implemented | MISSING | |
| Callout | Yes | Not implemented | MISSING | |
| Arrow / Line | Yes | Not implemented | MISSING | |
| Rectangle / Oval / Cloud | Yes | Not implemented | MISSING | |
| Polygon / Ink (freehand) | Yes | Not implemented | MISSING | |
| Hot Link | Links to external files | Not implemented | MISSING | |
| Named View | Bookmark zoom/location | Not implemented | MISSING | |

## 11. TOOLBARS & UI

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Dockable toolbars | Move, redock, multi-monitor | Fixed toolbar layout | MISSING | Web app limitation |
| Toolbar customization | Toggle on/off per toolbar | Not implemented | MISSING | |
| Magnify tool | Inspect detail without changing zoom | Not implemented | MISSING | Useful |
| Pan window | Minimap/overview | Not implemented | MISSING | |
| Status bar | Bottom info bar | Not implemented | MISSING | |

## 12. AI & AUTOMATION (EBC-OS ADVANTAGE)

| Feature | OST | EBC-OS | Status | Notes |
|---------|-----|--------|--------|-------|
| Takeoff Boost | AI wall/area/count detection (limited runs) | Not implemented | MISSING | Future priority |
| Auto Name pages | Built-in | Multi-region scored V2 + index parsing | DONE | |
| Auto scale detection | Not explicitly documented | Detects scale text in title blocks | DONE | |
| Profit suggestions | N/A (no pricing in OST) | Auto-suggest corner bead, control joints, blocking, etc. | BETTER | **Our advantage** |
| Live costing during takeoff | N/A (OST = QuickBid separate) | Per-condition cost in sidebar, grand total | BETTER | **Our advantage** |
| Assembly-based pricing | Separate QuickBid product | Built into conditions panel | BETTER | **Our advantage** |
| Scope gap analysis | N/A | AI-powered bid vs contract comparison | BETTER | **Our advantage** |
| Bid PDF scanning | N/A | Extract line items from bid PDF, auto-map assemblies | BETTER | **Our advantage** |
| OST CSV import | N/A (they ARE OST) | Import OST takeoff CSV, map to assemblies | BETTER | **Migration path** |
| Proposal PDF generation | N/A | Full proposal with pricing, terms, submittals | BETTER | **Our advantage** |

---

## SCORECARD

| Category | OST Features | EBC-OS Done | EBC-OS Partial | EBC-OS Missing | EBC-OS Better |
|----------|-------------|-------------|----------------|----------------|---------------|
| Project/Plan Mgmt | 10 | 1 | 4 | 5 | 0 |
| Measurement Tools | 18 | 6 | 2 | 10 | 1 |
| Editing/Manipulation | 10 | 2 | 2 | 6 | 0 |
| Conditions System | 11 | 3 | 5 | 3 | 0 |
| Layers/Visibility | 4 | 1 | 1 | 2 | 0 |
| Bid Areas/Zones | 4 | 2 | 0 | 2 | 0 |
| Typical Groups | 7 | 3 | 1 | 3 | 0 |
| Overlays/CO | 5 | 3 | 1 | 1 | 0 |
| Summary/Reporting | 7 | 5 | 0 | 2 | 0 |
| Annotations | 9 | 0 | 0 | 9 | 0 |
| Toolbars/UI | 5 | 0 | 0 | 5 | 0 |
| AI/Automation | 2 | 2 | 0 | 0 | 6 |
| **TOTAL** | **92** | **28 (30%)** | **16 (17%)** | **48 (52%)** | **7** |

**We have 30% of OST's features fully done, 17% partially done, and 52% missing.**
**But we have 7 features that BEAT OST** — all in pricing, AI, and workflow automation.

---

## STRATEGIC ANALYSIS

### Where We're Stronger Than OST
1. **Integrated pricing** — OST needs QuickBid ($$$) separately. We have assembly-based costing built in.
2. **Live cost during takeoff** — See dollar amounts update as you measure. OST can't do this.
3. **Profit suggestions** — Auto-catch missed items (corner bead, blocking, fire caulking). OST has nothing like this.
4. **Scope gap analysis** — AI-powered bid vs contract comparison. Unique to us.
5. **Proposal generation** — Go from takeoff → PDF proposal in 2 clicks. OST has no proposal engine.
6. **OST import** — We can import their data. Migration path from competitor.
7. **Bid PDF scanning** — Extract line items from bid PDFs automatically.

### Where We're Weakest (Must Fix)
1. **Attachment conditions** — Doors/windows that subtract from wall area. Core estimating need.
2. **Snap to Linear / Area auto-fill** — Double-click enclosed room to auto-fill. Massive time saver.
3. **Continuous mode** — Keep drawing without re-clicking the tool. Speed multiplier.
4. **Backout mode** — Cut holes in area measurements. Required for ceilings with openings.
5. **Plan management** — OST's Cover Sheet flow is still better than our temp file picker.
6. **Editing** — Can't resize, move, split, or copy measurements. OST can.

### What We Should Skip (Low ROI)
1. **Full annotation suite** — Text, callout, arrow, cloud, etc. (use PDF markup tools instead)
2. **Dockable toolbars / multi-monitor** — Web app doesn't need this
3. **Page folders** — Overkill for our users
4. **Full-window crosshairs** — Minor preference
5. **Zones** — Bid areas cover 95% of use cases
6. **TIFF conversion** — Legacy format support
