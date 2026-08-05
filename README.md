# GetNow

A **free-to-build, free-to-host** tech dream library: **hundreds** of networking, architecture, Linux, Windows, security, cloud, wireless, helpdesk, certs, scripts, tools, and learning-path resources — searchable in one place.

Designed as a product you can monetize later with **Free + Pro** tiers.

## What’s included

- Searchable resource library
- Category filters (Networking, Linux, Security, Cloud, Certs, Scripts, Tools, Cheatsheets)
- Free vs Pro badges
- Inline script/cheatsheet viewer
- External links to reputable free IT resources
- Pro pack placeholders ready for paid gating

## Run locally (required for JSON loading)

Browsers block `fetch()` on raw `file://` pages. Use a tiny local server:

```bash
cd ~/it-repository
python3 -m http.server 8080
```

Open: [http://localhost:8080](http://localhost:8080)

## Add your own resources

Edit `data/resources.json`:

```json
{
  "id": "my-unique-id",
  "title": "My Lab Notes",
  "description": "What this is and who it’s for.",
  "category": "networking",
  "tags": ["vlan", "lab"],
  "level": "Beginner",
  "type": "Guide",
  "tier": "free",
  "url": "https://example.com",
  "featured": true
}
```

For inline content (scripts/cheatsheets), add a `"body"` string and set `"url": "#something"`.

Categories must match an `id` under `"categories"` (or add a new category object).

## Deploy for $0

### Option A — GitHub Pages

1. Create a new GitHub repo (e.g. `it-repository`)
2. Push this folder
3. Settings → Pages → Deploy from `main` branch, root `/`
4. Share your `https://YOURUSER.github.io/it-repository/` URL

### Option B — Cloudflare Pages / Netlify

Drag-and-drop this folder, or connect the GitHub repo. Free tier is enough.

**No domain required** to launch. A custom domain (~$10–15/year) is optional later for branding/SEO.

## How to make money (without heavy ad spend)

| Path | How |
|------|-----|
| **Pro membership** | Wire Stripe Checkout; unlock `tier: "pro"` items after payment |
| **One-time packs** | Sell “Home Lab Blueprint Pack” / “Interview Bank” as downloads |
| **Affiliate links** | Link cert practice sites, books, hosting (disclose clearly) |
| **Services** | Free tools build trust → paid helpdesk setup / tutoring / lab builds |
| **SEO** | Publish niche guides (“subnetting for Network+”, “Linux helpdesk commands”) |

Honest expectation: free traffic takes time. Niche + consistent content beats a generic “IT dump.”

### Suggested first Pro products (high willingness to pay)

1. Interview question bank (helpdesk → junior admin)
2. Home lab blueprints with diagrams
3. Incident response runbooks
4. Automation script vault (Bash + PowerShell)

## Project structure

```
it-repository/
├── index.html          # App shell
├── css/styles.css      # UI
├── js/app.js           # Search, filters, modal
├── data/resources.json # All catalog content
└── README.md
```

## Next upgrades (when you want)

1. **Stripe** — Pro checkout button
2. **Supabase free auth** — login + paid flag
3. **Your notes** — export class notes as free SEO pages
4. **Submit form** — community resource suggestions (moderated)

## License

Your project. Replace seed links with your original notes for a stronger product.

---

Built for Beth · Free stack · Ready to grow into a paid IT library
