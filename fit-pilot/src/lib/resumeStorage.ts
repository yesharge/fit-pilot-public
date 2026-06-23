// Resume persistence. The resume text and its embedding vector live only in
// React state in Home.tsx, so a page reload used to wipe them and force a
// re-upload before the dashboard would show. We persist them to localStorage
// (same approach as jobQueueStorage) and hydrate on mount. The embedding is
// stored too, so reopening the app doesn't require an OpenAI call just to view
// the board.

const STORAGE_KEY = 'fit-pilot-resume'

export interface StoredResume {
  text: string
  /** Embedding vector for fit scoring; null if it wasn't computed. */
  vector: number[] | null
  filename: string
  pageCount: number
  tokenCount: number
  savedAt: string
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(n => typeof n === 'number')
}

export function loadResume(): StoredResume | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const o = parsed as Record<string, unknown>
    if (typeof o.text !== 'string' || o.text.trim().length === 0) return null

    return {
      text: o.text,
      vector: isNumberArray(o.vector) ? o.vector : null,
      filename: typeof o.filename === 'string' ? o.filename : 'resume.pdf',
      pageCount: typeof o.pageCount === 'number' ? o.pageCount : 0,
      tokenCount: typeof o.tokenCount === 'number' ? o.tokenCount : 0,
      savedAt: typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveResume(resume: Omit<StoredResume, 'savedAt'>): void {
  try {
    const payload: StoredResume = { ...resume, savedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota or serialization failure — non-fatal; the resume stays in memory.
  }
}

export function clearResume(): void {
  localStorage.removeItem(STORAGE_KEY)
}
