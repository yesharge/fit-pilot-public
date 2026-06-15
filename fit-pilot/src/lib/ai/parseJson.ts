/**
 * Parse the model's response into a typed object.
 *
 * We ask the model for raw JSON, but models occasionally wrap it in a
 * ```json fenced block, prepend a sentence like "Here's the rewrite:", or
 * add trailing prose. `JSON.parse` throws on any of that. This function
 * strips the common wrappers before parsing, and on failure logs the raw
 * string — that raw output is the single most useful artifact when a prompt
 * change breaks the schema, so it must never be swallowed silently.
 *
 * It does NOT try to repair truncated JSON (e.g. a response cut off at the
 * token cap mid-object). That's unrecoverable here and surfaces as an error
 * the caller turns into visible UI.
 * * @param raw - raw string
 */
export function parseAIJson<T>(raw: string): T {
  const cleaned = stripToJson(raw)
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    // Keep the raw output visible for debugging — this is where prompt/schema
    // mismatches reveal themselves.
    console.error('[parseAIJson] failed to parse model output. Raw response:', raw)
    const detail = err instanceof Error ? err.message : 'unknown parse error'
    throw new Error(`Model returned invalid JSON: ${detail}`)
  }
}

/**
 * Remove the wrappers models commonly add around JSON:
 *  - ```json ... ``` or ``` ... ``` fences
 *  - leading/trailing prose, by slicing to the outermost { } span
 */
function stripToJson(raw: string): string {
  let text = raw.trim()

  // Strip a leading fence (```json or ```) and any trailing fence.
  if (text.startsWith('```')) {
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }

  // Slice to the outermost object span, dropping any preamble/postamble prose.
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
  text = text.slice(first, last + 1)
}

return text.trim()
}