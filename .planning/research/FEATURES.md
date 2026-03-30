# Feature Landscape: Field Portal UI Refactor

**Domain:** Construction field worker mobile portals (Foreman, Employee, Driver)
**Researched:** 2026-03-30
**Scope:** UI/UX patterns only — no new business logic, presentation layer refactor

---

## Research Basis

This research draws from analysis of Procore, Fieldwire, PlanGrid (Autodesk), and BuilderTrend mobile patterns,
plus industrial UX literature on screen readability, haptics, offline-first PWA design, and construction-specific
UX challenges. The EBC-OS codebase was audited directly (ForemanView: 3953 lines, EmployeeView: 1745 lines,
DriverView: 510 lines). Findings are categorized by confidence level.

**Existing baseline (already built, not re-scope):**
Role-based portals, GPS geofence clock-in, material request workflow, JSA with signatures, drawing viewer
with offline cache, driver route optimization, i18n EN/ES, 5-theme system.

**Known debt to fix:**
768+ inline styles, 20+ hard-coded hex values, touch targets at 18-24px (need 44px), 12+ ad-hoc font
sizes, ~40% missing loading/error states, inconsistent card/button patterns.

---

## Table Stakes

Features/patterns where absence makes the app feel broken or unprofessional.
Missing any of these = crews distrust the tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 44px minimum touch targets on all interactive elements | Gloved-hand standard. WCAG 2.5.5 requires 44x44px. Current EBC-OS targets are 18-24px — this is the single biggest gap. | Low | CSS change only. Audit every button, tab, icon-only hit area. |
| Skeleton screens on every async data load | Field workers on LTE/3G; blank screens read as "broken app." Skeleton communicates structure is coming. Skeleton outperforms spinner for perceived performance. | Medium | Implement per-section, not full-page. Mirror real layout shapes. |
| Persistent offline status indicator | Up to 70% of users abandon apps that feel unreliable. Field connectivity is unpredictable. Workers need to know if their actions are queued. | Low-Medium | Subtle persistent badge (not a modal). "Offline — changes saved locally" pattern. |
| Loading states for every async operation | Every Supabase call, every file fetch, every clock-in submission must have a visual in-progress state. Current audit: ~60% coverage. | Medium | Inline spinners acceptable for short ops (< 2s). Skeleton for content-heavy sections. |
| Error states with human-readable messages | Workers cannot interpret "Network Error 503." They need: "Couldn't save. Tap to retry." | Low | Wrapper component. Never show raw stack traces or API errors. |
| Empty states with call-to-action | "No materials requested yet" with a button is infinitely better than a blank white area. Empty state = onboarding nudge. | Low | One shared component parameterized per context. |
| Bottom tab bar navigation (not scrolling tabs) | Industry standard for thumb-zone navigation. Procore, Fieldwire, every major field app uses fixed bottom nav. Horizontal scroll tabs require precision taps workers can't reliably hit with gloves. | Medium | 3-5 primary tabs fixed at bottom. Secondary tabs can use a "More" overflow approach. |
| Haptic feedback on critical actions | Clock-in confirmation, material submission, signature save — tactile confirmation that the action landed. Field workers often look away from the screen. | Low | navigator.vibrate() — one-liner per action. Only for confirmations, not every tap. |
| Pull-to-refresh on all data lists | Universal mobile pattern. Missing it makes the app feel like a web page, not a native app. React Native RefreshControl is the reference pattern. | Low | ScrollView + RefreshControl pattern. |
| Form autosave / draft recovery | Workers get interrupted mid-form (phone calls, task changes). Lost data is a trust-killer. | Medium | localStorage draft key per form. Restore on mount if draft exists. |
| High-contrast text (minimum 4.5:1 WCAG AA) | Outdoor sunlight degrades readability severely. Dark mode does NOT fix sunlight — contrast ratio is what matters. Safety glasses reduce perceived contrast further. | Low | Audit existing color pairs. Use CSS custom properties that enforce contrast. |
| Active/selected state clearly communicated in tab bar | Workers glancing at phone need to immediately know where they are. Color + font weight change required, icon change preferred. | Low | CSS active class already partially present, needs polish. |
| Disabled states on buttons that have in-flight actions | Prevent double-submission on clock-in, material requests, JSA saves. Double submits cause data corruption. | Low | isLoading state gate on submit buttons. |

