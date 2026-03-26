# Release Gate Verification Report

> Date: 2026-03-25 · Evaluator: Claude Code (ops manager mindset)
> Methodology: Evidence-based, not estimated. Each gate is pass/fail with proof.

---

## Gate 1: Data Persistence — ❌ FAIL

### Evidence

I read the actual Supabase schema files (`supabase/schema.sql`, `supabase/migration_phase3.sql`) and compared them to the fields our Phase 2 code writes.

**material_requests table (migration_phase3.sql lines 35-54):**

| Column in DB | Column in App Code | Status |
|-------------|-------------------|--------|
| id, project_id, project_name, material, qty, unit, notes, status | ✅ Exist | Match |
| priority | urgency (code) → becomes `urgency` in DB | ❌ Column `urgency` does NOT exist |
| approved_by, approved_at | ✅ Exist | Match |
| assigned_driver | driverId (code) → becomes `driver_id` | ❌ Column `driver_id` does NOT exist (has `assigned_driver` TEXT) |
| delivered_at | ✅ Exists | Match |
| — | needed_by | ❌ Does NOT exist |
| — | fulfillment_type | ❌ Does NOT exist |
| — | decision_notes | ❌ Does NOT exist |
| — | rejected_reason | ❌ Does NOT exist |
| — | confirmed_by | ❌ Does NOT exist |
| — | confirmed_at | ❌ Does NOT exist |
| — | audit_trail | ❌ Does NOT exist |

**projects table (schema.sql lines 122-150):**

| Column in DB | Column in App Code | Status |
|-------------|-------------------|--------|
| All original fields | ✅ | Match |
| — | construction_stage | ❌ Does NOT exist |
| — | stage_history | ❌ Does NOT exist |
| — | stage_updated_at | ❌ Does NOT exist |
| — | stage_updated_by | ❌ Does NOT exist |
| — | assigned_foreman | ❌ Does NOT exist |
| — | labor_cost | ❌ Does NOT exist |
| — | material_cost | ❌ Does NOT exist |

**time_entries table (migration_phase3.sql lines 9-27):**

| Column in DB | Column in App Code | Status |
|-------------|-------------------|--------|
| All original fields | ✅ | Match |
| — | photo_url | ❌ Does NOT exist |
| — | capture_status | ❌ Does NOT exist |

### What this means

**Supabase will silently drop all Phase 2 fields when upserting rows.**

The `useSyncedState` hook converts camelCase to snake_case and pushes the full object. PostgreSQL ignores unknown columns on INSERT/UPDATE — the row saves, but the new fields are lost. On reload from Supabase, those fields come back as `null`.

**Impact:** Foreman sets construction stage → reloads → stage is gone. PM approves material request with routing → reloads → fulfillment_type is gone. Photo URL → gone.

### Fix Required

Run `supabase/migration_phase2_fields.sql` in Supabase SQL Editor. **Created this file in this session.** All ALTER TABLE statements use `IF NOT EXISTS` — safe to run multiple times.

---

## Gate 2: Mobile Field — ⚠️ NOT TESTED

### Evidence

I cannot test on a real phone from this environment. The ForemanView code was written for mobile (uses `className="login-input"`, responsive patterns) but:

- **Camera modal** uses `getUserMedia` — works on modern mobile browsers but may fail on older devices or require HTTPS
- **Photo preview** uses `<video>` with `playsInline` — correct for iOS Safari
- **Touch interactions** — no pinch-to-zoom issues identified in code, but NOT tested
- **Button sizes** — most use `btn-sm` (small) which may be too small for gloved hands

### Verdict: Cannot pass without real device testing.

---

## Gate 3: Photo Upload — ❌ FAIL

### Evidence

1. **Storage bucket `clock-in-photos`:** Does NOT exist in Supabase. Must be created manually in Supabase Dashboard → Storage → New Bucket.

2. **Upload function:** Uses `uploadFile()` from `src/lib/supabase.js` (line 343). This function works — it's the same one used for takeoff PDFs. But it requires the bucket to exist.

3. **Failure handling:** Code catches the upload error and falls back to a truncated data URL. This means clock-in won't crash, but photos won't persist. The `captureStatus` field will show "upload_failed".

4. **Retrieval:** Uses `getFileUrl()` (line 360) which generates a public URL. This works IF the bucket exists AND is set to public.

### Fix Required

