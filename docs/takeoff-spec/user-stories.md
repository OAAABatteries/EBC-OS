# EBC-OS Takeoff Module — User Stories

## Personas

### Abner (PM / Estimator)
- Bids 5-10 projects per week
- Drywall + framing scope
- Wants speed and accuracy
- Uses phone on jobsite

### Emmanuel (Owner / Senior PM)
- Reviews bids before submission
- Cares about margin and scope coverage
- Wants dashboard visibility
- Final approval on proposals

### Isai (PM)
- Bids medical and commercial projects
- Handles change orders frequently
- Wants template reuse
- Values consistency

---

## Plan Management

### US-01: Import Plans
**As** Abner, **I want to** drag and drop a multi-page PDF into the app **so that** each page becomes a separate sheet I can work on, without manually splitting the file.

**Acceptance criteria:**
- Drop a PDF file, all pages split automatically
- Each page gets a thumbnail preview
- Pages are numbered in order
- Large PDFs (200+ pages) don't freeze the app

### US-02: Auto-Name Sheets
**As** Abner, **I want** sheets to be automatically named from the title block text **so that** I don't have to manually rename 50+ sheets.

**Acceptance criteria:**
- AI reads title block and extracts sheet number + title
- Example: "A1.01" + "First Floor Plan" → "A1.01 - First Floor Plan"
- User can edit any auto-generated name
- Works for 90%+ of standard title blocks

### US-03: Filter by Discipline
**As** Abner, **I want to** filter sheets by discipline (Architectural, Structural, MEP) **so that** I only see the sheets relevant to drywall/framing.

**Acceptance criteria:**
- Auto-detect discipline from sheet number prefix (A=Arch, S=Struct, M=Mech, E=Elec)
- Filter buttons: All, Arch, Struct, MEP, Civil
- Drywall subs default to Arch filter

### US-04: Track Addenda
**As** Abner, **I want to** know which sheets are new or revised in an addendum **so that** I don't miss scope changes.

**Acceptance criteria:**
- Upload addendum PDF, system identifies new/revised sheets
- Revised sheets show "Rev B" badge
- Side-by-side comparison available
- Takeoff on superseded sheets gets flagged

---

## Scale Calibration

### US-05: Set Scale from Preset
**As** Abner, **I want to** select a common scale from a dropdown (1/4" = 1'-0", etc.) **so that** I can calibrate quickly when the scale is printed on the drawing.

**Acceptance criteria:**
- Dropdown with 10 common architectural scales
- One click to apply
- Scale indicator visible on screen at all times

### US-06: Calibrate Scale from Known Dimension
**As** Abner, **I want to** click two points on a known dimension and enter the real measurement **so that** the system calculates the correct scale.

**Acceptance criteria:**
- Click point A, click point B, enter feet
- System calculates pixels-per-foot
- Verification prompt: "Measure a door to verify — should be ~3'-0\""
- Scale saved per sheet

### US-07: Auto-Detect Scale
**As** Abner, **I want** the system to read the scale from the title block text **so that** I don't have to calibrate every sheet manually.

**Acceptance criteria:**
- AI scans title block for scale text (e.g., "SCALE: 1/4\" = 1'-0\"")
- Auto-suggests detected scale
- User confirms or overrides
- Falls back to manual calibration if detection fails

### US-08: Batch Apply Scale
**As** Abner, **I want to** apply the same scale to multiple sheets at once **so that** I don't have to calibrate 20 identical sheets one by one.

**Acceptance criteria:**
- Select multiple sheets from sheet list
- "Apply scale to selected" button
- Confirmation dialog shows affected sheets

---

## Conditions (Measurement Types)

### US-09: Create Condition from Assembly
**As** Abner, **I want to** create a takeoff condition by selecting an assembly code **so that** the condition automatically gets the right name, unit, and pricing.

**Acceptance criteria:**
- Pick assembly "A2" → condition named "3-5/8\" 20ga Freestanding Wall"
- Unit auto-set to LF
- MatRate and LabRate auto-linked
- Color auto-assigned (unique per condition)

### US-10: Use Trade Template
**As** Abner, **I want to** apply a "Medical Drywall" template that creates all standard conditions **so that** I don't have to create 20 conditions from scratch.

**Acceptance criteria:**
- Templates available: Medical Drywall, Commercial Office, Retail, Residential
- Each template creates 10-20 conditions with correct assemblies
- User can add/remove conditions after applying
- Custom templates can be saved

### US-11: Organize Conditions in Folders
**As** Abner, **I want to** group conditions into folders (Walls, Ceilings, Specialties) **so that** I can quickly find the right condition.

**Acceptance criteria:**
- Drag conditions into folders
- Folders are collapsible
- Folder totals show sum of contained conditions
- Default folders created from template

### US-12: Copy Conditions from Previous Bid
**As** Isai, **I want to** copy the condition set from a similar past bid **so that** I start with conditions that match my typical scope.

**Acceptance criteria:**
- Browse past bids, select one
- Preview its conditions before copying
- Copy all or select specific conditions
- Assemblies re-link automatically

---

## Drawing Takeoff

