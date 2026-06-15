import { HAS_BACKEND } from '@/lib/config'
import { callFunction } from '@/lib/supabase'
import { getApiKey } from '@/lib/ai/providers/apiKey'

const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'
const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Embed text. Backend mode goes through the `embed` edge function (key stays
 * server-side); client mode calls OpenAI directly with the user's own key.
 */
export async function embed(text: string): Promise<number[]> {
  if (HAS_BACKEND) {
    const res = await callFunction('embed', { text })
    if (!res.ok) throw new Error(`Embedding request failed with status ${res.status}`)
    const { data } = (await res.json()) as OpenAIEmbeddingsResponse
    return data[0].embedding
  }

  const apiKey = getApiKey('openai')
  if (!apiKey) throw new Error('Missing OpenAI API key')

  const res = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      body?.error?.message ?? `Embedding request failed with status ${res.status}`
    )
  }

  const { data } = (await res.json()) as OpenAIEmbeddingsResponse
  return data[0].embedding
}

/**
 * Cosine similarity between two vectors: dot(a, b) / (|a| * |b|).
 * Returns a value in [-1, 1], or 0 if either vector has zero magnitude.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  if (magnitude === 0) return 0

  return dot / magnitude
}

// Cosine similarity between a resume and a job description does NOT span the
// full [0, 1] range. With text-embedding-3-small, two real English documents
// never land near 0 — unrelated resume/JD pairs floor around 0.30, a solid
// match sits ~0.45–0.55, and even an excellent match tops out near 0.60. So a
// raw `cosine * 100` would cram every job into the 30s–50s and make a high
// score unreachable. We rescale the band where the signal actually lives onto
// the full 0–100 bar instead.
//
// These bounds are an empirical starting point, not measured — tune them
// against real labelled outcomes once Phase 4's eval data exists.
const SIM_FLOOR = 0.3 // cosine at or below this maps to 0   (effectively unrelated)
const SIM_CEIL = 0.6 // cosine at or above this maps to 100 (excellent match)

/**
 * Map a cosine similarity to a 0–100 fit score by stretching the
 * [SIM_FLOOR, SIM_CEIL] band onto [0, 100] and clamping the ends. Clamping also
 * absorbs negative cosine values, which would otherwise yield a negative score.
 */
export function scoreFromSimilarity(similarity: number): number {
  const ratio = (similarity - SIM_FLOOR) / (SIM_CEIL - SIM_FLOOR)
  const clamped = Math.min(1, Math.max(0, ratio))
  return Math.round(clamped * 100)
}

interface OpenAIEmbeddingsResponse {
  data: Array<{ embedding: number[] }>
}