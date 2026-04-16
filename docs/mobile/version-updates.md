# Shipping Version Updates

After your first release, this is the shorter flow for every subsequent update.

## Version Numbering Convention

Use semantic versioning for `versionName` / `MARKETING_VERSION`:
- **MAJOR.MINOR.PATCH** (e.g., `1.0.0` → `1.0.1` → `1.1.0` → `2.0.0`)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, no new features
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **MAJOR** (1.x.x → 2.0.0): Breaking changes, major redesigns

Build numbers (`versionCode` / `CURRENT_PROJECT_VERSION`) are **monotonically increasing integers**:
- Increment by 1 every single upload, even if version name stays the same
- iOS and Android build numbers are independent; you can keep them in sync for sanity

## Update Procedure

### 1. Make and test your code changes

```bash
# In the project root on any OS
npm run dev  # Test in browser
npm run build  # Verify production build succeeds
```

### 2. Bump versions in 3 places

**`package.json`:**
```json
{
  "version": "1.1.0"   // ← new version
}
```

**`ios/App/App.xcodeproj/project.pbxproj`** (edit both occurrences):
```
MARKETING_VERSION = 1.1.0;        ← new version
CURRENT_PROJECT_VERSION = 2;       ← incremented build number
```

**`android/app/build.gradle`:**
```gradle
defaultConfig {
    versionCode 2       // ← incremented
    versionName "1.1.0" // ← new version
}
```

### 3. Sync Capacitor

```bash
npm run build && npx cap sync
```

### 4. Build for iOS (requires Mac)

```bash
npx cap open ios
```

In Xcode:
1. **Product → Archive** (5-15 min)
2. **Organizer → Distribute App → App Store Connect → Upload**
3. Wait for processing (~30 min)
4. Go to **App Store Connect → My Apps → Your App → + (version)** → create new version entry
5. Select the new build
6. Fill in "What's New in This Version" (required for each update)
7. Submit for review

**Review time:** Usually 1 day for updates (vs 1-3 days first submission).

### 5. Build for Android (any OS)

```bash
npx cap open android
```

In Android Studio:
1. **Build → Generate Signed Bundle / APK → Android App Bundle → release**
2. Use the same keystore as first release
3. Upload the new `.aab` to **Google Play Console → Production → Create new release**
4. Fill in "Release notes" (per language)
5. Review and rollout

**Review time:** Usually a few hours for updates.

## Staged Rollouts

For risky updates, roll out to a percentage of users first:

**Google Play:**
- When creating release, choose **Staged rollout** → 10%, 25%, 50%, 100%
- Monitor for crashes; halt rollout if crash rate spikes
- Ramp up over days

**iOS App Store:**
- After approval, choose **Phased Release** in App Store Connect
- Releases to 1% → 2% → 5% → 10% → 20% → 50% → 100% over 7 days
- Can pause or release to all at any time

## Rollback Strategy

Neither store has "one-click rollback." If a bad version ships:

**iOS:**
1. Immediately submit a fix build with higher build number
2. Expedited review request: https://developer.apple.com/contact/app-store/?topic=expedited
3. Only approved for critical bugs

**Android:**
1. Halt rollout in Play Console (if staged)
2. Roll out the previous known-good `.aab` (must have higher versionCode than current) — you may need to rebuild with an incremented versionCode since Play doesn't let you re-release old versionCodes

**Lesson:** Test thoroughly before shipping. Use TestFlight (iOS) and Internal Testing (Android) before public release.

## Release Notes Best Practices

In "What's New" / "Release notes," be specific:

❌ Bad:
> Bug fixes and improvements.

✅ Good:
> • Fixed crash when opening large project reports
> • Added company-wide margin KPI to dashboard
> • Faster app launch on older devices
> • Updated safety JSA templates

Users care about fixes that affected them. Builds trust.

## Automating the Bump

To avoid forgetting version bumps, consider a simple script:

```bash
# scripts/bump-version.sh
#!/bin/bash
NEW_VERSION=$1
NEW_BUILD=$2

# package.json
npm version $NEW_VERSION --no-git-tag-version

# iOS
sed -i '' "s/MARKETING_VERSION = .*;/MARKETING_VERSION = $NEW_VERSION;/g" ios/App/App.xcodeproj/project.pbxproj
sed -i '' "s/CURRENT_PROJECT_VERSION = .*;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" ios/App/App.xcodeproj/project.pbxproj

# Android
sed -i '' "s/versionName .*/versionName \"$NEW_VERSION\"/g" android/app/build.gradle
sed -i '' "s/versionCode .*/versionCode $NEW_BUILD/g" android/app/build.gradle

echo "Bumped to $NEW_VERSION (build $NEW_BUILD)"
```

Run: `./scripts/bump-version.sh 1.1.0 2`

(The `sed -i ''` syntax is for macOS; on Linux use `sed -i`, on Windows Git Bash use `sed -i` too.)
