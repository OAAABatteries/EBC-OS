# EBC-OS Mobile Deployment

Complete guide to getting EBC-OS on the Apple App Store and Google Play Store.

## Current State

✅ **Already done in this repo:**
- Capacitor core + iOS + Android platforms installed
- Bundle ID: `com.eaglesbrothers.ebcos`
- App name: Eagles Brothers Constructors
- Core plugins: camera, geolocation, haptics, keyboard, push notifications, splash screen, status bar
- iOS Info.plist with all permission usage strings
- Android manifest with all permissions declared
- Service worker + PWA manifest
- Privacy Policy page at `/#/privacy`
- Android smart back-button handler (closes modals, exits with confirmation)
- Safe-area CSS for notch devices
- App icons (favicon + 192 + 512 + AppIcon 1024)
- Version 1.0 / Build 1 in both native projects

❌ **What you still need to do:**
1. Apple Developer account ($99/year)
2. Google Play Console account ($25 one-time)
3. Mac with Xcode (for iOS — no workaround, Apple requires macOS)
4. Android Studio (for Android — works on Windows)
5. App Store screenshots (6.7"/6.5"/5.5" iPhone + 12.9" iPad)
6. Google Play screenshots (phone + 7" tablet + 10" tablet)
7. Privacy Policy URL (can use `https://app.ebconstructors.com/#/privacy`)
8. First submission review (1-3 days iOS, a few hours to 1 day Android)

## Read These Docs In Order

1. **[ios-deployment.md](./ios-deployment.md)** — Step-by-step App Store submission
2. **[android-deployment.md](./android-deployment.md)** — Step-by-step Google Play submission
3. **[app-store-metadata.md](./app-store-metadata.md)** — Screenshots, description, keywords, categories (do this first — both stores need the same assets)
4. **[version-updates.md](./version-updates.md)** — How to ship updates after launch

## Quick Command Reference

```bash
# Build web app and sync to native projects (run from project root)
npm run build && npx cap sync

# Open iOS project in Xcode (Mac only)
npx cap open ios

# Open Android project in Android Studio
npx cap open android

# Quick iOS flow (builds + syncs + opens Xcode)
npm run cap:ios

# Quick Android flow (builds + syncs + opens Android Studio)
npm run cap:android
```

## Architecture

Capacitor wraps your existing React web app as a native shell. **There is one codebase** (`src/`). The iOS app and Android app both load the same bundled web code from `dist/`.

```
EBC-OS/
├── src/                  ← React web app (one codebase)
├── dist/                 ← Built web bundle (created by npm run build)
├── public/               ← Static assets (icons, manifest.json, sw.js)
├── ios/                  ← Xcode project (native iOS shell)
│   └── App/App/
│       ├── Info.plist    ← iOS permissions + metadata
│       └── Assets.xcassets/AppIcon.appiconset/  ← App icon
├── android/              ← Android Studio project (native Android shell)
│   └── app/
│       ├── build.gradle           ← Version, signing, build config
│       └── src/main/
│           ├── AndroidManifest.xml  ← Android permissions
│           └── res/mipmap-*/        ← App icons for each density
├── capacitor.config.json ← Capacitor-wide config (bundle ID, plugins)
└── docs/mobile/          ← You are here
```

## Support

For Capacitor-specific questions: https://capacitorjs.com/docs
For App Store review questions: https://developer.apple.com/app-store/review/
For Google Play review questions: https://support.google.com/googleplay/android-developer
