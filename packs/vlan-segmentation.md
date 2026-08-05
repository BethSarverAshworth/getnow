# VLAN & Segmentation Design Pack (Pro)

VLANs are how you turn one switch fabric into multiple logical networks.

---

## 1) Why segment?

| Without VLANs        | With VLANs              |
|----------------------|-------------------------|
| One big broadcast    | Smaller domains         |
| Guest sees staff     | Guest isolated          |
| Hard to firewall     | Policy per VLAN/subnet  |
| Messy troubleshooting| Clear zones             |

---

## 2) Access vs trunk (must know)

```
[PC] --access VLAN 10--> [Switch] ==trunk 10,20,30== [Switch] --access VLAN 20--> [PC]
```

- **Access port:** one VLAN (end device)  
- **Trunk port:** multiple VLANs (switch-to-switch, switch-to-firewall)  
- Tagging: **802.1Q**

---

## 3) Router-on-a-stick

```
              [Router / Firewall]
                     | subif .10 .20 .30
                     | trunk
                  [Switch]
                 /    |    \
              VLAN10 VLAN20 VLAN30
```

Inter-VLAN routing on one physical uplink with subinterfaces.

---

## 4) L3 switch inter-VLAN

```
   [L3 Switch / SVI VLAN10,20,30]
        /      |      \
    access  access  access
```

Faster east-west inside the LAN; still use firewall for internet/DMZ edges.

---

## 5) Recommended starter VLAN map

| VLAN | Name     | Purpose              | Inter-VLAN?        |
|------|----------|----------------------|--------------------|
| 5    | MGMT     | Network gear only    | Admin jump only    |
| 10   | DATA     | Staff workstations   | To servers/internet|
| 20   | VOICE    | Phones (if used)     | To PBX/internet    |
| 30   | GUEST    | Visitors / BYOD      | Internet only      |
| 40   | SERVERS  | Infra apps           | Controlled         |
| 50   | IOT      | Cameras, printers*   | Least privilege    |

\*Printers sometimes live on DATA — document the choice.

---

## 6) ACL examples (intent, not vendor syntax)

**Guest → anywhere except internet: deny**  
**IoT → staff PCs: deny**  
**Staff → servers: allow only needed ports**  
**Mgmt: only from jump host / VPN**

---

## 7) Wireless + VLAN

```
[SSID: Staff]  --> VLAN 10
[SSID: Guest]  --> VLAN 20  (captive portal optional)
[SSID: IoT]    --> VLAN 50
        \
       [AP] --trunk--> [Switch] --> [Firewall]
```

Same SSID strategy should match wired segmentation.

---

## 8) Common mistakes

1. Everything still in VLAN 1  
2. No native VLAN hygiene on trunks  
3. Guest can route to LAN  
4. No documentation of which port is which  
5. Cameras on staff VLAN “for convenience”

---

## 9) Lab exercise (do this)

1. Create VLAN 10/20 on a virtual switch (or Packet Tracer)  
2. Put two hosts in different VLANs — confirm they **don’t** ping  
3. Add inter-VLAN routing — confirm they **do** ping  
4. Add a deny ACL staff→guest — confirm block  

---

## 10) Interview answer (30 seconds)

“I segment by role: staff, guest, servers, management. Access ports are single-VLAN; uplinks are trunks. Routing happens at L3 switch or firewall depending on size, and guest is locked to internet-only.”
