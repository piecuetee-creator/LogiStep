#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess
import zipfile

def run(cmd, cwd=None):
    print(f"-> Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    res = subprocess.run(cmd, shell=isinstance(cmd, str), cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"ERROR ({res.returncode}):\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res.stdout

def build_apk():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root_dir, "dist")
    
    # 1. Ensure web app is built
    if not os.path.exists(os.path.join(dist_dir, "index.html")):
        print("[*] Building web app with Vite...")
        run(["npm", "run", "build"], cwd=root_dir)
        
    work_dir = "/tmp/apk_build_workspace"
    if os.path.exists(work_dir):
        shutil.rmtree(work_dir)
    
    src_dir = os.path.join(work_dir, "src", "org", "vtps", "logistep")
    res_dir = os.path.join(work_dir, "res")
    values_dir = os.path.join(res_dir, "values")
    drawable_dir = os.path.join(res_dir, "mipmap-hdpi")
    gen_dir = os.path.join(work_dir, "gen")
    bin_dir = os.path.join(work_dir, "bin")
    assets_dir = os.path.join(work_dir, "assets")

    os.makedirs(src_dir, exist_ok=True)
    os.makedirs(values_dir, exist_ok=True)
    os.makedirs(drawable_dir, exist_ok=True)
    os.makedirs(gen_dir, exist_ok=True)
    os.makedirs(bin_dir, exist_ok=True)
    os.makedirs(assets_dir, exist_ok=True)

    # 2. Copy web assets to Android assets
    print("[*] Staging web assets into Android assets/...")
    shutil.copytree(dist_dir, os.path.join(assets_dir, "www"))

    # 3. Process and convert app icon to genuine PNG
    from PIL import Image
    icon_src = os.path.join(root_dir, "public", "logo.png")
    if os.path.exists(icon_src):
        img = Image.open(icon_src).convert("RGBA")
        img.save(os.path.join(drawable_dir, "ic_launcher.png"), "PNG")
        print(f"[*] Converted {icon_src} to genuine PNG icon ({img.size})")

    # 4. Create strings.xml
    with open(os.path.join(values_dir, "strings.xml"), "w") as f:
        f.write('''<resources>
    <string name="app_name">LogiStep</string>
</resources>''')

    # 5. Create AndroidManifest.xml
    manifest_path = os.path.join(work_dir, "AndroidManifest.xml")
    with open(manifest_path, "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.vtps.logistep"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-feature android:name="android.hardware.location.gps" android:required="true" />
    <uses-feature android:name="android.hardware.location.network" android:required="false" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
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

    # 6. Create MainActivity.java
    main_activity_path = os.path.join(src_dir, "MainActivity.java")
    with open(main_activity_path, "w") as f:
        f.write('''package org.vtps.logistep;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.GeolocationPermissions;
import android.content.pm.PackageManager;
import android.Manifest;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;
    private WebView webView;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    requestPermissions(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    }, LOCATION_PERMISSION_REQUEST_CODE);
                }
            }
        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                }, LOCATION_PERMISSION_REQUEST_CODE);
            }
        }

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingGeoCallback != null && pendingGeoOrigin != null) {
                pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
                pendingGeoCallback = null;
                pendingGeoOrigin = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
''')

    android_jar = "/usr/lib/android-sdk/platforms/android-23/android.jar"
    if not os.path.exists(android_jar):
        raise FileNotFoundError(f"Missing android.jar at {android_jar}")

    # 7. Generate R.java via aapt
    print("[*] Generating R.java via aapt...")
    run([
        "aapt", "package", "-f", "-m",
        "-J", gen_dir,
        "-M", manifest_path,
        "-S", res_dir,
        "-I", android_jar
    ], cwd=work_dir)

    # 8. Compile Java sources with javac
    print("[*] Compiling Java code with javac...")
    r_java = os.path.join(gen_dir, "org", "vtps", "logistep", "R.java")
    run([
        "javac", "-source", "8", "-target", "8",
        "-bootclasspath", android_jar,
        "-cp", f"{android_jar}:{gen_dir}",
        "-d", bin_dir,
        main_activity_path, r_java
    ], cwd=work_dir)

    # 9. Convert class files to classes.dex using dalvik-exchange
    print("[*] Creating classes.dex via dalvik-exchange...")
    classes_dex = os.path.join(bin_dir, "classes.dex")
    run([
        "/usr/bin/dalvik-exchange", "--dex",
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
        "-F", base_apk
    ], cwd=work_dir)

    # 11. Add classes.dex into base.apk
    print("[*] Inserting classes.dex into APK archive...")
    with zipfile.ZipFile(base_apk, 'a', compression=zipfile.ZIP_DEFLATED) as apk_zip:
        apk_zip.write(classes_dex, "classes.dex")

    # 12. Zipalign APK
    print("[*] Aligning APK with zipalign...")
    aligned_apk = os.path.join(work_dir, "aligned.apk")
    run([
        "zipalign", "-f", "-p", "4",
        base_apk, aligned_apk
    ], cwd=work_dir)

    # 13. Generate debug keystore if not present
    keystore_path = os.path.join(work_dir, "debug.keystore")
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
        ], cwd=work_dir)

    # 14. Sign APK with apksigner
    print("[*] Signing APK with apksigner...")
    signed_apk = os.path.join(work_dir, "LogiStep.apk")
    shutil.copy2(aligned_apk, signed_apk)
    run([
        "apksigner", "sign",
        "--ks", keystore_path,
        "--ks-pass", "pass:android",
        "--key-pass", "pass:android",
        signed_apk
    ], cwd=work_dir)

    # 15. Verify signed APK
    print("[*] Verifying signed APK...")
    verify_output = run([
        "apksigner", "verify", "--verbose", signed_apk
    ], cwd=work_dir)
    print(verify_output)

    # 16. Distribute output APK
    apk_out_dir = os.path.join(root_dir, "apk")
    public_apk_dir = os.path.join(root_dir, "public")
    dist_apk_dir = os.path.join(root_dir, "dist")
    
    os.makedirs(apk_out_dir, exist_ok=True)
    os.makedirs(public_apk_dir, exist_ok=True)
    os.makedirs(dist_apk_dir, exist_ok=True)

    destinations = [
        os.path.join(root_dir, "LogiStep.apk"),
        os.path.join(apk_out_dir, "LogiStep.apk"),
        os.path.join(public_apk_dir, "LogiStep.apk"),
        os.path.join(dist_apk_dir, "LogiStep.apk"),
    ]

    for dest in destinations:
        shutil.copy2(signed_apk, dest)
        print(f"[+] Output ready: {dest} ({os.path.getsize(dest)} bytes)")

    print("\nSUCCESS: Real Android APK compiled, aligned, and signed successfully!")

if __name__ == "__main__":
    build_apk()
