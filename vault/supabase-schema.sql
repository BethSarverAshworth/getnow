-- IT Repository — Shared Filing Vault schema
-- Run once in Supabase: SQL Editor → New query → Run

create table if not exists vault_items (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  folder text not null default 'ideas',
  title text not null,
  content text not null default '',
  author text not null default 'Anonymous',
  tags text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_items_room_idx on vault_items (room_code);
create index if not exists vault_items_folder_idx on vault_items (room_code, folder);

alter table vault_items enable row level security;

-- Simple shared rooms: anyone with the room code can read/write.
-- Do NOT store passwords, keys, or personal data here.
drop policy if exists "vault read" on vault_items;
drop policy if exists "vault insert" on vault_items;
drop policy if exists "vault update" on vault_items;
drop policy if exists "vault delete" on vault_items;

create policy "vault read" on vault_items for select using (true);
create policy "vault insert" on vault_items for insert with check (true);
create policy "vault update" on vault_items for update using (true);
create policy "vault delete" on vault_items for delete using (true);
