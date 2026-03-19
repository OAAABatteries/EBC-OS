# EBC-OS Takeoff Module — Screen Specs (MVP)

## Screen Architecture

```
Estimating Tab (existing)
  └── Takeoff List (existing, enhanced)
        └── Takeoff Detail (existing, enhanced)
              ├── [NEW] Plan Viewer (full-screen overlay)
              │     ├── Sheet Navigator (left sidebar)
              │     ├── Drawing Canvas (center)
              │     ├── Measurement Overlay (canvas layer)
              │     ├── Toolbar (top)
              │     ├── Conditions Panel (right sidebar)
              │     └── Live Cost Bar (bottom)
              ├── [ENHANCED] Rooms / Line Items (existing)
              ├── [ENHANCED] Bid Summary (existing)
              ├── [NEW] Takeoff Summary (grouped by area/condition)
              └── [EXISTING] Proposal Export
```

---

## Screen 1: Plan Viewer (Full-Screen Overlay)

This is the main takeoff workspace. It's a full-screen overlay triggered by "Open Drawing" in a takeoff.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Close] │ Sheet: A1.01 - First Floor Plan │ Mode Toolbar │ Zoom │
├────────┬────────────────────────────────────────┬───────────┤
│ SHEETS │                                        │CONDITIONS │
│        │                                        │           │
│ A1.01 ◄│         PDF DRAWING CANVAS             │ ▼ Walls   │
│ A1.02  │         + Measurement Overlay          │   A2 Wall │
│ A1.03  │                                        │   B1 Wall │
│ A2.01  │                                        │   DW1 Wall│
│ A2.02  │                                        │ ▼ Ceilings│
│ ...    │                                        │   ACT1    │
│        │                                        │   GC1     │
│        │                                        │ ▼ Counts  │
│ Scale: │                                        │   Doors   │
│ 1/4"=1'│                                        │   Sidelt  │
│        │                                        │           │
│        │                                        │ [+New]    │
├────────┴────────────────────────────────────────┴───────────┤
│ Total: $42,015 │ Walls: 500 LF ($27K) │ Ceilings: 2000 SF  │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### Top Toolbar
- **Close** button (returns to takeoff detail)
- **Sheet name** (editable, shows current sheet)
- **Mode buttons**: Pan | Set Scale | Linear | Area | Count
- **Zoom controls**: -, %, +, Fit
- **Page nav**: Prev, page/total, Next
- **Undo/Redo** buttons

#### Left Sidebar: Sheet Navigator
- Thumbnail list of all sheets in this takeoff
- Current sheet highlighted
- Scale indicator per sheet (green = calibrated, red = not set)
- Discipline filter tabs: All | Arch | Struct | MEP
- Search/filter by sheet name
- Drag to reorder

#### Center: Drawing Canvas
- PDF rendered via pdfjs-dist
- Measurement overlay canvas on top
- Pan (mouse drag / space+drag)
- Zoom (scroll wheel / pinch)
- Crosshair cursor in measurement modes
- Grab cursor in pan mode

#### Right Sidebar: Conditions Panel
- Folder-organized condition list
- Each condition shows: color dot, name, running qty, running $
- Click condition to select for takeoff
- Currently active condition highlighted
- [+ New Condition] button at bottom
- Quick-create from assembly dropdown
- Search/filter conditions

#### Bottom Bar: Live Cost Counter
- Grand total: $XX,XXX
- Breakdown by condition type: Walls: XXX LF ($XX,XXX) | Ceilings: XXX SF ($XX,XXX) | Counts: XX EA ($X,XXX)
- Updates in real-time as measurements are added

### Interactions
- **Click condition** in right panel → activates it for drawing
- **Click on canvas** in Linear/Area/Count mode → starts measurement
- **Double-click** → finishes measurement
- **Right-click on measurement** → context menu: Edit, Delete, Change Condition, Add Note
- **Hover over measurement** → shows qty, condition name, cost

---

## Screen 2: Conditions Manager (Modal/Panel)

Accessed from the Conditions panel or from takeoff detail.

### Layout

