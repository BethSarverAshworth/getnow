# Shared Filing Vault — multi-party setup

The vault lets classmates, teammates, or clients share **scripts and ideas** in a room.

## Two modes

### A) Local + Export/Import (works now, $0)
1. Open **Tools → Shared vault**
2. Create a room code (e.g. `TECHLAB`)
3. Add files
4. **Export room** → send the JSON file in Discord/email/Drive
5. Teammates **Import** that file into the same room code

Good for classes and small groups. Not live across devices until someone imports.

### B) Live multi-party (recommended, free Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor** → paste and run `vault/supabase-schema.sql`
3. **Project Settings → API**
   - Copy **Project URL**
   - Copy **anon public** key
4. Put them in `js/config.js`:

```js
supabaseUrl: "https://YOURPROJECT.supabase.co",
supabaseAnonKey: "eyJhbGciOi...",
```

5. Redeploy the site (`npx vercel --prod`)

Anyone with the **room link** can then read/write the same files from different computers.

Example share link:

```
https://it-repository-cyan.vercel.app/tools/vault.html?room=TECHLAB
```

## Safety

- Room codes are shared secrets — treat them like a folder password
- Do **not** store passwords, API keys, SSN, or private customer data
- For public class use, rotate room codes each semester

## Folders

Scripts · Ideas · Notes · Architecture · Security · Hardware
