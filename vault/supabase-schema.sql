-- IT Repository — Protected Shared Vault (invite-only + personal + staging box)
-- Run in Supabase SQL Editor (can replace older vault_items schema)

-- Rooms: special invite token required
create table if not exists vault_rooms (
  room_code text primary key,
  invite_token text not null unique,
  title text default 'Shared vault',
  created_at timestamptz not null default now()
);

-- Personal workspaces (only owner should edit — enforced in app; RLS is open with invite knowledge)
create table if not exists vault_personal (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references vault_rooms(room_code) on delete cascade,
  owner_key text not null,
  owner_name text not null default 'Anonymous',
  folder text not null default 'notes',
  title text not null,
  content text not null default '',
  status text not null default 'draft', -- draft | completed
  tags text not null default '',
  source_staging_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_personal_room_owner on vault_personal (room_code, owner_key);

-- Middle box: proposed work that does NOT change anyone's completed files
create table if not exists vault_staging (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references vault_rooms(room_code) on delete cascade,
  author_key text not null,
  author_name text not null default 'Anonymous',
  folder text not null default 'ideas',
  title text not null,
  content text not null default '',
  tags text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists vault_staging_room on vault_staging (room_code);

-- Optional: track who dismissed a proposal (so it hides for them only)
create table if not exists vault_dismissals (
  room_code text not null,
  owner_key text not null,
  staging_id uuid not null references vault_staging(id) on delete cascade,
  primary key (room_code, owner_key, staging_id)
);

alter table vault_rooms enable row level security;
alter table vault_personal enable row level security;
alter table vault_staging enable row level security;
alter table vault_dismissals enable row level security;

-- Open policies: secrecy is the invite token (share carefully).
-- For stronger security later, move API behind a server with service role.
-- Community tech news shares (optional live board)
create table if not exists tech_news_shares (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  topic text not null default 'general',
  note text not null default '',
  author text not null default 'Anonymous',
  created_at timestamptz not null default now()
);

create index if not exists tech_news_shares_created on tech_news_shares (created_at desc);

alter table tech_news_shares enable row level security;

-- Live chat messages (Realtime)
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'general',
  author text not null default 'Anonymous',
  author_key text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created on chat_messages (room, created_at desc);

alter table chat_messages enable row level security;

-- Enable realtime for live chat (safe to re-run)
do $$ begin
  alter publication supabase_realtime add table chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$ begin
  -- rooms
  begin create policy vault_rooms_all on vault_rooms for all using (true) with check (true); exception when duplicate_object then null; end;
  begin create policy vault_personal_all on vault_personal for all using (true) with check (true); exception when duplicate_object then null; end;
  begin create policy vault_staging_all on vault_staging for all using (true) with check (true); exception when duplicate_object then null; end;
  begin create policy vault_dismissals_all on vault_dismissals for all using (true) with check (true); exception when duplicate_object then null; end;
  begin create policy tech_news_shares_all on tech_news_shares for all using (true) with check (true); exception when duplicate_object then null; end;
  begin create policy chat_messages_all on chat_messages for all using (true) with check (true); exception when duplicate_object then null; end;
end $$;
