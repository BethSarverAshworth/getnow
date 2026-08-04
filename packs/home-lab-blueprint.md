# Home Lab Blueprint Pack (Pro)

Build a resume-worthy home lab on a budget.

## Goal
Practice networking, Linux, and security skills employers care about — without breaking production systems.

## Minimum gear
- Any PC that can run VirtualBox, UTM, or Proxmox (8GB+ RAM ideal)
- Optional: cheap managed switch, spare router for VLAN experiments
- Free software only is fine to start

## Lab topology (starter)

```
[Internet]
    |
[Home Router] — NAT
    |
[Host machine]
    |-- VM: pfSense or OPNsense (router/firewall practice)
    |-- VM: Ubuntu Server (Linux admin)
    |-- VM: Windows Server or Windows 10 (optional AD later)
    |-- VM: Kali or Security Onion (security tools — authorized use only)
```

## 30-day skill plan
### Week 1 — Linux
- Install Ubuntu Server
- Users, groups, sudo, SSH keys
- systemd services, journalctl
- Snapshot the VM after each win

### Week 2 — Networking
- Document IP plan (e.g. 10.10.10.0/24 lab net)
- Practice subnetting with your lab IPs
- Capture traffic with Wireshark on the host
- Set up DNS resolver (optional: Pi-hole or unbound)

### Week 3 — Security basics
- Fail2ban or simple SSH hardening
- UFW firewall rules
- Password policy + MFA where possible
- Write a one-page incident note: “what if disk fills up?”

### Week 4 — Portfolio
- Draw your topology (Excalidraw / draw.io)
- Write 3 lab write-ups (problem → steps → result)
- Publish on GitHub or this IT Repository as free teasers

## Interview talking points
1. “I run a segmented home lab with Linux + firewall VMs.”
2. “I can show packet captures for DNS/HTTP troubleshooting.”
3. “I document changes like a junior admin would in a ticket.”

## Next upgrades
- Active Directory domain (Windows Server evaluation)
- Reverse proxy + TLS (Caddy/Nginx)
- Monitoring (Uptime Kuma, Prometheus basics)
