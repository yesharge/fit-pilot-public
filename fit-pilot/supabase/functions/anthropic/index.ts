// Streaming passthrough to the Anthropic Messages API. The client builds the
// full request body (model, system, messages, stream) exactly as before and
// posts it here; this function injects the secret key and streams the SSE
// response straight back, so the rewrite/cover-letter token streaming is
// unaffected and the Anthropic key never reaches the browser.
import { corsHeaders, tokenGuardFailed } from '../_shared/cors.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (tokenGuardFailed(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.text()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body,
  })

  // Stream res.body through untouched (SSE when stream:true, JSON otherwise).
  return new Response(res.body, {
    status: res.status,
    headers: {
      ...corsHeaders,
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
    },
  })
})
