# EBC-OS Next Session Prompt

Copy/paste this to start the next session:

---

EBC-OS Phase 4A: Drawing Engine Polish — Continuous Mode & Labels

## Context
Phases 1-3 are complete. Full OST reverse-engineering analysis done (see docs/takeoff-spec/ost-feature-matrix.md). New phased roadmap V2 created (see docs/takeoff-spec/phased-build-roadmap-v2.md).

**Check memory files and docs/takeoff-spec/ for full history.**

## What's Done (from this session)
- Fixed 3 critical bugs: double-click finish (debounced), IDB PDF persistence (deps + logging), Auto Name V2 (multi-region scoring + noise filter + index parsing)
- Added angle snapping (default ON, Shift = free trace, 15° increments with angle badge)
- Added floating "Finish" button during drawing
- Fixed save-on-close race condition (handleClose flushes pending save)
- Fixed Resume Takeoff pipeline (DrawingViewer mounts without pdfData, loads from IDB)
- Added re-upload fallback UI when IDB cache is cleared
- Added drawing_state JSONB + drawing_file_name columns to Supabase schema
- Created full OST feature matrix (92 features analyzed, 28 done, 7 BETTER than OST)

## Current Scorecard
- 30% OST feature parity (28 of 92 features)
- 17% partial (16 features started)
- 52% missing (48 features)
- 7 features where we BEAT OST (pricing, live costing, profit suggestions, scope gap, proposals, OST import, bid scanning)

## Phase 4A Priority: Drawing Engine Polish (THIS SESSION)

### Sprint 1: Continuous Mode + Editing Basics
1. **Continuous mode** — after finishing a measurement, immediately start the next one (same mode, same condition). Toggle button in toolbar. This is the #1 speed improvement.
2. **Redo** (Ctrl+Y)
3. **Resize handles** — drag endpoints/corners to adjust measurements
4. **Mark Takeoff Complete** — per-page checkbox, green dot in page dropdown

### Sprint 2: Measurement Visibility & Labels
1. **Display condition name** on each measurement (toggleable)
2. **Display dimension label** centered on completed measurements
3. **Page indicators** in dropdown — blue dot = has measurements, green check = complete
4. **Right-angle indicator** — special 90° emphasis
5. **Hover tooltip** — condition name, qty, cost

## What's After This
- Phase 4B: Attachment conditions (doors subtract from walls) + Backout mode (ceiling holes)
- Phase 4C: Snap to Linear / Room auto-fill (double-click enclosed room → auto-fill area)
- Phase 4D: Plan Management Redesign (upload-first flow, Supabase Storage)
- Phase 4E: Copy/Move/Split/Resize editing
- Phase 4F: Annotations + Collaboration
- Phase 5: AI Takeoff Boost (wall detection, count detection, AI suggestions)

Start with Sprint 1 (Continuous Mode is the biggest win).

---
