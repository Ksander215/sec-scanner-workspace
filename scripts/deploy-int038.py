#!/usr/bin/env python3
"""
INT-038 Production Deployment Script
Server: 85.239.38.163:22222 (root)
Strategy: Clone repo on server, build, copy static output
"""
import paramiko
import time
import sys

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"
WEB_ROOT = "/var/www/sec-scanner.pro"
BUILD_DIR = "/var/www/sec-scanner-build"
GITHUB_TOKEN = "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"
REPO_URL = f"https://{GITHUB_TOKEN}@github.com/Ksander215/sec-scanner-workspace.git"

DEPLOY_COMMANDS = [
    # Clean previous build dir
    f"rm -rf {BUILD_DIR}",
    # Clone fresh
    f"git clone {REPO_URL} {BUILD_DIR} 2>&1",
    # Install dependencies
    f"cd {BUILD_DIR}/landing && npm install 2>&1 | tail -5",
    # Build
    f"cd {BUILD_DIR}/landing && npx next build 2>&1 | tail -20",
    # Copy to web root
    f"rm -rf {WEB_ROOT}/*",
    f"cp -r {BUILD_DIR}/landing/out/* {WEB_ROOT}/",
    # Set permissions
    f"chown -R www-data:www-data {WEB_ROOT}",
    # Reload nginx
    "nginx -s reload",
    # Verify
    f"ls -la {WEB_ROOT}/ | head -10",
]

def main():
    print("🔑 Connecting to server...")
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, pkey=key)
    
    for i, cmd in enumerate(DEPLOY_COMMANDS, 1):
        print(f"\n[{i}/{len(DEPLOY_COMMANDS)}] {cmd[:80]}...")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        out = stdout.read().decode()
        err = stderr.read().decode()
        exit_code = stdout.channel.recv_exit_status()
        
        if out.strip():
            print(f"  OUT: {out[:200]}")
        if err.strip() and exit_code != 0:
            print(f"  ERR: {err[:200]}")
        
        if exit_code != 0 and "git clone" not in cmd and "npm install" not in cmd:
            print(f"  ⚠️ Exit code: {exit_code}")
    
    # Quick HTTP check
    print("\n🔍 HTTP verification...")
    stdin, stdout, stderr = client.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost/", timeout=10)
    code = stdout.read().decode().strip()
    print(f"  Homepage: HTTP {code}")
    
    stdin, stdout, stderr = client.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost/app/dashboard/", timeout=10)
    code = stdout.read().decode().strip()
    print(f"  Dashboard: HTTP {code}")
    
    stdin, stdout, stderr = client.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost/app/platform-status/", timeout=10)
    code = stdout.read().decode().strip()
    print(f"  Platform Status: HTTP {code}")
    
    client.close()
    print("\n✅ Deployment complete!")

if __name__ == "__main__":
    main()
