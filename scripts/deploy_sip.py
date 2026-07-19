import paramiko
import time
import sys

SSH_KEY = "/home/z/.ssh/sip_deploy"
SERVER = "85.239.38.163"
PORT = 22222
USER = "root"
REPO_DIR = "/root/sec-scanner-workspace"
STATIC_DIR = "/var/www/sec-scanner.pro"

key = paramiko.Ed25519Key.from_private_key_file(SSH_KEY)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER, port=PORT, username=USER, pkey=key, timeout=30)

def run(cmd, timeout=120):
    print(f"→ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(f"  {out.strip()[:200]}")
    if err.strip() and code != 0:
        print(f"  ERR: {err.strip()[:200]}")
    return code, out, err

# 1. Git pull
run(f"cd {REPO_DIR} && git fetch origin && git reset --hard origin/main", timeout=30)

# 2. Install deps & build
run(f"cd {REPO_DIR}/sec-scanner-landing && npm install", timeout=120)
code, out, err = run(f"cd {REPO_DIR}/sec-scanner-landing && npm run build", timeout=180)
if code != 0:
    print("BUILD FAILED!")
    print(err[-500:])
    sys.exit(1)

# 3. Deploy static files
run(f"rm -rf {STATIC_DIR}/*")
run(f"cp -r {REPO_DIR}/sec-scanner-landing/out/* {STATIC_DIR}/")
run(f"chown -R www-data:www-data {STATIC_DIR}")

# 4. Verify
code, _, _ = run(f"ls -la {STATIC_DIR}/ | head -20")

print("\n✅ Deploy complete!")
client.close()
