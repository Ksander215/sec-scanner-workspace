#!/usr/bin/env python3
"""Deploy sec-scanner.pro build to production server using paramiko."""
import os
import tarfile
import paramiko
import io

# Configuration
HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/my-project/id_ed25519_sec_scanner"
BUILD_DIR = "/home/z/my-project/sec-scanner-landing/out"
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
    
    # Extract on remote
    print("Extracting on remote...")
    stdin, stdout, stderr = ssh.exec_command(f"cd {REMOTE_DIR} && tar -xzf build.tar.gz && rm build.tar.gz")
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        err = stderr.read().decode()
        print(f"Error extracting: {err}")
    else:
        print("Extracted!")
    
    # Verify
    print("Verifying deployment...")
    stdin, stdout, stderr = ssh.exec_command(f"ls -la {REMOTE_DIR}/ | head -20")
    print(stdout.read().decode())
    
    # Check specific files
    stdin, stdout, stderr = ssh.exec_command(f"ls {REMOTE_DIR}/app/ 2>/dev/null | head -10")
    result = stdout.read().decode().strip()
    if result:
        print(f"✓ /app/ directory exists with: {result}")
    else:
        print("✗ /app/ directory missing!")
    
    stdin, stdout, stderr = ssh.exec_command(f"ls {REMOTE_DIR}/index.html 2>/dev/null")
    if stdout.read().decode().strip():
        print("✓ /index.html exists")
    else:
        print("✗ /index.html missing!")
    
    sftp.close()
    ssh.close()
    print("\nDeployment complete!")

if __name__ == "__main__":
    main()
