(function () {
  const CHANNELS = [
    { id: "general", name: "general", desc: "Say hi & share anything IT" },
    { id: "networking", name: "networking", desc: "Subnets, VLANs, Wi‑Fi" },
    { id: "security", name: "security", desc: "Blue team, news, labs" },
    { id: "homelab", name: "homelab", desc: "VMs, diagrams, builds" },
    { id: "certs", name: "certs", desc: "A+, Net+, Sec+, study tips" },
    { id: "helpdesk", name: "helpdesk", desc: "Tickets & soft skills" },
    { id: "offtopic", name: "offtopic", desc: "Water cooler" },
  ];

  const AUTHOR_KEY = "it_chat_author";
  const OWNER_KEY = "it_vault_owner_key";
  const MAX_HISTORY = 80;
  const MIN_SEND_GAP_MS = 800;

  const state = {
    client: null,
    live: false,
    room: "general",
    author: "",
    authorKey: "",
    channel: null,
    messages: [],
    lastSend: 0,
    joined: false,
  };

  const $ = (id) => document.getElementById(id);

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function linkify(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  function uid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : "u-" + Math.random().toString(36).slice(2) + Date.now();
  }

  function getOwnerKey() {
    let k = localStorage.getItem(OWNER_KEY);
    if (!k) {
      k = uid();
      localStorage.setItem(OWNER_KEY, k);
    }
    return k;
  }

  function liveSettings() {
    try {
      const local = JSON.parse(localStorage.getItem("it_vault_supabase") || "null");
      if (local?.url && local?.anon) return local;
    } catch {
      /* ignore */
    }
    const c = window.IT_REPO_CONFIG || {};
    if (c.supabaseUrl && c.supabaseAnonKey) {
      return { url: c.supabaseUrl, anon: c.supabaseAnonKey };
    }
    return null;
  }

  function saveLiveSettings(url, anon) {
    localStorage.setItem(
      "it_vault_supabase",
      JSON.stringify({ url: String(url || "").trim(), anon: String(anon || "").trim() })
    );
  }

  function initClient() {
    const live = liveSettings();
    if (!live || !window.supabase?.createClient) {
      state.client = null;
      state.live = false;
      return false;
    }
    try {
      state.client = window.supabase.createClient(live.url, live.anon);
      state.live = true;
      return true;
    } catch {
      state.client = null;
      state.live = false;
      return false;
    }
  }

  async function testLiveConnection() {
    const live = liveSettings();
    if (!live?.url || !live?.anon) throw new Error("Save URL and anon key first");
    if (!window.supabase?.createClient) throw new Error("Supabase library not loaded (check network)");
    const client = window.supabase.createClient(live.url, live.anon);
    const { error } = await client.from("chat_messages").select("id").limit(1);
    if (error) {
      if (/relation .* does not exist/i.test(error.message) || error.code === "42P01") {
        throw new Error("Connected, but chat_messages table missing — run supabase-schema.sql");
      }
      throw new Error(error.message);
    }
    return true;
  }

  function openLiveModal() {
    const live = liveSettings();
    if ($("live-url")) $("live-url").value = live?.url || "";
    if ($("live-anon")) $("live-anon").value = live?.anon || "";
    if ($("live-status")) {
      $("live-status").textContent = live
        ? "Keys found in this browser. Click Test, then Save if needed."
        : "Not configured yet.";
    }
    const modal = $("live-modal");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closeLiveModal() {
    const modal = $("live-modal");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function setConn(text, ok) {
    const el = $("conn-status");
    el.textContent = text;
    el.className = "chat-status " + (ok ? "ok" : "bad");
  }

  function normalizeRoom(r) {
    return String(r || "general")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 24) || "general";
  }

  function renderChannels() {
    $("channel-list").innerHTML = CHANNELS.map(
      (c) => `
      <button type="button" class="channel-btn ${state.room === c.id ? "active" : ""}" data-room="${c.id}">
        <strong># ${escapeHtml(c.name)}</strong>
        <span>${escapeHtml(c.desc)}</span>
      </button>`
    ).join("");
  }

  function renderMessages() {
    const box = $("messages");
    if (!state.messages.length) {
      box.innerHTML = `<div class="chat-empty">No messages yet — say hello and start collaborating.</div>`;
      return;
    }
    box.innerHTML = state.messages
      .map((m) => {
        const mine = m.author_key === state.authorKey || m.authorKey === state.authorKey;
        const name = m.author || "Anonymous";
        const body = m.body || "";
        const when = m.created_at || m.createdAt || "";
        const time = when ? new Date(when).toLocaleTimeString() : "";
        return `
        <div class="msg ${mine ? "mine" : ""}">
          <div class="msg-head">
            <span class="msg-author">${escapeHtml(name)}</span>
            <span class="msg-time">${escapeHtml(time)}</span>
          </div>
          <div class="msg-body">${linkify(body)}</div>
        </div>`;
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  }

  async function loadHistory() {
    if (!state.client) return;
    const { data, error } = await state.client
      .from("chat_messages")
      .select("*")
      .eq("room", state.room)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY);
    if (error) {
      if (/relation .* does not exist/i.test(error.message) || error.code === "42P01") {
        setConn("Run SQL: create chat_messages table", false);
        $("messages").innerHTML = `<div class="chat-empty">Table missing. In Supabase SQL Editor, re-run vault/supabase-schema.sql (includes chat_messages + realtime).</div>`;
        return;
      }
      setConn("Error: " + error.message, false);
      return;
    }
    state.messages = (data || []).reverse();
    renderMessages();
    setConn("Live · #" + state.room, true);
  }

  async function unsubscribe() {
    if (state.channel && state.client) {
      await state.client.removeChannel(state.channel);
      state.channel = null;
    }
  }

  async function subscribe() {
    if (!state.client) return;
    await unsubscribe();
    state.channel = state.client
      .channel("chat:" + state.room)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room=eq.${state.room}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          if (state.messages.some((m) => m.id === row.id)) return;
          state.messages.push(row);
          if (state.messages.length > MAX_HISTORY) {
            state.messages = state.messages.slice(-MAX_HISTORY);
          }
          renderMessages();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConn("Live · #" + state.room, true);
        } else if (status === "CHANNEL_ERROR") {
          setConn("Realtime error — check Supabase Realtime is on", false);
        }
      });
  }

  async function switchRoom(room) {
    state.room = normalizeRoom(room);
    $("room-name").textContent = "# " + state.room;
    renderChannels();
    state.messages = [];
    renderMessages();
    if (!state.live || !state.joined) return;
    setConn("Loading #" + state.room + "…", true);
    await loadHistory();
    await subscribe();
  }

  async function sendMessage(text) {
    if (!state.joined || !state.client) return;
    const body = text.trim().slice(0, 1000);
    if (!body) return;
    const now = Date.now();
    if (now - state.lastSend < MIN_SEND_GAP_MS) return;
    state.lastSend = now;

    const row = {
      room: state.room,
      author: state.author,
      author_key: state.authorKey,
      body,
    };
    const { error } = await state.client.from("chat_messages").insert(row);
    if (error) {
      alert("Send failed: " + error.message);
    }
    // Realtime will append; if realtime lag, optimistic optional — skip to avoid dupes
  }

  function enableComposer(on) {
    $("message-input").disabled = !on;
    $("btn-send").disabled = !on;
  }

  function updateUiForLive() {
    const offline = $("offline-banner");
    if (state.live) {
      offline.classList.add("hidden");
      setConn("Ready — enter a display name", true);
    } else {
      offline.classList.remove("hidden");
      setConn("Offline — enable Live sync", false);
      enableComposer(false);
    }
  }

  function joinAs(name) {
    name = String(name || "").trim().slice(0, 32);
    if (name.length < 2) {
      alert("Pick a display name (at least 2 characters).");
      return;
    }
    state.author = name;
    state.authorKey = getOwnerKey();
    state.joined = true;
    localStorage.setItem(AUTHOR_KEY, name);
    enableComposer(true);
    $("name-bar").classList.add("joined");
    $("message-input").focus();
    switchRoom(state.room);
  }

  function bind() {
    const saved = localStorage.getItem(AUTHOR_KEY) || "";
    if (saved) $("display-name").value = saved;

    $("btn-set-name").addEventListener("click", () => joinAs($("display-name").value));
    $("display-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        joinAs($("display-name").value);
      }
    });

    $("channel-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-room]");
      if (!b) return;
      switchRoom(b.dataset.room);
    });

    $("btn-join-custom").addEventListener("click", () => {
      const r = normalizeRoom($("custom-room").value);
      if (r.length < 2) return alert("Room code too short");
      $("custom-room").value = r;
      switchRoom(r);
    });

    $("composer").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("message-input");
      const text = input.value;
      input.value = "";
      sendMessage(text);
    });

    const openSetup = () => openLiveModal();
    if ($("btn-live-setup")) $("btn-live-setup").addEventListener("click", openSetup);
    if ($("btn-live-setup-2")) $("btn-live-setup-2").addEventListener("click", openSetup);
    if ($("live-close")) $("live-close").addEventListener("click", closeLiveModal);
    if ($("live-modal")) {
      $("live-modal").addEventListener("click", (e) => {
        if (e.target === $("live-modal")) closeLiveModal();
      });
    }
    if ($("live-save")) {
      $("live-save").addEventListener("click", async () => {
        const url = $("live-url").value.trim();
        const anon = $("live-anon").value.trim();
        if (!url || !anon) {
          $("live-status").textContent = "Both URL and anon key are required.";
          return;
        }
        saveLiveSettings(url, anon);
        const ok = initClient();
        updateUiForLive();
        if (!ok) {
          $("live-status").textContent = "Saved, but client did not start. Check keys and reload.";
          return;
        }
        try {
          await testLiveConnection();
          $("live-status").textContent = "Live Sync ON. Close this and click Join chat.";
          setConn("Ready — enter a display name", true);
        } catch (e) {
          $("live-status").textContent = "Saved, but test failed: " + e.message;
        }
      });
    }
    if ($("live-test")) {
      $("live-test").addEventListener("click", async () => {
        const url = $("live-url").value.trim();
        const anon = $("live-anon").value.trim();
        if (url && anon) saveLiveSettings(url, anon);
        $("live-status").textContent = "Testing…";
        try {
          await testLiveConnection();
          initClient();
          updateUiForLive();
          $("live-status").textContent = "Success — chat_messages is reachable. You can join chat.";
        } catch (e) {
          $("live-status").textContent = "Test failed: " + e.message;
        }
      });
    }
  }

  // boot
  const ok = initClient();
  bind();
  renderChannels();
  updateUiForLive();
  $("room-name").textContent = "# " + state.room;
  if (!ok) {
    $("messages").innerHTML = `<div class="chat-empty">Enable Live sync to start real-time chat with others on the site.</div>`;
  } else {
    $("messages").innerHTML = `<div class="chat-empty">Enter a display name above, then pick a channel.</div>`;
  }
})();
