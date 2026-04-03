# Phase 7: Premium Foundation - Research

**Researched:** 2026-04-03
**Domain:** React component architecture, CSS variable theming, Supabase SQL migrations
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card System (VIS-03, VIS-04)**
- D-01: Create a NEW `PremiumCard` component in `src/components/field/` with three variants: Hero, Info, Alert. Do NOT modify existing FieldCard -- it stays for backward compatibility.
- D-02: Hero variant: gradient bg (--bg2 to --bg3), 3px accent left border, shadow-sm. Info variant: flat --bg2, no shadow. Alert variant: accent-tinted bg (rgba), dot indicator.

**PortalHeader Eagle Logo (VIS-02)**
- D-04: Eagle logo always visible in PortalHeader across ALL themes -- not just EBC Brand. This is company identity, not theme-specific.
- D-05: Eagle logo is theme-aware -- use `ebc-eagle-white.png` as the base asset, apply CSS filter or swap to `eagle-blue.png` (Daylight) or other color variants as needed for contrast per theme.
- D-06: Asset already exists at `public/ebc-eagle-white.png` and `public/eagle-blue.png`. No new assets needed.
- D-07: Keep the existing `onError` fallback pattern (hide logo if image fails to load).

**Default Theme (VIS-01)**
- D-08: EBC Brand theme becomes the default for new users by changing `defaultTheme` in `src/App.jsx` (the `useLocalStorage("theme", "daylight")` call). Existing users who have a saved theme preference in localStorage keep their selection.

**EmptyState Redesign (VIS-05)**
- D-09: Every EmptyState instance MUST include an actionable button. No passive messaging. The action prop must always be populated.
- D-10: Visual refresh: Lucide icon 40px, heading in --text-base bold, body in --text-sm --text2, FieldButton primary as action.

**Supabase Schema (DATA-01, DATA-02, DATA-03)**
- D-11: SQL migration file in `supabase/` directory matching existing `schema.sql` pattern.
- D-12: Create `available_shifts` table: date, time_start, time_end, project_id, foreman_id, trade, overtime (boolean), status (open/claimed/cancelled), claimed_by (nullable employee_id), created_at, updated_at.
- D-13: Create `shift_requests` table: employee_id, shift_id (FK to available_shifts), status (pending/approved/denied), reviewed_by (nullable foreman_id), review_notes, created_at, updated_at.
- D-14: Extend `certifications` table with 3 new columns: `issuing_org` (TEXT), `photo_path` (TEXT, nullable), `cert_category` (TEXT).
- D-15: RLS policies created in Phase 7 alongside the tables -- tables must be secured from creation. Foremen: read/write shifts, review requests. Employees: read shifts, create requests, manage own certs.

**DrawingsTab Extraction (PLAN-03)**
- D-16: Full extraction from ForemanView.jsx -- the entire drawings tab becomes `src/components/field/DrawingsTab.jsx`.
- D-17: Props: `readOnly` (boolean), `projectFilter` (project ID or array), `onDrawingSelect` (optional callback).
- D-18: Self-contained Supabase queries from `project_drawings` table given a projectId.
- D-19: ForemanView replaces its inline drawings code with `<DrawingsTab readOnly={false} projectFilter={selectedProjectId} />`.

**Translations (VIS-06)**
- D-20: All new UI strings introduced in Phase 7 must have EN and ES translations added to the existing translations.js pattern.

**Hard constraints (not flexible):**
- PremiumCard is a NEW component, not a FieldCard modification
- Eagle logo always visible on all themes
- RLS policies created with the tables, not deferred
- DrawingsTab is self-contained with own Supabase queries
- No new npm dependencies
- px units for all sizing (not rem)

### Claude's Discretion

