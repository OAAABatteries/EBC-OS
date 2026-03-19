# EBC-OS Takeoff Module — Workflow Maps

## EBC Real-World Drywall/Framing Estimating Workflow

This maps the actual workflow an EBC estimator (Abner, Emmanuel, or Isai) follows when pricing a job. Every step is a place where the app can save time or prevent mistakes.

---

## Phase 1: Receive & Organize Plans

### Current workflow (manual)
1. Receive invitation to bid from GC (email or planroom)
2. Download plan set (PDF, usually 50-200 pages)
3. Rename/organize sheets mentally
4. Identify which sheets are relevant (arch floor plans, reflected ceiling plans, wall types, door schedule)
5. Skip MEP, structural, civil sheets

### Pain points
- PDFs are huge, mixed disciplines
- No auto-sorting of sheets
- Have to scroll through entire set to find relevant pages
- Easy to miss sheets (especially addenda)

### EBC-OS improvement
- **Drag-drop PDF upload** — split multi-page PDF into individual sheets
- **AI sheet classification** — auto-detect discipline (Arch, Struct, MEP) from title block
- **Auto sheet naming** — parse sheet number + title from title block text
- **Discipline filtering** — show only Architectural by default for drywall/framing
- **Addendum tracking** — highlight new/revised sheets

---

## Phase 2: Set Scale

### Current workflow (OST)
1. Open a sheet
2. Select scale from dropdown OR click two points on a known dimension
3. Verify by measuring something else
4. Repeat for every sheet (scale may vary between sheets)

### Pain points
- Forgetting to set scale on a sheet = wrong quantities
- Different scales on different sheets
- No warning if scale seems wrong
- Have to manually verify

