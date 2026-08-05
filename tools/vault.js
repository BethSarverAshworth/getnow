(function () {
  const FOLDERS = [
    { id: "all", name: "All", icon: "📁" },
    { id: "scripts", name: "Scripts", icon: "⚙️" },
    { id: "ideas", name: "Ideas", icon: "💡" },
    { id: "notes", name: "Notes", icon: "📝" },
    { id: "architecture", name: "Architecture", icon: "🗺️" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "hardware", name: "Hardware", icon: "🔧" },
  ];

  const state = {
    mode: "local",
    client: null,
    room: null,
    invite: null,
    ownerKey: null,
    ownerName: "Anonymous",
    folder: "all",
    query: "",
    personal: [],
    staging: [],
    dismissals: new Set(),
    editingId: null,
    viewingProposal: null,
    tab: "mine",
  };

  const $ = (id) => document.getElementById(id);

  function cfg() {
    return window.IT_REPO_CONFIG || {};
  }

  function liveSettings() {
    try {
      const local = JSON.parse(localStorage.getItem("it_vault_supabase") || "null");
      if (local && local.url && local.anon) return local;
    } catch {
      /* ignore */
    }
    const c = cfg();
    if (c.supabaseUrl && c.supabaseAnonKey) {
      return { url: c.supabaseUrl, anon: c.supabaseAnonKey };
    }
    return null;
  }

  function saveLiveSettings(url, anon) {
    localStorage.setItem(
      "it_vault_supabase",
      JSON.stringify({ url: url.trim(), anon: anon.trim() })
    );
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now();
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function normalizeRoom(c) {
    return String(c || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);
  }

  function randomToken(len) {
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => a[b % a.length]).join("");
  }

  function randomRoom() {
    return randomToken(6).toUpperCase().replace(/[0OIL]/gi, "X").slice(0, 6);
  }

  function getOwnerKey() {
    let k = localStorage.getItem("it_vault_owner_key");
    if (!k) {
      k = uid();
      localStorage.setItem("it_vault_owner_key", k);
    }
    return k;
  }

  function localStoreKey(room) {
    return "it_vault_v2_" + room;
  }

  function readLocalRoom(room) {
    try {
      const raw = localStorage.getItem(localStoreKey(room));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeLocalRoom(room, data) {
    localStorage.setItem(localStoreKey(room), JSON.stringify(data));
  }

  function initClient() {
    const live = liveSettings();
    if (live?.url && live?.anon && window.supabase?.createClient) {
      try {
        state.client = window.supabase.createClient(live.url, live.anon);
        state.mode = "live";
        return true;
      } catch {
        state.client = null;
        state.mode = "local";
        return false;
      }
    }
    state.client = null;
    state.mode = "local";
    return false;
  }

  async function testLiveConnection() {
    const live = liveSettings();
    if (!live?.url || !live?.anon) throw new Error("Save URL and anon key first");
    if (!window.supabase?.createClient) throw new Error("Supabase library not loaded");
    const client = window.supabase.createClient(live.url, live.anon);
    const { error } = await client.from("vault_rooms").select("room_code").limit(1);
    if (error) {
      if (/relation .* does not exist/i.test(error.message) || error.code === "42P01") {
        throw new Error("Connected, but tables missing — run vault/supabase-schema.sql in SQL Editor");
      }
      throw new Error(error.message);
    }
    return true;
  }

  function updateModeBanner() {
    const live = state.mode === "live";
    $("mode-banner").innerHTML = live
      ? `<span class="mode-live">Live multi-party storage (Supabase)</span>`
      : `<span class="mode-local">Local protected mode</span> — invite link still required on this device; use Export or enable Supabase for other computers.`;
    if ($("conn-status")) {
      $("conn-status").textContent = live ? "Live shared storage" : "Local browser storage";
      $("conn-status").className = "tiny " + (live ? "mode-live" : "mode-local");
    }
  }

  // ---------- Room / invite ----------
  async function createRoom(roomName, ownerName) {
    const room = normalizeRoom(roomName) || randomRoom();
    const invite = randomToken(40);
    if (state.mode === "live" && state.client) {
      const { error } = await state.client.from("vault_rooms").insert({
        room_code: room,
        invite_token: invite,
        title: room,
      });
      if (error) throw error;
    } else {
      writeLocalRoom(room, {
        room,
        invite,
        personal: [],
        staging: [],
        dismissals: {},
      });
    }
    return { room, invite, ownerName };
  }

  async function validateInvite(room, invite) {
    room = normalizeRoom(room);
    invite = String(invite || "").trim();
    if (!room || invite.length < 16) return false;

    if (state.mode === "live" && state.client) {
      const { data, error } = await state.client
        .from("vault_rooms")
        .select("room_code, invite_token")
        .eq("room_code", room)
        .eq("invite_token", invite)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    }
    const pack = readLocalRoom(room);
    return !!(pack && pack.invite === invite);
  }

  // ---------- Load data ----------
  async function loadAll() {
    if (state.mode === "live" && state.client) {
      const [pers, stag, dis] = await Promise.all([
        state.client
          .from("vault_personal")
          .select("*")
          .eq("room_code", state.room)
          .eq("owner_key", state.ownerKey)
          .order("updated_at", { ascending: false }),
        state.client
          .from("vault_staging")
          .select("*")
          .eq("room_code", state.room)
          .order("created_at", { ascending: false }),
        state.client
          .from("vault_dismissals")
          .select("staging_id")
          .eq("room_code", state.room)
          .eq("owner_key", state.ownerKey),
      ]);
      if (pers.error) throw pers.error;
      if (stag.error) throw stag.error;
      if (dis.error) throw dis.error;
      state.personal = (pers.data || []).map(mapPersonal);
      state.staging = (stag.data || []).map(mapStaging);
      state.dismissals = new Set((dis.data || []).map((d) => d.staging_id));
      return;
    }

    const pack = readLocalRoom(state.room);
    if (!pack || pack.invite !== state.invite) throw new Error("Invalid local room/invite");
    state.personal = (pack.personal || []).filter((p) => p.ownerKey === state.ownerKey);
    // In local mode, staging is shared in the same room pack — multi-device needs export/import of full pack
    // Load staging from pack; personal for other owners stays in pack but we only show ours
    state.staging = pack.staging || [];
    const dis = (pack.dismissals && pack.dismissals[state.ownerKey]) || [];
    state.dismissals = new Set(dis);
  }

  function mapPersonal(row) {
    return {
      id: row.id,
      ownerKey: row.owner_key || row.ownerKey,
      ownerName: row.owner_name || row.ownerName,
      folder: row.folder,
      title: row.title,
      content: row.content,
      status: row.status || "draft",
      tags: row.tags || "",
      sourceStagingId: row.source_staging_id || row.sourceStagingId,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    };
  }

  function mapStaging(row) {
    return {
      id: row.id,
      authorKey: row.author_key || row.authorKey,
      authorName: row.author_name || row.authorName,
      folder: row.folder,
      title: row.title,
      content: row.content,
      tags: row.tags || "",
      note: row.note || "",
      createdAt: row.created_at || row.createdAt,
    };
  }

  async function savePersonal(item) {
    const now = new Date().toISOString();
    if (state.mode === "live" && state.client) {
      const row = {
        id: item.id,
        room_code: state.room,
        owner_key: state.ownerKey,
        owner_name: state.ownerName,
        folder: item.folder,
        title: item.title,
        content: item.content,
        status: item.status,
        tags: item.tags || "",
        source_staging_id: item.sourceStagingId || null,
        updated_at: now,
      };
      if (!item.createdAt) row.created_at = now;
      const { error } = await state.client.from("vault_personal").upsert(row);
      if (error) throw error;
      return;
    }
    const pack = readLocalRoom(state.room);
    pack.personal = pack.personal || [];
    // remove only this owner's version of id; keep others' files intact
    pack.personal = pack.personal.filter(
      (p) => !(p.id === item.id && p.ownerKey === state.ownerKey)
    );
    pack.personal.unshift({
      ...item,
      ownerKey: state.ownerKey,
      ownerName: state.ownerName,
      updatedAt: now,
      createdAt: item.createdAt || now,
    });
    writeLocalRoom(state.room, pack);
  }

  async function deletePersonal(id) {
    const item = state.personal.find((p) => p.id === id);
    if (!item || item.ownerKey !== state.ownerKey) throw new Error("You can only delete your own files");
    if (state.mode === "live" && state.client) {
      const { error } = await state.client
        .from("vault_personal")
        .delete()
        .eq("id", id)
        .eq("owner_key", state.ownerKey);
      if (error) throw error;
      return;
    }
    const pack = readLocalRoom(state.room);
    pack.personal = (pack.personal || []).filter(
      (p) => !(p.id === id && p.ownerKey === state.ownerKey)
    );
    writeLocalRoom(state.room, pack);
  }

  async function submitStaging(proposal) {
    const now = new Date().toISOString();
    if (state.mode === "live" && state.client) {
      const row = {
        id: proposal.id || uid(),
        room_code: state.room,
        author_key: state.ownerKey,
        author_name: state.ownerName,
        folder: proposal.folder,
        title: proposal.title,
        content: proposal.content,
        tags: proposal.tags || "",
        note: proposal.note || "",
        created_at: now,
      };
      const { error } = await state.client.from("vault_staging").insert(row);
      if (error) throw error;
      return;
    }
    const pack = readLocalRoom(state.room);
    pack.staging = pack.staging || [];
    pack.staging.unshift({
      id: proposal.id || uid(),
      authorKey: state.ownerKey,
      authorName: state.ownerName,
      folder: proposal.folder,
      title: proposal.title,
      content: proposal.content,
      tags: proposal.tags || "",
      note: proposal.note || "",
      createdAt: now,
    });
    writeLocalRoom(state.room, pack);
  }

  async function dismissProposal(stagingId) {
    if (state.mode === "live" && state.client) {
      const { error } = await state.client.from("vault_dismissals").upsert({
        room_code: state.room,
        owner_key: state.ownerKey,
        staging_id: stagingId,
      });
      if (error) throw error;
      return;
    }
    const pack = readLocalRoom(state.room);
    pack.dismissals = pack.dismissals || {};
    pack.dismissals[state.ownerKey] = pack.dismissals[state.ownerKey] || [];
    if (!pack.dismissals[state.ownerKey].includes(stagingId)) {
      pack.dismissals[state.ownerKey].push(stagingId);
    }
    writeLocalRoom(state.room, pack);
  }

  async function acceptProposal(proposal, title, status) {
    // Always NEW personal file — never overwrites completed work
    const item = {
      id: uid(),
      folder: proposal.folder || "ideas",
      title: title || `${proposal.title} (accepted)`,
      content: proposal.content || "",
      status: status || "draft",
      tags: proposal.tags || "",
      sourceStagingId: proposal.id,
    };
    await savePersonal(item);
  }

  // ---------- GitHub ----------
  function ghSettings() {
    try {
      return JSON.parse(localStorage.getItem("it_vault_github") || "{}");
    } catch {
      return {};
    }
  }

  function saveGhSettings(s) {
    localStorage.setItem("it_vault_github", JSON.stringify(s));
  }

  function slugFile(title) {
    return (
      String(title || "file")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "file"
    );
  }

  async function pushToGitHub(item) {
    const s = ghSettings();
    if (!s.token || !s.owner || !s.repo) {
      openModal("gh-modal");
      $("gh-status").textContent = "Save GitHub owner/repo/token first.";
      throw new Error("GitHub not configured");
    }
    const prefix = (s.prefix || "vault/").replace(/^\/+/, "");
    const path = `${prefix}${item.folder || "notes"}/${slugFile(item.title)}.md`;
    const body = `---\ntitle: ${item.title}\nstatus: ${item.status}\nauthor: ${state.ownerName}\ntags: ${item.tags || ""}\n---\n\n${item.content || ""}\n`;
    const api = `https://api.github.com/repos/${s.owner}/${s.repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${s.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };
    // get existing sha if any
    let sha;
    const getRes = await fetch(`${api}?ref=${encodeURIComponent(s.branch || "main")}`, { headers });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
    const putRes = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `vault: ${item.title}`,
        content: btoa(unescape(encodeURIComponent(body))),
        branch: s.branch || "main",
        sha,
      }),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error("GitHub API: " + err);
    }
    const data = await putRes.json();
    return data.content?.html_url || data.commit?.html_url || path;
  }

  // ---------- UI ----------
  function openModal(id) {
    $(id).classList.add("open");
    $(id).setAttribute("aria-hidden", "false");
  }
  function closeModal(id) {
    $(id).classList.remove("open");
    $(id).setAttribute("aria-hidden", "true");
  }

  function inviteUrl() {
    const u = new URL(window.location.href);
    u.search = "";
    u.searchParams.set("room", state.room);
    u.searchParams.set("invite", state.invite);
    return u.toString();
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tab);
    });
    $("tab-mine").classList.toggle("hidden", tab !== "mine");
    $("tab-box").classList.toggle("hidden", tab !== "box");
    $("tab-help").classList.toggle("hidden", tab !== "help");
  }

  function renderFolders() {
    const counts = { all: state.personal.length };
    FOLDERS.forEach((f) => {
      if (f.id !== "all") counts[f.id] = state.personal.filter((p) => p.folder === f.id).length;
    });
    $("folder-list").innerHTML = FOLDERS.map(
      (f) => `
      <button type="button" class="folder-btn ${state.folder === f.id ? "active" : ""}" data-folder="${f.id}">
        ${f.icon} ${escapeHtml(f.name)} <span class="count">${counts[f.id] || 0}</span>
      </button>`
    ).join("");
  }

  function filteredMine() {
    return state.personal.filter((item) => {
      if (state.folder !== "all" && item.folder !== state.folder) return false;
      if (!state.query) return true;
      const q = state.query.toLowerCase();
      return [item.title, item.content, item.tags, item.status].join(" ").toLowerCase().includes(q);
    });
  }

  function renderMine() {
    const list = filteredMine();
    $("mine-count").textContent = `${list.length} file${list.length === 1 ? "" : "s"}`;
    if (!list.length) {
      $("mine-list").innerHTML = `<div class="empty-files"><strong>No files in your workspace yet</strong><p>Create a file — only you can edit it. Mark Completed when done.</p></div>`;
      return;
    }
    $("mine-list").innerHTML = list
      .map((item) => {
        const badge =
          item.status === "completed"
            ? `<span class="status-pill completed">Completed · protected</span>`
            : `<span class="status-pill draft">Draft</span>`;
        return `
        <article class="file-card" data-mine="${escapeHtml(item.id)}">
          <h3>${escapeHtml(item.title)} ${badge}</h3>
          <div class="file-meta">
            <span>${escapeHtml(item.folder)}</span>
            <span>${escapeHtml(item.tags || "")}</span>
            <span>${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ""}</span>
          </div>
          <p class="file-preview">${escapeHtml((item.content || "").replace(/\s+/g, " ").slice(0, 140))}</p>
        </article>`;
      })
      .join("");
  }

  function visibleStaging() {
    return state.staging.filter((s) => !state.dismissals.has(s.id));
  }

  function renderBox() {
    const list = visibleStaging();
    $("box-count").textContent = `${list.length} proposal${list.length === 1 ? "" : "s"}`;
    $("box-badge").textContent = String(list.length);
    if (!list.length) {
      $("box-list").innerHTML = `<div class="empty-files"><strong>Middle box is empty</strong><p>Propose a script or idea for the team to review.</p></div>`;
      return;
    }
    $("box-list").innerHTML = list
      .map((item) => {
        const mine = item.authorKey === state.ownerKey ? " · you" : "";
        return `
        <article class="file-card proposal-card" data-proposal="${escapeHtml(item.id)}">
          <h3>${escapeHtml(item.title)} <span class="status-pill box">Middle box</span></h3>
          <div class="file-meta">
            <span>From ${escapeHtml(item.authorName || "Anonymous")}${mine}</span>
            <span>${escapeHtml(item.folder)}</span>
            <span>${item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span>
          </div>
          ${item.note ? `<p class="file-preview"><em>${escapeHtml(item.note)}</em></p>` : ""}
          <p class="file-preview">${escapeHtml((item.content || "").replace(/\s+/g, " ").slice(0, 120))}</p>
          <div class="row" style="margin-top:0.5rem">
            <span class="tiny muted">Click to review · Accept copies into your work only</span>
          </div>
        </article>`;
      })
      .join("");
  }

  async function refresh() {
    await loadAll();
    renderFolders();
    renderMine();
    renderBox();
  }

  function openEditor(item) {
    state.editingId = item ? item.id : null;
    $("editor-title").textContent = item ? "Edit my file" : "New file (my work only)";
    $("f-title").value = item?.title || "";
    $("f-folder").value = item?.folder || (state.folder === "all" ? "notes" : state.folder);
    $("f-status").value = item?.status || "draft";
    $("f-tags").value = item?.tags || "";
    $("f-content").value = item?.content || "";
    $("btn-delete").style.display = item ? "inline-flex" : "none";
    $("editor-lock-note").textContent =
      "Only you can change this file. Others never get write access to your workspace.";
    openModal("editor");
  }

  function openProposal(item) {
    state.viewingProposal = item;
    $("p-title").textContent = item.title;
    $("p-meta").innerHTML = `
      <span>From <strong>${escapeHtml(item.authorName)}</strong></span>
      <span>${escapeHtml(item.folder)}</span>
      <span>${escapeHtml(item.tags || "")}</span>`;
    $("p-content").textContent = item.content || "";
    $("p-accept-title").value = item.title + " (from " + (item.authorName || "teammate") + ")";
    openModal("proposal");
  }

  function showGateForInvite(room, invite, valid) {
    if (valid) {
      $("invite-ok").classList.remove("hidden");
      $("invite-missing").classList.add("hidden");
      $("room-display-gate").value = room;
      $("gate-msg").textContent = "Invite link verified. Enter your name to open your private workspace in this room.";
    } else {
      $("invite-ok").classList.add("hidden");
      $("invite-missing").classList.remove("hidden");
    }
  }

  function enterWorkspace() {
    $("gate").classList.add("hidden");
    $("workspace").classList.remove("hidden");
    $("room-display").textContent = state.room;
    $("whoami").textContent = state.ownerName;
    updateModeBanner();
    refresh().catch((e) => alert(e.message));
  }

  function bind() {
    document.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => setTab(t.dataset.tab));
    });

    $("btn-create-room").addEventListener("click", async () => {
      try {
        const name = ($("create-name").value || "Owner").trim().slice(0, 40);
        const { room, invite } = await createRoom($("create-room").value, name);
        state.room = room;
        state.invite = invite;
        state.ownerKey = getOwnerKey();
        state.ownerName = name;
        localStorage.setItem("it_vault_author", name);
        const url = inviteUrl();
        window.history.replaceState({}, "", url);
        await navigator.clipboard.writeText(url).catch(() => {});
        alert(
          "Protected room created.\n\nSpecial invite link copied to clipboard.\nOnly people with this full link can enter.\n\n" +
            url
        );
        enterWorkspace();
      } catch (e) {
        alert("Create failed: " + e.message);
      }
    });

    $("btn-enter").addEventListener("click", async () => {
      const name = ($("display-name").value || "Anonymous").trim().slice(0, 40);
      state.ownerName = name;
      state.ownerKey = getOwnerKey();
      localStorage.setItem("it_vault_author", name);
      try {
        const ok = await validateInvite(state.room, state.invite);
        if (!ok) {
          alert("Invite invalid or expired.");
          return;
        }
        enterWorkspace();
      } catch (e) {
        alert(e.message);
      }
    });

    $("btn-leave").addEventListener("click", () => {
      state.room = null;
      state.invite = null;
      $("workspace").classList.add("hidden");
      $("gate").classList.remove("hidden");
      window.history.replaceState({}, "", window.location.pathname);
      location.reload();
    });

    $("btn-refresh").addEventListener("click", () => refresh().catch((e) => alert(e.message)));
    $("btn-new").addEventListener("click", () => openEditor(null));
    $("btn-propose").addEventListener("click", () => {
      $("q-title").value = "";
      $("q-content").value = "";
      $("q-note").value = "";
      $("q-tags").value = "";
      openModal("propose-modal");
    });

    $("folder-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-folder]");
      if (!b) return;
      state.folder = b.dataset.folder;
      renderFolders();
      renderMine();
    });

    $("mine-search").addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      renderMine();
    });

    $("mine-list").addEventListener("click", (e) => {
      const c = e.target.closest("[data-mine]");
      if (!c) return;
      const item = state.personal.find((p) => p.id === c.dataset.mine);
      if (item) openEditor(item);
    });

    $("box-list").addEventListener("click", (e) => {
      const c = e.target.closest("[data-proposal]");
      if (!c) return;
      const item = state.staging.find((p) => p.id === c.dataset.proposal);
      if (item) openProposal(item);
    });

    $("editor-close").addEventListener("click", () => closeModal("editor"));
    $("p-close").addEventListener("click", () => closeModal("proposal"));
    $("propose-close").addEventListener("click", () => closeModal("propose-modal"));
    $("gh-close").addEventListener("click", () => closeModal("gh-modal"));
    $("btn-live-sync").addEventListener("click", () => {
      const live = liveSettings();
      $("live-url").value = live?.url || "";
      $("live-anon").value = live?.anon || "";
      $("live-status").textContent = live
        ? state.mode === "live"
          ? "Live sync is ON for this browser."
          : "Keys saved — reload the page if mode still says local."
        : "Not configured — vault runs in local mode.";
      openModal("live-modal");
    });
    $("live-close").addEventListener("click", () => closeModal("live-modal"));
    $("live-save").addEventListener("click", () => {
      const url = $("live-url").value.trim();
      const anon = $("live-anon").value.trim();
      if (!url || !anon) {
        $("live-status").textContent = "Both URL and anon key are required.";
        return;
      }
      saveLiveSettings(url, anon);
      initClient();
      updateModeBanner();
      $("live-status").textContent =
        state.mode === "live"
          ? "Saved. Live sync enabled. Create a NEW protected room and share the invite link."
          : "Saved keys, but client did not start — check URL/key and reload.";
    });
    $("live-test").addEventListener("click", async () => {
      const url = $("live-url").value.trim();
      const anon = $("live-anon").value.trim();
      if (url && anon) saveLiveSettings(url, anon);
      $("live-status").textContent = "Testing…";
      try {
        await testLiveConnection();
        initClient();
        updateModeBanner();
        $("live-status").textContent =
          "Success — tables reachable. Live sync ready. Create a protected room and share the invite link.";
      } catch (e) {
        $("live-status").textContent = "Test failed: " + e.message;
      }
    });
    $("live-clear").addEventListener("click", () => {
      localStorage.removeItem("it_vault_supabase");
      initClient();
      updateModeBanner();
      $("live-url").value = "";
      $("live-anon").value = "";
      $("live-status").textContent = "Cleared. Back to local mode.";
    });

    $("btn-github-settings").addEventListener("click", () => {
      const s = ghSettings();
      $("gh-token").value = s.token || "";
      $("gh-owner").value = s.owner || "";
      $("gh-repo").value = s.repo || "";
      $("gh-prefix").value = s.prefix || "vault/";
      $("gh-branch").value = s.branch || "main";
      $("gh-status").textContent = s.token ? "Token saved in this browser." : "No token saved yet.";
      openModal("gh-modal");
    });

    $("gh-save").addEventListener("click", () => {
      saveGhSettings({
        token: $("gh-token").value.trim(),
        owner: $("gh-owner").value.trim(),
        repo: $("gh-repo").value.trim(),
        prefix: $("gh-prefix").value.trim() || "vault/",
        branch: $("gh-branch").value.trim() || "main",
      });
      $("gh-status").textContent = "Saved in this browser only.";
    });
    $("gh-clear").addEventListener("click", () => {
      localStorage.removeItem("it_vault_github");
      $("gh-token").value = "";
      $("gh-status").textContent = "Cleared.";
    });

    $("btn-save").addEventListener("click", async () => {
      const title = $("f-title").value.trim();
      if (!title) return alert("Title required");
      const existing = state.personal.find((p) => p.id === state.editingId);
      const item = {
        id: state.editingId || uid(),
        folder: $("f-folder").value,
        title,
        content: $("f-content").value,
        status: $("f-status").value,
        tags: $("f-tags").value.trim(),
        createdAt: existing?.createdAt,
        sourceStagingId: existing?.sourceStagingId,
      };
      try {
        await savePersonal(item);
        closeModal("editor");
        await refresh();
      } catch (e) {
        alert(e.message);
      }
    });

    $("btn-delete").addEventListener("click", async () => {
      if (!state.editingId) return;
      if (!confirm("Delete this file from YOUR workspace only?")) return;
      try {
        await deletePersonal(state.editingId);
        closeModal("editor");
        await refresh();
      } catch (e) {
        alert(e.message);
      }
    });

    $("btn-to-box").addEventListener("click", async () => {
      const title = $("f-title").value.trim();
      if (!title) return alert("Save/title required");
      try {
        await submitStaging({
          id: uid(),
          title,
          folder: $("f-folder").value,
          content: $("f-content").value,
          tags: $("f-tags").value.trim(),
          note: "Shared from " + state.ownerName + "'s workspace",
        });
        alert("Copy placed in the middle box. Your original file is unchanged.");
        await refresh();
        setTab("box");
      } catch (e) {
        alert(e.message);
      }
    });

    $("btn-github-push").addEventListener("click", async () => {
      const title = $("f-title").value.trim();
      if (!title) return alert("Title required");
      const item = {
        title,
        folder: $("f-folder").value,
        content: $("f-content").value,
        status: $("f-status").value,
        tags: $("f-tags").value.trim(),
      };
      try {
        const url = await pushToGitHub(item);
        alert("Uploaded to GitHub:\n" + url);
      } catch (e) {
        alert(e.message);
      }
    });

    $("q-submit").addEventListener("click", async () => {
      const title = $("q-title").value.trim();
      if (!title) return alert("Title required");
      try {
        await submitStaging({
          id: uid(),
          title,
          folder: $("q-folder").value,
          content: $("q-content").value,
          tags: $("q-tags").value.trim(),
          note: $("q-note").value.trim(),
        });
        closeModal("propose-modal");
        await refresh();
      } catch (e) {
        alert(e.message);
      }
    });

    $("p-accept").addEventListener("click", async () => {
      if (!state.viewingProposal) return;
      try {
        await acceptProposal(
          state.viewingProposal,
          $("p-accept-title").value.trim(),
          $("p-accept-status").value
        );
        closeModal("proposal");
        await refresh();
        setTab("mine");
        alert("Copied into YOUR work. Original middle-box item and your other files are untouched.");
      } catch (e) {
        alert(e.message);
      }
    });

    $("p-dismiss").addEventListener("click", async () => {
      if (!state.viewingProposal) return;
      try {
        await dismissProposal(state.viewingProposal.id);
        closeModal("proposal");
        await refresh();
      } catch (e) {
        alert(e.message);
      }
    });

    $("p-copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("p-content").textContent || "");
    });

    $("btn-copy-invite").addEventListener("click", async () => {
      if (!state.room || !state.invite) {
        alert("Enter or create a protected room first.");
        return;
      }
      await navigator.clipboard.writeText(inviteUrl());
      $("btn-copy-invite").textContent = "Invite link copied ✓";
      setTimeout(() => ($("btn-copy-invite").textContent = "Copy invite link"), 1500);
    });

    $("btn-export").addEventListener("click", () => {
      // Export full local room pack so teammates can merge middle box offline
      if (state.mode === "local") {
        const pack = readLocalRoom(state.room);
        const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `vault-room-${state.room}.json`;
        a.click();
      } else {
        const pack = {
          type: "it-vault-personal-export",
          room: state.room,
          owner: state.ownerName,
          personal: state.personal,
          exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `my-work-${state.room}.json`;
        a.click();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal("editor");
        closeModal("proposal");
        closeModal("propose-modal");
        closeModal("gh-modal");
        closeModal("live-modal");
      }
    });
  }

  async function boot() {
    initClient();
    updateModeBanner();
    state.ownerKey = getOwnerKey();
    const saved = localStorage.getItem("it_vault_author");
    if (saved) {
      $("display-name").value = saved;
      $("create-name").value = saved;
    }

    const params = new URLSearchParams(window.location.search);
    const room = normalizeRoom(params.get("room"));
    const invite = (params.get("invite") || "").trim();

    bind();

    if (room && invite) {
      state.room = room;
      state.invite = invite;
      try {
        const ok = await validateInvite(room, invite);
        showGateForInvite(room, invite, ok);
        if (!ok) {
          $("gate-msg").textContent =
            "This invite link is not valid for that room (wrong/missing token). Ask for a fresh Copy invite link.";
        }
      } catch (e) {
        showGateForInvite(room, invite, false);
        $("gate-msg").textContent = "Could not validate invite: " + e.message;
      }
    } else {
      showGateForInvite("", "", false);
    }
  }

  boot();
})();