- PremiumCard migration boundary: PremiumCard is used for ALL new content in Phase 7 shared components (StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab all use PremiumCard variants internally). Existing portal-level pages do NOT adopt PremiumCard in Phase 7 -- portal adoption happens in Phases 8-9.
- Supabase migration delivery: SQL file in `supabase/` matching existing schema.sql pattern.
- Eagle logo: CSS filter on `ebc-eagle-white.png` base asset for non-EBC themes needing contrast adjustment.
- StatTile, AlertCard, ShiftCard, CredentialCard component API design (props, variants).
- Whether to create a new `--text-display` token for 28px hero numbers or use inline size. RESOLVED: `--text-display` token already exists in `tokens.css` at 28px.

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | `available_shifts` Supabase table created | Schema pattern confirmed in `supabase/schema.sql`; RLS pattern confirmed in `supabase/rls_policies.sql` |
| DATA-02 | `certifications` table extended with issuing_org, photo_path, cert_category | ALTER TABLE ADD COLUMN IF NOT EXISTS pattern confirmed in existing schema.sql |
| DATA-03 | `shift_requests` table created | Same pattern as DATA-01; FK to available_shifts required |
| VIS-01 | EBC Brand theme is default for new users | Default is hardcoded in `src/App.jsx` line 354: `useLocalStorage("theme", "daylight")` -- change "daylight" to "ebc" |
| VIS-02 | Eagle logo renders in PortalHeader across all 3 portals | PortalHeader already renders eagle; needs theme-aware CSS filter logic added |
| VIS-03 | FieldCard, FieldButton, PortalHeader, PortalTabBar, EmptyState updated to Premium Construction visual language | All files confirmed read; CSS changes go in styles.js; prop changes in component files |
| VIS-04 | Three card variants (Hero, Info, Alert) defined in styles.js using design tokens | CSS spec defined in UI-SPEC.md; --accent-rgb not yet in constants.js (see pitfalls) |
| VIS-05 | Empty states always include actionable button | EmptyState action prop is ReactNode slot; enforcement is documentation + caller convention, not hard prop validation |
| VIS-06 | All new UI strings have EN/ES translations | translations.js T object pattern confirmed; add entries for ~20+ new Phase 7 keys |
| PLAN-03 | Shared DrawingsTab component extracted from ForemanView with readOnly and projectFilter props | Source lines confirmed (93, 398-461, 818, 2729-2801); uses getDrawingsByProject, useDrawingCache, listFiles helpers |
</phase_requirements>

---

## Summary

Phase 7 is a foundation-setting phase with three parallel tracks: (1) Supabase schema extensions for new data entities, (2) visual design system updates across shared components, and (3) new shared components built once and consumed by Phases 8-9-10. No portal-level page layouts change.

The codebase has a well-established CSS variable system where all token work goes in `src/tokens.css` and `src/styles.js`, component definitions live in `src/components/field/`, and Supabase schema lives in `supabase/schema.sql`. Every prior phase has followed this pattern with strict discipline, and Phase 7 must continue it.

The single biggest pitfall is `--accent-rgb`. The UI-SPEC calls for `rgba(var(--accent-rgb, 255,127,33), 0.06)` on alert card backgrounds. This variable does not exist in any theme in `constants.js` -- only `--bg2-rgb` is defined per-theme. The planner must ensure a plan task either adds `--accent-rgb` to all 8 theme definitions in constants.js, or uses an alternate approach (e.g., `--amber-dim` which is already defined per theme). The existing `--amber-dim` values (`rgba(255,127,33,0.10)` for EBC) provide a working fallback.

**Primary recommendation:** Plan three track-based waves -- Wave 1: Supabase migration + schema; Wave 2: CSS/style system updates + default theme change; Wave 3: New component builds (PremiumCard, StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab extraction) + translations + barrel export update.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | (project existing) | Component authoring | Project standard |
| lucide-react | (project existing) | Icons in all new components | Established in Phase 2; all field components use it |
| @supabase/supabase-js | (project existing) | DrawingsTab self-contained queries | Already imported via `src/lib/supabase.js` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| src/lib/supabase.js | internal | Supabase client + helpers (getDrawingsByProject, listFiles) | DrawingsTab queries use these existing helpers |
| src/hooks/useDrawingCache.js | internal | Offline drawing caching | DrawingsTab uses this for offline support (dynamic import pattern from ForemanView) |
| src/data/translations.js | internal | EN/ES strings | All new user-facing strings added here |

### No New Dependencies
No new npm packages in Phase 7. This is a hard constraint from CONTEXT.md.

---

## Architecture Patterns

