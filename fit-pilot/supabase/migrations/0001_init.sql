-- fit-pilot schema (single-user, no auth)
-- Enable pgvector for embedding storage + similarity search.
create extension if not exists vector;

-- ── Jobs: the triage board + application pipeline ────────────────────────────
-- One row per job. Rewrite history (resume versions + cover letters) is stored
-- as a jsonb array on the row, so the whole queue saves with a single upsert.
-- `board_column` (not `column`, a reserved word) maps to Job.column.
create table if not exists public.jobs (
  -- text, not uuid: the app supplies the id (crypto.randomUUID() for manual
  -- jobs, the JSearch job_id — which is not a uuid — for API jobs).
  id                    text primary key,
  source                text not null default 'manual',      -- 'api' | 'manual'
  external_id           text,                                 -- jsearch job_id, for dedupe
  title                 text not null,
  company               text not null,
  description           text not null default '',
  url                   text not null default '',
  location              text,
  is_remote             boolean not null default false,
  employment_type       text,
  posted_at             timestamptz,
  description_embedding vector(1536),
  fit_score             int,                                  -- cached 0–100
  board_column          text not null default 'interested',  -- interested|reviewing|skipped
  application_status    text not null default 'none',
  applied_at            timestamptz,
  notes                 text not null default '',
  rewrites              jsonb not null default '[]'::jsonb,   -- RewriteRecord[]
  created_at            timestamptz not null default now()
);

-- Approximate-nearest-neighbour index for cosine distance (<=>).
create index if not exists jobs_embedding_idx
  on public.jobs using hnsw (description_embedding vector_cosine_ops);

-- Dedupe API jobs by their provider id.
create unique index if not exists jobs_external_id_key
  on public.jobs (external_id) where external_id is not null;

-- ── Fit scoring with pgvector ────────────────────────────────────────────────
-- Mirrors the client's scoreFromSimilarity(): cosine similarity is
-- 1 - (a <=> b); we stretch the [0.30, 0.60] band onto 0–100 and clamp, so
-- server-side scores match the existing in-app numbers.
create or replace function public.match_jobs(query_embedding vector(1536))
returns table (id text, fit_score int)
language sql stable as $$
  select
    j.id,
    greatest(0, least(100, round(
      (((1 - (j.description_embedding <=> query_embedding)) - 0.30) / (0.60 - 0.30)) * 100
    )))::int as fit_score
  from public.jobs j
  where j.description_embedding is not null
  order by j.description_embedding <=> query_embedding;
$$;

-- ── Row-level security ───────────────────────────────────────────────────────
-- Single-user, no auth: enable RLS but allow the anon role full access so the
-- browser client can read/write. NOTE: with no auth this means anyone holding
-- the public anon key + project URL can access this data. Acceptable for a
-- personal/local build only — add Supabase Auth + per-user policies before any
-- public/multi-user deployment. See SUPABASE.md.
alter table public.jobs enable row level security;

create policy "anon full access - jobs" on public.jobs
  for all to anon using (true) with check (true);
