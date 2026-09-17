(function () {
  if (document.getElementById("calc-dock")) return;
  const file = (location.pathname.split("/").pop() || "index.html");
  if (file === "calculator.html") return;
  const C = window.GetNowCalc;
  if (!C) return;

  const wrap = document.createElement("div");
  wrap.id = "calc-dock";
  wrap.innerHTML = `
    <button type="button" class="calc-fab" id="calc-open" aria-expanded="false" aria-controls="calc-panel">Calculator</button>
    <aside class="calc-panel" id="calc-panel" hidden>
      <div class="calc-panel-head">
        <strong>Course calculator</strong>
        <button type="button" class="calc-close" id="calc-close" aria-label="Close calculator">Close</button>
      </div>
      <label>Formula
        <input id="dock-expr" type="text" placeholder="2^(32-24)-2" />
      </label>
      <div class="calc-row">
        <button class="go" type="button" id="dock-eval">Calculate</button>
      </div>
      <div id="dock-expr-out" class="calc-out" hidden></div>
      <label>Solve for x
        <input id="dock-eq" type="text" placeholder="3x+7=22" />
      </label>
      <div class="calc-row">
        <button class="go" type="button" id="dock-solve">Solve</button>
      </div>
      <div id="dock-eq-out" class="calc-out" hidden></div>
      <label>Subnet prefix
        <input id="dock-pre" type="number" min="0" max="32" value="24" />
      </label>
      <div class="calc-row">
        <button class="go" type="button" id="dock-sub">Size network</button>
      </div>
      <div id="dock-sub-out" class="calc-out" hidden></div>
      <p class="note"><a href="./calculator.html">Full calculator</a> (binary, hex, percent, bits/bytes)</p>
    </aside>
  `;
  document.body.appendChild(wrap);

  const panel = document.getElementById("calc-panel");
  const openBtn = document.getElementById("calc-open");
  function setOpen(on) {
    panel.hidden = !on;
    openBtn.setAttribute("aria-expanded", on ? "true" : "false");
    document.body.classList.toggle("calc-open", on);
    if (on) document.getElementById("dock-expr").focus();
  }
  openBtn.addEventListener("click", () => setOpen(panel.hidden));
  document.getElementById("calc-close").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

  function show(el, html, ok) {
    el.hidden = false;
    el.className = "calc-out " + (ok ? "ok" : "bad");
    el.innerHTML = html;
  }

  document.getElementById("dock-eval").onclick = () => {
    const el = document.getElementById("dock-expr-out");
    try { show(el, "<b>" + C.formatNum(C.evaluate(document.getElementById("dock-expr").value)) + "</b>", true); }
    catch (e) { show(el, e.message, false); }
  };
  document.getElementById("dock-expr").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("dock-eval").click();
  });
  document.getElementById("dock-solve").onclick = () => {
    const el = document.getElementById("dock-eq-out");
    try {
      const r = C.solveLinear(document.getElementById("dock-eq").value);
      show(el, "<b>" + r.variable + " = " + C.formatNum(r.value) + "</b>", true);
    } catch (e) { show(el, e.message, false); }
  };
  document.getElementById("dock-eq").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("dock-solve").click();
  });
  document.getElementById("dock-sub").onclick = () => {
    const el = document.getElementById("dock-sub-out");
    try {
      const s = C.subnet(document.getElementById("dock-pre").value);
      show(el, "<b>/" + s.prefix + "</b> mask " + s.mask + "<br>usable hosts <b>" + s.usable + "</b>", true);
    } catch (e) { show(el, e.message, false); }
  };
})();
