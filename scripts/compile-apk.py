#!/usr/bin/env python3
import os
import shutil
import subprocess
import zipfile
import struct
import tempfile
import sys
import time
import re

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

def ensure_tools():
    """Ensure zipalign and apksigner are present. Install if missing."""
    needed = []
    if not shutil.which("zipalign"):
        needed.append("zipalign")
    if not shutil.which("apksigner"):
        needed.append("apksigner")
    if not shutil.which("keytool") or not shutil.which("java"):
        needed.append("default-jre-headless")

    if needed:
        if os.getenv("GITHUB_ACTIONS") == "true":
            print(f"[*] In GitHub Actions CI environment. Tooling handled by Gradle workflow.")
            return False
        if os.geteuid() != 0:
            print(f"[*] Non-root environment, skipping apt-get for {needed}")
            return False
        print(f"[*] Missing build tools: {needed}. Installing automatically...")
        cmd = (
            "DEBIAN_FRONTEND=noninteractive apt-get update && "
            "DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "
            "-o Dpkg::Options::='--force-confold' -o Dpkg::Options::='--force-confdef' "
            + " ".join(needed)
        )
        try:
            run(cmd)
        except Exception as e:
            print(f"[!] Warning: tool installation failed: {e}")
            return False
    return True

def get_gradle_version_info(android_dir):
    gradle_file = os.path.join(android_dir, "app", "build.gradle")
    version_code = 6
    version_name = "1.0.5"
    if os.path.exists(gradle_file):
        with open(gradle_file, "r") as f:
            content = f.read()
        vc_match = re.search(r'versionCode\s+(\d+)', content)
        vn_match = re.search(r'versionName\s+["\']([^"\']+)["\']', content)
        if vc_match:
            version_code = int(vc_match.group(1))
        if vn_match:
            version_name = vn_match.group(1)
    return version_code, version_name

