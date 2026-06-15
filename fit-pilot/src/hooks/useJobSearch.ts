import { useEffect, useReducer, useRef, type RefObject } from 'react'
import { cosineSimilarity, embed, scoreFromSimilarity } from '@/lib/embeddings'
import { JobSearchError, searchJobs } from '@/lib/job/job'
import { loadJobsAsync, loadJobsSync, matchJobs, persistJobs } from '@/lib/jobStore'
import { HAS_BACKEND } from '@/lib/config'
import type { CoverLetter, RewriteResult } from '@/types/ai'
import type { ApplicationStatus } from '@/lib/applicationStatus'
import type { ColumnId, Job, JobSearchParams } from '@/types/job'
import { getApiKey } from '@/lib/ai/providers/apiKey'

type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

interface JobListState {
  jobs: Job[]
  status: SearchStatus
  error: string | null
}

export interface ManualJobFields {
  title: string
  company: string
  description: string
  url?: string
  location?: string | null
}

type JobListAction =
  | { type: 'SEARCH_START' }
  | { type: 'SET_JOBS'; jobs: Job[] }
  | { type: 'SEARCH_SUCCESS'; jobs: Job[] }
  | { type: 'SEARCH_ERROR'; error: string }
  | { type: 'ADD_MANUAL'; job: Job }
  | { type: 'SET_FIT_SCORE'; jobId: string; fitScore: number | null; descriptionVector?: number[] }
  | { type: 'SET_REWRITE'; jobId: string; result: RewriteResult }
  | { type: 'SET_COVER_LETTER'; jobId: string; coverLetter: CoverLetter }
  | { type: 'MOVE_JOB'; jobId: string; column: ColumnId }
  | { type: 'SET_APPLICATION_STATUS'; jobId: string; status: ApplicationStatus; markLatestRewrite?: boolean }
  | { type: 'SET_NOTES'; jobId: string; notes: string }

function createInitialState(): JobListState {
  const jobs = loadJobsSync()
  return {
    jobs,
    status: jobs.length > 0 ? 'success' : 'idle',
    error: null,
  }
}

const BATCH_SIZE = 5

function sortByFitScore(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const aScore = a.fitScore ?? -1
    const bScore = b.fitScore ?? -1
    return bScore - aScore
  })
}

function createManualJob(fields: ManualJobFields): Job {
  return {
    id: crypto.randomUUID(),
    title: fields.title,
    company: fields.company,
    description: fields.description,
    url: fields.url ?? '',
    postedAt: new Date().toISOString(),
    source: 'manual',
    location: fields.location ?? null,
    isRemote: false,
    employmentType: null,
    salaryMin: null,
    salaryMax: null,
    salaryPeriod: null,
    employerLogo: null,
    column: 'interested',
    applicationStatus: 'none',
    appliedAt: null,
    notes: '',
    rewrites: [],
  }
}

