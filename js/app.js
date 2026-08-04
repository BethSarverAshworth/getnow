const state = {
  resources: [],
  categories: [],
  query: "",
  category: "all",
  tier: "all",
};

const els = {
  grid: document.getElementById("resource-grid"),
  count: document.getElementById("result-count"),
  search: document.getElementById("search"),
  categoryFilters: document.getElementById("category-filters"),
  tierFilters: document.getElementById("tier-filters"),
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
  const method = (cfg.paymentMethod || "zelle").toLowerCase();

  // Prefer Stripe auto-checkout when configured
  if (method === "stripe" || method === "both") {
    const url = window.ITRepoAccess.getCheckoutUrl();
    if (url) {
      window.location.href = url;
      return;
    }
  }

  // Default / Zelle: payment instructions + QR
  if (method === "zelle" || method === "both" || !window.ITRepoAccess.getCheckoutUrl()) {
    window.location.href = "./pay.html";
    return;
  }

  openModal(
    "Payments not configured",
    `Add a Stripe Payment Link or set paymentMethod to "zelle" in js/config.js.`
  );
}

async function openProPack(resource) {
  if (!hasPro()) {
    openModal(
      "Pro content locked",
      `${resource.title}\n\n${resource.description}\n\n` +
        `Unlock Pro to read the full pack.\n` +
        `Click "Get Pro" to pay with Zelle, then open the unlock link you receive after payment.`
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
    els.proCta.textContent = unlocked ? "Browse Pro packs" : "Get Pro — start earning";
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
  const filtered = state.resources.filter(matches);
  filtered.sort((a, b) => {
    if (Boolean(b.featured) !== Boolean(a.featured)) {
      return Number(b.featured) - Number(a.featured);
    }
    return a.title.localeCompare(b.title);
  });

  els.count.textContent = `${filtered.length} resource${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    els.grid.innerHTML = `
      <div class="empty">
        <strong>No matches</strong>
        <p>Try another search term or clear filters.</p>
      </div>`;
    return;
  }

  els.grid.innerHTML = filtered.map(cardHTML).join("");
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

function bindEvents() {
  els.search.addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    render();
  });

  els.categoryFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    state.category = btn.dataset.category;
    renderCategories();
    render();
  });

  els.tierFilters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tier]");
    if (!btn) return;
    state.tier = btn.dataset.tier;
    renderTierFilters();
    render();
  });

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
        renderTierFilters();
        render();
        document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" });
      } else {
        checkoutOrSetup();
      }
    });
  }
}

async function init() {
  window.ITRepoAccess.tryUnlockFromUrl();

  // Clean sensitive query params from address bar after unlock attempt
  if (window.location.search.includes("token=") || window.location.search.includes("demo_pro=")) {
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.pathname);
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
    render();
    bindEvents();
  } catch (err) {
    els.grid.innerHTML = `
      <div class="empty">
        <strong>Could not load repository data</strong>
        <p>${escapeHtml(err.message)}. Serve the folder with a local web server (see README).</p>
      </div>`;
  }
}

init();
