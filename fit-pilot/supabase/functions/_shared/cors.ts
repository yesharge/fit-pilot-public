export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-app-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Optional shared-token guard. If APP_SHARED_TOKEN is set as a function secret,
 * requests must send a matching `x-app-token` header. This is a weak deterrent
 * (the client token ships in the browser bundle) — it stops casual abuse of
 * your proxied keys, not a determined attacker. Real protection = Supabase Auth.
 */
export function tokenGuardFailed(req: Request): boolean {
  const expected = Deno.env.get('APP_SHARED_TOKEN')
  if (!expected) return false
  return req.headers.get('x-app-token') !== expected
}
