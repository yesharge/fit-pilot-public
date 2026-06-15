-- Fix: jobs.id must be text, not uuid. API jobs use the JSearch job_id (e.g.
-- "U_teme9qUwLun1leAAAAAA=="), which is not a valid uuid, so upserts failed with
-- "invalid input syntax for type uuid". This migration alters an existing DB;
-- 0001 already creates the column as text for fresh installs.
alter table public.jobs alter column id drop default;
alter table public.jobs alter column id type text using id::text;

-- match_jobs must return the same type.
drop function if exists public.match_jobs(vector);

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
