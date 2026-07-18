#!/usr/bin/env python3
"""Deploy Next.js build via SFTP + SSH: upload tar, extract on server"""
import sys
sys.path.insert(0, '/home/z/my-project/pylib')

import paramiko
import os

SERVER = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/my-project/id_ed25519_sec_scanner"
LOCAL_ARCHIVE = "/home/z/my-project/deploy.tar.gz"
REMOTE_ARCHIVE = "/tmp/deploy.tar.gz"
REMOTE_PATH = "/var/www/sec-scanner.pro"

def main():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {SERVER}:{PORT}...")
    client.connect(SERVER, port=PORT, username=USER, pkey=key, timeout=30)
    
    # Upload archive via SFTP
    print(f"Uploading archive ({os.path.getsize(LOCAL_ARCHIVE)//1024}KB)...")
    sftp = client.open_sftp()
    sftp.put(LOCAL_ARCHIVE, REMOTE_ARCHIVE)
    sftp.close()
    print("Upload done.")
    
    # Extract on server
    print(f"Clearing {REMOTE_PATH}...")
    client.exec_command(f"rm -rf {REMOTE_PATH}/*")
    
    print(f"Extracting archive to {REMOTE_PATH}...")
    stdin, stdout, stderr = client.exec_command(f"mkdir -p {REMOTE_PATH} && tar xzf {REMOTE_ARCHIVE} -C {REMOTE_PATH}")
    exit_code = stdout.channel.recv_exit_status()
    err = stderr.read().decode()
    if err:
        print(f"Extract stderr: {err}")
    print(f"Extract exit code: {exit_code}")
    
    # Set permissions
    print("Setting permissions...")
    client.exec_command(f"chmod -R 755 {REMOTE_PATH} && chown -R www-data:www-data {REMOTE_PATH}")
    
    # Cleanup
    client.exec_command(f"rm -f {REMOTE_ARCHIVE}")
    
    # Verify
    print("Verifying deployment...")
    stdin, stdout, stderr = client.exec_command(f"ls -la {REMOTE_PATH}/ | head -20")
    print(stdout.read().decode())
    
    stdin, stdout, stderr = client.exec_command(f"ls {REMOTE_PATH}/app/ | head -10")
    print("App dir:", stdout.read().decode())
    
    # Check index.html has SIP branding
    stdin, stdout, stderr = client.exec_command(f"head -5 {REMOTE_PATH}/index.html")
    print("index.html head:", stdout.read().decode())
    
    # Check nginx
    stdin, stdout, stderr = client.exec_command("nginx -t 2>&1 && systemctl is-active nginx")
    print("Nginx:", stdout.read().decode().strip())
    
    client.close()
    print("\nDeployment complete!")

if __name__ == "__main__":
    main()