1. Create `clock-in-photos` bucket in Supabase Dashboard → Storage
2. Set bucket to Public (photos don't contain sensitive data — just hardhat verification)
3. Run the migration SQL to add `photo_url` and `capture_status` columns to `time_entries`

---

## Gate 4: Estimating Credibility — ❌ FAIL

### Evidence

The `ASSEMBLY_LIBRARY` in `src/data/assemblies.js` (951 lines) contains 30 assemblies with full component breakdowns BUT:

- **Zero assemblies have `matRate` or `labRate` fields.** These fields do not exist in the data file.
- All cost calculations use `asm.matRate || 0` and `asm.labRate || 0` — resulting in **$0 for everything**.
- The SDS/Assembly Editor in Settings allows users to ADD custom assemblies with rates, but the default library ships empty.
- The `assemblies` Supabase table exists but likely has no data with rates.

### What this means

Every takeoff shows $0 total cost. Every proposal generates $0 pricing. This is not a bug — it's a configuration gap. The app is designed for users to configure pricing, but out-of-the-box it looks broken.

### Fix Required

Either:
- Seed 5-10 common assemblies with real EBC pricing (Emmanuel/Abner must provide rates)
- Or add a prominent "⚠️ Configure pricing in Settings > Assemblies" banner

---

## Gate 5: End-to-End Workflow — ⚠️ BLOCKED by Gate 1

### Evidence

Cannot complete a full happy-path test because Phase 2 fields don't persist through Supabase. The workflow would be:

1. ✅ Create project (works — original schema fields)
2. ⚠️ Set construction stage (saves to localStorage, lost on Supabase sync)
3. ⚠️ Assign foreman (field missing in DB)
4. ✅ Foreman clocks in (works — original fields)
5. ⚠️ Photo capture (bucket doesn't exist)
6. ✅ Material request created (original fields work)
7. ⚠️ PM approves with routing (fulfillment_type lost on sync)
8. ⚠️ Foreman confirms receipt (confirmed_by lost on sync)

**The workflow works in a single browser session (localStorage holds everything). It breaks on page reload or cross-device sync.**

### Fix Required

Run the migration SQL first, then retest.

---

## Gate 6: Reliability — ⚠️ PARTIAL PASS

### Evidence

1. **Error boundary:** ✅ EXISTS. `src/main.jsx` line 34 — `class ErrorBoundary extends Component` with `componentDidCatch`. Shows a reload button on crash. Confirmed by code inspection.

2. **Lint:** ❌ NOT PASSING. ESLint hangs on execution (known issue — possibly infinite loop in config or very large files). Build passes via Vite which catches syntax errors.

3. **Console errors:** Cannot test from CLI. The TDZ crash (Gate 0 fix `ce0f9b6`) was the last known runtime error. Phase 1 stability fixes addressed canvas null guards, promise catches, and undo stack caps.

4. **Crash monitoring:** ❌ No Sentry, no LogRocket, no error reporting service. Crashes in the field are invisible.

---

## Gate 7: Final Deployment Recommendation

### ❌ NOT READY for field users.
### ⚠️ CONDITIONALLY ready for internal office testing.

**Condition:** Run the migration SQL to add Phase 2 columns.

### What must happen before a 3-person field pilot

| # | Action | Effort | Blocker? |
|---|--------|--------|----------|
| 1 | Run `migration_phase2_fields.sql` in Supabase | 2 min | **YES** |
| 2 | Create `clock-in-photos` storage bucket | 2 min | **YES** |
| 3 | Test on real phone (iOS Safari + Android Chrome) | 30 min | **YES** |
| 4 | Fix any mobile UX issues found | 1-3 hrs | Maybe |
| 5 | Seed 5 assemblies with real pricing | 15 min | No |
| 6 | Verify reload persistence for all Phase 2 fields | 15 min | **YES** |

**Minimum time to pilot-ready: 1 focused session (2-4 hours) AFTER running the migration.**

---

## Summary

| Gate | Status | Evidence Type |
|------|--------|--------------|
| 1. Data Persistence | ❌ FAIL | Schema inspection — 15+ missing columns |
| 2. Mobile Field | ⚠️ UNTESTED | Code review only — no device test |
| 3. Photo Upload | ❌ FAIL | Storage bucket does not exist |
| 4. Estimating Credibility | ❌ FAIL | Zero assemblies have pricing data |
| 5. E2E Workflow | ⚠️ BLOCKED | Blocked by Gate 1 |
| 6. Reliability | ⚠️ PARTIAL | Error boundary exists; no monitoring |
| 7. Deployment | ❌ NOT READY | 3 blocking gates must pass first |
