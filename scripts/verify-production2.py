#!/usr/bin/env python3
"""
Deep check — find the actual dashboard page and AIS content
"""
import paramiko

HOST = "85.239.38.163"
PORT = 22222
USER = "root"
KEY_PATH = "/home/z/.ssh/id_ed25519"

COMMANDS = [
    # Check if dashboard.html exists in app dir
    "find /var/www/sec-scanner.pro -name '*dashboard*' -type f 2>/dev/null",
    # Check the app.html — this is the main app shell
    "grep -o 'AIS\\|AISAssistant\\|SoloNotification\\|PersonalGoal\\|useAIS\\|Adaptive' /var/www/sec-scanner.pro/app.html 2>/dev/null | sort | uniq -c | head -10",
    # Check JS chunks for AIS content
    "grep -c 'AISAssistant\\|SoloNotification\\|PersonalGoalCard\\|useAIS\\|soundEngine\\|confidenceEngine\\|contextPredictor\\|adaptiveMemory' /var/www/sec-scanner.pro/_next/static/chunks/*.js 2>/dev/null | grep -v ':0$'",
    # The actual dashboard page — check txt version
    "head -20 /var/www/sec-scanner.pro/app/dashboard/__next.!KGFwcCk.app.dashboard.__PAGE__.txt 2>/dev/null || echo 'no page txt'",
    # What the user actually sees at /app/dashboard URL
    "curl -s https://sec-scanner.pro/app/dashboard | grep -o 'AIS\\|Adaptive\\|SoloNotification\\|PersonalGoal' | sort | uniq -c || echo 'NO AIS IN LIVE PAGE'",
    # Check if there's a cache issue — curl with no cache
    "curl -s -H 'Cache-Control: no-cache' https://sec-scanner.pro/app/dashboard | grep -o 'AIS\\|Adaptive\\|SoloNotification' | sort | uniq -c || echo 'NO AIS'",
    # Check the HTML that dashboard URL returns
    "curl -s https://sec-scanner.pro/app/dashboard | head -3",
    # Check if .next directory from old deploy is interfering
    "rm -rf /var/www/sec-scanner.pro/.next && echo 'Removed stale .next directory'",
    # Verify the _next chunks are the latest
    "ls -la /var/www/sec-scanner.pro/_next/static/chunks/ | head -10",
]

def inspect():
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=HOST, port=PORT, username=USER, pkey=key, timeout=30)
    print("Connected!\n")
    
    for cmd in COMMANDS:
        print(f">>> {cmd[:120]}")
        print("-" * 60)
        stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out)
        if err.strip():
            print("STDERR:", err)
        print()
    
    client.close()

if __name__ == "__main__":
    inspect()