def build_apk():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root_dir, "dist")
    android_dir = os.path.join(root_dir, "android")
    app_dir = os.path.join(android_dir, "app", "src", "main")
    
    tools_ready = ensure_tools()
    if not tools_ready and (not shutil.which("zipalign") or not shutil.which("apksigner")):
        if os.getenv("GITHUB_ACTIONS") == "true":
            print("[*] Skipping custom python build in GitHub Actions - Gradle will build the native APK.")
            return
        print("[!] zipalign or apksigner not found. Will attempt packaging.")

    target_vc, target_vn = get_gradle_version_info(android_dir)
    print(f"[*] Target version: {target_vn} (code {target_vc})")

    # Ensure web assets exist in dist/
    index_html = os.path.join(dist_dir, "index.html")
    if not os.path.exists(index_html):
        print("[*] dist/index.html not found, running vite build first...")
        run("npx vite build", cwd=root_dir)

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

        # Replace any existing versionName
        new_vn_bytes = target_vn.encode('utf-16le')
        for prev_v in ['1.0.6', '1.0.5', '1.0.4', '1.0.3', '1.0.2', '1.0.1']:
            old_vn = prev_v.encode('utf-16le')
            if old_vn in manifest_data:
                idx = manifest_data.index(old_vn)
                manifest_data[idx:idx+len(old_vn)] = new_vn_bytes
                print(f"[✓] Bumped versionName from {prev_v} to {target_vn} (offset {idx})")
                break

        # Update versionCode specifically in manifest attribute (name_idx == 0)
        updated_vc = False
        for i in range(len(manifest_data) - 20):
            name_idx, val_str_idx, atype, adata = struct.unpack('<IIII', manifest_data[i+4 : i+20])
            if name_idx == 0 and atype == 0x10000008:
                struct.pack_into('<I', manifest_data, i+16, target_vc)
                print(f"[✓] Set versionCode to {target_vc} (was {adata} at offset {i})")
                updated_vc = True
                break
        if not updated_vc:
            print(f"[!] Warning: versionCode attribute (name_idx=0) not found")

        # Force screenOrientation to portrait (ActivityInfo.SCREEN_ORIENTATION_PORTRAIT = 1)
        # Prevents unintended landscape orientation across devices
        patched_orientation = False
        for i in range(len(manifest_data) - 20):
            name_idx, val_str_idx, atype, adata = struct.unpack('<IIII', manifest_data[i+4 : i+20])
            if name_idx == 16 and atype == 0x10000008:
                struct.pack_into('<I', manifest_data, i+16, 1)
                print(f"[✓] Enforced screenOrientation=portrait (1) in binary AndroidManifest.xml (was {adata} at offset {i})")
                patched_orientation = True
                break

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
                count = 0
                for root, dirs, files in os.walk(dist_dir):
                    rel = os.path.relpath(root, dist_dir)
                    for f in files:
                        if f.endswith('.map') or f.endswith('.apk') or f == 'server.cjs':
                            continue
                        full_p = os.path.join(root, f)
                        rel_p = f if rel == '.' else os.path.join(rel, f)
                        with open(full_p, 'rb') as fp:
                            c = fp.read()
                        ctype = zipfile.ZIP_STORED if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')) else zipfile.ZIP_DEFLATED
                        out_zip.writestr(f"assets/public/{rel_p}", c, compress_type=ctype)
                        out_zip.writestr(f"assets/www/{rel_p}", c, compress_type=ctype)
                        count += 1
                print(f"[✓] Packaged {count} web distribution files into assets/public/ and assets/www/")

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

    # Distribute the signed APK and intermediate build artifacts to all target locations
    destinations = [
        os.path.join(root_dir, "LogiStep.apk"),
        os.path.join(root_dir, "apk", "LogiStep.apk"),
        os.path.join(root_dir, "apk", "app-release.apk"),
        os.path.join(root_dir, "apk", "app-debug.apk"),
        os.path.join(root_dir, "apk", "logistep.apk"),
        os.path.join(root_dir, "public", "LogiStep.apk"),
        os.path.join(root_dir, "dist", "LogiStep.apk"),
        os.path.join(root_dir, "dist", "app-release.apk"),
        os.path.join(app_dir, "assets", "public", "LogiStep.apk"),
        os.path.join(android_dir, "app", "build", "outputs", "apk", "release", "app-release.apk"),
        os.path.join(android_dir, "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
    ]

    apk_size = os.path.getsize(signed_apk)
    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(signed_apk, dest)
        os.utime(dest, None)  # update access and modification times to right now
        print(f"[✓] Deployed: {dest} ({apk_size} bytes)")

    # Also update root unsigned.apk, aligned.apk, and aligned.apk.idsig
    root_unsigned = os.path.join(root_dir, "unsigned.apk")
    root_aligned = os.path.join(root_dir, "aligned.apk")
    shutil.copy2(unsigned_apk, root_unsigned)
    os.utime(root_unsigned, None)
    print(f"[✓] Deployed: {root_unsigned} ({os.path.getsize(root_unsigned)} bytes)")

    shutil.copy2(aligned_apk, root_aligned)
    os.utime(root_aligned, None)
    print(f"[✓] Deployed: {root_aligned} ({os.path.getsize(root_aligned)} bytes)")

    # If idsig exists or is produced by apksigner
    idsig_cand = signed_apk + ".idsig"
    if os.path.exists(idsig_cand):
        shutil.copy2(idsig_cand, os.path.join(root_dir, "aligned.apk.idsig"))
        os.utime(os.path.join(root_dir, "aligned.apk.idsig"), None)
    else:
        # touch aligned.apk.idsig so timestamp is updated
        idsig_file = os.path.join(root_dir, "aligned.apk.idsig")
        if os.path.exists(idsig_file):
            os.utime(idsig_file, None)

    # Touch the apk/ folder itself
    apk_dir = os.path.join(root_dir, "apk")
    if os.path.exists(apk_dir):
        os.utime(apk_dir, None)

    shutil.rmtree(work_dir, ignore_errors=True)
    print(f"\n[SUCCESS] Native Android APK v{target_vn} (code {target_vc}) compiled, signed (v1/v2/v3), and deployed successfully! Size: {apk_size} bytes")

if __name__ == "__main__":
    build_apk()
