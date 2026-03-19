# EBC-OS Takeoff Module — Phased Build Roadmap

## Current State (Phase 3 Complete)

What we already have:
- Basic DrawingViewer: PDF rendering, scale calibration, linear + area measurement, add-to-takeoff
- Assembly-based pricing with height factors
- Profit suggestions (corner bead, control joints, fire caulking, blocking, door frames, sidelights, punchlist)
- Proposal PDF generation
- Dashboard KPIs (backlog, receivables, labor utilization, win rate by GC)

---

## Phase 3A: Match OST Core (2-3 sessions)

**Goal:** Make the measurement engine production-ready. An estimator can do a real takeoff.

### Sprint 1: Conditions System
- [ ] Create `Condition` entity (LinearCondition, AreaCondition, CountCondition)
- [ ] Assembly-linked conditions (pick A2 → auto-creates wall condition)
- [ ] Conditions panel in DrawingViewer (right sidebar)
- [ ] Folder organization (Walls, Ceilings, Counts, Add-Ons)
- [ ] Color-coded measurements by condition
- [ ] Active condition selection for takeoff

### Sprint 2: Count Measurement
- [ ] Count mode in DrawingViewer (click to place marker)
- [ ] Count markers render on overlay (shape + number)
- [ ] Running count in sidebar
- [ ] Door frame, sidelight, fixture counting

### Sprint 3: Measurement Polish
- [ ] Undo/redo (Ctrl+Z / Ctrl+Y)
- [ ] Right-click context menu on measurements (edit, delete, change condition)
- [ ] Keyboard shortcuts (L/A/C for mode, Esc cancel, Space pan)
- [ ] Measurement labels with qty + condition name
- [ ] Hover tooltips on measurements

