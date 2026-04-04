---
phase: 08-employee-portal-overhaul
plan: "04"
subsystem: employee-portal
tags: [credentials, cert-wallet, badge-count, bottom-sheet, supabase]
dependency_graph:
  requires: ["08-01"]
  provides: ["CredentialsTab with full credential wallet"]
  affects: ["src/tabs/employee/CredentialsTab.jsx", "EmployeeView shell (onBadgeUpdate)"]
tech_stack:
  added: []
  patterns: ["expiry-sorted credential list", "add-credential bottom sheet", "badge count callback", "photo capture input"]
key_files:
  created: []
  modified:
    - src/tabs/employee/CredentialsTab.jsx
decisions:
  - "credStatus helper defined inline (not imported) — simple 3-state pure function, no circular dependency risk"
  - "Badge count effect depends on credentials array and onBadgeUpdate — recalculates on any credential change"
  - "Photo upload uses supabase.storage certifications bucket — upload errors are non-fatal (photoPath stays null)"
metrics:
  duration: "2m"
  completed: "2026-04-04"
  tasks: 1
  files: 1
---

# Phase 08 Plan 04: CredentialsTab Summary

**One-liner:** Credential wallet with expiry-sorted CredentialCard list, add-credential bottom sheet (type/dates/org/photo), and badge count reporting via onBadgeUpdate callback.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Build credential wallet tab with expiry sort, add-credential bottom sheet, badge reporting | dcd5034 | src/tabs/employee/CredentialsTab.jsx |

## What Was Built

`CredentialsTab.jsx` replaces the placeholder stub with a fully functional credential wallet component (~160 lines):

- **Credential list:** Loads from `certifications` Supabase table filtered by `employee_id`. Sorted by expiry urgency (soonest expiring first, no-expiry items last).
- **credStatus helper:** Returns `'expired'` (days < 0), `'expiring'` (days <= 30), or `'active'` — drives CredentialCard visual treatment via StatusBadge.
- **Badge count:** `useEffect` counts expired + expiring certs and calls `onBadgeUpdate(count)` whenever credential data changes.
- **Add credential sheet:** Bottom sheet (`sheet-container open` pattern) with FieldSelect for 8 credential types (OSHA 10/30, CPR/First Aid, Forklift, Scaffold, Fall Protection, Confined Space, Other), two FieldInput date pickers, FieldInput for issuing org, and `<input type="file" accept="image/*" capture="environment">` for optional camera photo.
- **Photo upload:** Non-fatal — if storage upload fails, `photo_path` stays null and insert proceeds.
- **States:** LoadingSpinner while fetching, EmptyState (Shield icon) for error with Retry button and for zero credentials, full list otherwise.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `onTap={() => {}}` on CredentialCard is intentional. Credential detail view is not in scope for this plan (CRED-01 through CRED-03 only require view + add). Tap handler is a prop slot; no stub data flows to UI.

## Self-Check: PASSED

- FOUND: src/tabs/employee/CredentialsTab.jsx
- FOUND: commit dcd5034