**Confidence: HIGH** — All of these are either WCAG standards, verified Procore/Fieldwire patterns, or directly
observed problems in the EBC-OS codebase audit.

---

## Differentiators

Patterns that set a professional field app apart from a functional-but-amateur one.
These are not expected, but they signal product quality and increase adoption.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Swipe-to-action on list items | Swipe left to delete/archive, swipe right to approve — standard in Procore punch list. Faster than tap-navigate-action. | High | react-native-gesture-handler pattern. Skip if React (web) — fallback to long-press menu. Evaluate if web app can use pointer events. |
| Role-aware "home screen" (pinned actions) | Foreman's first view should be the 3 things they do every morning (clock crew in, check materials, view schedule). Employee's should be clock-in only. BuilderTrend homescreen is role-contextualized. | Medium | Configurable per-role dashboard tab, not a generic grid. Requires no new data. |
| Optimistic UI updates | Material request submitted? Show it in the list immediately, mark as "Syncing..." — don't wait for server response. Eliminates 300-800ms perceived lag on every action. | Medium-High | Requires local state management discipline. Worth it for clock-in and material submissions. |
| "Pending changes" badge on offline queue | Small number badge showing queued actions builds trust rather than hiding them. Workers know their work is saved even offline. | Medium | SyncStatus component already exists — extend it with count badge. |
| Confirmation choreography on critical actions | Clock-out: show a brief full-screen success state (green, checkmark, timestamp) for 1.5 seconds before returning. Workers need to feel certain their time was recorded. | Low-Medium | Short-lived success screen vs. inline toast. Procore uses full-screen confirmations for clock events. |
| Large photo thumbnails in daily logs | Procore's daily log shows 2-column photo grid. Tiny thumbnails are unusable when scrolling through documentation. 120px minimum thumbnail. | Low | CSS grid. No new logic. |
| Contextual empty states per role | Foreman with no crew assigned sees "Add your first crew member →". Employee with no hours sees "You're clocked out." Not a generic "No data." | Low | Per-component empty state copy. Already partially done. |
| Dark mode that actually works outdoors | Industrial UX research shows: bright objects on dark background outperform dark-on-light in sunlight. OLED-dark (#0d1117 or similar) + high-luminance text (white, yellow-green, cyan) + no pure blue text. EBC-OS has 5 themes — the OLED dark theme should specifically target this. | Medium | Color token audit. Avoid blue text on dark backgrounds per industrial UX research. Use #1a1a2e or #0d1117 for dark base, not pure #000000 (OLED bleed). |
| Section anchors / jump navigation for long tabs | ForemanView has 11 tabs, some of which (JSA) are hundreds of lines of rendered content. "Jump to" links reduce scroll fatigue in long forms. | Medium | In-page anchor links. Particularly needed for JSA tab. |
| Consistent "field card" component | Every data card (crew member, material item, delivery) should look identical in structure: status dot + title + metadata + action button. Visual consistency is the #1 signal of "professional app." | Medium | Single FieldCard component with slots. Eliminates the current 15+ different card implementations. |

**Confidence: MEDIUM-HIGH** — Swipe-to-action confidence is HIGH for native but MEDIUM for web PWA.
Optimistic UI confidence is HIGH pattern, MEDIUM implementation complexity estimate.

---

## Anti-Features to Avoid

Patterns that hurt field UX. Several of these are currently present in EBC-OS.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Modal-heavy confirmation flows | Modals block the whole screen. On a phone with gloves, dismissing a modal is a 2-3 tap operation. Procore moved away from confirmation modals toward inline states. | Use inline confirm states (button changes to "Tap again to confirm" pattern) or brief toast notifications. |
| Spinner blocking entire screen on load | Full-screen spinners make the app feel slow even when it's not. They also obscure whether the load failed silently. | Skeleton screens for content, inline spinners for actions, with timeout error fallback. |
| Horizontal scrolling tab bars with > 6 tabs | The ForemanView 11-tab horizontal scroll requires precise swipe or tap targeting. Field workers cannot reliably hit small tab labels with gloves on. This is the primary navigation anti-pattern to fix. | Collapse to 4-5 primary bottom tabs + "More" menu. Secondary tabs become in-page sections or a second-level navigation inside a primary tab. |
| Inline style overrides that ignore theme | 768+ inline styles mean theme switching is broken. Workers switching to "daylight" theme for outdoor use still see dark hard-coded hex values. | CSS custom properties from the token system. Every color goes through a variable. |
| Generic error messages ("An error occurred") | Workers cannot self-diagnose or retry correctly. They assume the app is broken and stop using it. | Actionable errors: "Couldn't load drawings. Check connection, then tap to retry." |
| Font sizes below 14px in body copy | Small text is unreadable in sunlight and with safety glasses. BuilderTrend's dated interface is widely criticized for exactly this. | 14px minimum body, 16px for primary labels, 18px+ for primary actions. |
| Icon-only navigation without labels | Icons without labels require memorization. New crew members cannot navigate. Fieldwire uses icon + label on primary nav. | Icon + label on all bottom nav items. Icon-only acceptable only in secondary toolbar rows, never primary nav. |
| Disabled-looking active states | If selected tab looks the same as unselected, workers tap repeatedly thinking the app didn't register. | Active tab: color change + font weight change, minimum. Add indicator dot or underline. |
| Blocking form validation (validate only on submit) | Workers complete 10 fields, hit submit, get 3 errors — they have to hunt for which fields failed. Frustrating in field conditions. | Inline validation on blur. Mark fields invalid as they go. Never clear a valid field's value on error. |
| Auto-popups or banners on load | "Rate this app!", "Enable notifications!", "New feature!" banners on first load are universally hated in field software. Crews interrupted mid-task. | Onboarding happens once, at first login. Feature announcements in a changelog tab, not forced modals. |
| Truncated navigation labels in horizontal scroll | "Mate..." instead of "Materials" because tab label overflows. Currently present in EBC-OS. | Use abbreviated labels designed for the space, not truncated full labels. "Crew" not "Crew Management". |

**Confidence: HIGH** — Anti-features are directly observed in EBC-OS codebase audit + confirmed by industry
UX research on construction software failures.

---

## Field-Specific UX Patterns

Patterns specifically for workers using phones in construction environments.

### Touch Interaction

**Gloved-hand targets:**
Minimum 44x44px per WCAG 2.5.5 and Apple HIG. For primary actions (clock in/out, submit), 56px minimum.
Minimum 8px gap between adjacent interactive elements to prevent mis-taps.
Confidence: HIGH (verified WCAG standard + Apple Human Interface Guidelines).

**One-handed operation:**
Primary actions must be reachable in the bottom 60% of screen (thumb zone).
The ForemanView header-top action buttons (Settings gear, logout) are in the hardest-to-reach zone.
Critical actions like clock-out should not require reaching to the top of screen.
Confidence: HIGH (Nielsen Norman Group thumb-zone research, widely cited).

**touch-action: none on signature/drawing surfaces:**
Already implemented on FieldSignaturePad — scroll prevention while signing is correct. Carry this
pattern to any drawing annotation or map interaction.
Confidence: HIGH (directly verified in codebase).

### Navigation Patterns

**Bottom tab bar: 3-5 items maximum:**
Industry standard: 3 tabs minimum, 5 tabs maximum, fixed bottom. Beyond 5, move to "More" overflow.
ForemanView's 11-tab horizontal scroll needs to collapse to primary bottom tabs (Clock, Crew, Materials,
Safety, More) with secondary navigation inside each tab.
Confidence: HIGH (verified across Procore, Fieldwire, BuilderTrend patterns + HIG/Material Design specs).

