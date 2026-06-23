-- fit-pilot resume persistence (single-user, no auth)
-- Mirrors the localStorage resume snapshot used in client-only mode, so backend
-- mode keeps the resume across reloads and devices. Single-user app → a single
-- row, pinned by a check constraint so upserts always target the same record.
create table if not exists public.resume (
  -- Singleton: only one resume per (single-user) install. The fixed id lets the
  -- client upsert without first reading the row.
  id           text primary key default 'singleton' check (id = 'singleton'),
  content      text not null default '',
  -- Same 1536-dim space as jobs.description_embedding (text-embedding-3-small);
  -- null until the resume is embedded. Stored so match_jobs and a reload don't
  -- need a fresh embedding call.
  embedding    vector(1536),
  filename     text not null default 'resume.pdf',
  page_count   int not null default 0,
  token_count  int not null default 0,
  updated_at   timestamptz not null default now()
);

-- ── Row-level security ───────────────────────────────────────────────────────
-- Single-user, no auth: enable RLS but allow the anon role full access so the
-- browser client can read/write. Same caveat as the jobs table — anyone with
-- the project URL + anon key can access this. Add Supabase Auth + a per-user
-- policy (auth.uid() = user_id) before any public/multi-user deployment.
alter table public.resume enable row level security;

create policy "anon full access - resume" on public.resume
  for all to anon using (true) with check (true);
