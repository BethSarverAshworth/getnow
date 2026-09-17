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

  /** Built-in public RSS feeds */
  const DEFAULT_FEEDS = [
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
  const LOCAL_CUSTOM_FEEDS = "it_tech_news_custom_feeds_v1";
  const AUTHOR_KEY = "it_news_author";

  const state = {
    topic: "all",
    query: "",
    items: [],
    shares: [],
    customFeeds: [],
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
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "n-" + Date.now() + Math.random().toString(36).slice(2);
  }

  function isDeadSupabaseHost(url) {
    try {
      return new URL(url).hostname === "ldvfjtqotlzuygcwgtai.supabase.co";
    } catch {
      return false;
    }
  }

  function liveSettings() {
    try {
      const local = JSON.parse(localStorage.getItem("it_vault_supabase") || "null");
      if (local?.url && local?.anon) {
        if (isDeadSupabaseHost(local.url)) {
          localStorage.removeItem("it_vault_supabase");
        } else {
          return local;
        }
      }
    } catch {
      /* ignore */
    }
    const c = window.IT_REPO_CONFIG || {};
    if (c.supabaseUrl && c.supabaseAnonKey && !isDeadSupabaseHost(c.supabaseUrl)) {
      return { url: c.supabaseUrl, anon: c.supabaseAnonKey };
    }
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

  function loadCustomFeeds() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_CUSTOM_FEEDS) || "[]");
      state.customFeeds = Array.isArray(raw) ? raw : [];
    } catch {
      state.customFeeds = [];
    }
  }

  function saveCustomFeeds() {
    localStorage.setItem(LOCAL_CUSTOM_FEEDS, JSON.stringify(state.customFeeds));
  }

  function allFeeds() {
    return [...DEFAULT_FEEDS, ...state.customFeeds];
  }

  function normalizeFeedUrl(url) {
    let u = String(url || "").trim();
    if (!u) throw new Error("Feed URL required");
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("Use http(s) URL");
    return parsed.toString();
  }

  async function fetchViaProxy(url) {
    const encoded = encodeURIComponent(url);
    const proxies = [
      // r.jina.ai is a readable proxy that often works for RSS/XML
      `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`,
      `https://api.allorigins.win/raw?url=${encoded}`,
      `https://corsproxy.io/?${encoded}`,
    ];
    let lastErr = null;
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        if (!text || text.length < 40) throw new Error("Empty response");
        return text;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("All proxies failed");
  }

  async function fetchRss(feed) {
    // Try rss2json without count (count requires API key now)
    try {
      const encoded = encodeURIComponent(feed.rss);
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encoded}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.items)) {
          return data.items.slice(0, 12).map((it) => ({
            id: feed.id + ":" + (it.guid || it.link || it.title),
            title: it.title || "Untitled",
            link: it.link || it.url || "#",
            date: it.pubDate || it.published || "",
            source: feed.name,
            topic: feed.topic,
            summary: stripHtml(it.description || it.content || "").slice(0, 220),
            custom: !!feed.custom,
          }));
        }
      }
    } catch {
      /* fallback */
    }

    try {
      const text = await fetchViaProxy(feed.rss);
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
    // jina proxy may wrap content; try to extract XML
    let xml = xmlText;
    const xmlStart = xmlText.indexOf("<?xml");
    const rssStart = xmlText.indexOf("<rss");
    const feedStart = xmlText.indexOf("<feed");
    const start = Math.min(
      ...[xmlStart, rssStart, feedStart].filter((i) => i >= 0)
    );
    if (Number.isFinite(start) && start >= 0) {
      xml = xmlText.slice(start);
    }

    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      // try regex fallback for titles/links
      return parseRssRegex(xmlText, feed);
    }
    const items = [...doc.querySelectorAll("item, entry")].slice(0, 12);
    if (!items.length) return parseRssRegex(xmlText, feed);

    return items.map((item, i) => {
      const title =
        item.querySelector("title")?.textContent?.trim() || "Untitled";
      let link =
        item.querySelector("link")?.getAttribute("href") ||
        item.querySelector("link")?.textContent?.trim() ||
        item.querySelector("id")?.textContent?.trim() ||
        "#";
      // some feeds put url in enclosure
      if (!link || link === "#") {
        link =
          item.querySelector("guid")?.textContent?.trim() ||
          item.querySelector("id")?.textContent?.trim() ||
          "#";
      }
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
        custom: !!feed.custom,
      };
    });
  }

  function parseRssRegex(text, feed) {
    const items = [];
    const blocks = text.split(/<item[\s>]/i).slice(1);
    const entryBlocks = blocks.length
      ? blocks
      : text.split(/<entry[\s>]/i).slice(1);
    for (const block of entryBlocks.slice(0, 12)) {
      const title =
        (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ||
          [])[1] || "Untitled";
      const link =
        (block.match(/<link[^>]*href=["']([^"']+)["']/i) ||
          block.match(/<link[^>]*>([^<]+)<\/link>/i) ||
          [])[1] || "#";
      const date =
        (block.match(/<pubDate[^>]*>([^<]+)/i) ||
          block.match(/<published[^>]*>([^<]+)/i) ||
          [])[1] || "";
      items.push({
        id: feed.id + ":" + items.length + ":" + stripHtml(title).slice(0, 40),
        title: stripHtml(title),
        link: link.trim(),
        date: date.trim(),
        source: feed.name,
        topic: feed.topic,
        summary: "",
        custom: !!feed.custom,
      });
    }
    return items;
  }

  async function loadFeeds() {
    $("feed-status").textContent = "Fetching latest headlines…";
    $("feed-list").innerHTML = `<div class="empty-news">Loading tech news…</div>`;

    const feeds = allFeeds();
    const results = await Promise.all(feeds.map((f) => fetchRss(f)));
    state.items = results.flat().sort((a, b) => {
      const da = Date.parse(a.date) || 0;
      const db = Date.parse(b.date) || 0;
      return db - da;
    });

    const sourcesOk = results.filter((r) => r.length).length;
    $("feed-status").textContent = state.items.length
      ? `${state.items.length} headlines · ${sourcesOk}/${feeds.length} sources loaded · ${state.customFeeds.length} custom feed(s) · ${new Date().toLocaleTimeString()}`
      : "Could not load feeds (network/proxy). Try Refresh, add a different RSS URL, or use Community shares.";
    renderCustomFeedList();
    renderFeeds();
  }

  function filteredFeeds() {
    return state.items.filter((it) => {
      if (state.topic !== "all" && it.topic !== state.topic) return false;
      if (!state.query) return true;
      const q = state.query.toLowerCase();
      return [it.title, it.summary, it.source, it.topic]
        .join(" ")
        .toLowerCase()
        .includes(q);
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

  function renderCustomFeedList() {
    const el = $("custom-feed-list");
    if (!el) return;
    if (!state.customFeeds.length) {
      el.innerHTML = `<p class="tiny muted">No custom feeds yet. Paste an RSS URL below (example: https://hnrss.org/frontpage).</p>`;
      return;
    }
    el.innerHTML = state.customFeeds
      .map(
        (f) => `
      <div class="custom-feed-row">
        <div>
          <strong>${escapeHtml(f.name)}</strong>
          <div class="tiny muted">${escapeHtml(f.rss)}</div>
        </div>
        <button type="button" class="btn btn-ghost" data-remove-feed="${escapeHtml(f.id)}">Remove</button>
      </div>`
      )
      .join("");
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
      $("feed-list").innerHTML = `<div class="empty-news tool-card">No headlines match this filter. Try All topics, clear search, or add a custom RSS feed above.</div>`;
      return;
    }
    $("feed-list").innerHTML = list
      .map((it) => {
        const payload = encodeURIComponent(
          JSON.stringify({ title: it.title, url: it.link, topic: it.topic })
        );
        return `
      <article class="news-card tool-card">
        <div class="news-meta">
          <span class="src">${escapeHtml(it.source)}${it.custom ? " · custom" : ""}</span>
          <span class="topic-tag">${escapeHtml(it.topic)}</span>
          <span>${escapeHtml(formatDate(it.date))}</span>
        </div>
        <h2><a href="${escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.title)}</a></h2>
        ${it.summary ? `<p class="news-sum">${escapeHtml(it.summary)}</p>` : ""}
        <div class="row">
          <a class="btn btn-primary" href="${escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer">Read article</a>
          <button type="button" class="btn btn-ghost" data-reshare="${payload}">Share to board</button>
        </div>
      </article>`;
      })
      .join("");
  }

  // ----- Community shares -----
  async function loadShares() {
    if (state.mode === "live" && state.client) {
      try {
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
      } catch (e) {
        console.warn("News live board unavailable:", e);
        state.mode = "local";
        state.client = null;
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
      try {
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
          return true;
        }
        console.warn("Live share failed, saving locally:", error);
      } catch (e) {
        console.warn("Live share failed, saving locally:", e);
        state.mode = "local";
        state.client = null;
      }
    }
    state.shares.unshift(share);
    localStorage.setItem(LOCAL_SHARES, JSON.stringify(state.shares));
    renderCommunity();
    return true;
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
    $("share-status").textContent = "";
    $("share-modal").classList.add("open");
    $("share-modal").setAttribute("aria-hidden", "false");
    $("s-title").focus();
  }

  function closeShare() {
    $("share-modal").classList.remove("open");
    $("share-modal").setAttribute("aria-hidden", "true");
  }

  function openFeedModal() {
    $("f-name").value = "";
    $("f-url").value = "";
    $("f-topic").value = "general";
    $("feed-add-status").textContent = "";
    $("feed-modal").classList.add("open");
    $("feed-modal").setAttribute("aria-hidden", "false");
    $("f-url").focus();
  }

  function closeFeedModal() {
    $("feed-modal").classList.remove("open");
    $("feed-modal").setAttribute("aria-hidden", "true");
  }

  async function addCustomFeed() {
    const status = $("feed-add-status");
    status.textContent = "Checking feed…";
    status.className = "tiny muted";
    try {
      const name = ($("f-name").value || "").trim() || "Custom feed";
      const rss = normalizeFeedUrl($("f-url").value);
      const topic = $("f-topic").value || "general";
      const id = "custom-" + uid().slice(0, 8);

      // Validate by actually fetching
      const testFeed = { id, name, topic, rss, custom: true };
      const items = await fetchRss(testFeed);
      if (!items.length) {
        throw new Error(
          "Could not read headlines from that URL. Make sure it is an RSS/Atom feed (not a normal webpage)."
        );
      }

      // avoid duplicates
      if (
        state.customFeeds.some(
          (f) => f.rss.replace(/\/$/, "") === rss.replace(/\/$/, "")
        )
      ) {
        throw new Error("That feed is already added.");
      }

      state.customFeeds.push(testFeed);
      saveCustomFeeds();
      closeFeedModal();
      status.textContent = "";
      await loadFeeds();
      alert(`Added “${name}” — loaded ${items.length} headline(s).`);
    } catch (err) {
      status.textContent = "Error: " + err.message;
      status.className = "tiny err-text";
    }
  }

  function bind() {
    renderTopicFilters();
    loadCustomFeeds();
    renderCustomFeedList();

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
    $("btn-add-feed").addEventListener("click", () => openFeedModal());
    $("share-close").addEventListener("click", closeShare);
    $("feed-close").addEventListener("click", closeFeedModal);
    $("share-modal").addEventListener("click", (e) => {
      if (e.target === $("share-modal")) closeShare();
    });
    $("feed-modal").addEventListener("click", (e) => {
      if (e.target === $("feed-modal")) closeFeedModal();
    });

    $("custom-feed-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove-feed]");
      if (!b) return;
      const id = b.getAttribute("data-remove-feed");
      state.customFeeds = state.customFeeds.filter((f) => f.id !== id);
      saveCustomFeeds();
      loadFeeds();
    });

    $("feed-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-reshare]");
      if (!b) return;
      try {
        openShare(JSON.parse(decodeURIComponent(b.getAttribute("data-reshare"))));
      } catch {
        openShare();
      }
    });

    $("f-submit").addEventListener("click", () => addCustomFeed());

    $("s-submit").addEventListener("click", async () => {
      const title = $("s-title").value.trim();
      let url = $("s-url").value.trim();
      const author = ($("s-name").value || "Anonymous").trim().slice(0, 40);
      const status = $("share-status");
      status.textContent = "";
      if (!title || !url) {
        status.textContent = "Headline and link are required.";
        status.className = "tiny err-text";
        return;
      }
      try {
        if (!/^https?:\/\//i.test(url)) url = "https://" + url;
        const u = new URL(url);
        if (!/^https?:$/.test(u.protocol)) throw new Error("Use http(s) links");
        url = u.toString();
      } catch {
        status.textContent = "Please enter a valid link (include https://).";
        status.className = "tiny err-text";
        return;
      }
      localStorage.setItem(AUTHOR_KEY, author);
      status.textContent = "Posting…";
      status.className = "tiny muted";
      try {
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
      } catch (err) {
        status.textContent = "Could not post: " + err.message;
        status.className = "tiny err-text";
      }
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
      if (e.key === "Escape") {
        closeShare();
        closeFeedModal();
      }
    });
  }

  initClient();
  bind();
  loadFeeds();
  loadShares();
})();
