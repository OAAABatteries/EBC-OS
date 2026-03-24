---
name: takeoff-audit
description: Audit a takeoff for missing scope, incorrect quantities, and pricing errors. Use when reviewing a takeoff before submitting a bid, when the user says "audit", "check my takeoff", "review scope", "what am I missing", or "sanity check".
allowed-tools: Read, Grep, Glob, Bash
---

# Takeoff Audit — Eagles Brothers Constructors

You are auditing a drywall/framing takeoff for EBC (Eagles Brothers Constructors), a Houston-based drywall and metal framing subcontractor. Your job is to catch what the estimator missed before the bid goes out.

## Context

- EBC's profit comes from LABOR (100% markup on labor; materials are near pass-through)
- Assembly data lives in `src/data/constants.js` (ASSEMBLIES array with matRate/labRate)
- Takeoff data lives in localStorage key `ebc_takeoffs` (array of takeoff objects)
- Each takeoff has `rooms[].items[]` with `{code, qty, unit, height, diff}`
- Scope checklist is in `src/data/constants.js` (SCOPE_INIT — 18 items)
- Profit suggestions are in `src/data/constants.js` (PROFIT_SUGGESTIONS)

## Audit Checklist

Run through ALL of these checks:

### 1. Missing Scope (the #1 bid killer)
- [ ] Are ALL wall types from the partition schedule included?
- [ ] Is ceiling scope included (ACT, GWB, soffits)?
- [ ] Are insulation conditions included where specs require them?
- [ ] Door frames counted? (Rule of thumb: ~1 per 25 LF of wall)
- [ ] Sidelights counted?
- [ ] Corner bead included? (~15% of total wall LF)
- [ ] Control joints included? (~1 per 30 LF)
- [ ] Fire caulking at rated partitions? (~10% of wall LF)
- [ ] Blocking allowance? (~5% of total SF)
- [ ] Shaft wall systems for elevator/stair shafts?
- [ ] Lead-lined drywall where X-ray rooms are specified?
- [ ] ICRA barriers for occupied healthcare renovations?
- [ ] Above-ceiling framing?
- [ ] Patching at MEP penetrations?

### 2. Quantity Sanity Check
- Wall LF: Is total reasonable for the project square footage?
  - Rule of thumb: ~1.5-2.0 LF of wall per SF of floor area
  - Medical: higher (lots of small rooms) ~2.0-2.5 LF/SF
  - Office: lower (open floor plans) ~1.0-1.5 LF/SF
- Ceiling SF: Should be close to the floor area minus shaft/mechanical openings
- Door count: Cross-reference with door schedule if available
- Height factors: Are walls over 10' using the correct height factor?
  - 10' = 1.00x, 14' = 1.09x, 18' = 1.20x, 24' = 1.30x

### 3. Pricing Check
- Are matRate and labRate reasonable for each assembly?
- Is labor the dominant cost? (Should be 65-75% of total for EBC)
- Are profit add-ons included? Check against PROFIT_SUGGESTIONS
- Waste factor applied? (Standard 5-10% for drywall)

### 4. Bid Strategy
- Are there alternates that could win the job?
- Any value engineering opportunities to mention?
- Phasing considerations (multiple mobs = additional cost)?
- Off-hours work required?

## Output Format

```
## TAKEOFF AUDIT: [Project Name]
### Score: [A/B/C/D/F]

### Missing Scope (Critical)
- Item 1: description + estimated impact
- Item 2: ...

### Quantity Concerns
- Item 1: what looks off + suggested correction

### Pricing Notes
- Labor/material ratio: X% (target: 65-75%)
- Profit add-ons: [included/missing]

### Recommendations
1. Action item 1
2. Action item 2

### Estimated Impact
- Missing scope value: $X
- Potential over/under: +/- $X
```

## How to Run

1. Read the active takeoff from `ebc_takeoffs` in localStorage (or from `src/data/constants.js` for assemblies)
2. Read project-specific data if available (bid linked to takeoff)
3. Run through all checklist items
4. Output structured audit report
