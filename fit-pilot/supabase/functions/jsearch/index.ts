// Proxies JSearch (RapidAPI) so the RapidAPI key stays server-side.
// Request body: { "searchParams": "query=...&country=us&..." } (a query string,
// exactly what the client already builds). Returns the raw JSearch JSON.
import { corsHeaders, tokenGuardFailed } from '../_shared/cors.ts'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (tokenGuardFailed(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { searchParams } = await req.json()
    const res = await fetch(`https://jsearch.p.rapidapi.com/search-v2?${searchParams}`, {
      headers: {
        'x-rapidapi-key': Deno.env.get('JSEARCH_API_KEY') ?? '',
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      },
    })

    const data = await res.text()
    return new Response(data, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
