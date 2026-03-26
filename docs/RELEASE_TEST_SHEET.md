# Release Test Sheet — Post-Migration Verification

> Run AFTER: migration_phase2_fields.sql executed + storage bucket created
> Purpose: Prove the system works, not guess that it should

---

## 0. Pre-Requisites

```
Migration ran:           ☐ Yes  ☐ No
Migration result:        _______________
Verification query ran:  ☐ Yes  ☐ No  (column count for material_requests: ___)
Bucket created:          ☐ Yes  ☐ No
Bucket name:             clock-in-photos
Bucket access:           ☐ Private (RECOMMENDED — contains employee faces/identity)
```

### Storage Bucket — Security Decision

**PRIVATE bucket is the correct production choice.** Clock-in photos contain:
- Employee faces (PII)
- Timestamps (attendance evidence)
- Jobsite context (client locations)

**Tradeoff:**
| | Public Bucket | Private Bucket |
|--|--------------|----------------|
| Setup | Simpler | Needs signed URLs |
| Retrieval | Direct URL, never expires | Signed URL, expires (24h) |
| Security | Anyone with URL can view | Only authenticated users |
| Risk | Photos could leak via URL sharing | Minimal exposure |
| **Recommendation** | ❌ Not for employee photos | ✅ Use this |

The code has been updated to use `getSignedFileUrl()` with 24-hour expiry.
Create the bucket as **Private** in Supabase Dashboard.

---

## 1. Persistence Tests (Single Device)

### 1.1 Material Request — Urgency + Needed-By
```
Action:     Create material request. Set urgency = Urgent, neededBy = tomorrow.
            Hard refresh (Ctrl+Shift+R).
Expected:   Request shows ⚡ Urgent badge and the date after refresh.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

### 1.2 Material Request — PM Approval + Routing
```
Action:     As PM, click "Review & Approve" → choose "Supplier Order".
            Hard refresh.
Expected:   Status = "On Order". Shows "📦 Supplier". fulfillmentType persisted.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

### 1.3 Material Request — Audit Trail
```
Action:     Expand audit trail on the approved request after refresh.
Expected:   "submitted" and "approved" entries with names + timestamps.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

### 1.4 Project — Construction Stage
```
Action:     Edit project → set stage to "Framing" → Save → Refresh.
Expected:   Card shows amber "Framing" badge. Progress = 40%.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

### 1.5 Project — Stage History
```
Action:     Open same project after refresh → expand stage history.
Expected:   Entry showing "— → Framing" with your name and today's date.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

### 1.6 Clock-In Photo
```
Action:     Foreman clock-in with photo → clock out → refresh.
Expected:   Photo file exists in Supabase Storage bucket.
            Time entry has photo_url (signed URL) and capture_status = "ok".
Verify:     Go to Supabase Dashboard → Storage → clock-in-photos → file exists.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

---

## 2. Permission / Scope Tests

### 2.1 PM sees own projects only
```
Action:     Log in as PM. Go to Projects tab.
Expected:   Only projects where PM field = your name.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
```

### 2.2 PM does NOT see other PM's projects (negative test)
```
Action:     While logged in as PM, count total projects visible.
Expected:   Count is LESS than total projects in the system.
            (Log in as admin to compare — admin sees all.)
Actual:     PM sees ___ projects. Admin sees ___ projects.
Pass/Fail:  ☐ Pass  ☐ Fail
```

### 2.3 Admin sees all projects
```
Action:     Log in as admin/owner. Go to Projects tab.
Expected:   All projects visible regardless of PM assignment.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
```

---

## 3. Cross-Device Sync Test

### 3.1 Material request sync
```
Action:     PM approves a material request on DESKTOP.
            Foreman refreshes on PHONE.
Expected:   Foreman sees updated status (not "Requested" anymore).
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

### 3.2 Stage sync
```
Action:     Foreman advances stage on PHONE.
            PM refreshes on DESKTOP.
