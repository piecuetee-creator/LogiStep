# Project Instructions & Directives

## Persistent Directives

### 1. Mandatory APK Generation on Every Change
- **Generate and maintain the `/apk` folder in repository root and `/public/apk`**: After EVERY single change requested by the user, you MUST run `npx tsx scripts/build-apk.ts` or `npm run build:apk` to generate and refresh the `LogiStep-release.apk` and its metadata (`AndroidManifest.xml`, `apk-build-info.json`, `README.md`) in the `apk/` and `public/apk/` directories.
- Ensure the app build pipeline (`npm run build`) automatically triggers APK packaging so that GitHub exports, downloads, and mobile distribution always include the fresh APK file.

### 2. LogiStep 3D Branding
- Use the official 3D metallic silver 'L' with ascending glowing crystal nodes and ruby GPS marker logo (`/public/logo.png` and `/public/icon.svg`) across all internal components (header, modals, status cards, PWA modal) and external manifest assets.
