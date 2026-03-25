# EBC-OS Takeoff Toolbar — Feature Specification

> Revision: 2026-03-25 · Updated: 2026-03-25 (all slices complete) · Author: Claude Code

---

## 1. Design Philosophy

OST (On-Screen Takeoff) is the baseline. EBC-OS matches or exceeds OST's toolbar UX:
- **Annotation tools** are markup only — they MUST NOT affect takeoff quantities or exports
- **Keyboard-first** — every tool accessible via shortcut
- **Snap toggle** — angle snapping visible and toggleable (Shift inverts)

---

## 2. Implementation Status — COMPLETE ✅

All groups below are fully implemented in `src/components/DrawingViewer.jsx`.

### A. View / Navigation (always visible — Row 1 + Row 2)
| Tool | Shortcut | Status | Description |
|------|----------|--------|-------------|
| Pan (Select) | Space (hold) | ✅ | Default mode. Pan with drag, click to select |
| Zoom In | + / = / scroll up | ✅ | Step zoom or cursor-centered wheel zoom |
| Zoom Out | - / scroll down | ✅ | Step zoom or cursor-centered wheel zoom |
| Fit Width | F | ✅ | Fit PDF to container width (zoom=1) |
| Fit Page | — | ✅ | Fit entire page (width + height) into viewport |
| Zoom % | (display) | ✅ | Shows current zoom percentage |
| Page Navigation | PageUp/PageDown | ✅ | Prev/next + dropdown selector with sheet names |

### B. Scale & Verification (Row 1)
| Tool | Shortcut | Status | Description |
|------|----------|--------|-------------|
| Set/Calculate Scale | S | ✅ | Two-click calibration with presets (1/8" to 3" = 1') |
| Dimension/Ruler | M | ✅ | Quick-check distance, no condition required |

### C. Takeoff Tools (Row 1, need scale set)
| Tool | Shortcut | Status | Description |
|------|----------|--------|-------------|
| Linear | L | ✅ | Line measurements (walls, pipe) |
| Area | A | ✅ | Polygon measurements (ceilings, floors) |
| Count | C | ✅ | Click to count discrete items |
| Calibrate | S | ✅ | Two-click scale setting |
| Angle Snap | Shift (temp toggle) | ✅ | 15° angle snapping with toolbar toggle button |

### D. Editing (Row 1)
| Tool | Shortcut | Status | Description |
|------|----------|--------|-------------|
| Undo | Ctrl+Z | ✅ | Undo measurement or annotation |
| Redo | Ctrl+Y | ✅ | Redo |
| Delete | Del / Backspace | ✅ | Delete selected measurement or annotation |
| Copy Measurement | (context menu) | ✅ | Right-click → Copy clones with offset |
| Multi-select | Shift+Click | ✅ | For Typical Groups |
| Snap Toggle | — (button) | ✅ | Toggle angle snapping on/off |
| Continuous Mode | — (button) | ✅ | Auto-start next measurement |
| Condition Names | N | ✅ | Show/hide labels on measurements |

### E. Annotation Tools (Row 4 — MARKUP section)
| Tool | Shortcut | Status | Description |
|------|----------|--------|-------------|
| Text | T | ✅ | Place text label (Enter to confirm) |
| Callout | — | ✅ | Arrow anchor + text box |
| Arrow | — | ✅ | Click start → click end → arrowhead |
| Line | — | ✅ | Click start → click end |
| Highlighter | H | ✅ | Semi-transparent wide stroke (drag) |
| Rectangle | — | ✅ | Click-drag corner to corner |
| Oval | — | ✅ | Click-drag bounding box |
| Polygon | — | ✅ | Click vertices → dbl-click to close |
| Cloud | — | ✅ | Click vertices → scalloped revision cloud |
| Ink/Freehand | — | ✅ | Click-drag to draw (simplified path) |
| Hot Link | — | ✅ | Navigation marker → dbl-click to jump |

### F. Navigation (Row 2)
| Tool | Shortcut | Status | Description |
|------|----------|--------|-------------|
| Named Views | — (📌 button + dropdown) | ✅ | Save/restore page+zoom+scroll |
| Hot Links | — (🔗 annotation) | ✅ | Clickable markers that jump to named views |

### G. Style Controls (Row 4 — annotation-only)
| Control | Status | Options |
|---------|--------|---------|
| Stroke Color | ✅ | 6 presets: red, amber, green, blue, purple, white |
| Fill Color | ✅ | None + 5 semi-transparent fills |
| Line Width | ✅ | 1, 2, 3, 5 px |
| Opacity | ✅ | 30%, 50%, 70%, 100% |

---

## 3. Toolbar Layout (4 rows)

```
Row 1: ✕ Close │ File — Sheet │ Pan │ Scale │ Linear │ Area │ Count │ 📏 Measure │ Undo │ Redo │ ⟳ │ Names │ ⊾ Snap
Row 2: ◀ Prev │ Page selector │ Next ▶ │ Mark Done │ − % + │ W Fit │ P Fit │ 📌 Save View │ [Views ▾] │ Drawing/Summary
Row 3: Bid Area │ +Area │ CO+ │ CO− │ +PDF │ Show/Hide Sheets
Row 4: MARKUP │ T Text │ ↗ Arrow │ 💬 Callout │ — Line │ H Highlight │ ▭ Rect │ ○ Oval │ ⬠ Polygon │ ☁ Cloud │ ✎ Ink │ 🔗 Link │ Stroke: ●●● │ Fill: ●●● │ Wt: 1 2 3 5 │ Op: 30% 50% 70% 100%
```

---

## 4. Keyboard Shortcuts (Complete)

| Key | Action |
|-----|--------|
| Space (hold) | Temporary pan |
| Escape | Cancel current tool / close dialogs |
| Enter | Finish measurement / polygon / cloud |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete / Backspace | Delete selected |
| L | Linear mode |
| A | Area mode |
| C | Count mode |
| S | Calibrate mode |
| M | Measure (ruler) |
| T | Text annotation |
| H | Highlighter |
| N | Toggle condition names |
| F | Fit to width |
| + / = | Zoom in |
| - | Zoom out |
| Insert | New condition dialog |
| PageUp / PageDown | Prev / next page |
| 1-9 | Quick-select condition |
| Shift | Invert angle snap while held |

---

## 5. Annotation Architecture (Critical Rule)

**Annotation objects are visual markups ONLY.**

They:
- Are stored in `annotations[pageKey]` — separate from `measurements[pageKey]`
- Are NOT included in `condTotals`, `summaryRows`, or `exportToExcel`
- Have NO conditionId, bidAreaId, or cost
- CAN be selected, deleted, and styled
- Participate in undo/redo (action types: `ann_add`, `ann_delete`)
- Are persisted in takeoff save state (backward compatible: `_init.annotations || {}`)

---

## 6. Named Views Architecture

Stored in `namedViews` array (separate from annotations):
```javascript
{ id: "nv_...", name: "Detail A", pageKey: "0:5", pdfIdx: 0, page: 5, zoom: 2.5, scrollX: 340, scrollY: 120 }
```

Hot Links are annotation objects that reference a named view:
```javascript
{ id: "ann_...", type: "hotlink", pageKey, position: {x,y}, targetViewId: "nv_...", label: "..." }
```

Deleting a named view auto-cleans orphaned hotlinks.
