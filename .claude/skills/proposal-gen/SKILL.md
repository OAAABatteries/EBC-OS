---
name: proposal-gen
description: Generate a construction proposal PDF from takeoff data. Use when the user says "generate proposal", "create bid", "make a proposal", "send quote", "proposal PDF", or "price this out".
allowed-tools: Read, Grep, Glob, Bash, Write
---

# Proposal Generator — Eagles Brothers Constructors

Generate professional construction proposals from EBC takeoff data. EBC is a drywall/framing sub in Houston — proposals go to general contractors.

## Context

- Proposal generation code: `src/utils/proposalPdf.js` (generateProposalPdf, generateQuickProposalPdf)
- Scope builder: `src/utils/scopeBuilder.js` (buildScopeLines)
- Default includes/excludes: `src/utils/proposalPdf.js` (defaultIncludes, defaultExcludes)
- Company info: `src/data/constants.js` or localStorage `ebc_company`
- Assemblies with pricing: `src/data/constants.js` (ASSEMBLIES)
- Takeoff data: localStorage `ebc_takeoffs`
- Bid data: localStorage `ebc_bids`

## Proposal Structure (EBC Standard)

### Header
- EBC logo + company info (Eagles Brothers Constructors, Houston TX)
- Date, proposal number
- To: GC name, project name, address

### Scope of Work
Organize by trade division:
1. **Metal Framing** — wall types, heights, gauges
2. **Drywall / Gypsum Board** — layers, types (Type X, moisture-resistant, abuse-resistant)
3. **Acoustical Ceilings** — ACT grid + tile, GWB ceilings
4. **Insulation** — batt type, R-value, locations
5. **Specialties** — fire caulking, corner bead, control joints, blocking
6. **Door Frames** — metal stud headers + jambs (count)

### Pricing
- Base bid total (materials + labor + margin)
- EBC standard margin: 15% on materials, 100% on labor (labor IS the profit)
- Alternates section (if any)
- Unit prices for change order pricing

### Inclusions
- Standard: layout per plans, furnish & install all materials, cleanup daily
- Coordination with other trades
- As-built documentation

### Exclusions (critical for EBC)
- Painting, taping compound finishing beyond Level 4
- Structural steel or concrete work
- Permits (by GC)
- Fire stopping at floor/wall penetrations (unless specifically in scope)
- Overtime/premium time unless noted
- Material storage — GC to provide

### Terms
- Valid for 30 days
- Payment: Net 30 from invoice
- Retainage: per contract
- Change orders: priced at unit rates above

## Workflow

1. Read the takeoff data (rooms, items, quantities)
2. Read the linked bid data (GC, project name, due date)
3. Calculate pricing:
   - For each item: qty × (matRate + labRate) × height factor × difficulty factor
   - Sum by category
   - Apply margin
4. Build scope lines using `buildScopeLines()` pattern
5. Generate the proposal using existing `generateProposalPdf()` or create markdown for review
6. Output: either trigger the existing PDF generator or create a reviewable markdown draft

## Output

If generating a draft for review:
```markdown
# PROPOSAL — [Project Name]
**To:** [GC Name]
**Date:** [Today]
**Proposal #:** EBC-[YYYY]-[###]

## Scope of Work
[organized by trade]

## Pricing
| Item | Qty | Unit | Rate | Total |
|------|-----|------|------|-------|
| ...  | ... | ...  | ...  | ...   |

**Base Bid Total: $XX,XXX**

## Inclusions
- ...

## Exclusions
- ...

## Terms & Conditions
- ...
```

Always present the draft for user review before finalizing.