### US-13: Measure Linear (Walls)
**As** Abner, **I want to** click along a wall on the plan and see the running linear footage **so that** I can quickly measure all walls of a given type.

**Acceptance criteria:**
- Click to place vertices, double-click to finish
- Running LF total shown at cursor
- Completed measurement shows total with label
- Measurement color matches condition color
- Undo last vertex with right-click or Ctrl+Z

### US-14: Measure Area (Ceilings/Floors)
**As** Abner, **I want to** click a polygon around a ceiling area **so that** I get the square footage automatically.

**Acceptance criteria:**
- Click vertices, double-click to close polygon
- Area fills with semi-transparent condition color
- SF total shown at centroid
- Perimeter LF also calculated (optional)

### US-15: Count Items (Doors/Fixtures)
**As** Abner, **I want to** click on each door to count them **so that** I have an accurate door frame count.

**Acceptance criteria:**
- Single click places a count marker
- Running count shown
- Count markers are visible and labeled
- Can set count-per-click (default 1, but could be 2 for "pair")

### US-16: See Live Cost While Drawing
**As** Abner, **I want to** see the dollar amount updating as I draw takeoff **so that** I know where my bid stands before I finish.

**Acceptance criteria:**
- Sidebar shows: Condition name, qty so far, $ cost so far
- Bottom bar shows: Total bid $ across all conditions
- Updates in real-time as each measurement is placed
- Breakdown: materials vs labor

### US-17: Multi-Condition Takeoff
**As** Abner, **I want to** draw a wall run once and have it create framing LF + drywall SF (both sides) + insulation SF **so that** I don't draw the same wall three times.

**Acceptance criteria:**
- Select a "wall package" (multiple linked conditions)
- Draw the wall once
- System creates: wall LF, drywall SF (length * height * 2 sides), insulation SF (length * height)
- Each condition gets correct quantity

### US-18: Keyboard-Driven Takeoff
**As** Abner, **I want** keyboard shortcuts for common actions **so that** I can work faster without reaching for the mouse.

**Acceptance criteria:**
- L = switch to linear mode
- A = switch to area mode
- C = switch to count mode
- Esc = cancel current measurement
- Ctrl+Z = undo last vertex/measurement
- Space = pan mode toggle
- +/- = zoom in/out
- 1-9 = quick-switch between first 9 conditions

---

## Organization

### US-19: Create Bid Areas
**As** Abner, **I want to** organize takeoff by floor/area **so that** I can see quantities broken down by location.

**Acceptance criteria:**
- Create bid areas: "1st Floor", "2nd Floor", "Mezzanine"
- Assign takeoff to bid area while drawing or after
- Summary shows rollup by bid area
- Bid areas suggested from sheet names

### US-20: Typical Groups
**As** Isai, **I want to** measure a patient room once and apply it to all 24 identical rooms **so that** I save hours of repetitive work.

**Acceptance criteria:**
- Draw takeoff for one room
- Select all measurements, "Create Typical Group"
- Name it: "Standard Patient Room"
- Place instances on other sheets/locations
- Editing the source updates all instances

### US-21: AI Typical Detection
**As** Abner, **I want** the system to detect repeating room layouts **so that** it suggests creating typical groups automatically.

**Acceptance criteria:**
- After measuring several rooms, system detects pattern
- "These 3 rooms have similar takeoff. Create a Typical Group?"
- Shows which other rooms might match
- User confirms before applying

---

## Summary & Output

### US-22: Takeoff Summary Dashboard
**As** Emmanuel, **I want to** see a summary of all takeoff quantities and costs **so that** I can review the bid before submission.

**Acceptance criteria:**
- Table: Condition | Qty | Unit | Mat $ | Lab $ | Total $
- Group by: Condition type, Bid area, Floor, Zone
- Sort by any column
- Filter by condition type
- Grand total at bottom

### US-23: Export to Proposal
**As** Abner, **I want** takeoff quantities to flow directly into the proposal system **so that** I don't have to re-enter numbers.

**Acceptance criteria:**
- "Send to Estimate" button
- Creates rooms from bid areas
- Creates line items from conditions
- Quantities populated from takeoff
- Assembly rates auto-applied
- Opens in Estimating tab ready for review

### US-24: Export to Excel
**As** Isai, **I want to** export takeoff quantities to Excel **so that** I can share with the GC or manipulate the data.

**Acceptance criteria:**
- Export button on Summary tab
- Excel file with: Condition, Qty, Unit, Area, Zone, Page
- Formatted with headers and totals
- GC-friendly format (no internal pricing)

---

## Change Orders

### US-25: Plan Comparison
**As** Isai, **I want to** overlay the revised plan on the original **so that** I can see exactly what changed.

**Acceptance criteria:**
- Upload revised sheet
- Side-by-side or overlay view
- Changed areas highlighted
- Toggle between old and new

### US-26: Change Order Takeoff
**As** Isai, **I want to** measure additions and deletions separately **so that** I can price the change order as a net delta.

**Acceptance criteria:**
- Change Order mode: tracks additions (green) and deletions (red)
- Net delta calculated automatically
- Change order gets its own bid/pricing
- Links back to original takeoff for audit
