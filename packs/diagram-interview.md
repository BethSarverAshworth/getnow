# Diagram Interview Pack (Pro)

Many IT interviews include: “Draw the network” or “Walk me through this outage on a diagram.”

---

## 1) 60-second drawing order

1. Cloud = Internet  
2. Edge firewall / router  
3. Core or main switch  
4. Server(s)  
5. User LAN  
6. Wi‑Fi if relevant  
7. Arrows for the problem path  

Talk while you draw — silence loses points.

---

## 2) Template: “User can’t reach the website”

```
 User PC → Access SW → Core → Firewall → Internet → Web Server
   |          |         |         |
  IP/DNS    link/VLAN  route    NAT/policy
```

Check each hop: IP config → gateway → DNS → firewall allow → path MTU → remote up.

---

## 3) Template: Small company they describe

Ask clarifying questions first:

- How many users/sites?  
- On-prem servers or cloud?  
- Guest Wi‑Fi?  
- VPN for remote staff?  

Then draw **simple first**, add detail if they push.

---

## 4) Outage storytelling (STAR + diagram)

**Situation:** “Guest Wi‑Fi reached finance file share.”  
**Task:** Segment guest.  
**Action:** Guest VLAN + firewall ACL + SSID mapping (point on diagram).  
**Result:** Guest internet-only; staff unchanged.

---

## 5) Words that sound senior

- Trust boundary  
- Default gateway  
- East-west vs north-south  
- Single point of failure  
- Least privilege  
- Change window / rollback  

---

## 6) What not to do

- Draw spaghetti with no labels  
- Invent product names you can’t explain  
- Skip security when they asked for a “secure design”  
- Argue with the interviewer — adapt the diagram  

---

## 7) Practice prompts

1. 50-person office, 1 server room, guest Wi‑Fi  
2. Retail store: POS, cameras, guest, corporate laptop  
3. Homelab resume diagram (your real lab)  
4. Hybrid: M365 cloud + on-prem file server  

Time yourself: 3 minutes per diagram.

---

## 8) Portfolio tip

Photograph whiteboard diagrams (or export draw.io) and store in your IT Repository / GitHub README.
