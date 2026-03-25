# Toolbar Implementation Plan — Sequential Slices

> See `TOOLBAR_SPEC.md` for full specification.
> Each slice: code → lint → build → manual test → commit.

---

## Architecture Overview

### Tool Mode State Machine
```
Current MODE enum:
  PAN | CALIBRATE | LINEAR | AREA | COUNT | MEASURE

Extended (after all slices):
  PAN | CALIBRATE | LINEAR | AREA | COUNT | MEASURE
  | TEXT | ARROW | CALLOUT | CLOUD | RECT | OVAL | LINE_ANN | POLYGON_ANN | INK | HIGHLIGHTER
```

Annotation modes are distinct from takeoff modes. The `mode` state variable handles both.

### Separate Collections
```
takeoffObjects:   measurements[pageKey]     ← existing, unchanged
annotationObjects: annotations[pageKey]      ← NEW, separate
```

### Shared Selection Model
- `selectedMeasId` — existing, for takeoff objects
- `selectedAnnId` — NEW, for annotation objects
- Pan-mode click: check annotations first (drawn on top), then measurements
- Delete key: deletes whichever is selected

### Shared Pointer Pipeline
The existing `handleCanvasClick`, `handleCanvasDoubleClick`, `handleCanvasMove` functions
get additional `if (mode === MODE.TEXT) { ... }` branches. No refactor of existing branches.

---

## Slice A: Scale Dropdown + Annotation Object Model Foundation

**Goal:** Replace "Set Scale" button with OST-style dropdown. Add annotation data model + empty render pipeline.

### Files to Edit
1. `src/components/DrawingViewer.jsx`

### Changes

#### A1. Scale Dropdown (replaces "Set Scale" button)
- Replace the `Set Scale` / `✓ Scale` button with a `<select>` dropdown
- Presets: 1/32"=1', 1/16"=1', 3/32"=1', 1/8"=1', 3/16"=1', 1/4"=1', 3/8"=1', 1/2"=1', 3/4"=1', 1"=1', 1-1/2"=1', 3"=1'
- Plus metric: 1:500, 1:200, 1:100, 1:50
- Last option: "Calculate Scale..." → `setMode(MODE.CALIBRATE)`
- Selecting a preset sets ppf directly: `ppf = 72 * 12 / ratio`
- No two-click needed for preset scales
- Show current scale label when ppf is set
- Keep existing CALIBRATE mode flow intact for "Calculate Scale..."
- Reverse-lookup: when ppf is set via calibration, find closest preset for display

#### A2. Annotation State
```javascript
const [annotations, setAnnotations] = useState(_init.annotations || {});
const [selectedAnnId, setSelectedAnnId] = useState(null);
const [annStyle, setAnnStyle] = useState({
  strokeColor: "#ef4444",
  fillColor: null,
  lineWidth: 2,
  opacity: 1.0,
  fontSize: 14,
});
```

#### A3. Annotation Persistence
Add `annotations` to the save state object (`onTakeoffStateChange` call).

#### A4. drawOverlay: Annotation Render Section
After all existing drawing (measurements, rulers, indicators), add:
```javascript
// ── Annotations ──
const pageAnns = (annotations[pageKey] || []);
pageAnns.forEach(ann => { /* draw based on ann.type */ });
```
Initially empty — each slice adds type-specific rendering.

#### A5. Undo/Redo Extension
Add action types: `"ann_add"`, `"ann_delete"`, `"ann_move"` to undo/redo switch.

### Backward Compatibility
- `_init.annotations || {}` — old saved states work with no annotations
- Scale dropdown sets same `calibrations[pageKey]` value — existing measurements unaffected

### Manual Test Checklist
- [ ] Scale dropdown appears in toolbar
- [ ] Selecting "1/4" = 1' 0"" immediately sets scale (no two-click needed)
- [ ] Measurements work correctly with preset scale
- [ ] "Calculate Scale..." enters calibrate mode (existing flow)
- [ ] Previously calibrated pages still show correct scale in dropdown
- [ ] "Apply to All Pages" still works
- [ ] `npm run build` passes

### Rollback
Revert changes to DrawingViewer.jsx toolbar section. No other files touched.

---

## Slice B: Text + Arrow + Callout + Line + Basic Style

**Goal:** First real annotation tools. User can place text labels, draw arrows, create callouts.

### Files to Edit
1. `src/components/DrawingViewer.jsx`

### Changes

#### B1. New Modes
Add to MODE enum: `TEXT`, `ARROW`, `CALLOUT`, `LINE_ANN`

#### B2. Click Handlers
- **TEXT:** Single click → prompt for text (inline input overlay) → store annotation
- **ARROW:** Click start → click end → store annotation with start/end
- **CALLOUT:** Click anchor → prompt for text → store annotation with position + text + arrow
- **LINE_ANN:** Click start → click end → store line annotation

#### B3. Rendering in drawOverlay
- **Text:** `ctx.fillText()` with background box, styled per `ann.fontSize` and `ann.strokeColor`
- **Arrow:** Line with arrowhead (triangle at end point)
- **Callout:** Rectangle with text + arrow from corner to anchor point
- **Line:** Simple colored line

