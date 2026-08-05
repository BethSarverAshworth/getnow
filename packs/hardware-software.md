# Hardware & Software Master Pack (Pro)

## Component map (study poster)

```
[PSU] → power rails → [Motherboard]
                         |-- CPU + cooler
                         |-- RAM
                         |-- GPU (optional)
                         |-- Storage (SATA/NVMe)
                         |-- NIC / Wi‑Fi
                         '-- Firmware (UEFI)
                                  |
                           Bootloader → OS → Drivers → Apps
```

## Field replaceable vs soldered
| Part | Desktop | Many laptops |
|------|---------|--------------|
| RAM | Often modular | Sometimes soldered |
| Storage | Modular | Modular or soldered |
| CPU | Socketed | Often soldered |
| GPU | PCIe card | Often integrated |

## Boot failure decision tree
1. No lights/fans → power path (outlet, PSU, cable, battery)
2. Lights but no display → RAM reseat, external monitor, GPU
3. Display but no boot device → disk detection in UEFI, cables, boot order
4. Boot loop → safe mode / recovery, recent driver/update, disk health
5. OS up but device missing → driver, Device Manager/lspci, physical seat

## Software stack layers
- Firmware
- OS kernel
- Device drivers
- OS services
- User applications
- Browser / SaaS

## Lab exercises
1. Identify every major part in a photo of a PC
2. Change boot order and boot a Linux live USB
3. Enable virtualization flags and launch a VM
4. Document drivers after a clean OS install
5. Create a personal “known-good baseline” checklist

## Interview blurbs
- “I troubleshoot bottom-up: power, POST, disk, OS, app.”
- “I separate hardware faults from driver/OS issues before reimaging.”
