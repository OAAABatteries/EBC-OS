# iOS App Store Deployment

Step-by-step guide to submitting EBC-OS to the Apple App Store.

## Prerequisites

**You need ALL of these. No workarounds exist:**

- [ ] Mac computer (MacBook, Mac mini, Mac Studio, etc.) — macOS 14+ recommended
- [ ] Xcode 15 or later (free, ~7GB from Mac App Store)
- [ ] Apple Developer Program membership — **$99/year** ([enroll here](https://developer.apple.com/programs/enroll/))
- [ ] An iPhone or iPad (for physical device testing — simulator works but real device is required before submission)
- [ ] This repo cloned on the Mac

**Why a Mac is required:** Apple's App Store submission requires Xcode, which only runs on macOS. This is a hard requirement enforced by Apple.

## Part 1: One-Time Apple Developer Setup

### 1.1 Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (create one if needed — must have a trusted phone number)
3. Choose **Organization** (as Eagles Brothers Constructors) — requires a D-U-N-S Number (free, takes 1-5 business days)
   - Or choose **Individual** if submitting under your personal name (faster, but the app will show your personal name as seller)
4. Pay $99 annual fee
5. Wait for approval (usually same day for individual, 1-2 weeks for organization)

### 1.2 Create App Store Connect record

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Eagles Brothers Constructors
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** `com.eaglesbrothers.ebcos` (create new — matches `capacitor.config.json`)
   - **SKU:** `EBC-OS-2026` (any unique string, internal only)
   - **User Access:** Full Access
4. Click **Create**

## Part 2: Build the iOS App

On the Mac, in the project directory:

```bash
# Install dependencies (one-time)
npm install

# Build the web bundle and sync to iOS project
npm run build
npx cap sync ios

# Open the iOS project in Xcode
npx cap open ios
```

Xcode will open with the EBC-OS iOS project loaded.

### 2.1 Configure signing in Xcode

1. In Xcode's left panel, click the **App** project (top-level blue icon)
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. Under **Team**, select your Apple Developer account (the one tied to your $99/yr membership)
5. Verify **Bundle Identifier** = `com.eaglesbrothers.ebcos`
6. Xcode will auto-create provisioning profiles — wait for the green checkmark

### 2.2 Set deployment target

1. Still on the **App** target, go to **General** tab
2. Under **Minimum Deployments**, set **iOS** to **14.0** (covers 99%+ of devices)
3. Under **Supported Destinations**, ensure **iPhone** and **iPad** are both listed (for universal app)

### 2.3 Bump version for this release

Every time you submit an update, increment version numbers:

1. In Xcode, **General** tab → **Identity** section
2. **Version:** `1.0` (this is the user-visible version, e.g., 1.0, 1.1, 2.0)
3. **Build:** `1` (this is the internal build number — MUST increment with every upload, even for the same version)

Alternatively, edit these in `ios/App/App.xcodeproj/project.pbxproj`:
- `MARKETING_VERSION = 1.0;` ← user-facing version
- `CURRENT_PROJECT_VERSION = 1;` ← build number

### 2.4 Test on a real device

1. Plug your iPhone or iPad into the Mac via USB
2. Trust the Mac on the device when prompted
3. In Xcode's top bar, change the destination from "Any iOS Device" to your physical device
4. Press the **Play** button (or Cmd+R)
5. First run will prompt on your device to trust the developer — go to Settings → General → VPN & Device Management → trust your team

**Test these before submitting:**
- [ ] App launches without crash
- [ ] Login works
- [ ] Camera permission requested correctly on first attach-photo
- [ ] Location permission requested correctly on clock-in / site geofence
- [ ] Photo library permission requested correctly
- [ ] No horizontal scroll bugs (landscape rotation)
- [ ] Back swipe gesture works from any modal/sub-view
- [ ] Keyboard doesn't hide input fields
- [ ] Status bar is readable on every screen (dark icons on light bg, etc.)
- [ ] App still works when offline (PWA service worker handles this)

## Part 3: Submit to App Store

### 3.1 Archive the build

1. In Xcode top bar, change destination to **Any iOS Device (arm64)**
2. Menu bar: **Product** → **Archive**
3. Wait (5-15 min) for archive to complete
4. The **Organizer** window opens automatically with your archive

### 3.2 Upload to App Store Connect

1. In the Organizer, select your archive → **Distribute App**
2. Choose **App Store Connect** → **Next**
3. Choose **Upload** → **Next**
4. Keep default distribution options → **Next**
5. Choose **Automatically manage signing** → **Next**
6. Review summary → **Upload**
7. Wait (5-30 min). You'll get an email when processing completes.

### 3.3 Complete App Store Connect metadata

Go back to https://appstoreconnect.apple.com → **My Apps** → **Eagles Brothers Constructors**.

**Required screens to fill:**

#### App Information
- Bundle ID, SKU (already set)
- **Category:** Business (Primary), Productivity (Secondary)
- **Content Rights:** Check "Does your app contain, display, or access third-party content?" = **No**
- **Age Rating:** Complete the questionnaire (should be 4+)

#### Pricing and Availability
- **Price:** Free (or whatever you choose)
- **Availability:** All countries (or restrict to US)

#### App Privacy
- Click **Get Started** under Privacy
- Answer questions about what data you collect. Based on our usage:
  - **Contact Info:** Name, Email Address, Phone (linked to user, used for app functionality)
  - **User Content:** Photos, Other User Content (linked to user, used for app functionality)
  - **Location:** Precise Location (linked to user, used for app functionality — clock-in verification)
  - **Identifiers:** User ID (linked to user, used for app functionality)
- For each: **Linked to user?** Yes. **Used for tracking?** No.
- **Privacy Policy URL:** `https://app.ebconstructors.com/#/privacy` (or wherever the app is hosted)

#### Version 1.0 Information
- **What's New in This Version:** (for v1.0, leave empty or write "Initial release.")
- **App Preview and Screenshots:** Upload per device size (see `app-store-metadata.md`)
- **Promotional Text:** (170 chars, can update without new submission)
- **Description:** (4000 chars max — see `app-store-metadata.md`)
- **Keywords:** (100 chars, comma-separated)
- **Support URL:** `https://ebconstructors.com/support` or email
- **Marketing URL:** `https://ebconstructors.com` (optional)

#### Build
- Select the build you just uploaded (may take 30 min to appear)

#### Encryption
- **Does your app use encryption?** Yes (HTTPS counts)
- **Does your app qualify for any exemptions?** Yes (standard encryption for data protection)
- This keeps you off export compliance paperwork.

### 3.4 Submit for Review

1. Click **Add for Review** → **Submit for Review**
2. Review takes 1-3 days typically (can be faster)
3. You'll get email notifications on status changes
4. If rejected, you'll get specific reasons — fix and resubmit (Usually takes 1-2 rounds for first submissions)

## Common Rejection Reasons (How to Avoid)

| Reason | Fix |
|--------|-----|
| Missing privacy policy | Already handled — `/#/privacy` |
| Location usage string unclear | Info.plist strings are already clear |
| App crashes on launch | Test on a real device before submitting |
| Login wall with no demo | Create a demo account with read-only access, provide credentials in review notes |
| Missing functionality for reviewers | Explain in review notes that this is an internal tool for Eagles Brothers Constructors employees |
| Screenshots don't match app | Re-take screenshots from the actual app after final build |

## Providing Demo Credentials for Review

Apple reviewers need to see the app work. In App Store Connect → **App Review Information**:

- **Demo Account:**
  - Username: `reviewer@ebconstructors.com`
  - Password: (create a demo account with limited data, provide password here)
- **Notes:** "This is an internal construction operations app for Eagles Brothers Constructors employees and contractors. The demo account has read-only access to sample data so reviewers can see all features. No public signup — accounts are created by company administrators."

## Part 4: After Approval

1. Once approved, you can manually release or have Apple release automatically
2. The app appears on the App Store at `https://apps.apple.com/us/app/eagles-brothers-constructors/id<your-app-id>`
3. Employees can install it directly from the App Store
4. You're done — until the next version.

## For Version Updates

See `version-updates.md` for the shipping update flow.

## Troubleshooting

### "Signing requires a development team"
- Make sure you're signed into Xcode with your Apple Developer account (Xcode → Settings → Accounts)
- Select your team in Signing & Capabilities

### "No profiles for 'com.eaglesbrothers.ebcos' were found"
- Enable "Automatically manage signing"
- Xcode will create profiles the first time

### "Invalid binary" during upload
- Missing icon sizes — Xcode usually auto-generates from 1024. If not, add them in `AppIcon.appiconset`
- Deprecated API usage — update Capacitor plugins to latest major version

### Upload succeeds but build doesn't appear in App Store Connect
- Check your email — if there's an issue with encryption disclosure or missing metadata, you'll get an email
- Processing can take 30+ minutes

### TestFlight (Optional but Recommended)

Before public App Store release, use TestFlight for internal testing:

1. In App Store Connect → TestFlight tab
2. Add internal testers (up to 100 Apple IDs from your developer team)
3. Add external testers (up to 10,000, requires Apple review of first build — 1 day)
4. Testers install TestFlight app, then your app via invite link

This lets your PMs, superintendents, and foremen test the app before you commit to public App Store release.
