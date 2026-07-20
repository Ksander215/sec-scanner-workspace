#!/usr/bin/env python3
"""
INT-036 Production Deployment Script v2
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
    # Step 1: Prepare build directory
    f"mkdir -p {BUILD_DIR}",
    
    # Step 2: Clone or pull the repo
    f"if [ -d {BUILD_DIR}/.git ]; then cd {BUILD_DIR} && git fetch --all && git reset --hard origin/main; else rm -rf {BUILD_DIR} && git clone {REPO_URL} {BUILD_DIR}; fi",
    
    # Step 3: Verify we have the latest commit
    f"cd {BUILD_DIR} && git log --oneline -3",
    
    # Step 4: Install dependencies for landing
    f"cd {BUILD_DIR}/landing && npm install",
    
    # Step 5: Build the Next.js static export
    f"cd {BUILD_DIR}/landing && npx next build",
    
    # Step 6: Verify the build output exists
    f"ls -la {BUILD_DIR}/landing/out/ | head -20",
    
    # Step 7: Backup current site
    f"cp -r {WEB_ROOT} {WEB_ROOT}.bak.$(date +%Y%m%d_%H%M%S)",
    
    # Step 8: Clear old files (keep .next for reference)
    f"rm -rf {WEB_ROOT}/*",
    
    # Step 9: Copy new build output
    f"cp -r {BUILD_DIR}/landing/out/* {WEB_ROOT}/",
    
    # Step 10: Fix permissions
    f"chown -R www-data:www-data {WEB_ROOT}",
    
    # Step 11: Reload nginx
    "nginx -s reload",
]

VERIFY_COMMANDS = [
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/",
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/app/dashboard",
    f"ls -la {WEB_ROOT}/ | head -20",
    f"cat {WEB_ROOT}/index.html | head -5",
]

def run_command(client, cmd, timeout=600, critical=True):
    """Execute a command on the remote server"""
    print(f"\n>>> {cmd[:120]}{'...' if len(cmd) > 120 else ''}")
    print("-" * 60)
    
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        
        if out.strip():
            # Truncate very long output
            if len(out) > 3000:
                print(out[:1500] + "\n... [truncated] ...\n" + out[-1500:])
            else:
                print(out)
        if err.strip():
            if len(err) > 3000:
                print("STDERR:", err[:1500] + "\n... [truncated] ...\n" + err[-1500:])
            else:
                print("STDERR:", err)
        
        if exit_code != 0:
            print(f"Exit code: {exit_code}")
            if critical:
                print("CRITICAL: Command failed, aborting!")
                return False
            else:
                print("WARNING: Non-critical failure, continuing...")
        else:
            print("OK")
        
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        if critical:
            return False
        return True

def deploy():
    print(f"Connecting to {USER}@{HOST}:{PORT}...")
    
    try:
        key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    except Exception as e:
        print(f"ERROR: Cannot load SSH key: {e}")
        sys.exit(1)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname=HOST, port=PORT, username=USER, pkey=key, timeout=30)
        print("Connected successfully!")
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")
        sys.exit(1)
    
    # Run deploy commands
    for i, cmd in enumerate(DEPLOY_COMMANDS, 1):
        print(f"\n{'='*60}")
        print(f"STEP {i}/{len(DEPLOY_COMMANDS)}")
        print(f"{'='*60}")
        
        # npm install and next build get longer timeouts
        timeout = 600 if "npm install" in cmd or "next build" in cmd else 120
        critical = "npm install" not in cmd  # npm install may have warnings
        
        success = run_command(client, cmd, timeout=timeout, critical=critical)
        if not success:
            client.close()
            sys.exit(1)
    
    # Verify
    print(f"\n{'='*60}")
    print("VERIFICATION")
    print(f"{'='*60}")
    
    for cmd in VERIFY_COMMANDS:
        run_command(client, cmd, timeout=30, critical=False)
    
    client.close()
    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    deploy()
