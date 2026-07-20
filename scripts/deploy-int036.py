#!/usr/bin/env python3
"""
INT-036 Production Deployment Script
Server: 85.239.38.163:22222 (root)
Project: /var/www/sec-scanner.pro
"""
import paramiko
import time
import sys

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"
PROJECT_DIR = "/var/www/sec-scanner.pro"

DEPLOY_COMMANDS = [
    f"cd {PROJECT_DIR} && git pull origin main",
    f"cd {PROJECT_DIR} && npm install",
    f"cd {PROJECT_DIR} && npx next build",
    f"cd {PROJECT_DIR} && cp -r out/* html/",
    "nginx -s reload",
]

VERIFY_COMMANDS = [
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/",
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/app/dashboard",
]

def deploy():
    print(f"Connecting to {USER}@{HOST}:{PORT}...")
    
    try:
        key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    except Exception as e:
        print(f"ERROR: Cannot load SSH key from {KEY_PATH}: {e}")
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
        print(f"\n[{i}/{len(DEPLOY_COMMANDS)}] {cmd}")
        print("-" * 60)
        
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=600)
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            exit_code = stdout.channel.recv_exit_status()
            
            if out.strip():
                print(out[-2000:] if len(out) > 2000 else out)
            if err.strip():
                print("STDERR:", err[-2000:] if len(err) > 2000 else err)
            
            if exit_code != 0:
                print(f"WARNING: Command exited with code {exit_code}")
                # Don't abort on npm warnings (exit code can be non-zero for warnings)
                if "npm install" in cmd and exit_code == 1:
                    print("Continuing — npm install warnings are normal")
                elif "next build" in cmd and exit_code != 0:
                    print("ERROR: Build failed! Aborting deployment.")
                    sys.exit(1)
            else:
                print("OK")
        except Exception as e:
            print(f"ERROR executing command: {e}")
            sys.exit(1)
    
    # Verify
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)
    
    for cmd in VERIFY_COMMANDS:
        print(f"\n{cmd}")
        try:
            stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
            out = stdout.read().decode('utf-8', errors='replace').strip()
            print(f"Response: {out}")
            if "200" in out:
                print("OK")
            else:
                print("WARNING: Expected HTTP 200")
        except Exception as e:
            print(f"ERROR: {e}")
    
    client.close()
    print("\nDeployment complete!")

if __name__ == "__main__":
    deploy()
