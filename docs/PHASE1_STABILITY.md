# Phase 1 — Core Stability Fixes

> Created: 2026-03-25 · Before ANY new features, fix these.

---

## Tier 0 — Will Crash in Production

### 1. ❌ Canvas getContext null guard
**File:** `DrawingViewer.jsx` lines ~1127, 1153
**Bug:** `canvas.getContext("2d")` returns null if canvas is detached (React unmount race, browser tab throttling). Next line `ctx.setTransform(...)` crashes.
**Fix:** Add `if (!canvas || !ctx) return;` guard at top of render and drawOverlay callbacks.
**Risk:** HIGH — happens when switching pages fast or when browser background-throttles the tab.

### 2. ❌ Orphaned PDF render promise
**File:** `DrawingViewer.jsx` line ~1173
**Bug:** `p.render({ canvasContext: ctx, viewport: vp }).promise;` — promise created but never awaited or caught. If PDF page render fails (corrupted page, large image), error is swallowed silently.
**Fix:** Add `.catch(err => console.warn("Revision render failed:", err))`.

### 3. ❌ Missing condition ID → null crash in drawOverlay
**File:** `DrawingViewer.jsx` lines ~1219, 1343
**Bug:** `conditions.find(c => c.id === m.conditionId)` returns undefined when measurement references a deleted condition. Then `.color` access crashes: `Cannot read properties of undefined`.
**Fix:** Add `if (!cond) return;` or `const color = cond?.color || "#888";` fallback.
**Risk:** HIGH — happens when user deletes a condition that has measurements, then navigates to the page.

---

## Tier 1 — Silent Data Loss / Broken UX

### 4. ⚠️ Unbounded undo/redo stacks
**File:** `DrawingViewer.jsx` lines ~296-297
**Bug:** `undoStack` and `redoStack` arrays grow forever. After 1000+ edits in a long takeoff session, memory bloats and state updates slow down (React diffing larger arrays).
**Fix:** Cap at 200 entries: `setUndoStack(prev => [...prev, action].slice(-200))`.

### 5. ⚠️ PDF load errors silently blank the screen
**File:** `DrawingViewer.jsx` lines ~1097, 1184
**Bug:** `pdfjsLib.getDocument({ data }).promise.then(...)` has no `.catch()`. If PDF is corrupted or too large, user sees blank canvas with no feedback.
**Fix:** Add `.catch(err => { console.error("PDF load failed:", err); alert("Failed to load PDF: " + err.message); })`.

### 6. ⚠️ Supabase file operations swallow network errors
**File:** `src/lib/supabase.js` lines ~398-446
**Bug:** Error handling catches Supabase-level errors but not network exceptions (fetch failures, timeouts). Try/catch blocks return `null` with only `console.warn`.
**Fix:** Wrap in try/catch that also logs the full error, and surface failure to user when it's a PDF upload/download (not a background sync).

### 7. ⚠️ Annotation null guards missing
**File:** `DrawingViewer.jsx` annotation render section
**Bug:** `ann.position.x`, `ann.start.x`, `ann.anchorPt.x` accessed without null checks. Corrupted save data (old format, partial save) will crash the overlay render.
**Fix:** Add `if (!ann.position) return;` guards at top of each annotation type render.

---

## Tier 2 — Performance / Quality of Life

### 8. 🔧 Zoom=0 division guard
**File:** `DrawingViewer.jsx` line ~1214
**Bug:** `11 / Math.sqrt(zoom)` produces Infinity if zoom=0. Cascades NaN through label size calculations.
**Fix:** `const labelSize = Math.max(9, Math.min(14, 11 / Math.sqrt(zoom || 1)));`

### 9. 🔧 Assembly pricing always $0 without SDS setup
**File:** `src/data/assemblies.js`
**Status:** By design — assemblies need `matRate`/`labRate` configured in the SDS (Assembly Editor in Settings). Not a bug, but confusing for new users who see $0 everywhere.
**Fix:** Add a visual indicator in the condition panel: "⚠️ No pricing — configure in Settings > Assemblies".

### 10. 🔧 setTimeout cleanup on unmount
**File:** `DrawingViewer.jsx` lines ~2122-2220
**Bug:** `clickTimerRef.current` setTimeout callbacks may fire after component unmount during fast navigation.
**Fix:** Clear all timers in the component cleanup: `useEffect(() => () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); }, [])`.

---

## Implementation Priority

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Canvas null guard | 5 min | Prevents crashes |
| 3 | Condition null guard in drawOverlay | 5 min | Prevents crashes |
| 2 | Orphaned promise catch | 2 min | Prevents silent errors |
| 7 | Annotation null guards | 5 min | Prevents crashes |
| 8 | Zoom division guard | 1 min | Prevents NaN |
| 4 | Undo stack cap | 3 min | Prevents memory bloat |
| 5 | PDF load error handling | 5 min | User feedback |
| 10 | Timer cleanup | 3 min | Prevents React warnings |
| 6 | Supabase error surface | 10 min | Debugging aid |
| 9 | Assembly pricing indicator | 10 min | UX clarity |

**Total estimated effort: ~50 minutes**

---

## Rule

**Do NOT add new features until all Tier 0 and Tier 1 items are resolved.**
Tier 2 can ship alongside the next feature slice.
