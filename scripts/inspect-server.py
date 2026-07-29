#!/usr/bin/env python3
"""
Quick SSH inspection script to understand server structure
"""
import paramiko
import sys

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

INSPECT_COMMANDS = [
    "ls -la /var/www/sec-scanner.pro/",
    "ls -la /var/www/sec-scanner.pro/landing/ 2>/dev/null || echo 'No landing dir'",
    "cat /var/www/sec-scanner.pro/package.json 2>/dev/null | head -20 || echo 'No package.json'",
    "find /var/www/sec-scanner.pro -name 'next.config*' -maxdepth 3 2>/dev/null",
    "find /var/www/sec-scanner.pro -name '.git' -type d -maxdepth 3 2>/dev/null",
    "ls -la /var/www/sec-scanner.pro/html/ 2>/dev/null || echo 'No html dir'",
    "nginx -T 2>/dev/null | grep -A5 'sec-scanner' | head -20",
    "ls -la /var/www/ | head -20",
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
