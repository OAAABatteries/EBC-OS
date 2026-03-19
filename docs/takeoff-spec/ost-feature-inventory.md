# OST Feature Inventory — Master Reference

## How to Read This Document

Each feature is cataloged with:
- **Feature name** — what OST calls it
- **What it does** — functional description
- **User value** — why estimators care
- **OST friction** — what's annoying about the OST version
- **Our better version** — how EBC-OS improves it
- **Priority** — Must-have / Nice-to-have / Differentiator

---

## 1. CORE DRAWING & NAVIGATION

### 1.1 Plan Import/Loading
**What it does:** Import plan files (PDF, TIFF, JPG) into a bid. Plans organize into pages with thumbnails.
**User value:** Getting drawings into the system is step zero.
**OST friction:** Supports many formats but import can be slow for large PDFs. No auto-naming, no discipline detection.
**Our better version:** Drag-drop PDF, auto-split pages, AI sheet naming from title blocks, discipline auto-detection.
**Priority:** Must-have

### 1.2 Page Navigation
**What it does:** Navigate between plan pages. Thumbnail strip, page list, next/prev buttons. Named pages.
**User value:** Estimators jump between sheets constantly (floor plan → ceiling plan → wall types → details).
**OST friction:** Navigation works but thumbnails are small. No search. No discipline filtering.
**Our better version:** Left sidebar with larger thumbnails, search by name, discipline filter tabs, scale status indicators.
**Priority:** Must-have

### 1.3 Zoom / Pan / Rotate
**What it does:** Zoom in/out (scroll wheel, toolbar), pan (middle mouse / space+drag), rotate page 90°/180°.
**User value:** Plans need to be zoomed to see detail, then zoomed out for context.
**OST friction:** Works fine. Scroll zoom is standard. Rotate is rarely needed.
**Our better version:** Match OST. Add pinch-to-zoom for mobile. Add "zoom to fit" and "zoom to selection."
**Priority:** Must-have

### 1.4 Secondary View / Split Window
**What it does:** Open same page in two windows side by side. Or open two different pages simultaneously.
**User value:** Compare details on one sheet while measuring on another.
**OST friction:** Desktop-only feature. Two windows.
**Our better version:** Split-pane view within the web app. Picture-in-picture for detail views.
**Priority:** Nice-to-have

### 1.5 Keyboard Shortcuts
**What it does:** Extensive keyboard shortcuts for every action. Printable reference card.
**User value:** Power users live by shortcuts. 2-3x faster than mouse-only.
**OST shortcuts (from docs):**
- Spacebar: Toggle pan mode
- Z: Zoom tool
- Ctrl+Z: Undo
- Ctrl+Y: Redo
- Escape: Cancel current operation
- Delete: Delete selected
- F: Fit page to window
- +/-: Zoom in/out
- Arrow keys: Scroll/pan
- Tab: Cycle through conditions
- Enter: Accept/confirm
- Right-click: Context menu
**Our better version:** Match OST shortcuts + add: L=Linear, A=Area, C=Count, 1-9=Quick condition select, S=Scale.
**Priority:** Must-have

### 1.6 Layers
**What it does:** Organize takeoff into named layers. Toggle visibility. Lock layers. Each condition assigned to a layer.
**User value:** Show only walls while measuring walls. Hide ceilings to reduce visual clutter.
**OST friction:** Layer management is adequate but not exciting.
**Our better version:** Auto-create layers from condition folders. One-click "show only this type." Layers sync with condition folders.
**Priority:** Must-have

---

## 2. MEASUREMENT ENGINE

### 2.1 Scale Setting
**What it does:** Set the drawing scale so pixel measurements convert to real-world units. Dropdown of common scales, or calibrate by clicking a known dimension.
**User value:** Without correct scale, every measurement is wrong. This is foundational.
**OST friction:** Must set per page. No auto-detection. Easy to forget. No verification prompt.
**Our better version:** Auto-detect from title block, preset dropdown, calibrate from known dimension, verification prompt, batch apply, visual indicator.
**Priority:** Must-have

