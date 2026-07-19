#!/usr/bin/env python3
"""Configure nginx API proxy for SIP backend"""
import paramiko
import time

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY = "/home/z/.ssh/sip_deploy"

def run(client, cmd, timeout=30):
    print(f"  → {cmd[:100]}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return exit_code, out[:1000], err[:300]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, key_filename=KEY, timeout=30)
print("✓ SSH connected")

# Find the actual nginx config serving sec-scanner.pro
print("\n[1] Finding sec-scanner.pro nginx config...")
code, out, err = run(client, "grep -rl 'sec-scanner.pro' /etc/nginx/sites-enabled/ 2>/dev/null")
print(f"  Files: {out.strip()}")

# Show the config
for f in out.strip().split('\n'):
    if f.strip():
        code, content, err = run(client, f"cat '{f.strip()}'")
        print(f"\n  === {f.strip()} ===")
        print(f"  {content[:2000]}")

# Check what serves /var/www/sec-scanner.pro
print("\n[2] Checking root directive...")
code, out, err = run(client, "grep -r 'sec-scanner.pro' /etc/nginx/sites-enabled/ | head -5")
print(f"  {out.strip()}")

client.close()
