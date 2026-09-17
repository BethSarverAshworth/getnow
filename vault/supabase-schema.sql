-- GetNow — Protected Shared Vault + Live Chat
-- Run ALL of this in Supabase SQL Editor (one paste, then Run)
-- Safe to re-run

-- Rooms: special invite token required
create table if not exists vault_rooms (
  room_code text primary key,
  invite_token text not null unique,
  title text default 'Shared vault',
  created_at timestamptz not null default now()
);

-- Personal workspaces
create table if not exists vault_personal (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references vault_rooms(room_code) on delete cascade,
  owner_key text not null,
  owner_name text not null default 'Anonymous',
  folder text not null default 'notes',
  title text not null,
  content text not null default '',
  status text not null default 'draft',
  tags text not null default '',
  source_staging_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_personal_room_owner on vault_personal (room_code, owner_key);

-- Middle box: proposed work
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

-- Dismissals (hide a proposal for one person only)
create table if not exists vault_dismissals (
  room_code text not null,
  owner_key text not null,
  staging_id uuid not null references vault_staging(id) on delete cascade,
  primary key (room_code, owner_key, staging_id)
);

-- Community tech news shares
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

-- Live chat messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'general',
  author text not null default 'Anonymous',
  author_key text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created on chat_messages (room, created_at desc);

-- Row Level Security
alter table vault_rooms enable row level security;
alter table vault_personal enable row level security;
alter table vault_staging enable row level security;
alter table vault_dismissals enable row level security;
alter table tech_news_shares enable row level security;
alter table chat_messages enable row level security;

-- Open policies (invite token is the secrecy). Safe to re-run.
drop policy if exists vault_rooms_all on vault_rooms;
create policy vault_rooms_all on vault_rooms for all using (true) with check (true);

drop policy if exists vault_personal_all on vault_personal;
create policy vault_personal_all on vault_personal for all using (true) with check (true);

drop policy if exists vault_staging_all on vault_staging;
create policy vault_staging_all on vault_staging for all using (true) with check (true);

drop policy if exists vault_dismissals_all on vault_dismissals;
create policy vault_dismissals_all on vault_dismissals for all using (true) with check (true);

drop policy if exists tech_news_shares_all on tech_news_shares;
create policy tech_news_shares_all on tech_news_shares for all using (true) with check (true);

drop policy if exists chat_messages_all on chat_messages;
create policy chat_messages_all on chat_messages for all using (true) with check (true);

-- Enable Realtime for live chat (safe to re-run)
do $$
begin
  alter publication supabase_realtime add table chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