**Swipe navigation between sibling tabs:**
Horizontal swipe between tabs (like iOS native apps) reduces tap precision required.
React Native Gesture Handler supports this natively. Web app equivalent: touch swipe detection with
CSS transitions. Use as enhancement, not replacement for visible tabs.
Confidence: MEDIUM (native apps implement this; web PWA is partially supported via pointer events).

**Deep link from notification to action:**
Workers receiving a material request approval notification should land directly on that request, not
the portal home. This requires navigation state management, not just routing.
Complexity: HIGH. Not in current scope but flag for future.

### Loading States

**Decision tree:**
- Action takes < 300ms: No indicator needed, response is instant.
- Action takes 300ms-2s: Inline spinner or button loading state. Disable button.
- Action takes > 2s (data load, file fetch): Skeleton screen that mirrors real layout.
- Action fails: Error state with retry button. Never silent failure.

**Skeleton screen guidelines:**
Shapes should match actual content structure. Do not use generic rectangular bars where the content
is a form. Animate with a subtle shimmer/pulse (not fast animation — fast shimmer causes anxiety in
some users). Color: slightly lighter than card background.
Confidence: HIGH (Nielsen Norman Group skeleton screen research verified).

### Offline Indicators

**Best practice: persistent but non-intrusive:**
Show connection state in header or as a small persistent banner below the header.
States:
- Online: No indicator needed (absence of indicator = online).
- Offline: Yellow/amber banner — "Offline — changes saved locally."
- Syncing: Blue/accent banner — "Syncing 3 changes..." with subtle progress.
- Sync conflict: Red banner — "Sync conflict. Tap to review."

