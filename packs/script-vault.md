# Automation Script Vault (Pro)

Authorized use only. Test in a lab first.

## 1) Health check (Bash)

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "=== Host ==="; hostname; date
echo "=== Uptime ==="; uptime
echo "=== Disk ==="; df -h
echo "=== Memory ==="; free -h 2>/dev/null || vm_stat
echo "=== Listening ports ==="
if command -v ss >/dev/null; then ss -tuln; else netstat -tuln 2>/dev/null || true; fi
```

## 2) Log size report

```bash
#!/usr/bin/env bash
set -euo pipefail
LOG_DIR="${1:-/var/log}"
du -sh "$LOG_DIR"/* 2>/dev/null | sort -h | tail -n 20
```

## 3) User list audit (Linux)

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "Users with login shells:"
awk -F: '$7 !~ /nologin|false/ {print $1,$3,$7}' /etc/passwd
echo
echo "Sudo group members (if present):"
getent group sudo 2>/dev/null || getent group wheel 2>/dev/null || true
```

## 4) Simple website uptime check

```bash
#!/usr/bin/env bash
set -euo pipefail
URL="${1:-https://example.com}"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" || echo "000")
if [[ "$CODE" =~ ^2|3 ]]; then
  echo "OK $URL -> $CODE"
  exit 0
else
  echo "FAIL $URL -> $CODE"
  exit 1
fi
```

## 5) PowerShell: disk summary (Windows)

```powershell
Get-PSDrive -PSProvider FileSystem |
  Select-Object Name,
    @{N='UsedGB';E={[math]::Round(($_.Used/1GB),2)}},
    @{N='FreeGB';E={[math]::Round(($_.Free/1GB),2)}}
```

## 6) PowerShell: last 20 system errors

```powershell
Get-WinEvent -FilterHashtable @{LogName='System'; Level=2} -MaxEvents 20 |
  Select-Object TimeCreated, Id, ProviderName, Message
```

## Safe automation rules
1. Prefer dry-run flags
2. Log actions with timestamps
3. Never hard-code secrets — use env vars
4. Least privilege accounts for scheduled tasks
5. Keep scripts in git with README