Expected:   PM sees new stage badge on project card.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
Notes:      _______________
```

---

## 4. End-to-End Workflow Gate

Complete this entire sequence. Mark where it passes or breaks.

```
Step 1: Create project with stage "Pre-Con"
  Pass/Fail: ☐    Notes: _______________

Step 2: Assign foreman to project
  Pass/Fail: ☐    Notes: _______________

Step 3: Foreman logs in → sees assigned project
  Pass/Fail: ☐    Notes: _______________

Step 4: Foreman clocks in with photo
  Pass/Fail: ☐    Notes: _______________

Step 5: Foreman creates material request (urgent, needed tomorrow)
  Pass/Fail: ☐    Notes: _______________

Step 6: PM sees request in Action Queue on Dashboard
  Pass/Fail: ☐    Notes: _______________

Step 7: PM approves → chooses "In-House Driver"
  Pass/Fail: ☐    Notes: _______________

Step 8: Driver sees assigned delivery
  Pass/Fail: ☐    Notes: _______________

Step 9: Driver marks picked up → delivered
  Pass/Fail: ☐    Notes: _______________

Step 10: Foreman confirms receipt
  Pass/Fail: ☐    Notes: _______________

Step 11: Foreman advances stage to "Framing"
  Pass/Fail: ☐    Notes: _______________

Step 12: All data persists after refresh on both devices
  Pass/Fail: ☐    Notes: _______________

WORKFLOW BROKE AT STEP: ___ (or "completed successfully")
```

---

## 5. Failure Path Tests

### 5.1 Camera failure
```
Action:     Block camera permission in browser → try clock-in.
Expected:   Clock-in still completes. captureStatus = "camera_failed". No crash.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
```

### 5.2 Offline / network loss
```
Action:     Disable network → create a material request → re-enable → refresh.
Expected:   Request saved to localStorage. On reconnect, syncs to Supabase.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
```

### 5.3 Denied request
```
Action:     PM denies a material request with reason.
Expected:   Status = "Denied". Reason visible. Foreman sees denial.
Actual:     _______________
Pass/Fail:  ☐ Pass  ☐ Fail
```

---

## 6. Mobile Field Test

```
Device:     _______________
Browser:    _______________
URL:        app.ebconstructors.com
```

| Test | Pass/Fail | Issue |
|------|-----------|-------|
| Login screen loads | ☐ | |
| Foreman login works | ☐ | |
| Tab navigation | ☐ | |
| Project selector | ☐ | |
| Stage bar visible | ☐ | |
| Advance stage button | ☐ | |
| Clock-in button | ☐ | |
| Camera modal opens | ☐ | |
| Camera preview shows | ☐ | |
| Capture works | ☐ | |
| Clock-in completes | ☐ | |
| Material request form | ☐ | |
| Submit request | ☐ | |
| Confirm receipt button | ☐ | |
| Scrolling smooth | ☐ | |
| Buttons tappable | ☐ | |
| Text readable | ☐ | |
| Load speed | ☐ Fast ☐ Slow ☐ Broken | |
| **Biggest problem** | | |

---

## 7. Gate Verdicts

Fill in after all tests:

| Gate | Verdict | Evidence |
|------|---------|----------|
| Data Persistence | ☐ Pass ☐ Fail | Tests 1.1–1.6 |
| Permissions | ☐ Pass ☐ Fail | Tests 2.1–2.3 |
| Cross-Device Sync | ☐ Pass ☐ Fail | Tests 3.1–3.2 |
| E2E Workflow | ☐ Pass ☐ Fail | Test 4 (broke at step ___) |
| Failure Paths | ☐ Pass ☐ Fail | Tests 5.1–5.3 |
| Mobile | ☐ Pass ☐ Fail | Test 6 |

### Final Recommendation

```
☐ Still not ready — major gates failing
☐ Ready for office testing only — persistence works, mobile untested
☐ Ready for 1–3 user field pilot — all gates pass, minor issues acceptable
☐ Ready for controlled foreman rollout — high confidence
```

**Reason:** _______________
