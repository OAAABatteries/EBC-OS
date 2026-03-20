# EBC-OS Takeoff Module — Phased Build Roadmap V2

**Last updated:** 2026-03-19
**Based on:** Full OST reverse-engineering analysis + real-world testing

---

## Current State

**What's done (30% of OST parity):**
- 5 modes: Pan, Calibrate, Linear, Area, Count
- Conditions panel with folders, color-coding, assembly links
- Multi-condition takeoff (draw wall → auto-create linked SF/LF)
- Bid areas with assignment during takeoff
- Typical groups with multiplier instances
- Change order overlay (additions/deletions, net delta)
- Summary view with 4 grouping modes + Excel export
- Multi-PDF support, IDB persistence, Auto Name V2
- Angle snapping (15°), debounced dblclick finish, Enter/Finish button
- Trade templates (Medical, Commercial, Retail)
- Live costing in conditions panel
- OST CSV import, Bid PDF scanning, Proposal generation

**What makes us BETTER than OST already:**
- Integrated pricing (OST needs $2,000+ QuickBid addon)
- Live dollar amounts during takeoff
- Profit suggestions (catch missed items)
- AI scope gap analysis
- One-click proposal PDF
- OST migration import path

---

## Phase 4A: Drawing Engine Polish (1-2 sessions)

**Goal:** An estimator can efficiently draw takeoff without fighting the tool.

### Sprint 1: Continuous Mode + Editing Basics
- [ ] **Continuous mode** — after finishing a measurement, immediately start the next one without re-selecting the tool. Toggle in toolbar ("C" badge on mode button). This is the single biggest speed improvement we can make.
- [ ] **Redo** (Ctrl+Y) — complement to existing Ctrl+Z undo
- [ ] **Resize handles** — drag endpoints of linear measurements, drag corners of area measurements to adjust
- [ ] **Nudge with arrow keys** — select measurement, arrow keys move it 1px (Shift+arrow = 10px)
- [ ] **Mark Takeoff Complete** — checkbox per page in navigator. Green dot indicator. Simple but high-value for tracking progress.

### Sprint 2: Measurement Visibility & Labels
- [ ] **Display condition name** on each measurement (toggleable, truncated to ~12 chars)
- [ ] **Display dimension** — show LF/SF value label centered on each completed measurement
- [ ] **Page indicators in dropdown** — blue dot = has measurements, green check = marked complete
- [ ] **Right-angle indicator** — special visual emphasis when snapping to exactly 90°
- [ ] **Hover tooltip** on measurements: condition name, qty, cost, bid area

**Deliverable:** Drawing feels smooth and fast. Estimator stays in flow.

---

## Phase 4B: Attachment Conditions & Backouts (1-2 sessions)

**Goal:** Handle the real-world stuff — doors in walls, HVAC openings in ceilings.