### EBC-OS improvement
- **Auto-detect scale** from title block text (e.g., "SCALE: 1/4\" = 1'-0\"")
- **Scale presets** — common scales as one-click buttons
- **Scale verification** — after calibration, app suggests measuring a door (3'-0") to verify
- **Scale warning** — if a measurement seems wildly off, warn the user
- **Batch scale** — apply same scale to multiple sheets at once
- **Visual scale indicator** — always show current scale on screen

---

## Phase 3: Create Conditions (Item Types)

### Current workflow (OST)
1. Open Conditions window
2. Click "New Condition"
3. Choose type (Linear, Area, Count)
4. Name it (e.g., "3-5/8\" 20ga Wall @ 10'")
5. Set properties (height, color, layer)
6. Repeat for every wall type, ceiling type, etc.

### Pain points
- Creating 15-30 conditions per bid is tedious
- Naming is inconsistent between bids
- No connection to pricing/assemblies
- Have to remember what conditions you need
- Can't easily reuse from previous bids

### EBC-OS improvement
- **Assembly-linked conditions** — pick an assembly code (A2, ACT1), condition auto-creates with correct name, unit, rates
- **Trade templates** — "Medical Drywall" template creates: walls, ceilings, soffits, lead-lined, shaft wall, insulation, ACT, corner bead, control joints, door frames, sidelights
- **Smart suggestions** — based on project type (Medical/Commercial/Retail), suggest likely conditions
- **Copy from previous bid** — "This bid looks like MH Katy — import those conditions?"
- **Bulk create** — create multiple conditions from a spreadsheet or checklist
- **Auto-height** — detect ceiling heights from plan text

---

## Phase 4: Draw Takeoff (Measure)

### Current workflow (OST)
1. Select a condition from the conditions list
2. Click on the plan to draw measurement
   - Linear: click start, click along wall, double-click to finish
   - Area: click vertices of polygon, double-click to close
   - Count: click on each item (door, fixture, etc.)
3. Measurement appears on plan in condition's color
4. Quantity auto-calculates based on scale
5. Switch conditions and repeat
6. Navigate to next sheet and repeat

### Pain points
- Only one condition at a time (unless using multi-condition takeoff)
- Easy to miss areas or double-count
- No progress tracking ("how much of this floor have I measured?")
- Zooming in/out constantly
- No undo history beyond last action
- Can't see total quantities while drawing

### EBC-OS improvement
- **Live quantity counter** — running total for active condition shown at all times
- **Multi-condition takeoff** — draw once, apply to multiple conditions (e.g., draw a wall, it creates: framing LF, drywall SF both sides, insulation SF, corner bead LF at intersections)
- **Progress overlay** — color-code areas that have been measured vs. unmeasured
- **Snap-to-wall** — detect wall lines in the PDF and snap measurement to them
- **Auto-count** — AI-detect symbols (doors, windows, fixtures) and suggest counts
- **Running bid total** — show $$ total updating in real-time as you measure
- **Measurement audit** — click any measurement to see who drew it, when, what condition

---

## Phase 5: Organize by Area

### Current workflow (OST)
1. Create Bid Areas (e.g., "1st Floor", "2nd Floor")
2. Assign takeoff to bid areas
3. Optionally create Zones within areas
4. Use Typical Groups for repeating rooms

### Pain points
- Have to set bid area BEFORE drawing takeoff, or reassign after
- Typical Groups are powerful but hard to set up
- No auto-detection of repeating layouts
- Bid areas don't carry over between bids

### EBC-OS improvement
- **Smart bid areas** — auto-suggest based on sheet names ("A1.01 = 1st Floor", "A2.01 = 2nd Floor")
- **Post-hoc assignment** — draw first, organize later (lasso-select takeoff and assign to area)
- **AI typical detection** — "These 24 patient rooms look identical — create a Typical Group?"
- **Typical sync** — edit one room, all instances update (with option to fork)

---

## Phase 6: Review & Verify

### Current workflow
1. Review Summary tab — quantities by condition, page, area
2. Compare against rough estimates ("does 2,400 LF of wall seem right for a 15,000 SF floor?")
3. Check for missing items (did I count all the doors?)
4. Cross-reference with door schedule, finish schedule

### Pain points
- Summary is flat — hard to see if something is missing
- No benchmarking against similar past projects
- No visual confirmation of what's been measured
- Can't easily find missed areas

### EBC-OS improvement
- **Scope coverage map** — visual overlay showing what's been measured and what hasn't
- **Benchmark check** — "Your wall LF per SF ratio is 0.16 — similar projects average 0.18. You may be missing walls."
- **Door schedule reconciliation** — import door schedule, compare against door count takeoff
- **AI review** — "You have 48 rooms but only 42 doors counted. Check sheets A1.03 and A1.04."
- **Revision diffing** — when addendum comes, highlight what changed on the plans

---

## Phase 7: Price & Propose

### Current workflow (EBC-OS existing)
1. Quantities flow into takeoff rooms/line items
2. Assembly rates applied (matRate, labRate)
3. Height factors applied
4. Markup applied (waste, tax, overhead, profit)
5. Proposal PDF generated

### This already works in EBC-OS Phase 1-2. The takeoff module FEEDS INTO this.

### EBC-OS improvement
- **Direct flow** — takeoff quantities auto-populate line items by assembly code
- **Condition → Room mapping** — conditions in Bid Area "1st Floor" become a "1st Floor" room
- **Profit suggestions** — auto-suggest (already built in Phase 3)
- **What-if scenarios** — "What if we use 6\" walls instead of 3-5/8\"?" — one click to swap condition

---

## Phase 8: Change Orders & Revisions

### Current workflow
1. GC sends revised plans
2. Identify what changed (manually compare old vs new)
3. Delete/modify affected takeoff
4. Re-measure changed areas
5. Calculate delta (new - old = change order amount)

### Pain points
- No plan comparison tools
- Hard to track what was original vs. revised
- Change order pricing is error-prone
- No audit trail

### EBC-OS improvement
- **Plan overlay** — overlay old plan on new plan, highlight differences
- **Change order mode** — automatically tracks additions/deletions as a separate bid
- **Delta calculation** — "Added 120 LF of wall, removed 80 LF = net +40 LF = $2,200 CO"
- **Revision history** — full audit trail of every change

---

## Summary: Click Count Comparison

| Task | OST (clicks) | EBC-OS Target |
|------|-------------|---------------|
| Import 100-page PDF | 5-10 | 2 (drag-drop) |
| Set scale on 20 sheets | 60+ | 5 (auto-detect + verify) |
| Create 20 conditions | 100+ | 10 (template + auto-link) |
| Measure 2,000 LF of walls | varies | same (drawing is drawing) |
| Organize by floor | 40+ | 5 (auto from sheet names) |
| Review quantities | 20+ | 3 (live dashboard) |
| Generate proposal | 15+ | 3 (already built) |
| Process change order | 50+ | 10 (overlay + delta calc) |
