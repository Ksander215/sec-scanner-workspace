#!/usr/bin/env python3
"""Fix nginx API proxy port from 3001 to 3005"""
import paramiko
import time

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY = "/home/z/.ssh/sip_deploy"

def run(client, cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return exit_code, out, err

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, key_filename=KEY, timeout=30)
print("✓ SSH connected")

# 1. Change the API proxy port from 3001 to 3005
# The config has: proxy_pass http://127.0.0.1:3001;
# Need to change to: proxy_pass http://127.0.0.1:3005;
# But only in the /api/ location block, not in other blocks

# First backup
print("[1] Backing up nginx config...")
code, out, err = run(client, "cp /etc/nginx/sites-enabled/sec-scanner /etc/nginx/sites-enabled/sec-scanner.bak.$(date +%Y%m%d)")

# Change the proxy_pass port for /api/ location
# The issue is that 3001 is used by Next.js store, and 3005 is SIP backend
# We need to change proxy_pass http://127.0.0.1:3001 → http://127.0.0.1:3005
# BUT ONLY inside the /api/ location block

# Use sed to replace specifically the proxy_pass in /api/ location
print("\n[2] Changing API proxy port from 3001 to 3005...")
cmd = """sed -i '/location \\/api\\//,/}/ s|proxy_pass http://127.0.0.1:3001|proxy_pass http://127.0.0.1:3005|' /etc/nginx/sites-enabled/sec-scanner"""
code, out, err = run(client, cmd)
print(f"  sed result: code={code}")

# Also add SSE support headers (no buffering for streaming)
print("\n[3] Adding SSE support to API location...")
cmd = """sed -i '/location \\/api\\//,/}/ s|proxy_set_header X-Forwarded-Proto|proxy_set_header X-Forwarded-Proto|' /etc/nginx/sites-enabled/sec-scanner"""

# Add proxy_buffering off and timeout config after proxy_pass line in /api/ block
cmd2 = """sed -i '/location \\/api\\// { n; /proxy_pass/a\\        proxy_read_timeout 300s;\\n        proxy_send_timeout 300s;\\n        proxy_buffering off;\\n        proxy_cache off;\\n        chunked_transfer_encoding on;
}' /etc/nginx/sites-enabled/sec-scanner"""
code, out, err = run(client, cmd2)
print(f"  SSE support added: code={code}")

# Test nginx
print("\n[4] Testing nginx config...")
code, out, err = run(client, "nginx -t 2>&1")
print(f"  Result: {out.strip()} {err.strip()}")

if "ok" in out or "successful" in err:
    print("\n[5] Reloading nginx...")
    run(client, "systemctl reload nginx")
    time.sleep(2)

    # Test
    print("\n[6] Testing API through nginx...")
    code, out, err = run(client, "curl -s https://sec-scanner.pro/api/health 2>&1")
    print(f"  API health: {out[:300]}")

    code, out, err = run(client, "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/api/health 2>&1")
    print(f"  API status code: {out}")
else:
    print("\n⚠ Config test failed. Not reloading.")
    code, out, err = run(client, "cat /etc/nginx/sites-enabled/sec-scanner | head -60")
    print(out)

client.close()
