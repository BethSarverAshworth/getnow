(function () {
  const FOLDERS = [
    { id: "all", name: "All files", icon: "📁" },
    { id: "scripts", name: "Scripts", icon: "⚙️" },
    { id: "ideas", name: "Ideas", icon: "💡" },
    { id: "notes", name: "Notes", icon: "📝" },
    { id: "architecture", name: "Architecture", icon: "🗺️" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "hardware", name: "Hardware", icon: "🔧" },
  ];

  const state = {
    room: null,
    author: "Anonymous",
    folder: "all",
    query: "",
    items: [],
    editingId: null,
    client: null,
    mode: "local", // local | live
  };

  const $ = (id) => document.getElementById(id);

  function cfg() {
    return window.IT_REPO_CONFIG || {};
  }

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function roomKey(code) {
    return "it_vault_room_" + code.toUpperCase();
  }

  function normalizeCode(code) {
    return String(code || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);
  }

  function randomRoom() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function initClient() {
    const { supabaseUrl, supabaseAnonKey } = cfg();
    if (
      supabaseUrl &&
      supabaseAnonKey &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {
      state.client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      state.mode = "live";
      return true;
    }
    state.client = null;
    state.mode = "local";
    return false;
  }

  function updateModeBanner() {
    const live = state.mode === "live";
    $("mode-banner").innerHTML = live
      ? `<span class="mode-live">Live multi-party mode (Supabase)</span> — everyone with the room code sees the same files across devices.`
      : `<span class="mode-local">Local + export mode</span> — files stay in this browser. Share with teammates via <strong>Export room</strong> / <strong>Import</strong>, or connect free Supabase for live sync (see vault setup).`;
    const status = $("conn-status");
    if (status) {
      status.textContent = live ? "Live shared storage" : "Local browser storage";
      status.className = "tiny " + (live ? "mode-live" : "mode-local");
    }
  }

  // ----- Storage adapters -----
  async function loadItems() {
    if (!state.room) return [];
    if (state.mode === "live" && state.client) {
      const { data, error } = await state.client
        .from("vault_items")
        .select("*")
        .eq("room_code", state.room)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeRemote);
    }
    try {
      const raw = localStorage.getItem(roomKey(state.room));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function normalizeRemote(row) {
    return {
      id: row.id,
      room: row.room_code,
      folder: row.folder || "ideas",
      title: row.title || "Untitled",
      content: row.content || "",
      author: row.author || "Anonymous",
      tags: row.tags || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function saveLocal(items) {
    localStorage.setItem(roomKey(state.room), JSON.stringify(items));
  }

  async function upsertItem(item) {
    if (state.mode === "live" && state.client) {
      const row = {
        id: item.id,
        room_code: state.room,
        folder: item.folder,
        title: item.title,
        content: item.content,
        author: item.author,
        tags: item.tags || "",
        updated_at: new Date().toISOString(),
      };
      if (!item.createdAt) row.created_at = new Date().toISOString();
      const { error } = await state.client.from("vault_items").upsert(row);
      if (error) throw error;
      return;
    }
    const items = await loadItems();
    const idx = items.findIndex((x) => x.id === item.id);
    const now = new Date().toISOString();
    const next = {
      ...item,
      room: state.room,
      updatedAt: now,
      createdAt: item.createdAt || now,
    };
    if (idx >= 0) items[idx] = next;
    else items.unshift(next);
    await saveLocal(items);
  }

  async function deleteItem(id) {
    if (state.mode === "live" && state.client) {
      const { error } = await state.client.from("vault_items").delete().eq("id", id);
      if (error) throw error;
      return;
    }
    const items = (await loadItems()).filter((x) => x.id !== id);
    await saveLocal(items);
  }

  // ----- UI -----
  function filtered() {
    return state.items.filter((item) => {
      if (state.folder !== "all" && item.folder !== state.folder) return false;
      if (!state.query) return true;
      const q = state.query.toLowerCase();
      return [item.title, item.content, item.author, item.tags, item.folder]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }

  function renderFolders() {
    const counts = Object.fromEntries(FOLDERS.map((f) => [f.id, 0]));
    counts.all = state.items.length;
    state.items.forEach((i) => {
      if (counts[i.folder] != null) counts[i.folder]++;
    });
    $("folder-list").innerHTML = FOLDERS.map(
      (f) => `
      <button type="button" class="folder-btn ${state.folder === f.id ? "active" : ""}" data-folder="${f.id}">
        ${f.icon} ${escapeHtml(f.name)}
        <span class="count">${counts[f.id] || 0}</span>
      </button>`
    ).join("");
  }

  function renderFiles() {
    const list = filtered();
    $("file-count").textContent = `${list.length} file${list.length === 1 ? "" : "s"}`;
    if (!list.length) {
      $("file-list").innerHTML = `
        <div class="empty-files">
          <strong>No files yet</strong>
          <p>Click <em>+ New file</em> to share a script or idea with the room.</p>
        </div>`;
      return;
    }
    $("file-list").innerHTML = list
      .map((item) => {
        const when = item.updatedAt || item.createdAt || "";
        const date = when ? new Date(when).toLocaleString() : "";
        const preview = (item.content || "").replace(/\s+/g, " ").slice(0, 140);
        return `
        <article class="file-card" data-id="${escapeHtml(item.id)}">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="file-meta">
            <span>${escapeHtml(item.folder)}</span>
            <span>${escapeHtml(item.author || "Anonymous")}</span>
            <span>${escapeHtml(date)}</span>
            ${item.tags ? `<span>${escapeHtml(item.tags)}</span>` : ""}
          </div>
          <p class="file-preview">${escapeHtml(preview || "(empty)")}</p>
        </article>`;
      })
      .join("");
  }

  async function refresh() {
    try {
      state.items = await loadItems();
      renderFolders();
      renderFiles();
    } catch (err) {
      alert("Could not load room: " + err.message);
    }
  }

  function showWorkspace(show) {
    $("gate").classList.toggle("hidden", show);
    $("workspace").classList.toggle("hidden", !show);
    if (show) {
      $("room-display").textContent = state.room;
      updateModeBanner();
    }
  }

  function openEditor(item) {
    state.editingId = item ? item.id : null;
    $("editor-title").textContent = item ? "Edit file" : "New file";
    $("f-title").value = item ? item.title : "";
    $("f-folder").value = item ? item.folder : state.folder === "all" ? "ideas" : state.folder;
    $("f-tags").value = item ? item.tags || "" : "";
    $("f-content").value = item ? item.content || "" : "";
    $("btn-delete").style.display = item ? "inline-flex" : "none";
    $("editor").classList.add("open");
    $("editor").setAttribute("aria-hidden", "false");
    $("f-title").focus();
  }

  function closeEditor() {
    $("editor").classList.remove("open");
    $("editor").setAttribute("aria-hidden", "true");
    state.editingId = null;
  }

  async function joinRoom(code, author) {
    const room = normalizeCode(code);
    if (room.length < 3) {
      alert("Room code must be at least 3 letters/numbers.");
      return;
    }
    state.room = room;
    state.author = (author || "Anonymous").trim().slice(0, 40) || "Anonymous";
    localStorage.setItem("it_vault_author", state.author);
    localStorage.setItem("it_vault_last_room", state.room);
    showWorkspace(true);
    // update URL
    const url = new URL(window.location.href);
    url.searchParams.set("room", state.room);
    window.history.replaceState({}, "", url.toString());
    await refresh();
  }

  function leaveRoom() {
    state.room = null;
    state.items = [];
    showWorkspace(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url.pathname + url.hash);
  }

  function shareUrl() {
    if (!state.room) return window.location.href;
    const url = new URL(window.location.href);
    url.searchParams.set("room", state.room);
    return url.toString();
  }

  // ----- events -----
  function bind() {
    $("btn-create").addEventListener("click", () => {
      $("room-code").value = randomRoom();
    });

    $("btn-join").addEventListener("click", () => {
      joinRoom($("room-code").value, $("display-name").value);
    });

    $("btn-leave").addEventListener("click", leaveRoom);
    $("btn-refresh").addEventListener("click", refresh);
    $("btn-new").addEventListener("click", () => openEditor(null));
    $("editor-close").addEventListener("click", closeEditor);
    $("editor").addEventListener("click", (e) => {
      if (e.target === $("editor")) closeEditor();
    });

    $("folder-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-folder]");
      if (!btn) return;
      state.folder = btn.dataset.folder;
      renderFolders();
      renderFiles();
    });

    $("vault-search").addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      renderFiles();
    });

    $("file-list").addEventListener("click", (e) => {
      const card = e.target.closest("[data-id]");
      if (!card) return;
      const item = state.items.find((x) => x.id === card.dataset.id);
      if (item) openEditor(item);
    });

    $("btn-save").addEventListener("click", async () => {
      const title = $("f-title").value.trim();
      if (!title) {
        alert("Add a title.");
        return;
      }
      const existing = state.items.find((x) => x.id === state.editingId);
      const item = {
        id: state.editingId || uid(),
        folder: $("f-folder").value,
        title,
        content: $("f-content").value,
        author: state.author,
        tags: $("f-tags").value.trim(),
        createdAt: existing ? existing.createdAt : undefined,
      };
      try {
        await upsertItem(item);
        closeEditor();
        await refresh();
      } catch (err) {
        alert("Save failed: " + err.message);
      }
    });

    $("btn-delete").addEventListener("click", async () => {
      if (!state.editingId) return;
      if (!confirm("Delete this file from the shared room?")) return;
      try {
        await deleteItem(state.editingId);
        closeEditor();
        await refresh();
      } catch (err) {
        alert("Delete failed: " + err.message);
      }
    });

    $("btn-copy-content").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("f-content").value || "");
      $("btn-copy-content").textContent = "Copied ✓";
      setTimeout(() => ($("btn-copy-content").textContent = "Copy content"), 1200);
    });

    $("btn-share-link").addEventListener("click", async () => {
      const link = shareUrl();
      await navigator.clipboard.writeText(link);
      $("btn-share-link").textContent = "Link copied ✓";
      setTimeout(() => ($("btn-share-link").textContent = "Copy share link"), 1500);
    });

    $("btn-export").addEventListener("click", async () => {
      const items = await loadItems();
      const pack = {
        type: "it-repository-vault",
        version: 1,
        room: state.room,
        exportedAt: new Date().toISOString(),
        items,
      };
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `vault-${state.room}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $("import-file").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const pack = JSON.parse(text);
        const incoming = Array.isArray(pack.items) ? pack.items : Array.isArray(pack) ? pack : [];
        if (!incoming.length) throw new Error("No items found in file");
        for (const raw of incoming) {
          const item = {
            id: raw.id || uid(),
            folder: raw.folder || "ideas",
            title: raw.title || "Imported",
            content: raw.content || "",
            author: raw.author || state.author,
            tags: raw.tags || "",
            createdAt: raw.createdAt || raw.created_at,
          };
          await upsertItem(item);
        }
        await refresh();
        alert(`Imported ${incoming.length} item(s) into room ${state.room}.`);
      } catch (err) {
        alert("Import failed: " + err.message);
      }
      e.target.value = "";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeEditor();
    });
  }

  async function boot() {
    initClient();
    updateModeBanner();
    bind();

    const savedName = localStorage.getItem("it_vault_author") || "";
    if (savedName) $("display-name").value = savedName;

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room") || localStorage.getItem("it_vault_last_room") || "";
    if (params.get("room")) {
      $("room-code").value = normalizeCode(roomParam);
    } else if (roomParam) {
      $("room-code").value = normalizeCode(roomParam);
    }
  }

  boot();
})();
