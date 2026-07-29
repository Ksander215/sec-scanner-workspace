#!/usr/bin/env python3
"""Find nginx config on server"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, pkey=key)

# Find nginx configs
cmds = [
    "grep -r 'sec-scanner' /etc/nginx/ 2>/dev/null | head -5",
    "nginx -T 2>/dev/null | head -80",
    "curl -s -o /dev/null -w '%{http_code}' http://localhost/app/debug/features.html",
    "curl -s -o /dev/null -w '%{http_code}' http://localhost/app/debug/features/",
]

for cmd in cmds:
    print(f"\n> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    print(stdout.read().decode()[:500])
    err = stderr.read().decode()
    if err:
        print(f"ERR: {err[:200]}")

client.close()
