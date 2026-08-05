(function () {
  const state = {
    step: 1,
    hostOs: null,
    hypervisor: null,
    goal: null,
  };

  const hypers = {
    mac: [
      {
        id: "utm",
        name: "UTM (recommended on Mac)",
        url: "https://mac.getutm.app/",
        note: "Great for Apple Silicon. Free.",
      },
      {
        id: "virtualbox",
        name: "VirtualBox",
        url: "https://www.virtualbox.org/",
        note: "Works best on Intel Macs; Apple Silicon support is limited.",
      },
      {
        id: "parallels",
        name: "Parallels (paid)",
        url: "https://www.parallels.com/",
        note: "Polished paid option if you need Windows on Mac often.",
      },
    ],
    windows: [
      {
        id: "hyperv",
        name: "Hyper-V (Windows Pro/Education)",
        url: "https://learn.microsoft.com/en-us/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v",
        note: "Built-in on Pro/Edu. Enable via Windows features.",
      },
      {
        id: "virtualbox",
        name: "VirtualBox (recommended free)",
        url: "https://www.virtualbox.org/",
        note: "Works on Home editions. Easy snapshots.",
      },
      {
        id: "vmware",
        name: "VMware Workstation Player",
        url: "https://www.vmware.com/products/workstation-player.html",
        note: "Check current free/personal licensing on VMware’s site.",
      },
    ],
    linux: [
      {
        id: "virtualbox",
        name: "VirtualBox",
        url: "https://www.virtualbox.org/",
        note: "Simple desktop hypervisor.",
      },
      {
        id: "kvm",
        name: "KVM/QEMU + virt-manager",
        url: "https://virt-manager.org/",
        note: "Native Linux virtualization stack.",
      },
      {
        id: "proxmox",
        name: "Proxmox VE (dedicated box)",
        url: "https://www.proxmox.com/en/proxmox-ve",
        note: "Best if you have a spare PC as a lab server.",
      },
    ],
  };

  const isos = {
    "linux-admin": [
      { name: "Ubuntu Server", url: "https://ubuntu.com/download/server" },
      { name: "Debian", url: "https://www.debian.org/distrib/" },
    ],
    "windows-admin": [
      {
        name: "Windows Server Evaluation",
        url: "https://www.microsoft.com/en-us/evalcenter/evaluate-windows-server",
      },
      {
        name: "Windows 10/11 Eval / dev VM",
        url: "https://developer.microsoft.com/en-us/windows/downloads/virtual-machines/",
      },
    ],
    networking: [
      { name: "Ubuntu Server (router/services)", url: "https://ubuntu.com/download/server" },
      { name: "pfSense CE", url: "https://www.pfsense.org/download/" },
    ],
    security: [
      {
        name: "Kali Linux (authorized use only)",
        url: "https://www.kali.org/get-kali/",
      },
      { name: "Ubuntu Server (targets)", url: "https://ubuntu.com/download/server" },
    ],
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setStep(n) {
    state.step = n;
    $$(".wizard-panel").forEach((p) => {
      p.classList.toggle("hidden", Number(p.dataset.step) !== n);
    });
    renderStepper();
    $("prev").classList.toggle("hidden", n <= 1 || n >= 4);
    $("next").classList.toggle("hidden", n >= 4);
    if (n === 2) renderHypers();
    if (n === 4) renderPlan();
  }

  function renderStepper() {
    const labels = ["Host OS", "Hypervisor", "Goal", "Plan"];
    $("stepper").innerHTML = labels
      .map((label, i) => {
        const num = i + 1;
        const cls =
          num === state.step ? "active" : num < state.step ? "done" : "";
        return `<div class="step-pill ${cls}"><span>${num}</span>${label}</div>`;
      })
      .join("");
  }

  function selectChoice(container, value) {
    container.querySelectorAll(".choice").forEach((b) => {
      b.classList.toggle("active", b.dataset.value === value);
    });
  }

  function renderHypers() {
    const list = hypers[state.hostOs] || [];
    const box = $("#hypervisor");
    const hint = $("#hyper-hint");
    hint.textContent =
      state.hostOs === "mac"
        ? "On Apple Silicon, start with UTM."
        : state.hostOs === "windows"
          ? "Home edition → VirtualBox. Pro/Edu can use Hyper-V."
          : "Desktop: VirtualBox or virt-manager. Spare PC: Proxmox.";

    box.innerHTML = list
      .map(
        (h) => `
      <button type="button" class="choice ${state.hypervisor === h.id ? "active" : ""}" data-value="${h.id}">
        <strong>${h.name}</strong>
        <span class="choice-note">${h.note}</span>
      </button>`
      )
      .join("");

    box.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.hypervisor = btn.dataset.value;
        selectChoice(box, state.hypervisor);
      });
    });
  }

  function findHyper() {
    const list = hypers[state.hostOs] || [];
    return list.find((h) => h.id === state.hypervisor) || list[0];
  }

  function renderPlan() {
    const h = findHyper();
    const goal = state.goal;
    const goalLabel = {
      "linux-admin": "Linux admin practice",
      "windows-admin": "Windows / AD practice",
      networking: "Networking / multi-VM",
      security: "Security tools (authorized only)",
    }[goal];

    const ram =
      goal === "networking" || goal === "windows-admin" ? "16GB+ host RAM ideal" : "8GB+ host RAM minimum";
    const vms =
      goal === "networking"
        ? "2–3 VMs (router/firewall + server + client)"
        : goal === "windows-admin"
          ? "1–2 VMs (Server eval + optional client)"
          : "1–2 VMs to start";

    const isoList = (isos[goal] || [])
      .map((i) => `<li><a href="${i.url}" target="_blank" rel="noopener">${i.name}</a></li>`)
      .join("");

    const checklist = [
      "Download & install hypervisor",
      "Download ISO(s) for your goal",
      "Create VM: 2 vCPU, 2–4 GB RAM, 20–40 GB disk",
      "Attach ISO, boot, install OS",
      "Install guest tools / additions if available",
      "Set network: NAT first (internet), Host-only for isolated labs",
      "Take a snapshot named 'fresh-install'",
      "Practice: users, updates, SSH/RDP, static IP",
      "Document your topology (use Architecture category in the library)",
    ];

    $("#plan").innerHTML = `
      <div class="plan-hero">
        <div><span class="muted">Host</span><strong>${state.hostOs}</strong></div>
        <div><span class="muted">Hypervisor</span><strong>${h ? h.name : "—"}</strong></div>
        <div><span class="muted">Goal</span><strong>${goalLabel || "—"}</strong></div>
      </div>

      <h3>Downloads</h3>
      <ul>
        ${h ? `<li><a href="${h.url}" target="_blank" rel="noopener">Get ${h.name}</a> — ${h.note}</li>` : ""}
        ${isoList}
      </ul>

      <h3>Sizing</h3>
      <pre class="out">${ram}
Leave host OS ~4GB free.
Start small: ${vms}
Disk: dynamically allocated VDI/QCOW.</pre>

      <h3>Build checklist</h3>
      <ul class="check">
        ${checklist.map((c) => `<li><label><input type="checkbox"> ${c}</label></li>`).join("")}
      </ul>

      <h3>First commands after Linux install</h3>
      <pre class="out">sudo apt update && sudo apt upgrade -y   # Debian/Ubuntu
ip a
ping -c 4 1.1.1.1
ping -c 4 google.com</pre>

      <h3>First checks after Windows install</h3>
      <pre class="out">ipconfig /all
ping 1.1.1.1
Test-NetConnection 1.1.1.1</pre>

      <p class="tiny muted">
        Security note: only run offensive tools against systems you own or have written permission to test.
      </p>
    `;
  }

  // Host OS choices
  $("#host-os").querySelectorAll(".choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.hostOs = btn.dataset.value;
      state.hypervisor = null;
      selectChoice($("#host-os"), state.hostOs);
    });
  });

  $("#goal").querySelectorAll(".choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.goal = btn.dataset.value;
      selectChoice($("#goal"), state.goal);
    });
  });

  $("next").addEventListener("click", () => {
    if (state.step === 1 && !state.hostOs) {
      alert("Pick your computer type first.");
      return;
    }
    if (state.step === 2) {
      if (!state.hypervisor) {
        // default first option
        const list = hypers[state.hostOs] || [];
        if (list[0]) state.hypervisor = list[0].id;
      }
      if (!state.hypervisor) {
        alert("Pick a hypervisor.");
        return;
      }
    }
    if (state.step === 3 && !state.goal) {
      alert("Pick a lab goal.");
      return;
    }
    setStep(Math.min(4, state.step + 1));
  });

  $("prev").addEventListener("click", () => setStep(Math.max(1, state.step - 1)));
  $("back-btn").addEventListener("click", () => setStep(3));
  $("restart-btn").addEventListener("click", () => {
    state.hostOs = null;
    state.hypervisor = null;
    state.goal = null;
    $$(".choice").forEach((c) => c.classList.remove("active"));
    setStep(1);
  });

  setStep(1);
  $("next").classList.remove("hidden");
})();
