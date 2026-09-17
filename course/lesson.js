(function () {
  const KEY = "getnow_course_progress";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  const page = document.body.getAttribute("data-lesson") || location.pathname.split("/").pop();
  document.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ans = btn.parentElement.querySelector(".answer");
      if (!ans) return;
      ans.classList.toggle("show");
      btn.textContent = ans.classList.contains("show") ? "Hide answer" : "Show answer";
    });
  });
  const mark = document.getElementById("mark-done");
  if (mark) {
    const data = load();
    if (data[page]) {
      mark.textContent = "Completed";
      mark.disabled = true;
    }
    mark.addEventListener("click", () => {
      const d = load();
      d[page] = new Date().toISOString();
      save(d);
      mark.textContent = "Completed";
      mark.disabled = true;
    });
  }
  const bar = document.getElementById("progress-bar");
  const label = document.getElementById("progress-label");
  if (bar) {
    const lessons = [
      "index.html", "math.html", "network-plus.html", "security-plus.html", "cissp.html"
    ];
    const d = load();
    const n = lessons.filter((id) => d[id]).length;
    bar.style.width = Math.round((n / lessons.length) * 100) + "%";
    if (label) label.textContent = n + " of " + lessons.length + " modules marked done";
  }

  const pageFile = location.pathname.split("/").pop() || "index.html";
  if (pageFile !== "calculator.html") {
    function loadScript(src, next) {
      if (document.querySelector('script[src="' + src + '"]')) { if (next) next(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = next || null;
      document.body.appendChild(s);
    }
    loadScript("./calculator.js", function () { loadScript("./widget.js"); });
  }
})();
