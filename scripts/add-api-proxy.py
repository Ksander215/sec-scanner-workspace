#!/usr/bin/env python3
"""Add API proxy to sec-scanner nginx config"""
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

# First, show the current sec-scanner config to find where to add API proxy
code, out, err = run(client, "cat /etc/nginx/sites-enabled/sec-scanner")
print("Current config:")
print(out)

# Check if /api/ proxy already exists
if "/api/" in out:
    print("\n⚠ API proxy already exists in config!")
else:
    # Add API proxy location block before the existing location /
    # We need to add it inside the server block for sec-scanner.pro on port 443
    nginx_snippet = '''
    # SIP API proxy → Backend server (port 3005)
    location /api/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }

'''

    # Insert before the first "location /" in the HTTPS server block
    cmd = f"""sed -i '/location \\/ \\{{/i\\{nginx_snippet}' /etc/nginx/sites-enabled/sec-scanner"""
    code, out, err = run(client, cmd)
    print(f"\nInsert result: code={code}")

# Test nginx config
print("\n[Testing nginx config...]")
code, out, err = run(client, "nginx -t 2>&1")
print(f"  nginx -t: {out.strip()} {err.strip()}")

if "ok" in out or "successful" in out:
    print("\n[Reloading nginx...]")
    code, out, err = run(client, "systemctl reload nginx")
    print(f"  Reload: code={code}")

    # Test API proxy
    time.sleep(2)
    print("\n[Testing API through nginx...]")
    code, out, err = run(client, "curl -s https://sec-scanner.pro/api/health 2>&1")
    print(f"  API health: {out[:300]}")

    code, out, err = run(client, "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/ 2>&1")
    print(f"  Frontend: {out}")

    code, out, err = run(client, "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/api/health 2>&1")
    print(f"  API: {out}")
else:
    print("\n⚠ Nginx config test FAILED. Not reloading.")
    # Show the config for debugging
    code, out, err = run(client, "cat /etc/nginx/sites-enabled/sec-scanner | head -80")
    print(out)

client.close()