**Never use modals for offline state** — they block workflow. Workers need to keep working offline.

Procore turns the offline indicator into a pill badge in the top bar. Fieldwire uses a banner that
auto-dismisses when connection restores.
Confidence: HIGH (multiple verified sources, directly applicable to EBC-OS SyncStatus component).

**EBC-OS note:** SyncStatus component already exists. Extend it with the state machine above rather
than building new.

### Form Design for Field Conditions

**Input sizing:**
- Minimum 48px height for text inputs (not just the hit area, the visual height).
- 16px minimum font size in inputs — prevents iOS auto-zoom on focus.
- Use inputmode attribute correctly: inputmode="numeric" for quantities, inputmode="tel" for phone fields.
This is listed as an active requirement in PROJECT.md — confirm it's applied to all fields.

**Label placement:**
- Top-aligned labels above the field, not placeholder-as-label.
- Placeholder text disappears on focus — foremen who forget what the field is for must clear and re-read.
- Use floating labels only if implemented correctly (accessibility is complex).

**Single-column layouts:**
- Never side-by-side inputs on mobile. Field workers cannot tap small adjacent fields accurately.
- Exception: short paired fields (start time / end time) where pairing is semantically meaningful.

**Autosave and draft recovery:**
- JSA forms are the highest risk — complex, multi-section, crew signature required.
- Draft autosave to localStorage every 30 seconds minimum.
- Show "Draft saved X minutes ago" near the submit button.
- On next load, show "You have an unsaved JSA from yesterday. Continue?" prompt.
Confidence: HIGH (offline-first UX research + directly applicable to JSA tab complexity).

**Submit button placement:**
- Always at bottom of form, full width, 56px height.
- Never floating action buttons for form submissions — hard to find and confusing on complex forms.
- Button label should state the action: "Submit JSA" not "Submit".

### Dark Mode Conventions

