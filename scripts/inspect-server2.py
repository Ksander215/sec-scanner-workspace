#!/usr/bin/env python3
"""
Deeper server inspection — nginx config, backup structure, disk space
"""
import paramiko
import sys

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

INSPECT_COMMANDS = [
    # Full nginx config for sec-scanner.pro
    "cat /etc/nginx/sites-enabled/sec-scanner.pro 2>/dev/null || ls /etc/nginx/sites-enabled/",
    # Check if there's source code in backup
    "ls /var/www/sec-scanner.pro.bak.20260716_225944/ | head -30",
    "ls /var/www/sec-scanner.pro.bak.20260716_225944/landing/ 2>/dev/null | head -20",
    # Disk space
    "df -h /var/www",
    # Check node/npm versions
    "node --version && npm --version",
    # Check for any git repos
    "find /var/www -name '.git' -type d -maxdepth 4 2>/dev/null",
    # Check the .next directory
    "ls -la /var/www/sec-scanner.pro/.next/ 2>/dev/null",
    # Check if next is installed globally
    "which next 2>/dev/null || npm list -g next 2>/dev/null || echo 'next not global'",
    # Current nginx sites
    "ls /etc/nginx/sites-enabled/",
]

def inspect():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USER, pkey=key, timeout=30)
    print("Connected!")
    
    for cmd in INSPECT_COMMANDS:
        print(f"\n>>> {cmd}")
        print("-" * 60)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out)
        if err.strip():
            print("STDERR:", err)
    
    client.close()

if __name__ == "__main__":
    inspect()
