#!/usr/bin/env python3
"""Deploy Next.js static build to production server via paramiko SFTP"""

import paramiko
import os
import stat
import sys

SERVER = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/my-project/id_ed25519_sec_scanner"
LOCAL_OUT = "/home/z/my-project/sec-scanner-landing/out"
REMOTE_PATH = "/var/www/sec-scanner.pro"

def get_ssh_client():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER, port=PORT, username=USER, pkey=key, timeout=30)
    return client

def upload_directory(sftp, local_dir, remote_dir, stats):
    """Recursively upload a directory."""
    # Ensure remote directory exists
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)
    
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_item_path = remote_dir + "/" + item
        
        if os.path.isdir(local_path):
            upload_directory(sftp, local_path, remote_item_path, stats)
        else:
            try:
                sftp.put(local_path, remote_item_path)
                stats['files'] += 1
                if stats['files'] % 50 == 0:
                    print(f"  Uploaded {stats['files']} files...")
            except Exception as e:
                print(f"  ERROR uploading {local_path}: {e}")
                stats['errors'] += 1

def main():
    print(f"Connecting to {SERVER}:{PORT}...")
    client = get_ssh_client()
    sftp = client.open_sftp()
    
    # First, clear the remote directory
    print(f"Clearing {REMOTE_PATH}...")
    stdin, stdout, stderr = client.exec_command(f"rm -rf {REMOTE_PATH}/*")
    stdout.channel.recv_exit_status()
    
    # Upload all files
    stats = {'files': 0, 'errors': 0}
    print(f"Uploading {LOCAL_OUT} -> {REMOTE_PATH}...")
    upload_directory(sftp, LOCAL_OUT, REMOTE_PATH, stats)
    
    print(f"\nUpload complete: {stats['files']} files uploaded, {stats['errors']} errors")
    
    # Set proper permissions
    print("Setting permissions...")
    stdin, stdout, stderr = client.exec_command(f"chmod -R 755 {REMOTE_PATH}")
    stdout.channel.recv_exit_status()
    stdin, stdout, stderr = client.exec_command(f"chown -R www-data:www-data {REMOTE_PATH}")
    stdout.channel.recv_exit_status()
    
    # Verify key files exist
    print("Verifying deployment...")
    stdin, stdout, stderr = client.exec_command(f"ls -la {REMOTE_PATH}/index.html")
    print(stdout.read().decode())
    
    stdin, stdout, stderr = client.exec_command(f"ls {REMOTE_PATH}/app/ | head -10")
    print("App directory:", stdout.read().decode())
    
    # Check nginx is serving
    stdin, stdout, stderr = client.exec_command("nginx -t 2>&1 && systemctl is-active nginx")
    print("Nginx status:", stdout.read().decode().strip())
    
    sftp.close()
    client.close()
    print("\nDeployment finished successfully!")

if __name__ == "__main__":
    main()
