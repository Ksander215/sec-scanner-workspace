#!/usr/bin/env python3
"""Check nginx config on server"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, pkey=key)

# Check nginx config
stdin, stdout, stderr = client.exec_command("cat /etc/nginx/sites-enabled/sec-scanner.pro 2>/dev/null || cat /etc/nginx/conf.d/sec-scanner.pro.conf 2>/dev/null || echo 'CONFIG NOT FOUND'", timeout=10)
print(stdout.read().decode())

# Also check if debug features file exists on server
stdin, stdout, stderr = client.exec_command("ls -la /var/www/sec-scanner.pro/app/debug/features.html 2>/dev/null && head -1 /var/www/sec-scanner.pro/app/debug/features.html | cut -c1-80", timeout=10)
print("Debug features file:")
print(stdout.read().decode())

# Check what's in the debug directory
stdin, stdout, stderr = client.exec_command("ls /var/www/sec-scanner.pro/app/debug/ 2>/dev/null", timeout=10)
print("Debug directory:")
print(stdout.read().decode())

client.close()
