# IT Interview Question Bank (Pro)

Helpdesk → Junior Sysadmin. Use model answers, then customize with your real lab stories.

## Helpdesk / Desktop

**Q: A user says “the internet is down.” What do you do?**  
A: Clarify scope (one user vs many). Check physical link/Wi‑Fi, then `ipconfig`/`ip a`, gateway ping, DNS resolution, known outages. Escalate with evidence (times, error messages, what you already tried).

**Q: How do you explain the difference between a virus and phishing?**  
A: Phishing tricks a person into giving access/credentials. Malware is software that infects systems. Both can appear together; user awareness + technical controls matter.

**Q: Walk me through resetting a password securely.**  
A: Verify identity per policy, reset in the directory/tool, force change at next login, never email permanent passwords in plain text, document the ticket.

## Networking

**Q: What is DNS?**  
A: Translates names (example.com) to IP addresses. If DNS fails, “internet feels down” even when the network path works.

**Q: Private vs public IP?**  
A: Private ranges (10/8, 172.16/12, 192.168/16) stay inside a network; public IPs route on the internet. NAT commonly maps private clients outward.

**Q: What is a VLAN?**  
A: Logical segmentation of a switch network. Improves security and reduces broadcast domains when designed correctly.

## Linux / Systems

**Q: How do you find what is using disk space?**  
A: `df -h` for volumes, `du -sh *` for directories, clear logs/caches carefully, check large files under `/var` and home dirs.

**Q: How do you check if a service is running?**  
A: `systemctl status servicename`, logs via `journalctl -u servicename`, ports with `ss -tuln`.

**Q: Explain permissions 755 vs 644.**  
A: 755 = rwxr-xr-x (common for executables/dirs). 644 = rw-r--r-- (common for files). Always least privilege.

## Security

**Q: What is MFA and why use it?**  
A: Multi-factor authentication requires something you know + have/are. Stops many credential-stuffing attacks even when passwords leak.

**Q: A user clicked a suspicious link. First actions?**  
A: Isolate device if policy says so, reset credentials, check mail rules/forwarding, scan, document timeline, escalate to IR if confirmed compromise.

## Behavioral

**Q: Tell me about a time you troubleshot under pressure.**  
A: Use STAR (Situation, Task, Action, Result). Prefer a real lab or class incident with a measurable result.

**Q: How do you handle a ticket you cannot solve?**  
A: Research, reproduce, document attempts, escalate early with clear notes — never leave the user in the dark.

## Red flags to avoid in answers
- “I would just Google it” with no structure
- Blaming users without empathy
- Skipping verification/security policy
- Claiming expertise you cannot demo
