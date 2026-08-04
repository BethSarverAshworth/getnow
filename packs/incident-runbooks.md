# Incident Response Runbooks (Pro)

Use only on systems you own or are authorized to support. Adapt to your org’s policy.

## Runbook 1 — Suspected phishing click (first hour)

1. **Contain**
   - Disconnect network if malware suspected and policy allows
   - Note time, user, URL, attachments
2. **Credentials**
   - Reset password + revoke sessions
   - Check MFA status; re-enroll if needed
3. **Mailbox**
   - Search inbox rules / forwarding
   - Purge malicious mail for other users if tooling allows
4. **Endpoint**
   - Full scan with approved tools
   - Check startup items and recent downloads
5. **Document**
   - Timeline, actions, open questions
   - Escalate if data access or admin accounts involved

## Runbook 2 — Disk full (Linux server)

1. `df -h` — which mount?
2. `du -xhd1 /path | sort -h` — largest dirs
3. Common culprits: `/var/log`, Docker images, old backups, journal
4. Rotate/truncate logs safely; never delete blindly on production
5. Add monitoring alert for >85% usage
6. Root cause: growth trend vs one-time spike

## Runbook 3 — DNS outage symptoms

Symptoms: apps fail by name, IPs still ping.

1. Confirm: `ping 8.8.8.8` vs `ping example.com`
2. Check resolver config (`/etc/resolv.conf`, DHCP options)
3. Test alternate resolver temporarily
4. Check internal DNS service status if self-hosted
5. Communicate ETA; prefer short status updates over silence

## Runbook 4 — Ransomware indicators (first response)

1. Isolate affected hosts from network
2. Do **not** pay before leadership/legal decision
3. Preserve evidence (snapshots, logs) before mass rebuilds if IR requires it
4. Identify patient zero and blast radius
5. Reset privileged credentials; review backups offline
6. Rebuild from known-good backups after containment

## Communication template

```
Incident: [short title]
Severity: SEV-1/2/3
Impact: [who/what broken]
Start: [time]
Actions so far: [bullets]
Next update: [time]
Owner: [name]
```

## After-action (always)
- What failed?
- What detection was missing?
- One preventive change this week
