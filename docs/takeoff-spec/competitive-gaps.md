# EBC-OS vs OST — Competitive Gaps Analysis

## What OST Does Well (Don't Fight These)

### 1. Mature Measurement Engine
OST's measurement engine is battle-tested over 20+ years. Linear, area, count, and attachment conditions work reliably. The math is correct. Scale calibration is solid. **We must match this baseline — no measurement bugs are acceptable.**

### 2. Multi-Condition Takeoff (Patented)
Draw a single line/area and apply multiple conditions at once. Example: draw a wall run, and it simultaneously creates the framing LF, drywall SF (both sides), insulation, etc. This is a massive time saver and one of OST's key differentiators. **We need our own version of this.**

### 3. Typical Groups
Define a room's takeoff once, then stamp it across identical rooms. For hospitals with 40 patient rooms or hotels with 200 guest rooms, this saves days of work. **Must have for EBC — medical projects are our bread and butter.**

### 4. Bid Areas and Zones
Clean organizational structure: Bid > Bid Areas > Zones. Every piece of takeoff can be tagged to an area and zone. Summary tab can roll up by any of these. **We need this, but we can make it smarter.**

### 5. Summary/Export
Comprehensive summary with grouping by page, condition, area, zone. Export to Excel, integration with Quick Bid for pricing. **We already have Assembly-based pricing that's better than this.**

---

## What Frustrates OST Users (Attack Here)

### 1. Setup Time is Brutal
**The problem:** Before you can measure anything, you need to: import plans, rename sheets, set scale on every sheet, create 15-30 conditions with correct properties, set up bid areas. This can take 30-60 minutes before a single measurement is drawn.

**Our advantage:**
- AI sheet naming from title blocks
- Auto scale detection
- Assembly-linked condition templates
- One-click trade templates ("Medical Drywall Package")
- Smart bid area suggestions from sheet names
- **Target: 5 minutes from PDF drop to first measurement**

### 2. Condition Creation is Repetitive
**The problem:** Every new bid, you create the same conditions: 3-5/8" wall, 6" wall, ACT ceiling, GWB ceiling, insulation, etc. You can copy from a previous bid, but it's clunky and properties may not match the new project.

**Our advantage:**
- Conditions auto-create from Assembly codes (A2 → "3-5/8\" 20ga Wall")
- Trade templates with common combinations
- Smart suggestions based on project type
- Condition library that learns from your history
- **Target: 0 manual condition creation for typical bids**

### 3. No Cost Visibility During Takeoff
**The problem:** OST measures quantities. Quick Bid prices them. They're separate apps. While drawing takeoff, you have no idea if you're at $100K or $500K. You finish the entire takeoff, then discover the bid is way over/under.

**Our advantage:**
- Assembly rates are embedded in conditions
- Live running total updates as you draw
- Real-time cost breakdown by condition/area
- "You've drawn $180K of the $250K estimate so far"
- **We already have pricing built in — this is our killer feature**

### 4. No AI Assistance
**The problem:** OST is a purely manual tool. No auto-detection, no suggestions, no intelligence. You measure everything by hand.

**Our advantage:**
- AI symbol detection for doors/fixtures (count conditions)
- Auto-suggest missed items ("You measured walls but not corner bead")
- Benchmark validation ("Your wall ratio is low for this building type")
- AI gap analysis (already built in Phase 2)
- Profit suggestions (already built in Phase 3)
- **This is the moat — OST can't add AI without a rewrite**

### 5. Desktop-Only, No Collaboration
**The problem:** OST is a Windows desktop app. One person works on a bid at a time. No cloud sync, no mobile access, no real-time collaboration. You can't review takeoff from the jobsite.

**Our advantage:**
- EBC-OS is already web + mobile (Capacitor)
- Supabase cloud sync already built
- Multiple PMs can review the same bid
- Foreman can view takeoff on-site
- **This is table stakes for modern software**

### 6. Ugly, Dated UI
**The problem:** OST looks like it was designed in 2005 (because it was). Dense toolbars, tiny icons, grey everything. Intimidating for new users. No dark mode. No mobile responsiveness.

**Our advantage:**
- Modern dark theme already built
- Mobile-first responsive design
- Clean, minimal UI philosophy
- Role-based views (PM sees different things than estimator)
- **Our UI is already better**

