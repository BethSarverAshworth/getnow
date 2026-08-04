# Launch checklist — go live & get paid

You are ~2 steps away from taking money:

1. **Host the site** (free)
2. **Connect Stripe** (free account; Stripe takes a small % per sale)

---

## A) Deploy live (pick one)

### Option 1 — Vercel (recommended, free)

On your Mac Terminal:

```bash
cd ~/it-repository
npx vercel login
npx vercel --yes
npx vercel --prod --yes
```

Copy the production URL (example: `https://it-repository-xxx.vercel.app`).

### Option 2 — GitHub Pages

```bash
cd ~/it-repository
git init
git add .
git commit -m "Launch IT Repository"
```

Create a new repo on github.com, then:

```bash
git remote add origin https://github.com/YOURUSER/it-repository.git
git branch -M main
git push -u origin main
```

GitHub → Settings → Pages → Deploy from `main` / root.

---

## B) Connect Stripe (so you profit)

1. Sign up: https://dashboard.stripe.com/register  
2. Complete basic business details (individual is fine to start).  
3. **Product catalog → Payment links → New**  
   - Name: `IT Repository Pro`  
   - Price: `$12` monthly **or** `$29` one-time (one-time is simpler for v1)  
4. **After payment → redirect to**  
   ```
   https://YOUR-LIVE-URL/success.html?token=ITPRO-BETH-2026-LAUNCH
   ```
   (Change the token in both Stripe redirect **and** `js/config.js` before marketing widely.)
5. Copy the Payment Link URL.
6. Open `js/config.js` and set:
   ```js
   stripePaymentLink: "https://buy.stripe.com/....",
   unlockToken: "ITPRO-BETH-2026-LAUNCH",
   ```
7. Redeploy (`npx vercel --prod --yes` or `git push`).

**Payouts:** Stripe → Balance → Payouts → add your bank account.

---

## C) Test the money path

1. Open your live site.  
2. Click **Get Pro** → should go to Stripe (if linked).  
3. Use Stripe test mode first (toggle in Dashboard).  
4. After “payment”, you land on `success.html` → Pro unlocks.  
5. Open Pro packs (Home Lab, Interview Bank, Runbooks, Scripts).

Local demo without Stripe:

```
http://localhost:8080/?demo_pro=1
```

---

## D) First customers (free marketing)

| Channel | What to post |
|--------|----------------|
| LinkedIn | “I built a free IT study library + Pro packs for labs & interviews” + link |
| Classmates / Discord | Free subnetting + Linux resources |
| Reddit | Share **free** value first; don’t spam “buy my course” |
| TikTok/Shorts | 30s Linux command tip → link in bio |
| Friends job-hunting IT | Free interview sample + Pro for full bank |

**Offer for week 1:** one-time `$9` launch price (change Stripe + `config.js` label).

---

## E) Honest profit math

| Sales / month | Price | Gross | After ~3% Stripe |
|---------------|-------|-------|------------------|
| 5 | $12 | $60 | ~$58 |
| 20 | $12 | $240 | ~$233 |
| 50 | $12 | $600 | ~$582 |
| 100 | $29 one-time packs | $2,900 | ~$2,800 |

Growth comes from **traffic + trust**, not code alone. Add 1 free guide per week (your class notes rewritten as public posts).

---

## F) Security note (v1)

Pro unlock is a **browser token** after payment (no login server). Fine for early sales.  
Later upgrade: Supabase Auth + Stripe webhooks so Pro follows the account, not just one browser.

---

## Files that matter

| File | Why |
|------|-----|
| `js/config.js` | Stripe link + unlock token + price label |
| `success.html` | Post-payment unlock page |
| `packs/*.md` | What Pro customers actually get |
| `data/resources.json` | Catalog |

You’re not waiting on me for code — **host + Stripe** turns this into a business.
