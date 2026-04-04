---
phase: 08-employee-portal-overhaul
plan: 02
subsystem: employee-portal
tags: [home-tab, dashboard, clock-hero, stat-tiles, alerts, credentials]
dependency_graph:
  requires: [08-01]
  provides: [HomeTab, home-clock-hero, home-stat-row, home-alerts-section]
  affects: [EmployeeView, HomeTab]
tech_stack:
  added: []
  patterns: [reactive-props, useMemo-derivation, useCallback-async-load]
key_files:
  created: []
  modified:
    - src/tabs/employee/HomeTab.jsx
decisions:
  - Auto-refresh works via reactive props (weekTotal, isClockedIn, activeEntry) — no explicit refetch needed; now prop ticks every second for elapsed time
  - homeAlerts lang dependency is intentional — re-derives when language switches mid-session
  - greeting useMemo depends on now (not just once at mount) — ensures time-of-day updates if app is open across hour boundaries
metrics:
  duration: "2m"
  completed_date: "2026-04-04"
  tasks: 1
  files: 1
---

# Phase 8 Plan 02: HomeTab Implementation Summary

**One-liner:** HomeTab.jsx fully implemented — clock status hero with elapsed time, 3 tappable stat tiles, active project card, alerts feed (max 3 + View All) with credential expiry and material approval alerts sourced from supabase.

## What Was Built

### Task 1: HomeTab.jsx Full Implementation

Replaced stub with complete `src/tabs/employee/HomeTab.jsx` (~155 lines):

**Clock Status Hero (HOME-01):**
- `PremiumCard variant="hero" className="home-clock-hero"` taps to Clock tab via `setEmpTab("clock")`
- ON CLOCK / OFF CLOCK status text with `.home-clock-status.active` modifier
- Elapsed time via `clockElapsed` useMemo — `now` prop drives second-by-second updates
- Last punch time shown when off clock and last entry exists

**Stat Tiles Row (HOME-02):**
- `home-stat-row` div with 3 `StatTile` components
- Hours tile → `setEmpTab("log")`, Tasks tile → `setEmpTab("schedule")`, Pending tile → `setEmpTab("materials")`
- Values derived: weekTotal (prop), activeTaskCount (today's schedule), pendingCount (requested material requests)

**Active Project Card (HOME-03):**
- `assignedProject` useMemo finds today's schedule assignment then looks up project by ID
- Renders `PremiumCard variant="info" className="home-project-card"` only when assignment exists
- Taps to `setSelectedInfoProject(assignedProject.id)` for project detail view

**Alerts Feed (HOME-04, HOME-05, CRED-03):**
- Credentials loaded async from `supabase.from('certifications')` via `useCallback` + `useEffect`
- `homeAlerts` useMemo combines: credential expiry (error if expired, warning if ≤30 days) + material approvals (success)
- Sorted newest first; capped at 3 with View All button revealing full list
- Each `AlertCard` taps to `setEmpTab(alert.sourceTab)` routing to credentials/materials
- Empty state: `EmptyState` with `FieldButton ghost` "View Schedule" action

**Auto-Refresh (HOME-06):**
- All derived values are useMemo from props — shell state changes propagate automatically
- No explicit refetch needed for locally-derived stats

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — HomeTab is fully implemented. All data sources wired.

## Self-Check: PASSED

- File exists: src/tabs/employee/HomeTab.jsx — FOUND
- Task commit a424c5a — FOUND
- All acceptance criteria grep checks: PASSED (home-clock-hero, home-stat-row, home-alerts-section, setEmpTab, PremiumCard, StatTile, AlertCard, certifications, ON CLOCK, Good Morning, view-all-link, setEmpTab(alert.sourceTab))
- `npm run build` — PASSED (no errors, only pre-existing chunk size warnings)
