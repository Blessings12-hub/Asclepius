-- Asclepius cloud storage. Run this ONCE in Supabase:
--   Supabase dashboard > SQL Editor > New query > paste everything below > Run.
-- It is safe to run again: nothing is deleted.

create table if not exists public.asclepius_kv (
  coll       text        not null,            -- what kind of record: materials, cards, backups, kv ...
  id         text        not null,
  course_id  text,                            -- lets us load one course's materials quickly
  num        bigint,                          -- flashcards: when each one is due
  data       jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);

create index if not exists asclepius_kv_course_idx on public.asclepius_kv (coll, course_id);
create index if not exists asclepius_kv_num_idx    on public.asclepius_kv (coll, num);

-- Lock the table. With row level security on and no policies, the public (anon) key can read
-- and write nothing. Only your server, using the secret key, can touch your data.
alter table public.asclepius_kv enable row level security;
