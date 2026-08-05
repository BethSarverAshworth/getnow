# Security Layers Playbook (Pro)

## Defense-in-depth blueprint

```
People & Process
      ↑
Identity (MFA, PAM, lifecycle)
      ↑
Data (crypto, backup, DLP)
      ↑
Applications (patch, config, WAF)
      ↑
Hosts/Endpoints (EDR, harden, encrypt)
      ↑
Network (segment, firewall, VPN)
      ↑
Perimeter / Edge
      ↑
Physical
```

## Control catalog (quick picks)
| Layer | Preventive | Detective | Corrective |
|-------|------------|-----------|------------|
| Identity | MFA, least privilege | Impossible travel alerts | Disable account |
| Endpoint | Patch, disk crypto | EDR alerts | Isolate host |
| Network | ACL/VLAN | NetFlow/IDS | Block IOCs |
| Data | Encrypt, classify | DLP alerts | Restore backup |
| People | Training | Phish report rate | Reset & coach |

## Architecture review checklist
- [ ] Guest isolated from staff
- [ ] Admin interfaces not on internet flat
- [ ] MFA on remote access & email
- [ ] Backups offline/immutable option
- [ ] Logging covers auth + firewall + endpoints
- [ ] Patch cadence documented
- [ ] Incident contacts posted

## Map one risk to layers (template)
**Risk:** Ransomware via phishing  
**People:** training + report button  
**Identity:** MFA  
**Email:** filtering + DMARC  
**Endpoint:** EDR + least privilege  
**Data:** backups tested  
**Detect:** SOC alert on mass encrypt  

## Interview answer
“I design stacked controls. If email filtering fails, MFA and EDR and backups still reduce impact.”
