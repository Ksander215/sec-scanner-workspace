#!/usr/bin/env python3
"""INT-034: Deploy via paramiko with auto key detection"""
import paramiko
import os

HOST = "85.239.38.163"
PORT = 22222
USER = "root"

# Try different key locations
key_paths = [
    os.path.expanduser("~/.ssh/id_ed25519"),
    os.path.expanduser("~/.ssh/id_rsa"),
    "/root/.ssh/id_ed25519",
    "/root/.ssh/id_rsa",
]

key_path = None
for p in key_paths:
    if os.path.exists(p):
        key_path = p
        break

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

if key_path:
    print(f"Using key: {key_path}")
    ssh.connect(HOST, port=PORT, username=USER, key_filename=key_path)
else:
    print("No SSH key found, trying ssh-agent or default keys...")
    # Try using the SSH agent or system defaults
    ssh.connect(HOST, port=PORT, username=USER, allow_agent=True, look_for_keys=True)

def run(cmd):
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip(): print(out.strip())
    if err.strip(): print(f"STDERR: {err.strip()}")
    return out, err

print("=== Deploying INT-034 to production ===")

# Pull latest code
run("cd /var/www/sec-scanner.pro && git pull origin main")

# Install deps
run("cd /var/www/sec-scanner.pro && npm install")

# Build
run("cd /var/www/sec-scanner.pro && npx next build")

# Copy output
run("cp -r /var/www/sec-scanner.pro/out/* /var/www/sec-scanner.pro/html/")

# Reload nginx
run("nginx -s reload")

# Verify
print("\n=== Verification ===")
code, _ = run("curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/app/marketplace")
title, _ = run("curl -s https://sec-scanner.pro/app/marketplace | grep -o 'Центр решений' | head -1")

ssh.close()
print(f"\n✅ HTTP Status: {code.strip()}")
print(f"✅ Title found: {title.strip()}")
