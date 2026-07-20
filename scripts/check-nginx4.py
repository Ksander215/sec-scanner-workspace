#!/usr/bin/env python3
"""Check the sec-scanner nginx config and test debug page"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, pkey=key)

cmds = [
    "cat /etc/nginx/sites-enabled/sec-scanner 2>/dev/null | head -80",
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/app/debug/features.html",
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/app/debug/features/",
    "curl -s https://sec-scanner.pro/app/debug/features/ -o /dev/null -w '%{http_code} %{redirect_url}' -L --max-redirs 0 2>/dev/null",
]

for cmd in cmds:
    print(f"\n> {cmd[:100]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    print(stdout.read().decode()[:1000])

client.close()
