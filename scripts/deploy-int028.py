#!/usr/bin/env python3
"""
SIP INT-028 Deploy Script
Deploys both frontend and backend to production server.
"""

import paramiko
import sys
import time

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/sip_deploy"

def ssh_connect():
    """Connect to server via SSH"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, key_filename=KEY_PATH, timeout=30)
    return client

def run_cmd(client, cmd, timeout=120):
    """Run command on server"""
    print(f"  → {cmd[:80]}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if exit_code != 0 and err:
        print(f"  ⚠ stderr: {err[:200]}")
    return exit_code, out, err

def main():
    print("=" * 60)
    print("SIP INT-028 — Deploy to Production")
    print("=" * 60)

    client = ssh_connect()
    print("✓ SSH connected")

    # Step 1: Pull latest code
    print("\n[1/7] Pulling latest code...")
    run_cmd(client, "cd /root/sec-scanner-workspace && git fetch origin && git reset --hard origin/main", 60)

    # Step 2: Install backend dependencies
    print("\n[2/7] Installing backend dependencies...")
    run_cmd(client, "cd /root/sec-scanner-workspace/sec-scanner-landing/sip-server && npm install", 120)

    # Step 3: Build backend
    print("\n[3/7] Building backend server...")
    code, out, err = run_cmd(client, "cd /root/sec-scanner-workspace/sec-scanner-landing/sip-server && ./node_modules/typescript/bin/tsc --project tsconfig.json", 60)
    if code != 0:
        print(f"  ✗ Build failed: {err}")
        sys.exit(1)
    print("  ✓ Backend built")

    # Step 4: Build frontend
    print("\n[4/7] Building frontend...")
    code, out, err = run_cmd(client, "cd /root/sec-scanner-workspace/sec-scanner-landing && npm run build", 180)
    if code != 0:
        print(f"  ✗ Build failed: {err[:500]}")
        sys.exit(1)
    print("  ✓ Frontend built")

    # Step 5: Deploy frontend (static files)
    print("\n[5/7] Deploying frontend static files...")
    run_cmd(client, "rm -rf /var/www/sec-scanner.pro/*")
    run_cmd(client, "cp -r /root/sec-scanner-workspace/sec-scanner-landing/out/* /var/www/sec-scanner.pro/")
    run_cmd(client, "chown -R www-data:www-data /var/www/sec-scanner.pro/")
    print("  ✓ Frontend deployed")

    # Step 6: Create data directory
    print("\n[6/7] Setting up backend data directory...")
    run_cmd(client, "mkdir -p /var/lib/sip")

    # Step 7: Setup systemd service for backend
    print("\n[7/7] Setting up backend service...")

    # Copy service file
    run_cmd(client, """cat > /etc/systemd/system/sip-server.service << 'SERVICEEOF'
[Unit]
Description=SIP Core Engine — Backend API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/sec-scanner-workspace/sec-scanner-landing/sip-server
ExecStart=/usr/bin/node /root/sec-scanner-workspace/sec-scanner-landing/sip-server/dist/index.js
Restart=on-failure
RestartSec=5
Environment=SIP_PORT=3001
Environment=SIP_CORS_ORIGIN=https://sec-scanner.pro
Environment=SIP_DATA_DIR=/var/lib/sip
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF""")

    run_cmd(client, "systemctl daemon-reload")
    run_cmd(client, "systemctl enable sip-server")
    code, out, err = run_cmd(client, "systemctl restart sip-server")
    time.sleep(2)

    # Check if service is running
    code, out, err = run_cmd(client, "systemctl is-active sip-server")
    if "active" in out:
        print("  ✓ Backend service running")
    else:
        print(f"  ⚠ Backend service status: {out.strip()}")
        # Check logs
        run_cmd(client, "journalctl -u sip-server --no-pager -n 20")

    # Step 8: Update nginx config
    print("\n[Bonus] Updating nginx configuration...")

    # Check if nginx config already has API proxy
    code, out, err = run_cmd(client, "grep -c '/api/' /etc/nginx/sites-enabled/sec-scanner.pro 2>/dev/null || echo 0")
    if "0" in out:
        print("  Adding API proxy to nginx...")
        run_cmd(client, r"""sed -i '/location \/ {/i\
    # API proxy → Backend server\
    location /api/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_read_timeout 300s;\
        proxy_send_timeout 300s;\
        proxy_buffering off;\
        proxy_cache off;\
        chunked_transfer_encoding on;\
    }\
' /etc/nginx/sites-enabled/sec-scanner.pro""")

    code, out, err = run_cmd(client, "nginx -t 2>&1")
    if "ok" in out or "successful" in out:
        run_cmd(client, "systemctl reload nginx")
        print("  ✓ Nginx reloaded with API proxy")
    else:
        print(f"  ⚠ Nginx config test: {out}")

    # Step 9: Verify
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)

    # Check backend health
    code, out, err = run_cmd(client, "curl -s http://localhost:3001/api/health | head -200")
    if code == 0 and out:
        print(f"  Backend health: {out[:200]}")
    else:
        print(f"  ⚠ Backend not responding: {err[:200]}")

    # Check nginx
    code, out, err = run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/")
    print(f"  Frontend HTTPS: {out}")

    code, out, err = run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/api/health")
    print(f"  API proxy: {out}")

    print("\n✅ Deploy complete!")

    client.close()

if __name__ == "__main__":
    main()
