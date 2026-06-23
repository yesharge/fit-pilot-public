# Supabase backend (optional)

fit-pilot runs **client-only by default** — localStorage for the queue, your own
API keys (Settings panel or `.env.local`). That's the zero-setup path.

Adding Supabase is **opt-in**: set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
and the app flips into "backend mode," which:

1. **Hides your API keys** behind edge functions (the browser never sees them).
2. **Persists the job queue** in Postgres instead of localStorage.
3. **Scores fit with pgvector** — cosine similarity runs in SQL via the
   `match_jobs` function, not in the browser.

The switch is a single flag (`HAS_BACKEND` in `src/lib/config.ts`, true when the
Supabase env vars are present). Every backend branch is gated behind it, so with
no env vars nothing changes.

## How it's wired (already in the code)

```
src/lib/
├─ config.ts        HAS_BACKEND flag from env
├─ supabase.ts      supabase client (null in client mode) + callFunction()
├─ jobStore.ts      load / persist / matchJobs — localStorage vs Postgres
├─ resumeStorage.ts localStorage resume snapshot (client mode)
└─ resumeStore.ts   load / persist resume — localStorage vs Postgres

supabase/
├─ migrations/0001_init.sql       jobs table + pgvector + match_jobs RPC
├─ migrations/0002_job_id_text.sql jobs.id → text
├─ migrations/0003_resume.sql     singleton resume table (text + embedding)
└─ functions/
   ├─ _shared/cors.ts         CORS + optional shared-token guard
   ├─ embed/index.ts          OpenAI embeddings proxy
   ├─ anthropic/index.ts      Anthropic streaming proxy
   └─ jsearch/index.ts        JSearch proxy
```

`embed()`, `searchJobs()`, and the Anthropic provider all check `HAS_BACKEND`:
backend mode calls the edge functions, client mode calls the providers directly
with the user's key. `useJobSearch` loads/persists through `jobStore` and scores
via `match_jobs` in backend mode (cosine in the browser otherwise).

The resume persists the same way: `Home` loads/persists it through `resumeStore`,
which writes a single pinned row in the `resume` table (backend mode) or a
localStorage snapshot (client mode). Both store the resume text **and** its
embedding, so a reload lands straight on the dashboard without re-uploading or
re-embedding. Scoring still uses the in-memory resume vector against
`match_jobs`; the table is purely for persistence across reloads/devices.

## Turning it on

### 1. Create a project and link the CLI

```bash
npm install -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>   # run from the app dir
```

Copy **Project URL** and the **anon public key** from Dashboard → Project
Settings → API.

### 2. Apply the schema (enables pgvector)

```bash
supabase db push
```

This runs the migrations in order: `0001_init.sql` enables `pgvector`, creates
the `jobs` table (with a `description_embedding vector(1536)` column, an `hnsw`
index, and `rewrites` as a jsonb array) and the `match_jobs` RPC; `0002` widens
`jobs.id` to text; `0003_resume.sql` adds the singleton `resume` table (resume
text + `embedding vector(1536)` + file metadata) so the resume persists across
reloads. Both tables get an `anon`-full-access RLS policy (single-user; see
**Security**).

#### How pgvector scoring works

Embeddings are 1,536 numbers (`text-embedding-3-small`). Cosine **distance** is
the `<=>` operator, so cosine **similarity** is `1 - (a <=> b)`. `match_jobs`
reuses the app's `scoreFromSimilarity()` math — it stretches the [0.30, 0.60]
similarity band onto 0–100 and clamps — so server scores match the in-app
numbers. The client calls it with
`supabase.rpc('match_jobs', { query_embedding })`, the database compares the
resume embedding to every job's, and the `hnsw` index keeps it fast.

### 3. Set secrets and deploy the functions

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-ant-... \
  JSEARCH_API_KEY=your-rapidapi-key \
  APP_SHARED_TOKEN=$(openssl rand -hex 16)   # optional; see Security

supabase functions deploy embed
supabase functions deploy anthropic
supabase functions deploy jsearch
```

### 4. Add the client env vars

In the app's `.env.local`:

```bash
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_APP_SHARED_TOKEN=the-same-token-you-set-above   # optional, must match
```

Restart `npm run dev`. The app is now in backend mode — no `VITE_*_API_KEY`
needed in the browser. Remove those env vars to go back to client-only mode.

> `@supabase/supabase-js` is already a dependency. The `supabase/functions/*`
> files are Deno and live outside the Vite build, so they aren't type-checked by
> `tsc`; add `supabase` to your ESLint ignores so `npm run lint` skips them.

## Security

This is **single-user with no auth**, which has two consequences:

- **Database:** RLS is on but the policy allows the `anon` role full access, and
  the anon key ships in the browser bundle. Anyone with your project URL + anon
  key can read/write the `jobs` table. Fine for a personal/local tool; **not**
  for a public deployment.
- **Edge functions:** without auth, the key-proxy functions are callable by
  anyone who finds the URL — a relay for your paid keys. The optional
  `APP_SHARED_TOKEN` deters casual abuse, but the token is extractable from the
  bundle.

**Before going public**, add Supabase Auth (magic link is enough): add a
`user_id uuid references auth.users` column to `jobs`, replace the `anon` policy
with `auth.uid() = user_id`, and verify the caller's JWT in each edge function
(`supabase.auth.getUser()`) instead of the shared token. That makes it a proper
multi-user app and closes both gaps.