### Project Structure (established, Phase 7 adds to these)
```
src/
├── components/field/        # All shared field components (new: PremiumCard, StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab)
├── data/
│   ├── constants.js         # THEMES object, defaultTheme -- change "daylight" -> "ebc"
│   └── translations.js      # EN/ES T object -- add ~20 new Phase 7 keys
├── styles.js                # All CSS classes -- add premium-card-hero/info/alert + updated tab bar + empty state refresh
├── tokens.css               # CSS custom property definitions (--text-display already exists at 28px)
├── lib/supabase.js          # Supabase client -- no changes needed
└── tabs/
    └── ForemanView.jsx      # Remove inline drawings block, replace with <DrawingsTab />
supabase/
├── schema.sql               # Add new tables and column extensions (or add migration file alongside)
└── rls_policies.sql         # Reference pattern for new RLS policies
```

### Pattern 1: CSS Classes in styles.js
**What:** All component visual definitions live as string literals inside the `styles` export in `src/styles.js`. They are injected via a `<style>` tag in `main.jsx`.
**When to use:** Any new visual class for Phase 7 components. Do not use inline styles for theme-dependent values.
**Example (from existing codebase):**
```javascript
// Source: src/styles.js FIELD COMPONENTS section
.field-tab-item.active{color:var(--amber);font-weight:var(--weight-bold)}
```

**Phase 7 additions follow same pattern:**
```javascript
/* ══ PREMIUM CARDS ══ */
.premium-card-hero{background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid rgba(255,255,255,0.05);border-left:3px solid var(--accent);border-radius:var(--radius);padding:var(--space-4);box-shadow:var(--shadow-sm)}
.premium-card-info{background:var(--bg2);border:1px solid rgba(255,255,255,0.05);border-radius:var(--radius);padding:var(--space-3)}
.premium-card-alert{background:var(--amber-dim);border:1px solid rgba(255,127,33,0.12);border-radius:var(--radius-sm);padding:var(--space-3);position:relative}
.premium-card-alert::before{content:'';position:absolute;left:var(--space-3);top:50%;transform:translateY(-50%);width:6px;height:6px;border-radius:50%;background:var(--accent)}
```

### Pattern 2: Component Structure (from FieldCard/FieldButton precedent)
**What:** Minimal JSX wrappers that compose CSS class strings. No inline styles for theme values. Direct Lucide imports (not via LoadingSpinner barrel). Accept `className` prop for extensibility.
**When to use:** All new Phase 7 components.
**Example:**
```jsx
// Source: src/components/field/FieldCard.jsx -- established pattern
export function PremiumCard({ variant = 'info', alertType = 'warning', children, className, ...props }) {
  const variantClass = {
    hero: 'premium-card-hero',
    info: 'premium-card-info',
    alert: `premium-card-alert premium-card-alert--${alertType}`,
  }[variant] ?? 'premium-card-info';
  return (
    <div className={`${variantClass}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </div>
  );
}
```

### Pattern 3: Translations (from existing translations.js)
**What:** T object with English key -> `{ es: "Spanish translation" }`. Components call `t ? t("Key") : "Key"` where t is passed as prop.
**When to use:** Every user-visible string in Phase 7 components.
**Example:**
```javascript
// Source: src/data/translations.js
"Pick Up Shift": { es: "Tomar Turno" },
"Add Credential": { es: "Agregar Credencial" },
```

### Pattern 4: Supabase SQL Migration
**What:** Additions to `supabase/schema.sql` using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. RLS policies added immediately after each table.
**When to use:** DATA-01, DATA-02, DATA-03.
**Example (from existing schema.sql pattern):**
```sql
CREATE TABLE IF NOT EXISTS available_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         TEXT NOT NULL,
  time_start   TEXT NOT NULL,
  time_end     TEXT NOT NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  foreman_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  trade        TEXT DEFAULT '',
  overtime     BOOLEAN DEFAULT FALSE,
  status       TEXT DEFAULT 'open',
  claimed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_available_shifts_project ON available_shifts(project_id);
CREATE INDEX IF NOT EXISTS idx_available_shifts_date ON available_shifts(date);
ALTER TABLE available_shifts ENABLE ROW LEVEL SECURITY;
-- RLS: all authenticated users read; foremen can write
CREATE POLICY "available_shifts_read" ON available_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "available_shifts_write" ON available_shifts FOR ALL TO authenticated
  USING (get_user_role() IN ('foreman','owner','admin','pm'))
  WITH CHECK (get_user_role() IN ('foreman','owner','admin','pm'));
