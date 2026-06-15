// Backend is optional. If a Supabase URL + anon key are configured, the app
// runs in "backend mode": data persists to Postgres and the AI/job-search keys
// stay server-side behind edge functions. Otherwise it runs client-only,
// using localStorage + the user's own keys (from Settings or .env.local).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
export const APP_TOKEN = import.meta.env.VITE_APP_SHARED_TOKEN ?? ''

export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
