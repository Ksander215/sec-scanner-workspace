#!/usr/bin/env python3
"""Fix nginx - remove backup file and reload"""
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

# Remove backup file from sites-enabled (it has duplicate directives)
run(client, "rm -f /etc/nginx/sites-enabled/sec-scanner.bak.*")

# Test
code, out, err = run(client, "nginx -t 2>&1")
print(f"nginx -t: {out.strip()} {err.strip()}")

if "ok" in out or "successful" in err:
    run(client, "systemctl reload nginx")
    time.sleep(2)

    # Test
    code, out, err = run(client, "curl -s https://sec-scanner.pro/api/health 2>&1")
    print(f"API health: {out[:300]}")

    code, out, err = run(client, "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/api/health 2>&1")
    print(f"API status: {out}")
else:
    print("Config still broken!")
    code, out, err = run(client, "grep -n 'proxy_pass.*3005' /etc/nginx/sites-enabled/sec-scanner")
    print(f"3005 proxy lines: {out}")

    code, out, err = run(client, "grep -n 'proxy_pass.*3001' /etc/nginx/sites-enabled/sec-scanner")
    print(f"3001 proxy lines: {out}")

client.close()
