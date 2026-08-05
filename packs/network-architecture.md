# Network Architecture Pack (Pro)

Architecture = how pieces fit for **security, scale, and support** — not just “cables.”

---

## 1) Hierarchical campus model (classic 3-tier)

```
                 ┌─────────────┐
                 │    CORE     │  high speed, few features
                 └──────┬──────┘
            ┌───────────┼───────────┐
            ▼           ▼           ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  DIST A  │ │  DIST B  │ │  DIST C  │  policy, routing
      └────┬─────┘ └────┬─────┘ └────┬─────┘
           │            │            │
      Access sw     Access sw    Access sw   end devices
```

**Collapsed core (2-tier):** Core + distribution merged — common in smaller orgs.

**Interview tip:** Explain *why* you collapse (cost/size) vs full 3-tier (scale/segmentation).

---

## 2) Small business / branch architecture

```
  [ISP Modem]
       |
  [Firewall / UTM]  -- VPN to HQ (optional)
       |
  [L3 Switch or Router-on-a-stick]
       |
  +----+----+----+
  |    |    |    |
Staff Guest Cameras Servers
VLAN10 VLAN20 VLAN30  VLAN40
```

### Default design goals
- Separate **guest** from **staff**  
- Management VLAN for switches/APs  
- Outbound internet via firewall  
- Backups not only “on the same PC”

---

## 3) DMZ / perimeter architecture

```
                    Internet
                        |
                  [Edge Firewall]
                   /          \
              [LAN]          [DMZ]
           users/apps     web/mail/VPN
                               |
                          [Internal FW]
                               |
                          [Sensitive apps]
```

**Rule of thumb:** Public services don’t sit flat on the same LAN as workstations.

---

## 4) Zero-trust lite (practical language)

You may not deploy full ZTNA on day one, but design toward:

1. Authenticate users/devices  
2. Least privilege to apps  
3. Segment networks (VLANs / firewalls)  
4. Log and alert  

**Diagram story:** “Identity + device posture → access policy → resource.”

---

## 5) Example IP plan (document this!)

| Zone   | VLAN | Subnet        | Gateway    | Notes        |
|--------|------|---------------|------------|--------------|
| Mgmt   | 5    | 10.5.0.0/24   | 10.5.0.1   | switches/APs |
| Staff  | 10   | 10.10.0.0/23  | 10.10.0.1  | DHCP         |
| Guest  | 20   | 10.20.0.0/24  | 10.20.0.1  | internet only|
| Servers| 40   | 10.40.0.0/24  | 10.40.0.1  | static IPs   |
| Cameras| 30   | 10.30.0.0/24  | 10.30.0.1  | no east-west |

---

## 6) Traffic flows to explain in interviews

**North-south:** User → internet (via firewall)  
**East-west:** Server ↔ server, or user ↔ internal app  

Call out where **ACLs / firewall rules** live for each.

---

## 7) High-availability sketch (small)

```
   ISP-A          ISP-B
     \             /
      [FW-A]---[FW-B]  (HA pair or active/passive)
            |
         [Core]
```

Even if budget is one ISP, *mention* dual-WAN as a growth path.

---

## 8) Architecture decision checklist

- [ ] Who are the users (staff, guest, IoT)?  
- [ ] What must never talk to what?  
- [ ] Where is DNS / DHCP / AD?  
- [ ] How do we remote admin securely?  
- [ ] Backup path if primary link dies?  
- [ ] Logging: firewall + switch + identity  

---

## 9) Portfolio one-pager template

1. Problem (e.g. “flat network, guest on same VLAN”)  
2. Diagram (before → after)  
3. IP/VLAN table  
4. Security controls  
5. What you’d monitor  

---

## 10) Related free study

CompTIA Network+ objectives on topology & architecture; vendor free CCNA intro material on hierarchical design.
