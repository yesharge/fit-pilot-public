// Proxies OpenAI embeddings so the OpenAI key never reaches the browser.
// Request body: { "text": "..." }  → returns the raw OpenAI embeddings response
// ({ data: [{ embedding: number[] }] }), so the client parser is unchanged.
import { corsHeaders, tokenGuardFailed } from '../_shared/cors.ts'

const EMBEDDING_MODEL = 'text-embedding-3-small'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (tokenGuardFailed(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { text } = await req.json()
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
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
