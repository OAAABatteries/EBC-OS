# Google Play Store Deployment

Step-by-step guide to submitting EBC-OS to the Google Play Store.

## Prerequisites

- [ ] Google account (you probably have one)
- [ ] Google Play Console membership — **$25 one-time fee** ([register here](https://play.google.com/console/u/0/signup))
- [ ] Android Studio (free, works on Windows/Mac/Linux — https://developer.android.com/studio)
- [ ] An Android phone or tablet (optional for testing, emulator works too)

**Good news:** Unlike iOS, you can build and submit Android apps from Windows.

## Part 1: One-Time Google Play Setup

### 1.1 Register Google Play Developer account

1. Go to https://play.google.com/console/u/0/signup
2. Sign in with your Google account (use a company email like `admin@ebconstructors.com`)
3. Choose **Organization** (as Eagles Brothers Constructors) — requires verification (1-3 days)
4. Pay $25 registration fee (one-time, ever)
5. Verify your identity (government ID + company docs for organization)

### 1.2 Create App in Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name:** Eagles Brothers Constructors
   - **Default language:** English – United States
   - **App or game:** App
   - **Free or paid:** Free (recommended for internal tools)
4. Accept declarations (child-directed? no. Comply with policies? yes.)
5. Click **Create app**

## Part 2: Build the Android App

On your Windows machine, in the project directory:

```bash
# Install dependencies (one-time)
npm install

# Build the web bundle and sync to Android project
npm run build
npx cap sync android

# Open the Android project in Android Studio
npx cap open android
```

Android Studio will open. Wait for Gradle sync to finish (first time takes 5-15 min).

### 2.1 Configure signing (first-time only)

Google Play requires apps to be signed. Android Studio can generate a keystore.

1. In Android Studio menu bar: **Build** → **Generate Signed Bundle / APK**
2. Choose **Android App Bundle** → **Next**
3. Under **Key store path:** click **Create new...**
   - **Key store path:** Save outside the repo, e.g., `C:\Users\abner\ebc-keystore.jks` **DO NOT COMMIT THIS FILE**
   - **Password:** Create a strong password (write it down — losing it = can never update the app)
   - **Key alias:** `ebc-os`
   - **Key password:** Same as keystore (simpler) or different (more secure)
   - **Validity:** 25 years (default, minimum 25 required by Google)
   - **Certificate fields:** Fill with EBC info
4. Click **OK** to create keystore
5. **BACK UP THIS KEYSTORE FILE AND PASSWORD.** If you lose it, you can never update your app on Google Play. Store in password manager + offline backup.

### 2.2 Bump version for this release

Before each release, increment in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 1        // ← INCREMENT EVERY UPLOAD (1, 2, 3...)
        versionName "1.0"    // ← User-facing version (1.0, 1.1, 2.0)
    }
}
```

### 2.3 Build signed release bundle

1. Menu: **Build** → **Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (AAB — required by Google Play since 2021)
3. Select your keystore + enter passwords
4. Check **release** → **Next**
5. Click **Create** (or **Finish** depending on version)
6. Wait for build to complete
7. The `.aab` file is created in `android/app/release/app-release.aab`

### 2.4 Test on a real device (optional but recommended)

Connect Android phone via USB:

1. Enable **Developer Options** on the phone (tap Build Number 7 times in Settings → About Phone)
2. Enable **USB Debugging** in Developer Options
3. In Android Studio, select your device in the top bar (next to play button)
4. Click the green **Play** button to install and launch debug build

Test the same checklist as iOS:
- [ ] App launches without crash
- [ ] Login works
- [ ] Camera permission requested on photo attach
- [ ] Location permission requested on clock-in
- [ ] Back button closes modal → returns to previous tab → shows "Press again to exit"
- [ ] Keyboard doesn't hide inputs
- [ ] No horizontal scroll issues

## Part 3: Submit to Google Play

### 3.1 Upload the App Bundle

1. Go to https://play.google.com/console → **Eagles Brothers Constructors**
2. Left sidebar: **Release** → **Testing** → **Internal testing** (recommended for first submission)
3. Click **Create new release**
4. Under **App bundles**, click **Upload** and select your `app-release.aab`
5. Wait for upload + processing (5-10 min)

**Why internal testing first?** It's immediate (no review wait), lets you test the production build with up to 100 testers, and validates the bundle before going public.

### 3.2 Complete Required Store Listing

Navigate through the left sidebar and complete every item marked with a red dot:

#### App content
- **Privacy policy URL:** `https://app.ebconstructors.com/#/privacy`
- **Ads:** No, app doesn't contain ads
- **App access:** All functionality is NOT available without restrictions (internal tool)
  - Provide test credentials in notes (same as iOS section)
- **Content rating:** Complete questionnaire (should come out as "Everyone")
- **Target audience:** 18+ (professional/business app)
- **News apps:** Not a news app
- **Data safety:** Answer all questions — matches what's in our privacy policy (see iOS doc Part 3.3)
- **Government apps:** Not a government app
- **Financial features:** The app handles financial data (invoices, payroll) for the business but doesn't offer financial services to end users — declare accurately

#### Store listing
- **App name:** Eagles Brothers Constructors
- **Short description:** (80 chars) — "Construction operations for drywall & framing subcontractors."
- **Full description:** (4000 chars) — see `app-store-metadata.md`
- **App icon:** 512×512 PNG (already in `public/icon-512.png`)
- **Feature graphic:** 1024×500 PNG (need to create — see metadata doc)
- **Phone screenshots:** At least 2, up to 8. Min 320px, max 3840px on any side.
- **Tablet screenshots:** Recommended for better placement on tablet searches.
- **Category:** Business
- **Email:** support@ebconstructors.com
- **Website:** https://ebconstructors.com
- **Phone:** (optional but recommended)

#### Main store listing graphics specs:
- **App icon:** 512×512 PNG, 32-bit alpha, max 1MB
- **Feature graphic:** 1024×500 PNG or JPG (shows at top of store listing)
- **Phone screenshots:** 16:9 or 9:16 aspect ratio, at least 320px
- **7-inch tablet screenshots:** (optional)
- **10-inch tablet screenshots:** (optional)

#### App pricing
- **Free** (or set a price; free is standard for internal business tools)

#### Countries/regions
- Select **All** or restrict to **United States**

### 3.3 Launch to Internal Testing

Once all red dots are green:

1. Release → Testing → **Internal testing**
2. Click **Review release**
3. Fix any warnings
4. Click **Start rollout to internal testing**
5. Google processes the release (usually < 1 hour for internal; up to 24 hrs first time)
6. Go to **Testers** tab → create an email list → add your EBC team emails
7. Each tester gets a link to opt in → they install via Play Store

### 3.4 Promote to Production

After internal testing validates the build:

1. Release → Production → **Create new release**
2. Click **Promote** from the internal testing release (re-uses the same bundle)
3. Fill out release notes (what's new in this version)
4. **Review release** → **Start rollout to production**
5. Google Play review: typically a few hours to 1 day (first submission might take 2-3 days)

## Common Rejection Reasons (How to Avoid)

| Reason | Fix |
|--------|-----|
| Missing privacy policy | Already handled — `/#/privacy` |
| Data safety form doesn't match app behavior | Be accurate: we collect location, photos, user content, linked to user, for app functionality, not shared with third parties for ads |
| Missing target SDK | Capacitor 8 targets SDK 34+ already, which is current |
| Deceptive behavior | Don't claim features the app doesn't have |
| Background location without justification | Only declare background location if you actually use it — our app only requires while-using-app location for most features |

## Android Signing by Google Play (Recommended)

Google Play offers **Play App Signing** — they hold your upload key for you. When you enroll:
- You sign locally with an "upload key"
- Google re-signs with the "app signing key" they manage
- Benefit: If your keystore is lost, Google can reset it (you can't recover a self-signed keystore)

To enroll:
1. When creating your first release, Google Play prompts you to enroll in Play App Signing
2. Accept — this is the modern default

Even with Play App Signing, **still back up your upload keystore** — it's needed for every release.

## For Version Updates

See `version-updates.md` for the shipping update flow.

## Troubleshooting

### Build fails with "SDK location not found"
- In Android Studio: File → Project Structure → SDK Location
- Set Android SDK path (usually `C:\Users\<you>\AppData\Local\Android\Sdk`)

### "App bundle was generated with an incompatible version"
- Update Gradle wrapper: `gradlew wrapper --gradle-version=8.7`
- Update Android Gradle Plugin in `android/build.gradle`

### "You need to use a different package name"
- `com.eaglesbrothers.ebcos` is taken → pick another reverse-domain name
- Update in BOTH `capacitor.config.json` AND `android/app/build.gradle` (applicationId)

### Upload rejected: "Version code already used"
- Increment `versionCode` in `android/app/build.gradle` — can't re-upload the same number

### Phone can't install my APK / AAB
- Enable **Install from unknown sources** for the installer app (Play Store does this automatically, but sideloading requires it)

### Google Play review taking forever
- Check the **Policy Center** in Play Console for warnings
- Respond to any "More info requested" prompts within 7 days or the review is abandoned

## Internal Distribution Alternative (No Play Store Review)

If you want to distribute the Android app to just your employees without Play Store review:

**Option A: Play Console Internal App Sharing**
- Upload AAB to Play Console → Internal App Sharing
- Get a shareable link
- Anyone with the link can install (no review required)
- Good for rapid iteration

**Option B: Direct APK distribution**
- Build APK (not AAB): Menu → Build → Generate Signed Bundle/APK → APK
- Email/MDM-distribute the APK file
- Users must enable "Install unknown apps" for their chosen browser/mail app
- No Google review but requires employees to trust the source

Either option lets you distribute to EBC employees today, while the public Play Store submission is in review.