```
┌──────────────────────────────────────────────────┐
│ Conditions                         [+ New] [Template] │
├──────────────────────────────────────────────────┤
│ Search conditions...                              │
├──────────────────────────────────────────────────┤
│ ▼ Walls (4 conditions, 1,200 LF total)           │
│   ● A2 - 3-5/8" 20ga Freestanding Wall    500 LF │
│   ● B1 - 6" 20ga Freestanding Wall        300 LF │
│   ● DW1 - 6" Deck Wall 20ga              200 LF │
│   ● C2 - Furring (One Side)              200 LF │
│                                                   │
│ ▼ Ceilings (2 conditions, 4,500 SF total)         │
│   ● ACT1 - 2x2 ACT Grid + Tile         3,000 SF │
│   ● GC1 - GWB Suspended Ceiling        1,500 SF │
│                                                   │
│ ▼ Insulation (2 conditions, 800 SF total)         │
│   ● INS1 - R-13 Batt (3-5/8")            500 SF │
│   ● INS2 - R-19 Batt (6")               300 SF │
│                                                   │
│ ▼ Counts (3 conditions, 67 EA total)              │
│   ● DF - Door Frames                     42 EA │
│   ● SL - Sidelights                      15 EA │
│   ● CJ - Control Joints                  10 EA │
│                                                   │
│ ▼ Add-Ons (auto-suggested)                        │
│   ● CB - Corner Bead              (suggested) │
│   ● FC - Fire Caulking            (suggested) │
│   ● BLK - Blocking Allowance      (suggested) │
├──────────────────────────────────────────────────┤
│ Total: 26 conditions │ $185,400 estimated         │
└──────────────────────────────────────────────────┘
```

### Condition Detail (inline expand or modal)

```
┌──────────────────────────────────────────────────┐
│ A2 - 3-5/8" 20ga Freestanding Wall               │
├──────────────────────────────────────────────────┤
│ Type: Linear          Assembly: A2                │
│ Unit: LF              Color: [■] Blue             │
│ Height: 10'           Height Factor: 1.00x        │
│ Layer: Walls          Folder: Walls               │
│                                                   │
│ Rates:                                            │
│   Material: $14.02/LF    Labor: $40.93/LF         │
│   Total: $54.95/LF                                │
│                                                   │
│ Current Takeoff:                                  │
│   Total Qty: 500 LF                              │
│   1st Floor: 300 LF    2nd Floor: 200 LF         │
│   Mat Cost: $7,010      Lab Cost: $20,465          │
│   Total Cost: $27,475                             │
│                                                   │
│ Multi-Condition Links:                            │
│   [x] Also create: Drywall SF (both sides)        │
│   [x] Also create: R-13 Insulation SF             │
│   [ ] Also create: Corner Bead LF (15%)           │
│                                                   │
│ [Save] [Delete] [Duplicate]                       │
└──────────────────────────────────────────────────┘
```

---

## Screen 3: Takeoff Summary (New Sub-Tab in Estimating)

### Layout

```
┌──────────────────────────────────────────────────────┐
│ Takeoff Summary                [Export Excel] [→ Estimate] │
├──────────────────────────────────────────────────────┤
│ Group by: [Condition ▼] │ Filter: [All Areas ▼]      │
├──────────────────────────────────────────────────────┤
│ Condition           │ Qty    │ Unit │ Mat $  │ Lab $  │ Total  │
├─────────────────────┼────────┼──────┼────────┼────────┼────────┤
│ ▼ Walls                                                       │
│   A2 - 3-5/8" Wall  │ 500    │ LF   │ $7,010 │$20,465 │$27,475 │
│     1st Floor        │ 300    │      │ $4,206 │$12,279 │$16,485 │
│     2nd Floor        │ 200    │      │ $2,804 │ $8,186 │$10,990 │
│   B1 - 6" Wall      │ 300    │ LF   │ $4,809 │$13,590 │$18,399 │
│ ▼ Ceilings                                                    │
│   ACT1 - 2x2 ACT    │ 3,000  │ SF   │ $9,060 │$12,750 │$21,810 │
│   GC1 - GWB Ceiling  │ 1,500  │ SF   │ $3,300 │ $7,725 │$11,025 │
│ ▼ Counts                                                      │
│   DF - Door Frames   │ 42     │ EA   │ $2,730 │ $5,040 │ $7,770 │
│   SL - Sidelights    │ 15     │ EA   │  $675  │ $1,500 │ $2,175 │
├─────────────────────┼────────┼──────┼────────┼────────┼────────┤
│ SUBTOTAL             │        │      │$27,584 │$61,070 │$88,654 │
│ Waste (5%)           │        │      │        │        │ $4,433 │
│ Tax on Mat (8.25%)   │        │      │        │        │ $2,641 │
│ Overhead (10%)       │        │      │        │        │ $9,573 │
│ Profit (10%)         │        │      │        │        │$10,530 │
│ GRAND TOTAL          │        │      │        │        │$115,831│
└──────────────────────────────────────────────────────────────┘
```

