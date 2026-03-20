-- ============================================================
-- WMHQ Money Dashboard — Supabase Schema Migration
-- Run this in the Supabase SQL editor.
-- ============================================================

-- ─── Reusable updated_at trigger function ─────────────────────────────────────

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ─── Table 1: money_dashboard_settings ───────────────────────────────────────
-- One row per user. Stores global Money Dashboard preferences.

create table if not exists money_dashboard_settings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  business_model    text not null check (business_model in ('product', 'service')),
  preferred_currency text not null default 'AUD',
  explanation_mode  text not null default 'simple' check (explanation_mode in ('simple', 'concise')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists idx_money_dashboard_settings_user_id
  on money_dashboard_settings(user_id);

create trigger set_money_dashboard_settings_updated_at
  before update on money_dashboard_settings
  for each row execute function update_updated_at_column();


-- ─── Table 2: money_dashboard_constants ──────────────────────────────────────
-- One row per user per business model. Stores semi-stable baseline assumptions.

create table if not exists money_dashboard_constants (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  business_model  text not null check (business_model in ('product', 'service')),
  constants_json  jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint uq_money_dashboard_constants unique (user_id, business_model)
);

create index if not exists idx_money_dashboard_constants_user_id
  on money_dashboard_constants(user_id);

create trigger set_money_dashboard_constants_updated_at
  before update on money_dashboard_constants
  for each row execute function update_updated_at_column();


-- ─── Table 3: money_dashboard_entries ────────────────────────────────────────
-- One row per user per business model per week. Weekly check-in data.

create table if not exists money_dashboard_entries (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  business_model          text not null check (business_model in ('product', 'service')),
  entry_week_start_date   date not null,
  entry_week_end_date     date not null,
  currency                text not null default 'AUD',
  entry_json              jsonb not null default '{}'::jsonb,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Each user can have only one entry per model per week
  constraint uq_money_dashboard_entries unique (user_id, business_model, entry_week_start_date),
  -- Enforce that end date is 6 days after start date
  constraint chk_week_dates check (entry_week_end_date = entry_week_start_date + 6)
);

create index if not exists idx_money_dashboard_entries_user_id
  on money_dashboard_entries(user_id);

create index if not exists idx_money_dashboard_entries_user_week
  on money_dashboard_entries(user_id, entry_week_start_date desc);

create index if not exists idx_money_dashboard_entries_user_model_week
  on money_dashboard_entries(user_id, business_model, entry_week_start_date desc);

create trigger set_money_dashboard_entries_updated_at
  before update on money_dashboard_entries
  for each row execute function update_updated_at_column();


-- ─── Row Level Security ───────────────────────────────────────────────────────

-- money_dashboard_settings
alter table money_dashboard_settings enable row level security;

create policy "money_dashboard_settings: select own"
  on money_dashboard_settings for select
  using (auth.uid() = user_id);

create policy "money_dashboard_settings: insert own"
  on money_dashboard_settings for insert
  with check (auth.uid() = user_id);

create policy "money_dashboard_settings: update own"
  on money_dashboard_settings for update
  using (auth.uid() = user_id);

create policy "money_dashboard_settings: delete own"
  on money_dashboard_settings for delete
  using (auth.uid() = user_id);


-- money_dashboard_constants
alter table money_dashboard_constants enable row level security;

create policy "money_dashboard_constants: select own"
  on money_dashboard_constants for select
  using (auth.uid() = user_id);

create policy "money_dashboard_constants: insert own"
  on money_dashboard_constants for insert
  with check (auth.uid() = user_id);

create policy "money_dashboard_constants: update own"
  on money_dashboard_constants for update
  using (auth.uid() = user_id);

create policy "money_dashboard_constants: delete own"
  on money_dashboard_constants for delete
  using (auth.uid() = user_id);


-- money_dashboard_entries
alter table money_dashboard_entries enable row level security;

create policy "money_dashboard_entries: select own"
  on money_dashboard_entries for select
  using (auth.uid() = user_id);

create policy "money_dashboard_entries: insert own"
  on money_dashboard_entries for insert
  with check (auth.uid() = user_id);

create policy "money_dashboard_entries: update own"
  on money_dashboard_entries for update
  using (auth.uid() = user_id);

create policy "money_dashboard_entries: delete own"
  on money_dashboard_entries for delete
  using (auth.uid() = user_id);
