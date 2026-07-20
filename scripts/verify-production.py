#!/usr/bin/env python3
"""
Verify what's actually deployed on production server
"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

COMMANDS = [
    # Check if AIS files exist in the deployed site
    "grep -l 'AISAssistant\\|AIS\\|Adaptive Intelligence\\|SoloNotification' /var/www/sec-scanner.pro/_next/static/chunks/*.js 2>/dev/null | head -5 || echo 'NO AIS FOUND IN JS'",
    # Check the dashboard page for AIS content
    "grep -o 'AIS\\|Adaptive Intelligence\\|SoloNotification\\|PersonalGoal\\|useAIS' /var/www/sec-scanner.pro/app/dashboard.html 2>/dev/null | sort | uniq -c || echo 'No dashboard.html'",
    "ls /var/www/sec-scanner.pro/app/dashboard/ 2>/dev/null || echo 'No dashboard dir'",
    "ls /var/www/sec-scanner.pro/app/ | head -20",
    # Check what commit was built
    "cd /var/www/sec-scanner-build && git log --oneline -3",
    # Check the build output on server vs what's in web root
    "diff <(ls /var/www/sec-scanner-build/landing/out/_next/static/chunks/ 2>/dev/null | sort) <(ls /var/www/sec-scanner.pro/_next/static/chunks/ 2>/dev/null | sort) | head -20",
    # Check file sizes in _next
    "du -sh /var/www/sec-scanner.pro/_next/ 2>/dev/null",
    "du -sh /var/www/sec-scanner-build/landing/out/_next/ 2>/dev/null",
    # Check .next dir (shouldn't be there in clean deploy)
    "ls -la /var/www/sec-scanner.pro/.next/ 2>/dev/null | head -5 || echo 'No .next dir'",
    # Check the index.html for any AIS references
    "grep -o 'AIS\\|Adaptive' /var/www/sec-scanner.pro/index.html 2>/dev/null | sort | uniq -c || echo 'No AIS in index'",
]

def inspect():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USER, pkey=key, timeout=30)
    print("Connected!\n")
    
    for cmd in COMMANDS:
        print(f">>> {cmd[:100]}")
        print("-" * 60)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out)
        if err.strip():
            print("STDERR:", err)
        print()
    
    client.close()

if __name__ == "__main__":
    inspect()
