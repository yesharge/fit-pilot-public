// Persistence seam for the resume, mirroring jobStore. Client-only mode uses
// localStorage (resumeStorage); backend mode reads/writes the Supabase `resume`
// table (a single pinned row). The HAS_BACKEND flag is the only switch.
import { HAS_BACKEND } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import {
  clearResume as clearLocalResume,
  loadResume as loadLocalResume,
  saveResume as saveLocalResume,
  type StoredResume,
} from '@/lib/resumeStorage'

export type { StoredResume } from '@/lib/resumeStorage'

const SINGLETON_ID = 'singleton'

/** Input shape for a persist — savedAt is assigned by the store. */
export type ResumeInput = Omit<StoredResume, 'savedAt'>

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(n => typeof n === 'number')
}

/* ── Row <-> StoredResume mapping (backend mode) ────────────────────────────── */

function resumeToRow(resume: ResumeInput): Record<string, unknown> {
  return {
    id: SINGLETON_ID,
    content: resume.text,
    // pgvector accepts the text form "[1,2,3]"; null when not embedded yet.
    embedding: resume.vector ? JSON.stringify(resume.vector) : null,
    filename: resume.filename,
    page_count: resume.pageCount,
    token_count: resume.tokenCount,
    updated_at: new Date().toISOString(),
  }
}

function rowToResume(r: Record<string, unknown>): StoredResume | null {
  const text = typeof r.content === 'string' ? r.content : ''
  if (text.trim().length === 0) return null

  // pgvector returns the embedding as a JSON-style "[1,2,3]" string.
  let vector: number[] | null = null
  if (isNumberArray(r.embedding)) {
    vector = r.embedding
  } else if (typeof r.embedding === 'string') {
    try {
      const parsed: unknown = JSON.parse(r.embedding)
      if (isNumberArray(parsed)) vector = parsed
    } catch {
      vector = null
    }
  }

  return {
    text,
    vector,
    filename: typeof r.filename === 'string' ? r.filename : 'resume.pdf',
    pageCount: typeof r.page_count === 'number' ? r.page_count : 0,
    tokenCount: typeof r.token_count === 'number' ? r.token_count : 0,
    savedAt: typeof r.updated_at === 'string' ? r.updated_at : new Date().toISOString(),
  }
}

/* ── Public API ─────────────────────────────────────────────────────────────── */

/** Synchronous initial load — localStorage in client mode, null in backend mode
 *  (where the real load happens async via loadResumeAsync). */
export function loadResumeSync(): StoredResume | null {
  return HAS_BACKEND ? null : loadLocalResume()
}

export async function loadResumeAsync(): Promise<StoredResume | null> {
  if (!HAS_BACKEND || !supabase) return loadLocalResume()
  const { data, error } = await supabase
    .from('resume')
    .select('*')
    .eq('id', SINGLETON_ID)
    .maybeSingle()
  if (error) throw error
  return data ? rowToResume(data) : null
}

export async function persistResume(resume: ResumeInput): Promise<void> {
  if (!HAS_BACKEND || !supabase) {
    saveLocalResume(resume)
    return
  }
  const { error } = await supabase.from('resume').upsert(resumeToRow(resume))
  if (error) throw error
}

export async function clearResume(): Promise<void> {
  if (!HAS_BACKEND || !supabase) {
    clearLocalResume()
    return
  }
  const { error } = await supabase.from('resume').delete().eq('id', SINGLETON_ID)
  if (error) throw error
}
