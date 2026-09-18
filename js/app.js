const PAGE_SIZE = 24;

const state = {
  resources: [],
  categories: [],
  query: "",
  category: "all",
  tier: "all",
  level: "all",
  page: 1,
};

const els = {
  grid: document.getElementById("resource-grid"),
  count: document.getElementById("result-count"),
  search: document.getElementById("search"),
  searchForm: document.getElementById("search-form"),
  searchBtn: document.getElementById("search-btn"),
  searchClear: document.getElementById("search-clear"),
  categoryFilters: document.getElementById("category-filters"),
  tierFilters: document.getElementById("tier-filters"),
  levelFilters: document.getElementById("level-filters"),
  pager: document.getElementById("pager"),
  freeCount: document.getElementById("stat-free"),
  proCount: document.getElementById("stat-pro"),
  totalCount: document.getElementById("stat-total"),
  catCount: document.getElementById("stat-cats"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalClose: document.getElementById("modal-close"),
  proStatus: document.getElementById("pro-status"),
  proCta: document.getElementById("pro-cta"),
  buyButtons: () => document.querySelectorAll("[data-buy-pro]"),
  priceLabel: document.getElementById("price-label"),
  pricePeriod: document.getElementById("price-period"),
  ownerName: document.getElementById("owner-name"),
};

function hasPro() {
  return window.ITRepoAccess && window.ITRepoAccess.isProUnlocked();
}

function matches(resource) {
  if (state.category !== "all" && resource.category !== state.category) {
    return false;
  }
  if (state.tier !== "all" && resource.tier !== state.tier) {
    return false;
  }
  if (state.level !== "all" && resource.level !== state.level) {
    return false;
  }
  if (!state.query) return true;

  const q = state.query.toLowerCase();
  const haystack = [
    resource.title,
    resource.description,
    resource.type,
    resource.level,
    resource.category,
    ...(resource.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function resetPage() {
  state.page = 1;
}

function getFilteredSorted() {
  const filtered = state.resources.filter(matches);
  filtered.sort((a, b) => {
    if (Boolean(b.featured) !== Boolean(a.featured)) {
      return Number(b.featured) - Number(a.featured);
    }
    if (a.tier !== b.tier) {
      return a.tier === "pro" ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });
  return filtered;
}

function openModal(title, body, { pre = true } = {}) {
  els.modalTitle.textContent = title;
  if (pre) {
    els.modalBody.style.whiteSpace = "pre-wrap";
    els.modalBody.textContent = body;
  } else {
    els.modalBody.style.whiteSpace = "pre-wrap";
    els.modalBody.textContent = body;
  }
  els.modal.classList.add("open");
  els.modal.setAttribute("aria-hidden", "false");
  els.modalClose.focus();
}

function closeModal() {
  els.modal.classList.remove("open");
  els.modal.setAttribute("aria-hidden", "true");
}

function checkoutOrSetup() {
  const cfg = window.ITRepoAccess.getConfig();
  const method = (cfg.paymentMethod || "bank").toLowerCase();

  // Prefer Stripe auto-checkout when configured
  if (method === "stripe" || method === "both") {
    const url = window.ITRepoAccess.getCheckoutUrl();
    if (url) {
      window.location.href = url;
      return;
    }
  }

  // Bank transfer or Zelle: payment instructions page
  if (method === "bank" || method === "zelle" || method === "both" || !window.ITRepoAccess.getCheckoutUrl()) {
    window.location.href = "./pay.html";
    return;
  }

  openModal(
    "Payments not configured",
    `Add a Stripe Payment Link or set paymentMethod to "bank" in js/config.js.`
  );
}

async function openProPack(resource) {
  if (!hasPro()) {
    openModal(
      "Pro content locked",
      `${resource.title}\n\n${resource.description}\n\n` +
        `Unlock Pro to read the full pack.\n` +
        `Click "Get Pro" to pay by bank transfer, then open the unlock link you receive after payment.`
    );
    return;
  }

  if (resource.pack) {
    try {
      const res = await fetch(resource.pack);
      if (!res.ok) throw new Error(`Could not load pack (${res.status})`);
      const text = await res.text();
      openModal(resource.title, text);
      return;
    } catch (err) {
      openModal(resource.title, `Failed to load pack: ${err.message}`);
      return;
    }
  }

  if (resource.body) {
    openModal(resource.title, resource.body);
    return;
  }

  openModal(resource.title, resource.description);
}

async function handleOpen(resource) {
  if (resource.tier === "pro") {
    await openProPack(resource);
    return;
  }

  if (resource.body) {
    openModal(resource.title, resource.body);
    return;
  }

  if (resource.url && !resource.url.startsWith("#")) {
    window.open(resource.url, "_blank", "noopener,noreferrer");
    return;
  }

  openModal(resource.title, resource.description);
}

function cardHTML(resource) {
  const isPro = resource.tier === "pro";
  const unlocked = hasPro();
  const tags = (resource.tags || [])
    .slice(0, 4)
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");

  let actionLabel = "Open resource";
  if (isPro) {
    actionLabel = unlocked ? "Open Pro pack" : "Unlock Pro";
  } else if (resource.body) {
    actionLabel = "View content";
  }

  return `
    <article class="card ${isPro ? "pro" : ""}" data-id="${escapeHtml(resource.id)}">
      <div class="card-top">
        <div class="badges">
          <span class="badge ${isPro ? "pro" : "free"}">${isPro ? "Pro" : "Free"}</span>
          <span class="badge level">${escapeHtml(resource.level)}</span>
          <span class="badge">${escapeHtml(resource.type)}</span>
        </div>
      </div>
      <h3>${escapeHtml(resource.title)}</h3>
      <p>${escapeHtml(resource.description)}</p>
      <div class="tags">${tags}</div>
      <div class="card-actions">
        <button class="btn ${isPro ? "btn-pro" : "btn-primary"}" type="button" data-open="${escapeHtml(resource.id)}">
          ${actionLabel}
        </button>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCategories() {
  els.categoryFilters.innerHTML = state.categories
    .map(
      (c) => `
      <button type="button" class="chip ${state.category === c.id ? "active" : ""}" data-category="${c.id}">
        ${c.icon ? c.icon + " " : ""}${escapeHtml(c.name)}
      </button>`
    )
    .join("");
}

function renderTierFilters() {
  const options = [
    { id: "all", label: "All tiers" },
    { id: "free", label: "Free only" },
    { id: "pro", label: "Pro only" },
  ];
  els.tierFilters.innerHTML = options
    .map(
      (o) => `
      <button type="button" class="chip ${state.tier === o.id ? "active" : ""}" data-tier="${o.id}">
        ${escapeHtml(o.label)}
      </button>`
    )
    .join("");
}

function renderLevelFilters() {
  if (!els.levelFilters) return;
  const options = [
    { id: "all", label: "All levels" },
    { id: "Beginner", label: "Beginner" },
    { id: "Intermediate", label: "Intermediate" },
    { id: "Advanced", label: "Advanced" },
  ];
  els.levelFilters.innerHTML = options
    .map(
      (o) => `
      <button type="button" class="chip ${state.level === o.id ? "active" : ""}" data-level="${o.id}">
        ${escapeHtml(o.label)}
      </button>`
    )
    .join("");
}

function renderPager(total) {
  if (!els.pager) return;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.page > pages) state.page = pages;

  if (total <= PAGE_SIZE) {
    els.pager.innerHTML = "";
    return;
  }

  const prevDisabled = state.page <= 1 ? "disabled" : "";
  const nextDisabled = state.page >= pages ? "disabled" : "";

  els.pager.innerHTML = `
    <button type="button" class="btn btn-ghost" data-page="prev" ${prevDisabled}>← Prev</button>
    <span class="pager-meta">Page ${state.page} of ${pages}</span>
    <button type="button" class="btn btn-ghost" data-page="next" ${nextDisabled}>Next →</button>
  `;
}

function bindNavToggle() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  nav.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    });
  });
}

async function loadHomeNews() {
  const list = document.getElementById("home-news-list");
  const status = document.getElementById("home-news-status");
  if (!list || !window.GetNowNews) return;
  try {
    const items = await window.GetNowNews.loadHeadlines(8);
    window.GetNowNews.renderList(list, items);
    if (status) {
      status.textContent = items.length
        ? "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "Headlines could not load. Open the news widget and tap Refresh.";
    }
  } catch {
    if (status) status.textContent = "Headlines could not load right now.";
  }
}

function updateProUI() {
  const unlocked = hasPro();
  const cfg = window.ITRepoAccess.getConfig();

  if (els.proStatus) {
    els.proStatus.textContent = unlocked
      ? "Pro active on this device"
      : "Free plan";
    els.proStatus.classList.toggle("is-pro", unlocked);
  }

  if (els.proCta) {
    els.proCta.textContent = unlocked ? "Browse Pro packs" : "Get Pro — Pay by bank";
  }

  if (els.priceLabel && cfg.priceLabel) {
    els.priceLabel.textContent = cfg.priceLabel;
  }
  if (els.pricePeriod && cfg.pricePeriod) {
    els.pricePeriod.textContent = cfg.pricePeriod;
  }
  if (els.ownerName && cfg.ownerName) {
    els.ownerName.textContent = cfg.ownerName;
  }

  document.querySelectorAll("[data-buy-pro]").forEach((btn) => {
    if (unlocked) {
      btn.textContent = "Pro unlocked ✓";
      btn.onclick = () => {
        state.tier = "pro";
        renderTierFilters();
        render();
        document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
      };
    } else {
      btn.onclick = (e) => {
        e.preventDefault();
        checkoutOrSetup();
      };
    }
  });
}

function render() {
  const filtered = getFilteredSorted();
  const total = filtered.length;
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + PAGE_SIZE, total);
  els.count.textContent =
    total === 0
      ? "0 resources"
      : `Showing ${showingFrom}–${showingTo} of ${total} resource${total === 1 ? "" : "s"}`;

  if (!filtered.length) {
    els.grid.innerHTML = `
      <div class="empty">
        <strong>No matches</strong>
        <p>Try another search term or clear filters.</p>
      </div>`;
    renderPager(0);
    return;
  }

  els.grid.innerHTML = pageItems.map(cardHTML).join("");
  renderPager(total);
}

function updateStats() {
  const free = state.resources.filter((r) => r.tier === "free").length;
  const pro = state.resources.filter((r) => r.tier === "pro").length;
  els.freeCount.textContent = String(free);
  els.proCount.textContent = String(pro);
  els.totalCount.textContent = String(state.resources.length);
  els.catCount.textContent = String(
    state.categories.filter((c) => c.id !== "all").length
  );
}

function updateSearchClearVisibility() {
  if (!els.searchClear) return;
  const hasQuery = Boolean((els.search?.value || "").trim() || state.query);
  els.searchClear.hidden = !hasQuery;
}

function runSearch({ scroll = true } = {}) {
  state.query = (els.search?.value || "").trim();
  resetPage();
  render();
  updateSearchClearVisibility();
  if (scroll) {
    document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("result-count")?.focus?.();
  }
}

function clearSearch() {
  if (els.search) els.search.value = "";
  state.query = "";
  resetPage();
  render();
  updateSearchClearVisibility();
  els.search?.focus();
}

function bindEvents() {
  // Live filter as you type
  els.search.addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    resetPage();
    render();
    updateSearchClearVisibility();
  });

  // Explicit Search button + Enter key
  if (els.searchForm) {
    els.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch({ scroll: true });
    });
  } else if (els.searchBtn) {
    els.searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      runSearch({ scroll: true });
    });
  }

  if (els.searchClear) {
    els.searchClear.addEventListener("click", () => clearSearch());
  }

  els.categoryFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    state.category = btn.dataset.category;
    resetPage();
    renderCategories();
    render();
  });

  els.tierFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tier]");
    if (!btn) return;
    state.tier = btn.dataset.tier;
    resetPage();
    renderTierFilters();
    render();
  });

  if (els.levelFilters) {
    els.levelFilters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-level]");
      if (!btn) return;
      state.level = btn.dataset.level;
      resetPage();
      renderLevelFilters();
      render();
    });
  }

  if (els.pager) {
    els.pager.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-page]");
      if (!btn || btn.disabled) return;
      const total = getFilteredSorted().length;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      if (btn.dataset.page === "prev") state.page = Math.max(1, state.page - 1);
      if (btn.dataset.page === "next") state.page = Math.min(pages, state.page + 1);
      render();
      document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  els.grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const resource = state.resources.find((r) => r.id === btn.dataset.open);
    if (resource) handleOpen(resource);
  });

  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (els.proCta) {
    els.proCta.addEventListener("click", () => {
      if (hasPro()) {
        state.tier = "pro";
        resetPage();
        renderTierFilters();
        render();
        document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
      } else {
        checkoutOrSetup();
      }
    });
  }
}

function isFileProtocol() {
  return window.location.protocol === "file:";
}

async function init() {
  bindNavToggle();
  window.ITRepoAccess.tryUnlockFromUrl();
  loadHomeNews();

  // Clean sensitive query params from address bar after unlock attempt
  if (window.location.search.includes("token=") || window.location.search.includes("demo_pro=")) {
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.pathname);
  }

  // Double-clicking index.html (file://) cannot load JSON — show a clear fix
  if (isFileProtocol()) {
    els.grid.innerHTML = `
      <div class="empty">
        <strong>Open GetNow the easy way</strong>
        <p>Browsers block the library when you open the HTML file directly.</p>
        <p style="margin-top:0.75rem">
          <a class="btn btn-primary" href="https://getnow-app.vercel.app/">Open live site</a>
          &nbsp;
          <a class="btn btn-ghost" href="http://127.0.0.1:8080/">Try local server</a>
        </p>
        <p style="margin-top:1rem;font-size:0.9rem">
          Or double-click <code>OPEN-GetNow.command</code> in the project folder,
          or on your Desktop open <code>OPEN-GetNow.html</code>.
        </p>
      </div>`;
    updateProUI();
    return;
  }

  try {
    const res = await fetch("./data/resources.json");
    if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
    const data = await res.json();
    state.categories = data.categories || [];
    state.resources = data.resources || [];
    updateStats();
    updateProUI();
    renderCategories();
    renderTierFilters();
    renderLevelFilters();
    render();
    bindEvents();
    updateSearchClearVisibility();
  } catch (err) {
    const msg = String((err && err.message) || err || "");
    const netFail = /failed to fetch|fetch failed|networkerror/i.test(msg);
    els.grid.innerHTML = `
      <div class="empty">
        <strong>${netFail ? "Could not connect to the GetNow library" : "Could not load library data"}</strong>
        <p>${escapeHtml(netFail ? "TypeError: Failed to fetch — open the live site instead of a local file." : msg)}</p>
        <p style="margin-top:0.75rem">
          <a class="btn btn-primary" href="https://getnow-app.vercel.app/">Open live GetNow</a>
        </p>
        <p style="margin-top:1rem;font-size:0.9rem">
          Local: run <code>python3 -m http.server 8080</code> in the project folder,
          then visit <a href="http://127.0.0.1:8080/">http://127.0.0.1:8080/</a>
        </p>
      </div>`;
    updateProUI();
  }
}

init();
