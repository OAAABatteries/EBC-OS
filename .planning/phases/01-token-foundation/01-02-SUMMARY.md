---
phase: 01-token-foundation
plan: 02
subsystem: design-tokens
tags: [tokens, shadows, semantic-colors, themes, constants]
dependency_graph:
  requires: [01-01]
  provides: [shadow-scale-tokens, semantic-status-aliases, semantic-phase-aliases]
  affects: [Phase 2 field components — will consume --shadow-sm/md/lg and --status-*/--phase-*]
tech_stack:
  added: []
  patterns: [CSS custom property aliasing via var(), per-theme shadow aesthetics]
key_files:
  created: []
  modified:
    - src/data/constants.js
decisions:
  - Per-theme shadow values rather than single global scale — neon themes (matrix/blueprint/anime/cyberpunk) use accent-colored glows, dark themes use black-opacity
  - Matrix shadow-sm=none preserves flat scanline aesthetic (no elevation illusion in terminal UI)
  - Semantic tokens use var() aliasing not hex — CSS cascade resolves at runtime per active theme
  - 12 semantic alias lines are identical across all 8 themes (color resolution differs because each theme defines its own --green/--amber/--red/--blue/--yellow/--text2/--text3 primitives)
metrics:
  duration: "~8 minutes"
  completed: "2026-03-30T19:37:46Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
requirements:
  - TOKN-06
  - TOKN-07
---

# Phase 01 Plan 02: Shadow Scale and Semantic Color Tokens Summary

**One-liner:** Per-theme shadow scale (sm/md/lg) and semantic status/phase color aliases added to all 8 THEMES entries in constants.js via CSS var() aliasing.

## What Was Built

Added 15 new CSS custom property tokens to each of the 8 THEMES entries (steel, blueprint, daylight, matrix, anime, ebc, midnight, cyberpunk) in `src/data/constants.js`:

**Shadow scale (3 tokens per theme):**
- `--shadow-sm` — subtle elevation, theme-appropriate
- `--shadow-md` — card-level elevation
- `--shadow-lg` — modal/overlay elevation

**Status semantic aliases (6 tokens per theme):**
- `--status-approved` → `var(--green)`
- `--status-pending` → `var(--amber)`
- `--status-denied` → `var(--red)`
- `--status-in-transit` → `var(--blue)`
- `--status-project` → `var(--text2)`
- `--status-office` → `var(--text3)`

**Phase semantic aliases (6 tokens per theme):**
- `--phase-active` → `var(--green)`
- `--phase-estimating` → `var(--amber)`
- `--phase-pre-construction` → `var(--blue)`
- `--phase-completed` → `var(--text3)`
- `--phase-warranty` → `var(--yellow)`
- `--phase-in-progress` → `var(--green)`

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Shadow scale tokens | `8f0aad1` | feat(01-02): add shadow scale tokens (sm/md/lg) to all 8 themes |
| Task 2: Semantic color aliases | `2bac4d2` | feat(01-02): add semantic status and phase color aliases to all 8 themes |

## Verification Results

- `grep -c "shadow-sm" src/data/constants.js` → 8
- `grep -c "shadow-md" src/data/constants.js` → 8
- `grep -c "shadow-lg" src/data/constants.js` → 8
- `grep -c "status-approved" src/data/constants.js` → 8
- `grep -c "phase-active" src/data/constants.js` → 8
- Matrix `--shadow-sm` = `"none"` (confirmed)
- Blueprint `--shadow-sm` = `"0 0 0 1px rgba(0,191,239,0.06)"` (confirmed)
- Existing `--shadow` and `--card-shadow` preserved in all 8 themes (8 each)
- No hard-coded hex values in semantic tokens (all use `var()`)
- MoreTabs.jsx not modified
- submittalsPackagePdf.js not modified

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Shadow values vary per theme | Neon themes require glow aesthetics; dark themes need opacity-based elevation |
| Matrix shadow-sm = none | Terminal/scanline aesthetic has no elevation — adding shadow would break the flat UI illusion |
| Semantic tokens use var() aliasing | CSS resolves at runtime; one set of alias lines works across all 8 themes without duplication |
| 12 alias lines identical in all 8 themes | The theme's primitive `--green`/`--amber` etc. already encode the per-theme color — no need for different alias values |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all tokens are fully wired. No components consume these tokens yet (Phase 2 will wire them), but the token definitions themselves are complete and non-stubbed.

## Self-Check: PASSED

- `src/data/constants.js` modified with 24 new token lines (8 themes x 3 shadow + 8 themes x 12 semantic = 120 new property entries)
- Commit `8f0aad1` exists: Task 1 shadow tokens
- Commit `2bac4d2` exists: Task 2 semantic aliases
- All acceptance criteria met per grep verification above
