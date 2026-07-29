#!/usr/bin/env python3
"""
INT-037 Deploy — Documentation update
"""
import paramiko
import sys

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

COMMANDS = [
    "cd /var/www/sec-scanner-build && git pull origin main",
    "cd /var/www/sec-scanner-build/landing && npx next build",
    "rm -rf /var/www/sec-scanner.pro/*",
    "cp -r /var/www/sec-scanner-build/landing/out/* /var/www/sec-scanner.pro/",
    "chown -R www-data:www-data /var/www/sec-scanner.pro",
    "nginx -s reload",
    "curl -s -o /dev/null -w '%{http_code}' https://sec-scanner.pro/",
]

def deploy():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USER, pkey=key, timeout=30)
    print("Connected!")
    
    for cmd in COMMANDS:
        print(f"\n>>> {cmd[:100]}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=600)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        exit_code = stdout.channel.recv_exit_status()
        
        if out.strip():
            print(out[-1500:] if len(out) > 1500 else out)
        if err.strip():
            # Filter out known warnings
            err_lines = [l for l in err.split('\n') if l.strip() and 'protocol options' not in l and 'signal process' not in l]
            if err_lines:
                print("STDERR:", '\n'.join(err_lines[:5]))
        print(f"Exit: {exit_code}")
    
    client.close()
    print("\nDeploy complete!")

if __name__ == "__main__":
    deploy()