### Sprint 3: Attachment Conditions
- [ ] **Linear Attachments** — new condition type for doors, windows, openings
  - Click existing linear measurement to attach
  - Specify width (e.g., 3' door)
  - Auto-subtracts from parent wall LF and SF
  - Visual marker on linear measurement showing attachment position
  - Count automatically (each attachment = 1 EA)
- [ ] **Area Attachments** — new condition type for lights, diffusers, vents
  - Click existing area measurement to attach
  - Specify dimensions (e.g., 2'x4' light fixture)
  - Auto-subtracts from parent ceiling SF
  - Count automatically

### Sprint 4: Backout Mode + Area Advanced
- [ ] **Backout mode** — draw a polygon inside an existing area measurement to cut a hole
  - Backout area subtracted from parent SF
  - Visual: dashed outline inside parent
  - Backout listed in summary as negative qty
- [ ] **Grid/Tile mode** for area conditions — configure tile size + gap
  - ACT ceiling grid: 2'x4' tiles, preview grid pattern on area
  - Calculate: tile count, grid runner LF, cross-tee LF
  - Brick layout: specify brick + mortar gap
- [ ] **Round Quantity** option per condition — round up to nearest whole unit (e.g., sheets of drywall)

**Deliverable:** Can handle doors-in-walls and ceiling-openings accurately. Matches real drywall estimating workflow.

---

## Phase 4C: Snap to Linear & Room Auto-Fill (1 session)

**Goal:** The killer OST feature — double-click a room to auto-fill ceiling/floor.

### Sprint 5: Snap to Linear
- [ ] **Snap to Linear** property on area conditions
  - Position: Inner Edge / Center / Outer Edge
  - Tolerance: configurable (default 1'6")
  - When drawing area near linear takeoff, vertices snap to the linear path
- [ ] **Room auto-fill** — double-click inside an enclosed linear boundary with area condition selected
  - Detect enclosed region from nearby linear measurements
  - Auto-create area measurement following the linear path
  - Respects Snap Position (inner/center/outer edge)
- [ ] **Connect linear segments** — option to auto-connect sequential linear measurements into one continuous path

**Deliverable:** Draw walls → double-click room → ceiling SF auto-fills. Massive time savings.

---

## Phase 4D: Plan Management Redesign (1-2 sessions)

**Goal:** OST Cover Sheet equivalent — proper project setup flow.

### Sprint 6: Upload-First Flow
- [ ] **Plan Upload step** in takeoff detail view (before opening DrawingViewer)
  - Drag-and-drop zone: "Upload construction plans (PDF)"
  - Upload ALL PDFs at once
  - Auto Name V2 runs on upload
  - Plan table: Sheet No | Sheet Name | Scale | Status | Actions
  - User reviews/corrects auto-names inline
  - "Open Takeoff" button launches DrawingViewer with all plans pre-loaded
- [ ] **Supabase Storage** for PDF files
  - Upload PDFs to Supabase Storage bucket (not just IDB)
  - Cross-device access (open takeoff on any computer)
  - Fallback: IDB cache for offline/fast reload
  - Progress indicator during upload

### Sprint 7: Plan Table Features
- [ ] **Page size detection** — read page dimensions from PDF metadata
- [ ] **Auto-scale from title block** — parse scale text (1/4"=1'-0") and pre-fill calibration
- [ ] **Batch scale** — select multiple sheets, apply same scale to all
- [ ] **Reorder pages** — drag to reorder in plan table
- [ ] **Delete/hide pages** — remove spec sheets, hide non-drawing pages from takeoff

**Deliverable:** Proper project setup. Upload once, plans persist across devices.

---

## Phase 4E: Copy/Move & Advanced Editing (1 session)

**Goal:** Edit mistakes without redrawing.

### Sprint 8: Object Editing
- [ ] **Select mode** improvements — click measurement to select, multi-select with Ctrl+click
- [ ] **Copy measurement** — duplicate to same or different page
- [ ] **Move measurement** — drag to reposition
- [ ] **Split linear** — click a point on a linear measurement to split into two segments
- [ ] **Add vertex to area** — click on an area edge to add a new vertex
- [ ] **Remove vertex from area** — right-click vertex to remove
- [ ] **Reassign bid area** — right-click → move to different bid area

**Deliverable:** Can fix mistakes and adjust measurements without redrawing from scratch.

---

## Phase 4F: Annotations & Collaboration (1 session)

**Goal:** Communicate findings to the team without leaving the app.

### Sprint 9: Core Annotations
- [ ] **Text annotation** — click to place text note on plan
- [ ] **Arrow/Line** — draw attention to specific areas
- [ ] **Highlight** — semi-transparent colored rectangle overlay
- [ ] **Callout** — text with pointer to specific location
- [ ] **Cloud/Circle** — markup areas of concern
- [ ] Annotations persist with takeoff state
- [ ] Toggle visibility of annotations layer

### Sprint 10: Collaboration Features
- [ ] **Comments pinned to sheet locations** — click to add comment at a point
- [ ] **Share takeoff link** — view-only URL for GC/superintendent
- [ ] **Export annotated PDF** — render measurements + annotations onto PDF for printing

**Deliverable:** Can mark up plans and share with team/GC.

---

## Phase 5: AI Takeoff Boost (2-3 sessions)

**Goal:** Features that make EBC-OS genuinely better than anything on the market.

### Sprint 11: AI Wall Detection
- [ ] Upload plan image to Claude Vision API
- [ ] Detect wall lines and classify by type (stud, shaft, demising)
- [ ] Auto-create linear measurements from detected walls
- [ ] User reviews: accept, reject, or adjust each detection
- [ ] "Boost" button in toolbar runs detection on current page

### Sprint 12: AI Count Detection
- [ ] Detect door symbols from plan
- [ ] Detect fixture symbols (lights, diffusers, outlets)
- [ ] Auto-create count measurements at detected locations
- [ ] Symbol legend parsing: read the plan legend to classify symbols

### Sprint 13: AI Suggestions & Validation
- [ ] "You measured walls but no corner bead" — auto-detect missing conditions
- [ ] "Wall LF/SF ratio is unusual" — benchmark against typical projects
- [ ] "This room has no ceiling condition" — identify rooms with walls but no ceiling
- [ ] Suggest add-ons: fire caulking at rated walls, blocking at heavy items
- [ ] Budget tracker: "You're at $X of the $Y budget target"

**Deliverable:** AI catches mistakes, speeds up counting, and suggests missed profit items.

---

## Phase Summary

| Phase | What | Sessions | Priority | OST Parity Impact |
|-------|------|----------|----------|-------------------|
| **4A** | Drawing Polish | 1-2 | NOW | Continuous mode, labels, page tracking |
| **4B** | Attachments & Backouts | 1-2 | HIGH | Doors/windows subtract, ceiling holes |
| **4C** | Snap to Linear | 1 | HIGH | Room auto-fill = killer feature |
| **4D** | Plan Management | 1-2 | HIGH | Upload-first flow, Supabase storage |
| **4E** | Advanced Editing | 1 | MEDIUM | Copy/move/split/resize |
| **4F** | Annotations | 1 | MEDIUM | Text, arrows, markup, share |
| **5** | AI Boost | 2-3 | FUTURE | Wall detection, counts, suggestions |
| **TOTAL** | | **8-12** | | **~85% OST parity + 7 BETTER features** |

---

## What We Skip (and Why)

| OST Feature | Why We Skip It |
|-------------|----------------|
| Dockable toolbars / multi-monitor | Web app doesn't need it |
| TIFF conversion | Legacy format, nobody needs this |
| Page folders in navigator | Overkill — search + auto-name handles it |
| Full-window crosshairs | Minor preference, not worth the code |
| Zones (vs bid areas) | Bid areas cover 95% of use cases |
| Image Legend | Our conditions panel serves this purpose |
| Separate Estimate product (QuickBid) | We have this BUILT IN — our advantage |
| Named Views / Hot Links | Low usage, high complexity |

---

## Success Metrics

### After Phase 4A-4C (Core Complete)
- Can do a complete drywall takeoff including doors and ceiling openings
- Room auto-fill works via double-click
- Continuous mode keeps estimator in flow
- Pages show completion status
- **Time: 25 minutes for a 15,000 SF floor** (vs 30 min current, 45+ in OST)

### After Phase 4D-4E (Production Ready)
- Plans upload once and persist across devices
- Can edit/fix measurements without redrawing
- Professional plan management table
- **Any EBC estimator can use it for real bids**

### After Phase 4F + 5 (Market Leader)
- AI detects walls and counts doors in ~30 seconds
- Auto-catches 3+ commonly missed profit items
- Share annotated takeoff with GC
- **Total time: 20 minutes from email to proposal**
- **Current OST + QuickBid workflow: 3-4 hours**

---

## The Competitive Moat

OST is a **measurement tool** that costs $3,000+/year and needs QuickBid ($2,000+/year) for pricing.

EBC-OS is a **complete estimating workflow** — measure, price, propose, track — in one app.

| Metric | OST + QuickBid | EBC-OS |
|--------|---------------|--------|
| Annual cost | $5,000+ | $0 (internal tool) |
| Time to proposal | 3-4 hours | 20 minutes |
| Missed profit items | User's memory | AI-suggested |
| Scope gap analysis | Manual | AI-powered |
| Change order tracking | Manual overlay | Built-in CO mode |
| Cross-device | Desktop only | Web (any device) |
| Learning curve | Weeks | Hours |

**That's the moat.**