### Group by options
- **Condition** — group by condition type (default)
- **Bid Area** — group by floor/area
- **Sheet** — group by plan page
- **Zone** — group by zone
- **Folder** — group by condition folder

---

## Screen 4: Scale Calibration (Inline in Plan Viewer)

### Flow

```
Step 1: User clicks "Set Scale" in toolbar
        → Toolbar highlights, cursor changes to crosshair
        → Instruction banner: "Click two endpoints of a known dimension"

Step 2: User clicks point A on plan
        → Red dot appears at point A

Step 3: User clicks point B on plan
        → Red dot at B, dashed red line between A and B
        → Popup appears at midpoint:

        ┌────────────────────────────────┐
        │ Set Known Dimension            │
        │                                │
        │ Or pick a preset scale:        │
        │ [1/8"] [3/16"] [1/4"] [3/8"]   │
        │ [1/2"] [3/4"] [1"] [1-1/2"]    │
        │                                │
        │ Or enter the real distance:    │
        │ [________] feet                │
        │                                │
        │ [Cancel]  [Confirm]            │
        └────────────────────────────────┘

Step 4: User enters value (e.g., "3") or picks preset
        → Scale calculated and saved
        → Instruction: "Scale set! Verify by measuring a door (should be ~3'-0")"
        → Scale indicator appears in corner: "1/4" = 1'-0""
```

---

## Screen 5: Template Picker (Modal)

```
┌──────────────────────────────────────────────────┐
│ Apply Condition Template                          │
├──────────────────────────────────────────────────┤
│ ▼ Trade Templates                                 │
│   [Medical Drywall]  22 conditions                │
│   [Commercial Office] 18 conditions               │
│   [Retail]           15 conditions                │
│   [Residential]      12 conditions                │
│                                                   │
│ ▼ From Previous Bids                              │
│   [MH Katy OBGYN]   19 conditions  (98% match)   │
│   [Heart Care NW]    16 conditions  (85% match)   │
│   [Escapology SA]    14 conditions  (72% match)   │
│                                                   │
│ ▼ Custom Templates                                │
│   [My Standard Set]  20 conditions                │
│                                                   │
│ Preview:                                          │
│ ┌────────────────────────────────────────────────┐│
│ │ Medical Drywall (22 conditions):               ││
│ │  Walls: A2, A3, A4, B1, DW1, DW2, C2, SW1    ││
│ │  Ceilings: ACT1, ACT2, GC1, FD1              ││
│ │  Insulation: INS1, INS2, INS3, INS4          ││
│ │  Specialties: LL1, ICRA1, FP1                 ││
│ │  Counts: DF, SL, CJ, CB                       ││
│ │  Add-ons: FC, BLK, PL                         ││
│ └────────────────────────────────────────────────┘│
│                                                   │
│ [Cancel]  [Apply Template]                        │
└──────────────────────────────────────────────────┘
```

---

## MVP Screen Priority

| # | Screen | Complexity | Value | Priority |
|---|--------|-----------|-------|----------|
| 1 | Plan Viewer (enhanced DrawingViewer) | High | Critical | P0 |
| 2 | Conditions Panel (right sidebar) | Medium | Critical | P0 |
| 3 | Live Cost Bar | Low | High | P0 |
| 4 | Sheet Navigator (left sidebar) | Medium | High | P1 |
| 5 | Takeoff Summary (grouped) | Medium | High | P1 |
| 6 | Scale Calibration (enhanced) | Low | High | P1 |
| 7 | Template Picker | Medium | Medium | P2 |
| 8 | Conditions Manager (detail view) | Medium | Medium | P2 |
| 9 | Bid Areas assignment | Medium | Medium | P2 |
| 10 | Typical Groups | High | High | P2 |