### 7. Change Orders Are Painful
**The problem:** When plans are revised, OST has no built-in plan comparison. You have to manually figure out what changed, delete old takeoff, draw new takeoff, and manually calculate the delta. This is error-prone and time-consuming.

**Our advantage:**
- Plan overlay/comparison tool
- Change order mode tracks deltas automatically
- Revision audit trail
- "Show me everything that changed between Rev A and Rev B"
- **This is a huge value-add for GCs**

### 8. Licensing Cost
**The problem:** OST + Quick Bid costs ~$3,500-5,000/year per seat. For a small sub like EBC with 3 PMs, that's $10-15K/year for software that doesn't include project management, safety, or field tools.

**Our advantage:**
- EBC-OS is free/included — we own the software
- No per-seat licensing
- Includes PM tools, safety, field ops, time clock, proposals
- **Total cost of ownership: $0 vs $15K/year**

---

## Feature-by-Feature Comparison

| Feature | OST | EBC-OS Today | EBC-OS Target | Priority |
|---------|-----|-------------|---------------|----------|
| PDF plan viewing | Excellent | Good (PdfViewer) | Match OST | Must-have |
| Scale calibration | Excellent | Basic (DrawingViewer) | Match + auto-detect | Must-have |
| Linear measurement | Excellent | Basic (DrawingViewer) | Match OST | Must-have |
| Area measurement | Excellent | Basic (DrawingViewer) | Match OST | Must-have |
| Count measurement | Excellent | None | Build | Must-have |
| Attachment conditions | Good | None | Build | Nice-to-have |
| Multi-condition takeoff | Excellent (patented) | None | Build our version | Must-have |
| Conditions system | Excellent | Assembly-based | Merge: Conditions + Assemblies | Must-have |
| Condition templates | Good (copy from bid) | Trade templates | Better: AI + templates | Must-have |
| Bid areas | Good | Rooms in takeoff | Build proper bid areas | Must-have |
| Zones | Good | None | Build | Nice-to-have |
| Typical groups | Excellent | None | Build + AI detection | Must-have |
| Typical areas | Good | None | Build | Nice-to-have |
| Layers | Good | None | Build | Must-have |
| Summary/rollup | Good | Bid Summary exists | Enhance with area rollups | Must-have |
| Export to Excel | Good | Copy proposal text | Build Excel export | Must-have |
| Quick Bid integration | Excellent | N/A (we have assemblies) | Already better | Done |
| Assembly pricing | Via Quick Bid | Built-in | Already better | Done |
| Proposal generation | Via Quick Bid | Built-in PDF | Already better | Done |
| AI assistance | None | AI gap check, suggestions | Expand | Differentiator |
| Profit suggestions | None | Built (Phase 3) | Already better | Done |
| Cost visibility during takeoff | None | Partial (DrawingViewer) | Full live costing | Differentiator |
| Mobile access | None | Full (Capacitor) | Already better | Done |
| Cloud sync | None | Supabase sync | Already better | Done |
| Collaboration | None (single user) | Multi-user | Already better | Done |
| Dark mode / modern UI | None | Full theme system | Already better | Done |
| Change order tracking | Basic (alternates) | Basic (alternates) | Build plan comparison | Differentiator |
| Revision comparison | None | None | Build overlay tool | Differentiator |
| Keyboard shortcuts | Extensive | None in takeoff | Must build | Must-have |

---

## Strategic Priority Order

### Phase 3A: Match OST Core (Current Sprint)
1. Scale calibration with presets and verify ✅ (basic done)
2. Linear measurement with running totals ✅ (basic done)
3. Area measurement ✅ (basic done)
4. Count measurement
5. Conditions system (assembly-linked)
6. Layers

### Phase 3B: Beat OST Setup Speed
7. AI sheet classification + auto-naming
8. Auto scale detection from title blocks
9. Trade condition templates
10. Smart bid area suggestions

### Phase 3C: Beat OST Intelligence
11. Live cost counter during takeoff
12. Multi-condition takeoff (our version)
13. Typical groups with AI detection
14. Benchmark validation
15. AI symbol detection (door/fixture counting)

### Phase 3D: Beat OST Change Management
16. Plan overlay/comparison
17. Change order delta tracking
18. Revision audit trail

---

## The Pitch

> "EBC-OS Takeoff does what OST does, but sets up in 5 minutes instead of 60, shows you costs while you measure, suggests items you forgot to bid, and works from your phone on the jobsite. Oh, and it's free."
