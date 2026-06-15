/**
 * Keyword extraction & tokenization for job-description / resume matching.
*/

/**
 * Stopwords: standard English function words plus job-posting noise
 * ("work", "role", "team", "using" appear in every JD and carry no signal).
 */
export const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'must', 'shall', 'can', 'need', 'you', 'your', 'we', 'our', 'they', 'their', 'this',
    'that', 'these', 'those', 'it', 'its', 'who', 'which', 'what', 'when', 'where', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'any', 'work', 'role', 'team', 'using',
])
  
export const MAX_KEYWORDS = 24

/**
 * Tokenizer shared by extraction and matching. The character class admits
 * + # . / - inside a token so tech terms survive intact: C++, C#, CI/CD,
 * node.js, Go, AI, R. Extraction and matching MUST use the same regex —
 * otherwise a keyword could be extractable from a JD but unmatchable in
 * a resume by construction.
 */
export const WORD_RE = /\b[A-Za-z][A-Za-z0-9+#./-]*\b/g

/**
 * Top keywords from a job description, ranked by frequency (descending),
 * stopwords removed, deduplicated case-insensitively (first-seen casing kept).
 */
export function extractKeywords(text: string, limit: number = MAX_KEYWORDS): string[] {
    const counts = new Map<string, { display: string; n: number }>()

    for (const match of text.matchAll(WORD_RE)) {
        const word = match[0]
        const lower = word.toLowerCase()
        if (STOP_WORDS.has(lower)) continue
        const entry = counts.get(lower)
        if (entry) entry.n++
        else counts.set(lower, { display: word, n: 1 })
    }

    return [...counts.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, limit)
        .map(k => k.display)
}

/**
 * Lowercased token set of a text, using the shared tokenizer.
 * Membership = "this word appears as a whole word" — no substring matches.
 */
export function wordsOf(text: string): Set<string> {
    return new Set(text.toLowerCase().match(WORD_RE) ?? [])
}