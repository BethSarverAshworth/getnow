(function () {
  const STORAGE_KEY = "it_field_journal_v1";
  const AUTHOR_KEY = "it_journal_author";

  const TEMPLATES = {
    troubleshoot: {
      label: "Troubleshooting",
      titleHint: "e.g. User cannot reach shared drive after VLAN change",
      body: `## Symptom
What is broken? Who is affected? When did it start?

## Environment
- Device / OS:
- Network location:
- Recent changes:

## Steps already tried
1.
2.

## Investigation
Commands, logs, screenshots notes:

## Root cause
(One clear sentence if known)

## Resolution
What fixed it:

## Prevention / follow-up
How we avoid a repeat:

## Time to resolve
`,
    },
    lab: {
      label: "Lab / finding",
      titleHint: "e.g. Host-only networking between two Ubuntu VMs",
      body: `## Goal
What were you trying to learn or build?

## Setup
Hypervisor, OS versions, topology:

## What I did
Steps / commands:

## Finding
What worked, what failed, surprise results:

## Diagram / IP notes
(optional)

## Takeaway
How I'll use this later (ticket, exam, interview):
`,
    },
    incident: {
      label: "Incident note",
      titleHint: "e.g. Brief DNS outage — recursive resolver unreachable",
      body: `## Summary
One-paragraph overview for a status update:

## Timeline
- Detected:
- Mitigated:
- Resolved:

## Impact
Users / services affected:

## Actions taken
1.
2.

## Root cause (known / suspected)

## Lessons learned
`,
    },
    learning: {
      label: "Learning / tip",
      titleHint: "e.g. Always check DNS before blaming the firewall",
      body: `## Tip

## Why it matters

## Example

## Related topics
`,
    },
    free: {
      label: "Free write",
      titleHint: "Anything you want to remember",
      body: "",
    },
  };

  const state = {
    entries: [],
    filter: "all",
    query: "",
    editingId: null,
    viewingId: null,
  };

  const $ = (id) => document.getElementById(id);

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : "j-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.entries = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.entries)) state.entries = [];
    } catch {
      state.entries = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  }

  function author() {
    return ($("author").value || "Anonymous").trim().slice(0, 40) || "Anonymous";
  }

  function openModal(id) {
    $(id).classList.add("open");
    $(id).setAttribute("aria-hidden", "false");
  }
  function closeModal(id) {
    $(id).classList.remove("open");
    $(id).setAttribute("aria-hidden", "true");
  }

  function typeLabel(t) {
    return TEMPLATES[t]?.label || t;
  }

  function filtered() {
    return state.entries
      .filter((e) => {
        if (state.filter !== "all" && e.type !== state.filter) return false;
        if (!state.query) return true;
        const q = state.query.toLowerCase();
        return [e.title, e.body, e.tags, e.system, e.author, e.type]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }

  function render() {
    const list = filtered();
    $("stats").textContent = `${state.entries.length} total · showing ${list.length}`;
    if (!list.length) {
      $("entry-list").innerHTML = `
        <div class="empty-journal tool-card">
          <strong>Your journal is ready</strong>
          <p>Log the next fix while it’s still in your head — symptom, steps, root cause, resolution.</p>
          <button type="button" class="btn btn-primary" id="empty-new">Write first entry</button>
        </div>`;
      const btn = $("empty-new");
      if (btn) btn.onclick = () => openEditor(null, "troubleshoot");
      return;
    }

    $("entry-list").innerHTML = list
      .map((e) => {
        const preview = (e.body || "").replace(/\s+/g, " ").replace(/^#+\s*/gm, "").slice(0, 160);
        const when = e.updatedAt ? new Date(e.updatedAt).toLocaleString() : "";
        const sev = e.severity
          ? `<span class="sev sev-${escapeHtml(e.severity)}">${escapeHtml(e.severity)}</span>`
          : "";
        return `
        <article class="entry-card tool-card" data-id="${escapeHtml(e.id)}">
          <div class="entry-top">
            <span class="type-pill">${escapeHtml(typeLabel(e.type))}</span>
            ${sev}
          </div>
          <h2>${escapeHtml(e.title)}</h2>
          <div class="file-meta">
            <span>${escapeHtml(e.author || "")}</span>
            ${e.system ? `<span>${escapeHtml(e.system)}</span>` : ""}
            <span>${escapeHtml(when)}</span>
            ${e.tags ? `<span>${escapeHtml(e.tags)}</span>` : ""}
          </div>
          <p class="entry-preview">${escapeHtml(preview || "—")}</p>
        </article>`;
      })
      .join("");
  }

  function openEditor(entry, forceType) {
    state.editingId = entry ? entry.id : null;
    $("editor-heading").textContent = entry ? "Edit entry" : "New journal entry";
    const type = forceType || entry?.type || "troubleshoot";
    $("e-type").value = type;
    $("e-title").value = entry?.title || "";
    $("e-title").placeholder = TEMPLATES[type]?.titleHint || "";
    $("e-system").value = entry?.system || "";
    $("e-tags").value = entry?.tags || "";
    $("e-severity").value = entry?.severity || "";
    $("e-body").value = entry?.body || (entry ? "" : TEMPLATES[type]?.body || "");
    $("btn-delete").style.display = entry ? "inline-flex" : "none";
    renderGuided(type);
    openModal("editor");
    $("e-title").focus();
  }

  function renderGuided(type) {
    // Lightweight prompts above the body — optional coaching
    const tips = {
      troubleshoot: "Guided structure is in the notes below. Fill Symptom → Root cause → Resolution.",
      lab: "Capture setup + finding so you can turn this into a portfolio bullet later.",
      incident: "Write as if a teammate will read this at 2 a.m.",
      learning: "One tip, one why, one example — short is fine.",
      free: "No structure required — brain dump welcome.",
    };
    $("guided-fields").innerHTML = `<p class="guide-tip">${escapeHtml(tips[type] || "")}</p>`;
  }

  function openViewer(entry) {
    state.viewingId = entry.id;
    $("v-title").textContent = entry.title;
    $("v-meta").innerHTML = `
      <span>${escapeHtml(typeLabel(entry.type))}</span>
      <span>${escapeHtml(entry.author || "")}</span>
      ${entry.system ? `<span>${escapeHtml(entry.system)}</span>` : ""}
      ${entry.severity ? `<span>${escapeHtml(entry.severity)}</span>` : ""}
      <span>${entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ""}</span>
      ${entry.tags ? `<span>${escapeHtml(entry.tags)}</span>` : ""}`;
    $("v-body").textContent = entry.body || "";
    openModal("viewer");
  }

  function toMarkdown(e) {
    return `# ${e.title}

- **Type:** ${typeLabel(e.type)}
- **Author:** ${e.author || ""}
- **System:** ${e.system || "—"}
- **Severity:** ${e.severity || "—"}
- **Tags:** ${e.tags || "—"}
- **Updated:** ${e.updatedAt || ""}

${e.body || ""}
`;
  }

  function bind() {
    const savedAuthor = localStorage.getItem(AUTHOR_KEY) || "";
    if (savedAuthor) $("author").value = savedAuthor;
    $("author").addEventListener("change", () => {
      localStorage.setItem(AUTHOR_KEY, author());
    });

    $("btn-new").addEventListener("click", () => openEditor(null, "troubleshoot"));
    $("filter-type").addEventListener("change", (e) => {
      state.filter = e.target.value;
      render();
    });
    $("search").addEventListener("input", (e) => {
      state.query = e.target.value.trim();
      render();
    });

    document.querySelectorAll("[data-template]").forEach((btn) => {
      btn.addEventListener("click", () => openEditor(null, btn.dataset.template));
    });

    $("entry-list").addEventListener("click", (e) => {
      const card = e.target.closest("[data-id]");
      if (!card) return;
      const entry = state.entries.find((x) => x.id === card.dataset.id);
      if (entry) openViewer(entry);
    });

    $("editor-close").addEventListener("click", () => closeModal("editor"));
    $("viewer-close").addEventListener("click", () => closeModal("viewer"));
    $("editor").addEventListener("click", (e) => {
      if (e.target === $("editor")) closeModal("editor");
    });
    $("viewer").addEventListener("click", (e) => {
      if (e.target === $("viewer")) closeModal("viewer");
    });

    $("e-type").addEventListener("change", () => {
      const t = $("e-type").value;
      $("e-title").placeholder = TEMPLATES[t]?.titleHint || "";
      renderGuided(t);
    });

    $("btn-template-fill").addEventListener("click", () => {
      const t = $("e-type").value;
      const tmpl = TEMPLATES[t]?.body || "";
      if (!$("e-body").value.trim() || confirm("Replace notes with the template structure?")) {
        $("e-body").value = tmpl;
      }
    });

    $("btn-save").addEventListener("click", () => {
      const title = $("e-title").value.trim();
      if (!title) return alert("Give this entry a title so you can find it later.");
      const now = new Date().toISOString();
      const existing = state.entries.find((x) => x.id === state.editingId);
      const entry = {
        id: state.editingId || uid(),
        title,
        type: $("e-type").value,
        system: $("e-system").value.trim(),
        tags: $("e-tags").value.trim(),
        severity: $("e-severity").value,
        body: $("e-body").value,
        author: author(),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      if (existing) {
        Object.assign(existing, entry);
      } else {
        state.entries.unshift(entry);
      }
      localStorage.setItem(AUTHOR_KEY, author());
      save();
      closeModal("editor");
      render();
    });

    $("btn-delete").addEventListener("click", () => {
      if (!state.editingId) return;
      if (!confirm("Delete this journal entry?")) return;
      state.entries = state.entries.filter((x) => x.id !== state.editingId);
      save();
      closeModal("editor");
      render();
    });

    $("btn-copy").addEventListener("click", async () => {
      const entry = {
        title: $("e-title").value.trim() || "Untitled",
        type: $("e-type").value,
        system: $("e-system").value.trim(),
        tags: $("e-tags").value.trim(),
        severity: $("e-severity").value,
        body: $("e-body").value,
        author: author(),
        updatedAt: new Date().toISOString(),
      };
      await navigator.clipboard.writeText(toMarkdown(entry));
      $("btn-copy").textContent = "Copied ✓";
      setTimeout(() => ($("btn-copy").textContent = "Copy as Markdown"), 1200);
    });

    $("v-edit").addEventListener("click", () => {
      const entry = state.entries.find((x) => x.id === state.viewingId);
      closeModal("viewer");
      if (entry) openEditor(entry);
    });

    $("v-copy").addEventListener("click", async () => {
      const entry = state.entries.find((x) => x.id === state.viewingId);
      if (!entry) return;
      await navigator.clipboard.writeText(toMarkdown(entry));
      $("v-copy").textContent = "Copied ✓";
      setTimeout(() => ($("v-copy").textContent = "Copy Markdown"), 1200);
    });

    $("btn-export").addEventListener("click", () => {
      const md = state.entries
        .slice()
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .map(toMarkdown)
        .join("\n\n---\n\n");
      const blob = new Blob(
        [`# Field Journal\n\nExported ${new Date().toLocaleString()}\n\n---\n\n${md}`],
        { type: "text/markdown" }
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `field-journal-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $("btn-import").addEventListener("click", () => $("import-file").click());
    $("import-file").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const incoming = Array.isArray(data) ? data : data.entries;
        if (!Array.isArray(incoming)) throw new Error("Expected a JSON array or { entries: [] }");
        let added = 0;
        for (const raw of incoming) {
          if (!raw.title) continue;
          state.entries.unshift({
            id: raw.id || uid(),
            title: raw.title,
            type: raw.type || "free",
            system: raw.system || "",
            tags: raw.tags || "",
            severity: raw.severity || "",
            body: raw.body || "",
            author: raw.author || author(),
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: raw.updatedAt || new Date().toISOString(),
          });
          added++;
        }
        save();
        render();
        alert(`Imported ${added} entries.`);
      } catch (err) {
        alert("Import failed: " + err.message);
      }
      e.target.value = "";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal("editor");
        closeModal("viewer");
      }
    });
  }

  load();
  bind();
  render();
})();
