-- OPTIONAL. Do not run this as part of deploy.
-- The application works against the live 0001 schema without these columns:
--   watch-rule flags are stored in watch_rules.name ([فوری] [بی‌رنگ] [سالم] [تصادفی])
--   messenger chat ids are stored in .data/bot_subscribers.json
-- Apply in the Supabase SQL editor only if you want the columns present.
-- Statements are additive (IF NOT EXISTS) and do not rewrite or delete existing rows.

alter table watch_rules add column if not exists damage_filter text;
alter table watch_rules add column if not exists urgent_only boolean not null default false;
alter table watch_rules add column if not exists paint_free_only boolean not null default false;

alter table profiles add column if not exists bale_chat_id text;
alter table profiles add column if not exists telegram_chat_id text;
alter table profiles add column if not exists rubika_chat_id text;
alter table profiles add column if not exists eitaa_chat_id text;