### 2.2 Linear Conditions
**What it does:** Measure objects in linear feet — walls, piping, gutters, wiring, curbs, rafters.
**Properties:** Name, color, layer, height, thickness, both-sides calculation, deductions, and additional results (SF from height*length, volume).
**User value:** Walls are the #1 thing drywall subs measure. This is the most-used tool.
**OST friction:** Works well. Drawing is click-click-double-click. Can set height to auto-calculate SF.
**Our better version:** Match + add live LF counter at cursor, snap-to-wall detection (future), multi-condition linking.
**Priority:** Must-have

### 2.3 Area Conditions
**What it does:** Measure surface areas — ceilings, floors, slabs, roofing, facades. Draw polygon, get SF.
**Properties:** Name, color, layer, thickness (for volume), perimeter calculation, deduct openings.
**User value:** Ceiling and floor areas are critical for ACT, GWB ceiling, flooring takeoffs.
**OST friction:** Works well. Can calculate perimeter and volume. Deducting openings is manual.
**Our better version:** Match + add auto-perimeter for ceiling grid layout, live SF counter, perimeter auto-calc for edge trim.
**Priority:** Must-have

### 2.4 Count Conditions
**What it does:** Count discrete items — doors, columns, fixtures, footings, outlets. Click to place count marker.
**Properties:** Name, color, layer, count value per click, shape/marker style.
**User value:** Door frames, sidelights, fixtures — items billed per each.
**OST friction:** Simple but works. Count markers are customizable shapes.
**Auto Count (OST feature):** OST scans the current page and automatically finds and counts multiple occurrences of a selected item/object. This is a basic form of AI-assisted counting.
**Count shapes are 3D:** Setting height > 0 makes counts 3-dimensional, enabling perimeter/area/volume calculations for footings, columns, etc. Shape selection determines available results (can't get "diameter" for a square, can't get "both sides" for a circle).
**Our better version:** Match + improve AI symbol detection, running count in sidebar, bulk count (lasso-select area, count all detected symbols), door schedule reconciliation.
**Priority:** Must-have

### 2.5 Attachment Conditions
**What it does:** Items that attach to a parent linear or area condition. Example: windows attach to walls, light fixtures attach to ceilings. When you draw the parent, attachments auto-calculate.
**Properties:** Parent condition, attachment type (per_unit, per_length, per_area), spacing, count_per.
**User value:** "Every 30 LF of wall gets a control joint" — attachment auto-calculates this.
**OST friction:** Powerful but confusing to set up. Relationship model is complex.
**Our better version:** Simplified auto-suggestions (already have profit suggestions). Full attachment conditions in Phase 3D.
**Priority:** Nice-to-have (profit suggestions cover 80% of this)

