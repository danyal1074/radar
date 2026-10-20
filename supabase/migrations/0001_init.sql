-- Car Radar (رادار خرید خودرو) — initial schema.
-- Conventions: all prices are INTEGER TOMAN (bigint). Run in the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

-- ───────────── enums ─────────────
create type listing_source   as enum ('divar','sheypoor','manual','sample');
create type source_status    as enum ('active','removed','unknown');
create type followup_status  as enum ('none','watching','contacted','negotiating','bought','dropped');
create type plan_id          as enum ('trial','basic','pro','business');
create type sub_status       as enum ('trialing','active','expired','canceled');
create type payment_status   as enum ('pending','confirmed','rejected');

-- ───────────── profiles ─────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text not null default '',
  business_name text not null default '',
  city          text not null default '',
  role          text not null default 'dealer' check (role in ('dealer','admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table subscriptions (
  user_id            uuid primary key references profiles(id) on delete cascade,
  plan               plan_id not null default 'trial',
  status             sub_status not null default 'trialing',
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  plan         plan_id not null check (plan <> 'trial'),
  months       int not null check (months in (1,3,12)),
  amount_toman bigint not null check (amount_toman > 0),
  method       text not null default 'manual_card_transfer' check (method in ('manual_card_transfer','gateway')),
  status       payment_status not null default 'pending',
  reference    text not null,
  note         text not null default '',
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index payments_user_idx on payments(user_id, created_at desc);
create index payments_status_idx on payments(status);

-- ───────────── shared market data ─────────────
create table listings (
  id             uuid primary key default gen_random_uuid(),
  source         listing_source not null,
  source_post_id text not null,
  source_url     text check (source_url is null or source_url ~* '^https://([a-z0-9-]+\.)*(divar\.ir|sheypoor\.com)(/|$)'),
  title          text not null,
  make           text not null,
  model          text not null,
  trim           text,
  year           int,
  mileage_km     int,
  color          text,
  city           text,
  price_toman    bigint not null check (price_toman > 0),
  description    text,
  image_url      text,
  published_at   timestamptz,
  first_seen_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  source_status  source_status not null default 'active',
  is_sample      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (source, source_post_id)
);
create index listings_active_idx on listings(source_status, last_seen_at desc);
create index listings_make_model_idx on listings(make, model, year);

create table listing_price_history (
  id          bigint generated always as identity primary key,
  listing_id  uuid not null references listings(id) on delete cascade,
  price_toman bigint not null,
  seen_at     timestamptz not null default now()
);
create index lph_listing_idx on listing_price_history(listing_id, seen_at);

create table price_estimates (
  id                      uuid primary key default gen_random_uuid(),
  listing_id              uuid not null references listings(id) on delete cascade,
  provider                text not null,
  estimated_price_toman   bigint check (estimated_price_toman is null or estimated_price_toman > 0),
  currency                text not null default 'IRT',
  estimated_at            timestamptz not null,
  expires_at              timestamptz not null,
  status                  text not null check (status in ('success','failed')),
  confidence              numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  is_sample               boolean not null default false,
  request_metadata        jsonb not null default '{}',
  response_metadata       jsonb not null default '{}',
  created_at              timestamptz not null default now()
);
create index estimates_listing_idx on price_estimates(listing_id, estimated_at desc);
-- request signature (provider|make|model|…) lives in request_metadata->>'signature' for de-duplicating paid calls
create index estimates_signature_idx on price_estimates((request_metadata->>'signature'), estimated_at desc);

-- ───────────── private per-dealer data ─────────────
create table watch_rules (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  name                 text not null,
  make                 text,
  model                text,
  year_min             int,
  year_max             int,
  price_min_toman      bigint,
  price_max_toman      bigint,
  mileage_min_km       int,
  mileage_max_km       int,
  city                 text,
  source               listing_source,
  min_discount_percent numeric check (min_discount_percent is null or (min_discount_percent between 0 and 90)),
  min_discount_toman   bigint,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (min_discount_percent is not null or min_discount_toman is not null)
);
create index watch_rules_user_idx on watch_rules(user_id);

create table saved_listings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table listing_followups (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  listing_id       uuid not null references listings(id) on delete cascade,
  status           followup_status not null default 'none',
  notes            text not null default '' check (char_length(notes) <= 2000),
  next_followup_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  listing_id    uuid not null references listings(id) on delete cascade,
  watch_rule_id uuid references watch_rules(id) on delete set null,
  type          text not null default 'opportunity',
  title         text not null,
  body          text not null,
  is_read       boolean not null default false,
  dedupe_key    text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, dedupe_key)               -- one alert per (user, rule, listing, event)
);
create index notifications_user_idx on notifications(user_id, is_read, created_at desc);

-- ───────────── operations ─────────────
create table system_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_type      text not null,
  status        text not null check (status in ('running','success','failed')),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error_message text,
  metadata      jsonb not null default '{}'
);
create index system_jobs_started_idx on system_jobs(started_at desc);

create table usage_events (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('estimate_request','estimate_cache_hit','estimate_failed')),
  provider   text not null,
  cost_toman bigint not null default 0,
  created_at timestamptz not null default now()
);
create index usage_events_created_idx on usage_events(created_at desc);

-- ───────────── helpers & triggers ─────────────
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_touch  before update on profiles          for each row execute function touch_updated_at();
create trigger trg_subs_touch      before update on subscriptions     for each row execute function touch_updated_at();
create trigger trg_listings_touch  before update on listings          for each row execute function touch_updated_at();
create trigger trg_rules_touch     before update on watch_rules       for each row execute function touch_updated_at();
create trigger trg_followups_touch before update on listing_followups for each row execute function touch_updated_at();

-- New auth user => profile (always role 'dealer') + 14-day trial.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, business_name, city)
  values (
    new.id, lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'business_name',''),
    coalesce(new.raw_user_meta_data->>'city','')
  );
  insert into subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'trialing', now() + interval '14 days');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ───────────── Row Level Security ─────────────
alter table profiles              enable row level security;
alter table subscriptions         enable row level security;
alter table payments              enable row level security;
alter table listings              enable row level security;
alter table listing_price_history enable row level security;
alter table price_estimates       enable row level security;
alter table watch_rules           enable row level security;
alter table saved_listings        enable row level security;
alter table listing_followups     enable row level security;
alter table notifications         enable row level security;
alter table system_jobs           enable row level security;   -- no policies => service role only
alter table usage_events          enable row level security;   -- no policies => service role only

-- profiles: read own; update only harmless columns (role can never be changed by the user).
create policy profiles_select_own on profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated, anon;
grant  update (full_name, business_name, city) on profiles to authenticated;

-- subscriptions: read own, never write from the client.
create policy subs_select_own on subscriptions for select to authenticated using (user_id = auth.uid());

-- payments: read own; may only create a PENDING request for themselves.
create policy payments_select_own on payments for select to authenticated using (user_id = auth.uid());
create policy payments_insert_own on payments for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and reviewed_at is null);

-- shared market data: readable by signed-in users, written by the service role only.
create policy listings_read   on listings              for select to authenticated using (true);
create policy history_read    on listing_price_history for select to authenticated using (true);
create policy estimates_read  on price_estimates       for select to authenticated using (true);

-- private data: full CRUD on own rows only.
create policy rules_own     on watch_rules       for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_own     on saved_listings    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy followups_own on listing_followups for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: own rows; users may only flip is_read (inserts come from the service role).
create policy notif_select_own on notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update_own on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on notifications from authenticated, anon;
grant  update (is_read) on notifications to authenticated;

-- anon gets nothing.
revoke all on all tables in schema public from anon;
