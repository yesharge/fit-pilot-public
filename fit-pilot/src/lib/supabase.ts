import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { APP_TOKEN, HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config'

// Null in client-only mode — nothing should touch it unless HAS_BACKEND.
export const supabase: SupabaseClient | null = HAS_BACKEND
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

/** POST to an edge function with the anon JWT (and optional shared app token). */
export function callFunction(name: string, body: unknown): Promise<Response> {
  return fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  })
}
