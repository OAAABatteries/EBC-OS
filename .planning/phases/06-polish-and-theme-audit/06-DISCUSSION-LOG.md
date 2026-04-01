# Phase 6: Polish and Theme Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 06-polish-and-theme-audit
**Areas discussed:** Theme gauntlet strategy, Offline/sync indicator, Responsive verification, Touch/scroll globals

---

## Theme Gauntlet Strategy

### Audit Method

| Option | Description | Selected |
|--------|-------------|----------|
| Systematic manual checklist | Switch each theme on each portal, visually verify key screens | |
| Automated screenshot capture | Script switches themes + portals, captures screenshots for review | |
| You decide | Claude picks best approach based on codebase support | ✓ |

**User's choice:** You decide
**Notes:** Claude has full discretion on audit methodology.

### What Counts as Broken

| Option | Description | Selected |
|--------|-------------|----------|
| Only actual breakage | Missing CSS vars, white-on-white, broken layouts | |
| Breakage + readability | Above plus WCAG AA contrast failures | |
| Full polish | Fix everything -- broken vars, contrast, hover states, mismatched backgrounds | ✓ |

**User's choice:** Full polish
**Notes:** Every theme should feel intentional and professional.

### Outdoor Readability

| Option | Description | Selected |
|--------|-------------|----------|
| Daylight theme only | Optimize one theme for outdoor use | |
| Daylight + Blueprint | Two lightest themes optimized for outdoor/sunlight | ✓ |
| All themes outdoor-safe | Minimum contrast on all themes | |

**User's choice:** Daylight + Blueprint (user initially mentioned cowboy/rodeo theme which doesn't exist -- clarified to existing themes)
**Notes:** User wants a future cowboy/texas/rodeo theme -- noted as deferred idea.

### White Flash Prevention

| Option | Description | Selected |
|--------|-------------|----------|
| Initial load only | Prevent white flash before saved theme applies | |
| Both load + switch | Prevent flash on load AND smooth mid-session switching | |
| Not a priority | Field crews don't notice/care | ✓ |

**User's choice:** Not a priority

### Fun Themes Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Same full polish | Every theme professional, even playful ones | ✓ |
| Functional but relaxed | Fix breakage but don't obsess over novelty themes | |
| You decide | Claude determines based on severity | |

**User's choice:** Same full polish

### Known Issues

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing specific | General audit, no specific complaints | ✓ |
| Yes, let me describe | Specific broken areas to prioritize | |

**User's choice:** Nothing specific

### Hover States

| Option | Description | Selected |
|--------|-------------|----------|
| hover:hover everywhere | Apply hover only on devices with fine pointer | |
| Hover on all, subtle | Keep hover on all devices, make effects subtle | |
| You decide | Claude applies best approach per component | ✓ |

**User's choice:** You decide

### Dark Mode Contrast

| Option | Description | Selected |
|--------|-------------|----------|
| WCAG AA (4.5:1) | Industry standard | |
| 3:1 minimum | Relaxed standard for large text | |
| You decide | Practical balance for field crews | ✓ |

**User's choice:** You decide

### Theme Switching UX

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | Settings page picker is fine | |
| Add live preview | Mini preview before selecting | |
| Smooth transition | Brief CSS transition on theme switch | ✓ |

**User's choice:** Smooth transition

---

## Offline/Sync Indicator

### Indicator Style

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent banner | Always-visible strip showing connection status | ✓ |
| Toast + badge | Toast on status change + badge for pending count | |
| Floating pill | Small floating indicator | |

**User's choice:** Persistent banner

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inside PortalHeader | Single implementation, all portals inherit | |
| Separate component | New standalone NetworkBanner per portal | |
| You decide | Claude picks cleanest integration | ✓ |

**User's choice:** You decide

### Banner Content

| Option | Description | Selected |
|--------|-------------|----------|
| Status + pending count | Always show when offline | |
| Always visible | Green "Connected" even when online | |
| Offline-only + reconnect | Hidden when online, shows on offline/reconnect | ✓ |

**User's choice:** Offline-only + reconnect

---

## Responsive Verification

### 375px Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile-first, no breakpoint | Default styles ARE 375px, verify nothing overflows | |
| Add 375px breakpoint | Add @media(max-width:375px) for edge cases | |
| You decide | Audit at 375px, add breakpoints where needed | ✓ |

**User's choice:** You decide

### Tablet Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Scale mobile layout | Single-column, wider cards | |
| Optimize for tablet | Multi-column where warranted | |
| You decide | Determine per portal based on content density | ✓ |

**User's choice:** You decide

### Landscape Orientation

| Option | Description | Selected |
|--------|-------------|----------|
| Support both | Allow landscape, ensure layouts don't break | ✓ |
| Portrait preferred | Design for portrait, don't break landscape | |
| You decide | Determine per portal | |

**User's choice:** Support both

---

## Touch/Scroll Globals

### Global touch-action

| Option | Description | Selected |
|--------|-------------|----------|
| Global on body/html | Apply everywhere, override on canvas/signature only | ✓ |
| Keep per-component | Only on interactive elements | |
| You decide | Safest approach for full coverage | |

**User's choice:** Global on body/html

### Overscroll Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep global none | Already done, stricter than contain | |
| Switch to contain | Allows iOS rubber-band, prevents pull-to-refresh | |
| You decide | Pick based on mobile feel | ✓ |

**User's choice:** You decide

---

## Claude's Discretion

- Theme audit methodology
- Hover effect approach per component
- Dark theme contrast target
- Offline indicator placement (PortalHeader vs standalone)
- 375px fix approach
- Tablet layout optimization
- Overscroll-behavior value

## Deferred Ideas

- Cowboy/Texas/Rodeo theme (new theme, own phase)
- Live theme preview in settings
- Always-visible connection status bar