**OLED dark is the primary target for EBC-OS:**
- Background: #0d1117 or #1a1a2e (not pure #000000 — OLED pixel bleed makes pure black look broken).
- Card surfaces: 8-12% lighter than background (#151b22 range).
- Text primary: #e6edf3 or near-white (not pure white — too harsh on OLED).
- Text secondary: #8b949e (muted, not dim).
- Interactive accent: Steel blue or green (avoid pure blue on dark backgrounds — lowest luminance of all colors, hardest to read outdoors per industrial UX research).

**Outdoor contrast target:**
Minimum 7:1 contrast ratio for primary text in OLED dark theme (higher than WCAG AA's 4.5:1).
Industrial UX research recommends targeting near-pure-white text (#e6edf3) on near-pure-black backgrounds
for maximum sunlight readability.
Confidence: HIGH (industrial UX sunlight-readability research, verified source).

**Yellow/green accent for critical outdoor states:**
For status indicators visible outdoors (clock-in active, safety alert, sync error): use yellow (#d4a017),
green (#3fb950), or cyan (#58a6ff) over dark backgrounds. Never red-on-dark for primary outdoor text
(poor luminance). Reserve red for error states that workers view close to the screen.
Confidence: MEDIUM-HIGH (industrial display UX research, partially generalized from LCD research to OLED).

**Light theme must also work:**
EBC-OS has daylight and blueprint themes. These need minimum 4.5:1 contrast WCAG AA compliance.
Test on device in direct sunlight — "what looks fine on a desktop monitor might be impossible to read
on a phone screen outdoors" is a well-documented failure mode.

### Haptic Feedback

**Use for:**
- Clock-in confirmation (single firm pulse)
- Clock-out confirmation (double pulse)
- Form submission success (medium pulse)
- Destructive action warning (strong triple pulse before confirm)
- Error on submission (short buzzy pattern)

**Do not use for:**
- Tab navigation
- Scroll events
- Passive data loads
- Every button tap

**Implementation:** navigator.vibrate() is available in most mobile browsers. Wrap in a utility function
with a feature-detect check. Keep pattern library small (3-4 distinct patterns maximum).
Confidence: MEDIUM-HIGH (haptics best practices verified, navigator.vibrate browser support is good
on Android, limited on iOS Safari — document this caveat).

---

## Feature Dependencies

```
Touch target audit (44px)
  → Required before any portal refactor begins
  → Unblocks: all interaction patterns

Design token system (CSS variables)
  → Required before color/dark mode work
  → Unblocks: outdoor contrast improvements, theme compliance

Shared FieldCard component
  → Required before portal-by-portal refactor
  → Unblocks: Foreman, Employee, Driver portal consistency

Skeleton screen component
  → Required before loading state coverage
  → Unblocks: complete async state coverage

Bottom tab refactor (Foreman primary nav)
  → Depends on: design token system, touch targets
  → Blocks: nothing downstream — do last for Foreman

SyncStatus component extension
  → Depends on: existing SyncStatus component
  → Unblocks: offline indicator patterns, pending changes badge

Form pattern standardization
  → Depends on: design token system
  → Unblocks: JSA draft autosave, inputmode audit
```

---

## MVP Recommendation

**Phase 1 — Foundation (do first, unblocks everything):**
1. Design token system — CSS custom properties for all colors, spacing, typography
2. Touch target audit and fix — every interactive element to 44px minimum
3. Shared FieldCard component — single card pattern for all list items
4. Skeleton + empty + error state components — one set, parameterized

**Phase 2 — Per-Portal Refactor (depends on Phase 1):**
5. Bottom tab navigation for ForemanView — collapse 11 horizontal tabs to 4-5 bottom tabs + More
6. Employee portal refactor — simpler, fewer tabs, faster
7. Driver portal refactor — smallest, highest ROI per line of work

**Phase 3 — Polish (depends on Phase 2):**
8. Haptic feedback utility — clock-in/out + form submission
9. Pull-to-refresh on data lists
10. Dark mode outdoor audit — test on device in sunlight, fix contrast

**Defer:**
- Swipe-to-action gestures — medium-high complexity, medium UX value in web context (vs. native)
- Optimistic UI updates — high complexity, low risk to defer to next milestone
- Role-aware home screen personalization — requires design research with actual foremen

---

## Sources

- [Procore Mobile App — Google Play](https://play.google.com/store/apps/details?id=com.procore.activities) — Navigation pattern observation
- [Procore Mobile: New Sidebar and Home Screen](https://support.procore.com/product-releases/new-releases/mobile-new-sidebar-and-home-screen-experience-for-procore-ios-and-android-apps) — Navigation redesign context (MEDIUM confidence)
- [Industrial UX: Sunlight Susceptible Screens](https://medium.com/@callumjcoe/industrial-ux-sunlight-susceptible-screens-2e52b1d9706b) — Contrast and color for outdoor displays (HIGH confidence)
- [Offline Mobile App Design: UX for Healthcare & Field Teams](https://openforge.io/offline-mobile-app-design/) — Offline state patterns (HIGH confidence)
- [Skeleton Screens 101 — Nielsen Norman Group](https://www.nngroup.com/articles/skeleton-screens/) — Loading state patterns (HIGH confidence)
- [Bottom Tab Bar Navigation Design Best Practices](https://uxdworld.com/bottom-tab-bar-navigation-design-best-practices/) — Tab navigation (MEDIUM confidence, consistent with HIG)
- [Why Construction Tech UX Is Different](https://altersquare.medium.com/why-construction-tech-ux-is-different-designing-for-jobsite-realities-fef93f431721) — Environment-specific design (MEDIUM confidence)
- [Why Construction Software Feels Stuck in the 90s](https://altersquare.medium.com/why-construction-software-feels-stuck-in-the-90s-ui-ux-challenges-in-industrial-applications-52842619b776) — Anti-patterns catalogue (MEDIUM confidence)
- [2025 Guide to Haptics: Enhancing Mobile UX](https://saropa-contacts.medium.com/2025-guide-to-haptics-enhancing-mobile-ux-with-tactile-feedback-676dd5937774) — Haptic feedback guidelines (MEDIUM confidence)
- [Offline-First Mobile App Architecture](https://appmaster.io/blog/offline-first-background-sync-conflict-retries-ux) — Sync and conflict UX patterns (MEDIUM confidence)
- [Dark Mode vs Light Mode: Complete UX Guide 2025](https://altersquare.io/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025/) — Dark mode best practices (MEDIUM confidence)
