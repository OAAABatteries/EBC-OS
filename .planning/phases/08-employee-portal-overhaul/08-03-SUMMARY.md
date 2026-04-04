---
phase: 08-employee-portal-overhaul
plan: 03
subsystem: employee-portal
tags: [schedule, week-strip, shifts, time-off, offline-cache, supabase]
dependency_graph:
  requires: [08-01]
  provides: [ScheduleTab]
  affects: [EmployeeView]
tech_stack:
  added: []
  patterns: [supabase-query, localStorage-cache, bottom-sheet, week-strip]
key_files:
  created: []
  modified:
    - src/tabs/employee/ScheduleTab.jsx
decisions:
  - FieldSelect uses children (option elements) not options prop — matches actual component API
  - ShiftCard uses isOvertime prop not overtime — matches actual component API
  - status values passed as lowercase (scheduled, available, pending) to match StatusBadge conventions
metrics:
  duration: "2m"
  completed_date: "2026-04-04"
  tasks: 1
  files: 1
---

# Phase 8 Plan 03: ScheduleTab — Week Strip, Shifts, Time-Off, Offline Cache Summary

**One-liner:** Complete ScheduleTab with swipeable 7-day week strip, ShiftCard rendering for scheduled and available shifts, shift pickup inserting to shift_requests, time-off bottom sheet with FieldSelect/FieldInput form submitting to time_off_requests, inline time-off status, and localStorage offline cache.

## What Was Built

### Task 1: Complete ScheduleTab Implementation

Replaced stub `src/tabs/employee/ScheduleTab.jsx` (1 line) with full implementation (299 lines):

**Week Strip (SCHED-01):**
- 7-day strip derived via `useMemo` using `weekOffset` state
- Each cell shows day abbreviation, day number, and a dot indicator if shift exists
- `today` and `selected` conditional classes applied
- Swipe navigation via `onTouchStart`/`onTouchEnd` handlers (50px threshold)
- `aria-label` on each cell for accessibility

**Shift Display (SCHED-02):**
- Reads `mySchedule` prop filtered by selected day's `dayKey` (sun/mon/tue/wed/thu/fri/sat)
- Renders `ShiftCard` for each assignment with time range from `assignment.hours`, project name and address
- EmptyState with Calendar icon shown when no shifts and no time-off on selected day

**Available Shifts (SCHED-03, SCHED-04):**
- Supabase query: `from('available_shifts').eq('status','open').gte('date', weekStart).lte('date', weekEnd)`
- Supabase query: `from('shift_requests').eq('employee_id', activeEmp.id)` to check already-requested
- `alreadyRequested` and `requestStatus` merged into available shifts state
- Pick Up Shift button only rendered when `!shift.alreadyRequested`
- `handleShiftPickup` inserts `{ employee_id, shift_id, status: 'pending' }` to `shift_requests`
- Optimistic update: sets `alreadyRequested: true, requestStatus: 'pending'` in local state immediately

**Time-Off (SCHED-05, SCHED-06):**
- "Request Time Off" ghost button opens bottom sheet
- `sheet-overlay` + `sheet-container.open` CSS classes for slide-up panel
- `FieldInput type="date"` for Start Date and End Date
- `FieldSelect` with children options: Personal, Medical, Family, Other
- `FieldInput` for optional Notes
- `handleTimeOffSubmit` inserts to `time_off_requests` with date_start, date_end, reason, notes
- `loadTimeOffRequests` called after successful submit to refresh inline status
- Inline status on selected day: OFF — Requested (yellow), OFF — Approved (green), OFF — Denied (red)

**Offline Cache (SCHED-07):**
- On successful fetch: `localStorage.setItem('ebc_scheduleCache', ...)` with available shifts and requests
- On fetch error: reads `localStorage.getItem('ebc_scheduleCache')` as fallback
- `schedule-offline-notice` div shows "Last updated HH:MM" when `!isOnline && lastFetchedAt`
- Time formatted via `toLocaleTimeString` respecting `lang` prop (en/es)

Build passed with zero errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FieldSelect uses children, not options prop**
- **Found during:** Task 1 — reading FieldSelect.jsx before writing
- **Issue:** Plan spec showed `options={[{value, label}]}` array prop, but actual FieldSelect component signature uses `children` (standard `<select>` children pattern)
- **Fix:** Replaced `options={[...]}` with `<option value="...">` children inside FieldSelect
- **Files modified:** src/tabs/employee/ScheduleTab.jsx
- **Commit:** a7c6c42

**2. [Rule 1 - Bug] ShiftCard uses isOvertime, not overtime**
- **Found during:** Task 1 — reading ShiftCard.jsx before writing
- **Issue:** Plan spec passed `overtime={shift.overtime || false}` but actual ShiftCard prop is `isOvertime`
- **Fix:** Used `isOvertime={shift.overtime || false}` and `isOvertime={false}` for scheduled shifts
- **Files modified:** src/tabs/employee/ScheduleTab.jsx
- **Commit:** a7c6c42

**3. [Rule 1 - Bug] status values passed as lowercase to match StatusBadge**
- **Found during:** Task 1 — reviewing ShiftCard and StatusBadge conventions
- **Issue:** Plan spec showed uppercase status values (SCHEDULED, AVAILABLE, PENDING) but ShiftCard passes status directly to StatusBadge which uses lowercase conventions per Phase 7 components
- **Fix:** Used lowercase status values (scheduled, available, pending, and requestStatus.toLowerCase())
- **Files modified:** src/tabs/employee/ScheduleTab.jsx
- **Commit:** a7c6c42

## Known Stubs

None — all plan goals fully implemented.

## Self-Check: PASSED
