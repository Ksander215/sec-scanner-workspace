#!/usr/bin/env python3
"""Check HTTPS access to debug features page"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, pkey=key)

# Check the nginx config for sec-scanner.pro
cmds = [
    "grep -r 'sec-scanner.pro' /etc/nginx/sites-enabled/ 2>/dev/null | head -5",
    "ls /etc/nginx/sites-enabled/ 2>/dev/null",
    "cat /etc/nginx/sites-enabled/lead.sec-scanner.pro* 2>/dev/null | head -60",
    "curl -sL -o /dev/null -w '%{http_code} %{url_effective}' https://sec-scanner.pro/app/debug/features.html 2>/dev/null",
    "curl -sL -o /dev/null -w '%{http_code} %{url_effective}' https://sec-scanner.pro/app/platform-status/ 2>/dev/null",
]

for cmd in cmds:
    print(f"\n> {cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    print(stdout.read().decode()[:500])

client.close()
