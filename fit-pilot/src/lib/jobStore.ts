// Persistence seam. In client-only mode this is just localStorage; in backend
// mode it reads/writes the Supabase `jobs` table (rewrites stored as a jsonb
// column on the row) and scores via the pgvector match_jobs RPC.
import { HAS_BACKEND } from '@/lib/config'
import { supabase } from '@/lib/supabase'
import { loadJobQueue, saveJobQueue } from '@/lib/jobQueueStorage'
import { isValidApplicationStatus } from '@/lib/applicationStatus'
import type { ColumnId, Job } from '@/types/job'
import type { RewriteRecord } from '@/types/ai'

export const usesBackend = HAS_BACKEND

/* ── Row <-> Job mapping (backend mode) ─────────────────────────────────── */

function jobToRow(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    source: job.source,
    external_id: job.source === 'api' ? job.id : null,
    title: job.title,
    company: job.company,
    description: job.description,
    url: job.url,
    location: job.location,
    is_remote: job.isRemote,
    employment_type: job.employmentType,
    posted_at: job.postedAt || null,
    // pgvector accepts the text form "[1,2,3]"; null when not embedded yet.
    description_embedding: job.descriptionVector
      ? JSON.stringify(job.descriptionVector)
      : null,
    fit_score: typeof job.fitScore === 'number' ? job.fitScore : null,
    board_column: job.column,
    application_status: job.applicationStatus,
    applied_at: job.appliedAt,
    notes: job.notes,
    rewrites: job.rewrites,
  }
}

function rowToJob(r: Record<string, any>): Job {
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    description: r.description ?? '',
    url: r.url ?? '',
    postedAt: r.posted_at ?? '',
    source: r.source === 'api' ? 'api' : 'manual',
    location: r.location ?? null,
    isRemote: r.is_remote === true,
    employmentType: r.employment_type ?? null,
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
    employerLogo: null,
    fitScore: typeof r.fit_score === 'number' ? r.fit_score : null,
    column: (['interested', 'reviewing', 'skipped'].includes(r.board_column)
      ? r.board_column
      : 'reviewing') as ColumnId,
    applicationStatus: isValidApplicationStatus(r.application_status)
      ? r.application_status
      : 'none',
    appliedAt: r.applied_at ?? null,
    notes: r.notes ?? '',
    rewrites: Array.isArray(r.rewrites) ? (r.rewrites as RewriteRecord[]) : [],
  }
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/** Synchronous initial load — localStorage in client mode, empty in backend
 *  mode (where the real load happens async via loadJobsAsync). */
export function loadJobsSync(): Job[] {
  return HAS_BACKEND ? [] : loadJobQueue()
}

export async function loadJobsAsync(): Promise<Job[]> {
  if (!HAS_BACKEND || !supabase) return loadJobQueue()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('fit_score', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data ?? []).map(rowToJob)
}

export async function persistJobs(jobs: Job[]): Promise<void> {
  if (!HAS_BACKEND || !supabase) {
    saveJobQueue(jobs)
    return
  }
  if (jobs.length === 0) return
  const { error } = await supabase.from('jobs').upsert(jobs.map(jobToRow))
  if (error) throw error
}

/** Delete a single job. Backend mode removes the row (an upsert of the
 *  remaining jobs would leave the deleted row behind); client mode is a no-op
 *  because saveJobQueue rewrites the whole array from the trimmed state. */
export async function deleteJobById(id: string): Promise<void> {
  if (!HAS_BACKEND || !supabase) return
  const { error } = await supabase.from('jobs').delete().eq('id', id)
  if (error) throw error
}

/** pgvector scoring: returns { jobId: fitScore } from the match_jobs RPC. */
export async function matchJobs(
  resumeEmbedding: number[]
): Promise<Record<string, number>> {
  if (!HAS_BACKEND || !supabase) return {}
  const { data, error } = await supabase.rpc('match_jobs', {
    query_embedding: JSON.stringify(resumeEmbedding),
  })
  if (error) throw error
  return Object.fromEntries(
    ((data ?? []) as { id: string; fit_score: number }[]).map(r => [r.id, r.fit_score])
  )
}
