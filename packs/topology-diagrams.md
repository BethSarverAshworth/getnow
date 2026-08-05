# Network Topology Diagram Pack (Pro)

Use these as interview whiteboards, lab docs, and ticket attachments.
Copy into draw.io / Excalidraw / Visio when you need a polished version.

---

## 1) Star topology (most common LAN)

```
              [ Switch ]
             /    |    \
            /     |     \
        [PC1]  [PC2]  [PC3]
                  |
               [Printer]
```

**When to use:** Offices, classrooms, small LANs.  
**Pros:** Easy to add devices, isolate a bad cable.  
**Cons:** Switch is a single point of failure (mitigate with dual switches later).

**Interview line:** “Most access layers I design are star/extended-star off a switch stack.”

---

## 2) Extended star (real buildings)

```
                    [ Core Switch ]
                    /      |      \
                   /       |       \
            [Access A] [Access B] [Access C]
             /  |  \      |  \        |
          PCs  APs Cam   PCs APs    Servers
```

**When to use:** Multi-room / multi-floor with a distribution/core switch.

---

## 3) Mesh (partial) — resilient links

```
   [R1] -------- [R2]
     |  \      /  |
     |   \    /   |
     |    \  /    |
   [R3] -------- [R4]
```

**When to use:** WAN / site-to-site / critical core.  
**Tradeoff:** Cost and complexity rise with full mesh; partial mesh is common.

---

## 4) Hybrid topology (what you actually see)

```
  Internet
      |
  [Edge Firewall]
      |
  [Core]
   /  |  \
 LAN WiFi  DMZ
```

Mix of star access + hierarchical core + secured edge.

---

## 5) Bus / Ring (know for exams, rare in modern Ethernet)

**Bus:** Shared backbone (legacy coax thinking).  
**Ring:** FDDI / some metro; failover needs dual-ring design.

For modern Ethernet interviews, emphasize **star + hierarchical**.

---

## 6) How to draw a topology in 5 minutes (whiteboard)

1. Put **Internet** at top  
2. **Firewall / edge router** next  
3. **Core / distribution** switch  
4. **Access** switches per floor/area  
5. Label **IP ranges** and **VLANs**  
6. Mark **trust boundaries** (LAN vs DMZ vs guest)

### Label checklist
- Device role (not just hostname)
- Interface or link speed if known
- Subnet / VLAN IDs
- North-south vs east-west traffic notes

---

## 7) Symbols (standard-ish)

| Symbol idea | Meaning |
|-------------|---------|
| Rectangle | Router / L3 device |
| Circle or hex | Switch |
| Cylinder | Server / storage |
| Cloud | Internet / MPLS / ISP |
| Dashed box | Security zone (DMZ, guest) |

---

## 8) Practice drills

1. Draw a 3-floor office with guest Wi‑Fi isolated  
2. Draw home lab: ISP → router → switch → 3 VMs  
3. Draw small clinic: EHR server, staff VLAN, guest Wi‑Fi, firewall  

---

## 9) Tools (free)

- [draw.io / diagrams.net](https://app.diagrams.net/)  
- Excalidraw  
- Packet Tracer / GNS3 / EVE-NG for live labs  

Export PNG for tickets and portfolios.