### 2.6 Multi-Condition Takeoff (OST Patented)
**What it does:** Select multiple Conditions of ANY type (Linear, Area, Count) and draw takeoff once. OST places all appropriate takeoff objects simultaneously.
**Example:** Select "Corners" (Count) + "Carpet" (Area) + "ACT Ceiling" (Area) + "Type B3 Wall @ 13'" (Linear) → draw once → all four measured.
**Rules from docs:**
- Attachments must be placed separately (program can't determine window placement on wall)
- Count objects placed at vertices (Area) or segment breaks (Linear) — can reposition after
- Same-style objects (e.g., two Area conditions) stack on top of each other — assign to different Layers to differentiate
**User value:** Massive time saver. Instead of drawing the same wall 3 times for 3 conditions, draw it once.
**OST friction:** Requires careful condition setup. Stacking same-type conditions needs layer management.
**Our better version:** "Wall Package" concept — link conditions together with smart defaults. Draw wall → auto-creates: LF, SF*2 sides, insulation. Package templates for common combos. Visual indicator showing which conditions are linked.
**Priority:** Must-have (this is where major time is saved)

### 2.7 Takeoff Boost
**What it does:** AI-powered auto-detection of takeoff objects. Scans the plan and suggests measurements.
**User value:** Could save significant time if accurate.
**OST friction:** Newer feature. Accuracy varies. Requires cleanup.
**Our better version:** Start with simpler AI: text detection for scale, symbol detection for doors. Full auto-takeoff is future goal.
**Priority:** Differentiator (Phase 3D+)

---

## 3. ORGANIZATION & REUSE

### 3.1 Conditions Window
**What it does:** Panel showing all conditions in the bid. Organized in a list/tree. Shows name, color, qty, properties. Select a condition to make it active for takeoff.
**User value:** Central place to manage all measurement types. Estimators spend a lot of time in this panel.
**OST friction:** Functional but can get cluttered with many conditions. No folders in older versions. Search is limited.
**Our better version:** Folder-organized, search/filter, running qty + cost per condition, assembly-linked, quick-create from assembly dropdown.
**Priority:** Must-have

### 3.2 Bid Areas
**What it does:** Organizational buckets for takeoff — typically by building area, floor, wing. Every measurement can be assigned to a bid area. Summary can group by bid area.
**User value:** GCs want pricing broken down by area/floor. Also helps estimators track progress ("Did I finish the 1st floor?")
**OST friction:** Must create bid areas before takeoff or reassign after. No auto-detection from sheet names.
**Our better version:** Auto-suggest from sheet names (A1.01 = 1st Floor). Assign during or after takeoff. Lasso-select to assign.
**Priority:** Must-have

### 3.3 Zones
**What it does:** Sub-groupings within bid areas. Example: Bid Area "1st Floor" might have Zones: "Lobby", "Nurse Station", "Patient Rooms."
**User value:** Finer-grained organization for complex buildings.
**OST friction:** Optional and sometimes overkill for smaller projects.
**Our better version:** Optional feature. Auto-suggest based on room labels on plans (future AI).
**Priority:** Nice-to-have

### 3.4 Typical Groups
**What it does:** Measure a room once, then "stamp" that set of measurements across identical rooms. Takeoff the first patient room, then apply it to rooms 2-24. Editing the source updates all instances.
**User value:** Enormous time saver for repetitive buildings (hospitals, hotels, apartments, dorms).
**OST friction:** Powerful but setup is rigid. Creating and placing instances requires careful positioning. No auto-detection of similar rooms.
**Our better version:** Easier setup (select measurements → create typical), AI detection of similar room layouts, edit-one-update-all with fork option.
**Priority:** Must-have

### 3.5 Typical Areas
**What it does:** A matrix system: Typical Areas (rows) × Bid Areas (columns). Each cell = how many times that typical occurs in that bid area. Requires Bid Areas to be set up first. Draw takeoff on the detail plan, assign it to the Typical Area, enter counts per Bid Area — quantities auto-multiply.
**User value:** Huge for apartments (Unit A × 24 on Floor 1, × 24 on Floor 2), hotels, hospitals.
**Critical rules from docs:**
- Each count is EXACTLY the same (including height) — if any variation, create a separate Typical Area
- Do NOT assign common/shared items (shared walls between units) to avoid double-counting
- Common objects taken off separately or as their own Typical Area
**OST friction:** Matrix setup can be confusing. Height variation forces separate typicals. Shared-wall gotcha catches beginners.
**Our better version:** Merge Typical Groups + Typical Areas into one "Typical Room" feature. Visual matrix editor. Auto-warn about shared walls. Allow height overrides per instance without creating separate typicals.
**Priority:** Nice-to-have (Typical Groups covers 80% of use cases)

### 3.5 Typical Areas
**What it does:** Similar to typical groups but defined by a physical area on the plan. Draw a boundary around a room, and all takeoff within that boundary becomes a "typical" that can be replicated.
**User value:** Alternative to typical groups — area-based instead of condition-based.
**OST friction:** Can be confusing vs typical groups. Two ways to do similar things.
**Our better version:** Merge both concepts into one "Typical Room" feature. Define by boundary or by selecting measurements.
**Priority:** Nice-to-have

### 3.6 Alternates
**What it does:** Separate pricing scenarios within a bid. "Base Bid" + "Alternate 1: Add 3rd Floor" + "Alternate 2: Upgrade to Type X board."
**User value:** GCs frequently request alternate pricing. Must be able to price independently.
**OST friction:** Creates separate condition/takeoff sets per alternate. Can get complex.
**Our better version:** Already have alternates in Estimating tab. Link takeoff to alternates. Separate quantity tracking per alternate.
**Priority:** Must-have (already partially built)

### 3.7 Change Orders
**What it does:** Track scope changes after award. "Revision B adds 200 LF of wall. Revision C deletes a room."
**User value:** Change orders are where subs make or lose money. Accurate tracking is critical.
**OST friction:** Basic support. No plan comparison. Manual delta calculation.
**Our better version:** Plan overlay, automatic delta calculation, CO mode (additions/deletions), audit trail.
**Priority:** Must-have

---

## 4. ANALYSIS & OUTPUT

### 4.1 Summary Tab
**What it does:** Aggregated view of all takeoff quantities. Table with condition, qty, unit. Group by page, area, zone, condition type. Sort and filter.
**User value:** The deliverable. Estimators review this before pricing.
**OST friction:** Functional but dense. Export options limited.
**Our better version:** Clean modern table, multiple grouping modes, live cost column (not just qty), one-click export to Excel, direct flow to Estimating tab.
**Priority:** Must-have

### 4.2 Grouping / Rollups
**What it does:** Group summary data by: page, condition, bid area, zone, condition type, layer.
**User value:** See totals by floor, by trade, by condition. GCs want floor-by-floor breakdowns.
**OST friction:** Grouping works but UI is cramped.
**Our better version:** Dropdown group selector with instant re-sort. Nested groups (Area > Condition). Visual rollup cards.
**Priority:** Must-have

### 4.3 Excel Export
**What it does:** Export summary to CSV/Excel. Includes all grouping and formatting.
**User value:** Spreadsheets are universal. GCs, accountants, PMs all want Excel data.
**OST friction:** Export works but formatting isn't always clean.
**Our better version:** Formatted Excel with headers, totals, conditional formatting. Two modes: internal (with pricing) and external (GC-friendly, qty only).
**Priority:** Must-have

### 4.4 Quick Bid Integration
**What it does:** OST quantities feed into Quick Bid for pricing. Conditions map to Quick Bid items. Bi-directional sync.
**User value:** Quantities alone aren't enough — need to price them.
**OST friction:** Requires separate software purchase. Two apps to manage. Sync can break.
**Our better version:** Already built in. Assembly pricing is embedded. No separate app needed. This is one of our biggest advantages.
**Priority:** Done (already better)

### 4.5 Printing / Reports
**What it does:** Print plans with takeoff overlay. Print summary reports. Print condition details.
**User value:** Physical printouts for field reference. Reports for GC submittals.
**OST friction:** Print options work but layout isn't always great.
**Our better version:** PDF export of plans with takeoff overlay. Professional report formatting. Proposal PDF already built.
**Priority:** Nice-to-have

---

## 5. INTEROPERABILITY

### 5.1 Bid Import/Export
**What it does:** Import/export bid packages (conditions, takeoff, settings) between OST installations. Share with colleagues.
**User value:** Reuse work. Share with team members.
**OST friction:** Proprietary format. Can't easily share with non-OST users.
**Our better version:** Cloud-based. Multiple users see same bid. Export to standard formats (Excel, PDF).
**Priority:** Already better (Supabase sync)

### 5.2 Database Management
**What it does:** Manage project databases (file-based storage). Create, backup, move, share databases.
**User value:** Data safety and organization.
**OST friction:** File-based databases are fragile. Backup is manual. Can't easily access from another computer.
**Our better version:** Cloud database (Supabase). Auto-sync. Access from any device. No manual backup needed.
**Priority:** Already better

### 5.3 Collaboration
**What it does:** OST has basic collaboration features. Share bids. Multi-user access (limited).
**User value:** Teams bid together. PM reviews estimator's work.
**OST friction:** Limited multi-user. Desktop-only. No real-time collaboration.
**Our better version:** Real-time cloud sync. Role-based access. Mobile review. Comments pinned to locations.
**Priority:** Already better

---

## Feature Count Summary

| Category | OST Features | Must-Have for EBC | Already Built | To Build |
|----------|-------------|-------------------|---------------|----------|
| Drawing & Nav | 6 | 5 | 2 | 3 |
| Measurement | 7 | 5 | 2 | 3 |
| Organization | 7 | 5 | 1 | 4 |
| Analysis & Output | 5 | 4 | 2 | 2 |
| Interoperability | 3 | 2 | 2 | 0 |
| **Total** | **28** | **21** | **9** | **12** |

**We've already built or surpassed 9 of 28 features. We need to build 12 more to reach MVP parity + advantage.**