### Sprint 4: Scale Enhancements
- [ ] Scale presets dropdown (common arch scales)
- [ ] Scale verification prompt ("Measure a door to verify")
- [ ] Scale indicator always visible
- [ ] Warning if measurement seems impossible (e.g., 500' wall in a small room)

**Deliverable:** Estimator can open a PDF, set scale, create conditions, and do a complete wall/ceiling/door takeoff.

---

## Phase 3B: Beat OST Setup Speed (2 sessions)

**Goal:** Go from PDF to first measurement in under 5 minutes.

### Sprint 5: Multi-Sheet Support
- [ ] Upload multi-page PDF → auto-split into sheets
- [ ] Sheet navigator sidebar (thumbnail list)
- [ ] Sheet naming (manual edit)
- [ ] Per-sheet scale storage
- [ ] Navigate between sheets without losing measurements

### Sprint 6: Templates & Auto-Setup
- [ ] Trade condition templates (Medical, Commercial, Retail)
- [ ] "Apply Template" modal
- [ ] Copy conditions from previous bid
- [ ] Smart suggestions based on project phase
- [ ] Default condition set for new takeoffs

### Sprint 7: Bid Areas
- [ ] Create/manage bid areas (1st Floor, 2nd Floor, etc.)
- [ ] Assign measurements to bid areas
- [ ] Bid area selector in toolbar during takeoff
- [ ] Summary rollup by bid area

**Deliverable:** PM can set up a complete takeoff in 5 minutes using templates and then immediately start measuring.

---

## Phase 3C: Beat OST Intelligence (2-3 sessions)

**Goal:** The app is smarter than any manual tool.

### Sprint 8: Live Costing
- [ ] Live cost bar at bottom of Plan Viewer
- [ ] Per-condition cost in conditions panel
- [ ] Total bid cost updating in real-time
- [ ] Material vs labor breakdown
- [ ] "You're at $X of the $Y budget" indicator

### Sprint 9: Multi-Condition Takeoff
- [ ] "Wall Package" concept — link conditions together
- [ ] Draw a wall → auto-creates: LF + SF(both sides) + insulation SF
- [ ] Package templates (Wall Package, Ceiling Package)
- [ ] Configure which conditions are linked
- [ ] Each linked condition gets correct calculated qty

### Sprint 10: Takeoff Summary
- [ ] Summary sub-tab with grouped quantity table
- [ ] Group by: Condition, Bid Area, Sheet, Folder
- [ ] Export to Excel
- [ ] "Send to Estimate" button (populates existing Estimating rooms/items)
- [ ] Print takeoff report

### Sprint 11: Layers
- [ ] Layer creation and management
- [ ] Assign conditions to layers
- [ ] Show/hide layers
- [ ] Layer visibility toggle in sidebar
- [ ] Default layers: Walls, Ceilings, Demo, Specialties

**Deliverable:** Live costing during takeoff, multi-condition drawing, and professional summary output.

---

## Phase 3D: Advanced Features (3+ sessions)

**Goal:** Features that make EBC-OS genuinely better than OST.

### Sprint 12: Typical Groups
- [ ] Select measurements → "Create Typical Group"
- [ ] Name and save typical (e.g., "Standard Patient Room")
- [ ] Place instances on other sheets/areas
- [ ] Edit source → instances update
- [ ] Multiplier per instance

### Sprint 13: AI Assistance
- [ ] AI sheet classification from title blocks
- [ ] Auto scale detection from title block text
- [ ] Auto-suggest missed conditions ("You measured walls but no corner bead")
- [ ] Benchmark validation ("Wall LF/SF ratio is low for this building type")
- [ ] AI symbol detection for door/fixture counting (future)

### Sprint 14: Change Order Support
- [ ] Plan overlay (old vs new revision)
- [ ] Change order mode (additions green, deletions red)
- [ ] Net delta calculation
- [ ] Revision audit trail
- [ ] CO pricing with linked estimate

### Sprint 15: Collaboration & Polish
- [ ] Comments pinned to sheet locations
- [ ] Takeoff sharing (view-only for GC)
- [ ] Revision comparison view
- [ ] Mobile-optimized takeoff viewer
- [ ] Touch-friendly measurement tools

---

## Timeline Estimate

| Phase | Sessions | Calendar Time | Effort |
|-------|----------|---------------|--------|
| 3A: Core Engine | 2-3 | 1-2 weeks | ~2,000 lines |
| 3B: Setup Speed | 2 | 1 week | ~1,500 lines |
| 3C: Intelligence | 2-3 | 1-2 weeks | ~2,000 lines |
| 3D: Advanced | 3+ | 2-3 weeks | ~3,000 lines |
| **Total** | **9-11** | **5-8 weeks** | **~8,500 lines** |

---

## Success Metrics

### Phase 3A Complete
- Can do a real drywall takeoff from PDF
- Quantities match manual measurement within 2%
- 3 condition types working (linear, area, count)

### Phase 3B Complete
- New takeoff setup in under 5 minutes
- At least 3 trade templates available
- Multi-sheet PDF support working

### Phase 3C Complete
- Live cost counter during takeoff
- Multi-condition wall package working
- Summary export to Excel
- Direct flow to Estimating tab

### Phase 3D Complete
- Typical groups save 50%+ time on repetitive projects
- AI suggestions catch at least 3 commonly missed items
- Change order delta calculated automatically

---

## The North Star

**By the end of Phase 3D, an EBC estimator should be able to:**
1. Drop a 100-page PDF into EBC-OS (2 seconds)
2. See sheets auto-sorted and named (instant)
3. Apply "Medical Drywall" template (1 click)
4. Set scale on relevant sheets (2 minutes)
5. Do a complete wall/ceiling/door takeoff (30 minutes for a 15,000 SF floor)
6. See live cost updating as they measure ($X,XXX)
7. Get profit suggestions they would have missed ($2,000+ found money)
8. Send to estimate, generate proposal PDF (2 clicks)

**Total time: 35 minutes from email to proposal.**
**Current time with OST + manual pricing: 3-4 hours.**

That's the competitive moat.
