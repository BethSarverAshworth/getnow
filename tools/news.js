(function () {
  const TOPICS = [
    { id: "all", name: "All topics" },
    { id: "security", name: "Security" },
    { id: "networking", name: "Networking" },
    { id: "cloud", name: "Cloud" },
    { id: "hardware", name: "Hardware" },
    { id: "general", name: "General" },
    { id: "career", name: "Career" },
    { id: "opensource", name: "Open source" },
  ];

  /** Public RSS feeds (reputable tech / IT / security). */
  const FEEDS = [
    {
      id: "bleeping",
      name: "BleepingComputer",
      topic: "security",
      rss: "https://www.bleepingcomputer.com/feed/",
    },
    {
      id: "krebson",
      name: "Krebs on Security",
      topic: "security",
      rss: "https://krebsonsecurity.com/feed/",
    },
    {
      id: "cisa",
      name: "CISA Alerts",
      topic: "security",
      rss: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    },
    {
      id: "thehackernews",
      name: "The Hacker News",
      topic: "security",
      rss: "https://feeds.feedburner.com/TheHackersNews",
    },
    {
      id: "arstechnica",
      name: "Ars Technica",
      topic: "general",
      rss: "https://feeds.arstechnica.com/arstechnica/index",
    },
    {
      id: "verge",
      name: "The Verge",
      topic: "general",
      rss: "https://www.theverge.com/rss/index.xml",
    },
    {
      id: "hn",
      name: "Hacker News",
      topic: "opensource",
      rss: "https://hnrss.org/frontpage",
    },
    {
      id: "aws",
      name: "AWS News Blog",
      topic: "cloud",
      rss: "https://aws.amazon.com/blogs/aws/feed/",
    },
    {
      id: "azure",
      name: "Azure Blog",
      topic: "cloud",
      rss: "https://azure.microsoft.com/en-us/blog/feed/",
    },
    {
      id: "cloudflare",
      name: "Cloudflare Blog",
      topic: "networking",
      rss: "https://blog.cloudflare.com/rss/",
    },
    {
      id: "googlecloud",
      name: "Google Cloud Blog",
      topic: "cloud",
      rss: "https://cloudblog.withgoogle.com/rss/",
    },
    {
      id: "microsoft365",
      name: "Microsoft Security Blog",
      topic: "security",
      rss: "https://www.microsoft.com/en-us/security/blog/feed/",
    },
  ];

  const LOCAL_SHARES = "it_tech_news_shares_v1";
  const AUTHOR_KEY = "it_news_author";

  const state = {
    topic: "all",
    query: "",
    items: [],
    shares: [],
    tab: "feeds",
    client: null,
    mode: "local",
  };

  const $ = (id) => document.getElementById(id);

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : "n-" + Date.now() + Math.random().toString(36).slice(2);
  }

  function liveSettings() {
    try {
      const local = JSON.parse(localStorage.getItem("it_vault_supabase") || "null");
      if (local?.url && local?.anon) return local;
    } catch {
      /* ignore */
    }
    const c = window.IT_REPO_CONFIG || {};
    if (c.supabaseUrl && c.supabaseAnonKey) return { url: c.supabaseUrl, anon: c.supabaseAnonKey };
    return null;
  }

  function initClient() {
    const live = liveSettings();
    if (live && window.supabase?.createClient) {
      try {
        state.client = window.supabase.createClient(live.url, live.anon);
        state.mode = "live";
        return;
      } catch {
        /* fall through */
      }
    }
    state.client = null;
    state.mode = "local";
  }

  async function fetchRss(feed) {
    const encoded = encodeURIComponent(feed.rss);
    // Primary: rss2json public endpoint
    try {
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encoded}&count=12`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.items)) {
          return data.items.map((it) => ({
            id: feed.id + ":" + (it.guid || it.link || it.title),
            title: it.title || "Untitled",
            link: it.link || it.url || "#",
            date: it.pubDate || it.published || "",
            source: feed.name,
            topic: feed.topic,
            summary: stripHtml(it.description || it.content || "").slice(0, 220),
          }));
        }
      }
    } catch {
      /* try fallback */
    }

    // Fallback: allorigins + parse XML
    try {
      const res = await fetch(
        `https://api.allorigins.win/raw?url=${encoded}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("proxy " + res.status);
      const text = await res.text();
      return parseRssXml(text, feed);
    } catch (err) {
      console.warn("Feed failed", feed.name, err);
      return [];
    }
  }

  function stripHtml(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
  }

  function parseRssXml(xmlText, feed) {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const items = [...doc.querySelectorAll("item, entry")].slice(0, 12);
    return items.map((item, i) => {
      const title =
        item.querySelector("title")?.textContent?.trim() || "Untitled";
      const link =
        item.querySelector("link")?.getAttribute("href") ||
        item.querySelector("link")?.textContent?.trim() ||
        item.querySelector("id")?.textContent?.trim() ||
        "#";
      const date =
        item.querySelector("pubDate, published, updated")?.textContent || "";
      const summary = stripHtml(
        item.querySelector("description, summary, content")?.textContent || ""
      ).slice(0, 220);
      return {
        id: feed.id + ":" + i + ":" + title.slice(0, 40),
        title,
        link,
        date,
        source: feed.name,
        topic: feed.topic,
        summary,
      };
    });
  }

  async function loadFeeds() {
    $("feed-status").textContent = "Fetching latest headlines from public feeds…";
    $("feed-list").innerHTML = `<div class="empty-news">Loading tech news…</div>`;

    const results = await Promise.all(FEEDS.map((f) => fetchRss(f)));
    state.items = results.flat().sort((a, b) => {
      const da = Date.parse(a.date) || 0;
      const db = Date.parse(b.date) || 0;
      return db - da;
    });

    const sourcesOk = results.filter((r) => r.length).length;
    $("feed-status").textContent = state.items.length
      ? `${state.items.length} headlines · ${sourcesOk}/${FEEDS.length} sources loaded · ${new Date().toLocaleTimeString()}`
      : "Could not load feeds right now (network or CORS). Try Refresh, or browse Community shares.";
    renderFeeds();
  }

  function filteredFeeds() {
    return state.items.filter((it) => {
      if (state.topic !== "all" && it.topic !== state.topic) return false;
      if (!state.query) return true;
      const q = state.query.toLowerCase();
      return [it.title, it.summary, it.source, it.topic].join(" ").toLowerCase().includes(q);
    });
  }

  function renderTopicFilters() {
    $("topic-filters").innerHTML = TOPICS.map(
      (t) => `
      <button type="button" class="chip ${state.topic === t.id ? "active" : ""}" data-topic="${t.id}">
        ${escapeHtml(t.name)}
      </button>`
    ).join("");
  }

  function formatDate(d) {
    if (!d) return "";
    const t = Date.parse(d);
    if (!t) return d;
    return new Date(t).toLocaleString();
  }

  function renderFeeds() {
    const list = filteredFeeds();
    if (!list.length) {
      $("feed-list").innerHTML = `<div class="empty-news tool-card">No headlines match this filter. Try All topics or clear search.</div>`;
      return;
    }
    $("feed-list").innerHTML = list
      .map(
        (it) => `
      <article class="news-card tool-card">
        <div class="news-meta">
          <span class="src">${escapeHtml(it.source)}</span>
          <span class="topic-tag">${escapeHtml(it.topic)}</span>
          <span>${escapeHtml(formatDate(it.date))}</span>
        </div>
        <h2><a href="${escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title)}</a></h2>
        ${it.summary ? `<p class="news-sum">${escapeHtml(it.summary)}</p>` : ""}
        <div class="row">
          <a class="btn btn-primary" href="${escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer">Read article</a>
          <button type="button" class="btn btn-ghost" data-reshare='${escapeHtml(
            JSON.stringify({ title: it.title, url: it.link, topic: it.topic })
          )}'>Share to board</button>
        </div>
      </article>`
      )
      .join("");
  }

  // ----- Community shares -----
  async function loadShares() {
    if (state.mode === "live" && state.client) {
      const { data, error } = await state.client
        .from("tech_news_shares")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) {
        state.shares = data.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          topic: r.topic,
          note: r.note || "",
          author: r.author || "Anonymous",
          createdAt: r.created_at,
        }));
        renderCommunity();
        return;
      }
    }
    try {
      state.shares = JSON.parse(localStorage.getItem(LOCAL_SHARES) || "[]");
    } catch {
      state.shares = [];
    }
    if (!Array.isArray(state.shares)) state.shares = [];
    renderCommunity();
  }

  async function saveShare(share) {
    if (state.mode === "live" && state.client) {
      const row = {
        id: share.id,
        title: share.title,
        url: share.url,
        topic: share.topic,
        note: share.note || "",
        author: share.author,
        created_at: share.createdAt || new Date().toISOString(),
      };
      const { error } = await state.client.from("tech_news_shares").upsert(row);
      if (!error) {
        await loadShares();
        return;
      }
      // fall through to local if table missing
      console.warn(error);
    }
    state.shares.unshift(share);
    localStorage.setItem(LOCAL_SHARES, JSON.stringify(state.shares));
    renderCommunity();
  }

  function renderCommunity() {
    $("share-count").textContent = String(state.shares.length);
    if (!state.shares.length) {
      $("community-list").innerHTML = `
        <div class="empty-news tool-card">
          <strong>No community shares yet</strong>
          <p>Be the first to post an article, advisory, or write-up worth the team’s time.</p>
        </div>`;
      return;
    }
    $("community-list").innerHTML = state.shares
      .map(
        (s) => `
      <article class="news-card tool-card community">
        <div class="news-meta">
          <span class="src">Shared by ${escapeHtml(s.author)}</span>
          <span class="topic-tag">${escapeHtml(s.topic || "general")}</span>
          <span>${escapeHtml(formatDate(s.createdAt))}</span>
        </div>
        <h2><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a></h2>
        ${s.note ? `<p class="news-sum">${escapeHtml(s.note)}</p>` : ""}
        <a class="btn btn-primary" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">Open link</a>
      </article>`
      )
      .join("");
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    $("tab-feeds").classList.toggle("hidden", tab !== "feeds");
    $("tab-community").classList.toggle("hidden", tab !== "community");
  }

  function openShare(prefill) {
    const saved = localStorage.getItem(AUTHOR_KEY) || "";
    $("s-name").value = saved;
    $("s-title").value = prefill?.title || "";
    $("s-url").value = prefill?.url || "";
    $("s-topic").value = prefill?.topic || "general";
    $("s-note").value = "";
    $("share-modal").classList.add("open");
    $("share-modal").setAttribute("aria-hidden", "false");
  }

  function closeShare() {
    $("share-modal").classList.remove("open");
    $("share-modal").setAttribute("aria-hidden", "true");
  }

  function bind() {
    renderTopicFilters();

    document.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => setTab(t.dataset.tab));
    });

    $("topic-filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-topic]");
      if (!b) return;
      state.topic = b.dataset.topic;
      renderTopicFilters();
      renderFeeds();
    });

    $("feed-search").addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      renderFeeds();
    });

    $("btn-refresh").addEventListener("click", () => loadFeeds());
    $("btn-share").addEventListener("click", () => openShare());
    $("btn-share-2").addEventListener("click", () => openShare());
    $("share-close").addEventListener("click", closeShare);
    $("share-modal").addEventListener("click", (e) => {
      if (e.target === $("share-modal")) closeShare();
    });

    $("feed-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-reshare]");
      if (!b) return;
      try {
        openShare(JSON.parse(b.getAttribute("data-reshare")));
      } catch {
        openShare();
      }
    });

    $("s-submit").addEventListener("click", async () => {
      const title = $("s-title").value.trim();
      const url = $("s-url").value.trim();
      const author = ($("s-name").value || "Anonymous").trim().slice(0, 40);
      if (!title || !url) return alert("Headline and link are required.");
      try {
        // basic URL check
        const u = new URL(url);
        if (!/^https?:$/.test(u.protocol)) throw new Error("Use http(s) links");
      } catch {
        return alert("Please enter a valid http(s) URL.");
      }
      localStorage.setItem(AUTHOR_KEY, author);
      await saveShare({
        id: uid(),
        title,
        url,
        topic: $("s-topic").value,
        note: $("s-note").value.trim(),
        author,
        createdAt: new Date().toISOString(),
      });
      closeShare();
      setTab("community");
    });

    $("btn-export-shares").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify({ entries: state.shares }, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `tech-news-shares-${Date.now()}.json`;
      a.click();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeShare();
    });
  }

  initClient();
  bind();
  loadFeeds();
  loadShares();
})();
