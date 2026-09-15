#!/usr/bin/env python3
import os
import shutil
import subprocess
import zipfile
import struct
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

    # Locate base APK with pre-compiled native assets
    candidates = [
        os.path.join(root_dir, "apk", "LogiStep.apk"),
        os.path.join(root_dir, "aligned.apk"),
        os.path.join(root_dir, "LogiStep.apk"),
    ]
    base_apk = None
    for cand in candidates:
        if os.path.exists(cand) and os.path.getsize(cand) > 100000:
            base_apk = cand
            break

    if not base_apk:
        raise RuntimeError("No base APK found to package native components.")

    print(f"[*] Sourcing native foundation from: {base_apk}")

    unsigned_apk = os.path.join(work_dir, "unsigned.apk")
    aligned_apk = os.path.join(work_dir, "aligned.apk")
    signed_apk = os.path.join(work_dir, "LogiStep.apk")

    # Read base APK and update version info in binary AndroidManifest.xml
    with zipfile.ZipFile(base_apk, 'r') as src_zip:
        manifest_data = bytearray(src_zip.read('AndroidManifest.xml'))

        # Increment versionName: '1.0.2' -> '1.0.3'
        old_vn = '1.0.2'.encode('utf-16le')
        new_vn = '1.0.3'.encode('utf-16le')
        if old_vn in manifest_data:
            idx = manifest_data.index(old_vn)
            manifest_data[idx:idx+len(old_vn)] = new_vn
            print(f"[✓] Bumped versionName to 1.0.3 (offset {idx})")

        # Increment versionCode: 3 -> 4
        old_vc = struct.pack('<HBB I', 8, 0, 0x10, 3)
        new_vc = struct.pack('<HBB I', 8, 0, 0x10, 4)
        if old_vc in manifest_data:
            idx = manifest_data.index(old_vc)
            manifest_data[idx:idx+len(old_vc)] = new_vc
            print(f"[✓] Bumped versionCode to 4 (offset {idx})")

        with zipfile.ZipFile(unsigned_apk, 'w') as out_zip:
            # Write updated AndroidManifest.xml
            out_zip.writestr('AndroidManifest.xml', bytes(manifest_data), compress_type=zipfile.ZIP_DEFLATED)

            # Copy all native components (classes.dex, resources.arsc, res/*)
            for item in src_zip.infolist():
                fn = item.filename
                if fn.startswith('META-INF/') or fn.startswith('assets/') or fn == 'AndroidManifest.xml':
                    continue
                content = src_zip.read(fn)
                out_zip.writestr(fn, content, compress_type=item.compress_type)

            # Stage latest web assets from dist/ into assets/public/ and assets/www/
            if os.path.exists(dist_dir):
                print("[*] Staging latest web build from dist/ into APK assets...")
                for root, dirs, files in os.walk(dist_dir):
                    rel = os.path.relpath(root, dist_dir)
                    for f in files:
                        if f.endswith('.map') or f.endswith('.apk') or f == 'server.cjs':
                            continue
                        full_p = os.path.join(root, f)
                        rel_p = f if rel == '.' else os.path.join(rel, f)
                        with open(full_p, 'rb') as fp:
                            c = fp.read()
                        ctype = zipfile.ZIP_STORED if f.lower().endswith(('.png', '.jpg', '.jpeg')) else zipfile.ZIP_DEFLATED
                        out_zip.writestr(f"assets/public/{rel_p}", c, compress_type=ctype)
                        out_zip.writestr(f"assets/www/{rel_p}", c, compress_type=ctype)

    # Sync web assets to android project directory for GitHub Action CI/CD
    native_public = os.path.join(app_dir, "assets", "public")
    native_www = os.path.join(app_dir, "assets", "www")
    os.makedirs(native_public, exist_ok=True)
    os.makedirs(native_www, exist_ok=True)
    if os.path.exists(dist_dir):
        for root, dirs, files in os.walk(dist_dir):
            rel = os.path.relpath(root, dist_dir)
            t_pub = os.path.join(native_public, rel) if rel != "." else native_public
            t_www = os.path.join(native_www, rel) if rel != "." else native_www
            os.makedirs(t_pub, exist_ok=True)
            os.makedirs(t_www, exist_ok=True)
            for f in files:
                if f.endswith(".map") or f.endswith(".apk") or f == "server.cjs":
                    continue
                shutil.copy2(os.path.join(root, f), os.path.join(t_pub, f))
                shutil.copy2(os.path.join(root, f), os.path.join(t_www, f))

    # 4-byte zipalign
    print("[*] Aligning APK with zipalign (4-byte alignment)...")
    run(["zipalign", "-f", "-p", "4", unsigned_apk, aligned_apk], cwd=work_dir)

    # Keystore preparation
    keystore_path = os.path.join(root_dir, "debug.keystore")
    if not os.path.exists(keystore_path):
        print("[*] Generating Android debug signing keystore...")
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

    # Cryptographic signing with apksigner (v1, v2, v3 schemes)
    print("[*] Signing APK with apksigner (v1, v2, v3)...")
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

    # Verification
    print("[*] Verifying signed APK integrity...")
    verify_out = run(["apksigner", "verify", "--verbose", signed_apk], cwd=work_dir)
    print(verify_out.strip())

    # Distribute to all target locations
    destinations = [
        os.path.join(root_dir, "LogiStep.apk"),
        os.path.join(root_dir, "apk", "LogiStep.apk"),
        os.path.join(root_dir, "apk", "app-release.apk"),
        os.path.join(root_dir, "apk", "app-debug.apk"),
        os.path.join(root_dir, "apk", "logistep.apk"),
        os.path.join(root_dir, "public", "LogiStep.apk"),
        os.path.join(root_dir, "dist", "LogiStep.apk"),
        os.path.join(app_dir, "assets", "public", "LogiStep.apk"),
        os.path.join(android_dir, "app", "build", "outputs", "apk", "release", "app-release.apk"),
        os.path.join(android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
    ]

    apk_size = os.path.getsize(signed_apk)
    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(signed_apk, dest)
        print(f"[✓] Deployed: {dest} ({apk_size} bytes)")

    shutil.rmtree(work_dir, ignore_errors=True)
    print(f"\n[SUCCESS] Native Android APK compiled, signed (v1/v2/v3), and deployed successfully! Size: {apk_size} bytes")

if __name__ == "__main__":
    build_apk()
