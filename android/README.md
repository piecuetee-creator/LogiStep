# LogiStep Android Project & GitHub APK Build

This directory contains the Android application wrapper for **LogiStep - VTP Fleet Presence Tracker**.

## Automated GitHub Actions APK Build (Recommended)
When pushed to GitHub, the `.github/workflows/build-apk.yml` workflow triggers automatically:
1. Builds the latest web assets (`npm run build`).
2. Syncs assets into `android/app/src/main/assets/public`.
3. Runs Gradle to assemble both Release & Debug APKs.
4. Uploads `LogiStep-Release-APK` and `LogiStep-Debug-APK` to GitHub Actions Artifacts for instant download.

To manually trigger an APK build on GitHub:
- Go to the **Actions** tab on your GitHub repository.
- Select **Build Android APK**.
- Click **Run workflow**.
- Download the generated APK from the workflow summary once complete.

## Local Android Build
```bash
# 1. Build web assets
npm run build

# 2. Copy to assets
mkdir -p android/app/src/main/assets/public
cp -r dist/* android/app/src/main/assets/public/

# 3. Build APK with Gradle
cd android
./gradlew assembleRelease
# The APK will be located at android/app/build/outputs/apk/release/app-release.apk
```
