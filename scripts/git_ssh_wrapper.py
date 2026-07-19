#!/usr/bin/env python3
"""SSH wrapper for git using paramiko"""
import paramiko
import sys
import os

hostname = sys.argv[1]
port = 22
if hostname.startswith("ssh://"):
    hostname = hostname.replace("ssh://", "")
if ":" in hostname:
    hostname, port_str = hostname.rsplit(":", 1)
    port = int(port_str)

key_path = os.path.expanduser("~/.ssh/id_rsa")
key = paramiko.RSAKey.from_private_key_file(key_path)

transport = paramiko.Transport((hostname, port))
transport.connect(username="git", pkey=key)
channel = transport.open_session()
channel.exec_command(" ".join(sys.argv[2:]))
channel.settimeout(300)

while True:
    if channel.recv_ready():
        data = channel.recv(4096)
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()
    if channel.recv_stderr_ready():
        data = channel.recv_stderr(4096)
        sys.stderr.buffer.write(data)
        sys.stderr.buffer.flush()
    if channel.exit_status_ready():
        break

exit_code = channel.recv_exit_status()
channel.close()
transport.close()
sys.exit(exit_code)