function jobListReducer(state: JobListState, action: JobListAction): JobListState {
  switch (action.type) {
    case 'SEARCH_START':
      return { ...state, status: 'loading', error: null }

    case 'SET_JOBS':
      return {
        ...state,
        jobs: sortByFitScore(action.jobs),
        status: action.jobs.length > 0 ? 'success' : state.status,
      }

    case 'SEARCH_SUCCESS': {
      // Merge by id: existing jobs keep their triage state (column, status,
      // notes, rewrites, fitScore) — only genuinely new ids are appended.
      const existingIds = new Set(state.jobs.map(job => job.id))
      const newJobs = action.jobs.filter(job => !existingIds.has(job.id))
      return {
        ...state,
        jobs: sortByFitScore([...state.jobs, ...newJobs]),
        status: 'success',
        error: null,
      }
    }

    case 'SEARCH_ERROR':
      return { ...state, status: 'error', error: action.error }

    case 'ADD_MANUAL':
      return {
        ...state,
        jobs: [action.job, ...state.jobs],
        status: 'success',
      }

    case 'SET_FIT_SCORE':
      return {
        ...state,
        jobs: sortByFitScore(
          state.jobs.map(job =>
            job.id === action.jobId
              ? {
                  ...job,
                  fitScore: action.fitScore,
                  ...(action.descriptionVector !== undefined && {
                    descriptionVector: action.descriptionVector,
                  }),
                }
              : job
          )
        ),
      }

    case 'SET_REWRITE':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.jobId
            ? {
                ...job,
                rewrites: [
                  ...job.rewrites,
                  {
                    result: action.result,
                    promptVersion: 'v2',
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : job
        ),
      }

    case 'SET_COVER_LETTER':
      return {
        ...state,
        jobs: state.jobs.map(job => {
          if (job.id !== action.jobId || job.rewrites.length === 0) return job
          const lastIndex = job.rewrites.length - 1
          return {
            ...job,
            rewrites: job.rewrites.map((record, index) =>
              index === lastIndex
                ? { ...record, coverLetter: action.coverLetter }
                : record
            ),
          }
        }),
      }

    case 'MOVE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.jobId ? { ...job, column: action.column } : job
        ),
      }

    case 'SET_APPLICATION_STATUS': {
      const appliedAt = new Date().toISOString()
      return {
        ...state,
        jobs: state.jobs.map(job => {
          if (job.id !== action.jobId) return job

          const wasApplied = job.applicationStatus !== 'none' && job.appliedAt
          const nextAppliedAt =
            action.status === 'none'
              ? null
              : action.status === 'applied' && !wasApplied
                ? appliedAt
                : job.appliedAt ?? appliedAt

          let rewrites = job.rewrites
          if (action.markLatestRewrite && job.rewrites.length > 0) {
            const lastIndex = job.rewrites.length - 1
            rewrites = job.rewrites.map((record, index) =>
              index === lastIndex ? { ...record, usedForApplication: true } : record
            )
          }

          return {
            ...job,
            applicationStatus: action.status,
            appliedAt: nextAppliedAt,
            rewrites,
          }
        }),
      }
    }

    case 'SET_NOTES':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.jobId ? { ...job, notes: action.notes } : job
        ),
      }

    default:
      return state
  }
}

async function scoreJobs(
  jobs: Job[],
  resumeVector: number[],
  setFitScore: (jobId: string, fitScore: number | null, descriptionVector?: number[]) => void
): Promise<void> {
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async job => {
        if (!job.description) {
          setFitScore(job.id, null)
          return
        }
        try {
          const jobVector = await embed(job.description)
          const fitScore = scoreFromSimilarity(cosineSimilarity(resumeVector, jobVector))
          setFitScore(job.id, fitScore, jobVector)
        } catch (err) {
          console.error(`[useJobSearch] Failed to score job ${job.id}:`, err)
          setFitScore(job.id, null)
        }
      })
    )
  }
}

export type SearchInput = Pick<
  JobSearchParams,
  'query' | 'location' | 'datePosted' | 'workFromHome' | 'employmentTypes'
>

interface UseJobSearchReturn {
  search: (params: SearchInput) => Promise<void>
  addManual: (job: ManualJobFields) => void
  setFitScore: (jobId: string, fitScore: number | null, descriptionVector?: number[]) => void
  setRewrite: (jobId: string, result: RewriteResult) => void
  setCoverLetter: (jobId: string, coverLetter: CoverLetter) => void
  moveJob: (jobId: string, column: ColumnId) => void
  setApplicationStatus: (jobId: string, status: ApplicationStatus) => void
  setNotes: (jobId: string, notes: string) => void
  markApplied: (jobId: string) => void
  jobs: Job[]
  total: number
  status: SearchStatus
  error: string | null
}

