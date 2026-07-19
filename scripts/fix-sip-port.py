#!/usr/bin/env python3
"""Fix SIP server port conflict and configure nginx proxy"""
import paramiko
import time

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY = "/home/z/.ssh/sip_deploy"

def run(client, cmd, timeout=30):
    print(f"  → {cmd[:80]}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return exit_code, out[:500], err[:200]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, key_filename=KEY, timeout=30)
print("✓ SSH connected")

# 1. Fix port
print("\n[1] Fixing port in systemd service...")
run(client, "sed -i 's/SIP_PORT=3001/SIP_PORT=3005/' /etc/systemd/system/sip-server.service")

# 2. Reload and restart
print("\n[2] Restarting service...")
run(client, "systemctl daemon-reload")
run(client, "systemctl restart sip-server")
time.sleep(3)

# 3. Check status
code, out, err = run(client, "systemctl is-active sip-server")
print(f"  Status: {out.strip()}")

# 4. Test health
print("\n[3] Testing health endpoint...")
code, out, err = run(client, "curl -s http://localhost:3005/api/health 2>&1")
print(f"  Health: {out[:300]}")

# 5. Find nginx config for sec-scanner.pro
print("\n[4] Finding nginx config...")
code, out, err = run(client, "find /etc/nginx -name '*sec-scanner*' 2>/dev/null")
print(f"  Config files: {out.strip()}")

# Check if API proxy already exists
code, out, err = run(client, "grep -l 'api' /etc/nginx/sites-enabled/* 2>/dev/null || echo none")
print(f"  Files with 'api': {out.strip()}")

# List all nginx configs
code, out, err = run(client, "ls -la /etc/nginx/sites-enabled/ 2>/dev/null")
print(f"  Sites enabled: {out.strip()}")

# Show current sec-scanner config
code, out, err = run(client, "cat /etc/nginx/sites-enabled/sec-scanner.pro 2>/dev/null || echo NOT_FOUND")
print(f"  Current config:\n{out}")

client.close()
