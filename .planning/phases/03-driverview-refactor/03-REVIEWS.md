---
phase: 3
reviewers: [copilot]
reviewed_at: 2026-03-31T22:15:00-05:00
plans_reviewed: [03-01-PLAN.md, 03-02-PLAN.md]
---

# Cross-AI Plan Review — Phase 3

## GitHub Copilot Review

### Summary

Two-wave refactor of DriverView.jsx (510 lines) to eliminate 42 inline styles and wire 7 shared field components. Wave 1 adds ~20 driver-specific CSS utility classes to styles.js. Wave 2 rewrites DriverView.jsx, wires shared components, and implements touch-friendly drag-and-drop with long-press initiation. This is a pilot refactor — the proven pattern will be replicated for EmployeeView (Phase 4) and ForemanView (Phase 5). Strong plan with solid architecture and clear constraints.

### Strengths

- Well-structured two-phase approach with clear dependency between CSS classes (Plan 01) and JSX rewrite (Plan 02)
- Comprehensive component reuse — eliminates redundant styling by leveraging existing shared components
- Mobile UX improvement baked in — D-03 improves touch drag-and-drop with long-press (400ms) + haptic feedback
- Accessibility-conscious — FieldButton/FieldInput enforce 44px touch targets (DRVR-02)
- Design token compliance — Plan 01 mandates var(--token) exclusively, zero hard-coded hex/px
- Detailed task breakdown — Specific line numbers, exact CSS classes, before/after snippets reduce ambiguity
- Bottom-nav pattern established — PortalTabBar (D-05) creates reusable pattern for all three portals
- Human checkpoint in Plan 02 catches regressions before Phase 4

### Concerns

#### HIGH

- **Touch DnD real-time reorder may cause jank on low-end mobile** (Plan 02 handleTouchMove) — `elementsFromPoint()` on every touchmove + state update = potential frame drops on older phones with 10+ stops. Needs throttle/debounce (50-100ms) and requestAnimationFrame batching.
- **FieldInput wrapper div may break schedule row layout** (Plan 02 note at line 316) — Plan explicitly states fallback path but it's untested. FieldInput wraps in `.field-input-wrapper` which may disrupt `.driver-schedule-row` flex layout.
- **CSS transform scale + backdrop-filter blur may conflict** (Plan 01 driver-route-card--held) — `transform:scale(1.02)` on held state + `backdrop-filter:blur(12px)` may render inconsistently on Safari/Firefox mobile.

#### MEDIUM

- **Plan 01 claims ~20 classes but actual list has ~35 definitions** — Mismatch between estimate and reality. If some are missing, Plan 02 will fail mid-execution.
- **handleTouchMove unconditionally prevents scroll** — `e.preventDefault()` when `heldIdx !== null` blocks all scrolling during drag, even accidental finger drift. Should conditionally prevent based on movement direction.
- **data-stop-idx targeting is fragile** — Touch DnD uses `cardEl.closest('[data-stop-idx]')`. If FieldCard or wrapper changes structure, selector breaks silently with no runtime error.
- **StatusBadge under-utilized** — Only 1 usage (delivered status on completed tab). Could be used for route card statuses too.

#### LOW

- **CSS class naming could conflict with pre-existing .driver-* classes** — Plan checks some but not all. Grep entire codebase for `driver-` before implementing.
- **navigator.vibrate() browser support untested** — Fails silently on ~5% of devices, but existing guard is sufficient.
- **Business logic not documented** — Executor must understand haversine, optimizeRoute, session, GPS without specification.
- **padding-bottom: 72px doesn't account for safe-area-inset-bottom** — Notched phones may have overlap. Use `max(72px, env(safe-area-inset-bottom))`.

### Suggestions

1. Add `touch-action: manipulation` and `will-change: transform` to `.driver-route-card` for better touch responsiveness
2. Throttle `handleTouchMove` to 16.67ms (60fps) to prevent jank on reorder
3. Add `.driver-content-pad` to Plan 01 CSS with safe-area handling: `padding-bottom: max(72px, env(safe-area-inset-bottom))`
4. Pre-test FieldInput layout in `.driver-schedule-row` flex context before committing to it
5. Use conditional `preventDefault` — only on significant vertical movement (>20px)
6. Write a "Touch DnD Mechanics" doc for Phase 4/5 executors to copy/paste
7. Add Vitest test for touch reorder logic (simulate touch events with elementsFromPoint mock)
8. Grep entire codebase for `driver-` class names before Plan 01 to catch pre-existing conflicts

### Risk Assessment

**MEDIUM** — Strong plan with solid architecture, but main risks are mobile performance (touch DnD jank) and layout fragility (FieldInput, scroll locking). Addressing the throttling, scroll prevention, and FieldInput layout concerns would reduce risk to LOW.

---

## OpenAI Codex Review

**UNAVAILABLE** — Codex CLI encountered 500 Internal Server Error + 401 Unauthorized connecting to OpenAI API. Review not obtained.

---

## Consensus Summary

### Single-Reviewer Key Findings (Copilot)

Since only one external reviewer was available, there is no multi-reviewer consensus. Key findings from Copilot:

**Top Priority Items:**
1. Throttle handleTouchMove to prevent jank on low-end devices
2. Pre-test FieldInput in schedule row flex context (have fallback ready)
3. Add touch-action: manipulation to CSS for better mobile responsiveness
4. Conditional scroll prevention during drag (not blanket preventDefault)
5. Safe-area-inset-bottom handling for notched phones

**Plan Verdict:** Strong enough to execute. Address performance concerns (throttling, conditional scroll lock) during implementation rather than replanning.
