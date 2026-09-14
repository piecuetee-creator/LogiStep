#!/usr/bin/env python3
import subprocess
import sys
import os

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    compile_script = os.path.join(script_dir, "compile-apk.py")
    res = subprocess.run([sys.executable, compile_script])
    sys.exit(res.returncode)
