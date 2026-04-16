# App Store Metadata Prep

Everything you need to gather BEFORE submitting to iOS App Store or Google Play Store. These assets are used by both stores, so prep them once.

## Required Assets Checklist

### Text content
- [ ] App name (30 chars max for iOS, 30 for Android)
- [ ] Subtitle (30 chars, iOS only)
- [ ] Short description (80 chars, Android only)
- [ ] Full description (4000 chars both stores)
- [ ] Promotional text (170 chars, iOS — updatable without resubmission)
- [ ] Keywords (100 chars, comma-separated, iOS only)
- [ ] Category (Primary + Secondary)

### Images
- [ ] App icon (1024×1024 PNG — already at `public/icon-512.png` but need 1024 version)
- [ ] iPhone screenshots (6.7", 6.5", 5.5") — at least 3 per size
- [ ] iPad screenshots (12.9") — at least 3
- [ ] Android phone screenshots — at least 2
- [ ] Android tablet screenshots (7" + 10") — optional but recommended
- [ ] Android feature graphic (1024×500 PNG)

### URLs
- [ ] Privacy Policy URL — `https://app.ebconstructors.com/#/privacy` ✅ done
- [ ] Support URL — create `https://ebconstructors.com/support` or use email
- [ ] Marketing URL (optional) — `https://ebconstructors.com`

### Legal
- [ ] Age Rating questionnaire answered (should be 4+ / Everyone)
- [ ] Copyright line (e.g., "© 2026 Eagles Brothers Constructors")

## Recommended Text Content

### App Name
**Eagles Brothers Constructors**

### Subtitle (iOS, 30 chars)
**Construction Operations OS**

### Short Description (Android, 80 chars)
**Construction ops for drywall & framing subs — field, financial, and more.**

### Full Description (4000 chars, works for both stores)

```
Eagles Brothers Constructors (EBC-OS) is the construction operations platform built for commercial drywall and framing subcontractors. This app is used by Eagles Brothers Constructors employees, foremen, superintendents, project managers, estimators, drivers, and executive leadership to run the company from the field to the back office.

WHAT YOU CAN DO

Field & Foremen:
• Clock in and out with GPS-verified site location
• File daily reports with photos, production logs, and issue notes
• Request materials on the spot — with optional photo of unknown items
• Scan delivery tickets and confirm on-site arrivals
• Run safety JSAs, document toolbox talks, track crew certifications
• View approved drawings and flag revisions

Project Managers:
• Monitor all active jobs from one dashboard: contract, billed, cost, margin, crew
• Action queue surfaces change orders pending, RFIs overdue, submittals due, and more
• Deep-link to any project's financials, change orders, or RFIs in one click
• Cross-project document tables: review all open RFIs, COs, submittals, punch items in one filterable view
• Track profit health with diagnostic alerts (labor overrun, material overage, CO reduction)
• Import bulk data from CSV with preview + validation + rollback

Superintendents:
• Field action queue with missing daily report detection (names shown)
• Foreman accountability table: reports/7d, open problems, open punch
• Trade conflict detection (same-area multi-trade scheduling)
• Upcoming inspections from calendar
• Today's manpower per project with issue rollup

Estimators:
• Bid tracking with due dates, GC relationships, win rates
• Takeoff engine for PDF plan measurement
• Scope building and proposal generation

Owners & Executives:
• Company-wide weighted margin KPI
• Cash position with A/R, payroll coverage, retainage held
• Underbilling/overbilling detection
• Backlog, company P&L, GC relationships

BUILT FOR THE FIELD

• Offline support — the app works even when signal is spotty
• Photos, geolocation, haptics, and push notifications
• Role-based access: each employee sees only what they need
• Spanish language support
• Dark mode optimized for outdoor readability

ABOUT EAGLES BROTHERS CONSTRUCTORS

Eagles Brothers Constructors is a family-owned commercial drywall and framing subcontractor based in Houston, Texas. This app is our internal operations platform — we built it for ourselves because no off-the-shelf software solved the specific problems faced by specialty trade subs running multiple concurrent jobs.

This is a business tool for EBC employees and authorized partners. Accounts are created by company administrators; there is no public signup.

SUPPORT

For support or questions, contact: support@ebconstructors.com
Privacy policy: https://app.ebconstructors.com/#/privacy
Website: https://ebconstructors.com
```

### Promotional Text (iOS, 170 chars)
```
The construction operations platform built for drywall & framing subs. Run your company from field to finance — one app, one codebase, built by contractors for contractors.
```

### Keywords (iOS, 100 chars)
```
construction,drywall,framing,subcontractor,timeclock,project,field,foreman,bid,estimate,RFI,takeoff
```

### Categories
- **iOS Primary:** Business
- **iOS Secondary:** Productivity
- **Android Category:** Business

## Screenshots — What to Show

You need 3-5 strong screenshots per device size. Order matters (first = most important).

**Suggested screenshot sequence:**

1. **Dashboard for an Owner/PM** — show Company Margin KPI, Action Queue with real items, multi-project grid
2. **Field Action Queue for a Superintendent** — show missing reports, foreman accountability, inspections
3. **Project modal with financials** — show contract, billed, costs, profit diagnosis
4. **Cross-project Documents view** — show RFIs/COs/Submittals in one filterable table
5. **Time clock or Today's Sites** — show clock-in with site location, directions button

**Tips:**
- Use the "Load sample" data in import or a populated staging environment — empty screens look broken
- Add callout text/arrows using Figma, Keynote, or dedicated tools like Screenshot Studio
- Keep key messaging: "Everything you need to run a specialty trade sub — in one app"
- Make sure screenshots show the app in use, not just UI chrome

**Required iOS screenshot sizes (as of iOS 17):**
- **6.7" iPhone** (Pro Max): 1290×2796 (3+ screenshots required)
- **6.5" iPhone** (Plus): 1242×2688 (optional but recommended)
- **5.5" iPhone** (older): 1242×2208 (optional)
- **12.9" iPad Pro** (if iPad supported): 2048×2732 (3+ required)
- **11" iPad Pro** (if iPad supported): 1668×2388 (optional)

**Required Android screenshot sizes:**
- **Phone:** Any size from 320px to 3840px on each side, 16:9 or 9:16 ratio
- **Feature graphic:** 1024×500 PNG (required — shows at top of listing)
- **7-inch tablet:** Recommended
- **10-inch tablet:** Recommended

## How to Take Screenshots

### iOS Simulator (from Mac)
1. In Xcode, open iOS Simulator with the desired device size
2. Run the app on the simulator
3. Press **Cmd+S** to save screenshot to Desktop
4. Repeat for each device size

### Physical iPhone/iPad
1. Connect to Mac
2. Open QuickTime Player → File → New Movie Recording → choose iPhone as camera → pause → take screenshots via device's side buttons
3. Or just take screenshots on the device and AirDrop to Mac

### Android Emulator
1. In Android Studio, open an emulator
2. Run the app
3. Click the camera icon in the emulator toolbar → saves PNG
4. Adjust resolution in AVD Manager for different screenshot sizes

### Physical Android
1. On device: Power + Volume Down to screenshot
2. Files app → Screenshots → transfer to computer

## Feature Graphic (Android Only)

Google Play requires a **1024×500 PNG** "feature graphic" shown at the top of your listing.

Ideas:
- Eagles logo + "Eagles Brothers Constructors" wordmark on dark brand blue
- Subtle construction imagery (site photo, abstract blueprint lines)
- Keep text minimal — most viewing is small

You can create this in:
- Canva (has Google Play feature graphic templates)
- Figma (custom design)
- Photoshop/Illustrator if you have them

## Privacy Policy Checklist

Both stores require a privacy policy that's:
- [x] Publicly accessible URL (not behind a login)
- [x] Accurate about what data you collect
- [x] Describes how data is used
- [x] Identifies any third parties (Supabase, QuickBooks)
- [x] Explains user rights (access, deletion, opt-out)
- [x] Has a contact method

✅ This is already handled at `/#/privacy` in the app.

## Demo Credentials for Review

Both stores need reviewers to be able to use the app. Since this is an internal tool:

Create a **reviewer demo account** with limited data access:
- Email: `reviewer@ebconstructors.com`
- Password: (strong, include in review notes)
- Role: PM or Superintendent (gives full view of most features)
- Data: Populate with anonymized sample data (no real employee info or financials)

Include in App Store / Play Store review notes:

```
This is an internal construction operations app for Eagles Brothers Constructors employees and authorized contractors. There is no public signup — accounts are created by company administrators only.

Demo credentials:
Email: reviewer@ebconstructors.com
Password: [strong password here]

This demo account has access to all features with sample data. The app is a business tool for managing construction projects, time tracking, field reporting, and financial operations. It does not collect data from end users for advertising or sell any user data.
```

## Estimated Timeline

| Task | Time |
|------|------|
| Apple Developer enrollment | 1-14 days (individual faster than organization) |
| Google Play Console setup | 1-3 days (identity verification) |
| Gather metadata + screenshots | 1-2 days |
| First iOS submission (build + submit) | 1 day |
| iOS review | 1-3 days |
| First Android submission (build + submit) | 1 day |
| Android review | Hours to 1 day typically, 2-7 days first submission |
| **Total from today to live in both stores** | **2-4 weeks** |

Start the developer accounts NOW — that's usually the longest wait.
