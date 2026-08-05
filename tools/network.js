(function () {
  const $ = (id) => document.getElementById(id);

  function isProbablyIp(s) {
    return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(s) || s.includes(":");
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function getPublicIp() {
    const el = $("my-ip");
    const meta = $("my-ip-meta");
    el.textContent = "Loading…";
    meta.textContent = "";
    try {
      const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      if (!res.ok) throw new Error("ipify " + res.status);
      const data = await res.json();
      el.textContent = data.ip || "Unknown";
      meta.textContent = "Source: api.ipify.org\nTip: compare with what your VPN shows.";
      return data.ip;
    } catch (err) {
      try {
        const res2 = await fetch("https://api64.ipify.org?format=json", { cache: "no-store" });
        const data2 = await res2.json();
        el.textContent = data2.ip || "Unknown";
        meta.textContent = "Source: api64.ipify.org";
        return data2.ip;
      } catch (e2) {
        el.textContent = "Unavailable";
        meta.textContent = "Could not reach IP lookup APIs (offline or blocked).";
        return null;
      }
    }
  }

  async function dnsLookup(name) {
    // Cloudflare DNS over HTTPS
    const url =
      "https://cloudflare-dns.com/dns-query?name=" +
      encodeURIComponent(name) +
      "&type=A";
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
    });
    if (!res.ok) throw new Error("DNS HTTP " + res.status);
    const data = await res.json();
    const answers = (data.Answer || [])
      .filter((a) => a.type === 1)
      .map((a) => a.data);
    return { status: data.Status, answers, raw: data };
  }

  async function reverseLookup(ip) {
    // PTR via Cloudflare — reverse for IPv4: reverse octets + in-addr.arpa
    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      return { answers: [], note: "Reverse lookup only for IPv4 here." };
    }
    const ptr = ip.split(".").reverse().join(".") + ".in-addr.arpa";
    const url =
      "https://cloudflare-dns.com/dns-query?name=" +
      encodeURIComponent(ptr) +
      "&type=PTR";
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
    });
    if (!res.ok) throw new Error("PTR HTTP " + res.status);
    const data = await res.json();
    const answers = (data.Answer || [])
      .filter((a) => a.type === 12)
      .map((a) => a.data.replace(/\.$/, ""));
    return { answers, status: data.Status };
  }

  async function httpsProbe(host) {
    // Browsers block most cross-origin reads; we still measure if a request starts/fails timing.
    // Use a no-cors image/script style timing against https://host/favicon.ico when possible.
    const targets = [
      `https://${host}/`,
      `https://${host}/favicon.ico`,
    ];
    const started = performance.now();
    let lastErr = null;
    for (const t of targets) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const t0 = performance.now();
        await fetch(t, {
          mode: "no-cors",
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        const ms = Math.round(performance.now() - t0);
        return {
          ok: true,
          ms,
          note: "Opaque HTTPS probe completed (no-cors). Not a substitute for ICMP ping.",
          target: t,
        };
      } catch (err) {
        lastErr = err;
      }
    }
    return {
      ok: false,
      ms: Math.round(performance.now() - started),
      note: "HTTPS probe failed or timed out (host down, blocks HTTPS, or network error).",
      error: String(lastErr && lastErr.message ? lastErr.message : lastErr),
    };
  }

  function commandBlock(target) {
    return `# macOS / Linux
ping -c 4 ${target}
traceroute ${target}

# Windows CMD
ping -n 4 ${target}
tracert ${target}

# PowerShell
Test-Connection ${target} -Count 4
Test-NetConnection ${target} -InformationLevel Detailed`;
  }

  function renderCheck(host, parts) {
    const box = $("check-results");
    box.classList.remove("hidden");
    box.innerHTML = `
      <h3>Results for <code>${escapeHtml(host)}</code></h3>
      ${parts.join("")}
      <h4>Copy-ready terminal commands</h4>
      <pre class="out">${escapeHtml(commandBlock(host))}</pre>
      <button type="button" class="btn btn-ghost" id="copy-cmds">Copy commands</button>
      <p class="tiny muted">Only test systems you own or have permission to probe.</p>
    `;
    const btn = $("copy-cmds");
    if (btn) {
      btn.onclick = async () => {
        await navigator.clipboard.writeText(commandBlock(host));
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = "Copy commands"), 1500);
      };
    }
  }

  async function runCheck(host) {
    host = host.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (!host) return;

    const parts = [];
    parts.push(`<div class="status">Running checks…</div>`);
    renderCheck(host, parts);
    parts.length = 0;

    // DNS or reverse
    try {
      if (isProbablyIp(host)) {
        const rev = await reverseLookup(host);
        parts.push(`
          <div class="result-block">
            <strong>Reverse DNS (PTR)</strong>
            <pre class="out">${
              rev.answers && rev.answers.length
                ? escapeHtml(rev.answers.join("\n"))
                : escapeHtml(rev.note || "No PTR records found")
            }</pre>
          </div>`);
      } else {
        const dns = await dnsLookup(host);
        parts.push(`
          <div class="result-block">
            <strong>DNS A records</strong>
            <pre class="out">${
              dns.answers.length
                ? escapeHtml(dns.answers.join("\n"))
                : "No A records (Status " + dns.status + ")"
            }</pre>
          </div>`);
      }
    } catch (err) {
      parts.push(`
        <div class="result-block bad">
          <strong>DNS</strong>
          <pre class="out">${escapeHtml(err.message)}</pre>
        </div>`);
    }

    // HTTPS probe — only for hostnames or public IPs that might speak HTTPS
    try {
      const probeHost = host;
      const probe = await httpsProbe(probeHost);
      parts.push(`
        <div class="result-block ${probe.ok ? "good" : "warn"}">
          <strong>HTTPS reachability probe</strong>
          <pre class="out">${probe.ok ? "Reachable-ish" : "Not confirmed"} · ${probe.ms} ms
${escapeHtml(probe.note || "")}
${probe.target ? "Target: " + escapeHtml(probe.target) : ""}
${probe.error ? "Error: " + escapeHtml(probe.error) : ""}</pre>
        </div>`);
    } catch (err) {
      parts.push(`
        <div class="result-block warn">
          <strong>HTTPS probe</strong>
          <pre class="out">${escapeHtml(err.message)}</pre>
        </div>`);
    }

    parts.push(`
      <div class="result-block">
        <strong>True ICMP ping</strong>
        <pre class="out">Use the terminal commands below on your machine.
Browsers cannot send ICMP echo requests for security reasons.</pre>
      </div>`);

    renderCheck(host, parts);
  }

  async function runBulk() {
    const raw = $("bulk-hosts").value || "";
    const hosts = raw
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^https?:\/\//, "").split("/")[0])
      .filter(Boolean)
      .slice(0, 12);

    const box = $("bulk-results");
    box.classList.remove("hidden");
    if (!hosts.length) {
      box.innerHTML = `<p class="muted">Add at least one host.</p>`;
      return;
    }

    box.innerHTML = `<p class="status">Checking ${hosts.length} host(s)…</p><div id="bulk-table"></div>`;
    const table = document.getElementById("bulk-table");
    const rows = [];

    for (const h of hosts) {
      let dnsInfo = "—";
      let probeInfo = "—";
      try {
        if (isProbablyIp(h)) {
          const rev = await reverseLookup(h);
          dnsInfo = rev.answers.length ? rev.answers[0] : "no PTR";
        } else {
          const dns = await dnsLookup(h);
          dnsInfo = dns.answers.length ? dns.answers.join(", ") : "no A";
        }
      } catch {
        dnsInfo = "DNS error";
      }
      try {
        const probe = await httpsProbe(h);
        probeInfo = probe.ok ? `~${probe.ms} ms` : `fail ~${probe.ms} ms`;
      } catch {
        probeInfo = "probe error";
      }
      rows.push(`<tr>
        <td><code>${escapeHtml(h)}</code></td>
        <td>${escapeHtml(dnsInfo)}</td>
        <td>${escapeHtml(probeInfo)}</td>
      </tr>`);
      table.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Host</th><th>DNS</th><th>HTTPS probe</th></tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>`;
    }
  }

  // Wire up
  $("refresh-ip").addEventListener("click", getPublicIp);
  $("copy-ip").addEventListener("click", async () => {
    const ip = $("my-ip").textContent.trim();
    if (!ip || ip === "Loading…" || ip === "Unavailable") return;
    await navigator.clipboard.writeText(ip);
    $("copy-ip").textContent = "Copied ✓";
    setTimeout(() => ($("copy-ip").textContent = "Copy"), 1200);
  });

  $("check-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runCheck($("host-input").value);
  });

  $("fill-dns").addEventListener("click", () => {
    $("host-input").value = "1.1.1.1";
    runCheck("1.1.1.1");
  });

  $("fill-local").addEventListener("click", () => {
    $("host-input").value = "192.168.1.1";
    $("check-results").classList.remove("hidden");
    $("check-results").innerHTML = `
      <h3>Private gateway hint</h3>
      <p class="muted">Common gateways: <code>192.168.1.1</code>, <code>192.168.0.1</code>, <code>10.0.0.1</code>. Private IPs usually won’t reverse-DNS on the public internet — ping them from your LAN terminal:</p>
      <pre class="out">${escapeHtml(commandBlock("192.168.1.1"))}</pre>
      <p class="tiny muted">Find your real gateway: <code>ipconfig</code> (Windows) or <code>ip route</code> / <code>route -n get default</code> (Mac/Linux).</p>`;
  });

  $("bulk-run").addEventListener("click", runBulk);
  $("bulk-sample").addEventListener("click", () => {
    $("bulk-hosts").value = ["1.1.1.1", "8.8.8.8", "cloudflare.com", "github.com", "microsoft.com"].join("\n");
  });

  getPublicIp();
})();
