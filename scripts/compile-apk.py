#!/usr/bin/env python3
import os
import shutil
import subprocess
import zipfile
import tempfile

def run(cmd, cwd=None):
    if isinstance(cmd, list):
        cmd_str = " ".join(cmd)
    else:
        cmd_str = cmd
    print(f"-> {cmd_str}")
    res = subprocess.run(cmd, shell=isinstance(cmd, str), cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[!] Stderr:\n{res.stderr}")
        print(f"[!] Stdout:\n{res.stdout}")
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res.stdout

def build_apk():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root_dir, "dist")
    android_dir = os.path.join(root_dir, "android")
    app_dir = os.path.join(android_dir, "app", "src", "main")
    
    work_dir = tempfile.mkdtemp(prefix="apk_build_")
    print(f"[*] Build workspace: {work_dir}")

    # 1. Paths
    assets_dir = os.path.join(work_dir, "assets")
    res_dir = os.path.join(work_dir, "res")
    gen_dir = os.path.join(work_dir, "gen")
    bin_dir = os.path.join(work_dir, "bin")
    src_dir = os.path.join(work_dir, "src")
    
    os.makedirs(assets_dir, exist_ok=True)
    os.makedirs(res_dir, exist_ok=True)
    os.makedirs(gen_dir, exist_ok=True)
    os.makedirs(bin_dir, exist_ok=True)
    os.makedirs(src_dir, exist_ok=True)

    # 2. Stage web distribution
    if os.path.exists(dist_dir):
        print("[*] Staging web assets into Android assets/...")
        for root, dirs, files in os.walk(dist_dir):
            rel = os.path.relpath(root, dist_dir)
            target_public = os.path.join(assets_dir, "public", rel) if rel != "." else os.path.join(assets_dir, "public")
            target_www = os.path.join(assets_dir, "www", rel) if rel != "." else os.path.join(assets_dir, "www")
            os.makedirs(target_public, exist_ok=True)
            os.makedirs(target_www, exist_ok=True)
            for f in files:
                if f.endswith(".apk") or f.endswith(".map") or f == "server.cjs":
                    continue
                sf = os.path.join(root, f)
                shutil.copy2(sf, os.path.join(target_public, f))
                shutil.copy2(sf, os.path.join(target_www, f))
        
        # Also sync to android/app/src/main/assets/public
        native_assets = os.path.join(app_dir, "assets", "public")
        os.makedirs(native_assets, exist_ok=True)
        for root, dirs, files in os.walk(dist_dir):
            rel = os.path.relpath(root, dist_dir)
            t = os.path.join(native_assets, rel) if rel != "." else native_assets
            os.makedirs(t, exist_ok=True)
            for f in files:
                if f.endswith(".apk") or f.endswith(".map") or f == "server.cjs":
                    continue
                shutil.copy2(os.path.join(root, f), os.path.join(t, f))

    # 3. Copy resources from android/app/src/main/res
    src_res = os.path.join(app_dir, "res")
    if os.path.exists(src_res):
        for item in os.listdir(src_res):
            s = os.path.join(src_res, item)
            d = os.path.join(res_dir, item)
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)

    # Ensure ic_launcher exists in mipmap-hdpi
    mipmap_hdpi = os.path.join(res_dir, "mipmap-hdpi")
    os.makedirs(mipmap_hdpi, exist_ok=True)
    icon_src = os.path.join(root_dir, "public", "logo.png")
    if os.path.exists(icon_src):
        shutil.copy2(icon_src, os.path.join(mipmap_hdpi, "ic_launcher.png"))

    # Ensure values/strings.xml exists
    values_dir = os.path.join(res_dir, "values")
    os.makedirs(values_dir, exist_ok=True)
    with open(os.path.join(values_dir, "strings.xml"), "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">LogiStep</string>
</resources>''')

    # 4. Manifest
    manifest_path = os.path.join(work_dir, "AndroidManifest.xml")
    with open(manifest_path, "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.vtps.logistep"
    android:versionCode="2"
    android:versionName="1.0.1">

    <uses-sdk
        android:minSdkVersion="21"
        android:targetSdkVersion="34" />

    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    <uses-feature android:name="android.hardware.location.network" android:required="false" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">

        <activity
            android:name="org.vtps.logistep.MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>''')

    # 5. Java source
    java_target_dir = os.path.join(src_dir, "org", "vtps", "logistep")
    os.makedirs(java_target_dir, exist_ok=True)
    java_src = os.path.join(app_dir, "java", "org", "vtps", "logistep", "MainActivity.java")
    shutil.copy2(java_src, os.path.join(java_target_dir, "MainActivity.java"))

    # 6. Locate Android SDK
    android_jar = "/opt/android-sdk/platforms/android-34/android.jar"
    if not os.path.exists(android_jar):
        android_jar = "/usr/lib/android-sdk/platforms/android-23/android.jar"
    print(f"[*] Using Android SDK jar: {android_jar}")

    # 7. Generate R.java via aapt
    print("[*] Generating R.java via aapt...")
    run([
        "aapt", "package", "-f", "-m",
        "-J", gen_dir,
        "-M", manifest_path,
        "-S", res_dir,
        "-I", android_jar,
        "--min-sdk-version", "21",
        "--target-sdk-version", "34"
    ], cwd=work_dir)

    # 8. Compile Java sources with javac
    print("[*] Compiling Java code with javac...")
    r_java = os.path.join(gen_dir, "org", "vtps", "logistep", "R.java")
    main_java = os.path.join(java_target_dir, "MainActivity.java")
    run([
        "javac", "-source", "8", "-target", "8",
        "-bootclasspath", android_jar,
        "-cp", f"{android_jar}:{gen_dir}",
        "-d", bin_dir,
        main_java, r_java
    ], cwd=work_dir)

    # 9. Convert class files to classes.dex using dalvik-exchange (dx)
    print("[*] Creating classes.dex via dalvik-exchange...")
    classes_dex = os.path.join(bin_dir, "classes.dex")
    run([
        "dalvik-exchange", "--dex",
        f"--output={classes_dex}",
        bin_dir
    ], cwd=work_dir)

    # 10. Package initial APK with resources and assets
    print("[*] Packaging APK resources and assets via aapt...")
    base_apk = os.path.join(work_dir, "base.apk")
    run([
        "aapt", "package", "-f",
        "-M", manifest_path,
        "-S", res_dir,
        "-A", assets_dir,
        "-I", android_jar,
        "-F", base_apk,
        "--min-sdk-version", "21",
        "--target-sdk-version", "34"
    ], cwd=work_dir)

    # 11. Add classes.dex into base.apk
    print("[*] Inserting classes.dex into APK archive...")
    with zipfile.ZipFile(base_apk, 'a', compression=zipfile.ZIP_DEFLATED) as apk_zip:
        apk_zip.write(classes_dex, "classes.dex")

    # 12. 4-byte Zipalign APK
    print("[*] Aligning APK with zipalign (4-byte alignment)...")
    aligned_apk = os.path.join(work_dir, "aligned.apk")
    run([
        "zipalign", "-f", "-p", "4",
        base_apk, aligned_apk
    ], cwd=work_dir)

    # 13. Persistent debug keystore
    keystore_path = os.path.join(root_dir, "debug.keystore")
    if not os.path.exists(keystore_path):
        print("[*] Generating Android debug signing key...")
        run([
            "keytool", "-genkeypair",
            "-keystore", keystore_path,
            "-storepass", "android",
            "-alias", "androiddebugkey",
            "-keypass", "android",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-dname", "CN=LogiStep,OU=VTP,O=VTPFleet,C=US"
        ], cwd=root_dir)

    # 14. Sign APK with apksigner (v1, v2, and v3)
    print("[*] Signing APK with apksigner (v1, v2, v3 schemes)...")
    signed_apk = os.path.join(work_dir, "LogiStep.apk")
    shutil.copy2(aligned_apk, signed_apk)
    run([
        "apksigner", "sign",
        "--ks", keystore_path,
        "--ks-pass", "pass:android",
        "--key-pass", "pass:android",
        "--v1-signing-enabled", "true",
        "--v2-signing-enabled", "true",
        "--v3-signing-enabled", "true",
        signed_apk
    ], cwd=work_dir)

    # 15. Verify signed APK
    print("[*] Verifying signed APK with apksigner...")
    verify_out = run(["apksigner", "verify", "--verbose", signed_apk], cwd=work_dir)
    print(verify_out.strip())

    # 16. Distribute to all target locations
    destinations = [
        os.path.join(root_dir, "LogiStep.apk"),
        os.path.join(root_dir, "apk", "LogiStep.apk"),
        os.path.join(root_dir, "public", "LogiStep.apk"),
        os.path.join(root_dir, "dist", "LogiStep.apk"),
        os.path.join(app_dir, "assets", "public", "LogiStep.apk"),
    ]

    apk_size = os.path.getsize(signed_apk)
    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(signed_apk, dest)
        print(f"[✓] Deployed: {dest} ({apk_size} bytes)")

    shutil.rmtree(work_dir, ignore_errors=True)
    print(f"\n[SUCCESS] Genuine native Android APK compiled and cryptographically verified!")

if __name__ == "__main__":
    build_apk()
