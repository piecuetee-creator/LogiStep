#!/usr/bin/env python3
import os
import shutil
import zipfile
import tempfile
import subprocess

def run_cmd(cmd, cwd=None):
    res = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[!] Command failed: {' '.join(cmd)}\nStderr: {res.stderr}\nStdout: {res.stdout}")
        raise RuntimeError(f"Command failed with exit code {res.returncode}")
    return res.stdout

def package_apk():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root_dir, "dist")
    base_apk = os.path.join(root_dir, "LogiStep.apk")
    keystore_path = os.path.join(root_dir, "debug.keystore")
    
    if not os.path.exists(dist_dir):
        print("[!] dist/ not found, skipping APK packaging.")
        return

    # 1. Sync dist to android/app/src/main/assets/public
    android_assets = os.path.join(root_dir, "android", "app", "src", "main", "assets", "public")
    os.makedirs(android_assets, exist_ok=True)
    for root, dirs, files in os.walk(dist_dir):
        rel_dir = os.path.relpath(root, dist_dir)
        target_dir = os.path.join(android_assets, rel_dir) if rel_dir != "." else android_assets
        os.makedirs(target_dir, exist_ok=True)
        for f in files:
            if f.endswith(".apk"):
                continue
            src_file = os.path.join(root, f)
            dest_file = os.path.join(target_dir, f)
            shutil.copy2(src_file, dest_file)
    print(f"[*] Synced web distribution to {android_assets}")

    if not os.path.exists(base_apk):
        print("[!] Base LogiStep.apk not found at root.")
        return

    # 2. Ensure debug keystore exists
    if not os.path.exists(keystore_path):
        print("[*] Generating Android debug keystore...")
        run_cmd([
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

    # 3. Strip stale signatures and old assets from base APK
    temp_dir = tempfile.mkdtemp(prefix="apk_pack_")
    unsigned_apk = os.path.join(temp_dir, "unsigned.apk")
    aligned_apk = os.path.join(temp_dir, "aligned.apk")

    print("[*] Stripping obsolete signatures and packaging latest web assets...")
    with zipfile.ZipFile(base_apk, "r") as zin:
        with zipfile.ZipFile(unsigned_apk, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            # Copy all native components (classes.dex, resources.arsc, AndroidManifest.xml, res/)
            # but strictly omit old META-INF and old assets
            for item in zin.infolist():
                fn = item.filename
                if not fn.startswith("META-INF/") and not fn.startswith("assets/"):
                    zout.writestr(item, zin.read(fn))
            
            # Write all fresh dist assets into both assets/public/ and assets/www/
            for root, dirs, files in os.walk(dist_dir):
                for f in files:
                    if f.endswith(".apk") or f.endswith(".map") or f == "server.cjs":
                        continue
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, dist_dir).replace("\\", "/")
                    
                    with open(full_path, "rb") as bf:
                        content = bf.read()
                    
                    zout.writestr(f"assets/public/{rel_path}", content)
                    zout.writestr(f"assets/www/{rel_path}", content)

    # 4. Zipalign APK (4-byte alignment mandatory for Android 11+)
    print("[*] Performing 4-byte memory zipalign...")
    run_cmd(["zipalign", "-f", "-p", "4", unsigned_apk, aligned_apk], cwd=root_dir)

    # 5. Sign APK with apksigner (enabling v1, v2, and v3)
    print("[*] Signing APK with apksigner (v1, v2, v3 schemes)...")
    run_cmd([
        "apksigner", "sign",
        "--ks", keystore_path,
        "--ks-pass", "pass:android",
        "--key-pass", "pass:android",
        "--v1-signing-enabled", "true",
        "--v2-signing-enabled", "true",
        "--v3-signing-enabled", "true",
        aligned_apk
    ], cwd=root_dir)

    # 6. Verify APK signature
    print("[*] Verifying APK signature...")
    verify_res = run_cmd(["apksigner", "verify", "--verbose", aligned_apk], cwd=root_dir)
    print(verify_res.strip())

    # 7. Distribute verified signed APK to all target locations
    target_locations = [
        os.path.join(root_dir, "LogiStep.apk"),
        os.path.join(root_dir, "public", "LogiStep.apk"),
        os.path.join(root_dir, "apk", "LogiStep.apk"),
        os.path.join(root_dir, "dist", "LogiStep.apk"),
        os.path.join(android_assets, "LogiStep.apk")
    ]

    apk_size = os.path.getsize(aligned_apk)
    for loc in target_locations:
        os.makedirs(os.path.dirname(loc), exist_ok=True)
        shutil.copy2(aligned_apk, loc)
        print(f"[✓] Deployed verified APK at {loc} ({apk_size} bytes)")

    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"\n[SUCCESS] Android APK built, 4-byte aligned, and cryptographically signed (v1/v2/v3)!")

if __name__ == "__main__":
    package_apk()