export function useJobSearch(
  resumeVectorRef: RefObject<number[] | null>,
  resumeReady: boolean
): UseJobSearchReturn {
  const [state, dispatch] = useReducer(jobListReducer, undefined, createInitialState)

  // Always points at the committed job list, so async callbacks (search
  // resolution, the late-embed effect) read current state, not a stale closure.
  const jobsRef = useRef(state.jobs)
  jobsRef.current = state.jobs

  function setFitScore(jobId: string, fitScore: number | null, descriptionVector?: number[]) {
    dispatch({ type: 'SET_FIT_SCORE', jobId, fitScore, descriptionVector })
  }

  function setRewrite(jobId: string, result: RewriteResult) {
    dispatch({ type: 'SET_REWRITE', jobId, result })
  }

  function setCoverLetter(jobId: string, coverLetter: CoverLetter) {
    dispatch({ type: 'SET_COVER_LETTER', jobId, coverLetter })
  }

  function moveJob(jobId: string, column: ColumnId) {
    dispatch({ type: 'MOVE_JOB', jobId, column })
  }

  function setApplicationStatus(jobId: string, status: ApplicationStatus) {
    dispatch({ type: 'SET_APPLICATION_STATUS', jobId, status })
  }

  function setNotes(jobId: string, notes: string) {
    dispatch({ type: 'SET_NOTES', jobId, notes })
  }

  function markApplied(jobId: string) {
    dispatch({
      type: 'SET_APPLICATION_STATUS',
      jobId,
      status: 'applied',
      markLatestRewrite: true,
    })
  }

  // Backend mode: load the queue from Postgres on mount.
  useEffect(() => {
    if (!HAS_BACKEND) return
    let cancelled = false
    loadJobsAsync()
      .then(jobs => {
        if (!cancelled) dispatch({ type: 'SET_JOBS', jobs })
      })
      .catch(err => console.error('[useJobSearch] Failed to load jobs:', err))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void persistJobs(state.jobs)
  }, [state.jobs])

  // Backend mode: store embeddings, then score via the pgvector match_jobs RPC.
  async function scoreViaBackend(jobs: Job[]): Promise<void> {
    for (const job of jobs) {
      if (!job.description) {
        setFitScore(job.id, null)
        continue
      }
      try {
        const vector = await embed(job.description)
        setFitScore(job.id, job.fitScore ?? null, vector)
      } catch (err) {
        console.error(`[useJobSearch] Failed to embed job ${job.id}:`, err)
        setFitScore(job.id, null)
      }
    }
    // Persist embeddings so match_jobs can see them, then score against the resume.
    try {
      await persistJobs(jobsRef.current)
      const resumeVector = resumeVectorRef.current
      if (!resumeVector) return
      const scores = await matchJobs(resumeVector)
      for (const [id, score] of Object.entries(scores)) setFitScore(id, score)
      await persistJobs(jobsRef.current)
    } catch (err) {
      console.error('[useJobSearch] Backend scoring failed:', err)
    }
  }

  function triggerScoring(jobs: Job[]) {
    if (HAS_BACKEND) {
      void scoreViaBackend(jobs)
      return
    }
    const resumeVector = resumeVectorRef.current
    const openAiKey = getApiKey('openai')
    if (!resumeVector || !openAiKey) {
      jobs.forEach(job => setFitScore(job.id, null))
      return
    }
    void scoreJobs(jobs, resumeVector, setFitScore)
  }

  async function search(params: SearchInput): Promise<void> {
    dispatch({ type: 'SEARCH_START' })

    try {
      const result = await searchJobs({
        query: params.query,
        location: params.location,
        datePosted: params.datePosted,
        workFromHome: params.workFromHome,
        employmentTypes: params.employmentTypes,
      })
      // Score only ids not already in the queue — merged duplicates keep their
      // existing score, so re-embedding them would be wasted work.
      const existingIds = new Set(jobsRef.current.map(job => job.id))
      const newJobs = result.jobs.filter(job => !existingIds.has(job.id))
      dispatch({ type: 'SEARCH_SUCCESS', jobs: result.jobs })
      triggerScoring(newJobs)
    } catch (err) {
      dispatch({
        type: 'SEARCH_ERROR',
        error: err instanceof JobSearchError ? err.message : 'Search failed',
      })
    }
  }

  function addManual(fields: ManualJobFields) {
    const created = createManualJob(fields)
    dispatch({ type: 'ADD_MANUAL', job: created })
    triggerScoring([created])
  }

  // When the resume embedding lands after jobs already exist (searched before
  // the embed finished), re-score anything that never got a real number.
  // Keyed on resumeReady alone, so scoring's own state updates don't re-fire it.
  useEffect(() => {
    if (!resumeReady) return
    const pending = jobsRef.current.filter(job => typeof job.fitScore !== 'number')
    if (pending.length > 0) triggerScoring(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeReady])

  return {
    search,
    addManual,
    setFitScore,
    setRewrite,
    setCoverLetter,
    moveJob,
    setApplicationStatus,
    setNotes,
    markApplied,
    jobs: state.jobs,
    total: state.jobs.length,
    status: state.status,
    error: state.error,
  }
}