#### B4. Annotation Toolbar Row
Add Row 3 to toolbar (conditionally shown):
- Tool buttons: Text, Arrow, Callout, Line
- Color picker (small colored dot + click to change)
- Line width selector (thin/medium/thick)

#### B5. Selection + Delete
- Pan mode click: check annotations (reverse order = topmost first)
- Selected annotation gets highlight border
- Delete key removes selected annotation
- Undo/redo for annotation add/delete

#### B6. Keyboard Shortcuts
- T → TEXT mode
- Escape → cancel active annotation

### Backward Compatibility
- New MODE values don't conflict
- annotations[] is independent of measurements[]
- Old saves load fine (no annotations = empty object)

### Manual Test Checklist
- [ ] Press T, click on plan → text input appears → type → text annotation placed
- [ ] Click arrow tool → click start → click end → arrow drawn with arrowhead
- [ ] Click callout tool → click → type text → callout with arrow placed
- [ ] Click annotations in Pan mode → selected (highlight)
- [ ] Delete selected annotation → removed
- [ ] Undo → annotation returns
- [ ] Change color → new annotations use new color
- [ ] Annotations do NOT appear in summary or Excel export
- [ ] `npm run build` passes

### Rollback
Revert MODE additions, click handler branches, drawOverlay annotation section.

---

## Slice C: Cloud + Highlighter + Shapes (Rect/Oval/Polygon) + Fill/Opacity

**Goal:** Complete the annotation toolkit with revision clouds, highlighter, and geometric shapes.

### Files to Edit
1. `src/components/DrawingViewer.jsx`

### Changes

#### C1. New Modes
Add: `CLOUD`, `HIGHLIGHTER`, `RECT`, `OVAL`, `POLYGON_ANN`, `INK`

#### C2. Click/Drag Handlers
- **Cloud:** Click vertices (like area tool) → double-click to finish → render as bumpy cloud path
- **Highlighter:** Mouse-down to start → mouse-move records path → mouse-up to finish. Semi-transparent wide stroke.
- **Rect:** Click-drag from corner to corner
- **Oval:** Click-drag from corner to corner (bounding box)
- **Polygon:** Click vertices → double-click to finish → closed polygon outline
- **Ink:** Same as highlighter but full opacity, thin stroke

#### C3. Cloud Rendering
Cloud path: for each edge segment, draw a series of arcs (bumps) along the line.
Standard revision cloud appearance.

#### C4. Style Panel Enhancement
- Fill color picker (for rect, oval, polygon, cloud)
- Opacity slider (especially for highlighter: default 0.3)

#### C5. Keyboard Shortcut
- H → HIGHLIGHTER mode

### Manual Test Checklist
- [ ] Draw revision cloud around an area → bumpy cloud outline appears
- [ ] Highlighter: drag across plan → semi-transparent wide stroke
- [ ] Rectangle: click-drag → rectangle outline
- [ ] Oval: click-drag → oval outline
- [ ] Change fill color → shapes get fill
- [ ] Change opacity → highlighter/shapes become more/less transparent
- [ ] All annotations selectable + deletable
- [ ] Annotations do NOT affect takeoff quantities
- [ ] `npm run build` passes

### Rollback
Revert new modes, handlers, and rendering code. Slice A+B remain intact.

---

## Slice D: Polish + Named Views + UX Refinements

**Goal:** UI polish, named views (bookmarked zoom positions), toolbar visual refinements.

### Files to Edit
1. `src/components/DrawingViewer.jsx`

### Changes

#### D1. Named Views
- "Bookmark current view" button: saves { pageKey, zoom, scrollX, scrollY, name }
- Quick-jump dropdown to return to saved views
- Stored in annotations state (or separate `namedViews` array)

#### D2. Annotation Visibility Toggle
- "Show/Hide Annotations" button in toolbar
- When hidden, annotations don't render but are preserved

#### D3. Annotation Move/Resize
- Pan mode: click-drag on annotation to reposition
- For text: click to edit text content
- For shapes: drag handles on corners/edges

#### D4. Toolbar Visual Polish
- Icon-based buttons (lucide-react icons where available)
- Tooltip on hover with shortcut hint
- Collapsible annotation row (expand/collapse)
- Active tool highlighted consistently

#### D5. Right-Click Context Menu for Annotations
- Edit (text/callout)
- Change Style
- Delete
- Send to Back / Bring to Front

### Manual Test Checklist
- [ ] Save a named view → appears in dropdown → click → returns to exact view
- [ ] Toggle annotations off → all annotations hidden → toggle on → visible again
- [ ] Drag an annotation → it moves
- [ ] Right-click annotation → context menu appears
- [ ] Toolbar looks polished with icons
- [ ] `npm run build` passes

### Rollback
Revert D-specific additions. Slices A+B+C remain intact.

---

## Implementation Order Summary

| Slice | Scope | Effort | Dependencies |
|-------|-------|--------|-------------|
| **A** | Scale dropdown + annotation model foundation | Small | None |
| **B** | Text + Arrow + Callout + Line + select/delete | Medium | Slice A |
| **C** | Cloud + Highlighter + Shapes + fill/opacity | Medium | Slice B |
| **D** | Named Views + move/resize + polish | Medium | Slice C |

Each slice is independently deployable and testable.
