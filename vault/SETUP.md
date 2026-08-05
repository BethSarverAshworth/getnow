# Protected Shared Vault — setup

## What you get

| Piece | Behavior |
|--------|----------|
| **Special invite link** | Required. Room name alone cannot open the vault. |
| **My work** | Private to each person. Others cannot edit/delete your files. |
| **Completed** | Your protected baseline. Accepting proposals never overwrites these. |
| **Middle box** | Shared staging area for proposed scripts/ideas. |
| **Accept** | Copies a proposal into *your* workspace only. |
| **GitHub pipeline** | Uploads *your* chosen file via a PAT stored in *your* browser. |

## Create a room

1. Open `/tools/vault.html`
2. **Create protected room + invite link**
3. Share the full URL (includes `room` + `invite` secrets)
4. Teammates open that link only

Example shape:

```
https://it-repository-cyan.vercel.app/tools/vault.html?room=TECHLAB&invite=longSecretTokenHere
```

## Live multi-device (free Supabase)

1. Create project at https://supabase.com  
2. SQL Editor → run `vault/supabase-schema.sql`  
3. Settings → API → copy URL + **anon** key into `js/config.js`:

```js
supabaseUrl: "https://xxxx.supabase.co",
supabaseAnonKey: "eyJ...",
```

4. Redeploy  

Without Supabase, the vault still enforces invite + personal/middle-box rules **in this browser**, and you can **Export** the room pack for offline sharing.

## GitHub upload pipeline

1. Create a repo (e.g. `it-lab-notes`)  
2. Create a fine-grained PAT with **Contents: Read and write** on that repo  
3. In the vault → **GitHub** → paste token, owner, repo, branch  
4. Open one of **your** files → **Upload to GitHub**  

The token never goes into the public site config; it stays in localStorage on your machine.

## Safety

- Invite links are passwords — don’t post publicly  
- Don’t store real credentials inside vault files  
- Rotate invite by creating a new room when a class ends  

## Live chat

After enabling Live sync, re-run `supabase-schema.sql` so `chat_messages` exists and Realtime is enabled. Then open `/tools/chat.html`.
