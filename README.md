# fit-pilot

fit-pilot is an AI-powered job search and application assistant. Upload your resume once, and fit-pilot finds matching roles, scores each one against your resume with semantic embeddings, and tailors a resume and cover letter per application using Claude. Triage jobs on a board, rewrite inline, track every application through its stages, and apply with your tailored content pre-copied to your clipboard.

Built with React, TypeScript, and Vite, on top of the Anthropic and OpenAI APIs. It exercises prompt design, token streaming, embeddings-based semantic scoring, a provider abstraction, and per-job version history.

## Demo

[fit-pilot demo — click to play](https://github.com/user-attachments/assets/93f037a3-ddab-4bbe-972c-735579f1a31a)

<img width="1709" height="882" alt="Screenshot 2026-06-15 at 2 24 06 PM" src="https://github.com/user-attachments/assets/00eb702b-c373-4a93-ae32-2562a2b8b307" />


## Features

- **Resume-first onboarding** — drop in a PDF; it's parsed and embedded, then every job is scored against it.
- **Job search with filters** — search by role, location, remote-only, employment type, and date posted (via JSearch / RapidAPI), or paste a listing manually.
- **Semantic fit scoring** — each job's description is embedded (OpenAI) and ranked by cosine similarity to your resume.
- **Triage board** — drag jobs across Interested / Reviewing / Skipped; click any card for full details.
- **AI rewrite** — streaming, Claude-powered resume rewrite per job, with an inline diff and keyword-coverage check.
- **Cover letters** — generate a matching cover letter in a chosen tone.
- **Version history** — every rewrite is saved with its match score; download any version's resume or cover letter as text.
- **Application tracker** — applied jobs surface with stage badges (Applied → Interview → Offer → Rejected), a stage filter, and follow-up reminders.
- **Bring your own keys** — enter API keys in-app under Settings (stored only in your browser tab), or use a `.env.local` in development.
- **Light & dark mode**, driven by a single design-token file.

## Getting started

The Vite app lives in the `fit-pilot/` subdirectory of the repo.

```bash
git clone https://github.com/yesharge/fit-pilot-public
cd fit-pilot-public/fit-pilot
npm install
```

### Quick start (no backend — bring your own keys)

This is the default, zero-infrastructure path. Create a `.env.local` in the app
directory (next to `package.json`):

```bash
VITE_ANTHROPIC_API_KEY=your_api_key_here
VITE_OPENAI_API_KEY=your_api_key_here
VITE_JSEARCH_API_KEY=your_rapidapi_key_here
```

```bash
npm run dev
```

Open `http://localhost:5174`. You can also paste keys in the app under
**Settings** instead of `.env.local`; entered keys take precedence. In this mode
the job queue is saved to your browser (localStorage) and Anthropic requests go
through a Vite dev proxy (`/api-anthropic`) to avoid CORS.

### Optional: Supabase backend

The backend is **optional and toggled by config**. If you set `VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY`, the app switches to "backend mode": your job queue
persists in Postgres, fit scoring runs in the database with **pgvector**, and the
API keys move server-side behind edge functions (so they never reach the
browser). With those env vars absent, everything stays client-only.

Setup — creating the project, the schema/pgvector, deploying the functions — is
in [`SUPABASE.md`](fit-pilot/SUPABASE.md).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port 5174 |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Tech stack

- **React 19 + TypeScript** with Vite
- **Anthropic API** — resume rewrites and cover letters (streaming)
- **OpenAI API** — resume/job embeddings for fit scoring
- **JSearch (RapidAPI)** — job search
- State via `useReducer` + hooks; the job queue persists to `localStorage`, API keys to `sessionStorage`
- **Optional backend:** Supabase (Postgres + **pgvector** + edge functions), toggled by env — see [`SUPABASE.md`](fit-pilot/SUPABASE.md)

## Project structure

```
fit-pilot/
├─ src/
│  ├─ components/    UI: board, cards, slide-overs, modals, tracker
│  ├─ hooks/         useJobSearch, useRewrite, useCoverLetter, usePDFParser, …
│  ├─ lib/
│  │  ├─ ai/         provider clients, prompts, serialization
│  │  ├─ job/        JSearch client and mapping
│  │  ├─ config.ts   backend on/off flag (HAS_BACKEND)
│  │  ├─ supabase.ts supabase client + edge-function caller
│  │  └─ jobStore.ts persistence seam: localStorage vs Postgres
│  ├─ pages/Home/    app composition and layout states
│  ├─ styles/        design tokens + globals
│  └─ types/         shared types
└─ supabase/         migration (pgvector + match_jobs) + edge functions
```
