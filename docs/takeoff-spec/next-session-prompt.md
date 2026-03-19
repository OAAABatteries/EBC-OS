# EBC-OS Next Session Prompt

Copy/paste this to start the next session:

---

EBC-OS Phase 3D: Takeoff Engine — Plan Management & OST Parity

## Context
Phase 1 (Foundation), Phase 2 (Project Intelligence), Phase 3 Sprints 1-8 are complete and deployed. The takeoff engine has: PDF viewer, 3 measurement modes, conditions system, templates, bid areas, multi-condition links, typical groups, CO overlay, Excel export, persistence, multi-PDF, auto-name, smooth zoom/pan.

**Check memory files and docs/takeoff-spec/ for full history.**

## What was tested
Real-world test with Marshalls San Antonio 25-page construction PDF revealed critical UX gaps vs OST (On-Screen Takeoff, our main competitor). User feedback screenshots from OST are saved in the conversation history.

## Known Issues (must fix first)
1. **Auto Name quality** — Title block text extraction works but results are inconsistent. Different PDF formats have title blocks in different positions (right strip vs bottom strip vs rotated). Needs smarter detection — possibly scan multiple regions and score candidates.
2. **PDF persistence reliability** — IndexedDB save/load was implemented but user reports plans still don't persist across sessions. Debug the IDB flow end-to-end.
3. **Double-click to finish measurement** — Works in code but feels unreliable. The browser fires 2 click events before the dblclick, adding extra vertices. Need click debouncing or a "finish" button visible during drawing.

## Priority 1: Plan Management Redesign (OST Cover Sheet equivalent)
OST starts every project with a "Cover Sheet" dialog:
- Project Name, Job No., Estimator, Bid Date, Notes
- **Plan Organizer** table: Sheet No. | Sheet Name | Page Size | Scale | Image File | Show
- Upload ALL PDFs first → Auto Name runs → user reviews/corrects → OK → takeoff begins
- Plans are permanently saved to the project

Our flow is backwards: "Open Drawing" is a temporary file picker that doesn't save. We need:
- **Plan Upload step** in the takeoff detail view (before opening DrawingViewer)
- Store PDFs in Supabase Storage (not just IndexedDB) so they persist across devices
- Plan table showing all uploaded sheets with auto-named info
- Then "Open Takeoff" launches DrawingViewer with all plans pre-loaded

## Priority 2: Measurement UX Polish
- Click debouncing for double-click finish (prevent extra vertices)
- Visual "Finish" button that appears while drawing a measurement
- Snap-to-endpoint when clicking near an existing vertex
- Measurement label editing (click to rename/annotate)
- Delete measurement from right-click context menu (already exists but verify)

## Priority 3: Auto Name V2
- Try multiple title block regions (right strip, bottom strip, bottom-right corner)
- Score candidates by: proximity to page edge, font size, presence of sheet number patterns
- Handle rotated text (some title blocks have vertical text)
- Parse sheet INDEX from cover page (Page 1 often has an Index of Drawings table)
- Auto-detect scale text and pre-fill calibration dialog

## Priority 4: Multi-Window / Split View
OST has separate windows for takeoff and annotation. We could do:
- Split view: plan on left, zoomed detail on right
- Or: floating magnifier window that follows cursor
- Picture-in-picture minimap showing full plan with viewport indicator

## Priority 5: Takeoff Boost Equivalent (AI)
OST's "Takeoff Boost" uses AI to auto-identify and measure walls, areas, counts in ~30 seconds. For EBC-OS:
- Use Claude API to analyze plan images and identify wall lines
- Auto-suggest conditions based on wall type symbols
- Auto-count doors from symbol recognition
- "You measured walls but no corner bead" suggestions

## Phase Summary

| Phase | What | Effort | Priority |
|-------|------|--------|----------|
| Fix bugs | Auto Name, IDB persistence, dblclick | 1 session | NOW |
| Plan Management | Upload flow, Supabase storage, plan table | 1-2 sessions | HIGH |
| Measurement UX | Finish button, snap, labels, debounce | 1 session | HIGH |
| Auto Name V2 | Multi-region, scoring, index parsing | 1 session | MEDIUM |
| Split View | Multi-window, magnifier, minimap | 1 session | MEDIUM |
| AI Takeoff Boost | Wall detection, auto-count, suggestions | 2-3 sessions | FUTURE |

Start by fixing the 3 known bugs, then tackle Plan Management.

---