```

### Pattern 5: DrawingsTab Self-Contained Query
**What:** DrawingsTab owns its own Supabase fetch using `getDrawingsByProject` and `listFiles` from `src/lib/supabase.js`. It manages `cloudDrawings`, `drawingsLoading` state internally. Uses dynamic import for `useDrawingCache` (matches existing ForemanView pattern).
**When to use:** DrawingsTab.jsx -- all data fetching happens inside the component, not passed via props.

### Pattern 6: Theme-Aware Eagle Logo (CSS filter approach)
**What:** PortalHeader already renders `<img src="/ebc-eagle-white.png" className="portal-header-logo" onError={(e) => { e.target.style.display = 'none'; }} />`. Phase 7 adds CSS filter classes or inline filter based on active theme. The `daylight` theme uses a light background so the white eagle needs inversion. CSS filter `invert(1)` makes white -> black; `invert(0.8) sepia(1) saturate(0) hue-rotate(0deg)` can produce dark variants.
**Practical approach:** Pass `theme` prop to PortalHeader (already passes in ForemanView, EmployeeView via parent). Apply `className="portal-header-logo${theme === 'daylight' ? ' portal-header-logo--dark' : ''}"` and add the dark variant CSS class.

### Anti-Patterns to Avoid
- **`--accent-rgb` variable that doesn't exist:** The UI-SPEC CSS uses `rgba(var(--accent-rgb, 255,127,33), 0.06)`. This works via the fallback `255,127,33` BUT only renders correctly for the EBC theme. For all other themes, use `var(--amber-dim)` which is defined per-theme in constants.js and includes the correct rgba at 0.10 opacity. Alternatively, add `--accent-rgb` to all 8 THEMES definitions in constants.js.
- **Modifying FieldCard:** It is a backward-compat wrapper. PremiumCard is separate.
- **Skipping RLS on new tables:** DATA-01 and DATA-03 must have RLS policies in the same SQL block as CREATE TABLE. Never leave tables with only the generic `auth_full_access` policy.
- **Inline styles for theme values:** All theme-dependent values use CSS custom properties via class names in styles.js, not `style={{ color: var(--text) }}`.
- **rem units:** All sizing is px. tokens.css is 100% px. Do not introduce rem.
- **Deferred DrawingsTab prop validation:** `readOnly` must actually gate upload/delete actions in the extracted component. The ForemanView source shows no upload UI in the drawings tab currently -- but `readOnly=false` should still render the Refresh button; `readOnly=true` hides it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading spinner | Custom spinner | `LoadingSpinner` from `src/components/field/` | Already exists, theme-aware, established |
| Empty state | Custom empty div | `EmptyState` from `src/components/field/` | Phase 7 is refactoring EmptyState -- use the updated version |
| Supabase query boilerplate | Raw supabase.from() calls | Helper functions from `src/lib/supabase.js` | `getDrawingsByProject` already exists |
| Drawing cache | Custom IndexedDB | `useDrawingCache` hook | Already exists with revision-staleness logic |
| Button with loading | Custom button | `FieldButton` with loading prop | Phase-2 established component; self-contained Loader2 |
| Async state wrapper | try/catch + state vars in every component | `AsyncState` from `src/components/field/` | Handles loading/empty/error uniformly |
| CSS variable theme | Inline hex colors | Tokens from `tokens.css` + theme vars from `constants.js` | The entire theme system depends on this |
| Status colors | Custom badge | `StatusBadge` from `src/components/field/` | Already handles approved/pending/denied/in-transit |

**Key insight:** Every visual and data-handling primitive already exists. Phase 7 is composition, not invention.

---

## Critical Discovery: defaultTheme Location

**Finding (HIGH confidence, direct code read):**

The CONTEXT.md refers to changing `defaultTheme` in `src/data/constants.js` -- but that property does not exist in constants.js. The actual default is in `src/App.jsx` line 354:

```javascript
const [theme, setTheme] = useLocalStorage("theme", "daylight");
```

The string `"daylight"` is the default. Changing it to `"ebc"` implements VIS-01. The planner must target `src/App.jsx`, not `src/data/constants.js`, for this change.

---

## Critical Discovery: Alert Card --accent-rgb Gap

**Finding (HIGH confidence, direct code read):**

The UI-SPEC CSS for `.premium-card-alert` uses:
```css
background: rgba(var(--accent-rgb, 255,127,33), 0.06);
border: 1px solid rgba(var(--accent-rgb, 255,127,33), 0.12);
```

`--accent-rgb` is not defined in any theme in `constants.js`. Only `--bg2-rgb` is defined per-theme.

**Recommended resolution:** Use `var(--amber-dim)` for the alert background since it is already defined per-theme with the correct rgba format. Or add `--accent-rgb` to all 8 theme definitions. The planner must pick one approach and create a task for it.

The existing `--amber-dim` values from constants.js are:
- EBC: `rgba(255,127,33,0.10)` -- matches spec intent at 0.06 (spec value is slightly more transparent)
- All other themes: defined with their respective accent colors at 0.10 opacity

**Simplest approach:** Use `var(--amber-dim)` at full value (0.10 opacity). The visual difference from 0.06 is imperceptible on a phone screen.

---

## Common Pitfalls

### Pitfall 1: DrawingsTab -- Dynamic Import Pattern
**What goes wrong:** Importing `useDrawingCache` at the top of DrawingsTab.jsx causes issues because ForemanView uses it as a dynamic import (`const { useDrawingCache } = await import("../hooks/useDrawingCache")`).
**Why it happens:** The hook is used inside an async event handler, not at component top-level in ForemanView's pattern.
**How to avoid:** In DrawingsTab, use standard top-level import: `import { useDrawingCache } from '../hooks/useDrawingCache'` -- this is correct for a dedicated component. The dynamic import in ForemanView was a code-smell from inline implementation. DrawingsTab as a real component should use static import.
**Warning signs:** If you see `await import()` calls for hooks, refactor to static import when extracting to a proper component.

### Pitfall 2: PortalHeader Theme Prop Not Always Passed
**What goes wrong:** PortalHeader receives a CSS filter for theme-aware eagle logo, but the `theme` prop isn't passed in all portal callsites.
**Why it happens:** PortalHeader currently does not accept `theme` as a prop. Adding it requires updating all three portal callsites (ForemanView, EmployeeView, DriverView).
**How to avoid:** Add `theme` as an optional prop with a default of `null`. Apply the dark logo filter conditionally: only `daylight` theme needs inversion since all others have dark backgrounds. Test in DriverView and EmployeeView too.
**Warning signs:** Eagle logo invisible or invisible-against-background in daylight theme.

### Pitfall 3: translations.js Key Collisions
**What goes wrong:** Adding a new key that already exists with different wording.
**Why it happens:** The T object has 200+ keys. Phase 7 adds ~20+ new ones. Some may duplicate existing keys.
**How to avoid:** Search translations.js for partial matches before adding. Keys like "Schedule" already exist (`"Schedule": { es: "Horario" }`). For new Phase 7 schedule-related strings use more specific keys: `"No shifts scheduled"`, `"Pick Up Shift"`, etc.
**Warning signs:** t() returning wrong string in one language.

### Pitfall 4: EmptyState Icon Size Override
**What goes wrong:** EmptyState currently passes `size={48}` to the Icon component. Phase 7 spec says 40px. Changing the hardcoded size breaks all existing callsites.
**Why it happens:** The size is hardcoded in EmptyState.jsx rather than using a prop.
**How to avoid:** Change the hardcoded `size={48}` to `size={40}` in EmptyState.jsx. This is a global visual change but the 8px delta is imperceptible and aligns with the design spec. No prop change needed since no existing callsite passes a custom icon size.

### Pitfall 5: ForemanView Drawings State After DrawingsTab Extraction
**What goes wrong:** After extracting DrawingsTab, ForemanView still has the now-orphaned state variables (`cloudDrawings`, `drawingsLoading`, `downloadedDrawings`, `activeDrawingId`, `activeDrawingPath`, `activeDrawingData`, `activeDrawingName`) and handler functions (`loadCloudDrawings`, `handleViewDrawing`, `handleDownloadDrawing`).
**Why it happens:** Extraction leaves dead code if not cleaned up.
**How to avoid:** After confirming DrawingsTab renders correctly via the new component, delete ALL drawings state and handlers from ForemanView. The PDF viewer overlay (`{activeDrawingData && <PdfViewer ...>}`) must move into DrawingsTab since DrawingsTab owns the view state.
**Warning signs:** ForemanView exceeds 3000 lines post-extraction (it should shrink by ~100+ lines).

### Pitfall 6: RLS Policy Conflicts on New Tables
**What goes wrong:** If the generic `auth_full_access` policy was previously applied (as in schema.sql's permissive block), creating new role-specific policies causes a conflict.
**Why it happens:** schema.sql has a DO loop that creates `auth_full_access` for ALL tables. New tables created after that loop won't have it, but the loop runs on ALL tables at setup.
**How to avoid:** In the migration SQL, explicitly call `DROP POLICY IF EXISTS "auth_full_access"` before creating role-specific policies. The rls_policies.sql file already does this at the top (drops anon_full_access and auth_full_access). New migration tables get fresh policies only.

---

## Code Examples

### PremiumCard Component
```jsx
// Source: CONTEXT.md D-01/D-02 + UI-SPEC.md Component Inventory
// File: src/components/field/PremiumCard.jsx
export function PremiumCard({ variant = 'info', alertType = 'warning', children, className, ...props }) {
  const variantClass = {
    hero: 'premium-card-hero',
    info: 'premium-card-info',
    alert: `premium-card-alert premium-card-alert--${alertType}`,
  }[variant] ?? 'premium-card-info';

  return (
    <div className={`${variantClass}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </div>
  );
}
```

### StatTile Component
```jsx
// Source: UI-SPEC.md Component Inventory
// File: src/components/field/StatTile.jsx
export function StatTile({ label, value, color = '--text', onTap }) {
  return (
    <button
      className="stat-tile touch-target focus-visible"
      onClick={onTap}
      style={{ color: `var(${color})` }}
    >
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
    </button>
  );
}
```
CSS in styles.js:
```
.stat-tile{display:flex;flex-direction:column;align-items:center;gap:var(--space-1);padding:var(--space-2) var(--space-3);background:var(--bg2);border:1px solid rgba(255,255,255,0.05);border-radius:var(--radius);cursor:pointer;min-height:var(--touch-min);min-width:var(--touch-min);border:none}
.stat-tile-value{font-size:var(--text-lg);font-weight:var(--weight-bold);line-height:var(--leading-tight)}
.stat-tile-label{font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--text3);text-transform:uppercase;letter-spacing:var(--tracking-wider)}
```

### DrawingsTab Component Skeleton
```jsx
// Source: ForemanView.jsx lines 93, 398-461, 818, 2729-2801 + CONTEXT.md D-16/D-17/D-18
// File: src/components/field/DrawingsTab.jsx
import { useState, useEffect, useCallback, Suspense } from 'react';
import { FileText } from 'lucide-react';
import { getDrawingsByProject, listFiles } from '../../lib/supabase';
import { useDrawingCache } from '../../hooks/useDrawingCache';
import { FieldCard } from './FieldCard';
import { FieldButton } from './FieldButton';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export function DrawingsTab({ readOnly = false, projectFilter, onDrawingSelect }) {
  const [cloudDrawings, setCloudDrawings] = useState([]);
  const [drawingsLoading, setDrawingsLoading] = useState(false);
  const { getCachedDrawing, cacheDrawing, removeCachedDrawing } = useDrawingCache();
  // ... fetch logic extracted from ForemanView loadCloudDrawings
  // ... readOnly gates Refresh button and Download actions
}
```

### available_shifts SQL Migration
```sql
-- Source: CONTEXT.md D-12 + supabase/schema.sql pattern
CREATE TABLE IF NOT EXISTS available_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date         TEXT NOT NULL DEFAULT '',
  time_start   TEXT NOT NULL DEFAULT '',
  time_end     TEXT NOT NULL DEFAULT '',
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  foreman_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  trade        TEXT DEFAULT '',
  overtime     BOOLEAN DEFAULT FALSE,
  status       TEXT DEFAULT 'open',
  claimed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_available_shifts_project ON available_shifts(project_id);
CREATE INDEX IF NOT EXISTS idx_available_shifts_date ON available_shifts(date);
ALTER TABLE available_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "available_shifts_read" ON available_shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "available_shifts_write" ON available_shifts
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('foreman','owner','admin','pm'))
  WITH CHECK (public.get_user_role() IN ('foreman','owner','admin','pm'));
CREATE POLICY "available_shifts_employee_claim" ON available_shifts
  FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'employee')
  WITH CHECK (public.get_user_role() = 'employee');
```

### certifications Extension
```sql
-- Source: CONTEXT.md D-14 + existing certifications table (confirmed no these columns)
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS issuing_org TEXT DEFAULT '';
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cert_category TEXT DEFAULT '';
```

### Default Theme Change
```javascript
// Source: src/App.jsx line 354 (confirmed via direct read)
// Change:
const [theme, setTheme] = useLocalStorage("theme", "daylight");
// To:
const [theme, setTheme] = useLocalStorage("theme", "ebc");
```

### PortalHeader Theme-Aware Logo
```jsx
// Source: PortalHeader.jsx + CONTEXT.md D-05/D-06
// Add theme prop to PortalHeader signature
export function PortalHeader({ ..., theme }) {
  // daylight theme has light bg -- white eagle won't show
  const logoClass = `portal-header-logo${theme === 'daylight' ? ' portal-header-logo--dark' : ''}`;
  return (
    <>
      <header className={`header ${className || ''}`.trim()}>
        <img
          src="/ebc-eagle-white.png"
          alt="EBC Eagle"
          className={logoClass}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {/* rest of header ... */}
      </header>
    </>
  );
}
```
CSS addition to styles.js:
```
.portal-header-logo--dark{filter:invert(1) brightness(0.3)}
```

---

## Existing Asset Inventory

### Already Exists -- No Work Needed
| Asset | Location | Notes |
|-------|----------|-------|
| `--text-display` token | `src/tokens.css` line 16 | 28px, already defined |
| `--weight-bold` / `--weight-normal` | `src/tokens.css` | 700 / 400, already defined |
| `--space-1` through `--space-12` | `src/tokens.css` | All spacing tokens defined |
| `--shadow-sm` | Per-theme in `constants.js` | Varies per theme |
| `--radius`, `--radius-sm` | Per-theme in `constants.js` | Used in PremiumCard CSS |
| `--amber-dim` | Per-theme in `constants.js` | Use for alert card bg fallback |
| `ebc-eagle-white.png` | `public/ebc-eagle-white.png` | D-06 confirmed |
| `eagle-blue.png` | `public/eagle-blue.png` | D-06 confirmed |
| `getDrawingsByProject` helper | `src/lib/supabase.js` | DrawingsTab primary query |
| `listFiles` helper | `src/lib/supabase.js` | DrawingsTab fallback query |
| `useDrawingCache` hook | `src/hooks/useDrawingCache.js` | DrawingsTab offline support |
| `get_user_role()` SQL function | `supabase/rls_policies.sql` | Use in new RLS policies |

### New CSS Classes Needed in styles.js
| Class | Purpose |
|-------|---------|
| `.premium-card-hero` | Hero card variant |
| `.premium-card-info` | Info card variant |
| `.premium-card-alert` | Alert card variant (with ::before dot) |
| `.premium-card-alert--warning/success/error/info` | Alert type color variants |
| `.stat-tile` | StatTile button layout |
| `.stat-tile-value` | Large number in stat tile |
| `.stat-tile-label` | Uppercase label in stat tile |
| `.portal-header-logo--dark` | CSS filter for daylight theme eagle |
| Updated `.field-tab-item.active` | Add `scale(0.95)` on active state per UI-SPEC |
| Updated `.field-tab-bar` | `border-top: rgba(255,255,255,0.05)` per UI-SPEC |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline drawings block in ForemanView | Extracted DrawingsTab component | Phase 7 | Enables Phase 8 Employee + Phase 9 Driver to mount DrawingsTab without duplication |
| Steel / Daylight as default theme | EBC Brand as default | Phase 7 | New users see company branding immediately |
| PremiumCard (doesn't exist) | New 3-variant card system | Phase 7 | Replaces ad-hoc card patterns in Phase 8+ |
| EmptyState without required action | EmptyState always has action button | Phase 7 | Eliminates passive dead-end states |

---

## Environment Availability

Step 2.6: This phase is code and SQL changes with no new external dependencies beyond the already-configured Supabase project and existing npm packages. No availability audit required.

---

## Validation Architecture

Config check: `workflow.nyquist_validation` not present in `.planning/config.json` -- treat as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (established Phase 2) |
| Config file | `vite.config.js` or `vitest.config.js` -- check Phase 2 plan for exact config |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | available_shifts table schema correct | manual (SQL) | Run migration in Supabase dashboard | N/A |
| DATA-02 | certifications has new columns | manual (SQL) | Run migration in Supabase dashboard | N/A |
| DATA-03 | shift_requests table schema correct | manual (SQL) | Run migration in Supabase dashboard | N/A |
| VIS-01 | New users get EBC theme by default | manual | Clear localStorage, reload app | N/A |
| VIS-02 | Eagle logo renders in PortalHeader | visual | Open each portal, check header | N/A |
| VIS-03 | Premium Construction language applied | visual | Check all 3 portals across 8 themes | N/A |
| VIS-04 | Three PremiumCard variants visually distinct | unit | `npm test -- PremiumCard` | Wave 0 |
| VIS-05 | EmptyState always has action button | unit | `npm test -- EmptyState` | Exists (Phase 2) |
| VIS-06 | All new strings have EN/ES | manual | Switch lang in app, check for raw keys | N/A |
| PLAN-03 | DrawingsTab renders with readOnly + projectFilter props | unit | `npm test -- DrawingsTab` | Wave 0 |

### Wave 0 Gaps
- [ ] `tests/DrawingsTab.test.jsx` -- covers PLAN-03 (new component, no test file)
- [ ] `tests/PremiumCard.test.jsx` -- covers VIS-04 (new component, no test file)

*(EmptyState test from Phase 2 exists -- verify it covers action prop requirement after Phase 7 changes)*

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 7 |
|-----------|-------------------|
| NEVER create files unless absolutely necessary | All CSS goes in existing `styles.js`; new components are required new files; no extra files |
| ALWAYS prefer editing existing files | `styles.js`, `tokens.css`, `translations.js`, `App.jsx`, `PortalHeader.jsx`, `EmptyState.jsx`, `PortalTabBar.jsx`, `FieldButton.jsx`, `index.js` are edits |
| ALWAYS read file before editing | Planner must include read steps before any edit |
| Files under 500 lines | All new components must stay under 500 lines; DrawingsTab will be ~150-200 lines |
| px units for all sizing | Enforced globally; rem is explicitly out of scope |
| No new npm dependencies | Hard constraint; all Phase 7 work uses existing packages |
| ALWAYS run tests after code changes | `npm test` after each plan |
| ALWAYS verify build succeeds before committing | `npm run build` after each plan |

---

## Sources

### Primary (HIGH confidence)
- `src/App.jsx` line 354 -- actual defaultTheme location (`useLocalStorage("theme", "daylight")`)
- `src/components/field/PortalHeader.jsx` -- current eagle logo implementation
- `src/components/field/FieldCard.jsx` -- PremiumCard composition pattern
- `src/components/field/EmptyState.jsx` -- current implementation + action slot
- `src/components/field/PortalTabBar.jsx` -- tab bar active state pattern
- `src/components/field/FieldButton.jsx` -- button pattern for new components
- `src/components/field/index.js` -- barrel export (needs PremiumCard, StatTile, AlertCard, ShiftCard, CredentialCard, DrawingsTab added)
- `src/styles.js` -- CSS injection pattern; all new CSS classes go here
- `src/tokens.css` -- confirmed --text-display: 28px exists, all spacing tokens exist
- `src/data/constants.js` -- THEMES object, --amber-dim per theme, --bg2-rgb exists but --accent-rgb does NOT exist
- `src/data/translations.js` -- T object pattern for EN/ES additions
- `src/lib/supabase.js` -- getDrawingsByProject, listFiles helpers available
- `src/tabs/ForemanView.jsx` lines 88-96, 398-461, 818, 2729-2830 -- DrawingsTab extraction source
- `supabase/schema.sql` -- CREATE TABLE patterns, UPDATE trigger, RLS patterns
- `supabase/rls_policies.sql` -- get_user_role() function, role-based policy pattern
- `.planning/phases/07-premium-foundation/07-CONTEXT.md` -- locked decisions
- `.planning/phases/07-premium-foundation/07-UI-SPEC.md` -- visual contract

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` Accumulated Context -- Phase 1, 2, 6 decision log
- `.claude/skills/supabase-migrate/SKILL.md` -- migration file naming convention

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are existing project dependencies; no new additions
- Architecture: HIGH -- patterns read directly from source files
- Pitfalls: HIGH -- specific pitfalls identified from direct code inspection (--accent-rgb gap, defaultTheme in App.jsx not constants.js, dynamic import pattern)
- SQL migration: HIGH -- schema.sql and rls_policies.sql patterns read directly

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable project; no fast-moving external dependencies)
