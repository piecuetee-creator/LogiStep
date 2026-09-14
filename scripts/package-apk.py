#!/usr/bin/env python3
import os
import shutil
import zipfile
import tempfile

def package_apk():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dist_dir = os.path.join(root_dir, "dist")
    base_apk = os.path.join(root_dir, "LogiStep.apk")
    
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

    # 2. Re-pack LogiStep.apk with latest assets
    temp_apk = tempfile.mktemp(suffix=".apk")
    
    with zipfile.ZipFile(base_apk, "r") as zin:
        with zipfile.ZipFile(temp_apk, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            # Copy all files from original APK that are NOT in assets/
            for item in zin.infolist():
                if not item.filename.startswith("assets/"):
                    zout.writestr(item, zin.read(item.filename))
            
            # Now add all files from dist into assets/public/ and assets/www/
            for root, dirs, files in os.walk(dist_dir):
                for f in files:
                    if f.endswith(".apk") or f.endswith(".map") or f == "server.cjs":
                        continue
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, dist_dir).replace("\\", "/")
                    
                    with open(full_path, "rb") as bf:
                        content = bf.read()
                    
                    # Store in assets/public/ and assets/www/
                    zout.writestr(f"assets/public/{rel_path}", content)
                    zout.writestr(f"assets/www/{rel_path}", content)

    # 3. Distribute the fresh APK to all expected locations
    target_locations = [
        os.path.join(root_dir, "LogiStep.apk"),
        os.path.join(root_dir, "public", "LogiStep.apk"),
        os.path.join(root_dir, "apk", "LogiStep.apk"),
        os.path.join(root_dir, "dist", "LogiStep.apk"),
        os.path.join(android_assets, "LogiStep.apk")
    ]

    for loc in target_locations:
        os.makedirs(os.path.dirname(loc), exist_ok=True)
        shutil.copy2(temp_apk, loc)
        apk_size = os.path.getsize(loc)
        print(f"[✓] Created APK at {loc} ({apk_size} bytes)")

    if os.path.exists(temp_apk):
        os.remove(temp_apk)

if __name__ == "__main__":
    package_apk()
