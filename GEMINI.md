# Gemini Instructions & Directives

## Persistent Directives

### 1. GitHub CI/CD APK Build Pipeline (Same as Presence App)
- The Android APK is generated using GitHub Actions (`.github/workflows/build-apk.yml`) and the Android project directory (`android/`).
- Do NOT display any "APK / App" buttons, download modals, or APK options in the web application UI.
- When exported or pushed to GitHub, the repository automatically compiles the Android APK through GitHub Actions and uploads the APK artifacts for download.

### 2. LogiStep 3D Branding
- Use the official 3D metallic silver 'L' with ascending glowing crystal nodes and ruby GPS marker logo (`/public/logo.png` and `/public/icon.svg`) across all internal components (header, modals, status cards) and external manifest assets.

### 3. Automatic APK Generation & Sync in apk/ Folder
- Whenever ANY modification is made to the app, the agent MUST recompile and update the native Android APK files directly in the `apk/` folder (`apk/LogiStep.apk`, `apk/app-release.apk`, `apk/app-debug.apk`, and `apk/logistep.apk`).
- Always increment the APK `versionCode` and update all copies in root, `apk/`, and `dist/` so the user always has the latest installable Android APK.
