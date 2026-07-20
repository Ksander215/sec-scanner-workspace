#!/usr/bin/env python3
"""
Check nginx config for sec-scanner site
"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

COMMANDS = [
    "cat /etc/nginx/sites-enabled/sec-scanner",
    "cat /etc/nginx/sites-enabled/sec-scanner 2>/dev/null | grep root",
    "cat /etc/nginx/sites-enabled/sec-scanner 2>/dev/null | grep server_name",
]

def inspect():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USER, pkey=key, timeout=30)
    
    for cmd in COMMANDS:
        print(f"\n>>> {cmd}")
        print("-" * 60)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        out = stdout.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out)
    
    client.close()

if __name__ == "__main__":
    inspect()
