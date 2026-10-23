#!/usr/bin/env python3
"""
Quick VPS Updater for Car Radar
Connects to the VPS, pulls latest git changes, builds Next.js, and restarts PM2.
"""
import sys
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

VPS_HOST = "89.46.217.44"
VPS_PORT = 22
VPS_USER = "root"
VPS_PASS = "c6khenbR98FpxqnM"

def main():
    print(f"Connecting to VPS {VPS_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, VPS_PORT, VPS_USER, VPS_PASS, timeout=30)
    print("Connected!")

    cmd = "cd /var/www/radar && git reset --hard origin/main && git pull origin main && npm run build && pm2 restart 0 1 2 3 && pm2 save && pm2 list"
    print(f">> {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    for line in iter(stdout.readline, ""):
        print(line, end="")
    
    ssh.close()
    print("\n✅ VPS Updated Successfully!")

if __name__ == "__main__":
    main()
