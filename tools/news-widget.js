(function () {
  const FEEDS = [
    { name: "The Verge", rss: "https://www.theverge.com/rss/index.xml" },
    { name: "Ars Technica", rss: "https://feeds.arstechnica.com/arstechnica/index" },
    { name: "BleepingComputer", rss: "https://www.bleepingcomputer.com/feed/" },
    { name: "The Hacker News", rss: "https://feeds.feedburner.com/TheHackersNews" },
    { name: "Hacker News", rss: "https://hnrss.org/frontpage" },
    { name: "CISA Alerts", rss: "https://www.cisa.gov/cybersecurity-advisories/all.xml" },
    { name: "Krebs on Security", rss: "https://krebsonsecurity.com/feed/" },
    { name: "Microsoft Security", rss: "https://www.microsoft.com/en-us/security/blog/feed/" },
  ];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function stripHtml(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
  }

  function timeAgo(dateStr) {
    const t = Date.parse(dateStr);
    if (!t) return "";
    const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.round(hours / 24);
    return days + "d ago";
  }

  async function fetchViaProxy(url) {
    const encoded = encodeURIComponent(url);
    const proxies = [
      `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`,
      `https://api.allorigins.win/raw?url=${encoded}`,
      `https://corsproxy.io/?${encoded}`,
    ];
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy, { cache: "no-store" });
        if (!res.ok) continue;
        const text = await res.text();
        if (text && text.length > 40) return text;
      } catch {
        /* try next */
      }
    }
    throw new Error("proxy failed");
  }

  function parseRssXml(xmlText, feed) {
    let xml = xmlText;
    const marks = ["<?xml", "<rss", "<feed"].map((m) => xmlText.indexOf(m)).filter((i) => i >= 0);
    if (marks.length) xml = xmlText.slice(Math.min(...marks));
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const items = [...doc.querySelectorAll("item, entry")].slice(0, 8);
    return items.map((item, i) => {
      const title = item.querySelector("title")?.textContent?.trim() || "Untitled";
      let link =
        item.querySelector("link")?.getAttribute("href") ||
        item.querySelector("link")?.textContent?.trim() ||
        item.querySelector("guid")?.textContent?.trim() ||
        "#";
      const date =
        item.querySelector("pubDate, published, updated")?.textContent || "";
      return {
        title,
        link,
        date,
        source: feed.name,
        ago: timeAgo(date),
        id: feed.name + ":" + i + ":" + title.slice(0, 40),
      };
    });
  }

  async function fetchRss(feed) {
    try {
      const encoded = encodeURIComponent(feed.rss);
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encoded}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.items)) {
          return data.items.slice(0, 8).map((it, i) => ({
            title: it.title || "Untitled",
            link: it.link || it.url || "#",
            date: it.pubDate || "",
            source: feed.name,
            ago: timeAgo(it.pubDate || ""),
            id: feed.name + ":" + i,
          }));
        }
      }
    } catch {
      /* fallback */
    }
    try {
      const text = await fetchViaProxy(feed.rss);
      return parseRssXml(text, feed);
    } catch {
      return [];
    }
  }

  async function loadHeadlines(limit) {
    const results = await Promise.all(FEEDS.map(fetchRss));
    const items = results
      .flat()
      .filter((it) => it.title && it.link && it.link !== "#")
      .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    const seen = new Set();
    const unique = [];
    for (const it of items) {
      const key = it.title.toLowerCase().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(it);
      if (unique.length >= (limit || 20)) break;
    }
    return unique;
  }

  function renderList(container, items) {
    if (!container) return;
    if (!items.length) {
      container.innerHTML =
        '<p class="news-empty">Could not load headlines right now. Pull to refresh or try again in a minute.</p>';
      return;
    }
    container.innerHTML = items
      .map(
        (it) => `
      <a class="news-item" href="${escapeHtml(it.link)}" target="_blank" rel="noopener">
        <span class="news-item-title">${escapeHtml(it.title)}</span>
        <span class="news-item-meta">${escapeHtml(it.source)}${it.ago ? " · " + escapeHtml(it.ago) : ""}</span>
      </a>`
      )
      .join("");
  }

  window.GetNowNews = {
    loadHeadlines,
    renderList,
    escapeHtml,
    timeAgo,
  };
})();
