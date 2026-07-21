#!/usr/bin/env python3
"""Deploy AIS fix to production server using paramiko."""
import os
import tarfile
import paramiko
import io

# Configuration
HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"
BUILD_DIR = "/home/z/my-project/landing/out"
REMOTE_DIR = "/var/www/sec-scanner.pro"

def main():
    # Load SSH key
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    
    # Connect
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}:{PORT}...")
    ssh.connect(HOST, port=PORT, username=USER, pkey=key)
    print("Connected!")
    
    # Clear remote directory
    print(f"Clearing {REMOTE_DIR}...")
    stdin, stdout, stderr = ssh.exec_command(f"rm -rf {REMOTE_DIR}/*")
    stdout.channel.recv_exit_status()
    print("Cleared!")
    
    # Create tar in memory
    print("Creating tar archive...")
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
        for root, dirs, files in os.walk(BUILD_DIR):
            for file in files:
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, BUILD_DIR)
                tar.add(filepath, arcname=arcname)
    tar_buffer.seek(0)
    tar_size = tar_buffer.getbuffer().nbytes
    print(f"Tar created: {tar_size / 1024 / 1024:.1f} MB")
    
    # Upload via SFTP
    print("Uploading via SFTP...")
    sftp = ssh.open_sftp()
    remote_tar = f"{REMOTE_DIR}/build.tar.gz"
    sftp.putfo(tar_buffer, remote_tar)
    print("Uploaded!")
    
    # Extract and set permissions
    print("Extracting and setting permissions...")
    commands = [
        f"cd {REMOTE_DIR} && tar -xzf build.tar.gz && rm build.tar.gz",
        f"chown -R www-data:www-data {REMOTE_DIR}",
        f"chmod -R 755 {REMOTE_DIR}",
        f"nginx -s reload",
    ]
    for cmd in commands:
        print(f"  Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_code = stdout.channel.recv_exit_status()
        if exit_code != 0:
            err = stderr.read().decode()
            print(f"  Warning (exit {exit_code}): {err}")
        else:
            print(f"  OK")
    
    # Verify
    print("\nVerifying deployment...")
    stdin, stdout, stderr = ssh.exec_command(f"ls -la {REMOTE_DIR}/ | head -20")
    print(stdout.read().decode())
    
    stdin, stdout, stderr = ssh.exec_command(f"wc -c {REMOTE_DIR}/index.html")
    print("index.html size:", stdout.read().decode().strip())
    
    # Also update the build dir on server for consistency
    print("\nSyncing to build dir...")
    sync_cmd = f"rsync -a --delete {REMOTE_DIR}/ /var/www/sec-scanner-build/landing/out/"
    stdin, stdout, stderr = ssh.exec_command(sync_cmd)
    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        err = stderr.read().decode()
        print(f"  rsync warning: {err}")
    else:
        print("  Build dir synced OK")
    
    sftp.close()
    ssh.close()
    print("\nDeployment complete!")

if __name__ == "__main__":
    main()
